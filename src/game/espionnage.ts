import { CHAMPION_PAR_ID } from './champions'
import { ENEMIES, RES, SECTEURS, UNITS, nbFronts } from './data'
import { BUTIN_REPETE, VILLAGES_PAR_ID, garnisonEffective, type VillageCible } from './expeditions'
import type { MeteoId, SaisonId } from './saisons'
import type { HeroId, ResourceId, UnitId, WaveUnit } from './types'

/*
 * ═══════════════════════════ L'ESPIONNAGE ═══════════════════════════
 *
 * Le village savait déjà qu'un assaut venait - la fenêtre d'alerte le dit, et
 * Ulysse au conseil lisait les fronts visés. Mais qui n'a ni Ulysse ni Cassandre
 * ne voyait qu'une poussière à l'horizon, et devait fortifier au hasard.
 *
 * L'éclaireur est la réponse PAYANTE et RISQUÉE à cette question. Trois partis
 * pris, et tout le fichier en découle :
 *
 *  · le rapport est VRAI. On ne tire rien ici : on lit la vague déjà composée,
 *    la garnison réelle de la place forte, le nom du champion déjà désigné. Un
 *    éclaireur qui mentirait une fois ne serait plus jamais payé ;
 *  · quand l'information N'EXISTE PAS ENCORE - aucune colonne en marche, place
 *    forte inconnue - l'éclaireur le dit et l'on ne facture pas du vide : la
 *    mission revient `sansObjet`, le store rembourse et ne perd personne. C'est
 *    la seule façon honnête de vendre du renseignement ;
 *  · il part POUR DE BON. Un villageois envoyé est un bras de moins au village
 *    pendant toute la mission, et il peut ne pas revenir. On peut lui préférer
 *    un éclaireur de métier : il coûte du bronze, il risque moins, et sa perte
 *    ne coûte pas un habitant.
 *
 * Tout est PUR : le store appelle, l'état est à lui.
 */

// ── Ce qu'on va reconnaître ───────────────────────────────────────────────────

export type CibleEspion = 'vague' | 'place' | 'route'

export interface MissionEspion {
  id: string
  type: CibleEspion
  /** id du villageois parti - null = éclaireur de métier, payé en bronze */
  villageois: string | null
  /** son nom, gardé ici pour pouvoir l'annoncer même s'il ne rentre pas */
  nom: string
  /** place forte visée (type 'place' seulement) */
  villageId?: string
  partiA: number
  rentreA: number
  /**
   * Risque figé AU DÉPART, pas recalculé au retour : la brume peut se lever
   * pendant qu'il marche, mais c'est le ciel du départ qui l'a couvert. Le
   * joueur a vu ce chiffre avant d'envoyer un homme - on ne le change pas.
   */
  risque: number
  /** rempli au retour, par `resoudreEspion` */
  rapport?: string[]
  pris?: boolean
}

export interface CibleDef {
  type: CibleEspion
  nom: string
  emoji: string
  /** ce que la mission rapporte, dit avant de payer */
  quoi: string
  /** durée de la marche, aller et retour (ms) */
  duree: number
  /** risque de base, avant menace, ciel et avantages */
  base: number
  /** ce que l'ennemi apprend de nous s'il prend l'éclaireur (points de menace) */
  menacePrise: number
  /** prix d'un éclaireur de métier - gratuit si l'on envoie un villageois */
  cout: Partial<Record<ResourceId, number>>
}

export const CIBLES: Record<CibleEspion, CibleDef> = {
  vague: {
    type: 'vague',
    nom: 'Reconnaître la colonne',
    emoji: '👁️',
    quoi: 'Composition exacte, murs visés, et le nom du champion s’il en mène un.',
    duree: 45_000,
    base: 0.16,
    menacePrise: 6,
    cout: { bronze: 14 },
  },
  place: {
    type: 'place',
    nom: 'Reconnaître une place forte',
    emoji: '🗺️',
    quoi: 'Garnison réelle, hauteur du mur, butin à prendre, et si elle attend des renforts.',
    duree: 105_000,
    base: 0.24,
    menacePrise: 4,
    cout: { bronze: 22, grain: 20 },
  },
  route: {
    type: 'route',
    nom: 'Suivre la route',
    emoji: '🛤️',
    quoi: 'Dire si la côte et les cols sont tenus, ou si une caravane peut passer.',
    duree: 75_000,
    base: 0.11,
    menacePrise: 3,
    cout: { bronze: 10, grain: 15 },
  },
}

