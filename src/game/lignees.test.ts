import { beforeEach, describe, expect, it, vi } from 'vitest'
import { METIERS_DEPART } from './data'
import {
  AGE_ADULTE,
  AGE_ANCIEN,
  AGE_FRAGILE,
  AGE_LIMITE,
  ANS_PAR_JOUR,
  LIGNEES,
  ageDe,
  estAdulte,
  foyersFeconds,
  ligneeLibre,
  metierTransmis,
  pyramide,
  rendementAge,
  risqueDeMort,
  saisonDeVie,
  trouverParti,
} from './lignees'
import { efficaciteDe, jourDe, useGame } from './store'
import type { BuildingId, Villageois } from './types'

/*
 * FAMILLES ET LIGNÉES.
 *
 * Les habitants étaient des jetons nommés : deux villages de vingt habitants se
 * valaient exactement. Ce qui est testé ici n'est pas l'état civil - c'est que
 * l'âge et la parenté CHANGENT quelque chose :
 *
 *  · un enfant ne rend pas ce que rend un adulte, et ne porte pas les armes ;
 *  · un foyer transmet son métier, un célibataire ne transmet rien ;
 *  · l'âge finit par emporter les siens, et le métier part avec eux.
 */

function hab(id: string, champs: Partial<Villageois> = {}): Villageois {
  return { id, nom: `H${id}`, poste: null, metier: 'ferme', neLe: 0, lignee: 'Nélides', ...champs }
}

describe('l’âge d’un habitant', () => {
  it('se déduit du calendrier : une journée vaut deux ans', () => {
    const v = hab('a', { neLe: 4 })
    expect(ageDe(v, 4)).toBe(0)
    expect(ageDe(v, 14)).toBe(10 * ANS_PAR_JOUR)
    // un habitant né « plus tard » ne rajeunit pas : on borne à zéro
    expect(ageDe(hab('b', { neLe: 30 }), 10)).toBe(0)
  })

  it('lit une sauvegarde antérieure aux lignées comme un adulte, jamais comme un nourrisson', () => {
    const vieux: Villageois = { id: 'x', nom: 'Damon', poste: 'ferme', metier: 'ferme' }
    expect(estAdulte(vieux, 1)).toBe(true)
    expect(saisonDeVie(ageDe(vieux, 1))).toBe('adulte')
  })

  it('découpe la vie en trois saisons aux bornes annoncées', () => {
    expect(saisonDeVie(AGE_ADULTE - 1)).toBe('enfant')
    expect(saisonDeVie(AGE_ADULTE)).toBe('adulte')
    expect(saisonDeVie(AGE_ANCIEN - 1)).toBe('adulte')
    expect(saisonDeVie(AGE_ANCIEN)).toBe('ancien')
  })

  it('fait rendre moins aux deux bouts de la vie', () => {
    expect(rendementAge(8)).toBeLessThan(rendementAge(30))
    expect(rendementAge(70)).toBeLessThan(rendementAge(30))
    expect(rendementAge(30)).toBe(1)
    // un enfant aide quand même : il ne rend pas zéro
    expect(rendementAge(8)).toBeGreaterThan(0)
  })

  it('pèse sur le rendement réel d’un poste, métier ou pas', () => {
    const enfant = hab('e', { poste: 'ferme', metier: 'ferme', neLe: 0 })
    const adulte = hab('a', { poste: 'ferme', metier: 'ferme', neLe: -20 })
    // au jour 4 : l'enfant a 8 ans, l'adulte 48
    expect(efficaciteDe(enfant, 4)).toBeLessThan(efficaciteDe(adulte, 4))
    // sans emploi, personne ne rend rien, quel que soit l'âge
    expect(efficaciteDe(hab('o', { poste: null }), 40)).toBe(0)
  })
})

