import { beforeEach, describe, expect, it } from 'vitest'
import { BUILDINGS, BUILDING_IDS, DAY_MS, GODS, GOD_IDS, POP_CAP, POSTES, STOCKAGE, TOURS_MAX } from './data'
import { HERO_IDS, NIVEAU_MAX } from './heros'
import { VILLAGES_CIBLES } from './expeditions'
import { JOURS_PAR_SAISON, SAISONS } from './saisons'
import {
  CATEGORIES,
  HAUTS_FAITS,
  HF_PAR_ID,
  JOURS_PAR_AN,
  POINTS_TOTAUX,
  detailPrestige,
  prestige,
  titrePrestige,
  type CategorieHF,
  type DetailPrestige,
  type SnapHautFait,
} from './hautsfaits'
import { prestigeCourant, snapHautFait, useGame } from './store'
import type { BuildingId, GodId, HeroId, ResourceId } from './types'

/*
 * Les hauts faits sont la mémoire du règne : on les gagne une fois, on ne les
 * perd jamais, et le prestige final n'est que leur addition avec ce que le
 * village montre encore. Trois fautes coûteraient cher et ne se verraient pas :
 * une condition inatteignable (le joueur cherche pour rien), un seuil qui ne
 * dit plus ce que promet la description, et un prestige qui reculerait pendant
 * qu'on joue bien. Tout ce qui suit garde ces trois portes, la dernière section
 * vérifiant en plus que le store et les hauts faits parlent bien de la même partie.
 */

const RESSOURCES: ResourceId[] = ['bois', 'pierre', 'grain', 'bronze']

/**
 * Niveau maximal d'un bâtiment. Le store le plafonne EN DUR (`store.ts` :
 * `if (… || cible > 4) return`) et les conditions le supposent partout ; aucune
 * constante n'est partagée, d'où la vérification de cohérence plus bas.
 */
const NIVEAU_BATIMENT_MAX = 4

type EtatHeroVu = SnapHautFait['heros'][string]

function batiments(defaut: number, exceptions: Partial<Record<BuildingId, number>> = {}): SnapHautFait['buildings'] {
  return Object.fromEntries(
    BUILDING_IDS.map((b) => [b, { level: exceptions[b] ?? defaut }]),
  ) as SnapHautFait['buildings']
}

function dieux(defaut: number, exceptions: Partial<Record<GodId, number>> = {}): SnapHautFait['gods'] {
  return Object.fromEntries(
    GOD_IDS.map((g) => [g, { relation: exceptions[g] ?? defaut }]),
  ) as SnapHautFait['gods']
}

/** la cour des héros : `defaut` s'applique aux huit, `exceptions` héros par héros */
function cour(
  exceptions: Partial<Record<HeroId, Partial<EtatHeroVu>>> = {},
  defaut: Partial<EtatHeroVu> = {},
): SnapHautFait['heros'] {
  return Object.fromEntries(
    HERO_IDS.map((h) => [h, { recrute: false, niveau: 0, mort: false, arc: 0, ...defaut, ...exceptions[h] }]),
  )
}

function annales(repousses: number, evenements = 0, perdus = 0): SnapHautFait['stats'] {
  return { repousses, perdus, evenements }
}

/** village vierge : tout à zéro, pour n'allumer qu'une condition à la fois */
function village(modif: Partial<SnapHautFait> = {}): SnapHautFait {
  return {
    resources: { bois: 0, pierre: 0, grain: 0, bronze: 0 },
    faveur: 0,
    army: { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 },
    pop: 0,
    morale: 0,
    tours: 0,
    buildings: batiments(0),
    gods: dieux(0),
    stats: annales(0),
    expeditions: {},
    alliances: {},
    heros: cour(),
    villageois: [],
    saison: 'printemps',
    jour: 1,
    exploits: {},
    ...modif,
  }
}

/**
 * Le règne le plus complet que les règles autorisent. Chaque axe que le jeu
 * PLAFONNE est poussé à son plafond (entrepôts, habitants, tours, niveaux de
 * bâtiment, niveaux de héros, places fortes, relations bornées à ±100) ; là où
 * rien ne borne (assauts, dilemmes, soldats, journées), on prend large. Une
 * condition qui réclamerait plus qu'un plafond n'accorde apparaîtrait alors
 * dans les manquants - c'est le filet contre le haut fait impossible.
 */