export const CIBLE_IDS = Object.keys(CIBLES) as CibleEspion[]

/** un éclaireur de métier sait se cacher : son risque est rabattu d'un cinquième */
export const RABAIS_PRO = 0.8

/** bornes du risque : jamais nul (on peut toujours être vu), jamais certain */
export const RISQUE_MIN = 0.03
export const RISQUE_MAX = 0.85

/** on ne garde en mémoire que les derniers rapports : le panneau doit rester lisible */
export const RAPPORTS_GARDES = 6

// ── L'état vu par les règles ──────────────────────────────────────────────────

/**
 * Ce que l'espionnage a besoin de savoir de la partie. On ne prend pas
 * `GameState` : les règles doivent être testables sans monter un store, et le
 * jour où un champ change de nom on ne touche qu'ici.
 */
export interface SnapEspion {
  now: number
  threat: number
  saison: SaisonId
  meteo: MeteoId
  /** la vague annoncée, telle qu'elle a été composée - source du rapport */
  incomingWave: WaveUnit[] | null
  /** fronts déjà tirés à l'alerte ; null = pas encore décidés */
  incomingFronts: string[] | null
  incomingChampion: HeroId | null
  nextAttackAt: number
  /** villageois sans emploi : les seuls qu'on puisse envoyer sans casser un poste */
  oisifs: { id: string; nom: string }[]
  /** héros vivants à votre service - Ulysse change tout */
  herosActifs: HeroId[]
  graces: string[]
  /** reliques exposées au temple ; le champ n'existe pas encore dans le store */
  reliques?: string[]
  /** pillages encaissés par chaque place forte : sa garnison s'en souvient */
  expeditions: Record<string, { pillages?: number }>
  relations: Record<string, number>
  alliances: Record<string, unknown>
  /** éclaireurs déjà dehors : une seule mission de chaque sorte à la fois */
  espions: MissionEspion[]
  resources: Record<ResourceId, number>
}

const SNAP_VIDE: SnapEspion = {
  now: 0,
  threat: 20,
  saison: 'printemps',
  meteo: 'clair',
  incomingWave: null,
  incomingFronts: null,
  incomingChampion: null,
  nextAttackAt: 0,
  oisifs: [],
  herosActifs: [],
  graces: [],
  expeditions: {},
  relations: {},
  alliances: {},
  espions: [],
  resources: { bois: 0, pierre: 0, grain: 0, bronze: 0 },
}

/** complète un état partiel - le store en passe un vrai, les tests trois champs */
export function snapEspion(p: Partial<SnapEspion>): SnapEspion {
  return { ...SNAP_VIDE, ...p }
}

// ── Le risque ─────────────────────────────────────────────────────────────────

/**
 * Ce que le ciel fait à un homme qui rampe : la brume et la neige le couvrent,
 * un plein soleil de canicule le découpe sur la crête. C'est le levier que le
 * joueur peut vraiment jouer - attendre le mauvais temps pour partir.
 */
const CIEL_SAISON: Record<SaisonId, number> = { printemps: 1, ete: 1.12, automne: 0.92, hiver: 0.8 }
const CIEL_METEO: Record<MeteoId, number> = {
  clair: 1.15,
  pluie: 0.85,
  brume: 0.62,
  orage: 0.9,
  canicule: 1.4,
  neige: 0.7,
}

export function modificateurCiel(saison: SaisonId, meteo: MeteoId): number {
  return CIEL_SAISON[saison] * CIEL_METEO[meteo]
}

