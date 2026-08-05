import { describe, expect, it } from 'vitest'
import { CHAMPION_PAR_ID } from './champions'
import { VILLAGES_PAR_ID, garnisonEffective } from './expeditions'
import {
  CIBLES,
  CIBLE_IDS,
  RABAIS_PRO,
  RISQUE_MAX,
  RISQUE_MIN,
  attendDesRenforts,
  avantagesEspion,
  dureeMission,
  missionsEspion,
  missionsRentrees,
  modificateurCiel,
  peutPayerEclaireur,
  preparerMission,
  resoudreEspion,
  resteMission,
  risquePris,
  snapEspion,
  type MissionEspion,
} from './espionnage'
import type { WaveUnit } from './types'

const VAGUE: WaveUnit[] = [
  { enemy: 'pillard', count: 9 },
  { enemy: 'guerrier', count: 4 },
  { enemy: 'belier', count: 1 },
]

function mission(p: Partial<MissionEspion> = {}): MissionEspion {
  return {
    id: 'esp-1',
    type: 'vague',
    villageois: 'v1',
    nom: 'Dolon',
    partiA: 0,
    rentreA: 45_000,
    risque: 0.2,
    ...p,
  }
}

// ── Le risque ─────────────────────────────────────────────────────────────────

describe('risquePris', () => {
  it('reste dans ses bornes, jamais nul ni certain, sur tout le domaine', () => {
    for (const t of CIBLE_IDS) {
      for (const threat of [0, 25, 50, 75, 100, 300, -50]) {
        for (const saison of ['printemps', 'ete', 'automne', 'hiver'] as const) {
          for (const meteo of ['clair', 'pluie', 'brume', 'orage', 'canicule', 'neige'] as const) {
            const r = risquePris(t, snapEspion({ threat, saison, meteo }))
            expect(r).toBeGreaterThanOrEqual(RISQUE_MIN)
            expect(r).toBeLessThanOrEqual(RISQUE_MAX)
            expect(r).toBeGreaterThan(0)
            expect(r).toBeLessThan(1)
          }
        }
      }
    }
  })

  it('monte avec la menace', () => {
    const bas = risquePris('vague', snapEspion({ threat: 5 }))
    const haut = risquePris('vague', snapEspion({ threat: 95 }))
    expect(haut).toBeGreaterThan(bas)
  })

  it('la brume et l’hiver couvrent, la canicule expose', () => {
    const base = snapEspion({ threat: 40, saison: 'printemps', meteo: 'clair' })
    const brume = risquePris('place', snapEspion({ ...base, meteo: 'brume' }))
    const neige = risquePris('place', snapEspion({ ...base, saison: 'hiver', meteo: 'neige' }))
    const canicule = risquePris('place', snapEspion({ ...base, saison: 'ete', meteo: 'canicule' }))
    const clair = risquePris('place', base)
    expect(brume).toBeLessThan(clair)
    expect(neige).toBeLessThan(brume)
    expect(canicule).toBeGreaterThan(clair)
  })

  it('reconnaître une place forte est plus risqué que suivre une route', () => {
    const s = snapEspion({ threat: 30 })
    expect(risquePris('place', s)).toBeGreaterThan(risquePris('vague', s))
    expect(risquePris('vague', s)).toBeGreaterThan(risquePris('route', s))
  })

  it('une place déjà pillée dort les armes à la main', () => {
    const s = snapEspion({ threat: 30, expeditions: { 'camp-pillards': { pillages: 3 } } })
    expect(risquePris('place', s, 'camp-pillards')).toBeGreaterThan(risquePris('place', s, 'village-dardanien'))
  })

  it('Ulysse au village divise presque par deux', () => {
    const sans = risquePris('vague', snapEspion({ threat: 60 }))
    const avec = risquePris('vague', snapEspion({ threat: 60, herosActifs: ['ulysse'] }))
    expect(avec).toBeLessThan(sans * 0.7)
  })

  it('les avantages se cumulent et sont tous nommés', () => {
    const s = snapEspion({ threat: 60, herosActifs: ['ulysse'], graces: ['athena-2'], reliques: ['mors-xanthos'] })
    const av = avantagesEspion(s)
    expect(av).toHaveLength(3)
    expect(av.every((a) => a.nom.length > 0 && a.mult < 1)).toBe(true)
    expect(risquePris('vague', s)).toBeLessThan(risquePris('vague', snapEspion({ threat: 60, graces: ['athena-2'] })))
  })

  it('un héros mort ou jamais recruté ne protège personne', () => {
    // `herosActifs` ne contient que les vivants à notre service : la liste vide suffit
    expect(avantagesEspion(snapEspion({ herosActifs: [] }))).toHaveLength(0)
  })

  it('l’hiver ferme la mer et jette la route sur les cols', () => {
    const hiver = risquePris('route', snapEspion({ saison: 'hiver', meteo: 'pluie' }))
    const automne = risquePris('route', snapEspion({ saison: 'automne', meteo: 'pluie' }))
    // le surcoût des cols compense presque le froid protecteur : on vérifie qu'il pèse
    expect(hiver).toBeGreaterThan(automne * 0.9)
  })

  it('modificateurCiel est strictement positif partout', () => {
    for (const saison of ['printemps', 'ete', 'automne', 'hiver'] as const)
      for (const meteo of ['clair', 'pluie', 'brume', 'orage', 'canicule', 'neige'] as const)
        expect(modificateurCiel(saison, meteo)).toBeGreaterThan(0)
  })
})

