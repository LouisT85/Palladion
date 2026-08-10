import { RISQUE_MIN } from './commerce'
import { MAX_TROUPES, VILLAGES_PAR_ID } from './expeditions'
import type { Cost } from './types'

/*
 * ═══════════════════════ LA FLOTTE ═══════════════════════
 *
 * Le port était un atelier à bronze avec un comptoir dessus. Il ne portait rien :
 * l'hiver fermait la mer et les deux îles de la Troade devenaient un mur, les
 * caravanes de Ténédos partaient à trente-deux pour cent de risque et l'on n'y
 * pouvait RIEN - le risque était une donnée du monde, pas une décision.
 *
 * La flotte est ce qui rend l'eau jouable. Elle tient en une phrase : DES COQUES
 * QU'ON BÂTIT, QU'ON AFFECTE, ET QU'ON PERD.
 *
 * ── DEUX NAVIRES, DEUX MÉTIERS QUI NE SE RECOUVRENT PAS ─────────────────────
 *
 *  · LA PENTÉCONTÈRE se bat. Elle escorte un convoi (le risque tombe) et elle
 *    ouvre le détroit quand la saison l'a fermé. Elle ne porte personne.
 *  · LA NEF DE CHARGE ne se bat pas. Elle porte : les hommes vers l'autre rive,
 *    et le butin au retour. Sans cales, la moitié du sac reste sur la grève.
 *
 * On ne peut donc pas « acheter de la flotte » : il faut choisir CE QU'ON VEUT
 * FAIRE de la mer, parce que le port plafonne le nombre de coques (deux au petit
 * quai, neuf au port franc) et qu'une coque affectée à un convoi n'est pas
 * disponible pour la colonne. C'est le plafond qui fait l'arbitrage, exactement
 * comme `caravanesMax` le fait pour le négoce.
 *
 * ── TROIS DÉCISIONS DE CONCEPTION, ET CE QU'ELLES ÉVITENT ───────────────────
 *
 * 1. AUCUNE COQUE NE PORTE D'ÉCHÉANCE. Une coque est retenue par une RÉFÉRENCE -
 *    l'id de la caravane qu'elle escorte, l'expédition en cours - et non par un
 *    `libreA` en millisecondes. Ce n'est pas une élégance : c'est ce qui la rend
 *    immunisée aux deux pièges du moteur. Un `libreA` aurait dû être reculé à la
 *    main dans le bloc de vitesse du tick (sans quoi une escorte durerait huit
 *    fois trop longtemps à ×8) et il aurait survécu tel quel à huit heures
 *    d'absence. Une référence, elle, se dénoue quand l'objet référencé se résout,
 *    et il se résout déjà correctement. C'est le patron de l'hécatombe, appliqué à
 *    autre chose que le temps.
 *    Seul le CHANTIER porte une échéance (`finAt`), parce qu'une cale est un
 *    chantier comme un autre : elle se recule dans le même bloc que `busyUntil`.
 *
 * 2. LA RETENUE EST UNE CHAÎNE, PAS UN BOOLÉEN. `retenue: { par, ref }` et non
 *    `enEscorte: boolean`. Deux systèmes en aval retiendront des coques - un
 *    blocus d'île en réclame plusieurs, une colonie en garde une à demeure - et
 *    chacun doit pouvoir rendre LES SIENNES sans connaître les autres. D'où
 *    `nbLibres()`, qui est la seule question qu'un système en aval doit poser :
 *    non pas « combien en ai-je » mais « combien puis-je encore engager ».
 *
 * 3. UNE COQUE SE PERD, ET SUR TROIS CANAUX. Sans cela la flotte serait un achat
 *    unique et le système mourrait au bout de dix minutes : on bâtit six coques,
 *    on n'y repense jamais. La mer prend son dû à chaque retour (PERTE_MER), un
 *    raid manqué se rembarque sous les traits (PERTE_ECHEC), le détroit forcé
 *    hors saison coûte des coques (PERTE_HIVER), et une escorte qui perd son
 *    convoi l'a perdu en se battant (PERTE_ESCORTE). Les trois premiers se
 *    CUMULENT en un seul tirage par coque (`partPerte`) : un raid d'hiver manqué
 *    laisse quarante-quatre pour cent de chaque coque au fond, et le joueur s'en
 *    souvient.
 *
 * Tout ce fichier est PUR : il ne lit qu'un instantané, ne touche à rien, et les
 * tirages lui sont FOURNIS (`rolls`) - le store est seul à connaître le hasard.
 */

