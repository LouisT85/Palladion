import { describe, expect, it } from 'vitest'
import {
  BATIMENTS_CODE,
  EFFECTIF_MAX,
  HEROS_CODE,
  LIGNES_CODE,
  MAX_CODE,
  PANS_CODE,
  PREFIXE_CARTE,
  PREFIXE_RAPPORT,
  RES_CODE,
  TIRS_CODE,
  UNITES_CODE,
  VERSION_CARTE,
  VERSION_RAPPORT,
  ecrireCarte,
  ecrireRapport,
  empreinte,
  lireCarte,
  lireRapport,
  motifRefusCode,
  type RefusCode,
} from './cartes'
import { EFFETS_LIGNE, EFFETS_TIR } from './combat'
import { BUILDING_IDS, RES, TOURS_MAX, UNIT_IDS, WALL_HP } from './data'
import { creerAlea } from './defi'
import {
  ATK_MAX,
  DUEL_VIDE,
  GARNISON_MAX_PAR_UNITE,
  PLAFOND_BUTIN_PAR_RES,
  REDUC_MIN,
  carteValide,
  duelApresEmission,
  empreinteCarte,
  graineRaid,
  hommesDe,
  pansValides,
  rapportDuRaid,
  rapportValide,
  refusRapport,
  type CarteDefense,
  type IssueRaid,
  type PanId,
  type RapportRaid,
  type SnapDuel,
} from './duel'
import { MAX_TROUPES } from './expeditions'
import { HERO_IDS, NIVEAU_MAX } from './heros'
import { PANS } from './plandefense'
import type { HeroId, UnitId } from './types'

/*
 * ═════════════ LE COURRIER : CE QU'ON PROMET À DEUX INCONNUS ═════════════
 *
 * Ces deux codes sont la SEULE chose que deux joueurs de PALLADION échangeront
 * jamais - il n'y a pas de serveur pour rattraper une erreur de format. Quatre
 * promesses seulement, mais aucune ne souffre d'exception :
 *
 *  ① ÇA SE COLLE DANS UN MESSAGE. Sous 900 caractères pour une cité de niveau 4
 *    complète, mesuré et affiché à chaque exécution (§1). Un code qu'on doit
 *    couper en deux est un code qu'on ne renverra pas.
 *
 *  ② ÇA REVIENT À L'IDENTIQUE, jusqu'aux valeurs limites, ET L'EMPREINTE SURVIT.
 *    C'est la promesse qui porte tout le reste : `empreinteCarte` (duel.ts) est la
 *    serrure du système, et elle se calcule sur QUINZE champs dont `atk`, `butin`,
 *    `jour` et `serie`. Un seul champ perdu ou arrondi en chemin, et le défenseur
 *    ne reconnaît plus sa propre carte : tous les rapports honnêtes tombent sur
 *    `'inconnue'`. §2 vérifie donc l'aller-retour champ par champ ET l'égalité des
 *    empreintes sur chaque cas.
 *
 *  ③ LE RAPPORT RAMÈNE DE QUOI REJOUER LE COMBAT. La cible entière, la colonne,
 *    LES PANS et la graine (§2 bis). Sans les pans, `deroulerRaid` ne monte pas les
 *    mêmes fronts et `graineRaid` ne retombe pas sur la même graine : l'anti-triche
 *    entier s'écroule, et il s'écroule du mauvais côté - en refusant les honnêtes.
 *    §6 le prouve en faisant juger un rapport relu par `refusRapport` lui-même.
 *
 *  ④ ÇA NE TOMBE JAMAIS ET ÇA NE MENT JAMAIS. Le texte vient d'un ADVERSAIRE, et
 *    il a intérêt à mentir : chaque bêtise et chaque malveillance se refuse AVEC
 *    SON MOTIF (§3), tout ce qui passe est reborné par les règles du jeu et non par
 *    le format (§4), et mille codes bruités à graine fixe ne lèvent pas une seule
 *    exception (§5).
 *
 * ── CE QUE CES TESTS NE PEUVENT PAS PROUVER ─────────────────────────────────
 *
 * Qu'un rapport dit VRAI. La somme de contrôle attrape la lettre changée à la
 * recopie, jamais le mensonge : quatre octets se refabriquent. L'honnêteté du duel
 * se prouve ailleurs - le défenseur rejoue le combat depuis la graine, et c'est
 * `duel.test.ts` qui en répond. Ici on garantit seulement que la carte, la graine,
 * la colonne, les pans et l'issue prétendue arrivent exacts au bit près.
 */

// ── De quoi fabriquer des cartes ─────────────────────────────────────────────

/** quarante caractères pile - la borne de `carteValide`, accents et apostrophes comprises */
const CITE_LONGUE = 'Ilion’ÉÀÎÔ'.repeat(4)

/**
 * Une cité de niveau 4 COMPLÈTE : le pire cas de taille, et le mètre du §1. Tout y
 * est au maximum que `carteValide` tolère - c'est le seul plafond qui compte, car
 * une carte qu'il accepte doit voyager entière.
 */
function citeMaximale(): CarteDefense {
  const pansUnites: Partial<Record<UnitId, PanId>> = {}
  for (const u of UNIT_IDS) pansUnites[u] = PANS_CODE[PANS_CODE.length - 1]
  const pansHeros: Partial<Record<HeroId, PanId>> = {}
  for (const h of HERO_IDS) pansHeros[h] = PANS_CODE[0]
  return carteValide({
    cite: CITE_LONGUE,
    mur: WALL_HP.length - 1,
    murHp: WALL_HP[WALL_HP.length - 1] * 2,
    tours: Math.max(...TOURS_MAX),
    redoute: 4,
    garnison: Object.fromEntries(UNIT_IDS.map((u) => [u, GARNISON_MAX_PAR_UNITE])),
    interieur: { acropole: 4, bastion: true, galeries: true, poterne: true, citerne: true },
    plan: { ligne: 'charge', tir: 'cloche', pans: pansUnites, heros: pansHeros },
    heros: HERO_IDS.map((id) => ({ id, niveau: NIVEAU_MAX })),
    atk: ATK_MAX,
    reduc: REDUC_MIN,
    niveaux: Object.fromEntries(BUILDING_IDS.map((b) => [b, 4])),
    butin: Object.fromEntries(RES_CODE.map((r) => [r, PLAFOND_BUTIN_PAR_RES])),
    jour: 9_999_999,
    serie: 9_999_999,
  })
}

/** une cité plausible de milieu de partie - le cas ordinaire, celui qu'on mesure */
function citeOrdinaire(): CarteDefense {
  return carteValide({
    cite: 'Thymbra des Anténorides',
    mur: 3,
    murHp: 750,
    tours: 2,
    redoute: 1,
    garnison: { lancier: 6, archer: 4, hoplite: 5, frondeur: 2, char: 1 },
    interieur: { acropole: 1, bastion: true, galeries: false, poterne: true, citerne: false },
    plan: { ligne: 'mur', tir: 'tendu', pans: { hoplite: 'nord', archer: 'porte' }, heros: { hector: 'nord' } },
    heros: [
      { id: 'hector', niveau: 4 },
      { id: 'cassandre', niveau: 2 },
    ],
    // un cumul de passifs RÉEL - deux héros à +15 %, deux sources d'amortissement -
    // et il ne tombe PAS sur une grille décimale : 1,2999999999999998 et
    // 0,6499999999999999. C'est précisément ce que le format doit rendre au bit
    // près, parce que l'empreinte se calcule dessus (voir §2)
    atk: 1 + 0.15 + 0.15,
    reduc: 1 - 0.15 - 0.2,
    niveaux: {
      agora: 2,
      remparts: 3,
      maisons: 3,
      ferme: 3,
      scierie: 2,
      carriere: 2,
      forge: 2,
      caserne: 3,
      temple: 2,
      port: 1,
      redoute: 1,
    },
    butin: { bois: 120, pierre: 90, grain: 300, bronze: 45 },
    jour: 12,
    serie: 1,
  })
}

/** le règne le plus nu qui puisse émettre une carte : rien de bâti, personne, rien en jeu */
function citeNue(): CarteDefense {
  return carteValide({ cite: 'Hameau' })
}

/** la colonne la plus large que `colonneValide` laisse passer : vingt hommes, les sept types */
const COLONNE_PLEINE: Partial<Record<UnitId, number>> = {
  lancier: 3,
  archer: 3,
  hoplite: 3,
  frondeur: 3,
  peltaste: 3,
  belier: 3,
  char: 2,
}

const COLONNE: Partial<Record<UnitId, number>> = { hoplite: 6, lancier: 6, archer: 4, belier: 2 }

/** les trois pans à la fois - le pire cas du masque, et l'assaut le plus dispersé */
const TOUS_LES_PANS: PanId[] = PANS.map((p) => p.id)

function rapportDe(cible: CarteDefense, riposte: CarteDefense | null, p: Partial<RapportRaid> = {}): RapportRaid {
  const colonne = p.colonne ?? COLONNE
  const pans = p.pans ?? ['porte', 'nord']
  return rapportValide({
    cite: 'Mycènes des Atrides',
    cible,
    colonne,
    pans,
    graine: graineRaid(empreinteCarte(cible), colonne, pans),
    issue: { victoire: true, etoiles: 2, morts: 7, envoyes: hommesDe(colonne) },
    riposte,
    ...p,
  })
}

/** un règne qui a publié cette carte-là : le seul état où un rapport peut se juger */
function aPublie(c: CarteDefense): SnapDuel {
  return {
    duel: duelApresEmission(DUEL_VIDE, c),
    army: { lancier: 20, archer: 20, hoplite: 20, frondeur: 20, peltaste: 20, belier: 20, char: 20 },
    grain: 900,
    colonneDehors: false,
    enBataille: false,
    assiege: false,
    jour: 12,
  }
}

// ═════════════════════════════ §0 ═════════════════════════════

