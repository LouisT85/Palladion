import { afterEach, describe, expect, it } from 'vitest'
import { STOCKAGE } from './data'
import { creerAlea, poserAlea } from './defi'
import { MAX_TROUPES } from './expeditions'
import {
  ATK_MAX,
  CARTES_MAX,
  COUT_RAID,
  DUEL_VIDE,
  FRAPPEES_MAX,
  GARNISON_MAX_PAR_UNITE,
  HONNEUR_BASE,
  HONNEUR_PAR_ETOILE,
  PART_BUTIN,
  PLAFOND_BUTIN_PAR_RES,
  RANGS,
  REDUC_MIN,
  REVANCHES_MAX,
  VUS_MAX,
  butinOffert,
  carteValide,
  colonneValide,
  consequences,
  creerRaid,
  deroulerRaid,
  duelApresEmission,
  duelApresRaid,
  duelApresRapport,
  duelApresRevanche,
  duelJouable,
  duelSain,
  duelVide,
  emettreCarte,
  empreinteCarte,
  etoilesDuRaid,
  frontsDuRaid,
  graineRaid,
  hommesDe,
  honneurAttaque,
  honneurDefense,
  motifRefusRaid,
  motifRefusRapport,
  pansValides,
  plafondButin,
  prochainRang,
  puissanceCarte,
  rangDe,
  rapportDuRaid,
  rapportValide,
  refusRaid,
  refusRapport,
  resoudreRaid,
  resumeButin,
  resumeCarte,
  type CarteDefense,
  type EtatDuel,
  type IssueRaid,
  type RapportRaid,
  type RefusRaid,
  type RefusRapport,
  type SnapCarte,
  type SnapDuel,
} from './duel'
import type { PanId } from './plandefense'
import type { ResourceId, UnitId } from './types'

/*
 * ═══════════ LES PROMESSES DU DUEL ═══════════
 *
 * Ce fichier n'ouvre jamais le store. Tout ce qui est éprouvé ici est éprouvé sur
 * un instantané, ce qui est la seule façon d'y arriver : `MODE_TEST` rend
 * `payer()` et `peutPayer()` TOUJOURS vrais, donc aucun refus de prix ni aucune
 * déduction de ressources ne se prouve par le store. Le prix d'un raid et le
 * plafond d'un butin se prouvent ici, et nulle part ailleurs.
 *
 * Les quatre familles de promesses, dans l'ordre où elles comptent :
 *
 *  1. LA SERRURE. Une carte retouchée n'est plus la carte qu'on a signée, et le
 *     décor ne casse pas la serrure.
 *  2. LA GRAINE. Elle se déduit de l'assaut, donc elle ne se relance pas ; et
 *     l'ordre des clics n'est pas un dé.
 *  3. LE PLAFOND. On ne perd jamais ce qu'on n'a pas mis en jeu, et une carte
 *     fabriquée à la main n'enrichit personne.
 *  4. LA VÉRIFICATION. Les cinq fraudes, une par une, et chacune avec son motif.
 *
 * ⚠️ `aleaPose()` est un SINGLETON DE MODULE (defi.ts) : un cas qui pose un alea
 * sans le retirer contamine tous les suivants du fichier - et `refusRaid` refuserait
 * alors tout pour `'defi'`. Le `afterEach` ci-dessous est donc une garantie, pas une
 * politesse.
 */

afterEach(() => {
  poserAlea(null)
})

// ── De quoi jouer ────────────────────────────────────────────────────────────

const RESSOURCES_PLEINES: Record<ResourceId, number> = { bois: 2800, pierre: 2800, grain: 2800, bronze: 2800 }

function snapCarte(p: Partial<SnapCarte> = {}): SnapCarte {
  return {
    cite: 'Ilion des Priamides',
    mur: 2,
    murHp: 600,
    tours: 1,
    redoute: 0,
    garnison: { hoplite: 4, lancier: 4, archer: 3 },
    interieur: { acropole: 0, bastion: false, galeries: false, poterne: false, citerne: false },
    plan: { ligne: 'mur', tir: 'tendu', pans: { hoplite: 'nord' }, heros: { hector: 'porte' } },
    heros: [{ id: 'hector', niveau: 3 }],
    atk: 1,
    reduc: 1,
    niveaux: { agora: 2, remparts: 2 },
    resources: { bois: 400, pierre: 400, grain: 1000, bronze: 300 },
    jour: 12,
    ...p,
  }
}

function carte(p: Partial<SnapCarte> = {}, serie = 0): CarteDefense {
  return emettreCarte(snapCarte(p), serie)
}

function snapDuel(p: Partial<SnapDuel> = {}): SnapDuel {
  return {
    duel: DUEL_VIDE,
    army: { lancier: 20, archer: 20, hoplite: 20, frondeur: 20, peltaste: 20, belier: 20, char: 20 },
    grain: 900,
    colonneDehors: false,
    enBataille: false,
    assiege: false,
    jour: 12,
    ...p,
  }
}

/** un règne qui a publié cette carte-là - le point de départ de toute vérification */
function aPublie(c: CarteDefense, p: Partial<SnapDuel> = {}): SnapDuel {
  return snapDuel({ duel: duelApresEmission(DUEL_VIDE, c), ...p })
}

const COLONNE: Partial<Record<UnitId, number>> = { hoplite: 6, lancier: 6, archer: 4, belier: 2 }
const PANS_DEUX: PanId[] = ['porte', 'nord']

/** un rapport honnête, dont la graine et l'issue découlent vraiment de l'assaut */
function rapportHonnete(
  cible: CarteDefense,
  issue: Partial<IssueRaid> = {},
  p: Partial<RapportRaid> = {},
): RapportRaid {
  const colonne = (p.colonne ?? COLONNE) as Partial<Record<UnitId, number>>
  const pans = p.pans ?? PANS_DEUX
  return {
    cite: 'Mycènes des Atrides',
    cible,
    colonne,
    pans,
    graine: graineRaid(empreinteCarte(cible), colonne, pans),
    issue: { victoire: true, etoiles: 3, morts: 3, envoyes: hommesDe(colonne), ...issue },
    riposte: carte({ cite: 'Mycènes des Atrides' }, 7),
    ...p,
  }
}

// ── 1. La serrure ────────────────────────────────────────────────────────────

