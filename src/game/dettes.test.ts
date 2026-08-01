import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resoudreHorsLigne, creerBataille, GEO_VILLAGE } from './combat'
import { BUILDING_IDS, SECTEURS, STORAGE_KEY, WALL_HP } from './data'
import { relationEffective, useGame } from './store'
import { HEROS, etatHeroInitial, type HeroId, type HeroState } from './heros'
import type { BuildingId, UnitId } from './types'

/*
 * LES DETTES REFERMÉES.
 *
 * Sept défauts connus ont été corrigés d'un bloc. Chacun avait ceci de commun
 * qu'il ne se voyait pas en jouant : une garde qui ne gardait rien, un malus de
 * héros purement décoratif, une brèche toujours au même endroit au réveil. Ce
 * fichier existe pour qu'aucun ne revienne en silence.
 */

const ARMEE = (l: number, a: number, h: number): Record<UnitId, number> => ({ lancier: l, archer: a, hoplite: h })
const VAGUE = (n: number) => [{ enemy: 'pillard' as const, count: n }]

/**
 * Les dix bâtiments, niveau par défaut. `init()` fusionne la sauvegarde par
 * `Object.assign` : un `buildings` PARTIEL remplacerait la table entière et
 * laisserait l'agora indéfinie — la sauvegarde serait alors jugée corrompue.
 */
function batiments(niveaux: Partial<Record<BuildingId, number>>): Record<BuildingId, { level: number }> {
  return Object.fromEntries(BUILDING_IDS.map((b) => [b, { level: niveaux[b] ?? 0 }])) as Record<
    BuildingId,
    { level: number }
  >
}

/** un héros à votre service, au niveau voulu */
function auService(h: HeroId, niveau = 3): Record<HeroId, HeroState> {
  const tous = Object.fromEntries(
    (Object.keys(HEROS) as HeroId[]).map((x) => [x, etatHeroInitial()]),
  ) as Record<HeroId, HeroState>
  tous[h] = { ...etatHeroInitial(), recrute: true, niveau }
  return tous
}

