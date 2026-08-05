import { describe, expect, it } from 'vitest'
import { VILLAGES_CIBLES } from './expeditions'
import {
  CHANCE_RARETE,
  NOM_RARETE,
  RELIQUES,
  RELIQUES_NEUTRES,
  RELIQUE_PAR_ID,
  butinRelique,
  effetsCumules,
  lieuDe,
  nichesLibres,
  nichesTemple,
  peutExposer,
  reliquesDuVillage,
  vitrineEffective,
  type EffetsReliques,
  type RareteRelique,
} from './reliques'

/*
 * LES RELIQUES.
 *
 * Ce qui compte n'est pas la table des douze objets - elle s'allongera - mais la
 * CONTRAINTE qu'elle installe :
 *
 *  · une relique non exposée ne fait RIEN. Elle est dans un coffre ;
 *  · le temple compte ses niches (2/3/4/6) et l'on ne peut jamais tout montrer,
 *    donc on arbitre. Un test le vérifie sur les effets EFFECTIVEMENT cumulés, pas
 *    sur un compteur : si les niches ne coupaient rien, elles ne seraient qu'un
 *    ornement d'interface ;
 *  · les rares se gagnent. Le Palladion ne sort pas du premier raid.
 */

const ROLLS = Array.from({ length: 60 }, (_, i) => i / 60)
const CLES = Object.keys(RELIQUES_NEUTRES) as (keyof EffetsReliques)[]

describe('la table des douze reliques', () => {
  it('en compte douze, aux identifiants uniques et retrouvables', () => {
    expect(RELIQUES).toHaveLength(12)
    expect(new Set(RELIQUES.map((r) => r.id)).size).toBe(12)
    for (const r of RELIQUES) expect(RELIQUE_PAR_ID[r.id], r.id).toBe(r)
  })

  it('décrit chacune : un nom, un emoji, deux phrases d’histoire, un effet lisible', () => {
    for (const r of RELIQUES) {
      expect(r.nom.trim().length, r.id).toBeGreaterThan(4)
      expect(r.emoji.length, r.id).toBeGreaterThan(0)
      expect(r.desc.trim().length, r.id).toBeGreaterThan(60)
      expect(r.effet.trim().length, r.id).toBeGreaterThan(6)
      expect(NOM_RARETE[r.rarete], r.id).toBeTruthy()
    }
  })

  it('les rattache toutes à une place forte réelle de la Troade', () => {
    const ids = new Set(VILLAGES_CIBLES.map((v) => v.id))
    for (const r of RELIQUES) {
      expect(ids.has(r.village), `${r.id} → ${r.village}`).toBe(true)
      expect(lieuDe(r.id), r.id).toBe(VILLAGES_CIBLES.find((v) => v.id === r.village)!.nom)
    }
    // aucune place forte n'est stérile : chacune cache quelque chose
    for (const v of VILLAGES_CIBLES) expect(reliquesDuVillage(v.id).length, v.id).toBeGreaterThan(0)
  })

  it('n’accorde que des effets modestes, mais jamais nuls', () => {
    for (const r of RELIQUES) {
      const paires = Object.entries(r.bonus) as [keyof EffetsReliques, number][]
      expect(paires.length, r.id).toBeGreaterThan(0)
      for (const [k, v] of paires) {
        expect(CLES, `${r.id}/${k}`).toContain(k)
        expect(v, `${r.id}/${k}`).toBeGreaterThan(0)
        expect(v, `${r.id}/${k}`).toBeLessThanOrEqual(0.15)
      }
    }
  })

  it('cache les rares derrière les étoiles, et les communes à portée du premier raid', () => {
    for (const r of RELIQUES) {
      expect(r.etoiles, r.id).toBeGreaterThanOrEqual(1)
      expect(r.etoiles, r.id).toBeLessThanOrEqual(3)
      if (r.rarete === 'sacree') expect(r.etoiles, r.id).toBe(3)
    }
    const chances: RareteRelique[] = ['commune', 'insigne', 'sacree']
    for (let i = 1; i < chances.length; i++) {
      expect(CHANCE_RARETE[chances[i]]).toBeLessThan(CHANCE_RARETE[chances[i - 1]])
    }
  })

  it('couvre plusieurs façons de jouer : récolte, mur, ferveur, guerre, butin', () => {
    const touchees = new Set(RELIQUES.flatMap((r) => Object.keys(r.bonus)))
    for (const k of ['grainPct', 'murPct', 'faveurPct', 'degatsPct', 'butinPct']) {
      expect(touchees.has(k), k).toBe(true)
    }
  })
})