// ── Les deux navires ─────────────────────────────────────────────────────────

export type TypeNavire = 'pentecontere' | 'nef'

export const TYPES_NAVIRE: TypeNavire[] = ['pentecontere', 'nef']

export interface NavireDef {
  id: TypeNavire
  nom: string
  pluriel: string
  emoji: string
  /** ce que le navire EST - une phrase, pas une notice */
  desc: string
  /** son métier, en une ligne, pour la carte du chantier */
  role: string
  cout: Cost
  /** durée du chantier, en millisecondes */
  chantierMs: number
  /** le détail chiffré, ligne par ligne */
  effets: string[]
}

/*
 * LES PRIX, ET LES ORDRES DE GRANDEUR QUI LES FIXENT.
 *
 * La référence est le BÉLIER DE SIÈGE (bois 120, bronze 30, 70 s) : la seule
 * autre MACHINE de ce jeu, et le seul objet qu'on bâtit sans qu'il soit un homme.
 * Une coque est plus grosse qu'un bélier et elle dure - elle doit donc coûter
 * plus.
 *
 *  · LA NEF DE CHARGE : bois 140, bronze 20, 70 s. Presque tout en bois, comme un
 *    bélier, et le même chantier : c'est une caisse à voile, pas une arme. En
 *    valeur de comptoir (bois 1, bronze 4) elle pèse 55 lingots - la moitié d'une
 *    caravane de Ténédos bien chargée. On en bâtit trois sans y penser.
 *  · LA PENTÉCONTÈRE : bois 200, bronze 80, 120 s. Quatre-vingts lingots de
 *    bronze, c'est DEUX HOPLITES (38 chacun) qu'on n'alignera pas : le bronze
 *    arbitre partout ailleurs dans ce jeu, il doit arbitrer ici. Son chantier de
 *    deux minutes se situe entre un bâtiment de niveau 2 (90 s) et un de niveau 3
 *    (200 s) - on ne se rattrape pas d'un naufrage en une minute.
 */
export const NAVIRES: Record<TypeNavire, NavireDef> = {
  pentecontere: {
    id: 'pentecontere',
    nom: 'Pentécontère',
    pluriel: 'pentécontères',
    emoji: '⚔️',
    desc:
      'Cinquante rames, un éperon, un pont ras. Elle ne porte ni grain ni hommes : elle porte la peur. Les écumeurs de la côte connaissent sa silhouette et cherchent une autre proie.',
    role: 'Elle escorte les convois par eau, et elle seule force le détroit quand la saison l’a fermé.',
    cout: { bois: 200, bronze: 80 },
    chantierMs: 120_000,
    effets: [
      'Une galère d’escorte : risque du convoi ×0,62 - mieux qu’une amitié',
      'Deux galères : risque ×0,38 - autant qu’une alliance, et sans serment',
      'Une galère au moins pour forcer le détroit hors saison',
      'Elle coule avec le convoi qu’elle n’a pas su sauver (18 %)',
    ],
  },
  nef: {
    id: 'nef',
    nom: 'Nef de charge',
    pluriel: 'nefs de charge',
    emoji: '📦',
    desc:
      'Un gros ventre de sapin, une voile carrée, pas un rameur de trop. Elle est lente, elle ne se défend pas, et sans elle rien ne traverse : ni les hommes à l’aller, ni le sac au retour.',
    role: 'Elle porte huit hommes vers l’autre rive, et ramène ce qu’on y a pris.',
    cout: { bois: 140, bronze: 20 },
    chantierMs: 70_000,
    effets: [
      'Huit hommes par cale : une colonne pleine en demande trois',
      'Butin d’outre-mer +10 % par cale embarquée (+30 % au plus)',
      'Obligatoire pour traverser quand la mer est fermée',
      'Elle ne se bat pas : c’est la galère qui la protège',
    ],
  },
}

// ── Le plafond du port ───────────────────────────────────────────────────────