describe('résolution hors-ligne : les fronts comptent aussi la nuit', () => {
  it('n’ouvre que les pans réellement assaillis, et jamais la porte par défaut', () => {
    // une enceinte déjà réduite à rien, une seule colonne sur la porte : c'est
    // elle qui cède, et le sud comme le nord n'ont même pas été touchés
    const unSeul = resoudreHorsLigne(VAGUE(30), ARMEE(0, 0, 0), 2, 40, 0, [SECTEURS[0]])
    expect(unSeul.victoire).toBe(false)
    expect(unSeul.anglesOuverts).toEqual([SECTEURS[0].angle])

    // trois colonnes sur ce même mur exsangue : les trois pans tombent
    const troisFronts = resoudreHorsLigne(VAGUE(40), ARMEE(0, 0, 0), 2, 40, 0, SECTEURS)
    expect([...troisFronts.anglesOuverts].sort()).toEqual([...SECTEURS.map((x) => x.angle)].sort())
  })

  it('laisse l’enceinte intacte quand la garnison écrase la vague', () => {
    const facile = resoudreHorsLigne(VAGUE(1), ARMEE(20, 12, 8), 4, WALL_HP[4], 4, SECTEURS)
    expect(facile.victoire).toBe(true)
    expect(facile.anglesOuverts).toEqual([])
  })

  it('n’ouvre rien du tout sans remparts : il n’y a pas de pan à effondrer', () => {
    const sansMur = resoudreHorsLigne(VAGUE(30), ARMEE(0, 0, 0), 0, 0, 0, SECTEURS)
    expect(sansMur.anglesOuverts).toEqual([])
  })

  it('lâche les pans nus avant la porte : les tours ne couvrent que leur arc', () => {
    /*
     * La porte est le pan le plus épais et les deux premières tours la flanquent
     * (TOUR_ANGLES) : elle doit donc être la DERNIÈRE à céder. On ne fige pas une
     * taille de vague — l'équilibrage bougera — mais l'ordre d'effondrement, qui
     * est la promesse faite au joueur : bâtir une tour protège son arc, et rien
     * d'autre. Sans cela, le réveil racontait la même brèche à chaque fois.
     */
    // on fait varier ce qui RESTE de l'enceinte : c'est le paramètre réel d'une
    // nuit d'assaut, et il traverse forcément les deux seuils
    let vuSansPorte = false
    for (let mur = 20; mur <= WALL_HP[3]; mur += 20) {
      const r = resoudreHorsLigne(VAGUE(20), ARMEE(2, 1, 0), 3, mur, 2, SECTEURS)
      // la porte ne tombe jamais seule : si elle est ouverte, les autres le sont
      if (r.anglesOuverts.includes(SECTEURS[0].angle)) {
        expect(r.anglesOuverts, `mur à ${mur}`).toHaveLength(3)
      } else if (r.anglesOuverts.length > 0) {
        vuSansPorte = true
      }
    }
    // et il existe bien un état de mur où les flancs percent, la porte non
    expect(vuSansPorte).toBe(true)
  })

  it('rend les tours utiles la nuit : quatre tours ouvrent moins de pans que deux', () => {
    let mieuxAuMoinsUneFois = false
    for (let mur = 20; mur <= WALL_HP[3]; mur += 20) {
      const deux = resoudreHorsLigne(VAGUE(20), ARMEE(2, 1, 0), 3, mur, 2, SECTEURS)
      const quatre = resoudreHorsLigne(VAGUE(20), ARMEE(2, 1, 0), 3, mur, 4, SECTEURS)
      // jamais pire, et parfois mieux : c'est ce qu'on achète en bâtissant
      expect(quatre.anglesOuverts.length, `mur à ${mur}`).toBeLessThanOrEqual(deux.anglesOuverts.length)
      if (quatre.anglesOuverts.length < deux.anglesOuverts.length) mieuxAuMoinsUneFois = true
    }
    expect(mieuxAuMoinsUneFois).toBe(true)
  })
})

describe('la garde d’Ajax vaut ce que sa fiche annonce', () => {
  it('porte la valeur annoncée au joueur, sans division cachée', () => {
    // la fiche dit « 25 % de dégâts en moins » : le champ doit dire 0,25, sinon
    // la relecture du store double ou divise la protection sans le savoir
    expect(HEROS.ajax.passif.gardeDuCorpsPct).toBe(0.25)
    expect(HEROS.ajax.passif.desc).toContain('25 %')
  })
})

describe('l’orgueil d’Agamemnon coûte vraiment quelque chose', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
  })

  it('rabaisse la relation effective de tous les Olympiens', () => {
    useGame.setState({
      heros: auService('agamemnon'),
      gods: {
        zeus: { relation: 40, cooldownUntil: 0 },
        poseidon: { relation: 40, cooldownUntil: 0 },
        athena: { relation: 40, cooldownUntil: 0 },
        ares: { relation: 40, cooldownUntil: 0 },
      },
    })
    const s = useGame.getState()
    // −10 sur les quatre : c'est le seul passif du jeu qui soit un défaut
    for (const g of ['zeus', 'poseidon', 'athena', 'ares'] as const) {
      expect(relationEffective(s, g), g).toBe(30)
    }
  })

  it('affaiblit la bénédiction reçue, et pas seulement celle qu’on annonce', () => {
    /*
     * Le défaut consigné : `benir` lisait la relation BRUTE. Le panthéon
     * affichait ×1,24 (relation effective 30) et le joueur recevait ×1,30
     * (relation 40). On mesure ici sur le trident de Poséidon, dont l'effet est
     * le seul directement lisible dans l'état : la part de mur rendue.
     */
    const poser = (avecRoi: boolean) => {
      localStorage.clear()
      useGame.setState({
        heros: avecRoi ? auService('agamemnon') : auService('ulysse'),
        gods: {
          zeus: { relation: 40, cooldownUntil: 0 },
          poseidon: { relation: 40, cooldownUntil: 0 },
          athena: { relation: 40, cooldownUntil: 0 },
          ares: { relation: 40, cooldownUntil: 0 },
        },
        buildings: { ...useGame.getState().buildings, remparts: { level: 3 }, temple: { level: 4 } },
        faveur: 100,
        wallHp: 0,
        battle: null,
        expedition: null,
      })
      useGame.getState().benir('poseidon')
      return useGame.getState().wallHp
    }
    const sansRoi = poser(false)
    const avecRoi = poser(true)
    expect(sansRoi).toBeGreaterThan(0)
    // l'orgueil du roi se paie en moellons : moins de mur rendu à faveur égale
    expect(avecRoi).toBeLessThan(sansRoi)
  })
})