describe('l’empreinte d’une carte est la serrure du système', () => {
  it('une carte retouchée en chemin n’est plus la carte qu’on a signée', () => {
    const c = carte()
    const affaiblie = carteValide({ ...c, garnison: { ...c.garnison, hoplite: 1 } })
    expect(empreinteCarte(affaiblie)).not.toBe(empreinteCarte(c))
  })

  it('changer le plan change la serrure : le plan EST la défense', () => {
    const c = carte()
    const autre = carteValide({ ...c, plan: { ...c.plan, ligne: 'charge' } })
    expect(empreinteCarte(autre)).not.toBe(empreinteCarte(c))
  })

  it('changer le butin promis change la serrure : c’est le chiffre du chèque', () => {
    const c = carte()
    const gonflee = carteValide({ ...c, butin: { grain: 300 } })
    expect(empreinteCarte(gonflee)).not.toBe(empreinteCarte(c))
  })

  it('le décor, lui, ne casse pas la serrure', () => {
    /*
     * `niveaux` ne sert qu'à dessiner la place. S'il entrait dans l'empreinte, un
     * ami qui monte sa forge pendant qu'on marche sur lui verrait notre rapport
     * refusé - alors qu'il n'a rien changé à sa défense.
     */
    const c = carte()
    const embellie = carteValide({ ...c, niveaux: { agora: 4, forge: 4, temple: 3 } })
    expect(empreinteCarte(embellie)).toBe(empreinteCarte(c))
  })

  it('l’ordre des clés d’un objet n’entre pas dans l’empreinte', () => {
    /*
     * LE DÉFAUT QUE CE CAS GARDE, et il aurait tout cassé : une carte reconstruite
     * par le décodeur ne porte pas ses clés dans le même ordre que la carte émise.
     * Une empreinte prise sur un `JSON.stringify` aurait donc changé sans qu'un
     * seul chiffre bouge, et TOUS les rapports seraient tombés sur « inconnue ».
     */
    const c = carte()
    const remontee = carteValide({
      serie: c.serie,
      jour: c.jour,
      butin: { bronze: c.butin.bronze, grain: c.butin.grain, pierre: c.butin.pierre, bois: c.butin.bois },
      reduc: c.reduc,
      atk: c.atk,
      heros: [...c.heros].reverse(),
      plan: { heros: c.plan.heros, pans: c.plan.pans, tir: c.plan.tir, ligne: c.plan.ligne },
      interieur: c.interieur,
      garnison: { archer: c.garnison.archer, lancier: c.garnison.lancier, hoplite: c.garnison.hoplite },
      redoute: c.redoute,
      tours: c.tours,
      murHp: c.murHp,
      mur: c.mur,
      cite: c.cite,
    })
    expect(empreinteCarte(remontee)).toBe(empreinteCarte(c))
  })

  it('deux cartes identiques publiées à la suite ne portent pas la même empreinte', () => {
    // sans `serie`, le chèque encaissé de la première annulerait le butin de la
    // seconde, et le joueur n'aurait aucun moyen de comprendre pourquoi
    expect(empreinteCarte(carte({}, 1))).not.toBe(empreinteCarte(carte({}, 0)))
  })
})

// ── 2. La graine ─────────────────────────────────────────────────────────────

describe('la graine se déduit de l’assaut, elle ne se relance pas', () => {
  it('même carte, même colonne, mêmes pans : toujours la même graine', () => {
    const ref = empreinteCarte(carte())
    expect(graineRaid(ref, COLONNE, PANS_DEUX)).toBe(graineRaid(ref, COLONNE, PANS_DEUX))
  })

  it('l’ordre des clics sur les pans n’est pas un dé de plus', () => {
    const ref = empreinteCarte(carte())
    expect(graineRaid(ref, COLONNE, ['nord', 'porte'])).toBe(graineRaid(ref, COLONNE, ['porte', 'nord']))
  })

  it('un seul homme de plus, et c’est un autre combat', () => {
    const ref = empreinteCarte(carte())
    expect(graineRaid(ref, { ...COLONNE, archer: 5 }, PANS_DEUX)).not.toBe(graineRaid(ref, COLONNE, PANS_DEUX))
  })

  it('un pan de plus, et c’est un autre combat', () => {
    const ref = empreinteCarte(carte())
    expect(graineRaid(ref, COLONNE, ['porte'])).not.toBe(graineRaid(ref, COLONNE, PANS_DEUX))
  })

  it('deux cibles différentes ne partagent pas une graine', () => {
    const a = empreinteCarte(carte({}, 0))
    const b = empreinteCarte(carte({}, 1))
    expect(graineRaid(a, COLONNE, PANS_DEUX)).not.toBe(graineRaid(b, COLONNE, PANS_DEUX))
  })

  it('une graine n’est jamais nulle : « pas de graine » et « graine zéro » ne se confondent pas', () => {
    for (let n = 0; n < 40; n++) {
      expect(graineRaid(String(n), { hoplite: n }, ['porte'])).toBeGreaterThan(0)
    }
  })
})

// ── 3. Rien de ce qui entre n’est cru sur parole ──────────────────────────────

describe('une carte venue d’ailleurs est bornée, jamais crue', () => {
  it('un grenier de rêve est ramené au plafond', () => {
    const c = carteValide({ ...carte(), butin: { grain: 999_999, bronze: 50_000 } })
    expect(c.butin.grain).toBe(PLAFOND_BUTIN_PAR_RES)
    expect(c.butin.bronze).toBe(PLAFOND_BUTIN_PAR_RES)
  })

  it('une garnison de mille hoplites est ramenée à ce qu’une cité peut nourrir', () => {
    const c = carteValide({ ...carte(), garnison: { hoplite: 1000 } })
    expect(c.garnison.hoplite).toBe(GARNISON_MAX_PAR_UNITE)
  })

  it('un mur de cent mille points ne dépasse pas le double de son niveau', () => {
    const c = carteValide({ ...carte(), mur: 2, murHp: 100_000 })
    expect(c.murHp).toBe(1200)
  })

  it('le bélier n’est pas une défense : il n’entre pas dans une garnison publiée', () => {
    // `creerBataille` ne met JAMAIS de bélier parmi les défenseurs. L'accepter
    // aurait laissé publier une garnison qui pèse dans la puissance affichée et ne
    // se bat pas - une carte qui mentirait sans que son auteur l'ait voulu.
    const c = carteValide({ ...carte(), garnison: { hoplite: 3, belier: 20 } })
    expect(c.garnison.belier).toBeUndefined()
    expect(hommesDe(c.garnison)).toBe(3)
  })

  it('un défenseur ne se donne pas quatre fois la force d’un homme', () => {
    const c = carteValide({ ...carte(), atk: 40, reduc: 0 })
    expect(c.atk).toBe(ATK_MAX)
    expect(c.reduc).toBe(REDUC_MIN)
  })

  it('un héros de niveau cent n’est qu’un héros de niveau cinq', () => {
    const c = carteValide({ ...carte(), heros: [{ id: 'achille', niveau: 99 }] })
    expect(c.heros[0]).toEqual({ id: 'achille', niveau: 5 })
  })

  it('un nom de héros inventé n’entre pas dans la garnison', () => {
    const c = carteValide({ ...carte(), heros: [{ id: 'agamemnon-le-faux', niveau: 3 }] })
    expect(c.heros).toHaveLength(0)
  })

  it('un plan illisible vaut un plan sain, jamais un ordre au hasard', () => {
    const c = carteValide({ ...carte(), plan: { ligne: 'voler', tir: 'catapulte', pans: { hoplite: 'ouest' } } })
    expect(c.plan.ligne).toBe('tenir')
    expect(c.plan.tir).toBe('tendu')
    expect(c.plan.pans.hoplite).toBeUndefined()
  })

  it('rien du tout ne fait pas planter : cela fait une cité sans nom et sans mur', () => {
    const c = carteValide(undefined)
    expect(c.cite).toBe('Une cité sans nom')
    expect(c.mur).toBe(0)
    expect(c.murHp).toBe(0)
    expect(hommesDe(c.garnison)).toBe(0)
    expect(() => empreinteCarte(c)).not.toThrow()
  })

  it('un pan inventé n’ouvre aucun front', () => {
    expect(pansValides(['ouest', 'ciel'])).toEqual([])
    expect(frontsDuRaid(['ouest'])).toEqual([])
  })

  it('une colonne de mille hommes est rognée à vingt, jamais refusée en silence', () => {
    const c = colonneValide({ hoplite: 500, lancier: 500 })
    expect(hommesDe(c)).toBe(MAX_TROUPES)
  })

  it('un rapport tronqué se lit sans planter et ne prétend rien', () => {
    const r = rapportValide({ cible: {}, colonne: null, pans: 'porte', issue: 'gagné' })
    expect(r.issue.victoire).toBe(false)
    expect(r.pans).toEqual([])
    expect(r.riposte).toBeNull()
  })

  it('un rapport ne peut pas annoncer plus de morts qu’il n’avait d’hommes', () => {
    const r = rapportValide({ colonne: { hoplite: 4 }, issue: { victoire: true, etoiles: 9, morts: 900 } })
    expect(r.issue.morts).toBe(4)
    expect(r.issue.etoiles).toBe(3)
  })
})

