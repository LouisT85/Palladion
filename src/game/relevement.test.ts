import { beforeEach, describe, expect, it } from 'vitest'
import { GEO_VILLAGE, creerBataille } from './combat'
import { BUILDINGS, BUILDING_IDS, structureMax } from './data'
import { RELEVEMENT_MS, chantiersMenes, useGame } from './store'
import type { BuildingId } from './types'

/*
 * ═══════════════ LE VILLAGE SE RELÈVE SEUL ═══════════════
 *
 * Un édifice abattu pendant un assaut était une DOUBLE peine : le joueur perdait
 * le butin emporté, puis devait rebâtir en repayant le niveau perdu. Une caserne
 * de niveau 3 tombée à la dernière vague coûtait ainsi tout un chantier, pour un
 * assaut qu'il avait pourtant repoussé.
 *
 * La règle est désormais : l'assaut prend le butin, le moral et la production le
 * temps que le village déblaie - jamais le chantier. Dès que l'ennemi a tourné
 * les talons, ce qui est tombé se relève de lui-même en cinq secondes, au niveau
 * qu'il avait AVANT l'attaque.
 */

const RIEN = { level: 0 }

function poserVillage(niveaux: Partial<Record<BuildingId, number>>) {
  const buildings = Object.fromEntries(
    BUILDING_IDS.map((b) => [b, { ...RIEN, level: niveaux[b] ?? 0 }]),
  ) as Record<BuildingId, { level: number }>
  useGame.setState({ buildings: buildings as never, battle: null, expedition: null })
}

/** abat un bâtiment comme le fait un assaut : ruine, un niveau de moins, hp à zéro */
function abattre(id: BuildingId) {
  useGame.setState((s) => {
    const b = s.buildings[id]
    return {
      buildings: {
        ...s.buildings,
        [id]: {
          ...b,
          ruine: true,
          niveauAvant: b.niveauAvant ?? b.level,
          level: Math.max(0, b.level - 1),
          hp: 0,
        },
      },
    }
  })
}

/** ouvre le relèvement puis le fait aboutir, comme deux battements du jeu */
function laisserRelever(id: BuildingId) {
  useGame.setState((s) => ({
    buildings: {
      ...s.buildings,
      [id]: { ...s.buildings[id], targetLevel: s.buildings[id].niveauAvant, busyUntil: Date.now() - 1 },
    },
  }))
  useGame.getState().tick()
}

beforeEach(() => {
  useGame.setState({ toasts: [], moraleMods: [] })
})

describe('un édifice abattu se relève seul', () => {
  it('retrouve le niveau qu’il avait AVANT l’attaque, pas celui d’après', () => {
    poserVillage({ agora: 3, caserne: 3 })
    abattre('caserne')
    // pendant l'assaut il est bien à terre : c'est le prix payé sur l'instant
    expect(useGame.getState().buildings.caserne.level).toBe(2)
    expect(useGame.getState().buildings.caserne.ruine).toBe(true)

    laisserRelever('caserne')
    const b = useGame.getState().buildings.caserne
    expect(b.level).toBe(3)
    expect(b.ruine).toBeUndefined()
    expect(b.niveauAvant).toBeUndefined()
  })

  it('rend sa structure pleine - sans quoi la Redoute relevée resterait muette', () => {
    /*
     * Ce n'était fait nulle part : un chantier achevé ne reposait jamais `hp`.
     * Bénin pour une ferme - une jauge à demi vide - mais la Redoute tire tant
     * que sa structure tient : relevée à zéro point, elle n'aurait plus jamais
     * lâché un trait.
     */
    poserVillage({ agora: 3, redoute: 2 })
    abattre('redoute')
    expect(useGame.getState().buildings.redoute.hp).toBe(0)
    laisserRelever('redoute')
    const b = useGame.getState().buildings.redoute
    expect(b.level).toBe(2)
    expect(b.hp).toBe(structureMax('redoute', 2))
  })

  it('remonte au niveau d’avant même s’il tombe DEUX fois dans le même assaut', () => {
    // il retombe pendant qu'il se relève : `niveauAvant` ne doit pas glisser
    poserVillage({ agora: 3, ferme: 3 })
    abattre('ferme')
    abattre('ferme')
    expect(useGame.getState().buildings.ferme.level).toBe(1)
    expect(useGame.getState().buildings.ferme.niveauAvant).toBe(3)
    laisserRelever('ferme')
    expect(useGame.getState().buildings.ferme.level).toBe(3)
  })

  it('laisse ses artisans en place : le joueur ne refait pas ses affectations', () => {
    poserVillage({ agora: 3, ferme: 2 })
    useGame.setState({
      villageois: [{ id: 'v1', nom: 'Damon', metier: 'ferme', poste: 'ferme' }] as never,
    })
    abattre('ferme')
    expect(useGame.getState().villageois[0].poste).toBe('ferme')
  })
})

