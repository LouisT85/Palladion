import { beforeEach, describe, expect, it } from 'vitest'
import { GODS, GOD_IDS, PROD, WALL_HP } from './data'
import { FAVEURS_NEUTRES, GRACES, GRACES_TOUTES, cumulerFaveurs, dieuDe, graceSuivante } from './faveurs'
import {
  bonusFaveurs,
  coutBenediction,
  entretienHeros,
  merFermee,
  murMax,
  productionParMinute,
  useGame,
  type GameState,
} from './store'
import type { GodId } from './types'

/*
 * L'ARBRE DE FAVEUR.
 *
 * La relation à un dieu était une jauge : elle montait, elle descendait, elle
 * multipliait la bénédiction, et l'on n'en faisait jamais rien d'autre. Ce qui
 * est testé ici n'est pas la table des douze grâces - elle bougera - mais
 * l'arbitrage qu'elle installe :
 *
 *  · une grâce se PAIE en relation, donc affaiblit les bénédictions futures ;
 *  · une fois payée elle est ACQUISE, même si le dieu se refroidit ensuite ;
 *  · elle change quelque chose de MESURABLE dans le reste du jeu.
 *
 * Un bonus qui ne se lit nulle part hors de son propre fichier ne vaut rien.
 */

function jeu() {
  return useGame.getState()
}

/** met le village dans un état où un dieu donné peut tout accorder */
function comblerLeDieu(g: GodId, relation = 100): void {
  useGame.setState((s) => {
    s.buildings.temple.level = 4
    s.gods[g].relation = relation
    return s
  })
}

beforeEach(() => {
  useGame.getState().reset()
})

describe('la table des douze grâces', () => {
  it('donne trois grâces à chacun des quatre Olympiens, aux identifiants uniques', () => {
    expect(GOD_IDS.every((g) => GRACES[g].length === 3)).toBe(true)
    expect(GRACES_TOUTES).toHaveLength(12)
    expect(new Set(GRACES_TOUTES.map((g) => g.id)).size).toBe(12)
    for (const g of GRACES_TOUTES) {
      expect(g.nom.length, g.id).toBeGreaterThan(2)
      expect(g.desc.trim().length, g.id).toBeGreaterThan(30)
      expect(g.emoji.length, g.id).toBeGreaterThan(0)
      expect(dieuDe(g.id), g.id).not.toBeNull()
    }
  })

  it('renchérit à chaque cran : la troisième grâce d’un dieu coûte plus que sa première', () => {
    for (const g of GOD_IDS) {
      const [a, b, c] = GRACES[g].map((x) => x.cout)
      expect(a, g).toBeLessThan(b)
      expect(b, g).toBeLessThan(c)
      // aucune grâce ne doit être hors d'atteinte : la relation plafonne à 100
      expect(c, g).toBeLessThanOrEqual(100)
    }
  })

  it('n’oublie aucune grâce dans le cumul : chacune change au moins un chiffre', () => {
    for (const g of GRACES_TOUTES) {
      expect(cumulerFaveurs([g.id]), g.id).not.toEqual(FAVEURS_NEUTRES)
    }
    // et le cumul des douze les additionne toutes, sans en écraser une
    const tout = cumulerFaveurs(GRACES_TOUTES.map((g) => g.id))
    expect(tout.recoltePct).toBeCloseTo(0.1)
    expect(tout.remisePct).toBeCloseTo(0.25)
    expect(tout.merOuverte).toBe(true)
    expect(tout.revelerFronts).toBe(true)
  })

  it('les accorde dans l’ordre, et plus rien quand le dieu a tout donné', () => {
    expect(graceSuivante('zeus', [])?.id).toBe('zeus-1')
    expect(graceSuivante('zeus', ['zeus-1'])?.id).toBe('zeus-2')
    // une grâce d'un autre dieu ne fait pas avancer celui-ci
    expect(graceSuivante('zeus', ['ares-1', 'ares-2'])?.id).toBe('zeus-1')
    expect(graceSuivante('zeus', ['zeus-1', 'zeus-2', 'zeus-3'])).toBeNull()
  })
})

