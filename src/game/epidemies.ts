import { AGE_ADULTE, AGE_ANCIEN, ageDe } from './lignees'
import type { SaisonId } from './saisons'
import type { BuildingId, Cost } from './types'

/*
 * ═══════════════════════ LA FIÈVRE ET LE LAZARET ═══════════════════════
 *
 * Le jeu avait déjà une peste : le dilemme `peste` d'events.ts. Trois options,
 * un tirage, `ctx.pop(-3)` - et c'est tout. Regardons ce que cela coûtait
 * vraiment au joueur : `pop` baisse de trois, `syncVillageois` retire « d'abord
 * les OISIFS », donc la peste tuait trois chômeurs. Jamais le forgeron. Jamais
 * une lignée. La grande maladie de l'Iliade était un impôt sur les bras
 * inemployés, payé en une fois, et sur lequel on ne pouvait rien.
 *
 * La fièvre est maintenant un CYCLE, et le lazaret est ce qu'on lui oppose.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * I. LE CYCLE, ET POURQUOI IL COMPTE EN JOURNÉES DE JEU
 *
 * Elle ENTRE par une porte qu'on peut nommer : un convoi rentré de Troade, une
 * colonne revenue chargée de butin, la fièvre du camp achéen après un assaut,
 * ou le village lui-même quand il est trop plein pour ses maisons. Elle PREND
 * des habitants NOMMÉS - donc des métiers, donc des maisons. Elle se PROPAGE
 * depuis ceux qu'on a laissés debout, à une vitesse qui dépend de six choses
 * dont cinq sont des décisions du joueur. Elle TUE, chaque journée, ceux que
 * personne ne soigne. Et elle FINIT : trois journées de fièvre au plus par
 * malade, six journées au plus pour l'épidémie entière, et les relevés ne se
 * reprennent pas.
 *
 * TOUT SE COMPTE EN JOURNÉES DE JEU, jamais en millisecondes, et c'est ce qui
 * met le système hors de portée des deux pièges du moteur :
 *
 *  · le bloc de vitesse du tick RECULE toutes les échéances en millisecondes de
 *    `dtMs * (vitesse - 1)`. Une fièvre à échéances aurait tourné à ×1 dans un
 *    jeu à ×8, ou huit fois trop vite si l'on avait oublié une ligne. Un index
 *    de journée, lui, suit `jourDe(s)` - que le bloc de vitesse fait déjà
 *    avancer, puisqu'il recule `createdAt` ;
 *  · le rattrapage hors ligne fait bondir le calendrier de SOIXANTE journées.
 *    Une contagion qui aurait rattrapé son retard aurait expédié soixante
 *    journées de bûchers pendant une nuit d'absence. Voir `resoudreAbsence` :
 *    une fièvre NE TRAVERSE PAS une absence, elle s'y éteint, et l'on compte
 *    les morts d'UNE journée au réveil.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * II. LA DÉCISION NOUVELLE : LE TRIAGE
 *
 * Le lazaret n'est pas un bouton qui annule la maladie. Il donne des LITS, et
 * les lits sont moins nombreux que les malades. Aliter quelqu'un, c'est :
 *
 *  · perdre TOUT ce qu'il rendait (au lieu des 35 % qu'un fiévreux traîne
 *    encore à son poste), et payer son bouillon en grain chaque journée ;
 *  · diviser son risque de mourir, jusqu'à le réduire au quart ;
 *  · le RETIRER DE LA CONTAGION - un homme couché derrière une palissade de
 *    branches ne prend plus l'eau au même puits que les autres.
 *
 * Donc : trois lits, six malades, et parmi eux le seul forgeron du village, un
 * ancien qui mourra de toute façon, et l'enfant unique d'une maison. C'est cela
 * qu'on vient décider dans le panneau, et il n'y a pas de bonne réponse.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * III. CE QU'ON NE FAIT PAS, ET POURQUOI
 *
 * · PAS DE TABLE PARALLÈLE DE MALADES. Un `Record<string, Malade>` à la racine
 *   de l'état aurait divergé de `s.villageois` à la première mort : le mort
 *   quitte la liste, sa fiche de maladie reste, et le panneau propose un lit à
 *   quelqu'un qu'on a enterré. La marque vit SUR l'habitant, dans un champ
 *   facultatif, et disparaît avec lui sans qu'on ait rien à ranger.
 * · PAS DE MALADE QUI REND PLEIN. `efficaciteDe` est multipliée par
 *   `efficaciteMalade` : sans cela la fièvre ne coûterait rien tant qu'elle ne
 *   tue pas, et attendre serait toujours le meilleur choix.
 * · PAS DE MORT LE JOUR DE L'ENTRÉE. Une fièvre déclarée aujourd'hui n'est
 *   résolue que demain (`jourResolu`). Le joueur a une journée pleine - huit
 *   minutes réelles à ×1 - pour trier avant le premier bûcher. Un système qui
 *   tue au tirage n'est pas un système, c'est un dé.
 */

// ── Ce que le module lit d'un habitant ───────────────────────────────────────

/**
 * La marque de la fièvre, portée par l'habitant lui-même (champ facultatif de
 * `Villageois`). Trois états dans un seul objet - fiévreux debout, fiévreux
 * couché, relevé - parce qu'un relevé doit rester distinguable d'un homme qui
 * n'a jamais été pris : il est immunisé pour le reste de CETTE fièvre, et c'est
 * ce qui garantit qu'une épidémie s'éteint au lieu de tourner en rond.
 */
export interface Malade {
  /** journée de jeu où la fièvre l'a pris */
  depuis: number
  /** il est au lazaret : il ne rend plus rien, mais il ne contamine plus personne */
  alite: boolean
  /** journée où il s'est relevé - la fièvre en cours ne peut plus le reprendre */
  gueriLe?: number
}