function regneTotal(modif: Partial<SnapHautFait> = {}): SnapHautFait {
  const cap = STOCKAGE[NIVEAU_BATIMENT_MAX]
  const postes = BUILDING_IDS.reduce((a, b) => a + (POSTES[b]?.[NIVEAU_BATIMENT_MAX] ?? 0), 0)
  return village({
    resources: { bois: cap, pierre: cap, grain: cap, bronze: cap },
    faveur: 100,
    army: { lancier: 40, archer: 40, hoplite: 40, frondeur: 0, peltaste: 0, belier: 0, char: 0 },
    pop: Math.max(...POP_CAP),
    morale: 100,
    tours: Math.max(...TOURS_MAX),
    buildings: batiments(NIVEAU_BATIMENT_MAX),
    gods: dieux(100),
    stats: annales(60, 60, 0),
    expeditions: Object.fromEntries(VILLAGES_CIBLES.map((v) => [v.id, { etoiles: 3, pillages: 4 }])),
    alliances: Object.fromEntries(VILLAGES_CIBLES.map((v) => [v.id, {}])),
    // sept héros au sommet et un tombé au bout de son arc : la cour la plus fournie possible
    heros: cour({ achille: { mort: true } }, { recrute: true, niveau: NIVEAU_MAX }),
    // une seule grande maison suffit au haut fait des lignées : on les y met tous
    villageois: Array.from({ length: postes }, () => ({ poste: 'ferme' as BuildingId, lignee: 'Nélides' })),
    jour: JOURS_PAR_AN * 20,
    exploits: {
      assautSansPerte: 1,
      assautTroisFronts: 1,
      assautMurIntact: 1,
      brecheRecollee: 1,
      hiverTraverse: 1,
      secours: 1,
      trahisons: 1,
      benedictions: 100,
      // les douze grâces de l'arbre de faveur, prises jusqu'à la dernière
      graces: 12,
      // trois champions achéens abattus sous les murs
      championsAbattus: 3,
      // dix noces célébrées : trois générations de villageois
      mariages: 10,
      // deux alliances scellées par mariage avec les places fortes
      mariagesDiplomatiques: 2,
    },
    ...modif,
  })
}

/*
 * On interroge les conditions par identifiant, comme le fait la sauvegarde. Le
 * `throw` est le garde-fou du test lui-même : renommer un haut fait ferait
 * passer les vérifications au vert sur du vide.
 */
function atteint(id: string, s: SnapHautFait): boolean {
  const def = HF_PAR_ID[id]
  if (!def) throw new Error(`haut fait inconnu : ${id}`)
  return def.atteint(s)
}

/** identifiants décrochés par cet état, dans l'ordre du palmarès */
function decroches(s: SnapHautFait): string[] {
  return HAUTS_FAITS.filter((h) => h.atteint(s)).map((h) => h.id)
}

/** identifiants que cet état ne décroche PAS */
function manquants(s: SnapHautFait): string[] {
  return HAUTS_FAITS.filter((h) => !h.atteint(s)).map((h) => h.id)
}

/** un axe du bilan, par son intitulé - le `throw` empêche un `undefined` complaisant */
function axe(detail: DetailPrestige[], label: string): number {
  const ligne = detail.find((d) => d.label === label)
  if (!ligne) throw new Error(`axe de prestige inconnu : ${label}`)
  return ligne.points
}

