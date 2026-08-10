import { describe, expect, it } from 'vitest'
import { MULT_RISQUE_STATUT, RISQUE_MIN } from './commerce'
import { MAX_TROUPES } from './expeditions'
import {
  BUTIN_PAR_NEF,
  DESARME_RECUP,
  ESCORTE_MAX,
  FACTEUR_ESCORTE,
  NAVIRES,
  PAR_COLONNE,
  PAR_ESCORTE,
  PERTE_ECHEC,
  PERTE_HIVER,
  PERTE_MER,
  PLACES_PAR_NEF,
  TYPES_NAVIRE,
  calesMax,
  chantiersEchus,
  coquesComptees,
  coquesEmbarquees,
  coquesMax,
  couler,
  creerChantier,
  escortable,
  escorteMax,
  etatCoque,
  flotteVide,
  gainEscorte,
  motifPasEscortable,
  motifRefusChantier,
  naufrages,
  nbLibres,
  nefsRequises,
  partPerte,
  placeAuPort,
  recitEscorteCoulee,
  recitNaufrage,
  recuperationDesarmement,
  refusChantier,
  relacher,
  resumeFlotte,
  retenir,
  retenues,
  risqueEscorte,
  verdictTraversee,
  type Coque,
  type EtatFlotte,
  type RefusChantier,
  type TypeNavire,
} from './flotte'

/*
 * ═══════════════ CE QUE LA FLOTTE PROMET AU JOUEUR ═══════════════
 *
 * Trois promesses, et chacune peut se casser silencieusement :
 *
 *  · LE PORT PLAFONNE. Si les chantiers ne comptaient pas dans le plafond, on
 *    mettrait neuf coques en cale au petit quai et le plafond ne serait plus qu'un
 *    délai - l'arbitrage central du système disparaîtrait sans qu'une ligne casse.
 *  · L'ESCORTE SE VOIT AVANT. `Caravane.risque` est figé au départ parce qu'on l'a
 *    MONTRÉ au joueur : le risque escorté doit donc être calculable par le panneau
 *    avec la même fonction que celle du store, au chiffre près.
 *  · LA FLOTTE FOND. Une flotte qui ne se perd pas est un achat unique. Ces tests
 *    exigent des pertes sur les trois canaux, et exigent aussi qu'elles ne
 *    puissent JAMAIS atteindre la certitude.
 *
 * Et une promesse de NON-RÉGRESSION, qui compte autant : par mer ouverte, une
 * place d'outre-mer reste atteignable sans une seule coque. La flotte ajoute, elle
 * ne referme rien.
 */

function coque(id: string, type: TypeNavire, retenue: Coque['retenue'] = null): Coque {
  return { id, type, retenue }
}

/** une flotte montée à la main : autant de galères, autant de nefs, toutes libres */
function flotte(galeres: number, nefs: number): EtatFlotte {
  return {
    coques: [
      ...Array.from({ length: galeres }, (_, i) => coque(`g${i}`, 'pentecontere')),
      ...Array.from({ length: nefs }, (_, i) => coque(`n${i}`, 'nef')),
    ],
    chantiers: [],
  }
}

const SNAP = (f: EtatFlotte, port: number, merFermee = false) => ({ port, flotte: f, merFermee, now: 0 })

// ── Le port plafonne la flotte ───────────────────────────────────────────────

