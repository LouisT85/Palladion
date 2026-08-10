import { RES, UNITS, UNIT_IDS } from './data'
import {
  MAX_TROUPES,
  VILLAGES_PAR_ID,
  garnisonEffective,
  puissanceColonne,
  puissanceEffective,
  type VillageCible,
} from './expeditions'
import type { Cost, ResourceId, UnitId } from './types'

/*
 * ═══════════════════════ LE BLOCUS ═══════════════════════
 *
 * On ne savait faire que deux choses d'une place forte : la piller (trois minutes
 * de bataille, du butin, Zeus fâché) ou la secourir. Les deux sont des ASSAUTS -
 * la même scène, le même moteur, la même minute. Le monde de l'Iliade tient
 * pourtant sur l'inverse : dix ans devant Troie, et pas une muraille percée.
 *
 * Le blocus est cette troisième façon, et elle n'est pas une bataille : c'est une
 * DURÉE. On poste des hommes devant la place, ils y restent, ils mangent votre
 * grain, ils s'usent ; on coupe l'eau, on brûle les récoltes, on mine le mur ; la
 * place s'affaiblit journée après journée, sa garnison désarme, et finit par
 * offrir sa reddition - ou par SORTIR tenter une percée.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SIX DÉCISIONS DE CONCEPTION, ET LE DÉFAUT CONCRET QUE CHACUNE ÉVITE.
 *
 * 1. LE BLOCUS N'EST PAS UNE `ExpeditionEnCours`, ET NE CRÉE AUCUNE BATAILLE.
 *    `s.expedition` est un état RUNTIME : `init()` le remet à `null` à chaque
 *    ouverture du jeu, `s.vitesse` est forcée à ×1 tant qu'il vit, et la scène
 *    demande le joueur présent. Un blocus de cinq journées de jeu - quarante
 *    minutes réelles - n'aurait donc pas survécu au premier rechargement de la
 *    page, et aurait interdit l'accéléré pendant toute sa durée. C'est un état
 *    PERSISTANT à lui, à côté de l'expédition, et le jeu continue autour de lui.
 *
 * 2. IL SE COMPTE EN JOURNÉES DE JEU, ET PAS UNE SEULE ÉCHÉANCE EN MILLISECONDES.
 *    C'est le patron de l'hécatombe, pour les mêmes deux raisons : le bloc de
 *    vitesse du `tick` recule à la main toute échéance en millisecondes (un blocus
 *    à `finAt` aurait duré huit fois trop longtemps à ×8, faute d'être listé dans
 *    ce bloc), et le rattrapage hors ligne fait bondir le calendrier de soixante
 *    journées d'un coup. La journée est l'unité, le crochet quotidien du store est
 *    l'horloge, et il n'y a RIEN à décaler.
 *
 * 3. ⚠️ ON COMPTE LES JOURNÉES TENUES, ON NE SOUSTRAIT PAS DEUX DATES.
 *    `jour - depuis` aurait été le réflexe, et c'était le piège : le crochet
 *    quotidien ne rattrape JAMAIS plus d'une journée (`vieDesFamilles`, et c'est
 *    délibéré), tandis que `jourDe(s)` avance de soixante après huit heures
 *    d'absence. Le joueur serait revenu devant « blocus, jour 61 » sur une ligne
 *    qui n'a mangé qu'une ration et usé la place d'un cran. `jours` est donc un
 *    COMPTEUR, incrémenté par la journée qu'on résout, et `depuis` ne sert qu'à la
 *    chronique.
 *
 * 4. LA PLACE NE TOMBE JAMAIS TOUTE SEULE, ET L'OFFRE NE SE PÉRIME PAS.
 *    C'est le corollaire tiré des successions : ce qui doit être DÉCIDÉ par le
 *    joueur ne se résout pas pendant son absence. La volonté de la place descend
 *    jusqu'à `SEUIL_OFFRE`, la reddition est OFFERTE, et là tout s'arrête et
 *    attend - sans compte à rebours. Le prix de l'indécision n'est pas une
 *    occasion manquée, c'est du grain : la ration se paie chaque journée, offre ou
 *    pas. (Et la tenue de la ligne ne décroît plus qu'à demi une fois l'offre
 *    faite : les hommes voient la fin, ils patientent. Sans cela, huit heures
 *    d'absence auraient fini par rompre une ligne victorieuse, c'est-à-dire par
 *    trancher à la place du joueur.)
 *
 * 5. AUCUNE SECONDE FORME DE BATAILLE - ET DEUX SORTS DIFFÉRENTS POUR DEUX
 *    SITUATIONS DIFFÉRENTES.
 *     · L'ASSAUT est une décision du joueur, prise devant l'écran : il passe donc
 *       par le moteur existant (`lancerExpedition`, `creerBataille`), sur une
 *       garnison DÉSARMÉE et un mur miné. Aucune ligne de combat n'est réécrite.
 *     · LA SORTIE de la garnison, elle, tombe dans le crochet quotidien - qui
 *       tourne aussi quand le joueur n'est pas là. Ouvrir une scène de bataille
 *       sans personne pour la jouer, c'est la perdre par forfait. Elle se résout
 *       donc par un JET CHIFFRÉ ET RACONTÉ : on oppose la force de la ligne à
 *       celle d'une garnison aux abois (`puissanceSortie`), dans la MÊME métrique
 *       que le panneau d'expédition (`atk + hp/8`) - pas une seconde arithmétique.
 *
 * 6. LES HOMMES POSTÉS NE DÉFENDENT PAS LE VILLAGE, ET C'EST UNE RÈGLE, PAS UNE
 *    AMBIANCE. Ils sont retirés de `s.army` comme ceux d'une colonne : la
 *    garnison des remparts fond d'autant, sans qu'on ait à l'écrire nulle part.
 *    Deux garde-fous par-dessus : on ne poste jamais plus de `PART_MAX_DEHORS` de
 *    l'armée (`refusBlocus` → 'garde'), et un assaut sur le village SE SENT
 *    au camp (`nouvelleDuVillage`) - un village pillé pendant qu'on tient une
 *    ligne au loin, et la ligne se défait d'elle-même.
 */

// ── L'état ───────────────────────────────────────────────────────────────────

/** les trois travaux de siège, chacun ordonnable une seule fois */
export type TravailId = 'eau' | 'recoltes' | 'sape'

/** l'état d'un blocus en cours. Le store le porte dans `s.blocus`. */
export interface EtatBlocus {
  villageId: string
  /**
   * Journée de jeu où la ligne a été posée. POUR LA CHRONIQUE SEULEMENT : voir
   * l'en-tête, point 3 - `jourDe(s) - depuis` mentirait de soixante après une
   * absence de huit heures.
   */
  depuis: number
  /** journées effectivement tenues, incrémentées par `resoudreJournee` */
  jours: number
  /** les hommes postés là-bas. Ils sont RETIRÉS de `s.army` : ils manquent aux murs. */
  postes: Partial<Record<UnitId, number>>
  /** volonté de la place, de VOLONTE_MAX à 0. À SEUIL_OFFRE, elle parlemente. */
  volonte: number
  /** tenue de la ligne, de TENUE_MAX à 0. À 0, les hommes rentrent d'eux-mêmes. */
  tenue: number
  /** travaux déjà ordonnés */
  travaux: TravailId[]
  /** la place a offert sa reddition. L'offre ATTEND - elle ne se périme pas. */
  offre: boolean
  /** la garnison a déjà tenté sa percée : elle n'en a pas deux en réserve */
  sortieFaite: boolean
  /** dernier récit de journée, pour que le panneau montre ce qui vient d'arriver */
  dernier: string[]
}

// ── Les chiffres, et d'où ils sortent ────────────────────────────────────────

