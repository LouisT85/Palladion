import { CHAMPION_PAR_ID, ficheChampion, type ChampionDef } from './champions'
import {
  DPS_BATIMENT,
  ENEMIES,
  MAP,
  REDOUTE_CADENCE_MS,
  REDOUTE_PORTEE,
  REDOUTE_POS,
  REDOUTE_POSTES,
  REDOUTE_VITESSE,
  redouteDmg,
  TICK_MS,
  TOUR_ANGLES,
  TOUR_CADENCE_MS,
  TOUR_DMG,
  TOUR_PORTEE,
  UNITS,
  WALL_HP,
} from './data'
import { hasard } from './defi'
import { EXPEDITION_TIMEOUT_MS } from './expeditions'
import { statsCombatHeros } from './heros'
import type {
  BattleGeo,
  BattleState,
  DefensesInterieures,
  EnemyId,
  EtatChampion,
  Fighter,
  GodId,
  HeroId,
  OrdreLigne,
  OrdreTir,
  OrdresBataille,
  SecteurBataille,
  UnitId,
  WaveUnit,
} from './types'

/*
 * ═══════════════════ POURQUOI CE MOTEUR EST REJOUABLE ═══════════════════
 *
 * Deux joueurs qui n'ont pas de serveur ne peuvent se dire la vérité que d'une
 * seule façon : que chacun REJOUE chez lui la bataille de l'autre et retrouve la
 * même issue. C'est toute l'honnêteté du courrier de raid, et cela impose au
 * moteur trois disciplines - aucune n'est décorative, chacune répare un défaut
 * qu'on a mesuré. Une quatrième section dit ce qui n'est PAS garanti, car s'en
 * taire coûterait plus cher que le trou lui-même.
 *
 *  1. TOUT TIRAGE PASSE PAR `hasard()` (defi.ts). Ce fichier appelait
 *     `Math.random` vingt et une fois en direct : la position de départ de chaque
 *     assaillant, la seconde de la première salve de chaque archer, le jet de
 *     panique de chaque battement. Deux simulations du même assaut avec la même
 *     graine ne rendaient donc PAS le même résultat, et le mode défi, qui croyait
 *     être déterministe, ne l'était que pour les quatre appels du store. Sans
 *     alea posé, `hasard()` EST `Math.random` : le bac à sable, la campagne et le
 *     siège se comportent exactement comme avant.
 *
 *  2. AUCUN TRI NE DÉPEND DE LA STABILITÉ DU MOTEUR JAVASCRIPT. Deux
 *     assaillants à distance égale de la brèche, deux pans au même nombre de
 *     points, deux lanciers intacts : le comparateur rend zéro et c'est
 *     l'implémentation de `Array.sort` qui choisit. Les comparateurs de ce
 *     fichier sont donc TOTAUX (l'index de départ tranche les égalités), ou bien
 *     remplacés par un balayage du minimum, qui n'a jamais d'égalité à trancher.
 *     Un comparateur qui rendait `NaN` (un `maxHp` nul divisé) tombait dans le
 *     même piège : l'ordre devenait indéfini.
 *
 *  3. AUCUNE HORLOGE. `now` et `dt` arrivent par le contexte, jamais de
 *     `Date.now()` ici : c'est ce qui permet à `deroulerBataille` de rejouer une
 *     bataille au pas fixe, hors écran, aussi vite que la machine le veut.
 *
 * ── CE QUI N'EST PAS GARANTI : LE DERNIER BIT, D'UN NAVIGATEUR À L'AUTRE ──
 *
 * Les trois disciplines ci-dessus rendent la bataille rejouable À L'IDENTIQUE
 * DANS UN MÊME MOTEUR JAVASCRIPT, et c'est ce que `determinisme.test.ts`
 * démontre. Elles ne suffisent PAS à garantir le bit près entre deux
 * navigateurs différents, et il faut le savoir avant de bâtir un refus de
 * rapport là-dessus : la norme ECMA-262 n'impose de résultat exact qu'aux
 * quatre opérations et à `Math.sqrt`. `Math.sin`, `Math.cos` et `Math.atan2`
 * - dont la géométrie de ce fichier se sert dix fois pour poser les pans, les
 * tours et les points d'entrée - sont explicitement « approchées par
 * l'implémentation ». Deux moteurs ont donc le droit de placer un pan de mur à
 * un dernier bit près l'un de l'autre, et une bataille est un système chaotique :
 * cet écart-là finit par désigner une autre cible, donc un autre mort, donc un
 * autre nombre de battements.
 *
 * Trois conséquences pratiques, dans l'ordre où elles mordent :
 *
 *  · un rapport de raid ne doit PAS être refusé sur un écart de position ni sur
 *    un nombre de battements. Ce qui se compare honnêtement, c'est le verdict et
 *    les comptes entiers (qui a tenu, qui est mort, combien de butin) ;
 *  · le désaccord n'est donc pas une preuve de triche à lui seul, et le motif de
 *    refus doit le dire au joueur en ces termes ;
 *  · pour fermer vraiment le trou, il faudrait précalculer la géométrie (une
 *    table d'angles, posée une fois dans `data.ts`) au lieu de la recalculer par
 *    `Math.cos`/`Math.sin` à chaque bataille. C'est un changement du décor du
 *    moteur, pas du hasard : il n'appartient pas à ce chantier, mais il est la
 *    suite à donner.
 */

let seq = 0
export function uid(prefix: string): string {
  return `${prefix}-${++seq}`
}

/**
 * Rejoue quelque chose en repartant des mêmes identifiants, puis rend au jeu
 * vivant son compteur intact.
 *
 * `uid` est un compteur de module : la même bataille créée deux fois de suite
 * dans le même onglet donne `atk-1…atk-12` puis `atk-13…atk-24`. Les
 * identifiants ne changent RIEN à l'issue (on ne s'en sert que pour désigner une
 * cible et une figurine à l'écran), mais ils empêchent de comparer deux états
 * finaux champ par champ - or c'est précisément ce que fait la vérification d'un
 * rapport de raid.
 *
 * Le compteur est REMIS À SA VALEUR au retour, et c'est indispensable : le store
 * tire du même `uid` les identifiants des bandeaux, des rapports et des modifieurs
 * de moral d'une partie en cours. Le remettre à zéro sans le restaurer ferait
 * naître deux bandeaux portant `t-4`, et React en effacerait un.
 */
export function rejouerIsole<T>(f: () => T): T {
  const garde = seq
  seq = 0
  try {
    return f()
  } finally {
    seq = garde
  }
}

/** stats communes ennemis / unités du joueur */
function statsDe(type: EnemyId | UnitId): { atk: number; hp: number; speed: number; wallDps: number } {
  const e = ENEMIES[type as EnemyId]
  if (e) return { atk: e.atk, hp: e.hp, speed: e.speed, wallDps: e.wallDps }
  const u = UNITS[type as UnitId]
  // le peltaste court : c'est la moitié de ce qu'on achète en le levant
  /*
   * Le char double la vitesse de l'infanterie : c'est SA raison d'être. Il traverse
   * la plaine avant que les tireurs aient rechargé, là où le peltaste ne fait que
   * courir plus vite qu'un hoplite.
   */
  const speed = type === 'char' ? 84 : type === 'peltaste' ? 58 : 38
  return { atk: u.atk, hp: u.hp, speed, wallDps: u.wallDps }
}

/** ce qui tire de loin, dans les deux camps - la proie du peltaste */
export function estTireur(type: EnemyId | UnitId): boolean {
  return type === 'archer' || type === 'frondeur'
}

function nomDe(type: EnemyId | UnitId, n: number): string {
  const e = ENEMIES[type as EnemyId]
  if (e) return n > 1 ? e.pluriel : e.nom.toLowerCase()
  const u = UNITS[type as UnitId]
  return n > 1 ? `${u.nom.toLowerCase()}s` : u.nom.toLowerCase()
}

// ── Géométries ────────────────────────────────────────────────────────────────
export const GEO_VILLAGE: BattleGeo = {
  cx: MAP.mur.cx,
  cy: MAP.mur.cy,
  rx: MAP.mur.rx,
  ry: MAP.mur.ry,
  porte: MAP.porte,
  ralliement: MAP.ralliement,
  place: MAP.place,
  spawn: MAP.spawn,
}

/** scène d'expédition (viewBox 900 × 560) : le village ennemi, porte à l'est */
export const GEO_EXPEDITION: BattleGeo = {
  cx: 430,
  cy: 315,
  rx: 235,
  ry: 130,
  porte: { x: 665, y: 315 },
  ralliement: { x: 590, y: 318 },
  place: { x: 450, y: 315 },
  spawn: { x: 865, y: 350 },
}

export function geoPoint(geo: BattleGeo, angle: number): { x: number; y: number } {
  return { x: geo.cx + geo.rx * Math.cos(angle), y: geo.cy + geo.ry * Math.sin(angle) }
}

/** position de siège du i-ème assaillant, en arc autour d'un secteur donné */
function posteSiege(geo: BattleGeo, i: number, angleSecteur = 0): { x: number; y: number } {
  const angle = angleSecteur + ((i % 7) - 3) * 0.1
  const off = 16 + 15 * Math.floor(i / 7)
  return {
    x: geo.cx + (geo.rx + off) * Math.cos(angle),
    y: geo.cy + (geo.ry + off) * Math.sin(angle),
  }
}

/**
 * Place du i-ème défenseur de mêlée. Ils convergeaient tous vers le MÊME point,
 * ce qui donnait une pile de figurines superposées - illisible, et impossible
 * d'y distinguer un héros. Ils tiennent maintenant trois rangs face à la porte.
 */
function posteRalliement(geo: BattleGeo, i: number): { x: number; y: number } {
  const parRang = 6
  const rang = Math.floor(i / parRang)
  const col = i % parRang
  return {
    x: geo.ralliement.x - rang * 27,
    y: geo.ralliement.y + (col - (parRang - 1) / 2) * 23,
  }
}

/** place d'un héros : devant la ligne, bien espacé pour qu'on lise son nom */
function posteHeros(geo: BattleGeo, i: number, total: number): { x: number; y: number } {
  return {
    x: geo.ralliement.x + 30,
    y: geo.ralliement.y + (i - (total - 1) / 2) * 54,
  }
}

/** positions de tir des archers défenseurs selon le niveau des remparts */
export function postesArchers(geo: BattleGeo, niveau: number): { x: number; y: number }[] {
  if (niveau <= 0) return [{ x: geo.ralliement.x, y: geo.ralliement.y }]
  const angles = niveau >= 3 ? [-1.5, -0.45, 0.45, 1.5] : [-0.45, 0.45]
  return angles.map((a) => geoPoint(geo, a))
}

/** point d'entrée dans l'enceinte pour un secteur : juste en deçà du mur */
function entreeSecteur(geo: BattleGeo, angle: number): { x: number; y: number } {
  return {
    x: geo.cx + (geo.rx - 34) * Math.cos(angle),
    y: geo.cy + (geo.ry - 34) * Math.sin(angle),
  }
}