describe('le relèvement n’est pas un chantier du joueur', () => {
  it('ne consomme pas l’un des deux chantiers de front', () => {
    /*
     * Sans cette distinction, le joueur qui vient de repousser un assaut lit
     * « déjà 2 chantiers en cours » sans en avoir lancé un seul, et ne peut plus
     * rien bâtir tant que le village n'a pas fini de déblayer.
     */
    poserVillage({ agora: 3, ferme: 2, scierie: 2, caserne: 2 })
    for (const id of ['ferme', 'scierie', 'caserne'] as BuildingId[]) {
      abattre(id)
      useGame.setState((s) => ({
        buildings: {
          ...s.buildings,
          [id]: { ...s.buildings[id], targetLevel: s.buildings[id].niveauAvant, busyUntil: Date.now() + 5000 },
        },
      }))
    }
    expect(chantiersMenes(useGame.getState())).toBe(0)

    // un vrai chantier, lui, compte
    useGame.setState((s) => ({
      buildings: { ...s.buildings, port: { level: 0, targetLevel: 1, busyUntil: Date.now() + 9000 } },
    }))
    expect(chantiersMenes(useGame.getState())).toBe(1)
  })

  it('cède le pas à un chantier que le joueur avait lancé pendant l’assaut', () => {
    /*
     * Il monte sa caserne au niveau 4 quand elle est abattue : la ramener au
     * niveau 3 « d'avant l'attaque » annulerait un chantier déjà payé.
     */
    poserVillage({ agora: 4, caserne: 3 })
    useGame.setState((s) => ({
      buildings: { ...s.buildings, caserne: { ...s.buildings.caserne, targetLevel: 4, busyUntil: Date.now() + 30_000 } },
    }))
    abattre('caserne')
    const avant = useGame.getState().buildings.caserne.targetLevel
    expect(avant).toBe(4)
  })
})

describe('ce qu’un assaut coûte encore', () => {
  it('nomme l’édifice tombé et le dit au joueur', () => {
    poserVillage({ agora: 3, forge: 2 })
    abattre('forge')
    expect(BUILDINGS.forge.nom).toBeTruthy()
    // l'édifice est bien à terre le temps de l'assaut : il ne produit rien
    expect(useGame.getState().buildings.forge.ruine).toBe(true)
    expect(useGame.getState().buildings.forge.level).toBeLessThan(2)
  })
})

describe('le câblage : c’est la FIN de la bataille qui ouvre le relèvement', () => {
  /*
   * Le test le plus important du fichier. Tout le reste éprouve la machine à
   * états ; celui-ci éprouve qu'elle est BRANCHÉE - qu'un vrai battement, sur une
   * vraie bataille qui se conclut, ouvre bien les chantiers de relèvement. Sans
   * lui, `releverRuines` pourrait n'être appelé de nulle part et les six autres
   * tests passeraient quand même.
   */
  it('ouvre les chantiers au battement où l’assaut se conclut, et pas avant', () => {
    poserVillage({ agora: 3, caserne: 3, ferme: 2 })
    abattre('caserne')
    abattre('ferme')

    // une bataille dont tous les assaillants sont morts : le prochain battement
    // la déclare gagnée et appelle `finirBataille`
    const b = creerBataille({
      attaquants: [{ enemy: 'pillard', count: 2 }],
      defenseurs: { lancier: 2, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 },
      wallLevel: 1,
      now: Date.now() - 1000,
      geo: GEO_VILLAGE,
      campJoueur: 'defense',
      wallHpTotal: 200,
    })
    for (const f of b.fighters) {
      if (f.camp !== 'attaque') continue
      f.hp = 0
      f.etat = 'mort'
    }
    useGame.setState({ battle: b, lastSeen: Date.now() - 250 })

    // tant que la bataille court, aucun chantier : on ne rebâtit pas sous les flèches
    expect(useGame.getState().buildings.caserne.targetLevel).toBeUndefined()

    useGame.getState().tick()
    expect(useGame.getState().battle).toBeNull()

    const plafond = Date.now() + RELEVEMENT_MS + 500
    for (const id of ['caserne', 'ferme'] as BuildingId[]) {
      const x = useGame.getState().buildings[id]
      expect(x.targetLevel, id).toBe(x.niveauAvant)
      expect(x.busyUntil, id).toBeGreaterThan(Date.now())
      expect(x.busyUntil, id).toBeLessThanOrEqual(plafond)
    }
  })
})
