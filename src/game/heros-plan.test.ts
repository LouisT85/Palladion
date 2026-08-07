import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GEO_EXPEDITION, GEO_VILLAGE, ORDRES_NEUTRES, creerBataille, tickBataille } from './combat'
import { SECTEURS, TICK_MS, UNITS, UNIT_IDS, WALL_HP, troupes } from './data'
import {
  VILLAGES_PAR_ID,
  colonneQuiPart,
  detailPuissanceColonne,
  garnisonEffective,
  puissanceColonne,
  puissanceEffective,
  puissanceHero,
  puissanceTroupe,
} from './expeditions'
import {
  BONUS_NEUTRE,
  HEROS,
  HERO_IDS,
  cumulerPassifs,
  etatHeroInitial,
  herosEnColonne,
  statsCombatHeros,
  type HeroState,
} from './heros'
import {
  HEROS_PLAN,
  appliquerPlanHeros,
  herosAbsents,
  herosDormants,
  herosDuPan,
  herosPlacables,
  ordresDefense,
  ordresExpedition,
  pansHeros,
  planAvecHero,
  planAvecPan,
  planParDefaut,
  planValide,
  resumePlan,
  type PlanDefense,
} from './plandefense'
import type { BattleState, HeroId, UnitId } from './types'

/*
 * ═══════════ LES HÉROS, DANS L'ESTIMATION ET SUR LE MUR ═══════════
 *
 * « Les héros ne sont pas comptés dans la puissance d'attaque en expédition, et on
 * ne peut pas les bouger en défense. »
 *
 * DEUX défauts, et le premier n'était pas celui qu'on croyait. Ce fichier établit
 * les deux avant de les corriger, parce que sur ce projet la moitié des diagnostics
 * « évidents » a été démentie par une mesure :
 *
 *  1. la PARTICIPATION en expédition était bonne - les héros marchent, frappent, et
 *     changent l'issue. C'est l'ESTIMATION du panneau qui les ignorait. Corriger la
 *     participation aurait doublé des bras déjà comptés ;
 *  2. le PLACEMENT en défense, lui, n'existait pas du tout : `secteurAssigne`
 *     rendait `null` pour tout héros, et aucune table du plan ne portait leur nom.
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
afterEach(() => vi.restoreAllMocks())

const pv = (b: BattleState, camp: 'attaque' | 'defense') =>
  b.fighters.filter((f) => f.camp === camp).reduce((a, f) => a + Math.max(0, f.hp), 0)

function avancer(b: BattleState, n: number, wallLevel: number): void {
  let now = 0
  for (let i = 0; i < n; i++) {
    now += TICK_MS
    tickBataille(b, { now, dt: TICK_MS / 1000, wallHp: 0, wallLevel })
  }
}

function plan(p: Partial<PlanDefense> = {}): PlanDefense {
  return { ...planParDefaut(), ...p }
}

/** la formule que le panneau d'expédition appliquait AVANT (Expeditions.tsx l. 45) */
function puissanceAvant(t: Partial<Record<UnitId, number>>): number {
  return UNIT_IDS.reduce((a, u) => a + (t[u] ?? 0) * (UNITS[u].atk + UNITS[u].hp / 8), 0)
}