/** un point est-il à l'intérieur de l'enceinte ? (rayon normalisé de l'ellipse) */
function estDedans(geo: BattleGeo, p: { x: number; y: number }): boolean {
  const dx = (p.x - geo.cx) / geo.rx
  const dy = (p.y - geo.cy) / geo.ry
  return dx * dx + dy * dy < 1
}

/** secteur dont le pan de mur est le plus proche d'un point donné */
function secteurProche(b: BattleState, p: { x: number; y: number }): SecteurBataille {
  let best = b.secteurs[0]
  let bd = Infinity
  for (const s of b.secteurs) {
    const d = (s.x - p.x) ** 2 + (s.y - p.y) ** 2
    if (d < bd) {
      bd = d
      best = s
    }
  }
  return best
}

// ── Génération des vagues ennemies ────────────────────────────────────────────
export function genererVague(threat: number): WaveUnit[] {
  let budget = threat * 5.5 * (0.85 + hasard() * 0.3)
  const counts: Partial<Record<EnemyId, number>> = {}
  const pool: { id: EnemyId; w: number }[] = [{ id: 'pillard', w: 50 }]
  if (threat >= 20) pool.push({ id: 'guerrier', w: 30 })
  if (threat >= 45) pool.push({ id: 'mercenaire', w: 15 })
  if (threat >= 50) pool.push({ id: 'belier', w: 10 })

  let total = 0
  let beliers = 0
  while (budget >= ENEMIES.pillard.budget && total < 24) {
    const eligibles = pool.filter((p) => ENEMIES[p.id].budget <= budget && (p.id !== 'belier' || beliers < 2))
    if (eligibles.length === 0) break
    const somme = eligibles.reduce((a, p) => a + p.w, 0)
    let r = hasard() * somme
    let choisi = eligibles[0].id
    for (const p of eligibles) {
      r -= p.w
      if (r <= 0) {
        choisi = p.id
        break
      }
    }
    counts[choisi] = (counts[choisi] ?? 0) + 1
    budget -= ENEMIES[choisi].budget
    total++
    if (choisi === 'belier') beliers++
  }
  if (total === 0) counts.pillard = 2
  return (Object.entries(counts) as [EnemyId, number][]).map(([enemy, count]) => ({ enemy, count }))
}

export function tailleVague(wave: WaveUnit[]): number {
  return wave.reduce((a, w) => a + w.count, 0)
}

export function descVague(wave: WaveUnit[]): string {
  return wave.map((w) => `${w.count} ${nomDe(w.enemy, w.count)}`).join(', ')
}

export function budgetVague(wave: WaveUnit[]): number {
  return wave.reduce((a, w) => a + (ENEMIES[w.enemy as EnemyId]?.budget ?? 25) * w.count, 0)
}

// ── Résolution hors-ligne (formule) ───────────────────────────────────────────
function puissanceVague(wave: WaveUnit[]): number {
  return wave.reduce((a, w) => {
    const st = statsDe(w.enemy)
    return a + w.count * (st.atk + st.hp / 8)
  }, 0)
}

function puissanceDefense(army: Record<UnitId, number>, wallLevel: number, wallHp: number, tours = 0): number {
  const unites = (Object.keys(army) as UnitId[]).reduce(
    (a, u) => a + army[u] * (UNITS[u].atk + UNITS[u].hp / 8),
    0,
  )
  const murMax = WALL_HP[wallLevel] || 1
  const facteurMur = 1 + 0.35 * wallLevel * Math.min(1, wallHp / murMax)
  // 8 : les villageois aux fourches ; 26 : une tour d'archers vaut ~2 archers postés
  return (unites + 8 + tours * 26) * facteurMur
}

export interface ResultatHorsLigne {
  victoire: boolean
  pertes: Partial<Record<UnitId, number>>
  degatsRemparts: number
  volePct: number
  /** angles des pans qui se sont effondrés - vides si l'enceinte a tenu partout */
  anglesOuverts: number[]
}

/**
 * Assaut résolu sans spectacle, pour la nuit passée onglet fermé.
 *
 * Les fronts comptent, ici aussi. La résolution hors-ligne marquait
 * forfaitairement la porte comme enfoncée dès que `wallHp` tombait à zéro : au
 * réveil, le joueur voyait toujours la même brèche au même endroit, quel que
 * soit le nombre de colonnes annoncées la veille. On répartit donc la structure
 * entre les pans assaillis - comme le fait `creerBataille` - et l'on rend la
 * liste de ceux qui ont réellement cédé.
 */
/** ce qu'un champion ajoute à la force d'une colonne, résolue sans spectacle */
export const FORCE_CHAMPION_NUIT = 1.4

export function resoudreHorsLigne(
  wave: WaveUnit[],
  army: Record<UnitId, number>,
  wallLevel: number,
  wallHp: number,
  tours = 0,
  fronts: { angle: number }[] = [],
  /**
   * Un champion menait-il la colonne ? Un nom en tête d'assaut pèse la nuit
   * comme le jour : sans cela, il aurait suffi de fermer l'onglet en apprenant
   * qu'Achille marchait sur le village pour ne rien avoir à craindre de lui.
   */
  champion = false,
): ResultatHorsLigne {
  const atk = puissanceVague(wave) * (champion ? FORCE_CHAMPION_NUIT : 1)
  const def = puissanceDefense(army, wallLevel, wallHp, tours)
  const ratio = def / Math.max(1, atk)
  const victoire = ratio >= 1
  const pertesPct = victoire ? Math.min(0.5, 0.35 / ratio ** 1.5) : Math.min(0.85, 0.55 + 0.2 / ratio)
  const pertes: Partial<Record<UnitId, number>> = {}
  for (const u of Object.keys(army) as UnitId[]) {
    const p = Math.round(army[u] * pertesPct)
    if (p > 0) pertes[u] = p
  }
  /*
   * Les coups portés, puis ce que la structure peut en encaisser. La distinction
   * compte : c'est la force BRUTE qui décide si un pan s'ouvre - un mur réduit à
   * vingt points ne « limite » pas le bélier, il cède.
   */
  const degatsBruts = Math.round(atk * (victoire ? 0.8 : 1.6))
  const degatsRemparts = Math.min(wallHp, degatsBruts)
  /*
   * Chaque pan assailli reçoit sa part de la structure ET sa part des coups - mais
   * les pans ne se valent pas. La porte est le plus épais (corps de garde,
   * vantaux doublés) et les tours ne couvrent que leur arc, dans l'ordre où on
   * les bâtit : les deux premières flanquent la porte, la troisième le mur du sud,
   * la quatrième celui du nord (cf. TOUR_ANGLES). Un mur du nord sans tour cède
   * donc là où la porte tient, ce qui est exactement ce qu'on voit en bataille.
   */
  const anglesOuverts: number[] = []
  if (wallLevel > 0 && fronts.length > 0) {
    const partMur = wallHp / fronts.length
    const partDegats = degatsBruts / fronts.length
    fronts.forEach((f, i) => {
      const epaisseur = i === 0 ? 1.3 : 1
      const couvert = i === 0 ? tours >= 1 : i === 1 ? tours >= 3 : tours >= 4
      if (partMur * epaisseur * (couvert ? 1.25 : 1) - partDegats <= 0.5) anglesOuverts.push(f.angle)
    })
  }
  return { victoire, pertes, degatsRemparts, volePct: victoire ? 0 : 0.3, anglesOuverts }
}

// ── Bataille animée ───────────────────────────────────────────────────────────
// Rythme volontairement posé : la bataille se lit comme une scène - colonne en
// approche, salves espacées, mêlée qui dure. Les dégâts par coup ne bougent pas,
// seule la cadence s'étire : l'issue reste la même, le spectacle respire.
const PORTEE_ARC_MUR = 300
const PORTEE_ARC_SOL = 210
/** la fronde porte les deux tiers d'un arc : c'est le prix de sa gratuité */
export const PORTEE_FRONDE = 0.66
export const CADENCE_ARC = 2600
export const CADENCE_MELEE = 2100
export const CADENCE_MUR = 1700
/** vitesse d'une flèche (px/s) - assez lente pour suivre sa course des yeux */
const VITESSE_FLECHE = 250

/*
 * ═══════════════════ LES ORDRES DE BATAILLE ═══════════════════
 *
 * Jusqu'ici on REGARDAIT la bataille. Les bénédictions mises à part, aucun geste
 * du joueur ne changeait ce que faisaient ses hommes : ils couraient au plus
 * proche, frappaient à cadence fixe, et l'issue était décidée avant le premier
 * coup par les effectifs.
 *
 * Trois postures pour la ligne, deux façons de tirer, et un secteur assignable
 * par type d'unité. Aucun de ces choix n'est bon partout - c'est la condition
 * pour qu'ils soient des choix :
 *
 *  · MUR DE BOUCLIERS - on encaisse deux fois mieux, on frappe mou, on ne
 *    poursuit personne. La ligne tient là où elle est, et rien ne la fait rompre.
 *  · TENIR - la posture de toujours : on va au plus proche, à pleine force.
 *  · CHARGER - on frappe fort et vite, on sort même hors des murs pour aller
 *    crever les béliers… et l'on encaisse tout ce qui vient, sans bouclier levé.
 *
 *  · TIR TENDU - l'homme le plus proche, à pleine force.
 *  · TIR EN CLOCHE - on porte bien plus loin et l'on arrose le plus gros TAS,
 *    même hors de vue derrière le mur, mais la flèche arrive amortie.
 */
export interface EffetLigne {
  nom: string
  emoji: string
  desc: string
  /** dégâts infligés par la mêlée du joueur */
  degats: number
  /** dégâts subis par la mêlée du joueur */
  recus: number
  /** vitesse de déplacement */
  vitesse: number
  /** seuil de rupture, en part du seuil ordinaire (< 1 = tient mieux) */
  seuil: number
  /** ne quitte pas son poste au-delà de ce rayon (0 = poursuit sans limite) */
  laisse: number
  /** va chercher les assaillants jusque devant le mur, brèche ou pas */
  sortie: boolean
}

export const EFFETS_LIGNE: Record<OrdreLigne, EffetLigne> = {
  tenir: {
    nom: 'Tenir',
    emoji: '🛡️',
    desc: 'La ligne va au plus proche et frappe à pleine force. Ni protection, ni élan.',
    degats: 1,
    recus: 1,
    vitesse: 1,
    seuil: 1,
    laisse: 0,
    sortie: false,
  },
  mur: {
    nom: 'Mur de boucliers',
    emoji: '🧱',
    desc: 'Boucliers joints : −45 % de dégâts subis, −30 % infligés. La ligne ne poursuit plus et ne rompt presque jamais.',
    degats: 0.7,
    recus: 0.55,
    vitesse: 0.75,
    seuil: 0.45,
    laisse: 130,
    sortie: false,
  },
  charge: {
    nom: 'Charger',
    emoji: '⚔️',
    desc: '+40 % de dégâts, +35 % de vitesse - et l’on sort crever les béliers sous le mur. Mais on encaisse tout, et la ligne casse vite.',
    degats: 1.4,
    recus: 1.35,
    vitesse: 1.35,
    seuil: 1.4,
    laisse: 0,
    sortie: true,
  },
}