describe('§0 · le format connaît le jeu qu’il transporte', () => {
  /*
   * Les listes du codec sont écrites À LA MAIN et figées : un index sur le fil est
   * un contrat gravé. Le prix de ce choix, c'est qu'elles peuvent se désynchroniser
   * du jeu en silence - un héros ajouté à `HEROS`, et le nouvel arrivant ne
   * voyagerait jamais sans qu'aucune ligne ne s'en plaigne. Ces tests sont ce prix,
   * payé une fois.
   */
  it('les onze bâtiments du jeu voyagent, et aucun autre', () => {
    expect([...BATIMENTS_CODE].sort()).toEqual([...BUILDING_IDS].sort())
  })

  it('les sept types de troupe du jeu voyagent, et aucun autre', () => {
    expect([...UNITES_CODE].sort()).toEqual([...UNIT_IDS].sort())
  })

  it('les huit héros du jeu voyagent, et aucun autre', () => {
    expect([...HEROS_CODE].sort()).toEqual([...HERO_IDS].sort())
  })

  it('les pans de l’enceinte du jeu voyagent, et aucun autre', () => {
    // deux fois vital : le pan que tient chaque unité, ET le masque des pans
    // assaillis d'un rapport. Un pan que le fil ignore est un front qu'on ne peut
    // pas annoncer, donc un combat que le défenseur ne peut pas rejouer.
    expect([...PANS_CODE].sort()).toEqual(PANS.map((p) => p.id).sort())
  })

  it('les quatre ressources, les trois postures et les deux tirs voyagent', () => {
    expect([...RES_CODE].sort()).toEqual(Object.keys(RES).sort())
    expect([...LIGNES_CODE].sort()).toEqual(Object.keys(EFFETS_LIGNE).sort())
    expect([...TIRS_CODE].sort()).toEqual(Object.keys(EFFETS_TIR).sort())
  })

  /*
   * ── LES LARGEURS DU FIL COUVRENT LES BORNES DES RÈGLES ─────────────────────
   *
   * Le couplage le plus silencieux du module, et le seul test qui le garde. Si
   * `carteValide` accepte un champ que le fil écrête, la carte écrite n'est plus la
   * carte signée : l'empreinte change, et le défenseur refuse pour `'inconnue'` un
   * rapport parfaitement honnête. On interroge donc `carteValide` lui-même - la
   * borne réelle, pas une constante recopiée.
   */
  it('trois bits suffisent aux niveaux que les règles acceptent', () => {
    expect(WALL_HP.length - 1).toBeLessThanOrEqual(7)
    expect(Math.max(...TOURS_MAX)).toBeLessThanOrEqual(7)
    expect(NIVEAU_MAX).toBeLessThanOrEqual(7)
    expect(carteValide({ redoute: 99 }).redoute).toBeLessThanOrEqual(7)
    expect(carteValide({ interieur: { acropole: 99 } }).interieur.acropole).toBeLessThanOrEqual(7)
    for (const b of BUILDING_IDS) {
      expect(carteValide({ niveaux: { [b]: 99 } }).niveaux[b], b).toBeLessThanOrEqual(7)
    }
    // un pan se code par son rang + 1, sur trois bits : sept pans au plus
    expect(PANS_CODE.length).toBeLessThanOrEqual(7)
  })

  it('seize bits suffisent aux effectifs, aux structures et au butin que les règles acceptent', () => {
    expect(GARNISON_MAX_PAR_UNITE).toBeLessThanOrEqual(EFFECTIF_MAX)
    expect(MAX_TROUPES).toBeLessThanOrEqual(EFFECTIF_MAX)
    expect(PLAFOND_BUTIN_PAR_RES).toBeLessThanOrEqual(EFFECTIF_MAX)
    // `carteValide` tolère le DOUBLE de la structure nue d'un mur de niveau 4
    expect(WALL_HP[WALL_HP.length - 1] * 2).toBeLessThanOrEqual(EFFECTIF_MAX)
    expect(carteValide({ garnison: { hoplite: 1e9 } }).garnison.hoplite).toBeLessThanOrEqual(EFFECTIF_MAX)
    expect(carteValide({ butin: { bois: 1e9 } }).butin.bois).toBeLessThanOrEqual(EFFECTIF_MAX)
  })

  it('vingt-quatre bits suffisent à la journée et à la série que les règles acceptent', () => {
    const c = carteValide({ jour: 1e12, serie: 1e12 })
    expect(c.jour).toBeLessThanOrEqual(2 ** 24 - 1)
    expect(c.serie).toBeLessThanOrEqual(2 ** 24 - 1)
  })

  it('trente-trois bits suffisent à la graine, et deux aux étoiles', () => {
    // `graineRaid` rend `empreinte(...) + 1` : 2^32 est atteignable, et
    // `rapportValide` la borne à 2^32 exactement
    const r = rapportValide({ graine: 1e30, issue: { etoiles: 99 } })
    expect(r.graine).toBeLessThanOrEqual(2 ** 33 - 1)
    expect(r.graine).toBeGreaterThanOrEqual(2 ** 32)
    expect(r.issue.etoiles).toBeLessThanOrEqual(3)
  })

  it('un nom de cité tient dans la longueur sur un octet', () => {
    // `carteValide` coupe à quarante caractères ; au pire trois octets chacun,
    // soit cent vingt - la longueur d'un texte est écrite sur huit bits
    const pire = carteValide({ cite: '’'.repeat(200) })
    expect(new TextEncoder().encode(pire.cite).length).toBeLessThanOrEqual(255)
    expect(Array.from(CITE_LONGUE).length).toBe(40)
  })
})

// ═════════════════════════════ §1 ═════════════════════════════

describe('§1 · le code se colle dans un message', () => {
  it('une cité de niveau 4 COMPLÈTE tient sous 900 caractères', () => {
    const code = ecrireCarte(citeMaximale())
    // le chiffre est imprimé : c'est la seule mesure que ce chantier doit rendre
    console.log(`carte d’une cité de niveau 4 complète : ${code.length} caractères`)
    expect(code.length).toBeLessThan(900)
  })

  it('et même avec le pire nom que les règles autorisent', () => {
    // quarante caractères de trois octets chacun : le nom le plus lourd qu'une
    // carte puisse porter, et c'est un nom qu'un joueur peut vraiment écrire
    const code = ecrireCarte(carteValide({ ...citeMaximale(), cite: '’'.repeat(60) }))
    console.log(`carte maximale, nom de quarante caractères à trois octets : ${code.length} caractères`)
    expect(code.length).toBeLessThan(900)
  })

  it('et elle est au moins six fois plus courte que le JSON qu’on aurait écrit d’abord', () => {
    const carte = citeMaximale()
    // le témoin : `JSON` puis base64, ce qui vient à l'esprit avant de compter.
    // La longueur se calcule au lieu de s'encoder - quatre caractères par groupe
    // de trois octets - parce que `Buffer` n'existe pas dans le navigateur et que
    // ce dépôt n'ajoute pas de types Node pour une ligne de témoin.
    const naif = Math.ceil(new TextEncoder().encode(JSON.stringify(carte)).length / 3) * 4
    const code = ecrireCarte(carte).length
    console.log(`témoin JSON+base64 : ${naif} caractères, soit ${(naif / code).toFixed(1)} fois plus`)
    // six et non trois : le rapport mesuré est de 7,7 - les seize octets d'`atk` et
    // de `reduc` sont payés exprès (voir l'en-tête du module) et pèsent moins que ce
    // que le format économise ailleurs. Une promesse posée deux fois plus bas que la
    // mesure n'en est plus une : elle laisserait le format doubler de taille sans
    // qu'un seul test s'en plaigne.
    expect(naif).toBeGreaterThan(code * 6)
  })

  it('un rapport de raid, qui porte DEUX cités entières, tient sous 900', () => {
    const code = ecrireRapport(
      rapportDe(citeMaximale(), citeMaximale(), { colonne: COLONNE_PLEINE, pans: TOUS_LES_PANS }),
    )
    console.log(`rapport de raid le plus lourd (cible + riposte maximales) : ${code.length} caractères`)
    expect(code.length).toBeLessThan(900)
  })

  it('une cité ordinaire tient dans une ligne, et un village nu dans presque rien', () => {
    const ordinaire = ecrireCarte(citeOrdinaire()).length
    const nue = ecrireCarte(citeNue()).length
    console.log(`cité ordinaire : ${ordinaire} caractères · village nu : ${nue} caractères`)
    expect(ordinaire).toBeLessThan(250)
    // un bit de présence devant chaque effectif et chaque part de butin : une cité
    // sans garnison et sans chèque ne coûte rien
    expect(nue).toBeLessThan(ordinaire)
  })

  it('un rapport ordinaire aussi, et il reste très loin de la porte des refus', () => {
    const code = ecrireRapport(rapportDe(citeOrdinaire(), citeOrdinaire()))
    console.log(`rapport ordinaire : ${code.length} caractères`)
    expect(code.length).toBeLessThan(500)
    expect(code.length * 5).toBeLessThan(MAX_CODE)
  })

  it('le code s’annonce par son préfixe et sa version', () => {
    expect(ecrireCarte(citeOrdinaire()).startsWith(`${PREFIXE_CARTE}${VERSION_CARTE}-`)).toBe(true)
    expect(ecrireRapport(rapportDe(citeOrdinaire(), citeNue())).startsWith(`${PREFIXE_RAPPORT}${VERSION_RAPPORT}-`)).toBe(
      true,
    )
  })
})

// ═════════════════════════════ §2 ═════════════════════════════

/** encoder puis décoder rend exactement la carte normalisée - le cœur du module */
function allerRetour(c: CarteDefense): CarteDefense {
  const lu = lireCarte(ecrireCarte(c))
  expect(lu.ok, `refus inattendu : ${lu.ok ? '' : lu.motif}`).toBe(true)
  if (!lu.ok) throw new Error('inatteignable')
  return lu.valeur
}

