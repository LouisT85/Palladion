import { beforeEach, describe, expect, it } from 'vitest'
import { risqueCaravane } from './commerce'
import { SAISONS } from './saisons'
import {
  NAVIRES,
  PAR_COLONNE,
  PAR_ESCORTE,
  calesMax,
  coquesDe,
  creerChantier,
  nbLibres,
  recuperationDesarmement,
  retenues,
  risqueEscorte,
  type Coque,
  type TypeNavire,
} from './flotte'
import { merFermee, useGame } from './store'

/*
 * ═══════════ LA FLOTTE, VUE DU MOTEUR ═══════════
 *
 * Le module pur ne peut rien dire des quatre coutures où ce système se casserait
 * en silence, et ce sont elles qu'on éprouve ici :
 *
 *  1. LE PLAFOND DU PORT. Il n'a de sens que si le store le fait respecter à la
 *     mise en cale - la fonction pure peut être juste et l'action l'ignorer.
 *  2. LE RISQUE FIGÉ. `Caravane.risque` est écrit au départ, parce qu'on l'a
 *     montré au joueur. Le store doit y inscrire le risque ESCORTÉ, et non le
 *     risque nu avec une escorte appliquée en douce au retour - sans quoi le
 *     panneau mentirait dans les deux sens.
 *  3. LA RETENUE QUI SE DÉNOUE. Une coque retenue par un convoi ou par la colonne
 *     doit revenir. Une retenue orpheline - une expédition qui n'est plus là, une
 *     caravane résolue - immobiliserait la flotte pour toujours, et le joueur
 *     n'aurait AUCUN moyen de la libérer.
 *  4. LA VITESSE ×8. La cale est la seule échéance en millisecondes de tout le
 *     système : si elle n'est pas reculée dans le bloc de vitesse du tick, une
 *     quille prend deux minutes à ×1 et seize à ×8.
 *
 * ⚠️ CE QU'ON NE PEUT PAS ÉPROUVER ICI : le refus faute de bois. Sous vitest,
 * `MODE_TEST` rend `payer()` et `peutPayer()` toujours vrais - un test qui
 * passerait par le store pour éprouver un refus de paiement mesurerait le mode
 * test, pas la règle.
 */

const AUCUNE_TROUPE = { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 }

function coque(id: string, type: TypeNavire, retenue: Coque['retenue'] = null): Coque {
  return { id, type, retenue }
}

/**
 * Un règne riche, au port franc, avec la flotte qu'on lui donne.
 *
 * ⚠️ L'AGORA EST AU NIVEAU 4, ET LES RÉSERVES SOUS SON PLAFOND. `clampRes` borne
 * toute recette à `stockageMax(s)`, c'est-à-dire à `STOCKAGE[agora.level]` - 350
 * sur une agora de niveau 1. Un règne à 4000 de bois posé par `setState` échappe
 * au plafond (setState n'appelle pas `clampRes`), mais le premier crédit du
 * désarmement l'y ramène d'un coup : le test lisait +80 de bois et mesurait
 * −3650. Ce n'était pas la flotte qui avait tort, c'était le règne du test.
 */
function regneNaval(coques: Coque[] = [], port = 4) {
  const s = useGame.getState()
  useGame.setState({
    resources: { bois: 2000, pierre: 2000, grain: 2000, bronze: 2000 },
    buildings: {
      ...s.buildings,
      port: { level: port },
      agora: { level: 4 },
      caserne: { level: 3 },
      remparts: { level: 2 },
    },
    flotte: { coques, chantiers: [] },
    caravanes: [],
    expedition: null,
    battle: null,
    mode: null,
    vitesse: 1,
    saison: 'printemps',
    graces: [],
    threat: 20,
    relations: {},
    alliances: {},
    army: { ...AUCUNE_TROUPE, hoplite: 8, lancier: 8 },
    expeditions: {},
    hecatombe: null,
    lastSeen: Date.now(),
  })
}

/** l'hiver, qui ferme la mer - et sans grâce de Poséidon pour la rouvrir */
function hiver() {
  useGame.setState({ saison: 'hiver', graces: [] })
  expect(SAISONS.hiver.merFermee).toBe(true)
  expect(merFermee(useGame.getState())).toBe(true)
}

