import { describe, expect, it } from 'vitest'
import { CONSO_SOLDAT, DAY_MS, UNIT_IDS, troupes } from './data'
import {
  CHANCE_SORTIE_MAX,
  GARNISON_PLANCHER,
  JOURS_DE_VIVRES_EXIGES,
  MIN_HOMMES,
  PART_MAX_DEHORS,
  RANCON_MIN,
  RATION_PAR_JOUR,
  SAPE_MUR_PCT,
  SEUIL_OFFRE,
  SEUIL_SORTIE,
  TENUE_MAX,
  TRAVAUX,
  VOLONTE_MAX,
  accepterReddition,
  assainirBlocus,
  chanceSortie,
  colonneDAssaut,
  coutTravail,
  hommesDeLaLigne,
  forceDeLaLigne,
  garnisonDesarmee,
  journeesJusquaOffre,
  journeesTenables,
  leverBlocus,
  motifRefusBlocus,
  nouvelleDuVillage,
  ouvrirBlocus,
  partEngagee,
  partMurApresBlocus,
  partRancon,
  puissanceSortie,
  rancon,
  rapportDeForce,
  rationDuJour,
  refusBlocus,
  resoudreJournee,
  retirerDeLaLigne,
  usureParJour,
  vueBlocus,
  type EtatBlocus,
  type SnapOuverture,
} from './blocus'
import {
  BUTIN_REPETE,
  MAX_TROUPES,
  VILLAGES_PAR_ID,
  garnisonEffective,
  puissanceEffective,
} from './expeditions'
import type { UnitId } from './types'

/*
 * ═══════════════════ LE BLOCUS, ET CE QU'IL PROMET ═══════════════════
 *
 * Un système qui dure met en jeu trois choses que ce dépôt a déjà payées cher :
 *
 *  · LE TEMPS. Le blocus se compte en JOURNÉES DE JEU et ne porte aucune échéance
 *    en millisecondes : rien à reculer dans le bloc de vitesse du tick, rien qui
 *    survive intact à huit heures d'absence. Ces tests l'exigent en regardant la
 *    FORME de l'état, pas seulement son comportement.
 *  · LA DÉCISION. Rien ne doit se trancher pendant que le joueur déjeune : la
 *    place ne tombe jamais toute seule, et l'offre de reddition attend sans se
 *    périmer. C'est le corollaire tiré des successions.
 *  · LE COÛT D'OPPORTUNITÉ. Les hommes postés manquent aux remparts, et cela doit
 *    se lire en un chiffre.
 *
 * Le fort achéen (puissance 150) sert de banc d'essai : c'est la place du milieu
 * de la table, celle qu'un règne rencontre au moment où il a neuf soldats.
 */

const FORT = VILLAGES_PAR_ID['fort-acheen']
const FORTERESSE = VILLAGES_PAR_ID['forteresse-mysienne']
const CAMP = VILLAGES_PAR_ID['camp-pillards']

/** une ligne au rapport de force voisin de 1 devant le fort achéen */
function ligneMoyenne(): Partial<Record<UnitId, number>> {
  return { hoplite: 4, lancier: 4 }
}

function blocusOuvert(postes = ligneMoyenne(), jour = 12): EtatBlocus {
  return ouvrirBlocus(FORT.id, postes, jour)
}

/** le nécessaire pour juger une ouverture, tout au vert */
function snapOuverture(over: Partial<SnapOuverture> = {}): SnapOuverture {
  return {
    place: FORT,
    army: troupes({ hoplite: 6, lancier: 8, archer: 3 }),
    postes: ligneMoyenne(),
    grain: 5000,
    blocus: null,
    enBataille: false,
    colonneDehors: false,
    merFermee: false,
    allie: false,
    assiege: false,
    ...over,
  }
}

/** joue le blocus journée après journée, sans jamais tirer de sortie */
function jouer(
  depart: EtatBlocus,
  jours: number,
  grain = 100_000,
  tirage = 1,
): { etat: EtatBlocus | null; grain: number; jours: number; offreAuJour: number | null } {
  let e: EtatBlocus | null = depart
  let reste = grain
  let offreAuJour: number | null = null
  let n = 0
  for (; n < jours && e; n++) {
    const j = resoudreJournee(
      e,
      { forceLigne: forceDeLaLigne(e.postes), puissancePlace: puissanceEffective(FORT, 0), grain: reste, nomPlace: FORT.nom },
      tirage,
    )
    reste -= j.grainPaye
    if (j.offreNouvelle) offreAuJour = j.etat?.jours ?? n + 1
    e = j.etat
  }
  return { etat: e, grain: reste, jours: n, offreAuJour }
}