describe('§2 · l’aller-retour est exact, y compris aux bornes', () => {
  const cas: [string, CarteDefense][] = [
    ['une cité ordinaire', citeOrdinaire()],
    ['une cité de niveau 4 complète', citeMaximale()],
    ['un village nu', citeNue()],
    ['garnison à zéro partout', carteValide({ ...citeOrdinaire(), garnison: {} })],
    [
      'garnison au plafond des règles partout',
      carteValide({
        ...citeOrdinaire(),
        garnison: Object.fromEntries(UNIT_IDS.map((u) => [u, GARNISON_MAX_PAR_UNITE])),
      }),
    ],
    ['aucun héros', carteValide({ ...citeOrdinaire(), heros: [] })],
    [
      'tous les héros au niveau maximum',
      carteValide({ ...citeOrdinaire(), heros: HERO_IDS.map((id) => ({ id, niveau: NIVEAU_MAX })) }),
    ],
    ['tous les héros au niveau 1', carteValide({ ...citeOrdinaire(), heros: HERO_IDS.map((id) => ({ id, niveau: 1 })) })],
    ['un seul héros, le dernier de la liste', carteValide({ ...citeOrdinaire(), heros: [{ id: 'diomede', niveau: 3 }] })],
    ['plan vide', carteValide({ ...citeOrdinaire(), plan: { ligne: 'tenir', tir: 'tendu', pans: {}, heros: {} } })],
    [
      'plan complet, chaque pan tenu par quelqu’un',
      carteValide({
        ...citeOrdinaire(),
        plan: {
          ligne: 'charge',
          tir: 'cloche',
          pans: Object.fromEntries(UNIT_IDS.map((u, i) => [u, PANS_CODE[i % PANS_CODE.length]])),
          heros: Object.fromEntries(HERO_IDS.map((h, i) => [h, PANS_CODE[i % PANS_CODE.length]])),
        },
      }),
    ],
    ['un nom avec accents et apostrophe typographique', carteValide({ ...citeOrdinaire(), cite: 'Ké’phalos-l’Âpre' })],
    ['un nom de quarante caractères', carteValide({ ...citeOrdinaire(), cite: CITE_LONGUE })],
    ['une enceinte intacte', carteValide({ ...citeOrdinaire(), mur: 4, murHp: WALL_HP[4] })],
    ['une enceinte à terre', carteValide({ ...citeOrdinaire(), mur: 4, murHp: 0 })],
    ['une enceinte majorée par six systèmes', carteValide({ ...citeOrdinaire(), mur: 4, murHp: WALL_HP[4] * 2 })],
    ['aucun mur du tout', carteValide({ ...citeOrdinaire(), mur: 0, murHp: 0 })],
    ['aucun ouvrage du dedans', carteValide({ ...citeOrdinaire(), interieur: { acropole: 0 } })],
    ['la redoute au dernier niveau', carteValide({ ...citeOrdinaire(), redoute: 4 })],
    ['aucun bâtiment - le décor est vide', carteValide({ ...citeOrdinaire(), niveaux: {} })],
    ['aucun butin en jeu : la carte ne promet rien', carteValide({ ...citeOrdinaire(), butin: {} })],
    [
      'le butin au plafond sur les quatre ressources',
      carteValide({ ...citeOrdinaire(), butin: Object.fromEntries(RES_CODE.map((r) => [r, PLAFOND_BUTIN_PAR_RES])) }),
    ],
    ['une seule ressource en jeu', carteValide({ ...citeOrdinaire(), butin: { bronze: 1 } })],
    ['les passifs aux deux bornes', carteValide({ ...citeOrdinaire(), atk: ATK_MAX, reduc: REDUC_MIN })],
    ['aucun passif du tout', carteValide({ ...citeOrdinaire(), atk: 1, reduc: 1 })],
    ['la première carte du règne', carteValide({ ...citeOrdinaire(), jour: 0, serie: 0 })],
    ['la dix-millionième journée', carteValide({ ...citeOrdinaire(), jour: 1e7, serie: 1e7 })],
  ]

  for (const [quoi, carte] of cas) {
    it(`revient à l’identique : ${quoi}`, () => {
      expect(allerRetour(carte)).toEqual(carte)
    })
  }

  it('L’EMPREINTE SURVIT À CHAQUE CAS - sans quoi rien du duel ne fonctionne', () => {
    /*
     * LA promesse du module. `empreinteCarte` est la serrure : le défenseur ne garde
     * que ce mot-là de la carte qu'il a publiée, et il refuse pour `'inconnue'` tout
     * rapport dont la cible ne le redonne pas. Un champ perdu sur le fil - `serie`
     * oublié, `atk` arrondi, `butin` écrêté - ne casse RIEN de visible : le code se
     * relit, la cité paraît normale. Il casse tout le duel, en silence, et du
     * mauvais côté : ce sont les rapports HONNÊTES qui tombent.
     */
    for (const [quoi, carte] of cas) {
      expect(empreinteCarte(allerRetour(carte)), quoi).toBe(empreinteCarte(carte))
    }
  })

  it('atk et reduc reviennent au BIT près, pas au dix-millième', () => {
    // un cumul de passifs réel ne tombe pas sur une grille décimale : arrondir ce
    // nombre-là aurait donné une autre carte que celle que le défenseur a signée
    const atk = 1 + 0.15 + 0.15
    const reduc = 1 - 0.15 - 0.2
    expect(atk).not.toBe(1.3)
    expect(reduc).not.toBe(0.65)
    const c = carteValide({ ...citeOrdinaire(), atk, reduc })
    const lu = allerRetour(c)
    expect(lu.atk).toBe(atk)
    expect(lu.reduc).toBe(reduc)
    expect(empreinteCarte(lu)).toBe(empreinteCarte(c))
    // et l'arrondi qu'on a refusé n'aurait PAS été rattrapé par le `toFixed(4)` de
    // l'empreinte dans tous les cas : ici il l'aurait été, mais une carte qui vaut
    // 1,29995 tombe d'un côté ou de l'autre selon le mode d'arrondi, et « une fois
    // sur mille » est encore trop pour une serrure
    expect(atk.toFixed(4)).toBe('1.3000')
  })

  it('chaque couple posture / tir revient tel qu’il est parti', () => {
    for (const ligne of LIGNES_CODE) {
      for (const tir of TIRS_CODE) {
        const c = carteValide({ ...citeOrdinaire(), plan: { ligne, tir, pans: {}, heros: {} } })
        const lu = allerRetour(c)
        expect([lu.plan.ligne, lu.plan.tir]).toEqual([ligne, tir])
      }
    }
  })

  it('chaque pan, pour chaque unité et chaque héros, revient tel qu’il est parti', () => {
    for (const pan of PANS_CODE) {
      const c = carteValide({
        ...citeOrdinaire(),
        plan: {
          ligne: 'tenir',
          tir: 'tendu',
          pans: Object.fromEntries(UNIT_IDS.map((u) => [u, pan])),
          heros: Object.fromEntries(HERO_IDS.map((h) => [h, pan])),
        },
      })
      expect(allerRetour(c).plan, pan).toEqual(c.plan)
    }
  })

  it('chaque bâtiment, seul à son niveau maximum, revient tel qu’il est parti', () => {
    for (const b of BUILDING_IDS) {
      const c = carteValide({ ...citeNue(), niveaux: { [b]: 4 } })
      expect(allerRetour(c).niveaux[b], b).toBe(4)
      expect(allerRetour(c).niveaux, b).toEqual({ [b]: 4 })
    }
  })

  it('chaque héros, seul et à chaque niveau, revient tel qu’il est parti', () => {
    for (const h of HERO_IDS) {
      for (let n = 1; n <= NIVEAU_MAX; n++) {
        const c = carteValide({ ...citeNue(), heros: [{ id: h, niveau: n }] })
        expect(allerRetour(c).heros, `${h}/${n}`).toEqual([{ id: h, niveau: n }])
      }
    }
  })

  it('chaque combinaison des ouvrages du dedans revient à l’identique', () => {
    // les cinq niveaux d'acropole que `carteValide` tolère, croisés avec les seize
    // combinaisons des quatre ouvrages binaires - un bit permuté à la relecture se
    // verrait ici, et nulle part ailleurs
    for (let acropole = 0; acropole <= 4; acropole++) {
      for (let m = 0; m < 16; m++) {
        const interieur = {
          acropole,
          bastion: (m & 1) !== 0,
          galeries: (m & 2) !== 0,
          poterne: (m & 4) !== 0,
          citerne: (m & 8) !== 0,
        }
        const c = carteValide({ ...citeOrdinaire(), interieur })
        expect(allerRetour(c).interieur, `${acropole}/${m}`).toEqual(interieur)
      }
    }
  })

  it('chaque part de butin, ressource par ressource, revient au grain près', () => {
    for (const r of RES_CODE) {
      for (const n of [1, 7, 99, PLAFOND_BUTIN_PAR_RES]) {
        const c = carteValide({ ...citeNue(), butin: { [r]: n } })
        expect(allerRetour(c).butin, `${r}/${n}`).toEqual({ [r]: n })
      }
    }
  })

  it('deux cités qui diffèrent d’un seul homme n’ont pas la même empreinte', () => {
    const a = citeOrdinaire()
    const b = carteValide({ ...a, garnison: { ...a.garnison, lancier: (a.garnison.lancier ?? 0) + 1 } })
    expect(empreinteCarte(a)).not.toBe(empreinteCarte(b))
    expect(ecrireCarte(a)).not.toBe(ecrireCarte(b))
  })

  it('deux cités qui ne diffèrent que par la SÉRIE sont deux chèques distincts', () => {
    /*
     * `serie` est le champ dont l'oubli ne se verrait jamais : deux cartes
     * rigoureusement identiques auraient la même empreinte, donc le même `ref`, et
     * le chèque déjà encaissé de la première annulerait le butin de la seconde sans
     * un mot. Il doit donc voyager, et il doit voyager EXACT.
     */
    const a = carteValide({ ...citeOrdinaire(), serie: 0 })
    const b = carteValide({ ...citeOrdinaire(), serie: 1 })
    expect(empreinteCarte(a)).not.toBe(empreinteCarte(b))
    expect(allerRetour(a).serie).toBe(0)
    expect(allerRetour(b).serie).toBe(1)
    expect(empreinteCarte(allerRetour(b))).toBe(empreinteCarte(b))
  })

  it('réencoder ce qu’on a lu redonne le même code, caractère pour caractère', () => {
    for (const [quoi, carte] of cas) {
      expect(ecrireCarte(allerRetour(carte)), quoi).toBe(ecrireCarte(carte))
    }
  })
})