beforeEach(() => {
  regneNaval()
})

// ── 1. Le chantier et le plafond ─────────────────────────────────────────────

describe('bâtir une coque au port', () => {
  it('met la quille en cale, et la coque n’existe qu’à l’échéance', () => {
    useGame.getState().batirNavire('nef')
    const f = useGame.getState().flotte
    expect(f.chantiers).toHaveLength(1)
    expect(f.chantiers[0].type).toBe('nef')
    expect(coquesDe(f)).toHaveLength(0)

    // l'heure passée, le battement la met à l'eau
    useGame.setState({
      flotte: { coques: [], chantiers: [{ ...f.chantiers[0], finAt: Date.now() - 1 }] },
      lastSeen: Date.now(),
    })
    useGame.getState().tick()
    expect(useGame.getState().flotte.chantiers).toHaveLength(0)
    expect(nbLibres(useGame.getState().flotte, 'nef')).toBe(1)
  })

  /*
   * ⚠️ ON NE PEUT PAS ÉPROUVER LE PAIEMENT ICI, ET IL NE FAUT PAS ESSAYER.
   * `payer()` sort sur `if (MODE_TEST) return true` AVANT de retirer quoi que ce
   * soit : sous vitest la coque est gratuite, et un test qui comparait les
   * réserves avant et après lisait un écart de zéro. Il ne mesurait donc ni la
   * règle ni son contraire - seulement le mode test. Le prix est éprouvé là où il
   * est vrai, dans `flotte.test.ts` (bois et bronze non nuls, galère trois fois
   * plus chère en bronze), et c'est le panneau qui éteint la carte par
   * `peutPayer`.
   *
   * Ce qui SE laisse éprouver ici, en revanche, c'est que l'action a pris
   * l'échéance du navire qu'on lui a demandé.
   */
  it('donne à la quille l’échéance de SON navire - une galère ne flotte pas à l’heure d’une nef', () => {
    const t0 = Date.now()
    useGame.getState().batirNavire('pentecontere')
    const cale = useGame.getState().flotte.chantiers[0]
    expect(cale.type).toBe('pentecontere')
    // la cale porte la durée de CE navire, et non un délai de façade partagé
    expect(cale.finAt - t0).toBeGreaterThanOrEqual(NAVIRES.pentecontere.chantierMs - 100)
    expect(cale.finAt - t0).toBeLessThan(NAVIRES.pentecontere.chantierMs + 2000)
    expect(NAVIRES.pentecontere.chantierMs).toBeGreaterThan(NAVIRES.nef.chantierMs)
  })

  it('refuse sans port - une coque ne se monte pas sur une plage', () => {
    regneNaval([], 0)
    useGame.getState().batirNavire('nef')
    expect(useGame.getState().flotte.chantiers).toHaveLength(0)
  })

  it('refuse une coque de plus que le port n’en mouille, chantiers compris', () => {
    // le petit quai en mouille deux : une à flot, une en cale, et c'est tout
    regneNaval([coque('g0', 'pentecontere')], 1)
    useGame.getState().batirNavire('nef')
    expect(useGame.getState().flotte.chantiers).toHaveLength(1)
    useGame.getState().batirNavire('nef')
    expect(useGame.getState().flotte.chantiers).toHaveLength(1)
  })

  it('ne monte pas plus de quilles que le port n’a de cales', () => {
    regneNaval([], 4)
    for (let n = 0; n < 5; n++) useGame.getState().batirNavire('nef')
    expect(useGame.getState().flotte.chantiers).toHaveLength(calesMax(4))
  })

  it('recule l’échéance de la cale quand le jeu tourne à ×8 - sinon la quille prend seize minutes', () => {
    useGame.getState().batirNavire('pentecontere')
    const avant = useGame.getState().flotte.chantiers[0].finAt
    useGame.setState({ vitesse: 8, lastSeen: Date.now() - 1000 })
    useGame.getState().tick()
    const apres = useGame.getState().flotte.chantiers[0].finAt
    // 1 s réelle à ×8 = 8 s de jeu : l'échéance doit avoir reculé de 7 s de plus
    expect(avant - apres).toBeGreaterThan(6000)
  })
})

