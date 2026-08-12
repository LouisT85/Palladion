import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DAY_MS, OFFLINE_CAP_MS, STOCKAGE, WALL_HP } from './data'
import { poserAlea } from './defi'
import {
  CARTES_MAX,
  DUEL_VIDE,
  FRAPPEES_MAX,
  PART_BUTIN,
  PLAFOND_BUTIN_PAR_RES,
  butinOffert,
  carteValide,
  creerRaid,
  deroulerRaid,
  duelApresEmission,
  duelApresRaid,
  duelApresRapport,
  duelApresRevanche,
  emettreCarte,
  empreinteCarte,
  graineRaid,
  hommesDe,
  honneurAttaque,
  plafondButin,
  refusRaid,
  refusRapport,
  resumeButin,
  type CarteDefense,
  type EtatDuel,
  type RapportRaid,
  type SnapDuel,
} from './duel'
import { resumePlan, type PanId } from './plandefense'
import { jourDe, murMax, snapCarteDuel, snapDuel, useGame, type GameState } from './store'
import type { ResourceId, UnitId } from './types'

/*
 * ═══════════ LE DUEL, PAR LE STORE ═══════════
 *
 * `duel.test.ts` éprouve les RÈGLES sur des instantanés écrits à la main. Ce
 * fichier-ci pose la question inverse, et c'est la seule qu'un instantané ne peut
 * pas poser : LA CARTE QU'UN VRAI RÈGNE PUBLIE DIT-ELLE LA VÉRITÉ SUR CE RÈGNE ?
 *
 * Quatre coutures, et ce sont celles où un système de ce jeu se casse d'habitude :
 *
 *  1. L'ENCEINTE N'EST PAS `WALL_HP[niveau]`. Six sources la majorent - Hector, les
 *     grâces, les reliques exposées, les technologies, la merveille, le chef - et
 *     elles s'additionnent dans UNE parenthèse (piège 5). Une carte qui publierait
 *     `WALL_HP[2]` là où `murMax(s)` vaut le double promettrait à l'attaquant une
 *     place bien plus tendre que celle que le défenseur croit tenir.
 *  2. `clampRes` BORNE TOUTE RECETTE À `STOCKAGE[agora]`. Le butin d'une carte est
 *     une part des coffres : il faut prouver qu'il reste sous le plafond même quand
 *     le tick de vitest remplit tout à ras bord à chaque battement.
 *  3. LE BLOC DE VITESSE recule à la main toute échéance en millisecondes (piège 2).
 *     `EtatDuel` n'en porte AUCUNE - un cas structurel le vérifie ici, parce que
 *     c'est le genre de champ qu'on ajoute six mois plus tard sans y penser.
 *  4. LE RATTRAPAGE HORS LIGNE avance le calendrier de soixante journées (piège 4).
 *     Rien du duel ne doit se résoudre pendant ce saut : ni une vengeance qui
 *     expire, ni un rapport qui s'applique tout seul.
 *
 * ⚠️ CE FICHIER ÉPROUVE LE CÂBLAGE LUI-MÊME, IL NE LE PARAPHRASE PLUS.
 * Un premier jet recopiait ici, sous le nom `snapDuRegne`, l'instantané que le store
 * devait composer - « et si le store en composait un autre, ce fichier rougirait ».
 * C'était faux, et c'est le genre de faux qui coûte cher : une COPIE ne détecte
 * jamais une divergence, elle la double. On importe donc `snapCarteDuel` et
 * `snapDuel` du store, et les quatre actions avec eux. Le fichier ne compile donc
 * qu'une fois les branchements posés - c'est voulu : un test de câblage qui passe
 * sans câblage ne prouve rien.
 *
 * ⚠️ `MODE_TEST` rend `payer()` et `peutPayer()` toujours vrais : le prix d'un raid
 * (`COUT_RAID`) ne peut donc PAS être éprouvé ici, et aucun cas de ce fichier ne
 * compare les coffres avant/après un PAIEMENT. Il l'est dans `duel.test.ts`, par
 * `refusRaid`, qui juge le grain lui-même. Ce qui se mesure ici, en revanche, ce sont
 * les CRÉDITS et les PRÉLÈVEMENTS - `clampRes` les borne pour de vrai, en test comme
 * en jeu.
 */

/** l'instantané du juge, avec un `EtatDuel` posé à la main - le reste vient du store */
function snapDuelDuRegne(s: GameState, duel: EtatDuel): SnapDuel {
  return { ...snapDuel(s), duel }
}

// ── Un règne prêt à dueller ──────────────────────────────────────────────────

/**
 * Un règne bâti, armé, et dont l'AGORA est au niveau 4.
 *
 * ⚠️ L'agora n'est pas là pour le décor : `clampRes` borne toute recette à
 * `STOCKAGE[agora.level]` - 350 au niveau 1. Un `setState` qui pose 2000 mesures de
 * grain sur une agora de niveau 1 y échappe, mais le PREMIER crédit du tick les
 * ramène au plafond, et un test qui lit les coffres après un battement les trouve
 * effondrés. Tout helper qui enrichit un règne doit donc monter l'agora en même
 * temps. C'est le piège qui a coûté des cas à deux fichiers avant celui-ci.
 */
function regneDuelliste(champs: Partial<GameState> = {}): void {
  useGame.getState().reset()
  const now = Date.now()
  const s = useGame.getState()
  const createdAt = now - 12 * DAY_MS
  useGame.setState({
    createdAt,
    lastSeen: now,
    mode: 'bac-a-sable',
    tutorialDone: true,
    resources: { bois: 2000, pierre: 2000, grain: 2000, bronze: 1200 },
    buildings: {
      ...s.buildings,
      agora: { level: 4 },
      remparts: { level: 3 },
      caserne: { level: 3 },
      maisons: { level: 3 },
      redoute: { level: 1 },
    },
    tours: 2,
    army: { lancier: 8, archer: 5, hoplite: 6, frondeur: 3, peltaste: 2, belier: 2, char: 1 },
    planDefense: { ligne: 'mur', tir: 'cloche', pans: { hoplite: 'nord', archer: 'porte' }, heros: {} },
    defenses: { acropole: 1, bastion: true, galeries: false, poterne: true, citerne: false },
    // rien ne doit venir troubler l'observation
    nextAttackAt: now + 60 * 60_000,
    prochainAppelAt: now + 60 * 60_000,
    lastEventAt: now,
    ...champs,
  })
}