/*
 * CE QUE LE PORT PEUT MOUILLER, par niveau. C'est LE chiffre du système, et il
 * est calé sur une seule question : à quel niveau peut-on faire les deux choses à
 * la fois ?
 *
 * Une colonne pleine outre-mer en hiver demande 3 nefs + 1 galère = 4 coques.
 * Escorter deux convois à deux galères en demande 2 de plus.
 *
 *   port 1 · 2 coques  — on choisit : une escorte, ou rien
 *   port 2 · 4 coques  — la traversée d'hiver EXACTEMENT, et plus une galère pour
 *                        le négoce : c'est là que l'arbitrage mord le plus
 *   port 3 · 6 coques  — la traversée, et deux galères d'escorte
 *   port 4 · 9 coques  — « Port franc : trirèmes » ; on ne choisit plus, on a
 *                        payé 520 pierre et 400 bois pour ne plus choisir
 *
 * Les chantiers en cours COMPTENT dans le plafond (`coquesComptees`) : sans cela
 * on mettrait neuf coques en cale au port 1 et le plafond ne serait qu'un délai.
 */
export const PLAFOND_COQUES = [0, 2, 4, 6, 9]

export function coquesMax(port: number): number {
  return PLAFOND_COQUES[Math.max(0, Math.min(PLAFOND_COQUES.length - 1, Math.floor(port)))] ?? 0
}

/**
 * Cales de chantier, c'est-à-dire coques qu'on peut monter EN MÊME TEMPS. Une
 * seule au petit quai et au quai de pierre ; le niveau 3 en promet deux dans son
 * texte (« Deux quais, entrepôt ») et le niveau 4 trois. Sans ce second plafond,
 * un joueur riche mettrait ses neuf coques en cale d'un seul coup et la durée des
 * chantiers ne coûterait plus rien.
 */
export function calesMax(port: number): number {
  if (port <= 0) return 0
  if (port <= 2) return 1
  return port === 3 ? 2 : 3
}

// ── L'état persistant ────────────────────────────────────────────────────────

/**
 * Ce qui retient une coque au loin.
 *
 * `par` est une CHAÎNE OUVERTE et non une énumération fermée, et c'est délibéré :
 * `'escorte'` et `'colonne'` sont les deux motifs d'aujourd'hui, un blocus et une
 * colonie viendront demain, et chacun libère les siennes par ce nom sans toucher
 * à ce fichier. `ref` est l'objet qui la rendra - l'id d'une caravane - ou `null`
 * quand rien ne la rendra tout seul (une colonie la garde jusqu'à ordre).
 */
export interface Retenue {
  par: string
  ref: string | null
}

/** l'escorte d'un convoi : la coque est rendue quand la caravane se résout */
export const PAR_ESCORTE = 'escorte'
/** la traversée avec la colonne : rendue à la fin de l'expédition, quelle qu'en soit l'issue */
export const PAR_COLONNE = 'colonne'

export interface Coque {
  id: string
  type: TypeNavire
  /** `null` = au mouillage, donc engageable */
  retenue: Retenue | null
}

/** une coque en cale - la SEULE échéance en millisecondes de tout le système */
export interface ChantierNaval {
  id: string
  type: TypeNavire
  finAt: number
}

export interface EtatFlotte {
  coques: Coque[]
  chantiers: ChantierNaval[]
}

/**
 * Une flotte neuve. C'est une FONCTION et non une constante partagée : un objet
 * de module aurait été le même pour `etatInitial()` et pour la migration, et le
 * premier `push` d'une coque l'aurait rempli pour tout le monde - y compris pour
 * la partie suivante, dans la même page.
 */
export function flotteVide(): EtatFlotte {
  return { coques: [], chantiers: [] }
}

// ── Lire la flotte ───────────────────────────────────────────────────────────

function liste(f: EtatFlotte | null | undefined): Coque[] {
  return f?.coques ?? []
}

/** toutes les coques, d'un type ou de tous */
export function coquesDe(f: EtatFlotte | null | undefined, type?: TypeNavire): Coque[] {
  const c = liste(f)
  return type ? c.filter((x) => x.type === type) : c
}

/**
 * LES COQUES ENGAGEABLES. C'est la fonction que les systèmes en aval doivent
 * appeler - un blocus qui lirait `coques.length` armerait des galères déjà
 * parties escorter un convoi, et le joueur verrait la même coque à deux endroits.
 */
export function libres(f: EtatFlotte | null | undefined, type?: TypeNavire): Coque[] {
  return coquesDe(f, type).filter((c) => c.retenue === null)
}

