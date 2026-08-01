import { ENEMIES, MAP, TOUR_ANGLES, TOUR_CADENCE_MS, TOUR_DMG, TOUR_PORTEE, UNITS, WALL_HP } from './data'
import { statsCombatHeros } from './heros'
import type {
  BattleGeo,
  BattleState,
  EnemyId,
  Fighter,
  GodId,
  HeroId,
  SecteurBataille,
  UnitId,
  WaveUnit,
} from './types'

let seq = 0
export function uid(prefix: string): string {
  return `${prefix}-${++seq}`
}

/** stats communes ennemis / unités du joueur */
function statsDe(type: EnemyId | UnitId): { atk: number; hp: number; speed: number; wallDps: number } {
  const e = ENEMIES[type as EnemyId]
  if (e) return { atk: e.atk, hp: e.hp, speed: e.speed, wallDps: e.wallDps }
  const u = UNITS[type as UnitId]
  // le peltaste court : c'est la moitié de ce qu'on achète en le levant
  return { atk: u.atk, hp: u.hp, speed: type === 'peltaste' ? 58 : 38, wallDps: u.wallDps }
}

/** ce qui tire de loin, dans les deux camps — la proie du peltaste */
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
 * ce qui donnait une pile de figurines superposées — illisible, et impossible
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
  let budget = threat * 5.5 * (0.85 + Math.random() * 0.3)
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
    let r = Math.random() * somme
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
  /** angles des pans qui se sont effondrés — vides si l'enceinte a tenu partout */
  anglesOuverts: number[]
}

/**
 * Assaut résolu sans spectacle, pour la nuit passée onglet fermé.
 *
 * Les fronts comptent, ici aussi. La résolution hors-ligne marquait
 * forfaitairement la porte comme enfoncée dès que `wallHp` tombait à zéro : au
 * réveil, le joueur voyait toujours la même brèche au même endroit, quel que
 * soit le nombre de colonnes annoncées la veille. On répartit donc la structure
 * entre les pans assaillis — comme le fait `creerBataille` — et l'on rend la
 * liste de ceux qui ont réellement cédé.
 */