describe('la mort par l’âge', () => {
  it('ne menace personne avant l’âge fragile, puis monte, puis n’épargne plus', () => {
    expect(risqueDeMort(AGE_FRAGILE - 1)).toBe(0)
    expect(risqueDeMort(AGE_FRAGILE + 10)).toBeGreaterThan(0)
    expect(risqueDeMort(AGE_FRAGILE + 20)).toBeGreaterThan(risqueDeMort(AGE_FRAGILE + 10))
    expect(risqueDeMort(AGE_LIMITE)).toBe(1)
  })
})

describe('les mariages', () => {
  it('n’unit que des adultes, et jamais deux d’une même maison', () => {
    const memeMaison = [hab('a', { neLe: -20 }), hab('b', { neLe: -20 })]
    expect(trouverParti(memeMaison, 0)).toBeNull()
    const deuxMaisons = [hab('a', { neLe: -20 }), hab('b', { neLe: -20, lignee: 'Éacides' })]
    expect(trouverParti(deuxMaisons, 0)).not.toBeNull()
    // un enfant ne se marie pas
    const avecEnfant = [hab('a', { neLe: -20 }), hab('b', { neLe: 0, lignee: 'Éacides' })]
    expect(trouverParti(avecEnfant, 1)).toBeNull()
  })

  it('ne remarie pas quelqu’un qui a déjà un foyer', () => {
    const maries = [
      hab('a', { neLe: -20, conjoint: 'b' }),
      hab('b', { neLe: -20, lignee: 'Éacides', conjoint: 'a' }),
      hab('c', { neLe: -20, lignee: 'Bacchiades' }),
    ]
    // un seul libre : personne à lui donner
    expect(trouverParti(maries, 0)).toBeNull()
  })

  it('ne compte un foyer fécond qu’une fois, et seulement s’il est en âge', () => {
    const jeunes = [hab('a', { neLe: -10, conjoint: 'b' }), hab('b', { neLe: -10, conjoint: 'a' })]
    expect(foyersFeconds(jeunes, 0)).toHaveLength(1)
    // passé l'âge, le foyer ne fait plus d'enfants
    const vieux = [hab('a', { neLe: -40, conjoint: 'b' }), hab('b', { neLe: -40, conjoint: 'a' })]
    expect(foyersFeconds(vieux, 0)).toHaveLength(0)
  })
})

describe('la transmission du métier', () => {
  it('donne le métier d’un parent la plupart du temps, celui qui manque sinon', () => {
    const pris = new Set<BuildingId>()
    for (let i = 0; i < 100; i++) pris.add(metierTransmis('forge', 'temple', 'port', i / 100))
    expect(pris).toContain('forge')
    expect(pris).toContain('temple')
    expect(pris).toContain('port')
    // les parents l'emportent : plus de la moitié des tirages
    const parents = Array.from({ length: 100 }, (_, i) => metierTransmis('forge', 'temple', 'port', i / 100)).filter(
      (m) => m !== 'port',
    )
    expect(parents.length).toBeGreaterThan(50)
  })
})

describe('les maisons', () => {
  it('n’en attribue pas deux fois la même tant qu’il en reste', () => {
    const prises: string[] = []
    for (let i = 0; i < 6; i++) prises.push(ligneeLibre(prises, i / 7))
    expect(new Set(prises).size).toBe(prises.length)
  })

  it('recycle la moins portée quand la table est épuisée', () => {
    const toutes = [...LIGNEES]
    // toutes prises une fois, sauf la dernière prise deux fois de plus
    const prises = [...toutes, toutes[0], toutes[0]]
    expect(ligneeLibre(prises, 0.5)).not.toBe(toutes[0])
  })

  it('compte la pyramide des âges en trois cases', () => {
    const gens = [hab('a', { neLe: 0 }), hab('b', { neLe: -20 }), hab('c', { neLe: -40 })]
    const p = pyramide(gens, 4)
    expect(p.enfant + p.adulte + p.ancien).toBe(3)
    expect(p.enfant).toBe(1)
    expect(p.ancien).toBe(1)
  })
})