// ── 4. Le butin gelé ─────────────────────────────────────────────────────────

describe('publier sa carte n’est pas signer un chèque en blanc', () => {
  it('on met en jeu un huitième de ses greniers', () => {
    expect(butinOffert({ bois: 1000, pierre: 0, grain: 500, bronze: 80 })).toEqual({
      bois: Math.floor(1000 * PART_BUTIN),
      grain: Math.floor(500 * PART_BUTIN),
      bronze: Math.floor(80 * PART_BUTIN),
    })
  })

  it('un règne pauvre ne met presque rien en jeu - c’est la part, pas la somme', () => {
    expect(butinOffert({ bois: 10, pierre: 4, grain: 10, bronze: 0 })).toEqual({ bois: 1, grain: 1 })
  })

  it('et une agora de marbre ne met pas en jeu trois cents fois plus', () => {
    const b = butinOffert(RESSOURCES_PLEINES)
    for (const r of ['bois', 'pierre', 'grain', 'bronze'] as ResourceId[]) {
      expect(b[r]).toBeLessThanOrEqual(PLAFOND_BUTIN_PAR_RES)
    }
    // le plafond mord dès l'agora 4 : 12 % de 2800 valent 336
    expect(b.grain).toBe(PLAFOND_BUTIN_PAR_RES)
  })

  it('le plafond se dit AVANT de publier, agora par agora', () => {
    expect(plafondButin(1)).toBe(Math.floor(STOCKAGE[1] * PART_BUTIN))
    expect(plafondButin(4)).toBe(PLAFOND_BUTIN_PAR_RES)
  })

  it('le butin est GELÉ à l’émission : enrichir ses coffres ensuite n’augmente pas la mise', () => {
    /*
     * C'est la promesse centrale du lot, et elle se lit ici en trois lignes : la
     * carte a été émise sur mille mesures de grain, le défenseur en a maintenant
     * deux mille huit cents, et le raid n'emporte toujours que ce que la carte
     * promettait.
     */
    const c = carte({ resources: { bois: 0, pierre: 0, grain: 1000, bronze: 0 } })
    const s = aPublie(c)
    const pris = consequences(s, rapportHonnete(c), RESSOURCES_PLEINES).pris
    expect(pris.grain).toBe(Math.floor(1000 * PART_BUTIN))
  })

  it('et l’on ne paie jamais ce qu’on n’a plus', () => {
    const c = carte({ resources: { bois: 0, pierre: 0, grain: 1000, bronze: 0 } })
    const s = aPublie(c)
    const pris = consequences(s, rapportHonnete(c), { bois: 0, pierre: 0, grain: 7, bronze: 0 }).pris
    expect(pris.grain).toBe(7)
  })

  it('coffres vides : on le DIT, au lieu d’afficher un butin nul sans un mot', () => {
    const c = carte()
    const s = aPublie(c)
    const out = consequences(s, rapportHonnete(c), { bois: 0, pierre: 0, grain: 0, bronze: 0 })
    expect(resumeButin(out.pris)).toBe('rien à prendre')
    expect(out.note).toMatch(/vides/)
  })

  it('une carte ne paie qu’une fois, et la seconde colonne trouve la place vide', () => {
    const c = carte()
    let etat = duelApresEmission(DUEL_VIDE, c)
    const r1 = rapportHonnete(c)
    const c1 = consequences(snapDuel({ duel: etat }), r1, RESSOURCES_PLEINES)
    expect(c1.pris.grain).toBeGreaterThan(0)
    etat = duelApresRapport(etat, r1, c1, 13)
    // un autre ami, une autre colonne, donc un autre rapport - mais la même carte
    const r2 = rapportHonnete(c, {}, { colonne: { hoplite: 10, lancier: 8 }, cite: 'Sparte' })
    const c2 = consequences(snapDuel({ duel: etat }), r2, RESSOURCES_PLEINES)
    expect(c2.pris).toEqual({})
    expect(c2.note).toMatch(/pill/)
    // …et la revanche, elle, s'ouvre quand même : l'affront a bien eu lieu
    expect(c2.revanche).toBe(true)
  })
})

// ── 5. Le raid : ce qui le refuse, et pourquoi ────────────────────────────────