/**
 * Ce que le module a besoin de savoir d'un habitant. C'est un SOUS-ENSEMBLE
 * structurel de `Villageois` et non un type à lui : le store passe ses vrais
 * habitants sans conversion, et rien ne peut se désynchroniser d'une copie.
 */
export interface Habitant {
  id: string
  nom: string
  metier: BuildingId
  poste: BuildingId | null
  neLe?: number
  lignee?: string
  malade?: Malade
}

// ── Les souches : quatre portes d'entrée, quatre fièvres ─────────────────────

export type SoucheId = 'camp' | 'butin' | 'convoi' | 'entassement'

export interface SoucheDef {
  id: SoucheId
  nom: string
  emoji: string
  /** la porte, nommée dans les termes du joueur - c'est ce que le rapport dira */
  porte: string
  /** ce qu'on aurait pu faire pour ne pas l'ouvrir */
  lecon: string
  /** facteur sur la vitesse de propagation */
  virulence: number
  /** facteur sur le risque de mourir chaque journée */
  mortalite: number
  /** combien d'habitants elle prend en entrant */
  premiersCas: number
  /**
   * Le poste par lequel elle entre, s'il y en a un. Le premier malade est
   * cherché là en priorité : la fièvre du convoi prend un docker, celle du
   * butin un homme de la forge qui a manié les armes rapportées. Sans cela, le
   * premier cas était un tirage pur et la porte ne se voyait pas.
   */
  premierPoste?: BuildingId
  recit: string[]
}

/**
 * Quatre souches, et leurs deux chiffres ne vont jamais dans le même sens : la
 * plus contagieuse n'est pas la plus mortelle. C'est ce qui fait que deux
 * épidémies ne se jouent pas pareil - l'une demande des lits tout de suite,
 * l'autre demande de tenir six journées.
 *
 * Les valeurs se lisent contre la base : `CAS_PAR_CONTAGIEUX` (0,45 nouveau cas
 * par fiévreux debout et par journée) et `MORTALITE_JOUR` (13 % par journée de
 * fièvre non soignée).
 */
export const SOUCHES: Record<SoucheId, SoucheDef> = {
  camp: {
    id: 'camp',
    nom: 'La fièvre du camp',
    emoji: '☠️',
    porte: 'les morts laissés devant la muraille après l’assaut',
    lecon: 'On brûle les corps au vent, ou l’on paie le mois suivant.',
    // celle de l'Iliade : Apollon décoche, et l'on compte les bûchers
    virulence: 1,
    mortalite: 1.5,
    premiersCas: 2,
    recit: [
      'D’abord les chiens, puis les mulets, puis les hommes : le mal est monté du charnier laissé devant la muraille.',
      'Le prêtre dit qu’un dieu décoche ses flèches. Les mères ne disent plus rien.',
    ],
  },
  butin: {
    id: 'butin',
    nom: 'La fièvre du butin',
    emoji: '🏺',
    porte: 'une colonne rentrée chargée de linges et de jarres pillées',
    lecon: 'Ce qu’on rapporte d’une ville prise n’est pas toujours ce qu’on croit rapporter.',
    virulence: 1.25,
    mortalite: 1,
    premiersCas: 2,
    premierPoste: 'forge',
    recit: [
      'Les hommes sont rentrés en criant, avec les linges et les jarres d’une ville qui ne se relèvera pas.',
      'Trois jours plus tard, deux d’entre eux ne se lèvent plus. La forge est vide au matin.',
    ],
  },
  convoi: {
    id: 'convoi',
    nom: 'La fièvre des quais',
    emoji: '🐫',
    porte: 'un convoi rentré de Troade',
    lecon: 'On peut faire décharger au mouillage, et perdre une journée de commerce.',
    // la porte la plus fréquente, donc la plus douce : sans cela le commerce
    // serait devenu un piège et l'on aurait cessé de lever des convois
    virulence: 0.85,
    mortalite: 0.7,
    premiersCas: 1,
    premierPoste: 'port',
    recit: [
      'Le convoi est rentré au soir, les bêtes fourbues, un homme couché en travers d’un ballot.',
      'On l’a porté chez lui parce que c’était un des nôtres. C’est ainsi que cela commence toujours.',
    ],
  },
  entassement: {
    id: 'entassement',
    nom: 'La fièvre des maisons basses',
    emoji: '🏚️',
    porte: 'un village plus nombreux que ses maisons',
    lecon: 'Bâtir des maisons AVANT d’en avoir besoin est le seul remède à celle-là.',
    virulence: 1.15,
    mortalite: 1.1,
    premiersCas: 2,
    recit: [
      'On dort à huit dans des maisons faites pour quatre, et l’on tire l’eau du même puits que les bêtes.',
      'Personne ne l’a apportée : elle est née ici, de nous, et tout le monde le sait.',
    ],
  },
}

export const SOUCHE_IDS = Object.keys(SOUCHES) as SoucheId[]

// ── L'état persistant ────────────────────────────────────────────────────────

/**
 * La fièvre en cours - ou la MÉMOIRE de la dernière, quand `finLe` est posé.
 *
 * Un seul champ pour les deux, et ce n'est pas une économie : c'est ce qui donne
 * au village un RÉPIT après l'épreuve (`REPIT_JOURS`) sans ajouter un compteur
 * à la racine de l'état. Sans ce répit, un convoi rentré le lendemain de la
 * dernière guérison rouvrait la même fièvre, et l'on n'aurait plus jamais joué
 * qu'à cela.
 */
