import { describe, expect, it } from 'vitest'
import { GEO_EXPEDITION, GEO_VILLAGE, creerBataille, estTireur, postesArchers, tickBataille } from './combat'
import { ENEMIES, TICK_MS, UNITS, UNIT_IDS, WALL_HP, troupes } from './data'
import type { BattleState, UnitId } from './types'

/*
 * LES SIX UNITÉS.
 *
 * Trois existaient, et elles ne différaient que par le prix : on n'arbitrait pas,
 * on empilait. Les trois nouvelles n'ont d'intérêt que si chacune fait quelque
 * chose qu'AUCUNE autre ne fait - c'est cela qu'on garde ici, et non leurs
 * chiffres, qui bougeront à l'équilibrage.
 */

function bataille(reglages: Partial<Parameters<typeof creerBataille>[0]> = {}): BattleState {
  return creerBataille({
    attaquants: [{ enemy: 'pillard', count: 4 }],
    defenseurs: troupes({}),
    wallLevel: 2,
    now: 0,
    geo: GEO_VILLAGE,
    campJoueur: 'defense',
    wallHpTotal: WALL_HP[2],
    ...reglages,
  })
}

describe('la table des unités', () => {
  it('compte sept unités, chacune indexée par son propre identifiant', () => {
    expect(UNIT_IDS).toEqual(['lancier', 'archer', 'hoplite', 'frondeur', 'peltaste', 'char', 'belier'])
    for (const u of UNIT_IDS) expect(UNITS[u].id, u).toBe(u)
    // deux unités de même emoji seraient indiscernables dans la caserne
    expect(new Set(UNIT_IDS.map((u) => UNITS[u].emoji)).size).toBe(UNIT_IDS.length)
    for (const u of UNIT_IDS) {
      expect(UNITS[u].desc.trim().length, u).toBeGreaterThan(20)
      expect(UNITS[u].caserne, u).toBeGreaterThanOrEqual(1)
      expect(UNITS[u].caserne, u).toBeLessThanOrEqual(4)
      expect(UNITS[u].time, u).toBeGreaterThan(0)
      expect(Object.keys(UNITS[u].cost).length, u).toBeGreaterThan(0)
    }
  })

  it('donne à chaque nouvelle unité une raison d’être qu’aucune autre ne remplit', () => {
    // le frondeur est le SEUL soldat qui ne coûte pas un gramme de bronze
    const sansBronze = UNIT_IDS.filter((u) => !UNITS[u].cost.bronze)
    expect(sansBronze).toEqual(['frondeur'])
    // …et le moins cher à lever, de loin
    const prix = (u: UnitId) => Object.values(UNITS[u].cost).reduce((a, n) => a + n, 0)
    expect(prix('frondeur')).toBeLessThan(Math.min(...UNIT_IDS.filter((u) => u !== 'frondeur').map(prix)))

    // le bélier est le SEUL à abattre un mur plus vite qu'il ne se bat
    expect(UNITS.belier.wallDps).toBeGreaterThan(UNITS.belier.atk * 4)
    expect(UNITS.belier.wallDps).toBe(Math.max(...UNIT_IDS.map((u) => UNITS[u].wallDps)))
    // et il encaisse plus que n'importe quel homme : c'est une machine
    expect(UNITS.belier.hp).toBe(Math.max(...UNIT_IDS.map((u) => UNITS[u].hp)))

    // le peltaste est le seul à courir plus vite que l'infanterie
    const b = creerBataille({
      attaquants: [{ enemy: 'pillard', count: 1 }],
      defenseurs: troupes({ lancier: 1, peltaste: 1, hoplite: 1 }),
      wallLevel: 0,
      now: 0,
      geo: GEO_VILLAGE,
      campJoueur: 'defense',
      wallHpTotal: 0,
    })
    const vitesse = (t: UnitId) => b.fighters.find((f) => f.type === t)!.speed
    expect(vitesse('peltaste')).toBeGreaterThan(vitesse('lancier'))
    expect(vitesse('peltaste')).toBeGreaterThan(vitesse('hoplite'))
  })
})