/** une maisonnée héroïque : les héros nommés au niveau dit, les autres pas recrutés */
function maisonnee(qui: Partial<Record<HeroId, number | Partial<HeroState>>>): Record<HeroId, HeroState> {
  const out = {} as Record<HeroId, HeroState>
  for (const h of HERO_IDS) {
    const v = qui[h]
    out[h] =
      v === undefined
        ? etatHeroInitial()
        : typeof v === 'number'
          ? { ...etatHeroInitial(), recrute: true, niveau: v }
          : { ...etatHeroInitial(), recrute: true, ...v }
  }
  return out
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. L'EXPÉDITION : la participation était vraie, l'estimation était fausse
// ═══════════════════════════════════════════════════════════════════════════════

describe('les héros marchent VRAIMENT avec la colonne', () => {
  /** monte l'assaut de la forteresse mysienne avec cette colonne et ces héros */
  const raid = (heros: { id: HeroId; niveau: number }[], ticks: number) => {
    const v = VILLAGES_PAR_ID['forteresse-mysienne']
    const colonne = troupes({ lancier: 6, hoplite: 4, archer: 3 })
    etatAlea = 4242
    const b = creerBataille({
      attaquants: UNIT_IDS.filter((u) => colonne[u] > 0).map((u) => ({ enemy: u, count: colonne[u] })),
      defenseurs: garnisonEffective(v, 0),
      wallLevel: v.mur,
      now: 0,
      geo: GEO_EXPEDITION,
      campJoueur: 'attaque',
      wallHpTotal: WALL_HP[v.mur],
      herosPresents: heros,
    })
    b.ordres = { ...ORDRES_NEUTRES }
    const pv0 = pv(b, 'defense')
    etatAlea = 4243
    avancer(b, ticks, v.mur)
    return {
      combattants: b.fighters.filter((f) => f.camp === 'attaque').length,
      degats: Math.round(pv0 - pv(b, 'defense')),
      deboutApres: b.fighters.filter((f) => f.camp === 'attaque' && f.etat !== 'mort').length,
    }
  }

  it('deux héros de plus, et la colonne cesse de rompre sans avoir frappé', () => {
    /*
     * MESURÉ, à graine égale, sur la forteresse mysienne (garnison 8/6/6, mur 4)
     * avec 6 lanciers + 4 hoplites + 3 archers :
     *
     *                       combattants   dégâts portés   debout à t = 200
     *   sans héros                   13               0                  0
     *   Hector 5 + Achille 3         15             179                  8
     *
     * Le panneau annonçait 226 dans les DEUX cas. La participation n'était donc
     * pas le défaut : elle décide de l'issue à elle seule.
     */
    const sans = raid([], 900)
    const avec = raid(
      [
        { id: 'hector', niveau: 5 },
        { id: 'achille', niveau: 3 },
      ],
      900,
    )
    expect(sans.combattants).toBe(13)
    expect(avec.combattants).toBe(15)
    expect(sans.degats).toBe(0)
    expect(avec.degats).toBeGreaterThan(150)
    // et à mi-course, la colonne héroïque est encore debout quand l'autre a rompu
    expect(raid([], 200).deboutApres).toBe(0)
    expect(
      raid(
        [
          { id: 'hector', niveau: 5 },
          { id: 'achille', niveau: 3 },
        ],
        200,
      ).deboutApres,
    ).toBeGreaterThan(0)
  })

  it('et le panneau annonçait le MÊME chiffre dans les deux cas', () => {
    /*
     * Les deux moitiés du reproche, mises face à face sur la même colonne. C'est
     * ce qui prouve que le défaut est dans l'estimation et non dans la bataille :
     * la colonne qui perd 0 à 13 et celle qui tue en portant 179 avaient le même
     * « ≈ 226 » sur l'écran de préparation.
     */
    const colonne = troupes({ lancier: 6, hoplite: 4, archer: 3 })
    expect(Math.round(puissanceAvant(colonne))).toBe(226)
    const avec = herosEnColonne(maisonnee({ hector: 5, achille: 3 }), 0)
    expect(Math.round(puissanceColonne({ troupes: colonne, heros: avec }))).toBe(405)
  })

  it('un héros qui boude reste au village - la liste qui marche le sait', () => {
    const etats = maisonnee({ hector: 5, achille: { niveau: 3, boudeJusqua: 10_000 }, ajax: { niveau: 2, mort: true } })
    expect(herosEnColonne(etats, 5_000).map((h) => h.id)).toEqual(['hector'])
    // sa bouderie passée, il reprend sa place
    expect(herosEnColonne(etats, 20_000).map((h) => h.id)).toEqual(['hector', 'achille'])
    // et un mort ne revient jamais
    expect(herosEnColonne(etats, 1e12).some((h) => h.id === 'ajax')).toBe(false)
    expect(herosEnColonne(undefined, 0)).toEqual([])
  })
})

describe('l’estimation d’expédition compte les héros à leur juste poids', () => {
  it('pèse un héros par ses stats de combat réelles, pas par un barème inventé', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      const st = statsCombatHeros(n)
      expect(puissanceHero(n)).toBeCloseTo(st.atk + st.hp / 8, 10)
    }
    // un héros de niveau 5 ne vaut pas un lancier : il en vaut sept et demi
    const lancier = UNITS.lancier.atk + UNITS.lancier.hp / 8
    expect(puissanceHero(1) / lancier).toBeCloseTo(4.2, 1)
    expect(puissanceHero(5) / lancier).toBeCloseTo(7.6, 1)
    // et le niveau pèse : le 5 vaut 1,8 fois le 1, comme `forceNiveau` le promet
    expect(puissanceHero(5) / puissanceHero(1)).toBeCloseTo(1.8, 2)
  })

  it('sans héros ni passif, elle rend EXACTEMENT l’ancien chiffre', () => {
    /*
     * Le point qui interdit la régression : un chef sans héros doit lire le même
     * nombre qu'avant, sinon on aura « corrigé » le rapport de force de tout le
     * monde en même temps.
     */
    for (const t of [
      troupes({ lancier: 5 }),
      troupes({ lancier: 8, archer: 4, hoplite: 3 }),
      troupes({ frondeur: 6, peltaste: 4, char: 2 }),
    ]) {
      expect(puissanceColonne({ troupes: t })).toBeCloseTo(puissanceAvant(t), 10)
      expect(puissanceColonne({ troupes: t })).toBeCloseTo(puissanceTroupe(t), 10)
    }
  })

  it('AVANT / APRÈS sur trois compositions', () => {
    /*
     * MESURÉ. Face à la forteresse mysienne (puissance 420), la même colonne de
     * dix-sept hommes - 12 lanciers, 5 archers - et trois maisonnées :
     *
     *   maisonnée                  avant   après   dont           verdict
     *   ──────────────────────────────────────────────────────────────────────────
     *   A. aucun héros               210     210   —              défavorable
     *                                                             → défavorable
     *   B. Hector 5 + Ajax 3         210     448   héros 179      défavorable
     *      (garde du corps −25 %)                  passifs  58     → FAVORABLE
     *   C. Achille 5 + Diomède 5     210     559   héros 202      défavorable
     *      (+40 % mêlée, +25 % exp.)               passifs 146     → TRÈS FAVORABLE
     *
     * Le panneau annonçait « vos troupes risquent d'y rester » dans les trois cas.
     * Il avait tort deux fois sur trois, et de plus du DOUBLE : 210 contre 559.
     * A ne bouge pas d'un point, et c'est le contrat - on corrige un oubli, on ne
     * réévalue pas le rapport de force de tout le monde au passage.
     */
    const place = puissanceEffective(VILLAGES_PAR_ID['forteresse-mysienne'], 0)
    const colonne = troupes({ lancier: 12, archer: 5 })
    const verdict = (p: number) => (p >= place * 1.3 ? 'très favorable' : p >= place ? 'favorable' : 'défavorable')

    const cas = [
      { nom: 'A. sans héros', etats: maisonnee({}) },
      { nom: 'B. Hector 5 + Ajax 3', etats: maisonnee({ hector: 5, ajax: 3 }) },
      { nom: 'C. Achille 5 + Diomède 5', etats: maisonnee({ achille: 5, diomede: 5 }) },
    ]
    const lignes = cas.map((c) => {
      const d = detailPuissanceColonne({
        troupes: colonne,
        heros: herosEnColonne(c.etats, 0),
        bonus: cumulerPassifs(c.etats),
      })
      return { ...c, avant: Math.round(puissanceAvant(colonne)), apres: Math.round(d.total), d }
    })
    for (const l of lignes) {
      console.log(
        `${l.nom.padEnd(26)} avant ${l.avant} (${verdict(l.avant)}) → après ${l.apres} (${verdict(l.apres)})` +
          `  [troupes ${Math.round(l.d.troupes)} · héros ${Math.round(l.d.heros)} · passifs ${Math.round(l.d.passifs)}]`,
      )
    }
    expect(place).toBe(420)
    // A : rien à compter, rien ne change
    expect(lignes[0].apres).toBe(lignes[0].avant)
    expect(verdict(lignes[0].apres)).toBe('défavorable')
    // B : deux héros et la garde d'Ajax font basculer le verdict
    expect(lignes[1].apres).toBeGreaterThan(lignes[1].avant)
    expect(verdict(lignes[1].apres)).toBe('favorable')
    // C : la fureur d'Achille et Diomède en expédition, c'est un autre raid
    expect(verdict(lignes[2].apres)).toBe('très favorable')
    expect(lignes[2].apres).toBeGreaterThan(lignes[1].apres)
  })

  it('se compose en un geste depuis ce que le store sait, au même instant', () => {
    /*
     * `colonneQuiPart` existe pour que le panneau ne recompose pas les trois
     * lectures à la main : il en oublierait une, ou les prendrait à deux instants
     * différents. On vérifie ici qu'elle rend EXACTEMENT ce que la composition
     * manuelle rendrait - et qu'elle suit l'heure, Ajax boudant à t = 0 puis
     * reprenant sa place à t = 70 s.
     */
    const etats = maisonnee({ hector: 4, ajax: { niveau: 3, boudeJusqua: 60_000 } })
    const colonne = troupes({ lancier: 12, archer: 5 })
    const m = { heros: etats, bonus: cumulerPassifs(etats), faveurDegatsPct: 0.15 }
    const f = colonneQuiPart(colonne, m, 0)
    expect(f.heros?.map((h) => h.id)).toEqual(['hector'])
    expect(f.faveurDegatsPct).toBe(0.15)
    expect(puissanceColonne(f)).toBeCloseTo(
      puissanceColonne({ troupes: colonne, heros: herosEnColonne(etats, 0), bonus: cumulerPassifs(etats), faveurDegatsPct: 0.15 }),
      10,
    )
    // la garde d'Ajax pèse même quand il boude, son bras seulement quand il revient
    expect(colonneQuiPart(colonne, m, 0).bonus?.gardeDuCorpsPct).toBeGreaterThan(0)
    expect(colonneQuiPart(colonne, m, 70_000).heros?.map((h) => h.id)).toEqual(['hector', 'ajax'])
    expect(puissanceColonne(colonneQuiPart(colonne, m, 70_000))).toBeGreaterThan(puissanceColonne(f))
    // et une maisonnée vide rend le chiffre d'avant, au point près
    expect(puissanceColonne(colonneQuiPart(colonne, {}, 0))).toBeCloseTo(puissanceAvant(colonne), 10)
  })

  it('sépare les trois sources : les hommes, les héros, les passifs', () => {
    const colonne = troupes({ lancier: 10 })
    const d = detailPuissanceColonne({
      troupes: colonne,
      heros: [{ id: 'hector', niveau: 5 }],
      bonus: cumulerPassifs(maisonnee({ hector: 5 })),
    })
    expect(d.troupes).toBeCloseTo(puissanceAvant(colonne), 10)
    expect(d.heros).toBeCloseTo(puissanceHero(5), 10)
    // Hector ne porte ni dégâts ni garde du corps : son passif épaissit le mur
    expect(d.multDegats).toBe(1)
    expect(d.multVie).toBe(1)
    expect(d.passifs).toBeCloseTo(0, 10)
    expect(d.total).toBeCloseTo(d.troupes + d.heros, 10)
  })

  it('traduit chaque passif dans la moitié de la métrique qui le concerne', () => {
    const colonne = troupes({ hoplite: 4 })
    const nu = puissanceAvant(colonne)
    // Achille : +40 % de dégâts → la part `atk` seule enfle
    const achille = detailPuissanceColonne({ troupes: colonne, bonus: cumulerPassifs(maisonnee({ achille: 3 })) })
    expect(achille.multDegats).toBeCloseTo(1.4, 10)
    expect(achille.multVie).toBe(1)
    expect(achille.total).toBeCloseTo(4 * UNITS.hoplite.atk * 1.4 + (4 * UNITS.hoplite.hp) / 8, 10)
    // Ajax : −25 % de dégâts subis → 1/0,75 fois plus de vie utile, frappe intacte
    const ajax = detailPuissanceColonne({ troupes: colonne, bonus: cumulerPassifs(maisonnee({ ajax: 3 })) })
    expect(ajax.multDegats).toBe(1)
    expect(ajax.multVie).toBeCloseTo(1 / 0.75, 10)
    expect(ajax.total).toBeCloseTo(4 * UNITS.hoplite.atk + ((4 * UNITS.hoplite.hp) / 8) * (1 / 0.75), 10)
    // Diomède : sa part n'existe qu'en expédition, et le raid EST une expédition
    const diomede = detailPuissanceColonne({ troupes: colonne, bonus: cumulerPassifs(maisonnee({ diomede: 4 })) })
    expect(diomede.multDegats).toBeCloseTo(1.25, 10)
    // et la grâce d'un dieu s'y ajoute comme le store l'ajoute
    expect(
      detailPuissanceColonne({ troupes: colonne, bonus: BONUS_NEUTRE, faveurDegatsPct: 0.6 }).multDegats,
    ).toBeCloseTo(1.6, 10)
    expect(nu).toBeGreaterThan(0)
  })

  it('un héros qui boude ne marche pas, mais son passif reste acquis', () => {
    /*
     * Cette asymétrie n'est pas un accident du calcul : c'est celle du store, qui
     * lit `cumulerPassifs(s.heros)` sur tous les engagés vivants et n'envoie sur le
     * terrain que ceux qui ne boudent pas. Ajax fâché protège encore la troupe -
     * il est là, il ne se bat pas - et l'estimation doit dire cela, pas autre chose.
     */
    const etats = maisonnee({ ajax: { niveau: 3, boudeJusqua: 60_000 } })
    const colonne = troupes({ hoplite: 4 })
    const d = detailPuissanceColonne({
      troupes: colonne,
      heros: herosEnColonne(etats, 0),
      bonus: cumulerPassifs(etats),
    })
    expect(d.heros).toBe(0)
    expect(d.multVie).toBeCloseTo(1 / 0.75, 10)
    // et quand il se déride, son bras s'ajoute à sa garde
    const apres = detailPuissanceColonne({
      troupes: colonne,
      heros: herosEnColonne(etats, 70_000),
      bonus: cumulerPassifs(etats),
    })
    expect(apres.heros).toBeCloseTo(puissanceHero(3), 10)
    expect(apres.total).toBeGreaterThan(d.total)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. LA DÉFENSE : poster un héros nommément, et que cela AGISSE
// ═══════════════════════════════════════════════════════════════════════════════

/** une défense du village sur les fronts donnés, avec les héros nommés */
function defense(
  fronts: typeof SECTEURS,
  heros: { id: HeroId; niveau: number }[] = [],
  reglages: Partial<Parameters<typeof creerBataille>[0]> = {},
): BattleState {
  return creerBataille({
    attaquants: [{ enemy: 'guerrier', count: 9 }],
    defenseurs: troupes({ hoplite: 4, lancier: 4, archer: 3 }),
    wallLevel: 2,
    now: 0,
    geo: GEO_VILLAGE,
    campJoueur: 'defense',
    wallHpTotal: WALL_HP[2],
    fronts,
    herosPresents: heros,
    ...reglages,
  })
}

describe('le plan poste les héros nommément', () => {
  it('retient un pan par son NOM, comme pour les troupes', () => {
    const p = planAvecHero(planParDefaut(), 'hector', 'nord')
    expect(p.heros.hector).toBe('nord')
    // et le rend au plus pressé
    expect(planAvecHero(p, 'hector', null).heros.hector).toBeUndefined()
    // sans jamais altérer l'original sur place
    expect(p.heros.hector).toBe('nord')
    // un pan qui n'existe pas ne s'écrit pas
    expect(planAvecHero(p, 'ajax', 'ouest').heros.ajax).toBeUndefined()
    // ni un héros qui n'existe pas
    expect(planAvecHero(p, 'licorne' as HeroId, 'nord').heros['licorne' as HeroId]).toBeUndefined()
  })

  it('poste un individu, pas un type : Hector au nord ne déplace pas Ajax', () => {
    /*
     * LA raison pour laquelle `heros` est une table à part et non une entrée de
     * `pans`. Le moteur compte tout héros comme un hoplite : passer par
     * `OrdresBataille.secteurs` enverrait au nord les deux héros ET les trente
     * hoplites, avec un seul geste du joueur.
     */
    const b = defense(SECTEURS, [
      { id: 'hector', niveau: 3 },
      { id: 'ajax', niveau: 3 },
    ])
    const iNord = b.secteurs.findIndex((s) => s.nom.includes('nord'))
    const iSud = b.secteurs.findIndex((s) => s.nom.includes('sud'))
    const p = plan({ heros: { hector: 'nord', ajax: 'sud' } })
    b.ordres = ordresDefense(p, b.secteurs)
    appliquerPlanHeros(b, p)
    const de = (id: HeroId) => b.fighters.find((f) => f.heros === id)!
    expect(de('hector').secteur).toBe(iNord)
    expect(de('ajax').secteur).toBe(iSud)
    // et les hoplites de la garnison, eux, n'ont reçu aucun ordre
    expect(b.ordres.secteurs.hoplite).toBeUndefined()
    expect(b.fighters.filter((f) => f.type === 'hoplite' && !f.heros).every((f) => f.secteur === undefined)).toBe(true)
  })

  it('dit au panneau qui tient chaque pan, sans jamais lire la table des troupes', () => {
    /*
     * Le panneau dessine un carton par pan. Pour les troupes il filtre `pans` ;
     * pour les héros il DOIT filtrer `heros`. `herosDuPan` est là pour qu'il n'ait
     * pas le choix - se tromper de table ne montrerait pas un mauvais nom, cela
     * ferait écrire l'ordre des trente hoplites en croyant poster un homme.
     */
    const p = plan({ heros: { hector: 'nord', ajax: 'nord', enee: 'porte' }, pans: { hoplite: 'sud' } })
    expect(herosDuPan(p, 'nord')).toEqual(['hector', 'ajax'])
    expect(herosDuPan(p, 'porte')).toEqual(['enee'])
    expect(herosDuPan(p, 'sud')).toEqual([])
    expect(herosDuPan(p, 'ouest')).toEqual([])
    expect(herosDuPan(null, 'nord')).toEqual([])
    // l'ordre est celui du panthéon, pas celui où l'on a cliqué
    expect(herosDuPan(plan({ heros: { ajax: 'nord', hector: 'nord' } }), 'nord')).toEqual(['hector', 'ajax'])
  })

  it('désinfecte les héros d’une vieille sauvegarde, sans table `heros`', () => {
    // une sauvegarde d'avant cette version : `pans` seul, pas de `heros`
    const vieux = planValide({ ligne: 'mur', tir: 'cloche', pans: { archer: 'nord' } })
    expect(vieux.heros).toEqual({})
    expect(vieux.pans).toEqual({ archer: 'nord' })
    // et ce qui est illisible ne s'écrit pas
    const sale = planValide({ heros: { hector: 'ouest', licorne: 'nord', ajax: 'porte', enee: 42 } })
    expect(sale.heros).toEqual({ ajax: 'porte' })
    expect(planValide(planParDefaut()).heros).toEqual({})
  })

  it('se résume en disant LESQUELS, pas combien', () => {
    expect(resumePlan(planParDefaut())).not.toContain('postés')
    const r = resumePlan(plan({ heros: { hector: 'nord', ajax: 'porte' } }))
    expect(r).toContain(HEROS.hector.emoji)
    expect(r).toContain(HEROS.ajax.emoji)
    expect(r).toContain('postés')
  })

  it('offre les huit héros au placement, Cassandre comprise', () => {
    // le store envoie sur le terrain tout héros engagé qui ne boude pas, y compris
    // la prophétesse : lui refuser un pan mentirait sur ce qui se passe
    expect(HEROS_PLAN).toEqual(HERO_IDS)
    expect(HEROS_PLAN).toContain('cassandre')
    expect(HEROS_PLAN).toHaveLength(8)
  })

  it('donne au panneau de quoi les afficher, absents compris', () => {
    const etats = maisonnee({
      hector: 4,
      achille: { niveau: 3, boudeJusqua: 50_000 },
      ajax: { niveau: 2, mort: true },
    })
    const p = plan({ heros: { hector: 'nord', achille: 'porte', ulysse: 'sud' } })
    const l = herosPlacables(p, etats, 0)
    expect(l).toHaveLength(8)
    const parId = Object.fromEntries(l.map((h) => [h.id, h]))
    expect(parId.hector).toMatchObject({ pan: 'nord', present: true, absence: null, niveau: 4, nom: 'Hector' })
    expect(parId.achille).toMatchObject({ pan: 'porte', present: false, absence: 'boude' })
    expect(parId.ajax).toMatchObject({ pan: null, present: false, absence: 'mort' })
    expect(parId.ulysse).toMatchObject({ pan: 'sud', present: false, absence: 'non-recrute' })
    // ceux qui ne seront pas là mais qu'on a postés, pour l'avertissement
    expect(herosAbsents(p, etats, 0)).toEqual(['ulysse', 'achille'])
    expect(herosAbsents(p, etats, 60_000)).toEqual(['ulysse'])
  })
})

describe('le héros posté au nord se bat AU NORD', () => {
  /**
   * La preuve par le terrain. Toute la menace entre par le SUD ; on regarde où le
   * héros se trouve au bout de dix secondes, et ce qu'il a frappé.
   */
  const courir = (pan: 'nord' | null) => {
    etatAlea = 909
    /*
     * Murs à zéro (tous les pans ouverts, rien ne retient personne) et AUCUNE
     * garnison : le héros est le seul défenseur, donc les dégâts relevés sont les
     * SIENS et non ceux d'une ligne d'hoplites qui brouillerait la lecture.
     */
    const b = defense(SECTEURS, [{ id: 'hector', niveau: 3 }], {
      defenseurs: troupes({}),
      wallLevel: 0,
      wallHpTotal: 0,
    })
    const iSud = b.secteurs.findIndex((s) => s.nom.includes('sud'))
    const iNord = b.secteurs.findIndex((s) => s.nom.includes('nord'))
    for (const f of b.fighters) {
      if (f.camp !== 'attaque') continue
      f.secteur = iSud
      f.etat = 'melee'
      f.x = b.secteurs[iSud].x
      f.y = b.secteurs[iSud].y - 20
      f.tx = f.x
      f.ty = f.y
    }
    // on veut lire des positions, pas savoir qui meurt le premier
    for (const f of b.fighters) f.hp = 1e6
    const p = pan ? plan({ heros: { hector: pan } }) : planParDefaut()
    b.ordres = ordresDefense(p, b.secteurs)
    appliquerPlanHeros(b, p)
    const pv0 = pv(b, 'attaque')
    avancer(b, 40, 0)
    const h = b.fighters.find((f) => f.heros === 'hector')!
    const d = (i: number) => Math.round(Math.hypot(h.x - b.secteurs[i].x, h.y - b.secteurs[i].y))
    return { nord: d(iNord), sud: d(iSud), degats: pv0 - pv(b, 'attaque'), secteur: h.secteur }
  }

  it('y reste alors que tout l’assaut passe par le sud', () => {
    /*
     * MESURÉ, à graine égale (murs rasés, assaut entier au sud, Hector seul
     * défenseur - les dégâts relevés sont donc les siens) :
     *
     *              secteur   dist. au nord   dist. au sud   dégâts portés
     *   sans plan   aucun              314            136            108
     *   au nord         2               17            372              0
     *
     * Les deux moitiés de la preuve sont là. Il EST au nord - 17 pas du pan qu'on
     * lui a désigné, contre 314 sans ordre - et il n'y frappe rien, parce que
     * personne n'y vient : le placement n'est donc pas un décor qu'on affiche, il
     * change ce que le héros fait de ses dix secondes. Sans plan il court à la
     * mêlée, ce qui reste la meilleure consigne par défaut ; posté, il tient son
     * mur, et c'est au joueur de savoir où l'ennemi viendra.
     */
    const libre = courir(null)
    const poste = courir('nord')
    console.log('héros libre :', JSON.stringify(libre))
    console.log('héros au nord :', JSON.stringify(poste))
    expect(libre.secteur).toBeUndefined()
    expect(poste.secteur).toBe(2)
    expect(poste.nord).toBeLessThan(60)
    expect(poste.nord).toBeLessThan(libre.nord)
    expect(poste.sud).toBeGreaterThan(libre.sud)
    // et l'ordre COÛTE quelque chose : il ne frappe pas ce qu'il ne garde pas
    expect(libre.degats).toBeGreaterThan(0)
    expect(poste.degats).toBe(0)
  })

  it('et il y frappe ce qui s’y présente', () => {
    /*
     * L'autre moitié de la preuve : un pan tenu doit être un pan DÉFENDU. On fait
     * venir l'assaut par le nord, où Hector est posté, et il porte des coups.
     */
    etatAlea = 515
    const b = defense(SECTEURS, [{ id: 'hector', niveau: 5 }], {
      defenseurs: troupes({ hoplite: 1 }),
      wallLevel: 0,
      wallHpTotal: 0,
    })
    const iNord = b.secteurs.findIndex((s) => s.nom.includes('nord'))
    for (const f of b.fighters) {
      if (f.camp !== 'attaque') continue
      f.secteur = iNord
      f.etat = 'melee'
      f.x = b.secteurs[iNord].x
      f.y = b.secteurs[iNord].y + 20
      f.tx = f.x
      f.ty = f.y
    }
    const p = plan({ heros: { hector: 'nord' } })
    b.ordres = ordresDefense(p, b.secteurs)
    appliquerPlanHeros(b, p)
    const pv0 = pv(b, 'attaque')
    avancer(b, 80, 0)
    expect(pv0 - pv(b, 'attaque')).toBeGreaterThan(0)
    expect(b.fighters.filter((f) => f.camp === 'attaque' && f.etat === 'mort').length).toBeGreaterThan(0)
  })

  it('deux héros sur le même pan ne se superposent pas', () => {
    const b = defense(SECTEURS, [
      { id: 'hector', niveau: 3 },
      { id: 'ajax', niveau: 3 },
    ])
    const p = plan({ heros: { hector: 'nord', ajax: 'nord' } })
    appliquerPlanHeros(b, p)
    const a = b.fighters.find((f) => f.heros === 'hector')!
    const c = b.fighters.find((f) => f.heros === 'ajax')!
    expect(a.secteur).toBe(c.secteur)
    expect(Math.hypot(a.x - c.x, a.y - c.y)).toBeGreaterThan(30)
  })
})

describe('un placement de héros ne fait jamais disparaître personne', () => {
  const cas: [string, Record<HeroId, HeroState>, number][] = [
    ['un héros pas encore engagé', maisonnee({}), 0],
    ['un héros mort', maisonnee({ hector: { niveau: 4, mort: true } }), 0],
    ['un héros qui boude', maisonnee({ hector: { niveau: 4, boudeJusqua: 90_000 } }), 0],
  ]
  for (const [quoi, etats, now] of cas) {
    it(`${quoi} : la bataille est celle d’un chef sans plan, à l’homme près`, () => {
      /*
       * `herosEnColonne` ne le met pas sur le terrain, donc `posterHeros` ne trouve
       * aucun combattant à ce nom. Rien à retirer, rien à déplacer : l'ordre dort
       * dans le plan et ressortira le jour où il sera là.
       */
      const p = plan({ heros: { hector: 'nord' } })
      const marchent = herosEnColonne(etats, now)
      expect(marchent.some((h) => h.id === 'hector')).toBe(false)
      const b = defense(SECTEURS, marchent)
      const avant = b.fighters.length
      const positions = b.fighters.map((f) => `${f.id}:${Math.round(f.x)},${Math.round(f.y)}`).join('|')
      appliquerPlanHeros(b, p)
      expect(b.fighters.length).toBe(avant)
      // et pas une figurine n'a bougé
      expect(b.fighters.map((f) => `${f.id}:${Math.round(f.x)},${Math.round(f.y)}`).join('|')).toBe(positions)
      // l'ordre, lui, est intact
      expect(p.heros.hector).toBe('nord')
      expect(herosAbsents(p, etats, now)).toEqual(['hector'])
    })
  }

  it('et la bataille tourne exactement comme sans plan', () => {
    const courir = (avecPlan: boolean) => {
      etatAlea = 3131
      const b = defense(SECTEURS, [{ id: 'hector', niveau: 3 }])
      const p = plan({ heros: { ajax: 'nord' } }) // Ajax n'est pas là
      b.ordres = ordresDefense(avecPlan ? p : planParDefaut(), b.secteurs)
      if (avecPlan) appliquerPlanHeros(b, p)
      const pv0 = pv(b, 'attaque')
      etatAlea = 3132
      avancer(b, 600, 2)
      return {
        hommes: b.fighters.length,
        debout: b.fighters.filter((f) => f.camp === 'defense' && f.etat !== 'mort').length,
        degats: pv0 - pv(b, 'attaque'),
      }
    }
    expect(courir(true)).toEqual(courir(false))
  })
})

describe('un pan que personne n’assaille ce soir', () => {
  const fronts = [SECTEURS[0], SECTEURS[2]] // porte + nord ; le sud est tranquille

  it('rend le héros à la consigne ordinaire au lieu de l’envoyer ailleurs', () => {
    /*
     * MÊME RÈGLE QUE POUR LES TROUPES. Un rang rabattu (ce que ferait un plan qui
     * garderait des index) enverrait le héros tenir un mur que le joueur n'a pas
     * désigné : `secteurAssigne` borne l'index sur `b.secteurs.length - 1`, donc
     * « sud » (rang 1 dans SECTEURS) deviendrait le mur du nord ce soir-là.
     */
    const b = defense(fronts, [{ id: 'hector', niveau: 3 }])
    const p = plan({ heros: { hector: 'sud', ajax: 'nord' } })
    expect(pansHeros(p, b.secteurs).hector).toBeUndefined()
    expect(pansHeros(p, b.secteurs).ajax).toBe(1)
    expect(herosDormants(p, b.secteurs)).toEqual(['hector'])
    appliquerPlanHeros(b, p)
    expect(b.fighters.find((f) => f.heros === 'hector')!.secteur).toBeUndefined()
  })

  it('garde l’ordre : le mur du sud sera bien assailli un jour', () => {
    const p = plan({ heros: { hector: 'sud' } })
    const bSoir = defense(fronts, [{ id: 'hector', niveau: 3 }])
    appliquerPlanHeros(bSoir, p)
    expect(p.heros.hector).toBe('sud')
    // et le soir où l'ennemi vient par le sud, l'ordre reprend tout seul
    const bDemain = defense(SECTEURS, [{ id: 'hector', niveau: 3 }])
    appliquerPlanHeros(bDemain, p)
    const iSud = bDemain.secteurs.findIndex((s) => s.nom.includes('sud'))
    expect(bDemain.fighters.find((f) => f.heros === 'hector')!.secteur).toBe(iSud)
    expect(herosDormants(p, bDemain.secteurs)).toEqual([])
  })
})

describe('en expédition, les héros marchent avec la colonne - comme avant', () => {
  it('le plan n’emporte aucun pan de héros', () => {
    const p = plan({ heros: { hector: 'nord', ajax: 'porte' }, pans: { hoplite: 'sud' } })
    expect(ordresExpedition(p).secteurs).toEqual({})
  })

  it('et `appliquerPlanHeros` refuse d’agir sur un raid', () => {
    /*
     * Le garde-fou compte pour de vrai : « le secteur 0 » d'une expédition est la
     * porte de l'ENNEMI. Un héros qu'on y planterait à l'ouverture y arriverait
     * seul, devant sa colonne encore en marche, et s'y ferait tuer.
     */
    etatAlea = 2020
    const v = VILLAGES_PAR_ID['fort-acheen']
    const b = creerBataille({
      attaquants: [{ enemy: 'hoplite', count: 6 }],
      defenseurs: garnisonEffective(v, 0),
      wallLevel: v.mur,
      now: 0,
      geo: GEO_EXPEDITION,
      campJoueur: 'attaque',
      wallHpTotal: WALL_HP[v.mur],
      herosPresents: [{ id: 'hector', niveau: 4 }],
    })
    const h0 = b.fighters.find((f) => f.heros === 'hector')!
    const avant = { x: h0.x, y: h0.y, tx: h0.tx, ty: h0.ty, etat: h0.etat, secteur: h0.secteur }
    appliquerPlanHeros(b, plan({ heros: { hector: 'nord' } }))
    const h = b.fighters.find((f) => f.heros === 'hector')!
    expect({ x: h.x, y: h.y, tx: h.tx, ty: h.ty, etat: h.etat, secteur: h.secteur }).toEqual(avant)
    // il part bien du point d'apparition, en tête de colonne, cap sur la porte
    expect(h.etat).toBe('marche')
    expect(h.secteur).toBe(0)
  })

  it('les pans des TROUPES restent intouchés par tout cela', () => {
    // le plan des unités n'a pas bougé d'un cheveu : même table, même sanitation
    const p = planAvecPan(planAvecHero(planParDefaut(), 'hector', 'nord'), 'hoplite', 'sud')
    expect(p.pans).toEqual({ hoplite: 'sud' })
    expect(p.heros).toEqual({ hector: 'nord' })
    const b = defense(SECTEURS, [{ id: 'hector', niveau: 3 }])
    expect(ordresDefense(p, b.secteurs).secteurs.hoplite).toBe(
      b.secteurs.findIndex((s) => s.nom.includes('sud')),
    )
  })
})