export interface EtatEpidemie {
  souche: SoucheId
  /** journée de jeu où elle est entrée */
  jourEntree: number
  /** dernière journée dont la contagion a été résolue - au plus une par battement */
  jourResolu: number
  /** cas déclarés depuis l'entrée, morts et relevés compris */
  cas: number
  morts: number
  gueris: number
  /** journée où elle s'est éteinte - `undefined` tant qu'elle brûle */
  finLe?: number
}

// ── Le lazaret ───────────────────────────────────────────────────────────────

export const LAZARET_MAX = 3

/**
 * Les lits, par niveau de lazaret. Trois, six, dix : jamais de quoi coucher tout
 * le village. Un lazaret qui suffirait à tous supprimerait le triage, qui est
 * la seule décision que ce système apporte.
 */
export const LITS_LAZARET = [0, 3, 6, 10]

/**
 * Le prix des trois niveaux. Calé sur les TOURS D'ARCHERS (140 pierre / 60 bois,
 * puis 240/90/15, puis 380/35) et non sur les ateliers, parce que c'est contre
 * elles qu'il se décide : au moment où l'on peut asseoir une tour, on peut
 * ouvrir un lazaret, et l'on ne peut pas les deux. Des murs, ou des lits.
 */
export const COUTS_LAZARET: Cost[] = [
  { bois: 140, pierre: 40 },
  { bois: 180, pierre: 220, bronze: 20 },
  { pierre: 420, bois: 220, bronze: 60 },
]

/** il faut un prêtre qui connaisse les purifications : le temple d'abord */
export const TEMPLE_LAZARET = 1

/**
 * Le grain qu'un lit occupé mange par journée : bouillons, linges bouillis, feu
 * entretenu jour et nuit.
 *
 * Six mesures, contre 0,25 par habitant et par MINUTE (soit deux mesures par
 * journée) : un homme couché coûte donc trois fois un homme debout. Six lits
 * pleins pendant cinq journées font 180 mesures - la moitié d'une hécatombe.
 * C'est ce chiffre qui empêche d'aliter par réflexe même quand les lits sont
 * là, et qui fait qu'une fièvre d'hiver, greniers bas, est une vraie crise.
 */
export const GRAIN_PAR_LIT = 6

/** lits offerts par ce niveau de lazaret */
export function litsTotal(lazaret: number): number {
  return LITS_LAZARET[Math.max(0, Math.min(LAZARET_MAX, lazaret))] ?? 0
}

/** le prix du prochain niveau, ou `null` si le lazaret est achevé */
export function coutLazaret(niveau: number): Cost | null {
  return niveau >= LAZARET_MAX ? null : COUTS_LAZARET[niveau]
}

// ── Ce que la fièvre fait à un habitant ──────────────────────────────────────

/** il a la fièvre en ce moment - un relevé n'est plus malade */
export function estMalade(v: Habitant): boolean {
  return v.malade !== undefined && v.malade.gueriLe === undefined
}

/** il s'est relevé : la fièvre en cours ne peut plus le reprendre */
export function estGueri(v: Habitant): boolean {
  return v.malade?.gueriLe !== undefined
}

/** il a la fièvre et il est debout parmi les autres : il la donne */
export function estContagieux(v: Habitant, jour: number): boolean {
  if (!estMalade(v) || v.malade!.alite) return false
  // le jour même, il n'a encore rien donné à personne : la fièvre incube
  return jour - v.malade!.depuis >= 1
}

/** journées de fièvre déjà passées (0 = elle l'a pris aujourd'hui) */
export function joursDeFievre(v: Habitant, jour: number): number {
  return v.malade === undefined ? 0 : Math.max(0, jour - v.malade.depuis)
}

/**
 * Ce que cet habitant rend encore à son poste, en part de ce qu'il rendrait
 * sain. C'est la moitié du coût de la maladie, et la plus importante : sans
 * elle, une fièvre qui ne tue pas ne coûterait RIEN, et le meilleur jeu serait
 * de ne rien faire.
 *
 *  · alité, il rend ZÉRO - il est couché derrière une palissade de branches,
 *    et son poste l'attend (on ne peut pas le remplacer, `postesPourvus` le
 *    compte toujours) ;
 *  · debout, il rend 35 % : il se traîne au sillon, il ne tient pas la journée.
 */
export const EFFICACITE_FIEVREUX = 0.35
export function efficaciteMalade(v: Habitant): number {
  if (!estMalade(v)) return 1
  return v.malade!.alite ? 0 : EFFICACITE_FIEVREUX
}

// ── L'instantané que ces règles demandent ────────────────────────────────────

/** tout ce qu'il faut pour juger une journée de fièvre. Rien d'autre. */
export interface SnapEpidemie {
  /** journée de jeu courante (`jourDe(s)`) */
  jour: number
  saison: SaisonId
  pop: number
  /** ce que les maisons peuvent loger (`popCap(s)`) */
  popCap: number
  grain: number
  morale: number
  /** niveau du lazaret, 0 à 3 */
  lazaret: number
  /**
   * L'art du médecin, cumulé par les découvertes (`effetsTechnos().medecinePct`).
   * Il sert à DEUX choses, et c'est délibéré : il soigne ceux qui sont couchés
   * ET il ralentit la contagion (l'eau conduite, les latrines à l'écart, les
   * morts brûlés au vent). Deux canaux séparés auraient obligé le joueur à lire
   * deux pourcentages pour comprendre une seule idée.
   */
  medecine: number
  /** prêtres réellement à leur poste au temple - ce sont eux qui veillent */
  soigneurs: number
  villageois: Habitant[]
  epidemie: EtatEpidemie | null
}

// ── La fièvre brûle-t-elle ? peut-elle entrer ? ───────────────────────────────

/** une fièvre est-elle en cours ? (une mémoire de fièvre éteinte ne l'est pas) */
export function epidemieActive(e: EtatEpidemie | null | undefined): boolean {
  return !!e && e.finLe === undefined
}

