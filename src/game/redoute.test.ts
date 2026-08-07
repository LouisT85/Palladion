import { describe, expect, it } from 'vitest'
import { GEO_VILLAGE, creerBataille, tickBataille } from './combat'
import {
  BUILDINGS,
  BUILDING_IDS,
  DPS_BATIMENT,
  REDOUTE_MAX,
  REDOUTE_PORTEE,
  REDOUTE_POS,
  redouteDmg,
  structureMax,
} from './data'
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
 * Elle est de surcroît, depuis, un BÂTIMENT et non plus un compteur greffé sur
 * le panneau des remparts. Les promesses à tenir sont donc de deux ordres.
 *
 * Ce qu'elle fait en bataille :
 *  1. muette tant que l'enceinte tient ;
 *  2. mordante dès la brèche, et seulement sur ce qui est ENTRÉ ;
 *  3. réductible au silence - une pièce invulnérable rendrait la brèche vaine ;
 *  4. le trait monte avec le niveau de l'ouvrage.
 *
 * Ce qu'elle est dans le village :
 *  5. le onzième `BuildingId`, quatre niveaux, aucune exigence de remparts ;
 *  6. posée dans l'enceinte, sans écraser ses voisins ;
 *  7. constructible dès le premier jour - mais au prix du bronze des lances.
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
  tickBataille(b, { now, dt, wallHp: 0, wallLevel: 2, redouteHp: structureMax('redoute', REDOUTE_MAX), cibles: [] })
  return b.projectiles.length
}