export function nbCoques(f: EtatFlotte | null | undefined, type?: TypeNavire): number {
  return coquesDe(f, type).length
}

export function nbLibres(f: EtatFlotte | null | undefined, type?: TypeNavire): number {
  return libres(f, type).length
}

/** les coques qu'un motif donné retient - et, si `ref` est fourni, pour cet objet précis */
export function retenues(f: EtatFlotte | null | undefined, par: string, ref?: string | null): Coque[] {
  return liste(f).filter((c) => c.retenue?.par === par && (ref === undefined || c.retenue?.ref === ref))
}

/** coques + chantiers : ce qui pèse sur le plafond du port */
export function coquesComptees(f: EtatFlotte | null | undefined): number {
  return liste(f).length + (f?.chantiers?.length ?? 0)
}

/** places de mouillage encore libres au port de ce niveau */
export function placeAuPort(f: EtatFlotte | null | undefined, port: number): number {
  return Math.max(0, coquesMax(port) - coquesComptees(f))
}

// ── Écrire la flotte (des listes neuves, jamais de mutation) ──────────────────

export function retenir(coques: Coque[], ids: string[], r: Retenue): Coque[] {
  const pris = new Set(ids)
  return coques.map((c) => (pris.has(c.id) ? { ...c, retenue: { ...r } } : c))
}

/**
 * Rend les coques qu'un motif retenait. `ref` omis = TOUTES celles de ce motif -
 * c'est ce qui permet de rattraper une retenue orpheline (une expédition dont
 * l'issue n'est jamais passée par la fin normale, un fichier repris à la main).
 */
export function relacher(coques: Coque[], par: string, ref?: string | null): Coque[] {
  return coques.map((c) =>
    c.retenue?.par === par && (ref === undefined || c.retenue?.ref === ref) ? { ...c, retenue: null } : c,
  )
}

export function couler(coques: Coque[], ids: string[]): Coque[] {
  const perdues = new Set(ids)
  return coques.filter((c) => !perdues.has(c.id))
}

// ── Le chantier ──────────────────────────────────────────────────────────────

/** ce qu'il faut savoir pour juger si l'on peut mettre une coque en cale */
export interface SnapFlotte {
  port: number
  flotte: EtatFlotte
  /** `merFermee(s)` - la saison morte, grâce de Poséidon comprise */
  merFermee: boolean
  now: number
}

export type RefusChantier = 'port' | 'plafond' | 'cales'

/**
 * Le juge unique de la mise en cale. Le store l'appelle avant de payer, le
 * panneau l'appelle pour griser la carte AVEC SON MOTIF : un bouton éteint sans
 * raison affichée est la première cause d'abandon d'un panneau de ce jeu.
 */
export function refusChantier(s: SnapFlotte): RefusChantier | null {
  if (s.port <= 0) return 'port'
  if (placeAuPort(s.flotte, s.port) <= 0) return 'plafond'
  if ((s.flotte?.chantiers?.length ?? 0) >= calesMax(s.port)) return 'cales'
  return null
}

export function motifRefusChantier(r: RefusChantier, port: number): string {
  switch (r) {
    case 'port':
      return 'Il n’y a pas de port : une coque se monte sur une cale, pas sur une plage.'
    case 'plafond':
      return `Le port de niveau ${port} ne mouille que ${coquesMax(port)} coque${coquesMax(port) > 1 ? 's' : ''}. Agrandissez le port, ou désarmez une coque.`
    case 'cales':
      return `Les ${calesMax(port) > 1 ? `${calesMax(port)} cales sont` : 'charpentiers sont'} déjà pris${calesMax(port) > 1 ? 'es' : ''}. On ne monte pas deux quilles sur la même cale.`
  }
}

export function creerChantier(id: string, type: TypeNavire, now: number): ChantierNaval {
  return { id, type, finAt: now + NAVIRES[type].chantierMs }
}

/** les coques dont la quille est achevée - le tick n'a plus qu'à les mettre à l'eau */
export function chantiersEchus(f: EtatFlotte | null | undefined, now: number): ChantierNaval[] {
  return (f?.chantiers ?? []).filter((c) => now >= c.finAt)
}

