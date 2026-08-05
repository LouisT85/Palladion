import { describe, expect, it } from 'vitest'
import {
  COURS_MAX,
  COURS_MIN,
  LOT_VENTE,
  LOTS_MAX,
  MARGE_COMPTOIR,
  RES_MARCHANDES,
  RISQUE_MAX,
  RISQUE_MIN,
  ROUTES,
  VITESSE_COURS,
  bornerCours,
  caravanesEchues,
  caravanesMax,
  caravanesPossibles,
  chargeCaravane,
  cibleCours,
  coursInitiaux,
  creerCaravane,
  deriverCours,
  dureeCaravane,
  etapesVers,
  explicationCours,
  gainCaravane,
  motCours,
  positionCours,
  primeCaravane,
  prixAchat,
  prixVente,
  raisonRouteFermee,
  resoudreCaravane,
  resumeCharge,
  risqueCaravane,
  routeOuverte,
  seuilMenaceRoute,
  tendanceCours,
  type Cours,
  type SnapCommerce,
} from './commerce'
import { MARGE_PORT } from './data'
import { VILLAGES_CIBLES } from './expeditions'
import type { ResourceId } from './types'

/*
 * LE COMMERCE VIVANT.
 *
 * Quatre garde-fous, et ce sont ceux dont dépend l'existence même de la décision
 * « je vends maintenant » :
 *
 *  · les cours SONT BORNÉS et la dérive est LENTE. Un cours qui saute d'un tick
 *    à l'autre ne se guette pas : on ne pourrait que subir le prix du moment ;
 *  · la dérive est DIRIGÉE, pas tirée au sort. Vers une cible qu'on affiche, sans
 *    dépassement - donc jamais d'oscillation autour de la cible, jamais de
 *    flèche ↗ qui mentait au joueur ;
 *  · une route se ferme avec un MOTIF, et le motif nomme le village. Un convoi
 *    refusé sans raison est un bogue aux yeux du joueur ;
 *  · le risque d'une caravane est FIGÉ AU DÉPART. On l'a montré avant de charger.
 */

const T0 = 3_000_000

function snap(patch: Partial<SnapCommerce> = {}): SnapCommerce {
  return {
    now: T0,
    saison: 'printemps',
    meteo: 'clair',
    merFermee: false,
    menace: 10,
    secheresse: false,
    ruines: 0,
    port: 2,
    relations: {},
    alliances: {},
    cours: coursInitiaux(),
    ...patch,
  }
}

/** un cours forcé, pour tester les prix sans passer par la dérive */
function cours(patch: Partial<Cours> = {}): Cours {
  return { ...coursInitiaux(), ...patch }
}

const ETATS: SnapCommerce[] = [
  snap(),
  snap({ saison: 'ete', meteo: 'canicule', menace: 60 }),
  snap({ saison: 'automne', meteo: 'pluie', ruines: 5 }),
  snap({ saison: 'hiver', meteo: 'neige', merFermee: true, menace: 95, secheresse: true, ruines: 3 }),
  snap({ saison: 'hiver', meteo: 'brume', merFermee: true, menace: 5 }),
  snap({ now: T0 + 210_000, saison: 'ete', meteo: 'orage', menace: 100, ruines: 9 }),
]

// ── 1. Les cours ─────────────────────────────────────────────────────────────