/**
 * Le répit qu'on doit au village après une épidémie. Huit journées, soit deux
 * saisons : les relevés gardent le mal en mémoire, et le lazaret garde ses
 * habitudes. Sans ce répit, le premier convoi rentré le lendemain rallumait la
 * même fièvre et le système devenait un bruit de fond permanent.
 */
export const REPIT_JOURS = 8

/** la porte peut-elle s'ouvrir aujourd'hui ? */
export function porteOuverte(e: EtatEpidemie | null | undefined, jour: number): boolean {
  if (!e) return true
  if (e.finLe === undefined) return false
  return jour - e.finLe >= REPIT_JOURS
}

// ── La pression de contagion : les six facteurs, dont cinq se décident ────────

/** l'hiver serre tout le monde dans les maisons ; l'été fait croupir l'eau */
export const CONTAGION_SAISON: Record<SaisonId, number> = {
  printemps: 1,
  ete: 1.15,
  automne: 0.95,
  hiver: 1.3,
}

/** greniers vides : des corps qui ne se défendent plus */
export const CONTAGION_FAMINE = 1.35
/** un village qui n'a plus le cœur à tenir les règles d'hygiène */
export const CONTAGION_MORALE_BASSE = 1.1
export const MORALE_BASSE = 35

/** nouveaux cas par fiévreux debout et par journée, avant tous les facteurs */
export const CAS_PAR_CONTAGIEUX = 0.45

/**
 * Et le plafond : trois nouveaux cas par journée, jamais plus. Une fièvre ne
 * prend pas un village en une nuit - et surtout, un joueur qui trouverait douze
 * nouveaux malades d'un coup ne trierait plus rien, il subirait. Le plafond est
 * ce qui garde la décision jouable dans le pire cas.
 */
export const CAS_MAX_PAR_JOUR = 3

/**
 * L'entassement : ce que le village compte de bouches pour ce que ses maisons
 * peuvent loger. À plein (ratio 1) la contagion monte de 20 % ; à moitié elle
 * baisse de 10 %. C'est le SEUL facteur qui se paie d'avance, en maisons bâties
 * avant d'en avoir besoin - et c'est pour cela qu'il est au cœur du système.
 */
export function entassement(pop: number, cap: number): number {
  if (cap <= 0) return 1.2
  return 0.6 + 0.6 * Math.min(1.5, pop / cap)
}

/**
 * Ce que le lazaret et la médecine retirent à la contagion, en part. Le lazaret
 * ne sert donc pas qu'à coucher les malades : son existence même vaut des
 * latrines à l'écart et de l'eau propre. Plafonné à 60 % - on ne ferme jamais
 * complètement une porte ouverte.
 */
export function hygiene(snap: Pick<SnapEpidemie, 'lazaret' | 'medecine'>): number {
  return Math.min(0.6, snap.lazaret * 0.12 + snap.medecine)
}

/** le facteur global de propagation, tous les leviers compris */
export function pressionContagion(snap: SnapEpidemie): number {
  const souche = snap.epidemie ? SOUCHES[snap.epidemie.souche].virulence : 1
  const famine = snap.grain <= 0 ? CONTAGION_FAMINE : 1
  const humeur = snap.morale < MORALE_BASSE ? CONTAGION_MORALE_BASSE : 1
  return (
    souche *
    CONTAGION_SAISON[snap.saison] *
    entassement(snap.pop, snap.popCap) *
    famine *
    humeur *
    (1 - hygiene(snap))
  )
}

// ── Ce que soigner vaut ──────────────────────────────────────────────────────

/**
 * La qualité du soin donné dans un lit : le lazaret, les prêtres qui veillent,
 * et ce que le conseil a découvert. Plafonnée à 75 % - on ne guérit pas la
 * peste dans l'âge du bronze, on la traverse.
 *
 * ⚠️ ELLE NE VAUT QUE POUR LES ALITÉS, et sans grain elle ne vaut rien du tout
 * (`grain <= 0` : plus de bouillon, plus de linge bouilli, plus de feu). Un
 * lazaret plein dans un village affamé est une rangée de mourants.
 */
export const SOIN_MAX = 0.75
export function soinDe(snap: Pick<SnapEpidemie, 'lazaret' | 'soigneurs' | 'medecine' | 'grain'>): number {
  if (snap.lazaret <= 0) return 0
  if (snap.grain <= 0) return 0
  return Math.min(SOIN_MAX, snap.lazaret * 0.18 + Math.min(3, snap.soigneurs) * 0.06 + snap.medecine)
}

// ── La mort, et qui elle prend ───────────────────────────────────────────────

/** risque de mourir par journée de fièvre, souche moyenne, sans soin, adulte */
export const MORTALITE_JOUR = 0.13

/**
 * L'âge devant la fièvre. C'est l'inverse exact de `rendementAge` : la maladie
 * prend d'abord ceux qui rendaient le moins, et c'est ce qui la rend tragique
 * plutôt que coûteuse - on perd l'enfant qui devait hériter du métier, et
 * l'ancien qui était le dernier à le connaître.
 */
export function fragiliteAge(age: number): number {
  if (age < AGE_ADULTE) return 1.6
  return age >= AGE_ANCIEN ? 2.2 : 1
}

/**
 * Le risque qu'un malade meure dans la journée. SOURCE DE VÉRITÉ UNIQUE : la
 * résolution du jour l'appelle pour tirer, et le panneau l'appelle pour dire le
 * pronostic. Deux formules auraient fini par mentir au joueur - c'est déjà
 * arrivé sur les traits des héritiers, et il avait fallu regarder l'image pour
 * s'en apercevoir.
 */