/** un avantage nommé, pour que le panneau puisse dire POURQUOI le risque baisse */
export interface AvantageEspion {
  nom: string
  /** multiplicateur appliqué au risque */
  mult: number
}

/**
 * Ce qui protège l'éclaireur. Ulysse d'abord - c'est lui qui l'a briefé, et
 * l'homme aux mille ruses ne renvoie pas les siens dans un piège. « Prudence »
 * d'Athéna ramène les hommes plutôt que de les abandonner, et le Mors de
 * Xanthos donne une monture qui distance la poursuite.
 */
export function avantagesEspion(snap: SnapEspion): AvantageEspion[] {
  const out: AvantageEspion[] = []
  if (snap.herosActifs.includes('ulysse')) out.push({ nom: 'Ulysse instruit l’éclaireur', mult: 0.55 })
  if (snap.graces.includes('athena-2')) out.push({ nom: 'Prudence d’Athéna', mult: 0.85 })
  if ((snap.reliques ?? []).includes('mors-xanthos')) out.push({ nom: 'Mors de Xanthos', mult: 0.9 })
  return out
}

/** pillages encaissés par une place forte - 0 si on n'y est jamais allé */
function pillagesDe(snap: SnapEspion, villageId: string): number {
  return snap.expeditions[villageId]?.pillages ?? 0
}

/**
 * Risque d'être pris, borné, jamais nul ni certain. C'est le chiffre qu'on
 * affiche AVANT de payer : il ne doit dépendre que de choses que le joueur peut
 * voir (la menace, le ciel, ses héros), sinon la décision est un pari aveugle.
 *
 * `villageId` n'a de sens que pour une reconnaissance de place forte : une place
 * qu'on a déjà pillée dort les armes à la main.
 */
export function risquePris(mission: CibleEspion, snap: SnapEspion, villageId?: string): number {
  const def = CIBLES[mission]
  let r = def.base + (Math.max(0, Math.min(100, snap.threat)) / 100) * 0.18
  if (mission === 'place' && villageId) r += Math.min(3, pillagesDe(snap, villageId)) * 0.03
  // la mer fermée jette les caravanes sur les cols, où l'on croise du monde
  if (mission === 'route' && snap.saison === 'hiver') r += 0.06
  r *= modificateurCiel(snap.saison, snap.meteo)
  for (const a of avantagesEspion(snap)) r *= a.mult
  return Math.max(RISQUE_MIN, Math.min(RISQUE_MAX, r))
}

export function dureeMission(mission: CibleEspion): number {
  return CIBLES[mission].duree
}

// ── Ce qu'on peut envoyer, et quand ───────────────────────────────────────────

export interface OffreEspion {
  type: CibleEspion
  nom: string
  emoji: string
  quoi: string
  duree: number
  /** risque pour un villageois ; l'éclaireur de métier prend `RABAIS_PRO` de moins */
  risque: number
  risquePro: number
  cout: Partial<Record<ResourceId, number>>
  /** false = la mission n'a pas d'objet, ou personne à envoyer */
  dispo: boolean
  /** dit au joueur pourquoi elle est grisée, plutôt que de la cacher */
  pourquoiPas?: string
}

/**
 * Les trois missions, avec ce qui les rend possibles ou non. La règle qui compte :
 * une mission SANS OBJET n'est pas proposée. Reconnaître une colonne qui n'est
 * pas encore en marche, c'est vendre du vide - et le jeu ne vend pas du vide.
 */
