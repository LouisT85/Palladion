import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CHAMPIONS,
  CHAMPION_PAR_ID,
  chanceChampion,
  championsPossibles,
  ficheChampion,
  tirerChampion,
} from './champions'
import { FORCE_CHAMPION_NUIT, GEO_VILLAGE, creerBataille, resoudreHorsLigne, tickBataille } from './combat'
import { SECTEURS, TICK_MS, WALL_HP, troupes } from './data'
import { HEROS, HERO_IDS } from './heros'
import type { BattleState, HeroId } from './types'

/*
 * LES CHAMPIONS ACHÉENS.
 *
 * Une vague, c'était un budget dépensé en pillards : toutes se ressemblaient,
 * seulement plus grosses. Un champion met un NOM en tête de colonne - et pas
 * n'importe lequel : l'un des huit héros que le joueur peut recruter.
 *
 * Trois promesses, et ce sont elles qu'on éprouve ici :
 *  · un héros à votre service ne peut pas vous assiéger ;
 *  · sa capacité est retournée contre vous, mais elle est ANNONCÉE ;
 *  · l'abattre l'éteint sur-le-champ.
 */

let etatAlea = 0
function tirage(): number {
  etatAlea = (etatAlea + 0x6d2b79f5) >>> 0
  let t = etatAlea
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
beforeEach(() => {
  etatAlea = 20_260_802
  vi.spyOn(Math, 'random').mockImplementation(tirage)
})
afterEach(() => {
  vi.restoreAllMocks()
})

function assaut(champion: HeroId, reglages: Partial<Parameters<typeof creerBataille>[0]> = {}): BattleState {
  return creerBataille({
    attaquants: [{ enemy: 'pillard', count: 6 }],
    defenseurs: troupes({ lancier: 6, archer: 3 }),
    wallLevel: 2,
    now: 0,
    geo: GEO_VILLAGE,
    campJoueur: 'defense',
    wallHpTotal: WALL_HP[2],
    champion: CHAMPION_PAR_ID[champion],
    ...reglages,
  })
}

function avancerJusqua(b: BattleState, ms: number, depuis = 0): ReturnType<typeof tickBataille> {
  let now = depuis
  let out = tickBataille(b, { now, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 2 })
  while (now < ms) {
    now += TICK_MS
    out = tickBataille(b, { now, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 2 })
  }
  return out
}

describe('la table des champions', () => {
  it('ne nomme que des héros existants, et pas deux fois le même', () => {
    expect(CHAMPIONS.length).toBeGreaterThan(3)
    expect(new Set(CHAMPIONS.map((c) => c.id)).size).toBe(CHAMPIONS.length)
    for (const c of CHAMPIONS) {
      expect(HERO_IDS, c.id).toContain(c.id)
      // le nom vient de la fiche du héros : c'est le MÊME homme, pas un sosie
      expect(ficheChampion(c.id).nom).toBe(HEROS[c.id].nom)
      expect(c.presage.trim().length, c.id).toBeGreaterThan(40)
      expect(c.capacite.desc.trim().length, c.id).toBeGreaterThan(30)
      // il faut le voir venir : aucune manœuvre ne tombe dans les dix premières secondes
      expect(c.capacite.delai, c.id).toBeGreaterThanOrEqual(10_000)
      expect(c.butin.bronze, c.id).toBeGreaterThan(0)
    }
  })

  it('échelonne les venues : les plus grands noms exigent la plus grosse menace', () => {
    const achille = CHAMPION_PAR_ID.achille
    const enee = CHAMPION_PAR_ID.enee
    expect(achille.menaceMin).toBeGreaterThan(enee.menaceMin)
    // et il frappe plus fort que lui, sinon son seuil n'aurait aucun sens
    expect(achille.frappe).toBeGreaterThan(enee.frappe)
    // aucun champion ne se présente à un village tranquille
    expect(Math.min(...CHAMPIONS.map((c) => c.menaceMin))).toBeGreaterThanOrEqual(40)
  })

  it('monte doucement en probabilité, et jamais sous une menace de quarante', () => {
    expect(chanceChampion(0)).toBe(0)
    expect(chanceChampion(39)).toBe(0)
    expect(chanceChampion(60)).toBeGreaterThan(0)
    expect(chanceChampion(100)).toBeGreaterThan(chanceChampion(60))
    // même au pire, deux assauts sur trois restent anonymes
    expect(chanceChampion(100)).toBeLessThan(0.4)
  })
})

describe('qui peut venir vous assiéger', () => {
  it('écarte ceux qui mangent à votre table - c’est la raison d’aller les chercher', () => {
    const tous = championsPossibles(100, []).map((c) => c.id)
    expect(tous).toContain('achille')
    const sansAchille = championsPossibles(100, ['achille']).map((c) => c.id)
    expect(sansAchille).not.toContain('achille')
    expect(sansAchille.length).toBe(tous.length - 1)
  })

  it('n’envoie personne que la menace n’appelle', () => {
    for (const c of championsPossibles(46, [])) expect(c.menaceMin, c.id).toBeLessThanOrEqual(46)
    expect(championsPossibles(10, [])).toHaveLength(0)
  })

  it('ne tire rien quand le dé refuse, et respecte les indisponibles quand il accepte', () => {
    // `alea` au-dessus de la chance : personne ne vient
    expect(tirerChampion(100, [], 0.3, 0.9, 0.5)).toBeNull()
    // le dé accepte : quelqu'un vient, jamais l'un des vôtres
    const miens = HERO_IDS.filter((h) => h !== 'ajax')
    const tire = tirerChampion(100, miens, 1, 0, 0.5)
    expect(tire?.id).toBe('ajax')
    // tous à votre service : la plaine reste vide
    expect(tirerChampion(100, [...HERO_IDS], 1, 0, 0.5)).toBeNull()
  })
})

describe('le champion sur le champ de bataille', () => {
  it('marche en tête de colonne, sous son nom, plus dur qu’un mercenaire', () => {
    const b = assaut('achille')
    const lui = b.fighters.find((f) => f.heros === 'achille')!
    expect(lui).toBeDefined()
    expect(lui.camp).toBe('attaque')
    expect(b.champion?.nom).toBe('Achille')
    // il vaut plusieurs mercenaires : ce n'est pas un pillard déguisé
    const plusDur = Math.max(...b.fighters.filter((f) => f.camp === 'attaque' && !f.heros).map((f) => f.maxHp))
    expect(lui.maxHp).toBeGreaterThan(plusDur * 2)
  })

  it('lance sa manœuvre à l’heure dite, et une seule fois', () => {
    const b = assaut('achille')
    const delai = CHAMPION_PAR_ID.achille.capacite.delai
    // avant l'heure, rien
    expect(avancerJusqua(b, delai - 2000).championAgit).toBeNull()
    expect(b.champion!.lancee).toBe(false)
    // à l'heure, la fureur tombe
    let vue: string | null = null
    let now = delai - 2000
    for (let i = 0; i < 20; i++) {
      now += TICK_MS
      const out = tickBataille(b, { now, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 2 })
      if (out.championAgit) vue = out.championAgit
    }
    expect(vue).toBe(CHAMPION_PAR_ID.achille.capacite.nom)
    expect(b.champion!.lancee).toBe(true)
    expect(b.champion!.atkUntil).toBeGreaterThan(0)
    // et pas deux fois
    let encore = false
    for (let i = 0; i < 40; i++) {
      now += TICK_MS
      if (tickBataille(b, { now, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 2 }).championAgit) encore = true
    }
    expect(encore).toBe(false)
  })

  it('sa fureur fait frapper toute la colonne plus fort', () => {
    /*
     * On compare les dégâts encaissés par la garnison sur une même fenêtre, avec
     * et sans champion. Personne ne meurt : c'est le multiplicateur qu'on lit, pas
     * le nombre de survivants.
     */
    const subi = (avec: boolean): number => {
      const b = avec
        ? assaut('achille', { defenseurs: troupes({ lancier: 8 }) })
        : creerBataille({
            attaquants: [{ enemy: 'pillard', count: 6 }],
            defenseurs: troupes({ lancier: 8 }),
            wallLevel: 0,
            now: 0,
            geo: GEO_VILLAGE,
            campJoueur: 'defense',
            wallHpTotal: 0,
          })
      // tout le monde au contact, tout le monde increvable
      const r = b.geo.ralliement
      for (const f of b.fighters) {
        f.hp = 1e6
        f.maxHp = 1e6
        f.nextHit = 0
        if (f.camp === 'attaque') {
          f.etat = 'melee'
          f.x = r.x + 12
          f.y = r.y
          f.tx = f.x
          f.ty = f.y
        }
      }
      for (const s of b.secteurs) {
        s.hp = 0
        s.breche = true
      }
      // on se place APRÈS le déclenchement de la fureur
      const debut = CHAMPION_PAR_ID.achille.capacite.delai + 1000
      let now = debut - TICK_MS
      tickBataille(b, { now, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 0 })
      const avant = b.fighters.filter((f) => f.camp === 'defense').reduce((a, f) => a + f.hp, 0)
      for (let i = 0; i < 40; i++) {
        now += TICK_MS
        tickBataille(b, { now, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 0 })
      }
      return avant - b.fighters.filter((f) => f.camp === 'defense').reduce((a, f) => a + f.hp, 0)
    }
    expect(subi(true)).toBeGreaterThan(subi(false))
  })

  it('l’abattre éteint sa manœuvre sur-le-champ', () => {
    const b = assaut('achille')
    const delai = CHAMPION_PAR_ID.achille.capacite.delai
    avancerJusqua(b, delai + 1500)
    expect(b.champion!.lancee).toBe(true)
    expect(b.champion!.atkUntil).toBeGreaterThan(delai)
    // on le tue
    const lui = b.fighters.find((f) => f.heros === 'achille')!
    lui.hp = 0
    lui.etat = 'mort'
    const out = tickBataille(b, { now: delai + 1750, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 2 })
    expect(out.championAbattu).toBe(true)
    expect(b.champion!.abattu).toBe(true)
    // la fureur retombe avec lui : plus aucune fenêtre ouverte
    expect(b.champion!.atkUntil).toBe(0)
    // et on ne l'annonce qu'une fois
    expect(tickBataille(b, { now: delai + 2000, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 2 }).championAbattu).toBe(
      false,
    )
  })

  it('Ulysse et Hector sapent le pan le plus entamé, pas un autre', () => {
    for (const qui of ['ulysse', 'hector'] as const) {
      const b = assaut(qui, { fronts: SECTEURS, wallHpTotal: 900 })
      const delai = CHAMPION_PAR_ID[qui].capacite.delai
      /*
       * On avance jusqu'à la veille de la manœuvre AVANT d'entamer le mur du sud :
       * le poser d'emblée le ferait tomber sous les coups ordinaires du siège, et
       * un pan déjà percé n'est plus sapable. Ce qu'on mesure ensuite est la
       * MORSURE d'un seul battement, pas l'usure de vingt secondes.
       */
      let now = 0
      while (now < delai - TICK_MS) {
        now += TICK_MS
        tickBataille(b, { now, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 2 })
      }
      // le pan qui va lâcher, tel que le siège l'a laissé : c'est celui-là que
      // l'on doit voir s'ouvrir, et aucun autre
      const debout = b.secteurs.filter((sec) => !sec.breche && sec.hp > 0)
      expect(debout.length, qui).toBeGreaterThan(1)
      const faible = [...debout].sort((x, y) => x.hp - y.hp)[0]
      const autres = debout.filter((sec) => sec !== faible)
      const avantFaible = faible.hp
      const avantAutres = autres.map((sec) => sec.hp)
      let agi: string | null = null
      while (!agi && now < delai + 4000) {
        now += TICK_MS
        agi = tickBataille(b, { now, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 2 }).championAgit
      }
      expect(agi, qui).toBe(CHAMPION_PAR_ID[qui].capacite.nom)
      // il perd d'un coup une bonne part de ce qui lui restait
      expect(faible.hp, qui).toBeLessThan(avantFaible * 0.75)
      // tandis que les autres n'encaissent qu'un battement de siège ordinaire
      autres.forEach((sec, i) => expect(sec.hp, `${qui} / ${sec.nom}`).toBeGreaterThan(avantAutres[i] * 0.9))
    }
  })

  it('Agamemnon fait donner la réserve : la colonne grossit en pleine bataille', () => {
    const b = assaut('agamemnon')
    const avant = b.fighters.filter((f) => f.camp === 'attaque').length
    avancerJusqua(b, CHAMPION_PAR_ID.agamemnon.capacite.delai + 1500)
    const apres = b.fighters.filter((f) => f.camp === 'attaque').length
    expect(apres).toBeGreaterThan(avant)
  })

  it('Ajax couvre les siens : ils encaissent moins une fois son bouclier levé', () => {
    const b = assaut('ajax', { defenseurs: troupes({ lancier: 8 }) })
    const delai = CHAMPION_PAR_ID.ajax.capacite.delai
    avancerJusqua(b, delai + 1000)
    expect(b.champion!.reducUntil).toBeGreaterThan(delai)
    expect(b.champion!.reduc).toBeCloseTo(0.4)
  })
})

describe('la nuit ne l’efface pas', () => {
  it('une colonne menée par un champion frappe plus fort, onglet fermé', () => {
    const vague = [{ enemy: 'guerrier' as const, count: 8 }]
    const garnison = troupes({ lancier: 6, archer: 4 })
    const sans = resoudreHorsLigne(vague, garnison, 2, WALL_HP[2], 1, SECTEURS, false)
    const avec = resoudreHorsLigne(vague, garnison, 2, WALL_HP[2], 1, SECTEURS, true)
    expect(FORCE_CHAMPION_NUIT).toBeGreaterThan(1)
    expect(avec.degatsRemparts).toBeGreaterThan(sans.degatsRemparts)
    const pertes = (r: typeof sans) => Object.values(r.pertes).reduce((a, n) => a + n, 0)
    expect(pertes(avec)).toBeGreaterThanOrEqual(pertes(sans))
  })
})