describe('désarmer une coque', () => {
  it('rend du bois, libère le mouillage, et ne rend pas un lingot', () => {
    regneNaval([coque('g0', 'pentecontere')], 2)
    const avant = { ...useGame.getState().resources }
    useGame.getState().desarmerNavire('g0')
    const apres = useGame.getState().resources
    expect(coquesDe(useGame.getState().flotte)).toHaveLength(0)
    expect(apres.bois - avant.bois).toBe(recuperationDesarmement('pentecontere').bois)
    expect(apres.bronze).toBe(avant.bronze)
  })

  it('ne désarme pas une coque qui est en mer', () => {
    regneNaval([coque('g0', 'pentecontere', { par: PAR_ESCORTE, ref: 'car1' })], 2)
    useGame.getState().desarmerNavire('g0')
    expect(coquesDe(useGame.getState().flotte)).toHaveLength(1)
  })
})

// ── 2. L'escorte, et le risque qu'on a montré ────────────────────────────────

describe('escorter une caravane', () => {
  it('inscrit dans la caravane le risque ESCORTÉ, celui qu’on a montré au joueur', () => {
    regneNaval([coque('g0', 'pentecontere'), coque('g1', 'pentecontere')], 3)
    const s = useGame.getState()
    const nu = risqueCaravane('citadelle-tenedos', {
      now: Date.now(),
      saison: s.saison,
      meteo: s.meteo,
      merFermee: merFermee(s),
      menace: s.threat,
      secheresse: false,
      ruines: 0,
      port: 3,
      relations: {},
      alliances: {},
      cours: s.cours,
    })
    useGame.getState().envoyerCaravane('citadelle-tenedos', 'grain', 2, 2)
    const car = useGame.getState().caravanes[0]
    expect(car).toBeDefined()
    expect(car.risque).toBeCloseTo(risqueEscorte(nu, 2), 6)
    expect(car.risque).toBeLessThan(nu)
  })

  it('retient les galères jusqu’au retour du convoi, et pas les nefs', () => {
    regneNaval([coque('g0', 'pentecontere'), coque('g1', 'pentecontere'), coque('n0', 'nef')], 3)
    useGame.getState().envoyerCaravane('citadelle-tenedos', 'grain', 2, 2)
    const f = useGame.getState().flotte
    expect(nbLibres(f, 'pentecontere')).toBe(0)
    expect(nbLibres(f, 'nef')).toBe(1)
    expect(retenues(f, PAR_ESCORTE, useGame.getState().caravanes[0].id)).toHaveLength(2)
  })

  it('n’escorte pas une route de terre : la galère reste au mouillage', () => {
    regneNaval([coque('g0', 'pentecontere')], 3)
    useGame.getState().envoyerCaravane('camp-pillards', 'grain', 1, 2)
    expect(useGame.getState().caravanes).toHaveLength(1)
    expect(nbLibres(useGame.getState().flotte, 'pentecontere')).toBe(1)
  })

  it('n’engage jamais plus de galères qu’il n’y en a au mouillage', () => {
    regneNaval([coque('g0', 'pentecontere'), coque('g1', 'pentecontere', { par: PAR_ESCORTE, ref: 'vieux' })], 3)
    useGame.getState().envoyerCaravane('citadelle-tenedos', 'grain', 1, 2)
    expect(retenues(useGame.getState().flotte, PAR_ESCORTE, useGame.getState().caravanes[0].id)).toHaveLength(1)
  })

  it('rend les galères quand le convoi rentre - sûr ou perdu', () => {
    regneNaval([coque('g0', 'pentecontere')], 3)
    useGame.getState().envoyerCaravane('citadelle-tenedos', 'grain', 1, 1)
    const car = useGame.getState().caravanes[0]
    // le convoi a fait son temps : le battement le résout
    useGame.setState({
      caravanes: [{ ...car, risque: 0, retourA: Date.now() - 1 }],
      lastSeen: Date.now(),
    })
    useGame.getState().tick()
    expect(useGame.getState().caravanes).toHaveLength(0)
    expect(nbLibres(useGame.getState().flotte, 'pentecontere')).toBe(1)
  })

  it('coule la galère avec le convoi qu’elle n’a pas su sauver, ou la rend - jamais les deux', () => {
    regneNaval([coque('g0', 'pentecontere')], 3)
    useGame.getState().envoyerCaravane('citadelle-tenedos', 'grain', 1, 1)
    const car = useGame.getState().caravanes[0]
    // risque à 1 : le convoi est pris à coup sûr
    useGame.setState({ caravanes: [{ ...car, risque: 1, retourA: Date.now() - 1 }], lastSeen: Date.now() })
    useGame.getState().tick()
    const f = useGame.getState().flotte
    // soit elle a coulé, soit elle est rentrée libre : dans les deux cas, plus une seule retenue
    expect(retenues(f, PAR_ESCORTE)).toHaveLength(0)
    expect(coquesDe(f, 'pentecontere').length).toBeLessThanOrEqual(1)
  })

  it('rend une galère que plus aucune caravane ne retient - sinon elle serait immobilisée pour toujours', () => {
    regneNaval([coque('g0', 'pentecontere', { par: PAR_ESCORTE, ref: 'convoi-disparu' })], 3)
    useGame.setState({ caravanes: [], lastSeen: Date.now() })
    useGame.getState().tick()
    expect(nbLibres(useGame.getState().flotte, 'pentecontere')).toBe(1)
  })
})

