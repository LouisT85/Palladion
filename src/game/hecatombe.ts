import { ASSAUT_MIN_MS, DAY_MS, GODS } from './data'
import { JOURS_PAR_SAISON } from './saisons'
import type { Cost, GodId } from './types'

/*
 * ═══════════════════════ L'HÉCATOMBE ═══════════════════════
 *
 * Le jeu avait un sacrifice : cinquante mesures de grain, +8 de relation, +5 de
 * faveur, autant de fois qu'on voulait. C'est un distributeur, pas un rite - on
 * n'y décide rien, on y convertit du grain en relation à taux fixe.
 *
 * L'hécatombe est l'inverse sur les quatre axes qui comptent :
 *
 *  1. ELLE EST RARE. Une par saison, et la saison est l'unité de temps du jeu -
 *     quatre journées, une trentaine de minutes. On n'en aura pas deux.
 *  2. ELLE EST CHÈRE. Trois cent cinquante mesures de grain, quatre-vingt-dix
 *     lingots, quarante de faveur : soit la moitié d'un grenier d'agora 2, deux
 *     hoplites et demi qu'on n'alignera pas, et une Foudre qu'on ne lancera pas
 *     dans la bataille qui vient.
 *  3. ELLE DURE UNE SAISON ENTIÈRE. Pas dix minutes : jusqu'au basculement.
 *  4. ELLE SE CHOISIT. Quatre rites, un par Olympien, et ils ne se ressemblent
 *     pas. La question n'est donc pas « est-ce que je sacrifie » mais QUELLE
 *     SAISON JE DÉCIDE D'ÊTRE : une saison qu'on passe à bâtir, une saison qu'on
 *     passe à piller, une saison qu'on achète pour souffler.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX CHOIX DE CONCEPTION QU'IL FAUT DÉFENDRE ICI, PARCE QU'ILS ONT ÉTÉ PRIS
 * CONTRE UNE PREMIÈRE VERSION QUI NE TENAIT PAS.
 *
 * · L'ÉTAT NE PORTE AUCUNE ÉCHÉANCE EN MILLISECONDES. `EtatHecatombe` retient un
 *   INDEX DE SAISON, et le rite est actif tant que cet index est celui du
 *   présent. Ce n'est pas une élégance : c'est ce qui le rend immunisé aux deux
 *   pièges qui mordent tout le reste du store. Un champ `finAt` aurait dû être
 *   reculé à la main dans le bloc de vitesse du tick (sans quoi une hécatombe
 *   durerait huit fois trop longtemps à ×8), et il aurait survécu tel quel à un
 *   rattrapage de huit heures hors ligne - une saison qui a passé soixante fois
 *   avec un rite qui brûle encore. L'index, lui, se DÉDUIT de `createdAt`, que
 *   le bloc de vitesse recule déjà et que le hors-ligne fait avancer : le rite
 *   expire tout seul, dans les deux cas, sans une ligne de code.
 *
 * · LA TRÊVE DE ZEUS DIFFÈRE, ELLE NE SUPPRIME PAS. La première version posait
 *   un drapeau `treve` qui empêchait toute colonne de partir tant que la fumée
 *   montait. Chiffré, cela donnait ceci : une saison vaut 32 minutes, un assaut
 *   tombe toutes les 8 à 16 - le rite effaçait donc DEUX À QUATRE assauts pour
 *   quarante de faveur, c'est-à-dire qu'il achetait la fin du jeu au prix d'une
 *   bénédiction. La trêve accorde maintenant UN répit, une fois, au moment de
 *   l'offrande - et elle se ROMPT si l'on porte soi-même la guerre au-dehors.
 *   Zeus Xenios juge les serments : il ne couvre pas qui pille pendant sa trêve.
 */

