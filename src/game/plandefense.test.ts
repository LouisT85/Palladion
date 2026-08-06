import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EFFETS_LIGNE, GEO_EXPEDITION, GEO_VILLAGE, ORDRES_NEUTRES, creerBataille, tickBataille } from './combat'
import { SECTEURS, TICK_MS, WALL_HP, troupes } from './data'
import {
  PANS,
  UNITES_PLAN,
  indexDuPan,
  ordresDefense,
  ordresExpedition,
  planAvecOrdre,
  planAvecPan,
  planParDefaut,
  planValide,
  pansDormants,
  pansSansHommes,
  resumePlan,
  type PlanDefense,
} from './plandefense'
import type { BattleState, OrdresBataille } from './types'

/*
 * LE PLAN DE DÉFENSE.
 *
 * Ce qui est éprouvé ici n'est pas « le plan se règle » - un champ d'état se règle
 * toujours. C'est qu'à l'ouverture d'une bataille, le plan devienne des ORDRES
 * JUSTES, et surtout que les deux cas dégradés ne coûtent pas un homme :
 *
 *  · un pan que l'ennemi n'assaille pas ce soir-là ;
 *  · un type d'unité dont on n'a pas encore levé un seul homme.
 *
 * Les deux arrivent tout le temps : le nombre de fronts dépend de la menace, et
 * un plan se règle avant d'avoir une armée.
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
  etatAlea = 20_260_806
  vi.spyOn(Math, 'random').mockImplementation(tirage)
})
afterEach(() => {
  vi.restoreAllMocks()
})

function plan(p: Partial<PlanDefense> = {}): PlanDefense {
  return { ...planParDefaut(), ...p }
}

/** une défense du village, sur les fronts qu'on lui donne */
function defense(fronts: typeof SECTEURS, reglages: Partial<Parameters<typeof creerBataille>[0]> = {}): BattleState {
  return creerBataille({
    attaquants: [{ enemy: 'guerrier', count: 8 }],
    defenseurs: troupes({ hoplite: 4, lancier: 4, archer: 3 }),
    wallLevel: 2,
    now: 0,
    geo: GEO_VILLAGE,
    campJoueur: 'defense',
    wallHpTotal: WALL_HP[2],
    fronts,
    ...reglages,
  })
}

function avancer(b: BattleState, n: number, wallLevel = 2): void {
  let now = 0
  for (let i = 0; i < n; i++) {
    now += TICK_MS
    tickBataille(b, { now, dt: TICK_MS / 1000, wallHp: 0, wallLevel })
  }
}

const debout = (b: BattleState, camp: 'attaque' | 'defense') =>
  b.fighters.filter((f) => f.camp === camp && f.etat !== 'mort').length
const pv = (b: BattleState, camp: 'attaque' | 'defense') =>
  b.fighters.filter((f) => f.camp === camp).reduce((a, f) => a + Math.max(0, f.hp), 0)

// ── Ce que le plan retient ───────────────────────────────────────────────────

describe('un plan se lit et se réécrit sans se corrompre', () => {
  it('part neutre : on tient, on tire tendu, personne n’est posté', () => {
    const p = planParDefaut()
    expect(p.ligne).toBe('tenir')
    expect(p.tir).toBe('tendu')
    expect(Object.keys(p.pans)).toHaveLength(0)
  })

  it('ne poste jamais un bélier : aucun ne défend l’enceinte', () => {
    // `creerBataille` ne met de bélier ni dans la ligne de mêlée ni sur les
    // créneaux. Lui donner un pan serait promettre une garnison inexistante.
    expect(UNITES_PLAN).not.toContain('belier')
    expect(planAvecPan(planParDefaut(), 'belier', 'nord').pans.belier).toBeUndefined()
    expect(planValide({ ligne: 'tenir', tir: 'tendu', pans: { belier: 'nord' } }).pans.belier).toBeUndefined()
  })

  it('désinfecte ce qui vient d’une vieille sauvegarde', () => {
    expect(planValide(undefined)).toEqual(planParDefaut())
    expect(planValide(null)).toEqual(planParDefaut())
    expect(planValide('ordre du jour')).toEqual(planParDefaut())
    // une posture inconnue, un pan qui n'existe plus, un type d'unité inventé
    const sale = planValide({ ligne: 'oblique', tir: 'plongeant', pans: { hoplite: 'ouest', licorne: 'nord' } })
    expect(sale.ligne).toBe('tenir')
    expect(sale.tir).toBe('tendu')
    expect(sale.pans).toEqual({})
    // et ce qui est valide passe intact
    expect(planValide({ ligne: 'charge', tir: 'cloche', pans: { archer: 'nord' } })).toEqual({
      ligne: 'charge',
      tir: 'cloche',
      pans: { archer: 'nord' },
    })
  })

  it('se modifie sans jamais s’altérer sur place', () => {
    const origine = plan({ pans: { archer: 'nord' } })
    const apres = planAvecPan(planAvecOrdre(origine, 'ligne', 'mur'), 'hoplite', 'sud')
    expect(apres.ligne).toBe('mur')
    expect(apres.pans).toEqual({ archer: 'nord', hoplite: 'sud' })
    // l'original n'a pas bougé d'un cheveu
    expect(origine.ligne).toBe('tenir')
    expect(origine.pans).toEqual({ archer: 'nord' })
    // et l'on sait rendre un type au plus pressé
    expect(planAvecPan(apres, 'archer', null).pans.archer).toBeUndefined()
  })

  it('refuse un ordre qui n’existe pas plutôt que de l’écrire', () => {
    const p = plan({ ligne: 'charge' })
    expect(planAvecOrdre(p, 'ligne', 'oblique' as never).ligne).toBe('charge')
    expect(planAvecOrdre(p, 'tir', 'plongeant' as never).tir).toBe('tendu')
  })

  it('se résume en une ligne', () => {
    expect(resumePlan(planParDefaut())).toContain('aucun pan assigné')
    expect(resumePlan(plan({ pans: { archer: 'nord', hoplite: 'sud' } }))).toContain('2 pans tenus')
  })
})

