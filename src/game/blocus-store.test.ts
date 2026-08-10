import { beforeEach, describe, expect, it } from 'vitest'
import { DAY_MS, WALL_HP, troupes } from './data'
import {
  MIN_HOMMES,
  RATION_PAR_JOUR,
  SAPE_MUR_PCT,
  SEUIL_OFFRE,
  TENUE_MAX,
  TRAVAUX,
  coutTravail,
  hommesDeLaLigne,
  partEngagee,
  rancon,
  type EtatBlocus,
} from './blocus'
import { VILLAGES_PAR_ID } from './expeditions'
import { jourDe, useGame } from './store'
import type { UnitId } from './types'

/*
 * ═══════════ LE BLOCUS PAR LE STORE : LES QUATRE COUTURES ═══════════
 *
 * Le module pur est éprouvé ailleurs (`blocus.test.ts`, 43 promesses). Ce fichier
 * ne teste QUE ce que le module ne peut pas savoir - les quatre endroits où le
 * blocus se coud au moteur, et où ce dépôt s'est déjà brûlé :
 *
 *  1. LES HOMMES SORTENT VRAIMENT DE `s.army`. C'est tout le coût d'opportunité du
 *     système : s'ils y restaient, le blocus serait gratuit.
 *  2. LA JOURNÉE SE RÉSOUT DANS LE CROCHET QUOTIDIEN, une seule fois par journée
 *     de jeu - le même crochet que `vieDesFamilles`, et pour la même raison.
 *  3. L'ÉTAT SURVIT À LA SAUVEGARDE, et ne traverse ni les modes ni les règnes.
 *  4. LES QUATRE DÉCISIONS rendent les hommes à l'armée. Une ligne oubliée dehors
 *     serait une armée effacée.
 *
 * ⚠️ `MODE_TEST` rend `payer()` et `peutPayer()` toujours vrais : aucun de ces
 * tests ne peut donc éprouver un refus de PAIEMENT par le store. Les refus se
 * jugent dans `refusBlocus`, et c'est là qu'ils sont testés.
 */

const FORT = VILLAGES_PAR_ID['fort-acheen']

/**
 * Un règne capable de poster une ligne : des hommes, du grain, la paix.
 *
 * ⚠️ L'AGORA EST AU NIVEAU 4, ET CE N'EST PAS DÉCORATIF. `clampRes` borne toute
 * recette à `STOCKAGE[agora.level]` - 1400 au niveau 3 - alors qu'un `setState`
 * échappe à ce plafond. Le premier jet posait 3000 de bronze sur une agora 3 : la
 * rançon créditée par-dessus était RABATTUE à 1400, et le test lisait un gain
 * négatif (« expected 1400 to be greater than or equal to 3139 »). Le plafond du
 * niveau 4 vaut 2800 : les réserves de départ tiennent dessous, et tout crédit se
 * voit. Le même piège attend n'importe quel test qui enrichit un règne.
 */
function regneArme() {
  const s = useGame.getState()
  const createdAt = Date.now() - 12 * DAY_MS
  useGame.setState({
    createdAt,
    lastSeen: Date.now(),
    blocus: null,
    army: troupes({ hoplite: 6, lancier: 8, archer: 4 }),
    resources: { bois: 1500, pierre: 1500, grain: 2000, bronze: 900 },
    buildings: { ...s.buildings, agora: { level: 4 }, caserne: { level: 3 } },
    alliances: {},
    expeditions: {},
    battle: null,
    expedition: null,
    nextAttackAt: Date.now() + 20 * 60_000,
  })
}

/** la ligne au rapport de force voisin de 1 devant le fort achéen */
const LIGNE: Partial<Record<UnitId, number>> = { hoplite: 4, lancier: 4 }

/** force le crochet quotidien à voir une journée neuve */
function passerUneJournee(): void {
  const s = useGame.getState()
  useGame.setState({ dernierJourVecu: jourDe(s) - 1 })
  useGame.getState().tick()
}

beforeEach(() => {
  useGame.getState().reset()
  useGame.setState({ mode: 'bac-a-sable' })
})