export function risqueMortJour(v: Habitant, snap: SnapEpidemie): number {
  if (!estMalade(v)) return 0
  const souche = snap.epidemie ? SOUCHES[snap.epidemie.souche].mortalite : 1
  /*
   * ⚠️ L'ÂGE QU'IL AVAIT QUAND LA FIÈVRE L'A PRIS, et non celui du jour courant.
   *
   * En cours de partie les deux ne peuvent différer de plus de six ans (trois
   * journées de fièvre, deux ans la journée) : cela ne change rien. Mais AU
   * RETOUR D'UNE ABSENCE le calendrier a bondi de soixante journées, soit cent
   * vingt ans - lu au jour du retour, TOUT LE MONDE serait un ancien
   * (`fragiliteAge` = 2,2), et une nuit passée hors du jeu doublerait la
   * mortalité de la fièvre par le seul effet de l'horloge. Le mal frappe l'homme
   * tel qu'il l'a trouvé.
   */
  const age = fragiliteAge(ageDe(v, v.malade!.depuis))
  const soin = v.malade!.alite ? 1 - soinDe(snap) : 1
  return Math.min(0.9, MORTALITE_JOUR * souche * age * soin)
}

/** le pronostic, dit au joueur en mots - un pourcentage n'engage personne */
export function pronostic(v: Habitant, snap: SnapEpidemie): string {
  const r = risqueMortJour(v, snap)
  if (r <= 0.06) return 'il devrait s’en tirer'
  if (r <= 0.12) return 'sérieux'
  if (r <= 0.22) return 'grave'
  return 'il peut ne pas voir demain'
}

// ── La guérison ──────────────────────────────────────────────────────────────

/** chance de se relever par journée, sans soin */
export const GUERISON_JOUR = 0.25

/** au-delà, la fièvre est tombée d'elle-même : on se relève ou l'on est mort */
export const JOURS_FIEVRE = 3

/** l'épidémie entière ne dure pas plus longtemps que cela */
export const JOURS_MAX = 6

export function chanceGuerison(v: Habitant, snap: SnapEpidemie): number {
  const soin = v.malade!.alite ? soinDe(snap) : 0
  return Math.min(0.95, GUERISON_JOUR * (1 + soin * 2))
}

// ── Aliter, et le refus qui s'explique ───────────────────────────────────────

export type RefusAliter = 'pas-de-lazaret' | 'complet' | 'pas-malade' | 'gueri' | 'deja'

/** malades en ce moment, dans l'ordre où le panneau doit les montrer */
export function malades(villageois: Habitant[]): Habitant[] {
  return villageois.filter(estMalade)
}

export function alites(villageois: Habitant[]): Habitant[] {
  return villageois.filter((v) => estMalade(v) && v.malade!.alite)
}

export function litsOccupes(villageois: Habitant[]): number {
  return alites(villageois).length
}

export function litsLibres(snap: Pick<SnapEpidemie, 'lazaret' | 'villageois'>): number {
  return Math.max(0, litsTotal(snap.lazaret) - litsOccupes(snap.villageois))
}

/** pourquoi ce lit est refusé, ou `null` s'il peut être donné */
export function refusAliter(snap: SnapEpidemie, id: string): RefusAliter | null {
  const v = snap.villageois.find((x) => x.id === id)
  if (!v || v.malade === undefined) return 'pas-malade'
  if (estGueri(v)) return 'gueri'
  if (v.malade.alite) return 'deja'
  if (snap.lazaret <= 0) return 'pas-de-lazaret'
  if (litsLibres(snap) <= 0) return 'complet'
  return null
}

export function motifAliter(r: RefusAliter): string {
  switch (r) {
    case 'pas-de-lazaret':
      return 'Il n’y a pas un lit au village : ouvrez un lazaret au temple, ou la fièvre passera de maison en maison.'
    case 'complet':
      return 'Tous les lits sont pris. Il faut en renvoyer un au travail pour coucher celui-là - ou agrandir le lazaret.'
    case 'pas-malade':
      return 'Celui-là n’a pas la fièvre.'
    case 'gueri':
      return 'Il s’est relevé : la fièvre ne le reprendra pas.'
    case 'deja':
      return 'Il est déjà couché.'
  }
}

// ── L'état sanitaire : de quoi la VOIR VENIR ──────────────────────────────────

/**
 * Le palier sanitaire. Deux champs et non un seul : `cle` est ce que le CSS
 * porte (sans accent, stable), `mot` est ce que le joueur lit. Une classe CSS
 * dérivée du libellé français aurait donné `.inquiétant`, et le premier
 * remaniement de la phrase aurait décoloré le panneau sans qu'on sache pourquoi.
 */
export type ClefSanitaire = 'sain' | 'surveille' | 'inquietant' | 'alarmant'

export const MOTS_SANITAIRES: Record<ClefSanitaire, string> = {
  sain: 'sain',
  surveille: 'à surveiller',
  inquietant: 'inquiétant',
  alarmant: 'alarmant',
}

export interface EtatSanitaire {
  /** probabilité réelle qu'une fièvre naisse ici dans la journée */
  risque: number
  cle: ClefSanitaire
  /** le mot que le panneau affiche */
  mot: string
  /** ce qui pèse, dans l'ordre où l'on peut y remédier */
  causes: string[]
}

/**
 * Ce que le lazaret sait dire AVANT qu'il n'y ait un seul malade. C'est la
 * pièce qui transforme « subir un tirage » en « avoir été averti » : le joueur
 * lit son entassement, sa saison et ses greniers, et il décide s'il bâtit des
 * maisons ou une tour de plus.
 *
 * Le risque est normalisé sur `RISQUE_ENTREE_MAX` afin que la jauge du panneau
 * dise la même chose que le tirage quotidien - une jauge qui ne serait pas la
 * probabilité réelle serait un ornement, et un ornement qui mentirait.
 */