export interface EffetTir {
  nom: string
  emoji: string
  desc: string
  portee: number
  degats: number
  /** vise le tas le plus dense plutôt que l'homme le plus proche */
  masse: boolean
}

export const EFFETS_TIR: Record<OrdreTir, EffetTir> = {
  tendu: {
    nom: 'Tir tendu',
    emoji: '🏹',
    desc: 'On vise l’homme le plus proche, à pleine force.',
    portee: 1,
    degats: 1,
    masse: false,
  },
  cloche: {
    nom: 'Tir en cloche',
    emoji: '🌙',
    desc: '+45 % de portée et l’on arrose le plus gros rassemblement - mais la flèche arrive amortie (−30 %).',
    portee: 1.45,
    degats: 0.7,
    masse: true,
  },
}

/** un ordre se donne, puis se tient : cinq secondes avant d'en changer */
export const DELAI_ORDRE_MS = 5000

export const ORDRES_NEUTRES: OrdresBataille = { ligne: 'tenir', tir: 'tendu', secteurs: {}, prochainAt: 0 }

/** le tas le plus dense : celui qui a le plus de voisins à portée d'une gerbe */
const RAYON_GERBE = 52
function plusMasse(cibles: Fighter[]): Fighter | null {
  let best: Fighter | null = null
  let score = -1
  for (const c of cibles) {
    let n = 0
    for (const o of cibles) if (dist(c, o) <= RAYON_GERBE) n++
    if (n > score) {
      score = n
      best = c
    }
  }
  return best
}

export interface OptionsBataille {
  attaquants: WaveUnit[]
  defenseurs: Record<UnitId, number>
  wallLevel: number
  now: number
  geo: BattleGeo
  campJoueur: 'attaque' | 'defense'
  /** tours d'archers du camp défenseur */
  tours?: number
  /** niveau de la Redoute du camp défenseur : ses scorpions tiennent le dedans */
  redoute?: number
  /**
   * Fronts d'assaut : chaque entrée = un secteur de mur assailli.
   * Absent ou 1 seul → assaut classique sur la porte (expéditions).
   */
  fronts?: { nom: string; angle: number; spawn: { x: number; y: number } }[]
  /** points de structure totaux à répartir entre les secteurs */
  wallHpTotal?: number
  /** passifs de héros : multiplicateur d'attaque et de dégâts subis, camp du joueur */
  bonusAtkJoueur?: number
  reducJoueur?: number
  /** allonge du tir des tours (1 = portée normale) - grâce de Poséidon */
  porteeTours?: number
  /** les murs sont déjà ouverts avant le premier coup (ruse d'Ulysse) */
  sansSiege?: boolean
  /** héros descendus sur le terrain, avec leur niveau */
  herosPresents?: { id: HeroId; niveau: number }[]
  /** un champion achéen mène la colonne : il porte un nom et une capacité */
  champion?: ChampionDef
  /**
   * Part des défenseurs dépêchée par les alliés. Ils sont comptés dans
   * `defenseurs` (ils se battent), mais marqués `allie` pour se distinguer à
   * l'œil : les derniers arrivés sur la ligne portent les couleurs de leur cité.
   */
  renforts?: Partial<Record<UnitId, number>>
}

export function creerBataille(opts: OptionsBataille): BattleState {
  const { attaquants, defenseurs, wallLevel, now, geo, campJoueur } = opts
  const fighters: Fighter[] = []

  // ── Secteurs assaillis ──
  const fronts =
    opts.fronts && opts.fronts.length > 0
      ? opts.fronts
      : [{ nom: 'Porte de l’est', angle: 0, spawn: geo.spawn }]
  // la ruse d'Ulysse : on entre par une offrande, pas par une brèche
  const hpTotal = opts.sansSiege ? 0 : (opts.wallHpTotal ?? WALL_HP[wallLevel] ?? 0)
  // le mur est également solide partout : chaque front n'en attaque qu'une part
  const hpParSecteur = fronts.length > 0 ? hpTotal / fronts.length : 0
  const secteurs = fronts.map((f) => {
    const p = geoPoint(geo, f.angle)
    return {
      nom: f.nom,
      angle: f.angle,
      x: p.x,
      y: p.y,
      hp: hpParSecteur,
      max: hpParSecteur,
      breche: wallLevel === 0 || hpParSecteur <= 0,
    }
  })

  // Assaillants - répartis entre les fronts, en colonne de marche par secteur
  const parSecteur = fronts.map(() => 0)
  let i = 0
  for (const w of attaquants) {
    const st = statsDe(w.enemy)
    for (let k = 0; k < w.count; k++) {
      // les béliers vont toujours au premier front (le plus fourni)
      const sIdx = w.enemy === 'belier' ? 0 : i % fronts.length
      const f = fronts[sIdx]
      const rang = parSecteur[sIdx]++
      const slot =
        w.enemy === 'belier'
          ? { x: geo.cx + (geo.rx + 20) * Math.cos(f.angle), y: geo.cy + (geo.ry + 20) * Math.sin(f.angle) }
          : posteSiege(geo, rang, f.angle)
      // la colonne se forme derrière le point d'apparition du secteur
      const recul = 12 + Math.floor(rang / 3) * 30
      const dirX = Math.cos(f.angle)
      const dirY = Math.sin(f.angle)
      fighters.push({
        id: uid('atk'),
        camp: 'attaque',
        type: w.enemy,
        hp: st.hp,
        maxHp: st.hp,
        atk: st.atk,
        x: f.spawn.x + dirX * recul + (hasard() - 0.5) * 26,
        y: f.spawn.y + dirY * recul + ((rang % 3) - 1) * 26 + (hasard() - 0.5) * 30,
        tx: slot.x,
        ty: slot.y,
        speed: st.speed,
        etat: 'marche',
        secteur: sIdx,
        nextHit: 0,
        seed: hasard(),
      })
      i++
    }
  }

  // Défenseurs de mêlée - au point de ralliement
  const engages: Partial<Record<UnitId, number>> = {}
  // un compteur commun à toute l'infanterie : la ligne de mêlée est unique
  let placeDef = 0
  for (const u of ['lancier', 'peltaste', 'char', 'hoplite'] as UnitId[]) {
    const n = defenseurs[u] ?? 0
    if (n <= 0) continue
    engages[u] = n
    const visibles = Math.min(n, 16)
    const mult = n / visibles
    /*
     * Combien de ces figurines représentent des alliés. On compte en FIGURINES et
     * non en hommes : une garnison de quarante tient dans seize silhouettes, et
     * cinq alliés sur quarante doivent donc en colorer deux, pas cinq.
     */
    const partAlliee = Math.round(((opts.renforts?.[u] ?? 0) / n) * visibles)
    for (let k = 0; k < visibles; k++) {
      const def = UNITS[u]
      const p = posteRalliement(geo, placeDef++)
      fighters.push({
        id: uid('def'),
        camp: 'defense',
        type: u,
        // les alliés ferment la marche : ce sont les derniers postes de la ligne
        allie: k >= visibles - partAlliee ? true : undefined,
        hp: def.hp * mult,
        maxHp: def.hp * mult,
        atk: def.atk * mult,
        x: p.x - 12 - hasard() * 16,
        y: p.y + (hasard() - 0.5) * 8,
        tx: p.x,
        ty: p.y,
        speed: statsDe(u).speed,
        etat: 'melee',
        nextHit: 0,
        seed: hasard(),
      })
    }
  }

  /*
   * Les héros. Ils se battent au premier rang du camp du joueur - devant la
   * ligne quand on défend, en tête de colonne quand on attaque - et ne sont
   * jamais comptés dans `engages` : leurs blessures ne coûtent pas de soldats.
   */
  const listeHeros = opts.herosPresents ?? []
  listeHeros.forEach((h, i) => {
    const st = statsCombatHeros(h.niveau)
    const enDefense = campJoueur === 'defense'
    const p = enDefense
      ? posteHeros(geo, i, listeHeros.length)
      : { x: geo.spawn.x - 30 - i * 22, y: geo.spawn.y + (i - (listeHeros.length - 1) / 2) * 34 }
    fighters.push({
      id: uid('hero'),
      camp: campJoueur,
      // le moteur raisonne en unités : un héros se bat comme l'infanterie lourde
      type: 'hoplite',
      heros: h.id,
      hp: st.hp,
      maxHp: st.hp,
      atk: st.atk,
      x: p.x - (enDefense ? 14 : 0),
      y: p.y,
      tx: enDefense ? p.x : geo.porte.x,
      ty: enDefense ? p.y : geo.porte.y,
      speed: 46,
      etat: enDefense ? 'melee' : 'marche',
      secteur: enDefense ? undefined : 0,
      nextHit: 0,
      seed: hasard(),
    })
  })

  /*
   * Tireurs défenseurs - postés sur les remparts. Archers ET frondeurs : tout ce
   * qui tire monte sur le mur, et n'en descend que si SON pan tombe. Les deux se
   * partagent les créneaux, les frondeurs derrière - moins de portée, moins de
   * valeur, on ne leur donne pas les meilleures places.
   */
  let creneau = 0
  for (const u of ['archer', 'frondeur'] as const) {
    const n = defenseurs[u] ?? 0
    if (n <= 0) continue
    engages[u] = n
    const postes = postesArchers(geo, wallLevel)
    const visibles = Math.min(n, u === 'archer' ? 8 : 6)
    const mult = n / visibles
    const partAlliee = Math.round(((opts.renforts?.[u] ?? 0) / n) * visibles)
    for (let k = 0; k < visibles; k++) {
      const p = postes[creneau++ % postes.length]
      const def = UNITS[u]
      fighters.push({
        id: uid('arc'),
        camp: 'defense',
        type: u,
        allie: k >= visibles - partAlliee ? true : undefined,
        hp: def.hp * mult,
        maxHp: def.hp * mult,
        atk: def.atk * mult,
        x: p.x + (hasard() - 0.5) * 14,
        y: p.y - 6,
        tx: p.x,
        ty: p.y - 6,
        speed: 40,
        etat: 'siege', // sur les murs
        nextHit: now + 800 + hasard() * 800,
        seed: hasard(),
      })
    }
  }

  /*
   * Le champion achéen. Il marche en tête de la première colonne, à découvert :
   * on doit le VOIR arriver, et pouvoir décider de lui tirer dessus plutôt que
   * sur les pillards. C'est un mercenaire multiplié - rien d'inatteignable, mais
   * il faut y mettre les moyens, et pendant ce temps la muraille encaisse.
   */
  let champion: EtatChampion | undefined
  if (opts.champion) {
    const merc = ENEMIES.mercenaire
    const fiche = ficheChampion(opts.champion.id)
    const f0 = fronts[0]
    const id = uid('champ')
    fighters.push({
      id,
      camp: 'attaque',
      type: 'mercenaire',
      heros: opts.champion.id,
      hp: merc.hp * opts.champion.vigueur,
      maxHp: merc.hp * opts.champion.vigueur,
      atk: merc.atk * opts.champion.frappe,
      x: f0.spawn.x,
      y: f0.spawn.y,
      tx: posteSiege(geo, 0, f0.angle).x,
      ty: posteSiege(geo, 0, f0.angle).y,
      speed: 34,
      etat: 'marche',
      secteur: 0,
      nextHit: 0,
      seed: hasard(),
    })
    champion = {
      id: opts.champion.id,
      nom: fiche.nom,
      emoji: fiche.emoji,
      capaciteA: now + opts.champion.capacite.delai,
      lancee: false,
      abattu: false,
      fighterId: id,
      atkUntil: 0,
      atkBonus: 0,
      reducUntil: 0,
      reduc: 0,
      terreurUntil: 0,
      terreurSeuil: 1,
    }
  }

  // Tours d'archers - postées sur l'enceinte, elles tirent tant que le mur tient
  const toursDef = TOUR_ANGLES.slice(0, wallLevel > 0 ? (opts.tours ?? 0) : 0).map((a) => {
    const p = geoPoint(geo, a)
    return { x: p.x, y: p.y - 32, nextHit: now + 600 + hasard() * 900 }
  })

  /*
   * Scorpions de la Redoute. Elle n'existe que pour la défense du village : une
   * expédition n'emporte pas son ouvrage de siège avec elle, et la géométrie
   * d'un raid n'a pas de Redoute à sa place.
   */
  const redouteDef =
    campJoueur === 'defense' && (opts.redoute ?? 0) > 0
      ? REDOUTE_POSTES.slice(0, opts.redoute).map((p) => ({
          x: REDOUTE_POS.x + p.dx,
          y: REDOUTE_POS.y + p.dy,
          nextHit: now,
          // la force du trait suit le NIVEAU de l'ouvrage, arrêtée ici une fois
          // pour toutes : la relire à chaque salve obligerait à traîner le niveau
          // dans le contexte de chaque battement
          dmg: redouteDmg(opts.redoute ?? 0),
        }))
      : undefined

  return {
    wave: attaquants,
    fighters,
    projectiles: [],
    toursDef,
    redouteDef,
    secteurs,
    effects: [],
    phase: 'approche',
    breche: wallLevel === 0 || !!opts.sansSiege,
    startedAt: now,
    campJoueur,
    geo,
    defBuffUntil: 0,
    atkBuffUntil: 0,
    bonusAtkJoueur: opts.bonusAtkJoueur,
    reducJoueur: opts.reducJoueur,
    porteeTours: opts.porteeTours,
    champion,
    result: null,
    engages,
  }
}

