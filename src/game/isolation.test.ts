import { beforeEach, describe, expect, it } from 'vitest'
import { BUILDING_IDS, STORAGE_KEY } from './data'
import { CLE_DEFIS, aleaPose, classementLocal } from './defi'
import { CLE_ARCHIVE, CLE_HERITAGE, lireArchive, poserHeritageEnAttente } from './ngplus'
import { cleEmplacement, poserEmplacementActif } from './sauvegardes'
import { useGame } from './store'
import type { BuildingId, ModeJeu } from './types'

/*
 * ═══════════════════════ UN MONDE PAR PARTIE ═══════════════════════
 *
 * Le joueur : « Le mode campagne doit être complètement indépendant. Actuellement,
 * j'ai toujours les villages pillés de mon autre sauvegarde, ainsi que les dons et
 * les combattants qu'ils me prêtent. »
 *
 * Traduction en champs du store : `expeditions` (les villages pillés et leurs
 * étoiles), `alliances` (le tribut = les dons, les renforts = les combattants
 * prêtés) et `relations` traversaient le démarrage d'une partie neuve. Avec eux
 * tout le reste du MONDE : `technos`, `reliques`, `merveille`, `hautsFaits`,
 * `espions`, `oracles`, `stats`, et jusqu'au `defi` et au `siege` en cours.
 *
 * Deux trajets fondent une partie, et ce fichier les tient TOUS LES DEUX :
 *
 *  · l'écran de choix du mode, qu'un emplacement vide rouvre (`init` puis
 *    `choisirMode`) - celui-là partait déjà d'`etatInitial`, il était propre ;
 *  · `choisirMode` appelé SUR LA PARTIE EN COURS - le bouton « 🐴 Jouer la
 *    campagne » de l'aide (Campagne.tsx), celui du défi (Recommencer.tsx), le
 *    bouton de siège de l'App. Celui-là fuyait, et c'est le seul que le joueur
 *    emprunte réellement aujourd'hui.
 *
 * ─── LA FRONTIÈRE, qui est tout l'enjeu de ce fichier ───
 *
 * NE DOIT JAMAIS TRAVERSER - l'état du monde et de la cité. Il appartient à la
 * partie ; fonder une partie neuve, c'est le remettre à neuf.
 *
 * DOIT TRAVERSER - ce que le joueur a gagné ou légué EXPRÈS, hors de la partie :
 *   · `palladion-archive`   l'archive des règnes (prestige cumulé, titres)
 *   · `palladion-heritage`  le panier NG+ qu'il a PAYÉ de son prestige
 *   · `palladion-defis`     le journal des défis (ses scores des semaines passées)
 *   · `recordSiege`         un record est au joueur, pas à la cité
 *   · les AUTRES emplacements, qui ne bougent pas d'un octet
 *
 * ET UNE VIEILLE SAUVEGARDE NE PERD RIEN : `choisirMode` fonde, `init` charge.
 * Une partie existante ne passe jamais par `choisirMode` - les deux derniers cas
 * le vérifient, parce que c'est exactement ce qu'un correctif de remise à neuf
 * risque de casser.
 */

const JOUR = 8 * 60_000
const MODES: ModeJeu[] = ['bac-a-sable', 'campagne', 'siege', 'defi']

function batiments(niveaux: Partial<Record<BuildingId, number>> = {}) {
  return Object.fromEntries(BUILDING_IDS.map((b) => [b, { level: niveaux[b] ?? 0 }]))
}

/**
 * Une partie de bac à sable AVANCÉE : trois villages pillés, deux alliés qui
 * paient tribut, des relations installées, et le reste du monde conquis
 * (technologies, relique, merveille en chantier, espion en mer, haut fait).
 * C'est la sauvegarde du joueur qui se plaint.
 */