export function missionsEspion(snap: SnapEspion): OffreEspion[] {
  const dehors = new Set(snap.espions.filter((m) => m.rapport === undefined).map((m) => m.type))
  return CIBLE_IDS.map((t) => {
    const def = CIBLES[t]
    const risque = risquePris(t, snap)
    let pourquoiPas: string | undefined
    if (dehors.has(t)) pourquoiPas = 'Un éclaireur est déjà parti pour cette mission.'
    else if (t === 'vague' && !snap.incomingWave) pourquoiPas = 'Aucune colonne en marche : il n’y a rien à reconnaître.'
    else if (t === 'vague' && snap.nextAttackAt > 0 && snap.now + def.duree > snap.nextAttackAt)
      pourquoiPas = 'L’assaut tombera avant son retour : trop tard pour un éclaireur.'
    else if (snap.oisifs.length === 0 && !peutPayerEclaireur(t, snap))
      pourquoiPas = 'Aucun bras libre, et pas de quoi payer un éclaireur de métier.'
    return {
      type: t,
      nom: def.nom,
      emoji: def.emoji,
      quoi: def.quoi,
      duree: def.duree,
      risque,
      risquePro: Math.max(RISQUE_MIN, risque * RABAIS_PRO),
      cout: def.cout,
      dispo: pourquoiPas === undefined,
      pourquoiPas,
    }
  })
}

export function peutPayerEclaireur(mission: CibleEspion, snap: SnapEspion): boolean {
  return Object.entries(CIBLES[mission].cout).every(
    ([r, n]) => (snap.resources[r as ResourceId] ?? 0) >= (n ?? 0),
  )
}

/**
 * Fabrique la mission : c'est ici que le risque se fige et que l'heure du retour
 * se fixe, pour que le store n'ait plus qu'à pousser l'objet dans sa liste.
 */
export function preparerMission(
  mission: CibleEspion,
  snap: SnapEspion,
  choix: { id: string; villageois: string | null; nom: string; villageId?: string },
): MissionEspion {
  const brut = risquePris(mission, snap, choix.villageId)
  const risque = choix.villageois === null ? Math.max(RISQUE_MIN, brut * RABAIS_PRO) : brut
  return {
    id: choix.id,
    type: mission,
    villageois: choix.villageois,
    nom: choix.nom,
    villageId: choix.villageId,
    partiA: snap.now,
    rentreA: snap.now + dureeMission(mission),
    risque: Math.min(RISQUE_MAX, risque),
  }
}

/** missions dont l'heure du retour est passée et qui n'ont pas encore leur rapport */
export function missionsRentrees(espions: MissionEspion[], now: number): MissionEspion[] {
  return espions.filter((m) => m.rapport === undefined && now >= m.rentreA)
}

// ── Le rapport ────────────────────────────────────────────────────────────────

export interface IssueEspion {
  pris: boolean
  rapport: string[]
  /** l'ennemi sait qu'on l'observe : la menace monte */
  menacePlus?: number
  /**
   * L'information n'existait pas : l'éclaireur revient les mains vides et le
   * store REMBOURSE. On ne facture pas du vide, et l'on ne perd pas un homme
   * pour du vide - `pris` est faux dans ce cas, toujours.
   */
  sansObjet?: boolean
}

function nomsSecteurs(ids: string[]): string {
  const noms = ids.map((id) => SECTEURS.find((sx) => sx.id === id)?.nom).filter((n): n is string => !!n)
  if (noms.length === 0) return ''
  if (noms.length === 1) return noms[0]
  return `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`
}

function minutes(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000))
  if (m <= 0) return 'd’un instant à l’autre'
  return m === 1 ? 'dans une minute environ' : `dans ${m} minutes environ`
}

/** composition d'une vague, arme par arme - c'est le cœur du renseignement */
function detailVague(wave: WaveUnit[]): string {
  const parts = wave
    .filter((u) => u.count > 0)
    .map((u) => {
      const e = ENEMIES[u.enemy as keyof typeof ENEMIES]
      return e ? `${u.count} ${u.count > 1 ? e.pluriel : e.nom.toLowerCase()}` : `${u.count} ${u.enemy}`
    })
  return parts.length ? parts.join(', ') : 'personne'
}