export const VOLONTE_MAX = 100
export const TENUE_MAX = 100

/**
 * L'effectif minimal d'une ligne. Cinq hommes ne bloquent pas une porte : en
 * dessous, ce n'est pas un blocus, c'est une embuscade - et l'embuscade existe
 * déjà, elle s'appelle le pillage.
 */
export const MIN_HOMMES = 6

/**
 * Ce qu'on ne poste JAMAIS. Sept dixièmes de l'armée dehors, c'est déjà beaucoup ;
 * tout dehors, c'est un village sans un homme sur ses remparts, et le joueur ne
 * l'apprendrait qu'à l'assaut suivant - c'est-à-dire trop tard pour en tirer une
 * leçon. Avec `MIN_HOMMES`, la règle dit aussi quand le blocus s'ouvre dans une
 * partie : il faut NEUF soldats levés pour en poster six, soit une caserne 2 et
 * quelques minutes de bronze. Un blocus est un outil de milieu de règne.
 */
export const PART_MAX_DEHORS = 0.7

/**
 * Le grain qu'un homme posté mange par journée de jeu.
 *
 * Au village, un soldat coûte `CONSO_SOLDAT` = 0,5 par minute, soit QUATRE mesures
 * par journée (`DAY_MS` = 8 min). Au camp il en coûte plus du double : il faut
 * charrier jusqu'à lui, et la moitié de ce qu'on charrie se perd sur la route.
 * Douze hommes devant une place, c'est donc 108 mesures par journée - de l'ordre
 * du présent diplomatique le plus cher (`coutPresent` de la forteresse : 502 de
 * grain), mais versé JOURNÉE APRÈS JOURNÉE. C'est là tout le sujet : le blocus
 * n'a pas un prix, il a un DÉBIT, et c'est le seul système du jeu qui se paie
 * ainsi.
 */
export const RATION_PAR_JOUR = 9

/**
 * On refuse d'ouvrir une ligne qu'on ne peut pas nourrir trois journées. Le refus
 * enseigne au lieu de punir : sans lui, le joueur postait douze hommes avec
 * quarante mesures en magasin, la famine tombait au premier matin, et il perdait
 * des hommes sans avoir jamais vu venir la règle.
 */
export const JOURS_DE_VIVRES_EXIGES = 3

/**
 * Ce qu'une place perd de volonté chaque journée, SANS RIEN FAIRE.
 *
 * Cinq points, et le chiffre est calé contre la tenue de la ligne : par la seule
 * patience il faut QUINZE journées pour amener une place à parlementer
 * ((100 − 25) / 5), et une ligne n'en tient que DOUZE (100 / 8). Poster des hommes
 * et attendre ne suffit donc jamais - il faut du monde, ou des travaux.
 *
 * Une ligne mince mais pas nulle rentre dans les douze journées, et c'est voulu :
 * ce n'est pas l'horloge qui la punit, c'est la SORTIE. Six frondeurs devant la
 * forteresse mysienne useraient la place en douze journées ; ils ne survivent pas
 * à la première percée (voir `puissanceSortie`).
 */
export const USURE_BASE = 5

/**
 * Et ce que le rapport de force ajoute. Douze points au rapport 1 : avec une ligne
 * qui pèse ce que pèse la place, dix-sept points par journée, donc quatre à cinq
 * journées jusqu'à la reddition - une saison de jeu (`JOURS_PAR_SAISON` = 4).
 * C'est l'ordre de grandeur voulu : un blocus est l'affaire d'une saison, là où un
 * raid est l'affaire de trois minutes.
 */
export const USURE_PAR_FORCE = 12

/**
 * Le rapport est PLAFONNÉ à une fois et demie. Sans ce plafond, vingt hommes
 * devant un camp de pillards (rapport 11) auraient réduit le blocus à une seule
 * journée, c'est-à-dire à un pillage plus lent : le système aurait cessé d'être
 * une durée. Au plafond, c'est vingt-trois points par journée - quatre journées,
 * pas moins.
 */
export const RAPPORT_MAX = 1.5

/** ce que la ligne perd de tenue par journée ordinaire : douze journées de siège */
export const TENUE_PAR_JOUR = 8
/**
 * …et ce qu'une nuit de percée repoussée coûte en plus. On a gagné, mais on a
 * veillé, enterré des gens et refait la palissade : une ligne qui encaisse deux
 * sorties ne tient pas ses douze journées, et c'est ce qui empêche « poster large
 * et attendre » d'être toujours la bonne réponse.
 */
export const TENUE_SORTIE_REPOUSSEE = 10
/** …et une fois la reddition offerte. Les hommes voient la fin : ils patientent. */
export const TENUE_PAR_JOUR_OFFRE = 4
/** …et la journée où le convoi de grain n'arrive pas. La faim défait une ligne. */
export const TENUE_FAMINE = 30

/** en dessous, la place envoie parlementer */
export const SEUIL_OFFRE = 25

/**
 * Au-dessus, personne ne sort : une garnison qui a de l'eau et du pain attend
 * derrière son mur, c'est tout l'avantage d'être dedans. En dessous, elle sait
 * qu'attendre la tue, et le calcul change.
 */
export const SEUIL_SORTIE = 55

/** la part de journées où une garnison aux abois tente sa percée, au plus bas */
export const CHANCE_SORTIE_MAX = 0.3

/*
 * CE QUE PÈSE UNE SORTIE. Une garnison qui perce n'engage pas ce qu'elle vaut
 * derrière son mur : elle sort de nuit, à moitié affamée, sans le rempart qui
 * faisait sa force - mais elle choisit son heure, et la surprise vaut un sixième
 * de bras en plus. À volonté 50 : (0,45 + 0,175) × 1,15 = 0,72 fois la puissance
 * de la place. Une ligne qui vaut le rapport 1 tient donc ; une ligne trop mince
 * pour user la place est aussi trop mince pour encaisser sa sortie, et c'est la
 * même erreur qui se paie deux fois.
 */
export const PART_SORTIE_BASE = 0.45
export const PART_SORTIE_VOLONTE = 0.35
export const SURPRISE_SORTIE = 1.15

/** ce qu'une sortie repoussée coûte à la place : sa garnison y est passée */
export const VOLONTE_SORTIE_REPOUSSEE = -30
/** ce qu'une percée réussie lui rend : on respire, on a vu leur dos */
export const VOLONTE_SORTIE_REUSSIE = 20

/** part de la ligne fauchée par une sortie repoussée, puis par une percée */
export const PERTES_SORTIE_TENUE = 0.1
export const PERTES_SORTIE_ROMPUE = 0.3
/** part de la ligne qui déserte la journée où le grain n'arrive pas */
export const PERTES_FAMINE = 0.1

/**
 * Ce que la garnison garde quand la volonté est à zéro. Un tiers : désarmée n'est
 * pas désarmée jusqu'au dernier homme - il reste toujours des gens décidés à
 * mourir sur le seuil. C'est ce plancher qui garde un intérêt à l'assaut donné
 * TÔT plutôt que tard, et qui empêche le blocus de rendre la bataille gratuite.
 */
export const GARNISON_PLANCHER = 0.35

/**
 * La rançon d'une place qui se rend, en part de son butin. Une place prise
 * d'assaut se pille une fois plein et 40 % ensuite (`BUTIN_REPETE`) ; une place
 * qui se rend PAIE, et elle paie toujours le même prix, qu'on l'ait déjà pillée
 * dix fois. C'est la vraie récompense du système : sur une place déjà razziée
 * deux fois, un blocus rapporte près du double d'un raid, sans un mort.
 *
 * De 0,7 à l'instant où l'offre tombe, à 1 quand la volonté est à zéro : rester
 * une journée de plus après l'offre coûte une ration et rapporte de la rançon.
 * L'arbitrage vit jusqu'au dernier matin.
 */