describe('les hommes postés quittent la garnison', () => {
  it('poster une ligne retire les hommes de l’armée, et le blocus les porte', () => {
    regneArme()
    const avant = useGame.getState().army
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    const s = useGame.getState()
    expect(s.blocus).not.toBeNull()
    expect(s.army.hoplite).toBe(avant.hoplite - 4)
    expect(s.army.lancier).toBe(avant.lancier - 4)
    expect(hommesDeLaLigne(s.blocus!.postes)).toBe(8)
  })

  it('la part engagée dehors se lit sur l’état, et elle n’est pas anecdotique', () => {
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    const s = useGame.getState()
    const p = partEngagee(s.blocus!.postes, s.army)
    expect(p.dehors).toBe(8)
    expect(p.dedans).toBe(10)
    expect(p.partForce).toBeGreaterThan(0.4)
  })

  it('on ne poste pas une ligne qu’on n’a pas : l’armée ne passe jamais sous zéro', () => {
    regneArme()
    useGame.setState({ army: troupes({ lancier: 3 }) })
    useGame.getState().ouvrirBlocus(FORT.id, { lancier: 3 })
    expect(useGame.getState().blocus).toBeNull()
    expect(useGame.getState().army.lancier).toBe(3)
  })

  it('un seul blocus à la fois', () => {
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    const premier = useGame.getState().blocus!.villageId
    useGame.getState().ouvrirBlocus('camp-pillards', { lancier: 4, archer: 2 })
    expect(useGame.getState().blocus!.villageId).toBe(premier)
  })
})

describe('la journée de blocus tombe dans le crochet quotidien', () => {
  it('une journée de jeu qui tourne fait avancer le blocus d’UNE journée', () => {
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    expect(useGame.getState().blocus!.jours).toBe(0)
    passerUneJournee()
    const e = useGame.getState().blocus!
    expect(e.jours).toBe(1)
    expect(e.volonte).toBeLessThan(100)
  })

  it('la ration sort des greniers, chaque journée', () => {
    regneArme()
    /*
     * ⚠️ LE GRENIER EST POSÉ À SON PLAFOND, sinon ce test mesure la récolte.
     * `clampRes` borne toute recette à `STOCKAGE[agora.level]` : à ras bord, la
     * production ne peut plus rien ajouter, et le seul mouvement du grain est la
     * ration de la ligne. Le premier jet lisait « −728 » - le village avait
     * simplement moissonné plus qu'il n'avait nourri.
     */
    useGame.setState({ resources: { ...useGame.getState().resources, grain: 2800 } })
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    const avant = useGame.getState().resources.grain
    passerUneJournee()
    const apres = useGame.getState().resources.grain
    expect(avant - apres).toBeGreaterThanOrEqual(8 * RATION_PAR_JOUR * 0.5)
  })

  it('la journée laisse un rapport dans la chronique - sinon rien ne se voit', () => {
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    passerUneJournee()
    const s = useGame.getState()
    expect(s.reports.some((r) => r.titre.includes('Blocus') || r.titre.includes(FORT.nom))).toBe(true)
    expect(s.blocus!.dernier.length).toBeGreaterThan(0)
  })

  it('huit heures d’absence n’avancent le blocus que d’une journée', () => {
    /*
     * `OFFLINE_CAP_MS` (8 h) sur `DAY_MS` (8 min) fait bondir `jourDe(s)` de
     * soixante. Le crochet quotidien, lui, ne rattrape jamais plus d'une journée -
     * c'est la règle de `vieDesFamilles` et le blocus la partage.
     */
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    const s0 = useGame.getState()
    useGame.setState({ createdAt: s0.createdAt - 60 * DAY_MS })
    passerUneJournee()
    expect(useGame.getState().blocus!.jours).toBe(1)
  })

  it('la place ne tombe jamais toute seule : elle offre, et elle attend', () => {
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    // on l'amène au bord de la reddition
    useGame.setState({
      blocus: { ...(useGame.getState().blocus as EtatBlocus), volonte: SEUIL_OFFRE + 1 },
    })
    passerUneJournee()
    const e = useGame.getState().blocus
    expect(e).not.toBeNull()
    expect(e!.offre).toBe(true)
    // et rien n'a été encaissé sans la parole du joueur
    expect(useGame.getState().reports.some((r) => r.titre.includes('Rançon'))).toBe(false)
  })
})