/** l'état persistant du rite en cours - `null` quand aucune fumée ne monte */
export interface EtatHecatombe {
  dieu: GodId
  /**
   * L'index ABSOLU de la saison où le rite a été offert (0, 1, 2…), jamais le
   * `SaisonId`. Un nom de saison revient toutes les quatre journées : un rite du
   * printemps de l'an I serait alors tenu pour actif au printemps de l'an II, et
   * le joueur recevrait un effet qu'il a payé une heure plus tôt.
   */
  saison: number
}

/*
 * Le prix. Trois cent cinquante mesures, c'est la MOITIÉ exacte d'un grenier
 * d'agora 2 (STOCKAGE[2] = 700), le niveau où le rite s'ouvre : le prix se sent
 * au moment où on le paie, et il ne s'oublie pas ensuite. Quatre-vingt-dix
 * lingots, c'est deux hoplites et demi - le bronze est ce qui arbitre partout
 * ailleurs dans ce jeu, il devait arbitrer ici aussi.
 */
export const COUT_HECATOMBE: Cost = { grain: 350, bronze: 90 }

/**
 * La faveur versée au devin qui conduit le rite. Calée juste sous le prix d'une
 * Foudre de Zeus (50) : offrir l'hécatombe, c'est renoncer au bras du dieu dans
 * la bataille qui vient. Les deux leviers divins se disputent la même jauge -
 * sans quoi la faveur ne serait qu'un compteur qui monte.
 */
export const COUT_FAVEUR_HECATOMBE = 40

/** cent bêtes ne brûlent pas sur l'autel de cendres du bois sacré */
export const TEMPLE_MINIMUM = 2

/**
 * La borne basse du palier « En grâce ». L'hécatombe n'est PAS un moyen d'apaiser
 * un dieu offensé - `sacrifier()` fait déjà cela pour cinquante mesures - c'est
 * ce qu'on offre à un dieu qui écoute déjà. Deux sacrifices ordinaires ouvrent
 * la porte : la chaîne sacrifice → relation → hécatombe se lit sans qu'on ait à
 * l'expliquer nulle part.
 */
export const RELATION_MINIMUM = 15

/** ce qu'une saison dure, en millisecondes de jeu */
export const SAISON_MS = JOURS_PAR_SAISON * DAY_MS

/**
 * Un cinquième de saison. En dessous, le rite est REFUSÉ.
 *
 * Sans cette borne, offrir cent bêtes trente secondes avant le basculement était
 * un piège pur : le joueur payait le prix entier pour trois secondes d'effet, et
 * il ne pouvait l'apprendre qu'en le subissant. Avec elle, l'INSTANT de
 * l'offrande devient une compétence - plus tôt dans la saison, plus longtemps
 * l'effet - et le refus enseigne la règle au lieu de la punir.
 */
export const RESTE_MINIMUM_MS = Math.round(SAISON_MS * 0.2)

/** deux sacrifices et demi en un seul geste - de quoi payer une première grâce */
export const GAIN_RELATION = 20

/**
 * LE TROUPEAU SAIGNÉ : un cinquième du grain en moins tant que la fumée monte,
 * sur les quatre rites sans exception.
 *
 * C'est la seule part du prix qui GRANDIT avec l'économie du joueur, et c'est
 * pour cela qu'elle existe. Trois cent cinquante mesures, c'est la moitié d'un
 * grenier au début de la partie et le huitième d'un grenier à la fin ; vingt
 * pour cent de la récolte pèsent toujours autant. Corollaire voulu : une
 * hécatombe offerte en hiver, quand les champs ne rendent déjà que la moitié,
 * coûte bien plus qu'une hécatombe d'automne. La saison où l'on choisit
 * d'offrir fait partie de la décision.
 */
export const PART_TROUPEAU = 0.2

/** durée du modificateur d'ambiance que le rite laisse derrière lui */
export const DUREE_MORALE_MS = 6 * 60_000