/**
 * Poste les héros du camp du joueur sur le pan qu'on leur a désigné, par RANG de
 * secteur (`plandefense.ts` fait la traduction depuis le nom du pan).
 *
 * Trois choses s'y jouent, et aucune n'est décorative :
 *
 *  · `f.secteur` est ce que `secteurAssigne` relit à chaque battement : c'est lui
 *    qui fait que le héros ne court PAS au trou d'à côté et ne frappe que ce qui
 *    assaille SON mur ;
 *  · on l'y place tout de suite, en deçà du pan. Le plan promet des hommes « en
 *    place avant le premier coup de bélier » ; un héros qui traverserait la cour
 *    pendant que les béliers cognent tiendrait son mur avec dix secondes de
 *    retard, et le joueur ne le verrait pas où il l'a mis ;
 *  · un id absent de `parHeros` laisse le héros EXACTEMENT où il était. C'est le
 *    cas du pan qu'on n'assaille pas ce soir, et c'est ce qui garantit qu'un
 *    placement ne retire jamais personne de la bataille.
 */
export function posterHeros(b: BattleState, parHeros: Partial<Record<HeroId, number>>): void {
  const mien = (f: Fighter): number | undefined => {
    if (!f.heros || f.camp !== b.campJoueur) return undefined
    const i = parHeros[f.heros as HeroId]
    return i !== undefined && b.secteurs[i] ? i : undefined
  }
  // combien de héros par pan : deux qui tiennent le même mur ne se superposent pas
  const total = new Map<number, number>()
  for (const f of b.fighters) {
    const i = mien(f)
    if (i !== undefined) total.set(i, (total.get(i) ?? 0) + 1)
  }
  const rang = new Map<number, number>()
  for (const f of b.fighters) {
    const i = mien(f)
    if (i === undefined) continue
    const s = b.secteurs[i]
    const k = rang.get(i) ?? 0
    rang.set(i, k + 1)
    const p = entreeSecteur(b.geo, s.angle)
    // écartés le long du mur, pas en profondeur : ils en tiennent la largeur
    const ecart = (k - ((total.get(i) ?? 1) - 1) / 2) * 46
    f.secteur = i
    f.x = p.x - Math.sin(s.angle) * ecart
    f.y = p.y + Math.cos(s.angle) * ecart
    f.tx = f.x
    f.ty = f.y
    f.etat = 'melee'
  }
}

/** le pan qui concentre la menace : le plus assailli, pondéré par ce qu'il a déjà encaissé */
export function secteurChaud(b: BattleState): SecteurBataille | null {
  if (b.secteurs.length === 0) return null
  const parSecteur = b.secteurs.map(() => 0)
  for (const f of b.fighters) {
    if (f.camp !== 'attaque' || f.etat === 'mort' || f.etat === 'fuite') continue
    parSecteur[Math.min(f.secteur ?? 0, parSecteur.length - 1)]++
  }
  let best = b.secteurs[0]
  let score = -Infinity
  b.secteurs.forEach((s, i) => {
    const entame = s.max > 0 ? 1 - s.hp / s.max : 1
    const v = parSecteur[i] + entame * 7 - (s.breche ? 5 : 0)
    if (v > score) {
      score = v
      best = s
    }
  })
  return best
}

/*
 * `Math.sqrt` et non `Math.hypot`, et ce n'est pas un détail de goût : la norme
 * ECMA-262 range `hypot` parmi les fonctions « approchées par l'implémentation »
 * - deux navigateurs ont le droit d'en rendre deux valeurs séparées d'un dernier
 * bit -, alors que `Math.sqrt` et les quatre opérations sont EXACTES par
 * IEEE-754, donc identiques partout. Or une distance décide de qui frappe qui :
 * un dernier bit d'écart suffit à désigner une autre cible, et deux clients
 * honnêtes concluraient à la triche. Les coordonnées de la carte tiennent entre
 * 0 et 900, si bien que le débordement contre lequel `hypot` se protège ne peut
 * pas se produire ici.
 */
function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function versCible(f: Fighter, dt: number): boolean {
  const ex = f.tx - f.x
  const ey = f.ty - f.y
  const d = Math.sqrt(ex * ex + ey * ey)
  if (d < 5) return true
  const pas = Math.min(d, f.speed * dt)
  f.x += ((f.tx - f.x) / d) * pas
  f.y += ((f.ty - f.y) / d) * pas
  return d - pas < 5
}

function vivants(b: BattleState, camp: 'attaque' | 'defense'): Fighter[] {
  return b.fighters.filter((f) => f.camp === camp && f.etat !== 'mort' && f.etat !== 'fuite')
}

function plusProche(f: { x: number; y: number }, cibles: Fighter[]): Fighter | null {
  let best: Fighter | null = null
  let bd = Infinity
  for (const c of cibles) {
    const d = dist(f, c)
    if (d < bd) {
      bd = d
      best = c
    }
  }
  return best
}

/**
 * Les `combien` plus proches d'un point, du plus près au plus loin, dans un ordre
 * qui ne dépend que des données.
 *
 * Trier par distance seule laisse le sort du jeu à `Array.sort` dès que deux
 * hommes sont à égale distance de l'épicentre - ce qui arrive tout le temps,
 * puisque les colonnes sont posées symétriquement autour d'un angle de secteur.
 * L'index de départ tranche donc l'égalité : c'est l'ordre de `b.fighters`, celui
 * que le moteur emploie déjà partout ailleurs, et il rejoue à l'identique. Le
 * `||` couvre aussi le cas `NaN` (deux positions confondues à distance nulle,
 * `0 - 0` valant zéro et non `NaN`, mais une coordonnée corrompue le donnerait) :
 * un comparateur qui rend `NaN` laisse l'ordre indéfini par la spécification.
 */
function lesPlusProches(cibles: Fighter[], p: { x: number; y: number }, combien: number): Fighter[] {
  return cibles
    .map((f, i) => ({ f, d: dist(f, p), i }))
    .sort((a, c) => a.d - c.d || a.i - c.i)
    .slice(0, combien)
    .map((e) => e.f)
}

/**
 * Au-delà de ce rapport, un homme lâche sa proie pour une autre : il faut que la
 * nouvelle soit DEUX FOIS plus près pour que le changement d'avis se justifie.
 * C'est l'hystérésis qui empêche l'oscillation entre deux adversaires voisins.
 */
const TENACITE = 2

/**
 * Choisit un adversaire et s'y tient.
 *
 * Un combattant garde la cible qu'il s'est donnée tant qu'elle reste valide et
 * qu'aucune autre n'est franchement plus accessible. C'est ce qui donne des
 * engagements lisibles : sans cela, on voyait les colonnes courir vers un
 * ennemi, le dépasser, faire demi-tour, et repartir — un ballet absurde qui
 * venait uniquement de ce que « le plus proche » changeait d'un tick à l'autre.
 */
/** distance à laquelle on croise le fer : au-delà, on avance ; en deçà, on frappe */
const CONTACT = 15

/**
 * Vise le point de contact avec un adversaire, et non ses pieds.
 *
 * Marcher sur les coordonnées exactes de l'ennemi faisait littéralement traverser
 * les corps : la figurine dépassait sa proie, se retrouvait derrière elle, puis
 * revenait — le va-et-vient que l'on voyait dans les expéditions. On s'arrête
 * désormais à longueur de lance.
 */
function approcher(f: Fighter, cible: Fighter): void {
  const dx = cible.x - f.x
  const dy = cible.y - f.y
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d <= CONTACT) {
    f.tx = f.x
    f.ty = f.y
    return
  }
  /*
   * On vise FRANCHEMENT à l'intérieur de la portée de frappe, pas à sa limite.
   * Viser la limite exacte faisait converger la distance par le dessus et la
   * laissait se stabiliser à un cheveu au-dessus du seuil : les hommes se
   * plantaient à seize pas d'un adversaire qu'ils pouvaient toucher à quinze,
   * et le combat n'avait jamais lieu.
   */
  const vise = CONTACT * 0.7
  const k = (d - vise) / d
  f.tx = f.x + dx * k
  f.ty = f.y + dy * k
}

function choisirCible(f: Fighter, candidats: Fighter[]): Fighter | null {
  if (candidats.length === 0) {
    f.cibleId = undefined
    return null
  }
  const tenue = f.cibleId ? candidats.find((c) => c.id === f.cibleId) : undefined
  const proche = plusProche(f, candidats)
  if (tenue && proche && dist(f, tenue) <= dist(f, proche) * TENACITE) return tenue
  f.cibleId = proche?.id
  return proche
}