describe('un assaut sur le village se sent au camp', () => {
  it('un assaut résolu pendant l’absence arrive jusqu’à la ligne', () => {
    /*
     * ⚠️ LE PIÈGE DE CETTE COUTURE : IL Y A DEUX ENDROITS OÙ UN ASSAUT SE CONCLUT.
     *
     * `finirBataille` pour celui qu'on joue, et `simulerHorsLigne` pour celui qui
     * tombe pendant qu'on dort - jusqu'à trois par nuit. Ne câbler que le premier
     * aurait donné ceci : un joueur revient au matin, son village a été pillé deux
     * fois, et la ligne au loin n'en a rien su. C'est le chemin le plus facile à
     * oublier, donc c'est celui que ce test emprunte.
     *
     * L'issue de la bataille nocturne dépend de la vague tirée : on n'exige donc
     * pas QUELLE nouvelle arrive, seulement qu'une nouvelle arrive.
     */
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    useGame.setState({ blocus: { ...(useGame.getState().blocus as EtatBlocus), tenue: 60 } })
    const now = Date.now()
    useGame.setState({ lastSeen: now - 40 * 60_000, nextAttackAt: now - 10 * 60_000 })
    useGame.getState().save()
    useGame.getState().init()
    const s = useGame.getState()
    expect(s.stats.repousses + s.stats.perdus).toBeGreaterThan(0)
    // ou la ligne s'est défaite (village pillé), ou sa tenue a bougé (village tenu)
    expect(s.blocus === null || s.blocus.tenue !== 60).toBe(true)
    // et si elle s'est défaite, les hommes sont rentrés
    if (s.blocus === null) expect(s.army.hoplite).toBeGreaterThan(2)
  })
})

describe('les travaux se paient et durent', () => {
  it('couper l’eau accélère l’usure jusqu’au bout du blocus', () => {
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    useGame.getState().ordonnerTravail('eau')
    const e = useGame.getState().blocus!
    expect(e.travaux).toContain('eau')
    const avant = e.volonte
    passerUneJournee()
    // l'usure d'une journée avec l'eau coupée dépasse celle de l'usure de base
    expect(avant - useGame.getState().blocus!.volonte).toBeGreaterThan(TRAVAUX.eau.usure)
  })

  it('on n’ordonne pas deux fois le même travail', () => {
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    useGame.getState().ordonnerTravail('sape')
    useGame.getState().ordonnerTravail('sape')
    expect(useGame.getState().blocus!.travaux.filter((t) => t === 'sape')).toHaveLength(1)
  })

  it('le prix du travail suit la place, et le coût est réel hors mode test', () => {
    // MODE_TEST rend `payer()` toujours vrai : on vérifie la TABLE, pas le débit
    expect(coutTravail('sape', VILLAGES_PAR_ID['forteresse-mysienne']).bois!).toBeGreaterThan(
      coutTravail('sape', FORT).bois!,
    )
  })
})

