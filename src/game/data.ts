import type {
  BuildingDef,
  BuildingId,
  EnemyDef,
  EnemyId,
  GodDef,
  GodId,
  ResourceId,
  UnitDef,
  UnitId,
} from './types'

// ── Constantes globales ───────────────────────────────────────────────────────
export const STORAGE_KEY = 'palladion-save-v1'
/** ancienne clé de sauvegarde (le jeu s'appelait ILION) — migrée au chargement */
export const ANCIEN_STORAGE_KEY = 'ilion-save-v1'
export const TICK_MS = 250
/** une journée de jeu = 8 minutes réelles */
export const DAY_MS = 8 * 60_000
export const OFFLINE_CAP_MS = 8 * 3_600_000
export const FAVEUR_MAX = 100
/** production de base (cueillette) même sans bâtiment, par minute —
 *  assez pour qu'un village ruiné puisse toujours se relever */
export const BASE_PROD: Record<ResourceId, number> = { bois: 3.5, pierre: 2.2, grain: 3.5, bronze: 0 }
/** capacité de stockage par niveau d'agora (index = niveau) */
export const STOCKAGE = [0, 350, 700, 1400, 2800]
/** HP des remparts par niveau */
export const WALL_HP = [0, 250, 600, 1250, 2200]
/** capacité de population par niveau de maisons */
export const POP_CAP = [4, 8, 14, 24, 40]
/** consommation de grain par minute */
export const CONSO_POP = 0.25
export const CONSO_SOLDAT = 0.5
/** premier assaut ~7 min après création du village, puis toutes les 8–16 min */
export const PREMIER_ASSAUT_MS = 7 * 60_000
export const ASSAUT_MIN_MS = 8 * 60_000
export const ASSAUT_MAX_MS = 16 * 60_000
/** délai d'alerte avant un assaut (remparts ≥2 : éclaireurs voient plus loin) */
export const ALERTE_MS = 5 * 60_000
export const ALERTE_LONGUE_MS = 6.5 * 60_000

/** mode test : `npm run dev:test` → ressources illimitées, chantiers quasi instantanés */
export const MODE_TEST: boolean = import.meta.env.MODE === 'test'

export const RES: Record<ResourceId, { nom: string; emoji: string }> = {
  bois: { nom: 'Bois', emoji: '🪵' },
  pierre: { nom: 'Pierre', emoji: '🪨' },
  grain: { nom: 'Grain', emoji: '🌾' },
  bronze: { nom: 'Bronze', emoji: '🥉' },
}

// ── Production par minute, par niveau (index = niveau du bâtiment) ───────────
export const PROD = {
  ferme: [0, 9, 15, 24, 38],
  scierie: [0, 10, 17, 27, 42],
  carriere: [0, 8, 13, 21, 33],
  forge: [0, 2.5, 4.5, 7, 11],
  temple: [0, 1.2, 2.2, 3.6, 5.5], // faveur
  port: [0, 0.8, 1.5, 2.4, 3.6], // bronze (commerce)
}

/** taux d'échange au port : donner N ressources → recevoir 1 (index = niveau) */
export const TAUX_PORT = [0, 4, 3, 2.5, 2]