describe('un raid refusé enseigne la règle au lieu de la punir', () => {
  const c = carte()

  it('le village assiégé : personne ne sort', () => {
    expect(refusRaid(snapDuel({ assiege: true }), c, COLONNE, PANS_DEUX)).toBe('assiege')
  })

  it('on se bat sous vos murs : le héraut attend', () => {
    expect(refusRaid(snapDuel({ enBataille: true }), c, COLONNE, PANS_DEUX)).toBe('enBataille')
  })

  it('une cité ne fait pas partir deux colonnes', () => {
    expect(refusRaid(snapDuel({ colonneDehors: true }), c, COLONNE, PANS_DEUX)).toBe('colonneDehors')
  })

  it('un raid d’honneur par journée de jeu, pas plus', () => {
    const veille = snapDuel({ duel: { ...DUEL_VIDE, dernierRaid: 12 }, jour: 12 })
    expect(refusRaid(veille, c, COLONNE, PANS_DEUX)).toBe('attente')
    // et la journée suivante, la colonne repart
    expect(refusRaid({ ...veille, jour: 13 }, c, COLONNE, PANS_DEUX)).toBeNull()
  })

  it('on ne se pille pas soi-même pour se faire un nom', () => {
    expect(refusRaid(aPublie(c), c, COLONNE, PANS_DEUX)).toBe('soi')
  })

  it('on ne frappe pas deux fois la même carte : l’honneur n’est pas un compteur qu’on clique', () => {
    const apres = duelApresRaid(DUEL_VIDE, c, 12)
    expect(refusRaid(snapDuel({ duel: apres, jour: 13 }), c, COLONNE, PANS_DEUX)).toBe('deja')
  })

  it('une carte sans mur ni garnison n’est pas une cible : c’est un code cassé', () => {
    expect(refusRaid(snapDuel(), carteValide({}), COLONNE, PANS_DEUX)).toBe('carte')
  })

  it('une colonne compte de un à vingt hommes', () => {
    expect(refusRaid(snapDuel(), c, {}, PANS_DEUX)).toBe('colonne')
    expect(refusRaid(snapDuel(), c, { hoplite: 21 }, PANS_DEUX)).toBe('colonne')
    expect(refusRaid(snapDuel(), c, { hoplite: MAX_TROUPES }, PANS_DEUX)).toBeNull()
  })

  it('on ne fait pas marcher des hommes qu’on n’a pas', () => {
    const pauvre = snapDuel({
      army: { lancier: 1, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 },
    })
    expect(refusRaid(pauvre, c, { lancier: 4 }, PANS_DEUX)).toBe('effectifs')
    expect(refusRaid(pauvre, c, { lancier: 1 }, PANS_DEUX)).toBeNull()
  })

  it('par où entrez-vous ? un assaut sans front n’est pas un assaut', () => {
    expect(refusRaid(snapDuel(), c, COLONNE, [])).toBe('pans')
  })

  it('une colonne mange en chemin, et c’est le seul prix en ressources', () => {
    // ⚠️ CE CAS NE PEUT PAS EXISTER PAR LE STORE : `MODE_TEST` rend `peutPayer()`
    // toujours vrai. Le prix d'un raid ne se prouve que dans le module pur.
    expect(refusRaid(snapDuel({ grain: (COUT_RAID.grain ?? 0) - 1 }), c, COLONNE, PANS_DEUX)).toBe('grain')
    expect(refusRaid(snapDuel({ grain: COUT_RAID.grain ?? 0 }), c, COLONNE, PANS_DEUX)).toBeNull()
  })

  it('on ne duelle pas depuis une partie de défi : le classement repose sur cette graine', () => {
    /*
     * ⚠️ ET C'EST `duelJouable()` QU'IL FAUT INTERROGER AVANT TOUT DÉROULÉ, y compris
     * là où `refusRaid` ne passe pas (la vérification d'un rapport). `resoudreRaid`
     * pose une source de hasard et la RETIRE ensuite : appelé pendant un défi, il
     * effacerait la graine du classement sans qu'aucun refus ne s'en plaigne.
     */
    expect(duelJouable()).toBe(true)
    poserAlea(creerAlea(4242))
    expect(duelJouable()).toBe(false)
    expect(refusRaid(snapDuel(), c, COLONNE, PANS_DEUX)).toBe('defi')
  })

  it('tout refus a son motif, et aucun motif n’est vide', () => {
    const tous: RefusRaid[] = [
      'defi',
      'assiege',
      'enBataille',
      'colonneDehors',
      'attente',
      'carte',
      'soi',
      'deja',
      'colonne',
      'effectifs',
      'pans',
      'grain',
    ]
    for (const r of tous) expect(motifRefusRaid(r).length).toBeGreaterThan(20)
  })
})

// ── 6. La vérification : les cinq fraudes ────────────────────────────────────

describe('la vérification est l’anti-triche, et elle se lit fraude par fraude', () => {
  const c = carte()
  const bonne: IssueRaid = { victoire: true, etoiles: 3, morts: 3, envoyes: hommesDe(COLONNE) }

  it('un rapport honnête passe', () => {
    expect(refusRapport(aPublie(c), rapportHonnete(c), bonne)).toBeNull()
  })

  it('un code fabriqué de toutes pièces ne correspond à aucune carte émise', () => {
    const inventee = carte({ cite: 'Cité de nulle part' }, 99)
    expect(refusRapport(aPublie(c), rapportHonnete(inventee), bonne)).toBe('inconnue')
  })

  it('une carte émise mais retouchée pour affaiblir la garnison tombe sur la même serrure', () => {
    const s = aPublie(c)
    const trichee = carteValide({ ...c, garnison: { hoplite: 1 } })
    expect(refusRapport(s, rapportHonnete(trichee), bonne)).toBe('inconnue')
  })

  it('une graine choisie parmi mille jusqu’à trouver celle qui gagne est refusée', () => {
    const s = aPublie(c)
    const r = { ...rapportHonnete(c), graine: 1234 }
    expect(refusRapport(s, r, bonne)).toBe('graine')
  })

  it('une issue simplement inventée est refusée, au champ près', () => {
    const s = aPublie(c)
    const r = rapportHonnete(c)
    expect(refusRapport(s, r, { ...bonne, victoire: false })).toBe('issue')
    expect(refusRapport(s, r, { ...bonne, etoiles: 1 })).toBe('issue')
    expect(refusRapport(s, r, { ...bonne, morts: 4 })).toBe('issue')
  })

  it('un rapport déjà porté au conseil ne s’applique pas deux fois', () => {
    const c0 = carte()
    let etat = duelApresEmission(DUEL_VIDE, c0)
    const r = rapportHonnete(c0)
    const cons = consequences(snapDuel({ duel: etat }), r, RESSOURCES_PLEINES)
    etat = duelApresRapport(etat, r, cons, 13)
    expect(refusRapport(snapDuel({ duel: etat }), r, bonne)).toBe('deja')
  })

  it('un combat qui ne s’achève pas ne se juge pas', () => {
    // `deroulerRaid` rend `null` quand la borne de battements tombe avant le
    // verdict. Comparer un verdict à un non-verdict aurait refusé un rapport
    // honnête, et le joueur n'aurait eu aucun moyen de comprendre pourquoi.
    expect(refusRapport(aPublie(c), rapportHonnete(c), null)).toBe('indecis')
  })

  it('un rapport annonçant une colonne impossible se refuse avant tout déroulé', () => {
    const s = aPublie(c)
    expect(refusRapport(s, { ...rapportHonnete(c), colonne: {} }, bonne)).toBe('colonne')
    expect(refusRapport(s, { ...rapportHonnete(c), pans: [] }, bonne)).toBe('pans')
  })

  it('on ne juge pas un rapport depuis une partie de défi', () => {
    poserAlea(creerAlea(7))
    expect(refusRapport(aPublie(c), rapportHonnete(c), bonne)).toBe('defi')
  })

  it('tout refus de rapport a son motif, et aucun motif n’est vide', () => {
    const tous: RefusRapport[] = ['defi', 'colonne', 'pans', 'inconnue', 'graine', 'deja', 'indecis', 'issue']
    for (const r of tous) expect(motifRefusRapport(r).length).toBeGreaterThan(20)
  })
})