describe('le char de guerre', () => {
  it('est le plus rapide de la Troade, et de loin', () => {
    const b = creerBataille({
      attaquants: [{ enemy: 'pillard', count: 1 }],
      defenseurs: troupes({ lancier: 1, peltaste: 1, hoplite: 1, char: 1 }),
      wallLevel: 0,
      now: 0,
      geo: GEO_VILLAGE,
      campJoueur: 'defense',
      wallHpTotal: 0,
    })
    const vitesse = (t: UnitId) => b.fighters.find((f) => f.type === t)!.speed
    for (const autre of ['lancier', 'hoplite', 'peltaste'] as UnitId[]) {
      expect(vitesse('char'), autre).toBeGreaterThan(vitesse(autre))
    }
  })

  it('coûte cher et ne fait rien à une muraille : ce n’est pas une machine de siège', () => {
    const prix = (u: UnitId) => Object.values(UNITS[u].cost).reduce((a, n) => a + n, 0)
    // plus cher que toute l'infanterie - c'est le prix de la vitesse
    for (const autre of ['lancier', 'archer', 'hoplite', 'frondeur', 'peltaste'] as UnitId[]) {
      expect(prix('char'), autre).toBeGreaterThan(prix(autre))
    }
    // et sans effet sur un mur : le bélier reste seul à cela
    expect(UNITS.char.wallDps).toBeLessThan(UNITS.belier.wallDps / 10)
  })

  it('fond sur les machines de siège, ce qu’aucune autre unité ne fait', () => {
    /*
     * Un bélier ennemi LOIN, un pillard TOUT PRÈS. Le char doit traverser pour la
     * machine : c'est ce qui le distingue du peltaste, qui ne voit que les tireurs.
     */
    const b = creerBataille({
      attaquants: [
        { enemy: 'pillard', count: 1 },
        { enemy: 'belier', count: 1 },
      ],
      defenseurs: troupes({ char: 1, lancier: 1 }),
      wallLevel: 0,
      now: 0,
      geo: GEO_VILLAGE,
      campJoueur: 'defense',
      wallHpTotal: 0,
    })
    const pillard = b.fighters.find((f) => f.camp === 'attaque' && f.type === 'pillard')!
    const belier = b.fighters.find((f) => f.camp === 'attaque' && f.type === 'belier')!
    const char = b.fighters.find((f) => f.type === 'char')!
    for (const [f, dx] of [
      [pillard, 30],
      [belier, 95],
    ] as const) {
      f.x = char.x + dx
      f.y = char.y
      f.tx = f.x
      f.ty = f.y
      f.etat = 'melee'
    }
    tickBataille(b, { now: 1000, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 0 })
    // il part vers la machine, donc au-delà du pillard qui lui barre la route
    expect(char.tx).toBeGreaterThan(pillard.x)
  })
})

describe('les frondeurs tirent depuis le rempart', () => {
  it('montent sur le mur comme les archers, et se partagent les créneaux', () => {
    const b = bataille({ defenseurs: troupes({ archer: 3, frondeur: 3 }) })
    const tireurs = b.fighters.filter((f) => estTireur(f.type))
    expect(tireurs).toHaveLength(6)
    expect(tireurs.every((f) => f.etat === 'siege')).toBe(true)
    /*
     * Les créneaux d'un rempart sont comptés : à six tireurs pour deux positions,
     * on tourne. Ce qui compte est que le compteur soit COMMUN - sinon les
     * frondeurs se seraient empilés exactement sur les archers.
     */
    const places = postesArchers(GEO_VILLAGE, 2).length
    expect(new Set(tireurs.map((f) => `${Math.round(f.tx)},${Math.round(f.ty)}`)).size).toBe(Math.min(6, places))
    expect(b.engages).toEqual({ archer: 3, frondeur: 3 })
  })

  it('portent moins loin qu’un arc : c’est le prix de leur gratuité', () => {
    /*
     * On place un assaillant à une distance qu'un arc couvre et qu'une fronde ne
     * couvre pas, puis on regarde qui décoche. Aucun chiffre en dur : les portées
     * viennent du moteur, seul leur RAPPORT est testé.
     */
    const tirs = (u: 'archer' | 'frondeur', distance: number): number => {
      const b = bataille({ defenseurs: troupes({ [u]: 1 }), attaquants: [{ enemy: 'pillard', count: 1 }] })
      const tireur = b.fighters.find((f) => f.type === u)!
      const pillard = b.fighters.find((f) => f.camp === 'attaque')!
      pillard.x = tireur.x + distance
      pillard.y = tireur.y
      pillard.tx = pillard.x
      pillard.ty = pillard.y
      pillard.etat = 'siege'
      tireur.nextHit = 0
      tickBataille(b, { now: 10_000, dt: TICK_MS / 1000, wallHp: WALL_HP[2], wallLevel: 2 })
      return b.projectiles.length
    }
    // à courte portée, les deux tirent
    expect(tirs('archer', 120)).toBe(1)
    expect(tirs('frondeur', 120)).toBe(1)
    // à longue portée, l'arc seul atteint
    expect(tirs('archer', 260)).toBe(1)
    expect(tirs('frondeur', 260)).toBe(0)
  })
})