function rapportVague(snap: SnapEspion): string[] {
  const out: string[] = []
  out.push(`Il a compté la colonne d’une crête : ${detailVague(snap.incomingWave ?? [])}.`)
  const fronts = snap.incomingFronts ?? []
  if (fronts.length > 0) {
    out.push(
      fronts.length === 1
        ? `Un seul front : ${nomsSecteurs(fronts)}. Tout le reste du mur peut être dégarni.`
        : `${fronts.length} fronts : ${nomsSecteurs(fronts)}.`,
    )
  } else {
    // les fronts n'ont pas encore été tirés : on ne devine pas, on dit la vérité
    const n = nbFronts(snap.threat)
    out.push(
      `Les colonnes ne se sont pas encore séparées. À cette menace, il en attend ${n === 1 ? 'une seule' : n === 2 ? 'deux' : 'trois'} - il n’a pas pu dire quels murs.`,
    )
  }
  const champ = snap.incomingChampion ? CHAMPION_PAR_ID[snap.incomingChampion] : undefined
  if (champ) {
    out.push(`Un nom mène l’assaut : ${champ.titre}.`)
    out.push(`Sa manœuvre : ${champ.capacite.nom} - ${champ.capacite.desc} Abattez-le et elle meurt avec lui.`)
  } else {
    out.push('Aucun nom en tête de colonne : ce sont des capitaines sans gloire.')
  }
  if (snap.nextAttackAt > snap.now) out.push(`Ils seront sous vos murs ${minutes(snap.nextAttackAt - snap.now)}.`)
  return out
}

/**
 * Une place forte attend-elle des renforts ? Deux signes concordants, tous deux
 * vrais dans l'état : elle vous hait assez pour avoir appelé ses voisins, ou
 * vous l'avez déjà pillée deux fois et elle a compris la leçon.
 */
export function attendDesRenforts(snap: SnapEspion, villageId: string): boolean {
  return (snap.relations[villageId] ?? 0) <= -40 || pillagesDe(snap, villageId) >= 2
}

function detailGarnison(g: Record<UnitId, number>): string {
  const parts = (Object.keys(g) as UnitId[])
    .filter((u) => g[u] > 0)
    .map((u) => `${g[u]} ${UNITS[u].nom.toLowerCase()}${g[u] > 1 ? 's' : ''}`)
  return parts.length ? parts.join(', ') : 'pas un homme en armes'
}

function detailButin(v: VillageCible, pillages: number): string {
  const part = pillages > 0 ? BUTIN_REPETE : 1
  const parts = (Object.entries(v.butin) as [ResourceId, number][])
    .filter(([, n]) => n > 0)
    .map(([r, n]) => `${Math.round(n * part)} ${RES[r].emoji}`)
  return parts.join(', ')
}

function rapportPlace(snap: SnapEspion, villageId: string): string[] {
  const v = VILLAGES_PAR_ID[villageId]
  const pillages = pillagesDe(snap, villageId)
  const g = garnisonEffective(v, pillages)
  const out: string[] = []
  out.push(`${v.nom} : ${detailGarnison(g)} derrière ${v.mur > 0 ? `un mur de niveau ${v.mur}` : 'aucun mur'}.`)
  if (pillages > 0) {
    out.push(
      `Vous l’avez déjà saignée ${pillages === 1 ? 'une fois' : `${pillages} fois`} : sa garnison a été relevée d’autant, et il ne reste que ${Math.round(BUTIN_REPETE * 100)} % du butin.`,
    )
  }
  const butin = detailButin(v, pillages)
  if (butin) out.push(`Ce qu’il y a à prendre : ${butin}.`)
  out.push(
    attendDesRenforts(snap, villageId)
      ? 'Elle attend des renforts : des cavaliers vont et viennent vers la côte. Frappez maintenant ou plus jamais.'
      : 'Personne ne vient à son secours : elle est seule.',
  )
  return out
}

/**
 * La route. Il n'y a pas encore de commerce dans le jeu - pas de caravanes à
 * escorter, donc pas de cargaison à chiffrer. L'éclaireur dit donc ce qu'il
 * peut honnêtement dire : qui tient les chemins, et si la mer est praticable.
 * LE JOUR OÙ `commerce.ts` EXISTERA, c'est ici qu'on branchera le détail de la
 * caravane (valeur, escorte, retard) - le reste du rapport tiendra tel quel.
 */