describe('le tableau des hauts faits', () => {
  it('donne à chacun une fiche complète, un identifiant et un titre uniques', () => {
    const ids = HAUTS_FAITS.map((h) => h.id)
    // l'identifiant est la clé de sauvegarde : un doublon effacerait un haut fait du palmarès
    expect(new Set(ids).size).toBe(ids.length)
    // deux hauts faits de même titre seraient indiscernables dans le panneau
    expect(new Set(HAUTS_FAITS.map((h) => h.titre)).size).toBe(HAUTS_FAITS.length)
    expect(HAUTS_FAITS).toHaveLength(51)
    for (const h of HAUTS_FAITS) {
      // l'index sert à retrouver les points d'un id sauvegardé : il doit viser LA bonne fiche
      expect(HF_PAR_ID[h.id], h.id).toBe(h)
      expect(h.emoji.trim(), h.id).not.toBe('')
      expect(h.titre.trim().length, h.id).toBeGreaterThan(2)
      // la description est la seule consigne que le joueur reçoit : elle doit dire quoi faire
      expect(h.desc.trim().length, h.id).toBeGreaterThan(10)
      expect(Object.keys(CATEGORIES), h.id).toContain(h.cat)
    }
    // le panneau range les hauts faits en cinq colonnes : aucune ne doit être maigre
    for (const cat of Object.keys(CATEGORIES) as CategorieHF[]) {
      expect(HAUTS_FAITS.filter((h) => h.cat === cat).length, cat).toBeGreaterThanOrEqual(5)
    }
  })

  it('promet des points entiers et positifs, dont POINTS_TOTAUX est la somme', () => {
    for (const h of HAUTS_FAITS) {
      expect(Number.isInteger(h.points), h.id).toBe(true)
      expect(h.points, h.id).toBeGreaterThan(0)
    }
    expect(POINTS_TOTAUX).toBe(1485)
    /*
     * Le panneau affiche « gagnés / POINTS_TOTAUX ». La jauge ne doit pas pouvoir
     * dépasser 100 % : un palmarès complet vaut exactement le total annoncé, ce
     * qui exige au passage que les 45 identifiants se retrouvent dans l'index.
     */
    const detail = detailPrestige(
      village(),
      HAUTS_FAITS.map((h) => h.id),
    )
    expect(axe(detail, 'Hauts faits')).toBe(POINTS_TOTAUX)
  })

  it('n’enferme aucun haut fait hors d’atteinte, sauf l’inévitable malédiction', () => {
    /*
     * Le seul haut fait qu'un règne parfait ne peut pas avoir est « Maudit
     * soit-il » : il faut un dieu à −70, ce qu'« Élu des quatre Olympiens »
     * interdit. Toute autre absence dans cette liste signale une condition
     * devenue impossible - un plafond abaissé ailleurs, un identifiant de
     * village mal recopié, une clé d'exploit qui ne s'écrit plus.
     */
    expect(manquants(regneTotal())).toEqual(['maudit'])
    // et la réciproque : le règne maudit perd exactement le haut fait des quatre faveurs
    expect(manquants(regneTotal({ gods: dieux(100, { ares: -100 }) }))).toEqual(['elu-des-quatre'])
  })

  it('ne laisse pas les descriptions mentir sur les nombres qu’elles annoncent', () => {
    // « les dix domaines », deux fois : la somme visée par « Cité de légende » en dépend
    expect(BUILDING_IDS).toHaveLength(10)
    for (const b of BUILDING_IDS) {
      // quatre paliers de coût par bâtiment : les cinq hauts faits « niveau 4 »
      // visent bien le dernier niveau, et « Cité de légende » le sans-faute
      expect(BUILDINGS[b].costs, b).toHaveLength(NIVEAU_BATIMENT_MAX)
    }
    // « les quatre tours d'archers » : ni trois ni cinq, sinon le titre est faux
    expect(Math.max(...TOURS_MAX)).toBe(4)
    // « cinquante âmes » doit tenir dans les habitations une fois achevées
    expect(Math.max(...POP_CAP)).toBeGreaterThanOrEqual(50)
    // « les huit places fortes » et « les huit héros »
    expect(HF_PAR_ID['troade-a-genoux'].desc).toContain('huit')
    expect(VILLAGES_CIBLES).toHaveLength(8)
    expect(HF_PAR_ID['tous-les-heros'].desc).toContain('huit')
    expect(HERO_IDS).toHaveLength(8)
    // « Élu des quatre Olympiens » nomme ses dieux : un cinquième dieu rendrait le titre menteur
    expect(GOD_IDS).toHaveLength(4)
    for (const g of GOD_IDS) expect(HF_PAR_ID['elu-des-quatre'].desc, g).toContain(GODS[g].nom)
    // et le calendrier des hauts faits doit suivre celui des saisons
    expect(JOURS_PAR_AN).toBe(Object.keys(SAISONS).length * JOURS_PAR_SAISON)
  })
})