// ── 3. La traversée d'outre-mer ──────────────────────────────────────────────

describe('l’accès aux places d’outre-mer', () => {
  it('reste exactement ce qu’il était par mer ouverte : aucune coque exigée', () => {
    regneNaval([], 0)
    useGame.setState({ saison: 'ete', army: { ...AUCUNE_TROUPE, hoplite: 6 } })
    useGame.getState().lancerExpedition('cite-lesbos', { ...AUCUNE_TROUPE, hoplite: 6 })
    expect(useGame.getState().expedition).not.toBeNull()
  })

  it('refuse encore l’hiver à qui n’a pas de flotte', () => {
    regneNaval([], 3)
    hiver()
    useGame.getState().lancerExpedition('cite-lesbos', { ...AUCUNE_TROUPE, hoplite: 6 })
    expect(useGame.getState().expedition).toBeNull()
  })

  it('refuse l’hiver à qui n’a que des cales, sans galère pour ouvrir la route', () => {
    regneNaval([coque('n0', 'nef')], 3)
    hiver()
    useGame.getState().lancerExpedition('cite-lesbos', { ...AUCUNE_TROUPE, hoplite: 6 })
    expect(useGame.getState().expedition).toBeNull()
  })

  it('force le détroit en hiver avec une cale par huit hommes et une galère', () => {
    regneNaval([coque('n0', 'nef'), coque('g0', 'pentecontere')], 3)
    hiver()
    useGame.getState().lancerExpedition('cite-lesbos', { ...AUCUNE_TROUPE, hoplite: 6 })
    expect(useGame.getState().expedition).not.toBeNull()
    expect(retenues(useGame.getState().flotte, PAR_COLONNE)).toHaveLength(2)
  })

  it('n’embarque pas une coque déjà partie escorter un convoi', () => {
    regneNaval([coque('n0', 'nef', { par: PAR_ESCORTE, ref: 'car1' }), coque('g0', 'pentecontere')], 3)
    hiver()
    useGame.getState().lancerExpedition('cite-lesbos', { ...AUCUNE_TROUPE, hoplite: 6 })
    expect(useGame.getState().expedition).toBeNull()
  })

  it('embarque les cales même par mer ouverte - c’est ainsi qu’on rapporte tout', () => {
    regneNaval([coque('n0', 'nef')], 3)
    useGame.setState({ saison: 'ete' })
    useGame.getState().lancerExpedition('cite-lesbos', { ...AUCUNE_TROUPE, hoplite: 6 })
    expect(retenues(useGame.getState().flotte, PAR_COLONNE)).toHaveLength(1)
  })

  it('n’embarque rien pour une place de terre ferme', () => {
    regneNaval([coque('n0', 'nef'), coque('g0', 'pentecontere')], 3)
    useGame.getState().lancerExpedition('camp-pillards', { ...AUCUNE_TROUPE, hoplite: 4 })
    expect(retenues(useGame.getState().flotte, PAR_COLONNE)).toHaveLength(0)
  })

  it('rend les coques à la fin de l’expédition, victoire ou déroute', () => {
    regneNaval([coque('n0', 'nef'), coque('g0', 'pentecontere')], 3)
    useGame.setState({ saison: 'ete' })
    useGame.getState().lancerExpedition('cite-lesbos', { ...AUCUNE_TROUPE, hoplite: 6 })
    expect(retenues(useGame.getState().flotte, PAR_COLONNE).length).toBeGreaterThan(0)
    // la colonne rentre : on force la conclusion par la retraite, puis on bat
    useGame.getState().retraiteExpedition()
    for (let n = 0; n < 400 && !useGame.getState().expedition?.result; n++) {
      useGame.setState({ lastSeen: Date.now() - 500 })
      useGame.getState().tick()
    }
    expect(useGame.getState().expedition?.result).not.toBeNull()
    expect(retenues(useGame.getState().flotte, PAR_COLONNE)).toHaveLength(0)
  })

  it('rend une coque que plus aucune colonne ne retient - la retenue orpheline se rattrape', () => {
    regneNaval([coque('n0', 'nef', { par: PAR_COLONNE, ref: null })], 3)
    useGame.setState({ expedition: null, lastSeen: Date.now() })
    useGame.getState().tick()
    expect(nbLibres(useGame.getState().flotte, 'nef')).toBe(1)
  })
})

