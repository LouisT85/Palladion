import { METIERS, RENDEMENT_HORS_METIER, RES, VALEUR_RES } from './data'
import type { BuildingId, Cost, ResourceId, UnitId } from './types'

/*
 * ═══════════════════════ LES COLONIES ═══════════════════════
 *
 * Le règne n'avait qu'un seul horizon : le village, ses murs, et huit places
 * fortes qu'on pille ou qu'on secourt. Rien ne s'y FONDE. On pouvait monter une
 * agora de marbre et une merveille sans jamais rien mettre au monde ailleurs.
 *
 * Une colonie est un second foyer, et elle repose sur un renoncement définitif :
 * des habitants NOMMÉS montent sur une nef et ne reviennent pas. Ce n'est pas
 * une dépense, c'est une amputation - on embarque des métiers, et le village
 * garde le trou.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CINQ DÉCISIONS DE CONCEPTION, ET CE QU'ELLES ÉVITENT.
 *
 * 1. ELLE N'EST PAS UN SECOND VILLAGE JOUABLE.
 *    Doubler le jeu, c'était doubler le nombre de clics par minute sans ajouter
 *    une seule décision. Une colonie ne se construit pas, ne s'affecte pas, ne se
 *    défend pas au clavier. Elle pose QUATRE arbitrages, tous rares et tous
 *    lourds : à quoi elle se consacre (`vocation`), qui part (`metiers`), combien
 *    d'hommes on laisse là-bas pour la tenir (`garnison`), et si l'on paie le
 *    secours quand elle appelle (`epreuve`). Entre deux arbitrages, elle envoie
 *    des convois et l'on n'y touche pas.
 *
 * 2. ELLE COMPTE EN JOURNÉES DE JEU, JAMAIS EN MILLISECONDES.
 *    C'est le patron de l'hécatombe, et il est ici doublement nécessaire. Une
 *    échéance `…At` aurait dû être reculée à la main dans le bloc de vitesse du
 *    tick (sinon un convoi met huit fois trop longtemps à ×8), et le rattrapage
 *    hors ligne - huit heures d'absence, soixante journées de calendrier -
 *    aurait fait rentrer VINGT convois d'un coup. Ici :
 *      · `fondeeLe` et `dernierConvoi` sont des NUMÉROS DE JOURNÉE, sur la même
 *        horloge que `jourDe(s)`. Le bloc de vitesse recule déjà `createdAt`, donc
 *        les journées s'accélèrent d'elles-mêmes : rien à décaler ;
 *      · un convoi DÛ rend une cargaison, pas vingt. La cargaison est calculée sur
 *        `site.journees` - la durée NOMINALE du trajet - et jamais sur le temps
 *        réellement écoulé. Rentrer après une nuit trouve un convoi au quai, ce
 *        qui est un cadeau modeste, et non vingt cargaisons ;
 *      · le compte à rebours d'une épreuve n'est PAS un jour-repère mais un
 *        SURSIS EN JOURNÉES VÉCUES, décrémenté par le crochet quotidien. Comme ce
 *        crochet ne rattrape jamais plus d'une journée (voir `vieDesFamilles`),
 *        une absence d'une nuit coûte UNE journée de sursis, pas soixante. C'est
 *        la seule forme qui interdise de perdre une colonie sans un mot.
 *
 * 3. UN SEUL CHAMP D'ÉTAT, ET HUIT PROPRIÉTÉS QUI SE DÉFENDENT UNE À UNE.
 *    `GameState.colonies: Colonie[]`, et rien d'autre. Tout le reste se DÉDUIT :
 *    le nombre de colons est `metiers.length`, la date du prochain convoi sort de
 *    `dernierConvoi + site.journees`, la cargaison sort des métiers et de la
 *    loyauté, la garnison requise sort du site. Le premier jet portait un
 *    `colons: number` à côté de `metiers` : deux sources pour un même compte,
 *    donc un désaccord garanti le jour où un pillage en emporte trois.
 *
 * 4. ELLE PEUT ÊTRE PERDUE, ET CE N'EST PAS UN TIRAGE DE PLUS.
 *    Trois épreuves - la famine, le raid, la révolte - et chacune se secourt.
 *    Une famine qu'on n'a pas payée disperse la colonie ; un raid qu'on n'a pas
 *    couvert la pille ; une révolte qu'on n'a pas achetée la fait sécession. La
 *    révolte, elle, ne se tire pas au sort : elle est la CONSÉQUENCE d'une
 *    loyauté qu'on a laissée tomber, et le panneau la voit venir de loin.
 *
 * 5. LE CONVOI NE SE PERD PAS EN CHEMIN.
 *    Les caravanes le font déjà, et pour une raison qui ne vaut pas ici : une
 *    caravane est un PARI qu'on prend charge par charge. Un convoi de colonie est
 *    un FLUX qu'on planifie ; un flux dont un sixième s'évapore au hasard n'est
 *    plus une décision, c'est du bruit sur un graphique. Le danger d'une colonie
 *    est qu'on la PERDE, pas qu'un chariot se renverse.
 *
 * Tout ce fichier est PUR : il ne lit qu'un instantané, ne touche à rien, et
 * n'importe rien du store.
 */

// ── Ce à quoi une colonie se consacre ────────────────────────────────────────

