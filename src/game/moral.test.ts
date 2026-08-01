import { describe, expect, it } from 'vitest'
import {
  GEO_VILLAGE,
  SEUIL_PANIQUE,
  SEUIL_PANIQUE_HEROS,
  creerBataille,
  tickBataille,
  type OptionsBataille,
} from './combat'
import { TICK_MS, WALL_HP } from './data'
import type { BattleState, UnitId } from './types'

/*
 * LE MORAL DE LA TROUPE.
 *
 * Avant, chaque figurine se battait jusqu'à la mort : toutes les mêlées se
 * ressemblaient, on additionnait des points de vie. Une ligne doit pouvoir
 * CASSER — et un héros doit pouvoir la retenir. Ces deux promesses sont
 * exactement ce que ce fichier surveille, parce qu'un seuil mal réglé ne se voit
 * pas : la bataille reste jolie, elle n'a simplement plus d'enjeu.
 */

const ARMEE = (l: number, a: number, h: number): Record<UnitId, number> => ({ lancier: l, archer: a, hoplite: h, frondeur: 0, peltaste: 0, belier: 0 })

function bataille(reglages: Partial<OptionsBataille> = {}): BattleState {
  return creerBataille({
    attaquants: [{ enemy: 'pillard', count: 4 }],
    defenseurs: ARMEE(0, 0, 0),
    wallLevel: 0,
    now: 0,
    geo: GEO_VILLAGE,
    campJoueur: 'defense',
    wallHpTotal: 0,
    ...reglages,
  })
}

/**
 * Rend tout le monde intuable. Sans cela, une bataille se termine en quelques
 * battements et l'on n'observe jamais la panique : le seul moyen d'isoler la
 * RUPTURE est d'écarter la mort, sinon les deux se mélangent dans le compte des
 * fuyards.
 */
function immortels(b: BattleState): void {
  for (const f of b.fighters) {
    if (f.etat === 'mort') continue
    f.hp = 1e9
    f.maxHp = 1e9
  }
}

/** fait tourner la bataille et rend le nombre de ruptures observées */
function jouer(b: BattleState, ticks: number): { rompus: number; moralFinal: number } {
  let now = 0
  let rompus = 0
  for (let i = 0; i < ticks; i++) {
    now += TICK_MS
    const out = tickBataille(b, { now, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 0 })
    rompus += out.rompus.length
    if (out.finie) break
  }
  return { rompus, moralFinal: b.moral?.defense ?? 1 }
}

describe('le moral se mesure et se lit', () => {
  it('vaut un à effectifs intacts, et suit les pertes', () => {
    const b = bataille({ defenseurs: ARMEE(4, 0, 0) })
    tickBataille(b, { now: TICK_MS, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 0 })
    expect(b.moral?.defense).toBe(1)
    // on en abat deux à la main : le moral tombe de moitié
    const lanciers = b.fighters.filter((f) => f.type === 'lancier')
    lanciers[0].etat = 'mort'
    lanciers[1].etat = 'mort'
    tickBataille(b, { now: 2 * TICK_MS, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 0 })
    expect(b.moral?.defense).toBeCloseTo(0.5, 6)
  })

  it('ne compte pas les fuyards parmi ceux qui tiennent la ligne', () => {
    const b = bataille({ defenseurs: ARMEE(4, 0, 0) })
    b.fighters.filter((f) => f.type === 'lancier')[0].etat = 'fuite'
    tickBataille(b, { now: TICK_MS, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 0 })
    expect(b.moral?.defense).toBeCloseTo(0.75, 6)
  })
})

describe('une ligne casse au lieu de fondre', () => {
  it('fait rompre les défenseurs sous le seuil, jamais au-dessus', () => {
    /*
     * Huit lanciers dont on abat cinq : le moral tombe à 0,375, sous le seuil de
     * 0,45. Personne ne meurt pendant l'épreuve — les ruptures observées ne
     * peuvent donc venir que de la panique.
     */
    const b = bataille({ defenseurs: ARMEE(8, 0, 0), attaquants: [{ enemy: 'pillard', count: 2 }] })
    const lanciers = b.fighters.filter((f) => f.type === 'lancier')
    for (let i = 0; i < 5; i++) lanciers[i].etat = 'mort'
    immortels(b)
    expect(3 / 8).toBeLessThan(SEUIL_PANIQUE)
    const { rompus } = jouer(b, 300)
    expect(rompus).toBeGreaterThan(0)

    // au-dessus du seuil, en revanche, la ligne tient
    const solide = bataille({ defenseurs: ARMEE(8, 0, 0), attaquants: [{ enemy: 'pillard', count: 2 }] })
    solide.fighters.filter((f) => f.type === 'lancier')[0].etat = 'mort'
    immortels(solide)
    expect(7 / 8).toBeGreaterThan(SEUIL_PANIQUE)
    expect(jouer(solide, 300).rompus).toBe(0)
  })

  it('ne fait rompre qu’un homme par battement : la ligne s’effrite', () => {
    const b = bataille({ defenseurs: ARMEE(10, 0, 0), attaquants: [{ enemy: 'pillard', count: 1 }] })
    const lanciers = b.fighters.filter((f) => f.type === 'lancier')
    for (let i = 0; i < 8; i++) lanciers[i].etat = 'mort'
    let maxParTick = 0
    let now = 0
    for (let i = 0; i < 60; i++) {
      now += TICK_MS
      const out = tickBataille(b, { now, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 0 })
      maxParTick = Math.max(maxParTick, out.rompus.length)
      if (out.finie) break
    }
    expect(maxParTick).toBeLessThanOrEqual(1)
  })

  it('laisse partir les plus entamés d’abord', () => {
    const b = bataille({ defenseurs: ARMEE(6, 0, 0), attaquants: [{ enemy: 'pillard', count: 1 }] })
    const lanciers = b.fighters.filter((f) => f.type === 'lancier')
    for (let i = 0; i < 4; i++) lanciers[i].etat = 'mort'
    // des deux survivants, l'un est à bout de forces
    const blesse = lanciers[4]
    const intact = lanciers[5]
    blesse.hp = blesse.maxHp * 0.1
    let now = 0
    for (let i = 0; i < 400; i++) {
      now += TICK_MS
      const out = tickBataille(b, { now, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 0 })
      if (out.rompus.length > 0) {
        expect(out.rompus[0]).toBe(blesse.id)
        return
      }
      if (out.finie) break
    }
    // si personne n'a rompu, l'invariant n'est pas éprouvé : c'est un échec
    expect.unreachable('aucune rupture observée : le tirage ou le seuil a changé')
    expect(intact.etat).not.toBe('fuite')
  })
})

