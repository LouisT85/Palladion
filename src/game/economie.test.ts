import { describe, expect, it } from 'vitest'
import { LOT_ECHANGE, MARGE_PORT, VALEUR_RES, coutEchange, metierManquant, METIERS_DEPART, POIDS_METIERS } from './data'
import type { BuildingId, ResourceId } from './types'

/*
 * Premier filet de sécurité du projet. On commence par ce qui se teste sans le
 * navigateur ni le store : des fonctions pures dont une erreur se paierait en
 * équilibrage - le comptoir du port et le tirage des métiers.
 */

describe('comptoir du port', () => {
  const RES: ResourceId[] = ['bois', 'pierre', 'grain', 'bronze']

  it('facture le lot à sa valeur, marge comprise', () => {
    // 10 bronze = 40 unités de valeur ; au petit quai la marge est de 1,7
    expect(coutEchange(1, 'bois', 'bronze')).toBe(Math.ceil(10 * 4 * 1.7))
    // et l'inverse est bon marché : 10 bois ne valent que 2,5 bronze avant marge
    expect(coutEchange(1, 'bronze', 'bois')).toBe(Math.ceil((10 * 1 * 1.7) / 4))
  })

  it('ne laisse jamais fabriquer de la valeur par aller-retour', () => {
    for (let niveau = 1; niveau <= 4; niveau++) {
      for (const a of RES) {
        for (const b of RES) {
          if (a === b) continue
          const donne = coutEchange(niveau, a, b)
          // on rend `donne` de a contre LOT de b : la valeur reçue doit rester
          // inférieure à la valeur cédée, sinon le comptoir est une planche à billets
          expect(LOT_ECHANGE * VALEUR_RES[b]).toBeLessThan(donne * VALEUR_RES[a])
        }
      }
    }
  })

  it('devient plus honnête à chaque niveau de port', () => {
    const couts = [1, 2, 3, 4].map((n) => coutEchange(n, 'bois', 'bronze'))
    for (let i = 1; i < couts.length; i++) expect(couts[i]).toBeLessThan(couts[i - 1])
    expect(MARGE_PORT[4]).toBeLessThan(MARGE_PORT[1])
  })

  it('ne propose rien sans port', () => {
    expect(coutEchange(0, 'bois', 'bronze')).toBe(0)
  })
})

describe('métiers des habitants', () => {
  it('couvre les six métiers dès la fournée de départ', () => {
    const attendus = POIDS_METIERS.map((m) => m.id).sort()
    expect([...new Set(METIERS_DEPART)].sort()).toEqual(attendus)
    expect(METIERS_DEPART).toHaveLength(7)
  })

  it('comble toujours le métier le plus en retard', () => {
    // un village entièrement paysan doit produire autre chose qu'un paysan
    const paysans: BuildingId[] = Array.from({ length: 6 }, () => 'ferme')
    expect(metierManquant(paysans)).not.toBe('ferme')
  })

  it('tend vers les poids annoncés sur un grand village', () => {
    const deja: BuildingId[] = []
    for (let i = 0; i < 100; i++) deja.push(metierManquant(deja))
    const somme = POIDS_METIERS.reduce((a, m) => a + m.poids, 0)
    for (const m of POIDS_METIERS) {
      const part = deja.filter((x) => x === m.id).length
      // à une unité près de l'arrondi : la répartition suit la table des poids
      expect(Math.abs(part - (m.poids / somme) * 100)).toBeLessThanOrEqual(1.5)
    }
  })
})