/**
 * Quatre vocations, une par ressource. C'est le premier arbitrage, et il n'a de
 * sens que parce qu'il se heurte aux MÉTIERS qu'on a embarqués : une colonie de
 * bûcherons qu'on met à la carrière rend un peu plus de la moitié de ce qu'elle
 * rendrait au bois. On ne choisit donc pas sa vocation après coup - on la choisit
 * en même temps que ses colons, et c'est ce qui rend la nef intéressante à charger.
 */
export type VocationId = 'grenier' | 'carriere' | 'foret' | 'comptoir'

export interface VocationDef {
  id: VocationId
  nom: string
  emoji: string
  /** ce que le convoi rapporte */
  res: ResourceId
  /** les métiers qui y rendent PLEINEMENT - les autres à `RENDEMENT_HORS_METIER` */
  metiers: BuildingId[]
  /** ce que la colonie devient, en une phrase */
  desc: string
}

export const VOCATIONS: Record<VocationId, VocationDef> = {
  grenier: {
    id: 'grenier',
    nom: 'Grenier d’outre-mer',
    emoji: '🌾',
    res: 'grain',
    metiers: ['ferme'],
    desc: 'On brûle la broussaille, on trace des sillons, et la nef revient chargée d’orge. Une colonie qui nourrit la mère patrie ne se révolte pas volontiers.',
  },
  carriere: {
    id: 'carriere',
    nom: 'Carrière lointaine',
    emoji: '🪨',
    res: 'pierre',
    metiers: ['carriere'],
    desc: 'Un front de taille ouvert à flanc de colline. La pierre est lourde, le voyage long, mais aucun mur ne se bâtit sans elle.',
  },
  foret: {
    id: 'foret',
    nom: 'Coupe de bois',
    emoji: '🪵',
    res: 'bois',
    metiers: ['scierie'],
    desc: 'On abat le pin de montagne et l’on descend les troncs à la mer par le lit des torrents. C’est le métier le plus simple à ouvrir loin de chez soi.',
  },
  comptoir: {
    id: 'comptoir',
    nom: 'Comptoir de bronze',
    emoji: '🪙',
    res: 'bronze',
    metiers: ['port', 'forge'],
    desc: 'Un quai, une balance, une forge : on revend aux Phéniciens ce que les terres de l’intérieur descendent. Le lingot est ce qui manque toujours.',
  },
}

export const VOCATION_IDS = Object.keys(VOCATIONS) as VocationId[]

// ── Où l'on fonde ────────────────────────────────────────────────────────────

/**
 * Un site à colonier. Quatre lieux, trois colonies possibles au plus : on ne les
 * aura donc jamais tous, et il faut choisir lequel on laisse aux autres.
 *
 * La table est ÉCRITE et non calculée, exactement comme `ROUTES` du commerce :
 * ces quatre endroits ont une géographie. Une anse grasse et proche ne peut pas
 * rendre autant de pierre qu'une île de schiste, et la crique la plus riche est
 * celle dont on ne peut pas voir la palissade depuis ses propres remparts.
 */
export interface SiteColonie {
  id: string
  nom: string
  emoji: string
  desc: string
  /**
   * Journées de jeu entre deux convois. C'est la seule mesure de la distance, et
   * elle ne change PAS le débit : la cargaison est proportionnelle à ce délai
   * (voir `cargaison`). Un site lointain envoie moins souvent et plus gros - ce
   * qui se paie en trésorerie, pas en rendement.
   */
  journees: number
  /**
   * Hommes qu'il faut laisser sur place pour que la palissade tienne seule. Un
   * raid contre une colonie assez tenue est repoussé sans qu'on en soit averti
   * autrement que par un rapport : c'est précisément ce qu'on achète en laissant
   * des soldats là-bas.
   */
  menace: number
  /** ce que la terre du lieu fait à chaque vocation - le cœur du choix de site */
  affinites: Record<VocationId, number>
}

export const SITES_COLONIE: SiteColonie[] = [
  {
    id: 'anse-aux-mouettes',
    nom: 'L’anse aux Mouettes',
    emoji: '🏖️',
    desc: 'Une baie de sable noir à deux jours de rame, une source, et de la terre grasse que personne n’a jamais retournée. Les vieux disent qu’un dieu y dort ; les jeunes disent qu’on y sème deux fois l’an.',
    journees: 2,
    menace: 2,
    affinites: { grenier: 1.25, carriere: 0.7, foret: 0.95, comptoir: 0.85 },
  },
  {
    id: 'ile-de-schiste',
    nom: 'L’île de Schiste',
    emoji: '🪨',
    desc: 'Un caillou nu au large, fendu de veines bleues qui se débitent à la main. Rien n’y pousse, mais on y taille en un matin ce qu’une carrière rend en trois.',
    journees: 3,
    menace: 3,
    affinites: { grenier: 0.6, carriere: 1.4, foret: 0.75, comptoir: 0.95 },
  },
  {
    id: 'val-de-l-ida',
    nom: 'Le val de l’Ida',
    emoji: '🌲',
    desc: 'Le versant nord de la montagne aux pins, où Pâris gardait les troupeaux. Du bois de mât à perte de vue - et pas un pouce de mer entre ce val et les bandes qui descendent de Phrygie.',
    journees: 3,
    menace: 5,
    affinites: { grenier: 0.9, carriere: 1, foret: 1.4, comptoir: 0.8 },
  },
  {
    id: 'crique-des-marchands',
    nom: 'La crique des Marchands',
    emoji: '⚖️',
    desc: 'Quatre jours de mer, un mouillage abrité où les coques de Sidon relâchent depuis toujours. On y échange tout contre du lingot. Personne ne viendra vous y aider.',
    journees: 4,
    menace: 6,
    affinites: { grenier: 0.8, carriere: 0.9, foret: 0.85, comptoir: 1.45 },
  },
]