describe('les cours du comptoir', () => {
  it('partent tous au pair, le lingot compris', () => {
    const c = coursInitiaux()
    for (const r of ['bois', 'pierre', 'grain', 'bronze'] as ResourceId[]) expect(c[r]).toBe(1)
  })

  it('ne sortent jamais de leur fourchette, quoi qu’on leur passe', () => {
    expect(bornerCours(9)).toBe(COURS_MAX)
    expect(bornerCours(-3)).toBe(COURS_MIN)
    expect(bornerCours(Number.NaN)).toBe(1)
    expect(bornerCours(1.2)).toBeCloseTo(1.2)
  })

  it('laisse le lingot hors marché : il est l’unité de compte, pas une marchandise', () => {
    for (const s of ETATS) expect(cibleCours('bronze', s)).toBe(1)
    expect(prixVente('bronze', cours({ bois: 1.5 }))).toBe(0)
    expect(prixAchat('bronze', cours())).toBe(0)
    expect(RES_MARCHANDES).not.toContain('bronze')
  })

  it('vise toujours une cible dans la fourchette, dans tous les états du monde', () => {
    for (const s of ETATS) {
      for (const r of RES_MARCHANDES) {
        const c = cibleCours(r, s)
        expect(c, `${r} / ${s.saison}`).toBeGreaterThanOrEqual(COURS_MIN)
        expect(c, `${r} / ${s.saison}`).toBeLessThanOrEqual(COURS_MAX)
      }
    }
  })

  it('fait monter le grain quand la terre ne donne plus, et le fait céder à la récolte', () => {
    const hiver = cibleCours('grain', snap({ saison: 'hiver' }))
    const printemps = cibleCours('grain', snap({ saison: 'printemps' }))
    const automne = cibleCours('grain', snap({ saison: 'automne' }))
    expect(hiver).toBeGreaterThan(printemps)
    expect(automne).toBeLessThan(printemps)
  })

  it('fait flamber le grain sous la sécheresse - et lui seul', () => {
    const sec = snap({ secheresse: true })
    expect(cibleCours('grain', sec)).toBeGreaterThan(cibleCours('grain', snap()) * 1.25)
    expect(cibleCours('pierre', sec)).toBeCloseTo(cibleCours('pierre', snap()))
  })

  it('renchérit TOUT quand l’hiver ferme la mer', () => {
    const ouvert = snap({ saison: 'hiver', merFermee: false })
    const ferme = snap({ saison: 'hiver', merFermee: true })
    for (const r of RES_MARCHANDES) expect(cibleCours(r, ferme)).toBeGreaterThan(cibleCours(r, ouvert))
  })

  it('fait monter la pierre après un assaut encaissé : tout le monde rebâtit', () => {
    const paix = snap()
    const ruines = snap({ ruines: 3 })
    expect(cibleCours('pierre', ruines)).toBeGreaterThan(cibleCours('pierre', paix) * 1.3)
    // le bois suit, mais de loin - ce sont les charpentes, pas les murs
    const hausseBois = cibleCours('bois', ruines) / cibleCours('bois', paix)
    const haussePierre = cibleCours('pierre', ruines) / cibleCours('pierre', paix)
    expect(hausseBois).toBeGreaterThan(1)
    expect(hausseBois).toBeLessThan(haussePierre)
    // et l'effet plafonne : dix ruines ne valent pas dix fois trois
    expect(cibleCours('pierre', snap({ ruines: 12 }))).toBeCloseTo(cibleCours('pierre', ruines))
  })

  it('renchérit les marchandises quand la région est en armes', () => {
    for (const r of RES_MARCHANDES)
      expect(cibleCours(r, snap({ menace: 100 }))).toBeGreaterThan(cibleCours(r, snap({ menace: 10 })))
  })
})

describe('la dérive des cours', () => {
  it('avance vers la cible, et pas ailleurs', () => {
    const s = snap({ saison: 'hiver', merFermee: true, cours: cours({ grain: 1 }) })
    const cible = cibleCours('grain', s)
    expect(cible).toBeGreaterThan(1)
    const apres = deriverCours(s.cours, s, 60_000)
    expect(apres.grain).toBeGreaterThan(1)
    expect(apres.grain).toBeLessThanOrEqual(cible)
  })

  it('reste lent : une minute ne déplace pas un cours de plus de VITESSE_COURS', () => {
    for (const s of ETATS) {
      const apres = deriverCours(s.cours, s, 60_000)
      for (const r of RES_MARCHANDES)
        expect(Math.abs(apres[r] - s.cours[r]), r).toBeLessThanOrEqual(VITESSE_COURS + 1e-9)
    }
  })

  it('ne dépasse jamais sa cible : le cours se pose et n’oscille pas', () => {
    const s = snap({ saison: 'automne' })
    let c = coursInitiaux()
    for (let i = 0; i < 200; i++) c = deriverCours(c, { ...s, cours: c }, 1_000)
    const stable = deriverCours(c, { ...s, cours: c }, 1_000)
    for (const r of RES_MARCHANDES) {
      expect(c[r]).toBeCloseTo(cibleCours(r, s), 6)
      expect(stable[r]).toBeCloseTo(c[r], 6)
    }
  })

  it('avance de façon monotone tant que le monde ne change pas - c’est ce qui rend l’attente sensée', () => {
    const s = snap({ saison: 'hiver', merFermee: true })
    let c = cours({ grain: 0.9 })
    const suite: number[] = [c.grain]
    for (let i = 0; i < 30; i++) {
      c = deriverCours(c, { ...s, cours: c }, 2_000)
      suite.push(c.grain)
    }
    for (let i = 1; i < suite.length; i++) expect(suite[i]).toBeGreaterThanOrEqual(suite[i - 1])
    expect(suite[suite.length - 1]).toBeGreaterThan(suite[0])
  })

  it('rattrape une longue absence en se posant sur la cible, sans spirale', () => {
    const s = snap({ saison: 'hiver', merFermee: true, menace: 90, ruines: 3 })
    const apres = deriverCours(coursInitiaux(), s, 6 * 3_600_000)
    for (const r of RES_MARCHANDES) {
      expect(apres[r]).toBeCloseTo(cibleCours(r, s), 6)
      expect(apres[r]).toBeLessThanOrEqual(COURS_MAX)
    }
  })

  it('ne touche pas au lingot et tolère un état incomplet (vieille sauvegarde)', () => {
    const s = snap()
    const apres = deriverCours({} as Cours, s, 30_000)
    expect(apres.bronze).toBe(1)
    for (const r of RES_MARCHANDES) expect(Number.isFinite(apres[r])).toBe(true)
  })

  it('ne bouge pas d’un tick de durée nulle', () => {
    const c = cours({ bois: 1.2 })
    expect(deriverCours(c, snap({ cours: c }), 0).bois).toBeCloseTo(1.2)
  })
})