// ─────────────────────────────────────────────────────────────────────────────
describe('un blocus se compte en journées, et n’a rien à décaler', () => {
  it('aucun champ du blocus n’est une échéance en millisecondes', () => {
    /*
     * C'est le piège 2 du moteur, pris à la racine. Toute échéance en
     * millisecondes DOIT être reculée à la main dans le bloc de vitesse du tick,
     * sinon elle tourne à ×1 dans un jeu à ×8 - et le blocus dure quarante minutes,
     * c'est-à-dire précisément le genre de chose qu'on joue en accéléré.
     */
    const e = blocusOuvert()
    for (const cle of Object.keys(e)) {
      expect(cle).not.toMatch(/At$|Jusqua$|Ms$/)
    }
    expect(typeof e.jours).toBe('number')
  })

  it('la journée tenue est un COMPTEUR, pas une soustraction de dates', () => {
    /*
     * Le vrai défaut évité, et il ne se voit qu'à l'échelle du hors-ligne :
     * `OFFLINE_CAP_MS` (8 h) sur des journées de `DAY_MS` (8 min) fait bondir
     * `jourDe(s)` de soixante, tandis que le crochet quotidien ne résout JAMAIS
     * plus d'une journée. « Blocus, jour 61 » sur une ligne qui a mangé une seule
     * ration : c'est ce que `jour - depuis` aurait affiché.
     */
    expect((8 * 3_600_000) / DAY_MS).toBe(60)
    const e = blocusOuvert(ligneMoyenne(), 12)
    const apres = jouer(e, 1).etat
    expect(apres?.jours).toBe(1)
    // `depuis` n'a pas bougé : il ne sert qu'à la chronique
    expect(apres?.depuis).toBe(12)
  })

  it('une seule journée se résout par appel, quelle que soit l’absence', () => {
    const e = blocusOuvert()
    const j = resoudreJournee(
      e,
      { forceLigne: forceDeLaLigne(e.postes), puissancePlace: 150, grain: 9999, nomPlace: FORT.nom },
      1,
    )
    expect(j.etat?.jours).toBe(1)
  })
})

describe('la ration se paie chaque journée, et c’est le vrai prix', () => {
  it('un homme posté coûte plus du double d’un soldat resté au village', () => {
    // au village : CONSO_SOLDAT par minute, donc DAY_MS/60_000 minutes par journée
    const auVillage = CONSO_SOLDAT * (DAY_MS / 60_000)
    expect(auVillage).toBe(4)
    expect(RATION_PAR_JOUR).toBeGreaterThan(auVillage * 2)
  })

  it('cinq journées de blocus à huit hommes coûtent le prix d’un présent diplomatique', () => {
    const r = jouer(blocusOuvert(), 5, 100_000)
    // 8 hommes × 9 mesures × 5 journées
    expect(100_000 - r.grain).toBe(8 * RATION_PAR_JOUR * 5)
  })

  it('la journée où le convoi n’arrive pas, la ligne se défait plus vite qu’à la lance', () => {
    const e = blocusOuvert()
    const j = resoudreJournee(
      e,
      { forceLigne: forceDeLaLigne(e.postes), puissancePlace: 150, grain: 10, nomPlace: FORT.nom },
      1,
    )
    expect(j.grainPaye).toBe(10)
    // on ne prend jamais plus que ce qu'il y a dans les greniers
    expect(j.etat!.tenue).toBeLessThan(TENUE_MAX - 20)
    // et des hommes s'en vont : ils ne rentrent pas dans l'armée, ils désertent
    expect(Object.values(j.perdus).reduce((a, n) => a + (n ?? 0), 0)).toBeGreaterThan(0)
    expect(j.lignes.join(' ')).toContain('convoi')
  })
})

