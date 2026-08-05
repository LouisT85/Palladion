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
export type UnitId = 'lancier' | 'archer' | 'hoplite' | 'frondeur' | 'peltaste' | 'belier' | 'char'
/** les héros de la matière troyenne - leurs fiches vivent dans heros.ts */
export type HeroId =
  | 'hector'
  | 'ulysse'
  | 'achille'
  | 'ajax'
  | 'agamemnon'
  | 'cassandre'
  | 'enee'
  | 'diomede'
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
  /**
   * Points de structure. Une fois l'enceinte percée, les assaillants s'en
   * prennent aux bâtiments : chacun tient un moment, brûle, et retombe d'un
   * niveau. Sans cela, la chute des remparts valait la fin de la partie et l'on
   * perdait tout l'intérêt du dernier quart d'heure d'un siège.
   * `undefined` = intact (les sauvegardes d'avant n'en ont pas).
   */
  hp?: number
  /** en ruine : niveau perdu, à relever avant de produire à nouveau */
  ruine?: boolean
}

/**
 * Les cinq ouvrages de l'intérieur, tous attestés dans les citadelles de l'âge
 * du bronze égéen (Mycènes, Tirynthe, Troie VI). Ils ne servent qu'après la
 * brèche — c'est leur raison d'être : donner au joueur de quoi se battre encore
 * quand le mur est tombé, au lieu de regarder l'inévitable.
 */
export interface DefensesInterieures {
  /**
   * Le « mur dans le mur » qui ceignait le mégaron au sommet de Mycènes :
   * une seconde enceinte autour du cœur, à franchir avant d'atteindre l'agora.
   */
  acropole: number
  /**
   * Le bastion de la porte des Lionnes : sept mètres de saillant qui prenaient
   * l'assaillant par son flanc découvert, celui que le bouclier ne couvre pas.
   */
  bastion: boolean
  /**
   * Les galeries voûtées de Tirynthe, creusées dans l'épaisseur du rempart :
   * casernement à l'abri, d'où les hommes sortent frais.
   */
  galeries: boolean
  /** La poterne du nord de Mycènes : porte dérobée pour une sortie à revers. */
  poterne: boolean
  /**
   * L'escalier corbellé de quatre-vingt-dix-neuf marches vers la citerne
   * taillée dans le roc : de l'eau, donc un siège qui ne brise pas les nerfs.
   */
  citerne: boolean
}

/**
 * Comment on joue. Quatre modes, un seul moteur :
 *  · `bac-a-sable` : le village libre, sans fin écrite ;
 *  · `campagne` : « La Chute », cinq actes et leurs objectifs ;
 *  · `siege` : les vagues s'enchaînent sans répit, on compte combien on en tient ;
 *  · `defi` : une graine partagée, la même Troade pour tous, un score comparable.
 */
export type ModeJeu = 'bac-a-sable' | 'campagne' | 'siege' | 'defi'