export const SITES_PAR_ID: Record<string, SiteColonie> = Object.fromEntries(
  SITES_COLONIE.map((s) => [s.id, s]),
)

// ── L'état d'une colonie ─────────────────────────────────────────────────────

export type EpreuveId = 'famine' | 'raid' | 'revolte'

/** l'épreuve en cours et ce qu'il reste de patience */
export interface EpreuveEnCours {
  id: EpreuveId
  /**
   * Journées de jeu VÉCUES avant l'issue. Ce n'est PAS un jour-repère, et c'est
   * toute la différence : un jour-repère comparé à `jourDe(s)` aurait tranché tout
   * seul pendant une absence, puisque huit heures avancent le calendrier de
   * soixante journées. Un sursis décrémenté par le crochet quotidien - qui ne
   * rattrape jamais plus d'une journée - ne peut coûter qu'UNE journée par
   * absence. Une colonie ne se perd donc jamais sans que le joueur l'ait vue
   * appeler.
   */
  sursis: number
}

/**
 * UNE COLONIE, ET RIEN QUE CE QUI NE SE DÉDUIT PAS.
 *
 * Huit propriétés. Chacune répond à une question qu'aucune autre ne peut
 * couvrir - et les candidates évidentes qui n'y sont PAS valent d'être nommées :
 *  · `colons: number` → c'est `metiers.length` ;
 *  · `prochainConvoi` → c'est `dernierConvoi + site.journees` ;
 *  · `nom`, `emoji`, `distance`, `menace` → c'est `SITES_PAR_ID[site]` ;
 *  · `rendement` → c'est `cargaison(c)`, recalculée à chaque lecture ;
 *  · une liste des épreuves passées → la loyauté EST cette mémoire, en un nombre.
 */
export interface Colonie {
  /**
   * L'id du site, qui sert d'identité : on ne fonde jamais deux colonies au même
   * endroit, donc un `id` propre aurait été un second nom pour la même chose.
   */
  site: string
  /** journée de jeu de la fondation - l'ancienneté, et le récit du règne */
  fondeeLe: number
  /**
   * Les métiers embarqués, un par colon. C'est le cœur ÉMOTIONNEL du système : on
   * ne perd pas « six habitants », on perd ses deux seuls tailleurs de pierre. Et
   * c'est aussi ce qui décide du rendement, puisque la vocation y cherche les
   * bras qui savent faire.
   */
  metiers: BuildingId[]
  vocation: VocationId
  /**
   * Journée du dernier convoi arrivé. Le prochain est dû à
   * `dernierConvoi + site.journees` - aucune échéance en millisecondes, donc
   * rien à reculer dans le bloc de vitesse du tick.
   */
  dernierConvoi: number
  /**
   * Soldats laissés sur place. Un NOMBRE, pas un `Record<UnitId, number>` : ces
   * hommes ne combattront jamais dans une bataille que le joueur regarde, ils
   * tiennent une palissade hors champ. Détailler leur type aurait quadruplé la
   * surface d'état pour une distinction qui ne se voit nulle part.
   */
  garnison: number
  /** 0…100. La seule jauge, et elle résume toute l'histoire des secours rendus. */
  loyaute: number
  /** l'épreuve ouverte, s'il y en a une - une seule à la fois */
  epreuve: EpreuveEnCours | null
}

// ── Les chiffres, et d'où ils viennent ───────────────────────────────────────

/**
 * Trois colonies au plus. Ce n'est pas une limite technique : à trois, le joueur
 * a déjà renoncé à un des quatre sites, et douze à vingt-quatre habitants ont
 * quitté le village pour de bon - sur une population plafonnée à cinquante-deux.
 * Une quatrième n'ajouterait aucune décision, seulement une ligne de plus à lire.
 */
export const COLONIES_MAX = 3

/**
 * Quatre colons au minimum. En dessous, la colonie n'est pas une colonie : c'est
 * un poste de pêche, et son convoi ne couvrirait pas le prix de la nef.
 * Huit au plus, parce qu'au-delà on vide le village d'un coup - et parce qu'une
 * carte de fondation qui montre plus de huit noms ne se lit plus.
 */
export const COLONS_MIN = 4
export const COLONS_MAX = 8

/**
 * Ce qu'il doit rester au village après l'embarquement. Six bras : de quoi tenir
 * la ferme, la scierie et un poste de garde. Sans ce plancher, on pouvait fonder
 * une colonie avec les sept fondateurs et laisser une agora vide derrière soi -
 * `syncVillageois` ne recomplète pas la liste, puisque `pop` a baissé d'autant.
 */
export const POP_PLANCHER = 6

/**
 * Le port qu'il faut. Niveau 2, c'est-à-dire le même niveau qui ouvre la seconde
 * caravane (`caravanesMax`) : on ne fonde pas outre-mer avant de savoir tenir
 * une route commerciale, et la chaîne port → comptoir → colonie se lit sans qu'on
 * ait à l'expliquer.
 */
export const PORT_MINIMUM = 2