export function etatSanitaire(snap: SnapEpidemie): EtatSanitaire {
  const risque = risqueEntreeJournee(snap)
  const causes: string[] = []
  /*
   * LE RÉPIT D'ABORD, quand il court. Sans cette ligne, le panneau affichait
   * « sain » et « aucun foyer possible » à un village entassé jusqu'au toit -
   * parce que `risqueEntreeJournee` rend zéro tant que la porte est fermée. Le
   * joueur en concluait que ses maisons suffisaient, et la fièvre revenait huit
   * journées plus tard sur un village qu'il n'avait pas agrandi.
   */
  const repit = snap.epidemie?.finLe !== undefined ? REPIT_JOURS - (snap.jour - snap.epidemie.finLe) : 0
  if (repit > 0) {
    causes.push(
      `Les relevés de la dernière fièvre gardent le mal en mémoire : aucune fièvre ne peut entrer avant ${repit} journée${repit > 1 ? 's' : ''}. Ce qui suit dit l’état du village, pas le risque du jour.`,
    )
  }
  const ratio = snap.popCap > 0 ? snap.pop / snap.popCap : 1.5
  if (ratio >= 0.9) {
    causes.push(
      `On dort à l’étroit : ${snap.pop} âmes pour ${snap.popCap} places. Des maisons de plus, et la fièvre circulerait moins vite.`,
    )
  }
  if (CONTAGION_SAISON[snap.saison] > 1) {
    causes.push(
      snap.saison === 'hiver'
        ? 'L’hiver serre tout le monde autour du même feu (+30 % de contagion).'
        : 'L’été fait croupir l’eau des citernes (+15 % de contagion).',
    )
  }
  if (snap.grain <= 0) causes.push('Les greniers sont vides : des corps qui ne se défendent plus (+35 %).')
  if (snap.morale < MORALE_BASSE) causes.push('Le village n’a plus le cœur à tenir les règles (+10 %).')
  if (snap.lazaret <= 0) causes.push('Aucun lazaret : pas un lit, pas de latrines à l’écart, pas d’eau conduite.')
  else causes.push(`Lazaret niveau ${snap.lazaret} : ${litsTotal(snap.lazaret)} lits, contagion −${Math.round(hygiene(snap) * 100)} %.`)
  const cle: ClefSanitaire =
    risque <= 0.005 ? 'sain' : risque <= 0.02 ? 'surveille' : risque <= 0.05 ? 'inquietant' : 'alarmant'
  return { risque, cle, mot: MOTS_SANITAIRES[cle], causes }
}

/**
 * Le risque qu'une fièvre naisse AU VILLAGE dans la journée (souche
 * `entassement`). Les trois autres souches entrent par un geste - un convoi
 * rentré, une colonne, un assaut - et se tirent là où ce geste se résout.
 *
 * Le plancher d'entassement (85 % des places occupées) est le point du système :
 * un village qui garde de la marge dans ses maisons NE PEUT PAS engendrer sa
 * propre peste. Ce n'est pas un adoucissement, c'est la récompense d'une
 * dépense qu'on aurait autrement toujours reportée.
 */
export const ENTASSEMENT_SEUIL = 0.85
export const RISQUE_ENTREE_MAX = 0.09

export function risqueEntreeJournee(snap: SnapEpidemie): number {
  if (!porteOuverte(snap.epidemie, snap.jour)) return 0
  const ratio = snap.popCap > 0 ? snap.pop / snap.popCap : 1.5
  if (ratio < ENTASSEMENT_SEUIL) return 0
  const trop = (ratio - ENTASSEMENT_SEUIL) / (1 - ENTASSEMENT_SEUIL)
  const famine = snap.grain <= 0 ? CONTAGION_FAMINE : 1
  const brut =
    RISQUE_ENTREE_MAX * Math.min(1, trop) * CONTAGION_SAISON[snap.saison] * famine * (1 - hygiene(snap))
  return Math.max(0, Math.min(1, brut))
}

/**
 * Chance qu'un geste extérieur ouvre la porte. Un convoi sur seize, une colonne
 * victorieuse sur dix, un assaut repoussé sur douze - multipliés par ce que
 * vaut l'hygiène du village.
 *
 * Ces chiffres se lisent contre les cadences réelles : un assaut toutes les 8 à
 * 16 minutes, une expédition quand on la lance, un convoi qui met plusieurs
 * minutes à rentrer. À 8 %, un assaut sur douze ouvre la porte - soit une
 * fièvre du camp toutes deux heures de jeu au plus, et le répit de huit
 * journées en retire encore. C'est un événement de règne, pas un tracas.
 */
export const RISQUE_PORTE: Record<SoucheId, number> = {
  camp: 0.08,
  butin: 0.1,
  convoi: 0.06,
  entassement: 0,
}

export function risquePorte(souche: SoucheId, snap: SnapEpidemie): number {
  if (!porteOuverte(snap.epidemie, snap.jour)) return 0
  return RISQUE_PORTE[souche] * (1 - hygiene(snap))
}

// ── L'entrée : qui tombe le premier ──────────────────────────────────────────

/** habitants que la fièvre peut encore prendre */
export function exposables(villageois: Habitant[]): Habitant[] {
  return villageois.filter((v) => v.malade === undefined)
}

/**
 * La fièvre choisit les faibles. On tire DEUX candidats et l'on garde le plus
 * fragile : c'est assez pour que les enfants et les anciens tombent plus
 * souvent sans que les adultes soient à l'abri, et cela ne demande pas de
 * table de poids à maintenir.
 */