// ── Les durées et les offres ───────────────────────────────────────────────────

describe('missionsEspion', () => {
  it('donne les trois missions avec durée, risque et prix', () => {
    const offres = missionsEspion(snapEspion({ incomingWave: VAGUE, nextAttackAt: 400_000, oisifs: [{ id: 'v1', nom: 'Dolon' }] }))
    expect(offres).toHaveLength(3)
    for (const o of offres) {
      expect(o.duree).toBe(dureeMission(o.type))
      expect(o.duree).toBeGreaterThan(0)
      expect(o.quoi.length).toBeGreaterThan(10)
      expect(o.risquePro).toBeLessThanOrEqual(o.risque)
    }
  })

  it('l’éclaireur de métier risque moins que le villageois', () => {
    const o = missionsEspion(snapEspion({ threat: 60, oisifs: [{ id: 'v1', nom: 'Dolon' }] }))[1]
    expect(o.risquePro).toBeCloseTo(o.risque * RABAIS_PRO, 6)
  })

  it('ne vend pas du vide : pas de colonne en marche, pas de reconnaissance', () => {
    const o = missionsEspion(snapEspion({ incomingWave: null, oisifs: [{ id: 'v1', nom: 'Dolon' }] })).find(
      (x) => x.type === 'vague',
    )!
    expect(o.dispo).toBe(false)
    expect(o.pourquoiPas).toContain('rien à reconnaître')
  })

  it('refuse la reconnaissance si l’assaut tombe avant le retour', () => {
    const s = snapEspion({ now: 1_000, incomingWave: VAGUE, nextAttackAt: 20_000, oisifs: [{ id: 'v1', nom: 'D' }] })
    const o = missionsEspion(s).find((x) => x.type === 'vague')!
    expect(o.dispo).toBe(false)
    expect(o.pourquoiPas).toContain('trop tard')
  })

  it('une mission déjà en cours n’est pas reproposée', () => {
    const s = snapEspion({
      incomingWave: VAGUE,
      nextAttackAt: 400_000,
      oisifs: [{ id: 'v1', nom: 'D' }],
      espions: [mission({ type: 'route' })],
    })
    const route = missionsEspion(s).find((x) => x.type === 'route')!
    expect(route.dispo).toBe(false)
    expect(route.pourquoiPas).toContain('déjà parti')
    // celle-ci reste ouverte : on n'immobilise pas tout le renseignement
    expect(missionsEspion(s).find((x) => x.type === 'vague')!.dispo).toBe(true)
  })

  it('sans bras libre ni bronze, tout est grisé - mais on dit pourquoi', () => {
    const s = snapEspion({ incomingWave: VAGUE, nextAttackAt: 400_000, oisifs: [], resources: { bois: 0, pierre: 0, grain: 0, bronze: 0 } })
    for (const o of missionsEspion(s)) {
      expect(o.dispo).toBe(false)
      expect(o.pourquoiPas).toBeTruthy()
    }
  })

  it('sans bras libre mais avec du bronze, on paie un éclaireur de métier', () => {
    const s = snapEspion({
      incomingWave: VAGUE,
      nextAttackAt: 400_000,
      oisifs: [],
      resources: { bois: 0, pierre: 0, grain: 300, bronze: 300 },
    })
    expect(missionsEspion(s).every((o) => o.dispo)).toBe(true)
    expect(peutPayerEclaireur('place', s)).toBe(true)
  })
})