describe('les renforts alliés se distinguent sur le rempart', () => {
  it('marque autant de figurines que les alliés en ont envoyé, en fin de ligne', () => {
    const b = creerBataille({
      attaquants: VAGUE(6),
      defenseurs: ARMEE(8, 4, 0),
      renforts: { lancier: 4, archer: 2 },
      wallLevel: 2,
      now: 0,
      geo: GEO_VILLAGE,
      campJoueur: 'defense',
      wallHpTotal: WALL_HP[2],
    })
    const alliesLanciers = b.fighters.filter((f) => f.type === 'lancier' && f.allie)
    const alliesArchers = b.fighters.filter((f) => f.type === 'archer' && f.allie)
    // 4 alliés sur 8 lanciers, tous visibles : la moitié de la ligne
    expect(alliesLanciers).toHaveLength(4)
    expect(alliesArchers).toHaveLength(2)
    // et aucun assaillant marqué par erreur
    expect(b.fighters.filter((f) => f.camp === 'attaque' && f.allie)).toHaveLength(0)
  })

  it('compte en figurines et non en hommes quand la garnison déborde de l’écran', () => {
    /*
     * Quarante lanciers tiennent dans seize silhouettes. Dix alliés sur quarante
     * doivent donc en colorer quatre : marquer dix figurines sur seize ferait
     * croire que les deux tiers de la ligne vient d'ailleurs.
     */
    const b = creerBataille({
      attaquants: VAGUE(6),
      defenseurs: ARMEE(40, 0, 0),
      renforts: { lancier: 10 },
      wallLevel: 2,
      now: 0,
      geo: GEO_VILLAGE,
      campJoueur: 'defense',
      wallHpTotal: WALL_HP[2],
    })
    expect(b.fighters.filter((f) => f.type === 'lancier')).toHaveLength(16)
    expect(b.fighters.filter((f) => f.allie)).toHaveLength(4)
  })

  it('ne marque personne quand aucun allié n’a répondu', () => {
    const b = creerBataille({
      attaquants: VAGUE(6),
      defenseurs: ARMEE(8, 4, 2),
      wallLevel: 2,
      now: 0,
      geo: GEO_VILLAGE,
      campJoueur: 'defense',
      wallHpTotal: WALL_HP[2],
    })
    expect(b.fighters.some((f) => f.allie)).toBe(false)
  })
})