describe('les niches du temple', () => {
  it('n’offre aucune niche sans temple, puis 2, 3, 4 et 6', () => {
    expect(nichesTemple(0)).toBe(0)
    expect(nichesTemple(1)).toBe(2)
    expect(nichesTemple(2)).toBe(3)
    expect(nichesTemple(3)).toBe(4)
    expect(nichesTemple(4)).toBe(6)
  })

  it('ne permet jamais de tout exposer, même au temple achevé', () => {
    expect(nichesTemple(4)).toBeLessThan(RELIQUES.length)
  })

  it('encaisse un niveau aberrant sans exploser', () => {
    expect(nichesTemple(-3)).toBe(0)
    expect(nichesTemple(99)).toBe(6)
    expect(nichesTemple(2.7)).toBe(3)
  })

  it('compte les niches libres et refuse d’exposer quand la vitrine est pleine', () => {
    const deux = [RELIQUES[0].id, RELIQUES[1].id]
    expect(nichesLibres(deux, 1)).toBe(0)
    expect(nichesLibres(deux, 2)).toBe(1)
    expect(peutExposer(RELIQUES[2].id, deux, 1)).toBe(false)
    expect(peutExposer(RELIQUES[2].id, deux, 2)).toBe(true)
  })

  it('refuse d’exposer deux fois la même relique, ou une relique inconnue', () => {
    expect(peutExposer(RELIQUES[0].id, [RELIQUES[0].id], 4)).toBe(false)
    expect(peutExposer('bouclier-de-personne', [], 4)).toBe(false)
  })
})

describe('les niches limitent réellement les effets cumulés', () => {
  it('ne compte rien pour une relique possédée mais laissée au coffre', () => {
    expect(effetsCumules([])).toEqual(RELIQUES_NEUTRES)
  })

  it('coupe la vitrine au nombre de niches, et les effets avec', () => {
    const toutes = RELIQUES.map((r) => r.id)
    const complet = effetsCumules(toutes)
    for (const niveau of [1, 2, 3, 4]) {
      const vitrine = vitrineEffective(toutes, niveau)
      expect(vitrine.length, `temple ${niveau}`).toBe(nichesTemple(niveau))
      const partiel = effetsCumules(vitrine)
      const sommePartielle = CLES.reduce((a, k) => a + partiel[k], 0)
      const sommeComplete = CLES.reduce((a, k) => a + complet[k], 0)
      expect(sommePartielle, `temple ${niveau}`).toBeLessThan(sommeComplete)
      expect(sommePartielle, `temple ${niveau}`).toBeGreaterThan(0)
    }
  })

  it('ne rend RIEN du tout sans temple, même avec les douze reliques en réserve', () => {
    const vitrine = vitrineEffective(RELIQUES.map((r) => r.id), 0)
    expect(vitrine).toEqual([])
    expect(effetsCumules(vitrine)).toEqual(RELIQUES_NEUTRES)
  })

  it('cumule bien deux reliques qui touchent le même levier', () => {
    const a = effetsCumules(['cendre-ilos'])
    const b = effetsCumules(['cendre-ilos', 'fragment-palladion'])
    expect(b.structurePct).toBeCloseTo(a.structurePct + 0.1, 6)
    expect(b.murPct).toBeCloseTo(0.1, 6)
  })

  it('ignore en silence un identifiant inconnu plutôt que de casser une sauvegarde', () => {
    expect(effetsCumules(['relique-d-une-autre-version'])).toEqual(RELIQUES_NEUTRES)
    expect(effetsCumules(['coupe-nestor', 'chimere']).grainPct).toBeCloseTo(0.12, 6)
    expect(vitrineEffective(['chimere', 'coupe-nestor'], 4)).toEqual(['coupe-nestor'])
  })

  it('donne, à six niches bien garnies, un gain réel mais pas un doublement', () => {
    const meilleures = ['fragment-palladion', 'pointe-achille', 'voile-helene', 'coupe-nestor', 'os-pelops', 'planche-argo']
    const e = effetsCumules(meilleures)
    for (const k of CLES) {
      expect(e[k], k).toBeLessThanOrEqual(0.3)
      expect(e[k], k).toBeGreaterThanOrEqual(0)
    }
    expect(CLES.reduce((a, k) => a + e[k], 0)).toBeGreaterThan(0.5)
  })
})