export function resoudreHorsLigne(
  wave: WaveUnit[],
  army: Record<UnitId, number>,
  wallLevel: number,
  wallHp: number,
  tours = 0,
  fronts: { angle: number }[] = [],
): ResultatHorsLigne {
  const atk = puissanceVague(wave)
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
   * compte : c'est la force BRUTE qui décide si un pan s'ouvre — un mur réduit à
   * vingt points ne « limite » pas le bélier, il cède.
   */
  const degatsBruts = Math.round(atk * (victoire ? 0.8 : 1.6))
  const degatsRemparts = Math.min(wallHp, degatsBruts)
  /*
   * Chaque pan assailli reçoit sa part de la structure ET sa part des coups — mais
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
// Rythme volontairement posé : la bataille se lit comme une scène — colonne en
// approche, salves espacées, mêlée qui dure. Les dégâts par coup ne bougent pas,
// seule la cadence s'étire : l'issue reste la même, le spectacle respire.
const PORTEE_ARC_MUR = 300
const PORTEE_ARC_SOL = 210
/** la fronde porte les deux tiers d'un arc : c'est le prix de sa gratuité */
export const PORTEE_FRONDE = 0.66
export const CADENCE_ARC = 2600
export const CADENCE_MELEE = 2100
export const CADENCE_MUR = 1700
/** vitesse d'une flèche (px/s) — assez lente pour suivre sa course des yeux */
const VITESSE_FLECHE = 250

export interface OptionsBataille {
  attaquants: WaveUnit[]
  defenseurs: Record<UnitId, number>
  wallLevel: number
  now: number
  geo: BattleGeo
  campJoueur: 'attaque' | 'defense'
  /** tours d'archers du camp défenseur */
  tours?: number
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
  /** les murs sont déjà ouverts avant le premier coup (ruse d'Ulysse) */
  sansSiege?: boolean
  /** héros descendus sur le terrain, avec leur niveau */
  herosPresents?: { id: HeroId; niveau: number }[]
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

  // Assaillants — répartis entre les fronts, en colonne de marche par secteur
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
        x: f.spawn.x + dirX * recul + (Math.random() - 0.5) * 26,
        y: f.spawn.y + dirY * recul + ((rang % 3) - 1) * 26 + (Math.random() - 0.5) * 30,
        tx: slot.x,
        ty: slot.y,
        speed: st.speed,
        etat: 'marche',
        secteur: sIdx,
        nextHit: 0,
        seed: Math.random(),
      })
      i++
    }
  }

  // Défenseurs de mêlée — au point de ralliement
  const engages: Partial<Record<UnitId, number>> = {}
  // un compteur commun à toute l'infanterie : la ligne de mêlée est unique
  let placeDef = 0
  for (const u of ['lancier', 'peltaste', 'hoplite'] as UnitId[]) {
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
        x: p.x - 12 - Math.random() * 16,
        y: p.y + (Math.random() - 0.5) * 8,
        tx: p.x,
        ty: p.y,
        speed: statsDe(u).speed,
        etat: 'melee',
        nextHit: 0,
        seed: Math.random(),
      })
    }
  }

  /*
   * Les héros. Ils se battent au premier rang du camp du joueur — devant la
   * ligne quand on défend, en tête de colonne quand on attaque — et ne sont
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
      seed: Math.random(),
    })
  })

  /*
   * Tireurs défenseurs — postés sur les remparts. Archers ET frondeurs : tout ce
   * qui tire monte sur le mur, et n'en descend que si SON pan tombe. Les deux se
   * partagent les créneaux, les frondeurs derrière — moins de portée, moins de
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
        x: p.x + (Math.random() - 0.5) * 14,
        y: p.y - 6,
        tx: p.x,
        ty: p.y - 6,
        speed: 40,
        etat: 'siege', // sur les murs
        nextHit: now + 800 + Math.random() * 800,
        seed: Math.random(),
      })
    }
  }

  // Tours d'archers — postées sur l'enceinte, elles tirent tant que le mur tient
  const toursDef = TOUR_ANGLES.slice(0, wallLevel > 0 ? (opts.tours ?? 0) : 0).map((a) => {
    const p = geoPoint(geo, a)
    return { x: p.x, y: p.y - 32, nextHit: now + 600 + Math.random() * 900 }
  })

  return {
    wave: attaquants,
    fighters,
    projectiles: [],
    toursDef,
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
    result: null,
    engages,
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

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function versCible(f: Fighter, dt: number): boolean {
  const d = Math.hypot(f.tx - f.x, f.ty - f.y)
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
    b.effects.push({ id: uid('fx'), type: 'impact', x: cible.x + (Math.random() - 0.5) * 4, y: cible.y - 8, until: now + 320 })
  }
}

export interface TickBatailleCtx {
  now: number
  dt: number
  wallHp: number
  wallLevel: number
  /** ce que le ciel impose ce jour-là : portée, allure, force des tirs */
  mods?: { portee: number; vitesse: number; tir: number }
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
  /** identifiants des combattants qui ont rompu ce battement — pour le son */
  rompus: string[]
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
  const multDegats = (attaquant: Fighter): number =>
    (attaquant.camp === enrage ? forceAtk : 1) * (attaquant.camp === b.campJoueur ? bonusHeros : 1)
  const multRecus = (cible: Fighter): number =>
    (cible.camp === protege ? forceDef : 1) * (cible.camp === b.campJoueur ? reducHeros : 1)
  let brecheOuverte = false

  /** le secteur d'un assaillant (défaut : le premier front) */
  const secteurDe = (f: Fighter) => b.secteurs[Math.min(f.secteur ?? 0, b.secteurs.length - 1)]
  // un héros planté dans la brèche vaut un pan de mur : le secteur redevient infranchissable
  const murTient = (s: (typeof b.secteurs)[number] | undefined): boolean =>
    !!s && (now < (s.boucheeJusqua ?? 0) || (ctx.wallLevel > 0 && s.hp > 0 && !s.breche))

  /**
   * Déroute — uniquement pour les troupes du JOUEUR en expédition :
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
   * rendait toutes les mêlées identiques — on additionnait des points de vie.
   *
   * Le moral d'un camp, c'est la part de ses effectifs encore debout. Sous un
   * seuil, chaque combattant peut ROMPRE, un par un, en commençant par les plus
   * entamés : c'est ce qui fait qu'une ligne s'effrite au lieu de fondre.
   *
   * Et un héros RALLIE. Tant qu'il tient debout, le seuil de rupture de son camp
   * s'abaisse fortement — sa seule présence vaut mieux que dix hommes de plus,
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
      const seuil = heroDebout(camp) ? SEUIL_PANIQUE_HEROS : SEUIL_PANIQUE
      const m = b.moral[camp]
      if (m >= seuil) continue
      // plus on est bas sous le seuil, plus la rupture est probable
      const risque = ((seuil - m) / seuil) * TAUX_PANIQUE * dt
      const debout = vivants(b, camp)
      // un seul homme peut rompre par battement : une ligne s'effrite, elle
      // ne s'évapore pas — et l'on part par les plus mal en point
      const candidat = debout.filter((f) => !f.heros).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0]
      if (candidat && Math.random() < risque) {
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
        if (versCible(f, dt)) f.etat = tient ? 'siege' : 'melee'
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
          if (Math.random() < 0.22 && b.effects.length < 40) {
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
      const cible = plusProche(f, defVivants)
      if (!cible) {
        // plus de défenseurs : cap sur la place (pillage)
        f.tx = geo.place.x
        f.ty = geo.place.y
        versCible(f, dt)
        continue
      }
      f.tx = cible.x
      f.ty = cible.y
      if (dist(f, cible) > 16) {
        versCible(f, dt)
      } else if (now >= f.nextHit) {
        f.nextHit = now + CADENCE_MELEE
        frapper(b, cible, f.atk * multDegats(f) * multRecus(cible), now)
      }
      continue
    }

    // ── Défenseurs ──
    // tout ce qui tire depuis le rempart : archers et frondeurs. La fronde porte
    // moins loin, ce qui est la contrepartie de son prix — aucun bronze
    if (f.type === 'archer' || f.type === 'frondeur') {
      const surMur = f.etat === 'siege'
      const portePlusCourt = f.type === 'frondeur' ? PORTEE_FRONDE : 1
      // un tireur ne quitte le rempart que si SON pan de mur est tombé
      if (surMur && secteurProche(b, f).breche) {
        f.etat = 'melee'
        f.tx = geo.ralliement.x + (Math.random() - 0.5) * 40
        f.ty = geo.ralliement.y + (Math.random() - 0.5) * 40
        f.atk *= 0.6
      }
      if (f.etat === 'melee') versCible(f, dt)
      if (now >= f.nextHit) {
        // par la brume ou sous la pluie, on ne voit ni ne porte aussi loin
        const portee = (surMur ? PORTEE_ARC_MUR : PORTEE_ARC_SOL) * ciel.portee * portePlusCourt
        const cibles = atkVivants.filter((a) => dist(f, a) <= portee)
        const cible = plusProche(f, cibles)
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
            // corde détendue par la pluie : la flèche arrive, mais mollement
            dmg: f.atk * multDegats(f) * ciel.tir,
          })
        }
      }
      continue
    }

    // mêlée (lanciers, hoplites) : ils courent au secteur enfoncé.
    // Tant que tout tient, ils patientent au ralliement ; dès qu'un pan cède,
    // ils s'y portent — c'est au joueur de compter sur eux pour boucher un trou.
    const dedans = atkVivants.filter((a) => a.etat === 'melee' && estDedans(geo, a))
    const menace = dedans.length > 0 ? dedans : b.secteurs.some((s) => !s.breche) ? [] : atkVivants
    /*
     * Le peltaste, lui, choisit sa proie : il va d'abord aux TIREURS. C'est toute
     * sa raison d'être — un javelot rattrape un archer, une lance de milice ne
     * rattrape rien. Sans ce tri, il n'était qu'un lancier un peu plus cher.
     */
    const tireurs = f.type === 'peltaste' ? menace.filter((a) => estTireur(a.type)) : []
    const cible = plusProche(f, tireurs.length > 0 ? tireurs : menace)
    if (!cible) {
      // se poster devant la brèche la plus menaçante, sinon au ralliement
      const trou = b.secteurs.find((s) => s.breche)
      const point = trou ? entreeSecteur(geo, trou.angle) : geo.ralliement
      f.tx = point.x
      f.ty = point.y + (f.seed - 0.5) * 60
      versCible(f, dt)
      continue
    }
    f.tx = cible.x
    f.ty = cible.y
    if (dist(f, cible) > 16) {
      versCible(f, dt)
    } else if (now >= f.nextHit) {
      f.nextHit = now + CADENCE_MELEE
      frapper(b, cible, f.atk * multDegats(f) * multRecus(cible), now)
    }
  }

  // ── Tours d'archers : chacune tire tant que SON pan de mur tient ──
  if (ctx.wallLevel > 0) {
    const enragees = enrage === 'defense' ? forceAtk : 1
    for (const t of b.toursDef) {
      if (now < t.nextHit) continue
      if (secteurProche(b, t).breche) continue
      const aPortee = atkVivants.filter((a) => a.etat !== 'mort' && dist(t, a) <= TOUR_PORTEE * ciel.portee)
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

  if (atkRestants.length === 0 && !enFuite) {
    finie = true
    victoireDefense = true
  } else if (defRestants.length === 0 && atkRestants.some((f) => dist(f, geo.place) < 30)) {
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
  return { wallHp, brecheOuverte, finie, victoireDefense, fuite, pillage, rompus }
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
 * les plus proches du point le plus chaud — la brèche s'il y en a une, sinon la porte.
 */
export function foudreDeZeus(b: BattleState, now: number, force = 1, palier = 2): number {
  const campEnnemi = b.campJoueur === 'defense' ? 'attaque' : 'defense'
  const trou = b.secteurs.find((s) => s.breche)
  const epicentre = trou ?? b.geo.porte
  const cibles = vivants(b, campEnnemi)
    .sort((a, c) => dist(a, epicentre) - dist(c, epicentre))
    .slice(0, 6)
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
  const cibles = vivants(b, campEnnemi)
    .sort((a, c) => dist(a, epicentre) - dist(c, epicentre))
    .slice(0, 8)
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