// ── Les prix au quai ─────────────────────────────────────────────────────────

describe('les prix du quai', () => {
  it('achète moins cher qu’il ne vend : c’est la marge du port', () => {
    for (const r of RES_MARCHANDES) expect(prixVente(r, cours())).toBeLessThan(prixAchat(r, cours()))
  })

  it('paie mieux quand le cours est haut - toute la décision est là', () => {
    for (const r of RES_MARCHANDES) {
      expect(prixVente(r, cours({ [r]: 1.6 }))).toBeGreaterThan(prixVente(r, cours({ [r]: 1 })))
      expect(prixVente(r, cours({ [r]: 0.6 }))).toBeLessThan(prixVente(r, cours({ [r]: 1 })))
    }
  })

  it('n’ouvre pas de comptoir sans port', () => {
    for (const r of RES_MARCHANDES) {
      expect(prixVente(r, cours(), MARGE_PORT[0])).toBe(0)
      expect(prixAchat(r, cours(), MARGE_PORT[0])).toBe(0)
    }
  })

  it('resserre la fourchette à mesure qu’on améliore le port', () => {
    const ventes = [1, 2, 3, 4].map((n) => prixVente('bois', cours(), MARGE_PORT[n]))
    const achats = [1, 2, 3, 4].map((n) => prixAchat('bois', cours(), MARGE_PORT[n]))
    for (let i = 1; i < 4; i++) {
      expect(ventes[i]).toBeGreaterThanOrEqual(ventes[i - 1])
      expect(achats[i]).toBeLessThanOrEqual(achats[i - 1])
    }
    expect(ventes[3]).toBeGreaterThan(ventes[0])
    expect(achats[3]).toBeLessThan(achats[0])
  })

  it('cote la pierre plus haut que le bois, à cours égal - elle vaut plus', () => {
    expect(prixVente('pierre', cours())).toBeGreaterThan(prixVente('bois', cours()))
  })
})