/**
 * Ce qu'on récupère en désarmant une coque : les deux cinquièmes du bois, et rien
 * du bronze - les clous, l'éperon et les ferrures sont repartis dans les armes
 * il y a longtemps.
 *
 * Ce n'est pas une commodité. Sans elle, un joueur qui a bâti trois nefs et
 * aucune galère au port de niveau 1 est dans un CUL-DE-SAC : il ne peut ni
 * escorter, ni traverser, ni rien changer avant d'avoir payé deux niveaux de
 * port. Le plafond doit être un arbitrage, pas une punition irréversible.
 */
export const DESARME_RECUP = 0.4

export function recuperationDesarmement(type: TypeNavire): Cost {
  const bois = Math.round((NAVIRES[type].cout.bois ?? 0) * DESARME_RECUP)
  return bois > 0 ? { bois } : {}
}

// ── L'escorte ────────────────────────────────────────────────────────────────

/**
 * Deux galères par convoi au plus. Trois n'ajouteraient qu'un huitième de risque
 * écarté pour une coque immobilisée entière : le plafond est là pour que la
 * troisième galère serve à AUTRE CHOSE.
 */
export const ESCORTE_MAX = 2

/**
 * CE QU'UNE GALÈRE FAIT AU RISQUE : elle le multiplie par 0,62.
 *
 * Le chiffre n'est pas décrété, il est calé sur la table qui existe déjà -
 * `MULT_RISQUE_STATUT` du commerce : marié 0,20 · allié 0,35 · ami 0,70 ·
 * neutre 1 · hostile 1,40.
 *
 *   une galère  ×0,62  — un peu mieux qu'une amitié (0,70)
 *   deux galères ×0,38 — presque exactement une alliance (0,35)
 *
 * D'où une phrase que le joueur peut tenir en tête : « une galère vaut mieux
 * qu'une amitié, deux galères valent une alliance - et l'alliance, elle, ne se
 * bâtit pas en bois. » Le négoce a désormais DEUX façons de rendre une route
 * sûre, l'une diplomatique et lente, l'autre militaire et qu'on peut perdre.
 */
export const FACTEUR_ESCORTE = 0.62

/** ce que coule une galère qui n'a pas su sauver son convoi */
export const PERTE_ESCORTE = 0.18

/**
 * Les places qu'on ESCORTE : celles qu'on atteint par l'eau, et elles seules.
 *
 * Les deux îles (`maritime`) et les deux places de la grève (`terrain: 'cote'`) -
 * le comptoir phénicien et le fort achéen - soit quatre des huit. Une galère
 * n'escorte pas des mulets sur la colline de Mysie : elle n'y va pas.
 *
 * Ce n'est pas une restriction pour la forme. Ténédos et Lesbos sont les deux
 * routes les plus longues (quatre étapes, donc les plus risquées) et les mieux
 * majorées : l'escorte ouvre exactement le bout rentable du négoce, et le panneau
 * enseigne du même coup la géographie de la Troade.
 *
 * ⚠️ ET L'ON NE CONFOND PAS AVEC LA TRAVERSÉE (`verdictTraversee`), qui ne
 * regarde QUE `maritime`. Une charretée de pierre gagne le fort achéen par
 * cabotage - on longe la côte, c'est plus court et cela ne fatigue personne -
 * tandis qu'une colonne d'hommes en armes y marche. La même place se négocie par
 * l'eau et s'assiège par la terre, et les deux règles disent donc autre chose.
 */
export function escortable(villageId: string): boolean {
  const v = VILLAGES_PAR_ID[villageId]
  if (!v) return false
  return !!v.maritime || v.terrain === 'cote'
}

/** pourquoi cette route ne s'escorte pas - dit au joueur, jamais deviné */
export function motifPasEscortable(villageId: string): string {
  const v = VILLAGES_PAR_ID[villageId]
  const nom = v?.nom ?? 'cette place'
  return `On ne va pas à ${nom} par l’eau : une galère n’escorte pas des mulets.`
}

/** galères qu'on peut réellement affecter à ce convoi, ici et maintenant */
export function escorteMax(f: EtatFlotte | null | undefined, villageId: string): number {
  if (!escortable(villageId)) return 0
  return Math.min(ESCORTE_MAX, nbLibres(f, 'pentecontere'))
}

/**
 * Le risque, escorte comprise. C'est CE nombre que le panneau montre AVANT le
 * chargement et que le store fige dans la caravane : `Caravane.risque` est figé
 * au départ parce qu'on l'a montré au joueur, et l'escorte doit donc être dans le
 * nombre montré, pas appliquée en douce au retour.
 */