describe('ce qu’un raid rapporte', () => {
  it('ne rend jamais rien pour un village qui n’existe pas', () => {
    for (const roll of ROLLS) expect(butinRelique('nulle-part', 3, roll)).toBeNull()
  })

  it('ne rend jamais une relique d’un autre village', () => {
    for (const v of VILLAGES_CIBLES) {
      for (const roll of ROLLS) {
        const id = butinRelique(v.id, 3, roll)
        if (id) expect(RELIQUE_PAR_ID[id].village, `${v.id} → ${id}`).toBe(v.id)
      }
    }
  })

  it('ne donne pas les rares à qui n’a pas soumis la place', () => {
    for (const v of VILLAGES_CIBLES) {
      for (const etoiles of [0, 1, 2, 3]) {
        for (const roll of ROLLS) {
          const id = butinRelique(v.id, etoiles, roll)
          if (id) expect(RELIQUE_PAR_ID[id].etoiles, `${id} à ${etoiles} étoiles`).toBeLessThanOrEqual(etoiles)
        }
      }
    }
    // sans une seule étoile, aucun village ne rend rien
    for (const v of VILLAGES_CIBLES) {
      for (const roll of ROLLS) expect(butinRelique(v.id, 0, roll)).toBeNull()
    }
  })

  it('finit par rendre chacune des douze reliques, à qui a trois étoiles partout', () => {
    const vus = new Set<string>()
    for (const v of VILLAGES_CIBLES) {
      for (const roll of ROLLS) {
        const id = butinRelique(v.id, 3, roll)
        if (id) vus.add(id)
      }
    }
    expect(vus.size).toBe(12)
  })

  it('ne redonne jamais une relique déjà au coffre', () => {
    const v = 'camp-pillards'
    const deja = reliquesDuVillage(v).map((r) => r.id)
    for (const roll of ROLLS) expect(butinRelique(v, 3, roll, deja)).toBeNull()
    // et l'autre reste accessible quand on n'en possède qu'une
    const restants = new Set(ROLLS.map((r) => butinRelique(v, 3, r, [deja[0]])).filter(Boolean))
    expect(restants.has(deja[0])).toBe(false)
    expect(restants.size).toBe(1)
  })

  it('reste une exception : la plupart des raids ne rapportent aucune relique', () => {
    let avec = 0
    let total = 0
    for (const v of VILLAGES_CIBLES) {
      for (const roll of ROLLS) {
        total++
        if (butinRelique(v.id, 3, roll)) avec++
      }
    }
    expect(avec / total).toBeGreaterThan(0.1)
    expect(avec / total).toBeLessThan(0.6)
  })

  it('encaisse un roll aberrant sans jeter', () => {
    expect(() => butinRelique('camp-pillards', 3, -1)).not.toThrow()
    expect(() => butinRelique('camp-pillards', 3, 42)).not.toThrow()
    expect(butinRelique('camp-pillards', 3, -1)).not.toBeNull()
  })
})