function partiePillarde(): string {
  const now = Date.now()
  return JSON.stringify({
    createdAt: now - JOUR * 9,
    lastSeen: now - 60_000,
    resources: { bois: 900, pierre: 700, grain: 800, bronze: 250 },
    faveur: 40,
    pop: 18,
    buildings: batiments({ agora: 3, ferme: 2, caserne: 2, remparts: 2 }),
    villageois: [],
    wallHp: 400,
    tours: 2,
    army: { lancier: 6, archer: 4, hoplite: 3, frondeur: 0, peltaste: 0, belier: 0, char: 0 },
    morale: 60,
    threat: 25,
    threatMod: 12,
    nextAttackAt: now + 8 * 60_000,
    stats: { repousses: 7, perdus: 1, evenements: 5 },
    mode: 'bac-a-sable',
    tutorialDone: true,
    saison: 'printemps',
    meteo: 'clair',
    recordSiege: 17,
    // ── le monde conquis, celui qui ne doit PAS suivre ──
    expeditions: {
      'camp-pillards': { etoiles: 3, dernierRaid: now - 300_000, pillages: 2 },
      'hameau-thrace': { etoiles: 2, dernierRaid: now - 600_000, pillages: 1 },
      'comptoir-phenicien': { etoiles: 1, dernierRaid: now - 900_000, pillages: 0 },
    },
    alliances: {
      'village-dardanien': { depuis: now - 900_000, tributAt: now + 60_000 },
      'cite-lesbos': { depuis: now - 800_000, tributAt: now + 90_000, mariage: { villageois: 'v-2', depuis: now } },
    },
    relations: { 'village-dardanien': 45, 'cite-lesbos': 60, 'camp-pillards': -70 },
    technos: ['charrue', 'metallurgie'],
    reliques: ['egide'],
    merveille: { id: 'palladion-dore', investi: { bois: 100, pierre: 100, grain: 0, bronze: 0 }, fini: false },
    hautsFaits: ['premierRaid'],
    espions: [{ id: 'e-1', cible: 'camp-pillards', retourAt: now + 120_000 }],
    oracles: { delphes: { poseeLe: now - 100_000 } },
  })
}

/** ce qui, dans l'état courant, appartient au MONDE et non au joueur */
function monde() {
  const s = useGame.getState()
  return {
    pilles: Object.keys(s.expeditions ?? {}),
    allies: Object.keys(s.alliances ?? {}),
    relations: Object.keys(s.relations ?? {}),
    technos: [...(s.technos ?? [])],
    reliques: [...(s.reliques ?? [])],
    merveille: s.merveille,
    hautsFaits: [...(s.hautsFaits ?? [])],
    espions: (s.espions ?? []).length,
    caravanes: (s.caravanes ?? []).length,
    oracles: Object.keys(s.oracles ?? {}),
    repousses: s.stats.repousses,
    evenements: s.stats.evenements,
  }
}

/** un monde neuf, tel qu'`etatInitial` le pose */
const MONDE_VIERGE = {
  pilles: [],
  allies: [],
  relations: [],
  technos: [],
  reliques: [],
  merveille: null,
  hautsFaits: [],
  espions: 0,
  caravanes: 0,
  oracles: [],
  repousses: 0,
  evenements: 0,
}

/**
 * Ce qui, dans la CITÉ, doit être identique à une fondation. On écarte tout ce
 * qui dépend de l'heure (`createdAt`, `nextAttackAt`, la météo…) : on compare
 * deux fondations, pas deux instants.
 */
function cite() {
  const s = useGame.getState()
  return {
    resources: { ...s.resources },
    niveaux: Object.fromEntries(BUILDING_IDS.map((b) => [b, s.buildings[b].level])),
    pop: s.pop,
    habitants: s.villageois.length,
    army: { ...s.army },
    fileRecrutement: s.recruitQueue.length,
    morale: s.morale,
    faveur: s.faveur,
    tours: s.tours,
    wallHp: s.wallHp,
    defenses: { ...s.defenses },
    redoute: s.redoute,
    threat: s.threat,
    threatMod: s.threatMod,
    relationsDivines: Object.fromEntries(Object.entries(s.gods).map(([g, v]) => [g, v.relation])),
    herosConnus: [...s.herosConnus],
    graces: [...s.graces],
  }
}