describe('ce que le tableau affiche', () => {
  it('montre la flèche de ce qui vient, pas de ce qui est', () => {
    const haut = snap({ saison: 'hiver', merFermee: true, cours: cours({ grain: 0.8 }) })
    expect(tendanceCours('grain', haut)).toBe('hausse')
    const bas = snap({ saison: 'automne', cours: cours({ grain: 1.6 }) })
    expect(tendanceCours('grain', bas)).toBe('baisse')
    const s = snap()
    const pose = { ...s, cours: cours({ grain: cibleCours('grain', s) }) }
    expect(tendanceCours('grain', pose)).toBe('stable')
  })

  it('dit en français où en est le cours', () => {
    expect(motCours('grain', cours({ grain: 1.6 }))).toBe('au plus haut')
    expect(motCours('grain', cours({ grain: 1.2 }))).toBe('haut')
    expect(motCours('grain', cours({ grain: 1 }))).toBe('au pair')
    expect(motCours('grain', cours({ grain: 0.8 }))).toBe('bas')
    expect(motCours('grain', cours({ grain: 0.55 }))).toBe('au plus bas')
  })

  it('situe le cours dans sa fourchette, de 0 à 1', () => {
    expect(positionCours('grain', cours({ grain: COURS_MIN }))).toBeCloseTo(0)
    expect(positionCours('grain', cours({ grain: COURS_MAX }))).toBeCloseTo(1)
    const p = positionCours('grain', cours({ grain: 1 }))
    expect(p).toBeGreaterThan(0)
    expect(p).toBeLessThan(1)
  })

  it('explique toujours le cours, et nomme la cause quand il y en a une', () => {
    for (const s of ETATS)
      for (const r of RES_MARCHANDES) expect(explicationCours(r, s).length).toBeGreaterThan(0)
    expect(explicationCours('grain', snap({ secheresse: true })).join(' ')).toMatch(/sécheresse/i)
    expect(explicationCours('pierre', snap({ ruines: 2 })).join(' ')).toMatch(/rebâtit/i)
    expect(explicationCours('bois', snap({ merFermee: true })).join(' ')).toMatch(/mer/i)
    expect(explicationCours('bois', snap({ menace: 80 })).join(' ')).toMatch(/menace 80/)
  })
})

// ── 2. Les caravanes ─────────────────────────────────────────────────────────

describe('les routes de la Troade', () => {
  it('donne une route à chacune des huit places fortes, de une à cinq étapes', () => {
    for (const v of VILLAGES_CIBLES) {
      expect(ROUTES[v.id], v.id).toBeDefined()
      expect(etapesVers(v.id)).toBeGreaterThanOrEqual(1)
      expect(etapesVers(v.id)).toBeLessThanOrEqual(5)
    }
    expect(Object.keys(ROUTES)).toHaveLength(VILLAGES_CIBLES.length)
  })

  it('paie mieux et prend plus longtemps quand la route est longue', () => {
    const proche = 'camp-pillards'
    const loin = 'forteresse-mysienne'
    expect(dureeCaravane(loin)).toBeGreaterThan(dureeCaravane(proche))
    expect(primeCaravane(loin)).toBeGreaterThan(primeCaravane(proche))
    expect(primeCaravane(proche)).toBeCloseTo(1)
  })

  it('ferme les longues routes avant les courtes quand la menace monte', () => {
    expect(seuilMenaceRoute('forteresse-mysienne')).toBeLessThan(seuilMenaceRoute('camp-pillards'))
    const s = snap({ menace: 70 })
    expect(routeOuverte('camp-pillards', s)).toBe(true)
    expect(routeOuverte('forteresse-mysienne', s)).toBe(false)
    expect(raisonRouteFermee('forteresse-mysienne', s)).toMatch(/menace 70/)
  })

  it('coupe la route d’un village hostile, et le nomme', () => {
    const s = snap({ relations: { 'citadelle-tenedos': -70 } })
    expect(routeOuverte('citadelle-tenedos', s)).toBe(false)
    expect(raisonRouteFermee('citadelle-tenedos', s)).toMatch(/Ténédos/)
    expect(raisonRouteFermee('citadelle-tenedos', s)).toMatch(/hostile/)
  })

  it('coupe la mer en hiver, pour les seules places d’outre-mer', () => {
    const s = snap({ saison: 'hiver', merFermee: true })
    expect(routeOuverte('cite-lesbos', s)).toBe(false)
    expect(raisonRouteFermee('cite-lesbos', s)).toMatch(/mer/i)
    expect(routeOuverte('camp-pillards', s)).toBe(true)
  })

  it('laisse toutes les routes ouvertes par temps calme, et n’invente pas de motif', () => {
    const s = snap({ menace: 20 })
    for (const v of VILLAGES_CIBLES) {
      expect(raisonRouteFermee(v.id, s), v.nom).toBeNull()
      expect(routeOuverte(v.id, s)).toBe(true)
    }
    expect(raisonRouteFermee('village-inconnu', s)).not.toBeNull()
  })
})