/** applique des dégâts, marque la mort (dépouille) et fait jaillir un impact */
function frapper(b: BattleState, cible: Fighter, dmg: number, now: number): void {
  cible.hp -= dmg
  if (cible.hp <= 0 && cible.etat !== 'mort') {
    cible.etat = 'mort'
    cible.mortAt = now
    // nuage de poussière : le combattant mord la poussière, littéralement
    if (b.effects.length < 40) {
      b.effects.push({ id: uid('fx'), type: 'poussiere', x: cible.x, y: cible.y - 3, until: now + 700 })
    }
    return
  }
  if (b.effects.length < 40) {
    b.effects.push({ id: uid('fx'), type: 'impact', x: cible.x + (hasard() - 0.5) * 4, y: cible.y - 8, until: now + 320 })
  }
}

/**
 * Un bâtiment que les assaillants peuvent abattre. Le store en fournit la liste
 * (position, structure restante), la bataille y porte les coups, le store en
 * tire les conséquences — ruines, pillage, défaite si le cœur tombe.
 */
export interface CibleBatiment {
  /*
   * Un identifiant LIBRE, et non un `BuildingId`. La mécanique sert désormais
   * les deux sens de la guerre : en défense ce sont les édifices du village
   * (`agora`, `ferme`…), en expédition les ouvrages de la place assaillie
   * (`donjon`, `tente-chef`…). Seul le camp change - le code des coups, lui, est
   * exactement le même, et c'est bien ce qu'on voulait.
   */
  id: string
  x: number
  y: number
  hp: number
  /** le cœur - agora chez soi, donjon chez l'autre : sa chute décide de tout */
  coeur?: boolean
}

export interface TickBatailleCtx {
  now: number
  dt: number
  wallHp: number
  wallLevel: number
  /** ce que le ciel impose ce jour-là : portée, allure, force des tirs */
  mods?: { portee: number; vitesse: number; tir: number }
  /** bâtiments encore debout, dans l'ordre où les assaillants les trouveront */
  cibles?: CibleBatiment[]
  /** les cinq ouvrages de l'intérieur, s'ils sont bâtis */
  defenses?: DefensesInterieures
  /** structure restante de la Redoute : à zéro, ses scorpions se taisent */
  redouteHp?: number
}

const CIEL_CLAIR = { portee: 1, vitesse: 1, tir: 1 }

export interface TickBatailleOut {
  wallHp: number
  brecheOuverte: boolean
  finie: boolean
  /** true = les défenseurs ont tenu ; false = les assaillants ont percé */
  victoireDefense: boolean
  fuite: boolean
  /** les assaillants atteignent le cœur du village */
  pillage: boolean
  /** identifiants des combattants qui ont rompu ce battement - pour le son */
  rompus: string[]
  /** le champion achéen vient de lancer sa manœuvre (son nom), sinon null */
  championAgit: string | null
  /** il vient de tomber sous vos murs */
  championAbattu: boolean
}

/*
 * Seuils de rupture, en part des effectifs encore debout. Un camp qui a perdu
 * plus de la moitié des siens commence à céder ; avec un héros au premier rang,
 * il tient jusqu'à n'être plus qu'un cinquième. C'est là tout l'écart entre une
 * troupe menée et une troupe abandonnée.
 */
export const SEUIL_PANIQUE = 0.45
export const SEUIL_PANIQUE_HEROS = 0.2
/** probabilité qu'un homme rompe, par seconde, à moral nul */
export const TAUX_PANIQUE = 0.55

