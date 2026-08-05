import { describe, expect, it } from 'vitest'
import { DEFENSES_DEFS, DEFENSE_IDS, DPS_BATIMENT, hpAcropole, structureMax } from './data'
import { creerBataille, tickBataille, type CibleBatiment } from './combat'
import { GEO_VILLAGE } from './combat'
import type { DefensesInterieures } from './types'

/*
 * Les cinq ouvrages de l'intérieur et la structure des bâtiments. Ce qui est
 * vérifié ici, c'est la PROMESSE faite au joueur : la chute du mur n'est plus la
 * fin de la partie, et chacun des ouvrages change quelque chose de mesurable.
 */

const RIEN: DefensesInterieures = {
  acropole: 0,
  bastion: false,
  galeries: false,
  poterne: false,
  citerne: false,
}

function batailleOuverte(tours = 0) {
  const b = creerBataille({
    attaquants: [{ enemy: 'pillard', count: 6 }],
    defenseurs: { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 },
    wallLevel: 2,
    now: 0,
    geo: GEO_VILLAGE,
    campJoueur: 'defense',
    tours,
    wallHpTotal: 600,
  })
  // on ouvre tous les pans : c'est l'intérieur qu'on veut éprouver
  for (const s of b.secteurs) {
    s.hp = 0
    s.breche = true
  }
  b.breche = true
  return b
}

/** amène tous les assaillants au contact du bâtiment visé */
function poserAuContact(b: ReturnType<typeof batailleOuverte>, c: CibleBatiment) {
  for (const f of b.fighters) {
    if (f.camp !== 'attaque') continue
    f.etat = 'melee'
    f.x = c.x + 4
    f.y = c.y + 4
  }
}

describe('structure des bâtiments', () => {
  it('donne au cœur bien plus de tenue qu’à un atelier de même niveau', () => {
    for (const n of [1, 2, 3, 4]) {
      expect(structureMax('agora', n)).toBeGreaterThan(structureMax('ferme', n) * 3)
    }
  })

  it('fait du cœur le bâtiment le plus dur du village', () => {
    const coeur = structureMax('agora', 4) + hpAcropole(2)
    expect(coeur).toBeGreaterThan(structureMax('ferme', 4) * 5)
  })

  it('ne donne aucune structure aux remparts (ils ont leurs pans)', () => {
    expect(structureMax('remparts', 4)).toBe(0)
  })

  it('croît avec le niveau', () => {
    expect(structureMax('ferme', 3)).toBeGreaterThan(structureMax('ferme', 1))
  })
})