describe('un sac coûte des habitants, et pas seulement des réserves', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  /*
   * `pertesCiviles` ne comptait rien : la famine ne coûtait qu'un malus d'ambiance
   * et un assaut perdu volait des vivres sans tuer personne, si bien que toute
   * condition de défaite bâtie sur ce compteur était morte-née.
   *
   * On l'éprouve par la résolution HORS-LIGNE, seule voie observable sous Vitest :
   * MODE_TEST y est vrai, et le tick remplit alors coffres et population à chaque
   * battement — les départs de famine, eux, n'y sont donc pas mesurables.
   */
  it('emporte des habitants quand l’assaut nocturne est perdu', () => {
    const t0 = 5_000_000
    vi.spyOn(Date, 'now').mockReturnValue(t0)
    // 0,4 → un seul foyer perdu : le compte reste déterministe
    vi.spyOn(Math, 'random').mockReturnValue(0.4)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        pop: 12,
        tutorialDone: true,
        lastSeen: t0 - 40_000,
        // une garnison nulle et une enceinte à terre : l'assaut est perdu d'avance
        army: { lancier: 0, archer: 0, hoplite: 0 },
        buildings: batiments({ agora: 2, remparts: 2 }),
        wallHp: 20,
        nextAttackAt: t0 - 5_000,
        threat: 20,
      }),
    )
    useGame.getState().init()
    const s = useGame.getState()
    expect(s.stats.perdus).toBeGreaterThan(0)
    expect(s.pop).toBeLessThan(12)
    expect(s.exploits.pertesCiviles ?? 0).toBeGreaterThan(0)
    // le rapport du réveil le dit en toutes lettres, et nomme le pan enfoncé
    expect(s.offlineSummary?.some((l) => l.includes('pas survécu au sac'))).toBe(true)
    expect(s.offlineSummary?.some((l) => l.includes('porte de l’est'))).toBe(true)
  })

  it('ne vide jamais le village par un seul sac : il reste toujours deux âmes', () => {
    const t0 = 6_000_000
    vi.spyOn(Date, 'now').mockReturnValue(t0)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        pop: 2,
        tutorialDone: true,
        lastSeen: t0 - 40_000,
        army: { lancier: 0, archer: 0, hoplite: 0 },
        buildings: batiments({ agora: 1, remparts: 1 }),
        wallHp: 10,
        nextAttackAt: t0 - 5_000,
        threat: 20,
      }),
    )
    useGame.getState().init()
    expect(useGame.getState().pop).toBe(2)
  })
})

describe('les réglages de son survivent au changement d’échelle', () => {
  it('reprend un curseur déplacé de la v1 et oublie celui qu’on n’avait pas touché', async () => {
    localStorage.clear()
    // un joueur qui avait BAISSÉ la musique et gardé le volume général par défaut
    localStorage.setItem('palladion-audio-v1', JSON.stringify({ muet: false, volume: 0.6, musique: 0.15 }))
    vi.resetModules()
    const { reglagesAudio } = await import('./audio')
    const r = reglagesAudio()
    // le choix volontaire est repris, remonté sur la nouvelle échelle
    expect(r.musique).toBeGreaterThan(0.15)
    expect(r.musique).toBeLessThan(0.5)
    // le curseur laissé au défaut de la v1 repart du nouveau défaut
    expect(r.volume).toBeCloseTo(0.8, 6)
    // et la v1 a été rangée : on ne relit pas deux fois le même héritage
    expect(localStorage.getItem('palladion-audio-v1')).toBeNull()
    expect(localStorage.getItem('palladion-audio-v2')).not.toBeNull()
  })

  it('respecte un coupe-son hérité, qui est une intention et non un dosage', async () => {
    localStorage.clear()
    localStorage.setItem('palladion-audio-v1', JSON.stringify({ muet: true, volume: 0.6, musique: 0.5 }))
    vi.resetModules()
    const { reglagesAudio } = await import('./audio')
    expect(reglagesAudio().muet).toBe(true)
  })
})

describe('la sauvegarde reste lisible d’une version à l’autre', () => {
  it('range une partie d’avant la campagne en bac à sable, sans reposer la question', () => {
    localStorage.clear()
    vi.spyOn(Date, 'now').mockReturnValue(9_000_000)
    // une sauvegarde qui ne connaît ni `mode` ni `campagne`
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pop: 14, tutorialDone: true, lastSeen: 9_000_000 }))
    useGame.getState().init()
    const s = useGame.getState()
    expect(s.mode).toBe('bac-a-sable')
    expect(s.campagne).toBeNull()
    expect(s.pop).toBe(14)
  })
})