describe('les conditions', () => {
  it('ne décerne rien à un village entièrement vide', () => {
    /*
     * Le filet contre le haut fait offert : une comparaison relâchée (`>= 0`),
     * une négation oubliée ou un `every` sur un tableau vide se verrait ici, et
     * un cadeau au premier tour dévaluerait les quarante-quatre autres.
     */
    expect(decroches(village())).toEqual([])
  })

  it('respecte au chiffre près les seuils annoncés au joueur', () => {
    /*
     * Un seuil se lit dans la description ; s'il glisse d'une unité dans le
     * code, personne ne le remarque et le joueur s'épuise à chercher pourquoi
     * rien ne tombe. Chaque ligne teste l'état juste en dessous, puis le seuil pile.
     */
    const paliers: [string, Partial<SnapHautFait>, Partial<SnapHautFait>][] = [
      ['premier-sang', { stats: annales(0) }, { stats: annales(1) }],
      ['veteran', { stats: annales(9) }, { stats: annales(10) }],
      ['rempart-des-troyens', { stats: annales(24) }, { stats: annales(25) }],
      ['faiseur-de-choix', { stats: annales(0, 24) }, { stats: annales(0, 25) }],
      // « Jamais pillé » cumule dix assauts ET pas une seule perte
      ['jamais-pille', { stats: annales(10, 0, 1) }, { stats: annales(10, 0, 0) }],
      ['quatre-tours', { tours: 3 }, { tours: 4 }],
      ['village-exalte', { morale: 89 }, { morale: 90 }],
      ['cinquante-ames', { pop: 49 }, { pop: 50 }],
      ['petite-armee', { army: { lancier: 7, archer: 7, hoplite: 5, frondeur: 0, peltaste: 0, belier: 0, char: 0 } }, { army: { lancier: 7, archer: 7, hoplite: 6, frondeur: 0, peltaste: 0, belier: 0, char: 0 } }],
      ['phalange', { army: { lancier: 40, archer: 40, hoplite: 7, frondeur: 0, peltaste: 0, belier: 0, char: 0 } }, { army: { lancier: 0, archer: 0, hoplite: 8, frondeur: 0, peltaste: 0, belier: 0, char: 0 } }],
      ['agora-marbre', { buildings: batiments(3) }, { buildings: batiments(3, { agora: 4 }) }],
      ['murs-poseidon', { buildings: batiments(3) }, { buildings: batiments(3, { remparts: 4 }) }],
      ['forge-hephaistos', { buildings: batiments(3) }, { buildings: batiments(3, { forge: 4 }) }],
      ['port-franc', { buildings: batiments(3) }, { buildings: batiments(3, { port: 4 }) }],
      ['temple-chryselephantin', { buildings: batiments(3) }, { buildings: batiments(3, { temple: 4 }) }],
      ['premier-sacrifice', { gods: dieux(0) }, { gods: dieux(0, { ares: 1 }) }],
      ['en-grace', { gods: dieux(39) }, { gods: dieux(0, { athena: 40 }) }],
      ['elu', { gods: dieux(69) }, { gods: dieux(0, { athena: 70 }) }],
      ['maudit', { gods: dieux(-69) }, { gods: dieux(0, { ares: -70 }) }],
      ['foudroyeur', { exploits: { benedictions: 19 } }, { exploits: { benedictions: 20 } }],
      ['reseau', { alliances: { thrace: {}, lesbos: {} } }, { alliances: { thrace: {}, lesbos: {}, tenedos: {} } }],
      [
        'cour-des-braves',
        { heros: cour({ hector: { recrute: true }, ulysse: { recrute: true }, ajax: { recrute: true } }) },
        {
          heros: cour({
            hector: { recrute: true },
            ulysse: { recrute: true },
            ajax: { recrute: true },
            enee: { recrute: true },
          }),
        },
      ],
      // le titre promet le niveau 5 : au niveau 4, la légende n'est pas au sommet
      ['heros-au-sommet', { heros: cour({ achille: { recrute: true, niveau: 4 } }) }, { heros: cour({ achille: { recrute: true, niveau: 5 } }) }],
      /*
       * Le millésime bascule au PREMIER jour de l'année suivante : jour 17 pour
       * la deuxième, jour 65 pour la cinquième. À noter : le titre « Cinq ans de
       * règne » se gagne donc après quatre années révolues - la description
       * (« Atteindre la cinquième année ») est la seule des deux à dire vrai.
       */
      ['une-annee', { jour: JOURS_PAR_AN }, { jour: JOURS_PAR_AN + 1 }],
      ['cinq-ans', { jour: JOURS_PAR_AN * 4 }, { jour: JOURS_PAR_AN * 4 + 1 }],
    ]
    for (const [id, dessous, pile] of paliers) {
      expect(atteint(id, village(dessous)), `${id} : juste en dessous du seuil`).toBe(false)
      expect(atteint(id, village(pile)), `${id} : pile au seuil`).toBe(true)
    }
    // les paliers couvrent-ils bien tout ce qui se compte ? garde-fou contre la ligne oubliée
    expect(new Set(paliers.map(([id]) => id)).size).toBe(paliers.length)
  })

  it('ne prend pas l’agora pour une première pierre, et veut les dix domaines', () => {
    // l'agora est offerte à la fondation : la faire grandir n'est pas bâtir
    expect(atteint('premiere-pierre', village({ buildings: batiments(0, { agora: 4 }) }))).toBe(false)
    expect(atteint('premiere-pierre', village({ buildings: batiments(0, { agora: 4, ferme: 1 }) }))).toBe(true)
    expect(atteint('tout-est-bati', village({ buildings: batiments(1, { port: 0 }) }))).toBe(false)
    expect(atteint('tout-est-bati', village({ buildings: batiments(1) }))).toBe(true)
    expect(atteint('cite-de-legende', village({ buildings: batiments(4) }))).toBe(true)
    expect(atteint('cite-de-legende', village({ buildings: batiments(4, { forge: 3 }) }))).toBe(false)
    /*
     * ⚠️ Comportement RÉEL consigné : « Cité de légende » compare la SOMME des
     * niveaux au maximum théorique, pas chaque bâtiment à 4. Un domaine qui
     * dépasserait 4 compenserait donc un domaine en retard. Aujourd'hui le store
     * plafonne à 4 et le sans-faute est bien exigé ; le jour où un niveau 5
     * existerait, cette attente devrait passer à `false`.
     */
    expect(atteint('cite-de-legende', village({ buildings: batiments(4, { forge: 3, agora: 5 }) }))).toBe(true)
  })

  it('remplit les réserves d’empire à 2 % près, sur les quatre denrées, et jamais sans agora', () => {
    const cap = STOCKAGE[NIVEAU_BATIMENT_MAX]
    const plein = { bois: cap, pierre: cap, grain: cap, bronze: cap }
    const grande = { buildings: batiments(NIVEAU_BATIMENT_MAX) }
    expect(atteint('coffres-pleins', village({ ...grande, resources: plein }))).toBe(true)
    for (const r of RESSOURCES) {
      // la tolérance existe parce qu'aucun joueur ne peut figer quatre jauges pile au maximum
      expect(atteint('coffres-pleins', village({ ...grande, resources: { ...plein, [r]: cap * 0.98 } })), r).toBe(true)
      // et chaque denrée compte : en oublier une dans la liste offrirait le haut
      // fait à trois entrepôts pleins et un quatrième à peine rempli
      expect(atteint('coffres-pleins', village({ ...grande, resources: { ...plein, [r]: cap * 0.9 } })), r).toBe(false)
    }
    // la capacité suit l'agora : sans elle, le haut fait ne doit pas tomber sur un stock fantôme
    expect(atteint('coffres-pleins', village({ buildings: batiments(0), resources: plein }))).toBe(false)
    // agora inachevée : le plein d'un petit entrepôt suffit, c'est bien la capacité du moment qui compte
    expect(atteint('coffres-pleins', village({ buildings: batiments(0, { agora: 1 }), resources: plein }))).toBe(true)
  })

  it('exige les quatre Olympiens ensemble pour l’élu des quatre', () => {
    const uneSeuleFaveur = village({ gods: dieux(0, { athena: 100 }) })
    // la faveur totale d'un seul Olympien ne remplace pas celle des quatre
    expect(atteint('elu-des-quatre', uneSeuleFaveur)).toBe(false)
    expect(atteint('elu-des-quatre', village({ gods: dieux(70) }))).toBe(true)
    // un seul dieu tiède à un point du seuil suffit à tout refuser
    expect(atteint('elu-des-quatre', village({ gods: dieux(100, { ares: 69 }) }))).toBe(false)
    // les hauts faits d'un seul dieu, eux, se contentent de la meilleure relation
    expect(atteint('elu', uneSeuleFaveur)).toBe(true)
    expect(atteint('en-grace', uneSeuleFaveur)).toBe(true)
  })

  it('n’accorde le plein emploi qu’avec autant de bras que de postes, sans un oisif', () => {
    // ferme et scierie au niveau 1 : deux postes en tout, d'après le barème POSTES
    expect(POSTES.ferme?.[1]).toBe(1)
    expect(POSTES.scierie?.[1]).toBe(1)
    const bat = batiments(0, { agora: 1, ferme: 1, scierie: 1 })
    const tenus = [{ poste: 'ferme' as BuildingId }, { poste: 'scierie' as BuildingId }]
    expect(atteint('plein-emploi', village({ buildings: bat, villageois: tenus }))).toBe(true)
    // un seul flâneur gâche tout : c'est précisément le sens du haut fait
    expect(atteint('plein-emploi', village({ buildings: bat, villageois: [...tenus, { poste: null }] }))).toBe(false)
    // un poste laissé vacant aussi
    expect(atteint('plein-emploi', village({ buildings: bat, villageois: [tenus[0]] }))).toBe(false)
    // et un village sans atelier ne gagne pas le plein emploi par forfait
    expect(atteint('plein-emploi', village({ buildings: batiments(0), villageois: [] }))).toBe(false)
    // l'agora et les remparts n'emploient personne : les monter ne crée aucun poste à tenir
    expect(
      atteint('plein-emploi', village({ buildings: batiments(0, { agora: 4, remparts: 4, ferme: 1 }), villageois: [tenus[0]] })),
    ).toBe(true)
  })

  it('compte les étoiles place forte par place forte, et le butin à part', () => {
    const troisPartout = Object.fromEntries(VILLAGES_CIBLES.map((v) => [v.id, { etoiles: 3 }]))
    expect(atteint('troade-a-genoux', village({ expeditions: troisPartout }))).toBe(true)
    const presque = { ...troisPartout, [VILLAGES_CIBLES[0].id]: { etoiles: 2 } }
    expect(atteint('troade-a-genoux', village({ expeditions: presque }))).toBe(false)
    // aucune expédition menée : le `?? 0` doit refuser, pas laisser passer un `every` sur du vide
    expect(atteint('troade-a-genoux', village({ expeditions: {} }))).toBe(false)
    // une seule expédition parfaite suffit en revanche au haut fait modeste
    expect(atteint('trois-etoiles', village({ expeditions: presque }))).toBe(true)
    expect(atteint('trois-etoiles', village({ expeditions: { [VILLAGES_CIBLES[0].id]: { etoiles: 2 } } }))).toBe(false)
    // et une victoire n'est pas un pillage : le butin se compte à part des étoiles
    expect(atteint('premiere-razzia', village({ expeditions: troisPartout }))).toBe(false)
    expect(
      atteint('premiere-razzia', village({ expeditions: { [VILLAGES_CIBLES[0].id]: { etoiles: 1, pillages: 1 } } })),
    ).toBe(true)
    /*
     * « La grande place forte » désigne un village par un identifiant écrit en
     * dur : renommer la cible dans expeditions.ts rendrait le haut fait muet.
     */
    expect(VILLAGES_CIBLES.map((v) => v.id)).toContain('forteresse-mysienne')
    expect(atteint('forteresse-mysienne', village({ expeditions: { 'forteresse-mysienne': { etoiles: 1 } } }))).toBe(true)
    expect(atteint('forteresse-mysienne', village({ expeditions: { [VILLAGES_CIBLES[0].id]: { etoiles: 3 } } }))).toBe(false)
  })

  it('sépare les héros vivants des héros tombés', () => {
    const quatreDebout = cour({
      hector: { recrute: true, niveau: 1 },
      ulysse: { recrute: true, niveau: 1 },
      achille: { recrute: true, niveau: 1 },
      ajax: { recrute: true, niveau: 1 },
    })
    const unTombe = cour({
      hector: { recrute: true },
      ulysse: { recrute: true },
      achille: { recrute: true },
      ajax: { recrute: true, mort: true },
    })
    // quatre recrutés dont un mort : trois vivants seulement, la cour n'est pas complète
    expect(atteint('cour-des-braves', village({ heros: unTombe }))).toBe(false)
    // mais la mort n'efface pas le passage du héros : elle ouvre même son propre haut fait
    expect(atteint('heros-a-ma-table', village({ heros: unTombe }))).toBe(true)
    expect(atteint('heros-a-ma-table', village({ heros: cour() }))).toBe(false)
    expect(atteint('nom-pour-les-aedes', village({ heros: unTombe }))).toBe(true)
    expect(atteint('nom-pour-les-aedes', village({ heros: quatreDebout }))).toBe(false)
    // un héros tombé au sommet ne décroche pas « Au sommet de sa légende »
    expect(atteint('heros-au-sommet', village({ heros: cour({ achille: { recrute: true, niveau: 5, mort: true } }) })))
      .toBe(false)
    // « Toute la matière troyenne » réclame les huit
    expect(atteint('tous-les-heros', village({ heros: quatreDebout }))).toBe(false)
    expect(atteint('tous-les-heros', village({ heros: cour({}, { recrute: true }) }))).toBe(true)
    /*
     * ⚠️ Comportement RÉEL consigné : la condition accepte `recrute || mort`.
     * Huit héros morts sans avoir jamais servi vaudraient donc « les avoir eus à
     * son service ». Le cas est inatteignable en jeu (on ne meurt qu'au service),
     * mais la condition dit moins que son titre.
     */
    expect(atteint('tous-les-heros', village({ heros: cour({}, { mort: true }) }))).toBe(true)
  })

  it('lit chaque exploit ponctuel dans son propre compteur, sans confusion entre eux', () => {
    /*
     * Ces clés sont un contrat muet avec le store (`noter(s, …)`). Une faute de
     * frappe d'un côté rendrait le haut fait définitivement inaccessible ; une
     * clé recopiée d'un haut fait à l'autre en offrirait deux pour un exploit.
     * D'où le palmarès complet à chaque tour : une seule case doit s'allumer.
     */
    const ponctuels: [string, string][] = [
      ['pas-un-homme', 'assautSansPerte'],
      ['trois-fronts', 'assautTroisFronts'],
      ['muraille-intacte', 'assautMurIntact'],
      ['breche-recollee', 'brecheRecollee'],
      ['grand-hiver', 'hiverTraverse'],
      ['le-sauveur', 'secours'],
      ['le-traitre', 'trahisons'],
    ]
    for (const [id, cle] of ponctuels) {
      // compteur absent : le `?? 0` doit refuser le haut fait
      expect(atteint(id, village()), id).toBe(false)
      expect(decroches(village({ exploits: { [cle]: 1 } })), cle).toEqual([id])
    }
    expect(decroches(village({ exploits: { benedictions: 20 } }))).toEqual(['foudroyeur'])
  })
})

