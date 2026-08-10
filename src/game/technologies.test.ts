import { describe, expect, it } from 'vitest'
import { BUILDING_IDS } from './data'
import {
  AGORA_RECHERCHE,
  CLES_EFFETS,
  TECHNOS,
  TECHNOS_NEUTRES,
  TECHNO_IDS,
  TECHNO_PAR_ID,
  arbreTechnos,
  coutPayable,
  coutTechno,
  debloquePar,
  dureeTechno,
  effetsTechnos,
  manquePourTechno,
  rechercheOuverte,
  resumeEffets,
  technosDisponibles,
  type SnapTechno,
} from './technologies'
import type { BuildingId, ResourceId } from './types'

/*
 * L'ARBRE DES DÉCOUVERTES.
 *
 * Ce qui est vérifié ici n'est pas la table des vingt - elle bougera - mais les
 * quatre promesses qu'elle porte :
 *
 *  · l'agora niveau 2 OUVRE la recherche, et rien ne se lance avant ;
 *  · un prérequis manquant est dit EN CLAIR, tous d'un coup, jamais un à la fois ;
 *  · l'arbre est un arbre : pas de cycle, pas de prérequis fantôme, et chaque
 *    racine mène quelque part ;
 *  · les effets se CUMULENT et rien d'autre ne les fabrique.
 */

const niveaux = (n: number): Record<BuildingId, { level: number }> =>
  Object.fromEntries(BUILDING_IDS.map((b) => [b, { level: n }])) as Record<BuildingId, { level: number }>

const RICHE: Record<ResourceId, number> = { bois: 9999, pierre: 9999, grain: 9999, bronze: 9999 }

const snap = (level = 4, res: Partial<Record<ResourceId, number>> = {}, technos: string[] = []): SnapTechno => ({
  buildings: niveaux(level),
  resources: { ...RICHE, ...res },
  technos,
})

describe('la table des vingt-trois découvertes', () => {
  it('en compte vingt, aux identifiants uniques et retrouvables', () => {
    expect(TECHNOS).toHaveLength(23)
    expect(new Set(TECHNO_IDS).size).toBe(23)
    for (const t of TECHNOS) expect(TECHNO_PAR_ID[t.id], t.id).toBe(t)
  })

  it('décrit chacune : un nom, un emoji, une phrase d’histoire, un effet lisible', () => {
    for (const t of TECHNOS) {
      expect(t.nom.trim().length, t.id).toBeGreaterThan(4)
      expect(t.emoji.length, t.id).toBeGreaterThan(0)
      expect(t.desc.trim().length, t.id).toBeGreaterThan(60)
      expect(t.effet.trim().length, t.id).toBeGreaterThan(6)
    }
  })

  it('fait payer chacune en ressources ET en temps - une découverte gratuite n’est pas un arbitrage', () => {
    for (const t of TECHNOS) {
      const total = (Object.keys(t.cout) as ResourceId[]).reduce((a, r) => a + (t.cout[r] ?? 0), 0)
      expect(total, t.id).toBeGreaterThan(0)
      expect(t.duree, t.id).toBeGreaterThanOrEqual(60)
    }
  })

  it('donne à chacune un effet réel, et modeste : rien au-dessus de 20 %', () => {
    for (const t of TECHNOS) {
      const parts = CLES_EFFETS.map((k) => t.bonus[k] ?? 0)
      expect(
        parts.some((v) => v > 0),
        t.id,
      ).toBe(true)
      for (const v of parts) expect(v, t.id).toBeLessThanOrEqual(0.2)
    }
  })

  it('n’exige que des ateliers existants, à un niveau atteignable', () => {
    for (const t of TECHNOS) {
      if (!t.batiment) continue
      expect(BUILDING_IDS, t.id).toContain(t.batiment.id)
      expect(t.batiment.niveau, t.id).toBeGreaterThanOrEqual(1)
      expect(t.batiment.niveau, t.id).toBeLessThanOrEqual(4)
    }
  })

  it('couvre tous les leviers déclarés : aucune clé d’effet ne reste morte', () => {
    for (const k of CLES_EFFETS) {
      expect(
        TECHNOS.some((t) => (t.bonus[k] ?? 0) !== 0),
        k,
      ).toBe(true)
    }
  })
})