export const RANCON_MIN = 0.7
export const RANCON_MAX = 1

/** ce que brûler les récoltes retire à la rançon : on a brûlé ce qu'on voulait prendre */
export const RANCON_APRES_INCENDIE = 0.85

/*
 * LE PRIX DIPLOMATIQUE, ET POURQUOI IL EST À L'ENVERS DE CELUI DU PILLAGE.
 *
 * Piller coûte Zeus −5 et rapporte Arès +4 : le dieu de l'hospitalité compte les
 * villages saccagés, le dieu de la guerre compte les lances. Une reddition
 * ACCEPTÉE ET TENUE est l'inverse exact - on a reçu une supplication et on l'a
 * honorée, ce que Zeus Xenios juge précisément ; et l'on a gagné sans combattre,
 * ce qu'Arès méprise. Le blocus est donc le seul moyen de s'enrichir sur une
 * place forte SANS fâcher Zeus, et il se paie auprès d'Arès - une identité
 * stratégique, pas une variante de butin.
 *
 * Auprès de la place elle-même, en revanche, il coûte : −20 contre −45 pour un
 * sac. On l'a affamée, mais on ne l'a pas brûlée, et elle vit pour s'en souvenir.
 */
export const REDDITION_ZEUS = 4
export const REDDITION_ARES = -6
export const REDDITION_RELATION = -20
export const REDDITION_VOISINS = -3
/** …et ce que la côte ajoute quand on a vu la fumée des moissons */
export const INCENDIE_VOISINS = -5

/** lever le siège : rien de gagné, et le village le sait */
export const LEVEE_MORALE = -8
export const LEVEE_ARES = -4

/**
 * Ce que le village pillé pendant un blocus fait à la ligne. Les hommes
 * apprennent que leurs toits ont brûlé pendant qu'ils gardaient ceux des autres :
 * la ligne se DÉFAIT, elle ne s'use pas. C'est ainsi qu'un assaut sur le village
 * pendant un blocus « se sent » - autrement qu'en ayant simplement moins d'hommes
 * sur les remparts.
 */
export const TENUE_VILLAGE_PILLE = -45
/** et une victoire au village raffermit la ligne : on a tenu les deux bouts */
export const TENUE_VILLAGE_TENU = 6

/**
 * Coques exigées pour tenir une ligne devant une place d'outre-mer. Une ligne
 * maritime n'est pas un camp : ce sont des nefs mouillées en travers d'un port,
 * et elles y restent tant que le blocus dure. Le chiffre est ici et la jonction
 * avec la flotte se fait dans le store - ce module n'importe RIEN de `flotte.ts`.
 */
export const COQUES_BLOCUS_MARITIME = 2

// ── Les travaux ──────────────────────────────────────────────────────────────

/** ce que la sape retire à l'enceinte quand on finit par donner l'assaut */
export const SAPE_MUR_PCT = 0.45

export interface TravailDef {
  id: TravailId
  nom: string
  emoji: string
  /** ce que les hommes FONT, pas ce que le chiffre dit */
  desc: string
  /** ce que cela change, en une ligne, pour le bouton */
  effet: string
  /** points de volonté en plus, chaque journée, jusqu'à la fin du blocus */
  usure: number
  /** le prix : un socle, plus ce que la taille de la place ajoute */
  base: Partial<Record<ResourceId, number>>
  parPuissance: Partial<Record<ResourceId, number>>
  /** le récit qu'en fait la chronique */
  recit: string
}

/*
 * TROIS TRAVAUX, TROIS PRIX DE NATURE DIFFÉRENTE - et c'est la règle de cette
 * table. Un travail qui ne coûterait que des ressources ne serait qu'un achat ;
 * trois travaux qui coûteraient tous des ressources ne seraient qu'un seul
 * travail à trois niveaux.
 *
 *  · L'EAU se paie en bois et en bronze : des outils et des hommes qui creusent.
 *  · LES RÉCOLTES ne coûtent rien que des torches - et de la RANÇON, puisqu'on
 *    brûle ce qu'on comptait prendre, plus le crédit de toute la côte qui voit la
 *    fumée. C'est le travail du joueur pressé, et il paie sa hâte au bout.
 *  · LA SAPE est la plus chère, et son effet sur la volonté est le plus faible :
 *    ce n'est pas pour la reddition qu'on mine un mur, c'est pour l'ASSAUT qu'on
 *    donnera peut-être. Elle n'a de sens que si l'on doute d'aller au bout.
 */
export const TRAVAUX: Record<TravailId, TravailDef> = {
  eau: {
    id: 'eau',
    nom: 'Couper l’eau',
    emoji: '🚰',
    desc:
      'On remonte le ruisseau jusqu’à la source, on la détourne dans un fossé, et l’on poste deux hommes dessus. La citerne de la place tiendra ce qu’elle tiendra.',
    effet: 'Volonté de la place −7 par journée, jusqu’au bout du blocus',
    usure: 7,
    base: { bois: 40, bronze: 20 },
    parPuissance: { bois: 0.15, bronze: 0.08 },
    recit: 'La source est détournée dans un fossé de terre. Au troisième jour, on voit du haut du mur des femmes descendre à la citerne avec de plus petits vases.',
  },
  recoltes: {
    id: 'recoltes',
    nom: 'Brûler les récoltes',
    emoji: '🔥',
    desc:
      'Les blés sont hauts autour de la place. Une nuit de vent d’est, quarante torches, et il n’y a plus rien à moissonner avant l’an prochain.',
    effet: 'Volonté −5 par journée, mais rançon −15 % et toute la côte voit la fumée',
    usure: 5,
    base: {},
    parPuissance: {},
    recit: 'La nuit a senti le grain brûlé sur trois lieues. Ce qu’ils auraient mangé cet hiver est en cendre - et ce qu’ils vous auraient donné avec.',
  },
  sape: {
    id: 'sape',
    nom: 'Miner le mur',
    emoji: '⛏️',
    desc:
      'On creuse une galerie sous l’assise, on l’étaie de troncs verts, et l’on garde le feu pour le jour où l’on voudra entrer. Un mur miné ne tient plus rien.',
    effet: `Volonté −3 par journée, et l’enceinte à ${Math.round((1 - SAPE_MUR_PCT) * 100)} % si vous donnez l’assaut`,
    usure: 3,
    base: { bois: 60, bronze: 30 },
    parPuissance: { bois: 0.2, bronze: 0.12 },
    recit: 'La galerie est étayée de troncs verts, le feu prêt à l’entrée. Le mur ne le sait pas encore.',
  },
}

export const TRAVAUX_IDS: TravailId[] = ['eau', 'recoltes', 'sape']

/** le prix d'un travail devant CETTE place - une forteresse se mine plus cher qu'un camp */
export function coutTravail(id: TravailId, v: VillageCible): Cost {
  const def = TRAVAUX[id]
  const p = Math.max(25, v.puissance)
  const out: Cost = {}
  for (const r of Object.keys({ ...def.base, ...def.parPuissance }) as ResourceId[]) {
    const n = Math.round((def.base[r] ?? 0) + (def.parPuissance[r] ?? 0) * p)
    if (n > 0) out[r] = n
  }
  return out
}

// ── Ce que pèse une ligne, et ce qu'elle laisse au village ───────────────────

/** les hommes d'une ligne - un nombre, pas une puissance */
export function hommesDeLaLigne(postes: Partial<Record<UnitId, number>>): number {
  return UNIT_IDS.reduce((a, u) => a + (postes[u] ?? 0), 0)
}

/**
 * Ce que la ligne pèse, dans la MÊME métrique que le panneau d'expédition
 * (`atk + hp/8`). Les héros n'y sont pas, et c'est voulu : un héros ne passe pas
 * cinq journées de jeu assis devant une palissade - il marche avec une colonne,
 * ou il attend au village. Une ligne, c'est de la troupe.
 */