// ── Un pan se désigne par son nom, jamais par son rang ────────────────────────

describe('le plan nomme les pans, la bataille les numérote', () => {
  it('retrouve le rang du pan quel que soit l’ordre des fronts du soir', () => {
    // `choisirFronts` mêle les flancs : le mur du nord est le rang 1 un soir et
    // le rang 2 le lendemain. Un plan qui garderait un rang se tromperait de mur.
    const b2 = defense([SECTEURS[0], SECTEURS[2]]) // porte, nord
    const b3 = defense([SECTEURS[0], SECTEURS[1], SECTEURS[2]]) // porte, sud, nord
    expect(indexDuPan('nord', b2.secteurs)).toBe(1)
    expect(indexDuPan('nord', b3.secteurs)).toBe(2)
    expect(indexDuPan('porte', b3.secteurs)).toBe(0)
    expect(ordresDefense(plan({ pans: { archer: 'nord' } }), b2.secteurs).secteurs.archer).toBe(1)
    expect(ordresDefense(plan({ pans: { archer: 'nord' } }), b3.secteurs).secteurs.archer).toBe(2)
  })

  it('ne connaît pas de pan qui n’est pas dans SECTEURS', () => {
    const b = defense(SECTEURS)
    expect(indexDuPan('ouest', b.secteurs)).toBeNull()
    expect(PANS.map((p) => p.id)).toEqual(['porte', 'sud', 'nord'])
  })
})

// ── L'adoption à l'ouverture ─────────────────────────────────────────────────

