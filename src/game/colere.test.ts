import { describe, expect, it } from 'vitest'
import { BUILDINGS, BUILDING_IDS, GODS, GOD_IDS, UNIT_IDS } from './data'
import {
  CALAMITES,
  CALAMITE_PAR_ID,
  SEUILS_COLERE,
  SEUIL_HORS_COLERE,
  calamitesPossibles,
  delaiProchaineCalamite,
  descPalier,
  nomPalier,
  paliersColere,
  resumeColere,
  tirerCalamite,
  type SnapColere,
} from './colere'
import type { BuildingId, UnitId } from './types'

/*
 * LA COLÈRE DIVINE.
 *
 * Trois choses sont verrouillées ici, et ce sont exactement celles qui font la
 * différence entre un risque et une brimade :
 *
 *  · les PALIERS SONT ORDONNÉS et ne s'ouvrent que très bas. On ne tombe pas dans
 *    la vengeance de Poséidon par distraction, et remonter la relation les
 *    referme immédiatement - la colère est réparable par le seul geste que le jeu
 *    proposait déjà, le sacrifice ;
 *  · une CALAMITÉ NE SE RÉPÈTE PAS sur la même cible. Deux foudres de suite sur
 *    le même grenier, ce n'est pas une menace, c'est une exécution ;
 *  · un dieu SANS PRISE SE TAIT. Pas d'allié à retourner, pas de soldat à faire
 *    déserter : il ne se rabat pas sur une calamité inventée.
 */

function batiments(niveau = 3): Record<BuildingId, { level: number; ruine?: boolean }> {
  const out = {} as Record<BuildingId, { level: number; ruine?: boolean }>
  for (const b of BUILDING_IDS) out[b] = { level: niveau }
  return out
}

function armee(n = 10): Record<UnitId, number> {
  const out = {} as Record<UnitId, number>
  for (const u of UNIT_IDS) out[u] = n
  return out
}

const T0 = 2_000_000

function snap(patch: Partial<SnapColere> = {}): SnapColere {
  return {
    now: T0,
    buildings: batiments(),
    wallHp: 400,
    wallMax: 500,
    army: armee(),
    alliances: ['cite-lesbos'],
    morale: 70,
    tours: 2,
    derniereCible: null,
    ...patch,
  }
}

/** un état où le dieu n'a strictement aucune prise */
function desert(): SnapColere {
  const vide = {} as Record<BuildingId, { level: number }>
  for (const b of BUILDING_IDS) vide[b] = { level: 0 }
  return snap({ buildings: vide, wallHp: 0, army: armee(0), alliances: [], tours: 0, morale: 0 })
}

const ROLLS = Array.from({ length: 40 }, (_, i) => i / 40)

describe('la table des douze calamités', () => {
  it('donne trois calamités à chacun des quatre Olympiens, aux identifiants uniques', () => {
    expect(CALAMITES).toHaveLength(12)
    expect(new Set(CALAMITES.map((c) => c.id)).size).toBe(12)
    for (const g of GOD_IDS) expect(CALAMITES.filter((c) => c.dieu === g), g).toHaveLength(3)
  })

  it('décrit chacune de façon exploitable : un nom, un emoji, une menace lisible, un poids', () => {
    for (const c of CALAMITES) {
      expect(c.nom.trim().length, c.id).toBeGreaterThan(3)
      expect(c.emoji.length, c.id).toBeGreaterThan(0)
      expect(c.menace.trim().length, c.id).toBeGreaterThan(10)
      expect(c.poids, c.id).toBeGreaterThan(0)
      expect(c.palier, c.id).toBeGreaterThanOrEqual(1)
      expect(c.palier, c.id).toBeLessThanOrEqual(4)
      expect(CALAMITE_PAR_ID[c.id], c.id).toBe(c)
    }
  })

  it('ouvre la plus lourde de chaque dieu plus tard que la plus légère', () => {
    for (const g of GOD_IDS) {
      const liste = CALAMITES.filter((c) => c.dieu === g).sort((a, b) => b.poids - a.poids)
      expect(liste[0].palier, g).toBeLessThanOrEqual(liste[liste.length - 1].palier)
    }
  })

  it('raconte chaque frappe en deux lignes au moins - c’est un événement, pas un toast', () => {
    for (const g of GOD_IDS) {
      for (const roll of [0.05, 0.4, 0.9]) {
        const c = tirerCalamite(g, 4, snap(), roll)
        expect(c, `${g}/${roll}`).not.toBeNull()
        expect(c!.recit.length, c!.defId).toBeGreaterThanOrEqual(2)
        for (const l of c!.recit) expect(l.trim().length, c!.defId).toBeGreaterThan(20)
      }
    }
  })
})