/** un habitant du village, avec un nom et éventuellement un métier */
export interface Villageois {
  id: string
  nom: string
  /** bâtiment où il travaille - null = sans emploi, disponible pour l'enrôlement */
  poste: BuildingId | null
  /**
   * Son métier de naissance, parmi les six qui s'apprennent au village. À son
   * métier il rend pleinement ; ailleurs, il fait ce qu'il peut. C'est ce qui
   * rend l'affectation intéressante à décider soi-même.
   */
  metier: BuildingId
  /**
   * Jour de jeu de sa naissance. Une journée vaut deux ans de vie : l'âge se
   * déduit donc du calendrier, sans compteur à faire tourner. Absent sur les
   * sauvegardes antérieures aux lignées - on les lit alors comme des adultes.
   */
  neLe?: number
  /** sa maison. Elle se transmet de père en enfant et interdit les mariages entre soi. */
  lignee?: string
  /** l'id de son conjoint - un foyer, donc des naissances possibles */
  conjoint?: string
  /** prénoms de ses parents, pour le recensement : « fils de Damon et Théano » */
  parents?: [string, string]
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
  /**
   * L'adversaire que cet homme a choisi, et qu'il garde.
   *
   * Sans mémoire de cible, chaque tick réélisait « le plus proche » : deux
   * ennemis presque à égale distance faisaient donc osciller le combattant
   * entre eux, et l'on voyait les colonnes d'expédition foncer, dépasser leur
   * proie, revenir. Un homme s'engage sur un adversaire et ne le lâche que s'il
   * tombe, s'enfuit, ou s'éloigne franchement.
   */
  cibleId?: string
  /** prochain coup autorisé (timestamp) */
  nextHit: number
  /** décalage d'animation */
  seed: number
  /** instant de la mort (les dépouilles restent visibles quelques secondes) */
  mortAt?: number
  /**
   * Ce combattant EST un héros : il porte ses couleurs sur le champ de bataille
   * et ne compte pas dans les pertes de la garnison - un héros abattu est
   * blessé, pas rayé de l'effectif.
   */
  heros?: HeroId
  /**
   * Dépêché par un village allié. Ils tombent avant vos hommes - encore faut-il
   * les reconnaître sur le rempart : ils portaient jusqu'ici vos propres
   * couleurs, si bien que l'aide d'un allié ne se voyait que dans le rapport.
   */
  allie?: boolean
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
  /** instant d'apparition - permet de jouer l'effet sur toute sa durée réelle */
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
 * de structure et peut céder seul - c'est là que se joue la défense.
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

/**
 * Posture de la ligne de mêlée du joueur. Trois façons de tenir un choc, et
 * aucune n'est bonne partout : le mur encaisse mais ne poursuit pas, la charge
 * tue vite mais expose, tenir ne fait ni l'un ni l'autre.
 */
export type OrdreLigne = 'tenir' | 'mur' | 'charge'
/** Tendu : on vise l'homme le plus proche. En cloche : on arrose le plus gros tas. */
export type OrdreTir = 'tendu' | 'cloche'

export interface OrdresBataille {
  ligne: OrdreLigne
  tir: OrdreTir
  /**
   * Secteur assigné à un type d'unité (index dans `secteurs`). Les hommes de ce
   * type s'y portent et n'y frappent que ce qui l'assaille - c'est ainsi qu'on
   * répond à un assaut sur trois fronts avec une garnison qui n'est pas triple.
   */
  secteurs: Partial<Record<UnitId, number>>
  /** un ordre se donne, puis se tient : instant du prochain changement permis */
  prochainAt: number
}

/** le champion ennemi en cours de bataille, et où en est sa manœuvre */
export interface EtatChampion {
  id: HeroId
  nom: string
  emoji: string
  /** instant où il lancera sa capacité (0 = déjà lancée) */
  capaciteA: number
  /** elle est tombée : on ne la relance pas */
  lancee: boolean
  /** il est mort sous vos murs - sa capacité meurt avec lui */
  abattu: boolean
  /** identifiant du combattant qui le porte, pour le retrouver */
  fighterId: string
  /** sa colonne frappe plus fort jusqu'à cet instant */
  atkUntil: number
  atkBonus: number
  /** sa colonne encaisse moins jusqu'à cet instant */
  reducUntil: number
  reduc: number
  /** vos hommes rompent plus tôt jusqu'à cet instant */
  terreurUntil: number
  terreurSeuil: number
}

export interface BattleState {
  wave: WaveUnit[]
  fighters: Fighter[]
  projectiles: Projectile[]
  /** tours d'archers du camp défenseur (muettes une fois la brèche ouverte) */
  toursDef: TourDef[]
  /** fronts d'assaut - chaque secteur de mur cède indépendamment */
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
  /** puissance des bénédictions en cours - dépend de la relation au dieu */
  defBuffForce?: number
  atkBuffForce?: number
  /** passifs de héros appliqués au camp du joueur, pour toute la bataille */
  bonusAtkJoueur?: number
  reducJoueur?: number
  /** allonge du tir des tours (1 = portée normale) - grâce de Poséidon */
  porteeTours?: number
  /**
   * Moral de chaque camp : la part de ses effectifs encore debout. Sous un seuil,
   * les hommes rompent un par un - et un héros vivant abaisse ce seuil. C'est ce
   * qui fait qu'une ligne s'effrite au lieu de fondre jusqu'au dernier.
   */
  moral?: { attaque: number; defense: number }
  /** ordres donnés par le joueur - absent = posture neutre, tir tendu */
  ordres?: OrdresBataille
  /**
   * Le champion achéen qui mène la colonne, s'il y en a un. Il porte un NOM
   * connu - l'un des huit héros de la matière troyenne, précisément ceux qu'on
   * peut recruter - et retourne sa capacité contre le village.
   */
  champion?: EtatChampion
  result: BattleResult | null
  /** effectifs défenseurs engagés au départ (pour calculer les pertes) */
  engages: Partial<Record<UnitId, number>>
}

/** progression d'un village cible du mode campagne */
export interface EtatExpedition {
  etoiles: number
  dernierRaid: number
  /** pillages encaissés : le village s'en souvient et renforce sa garnison */
  pillages?: number
}

/** un village allié : il paie tribut et envoie des hommes quand on l'appelle */
export interface Alliance {
  depuis: number
  /** prochain versement du tribut */
  tributAt: number
  /**
   * Un mariage a scellé cette alliance : elle ne se dénoue plus, quoi qu'il
   * arrive à la relation, et le tribut est doublé. C'est ce qu'on achète en
   * donnant un habitant - et c'est le seul engagement irréversible du jeu.
   */
  mariage?: { villageois: string; lignee?: string; depuis: number }
}

// ── Toasts (UI) ───────────────────────────────────────────────────────────────
export interface Toast {
  id: string
  emoji: string
  msg: string
  until: number
}