describe('poster des hommes et attendre ne suffit jamais', () => {
  it('la seule patience demande plus de journées que la ligne n’en tient', () => {
    // usure de base seule : (100 − 25) / 5 = 15 journées, contre 100 / 8 = 12 tenues
    const nu = { ...blocusOuvert({ lancier: 6 }), volonte: VOLONTE_MAX }
    expect(journeesJusquaOffre(nu, 0, 150)).toBeGreaterThan(journeesTenables(nu))
  })

  it('une ligne qui pèse ce que pèse la place amène la reddition en une saison', () => {
    /*
     * L'ordre de grandeur voulu : un raid est l'affaire de trois minutes, un blocus
     * l'affaire d'une SAISON (quatre journées de jeu, une trentaine de minutes).
     */
    const e = blocusOuvert()
    expect(rapportDeForce(forceDeLaLigne(e.postes), puissanceEffective(FORT, 0))).toBeGreaterThan(1)
    const r = jouer(e, 12)
    expect(r.offreAuJour).not.toBeNull()
    expect(r.offreAuJour!).toBeGreaterThanOrEqual(4)
    expect(r.offreAuJour!).toBeLessThanOrEqual(6)
  })

  it('les travaux abrègent le siège de moitié - c’est ce qu’on achète', () => {
    const nu = blocusOuvert()
    const outille: EtatBlocus = { ...nu, travaux: ['eau', 'recoltes'] }
    const force = forceDeLaLigne(nu.postes)
    expect(usureParJour(outille, force, 150)).toBeGreaterThan(usureParJour(nu, force, 150) * 1.5)
    expect(journeesJusquaOffre(outille, force, 150)).toBeLessThan(journeesJusquaOffre(nu, force, 150))
  })

  it('vingt hommes devant un camp de pillards ne rasent pas la place en une journée', () => {
    /*
     * Sans le plafond du rapport de force, une colonne écrasante réduisait le
     * blocus à un pillage plus lent : le système cessait d'être une durée.
     */
    const gros = ouvrirBlocus(CAMP.id, { hoplite: 12, lancier: 8 }, 1)
    const rapport = forceDeLaLigne(gros.postes) / puissanceEffective(CAMP, 0)
    expect(rapport).toBeGreaterThan(10)
    expect(rapportDeForce(forceDeLaLigne(gros.postes), puissanceEffective(CAMP, 0))).toBeLessThanOrEqual(1.5)
    expect(journeesJusquaOffre(gros, forceDeLaLigne(gros.postes), puissanceEffective(CAMP, 0))).toBeGreaterThanOrEqual(4)
  })
})

describe('le panneau dit AVANT qu’un blocus est perdu d’avance', () => {
  it('une ligne qui ne survivrait pas à leur sortie est signalée, même si les comptes tombent juste', () => {
    /*
     * LE DÉFAUT QUE CE TEST GARDE. La première version ne comparait que les deux
     * comptes à rebours, et six frondeurs devant la forteresse mysienne les
     * passaient de justesse (douze journées d'usure contre treize de tenue) : le
     * panneau affichait du vert sur une déroute certaine, puisque la sortie de cette
     * place pèse 310 contre leurs 47.
     */
    const mince = ouvrirBlocus(FORTERESSE.id, { frondeur: 6 }, 3)
    const vue = vueBlocus(mince, FORTERESSE, 0)
    expect(vue.cedeAvantEux).toBe(false)
    expect(vue.sortieFatale).toBe(true)
    expect(vue.perdu).toBe(true)
  })

  it('une ligne qui cédera avant qu’ils ne parlementent est signalée aussi', () => {
    const lente = { ...ouvrirBlocus(FORT.id, { hoplite: 6 }, 3), tenue: 16 }
    const vue = vueBlocus(lente, FORT, 0)
    expect(vue.tenables).toBe(2)
    expect(vue.cedeAvantEux).toBe(true)
    expect(vue.perdu).toBe(true)
  })

  it('la ligne qui a DÉJÀ rejeté leur sortie n’est plus prévenue d’un danger éteint', () => {
    /*
     * `chanceSortie` rend zéro dès que `sortieFaite` est vrai : la garnison n'a pas
     * deux percées en réserve. Le panneau, lui, criait encore « leur garnison
     * sortira » jusqu'au bout du siège - c'est-à-dire au joueur qui venait de tuer
     * le loup. Un bandeau d'alerte qui se trompe une fois n'est plus lu ensuite.
     */
    const mince = ouvrirBlocus(FORTERESSE.id, { frondeur: 6 }, 3)
    expect(vueBlocus(mince, FORTERESSE, 0).sortieFatale).toBe(true)
    expect(chanceSortie({ ...mince, volonte: 10, sortieFaite: true })).toBe(0)
    expect(vueBlocus({ ...mince, sortieFaite: true }, FORTERESSE, 0).sortieFatale).toBe(false)
  })

  it('une ligne suffisante ne l’est pas, et la vue donne les deux comptes', () => {
    const vue = vueBlocus(blocusOuvert(), FORT, 0)
    expect(vue.perdu).toBe(false)
    expect(vue.jusquaOffre).toBeLessThan(vue.tenables)
    expect(vue.rationDuJour).toBe(8 * RATION_PAR_JOUR)
    expect(vue.hommes).toBe(8)
  })

  it('une place déjà pillée deux fois est plus dure à fermer - la vue le sait', () => {
    const e = blocusOuvert()
    expect(vueBlocus(e, FORT, 2).jusquaOffre).toBeGreaterThan(vueBlocus(e, FORT, 0).jusquaOffre)
  })
})