/** Fait avancer la bataille d'un pas. `b` est un draft mutable (immer). */
export function tickBataille(b: BattleState, ctx: TickBatailleCtx): TickBatailleOut {
  const { now } = ctx
  const ciel = ctx.mods ?? CIEL_CLAIR
  // la boue, la neige et la canicule freinent tout le monde de la même façon
  const dt = ctx.dt * ciel.vitesse
  const geo = b.geo
  const atkVivants = vivants(b, 'attaque')
  const defVivants = vivants(b, 'defense')
  /** ceux qui rompent ce battement : le store en fait un son et une ligne */
  const rompus: string[] = []
  // bénédictions : elles servent le camp du joueur, d'autant plus que le dieu est chéri
  const protege = now < b.defBuffUntil ? b.campJoueur : null
  const enrage = now < b.atkBuffUntil ? b.campJoueur : null
  const forceAtk = b.atkBuffForce || 1.6
  const forceDef = b.defBuffForce || 0.4
  // passifs de héros : ils valent pour toute la bataille, en plus des bénédictions
  const bonusHeros = b.bonusAtkJoueur ?? 1
  const reducHeros = b.reducJoueur ?? 1
  /*
   * Les ordres du joueur. Ils ne valent QUE pour son camp et QUE pour ceux qu'ils
   * concernent : la posture de la ligne ne change rien aux archers, le tir en
   * cloche rien aux lanciers. Un héros, lui, se bat comme il l'entend.
   */
  const ordres = b.ordres ?? ORDRES_NEUTRES
  const ligne = EFFETS_LIGNE[ordres.ligne] ?? EFFETS_LIGNE.tenir
  const tir = EFFETS_TIR[ordres.tir] ?? EFFETS_TIR.tendu
  /** cet homme obéit-il à la posture de la ligne ? (mêlée du joueur, hors héros) */
  const enLigne = (f: Fighter): boolean => f.camp === b.campJoueur && !f.heros && !estTireur(f.type)
  /*
   * Le champion achéen retourne SA capacité contre le village. Les deux
   * multiplicateurs ci-dessous relisent son état à chaque coup porté : sa fureur
   * s'éteint d'elle-même à l'heure dite, et surtout elle s'éteint À L'INSTANT où
   * on l'abat - c'est tout l'intérêt de préférer sa gorge à celle d'un pillard.
   */
  const champAtk = (f: Fighter): number => {
    const c = b.champion
    return c && !c.abattu && f.camp === 'attaque' && now < c.atkUntil ? 1 + c.atkBonus : 1
  }
  const champReduc = (f: Fighter): number => {
    const c = b.champion
    return c && !c.abattu && f.camp === 'attaque' && now < c.reducUntil ? 1 - c.reduc : 1
  }
  const ouvrages = ctx.defenses
  /*
   * La poterne dérobée : on ne sort pas par la grande porte, on tombe dans le dos
   * de l'assaillant occupé à cogner. La charge y gagne le tiers de sa force.
   */
  const bonusSortie = ouvrages?.poterne && ligne.sortie ? 1.3 : 1
  const multDegats = (attaquant: Fighter): number =>
    (attaquant.camp === enrage ? forceAtk : 1) *
    (attaquant.camp === b.campJoueur ? bonusHeros : 1) *
    (enLigne(attaquant) ? ligne.degats : 1) *
    (attaquant.camp === 'defense' ? bonusSortie : 1) *
    champAtk(attaquant)
  /**
   * Les galeries casematées de Tirynthe : un homme posté sur le rempart s'abrite
   * dans l'épaisseur du mur entre deux volées. Elles ne protègent QUE là — au
   * sol, dans la mêlée, elles ne servent à rien.
   */
  const abriGaleries = (cible: Fighter): number =>
    ouvrages?.galeries && cible.camp === 'defense' && cible.etat === 'siege' ? 0.65 : 1
  const multRecus = (cible: Fighter): number =>
    (cible.camp === protege ? forceDef : 1) *
    (cible.camp === b.campJoueur ? reducHeros : 1) *
    (enLigne(cible) ? ligne.recus : 1) *
    abriGaleries(cible) *
    champReduc(cible)
  /** pas de déplacement de cet homme, posture comprise */
  const pas = (f: Fighter): number => dt * (enLigne(f) ? ligne.vitesse : 1)
  /**
   * Le secteur que le joueur a assigné à cet homme, s'il en a assigné un.
   *
   * Deux façons d'en avoir un, et elles ne se mélangent pas :
   *
   *  · une TROUPE le tient par son type - « les hoplites au nord » vaut pour les
   *    trente hoplites, c'est une garnison qu'on désigne ;
   *  · un HÉROS le porte sur lui (`Fighter.secteur`), parce qu'on le poste
   *    NOMMÉMENT. Hector au nord ne dit rien d'Ajax, et un héros ne suit pas
   *    l'ordre donné aux hoplites du seul fait que le moteur le compte comme tel.
   *    C'est `posterHeros` qui l'inscrit, à l'ouverture de la bataille.
   */
  const secteurAssigne = (f: Fighter): SecteurBataille | null => {
    if (f.camp !== b.campJoueur) return null
    const i = f.heros ? f.secteur : ordres.secteurs[f.type as UnitId]
    return i === undefined ? null : (b.secteurs[Math.min(i, b.secteurs.length - 1)] ?? null)
  }
  let brecheOuverte = false

  /** le secteur d'un assaillant (défaut : le premier front) */
  const secteurDe = (f: Fighter) => b.secteurs[Math.min(f.secteur ?? 0, b.secteurs.length - 1)]
  // un héros planté dans la brèche vaut un pan de mur : le secteur redevient infranchissable
  const murTient = (s: (typeof b.secteurs)[number] | undefined): boolean =>
    !!s && (now < (s.boucheeJusqua ?? 0) || (ctx.wallLevel > 0 && s.hp > 0 && !s.breche))

  /*
   * ── LE CHAMPION ACHÉEN ───────────────────────────────────────────────────
   *
   * Il marche en tête, à découvert, et lance sa manœuvre une fois - à l'heure
   * dite, pas avant. Deux choses en découlent, et ce sont les seules qui
   * comptent : on la voit venir, et on peut l'empêcher en le tuant d'abord.
   */
  let championAgit: string | null = null
  let championAbattu = false
  const champ = b.champion
  if (champ && !champ.abattu) {
    const porteur = b.fighters.find((f) => f.id === champ.fighterId)
    if (!porteur || porteur.etat === 'mort') {
      // abattu : sa fureur retombe, son bouclier tombe, la peur se dissipe
      champ.abattu = true
      champ.atkUntil = 0
      champ.reducUntil = 0
      champ.terreurUntil = 0
      championAbattu = true
    } else if (!champ.lancee && now >= champ.capaciteA && b.phase !== 'fini') {
      champ.lancee = true
      const def = CHAMPION_PAR_ID[champ.id]
      const e = def?.capacite.effet
      if (e) {
        switch (e.type) {
          case 'fureur':
            champ.atkUntil = now + e.duree
            champ.atkBonus = e.degats
            break
          case 'protection':
            champ.reducUntil = now + e.duree
            champ.reduc = e.reduction
            break
          case 'terreur':
            champ.terreurUntil = now + e.duree
            champ.terreurSeuil = e.seuil
            break
          case 'sape': {
            /*
             * Le pan le plus entamé encore debout : celui qui va lâcher. Balayage
             * du minimum et non `sort(...)[0]` : deux pans intacts portent le même
             * nombre de points (`hpTotal / fronts.length`), l'égalité est donc la
             * règle et non l'exception. Le `<` strict garde le PREMIER des pans à
             * égalité - la porte avant le mur du sud - au lieu de laisser
             * `Array.sort` en décider.
             */
            let cible: SecteurBataille | undefined
            for (const s of b.secteurs) {
              if (s.breche || s.hp <= 0) continue
              if (!cible || s.hp < cible.hp) cible = s
            }
            if (cible) {
              cible.hp = Math.max(0, cible.hp * (1 - e.part))
              b.effects.push({ id: uid('fx'), type: 'poussiere', x: cible.x, y: cible.y - 10, until: now + 1400 })
            }
            break
          }
          case 'renforts': {
            // la réserve débouche derrière la première colonne, en pleine bataille
            const st = statsDe(e.enemy)
            const f0 = b.secteurs[0]
            for (let k = 0; k < e.count; k++) {
              const slot = posteSiege(geo, 40 + k, f0.angle)
              b.fighters.push({
                id: uid('atk'),
                camp: 'attaque',
                type: e.enemy,
                hp: st.hp,
                maxHp: st.hp,
                atk: st.atk,
                x: geo.spawn.x + (hasard() - 0.5) * 40,
                y: geo.spawn.y + (k - (e.count - 1) / 2) * 26,
                tx: slot.x,
                ty: slot.y,
                speed: st.speed,
                etat: 'marche',
                secteur: 0,
                nextHit: 0,
                seed: hasard(),
              })
            }
            break
          }
        }
        championAgit = def.capacite.nom
      }
    }
  }

  /**
   * Déroute - uniquement pour les troupes du JOUEUR en expédition :
   * les assaillants d'un village se battent jusqu'au dernier homme.
   */
  const initial = tailleVague(b.wave)
  if (
    b.campJoueur === 'attaque' &&
    b.phase !== 'fini' &&
    atkVivants.length > 0 &&
    atkVivants.length <= initial * 0.3
  ) {
    for (const f of atkVivants) {
      f.etat = 'fuite'
      f.tx = geo.spawn.x + 40
      f.ty = geo.spawn.y
    }
  }

  /*
   * ── LE MORAL DE LA TROUPE ────────────────────────────────────────────────
   *
   * Une bataille ne se décide pas au dernier homme : elle se décide quand une
   * ligne casse. Jusqu'ici, chaque figurine se battait jusqu'à la mort, ce qui
   * rendait toutes les mêlées identiques - on additionnait des points de vie.
   *
   * Le moral d'un camp, c'est la part de ses effectifs encore debout. Sous un
   * seuil, chaque combattant peut ROMPRE, un par un, en commençant par les plus
   * entamés : c'est ce qui fait qu'une ligne s'effrite au lieu de fondre.
   *
   * Et un héros RALLIE. Tant qu'il tient debout, le seuil de rupture de son camp
   * s'abaisse fortement - sa seule présence vaut mieux que dix hommes de plus,
   * ce qui est exactement ce que promettent les fiches de héros.
   */
  const moralDe = (camp: 'attaque' | 'defense'): number => {
    const total = camp === 'attaque' ? initial : b.fighters.filter((f) => f.camp === camp).length
    if (total <= 0) return 1
    return Math.min(1, vivants(b, camp).length / total)
  }
  const heroDebout = (camp: 'attaque' | 'defense'): boolean =>
    b.fighters.some((f) => f.camp === camp && f.heros && f.etat !== 'mort' && f.etat !== 'fuite')
  b.moral = { attaque: moralDe('attaque'), defense: moralDe('defense') }
  if (b.phase !== 'fini') {
    for (const camp of ['attaque', 'defense'] as const) {
      // les assaillants d'un village n'ont pas de ligne à tenir : ils pillent
      if (camp === 'attaque' && b.campJoueur === 'defense') continue
      // le mur de boucliers ne rompt presque jamais ; la charge casse vite ; et
      // la prophétie de Cassandre fait rompre bien avant l'heure
      const peur = champ && !champ.abattu && now < champ.terreurUntil ? champ.terreurSeuil : 1
      const seuil =
        (heroDebout(camp) ? SEUIL_PANIQUE_HEROS : SEUIL_PANIQUE) *
        (camp === b.campJoueur ? ligne.seuil * peur : 1)
      const m = b.moral[camp]
      if (m >= seuil) continue
      // plus on est bas sous le seuil, plus la rupture est probable
      const risque = ((seuil - m) / seuil) * TAUX_PANIQUE * dt
      const debout = vivants(b, camp)
      // un seul homme peut rompre par battement : une ligne s'effrite, elle
      // ne s'évapore pas - et l'on part par les plus mal en point
      /*
       * On part par les plus mal en point. Balayage du minimum, pour deux raisons
       * qui se cumulent : au premier battement TOUS les hommes sont intacts (part
       * de PV égale à 1), et un `maxHp` nul - une figurine sans point de vie, ce
       * que le moteur ne fabrique pas mais qu'un état rejoué pourrait porter -
       * rendait `NaN`, ce qui laissait l'ordre du tri indéfini. Le `<` strict
       * désigne le premier des ex æquo dans l'ordre de `b.fighters`.
       */
      let candidat: Fighter | undefined
      let plusBas = Infinity
      for (const f of debout) {
        if (f.heros) continue
        const part = f.maxHp > 0 ? f.hp / f.maxHp : 0
        if (part < plusBas) {
          plusBas = part
          candidat = f
        }
      }
      if (candidat && hasard() < risque) {
        candidat.etat = 'fuite'
        candidat.tx = camp === 'attaque' ? geo.spawn.x + 40 : geo.place.x
        candidat.ty = camp === 'attaque' ? geo.spawn.y : geo.place.y
        rompus.push(candidat.id)
      }
    }
  }

  for (const f of b.fighters) {
    if (f.etat === 'mort') continue

    if (f.etat === 'fuite') {
      if (versCible(f, dt)) f.etat = 'mort' // sorti de la carte (hp > 0 = survivant en retraite)
      continue
    }

    if (f.camp === 'attaque') {
      const sect = secteurDe(f)
      const tient = murTient(sect)
      if (f.etat === 'marche') {
        if (versCible(f, pas(f))) f.etat = tient ? 'siege' : 'melee'
        if (!tient && f.etat === 'siege') f.etat = 'melee'
        // le mur de ce secteur est tombé : entrer par la brèche
        if (f.etat === 'melee' && sect) {
          const e = entreeSecteur(geo, sect.angle)
          f.tx = e.x
          f.ty = e.y
        }
        continue
      }
      if (f.etat === 'siege') {
        if (!tient) {
          f.etat = 'melee'
        } else if (now >= f.nextHit && sect) {
          f.nextHit = now + CADENCE_MUR
          // un héros adossé au pan encaisse sa part des coups de bélier
          const abri = now < (sect.abriJusqua ?? 0) ? 1 - (sect.abriPart ?? 0) : 1
          sect.hp -= statsDe(f.type).wallDps * multDegats(f) * abri
          if (hasard() < 0.22 && b.effects.length < 40) {
            b.effects.push({ id: uid('fx'), type: 'poussiere', x: f.x - 5, y: f.y - 7, until: now + 650 })
          }
          if (sect.hp <= 0 && !sect.breche) {
            sect.hp = 0
            sect.breche = true
            brecheOuverte = true
            // `breche` global : vrai dès qu'UN secteur cède (les archers descendent)
            b.breche = true
            b.effects.push({ id: uid('fx'), type: 'breche', x: sect.x, y: sect.y, until: now + 4000 })
          }
        }
        continue
      }
      // mêlée : franchir la brèche de son secteur puis chercher un défenseur
      const cible = choisirCible(f, defVivants)
      if (!cible && ctx.cibles && ctx.cibles.length > 0) {
        /*
         * Plus personne pour les arrêter : ils s'en prennent aux bâtiments.
         * Le cœur est visé en dernier — les assaillants pillent ce qui est à
         * portée avant de s'attaquer au Palladion, ce qui laisse au joueur le
         * temps d'une contre-attaque plutôt qu'une défaite immédiate.
         */
        const libres = ctx.cibles.filter((c) => c.hp > 0 && (!c.coeur || ctx.cibles!.every((o) => o.coeur || o.hp <= 0)))
        const bat = libres.length > 0 ? libres : ctx.cibles.filter((c) => c.hp > 0)
        let proche = bat[0]
        let bd = Infinity
        for (const c of bat) {
          const ux = c.x - f.x
          const uy = c.y - f.y
          const d = Math.sqrt(ux * ux + uy * uy)
          if (d < bd) {
            bd = d
            proche = c
          }
        }
        if (proche) {
          f.tx = proche.x
          f.ty = proche.y
          if (bd > 26) {
            versCible(f, pas(f))
          } else if (now >= f.nextHit) {
            f.nextHit = now + CADENCE_MELEE
            proche.hp = Math.max(0, proche.hp - DPS_BATIMENT * (CADENCE_MELEE / 1000) * multDegats(f))
            if (b.effects.length < 40) {
              b.effects.push({ id: uid('fx'), type: 'poussiere', x: proche.x, y: proche.y - 8, until: now + 700 })
            }
          }
          continue
        }
      }
      if (!cible) {
        // plus de défenseurs : cap sur la place (pillage)
        f.tx = geo.place.x
        f.ty = geo.place.y
        versCible(f, pas(f))
        continue
      }
      approcher(f, cible)
      if (dist(f, cible) > CONTACT + 1) {
        versCible(f, pas(f))
      } else if (now >= f.nextHit) {
        f.nextHit = now + CADENCE_MELEE
        frapper(b, cible, f.atk * multDegats(f) * multRecus(cible), now)
      }
      continue
    }

    // ── Défenseurs ──
    // tout ce qui tire depuis le rempart : archers et frondeurs. La fronde porte
    // moins loin, ce qui est la contrepartie de son prix - aucun bronze
    if (f.type === 'archer' || f.type === 'frondeur') {
      const surMur = f.etat === 'siege'
      const portePlusCourt = f.type === 'frondeur' ? PORTEE_FRONDE : 1
      // un tireur ne quitte le rempart que si SON pan de mur est tombé
      if (surMur && secteurProche(b, f).breche) {
        f.etat = 'melee'
        f.tx = geo.ralliement.x + (hasard() - 0.5) * 40
        f.ty = geo.ralliement.y + (hasard() - 0.5) * 40
        f.atk *= 0.6
      }
      if (f.etat === 'melee') versCible(f, dt)
      if (now >= f.nextHit) {
        // par la brume ou sous la pluie, on ne voit ni ne porte aussi loin ;
        // en cloche, on tire par-dessus tout et l'on porte moitié plus loin
        const portee = (surMur ? PORTEE_ARC_MUR : PORTEE_ARC_SOL) * ciel.portee * portePlusCourt * tir.portee
        let cibles = atkVivants.filter((a) => dist(f, a) <= portee)
        /*
         * Un tireur affecté à un pan ne gaspille pas ses flèches sur l'autre bout
         * de la plaine : il couvre SON secteur, et ne regarde ailleurs que s'il
         * n'y a plus personne devant lui.
         */
        const monSecteur = secteurAssigne(f)
        if (monSecteur) {
          const i = b.secteurs.indexOf(monSecteur)
          const sien = cibles.filter((a) => (a.secteur ?? 0) === i)
          if (sien.length > 0) cibles = sien
        }
        // tir en cloche : on n'ajuste plus un homme, on arrose le plus gros tas
        const cible = tir.masse ? plusMasse(cibles) : plusProche(f, cibles)
        if (cible) {
          f.nextHit = now + CADENCE_ARC
          const d = dist(f, cible)
          b.projectiles.push({
            id: uid('p'),
            x0: f.x,
            y0: f.y - 9,
            x1: cible.x,
            y1: cible.y - 6,
            start: now,
            dur: Math.max(260, (d / VITESSE_FLECHE) * 1000),
            targetId: cible.id,
            // corde détendue par la pluie, ou flèche qui retombe de haut : elle
            // arrive dans les deux cas, mais mollement
            dmg: f.atk * multDegats(f) * ciel.tir * tir.degats,
          })
        }
      }
      continue
    }

    // mêlée (lanciers, hoplites, peltastes) : ils courent au secteur enfoncé.
    // Tant que tout tient, ils patientent au ralliement ; dès qu'un pan cède,
    // ils s'y portent - c'est au joueur de compter sur eux pour boucher un trou.
    const dedans = atkVivants.filter((a) => a.etat === 'melee' && estDedans(geo, a))
    /*
     * « Charger » change la donne : la ligne ne reste plus à l'abri à attendre
     * que le mur cède. Elle sort par la porte et va crever les béliers là où ils
     * cognent. C'est le seul moyen de sauver un pan qui va tomber - et le plus
     * cher, car dehors, il n'y a plus de mur pour couvrir personne.
     */
    const gibier = dedans.length > 0 ? dedans : ligne.sortie ? atkVivants : b.secteurs.some((s) => !s.breche) ? [] : atkVivants
    /*
     * Un secteur assigné, c'est une garnison : ces hommes-là tiennent CE pan et
     * ne courent pas ailleurs, même si l'on s'égorge à l'autre bout de l'enceinte.
     * Sans cela, un assaut sur trois fronts se répondait toujours en masse au
     * plus chaud - et les deux autres pans tombaient tout seuls.
     */
    const secteur = secteurAssigne(f)
    const iSecteur = secteur ? b.secteurs.indexOf(secteur) : -1
    const menace = iSecteur >= 0 ? gibier.filter((a) => (a.secteur ?? 0) === iSecteur) : gibier
    // où cet homme se tient quand il n'a personne à frapper
    const trou = b.secteurs.find((s) => s.breche)
    const ancre = secteur
      ? entreeSecteur(geo, secteur.angle)
      : trou
        ? entreeSecteur(geo, trou.angle)
        : geo.ralliement
    // mur de boucliers : on ne rompt pas la ligne pour courir après un homme
    const aPortee = ligne.laisse > 0 ? menace.filter((a) => dist(a, ancre) <= ligne.laisse) : menace
    /*
     * Le peltaste, lui, choisit sa proie : il va d'abord aux TIREURS. C'est toute
     * sa raison d'être - un javelot rattrape un archer, une lance de milice ne
     * rattrape rien. Sans ce tri, il n'était qu'un lancier un peu plus cher.
     */
    /*
     * Le peltaste va aux TIREURS. Le char, lui, va aux tireurs ET aux machines :
     * un attelage qui fond sur un bélier avant qu'il ait cogné trois fois vaut
     * mieux que dix lanciers qui l'atteignent quand le mur est déjà percé.
     */
    const proies =
      f.type === 'char'
        ? aPortee.filter((a) => estTireur(a.type) || a.type === 'belier')
        : f.type === 'peltaste'
          ? aPortee.filter((a) => estTireur(a.type))
          : []
    const tireurs = proies
    const cible = choisirCible(f, tireurs.length > 0 ? tireurs : aPortee)
    if (!cible) {
      f.tx = ancre.x
      f.ty = ancre.y + (f.seed - 0.5) * 60
      versCible(f, pas(f))
      continue
    }
    approcher(f, cible)
    if (dist(f, cible) > CONTACT + 1) {
      versCible(f, pas(f))
    } else if (now >= f.nextHit) {
      f.nextHit = now + CADENCE_MELEE
      frapper(b, cible, f.atk * multDegats(f) * multRecus(cible), now)
    }
  }

  /*
   * Le bastion de la porte. Il ne tire pas : il place les hommes du rempart en
   * surplomb du flanc que le bouclier ne couvre pas. Tout assaillant qui cogne
   * le pan de la porte y laisse du sang, sans qu'on ait rien à ordonner — mais
   * seulement tant que ce pan tient, car un bastion sur une brèche ne surplombe
   * plus rien.
   */
  if (ouvrages?.bastion && b.secteurs.length > 0) {
    const porte = b.secteurs[0]
    if (!porte.breche && porte.hp > 0) {
      for (const f of atkVivants) {
        if (f.etat !== 'siege') continue
        if (Math.min(f.secteur ?? 0, b.secteurs.length - 1) !== 0) continue
        frapper(b, f, 6 * dt, now)
      }
    }
  }

  // ── Tours d'archers : chacune tire tant que SON pan de mur tient ──
  if (ctx.wallLevel > 0) {
    const enragees = enrage === 'defense' ? forceAtk : 1
    for (const t of b.toursDef) {
      if (now < t.nextHit) continue
      if (secteurProche(b, t).breche) continue
      // la grâce de Poséidon allonge le tir : la plaine se couvre de flèches
      const porteeTour = TOUR_PORTEE * ciel.portee * (b.porteeTours ?? 1)
      const aPortee = atkVivants.filter((a) => a.etat !== 'mort' && dist(t, a) <= porteeTour)
      const cible = plusProche(t, aPortee)
      if (!cible) continue
      t.nextHit = now + TOUR_CADENCE_MS
      const d = dist(t, cible)
      b.projectiles.push({
        id: uid('p'),
        x0: t.x,
        y0: t.y - 12,
        x1: cible.x,
        y1: cible.y - 6,
        start: now,
        dur: Math.max(260, (d / VITESSE_FLECHE) * 1000),
        targetId: cible.id,
        dmg: TOUR_DMG * enragees * ciel.tir,
      })
    }
  }

  /*
   * ── La Redoute : elle ne parle qu'après la brèche ──
   *
   * L'exact inverse de la tour, et c'est tout son sens. Une tour se tait dès que
   * SON pan tombe ; la Redoute reste muette tant que l'enceinte tient, puis
   * ouvre le feu sur ce qui est entré. Elle ne tire que sur l'INTÉRIEUR : un
   * assaillant encore devant le mur ne l'intéresse pas, sinon elle doublerait
   * les tours au lieu de les relayer.
   *
   * `ctx.redouteHp` vient du store - c'est `buildings.redoute.hp` : à zéro
   * l'ouvrage est abattu et les
   * scorpions se taisent ensemble.
   */
  if (b.breche && b.redouteDef && (ctx.redouteHp ?? 1) > 0) {
    const enragees = enrage === 'defense' ? forceAtk : 1
    const dedans = atkVivants.filter(
      (a) => a.etat !== 'mort' && ((a.x - geo.cx) / geo.rx) ** 2 + ((a.y - geo.cy) / geo.ry) ** 2 <= 1,
    )
    for (const poste of b.redouteDef) {
      if (now < poste.nextHit) continue
      const aPortee = dedans.filter((a) => dist(poste, a) <= REDOUTE_PORTEE * ciel.portee)
      const cible = plusProche(poste, aPortee)
      if (!cible) continue
      poste.nextHit = now + REDOUTE_CADENCE_MS
      const d = dist(poste, cible)
      b.projectiles.push({
        id: uid('p'),
        x0: poste.x,
        y0: poste.y - 8,
        x1: cible.x,
        y1: cible.y - 6,
        start: now,
        dur: Math.max(160, (d / REDOUTE_VITESSE) * 1000),
        targetId: cible.id,
        dmg: poste.dmg * enragees * ciel.tir,
      })
    }
  }

  // Projectiles : impact à l'arrivée
  const restants = []
  for (const p of b.projectiles) {
    if (now - p.start >= p.dur) {
      const cible = b.fighters.find((f) => f.id === p.targetId)
      if (cible && cible.etat !== 'mort') {
        frapper(b, cible, p.dmg * multRecus(cible), now)
      }
    } else {
      restants.push(p)
    }
  }
  b.projectiles = restants
  b.effects = b.effects.filter((e) => e.until > now)

  // Phase
  if (b.phase === 'approche' && b.fighters.some((f) => f.camp === 'attaque' && f.etat !== 'marche')) {
    b.phase = b.breche ? 'melee' : 'siege'
  }
  if (b.breche && b.phase === 'siege') b.phase = 'melee'

  // Fin ?
  const atkRestants = vivants(b, 'attaque')
  const defRestants = vivants(b, 'defense')
  const enFuite = b.fighters.some((f) => f.camp === 'attaque' && f.etat === 'fuite')
  let finie = false
  let victoireDefense = false
  let fuite = false
  let pillage = false

  /*
   * La défaite ne se joue plus à « un assaillant a touché la place ». Tant qu'un
   * bâtiment tient, la partie continue : les assaillants doivent abattre le cœur.
   * C'est là tout l'intérêt des ouvrages intérieurs — sans eux la chute du mur
   * valait la fin, et l'on n'avait plus rien à décider.
   */
  const coeur = ctx.cibles?.find((c) => c.coeur)
  const coeurTombe = coeur ? coeur.hp <= 0 : false
  if (atkRestants.length === 0 && !enFuite) {
    finie = true
    victoireDefense = true
  } else if (coeur) {
    if (coeurTombe) {
      finie = true
      victoireDefense = false
      pillage = true
    }
  } else if (defRestants.length === 0 && atkRestants.some((f) => dist(f, geo.place) < 30)) {
    // expéditions et parties d'avant la structure des bâtiments : ancienne règle
    finie = true
    victoireDefense = false
    pillage = true
  }
  // tous les fuyards sortis et plus d'attaquants actifs
  if (!finie && b.fighters.filter((f) => f.camp === 'attaque').every((f) => f.etat === 'mort')) {
    finie = true
    victoireDefense = true
    fuite = enFuite
  }

  // total des points de structure restants, tous secteurs confondus
  const wallHp = b.secteurs.reduce((a, s) => a + Math.max(0, s.hp), 0)
  return { wallHp, brecheOuverte, finie, victoireDefense, fuite, pillage, rompus, championAgit, championAbattu }
}