describe('les quatre décisions rendent toujours les hommes', () => {
  it('accepter la reddition verse la rançon, rend les hommes, et plaît à Zeus', () => {
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    useGame.setState({
      blocus: { ...(useGame.getState().blocus as EtatBlocus), volonte: 0, offre: true, jours: 5 },
    })
    const e = useGame.getState().blocus!
    const du = rancon(e, FORT)
    const avantBronze = useGame.getState().resources.bronze
    const avantZeus = useGame.getState().gods.zeus.relation
    const avantAres = useGame.getState().gods.ares.relation
    useGame.getState().accepterReddition()
    const s = useGame.getState()
    expect(s.blocus).toBeNull()
    expect(s.army.hoplite).toBe(6)
    expect(s.army.lancier).toBe(8)
    expect(s.resources.bronze).toBeGreaterThanOrEqual(avantBronze + (du.bronze ?? 0) - 1)
    /*
     * L'INVERSE EXACT DU PILLAGE, et c'est l'identité du système : piller coûte
     * Zeus −5 et rapporte Arès +4. On a reçu une supplication et on l'a tenue.
     */
    expect(s.gods.zeus.relation).toBeGreaterThan(avantZeus)
    expect(s.gods.ares.relation).toBeLessThan(avantAres)
    // la place reste debout : sa garnison ne se renforce pas comme après un sac
    expect(s.expeditions[FORT.id]?.pillages ?? 0).toBe(0)
  })

  it('lever le siège rend les hommes et ne rapporte rien', () => {
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    const avant = useGame.getState().resources.bronze
    useGame.getState().leverBlocus()
    const s = useGame.getState()
    expect(s.blocus).toBeNull()
    expect(s.army.hoplite).toBe(6)
    expect(s.resources.bronze).toBeLessThanOrEqual(avant)
    expect(s.moraleMods.some((m) => m.delta < 0)).toBe(true)
  })

  it('donner l’assaut rend les hommes à l’armée puis les fait partir en colonne', () => {
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    useGame.setState({ blocus: { ...(useGame.getState().blocus as EtatBlocus), volonte: 10 } })
    useGame.getState().donnerAssautBlocus()
    const s = useGame.getState()
    // le blocus s'achève dans l'assaut, et c'est une VRAIE expédition
    expect(s.blocus).toBeNull()
    expect(s.expedition).not.toBeNull()
    expect(s.expedition!.villageId).toBe(FORT.id)
    expect(hommesDeLaLigne(s.expedition!.envoyes)).toBe(8)
    // la garnison a désarmé : moins de défenseurs que dans un raid ordinaire
    expect(s.expedition!.battle.fighters.filter((f) => f.camp === 'defense').length).toBeGreaterThan(0)
  })

  it('une ligne plus grosse qu’une colonne donne l’assaut quand même, et le surplus reste', () => {
    /*
     * ⚠️ LE PIÈGE QUE CE TEST GARDE, ET IL NE SE VOIT QU'AVEC UNE GRANDE ARMÉE.
     *
     * `MAX_TROUPES` (20) borne toute expédition, et `lancerExpedition` refuse EN
     * SILENCE au-delà : `if (total === 0 || total > MAX_TROUPES) return`, sans un
     * toast, au milieu de son `set`. Une ligne de vingt-huit hommes qui donnait
     * l'assaut ne partait donc pas, ne disait rien, et se défaisait au matin suivant
     * - cinq journées de grain mangées, la place perdue, pas une bataille. Le blocus
     * est le SEUL système qui puisse poster plus d'hommes qu'une colonne n'en porte,
     * donc le seul qui pouvait tomber dedans.
     */
    regneArme()
    useGame.setState({ army: troupes({ hoplite: 10, lancier: 18, archer: 12 }) })
    useGame.getState().ouvrirBlocus(FORT.id, { hoplite: 8, lancier: 14, archer: 6 })
    expect(hommesDeLaLigne(useGame.getState().blocus!.postes)).toBe(28)
    useGame.getState().donnerAssautBlocus()
    const s = useGame.getState()
    expect(s.blocus).toBeNull()
    expect(s.expedition).not.toBeNull()
    expect(hommesDeLaLigne(s.expedition!.envoyes)).toBe(20)
    // les huit qui n'ont pas pu partir sont au village, pas dans le néant
    expect(s.army.hoplite + s.army.lancier + s.army.archer).toBe(10 + 18 + 12 - 20)
    /*
     * ⚠️ L'OS DE LA LIGNE EST PROTÉGÉ, MAIS PAS INTOUCHABLE - et la première version
     * de cette assertion demandait l'impossible (« les huit hoplites partent tous »).
     * On rogne le plus nombreux, un homme à la fois : partant de 8 hoplites, 14
     * lanciers et 6 archers, les sept premiers retraits tombent sur les lanciers, et
     * au huitième l'hoplite EST devenu le plus nombreux (8 contre 7). Il en perd donc
     * un. La promesse tenable n'est pas « l'élite ne perd personne » mais « l'élite
     * perd le moins » : sept lanciers renvoyés contre un seul hoplite.
     */
    expect(s.expedition!.envoyes.hoplite).toBe(7)
    expect(s.expedition!.envoyes.lancier).toBe(7)
  })

  it('miner le mur allège l’enceinte de l’assaut', () => {
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    useGame.getState().ordonnerTravail('sape')
    useGame.getState().donnerAssautBlocus()
    // l'enceinte du fort achéen vaut WALL_HP[2] = 600 : la sape en retire 45 %
    expect(useGame.getState().expedition!.wallHp).toBeCloseTo(WALL_HP[FORT.mur] * (1 - SAPE_MUR_PCT), 0)
  })
})