beforeEach(() => {
  useGame.getState().reset()
})

afterEach(() => {
  // `poserAlea` est un singleton de module : un déroulé interrompu laisserait le
  // jeu entier sur une graine figée, et `refusRaid` refuserait tout pour « defi »
  poserAlea(null)
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('la carte qu’un règne publie dit la vérité sur ce règne', () => {
  it('l’enceinte publiée est `murMax`, jamais `WALL_HP[niveau]` - six systèmes la majorent', () => {
    /*
     * ⚠️ LA COUTURE 1, et le défaut concret qu'elle évite : Hector épaissit le mur de
     * 20 %, une grâce de Poséidon davantage, le prudent encore. Publier `WALL_HP[3]`
     * au lieu de `murMax(s)` aurait promis une place bien plus tendre que celle que
     * le défenseur croit tenir - et le jour où il aurait rejoué le rapport, il aurait
     * obtenu une AUTRE issue et refusé un rapport parfaitement honnête.
     */
    regneDuelliste()
    const s = useGame.getState()
    const c = emettreCarte(snapCarteDuel(s), 0)
    expect(c.murHp).toBe(murMax(s))
    expect(c.mur).toBe(3)
    // et avec Hector au mur, l'enceinte publiée dépasse la table nue
    regneDuelliste({
      heros: {
        ...useGame.getState().heros,
        hector: { ...useGame.getState().heros.hector, recrute: true, niveau: 3, mort: false },
      } as GameState['heros'],
    })
    const avecHector = useGame.getState()
    const c2 = emettreCarte(snapCarteDuel(avecHector), 0)
    expect(c2.murHp).toBe(murMax(avecHector))
    expect(c2.murHp).toBeGreaterThan(WALL_HP[3])
  })

  it('la garnison publiée est l’armée du village, moins le bélier qui ne défend pas', () => {
    regneDuelliste()
    const s = useGame.getState()
    const c = emettreCarte(snapCarteDuel(s), 0)
    for (const u of ['lancier', 'archer', 'hoplite', 'frondeur', 'peltaste', 'char'] as UnitId[]) {
      expect(c.garnison[u]).toBe(s.army[u])
    }
    // `creerBataille` ne met JAMAIS de bélier parmi les défenseurs : le publier
    // aurait gonflé la puissance affichée d'hommes qui ne se battent pas
    expect(c.garnison.belier).toBeUndefined()
    expect(hommesDe(c.garnison)).toBe(
      s.army.lancier + s.army.archer + s.army.hoplite + s.army.frondeur + s.army.peltaste + s.army.char,
    )
  })

  it('LE PLAN VOYAGE INTACT : c’est lui qu’on vient affronter', () => {
    regneDuelliste()
    const s = useGame.getState()
    const c = emettreCarte(snapCarteDuel(s), 0)
    // le même résumé des deux côtés du courrier - posture, tir, pans tenus
    expect(resumePlan(c.plan)).toBe(resumePlan(s.planDefense))
    expect(c.plan.pans.hoplite).toBe('nord')
    expect(c.plan.pans.archer).toBe('porte')
  })

  it('les ouvrages de l’intérieur et les tours voyagent aussi - ils se battent', () => {
    regneDuelliste()
    const c = emettreCarte(snapCarteDuel(useGame.getState()), 0)
    expect(c.interieur).toEqual({ acropole: 1, bastion: true, galeries: false, poterne: true, citerne: false })
    expect(c.tours).toBe(2)
    expect(c.redoute).toBe(1)
  })

  it('ET AUCUN SECRET N’EN SORT : ce n’est pas une sauvegarde, c’est une cible', () => {
    /*
     * La promesse la plus facile à casser du lot : il suffirait qu'un jour on ajoute
     * `resources` à la carte « pour afficher le butin exact ». Le code d'une carte se
     * donne à des inconnus ; il ne doit contenir ni coffres, ni faveur, ni habitants,
     * ni technologies, ni relations aux dieux.
     */
    regneDuelliste()
    const c = emettreCarte(snapCarteDuel(useGame.getState()), 0)
    expect(Object.keys(c).sort()).toEqual(
      [
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
        'reduc',
        'redoute',
        'serie',
        'tours',
      ].sort(),
    )
    const brut = JSON.stringify(c)
    for (const mot of ['faveur', 'villageois', 'relation', 'techno', 'reliques', 'lignee']) {
      expect(brut).not.toContain(mot)
    }
    // et pas un nom d'habitant du village n'y figure
    for (const v of useGame.getState().villageois) expect(brut).not.toContain(v.nom)
  })

  it('les héros publiés sont ceux qui tiennent vraiment les murs, pas ceux qu’on rêve d’avoir', () => {
    regneDuelliste()
    // aucun héros recruté : la carte n'en promet aucun
    expect(emettreCarte(snapCarteDuel(useGame.getState()), 0).heros).toHaveLength(0)
    const s = useGame.getState()
    useGame.setState({
      heros: {
        ...s.heros,
        ajax: { ...s.heros.ajax, recrute: true, niveau: 2, mort: false },
        achille: { ...s.heros.achille, recrute: true, niveau: 4, mort: true },
      } as GameState['heros'],
    })
    const c = emettreCarte(snapCarteDuel(useGame.getState()), 0)
    expect(c.heros).toEqual([{ id: 'ajax', niveau: 2 }])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('le butin d’une carte reste sous le plafond de l’agora, battement après battement', () => {
  it('⚠️ `clampRes` : le tick de vitest remplit les coffres à ras bord, et la mise ne dérape pas', () => {
    /*
     * Sous vitest, le tick repose `s.resources[r] = stockageMax(s)` à CHAQUE
     * battement. C'est l'environnement le plus dur pour ce système : la carte se
     * publie donc toujours sur des coffres pleins, et il faut que ce cas-là - le pire
     * - reste borné. Sans le plafond absolu, une agora de marbre aurait mis
     * trois cent trente-six mesures par ressource en jeu, et une agora future
     * davantage encore.
     */
    regneDuelliste()
    for (let i = 0; i < 3; i++) useGame.getState().tick()
    const s = useGame.getState()
    const c = emettreCarte(snapCarteDuel(s), 0)
    for (const r of ['bois', 'pierre', 'grain', 'bronze'] as ResourceId[]) {
      expect(s.resources[r]).toBe(STOCKAGE[4])
      expect(c.butin[r]).toBe(plafondButin(4))
      expect(c.butin[r]).toBeLessThanOrEqual(PLAFOND_BUTIN_PAR_RES)
    }
  })

  it('un règne à l’agora de terre ne met en jeu que ce qu’il a', () => {
    // même mesure, agora 1 : le plafond ne mord pas, la PART décide
    regneDuelliste({ buildings: { ...useGame.getState().buildings, agora: { level: 1 } } })
    for (let i = 0; i < 3; i++) useGame.getState().tick()
    const c = emettreCarte(snapCarteDuel(useGame.getState()), 0)
    expect(c.butin.grain).toBe(Math.floor(STOCKAGE[1] * PART_BUTIN))
    expect(c.butin.grain).toBeLessThan(PLAFOND_BUTIN_PAR_RES)
  })

  it('et la mise ne dépend jamais des coffres du MOMENT DU RAID', () => {
    // la carte est émise pauvre, le règne s'enrichit ensuite : la mise ne bouge pas
    regneDuelliste({ resources: { bois: 100, pierre: 100, grain: 100, bronze: 100 } })
    const c = emettreCarte(snapCarteDuel(useGame.getState()), 0)
    for (let i = 0; i < 3; i++) useGame.getState().tick()
    expect(useGame.getState().resources.grain).toBe(STOCKAGE[4])
    expect(c.butin.grain).toBe(Math.floor(100 * PART_BUTIN))
    expect(butinOffert(useGame.getState().resources).grain).toBeGreaterThan(c.butin.grain ?? 0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('le moteur du jeu accepte une bataille montée depuis un vrai règne', () => {
  it('un raid contre une carte de vrai règne se déroule et rend un verdict', () => {
    regneDuelliste()
    const c = emettreCarte(snapCarteDuel(useGame.getState()), 0)
    const colonne: Partial<Record<UnitId, number>> = { hoplite: 8, lancier: 6, archer: 4, belier: 2 }
    const pans = ['porte', 'nord']
    const g = graineRaid(empreinteCarte(c), colonne, pans)
    const issue = deroulerRaid(c, colonne, pans, g)
    expect(issue).not.toBeNull()
    expect(issue!.envoyes).toBe(20)
    expect(issue!.morts).toBeLessThanOrEqual(20)
  })

  it('la bataille sert le plan de la CARTE, et la garnison y est bien du camp qui défend', () => {
    regneDuelliste()
    const c = emettreCarte(snapCarteDuel(useGame.getState()), 0)
    const b = creerRaid(c, { hoplite: 10, lancier: 6 }, ['porte', 'sud'])
    expect(b.ordres?.ligne).toBe('mur')
    expect(b.ordres?.tir).toBe('cloche')
    expect(b.campJoueur).toBe('defense')
    expect(b.fighters.filter((f) => f.camp === 'defense').length).toBeGreaterThan(0)
    expect(b.fighters.filter((f) => f.camp === 'attaque').length).toBe(16)
  })

  it('DEUX MACHINES, LE MÊME VERDICT : la carte encodée puis relue donne le même combat', () => {
    /*
     * Le tour complet du courrier, en une seule fonction : la carte est
     * DÉSINFECTÉE une seconde fois (comme le fera le décodeur chez l'adversaire),
     * et l'assaut doit rendre exactement la même issue. Sans cela, l'anti-triche
     * refuserait des rapports honnêtes - le pire défaut possible pour ce système,
     * parce qu'il ne se voit qu'entre deux joueurs et jamais en test unitaire.
     */
    regneDuelliste()
    const emise = emettreCarte(snapCarteDuel(useGame.getState()), 0)
    const relue = carteValide(JSON.parse(JSON.stringify(emise)))
    expect(empreinteCarte(relue)).toBe(empreinteCarte(emise))
    const colonne: Partial<Record<UnitId, number>> = { hoplite: 7, lancier: 7, archer: 4, belier: 2 }
    const pans = ['porte', 'nord']
    const g = graineRaid(empreinteCarte(emise), colonne, pans)
    expect(deroulerRaid(relue, colonne, pans, g)).toEqual(deroulerRaid(emise, colonne, pans, g))
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('ce que le règne courant refuse, et il le refuse pour de vraies raisons', () => {
  it('une colonne dehors interdit d’en faire partir une seconde', () => {
    regneDuelliste()
    useGame.getState().lancerExpedition('camp-pillards', {
      lancier: 4,
      archer: 0,
      hoplite: 2,
      frondeur: 0,
      peltaste: 0,
      belier: 0,
      char: 0,
    })
    const s = useGame.getState()
    expect(s.expedition).not.toBeNull()
    const c = carteValide({ ...emettreCarte(snapCarteDuel(s), 0), cite: 'Autre cité' })
    expect(refusRaid(snapDuelDuRegne(s, DUEL_VIDE), c, { hoplite: 2 }, ['porte'])).toBe('colonneDehors')
  })

  it('un village assiégé ne fait sortir personne', () => {
    regneDuelliste({ mode: 'siege' })
    const s = useGame.getState()
    const c = carteValide({ ...emettreCarte(snapCarteDuel(s), 0), cite: 'Autre cité' })
    expect(refusRaid(snapDuelDuRegne(s, DUEL_VIDE), c, { hoplite: 2 }, ['porte'])).toBe('assiege')
  })

  it('on ne fait pas marcher plus d’hommes que le village n’en a sous les armes', () => {
    regneDuelliste()
    const s = useGame.getState()
    const c = carteValide({ ...emettreCarte(snapCarteDuel(s), 0), cite: 'Autre cité' })
    const snap = snapDuelDuRegne(s, DUEL_VIDE)
    expect(refusRaid(snap, c, { hoplite: s.army.hoplite + 1 }, ['porte'])).toBe('effectifs')
    expect(refusRaid(snap, c, { hoplite: s.army.hoplite }, ['porte'])).toBeNull()
  })

  it('et l’on ne raide jamais sa PROPRE carte, même après un rechargement', () => {
    regneDuelliste()
    const s = useGame.getState()
    const c = emettreCarte(snapCarteDuel(s), 0)
    const etat = duelApresEmission(DUEL_VIDE, c)
    // le tour de passe-passe le plus évident : se renvoyer son propre code pour se
    // faire un nom sur une garnison qu'on connaît par cœur
    expect(refusRaid(snapDuelDuRegne(s, etat), c, { hoplite: 4 }, ['porte'])).toBe('soi')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('les deux pièges du moteur, et pourquoi le duel n’y tombe pas', () => {
  it('⚠️ PIÈGE 2 : `EtatDuel` ne porte AUCUNE échéance en millisecondes', () => {
    /*
     * Le bloc de vitesse du tick recule toutes les échéances de
     * `dtMs * (vitesse - 1)`, À LA MAIN, champ par champ. Toute échéance en
     * millisecondes ajoutée à l'état devrait donc y être listée, et celle qu'on
     * oublie dure huit fois trop longtemps à ×8. Ce cas est STRUCTUREL : il tombe le
     * jour où quelqu'un ajoute un `prochainRaidAt` sans lire cette note.
     */
    for (const cle of Object.keys(DUEL_VIDE)) {
      expect(cle).not.toMatch(/At$|Ms$|Jusqua$/)
    }
    // `dernierRaid` est un NUMÉRO DE JOURNÉE, sur l'horloge de `jourDe`
    regneDuelliste()
    const jour = jourDe(useGame.getState())
    const etat = duelApresRaid(DUEL_VIDE, carteValide({ mur: 1, murHp: 250, garnison: { lancier: 2 } }), jour)
    expect(etat.dernierRaid).toBe(jour)
    expect(etat.dernierRaid).toBeLessThan(1000)
  })

  it('⚠️ PIÈGE 2 : le délai d’un raid court avec les journées, sans qu’on recule rien', () => {
    /*
     * Le bloc de vitesse recule `createdAt`, donc `jourDe` avance huit fois plus vite
     * à ×8. Un délai compté en JOURNÉES s'accélère donc tout seul, ce qui est
     * exactement ce qu'on veut d'un jeu à vitesse variable - et ce qu'un `prochainAt`
     * en millisecondes n'aurait pas fait sans une ligne de plus dans le tick.
     */
    regneDuelliste()
    const s0 = useGame.getState()
    const etat = duelApresRaid(DUEL_VIDE, carteValide({ mur: 1, murHp: 250, garnison: { lancier: 2 } }), jourDe(s0))
    const cible = carteValide({ mur: 2, murHp: 600, garnison: { hoplite: 3 }, cite: 'Sparte' })
    expect(refusRaid(snapDuelDuRegne(s0, etat), cible, { hoplite: 3 }, ['porte'])).toBe('attente')
    // le lendemain, la colonne repart - et « le lendemain » est la seule horloge lue
    useGame.setState({ createdAt: s0.createdAt - DAY_MS })
    const s1 = useGame.getState()
    expect(jourDe(s1)).toBe(jourDe(s0) + 1)
    expect(refusRaid(snapDuelDuRegne(s1, etat), cible, { hoplite: 3 }, ['porte'])).toBeNull()
  })

  it('⚠️ PIÈGE 4 : huit heures d’absence n’effacent aucune vengeance et n’appliquent aucun rapport', () => {
    /*
     * `OFFLINE_CAP_MS` vaut huit heures et `DAY_MS` huit minutes : une absence pleine
     * avance le calendrier de SOIXANTE journées. Un premier jet donnait huit journées
     * de péremption à une revanche - le joueur revenait de son déjeuner devant trois
     * vengeances périmées, sans avoir rien décidé. Rien du duel ne se résout donc
     * sans lui : une revanche ne se perd qu'en la frappant, ou en acceptant un
     * quatrième affront.
     */
    regneDuelliste()
    const s = useGame.getState()
    const c = emettreCarte(snapCarteDuel(s), 0)
    let etat = duelApresEmission(DUEL_VIDE, c)
    const riposte = carteValide({ ...c, cite: 'Mycènes des Atrides', serie: 42 })
    const colonne: Partial<Record<UnitId, number>> = { hoplite: 6, lancier: 6 }
    const pans = ['porte']
    etat = duelApresRapport(
      etat,
      {
        cite: 'Mycènes des Atrides',
        cible: c,
        colonne,
        pans,
        graine: graineRaid(empreinteCarte(c), colonne, pans),
        issue: { victoire: true, etoiles: 2, morts: 5, envoyes: 12 },
        riposte,
      },
      { pris: { grain: 40 }, honneur: 0, revanche: true, note: null },
      jourDe(s),
    )
    expect(etat.revanches).toHaveLength(1)
    const jourAvant = jourDe(s)

    // l'absence : le calendrier saute de tout le rattrapage hors ligne
    useGame.setState({ createdAt: s.createdAt - OFFLINE_CAP_MS })
    const apres = useGame.getState()
    expect(jourDe(apres) - jourAvant).toBe(Math.floor(OFFLINE_CAP_MS / DAY_MS))
    expect(jourDe(apres) - jourAvant).toBeGreaterThanOrEqual(60)

    // et rien du duel n'a bougé : la vengeance est là, la carte est là, le rapport
    // vu reste vu, l'honneur n'a ni monté ni descendu
    expect(etat.revanches).toHaveLength(1)
    expect(etat.revanches[0].cite).toBe('Mycènes des Atrides')
    expect(etat.cartes).toHaveLength(1)
    expect(etat.vus).toHaveLength(1)
    // la seule façon de la perdre est un geste : la frapper
    expect(duelApresRevanche(etat, etat.revanches[0].ref).revanches).toHaveLength(0)
  })

  it('⚠️ PIÈGE 3 : sept champs, quatre listes bornées, et pas un de plus', () => {
    // la surface d'état est ce qui coûte le plus cher à long terme : quatre listes à
    // tenir dans `GameState`, `etatInitial`, `CHAMPS_SAUVES` et la migration d'`init`
    expect(Object.keys(DUEL_VIDE)).toHaveLength(7)
    let etat = DUEL_VIDE
    for (let n = 0; n < 50; n++) etat = duelApresEmission(etat, carteValide({ mur: 1, murHp: 250, serie: n }))
    expect(etat.cartes).toHaveLength(CARTES_MAX)
    // le poids de l'état complet reste dans l'épaisseur d'une sauvegarde raisonnable
    expect(JSON.stringify(etat).length).toBeLessThan(2000)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
/*
 * LES QUATRE GESTES, PAR LE STORE, ET DANS L'ORDRE DU COURRIER.
 *
 * Ce bloc manquait entièrement au premier jet, et c'est ce qui a laissé passer deux
 * défauts que rien d'autre ne pouvait voir : les règles étaient éprouvées sur des
 * instantanés écrits à la main, les cent-quatorze cas passaient, et pourtant frapper
 * mettait en jeu un huitième des greniers sans le dire, et six raids chassaient de la
 * mémoire la carte publiée le matin.
 *
 * Un instantané ne peut pas les trouver : ils naissent tous les deux de la
 * COMPOSITION du store - de l'ordre dans lequel `duelApresRaid`, `duelApresEmission`
 * et `duelApresRevanche` s'appellent, et de ce que le rapport DIT au joueur. C'est la
 * leçon du bloc : ce qu'un module pur ne peut pas tenir tout seul se tient ici.
 */

/** une cible TENDRE, faite à la main : deux lanciers derrière un mur de niveau 1 */
function cibleTendre(p: Partial<CarteDefense> = {}): CarteDefense {
  return carteValide({
    cite: 'Ilos le Tendre',
    mur: 1,
    murHp: 250,
    tours: 0,
    redoute: 0,
    garnison: { lancier: 2 },
    interieur: { acropole: 0, bastion: false, galeries: false, poterne: false, citerne: false },
    plan: { ligne: 'mur', tir: 'cloche', pans: {}, heros: {} },
    heros: [],
    atk: 1,
    reduc: 1,
    niveaux: {},
    // un butin VOLONTAIREMENT tordu : la mise de l'attaquant vaut 240/240/240/144, et
    // deux chiffres identiques auraient laissé un cas passer pour la mauvaise raison
    butin: { pierre: 17, grain: 23 },
    jour: 3,
    serie: 0,
    ...p,
  })
}

/** un règne assez fourni pour faire marcher vingt hoplites */
function regneAvecColonne(champs: Partial<GameState> = {}): void {
  regneDuelliste({
    army: { lancier: 8, archer: 5, hoplite: 20, frondeur: 3, peltaste: 2, belier: 2, char: 1 },
    ...champs,
  })
}

/** le règne du DÉFENSEUR, reconstruit comme s'il avait publié cette carte-là */
function aEmisCetteCarte(c: CarteDefense): void {
  const d = useGame.getState().duel
  useGame.setState({
    duel: {
      ...d,
      cartes: [{ ref: empreinteCarte(c), jour: c.jour, butin: { ...c.butin }, pille: false }],
      emises: Math.max(1, d.emises),
    },
  })
}

/** toutes les lignes du dernier compte rendu porté au conseil */
function dernierRapport(): string {
  const r = useGame.getState().reports[0]
  return [r?.titre ?? '', ...(r?.lignes ?? [])].join(' | ')
}

describe('les quatre gestes du duel, par le store', () => {
  it('PUBLIER retient la carte, dit ce qu’on met en jeu, et n’ouvre aucun secret', () => {
    regneAvecColonne()
    const avant = useGame.getState()
    const c = avant.publierCarte()
    const apres = useGame.getState()
    expect(apres.duel.cartes).toHaveLength(1)
    expect(apres.duel.cartes[0].ref).toBe(empreinteCarte(c))
    expect(apres.duel.emises).toBe(1)
    // le compte rendu chiffre la mise : publier sans savoir combien serait signer
    // un chèque dont on ne lirait pas le montant
    expect(dernierRapport()).toContain(resumeButin(c.butin))
    // et le butin de la carte est bien celui des coffres à l'émission
    expect(c.butin).toEqual(butinOffert(avant.resources))
  })

  it('publier deux fois de suite donne deux cartes DISTINCTES, jamais deux fois la même', () => {
    /*
     * `serie` vient de `duel.emises`, et c'est tout ce qui sépare deux cartes d'un
     * règne qui n'a pas bougé entre les deux clics. Sans elle, l'empreinte serait la
     * même, `duelApresEmission` aurait dédoublonné, et le chèque encaissé de la
     * première aurait annulé le butin de la seconde sans un mot.
     */
    regneAvecColonne()
    const a = useGame.getState().publierCarte()
    const b = useGame.getState().publierCarte()
    expect(empreinteCarte(a)).not.toBe(empreinteCarte(b))
    expect(useGame.getState().duel.cartes).toHaveLength(2)
    expect(useGame.getState().duel.emises).toBe(2)
  })

  it('FRAPPER : le butin rentre, l’honneur monte, les morts ne rentrent pas', () => {
    regneAvecColonne()
    const avant = { ...useGame.getState().resources }
    const armeeAvant = { ...useGame.getState().army }
    const cible = cibleTendre()
    const r = useGame.getState().lancerRaidDuel(cible, { hoplite: 20 }, ['porte'])
    expect(r).not.toBeNull()
    const rapport = r as RapportRaid
    expect(rapport.issue.victoire).toBe(true)
    const s = useGame.getState()
    // le butin de la CARTE, ressource par ressource, sous le plafond de l'agora
    for (const res of ['bois', 'pierre', 'grain', 'bronze'] as ResourceId[]) {
      expect(s.resources[res]).toBe(Math.min(STOCKAGE[4], avant[res] + (cible.butin[res] ?? 0)))
    }
    expect(s.duel.honneur).toBe(honneurAttaque(rapport.issue))
    expect(s.exploits.duelsGagnes).toBe(1)
    expect(s.exploits.honneurDuel).toBe(honneurAttaque(rapport.issue))
    // ⚠️ SEULS LES MORTS RESTENT SUR PLACE. Un duel se tranche d'un coup : la colonne
    // ne part pas dans `s.expedition`, et retirer les vingt hommes aurait fait
    // disparaître les survivants d'un raid parfait.
    for (const u of ['lancier', 'archer', 'frondeur', 'peltaste', 'belier', 'char'] as UnitId[]) {
      expect(s.army[u]).toBe(armeeAvant[u])
    }
    expect(armeeAvant.hoplite - s.army.hoplite).toBe(rapport.issue.morts)
    // la carte frappée est retenue, et le jour du raid est un NUMÉRO DE JOURNÉE
    expect(s.duel.frappees).toEqual([empreinteCarte(cible)])
    expect(s.duel.dernierRaid).toBe(jourDe(s))
  })

  it('⚠️ FRAPPER MET SA PROPRE CARTE EN JEU, ET LE COMPTE RENDU LE CHIFFRE', () => {
    /*
     * LE SECOND DÉFAUT MESURÉ DU PREMIER JET, et le plus coûteux pour le joueur.
     * `lancerRaidDuel` ÉMET la carte de l'attaquant - il faut bien, sans elle la
     * revanche n'existerait pas et notre propre client refuserait le rapport de
     * l'adversaire pour « inconnue » (décision 4). Mais émettre une carte, c'est
     * mettre douze pour cent de ses greniers en jeu : le joueur risquait donc huit
     * cents mesures à chaque raid sans qu'une ligne le lui dise, et ne l'apprenait
     * qu'en se faisant piller. « On ne perd jamais ce qu'on n'a pas mis en jeu »
     * suppose qu'on sache ce qu'on met en jeu.
     */
    regneAvecColonne()
    const mise = butinOffert(useGame.getState().resources)
    const r = useGame.getState().lancerRaidDuel(cibleTendre(), { hoplite: 20 }, ['porte'])
    expect(r).not.toBeNull()
    const rapport = r as RapportRaid
    // la carte partie dans le rapport est bien celle qu'on a retenue chez soi
    expect(rapport.riposte).not.toBeNull()
    const mienne = rapport.riposte as CarteDefense
    expect(useGame.getState().duel.cartes.some((c) => c.ref === empreinteCarte(mienne))).toBe(true)
    expect(mienne.butin).toEqual(mise)
    // et le compte rendu le DIT, en chiffres
    expect(dernierRapport()).toContain(resumeButin(mienne.butin))
  })

  it('un raid REPOUSSÉ ne rapporte rien et coûte la colonne, mais le geste est dit', () => {
    regneAvecColonne()
    const avant = { ...useGame.getState().resources }
    // une place dure : la carte du règne lui-même, mur 3 et sa garnison entière
    const dure = carteValide({ ...emettreCarte(snapCarteDuel(useGame.getState()), 99), cite: 'Sparte la Dure' })
    const r = useGame.getState().lancerRaidDuel(dure, { hoplite: 20 }, ['porte'])
    expect(r).not.toBeNull()
    expect((r as RapportRaid).issue.victoire).toBe(false)
    const s = useGame.getState()
    for (const res of ['bois', 'pierre', 'bronze'] as ResourceId[]) expect(s.resources[res]).toBe(avant[res])
    expect(s.duel.honneur).toBe(0)
    expect(s.exploits.duelsGagnes).toBeUndefined()
    // même repoussé, on a donné son adresse : le compte rendu doit chiffrer la mise
    expect(dernierRapport()).toContain(resumeButin((r as RapportRaid).riposte!.butin))
  })

  it('un raid REFUSÉ ne retire pas un homme, et le motif est dit au joueur', () => {
    regneAvecColonne()
    const armeeAvant = { ...useGame.getState().army }
    // sa propre carte : le tour de passe-passe le plus évident
    const mienne = useGame.getState().publierCarte()
    expect(useGame.getState().lancerRaidDuel(mienne, { hoplite: 20 }, ['porte'])).toBeNull()
    expect(useGame.getState().army).toEqual(armeeAvant)
    expect(useGame.getState().toasts.slice(-1)[0].msg).toContain('votre propre carte')
    // et un pan manquant ne fait pas non plus marcher la colonne
    expect(useGame.getState().lancerRaidDuel(cibleTendre(), { hoplite: 20 }, [])).toBeNull()
    expect(useGame.getState().army).toEqual(armeeAvant)
    expect(useGame.getState().toasts.slice(-1)[0].msg).toContain('Par où entrez-vous')
  })

  it('un raid d’honneur par journée : le second clic du jour est refusé, pas facturé', () => {
    regneAvecColonne()
    expect(useGame.getState().lancerRaidDuel(cibleTendre({ serie: 1 }), { hoplite: 10 }, ['porte'])).not.toBeNull()
    const armee = { ...useGame.getState().army }
    expect(useGame.getState().lancerRaidDuel(cibleTendre({ serie: 2 }), { hoplite: 5 }, ['porte'])).toBeNull()
    expect(useGame.getState().army).toEqual(armee)
    expect(useGame.getState().toasts.slice(-1)[0].msg).toContain('par journée')
  })

  it('JUGER un rapport honnête : le butin de la CARTE s’en va, la revanche s’ouvre', () => {
    // ── chez l'attaquant
    regneAvecColonne()
    const cible = cibleTendre()
    const rapport = useGame.getState().lancerRaidDuel(cible, { hoplite: 20 }, ['porte']) as RapportRaid
    expect(rapport.issue.victoire).toBe(true)

    // ── chez le défenseur, qui avait émis cette carte-là
    regneAvecColonne()
    aEmisCetteCarte(cible)
    const avant = { ...useGame.getState().resources }
    const armeeAvant = { ...useGame.getState().army }
    expect(useGame.getState().appliquerRapport(rapport)).toBe(true)
    const s = useGame.getState()
    for (const res of ['bois', 'pierre', 'grain', 'bronze'] as ResourceId[]) {
      expect(s.resources[res]).toBe(avant[res] - (cible.butin[res] ?? 0))
    }
    // ⚠️ LA CARTE EST UNE IMAGE, PAS LA GARNISON : aucun homme n'est mort chez le
    // défenseur, aucun mur n'est tombé. Sans cela personne n'aurait publié de carte.
    expect(s.army).toEqual(armeeAvant)
    expect(s.wallHp).toBe(useGame.getState().wallHp)
    // le chèque est encaissé, une seule fois
    expect(s.duel.cartes[0].pille).toBe(true)
    expect(s.duel.vus).toEqual([rapport.graine])
    expect(s.duel.revanches).toHaveLength(1)
    expect(s.duel.revanches[0].pris).toEqual(cible.butin)
    expect(dernierRapport()).toContain('revanche est ouverte')
  })

  it('LE MÊME RAPPORT NE S’APPLIQUE PAS DEUX FOIS, et le second ne coûte rien', () => {
    regneAvecColonne()
    const cible = cibleTendre()
    const rapport = useGame.getState().lancerRaidDuel(cible, { hoplite: 20 }, ['porte']) as RapportRaid
    regneAvecColonne()
    aEmisCetteCarte(cible)
    expect(useGame.getState().appliquerRapport(rapport)).toBe(true)
    const apres = { ...useGame.getState().resources }
    expect(useGame.getState().appliquerRapport(rapport)).toBe(false)
    expect(useGame.getState().resources).toEqual(apres)
    expect(useGame.getState().duel.revanches).toHaveLength(1)
    expect(useGame.getState().toasts.slice(-1)[0].msg).toContain('déjà été porté au conseil')
  })

  it('UN RAPPORT FABRIQUÉ NE VIDE PAS LES GRENIERS, et le refus est écrit au conseil', () => {
    regneAvecColonne()
    const cible = cibleTendre()
    const rapport = useGame.getState().lancerRaidDuel(cible, { hoplite: 20 }, ['porte']) as RapportRaid
    // le défenseur n'a jamais publié cette carte : on ne paie pas un chèque non signé
    regneAvecColonne()
    const avant = { ...useGame.getState().resources }
    expect(useGame.getState().appliquerRapport(rapport)).toBe(false)
    expect(useGame.getState().resources).toEqual(avant)
    expect(useGame.getState().duel.revanches).toHaveLength(0)
    expect(dernierRapport()).toContain('REFUSÉ')

    // et une issue inventée sur une carte bel et bien émise se refuse aussi
    regneAvecColonne()
    aEmisCetteCarte(cible)
    // sept morts là où l'assaut n'en a fait aucun : rejoué chez le défenseur, le
    // compte ne tombe pas, et le rapport est refusé au champ près
    expect(rapport.issue.morts).toBe(0)
    const menteur: RapportRaid = { ...rapport, issue: { ...rapport.issue, morts: 7, etoiles: 1 } }
    const coffres = { ...useGame.getState().resources }
    expect(useGame.getState().appliquerRapport(menteur)).toBe(false)
    expect(useGame.getState().resources).toEqual(coffres)
  })

  it('UN PLAN QUI TIENT rapporte de l’honneur au défenseur, et rien à venger', () => {
    regneAvecColonne()
    // une place dure, publiée par le défenseur, que l'attaquant n'a pas percée
    const dure = carteValide({ ...emettreCarte(snapCarteDuel(useGame.getState()), 5), cite: 'Sparte la Dure' })
    const rapport = useGame.getState().lancerRaidDuel(dure, { hoplite: 20 }, ['porte']) as RapportRaid
    expect(rapport.issue.victoire).toBe(false)

    regneAvecColonne()
    aEmisCetteCarte(dure)
    const avant = { ...useGame.getState().resources }
    expect(useGame.getState().appliquerRapport(rapport)).toBe(true)
    const s = useGame.getState()
    expect(s.resources).toEqual(avant)
    expect(s.duel.honneur).toBeGreaterThan(0)
    expect(s.exploits.duelsTenus).toBe(1)
    expect(s.exploits.honneurDuel).toBe(s.duel.honneur)
    // on ne gagne jamais les lauriers ET la vengeance : il n'y a rien à venger
    expect(s.duel.revanches).toHaveLength(0)
    expect(s.duel.cartes[0].pille).toBe(false)
  })

  it('OUBLIER une vengeance la retire, et frapper la consomme aussi', () => {
    regneAvecColonne()
    const cible = cibleTendre()
    const rapport = useGame.getState().lancerRaidDuel(cible, { hoplite: 20 }, ['porte']) as RapportRaid
    regneAvecColonne()
    aEmisCetteCarte(cible)
    useGame.getState().appliquerRapport(rapport)
    const rev = useGame.getState().duel.revanches[0]
    expect(rev).toBeTruthy()
    useGame.getState().oublierRevanche(rev.ref)
    expect(useGame.getState().duel.revanches).toHaveLength(0)

    // et la même vengeance, frappée cette fois, ne reste pas due
    regneAvecColonne()
    aEmisCetteCarte(cible)
    useGame.getState().appliquerRapport(rapport)
    const rev2 = useGame.getState().duel.revanches[0]
    expect(useGame.getState().lancerRaidDuel(rev2.carte, { hoplite: 20 }, ['porte'])).not.toBeNull()
    expect(useGame.getState().duel.revanches).toHaveLength(0)
  })

  it('LE TOUR COMPLET SURVIT À UN RECHARGEMENT : cartes, graines vues, vengeance, honneur', () => {
    /*
     * `'duel'` doit être dans `CHAMPS_SAUVES` (piège 3) ET la migration doit le
     * repasser par `duelSain`. Sans la première ligne, un joueur qui recharge se
     * retrouve avec un règne qui n'a jamais rien publié : le rapport que son ami lui
     * enverra tombera sur « inconnue », et il ne perdra rien - donc son ami n'aura
     * rien gagné.
     */
    regneAvecColonne()
    const cible = cibleTendre()
    const rapport = useGame.getState().lancerRaidDuel(cible, { hoplite: 20 }, ['porte']) as RapportRaid
    regneAvecColonne()
    aEmisCetteCarte(cible)
    useGame.getState().appliquerRapport(rapport)
    const avant = useGame.getState().duel

    useGame.getState().save()
    useGame.getState().init()
    const apres = useGame.getState().duel
    expect(apres.vus).toEqual(avant.vus)
    expect(apres.cartes.map((c) => c.ref)).toEqual(avant.cartes.map((c) => c.ref))
    expect(apres.cartes[0].pille).toBe(true)
    expect(apres.revanches.map((r) => r.ref)).toEqual(avant.revanches.map((r) => r.ref))
    expect(apres.honneur).toBe(avant.honneur)
    expect(apres.emises).toBeGreaterThanOrEqual(apres.cartes.length)
    // et le rapport déjà porté au conseil ne s'applique toujours pas
    expect(useGame.getState().appliquerRapport(rapport)).toBe(false)
  })

  it('⚠️ DOUZE RAIDS N’ÉVINCENT PAS LA CARTE PUBLIÉE POUR SES AMIS - par le store', () => {
    /*
     * LE PREMIER DÉFAUT MESURÉ DU PREMIER JET, refait ici par les vraies actions.
     * `CARTES_MAX` valait six, et chaque raid émet une carte : six raids - six
     * journées de jeu, moins d'une heure - chassaient la carte publiée le matin, et
     * le rapport HONNÊTE de l'ami tombait sur « inconnue ». On ne perdait alors jamais
     * le butin qu'on avait promis, et lui n'avait ni honneur ni vengeance.
     */
    regneAvecColonne()
    const mienne = useGame.getState().publierCarte()
    for (let n = 1; n <= FRAPPEES_MAX; n++) {
      const s = useGame.getState()
      // le lendemain, et la caserne a reformé la colonne
      useGame.setState({ createdAt: s.createdAt - DAY_MS, army: { ...s.army, hoplite: 20 } })
      expect(useGame.getState().lancerRaidDuel(cibleTendre({ serie: n }), { hoplite: 20 }, ['porte'])).not.toBeNull()
    }
    const d = useGame.getState().duel
    expect(d.frappees).toHaveLength(FRAPPEES_MAX)
    expect(d.cartes.some((c) => c.ref === empreinteCarte(mienne))).toBe(true)
    /*
     * ET C'EST LA SEULE CHOSE QUI COMPTE : le rapport de l'ami est JUGEABLE. On passe
     * par `refusRapport` et non par `refusRaid` - le même jour, `refusRaid` répondrait
     * « attente » avant même de regarder les cartes, et le cas aurait passé pour la
     * mauvaise raison.
     */
    const colonne: Partial<Record<UnitId, number>> = { hoplite: 12, lancier: 6 }
    const pans: PanId[] = ['porte']
    const graine = graineRaid(empreinteCarte(mienne), colonne, pans)
    const rejoue = deroulerRaid(mienne, colonne, pans, graine)
    const sien: RapportRaid = {
      cite: 'Un ami à qui j’avais donné mon code',
      cible: mienne,
      colonne,
      pans,
      graine,
      issue: rejoue!,
      riposte: null,
    }
    expect(refusRapport(snapDuelDuRegne(useGame.getState(), d), sien, rejoue)).toBeNull()
  })

  it('⚠️ PIÈGE 4, POUR DE VRAI : huit heures d’absence ne résolvent rien du duel', () => {
    /*
     * Le cas structurel plus haut regarde les CHAMPS ; celui-ci fait tourner la
     * machine. On applique un rapport, on ouvre une vengeance, puis on simule
     * l'absence en reculant `lastSeen` de tout le rattrapage, et l'on RECHARGE - ce
     * qui déclenche le rattrapage hors ligne et le crochet quotidien. Rien du duel ne
     * doit avoir bougé : soixante journées passent, et la vengeance est toujours là.
     */
    regneAvecColonne()
    const cible = cibleTendre()
    const rapport = useGame.getState().lancerRaidDuel(cible, { hoplite: 20 }, ['porte']) as RapportRaid
    regneAvecColonne()
    aEmisCetteCarte(cible)
    useGame.getState().appliquerRapport(rapport)
    const avant = useGame.getState().duel
    expect(avant.revanches).toHaveLength(1)
    const jourAvant = jourDe(useGame.getState())

    // l'absence : on sauvegarde, on recule la dernière visite de huit heures, on rentre
    useGame.getState().save()
    const cle = 'palladion-save-v1'
    const brut = JSON.parse(localStorage.getItem(cle) ?? '{}') as Record<string, unknown>
    expect(brut.duel).toBeTruthy()
    brut.lastSeen = (brut.lastSeen as number) - OFFLINE_CAP_MS
    brut.createdAt = (brut.createdAt as number) - OFFLINE_CAP_MS
    localStorage.setItem(cle, JSON.stringify(brut))
    useGame.getState().init()

    const apres = useGame.getState()
    expect(jourDe(apres) - jourAvant).toBeGreaterThanOrEqual(60)
    expect(apres.duel.revanches).toHaveLength(1)
    expect(apres.duel.revanches[0].cite).toBe(avant.revanches[0].cite)
    expect(apres.duel.vus).toEqual(avant.vus)
    expect(apres.duel.honneur).toBe(avant.honneur)
    // et le lendemain de tout cela, la colonne peut repartir : rien n'est resté bloqué
    expect(apres.duel.dernierRaid).toBeLessThan(jourDe(apres))
  })
})