describe('preparerMission', () => {
  it('fige le risque et l’heure du retour', () => {
    const s = snapEspion({ now: 10_000, threat: 40 })
    const m = preparerMission('place', s, { id: 'e1', villageois: 'v1', nom: 'Dolon', villageId: 'camp-pillards' })
    expect(m.partiA).toBe(10_000)
    expect(m.rentreA).toBe(10_000 + CIBLES.place.duree)
    expect(m.risque).toBeCloseTo(risquePris('place', s, 'camp-pillards'), 6)
    expect(m.rapport).toBeUndefined()
  })

  it('l’éclaireur de métier part sans villageois et avec le rabais', () => {
    const s = snapEspion({ now: 0, threat: 40 })
    const pro = preparerMission('vague', s, { id: 'e2', villageois: null, nom: 'Un éclaireur crétois' })
    const homme = preparerMission('vague', s, { id: 'e3', villageois: 'v1', nom: 'Dolon' })
    expect(pro.villageois).toBeNull()
    expect(pro.risque).toBeLessThan(homme.risque)
    expect(pro.risque).toBeGreaterThanOrEqual(RISQUE_MIN)
  })

  it('missionsRentrees ne prend que celles dont l’heure est passée et sans rapport', () => {
    const dehors = mission({ id: 'a', rentreA: 100 })
    const revenu = mission({ id: 'b', rentreA: 50, rapport: ['déjà lu'] })
    const attendu = mission({ id: 'c', rentreA: 50 })
    const out = missionsRentrees([dehors, revenu, attendu], 60)
    expect(out.map((m) => m.id)).toEqual(['c'])
    expect(resteMission(dehors, 60)).toBe(40)
    expect(resteMission(attendu, 60)).toBe(0)
  })
})

// ── La résolution ─────────────────────────────────────────────────────────────

describe('resoudreEspion - la prise', () => {
  it('un tirage sous le risque perd l’homme et fait monter la menace', () => {
    const m = mission({ risque: 0.4 })
    const r = resoudreEspion(m, snapEspion({ incomingWave: VAGUE }), 0.1)
    expect(r.pris).toBe(true)
    expect(r.menacePlus).toBe(CIBLES.vague.menacePrise)
    expect(r.rapport.join(' ')).toContain('Dolon')
    expect(r.rapport.join(' ')).toContain('observe')
  })

  it('un tirage au-dessus du risque le ramène', () => {
    const r = resoudreEspion(mission({ risque: 0.4 }), snapEspion({ incomingWave: VAGUE }), 0.95)
    expect(r.pris).toBe(false)
    expect(r.menacePlus).toBeUndefined()
  })

  it('le seuil est celui figé au départ, pas recalculé', () => {
    const s = snapEspion({ incomingWave: VAGUE, threat: 100, meteo: 'canicule', saison: 'ete' })
    // risque figé bas : la canicule du retour ne le condamne pas
    expect(resoudreEspion(mission({ risque: 0.05 }), s, 0.2).pris).toBe(false)
  })
})

describe('resoudreEspion - on ne facture pas du vide', () => {
  it('aucune colonne en marche : rapport honnête, personne de perdu, remboursement', () => {
    const r = resoudreEspion(mission({ risque: 0.99 }), snapEspion({ incomingWave: null }), 0)
    expect(r.sansObjet).toBe(true)
    expect(r.pris).toBe(false)
    expect(r.menacePlus).toBeUndefined()
    expect(r.rapport.join(' ')).toContain('aucune colonne')
  })

  it('une place forte inconnue : même règle', () => {
    const r = resoudreEspion(mission({ type: 'place', villageId: 'nulle-part', risque: 0.9 }), snapEspion({}), 0)
    expect(r.sansObjet).toBe(true)
    expect(r.pris).toBe(false)
  })

  it('on n’espionne pas un allié', () => {
    const s = snapEspion({ alliances: { 'camp-pillards': { depuis: 0 } } })
    const r = resoudreEspion(mission({ type: 'place', villageId: 'camp-pillards', risque: 0.9 }), s, 0)
    expect(r.sansObjet).toBe(true)
    expect(r.rapport.join(' ')).toContain('ouvert ses portes')
  })
})

describe('resoudreEspion - le rapport de vague dit du vrai', () => {
  const s = snapEspion({
    now: 0,
    threat: 70,
    incomingWave: VAGUE,
    incomingFronts: ['porte', 'sud'],
    incomingChampion: 'achille',
    nextAttackAt: 180_000,
  })

  it('donne la composition exacte, chiffre par chiffre', () => {
    const txt = resoudreEspion(mission(), s, 0.99).rapport.join(' | ')
    expect(txt).toContain('9 pillards')
    expect(txt).toContain('4 guerriers achéens')
    expect(txt).toContain('1 bélier de siège')
  })

  it('nomme les fronts réellement tirés, et eux seuls', () => {
    const txt = resoudreEspion(mission(), s, 0.99).rapport.join(' | ')
    expect(txt).toContain('Porte de l’est')
    expect(txt).toContain('Mur du sud')
    expect(txt).not.toContain('Mur du nord')
  })

  it('un front unique invite explicitement à dégarnir le reste', () => {
    const un = snapEspion({ ...s, incomingFronts: ['porte'], threat: 20 })
    expect(resoudreEspion(mission(), un, 0.99).rapport.join(' ')).toContain('dégarni')
  })

  it('nomme le champion et sa manœuvre', () => {
    const txt = resoudreEspion(mission(), s, 0.99).rapport.join(' | ')
    expect(txt).toContain(CHAMPION_PAR_ID.achille.titre)
    expect(txt).toContain(CHAMPION_PAR_ID.achille.capacite.nom)
  })

  it('dit qu’il n’y a pas de champion quand il n’y en a pas', () => {
    const txt = resoudreEspion(mission(), snapEspion({ ...s, incomingChampion: null }), 0.99).rapport.join(' ')
    expect(txt).toContain('Aucun nom')
  })

  it('avoue que les fronts ne sont pas encore décidés plutôt que d’inventer', () => {
    const txt = resoudreEspion(mission(), snapEspion({ ...s, incomingFronts: null, threat: 70 }), 0.99).rapport.join(' ')
    expect(txt).toContain('pas encore séparées')
    expect(txt).toContain('trois')
    expect(txt).not.toContain('Mur du sud')
  })

  it('annonce le délai avant l’assaut', () => {
    expect(resoudreEspion(mission(), s, 0.99).rapport.join(' ')).toContain('3 minutes')
  })
})