describe('les hommes postés ne défendent pas le village', () => {
  it('la part engagée se dit en hommes ET en force', () => {
    const army = troupes({ lancier: 6, frondeur: 4 })
    const p = partEngagee({ hoplite: 4, lancier: 2 }, army)
    expect(p.dehors).toBe(6)
    expect(p.dedans).toBe(10)
    expect(p.part).toBeCloseTo(6 / 16, 4)
    /*
     * Et voici pourquoi le nombre ne suffit pas : quatre hoplites et deux lanciers,
     * c'est 38 % des hommes mais bien plus de la moitié de la force. Un panneau qui
     * n'annoncerait que le nombre mentirait sur ce qui reste aux remparts.
     */
    expect(p.partForce).toBeGreaterThan(0.5)
  })

  it('on ne poste jamais plus de sept dixièmes de l’armée', () => {
    const s = snapOuverture({
      army: troupes({ hoplite: 6, lancier: 4 }),
      postes: { hoplite: 6, lancier: 2 },
    })
    expect(refusBlocus(s)).toBe('garde')
    expect(motifRefusBlocus('garde', s)).toContain('remparts')
  })

  it('un village pillé pendant le blocus défait la ligne, il ne l’use pas', () => {
    const e = { ...blocusOuvert(), tenue: 40 }
    const mauvaise = nouvelleDuVillage(e, false)
    expect(mauvaise.tenue).toBe(0)
    expect(mauvaise.rompu).toBe(true)
    const bonne = nouvelleDuVillage(e, true)
    expect(bonne.tenue).toBeGreaterThan(40)
    expect(bonne.rompu).toBe(false)
  })
})

describe('l’ouverture se refuse, et chaque refus s’explique', () => {
  it('les refus qu’on ne peut pas corriger d’un clic passent d’abord', () => {
    expect(refusBlocus(snapOuverture({ assiege: true }))).toBe('assiege')
    expect(refusBlocus(snapOuverture({ enBataille: true }))).toBe('bataille')
    expect(refusBlocus(snapOuverture({ colonneDehors: true }))).toBe('colonne')
    expect(refusBlocus(snapOuverture({ blocus: blocusOuvert() }))).toBe('deja')
    expect(refusBlocus(snapOuverture({ allie: true }))).toBe('allie')
  })

  it('une colonne dehors interdit d’ouvrir - sinon la règle des sept dixièmes se contourne', () => {
    /*
     * Les hommes d'une colonne partie ne sont plus dans `s.army` : la part engagée
     * se calculerait sur une armée déjà amputée, et deux gestes de suite auraient
     * vidé les remparts en toute légalité.
     */
    expect(refusBlocus(snapOuverture({ colonneDehors: true }))).toBe('colonne')
    expect(motifRefusBlocus('colonne', snapOuverture())).toContain('remparts')
  })

  it('une place d’outre-mer ne se ferme pas quand la mer est prise', () => {
    const s = snapOuverture({ place: VILLAGES_PAR_ID['citadelle-tenedos'], merFermee: true })
    expect(refusBlocus(s)).toBe('mer')
    // …et la même place se ferme au dégel
    expect(refusBlocus({ ...s, merFermee: false })).toBeNull()
  })

  it('cinq hommes ne ferment pas une place : c’est une embuscade, pas un blocus', () => {
    const s = snapOuverture({ postes: { lancier: MIN_HOMMES - 1 } })
    expect(refusBlocus(s)).toBe('hommes')
    expect(motifRefusBlocus('hommes', s)).toContain(String(MIN_HOMMES))
  })

  it('on n’ouvre pas une ligne qu’on ne peut pas nourrir trois journées', () => {
    const s = snapOuverture({ grain: 8 * RATION_PAR_JOUR * JOURS_DE_VIVRES_EXIGES - 1 })
    expect(refusBlocus(s)).toBe('vivres')
    expect(motifRefusBlocus('vivres', s)).toContain('journées de vivres')
    expect(refusBlocus({ ...s, grain: 8 * RATION_PAR_JOUR * JOURS_DE_VIVRES_EXIGES })).toBeNull()
  })

  it('la règle des sept dixièmes fixe le seuil d’entrée du système à neuf soldats', () => {
    // six hommes postés exigent qu'il en reste assez au village : 6 / 0,7 ≈ 9
    expect(Math.ceil(MIN_HOMMES / PART_MAX_DEHORS)).toBe(9)
    expect(refusBlocus(snapOuverture({ army: troupes({ lancier: 9 }), postes: { lancier: 6 } }))).toBeNull()
    expect(refusBlocus(snapOuverture({ army: troupes({ lancier: 8 }), postes: { lancier: 6 } }))).toBe('garde')
  })
})

