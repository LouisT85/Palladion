import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BarreRessources, JetonsEtat } from './Hud'
import { habitant, monter, poser, reinitialiser, type Montage } from '../test-utils'

/*
 * LA BARRE DE RESSOURCES.
 *
 * C'est la seule partie de l'écran que le joueur regarde en permanence, et la
 * première qu'il consulte quand quelque chose va mal. Trois choses doivent y
 * être vraies à tout instant : les cinq montants, le signe du débit, et le
 * compte des bras qui traînent.
 *
 * Note : sous vitest, `MODE_TEST` est vrai, donc les jetons affichent « ∞ » au
 * lieu du débit chiffré. La CLASSE `neg`, elle, est posée dans les deux cas -
 * c'est bien elle qui colore le chiffre en rouge, et c'est donc elle qu'on
 * vérifie.
 */

let m: Montage | null = null

beforeEach(() => reinitialiser())
afterEach(() => {
  m?.demonter()
  m = null
  reinitialiser()
})

describe('barre de ressources', () => {
  it('affiche les cinq réserves avec leur nom et leur montant', () => {
    poser({ resources: { bois: 330.87, pierre: 180, grain: 220, bronze: 24 }, faveur: 41 })
    m = monter(<BarreRessources />)
    const jetons = m.qq('.ressources > .res')
    expect(jetons).toHaveLength(5)
    expect(jetons[0].textContent).toContain('Bois')
    // arrondi à l'unité inférieure : jamais de décimale au bandeau
    expect(jetons[0].textContent).toContain('330')
    expect(jetons[0].textContent).not.toContain('330.8')
    expect(jetons[1].textContent).toContain('Pierre')
    expect(jetons[1].textContent).toContain('180')
    expect(jetons[2].textContent).toContain('Grain')
    expect(jetons[2].textContent).toContain('220')
    expect(jetons[3].textContent).toContain('Bronze')
    expect(jetons[3].textContent).toContain('24')
    // la faveur n'est pas une denrée : elle se lit sur cent
    expect(jetons[4].textContent).toContain('Faveur')
    expect(jetons[4].textContent).toContain('41')
    expect(jetons[4].textContent).toContain('/100')
  })

  it('met le jeton du grain en alerte quand le grenier est vide', () => {
    poser({ resources: { bois: 100, pierre: 100, grain: 0, bronze: 10 } })
    m = monter(<BarreRessources />)
    const alertes = m.qq('.ressources > .res.alerte')
    expect(alertes).toHaveLength(1)
    expect(alertes[0].textContent).toContain('Grain')
  })

  it('marque le débit du grain quand la garnison mange plus que la ferme ne rend', () => {
    poser({ army: { lancier: 30, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 } })
    m = monter(<BarreRessources />)
    const negs = m.qq('.ressources .taux.neg')
    // un seul débit peut être négatif : celui du grain, seule ressource consommée
    expect(negs).toHaveLength(1)
    const jetons = m.qq('.ressources > .res')
    expect(jetons[2].querySelector('.taux.neg')).not.toBeNull()
  })

  it('ne marque aucun débit quand la cueillette suffit à nourrir le village', () => {
    poser({ pop: 4, army: { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 } })
    m = monter(<BarreRessources />)
    expect(m.qq('.ressources .taux.neg')).toHaveLength(0)
  })
})

describe('pastille des habitants', () => {
  it('dit la population, la capacité et le nombre de bras libres', () => {
    // les habitations restent au niveau 0 : la capacité de départ est de sept
    poser({
      pop: 4,
      villageois: [
        habitant('Alexis', 'ferme', 'ferme'),
        habitant('Briséis', 'scierie'),
        habitant('Chrysès', 'carriere'),
        habitant('Dolon', 'forge'),
      ],
    })
    m = monter(<BarreRessources />)
    const pastille = m.q('[data-tuto="habitants"] button.pastille')
    expect(pastille?.textContent).toContain('4/7')
    expect(pastille?.textContent).toContain('(3 oisifs)')
  })

  it('garde « oisif » au singulier pour un seul bras libre', () => {
    poser({ pop: 2, villageois: [habitant('Alexis', 'ferme', 'ferme'), habitant('Briséis', 'scierie')] })
    m = monter(<BarreRessources />)
    const pastille = m.q('[data-tuto="habitants"] button.pastille')
    expect(pastille?.textContent).toContain('(1 oisif)')
    expect(pastille?.textContent).not.toContain('oisifs')
  })

  it('signale « 0 oisif » quand tout le monde est au travail', () => {
    poser({ pop: 1, villageois: [habitant('Alexis', 'ferme', 'ferme')] })
    m = monter(<BarreRessources />)
    expect(m.q('[data-tuto="habitants"] button.pastille')?.textContent).toContain('(0 oisif)')
    // la pastille se met en retrait dans ce cas - c'est la classe qui l'éteint
    expect(m.q('.oisifs.zero')).not.toBeNull()
  })

  it('additionne toutes les unités dans le compte de la garnison', () => {
    poser({ army: { lancier: 3, archer: 2, hoplite: 1, frondeur: 0, peltaste: 4, belier: 0, char: 0 } })
    m = monter(<BarreRessources />)
    const garnison = m.qq('.hud-groupe .pastille').find((e) => e.textContent?.includes('Garnison'))
    expect(garnison?.textContent).toContain('10')
  })
})

describe('jetons d’état du monde', () => {
  it('écrit l’ambiance en un mot qui suit le moral', () => {
    for (const [morale, mot] of [
      [92, 'Exaltée'],
      [65, 'Bonne'],
      [45, 'Correcte'],
      [30, 'Morose'],
      [8, 'Révolte'],
    ] as const) {
      reinitialiser()
      poser({ morale })
      const vue = monter(<JetonsEtat />)
      expect(vue.q('.ambiance-mot')?.textContent).toBe(mot)
      vue.demonter()
    }
  })

  it('affiche la menace arrondie et le jour de règne', () => {
    poser({ threat: 37.6 })
    m = monter(<JetonsEtat />)
    const jetons = m.qq('.hud-monde .pastille')
    expect(jetons.some((e) => e.textContent?.includes('Menace') && e.textContent?.includes('38'))).toBe(true)
    // une partie neuve commence au matin du premier jour
    expect(jetons.some((e) => e.textContent?.includes('Jour') && e.textContent?.includes('1'))).toBe(true)
  })
})