/**
 * Ce qu'un rite en vigueur change.
 *
 * Les noms sont EXACTEMENT ceux que le store additionne déjà - `murPct`,
 * `chantierPct`, `recruesPct`, `degatsPct`, `butinPct` - et c'est délibéré :
 * chaque point de câblage devient l'ajout d'un terme dans une somme qui existe
 * (`1 + bonusHeros().wallHpPct + bonusFaveurs().murPct + …`), jamais une branche
 * nouvelle. Un système qui s'ajoute à ce jeu ne doit pas inventer sa propre
 * arithmétique : c'est ainsi qu'on garde vingt systèmes lisibles.
 */
export interface EffetsHecatombe {
  /**
   * Répit accordé UNE SEULE FOIS, au moment de l'offrande : millisecondes
   * ajoutées à l'échéance de la prochaine colonne. Ce n'est pas un état continu -
   * voir l'en-tête du fichier sur la trêve qui différait la fin du jeu.
   */
  repitMs: number
  /** le rite tombe si l'on porte soi-même la guerre au-dehors (Zeus seul) */
  romptSiGuerre: boolean
  /** l'enceinte est remaçonnée d'un coup, au moment de l'offrande */
  murRefait: boolean
  murPct: number
  /** durée des chantiers, EN MOINS */
  chantierPct: number
  /** durée de formation des recrues, EN MOINS */
  recruesPct: number
  degatsPct: number
  butinPct: number
  /** négatif : le troupeau saigné */
  grainPct: number
}

/**
 * L'objet rendu quatre-vingt-dix-neuf fois sur cent. C'est un SINGLETON de
 * module et non un littéral recréé à l'appel : `bonusHecatombe` est lu par
 * `productionParMinute` et par `murMax`, donc plusieurs fois par battement et
 * quatre battements par seconde. Allouer un objet à chaque lecture est
 * exactement le genre de détail qui a déjà coûté vingt images par seconde à ce
 * jeu.
 */
export const HECATOMBE_NEUTRE: EffetsHecatombe = {
  repitMs: 0,
  romptSiGuerre: false,
  murRefait: false,
  murPct: 0,
  chantierPct: 0,
  recruesPct: 0,
  degatsPct: 0,
  butinPct: 0,
  grainPct: 0,
}

/** un rite complet : ses données et sa prose ensemble, comme une merveille */
export interface RiteHecatombe {
  dieu: GodId
  nom: string
  emoji: string
  /** ce que le rite EST, historiquement - une phrase, pas une notice */
  desc: string
  /** ce qu'il promet, en une ligne, pour la carte du panneau */
  promesse: string
  /** le détail chiffré, ligne par ligne */
  effets: string[]
  /** ce que la chronique en dira */
  recit: string[]
  /** delta d'ambiance posé pour DUREE_MORALE_MS - négatif chez qui ne partage pas */
  morale: number
  effet: EffetsHecatombe
}

/**
 * Les quatre rites. Le dieu qu'on honore EST le choix de l'effet, et le temple
 * que ce dieu exige (Zeus 1, Poséidon 1, Athéna 2, Arès 3) échelonne tout seul
 * leur ouverture : le sang d'Arès arrive en dernier, ce qui est juste.
 */
