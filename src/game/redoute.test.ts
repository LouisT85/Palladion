import { describe, expect, it } from 'vitest'
import { GEO_VILLAGE, creerBataille, tickBataille } from './combat'
import { REDOUTE_DMG, REDOUTE_MAX, REDOUTE_PORTEE, REDOUTE_POS, redouteHp } from './data'
import { useGame } from './store'
import type { BattleState } from './types'

/*
 * ═══════════════════ LA REDOUTE ═══════════════════
 *
 * Elle existe pour une raison précise, et c'est cette raison qu'on éprouve ici :
 * les cinq autres ouvrages de l'intérieur sont PASSIFS - de la structure, des
 * modificateurs - et une fois le mur passé le joueur n'avait plus une seule arme
 * dans l'enceinte. La Redoute est le pendant exact de la tour d'archers, à
 * l'envers du temps : la tour se tait à la brèche, la Redoute n'y commence.
 *
 * Quatre promesses, donc :
 *  1. muette tant que l'enceinte tient ;
 *  2. mordante dès la brèche, et seulement sur ce qui est ENTRÉ ;
 *  3. réductible au silence - une pièce invulnérable rendrait la brèche vaine ;
 *  4. bâtie et réparée par le store, avec ses garde-fous.
 */

const AUCUNE_TROUPE = { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 }

function bataille(redoute: number, wallLevel = 2): BattleState {
  return creerBataille({
    attaquants: [{ enemy: 'pillard', count: 6 }],
    defenseurs: AUCUNE_TROUPE,
    wallLevel,
    now: 0,
    geo: GEO_VILLAGE,
    campJoueur: 'defense',
    redoute,
    wallHpTotal: 600,
  })
}

/** ouvre tous les pans : c'est l'intérieur qu'on veut éprouver */
function percer(b: BattleState): BattleState {
  for (const s of b.secteurs) {
    s.hp = 0
    s.breche = true
  }
  b.breche = true
  return b
}

/** pose les assaillants à l'endroit voulu, vivants et au repos */
function placer(b: BattleState, x: number, y: number): void {
  for (const f of b.fighters) {
    if (f.camp !== 'attaque') continue
    f.x = x
    f.y = y
    f.tx = x
    f.ty = y
    f.etat = 'melee'
  }
}

function traits(b: BattleState, now: number, dt = 1): number {
  b.projectiles = []
  tickBataille(b, { now, dt, wallHp: 0, wallLevel: 2, redouteHp: redouteHp(3), cibles: [] })
  return b.projectiles.length
}

describe('la Redoute, arme du dedans', () => {
  it('n’arme que le nombre de scorpions bâtis, et rien du tout sans chantier', () => {
    expect(bataille(0).redouteDef).toBeUndefined()
    expect(bataille(1).redouteDef).toHaveLength(1)
    expect(bataille(REDOUTE_MAX).redouteDef).toHaveLength(REDOUTE_MAX)
    // les postes sont bien à l'aplomb de l'ouvrage, au sud de l'agora
    for (const p of bataille(3).redouteDef ?? []) {
      expect(Math.abs(p.x - REDOUTE_POS.x)).toBeLessThan(40)
      expect(p.y).toBeLessThan(REDOUTE_POS.y)
    }
  })

  it('reste muette tant que l’enceinte tient - c’est l’affaire des tours', () => {
    const b = bataille(3)
    placer(b, GEO_VILLAGE.cx, GEO_VILLAGE.cy)
    expect(b.breche).toBe(false)
    expect(traits(b, 5000)).toBe(0)
  })

  it('ouvre le feu dès la brèche, sur ce qui est entré', () => {
    const b = percer(bataille(3))
    placer(b, GEO_VILLAGE.cx, GEO_VILLAGE.cy)
    const n = traits(b, 5000)
    expect(n).toBe(3)
    // et ce sont bien des traits de scorpion : plus lourds qu'une flèche de tour
    expect(b.projectiles[0].dmg).toBeCloseTo(REDOUTE_DMG, 5)
  })

  it('ne tire pas sur ce qui est encore dehors, même à portée', () => {
    const b = percer(bataille(3))
    /*
     * Un point HORS de l'ellipse de l'enceinte mais à moins de `REDOUTE_PORTEE`
     * du poste de tir. Sans le filtre « dedans », la Redoute doublerait les tours
     * sur la plaine au lieu de les relayer dans la place.
     *
     * La marge de 60 px n'est pas de la coquetterie : le tir vient APRÈS le
     * déplacement dans le tick, et une seconde de marche suffirait à faire
     * franchir la limite à un assaillant posé juste dessus.
     */
    const x = REDOUTE_POS.x
    const y = GEO_VILLAGE.cy + GEO_VILLAGE.ry + 60
    placer(b, x, y)
    const poste = (b.redouteDef ?? [])[0]
    expect(Math.hypot(x - poste.x, y - poste.y)).toBeLessThan(REDOUTE_PORTEE)
    expect(traits(b, 5000)).toBe(0)
  })

  it('se tait quand on l’a abattue', () => {
    const b = percer(bataille(3))
    placer(b, GEO_VILLAGE.cx, GEO_VILLAGE.cy)
    b.projectiles = []
    tickBataille(b, { now: 5000, dt: 1, wallHp: 0, wallLevel: 2, redouteHp: 0, cibles: [] })
    expect(b.projectiles).toHaveLength(0)
  })

  it('respecte sa cadence : une salve, puis le temps de remonter les treuils', () => {
    const b = percer(bataille(2))
    placer(b, GEO_VILLAGE.cx, GEO_VILLAGE.cy)
    expect(traits(b, 5000)).toBe(2)
    // aussitôt après, les treuils sont vides
    expect(traits(b, 5200)).toBe(0)
  })
})

describe('bâtir et remettre en batterie', () => {
  function neuf() {
    useGame.setState({
      redoute: 0,
      redouteHp: 0,
      battle: null,
      buildings: { ...useGame.getState().buildings, remparts: { level: 3 } },
    })
  }

  it('exige une enceinte : sans remparts, il n’y a pas de dedans à tenir', () => {
    useGame.setState({
      redoute: 0,
      redouteHp: 0,
      battle: null,
      buildings: { ...useGame.getState().buildings, remparts: { level: 1 } },
    })
    useGame.getState().construireRedoute()
    expect(useGame.getState().redoute).toBe(0)
  })

  it('monte jusqu’à trois pièces, et pas au-delà', () => {
    neuf()
    for (let i = 0; i < REDOUTE_MAX + 2; i++) useGame.getState().construireRedoute()
    expect(useGame.getState().redoute).toBe(REDOUTE_MAX)
    expect(useGame.getState().redouteHp).toBe(redouteHp(REDOUTE_MAX))
  })

  it('rend sa structure à la réparation, sans faire repayer les chantiers', () => {
    neuf()
    useGame.getState().construireRedoute()
    useGame.getState().construireRedoute()
    const niveau = useGame.getState().redoute
    useGame.setState({ redouteHp: 12 })
    useGame.getState().reparerRedoute()
    expect(useGame.getState().redouteHp).toBe(redouteHp(niveau))
    // le niveau, lui, n'a pas bougé : on remonte la machine, on ne la rebâtit pas
    expect(useGame.getState().redoute).toBe(niveau)
  })

  it('ne se bâtit pas au milieu d’un assaut', () => {
    neuf()
    useGame.setState({ battle: percer(bataille(0)) })
    useGame.getState().construireRedoute()
    expect(useGame.getState().redoute).toBe(0)
  })
})
