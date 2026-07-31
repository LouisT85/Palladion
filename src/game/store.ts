import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  ALERTE_LONGUE_MS,
  ALERTE_MS,
  ANCIEN_STORAGE_KEY,
  ASSAUT_MAX_MS,
  ASSAUT_MIN_MS,
  BASE_PROD,
  BUILDINGS,
  BUILDING_IDS,
  CONSO_POP,
  CONSO_SOLDAT,
  DAY_MS,
  ENEMIES,
  FAVEUR_MAX,
  GODS,
  GOD_IDS,
  METIERS,
  MODE_TEST,
  NOMS_VILLAGEOIS,
  OFFLINE_CAP_MS,
  POP_CAP,
  POSTES,
  PREMIER_ASSAUT_MS,
  PROD,
  RES,
  SECTEURS,
  multRelation,
  nbFronts,
  STOCKAGE,
  STORAGE_KEY,
  TAUX_PORT,
  TOURS_MAX,
  TOUR_COUTS,
  UNITS,
  UNIT_IDS,
  WALL_HP,
} from './data'
import {
  GEO_EXPEDITION,
  GEO_VILLAGE,
  budgetVague,
  creerBataille,
  descVague,
  foudreDeZeus,
  genererVague,
  pertesDefense,
  resoudreHorsLigne,
  sonnerRetraite,
  tailleVague,
  tickBataille,
  uid,
} from './combat'
import { EVENTS, EVENTS_BY_ID, type EffectCtx, type GameSnap } from './events'
import {
  BUTIN_REPETE,
  EXPEDITION_TIMEOUT_MS,
  MAX_TROUPES,
  RAID_COOLDOWN_MS,
  VILLAGES_PAR_ID,
  type VillageCible,
} from './expeditions'
import { MISSIONS_PAR_ID, missionsActives } from './missions'
import type {
  ActiveEvent,
  BattleState,
  BuildingId,
  BuildingState,
  EnemyId,
  EtatExpedition,
  GodId,
  GodState,
  MoraleModifier,
  PendingEffect,
  RecruitJob,
  Report,
  ResourceId,
  Toast,
  UnitId,
  Villageois,
  WaveUnit,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
export interface RecompenseDef {
  bronze: number
  faveur: number
  /** +25 % si l'assaut a été déclenché volontairement */
  bonus: boolean
}

export interface ExpeditionEnCours {
  villageId: string
  envoyes: Record<UnitId, number>
  wallHp: number
  battle: BattleState
  result: { victoire: boolean; etoiles: number; lignes: string[] } | null
}

export interface GameState {
  // persistant
  createdAt: number
  lastSeen: number
  resources: Record<ResourceId, number>
  faveur: number
  pop: number
  nextPopAt: number
  buildings: Record<BuildingId, BuildingState>
  /** les habitants, nommés et affectables à un métier */
  villageois: Villageois[]
  wallHp: number
  /** tours d'archers bâties sur l'enceinte */
  tours: number
  army: Record<UnitId, number>
  recruitQueue: RecruitJob[]
  moraleMods: MoraleModifier[]
  morale: number
  gods: Record<GodId, GodState>
  threatMod: number
  threat: number
  nextAttackAt: number
  warned: boolean
  incomingWave: WaveUnit[] | null
  defRecompense: RecompenseDef | null
  eventCooldowns: Record<string, number>
  lastEventAt: number
  activeEvent: ActiveEvent | null
  eventOutcome: string[] | null
  pendingEffects: PendingEffect[]
  reports: Report[]
  stats: { repousses: number; perdus: number; evenements: number }
  expeditions: Record<string, EtatExpedition>
  tutorialDone: boolean
  droughtUntil: number
  aresBoostUntil: number
  nextDesertAt: number
  /** vitesse du jeu façon Sims (1/2/4/8) — forcée à ×1 pendant les batailles */
  vitesse: number
  /** missions dont la récompense a été réclamée */
  missionsReclamees: string[]

  // runtime (non sauvegardé)
  /** missions déjà signalées « prêtes » (toast unique) */
  missionsNotifiees: string[]
  battle: BattleState | null
  expedition: ExpeditionEnCours | null
  battleReport: Report | null
  offlineSummary: string[] | null
  toasts: Toast[]
  selected: BuildingId | null
  panel: 'pantheon' | 'journal' | 'aide' | 'expeditions' | null

  // actions
  init: () => void
  tick: () => void
  upgrade: (b: BuildingId) => void
  recruter: (u: UnitId, n: number) => void
  reparerRemparts: () => void
  construireTour: () => void
  affecter: (villageoisId: string, poste: BuildingId | null) => void
  /** pourvoit d'un coup tous les postes libres avec les villageois oisifs */
  affecterAuto: () => void
  echanger: (donner: ResourceId, recevoir: ResourceId) => void
  sacrifier: (g: GodId) => void
  benir: (g: GodId) => void
  choisirEvenement: (i: number) => void
  fermerEvenement: () => void
  lancerMaintenant: () => void
  lancerExpedition: (villageId: string, troupes: Record<UnitId, number>) => void
  retraiteExpedition: () => void
  fermerExpedition: () => void
  attaqueTest: () => void
  setVitesse: (v: number) => void
  reclamerMission: (id: string) => void
  select: (b: BuildingId | null) => void
  openPanel: (p: GameState['panel']) => void
  fermerOffline: () => void
  fermerBattleReport: () => void
  save: () => void
  reset: () => void
}

// ── Helpers purs (exportés pour l'UI) ────────────────────────────────────────
export function stockageMax(s: Pick<GameState, 'buildings'>): number {
  return STOCKAGE[s.buildings.agora.level] ?? STOCKAGE[1]
}
export function popCap(s: Pick<GameState, 'buildings'>): number {
  return POP_CAP[s.buildings.maisons.level]
}
export function armeeTotale(army: Record<UnitId, number>): number {
  return UNIT_IDS.reduce((a, u) => a + army[u], 0)
}
export function multMorale(morale: number): number {
  return 0.5 + (morale / 100) * 0.75
}

// ── Postes de travail ────────────────────────────────────────────────────────
/** nombre de postes offerts par un bâtiment à son niveau actuel */
export function postesTotal(s: Pick<GameState, 'buildings'>, b: BuildingId): number {
  return POSTES[b]?.[s.buildings[b].level] ?? 0
}
/** villageois actuellement au travail dans ce bâtiment */
export function postesPourvus(s: Pick<GameState, 'villageois'>, b: BuildingId): number {
  return s.villageois.filter((v) => v.poste === b).length
}
/** rendement d'un bâtiment : la part de ses postes réellement tenue (0…1) */
export function rendement(s: Pick<GameState, 'buildings' | 'villageois'>, b: BuildingId): number {
  const total = postesTotal(s, b)
  if (total <= 0) return 0
  return Math.min(1, postesPourvus(s, b) / total)
}
/** villageois sans emploi — ceux qu'on peut enrôler ou affecter */
export function oisifs(s: Pick<GameState, 'villageois'>): Villageois[] {
  return s.villageois.filter((v) => v.poste === null)
}
/** bâtiments qui offrent des postes (dans l'ordre de la carte) */
export const BATIMENTS_A_POSTES = BUILDING_IDS.filter((b) => POSTES[b] !== undefined)

/** métier d'un villageois, pour l'affichage */
export function metierDe(v: Villageois): string {
  return v.poste ? (METIERS[v.poste] ?? BUILDINGS[v.poste].nom) : 'Sans emploi'
}

/**
 * Réaligne la liste des villageois sur `pop` (source de vérité numérique
 * utilisée par les événements, les missions et le recrutement).
 * Idempotent : appelé à chaque tick, il ne fait rien si tout concorde.
 */
function syncVillageois(s: GameState): void {
  while (s.villageois.length < s.pop) {
    const utilises = new Set(s.villageois.map((v) => v.nom))
    const libres = NOMS_VILLAGEOIS.filter((n) => !utilises.has(n))
    const nom = libres.length > 0 ? libres[Math.floor(Math.random() * libres.length)] : `Habitant ${s.villageois.length + 1}`
    s.villageois.push({ id: uid('v'), nom, poste: null })
  }
  while (s.villageois.length > s.pop) {
    // on retire d'abord les oisifs : un artisan ne disparaît qu'en dernier
    const i = s.villageois.findIndex((v) => v.poste === null)
    s.villageois.splice(i >= 0 ? i : s.villageois.length - 1, 1)
  }
  // un poste supprimé par une rétrogradation libère son occupant
  for (const v of s.villageois) {
    if (v.poste && postesPourvus(s, v.poste) > postesTotal(s, v.poste)) {
      const trop = postesPourvus(s, v.poste) - postesTotal(s, v.poste)
      if (trop > 0) v.poste = null
    }
  }
}
/** production nette par minute pour l'affichage (hors conso) */
export function tauxParMinute(s: GameState): Record<ResourceId, number> {
  const m = multMorale(s.morale)
  const drought = Date.now() < s.droughtUntil ? 0.5 : 1
  const r = (b: BuildingId) => rendement(s, b)
  return {
    bois: (BASE_PROD.bois + PROD.scierie[s.buildings.scierie.level] * r('scierie')) * m,
    pierre: (BASE_PROD.pierre + PROD.carriere[s.buildings.carriere.level] * r('carriere')) * m,
    grain:
      (BASE_PROD.grain + PROD.ferme[s.buildings.ferme.level] * r('ferme') * drought) * m -
      s.pop * CONSO_POP -
      armeeTotale(s.army) * CONSO_SOLDAT,
    bronze:
      (BASE_PROD.bronze +
        PROD.forge[s.buildings.forge.level] * r('forge') +
        PROD.port[s.buildings.port.level] * r('port')) *
      m,
  }
}
export function coutBenediction(s: Pick<GameState, 'buildings'>, g: GodId): number {
  const base = GODS[g].benediction.cout
  return s.buildings.temple.level >= 4 ? Math.round(base * 0.75) : base
}
/**
 * Ferveur : puissance des bénédictions du dieu, de ×0.4 (maudit) à ×1.6 (élu).
 * La jauge de relation devient ainsi le vrai levier du panthéon.
 */
export function ferveur(s: Pick<GameState, 'gods'>, g: GodId): number {
  return multRelation(s.gods[g].relation)
}
export function fmtDuree(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(s / 60)
  return m > 0 ? `${m} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`
}
export function etoilesPour(mortsTotal: number, envoyesTotal: number): number {
  const ratio = envoyesTotal > 0 ? mortsTotal / envoyesTotal : 1
  return ratio < 0.2 ? 3 : ratio < 0.5 ? 2 : 1
}

function calcMorale(s: GameState, now: number): number {
  let m = 50 + s.buildings.agora.level * 2 + s.buildings.temple.level
  for (const mod of s.moraleMods) if (mod.expiresAt === null || mod.expiresAt > now) m += mod.delta
  if (s.resources.grain <= 0) m -= 20 // famine
  return Math.max(0, Math.min(100, m))
}

function calcThreat(s: GameState, now: number): number {
  const niveaux = BUILDING_IDS.reduce((a, b) => a + s.buildings[b].level, 0)
  const minutes = (now - s.createdAt) / 60_000
  // chaque tour d'archers attire la convoitise : les vagues grossissent en face
  return Math.max(5, Math.min(100, 8 + niveaux * 1.2 + s.tours * 4 + minutes * 0.15 + s.threatMod))
}

function clampRes(s: GameState, _res: ResourceId, val: number): number {
  return Math.max(0, Math.min(stockageMax(s), val))
}

function payer(s: GameState, cout: Partial<Record<ResourceId, number>>): boolean {
  if (MODE_TEST) return true
  for (const [r, n] of Object.entries(cout) as [ResourceId, number][]) {
    if (s.resources[r] < n) return false
  }
  for (const [r, n] of Object.entries(cout) as [ResourceId, number][]) s.resources[r] -= n
  return true
}
export function peutPayer(
  resources: Record<ResourceId, number>,
  cout: Partial<Record<ResourceId, number>>,
): boolean {
  if (MODE_TEST) return true
  return (Object.entries(cout) as [ResourceId, number][]).every(([r, n]) => resources[r] >= n)
}

function pushToast(s: GameState, emoji: string, msg: string): void {
  s.toasts.push({ id: uid('t'), emoji, msg, until: Date.now() + 6000 })
  if (s.toasts.length > 5) s.toasts.shift()
}

function pushReport(s: GameState, emoji: string, titre: string, lignes: string[]): Report {
  const r: Report = { id: uid('r'), at: Date.now(), emoji, titre, lignes }
  s.reports.unshift(r)
  if (s.reports.length > 30) s.reports.pop()
  return r
}

function retirerSoldats(s: GameState, n: number): number {
  let retire = 0
  for (let i = 0; i < n; i++) {
    const pool = UNIT_IDS.filter((u) => s.army[u] > 0)
    if (pool.length === 0) break
    const u = pool[Math.floor(Math.random() * pool.length)]
    s.army[u]--
    retire++
  }
  return retire
}

function volerPct(s: GameState, p: number, quoi?: ResourceId[]): string {
  const cibles = quoi ?? (Object.keys(RES) as ResourceId[])
  const parts: string[] = []
  for (const r of cibles) {
    const perdu = Math.floor(s.resources[r] * p)
    if (perdu > 0) {
      s.resources[r] -= perdu
      parts.push(`${perdu} ${RES[r].emoji}`)
    }
  }
  return parts.length ? parts.join(', ') : 'presque rien'
}

/**
 * Tire les fronts d'une vague : la porte de l'est est toujours visée
 * (c'est la voie royale), les autres secteurs s'ajoutent avec la menace.
 * Chaque assaut est ainsi différent — impossible de fortifier un seul côté.
 */
function choisirFronts(threat: number): typeof SECTEURS {
  const n = Math.min(nbFronts(threat), SECTEURS.length)
  const autres = SECTEURS.slice(1)
  // mélange déterministe-au-tirage des flancs
  for (let i = autres.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[autres[i], autres[j]] = [autres[j], autres[i]]
  }
  return [SECTEURS[0], ...autres.slice(0, n - 1)]
}

/** prépare l'alerte : vague révélée + récompense de défense calculée */
function armerAlerte(s: GameState): void {
  if (!s.incomingWave) s.incomingWave = genererVague(s.threat)
  if (!s.defRecompense) {
    const puissance = budgetVague(s.incomingWave)
    s.defRecompense = { bronze: Math.round(12 + puissance * 0.4), faveur: 8, bonus: false }
  }
  s.warned = true
}

function snap(s: GameState): GameSnap {
  return s
}

function makeCtx(s: GameState, now: number): EffectCtx {
  return {
    add: (r, n) => {
      s.resources[r] = clampRes(s, r, s.resources[r] + n)
    },
    faveur: (n) => {
      s.faveur = Math.max(0, Math.min(FAVEUR_MAX, s.faveur + n))
    },
    pop: (n) => {
      s.pop = Math.max(0, s.pop + n)
    },
    units: (u, n) => {
      s.army[u] = Math.max(0, s.army[u] + n)
    },
    relation: (g, n) => {
      s.gods[g].relation = Math.max(-100, Math.min(100, s.gods[g].relation + n))
    },
    morale: (delta, label, durMs) => {
      s.moraleMods.push({ id: uid('m'), label, delta, expiresAt: durMs ? now + durMs : null })
    },
    schedule: (type, inMs, payload) => {
      s.pendingEffects.push({ at: now + inMs, type, payload })
    },
    revealAttack: () => {
      armerAlerte(s)
    },
    stealPct: (p, quoi) => volerPct(s, p, quoi),
    damageWallPct: (p) => {
      s.wallHp = Math.max(0, Math.round(s.wallHp * (1 - p)))
    },
    loseSoldiers: (n) => retirerSoldats(s, n),
    droughtFor: (ms) => {
      s.droughtUntil = now + ms
    },
  }
}

// ── État initial ──────────────────────────────────────────────────────────────
function etatInitial(now: number): Omit<GameState, keyof ActionsOnly> {
  const buildings = {} as Record<BuildingId, BuildingState>
  for (const b of BUILDING_IDS) buildings[b] = { level: b === 'agora' ? 1 : 0 }
  return {
    // décalé d'un dixième de journée : la partie commence au matin, pas en pleine nuit
    createdAt: now - DAY_MS * 0.1,
    lastSeen: now,
    resources: { bois: 220, pierre: 150, grain: 220, bronze: 20 },
    faveur: 10,
    // sept bras au départ : de quoi tenir les premiers postes ET enrôler
    pop: 7,
    nextPopAt: now + 45_000,
    buildings,
    villageois: [],
    wallHp: 0,
    tours: 0,
    army: { lancier: 0, archer: 0, hoplite: 0 },
    recruitQueue: [],
    moraleMods: [],
    morale: 52,
    gods: Object.fromEntries(GOD_IDS.map((g) => [g, { relation: 0, cooldownUntil: 0 } as GodState])) as Record<
      GodId,
      GodState
    >,
    threatMod: 0,
    threat: 10,
    nextAttackAt: now + PREMIER_ASSAUT_MS,
    warned: false,
    incomingWave: null,
    defRecompense: null,
    eventCooldowns: {},
    lastEventAt: now,
    activeEvent: null,
    eventOutcome: null,
    pendingEffects: [],
    reports: [],
    stats: { repousses: 0, perdus: 0, evenements: 0 },
    expeditions: {},
    tutorialDone: false,
    droughtUntil: 0,
    aresBoostUntil: 0,
    nextDesertAt: 0,
    vitesse: 1,
    missionsReclamees: [],
    missionsNotifiees: [],
    battle: null,
    expedition: null,
    battleReport: null,
    offlineSummary: null,
    toasts: [],
    selected: null,
    panel: null,
  }
}
type ActionsOnly = {
  init: unknown
  tick: unknown
  upgrade: unknown
  recruter: unknown
  reparerRemparts: unknown
  construireTour: unknown
  affecter: unknown
  affecterAuto: unknown
  echanger: unknown
  sacrifier: unknown
  benir: unknown
  choisirEvenement: unknown
  fermerEvenement: unknown
  lancerMaintenant: unknown
  lancerExpedition: unknown
  retraiteExpedition: unknown
  fermerExpedition: unknown
  attaqueTest: unknown
  setVitesse: unknown
  reclamerMission: unknown
  select: unknown
  openPanel: unknown
  fermerOffline: unknown
  fermerBattleReport: unknown
  save: unknown
  reset: unknown
}

const CHAMPS_SAUVES = [
  'createdAt',
  'lastSeen',
  'resources',
  'faveur',
  'pop',
  'nextPopAt',
  'buildings',
  'villageois',
  'wallHp',
  'tours',
  'army',
  'recruitQueue',
  'moraleMods',
  'morale',
  'gods',
  'threatMod',
  'threat',
  'nextAttackAt',
  'warned',
  'incomingWave',
  'defRecompense',
  'eventCooldowns',
  'lastEventAt',
  'activeEvent',
  'eventOutcome',
  'pendingEffects',
  'reports',
  'stats',
  'expeditions',
  'tutorialDone',
  'droughtUntil',
  'aresBoostUntil',
  'nextDesertAt',
  'vitesse',
  'missionsReclamees',
] as const

export const VITESSES = [1, 2, 4, 8] as const

// ── Effets différés ───────────────────────────────────────────────────────────
function appliquerEffetDiffere(s: GameState, eff: PendingEffect, now: number): void {
  switch (eff.type) {
    case 'trahison-refugies': {
      const vol = volerPct(s, 0.25, ['grain', 'bronze'])
      s.pop = Math.max(0, s.pop - 4)
      s.moraleMods.push({ id: uid('m'), label: 'Trahison des réfugiés', delta: -10, expiresAt: now + 8 * 60_000 })
      pushReport(s, '🗡️', 'Les réfugiés ont trahi', [
        'À la nuit tombée, vos « réfugiés » ont vidé les réserves et filé vers les collines.',
        `Perdu : ${vol}.`,
        'Athéna l’avait peut-être murmuré à qui savait l’entendre…',
      ])
      pushToast(s, '🗡️', 'Les réfugiés vous ont trahi !')
      break
    }
    case 'promesse-mutins': {
      if (s.morale < 40) {
        const morts = retirerSoldats(s, 2)
        s.moraleMods.push({ id: uid('m'), label: 'Promesses trahies', delta: -18, expiresAt: now + 10 * 60_000 })
        pushReport(s, '🔥', 'Les promesses n’ont pas suffi', [
          'Les jours meilleurs ne sont pas venus. La colère non plus n’est pas partie.',
          `${morts} soldat(s) ont déserté avec les mutins.`,
        ])
        pushToast(s, '🔥', 'La foule n’a pas oublié vos promesses…')
      } else {
        pushReport(s, '🕊️', 'La parole tenue', [
          'L’ambiance s’est améliorée : les meneurs de la mutinerie déposent leurs torches.',
        ])
      }
      break
    }
    case 'butin-troie': {
      s.resources.bronze = clampRes(s, 'bronze', s.resources.bronze + 120)
      s.resources.grain = clampRes(s, 'grain', s.resources.grain + 60)
      pushReport(s, '🏰', 'La gratitude de Troie', [
        'Un char aux couleurs de Priam livre votre part du butin de la sortie d’Hector.',
        '+120 🥉, +60 🌾. Vos soldats reviendront couverts de gloire — ceux qui reviendront.',
      ])
      pushToast(s, '🏰', 'Troie partage le butin : +120 🥉, +60 🌾')
      break
    }
  }
}

// ── Fin de bataille défensive ─────────────────────────────────────────────────
function finirBataille(s: GameState, victoire: boolean, fuite: boolean, now: number): void {
  const b = s.battle
  if (!b) return
  const pertes = pertesDefense(b)
  const lignes: string[] = []
  for (const [u, n] of Object.entries(pertes) as [UnitId, number][]) {
    s.army[u] = Math.max(0, s.army[u] - n)
    lignes.push(`${n} ${UNITS[u].nom.toLowerCase()}${n > 1 ? 's' : ''} tombé(s)`)
  }
  const morts = b.fighters.filter((f) => f.camp === 'attaque' && f.hp <= 0).length
  const fuyards = b.fighters.filter((f) => f.camp === 'attaque' && f.etat === 'mort' && f.hp > 0).length
  fuite = fuite || fuyards > 0

  if (victoire) {
    s.stats.repousses++
    s.threatMod -= 5
    const rec = s.defRecompense ?? { bronze: 20, faveur: 8, bonus: false }
    const mult = rec.bonus ? 1.25 : 1
    const bronze = Math.round(rec.bronze * mult)
    const faveur = Math.round(rec.faveur * mult)
    s.resources.bronze = clampRes(s, 'bronze', s.resources.bronze + bronze)
    s.faveur = Math.min(FAVEUR_MAX, s.faveur + faveur)
    s.moraleMods.push({ id: uid('m'), label: 'Victoire éclatante', delta: 10, expiresAt: now + 10 * 60_000 })
    const r = pushReport(s, '🏆', fuite ? 'L’ennemi est en déroute !' : 'Assaut repoussé !', [
      `La bande (${descVague(b.wave)}) a été ${fuite ? 'mise en fuite' : 'anéantie'} : ${morts} assaillants abattus${fuyards ? `, ${fuyards} en fuite` : ''}.`,
      lignes.length ? `Vos pertes : ${lignes.join(', ')}.` : 'Aucune perte dans vos rangs — les aèdes chanteront ce jour.',
      `🎁 Récompense : +${bronze} 🥉, +${faveur} ✨${rec.bonus ? ' (bonus d’audace +25 %)' : ''}. Ambiance +10.`,
    ])
    s.battleReport = r
  } else {
    s.stats.perdus++
    s.threatMod -= 15
    const vol = volerPct(s, 0.3)
    s.moraleMods.push({ id: uid('m'), label: 'Village pillé', delta: -14, expiresAt: now + 10 * 60_000 })
    const r = pushReport(s, '💀', 'Le village a été pillé', [
      `Les assaillants (${descVague(b.wave)}) ont enfoncé vos défenses.`,
      lignes.length ? `Vos pertes : ${lignes.join(', ')}.` : 'Vos défenseurs ont été balayés.',
      `Pillé : ${vol}. Ambiance −14.`,
      'Repus de butin, ils vous laisseront tranquilles… un temps.',
    ])
    s.battleReport = r
  }
  s.battle = null
  s.warned = false
  s.incomingWave = null
  s.defRecompense = null
  s.nextAttackAt = now + ASSAUT_MIN_MS + Math.random() * (ASSAUT_MAX_MS - ASSAUT_MIN_MS)
}

// ── Fin d'expédition ──────────────────────────────────────────────────────────
function finirExpedition(s: GameState, v: VillageCible, victoire: boolean, now: number): void {
  const exp = s.expedition
  if (!exp) return
  const b = exp.battle
  const lignes: string[] = []

  // survivants (les fuyards hp>0 rentrent au village)
  let envoyesTotal = 0
  let mortsTotal = 0
  const pertesTxt: string[] = []
  for (const u of UNIT_IDS) {
    const envoyes = exp.envoyes[u] ?? 0
    if (envoyes === 0) continue
    envoyesTotal += envoyes
    const morts = b.fighters.filter((f) => f.camp === 'attaque' && f.type === u && f.etat === 'mort' && f.hp <= 0).length
    mortsTotal += morts
    s.army[u] += Math.max(0, envoyes - morts)
    if (morts > 0) pertesTxt.push(`${morts} ${UNITS[u].nom.toLowerCase()}${morts > 1 ? 's' : ''}`)
  }

  const deja = s.expeditions[v.id]?.etoiles ?? 0
  if (victoire) {
    const etoiles = etoilesPour(mortsTotal, envoyesTotal)
    const mult = deja > 0 ? BUTIN_REPETE : 1
    const butinTxt: string[] = []
    for (const [r, n] of Object.entries(v.butin) as [ResourceId, number][]) {
      const gain = Math.round(n * mult)
      s.resources[r] = clampRes(s, r, s.resources[r] + gain)
      butinTxt.push(`+${gain} ${RES[r].emoji}`)
    }
    s.gods.ares.relation = Math.min(100, s.gods.ares.relation + 4)
    s.moraleMods.push({ id: uid('m'), label: 'Raid victorieux', delta: 6, expiresAt: now + 8 * 60_000 })
    s.expeditions[v.id] = { etoiles: Math.max(deja, etoiles), dernierRaid: now }
    lignes.push(
      `${v.nom} est tombé ! ${'★'.repeat(etoiles)}${'☆'.repeat(3 - etoiles)}`,
      `Butin : ${butinTxt.join(', ')}${deja > 0 ? ' (village déjà pillé : butin réduit)' : ''}.`,
      pertesTxt.length ? `Vos pertes : ${pertesTxt.join(', ')}.` : 'Aucune perte — un triomphe digne d’Achille.',
      'Arès +4, ambiance +6.',
    )
    exp.result = { victoire: true, etoiles, lignes }
    pushReport(s, '🏴‍☠️', `Raid victorieux — ${v.nom}`, lignes)
  } else {
    s.expeditions[v.id] = { etoiles: deja, dernierRaid: now }
    s.moraleMods.push({ id: uid('m'), label: 'Raid repoussé', delta: -6, expiresAt: now + 8 * 60_000 })
    lignes.push(
      `L’assaut sur ${v.nom} a échoué.`,
      pertesTxt.length ? `Vos pertes : ${pertesTxt.join(', ')}.` : 'Vos troupes ont battu en retraite à temps.',
      'Les survivants rentrent la tête basse. Ambiance −6.',
    )
    exp.result = { victoire: false, etoiles: 0, lignes }
    pushReport(s, '🏳️', `Raid repoussé — ${v.nom}`, lignes)
  }
}

// ── Hors-ligne ────────────────────────────────────────────────────────────────
function simulerHorsLigne(s: GameState, now: number): void {
  const dt = Math.min(Math.max(0, now - s.lastSeen), OFFLINE_CAP_MS)
  if (dt < 30_000) return
  const lignes: string[] = [`Pendant votre absence (${fmtDuree(dt)}) :`]

  // production (au taux courant)
  const minutes = dt / 60_000
  const taux = tauxParMinute(s)
  for (const r of Object.keys(RES) as ResourceId[]) {
    const avant = s.resources[r]
    s.resources[r] = clampRes(s, r, s.resources[r] + taux[r] * minutes)
    const delta = Math.round(s.resources[r] - avant)
    if (delta !== 0) lignes.push(`${delta > 0 ? '+' : ''}${delta} ${RES[r].emoji} ${RES[r].nom.toLowerCase()}`)
  }
  s.faveur = Math.min(FAVEUR_MAX, s.faveur + PROD.temple[s.buildings.temple.level] * minutes)

  // constructions terminées
  for (const bId of BUILDING_IDS) {
    const b = s.buildings[bId]
    if (b.targetLevel !== undefined && b.busyUntil !== undefined && b.busyUntil <= now) {
      b.level = b.targetLevel
      if (bId === 'remparts') s.wallHp = WALL_HP[b.level]
      lignes.push(`🏗️ ${BUILDINGS[bId].nom} achevé(e) au niveau ${b.level}`)
      delete b.targetLevel
      delete b.busyUntil
    }
  }

  // recrutements
  let formes = 0
  while (s.recruitQueue.length > 0 && s.recruitQueue[0].finishAt <= now) {
    const job = s.recruitQueue[0]
    s.army[job.unit]++
    formes++
    job.restant--
    if (job.restant <= 0) s.recruitQueue.shift()
    else job.finishAt += UNITS[job.unit].time * 1000
  }
  if (formes > 0) lignes.push(`🛡️ ${formes} recrue(s) ont terminé leur formation`)

  // croissance de population
  const cap = popCap(s)
  const gagnes = Math.min(Math.floor(dt / 45_000), Math.max(0, cap - s.pop))
  if (gagnes > 0 && s.resources.grain > 0) {
    s.pop += gagnes
    lignes.push(`👥 +${gagnes} villageois`)
  }

  // attaques survenues hors-ligne (max 3)
  let n = 0
  while (s.nextAttackAt <= now && n < 3) {
    n++
    const wave = s.incomingWave ?? genererVague(calcThreat(s, s.nextAttackAt))
    const res = resoudreHorsLigne(wave, s.army, s.buildings.remparts.level, s.wallHp, s.tours)
    for (const [u, p] of Object.entries(res.pertes) as [UnitId, number][]) {
      s.army[u] = Math.max(0, s.army[u] - p)
    }
    s.wallHp = Math.max(0, s.wallHp - res.degatsRemparts)
    if (res.victoire) {
      s.stats.repousses++
      lignes.push(`⚔️ Assaut nocturne (${descVague(wave)}) repoussé par la garnison !`)
    } else {
      s.stats.perdus++
      const vol = volerPct(s, res.volePct)
      lignes.push(`💀 Assaut nocturne (${descVague(wave)}) : le village a été pillé (${vol})`)
      s.moraleMods.push({ id: uid('m'), label: 'Pillé pendant la nuit', delta: -10, expiresAt: now + 8 * 60_000 })
    }
    s.incomingWave = null
    s.warned = false
    s.defRecompense = null
    s.nextAttackAt += ASSAUT_MIN_MS + Math.random() * (ASSAUT_MAX_MS - ASSAUT_MIN_MS)
  }

  // effets différés échus
  const echus = s.pendingEffects.filter((e) => e.at <= now)
  s.pendingEffects = s.pendingEffects.filter((e) => e.at > now)
  for (const e of echus) appliquerEffetDiffere(s, e, now)

  if (lignes.length === 1) lignes.push('Rien à signaler — le village a dormi en paix.')
  s.offlineSummary = lignes
}

// ─────────────────────────────────────────────────────────────────────────────
export const useGame = create<GameState>()(
  immer((set, get) => ({
    ...etatInitial(Date.now()),

    init: () => {
      // migration : les sauvegardes de l'époque « ILION » sont reprises telles quelles
      const brut = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(ANCIEN_STORAGE_KEY)
      const now = Date.now()
      if (brut) {
        try {
          const data = JSON.parse(brut) as Partial<GameState>
          set((s) => {
            Object.assign(s, etatInitial(now), data, {
              battle: null,
              expedition: null,
              battleReport: null,
              offlineSummary: null,
              toasts: [],
              selected: null,
              panel: null,
            })
            simulerHorsLigne(s, now)
            s.lastSeen = now
            // ne jamais reprendre avec une attaque « dans le passé »
            if (s.nextAttackAt <= now + 30_000) s.nextAttackAt = now + 60_000
          })
          // écrire la nouvelle clé AVANT de retirer l'ancienne : aucune fenêtre sans sauvegarde
          get().save()
          localStorage.removeItem(ANCIEN_STORAGE_KEY)
          return
        } catch {
          // sauvegarde corrompue : nouvelle partie
        }
      }
      set((s) => {
        Object.assign(s, etatInitial(now))
        s.panel = 'aide'
      })
    },

    tick: () => {
      const now = Date.now()
      set((s) => {
        const dtMs = Math.min(2000, Math.max(0, now - s.lastSeen))
        const dt = dtMs / 1000
        s.lastSeen = now

        // ── vitesse du jeu (façon Sims) : ×1 forcé pendant les batailles ──
        const enBataille = s.battle !== null || (s.expedition !== null && !s.expedition.result)
        const vitesse = enBataille ? 1 : s.vitesse
        /** secondes de jeu écoulées ce tick */
        const dtJeu = dt * vitesse
        // on rapproche toutes les échéances du présent : le temps « avance » plus vite
        const avance = dtMs * (vitesse - 1)
        if (avance > 0) {
          s.createdAt -= avance // cycle jour/nuit et menace accélérés
          s.nextPopAt -= avance
          s.nextAttackAt -= avance
          s.lastEventAt -= avance
          if (s.nextDesertAt > 0) s.nextDesertAt -= avance
          if (s.droughtUntil > now) s.droughtUntil -= avance
          if (s.aresBoostUntil > now) s.aresBoostUntil -= avance
          for (const bId of BUILDING_IDS) {
            const b = s.buildings[bId]
            if (b.busyUntil !== undefined) b.busyUntil -= avance
          }
          for (const job of s.recruitQueue) job.finishAt -= avance
          for (const g of GOD_IDS) {
            if (s.gods[g].cooldownUntil > now) s.gods[g].cooldownUntil -= avance
          }
          for (const m of s.moraleMods) {
            if (m.expiresAt !== null) m.expiresAt -= avance
          }
          for (const e of s.pendingEffects) e.at -= avance
          for (const k of Object.keys(s.eventCooldowns)) s.eventCooldowns[k] -= avance
          for (const k of Object.keys(s.expeditions)) s.expeditions[k].dernierRaid -= avance
        }

        // les habitants suivent la population (naissances, pertes, récompenses)
        syncVillageois(s)

        // morale & menace
        s.moraleMods = s.moraleMods.filter((m) => m.expiresAt === null || m.expiresAt > now)
        s.morale = calcMorale(s, now)
        s.threatMod = s.threatMod < 0 ? Math.min(0, s.threatMod + dtJeu / 60) : s.threatMod
        s.threat = calcThreat(s, now)

        // mode test : coffres pleins en permanence
        if (MODE_TEST) {
          const max = stockageMax(s)
          for (const r of Object.keys(RES) as ResourceId[]) s.resources[r] = max
          s.faveur = FAVEUR_MAX
          if (s.pop < popCap(s)) s.pop = popCap(s)
        } else {
          // production — chaque atelier ne rend qu'au prorata de ses postes tenus
          const m = multMorale(s.morale)
          const drought = now < s.droughtUntil ? 0.5 : 1
          const rd = (b: BuildingId) => rendement(s, b)
          const parMin: Record<ResourceId, number> = {
            bois: (BASE_PROD.bois + PROD.scierie[s.buildings.scierie.level] * rd('scierie')) * m,
            pierre: (BASE_PROD.pierre + PROD.carriere[s.buildings.carriere.level] * rd('carriere')) * m,
            grain: (BASE_PROD.grain + PROD.ferme[s.buildings.ferme.level] * rd('ferme') * drought) * m,
            bronze:
              (BASE_PROD.bronze +
                PROD.forge[s.buildings.forge.level] * rd('forge') +
                PROD.port[s.buildings.port.level] * rd('port')) *
              m,
          }
          for (const r of Object.keys(parMin) as ResourceId[]) {
            s.resources[r] = clampRes(s, r, s.resources[r] + (parMin[r] / 60) * dtJeu)
          }
          const conso = (s.pop * CONSO_POP + armeeTotale(s.army) * CONSO_SOLDAT) / 60
          s.resources.grain = Math.max(0, s.resources.grain - conso * dtJeu)
          // sans prêtre au temple, les dieux n'entendent rien
          s.faveur = Math.min(
            FAVEUR_MAX,
            s.faveur + ((PROD.temple[s.buildings.temple.level] * rd('temple')) / 60) * dtJeu,
          )
        }

        // désertions en cas de moral effondré
        if (s.morale <= 5 && armeeTotale(s.army) > 0) {
          if (s.nextDesertAt === 0) s.nextDesertAt = now + 60_000
          else if (now >= s.nextDesertAt) {
            retirerSoldats(s, 1)
            s.nextDesertAt = now + 60_000
            pushToast(s, '🏃', 'Un soldat déserte — le moral est au plus bas !')
          }
        } else {
          s.nextDesertAt = 0
        }

        // population
        if (now >= s.nextPopAt) {
          s.nextPopAt = now + 45_000
          if (s.resources.grain > 0 && s.morale >= 30 && s.pop < popCap(s)) s.pop++
        }

        // constructions
        for (const bId of BUILDING_IDS) {
          const b = s.buildings[bId]
          if (b.targetLevel !== undefined && b.busyUntil !== undefined && b.busyUntil <= now) {
            b.level = b.targetLevel
            if (bId === 'remparts') s.wallHp = WALL_HP[b.level]
            pushToast(s, BUILDINGS[bId].emoji, `${BUILDINGS[bId].nom} : niveau ${b.level} achevé !`)
            delete b.targetLevel
            delete b.busyUntil
            // un chantier livré ouvre des postes : on y envoie les bras disponibles
            const libres = postesTotal(s, bId) - postesPourvus(s, bId)
            if (libres > 0) {
              let places = libres
              for (const v of s.villageois) {
                if (places <= 0) break
                if (v.poste === null) {
                  v.poste = bId
                  places--
                }
              }
              if (places < libres) {
                pushToast(s, '👷', `${METIERS[bId] ?? 'Ouvriers'} : ${libres - places} villageois pren${libres - places > 1 ? 'nent' : 'd'} son poste.`)
              }
            }
          }
        }

        // recrutement
        if (s.recruitQueue.length > 0 && s.recruitQueue[0].finishAt <= now) {
          const job = s.recruitQueue[0]
          s.army[job.unit]++
          job.restant--
          pushToast(s, UNITS[job.unit].emoji, `${UNITS[job.unit].nom} prêt au combat`)
          if (job.restant <= 0) s.recruitQueue.shift()
          else {
            const vitesse = MODE_TEST
              ? 0.03
              : (s.buildings.caserne.level >= 4 ? 0.75 : 1) * (now < s.aresBoostUntil ? 0.5 : 1)
            job.finishAt = now + UNITS[job.unit].time * 1000 * vitesse
          }
        }

        // effets différés
        if (s.pendingEffects.some((e) => e.at <= now)) {
          const echus = s.pendingEffects.filter((e) => e.at <= now)
          s.pendingEffects = s.pendingEffects.filter((e) => e.at > now)
          for (const e of echus) appliquerEffetDiffere(s, e, now)
        }

        // ── expédition en cours ──
        if (s.expedition && !s.expedition.result) {
          const v = VILLAGES_PAR_ID[s.expedition.villageId]
          const b = s.expedition.battle
          if (now - b.startedAt > EXPEDITION_TIMEOUT_MS) sonnerRetraite(b)
          const out = tickBataille(b, { now, dt, wallHp: s.expedition.wallHp, wallLevel: v.mur })
          s.expedition.wallHp = out.wallHp
          if (out.brecheOuverte) pushToast(s, '💥', `Brèche dans les murs de ${v.nom} !`)
          if (out.finie) finirExpedition(s, v, out.pillage, now)
        }

        // ── attaques sur le village ──
        if (!s.battle) {
          const fenetre = s.buildings.remparts.level >= 2 ? ALERTE_LONGUE_MS : ALERTE_MS
          if (!s.warned && now >= s.nextAttackAt - fenetre) {
            armerAlerte(s)
            pushToast(s, '🐎', `Éclaireurs : ${tailleVague(s.incomingWave!)} assaillants approchent par l’est !`)
          }
          if (now >= s.nextAttackAt) {
            if (s.expedition) {
              // vos troupes sont au loin : l'ennemi temporise
              s.nextAttackAt = now + 45_000
            } else {
              armerAlerte(s)
              // la vague se scinde entre plusieurs fronts, tirés au sort
              const fronts = choisirFronts(s.threat)
              s.battle = creerBataille({
                attaquants: s.incomingWave!,
                defenseurs: s.army,
                wallLevel: s.buildings.remparts.level,
                now,
                geo: GEO_VILLAGE,
                campJoueur: 'defense',
                tours: s.tours,
                fronts,
                wallHpTotal: s.wallHp,
              })
              if (s.buildings.ferme.level > 0) {
                s.resources.grain = Math.max(0, s.resources.grain * 0.97) // champs piétinés
              }
              pushToast(s, '⚔️', 'À L’ASSAUT ! Défendez le village !')
            }
          }
        } else {
          // bataille en cours
          const out = tickBataille(s.battle, {
            now,
            dt,
            wallHp: s.wallHp,
            wallLevel: s.buildings.remparts.level,
          })
          s.wallHp = out.wallHp
          if (out.brecheOuverte) pushToast(s, '💥', 'BRÈCHE ! Les remparts ont cédé !')
          if (out.finie) finirBataille(s, out.victoireDefense, out.fuite, now)
        }

        // ── événements ──
        if (
          !s.activeEvent &&
          !s.eventOutcome &&
          !s.battle &&
          !s.expedition &&
          s.tutorialDone &&
          now - s.lastEventAt > 60_000
        ) {
          const eligibles = EVENTS.filter(
            (e) => (s.eventCooldowns[e.id] ?? 0) <= now && (!e.condition || e.condition(snap(s))),
          )
          const crises = eligibles.filter((e) => e.priorite)
          const pool = crises.length > 0 ? crises : eligibles
          const proba = crises.length > 0 ? (dtMs * vitesse) / 20_000 : (dtMs * vitesse) / 210_000
          if (pool.length > 0 && Math.random() < proba) {
            const somme = pool.reduce((a, e) => a + e.weight, 0)
            let r = Math.random() * somme
            let choisi = pool[0]
            for (const e of pool) {
              r -= e.weight
              if (r <= 0) {
                choisi = e
                break
              }
            }
            s.activeEvent = { defId: choisi.id, roll: Math.random(), startedAt: now }
            s.lastEventAt = now
          }
        }

        // ── missions prêtes à réclamer (toast unique) ──
        for (const m of missionsActives(s.missionsReclamees)) {
          if (s.missionsNotifiees.includes(m.id)) continue
          const p = m.progres(s)
          if (p.cur >= p.max && m.id !== 'nouveau-depart') {
            s.missionsNotifiees.push(m.id)
            pushToast(s, '🏅', `Mission accomplie : ${m.titre} — réclamez votre récompense !`)
          }
        }

        // toasts expirés
        s.toasts = s.toasts.filter((t) => t.until > now)
      })

      // sauvegarde périodique (toutes les ~10 s)
      const st = get()
      if (!st.battle && !st.expedition && now % 10_000 < 300) st.save()
    },

    upgrade: (bId) => {
      set((s) => {
        const b = s.buildings[bId]
        const def = BUILDINGS[bId]
        const cible = b.level + 1
        if (b.targetLevel !== undefined || cible > 4) return
        if (bId !== 'agora' && cible > s.buildings.agora.level) {
          pushToast(s, '🏛️', `L’Agora doit d’abord atteindre le niveau ${cible}.`)
          return
        }
        const chantiers = BUILDING_IDS.filter((x) => s.buildings[x].targetLevel !== undefined).length
        if (chantiers >= 2) {
          pushToast(s, '🏗️', 'Vos ouvriers ne peuvent mener que 2 chantiers de front.')
          return
        }
        if (!payer(s, def.costs[cible - 1])) {
          pushToast(s, '❌', 'Ressources insuffisantes.')
          return
        }
        b.targetLevel = cible
        b.busyUntil = Date.now() + (MODE_TEST ? 1500 : def.times[cible - 1] * 1000)
        pushToast(s, '🏗️', `${def.nom} : chantier du niveau ${cible} lancé.`)
      })
    },

    recruter: (u, n) => {
      set((s) => {
        const def = UNITS[u]
        if (s.buildings.caserne.level < def.caserne) return
        const cout: Partial<Record<ResourceId, number>> = {}
        for (const [r, c] of Object.entries(def.cost) as [ResourceId, number][]) cout[r] = c * n
        // on n'enrôle que des bras disponibles : un artisan reste à son poste
        const dispo = s.villageois.filter((v) => v.poste === null)
        if (dispo.length < n) {
          pushToast(
            s,
            '👥',
            dispo.length === 0
              ? 'Aucun villageois disponible — libérez un artisan de son poste.'
              : `Seulement ${dispo.length} villageois sans emploi.`,
          )
          return
        }
        if (!payer(s, cout)) {
          pushToast(s, '❌', 'Ressources insuffisantes.')
          return
        }
        // les recrues quittent le village pour la caserne
        const noms = dispo.slice(0, n).map((v) => v.nom)
        for (const v of dispo.slice(0, n)) {
          s.villageois.splice(s.villageois.indexOf(v), 1)
        }
        s.pop -= n
        pushToast(s, def.emoji, `${noms.join(', ')} prend${n > 1 ? 'nent' : ''} les armes.`)
        const now = Date.now()
        const vitesse = MODE_TEST
          ? 0.03
          : (s.buildings.caserne.level >= 4 ? 0.75 : 1) * (now < s.aresBoostUntil ? 0.5 : 1)
        const dernier = s.recruitQueue[s.recruitQueue.length - 1]
        const debut = dernier ? dernier.finishAt + (dernier.restant - 1) * UNITS[dernier.unit].time * 1000 * vitesse : now
        s.recruitQueue.push({ unit: u, restant: n, finishAt: debut + def.time * 1000 * vitesse })
      })
    },

    reparerRemparts: () => {
      set((s) => {
        if (s.battle) return
        const max = WALL_HP[s.buildings.remparts.level]
        const manque = max - s.wallHp
        if (manque <= 0) return
        const cout = Math.ceil(manque / 8)
        if (!payer(s, { pierre: cout })) {
          pushToast(s, '❌', `Il faut ${cout} 🪨 pour réparer.`)
          return
        }
        s.wallHp = max
        pushToast(s, '🧱', 'Remparts réparés.')
      })
    },

    construireTour: () => {
      set((s) => {
        const max = TOURS_MAX[s.buildings.remparts.level]
        if (s.battle) return
        if (max === 0) {
          pushToast(s, '🏹', 'Il faut des remparts de niveau 2 pour asseoir une tour.')
          return
        }
        if (s.tours >= max) {
          pushToast(s, '🏹', 'L’enceinte ne peut porter davantage de tours — rehaussez les remparts.')
          return
        }
        if (!payer(s, TOUR_COUTS[s.tours])) {
          pushToast(s, '❌', 'Ressources insuffisantes.')
          return
        }
        s.tours++
        pushToast(s, '🏹', `Tour d’archers dressée (${s.tours}/${max}). Sa silhouette attire l’œil des pillards…`)
      })
      get().save()
    },

    affecter: (villageoisId, poste) => {
      set((s) => {
        const v = s.villageois.find((x) => x.id === villageoisId)
        if (!v) return
        if (poste === null) {
          v.poste = null
          return
        }
        if (postesTotal(s, poste) <= 0) {
          pushToast(s, '🚧', `${BUILDINGS[poste].nom} n’offre aucun poste à ce niveau.`)
          return
        }
        if (v.poste !== poste && postesPourvus(s, poste) >= postesTotal(s, poste)) {
          pushToast(s, '👥', `Tous les postes de ${BUILDINGS[poste].nom} sont déjà tenus.`)
          return
        }
        v.poste = poste
      })
      get().save()
    },

    affecterAuto: () => {
      set((s) => {
        let places = 0
        for (const b of BATIMENTS_A_POSTES) {
          let libres = postesTotal(s, b) - postesPourvus(s, b)
          while (libres > 0) {
            const v = s.villageois.find((x) => x.poste === null)
            if (!v) {
              libres = 0
              break
            }
            v.poste = b
            libres--
            places++
          }
        }
        pushToast(
          s,
          '👷',
          places > 0
            ? `${places} villageois envoyé${places > 1 ? 's' : ''} au travail.`
            : 'Aucun poste à pourvoir — ou plus personne de disponible.',
        )
      })
      get().save()
    },

    echanger: (donner, recevoir) => {
      set((s) => {
        const niveau = s.buildings.port.level
        if (niveau < 1 || donner === recevoir) return
        const taux = TAUX_PORT[niveau]
        const coutDonne = Math.round(taux * 10)
        const cout: Partial<Record<ResourceId, number>> = {}
        cout[donner] = coutDonne
        if (!payer(s, cout)) {
          pushToast(s, '❌', `Il faut ${coutDonne} ${RES[donner].emoji} pour cet échange.`)
          return
        }
        s.resources[recevoir] = clampRes(s, recevoir, s.resources[recevoir] + 10)
        pushToast(s, '⚓', `Échange : −${coutDonne} ${RES[donner].emoji} → +10 ${RES[recevoir].emoji}`)
      })
    },

    sacrifier: (g) => {
      set((s) => {
        if (s.buildings.temple.level < GODS[g].temple) return
        if (!payer(s, { grain: 50 })) {
          pushToast(s, '❌', 'Il faut 50 🌾 pour un sacrifice.')
          return
        }
        s.gods[g].relation = Math.min(100, s.gods[g].relation + 8)
        s.faveur = Math.min(FAVEUR_MAX, s.faveur + 5)
        pushToast(s, GODS[g].emoji, `La fumée du sacrifice plaît à ${GODS[g].nom}. (+8 relation, +5 ✨)`)
      })
    },

    benir: (g) => {
      set((s) => {
        const dieu = GODS[g]
        const now = Date.now()
        const bataille = s.battle ?? (s.expedition && !s.expedition.result ? s.expedition.battle : null)
        if (s.buildings.temple.level < dieu.temple) return
        if (s.gods[g].cooldownUntil > now) return
        if (dieu.benediction.batailleUniquement && !bataille) {
          pushToast(s, dieu.emoji, `${dieu.benediction.nom} ne peut être invoquée qu’en bataille.`)
          return
        }
        if (g === 'poseidon' && WALL_HP[s.buildings.remparts.level] <= 0) {
          pushToast(s, '🔱', 'Aucun rempart à consolider — bâtissez d’abord une enceinte.')
          return
        }
        const cout = coutBenediction(s, g)
        if (s.faveur < cout) {
          pushToast(s, '❌', `Il faut ${cout} ✨ de faveur.`)
          return
        }
        s.faveur -= cout
        s.gods[g].cooldownUntil = now + dieu.benediction.cooldown / (MODE_TEST ? 12 : 1)
        s.gods[g].relation = Math.min(100, s.gods[g].relation + 2)
        // ferveur : plus le dieu vous chérit, plus son bras est lourd
        const force = multRelation(s.gods[g].relation)
        const pct = (x: number) => Math.round(x * 100)

        switch (g) {
          case 'zeus': {
            if (bataille) {
              const touches = foudreDeZeus(bataille, now, force)
              pushToast(
                s,
                '⚡',
                `La foudre de Zeus frappe ${touches} ennemis (${pct(force)} % de puissance) !`,
              )
            }
            break
          }
          case 'poseidon': {
            const max = WALL_HP[s.buildings.remparts.level]
            const part = 0.45 * force
            s.wallHp = Math.min(max, Math.round(s.wallHp + max * part))
            // en pleine bataille, les pans effondrés se relèvent aussi
            if (s.battle) {
              for (const sec of s.battle.secteurs) {
                sec.hp = Math.min(sec.max, sec.hp + sec.max * part)
                if (sec.hp > 0) sec.breche = false
              }
              s.battle.breche = s.battle.secteurs.every((x) => x.breche)
            }
            if (s.battle) {
              s.battle.effects.push({
                id: uid('fx'),
                type: 'benediction',
                x: s.battle.geo.porte.x,
                y: s.battle.geo.porte.y,
                until: now + 2000,
              })
            }
            pushToast(s, '🔱', `Les pierres se ressoudent : remparts restaurés de ${pct(part)} %.`)
            break
          }
          case 'athena': {
            if (bataille) {
              // ferveur haute = réduction plus forte ET plus longue
              const reduction = Math.max(0.15, 1 - 0.6 * force)
              bataille.defBuffUntil = now + 25_000 * force
              bataille.defBuffForce = reduction
              pushToast(
                s,
                '🦉',
                `L’Égide couvre vos combattants (−${pct(1 - reduction)} % de dégâts subis, ${Math.round(25 * force)} s).`,
              )
            }
            break
          }
          case 'ares': {
            if (bataille) {
              bataille.atkBuffUntil = now + 25_000 * force
              bataille.atkBuffForce = 1 + 0.6 * force
              pushToast(
                s,
                '🐗',
                `Fureur d’Arès : +${pct(0.6 * force)} % d’attaque pendant ${Math.round(25 * force)} s !`,
              )
            } else {
              s.aresBoostUntil = now + 60_000 * force
              if (s.recruitQueue.length > 0) {
                const job = s.recruitQueue[0]
                job.finishAt = now + (job.finishAt - now) / 2
              }
              pushToast(s, '🐗', `Arès presse vos recrues : formation accélérée (${Math.round(60 * force)} s).`)
            }
            break
          }
        }
      })
    },

    choisirEvenement: (i) => {
      set((s) => {
        if (!s.activeEvent || s.eventOutcome) return
        const def = EVENTS_BY_ID[s.activeEvent.defId]
        const choix = def.choices[i]
        if (!choix) return
        if (choix.requiert && !choix.requiert(snap(s))) return
        if (choix.cout && !payer(s, choix.cout)) return
        const now = Date.now()
        const lignes = choix.apply(makeCtx(s, now), s.activeEvent.roll)
        s.eventOutcome = lignes
        s.eventCooldowns[def.id] = now + def.cooldown
        s.stats.evenements++
        s.lastEventAt = now
        pushReport(s, def.emoji, def.titre, lignes)
      })
      get().save()
    },

    fermerEvenement: () => {
      set((s) => {
        s.activeEvent = null
        s.eventOutcome = null
      })
    },

    lancerMaintenant: () => {
      set((s) => {
        if (!s.warned || s.battle || s.expedition || !s.defRecompense) return
        s.defRecompense.bonus = true
        s.nextAttackAt = Date.now()
        pushToast(s, '⚔️', 'Vous provoquez l’ennemi : il charge ! (récompense +25 %)')
      })
    },

    lancerExpedition: (villageId, troupes) => {
      set((s) => {
        if (s.expedition || s.battle) return
        const v = VILLAGES_PAR_ID[villageId]
        if (!v) return
        const dernier = s.expeditions[villageId]?.dernierRaid ?? 0
        const now = Date.now()
        if (now - dernier < RAID_COOLDOWN_MS / (MODE_TEST ? 10 : 1)) return
        let total = 0
        for (const u of UNIT_IDS) {
          const n = troupes[u] ?? 0
          if (n < 0 || n > s.army[u]) return
          total += n
        }
        if (total === 0 || total > MAX_TROUPES) return
        for (const u of UNIT_IDS) s.army[u] -= troupes[u] ?? 0
        const attaquants = UNIT_IDS.filter((u) => (troupes[u] ?? 0) > 0).map((u) => ({
          enemy: u,
          count: troupes[u],
        }))
        s.expedition = {
          villageId,
          envoyes: { ...troupes },
          wallHp: WALL_HP[v.mur],
          battle: creerBataille({
            attaquants,
            defenseurs: v.garnison,
            wallLevel: v.mur,
            now,
            geo: GEO_EXPEDITION,
            campJoueur: 'attaque',
          }),
          result: null,
        }
        s.panel = null
        pushToast(s, '🏴‍☠️', `Vos troupes marchent sur ${v.nom} !`)
      })
    },

    retraiteExpedition: () => {
      set((s) => {
        if (!s.expedition || s.expedition.result) return
        sonnerRetraite(s.expedition.battle)
        pushToast(s, '🏳️', 'Retraite ! Vos troupes refluent vers le village.')
      })
    },

    fermerExpedition: () => {
      set((s) => {
        if (s.expedition && !s.expedition.result) return // l'assaut se joue jusqu'au bout
        s.expedition = null
      })
      get().save()
    },

    attaqueTest: () => {
      set((s) => {
        if (!MODE_TEST || s.battle || s.expedition) return
        s.nextAttackAt = Date.now() + 3000
        s.warned = false
        s.incomingWave = null
        s.defRecompense = null
        pushToast(s, '🧪', 'Attaque test dans 3 secondes…')
      })
    },

    setVitesse: (v) => {
      set((s) => {
        if (!VITESSES.includes(v as (typeof VITESSES)[number])) return
        s.vitesse = v
      })
    },

    reclamerMission: (id) => {
      set((s) => {
        const def = MISSIONS_PAR_ID[id]
        if (!def || s.missionsReclamees.includes(id)) return
        if (!missionsActives(s.missionsReclamees).some((m) => m.id === id)) return
        const p = def.progres(s)
        if (p.cur < p.max) return
        const rec = def.recompense
        if (rec.res) {
          for (const [r, n] of Object.entries(rec.res) as [ResourceId, number][]) {
            s.resources[r] = clampRes(s, r, s.resources[r] + n)
          }
        }
        if (rec.faveur) s.faveur = Math.min(FAVEUR_MAX, s.faveur + rec.faveur)
        if (rec.pop) s.pop += rec.pop
        s.missionsReclamees.push(id)
        pushToast(s, def.emoji, `${def.titre} : récompense reçue !`)
      })
      get().save()
    },

    select: (b) => set((s) => void (s.selected = b)),
    openPanel: (p) =>
      set((s) => {
        s.panel = p
        if (p === 'aide') return
        if (!s.tutorialDone) s.tutorialDone = true
      }),
    fermerOffline: () => set((s) => void (s.offlineSummary = null)),
    fermerBattleReport: () => set((s) => void (s.battleReport = null)),

    save: () => {
      const s = get()
      const data: Record<string, unknown> = {}
      for (const k of CHAMPS_SAUVES) data[k] = s[k]
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch {
        // stockage plein / indisponible : tant pis pour cette fois
      }
    },

    reset: () => {
      // l'état mémoire est remis à neuf : ni l'autosave ni le `beforeunload`
      // ne peuvent ressusciter l'ancienne partie après ce point
      set((s) => {
        Object.assign(s, etatInitial(Date.now()))
        s.panel = 'aide'
        pushToast(s, '🏛️', 'Une nouvelle cité s’élève — tout est à rebâtir.')
      })
      try {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(ANCIEN_STORAGE_KEY)
      } catch {
        // stockage indisponible : la partie repart tout de même de zéro
      }
    },
  })),
)

/** total d'étoiles gagnées en campagne */
export function totalEtoiles(expeditions: Record<string, EtatExpedition>): number {
  return Object.values(expeditions).reduce((a, e) => a + e.etoiles, 0)
}

/** rappel pour l'UI : l'ennemi type d'une vague village est un EnemyId */
export function estEnemyId(x: string): x is EnemyId {
  return x in ENEMIES
}
