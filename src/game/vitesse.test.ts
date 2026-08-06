import { beforeEach, describe, expect, it } from 'vitest'
import { GEO_VILLAGE, creerBataille } from './combat'
import { useGame } from './store'
import type { BattleState } from './types'

/*
 * ═══════════════ LE TEMPS NE S'ACCÉLÈRE PAS PENDANT UN COMBAT ═══════════════
 *
 * La règle était à moitié tenue. Le battement du jeu clampait bien la vitesse à ×1
 * dès qu'une bataille ou une expédition tournait - la simulation était juste - et
 * les boutons du bandeau se désactivaient. Mais l'ÉTAT restait libre, et les
 * raccourcis clavier (touches 1 à 4, App.tsx) appellent `setVitesse` sans passer
 * par les boutons. On posait donc ×8 en pleine mêlée : rien n'accélérait sur
 * l'instant, puis le règne bondissait de huit crans à la seconde où l'assaut se
 * concluait - production, chantiers, calendrier du prochain assaut compris.
 *
 * Ce que ces tests exigent : le refus à la source, et ×1 reposé dans l'état à
 * l'ouverture de tout combat, défense comme expédition.
 */

const AUCUNE_TROUPE = { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 }

function bataille(): BattleState {
  return creerBataille({
    attaquants: [{ enemy: 'pillard', count: 4 }],
    defenseurs: AUCUNE_TROUPE,
    wallLevel: 2,
    now: 0,
    geo: GEO_VILLAGE,
    campJoueur: 'defense',
    wallHpTotal: 600,
  })
}

beforeEach(() => {
  useGame.setState({ battle: null, expedition: null, vitesse: 1 })
})

describe('vitesse du temps', () => {
  it('se règle librement en temps de paix', () => {
    for (const v of [2, 4, 8, 1]) {
      useGame.getState().setVitesse(v)
      expect(useGame.getState().vitesse).toBe(v)
    }
  })

  it('refuse toute accélération pendant un assaut - le clavier compris', () => {
    useGame.setState({ vitesse: 1, battle: bataille() })
    for (const v of [2, 4, 8]) {
      useGame.getState().setVitesse(v)
      expect(useGame.getState().vitesse).toBe(1)
    }
  })

  it('refuse aussi pendant une expédition, tant qu’elle n’est pas conclue', () => {
    const exp = {
      villageId: 'camp-pillards',
      intention: 'pillage' as const,
      envoyes: { ...AUCUNE_TROUPE, hoplite: 4 },
      wallHp: 0,
      battle: bataille(),
      result: null,
    }
    useGame.setState({ vitesse: 1, expedition: exp })
    useGame.getState().setVitesse(8)
    expect(useGame.getState().vitesse).toBe(1)

    // le raid conclu, le temps redevient réglable : on rentre au village
    useGame.setState({ expedition: { ...exp, result: { victoire: true, etoiles: 3, lignes: [] } } })
    useGame.getState().setVitesse(4)
    expect(useGame.getState().vitesse).toBe(4)
  })

  it('repose ×1 dans l’état au départ d’un assaut, pour que rien ne bondisse après', () => {
    /*
     * C'était tout le défaut : une vitesse de ×8 laissée dans l'état ne se voyait
     * pas pendant la bataille (le tick la clampait) mais reprenait ses droits à la
     * seconde où la bataille se terminait.
     */
    useGame.setState({
      vitesse: 8,
      battle: null,
      expedition: null,
      // l'échéance dans le passé : le prochain battement lance l'assaut
      nextAttackAt: Date.now() - 1000,
      lastSeen: Date.now() - 250,
    })
    useGame.getState().tick()
    expect(useGame.getState().battle).not.toBeNull()
    expect(useGame.getState().vitesse).toBe(1)
  })
})
