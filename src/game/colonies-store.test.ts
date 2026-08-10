import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  COLONS_MIN,
  LOYAUTE_INITIALE,
  LOYAUTE_REORIENTATION,
  LOYAUTE_SECOURS,
  SITES_PAR_ID,
  SURSIS_SECOURS,
  cargaison,
  colonieDe,
  colonsDe,
  garnisonRequise,
} from './colonies'
import { DAY_MS } from './data'
import { armeeTotale, jourDe, useGame, type GameState } from './store'
import type { BuildingId, Villageois } from './types'

/*
 * ═══════════ LES COLONIES, PAR LE STORE ═══════════
 *
 * Ce fichier ne teste pas les règles - `colonies.test.ts` le fait, et sans jamais
 * toucher au store. Ici on éprouve les QUATRE COUTURES du moteur, celles où ce
 * système ne peut pas se contenter d'être juste sur le papier :
 *
 *  1. `syncVillageois` tourne à chaque battement et recomplète `s.villageois`
 *     jusqu'à `s.pop` « en retirant d'abord les oisifs ». Embarquer six colons
 *     demande donc DEUX gestes simultanés ; l'un sans l'autre les fait renaître
 *     sous d'autres noms, ou fait disparaître des oisifs au hasard à leur place.
 *  2. Le rattrapage hors ligne avance le calendrier de soixante journées. Un
 *     convoi doit en rendre UN, et une colonie en péril ne doit pas se perdre
 *     pendant qu'on déjeune.
 *  3. Le bloc de vitesse du tick recule toutes les échéances en millisecondes à la
 *     main. Une colonie n'en porte AUCUNE : le test le vérifie en accélérant.
 *  4. `isolation.test.ts` garantit qu'une partie neuve ne garde rien du monde
 *     d'avant. Les colonies sont du MONDE : elles ne traversent ni les modes ni
 *     les règnes.
 *
 * ⚠️ `MODE_TEST` rend `payer()` et `peutPayer()` toujours vrais : aucun cas ici ne
 * peut donc éprouver un refus faute de ressources. C'est `refusFondation` qui
 * juge le reste, et `colonies.test.ts` l'éprouve directement.
 *
 * ⚠️⚠️ LE PIÈGE QUI A COÛTÉ QUATRE CAS À CE FICHIER, et qui n'est écrit nulle part
 * ailleurs : sous vitest, le `tick` remet à CHAQUE BATTEMENT (store.ts ~3591)
 *
 *     for (const r of Object.keys(RES)) s.resources[r] = stockageMax(s)
 *     if (s.pop < popCap(s)) s.pop = popCap(s)
 *
 * Deux conséquences dont aucun test par le store ne se relève :
 *  · UNE CARGAISON NE SE VOIT PAS DANS `s.resources`. Le crochet quotidien tourne
 *    APRÈS ce bloc, il ajoute la cargaison à des coffres déjà pleins, et `clampRes`
 *    la coupe. Un premier jet de ce fichier comparait le grain avant et après :
 *    il tombait de 4000 à 1400 (le plafond de l'agora) et le cas échouait en
 *    annonçant que le convoi faisait MAIGRIR les greniers. On observe donc le
 *    convoi là où il laisse une trace indélébile : le compteur `noter()`
 *    `convoisColonies`, la date `dernierConvoi`, et le toast ;
 *  · UNE AMPUTATION DE POPULATION NE SURVIT PAS À UN BATTEMENT. `pop` remonte au
 *    plafond des habitations, et `syncVillageois` invente les habitants qui
 *    manquent. Ce qui reste vérifiable - et qui est la vraie promesse - c'est que
 *    les NOMS embarqués ne reviennent jamais, et que juste après l'embarquement
 *    `villageois.length === pop`. Cette égalité EST le garde-fou du piège 1 :
 *    c'est elle que `syncVillageois` lit pour décider de recompléter la liste.
 */

/** un habitant nommé, d'un métier choisi - on veut pouvoir dire QUI part */
function habitant(id: string, nom: string, metier: BuildingId, jour: number, p: Partial<Villageois> = {}): Villageois {
  return { id, nom, poste: null, metier, neLe: jour - 15, lignee: nom, ...p }
}