/**
 * LE PRIX DE LA FONDATION, en marchandises - les hommes se comptent à part.
 *
 * 450 de bois, c'est la nef et ses agrès ; 200 de pierre, la première enceinte ;
 * 500 de grain, les vivres du voyage et de la première saison là-bas ; 140 de
 * bronze, les outils, les haches et le présent qu'on porte à qui prétend déjà
 * posséder la baie.
 *
 * En VALEUR (`VALEUR_RES`, la métrique du comptoir) : 450 + 250 + 500 + 560 =
 * 1760. À comparer aux deux grandes dépenses du jeu : porter l'agora au niveau 4
 * coûte 1440, la plus modeste des merveilles environ 8000. Fonder est donc la
 * dépense la plus lourde du règne après la merveille - et la seule qui coûte
 * aussi des habitants.
 */
export const COUT_FONDATION: Cost = { bois: 450, pierre: 200, grain: 500, bronze: 140 }

/**
 * Ce qu'un colon rend par journée de jeu, en VALEUR de comptoir, quand il est à
 * son métier et que la colonie lui est loyale à cent.
 *
 * L'ancre est le village : une ferme de niveau 2 rend 15 par minute pour deux
 * postes, soit 60 unités par journée et par bras. Un colon en rend 24 - les deux
 * cinquièmes. Il est loin, mal outillé, il garde de quoi manger et il n'a pas de
 * bâtiment de niveau 3 sous les pieds. En échange il ne tient aucun poste chez
 * vous, ne mange pas votre grain, et ne compte pas dans votre plafond de
 * population : la colonie est la seule façon de croître au-delà des habitations.
 */
export const VALEUR_PAR_COLON_JOUR = 24

/** la loyauté d'une colonie neuve. Comme l'ambiance d'un village neuf : ni acquise, ni hostile. */
export const LOYAUTE_INITIALE = 55

/**
 * Sous ce seuil, la colonie se donne un chef à elle. La révolte ne se tire pas au
 * sort : elle est la conséquence lisible d'un abandon, et le panneau affiche la
 * jauge - le joueur doit pouvoir la voir descendre et agir.
 */
export const LOYAUTE_REVOLTE = 20

/**
 * Ce qu'une journée fait à la loyauté. Trois de plus quand tout va, quatre de
 * moins quand la palissade est sous-tenue, huit de moins quand un appel reste
 * sans réponse. Une colonie bien tenue passe donc de 55 à 100 en quinze journées
 * (deux heures de jeu) ; une colonie sans garnison dérive d'un point par journée
 * vers la révolte, ce qui laisse trente-cinq journées pour s'en apercevoir.
 */
export const LOYAUTE_PAR_JOUR = 3
export const LOYAUTE_GARNISON_MANQUANTE = 4
export const LOYAUTE_EPREUVE_IGNOREE = 8

/**
 * Changer de vocation coûte quinze de loyauté et le convoi en préparation. Rien
 * en marchandises, et c'est délibéré : le prix d'une réorientation doit être
 * payé par ceux qui la subissent, pas par un coffre. Arracher un homme à son
 * sillon pour le mettre au front de taille se paie en rancune.
 */
export const LOYAUTE_REORIENTATION = 15

/** ce que rend un secours à qui l'attendait */
export const LOYAUTE_SECOURS: Record<EpreuveId, number> = { famine: 20, raid: 12, revolte: 30 }

/**
 * Trois journées pour répondre à un appel. C'est la même échelle que le délai
 * d'un convoi lointain : le temps d'armer une nef. Et comme le sursis se compte
 * en journées VÉCUES, une nuit d'absence n'en consomme qu'une - il faut donc
 * avoir ignoré l'appel deux journées durant, sous les yeux, pour perdre la place.
 */
export const SURSIS_SECOURS = 3

/**
 * Risque qu'une épreuve s'ouvre dans la journée. La famine double en hiver -
 * la saison est déjà la mécanique qui décide des récoltes, elle devait décider
 * de celle-là aussi. Le raid suit la menace du règne : quand la Troade est en
 * armes, ce sont les colonies qui le sentent d'abord.
 */
export const RISQUE_FAMINE = 0.07
export const FAMINE_HIVER = 2
export const RISQUE_RAID = 0.09
export const RISQUE_RAID_MENACE = 0.15

/** ce qu'un pillage emporte de colons, faute de garnison et faute de secours */
export const PART_PILLAGE = 0.5

/** sous ce nombre de colons, il n'y a plus de colonie à sauver */
export const COLONS_SURVIE = 2

function borner100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

// ── Ce qu'une colonie est, en lecture ────────────────────────────────────────

export function colonsDe(c: Colonie): number {
  return c.metiers.length
}

export function siteDe(c: Colonie): SiteColonie | null {
  return SITES_PAR_ID[c.site] ?? null
}

/**
 * Bras utiles à la vocation en cours. Un colon à son métier compte pour un, les
 * autres pour `RENDEMENT_HORS_METIER` - la MÊME constante que le village applique
 * à un paysan mis à la carrière. Un système qui s'ajoute à ce jeu n'invente pas
 * son arithmétique : le joueur a déjà appris ce chiffre en affectant ses postes.
 */
export function brasUtiles(c: Colonie): number {
  const v = VOCATIONS[c.vocation]
  if (!v) return 0
  let p = 0
  for (const m of c.metiers) p += v.metiers.includes(m) ? 1 : RENDEMENT_HORS_METIER
  return p
}

/** ce que la loyauté fait au rendement : de 0,4 à 1 - jamais rien, jamais un bonus */
export function facteurLoyaute(loyaute: number): number {
  return 0.4 + 0.6 * (borner100(loyaute) / 100)
}

