import type {
  BuildingDef,
  BuildingId,
  Cost,
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
/** ancienne clé de sauvegarde (le jeu s'appelait ILION) - migrée au chargement */
export const ANCIEN_STORAGE_KEY = 'ilion-save-v1'
export const TICK_MS = 250
/** une journée de jeu = 8 minutes réelles */
export const DAY_MS = 8 * 60_000
export const OFFLINE_CAP_MS = 8 * 3_600_000
export const FAVEUR_MAX = 100
/** production de base (cueillette) même sans bâtiment, par minute -
 *  assez pour qu'un village ruiné puisse toujours se relever */
export const BASE_PROD: Record<ResourceId, number> = { bois: 3.5, pierre: 2.2, grain: 3.5, bronze: 0 }
/** capacité de stockage par niveau d'agora (index = niveau) */
export const STOCKAGE = [0, 350, 700, 1400, 2800]
/** HP des remparts par niveau */
export const WALL_HP = [0, 250, 600, 1250, 2200]
/** tours d'archers constructibles sur l'enceinte (index = niveau des remparts) */
export const TOURS_MAX = [0, 0, 1, 2, 4]
/** coût de la n-ième tour (index = tours déjà bâties) */
export const TOUR_COUTS: Cost[] = [
  { pierre: 140, bois: 60 },
  { pierre: 240, bois: 90, bronze: 15 },
  { pierre: 380, bronze: 35 },
  { pierre: 560, bronze: 60 },
]
// ── Structure des bâtiments et défenses de l'intérieur ───────────────────────

/**
 * Points de structure d'un bâtiment selon son niveau. L'agora abrite le
 * Palladion : c'est le cœur, et c'est sa chute qui décide de la partie — elle
 * tient donc bien plus longtemps que le reste.
 */
export function structureMax(id: BuildingId, level: number): number {
  if (level <= 0) return 0
  if (id === 'agora') return 240 * level
  if (id === 'remparts') return 0 // les remparts ont leurs propres secteurs
  /*
   * La Redoute est le seul édifice du village qui soit un OUVRAGE : un massif de
   * pierre appareillée, pas une grange. Elle tient donc deux fois ce que tient
   * un atelier - et il faut bien qu'elle tienne, puisque la réduire au silence
   * est le seul moyen d'arrêter ses traits.
   *
   * Ni plus : à 130 par niveau, cinq pillards acharnés (9 points par seconde
   * chacun, soit 45) démolissent le premier niveau en une demi-minute. La brèche
   * ne devient pas une formalité.
   */
  if (id === 'redoute') return 130 * level
  return 65 * level
}

/** dégâts qu'un assaillant porte à un bâtiment, par seconde */
export const DPS_BATIMENT = 9

/**
 * Les cinq ouvrages intérieurs et ce qu'ils coûtent. Ils ne se débloquent qu'une
 * fois l'enceinte digne de ce nom : on ne creuse pas une poterne dans une
 * palissade.
 */
export const DEFENSES_DEFS = {
  acropole: {
    nom: 'Muraille d’acropole',
    emoji: '🏯',
    desc:
      'Le « mur dans le mur » de Mycènes : une seconde enceinte autour du cœur. Les assaillants doivent la percer avant de toucher à l’agora.',
    effet: (n: number) => `+${n * 420} points de structure autour du cœur`,
    rempartsRequis: 2,
    /** deux niveaux : muret puis vraie muraille cyclopéenne */
    max: 2,
    couts: [
      { pierre: 320, bois: 120 },
      { pierre: 620, bronze: 60 },
    ] as Cost[],
  },
  bastion: {
    nom: 'Bastion de la porte',
    emoji: '🗼',
    desc:
      'Le saillant de la porte des Lionnes : sept mètres de mur qui prennent l’assaillant par son flanc découvert, celui que le bouclier ne protège pas.',
    effet: () => 'Les assaillants de la porte perdent 6 PV/s tant que le pan tient',
    rempartsRequis: 3,
    max: 1,
    couts: [{ pierre: 400, bronze: 45 }] as Cost[],
  },
  galeries: {
    nom: 'Galeries casematées',
    emoji: '🕳️',
    desc:
      'Les couloirs voûtés de Tirynthe, creusés dans l’épaisseur du rempart : vos hommes s’y abritent et en sortent frais.',
    effet: () => 'Les défenseurs sur les murs subissent 35 % de dégâts en moins',
    rempartsRequis: 3,
    max: 1,
    couts: [{ pierre: 480, bois: 160 }] as Cost[],
  },
  poterne: {
    nom: 'Poterne dérobée',
    emoji: '🚪',
    desc:
      'La porte du nord de Mycènes, invisible de la plaine : on en sort à revers sur l’assaillant occupé à cogner.',
    effet: () => 'La charge de vos hommes porte 30 % plus fort',
    rempartsRequis: 2,
    max: 1,
    couts: [{ pierre: 260, bois: 140 }] as Cost[],
  },
  citerne: {
    nom: 'Citerne secrète',
    emoji: '💧',
    desc:
      'Quatre-vingt-dix-neuf marches corbellées jusqu’à l’eau taillée dans le roc. Un village qui boit ne se mutine pas.',
    effet: () => 'L’ambiance ne descend plus sous 30 pendant un siège',
    rempartsRequis: 2,
    max: 1,
    couts: [{ pierre: 300, bois: 90 }] as Cost[],
  },
} as const

export type DefenseId = keyof typeof DEFENSES_DEFS
export const DEFENSE_IDS = Object.keys(DEFENSES_DEFS) as DefenseId[]

/** structure apportée au cœur par la muraille d'acropole */
export function hpAcropole(n: number): number {
  return n * 420
}

/** portée de tir d'une tour (px carte) */
export const TOUR_PORTEE = 240
export const TOUR_DMG = 11
export const TOUR_CADENCE_MS = 2800
/**
 * Emplacements sur l'enceinte, par ordre de construction (angle 0 = porte, est).
 * Les deux premières flanquent la porte, la 3ᵉ couvre le mur sud et la 4ᵉ le mur
 * nord : une tour ne défend que son arc, donc les quatre finissent nécessaires.
 */
export const TOUR_ANGLES = [0.42, -0.42, 1.55, -1.55]

/*
 * ═══════════════════ LA REDOUTE : LA GUERRE DU DEDANS ═══════════════════
 *
 * Les cinq ouvrages de `DEFENSES_DEFS` sont PASSIFS - de la structure, des
 * modificateurs, des couloirs. Aucun ne se bat. Une fois le mur passé, il ne
 * restait donc que la mêlée : la tour d'archers se taisait (son pan était
 * tombé), et l'intérieur de l'enceinte n'avait pas une arme à opposer.
 *
 * La Redoute est le pendant EXACT de la tour, tourné vers le dedans. Elle est
 * muette tant que l'enceinte tient - elle n'a rien à voir de la plaine - et
 * n'ouvre le feu qu'à la brèche, sur ce qui entre. Ses scorpions percent bien
 * plus fort qu'un arc mais se remontent lentement : deux ou trois assaillants
 * cloués par salve, pas une pluie de flèches.
 *
 * ANACHRONISME ASSUMÉ. Le scorpion est une machine du IVᵉ siècle, sept cents ans
 * après Troie. C'est le prix d'une défense intérieure qui COMBATTE vraiment -
 * et il reste bien plus proche du monde d'Homère qu'un canon.
 */
/*
 * ── ELLE EST UN BÂTIMENT, ET PLUS UN COMPTEUR ──
 *
 * La Redoute était un `s.redoute` de 0 à 3, bâti depuis le panneau des remparts
 * et interdit avant des remparts de niveau 2. Elle est désormais le onzième
 * `BuildingId` : quatre niveaux, un coût et une durée par niveau, sa case sur la
 * carte, son panneau, sa structure via `structureMax`. Et CONSTRUCTIBLE
 * D'EMBLÉE : `REDOUTE_REMPARTS_REQUIS` n'existe plus.
 *
 * L'ÉQUILIBRE, parce que « d'emblée » change tout. La première bande arrive à la
 * onzième minute avec une menace de 10, soit un budget de 55 : cinq ou six
 * pillards, 30 points de vie chacun. Un unique scorpion à 30 de dégâts en tuait
 * donc un par trait et rendait ce premier assaut sans objet. Deux leviers
 * répondent à cela, et aucun n'est une interdiction :
 *
 *  1. LE TRAIT MONTE AVEC L'OUVRAGE (`REDOUTE_DMG` par niveau). À 18, le trait
 *     du premier niveau ne tue plus un pillard d'un coup : cinq pillards, c'est
 *     trente secondes de tir pour une pièce seule. À 38, celui du quatrième
 *     abat un mercenaire en trois traits.
 *  2. LE BRONZE. Le niveau 1 en demande 18 quand la partie en donne 24 et qu'un
 *     lancier en coûte 6 : élever la Redoute au premier jour, c'est renoncer à
 *     trois lances. C'est un arbitrage, pas un verrou - exactement ce qu'on veut
 *     d'un bâtiment ouvert dès le début.
 */
/** quatre niveaux : un scorpion, puis deux, trois, quatre */
export const REDOUTE_MAX = 4
/**
 * Le coût, calé sur les autres niveaux 1 (90 à 140 de matière) : la Redoute est
 * le plus cher de tous, et le seul à réclamer du bronze pour naître. Un ouvrage
 * de guerre se paie ; une palissade non.
 */
export const REDOUTE_COUTS: Cost[] = [
  { pierre: 110, bois: 70, bronze: 18 },
  { pierre: 240, bois: 130, bronze: 45 },
  { pierre: 430, bois: 180, bronze: 80 },
  { pierre: 720, bois: 260, bronze: 130 },
]
/** courte portée : elle tient la place, pas la plaine */
export const REDOUTE_PORTEE = 210
/**
 * Dégâts d'un trait, par niveau (index 0 = niveau 1). Un trait de scorpion vaut
 * plusieurs flèches - mais il part trois fois moins souvent, et le premier
 * niveau ne suffit PAS à coucher un pillard d'un coup.
 */
export const REDOUTE_DMG = [18, 24, 30, 38]
export const REDOUTE_CADENCE_MS = 3600
/** vitesse du trait (px/s) : plus tendu qu'une flèche, presque à plat */
export const REDOUTE_VITESSE = 420
/** force du trait au niveau donné - hors chantier, elle ne tire pas */
export function redouteDmg(n: number): number {
  return REDOUTE_DMG[Math.max(1, Math.min(REDOUTE_MAX, n)) - 1]
}
/**
 * Postes de tir, un par niveau - décalés pour que les quatre se voient. Le
 * quatrième est le plus haut : le massif du dernier niveau porte son plancher
 * plus haut, et l'affût du milieu se lisait mal collé aux trois autres.
 */
export const REDOUTE_POSTES = [
  { dx: -2, dy: -44 },
  { dx: -24, dy: -38 },
  { dx: 21, dy: -38 },
  { dx: 43, dy: -34 },
]

/**
 * Secteurs assaillables de l'enceinte. Une vague se scinde entre ces fronts ;
 * chaque secteur encaisse ses propres dégâts et peut céder seul.
 * `spawn` : par où débouche la colonne ennemie (hors carte).
 */
export const SECTEURS: { id: string; nom: string; angle: number; spawn: { x: number; y: number } }[] = [
  { id: 'porte', nom: 'Porte de l’est', angle: 0, spawn: { x: 1170, y: 470 } },
  { id: 'sud', nom: 'Mur du sud', angle: 1.5, spawn: { x: 700, y: 790 } },
  { id: 'nord', nom: 'Mur du nord', angle: -1.5, spawn: { x: 470, y: 120 } },
]

/** nombre de fronts d'une vague selon la menace - la guerre se complique */
export function nbFronts(threat: number): number {
  if (threat >= 55) return 3
  if (threat >= 28) return 2
  return 1
}
/** capacité de population par niveau de maisons */
export const POP_CAP = [7, 13, 22, 34, 52]

/**
 * Postes de travail par bâtiment (index = niveau). Un bâtiment ne produit
 * qu'au prorata de ses postes pourvus : sans ouvrier, pas de récolte.
 * La cueillette de base (BASE_PROD) reste acquise - le village ne se bloque jamais.
 */
export const POSTES: Partial<Record<BuildingId, number[]>> = {
  ferme: [0, 1, 2, 3, 4],
  scierie: [0, 1, 2, 3, 4],
  carriere: [0, 1, 2, 3, 4],
  forge: [0, 1, 1, 2, 3],
  temple: [0, 1, 1, 2, 2],
  port: [0, 1, 1, 2, 2],
}

/** intitulé du métier, pour l'affectation */
export const METIERS: Partial<Record<BuildingId, string>> = {
  ferme: 'Paysan',
  scierie: 'Bûcheron',
  carriere: 'Tailleur de pierre',
  forge: 'Forgeron',
  temple: 'Prêtre',
  port: 'Docker',
}

/** les six métiers qu'un villageois peut avoir appris en naissant */
export const METIER_IDS = Object.keys(METIERS) as BuildingId[]

/**
 * Rendement d'un villageois hors de son métier. Un paysan sait tenir une pioche,
 * mais pas comme un tailleur de pierre : placer chacun à sa place doit se voir
 * dans les chiffres, sinon l'affectation n'est qu'une corvée de clics.
 */
export const RENDEMENT_HORS_METIER = 0.55

/**
 * Métier tiré à la naissance. Pondéré : il naît plus de paysans et de bûcherons
 * que de prêtres - le village a besoin de manger avant d'avoir besoin de prier,
 * et un prêtre qui se fait attendre a de la valeur.
 */
export const POIDS_METIERS: { id: BuildingId; poids: number }[] = [
  { id: 'ferme', poids: 30 },
  { id: 'scierie', poids: 22 },
  { id: 'carriere', poids: 20 },
  { id: 'forge', poids: 12 },
  { id: 'port', poids: 10 },
  { id: 'temple', poids: 6 },
]

export function tirerMetier(): BuildingId {
  const somme = POIDS_METIERS.reduce((a, m) => a + m.poids, 0)
  let r = Math.random() * somme
  for (const m of POIDS_METIERS) {
    r -= m.poids
    if (r <= 0) return m.id
  }
  return 'ferme'
}

/**
 * Les sept premiers habitants, dans l'ordre où ils arrivent. Un métier de
 * chaque, plus un second paysan - parce que la ferme ouvre deux postes avant
 * tous les autres.
 *
 * Le tirage pondéré seul ne suffisait pas : sur sept lancers, il laissait
 * couramment le village sans prêtre ET sans docker, donc sans faveur ni
 * commerce, avec quatre paysans qui se marchaient dessus. Un village de départ
 * ne doit pas dépendre d'un coup de dé.
 */
export const METIERS_DEPART: BuildingId[] = [
  'ferme',
  'scierie',
  'carriere',
  'ferme',
  'temple',
  'forge',
  'port',
]

/**
 * Métier du prochain-né, choisi pour combler le plus grand MANQUE du village
 * au regard des poids ci-dessus. Toujours pondéré à long terme - il naîtra bien
 * trois fois plus de paysans que de prêtres - mais sans jamais laisser un métier
 * entier absent pendant vingt minutes.
 */
export function metierManquant(deja: BuildingId[]): BuildingId {
  const somme = POIDS_METIERS.reduce((a, m) => a + m.poids, 0)
  const n = deja.length + 1
  let choix: BuildingId = 'ferme'
  let pire = -Infinity
  for (const m of POIDS_METIERS) {
    const attendu = (m.poids / somme) * n
    const manque = attendu - deja.filter((x) => x === m.id).length
    // à égalité, le métier le plus courant passe devant : l'ordre des poids tranche
    if (manque > pire) {
      pire = manque
      choix = m.id
    }
  }
  return choix
}

/** noms grecs donnés aux habitants - le village cesse d'être un compteur */
export const NOMS_VILLAGEOIS = [
  'Alexios', 'Nikandros', 'Théron', 'Kleitos', 'Damon', 'Lysandre', 'Périclès', 'Straton',
  'Timon', 'Xanthos', 'Hégias', 'Oreste', 'Phidias', 'Kallias', 'Mélanthos', 'Aristée',
  'Eumée', 'Glaukos', 'Thrasos', 'Iphitos', 'Kréon', 'Léonidas', 'Myron', 'Néléos',
  'Aglaé', 'Briséis', 'Chryséis', 'Danaé', 'Eurydice', 'Phyllis', 'Hélénè', 'Ismène',
  'Kalliopé', 'Lysippé', 'Myrrhine', 'Nausicaa', 'Olympias', 'Penthéa', 'Rhodè', 'Sostraté',
  'Théano', 'Xanthippé', 'Zéuxis', 'Andromaque', 'Kléobis', 'Praxis', 'Simonidès', 'Télamon',
  'Antiphon', 'Bathyclès', 'Diomède', 'Épiktétos', 'Phrynè', 'Hipparque', 'Iolaos', 'Kydias',
] as const

/**
 * Puissance d'une bénédiction selon la relation au dieu (−100…+100).
 * Un dieu chéri frappe fort (×1.6), un dieu bafoué se contente du minimum (×0.4).
 * C'est ce qui donne enfin du poids à la jauge de relation.
 */
export function multRelation(relation: number): number {
  return 1 + (Math.max(-100, Math.min(100, relation)) / 100) * 0.6
}

/**
 * Index du palier de ferveur : 0 maudit … 3 indifférent … 6 élu.
 * Pilote la couleur de la jauge ET la mise en scène des bénédictions -
 * un dieu offensé ne doit pas frapper comme un dieu qui vous chérit.
 */
export function palierFerveur(relation: number): number {
  if (relation >= 70) return 6
  if (relation >= 40) return 5
  if (relation >= 15) return 4
  if (relation > -15) return 3
  if (relation > -40) return 2
  if (relation > -70) return 1
  return 0
}

/** libellé de la ferveur, pour l'UI */
export function nomFerveur(relation: number): string {
  if (relation >= 70) return 'Élu du dieu'
  if (relation >= 40) return 'Chéri'
  if (relation >= 15) return 'En grâce'
  if (relation > -15) return 'Indifférent'
  if (relation > -40) return 'Contrarié'
  if (relation > -70) return 'Offensé'
  return 'Maudit'
}
/** consommation de grain par minute */
export const CONSO_POP = 0.25
export const CONSO_SOLDAT = 0.5
/** premier assaut ~7 min après création du village, puis toutes les 8-16 min */
/*
 * Le premier assaut d'une partie neuve. Sept minutes ne suffisaient pas : avec
 * 220 de bois au départ, il faut compter la ferme (60), le camp de bûcherons
 * (30 + 30), la palissade (90) et la caserne (70 + 60) avant d'avoir une seule
 * lance - soit plus que la réserve, donc il faut attendre la cueillette. Onze
 * minutes laissent le temps de bâtir DANS L'ORDRE plutôt que de choisir entre
 * manger et se défendre.
 */
export const PREMIER_ASSAUT_MS = 11 * 60_000
export const ASSAUT_MIN_MS = 8 * 60_000
export const ASSAUT_MAX_MS = 16 * 60_000

/**
 * Menace maximale des deux premiers assauts d'une partie. Ils tâtent le terrain :
 * une bande de trois pillards, pas une colonne. Sans ce plafond, la formule
 * générale (bâtiments + minutes) offrait cinq à six pillards à un village qui
 * n'avait encore ni mur ni garnison - et la partie commençait par un pillage
 * qu'aucune décision du joueur ne pouvait éviter.
 */
export const MENACE_PREMIERS_ASSAUTS = 6
export const ASSAUTS_DE_GRACE = 2
/** délai d'alerte avant un assaut (remparts ≥2 : éclaireurs voient plus loin) */
export const ALERTE_MS = 5 * 60_000
export const ALERTE_LONGUE_MS = 6.5 * 60_000

/** mode test : `npm run dev:test` → ressources illimitées, chantiers quasi instantanés */
export const MODE_TEST: boolean = import.meta.env.MODE === 'test'

/**
 * Les pictogrammes peints (composant `Icone`) remplacent l'émoji partout où
 * l'interface a la place. L'émoji ne sert plus qu'aux textes courants -
 * rapports, toasts - d'où le choix du lingot 🪙 plutôt que de la médaille 🥉,
 * qui se lisait « troisième place » et non « métal ».
 */
export const RES: Record<ResourceId, { nom: string; emoji: string }> = {
  bois: { nom: 'Bois', emoji: '🪵' },
  pierre: { nom: 'Pierre', emoji: '🪨' },
  grain: { nom: 'Grain', emoji: '🌾' },
  bronze: { nom: 'Bronze', emoji: '🪙' },
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

/*
 * ── LE COMPTOIR D'ÉCHANGE ────────────────────────────────────────────────────
 *
 * L'ancien comptoir appliquait le MÊME taux à tout : 40 de n'importe quoi
 * donnaient 10 de n'importe quoi d'autre. On y fabriquait donc du bronze avec
 * du grain - la forge et le port devenaient inutiles, et l'inverse (40 bronze
 * pour 10 bois) n'avait aucun sens pour le joueur.
 *
 * Le comptoir raisonne maintenant en VALEUR. La référence est le bois, qui
 * sort le plus vite de terre (10/min au premier niveau) ; le bronze, quatre
 * fois plus lent à produire, vaut quatre fois plus. La marge du comptoir est
 * ce que les marchands prélèvent : écrasante au petit quai, honnête au port
 * franc - améliorer le port change vraiment quelque chose.
 */
export const VALEUR_RES: Record<ResourceId, number> = {
  bois: 1,
  pierre: 1.25,
  grain: 1,
  bronze: 4,
}

/** marge prélevée par les marchands (index = niveau du port) */
export const MARGE_PORT = [0, 1.7, 1.45, 1.28, 1.15]

/** lot reçu à chaque échange - un chiffre rond, le joueur n'a rien à calculer */
export const LOT_ECHANGE = 10

/** ce que coûte un lot de `recevoir`, payé en `donner`, au port de ce niveau */
export function coutEchange(niveau: number, donner: ResourceId, recevoir: ResourceId): number {
  const marge = MARGE_PORT[niveau] ?? 0
  if (marge === 0) return 0
  return Math.ceil((LOT_ECHANGE * VALEUR_RES[recevoir] * marge) / VALEUR_RES[donner])
}

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
    desc: 'Protègent le cœur du village. Chaque niveau change réellement la muraille - et sa résistance.',
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
    desc: 'Fond le cuivre et l’étain en bronze - armes, armures, outils.',
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
  redoute: {
    id: 'redoute',
    nom: 'La Redoute',
    emoji: '🎯',
    desc:
      'Plateforme de tir armée de scorpions, dressée dans l’enceinte. Muette tant que le mur tient - elle ne voit pas la plaine - elle ouvre le feu dès la brèche, sur ce qui est entré.',
    interieur: true,
    costs: REDOUTE_COUTS,
    /*
     * Le plus long des chantiers, au niveau 1 comme au niveau 4 : il faut tailler
     * le massif ET monter la machine. Les remparts de niveau 1 demandent 40 s,
     * la caserne 35 : la Redoute en demande 45, et l'écart se creuse.
     */
    times: [45, 110, 230, 430],
    niveaux: [
      'Terre et rondins derrière un clayonnage d’osier : un scorpion, monté à la hâte.',
      'Massif de pierre à embrasures : deux scorpions, à l’abri de la maçonnerie.',
      'Massif appareillé à créneaux : trois scorpions et le fanion de la pièce.',
      'Ouvrage à bastionnets et échauguette : quatre scorpions, un magasin à traits.',
    ],
    /*
     * ── SA PLACE, TROUVÉE PAR LA MESURE ET PAR L'ŒIL ──
     *
     * Elle était en dur à (570, 610), c'est-à-dire ASSISE sur la face intérieure
     * du rempart sud : mesuré au zoom d'ensemble, la maçonnerie du mur monte
     * jusqu'à y ≈ 613 à cette longitude, là où l'ellipse médiane `MAP.mur` passe
     * à 640. D'où la remarque du joueur : elle était collée au bord.
     *
     * Les boîtes réelles des dix autres édifices au niveau 4, relevées par
     * `getBBox` sur la vraie carte : temple 311-543 × 245-357, forge 634-769 ×
     * 273-372, agora 474-649 × 382-469, maisons 349-515 × 435-549, caserne
     * 639-794 × 456-548. L'emprise de la Redoute au niveau 4, relevée sur son
     * art : 79 px à gauche, 80 à droite, 76 au-dessus pour la maçonnerie (104
     * avec les traits armés) et 20 au-dessous - soit 159 × 96 de masse pleine.
     *
     * IL N'EXISTE AUCUNE PLACE À CHEVAUCHEMENT NUL. Le balayage de l'enceinte au
     * pas de 3 px le dit : 7 225 positions tiennent dans les murs, aucune ne
     * laisse la masse libre de tout voisin. La moins mordante était (757, 437) -
     * la bande entre la forge et la caserne, 1 117 px² de contact seulement. On y
     * a posé l'ouvrage, on a REGARDÉ la carte : la file d'arcs des scorpions,
     * qui ne pèse rien dans le calcul parce qu'elle est ajourée, couvrait la
     * forge presque en entier. Le modèle avait raison et l'œil l'a démenti.
     *
     * D'où cette place, choisie sur capture : PLEIN SUD DE L'AGORA, à 140 pas de
     * son centre, entre les habitations et la caserne et à trente pixels francs
     * du chemin de ronde. La forge reste entièrement visible, les deux voisins ne
     * sont effleurés que par le pied de la rampe - et l'ouvrage étant peint après
     * eux, il les occulte par devant, ce qui est le sens de la vue trois quarts et
     * ce que l'agora fait déjà aux habitations.
     *
     * Et cette place la SERT : ses postes de tir sont à une centaine de pas de
     * `MAP.place` (600, 445), le cœur que les assaillants viennent piller. Elle
     * couvre le Palladion, pas la porte - c'est bien sa raison d'être.
     */
    pos: { x: 575, y: 585 },
  },
}

export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[]

/**
 * Raccourci de lecture pour le combat : la position de l'ouvrage. Elle vit
 * désormais dans `BUILDINGS` - la Redoute est un bâtiment - et cet alias évite
 * d'aller la chercher par une table dans la boucle de bataille.
 */
export const REDOUTE_POS = BUILDINGS.redoute.pos

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
    desc: 'Tire depuis les remparts - intouchable tant que la muraille tient.',
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
  /*
   * ── LES TROIS AJOUTS ─────────────────────────────────────────────────────
   *
   * Trois unités, un seul axe : le prix. On n'ARBITRAIT pas, on empilait. Chacune
   * de celles-ci existe pour une raison qu'aucune autre ne remplit :
   *
   *  · le FRONDEUR ne coûte pas un gramme de bronze - le seul soldat qu'un village
   *    pauvre lève en nombre, et le seul tireur qui vaille sans rempart ;
   *  · le PELTASTE court et frappe les tireurs : la réponse à une vague d'archers,
   *    et la seule troupe qui tienne vraiment en rase campagne ;
   *  · le BÉLIER est une machine, pas un homme. Il ne se bat pas : il ABAT. Seul
   *    l'ennemi en avait - vos hommes grattaient les murailles à mains nues.
   */
  frondeur: {
    id: 'frondeur',
    nom: 'Frondeur',
    emoji: '🪨',
    desc:
      'Berger armé d’une fronde de cuir. Aucun bronze à fondre : le soldat des villages pauvres. Tire de loin, tombe vite.',
    cost: { bois: 18, grain: 12 },
    time: 12,
    atk: 5,
    hp: 22,
    wallDps: 1.5,
    ranged: true,
    caserne: 1,
  },
  peltaste: {
    id: 'peltaste',
    nom: 'Peltaste',
    emoji: '🥏',
    desc:
      'Javelots et bouclier d’osier. Deux fois plus vif qu’un hoplite, il fond sur les tireurs : la réponse aux archers, et la meilleure troupe d’expédition.',
    cost: { bois: 30, bronze: 14 },
    time: 30,
    atk: 13,
    hp: 54,
    wallDps: 6,
    caserne: 2,
  },
  /*
   * Le char de guerre. Dans l'Iliade il ne charge pas la ligne : il PORTE le
   * champion au combat, le dépose, et l'attend pour le tirer d'affaire. D'où sa
   * conception ici - il traverse la plaine plus vite que tout le reste, frappe
   * dur au premier choc, mais il est cher, fragile aux tireurs, et absolument
   * inutile contre un mur. C'est l'unité qui prend un flanc, pas qui l'enfonce.
   */
  char: {
    id: 'char',
    nom: 'Char de guerre',
    emoji: '🛞',
    desc:
      'Deux chevaux, un cocher, un combattant. Le plus rapide de la Troade : il fond sur les tireurs et les machines avant qu’ils n’aient tiré deux fois. Mais il coûte cher, se brise vite, et ne fait rien à une muraille.',
    cost: { bois: 60, bronze: 45, grain: 40 },
    time: 52,
    atk: 26,
    hp: 78,
    wallDps: 2,
    caserne: 4,
  },
  belier: {
    id: 'belier',
    nom: 'Bélier de siège',
    emoji: '🪵',
    desc:
      'Une poutre ferrée sous un toit de peaux. Ne se bat pas : il abat. Le seul moyen de percer une place forte sans y laisser la moitié de ses hommes.',
    cost: { bois: 120, bronze: 30 },
    time: 70,
    atk: 4,
    hp: 240,
    wallDps: 34,
    caserne: 3,
  },
}

