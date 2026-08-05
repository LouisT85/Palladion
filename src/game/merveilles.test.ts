import { describe, expect, it } from 'vitest'
import { BUILDING_IDS } from './data'
import {
  MERVEILLES,
  MERVEILLE_IDS,
  MERVEILLE_NEUTRE,
  MERVEILLE_PAR_ID,
  ampleurMerveille,
  coutMerveille,
  dureeMerveille,
  effetEnVigueur,
  effetMerveille,
  merveillesPossibles,
  peutBatirMerveille,
  type SnapMerveille,
} from './merveilles'
import { TECHNO_IDS } from './technologies'
import type { BuildingId, ResourceId } from './types'

/*
 * LES MERVEILLES.
 *
 * Une seule règle compte, et c'est elle qu'on garde sous surveillance : ON N'EN
 * BÂTIT QU'UNE PAR RÈGNE. Tout le reste en découle -
 *
 *  · dès qu'une merveille est engagée, même inachevée, les cinq autres se
 *    ferment. Un test le vérifie sur le verdict ET sur la liste des possibles ;
 *  · le coût doit rester un projet de fin de partie : quatre ressources, et bien
 *    plus qu'un bâtiment au dernier niveau ;
 *  · un chantier en cours ne donne RIEN. L'effet arrive avec l'achèvement, sinon
 *    la merveille serait un simple achat.
 */

const niveaux = (n: number): Record<BuildingId, { level: number }> =>
  Object.fromEntries(BUILDING_IDS.map((b) => [b, { level: n }])) as Record<BuildingId, { level: number }>

const RICHE: Record<ResourceId, number> = { bois: 9999, pierre: 9999, grain: 9999, bronze: 9999 }

const snap = (over: Partial<SnapMerveille> = {}): SnapMerveille => ({
  buildings: niveaux(4),
  resources: { ...RICHE },
  merveille: null,
  ...over,
})

describe('les six projets', () => {
  it('sont six, aux identifiants uniques et retrouvables', () => {
    expect(MERVEILLES).toHaveLength(6)
    expect(new Set(MERVEILLE_IDS).size).toBe(6)
    for (const m of MERVEILLES) expect(MERVEILLE_PAR_ID[m.id], m.id).toBe(m)
  })

  it('se racontent : un nom, un emoji, ce qu’on voit, ce que ça change, ses lignes d’effet', () => {
    for (const m of MERVEILLES) {
      expect(m.nom.trim().length, m.id).toBeGreaterThan(6)
      expect(m.emoji.length, m.id).toBeGreaterThan(0)
      expect(m.desc.trim().length, m.id).toBeGreaterThan(80)
      expect(m.promesse.trim().length, m.id).toBeGreaterThan(30)
      expect(m.effets.length, m.id).toBeGreaterThanOrEqual(3)
    }
  })

  it('coûtent énormément, et dans les quatre ressources : c’est un projet de fin de règne', () => {
    for (const m of MERVEILLES) {
      const c = coutMerveille(m.id)
      for (const r of ['bois', 'pierre', 'grain', 'bronze'] as ResourceId[]) {
        expect(c[r] ?? 0, `${m.id} / ${r}`).toBeGreaterThan(0)
      }
      // trois fois le prix du dernier niveau de l'agora, au moins
      expect(ampleurMerveille(m.id), m.id).toBeGreaterThan(3000)
    }
  })

  it('demandent un chantier long - dix minutes au moins', () => {
    for (const m of MERVEILLES) expect(m.duree, m.id).toBeGreaterThanOrEqual(600)
  })

  it('exigent des bâtiments réels au haut de leur échelle, et des découvertes réelles', () => {
    for (const m of MERVEILLES) {
      expect(m.batiments.length, m.id).toBeGreaterThanOrEqual(2)
      for (const b of m.batiments) {
        expect(BUILDING_IDS, m.id).toContain(b.id)
        expect(b.niveau, `${m.id} / ${b.id}`).toBeGreaterThanOrEqual(3)
      }
      expect(m.technos.length, m.id).toBeGreaterThanOrEqual(2)
      for (const t of m.technos) expect(TECHNO_IDS, `${m.id} → ${t}`).toContain(t)
    }
  })

  it('changent une règle du jeu, pas un pourcentage de plus', () => {
    for (const m of MERVEILLES) {
      const e = m.effet
      const massif =
        (e.planchierRelation ?? 0) >= 25 ||
        (e.murRepareParMin ?? 0) > 0 ||
        (e.preavisMult ?? 1) > 1 ||
        (e.moralPlancher ?? 0) >= 50 ||
        (e.popMult ?? 1) >= 2 ||
        (e.bronzePct ?? 0) >= 0.5 ||
        (e.murPct ?? 0) >= 0.4
      expect(massif, m.id).toBe(true)
    }
  })

  it('sont toutes différentes : aucune ne double le levier principal d’une autre', () => {
    const leviers = MERVEILLES.map((m) => Object.keys(m.effet).sort().join('+'))
    expect(new Set(leviers).size).toBe(6)
  })
})