describe('acheter une grâce', () => {
  it('retranche son prix à la relation - c’est là tout l’arbitrage', () => {
    comblerLeDieu('ares', 60)
    jeu().acquerirGrace('ares-1')
    const s = jeu()
    expect(s.graces).toEqual(['ares-1'])
    // 60 − 20 : la fureur d'Arès frappera désormais moins fort qu'avant l'achat
    expect(s.gods.ares.relation).toBe(40)
  })

  it('refuse ce que la relation ne paie pas, et ne prélève alors rien', () => {
    comblerLeDieu('ares', 19)
    jeu().acquerirGrace('ares-1')
    expect(jeu().graces).toEqual([])
    expect(jeu().gods.ares.relation).toBe(19)
  })

  it('refuse de sauter un cran : la deuxième grâce attend la première', () => {
    comblerLeDieu('athena', 100)
    jeu().acquerirGrace('athena-2')
    expect(jeu().graces).toEqual([])
    expect(jeu().gods.athena.relation).toBe(100)
    jeu().acquerirGrace('athena-1')
    jeu().acquerirGrace('athena-2')
    expect(jeu().graces).toEqual(['athena-1', 'athena-2'])
  })

  it('refuse tant que le temple est trop bas pour approcher le dieu', () => {
    useGame.setState((s) => {
      s.buildings.temple.level = 1
      s.gods.ares.relation = 100
      return s
    })
    // Arès demande un temple de niveau 3
    expect(GODS.ares.temple).toBeGreaterThan(1)
    jeu().acquerirGrace('ares-1')
    expect(jeu().graces).toEqual([])
  })

  it('ne se paie pas deux fois', () => {
    comblerLeDieu('zeus', 100)
    jeu().acquerirGrace('zeus-1')
    const apres = jeu().gods.zeus.relation
    jeu().acquerirGrace('zeus-1')
    expect(jeu().graces).toEqual(['zeus-1'])
    expect(jeu().gods.zeus.relation).toBe(apres)
  })

  it('reste acquise quand le dieu se refroidit : on a versé le prix, on garde le don', () => {
    comblerLeDieu('poseidon', 100)
    jeu().acquerirGrace('poseidon-1')
    useGame.setState((s) => {
      s.gods.poseidon.relation = -100 // le dieu vous hait, désormais
      return s
    })
    expect(jeu().graces).toContain('poseidon-1')
    expect(bonusFaveurs(jeu()).murPct).toBeGreaterThan(0)
  })
})

describe('ce que les grâces changent, ailleurs que dans leur propre fichier', () => {
  /** l'état courant, avec les grâces qu'on veut, sans passer par l'achat */
  function avec(graces: string[]): GameState {
    useGame.setState((s) => {
      s.graces = graces
      return s
    })
    return useGame.getState()
  }

  it('Xenios grossit les quatre récoltes de la même part', () => {
    const sans = productionParMinute(avec([]), Date.now())
    const zx = productionParMinute(avec(['zeus-1']), Date.now())
    for (const r of ['bois', 'pierre', 'grain'] as const) {
      expect(zx[r] / sans[r], r).toBeCloseTo(1.1, 5)
    }
  })

  it('Le bras du roi fait baisser le prix de toutes les bénédictions', () => {
    const cher = avec([])
    const remise = avec(['zeus-1', 'zeus-2', 'zeus-3'])
    for (const g of GOD_IDS) {
      expect(coutBenediction(remise, g), g).toBeLessThan(coutBenediction(cher, g))
    }
  })

  it('Bâtisseur de murs épaissit l’enceinte de 15 %', () => {
    useGame.setState((s) => {
      s.buildings.remparts.level = 2
      return s
    })
    const nu = murMax(avec([]))
    expect(nu).toBe(WALL_HP[2])
    expect(murMax(avec(['poseidon-1']))).toBe(Math.round(WALL_HP[2] * 1.15))
  })

  it('Mer ouverte lève la saison morte du port : l’hiver n’enferme plus les nefs', () => {
    useGame.setState((s) => {
      s.saison = 'hiver'
      s.buildings.port.level = 2
      // le quai est la seule source de bronze ici : la cueillette de base n'en donne pas
      s.villageois = [{ id: 'v-port', nom: 'Nestor', poste: 'port', metier: 'port' }]
      return s
    })
    expect(merFermee(avec([]))).toBe(true)
    const pris = productionParMinute(avec([]), Date.now()).bronze
    expect(merFermee(avec(['poseidon-1', 'poseidon-2']))).toBe(false)
    const libre = productionParMinute(avec(['poseidon-1', 'poseidon-2']), Date.now()).bronze
    expect(libre).toBeGreaterThan(pris)
    // hors hiver, la grâce ne change évidemment rien
    useGame.setState((s) => {
      s.saison = 'ete'
      return s
    })
    expect(merFermee(avec([]))).toBe(false)
  })

  it('Faveur redoublée accélère le temple sans toucher aux récoltes', () => {
    const trois = ['athena-1', 'athena-2', 'athena-3']
    expect(bonusFaveurs(avec(trois)).faveurPct).toBeCloseTo(0.3)
    expect(bonusFaveurs(avec(trois)).recoltePct).toBe(0)
    expect(PROD.temple[1]).toBeGreaterThan(0)
  })

  it('Entretien des braves allège la table des héros', () => {
    useGame.setState((s) => {
      s.heros.hector.recrute = true
      s.heros.ulysse.recrute = true
      return s
    })
    const plein = entretienHeros(avec([]))
    expect(plein.grain).toBeGreaterThan(0)
    const allege = entretienHeros(avec(['ares-1', 'ares-2', 'ares-3']))
    expect(allege.grain).toBeCloseTo(plein.grain * 0.6, 5)
    expect(allege.faveur).toBeCloseTo(plein.faveur * 0.6, 5)
  })

  it('ne change rien du tout quand on n’a rien acheté', () => {
    expect(bonusFaveurs(avec([]))).toEqual(FAVEURS_NEUTRES)
    // et une sauvegarde antérieure à l'arbre (pas de champ `graces`) tient debout
    expect(bonusFaveurs({})).toEqual(FAVEURS_NEUTRES)
  })
})