describe('la place tente une sortie, et l’issue se prévoit', () => {
  it('personne ne sort tant que la place a de l’eau et du pain', () => {
    expect(chanceSortie({ ...blocusOuvert(), volonte: SEUIL_SORTIE })).toBe(0)
    expect(chanceSortie({ ...blocusOuvert(), volonte: SEUIL_SORTIE - 1 })).toBeGreaterThan(0)
  })

  it('plus la place est aux abois, plus elle risque la percée - jamais plus d’une fois', () => {
    expect(chanceSortie({ ...blocusOuvert(), volonte: 0 })).toBeCloseTo(CHANCE_SORTIE_MAX, 6)
    expect(chanceSortie({ ...blocusOuvert(), volonte: 0, sortieFaite: true })).toBe(0)
  })

  it('une ligne solide rejette la sortie et y gagne : leur garnison y est passée', () => {
    const e: EtatBlocus = { ...blocusOuvert(), volonte: 40 }
    const j = resoudreJournee(
      e,
      { forceLigne: forceDeLaLigne(e.postes), puissancePlace: puissanceEffective(FORT, 0), grain: 9999, nomPlace: FORT.nom },
      0,
    )
    expect(forceDeLaLigne(e.postes)).toBeGreaterThan(puissanceSortie(puissanceEffective(FORT, 0), 40))
    expect(j.fin).toBeNull()
    expect(j.etat!.sortieFaite).toBe(true)
    // la volonté chute bien plus qu'une journée d'usure ordinaire
    expect(j.etat!.volonte).toBeLessThan(40 - usureParJour(e, forceDeLaLigne(e.postes), 150))
    expect(Object.values(j.perdus).reduce((a, n) => a + (n ?? 0), 0)).toBeGreaterThan(0)
  })

  it('une ligne trop mince pour user la place est trop mince pour encaisser sa sortie', () => {
    const mince: EtatBlocus = { ...ouvrirBlocus(FORTERESSE.id, { frondeur: 6 }, 2), volonte: 40 }
    const j = resoudreJournee(
      mince,
      { forceLigne: forceDeLaLigne(mince.postes), puissancePlace: puissanceEffective(FORTERESSE, 0), grain: 9999, nomPlace: FORTERESSE.nom },
      0,
    )
    expect(j.fin).toBe('sortie')
    expect(j.etat).toBeNull()
    // les survivants rentrent au village, les autres restent là-bas
    expect(Object.values(j.rentrent).reduce((a, n) => a + (n ?? 0), 0)).toBeGreaterThan(0)
    expect(Object.values(j.perdus).reduce((a, n) => a + (n ?? 0), 0)).toBeGreaterThanOrEqual(2)
  })

  it('la ligne perd d’abord les hommes qu’elle a en nombre, jamais son os', () => {
    const { postes, retires } = retirerDeLaLigne({ lancier: 9, hoplite: 2 }, 3)
    expect(retires).toEqual({ lancier: 3 })
    expect(postes).toEqual({ lancier: 6, hoplite: 2 })
  })

  it('retirer plus d’hommes qu’il n’y en a vide la ligne sans jamais passer sous zéro', () => {
    const { postes, retires } = retirerDeLaLigne({ lancier: 2 }, 5)
    expect(postes).toEqual({})
    expect(retires).toEqual({ lancier: 2 })
  })
})