describe('le port décide de ce qu’on peut mouiller', () => {
  it('ne mouille rien sans port, deux coques au petit quai, neuf au port franc', () => {
    expect(coquesMax(0)).toBe(0)
    expect(coquesMax(1)).toBe(2)
    expect(coquesMax(4)).toBe(9)
  })

  it('laisse traverser une colonne pleine dès le quai de pierre, et pas avant', () => {
    // trois cales pour vingt hommes, plus la galère qui les couvre : quatre coques
    expect(nefsRequises(MAX_TROUPES) + 1).toBe(4)
    expect(coquesMax(1)).toBeLessThan(4)
    expect(coquesMax(2)).toBe(4)
  })

  it('compte les quilles en cale dans le plafond - sinon le plafond n’est qu’un délai', () => {
    const f = flotte(1, 0)
    f.chantiers.push(creerChantier('c1', 'nef', 0))
    expect(coquesComptees(f)).toBe(2)
    expect(placeAuPort(f, 1)).toBe(0)
    expect(refusChantier(SNAP(f, 1))).toBe('plafond')
  })

  it('refuse une seconde quille sur la cale unique du petit quai', () => {
    const f = flotte(0, 0)
    f.chantiers.push(creerChantier('c1', 'nef', 0))
    expect(calesMax(1)).toBe(1)
    expect(calesMax(4)).toBe(3)
    expect(refusChantier(SNAP(f, 1))).toBe('cales')
  })

  it('refuse la cale à qui n’a pas de port, et le dit', () => {
    expect(refusChantier(SNAP(flotteVide(), 0))).toBe('port')
  })

  it('dit toujours POURQUOI c’est refusé - un bouton éteint sans motif est proscrit', () => {
    const motifs: RefusChantier[] = ['port', 'plafond', 'cales']
    for (const r of motifs) {
      const txt = motifRefusChantier(r, 2)
      expect(txt.length).toBeGreaterThan(20)
      // les textes affichés portent l'apostrophe typographique, jamais la droite
      expect(txt).not.toContain("'")
    }
  })

  it('laisse la cale libre quand le port a de la place', () => {
    expect(refusChantier(SNAP(flotte(1, 1), 3))).toBeNull()
  })
})