describe('§2 bis · le rapport revient exact, ses deux cités et ses pans compris', () => {
  const rapports: [string, RapportRaid][] = [
    ['un raid gagné sur deux étoiles', rapportDe(citeOrdinaire(), citeMaximale())],
    [
      'un raid repoussé : la colonne entière est restée sur place',
      rapportDe(citeOrdinaire(), citeOrdinaire(), {
        issue: { victoire: false, etoiles: 0, morts: hommesDe(COLONNE), envoyes: hommesDe(COLONNE) },
      }),
    ],
    ['une colonne d’un seul homme', rapportDe(citeNue(), citeNue(), { colonne: { lancier: 1 } })],
    [
      'vingt hommes des sept types, par les trois pans',
      rapportDe(citeMaximale(), citeMaximale(), { colonne: COLONNE_PLEINE, pans: TOUS_LES_PANS }),
    ],
    ['un seul pan assailli', rapportDe(citeOrdinaire(), citeNue(), { pans: ['sud'] })],
    ['aucune riposte : l’attaquant n’offre rien en retour', rapportDe(citeOrdinaire(), null)],
    ['graine à zéro', rapportValide({ ...rapportDe(citeOrdinaire(), citeNue()), graine: 0 })],
    ['graine au dernier bit de trente-deux', rapportValide({ ...rapportDe(citeOrdinaire(), citeNue()), graine: 0xffffffff })],
    ['graine à deux puissance trente-deux', rapportValide({ ...rapportDe(citeOrdinaire(), citeNue()), graine: 2 ** 32 })],
    ['trois étoiles et aucun mort', rapportDe(citeOrdinaire(), citeNue(), { issue: { victoire: true, etoiles: 3, morts: 0, envoyes: hommesDe(COLONNE) } })],
  ]

  for (const [quoi, r] of rapports) {
    it(`revient à l’identique : ${quoi}`, () => {
      const lu = lireRapport(ecrireRapport(r))
      expect(lu.ok, lu.ok ? '' : lu.motif).toBe(true)
      if (!lu.ok) return
      expect(lu.valeur).toEqual(r)
    })
  }

  it('LES PANS SURVIVENT, dans l’ordre canonique, pour chacun des huit assauts possibles', () => {
    /*
     * Le champ le plus facile à perdre et le plus coûteux à perdre. Sans lui, le
     * défenseur ne monte pas les mêmes fronts (`creerBataille` répartit la colonne
     * front par front) et ne retombe pas sur la même graine : il refuse alors pour
     * `'graine'` un rapport honnête, ce qui est le pire défaut de ce système.
     *
     * Les huit sous-ensembles des trois pans, l'ensemble vide compris : celui-là ne
     * décrit pas un assaut jugeable, et c'est `refusRapport` qui le dit (`'pans'`),
     * pas le codec - mais il doit tout de même revenir vide et non plein.
     */
    for (let m = 0; m < 8; m++) {
      const choisis = PANS_CODE.filter((_, i) => (m & (1 << i)) !== 0)
      const r = rapportDe(citeOrdinaire(), citeNue(), { pans: choisis })
      const lu = lireRapport(ecrireRapport(r))
      expect(lu.ok, `masque ${m}`).toBe(true)
      if (!lu.ok) continue
      expect(lu.valeur.pans, `masque ${m}`).toEqual(pansValides(choisis))
      expect(lu.valeur.pans.length, `masque ${m}`).toBe(choisis.length)
    }
  })

  it('l’ordre des clics n’est pas un dé : deux ordres inverses donnent le même code', () => {
    // `pansValides` remet la liste dans l'ordre canonique de `PANS`, et le fil ne
    // transporte qu'un masque : l'ordre des clics ne peut donc pas se glisser dans
    // la graine par la porte du codec
    const a = rapportDe(citeOrdinaire(), citeNue(), { pans: ['nord', 'porte'] })
    const b = rapportDe(citeOrdinaire(), citeNue(), { pans: ['porte', 'nord'] })
    expect(ecrireRapport(a)).toBe(ecrireRapport(b))
  })

  it('la graine traverse le fil sans perdre son bit de poids fort, ni son trente-troisième', () => {
    // deux défauts classiques du bricolage de bits en JavaScript : le décalage
    // signé, qui rend −1 sur 0xFFFFFFFF ; et `2**32 >>> 0`, qui rend zéro. La
    // graine de `graineRaid` (`empreinte(...) + 1`) atteint les deux valeurs.
    for (const graine of [0xffffffff, 2 ** 32, 2 ** 32 - 1, 1]) {
      const lu = lireRapport(ecrireRapport(rapportValide({ ...rapportDe(citeNue(), citeNue()), graine })))
      expect(lu.ok && lu.valeur.graine, String(graine)).toBe(graine)
    }
  })

  it('la cible arrive entière : son empreinte retombe sur la carte publiée', () => {
    const cible = citeMaximale()
    const lu = lireRapport(ecrireRapport(rapportDe(cible, citeNue())))
    expect(lu.ok && empreinteCarte(lu.valeur.cible)).toBe(empreinteCarte(cible))
    expect(lu.ok && lu.valeur.cible).toEqual(cible)
  })

  it('la riposte arrive entière, et se réémet telle quelle : on peut aller la frapper', () => {
    const riposte = citeMaximale()
    const lu = lireRapport(ecrireRapport(rapportDe(citeNue(), riposte)))
    expect(lu.ok && lu.valeur.riposte).toEqual(riposte)
    if (lu.ok && lu.valeur.riposte) {
      expect(ecrireCarte(lu.valeur.riposte)).toBe(ecrireCarte(riposte))
      // c'est cette empreinte-là qui devient `Revanche.ref` : une riposte amputée
      // serait une vengeance contre un fantôme
      expect(empreinteCarte(lu.valeur.riposte)).toBe(empreinteCarte(riposte))
    }
  })

  it('une riposte absente revient absente, jamais en cité fantôme', () => {
    const lu = lireRapport(ecrireRapport(rapportDe(citeOrdinaire(), null)))
    expect(lu.ok && lu.valeur.riposte).toBeNull()
  })

  it('le nom de l’attaquant voyage : la revanche a un visage', () => {
    const lu = lireRapport(ecrireRapport(rapportDe(citeOrdinaire(), citeNue())))
    expect(lu.ok && lu.valeur.cite).toBe('Mycènes des Atrides')
  })

  it('les hommes engagés ne voyagent PAS : ils se déduisent de la colonne', () => {
    /*
     * `envoyes` est le seul champ de l'issue que le fil n'écrit pas, et c'est
     * délibéré : `rapportValide` le recalcule (`hommesDe`). Le transporter aurait
     * laissé un rapport annoncer vingt hommes avec une colonne de trois - le
     * lecteur l'aurait écrasé en silence, donc le fil aurait porté un champ qui ne
     * veut rien dire. Ici on prouve que le calcul tombe juste des deux côtés.
     */
    const r = rapportDe(citeOrdinaire(), citeNue(), { colonne: COLONNE_PLEINE })
    expect(r.issue.envoyes).toBe(MAX_TROUPES)
    const lu = lireRapport(ecrireRapport(r))
    expect(lu.ok && lu.valeur.issue.envoyes).toBe(hommesDe(r.colonne))
  })

  it('deux rapports qui ne diffèrent que d’un champ donnent deux codes différents', () => {
    /*
     * L'autre moitié de la promesse de l'aller-retour : si deux assauts différents
     * s'écrivaient pareil, le SECOND rapport - un vrai raid, un autre butin - serait
     * pris pour un doublon et jeté sans un mot. Un joueur frappé deux fois n'en
     * verrait qu'une. On compare les codes, parce que c'est ce que le joueur colle.
     */
    const a = rapportDe(citeOrdinaire(), citeNue())
    const variantes: [string, RapportRaid][] = [
      ['une étoile de moins', rapportValide({ ...a, issue: { ...a.issue, etoiles: 1 } })],
      ['la place a tenu', rapportValide({ ...a, issue: { ...a.issue, victoire: false } })],
      ['un mort de plus', rapportValide({ ...a, issue: { ...a.issue, morts: 8 } })],
      ['un lancier de plus dans la colonne', rapportValide({ ...a, colonne: { ...a.colonne, lancier: 7 } })],
      ['un pan de plus', rapportValide({ ...a, pans: TOUS_LES_PANS })],
      ['un pan de moins', rapportValide({ ...a, pans: ['porte'] })],
      ['une autre graine', rapportValide({ ...a, graine: 12345 })],
      ['une autre cible', rapportValide({ ...a, cible: citeNue() })],
      ['une cible dont seule la série change', rapportValide({ ...a, cible: carteValide({ ...a.cible, serie: 9 }) })],
      ['une autre riposte', rapportValide({ ...a, riposte: citeMaximale() })],
      ['aucune riposte', rapportValide({ ...a, riposte: null })],
      ['un autre attaquant', rapportValide({ ...a, cite: 'Sparte des Tyndarides' })],
    ]
    for (const [quoi, b] of variantes) expect(ecrireRapport(a), quoi).not.toBe(ecrireRapport(b))
  })
})

// ═════════════════════════════ §3 ═════════════════════════════

/** le refus d'une lecture, ou `null` si elle a réussi */
function refusDe(texte: unknown): RefusCode | null {
  const lu = lireCarte(texte)
  return lu.ok ? null : lu.refus
}

