import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PanneauPopulation } from './Population'
import { habitant, monter, poser, reinitialiser, type Montage } from '../test-utils'

/*
 * LE RECENSEMENT.
 *
 * La règle est simple et tout le jeu en dépend : un atelier ne rend qu'au
 * prorata des postes tenus, et un villageois ne rend pleinement qu'à SON métier.
 * Le recensement est le seul endroit où cette règle se voit. S'il compte mal les
 * bras libres ou tait qu'un homme est mal placé, la règle n'existe plus.
 */

let m: Montage | null = null

beforeEach(() => reinitialiser())
afterEach(() => {
  m?.demonter()
  m = null
  reinitialiser()
})

const RIEN = () => {}

describe('recensement des habitants', () => {
  it('liste chaque habitant avec son nom et son métier de naissance', () => {
    poser({
      pop: 3,
      villageois: [
        habitant('Alexis', 'ferme', 'ferme'),
        habitant('Briséis', 'scierie', 'scierie'),
        habitant('Chrysès', 'carriere'),
      ],
      buildings: niveaux({ ferme: 1, scierie: 1 }),
    })
    m = monter(<PanneauPopulation onFermer={RIEN} />)
    expect(m.qq('.hab')).toHaveLength(3)
    const t = m.texte()
    expect(t).toContain('Alexis')
    expect(t).toContain('Paysan')
    expect(t).toContain('Briséis')
    expect(t).toContain('Bûcheron')
    expect(t).toContain('Chrysès')
    expect(t).toContain('Tailleur de pierre')
    expect(t).toContain('Recensement - 3 habitants')
  })

  it('compte les bras sans emploi sous le titre', () => {
    poser({
      pop: 3,
      villageois: [habitant('Alexis', 'ferme', 'ferme'), habitant('Briséis', 'scierie'), habitant('Chrysès', 'carriere')],
      buildings: niveaux({ ferme: 1 }),
    })
    m = monter(<PanneauPopulation onFermer={RIEN} />)
    expect(m.q('.modale-sous')?.textContent).toContain('3/7 habitants')
    expect(m.q('.modale-sous')?.textContent).toContain('2 sans emploi')
  })

  it('signale l’habitant sans emploi comme enrôlable à la caserne', () => {
    poser({ pop: 1, villageois: [habitant('Chrysès', 'carriere')], buildings: niveaux({ ferme: 1 }) })
    m = monter(<PanneauPopulation onFermer={RIEN} />)
    const ligne = m.q('.hab.oisif')
    expect(ligne).not.toBeNull()
    expect(ligne?.textContent).toContain('Sans emploi')
    expect(ligne?.textContent).toContain('enrôlable à la caserne')
  })

  it('signale l’habitant déplacé hors de son métier et ce qu’il n’y rend pas', () => {
    poser({
      pop: 2,
      villageois: [habitant('Alexis', 'ferme', 'ferme'), habitant('Briséis', 'scierie', 'carriere')],
      buildings: niveaux({ ferme: 1, carriere: 1 }),
    })
    m = monter(<PanneauPopulation onFermer={RIEN} />)
    const mal = m.q('.hab.mal-place')
    expect(mal?.textContent).toContain('Briséis')
    expect(mal?.textContent).toContain('ce n’est pas son métier')
    // celui qui est à son métier porte l'autre marque, et pas celle-ci
    expect(m.q('.hab.juste')?.textContent).toContain('Alexis')
    expect(m.q('.hab.juste')?.textContent).toContain('à son métier')
  })

  it('dit qu’il n’y a nulle part où placer ces bras quand rien n’est bâti', () => {
    poser({ pop: 2, villageois: [habitant('Alexis', 'ferme'), habitant('Briséis', 'scierie')] })
    m = monter(<PanneauPopulation onFermer={RIEN} />)
    expect(m.texte()).toContain('Aucun atelier bâti')
    expect(m.qq('.hab.oisif')).toHaveLength(2)
  })
})

/** un jeu de bâtiments complet : seuls les niveaux cités s'écartent de zéro */
function niveaux(poses: Record<string, number>) {
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
  for (const id of ids) out[id] = { level: poses[id] ?? (id === 'agora' ? 1 : 0) }
  return out as never
}