describe('la règle du règne unique', () => {
  it('laisse tout ouvert quand rien n’est engagé, coffres pleins et village au sommet', () => {
    const possibles = merveillesPossibles(snap(), TECHNO_IDS)
    expect(possibles).toHaveLength(6)
  })

  it('ferme les cinq autres dès qu’un chantier est lancé, avant même son achèvement', () => {
    const s = snap({ merveille: { id: 'phare', faite: false } })
    expect(merveillesPossibles(s, TECHNO_IDS)).toEqual([])
    const v = peutBatirMerveille('jardins', s, TECHNO_IDS)
    expect(v.ok).toBe(false)
    expect(v.dejaEngagee).toBe(true)
    expect(v.manques[0]).toMatch(/Phare/)
    expect(v.manques[0]).toMatch(/qu’une/)
  })

  it('dit d’une merveille achevée qu’elle est bâtie, et non qu’il manque des pierres', () => {
    const s = snap({ merveille: { id: 'theatre', faite: true } })
    const v = peutBatirMerveille('theatre', s, TECHNO_IDS)
    expect(v.manques).toEqual(['Elle est bâtie.'])
    expect(v.dejaEngagee).toBe(true)
  })

  it('distingue le chantier en cours de l’ouvrage fini, pour la même merveille', () => {
    const s = snap({ merveille: { id: 'theatre', faite: false } })
    expect(peutBatirMerveille('theatre', s, TECHNO_IDS).manques).toEqual(['Son chantier est en cours.'])
  })
})

