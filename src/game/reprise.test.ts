import { beforeEach, describe, expect, it } from 'vitest'
import { BUILDING_IDS, GOD_IDS, STORAGE_KEY, UNIT_IDS } from './data'
import { NB_ACTES } from './campagne'
import { estAdulte } from './lignees'
import { jourDe, useGame } from './store'
import type { BuildingId } from './types'

/*
 * REPRENDRE UNE VIEILLE PARTIE.
 *
 * `init()` fusionne l'état neuf avec le fichier : `Object.assign` REMPLACE donc
 * chaque table par celle de la sauvegarde. Une clé ajoutée depuis - une unité,
 * un bâtiment, un champ de campagne - arrive alors manquante, et le jeu part en
 * NaN ou lit `undefined.includes(...)` au premier rendu. Ce n'est pas une
 * hypothèse : c'est arrivé deux fois, et la seconde a vidé la page du joueur.
 *
 * Ce fichier est le filet. Il rejoue une sauvegarde d'AVANT chaque ajout et
 * exige que la partie reparte entière. Toute table qu'on ajoutera demain devra
 * gagner sa ligne ici.
 */

const JOUR = 8 * 60_000

/** une sauvegarde telle que le jeu l'écrivait AVANT les ajouts récents */
function ancienneSauvegarde(extra: Record<string, unknown> = {}): string {
  const now = Date.now()
  return JSON.stringify({
    createdAt: now - JOUR * 12.4,
    lastSeen: now - 120_000,
    resources: { bois: 900, pierre: 700, grain: 800, bronze: 250 },
    faveur: 55,
    pop: 15,
    // ⚠️ trois unités manquent : le fichier date d'avant le frondeur
    army: { lancier: 5, archer: 3, hoplite: 2 },
    buildings: Object.fromEntries(BUILDING_IDS.map((b) => [b, { level: 2 }])),
    villageois: Array.from({ length: 15 }, (_, i) => ({
      id: `v-${i}`,
      nom: `Habitant ${i}`,
      poste: i < 3 ? (['ferme', 'scierie', 'carriere'][i] as BuildingId) : null,
      metier: ['ferme', 'scierie', 'carriere', 'forge', 'temple', 'port'][i % 6],
      // ni `neLe` ni `lignee` : le fichier date d'avant les familles
    })),
    wallHp: 700,
    tours: 1,
    morale: 66,
    threat: 20,
    nextAttackAt: now + 6 * 60_000,
    stats: { repousses: 2, perdus: 0, evenements: 2 },
    tutorialDone: true,
    saison: 'printemps',
    meteo: 'clair',
    mode: 'bac-a-sable',
    ...extra,
  })
}

function reprendre(brut: string): void {
  localStorage.setItem(STORAGE_KEY, brut)
  useGame.getState().init()
}

beforeEach(() => {
  localStorage.clear()
  useGame.getState().reset()
})

describe('les tables recomposées', () => {
  it('complète l’armée : une clé manquante donnait NaN partout', () => {
    reprendre(ancienneSauvegarde())
    const s = useGame.getState()
    for (const u of UNIT_IDS) {
      expect(typeof s.army[u], u).toBe('number')
      expect(Number.isFinite(s.army[u]), u).toBe(true)
    }
    // ce qui existait est gardé, ce qui manquait vaut zéro
    expect(s.army.lancier).toBe(5)
    expect(s.army.belier).toBe(0)
  })

  it('ne laisse aucun NaN dans les ressources après un battement', () => {
    reprendre(ancienneSauvegarde())
    useGame.getState().tick()
    const s = useGame.getState()
    for (const [r, n] of Object.entries(s.resources)) {
      expect(Number.isFinite(n), r).toBe(true)
    }
    expect(Number.isFinite(s.faveur)).toBe(true)
    expect(Number.isFinite(s.morale)).toBe(true)
  })

  it('recompose bâtiments et dieux : `undefined.level` vidait la page', () => {
    // un fichier amputé, comme en écrivait une version plus ancienne
    reprendre(ancienneSauvegarde({ buildings: { agora: { level: 3 } }, gods: { zeus: { relation: 40 } } }))
    const s = useGame.getState()
    for (const b of BUILDING_IDS) expect(typeof s.buildings[b]?.level, b).toBe('number')
    for (const g of GOD_IDS) {
      expect(typeof s.gods[g]?.relation, g).toBe('number')
      expect(typeof s.gods[g]?.cooldownUntil, g).toBe('number')
    }
    // et l'on n'écrase pas ce que le joueur avait
    expect(s.buildings.agora.level).toBe(3)
    expect(s.gods.zeus.relation).toBe(40)
  })

  it('désinfecte un NaN déjà écrit dans le fichier — sinon il y reste pour toujours', () => {
    reprendre(ancienneSauvegarde({ resources: { bois: NaN, pierre: 100, grain: null, bronze: 'x' } }))
    const s = useGame.getState()
    for (const [r, n] of Object.entries(s.resources)) {
      expect(Number.isFinite(n), r).toBe(true)
      expect(n as number, r).toBeGreaterThanOrEqual(0)
    }
    expect(s.resources.pierre).toBeGreaterThan(0)
  })

  it('donne les champs des lots récents sans écraser ce qui a été joué', () => {
    reprendre(ancienneSauvegarde())
    const s = useGame.getState()
    expect(Array.isArray(s.graces)).toBe(true)
    expect(Array.isArray(s.annales)).toBe(true)
    expect(typeof s.relations).toBe('object')
    expect(typeof s.prochainReleveAt).toBe('number')
    expect(s.incomingChampion).toBeNull()
  })
})