export function forceDeLaLigne(postes: Partial<Record<UnitId, number>>): number {
  return puissanceColonne({ troupes: postes })
}

/** ce qu'une ration coûte, pour la journée qui vient */
export function rationDuJour(e: EtatBlocus): number {
  return hommesDeLaLigne(e.postes) * RATION_PAR_JOUR
}

/**
 * QUELLE PART DE L'ARMÉE EST ENGAGÉE DEHORS.
 *
 * `army` est l'armée qui reste AU VILLAGE - les hommes postés en ont déjà été
 * retirés, comme ceux d'une colonne. Le total se recompose donc ici, et c'est la
 * seule façon honnête de le dire au joueur : « 8 hommes sur 19, et 46 % de votre
 * force, sont devant Ténédos ». En nombre ET en force, parce que poster quatre
 * hoplites et garder huit frondeurs, ce n'est pas garder les deux tiers de son
 * armée.
 */
export interface PartEngagee {
  /** hommes postés devant la place */
  dehors: number
  /** hommes qui restent au village */
  dedans: number
  /** part des hommes qui sont dehors, de 0 à 1 */
  part: number
  /** part de la FORCE qui est dehors, de 0 à 1 - le chiffre qui compte vraiment */
  partForce: number
  forceDehors: number
  forceDedans: number
}

export function partEngagee(
  postes: Partial<Record<UnitId, number>> | null | undefined,
  army: Record<UnitId, number>,
): PartEngagee {
  const p = postes ?? {}
  const dehors = hommesDeLaLigne(p)
  const dedans = UNIT_IDS.reduce((a, u) => a + (army[u] ?? 0), 0)
  const forceDehors = forceDeLaLigne(p)
  const forceDedans = puissanceColonne({ troupes: army })
  const total = dehors + dedans
  const totalForce = forceDehors + forceDedans
  return {
    dehors,
    dedans,
    part: total > 0 ? dehors / total : 0,
    partForce: totalForce > 0 ? forceDehors / totalForce : 0,
    forceDehors,
    forceDedans,
  }
}

// ── L'ouverture, et ses refus ────────────────────────────────────────────────

/** ce qu'il faut savoir pour juger si une ligne peut être posée */
export interface SnapOuverture {
  place: VillageCible
  /** l'armée qui est AU VILLAGE (les colonnes déjà parties n'y sont plus) */
  army: Record<UnitId, number>
  /** ce qu'on veut poster */
  postes: Partial<Record<UnitId, number>>
  grain: number
  blocus: EtatBlocus | null
  /** le village est lui-même assailli en ce moment */
  enBataille: boolean
  /** une colonne est dehors et n'est pas rentrée */
  colonneDehors: boolean
  /** la mer est prise (hiver, ou colère de Poséidon) */
  merFermee: boolean
  /** cette place est votre alliée */
  allie: boolean
  /** on joue le siège sans fin : personne ne sort */
  assiege: boolean
}

export type RefusBlocus =
  | 'assiege'
  | 'bataille'
  | 'colonne'
  | 'deja'
  | 'allie'
  | 'mer'
  | 'hommes'
  | 'garde'
  | 'vivres'

/**
 * Le juge unique de l'ouverture. Le store l'appelle avant de retirer un homme, et
 * le panneau l'appelle pour éteindre le bouton AVEC SON MOTIF.
 *
 * L'ORDRE DES TESTS N'EST PAS INDIFFÉRENT : on dit d'abord ce que le joueur ne
 * peut pas changer (le mode, l'assaut en cours, la mer), puis ce qu'il peut
 * changer d'un clic (le nombre d'hommes, les vivres). Un panneau qui reproche le
 * grain avant de dire que la mer est prise fait chercher une solution qui
 * n'existe pas.
 */
export function refusBlocus(s: SnapOuverture): RefusBlocus | null {
  if (s.assiege) return 'assiege'
  if (s.enBataille) return 'bataille'
  /*
   * ⚠️ CE REFUS FERME UN TROU DANS LA RÈGLE DES SEPT DIXIÈMES, il n'est pas une
   * préférence. `PART_MAX_DEHORS` se mesure sur `army + postes`, et les hommes
   * d'une colonne déjà partie ne sont NI dans l'un NI dans l'autre : avec une
   * colonne dehors, la part se calculerait sur une armée déjà amputée, et deux
   * gestes de suite auraient vidé les remparts en toute légalité.
   */
  if (s.colonneDehors) return 'colonne'
  if (s.blocus) return 'deja'
  if (s.allie) return 'allie'
  if (s.place.maritime && s.merFermee) return 'mer'
  const dehors = hommesDeLaLigne(s.postes)
  if (dehors < MIN_HOMMES) return 'hommes'
  for (const u of UNIT_IDS) {
    if ((s.postes[u] ?? 0) > (s.army[u] ?? 0)) return 'garde'
  }
  const part = partEngagee(s.postes, restant(s.army, s.postes)).part
  if (part > PART_MAX_DEHORS) return 'garde'
  if (s.grain < dehors * RATION_PAR_JOUR * JOURS_DE_VIVRES_EXIGES) return 'vivres'
  return null
}

/** l'armée telle qu'elle serait après le départ de la ligne */
function restant(
  army: Record<UnitId, number>,
  postes: Partial<Record<UnitId, number>>,
): Record<UnitId, number> {
  const out = {} as Record<UnitId, number>
  for (const u of UNIT_IDS) out[u] = Math.max(0, (army[u] ?? 0) - (postes[u] ?? 0))
  return out
}

/** le refus, dit au joueur dans ses termes */
export function motifRefusBlocus(r: RefusBlocus, s: SnapOuverture): string {
  const dehors = hommesDeLaLigne(s.postes)
  switch (r) {
    case 'assiege':
      return 'Le village est assiégé : on ne poste pas une ligne devant chez les autres quand elle manque devant chez soi.'
    case 'bataille':
      return 'L’assaut sonne sur vos murs. On parlera de blocus quand la porte tiendra.'
    case 'colonne':
      return 'Une colonne est déjà dehors. Attendez son retour : on ne dégarnit pas les remparts deux fois de suite.'
    case 'deja':
      return 'Vous tenez déjà une ligne. Un seul blocus à la fois - il n’y a qu’un train de convois.'
    case 'allie':
      return `${s.place.nom} est votre allié. Rompez le pacte d’abord, ou passez votre chemin.`
    case 'mer':
      return `${s.place.nom} est au-delà du détroit et la mer est prise : aucune nef ne tiendra le mouillage avant le dégel.`
    case 'hommes':
      return `Il faut au moins ${MIN_HOMMES} hommes pour fermer une place (${dehors} posté${dehors > 1 ? 's' : ''}). En dessous, ce n’est pas un blocus, c’est une embuscade.`
    case 'garde':
      return `On ne poste pas plus de ${Math.round(PART_MAX_DEHORS * 100)} % de l’armée : il faut des hommes sur les remparts. Il vous en faut donc ${Math.ceil(dehors / PART_MAX_DEHORS - dehors)} de plus au village.`
    case 'vivres':
      return `Une ligne se nourrit : ${dehors * RATION_PAR_JOUR} mesures par journée, et l’on n’en ouvre pas une sans ${JOURS_DE_VIVRES_EXIGES} journées de vivres en magasin (${dehors * RATION_PAR_JOUR * JOURS_DE_VIVRES_EXIGES} 🌾).`
  }
}