// ── Bâtiments ─────────────────────────────────────────────────────────────────
export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  agora: {
    id: 'agora',
    nom: 'Agora',
    emoji: '🏛️',
    desc: "Cœur du village. Son niveau limite celui des autres bâtiments et fixe la capacité d'entrepôt.",
    interieur: true,
    costs: [
      { bois: 60, pierre: 40 },
      { bois: 120, pierre: 80 },
      { bois: 260, pierre: 220, bronze: 20 },
      { bois: 520, pierre: 480, bronze: 80 },
    ],
    times: [30, 75, 180, 360],
    niveaux: [
      'Une simple place de terre battue autour d’un autel.',
      'Un dallage de pierre, des étals et une stoa de bois.',
      'Colonnade de pierre, statue du fondateur, entrepôts.',
      'Grande agora dallée de marbre, digne d’une cité.',
    ],
    pos: { x: 560, y: 445 },
  },
  remparts: {
    id: 'remparts',
    nom: 'Remparts',
    emoji: '🧱',
    desc: 'Protègent le cœur du village. Chaque niveau change réellement la muraille — et sa résistance.',
    interieur: true,
    costs: [
      { bois: 90 },
      { bois: 80, pierre: 150 },
      { pierre: 380, bois: 120 },
      { pierre: 800, bronze: 70 },
    ],
    times: [40, 100, 220, 420],
    niveaux: [
      'Palissade de pieux taillés à la hâte.',
      'Muret de pierre sèche surmonté de pieux.',
      'Muraille de pierre crénelée, porte de chêne bardée de bronze.',
      'Hautes murailles « bâties par Poséidon » : tours de guet, créneaux, étendards.',
    ],
    pos: { x: 905, y: 445 },
  },
  maisons: {
    id: 'maisons',
    nom: 'Habitations',
    emoji: '🏠',
    desc: 'Abritent les villageois. Plus de population = plus de recrues possibles.',
    interieur: true,
    costs: [
      { bois: 50 },
      { bois: 110, pierre: 40 },
      { bois: 200, pierre: 140 },
      { bois: 320, pierre: 300 },
    ],
    times: [25, 60, 150, 300],
    niveaux: [
      'Quelques tentes et une cabane de branchages.',
      'Cabanes de torchis aux toits de chaume.',
      'Maisons de pierre, toits de tuiles rouges.',
      'Quartier prospère : étages, cours intérieures, oliviers.',
    ],
    pos: { x: 435, y: 525 },
  },
  ferme: {
    id: 'ferme',
    nom: 'Ferme',
    emoji: '🌾',
    desc: 'Produit le grain qui nourrit villageois et soldats. Hors des murs : vulnérable.',
    interieur: false,
    costs: [
      { bois: 60 },
      { bois: 130, pierre: 40 },
      { bois: 240, pierre: 130 },
      { bois: 400, pierre: 280, bronze: 30 },
    ],
    times: [30, 70, 160, 320],
    niveaux: [
      'Un champ d’orge et une hutte.',
      'Deux champs, un enclos à chèvres.',
      'Grands champs dorés, grange, bœufs de labour.',
      'Domaine agricole : oliveraie, moulin, greniers pleins.',
    ],
    pos: { x: 330, y: 655 },
  },
  scierie: {
    id: 'scierie',
    nom: 'Camp de bûcherons',
    emoji: '🪓',
    desc: 'Exploite la forêt du mont Ida. Hors des murs.',
    interieur: false,
    costs: [
      { bois: 30, pierre: 30 },
      { bois: 90, pierre: 70 },
      { bois: 180, pierre: 160 },
      { bois: 300, pierre: 320 },
    ],
    times: [30, 70, 160, 320],
    niveaux: [
      'Une souche, une hache, un tas de rondins.',
      'Appentis, scie de long, charrette.',
      'Scierie à treuil, grumes empilées.',
      'Grand chantier : grues de levage, radeaux de flottage.',
    ],
    pos: { x: 955, y: 240 },
  },
  carriere: {
    id: 'carriere',
    nom: 'Carrière',
    emoji: '⛏️',
    desc: 'Taille la pierre des collines. Hors des murs.',
    interieur: false,
    costs: [
      { bois: 50 },
      { bois: 110, pierre: 50 },
      { bois: 190, pierre: 170 },
      { bois: 280, pierre: 350, bronze: 20 },
    ],
    times: [30, 70, 160, 320],
    niveaux: [
      'Un front de taille et des coins de bois.',
      'Échafaudages, rampe de halage.',
      'Carrière étagée, blocs calibrés.',
      'Carrière monumentale : obélisques, colonnes en attente.',
    ],
    pos: { x: 150, y: 250 },
  },
  forge: {
    id: 'forge',
    nom: 'Forge de bronze',
    emoji: '⚒️',
    desc: 'Fond le cuivre et l’étain en bronze — armes, armures, outils.',
    interieur: true,
    costs: [
      { bois: 70, pierre: 60 },
      { bois: 140, pierre: 150 },
      { pierre: 300, bois: 180 },
      { pierre: 520, bois: 260 },
    ],
    times: [40, 90, 200, 380],
    niveaux: [
      'Un foyer, un soufflet, une enclume.',
      'Atelier couvert, moules à épées.',
      'Forge à deux foyers, râteliers d’armes.',
      'Manufacture d’Héphaïstos : fours jumeaux, cuirasses étincelantes.',
    ],
    pos: { x: 690, y: 350 },
  },
  caserne: {
    id: 'caserne',
    nom: 'Caserne',
    emoji: '🛡️',
    desc: 'Forme les défenseurs du village. Chaque niveau débloque de nouvelles unités.',
    interieur: true,
    costs: [
      { bois: 80, pierre: 40 },
      { bois: 160, pierre: 130 },
      { pierre: 320, bois: 180, bronze: 20 },
      { pierre: 600, bronze: 80 },
    ],
    times: [35, 90, 200, 380],
    niveaux: [
      'Un terrain d’exercice, des lances de frêne. Débloque : lanciers.',
      'Baraquements, cibles de tir. Débloque : archers.',
      'Cour d’armes pavée, panoplies de bronze. Débloque : hoplites.',
      'École de guerre : formation 25 % plus rapide.',
    ],
    pos: { x: 700, y: 525 },
  },
  temple: {
    id: 'temple',
    nom: 'Temple',
    emoji: '⚡',
    desc: 'Honore les Olympiens. Génère la Faveur divine et débloque leurs bénédictions.',
    interieur: true,
    costs: [
      { bois: 60, pierre: 80 },
      { pierre: 200, bois: 100 },
      { pierre: 420, bronze: 30 },
      { pierre: 800, bronze: 110 },
    ],
    times: [40, 100, 220, 400],
    niveaux: [
      'Un autel de pierre sous un vieux chêne. Culte : Zeus, Poséidon.',
      'Petit sanctuaire à fronton peint. Culte : + Athéna.',
      'Temple périptère à colonnes. Culte : + Arès.',
      'Grand temple de marbre, statue chryséléphantine. Bénédictions −25 % de faveur.',
    ],
    pos: { x: 430, y: 330 },
  },
  port: {
    id: 'port',
    nom: 'Port',
    emoji: '⚓',
    desc: 'Ouvre le commerce égéen : échange de ressources, revenus de bronze. Hors des murs.',
    interieur: false,
    costs: [
      { bois: 100 },
      { bois: 220, pierre: 80 },
      { bois: 380, pierre: 220 },
      { pierre: 520, bois: 400, bronze: 50 },
    ],
    times: [35, 90, 200, 380],
    niveaux: [
      'Un ponton de bois et une barque.',
      'Quai de pierre, voilier marchand.',
      'Deux quais, entrepôt, phare de fortune.',
      'Port franc : trirèmes, comptoirs phéniciens.',
    ],
    pos: { x: 165, y: 745 },
  },
}

