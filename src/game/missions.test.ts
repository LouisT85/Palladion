import { beforeEach, describe, expect, it } from 'vitest'
import {
  ACTES,
  MISSIONS,
  MISSIONS_PAR_ID,
  acteCourant,
  acteDe,
  avancementActe,
  finActe,
  missionsActives,
  rangMission,
  type EtatMissions,
  type MissionDef,
} from './missions'
import {
  BUILDINGS,
  BUILDING_IDS,
  FAVEUR_MAX,
  GOD_IDS,
  POP_CAP,
  POSTES,
  STOCKAGE,
  TOURS_MAX,
  UNITS,
  WALL_HP,
  nbFronts,
} from './data'
import { VILLAGES_CIBLES } from './expeditions'
import { useGame } from './store'
import type { BuildingId, GodId, ResourceId, UnitId } from './types'

/*
 * LE FIL ROUGE SOUS SURVEILLANCE.
 *
 * Les cinquante-cinq missions sont le seul guide du joueur : une jauge qui
 * déborde, une mission impossible à finir ou une borne d'acte décalée d'un rang
 * ne se voient pas à la lecture et se paient en partie bloquée. On garde donc
 * quatre choses : que les jauges tiennent leurs bornes sur les deux extrêmes du
 * jeu (hameau vide / cité achevée), que le fil se déroule dans l'ordre annoncé,
 * que chaque objectif reste ATTEIGNABLE compte tenu des règles qui vivent
 * ailleurs - postes de travail, entrepôt, plafond de population, niveaux de
 * caserne, seuils de fronts - et que le bouton « y aller » ouvre bien l'écran
 * promis. C'est cette couture entre missions.ts, data.ts et le store qui casse
 * en silence quand on rééquilibre.
 *
 * Deux partis pris de méthode :
 *  - les exigences des missions ne sont jamais recopiées à la main, elles sont
 *    SONDÉES (on abaisse un seul levier depuis la cité achevée et l'on regarde
 *    à partir de quand la mission cesse d'être faite), puis confrontées aux
 *    tables de data.ts. Un rééquilibrage de POSTES, STOCKAGE ou TOURS_MAX fait
 *    donc rougir ce fichier au lieu de passer inaperçu ;
 *  - chaque test part d'un store remis à neuf (`beforeEach`), pour qu'aucun ne
 *    dépende de l'ordre d'exécution ni de ce que le précédent a laissé traîner.
 *
 * Note : sous Vitest, `import.meta.env.MODE` vaut 'test', donc MODE_TEST est
 * VRAI et `payer`/`peutPayer` du store rendent toujours true. Aucun test
 * ci-dessous ne dépend d'un paiement : les états de jeu sont posés à la main et
 * les récompenses sont créditées par `reclamerMission`, qui n'encaisse rien.
 */

/**
 * Bornes des cinq actes, recopiées à la main : c'est le point de contrôle du
 * découpage. `ACTES` se termine sur `MISSIONS.length`, donc une mission insérée
 * n'y ferait aucun trou - elle grossirait le dernier acte sans bruit. Ces cinq
 * nombres sont là pour qu'on ne puisse pas allonger le fil rouge sans dire à
 * quel acte la nouvelle mission appartient.
 */
const FINS_ATTENDUES = [10, 20, 29, 40, 55]

/** les trois panneaux qu'une mission peut demander - cf. `CibleMission` */
const PANNEAUX_CIBLES = ['expeditions', 'pantheon', 'heros']

/** niveau d'Agora d'une partie neuve, avant que le fil rouge n'en réclame */
const AGORA_DEPART = 1

function batiments(niveauTous: number): Record<BuildingId, { level: number }> {
  return Object.fromEntries(BUILDING_IDS.map((b) => [b, { level: niveauTous }])) as Record<
    BuildingId,
    { level: number }
  >
}

function dieux(relation: number): Record<GodId, { relation: number }> {
  return Object.fromEntries(GOD_IDS.map((g) => [g, { relation }])) as Record<GodId, { relation: number }>
}

/** le hameau du premier matin : rien de bâti, personne au travail */
function etatVide(): EtatMissions {
  return {
    buildings: batiments(0),
    villageois: [],
    army: { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 },
    resources: { bois: 0, pierre: 0, grain: 0, bronze: 0 },
    pop: 0,
    morale: 0,
    faveur: 0,
    tours: 0,
    wallHp: 0,
    threat: 0,
    stats: { repousses: 0, perdus: 0, evenements: 0 },
    expeditions: {},
    gods: dieux(0),
  }
}

/** tous les postes offerts à ce niveau de bâtiment, chacun tenu par un habitant */
function tousAuxPostes(niveauB: number): { poste: BuildingId | null }[] {
  const v: { poste: BuildingId | null }[] = []
  for (const b of Object.keys(POSTES) as BuildingId[]) {
    for (let i = 0; i < (POSTES[b]?.[niveauB] ?? 0); i++) v.push({ poste: b })
  }
  return v
}

/**
 * La cité achevée - mais achevée DANS LES LIMITES QUE LE JEU IMPOSE : pas un
 * travailleur de plus que POSTES n'en offre, pas un grain de plus que
 * l'entrepôt n'en tient, pas un habitant au-delà du plafond des maisons, pas
 * une étoile de plus que la Troade n'en compte, et une garnison qui tienne dans
 * la population restante. Une mission qui réclamerait au-delà d'un de ces
 * plafonds serait infinissable : c'est ce décor qui le révèle. Il sert aussi de
 * base à tous les sondages ci-dessous - on n'abaisse qu'un levier à la fois.
 */
function etatAcheve(): EtatMissions {
  const stock = STOCKAGE[4]
  return {
    buildings: batiments(4),
    villageois: tousAuxPostes(4),
    // 30 soldats + 17 ouvriers tiennent dans les 52 habitants du dernier niveau de maisons
    army: { lancier: 10, archer: 10, hoplite: 10, frondeur: 0, peltaste: 0, belier: 0, char: 0 },
    resources: { bois: stock, pierre: stock, grain: stock, bronze: stock },
    pop: POP_CAP[4],
    morale: 100,
    faveur: FAVEUR_MAX,
    tours: TOURS_MAX[4],
    wallHp: WALL_HP[4],
    threat: 100,
    stats: { repousses: 12, perdus: 4, evenements: 12 },
    expeditions: Object.fromEntries(VILLAGES_CIBLES.map((v) => [v.id, { etoiles: 3 }])),
    gods: dieux(100),
  }
}