describe('§3 · chaque bêtise et chaque malveillance a son motif', () => {
  it('rien du tout : « il n’y a rien à lire »', () => {
    for (const vide of ['', '   ', '\n\n', '\t', null, undefined, 42, {}]) {
      expect(refusDe(vide), JSON.stringify(vide)).toBe('vide')
    }
  })

  it('cent mille caractères : refusés sans qu’on les regarde', () => {
    const enorme = `${PREFIXE_CARTE}${VERSION_CARTE}-${'A'.repeat(100_000)}`
    expect(refusDe(enorme)).toBe('enorme')
    expect(enorme.length).toBeGreaterThan(MAX_CODE)
  })

  it('dix millions de caractères sont refusés SANS être parcourus', () => {
    /*
     * « Sans qu'on les regarde » était une intention, pas un fait : la porte
     * « enorme » se fermait APRÈS l'essuyage des blancs, et `replace` scanne tout
     * ce qu'on lui donne. Mesuré avant correction : 1 013 ms sur dix millions de
     * caractères - une seconde d'onglet figé, offerte à qui colle ce texte exprès.
     *
     * La borne est large pour ne pas devenir capricieuse sur une machine chargée, et
     * elle reste vingt fois sous le défaut qu'elle garde. Le refus doit rester
     * « enorme » : le joueur qui a collé toute sa conversation doit lire « ne collez
     * que la ligne qui commence par PALL- ».
     */
    const gros = `${PREFIXE_CARTE}${VERSION_CARTE}-${' A'.repeat(5_000_000)}`
    const depart = Date.now()
    const r = refusDe(gros)
    const duree = Date.now() - depart
    console.log(`dix millions de caractères refusés en ${duree} ms`)
    expect(r).toBe('enorme')
    expect(duree).toBeLessThan(50)
  })

  it('un texte qui n’est pas un code : « ce n’est pas un code de PALLADION »', () => {
    for (const t of ['bonjour', 'PALL', 'PALL-', 'PALLADION', 'PALL-Z1-AAAA', '{"jeu":"palladion"}']) {
      expect(refusDe(t), t).toBe('prefixe')
    }
  })

  it('un rapport collé là où l’on attend une carte : « ce n’est pas celui qu’on attend »', () => {
    const rapport = ecrireRapport(rapportDe(citeNue(), citeNue()))
    const lu = lireCarte(rapport)
    expect(lu.ok).toBe(false)
    if (!lu.ok) {
      expect(lu.refus).toBe('genre')
      // le motif DIT laquelle des deux sortes on a collée, sinon le joueur recolle
      // la même chose trois fois de suite
      expect(lu.motif).toContain('rapport de raid')
    }
  })

  it('une carte collée là où l’on attend un rapport : même refus, motif inverse', () => {
    const lu = lireRapport(ecrireCarte(citeNue()))
    expect(lu.ok).toBe(false)
    if (!lu.ok) {
      expect(lu.refus).toBe('genre')
      expect(lu.motif).toContain('carte d’une cité')
    }
  })

  it('un code d’une version future se refuse proprement, en le disant', () => {
    const code = ecrireCarte(citeOrdinaire())
    const futur = code.replace(`${PREFIXE_CARTE}${VERSION_CARTE}-`, `${PREFIXE_CARTE}${VERSION_CARTE + 1}-`)
    const lu = lireCarte(futur)
    expect(lu.ok).toBe(false)
    if (!lu.ok) {
      expect(lu.refus).toBe('version')
      expect(lu.motif).toContain('à jour')
    }
    // et la version 0, qui n'a jamais existé, se refuse de même
    expect(refusDe(code.replace(`${PREFIXE_CARTE}${VERSION_CARTE}-`, `${PREFIXE_CARTE}0-`))).toBe('version')
  })

  it('un caractère étranger à l’alphabet : « abîmé par le copier-coller »', () => {
    const code = ecrireCarte(citeOrdinaire())
    for (const sale of ['$', '+', '/', '=', '«', '!']) {
      const abime = code.slice(0, -3) + sale + code.slice(-2)
      expect(refusDe(abime), sale).toBe('caracteres')
    }
  })

  it('un code coupé : « il a été coupé à la recopie »', () => {
    const code = ecrireCarte(citeMaximale())
    // on coupe par la queue, de un à cinquante caractères
    for (let n = 1; n <= 50; n++) {
      const coupe = code.slice(0, code.length - n)
      const r = refusDe(coupe)
      expect(r, `−${n}`).not.toBeNull()
      expect(['tronque', 'somme', 'caracteres'], `−${n} → ${r}`).toContain(r)
    }
  })

  it('un code rallongé de deux caractères se refuse aussi', () => {
    const code = ecrireCarte(citeOrdinaire())
    expect(refusDe(`${code}AB`)).not.toBeNull()
  })

  it('UNE LETTRE CHANGÉE ne rend jamais une autre cité en silence', () => {
    /*
     * La promesse forte du module, et la seule qui protège vraiment le joueur : une
     * mutation d'un caractère est soit REFUSÉE, soit sans effet sur la cité lue (les
     * derniers bits d'un code base64 ne portent parfois rien). Ce qui ne doit JAMAIS
     * arriver, c'est qu'elle passe la porte et décrive une AUTRE cité - un
     * adversaire pourrait alors s'affaiblir d'un caractère avant d'envoyer sa carte,
     * et personne ne le verrait.
     */
    const carte = citeOrdinaire()
    const code = ecrireCarte(carte)
    const debut = `${PREFIXE_CARTE}${VERSION_CARTE}-`.length
    let refusees = 0
    let inoffensives = 0
    for (let i = debut; i < code.length; i++) {
      for (const c of ALPHABET_TEST) {
        if (c === code[i]) continue
        const lu = lireCarte(code.slice(0, i) + c + code.slice(i + 1))
        if (!lu.ok) {
          refusees++
          continue
        }
        expect(lu.valeur, `position ${i} → ${c}`).toEqual(carte)
        inoffensives++
      }
    }
    console.log(`mutations d’un caractère : ${refusees} refusées, ${inoffensives} sans effet, 0 silencieuse`)
    expect(refusees).toBeGreaterThan(1000)
  })

  it('un code fabriqué à la main se refuse : la somme ne tombe pas', () => {
    // quelqu'un qui devine le préfixe et compose du base64 plausible
    const bricole = `${PREFIXE_CARTE}${VERSION_CARTE}-AQAKAAAAAAAAAAAAAAAAAAAAAAAA`
    expect(refusDe(bricole)).not.toBeNull()
  })

  it('un code vide de corps, préfixe correct : « il n’est pas entier »', () => {
    expect(refusDe(`${PREFIXE_CARTE}${VERSION_CARTE}-`)).toBe('tronque')
    expect(refusDe(`${PREFIXE_CARTE}${VERSION_CARTE}-AAAA`)).toBe('tronque')
  })

  it('chaque motif de refus est une phrase française qui dit quoi faire', () => {
    const tous: RefusCode[] = ['vide', 'enorme', 'prefixe', 'genre', 'version', 'caracteres', 'tronque', 'somme']
    for (const r of tous) {
      const m = motifRefusCode(r)
      expect(m.length, r).toBeGreaterThan(30)
      // apostrophes TYPOGRAPHIQUES : le jeu n'en emploie pas d'autres
      expect(m, r).not.toContain("'")
    }
  })
})

describe('§3 bis · ce qu’on accepte quand même, parce que c’est ce que les gens font', () => {
  it('un code replié sur trois lignes par le client de messagerie se lit', () => {
    const code = ecrireCarte(citeMaximale())
    const t = Math.floor(code.length / 3)
    const replie = `${code.slice(0, t)}\n${code.slice(t, 2 * t)}\r\n${code.slice(2 * t)}`
    const lu = lireCarte(replie)
    expect(lu.ok, lu.ok ? '' : lu.motif).toBe(true)
    if (lu.ok) expect(lu.valeur).toEqual(citeMaximale())
  })

  it('des espaces et des tabulations partout dans le code se lisent', () => {
    const code = ecrireCarte(citeOrdinaire())
    const sale = `  ${code.split('').join(' ')} \t `
    const lu = lireCarte(sale)
    expect(lu.ok, lu.ok ? '' : lu.motif).toBe(true)
    if (lu.ok) expect(lu.valeur).toEqual(citeOrdinaire())
  })

  it('un préfixe recopié en minuscules se lit - le corps, lui, garde sa casse', () => {
    const code = ecrireCarte(citeOrdinaire())
    const minuscule = code.replace(`${PREFIXE_CARTE}${VERSION_CARTE}-`, `pall-d${VERSION_CARTE}-`)
    const lu = lireCarte(minuscule)
    expect(lu.ok, lu.ok ? '' : lu.motif).toBe(true)
    if (lu.ok) expect(lu.valeur).toEqual(citeOrdinaire())
  })

  it('un rapport replié et truffé de blancs se lit aussi, ses deux cités comprises', () => {
    const r = rapportDe(citeOrdinaire(), citeMaximale())
    const code = ecrireRapport(r)
    const t = Math.floor(code.length / 2)
    const lu = lireRapport(`\n ${code.slice(0, t)}\r\n\t${code.slice(t)} `)
    expect(lu.ok, lu.ok ? '' : lu.motif).toBe(true)
    if (lu.ok) expect(lu.valeur).toEqual(r)
  })
})

// ═════════════════════════════ §3 ter ═════════════════════════════

/*
 * UN RAPPORT PORTE DEUX CARTES DANS SON VENTRE, ET CHACUNE EST UN SECOND FLUX.
 *
 * §3 garde la carte du dehors : une lettre changée n'y rend jamais une autre cité en
 * silence. Rien ne gardait les cartes du DEDANS - la cible et la riposte, embarquées
 * comme des blocs de longueur annoncée - et le défaut était réel : raccourcir un bloc
 * de six octets, refaire la somme de contrôle, et le rapport franchissait toutes les
 * portes en rendant une cité amputée, ses héros disparus, le reste comblé de zéros.
 *
 * Or ces deux cartes sont ce que le défenseur va JUGER (la cible, dont l'empreinte
 * doit retomber sur une carte qu'il a émise) et ce qu'il va FRAPPER (la riposte,
 * cible de sa revanche). On pouvait donc frapper pour de vrai et n'offrir en retour
 * qu'une cité fantôme plus tendre que la sienne.
 *
 * Ces tests fabriquent des codes PARFAITEMENT BIEN FORMÉS - somme refaite, longueurs
 * cohérentes - parce que c'est la seule façon d'atteindre les lecteurs du dedans : un
 * code simplement coupé fait déborder celui du dehors, qui le voyait déjà. Ils refont
 * donc l'enveloppe à la main. Le champ de longueur de la CIBLE se calcule (il suit le
 * nom de l'attaquant) et se VÉRIFIE contre les octets de la carte seule ; celui de la
 * RIPOSTE se cherche, pour que ces tests survivent à un champ ajouté en amont.
 */