export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[]

// ── Unités ────────────────────────────────────────────────────────────────────
export const UNITS: Record<UnitId, UnitDef> = {
  lancier: {
    id: 'lancier',
    nom: 'Lancier',
    emoji: '🗡️',
    desc: 'Milicien armé d’une lance à pointe de bronze. Bon marché, polyvalent.',
    cost: { bois: 25, bronze: 6 },
    time: 18,
    atk: 8,
    hp: 42,
    wallDps: 5,
    caserne: 1,
  },
  archer: {
    id: 'archer',
    nom: 'Archer',
    emoji: '🏹',
    desc: 'Tire depuis les remparts — intouchable tant que la muraille tient.',
    cost: { bois: 45, bronze: 8 },
    time: 26,
    atk: 7,
    hp: 26,
    wallDps: 2.5,
    ranged: true,
    caserne: 2,
  },
  hoplite: {
    id: 'hoplite',
    nom: 'Hoplite',
    emoji: '⚔️',
    desc: 'Infanterie lourde : bouclier rond, cuirasse de bronze. L’élite de la défense.',
    cost: { bronze: 38, grain: 25 },
    time: 55,
    atk: 17,
    hp: 95,
    wallDps: 9,
    caserne: 3,
  },
}
export const UNIT_IDS = Object.keys(UNITS) as UnitId[]

// ── Ennemis ───────────────────────────────────────────────────────────────────
export const ENEMIES: Record<EnemyId, EnemyDef> = {
  pillard: { id: 'pillard', nom: 'Pillard', pluriel: 'pillards', atk: 6, hp: 30, speed: 55, wallDps: 4, budget: 10 },
  guerrier: { id: 'guerrier', nom: 'Guerrier achéen', pluriel: 'guerriers achéens', atk: 11, hp: 62, speed: 42, wallDps: 8, budget: 25 },
  mercenaire: { id: 'mercenaire', nom: 'Mercenaire', pluriel: 'mercenaires', atk: 19, hp: 115, speed: 38, wallDps: 14, budget: 60 },
  belier: { id: 'belier', nom: 'Bélier de siège', pluriel: 'béliers de siège', atk: 4, hp: 240, speed: 25, wallDps: 34, budget: 80 },
}