export function risqueEscorte(risqueNu: number, galeres: number): number {
  const n = Math.max(0, Math.min(ESCORTE_MAX, Math.floor(galeres)))
  if (n === 0) return risqueNu
  return Math.max(RISQUE_MIN, risqueNu * Math.pow(FACTEUR_ESCORTE, n))
}

/** points de risque que l'escorte écarte - ce que la carte du convoi affiche en clair */
export function gainEscorte(risqueNu: number, galeres: number): number {
  return Math.max(0, risqueNu - risqueEscorte(risqueNu, galeres))
}

// ── La traversée ─────────────────────────────────────────────────────────────

/**
 * Huit hommes par cale. `MAX_TROUPES` vaut vingt : une colonne pleine demande
 * donc TROIS nefs, et trois nefs plus la galère qui les couvre font quatre
 * coques - le plafond exact du port de niveau 2. Ce n'est pas un hasard, c'est le
 * point où le système est le plus intéressant : à quatre coques, traverser en
 * hiver, c'est renoncer à toute escorte pendant que la colonne est dehors.
 */
export const PLACES_PAR_NEF = 8

/** nefs qu'il faut pour porter tant d'hommes - jamais plus que pour une colonne pleine */
export function nefsRequises(hommes: number): number {
  const n = Math.max(0, Math.min(MAX_TROUPES, Math.ceil(hommes)))
  return Math.ceil(n / PLACES_PAR_NEF)
}

/**
 * CE QUE LES CALES AJOUTENT AU BUTIN : un dixième par nef embarquée.
 *
 * Le nom est celui que le store additionne DÉJÀ - le multiplicateur de butin de
 * `finirExpedition` est une somme de termes (`bonusHeros().butinPct +
 * bonusFaveurs().butinPct + bonusHecatombe().butinPct + effetsChef().butinPct +
 * rase * 0,25`) et la flotte y ajoute un terme, pas une branche.
 *
 * Trois nefs plafonnent donc à +30 %, à comparer au pillard sur le trône (+25 %)
 * et au sang sur l'autel d'Arès (+50 %). Et cela répond à la seule objection
 * sérieuse contre la nef de charge : sans ce dixième, elle ne servirait qu'un
 * quart de l'année - celui où la mer est prise - et personne n'en bâtirait.
 * Diégétiquement c'est la même idée que le sac en règle : on ne rapporte que ce
 * qu'on peut charger.
 */
export const BUTIN_PAR_NEF = 0.1

/** l'état d'une traversée - `terre` quand la place n'est pas d'outre-mer */
export type Passage = 'terre' | 'saison' | 'flotte' | 'manque'

export interface Traversee {
  passage: Passage
  /** nefs qu'il faudrait pour porter cette colonne */
  requises: number
  /** nefs libres qui embarqueront réellement */
  nefs: number
  /** galères libres qui couvriront la traversée */
  galeres: number
  /** ce qui manque, dit au joueur - `null` si la colonne peut partir */
  motif: string | null
  /** part de butin que les cales ajoutent */
  butinPct: number
  /** risque de perdre CHAQUE coque engagée au retour */
  risque: number
  /** la colonne peut-elle partir ? */
  possible: boolean
}

/**
 * Ce que la mer autorise pour cette colonne.
 *
 * QUATRE VERDICTS, ET LE PLUS IMPORTANT EST QUE `saison` NE CHANGE RIEN À CE QUI
 * MARCHAIT. Une place d'outre-mer par mer ouverte reste atteignable SANS AUCUNE
 * COQUE, exactement comme avant la flotte. Exiger des nefs pour aller à Lesbos en
 * été aurait fermé deux places fortes sur huit à tout joueur qui n'a pas de port,
 * cassé la campagne et les défis, et transformé un ajout en régression. La flotte
 * AJOUTE : elle ouvre l'hiver, et elle ramène davantage.
 *
 * ET POURQUOI « MALGRÉ LA SAISON » PLUTÔT QUE « PLUS VITE ». Le second était
 * impossible à tenir : dans ce moteur une expédition n'a pas de trajet - la
 * bataille est créée dans le même geste que le départ (`lancerExpedition` monte
 * `creerBataille` sur-le-champ), il n'y a aucune durée d'approche à raccourcir.
 * Inventer un trajet aurait voulu dire inventer une échéance de plus, dans le
 * système même où l'on vient d'expliquer qu'on n'en veut pas. La saison, elle,
 * est un mur qui existe déjà et que la flotte peut enfoncer.
 */
