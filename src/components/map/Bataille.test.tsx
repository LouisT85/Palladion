import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { BattleState, Fighter, SecteurBataille } from '../../game/types'
import { BandeauAlerte } from '../ui/Hud'
import { BatailleLayer } from './BatailleLayer'
import { SanteBatiments } from './SanteBatiments'
import { monter, monterSvg, poser, reinitialiser, type Montage } from '../test-utils'

/*
 * LA LECTURE DU SIÈGE.
 *
 * Pendant un assaut, le joueur n'a que deux sources d'information : le bandeau
 * du haut (combien d'assaillants, la ligne tient-elle) et les jauges posées sur
 * la carte (quel pan souffre, quel bâtiment va tomber). Ce sont elles qui
 * décident s'il appelle un dieu maintenant ou dans dix secondes.
 */

let m: Montage | null = null

beforeEach(() => reinitialiser())
afterEach(() => {
  m?.demonter()
  m = null
  reinitialiser()
})

function assaillant(i: number, mort = false): Fighter {
  return {
    id: `a${i}`,
    camp: 'attaque',
    type: 'pillard',
    hp: mort ? 0 : 40,
    maxHp: 40,
    atk: 6,
    x: 900 + i * 10,
    y: 450,
    tx: 860,
    ty: 450,
    speed: 20,
    etat: mort ? 'mort' : 'melee',
    nextHit: 0,
    seed: i,
  }
}

function secteur(nom: string, hp: number, max: number, breche = false): SecteurBataille {
  return { nom, angle: 0, x: 900, y: 450, hp, max, breche }
}

function bataille(p: Partial<BattleState> = {}): BattleState {
  return {
    wave: [{ enemy: 'pillard', count: 3 }],
    fighters: [assaillant(1), assaillant(2), assaillant(3)],
    projectiles: [],
    toursDef: [],
    secteurs: [secteur('Porte de l’est', 600, 600)],
    effects: [],
    phase: 'siege',
    breche: false,
    startedAt: 0,
    campJoueur: 'defense',
    geo: {
      cx: 560,
      cy: 445,
      rx: 340,
      ry: 250,
      porte: { x: 900, y: 445 },
      ralliement: { x: 820, y: 445 },
      place: { x: 560, y: 445 },
      spawn: { x: 1170, y: 470 },
    },
    defBuffUntil: 0,
    atkBuffUntil: 0,
    moral: { attaque: 1, defense: 1 },
    result: null,
    engages: { lancier: 4 },
    ...p,
  }
}

describe('bandeau d’assaut', () => {
  it('compte les assaillants encore debout', () => {
    poser({ battle: bataille({ fighters: [assaillant(1), assaillant(2), assaillant(3), assaillant(4, true)] }) })
    m = monter(<BandeauAlerte />)
    expect(m.q('.bandeau .gros')?.textContent).toContain('ASSAUT EN COURS')
    // le mort ne compte plus : trois assaillants, pas quatre
    expect(m.q('.bandeau .gros')?.textContent).toContain('3 assaillants')
  })

  it('dit si les remparts encaissent ou s’ils sont percés', () => {
    poser({ battle: bataille() })
    m = monter(<BandeauAlerte />)
    expect(m.texte()).toContain('Vos remparts encaissent le choc')
    m.demonter()

    reinitialiser()
    poser({ battle: bataille({ breche: true }) })
    m = monter(<BandeauAlerte />)
    expect(m.texte()).toContain('Les remparts sont percés')
    expect(m.texte()).toContain('mêlée dans le village')
  })

  it('annonce la rupture de la ligne quand le moral passe sous le seuil', () => {
    poser({ battle: bataille({ moral: { attaque: 1, defense: 1 } }) })
    m = monter(<BandeauAlerte />)
    expect(m.texte()).toContain('Ligne tenue')
    expect(m.q('.moral-jauge.rompt')).toBeNull()
    m.demonter()

    reinitialiser()
    poser({ battle: bataille({ moral: { attaque: 1, defense: 0.05 } }) })
    m = monter(<BandeauAlerte />)
    expect(m.texte()).toContain('La ligne rompt')
    expect(m.q('.moral-jauge.rompt')).not.toBeNull()
  })

  it('annonce l’assaut à venir avec son compte à rebours', () => {
    const now = Date.now()
    poser({
      lastSeen: now,
      warned: true,
      incomingWave: [{ enemy: 'pillard', count: 6 }],
      nextAttackAt: now + 95_000,
    })
    m = monter(<BandeauAlerte />)
    expect(m.texte()).toContain('Attaque ennemie dans')
    expect(m.q('.compte')?.textContent).toBe('1:35')
    expect(m.texte()).toContain('6 assaillants par la route de l’est')
  })
})

describe('jauges de secteur', () => {
  it('chiffre la structure de chaque pan et nomme celui qui s’est effondré', () => {
    const b = bataille({
      secteurs: [secteur('Porte de l’est', 300, 1000), secteur('Mur du nord', 0, 1000, true)],
    })
    m = monterSvg(<BatailleLayer battle={b} now={1000} wallHp={300} wallMax={2000} />)
    const t = m.texte()
    expect(t).toContain('Porte de l’est')
    expect(t).toContain('🧱 300 / 1000')
    // un pan tombé ne montre plus de chiffres : il se dit en mots
    expect(t).toContain('Mur du nord')
    expect(t).toContain('pan effondré')
    expect(t).not.toContain('🧱 0 / 1000')
  })
})

describe('santé des bâtiments', () => {
  it('reste muette hors de la brèche', () => {
    poser({ battle: bataille({ breche: false }) })
    m = monterSvg(<SanteBatiments />)
    expect(m.qq('svg > g')).toHaveLength(0)
  })

  it('montre le cœur dès la brèche, et les autres bâtiments seulement entamés', () => {
    poser({
      battle: bataille({ breche: true }),
      buildings: batiments({ agora: 1, ferme: 2, scierie: 2 }),
    })
    m = monterSvg(<SanteBatiments />)
    // l'agora est intacte mais toujours à l'œil : c'est elle qui décide de la partie
    expect(m.texte()).toContain('Le Palladion')
    expect(m.qq('svg > g > g')).toHaveLength(1)
    m.demonter()

    reinitialiser()
    poser({
      battle: bataille({ breche: true }),
      buildings: batiments({ agora: 1, ferme: 2, scierie: 2 }, { ferme: 40 }),
    })
    m = monterSvg(<SanteBatiments />)
    // la ferme est entamée : sa jauge s'ajoute à celle du cœur
    expect(m.qq('svg > g > g')).toHaveLength(2)
  })
})

/** bâtiments complets, avec des points de structure posés à la main si besoin */
function batiments(niveaux: Record<string, number>, hp: Record<string, number> = {}) {
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
  const out = {} as Record<(typeof ids)[number], { level: number; hp?: number }>
  for (const id of ids) out[id] = { level: niveaux[id] ?? 0, hp: hp[id] }
  return out as never
}