describe('une bataille adopte le plan à son ouverture', () => {
  it('prend la posture et la façon de tirer du plan', () => {
    const b = defense(SECTEURS)
    const o = ordresDefense(plan({ ligne: 'mur', tir: 'cloche' }), b.secteurs)
    expect(o.ligne).toBe('mur')
    expect(o.tir).toBe('cloche')
  })

  it('laisse la main libre au premier choc : aucun délai à courir', () => {
    // le plan ne doit pas coûter cinq secondes de main morte à l'ouverture
    const o = ordresDefense(plan({ ligne: 'charge' }), defense(SECTEURS).secteurs)
    expect(o.prochainAt).toBe(0)
  })

  it('poste réellement les hommes sur leur pan', () => {
    /*
     * La preuve par le terrain : les hoplites du plan tiennent le NORD alors que
     * toute la menace entre par le SUD. Sans plan, ils y courent tous.
     */
    const posteAuNord = (avecPlan: boolean): number => {
      const b = defense(SECTEURS, { defenseurs: troupes({ hoplite: 4 }), wallLevel: 0, wallHpTotal: 0 })
      const iNord = b.secteurs.findIndex((s) => s.nom.includes('nord'))
      const iSud = b.secteurs.findIndex((s) => s.nom.includes('sud'))
      b.ordres = avecPlan
        ? ordresDefense(plan({ pans: { hoplite: 'nord' } }), b.secteurs)
        : ordresDefense(planParDefaut(), b.secteurs)
      for (const f of b.fighters) {
        if (f.camp !== 'attaque') continue
        f.secteur = iSud
        f.etat = 'melee'
        f.x = b.secteurs[iSud].x
        f.y = b.secteurs[iSud].y - 20
        f.tx = f.x
        f.ty = f.y
      }
      // on veut lire où vont les hommes, pas combien de temps l'ennemi survit
      for (const f of b.fighters) f.hp = 1e6
      avancer(b, 40, 0)
      const nord = b.secteurs[iNord]
      return b.fighters.filter(
        (f) => f.camp === 'defense' && !f.heros && Math.hypot(f.x - nord.x, f.y - nord.y) < 140,
      ).length
    }
    expect(posteAuNord(true)).toBeGreaterThan(0)
    expect(posteAuNord(false)).toBe(0)
  })

  it('ne pilote pas la bataille à distance : les ordres sont une copie', () => {
    /*
     * Le plan est lu UNE fois. S'il partageait sa table de pans avec les ordres
     * de la bataille, le régler en pleine mêlée déplacerait la garnison sans
     * attendre `DELAI_ORDRE_MS` - le plan deviendrait la porte de service du
     * délai. On vérifie donc qu'aucune référence ne fuit.
     */
    const p = plan({ ligne: 'mur', pans: { archer: 'nord' } })
    const b = defense(SECTEURS)
    b.ordres = ordresDefense(p, b.secteurs)
    p.pans.archer = 'sud'
    p.pans.hoplite = 'porte'
    p.ligne = 'charge'
    expect(b.ordres.secteurs.archer).toBe(b.secteurs.findIndex((s) => s.nom.includes('nord')))
    expect(b.ordres.secteurs.hoplite).toBeUndefined()
    expect(b.ordres.ligne).toBe('mur')
  })
})

// ── Cas dégradé n° 1 : le pan n'est pas assailli ce soir ──────────────────────

describe('un pan que personne n’assaille ce soir', () => {
  const fronts = [SECTEURS[0], SECTEURS[2]] // porte + nord ; le sud est tranquille

  it('laisse dormir l’ordre au lieu de le reporter ailleurs', () => {
    const b = defense(fronts)
    const o = ordresDefense(plan({ pans: { hoplite: 'sud', archer: 'nord' } }), b.secteurs)
    // le pan du sud n'existe pas ce soir : l'ordre ne commande personne…
    expect(o.secteurs.hoplite).toBeUndefined()
    // …et surtout il ne se rabat pas sur un autre mur
    expect(o.secteurs.archer).toBe(1)
    expect(pansDormants(plan({ pans: { hoplite: 'sud', archer: 'nord' } }), b.secteurs)).toEqual(['hoplite'])
  })

  it('rend exactement la bataille d’un chef sans plan - pas un homme de moins', () => {
    /*
     * MESURÉ. Trois façons de traiter le pan absent, à graine égale :
     *
     *   sans plan            1100 dégâts · 14,4 défenseurs debout
     *   ordre endormi        1100 dégâts · 14,4 défenseurs debout   ← identique
     *   ordre reporté (rang) 1100 dégâts · 12,7 défenseurs debout   ← 1,7 homme
     *
     * Reporter, c'est ce que ferait un plan qui rangerait ses pans par index :
     * `secteurAssigne` rabat le rang trop grand sur le dernier secteur existant,
     * et la garnison va tenir un mur que le joueur n'a pas désigné. 1,7 homme sur
     * 14,4 par assaut, pour rien.
     */
    const courir = (o: OrdresBataille) => {
      etatAlea = 4242
      const b = defense(fronts, {
        attaquants: [
          { enemy: 'guerrier', count: 10 },
          { enemy: 'belier', count: 2 },
        ],
        defenseurs: troupes({ hoplite: 6, lancier: 6, archer: 4 }),
      })
      b.ordres = o
      const pv0 = pv(b, 'attaque')
      avancer(b, 1200)
      return { debout: debout(b, 'defense'), degats: pv0 - pv(b, 'attaque'), hommes: b.fighters.length }
    }
    const sansPlan = courir({ ...ORDRES_NEUTRES, secteurs: {} })
    const endormi = courir(ordresDefense(plan({ pans: { hoplite: 'sud' } }), defense(fronts).secteurs))
    const reporte = courir({ ...ORDRES_NEUTRES, secteurs: { hoplite: 2 } })
    expect(endormi.hommes).toBe(sansPlan.hommes)
    expect(endormi.debout).toBe(sansPlan.debout)
    expect(endormi.degats).toBeCloseTo(sansPlan.degats, 6)
    // et le report, lui, coûte des hommes
    expect(reporte.debout).toBeLessThan(endormi.debout)
  })

  it('garde l’ordre dans le plan : le mur du sud sera bien assailli un jour', () => {
    const p = plan({ pans: { hoplite: 'sud' } })
    const b = defense(fronts)
    ordresDefense(p, b.secteurs)
    expect(p.pans.hoplite).toBe('sud')
    // le soir où l'ennemi vient par le sud, l'ordre reprend tout seul
    expect(ordresDefense(p, defense(SECTEURS).secteurs).secteurs.hoplite).toBe(
      defense(SECTEURS).secteurs.findIndex((s) => s.nom.includes('sud')),
    )
  })
})