describe('le prestige', () => {
  it('chiffre le bilan d’un règne connu, axe par axe', () => {
    const regne = village({
      buildings: batiments(2),
      tours: 4,
      pop: 30,
      stats: annales(12, 9, 5),
      expeditions: { 'camp-pillards': { etoiles: 3 }, 'fort-acheen': { etoiles: 3, pillages: 2 } },
      alliances: { 'hameau-thrace': {}, 'cite-lesbos': {} },
      gods: dieux(0, { zeus: 60, poseidon: 30, ares: -40 }),
      heros: cour({
        hector: { recrute: true, niveau: 2 },
        ulysse: { recrute: true, niveau: 3 },
        ajax: { recrute: true, niveau: 4 },
        achille: { recrute: true, niveau: 5, mort: true },
      }),
      jour: 20,
    })
    const detail = detailPrestige(regne, ['premier-sang', 'phalange'])
    /*
     * Le bilan est l'écran de fin : ses intitulés, son ordre et chacun de ses
     * coefficients sont visibles du joueur. On les fige tous ensemble, sinon
     * deux coefficients modifiés en sens contraire passeraient inaperçus dans
     * le total. La haine d'Arès ne creuse pas la ferveur (−40 ignoré, 90/3) et
     * le héros mort ne compte plus, ni sa tête ni ses niveaux (3 × 12 + 9 × 4).
     */
    expect(detail.map((d) => [d.label, d.points])).toEqual([
      ['Bâtiments élevés', 80], // 10 domaines au niveau 2 = 20 niveaux × 4
      ['Tours d’archers', 24], // 4 × 6
      ['Habitants', 60], // 30 habitants × 2 // 30 × 2
      ['Assauts repoussés', 48], // 12 × 4 - les 9 perdus ne retirent rien
      ['Étoiles d’expédition', 48], // 6 × 8
      ['Villages alliés', 36], // 2 × 18
      ['Ferveur des Olympiens', 30],
      ['Héros à votre table', 72],
      ['Journées de règne', 40], // 20 × 2
      ['Hauts faits', 30], // 5 + 25
    ])
    expect(prestige(regne, ['premier-sang', 'phalange'])).toBe(468)
    expect(titrePrestige(468).titre).toBe('Seigneur de la plaine')
  })

  it('ne baisse jamais quand la partie s’améliore', () => {
    /*
     * Chaque étape cumule les précédentes : le score ne doit pas seulement
     * tenir, il doit monter. Un axe pesant négativement (des pertes, un dieu
     * fâché, une saison) transformerait le bilan en punition.
     */
    const etapes: Partial<SnapHautFait>[] = [
      {},
      { buildings: batiments(1) },
      { buildings: batiments(4) },
      { tours: 4 },
      { pop: 40 },
      { stats: annales(12, 30, 9) },
      { expeditions: { 'camp-pillards': { etoiles: 3 } } },
      { alliances: { 'hameau-thrace': {} } },
      { gods: dieux(60) },
      { heros: cour({ hector: { recrute: true, niveau: 3 } }) },
      { saison: 'hiver', jour: 40 },
    ]
    let cumul: Partial<SnapHautFait> = {}
    const acquis: string[] = []
    let precedent = 0
    for (const etape of etapes) {
      cumul = { ...cumul, ...etape }
      const s = village(cumul)
      for (const h of HAUTS_FAITS) if (h.atteint(s) && !acquis.includes(h.id)) acquis.push(h.id)
      const score = prestige(s, acquis)
      expect(score, JSON.stringify(Object.keys(etape))).toBeGreaterThan(precedent)
      precedent = score
    }
    // le palmarès s'est garni chemin faisant : le cumul n'a pas seulement grossi les axes
    expect(acquis.length).toBeGreaterThanOrEqual(10)
  })

  it('garde un haut fait acquis même quand le village s’écroule', () => {
    const ruine = village()
    const nu = prestige(ruine, [])
    // « une fois gagné, pour toujours » : la promesse est écrite dans le panneau
    expect(prestige(ruine, ['cite-de-legende'])).toBe(nu + 60)
    expect(prestige(ruine, ['cite-de-legende', 'premier-sang'])).toBe(nu + 65)
    // un identifiant inconnu (vieille sauvegarde, haut fait renommé) ne casse rien
    expect(prestige(ruine, ['haut-fait-disparu'])).toBe(nu)
    // en revanche un doublon compterait deux fois : le dédoublonnage est le
    // travail du store, qui ne pousse un id qu'après un `includes`
    expect(prestige(ruine, ['premier-sang', 'premier-sang'])).toBe(nu + 10)
  })

  it('ne descend jamais sous zéro, même haï des quatre Olympiens', () => {
    const desastre = village({ gods: dieux(-100), stats: annales(0, 0, 40) })
    const detail = detailPrestige(desastre, [])
    // la ferveur est bornée par le bas : le mépris des dieux ne se paie pas en prestige négatif
    expect(axe(detail, 'Ferveur des Olympiens')).toBe(0)
    for (const d of detail) expect(d.points, d.label).toBeGreaterThanOrEqual(0)
    // il reste les deux points de la journée de fondation, jamais moins
    expect(prestige(desastre, [])).toBe(2)
  })
})

