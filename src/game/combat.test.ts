import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CADENCE_MUR,
  GEO_EXPEDITION,
  GEO_VILLAGE,
  abattreChef,
  abriterSecteur,
  boucherBreche,
  creerBataille,
  fureurHeros,
  geoPoint,
  marqueDivine,
  mortsAttaque,
  pertesAttaque,
  pertesDefense,
  postesArchers,
  secteurChaud,
  sonnerRetraite,
  tickBataille,
} from './combat'
import type { OptionsBataille, TickBatailleOut } from './combat'
import { ENEMIES, MAP, SECTEURS, TICK_MS, UNITS, WALL_HP } from './data'
import { statsCombatHeros } from './heros'
import { modsBataille } from './saisons'
import type { MeteoId } from './saisons'
import type { BattleGeo, BattleState } from './types'

/*
 * Le moteur de bataille est la pièce la plus mouvante du jeu : trois secteurs de
 * mur qui cèdent séparément, des héros qui comptent pour eux-mêmes, une météo qui
 * pèse sur les salves. Rien de tout cela ne se relit à l'œil nu pendant un assaut,
 * d'où ce filet : on vérifie la naissance des combattants, les invariants du tick
 * sur une bataille entière, et l'effet MESURABLE de chaque capacité.
 *
 * Note : `combat.ts` n'importe pas MODE_TEST — les ressources illimitées du mode
 * test ne changent donc rien ici, tout se joue sur les arguments qu'on passe.
 */

// ── Outils du banc d'essai ────────────────────────────────────────────────────

/*
 * `creerBataille` et le tick tirent au sort : dispersion des colonnes, décalages
 * d'animation, nuages de poussière. Laissé libre, ce hasard ferait de chaque
 * exécution une bataille différente — la suite finirait par rougir un matin sans
 * qu'on ait touché à quoi que ce soit. On substitue donc un générateur à graine :
 * les positions restent dispersées, mais reproductibles. Les tests dont l'ISSUE
 * compte rejouent plusieurs graines pour ne pas se contenter d'une trajectoire.
 */