/**
 * LA CARGAISON D'UN CONVOI. Proportionnelle au DÉLAI NOMINAL du site et jamais au
 * temps réellement écoulé : c'est ce qui fait qu'une absence de huit heures rend
 * un convoi et non vingt, et c'est aussi ce qui empêche les sites proches d'être
 * strictement meilleurs (ils envoient plus souvent et plus petit, pour le même
 * débit).
 *
 * La valeur produite est convertie en unités par `VALEUR_RES`, la table du
 * comptoir : sans cela, une colonie de bronze rendrait quatre fois trop, puisque
 * le lingot vaut quatre fois le madrier.
 */
export function cargaison(c: Colonie): { res: ResourceId; n: number } {
  const v = VOCATIONS[c.vocation]
  const site = siteDe(c)
  const res = v?.res ?? 'bois'
  if (!v || !site) return { res, n: 0 }
  const valeur =
    brasUtiles(c) * VALEUR_PAR_COLON_JOUR * site.journees * site.affinites[c.vocation] * facteurLoyaute(c.loyaute)
  return { res, n: Math.max(1, Math.round(valeur / VALEUR_RES[res])) }
}

/** la journée où le prochain convoi est attendu */
export function journeeDuConvoi(c: Colonie): number {
  return c.dernierConvoi + (siteDe(c)?.journees ?? 3)
}

/** un convoi est-il dû ? Une seule cargaison rentre, même après soixante journées. */
export function convoiPret(c: Colonie, jour: number): boolean {
  return jour >= journeeDuConvoi(c)
}

/** journées restantes avant le convoi - jamais négatif, pour l'affichage */
export function attenteConvoi(c: Colonie, jour: number): number {
  return Math.max(0, journeeDuConvoi(c) - jour)
}

/**
 * LES HOMMES QU'UNE COLONIE PEUT RECEVOIR - et ceux qui ne partent jamais.
 *
 * L'ordre est celui du DÉTACHEMENT : les plus faciles à remplacer d'abord, à
 * l'inverse du tirage au sort de `retirerSoldats` du store. Ce tirage convient à
 * une DÉSERTION ; perdre au hasard un hoplite payé trente-cinq lingots quand on
 * voulait détacher trois lanciers, ce n'est pas une décision, c'est une taxe.
 *
 * Le bélier et le char n'y sont PAS, et cette absence est la règle du jeu, donc
 * elle appartient à ce module et non au store : un engin sert à percer une
 * muraille, pas à tenir une palissade.
 *
 * ⚠️ C'EST AUSSI LE SEUL COMPTE VALABLE POUR JUGER D'UN SECOURS. `armeeTotale`
 * additionne les SEPT unités, engins compris. Un règne à six béliers et zéro
 * fantassin passait donc le contrôle d'effectif de `secourirColonie`, ne
 * détachait personne (rien à prendre), et voyait quand même l'épreuve se fermer :
 * le raid était couvert GRATUITEMENT. Le panneau, lui, allumait un bouton
 * « Secourir » qui ne coûtait rien. Toute lecture d'effectif destinée à une
 * colonie passe par `soldatsDetachables`, jamais par `armeeTotale`.
 */
export const UNITES_GARNISON: UnitId[] = ['lancier', 'frondeur', 'peltaste', 'archer', 'hoplite']

/** combien d'hommes on peut réellement envoyer tenir une palissade */
export function soldatsDetachables(army: Partial<Record<UnitId, number>>): number {
  return UNITES_GARNISON.reduce((a, u) => a + Math.max(0, army[u] ?? 0), 0)
}

/** hommes qu'il faut laisser sur place pour que la palissade tienne seule */
export function garnisonRequise(c: Colonie): number {
  return siteDe(c)?.menace ?? 3
}

export function garnisonSuffisante(c: Colonie): boolean {
  return c.garnison >= garnisonRequise(c)
}

/**
 * La loyauté au matin suivant. Une seule fonction, appelée une fois par journée :
 * c'est elle qui fait qu'une colonie qu'on tient s'attache, et qu'une colonie
 * qu'on oublie finit par se donner un chef.
 */
export function loyauteApres(c: Colonie): number {
  let d = LOYAUTE_PAR_JOUR
  if (!garnisonSuffisante(c)) d -= LOYAUTE_GARNISON_MANQUANTE
  if (c.epreuve) d -= LOYAUTE_EPREUVE_IGNOREE
  return borner100(c.loyaute + d)
}

// ── Les épreuves ─────────────────────────────────────────────────────────────

export interface EpreuveDef {
  id: EpreuveId
  nom: string
  emoji: string
  /** ce qui arrive, dit au joueur - il n'y est pas, il ne peut que lire */
  recit: string
  /** ce qu'on lui demande, en une ligne */
  demande: string
  /** ce que coûte le secours en marchandises */
  cout: Cost
  /**
   * Le secours passe par des SOLDATS et non par des vivres. Ils restent là-bas :
   * secourir un raid, c'est renforcer la garnison pour de bon - la seule façon de
   * défendre une place où l'on ne peut pas se rendre.
   */
  soldats: boolean
  /** l'issue si le sursis s'épuise : la colonie est perdue, ou seulement saignée */
  fatale: boolean
}

/**
 * Les trois façons de perdre une colonie, et leur prix.
 *
 * La famine se paie en grain - exactement ce que la colonie aurait envoyé, ce qui
 * rend la perte lisible : une année blanche. La révolte se paie cher et en
 * bronze, parce qu'on achète une paix qu'on n'a pas méritée. Le raid ne se paie
 * pas du tout : il se COUVRE, avec des hommes, et ces hommes ne reviennent pas
 * sur vos remparts.
 */