// ── 4. La flotte se sauvegarde ───────────────────────────────────────────────

describe('la flotte traverse la sauvegarde', () => {
  it('se retrouve entière après un rechargement', () => {
    regneNaval([coque('g0', 'pentecontere'), coque('n0', 'nef')], 3)
    useGame.getState().save()
    useGame.getState().init()
    const f = useGame.getState().flotte
    expect(coquesDe(f, 'pentecontere')).toHaveLength(1)
    expect(coquesDe(f, 'nef')).toHaveLength(1)
  })

  it('ne casse pas sur une sauvegarde d’avant la flotte', () => {
    // le champ absent : l'état doit se recomposer, pas exploser
    useGame.setState({ flotte: undefined as unknown as never, lastSeen: Date.now() })
    useGame.getState().tick()
    expect(useGame.getState().flotte).toBeDefined()
    expect(coquesDe(useGame.getState().flotte)).toHaveLength(0)
  })

  /*
   * ⚠️ LES HUIT HEURES D'ABSENCE - le piège du moteur qu'aucun autre test de ce
   * fichier n'atteint, et il en éprouve DEUX choses à la fois :
   *
   *  · la cale ne se multiplie pas. `OFFLINE_CAP_MS` vaut 8 h et le calendrier
   *    bondit de soixante journées : une échéance en millisecondes qui serait
   *    relue « par journée écoulée » livrerait soixante coques. Celle-ci est un
   *    instant, elle est échue une fois, et le premier battement du retour met UNE
   *    quille à l'eau ;
   *  · la coque que la colonne retenait est RENDUE. `expedition` n'est pas
   *    sauvegardée, la flotte l'est : sans la ligne de relâchement de la
   *    migration, le joueur qui quitte pendant un raid d'outre-mer reprend une
   *    partie dont les coques sont bloquées au large POUR TOUJOURS, sans un mot et
   *    sans aucun moyen de les rappeler.
   */
  it('ne livre la quille qu’une fois après huit heures dehors, et rend ce que la colonne retenait', () => {
    const il8h = Date.now() - 8 * 3_600_000
    regneNaval([coque('n0', 'nef', { par: PAR_COLONNE, ref: null })], 4)
    useGame.setState({
      flotte: {
        coques: [coque('n0', 'nef', { par: PAR_COLONNE, ref: null })],
        chantiers: [creerChantier('c1', 'nef', il8h)],
      },
      lastSeen: il8h,
    })
    useGame.getState().save()
    useGame.getState().init()
    // la migration a déjà rendu la nef que plus aucune expédition ne retient
    expect(nbLibres(useGame.getState().flotte, 'nef')).toBe(1)
    useGame.getState().tick()
    const f = useGame.getState().flotte
    expect(f.chantiers).toHaveLength(0)
    expect(coquesDe(f, 'nef')).toHaveLength(2)
    expect(nbLibres(f, 'nef')).toBe(2)
  })
})
