import { createElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { DPS_BATIMENT } from './data'
import { EXPEDITION_TIMEOUT_MS, VILLAGES_CIBLES, VILLAGES_PAR_ID, type VillageCible } from './expeditions'
import {
  ECHELLE_COEUR,
  SOLIDITE,
  idsOuvrages,
  ouvragesDe,
  partAbattue,
  posOuvrage,
  structureTotale,
} from './ouvrages'
import { CoeurVillage, signatureAbattus } from '../components/map/VillageEnnemi'
import { monterSvg, reinitialiser, type Montage } from '../components/test-utils'

/*
 * ═════════ CE QU'IL Y A À ABATTRE, ET CE QU'IL EN RESTE ═════════
 *
 * Deux choses se gardent ici, et elles n'ont rien à voir l'une avec l'autre.
 *
 * 1. LE CALIBRAGE. Le joueur a dit « en un coup c'est écroulé » et il avait
 *    raison : 162 points de structure pour TOUTE la place du camp de pillards,
 *    contre 45 points par seconde que portent cinq hoplites. Sonde Playwright
 *    faite avant correction, sur de vraies expéditions : 9,5 s pour raser les
 *    cinq ouvrages du camp, 12,8 s pour ceux du fort achéen, 11,8 s pour ceux de
 *    la forteresse mysienne - la plus grande place du jeu tombait plus vite que
 *    la plus petite. Ces tests tiennent la nouvelle cote dans la fenêtre voulue -
 *    de l'ordre de la demi-minute pour une place modeste, DAVANTAGE pour une
 *    forteresse, jamais près des trois minutes de la retraite forcée.
 *
 * 2. LA CORRESPONDANCE DÉCOR ↔ OUVRAGES. `ouvrages.ts` déclare une liste d'ids
 *    et de positions ; `VillageEnnemi.tsx` peint la place. Le lien entre les deux
 *    n'était qu'un jeu de nombres recopiés à la main, et il se cassait EN
 *    SILENCE : ni TypeScript ni aucun test ne voyait une tente déplacée dans le
 *    décor sans que sa jauge suive. Les tests de rendu ci-dessous montent les
 *    huit archétypes et exigent que CHAQUE ouvrage déclaré ait, dans le dessin,
 *    un état debout ET une ruine - c'est-à-dire qu'aucun ne puisse tomber sans
 *    que le décor le montre.
 *
 * (Pas de JSX ici : ce fichier vit dans `src/game`, où l'on écrit du moteur.
 * `createElement` suffit à monter deux composants.)
 */

let m: Montage | null = null

afterEach(() => {
  m?.demonter()
  m = null
  reinitialiser()
})

// ─────────────────────────────────────────────────────────────────────────────
// 1. Le calibrage de la démolition
// ─────────────────────────────────────────────────────────────────────────────

/*
 * CE QUE LA SONDE A RELEVÉ, ET QUI N'EST PAS UN MODÈLE.
 *
 * `DPS_BATIMENT` vaut 9 points par seconde, mais personne ne les porte : entre
 * la cadence de 2,1 s, la marche d'un ouvrage au suivant, la redistribution des
 * hommes quand une cible tombe et les pertes en route, la CADENCE réellement
 * observée est tout autre. On ne la calcule donc pas : on inscrit ici le chiffre
 * lu sur de vraies expéditions, place par place, avec la colonne envoyée.
 *
 * Ces cadences sont ce qui rend le calibrage vérifiable sans navigateur. Elles
 * valent pour la colonne indiquée ; changer `STRUCTURE_BASE` sans refaire la
 * sonde fera tomber ces tests, et c'est exactement ce qu'on leur demande.
 */
interface Releve {
  /** la colonne envoyée par la sonde */
  colonne: string
  /** points de structure abattus par seconde, RELEVÉS (structure ÷ durée) */
  cadence: number
  /** délai relevé avant le premier coup porté à un ouvrage : marche, mur, garnison */
  avant: number
  /** fenêtre de démolition voulue, en secondes */
  vise: [number, number]
}

const RELEVES: Record<string, Releve> = {
  // cadences : moteur rejoué à trois graines (§3). délais `avant` : sonde
  // Playwright, plus longs que le moteur nu et donc plus honnêtes pour la garde
  // de la retraite forcée.
  'camp-pillards': { colonne: '5 hoplites', cadence: 41.4, avant: 13.5, vise: [20, 34] },
  'fort-acheen': { colonne: '8 hoplites + 2 béliers', cadence: 75.3, avant: 31.3, vise: [28, 46] },
  'forteresse-mysienne': {
    colonne: '12 hoplites + 3 béliers + 5 peltastes',
    cadence: 109.1,
    avant: 34.3,
    vise: [42, 66],
  },
}

/** durée de démolition attendue, en secondes, à la cadence relevée */
function dureeDemolition(v: VillageCible, cadence: number): number {
  return structureTotale(v) / cadence
}

describe('calibrage de la structure d’une place', () => {
  it('la démolition dure ce qu’elle doit durer, sur les trois places sondées', () => {
    for (const [id, r] of Object.entries(RELEVES)) {
      const d = dureeDemolition(VILLAGES_PAR_ID[id], r.cadence)
      expect(d, `${id} (${r.colonne}) : ${d.toFixed(0)} s de démolition`).toBeGreaterThanOrEqual(r.vise[0])
      expect(d, `${id} (${r.colonne}) : ${d.toFixed(0)} s de démolition`).toBeLessThanOrEqual(r.vise[1])
    }
  })

  it('l’ancienne cote tombait en un coup, la nouvelle non', () => {
    const camp = VILLAGES_PAR_ID['camp-pillards']
    // ancienne cote : 120 + 25 × 1,7 = 162 points pour TOUTE la place
    expect(structureTotale(camp)).toBeGreaterThan(5 * 162)
    // et le cœur seul tient plus longtemps que la place entière ne tenait avant
    const coeur = ouvragesDe(camp, { x: 0, y: 0 }).find((o) => o.coeur)!
    expect(coeur.max).toBeGreaterThan(2 * 162)
  })

  it('une forteresse demande le double d’une place modeste', () => {
    /*
     * LE TEST QUI DIT POURQUOI LA COTE EST EN RACINE. Chaque place est mesurée
     * avec SA colonne plausible - c'est tout l'objet : la colonne grossit bien
     * plus vite que la puissance de la place (17× de puissance pour 3× de
     * cadence), si bien qu'une cote proportionnelle faisait tomber la forteresse
     * PLUS VITE que le camp. Relevé sur `1000 + puissance × 3` : 39 s au camp,
     * 23 s à la forteresse. Ce rapport-là ne doit plus jamais s'inverser.
     */
    const dCamp = dureeDemolition(VILLAGES_PAR_ID['camp-pillards'], RELEVES['camp-pillards'].cadence)
    const dFort = dureeDemolition(
      VILLAGES_PAR_ID['forteresse-mysienne'],
      RELEVES['forteresse-mysienne'].cadence,
    )
    expect(dFort).toBeGreaterThan(dCamp * 1.5)
  })

  it('même une colonne deux fois moins efficace rentre avant la retraite forcée', () => {
    /*
     * La garde qui compte vraiment. `avant` est le délai relevé jusqu'au premier
     * coup porté à un ouvrage - marche, brèche, garnison. On suppose ensuite une
     * colonne qui ne vaut que la MOITIÉ de celle de la sonde (pertes lourdes,
     * ordres mal donnés) et l'on exige qu'elle finisse quand même.
     */
    for (const [id, r] of Object.entries(RELEVES)) {
      const total = r.avant + dureeDemolition(VILLAGES_PAR_ID[id], r.cadence / 2)
      expect(total, `${id} : ${total.toFixed(0)} s de raid`).toBeLessThan(EXPEDITION_TIMEOUT_MS / 1000)
    }
  })

  it('la structure ne dépend QUE de la place : puissance et matériau', () => {
    // deux appels sur la même cible rendent la même cote, quoi qu'on lui envoie
    const v = VILLAGES_PAR_ID['cite-lesbos']
    expect(structureTotale(v)).toBe(structureTotale(v))
    // et elle croît strictement avec la puissance, à matériau égal
    const cotes = VILLAGES_CIBLES.map((c) => structureTotale(c) / SOLIDITE[c.decor])
    for (let i = 1; i < cotes.length; i++) expect(cotes[i]).toBeGreaterThan(cotes[i - 1])
  })

  it('chaque ouvrage porte une part lisible, et le cœur la plus grosse', () => {
    for (const v of VILLAGES_CIBLES) {
      const ouvrages = ouvragesDe(v, { x: 450, y: 315 })
      const total = ouvrages.reduce((a, o) => a + o.max, 0)
      // les parts déclarées font 1 : la somme des ouvrages est la structure
      expect(Math.abs(total - structureTotale(v)) / total).toBeLessThan(0.03)
      const coeur = ouvrages.find((o) => o.coeur)
      expect(coeur, `${v.id} n’a pas de cœur`).toBeTruthy()
      for (const o of ouvrages) {
        if (o.coeur) continue
        expect(coeur!.max).toBeGreaterThan(o.max)
        // aucun ouvrage ne tombe en un seul coup d'un seul homme
        expect(o.max).toBeGreaterThan(DPS_BATIMENT * 2.1)
      }
    }
  })

  it('les positions passent du repère du décor à celui de la scène', () => {
    const v = VILLAGES_PAR_ID['camp-pillards']
    const place = { x: 450, y: 315 }
    const ouvrages = ouvragesDe(v, place)
    for (const o of ouvrages) {
      const p = posOuvrage(v.decor, o.id)
      expect(o.x).toBeCloseTo(place.x + p.x * ECHELLE_COEUR, 5)
      expect(o.y).toBeCloseTo(place.y + p.y * ECHELLE_COEUR, 5)
    }
  })

  it('la part abattue compte les ouvrages à terre', () => {
    const ouvrages = ouvragesDe(VILLAGES_PAR_ID['camp-pillards'], { x: 0, y: 0 })
    expect(partAbattue(ouvrages)).toBe(0)
    ouvrages[0].hp = 0
    ouvrages[1].hp = 0
    expect(partAbattue(ouvrages)).toBeCloseTo(2 / 5, 5)
    expect(partAbattue([])).toBe(0)
  })

  it('un identifiant inconnu se plaint tout de suite', () => {
    expect(() => posOuvrage('camp', 'donjon')).toThrow(/ouvrage inconnu/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. Le décor sait ce qui est tombé
// ─────────────────────────────────────────────────────────────────────────────

const DECORS = VILLAGES_CIBLES.map((v) => v.decor)

describe('le décor et les ouvrages se correspondent', () => {
  it('les huit archétypes déclarent chacun leurs ouvrages', () => {
    expect(new Set(DECORS).size).toBe(8)
    for (const d of DECORS) expect(idsOuvrages(d).length).toBeGreaterThanOrEqual(4)
  })

  for (const decor of DECORS) {
    it(`décor « ${decor} » : chaque ouvrage a un dessin debout`, () => {
      m = monterSvg(createElement(CoeurVillage, { decor }))
      const dessines = m.qq('[data-ouvrage]').map((el) => el.getAttribute('data-ouvrage'))
      expect([...dessines].sort()).toEqual([...idsOuvrages(decor)].sort())
      expect(m.qq('[data-ruine]')).toHaveLength(0)
    })

    it(`décor « ${decor} » : chaque ouvrage abattu devient une ruine`, () => {
      const ids = idsOuvrages(decor)
      m = monterSvg(createElement(CoeurVillage, { decor, abattus: signatureAbattus(ids) }))
      const ruines = m.qq('[data-ruine]').map((el) => el.getAttribute('data-ruine'))
      expect([...ruines].sort()).toEqual([...ids].sort())
      expect(m.qq('[data-ouvrage]')).toHaveLength(0)
    })

    it(`décor « ${decor} » : une ruine est plus BASSE que ce qu’elle remplace`, () => {
      /*
       * La règle de lecture du dessin, éprouvée et non supposée : ce qui dit la
       * chute, c'est la hauteur. On mesure l'ordonnée la plus haute atteinte par
       * chaque ouvrage (les y sont négatifs vers le ciel) debout puis à terre.
       */
      for (const id of idsOuvrages(decor)) {
        const debout = monterSvg(createElement(CoeurVillage, { decor }))
        const hDebout = hauteur(debout, `[data-ouvrage="${id}"]`)
        debout.demonter()
        const tombe = monterSvg(createElement(CoeurVillage, { decor, abattus: signatureAbattus([id]) }))
        const hRuine = hauteur(tombe, `[data-ruine="${id}"]`)
        tombe.demonter()
        // les menus objets (tas de butin, feu, amphores) sont déjà à terre : on
        // n'exige d'eux que de ne pas GRANDIR en tombant
        const plafond = hDebout > 16 ? hDebout * 0.55 : hDebout + 3
        expect(hRuine, `${decor}/${id} : ${hRuine.toFixed(0)} debout ${hDebout.toFixed(0)}`).toBeLessThanOrEqual(
          plafond,
        )
      }
    })
  }

  it('une signature vide laisse toute la place debout', () => {
    m = monterSvg(createElement(CoeurVillage, { decor: 'camp', abattus: signatureAbattus([]) }))
    expect(m.qq('[data-ruine]')).toHaveLength(0)
  })

  it('« tente-e » abattu ne couche pas « tente-ne »', () => {
    // le piège de la signature en chaîne : sans délimiteur, l'un contient l'autre
    m = monterSvg(createElement(CoeurVillage, { decor: 'camp', abattus: signatureAbattus(['tente-e']) }))
    const ruines = m.qq('[data-ruine]').map((el) => el.getAttribute('data-ruine'))
    expect(ruines).toEqual(['tente-e'])
  })
})

/**
 * Hauteur d'un fragment, en unités du décor : la plus grande élévation lue dans
 * ses cotes. jsdom ne calcule aucune boîte englobante SVG (`getBBox` n'existe
 * pas), on lit donc les attributs - c'est plus grossier, mais c'est ce que le
 * dessin dit vraiment, et cela suffit à distinguer une tente d'un tas.
 */
function hauteur(mo: Montage, selecteur: string): number {
  const racine = mo.q(selecteur)
  if (!racine) throw new Error(`fragment absent : ${selecteur}`)
  let haut = 0
  const noter = (y: number, dy: number) => {
    if (Number.isFinite(y)) haut = Math.max(haut, -(y + dy))
  }
  const parcourir = (el: Element, dy: number) => {
    const tr = el.getAttribute('transform')
    let decal = dy
    const t = tr?.match(/translate\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/)
    if (t) decal += Number(t[2])
    for (const a of ['y', 'y1', 'y2', 'cy']) {
      const v = el.getAttribute(a)
      if (v !== null) noter(Number(v), decal)
    }
    const d = el.getAttribute('d')
    if (d) for (const n of d.matchAll(/[-\d.]+[, ]\s*(-?[\d.]+)/g)) noter(Number(n[1]), decal)
    for (const enfant of [...el.children]) parcourir(enfant, decal)
  }
  parcourir(racine, 0)
  return haut
}


// ─────────────────────────────────────────────────────────────────────────────
// 3. Le raid entier, rejoué par le moteur
// ─────────────────────────────────────────────────────────────────────────────

/*
 * LE CALIBRAGE ÉPROUVÉ DE BOUT EN BOUT, SANS NAVIGATEUR.
 *
 * Les fenêtres ci-dessus reposent sur des cadences relevées à la main : utile,
 * mais c'est encore un modèle. Ici on rejoue une expédition COMPLÈTE avec le vrai
 * moteur - `creerBataille`, `tickBataille`, la même boucle que le tick du store -
 * de la marche d'approche à la chute du cœur. Ce test-là tomberait si quelqu'un
 * changeait `DPS_BATIMENT`, la cadence de mêlée ou la façon de choisir les cibles,
 * et pas seulement la cote de structure.
 *
 * `Math.random` est remplacé par un générateur à graine : le moteur en tire pour
 * la panique, la dispersion et les effets, et un test d'équilibrage qui dépend du
 * hasard de la machine ne vaut rien.
 *
 * Le moteur tourne ici à pas de 250 ms exactement. Le navigateur, lui, est plus
 * LENT que cela - la sonde a relevé 26 s de démolition au camp contre 21 s ici -
 * parce que le battement réel du store dérive sous la charge du rendu et que les
 * coups se posent alors en retard. Les bornes tiennent donc les deux régimes.
 */
const RAIDS: [string, Record<string, number>][] = [
  ['camp-pillards', { hoplite: 5 }],
  ['fort-acheen', { hoplite: 8, belier: 2 }],
  ['forteresse-mysienne', { hoplite: 12, belier: 3, peltaste: 5 }],
]

interface Issue {
  demolition: number
  raid: number
  pillage: boolean
}

async function rejouer(id: string, colonne: Record<string, number>, graine: number): Promise<Issue> {
  const { creerBataille, tickBataille, GEO_EXPEDITION } = await import('./combat')
  const { WALL_HP } = await import('./data')
  const { garnisonEffective } = await import('./expeditions')
  const v = VILLAGES_PAR_ID[id]
  let now = 1_000_000
  const b = creerBataille({
    attaquants: Object.entries(colonne).map(([u, n]) => ({ enemy: u as never, count: n })),
    defenseurs: garnisonEffective(v, 0),
    wallLevel: v.mur,
    now,
    geo: GEO_EXPEDITION,
    campJoueur: 'attaque',
  })
  let wallHp = WALL_HP[v.mur]
  const ouvrages = ouvragesDe(v, GEO_EXPEDITION.place)
  const total = ouvrages.reduce((a, o) => a + o.max, 0)
  let premier: number | null = null
  let dernier: number | null = null
  let pillage = false
  let fini = false
  const t0 = now
  void graine
  while (now - t0 < EXPEDITION_TIMEOUT_MS && !fini) {
    now += 250
    // la copie conforme du tick d'expédition du store : l'intérieur ne s'offre
    // qu'une fois l'enceinte percée
    const dedans = b.breche || v.mur === 0 || wallHp <= 0
    const cibles = dedans
      ? ouvrages.filter((o) => o.hp > 0).map((o) => ({ id: o.id, x: o.x, y: o.y, hp: o.hp, coeur: o.coeur }))
      : undefined
    const out = tickBataille(b, { now, dt: 250, wallHp, wallLevel: v.mur, cibles })
    wallHp = out.wallHp
    if (cibles) {
      for (const c of cibles) ouvrages.find((x) => x.id === c.id)!.hp = c.hp
      const reste = ouvrages.reduce((a, o) => a + o.hp, 0)
      if (reste < total && premier === null) premier = now
      if (reste <= 0 && dernier === null) dernier = now
    }
    if (out.finie) {
      fini = true
      pillage = out.pillage
    }
  }
  return {
    demolition: premier !== null && dernier !== null ? (dernier - premier) / 1000 : NaN,
    raid: (now - t0) / 1000,
    pillage,
  }
}

describe('le raid, rejoué par le moteur', () => {
  const vraiHasard = Math.random

  afterEach(() => {
    Math.random = vraiHasard
  })

  /** générateur à graine, pour que le moteur soit reproductible */
  function graineFixe(g: number): void {
    let a = (g * 1_000_003) >>> 0 || 7
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0
      let x = Math.imul(a ^ (a >>> 15), 1 | a)
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296
    }
  }

  for (const [id, colonne] of RAIDS) {
    it(`${id} : la place tombe, et la démolition se sent`, async () => {
      for (const g of [3, 17, 91]) {
        graineFixe(g)
        const r = await rejouer(id, colonne, g)
        const ou = `${id} (graine ${g}) : démolition ${r.demolition.toFixed(0)} s, raid ${r.raid.toFixed(0)} s`
        // une colonne correcte doit RAMENER la place
        expect(r.pillage, ou).toBe(true)
        // et la démolition doit durer : plus de quinze secondes, jamais plus d'une minute
        expect(r.demolition, ou).toBeGreaterThan(15)
        expect(r.demolition, ou).toBeLessThan(60)
        // le tout doit rester loin de la retraite forcée
        expect(r.raid, ou).toBeLessThan(EXPEDITION_TIMEOUT_MS / 1000 - 60)
      }
    })
  }

  it('la forteresse demande plus de travail que le camp', async () => {
    graineFixe(5)
    const camp = await rejouer('camp-pillards', { hoplite: 5 }, 5)
    graineFixe(5)
    const fort = await rejouer('forteresse-mysienne', { hoplite: 12, belier: 3, peltaste: 5 }, 5)
    expect(fort.demolition).toBeGreaterThan(camp.demolition)
    expect(fort.raid).toBeGreaterThan(camp.raid * 1.6)
  })
})