export const EPREUVES: Record<EpreuveId, EpreuveDef> = {
  famine: {
    id: 'famine',
    nom: 'La récolte a manqué',
    emoji: '🥀',
    recit:
      'Le blé a versé avant d’être mûr et les silos de la colonie sont vides. Ils ont mangé les semences ; s’il n’arrive rien, ils remonteront sur les nefs et se disperseront le long de la côte.',
    demande: 'Charger une nef de grain, tout de suite.',
    cout: { grain: 400 },
    soldats: false,
    fatale: true,
  },
  raid: {
    id: 'raid',
    nom: 'Une bande devant la palissade',
    emoji: '🏴',
    recit:
      'Des hommes en armes campent devant la colonie depuis trois jours et comptent les défenseurs. La palissade ne tiendra pas si personne ne la tient.',
    demande: 'Détacher des soldats - ils resteront là-bas.',
    cout: {},
    soldats: true,
    fatale: false,
  },
  revolte: {
    id: 'revolte',
    nom: 'Ils ne reconnaissent plus votre sceptre',
    emoji: '✊',
    recit:
      'Les colons se sont assemblés sans vous et parlent de se donner un chef parmi eux. On ne gouverne pas des gens qu’on ne visite jamais.',
    demande: 'Un présent qui vaut un pardon : du bronze, et de quoi faire une fête.',
    cout: { bronze: 90, grain: 200 },
    soldats: false,
    fatale: true,
  },
}

/** ce que le secours de cette épreuve coûte en marchandises */
export function coutSecours(id: EpreuveId): Cost {
  return EPREUVES[id]?.cout ?? {}
}

/** soldats qu'il faut détacher pour couvrir un raid : de quoi tenir la palissade */
export function soldatsSecours(c: Colonie): number {
  return Math.max(1, garnisonRequise(c) - c.garnison)
}

/**
 * Un raid contre une colonie ASSEZ TENUE ne devient pas une épreuve : la garnison
 * le repousse et l'on n'en apprend l'existence que par un rapport. C'est
 * exactement ce qu'on achète en laissant des hommes là-bas, et c'est pour cela
 * que la garnison est un arbitrage et non une taxe.
 */
export function raidRepousse(c: Colonie): boolean {
  return garnisonSuffisante(c)
}

/**
 * L'épreuve qui s'ouvre cette journée, ou `null`.
 *
 * La révolte passe AVANT les tirages et ne dépend d'aucun hasard : elle est la
 * conséquence d'une loyauté tombée, donc d'un abandon que le joueur pouvait lire
 * sur sa jauge. Un tirage l'aurait rendue injuste ; sans elle, négliger une
 * colonie serait sans conséquence.
 *
 * `roll` (0…1) est tiré par le store : le module reste pur et le test reproductible.
 */
export function tirerEpreuve(
  c: Colonie,
  ctx: { hiver: boolean; menace: number },
  roll: number,
  rollRaid: number,
): EpreuveId | null {
  if (c.epreuve) return null
  if (c.loyaute < LOYAUTE_REVOLTE) return 'revolte'
  const pRaid = RISQUE_RAID + (Math.max(0, Math.min(100, ctx.menace)) / 100) * RISQUE_RAID_MENACE
  if (rollRaid < pRaid) return 'raid'
  const pFamine = RISQUE_FAMINE * (ctx.hiver ? FAMINE_HIVER : 1)
  if (roll < pFamine) return 'famine'
  return null
}

/**
 * L'issue d'un appel resté sans réponse, une fois le sursis épuisé.
 *
 * Le pillage n'emporte PAS les spécialistes en premier, et ce n'est pas une
 * faveur : ceux qu'on envoie à la palissade sont ceux qui n'ont rien à faire au
 * front de taille. Une colonie pillée rétrécit donc en gardant son métier - et
 * c'est ce qui la rend encore sauvable au second raid, jusqu'à `COLONS_SURVIE`.
 */
export function issueEpreuve(c: Colonie): {
  perdue: boolean
  metiers: BuildingId[]
  loyaute: number
  recit: string[]
} {
  const e = c.epreuve
  const site = siteDe(c)
  const nom = site?.nom ?? 'la colonie'
  if (!e) return { perdue: false, metiers: c.metiers, loyaute: c.loyaute, recit: [] }
  const def = EPREUVES[e.id]
  if (def.fatale) {
    return {
      perdue: true,
      metiers: [],
      loyaute: 0,
      recit:
        e.id === 'famine'
          ? [
              `${nom} est vide. Ils ont attendu la nef trois jours, puis ils sont partis à pied le long de la grève.`,
              'Les colons ne reviendront pas : on ne rentre pas au village qu’on a quitté pour toujours.',
            ]
          : [
              `${nom} ne relève plus de vous. Ils ont élu l’un des leurs et brûlé votre étendard sur la place.`,
              'Ils gardent la palissade, les silos et les hommes. Le règne a perdu une colonie et n’a rien à en reprendre.',
            ],
    }
  }
  // le raid : on est pillé, pas effacé - à moins qu'il ne reste plus personne
  const perdus = Math.max(1, Math.floor(colonsDe(c) * PART_PILLAGE))
  const v = VOCATIONS[c.vocation]
  const horsMetier = c.metiers.filter((m) => !v.metiers.includes(m))
  const auMetier = c.metiers.filter((m) => v.metiers.includes(m))
  const restants = [...horsMetier, ...auMetier].slice(perdus)
  // on rend la liste dans l'ordre d'origine : le récit du panneau la relit
  const metiers = restants.length > 0 ? [...restants].sort((a, b) => c.metiers.indexOf(a) - c.metiers.indexOf(b)) : []
  const perdue = metiers.length < COLONS_SURVIE
  return {
    perdue,
    metiers: perdue ? [] : metiers,
    loyaute: perdue ? 0 : borner100(c.loyaute - 25),
    recit: perdue
      ? [
          `La palissade de ${nom} est tombée et il n’en reste personne à secourir.`,
          `${perdus} colons y sont morts pour une place que le règne n’a pas su tenir.`,
        ]
      : [
          `${nom} a été pillée : silos crevés, palissade en travers, ${perdus} colons perdus.`,
          `Il en reste ${metiers.length}. La colonie tient encore - mais elle vous regarde autrement.`,
        ],
  }
}

