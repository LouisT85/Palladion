// ── Identifiants ──────────────────────────────────────────────────────────────
export type ResourceId = 'bois' | 'pierre' | 'grain' | 'bronze'
export type BuildingId =
  | 'agora'
  | 'remparts'
  | 'maisons'
  | 'ferme'
  | 'scierie'
  | 'carriere'
  | 'forge'
  | 'caserne'
  | 'temple'
  | 'port'
export type UnitId = 'lancier' | 'archer' | 'hoplite'
export type EnemyId = 'pillard' | 'guerrier' | 'mercenaire' | 'belier'
export type GodId = 'zeus' | 'poseidon' | 'athena' | 'ares'

export type Cost = Partial<Record<ResourceId, number>>

// ── Définitions (données statiques) ──────────────────────────────────────────
export interface BuildingDef {
  id: BuildingId
  nom: string
  emoji: string
  desc: string
  /** true = protégé par les remparts (à l'intérieur de l'enceinte) */
  interieur: boolean
  /** costs[i] = coût pour atteindre le niveau i+1 */
  costs: Cost[]
  /** times[i] = durée (s) pour atteindre le niveau i+1 */
  times: number[]
  /** Description visuelle/fonctionnelle de chaque niveau (index 0 = niveau 1) */
  niveaux: string[]
  pos: { x: number; y: number }
}

export interface UnitDef {
  id: UnitId
  nom: string
  emoji: string
  desc: string
  cost: Cost
  /** durée de formation (s) */
  time: number
  atk: number
  hp: number
  /** dégâts par seconde contre des remparts (en expédition) */
  wallDps: number
  ranged?: boolean
  /** niveau de caserne requis */
  caserne: number
}

export interface EnemyDef {
  id: EnemyId
  nom: string
  pluriel: string
  atk: number
  hp: number
  /** vitesse en px/s sur la carte */
  speed: number
  /** dégâts par seconde contre les remparts */
  wallDps: number
  /** coût dans le budget d'une vague */
  budget: number
}

export interface GodDef {
  id: GodId
  nom: string
  titre: string
  emoji: string
  couleur: string
  desc: string
  benediction: {
    nom: string
    desc: string
    cout: number
    cooldown: number // ms
    batailleUniquement: boolean
  }
  /** niveau de temple requis */
  temple: number
}

// ── État persistant ───────────────────────────────────────────────────────────
export interface BuildingState {
  level: number
  /** amélioration en cours */
  targetLevel?: number
  busyUntil?: number
}

/** un habitant du village, avec un nom et éventuellement un métier */
export interface Villageois {
  id: string
  nom: string
  /** bâtiment où il travaille — null = sans emploi, disponible pour l'enrôlement */
  poste: BuildingId | null
}

export interface RecruitJob {
  unit: UnitId
  restant: number
  /** fin de formation de l'unité en cours */
  finishAt: number
}

export interface MoraleModifier {
  id: string
  label: string
  delta: number
  /** null = permanent */
  expiresAt: number | null
}

export interface GodState {
  relation: number // -100..100
  cooldownUntil: number
}

/** un groupe d'une vague : ennemis (défense du village) ou vos unités (expédition) */
export interface WaveUnit {
  enemy: EnemyId | UnitId
  count: number
}

/** géométrie d'un champ de bataille (village défendu ou village attaqué) */
export interface BattleGeo {
  cx: number
  cy: number
  rx: number
  ry: number
  porte: { x: number; y: number }
  ralliement: { x: number; y: number }
  place: { x: number; y: number }
  spawn: { x: number; y: number }
}

export interface PendingEffect {
  at: number
  type: string
  payload?: Record<string, number | string>
}

export interface Report {
  id: string
  at: number
  emoji: string
  titre: string
  lignes: string[]
}

/** Instance d'événement actif : l'issue aléatoire est tirée à la création
 *  pour qu'Athéna puisse donner un indice VÉRIDIQUE. */
export interface ActiveEvent {
  defId: string
  roll: number // 0..1, fixe le destin des choix à issue incertaine
  startedAt: number
}