export const RITES_HECATOMBE: Record<GodId, RiteHecatombe> = {
  zeus: {
    dieu: 'zeus',
    nom: 'La trêve du roi',
    emoji: '🕊️',
    desc:
      'Cent bœufs blancs pour Zeus Xenios, qui juge les serments et l’accueil fait aux étrangers. Les hérauts portent la nouvelle jusqu’aux tentes achéennes : on ne marche pas sur une cité dont la fumée monte droit.',
    promesse: 'La prochaine colonne attend. Mais Zeus ne couvre pas qui pille pendant sa trêve.',
    effets: [
      'La colonne annoncée est différée d’un cycle entier',
      'Le rite ROMPT si vous lancez vous-même une expédition',
      'Ambiance +6 pendant six minutes - le village mange',
      'Grain −20 % jusqu’au basculement de saison',
    ],
    recit: [
      'Cent bœufs blancs, la corne dorée, menés en file depuis l’aube. La fumée monte droit : le dieu accepte.',
      'Les hérauts partent vers les tentes achéennes. La colonne qu’on attendait ne viendra pas tout de suite.',
      'Mais le serment vaut des deux côtés : porter la guerre au-dehors, c’est le rompre soi-même.',
    ],
    morale: 6,
    effet: { ...HECATOMBE_NEUTRE, repitMs: ASSAUT_MIN_MS, romptSiGuerre: true, grainPct: -PART_TROUPEAU },
  },
  poseidon: {
    dieu: 'poseidon',
    nom: 'Les taureaux jetés à la mer',
    emoji: '🧱',
    desc:
      'Cent taureaux noirs précipités du haut de la falaise pour l’Ébranleur du sol. C’est lui qui fend les murailles ; c’est à lui qu’on demande qu’elles tiennent.',
    promesse: 'L’enceinte est remaçonnée entière sur l’heure, et elle tient un tiers de plus.',
    effets: [
      'L’enceinte revient à sa structure pleine, immédiatement',
      'Structure des remparts +33 % jusqu’au basculement de saison',
      'Ambiance +6 pendant six minutes',
      'Grain −20 % jusqu’au basculement de saison',
    ],
    recit: [
      'Cent taureaux noirs précipités du haut de la falaise. La mer les prend sans un bruit.',
      'Au matin, les maçons trouvent le mortier pris comme jamais : on remonte l’enceinte entière en un jour.',
    ],
    morale: 6,
    effet: { ...HECATOMBE_NEUTRE, murRefait: true, murPct: 0.33, grainPct: -PART_TROUPEAU },
  },
  athena: {
    dieu: 'athena',
    nom: 'Le péplos de la déesse',
    emoji: '🧵',
    desc:
      'Cent génisses pour Athéna Ergané, l’ouvrière, et un péplos tissé par les femmes de la cité durant la saison entière. La déesse ne donne pas la victoire : elle donne le métier.',
    promesse: 'Chantiers et casernes vont deux fois plus vite. Toute la saison.',
    effets: [
      'Durée des chantiers −50 %',
      'Durée de formation des recrues −50 %',
      'Ambiance +6 pendant six minutes',
      'Grain −20 % jusqu’au basculement de saison',
    ],
    recit: [
      'Cent génisses, et le grand péplos mis en chantier sur le métier des femmes de la cité.',
      'Les charpentiers travaillent d’un autre coup de main. Ce qui prenait la journée prend le matin.',
    ],
    morale: 6,
    effet: { ...HECATOMBE_NEUTRE, chantierPct: 0.5, recruesPct: 0.5, grainPct: -PART_TROUPEAU },
  },
  ares: {
    dieu: 'ares',
    nom: 'Le sang sur l’autel',
    emoji: '🗡️',
    desc:
      'Cent bêtes égorgées sans qu’une part revienne au peuple : tout au dieu, rien à la table. Arès ne se paie pas en fumée, il se paie en sang - et le village le sait.',
    promesse: 'Vos hommes frappent un tiers plus fort et rapportent moitié plus. Le peuple n’a rien eu.',
    effets: [
      'Dégâts de toute l’armée +33 %',
      'Butin d’expédition +50 %',
      'Ambiance −5 pendant six minutes - aucune part au peuple',
      'Grain −20 % jusqu’au basculement de saison',
    ],
    recit: [
      'Cent bêtes égorgées, et pas une part portée aux tables : le dieu prend tout.',
      'Les hommes affûtent en silence. Les femmes regardent l’autel sans rien dire.',
    ],
    morale: -5,
    effet: { ...HECATOMBE_NEUTRE, degatsPct: 0.33, butinPct: 0.5, grainPct: -PART_TROUPEAU },
  },
}