describe('les titres des aèdes', () => {
  it('couvre tout le domaine des scores sans jamais rétrograder', () => {
    const rangs: string[] = []
    let dernier = -1
    for (let score = 0; score <= 2000; score++) {
      const t = titrePrestige(score)
      expect(t.desc.trim(), `score ${score}`).not.toBe('')
      let rang = rangs.indexOf(t.titre)
      if (rang === -1) {
        rangs.push(t.titre)
        rang = rangs.length - 1
      }
      // les titres se découvrent dans l'ordre croissant : aucun ne doit revenir plus tard
      expect(rang, `score ${score}`).toBeGreaterThanOrEqual(dernier)
      dernier = rang
    }
    // sept rangs, dans cet ordre : une cascade de `if` mal ordonnée sauterait un palier
    expect(rangs).toEqual([
      'Roi de pacotille',
      'Maître de village',
      'Chef de guerre',
      'Seigneur de la plaine',
      'Prince d’Ilion',
      'Héros de la Troade',
      'Égal des dieux',
    ])
    // et au-delà de toute mesure, il reste un titre à donner
    expect(titrePrestige(1e9).titre).toBe(rangs[rangs.length - 1])
  })

  it('tranche net à chaque seuil : un point de moins, le rang précédent', () => {
    const echelle: [number, string][] = [
      [0, 'Roi de pacotille'],
      [120, 'Maître de village'],
      [250, 'Chef de guerre'],
      [450, 'Seigneur de la plaine'],
      [700, 'Prince d’Ilion'],
      [1000, 'Héros de la Troade'],
      [1400, 'Égal des dieux'],
    ]
    const descriptions = new Set<string>()
    for (let i = 0; i < echelle.length; i++) {
      const [seuil, titre] = echelle[i]
      expect(titrePrestige(seuil).titre, `${seuil}`).toBe(titre)
      // un point sous le seuil, c'est exactement le rang du dessous - pas « un autre titre »
      if (i > 0) expect(titrePrestige(seuil - 1).titre, `${seuil - 1}`).toBe(echelle[i - 1][1])
      descriptions.add(titrePrestige(seuil).desc)
    }
    expect(descriptions.size).toBe(echelle.length)
  })
})