// ── Bataille (runtime, non sauvegardé) ────────────────────────────────────────
export type FighterState = 'marche' | 'siege' | 'melee' | 'mort' | 'fuite'

export interface Fighter {
  id: string
  camp: 'attaque' | 'defense'
  type: EnemyId | UnitId
  hp: number
  maxHp: number
  atk: number
  x: number
  y: number
  tx: number
  ty: number
  speed: number
  etat: FighterState
  /** index du secteur assailli (assaillants uniquement) */
  secteur?: number
  /** prochain coup autorisé (timestamp) */
  nextHit: number
  /** décalage d'animation */
  seed: number
  /** instant de la mort (les dépouilles restent visibles quelques secondes) */
  mortAt?: number
}

export interface Projectile {
  id: string
  x0: number
  y0: number
  x1: number
  y1: number
  start: number
  dur: number
  targetId: string
  dmg: number
}

export interface BattleEffect {
  id: string
  type: 'foudre' | 'benediction' | 'breche' | 'impact' | 'poussiere' | 'divin' | 'heros'
  x: number
  y: number
  until: number
  /** instant d'apparition — permet de jouer l'effet sur toute sa durée réelle */
  debut?: number
  /** effets divins : quel dieu frappe, et à quelle ferveur (0 maudit → 6 élu) */
  dieu?: GodId
  palier?: number
  /** effets de héros : lequel */
  heros?: string
}

export interface BattleResult {
  victoire: boolean
  fuite: boolean
  pertesDef: Partial<Record<UnitId, number>>
  pertesAtk: number
  vole: Partial<Record<ResourceId, number>>
  degatsRemparts: number
}

/** tour d'archers en bataille : position de tir + cadence propre */
export interface TourDef {
  x: number
  y: number
  nextHit: number
}

/**
 * Un front d'assaut : les assaillants se scindent en groupes qui attaquent
 * des secteurs distincts de l'enceinte. Chaque secteur a ses propres points
 * de structure et peut céder seul — c'est là que se joue la défense.
 */
export interface SecteurBataille {
  /** nom lisible du secteur (« porte de l'est », « mur nord »…) */
  nom: string
  /** angle sur l'ellipse de l'enceinte (0 = est / porte) */
  angle: number
  /** position du point faible, pour les jauges et la brèche */
  x: number
  y: number
  hp: number
  max: number
  breche: boolean
  /** un héros bouche la brèche de son corps : infranchissable jusqu'à cet instant */
  boucheeJusqua?: number
  /** un héros couvre ce pan : part des dégâts de siège absorbée, jusqu'à cet instant */
  abriJusqua?: number
  abriPart?: number
}

export interface BattleState {
  wave: WaveUnit[]
  fighters: Fighter[]
  projectiles: Projectile[]
  /** tours d'archers du camp défenseur (muettes une fois la brèche ouverte) */
  toursDef: TourDef[]
  /** fronts d'assaut — chaque secteur de mur cède indépendamment */
  secteurs: SecteurBataille[]
  effects: BattleEffect[]
  phase: 'approche' | 'siege' | 'melee' | 'fini'
  breche: boolean
  startedAt: number
  /** les bénédictions s'appliquent au camp du joueur */
  campJoueur: 'attaque' | 'defense'
  geo: BattleGeo
  defBuffUntil: number
  atkBuffUntil: number
  /** puissance des bénédictions en cours — dépend de la relation au dieu */
  defBuffForce?: number
  atkBuffForce?: number
  /** passifs de héros appliqués au camp du joueur, pour toute la bataille */
  bonusAtkJoueur?: number
  reducJoueur?: number
  result: BattleResult | null
  /** effectifs défenseurs engagés au départ (pour calculer les pertes) */
  engages: Partial<Record<UnitId, number>>
}

/** progression d'un village cible du mode campagne */
export interface EtatExpedition {
  etoiles: number
  dernierRaid: number
}

// ── Toasts (UI) ───────────────────────────────────────────────────────────────
export interface Toast {
  id: string
  emoji: string
  msg: string
  until: number
}
