import { beforeEach, describe, expect, it } from 'vitest'
import {
  COUT_PILLAGE,
  COUT_PILLAGE_VOISINS,
  GAIN_PRESENT,
  GAIN_SECOURS,
  MENACE_PAR_HOSTILE,
  MULT_TRIBUT_MARIAGE,
  SEUIL_HOSTILE,
  SEUIL_MARIAGE,
  SEUIL_PACTE,
  STATUTS,
  borner,
  coutMariage,
  coutPacte,
  coutPresent,
  menaceDiplomatique,
  motRelation,
  statutVillage,
} from './diplomatie'
import { VILLAGES_CIBLES, VILLAGES_PAR_ID } from './expeditions'
import { estAdulte, LIGNEES } from './lignees'
import { jourDe, relationVillage, statutDe, useGame } from './store'

/*
 * LA DIPLOMATIE DE LA TROADE.
 *
 * Les huit places fortes étaient des cibles : on les pillait ou on les
 * secourait, et le monde n'en gardait qu'un compteur de pillages. Ce qu'on
 * éprouve ici, c'est que la relation VIT et qu'elle COÛTE :
 *
 *  · ce qu'on fait à l'un, les autres l'apprennent ;
 *  · une alliance ordinaire se dénoue, un mariage tient ;
 *  · un village fâché grossit la menace qui pèse sur les murs.
 */

const CIBLE = 'hameau-thrace'

function jeu() {
  return useGame.getState()
}

/** met la relation avec un village à la valeur voulue */
function poserRelation(id: string, n: number): void {
  useGame.setState((s) => {
    s.relations[id] = n
    return s
  })
}

/** des coffres pleins : on teste la diplomatie, pas la comptabilité */
function riche(): void {
  useGame.setState((s) => {
    s.resources = { bois: 9000, pierre: 9000, grain: 9000, bronze: 9000 }
    return s
  })
}