describe('la place ne tombe jamais toute seule', () => {
  it('à bout de volonté, elle OFFRE - elle ne se rend pas', () => {
    const r = jouer(blocusOuvert(), 12)
    expect(r.etat).not.toBeNull()
    expect(r.etat!.offre).toBe(true)
    // la volonté plancher à zéro et le blocus continue d'attendre la parole du joueur
    expect(r.etat!.volonte).toBe(0)
  })

  it('un blocus laissé sans ordre finit par se défaire : rien n’est éternel, mais rien ne se décide', () => {
    /*
     * LA RÉPONSE À « QUE DEVIENT UN BLOCUS APRÈS HUIT HEURES D'ABSENCE ». Il avance
     * d'UNE journée, parce que le crochet quotidien n'en rattrape jamais plus. Et
     * une ligne laissée devant une place qui a déjà offert de se rendre tient
     * vingt journées - deux heures et demie de jeu à ×1 - avant de se défaire
     * d'elle-même. Le joueur ne revient donc jamais devant une décision prise en
     * son absence ; il revient devant une note de grain qui monte.
     */
    const r = jouer(blocusOuvert(), 30)
    expect(r.etat).toBeNull()
    expect(r.jours).toBeGreaterThanOrEqual(18)
  })

  it('l’offre ne se périme pas, et la ligne s’use deux fois moins vite en l’attendant', () => {
    /*
     * Sans ce ralentissement, huit heures d'absence auraient fini par rompre une
     * ligne victorieuse - c'est-à-dire par trancher à la place du joueur.
     */
    const e: EtatBlocus = { ...blocusOuvert(), offre: true, volonte: 0, tenue: 80 }
    const j = resoudreJournee(
      e,
      { forceLigne: forceDeLaLigne(e.postes), puissancePlace: 150, grain: 9999, nomPlace: FORT.nom },
      1,
    )
    expect(j.etat!.offre).toBe(true)
    expect(80 - j.etat!.tenue).toBeLessThan(8)
    expect(journeesTenables(e)).toBeGreaterThan(journeesTenables({ ...e, offre: false }))
  })

  it('la reddition n’est offerte qu’une fois, et elle est annoncée le jour où elle tombe', () => {
    const r = jouer(blocusOuvert(), 12)
    expect(r.offreAuJour).not.toBeNull()
    const e = r.etat!
    const encore = resoudreJournee(
      e,
      { forceLigne: forceDeLaLigne(e.postes), puissancePlace: 150, grain: 9999, nomPlace: FORT.nom },
      1,
    )
    expect(encore.offreNouvelle).toBe(false)
  })

  it('la ligne qui n’a plus d’hommes se défait au lieu de tenir une place à trois', () => {
    const e: EtatBlocus = { ...blocusOuvert({ lancier: 6 }), volonte: 30 }
    const j = resoudreJournee(
      e,
      { forceLigne: forceDeLaLigne(e.postes), puissancePlace: 150, grain: 0, nomPlace: FORT.nom },
      1,
    )
    // la famine emporte des hommes, et sous MIN_HOMMES on ne ferme plus rien
    expect(j.fin).not.toBeNull()
    expect(j.etat).toBeNull()
  })
})