describe('ce qui manque, dit en clair', () => {
  it('énumère les niveaux de bâtiments manquants, tous d’un coup', () => {
    const s = snap({ buildings: { ...niveaux(4), forge: { level: 2 }, caserne: { level: 1 } } })
    const v = peutBatirMerveille('grande-forge', s, TECHNO_IDS)
    expect(v.ok).toBe(false)
    expect(v.manques.some((x) => /Forge de bronze niveau 4/.test(x))).toBe(true)
    expect(v.manques.some((x) => /Caserne niveau 3/.test(x))).toBe(true)
  })

  it('nomme les découvertes manquantes par leur nom, pas par leur identifiant', () => {
    const v = peutBatirMerveille('jardins', snap(), [])
    expect(v.manques.some((x) => /Irrigation par canaux/.test(x))).toBe(true)
    expect(v.manques.some((x) => /Greffe de l’olivier/.test(x))).toBe(true)
    expect(v.manques.some((x) => /irrigation$/.test(x))).toBe(false)
  })

  it('chiffre ce qui manque dans les coffres, en français', () => {
    const s = snap({ resources: { bois: 0, pierre: 9999, grain: 9999, bronze: 9999 } })
    const v = peutBatirMerveille('phare', s, TECHNO_IDS)
    expect(v.manques.some((x) => /1600 bois de plus/.test(x))).toBe(true)
  })

  it('cumule les trois familles de manques sans en cacher aucune', () => {
    const s = snap({ buildings: niveaux(2), resources: { bois: 0, pierre: 0, grain: 0, bronze: 0 } })
    const v = peutBatirMerveille('murs-poseidon', s, [])
    expect(v.manques.length).toBeGreaterThanOrEqual(2 + 2 + 4)
    expect(v.dejaEngagee).toBe(false)
  })

  it('ne dit plus rien quand tout est réuni', () => {
    expect(peutBatirMerveille('phare', snap(), TECHNO_IDS)).toEqual({ ok: true, manques: [], dejaEngagee: false })
  })

  it('signale une merveille inconnue au lieu de faire semblant', () => {
    const v = peutBatirMerveille('colosse', snap(), TECHNO_IDS)
    expect(v.ok).toBe(false)
    expect(v.manques).toEqual(['Merveille inconnue.'])
    expect(coutMerveille('colosse')).toEqual({})
    expect(dureeMerveille('colosse')).toBe(0)
  })

  it('tolère un instantané sans champ merveille - les vieilles sauvegardes n’en ont pas', () => {
    const s: SnapMerveille = { buildings: niveaux(4), resources: { ...RICHE } }
    expect(peutBatirMerveille('phare', s, TECHNO_IDS).ok).toBe(true)
  })
})

describe('les effets', () => {
  it('ne donnent rien tant que le chantier n’est pas fini', () => {
    expect(effetEnVigueur({ id: 'grande-forge', faite: false })).toEqual(MERVEILLE_NEUTRE)
    expect(effetEnVigueur({ id: 'grande-forge', faite: true }).bronzePct).toBe(0.8)
    expect(effetEnVigueur(null)).toEqual(MERVEILLE_NEUTRE)
    expect(effetEnVigueur(undefined)).toEqual(MERVEILLE_NEUTRE)
  })

  it('renvoient l’effet neutre pour un identifiant absent ou inconnu', () => {
    expect(effetMerveille(null)).toEqual(MERVEILLE_NEUTRE)
    expect(effetMerveille('colosse')).toEqual(MERVEILLE_NEUTRE)
  })

  it('garantissent une ferveur qui ne retombe plus, pour le Palladion doré', () => {
    const e = effetMerveille('palladion-dore')
    expect(e.planchierRelation).toBe(40)
    expect(e.faveurPct).toBeGreaterThan(0.2)
  })

  it('font se remaçonner l’enceinte des Murs de Poséidon, sans rien payer', () => {
    const e = effetMerveille('murs-poseidon')
    expect(e.murPct).toBe(0.5)
    expect(e.murRepareParMin).toBeGreaterThan(0)
    expect(e.murRepareParMin).toBeLessThan(0.2)
  })

  it('ouvrent la mer et doublent l’alerte pour le Phare', () => {
    const e = effetMerveille('phare')
    expect(e.preavisMult).toBe(2)
    expect(e.revelerFronts).toBe(true)
    expect(e.merOuverte).toBe(true)
  })
})

describe('la durée du chantier', () => {
  it('vaut la durée écrite quand aucun engin n’a été inventé', () => {
    expect(dureeMerveille('theatre', [])).toBe(MERVEILLE_PAR_ID['theatre'].duree * 1000)
  })

  it('raccourcit avec la poulie et la corde - c’est à cela qu’elles servent', () => {
    const nu = dureeMerveille('murs-poseidon', [])
    const outille = dureeMerveille('murs-poseidon', ['corde', 'poulie'])
    expect(outille).toBeLessThan(nu)
    expect(outille / nu).toBeCloseTo(0.8, 2)
  })

  it('ne descend jamais sous la moitié, l’arbre entier acquis', () => {
    for (const m of MERVEILLES) {
      expect(dureeMerveille(m.id, TECHNO_IDS), m.id).toBeGreaterThanOrEqual(m.duree * 1000 * 0.5)
    }
  })
})