export function verdictTraversee(s: SnapFlotte, villageId: string, hommes: number): Traversee {
  const v = VILLAGES_PAR_ID[villageId]
  /*
   * UNE COLONNE, MÊME VIDE, DEMANDE UNE CALE.
   *
   * L'écran de préparation d'une expédition s'ouvre à ZÉRO homme (`troupes0({})`)
   * et interroge la mer dans le même souffle. Sans ce plancher, la première chose
   * que le joueur lisait au-dessus du bouton d'assaut était « forcer le détroit
   * demande 0 cale et une galère », ou « 0 nef de charge y ajouterait 0 % de
   * butin » - avant même d'avoir cliqué sur un hoplite. On ne traverse jamais à
   * zéro homme, le store refuse la colonne vide cinquante lignes plus bas : le
   * chiffre honnête à montrer est donc celui d'UN homme.
   */
  const requises = nefsRequises(Math.max(1, hommes))
  const nefsDispo = nbLibres(s.flotte, 'nef')
  const galeresDispo = nbLibres(s.flotte, 'pentecontere')

  if (!v?.maritime) {
    return {
      passage: 'terre',
      requises: 0,
      nefs: 0,
      galeres: 0,
      motif: null,
      butinPct: 0,
      risque: 0,
      possible: true,
    }
  }

  if (!s.merFermee) {
    // mer ouverte : on passe comme avant, et les cales qu'on a suivent
    const nefs = Math.min(nefsDispo, requises)
    return {
      passage: 'saison',
      requises,
      nefs,
      galeres: 0,
      motif: null,
      butinPct: nefs * BUTIN_PAR_NEF,
      risque: nefs > 0 ? partPerte({}) : 0,
      possible: true,
    }
  }

  // la mer est prise : il faut la flotte entière, cales ET galère
  if (nefsDispo < requises || galeresDispo < 1) {
    const manque: string[] = []
    if (nefsDispo < requises)
      manque.push(`${requises - nefsDispo} nef${requises - nefsDispo > 1 ? 's' : ''} de charge`)
    if (galeresDispo < 1) manque.push('une pentécontère pour ouvrir la route')
    return {
      passage: 'manque',
      requises,
      nefs: nefsDispo,
      galeres: galeresDispo,
      motif: `La mer est prise : forcer le détroit demande ${requises} cale${requises > 1 ? 's' : ''} et une galère. Il vous manque ${manque.join(' et ')}.`,
      butinPct: 0,
      risque: 0,
      possible: false,
    }
  }
  return {
    passage: 'flotte',
    requises,
    nefs: requises,
    galeres: 1,
    motif: null,
    butinPct: requises * BUTIN_PAR_NEF,
    risque: partPerte({ hiver: true }),
    possible: true,
  }
}

/** les coques qui embarquent réellement, dans l'ordre : les cales, puis l'escorte */
export function coquesEmbarquees(f: EtatFlotte | null | undefined, t: Traversee): Coque[] {
  if (!t.possible) return []
  return [...libres(f, 'nef').slice(0, t.nefs), ...libres(f, 'pentecontere').slice(0, t.galeres)]
}

// ── Ce que la mer prend ──────────────────────────────────────────────────────

/**
 * LA MER PREND SON DÛ, à chaque retour, même après un triomphe. Six pour cent par
 * coque : sur trois nefs, une coque perdue tous les six raids environ. Sans ce
 * terme, une colonne d'été qui gagne rapporterait +30 % de butin pour zéro risque,
 * et la nef de charge redeviendrait ce qu'on voulait éviter - un achat unique.
 */
export const PERTE_MER = 0.06

/** un raid manqué : on rembarque en désordre, sous les traits, en abandonnant des coques */
export const PERTE_ECHEC = 0.3

/** le détroit forcé hors saison : la mer d'hiver ne pardonne pas au retour */
export const PERTE_HIVER = 0.15

export interface Circonstances {
  /** le raid a échoué */
  echec?: boolean
  /** on avait forcé la mer fermée */
  hiver?: boolean
}