export function choisirCible(candidats: Habitant[], jour: number, tirer: () => number): Habitant | null {
  if (candidats.length === 0) return null
  const a = candidats[Math.floor(tirer() * candidats.length) % candidats.length]
  const b = candidats[Math.floor(tirer() * candidats.length) % candidats.length]
  return fragiliteAge(ageDe(b, jour)) > fragiliteAge(ageDe(a, jour)) ? b : a
}

/**
 * Les premiers malades d'une souche. Le poste de la porte passe d'abord - la
 * fièvre des quais prend un docker, celle du butin un homme de la forge -
 * parce qu'une épidémie dont le premier cas est quelconque n'apprend rien au
 * joueur sur ce qui l'a fait entrer.
 *
 * `combien` existe pour le DILEMME de la fièvre : ses trois options ne changent
 * pas la maladie, elles changent le nombre de gens qu'on trouve couchés au
 * matin. C'est ce qui en fait une porte du système plutôt qu'un doublon.
 */
export function premiersCas(
  snap: SnapEpidemie,
  souche: SoucheId,
  tirer: () => number,
  combien?: number,
): string[] {
  const def = SOUCHES[souche]
  const vise = Math.max(1, combien ?? def.premiersCas)
  const libres = exposables(snap.villageois)
  const out: string[] = []
  const prioritaires = def.premierPoste ? libres.filter((v) => v.poste === def.premierPoste) : []
  if (prioritaires.length > 0) {
    const p = choisirCible(prioritaires, snap.jour, tirer)
    if (p) out.push(p.id)
  }
  while (out.length < vise) {
    const reste = libres.filter((v) => !out.includes(v.id))
    const c = choisirCible(reste, snap.jour, tirer)
    if (!c) break
    out.push(c.id)
  }
  return out
}

// ── La journée de fièvre ─────────────────────────────────────────────────────

/**
 * Ce que le store doit APPLIQUER. Le module ne mute rien : il rend des listes
 * d'identifiants, et le store fait les gestes - dont les DEUX que toute mort
 * demande (retirer de `s.villageois` ET décrémenter `s.pop`), qu'aucun module
 * pur ne peut faire à sa place.
 */
export interface IssueJournee {
  /** ils meurent : deux gestes chacun, plus le veuvage */
  morts: string[]
  /** ils se relèvent : `malade.gueriLe = jour` */
  gueris: string[]
  /** la fièvre les prend : `malade = { depuis: jour, alite: false }` */
  nouveaux: string[]
  /** grain mangé par les lits occupés cette journée */
  coutGrain: number
  /** la fièvre est éteinte : on pose `finLe` et l'on efface toutes les marques */
  finie: boolean
  /** le récit de la journée, pour la chronique - vide si rien n'a bougé */
  lignes: string[]
}

const RIEN: IssueJournee = { morts: [], gueris: [], nouveaux: [], coutGrain: 0, finie: false, lignes: [] }

/**
 * UNE journée de fièvre, et jamais deux.
 *
 * L'ordre compte et il est celui de la vie : on règle d'abord le sort de ceux
 * qui étaient malades HIER (mourir, se relever, tenir un jour de plus), puis
 * ceux qui restent debout donnent la fièvre à d'autres. Prendre la contagion
 * d'abord aurait fait mourir des gens le jour où ils tombent malades, ce que le
 * système promet de ne jamais faire.
 *
 * `jourResolu` garde l'idempotence : appelée deux fois le même jour - ce qui
 * arrive si un tick recalcule le crochet quotidien - elle ne rend rien.
 */
export function resoudreJournee(snap: SnapEpidemie, tirer: () => number): IssueJournee {
  const e = snap.epidemie
  if (!epidemieActive(e)) return RIEN
  if (snap.jour <= e!.jourResolu) return RIEN

  const morts: string[] = []
  const gueris: string[] = []
  const lignes: string[] = []
  const coutGrain = litsOccupes(snap.villageois) * GRAIN_PAR_LIT

  // la fièvre a-t-elle fait son temps ? six journées, et elle s'éteint d'elle-même
  const usee = snap.jour - e!.jourEntree >= JOURS_MAX

  for (const v of malades(snap.villageois)) {
    const jours = joursDeFievre(v, snap.jour)
    // pris aujourd'hui : il n'a pas encore passé une nuit avec, on ne tire rien
    if (jours < 1) continue
    if (usee) {
      gueris.push(v.id)
      continue
    }
    if (tirer() < risqueMortJour(v, snap)) {
      morts.push(v.id)
      continue
    }
    // la fièvre tombe au bout de trois journées, soignée ou non
    if (jours >= JOURS_FIEVRE || tirer() < chanceGuerison(v, snap)) gueris.push(v.id)
  }

  // ── la contagion, depuis ceux qu'on a laissés debout ──
  const nouveaux: string[] = []
  if (!usee) {
    const contagieux = snap.villageois.filter(
      (v) => estContagieux(v, snap.jour) && !morts.includes(v.id) && !gueris.includes(v.id),
    )
    const attendus = contagieux.length * CAS_PAR_CONTAGIEUX * pressionContagion(snap)
    const entiers = Math.floor(attendus)
    // la part décimale se joue aux dés : sans cela une pression de 0,9 par
    // journée n'aurait JAMAIS donné un cas, et l'entassement n'aurait rien pesé
    const combien = Math.min(CAS_MAX_PAR_JOUR, entiers + (tirer() < attendus - entiers ? 1 : 0))
    const libres = exposables(snap.villageois)
    for (let i = 0; i < combien; i++) {
      const reste = libres.filter((v) => !nouveaux.includes(v.id))
      const c = choisirCible(reste, snap.jour, tirer)
      if (!c) break
      nouveaux.push(c.id)
    }
  }

  // ── la fièvre est-elle éteinte ? ──
  const restants = malades(snap.villageois).filter(
    (v) => !morts.includes(v.id) && !gueris.includes(v.id),
  ).length
  const finie = usee || restants + nouveaux.length === 0

  if (morts.length > 0) lignes.push(`${morts.length} bûcher${morts.length > 1 ? 's' : ''} ce matin.`)
  if (gueris.length > 0) {
    lignes.push(`${gueris.length} relevé${gueris.length > 1 ? 's' : ''} - la fièvre ne les reprendra pas.`)
  }
  if (nouveaux.length > 0) {
    lignes.push(`La fièvre en prend ${nouveaux.length} de plus : elle circule encore.`)
  }
  if (finie) {
    lignes.push(
      usee
        ? 'La fièvre est tombée d’elle-même : elle avait fait le tour du village.'
        : 'Plus un malade au village. C’est fini.',
    )
  }
  return { morts, gueris, nouveaux, coutGrain, finie, lignes }
}

