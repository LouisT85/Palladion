import { beforeEach, describe, expect, it } from 'vitest'
import { REGLES_SIEGE, vagueSiege } from './siege'
import { useGame } from './store'

/*
 * Le CÂBLAGE du mode siège dans le store - pas ses règles, qui ont leur propre
 * fichier. Ce qu'on vérifie ici est ce qu'aucun test de module ne peut voir :
 * que choisirMode('siege') pose bien l'état, que le tick lance les vagues, que
 * le record survit au reset, et que le mode coupe ce qu'il doit couper.
 */

function neuf() {
  useGame.getState().reset()
}

describe('entrer en siège', () => {
  beforeEach(neuf)

  it('pose un siège neuf, avec les coffres du mode', () => {
    useGame.getState().choisirMode('siege')
    const s = useGame.getState()
    expect(s.mode).toBe('siege')
    expect(s.siege).not.toBeNull()
    expect(s.siege!.vague).toBe(0)
    expect(s.siege!.fini).toBe(false)
    expect(s.pop).toBe(REGLES_SIEGE.popDepart)
    expect(s.faveur).toBe(REGLES_SIEGE.faveurDepart)
    expect(s.resources.pierre).toBe(REGLES_SIEGE.ressourcesDepart.pierre)
  })

  it('laisse un répit avant la première vague : le temps de poser une palissade', () => {
    useGame.getState().choisirMode('siege')
    const s = useGame.getState()
    expect(s.siege!.prochaineAt).toBeGreaterThan(Date.now())
    expect(s.nextAttackAt).toBe(s.siege!.prochaineAt)
  })

  it('ne laisse aucun acte de campagne traîner', () => {
    useGame.getState().choisirMode('campagne')
    expect(useGame.getState().campagne).not.toBeNull()
    useGame.getState().choisirMode('siege')
    expect(useGame.getState().campagne).toBeNull()
  })

  it('quitter le siège pour le bac à sable efface le siège', () => {
    useGame.getState().choisirMode('siege')
    useGame.getState().choisirMode('bac-a-sable')
    expect(useGame.getState().siege).toBeNull()
  })
})

describe('ce que le mode interdit', () => {
  beforeEach(neuf)

  it('refuse de faire sortir la garnison en expédition', () => {
    useGame.getState().choisirMode('siege')
    useGame.setState({ army: { lancier: 10, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 } })
    useGame.getState().lancerExpedition('camp-pillards', {
      lancier: 5,
      archer: 0,
      hoplite: 0,
      frondeur: 0,
      peltaste: 0,
      belier: 0,
      char: 0,
    })
    expect(useGame.getState().expedition).toBeNull()
  })
})

describe('le record traverse les règnes', () => {
  beforeEach(neuf)

  it('survit au reset : un record qui meurt avec la cité n’est pas un record', () => {
    useGame.getState().choisirMode('siege')
    useGame.setState({ recordSiege: 17 })
    useGame.getState().reset()
    expect(useGame.getState().recordSiege).toBe(17)
    // et la cité, elle, est bien neuve
    expect(useGame.getState().mode).toBeNull()
    expect(useGame.getState().siege).toBeNull()
  })
})

describe('le calendrier du siège pilote les assauts', () => {
  beforeEach(neuf)

  it('lance la vague dès que le répit s’achève, et pas avant', () => {
    useGame.getState().choisirMode('siege')
    // le répit court encore : rien ne doit partir
    useGame.getState().tick()
    expect(useGame.getState().battle).toBeNull()
    expect(useGame.getState().siege!.vague).toBe(0)

    // on ramène l'échéance dans le passé
    useGame.setState((s) => ({ siege: { ...s.siege!, prochaineAt: Date.now() - 1000 } }))
    useGame.getState().tick()
    const s = useGame.getState()
    expect(s.siege!.vague).toBe(1)
    expect(s.battle).not.toBeNull()
    // la composition est celle qu'annonce le module, pas un tirage au hasard
    expect(s.incomingWave).toEqual(vagueSiege(1).wave)
    expect(s.battle!.secteurs.length).toBe(vagueSiege(1).fronts)
  })

  it('n’enchaîne pas deux vagues d’un coup : une bataille en cours suspend le calendrier', () => {
    useGame.getState().choisirMode('siege')
    useGame.setState((s) => ({ siege: { ...s.siege!, prochaineAt: Date.now() - 1000 } }))
    useGame.getState().tick()
    const vague = useGame.getState().siege!.vague
    useGame.getState().tick()
    expect(useGame.getState().siege!.vague).toBe(vague)
  })
})