describe('le blocus ne traverse ni les modes ni les règnes', () => {
  it('il survit à une sauvegarde et à son rechargement', () => {
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    useGame.getState().save()
    useGame.getState().init()
    const e = useGame.getState().blocus
    expect(e).not.toBeNull()
    expect(e!.villageId).toBe(FORT.id)
    expect(hommesDeLaLigne(e!.postes)).toBe(8)
    expect(e!.tenue).toBeLessThanOrEqual(TENUE_MAX)
  })

  it('changer de mode lève la ligne', () => {
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    useGame.getState().choisirMode('campagne')
    expect(useGame.getState().blocus).toBeNull()
  })

  it('abandonner la cité la lève aussi', () => {
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    useGame.getState().reset()
    expect(useGame.getState().blocus).toBeNull()
  })

  it('on n’ouvre pas de blocus dans le siège sans fin : personne ne sort', () => {
    regneArme()
    useGame.setState({ mode: 'siege' })
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    expect(useGame.getState().blocus).toBeNull()
  })

  it('passer à l’acte suivant de la campagne lève la ligne', () => {
    /*
     * ⚠️ `choisirMode` ET `reset` PASSENT PAR `etatInitial()`, MAIS PAS
     * `appliquerActe` : il repose la cité champ par champ (`s.battle = null`,
     * `s.expedition = null`, …) et n'avait aucune raison de connaître le blocus. La
     * ligne traversait donc l'acte : ses hommes étaient effacés avec l'ancienne
     * armée, sa ration continuait de sortir d'un grenier tout neuf, et le rapport du
     * matin nommait une place forte d'un monde qui n'existait plus.
     */
    /*
     * ⚠️ IL FAUT UNE VRAIE CAMPAGNE, pas seulement `mode: 'campagne'`. Le premier jet
     * de ce test posait le mode à la main : `acteSuivant` sort alors sur
     * `if (!s.campagne) return` sans jamais appeler `appliquerActe`, et le test
     * passait au vert en ne prouvant rien du tout - il aurait aussi bien passé sans
     * le branchement qu'il est censé garder.
     */
    useGame.getState().choisirMode('campagne')
    useGame.getState().commencerActe()
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    expect(useGame.getState().blocus).not.toBeNull()
    useGame.getState().acteSuivant()
    expect(useGame.getState().blocus).toBeNull()
  })

  it('rejouer un acte lève la ligne aussi - c’est le même chemin', () => {
    useGame.getState().choisirMode('campagne')
    useGame.getState().commencerActe()
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    expect(useGame.getState().blocus).not.toBeNull()
    useGame.getState().rejouerActe()
    expect(useGame.getState().blocus).toBeNull()
  })

  it('une ligne abîmée dans le fichier ne fait pas manger du grain « NaN »', () => {
    /*
     * Le piège 3 du moteur, éprouvé par le seul chemin qui compte : la relecture.
     * Sans désinfection, `postes: { hoplite: '4' }` faisait un `NaN` d'homme, donc
     * une ration `NaN`, donc un grenier `NaN` - et il n'en revenait jamais.
     */
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, LIGNE)
    useGame.setState({
      blocus: {
        ...(useGame.getState().blocus as EtatBlocus),
        postes: { hoplite: '4', lancier: 4 } as unknown as EtatBlocus['postes'],
        volonte: NaN as unknown as number,
      },
    })
    useGame.getState().save()
    useGame.getState().init()
    passerUneJournee()
    expect(Number.isFinite(useGame.getState().resources.grain)).toBe(true)
    expect(useGame.getState().resources.grain).toBeGreaterThan(0)
  })

  it('une sauvegarde d’avant le blocus se reprend sans une ligne fantôme', () => {
    regneArme()
    // le champ n'existe pas dans le fichier : la migration doit le poser à null
    useGame.setState({ blocus: undefined as unknown as null })
    useGame.getState().save()
    useGame.getState().init()
    expect(useGame.getState().blocus).toBeNull()
    // et le jeu bat sans lire `undefined.jours`
    expect(() => useGame.getState().tick()).not.toThrow()
  })

  it('MIN_HOMMES est la borne d’entrée du système, et le store la respecte', () => {
    regneArme()
    useGame.getState().ouvrirBlocus(FORT.id, { lancier: MIN_HOMMES - 1 })
    expect(useGame.getState().blocus).toBeNull()
  })
})
