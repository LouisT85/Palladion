import { beforeEach, describe, expect, it } from 'vitest'
import { monter, poser, reinitialiser } from '../test-utils'
import { useGame } from '../../game/store'
import { PanneauMerveilles, PanneauTechnologies } from './Progres'

describe('smoke', () => {
  beforeEach(() => reinitialiser())

  it('techno sans câblage : s’ouvre et explique que la recherche est fermée', () => {
    const m = monter(<PanneauTechnologies onFermer={() => {}} />)
    expect(m.texte()).toMatch(/découvertes/)
    expect(m.texte()).toMatch(/Agora niveau 2/)
    expect(m.texte()).toMatch(/Charrue à soc/)
    m.demonter()
  })

  it('techno câblée : le compte à rebours et le récapitulatif', () => {
    const b = structuredClone(useGame.getState().buildings)
    b.agora.level = 3
    b.ferme.level = 2
    poser({ buildings: b, resources: { bois: 9999, pierre: 9999, grain: 9999, bronze: 9999 } })
    poser({ technos: ['corde'], recherche: { id: 'poulie', finAt: Date.now() + 60_000 } } as never)
    const m = monter(<PanneauTechnologies onFermer={() => {}} />)
    const t = m.texte()
    expect(t).toMatch(/Poulie et treuil/)
    expect(t).toMatch(/recherche en cours/)
    expect(t).toMatch(/Ce que le village sait déjà/)
    expect(t).toMatch(/Une recherche est déjà en cours/)
    expect(t).toMatch(/✓ acquise/)
    m.demonter()
  })

  it('merveilles : l’avertissement, les six fiches, les manques', () => {
    const m = monter(<PanneauMerveilles onFermer={() => {}} />)
    const t = m.texte()
    expect(t).toMatch(/QU’UN seul/)
    expect(t).toMatch(/Palladion doré/)
    expect(t).toMatch(/Jardins en terrasses/)
    expect(t).toMatch(/Il manque/)
    m.demonter()
  })

  it('merveilles : le chantier engagé barre les cinq autres', () => {
    poser({ merveille: { id: 'phare', faite: false, finAt: Date.now() + 300_000 } } as never)
    const m = monter(<PanneauMerveilles onFermer={() => {}} />)
    const t = m.texte()
    expect(t).toMatch(/Phare du cap/)
    expect(t).toMatch(/encore 5 min/)
    expect(t).toMatch(/Ce projet est clos/)
    m.demonter()
  })
})