describe('les assaillants s’en prennent aux bâtiments', () => {
  it('entame un atelier quand il n’y a plus personne pour le défendre', () => {
    const b = batailleOuverte()
    const cible: CibleBatiment = { id: 'ferme', x: 330, y: 655, hp: 200 }
    poserAuContact(b, cible)
    const avant = cible.hp
    for (let i = 0; i < 40; i++) {
      tickBataille(b, { now: i * 250, dt: 0.25, wallHp: 0, wallLevel: 2, cibles: [cible], defenses: RIEN })
    }
    expect(cible.hp).toBeLessThan(avant)
  })

  it('ne finit pas la bataille tant que le cœur tient — le mur tombé ne suffit plus', () => {
    const b = batailleOuverte()
    const coeur: CibleBatiment = { id: 'agora', x: 560, y: 445, hp: 400, coeur: true }
    poserAuContact(b, coeur)
    const out = tickBataille(b, {
      now: 250,
      dt: 0.25,
      wallHp: 0,
      wallLevel: 2,
      cibles: [coeur],
      defenses: RIEN,
    })
    expect(out.finie).toBe(false)
  })

  it('conclut au pillage dès que le cœur est abattu', () => {
    const b = batailleOuverte()
    const coeur: CibleBatiment = { id: 'agora', x: 560, y: 445, hp: 0, coeur: true }
    poserAuContact(b, coeur)
    const out = tickBataille(b, {
      now: 250,
      dt: 0.25,
      wallHp: 0,
      wallLevel: 2,
      cibles: [coeur],
      defenses: RIEN,
    })
    expect(out.finie).toBe(true)
    expect(out.pillage).toBe(true)
  })

  it('épargne le cœur tant qu’un autre bâtiment est debout', () => {
    const b = batailleOuverte()
    const coeur: CibleBatiment = { id: 'agora', x: 560, y: 445, hp: 400, coeur: true }
    // une ferme assez solide pour tenir toute la fenêtre observée
    const ferme: CibleBatiment = { id: 'ferme', x: 565, y: 450, hp: 4000 }
    poserAuContact(b, ferme)
    for (let i = 0; i < 30; i++) {
      tickBataille(b, {
        now: i * 250,
        dt: 0.25,
        wallHp: 0,
        wallLevel: 2,
        cibles: [coeur, ferme],
        defenses: RIEN,
      })
    }
    expect(ferme.hp).toBeLessThan(4000)
    expect(coeur.hp).toBe(400)
  })

  it('se rabat sur le cœur une fois le reste du village en ruine', () => {
    const b = batailleOuverte()
    const coeur: CibleBatiment = { id: 'agora', x: 560, y: 445, hp: 400, coeur: true }
    const ferme: CibleBatiment = { id: 'ferme', x: 565, y: 450, hp: 0 }
    poserAuContact(b, coeur)
    for (let i = 0; i < 20; i++) {
      tickBataille(b, {
        now: i * 250,
        dt: 0.25,
        wallHp: 0,
        wallLevel: 2,
        cibles: [coeur, ferme],
        defenses: RIEN,
      })
    }
    expect(coeur.hp).toBeLessThan(400)
  })
})

describe('les ouvrages de l’intérieur', () => {
  it('l’acropole ajoute de la structure au cœur, par niveau', () => {
    expect(hpAcropole(0)).toBe(0)
    expect(hpAcropole(2)).toBeGreaterThan(hpAcropole(1))
  })

  it('le bastion saigne les assaillants de la porte tant que le pan tient', () => {
    const b = creerBataille({
      attaquants: [{ enemy: 'pillard', count: 4 }],
      defenseurs: { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 },
      wallLevel: 3,
      now: 0,
      geo: GEO_VILLAGE,
      campJoueur: 'defense',
      wallHpTotal: 900,
    })
    for (const f of b.fighters) {
      if (f.camp !== 'attaque') continue
      f.etat = 'siege'
      f.secteur = 0
    }
    const pv = () => b.fighters.filter((f) => f.camp === 'attaque').reduce((a, f) => a + f.hp, 0)
    const avant = pv()
    for (let i = 0; i < 20; i++) {
      tickBataille(b, {
        now: i * 250,
        dt: 0.25,
        wallHp: 900,
        wallLevel: 3,
        defenses: { ...RIEN, bastion: true },
      })
    }
    expect(pv()).toBeLessThan(avant)
  })

  it('les cinq ouvrages sont tous décrits, chiffrés et payables', () => {
    expect(DEFENSE_IDS).toHaveLength(5)
    for (const id of DEFENSE_IDS) {
      const d = DEFENSES_DEFS[id]
      expect(d.nom.length).toBeGreaterThan(3)
      expect(d.desc.length).toBeGreaterThan(40)
      expect(d.couts).toHaveLength(d.max)
      expect(d.effet(1).length).toBeGreaterThan(10)
      expect(d.rempartsRequis).toBeGreaterThanOrEqual(2)
    }
  })

  it('le coût du second niveau d’acropole dépasse celui du premier', () => {
    const [a, b] = DEFENSES_DEFS.acropole.couts
    expect((b.pierre ?? 0)).toBeGreaterThan(a.pierre ?? 0)
  })
})

describe('cadence des coups portés aux bâtiments', () => {
  it('reste modérée : un siège intérieur doit se jouer en minutes, pas en heures', () => {
    // un atelier de niveau 2 sous six pillards ne doit pas tenir plus de deux minutes
    const hp = structureMax('ferme', 2)
    const secondes = hp / (DPS_BATIMENT * 6)
    expect(secondes).toBeLessThan(120)
    expect(secondes).toBeGreaterThan(1)
  })
})