describe('une ligne relue d’un fichier ne mange jamais du grain « NaN »', () => {
  it('un `postes` illisible ne devient pas une ration NaN qui vide les greniers', () => {
    /*
     * LE PIÈGE 3 DU MOTEUR, à l'endroit où il coûte le plus cher. Un fichier repris
     * à la main, ou écrit par une version antérieure, peut porter n'importe quoi
     * dans `postes` : `hommesDeLaLigne` rendait alors `NaN`, `NaN <= 0` est FAUX, la
     * ligne survivait, et `grain − NaN` restait `NaN` pour toujours. C'est
     * exactement ce qui est arrivé aux ressources à l'ajout des trois unités.
     */
    const abime = assainirBlocus(
      {
        villageId: FORT.id,
        depuis: 'hier',
        jours: null,
        postes: { hoplite: '4', lancier: 4.6, archer: -3, frondeur: undefined },
        volonte: NaN,
        tenue: 400,
        travaux: ['eau', 'eau', 'catapulte'],
        dernier: 'une phrase, pas une liste',
      },
      7,
    )
    expect(abime).not.toBeNull()
    expect(Number.isFinite(rationDuJour(abime!))).toBe(true)
    // « 4 » n'est pas 4 : un poste illisible vaut zéro homme, jamais un NaN
    expect(abime!.postes).toEqual({ lancier: 5 })
    expect(abime!.volonte).toBe(VOLONTE_MAX)
    expect(abime!.tenue).toBe(TENUE_MAX)
    expect(abime!.jours).toBe(0)
    expect(abime!.depuis).toBe(7)
    // un travail écrit deux fois aurait compté deux fois son usure ; un travail
    // inconnu n'a pas de définition à lire
    expect(abime!.travaux).toEqual(['eau'])
    expect(abime!.dernier).toEqual([])
  })

  it('une ligne devant une place qui n’existe plus est levée, et rien d’autre ne l’est', () => {
    expect(assainirBlocus({ ...blocusOuvert(), villageId: 'ithaque-imaginaire' }, 4)).toBeNull()
    expect(assainirBlocus(null, 4)).toBeNull()
    expect(assainirBlocus('⛓️', 4)).toBeNull()
    // une ligne sans un homme ne ferme rien : on ne la garde pas au budget
    expect(assainirBlocus({ ...blocusOuvert(), postes: {} }, 4)).toBeNull()
    // …mais une ligne JOUÉE se reprend intacte
    const joue: EtatBlocus = { ...blocusOuvert(), jours: 5, volonte: 20, offre: true, travaux: ['eau'] }
    expect(assainirBlocus(joue, 40)).toEqual(joue)
  })

  it('une ligne simplement trop mince est GARDÉE, pour que ses hommes rentrent', () => {
    /*
     * La jeter à la relecture les aurait effacés : ils ne sont plus dans `s.army`
     * (ils en ont été retirés à l'ouverture), et rien ne les y aurait remis. On la
     * garde donc, `resoudreJournee` la défait au premier matin - et RENDRA ses
     * hommes. Perdre trois soldats en rechargeant une page est le genre de défaut
     * qu'un joueur ne pardonne pas, parce qu'il ne peut même pas le raconter.
     */
    const trop = assainirBlocus({ ...blocusOuvert(), postes: { lancier: 3 } }, 4)
    expect(trop).not.toBeNull()
    const j = resoudreJournee(
      trop!,
      { forceLigne: forceDeLaLigne(trop!.postes), puissancePlace: 150, grain: 9999, nomPlace: FORT.nom },
      1,
    )
    expect(j.fin).toBe('tenue')
    expect(j.rentrent).toEqual({ lancier: 3 })
  })
})

describe('la garnison désarme, et l’assaut devient une option', () => {
  it('une place à bout garde un tiers de sa garnison, jamais rien', () => {
    const g = garnisonEffective(FORT, 0)
    const pleine = garnisonDesarmee(g, VOLONTE_MAX)
    const vide = garnisonDesarmee(g, 0)
    expect(pleine).toEqual(g)
    const total = (t: Record<UnitId, number>) => UNIT_IDS.reduce((a, u) => a + t[u], 0)
    expect(total(vide)).toBeLessThan(total(g))
    expect(total(vide)).toBeGreaterThan(0)
    expect(total(vide) / total(g)).toBeGreaterThanOrEqual(GARNISON_PLANCHER * 0.9)
    // un type présent ne s'évapore jamais tout à fait : l'assaut ne doit pas
    // devenir une promenade
    for (const u of UNIT_IDS) if (g[u] > 0) expect(vide[u]).toBeGreaterThan(0)
  })

  it('attendre une journée de plus désarme un peu plus - c’est l’arbitrage', () => {
    const g = garnisonEffective(FORTERESSE, 0)
    const total = (t: Record<UnitId, number>) => UNIT_IDS.reduce((a, u) => a + t[u], 0)
    expect(total(garnisonDesarmee(g, 30))).toBeLessThan(total(garnisonDesarmee(g, 70)))
  })

  it('miner le mur ne sert qu’à l’assaut, et le dit', () => {
    const nu = blocusOuvert()
    expect(partMurApresBlocus(nu)).toBe(1)
    expect(partMurApresBlocus({ ...nu, travaux: ['sape'] })).toBeCloseTo(1 - SAPE_MUR_PCT, 6)
    expect(partMurApresBlocus(null)).toBe(1)
    // et c'est le travail le plus cher pour l'usure la plus faible : il n'a de sens
    // que si l'on doute d'aller au bout
    expect(TRAVAUX.sape.usure).toBeLessThan(TRAVAUX.eau.usure)
    expect(coutTravail('sape', FORT).bronze!).toBeGreaterThan(coutTravail('eau', FORT).bronze!)
  })

  it('une forteresse se mine plus cher qu’un camp', () => {
    expect(coutTravail('sape', FORTERESSE).bois!).toBeGreaterThan(coutTravail('sape', CAMP).bois!)
    // brûler des récoltes ne coûte que des torches : son prix est ailleurs
    expect(coutTravail('recoltes', FORTERESSE)).toEqual({})
  })
})