// ── Dieux ─────────────────────────────────────────────────────────────────────
export const GODS: Record<GodId, GodDef> = {
  zeus: {
    id: 'zeus',
    nom: 'Zeus',
    titre: 'Roi des dieux, gardien de l’hospitalité',
    emoji: '⚡',
    couleur: '#e8c04a',
    desc: 'Juge les serments et l’accueil fait aux étrangers. Sa loi (xenia) punit qui ferme sa porte.',
    benediction: {
      nom: 'Foudre du Tonnerre',
      desc: 'La foudre s’abat sur les assaillants massés devant la porte (≈120 dégâts répartis).',
      cout: 50,
      cooldown: 240_000,
      batailleUniquement: true,
    },
    temple: 1,
  },
  poseidon: {
    id: 'poseidon',
    nom: 'Poséidon',
    titre: 'Ébranleur du sol, bâtisseur des murs de Troie',
    emoji: '🔱',
    couleur: '#4fa3a5',
    desc: 'Maître de la mer et des séismes. Il a bâti les murailles de Troie de ses propres mains.',
    benediction: {
      nom: 'Rempart du Trident',
      desc: 'Les pierres se ressoudent : restaure 45 % des points de structure des remparts.',
      cout: 40,
      cooldown: 240_000,
      batailleUniquement: false,
    },
    temple: 1,
  },
  athena: {
    id: 'athena',
    nom: 'Athéna',
    titre: 'Déesse aux yeux pers, stratège',
    emoji: '🦉',
    couleur: '#9fb4c7',
    desc: 'Sagesse et stratégie. Relation ≥ 25 : elle murmure la vérité cachée des dilemmes.',
    benediction: {
      nom: 'Égide stratège',
      desc: 'Vos défenseurs encaissent 60 % de dégâts en moins pendant 25 s.',
      cout: 35,
      cooldown: 240_000,
      batailleUniquement: true,
    },
    temple: 2,
  },
  ares: {
    id: 'ares',
    nom: 'Arès',
    titre: 'Fléau des mortels, dieu de la guerre',
    emoji: '🐗',
    couleur: '#c0563f',
    desc: 'La violence de la bataille. Capricieux, mais généreux avec qui verse le sang.',
    benediction: {
      nom: 'Fureur sanglante',
      desc: 'En bataille : +60 % d’attaque pendant 25 s. Hors bataille : file de recrutement accélérée de moitié.',
      cout: 35,
      cooldown: 240_000,
      batailleUniquement: false,
    },
    temple: 3,
  },
}
export const GOD_IDS = Object.keys(GODS) as GodId[]

// ── Géométrie de la carte (viewBox 1200 × 800) ───────────────────────────────
export const MAP = {
  w: 1200,
  h: 800,
  /** enceinte elliptique du village */
  mur: { cx: 575, cy: 445, rx: 330, ry: 195 },
  /** porte à l'est (angle 0 de l'ellipse) */
  porte: { x: 905, y: 445 },
  /** point de ralliement des défenseurs, dans l'enceinte */
  ralliement: { x: 820, y: 450 },
  /** cœur du village (pillage) */
  place: { x: 600, y: 445 },
  /** zone d'apparition des assaillants (bord est) */
  spawn: { x: 1170, y: 490 },
}

/** point sur l'enceinte à l'angle donné (radians, 0 = est, sens horaire écran) */
export function pointMur(angle: number): { x: number; y: number } {
  return {
    x: MAP.mur.cx + MAP.mur.rx * Math.cos(angle),
    y: MAP.mur.cy + MAP.mur.ry * Math.sin(angle),
  }
}

/** positions de tir des archers selon le niveau des remparts */
export function postesArchers(niveau: number): { x: number; y: number }[] {
  if (niveau <= 0) return [{ x: MAP.ralliement.x, y: MAP.ralliement.y }]
  const angles = niveau >= 3 ? [-0.55, -0.2, 0.2, 0.55] : [-0.35, 0.35]
  return angles.map(pointMur)
}
