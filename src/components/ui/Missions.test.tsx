import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MISSIONS, missionsActives } from '../../game/missions'
import { MissionsTracker } from './Missions'
import { habitant, monter, poser, reinitialiser, type Montage } from '../test-utils'

/*
 * LE FIL ROUGE.
 *
 * Le suivi flottant est un rappel, pas un sommaire : trois missions, jamais
 * plus. Ce qu'il doit dire sans erreur, c'est où l'on en est (la jauge) et ce
 * qu'on peut encaisser maintenant (le bouton de récompense). Un bouton
 * « Réclamer » qui apparaît trop tôt donnerait une récompense pour rien.
 */

let m: Montage | null = null

beforeEach(() => reinitialiser())
afterEach(() => {
  m?.demonter()
  m = null
  reinitialiser()
})

describe('suivi des missions', () => {
  it('n’ouvre jamais plus de trois missions à la fois', () => {
    m = monter(<MissionsTracker />)
    const cartes = m.qq('.missions-liste .mission')
    expect(cartes).toHaveLength(3)
    // et ce sont bien les trois premières du fil rouge
    for (const [i, def] of missionsActives([]).entries()) {
      expect(cartes[i].textContent).toContain(def.titre)
    }
  })

  it('affiche l’acte en cours et le compte global des missions', () => {
    m = monter(<MissionsTracker />)
    const tete = m.q('.missions-titre')
    expect(tete?.textContent).toContain('Acte I')
    expect(tete?.textContent).toContain(`0/${MISSIONS.length}`)
  })

  it('trace la jauge d’une mission à seuil au prorata de l’avancement', () => {
    // les cinq premières réclamées : « Trois villageois au travail » s'ouvre
    poser({
      missionsReclamees: MISSIONS.slice(0, 5).map((x) => x.id),
      pop: 1,
      villageois: [habitant('Alexis', 'ferme', 'ferme')],
    })
    m = monter(<MissionsTracker />)
    const carte = m.qq('.mission').find((c) => c.textContent?.includes('Trois villageois au travail'))
    expect(carte?.textContent).toContain('1/3')
    const jauge = carte?.querySelector('.mission-progres > div') as HTMLElement | null
    expect(jauge?.style.width).toBe('33.33333333333333%')
  })

  it('n’offre le bouton de récompense qu’à la mission achevée', () => {
    m = monter(<MissionsTracker />)
    const cartes = m.qq('.missions-liste .mission')
    // la première mission est acquittée d'office, les deux autres attendent
    expect(cartes[0].className).toContain('faite')
    expect(cartes[0].querySelector('.mission-reclamer')?.textContent).toContain('Réclamer la récompense')
    expect(cartes[1].className).not.toContain('faite')
    expect(cartes[1].querySelector('.mission-reclamer')).toBeNull()
    expect(m.qq('.mission-reclamer')).toHaveLength(1)
  })

  it('disparaît de l’écran quand tout le fil rouge est accompli', () => {
    poser({ missionsReclamees: MISSIONS.map((x) => x.id) })
    m = monter(<MissionsTracker />)
    expect(m.q('.missions')).toBeNull()
  })
})