describe('un héros retient la ligne', () => {
  it('abaisse fortement le seuil de rupture tant qu’il est debout', () => {
    expect(SEUIL_PANIQUE_HEROS).toBeLessThan(SEUIL_PANIQUE)
    /*
     * Même situation, à un héros près. Sans lui, trois hommes sur huit rompent ;
     * avec lui, le seuil tombe à 0,2 et la ligne tient — c'est très exactement ce
     * que promettent les fiches de héros, et cela ne se vérifiait nulle part.
     */
    const sans = bataille({ defenseurs: ARMEE(8, 0, 0), attaquants: [{ enemy: 'pillard', count: 2 }] })
    for (const f of sans.fighters.filter((f) => f.type === 'lancier').slice(0, 5)) f.etat = 'mort'
    immortels(sans)
    expect(jouer(sans, 300).rompus).toBeGreaterThan(0)

    const avec = bataille({
      defenseurs: ARMEE(8, 0, 0),
      attaquants: [{ enemy: 'pillard', count: 2 }],
      herosPresents: [{ id: 'hector', niveau: 3 }],
    })
    for (const f of avec.fighters.filter((f) => f.type === 'lancier' && !f.heros).slice(0, 5)) f.etat = 'mort'
    immortels(avec)
    // 3 lanciers + le héros sur 9 = 0,44 : au-dessus de 0,2, donc personne ne rompt
    expect(jouer(avec, 300).rompus).toBe(0)
  })

  it('ne fait jamais rompre le héros lui-même', () => {
    const b = bataille({
      defenseurs: ARMEE(6, 0, 0),
      attaquants: [{ enemy: 'pillard', count: 1 }],
      herosPresents: [{ id: 'achille', niveau: 4 }],
    })
    // on ne laisse que le héros : moral au plus bas, il doit tenir seul
    for (const f of b.fighters.filter((f) => f.camp === 'defense' && !f.heros)) f.etat = 'mort'
    jouer(b, 300)
    const hero = b.fighters.find((f) => f.heros)!
    expect(hero.etat).not.toBe('fuite')
  })
})

describe('les assaillants d’un village ne rompent pas', () => {
  it('se battent jusqu’au dernier : ils sont venus piller, pas tenir un rang', () => {
    const b = bataille({ attaquants: [{ enemy: 'pillard', count: 8 }], defenseurs: ARMEE(1, 0, 0) })
    for (const f of b.fighters.filter((f) => f.camp === 'attaque').slice(0, 6)) f.etat = 'mort'
    let now = 0
    let rompusAttaque = 0
    for (let i = 0; i < 200; i++) {
      now += TICK_MS
      const out = tickBataille(b, { now, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 0 })
      for (const id of out.rompus) {
        if (b.fighters.find((f) => f.id === id)?.camp === 'attaque') rompusAttaque++
      }
      if (out.finie) break
    }
    expect(rompusAttaque).toBe(0)
  })

  it('mais la colonne du JOUEUR, en expédition, rompt bel et bien', () => {
    // c'est la déroute qui existait déjà : sous 30 % de survivants, on rentre
    const b = creerBataille({
      attaquants: [{ enemy: 'lancier', count: 10 }],
      defenseurs: ARMEE(6, 3, 2),
      wallLevel: 2,
      now: 0,
      geo: GEO_VILLAGE,
      campJoueur: 'attaque',
      wallHpTotal: WALL_HP[2],
    })
    for (const f of b.fighters.filter((f) => f.camp === 'attaque').slice(0, 8)) f.etat = 'mort'
    tickBataille(b, { now: TICK_MS, dt: TICK_MS / 1000, wallHp: WALL_HP[2], wallLevel: 2 })
    expect(b.fighters.filter((f) => f.camp === 'attaque' && f.etat === 'fuite').length).toBeGreaterThan(0)
  })
})