const ALPHABET_TEST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

function versB64uTest(o: Uint8Array): string {
  let out = ''
  for (let i = 0; i < o.length; i += 3) {
    const mot = (o[i] << 16) | ((i + 1 < o.length ? o[i + 1] : 0) << 8) | (i + 2 < o.length ? o[i + 2] : 0)
    out += ALPHABET_TEST[(mot >> 18) & 63] + ALPHABET_TEST[(mot >> 12) & 63]
    if (i + 1 < o.length) out += ALPHABET_TEST[(mot >> 6) & 63]
    if (i + 2 < o.length) out += ALPHABET_TEST[mot & 63]
  }
  return out
}

function depuisB64uTest(s: string): Uint8Array {
  const rangs = Array.from(s, (c) => ALPHABET_TEST.indexOf(c))
  const out = new Uint8Array(Math.floor((rangs.length * 6) / 8))
  let j = 0
  for (let i = 0; i < rangs.length; i += 4) {
    let mot = 0
    for (let k = 0; k < 4; k++) mot = (mot << 6) | (i + k < rangs.length ? rangs[i + k] : 0)
    if (j < out.length) out[j++] = (mot >> 16) & 0xff
    if (j < out.length) out[j++] = (mot >> 8) & 0xff
    if (j < out.length) out[j++] = mot & 0xff
  }
  return out
}

/** le corps d'un code, tel que le décodeur le verra - sans l'enveloppe */
function corpsDuCode(code: string): number[] {
  const tout = depuisB64uTest(code.slice(code.indexOf('-', 6) + 1))
  const longueur = (tout[1] << 8) | tout[2]
  return Array.from(tout.subarray(3, 3 + longueur))
}

/** l'inverse : sept octets d'enveloppe, la somme refaite, et du base64url */
function codeDuCorps(corps: number[], prefixe: string, version: number): string {
  const c = new Uint8Array(corps)
  const somme = empreinte(c)
  const tout = new Uint8Array(7 + c.length)
  tout[0] = version
  tout[1] = (c.length >> 8) & 0xff
  tout[2] = c.length & 0xff
  tout.set(c, 3)
  for (let k = 0; k < 4; k++) tout[3 + c.length + k] = (somme >>> (24 - 8 * k)) & 0xff
  return `${prefixe}${version}-${versB64uTest(tout)}`
}

const lireBits = (o: number[], i0: number, n: number): number => {
  let v = 0
  for (let k = 0; k < n; k++) v = v * 2 + ((o[(i0 + k) >> 3] >> (7 - ((i0 + k) & 7))) & 1)
  return v
}

const ecrireBits = (o: number[], i0: number, n: number, v: number): void => {
  for (let k = 0; k < n; k++) {
    const idx = (i0 + k) >> 3
    const masque = 1 << (7 - ((i0 + k) & 7))
    o[idx] = ((v >>> (n - 1 - k)) & 1) !== 0 ? o[idx] | masque : o[idx] & ~masque
  }
}

describe('§3 ter · les cartes embarquées dans un rapport sont gardées comme celle du dehors', () => {
  it('mon enveloppe de test est la bonne : un corps recomposé tel quel se relit', () => {
    // le témoin sans lequel les tests suivants ne prouveraient rien : s'ils
    // refusaient TOUT, ils passeraient en n'ayant testé que ma propre base64
    const r = rapportDe(citeOrdinaire(), citeMaximale())
    const refait = codeDuCorps(corpsDuCode(ecrireRapport(r)), PREFIXE_RAPPORT, VERSION_RAPPORT)
    expect(refait).toBe(ecrireRapport(r))
    const lu = lireRapport(refait)
    expect(lu.ok, lu.ok ? '' : lu.motif).toBe(true)
    if (lu.ok) expect(lu.valeur).toEqual(r)
  })

  it('le bloc de la CIBLE porte exactement les octets de sa carte seule', () => {
    // ce que ce test établit, c'est l'emplacement dont dépend le suivant : la
    // longueur du bloc suit le nom de l'attaquant, et elle vaut la taille du corps
    // de la carte prise à part - une carte ne s'écrit pas autrement dans un rapport
    // que toute seule
    const r = rapportDe(citeOrdinaire(), citeMaximale())
    const corps = corpsDuCode(ecrireRapport(r))
    const octetsNom = new TextEncoder().encode(r.cite).length
    const seule = corpsDuCode(ecrireCarte(r.cible))
    expect(lireBits(corps, 8 + 8 * octetsNom, 16)).toBe(seule.length)
  })

  it('le bloc de la cible raccourci ne rend JAMAIS une autre cité en silence', () => {
    const r = rapportDe(citeOrdinaire(), citeMaximale())
    const origine = corpsDuCode(ecrireRapport(r))
    const i = 8 + 8 * new TextEncoder().encode(r.cite).length
    const n = lireBits(origine, i, 16)
    let refuses = 0
    for (const retrait of [1, 3, 6, 17, n]) {
      const corps = [...origine]
      ecrireBits(corps, i, 16, n - retrait)
      const lu = lireRapport(codeDuCorps(corps, PREFIXE_RAPPORT, VERSION_RAPPORT))
      if (!lu.ok) {
        refuses++
        continue
      }
      // s'il franchit les portes, il décrit le MÊME assaut ET la MÊME cible
      expect(lu.valeur, `cible −${retrait} octets`).toEqual(r)
    }
    console.log(`bloc de la cible raccourci : ${refuses} refus sur 5`)
    expect(refuses).toBe(5)
  })

  it('le bloc de la RIPOSTE raccourci ne rend jamais une cité fantôme en silence', () => {
    const r = rapportDe(citeOrdinaire(), citeMaximale())
    const origine = corpsDuCode(ecrireRapport(r))
    const bits = origine.length * 8
    // le champ de longueur du dernier bloc : la seule fenêtre de seize bits dont la
    // valeur tombe pile sur le nombre d'octets qui restent derrière elle
    const candidats: number[] = []
    for (let i = 0; i + 16 <= bits; i++) {
      if (lireBits(origine, i, 16) === Math.floor((bits - (i + 16)) / 8)) candidats.push(i)
    }
    expect(candidats.length, 'la longueur du bloc doit se retrouver').toBeGreaterThan(0)
    let refuses = 0
    for (const i of candidats) {
      const n = lireBits(origine, i, 16)
      for (const retrait of [1, 3, 6, 17, n]) {
        if (retrait > n) continue
        const corps = [...origine]
        ecrireBits(corps, i, 16, n - retrait)
        const lu = lireRapport(
          codeDuCorps(corps.slice(0, Math.ceil((i + 16 + (n - retrait) * 8) / 8)), PREFIXE_RAPPORT, VERSION_RAPPORT),
        )
        if (!lu.ok) {
          refuses++
          continue
        }
        // rendre une riposte amputée serait offrir au défenseur une revanche contre
        // un fantôme plus tendre que la vraie cité de son agresseur
        expect(lu.valeur, `offset ${i}, −${retrait} octets`).toEqual(r)
      }
    }
    console.log(`bloc de la riposte raccourci : ${candidats.length} champs candidats, ${refuses} refus`)
    expect(refuses).toBeGreaterThan(0)
  })

  it('UNE LETTRE CHANGÉE dans un rapport ne rend jamais un autre assaut en silence', () => {
    // le miroir exact du test des cartes (§3) : c'est la graine, la colonne, les
    // pans et l'issue qui décident du butin qu'on va perdre, et une lettre changée à
    // la recopie ne doit jamais en changer un seul sans le dire
    const r = rapportDe(citeOrdinaire(), citeNue())
    const code = ecrireRapport(r)
    const debut = `${PREFIXE_RAPPORT}${VERSION_RAPPORT}-`.length
    let refusees = 0
    let inoffensives = 0
    for (let i = debut; i < code.length; i++) {
      for (const c of ALPHABET_TEST) {
        if (c === code[i]) continue
        const lu = lireRapport(code.slice(0, i) + c + code.slice(i + 1))
        if (!lu.ok) {
          refusees++
          continue
        }
        expect(lu.valeur, `position ${i} → ${c}`).toEqual(r)
        inoffensives++
      }
    }
    console.log(`mutations d’un caractère sur un rapport : ${refusees} refusées, ${inoffensives} sans effet`)
    expect(refusees).toBeGreaterThan(1000)
  })

  it('un rapport dont on change UN caractère au milieu est refusé, motif à l’appui', () => {
    // la même promesse, dite comme le joueur la vivra : il recolle un code qu'un
    // client de messagerie a abîmé, et il lit pourquoi
    const code = ecrireRapport(rapportDe(citeOrdinaire(), citeMaximale()))
    const i = Math.floor(code.length / 2)
    const autre = code[i] === 'A' ? 'B' : 'A'
    const lu = lireRapport(code.slice(0, i) + autre + code.slice(i + 1))
    expect(lu.ok).toBe(false)
    if (!lu.ok) {
      expect(['somme', 'tronque']).toContain(lu.refus)
      expect(lu.motif.length).toBeGreaterThan(30)
    }
  })
})

// ═════════════════════════════ §4 ═════════════════════════════