describe('les deux navires ont deux métiers', () => {
  it('se paient tous les deux en bois et en bronze, et prennent du temps', () => {
    for (const t of TYPES_NAVIRE) {
      const def = NAVIRES[t]
      expect(def.cout.bois ?? 0).toBeGreaterThan(0)
      expect(def.cout.bronze ?? 0).toBeGreaterThan(0)
      expect(def.chantierMs).toBeGreaterThan(60_000)
      expect(def.effets.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('font de la galère la coque de guerre : plus chère en bronze, plus longue à monter', () => {
    expect(NAVIRES.pentecontere.cout.bronze!).toBeGreaterThan(NAVIRES.nef.cout.bronze! * 3)
    expect(NAVIRES.pentecontere.chantierMs).toBeGreaterThan(NAVIRES.nef.chantierMs)
  })

  it('rendent du bois au désarmement, et jamais un lingot', () => {
    const r = recuperationDesarmement('pentecontere')
    expect(r.bois).toBe(Math.round(NAVIRES.pentecontere.cout.bois! * DESARME_RECUP))
    expect(r.bronze).toBeUndefined()
  })

  it('livrent la quille quand son heure est passée, pas avant', () => {
    const f = flotteVide()
    f.chantiers.push(creerChantier('c1', 'nef', 1000))
    expect(chantiersEchus(f, 1000 + NAVIRES.nef.chantierMs - 1)).toHaveLength(0)
    expect(chantiersEchus(f, 1000 + NAVIRES.nef.chantierMs)).toHaveLength(1)
  })
})

// ── L'escorte ────────────────────────────────────────────────────────────────

describe('une galère d’escorte change le risque du convoi', () => {
  it('vaut un peu mieux qu’une amitié, et deux galères valent une alliance', () => {
    // le barème est calé sur MULT_RISQUE_STATUT : c'est la même échelle, exprès
    expect(FACTEUR_ESCORTE).toBeLessThan(MULT_RISQUE_STATUT.ami)
    expect(FACTEUR_ESCORTE).toBeGreaterThan(MULT_RISQUE_STATUT.allie)
    const deux = Math.pow(FACTEUR_ESCORTE, 2)
    expect(deux).toBeGreaterThan(MULT_RISQUE_STATUT.marie)
    expect(Math.abs(deux - MULT_RISQUE_STATUT.allie)).toBeLessThan(0.05)
  })

  it('fait tomber un tiers de risque de la route de Ténédos avec une seule galère', () => {
    const nu = 0.325
    expect(risqueEscorte(nu, 1)).toBeCloseTo(0.2015, 4)
    expect(risqueEscorte(nu, 2)).toBeCloseTo(0.1249, 4)
    expect(gainEscorte(nu, 2)).toBeCloseTo(0.2001, 4)
  })

  it('ne change rien sans galère - la route nue reste la route nue', () => {
    expect(risqueEscorte(0.325, 0)).toBe(0.325)
    expect(gainEscorte(0.325, 0)).toBe(0)
  })

  it('ne descend jamais sous le plancher de risque du commerce : la mer n’est jamais sûre', () => {
    expect(risqueEscorte(RISQUE_MIN, 2)).toBe(RISQUE_MIN)
    expect(risqueEscorte(0.03, 2)).toBe(RISQUE_MIN)
  })

  it('plafonne à deux galères : une troisième ne rachète rien', () => {
    expect(risqueEscorte(0.5, 5)).toBeCloseTo(risqueEscorte(0.5, ESCORTE_MAX), 10)
  })

  it('n’escorte que ce qu’on atteint par l’eau, et dit pourquoi ailleurs', () => {
    expect(escortable('citadelle-tenedos')).toBe(true) // île
    expect(escortable('cite-lesbos')).toBe(true) // île
    expect(escortable('comptoir-phenicien')).toBe(true) // grève
    expect(escortable('fort-acheen')).toBe(true) // grève
    expect(escortable('forteresse-mysienne')).toBe(false) // colline
    expect(escortable('camp-pillards')).toBe(false) // plaine
    expect(motifPasEscortable('forteresse-mysienne')).toContain('Forteresse mysienne')
  })

  it('n’offre que les galères réellement au mouillage', () => {
    const f = flotte(3, 0)
    expect(escorteMax(f, 'citadelle-tenedos')).toBe(ESCORTE_MAX)
    // deux galères déjà parties : il n'en reste qu'une à engager
    const pris = { coques: retenir(f.coques, ['g0', 'g1'], { par: PAR_ESCORTE, ref: 'car1' }), chantiers: [] }
    expect(escorteMax(pris, 'citadelle-tenedos')).toBe(1)
    expect(escorteMax(pris, 'forteresse-mysienne')).toBe(0)
  })

  it('n’escorte rien avec des nefs de charge - elles ne se battent pas', () => {
    expect(escorteMax(flotte(0, 4), 'citadelle-tenedos')).toBe(0)
  })
})

// ── La traversée ─────────────────────────────────────────────────────────────

describe('la traversée d’outre-mer', () => {
  it('n’exige RIEN par mer ouverte : Lesbos reste atteignable sans une seule coque', () => {
    const t = verdictTraversee(SNAP(flotteVide(), 0, false), 'cite-lesbos', 12)
    expect(t.passage).toBe('saison')
    expect(t.possible).toBe(true)
    expect(t.nefs).toBe(0)
    expect(t.butinPct).toBe(0)
    expect(t.risque).toBe(0)
  })

  it('ne demande aucune coque pour une place de terre ferme', () => {
    const t = verdictTraversee(SNAP(flotte(2, 3), 3, true), 'forteresse-mysienne', 20)
    expect(t.passage).toBe('terre')
    expect(t.possible).toBe(true)
    expect(t.requises).toBe(0)
  })

  it('demande une cale par huit hommes, trois pour une colonne pleine', () => {
    expect(nefsRequises(1)).toBe(1)
    expect(nefsRequises(PLACES_PAR_NEF)).toBe(1)
    expect(nefsRequises(PLACES_PAR_NEF + 1)).toBe(2)
    expect(nefsRequises(MAX_TROUPES)).toBe(3)
    // et jamais davantage, même si l'appelant demande l'impossible
    expect(nefsRequises(999)).toBe(3)
  })

  it('force le détroit en hiver avec trois cales et une galère', () => {
    const t = verdictTraversee(SNAP(flotte(1, 3), 3, true), 'citadelle-tenedos', 20)
    expect(t.passage).toBe('flotte')
    expect(t.possible).toBe(true)
    expect(t.nefs).toBe(3)
    expect(t.galeres).toBe(1)
    expect(t.risque).toBeCloseTo(partPerte({ hiver: true }), 10)
  })

  it('se referme s’il manque une cale, et dit laquelle', () => {
    const t = verdictTraversee(SNAP(flotte(1, 2), 3, true), 'citadelle-tenedos', 20)
    expect(t.possible).toBe(false)
    expect(t.passage).toBe('manque')
    expect(t.motif).toContain('1 nef')
  })

  it('se referme sans galère pour ouvrir la route - les cales ne se défendent pas', () => {
    const t = verdictTraversee(SNAP(flotte(0, 3), 3, true), 'citadelle-tenedos', 20)
    expect(t.possible).toBe(false)
    expect(t.motif).toContain('pentécontère')
  })

  it('ne compte pas les coques déjà en mer pour la traversée', () => {
    const f = flotte(1, 3)
    f.coques = retenir(f.coques, ['n0'], { par: PAR_ESCORTE, ref: 'car1' })
    expect(verdictTraversee(SNAP(f, 3, true), 'citadelle-tenedos', 20).possible).toBe(false)
    // une colonne plus petite, elle, passe encore
    expect(verdictTraversee(SNAP(f, 3, true), 'citadelle-tenedos', 16).possible).toBe(true)
  })

  it('rapporte un dixième de butin par cale, trente pour cent au plus', () => {
    const t = verdictTraversee(SNAP(flotte(1, 3), 3, false), 'cite-lesbos', 20)
    expect(t.nefs).toBe(3)
    expect(t.butinPct).toBeCloseTo(3 * BUTIN_PAR_NEF, 10)
    // une petite colonne n'embarque pas trois cales pour rien
    expect(verdictTraversee(SNAP(flotte(1, 3), 3, false), 'cite-lesbos', 6).butinPct).toBeCloseTo(BUTIN_PAR_NEF, 10)
  })

  it('embarque les cales qu’on a, même quand il en manque, par mer ouverte', () => {
    // une seule nef pour vingt hommes : la mer d'été ne l'exige pas, mais le
    // dixième de butin est acquis pour la cale qu'on a réellement emportée
    const t = verdictTraversee(SNAP(flotte(0, 1), 3, false), 'cite-lesbos', 20)
    expect(t.possible).toBe(true)
    expect(t.requises).toBe(3)
    expect(t.nefs).toBe(1)
    expect(t.butinPct).toBeCloseTo(BUTIN_PAR_NEF, 10)
  })

  it('parle d’UNE cale et jamais de zéro : l’écran de préparation s’ouvre sans un homme', () => {
    /*
     * L'écran de préparation d'expédition s'ouvre à zéro homme sélectionné et
     * interroge la mer aussitôt. Sans plancher, le joueur lisait « forcer le
     * détroit demande 0 cale » au-dessus du bouton d'assaut.
     */
    expect(verdictTraversee(SNAP(flotte(1, 3), 3, true), 'citadelle-tenedos', 0).requises).toBe(1)
    expect(verdictTraversee(SNAP(flotteVide(), 3, true), 'citadelle-tenedos', 0).motif).toContain('1 cale')
    expect(verdictTraversee(SNAP(flotte(1, 3), 3, false), 'cite-lesbos', 0).requises).toBe(1)
    // et une place de terre ferme n'en demande toujours aucune
    expect(verdictTraversee(SNAP(flotte(1, 3), 3, true), 'forteresse-mysienne', 0).requises).toBe(0)
  })

  it('embarque les cales d’abord, la galère ensuite - et rien si le passage est refusé', () => {
    const f = flotte(2, 3)
    const t = verdictTraversee(SNAP(f, 3, true), 'citadelle-tenedos', 20)
    const embarquees = coquesEmbarquees(f, t)
    expect(embarquees.map((c) => c.type)).toEqual(['nef', 'nef', 'nef', 'pentecontere'])
    const refuse = verdictTraversee(SNAP(flotte(0, 1), 3, true), 'citadelle-tenedos', 20)
    expect(coquesEmbarquees(flotte(0, 1), refuse)).toHaveLength(0)
  })
})

// ── Ce que la mer prend ──────────────────────────────────────────────────────

describe('la flotte fond - sinon elle serait un achat unique', () => {
  it('prend son dû même après un triomphe', () => {
    expect(partPerte({})).toBeCloseTo(PERTE_MER, 10)
    expect(partPerte({})).toBeGreaterThan(0)
  })

  it('laisse près d’une coque sur deux au fond après un raid d’hiver manqué', () => {
    const pire = partPerte({ echec: true, hiver: true })
    expect(pire).toBeCloseTo(1 - (1 - PERTE_MER) * (1 - PERTE_ECHEC) * (1 - PERTE_HIVER), 10)
    expect(pire).toBeGreaterThan(0.4)
    expect(pire).toBeLessThan(0.5)
  })

  it('n’atteint JAMAIS la certitude, quoi qu’on cumule', () => {
    for (const c of [{}, { echec: true }, { hiver: true }, { echec: true, hiver: true }]) {
      expect(partPerte(c)).toBeLessThan(1)
    }
  })

  it('coule exactement les coques dont le tirage est sous le seuil', () => {
    const cs = [coque('a', 'nef'), coque('b', 'nef'), coque('c', 'pentecontere')]
    expect(naufrages(cs, 0.3, [0.1, 0.9, 0.29])).toEqual(['a', 'c'])
    // un tirage manquant ne coule rien : on ne perd pas une coque faute de hasard
    expect(naufrages(cs, 0.3, [])).toEqual([])
    expect(naufrages(cs, 0, [0, 0, 0])).toEqual([])
  })

  /*
   * LE RÉCIT EST LA SEULE CHOSE QUE LE JOUEUR VERRA du naufrage. Il n'y a ni
   * animation ni jauge : si la chronique reste muette, ou si les quatre
   * circonstances racontent la même phrase, la flotte fond sans qu'on sache
   * POURQUOI - et une flotte qui fond sans raison lisible passe pour un bogue.
   */
  it('raconte le naufrage, et pas la même phrase pour les quatre malheurs', () => {
    const coulees = [coque('a', 'nef'), coque('b', 'pentecontere')]
    const dits = [{}, { echec: true }, { hiver: true }, { echec: true, hiver: true }].map(
      (c) => recitNaufrage(coulees, c)[0],
    )
    expect(new Set(dits).size).toBe(4)
    for (const d of dits) {
      expect(d.length).toBeGreaterThan(30)
      // les textes affichés portent l'apostrophe typographique, jamais la droite
      expect(d).not.toContain("'")
      // et ils nomment les coques perdues, sinon on ne sait pas ce qu'on a perdu
      expect(d).toContain('nef de charge')
      expect(d).toContain('pentécontère')
    }
    // rien à raconter quand rien n'a coulé : jamais une ligne vide dans la chronique
    expect(recitNaufrage([], { echec: true })).toEqual([])
  })

  it('raconte l’escorte qui s’est mise en travers, au singulier comme au pluriel', () => {
    const une = recitEscorteCoulee([coque('g0', 'pentecontere')])
    const deux = recitEscorteCoulee([coque('g0', 'pentecontere'), coque('g1', 'pentecontere')])
    expect(une[0]).not.toBe(deux[0])
    for (const r of [une[0], deux[0]]) expect(r).not.toContain("'")
    expect(recitEscorteCoulee([])).toEqual([])
  })

  it('dit l’état d’une coque et le refus du chantier sans une apostrophe droite', () => {
    // le français affiché est une règle du dépôt, et ces textes sortent d'ici
    for (const txt of [
      etatCoque(coque('a', 'nef')),
      etatCoque(coque('a', 'nef', { par: PAR_ESCORTE, ref: 'c' })),
      etatCoque(coque('a', 'nef', { par: PAR_COLONNE, ref: null })),
      motifPasEscortable('forteresse-mysienne'),
      resumeFlotte(flotteVide()),
    ]) {
      expect(txt).not.toContain("'")
      expect(txt.length).toBeGreaterThan(5)
    }
  })

  it('retire la coque perdue de la flotte et laisse les autres intactes', () => {
    const f = flotte(1, 2)
    const restant = couler(f.coques, ['n0'])
    expect(restant).toHaveLength(2)
    expect(restant.map((c) => c.id)).toEqual(['g0', 'n1'])
  })
})

// ── Les retenues, et les deux systèmes qui viendront ─────────────────────────

describe('combien de coques sont LIBRES - la seule question qui vaille', () => {
  it('ne compte pas comme libre une coque partie escorter un convoi', () => {
    const f = flotte(2, 0)
    f.coques = retenir(f.coques, ['g0'], { par: PAR_ESCORTE, ref: 'car1' })
    expect(nbLibres(f, 'pentecontere')).toBe(1)
    expect(retenues(f, PAR_ESCORTE, 'car1')).toHaveLength(1)
    expect(retenues(f, PAR_ESCORTE, 'car2')).toHaveLength(0)
  })

  it('rend les coques d’un motif sans toucher à celles des autres', () => {
    const f = flotte(1, 2)
    f.coques = retenir(f.coques, ['g0'], { par: PAR_ESCORTE, ref: 'car1' })
    f.coques = retenir(f.coques, ['n0', 'n1'], { par: PAR_COLONNE, ref: null })
    f.coques = relacher(f.coques, PAR_ESCORTE, 'car1')
    expect(nbLibres(f, 'pentecontere')).toBe(1)
    expect(retenues(f, PAR_COLONNE)).toHaveLength(2)
  })

  it('rend TOUT un motif quand on ne précise pas l’objet - le rattrapage d’une retenue orpheline', () => {
    const f = flotte(1, 2)
    f.coques = retenir(f.coques, ['g0', 'n0'], { par: PAR_COLONNE, ref: null })
    f.coques = relacher(f.coques, PAR_COLONNE)
    expect(nbLibres(f)).toBe(3)
  })

  it('ne rend pas une coque qu’un système inconnu retiendra demain', () => {
    const f = flotte(2, 0)
    f.coques = retenir(f.coques, ['g0'], { par: 'blocus', ref: 'tenedos' })
    f.coques = relacher(f.coques, PAR_ESCORTE)
    expect(nbLibres(f, 'pentecontere')).toBe(1)
    expect(retenues(f, 'blocus')).toHaveLength(1)
    expect(etatCoque(f.coques[0])).toContain('blocus')
  })

  it('dit l’état de chaque coque en français, toujours', () => {
    expect(etatCoque(coque('a', 'nef'))).toBe('au mouillage')
    expect(etatCoque(coque('a', 'nef', { par: PAR_ESCORTE, ref: 'c' }))).toContain('escorte')
    expect(etatCoque(coque('a', 'nef', { par: PAR_COLONNE, ref: null }))).toContain('colonne')
  })

  it('résume la flotte pour la carte du port', () => {
    expect(resumeFlotte(flotteVide())).toContain('aucune')
    const f = flotte(1, 1)
    expect(resumeFlotte(f)).toBe('2 coques')
    f.coques = retenir(f.coques, ['g0'], { par: PAR_ESCORTE, ref: 'car1' })
    expect(resumeFlotte(f)).toBe('2 coques, 1 en mer')
  })

  it('ne partage jamais deux flottes neuves - une partie ne récupère pas les coques de la précédente', () => {
    const a = flotteVide()
    const b = flotteVide()
    a.coques.push(coque('g0', 'pentecontere'))
    expect(b.coques).toHaveLength(0)
  })

  it('survit à une flotte absente : une sauvegarde d’avant la flotte n’en a pas', () => {
    expect(nbLibres(undefined)).toBe(0)
    expect(coquesComptees(null)).toBe(0)
    expect(placeAuPort(undefined, 3)).toBe(coquesMax(3))
    expect(escorteMax(undefined, 'citadelle-tenedos')).toBe(0)
    expect(verdictTraversee(SNAP(flotteVide(), 0, true), 'cite-lesbos', 10).possible).toBe(false)
  })
})
