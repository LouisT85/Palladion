import { describe, expect, it } from 'vitest'
import { RENDEMENT_HORS_METIER, VALEUR_RES } from './data'
import {
  COLONIES_MAX,
  COLONS_MAX,
  COLONS_MIN,
  COLONS_SURVIE,
  COUT_FONDATION,
  EPREUVES,
  LOYAUTE_EPREUVE_IGNOREE,
  LOYAUTE_GARNISON_MANQUANTE,
  LOYAUTE_INITIALE,
  LOYAUTE_PAR_JOUR,
  LOYAUTE_REVOLTE,
  POP_PLANCHER,
  PORT_MINIMUM,
  SITES_COLONIE,
  SITES_PAR_ID,
  SURSIS_SECOURS,
  VALEUR_PAR_COLON_JOUR,
  VOCATIONS,
  VOCATION_IDS,
  attenteConvoi,
  brasUtiles,
  cargaison,
  colonsDe,
  comptesMetier,
  convoiPret,
  creerColonie,
  garnisonRequise,
  garnisonSuffisante,
  issueEpreuve,
  journeeDuConvoi,
  loyauteApres,
  motifRefusColonie,
  phraseSaignee,
  raidRepousse,
  refusFondation,
  saignee,
  sitesLibres,
  soldatsDetachables,
  soldatsSecours,
  tirerEpreuve,
  type Colonie,
  type SnapColonies,
} from './colonies'
import type { BuildingId } from './types'

/*
 * ═══════════════════ LES COLONIES, ET LES TROIS PIÈGES ═══════════════════
 *
 * Ce système touche les trois endroits où ce jeu s'est déjà brûlé, et ces tests
 * sont écrits pour les trois.
 *
 *  · LE TEMPS. Le store a deux façons de faire avancer le calendrier : le bloc de
 *    vitesse du tick, qui recule `createdAt` pour simuler ×8, et le rattrapage
 *    hors ligne, qui peut avancer de soixante journées d'un coup. Une colonie qui
 *    aurait porté un `prochainConvoiAt` en millisecondes aurait mis huit fois trop
 *    longtemps à ×8, et une nuit d'absence aurait fait rentrer vingt cargaisons.
 *    Ces tests exigent qu'un convoi rende UNE cargaison de taille NOMINALE, quelle
 *    que soit la durée de l'absence, et qu'un appel au secours ne se tranche jamais
 *    plus d'une journée à la fois.
 *
 *  · LA SURFACE D'ÉTAT. Un seul champ, huit propriétés, et tout le reste dérivé.
 *    Les tests lisent donc toujours par les fonctions de lecture (`colonsDe`,
 *    `journeeDuConvoi`, `cargaison`) : si l'une d'elles devenait un champ stocké,
 *    ils continueraient de passer, mais le premier désaccord entre deux sources
 *    serait visible ailleurs.
 *
 *  · L'ARITHMÉTIQUE QUI EXISTE DÉJÀ. Un colon hors de son métier rend
 *    `RENDEMENT_HORS_METIER`, la constante du village ; une cargaison de bronze se
 *    divise par `VALEUR_RES.bronze`. Un système qui s'ajoute n'invente pas ses
 *    chiffres, et ces tests le vérifient contre les tables d'origine.
 */

const PAYSANS: BuildingId[] = ['ferme', 'ferme', 'ferme', 'ferme', 'ferme', 'ferme']

function colonie(p: Partial<Colonie> = {}): Colonie {
  return {
    site: 'anse-aux-mouettes',
    fondeeLe: 10,
    metiers: [...PAYSANS],
    vocation: 'grenier',
    dernierConvoi: 10,
    garnison: 2,
    loyaute: LOYAUTE_INITIALE,
    epreuve: null,
    ...p,
  }
}

function snap(p: Partial<SnapColonies> = {}): SnapColonies {
  return { port: 3, colonies: [], pop: 20, nefLibre: true, ...p }
}