describe('§4 · ce qui entre est borné par les RÈGLES, jamais par le format', () => {
  it('la carte ne porte que les quinze champs de `CarteDefense`, et aucun secret', () => {
    /*
     * Le test le plus important du module, et celui qu'un ajout de champ distrait
     * ferait tomber. Deux promesses en une :
     *
     *  · ce qui voyage est EXACTEMENT le modèle de `duel.ts` - un champ de moins, et
     *    l'empreinte du défenseur ne retombe plus sur sa carte ;
     *  · rien d'autre ne voyage. Publier sa carte ne doit pas revenir à signer un
     *    chèque en blanc : le butin est GELÉ dans la carte, donc la carte ne dit
     *    rien des greniers, ni de la faveur, ni des technologies.
     */
    const attendus = [
      'atk',
      'butin',
      'cite',
      'garnison',
      'heros',
      'interieur',
      'jour',
      'mur',
      'murHp',
      'niveaux',
      'plan',
      'redoute',
      'reduc',
      'serie',
      'tours',
    ]
    expect(Object.keys(citeMaximale()).sort()).toEqual(attendus)
    // et ce qui SORT du fil ne porte pas un champ de plus
    expect(Object.keys(allerRetour(citeMaximale())).sort()).toEqual(attendus)
    const texte = JSON.stringify(allerRetour(citeMaximale()))
    for (const secret of ['resources', 'faveur', 'technos', 'wallHp', 'nextAttackAt', 'population']) {
      expect(texte, secret).not.toContain(secret)
    }
  })

  it('le rapport ne porte que les sept champs de `RapportRaid`', () => {
    const r = rapportDe(citeOrdinaire(), citeMaximale())
    const attendus = ['cible', 'cite', 'colonne', 'graine', 'issue', 'pans', 'riposte']
    expect(Object.keys(r).sort()).toEqual(attendus)
    const lu = lireRapport(ecrireRapport(r))
    expect(lu.ok && Object.keys(lu.valeur).sort()).toEqual(attendus)
    // l'issue, elle, en porte quatre - dont un qui ne voyage pas
    expect(lu.ok && Object.keys(lu.valeur.issue).sort()).toEqual(['envoyes', 'etoiles', 'morts', 'victoire'])
  })

  it('UN CODE ENTIÈREMENT COMPOSÉ DE BITS À UN se relit en une carte que le moteur accepte', () => {
    /*
     * Le cas hostile total, et le seul test qui prouve que le décodeur PASSE bien
     * par `carteValide` : tous les champs au maximum que le fil transporte, ce qui
     * dépasse partout ce que les règles tolèrent. Il n'y a pas d'autre façon de
     * l'atteindre - `ecrireCarte` désinfecte à l'aller, donc on ne peut pas écrire
     * une carte absurde ; il faut fabriquer les octets à la main.
     *
     * Ce que ce test garde, c'est que les bornes appliquées sont celles du JEU :
     * soixante hommes par type (`GARNISON_MAX_PAR_UNITE`), trois cents par ressource
     * (`PLAFOND_BUTIN_PAR_RES`), le double de la structure nue, +80 % de dégâts au
     * plus. Le codec qui bornait lui-même a existé, et ses bornes n'étaient pas
     * celles-là.
     */
    const lu = lireCarte(codeDuCorps(Array.from({ length: 512 }, () => 0xff), PREFIXE_CARTE, VERSION_CARTE))
    expect(lu.ok, lu.ok ? '' : lu.motif).toBe(true)
    if (!lu.ok) return
    const c = lu.valeur
    expect(Array.from(c.cite).length).toBeLessThanOrEqual(40)
    expect(c.mur).toBe(WALL_HP.length - 1)
    expect(c.murHp).toBe(WALL_HP[WALL_HP.length - 1] * 2)
    expect(c.tours).toBe(Math.max(...TOURS_MAX))
    expect(c.redoute).toBe(4)
    for (const u of UNIT_IDS) {
      // le bélier n'est pas une défense : `carteValide` le laisse tomber
      expect(c.garnison[u] ?? 0, u).toBeLessThanOrEqual(u === 'belier' ? 0 : GARNISON_MAX_PAR_UNITE)
    }
    expect(hommesDe(c.garnison)).toBe(GARNISON_MAX_PAR_UNITE * (UNIT_IDS.length - 1))
    expect(c.heros).toHaveLength(HERO_IDS.length)
    for (const h of c.heros) expect(h.niveau, h.id).toBe(NIVEAU_MAX)
    // huit octets à un font un NaN, que `carteValide` ramène au défaut : un
    // adversaire ne se donne pas des dégâts infinis en changeant deux bits
    expect(c.atk).toBe(1)
    expect(c.reduc).toBe(1)
    for (const b of BUILDING_IDS) expect(c.niveaux[b], b).toBe(4)
    for (const r of RES_CODE) expect(c.butin[r], r).toBe(PLAFOND_BUTIN_PAR_RES)
    // vingt-quatre bits à un font 16 777 215, et les règles ramènent la journée et
    // la série à dix millions : le fil transporte plus large que le jeu, exprès
    expect(c.jour).toBe(1e7)
    expect(c.serie).toBe(1e7)
    // et ce qui est sorti du fil est un point fixe des règles : rien d'hostile ne
    // descend dans le moteur
    expect(ecrireCarte(c)).toBe(ecrireCarte(carteValide(c)))
  })

  it('un code entièrement composé de zéros se relit en un hameau désarmé', () => {
    const lu = lireCarte(codeDuCorps(Array.from({ length: 128 }, () => 0), PREFIXE_CARTE, VERSION_CARTE))
    expect(lu.ok, lu.ok ? '' : lu.motif).toBe(true)
    if (!lu.ok) return
    const c = lu.valeur
    expect(c.cite).toBe('Une cité sans nom')
    expect(c.mur).toBe(0)
    expect(c.murHp).toBe(0)
    expect(hommesDe(c.garnison)).toBe(0)
    expect(c.heros).toEqual([])
    expect(c.butin).toEqual({})
    expect(c.niveaux).toEqual({})
    expect(c.plan).toEqual({ ligne: 'tenir', tir: 'tendu', pans: {}, heros: {} })
    /*
     * `atk` vaut zéro sur le fil et les règles le ramènent à 1 : un défenseur frappe
     * au moins comme un homme. `reduc`, lui, rend 1 - AUCUNE réduction - et c'est la
     * correction que ce test a motivée : `borne` clampe, et zéro étant fini, un code
     * tout à zéro rendait auparavant `REDUC_MIN`, c'est-à-dire la MEILLEURE réduction
     * de dégâts possible. Un champ vide doit se lire « rien », jamais « le mieux ».
     */
    expect(c.atk).toBe(1)
    expect(c.reduc).toBe(1)
  })

  it('un pan que le fil ne connaît pas ne poste personne', () => {
    // un rang de pan inventé (une version future en aurait quatre) vaut « aucun
    // ordre », jamais un ordre au hasard : on ne déplace pas une garnison sur un
    // index qu'on ne comprend pas
    const corps = corpsDuCode(ecrireCarte(citeOrdinaire()))
    const lu = lireCarte(codeDuCorps(corps, PREFIXE_CARTE, VERSION_CARTE))
    expect(lu.ok && lu.valeur.plan.pans).toEqual(citeOrdinaire().plan.pans)
    // et le bélier ne tient jamais de pan, même si le fil en portait un
    expect(lu.ok && lu.valeur.plan.pans.belier).toBeUndefined()
  })

  it('une colonne de trente hommes se rogne à vingt, et l’issue suit', () => {
    // `colonneValide` rogne par la fin, et `rapportValide` reborne les morts sur ce
    // qui reste : un rapport ne peut pas annoncer plus de cadavres que d'hommes
    const r = rapportValide({
      ...rapportDe(citeOrdinaire(), citeNue()),
      colonne: { hoplite: 15, lancier: 15 },
      issue: { victoire: true, etoiles: 3, morts: 99, envoyes: 99 },
    })
    const lu = lireRapport(ecrireRapport(r))
    expect(lu.ok && hommesDe(lu.valeur.colonne)).toBe(MAX_TROUPES)
    expect(lu.ok && lu.valeur.issue.morts).toBeLessThanOrEqual(MAX_TROUPES)
    expect(lu.ok && lu.valeur.issue.envoyes).toBe(MAX_TROUPES)
  })
})

// ═════════════════════════════ §5 ═════════════════════════════

