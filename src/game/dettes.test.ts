import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resoudreHorsLigne, creerBataille, GEO_VILLAGE } from './combat'
import {
  ASSAUTS_DE_GRACE,
  BASE_PROD,
  BUILDINGS,
  BUILDING_IDS,
  ENEMIES,
  MENACE_PREMIERS_ASSAUTS,
  PREMIER_ASSAUT_MS,
  SECTEURS,
  STORAGE_KEY,
  UNITS,
  WALL_HP,
} from './data'
import { relationEffective, useGame } from './store'
import { ACTES_CAMPAGNE } from './campagne'
import { VILLAGES_CIBLES, appelsAPortee, puissanceAssiegeants, puissanceTroupe } from './expeditions'
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

describe('la menace d’un acte est écrite, pas émergente', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  /*
   * Le défaut : `calcThreat` recalculait la menace à chaque battement depuis les
   * bâtiments et les minutes écoulées, écrasant la valeur annoncée par l'acte. Le
   * premier assaut du premier acte arrivait donc à dix pillards contre les trois
   * lanciers que l'acte exige — un acte qui perd son propre assaut.
   */
  it('tient la menace annoncée par l’acte, quoi que le joueur bâtisse', () => {
    const t0 = 7_000_000
    vi.spyOn(Date, 'now').mockReturnValue(t0)
    useGame.getState().init()
    useGame.getState().choisirMode('campagne')
    const acte = ACTES_CAMPAGNE[0]
    // on bâtit tout, on avance le calendrier : rien ne doit faire monter la menace
    useGame.setState((s) => ({
      buildings: Object.fromEntries(BUILDING_IDS.map((b) => [b, { level: 4 }])) as typeof s.buildings,
      tours: 4,
      createdAt: t0 - 200 * 60_000,
    }))
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 1000)
    useGame.getState().tick()
    expect(useGame.getState().threat).toBe(acte.menace.threat)
    /*
     * En bac à sable, la même cité fait bel et bien flamber la convoitise — mais
     * seulement passé la grâce des deux premiers assauts, qui plafonne la menace
     * le temps qu'un village neuf se dote d'un mur.
     */
    useGame.setState({
      campagne: null,
      mode: 'bac-a-sable',
      stats: { repousses: 3, perdus: 0, evenements: 0 },
    })
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 2000)
    useGame.getState().tick()
    expect(useGame.getState().threat).toBeGreaterThan(acte.menace.threat + 20)
  })

  it('laisse le joueur alléger sa menace à l’intérieur de l’acte', () => {
    const t0 = 8_000_000
    vi.spyOn(Date, 'now').mockReturnValue(t0)
    useGame.getState().init()
    useGame.getState().choisirMode('campagne')
    const annoncee = ACTES_CAMPAGNE[0].menace.threat
    // un assaut repoussé retire 5 à `threatMod` : ce que le joueur fait compte encore
    useGame.setState({ threatMod: -4 })
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 1000)
    useGame.getState().tick()
    expect(useGame.getState().threat).toBe(Math.max(5, annoncee - 4))
  })

  it('promet une vague que la garnison exigée peut repousser, au premier acte', () => {
    /*
     * Trois lanciers — ce que l'acte I demande — pèsent 126 pv et 24 d'attaque.
     * Le budget d'une vague vaut `menace × 5,5`, un pillard en coûte 10 : à la
     * menace annoncée, la vague la plus lourde possible doit rester sous ce que
     * trois lances battent, palissade tombée. Au-delà de quatre pillards, elles y
     * restent — c'est la borne que ce test garde.
     */
    const budgetMax = ACTES_CAMPAGNE[0].menace.threat * 5.5 * 1.15
    expect(Math.floor(budgetMax / ENEMIES.pillard.budget)).toBeLessThanOrEqual(4)
  })
})