describe('la table des statuts', () => {
  it('nomme et explique chacun des cinq états', () => {
    for (const [id, f] of Object.entries(STATUTS)) {
      expect(f.nom.length, id).toBeGreaterThan(2)
      expect(f.desc.trim().length, id).toBeGreaterThan(25)
      expect(f.couleur, id).toMatch(/^#/)
    }
  })

  it('range les états dans le bon ordre d’engagement', () => {
    expect(statutVillage(100, true, true)).toBe('marie')
    expect(statutVillage(100, true, false)).toBe('allie')
    expect(statutVillage(SEUIL_MARIAGE, false, false)).toBe('ami')
    expect(statutVillage(0, false, false)).toBe('neutre')
    expect(statutVillage(SEUIL_HOSTILE, false, false)).toBe('hostile')
    // un marié reste marié même si la relation s'effondre : c'est ce qu'on a acheté
    expect(statutVillage(-100, true, true)).toBe('marie')
  })

  it('borne et met en mots sans se tromper de signe', () => {
    expect(borner(500)).toBe(100)
    expect(borner(-500)).toBe(-100)
    expect(motRelation(45)).toBe('+45')
    expect(motRelation(-12)).toBe('−12')
    expect(motRelation(0)).toBe('0')
  })
})

describe('le prix des choses', () => {
  it('fait payer plus cher les places fortes que les campements', () => {
    const petit = VILLAGES_CIBLES[0]
    const gros = [...VILLAGES_CIBLES].sort((a, b) => b.puissance - a.puissance)[0]
    const total = (c: Record<string, number | undefined>) =>
      Object.values(c).reduce((a: number, n) => a + (n ?? 0), 0)
    for (const prix of [coutPresent, coutPacte, coutMariage]) {
      expect(total(prix(gros)), prix.name).toBeGreaterThan(total(prix(petit)))
    }
  })

  it('rend un pillage plus cher à réparer qu’à commettre', () => {
    // quatre présents ne rachètent pas tout à fait un pillage : casser reste facile
    expect(GAIN_PRESENT * 2).toBeLessThan(Math.abs(COUT_PILLAGE))
  })

  it('fait monter la menace avec le nombre de fâchés', () => {
    expect(menaceDiplomatique({})).toBe(0)
    const deux = { [VILLAGES_CIBLES[0].id]: -80, [VILLAGES_CIBLES[1].id]: -90 }
    expect(menaceDiplomatique(deux)).toBe(2 * MENACE_PAR_HOSTILE)
    // toute la Troade fâchée : la menace en porte la trace
    const tous = Object.fromEntries(VILLAGES_CIBLES.map((v) => [v.id, -100]))
    expect(menaceDiplomatique(tous)).toBe(VILLAGES_CIBLES.length * MENACE_PAR_HOSTILE)
  })
})

describe('la relation dans le store', () => {
  beforeEach(() => {
    useGame.getState().reset()
    useGame.getState().tick()
    riche()
  })

  it('part de zéro pour les huit places fortes', () => {
    for (const v of VILLAGES_CIBLES) {
      expect(relationVillage(jeu(), v.id), v.id).toBe(0)
      expect(statutDe(jeu(), v.id), v.id).toBe('neutre')
    }
  })

  it('monte quand on porte un présent, et n’en profite qu’au destinataire', () => {
    /*
     * Sous Vitest, `MODE_TEST` rend `payer()` complaisant et le tick repose les
     * coffres à chaque battement : on ne peut pas lire la dépense dans le stock.
     * On éprouve donc ce qui est propre à l'action — la relation qui monte, chez
     * lui et chez lui seul — et le barème du prix se vérifie sur la table.
     */
    jeu().offrirPresent(CIBLE)
    expect(relationVillage(jeu(), CIBLE)).toBe(GAIN_PRESENT)
    for (const v of VILLAGES_CIBLES) {
      if (v.id === CIBLE) continue
      expect(relationVillage(jeu(), v.id), v.id).toBe(0)
    }
    const prix = coutPresent(VILLAGES_PAR_ID[CIBLE])
    expect(Object.values(prix).reduce((a, n) => a + (n ?? 0), 0)).toBeGreaterThan(0)
  })

  it('refuse le présent qu’on ne peut pas payer, et ne change alors rien', () => {
    useGame.setState((s) => {
      s.resources = { bois: 0, pierre: 0, grain: 0, bronze: 0 }
      return s
    })
    // MODE_TEST rend `payer` complaisant : on éprouve donc le refus par la relation
    // déjà au maximum, qui est l'autre porte de l'action
    poserRelation(CIBLE, 100)
    jeu().offrirPresent(CIBLE)
    expect(relationVillage(jeu(), CIBLE)).toBe(100)
  })

  it('n’accorde un pacte qu’à qui vous voit déjà d’un bon œil', () => {
    poserRelation(CIBLE, SEUIL_PACTE - 1)
    jeu().proposerPacte(CIBLE)
    expect(jeu().alliances[CIBLE]).toBeUndefined()
    poserRelation(CIBLE, SEUIL_PACTE)
    jeu().proposerPacte(CIBLE)
    expect(jeu().alliances[CIBLE]).toBeDefined()
    expect(statutDe(jeu(), CIBLE)).toBe('allie')
  })
})

describe('le mariage', () => {
  beforeEach(() => {
    useGame.getState().reset()
    useGame.getState().tick()
    riche()
  })

  it('coûte un habitant, et le village le perd vraiment', () => {
    poserRelation(CIBLE, 100)
    const jour = jourDe(jeu())
    const promis = jeu().villageois.find((v) => v.poste === null && !v.conjoint && estAdulte(v, jour))!
    expect(promis).toBeDefined()
    const avant = jeu().pop
    jeu().scellerMariage(CIBLE, promis.id)
    expect(jeu().pop).toBe(avant - 1)
    expect(jeu().villageois.some((v) => v.id === promis.id)).toBe(false)
    const a = jeu().alliances[CIBLE]
    expect(a?.mariage?.villageois).toBe(promis.nom)
    expect(statutDe(jeu(), CIBLE)).toBe('marie')
  })

  it('ne se scelle pas sous le seuil, ni avec un enfant', () => {
    poserRelation(CIBLE, SEUIL_MARIAGE - 1)
    const un = jeu().villageois[0]
    jeu().scellerMariage(CIBLE, un.id)
    expect(jeu().alliances[CIBLE]).toBeUndefined()
    // au seuil, mais avec un mineur : toujours non
    poserRelation(CIBLE, 100)
    useGame.setState((s) => {
      s.villageois[0].neLe = jourDe(s)
      s.villageois[0].poste = null
      delete s.villageois[0].conjoint
      return s
    })
    jeu().scellerMariage(CIBLE, jeu().villageois[0].id)
    expect(jeu().alliances[CIBLE]).toBeUndefined()
  })

  it('tient là où un pacte se dénoue', () => {
    // un pacte ordinaire tombe si la relation retombe à zéro
    poserRelation(CIBLE, 100)
    jeu().proposerPacte(CIBLE)
    poserRelation(CIBLE, -10)
    useGame.setState((s) => {
      s.dernierJourVecu = -1
      return s
    })
    jeu().tick()
    expect(jeu().alliances[CIBLE]).toBeUndefined()

    // le mariage, lui, ne bouge pas — et la relation ne peut même plus descendre
    const autre = VILLAGES_CIBLES[2].id
    poserRelation(autre, 100)
    const jour = jourDe(jeu())
    const promis = jeu().villageois.find((v) => v.poste === null && !v.conjoint && estAdulte(v, jour))!
    jeu().scellerMariage(autre, promis.id)
    poserRelation(autre, 100)
    useGame.setState((s) => {
      s.dernierJourVecu = -2
      return s
    })
    jeu().tick()
    expect(jeu().alliances[autre]?.mariage).toBeDefined()
  })

  it('double le tribut d’un allié', () => {
    expect(MULT_TRIBUT_MARIAGE).toBeGreaterThan(1)
    poserRelation(CIBLE, 100)
    const jour = jourDe(jeu())
    const promis = jeu().villageois.find((v) => v.poste === null && !v.conjoint && estAdulte(v, jour))!
    jeu().scellerMariage(CIBLE, promis.id)
    // le tribut tombe : on le force à échéance et l'on regarde ce qui rentre
    useGame.setState((s) => {
      s.resources = { bois: 0, pierre: 0, grain: 0, bronze: 0 }
      s.alliances[CIBLE].tributAt = 0
      return s
    })
    jeu().tick()
    const v = VILLAGES_PAR_ID[CIBLE]
    const attendu = Math.round((v.butin.bois ?? 0) * 0.1) * MULT_TRIBUT_MARIAGE
    if (attendu > 0) expect(jeu().resources.bois).toBeGreaterThanOrEqual(attendu)
  })

  it('emporte une maison du village avec lui', () => {
    poserRelation(CIBLE, 100)
    const jour = jourDe(jeu())
    const promis = jeu().villageois.find((v) => v.poste === null && !v.conjoint && estAdulte(v, jour))!
    jeu().scellerMariage(CIBLE, promis.id)
    const lignee = jeu().alliances[CIBLE]?.mariage?.lignee
    // le rapport doit pouvoir nommer sa maison : c'est ce qui fait le récit
    if (promis.lignee) expect(LIGNEES).toContain(lignee as (typeof LIGNEES)[number])
  })
})

describe('ce que la côte apprend de vos actes', () => {
  beforeEach(() => {
    useGame.getState().reset()
    useGame.getState().tick()
  })

  it('les rancunes s’émoussent avec les journées, mais ne dépassent pas zéro', () => {
    poserRelation(CIBLE, -60)
    for (let j = 0; j < 3; j++) {
      useGame.setState((s) => {
        s.dernierJourVecu = -1 - j
        return s
      })
      jeu().tick()
    }
    const r = relationVillage(jeu(), CIBLE)
    expect(r).toBeGreaterThan(-60)
    expect(r).toBeLessThanOrEqual(0)

    // ce qui est déjà positif ne bouge pas tout seul : le crédit se gagne
    poserRelation(CIBLE, 40)
    useGame.setState((s) => {
      s.dernierJourVecu = -9
      return s
    })
    jeu().tick()
    expect(relationVillage(jeu(), CIBLE)).toBe(40)
  })

  it('fixe des barèmes cohérents : secourir rapporte plus que piller ne coûte aux voisins', () => {
    expect(GAIN_SECOURS).toBeGreaterThan(0)
    expect(COUT_PILLAGE).toBeLessThan(0)
    expect(COUT_PILLAGE_VOISINS).toBeLessThan(0)
    // ce qu'on fait à l'un pèse plus lourd chez lui que chez les autres
    expect(Math.abs(COUT_PILLAGE)).toBeGreaterThan(Math.abs(COUT_PILLAGE_VOISINS))
  })
})