/**
 * Un règne prêt à fonder : port de niveau 3, des coffres, une armée, et DOUZE
 * habitants dont les métiers sont écrits à la main. Le tirage de `syncVillageois`
 * ne doit jamais décider de ce qu'un test observe.
 */
function regneColonisateur(champs: Partial<GameState> = {}): void {
  useGame.getState().reset()
  const now = Date.now()
  const s = useGame.getState()
  // dix journées écoulées : les habitants sont adultes, la cité est installée
  const createdAt = now - 10 * DAY_MS
  const jour = 11
  const villageois: Villageois[] = [
    habitant('v1', 'Damon', 'ferme', jour),
    habitant('v2', 'Théron', 'ferme', jour),
    habitant('v3', 'Kléitos', 'ferme', jour),
    habitant('v4', 'Myron', 'ferme', jour),
    habitant('v5', 'Straton', 'carriere', jour),
    habitant('v6', 'Timon', 'carriere', jour),
    habitant('v7', 'Xanthos', 'scierie', jour),
    habitant('v8', 'Glaukos', 'scierie', jour, { poste: 'scierie' }),
    habitant('v9', 'Phidias', 'forge', jour),
    habitant('v10', 'Eumée', 'port', jour),
    habitant('v11', 'Briséis', 'temple', jour, { conjoint: 'v12' }),
    habitant('v12', 'Danaé', 'ferme', jour, { conjoint: 'v11' }),
  ]
  useGame.setState({
    createdAt,
    lastSeen: now,
    mode: 'bac-a-sable',
    tutorialDone: true,
    pop: villageois.length,
    villageois,
    dernierJourVecu: jour,
    // sous le plafond de l'agora niveau 4 (2800) : des coffres qui dépassent leur
    // entrepôt auraient rendu illisible tout ce que `clampRes` fait aux cargaisons
    resources: { bois: 2000, pierre: 2000, grain: 2000, bronze: 1200 },
    buildings: { ...s.buildings, port: { level: 3 }, agora: { level: 4 }, maisons: { level: 3 } },
    army: { lancier: 8, archer: 4, hoplite: 3, frondeur: 0, peltaste: 0, belier: 0, char: 0 },
    colonies: [],
    // rien ne doit venir troubler l'observation
    nextAttackAt: now + 60 * 60_000,
    prochainAppelAt: now + 60 * 60_000,
    lastEventAt: now,
    ...champs,
  })
}

/**
 * Deux paysans et LES DEUX SEULS tailleurs de pierre du village : c'est ce
 * dernier point qui compte, il faut un métier entièrement vidé pour éprouver la
 * promesse du panneau (« le village n'en aura plus un »).
 */
const EQUIPAGE = ['v1', 'v2', 'v5', 'v6']

