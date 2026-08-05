import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GODS, GOD_IDS } from '../../game/data'
import { Pantheon } from './Pantheon'
import { monter, poser, reinitialiser, type Montage } from '../test-utils'

/*
 * LE PANTHÉON.
 *
 * La relation à un dieu ne paie rien : elle MULTIPLIE. Tout le sel de la ferveur
 * tient donc dans l'écran qui la montre - le mot du palier, la puissance
 * chiffrée qu'on obtiendra vraiment, et la porte fermée d'un dieu dont le temple
 * est trop bas. Un chiffre théorique affiché là serait un mensonge.
 */

let m: Montage | null = null

beforeEach(() => reinitialiser())
afterEach(() => {
  m?.demonter()
  m = null
  reinitialiser()
})

/** l'état des quatre dieux, avec la relation posée sur celui qu'on observe */
function dieux(relations: Partial<Record<(typeof GOD_IDS)[number], number>>) {
  const out = {} as Record<(typeof GOD_IDS)[number], { relation: number; cooldownUntil: number }>
  for (const g of GOD_IDS) out[g] = { relation: relations[g] ?? 0, cooldownUntil: 0 }
  return out as never
}

/** la carte d'un dieu, repérée par son nom affiché */
function carte(vue: Montage, nom: string): Element | undefined {
  return vue.qq('.dieu').find((d) => d.querySelector('h3')?.textContent === nom)
}

describe('ferveur d’un dieu', () => {
  it('nomme le palier de ferveur selon la relation', () => {
    for (const [relation, mot] of [
      [-90, 'Maudit'],
      [-50, 'Offensé'],
      [0, 'Indifférent'],
      [20, 'En grâce'],
      [50, 'Chéri'],
      [90, 'Élu du dieu'],
    ] as const) {
      reinitialiser()
      poser({ buildings: temple(1), gods: dieux({ zeus: relation }) })
      const vue = monter(<Pantheon />)
      expect(carte(vue, 'Zeus')?.textContent).toContain(mot)
      vue.demonter()
    }
  })

  it('chiffre la puissance de la bénédiction à la ferveur courante', () => {
    poser({ buildings: temple(1), gods: dieux({ zeus: 100 }) })
    m = monter(<Pantheon />)
    // l'élu de Zeus frappe à ×1.6 : 120 dégâts de base en font 192
    expect(carte(m, 'Zeus')?.textContent).toContain('bénédiction ×1.6')
    expect(carte(m, 'Zeus')?.textContent).toContain('≈192 dégâts')
    m.demonter()

    reinitialiser()
    poser({ buildings: temple(1), gods: dieux({ zeus: -100 }) })
    m = monter(<Pantheon />)
    // un dieu maudit se contente de ×0.4, soit 48 dégâts
    expect(carte(m, 'Zeus')?.textContent).toContain('bénédiction ×0.4')
    expect(carte(m, 'Zeus')?.textContent).toContain('≈48 dégâts')
  })

  it('annonce le niveau de temple requis pour un dieu encore fermé', () => {
    poser({ buildings: temple(1), gods: dieux({}) })
    m = monter(<Pantheon />)
    const fermes = m.qq('.dieu.verrouille')
    expect(fermes.length).toBeGreaterThan(0)
    for (const d of fermes) {
      const nom = d.querySelector('h3')?.textContent ?? ''
      const attendu = GOD_IDS.find((g) => GODS[g].nom === nom)
      expect(d.textContent).toContain(`Temple niveau ${attendu ? GODS[attendu].temple : '?'} requis`)
      // un dieu fermé ne propose ni invocation ni arbre de faveur
      expect(d.querySelector('.graces')).toBeNull()
    }
    // Zeus, lui, n'exige qu'un temple de niveau 1 : sa carte est ouverte
    expect(carte(m, 'Zeus')?.className).not.toContain('verrouille')
  })

  it('marque dans l’arbre de faveur la grâce accordée et celle qui reste offerte', () => {
    poser({ buildings: temple(1), gods: dieux({ zeus: 60 }) })
    m = monter(<Pantheon />)
    const arbre = carte(m, 'Zeus')?.querySelector('.graces')
    expect(arbre?.textContent).toContain('Arbre de faveur - 0/3 accordées')
    expect(arbre?.querySelectorAll('.grace.acquise')).toHaveLength(0)
    // une seule grâce est achetable à la fois : la suivante dans l'ordre
    expect(arbre?.querySelectorAll('.grace.offerte')).toHaveLength(1)
    expect(arbre?.querySelectorAll('.grace.lointaine')).toHaveLength(2)
  })
})

/** tous les bâtiments à zéro sauf le temple, au niveau demandé */
function temple(niveau: number) {
  const ids = [
    'agora',
    'remparts',
    'maisons',
    'ferme',
    'scierie',
    'carriere',
    'forge',
    'caserne',
    'temple',
    'port',
  ] as const
  const out = {} as Record<(typeof ids)[number], { level: number }>
  for (const id of ids) out[id] = { level: id === 'temple' ? niveau : id === 'agora' ? 1 : 0 }
  return out as never
}