describe('la Redoute, arme du dedans', () => {
  it('n’arme que le nombre de scorpions bâtis, et rien du tout sans chantier', () => {
    expect(bataille(0).redouteDef).toBeUndefined()
    expect(bataille(1).redouteDef).toHaveLength(1)
    expect(bataille(REDOUTE_MAX).redouteDef).toHaveLength(REDOUTE_MAX)
    // les postes sont bien à l'aplomb de l'ouvrage, sur son plancher de tir
    for (const p of bataille(REDOUTE_MAX).redouteDef ?? []) {
      expect(Math.abs(p.x - REDOUTE_POS.x)).toBeLessThan(60)
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
    expect(b.projectiles[0].dmg).toBeCloseTo(redouteDmg(3), 5)
  })

  it('ne tire pas sur ce qui est encore dehors, même à portée', () => {
    const b = percer(bataille(3))
    /*
     * Un point HORS de l'ellipse de l'enceinte mais à moins de `REDOUTE_PORTEE`
     * du poste de tir. Sans le filtre « dedans », la Redoute doublerait les tours
     * sur la plaine au lieu de les relayer dans la place.
     *
     * On sort par le SUD, dans l'axe de l'ouvrage : c'est le côté vers lequel il
     * est planté, et donc celui où un point hors les murs reste à sa portée.
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

  it('frappe plus fort à chaque niveau - c’est la moitié de la progression', () => {
    for (const n of [2, 3, 4]) expect(redouteDmg(n)).toBeGreaterThan(redouteDmg(n - 1))
    // et le poste porte la force de SON niveau, pas une constante globale
    for (const n of [1, 2, 3, 4]) {
      for (const p of percer(bataille(n)).redouteDef ?? []) expect(p.dmg).toBe(redouteDmg(n))
    }
  })

  it('ne couche pas un pillard d’un seul trait au premier niveau', () => {
    /*
     * C'est LE garde-fou de l'équilibre depuis qu'elle est constructible d'emblée.
     * La première bande est faite de pillards (30 points de vie) et arrive à la
     * onzième minute : un trait qui en tue un rendrait ce premier assaut sans
     * objet. Il en faut deux.
     */
    expect(redouteDmg(1)).toBeLessThan(30)
    expect(redouteDmg(1) * 2).toBeGreaterThanOrEqual(30)
  })
})

describe('la Redoute est un bâtiment comme les autres', () => {
  it('est le onzième `BuildingId`, avec ses quatre niveaux au complet', () => {
    expect(BUILDING_IDS).toContain('redoute')
    expect(BUILDING_IDS).toHaveLength(11)
    const def = BUILDINGS.redoute
    expect(def.costs).toHaveLength(4)
    expect(def.times).toHaveLength(4)
    expect(def.niveaux).toHaveLength(4)
    expect(def.interieur).toBe(true)
    expect(REDOUTE_MAX).toBe(4)
  })

  it('coûte du bronze dès le premier niveau : l’arbitrage remplace le verrou', () => {
    /*
     * Elle n'exige plus de remparts - c'est la demande. Ce qui la retient au
     * premier jour est donc économique : la partie commence avec 24 de bronze et
     * un lancier en coûte 6. Élever la Redoute, c'est renoncer à trois lances.
     */
    const n1 = BUILDINGS.redoute.costs[0]
    expect(n1.bronze).toBeGreaterThan(12)
    expect(n1.bronze).toBeLessThanOrEqual(24)
    // et elle reste le plus cher des niveaux 1 du village
    const total = (c: Partial<Record<'bois' | 'pierre' | 'grain' | 'bronze', number>>) =>
      (c.bois ?? 0) + (c.pierre ?? 0) + (c.grain ?? 0) + (c.bronze ?? 0)
    for (const b of BUILDING_IDS) {
      if (b === 'redoute') continue
      expect(total(n1), b).toBeGreaterThan(total(BUILDINGS[b].costs[0]))
    }
    // le coût monte à chaque niveau, sans quoi le dernier serait gratuit
    for (let i = 1; i < 4; i++) {
      expect(total(BUILDINGS.redoute.costs[i])).toBeGreaterThan(total(BUILDINGS.redoute.costs[i - 1]))
    }
  })

  it('tient deux fois ce que tient un atelier, sans approcher le cœur', () => {
    for (const n of [1, 2, 3, 4]) {
      expect(structureMax('redoute', n)).toBe(structureMax('ferme', n) * 2)
      expect(structureMax('redoute', n)).toBeLessThan(structureMax('agora', n))
    }
    // et l'on peut la réduire au silence : cinq pillards en viennent à bout
    const secondes = structureMax('redoute', 1) / (5 * DPS_BATIMENT)
    expect(secondes).toBeLessThan(45)
  })

  it('se dresse DANS l’enceinte, à l’écart du chemin de ronde', () => {
    /*
     * L'enceinte est l'ellipse `MAP.mur` ; sa maçonnerie mange environ 27 px vers
     * l'intérieur (mesuré au zoom d'ensemble), d'où l'ellipse utile ci-dessous.
     * L'emprise de la Redoute au niveau 4 a été relevée sur son art : 79 px à
     * gauche (la rampe et le râtelier), 80 à droite (la joue et le fanion), 76
     * au-dessus pour la maçonnerie et 20 au-dessous.
     *
     * C'est la MASSE qu'on éprouve, pas les traits armés : ceux-ci montent à 104
     * et sont ajourés - ils ne prennent aucune place au sol.
     */
    const DEDANS = { cx: 575, cy: 445, rx: 303, ry: 168 }
    const p = BUILDINGS.redoute.pos
    const coins: [number, number][] = [
      [p.x - 79, p.y - 76],
      [p.x + 80, p.y - 76],
      [p.x - 79, p.y + 20],
      [p.x + 80, p.y + 20],
    ]
    for (const [x, y] of coins) {
      const d = ((x - DEDANS.cx) / DEDANS.rx) ** 2 + ((y - DEDANS.cy) / DEDANS.ry) ** 2
      expect(d, `(${x},${y})`).toBeLessThan(1)
    }
  })

  it('laisse la forge entièrement visible - c’était l’écueil de la place à l’est', () => {
    /*
     * La place la moins mordante d'après le calcul était (757, 437), dans la
     * bande entre la forge et la caserne. Regardée sur capture, la file d'arcs
     * des scorpions - ajourée, donc gratuite pour le calcul - recouvrait la
     * forge presque en entier. Ce test garde la leçon : la boîte de l'ouvrage,
     * TRAITS ARMÉS COMPRIS, ne doit pas mordre celle de la forge.
     */
    const p = BUILDINGS.redoute.pos
    const forge: [number, number, number, number] = [634, 273, 769, 372]
    const boite = [p.x - 79, p.y - 104, p.x + 80, p.y + 20]
    const chevauche = boite[0] < forge[2] && boite[2] > forge[0] && boite[1] < forge[3] && boite[3] > forge[1]
    expect(chevauche).toBe(false)
  })

  it('couvre le cœur du village - c’est lui qu’elle est là pour tenir', () => {
    // `MAP.place` est le point que les assaillants viennent piller
    const poste = (bataille(1).redouteDef ?? [])[0]
    expect(Math.hypot(GEO_VILLAGE.place.x - poste.x, GEO_VILLAGE.place.y - poste.y)).toBeLessThan(REDOUTE_PORTEE)
    // et elle ne commande PAS la porte : sa portée tient la place, pas l'entrée
    expect(Math.hypot(GEO_VILLAGE.porte.x - poste.x, GEO_VILLAGE.porte.y - poste.y)).toBeGreaterThan(REDOUTE_PORTEE)
  })
})

describe('bâtir la Redoute', () => {
  /** un village neuf, riche, SANS remparts : c'est là toute la question */
  function neuf(rempartsNiveau = 0) {
    const b = { ...useGame.getState().buildings }
    for (const id of BUILDING_IDS) b[id] = { level: 0 }
    b.agora = { level: 4 }
    b.remparts = { level: rempartsNiveau }
    useGame.setState({
      battle: null,
      buildings: b,
      resources: { bois: 9000, pierre: 9000, grain: 9000, bronze: 9000 },
    })
  }

  it('se lance SANS un pouce de rempart - c’est la demande', () => {
    neuf(0)
    useGame.getState().upgrade('redoute')
    expect(useGame.getState().buildings.redoute.targetLevel).toBe(1)
  })

  it('ne monte pas au-delà du quatrième niveau', () => {
    neuf(0)
    const b = { ...useGame.getState().buildings }
    b.redoute = { level: 4 }
    useGame.setState({ buildings: b })
    useGame.getState().upgrade('redoute')
    expect(useGame.getState().buildings.redoute.targetLevel).toBeUndefined()
  })

  it('reste sous la coupe de l’agora, comme tout édifice', () => {
    neuf(0)
    const b = { ...useGame.getState().buildings }
    b.agora = { level: 1 }
    b.redoute = { level: 1 }
    useGame.setState({ buildings: b })
    useGame.getState().upgrade('redoute')
    expect(useGame.getState().buildings.redoute.targetLevel).toBeUndefined()
  })
})