describe('la reddition paie, et elle paie autrement qu’un sac', () => {
  it('une place qui se rend paie plus qu’une place razziée pour la troisième fois', () => {
    /*
     * C'est la raison d'être du système. Un raid sur une place déjà pillée ne rend
     * que `BUTIN_REPETE` de son butin ; une place qui se rend PAIE, et elle paie le
     * même prix qu'on l'ait pillée dix fois.
     */
    const e = { ...blocusOuvert(), volonte: SEUIL_OFFRE, offre: true }
    expect(partRancon(e)).toBeCloseTo(RANCON_MIN, 6)
    expect(partRancon(e)).toBeGreaterThan(BUTIN_REPETE * 1.5)
  })

  it('rester une journée de plus après l’offre rapporte davantage', () => {
    const tot = { ...blocusOuvert(), volonte: SEUIL_OFFRE, offre: true }
    const tard = { ...tot, volonte: 0 }
    expect(partRancon(tard)).toBeGreaterThan(partRancon(tot))
    expect(partRancon(tard)).toBeCloseTo(1, 6)
    expect(rancon(tard, FORT).bronze!).toBeGreaterThan(rancon(tot, FORT).bronze!)
  })

  it('qui a brûlé les récoltes a brûlé sa rançon', () => {
    const propre = { ...blocusOuvert(), volonte: 0, offre: true }
    const brule: EtatBlocus = { ...propre, travaux: ['recoltes'] }
    expect(partRancon(brule)).toBeLessThan(partRancon(propre))
    expect(accepterReddition(brule, FORT).voisins).toBeLessThan(accepterReddition(propre, FORT).voisins)
  })

  it('c’est la seule façon de s’enrichir sur une place forte sans fâcher Zeus', () => {
    /*
     * Piller coûte Zeus −5 et rapporte Arès +4. La reddition acceptée est l'inverse
     * exact : on a reçu une supplication et on l'a honorée (ce que juge Zeus
     * Xenios), et l'on a gagné sans lance (ce que méprise Arès). Le blocus n'est pas
     * un raid plus lent, c'est l'autre bout de la table.
     */
    const r = accepterReddition({ ...blocusOuvert(), volonte: 0, offre: true }, FORT)
    expect(r.zeus).toBeGreaterThan(0)
    expect(r.ares).toBeLessThan(0)
    expect(r.relation).toBeLessThan(0)
    // …mais moins cher, auprès de la place, qu'un sac en règle (−45)
    expect(r.relation).toBeGreaterThan(-45)
    expect(r.lignes.join(' ')).toContain('Rançon')
  })

  it('une ligne plus grosse qu’une colonne n’envoie à l’assaut que ce qui peut partir', () => {
    /*
     * LE DÉFAUT QUE CE TEST GARDE, et c'est le plus cher du système : `MAX_TROUPES`
     * (20) borne toute expédition, et `lancerExpedition` refuse EN SILENCE au-delà.
     * Une ligne de vingt-huit hommes qui donnait l'assaut ne partait donc pas, ne
     * disait rien, et se défaisait au matin suivant : cinq journées de grain, la
     * place perdue, et pas une bataille. Le surplus reste au village, et l'on renvoie
     * les plus nombreux plutôt que les hoplites payés en bronze.
     */
    const grosse = { lancier: 16, hoplite: 8, archer: 4 }
    const { colonne, restent, trop } = colonneDAssaut(grosse)
    expect(hommesDeLaLigne(grosse)).toBe(28)
    expect(hommesDeLaLigne(colonne)).toBe(MAX_TROUPES)
    expect(trop).toBe(8)
    expect(hommesDeLaLigne(restent)).toBe(8)
    // l'os de la ligne part : les huit renvoyés sont des lanciers
    expect(restent).toEqual({ lancier: 8 })
    expect(colonne.hoplite).toBe(8)
    // une ligne ordinaire part tout entière, sans rien laisser derrière
    const { colonne: c2, restent: r2, trop: t2 } = colonneDAssaut(ligneMoyenne())
    expect(c2).toEqual(ligneMoyenne())
    expect(r2).toEqual({})
    expect(t2).toBe(0)
  })

  it('lever le siège ne rend rien, et le village le voit passer', () => {
    const l = leverBlocus({ ...blocusOuvert(), jours: 4 }, FORT)
    expect(l.morale).toBeLessThan(0)
    expect(l.ares).toBeLessThan(0)
    expect(l.lignes.join(' ')).toContain('rien dans leurs mains')
  })
})