describe('le début de partie laisse le temps de se défendre', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('plafonne la menace des deux premiers assauts, puis lâche la bride', () => {
    const t0 = 4_000_000
    vi.spyOn(Date, 'now').mockReturnValue(t0)
    useGame.getState().init()
    useGame.getState().choisirMode('bac-a-sable')
    // une cité déjà bâtie : sans la grâce, la menace serait bien au-delà
    useGame.setState((s) => ({
      buildings: Object.fromEntries(BUILDING_IDS.map((b) => [b, { level: 3 }])) as typeof s.buildings,
      stats: { repousses: 0, perdus: 0, evenements: 0 },
    }))
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 1000)
    useGame.getState().tick()
    expect(useGame.getState().threat).toBeLessThanOrEqual(MENACE_PREMIERS_ASSAUTS)

    // le deuxième assaut passé, la convoitise reprend son cours
    useGame.setState({ stats: { repousses: ASSAUTS_DE_GRACE, perdus: 0, evenements: 0 } })
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 2000)
    useGame.getState().tick()
    expect(useGame.getState().threat).toBeGreaterThan(MENACE_PREMIERS_ASSAUTS * 3)
  })

  it('finance dès le départ la chaîne que le premier assaut exige', () => {
    /*
     * Ce que le premier assaut réclame vraiment : de quoi manger (la ferme), de
     * quoi produire (le camp de bûcherons), un mur, une caserne et deux lances.
     * Tout cela doit être payable AVEC LA MISE DE DÉPART — sinon le joueur passe
     * ses onze minutes à attendre la cueillette et reçoit la bande sans un soldat.
     * La troisième lance, elle, se gagne sur les premières minutes de production.
     */
    const chaine = ['ferme', 'scierie', 'remparts', 'caserne'] as const
    const boisChaine = chaine.reduce((a, b) => a + (BUILDINGS[b].costs[0].bois ?? 0), 0)
    const pierreChaine = chaine.reduce((a, b) => a + (BUILDINGS[b].costs[0].pierre ?? 0), 0)
    localStorage.clear()
    vi.spyOn(Date, 'now').mockReturnValue(2_000_000)
    useGame.getState().init()
    const depart = useGame.getState().resources
    expect(boisChaine + 2 * UNITS.lancier.cost.bois!).toBeLessThanOrEqual(depart.bois)
    expect(pierreChaine).toBeLessThanOrEqual(depart.pierre)
    // et le bronze de trois lances, que rien ne produit avant la forge
    expect(3 * UNITS.lancier.cost.bronze!).toBeLessThanOrEqual(depart.bronze)
    // la troisième lance tient dans le délai, à la seule cueillette
    const resteBois = depart.bois - boisChaine - 2 * UNITS.lancier.cost.bois!
    const minutes = Math.max(0, (UNITS.lancier.cost.bois! - resteBois) / BASE_PROD.bois)
    expect(minutes).toBeLessThan(PREMIER_ASSAUT_MS / 60_000)
  })
})

describe('on n’appelle à l’aide que celui qui peut venir', () => {
  it('n’offre jamais un secours hors de portée de la garnison', () => {
    const troisLanciers = ARMEE(3, 0, 0)
    const aPortee = appelsAPortee(VILLAGES_CIBLES, troisLanciers)
    const force = puissanceTroupe(troisLanciers)
    // tous ceux retenus sont à portée…
    for (const v of aPortee) expect(puissanceAssiegeants(v), v.nom).toBeLessThanOrEqual(force * 1.15)
    // …et la citadelle, dont les assiégeants pèsent 247, n'en est jamais
    expect(aPortee.map((v) => v.id)).not.toContain('citadelle-tenedos')
    expect(aPortee.map((v) => v.id)).not.toContain('forteresse-mysienne')
  })

  it('ouvre la Troade entière à une armée qui en a les moyens', () => {
    const armee = ARMEE(12, 8, 8)
    expect(appelsAPortee(VILLAGES_CIBLES, armee)).toHaveLength(VILLAGES_CIBLES.length)
  })

  it('ne tire aucun appel quand rien n’est à la portée du joueur', () => {
    localStorage.clear()
    const t0 = 3_000_000
    vi.spyOn(Date, 'now').mockReturnValue(t0)
    useGame.getState().init()
    useGame.getState().choisirMode('bac-a-sable')
    // trois lanciers : le minimum pour qu'un appel puisse tomber…
    useGame.setState({ army: ARMEE(3, 0, 0), tutorialDone: true, tutoriel: null, prochainAppelAt: t0 - 1 })
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 1000)
    useGame.getState().tick()
    const appel = useGame.getState().appelSecours
    // …et s'il tombe, c'est sur une place que trois lances peuvent délivrer
    if (appel) {
      const v = VILLAGES_CIBLES.find((x) => x.id === appel.villageId)!
      expect(puissanceAssiegeants(v)).toBeLessThanOrEqual(puissanceTroupe(ARMEE(3, 0, 0)) * 1.15)
    }
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
