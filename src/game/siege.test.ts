import { describe, expect, it } from 'vitest'
import { budgetVague, tailleVague } from './combat'
import { ENEMIES } from './data'
import {
  DUREE_REF_MS,
  INTERVALLE_CHAMPION,
  RANGS_SIEGE,
  REGLES_SIEGE,
  REPIT_MIN_MS,
  apresVague,
  budgetSiege,
  championSiege,
  cloreSiege,
  demarrerSiege,
  frontsSiege,
  lancerVague,
  pointsVague,
  prochainRang,
  rangSiege,
  repitApres,
  vagueSiege,
} from './siege'
import type { EnemyId } from './types'

/*
 * Ce que ces tests verrouillent, c'est la PROMESSE du mode : une difficulté qui
 * monte sans jamais retomber, un répit qui rétrécit sans jamais s'annuler, et un
 * score qui dit quelque chose du jeu qu'on a joué.
 */

const VAGUES = Array.from({ length: 20 }, (_, i) => i + 1)

describe('composition des vagues', () => {
  it('est déterministe - deux appels donnent la même vague', () => {
    expect(vagueSiege(11)).toEqual(vagueSiege(11))
  })

  it('la première vague n’est que des pillards', () => {
    const { wave } = vagueSiege(1)
    expect(wave.every((w) => w.enemy === 'pillard')).toBe(true)
    expect(tailleVague(wave)).toBeGreaterThanOrEqual(4)
  })

  it('le budget cible croît strictement sur vingt vagues', () => {
    for (const n of VAGUES.slice(1)) expect(budgetSiege(n)).toBeGreaterThan(budgetSiege(n - 1))
  })

  it('le budget RÉEL des vagues est monotone non décroissant sur vingt vagues', () => {
    let precedent = 0
    for (const n of VAGUES) {
      const b = budgetVague(vagueSiege(n).wave)
      expect(b).toBeGreaterThanOrEqual(precedent)
      precedent = b
    }
  })

  it('le budget réel colle à la cible - un pillard près en dessous, un bélier près au-dessus', () => {
    for (const n of VAGUES) {
      const b = budgetVague(vagueSiege(n).wave)
      // la monnaie des arrondis part en pillards ; seul un assaillant GARANTI
      // par le palier (le bélier de la vague 8) peut faire dépasser la cible
      if (b <= budgetSiege(n)) expect(budgetSiege(n) - b).toBeLessThan(ENEMIES.pillard.budget)
      else expect(b - budgetSiege(n)).toBeLessThanOrEqual(ENEMIES.belier.budget)
    }
  })

  it('les guerriers achéens paraissent à la troisième vague, pas avant', () => {
    expect(contient(2, 'guerrier')).toBe(false)
    expect(contient(3, 'guerrier')).toBe(true)
  })

  it('les mercenaires paraissent à la sixième vague, pas avant', () => {
    expect(contient(5, 'mercenaire')).toBe(false)
    expect(contient(6, 'mercenaire')).toBe(true)
  })

  it('les béliers paraissent à la huitième vague, pas avant', () => {
    expect(contient(7, 'belier')).toBe(false)
    expect(contient(8, 'belier')).toBe(true)
  })

  it('un type d’assaillant apparu ne disparaît plus jamais', () => {
    for (const type of ['guerrier', 'mercenaire', 'belier'] as EnemyId[]) {
      const premiere = VAGUES.find((n) => contient(n, type))!
      for (const n of VAGUES.filter((x) => x >= premiere)) expect(contient(n, type)).toBe(true)
    }
  })

  it('la vague 12 est plus lourde que la vague 9, en budget comme en nombre', () => {
    expect(budgetVague(vagueSiege(12).wave)).toBeGreaterThan(budgetVague(vagueSiege(9).wave))
    expect(tailleVague(vagueSiege(12).wave)).toBeGreaterThan(tailleVague(vagueSiege(9).wave))
  })

  it('l’annonce nomme la vague et les fronts', () => {
    expect(vagueSiege(4).annonce).toContain('Vague 4')
    expect(vagueSiege(4).annonce).toContain('deux fronts')
    expect(vagueSiege(1).annonce).toContain('un front')
  })
})