// ── Ce que le village perd : le cœur de la décision ──────────────────────────

/** une ligne du décompte des métiers embarqués, telle que le panneau la montre */
export interface LigneSaignee {
  metier: BuildingId
  nom: string
  /** combien on embarque */
  part: number
  /** combien le village en comptait avant */
  avant: number
  /** combien il en gardera */
  reste: number
  /** on embarque TOUS ceux du métier : le village n'en aura plus un seul */
  dernier: boolean
}

const MOTS = ['aucun', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit']

function enMots(n: number): string {
  return MOTS[n] ?? String(n)
}

/**
 * Le pluriel d'un nom de métier : le `s` va sur le PREMIER mot, pas à la fin.
 *
 * Le premier jet écrivait `${nom}s`, et la phrase la plus importante du panneau
 * sortait ainsi : « vos deux seuls tailleur de pierres ». Elle se lit comme des
 * tailleurs de plusieurs pierres, et une phrase qui porte une décision
 * irréversible ne peut pas être fausse - le joueur cesse de croire le reste.
 * Les six métiers de ce jeu se plurialisent tous par le premier mot : Paysans,
 * Bûcherons, Tailleurs de pierre, Forgerons, Prêtres, Dockers.
 */
function pluriel(nom: string): string {
  const i = nom.indexOf(' ')
  if (i < 0) return `${nom}s`
  return `${nom.slice(0, i)}s${nom.slice(i)}`
}

/**
 * « 2 tailleurs de pierre », « 1 prêtre ». Exporté parce que le panneau écrit la
 * MÊME chose une ligne au-dessus de la phrase et l'écrivait faux : le décompte
 * affichait « 2 tailleur de pierre sur 2 », juste avant une phrase qui, elle,
 * accordait correctement. Une correction faite à un seul endroit se lit comme une
 * étourderie du jeu entier - le joueur cesse de croire les autres chiffres.
 */
export function comptesMetier(nom: string, n: number): string {
  return `${n} ${n > 1 ? pluriel(nom.toLowerCase()) : nom.toLowerCase()}`
}

/**
 * LE DÉCOMPTE DES MÉTIERS QUE LE VILLAGE PERD.
 *
 * C'est la pièce que le panneau doit montrer avant le clic, et c'est pour elle
 * que `metiers` existe dans l'état. « Six habitants » ne coûte rien à personne ;
 * « vos deux seuls tailleurs de pierre » arrête la main. La fonction est ici, et
 * non dans le composant, parce qu'une phrase qui porte la décision se teste.
 */
export function saignee(villageMetiers: BuildingId[], embarques: BuildingId[]): LigneSaignee[] {
  const parMetier = new Map<BuildingId, number>()
  for (const m of embarques) parMetier.set(m, (parMetier.get(m) ?? 0) + 1)
  const lignes: LigneSaignee[] = []
  for (const [metier, part] of parMetier) {
    const avant = villageMetiers.filter((m) => m === metier).length
    const reste = Math.max(0, avant - part)
    lignes.push({
      metier,
      nom: METIERS[metier] ?? metier,
      part,
      avant,
      reste,
      dernier: reste === 0 && avant > 0,
    })
  }
  // les métiers qu'on vide entièrement d'abord : c'est ce qu'il faut lire en premier
  lignes.sort((a, b) => (a.dernier === b.dernier ? b.part - a.part : a.dernier ? -1 : 1))
  return lignes
}

/** la phrase qui arrête la main, ou `null` si l'embarquement ne prive de rien */
export function phraseSaignee(lignes: LigneSaignee[]): string | null {
  const vides = lignes.filter((l) => l.dernier)
  if (vides.length === 0) return null
  const parts = vides.map((l) => {
    const nom = l.nom.toLowerCase()
    if (l.part === 1) return `votre seul ${nom}`
    return `vos ${enMots(l.part)} seuls ${pluriel(nom)}`
  })
  const liste = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`
  return `Vous embarquez ${liste}. Le village n’en aura plus un.`
}

/** « 260 grain », pour les rapports et les cartes */
export function resumeCargaison(res: ResourceId, n: number): string {
  return `${n} ${RES[res].nom.toLowerCase()}`
}

// ── Fonder : le juge unique de la recevabilité ───────────────────────────────

/** ce qu'il faut savoir pour juger d'une fondation - jamais l'état entier */
export interface SnapColonies {
  port: number
  colonies: Colonie[]
  pop: number
  /**
   * Une nef est libre. La flotte vit dans un autre module, écrit en parallèle :
   * on ne l'importe PAS, on reçoit sa réponse. C'est aussi ce qui garde ce
   * fichier testable sans elle.
   */
  nefLibre: boolean
}

export type RefusColonie = 'port' | 'nef' | 'complet' | 'site' | 'colons' | 'village'

/**
 * Le juge unique. Le store l'appelle avant de payer, le panneau l'appelle pour
 * griser la carte AVEC SON MOTIF - un bouton éteint sans raison affichée est la
 * première cause d'abandon d'un panneau de ce jeu.
 *
 * Les ressources n'y sont PAS : `payer`/`peutPayer` s'en chargent déjà, et ils
 * répondent toujours vrai sous vitest. Les mêler ici aurait rendu ce juge
 * intestable.
 */
export function refusFondation(s: SnapColonies, siteId: string, colons: BuildingId[]): RefusColonie | null {
  if (s.port < PORT_MINIMUM) return 'port'
  if ((s.colonies?.length ?? 0) >= COLONIES_MAX) return 'complet'
  if (!SITES_PAR_ID[siteId]) return 'site'
  if ((s.colonies ?? []).some((c) => c.site === siteId)) return 'site'
  if (!s.nefLibre) return 'nef'
  if (colons.length < COLONS_MIN || colons.length > COLONS_MAX) return 'colons'
  if (s.pop - colons.length < POP_PLANCHER) return 'village'
  return null
}

/** le refus, dit au joueur dans ses termes */
export function motifRefusColonie(r: RefusColonie): string {
  switch (r) {
    case 'port':
      return `On ne fonde pas outre-mer depuis une grève : il faut un port de niveau ${PORT_MINIMUM}.`
    case 'nef':
      return 'Aucune nef libre au mouillage. Une colonie en retient une tant qu’elle vit.'
    case 'complet':
      return `Le règne tient déjà ${COLONIES_MAX} colonies. Au-delà, plus personne ne vous reconnaîtrait.`
    case 'site':
      return 'Cette côte est déjà à vous, ou n’est pas sur vos cartes.'
    case 'colons':
      return `Une colonie se fonde à ${COLONS_MIN} colons au moins, et ${COLONS_MAX} au plus.`
    case 'village':
      return `Le village ne peut pas descendre sous ${POP_PLANCHER} habitants : il ne resterait personne aux postes.`
  }
}

/** monte la colonie qui part : le store n'a plus qu'à l'ajouter à sa liste */
export function creerColonie(
  siteId: string,
  vocation: VocationId,
  metiers: BuildingId[],
  garnison: number,
  jour: number,
): Colonie {
  return {
    site: siteId,
    fondeeLe: jour,
    metiers: [...metiers],
    vocation,
    /*
     * Le premier convoi n'est pas dû le jour même : `dernierConvoi` vaut le jour
     * de la fondation, donc la première cargaison arrive après un trajet plein.
     * Sans cela, fonder aurait rendu sa mise le matin suivant.
     */
    dernierConvoi: jour,
    garnison: Math.max(0, Math.round(garnison)),
    loyaute: LOYAUTE_INITIALE,
    epreuve: null,
  }
}

/** la colonie de ce site, ou `null` */
export function colonieDe(colonies: Colonie[] | undefined, siteId: string): Colonie | null {
  return (colonies ?? []).find((c) => c.site === siteId) ?? null
}

/** les sites encore libres, dans l'ordre de la table (du plus proche au plus riche) */
export function sitesLibres(colonies: Colonie[] | undefined): SiteColonie[] {
  return SITES_COLONIE.filter((s) => !colonieDe(colonies, s.id))
}

/** l'âge de la colonie, en journées de jeu */
export function anciennete(c: Colonie, jour: number): number {
  return Math.max(0, jour - c.fondeeLe)
}

/** « en grâce », « inquiète »… - de quoi juger sans lire un pourcentage */
export function motLoyaute(loyaute: number): string {
  if (loyaute >= 85) return 'dévouée'
  if (loyaute >= 60) return 'fidèle'
  if (loyaute >= 40) return 'tiède'
  if (loyaute >= LOYAUTE_REVOLTE) return 'inquiète'
  return 'au bord de la sécession'
}

/**
 * Pourquoi la loyauté va dans ce sens. Sans cette liste, la jauge n'est qu'un
 * chiffre qui bouge tout seul : le joueur doit pouvoir relier la dérive à la
 * garnison qu'il n'a pas laissée.
 */
export function explicationLoyaute(c: Colonie): string[] {
  const out: string[] = [`🏛️ La colonie s’installe : +${LOYAUTE_PAR_JOUR} par journée.`]
  if (!garnisonSuffisante(c))
    out.push(
      `🛡️ ${c.garnison} homme(s) sur ${garnisonRequise(c)} : ils se sentent exposés, −${LOYAUTE_GARNISON_MANQUANTE} par journée.`,
    )
  else out.push(`🛡️ La palissade est tenue (${c.garnison}/${garnisonRequise(c)}) : un raid sera repoussé sans vous.`)
  if (c.epreuve)
    out.push(`${EPREUVES[c.epreuve.id].emoji} Un appel sans réponse : −${LOYAUTE_EPREUVE_IGNOREE} par journée.`)
  const net = loyauteApres(c) - c.loyaute
  out.push(`Au total : ${net > 0 ? '+' : ''}${net} par journée, soit ${motLoyaute(loyauteApres(c))} demain.`)
  return out
}