/** la ligne est posée. `jour` est la journée de jeu courante - pour la chronique. */
export function ouvrirBlocus(
  villageId: string,
  postes: Partial<Record<UnitId, number>>,
  jour: number,
): EtatBlocus {
  const nets: Partial<Record<UnitId, number>> = {}
  for (const u of UNIT_IDS) {
    const n = postes[u] ?? 0
    if (n > 0) nets[u] = n
  }
  return {
    villageId,
    depuis: jour,
    jours: 0,
    postes: nets,
    volonte: VOLONTE_MAX,
    tenue: TENUE_MAX,
    travaux: [],
    offre: false,
    sortieFaite: false,
    dernier: [
      'La ligne est posée : fossé, palissade de branches, feux tous les cinquante pas.',
      'Du haut du mur, ils comptent vos hommes. Vous comptez leurs jours.',
    ],
  }
}

/** un nombre lisible, ou le défaut - `NaN` et `undefined` valent la même chose */
function nombreSain(x: unknown, defaut: number): number {
  return typeof x === 'number' && Number.isFinite(x) ? x : defaut
}

/**
 * LA LIGNE RELUE DEPUIS UN FICHIER DE SAUVEGARDE, ou `null` s'il n'y a plus rien à
 * en tirer. C'est le piège 3 du moteur pris à l'endroit où il coûte le plus cher.
 *
 * Ce que la désinfection évite, un cas après l'autre :
 *
 *  · UN `postes` DONT LES VALEURS SONT ILLISIBLES (fichier repris à la main, unité
 *    renommée, champ absent d'une version antérieure). `hommesDeLaLigne` rendait
 *    alors `NaN`, `NaN <= 0` est FAUX, la ligne survivait, et la ration `NaN` se
 *    soustrayait au grain - où elle restait pour toujours. C'est exactement ce qui
 *    est arrivé aux ressources à l'ajout des trois unités, et c'est pourquoi les
 *    valeurs de `postes` sont relues une par une plutôt que reprises en bloc.
 *  · UNE PLACE QUI N'EXISTE PLUS (table remaniée, id renommé) : la ligne resterait
 *    ouverte pour l'éternité, à prélever sa ration sans qu'aucun panneau puisse
 *    l'afficher.
 *  · UNE LIGNE SANS UN HOMME : elle ne ferme rien, on ne la garde pas au budget.
 *
 * ⚠️ ON NE LÈVE PAS UNE LIGNE SIMPLEMENT TROP MINCE (un à cinq hommes). Elle est
 * sous `MIN_HOMMES`, donc `resoudreJournee` la défera au premier matin - mais EN
 * RENDANT SES HOMMES À L'ARMÉE. La jeter ici les effacerait, et le joueur aurait
 * perdu cinq soldats à la relecture d'un fichier sain.
 */
export function assainirBlocus(brut: unknown, jour: number): EtatBlocus | null {
  if (!brut || typeof brut !== 'object') return null
  const b = brut as Partial<EtatBlocus>
  const v = typeof b.villageId === 'string' ? VILLAGES_PAR_ID[b.villageId] : undefined
  if (!v) return null
  const postes: Partial<Record<UnitId, number>> = {}
  for (const u of UNIT_IDS) {
    const n = Math.max(0, Math.round(nombreSain(b.postes?.[u], 0)))
    if (n > 0) postes[u] = n
  }
  if (hommesDeLaLigne(postes) <= 0) return null
  const borner = (x: number, max: number) => Math.max(0, Math.min(max, x))
  return {
    villageId: v.id,
    depuis: Math.max(1, Math.round(nombreSain(b.depuis, jour))),
    jours: Math.max(0, Math.round(nombreSain(b.jours, 0))),
    postes,
    volonte: borner(nombreSain(b.volonte, VOLONTE_MAX), VOLONTE_MAX),
    tenue: borner(nombreSain(b.tenue, TENUE_MAX), TENUE_MAX),
    // on garde l'ORDRE de la table et non celui du fichier : un travail écrit deux
    // fois y aurait compté deux fois son usure
    travaux: Array.isArray(b.travaux) ? TRAVAUX_IDS.filter((t) => b.travaux!.includes(t)) : [],
    offre: !!b.offre,
    sortieFaite: !!b.sortieFaite,
    dernier: Array.isArray(b.dernier) ? b.dernier.filter((l): l is string => typeof l === 'string').slice(0, 4) : [],
  }
}

// ── Le rythme du siège ───────────────────────────────────────────────────────

/** le rapport de force, plafonné - voir RAPPORT_MAX */
export function rapportDeForce(forceLigne: number, puissancePlace: number): number {
  if (puissancePlace <= 0) return RAPPORT_MAX
  return Math.min(RAPPORT_MAX, forceLigne / puissancePlace)
}

/** ce que la place perd de volonté par journée, travaux compris */
export function usureParJour(e: EtatBlocus, forceLigne: number, puissancePlace: number): number {
  const travaux = e.travaux.reduce((a, t) => a + TRAVAUX[t].usure, 0)
  return USURE_BASE + USURE_PAR_FORCE * rapportDeForce(forceLigne, puissancePlace) + travaux
}

/** ce que la ligne perd de tenue par journée - à demi une fois l'offre sur la table */
export function tenueParJour(e: EtatBlocus): number {
  return e.offre ? TENUE_PAR_JOUR_OFFRE : TENUE_PAR_JOUR
}

/**
 * Journées qu'il reste à tenir avant que la place ne parlemente - et journées que
 * la ligne peut encore tenir. Les DEUX sont montrées au joueur côte à côte, et
 * c'est le cœur du panneau : quand la seconde est plus petite que la première, le
 * blocus est perdu d'avance et il faut le savoir AVANT d'avoir mangé six cents
 * mesures de grain.
 */
export function journeesJusquaOffre(e: EtatBlocus, forceLigne: number, puissancePlace: number): number {
  if (e.offre) return 0
  const u = usureParJour(e, forceLigne, puissancePlace)
  if (u <= 0) return Number.POSITIVE_INFINITY
  return Math.ceil(Math.max(0, e.volonte - SEUIL_OFFRE) / u)
}

export function journeesTenables(e: EtatBlocus): number {
  const t = tenueParJour(e)
  if (t <= 0) return Number.POSITIVE_INFINITY
  return Math.ceil(e.tenue / t)
}

/** la part de journées où une garnison à ce degré de volonté tente sa percée */
export function chanceSortie(e: EtatBlocus): number {
  if (e.sortieFaite) return 0
  if (e.volonte >= SEUIL_SORTIE) return 0
  return Math.max(0, Math.min(1, ((SEUIL_SORTIE - e.volonte) / SEUIL_SORTIE) * CHANCE_SORTIE_MAX))
}

/** ce que pèse la garnison qui sort - voir le commentaire des trois constantes */
export function puissanceSortie(puissancePlace: number, volonte: number): number {
  const part = PART_SORTIE_BASE + PART_SORTIE_VOLONTE * (Math.max(0, volonte) / VOLONTE_MAX)
  return puissancePlace * part * SURPRISE_SORTIE
}

/**
 * La garnison telle qu'un assaut la trouverait. Elle DÉSARME avec la volonté -
 * c'est ce qui donne un sens à « attendre encore une journée » quand on compte
 * entrer par la brèche plutôt que par la porte ouverte.
 */
export function garnisonDesarmee(
  garnison: Record<UnitId, number>,
  volonte: number,
): Record<UnitId, number> {
  const k = GARNISON_PLANCHER + (1 - GARNISON_PLANCHER) * (Math.max(0, Math.min(VOLONTE_MAX, volonte)) / VOLONTE_MAX)
  const out = {} as Record<UnitId, number>
  for (const u of UNIT_IDS) {
    const n = garnison[u] ?? 0
    // un homme n'est pas divisible : on arrondit, mais une garnison qui EXISTE ne
    // s'évapore jamais tout à fait - sinon l'assaut deviendrait une promenade
    out[u] = n > 0 ? Math.max(1, Math.round(n * k)) : 0
  }
  return out
}