describe('le risque d’une caravane', () => {
  it('reste entre son plancher et son plafond, dans tous les états du monde', () => {
    for (const s of ETATS)
      for (const v of VILLAGES_CIBLES) {
        const r = risqueCaravane(v.id, s)
        expect(r, v.nom).toBeGreaterThanOrEqual(RISQUE_MIN)
        expect(r, v.nom).toBeLessThanOrEqual(RISQUE_MAX)
      }
  })

  it('grandit avec la distance et avec la menace', () => {
    const s = snap()
    expect(risqueCaravane('forteresse-mysienne', s)).toBeGreaterThan(risqueCaravane('camp-pillards', s))
    expect(risqueCaravane('fort-acheen', snap({ menace: 90 }))).toBeGreaterThan(
      risqueCaravane('fort-acheen', snap({ menace: 5 })),
    )
  })

  it('rend une caravane chez un allié presque sûre - et chez un beau-frère, plus encore', () => {
    const id = 'cite-lesbos'
    const neutre = risqueCaravane(id, snap())
    const allie = risqueCaravane(id, snap({ relations: { [id]: 70 }, alliances: { [id]: {} } }))
    const marie = risqueCaravane(
      id,
      snap({ relations: { [id]: 70 }, alliances: { [id]: { mariage: { villageois: 'x' } } } }),
    )
    expect(allie).toBeLessThan(neutre * 0.5)
    expect(marie).toBeLessThan(allie)
    expect(allie).toBeLessThan(0.15)
  })

  it('baisse quand la relation monte, même sans alliance', () => {
    const id = 'village-dardanien'
    expect(risqueCaravane(id, snap({ relations: { [id]: 30 } }))).toBeLessThan(
      risqueCaravane(id, snap({ relations: { [id]: -20 } })),
    )
  })
})

describe('les destinations proposées', () => {
  it('ne propose rien sans port : personne pour monter un convoi', () => {
    expect(caravanesPossibles(snap({ port: 0 }))).toEqual([])
    expect(caravanesMax(0)).toBe(0)
    expect(caravanesMax(1)).toBe(1)
    expect(caravanesMax(4)).toBe(3)
  })

  it('écarte les routes fermées et présente les autres de la plus sûre à la plus risquée', () => {
    const s = snap({ saison: 'hiver', merFermee: true, menace: 70, relations: { 'camp-pillards': -80 } })
    const d = caravanesPossibles(s)
    const ids = d.map((x) => x.village.id)
    expect(ids).not.toContain('camp-pillards') // hostile
    expect(ids).not.toContain('cite-lesbos') // mer fermée
    expect(ids).not.toContain('forteresse-mysienne') // menace
    expect(d.length).toBeGreaterThan(0)
    for (let i = 1; i < d.length; i++) expect(d[i].risque).toBeGreaterThanOrEqual(d[i - 1].risque)
    for (const x of d) expect(x.duree).toBe(dureeCaravane(x.village.id))
  })
})

describe('la charge et le gain', () => {
  it('charge par charretées, et pas plus que la caravane ne porte', () => {
    expect(chargeCaravane('grain', 2)).toEqual({ grain: 2 * LOT_VENTE })
    expect(chargeCaravane('bois', 99)).toEqual({ bois: LOTS_MAX * LOT_VENTE })
    expect(chargeCaravane('bois', 0)).toEqual({ bois: LOT_VENTE })
  })

  it('paie mieux que le quai : c’est ce qu’on achète avec le temps et le risque', () => {
    const c = cours()
    const auQuai = prixVente('grain', c, MARGE_COMPTOIR)
    expect(gainCaravane('camp-pillards', chargeCaravane('grain', 1), c)).toBeGreaterThan(auQuai)
    expect(gainCaravane('forteresse-mysienne', chargeCaravane('grain', 1), c)).toBeGreaterThan(
      gainCaravane('camp-pillards', chargeCaravane('grain', 1), c),
    )
  })

  it('grandit avec la charge et avec le cours', () => {
    const id = 'village-dardanien'
    const un = gainCaravane(id, chargeCaravane('bois', 1), cours())
    const quatre = gainCaravane(id, chargeCaravane('bois', 4), cours())
    expect(quatre).toBeGreaterThan(un * 3.5)
    expect(gainCaravane(id, chargeCaravane('bois', 2), cours({ bois: 1.5 }))).toBeGreaterThan(
      gainCaravane(id, chargeCaravane('bois', 2), cours()),
    )
  })

  it('ignore le lingot dans la charge : on ne va pas vendre de l’argent au loin', () => {
    expect(gainCaravane('camp-pillards', { bronze: 500 }, cours())).toBe(0)
  })

  it('dit la charge en français', () => {
    expect(resumeCharge({ grain: 150 })).toBe('150 grain')
    expect(resumeCharge({ bois: 100, pierre: 50 })).toBe('100 bois et 50 pierre')
    expect(resumeCharge({})).toBe('rien')
  })
})