function contient(n: number, type: EnemyId): boolean {
  return vagueSiege(n).wave.some((w) => w.enemy === type && w.count > 0)
}

describe('fronts', () => {
  it('passe de un à trois, sans jamais redescendre', () => {
    let precedent = 0
    for (const n of VAGUES) {
      const f = frontsSiege(n)
      expect(f).toBeGreaterThanOrEqual(precedent)
      precedent = f
    }
    expect(frontsSiege(1)).toBe(1)
    expect(frontsSiege(4)).toBe(2)
    expect(frontsSiege(9)).toBe(3)
    expect(frontsSiege(30)).toBe(3)
  })

  it('vagueSiege rend le même nombre de fronts que frontsSiege', () => {
    for (const n of VAGUES) expect(vagueSiege(n).fronts).toBe(frontsSiege(n))
  })
})

describe('champions achéens', () => {
  it('un nom mène la colonne toutes les cinq vagues, et seulement là', () => {
    for (const n of VAGUES) {
      const attendu = n % INTERVALLE_CHAMPION === 0
      expect(championSiege(n) !== null).toBe(attendu)
    }
  })

  it('le premier champion est le moins exigeant, le quatrième plus redoutable', () => {
    const c5 = championSiege(5)!
    const c20 = championSiege(20)!
    expect(c5.menaceMin).toBeLessThan(c20.menaceMin)
  })

  it('vagueSiege annonce le champion et son cri de guerre', () => {
    const v = vagueSiege(10)
    expect(v.champion).toBe(championSiege(10)!.id)
    expect(v.annonce).toContain(championSiege(10)!.titre)
    expect(vagueSiege(9).champion).toBeNull()
  })

  it('les huit noms passent avant que la liste ne recommence', () => {
    const ids = Array.from({ length: 8 }, (_, i) => championSiege((i + 1) * INTERVALLE_CHAMPION)!.id)
    expect(new Set(ids).size).toBe(8)
    expect(championSiege(9 * INTERVALLE_CHAMPION)!.id).toBe(ids[0])
  })
})

describe('répit', () => {
  it('décroît d’une vague à l’autre sans jamais s’annuler', () => {
    for (const n of VAGUES) {
      expect(repitApres(n)).toBeGreaterThanOrEqual(REPIT_MIN_MS)
      expect(repitApres(n)).toBeLessThanOrEqual(repitApres(n - 1))
    }
  })

  it('est généreux au début et plafonné au plancher ensuite', () => {
    expect(repitApres(1)).toBeGreaterThan(60_000)
    expect(repitApres(40)).toBe(REPIT_MIN_MS)
  })
})

describe('score', () => {
  it('une vague tardive vaut plus qu’une vague précoce', () => {
    expect(pointsVague(10, 0, 30_000)).toBeGreaterThan(pointsVague(3, 0, 30_000))
  })

  it('récompense la vitesse', () => {
    expect(pointsVague(6, 0, 10_000)).toBeGreaterThan(pointsVague(6, 0, 70_000))
    expect(pointsVague(6, 0, DUREE_REF_MS)).toBe(pointsVague(6, 0, 5 * DUREE_REF_MS))
  })

  it('pénalise les pertes', () => {
    expect(pointsVague(5, 10, 40_000)).toBeLessThan(pointsVague(5, 3, 40_000))
  })

  it('ne rend jamais de points négatifs', () => {
    expect(pointsVague(1, 500, 300_000)).toBe(0)
  })
})