describe('les paliers de colère', () => {
  it('range les quatre seuils du moins grave au plus grave, sans trou', () => {
    expect(SEUILS_COLERE.map((s) => s.palier)).toEqual([1, 2, 3, 4])
    for (let i = 1; i < SEUILS_COLERE.length; i++) {
      expect(SEUILS_COLERE[i].seuil).toBeLessThan(SEUILS_COLERE[i - 1].seuil)
    }
    expect(SEUILS_COLERE[0].seuil).toBe(SEUIL_HORS_COLERE)
  })

  it('lit le palier exactement aux seuils annoncés', () => {
    expect(paliersColere(100)).toBe(0)
    expect(paliersColere(0)).toBe(0)
    expect(paliersColere(-39)).toBe(0)
    expect(paliersColere(-40)).toBe(1)
    expect(paliersColere(-59)).toBe(1)
    expect(paliersColere(-60)).toBe(2)
    expect(paliersColere(-79)).toBe(2)
    expect(paliersColere(-80)).toBe(3)
    expect(paliersColere(-94)).toBe(3)
    expect(paliersColere(-95)).toBe(4)
    expect(paliersColere(-100)).toBe(4)
  })

  it('ne descend jamais quand la relation descend : la suite est monotone', () => {
    let precedent = 0
    for (let r = 100; r >= -100; r--) {
      const p = paliersColere(r)
      expect(p, `relation ${r}`).toBeGreaterThanOrEqual(precedent)
      precedent = p
    }
    expect(precedent).toBe(4)
  })

  it('se referme dès que la relation remonte : la colère est réparable d’un sacrifice', () => {
    expect(paliersColere(-100)).toBe(4)
    // un seul sacrifice qui ramène au-dessus de −40 suffit à tout éteindre
    expect(paliersColere(SEUIL_HORS_COLERE + 1)).toBe(0)
    expect(delaiProchaineCalamite(paliersColere(SEUIL_HORS_COLERE + 1))).toBe(0)
    expect(tirerCalamite('zeus', paliersColere(-20), snap(), 0.5)).toBeNull()
  })

  it('nomme les cinq états, y compris l’apaisement', () => {
    expect(nomPalier(0)).toBe('Apaisé')
    for (const s of SEUILS_COLERE) {
      expect(nomPalier(s.palier)).toBe(s.nom)
      expect(descPalier(s.palier)).toBe(s.desc)
    }
    expect(descPalier(0).length).toBeGreaterThan(10)
  })
})

describe('le délai entre deux calamités', () => {
  it('est nul quand le dieu n’est pas en colère', () => {
    expect(delaiProchaineCalamite(0)).toBe(0)
    expect(delaiProchaineCalamite(0, 0.9)).toBe(0)
  })

  it('raccourcit à chaque palier : plus le dieu est loin, plus il revient vite', () => {
    const d = [1, 2, 3, 4].map((p) => delaiProchaineCalamite(p, 0.5))
    for (let i = 1; i < d.length; i++) expect(d[i], `palier ${i + 1}`).toBeLessThan(d[i - 1])
    expect(d[3]).toBeGreaterThan(30_000)
  })

  it('varie de ±20 % avec le roll, sans jamais sortir de ces bornes', () => {
    for (const p of [1, 2, 3, 4]) {
      const milieu = delaiProchaineCalamite(p, 0.5)
      const bas = delaiProchaineCalamite(p, 0)
      const haut = delaiProchaineCalamite(p, 1)
      expect(bas).toBeLessThan(milieu)
      expect(haut).toBeGreaterThan(milieu)
      expect(bas / milieu).toBeCloseTo(0.8, 2)
      expect(haut / milieu).toBeCloseTo(1.2, 2)
      // un roll aberrant ne doit pas produire un délai négatif ou infini
      expect(delaiProchaineCalamite(p, -5)).toBe(bas)
      expect(delaiProchaineCalamite(p, 5)).toBe(haut)
    }
  })
})