describe('les habitants d’avant les familles', () => {
  it('reçoivent un âge d’adulte et une maison — sans quoi nul ne se marierait', () => {
    reprendre(ancienneSauvegarde())
    const s = useGame.getState()
    const jour = jourDe(s)
    expect(s.villageois.length).toBeGreaterThan(0)
    for (const v of s.villageois) {
      expect(typeof v.neLe, v.nom).toBe('number')
      expect(estAdulte(v, jour), v.nom).toBe(true)
      expect(v.lignee, v.nom).toBeTruthy()
    }
    /*
     * Et pas tous la même maison : `trouverParti` refuse d'unir deux personnes
     * d'une même lignée. Un village d'une seule maison n'aurait plus jamais un
     * foyer — la transmission des métiers s'arrêterait net.
     */
    expect(new Set(s.villageois.map((v) => v.lignee)).size).toBeGreaterThan(1)
  })

  it('ne rejouent pas d’un coup les noces des journées passées', () => {
    reprendre(ancienneSauvegarde())
    expect(useGame.getState().dernierJourVecu).toBe(jourDe(useGame.getState()))
  })
})

describe('une campagne d’avant le verrouillage des objectifs', () => {
  /** l'état de campagne tel qu'il s'écrivait avant `objectifsFaits` */
  const vieilleCampagne = {
    acte: 1,
    debutActe: Date.now() - JOUR * 2,
    base: { repousses: 1, perdus: 0, evenements: 1 },
    prologueVu: true,
    accompli: false,
    perdu: false,
    fini: false,
  }

  it('repart avec une liste d’objectifs vide plutôt qu’avec rien', () => {
    // c'est exactement la panne signalée : `undefined.includes(...)` au rendu
    reprendre(ancienneSauvegarde({ mode: 'campagne', campagne: vieilleCampagne }))
    const c = useGame.getState().campagne
    expect(c).not.toBeNull()
    expect(Array.isArray(c!.objectifsFaits)).toBe(true)
    expect(c!.base.exploits).toBeDefined()
    // l'avancement est gardé tel quel
    expect(c!.acte).toBe(1)
    expect(c!.base.repousses).toBe(1)
    expect(c!.prologueVu).toBe(true)
  })

  it('borne un numéro d’acte aberrant au lieu de sortir de la table', () => {
    reprendre(ancienneSauvegarde({ mode: 'campagne', campagne: { ...vieilleCampagne, acte: 99 } }))
    const c = useGame.getState().campagne!
    expect(c.acte).toBeLessThan(NB_ACTES)
    expect(c.acte).toBeGreaterThanOrEqual(0)
  })

  it('laisse le bac à sable sans campagne', () => {
    reprendre(ancienneSauvegarde())
    expect(useGame.getState().campagne).toBeNull()
  })
})

describe('la partie reprise tourne', () => {
  it('encaisse vingt battements sans rien casser', () => {
    reprendre(ancienneSauvegarde({ mode: 'campagne', campagne: { acte: 0, prologueVu: true } }))
    for (let i = 0; i < 20; i++) useGame.getState().tick()
    const s = useGame.getState()
    expect(Number.isFinite(s.resources.grain)).toBe(true)
    expect(Number.isFinite(s.threat)).toBe(true)
    expect(s.villageois.length).toBe(s.pop)
    expect(Array.isArray(s.campagne!.objectifsFaits)).toBe(true)
  })
})
