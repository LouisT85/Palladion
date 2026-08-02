import { beforeEach, describe, expect, it } from 'vitest'
import { GRAPHES, MAX_RELEVES, PAS_RELEVE_MS, bornes, motPente, pente, serie, type Releve } from './annales'
import { TICK_MS } from './data'
import { useGame } from './store'

/*
 * LES ANNALES.
 *
 * Le jeu ne gardait aucune mémoire chiffrée de lui-même : le journal racontait
 * des faits, jamais des tendances. Ce qu'on vérifie ici n'est pas la beauté des
 * courbes - c'est qu'elles existent, qu'elles ne mentent pas sur le sens de la
 * pente, et surtout que le tableau reste BORNÉ : une sauvegarde n'a pas à
 * grossir sans fin parce qu'on laisse l'onglet ouvert une nuit.
 */

function releve(t: number, champs: Partial<Releve> = {}): Releve {
  return {
    t,
    jour: 1,
    bois: 0,
    pierre: 0,
    grain: 0,
    bronze: 0,
    faveur: 0,
    pop: 0,
    armee: 0,
    menace: 0,
    ambiance: 0,
    mur: 0,
    prestige: 0,
    ...champs,
  }
}

describe('les graphes proposés', () => {
  it('portent tous un titre, une lecture et au moins une série', () => {
    expect(GRAPHES.length).toBeGreaterThanOrEqual(3)
    expect(new Set(GRAPHES.map((g) => g.id)).size).toBe(GRAPHES.length)
    for (const g of GRAPHES) {
      expect(g.series.length, g.id).toBeGreaterThan(0)
      // un tracé qu'on ne sait pas lire ne vaut pas mieux qu'un ornement
      expect(g.lecture.trim().length, g.id).toBeGreaterThan(40)
      const couleurs = g.series.map((x) => x.couleur)
      expect(new Set(couleurs).size, g.id).toBe(couleurs.length)
    }
  })

  it('ne trace que des champs réellement relevés', () => {
    const vide = releve(0)
    for (const g of GRAPHES) {
      for (const s of g.series) expect(vide[s.cle], `${g.id}/${s.cle}`).toBeDefined()
    }
  })
})

describe('lire une série', () => {
  const suite = [releve(0, { bois: 10 }), releve(60_000, { bois: 40 }), releve(120_000, { bois: 100 })]

  it('rend les valeurs dans l’ordre du temps', () => {
    expect(serie(suite, 'bois')).toEqual([10, 40, 100])
  })

  it('dit la pente par minute, du bon signe', () => {
    // 10 → 100 en deux minutes : +45 par minute
    expect(pente(suite, 'bois')).toBeCloseTo(45)
    const chute = [releve(0, { grain: 200 }), releve(60_000, { grain: 140 })]
    expect(pente(chute, 'grain')).toBeCloseTo(-60)
    // un seul point ne dit aucune tendance : surtout pas « ça monte »
    expect(pente([releve(0, { bois: 5 })], 'bois')).toBe(0)
    expect(pente([], 'bois')).toBe(0)
  })

  it('met la pente en mots sans se tromper de sens', () => {
    expect(motPente(0)).toBe('stable')
    expect(motPente(0.01)).toBe('stable')
    expect(motPente(12.4)).toContain('+')
    expect(motPente(-3)).toContain('−')
  })

  it('borne l’échelle au contenu, ou au plafond imposé', () => {
    const series = GRAPHES[0].series
    const b = bornes([releve(0, { bois: 37 }), releve(1, { pierre: 210 })], series)
    expect(b.bas).toBe(0)
    expect(b.haut).toBeGreaterThanOrEqual(210)
    // jamais un plafond nul : une courbe plate à zéro doit rester lisible
    expect(bornes([releve(0)], series).haut).toBeGreaterThan(0)
    expect(bornes([releve(0, { bois: 900 })], series, 100).haut).toBe(100)
  })
})

describe('les scribes du village', () => {
  beforeEach(() => {
    useGame.getState().reset()
  })

  it('ne relèvent rien avant l’heure, puis relèvent', () => {
    const jeu = () => useGame.getState()
    expect(jeu().annales).toEqual([])
    jeu().tick()
    expect(jeu().annales).toHaveLength(0)
    // on avance l'échéance : le battement suivant doit consigner
    useGame.setState((s) => {
      s.prochainReleveAt = Date.now() - 1
      return s
    })
    jeu().tick()
    expect(jeu().annales).toHaveLength(1)
    const r = jeu().annales[0]
    expect(r.jour).toBeGreaterThanOrEqual(1)
    expect(r.pop).toBe(jeu().pop)
    expect(r.menace).toBe(Math.round(jeu().threat))
    // et l'échéance repart pour un pas complet
    expect(jeu().prochainReleveAt).toBeGreaterThan(Date.now() + PAS_RELEVE_MS - TICK_MS - 50)
  })

  it('gardent le tableau borné : le règne le plus long ne fait pas enfler la sauvegarde', () => {
    useGame.setState((s) => {
      // on pose un tableau déjà plein à ras bord, aux valeurs reconnaissables
      s.annales = Array.from({ length: MAX_RELEVES }, (_, i) => releve(i, { bois: i }))
      s.prochainReleveAt = Date.now() - 1
      return s
    })
    useGame.getState().tick()
    const a = useGame.getState().annales
    expect(a).toHaveLength(MAX_RELEVES)
    // c'est le plus VIEUX qu'on oublie, jamais le plus récent
    expect(a[0].bois).toBe(1)
    expect(a[a.length - 1].t).toBeGreaterThan(1e6)
  })

  it('n’écrivent que des entiers : une courbe ne se lit pas au dixième près', () => {
    useGame.setState((s) => {
      s.resources.grain = 123.456
      s.morale = 61.7
      s.prochainReleveAt = Date.now() - 1
      return s
    })
    useGame.getState().tick()
    const r = useGame.getState().annales[0]
    expect(Number.isInteger(r.grain)).toBe(true)
    expect(Number.isInteger(r.ambiance)).toBe(true)
    expect(Number.isInteger(r.mur)).toBe(true)
  })

  it('survivent à une sauvegarde antérieure aux annales', () => {
    /*
     * Un vieux fichier n'a ni `annales` ni `prochainReleveAt`. `init()` fusionne
     * l'état initial avec ce qu'il lit : les deux champs doivent donc survivre à
     * l'absence, et le tick ne pas planter sur un tableau inexistant.
     */
    localStorage.setItem(
      'palladion-save-v1',
      JSON.stringify({ lastSeen: Date.now(), pop: 9, resources: { bois: 1, pierre: 1, grain: 1, bronze: 1 } }),
    )
    useGame.getState().init()
    expect(Array.isArray(useGame.getState().annales)).toBe(true)
    expect(useGame.getState().prochainReleveAt).toBeGreaterThan(0)
    useGame.getState().tick()
    expect(useGame.getState().annales.length).toBeGreaterThanOrEqual(0)
    localStorage.removeItem('palladion-save-v1')
  })
})