// ═══════════════════════════════════════════════════════════════════════════════
describe('fonder est un renoncement, et le panneau doit le dire avant le clic', () => {
  it('le décompte nomme le métier que le village perd entièrement', () => {
    const village: BuildingId[] = ['ferme', 'ferme', 'carriere', 'carriere', 'scierie', 'temple', 'port']
    const lignes = saignee(village, ['carriere', 'carriere', 'ferme', 'scierie'])
    const carriere = lignes.find((l) => l.metier === 'carriere')!
    expect(carriere.avant).toBe(2)
    expect(carriere.part).toBe(2)
    expect(carriere.reste).toBe(0)
    expect(carriere.dernier).toBe(true)
    // la ferme en garde un : ce n'est pas la même douleur
    expect(lignes.find((l) => l.metier === 'ferme')!.dernier).toBe(false)
  })

  it('les métiers qu’on vide entièrement se lisent en premier', () => {
    const village: BuildingId[] = ['ferme', 'ferme', 'ferme', 'carriere', 'scierie']
    const lignes = saignee(village, ['ferme', 'carriere', 'scierie', 'ferme'])
    // deux métiers vidés (carrière, scierie) avant la ferme qui garde un bras
    expect(lignes[lignes.length - 1].metier).toBe('ferme')
    expect(lignes.slice(0, 2).every((l) => l.dernier)).toBe(true)
  })

  it('la phrase qui arrête la main est écrite, pas laissée au composant', () => {
    const village: BuildingId[] = ['carriere', 'carriere', 'ferme', 'ferme', 'ferme']
    const phrase = phraseSaignee(saignee(village, ['carriere', 'carriere', 'ferme', 'ferme']))
    expect(phrase).toContain('vos deux seuls tailleurs de pierre')
    // le singulier se dit au singulier - une phrase fausse ne convainc personne
    const seul = phraseSaignee(saignee(['temple', 'ferme', 'ferme', 'ferme'], ['temple', 'ferme', 'ferme', 'ferme']))
    expect(seul).toContain('votre seul prêtre')
  })

  it('le décompte accorde ses pluriels, pas seulement la phrase', () => {
    /*
     * DÉFAUT VU À L'ÉCRAN, pas dans le code : la liste du contrat écrivait « 2
     * tailleur de pierre sur 2 » une ligne AU-DESSUS d'une phrase qui, elle,
     * accordait. Le `s` sur le premier mot ne valait que pour `phraseSaignee`. Une
     * faute d'accord juste au-dessus du chiffre le plus lourd du jeu suffit à faire
     * douter de tous les autres.
     */
    expect(comptesMetier('Tailleur de pierre', 2)).toBe('2 tailleurs de pierre')
    expect(comptesMetier('Tailleur de pierre', 1)).toBe('1 tailleur de pierre')
    expect(comptesMetier('Prêtre', 3)).toBe('3 prêtres')
    expect(comptesMetier('Prêtre', 1)).toBe('1 prêtre')
  })

  it('un embarquement qui ne prive de rien ne fabrique pas de drame', () => {
    const village: BuildingId[] = ['ferme', 'ferme', 'ferme', 'ferme', 'ferme', 'ferme']
    expect(phraseSaignee(saignee(village, ['ferme', 'ferme', 'ferme', 'ferme']))).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('la fondation se refuse, et le refus s’explique', () => {
  it('on ne fonde pas outre-mer depuis une grève', () => {
    expect(refusFondation(snap({ port: PORT_MINIMUM - 1 }), 'anse-aux-mouettes', PAYSANS)).toBe('port')
    expect(refusFondation(snap({ port: PORT_MINIMUM }), 'anse-aux-mouettes', PAYSANS)).toBeNull()
  })

  it('il faut une nef libre - et la colonie en retient une tant qu’elle vit', () => {
    expect(refusFondation(snap({ nefLibre: false }), 'anse-aux-mouettes', PAYSANS)).toBe('nef')
  })

  it('trois colonies au plus, et jamais deux fois la même côte', () => {
    const trois = SITES_COLONIE.slice(0, COLONIES_MAX).map((s) => colonie({ site: s.id }))
    expect(refusFondation(snap({ colonies: trois }), SITES_COLONIE[3].id, PAYSANS)).toBe('complet')
    expect(refusFondation(snap({ colonies: [colonie()] }), 'anse-aux-mouettes', PAYSANS)).toBe('site')
    expect(refusFondation(snap(), 'cap-inconnu', PAYSANS)).toBe('site')
  })

  it('quatre colons au moins, huit au plus', () => {
    const trop = Array.from({ length: COLONS_MAX + 1 }, () => 'ferme' as BuildingId)
    const pas_assez = Array.from({ length: COLONS_MIN - 1 }, () => 'ferme' as BuildingId)
    expect(refusFondation(snap({ pop: 40 }), 'anse-aux-mouettes', trop)).toBe('colons')
    expect(refusFondation(snap(), 'anse-aux-mouettes', pas_assez)).toBe('colons')
  })

  it('le village ne se vide pas pour peupler la colonie', () => {
    /*
     * Sans ce plancher, on pouvait embarquer les sept fondateurs : `pop` tombait à
     * un, `syncVillageois` ne recomplétait rien (c'est bien ce qu'on veut) et le
     * joueur se retrouvait devant une agora déserte sans l'avoir compris.
     */
    expect(refusFondation(snap({ pop: POP_PLANCHER + 3 }), 'anse-aux-mouettes', PAYSANS)).toBe('village')
    expect(refusFondation(snap({ pop: POP_PLANCHER + 6 }), 'anse-aux-mouettes', PAYSANS)).toBeNull()
  })

  it('chaque refus se dit au joueur en une phrase qu’il peut corriger', () => {
    for (const r of ['port', 'nef', 'complet', 'site', 'colons', 'village'] as const) {
      const m = motifRefusColonie(r)
      expect(m.length).toBeGreaterThan(20)
      expect(m.includes("'")).toBe(false)
    }
  })

  it('fonder coûte plus qu’un niveau d’agora et bien moins qu’une merveille', () => {
    // la métrique du comptoir, celle qui compare des choses différentes
    const valeur = (Object.entries(COUT_FONDATION) as [keyof typeof VALEUR_RES, number][]).reduce(
      (a, [r, n]) => a + n * VALEUR_RES[r],
      0,
    )
    // agora niveau 4 : bois 520 + pierre 480 + bronze 80 = 1440 en valeur
    expect(valeur).toBeGreaterThan(1440)
    // la plus modeste des merveilles pèse plus de 5000
    expect(valeur).toBeLessThan(5000)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('la colonie n’est pas un second village : elle rend, on n’y touche pas', () => {
  it('le premier convoi n’arrive pas le matin de la fondation', () => {
    const c = creerColonie('anse-aux-mouettes', 'grenier', PAYSANS, 2, 12)
    expect(convoiPret(c, 12)).toBe(false)
    expect(journeeDuConvoi(c)).toBe(12 + SITES_PAR_ID['anse-aux-mouettes'].journees)
    expect(attenteConvoi(c, 12)).toBe(SITES_PAR_ID['anse-aux-mouettes'].journees)
  })

  it('un colon hors de son métier rend ce que le village lui accorde ailleurs', () => {
    /*
     * `RENDEMENT_HORS_METIER` est la constante que le joueur a DÉJÀ apprise en
     * affectant ses postes. Un système qui s'ajoute n'invente pas son arithmétique.
     */
    const paysans = colonie({ metiers: ['ferme', 'ferme', 'ferme', 'ferme'] })
    const auBois = colonie({ metiers: ['scierie', 'scierie', 'scierie', 'scierie'] })
    expect(brasUtiles(paysans)).toBe(4)
    expect(brasUtiles(auBois)).toBeCloseTo(4 * RENDEMENT_HORS_METIER, 6)
  })

  it('la cargaison suit les bras utiles, l’affinité du site et la loyauté', () => {
    const c = colonie({ loyaute: 100, garnison: 9 })
    const site = SITES_PAR_ID[c.site]
    const attendu = 6 * VALEUR_PAR_COLON_JOUR * site.journees * site.affinites.grenier * 1
    expect(cargaison(c)).toEqual({ res: 'grain', n: Math.round(attendu / VALEUR_RES.grain) })
    // une colonie tiède rend moins, jamais rien
    const tiede = cargaison(colonie({ loyaute: 40 }))
    expect(tiede.n).toBeGreaterThan(0)
    expect(tiede.n).toBeLessThan(cargaison(c).n)
  })

  it('le lingot se divise par sa valeur : une colonie de bronze ne rend pas quatre fois trop', () => {
    /*
     * `VALEUR_RES.bronze` vaut 4. Sans cette division, un comptoir aurait rendu
     * autant de lingots qu'un grenier rend de mesures d'orge - c'est-à-dire quatre
     * fois la valeur, en silence.
     */
    const dockers: BuildingId[] = ['port', 'port', 'port', 'port', 'port', 'port']
    const comptoir = colonie({ site: 'crique-des-marchands', vocation: 'comptoir', metiers: dockers, loyaute: 100 })
    const site = SITES_PAR_ID['crique-des-marchands']
    const valeur = 6 * VALEUR_PAR_COLON_JOUR * site.journees * site.affinites.comptoir
    expect(cargaison(comptoir)).toEqual({ res: 'bronze', n: Math.round(valeur / VALEUR_RES.bronze) })
    expect(cargaison(comptoir).n).toBeLessThan(valeur)
  })

  it('la distance change la taille des convois, pas le débit', () => {
    /*
     * Piège de conception qu'un premier jet avait : une cargaison FIXE rendait le
     * site le plus proche strictement meilleur, puisqu'il l'envoyait deux fois plus
     * souvent. La cargaison est donc proportionnelle au délai nominal, et l'on
     * choisit un site pour sa terre, non pour sa distance.
     */
    const metiers: BuildingId[] = ['scierie', 'scierie', 'scierie', 'scierie']
    const debit = (siteId: string) => {
      const c = colonie({ site: siteId, vocation: 'foret', metiers, loyaute: 100 })
      return cargaison(c).n / SITES_PAR_ID[siteId].journees
    }
    const proche = debit('anse-aux-mouettes')
    const loin = debit('val-de-l-ida')
    // le val de l'Ida ne gagne QUE par son affinité au bois (1,4 contre 0,95)
    expect(loin / proche).toBeCloseTo(1.4 / 0.95, 1)
  })

  it('chaque vocation a sa ressource, et aucune n’en partage une autre', () => {
    expect(VOCATION_IDS).toHaveLength(4)
    const res = VOCATION_IDS.map((v) => VOCATIONS[v].res)
    expect(new Set(res).size).toBe(4)
  })

  it('aucun site n’est le meilleur partout : le choix du site est un vrai choix', () => {
    for (const v of VOCATION_IDS) {
      const meilleur = SITES_COLONIE.reduce((a, b) => (b.affinites[v] > a.affinites[v] ? b : a))
      // celui qui gagne pour cette vocation en perd au moins une autre
      expect(VOCATION_IDS.some((autre) => meilleur.affinites[autre] < 1)).toBe(true)
    }
    // et les quatre vocations n'ont pas le même champion
    const champions = VOCATION_IDS.map(
      (v) => SITES_COLONIE.reduce((a, b) => (b.affinites[v] > a.affinites[v] ? b : a)).id,
    )
    expect(new Set(champions).size).toBe(4)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('huit heures d’absence rendent un convoi, pas vingt', () => {
  it('un convoi dû reste UN convoi, même après soixante journées', () => {
    /*
     * `OFFLINE_CAP_MS` vaut huit heures et `DAY_MS` huit minutes : une absence
     * pleine avance le calendrier de SOIXANTE journées. Le crochet quotidien ne
     * rattrape jamais plus d'une journée ; la cargaison, elle, ne se calcule
     * jamais sur le temps écoulé mais sur le délai NOMINAL du site. Le chiffre
     * ci-dessous doit donc être le même dans les deux cas.
     */
    const c = colonie({ dernierConvoi: 10 })
    expect(convoiPret(c, 12)).toBe(true)
    expect(convoiPret(c, 70)).toBe(true)
    const juste = cargaison(c).n
    // rien dans `cargaison` ne lit le jour : soixante journées ne la grossissent pas
    expect(cargaison({ ...c, dernierConvoi: 10 }).n).toBe(juste)
  })

  it('aucune propriété d’une colonie n’est une échéance en millisecondes', () => {
    /*
     * C'est le test qui garde le piège 2 fermé. Toute échéance en millisecondes
     * devrait être reculée à la main dans le bloc de vitesse du tick ; un numéro de
     * journée, lui, se déduit de `createdAt` que ce bloc recule déjà. On vérifie
     * donc que les deux repères temporels d'une colonie sont des JOURNÉES - des
     * nombres à un chiffre ou deux - et non des horodatages.
     */
    const c = creerColonie('anse-aux-mouettes', 'grenier', PAYSANS, 2, 7)
    expect(c.fondeeLe).toBe(7)
    expect(c.dernierConvoi).toBe(7)
    expect(c.fondeeLe).toBeLessThan(100_000)
    expect(c.dernierConvoi).toBeLessThan(100_000)
  })

  it('le sursis d’un appel est un compte de journées vécues, pas un jour-repère', () => {
    /*
     * Un jour-repère (`ouverteLe`) comparé à `jourDe(s)` se serait tranché tout
     * seul pendant une absence : soixante journées de calendrier, appel dépassé,
     * colonie perdue au réveil sans un mot. Un sursis décrémenté par le crochet
     * quotidien - qui ne rattrape jamais plus d'une journée - coûte UNE journée par
     * absence, quelle qu'en soit la durée. C'est la leçon des successions : ce qui
     * se décide ne se résout pas tout seul.
     */
    const c = colonie({ epreuve: { id: 'famine', sursis: SURSIS_SECOURS } })
    expect(c.epreuve!.sursis).toBe(SURSIS_SECOURS)
    expect(SURSIS_SECOURS).toBeGreaterThanOrEqual(3)
    // il faut avoir ignoré l'appel deux journées SOUS LES YEUX avant l'issue
    expect(issueEpreuve({ ...c, epreuve: { id: 'famine', sursis: 1 } }).perdue).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('la garnison est ce qu’on achète pour défendre où l’on n’est pas', () => {
  it('le site le plus riche est celui qui exige le plus d’hommes', () => {
    const riche = SITES_PAR_ID['crique-des-marchands']
    const proche = SITES_PAR_ID['anse-aux-mouettes']
    expect(riche.affinites.comptoir).toBeGreaterThan(proche.affinites.comptoir)
    expect(riche.menace).toBeGreaterThan(proche.menace)
  })

  it('une palissade tenue repousse le raid sans qu’on ait à y aller', () => {
    const tenue = colonie({ site: 'val-de-l-ida', garnison: garnisonRequise(colonie({ site: 'val-de-l-ida' })) })
    expect(garnisonSuffisante(tenue)).toBe(true)
    expect(raidRepousse(tenue)).toBe(true)
    const nue = colonie({ site: 'val-de-l-ida', garnison: 0 })
    expect(raidRepousse(nue)).toBe(false)
  })

  it('un bélier ne tient pas une palissade : les engins ne comptent pas dans l’effectif', () => {
    /*
     * DÉFAUT TROUVÉ EN RELECTURE, et il était gratuit au sens propre. Le contrôle
     * d'effectif du secours passait par `armeeTotale`, qui additionne les SEPT
     * unités - béliers et chars compris. Un règne à six béliers et zéro fantassin
     * franchissait donc le contrôle, ne détachait personne (il n'y avait rien à
     * prendre), et l'épreuve se fermait quand même : le raid était couvert sans
     * qu'un homme quitte le village. Le panneau allumait le bouton par le même
     * calcul. `soldatsDetachables` est le seul compte qui vaille pour une colonie.
     */
    const engins = { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 6, char: 2 }
    expect(soldatsDetachables(engins)).toBe(0)
    const fantassins = { ...engins, lancier: 3, hoplite: 2 }
    expect(soldatsDetachables(fantassins)).toBe(5)
    // et la demande d'un raid ne se satisfait jamais avec des engins
    const nue = colonie({ site: 'crique-des-marchands', garnison: 0 })
    expect(soldatsSecours(nue)).toBeGreaterThan(soldatsDetachables(engins))
  })

  it('une colonie sous-tenue dérive vers la sécession, une colonie tenue s’attache', () => {
    const tenue = colonie({ garnison: 9, loyaute: 55 })
    expect(loyauteApres(tenue)).toBe(55 + LOYAUTE_PAR_JOUR)
    const nue = colonie({ garnison: 0, loyaute: 55 })
    expect(loyauteApres(nue)).toBe(55 + LOYAUTE_PAR_JOUR - LOYAUTE_GARNISON_MANQUANTE)
    // et un appel sans réponse coûte bien plus que la garnison
    const abandonnee = colonie({ garnison: 9, loyaute: 55, epreuve: { id: 'raid', sursis: 2 } })
    expect(loyauteApres(abandonnee)).toBe(55 + LOYAUTE_PAR_JOUR - LOYAUTE_EPREUVE_IGNOREE)
  })

  it('la loyauté ne sort jamais de ses bornes', () => {
    expect(loyauteApres(colonie({ loyaute: 100, garnison: 9 }))).toBe(100)
    expect(loyauteApres(colonie({ loyaute: 1, garnison: 0, epreuve: { id: 'famine', sursis: 1 } }))).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('une colonie peut être perdue - et jamais par surprise', () => {
  it('la révolte n’est pas un tirage : c’est la conséquence d’un abandon', () => {
    const perdue = colonie({ loyaute: LOYAUTE_REVOLTE - 1 })
    // quels que soient les dés, la sécession s'ouvre
    expect(tirerEpreuve(perdue, { hiver: false, menace: 0 }, 0.99, 0.99)).toBe('revolte')
    expect(tirerEpreuve(perdue, { hiver: false, menace: 0 }, 0.01, 0.01)).toBe('revolte')
    // au seuil exact, elle ne s'ouvre pas encore
    expect(tirerEpreuve(colonie({ loyaute: LOYAUTE_REVOLTE }), { hiver: false, menace: 0 }, 0.99, 0.99)).toBeNull()
  })

  it('la menace du règne se sent d’abord dans les colonies', () => {
    const c = colonie()
    const calme = tirerEpreuve(c, { hiver: false, menace: 0 }, 0.99, 0.1)
    const enArmes = tirerEpreuve(c, { hiver: false, menace: 100 }, 0.99, 0.1)
    expect(calme).toBeNull()
    expect(enArmes).toBe('raid')
  })

  it('l’hiver double le risque de famine - la saison décide déjà des récoltes', () => {
    const c = colonie()
    const ete = tirerEpreuve(c, { hiver: false, menace: 0 }, 0.1, 0.99)
    const hiver = tirerEpreuve(c, { hiver: true, menace: 0 }, 0.1, 0.99)
    expect(ete).toBeNull()
    expect(hiver).toBe('famine')
  })

  it('une seule épreuve à la fois : on ne cumule pas les malheurs', () => {
    const c = colonie({ epreuve: { id: 'famine', sursis: 2 }, loyaute: 5 })
    expect(tirerEpreuve(c, { hiver: true, menace: 100 }, 0.001, 0.001)).toBeNull()
  })

  it('la famine et la révolte ignorées effacent la colonie ; le raid la saigne', () => {
    expect(EPREUVES.famine.fatale).toBe(true)
    expect(EPREUVES.revolte.fatale).toBe(true)
    expect(EPREUVES.raid.fatale).toBe(false)
    const pille = issueEpreuve(colonie({ epreuve: { id: 'raid', sursis: 0 } }))
    expect(pille.perdue).toBe(false)
    expect(pille.metiers.length).toBe(3)
    expect(pille.loyaute).toBeLessThan(LOYAUTE_INITIALE)
    expect(pille.recit.length).toBeGreaterThan(0)
  })

  it('le pillage emporte d’abord ceux qui n’étaient pas au métier de la colonie', () => {
    /*
     * Ce ne sont pas les spécialistes qu'on envoie à la palissade. Conséquence
     * voulue : une colonie pillée rétrécit en gardant son métier, donc elle reste
     * sauvable une seconde fois - et le second raid, lui, l'achève.
     */
    const c = colonie({
      metiers: ['ferme', 'temple', 'ferme', 'forge'],
      vocation: 'grenier',
      epreuve: { id: 'raid', sursis: 0 },
    })
    const out = issueEpreuve(c)
    expect(out.metiers).toEqual(['ferme', 'ferme'])
  })

  it('deux raids sans réponse suffisent : sous deux colons, il n’y a plus rien à sauver', () => {
    const premier = issueEpreuve(colonie({ metiers: ['ferme', 'ferme', 'ferme', 'ferme'], epreuve: { id: 'raid', sursis: 0 } }))
    expect(premier.perdue).toBe(false)
    expect(premier.metiers.length).toBe(COLONS_SURVIE)
    const second = issueEpreuve(colonie({ metiers: premier.metiers, epreuve: { id: 'raid', sursis: 0 } }))
    expect(second.perdue).toBe(true)
    expect(second.metiers).toEqual([])
  })

  it('les colons perdus ne rentrent pas au village : c’est ce qu’on a payé', () => {
    const out = issueEpreuve(colonie({ epreuve: { id: 'famine', sursis: 0 } }))
    expect(out.perdue).toBe(true)
    expect(out.metiers).toEqual([])
    expect(out.recit.join(' ')).toContain('ne reviendront pas')
  })

  it('chaque épreuve demande quelque chose de différent, et le dit', () => {
    for (const e of Object.values(EPREUVES)) {
      expect(e.demande.length).toBeGreaterThan(15)
      expect(e.recit.length).toBeGreaterThan(40)
      // le raid se couvre en hommes, les deux autres en marchandises
      expect(e.soldats ? Object.keys(e.cout).length === 0 : Object.keys(e.cout).length > 0).toBe(true)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('la surface d’état reste minuscule, et tout le reste se déduit', () => {
  it('une colonie ne porte que huit propriétés', () => {
    const c = creerColonie('anse-aux-mouettes', 'grenier', PAYSANS, 3, 5)
    expect(Object.keys(c).sort()).toEqual(
      ['dernierConvoi', 'epreuve', 'fondeeLe', 'garnison', 'loyaute', 'metiers', 'site', 'vocation'].sort(),
    )
  })

  it('le nombre de colons n’est pas stocké : il EST la liste des métiers', () => {
    /*
     * Le premier jet portait un `colons: number` à côté de `metiers`. Deux sources
     * pour un même compte, donc un désaccord garanti le jour où un pillage en
     * emporte trois - et une carte de panneau qui annonce six colons pour quatre
     * bras au travail.
     */
    const c = colonie({ metiers: ['ferme', 'port', 'forge'] })
    expect(colonsDe(c)).toBe(3)
    const apres = issueEpreuve({ ...c, epreuve: { id: 'raid', sursis: 0 } })
    expect(colonsDe({ ...c, metiers: apres.metiers })).toBe(apres.metiers.length)
  })

  it('les sites libres se déduisent des colonies posées', () => {
    expect(sitesLibres([])).toHaveLength(SITES_COLONIE.length)
    expect(sitesLibres([colonie({ site: 'ile-de-schiste' })]).map((s) => s.id)).not.toContain('ile-de-schiste')
  })
})