describe('§5 · mille codes bruités, aucune exception', () => {
  /*
   * Le fuzz est à graine FIXE (`creerAlea`, le générateur du mode défi) : un échec
   * doit être reproductible, sinon il ne sera jamais corrigé. On brouille de sept
   * façons parce que ce sont les sept façons dont un code s'abîme vraiment - la
   * queue coupée par un champ de saisie, un caractère perdu au copier-coller, deux
   * moitiés recollées, et le code entièrement inventé.
   */
  const bruiter = (code: string, alea: () => number): string => {
    const i = Math.floor(alea() * code.length)
    switch (Math.floor(alea() * 7)) {
      case 0:
        return code.slice(0, i)
      case 1:
        return code.slice(i)
      case 2:
        return code.slice(0, i) + code.slice(i + 1)
      case 3:
        return code.slice(0, i) + String.fromCharCode(32 + Math.floor(alea() * 200)) + code.slice(i)
      case 4:
        return code.slice(0, i) + code.slice(0, i)
      case 5:
        return code + code
      default:
        return Array.from({ length: 1 + Math.floor(alea() * 400) }, () =>
          String.fromCharCode(32 + Math.floor(alea() * 200)),
        ).join('')
    }
  }

  it('mille cartes bruitées : rien ne lève, et ce qui passe est une carte saine', () => {
    const alea = creerAlea(20260812)
    const sources = [ecrireCarte(citeMaximale()), ecrireCarte(citeOrdinaire()), ecrireCarte(citeNue())]
    let passees = 0
    for (let n = 0; n < 1000; n++) {
      const texte = bruiter(sources[n % sources.length], alea)
      const lu = lireCarte(texte)
      if (!lu.ok) {
        expect(typeof lu.motif, `tour ${n}`).toBe('string')
        expect(lu.motif.length, `tour ${n}`).toBeGreaterThan(0)
        continue
      }
      passees++
      // une carte qui a franchi les portes est encore une carte que les RÈGLES
      // acceptent telle quelle : c'est ce qui garantit qu'aucun champ hostile ne
      // descend dans le moteur
      expect(ecrireCarte(lu.valeur), `tour ${n}`).toBe(ecrireCarte(carteValide(lu.valeur)))
      expect(empreinteCarte(lu.valeur), `tour ${n}`).toBe(empreinteCarte(carteValide(lu.valeur)))
    }
    console.log(`fuzz cartes : 1000 codes bruités, ${passees} ont franchi les portes, 0 exception`)
  })

  it('mille rapports bruités : rien ne lève, et ce qui passe est un rapport sain', () => {
    const alea = creerAlea(776655)
    const sources = [
      ecrireRapport(rapportDe(citeMaximale(), citeMaximale(), { colonne: COLONNE_PLEINE, pans: TOUS_LES_PANS })),
      ecrireRapport(rapportDe(citeOrdinaire(), citeNue())),
      ecrireRapport(rapportDe(citeOrdinaire(), null)),
    ]
    let passees = 0
    for (let n = 0; n < 1000; n++) {
      const lu = lireRapport(bruiter(sources[n % sources.length], alea))
      if (!lu.ok) {
        expect(lu.motif.length, `tour ${n}`).toBeGreaterThan(0)
        continue
      }
      passees++
      expect(ecrireRapport(lu.valeur), `tour ${n}`).toBe(ecrireRapport(rapportValide(lu.valeur)))
      expect(hommesDe(lu.valeur.colonne), `tour ${n}`).toBeLessThanOrEqual(MAX_TROUPES)
    }
    console.log(`fuzz rapports : 1000 codes bruités, ${passees} ont franchi les portes, 0 exception`)
  })

  it('mille textes tirés au hasard, sans même le préfixe : rien ne lève', () => {
    const alea = creerAlea(1)
    for (let n = 0; n < 1000; n++) {
      const long = Math.floor(alea() * 300)
      const texte = Array.from({ length: long }, () => String.fromCharCode(Math.floor(alea() * 65535))).join('')
      expect(lireCarte(texte).ok, `tour ${n}`).toBe(false)
      expect(lireRapport(texte).ok, `tour ${n}`).toBe(false)
    }
  })

  it('mille corps de code inventés sous un préfixe valable : refusés, sans exception', () => {
    /*
     * Le cas de la malveillance : quelqu'un a lu le format, connaît le préfixe et
     * compose du base64 valable à la main. La somme de contrôle l'attrape presque
     * toujours ; ce qui compte ici, c'est que le rare code qui passe rende une carte
     * BORNÉE et non une exception ou un état absurde.
     */
    const alea = creerAlea(424242)
    let passees = 0
    for (let n = 0; n < 1000; n++) {
      const long = 8 + Math.floor(alea() * 240)
      const corps = Array.from({ length: long }, () => ALPHABET_TEST[Math.floor(alea() * 64)]).join('')
      const lu = lireCarte(`${PREFIXE_CARTE}${VERSION_CARTE}-${corps}`)
      if (!lu.ok) continue
      passees++
      expect(ecrireCarte(lu.valeur), `tour ${n}`).toBe(ecrireCarte(carteValide(lu.valeur)))
    }
    console.log(`fuzz corps inventés : 1000 essais, ${passees} ont franchi la somme de contrôle`)
    // quatre octets de somme : un code inventé au hasard n'a qu'une chance sur
    // quatre milliards, et la borne dit que la porte n'est pas grande ouverte
    expect(passees).toBeLessThan(10)
  })

  it('la somme de contrôle change dès qu’un octet change', () => {
    const base = new Uint8Array([1, 2, 3, 4, 5])
    const s = empreinte(base)
    for (let i = 0; i < base.length; i++) {
      const autre = new Uint8Array(base)
      autre[i] = (autre[i] + 1) & 0xff
      expect(empreinte(autre), `octet ${i}`).not.toBe(s)
    }
    expect(empreinte(new Uint8Array(0))).toBe(2166136261)
    // un mot de 32 bits non signé : jamais négatif, jamais NaN
    expect(s).toBeGreaterThanOrEqual(0)
    expect(s).toBeLessThanOrEqual(0xffffffff)
  })
})

// ═════════════════════════════ §6 ═════════════════════════════

describe('§6 · ce que le codec livre au duel, jugé par le duel lui-même', () => {
  /*
   * Les tests qui précèdent comparent des objets ; ceux-ci font juger un code relu
   * par `refusRapport`, c'est-à-dire par l'anti-triche RÉEL. C'est la seule façon de
   * prouver que le courrier ne se contente pas d'être exact, mais qu'il est exact
   * SUR CE QUI EST COMPARÉ - l'empreinte de la cible, la graine, la colonne, les
   * pans et les trois champs de l'issue.
   *
   * `rejoue` est passé égal à l'issue du rapport : on n'éprouve pas ici le moteur de
   * bataille (c'est le travail de `duel.test.ts`), on éprouve que rien ne s'est perdu
   * en chemin. Aucune source de hasard n'est posée, donc `aleaPose()` est faux et le
   * refus `'defi'` ne s'en mêle pas.
   */
  const cible = citeOrdinaire()

  /** un rapport monté par `duel.ts` lui-même, tel que le store en produira */
  function rapportHonnete(): RapportRaid {
    const issue: IssueRaid = { victoire: true, etoiles: 2, morts: 6, envoyes: hommesDe(COLONNE) }
    return rapportDuRaid('Mycènes des Atrides', cible, COLONNE, ['porte', 'nord'], issue, citeNue())
  }

  it('un rapport honnête franchit la vérification APRÈS un aller-retour par le fil', () => {
    const lu = lireRapport(ecrireRapport(rapportHonnete()))
    expect(lu.ok, lu.ok ? '' : lu.motif).toBe(true)
    if (!lu.ok) return
    expect(refusRapport(aPublie(cible), lu.valeur, lu.valeur.issue)).toBeNull()
  })

  it('la graine se recalcule à l’identique depuis ce qui est arrivé', () => {
    // la chaîne entière de l'anti-triche, bout à bout : l'empreinte de la cible, la
    // colonne et les pans redonnent la graine du rapport. Un seul de ces trois
    // champs abîmé par le fil, et c'est `'graine'` sur un rapport honnête.
    const lu = lireRapport(ecrireRapport(rapportHonnete()))
    expect(lu.ok).toBe(true)
    if (!lu.ok) return
    const r = lu.valeur
    expect(graineRaid(empreinteCarte(r.cible), r.colonne, r.pans)).toBe(r.graine)
  })

  it('un pan perdu en chemin ferait refuser un rapport honnête : voilà ce que le fil garde', () => {
    /*
     * La démonstration par l'absurde de la promesse capitale. On retire un pan au
     * rapport relu - ce qu'un codec distrait aurait fait tout seul - et le défenseur
     * refuse pour `'graine'`. Le joueur honnête lirait « quelqu'un a relancé les dés
     * jusqu'à gagner » alors qu'il n'a rien fait, et personne n'aurait pu le
     * diagnostiquer : le défaut ne se voit qu'entre deux joueurs.
     */
    const lu = lireRapport(ecrireRapport(rapportHonnete()))
    expect(lu.ok).toBe(true)
    if (!lu.ok) return
    const ampute = rapportValide({ ...lu.valeur, pans: ['porte'] })
    expect(refusRapport(aPublie(cible), ampute, ampute.issue)).toBe('graine')
  })

  it('une cible retouchée d’un seul homme n’est plus une carte publiée', () => {
    // la serrure, vue du fil : on ré-encode un rapport dont la cible a été affaiblie,
    // et le défenseur ne la reconnaît plus
    const r = rapportHonnete()
    const affaiblie = carteValide({ ...cible, garnison: { ...cible.garnison, hoplite: 1 } })
    const lu = lireRapport(ecrireRapport(rapportValide({ ...r, cible: affaiblie })))
    expect(lu.ok).toBe(true)
    if (!lu.ok) return
    expect(refusRapport(aPublie(cible), lu.valeur, lu.valeur.issue)).toBe('inconnue')
  })

  it('la carte publiée traverse le fil et reste JUGEABLE par son émetteur', () => {
    // le chemin réel du duel : le défenseur publie, l'attaquant COLLE le code,
    // frappe la carte qu'il a lue, et le rapport revient. Si l'aller-retour de la
    // carte changeait un bit, le rapport porterait une cible que son émetteur ne
    // reconnaîtrait pas - et c'est le défaut qu'aucun test d'objet ne montre.
    const lue = lireCarte(ecrireCarte(cible))
    expect(lue.ok).toBe(true)
    if (!lue.ok) return
    const r = rapportDuRaid('Mycènes des Atrides', lue.valeur, COLONNE, ['sud'], {
      victoire: false,
      etoiles: 0,
      morts: hommesDe(COLONNE),
      envoyes: hommesDe(COLONNE),
    }, null)
    const lu = lireRapport(ecrireRapport(r))
    expect(lu.ok).toBe(true)
    if (!lu.ok) return
    expect(refusRapport(aPublie(cible), lu.valeur, lu.valeur.issue)).toBeNull()
  })

  it('les trois champs comparés de l’issue arrivent exacts, un par un', () => {
    // `refusRapport` compare `victoire`, `etoiles` et `morts` - et rien d'autre. Un
    // seul faux, et c'est `'issue'` : « rejoué chez vous, cet assaut ne donne pas
    // cette issue », sur un rapport honnête.
    for (const issue of [
      { victoire: true, etoiles: 3, morts: 0 },
      { victoire: true, etoiles: 1, morts: 12 },
      { victoire: false, etoiles: 0, morts: hommesDe(COLONNE) },
    ]) {
      const r = rapportDuRaid('Mycènes des Atrides', cible, COLONNE, ['porte', 'nord'], { ...issue, envoyes: hommesDe(COLONNE) }, null)
      const lu = lireRapport(ecrireRapport(r))
      expect(lu.ok, JSON.stringify(issue)).toBe(true)
      if (!lu.ok) continue
      expect(lu.valeur.issue, JSON.stringify(issue)).toMatchObject(issue)
      expect(refusRapport(aPublie(cible), lu.valeur, lu.valeur.issue), JSON.stringify(issue)).toBeNull()
    }
  })
})