/** l'enceinte telle qu'un assaut la trouverait : la sape a travaillé */
export function partMurApresBlocus(e: EtatBlocus | null | undefined): number {
  if (!e) return 1
  return e.travaux.includes('sape') ? 1 - SAPE_MUR_PCT : 1
}

// ── La journée qu'on résout ──────────────────────────────────────────────────

/** ce que le store sait au matin d'une journée de blocus */
export interface SnapJournee {
  forceLigne: number
  puissancePlace: number
  /** le grain en magasin AU VILLAGE : c'est lui qui nourrit le camp */
  grain: number
  /** nom de la place, pour le récit */
  nomPlace: string
}

/** pourquoi la ligne s'est défaite, ou `null` si elle tient */
export type FinBlocus = 'tenue' | 'sortie' | 'famine'

export interface JourneeBlocus {
  /** le nouvel état - `null` quand la ligne s'est défaite */
  etat: EtatBlocus | null
  /** grain à retirer des greniers (jamais plus qu'il n'y en a) */
  grainPaye: number
  /** hommes tombés ou désertés : ils ne rentrent PAS */
  perdus: Partial<Record<UnitId, number>>
  /** les survivants à rendre à `s.army` quand la ligne se défait */
  rentrent: Partial<Record<UnitId, number>>
  /** la reddition vient d'être offerte, cette journée-ci */
  offreNouvelle: boolean
  fin: FinBlocus | null
  emoji: string
  titre: string
  lignes: string[]
}

/**
 * UNE JOURNÉE DE BLOCUS, ENTIÈREMENT PURE.
 *
 * Le store n'a rien à décider : il appelle ceci une fois par journée de jeu, dans
 * le MÊME crochet quotidien que `vieDesFamilles`, et recopie ce qui revient. Un
 * seul tirage entre, et il ne sert qu'à savoir si la garnison sort - l'issue de la
 * sortie, elle, se décide aux forces et non au dé : le joueur doit pouvoir la
 * PRÉVOIR en lisant son panneau, sinon la sortie n'est pas un risque, c'est une
 * punition.
 *
 * L'ordre des choses dans la journée n'est pas arbitraire :
 *  1. on nourrit (ou l'on ne nourrit pas, et la faim défait plus vite qu'une lance) ;
 *  2. la garnison sort, ou non ;
 *  3. le siège use ce qu'il use ;
 *  4. la place parlemente, si elle est à bout.
 * Nourrir en premier, parce qu'une ligne affamée doit encaisser sa sortie affamée.
 */
export function resoudreJournee(e: EtatBlocus, s: SnapJournee, tirage: number): JourneeBlocus {
  const lignes: string[] = []
  const hommes = hommesDeLaLigne(e.postes)
  let postes = { ...e.postes }
  const perdus: Partial<Record<UnitId, number>> = {}
  let volonte = e.volonte
  let tenue = e.tenue
  let sortieFaite = e.sortieFaite
  let fin: FinBlocus | null = null
  let emoji = '⛓️'
  let titre = `Blocus de ${s.nomPlace} - journée ${e.jours + 1}`

  // ── 1. la ration ──
  const du = hommes * RATION_PAR_JOUR
  const grainPaye = Math.min(du, Math.max(0, s.grain))
  const famine = grainPaye < du
  if (famine) {
    tenue -= TENUE_FAMINE
    const desertent = Math.max(1, Math.round(hommes * PERTES_FAMINE))
    const r = retirerDeLaLigne(postes, desertent)
    postes = r.postes
    ajouter(perdus, r.retires)
    emoji = '🥖'
    lignes.push(
      `Le convoi n’est pas arrivé : il n’y avait que ${grainPaye} mesures pour ${du} à porter au camp.`,
      /*
       * ⚠️ ILS NE « PRENNENT PAS LA ROUTE DU VILLAGE », et le récit doit le dire :
       * ces hommes-là sont dans `perdus`, pas dans `rentrent` - ils ne reviennent
       * JAMAIS dans `s.army`, exactement comme les déserteurs du village
       * (`s.army[u]--`, store.ts). Un récit qui les renvoyait chez eux promettait
       * au joueur un effectif qu'il ne retrouvait nulle part au retour.
       */
      `${motTroupes(r.retires)} ont plié leur couverture et disparu dans la nuit. On ne tient pas une ligne le ventre vide, et un homme qui déserte ne se recompte plus.`,
    )
  } else {
    lignes.push(`${du} mesures portées au camp. Les feux brûlent, la ligne tient.`)
  }

  // ── 2. la sortie ──
  if (tenue > 0 && chanceSortie(e) > 0 && tirage < chanceSortie(e)) {
    sortieFaite = true
    const force = forceDeLaLigne(postes)
    const eux = puissanceSortie(s.puissancePlace, volonte)
    const restants = hommesDeLaLigne(postes)
    if (force >= eux) {
      const tombes = Math.max(1, Math.round(restants * PERTES_SORTIE_TENUE))
      const r = retirerDeLaLigne(postes, tombes)
      postes = r.postes
      ajouter(perdus, r.retires)
      volonte = Math.max(0, volonte + VOLONTE_SORTIE_REPOUSSEE)
      tenue -= TENUE_SORTIE_REPOUSSEE
      emoji = '🛡️'
      titre = `Sortie repoussée - ${s.nomPlace}`
      lignes.push(
        'Avant l’aube, la porte s’ouvre et ils sortent en silence, par trois rangs serrés.',
        `La ligne plie, tient, et les rejette contre leur propre mur. ${motTroupes(r.retires)} sont restés dans le fossé.`,
        'Ils y ont laissé leurs meilleurs bras : la place n’a plus de quoi recommencer.',
      )
    } else {
      const tombes = Math.max(2, Math.round(restants * PERTES_SORTIE_ROMPUE))
      const r = retirerDeLaLigne(postes, tombes)
      postes = r.postes
      ajouter(perdus, r.retires)
      volonte = Math.min(VOLONTE_MAX, volonte + VOLONTE_SORTIE_REUSSIE)
      fin = 'sortie'
      emoji = '💀'
      titre = `La ligne est rompue - ${s.nomPlace}`
      lignes.push(
        'Avant l’aube, la porte s’ouvre. Ils sortent tous, et ils sortent bien.',
        `La palissade cède au troisième rang. ${motTroupes(r.retires)} n’en reviennent pas.`,
        'Les survivants refluent vers le village. Le blocus est mort avec la ligne.',
      )
    }
  }

  // ── 3. l'usure ──
  if (!fin) {
    tenue -= tenueParJour(e)
    const u = usureParJour(e, forceDeLaLigne(postes), s.puissancePlace)
    volonte = Math.max(0, volonte - u)
    if (emoji === '⛓️') {
      lignes.push(
        e.travaux.length > 0
          ? `${e.travaux.map((t) => TRAVAUX[t].emoji).join(' ')} Les travaux font leur ouvrage : volonté de la place −${Math.round(u)}.`
          : `Rien n’a bougé de la journée. Volonté de la place −${Math.round(u)} : on les regarde compter leurs jarres.`,
      )
    }
  }

  // ── 4. la place parlemente ──
  let offre = e.offre
  let offreNouvelle = false
  if (!fin && !offre && volonte <= SEUIL_OFFRE) {
    offre = true
    offreNouvelle = true
    emoji = '🕊️'
    titre = `${s.nomPlace} demande à parlementer`
    lignes.push(
      'Un vieillard sort par la poterne, sans armes, une branche à la main. Ils offrent de se rendre.',
      'Rien ne presse : leur offre attendra votre parole. Mais vos hommes mangent chaque journée.',
    )
  }

  // ── la ligne a-t-elle tenu ? ──
  if (!fin && tenue <= 0) {
    fin = famine ? 'famine' : 'tenue'
    emoji = '🏳️'
    titre = `Le camp se défait - ${s.nomPlace}`
    lignes.push(
      famine
        ? 'Il n’y a plus rien à manger au camp, et plus personne pour y croire. La ligne se défait d’elle-même.'
        : 'Les hommes ne tiennent plus. On lève les feux, on plie la palissade : il n’y a plus de blocus, seulement des gens fatigués.',
    )
  }
  if (!fin && hommesDeLaLigne(postes) < MIN_HOMMES) {
    fin = 'tenue'
    emoji = '🏳️'
    titre = `La ligne est trop mince - ${s.nomPlace}`
    lignes.push(
      `Il ne reste ${hommesDeLaLigne(postes)} homme(s) devant la place : on ne ferme plus rien avec cela. Les derniers rentrent.`,
    )
  }

  if (fin) {
    return {
      etat: null,
      grainPaye,
      perdus,
      rentrent: postes,
      offreNouvelle: false,
      fin,
      emoji,
      titre,
      lignes,
    }
  }
  return {
    etat: {
      ...e,
      jours: e.jours + 1,
      postes,
      volonte,
      tenue: Math.max(0, tenue),
      offre,
      sortieFaite,
      dernier: lignes,
    },
    grainPaye,
    perdus,
    rentrent: {},
    offreNouvelle,
    fin: null,
    emoji,
    titre,
    lignes,
  }
}