/**
 * Effectifs complets à partir d'une liste partielle. Les six unités doivent
 * TOUTES être présentes dans un `Record<UnitId, number>` : ce raccourci évite
 * d'écrire trois zéros à chaque fois qu'on décrit une garnison.
 */
export function troupes(p: Partial<Record<UnitId, number>>): Record<UnitId, number> {
  return { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0, ...p }
}
export const UNIT_IDS = Object.keys(UNITS) as UnitId[]

// ── Ennemis ───────────────────────────────────────────────────────────────────
export const ENEMIES: Record<EnemyId, EnemyDef> = {
  pillard: { id: 'pillard', nom: 'Pillard', pluriel: 'pillards', atk: 6, hp: 30, speed: 38, wallDps: 4, budget: 10 },
  guerrier: { id: 'guerrier', nom: 'Guerrier achéen', pluriel: 'guerriers achéens', atk: 11, hp: 62, speed: 30, wallDps: 8, budget: 25 },
  mercenaire: { id: 'mercenaire', nom: 'Mercenaire', pluriel: 'mercenaires', atk: 19, hp: 115, speed: 27, wallDps: 14, budget: 60 },
  belier: { id: 'belier', nom: 'Bélier de siège', pluriel: 'béliers de siège', atk: 4, hp: 240, speed: 18, wallDps: 34, budget: 80 },
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

/** positions de tir des archers selon le niveau des remparts - réparties sur l'enceinte */
export function postesArchers(niveau: number): { x: number; y: number }[] {
  if (niveau <= 0) return [{ x: MAP.ralliement.x, y: MAP.ralliement.y }]
  const angles = niveau >= 3 ? [-1.5, -0.45, 0.45, 1.5] : [-0.45, 0.45]
  return angles.map(pointMur)
}
