import { ENEMIES, MAP, TOUR_ANGLES, TOUR_CADENCE_MS, TOUR_DMG, TOUR_PORTEE, UNITS, WALL_HP } from './data'
import type {
  BattleGeo,
  BattleState,
  EnemyId,
  Fighter,
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
  return { atk: u.atk, hp: u.hp, speed: 55, wallDps: u.wallDps }
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

/** position de siège du i-ème assaillant, en arc autour de la porte (angle 0) */
function posteSiege(geo: BattleGeo, i: number): { x: number; y: number } {
  const angle = ((i % 9) - 4) * 0.09
  const off = 16 + 15 * Math.floor(i / 9)
  return {
    x: geo.cx + (geo.rx + off) * Math.cos(angle),
    y: geo.cy + (geo.ry + off) * Math.sin(angle),
  }
}

/** positions de tir des archers défenseurs selon le niveau des remparts */
export function postesArchers(geo: BattleGeo, niveau: number): { x: number; y: number }[] {
  if (niveau <= 0) return [{ x: geo.ralliement.x, y: geo.ralliement.y }]
  const angles = niveau >= 3 ? [-0.55, -0.2, 0.2, 0.55] : [-0.35, 0.35]
  return angles.map((a) => geoPoint(geo, a))
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
}

export function resoudreHorsLigne(
  wave: WaveUnit[],
  army: Record<UnitId, number>,
  wallLevel: number,
  wallHp: number,
  tours = 0,
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
  const degatsRemparts = Math.min(wallHp, Math.round(atk * (victoire ? 0.8 : 1.6)))
  return { victoire, pertes, degatsRemparts, volePct: victoire ? 0 : 0.3 }
}

// ── Bataille animée ───────────────────────────────────────────────────────────
const PORTEE_ARC_MUR = 300
const PORTEE_ARC_SOL = 210
const CADENCE_ARC = 1600
const CADENCE_MELEE = 1200
const CADENCE_MUR = 1000

export interface OptionsBataille {
  attaquants: WaveUnit[]
  defenseurs: Record<UnitId, number>
  wallLevel: number
  now: number
  geo: BattleGeo
  campJoueur: 'attaque' | 'defense'
  /** tours d'archers du camp défenseur */
  tours?: number
}

export function creerBataille(opts: OptionsBataille): BattleState {
  const { attaquants, defenseurs, wallLevel, now, geo, campJoueur } = opts
  const fighters: Fighter[] = []

  // Assaillants — apparition échelonnée
  let i = 0
  for (const w of attaquants) {
    const st = statsDe(w.enemy)
    for (let k = 0; k < w.count; k++) {
      const slot = w.enemy === 'belier' ? { x: geo.porte.x + 20, y: geo.porte.y } : posteSiege(geo, i)
      fighters.push({
        id: uid('atk'),
        camp: 'attaque',
        type: w.enemy,
        hp: st.hp,
        maxHp: st.hp,
        atk: st.atk,
        x: geo.spawn.x + Math.random() * 40,
        y: geo.spawn.y + (Math.random() - 0.5) * 110,
        tx: slot.x,
        ty: slot.y,
        speed: st.speed,
        etat: 'marche',
        nextHit: 0,
        seed: Math.random(),
      })
      i++
    }
  }

  // Défenseurs de mêlée — au point de ralliement
  const engages: Partial<Record<UnitId, number>> = {}
  for (const u of ['lancier', 'hoplite'] as UnitId[]) {
    const n = defenseurs[u] ?? 0
    if (n <= 0) continue
    engages[u] = n
    const visibles = Math.min(n, 16)
    const mult = n / visibles
    for (let k = 0; k < visibles; k++) {
      const def = UNITS[u]
      fighters.push({
        id: uid('def'),
        camp: 'defense',
        type: u,
        hp: def.hp * mult,
        maxHp: def.hp * mult,
        atk: def.atk * mult,
        x: geo.ralliement.x - 10 - Math.random() * 50,
        y: geo.ralliement.y + (Math.random() - 0.5) * 70,
        tx: geo.ralliement.x,
        ty: geo.ralliement.y,
        speed: 60,
        etat: 'melee',
        nextHit: 0,
        seed: Math.random(),
      })
    }
  }

  // Archers défenseurs — postés sur les remparts
  const nArchers = defenseurs.archer ?? 0
  if (nArchers > 0) {
    engages.archer = nArchers
    const postes = postesArchers(geo, wallLevel)
    const visibles = Math.min(nArchers, 8)
    const mult = nArchers / visibles
    for (let k = 0; k < visibles; k++) {
      const p = postes[k % postes.length]
      const def = UNITS.archer
      fighters.push({
        id: uid('arc'),
        camp: 'defense',
        type: 'archer',
        hp: def.hp * mult,
        maxHp: def.hp * mult,
        atk: def.atk * mult,
        x: p.x + (Math.random() - 0.5) * 14,
        y: p.y - 6,
        tx: p.x,
        ty: p.y - 6,
        speed: 55,
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
    effects: [],
    phase: 'approche',
    breche: wallLevel === 0,
    startedAt: now,
    campJoueur,
    geo,
    defBuffUntil: 0,
    atkBuffUntil: 0,
    result: null,
    engages,
  }
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
  }
  if (b.effects.length < 40) {
    b.effects.push({ id: uid('fx'), type: 'impact', x: cible.x + (Math.random() - 0.5) * 4, y: cible.y - 8, until: now + 260 })
  }
}

export interface TickBatailleCtx {
  now: number
  dt: number
  wallHp: number
  wallLevel: number
}

export interface TickBatailleOut {
  wallHp: number
  brecheOuverte: boolean
  finie: boolean
  /** true = les défenseurs ont tenu ; false = les assaillants ont percé */
  victoireDefense: boolean
  fuite: boolean
  /** les assaillants atteignent le cœur du village */
  pillage: boolean
}

/** Fait avancer la bataille d'un pas. `b` est un draft mutable (immer). */
export function tickBataille(b: BattleState, ctx: TickBatailleCtx): TickBatailleOut {
  const { now, dt } = ctx
  const geo = b.geo
  let wallHp = ctx.wallHp
  const murDebout = ctx.wallLevel > 0 && wallHp > 0 && !b.breche
  const atkVivants = vivants(b, 'attaque')
  const defVivants = vivants(b, 'defense')
  // bénédictions : elles servent le camp du joueur
  const protege = now < b.defBuffUntil ? b.campJoueur : null
  const enrage = now < b.atkBuffUntil ? b.campJoueur : null
  const multDegats = (attaquant: Fighter): number => (attaquant.camp === enrage ? 1.6 : 1)
  const multRecus = (cible: Fighter): number => (cible.camp === protege ? 0.4 : 1)
  let brecheOuverte = false

  // Déroute : plus de 70 % de pertes chez l'assaillant
  const initial = tailleVague(b.wave)
  if (b.phase !== 'fini' && atkVivants.length > 0 && atkVivants.length <= initial * 0.3) {
    for (const f of atkVivants) {
      f.etat = 'fuite'
      f.tx = geo.spawn.x + 40
      f.ty = geo.spawn.y
    }
  }

  for (const f of b.fighters) {
    if (f.etat === 'mort') continue

    if (f.etat === 'fuite') {
      if (versCible(f, dt)) f.etat = 'mort' // sorti de la carte (hp > 0 = survivant en retraite)
      continue
    }

    if (f.camp === 'attaque') {
      if (f.etat === 'marche') {
        if (versCible(f, dt)) f.etat = murDebout ? 'siege' : 'melee'
        if (!murDebout && f.etat === 'siege') f.etat = 'melee'
        continue
      }
      if (f.etat === 'siege') {
        if (!murDebout) {
          f.etat = 'melee'
        } else if (now >= f.nextHit) {
          f.nextHit = now + CADENCE_MUR
          wallHp -= statsDe(f.type).wallDps * multDegats(f)
          if (Math.random() < 0.22 && b.effects.length < 40) {
            b.effects.push({ id: uid('fx'), type: 'poussiere', x: f.x - 5, y: f.y - 7, until: now + 650 })
          }
          if (wallHp <= 0) {
            wallHp = 0
            b.breche = true
            brecheOuverte = true
            b.effects.push({ id: uid('fx'), type: 'breche', x: geo.porte.x, y: geo.porte.y, until: now + 4000 })
          }
        }
        continue
      }
      // mêlée : traverser la porte puis chercher un défenseur
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
    if (f.type === 'archer') {
      const surMur = f.etat === 'siege'
      if (surMur && b.breche) {
        // redescendre des murs : moins efficace au sol
        f.etat = 'melee'
        f.tx = geo.ralliement.x + (Math.random() - 0.5) * 40
        f.ty = geo.ralliement.y + (Math.random() - 0.5) * 40
        f.atk *= 0.6
      }
      if (f.etat === 'melee') versCible(f, dt)
      if (now >= f.nextHit) {
        const portee = surMur ? PORTEE_ARC_MUR : PORTEE_ARC_SOL
        const cibles = atkVivants.filter((a) => dist(f, a) <= portee)
        const cible = plusProche(f, cibles)
        if (cible) {
          f.nextHit = now + CADENCE_ARC
          const d = dist(f, cible)
          b.projectiles.push({
            id: uid('p'),
            x0: f.x,
            y0: f.y,
            x1: cible.x,
            y1: cible.y,
            start: now,
            dur: Math.max(200, (d / 350) * 1000),
            targetId: cible.id,
            dmg: f.atk * multDegats(f),
          })
        }
      }
      continue
    }

    // mêlée (lanciers, hoplites) : n'engagent que si brèche / pas de mur,
    // ou si un assaillant a franchi l'enceinte
    const menace = murDebout
      ? atkVivants.filter((a) => a.etat === 'melee' && a.x < geo.porte.x + 10)
      : atkVivants
    const cible = plusProche(f, menace)
    if (!cible) {
      f.tx = geo.ralliement.x
      f.ty = geo.ralliement.y + (f.seed - 0.5) * 70
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

  // ── Tours d'archers : tir automatique tant que la muraille tient ──
  if (ctx.wallLevel > 0 && wallHp > 0 && !b.breche) {
    const enragees = enrage === 'defense' ? 1.6 : 1
    for (const t of b.toursDef) {
      if (now < t.nextHit) continue
      const aPortee = atkVivants.filter((a) => a.etat !== 'mort' && dist(t, a) <= TOUR_PORTEE)
      const cible = plusProche(t, aPortee)
      if (!cible) continue
      t.nextHit = now + TOUR_CADENCE_MS
      const d = dist(t, cible)
      b.projectiles.push({
        id: uid('p'),
        x0: t.x,
        y0: t.y,
        x1: cible.x,
        y1: cible.y,
        start: now,
        dur: Math.max(200, (d / 350) * 1000),
        targetId: cible.id,
        dmg: TOUR_DMG * enragees,
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

  return { wallHp, brecheOuverte, finie, victoireDefense, fuite, pillage }
}

/** Pertes défenseurs : effectifs engagés − survivants (par proportion de PV visibles). */
export function pertesDefense(b: BattleState): Partial<Record<UnitId, number>> {
  const pertes: Partial<Record<UnitId, number>> = {}
  for (const u of Object.keys(b.engages) as UnitId[]) {
    const engages = b.engages[u] ?? 0
    const figs = b.fighters.filter((f) => f.camp === 'defense' && f.type === u)
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

/** Foudre de Zeus : ~120 dégâts répartis sur les 6 ennemis du joueur les plus proches de la porte. */
export function foudreDeZeus(b: BattleState, now: number): number {
  const campEnnemi = b.campJoueur === 'defense' ? 'attaque' : 'defense'
  const cibles = vivants(b, campEnnemi)
    .sort((a, c) => dist(a, b.geo.porte) - dist(c, b.geo.porte))
    .slice(0, 6)
  for (const c of cibles) {
    c.hp -= 120 / Math.max(1, cibles.length)
    if (c.hp <= 0 && c.etat !== 'mort') {
      c.etat = 'mort'
      c.mortAt = now
    }
    b.effects.push({ id: uid('fx'), type: 'foudre', x: c.x, y: c.y, until: now + 900 })
  }
  return cibles.length
}

/** Sonne la retraite : tous les assaillants encore debout fuient vers leur point d'entrée. */
export function sonnerRetraite(b: BattleState): void {
  for (const f of vivants(b, 'attaque')) {
    f.etat = 'fuite'
    f.tx = b.geo.spawn.x + 40
    f.ty = b.geo.spawn.y
  }
}