// ── Cas dégradé n° 2 : le type d'unité n'existe pas encore ────────────────────

describe('un pan confié à des hommes qu’on n’a pas', () => {
  it('n’ôte personne de la bataille et ne casse rien', () => {
    const p = plan({ pans: { hoplite: 'nord', char: 'sud', frondeur: 'porte' } })
    const b = defense(SECTEURS, { defenseurs: troupes({ lancier: 6, archer: 2 }) })
    b.ordres = ordresDefense(p, b.secteurs)
    // l'ordre est écrit, il ne commande simplement personne
    expect(b.ordres.secteurs.char).toBe(b.secteurs.findIndex((s) => s.nom.includes('sud')))
    expect(b.fighters.some((f) => f.type === 'char')).toBe(false)
    const avant = b.fighters.length
    const engagesAvant = debout(b, 'defense')
    avancer(b, 300)
    expect(b.fighters.length).toBe(avant)
    expect(engagesAvant).toBe(
      troupesVisibles(b, 'lancier') + troupesVisibles(b, 'archer') + b.fighters.filter((f) => f.heros).length,
    )
  })

  it('se signale au joueur plutôt que de le laisser croire son mur garni', () => {
    const p = plan({ pans: { hoplite: 'nord', archer: 'sud' } })
    expect(pansSansHommes(p, { archer: 3 })).toEqual(['hoplite'])
    expect(pansSansHommes(p, { archer: 3, hoplite: 1 })).toEqual([])
    expect(pansSansHommes(p, {})).toEqual(['archer', 'hoplite'])
  })
})

/** combien de figurines représentent ce type dans la bataille */
function troupesVisibles(b: BattleState, type: string): number {
  return b.fighters.filter((f) => f.camp === 'defense' && f.type === type && !f.heros).length
}

// ── L'expédition ─────────────────────────────────────────────────────────────

describe('l’expédition emporte la posture, pas les pans', () => {
  it('adopte la ligne et le tir', () => {
    const o = ordresExpedition(plan({ ligne: 'charge', tir: 'cloche' }))
    expect(o.ligne).toBe('charge')
    expect(o.tir).toBe('cloche')
    expect(EFFETS_LIGNE[o.ligne].sortie).toBe(true)
  })

  it('n’emporte aucun pan', () => {
    const o = ordresExpedition(plan({ pans: { hoplite: 'porte', archer: 'nord', char: 'sud' } }))
    expect(o.secteurs).toEqual({})
  })

  it('et cela ne coûte rien : le pan unique d’une expédition ne change rien', () => {
    /*
     * MESURÉ, à graine égale : poster tout le monde sur le secteur 0 d'une scène
     * d'expédition donne EXACTEMENT les mêmes dégâts qu'un plan sans pan (écart
     * 0,0 % sur 5 graines × 3 postures). L'entrée du secteur 0 est à 41 pas du
     * ralliement, et tous les assaillants portent déjà `secteur = 0`.
     */
    const courir = (secteurs: OrdresBataille['secteurs']) => {
      etatAlea = 777
      const b = creerBataille({
        attaquants: [
          { enemy: 'hoplite', count: 8 },
          { enemy: 'archer', count: 4 },
        ],
        defenseurs: troupes({ lancier: 6, archer: 3 }),
        wallLevel: 1,
        now: 0,
        geo: GEO_EXPEDITION,
        campJoueur: 'attaque',
        wallHpTotal: WALL_HP[1],
      })
      b.ordres = { ...ORDRES_NEUTRES, ligne: 'mur', secteurs }
      const pv0 = pv(b, 'defense')
      etatAlea = 778
      avancer(b, 900, 1)
      return pv0 - pv(b, 'defense')
    }
    expect(courir({ hoplite: 0, archer: 0, lancier: 0 })).toBeCloseTo(courir({}), 6)
  })
})