function fait(m: MissionDef, s: EtatMissions): boolean {
  const p = m.progres(s)
  return p.cur >= p.max
}

/** maximum de chaque jauge, relevé une fois pour toutes : il ne doit pas bouger */
const MAX_REF: Record<string, number> = Object.fromEntries(
  MISSIONS.map((m) => [m.id, m.progres(etatVide()).max]),
)

/** tirage reproductible (mulberry32) : un test qui rougit doit rougir à tous les coups */
function tirage(graine: number): () => number {
  let a = graine
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** un état de jeu quelconque mais légal, pour balayer autre chose que les extrêmes */
function etatPlausible(r: () => number): EtatMissions {
  const b = batiments(0)
  for (const id of BUILDING_IDS) b[id] = { level: Math.floor(r() * 5) }
  const villageois: { poste: BuildingId | null }[] = []
  for (const id of Object.keys(POSTES) as BuildingId[]) {
    const max = POSTES[id]?.[b[id].level] ?? 0
    for (let i = 0; i < Math.floor(r() * (max + 1)); i++) villageois.push({ poste: id })
  }
  const stock = STOCKAGE[b.agora.level]
  const res = () => Math.floor(r() * (stock + 1))
  return {
    buildings: b,
    villageois,
    army: { lancier: Math.floor(r() * 15), archer: Math.floor(r() * 15), hoplite: Math.floor(r() * 10), frondeur: 0, peltaste: 0, belier: 0, char: 0 },
    resources: { bois: res(), pierre: res(), grain: res(), bronze: res() },
    pop: Math.floor(r() * (POP_CAP[b.maisons.level] + 1)),
    morale: r() * 100,
    faveur: r() * FAVEUR_MAX,
    tours: Math.floor(r() * (TOURS_MAX[b.remparts.level] + 1)),
    wallHp: Math.floor(r() * (WALL_HP[b.remparts.level] + 1)),
    threat: 5 + r() * 95,
    stats: {
      repousses: Math.floor(r() * 20),
      perdus: Math.floor(r() * 20),
      evenements: Math.floor(r() * 20),
    },
    expeditions: Object.fromEntries(
      VILLAGES_CIBLES.filter(() => r() < 0.6).map((v) => [v.id, { etoiles: Math.floor(r() * 4) }]),
    ),
    gods: Object.fromEntries(GOD_IDS.map((g) => [g, { relation: Math.round(r() * 200 - 100) }])) as Record<
      GodId,
      { relation: number }
    >,
  }
}

/*
 * Les sondages. Chacun part de la cité achevée - où tout est fait - et abaisse
 * UN seul levier jusqu'à ce que la mission cesse de l'être : on obtient ainsi ce
 * que la mission exige réellement, sans recopier la définition (donc sans
 * réécrire la formule qu'on prétend tester). Un sondage qui rend 0 signifie que
 * la mission ne dépend pas de ce levier.
 */

/** niveau minimal de ce bâtiment sans lequel la mission n'est plus faite */
function niveauExige(m: MissionDef, b: BuildingId): number {
  for (let n = 0; n <= 4; n++) {
    const s = etatAcheve()
    s.buildings[b] = { level: n }
    if (fait(m, s)) return n
  }
  return 4
}

/** stock (identique sur les quatre ressources) sans lequel la mission n'est plus faite */
function stockExige(m: MissionDef): number {
  for (let n = 0; n <= STOCKAGE[4]; n += 10) {
    const s = etatAcheve()
    s.resources = { bois: n, pierre: n, grain: n, bronze: n }
    if (fait(m, s)) return n
  }
  return STOCKAGE[4]
}

/** population sans laquelle la mission n'est plus faite */
function popExigee(m: MissionDef): number {
  for (let n = 0; n <= POP_CAP[4]; n++) {
    const s = etatAcheve()
    s.pop = n
    if (fait(m, s)) return n
  }
  return POP_CAP[4]
}

/** effectif de cette unité sans lequel la mission n'est plus faite */
function uniteExigee(m: MissionDef, u: UnitId): number {
  for (let n = 0; n <= 30; n++) {
    const s = etatAcheve()
    s.army = { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 }
    s.army[u] = n
    if (fait(m, s)) return n
  }
  return 30
}

/** menace sans laquelle la mission n'est plus faite */
function menaceExigee(m: MissionDef): number {
  for (let t = 0; t <= 100; t++) {
    const s = etatAcheve()
    s.threat = t
    if (fait(m, s)) return t
  }
  return 100
}

/** assauts repoussés sans lesquels la mission n'est plus faite */
function repoussesExiges(m: MissionDef): number {
  for (let n = 0; n <= 40; n++) {
    const s = etatAcheve()
    s.stats = { ...s.stats, repousses: n }
    if (fait(m, s)) return n
  }
  return 40
}

/** tours d'archers sans lesquelles la mission n'est plus faite */
function toursExigees(m: MissionDef): number {
  for (let t = 0; t <= TOURS_MAX[4] + 4; t++) {
    const s = etatAcheve()
    s.tours = t
    if (fait(m, s)) return t
  }
  return TOURS_MAX[4] + 4
}

/**
 * Niveau d'Agora que le fil rouge a déjà réclamé AVANT ce rang. C'est la clé de
 * toutes les vérifications d'atteignabilité : aucun bâtiment ne dépasse le
 * niveau de l'Agora (`agoraOk` dans PanneauBatiment), donc un objectif qui
 * suppose une caserne 3 alors que le fil n'a demandé qu'une Agora 2 envoie le
 * joueur contre un bouton grisé.
 */
function agoraAcquise(rang: number): number {
  let n = AGORA_DEPART
  for (const m of MISSIONS) {
    if (rangMission(m.id) >= rang) break
    n = Math.max(n, niveauExige(m, 'agora'))
  }
  return n
}

/** remise à neuf du store avant chaque test : aucun ne doit hériter du précédent */
beforeEach(() => {
  useGame.getState().reset()
  useGame.setState({ toasts: [], reports: [] })
})

describe('catalogue du fil rouge', () => {
  it('n’a ni doublon d’identifiant ni mission introuvable par son id', () => {
    const ids = MISSIONS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    // le store ne réclame que par cet index : un id en double y ferait disparaître
    // une mission, et le fil rouge se bloquerait sur celle qui reste
    expect(Object.keys(MISSIONS_PAR_ID).sort()).toEqual([...ids].sort())
    for (const m of MISSIONS) expect(MISSIONS_PAR_ID[m.id], m.id).toBe(m)
  })

  it('promet toujours une récompense réelle, annoncée en français soigné', () => {
    for (const m of MISSIONS) {
      // l'émoji est peint dans le journal et les toasts : une lettre ASCII y
      // passerait pour un caractère perdu
      expect([...m.emoji].every((c) => (c.codePointAt(0) ?? 0) > 127), m.id).toBe(true)
      expect(m.titre.trim().length, m.id).toBeGreaterThan(2)
      expect(m.desc.trim().length, m.id).toBeGreaterThan(20)
      // l'apostrophe droite se voit à l'écran : tout le dépôt écrit l'apostrophe typographique
      expect(m.titre + m.desc, m.id).not.toMatch(/'/)
      const montants = [
        ...Object.values(m.recompense.res ?? {}),
        m.recompense.faveur ?? 0,
        m.recompense.pop ?? 0,
      ]
      // une récompense vide, c'est une étape du fil rouge qui ne récompense rien
      expect(Math.max(...montants), m.id).toBeGreaterThan(0)
      for (const n of montants) expect(Number.isInteger(n) && n >= 0, `${m.id} : ${n}`).toBe(true)
      // la ferveur est plafonnée par le store : au-delà, la promesse est un mensonge
      expect(m.recompense.faveur ?? 0, m.id).toBeLessThanOrEqual(FAVEUR_MAX)
    }
    // le journal et le panneau listent les missions par leur titre : deux titres
    // identiques et le joueur ne sait plus laquelle il vient d'achever
    expect(new Set(MISSIONS.map((m) => m.titre)).size).toBe(MISSIONS.length)
  })

  it('paie de mieux en mieux à mesure que le fil rouge avance', () => {
    // la ferveur et les habitants valent plus qu'une charretée de bois : sans cette
    // pondération, un acte payé en faveur passerait pour avare
    const valeur = (m: MissionDef) =>
      Object.values(m.recompense.res ?? {}).reduce((a, n) => a + n, 0) +
      (m.recompense.faveur ?? 0) * 4 +
      (m.recompense.pop ?? 0) * 60
    const moyennes = ACTES.map((a, i) => {
      const tranche = MISSIONS.slice(i === 0 ? 0 : ACTES[i - 1].fin, a.fin)
      return tranche.reduce((s, m) => s + valeur(m), 0) / tranche.length
    })
    // acte par acte, la courbe n'est PAS strictement croissante : l'acte III fait un
    // léger creux (180 contre 186 pour l'acte II - signalé au rapport). Ce qui doit
    // rester vrai : aucun acte ne retombe au tarif du hameau, et la légende paie le mieux
    for (let i = 1; i < moyennes.length; i++) {
      expect(moyennes[i], ACTES[i].nom).toBeGreaterThan(moyennes[0])
    }
    expect(Math.max(...moyennes)).toBe(moyennes[moyennes.length - 1])
    // et la seconde moitié du fil rapporte plus du double de la première
    const somme = (ms: MissionDef[]) => ms.reduce((s, m) => s + valeur(m), 0)
    const moitie = Math.floor(MISSIONS.length / 2)
    expect(somme(MISSIONS.slice(moitie))).toBeGreaterThan(2 * somme(MISSIONS.slice(0, moitie)))
  })
})

describe('les jauges de progression', () => {
  it('reste à zéro sur un hameau vide, hors la mission d’ouverture', () => {
    const s = etatVide()
    // « Un nouveau départ » se réclame d'emblée : c'est la mise de départ du joueur
    expect(MISSIONS.filter((m) => fait(m, s)).map((m) => m.id)).toEqual(['nouveau-depart'])
    for (const m of MISSIONS) {
      const p = m.progres(s)
      expect(Number.isFinite(p.cur) && Number.isFinite(p.max), m.id).toBe(true)
      // max = 0 diviserait par zéro dans la barre de progression de l'UI
      expect(p.max, m.id).toBeGreaterThanOrEqual(1)
      expect(p.cur, m.id).toBeGreaterThanOrEqual(0)
      expect(p.cur, m.id).toBeLessThanOrEqual(p.max)
    }
  })

  it('atteint pile son maximum sur une cité achevée, et ne bouge plus sur un état délirant', () => {
    for (const m of MISSIONS) {
      const p = m.progres(etatAcheve())
      // en dessous : la mission est infinissable dans les limites du jeu ;
      // au-dessus : la jauge n'est pas bornée
      expect(p.cur, m.id).toBe(p.max)
    }
    // une sauvegarde bricolée à la console ne doit ni faire déborder la jauge ni
    // DÉPLACER sa cible : c'est `seuil` qui tient le plafond. Le plancher, lui,
    // n'est garanti que par le store, qui ne laisse aucun compteur passer sous zéro.
    const triche: EtatMissions = {
      ...etatAcheve(),
      pop: 9e6,
      morale: 5000,
      tours: 99,
      threat: 9999,
      wallHp: 9e6,
      resources: { bois: 9e6, pierre: 9e6, grain: 9e6, bronze: 9e6 },
      stats: { repousses: 9999, perdus: 9999, evenements: 9999 },
      expeditions: { 'village-triche': { etoiles: 9999 } },
      gods: dieux(9999),
    }
    for (const m of MISSIONS) {
      const p = m.progres(triche)
      expect(p.cur, m.id).toBe(p.max)
      expect(p.max, m.id).toBe(MAX_REF[m.id])
    }
  })

  it('ne compte que les habitants réellement affectés, et au bon atelier', () => {
    // quatre paysans dans les sillons : la ferme est pourvue, l'autel reste froid.
    // Un compteur qui additionnerait tous les postes ferait avancer « Un prêtre au
    // temple » sans qu'aucun prêtre n'y monte - et la faveur ne monterait pas
    const auxChamps: EtatMissions = {
      ...etatVide(),
      villageois: Array.from({ length: 4 }, () => ({ poste: 'ferme' as BuildingId })),
    }
    expect(fait(MISSIONS_PAR_ID['champs-a-deux-mains'], auxChamps)).toBe(true)
    expect(fait(MISSIONS_PAR_ID['ferme-a-plein'], auxChamps)).toBe(true)
    expect(fait(MISSIONS_PAR_ID['un-pretre-au-temple'], auxChamps)).toBe(false)
    expect(fait(MISSIONS_PAR_ID['un-forgeron'], auxChamps)).toBe(false)
    expect(fait(MISSIONS_PAR_ID['le-docker'], auxChamps)).toBe(false)
    // « Bûcherons et carriers » réclame les deux ateliers : quatre bûcherons ne
    // remplacent pas deux bûcherons et deux carriers
    const quatreBucherons: EtatMissions = {
      ...etatVide(),
      villageois: Array.from({ length: 4 }, () => ({ poste: 'scierie' as BuildingId })),
    }
    expect(fait(MISSIONS_PAR_ID['bucherons-et-carriers'], quatreBucherons)).toBe(false)
    // et les désœuvrés ne travaillent pas : quinze oisifs n'ouvrent aucune ruche
    const oisifs: EtatMissions = {
      ...etatVide(),
      villageois: Array.from({ length: 15 }, () => ({ poste: null })),
    }
    expect(fait(MISSIONS_PAR_ID['trois-au-travail'], oisifs)).toBe(false)
    expect(fait(MISSIONS_PAR_ID['tous-aux-postes'], oisifs)).toBe(false)
  })

  it('tient ses bornes sur cinquante états de jeu tirés au hasard', () => {
    const r = tirage(20250801)
    const faites: number[] = []
    for (let i = 0; i < 50; i++) {
      const s = etatPlausible(r)
      let n = 0
      for (const m of MISSIONS) {
        const p = m.progres(s)
        expect(Number.isFinite(p.cur) && Number.isFinite(p.max), `${m.id} #${i}`).toBe(true)
        expect(p.cur, `${m.id} #${i}`).toBeGreaterThanOrEqual(0)
        expect(p.cur, `${m.id} #${i}`).toBeLessThanOrEqual(p.max)
        // le maximum est la promesse affichée : il ne dépend pas de l'état du jeu
        expect(p.max, `${m.id} #${i}`).toBe(MAX_REF[m.id])
        if (p.cur >= p.max) n++
      }
      faites.push(n)
    }
    // le balayage ne vaut que s'il balaie : un tirage dégénéré (générateur qui se
    // bloque, borne mal calculée) rendrait cinquante fois le même village et ce
    // test ne prouverait plus rien. On exige donc des villages franchement
    // inégaux, du traînard à celui qui a presque tout fait.
    expect(new Set(faites).size).toBeGreaterThan(10)
    expect(Math.min(...faites)).toBeLessThan(MISSIONS.length * 0.5)
    expect(Math.max(...faites)).toBeGreaterThan(MISSIONS.length * 0.6)
  })
})

describe('les trois missions ouvertes', () => {
  it('ouvre le jeu sur les trois premières du fil rouge', () => {
    expect(missionsActives([]).map((m) => m.id)).toEqual([
      'nouveau-depart',
      'le-pain-d-abord',
      'bras-aux-champs',
    ])
  })

  it('avance d’un cran à chaque récompense reçue, sans jamais rendre une mission déjà réclamée', () => {
    const ids = MISSIONS.map((m) => m.id)
    const reclamees: string[] = []
    for (let i = 0; i < ids.length; i++) {
      /*
       * Trois à la fois - mais jamais par-dessus une fin d'acte : un acte est un
       * palier du récit, on l'achève avant que le suivant ne se descelle. En fin
       * d'acte comme en fin de fil, il en reste donc moins de trois. L'attente est
       * calculée sur les bornes recopiées plus haut, pas sur `finActe` : sinon le
       * test rejouerait la formule qu'il vérifie.
       */
      const finRang = FINS_ATTENDUES.find((f) => f >= i + 1) ?? MISSIONS.length
      expect(missionsActives(reclamees).map((m) => m.id), ids[i]).toEqual(
        ids.slice(i, Math.min(i + 3, finRang)),
      )
      reclamees.push(ids[i])
    }
    // le fil épuisé, le panneau n'a plus rien à proposer - et surtout rien à
    // reproposer, ce qui rendrait la dernière récompense réclamable sans fin
    expect(missionsActives(reclamees)).toEqual([])
  })

  it('encaisse une sauvegarde d’une autre version : ids inconnus et ordre bousculé', () => {
    // 'mission-supprimee' n'existe plus, et le joueur a réclamé la 2e sans la 1re :
    // le fil rouge doit reprendre à la première qui manque, sans trou ni doublon
    expect(missionsActives(['mission-supprimee', 'le-pain-d-abord']).map((m) => m.id)).toEqual([
      'nouveau-depart',
      'bras-aux-champs',
      'bois-pour-l-hiver',
    ])
  })
})

describe('le découpage en cinq actes', () => {
  it('range les cinquante-cinq missions dans cinq actes aux bornes arrêtées', () => {
    expect(MISSIONS).toHaveLength(55)
    expect(ACTES.map((a) => a.fin)).toEqual(FINS_ATTENDUES)
    let debut = 1
    for (const a of ACTES) {
      expect(a.nom.trim(), `acte finissant au rang ${a.fin}`).not.toBe('')
      // bornes croissantes : deux actes qui se croisent en videraient un
      expect(a.fin, a.nom).toBeGreaterThanOrEqual(debut)
      for (let rang = debut; rang <= a.fin; rang++) expect(acteDe(rang), `rang ${rang}`).toBe(a.nom)
      expect(finActe(a.fin), a.nom).toBe(a.fin)
      expect(finActe(debut), a.nom).toBe(a.fin)
      debut = a.fin + 1
    }
    // hors bornes, on retombe dans le dernier acte plutôt que de rendre undefined
    expect(acteDe(MISSIONS.length + 7)).toBe(ACTES[ACTES.length - 1].nom)
    expect(finActe(MISSIONS.length + 7)).toBe(MISSIONS.length)
    // un id disparu vaut rang 0, et le rang 0 retombe dans l'acte I : le journal
    // écrirait « Mission 0 - … » plutôt que de refuser (comportement constaté)
    expect(rangMission('mission-fantome')).toBe(0)
    expect(acteDe(0)).toBe(ACTES[0].nom)
  })

  it('ouvre chaque acte sur la mission prévue par le récit', () => {
    // c'est ici qu'on voit une mission insérée au milieu d'un acte sans avoir
    // décalé les bornes : tout le découpage glisserait d'un rang
    const ouvertures = ['nouveau-depart', 'maison-des-dieux', 'muraille-de-pierre', 'prosperite', 'temple-d-ares']
    ouvertures.forEach((id, i) => {
      expect(rangMission(id), id).toBe(i === 0 ? 1 : ACTES[i - 1].fin + 1)
      expect(acteDe(rangMission(id)), id).toBe(ACTES[i].nom)
    })
    // et le fil se referme sur le Palladion, qui donne son nom au jeu
    expect(rangMission('palladion')).toBe(MISSIONS.length)
  })

  it('achève un acte avant de desceller le suivant', () => {
    const ids = MISSIONS.map((m) => m.id)
    const finI = ACTES[0].fin
    // à une mission de la fin de l'acte I, elle reste SEULE ouverte : le temple de
    // l'acte II n'apparaît pas encore, et c'est ce qui fait sentir le chapitre
    expect(missionsActives(ids.slice(0, finI - 1)).map((m) => m.id)).toEqual(['premiere-victoire'])
    expect(acteCourant(ids.slice(0, finI - 1))).toBe(0)
    // l'acte I réclamé en entier, les trois premières de l'acte II s'ouvrent d'un coup
    expect(missionsActives(ids.slice(0, finI)).map((m) => m.id)).toEqual([
      'maison-des-dieux',
      'un-pretre-au-temple',
      'grandir',
    ])
    expect(acteCourant(ids.slice(0, finI))).toBe(1)
    expect(acteCourant([])).toBe(0)
    expect(acteCourant(ids)).toBe(ACTES.length - 1)
    // l'avancement affiché compte les missions de CET acte, pas celles du fil entier
    expect(avancementActe(0, ids.slice(0, 4))).toEqual({ faites: 4, total: finI })
    expect(avancementActe(1, ids.slice(0, 4))).toEqual({ faites: 0, total: ACTES[1].fin - finI })
    expect(avancementActe(1, ids.slice(0, finI + 2))).toEqual({ faites: 2, total: ACTES[1].fin - finI })
    expect(avancementActe(ACTES.length - 1, ids)).toEqual({
      faites: MISSIONS.length - ACTES[ACTES.length - 2].fin,
      total: MISSIONS.length - ACTES[ACTES.length - 2].fin,
    })
  })
})

describe('où chaque mission se joue', () => {
  it('conduit le joueur à l’écran où la mission se joue, et n’ouvre rien pour les autres', () => {
    for (const m of MISSIONS) {
      if (!m.cible) continue
      useGame.setState({ selected: null, popOuvert: false, panel: null })
      useGame.getState().allerAMission(m.id)
      const s = useGame.getState()
      // « y aller » est un vrai bouton : ce qu'il ouvre doit correspondre à la
      // cible, et une seule chose à la fois - deux modales superposées et l'on
      // ne voit plus rien
      if (m.cible.quoi === 'batiment') {
        expect(BUILDINGS[m.cible.id], m.id).toBeDefined()
        expect([s.selected, s.popOuvert, s.panel], m.id).toEqual([m.cible.id, false, null])
      } else if (m.cible.quoi === 'habitants') {
        expect([s.selected, s.popOuvert, s.panel], m.id).toEqual([null, true, null])
      } else {
        expect(PANNEAUX_CIBLES, m.id).toContain(m.cible.id)
        expect([s.selected, s.popOuvert, s.panel], m.id).toEqual([null, false, m.cible.id])
      }
    }
    // le tableau des cibles est indexé par id : une clé mal orthographiée n'aurait
    // rendu personne muet, elle aurait juste privé la mission de son bouton
    expect(MISSIONS.filter((m) => !m.cible).map((m) => m.id)).toEqual([
      'nouveau-depart',
      'premiere-victoire',
      'premiers-dilemmes',
      'ambiance-de-fete',
      'dix-dilemmes',
    ])
    // ces cinq-là ne s'accomplissent sur aucun écran : « y aller » ne doit surtout
    // pas refermer ce que le joueur avait ouvert
    for (const id of ['nouveau-depart', 'dix-dilemmes', 'mission-fantome']) {
      useGame.setState({ selected: 'agora', popOuvert: true, panel: 'journal' })
      useGame.getState().allerAMission(id)
      const s = useGame.getState()
      expect([s.selected, s.popOuvert, s.panel], id).toEqual(['agora', true, 'journal'])
    }
  })

  it('pointe vers l’écran que la mission exige vraiment', () => {
    /*
     * Le test précédent garde la plomberie ; celui-ci garde le choix éditorial.
     * `CIBLES` est un tableau à part, tenu à la main : rien n'empêchait « Le culte
     * d'Arès » d'envoyer au chantier de l'Agora. On ne recopie donc pas le
     * tableau - on redéduit la cible de ce que la mission EXIGE, et l'on compare.
     */
    let verifiees = 0
    for (const m of MISSIONS) {
      const requis = BUILDING_IDS.filter((b) => niveauExige(m, b) >= 1)
      // une mission qui cesse d'être faite quand on efface la campagne se joue
      // sur la carte de la Troade, pas dans un chantier
      const parLaCampagne = !fait(m, { ...etatAcheve(), expeditions: {} })
      const parLaFerveur = !fait(m, { ...etatAcheve(), gods: dieux(-100) })
      if (parLaCampagne) expect(m.cible, m.id).toEqual({ quoi: 'panneau', id: 'expeditions' })
      else if (parLaFerveur) expect(m.cible, m.id).toEqual({ quoi: 'panneau', id: 'pantheon' })
      // un seul bâtiment à élever : c'est SON chantier qu'on ouvre
      else if (requis.length === 1) expect(m.cible, m.id).toEqual({ quoi: 'batiment', id: requis[0] })
      // toute la cité à élever (« Cité de légende », « Le Palladion ») : l'Agora,
      // d'où l'on voit le village entier
      else if (requis.length > 1) expect(m.cible, m.id).toEqual({ quoi: 'batiment', id: 'agora' })
      else continue
      verifiees++
    }
    // le compte est arrêté : une mission dont la cible cesse d'être déductible
    // (parce qu'on a changé ce qu'elle exige) doit se faire remarquer
    expect(verifiees).toBe(27)
  })

  it('mène au recensement toute mission qui se règle en affectant des habitants', () => {
    const vide = etatVide()
    const peuple: EtatMissions = { ...vide, villageois: tousAuxPostes(4) }
    const parAffectation = MISSIONS.filter((m) => m.progres(peuple).cur > m.progres(vide).cur)
    // liste arrêtée : une mission d'affectation ajoutée sans cible passerait
    // inaperçue derrière un simple compte
    expect(parAffectation.map((m) => m.id)).toEqual([
      'bras-aux-champs',
      'trois-au-travail',
      'un-pretre-au-temple',
      'champs-a-deux-mains',
      'bucherons-et-carriers',
      'un-forgeron',
      'le-docker',
      'dix-au-travail',
      'ferme-a-plein',
      'tous-aux-postes',
    ])
    for (const m of parAffectation) {
      // « Le domaine agricole » fait exception : sa consigne réclame d'abord une
      // ferme de niveau 4, d'où le panneau de la ferme plutôt que le recensement
      if (m.id === 'ferme-a-plein') continue
      expect(m.cible, m.id).toEqual({ quoi: 'habitants' })
    }
    expect(MISSIONS_PAR_ID['ferme-a-plein'].cible).toEqual({ quoi: 'batiment', id: 'ferme' })
  })
})

describe('les missions collent aux règles du jeu', () => {
  it('cale les missions de fronts sur les seuils réels de nbFronts, consigne comprise', () => {
    const seuilRegle = (fronts: number) => {
      for (let t = 0; t <= 100; t++) if (nbFronts(t) >= fronts) return t
      return -1
    }
    /** mission, nombre de fronts annoncé, assauts à tenir */
    const annonces: [string, number, number][] = [
      ['deux-fronts', 2, 4],
      ['trois-fronts', 3, 8],
    ]
    for (const [id, fronts, assauts] of annonces) {
      const m = MISSIONS_PAR_ID[id]
      // la consigne annonce une menace chiffrée : si l'équilibrage de nbFronts bouge,
      // la mission promet un assaut sur deux fronts qui n'arrive jamais
      expect(menaceExigee(m), id).toBe(seuilRegle(fronts))
      expect(m.desc, id).toContain(String(seuilRegle(fronts)))
      // et le nombre d'assauts à tenir, lui aussi écrit dans la consigne
      expect(repoussesExiges(m), id).toBe(assauts)
      expect(m.desc, id).toContain(String(assauts))
    }
    expect(rangMission('deux-fronts')).toBeLessThan(rangMission('trois-fronts'))
    expect(repoussesExiges(MISSIONS_PAR_ID['deux-fronts'])).toBeLessThan(
      repoussesExiges(MISSIONS_PAR_ID['trois-fronts']),
    )
  })

  it('mesure la ferveur au plus dévoué des Olympiens, et l’ambiance à l’arrondi', () => {
    /*
     * Trois missions de ferveur, trois seuils. Ce qui se casse sans bruit ici,
     * c'est la règle « au plus dévoué » : si la jauge se mettait à lire la
     * relation moyenne ou la plus basse, un joueur dévot d'Athéna mais haï
     * d'Arès verrait sa mission reculer sans comprendre.
     */
    const relationExigee = (m: MissionDef) => {
      for (let n = -100; n <= 100; n++) {
        const s = etatAcheve()
        s.gods = dieux(-100)
        s.gods[GOD_IDS[GOD_IDS.length - 1]] = { relation: n }
        if (fait(m, s)) return n
      }
      return 101
    }
    const seuils: [string, number][] = [
      ['devotion', 25],
      ['cheri-des-dieux', 40],
      ['elu-du-dieu', 70],
    ]
    for (const [id, seuil] of seuils) {
      const m = MISSIONS_PAR_ID[id]
      expect(relationExigee(m), id).toBe(seuil)
      // le chiffre est écrit dans la consigne : les deux doivent bouger ensemble
      expect(m.desc, id).toContain(String(seuil))
      // la relation plafonne à 100 dans le store : au-delà, la mission serait vaine
      expect(seuil, id).toBeLessThanOrEqual(100)
    }
    expect(seuils.map(([id]) => rangMission(id))).toEqual(
      [...seuils.map(([id]) => rangMission(id))].sort((a, b) => a - b),
    )
    // « Vin et musique » lit l'ambiance ARRONDIE : à 69,5 la fête est donnée,
    // sinon le joueur reste bloqué à 99 % avec une barre qui affiche 70
    expect(fait(MISSIONS_PAR_ID['ambiance-de-fete'], { ...etatAcheve(), morale: 69.5 })).toBe(true)
    expect(fait(MISSIONS_PAR_ID['ambiance-de-fete'], { ...etatAcheve(), morale: 69.4 })).toBe(false)
  })

  it('distingue le meilleur raid du cumul des étoiles de la campagne', () => {
    // six villages effleurés ne valent pas un village rasé : « Deux étoiles » et
    // « Trois étoiles » jugent le MEILLEUR raid, les missions de cumul l'ensemble.
    // Confondre les deux rendrait « Trois étoiles » gagnable sans jamais réussir
    // un seul assaut propre.
    const eparpille: EtatMissions = {
      ...etatAcheve(),
      expeditions: Object.fromEntries(VILLAGES_CIBLES.slice(0, 6).map((v) => [v.id, { etoiles: 1 }])),
    }
    expect(fait(MISSIONS_PAR_ID['premier-raid'], eparpille)).toBe(true)
    expect(fait(MISSIONS_PAR_ID['deux-etoiles'], eparpille)).toBe(false)
    expect(fait(MISSIONS_PAR_ID['trois-etoiles'], eparpille)).toBe(false)
    expect(fait(MISSIONS_PAR_ID['six-etoiles'], eparpille)).toBe(true)
    expect(fait(MISSIONS_PAR_ID['douze-etoiles'], eparpille)).toBe(false)
    const unSeulRaid: EtatMissions = {
      ...etatAcheve(),
      expeditions: { [VILLAGES_CIBLES[0].id]: { etoiles: 3 } },
    }
    expect(fait(MISSIONS_PAR_ID['trois-etoiles'], unSeulRaid)).toBe(true)
    expect(fait(MISSIONS_PAR_ID['six-etoiles'], unSeulRaid)).toBe(false)
    // et la Troade doit compter assez de villages pour que douze étoiles existent
    expect(VILLAGES_CIBLES.length * 3).toBeGreaterThanOrEqual(12)
  })

  it('ne réclame ni plus de tours ni plus de structure que l’enceinte n’en peut porter', () => {
    const missionRemparts: Record<number, string> = {
      1: 'premiers-remparts',
      2: 'muraille-de-pierre',
      3: 'remparts-crenelees',
      4: 'murs-de-poseidon',
    }
    const exigences = MISSIONS.map((m) => [m.id, toursExigees(m)] as const).filter(([, t]) => t > 0)
    expect(exigences).toEqual([
      ['premiere-tour', 1],
      ['deux-tours', 2],
      ['les-quatre-tours', 4],
    ])
    for (const [id, requises] of exigences) {
      expect(requises, id).toBeLessThanOrEqual(TOURS_MAX[4])
      // le niveau de remparts qui autorise ce nombre de tours doit déjà avoir été
      // demandé par le fil rouge, sinon la mission s'ouvre sur un mur incapable
      const niveauMur = TOURS_MAX.findIndex((max) => max >= requises)
      expect(rangMission(missionRemparts[niveauMur]), `${id} → remparts ${niveauMur}`).toBeLessThan(
        rangMission(id),
      )
    }
    // « Enceinte sans fissure » vise le dernier palier de structure, pas un autre :
    // un point de moins, ou une muraille de niveau 3 intacte, ne comptent pas
    const sansFissure = MISSIONS_PAR_ID['enceinte-restauree']
    const mur4: EtatMissions = { ...etatVide(), buildings: batiments(4) }
    expect(fait(sansFissure, { ...mur4, wallHp: WALL_HP[4] })).toBe(true)
    expect(fait(sansFissure, { ...mur4, wallHp: WALL_HP[4] - 1 })).toBe(false)
    const mur3 = etatVide()
    mur3.buildings.remparts.level = 3
    expect(fait(sansFissure, { ...mur3, wallHp: WALL_HP[3] })).toBe(false)
  })

  it('n’exige un bâtiment qu’à un niveau que l’Agora déjà réclamée autorise', () => {
    // élever un bâtiment au niveau N réclame une Agora de niveau N (`agoraOk` dans
    // PanneauBatiment) : c'est elle qui cadence tout le fil rouge
    const exigences: [string, BuildingId, number][] = []
    for (const m of MISSIONS) {
      for (const b of BUILDING_IDS) {
        const n = niveauExige(m, b)
        if (b !== 'agora' && n >= 2) exigences.push([m.id, b, n])
      }
    }
    /*
     * L'échelle d'Agora du fil rouge, sondée elle aussi : elle s'arrête au niveau 3
     * (« Prospérité », rang 30). Les trois missions listées ensuite supposent
     * pourtant des bâtiments de niveau 4 - donc une Agora 4 que le fil ne réclame
     * jamais et que le joueur doit deviner (défaut signalé au rapport). Les deux
     * listes sont arrêtées pour qu'une mission de niveau 4 ajoutée, ou glissée plus
     * tôt dans le fil, fasse rougir ce test au lieu de coincer le joueur.
     */
    expect(MISSIONS.map((m) => [m.id, niveauExige(m, 'agora')] as const).filter(([, n]) => n >= 2)).toEqual([
      ['grandir', 2],
      ['prosperite', 3],
      ['cite-de-legende', 3],
      ['palladion', 4],
    ])
    expect(agoraAcquise(rangMission('palladion'))).toBe(3)
    const auNiveau4 = exigences.filter(([, , n]) => n >= 4)
    expect([...new Set(auNiveau4.map(([id]) => id))]).toEqual([
      'murs-de-poseidon',
      'enceinte-restauree',
      'palladion',
    ])
    const verifiables = exigences.filter(([, , n]) => n < 4)
    expect([...new Set(verifiables.map(([id]) => id))]).toEqual([
      'un-toit-pour-tous',
      'muraille-de-pierre',
      'cour-d-armes',
      'remparts-crenelees',
      'temple-d-ares',
      'cite-de-legende',
    ])
    for (const [id, b, n] of verifiables) {
      expect(agoraAcquise(rangMission(id)), `${id} → ${b} ${n}`).toBeGreaterThanOrEqual(n)
    }
  })

  it('ne réclame ni soldats sans caserne ni habitants sans toit', () => {
    // une unité ne se forme qu'avec une caserne au niveau voulu, et la caserne ne
    // dépasse pas l'Agora : le fil doit avoir ouvert les deux avant de demander
    const parUnite: [string, UnitId, number][] = [
      ['trois-lances', 'lancier', 3],
      ['yeux-sur-les-murs', 'archer', 2],
      ['muraille-d-hoplites', 'hoplite', 2],
    ]
    for (const [id, u, effectif] of parUnite) {
      expect(uniteExigee(MISSIONS_PAR_ID[id], u), id).toBe(effectif)
      expect(rangMission('appel-aux-armes'), id).toBeLessThan(rangMission(id))
      expect(agoraAcquise(rangMission(id)), `${id} → caserne ${UNITS[u].caserne}`).toBeGreaterThanOrEqual(
        UNITS[u].caserne,
      )
    }
    // la population plafonne au niveau des maisons (POP_CAP) : un objectif de 30
    // habitants réclamé quand l'Agora n'autorise que des maisons de niveau 2
    // (plafond 22) serait une mission qu'aucune naissance ne peut achever
    const parPop = MISSIONS.map((m) => [m.id, popExigee(m)] as const).filter(([, n]) => n > 0)
    expect(parPop).toEqual([
      ['dix-habitants', 10],
      ['quinze-habitants', 15],
      ['trente-habitants', 30],
    ])
    for (const [id, habitants] of parPop) {
      const niveauMaisons = POP_CAP.findIndex((cap) => cap >= habitants)
      expect(niveauMaisons, `${id} → ${habitants} habitants`).toBeGreaterThanOrEqual(0)
      expect(agoraAcquise(rangMission(id)), `${id} → maisons ${niveauMaisons}`).toBeGreaterThanOrEqual(
        niveauMaisons,
      )
    }
  })

  it('ne réclame ni ne verse jamais plus que l’entrepôt du moment ne peut contenir', () => {
    const parStock = MISSIONS.map((m) => [m.id, stockExige(m)] as const).filter(([, n]) => n > 0)
    // liste arrêtée : un nouveau seuil de ressource doit passer par ce contrôle
    expect(parStock).toEqual([
      ['reserves-du-village', 400],
      ['tresor-de-bronze', 600],
    ])
    for (const [id, exige] of parStock) {
      // l'entrepôt écrête en silence : un objectif au-delà du plafond de l'Agora
      // acquise resterait à jamais hors de portée
      const niveauAgora = STOCKAGE.findIndex((cap) => cap >= exige)
      expect(niveauAgora, `${id} → ${exige}`).toBeGreaterThan(0)
      expect(agoraAcquise(rangMission(id)), `${id} → entrepôt ${exige}`).toBeGreaterThanOrEqual(niveauAgora)
    }
    // même garde côté récompense : `clampRes` écrête sans le dire, donc une prime
    // plus grosse que l'entrepôt du moment partirait en fumée à la réclamation
    for (const m of MISSIONS) {
      const capacite = STOCKAGE[agoraAcquise(rangMission(m.id))]
      for (const [r, n] of Object.entries(m.recompense.res ?? {}) as [ResourceId, number][]) {
        expect(n, `${m.id} → ${r}`).toBeLessThanOrEqual(capacite)
      }
    }
  })
})

describe('le fil rouge branché sur le store', () => {
  it('lit l’état réel du store, où une partie neuve ne fait que la mission d’ouverture', () => {
    const s = useGame.getState()
    // ce balayage est le contrat entre GameState et EtatMissions : un champ
    // renommé dans le store ferait tomber tout le suivi des missions ici
    for (const m of MISSIONS) {
      const p = m.progres(s)
      expect(p.cur, m.id).toBeGreaterThanOrEqual(0)
      expect(p.cur, m.id).toBeLessThanOrEqual(p.max)
      expect(p.max, m.id).toBe(MAX_REF[m.id])
    }
    expect(s.missionsReclamees).toEqual([])
    // une partie neuve ne saute aucune étape : rien d'autre n'est déjà gagné
    expect(MISSIONS.filter((m) => fait(m, s)).map((m) => m.id)).toEqual(['nouveau-depart'])
    expect(missionsActives(s.missionsReclamees).map((m) => m.id)).toEqual([
      'nouveau-depart',
      'le-pain-d-abord',
      'bras-aux-champs',
    ])
  })

  it('écrête la première récompense au petit entrepôt du départ : du bois part en fumée', () => {
    const avant = { ...useGame.getState().resources }
    // l'Agora d'une partie neuve tient 350 : c'est ce plafond qui écrête
    expect(useGame.getState().buildings.agora.level).toBe(1)
    useGame.getState().reclamerMission('nouveau-depart')
    const apres = useGame.getState().resources
    const promis = MISSIONS_PAR_ID['nouveau-depart'].recompense.res ?? {}
    expect(useGame.getState().missionsReclamees).toEqual(['nouveau-depart'])
    // le grain et la pierre passent entiers…
    expect(apres.grain).toBe(avant.grain + (promis.grain ?? 0))
    expect(apres.pierre).toBe(avant.pierre + (promis.pierre ?? 0))
    // …mais le bois promis dépasse la capacité de l'Agora de départ : le surplus
    // est perdu sans le moindre avertissement (comportement constaté, cf. rapport)
    expect(avant.bois + (promis.bois ?? 0)).toBeGreaterThan(STOCKAGE[1])
    expect(apres.bois).toBe(STOCKAGE[1])
    // la récompense laisse une trace : sans elle, le joueur voit ses stocks bouger
    // sans savoir pourquoi
    const s = useGame.getState()
    expect(s.reports[0].titre).toBe('Mission 1 - Un nouveau départ')
    expect(s.toasts.map((t) => t.msg)).toContain('Un nouveau départ : récompense reçue !')
  })

  it('ne paie ni deux fois, ni une mission verrouillée, ni une mission inachevée', () => {
    useGame.getState().reclamerMission('nouveau-depart')
    // cinq assauts repoussés : « Première victoire » (rang 10) est ACHEVÉE, mais
    // elle n'est pas encore ouverte - le fil rouge ne se saute pas
    useGame.setState({ stats: { repousses: 5, perdus: 0, evenements: 0 } })
    const apresUnePrime = { ...useGame.getState().resources }
    const refus = [
      // deux clics sur le même bouton, ou une sauvegarde rejouée : la prime est due une fois
      'nouveau-depart',
      // « Le pain d'abord » est ouverte mais la ferme n'est pas bâtie
      'le-pain-d-abord',
      // faite, mais hors des trois missions ouvertes
      'premiere-victoire',
      // le Palladion n'est ni fait ni ouvert
      'palladion',
      'mission-fantome',
    ]
    for (const id of refus) {
      useGame.getState().reclamerMission(id)
      expect(useGame.getState().missionsReclamees, id).toEqual(['nouveau-depart'])
      expect(useGame.getState().resources, id).toEqual(apresUnePrime)
    }
    expect(useGame.getState().reports.filter((r) => r.titre.startsWith('Mission '))).toHaveLength(1)
  })
})