describe('l’arbre', () => {
  it('ne renvoie à aucun prérequis fantôme', () => {
    for (const t of TECHNOS) for (const r of t.requiert) expect(TECHNO_IDS, `${t.id} → ${r}`).toContain(r)
  })

  it('ne boucle pas : la profondeur de chacune est finie et croît avec les prérequis', () => {
    const cols = arbreTechnos()
    expect(cols.length).toBeGreaterThanOrEqual(3)
    // toute découverte apparaît une seule fois, et après tous ses prérequis
    const rang = new Map<string, number>()
    cols.forEach((col, i) => col.forEach((t) => rang.set(t.id, i)))
    expect(rang.size).toBe(TECHNOS.length)
    for (const t of TECHNOS) {
      for (const r of t.requiert) expect(rang.get(r)!, `${t.id} après ${r}`).toBeLessThan(rang.get(t.id)!)
    }
  })

  it('a des racines qui mènent quelque part - une racine stérile est un piège', () => {
    const racines = arbreTechnos()[0]
    expect(racines.length).toBeGreaterThanOrEqual(4)
    // au moins la moitié des racines ouvre une branche
    const fertiles = racines.filter((t) => debloquePar(t.id).length > 0)
    expect(fertiles.length).toBeGreaterThanOrEqual(3)
  })

  it('fait de l’écriture une vraie porte : elle garde des découvertes tardives', () => {
    expect(debloquePar('ecriture').length).toBeGreaterThanOrEqual(2)
    expect(TECHNO_PAR_ID['ecriture'].batiment).toEqual({ id: 'temple', niveau: 2 })
  })
})

describe('l’ouverture de la recherche', () => {
  it('reste fermée tant que l’agora n’a pas son second niveau', () => {
    expect(rechercheOuverte(snap(1))).toBe(false)
    expect(rechercheOuverte(snap(AGORA_RECHERCHE))).toBe(true)
  })

  it('ne propose RIEN avec une agora de niveau 1, même le coffre plein', () => {
    expect(technosDisponibles([], snap(1))).toEqual([])
  })

  it('dit l’agora manquante en clair, en toutes lettres', () => {
    const m = manquePourTechno('corde', [], snap(1))
    expect(m.join(' ')).toMatch(/Agora niveau 2/)
  })
})

describe('les prérequis manquants, dits en clair', () => {
  it('énumère TOUT ce qui manque d’un coup : atelier et découverte préalable', () => {
    const s: SnapTechno = { buildings: { ...niveaux(4), forge: { level: 1 }, port: { level: 1 } }, resources: RICHE }
    const m = manquePourTechno('etain', [], s)
    expect(m.some((x) => /Port niveau 2/.test(x))).toBe(true)
    expect(m.some((x) => /soufflet/i.test(x))).toBe(true)
    expect(m.length).toBe(2)
  })

  it('ne dit plus rien quand tout est là', () => {
    expect(manquePourTechno('etain', ['soufflet'], snap(4))).toEqual([])
  })

  it('refuse ce qui est déjà acquis, et le dit', () => {
    expect(manquePourTechno('corde', ['corde'], snap(4))).toEqual(['Déjà acquise.'])
    expect(technosDisponibles(['corde'], snap(4)).map((t) => t.id)).not.toContain('corde')
  })

  it('ne compte pas les ressources parmi les prérequis - un coffre vide n’est pas un verrou d’arbre', () => {
    const pauvre = snap(4, { bois: 0, pierre: 0, grain: 0, bronze: 0 })
    expect(manquePourTechno('corde', [], pauvre)).toEqual([])
    expect(coutPayable('corde', pauvre)).toBe(false)
    expect(coutPayable('corde', snap(4))).toBe(true)
  })

  it('signale une découverte inconnue au lieu de faire semblant', () => {
    expect(manquePourTechno('roue-a-aubes', [], snap(4))).toEqual(['Découverte inconnue.'])
    expect(coutTechno('roue-a-aubes')).toEqual({})
    expect(dureeTechno('roue-a-aubes', snap(4))).toBe(0)
  })

  it('ouvre l’arbre par ses racines, et l’élargit à mesure qu’on acquiert', () => {
    const debut = technosDisponibles([], snap(2, {}, []))
    const apres = technosDisponibles(['charrue', 'arpentage'], snap(2, {}, ['charrue', 'arpentage']))
    expect(apres.map((t) => t.id)).toContain('irrigation')
    expect(debut.map((t) => t.id)).not.toContain('irrigation')
  })
})