let etatAlea = 0
function graine(n: number): void {
  etatAlea = n >>> 0
}
function tirage(): number {
  etatAlea = (etatAlea + 0x6d2b79f5) >>> 0
  let t = etatAlea
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

beforeEach(() => {
  graine(20_240_607)
  vi.spyOn(Math, 'random').mockImplementation(tirage)
})
afterEach(() => {
  vi.restoreAllMocks()
})

/** distance au centre de l'enceinte, exprimée en rayons : < 1 = dans les murs */
function rayonEllipse(geo: BattleGeo, p: { x: number; y: number }): number {
  return Math.hypot((p.x - geo.cx) / geo.rx, (p.y - geo.cy) / geo.ry)
}

/** une bataille de village par défaut, que chaque test ajuste à son besoin */
function bataille(reglages: Partial<OptionsBataille> = {}): BattleState {
  return creerBataille({
    attaquants: [{ enemy: 'pillard', count: 4 }],
    defenseurs: { lancier: 0, archer: 0, hoplite: 0 },
    wallLevel: 2,
    now: 0,
    geo: GEO_VILLAGE,
    campJoueur: 'defense',
    ...reglages,
  })
}

interface PasDeTemps {
  now: number
  dt: number
  wallLevel: number
  mods?: { portee: number; vitesse: number; tir: number }
}

/** `ctx.wallHp` n'est jamais lu par le moteur (il compte les secteurs) : on met 0 */
function avancer(b: BattleState, pas: PasDeTemps): TickBatailleOut {
  return tickBataille(b, { now: pas.now, dt: pas.dt, wallHp: 0, wallLevel: pas.wallLevel, mods: pas.mods })
}

const attaquants = (n: number) => [{ enemy: 'pillard' as const, count: n }]

/** colle le premier assaillant contre le pan de mur du premier front, prêt à frapper */
function siegeur(b: BattleState): void {
  const f = b.fighters.find((c) => c.camp === 'attaque')!
  f.etat = 'siege'
  f.nextHit = 0
  f.x = b.secteurs[0].x + 20
  f.y = b.secteurs[0].y
}

/** un archer sur le rempart, un assaillant immobile à `ecart` pas de lui */
function duel(ecart: number): BattleState {
  const b = bataille({ wallLevel: 3, attaquants: attaquants(1), defenseurs: { lancier: 0, archer: 1, hoplite: 0 } })
  const archer = b.fighters.find((f) => f.type === 'archer')!
  const pillard = b.fighters.find((f) => f.camp === 'attaque')!
  archer.x = MAP.porte.x
  archer.y = MAP.porte.y
  archer.nextHit = 0
  pillard.x = MAP.porte.x + ecart
  pillard.y = MAP.porte.y
  return b
}

// ── Naissance d'une bataille ──────────────────────────────────────────────────
describe('creerBataille', () => {
  it('fait naître chaque camp au complet, avec les pv et l’attaque de la table', () => {
    const b = bataille({
      attaquants: [
        { enemy: 'pillard', count: 5 },
        { enemy: 'guerrier', count: 2 },
      ],
      defenseurs: { lancier: 3, archer: 2, hoplite: 1 },
    })
    const parCamp = (camp: 'attaque' | 'defense') => b.fighters.filter((f) => f.camp === camp)
    expect(parCamp('attaque')).toHaveLength(7)
    expect(parCamp('defense')).toHaveLength(6)

    // sous le seuil des figurines, chaque homme se bat avec les chiffres de la
    // table, sans facteur de compression : une garnison de 3 vaut vraiment 3
    for (const [type, n] of [
      ['pillard', 5],
      ['guerrier', 2],
    ] as const) {
      const troupe = b.fighters.filter((f) => f.type === type)
      expect(troupe).toHaveLength(n)
      for (const f of troupe) {
        expect(f.hp).toBe(ENEMIES[type].hp)
        expect(f.maxHp).toBe(ENEMIES[type].hp)
        expect(f.atk).toBe(ENEMIES[type].atk)
        expect(f.speed).toBe(ENEMIES[type].speed)
      }
    }
    for (const [type, n] of [
      ['lancier', 3],
      ['archer', 2],
      ['hoplite', 1],
    ] as const) {
      const troupe = b.fighters.filter((f) => f.type === type)
      expect(troupe).toHaveLength(n)
      for (const f of troupe) {
        expect(f.hp).toBe(UNITS[type].hp)
        expect(f.maxHp).toBe(UNITS[type].hp)
        expect(f.atk).toBe(UNITS[type].atk)
      }
    }

    // la mise en place que lit le tick : les assaillants arrivent en marche, les
    // archers sont déjà sur le rempart, l'infanterie attend en ligne
    expect(parCamp('attaque').map((f) => f.etat)).toEqual(Array(7).fill('marche'))
    expect(b.fighters.filter((f) => f.type === 'archer').map((f) => f.etat)).toEqual(['siege', 'siege'])
    expect(
      b.fighters.filter((f) => f.type === 'lancier' || f.type === 'hoplite').every((f) => f.etat === 'melee'),
    ).toBe(true)
    expect(b.phase).toBe('approche')
    // `engages` sert de base aux pertes : il doit refléter la garnison, pas les figurines
    expect(b.engages).toEqual({ lancier: 3, archer: 2, hoplite: 1 })
  })

  it('comprime les grosses garnisons en figurines sans créer ni perdre de pv', () => {
    const b = bataille({ defenseurs: { lancier: 40, archer: 30, hoplite: 4 } })
    const lanciers = b.fighters.filter((f) => f.type === 'lancier')
    const archers = b.fighters.filter((f) => f.type === 'archer')
    // 16 fantassins et 8 archers au plus à l'écran : au-delà la scène est illisible
    expect(lanciers).toHaveLength(16)
    expect(archers).toHaveLength(8)
    expect(b.fighters.filter((f) => f.type === 'hoplite')).toHaveLength(4)
    // mais la force réelle est intacte : c'est ce qui empêche une grosse garnison
    // de fondre à l'écran comme une petite
    expect(lanciers.reduce((a, f) => a + f.maxHp, 0)).toBeCloseTo(40 * UNITS.lancier.hp, 6)
    expect(lanciers.reduce((a, f) => a + f.atk, 0)).toBeCloseTo(40 * UNITS.lancier.atk, 6)
    expect(archers.reduce((a, f) => a + f.maxHp, 0)).toBeCloseTo(30 * UNITS.archer.hp, 6)
    expect(archers.reduce((a, f) => a + f.atk, 0)).toBeCloseTo(30 * UNITS.archer.atk, 6)
    expect(lanciers.every((f) => f.hp === f.maxHp)).toBe(true)
    expect(b.engages).toEqual({ lancier: 40, archer: 30, hoplite: 4 })

    /*
     * Régression connue (voir posteRalliement) : les fantassins convergeaient tous
     * vers le MÊME point et s'empilaient en une bouillie de figurines. Lanciers et
     * hoplites partagent un seul compteur de places — d'où vingt postes distincts.
     */
    const ligne = b.fighters.filter((f) => f.type === 'lancier' || f.type === 'hoplite')
    expect(ligne).toHaveLength(20)
    expect(new Set(ligne.map((f) => `${f.tx.toFixed(4)}:${f.ty.toFixed(4)}`)).size).toBe(20)
  })

  it('partage le mur à parts égales entre les secteurs assaillis, tous sur l’enceinte', () => {
    const b = bataille({ wallLevel: 3, fronts: SECTEURS, attaquants: attaquants(9) })
    expect(b.secteurs).toHaveLength(3)
    expect(b.secteurs.map((s) => s.nom)).toEqual(SECTEURS.map((f) => f.nom))
    expect(b.secteurs.reduce((a, s) => a + s.hp, 0)).toBeCloseTo(WALL_HP[3], 6)
    for (const s of b.secteurs) {
      expect(s.hp).toBe(s.max)
      expect(s.hp).toBeCloseTo(WALL_HP[3] / 3, 6)
      expect(s.breche).toBe(false)
      // le point faible du secteur est peint sur le mur, pas à côté
      expect(rayonEllipse(GEO_VILLAGE, s)).toBeCloseTo(1, 6)
    }
    expect(b.breche).toBe(false)
    // trois pans franchement distincts : on ne défend pas trois fois le même mur
    for (const [i, j] of [
      [0, 1],
      [1, 2],
      [0, 2],
    ] as const) {
      const ecart = Math.hypot(b.secteurs[i].x - b.secteurs[j].x, b.secteurs[i].y - b.secteurs[j].y)
      expect(ecart).toBeGreaterThan(150)
    }
    // chaque homme débouche hors de l'enceinte et derrière SON front : si les
    // colonnes se mélangeaient, les trois assauts arriveraient du même côté
    for (const f of b.fighters) {
      expect(rayonEllipse(GEO_VILLAGE, f)).toBeGreaterThan(1)
      const ecarts = SECTEURS.map((s) => Math.hypot(f.x - s.spawn.x, f.y - s.spawn.y))
      expect(ecarts.indexOf(Math.min(...ecarts))).toBe(f.secteur)
    }
  })

  it('répartit la vague entre les fronts et garde les béliers sur le premier', () => {
    const b = bataille({
      wallLevel: 3,
      fronts: SECTEURS,
      attaquants: [
        { enemy: 'pillard', count: 9 },
        { enemy: 'belier', count: 2 },
      ],
    })
    const parSecteur = [0, 1, 2].map(
      (i) => b.fighters.filter((f) => f.camp === 'attaque' && f.type === 'pillard' && f.secteur === i).length,
    )
    expect(parSecteur).toEqual([3, 3, 3])
    const beliers = b.fighters.filter((f) => f.type === 'belier')
    expect(beliers).toHaveLength(2)
    // un bélier ne se promène pas : il vient s'adosser au pan du premier front
    expect(beliers.every((f) => f.secteur === 0)).toBe(true)
    for (const bel of beliers) {
      expect(bel.tx).toBeCloseTo(MAP.mur.cx + MAP.mur.rx + 20, 6)
      expect(bel.ty).toBeCloseTo(MAP.mur.cy, 6)
    }
    // et chacun vise le pan de SON secteur : une colonne qui se tromperait de mur
    // userait des points de structure qui ne sont pas les siens
    for (const f of b.fighters) {
      const ecarts = b.secteurs.map((s) => Math.hypot(f.tx - s.x, f.ty - s.y))
      expect(ecarts.indexOf(Math.min(...ecarts))).toBe(f.secteur)
    }
  })

  it('ouvre les murs d’avance avec la ruse d’Ulysse : ni siège, ni pan à abattre', () => {
    const b = bataille({ sansSiege: true, defenseurs: { lancier: 2, archer: 0, hoplite: 0 } })
    expect(b.breche).toBe(true)
    expect(b.secteurs.every((s) => s.breche && s.hp === 0 && s.max === 0)).toBe(true)

    let now = 0
    let sortie: TickBatailleOut | null = null
    let entres = false
    for (let k = 0; k < 200 && !sortie; k++) {
      now += 500
      const out = avancer(b, { now, dt: 0.5, wallLevel: 2 })
      // personne ne s'arrête devant un mur déjà tombé, et il n'y a rien à percer
      expect(b.fighters.some((f) => f.etat === 'siege')).toBe(false)
      expect(out.brecheOuverte).toBe(false)
      expect(out.wallHp).toBe(0)
      if (b.fighters.some((f) => f.camp === 'attaque' && rayonEllipse(GEO_VILLAGE, f) < 1)) entres = true
      if (out.finie) sortie = out
    }
    // la ruse tient ses promesses : les pillards entrent et prennent la place
    expect(entres).toBe(true)
    expect(sortie).not.toBeNull()
    expect(sortie!.victoireDefense).toBe(false)
    expect(sortie!.pillage).toBe(true)
    expect(b.phase).toBe('melee')
  })

  it('laisse `breche` à faux quand les remparts sont debout mais réduits à néant', () => {
    /*
     * Cas réel : le village a encaissé un assaut sans réparer, `wallHp` vaut 0 et
     * les remparts sont toujours de niveau 2. Tous les pans naissent effondrés…
     * mais le drapeau global reste faux (voir rapport : combat.ts:434) et la phase
     * ne quitte jamais « siege » alors que l'ennemi est dans la place. Ce test
     * verrouille le comportement ACTUEL pour qu'un correctif se voie ici.
     */
    const b = bataille({ wallLevel: 2, wallHpTotal: 0, defenseurs: { lancier: 2, archer: 0, hoplite: 0 } })
    expect(b.secteurs.every((s) => s.breche)).toBe(true)
    expect(b.breche).toBe(false)

    let now = 0
    let dansLaPlace = false
    const phases = new Set<string>()
    for (let k = 0; k < 120; k++) {
      now += 500
      avancer(b, { now, dt: 0.5, wallLevel: 2 })
      phases.add(b.phase)
      if (b.fighters.some((f) => f.camp === 'attaque' && f.etat === 'melee' && rayonEllipse(GEO_VILLAGE, f) < 1)) {
        dansLaPlace = true
        // le bug se voit ici : l'ennemi se bat DANS le village et l'affichage
        // annonce toujours des remparts qui encaissent le choc
        expect(b.phase).toBe('siege')
      }
    }
    expect(dansLaPlace).toBe(true)
    expect(b.breche).toBe(false)
    expect(phases).toEqual(new Set(['approche', 'siege']))
  })
})

// ── Géométries ────────────────────────────────────────────────────────────────
describe('géométries du champ de bataille', () => {
  it('place porte, ralliement, place et apparition de façon cohérente dans les deux scènes', () => {
    for (const geo of [GEO_VILLAGE, GEO_EXPEDITION]) {
      // l'angle 0 de l'ellipse, c'est la porte : tout le moteur en dépend
      expect(geoPoint(geo, 0).x).toBeCloseTo(geo.porte.x, 6)
      expect(geoPoint(geo, 0).y).toBeCloseTo(geo.porte.y, 6)
      // et le paramétrage lui-même, sens de l'écran compris : un sinus inversé
      // ferait s'ouvrir la brèche au nord quand le joueur lit « mur du sud »
      const sud = geoPoint(geo, Math.PI / 2)
      expect(sud.x).toBeCloseTo(geo.cx, 6)
      expect(sud.y).toBeCloseTo(geo.cy + geo.ry, 6)
      const ouest = geoPoint(geo, Math.PI)
      expect(ouest.x).toBeCloseTo(geo.cx - geo.rx, 6)
      expect(ouest.y).toBeCloseTo(geo.cy, 6)
      expect(geoPoint(geo, -Math.PI / 2).y).toBeCloseTo(geo.cy - geo.ry, 6)
      // on se rallie et on pille à l'intérieur, on débarque à l'extérieur
      expect(rayonEllipse(geo, geo.ralliement)).toBeLessThan(1)
      expect(rayonEllipse(geo, geo.place)).toBeLessThan(1)
      expect(rayonEllipse(geo, geo.spawn)).toBeGreaterThan(1)
    }
    expect(GEO_VILLAGE).toMatchObject({ cx: MAP.mur.cx, cy: MAP.mur.cy, rx: MAP.mur.rx, ry: MAP.mur.ry })

    // les noms des secteurs doivent tomber du bon côté de l'écran
    const pan = (id: string) => geoPoint(GEO_VILLAGE, SECTEURS.find((s) => s.id === id)!.angle)
    expect(pan('porte').x).toBeCloseTo(MAP.porte.x, 6)
    expect(pan('sud').y).toBeGreaterThan(MAP.mur.cy)
    expect(pan('nord').y).toBeLessThan(MAP.mur.cy)
  })

  it('poste les archers sur le rempart, plus largement à mesure qu’il s’élève', () => {
    expect(postesArchers(GEO_VILLAGE, 0)).toEqual([{ x: MAP.ralliement.x, y: MAP.ralliement.y }])
    const pres = postesArchers(GEO_VILLAGE, 2)
    const larges = postesArchers(GEO_VILLAGE, 3)
    expect(pres).toHaveLength(2)
    expect(larges).toHaveLength(4)
    // les paliers : 1 et 2 se ressemblent, 3 et 4 aussi — c'est au 3ᵉ que le mur s'ouvre
    expect(postesArchers(GEO_VILLAGE, 1)).toEqual(pres)
    expect(postesArchers(GEO_VILLAGE, 4)).toEqual(larges)
    for (const niveau of [1, 2, 3, 4]) {
      for (const p of postesArchers(GEO_VILLAGE, niveau)) expect(rayonEllipse(GEO_VILLAGE, p)).toBeCloseTo(1, 6)
    }
    // élever le mur AJOUTE des postes, il n'en déplace aucun : un archer en poste
    // ne doit pas se retrouver ailleurs parce qu'on a monté d'un niveau
    for (const p of pres) expect(larges).toContainEqual(p)
    /*
     * Et « plus largement » doit vouloir dire quelque chose : les deux postes de
     * base flanquent la porte à l'est, les deux nouveaux couvrent les flancs.
     * Sans ce contrôle, quatre postes serrés autour de la porte passeraient.
     */
    const flancs = larges.filter((p) => !pres.some((q) => q.x === p.x && q.y === p.y))
    expect(flancs).toHaveLength(2)
    for (const p of pres) expect(p.x).toBeGreaterThan(MAP.mur.cx + 0.8 * MAP.mur.rx)
    for (const p of flancs) expect(p.x).toBeLessThan(MAP.mur.cx + 0.2 * MAP.mur.rx)
    // deux au nord, deux au sud : le mur est couvert, pas la porte seule
    const ys = larges.map((p) => p.y)
    expect(ys.filter((y) => y < MAP.mur.cy)).toHaveLength(2)
    expect(ys.filter((y) => y > MAP.mur.cy)).toHaveLength(2)
  })
})

// ── Le tick, sur la durée ─────────────────────────────────────────────────────
describe('tickBataille', () => {
  it('mène cinq vraies batailles à leur terme sans jamais violer ses invariants', () => {
    for (const semence of [1, 7, 42, 1789, 20_240_607]) {
      graine(semence)
      const b = bataille({
        attaquants: [
          { enemy: 'pillard', count: 14 },
          { enemy: 'guerrier', count: 6 },
          { enemy: 'mercenaire', count: 2 },
          { enemy: 'belier', count: 2 },
        ],
        defenseurs: { lancier: 24, archer: 12, hoplite: 8 },
        wallLevel: 4,
        tours: 4,
        fronts: SECTEURS,
        now: 10_000,
      })

      const fautes: string[] = []
      const dire = (m: string) => fautes.push(`graine ${semence} — ${m}`)
      const dejaMorts = new Set<string>()
      let deboutAvant = b.fighters.length
      let murAvant = Infinity
      let now = 10_000
      let finAu: number | null = null
      let sortie: TickBatailleOut | null = null

      // 600 pas de 250 ms, soit deux minutes et demie de jeu : bien après le
      // dénouement, pour vérifier qu'une bataille finie ne se remet pas à vivre
      for (let ticks = 1; ticks <= 600; ticks++) {
        now += TICK_MS
        const out = avancer(b, { now, dt: TICK_MS / 1000, wallLevel: 4, mods: modsBataille('pluie') })

        for (const f of b.fighters) {
          if (![f.x, f.y, f.tx, f.ty, f.hp].every(Number.isFinite)) {
            dire(`tick ${ticks} : ${f.id} a des coordonnées ou des pv non finis`)
          }
          if (f.etat !== 'mort' && f.hp <= 0) dire(`tick ${ticks} : ${f.id} se bat avec ${f.hp} pv`)
          // aucun soin dans ce moteur : des pv qui remontent seraient un bug de mult
          if (f.hp > f.maxHp + 1e-9) dire(`tick ${ticks} : ${f.id} a regagné des pv (${f.hp} / ${f.maxHp})`)
          if (dejaMorts.has(f.id) && f.etat !== 'mort') dire(`tick ${ticks} : ${f.id} est ressuscité`)
          if (f.etat === 'mort') dejaMorts.add(f.id)
        }
        const debout = b.fighters.filter((f) => f.etat !== 'mort' && f.etat !== 'fuite').length
        if (debout > deboutAvant) dire(`tick ${ticks} : l’effectif remonte (${deboutAvant} → ${debout})`)
        deboutAvant = debout
        // aucune maçonnerie spontanée, et rien de négatif ne remonte au store
        if (out.wallHp > murAvant + 1e-9) dire(`tick ${ticks} : le mur se répare seul`)
        if (out.wallHp < 0) dire(`tick ${ticks} : le mur rendu au store est négatif (${out.wallHp})`)
        murAvant = out.wallHp
        // les deux listes d'affichage sont purgées à chaque pas : si elles enflent,
        // une bataille longue finit par ramer sans que personne comprenne pourquoi
        if (b.effects.length > 45) dire(`tick ${ticks} : ${b.effects.length} effets en attente`)
        if (b.projectiles.length > 30) dire(`tick ${ticks} : ${b.projectiles.length} flèches en vol`)
        for (const p of b.projectiles) {
          if (!b.fighters.some((f) => f.id === p.targetId)) dire(`tick ${ticks} : la flèche ${p.id} vise un fantôme`)
        }

        if (finAu === null && out.finie) {
          finAu = ticks
          sortie = out
        } else if (finAu !== null) {
          // le store peut mettre un pas ou deux à réagir : l'issue ne doit pas vaciller
          if (!out.finie) dire(`tick ${ticks} : la bataille finie au tick ${finAu} repart`)
          if (out.victoireDefense !== sortie!.victoireDefense) dire(`tick ${ticks} : le vainqueur change d’avis`)
        }
      }

      expect(fautes).toEqual([])
      // une bataille qui se règle en trois ticks n'aurait rien prouvé, et une
      // bataille qui ne se règle jamais bloquerait le joueur devant sa carte
      expect(finAu).not.toBeNull()
      expect(finAu!).toBeGreaterThan(100)
      expect(finAu!).toBeLessThan(400)
      // 24 assaillants brisés sur des remparts de niveau 4 flanqués de 4 tours :
      // la défense tient, et l'on compte les morts adverses un par un
      expect(sortie!.victoireDefense).toBe(true)
      expect(sortie!.pillage).toBe(false)
      expect(pertesAttaque(b)).toBe(24)
      expect(mortsAttaque(b)).toEqual({ pillard: 14, guerrier: 6, mercenaire: 2, belier: 2 })
      // les deux béliers, cloués au premier front, finissent par l'ouvrir — et lui
      // seul : c'est toute la raison d'être des secteurs indépendants
      expect(b.secteurs.filter((s) => s.breche)).toEqual([b.secteurs[0]])
      expect(b.secteurs[1].hp).toBeGreaterThan(0)
      expect(b.secteurs[2].hp).toBeGreaterThan(0)
      expect(b.phase).toBe('melee')
      // la garnison n'y laisse au pire qu'une poignée d'hommes ; si les tours ou
      // les archers cessaient de tirer, la mêlée coûterait des dizaines de vies
      const pertes = pertesDefense(b)
      for (const u of ['lancier', 'archer', 'hoplite'] as const) expect(pertes[u] ?? 0).toBeLessThanOrEqual(2)
    }
  })

  it('n’ouvre que le pan qui cède, jamais les voisins', () => {
    const b = bataille({ wallLevel: 3, fronts: SECTEURS, attaquants: attaquants(9) })
    // le mur du sud n'a plus qu'un souffle : c'est lui qui va tomber le premier
    b.secteurs[1].hp = 3

    let now = 0
    let sortie: TickBatailleOut | null = null
    for (let k = 0; k < 400 && !sortie; k++) {
      now += TICK_MS
      const out = avancer(b, { now, dt: TICK_MS / 1000, wallLevel: 3 })
      if (out.brecheOuverte) sortie = out
    }
    expect(sortie).not.toBeNull()
    expect(b.secteurs[1].breche).toBe(true)
    expect(b.secteurs[1].hp).toBe(0)
    // les deux autres pans tiennent toujours — c'est tout l'intérêt des secteurs
    expect(b.secteurs[0].breche).toBe(false)
    expect(b.secteurs[2].breche).toBe(false)
    expect(b.secteurs[0].hp).toBeGreaterThan(0)
    expect(b.secteurs[2].hp).toBeGreaterThan(0)
    // en revanche le drapeau global tombe dès le premier pan : les archers descendent
    expect(b.breche).toBe(true)
    expect(b.phase).toBe('melee')
    expect(sortie!.wallHp).toBeCloseTo(b.secteurs[0].hp + b.secteurs[2].hp, 6)

    // cinq secondes plus tard, seule la colonne du sud s'est engouffrée ; les deux
    // autres marchent ou cognent, dehors. Et l'événement de brèche ne se rejoue pas.
    for (let k = 0; k < 20; k++) {
      now += TICK_MS
      expect(avancer(b, { now, dt: TICK_MS / 1000, wallLevel: 3 }).brecheOuverte).toBe(false)
    }
    const sud = b.fighters.filter((f) => f.secteur === 1)
    expect(sud).toHaveLength(3)
    expect(sud.every((f) => f.etat === 'melee')).toBe(true)
    expect(sud.some((f) => rayonEllipse(GEO_VILLAGE, f) < 1)).toBe(true)
    for (const f of b.fighters.filter((x) => x.secteur !== 1)) {
      expect(['marche', 'siege']).toContain(f.etat)
      expect(rayonEllipse(GEO_VILLAGE, f)).toBeGreaterThan(1)
    }
  })

  it('fait descendre l’archer de son pan crevé, et il tire alors moins loin et moins fort', () => {
    const b = bataille({
      wallLevel: 2,
      wallHpTotal: 4,
      attaquants: attaquants(1),
      defenseurs: { lancier: 0, archer: 1, hoplite: 0 },
    })
    const archer = b.fighters.find((f) => f.type === 'archer')!
    const pillard = b.fighters.find((f) => f.camp === 'attaque')!
    expect(archer.etat).toBe('siege')
    expect(archer.atk).toBe(UNITS.archer.atk)

    // un seul coup de hache suffit à faire tomber ce pan de quatre points
    siegeur(b)
    expect(avancer(b, { now: 1000, dt: 0, wallLevel: 2 }).brecheOuverte).toBe(true)
    // plus de créneau : l'archer rejoint la ligne et tire de moins bon cœur
    expect(archer.etat).toBe('melee')
    expect(archer.atk).toBeCloseTo(UNITS.archer.atk * 0.6, 6)

    /** replace les deux hommes à `ecart` l'un de l'autre et compte les flèches parties */
    const tirer = (ecart: number, now: number): number => {
      b.projectiles = []
      archer.nextHit = 0
      archer.x = MAP.porte.x
      archer.y = MAP.porte.y
      pillard.x = MAP.porte.x + ecart
      pillard.y = MAP.porte.y
      avancer(b, { now, dt: 0, wallLevel: 2 })
      return b.projectiles.length
    }
    // depuis le sol on ne porte plus qu'à 210 pas, contre 300 du haut du mur :
    // un archer descendu qui garderait sa portée de rempart rendrait la brèche indolore
    expect(tirer(209, 5000)).toBe(1)
    expect(tirer(211, 6000)).toBe(0)
    expect(tirer(299, 7000)).toBe(0)
  })

  it('ne blesse qu’à l’arrivée de la flèche, jamais au moment du tir', () => {
    const b = duel(200)
    const pillard = b.fighters.find((f) => f.camp === 'attaque')!
    avancer(b, { now: 5000, dt: 0, wallLevel: 3 })
    expect(b.projectiles).toHaveLength(1)
    // 200 pas à 250 px/s : la flèche est en l'air 800 ms, et pendant ce temps
    // le pillard est intact — sinon les salves tueraient avant d'être vues
    expect(b.projectiles[0].dur).toBeCloseTo(800, 6)
    avancer(b, { now: 5700, dt: 0, wallLevel: 3 })
    expect(b.projectiles).toHaveLength(1)
    expect(pillard.hp).toBe(ENEMIES.pillard.hp)
    avancer(b, { now: 5800, dt: 0, wallLevel: 3 })
    expect(b.projectiles).toHaveLength(0)
    expect(pillard.hp).toBeCloseTo(ENEMIES.pillard.hp - UNITS.archer.atk, 6)
  })
})

// ── Ce que le ciel change ─────────────────────────────────────────────────────
describe('modificateurs de météo', () => {
  /** une salve isolée : combien de flèches partent à `ecart` pas, et avec quelle force */
  function salve(ecart: number, meteo: MeteoId, now = 5000): { fleches: number; dmg: number } {
    const b = duel(ecart)
    // dt = 0 : personne ne bouge d'un pouce, seule la portée décide
    avancer(b, { now, dt: 0, wallLevel: 3, mods: modsBataille(meteo) })
    return { fleches: b.projectiles.length, dmg: b.projectiles[0]?.dmg ?? 0 }
  }

  it('rétrécit la portée des archers selon le ciel, à quelques pas près', () => {
    // du haut du rempart on porte à 300 pas, pas un de plus
    expect(salve(299, 'clair').fleches).toBe(1)
    expect(salve(301, 'clair').fleches).toBe(0)
    // la brume rabat cette portée à 186 pas (300 × 0,62) : c'est là, et nulle part
    // ailleurs, que se joue la différence entre une salve et un archer aveugle
    expect(salve(185, 'brume').fleches).toBe(1)
    expect(salve(187, 'brume').fleches).toBe(0)
    // la neige laisse un peu mieux voir (× 0,75) : deux tables distinctes, pas
    // un rabais unique appliqué à tous les mauvais temps
    expect(salve(224, 'neige').fleches).toBe(1)
    expect(salve(226, 'neige').fleches).toBe(0)
  })

  it('détend les cordes des arcs sans empêcher le tir à bout portant', () => {
    // à 150 pas la flèche part par tous les temps, mais elle ne pique plus pareil
    expect(salve(150, 'clair').dmg).toBeCloseTo(UNITS.archer.atk, 6)
    expect(salve(150, 'pluie').dmg).toBeCloseTo(UNITS.archer.atk * 0.7, 6)
    expect(salve(150, 'brume').dmg).toBeCloseTo(UNITS.archer.atk * 0.9, 6)
    expect(salve(150, 'neige').dmg).toBeCloseTo(UNITS.archer.atk * 0.85, 6)
  })

  it('fait avancer la colonne au pas dans la neige', () => {
    const b = bataille({ attaquants: attaquants(1) })
    const f = b.fighters[0]
    /** repose le pillard à 100 pas de son but et lui accorde une seconde de marche */
    const parcours = (meteo: MeteoId, now: number): number => {
      f.x = 200
      f.y = 400
      f.tx = 300
      f.ty = 400
      f.etat = 'marche'
      avancer(b, { now, dt: 1, wallLevel: 2, mods: modsBataille(meteo) })
      return f.x - 200
    }
    // une seconde de marche par temps clair : la vitesse du pillard, à l'unité près
    expect(parcours('clair', 1000)).toBeCloseTo(ENEMIES.pillard.speed, 6)
    // les chemins ont disparu : trois dixièmes de moins…
    expect(parcours('neige', 2000)).toBeCloseTo(ENEMIES.pillard.speed * 0.7, 6)
    // … et le sol détrempé coûte un peu moins que la neige, preuve que le tick lit
    // la table du ciel et n'applique pas un ralentissement forfaitaire
    expect(parcours('pluie', 3000)).toBeCloseTo(ENEMIES.pillard.speed * 0.82, 6)
    // la marche suit le vecteur : rien ne dérive sur le côté
    expect(f.y).toBe(400)
  })
})

// ── Capacités de héros et signes des dieux ────────────────────────────────────
describe('capacités résolues sur le champ de bataille', () => {
  it('abriterSecteur : le pan couvert n’encaisse plus que sa part, et pas éternellement', () => {
    const b = bataille({ attaquants: attaquants(1) })
    siegeur(b)
    const sect = b.secteurs[0]

    avancer(b, { now: 1000, dt: 0, wallLevel: 2 })
    // un pillard emporte 4 points de structure par coup de hache
    expect(sect.max - sect.hp).toBe(ENEMIES.pillard.wallDps)

    expect(abriterSecteur(b, 1000, 20_000, 0.75, 'hector')).toBe('Porte de l’est')
    const signe = b.effects[b.effects.length - 1]
    expect(signe).toMatchObject({ type: 'heros', heros: 'hector', debut: 1000, until: 21_000 })
    // le bouclier se dessine sur le pan couvert, pas au hasard sur la carte
    expect(signe.x).toBeCloseTo(sect.x, 6)
    expect(signe.y).toBeCloseTo(sect.y, 6)

    let avant = sect.hp
    avancer(b, { now: 1000 + CADENCE_MUR + 100, dt: 0, wallLevel: 2 })
    // sous le bouclier d'Hector, trois coups sur quatre glissent
    expect(sect.hp).toBeCloseTo(avant - ENEMIES.pillard.wallDps * 0.25, 6)

    // et le bouclier n'est pas éternel : passé vingt secondes, le pan reprend tout
    avant = sect.hp
    avancer(b, { now: 25_000, dt: 0, wallLevel: 2 })
    expect(sect.hp).toBeCloseTo(avant - ENEMIES.pillard.wallDps, 6)
  })

  it('boucherBreche : le pan effondré reste infranchissable, puis cède à l’expiration', () => {
    const b = bataille({ attaquants: attaquants(1), wallHpTotal: 8 })
    siegeur(b)
    const f = b.fighters[0]
    const sect = b.secteurs[0]

    let now = 1000
    avancer(b, { now, dt: 0, wallLevel: 2 })
    now += CADENCE_MUR + 100
    expect(avancer(b, { now, dt: 0, wallLevel: 2 }).brecheOuverte).toBe(true)
    expect(sect.breche).toBe(true)
    expect(sect.hp).toBe(0)

    // Ajax se plante dans la brèche : l'assaillant reste dehors et frappe le vide
    expect(boucherBreche(b, now, 30_000, 'ajax')).toBe('Porte de l’est')
    for (let k = 0; k < 10; k++) {
      now += CADENCE_MUR + 100
      const out = avancer(b, { now, dt: 1, wallLevel: 2 })
      expect(f.etat).toBe('siege')
      expect(rayonEllipse(GEO_VILLAGE, f)).toBeGreaterThan(1)
      // le pan reste crevé dans les faits — l'événement ne se rejoue pas —
      // et le mur rendu au store ne passe jamais sous zéro
      expect(sect.breche).toBe(true)
      expect(out.brecheOuverte).toBe(false)
      expect(out.wallHp).toBe(0)
    }
    /*
     * Dette connue (rapport : combat.ts:611) : rien ne borne `sect.hp` tant que le
     * pan est bouché, donc les dix coups s'accumulent en négatif. Le store n'en voit
     * rien (clamp de sortie) mais la jauge du secteur et `secteurChaud` s'en
     * nourrissent. On verrouille la valeur ACTUELLE pour qu'un correctif se voie ici.
     */
    expect(sect.hp).toBeCloseTo(-10 * ENEMIES.pillard.wallDps, 6)

    // le héros lâche prise : la brèche redevient une brèche et la colonne entre
    now = 40_000
    avancer(b, { now, dt: 1, wallLevel: 2 })
    expect(f.etat).toBe('melee')
    for (let k = 0; k < 40; k++) {
      now += 500
      avancer(b, { now, dt: 0.5, wallLevel: 2 })
    }
    expect(rayonEllipse(GEO_VILLAGE, f)).toBeLessThan(1)
  })

  it('abattreChef fauche le plus coriace des adversaires, puis n’a plus personne à abattre', () => {
    const b = bataille({
      attaquants: [
        { enemy: 'pillard', count: 4 },
        { enemy: 'mercenaire', count: 1 },
        { enemy: 'belier', count: 1 },
      ],
    })
    // le classement se fait sur les pv : bélier (240), mercenaire (115), pillard (30)
    expect(abattreChef(b, 500, 'achille')).toBe('belier')
    const belier = b.fighters.find((f) => f.type === 'belier')!
    expect(belier.etat).toBe('mort')
    expect(belier.hp).toBe(0)
    expect(belier.mortAt).toBe(500)
    const signe = b.effects[b.effects.length - 1]
    expect(signe).toMatchObject({ type: 'heros', heros: 'achille', debut: 500 })
    expect(signe.x).toBeCloseTo(belier.x, 6)

    // les aristies suivantes descendent la hiérarchie d'un cran, pas de deux
    expect(abattreChef(b, 600, 'achille')).toBe('mercenaire')
    expect(abattreChef(b, 700, 'achille')).toBe('pillard')
    expect(pertesAttaque(b)).toBe(3)
    expect(mortsAttaque(b)).toEqual({ belier: 1, mercenaire: 1, pillard: 1 })

    for (const f of b.fighters) {
      f.hp = 0
      f.etat = 'mort'
    }
    expect(abattreChef(b, 800, 'achille')).toBeNull()
  })

  it('fureurHeros ne fauche que les huit ennemis les plus proches du pan chaud', () => {
    const b = bataille({ attaquants: attaquants(12) })
    const pan = b.secteurs[0]
    const troupe = b.fighters.filter((f) => f.camp === 'attaque')
    // huit hommes massés contre le pan, quatre restés loin derrière
    troupe.forEach((f, i) => {
      f.x = i < 8 ? pan.x + 6 + i : pan.x + 400
      f.y = pan.y
    })

    // 240 dégâts partagés entre 8 pillards de 30 pv : les huit tombent, pile
    expect(fureurHeros(b, 900, 240, 'achille')).toBe(8)
    expect(troupe.slice(0, 8).every((f) => f.etat === 'mort' && f.hp === 0)).toBe(true)
    // et l'arrière-garde n'est pas même effleurée : la fureur ne s'étale pas sur
    // toute la vague, sans quoi une grosse vague la rendrait inoffensive
    expect(troupe.slice(8).every((f) => f.etat === 'marche' && f.hp === ENEMIES.pillard.hp)).toBe(true)
    expect(pertesAttaque(b)).toBe(8)
    expect(mortsAttaque(b)).toEqual({ pillard: 8 })
    expect(b.effects[b.effects.length - 1]).toMatchObject({ type: 'heros', heros: 'achille', debut: 900 })

    // sur trois survivants seulement, la même fureur ne se dilue plus
    const c = bataille({ attaquants: attaquants(3) })
    expect(fureurHeros(c, 900, 240, 'achille')).toBe(3)
    expect(pertesAttaque(c)).toBe(3)
  })

  it('secteurChaud pèse les assaillants et l’état du pan, et déprécie ce qui est déjà ouvert', () => {
    // à murs intacts, c'est le nombre d'hommes massés devant le pan qui décide
    const a = bataille({ wallLevel: 3, fronts: SECTEURS, attaquants: attaquants(9) })
    for (const f of a.fighters.filter((x) => x.secteur === 0)) f.secteur = 1
    expect(secteurChaud(a)).toBe(a.secteurs[1])

    // à effectifs égaux (3 par front), le pan déjà entamé l'emporte
    const b = bataille({ wallLevel: 3, fronts: SECTEURS, attaquants: attaquants(9) })
    b.secteurs[2].hp = b.secteurs[2].max * 0.3
    expect(secteurChaud(b)).toBe(b.secteurs[2])

    /*
     * Mais une brèche ouverte n'est plus « chaude » : ni le dieu ni le bouclier
     * d'Hector n'ont plus rien à y sauver. Sans la pénalité, le pan crevé (3 + 7)
     * écraserait le pan simplement fissuré (3 + 2,8) et Hector abriterait un trou.
     */
    const c = bataille({ wallLevel: 3, fronts: SECTEURS, attaquants: attaquants(9) })
    c.secteurs[0].hp = c.secteurs[0].max * 0.6
    c.secteurs[2].hp = 0
    c.secteurs[2].breche = true
    expect(secteurChaud(c)).toBe(c.secteurs[0])

    // et le signe du dieu se plante sur ce pan-là, pas au milieu de la carte
    marqueDivine(b, 2000, 'athena', 4)
    const signe = b.effects[b.effects.length - 1]
    expect(signe).toMatchObject({ type: 'divin', dieu: 'athena', palier: 4, debut: 2000, until: 2000 + 2600 })
    expect(signe.x).toBeCloseTo(b.secteurs[2].x, 6)
    expect(signe.y).toBeCloseTo(b.secteurs[2].y, 6)
  })
})

// ── Comptage des pertes ───────────────────────────────────────────────────────
describe('pertes', () => {
  it('ne raye aucun hoplite de l’effectif quand c’est un héros qui tombe', () => {
    const b = bataille({
      defenseurs: { lancier: 0, archer: 0, hoplite: 4 },
      herosPresents: [{ id: 'achille', niveau: 3 }],
    })
    const heros = b.fighters.find((f) => f.heros === 'achille')!
    // il se bat comme un hoplite mais avec les chiffres de son niveau, et il ne
    // grossit pas `engages` : ses blessures ne doivent pas coûter de soldats
    expect(heros.type).toBe('hoplite')
    expect(heros.camp).toBe('defense')
    expect(heros.hp).toBe(statsCombatHeros(3).hp)
    expect(heros.maxHp).toBe(statsCombatHeros(3).hp)
    expect(heros.atk).toBe(statsCombatHeros(3).atk)
    expect(heros.hp).toBeGreaterThan(UNITS.hoplite.hp)
    expect(b.fighters.filter((f) => f.type === 'hoplite')).toHaveLength(5)
    expect(b.engages).toEqual({ hoplite: 4 })
    // et il tient le premier rang, en avant de la ligne, côté porte
    const troupe = b.fighters.filter((f) => f.camp === 'defense' && !f.heros)
    expect(troupe).toHaveLength(4)
    expect(troupe.every((f) => f.x < heros.x)).toBe(true)

    heros.hp = 0
    heros.etat = 'mort'
    // un héros mis à terre est blessé, pas rayé : la garnison est intacte
    expect(pertesDefense(b)).toEqual({})

    troupe[0].hp = 0
    troupe[0].etat = 'mort'
    expect(pertesDefense(b)).toEqual({ hoplite: 1 })
  })

  it('convertit les pertes de figurines au prorata de la garnison réelle', () => {
    const b = bataille({ defenseurs: { lancier: 40, archer: 0, hoplite: 0 } })
    const figurines = b.fighters.filter((f) => f.type === 'lancier')
    expect(figurines).toHaveLength(16)
    // 4 figurines sur 16, soit un quart des pv : un quart des 40 lanciers y reste
    for (const f of figurines.slice(0, 4)) {
      f.hp = 0
      f.etat = 'mort'
    }
    expect(pertesDefense(b)).toEqual({ lancier: 10 })
    // et les blessés comptent pour ce qu'il leur reste : une figurine à demi
    // entamée vaut un homme de plus au tableau des pertes (28,75 arrondi à 29)
    figurines[4].hp = figurines[4].maxHp / 2
    expect(pertesDefense(b)).toEqual({ lancier: 11 })
  })

  it('ne compte pas les fuyards parmi les morts', () => {
    const b = bataille({
      attaquants: [{ enemy: 'lancier', count: 5 }],
      geo: GEO_EXPEDITION,
      campJoueur: 'attaque',
      wallLevel: 1,
    })
    sonnerRetraite(b)
    expect(b.fighters.every((f) => f.etat === 'fuite')).toBe(true)
    // ils décrochent vers leur point d'entrée, pas vers la place
    expect(b.fighters.every((f) => f.tx === GEO_EXPEDITION.spawn.x + 40)).toBe(true)

    let now = 0
    let sortie: TickBatailleOut | null = null
    for (let k = 0; k < 200 && !sortie; k++) {
      now += 1000
      const out = avancer(b, { now, dt: 1, wallLevel: 1 })
      if (out.finie) sortie = out
    }
    expect(sortie).not.toBeNull()
    // sortis de la carte : l'état « mort » les range hors-jeu, mais ils sont vivants
    expect(b.fighters.every((f) => f.etat === 'mort' && f.hp > 0)).toBe(true)
    expect(pertesAttaque(b)).toBe(0)
    expect(mortsAttaque(b)).toEqual({})
    expect(sortie!.victoireDefense).toBe(true)
    // en l'état, le drapeau `fuite` ne remonte jamais (voir rapport : combat.ts:773)
    expect(sortie!.fuite).toBe(false)
  })

  it('sonne la déroute d’une expédition réduite au tiers, jamais celle des assaillants d’un village', () => {
    const tuer = (b: BattleState, n: number) => {
      for (const f of b.fighters.filter((x) => x.etat !== 'mort').slice(0, n)) {
        f.hp = 0
        f.etat = 'mort'
      }
    }
    const fuyards = (b: BattleState) => b.fighters.filter((f) => f.etat === 'fuite').length

    const expedition = bataille({
      attaquants: [{ enemy: 'lancier', count: 10 }],
      geo: GEO_EXPEDITION,
      campJoueur: 'attaque',
      wallLevel: 1,
    })
    // dt = 0 : la colonne ne bouge pas, seule la règle de déroute s'applique.
    // Quatre hommes sur dix, c'est encore au-dessus du seuil : on tient.
    tuer(expedition, 6)
    avancer(expedition, { now: 1000, dt: 0, wallLevel: 1 })
    expect(fuyards(expedition)).toBe(0)
    // trois sur dix (30 %), c'est en dessous : la troupe décroche d'un seul coup
    tuer(expedition, 1)
    avancer(expedition, { now: 2000, dt: 0, wallLevel: 1 })
    expect(fuyards(expedition)).toBe(3)
    expect(pertesAttaque(expedition)).toBe(7)

    // un village assailli, lui, n'est jamais abandonné : les pillards se battent
    // jusqu'au dernier, sinon aucune vague ne serait jamais jouée jusqu'au bout
    const assaut = bataille({ attaquants: attaquants(10) })
    tuer(assaut, 9)
    avancer(assaut, { now: 1000, dt: 0, wallLevel: 2 })
    expect(fuyards(assaut)).toBe(0)
    expect(assaut.fighters.filter((f) => f.etat === 'marche')).toHaveLength(1)
  })
})