function rapportRoute(snap: SnapEspion): string[] {
  const hostiles = Object.entries(snap.relations)
    .filter(([id, r]) => r <= -25 && !(id in snap.alliances))
    .map(([id]) => VILLAGES_PAR_ID[id]?.nom)
    .filter((n): n is string => !!n)
  const amis = Object.keys(snap.alliances)
    .map((id) => VILLAGES_PAR_ID[id]?.nom)
    .filter((n): n is string => !!n)
  const out: string[] = []
  if (hostiles.length === 0) out.push('Les chemins sont libres : il n’a croisé ni guet ni bande armée.')
  else
    out.push(
      `Les chemins sont tenus par ${hostiles.length === 1 ? hostiles[0] : `${hostiles.slice(0, -1).join(', ')} et ${hostiles[hostiles.length - 1]}`} : une caravane sans escorte n’y passera pas.`,
    )
  if (amis.length > 0) out.push(`Vos alliés vous ouvrent leurs gués : ${amis.join(', ')}.`)
  if (snap.saison === 'hiver') out.push('La mer est fermée : tout doit passer par les cols, et les cols sont surveillés.')
  else if (snap.meteo === 'orage') out.push('L’orage a coupé le gué du Scamandre : deux jours de détour au moins.')
  if (snap.threat >= 55)
    out.push('Le camp achéen pousse des patrouilles loin dans l’arrière-pays : rien ne circule sans être vu.')
  return out
}

/**
 * Résout une mission rentrée. `roll` est un tirage 0..1 que le store fournit -
 * la fonction reste ainsi pure et rejouable dans les tests.
 */
export function resoudreEspion(mission: MissionEspion, snap: SnapEspion, roll: number): IssueEspion {
  const def = CIBLES[mission.type]

  // ── D'abord : y avait-il quelque chose à voir ? ─────────────────────────────
  if (mission.type === 'vague' && !snap.incomingWave) {
    return {
      pris: false,
      rapport: [
        `${mission.nom} est rentré sans avoir rien vu : aucune colonne n’était en marche.`,
        'On ne facture pas du vide - la mise vous est rendue.',
      ],
      sansObjet: true,
    }
  }
  if (mission.type === 'place') {
    const id = mission.villageId
    if (!id || !VILLAGES_PAR_ID[id]) {
      return {
        pris: false,
        rapport: [`${mission.nom} n’a pas trouvé la place qu’on lui avait décrite. Personne ne la connaît.`],
        sansObjet: true,
      }
    }
    if (id in snap.alliances) {
      return {
        pris: false,
        rapport: [
          `${VILLAGES_PAR_ID[id].nom} vous a ouvert ses portes : ${mission.nom} y est entré par la grande rue.`,
          'On n’espionne pas un allié - la mise vous est rendue.',
        ],
        sansObjet: true,
      }
    }
  }

  // ── Ensuite : l'a-t-on pris ? ──────────────────────────────────────────────
  if (roll < mission.risque) {
    return {
      pris: true,
      rapport: [
        `${mission.nom} n’est pas rentré. On a retrouvé sa besace au pied d’un talus.`,
        'L’ennemi sait maintenant qu’on l’observe : il resserre ses guets.',
      ],
      menacePlus: def.menacePrise,
    }
  }

  // ── Enfin : le rapport, qui ne dit que du vrai ─────────────────────────────
  const rapport =
    mission.type === 'vague'
      ? rapportVague(snap)
      : mission.type === 'place'
        ? rapportPlace(snap, mission.villageId as string)
        : rapportRoute(snap)
  return { pris: false, rapport: [`${mission.nom} est rentré à la nuit.`, ...rapport] }
}

/** rangée d'un compte à rebours, pour le panneau */
export function resteMission(mission: MissionEspion, now: number): number {
  return Math.max(0, mission.rentreA - now)
}