/** Pertes défenseurs : effectifs engagés − survivants (par proportion de PV visibles). */
export function pertesDefense(b: BattleState): Partial<Record<UnitId, number>> {
  const pertes: Partial<Record<UnitId, number>> = {}
  for (const u of Object.keys(b.engages) as UnitId[]) {
    const engages = b.engages[u] ?? 0
    // les héros combattent avec la garnison mais n'en font pas partie : les
    // compter ici rayerait des hoplites de l'effectif à chaque bataille
    const figs = b.fighters.filter((f) => f.camp === 'defense' && f.type === u && !f.heros)
    const totalMax = figs.reduce((a, f) => a + f.maxHp, 0)
    const totalHp = figs.reduce((a, f) => a + (f.etat === 'mort' ? 0 : Math.max(0, f.hp)), 0)
    const survivants = totalMax > 0 ? Math.round(engages * (totalHp / totalMax)) : 0
    const p = engages - survivants
    if (p > 0) pertes[u] = Math.min(engages, p)
  }
  return pertes
}

/** Morts côté assaillant, par type (les fuyards hp>0 sont des survivants). */
export function mortsAttaque(b: BattleState): Partial<Record<string, number>> {
  const morts: Partial<Record<string, number>> = {}
  for (const f of b.fighters) {
    if (f.camp === 'attaque' && f.etat === 'mort' && f.hp <= 0) {
      morts[f.type] = (morts[f.type] ?? 0) + 1
    }
  }
  return morts
}