/**
 * Retire `n` hommes de la ligne, en commençant par le type le plus nombreux.
 *
 * DÉTERMINISTE, ET SANS `Math.random()` : ce module est pur, et l'on doit pouvoir
 * écrire un test qui dit « une sortie repoussée coûte deux hommes » sans que la
 * réponse dépende du dé. « Le plus nombreux d'abord » n'est pas qu'une commodité :
 * c'est ce qui garde intact l'os de la ligne - trois hoplites parmi douze lanciers
 * ne se font pas faucher les premiers, et le joueur qui a payé du bronze pour eux
 * le voit.
 */
export function retirerDeLaLigne(
  postes: Partial<Record<UnitId, number>>,
  n: number,
): { postes: Partial<Record<UnitId, number>>; retires: Partial<Record<UnitId, number>> } {
  const out = { ...postes }
  const retires: Partial<Record<UnitId, number>> = {}
  /*
   * ⚠️ ET À NOMBRE ÉGAL, LE MOINS CHER PART LE PREMIER.
   *
   * Sans ce départage, la règle ne tenait pas sa propre promesse. Sur une ligne de
   * huit hoplites, quatorze lanciers et six archers, retirer huit hommes descendait
   * les lanciers à huit - à égalité avec les hoplites - puis choisissait le PREMIER
   * de `UNIT_IDS`, c'est-à-dire encore le lancier, puis l'hoplite au coup suivant.
   * Le joueur perdait un hoplite payé trente-huit lingots alors qu'il restait sept
   * lanciers à faucher. Le bronze versé doit se voir jusque dans la façon dont on
   * rogne une ligne.
   */
  const prix = (u: UnitId): number => UNITS[u].cost.bronze ?? 0
  for (let k = 0; k < n; k++) {
    let choisi: UnitId | null = null
    for (const u of UNIT_IDS) {
      if ((out[u] ?? 0) <= 0) continue
      if (choisi === null) {
        choisi = u
        continue
      }
      const n1 = out[u] ?? 0
      const n0 = out[choisi] ?? 0
      if (n1 > n0 || (n1 === n0 && prix(u) < prix(choisi))) choisi = u
    }
    if (choisi === null) break
    out[choisi] = (out[choisi] ?? 0) - 1
    retires[choisi] = (retires[choisi] ?? 0) + 1
    if (out[choisi] === 0) delete out[choisi]
  }
  return { postes: out, retires }
}

/**
 * LA COLONNE QU'UNE LIGNE PEUT ENVOYER DANS LA PLACE, ET LE RESTE QUI RENTRE.
 *
 * `MAX_TROUPES` (20) borne TOUTE expédition, et `lancerExpedition` refuse EN
 * SILENCE au-delà - un `return` sans un mot, au milieu de son `set`. Une ligne de
 * vingt-huit hommes qui donnait l'assaut ne partait donc pas : le joueur ne lisait
 * rien, ses hommes revenaient à l'armée, la ligne restait posée sans un homme et se
 * défaisait au matin suivant. Il avait perdu cinq journées de grain, sa place, et
 * n'avait pas vu de bataille. C'est le défaut le plus cher du système, et il ne se
 * voyait qu'avec une grande armée - c'est-à-dire chez le joueur qui a le plus joué.
 *
 * On tranche donc ici, et par LE PLUS NOMBREUX (`retirerDeLaLigne`) : ce sont les
 * lanciers qui restent à la maison, pas les hoplites payés en bronze.
 */
export function colonneDAssaut(postes: Partial<Record<UnitId, number>>): {
  colonne: Partial<Record<UnitId, number>>
  restent: Partial<Record<UnitId, number>>
  trop: number
} {
  const total = hommesDeLaLigne(postes)
  if (total <= MAX_TROUPES) return { colonne: { ...postes }, restent: {}, trop: 0 }
  const r = retirerDeLaLigne(postes, total - MAX_TROUPES)
  return { colonne: r.postes, restent: r.retires, trop: total - MAX_TROUPES }
}

function ajouter(cible: Partial<Record<UnitId, number>>, ajout: Partial<Record<UnitId, number>>): void {
  for (const u of UNIT_IDS) {
    const n = ajout[u] ?? 0
    if (n > 0) cible[u] = (cible[u] ?? 0) + n
  }
}

/** « 2 lanciers, 1 hoplite » - jamais « 3 unités » */
export function motTroupes(t: Partial<Record<UnitId, number>>): string {
  const parts = UNIT_IDS.filter((u) => (t[u] ?? 0) > 0).map((u) => {
    const n = t[u] ?? 0
    return `${n} ${UNITS[u].nom.toLowerCase()}${n > 1 ? 's' : ''}`
  })
  return parts.length > 0 ? parts.join(', ') : 'personne'
}

// ── Les quatre décisions du joueur ───────────────────────────────────────────

/** ce que la place paie pour qu'on la laisse debout, à cet instant du blocus */
export function partRancon(e: EtatBlocus): number {
  const avance = SEUIL_OFFRE > 0 ? 1 - Math.max(0, Math.min(SEUIL_OFFRE, e.volonte)) / SEUIL_OFFRE : 1
  const part = RANCON_MIN + (RANCON_MAX - RANCON_MIN) * avance
  return e.travaux.includes('recoltes') ? part * RANCON_APRES_INCENDIE : part
}

export function rancon(e: EtatBlocus, v: VillageCible): Cost {
  const part = partRancon(e)
  const out: Cost = {}
  for (const [r, n] of Object.entries(v.butin) as [ResourceId, number][]) {
    const gain = Math.round(n * part)
    if (gain > 0) out[r] = gain
  }
  return out
}

export interface Reddition {
  rancon: Cost
  /** relation avec la place elle-même */
  relation: number
  /** …et avec les sept autres, qui l'apprennent avant le soir */
  voisins: number
  zeus: number
  ares: number
  lignes: string[]
}

/**
 * On accepte la reddition. Aucune bataille, aucun mort, et une place qui reste
 * debout - donc une place qu'on pourra ré-assiéger, ou avec qui l'on pourra
 * traiter plus tard. C'est la seule issue du jeu où l'on s'enrichit sur une place
 * forte SANS fâcher Zeus Xenios : voir le bloc des constantes diplomatiques.
 */