/**
 * L'index absolu de la saison courante.
 *
 * Le DOUBLE plancher n'est pas une maladresse : il reproduit à l'identique ce
 * que fait `tournerCiel` - `saisonDe(Math.floor((now - createdAt) / DAY_MS))`,
 * qui divise ENSUITE par `JOURS_PAR_SAISON`. Diviser d'un coup par
 * `DAY_MS * JOURS_PAR_SAISON` donnerait le même résultat presque partout, et un
 * résultat différent d'une unité juste avant chaque basculement - c'est-à-dire
 * exactement là où le joueur regarde sa jauge de fin de saison.
 */
export function indexSaison(now: number, createdAt: number): number {
  return Math.floor(Math.floor((now - createdAt) / DAY_MS) / JOURS_PAR_SAISON)
}

/** ce qu'il reste de la saison en cours, en millisecondes de jeu */
export function resteDeSaison(now: number, createdAt: number): number {
  const ecoule = (now - createdAt) % SAISON_MS
  return Math.max(0, SAISON_MS - ecoule)
}

/** le rite qui brûle en ce moment, ou `null` - le seul juge de « est-il actif » */
export function riteActif(
  h: EtatHecatombe | null | undefined,
  now: number,
  createdAt: number,
): RiteHecatombe | null {
  if (!h) return null
  if (h.saison !== indexSaison(now, createdAt)) return null
  return RITES_HECATOMBE[h.dieu] ?? null
}

/** ce que le rite en cours change - `HECATOMBE_NEUTRE` s'il n'y en a pas */
export function bonusHecatombe(
  h: EtatHecatombe | null | undefined,
  now: number,
  createdAt: number,
): EffetsHecatombe {
  return riteActif(h, now, createdAt)?.effet ?? HECATOMBE_NEUTRE
}

/** ce qu'il faut savoir pour juger si l'offrande est recevable */
export interface SnapHecatombe {
  temple: number
  /** relation EFFECTIVE au dieu - l'orgueil d'Agamemnon comprise */
  relation: number
  faveur: number
  hecatombe: EtatHecatombe | null
  now: number
  createdAt: number
}

/** pourquoi le rite est refusé, ou `null` s'il est recevable */
export type RefusHecatombe =
  | 'temple'
  | 'relation'
  | 'faveur'
  | 'deja'
  | 'tard'

/**
 * Le juge unique de la recevabilité. Le store l'appelle avant de payer, et le
 * panneau l'appelle pour griser la carte AVEC SON MOTIF : un bouton éteint sans
 * raison affichée est la première cause d'abandon d'un panneau de ce jeu.
 */
export function refusHecatombe(s: SnapHecatombe, dieu: GodId): RefusHecatombe | null {
  if (s.temple < Math.max(TEMPLE_MINIMUM, GODS[dieu].temple)) return 'temple'
  if (s.relation < RELATION_MINIMUM) return 'relation'
  if (s.faveur < COUT_FAVEUR_HECATOMBE) return 'faveur'
  if (riteActif(s.hecatombe, s.now, s.createdAt)) return 'deja'
  if (resteDeSaison(s.now, s.createdAt) < RESTE_MINIMUM_MS) return 'tard'
  return null
}

/** le refus, dit au joueur dans ses termes */
export function motifRefus(r: RefusHecatombe, dieu: GodId): string {
  const niveau = Math.max(TEMPLE_MINIMUM, GODS[dieu].temple)
  switch (r) {
    case 'temple':
      return `Cent bêtes ne brûlent pas sur un autel de cendres : il faut un temple de niveau ${niveau}.`
    case 'relation':
      return `${GODS[dieu].nom} ne vous écoute pas encore assez (relation ${RELATION_MINIMUM} exigée). Un sacrifice ordinaire y mène.`
    case 'faveur':
      return `Il faut ${COUT_FAVEUR_HECATOMBE} ✨ de faveur pour que le devin conduise le rite.`
    case 'deja':
      return 'Une hécatombe brûle déjà cette saison. On n’en offre qu’une.'
    case 'tard':
      return 'La saison s’achève : offrir cent bêtes maintenant serait les perdre. Attendez le basculement.'
  }
}