export function pertesAttaque(b: BattleState): number {
  return b.fighters.filter((f) => f.camp === 'attaque' && f.etat === 'mort' && f.hp <= 0).length
}

/**
 * Foudre de Zeus : ~120 dégâts (× la ferveur du dieu) répartis sur les 6 ennemis
 * les plus proches du point le plus chaud - la brèche s'il y en a une, sinon la porte.
 */
export function foudreDeZeus(b: BattleState, now: number, force = 1, palier = 2): number {
  const campEnnemi = b.campJoueur === 'defense' ? 'attaque' : 'defense'
  const trou = b.secteurs.find((s) => s.breche)
  const epicentre = trou ?? b.geo.porte
  const cibles = lesPlusProches(vivants(b, campEnnemi), epicentre, 6)
  for (const c of cibles) {
    c.hp -= (120 * force) / Math.max(1, cibles.length)
    if (c.hp <= 0 && c.etat !== 'mort') {
      c.etat = 'mort'
      c.mortAt = now
    }
    b.effects.push({
      id: uid('fx'),
      type: 'divin',
      dieu: 'zeus',
      palier,
      x: c.x,
      y: c.y,
      debut: now,
      until: now + 1400,
    })
  }
  return cibles.length
}

/** marque visuellement l'intervention d'un dieu, au point le plus chaud de la scène */
export function marqueDivine(b: BattleState, now: number, dieu: GodId, palier: number, duree = 2600): void {
  const s = secteurChaud(b)
  const p = s ?? b.geo.porte
  b.effects.push({ id: uid('fx'), type: 'divin', dieu, palier, x: p.x, y: p.y, debut: now, until: now + duree })
}

// ── Capacités de héros résolues sur le champ de bataille ─────────────────────

/**
 * Fureur du Pélide : un seul homme fauche une ligne entière. Les dégâts sont
 * répartis sur les ennemis massés autour du pan le plus chaud.
 */
export function fureurHeros(b: BattleState, now: number, degats: number, heros: string): number {
  const campEnnemi = b.campJoueur === 'defense' ? 'attaque' : 'defense'
  const s = secteurChaud(b)
  const epicentre = s ?? b.geo.porte
  const cibles = lesPlusProches(vivants(b, campEnnemi), epicentre, 8)
  for (const c of cibles) {
    c.hp -= degats / Math.max(1, cibles.length)
    if (c.hp <= 0 && c.etat !== 'mort') {
      c.etat = 'mort'
      c.mortAt = now
      b.effects.push({ id: uid('fx'), type: 'poussiere', x: c.x, y: c.y - 3, until: now + 700 })
    }
  }
  b.effects.push({ id: uid('fx'), type: 'heros', heros, x: epicentre.x, y: epicentre.y, debut: now, until: now + 1800 })
  return cibles.length
}

/** Aristie : le plus redoutable des défenseurs adverses tombe sur place. */
export function abattreChef(b: BattleState, now: number, heros: string): string | null {
  const campEnnemi = b.campJoueur === 'defense' ? 'attaque' : 'defense'
  const pool = vivants(b, campEnnemi)
  if (pool.length === 0) return null
  let cible = pool[0]
  for (const f of pool) if (f.maxHp > cible.maxHp) cible = f
  cible.hp = 0
  cible.etat = 'mort'
  cible.mortAt = now
  b.effects.push({ id: uid('fx'), type: 'heros', heros, x: cible.x, y: cible.y, debut: now, until: now + 1500 })
  return cible.type
}

/** Rempart de Troie : le pan le plus menacé n'encaisse plus qu'une part des coups. */
export function abriterSecteur(b: BattleState, now: number, duree: number, part: number, heros: string): string | null {
  const s = secteurChaud(b)
  if (!s) return null
  s.abriJusqua = now + duree
  s.abriPart = part
  b.effects.push({ id: uid('fx'), type: 'heros', heros, x: s.x, y: s.y, debut: now, until: now + duree })
  return s.nom
}

/** Mur de boucliers : un pan effondré redevient infranchissable le temps voulu. */
export function boucherBreche(b: BattleState, now: number, duree: number, heros: string): string | null {
  const trou = b.secteurs.find((s) => s.breche) ?? secteurChaud(b)
  if (!trou) return null
  trou.boucheeJusqua = now + duree
  b.effects.push({ id: uid('fx'), type: 'heros', heros, x: trou.x, y: trou.y, debut: now, until: now + duree })
  return trou.nom
}

/** Sonne la retraite : tous les assaillants encore debout fuient vers leur point d'entrée. */
export function sonnerRetraite(b: BattleState): void {
  for (const f of vivants(b, 'attaque')) {
    f.etat = 'fuite'
    f.tx = b.geo.spawn.x + 40
    f.ty = b.geo.spawn.y
  }
}

// ── Rejouer une bataille sans écran ───────────────────────────────────────────

/*
 * ═══════════════════ LE DÉROULÉ HORS ÉCRAN ═══════════════════
 *
 * Le store fait avancer une bataille battement par battement, au rythme de la
 * boucle d'animation. Vérifier le rapport de raid d'un adversaire demande
 * l'inverse : mener la MÊME bataille jusqu'à son terme en un seul appel, hors
 * écran, en quelques millisecondes, et lire l'issue.
 *
 * Deux exigences, et ce sont elles qui décident de la signature :
 *
 *  · LE PAS EST FIXE. `dt` entre dans les déplacements, dans les cadences et
 *    dans le jet de panique (`risque` est proportionnel à `dt`). Une bataille
 *    déroulée au rythme réel de l'écran - 250 ms, puis 263, puis 241 parce que
 *    l'onglet a bronché - ne se rejoue pas. On avance donc par pas de `TICK_MS`
 *    exactement, comme le fait le store quand la machine suit.
 *  · LE DÉROULÉ EST BORNÉ. Une bataille peut ne jamais finir : des assaillants
 *    qui ne peuvent pas percer un mur qu'ils n'entament plus, une garnison
 *    intuable. `MAX_BATTEMENTS` rend la main sans verdict plutôt que de figer
 *    l'onglet - et `terminee: false` dit à l'appelant que l'issue ne vaut rien.
 *    La retraite forcée reprend le délai des expéditions, faute de quoi une
 *    colonne bloquée devant une place imprenable épuiserait la borne.
 */

/** au-delà, on rend la main sans verdict : douze minutes de jeu, largement de quoi finir */
export const MAX_BATTEMENTS = 3000
/**
 * Au bout de trois minutes de bataille, la colonne rompt le contact.
 *
 * On REPREND la constante des expéditions plutôt que d'en recopier le nombre :
 * c'est le même délai que celui que le store applique à une colonne partie au
 * loin, et deux 180 000 écrits à deux endroits finissent par se séparer le jour
 * où l'un des deux est réglé. Le jour venu, un raid rejoué sonnerait la retraite
 * à un autre battement que le raid joué, et la vérification refuserait un
 * rapport honnête. `expeditions.ts` ne dépend que de `data`, `heros` et `types` :
 * l'emprunt ne crée aucun cycle.
 */
export const RETRAITE_APRES_MS = EXPEDITION_TIMEOUT_MS

export interface OptionsDeroule {
  /** niveau des remparts du camp défenseur : le moteur le relit à chaque battement */
  wallLevel: number
  /** instant du premier battement (par défaut celui de la création de la bataille) */
  debut?: number
  /** borne du déroulé, en battements */
  maxBattements?: number
  /** délai avant retraite forcée ; `0` pour n'en poser aucune */
  retraiteApresMs?: number
  /**
   * Ce que le contexte porte en plus, recalculé à chaque battement : les
   * bâtiments encore debout, les ouvrages, la météo. Rendre le MÊME tableau de
   * cibles à chaque appel, comme le store rend le même état : un tableau neuf
   * remettrait d'aplomb à chaque battement les bâtiments qu'on vient d'abattre.
   *
   * `now`, `dt` et `wallHp` ne s'y donnent pas : le déroulé pose l'horloge (les
   * accepter d'ailleurs romprait le pas fixe) et reporte lui-même la structure
   * restante d'un battement au suivant.
   */
  contexte?: (now: number) => Omit<TickBatailleCtx, 'now' | 'dt' | 'wallLevel' | 'wallHp'>
}

export interface Deroule {
  /** l'issue du dernier battement, telle que le store la lit */
  fin: TickBatailleOut
  /** nombre de battements joués */
  battements: number
  /** faux si la borne a été atteinte avant le terme : l'issue ne veut alors rien dire */
  terminee: boolean
  /** instant du dernier battement joué */
  now: number
}

/**
 * Mène une bataille jusqu'à son terme, au pas fixe, sans rien afficher.
 *
 * `b` est mutée : à la sortie, on peut lire ses pertes (`pertesDefense`,
 * `mortsAttaque`), ses secteurs et ses combattants - c'est ce qui permet de
 * comparer deux déroulés champ par champ, et non seulement sur le mot
 * « victoire ».
 */
export function deroulerBataille(b: BattleState, opts: OptionsDeroule): Deroule {
  const pas = TICK_MS
  const max = Math.max(1, Math.floor(opts.maxBattements ?? MAX_BATTEMENTS))
  const retraite = opts.retraiteApresMs ?? RETRAITE_APRES_MS
  let now = opts.debut ?? b.startedAt
  let fin: TickBatailleOut = {
    wallHp: b.secteurs.reduce((a, s) => a + Math.max(0, s.hp), 0),
    brecheOuverte: false,
    finie: false,
    victoireDefense: false,
    fuite: false,
    pillage: false,
    rompus: [],
    championAgit: null,
    championAbattu: false,
  }
  let battements = 0
  while (battements < max) {
    now += pas
    battements++
    if (retraite > 0 && now - b.startedAt > retraite) sonnerRetraite(b)
    fin = tickBataille(b, {
      ...(opts.contexte?.(now) ?? {}),
      now,
      dt: pas / 1000,
      wallLevel: opts.wallLevel,
      wallHp: fin.wallHp,
    })
    if (fin.finie) return { fin, battements, terminee: true, now }
  }
  return { fin, battements, terminee: false, now }
}