describe('le tirage d’une calamité', () => {
  it('ne rend rien tant que le dieu se tient tranquille', () => {
    for (const g of GOD_IDS) expect(tirerCalamite(g, 0, snap(), 0.5), g).toBeNull()
  })

  it('ne rend jamais la calamité d’un autre dieu, ni une calamité au-dessus du palier', () => {
    for (const g of GOD_IDS) {
      for (const palier of [1, 2, 3, 4]) {
        for (const roll of ROLLS) {
          const c = tirerCalamite(g, palier, snap(), roll)
          if (!c) continue
          expect(c.dieu, `${g}/${palier}`).toBe(g)
          expect(CALAMITE_PAR_ID[c.defId].palier, c.defId).toBeLessThanOrEqual(palier)
          expect(c.palier).toBe(palier)
        }
      }
    }
  })

  it('finit par envoyer les trois calamités de chaque dieu, à son palier maximal', () => {
    for (const g of GOD_IDS) {
      const vus = new Set(ROLLS.map((r) => tirerCalamite(g, 4, snap(), r)?.defId))
      expect(vus.size, g).toBe(3)
    }
  })

  it('donne toujours la même chose pour le même roll et le même état', () => {
    for (const g of GOD_IDS) {
      const a = tirerCalamite(g, 3, snap(), 0.42)
      const b = tirerCalamite(g, 3, snap(), 0.42)
      expect(JSON.stringify(a), g).toBe(JSON.stringify(b))
    }
  })

  it('n’enchaîne JAMAIS deux fois de suite sur la même cible', () => {
    const cibles = ['ferme', 'forge', 'port', 'remparts', 'ambiance', 'sagesse', 'troupe', 'allie', 'tours', 'mer', 'ateliers', 'moral-bataille']
    for (const derniereCible of cibles) {
      for (const g of GOD_IDS) {
        for (const palier of [1, 2, 3, 4]) {
          for (const roll of ROLLS) {
            const c = tirerCalamite(g, palier, snap({ derniereCible }), roll)
            if (c?.cibleId) expect(c.cibleId, `${g}/${palier}/${derniereCible}`).not.toBe(derniereCible)
          }
        }
      }
    }
  })

  it('se rabat sur une autre calamité plutôt que de renoncer, quand la cible est interdite', () => {
    // Poséidon vient de fissurer le mur : il ne recommence pas, mais il agit
    const c = tirerCalamite('poseidon', 2, snap({ derniereCible: 'remparts' }), 0.1)
    expect(c).not.toBeNull()
    expect(c!.defId).not.toBe('poseidon-seisme')
  })

  it('se tait quand il n’a vraiment aucune prise, au lieu d’inventer', () => {
    for (const g of GOD_IDS) {
      const trouves = ROLLS.map((r) => tirerCalamite(g, 2, desert(), r)).filter(Boolean)
      // Athéna peut toujours reprendre sa sagesse ; les trois autres n'ont rien à frapper
      if (g === 'athena') expect(trouves.length, g).toBeGreaterThan(0)
      else expect(trouves, g).toHaveLength(0)
    }
  })
})