/**
 * La chance de perdre UNE coque, tout cumulé.
 *
 * On compose les trois causes en PROBABILITÉ DE SURVIE (un produit), et non en
 * addition : additionner 0,06 + 0,30 + 0,15 donnerait 0,51 aujourd'hui et
 * passerait au-dessus de 1 le jour où un quatrième malheur s'ajoutera - une
 * certitude de tout perdre qu'aucun de nous n'aurait décidée. Le produit
 * s'approche de 1 sans jamais l'atteindre, ce qui est la propriété qu'on veut :
 * il reste toujours un espoir de ramener une coque.
 *
 * Le pire cas d'aujourd'hui - un raid d'hiver manqué - vaut 44 % par coque, soit
 * près de deux coques sur quatre au fond. C'est cher, et c'est le but : la flotte
 * doit FONDRE, sinon le système meurt au bout de dix minutes.
 */
export function partPerte(c: Circonstances): number {
  const survie = (1 - PERTE_MER) * (c.echec ? 1 - PERTE_ECHEC : 1) * (c.hiver ? 1 - PERTE_HIVER : 1)
  return 1 - survie
}

/**
 * Les coques que la mer a prises. `rolls` est FOURNI par l'appelant - le store
 * est seul à connaître `Math.random()`, et c'est ce qui rend cette fonction
 * testable au tirage près. Un tirage manquant vaut 1 : on ne coule jamais une
 * coque faute d'avoir su tirer.
 */
export function naufrages(coques: Coque[], part: number, rolls: number[]): string[] {
  if (part <= 0) return []
  return coques.filter((_, i) => (rolls[i] ?? 1) < part).map((c) => c.id)
}

/** ce que la chronique dira des coques perdues - jamais une ligne vide */
export function recitNaufrage(perdues: Coque[], c: Circonstances): string[] {
  if (perdues.length === 0) return []
  const compte = perdues.map((p) => NAVIRES[p.type].nom.toLowerCase())
  const quoi = compte.length === 1 ? compte[0] : `${compte.slice(0, -1).join(', ')} et ${compte.at(-1)}`
  if (c.echec && c.hiver)
    return [`On a rembarqué sous les traits, dans la mer d’hiver : ${quoi} ne sont pas revenus du détroit.`]
  if (c.echec) return [`La retraite s’est faite à la nage : ${quoi} sont restés sur la grève, brûlés.`]
  if (c.hiver) return [`Le détroit s’est refermé au retour : ${quoi} ont sombré à vue de côte.`]
  return [`La mer a pris son dû, comme toujours : ${quoi} ne rentrent pas au port.`]
}

/** ce que la chronique dira d'une escorte qui a perdu son convoi */
export function recitEscorteCoulee(perdues: Coque[]): string[] {
  if (perdues.length === 0) return []
  return [
    perdues.length === 1
      ? 'La pentécontère s’est mise en travers pour couvrir la fuite du convoi. On ne l’a pas revue.'
      : `Les ${perdues.length} pentécontères se sont mises en travers pour couvrir le convoi. Aucune n’est rentrée.`,
  ]
}

// ── Ce que le panneau du port affiche ────────────────────────────────────────

/**
 * L'état d'une coque, en français, pour la liste du panneau.
 *
 * Les deux motifs de CE système sont nommés ; tout autre motif tombe dans la
 * formule générique, et c'est voulu : ce module ne doit pas connaître le
 * vocabulaire des systèmes qui viendront (un blocus, une colonie). Ils
 * retiendront des coques sous leur propre nom, la liste restera lisible, et
 * personne n'aura eu à revenir ici ajouter une ligne.
 */
export function etatCoque(c: Coque): string {
  if (!c.retenue) return 'au mouillage'
  if (c.retenue.par === PAR_ESCORTE) return 'en escorte d’un convoi'
  if (c.retenue.par === PAR_COLONNE) return 'partie avec la colonne'
  return `retenue au loin (${c.retenue.par})`
}

/** « 4 coques, 2 en mer » - le libellé du bouton, sur la carte du port */
export function resumeFlotte(f: EtatFlotte | null | undefined): string {
  const total = nbCoques(f)
  if (total === 0) return 'aucune coque à quai'
  const dehors = total - nbLibres(f)
  return `${total} coque${total > 1 ? 's' : ''}${dehors > 0 ? `, ${dehors} en mer` : ''}`
}