/**
 * CE QU'IL ADVIENT DE L'ÉPIDÉMIE AU RETOUR D'UNE ABSENCE.
 *
 * Une fièvre NE TRAVERSE PAS une absence. Huit heures hors ligne font avancer le
 * calendrier de soixante journées : une contagion qui aurait rattrapé son
 * retard aurait tué le village entier pendant une nuit, et le crochet quotidien
 * ne rattrape jamais plus d'UNE journée - la fièvre serait donc restée figée
 * dans l'état, à brûler huit minutes réelles par journée, pendant des heures.
 *
 * On la mène donc jusqu'à SON PROPRE TERME, et pas plus loin : chaque malade joue
 * les journées de fièvre qui lui restaient (trois par malade, six pour
 * l'épidémie, la plus courte des deux), une seule fois, et l'affaire est closée.
 *
 * ⚠️ CE N'EST PAS UN DÉTAIL D'ÉQUITÉ, C'EST UN EXPLOIT QU'ON FERME. Un seul
 * tirage par malade aurait fait de la fermeture de l'onglet le meilleur remède
 * du jeu : on quittait la partie au premier bûcher, on revenait dix minutes plus
 * tard avec une fièvre éteinte, les lits inutiles et le lazaret jamais bâti.
 * Une absence coûte maintenant EXACTEMENT ce que coûtait de ne rien faire - ni
 * plus (les soixante journées ne sont pas rejouées, la contagion ne prend
 * personne de plus, personne n'est là pour trier) ni moins. Ceux qu'on avait
 * couchés avant de partir gardent leur lit, leur soin et leur bouillon : c'est
 * la seule décision qui traverse l'absence, et c'est la bonne.
 */
export function resoudreAbsence(snap: SnapEpidemie, tirer: () => number): IssueJournee {
  const e = snap.epidemie
  if (!epidemieActive(e)) return RIEN
  const morts: string[] = []
  const gueris: string[] = []
  // la dernière journée RÉELLEMENT jouée, et non `snap.jour` : celui-ci est le
  // jour du retour, à soixante journées de là, et il ne dit rien de la fièvre
  const dernier = e!.jourResolu
  let journees = 0
  for (const v of malades(snap.villageois)) {
    const restant = Math.max(
      0,
      Math.min(JOURS_FIEVRE - joursDeFievre(v, dernier), JOURS_MAX - (dernier - e!.jourEntree)),
    )
    journees = Math.max(journees, restant)
    let mort = false
    for (let j = 0; j < restant && !mort; j++) mort = tirer() < risqueMortJour(v, snap)
    if (mort) morts.push(v.id)
    else gueris.push(v.id)
  }
  // les lits ont mangé pendant tout ce temps-là : un lazaret qui soigne pendant
  // une absence sans rien prélever ferait du départ un soin gratuit
  const coutGrain = litsOccupes(snap.villageois) * GRAIN_PAR_LIT * journees
  const lignes = [
    morts.length > 0
      ? `🕯️ La fièvre a fait son temps pendant votre absence : ${morts.length} bûcher${morts.length > 1 ? 's' : ''}, ${gueris.length} relevé${gueris.length > 1 ? 's' : ''}.`
      : '🕯️ La fièvre a fait son temps pendant votre absence, sans prendre personne.',
  ]
  if (coutGrain > 0) lignes.push(`🌾 ${coutGrain} mesures sont passées en bouillons et en linges bouillis.`)
  return { morts, gueris, nouveaux: [], coutGrain, finie: true, lignes }
}

// ── L'ambiance ───────────────────────────────────────────────────────────────

/**
 * Ce que la fièvre fait au moral du village : deux points par malade, plafonné à
 * seize. Le canal existe déjà (`moraleMods`), il est déjà reculé par le bloc de
 * vitesse, et il porte tout seul l'épidémie dans la production, la menace et la
 * désertion - sans qu'on ait à inventer un facteur « épidémie » nulle part.
 */
export const MORALE_PAR_CAS = 2
export const MORALE_MAX = 16
export const ID_MORALE_FIEVRE = 'epidemie-fievre'

export function moraleFievre(nbMalades: number): number {
  return -Math.min(MORALE_MAX, nbMalades * MORALE_PAR_CAS)
}

// ── Le récit ─────────────────────────────────────────────────────────────────

/** le bilan d'une fièvre, pour la chronique et pour le panneau */
export function resumeEpidemie(e: EtatEpidemie, jour: number): string[] {
  const def = SOUCHES[e.souche]
  const duree = Math.max(1, (e.finLe ?? jour) - e.jourEntree)
  return [
    `${def.emoji} ${def.nom}, entrée par ${def.porte}.`,
    `${e.cas} cas en ${duree} journée${duree > 1 ? 's' : ''} : ${e.morts} mort${e.morts > 1 ? 's' : ''}, ${e.gueris} relevé${e.gueris > 1 ? 's' : ''}.`,
    def.lecon,
  ]
}