describe('les cibles que chaque dieu peut réellement frapper', () => {
  it('ne foudroie ni les remparts (qui ont leurs secteurs) ni un terrain vague', () => {
    const b = batiments(0)
    b.ferme = { level: 2 }
    b.remparts = { level: 4 }
    for (const roll of ROLLS) {
      const c = tirerCalamite('zeus', 1, snap({ buildings: b, alliances: [] }), roll)
      if (c?.effet.type === 'foudre') expect(c.effet.batiment).toBe('ferme')
    }
  })

  it('ne foudroie pas un bâtiment déjà en ruine - une calamité déplace le problème', () => {
    const b = batiments(0)
    b.ferme = { level: 2, ruine: true }
    b.forge = { level: 2 }
    for (const roll of ROLLS) {
      const c = tirerCalamite('zeus', 1, snap({ buildings: b, alliances: [] }), roll)
      if (c?.effet.type === 'foudre') expect(c.effet.batiment).toBe('forge')
    }
  })

  it('frappe plus fort à mesure que le dieu s’éloigne', () => {
    const degats = [1, 2, 3, 4].map((p) => {
      const c = tirerCalamite('zeus', p, snap({ alliances: [] }), 0.01)
      return c?.effet.type === 'foudre' ? c.effet.degats : 0
    })
    for (let i = 1; i < degats.length; i++) expect(degats[i]).toBeGreaterThan(degats[i - 1])
    const parts = [1, 2, 3, 4].map((p) => {
      const c = tirerCalamite('poseidon', p, snap(), 0.01)
      return c?.effet.type === 'seisme' ? c.effet.part : 0
    })
    for (let i = 1; i < parts.length; i++) expect(parts[i]).toBeGreaterThan(parts[i - 1])
  })

  it('ne rompt aucun serment quand il n’y a pas d’allié', () => {
    const sans = ROLLS.map((r) => tirerCalamite('zeus', 4, snap({ alliances: [] }), r)?.defId)
    expect(sans).not.toContain('zeus-serment')
    const avec = ROLLS.map((r) => tirerCalamite('zeus', 4, snap({ alliances: ['cite-lesbos'] }), r)?.defId)
    expect(avec).toContain('zeus-serment')
  })

  it('ne fait déserter que des hommes qui existent', () => {
    const vide = ROLLS.map((r) => tirerCalamite('ares', 4, snap({ army: armee(0) }), r)?.defId)
    expect(vide).not.toContain('ares-desertion')
    const army = armee(0)
    army.hoplite = 7
    for (const roll of ROLLS) {
      const c = tirerCalamite('ares', 1, snap({ army }), roll)
      if (c?.effet.type === 'desertion') {
        expect(c.effet.unite).toBe('hoplite')
        expect(c.effet.nombre).toBeGreaterThan(0)
        expect(c.effet.nombre).toBeLessThanOrEqual(7)
      }
    }
  })

  it('n’aveugle pas des tours qui n’existent pas, et ne brise pas un port absent', () => {
    const sansTours = ROLLS.map((r) => tirerCalamite('athena', 4, snap({ tours: 0 }), r)?.defId)
    expect(sansTours).not.toContain('athena-guet')
    const b = batiments(3)
    b.port = { level: 0 }
    const sansPort = ROLLS.map((r) => tirerCalamite('poseidon', 4, snap({ buildings: b }), r)?.defId)
    expect(sansPort).not.toContain('poseidon-quais')
    expect(sansPort).not.toContain('poseidon-mer')
  })

  it('borne les effets à durée dans le futur, jamais dans le passé', () => {
    for (const g of GOD_IDS) {
      for (const roll of ROLLS) {
        const c = tirerCalamite(g, 4, snap(), roll)
        if (!c) continue
        const e = c.effet
        if ('jusqua' in e) expect(e.jusqua, c.defId).toBeGreaterThan(T0)
        if ('part' in e) {
          expect(e.part, c.defId).toBeGreaterThan(0)
          expect(e.part, c.defId).toBeLessThan(1)
        }
      }
    }
  })

  it('nomme le bâtiment frappé dans son récit, pour que le journal soit lisible', () => {
    for (const roll of ROLLS) {
      const c = tirerCalamite('zeus', 1, snap({ alliances: [] }), roll)
      if (c?.effet.type === 'foudre') {
        expect(c.recit.join(' ')).toContain(BUILDINGS[c.effet.batiment].nom)
        expect(c.cibleId).toBe(c.effet.batiment)
      }
    }
  })
})

describe('ce que le joueur voit de la colère', () => {
  it('ne prévient de rien quand aucun dieu n’est fâché', () => {
    for (const g of GOD_IDS) {
      expect(resumeColere(g, 0), g).toBeNull()
      expect(resumeColere(g, SEUIL_HORS_COLERE + 1), g).toBeNull()
    }
  })

  it('nomme le dieu, le palier, la relation ET le remède - une menace sans issue n’en est pas une', () => {
    for (const g of GOD_IDS) {
      const r = resumeColere(g, -85)!
      expect(r).toContain(GODS[g].nom)
      expect(r).toContain(nomPalier(3))
      expect(r).toContain('-85')
      expect(r).toContain('sacrifice')
    }
  })

  it('annonce exactement ce qui est possible à ce palier, ni plus ni moins', () => {
    for (const g of GOD_IDS) {
      expect(calamitesPossibles(g, 0), g).toHaveLength(0)
      const p1 = calamitesPossibles(g, 1)
      const p4 = calamitesPossibles(g, 4)
      expect(p1.length, g).toBeGreaterThan(0)
      expect(p4.length, g).toBe(3)
      expect(p1.length, g).toBeLessThan(p4.length)
      for (const c of p4) expect(c.dieu, g).toBe(g)
    }
  })
})