describe('le village vivant, dans le store', () => {
  beforeEach(() => {
    useGame.getState().reset()
    useGame.getState().tick()
  })

  it('fonde le village avec des adultes - jamais une fournée de nourrissons', () => {
    const s = useGame.getState()
    const jour = jourDe(s)
    expect(s.villageois.length).toBeGreaterThan(0)
    for (const v of s.villageois.slice(0, METIERS_DEPART.length)) {
      expect(estAdulte(v, jour), v.nom).toBe(true)
      expect(v.lignee, v.nom).toBeTruthy()
    }
  })

  it('donne une maison à chacun, et pas la même à tous', () => {
    const maisons = useGame.getState().villageois.map((v) => v.lignee)
    expect(maisons.every(Boolean)).toBe(true)
    expect(new Set(maisons).size).toBeGreaterThan(1)
  })

  it('n’enrôle pas un enfant : la caserne veut des adultes', () => {
    useGame.setState((s) => {
      s.buildings.caserne.level = 2
      // tout le village est mineur, et personne n'est à un poste
      const jour = jourDe(s)
      for (const v of s.villageois) {
        v.neLe = jour
        v.poste = null
      }
      s.army = { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0 }
      s.recruitQueue = []
      return s
    })
    useGame.getState().recruter('lancier', 1)
    expect(useGame.getState().recruitQueue).toHaveLength(0)
    // le message doit DIRE pourquoi, sinon le joueur croit à un bogue
    expect(useGame.getState().toasts.some((t) => t.msg.includes('enfant'))).toBe(true)
  })

  it('marie les adultes libres quand la journée tourne, et pas dans la même maison', () => {
    const jeu = () => useGame.getState()
    // on force le tour du jour
    useGame.setState((s) => {
      s.dernierJourVecu = -1
      return s
    })
    jeu().tick()
    const maries = jeu().villageois.filter((v) => v.conjoint)
    expect(maries.length).toBeGreaterThanOrEqual(2)
    for (const v of maries) {
      const c = jeu().villageois.find((x) => x.id === v.conjoint)
      expect(c, `${v.nom} sans conjoint retrouvé`).toBeDefined()
      // la réciprocité est le contrat du foyer : sinon on marie des fantômes
      expect(c!.conjoint).toBe(v.id)
    }
  })

  it('ne rejoue pas les noces du même jour à chaque battement', () => {
    const jeu = () => useGame.getState()
    useGame.setState((s) => {
      s.dernierJourVecu = -1
      return s
    })
    jeu().tick()
    const apres = jeu().villageois.filter((v) => v.conjoint).length
    for (let i = 0; i < 5; i++) jeu().tick()
    expect(jeu().villageois.filter((v) => v.conjoint).length).toBe(apres)
  })

  it('enterre les anciens, et le village perd un habitant', () => {
    const jeu = () => useGame.getState()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    useGame.setState((s) => {
      const jour = jourDe(s)
      // deux patriarches au bout du rouleau
      s.villageois[0].neLe = jour - AGE_LIMITE / ANS_PAR_JOUR
      s.villageois[1].neLe = jour - AGE_LIMITE / ANS_PAR_JOUR
      s.dernierJourVecu = -1
      return s
    })
    const avant = jeu().pop
    jeu().tick()
    expect(jeu().pop).toBeLessThan(avant)
    expect(jeu().reports.some((r) => r.titre.includes('s’est éteint'))).toBe(true)
    vi.restoreAllMocks()
  })

  it('libère le conjoint d’un mort : un veuf peut refaire foyer', () => {
    const jeu = () => useGame.getState()
    useGame.setState((s) => {
      s.villageois[0].conjoint = s.villageois[1].id
      s.villageois[1].conjoint = s.villageois[0].id
      s.pop = s.villageois.length - 1 // on force le départ d'un habitant
      return s
    })
    jeu().tick()
    const restants = jeu().villageois
    for (const v of restants) {
      if (!v.conjoint) continue
      expect(restants.some((x) => x.id === v.conjoint), `${v.nom} marié à un absent`).toBe(true)
    }
  })
})