describe('resoudreEspion - le rapport de place forte dit du vrai', () => {
  it('recopie la garnison effective, mur et butin', () => {
    const id = 'cite-lesbos'
    const v = VILLAGES_PAR_ID[id]
    const g = garnisonEffective(v, 0)
    const txt = resoudreEspion(mission({ type: 'place', villageId: id }), snapEspion({}), 0.99).rapport.join(' | ')
    expect(txt).toContain(v.nom)
    expect(txt).toContain(`${g.lancier} lanciers`)
    expect(txt).toContain(`niveau ${v.mur}`)
  })

  it('tient compte des pillages : garnison relevée et butin rogné', () => {
    const id = 'village-dardanien'
    const s = snapEspion({ expeditions: { [id]: { pillages: 2 } } })
    const g = garnisonEffective(VILLAGES_PAR_ID[id], 2)
    const txt = resoudreEspion(mission({ type: 'place', villageId: id }), s, 0.99).rapport.join(' | ')
    expect(txt).toContain(`${g.lancier} lanciers`)
    expect(txt).toContain('2 fois')
    expect(txt).toContain('40 %')
  })

  it('dit si la place attend des renforts, et par quel signe', () => {
    const id = 'camp-pillards'
    const hai = snapEspion({ relations: { [id]: -70 } })
    const neutre = snapEspion({ relations: { [id]: 10 } })
    expect(attendDesRenforts(hai, id)).toBe(true)
    expect(attendDesRenforts(neutre, id)).toBe(false)
    expect(resoudreEspion(mission({ type: 'place', villageId: id }), hai, 0.99).rapport.join(' ')).toContain('renforts')
    expect(resoudreEspion(mission({ type: 'place', villageId: id }), neutre, 0.99).rapport.join(' ')).toContain('seule')
  })

  it('deux pillages suffisent à alerter la place, même sans haine', () => {
    expect(attendDesRenforts(snapEspion({ expeditions: { x: { pillages: 2 } } }), 'x')).toBe(true)
    expect(attendDesRenforts(snapEspion({ expeditions: { x: { pillages: 1 } } }), 'x')).toBe(false)
  })
})

describe('resoudreEspion - la route', () => {
  it('libre quand personne ne nous hait', () => {
    const txt = resoudreEspion(mission({ type: 'route' }), snapEspion({ relations: { 'cite-lesbos': 30 } }), 0.99).rapport.join(' ')
    expect(txt).toContain('libres')
  })

  it('nomme ceux qui tiennent les chemins', () => {
    const s = snapEspion({ relations: { 'cite-lesbos': -60, 'camp-pillards': -40 } })
    const txt = resoudreEspion(mission({ type: 'route' }), s, 0.99).rapport.join(' ')
    expect(txt).toContain(VILLAGES_PAR_ID['cite-lesbos'].nom)
    expect(txt).toContain(VILLAGES_PAR_ID['camp-pillards'].nom)
  })

  it('un allié hostile sur le papier n’est pas un barrage', () => {
    const s = snapEspion({ relations: { 'cite-lesbos': -60 }, alliances: { 'cite-lesbos': { depuis: 0 } } })
    const txt = resoudreEspion(mission({ type: 'route' }), s, 0.99).rapport.join(' ')
    expect(txt).toContain('libres')
    expect(txt).toContain('gués')
  })

  it('l’hiver ferme la mer, la menace haute ferme le reste', () => {
    const txt = resoudreEspion(mission({ type: 'route' }), snapEspion({ saison: 'hiver', threat: 80 }), 0.99).rapport.join(' ')
    expect(txt).toContain('mer est fermée')
    expect(txt).toContain('patrouilles')
  })
})