export function accepterReddition(e: EtatBlocus, v: VillageCible): Reddition {
  const r = rancon(e, v)
  const brule = e.travaux.includes('recoltes')
  return {
    rancon: r,
    relation: REDDITION_RELATION,
    voisins: REDDITION_VOISINS + (brule ? INCENDIE_VOISINS : 0),
    zeus: REDDITION_ZEUS,
    ares: REDDITION_ARES,
    lignes: [
      `Après ${e.jours} journée${e.jours > 1 ? 's' : ''} de ligne, la porte de ${v.nom} s’ouvre d’elle-même.`,
      'Leur chef sort le premier, sans armes, et l’on ne touche pas à un cheveu de sa cité : c’était le marché.',
      `Rançon versée : ${(Object.entries(r) as [ResourceId, number][])
        .map(([k, n]) => `${n} ${RES[k].emoji}`)
        .join(', ')}.`,
      ...(brule ? ['Il n’y avait plus de grain à donner : vous l’avez brûlé vous-même.'] : []),
      `Zeus Xenios ${REDDITION_ZEUS >= 0 ? '+' : '−'}${Math.abs(REDDITION_ZEUS)} - on a reçu une supplication et on l’a tenue. Arès ${Math.abs(REDDITION_ARES)} de moins : il ne compte pas les victoires qu’on remporte sans lance.`,
    ],
  }
}

export interface Levee {
  morale: number
  ares: number
  lignes: string[]
}

/** on lève le siège. Il n'y a rien à en tirer, et le village le voit passer. */
export function leverBlocus(e: EtatBlocus, v: VillageCible): Levee {
  return {
    morale: LEVEE_MORALE,
    ares: LEVEE_ARES,
    lignes: [
      `On lève la ligne devant ${v.nom} après ${e.jours} journée${e.jours > 1 ? 's' : ''}.`,
      `${hommesDeLaLigne(e.postes)} homme(s) rentrent au village, et il n’y a rien dans leurs mains.`,
      'Le grain qu’ils ont mangé là-bas, personne ne le rendra. Ambiance en baisse, et Arès n’aime pas qu’on renonce.',
    ],
  }
}

/**
 * LE VILLAGE A ÉTÉ ASSAILLI PENDANT LE BLOCUS, ET LA LIGNE L'APPREND.
 *
 * C'est ce qui fait qu'un assaut pendant un blocus « se sent » autrement qu'en
 * arithmétique. Un village pillé, et les hommes s'en vont : on ne garde pas la
 * porte des autres quand la sienne brûle. Un assaut repoussé sans eux, au
 * contraire, raffermit la ligne - on a tenu les deux bouts, et cela se raconte au
 * camp le soir.
 */
export function nouvelleDuVillage(
  e: EtatBlocus,
  victoire: boolean,
): { tenue: number; rompu: boolean; ligne: string } {
  const delta = victoire ? TENUE_VILLAGE_TENU : TENUE_VILLAGE_PILLE
  const tenue = Math.max(0, Math.min(TENUE_MAX, e.tenue + delta))
  return {
    tenue,
    rompu: tenue <= 0,
    ligne: victoire
      ? 'Un coureur arrive du village : l’assaut a été repoussé sans eux. Les feux du camp brûlent plus haut ce soir.'
      : 'Un coureur arrive du village : il a été pillé pendant qu’ils gardaient la porte des autres. La ligne murmure.',
  }
}

// ── Ce que le panneau montre ─────────────────────────────────────────────────

/** un blocus résumé pour l'affichage, avec la place et les deux comptes à rebours */
export interface VueBlocus {
  place: VillageCible
  hommes: number
  forceLigne: number
  puissancePlace: number
  rapport: number
  usure: number
  usureTenue: number
  jusquaOffre: number
  tenables: number
  /** la ligne cédera avant que la place ne parlemente */
  cedeAvantEux: boolean
  /** la ligne ne survivrait pas à la sortie qu'elle finira par subir */
  sortieFatale: boolean
  /** l'un ou l'autre : le panneau doit le dire, et fort */
  perdu: boolean
  rationDuJour: number
  garnison: Record<UnitId, number>
  garnisonDesarmee: Record<UnitId, number>
  partMur: number
  rancon: Cost
}

/**
 * Tout ce que le panneau a besoin de savoir, calculé UNE fois. `pillages` vient
 * du store (`s.expeditions[id].pillages`) : la garnison qu'on affaiblit est bien
 * celle qui s'est renforcée à chaque razzia encaissée, pas la garnison de la table.
 */
export function vueBlocus(e: EtatBlocus, v: VillageCible, pillages: number): VueBlocus {
  const forceLigne = forceDeLaLigne(e.postes)
  const puissancePlace = puissanceEffective(v, pillages)
  const garnison = garnisonEffective(v, pillages)
  const jusquaOffre = journeesJusquaOffre(e, forceLigne, puissancePlace)
  const tenables = journeesTenables(e)
  /*
   * ⚠️ DEUX FAÇONS DE PERDRE UN BLOCUS, ET LA PREMIÈRE VERSION N'EN VOYAIT QU'UNE.
   *
   * Elle ne comparait que les deux comptes à rebours - « la ligne cédera-t-elle
   * avant qu'ils ne parlementent ? » - et déclarait donc SAINE une ligne de six
   * frondeurs devant la forteresse mysienne : douze journées d'usure contre treize
   * de tenue, le compte tombait juste. Sauf qu'à la cinquième journée cette place
   * envoie sa garnison dehors, et que six frondeurs pèsent 47 contre 310. Le
   * panneau aurait donc laissé partir un joueur vers une déroute certaine en lui
   * affichant du vert.
   *
   * On mesure la sortie LA PLUS FORTE QU'IL RESTE À SUBIR, et les deux bornes
   * comptent autant l'une que l'autre :
   *
   *  · `sortieFaite` L'ÉTEINT. `chanceSortie` rend zéro dès que la garnison a
   *    tenté sa percée - elle n'en a pas deux en réserve. Sans cette borne, une
   *    ligne qui venait de REJETER la sortie gardait son bandeau rouge « leur
   *    garnison sortira » jusqu'au bout du siège, sur un danger qui n'existait
   *    plus : le panneau criait au loup à celui qui venait de le tuer.
   *  · ON PLAFONNE À LA VOLONTÉ COURANTE. La sortie la plus dure tombe juste sous
   *    `SEUIL_SORTIE`, quand la garnison a encore des bras ; passé ce seuil sans
   *    qu'elle soit sortie, elle ne sortira plus qu'affaiblie, et l'annoncer à sa
   *    force d'hier serait un mensonge dans l'autre sens.
   *
   * La question du joueur est « ma ligne tient-elle », pas « tient-elle jusqu'à ce
   * soir » : c'est donc bien un pire cas qu'on lui montre, mais un pire cas encore
   * possible.
   */
  const sortieFatale =
    !e.sortieFaite && forceLigne < puissanceSortie(puissancePlace, Math.min(SEUIL_SORTIE, e.volonte))
  const cedeAvantEux = !e.offre && jusquaOffre > tenables
  return {
    place: v,
    hommes: hommesDeLaLigne(e.postes),
    forceLigne,
    puissancePlace,
    rapport: rapportDeForce(forceLigne, puissancePlace),
    usure: usureParJour(e, forceLigne, puissancePlace),
    usureTenue: tenueParJour(e),
    jusquaOffre,
    tenables,
    cedeAvantEux,
    sortieFatale,
    perdu: cedeAvantEux || sortieFatale,
    rationDuJour: rationDuJour(e),
    garnison,
    garnisonDesarmee: garnisonDesarmee(garnison, e.volonte),
    partMur: partMurApresBlocus(e),
    rancon: rancon(e, v),
  }
}