// ── 7. L’honneur, et le rang ─────────────────────────────────────────────────

describe('il y a autre chose à gagner que des ressources', () => {
  it('un raid gagné rapporte de dix à vingt-deux points d’honneur', () => {
    expect(honneurAttaque({ victoire: true, etoiles: 0, morts: 18, envoyes: 20 })).toBe(HONNEUR_BASE)
    expect(honneurAttaque({ victoire: true, etoiles: 3, morts: 1, envoyes: 20 })).toBe(
      HONNEUR_BASE + 3 * HONNEUR_PAR_ETOILE,
    )
  })

  it('un raid perdu ne rapporte rien à l’attaquant', () => {
    expect(honneurAttaque({ victoire: false, etoiles: 0, morts: 20, envoyes: 20 })).toBe(0)
  })

  it('et un plan qui TIENT rapporte autant : c’est la raison de publier sa carte', () => {
    // sans cela, publier n'était qu'un risque, et le système entier reposait sur la
    // générosité des joueurs
    expect(honneurDefense({ victoire: false, etoiles: 0, morts: 20, envoyes: 20 })).toBe(
      HONNEUR_BASE + 3 * HONNEUR_PAR_ETOILE,
    )
    expect(honneurDefense({ victoire: false, etoiles: 0, morts: 1, envoyes: 20 })).toBe(HONNEUR_BASE)
    expect(honneurDefense({ victoire: true, etoiles: 3, morts: 1, envoyes: 20 })).toBe(0)
  })

  it('les étoiles du raid suivent l’échelle des expéditions', () => {
    expect(etoilesDuRaid(1, 20)).toBe(3)
    expect(etoilesDuRaid(8, 20)).toBe(2)
    expect(etoilesDuRaid(15, 20)).toBe(1)
  })

  it('le rang suit l’honneur, et le premier rang est « sans renom »', () => {
    expect(rangDe(0).nom).toBe(RANGS[0].nom)
    expect(rangDe(24).nom).toBe(RANGS[0].nom)
    expect(rangDe(25).nom).toBe(RANGS[1].nom)
    expect(rangDe(10_000).nom).toBe(RANGS[RANGS.length - 1].nom)
  })

  it('le sommet n’a pas de suivant, et l’on dit ce qui manque pour le reste', () => {
    expect(prochainRang(0)).toEqual({ rang: RANGS[1], manque: RANGS[1].seuil })
    expect(prochainRang(RANGS[RANGS.length - 1].seuil)).toBeNull()
  })

  it('l’honneur d’un règne ne descend jamais sous zéro', () => {
    const etat: EtatDuel = { ...DUEL_VIDE, honneur: 2 }
    const c = carte()
    const apres = duelApresRapport(etat, rapportHonnete(c), { pris: {}, honneur: -50, revanche: false, note: null }, 13)
    expect(apres.honneur).toBe(0)
  })
})

// ── 8. La revanche ───────────────────────────────────────────────────────────

describe('la revanche est le sel du système', () => {
  it('un rapport appliqué ouvre le droit de frapper en retour, et la carte est DANS le rapport', () => {
    const c = carte()
    const etat = duelApresEmission(DUEL_VIDE, c)
    const r = rapportHonnete(c)
    const cons = consequences(snapDuel({ duel: etat }), r, RESSOURCES_PLEINES)
    const apres = duelApresRapport(etat, r, cons, 13)
    expect(apres.revanches).toHaveLength(1)
    expect(apres.revanches[0].cite).toBe('Mycènes des Atrides')
    expect(apres.revanches[0].pris).toEqual(cons.pris)
    // et cette carte-là est frappable : ce n'est ni la nôtre, ni une carte déjà frappée
    expect(refusRaid(snapDuel({ duel: apres, jour: 14 }), apres.revanches[0].carte, COLONNE, PANS_DEUX)).toBeNull()
  })

  it('un raid repoussé n’ouvre AUCUNE revanche : on ne gagne jamais les lauriers et la vengeance', () => {
    const c = carte()
    const etat = duelApresEmission(DUEL_VIDE, c)
    const r = rapportHonnete(c, { victoire: false, etoiles: 0, morts: 20 })
    const cons = consequences(snapDuel({ duel: etat }), r, RESSOURCES_PLEINES)
    expect(cons.pris).toEqual({})
    expect(cons.revanche).toBe(false)
    expect(cons.honneur).toBeGreaterThan(0)
    expect(duelApresRapport(etat, r, cons, 13).revanches).toHaveLength(0)
  })

  it('un rapport sans riposte lisible s’applique, mais sans vengeance à prendre', () => {
    const c = carte()
    const etat = duelApresEmission(DUEL_VIDE, c)
    const r = { ...rapportHonnete(c), riposte: null }
    const cons = consequences(snapDuel({ duel: etat }), r, RESSOURCES_PLEINES)
    expect(cons.pris.grain).toBeGreaterThan(0)
    expect(cons.revanche).toBe(false)
  })

  it('trois vengeances au plus : la quatrième chasse la plus ancienne', () => {
    let etat = DUEL_VIDE
    const refs: string[] = []
    for (let n = 0; n < REVANCHES_MAX + 1; n++) {
      const c = carte({}, 100 + n)
      etat = duelApresEmission(etat, c)
      const r = rapportHonnete(c, {}, { riposte: carte({ cite: `Cité ${n}` }, 500 + n), cite: `Cité ${n}` })
      refs.push(empreinteCarte(r.riposte!))
      etat = duelApresRapport(etat, r, consequences(snapDuel({ duel: etat }), r, RESSOURCES_PLEINES), 13 + n)
    }
    expect(etat.revanches).toHaveLength(REVANCHES_MAX)
    expect(etat.revanches.map((r) => r.ref)).not.toContain(refs[0])
  })

  it('deux affronts du même agresseur avec la même carte ne font pas deux vengeances', () => {
    const a = carte({}, 1)
    const b = carte({}, 2)
    const riposte = carte({ cite: 'Mycènes des Atrides' }, 7)
    let etat = duelApresEmission(duelApresEmission(DUEL_VIDE, a), b)
    for (const cible of [a, b]) {
      const r = rapportHonnete(cible, {}, { riposte })
      etat = duelApresRapport(etat, r, consequences(snapDuel({ duel: etat }), r, RESSOURCES_PLEINES), 13)
    }
    expect(etat.revanches).toHaveLength(1)
  })

  it('une revanche ne se perd JAMAIS toute seule - c’est la réponse au rattrapage hors ligne', () => {
    /*
     * ⚠️ PIÈGE 4 : huit heures d'absence avancent le calendrier de SOIXANTE
     * journées. Un premier jet donnait huit journées de péremption à une revanche :
     * le joueur revenait de son déjeuner devant trois vengeances périmées, sans
     * avoir rien décidé. Elle ne se perd donc que par un geste du joueur - frapper,
     * ou accepter un quatrième affront.
     */
    const c = carte()
    let etat = duelApresEmission(DUEL_VIDE, c)
    const r = rapportHonnete(c)
    etat = duelApresRapport(etat, r, consequences(snapDuel({ duel: etat }), r, RESSOURCES_PLEINES), 3)
    expect(etat.revanches).toHaveLength(1)
    // mille journées plus tard - soit bien au-delà de tout rattrapage hors ligne
    expect(etat.revanches[0].jour).toBe(3)
    expect(duelApresRevanche(etat, 'une-autre-carte').revanches).toHaveLength(1)
  })

  it('une revanche frappée n’est plus due', () => {
    const c = carte()
    let etat = duelApresEmission(DUEL_VIDE, c)
    const r = rapportHonnete(c)
    etat = duelApresRapport(etat, r, consequences(snapDuel({ duel: etat }), r, RESSOURCES_PLEINES), 13)
    const ref = etat.revanches[0].ref
    expect(duelApresRevanche(etat, ref).revanches).toHaveLength(0)
  })
})