describe('la durée de recherche', () => {
  it('part de la durée écrite quand rien ne l’aide', () => {
    const s = snap(AGORA_RECHERCHE, {}, [])
    expect(dureeTechno('corde', s)).toBe(TECHNO_PAR_ID['corde'].duree * 1000)
  })

  it('raccourcit avec l’écriture - c’est tout l’intérêt des archives', () => {
    const nu = dureeTechno('four-reverbere', snap(AGORA_RECHERCHE, {}, []))
    const lettre = dureeTechno('four-reverbere', snap(AGORA_RECHERCHE, {}, ['ecriture']))
    expect(lettre).toBeLessThan(nu)
    expect(lettre / nu).toBeCloseTo(0.8, 2)
  })

  it('raccourcit aussi avec l’agora agrandie, et les deux se cumulent', () => {
    const petite = dureeTechno('astronomie', snap(2, {}, ['ecriture']))
    const grande = dureeTechno('astronomie', snap(4, {}, ['ecriture']))
    expect(grande).toBeLessThan(petite)
  })

  it('ne descend jamais sous vingt secondes : une découverte doit s’attendre', () => {
    for (const t of TECHNOS) expect(dureeTechno(t.id, snap(4, {}, TECHNO_IDS)), t.id).toBeGreaterThanOrEqual(20_000)
  })
})

describe('les effets cumulés', () => {
  it('ne donne rien sans découverte, et supporte l’absence de champ', () => {
    expect(effetsTechnos([])).toEqual(TECHNOS_NEUTRES)
    expect(effetsTechnos(undefined)).toEqual(TECHNOS_NEUTRES)
  })

  it('additionne les bonus de deux découvertes qui poussent le même levier', () => {
    const e = effetsTechnos(['charrue', 'irrigation'])
    expect(e.grainPct).toBeCloseTo(0.27, 5)
    expect(e.bronzePct).toBe(0)
  })

  it('ignore un identifiant inconnu au lieu de casser une sauvegarde', () => {
    expect(effetsTechnos(['charrue', 'moulin-a-vent'])).toEqual(effetsTechnos(['charrue']))
  })

  it('ne fabrique rien de délirant, même l’arbre entier acquis', () => {
    const tout = effetsTechnos(TECHNO_IDS)
    expect(tout.grainPct).toBeLessThanOrEqual(0.6)
    expect(tout.chantierPct).toBeLessThan(0.5)
    // les réductions de durée restent des parts, jamais une remise totale
    for (const k of ['chantierPct', 'recruesPct', 'consoPct', 'recherchePct', 'margePortPct'] as const) {
      expect(tout[k], k).toBeLessThan(1)
    }
  })

  it('ne récapitule que ce qui a été gagné', () => {
    const lignes = resumeEffets(effetsTechnos(['soufflet']))
    expect(lignes).toHaveLength(1)
    expect(lignes[0].label).toBe('Bronze')
    expect(lignes[0].valeur).toBe('+15 %')
    expect(resumeEffets(effetsTechnos([]))).toEqual([])
  })

  it('écrit les réductions comme des baisses, pas comme des hausses', () => {
    const l = resumeEffets(effetsTechnos(['ecriture']))
    expect(l.find((x) => x.label === 'Durée des recherches')!.valeur).toBe('−20 %')
  })
})