describe('le peltaste chasse les tireurs', () => {
  it('court au tireur plutôt qu’au fantassin le plus proche', () => {
    /*
     * Un archer ennemi LOIN, un pillard TOUT PRÈS. Un lancier va au plus proche ;
     * le peltaste doit traverser pour l'archer - sinon il n'est qu'un lancier cher.
     */
    const b = creerBataille({
      attaquants: [
        { enemy: 'pillard', count: 1 },
        { enemy: 'archer', count: 1 },
      ],
      defenseurs: troupes({ lancier: 1, peltaste: 1 }),
      wallLevel: 0,
      now: 0,
      geo: GEO_VILLAGE,
      campJoueur: 'defense',
      wallHpTotal: 0,
    })
    const pillard = b.fighters.find((f) => f.camp === 'attaque' && f.type === 'pillard')!
    const archer = b.fighters.find((f) => f.camp === 'attaque' && f.type === 'archer')!
    const peltaste = b.fighters.find((f) => f.type === 'peltaste')!
    const lancier = b.fighters.find((f) => f.type === 'lancier')!
    /*
     * Les deux assaillants doivent être DEDANS - la ligne de mêlée ne sort pas
     * chercher ce qui est encore hors des murs. On les place donc tous deux près du
     * ralliement, l'archer un peu plus loin que le pillard.
     */
    for (const [f, dx] of [
      [pillard, 30],
      [archer, 90],
    ] as const) {
      f.x = peltaste.x + dx
      f.y = peltaste.y
      f.tx = f.x
      f.ty = f.y
      f.etat = 'melee'
    }
    tickBataille(b, { now: 1000, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 0 })
    /*
     * On vise le point de CONTACT, pas les pieds de l'adversaire (sans quoi les
     * corps se traversaient). On vérifie donc vers QUI chacun se dirige, à la
     * longueur de lance près : le peltaste vers l'archer lointain, le lancier
     * vers le pillard voisin.
     */
    expect(Math.abs(peltaste.tx - archer.x)).toBeLessThan(20)
    expect(peltaste.tx).toBeGreaterThan(pillard.x)
    expect(Math.abs(lancier.tx - pillard.x)).toBeLessThan(20)
  })
})

describe('le bélier du joueur abat les murs', () => {
  it('se conduit exactement comme celui de l’ennemi : même fiche, même besogne', () => {
    // les deux tables décrivent la même machine - sinon le joueur aurait un jouet
    expect(UNITS.belier.wallDps).toBe(ENEMIES.belier.wallDps)
    expect(UNITS.belier.hp).toBe(ENEMIES.belier.hp)
    expect(UNITS.belier.atk).toBe(ENEMIES.belier.atk)
  })

  it('perce une place forte bien plus vite qu’une colonne d’hommes', () => {
    /*
     * Deux expéditions de force comparable contre la même muraille : l'une avec un
     * bélier, l'autre sans. C'est tout l'intérêt de la machine, et cela ne se
     * vérifiait nulle part puisque le joueur n'y avait pas droit.
     */
    const percer = (avecBelier: boolean): number => {
      const b = creerBataille({
        attaquants: avecBelier
          ? [
              { enemy: 'lancier', count: 6 },
              { enemy: 'belier', count: 1 },
            ]
          : [{ enemy: 'lancier', count: 10 }],
        defenseurs: troupes({}),
        wallLevel: 3,
        now: 0,
        geo: GEO_EXPEDITION,
        campJoueur: 'attaque',
        wallHpTotal: WALL_HP[3],
      })
      let now = 0
      for (let i = 0; i < 2000; i++) {
        now += TICK_MS
        const out = tickBataille(b, { now, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 3 })
        if (out.brecheOuverte || out.finie) return i
      }
      return 2000
    }
    const avec = percer(true)
    const sans = percer(false)
    expect(avec).toBeLessThan(sans)
  })

  it('vaut son prix : plus cher que trois lanciers, et il ne tient pas un rang', () => {
    const prix = (u: UnitId) => Object.values(UNITS[u].cost).reduce((a, n) => a + n, 0)
    expect(prix('belier')).toBeGreaterThan(3 * prix('lancier'))
    // en défense, une machine ne sert à rien : elle ne monte pas sur le mur
    const b = bataille({ defenseurs: troupes({ belier: 2 }) })
    expect(b.fighters.filter((f) => f.camp === 'defense')).toHaveLength(0)
  })
})