// ── 9. Les bornes de l’état ──────────────────────────────────────────────────

describe('une liste qui enfle est une sauvegarde qui casse', () => {
  it('dix-huit cartes en mémoire, pas dix-neuf', () => {
    let etat = DUEL_VIDE
    for (let n = 0; n < CARTES_MAX + 4; n++) etat = duelApresEmission(etat, carte({}, n))
    expect(etat.cartes).toHaveLength(CARTES_MAX)
    // la plus récente en tête, et le compteur d'émissions ne s'arrête pas, lui
    expect(etat.cartes[0].ref).toBe(empreinteCarte(carte({}, CARTES_MAX + 3)))
    expect(etat.emises).toBe(CARTES_MAX + 4)
  })

  it('DOUZE RAIDS N’ÉVINCENT PAS LA CARTE QU’ON A PUBLIÉE POUR SES AMIS', () => {
    /*
     * LE DÉFAUT MESURÉ QUI A FAIT PASSER `CARTES_MAX` DE SIX À DIX-HUIT, et il ne se
     * voyait qu'entre deux joueurs. Frapper ÉMET une carte : `lancerRaidDuel` joint
     * la sienne au rapport pour que la revanche existe, et cette carte-là occupe une
     * place dans `cartes`. Avec six places, six raids - six journées, moins d'une
     * heure de jeu - chassaient la carte publiée le matin ; le rapport honnête de
     * l'ami tombait ensuite sur `'inconnue'`, on ne perdait jamais le butin promis,
     * et lui n'avait ni honneur ni vengeance.
     *
     * On borne ici par `FRAPPEES_MAX`, parce que c'est le nombre de raids qu'un règne
     * garde en mémoire : au-delà, il ne SAIT plus qu'il a frappé, et la question ne se
     * pose plus.
     */
    const publiee = carte({ cite: 'Ma cité, donnée à trois amis' }, 0)
    let etat = duelApresEmission(DUEL_VIDE, publiee)
    for (let n = 1; n <= FRAPPEES_MAX; n++) {
      const cible = carte({ cite: `Cible ${n}` }, 100 + n)
      // ce que le store fait à chaque raid, dans le même ordre : on note la frappe,
      // et l'on émet SA propre carte pour que l'adversaire puisse se venger
      etat = duelApresEmission(duelApresRaid(etat, cible, n), carte({ cite: 'Ma cité' }, n))
    }
    expect(etat.frappees).toHaveLength(FRAPPEES_MAX)
    expect(etat.cartes.some((c) => c.ref === empreinteCarte(publiee))).toBe(true)
    // et le rapport de l'ami est donc JUGEABLE, au lieu d'être refusé pour
    // « inconnue » : c'est la seule chose que ce cas défend vraiment
    const r = rapportHonnete(publiee)
    expect(refusRapport(snapDuel({ duel: etat }), r, r.issue)).toBeNull()
  })

  it('republier exactement la même carte ne la compte pas deux fois', () => {
    const c = carte()
    const etat = duelApresEmission(duelApresEmission(DUEL_VIDE, c), c)
    expect(etat.cartes).toHaveLength(1)
  })

  it('douze cartes frappées en mémoire, pas plus', () => {
    let etat = DUEL_VIDE
    for (let n = 0; n < FRAPPEES_MAX + 5; n++) etat = duelApresRaid(etat, carte({}, n), 10 + n)
    expect(etat.frappees).toHaveLength(FRAPPEES_MAX)
    expect(etat.dernierRaid).toBe(10 + FRAPPEES_MAX + 4)
  })

  it('vingt-quatre rapports appliqués en mémoire, pas plus', () => {
    let etat = DUEL_VIDE
    for (let n = 0; n < VUS_MAX + 5; n++) {
      const c = carte({}, n)
      etat = duelApresEmission(etat, c)
      const r = rapportHonnete(c)
      etat = duelApresRapport(etat, r, { pris: {}, honneur: 0, revanche: false, note: null }, 13)
    }
    expect(etat.vus).toHaveLength(VUS_MAX)
  })

  it('une sauvegarde d’avant le duel, ou reprise à la main, se recharge sans planter', () => {
    /*
     * ⚠️ PIÈGE 3, quatrième liste : la migration d'`init()`. `refusRaid` lit
     * `duel.cartes.some(...)` au premier clic du panneau ; un `cartes` qui serait une
     * chaîne (fichier repris à la main, version future) ferait planter le panneau au
     * lieu de refuser un geste. Et les quatre listes sont RE-BORNÉES en se
     * rechargeant : une sauvegarde qui aurait grossi ailleurs revient dans ses limites.
     */
    expect(duelSain(undefined)).toEqual(DUEL_VIDE)
    expect(duelSain({ cartes: 'oui', vus: 3, revanches: null, honneur: -40 })).toEqual(DUEL_VIDE)
    const gros = duelSain({
      cartes: Array.from({ length: 40 }, (_, n) => ({ ref: `r${n}`, jour: n, butin: { grain: 10 }, pille: false })),
      frappees: Array.from({ length: 40 }, (_, n) => `f${n}`),
      vus: Array.from({ length: 80 }, (_, n) => n),
      revanches: Array.from({ length: 9 }, (_, n) => ({ ref: `x${n}`, cite: 'C', carte: {}, jour: 1, pris: {} })),
      honneur: 42,
      emises: 3,
    })
    expect(gros.cartes).toHaveLength(CARTES_MAX)
    expect(gros.frappees).toHaveLength(FRAPPEES_MAX)
    expect(gros.vus).toHaveLength(VUS_MAX)
    expect(gros.revanches).toHaveLength(REVANCHES_MAX)
    // `emises` ne peut pas être plus petit que le nombre de cartes retenues, sinon
    // deux publications de suite porteraient la même `serie` et la même empreinte
    expect(gros.emises).toBeGreaterThanOrEqual(gros.cartes.length)
    expect(gros.honneur).toBe(42)
  })

  it('deux règnes neufs ne partagent pas leurs listes - c’est la règle d’isolation', () => {
    /*
     * `etatInitial()` doit appeler `duelVide()` et non poser `DUEL_VIDE` : deux
     * parties qui partageraient le même tableau `cartes` verraient la seconde
     * hériter des publications de la première, et un rapport adressé à une partie
     * abandonnée s'appliquerait dans la suivante.
     */
    const a = duelVide()
    const b = duelVide()
    expect(a).toEqual(DUEL_VIDE)
    expect(a.cartes).not.toBe(b.cartes)
    expect(a.revanches).not.toBe(b.revanches)
  })

  it('l’état d’un règne qui n’a jamais duellé ne porte que des vides', () => {
    // le repli d'une sauvegarde d'avant le duel : `init` laisse celui d'`etatInitial`
    expect(DUEL_VIDE).toEqual({
      cartes: [],
      emises: 0,
      frappees: [],
      vus: [],
      revanches: [],
      honneur: 0,
      dernierRaid: 0,
    })
  })
})