/*
 * Le store est la seule source qui alimente les conditions. Un champ mal
 * recopié dans `snapHautFait` les rendrait toutes fausses en silence : aucun
 * haut fait ne tomberait plus, et le bilan de fin de règne mentirait.
 */
describe('la couture avec le store', () => {
  beforeEach(() => {
    useGame.getState().reset()
  })

  it('ne décerne rien à une cité tout juste fondée', () => {
    const neuve = snapHautFait(useGame.getState())
    // un haut fait offert au premier tour serait un cadeau qui dévalue les 44 autres
    expect(decroches(neuve)).toEqual([])
    expect(useGame.getState().hautsFaits).toEqual([])
    // l'agora de fondation (1 niveau → 4), sept habitants (14), premier jour (2)
    const detail = detailPrestige(neuve, [])
    expect(axe(detail, 'Bâtiments élevés')).toBe(4)
    expect(axe(detail, 'Habitants')).toBe(14)
    expect(axe(detail, 'Journées de règne')).toBe(2)
    expect(prestige(neuve, [])).toBe(20)
    expect(titrePrestige(20).titre).toBe('Roi de pacotille')
  })

  it('recopie fidèlement la partie dans la vue que jugent les hauts faits', () => {
    useGame.setState((s) => {
      s.pop = 41
      s.morale = 88
      s.tours = 3
      s.faveur = 66
      s.army = { lancier: 5, archer: 3, hoplite: 12, frondeur: 0, peltaste: 0, belier: 0, char: 0 }
      s.buildings.forge.level = 2
      s.gods.ares.relation = -73
      s.stats = { repousses: 7, perdus: 2, evenements: 19 }
      s.saison = 'hiver'
      s.exploits = { hiverTraverse: 1 }
      // le jour ne se compte pas : il se déduit des deux horloges de la sauvegarde
      s.createdAt = s.lastSeen - 3.5 * DAY_MS
    })
    const vu = snapHautFait(useGame.getState())
    // valeurs toutes distinctes : deux champs échangés dans la recopie se verraient
    expect(vu.pop).toBe(41)
    expect(vu.morale).toBe(88)
    expect(vu.tours).toBe(3)
    expect(vu.faveur).toBe(66)
    expect(vu.army).toEqual({ lancier: 5, archer: 3, hoplite: 12, frondeur: 0, peltaste: 0, belier: 0, char: 0 })
    expect(vu.buildings.forge.level).toBe(2)
    expect(vu.gods.ares.relation).toBe(-73)
    expect(vu.stats).toEqual({ repousses: 7, perdus: 2, evenements: 19 })
    expect(vu.saison).toBe('hiver')
    // trois journées et demie écoulées : on entame la quatrième
    expect(vu.jour).toBe(4)
    /*
     * Et le jugement rendu sur cet état, haut fait par haut fait : la forge
     * bâtie (mais pas l'agora seule), le premier assaut repoussé, vingt soldats
     * dont douze hoplites, Arès à −73 et l'hiver traversé. Ni plus - l'ambiance
     * à 88 et les 19 dilemmes restent sous leurs seuils.
     */
    expect(decroches(vu)).toEqual([
      'premiere-pierre',
      'premier-sang',
      'petite-armee',
      'phalange',
      'maudit',
      'grand-hiver',
    ])
  })

  it('sacre à l’abdication les hauts faits du dernier tour et les compte dans le bilan', () => {
    useGame.setState((s) => {
      s.buildings.ferme.level = 1
      s.stats.repousses = 1
    })
    // 20 points de cité neuve, + 4 pour la ferme bâtie, + 4 pour l'assaut repoussé
    expect(prestigeCourant(useGame.getState())).toBe(28)
    useGame.getState().abdiquer()
    const s = useGame.getState()
    /*
     * Sans le contrôle final, le joueur perdrait les hauts faits gagnés entre
     * le dernier tick et son abdication - et ses points avec eux.
     */
    expect(s.hautsFaits).toEqual(['premiere-pierre', 'premier-sang'])
    expect(s.finDePartie?.score).toBe(38) // 28 + 5 + 5
    expect(s.finDePartie?.titre).toBe('Roi de pacotille')
    // le bilan ne montre que les axes qui ont pesé
    expect(s.finDePartie?.lignes).toContain('Hauts faits : 10')
    expect(s.finDePartie?.lignes.some((l) => l.startsWith('Villages alliés'))).toBe(false)
  })
})