describe('le départ et le retour d’une caravane', () => {
  it('fige au départ l’heure du retour, le risque montré et le gain espéré', () => {
    const s = snap({ relations: { 'fort-acheen': 20 } })
    const c = creerCaravane('c1', 'fort-acheen', chargeCaravane('pierre', 2), s)
    expect(c.partieA).toBe(T0)
    expect(c.retourA).toBe(T0 + dureeCaravane('fort-acheen'))
    expect(c.risque).toBeCloseTo(risqueCaravane('fort-acheen', s))
    expect(c.attendu).toBe(gainCaravane('fort-acheen', c.charge, s.cours))
    // la menace peut bien monter ensuite : la route est celle du jour du départ
    expect(c.risque).toBeLessThan(risqueCaravane('fort-acheen', snap({ menace: 95 })))
  })

  it('perd la charge sous le risque, et raconte pourquoi', () => {
    const s = snap({ menace: 80 })
    const c = creerCaravane('c1', 'village-dardanien', chargeCaravane('grain', 3), s)
    const r = resoudreCaravane(c, s, c.risque * 0.5)
    expect(r.perdue).toBe(true)
    expect(r.gain).toEqual({})
    expect(r.recit.length).toBeGreaterThanOrEqual(2)
    expect(r.recit.join(' ')).toMatch(/150 grain/)
  })

  it('rentre chargée dès que le tirage passe le risque', () => {
    const s = snap()
    const c = creerCaravane('c1', 'comptoir-phenicien', chargeCaravane('bois', 2), s)
    const r = resoudreCaravane(c, s, c.risque)
    expect(r.perdue).toBe(false)
    expect(r.gain.bronze).toBeGreaterThan(0)
    expect(r.gain.bronze).toBe(gainCaravane(c.villageId, c.charge, s.cours))
    expect(r.recit[0]).toMatch(/Comptoir phénicien/)
  })

  it('donne un naufrage aux routes d’outre-mer et des pillards aux routes de terre', () => {
    const s = snap()
    const mer = creerCaravane('m', 'cite-lesbos', chargeCaravane('grain', 1), s)
    expect(resoudreCaravane(mer, s, 0).recit[0]).toMatch(/coque|bateau/i)
    const terre = creerCaravane('t', 'hameau-thrace', chargeCaravane('grain', 1), s)
    expect(resoudreCaravane(terre, s, 0).recit[0]).toMatch(/pillards/i)
  })

  it('vend au cours du RETOUR, et le dit quand les cours ont tourné', () => {
    const depart = snap({ cours: cours({ grain: 0.8 }) })
    const c = creerCaravane('c1', 'fort-acheen', chargeCaravane('grain', 4), depart)
    const monte = resoudreCaravane(c, snap({ cours: cours({ grain: 1.6 }) }), 1)
    expect(monte.gain.bronze!).toBeGreaterThan(c.attendu)
    expect(monte.recit.join(' ')).toMatch(/monté/)
    const chute = resoudreCaravane(c, snap({ cours: cours({ grain: 0.6 }) }), 1)
    expect(chute.gain.bronze!).toBeLessThan(c.attendu)
    expect(chute.recit.join(' ')).toMatch(/fléchi/)
  })

  it('ne résout que les caravanes dont l’heure est passée', () => {
    const s = snap()
    const a = creerCaravane('a', 'camp-pillards', chargeCaravane('bois', 1), s)
    const b = creerCaravane('b', 'forteresse-mysienne', chargeCaravane('bois', 1), s)
    expect(caravanesEchues([a, b], T0)).toEqual([])
    expect(caravanesEchues([a, b], a.retourA).map((c) => c.id)).toEqual(['a'])
    expect(caravanesEchues([a, b], b.retourA)).toHaveLength(2)
    expect(caravanesEchues(undefined as unknown as [], T0)).toEqual([])
  })

  it('reste debout si la caravane vise un village qui n’existe plus', () => {
    const c = creerCaravane('x', 'atlantide', { grain: 50 }, snap())
    const r = resoudreCaravane(c, snap(), 1)
    expect(r.perdue).toBe(true)
    expect(r.recit.length).toBeGreaterThan(0)
  })
})