// ── 10. Le combat lui-même ───────────────────────────────────────────────────

describe('le raid se joue avec le moteur existant, sur la géométrie de l’expédition', () => {
  it('LE PLAN DU DÉFENSEUR COMMANDE LA BATAILLE - c’est toute la promesse du lot', () => {
    const c = carte({ plan: { ligne: 'charge', tir: 'cloche', pans: {}, heros: {} } })
    const b = creerRaid(c, COLONNE, PANS_DEUX)
    expect(b.ordres?.ligne).toBe('charge')
    expect(b.ordres?.tir).toBe('cloche')
    // et les ordres servent le camp de la CARTE, pas celui de l'écran
    expect(b.campJoueur).toBe('defense')
  })

  it('un héros de la garnison tient le pan que son plan lui donne', () => {
    const c = carte({
      plan: { ligne: 'tenir', tir: 'tendu', pans: {}, heros: { hector: 'nord' } },
      heros: [{ id: 'hector', niveau: 4 }],
    })
    const b = creerRaid(c, COLONNE, ['porte', 'nord'])
    const rangNord = b.secteurs.findIndex((s) => s.nom.includes('nord'))
    const hector = b.fighters.find((f) => f.heros === 'hector')
    expect(hector?.camp).toBe('defense')
    expect(hector?.secteur).toBe(rangNord)
  })

  it('un pan qu’on n’assaille pas ce soir-là laisse dormir l’ordre, il ne le déraille pas', () => {
    const c = carte({ plan: { ligne: 'tenir', tir: 'tendu', pans: { hoplite: 'sud' }, heros: {} } })
    const b = creerRaid(c, COLONNE, ['porte'])
    expect(b.ordres?.secteurs.hoplite).toBeUndefined()
  })

  it('les fronts naissent sur la scène d’expédition, pas sur la carte du village', () => {
    /*
     * Les `spawn` de `SECTEURS` sont écrits pour la carte du VILLAGE, dont la boîte
     * fait plus du double. Les reprendre tels quels faisait apparaître la colonne du
     * sud à y = 790 sur une scène qui n'en fait que 560 : des hommes qui marchent
     * depuis le néant pendant vingt secondes.
     */
    for (const f of frontsDuRaid(['porte', 'nord', 'sud'])) {
      expect(f.spawn.x).toBeGreaterThan(0)
      expect(f.spawn.x).toBeLessThan(900)
      expect(f.spawn.y).toBeGreaterThan(0)
      expect(f.spawn.y).toBeLessThan(560)
    }
  })

  it('assaillir un seul pan concentre toute l’enceinte devant soi', () => {
    // `creerBataille` divise la structure entre les fronts : un pan seul en encaisse
    // la totalité, trois pans un tiers chacun. C'est l'arbitrage que l'attaquant
    // achète en désignant ses pans, et il faut qu'il soit vrai.
    const c = carte({ murHp: 600 })
    expect(creerRaid(c, COLONNE, ['porte']).secteurs[0].max).toBe(600)
    expect(creerRaid(c, COLONNE, ['porte', 'nord', 'sud']).secteurs[0].max).toBe(200)
  })

  it('LE CHOIX DES PANS CHANGE L’ISSUE : ce n’est pas un réglage décoratif', () => {
    /*
     * L'attaquant ne décide que de sa colonne et de ses pans (décision 1). Il fallait
     * donc prouver que le second levier PÈSE, parce qu'« un réglage sans effet est
     * pire qu'un réglage absent : il se croit obéi ».
     *
     * MESURÉ sur douze graines et consigné dans l'en-tête de `frontsDuRaid` : contre
     * une carte de puissance 345, vingt hoplites lancés sur UN pan y laissent 8,7
     * hommes en moyenne et rapportent 1,8 étoile ; lancés sur TROIS, ils en laissent
     * 16,3, ne rapportent plus que 0,8 étoile et échouent deux fois sur douze.
     *
     * ⚠️ ON MOYENNE, ET C'EST LE POINT DE CE CAS. Un premier jet comparait UNE graine
     * et affirmait « disperser tue » : il tombait sur la première carte où le tirage
     * donnait l'inverse (6 morts sur trois pans contre 7 sur un seul). Le levier est
     * une TENDANCE, pas une loi - et un test qui prend une tendance pour une loi ne
     * garde rien du tout, il se contente d'être fragile.
     */
    const colonne: Partial<Record<UnitId, number>> = { hoplite: 20 }
    /*
     * La carte exacte de la mesure, et son plan compris : « Tenir / Tir tendu », aucun
     * pan assigné, aucun héros. Le plan par défaut de ce fichier (mur de boucliers,
     * hoplites au nord) donne d'AUTRES chiffres - c'est bien la preuve que le plan du
     * défenseur pèse, mais un cas qui mélange deux réglages ne mesure ni l'un ni
     * l'autre. `serie` fait varier l'empreinte, donc la graine : six combats distincts.
     */
    const dure = (serie: number) =>
      carte(
        {
          mur: 3,
          murHp: 1250,
          tours: 1,
          redoute: 0,
          garnison: { hoplite: 6, lancier: 8, archer: 5, frondeur: 3, peltaste: 2, char: 1 },
          plan: { ligne: 'tenir', tir: 'tendu', pans: {}, heros: {} },
          heros: [],
        },
        serie,
      )
    const moyenne = (pans: PanId[]) => {
      let morts = 0
      let etoiles = 0
      for (let k = 0; k < 6; k++) {
        const c = dure(k)
        const o = deroulerRaid(c, colonne, pans, graineRaid(empreinteCarte(c), colonne, pans))!
        morts += o.morts
        etoiles += o.etoiles
      }
      return { morts: morts / 6, etoiles: etoiles / 6 }
    }
    const unPan = moyenne(['porte'])
    const troisPans = moyenne(['porte', 'nord', 'sud'])
    // relevé : 7,67 morts et 2,00 étoiles sur un pan, 15,50 et 1,00 sur trois
    expect(troisPans.morts).toBeGreaterThan(unPan.morts)
    expect(troisPans.etoiles).toBeLessThan(unPan.etoiles)
  })

  it('LE MÊME ASSAUT, DEUX FOIS, DONNE LA MÊME ISSUE - sans cela rien de ce lot ne tient', () => {
    const c = carte()
    const g = graineRaid(empreinteCarte(c), COLONNE, PANS_DEUX)
    const a = deroulerRaid(c, COLONNE, PANS_DEUX, g)
    const b = deroulerRaid(c, COLONNE, PANS_DEUX, g)
    expect(a).not.toBeNull()
    expect(b).toEqual(a)
  })

  it('et deux graines différentes ne donnent pas le même combat', () => {
    const c = carte()
    const issues = new Set<string>()
    for (const g of [11, 22, 33, 44, 55, 66, 77, 88]) {
      issues.add(JSON.stringify(deroulerRaid(c, COLONNE, PANS_DEUX, g)))
    }
    expect(issues.size).toBeGreaterThan(1)
  })

  it('une colonne vide ne se déroule pas : on ne juge pas une bataille sans combattants', () => {
    expect(deroulerRaid(carte(), {}, PANS_DEUX, 12)).toBeNull()
    expect(resoudreRaid(carte(), {}, PANS_DEUX, 12)).toBeNull()
  })

  it('l’attaquant sait QUELS hommes ne rentrent pas, type par type', () => {
    /*
     * `pertes` ne voyage pas dans le rapport et n'entre pas dans la comparaison - le
     * défenseur n'en a rien à faire. Mais le store en a besoin pour rendre à `s.army`
     * exactement ceux qui rentrent : rendre au prorata aurait fait revenir des chars
     * morts et laissé des lanciers vivants sur le champ.
     */
    const c = carte()
    const colonne: Partial<Record<UnitId, number>> = { hoplite: 6, lancier: 6, archer: 4, belier: 2 }
    const g = graineRaid(empreinteCarte(c), colonne, PANS_DEUX)
    const out = resoudreRaid(c, colonne, PANS_DEUX, g)!
    expect(Object.values(out.pertes).reduce((a, n) => a + (n ?? 0), 0)).toBe(out.issue.morts)
    for (const u of Object.keys(out.pertes) as UnitId[]) {
      expect(out.pertes[u]).toBeLessThanOrEqual(colonne[u] ?? 0)
    }
    // et l'issue rendue est exactement celle que le vérificateur recalcule
    expect(deroulerRaid(c, colonne, PANS_DEUX, g)).toEqual(out.issue)
  })

  it('le rapport qu’on renvoie porte toujours une graine qui découle de son assaut', () => {
    const c = carte()
    const colonne: Partial<Record<UnitId, number>> = { hoplite: 5, lancier: 5 }
    const out = resoudreRaid(c, colonne, ['nord', 'porte'], graineRaid(empreinteCarte(c), colonne, PANS_DEUX))!
    const r = rapportDuRaid('Sparte', c, colonne, ['nord', 'porte'], out.issue, null)
    // les pans sont remis dans l'ordre canonique, la graine est recalculée
    expect(r.pans).toEqual(PANS_DEUX)
    expect(r.graine).toBe(graineRaid(empreinteCarte(c), colonne, PANS_DEUX))
    expect(refusRapport(aPublie(c), r, out.issue)).toBeNull()
  })

  it('le déroulé rend la source du hasard : le reste du jeu ne reste pas sur une graine figée', () => {
    /*
     * ⚠️ LE DÉFAUT QUE CE CAS GARDE et qui aurait été invisible : `deroulerRaid`
     * pose un alea déterministe le temps de la bataille. Sans le `finally`, une
     * exception à mi-déroulé - ou même un simple retour - laissait le jeu ENTIER sur
     * cette graine, et les vagues achéennes se répétaient à l'identique pour
     * toujours.
     */
    deroulerRaid(carte(), COLONNE, PANS_DEUX, 999)
    expect(refusRaid(snapDuel(), carte({}, 3), COLONNE, PANS_DEUX)).not.toBe('defi')
  })

  it('l’issue rejouée par le défenseur est celle que l’attaquant a annoncée', () => {
    // le tour complet, dans l'ordre du courrier : j'émets, il frappe, je rejoue
    const c = carte()
    const etat = duelApresEmission(DUEL_VIDE, c)
    const g = graineRaid(empreinteCarte(c), COLONNE, PANS_DEUX)
    const chezLui = deroulerRaid(c, COLONNE, PANS_DEUX, g)!
    const rapport: RapportRaid = {
      cite: 'Mycènes des Atrides',
      cible: c,
      colonne: COLONNE,
      pans: PANS_DEUX,
      graine: g,
      issue: chezLui,
      riposte: carte({ cite: 'Mycènes des Atrides' }, 7),
    }
    const chezMoi = deroulerRaid(rapport.cible, rapport.colonne, rapport.pans, rapport.graine)
    expect(refusRapport(snapDuel({ duel: etat }), rapport, chezMoi)).toBeNull()
  })

  it('mais un rapport dont la colonne a été gonflée après coup ne se rejoue pas pareil', () => {
    const c = carte()
    const etat = duelApresEmission(DUEL_VIDE, c)
    const g = graineRaid(empreinteCarte(c), COLONNE, PANS_DEUX)
    const honnete = deroulerRaid(c, COLONNE, PANS_DEUX, g)!
    // il annonce l'issue d'un assaut à vingt hommes en n'en déclarant que quatre :
    // la graine ne colle plus, et le refus tombe avant même de rejouer
    const menteur: RapportRaid = {
      cite: 'Sparte',
      cible: c,
      colonne: { hoplite: 4 },
      pans: PANS_DEUX,
      graine: g,
      issue: honnete,
      riposte: null,
    }
    expect(refusRapport(snapDuel({ duel: etat }), menteur, honnete)).toBe('graine')
  })
})

// ── 11. Ce que le panneau doit pouvoir dire ──────────────────────────────────

describe('rien ne se refuse ni ne se propose sans être dit au joueur', () => {
  it('une carte se résume en une ligne lisible', () => {
    const r = resumeCarte(carte())
    expect(r).toContain('Ilion des Priamides')
    expect(r).toContain('11 hommes')
  })

  it('la puissance d’une carte se lit sur l’échelle des places de la table', () => {
    const faible = puissanceCarte(carte({ mur: 0, murHp: 0, tours: 0, garnison: { lancier: 2 }, heros: [] }))
    const forte = puissanceCarte(carte({ mur: 4, murHp: 2200, tours: 4, garnison: { hoplite: 20, archer: 10 } }))
    expect(faible).toBeLessThan(60)
    expect(forte).toBeGreaterThan(200)
  })

  it('un butin se dit en emojis, et « rien à prendre » quand il n’y a rien', () => {
    expect(resumeButin({ grain: 120, bronze: 90 })).toBe('120 🌾, 90 🪙')
    expect(resumeButin({})).toBe('rien à prendre')
  })
})