describe('rangs', () => {
  it('les huit paliers sont ordonnés', () => {
    expect(RANGS_SIEGE).toHaveLength(8)
    for (let i = 1; i < RANGS_SIEGE.length; i++) {
      expect(RANGS_SIEGE[i].seuil).toBeGreaterThan(RANGS_SIEGE[i - 1].seuil)
    }
  })

  it('chaque seuil donne exactement son titre', () => {
    for (const r of RANGS_SIEGE) expect(rangSiege(r.seuil)).toBe(r.titre)
    expect(rangSiege(RANGS_SIEGE[3].seuil - 1)).toBe(RANGS_SIEGE[2].titre)
  })

  it('le sommet est atteignable : trente vagues propres le dépassent', () => {
    let points = 0
    for (let n = 1; n <= 30; n++) points += pointsVague(n, 0, 40_000)
    expect(points).toBeGreaterThan(RANGS_SIEGE[7].seuil)
    expect(rangSiege(points)).toBe(RANGS_SIEGE[7].titre)
  })

  it('prochainRang dit ce qui manque, et se taît au sommet', () => {
    const p = prochainRang(0)!
    expect(p.titre).toBe(RANGS_SIEGE[1].titre)
    expect(p.manque).toBe(RANGS_SIEGE[1].seuil)
    expect(prochainRang(RANGS_SIEGE[7].seuil)).toBeNull()
  })
})

describe('déroulé d’un siège', () => {
  it('démarre sur un répit, sans vague ni point', () => {
    const e = demarrerSiege(1000, 7)
    expect(e.vague).toBe(0)
    expect(e.points).toBe(0)
    expect(e.record).toBe(7)
    expect(e.prochaineAt).toBe(1000 + REGLES_SIEGE.premierRepitMs)
  })

  it('lancer une vague suspend le compte à rebours', () => {
    const e = lancerVague(demarrerSiege(0))
    expect(e.vague).toBe(1)
    expect(e.prochaineAt).toBe(Number.POSITIVE_INFINITY)
  })

  it('une vague repoussée crédite les points et rouvre le répit', () => {
    const e = apresVague(lancerVague(demarrerSiege(0)), 2, 30_000, 500_000)
    expect(e.tenues).toBe(1)
    expect(e.pertes).toBe(2)
    expect(e.points).toBe(pointsVague(1, 2, 30_000))
    expect(e.repit).toBe(repitApres(1))
    expect(e.prochaineAt).toBe(500_000 + repitApres(1))
  })

  it('les points et les pertes s’accumulent de vague en vague', () => {
    let e = demarrerSiege(0)
    for (let n = 1; n <= 4; n++) e = apresVague(lancerVague(e), 1, 50_000, n * 100_000)
    expect(e.vague).toBe(4)
    expect(e.tenues).toBe(4)
    expect(e.pertes).toBe(4)
    expect(e.points).toBeGreaterThan(pointsVague(4, 1, 50_000))
  })

  it('clore le siège bat le record quand on a fait mieux', () => {
    let e = demarrerSiege(0, 2)
    for (let n = 1; n <= 5; n++) e = apresVague(lancerVague(e), 0, 20_000, n * 100_000)
    const fin = cloreSiege(e)
    expect(fin.fini).toBe(true)
    expect(fin.record).toBe(5)
  })

  it('clore le siège garde l’ancien record quand on a fait moins bien', () => {
    const fin = cloreSiege(apresVague(lancerVague(demarrerSiege(0, 12)), 0, 20_000, 100_000))
    expect(fin.record).toBe(12)
  })
})

describe('règles du mode', () => {
  it('coupe dilemmes et expéditions, double la production', () => {
    expect(REGLES_SIEGE.dilemmes).toBe(false)
    expect(REGLES_SIEGE.expeditions).toBe(false)
    expect(REGLES_SIEGE.productionMult).toBe(2)
  })

  it('part avec plus de ressources que le bac à sable', () => {
    expect(REGLES_SIEGE.ressourcesDepart.bois).toBeGreaterThan(330)
    expect(REGLES_SIEGE.ressourcesDepart.pierre).toBeGreaterThan(180)
    expect(REGLES_SIEGE.premierRepitMs).toBeGreaterThan(REPIT_MIN_MS)
  })
})