/**
 * La MÊME fondation, mais dans un emplacement vierge : la référence honnête.
 * On ne fige aucun chiffre de départ dans ce fichier - un futur réglage
 * d'équilibre ne doit pas faire rougir un test d'isolement.
 */
function fondationDeReference(m: ModeJeu) {
  localStorage.clear()
  useGame.getState().reset()
  localStorage.clear()
  poserEmplacementActif(0)
  useGame.getState().init()
  expect(useGame.getState().mode).toBeNull()
  useGame.getState().choisirMode(m)
  return { monde: monde(), cite: cite() }
}

beforeEach(() => {
  localStorage.clear()
  // le store est un singleton de module : chaque cas repart d'un état neuf
  useGame.getState().reset()
  localStorage.clear()
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('fonder une partie remet le monde à neuf', () => {
  it('le trajet par les emplacements : une case vide ouvre un monde vierge', () => {
    // partie 1, emplacement 1 : on a pillé la côte et signé deux alliances
    poserEmplacementActif(0)
    localStorage.setItem(cleEmplacement(0), partiePillarde())
    useGame.getState().init()
    expect(monde().pilles).toHaveLength(3)

    // le joueur passe à l'emplacement 2, vide, puis choisit la campagne
    useGame.getState().changerEmplacement(1)
    expect(useGame.getState().mode).toBeNull()
    useGame.getState().choisirMode('campagne')

    expect(monde()).toEqual(MONDE_VIERGE)
    // et la partie 1 est restée intacte dans sa case
    expect(JSON.parse(localStorage.getItem(cleEmplacement(0))!).alliances).toHaveProperty('cite-lesbos')
  })

  it('le trajet par l’aide : « 🐴 Jouer la campagne » n’emporte rien du bac à sable', () => {
    poserEmplacementActif(0)
    localStorage.setItem(STORAGE_KEY, partiePillarde())
    useGame.getState().init()
    expect(monde().pilles).toHaveLength(3)

    // exactement ce que fait le bouton de PanneauCampagne (Campagne.tsx)
    useGame.getState().choisirMode('campagne')

    expect(monde()).toEqual(MONDE_VIERGE)
    expect(useGame.getState().campagne?.acte).toBe(0)
    expect(useGame.getState().mode).toBe('campagne')
  })

  // le joueur parle de la campagne, mais `choisirMode` est la même porte pour
  // les quatre modes : aucun n'a le droit d'hériter du monde d'avant
  it.each(MODES)('mode « %s » : monde vierge, cité identique à une fondation', (m) => {
    poserEmplacementActif(0)
    localStorage.setItem(STORAGE_KEY, partiePillarde())
    useGame.getState().init()
    expect(monde().pilles).toHaveLength(3)

    useGame.getState().choisirMode(m)
    const obtenu = { monde: monde(), cite: cite() }

    expect(obtenu.monde).toEqual(MONDE_VIERGE)
    // et la cité : rien de figé, on compare à la même fondation dans une case vide
    expect(obtenu.cite).toEqual(fondationDeReference(m).cite)
  })

  it('le monde neuf est écrit dans le fichier : un rechargement ne ressuscite rien', () => {
    poserEmplacementActif(0)
    localStorage.setItem(STORAGE_KEY, partiePillarde())
    useGame.getState().init()

    useGame.getState().choisirMode('campagne')

    const fichier = JSON.parse(localStorage.getItem(cleEmplacement(0))!)
    expect(fichier.mode).toBe('campagne')
    expect(fichier.expeditions).toEqual({})
    expect(fichier.alliances).toEqual({})
    expect(fichier.relations).toEqual({})
    expect(fichier.technos).toEqual([])
    expect(fichier.campagne.acte).toBe(0)

    // et l'on relit ce fichier comme au démarrage du navigateur
    useGame.getState().init()
    expect(monde()).toEqual(MONDE_VIERGE)
  })

  it('la partie d’avant ne reste pas accrochée : ni son défi, ni son siège', () => {
    poserEmplacementActif(0)
    useGame.getState().init()

    useGame.getState().choisirMode('defi')
    expect(useGame.getState().defi).not.toBeNull()
    useGame.getState().choisirMode('siege')
    // le siège efface la contrainte de la semaine, mais l'inverse n'était pas vrai
    expect(useGame.getState().defi).toBeNull()
    expect(useGame.getState().siege).not.toBeNull()

    // la campagne suivante ne doit garder ni contrainte ni horloge de siège :
    // les deux s'affichent dans le bandeau du haut
    useGame.getState().choisirMode('campagne')
    expect(useGame.getState().defi).toBeNull()
    expect(useGame.getState().siege).toBeNull()
    expect(useGame.getState().campagne?.acte).toBe(0)
  })

  it('quitter le défi rend son hasard : la partie suivante ne joue pas la graine de la semaine', () => {
    poserEmplacementActif(0)
    useGame.getState().init()
    useGame.getState().choisirMode('defi')
    expect(aleaPose()).toBe(true)

    // le joueur repart en campagne : le tirage déterministe du défi doit être rendu
    useGame.getState().choisirMode('campagne')
    expect(aleaPose()).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('ce que le joueur a gagné hors de la partie, lui, traverse', () => {
  it('l’archive des règnes, le journal des défis et le record de siège survivent', () => {
    poserEmplacementActif(0)
    localStorage.setItem(
      CLE_ARCHIVE,
      JSON.stringify({
        version: 1,
        regnes: 2,
        prestigeCumule: 1400,
        meilleur: 800,
        titres: ['Roi', 'Tyran'],
        dernier: null,
      }),
    )
    localStorage.setItem(
      CLE_DEFIS,
      JSON.stringify([
        { numero: 12, annee: 2026, semaine: 12, points: 4200, objectifAtteint: true, finiLe: Date.now() },
      ]),
    )
    localStorage.setItem(STORAGE_KEY, partiePillarde())
    useGame.getState().init()
    expect(useGame.getState().recordSiege).toBe(17)

    for (const m of MODES) {
      useGame.getState().choisirMode(m)
      // l'archive et le journal ne sont pas des biens de la cité : on n'y touche pas
      expect(lireArchive().prestigeCumule).toBe(1400)
      expect(classementLocal()[0].points).toBe(4200)
      // un record est au joueur : le perdre en changeant de mode serait une punition
      expect(useGame.getState().recordSiege).toBe(17)
    }
  })

  it('les autres emplacements ne bougent pas d’un octet', () => {
    poserEmplacementActif(0)
    localStorage.setItem(cleEmplacement(0), partiePillarde())
    localStorage.setItem(cleEmplacement(1), partiePillarde())
    localStorage.setItem(cleEmplacement(2), partiePillarde())
    const avant1 = localStorage.getItem(cleEmplacement(1))
    const avant2 = localStorage.getItem(cleEmplacement(2))

    useGame.getState().init()
    useGame.getState().choisirMode('campagne')

    expect(localStorage.getItem(cleEmplacement(1))).toBe(avant1)
    expect(localStorage.getItem(cleEmplacement(2))).toBe(avant2)
  })

  it('l’héritage NG+ payé traverse - et ne se consomme qu’une fois', () => {
    poserEmplacementActif(0)
    // un règne archivé, et un panier d'héritage payé de son prestige
    localStorage.setItem(
      CLE_ARCHIVE,
      JSON.stringify({
        version: 1,
        regnes: 1,
        prestigeCumule: 800,
        meilleur: 800,
        titres: ['Roi'],
        dernier: {
          prestige: 800,
          titre: 'Roi',
          jours: 20,
          pop: 30,
          repousses: 12,
          hautsFaits: 4,
          relations: { 'cite-lesbos': 80 },
          finiLe: Date.now(),
        },
      }),
    )
    poserHeritageEnAttente({ 'muraille-heritee': 1, 'heros-hector': 1 })

    useGame.getState().init()
    useGame.getState().choisirMode('bac-a-sable')

    // le don est POSÉ - c'est ce que le joueur a payé
    expect(useGame.getState().buildings.remparts.level).toBe(3)
    expect(useGame.getState().herosConnus).toContain('hector')
    // avec son malus de difficulté, et son rapport
    expect(useGame.getState().threatMod).toBeGreaterThan(0)
    expect(useGame.getState().reports).toHaveLength(1)
    // le report de relations est un effet VOULU de l'héritage : il reste
    expect(Object.keys(useGame.getState().relations)).toContain('cite-lesbos')
    // et le panier est consommé : on ne le repaie pas, on ne le rejoue pas
    expect(localStorage.getItem(CLE_HERITAGE)).toBeNull()
  })

  it('un héritage payé ne s’évapore pas au second choix de mode de la session', () => {
    /*
     * Le piège de la remise à neuf : le panier est consommé au PREMIER
     * `choisirMode` (clé effacée), et le joueur clique ensuite sur « 🐴 Jouer la
     * campagne » - chemin bien vivant. Sans mémoire, le second choix repart d'un
     * état vierge sans plus rien trouver à lire, et le prestige dépensé s'évapore.
     * Le prestige n'est pas remboursable : ce cas garde la porte fermée.
     */
    poserEmplacementActif(0)
    poserHeritageEnAttente({ 'muraille-heritee': 1, 'heros-hector': 1 })
    useGame.getState().init()

    useGame.getState().choisirMode('bac-a-sable')
    const paye = {
      remparts: useGame.getState().buildings.remparts.level,
      herosConnus: [...useGame.getState().herosConnus],
      threatMod: useGame.getState().threatMod,
      rapports: useGame.getState().reports.length,
    }
    expect(paye.remparts).toBe(3)
    expect(paye.herosConnus).toEqual(['hector'])
    expect(paye.threatMod).toBeGreaterThan(0)
    expect(paye.rapports).toBe(1)
    expect(localStorage.getItem(CLE_HERITAGE)).toBeNull()

    // second choix de mode, sans rien avoir rechargé : le don doit être encore là
    useGame.getState().choisirMode('bac-a-sable')
    expect({
      remparts: useGame.getState().buildings.remparts.level,
      herosConnus: [...useGame.getState().herosConnus],
      threatMod: useGame.getState().threatMod,
      rapports: useGame.getState().reports.length,
    }).toEqual(paye)

    // et par le vrai bouton 🐴 : l'acte I refait la cité, mais Hector reste connu
    useGame.getState().choisirMode('campagne')
    expect(useGame.getState().herosConnus).toEqual(['hector'])
  })

  it('…mais il ne se rejoue PAS dans une autre partie : un don payé fonde une seule cité', () => {
    /*
     * Le revers du cas précédent. Se souvenir du panier ne doit pas le rendre
     * inépuisable : la case 2 est une AUTRE partie, elle n'a rien payé.
     */
    poserEmplacementActif(0)
    poserHeritageEnAttente({ 'muraille-heritee': 1, 'heros-hector': 1 })
    useGame.getState().init()
    useGame.getState().choisirMode('bac-a-sable')
    expect(useGame.getState().buildings.remparts.level).toBe(3)

    useGame.getState().changerEmplacement(1)
    useGame.getState().choisirMode('campagne')

    expect(useGame.getState().herosConnus).toEqual([])
    expect(useGame.getState().threatMod).toBe(0)
    // jusque dans le fichier de la case 2
    expect(JSON.parse(localStorage.getItem(cleEmplacement(1))!).herosConnus).toEqual([])
  })

  it('…ni dans un défi fondé après coup : le score de la semaine reste comparable', () => {
    poserEmplacementActif(0)
    poserHeritageEnAttente({ 'muraille-heritee': 1, 'heros-hector': 1 })
    useGame.getState().init()
    useGame.getState().choisirMode('bac-a-sable')
    expect(useGame.getState().buildings.remparts.level).toBe(3)

    // le joueur recommence, puis lance le défi de la semaine : il doit affronter
    // la même Troade que tout le monde, sans muraille de niveau 3 offerte
    useGame.getState().reset()
    useGame.getState().choisirMode('defi')

    expect(useGame.getState().buildings.remparts.level).toBe(0)
    expect(useGame.getState().herosConnus).toEqual([])
    expect(useGame.getState().threatMod).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('une vieille sauvegarde ne perd rien', () => {
  it('une partie d’avant la campagne (aucun champ « mode ») garde son monde entier', () => {
    /*
     * `init` CHARGE, `choisirMode` FONDE : une partie existante ne passe jamais
     * par la seconde. C'est la garantie que la remise à neuf ne coûte rien à
     * personne - et c'est précisément ce qu'un correctif de ce genre risque de
     * casser, d'où ce cas.
     */
    poserEmplacementActif(0)
    const vieille = JSON.parse(partiePillarde()) as Record<string, unknown>
    delete vieille.mode
    delete vieille.hautsFaits
    delete vieille.technos
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vieille))

    useGame.getState().init()

    const s = useGame.getState()
    // le mode est déduit, pas choisi : aucun `choisirMode` n'a eu lieu
    expect(s.mode).toBe('bac-a-sable')
    expect(Object.keys(s.expeditions)).toEqual(['camp-pillards', 'hameau-thrace', 'comptoir-phenicien'])
    expect(Object.keys(s.alliances)).toEqual(['village-dardanien', 'cite-lesbos'])
    expect(s.relations['cite-lesbos']).toBe(60)
    expect(s.reliques).toEqual(['egide'])
    expect(s.merveille?.id).toBe('palladion-dore')
    expect(s.pop).toBe(18)
    // la reprise simule la minute d'absence : les coffres montent, ils ne
    // retombent jamais à la mise de départ
    expect(s.resources.bois).toBeGreaterThanOrEqual(900)
    expect(s.buildings.agora.level).toBe(3)
    expect(s.stats.repousses).toBe(7)
    expect(s.recordSiege).toBe(17)
  })

  it('une campagne en cours se recharge avec son acte ET son monde', () => {
    /*
     * Une campagne a parfaitement le droit d'avoir pillé des villages : ce qui
     * est interdit, c'est de les hériter de la partie d'AVANT. Reprendre ne doit
     * rien effacer.
     */
    poserEmplacementActif(0)
    const enCours = JSON.parse(partiePillarde()) as Record<string, unknown>
    enCours.mode = 'campagne'
    enCours.campagne = { acte: 2, prologueVu: true, fini: false, accompli: false, objectifs: {} }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enCours))

    useGame.getState().init()

    const s = useGame.getState()
    expect(s.mode).toBe('campagne')
    expect(s.campagne?.acte).toBe(2)
    expect(Object.keys(s.expeditions)).toHaveLength(3)
    expect(Object.keys(s.alliances)).toHaveLength(2)
    expect(s.technos).toEqual(['charrue', 'metallurgie'])
    // un simple `init` de plus ne l'abîme pas davantage
    useGame.getState().init()
    expect(useGame.getState().campagne?.acte).toBe(2)
    expect(Object.keys(useGame.getState().expeditions)).toHaveLength(3)
  })
})