beforeEach(() => {
  useGame.getState().reset()
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('embarquer des colons est une amputation, et le moteur doit la tenir', () => {
  it('les colons quittent la liste ET le compte de population - la liste ne se contredit pas', () => {
    /*
     * ⚠️ LE PIÈGE DE `syncVillageois`. Il tourne à chaque battement et recomplète
     * `s.villageois` jusqu'à `s.pop` en retirant « d'abord les oisifs ». Retirer
     * quatre noms sans décrémenter `pop` les fait donc revenir au battement suivant,
     * sous d'autres noms et avec d'autres métiers - le joueur aurait embarqué ses
     * tailleurs de pierre et retrouvé deux inconnus à leur place. Décrémenter `pop`
     * sans retirer les bons aurait fait disparaître des oisifs au hasard.
     *
     * L'ÉGALITÉ `villageois.length === pop` EST LE GARDE-FOU, et elle se lit sans
     * battement : c'est exactement la comparaison que `syncVillageois` fait pour
     * décider s'il doit fabriquer quelqu'un. Si un jour l'un des deux gestes
     * disparaît, ce cas tombe ici, avant que le tick n'ait rien pu masquer.
     */
    regneColonisateur()
    const avant = useGame.getState().pop
    useGame.getState().fonderColonie('anse-aux-mouettes', 'grenier', EQUIPAGE, 2)

    const s = useGame.getState()
    expect(s.pop).toBe(avant - EQUIPAGE.length)
    expect(s.villageois).toHaveLength(avant - EQUIPAGE.length)
    expect(s.villageois.length).toBe(s.pop)
    for (const id of EQUIPAGE) expect(s.villageois.some((v) => v.id === id)).toBe(false)
    // le village n'a plus un seul tailleur de pierre : c'est le prix, et il est réel
    expect(s.villageois.filter((v) => v.metier === 'carriere')).toHaveLength(0)
  })

  it('ceux qui ont embarqué ne reviennent JAMAIS, quel que soit le nombre de battements', () => {
    /*
     * Ce que le battement peut encore prouver, une fois admis que `pop` remonte au
     * plafond sous vitest (voir l'en-tête) : les NOMS partis ne reparaissent pas.
     * `syncVillageois` fabrique des habitants neufs avec des `id` neufs ; si l'un des
     * quatre `v1/v2/v5/v6` réapparaissait, c'est que la liste et le compte se
     * seraient contredits et que le moteur aurait « réparé » l'écart en les rendant.
     */
    regneColonisateur()
    useGame.getState().fonderColonie('anse-aux-mouettes', 'grenier', EQUIPAGE, 2)
    for (let i = 0; i < 5; i++) useGame.getState().tick()
    const s = useGame.getState()
    for (const id of EQUIPAGE) expect(s.villageois.some((v) => v.id === id)).toBe(false)
    // et la colonie, elle, garde bien ses deux tailleurs de pierre
    expect(colonieDe(s.colonies, 'anse-aux-mouettes')!.metiers.filter((m) => m === 'carriere')).toHaveLength(2)
  })

  it('ce sont bien les métiers choisis qui partent, pas des oisifs au hasard', () => {
    regneColonisateur()
    useGame.getState().fonderColonie('anse-aux-mouettes', 'grenier', EQUIPAGE, 2)
    const c = colonieDe(useGame.getState().colonies, 'anse-aux-mouettes')!
    expect(c.metiers.filter((m) => m === 'carriere')).toHaveLength(2)
    expect(c.metiers.filter((m) => m === 'ferme')).toHaveLength(2)
    // le village n'a plus un seul tailleur de pierre : c'est le prix, et il est réel
    expect(useGame.getState().villageois.filter((v) => v.metier === 'carriere')).toHaveLength(0)
  })

  it('celui qui reste devient veuf : on ne laisse pas un foyer fantôme', () => {
    /*
     * `vieDesFamilles` appelle `veuvage` à chaque départ, et pour une raison
     * mesurable : un conjoint qui garde le lien vers un absent n'est plus un parti
     * possible, et `foyersFeconds` le compte comme un foyer qui ne fera jamais
     * d'enfant. Le village cesse de croître sans qu'on sache pourquoi.
     */
    regneColonisateur()
    useGame.getState().fonderColonie('anse-aux-mouettes', 'grenier', ['v1', 'v2', 'v5', 'v11'], 2)
    const reste = useGame.getState().villageois.find((v) => v.id === 'v12')!
    expect(reste.conjoint).toBeUndefined()
  })

  it('la garnison laissée sur place quitte votre armée pour de bon', () => {
    regneColonisateur()
    const avant = armeeTotale(useGame.getState().army)
    useGame.getState().fonderColonie('anse-aux-mouettes', 'grenier', EQUIPAGE, 3)
    expect(armeeTotale(useGame.getState().army)).toBe(avant - 3)
    expect(colonieDe(useGame.getState().colonies, 'anse-aux-mouettes')!.garnison).toBe(3)
  })

  it('la fondation laisse une trace dans la chronique - c’est un fait de règne', () => {
    regneColonisateur()
    useGame.getState().fonderColonie('anse-aux-mouettes', 'grenier', EQUIPAGE, 2)
    const s = useGame.getState()
    expect(s.reports.some((r) => r.titre.includes('L’anse aux Mouettes'))).toBe(true)
  })

  it('un port de grève ne fonde rien, et le refus se dit', () => {
    regneColonisateur()
    const s0 = useGame.getState()
    useGame.setState({ buildings: { ...s0.buildings, port: { level: 1 } } })
    useGame.getState().fonderColonie('anse-aux-mouettes', 'grenier', EQUIPAGE, 2)
    expect(useGame.getState().colonies).toHaveLength(0)
    expect(useGame.getState().toasts.length).toBeGreaterThan(0)
  })

  it('on ne fonde pas deux fois sur la même côte', () => {
    regneColonisateur()
    useGame.getState().fonderColonie('anse-aux-mouettes', 'grenier', EQUIPAGE, 2)
    useGame.getState().fonderColonie('anse-aux-mouettes', 'foret', ['v3', 'v4', 'v7', 'v9'], 2)
    expect(useGame.getState().colonies).toHaveLength(1)
    expect(useGame.getState().villageois.some((v) => v.id === 'v3')).toBe(true)
  })

  it('embarquer moins de quatre adultes ne fonde rien du tout', () => {
    regneColonisateur()
    useGame.getState().fonderColonie('anse-aux-mouettes', 'grenier', EQUIPAGE.slice(0, COLONS_MIN - 1), 2)
    expect(useGame.getState().colonies).toHaveLength(0)
    expect(useGame.getState().pop).toBe(12)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('le convoi se compte en journées, et une absence n’en fait pas rentrer soixante', () => {
  /** avance le calendrier de `n` journées comme le fait le rattrapage hors ligne */
  function avancerDe(n: number): void {
    const s = useGame.getState()
    useGame.setState({ createdAt: s.createdAt - n * DAY_MS })
    useGame.getState().tick()
  }

  it('une journée franchie fait rentrer une cargaison, et une seule', () => {
    /*
     * ⚠️ On n'observe PAS `s.resources` : sous vitest le tick remplit les coffres au
     * plafond avant le crochet quotidien, et `clampRes` coupe la cargaison. Le convoi
     * laisse deux traces que rien ne remplit : son compteur et sa date.
     */
    regneColonisateur()
    useGame.getState().fonderColonie('anse-aux-mouettes', 'grenier', EQUIPAGE, 2)

    avancerDe(SITES_PAR_ID['anse-aux-mouettes'].journees)

    const apres = useGame.getState()
    expect(apres.exploits.convoisColonies).toBe(1)
    expect(colonieDe(apres.colonies, 'anse-aux-mouettes')!.dernierConvoi).toBe(jourDe(apres))
    // et le joueur l'apprend : le toast nomme la côte et ce qu'elle envoie
    expect(apres.toasts.some((t) => t.msg.includes('Convoi de L’anse aux Mouettes'))).toBe(true)
  })

  it('huit heures d’absence rendent UN convoi, pas vingt', () => {
    /*
     * `OFFLINE_CAP_MS` = 8 h et `DAY_MS` = 8 min : soixante journées d'un coup. Le
     * crochet quotidien ne rattrape jamais plus d'une journée : le compteur des
     * convois doit donc valoir UN, pas vingt. C'est la formulation la plus directe du
     * piège 4, et la seule que le remplissage des coffres sous vitest ne masque pas.
     */
    regneColonisateur()
    useGame.getState().fonderColonie('anse-aux-mouettes', 'grenier', EQUIPAGE, 2)

    avancerDe(60)

    expect(useGame.getState().exploits.convoisColonies).toBe(1)
    // et la cargaison est celle du délai NOMINAL : rien dans `cargaison` ne lit le jour
    const c = colonieDe(useGame.getState().colonies, 'anse-aux-mouettes')!
    expect(cargaison(c).n).toBe(cargaison({ ...c, dernierConvoi: 0 }).n)
  })

  it('accélérer le jeu accélère les convois dans la même proportion - rien à décaler', () => {
    /*
     * Le bloc de vitesse du tick recule `createdAt` de `dtMs * (vitesse - 1)`.
     * Comme `fondeeLe` et `dernierConvoi` sont des numéros de journée déduits de ce
     * même `createdAt`, ils s'accélèrent d'eux-mêmes : AUCUNE ligne à ajouter dans
     * ce bloc, et c'est précisément ce que ce cas garde fermé.
     */
    regneColonisateur()
    useGame.getState().fonderColonie('anse-aux-mouettes', 'grenier', EQUIPAGE, 2)
    const c = colonieDe(useGame.getState().colonies, 'anse-aux-mouettes')!
    expect(c.dernierConvoi).toBeLessThan(1000)
    expect(c.fondeeLe).toBeLessThan(1000)
    // à ×8, deux journées de calendrier passent : le convoi arrive, sans qu'une seule
    // échéance ait eu à être reculée dans le bloc de vitesse
    useGame.setState({ vitesse: 8 })
    avancerDe(2)
    expect(useGame.getState().exploits.convoisColonies).toBe(1)
  })

  it('une colonie en péril ne se perd pas pendant qu’on déjeune', () => {
    /*
     * Le sursis est un compte de journées VÉCUES, décrémenté par le crochet
     * quotidien - qui ne rattrape jamais plus d'une journée. Soixante journées
     * d'absence ne peuvent donc en consommer qu'une, et la colonie appelle encore
     * au réveil. C'est la leçon des successions : ce qui se décide ne se résout pas
     * tout seul.
     */
    regneColonisateur()
    useGame.getState().fonderColonie('anse-aux-mouettes', 'grenier', EQUIPAGE, 2)
    const colonies = useGame.getState().colonies.map((c) => ({
      ...c,
      epreuve: { id: 'famine' as const, sursis: SURSIS_SECOURS },
    }))
    useGame.setState({ colonies })

    avancerDe(60)

    const c = colonieDe(useGame.getState().colonies, 'anse-aux-mouettes')
    expect(c).not.toBeNull()
    expect(c!.epreuve).not.toBeNull()
    expect(c!.epreuve!.sursis).toBe(SURSIS_SECOURS - 1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('les quatre arbitrages, et ce qu’ils coûtent', () => {
  it('secourir une famine paie du grain et rend de la loyauté', () => {
    regneColonisateur()
    useGame.getState().fonderColonie('anse-aux-mouettes', 'grenier', EQUIPAGE, 2)
    useGame.setState({
      colonies: useGame.getState().colonies.map((c) => ({
        ...c,
        loyaute: 40,
        epreuve: { id: 'famine' as const, sursis: 2 },
      })),
    })

    useGame.getState().secourirColonie('anse-aux-mouettes')

    const c = colonieDe(useGame.getState().colonies, 'anse-aux-mouettes')!
    expect(c.epreuve).toBeNull()
    expect(c.loyaute).toBe(40 + LOYAUTE_SECOURS.famine)
  })

  it('secourir un raid détache des soldats, et ils restent là-bas', () => {
    regneColonisateur()
    useGame.getState().fonderColonie('crique-des-marchands', 'comptoir', EQUIPAGE, 0)
    useGame.setState({
      colonies: useGame.getState().colonies.map((c) => ({ ...c, epreuve: { id: 'raid' as const, sursis: 1 } })),
    })
    const armeeAvant = armeeTotale(useGame.getState().army)

    useGame.getState().secourirColonie('crique-des-marchands')

    const c = colonieDe(useGame.getState().colonies, 'crique-des-marchands')!
    expect(c.epreuve).toBeNull()
    expect(c.garnison).toBe(garnisonRequise(c))
    expect(armeeTotale(useGame.getState().army)).toBe(armeeAvant - garnisonRequise(c))
  })

  it('réorienter se paie en rancune et coûte le convoi en préparation', () => {
    regneColonisateur()
    useGame.getState().fonderColonie('ile-de-schiste', 'carriere', EQUIPAGE, 3)
    const avant = colonieDe(useGame.getState().colonies, 'ile-de-schiste')!

    useGame.getState().reorienterColonie('ile-de-schiste', 'foret')

    const apres = colonieDe(useGame.getState().colonies, 'ile-de-schiste')!
    expect(apres.vocation).toBe('foret')
    expect(apres.loyaute).toBe(LOYAUTE_INITIALE - LOYAUTE_REORIENTATION)
    // le convoi repart de zéro : on a défait ce qui était chargé
    expect(apres.dernierConvoi).toBeGreaterThanOrEqual(avant.dernierConvoi)
    expect(apres.dernierConvoi).toBe(jourDe(useGame.getState()))
  })

  it('renforcer prend les hommes sur vos remparts', () => {
    regneColonisateur()
    useGame.getState().fonderColonie('val-de-l-ida', 'foret', EQUIPAGE, 1)
    const avant = armeeTotale(useGame.getState().army)
    useGame.getState().renforcerColonie('val-de-l-ida', 3)
    expect(armeeTotale(useGame.getState().army)).toBe(avant - 3)
    expect(colonieDe(useGame.getState().colonies, 'val-de-l-ida')!.garnison).toBe(4)
  })

  it('abandonner ramène les soldats et jamais les colons', () => {
    /*
     * C'est la sting du système, et elle est délibérée : une garnison peut
     * rembarquer, des familles qui ont brûlé leurs nefs ne rentrent pas. La
     * population du village ne remonte donc pas d'un seul point.
     */
    regneColonisateur()
    useGame.getState().fonderColonie('anse-aux-mouettes', 'grenier', EQUIPAGE, 3)
    const popApresFondation = useGame.getState().pop
    const armee = armeeTotale(useGame.getState().army)

    useGame.getState().abandonnerColonie('anse-aux-mouettes')

    const s = useGame.getState()
    expect(s.colonies).toHaveLength(0)
    expect(armeeTotale(s.army)).toBe(armee + 3)
    expect(s.pop).toBe(popApresFondation)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('une colonie qu’on néglige finit par ne plus être à vous', () => {
  it('la loyauté tombée ouvre la sécession, et la sécession la fait perdre', () => {
    regneColonisateur()
    useGame.getState().fonderColonie('anse-aux-mouettes', 'grenier', EQUIPAGE, 0)
    useGame.setState({
      colonies: useGame.getState().colonies.map((c) => ({ ...c, loyaute: 5, epreuve: { id: 'revolte' as const, sursis: 1 } })),
    })

    const s0 = useGame.getState()
    useGame.setState({ createdAt: s0.createdAt - DAY_MS })
    useGame.getState().tick()

    const s = useGame.getState()
    expect(s.colonies).toHaveLength(0)
    expect(s.reports.some((r) => r.lignes.join(' ').includes('étendard'))).toBe(true)
    /*
     * Que les colons ne rentrent pas se lit dans le COMPTEUR de la perte, et non dans
     * `pop` : sous vitest le tick vient de remonter la population au plafond des
     * habitations. La promesse « on ne récupère rien d'une colonie perdue » est
     * éprouvée là où elle est observable - `abandonnerColonie`, plus bas, où aucun
     * battement n'intervient.
     */
    expect(s.exploits.coloniesPerdues).toBe(1)
  })

  it('un raid contre une palissade tenue est repoussé sans qu’on ait à y aller', () => {
    /*
     * ⚠️ CE CAS ÉTAIT ALÉATOIRE, DEUX FOIS, et les deux défauts se masquaient l'un
     * l'autre :
     *  · chaque raid repoussé COÛTE un homme (`c.garnison - 1`). Avec `menace + 1`
     *    hommes, deux raids suffisaient à faire tomber la garnison sous le seuil, et
     *    le troisième ouvrait une vraie épreuve. D'où la marge, calculée : six
     *    journées ne peuvent coûter que six hommes ;
     *  · surtout, la FAMINE se tire tous les jours (7 %, 14 % en hiver) et emporte la
     *    colonie quatre journées plus tard. Une fois sur deux, la boucle lisait donc
     *    `null` - et la promesse éprouvée n'était plus celle du titre.
     *
     * On fixe donc le dé : à 0,05, le tirage du raid passe (p ≈ 0,24 à menace 100) et
     * il passe AVANT celui de la famine dans `tirerEpreuve`. Six journées de raids,
     * six raids repoussés, et le cas dit exactement ce qu'il annonce.
     */
    regneColonisateur()
    const de = vi.spyOn(Math, 'random').mockReturnValue(0.05)
    try {
      const site = 'anse-aux-mouettes'
      const large = SITES_PAR_ID[site].menace + 7
      useGame.getState().fonderColonie(site, 'grenier', EQUIPAGE, large)
      expect(colonieDe(useGame.getState().colonies, site)!.garnison).toBe(large)
      useGame.setState({ threat: 100 })
      for (let j = 1; j <= 6; j++) {
        const s = useGame.getState()
        useGame.setState({ createdAt: s.createdAt - DAY_MS })
        useGame.getState().tick()
        const encore = colonieDe(useGame.getState().colonies, site)
        expect(encore).not.toBeNull()
        expect(encore!.epreuve).toBeNull()
        expect(encore!.garnison).toBeGreaterThanOrEqual(garnisonRequise(encore!))
      }
      // un homme par raid repoussé : la défense à distance n'est pas gratuite
      expect(colonieDe(useGame.getState().colonies, 'anse-aux-mouettes')!.garnison).toBe(large - 6)
      expect(useGame.getState().reports.filter((r) => r.titre.startsWith('Raid repoussé')).length).toBeGreaterThan(0)
    } finally {
      de.mockRestore()
    }
  })

  it('six béliers ne couvrent pas un raid : le secours en hommes exige des hommes', () => {
    /*
     * DÉFAUT TROUVÉ EN RELECTURE. Le contrôle d'effectif passait par `armeeTotale`,
     * qui additionne les SEPT unités - béliers et chars compris - alors que
     * `detacherSoldats` n'en prend jamais un seul. Un règne à six béliers et zéro
     * fantassin franchissait donc le contrôle, ne détachait personne, et l'épreuve se
     * fermait quand même : le raid était couvert GRATUITEMENT, et le panneau allumait
     * son bouton par le même mauvais calcul. C'est `soldatsDetachables` qui juge.
     */
    regneColonisateur({ army: { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 6, char: 2 } })
    useGame.getState().fonderColonie('crique-des-marchands', 'comptoir', EQUIPAGE, 0)
    useGame.setState({
      colonies: useGame.getState().colonies.map((c) => ({ ...c, epreuve: { id: 'raid' as const, sursis: 2 } })),
    })

    useGame.getState().secourirColonie('crique-des-marchands')

    const c = colonieDe(useGame.getState().colonies, 'crique-des-marchands')!
    expect(c.epreuve).not.toBeNull()
    expect(c.garnison).toBe(0)
    // les engins sont toujours au parc : on n'en a pas « converti » un en fantassin
    expect(useGame.getState().army.belier).toBe(6)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('les colonies sont du MONDE : elles ne traversent ni les modes ni les règnes', () => {
  it('fonder une partie neuve laisse l’outre-mer derrière soi', () => {
    /*
     * `isolation.test.ts` garantit cette frontière pour `expeditions`, `alliances`,
     * `technos`… Une colonie appartient à la même famille : elle est au règne, pas
     * au joueur. La laisser traverser reproduirait exactement le reproche du joueur
     * (« j'ai toujours les villages pillés de mon autre sauvegarde »).
     */
    regneColonisateur()
    useGame.getState().fonderColonie('anse-aux-mouettes', 'grenier', EQUIPAGE, 2)
    expect(useGame.getState().colonies).toHaveLength(1)

    useGame.getState().choisirMode('campagne')
    expect(useGame.getState().colonies).toEqual([])

    useGame.getState().reset()
    expect(useGame.getState().colonies).toEqual([])
  })

  it('une colonie survit à une sauvegarde et à un rechargement', () => {
    regneColonisateur()
    useGame.getState().fonderColonie('ile-de-schiste', 'carriere', EQUIPAGE, 3)
    useGame.getState().save()
    useGame.getState().init()
    const c = colonieDe(useGame.getState().colonies, 'ile-de-schiste')
    expect(c).not.toBeNull()
    expect(c!.vocation).toBe('carriere')
    expect(colonsDe(c!)).toBe(EQUIPAGE.length)
  })

  it('une sauvegarde d’avant les colonies se recharge sans une colonie fantôme', () => {
    /*
     * `Object.assign(s, etatInitial(now), data, …)` : un fichier écrit avant ce
     * système n'a pas la clé `colonies`, il garde donc celle d'`etatInitial` - un
     * tableau vide. La migration ne doit rien fabriquer, et surtout pas planter à
     * la première lecture de `s.colonies.length`.
     */
    regneColonisateur()
    useGame.getState().save()
    const brut = JSON.parse(localStorage.getItem('palladion-save-v1') ?? '{}') as Record<string, unknown>
    delete brut.colonies
    localStorage.setItem('palladion-save-v1', JSON.stringify(brut))

    useGame.getState().init()
    expect(useGame.getState().colonies).toEqual([])
  })
})
