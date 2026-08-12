import { GEO_EXPEDITION, creerBataille, deroulerBataille, posterHeros } from './combat'
import { BUILDING_IDS, RES, STOCKAGE, TOURS_MAX, UNITS, UNIT_IDS, WALL_HP, structureMax } from './data'
import { aleaPose, creerAlea, poserAlea } from './defi'
import { MAX_TROUPES } from './expeditions'
import { HEROS, HERO_IDS, NIVEAU_MAX } from './heros'
import { PANS, ordresDefense, pansHeros, planValide, resumePlan, type PanId, type PlanDefense } from './plandefense'
import type {
  BuildingId,
  Cost,
  DefensesInterieures,
  HeroId,
  OrdresBataille,
  ResourceId,
  UnitId,
} from './types'

/*
 * ═══════════════════════ LE DUEL ═══════════════════════
 *
 * Tout ce qu'on assiégeait jusqu'ici était une table : huit places fortes aux
 * garnisons écrites dans `expeditions.ts`, qui ne changent pas d'un règne à
 * l'autre et qui n'ont jamais rien décidé. Le plan de défense, lui, était réglé
 * pour des vagues achéennes tirées au sort. Personne, jamais, n'affrontait un
 * CHOIX pris par quelqu'un d'autre.
 *
 * Le duel est cela, et rien d'autre : ma colonne contre le plan qu'un ami a réglé
 * en temps de paix. Trois gestes, trois codes de texte, aucun serveur.
 *
 *   1. IL PUBLIE SA CARTE. Ses murs, sa garnison, ses héros, son plan, et le
 *      butin qu'il MET EN JEU. Il la donne à qui il veut.
 *   2. JE LA FRAPPE. Je compose une colonne (20 hommes au plus, comme toute
 *      expédition), je désigne les pans par lesquels j'entre, et le moteur tranche.
 *      Je lui renvoie un rapport.
 *   3. IL VÉRIFIE. Son client rejoue l'assaut et compare. Si l'issue diffère, le
 *      rapport est REFUSÉ avec son motif. S'il tient, il paie - et il peut se venger.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SIX DÉCISIONS DE CONCEPTION, ET CE QUE CHACUNE ÉVITE.
 *
 * 1. ═══ L'ASSAUT NE DÉPEND QUE DE CE QUI EST VÉRIFIABLE. ═══
 *    C'est LA règle du fichier, et elle décide de tout le reste. La bataille est
 *    une fonction pure de trois choses : la CARTE (que le défenseur a signée), la
 *    COLONNE et les PANS (que l'attaquant annonce). RIEN de l'état vivant de
 *    l'attaquant n'y entre - ni ses héros, ni ses grâces, ni l'hécatombe de la
 *    saison, ni son chef, ni sa météo.
 *
 *    Ce n'est pas de l'ascétisme. Un premier jet passait `bonusAtkJoueur` calculé
 *    chez l'attaquant : le défenseur ne pouvait pas le recalculer, il devait donc
 *    le CROIRE, et le croire c'était accepter « j'avais +400 % de dégâts ». Toute
 *    entrée que le défenseur ne peut pas reconstituer est un mensonge gratuit.
 *    Corollaire assumé, et qui est aussi une bonne règle de jeu : ON NE PRÊTE PAS
 *    SES HÉROS À UN RAID D'HONNEUR. Ils restent chez vous - c'est-à-dire sur votre
 *    propre carte, où quelqu'un viendra les chercher.
 *
 * 2. ═══ LA GRAINE N'EST PAS UN DÉ QU'ON RELANCE. ═══
 *    Le rapport porte une graine, mais elle ne se CHOISIT pas : `graineRaid` la
 *    déduit de l'empreinte de la carte, de la colonne et des pans. Le défenseur la
 *    recalcule et refuse le rapport dont la graine ne découle pas de l'assaut
 *    décrit (`'graine'`).
 *
 *    Sans cela, l'anti-triche était une farce : un attaquant relançait mille
 *    graines hors écran, gardait celle qui gagnait, et son rapport était
 *    parfaitement vérifiable. Avec cela, changer de graine oblige à changer
 *    d'armée - c'est-à-dire à prendre une décision, ce qui est exactement ce qu'on
 *    voulait vendre. On ne prétend pas empêcher un client modifié d'essayer ses
 *    variantes ; on borne ce qu'il peut EN TIRER, et c'est la décision 3.
 *
 * 3. ═══ UNE CARTE EST UN CHÈQUE, ET IL NE S'ENCAISSE QU'UNE FOIS. ═══
 *    Le butin ne se calcule pas sur les coffres du défenseur au moment du raid -
 *    publier sa carte serait alors signer en blanc, et un ami la ferait circuler à
 *    douze. Il est GELÉ dans la carte à l'émission (`butinOffert`, DOUZE POUR CENT
 *    des greniers - `PART_BUTIN`, et non un huitième rond - plafonné en valeur
 *    absolue), et la carte est marquée `pille` dès que
 *    le premier rapport victorieux s'applique. Les suivants s'appliquent quand
 *    même - l'honneur et la revanche comptent - mais ils ne trouvent plus rien à
 *    prendre, et le panneau le DIT.
 *    Ce plafond absolu (`PLAFOND_BUTIN_PAR_RES`) est aussi ce qui empêche de se
 *    fabriquer une carte au grenier infini pour la raider soi-même : c'est le
 *    plafond, et non la bonne foi, qui tient.
 *
 * 4. ═══ LA CARTE REVIENT DANS LE RAPPORT, ET SON EMPREINTE LA PROUVE. ═══
 *    Pour rejouer l'assaut, le défenseur a besoin de la défense telle qu'elle
 *    était - or ses murs et sa garnison ont changé depuis. Deux façons : garder six
 *    cartes complètes en sauvegarde (deux kilo-octets de garnisons et de plans dont
 *    on n'a besoin qu'une fois), ou les faire VOYAGER. On garde donc du côté du
 *    défenseur la seule EMPREINTE (`CarteEmise.ref`), et la carte entière revient
 *    dans le rapport. Un champ retouché en chemin change l'empreinte : le rapport
 *    tombe sur `'inconnue'`, comme un rapport qui ne correspond à aucune carte
 *    jamais émise. C'est la même serrure pour les deux fraudes.
 *
 * 5. ═══ ON COMPTE EN JOURNÉES DE JEU, ET RIEN N'EXPIRE PENDANT UNE ABSENCE. ═══
 *    (pièges 2 et 4) Le seul délai du système - un raid d'honneur par journée -
 *    est un NUMÉRO DE JOURNÉE sur l'horloge de `jourDe(s)`, que le bloc de vitesse
 *    du tick fait déjà courir : rien à reculer à ×8. Et la revanche n'a PAS de date
 *    de péremption, contre le premier jet qui lui donnait huit journées : huit
 *    heures d'absence avancent le calendrier de soixante journées, et le joueur
 *    serait revenu devant trois vengeances périmées sans avoir rien décidé. Elle se
 *    perd d'une seule façon - en recevant une quatrième - c'est-à-dire par un geste
 *    du joueur lui-même.
 *
 * 6. ═══ LA CARTE EST UNE IMAGE, PAS LA GARNISON. ═══
 *    Un raid ne tue AUCUN homme chez le défenseur, et n'abat aucun mur. Il ne coûte
 *    que le butin gelé. Le premier jet retirait les morts de la simulation à
 *    `s.army` : personne n'aurait publié de carte, puisque publier aurait voulu
 *    dire risquer son armée sur une bataille qu'on ne verra pas. L'attaquant, lui,
 *    y perd de vrais hommes - c'est toute l'asymétrie, et c'est ce qui fait que
 *    publier est un pari raisonnable et attaquer un engagement.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE CE FICHIER NE FAIT PAS : il n'encode rien. `cartes.ts` transforme une
 * `CarteDefense` et un `RapportRaid` en codes collables et les relit ; ici on ne
 * connaît que les RÈGLES. Et il ne touche à aucun état : `duelApres*` rendent un
 * `EtatDuel` neuf, le store l'assigne.
 *
 * ⚠️ UNE RESTRICTION ASSUMÉE : on ne duelle pas depuis une partie de DÉFI. Le défi
 * repose sur une graine partagée dont le store sauvegarde le nombre de tirages
 * consommés ; dérouler un assaut hors écran en consommerait quelques milliers et
 * désynchroniserait un classement censé être comparable. `refusRaid` le refuse
 * (`'defi'`) plutôt que de l'abîmer en silence. Le jour où l'on voudra les deux, il
 * faudra que `defi.ts` sache RENDRE la source posée (un `avecAlea(f, fn)`) - il n'y
 * a rien d'autre qui bloque.
 */

/*
 * `PanId` est ré-exporté ici pour que le CÂBLAGE n'ait qu'un import à faire : la
 * signature de l'action du raid en a besoin, et le store n'a pas à connaître
 * `plandefense.ts` pour cela.
 */
export type { PanId }

// ── Ce qui voyage ────────────────────────────────────────────────────────────

/**
 * La cible : tout ce qu'il faut pour attaquer une cité, et rien de plus.
 *
 * Aucun secret n'y figure - pas de coffres, pas d'habitants, pas de faveur, pas de
 * technologies. Ce n'est pas une sauvegarde, et l'on doit pouvoir la donner à un
 * inconnu sans lui donner prise sur son règne.
 */
export interface CarteDefense {
  /** le nom sous lequel la cité se présente - son chef et sa maison */
  cite: string
  /** niveau des remparts (0-4) : le moteur le relit à chaque battement */
  mur: number
  /**
   * Points de structure TOTAUX de l'enceinte, tels qu'ils étaient à l'émission.
   * On les gèle au lieu de les déduire de `mur` parce que six systèmes les
   * majorent (Hector, les grâces, les reliques, les technos, la merveille, le
   * chef) : les recalculer chez l'attaquant donnerait une autre enceinte que celle
   * que le défenseur croyait publier, et donc deux déroulés différents.
   */
  murHp: number
  /** tours d'archers sur l'enceinte (0-4) */
  tours: number
  /** niveau de la Redoute : ses scorpions tiennent le dedans tant que le mur tient */
  redoute: number
  garnison: Partial<Record<UnitId, number>>
  /** les cinq ouvrages de l'intérieur, s'ils sont bâtis */
  interieur: DefensesInterieures
  /** LE plan - c'est lui qu'on vient affronter */
  plan: PlanDefense
  /** les héros de la garnison, avec leur niveau */
  heros: { id: HeroId; niveau: number }[]
  /**
   * Multiplicateur de dégâts et réduction des coups reçus, pour le camp
   * défenseur : les passifs de ses héros et le tempérament de son chef, déjà
   * cumulés. Deux nombres au lieu de la liste des sources, parce que l'attaquant
   * n'a pas à savoir POURQUOI il frappe un mur qui rend les coups - et parce que
   * `carteValide` peut alors les borner d'un seul geste.
   */
  atk: number
  reduc: number
  /** niveaux des bâtiments, pour le décor de la scène - jamais pour le combat */
  niveaux: Partial<Record<BuildingId, number>>
  /** le butin MIS EN JEU, gelé à l'émission. Voir la décision 3. */
  butin: Cost
  /** journée de jeu de l'émission, chez le défenseur */
  jour: number
  /**
   * Le rang de l'émission dans le règne (0, 1, 2…). Il n'est pas décoratif : deux
   * cartes rigoureusement identiques auraient la même empreinte, donc le même
   * `ref`, et le chèque déjà encaissé de la première aurait annulé le butin de la
   * seconde sans un mot.
   */
  serie: number
}

/**
 * Ce que le défenseur garde d'une carte publiée. Quatre champs, pas la carte : la
 * carte entière revient dans le rapport (décision 4).
 */
export interface CarteEmise {
  /** l'empreinte de la carte - la serrure */
  ref: string
  jour: number
  /** le butin qu'elle promet, pour le dire au panneau sans attendre un rapport */
  butin: Cost
  /** le chèque a été encaissé : les rapports suivants ne prendront plus rien */
  pille: boolean
}

/** l'issue d'un assaut, telle que les deux camps doivent la lire à l'identique */
export interface IssueRaid {
  /** la place est tombée */
  victoire: boolean
  /** qualité du sac (0-3) - la même échelle que les expéditions */
  etoiles: number
  /** hommes que l'attaquant a laissés sur place */
  morts: number
  /** hommes qu'il avait engagés - `etoiles` s'en déduit, on le garde pour le récit */
  envoyes: number
}

/** ce que l'attaquant renvoie : la carte, son assaut, et ce qu'il prétend */
export interface RapportRaid {
  /** le nom de l'attaquant, pour que la revanche ait un visage */
  cite: string
  /** la carte attaquée, telle qu'elle fut émise - son empreinte la prouve */
  cible: CarteDefense
  /** la colonne qui a marché - bornée par MAX_TROUPES */
  colonne: Partial<Record<UnitId, number>>
  /** les pans assaillis, dans l'ordre canonique de `PANS` */
  pans: PanId[]
  /** la graine du combat. Elle se DÉDUIT de l'assaut : voir `graineRaid`. */
  graine: number
  /** ce que l'attaquant prétend avoir obtenu */
  issue: IssueRaid
  /**
   * La carte de l'attaquant. C'est par elle que la revanche existe : sans elle, le
   * défenseur saurait qui l'a frappé et n'aurait aucun moyen d'y aller.
   */
  riposte: CarteDefense | null
}

/** un droit de frapper en retour, ouvert par un rapport appliqué */
export interface Revanche {
  /** l'empreinte de la carte de l'agresseur : on se venge d'une CARTE, pas d'un nom */
  ref: string
  cite: string
  /** sa carte, arrivée dans le rapport - c'est elle qu'on va frapper */
  carte: CarteDefense
  /** journée où le droit s'est ouvert */
  jour: number
  /** ce qu'il vous a pris - le panneau le rappelle, et c'est ce qui donne envie */
  pris: Cost
}

/**
 * L'état du duel. Sept champs, et chacun paie sa place :
 *
 *  · `cartes` - sans elles, un rapport ne peut pas être rattaché à une carte
 *    ÉMISE, et n'importe quel code fabriqué à la main viderait vos greniers ;
 *  · `emises` - le compteur monotone qui rend chaque carte unique (voir `serie`) ;
 *  · `frappees` - les cartes qu'on a déjà raidées. Sans elles, la même carte se
 *    refrappe indéfiniment : l'honneur d'un règne deviendrait un compteur qu'on
 *    incrémente en cliquant, et le butin d'un ami une rente ;
 *  · `vus` - les graines des rapports déjà appliqués. Un rapport ne s'applique pas
 *    deux fois, et la graine identifie le rapport à elle seule (elle est
 *    l'empreinte de la carte, de la colonne et des pans) ;
 *  · `revanches` - le sel du système, et le seul champ qui porte des cartes
 *    entières. Trois au plus ;
 *  · `honneur` - la seule chose qu'on gagne au duel qui ne soit pas une ressource ;
 *  · `dernierRaid` - le numéro de journée du dernier raid lancé. UN NUMÉRO DE
 *    JOURNÉE, jamais une échéance en millisecondes (piège 2).
 *
 * Les quatre listes sont BORNÉES. Une liste qui enfle est une sauvegarde qui
 * casse : `localStorage` n'a pas de fond, mais `JSON.parse` a une patience.
 */
export interface EtatDuel {
  cartes: CarteEmise[]
  emises: number
  frappees: string[]
  vus: number[]
  revanches: Revanche[]
  honneur: number
  dernierRaid: number
}

export const DUEL_VIDE: EtatDuel = {
  cartes: [],
  emises: 0,
  frappees: [],
  vus: [],
  revanches: [],
  honneur: 0,
  dernierRaid: 0,
}

/**
 * Un état de duel neuf, et c'est une FONCTION là où `DUEL_VIDE` est une constante.
 *
 * `etatInitial()` doit en appeler une : deux règnes qui partageraient les mêmes
 * tableaux verraient le second hériter des cartes publiées par le premier, et un
 * rapport adressé à une partie abandonnée s'appliquerait dans la suivante.
 * `isolation.test.ts` existe pour exactement ce défaut - « une partie neuve ne garde
 * rien du monde d'avant ».
 */
export function duelVide(): EtatDuel {
  return { cartes: [], emises: 0, frappees: [], vus: [], revanches: [], honneur: 0, dernierRaid: 0 }
}

/**
 * L'état du duel tel qu'il ressort d'une SAUVEGARDE - la migration d'`init()`.
 *
 * Une partie antérieure au duel n'a pas la clé, et `Object.assign` laisse alors celle
 * d'`etatInitial()` : ce cas-là se règle tout seul. Celui qui ne se règle pas tout
 * seul est le fichier repris à la main ou écrit par une version future : `refusRaid`
 * lit `duel.cartes.some(...)` au premier clic, et un `cartes` qui serait une chaîne
 * ferait planter le panneau au lieu de refuser un geste. Tout est donc reconstruit
 * champ par champ, et les quatre listes sont RE-BORNÉES au passage - une sauvegarde
 * qui aurait grossi ailleurs revient dans ses limites en se rechargeant.
 */
export function duelSain(brut: unknown): EtatDuel {
  const d = (brut ?? {}) as Partial<EtatDuel>
  const nombre = (n: unknown, min = 0): number =>
    typeof n === 'number' && Number.isFinite(n) ? Math.max(min, Math.floor(n)) : min
  const cartes = (Array.isArray(d.cartes) ? d.cartes : [])
    .filter((c): c is CarteEmise => typeof (c as CarteEmise)?.ref === 'string')
    .map((c) => ({ ref: c.ref, jour: nombre(c.jour), butin: { ...(c.butin ?? {}) }, pille: c.pille === true }))
    .slice(0, CARTES_MAX)
  const revanches = (Array.isArray(d.revanches) ? d.revanches : [])
    .filter((r): r is Revanche => typeof (r as Revanche)?.ref === 'string' && !!(r as Revanche)?.carte)
    .map((r) => ({
      ref: r.ref,
      cite: typeof r.cite === 'string' ? r.cite.slice(0, 40) : 'Une cité sans nom',
      // la carte d'un agresseur repasse par la désinfection : elle a voyagé
      carte: carteValide(r.carte),
      jour: nombre(r.jour),
      pris: { ...(r.pris ?? {}) },
    }))
    .slice(0, REVANCHES_MAX)
  return {
    cartes,
    emises: Math.max(nombre(d.emises), cartes.length),
    frappees: (Array.isArray(d.frappees) ? d.frappees : []).filter((r) => typeof r === 'string').slice(0, FRAPPEES_MAX),
    vus: (Array.isArray(d.vus) ? d.vus : []).filter((g) => typeof g === 'number').slice(0, VUS_MAX),
    revanches,
    honneur: nombre(d.honneur),
    dernierRaid: nombre(d.dernierRaid),
  }
}

/**
 * Peut-on dérouler un assaut hors écran en cet instant ?
 *
 * À interroger AVANT `resoudreRaid` / `deroulerRaid` partout où le refus n'est pas
 * déjà jugé par `refusRaid`. Le déroulé pose une source de hasard le temps de la
 * bataille et la RETIRE ensuite : appelé pendant une partie de défi, il effacerait
 * donc la graine du classement sans qu'aucun refus ne s'en plaigne, et le défi
 * cesserait d'être comparable au milieu d'une partie.
 */
export function duelJouable(): boolean {
  return !aleaPose()
}

// ── Les bornes, et pourquoi celles-là ────────────────────────────────────────

/**
 * Dix-huit cartes en mémoire, et ce chiffre a été mesuré après en avoir posé six.
 *
 * ⚠️ CE N'EST PAS SEULEMENT PUBLIER QUI ÉMET UNE CARTE : FRAPPER EN ÉMET UNE AUSSI.
 * `lancerRaidDuel` joint sa propre carte au rapport pour que la revanche existe, et
 * cette carte-là DOIT entrer dans `cartes`, sinon le client refuserait la vengeance
 * qu'il vient d'appeler (décision 4). Avec six places, six raids - six journées de
 * jeu, moins d'une heure - suffisaient donc à chasser de la mémoire la carte qu'on
 * avait publiée pour ses amis : leur rapport HONNÊTE tombait ensuite sur
 * `'inconnue'`, le butin promis n'était jamais perdu, et eux n'avaient ni honneur ni
 * vengeance. Le défaut ne se voyait qu'entre deux joueurs, jamais chez soi. Mesuré :
 * six raids, `cartes` plein de six ripostes, la carte publiée envolée.
 *
 * Dix-huit = les douze cartes qu'un règne peut frapper (`FRAPPEES_MAX`, donc douze
 * ripostes émises) plus six publications volontaires - la soirée où l'on distribue à
 * quelques-uns. Au-delà la plus ancienne sort, et un rapport qui la citerait est
 * refusé pour `'inconnue'` : on ne paie pas un chèque dont on ne se souvient plus.
 * Dix-huit enregistrements de quatre champs pèsent moins d'un kilo-octet.
 */
export const CARTES_MAX = 18

/**
 * Douze cartes frappées en mémoire. C'est le seul garde-fou contre le raid en
 * boucle sur la même cible, et douze est calé sur la durée d'un règne long : au
 * rythme d'un raid par journée, cela couvre douze journées, soit trois saisons.
 */
export const FRAPPEES_MAX = 12

/** vingt-quatre rapports appliqués en mémoire - quatre fois ce qu'on émet */
export const VUS_MAX = 24

/**
 * Trois revanches. C'est le seul champ qui porte des cartes entières, donc le seul
 * qui pèse ; et une vengeance qu'on remet à la semaine prochaine n'est plus une
 * vengeance. La quatrième chasse la plus ancienne - ce qui n'arrive que par un
 * geste du joueur (appliquer un quatrième rapport), jamais pendant son sommeil.
 */
export const REVANCHES_MAX = 3

/**
 * Un raid d'honneur par journée de jeu. Une journée vaut huit minutes : c'est le
 * même ordre de grandeur que le `RAID_COOLDOWN_MS` des expéditions (huit minutes
 * aussi), et ce n'est pas un hasard - un duel doit coûter le même temps qu'un
 * pillage, sinon il le remplace.
 */
export const DELAI_RAID_JOURS = 1

/**
 * Ce que la colonne mange en chemin. Quatre-vingts mesures, soit un peu moins d'un
 * quart d'un grenier d'agora 1 : de quoi sentir qu'on part, jamais de quoi
 * empêcher de partir. Le vrai prix d'un raid, ce sont les hommes qui n'en
 * reviennent pas.
 */
export const COUT_RAID: Cost = { grain: 80 }

/**
 * Douze pour cent des greniers, à l'émission - et l'on écrit douze pour cent parce
 * que c'est ce que le chiffre vaut : « un huitième » se lirait 0,125 et les tests
 * comparent à `PART_BUTIN`. C'est la part qui GRANDIT avec
 * l'économie (comme le troupeau saigné de l'hécatombe) : douze pour cent d'un
 * grenier d'agora 1 valent quarante mesures, d'un grenier d'agora 4 trois cent
 * trente-six. On met en jeu ce qu'on a, pas une somme forfaitaire.
 */
export const PART_BUTIN = 0.12

/**
 * Et le plafond absolu, par ressource. Trois cents, c'est l'ordre du butin d'une
 * bonne place de la table (`village-dardanien` rend 300 de pierre) : un duel gagné
 * vaut un raid réussi, jamais trois.
 *
 * ⚠️ C'est aussi la seule chose qui empêche de se fabriquer une carte au grenier
 * infini et de la frapper soi-même. `carteValide` l'applique à toute carte qui
 * ENTRE, pas seulement à celles qu'on émet.
 */
export const PLAFOND_BUTIN_PAR_RES = 300

/** l'ordre des ressources dans l'empreinte - écrit, parce que l'ordre des clés d'un objet n'est pas un contrat */
const ORDRE_RES: ResourceId[] = ['bois', 'pierre', 'grain', 'bronze']

/**
 * Bornes de `atk` et `reduc`. Un défenseur ne décrit que lui-même, et il ne peut
 * donc se rendre que plus fort - ce qui ne lui rapporte rien (personne ne frappe
 * une carte imprenable, et une carte qu'on ne frappe pas ne rapporte pas
 * d'honneur). On borne tout de même, parce qu'une carte fabriquée à la main ne se
 * gêne pas : +80 % de dégâts est le cumul le plus fort qu'un règne réel atteigne
 * (passifs de héros et chef guerrier compris), et 40 % de coups amortis la garde
 * d'Ajax à son sommet.
 */
export const ATK_MAX = 1.8
export const REDUC_MIN = 0.6

/**
 * Au plus soixante hommes par type dans une garnison publiée - trois fois une
 * colonne pleine (`MAX_TROUPES` vaut vingt). Un règne installé n'en tient pas tant
 * sous les armes ; la borne n'est là que pour la carte écrite à la main, à qui elle
 * interdit la garnison de mille hoplites que nul assaut ne percerait.
 */
export const GARNISON_MAX_PAR_UNITE = 60

// ── L'empreinte ──────────────────────────────────────────────────────────────

/**
 * Un hachage stable, celui de `successions.ts` (FNV-1a). Il n'a pas à résister à
 * un cryptographe : il doit rendre TOUJOURS le même nombre pour la même chaîne, sur
 * n'importe quel navigateur, et changer dès qu'un caractère change. C'est ce qui
 * fait tenir la serrure de la décision 4 et la graine de la décision 2.
 */
function empreinte(cle: string): number {
  let h = 2166136261
  for (let i = 0; i < cle.length; i++) {
    h ^= cle.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * La forme canonique d'une carte : la MÊME chaîne des deux côtés du courrier.
 *
 * Tous les champs qui pèsent sur le combat ou sur le butin y sont, dans un ordre
 * ÉCRIT, et aucun n'y est par un `JSON.stringify` : l'ordre des clés d'un objet
 * dépend de la façon dont il a été construit, et une carte reconstruite par un
 * décodeur n'aurait pas le même ordre que la carte émise. La sérialisation aurait
 * donc changé l'empreinte sans qu'un seul chiffre bouge - et TOUS les rapports
 * seraient tombés sur `'inconnue'`.
 *
 * `niveaux` n'y est PAS : c'est du décor, et le décor n'a pas à invalider un
 * rapport. Tout le reste y est.
 */
function canonCarte(c: CarteDefense): string {
  const p = c.plan
  return [
    c.cite,
    c.mur,
    c.murHp,
    c.tours,
    c.redoute,
    UNIT_IDS.map((u) => c.garnison[u] ?? 0).join('.'),
    [c.interieur.acropole, +c.interieur.bastion, +c.interieur.galeries, +c.interieur.poterne, +c.interieur.citerne].join('.'),
    p.ligne,
    p.tir,
    UNIT_IDS.map((u) => p.pans[u] ?? '-').join('.'),
    HERO_IDS.map((h) => p.heros[h] ?? '-').join('.'),
    HERO_IDS.map((h) => c.heros.find((x) => x.id === h)?.niveau ?? 0).join('.'),
    c.atk.toFixed(4),
    c.reduc.toFixed(4),
    ORDRE_RES.map((r) => c.butin[r] ?? 0).join('.'),
    c.jour,
    c.serie,
  ].join('|')
}

/** l'empreinte d'une carte, en base 36 - la serrure du système */
export function empreinteCarte(c: CarteDefense): string {
  return empreinte(canonCarte(c)).toString(36)
}

/**
 * LA GRAINE, DÉDUITE ET NON TIRÉE.
 *
 * Elle sort de l'empreinte de la carte, de la colonne et des pans. Trois
 * conséquences, et ce sont les trois raisons d'écrire cette fonction :
 *
 *  · l'attaquant ne peut pas relancer le dé sans changer d'armée (décision 2) ;
 *  · le défenseur la RECALCULE : un rapport dont la graine ne colle pas à l'assaut
 *    décrit est refusé sans même dérouler la bataille ;
 *  · elle identifie le rapport à elle seule, ce qui permet à `vus` de ne garder
 *    qu'un nombre par rapport appliqué au lieu d'une empreinte de plus.
 *
 * Le `+ 1` n'est pas une coquetterie : `creerAlea(0)` est un générateur parfaitement
 * valable, mais une graine nulle se confond avec « pas de graine » partout où l'on
 * teste la vérité d'un nombre, et ce genre de confusion se paie trois mois plus tard.
 */
export function graineRaid(ref: string, colonne: Partial<Record<UnitId, number>>, pans: PanId[]): number {
  const c = UNIT_IDS.map((u) => Math.max(0, Math.floor(colonne[u] ?? 0))).join('.')
  return empreinte(`${ref}#${c}#${pansValides(pans).join('.')}`) + 1
}

// ── Désinfection : rien de ce qui entre n'est cru sur parole ──────────────────

function borne(n: unknown, min: number, max: number, defaut = min): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : defaut
  return Math.max(min, Math.min(max, v))
}

/**
 * Les pans assaillis, remis dans l'ordre canonique de `PANS` et dédoublonnés.
 *
 * L'ordre compte pour deux raisons : `creerBataille` répartit la colonne front par
 * front dans l'ordre reçu, et la graine se calcule sur la liste. Deux joueurs qui
 * cliquent « nord puis porte » et « porte puis nord » doivent obtenir le MÊME
 * assaut, sinon l'ordre des clics deviendrait un dé de plus.
 */
export function pansValides(pans: unknown): PanId[] {
  const liste = Array.isArray(pans) ? pans : []
  return PANS.filter((p) => liste.includes(p.id)).map((p) => p.id)
}

/** la colonne, entiers positifs, bornée par `MAX_TROUPES` en la rognant par la fin */
export function colonneValide(brut: unknown): Partial<Record<UnitId, number>> {
  const src = (brut ?? {}) as Record<string, unknown>
  const out: Partial<Record<UnitId, number>> = {}
  let total = 0
  for (const u of UNIT_IDS) {
    const n = Math.max(0, Math.floor(typeof src[u] === 'number' && Number.isFinite(src[u]) ? (src[u] as number) : 0))
    const garde = Math.min(n, Math.max(0, MAX_TROUPES - total))
    if (garde > 0) out[u] = garde
    total += garde
  }
  return out
}

/** hommes d'une colonne */
export function hommesDe(colonne: Partial<Record<UnitId, number>>): number {
  return UNIT_IDS.reduce((a, u) => a + Math.max(0, Math.floor(colonne[u] ?? 0)), 0)
}

/**
 * Désinfecte une carte venue d'ailleurs - un ami d'une autre version, un code
 * tronqué, une carte fabriquée à la main pour se donner un grenier de rêve.
 *
 * Tout est borné, rien n'est refusé : une carte absurde devient une carte pauvre,
 * et c'est mieux qu'un plantage. Le seul cas qui vaut REFUS est la carte sans
 * défense du tout, et c'est `refusRaid` qui le juge - pas ici.
 *
 * ⚠️ La désinfection s'applique AUSSI aux cartes qu'on émet soi-même. C'est ce qui
 * garantit que l'empreinte calculée à l'émission et celle recalculée au retour
 * portent sur exactement la même forme.
 */
export function carteValide(brut: unknown): CarteDefense {
  const c = (brut ?? {}) as Partial<CarteDefense>
  const mur = borne(c.mur, 0, WALL_HP.length - 1, 0)
  const garnison: Partial<Record<UnitId, number>> = {}
  const gsrc = (c.garnison ?? {}) as Record<string, unknown>
  for (const u of UNIT_IDS) {
    /*
     * Le bélier n'est PAS une défense : `creerBataille` n'en met jamais parmi les
     * défenseurs, ni dans la ligne ni sur les créneaux (c'est la raison de
     * `UNITES_PLAN`). L'accepter ici aurait laissé publier une garnison de vingt
     * béliers qui pèse dans la puissance affichée et ne se bat pas - une carte qui
     * mentirait à l'attaquant sans même que son auteur l'ait voulu.
     */
    if (u === 'belier') continue
    const n = borne(gsrc[u], 0, GARNISON_MAX_PAR_UNITE, 0)
    if (n > 0) garnison[u] = Math.floor(n)
  }
  const interieurBrut = (c.interieur ?? {}) as Partial<DefensesInterieures>
  const heros: { id: HeroId; niveau: number }[] = []
  const hsrc = Array.isArray(c.heros) ? c.heros : []
  for (const h of HERO_IDS) {
    const trouve = hsrc.find((x) => (x as { id?: unknown })?.id === h)
    if (!trouve) continue
    heros.push({ id: h, niveau: Math.floor(borne((trouve as { niveau?: unknown }).niveau, 1, NIVEAU_MAX, 1)) })
  }
  const butin: Cost = {}
  const bsrc = (c.butin ?? {}) as Record<string, unknown>
  for (const r of ORDRE_RES) {
    const n = Math.floor(borne(bsrc[r], 0, PLAFOND_BUTIN_PAR_RES, 0))
    if (n > 0) butin[r] = n
  }
  const niveaux: Partial<Record<BuildingId, number>> = {}
  const nsrc = (c.niveaux ?? {}) as Record<string, unknown>
  for (const b of BUILDING_IDS) {
    const n = Math.floor(borne(nsrc[b], 0, 4, 0))
    if (n > 0) niveaux[b] = n
  }
  return {
    cite: typeof c.cite === 'string' && c.cite.trim() ? c.cite.slice(0, 40) : 'Une cité sans nom',
    mur,
    /*
     * L'enceinte publiée ne peut pas dépasser le DOUBLE de ce que son niveau vaut
     * nu. Six systèmes la majorent et leur cumul réel plafonne bien en dessous ;
     * doubler laisse toute la place aux règnes extrêmes et coupe court aux murs de
     * cent mille points d'une carte écrite à la main.
     */
    murHp: Math.round(borne(c.murHp, 0, (WALL_HP[mur] ?? 0) * 2, WALL_HP[mur] ?? 0)),
    tours: Math.floor(borne(c.tours, 0, TOURS_MAX[TOURS_MAX.length - 1], 0)),
    redoute: Math.floor(borne(c.redoute, 0, 4, 0)),
    garnison,
    interieur: {
      acropole: Math.floor(borne(interieurBrut.acropole, 0, 4, 0)),
      bastion: interieurBrut.bastion === true,
      galeries: interieurBrut.galeries === true,
      poterne: interieurBrut.poterne === true,
      citerne: interieurBrut.citerne === true,
    },
    // `planValide` fait déjà ce travail, et il le fait mieux : un pan qui n'existe
    // pas vaut pas d'ordre, jamais un ordre au hasard
    plan: planValide(c.plan),
    heros,
    atk: borne(c.atk, 1, ATK_MAX, 1),
    reduc: borne(c.reduc, REDUC_MIN, 1, 1),
    niveaux,
    butin,
    jour: Math.floor(borne(c.jour, 0, 1e7, 0)),
    serie: Math.floor(borne(c.serie, 0, 1e7, 0)),
  }
}

/** désinfecte un rapport entier - la carte, la riposte, la colonne, les pans, l'issue */
export function rapportValide(brut: unknown): RapportRaid {
  const r = (brut ?? {}) as Partial<RapportRaid>
  const colonne = colonneValide(r.colonne)
  const issueBrute = (r.issue ?? {}) as Partial<IssueRaid>
  const envoyes = hommesDe(colonne)
  const morts = Math.floor(borne(issueBrute.morts, 0, envoyes, 0))
  return {
    cite: typeof r.cite === 'string' && r.cite.trim() ? r.cite.slice(0, 40) : 'Une cité sans nom',
    cible: carteValide(r.cible),
    colonne,
    pans: pansValides(r.pans),
    graine: Math.floor(borne(r.graine, 0, 2 ** 32, 0)),
    issue: {
      victoire: issueBrute.victoire === true,
      etoiles: Math.floor(borne(issueBrute.etoiles, 0, 3, 0)),
      morts,
      envoyes,
    },
    // une riposte illisible vaut pas de riposte : le rapport s'applique, la
    // revanche ne s'ouvre pas, et le panneau le dit
    riposte: r.riposte ? carteValide(r.riposte) : null,
  }
}

// ── Émettre sa carte ─────────────────────────────────────────────────────────

/** ce qu'il faut lire du règne pour en publier la cible */
export interface SnapCarte {
  cite: string
  mur: number
  murHp: number
  tours: number
  redoute: number
  garnison: Partial<Record<UnitId, number>>
  interieur: DefensesInterieures
  plan: PlanDefense
  heros: { id: HeroId; niveau: number }[]
  /** passifs déjà cumulés du camp défenseur - voir `CarteDefense.atk` */
  atk: number
  reduc: number
  niveaux: Partial<Record<BuildingId, number>>
  resources: Record<ResourceId, number>
  jour: number
}

/**
 * Le butin qu'une carte met en jeu : douze pour cent des greniers, plafonné.
 *
 * ⚠️ Il se calcule ICI, à l'émission, et JAMAIS au moment du raid. C'est la
 * décision 3 en une fonction : publier sa carte, c'est écrire un chiffre et s'y
 * tenir, pas ouvrir ses coffres à quiconque tient le code.
 */
export function butinOffert(resources: Record<ResourceId, number>): Cost {
  const out: Cost = {}
  for (const r of ORDRE_RES) {
    const n = Math.floor(Math.min(Math.max(0, resources[r] ?? 0) * PART_BUTIN, PLAFOND_BUTIN_PAR_RES))
    if (n > 0) out[r] = n
  }
  return out
}

/**
 * La carte, prête à encoder. Elle passe par `carteValide` avant de sortir : c'est
 * la garantie que l'empreinte qu'on retient est calculée sur la même forme que
 * celle qui reviendra dans un rapport.
 */
export function emettreCarte(s: SnapCarte, serie: number): CarteDefense {
  return carteValide({
    cite: s.cite,
    mur: s.mur,
    murHp: s.murHp,
    tours: s.tours,
    redoute: s.redoute,
    garnison: s.garnison,
    interieur: s.interieur,
    plan: s.plan,
    heros: s.heros,
    atk: s.atk,
    reduc: s.reduc,
    niveaux: s.niveaux,
    butin: butinOffert(s.resources),
    jour: s.jour,
    serie,
  })
}

/** ce qu'une carte publiée coûte d'état : quatre champs, et pas la carte */
export function duelApresEmission(etat: EtatDuel, carte: CarteDefense): EtatDuel {
  const fiche: CarteEmise = {
    ref: empreinteCarte(carte),
    jour: carte.jour,
    butin: { ...carte.butin },
    pille: false,
  }
  // la plus récente en tête, et la plus ancienne tombe : une carte oubliée voit ses
  // rapports refusés pour `'inconnue'`, ce qui est la bonne réponse
  return {
    ...etat,
    cartes: [fiche, ...etat.cartes.filter((c) => c.ref !== fiche.ref)].slice(0, CARTES_MAX),
    emises: etat.emises + 1,
  }
}

// ── Le raid ──────────────────────────────────────────────────────────────────

/**
 * Les fronts d'un raid, sur la géométrie de l'expédition.
 *
 * Les `spawn` de `SECTEURS` ne servent à rien ici : ils sont écrits pour la carte
 * du VILLAGE, dont la boîte fait plus du double de celle d'une scène d'expédition.
 * On les recalcule donc sur l'ellipse de `GEO_EXPEDITION`, en gardant le décalage
 * du point d'apparition par défaut (`rx + 200`) pour l'axe long. L'axe court reçoit
 * moins (`ry + 110`) : à `ry + 200` la colonne du sud apparaissait à y = 644, hors
 * d'une scène qui n'en fait que 560 - des hommes qui marchent depuis le néant.
 */
/*
 * ── PAR OÙ L'ON ENTRE, ET AVEC QUOI : LES DEUX SEULS LEVIERS, ET ILS SONT MESURÉS ──
 *
 * L'attaquant ne décide de rien d'autre que de sa COLONNE et de ses PANS - c'est le
 * prix de la décision 1. Il fallait donc vérifier que ces deux leviers pèsent, parce
 * qu'« un réglage sans effet est pire qu'un réglage absent : il se croit obéi ».
 *
 * MESURÉ sur DOUZE cartes (même défense, `serie` différente, donc douze graines) et
 * des colonnes de vingt hommes. Deux cibles : une carte de règne installé - remparts
 * 3, 1250 points de structure, 25 hommes (6 hoplites, 8 lanciers, 5 archers, 3
 * frondeurs, 2 peltastes, 1 char), une tour, plan « Tenir / Tir tendu », aucun héros,
 * puissance 345 - et la même ramenée à mur 2 et onze hommes, puissance 165.
 *
 *   PUISSANCE 345          1 pan              2 pans             3 pans
 *   20 hoplites            12/12 · 8,7† ★1,8  12/12 · 14,4† ★1,0 10/12 · 16,3† ★0,8
 *   10 hopl. 6 lanc. 4 arch. 0/12 · 20†        0/12 · 20†         0/12 · 20†
 *   8 hopl. 4 lanc. 4 bél. 4 arch.
 *                           0/12 · 20†        0/12 · 20†         0/12 · 20†
 *
 *   PUISSANCE 165          1 pan              2 pans             3 pans
 *   20 hoplites            12/12 · 1,3† ★3,0  12/12 · 1,8† ★3,0  12/12 · 1,9† ★3,0
 *   10 hopl. 6 lanc. 4 arch. 12/12 · 6,6† ★2,0 12/12 · 5,2† ★2,0 12/12 · 7,2† ★1,9
 *
 * Quatre enseignements, et ils décident de ce que le panneau doit dire :
 *
 *  · LA COMPOSITION DÉCIDE AVANT LES PANS. Vingt hoplites percent la place à 345
 *    douze fois sur douze ; la même vingtaine mêlée d'archers et de lanciers y meurt
 *    ENTIÈRE, douze fois sur douze. L'écart n'est pas de degré, il est de nature : un
 *    duel se gagne par l'infanterie lourde massée, et c'est la première chose à
 *    comprendre.
 *  · LE BÉLIER NE VAUT RIEN ICI. Il est lent, il ne se bat pas, et la garnison le
 *    couche avant qu'il ait entamé l'assise - c'est l'inverse de ce qui perce une
 *    place de la table, où il n'y a presque personne pour le gêner.
 *  · CONCENTRER PAIE, ET D'AUTANT PLUS QUE LA PLACE EST DURE. Contre 345, un pan
 *    coûte 8,7 morts et rend deux étoiles ; trois pans en coûtent 16,3, n'en rendent
 *    plus qu'une, et échouent deux fois sur douze. `creerBataille` divise bien la
 *    structure entre les fronts - trois murs plus tendres - mais les vingt hommes y
 *    arrivent par sept, et sept hommes ne tiennent pas devant vingt-cinq. Contre 165
 *    l'écart tombe à 1,3 contre 1,9 : le levier existe surtout là où c'est difficile,
 *    ce qui est exactement la bonne place pour un levier.
 *  · UNE CARTE TROP DURE NE SE FAIT PAS FRAPPER. Et comme l'honneur du défenseur se
 *    gagne QUAND ON L'ATTAQUE, publier une place imprenable ne rapporte rien. C'est
 *    par là que le système se règle tout seul, sans qu'aucun plafond ne s'en mêle.
 */
export function frontsDuRaid(pans: PanId[]): { nom: string; angle: number; spawn: { x: number; y: number } }[] {
  const geo = GEO_EXPEDITION
  return pansValides(pans).map((id) => {
    const p = PANS.find((x) => x.id === id)!
    return {
      nom: p.nom,
      angle: p.angle,
      spawn: {
        x: geo.cx + (geo.rx + 200) * Math.cos(p.angle),
        y: geo.cy + (geo.ry + 110) * Math.sin(p.angle),
      },
    }
  })
}

/**
 * Les ordres de la bataille : CEUX DU DÉFENSEUR.
 *
 * C'est le cœur du plaisir de ce lot, et cela tient à une couture du moteur qu'il
 * faut connaître : `tickBataille` n'applique `b.ordres` qu'au camp `campJoueur`
 * (`enLigne` le vérifie combattant par combattant). Une bataille ne porte donc
 * qu'UN plan, et il faut choisir lequel.
 *
 * On choisit le défenseur, et `campJoueur: 'defense'`, pour trois raisons qui vont
 * dans le même sens :
 *  · c'est la promesse du lot - « le plan réglé en temps de paix affronte enfin un
 *    humain ». Un raid où la posture de la ligne adverse ne compterait pas serait
 *    un raid contre une table de plus ;
 *  · c'est la seule position vérifiable. Le plan du défenseur est DANS la carte
 *    qu'il a signée ; celui de l'attaquant vivrait dans son état courant, que
 *    personne ne peut recalculer (décision 1) ;
 *  · c'est ce qui permet aux héros de la garnison de tenir leurs pans
 *    (`posterHeros` ne poste que les héros du camp `campJoueur`).
 *
 * L'attaquant, lui, ne décide pas de sa posture - il décide de sa COLONNE et de ses
 * PANS. Deux leviers, tous deux vérifiables, et le second n'existait nulle part
 * ailleurs dans le jeu.
 */
export function ordresDuRaid(carte: CarteDefense, pans: PanId[]): OrdresBataille {
  return ordresDefense(carte.plan, frontsDuRaid(pans))
}

/** la garnison complète, telle que `creerBataille` l'exige (les sept clés) */
function garnisonComplete(carte: CarteDefense): Record<UnitId, number> {
  const out = {} as Record<UnitId, number>
  for (const u of UNIT_IDS) out[u] = carte.garnison[u] ?? 0
  return out
}

/**
 * La bataille d'un raid, montée depuis la carte et l'assaut - et rien d'autre.
 *
 * Aucune météo : `modsBataille` lit le ciel du village, et le ciel de l'attaquant
 * n'est pas celui du défenseur. Le faire voyager dans le rapport aurait ajouté une
 * entrée que le défenseur ne peut pas contredire (décision 1) ; le déduire de
 * l'un des deux aurait donné deux déroulés différents. Sous un duel, il fait beau.
 */
export function creerRaid(carte: CarteDefense, colonne: Partial<Record<UnitId, number>>, pans: PanId[], now = 0) {
  const fronts = frontsDuRaid(pans)
  const b = creerBataille({
    attaquants: UNIT_IDS.filter((u) => (colonne[u] ?? 0) > 0).map((u) => ({ enemy: u, count: colonne[u] as number })),
    defenseurs: garnisonComplete(carte),
    wallLevel: carte.mur,
    wallHpTotal: carte.murHp,
    now,
    geo: GEO_EXPEDITION,
    /*
     * ⚠️ 'defense' alors que le JOUEUR qui regarde est l'attaquant. Le nom du champ
     * ment un peu ici : dans le moteur, `campJoueur` désigne le camp que servent les
     * ordres, les passifs et les bénédictions. C'est le camp de la CARTE. L'écran de
     * l'attaquant devra donc lire les couleurs à l'envers - et c'est le prix d'avoir
     * un plan de défense qui commande vraiment.
     */
    campJoueur: 'defense',
    fronts,
    tours: carte.tours,
    redoute: carte.redoute,
    bonusAtkJoueur: carte.atk,
    reducJoueur: carte.reduc,
    herosPresents: carte.heros,
  })
  b.ordres = ordresDuRaid(carte, pans)
  // les héros de la garnison tiennent les pans que leur plan leur donne. On appelle
  // `posterHeros` et non `appliquerPlanHeros` : ce dernier refuse tout ce qui n'est
  // pas une défense DU VILLAGE, et une scène d'expédition n'en est pas une - alors
  // qu'ici les secteurs SONT bien ceux du défenseur.
  posterHeros(b, pansHeros(carte.plan, b.secteurs))
  return b
}

/** la même échelle que les expéditions : on juge un chef sur ce qu'il a économisé */
export function etoilesDuRaid(morts: number, envoyes: number): number {
  const ratio = envoyes > 0 ? morts / envoyes : 1
  return ratio < 0.2 ? 3 : ratio < 0.5 ? 2 : 1
}

/**
 * Ce que l'assaut a donné, du côté de celui qui l'a lancé.
 *
 * `pertes` ne voyage PAS dans le rapport et n'entre PAS dans la comparaison, et
 * c'est délibéré : le défenseur n'a aucun besoin de savoir quels types d'hommes
 * l'attaquant a laissés sur place, et chaque champ comparé de plus est un champ
 * de plus sur lequel deux versions du jeu peuvent se fâcher. L'attaquant, lui, en
 * a besoin pour rendre à `s.army` exactement ceux qui rentrent.
 */
export interface ResultatRaid {
  issue: IssueRaid
  pertes: Partial<Record<UnitId, number>>
}

/**
 * DÉROULE L'ASSAUT, hors écran, et rend l'issue - ou `null` si la bataille n'a pas
 * conclu dans la borne de `deroulerBataille`.
 *
 * `null` n'est pas un détail : une bataille indécise ne se JUGE pas. Le rapport
 * d'un attaquant dont l'assaut n'a pas conclu est refusé pour `'indecis'`, faute de
 * quoi le défenseur comparerait son verdict à un non-verdict et refuserait un
 * rapport honnête.
 *
 * ⚠️ IL SE DÉROULE HORS ÉCRAN, ET C'EST UNE OBLIGATION, PAS UN CHOIX DE CONFORT.
 * `deroulerBataille` avance par pas de `TICK_MS` exactement ; le store, lui, avance
 * au rythme de la boucle d'animation - 250 ms, puis 263 parce que l'onglet a
 * bronché. Un raid joué en temps réel n'est donc PAS reproductible, et toute la
 * vérification s'effondre. Le duel se tranche d'abord et se REGARDE ensuite : ce
 * que l'écran montre est un replay de la même graine, jamais l'arbitre.
 *
 * ⚠️ L'appel `poserAlea` est ce qui rend le déroulé reproductible : tout le hasard
 * du moteur passe par `hasard()`, donc par la source posée ici. On la retire dans un
 * `finally` - une exception à mi-bataille laisserait sinon le jeu ENTIER sur une
 * graine figée, et les vagues achéennes se répéteraient à l'identique pour toujours.
 */
export function resoudreRaid(
  carte: CarteDefense,
  colonne: Partial<Record<UnitId, number>>,
  pans: PanId[],
  graine: number,
): ResultatRaid | null {
  const colonneSaine = colonneValide(colonne)
  const envoyes = hommesDe(colonneSaine)
  if (envoyes === 0) return null
  poserAlea(creerAlea(graine))
  try {
    const b = creerRaid(carte, colonneSaine, pans)
    const d = deroulerBataille(b, {
      wallLevel: carte.mur,
      contexte: () => ({
        defenses: carte.interieur,
        // même repli que le store : sans lui, une Redoute neuve serait muette à sa
        // première brèche, et le déroulé ne vaudrait pas ce qu'il prétend valoir
        redouteHp: carte.redoute > 0 ? structureMax('redoute', carte.redoute) : undefined,
      }),
    })
    if (!d.terminee) return null
    const pertes: Partial<Record<UnitId, number>> = {}
    let morts = 0
    for (const u of UNIT_IDS) {
      if ((colonneSaine[u] ?? 0) === 0) continue
      // le MÊME critère que `finirExpedition` : à terre et vidé. Un fuyard encore
      // debout rentre au village, et il ne compte pas dans les étoiles.
      const n = b.fighters.filter((f) => f.camp === 'attaque' && f.type === u && f.etat === 'mort' && f.hp <= 0).length
      if (n > 0) pertes[u] = n
      morts += n
    }
    // `pillage` est le mot du moteur pour « les assaillants ont atteint le cœur » :
    // c'est le même verdict que `finirExpedition` lit pour une expédition
    const victoire = d.fin.pillage
    return {
      issue: { victoire, etoiles: victoire ? etoilesDuRaid(morts, envoyes) : 0, morts, envoyes },
      pertes,
    }
  } finally {
    poserAlea(null)
  }
}

/**
 * L'issue seule - ce dont le VÉRIFICATEUR a besoin, et rien d'autre. C'est cette
 * fonction que le défenseur appelle pour rejouer, et c'est pour cela qu'elle ne rend
 * pas les pertes : ce qu'on ne compare pas, on ne le calcule pas côté juge.
 */
export function deroulerRaid(
  carte: CarteDefense,
  colonne: Partial<Record<UnitId, number>>,
  pans: PanId[],
  graine: number,
): IssueRaid | null {
  return resoudreRaid(carte, colonne, pans, graine)?.issue ?? null
}

/**
 * Le rapport à renvoyer, monté depuis l'assaut qu'on vient de mener.
 *
 * La graine est calculée ICI et jamais passée en paramètre : c'est le seul moyen
 * d'être sûr qu'un rapport émis par ce jeu porte toujours une graine qui découle de
 * son assaut. Un appelant qui aurait pu la fournir aurait pu la choisir - et le
 * défenseur aurait refusé pour `'graine'` un rapport parfaitement honnête, ce qui
 * est le pire défaut possible de ce système (il ne se voit qu'entre deux joueurs).
 */
export function rapportDuRaid(
  cite: string,
  cible: CarteDefense,
  colonne: Partial<Record<UnitId, number>>,
  pans: PanId[],
  issue: IssueRaid,
  riposte: CarteDefense | null,
): RapportRaid {
  const saine = colonneValide(colonne)
  const sains = pansValides(pans)
  return {
    cite,
    cible,
    colonne: saine,
    pans: sains,
    graine: graineRaid(empreinteCarte(cible), saine, sains),
    issue,
    riposte,
  }
}

// ── Refuser un raid, et le dire ──────────────────────────────────────────────

/** ce qu'il faut savoir du règne pour juger si la colonne peut partir */
export interface SnapDuel {
  duel: EtatDuel
  /** effectifs disponibles - la colonne en sort */
  army: Record<UnitId, number>
  grain: number
  /** une colonne est déjà dehors */
  colonneDehors: boolean
  /** on se bat chez soi */
  enBataille: boolean
  /** le village est assiégé : personne ne sort */
  assiege: boolean
  jour: number
}

export type RefusRaid =
  | 'defi'
  | 'assiege'
  | 'enBataille'
  | 'colonneDehors'
  | 'attente'
  | 'carte'
  | 'soi'
  | 'deja'
  | 'colonne'
  | 'effectifs'
  | 'pans'
  | 'grain'

/**
 * Le juge unique du départ. Le store l'appelle avant de retirer un homme, et le
 * panneau l'appelle pour griser le bouton AVEC SON MOTIF : un bouton éteint sans
 * raison affichée est la première cause d'abandon d'un panneau de ce jeu.
 *
 * L'ordre des cas n'est pas indifférent - il va du plus général (on ne peut rien
 * lancer) au plus précis (cette colonne-là ne va pas) : c'est ce qui fait qu'un
 * joueur assiégé lit « personne ne sort » plutôt que « il vous manque des pans ».
 */
export function refusRaid(
  s: SnapDuel,
  carte: CarteDefense,
  colonne: Partial<Record<UnitId, number>>,
  pans: PanId[],
): RefusRaid | null {
  if (aleaPose()) return 'defi'
  if (s.assiege) return 'assiege'
  if (s.enBataille) return 'enBataille'
  if (s.colonneDehors) return 'colonneDehors'
  if (s.jour - s.duel.dernierRaid < DELAI_RAID_JOURS) return 'attente'
  const ref = empreinteCarte(carte)
  // une carte sans un homme ni un mur n'est pas une cible : c'est un code cassé
  if (hommesDe(carte.garnison) === 0 && carte.heros.length === 0 && carte.murHp <= 0) return 'carte'
  if (s.duel.cartes.some((c) => c.ref === ref)) return 'soi'
  if (s.duel.frappees.includes(ref)) return 'deja'
  const hommes = hommesDe(colonne)
  if (hommes === 0 || hommes > MAX_TROUPES) return 'colonne'
  for (const u of UNIT_IDS) if ((colonne[u] ?? 0) > (s.army[u] ?? 0)) return 'effectifs'
  if (pansValides(pans).length === 0) return 'pans'
  if (s.grain < (COUT_RAID.grain ?? 0)) return 'grain'
  return null
}

/** le refus, dit au joueur dans ses termes */
export function motifRefusRaid(r: RefusRaid): string {
  switch (r) {
    case 'defi':
      return 'On ne duelle pas depuis une partie de défi : le classement repose sur une graine partagée, et dérouler un assaut la consommerait.'
    case 'assiege':
      return 'Le village est assiégé : personne ne sort.'
    case 'enBataille':
      return 'On se bat sous vos murs. Le héraut attendra la fin.'
    case 'colonneDehors':
      return 'Une colonne est déjà dehors. Une cité n’en fait pas partir deux.'
    case 'attente':
      return 'Vos hommes sont rentrés d’hier. Un raid d’honneur par journée, pas plus.'
    case 'carte':
      return 'Cette carte ne décrit ni mur ni garnison : le code est incomplet ou d’une autre version.'
    case 'soi':
      return 'C’est votre propre carte. On ne se pille pas soi-même pour se faire un nom.'
    case 'deja':
      return 'Vous avez déjà frappé cette carte. Demandez-lui-en une neuve - celle-ci est vide.'
    case 'colonne':
      return `Une colonne compte de un à ${MAX_TROUPES} hommes.`
    case 'effectifs':
      return 'Vous n’avez pas ces hommes-là sous les armes.'
    case 'pans':
      return 'Par où entrez-vous ? Désignez au moins un pan de l’enceinte.'
    case 'grain':
      return `Une colonne mange en chemin : il faut ${COUT_RAID.grain} mesures de grain.`
  }
}

/** ce que le raid retire à l'état, une fois la colonne partie */
export function duelApresRaid(etat: EtatDuel, carte: CarteDefense, jour: number): EtatDuel {
  const ref = empreinteCarte(carte)
  return {
    ...etat,
    frappees: [ref, ...etat.frappees.filter((r) => r !== ref)].slice(0, FRAPPEES_MAX),
    dernierRaid: jour,
  }
}

// ── L'honneur, et le rang ────────────────────────────────────────────────────

/**
 * L'honneur d'un assaut. Dix points de base, quatre par étoile : de dix à
 * vingt-deux pour un raid gagné.
 *
 * Le calage se lit contre les rangs plus bas : un premier rang à vingt-cinq
 * demande deux duels, le dernier à trois cents en demande une vingtaine. Un règne
 * de trois heures compte une trentaine de journées, donc une trentaine de raids
 * possibles au plus : le rang le plus haut doit rester au bout du bras.
 */
export const HONNEUR_BASE = 10
export const HONNEUR_PAR_ETOILE = 4

/**
 * ET LE DÉFENSEUR EN GAGNE AUSSI, exactement de la même façon.
 *
 * C'est ce qui donne une raison de publier sa carte. Sans cela, publier n'était
 * qu'un risque - on offrait un butin et on n'attendait qu'une revanche à prendre -
 * et personne n'aurait rien publié : le système entier reposait sur la générosité.
 * Un plan qui tient rapporte donc autant qu'un mur percé, et l'échelle est
 * symétrique : là où l'attaquant compte les étoiles (les hommes qu'il a ÉCONOMISÉS),
 * le défenseur compte les lauriers (les hommes qu'il a COUCHÉS).
 *
 * Corollaire voulu : on ne gagne jamais les deux. Un raid repoussé donne l'honneur
 * au défenseur et n'ouvre AUCUNE revanche - il n'y a rien à venger, on a tenu.
 */
export function lauriersDeDefense(issue: IssueRaid): number {
  const part = issue.envoyes > 0 ? issue.morts / issue.envoyes : 0
  return part >= 0.75 ? 3 : part >= 0.5 ? 2 : part >= 0.25 ? 1 : 0
}

export function honneurAttaque(issue: IssueRaid): number {
  return issue.victoire ? HONNEUR_BASE + issue.etoiles * HONNEUR_PAR_ETOILE : 0
}

export function honneurDefense(issue: IssueRaid): number {
  return issue.victoire ? 0 : HONNEUR_BASE + lauriersDeDefense(issue) * HONNEUR_PAR_ETOILE
}

export interface RangDuel {
  seuil: number
  nom: string
  emoji: string
}

/**
 * Cinq rangs, et le premier est « sans renom ». Le rang n'ouvre RIEN - aucun bonus,
 * aucun bâtiment, aucune unité. C'est délibéré : dès qu'un rang de duel donnerait un
 * avantage de jeu, il faudrait le mériter, donc l'anti-triche cesserait d'être une
 * courtoisie entre amis pour devenir un rempart - et un rempart sans serveur ne
 * tient pas. L'honneur se compte, se lit, entre dans les annales du règne, et c'est
 * tout ce qu'il fait.
 */
export const RANGS: RangDuel[] = [
  { seuil: 0, nom: 'Sans renom', emoji: '🌫️' },
  { seuil: 25, nom: 'Connu des hérauts', emoji: '📜' },
  { seuil: 75, nom: 'Nom que les aèdes chantent', emoji: '🎼' },
  { seuil: 150, nom: 'Terreur de la Troade', emoji: '🔥' },
  { seuil: 300, nom: 'Égal des Atrides', emoji: '👑' },
]

export function rangDe(honneur: number): RangDuel {
  let out = RANGS[0]
  for (const r of RANGS) if (honneur >= r.seuil) out = r
  return out
}

/** ce qu'il reste à gagner pour le rang suivant, ou `null` au sommet */
export function prochainRang(honneur: number): { rang: RangDuel; manque: number } | null {
  const suivant = RANGS.find((r) => r.seuil > honneur)
  return suivant ? { rang: suivant, manque: suivant.seuil - honneur } : null
}

// ── Vérifier un rapport : l'anti-triche ──────────────────────────────────────

export type RefusRapport =
  | 'defi'
  | 'colonne'
  | 'pans'
  | 'inconnue'
  | 'graine'
  | 'deja'
  | 'indecis'
  | 'issue'

/**
 * LE JUGE DU RAPPORT, et le seul endroit du lot où l'honnêteté du système se décide.
 *
 * `rejoue` est l'issue que le client du DÉFENSEUR a obtenue en déroulant lui-même
 * l'assaut (`deroulerRaid`), ou `null` si le déroulé n'a pas conclu. On la reçoit en
 * paramètre au lieu de la calculer ici, et c'est la décision d'architecture de ce
 * fichier : la comparaison - c'est-à-dire la RÈGLE - devient une fonction pure de
 * deux issues, éprouvable sans moteur, sans horloge et sans graine. Le moteur, lui,
 * n'a qu'un seul travail : rendre deux fois la même issue.
 *
 * Les cinq fraudes, et la porte qui se ferme sur chacune :
 *  · un code fabriqué de toutes pièces → `'inconnue'` (aucune carte émise ne porte
 *    cette empreinte) ;
 *  · une carte émise, mais retouchée en chemin pour affaiblir la garnison →
 *    `'inconnue'` aussi, parce que l'empreinte porte sur tout ce qui compte ;
 *  · une graine choisie parmi mille pour trouver celle qui gagne → `'graine'` ;
 *  · une issue simplement inventée → `'issue'`, au champ près ;
 *  · le même rapport appliqué deux fois pour ouvrir deux revanches → `'deja'`.
 */
export function refusRapport(s: SnapDuel, r: RapportRaid, rejoue: IssueRaid | null): RefusRapport | null {
  if (aleaPose()) return 'defi'
  const hommes = hommesDe(r.colonne)
  if (hommes === 0 || hommes > MAX_TROUPES) return 'colonne'
  const pans = pansValides(r.pans)
  if (pans.length === 0) return 'pans'
  const ref = empreinteCarte(r.cible)
  if (!s.duel.cartes.some((c) => c.ref === ref)) return 'inconnue'
  if (r.graine !== graineRaid(ref, r.colonne, pans)) return 'graine'
  if (s.duel.vus.includes(r.graine)) return 'deja'
  if (!rejoue) return 'indecis'
  if (rejoue.victoire !== r.issue.victoire || rejoue.etoiles !== r.issue.etoiles || rejoue.morts !== r.issue.morts) {
    return 'issue'
  }
  return null
}

export function motifRefusRapport(r: RefusRapport): string {
  switch (r) {
    case 'defi':
      return 'On ne juge pas un rapport depuis une partie de défi : rejouer l’assaut consommerait la graine du classement.'
    case 'colonne':
      return `Ce rapport annonce une colonne impossible : de un à ${MAX_TROUPES} hommes, pas davantage.`
    case 'pans':
      return 'Ce rapport n’indique par où l’assaut est venu. On ne juge pas un assaut sans front.'
    case 'inconnue':
      return 'Vous n’avez jamais publié cette carte-là. On ne paie pas un chèque qu’on n’a pas signé.'
    case 'graine':
      return 'La graine ne découle pas de l’assaut décrit : quelqu’un a relancé les dés jusqu’à gagner.'
    case 'deja':
      return 'Ce rapport a déjà été porté au conseil. Une victoire ne se compte qu’une fois.'
    case 'indecis':
      return 'Rejoué chez vous, cet assaut ne s’achève pas. Un combat sans fin ne se juge pas - qu’on vous en renvoie un autre.'
    case 'issue':
      return 'Rejoué chez vous, cet assaut ne donne pas cette issue. Le rapport est refusé.'
  }
}

// ── Ce qu'un rapport accepté change ──────────────────────────────────────────

export interface Consequences {
  /** ce que le défenseur perd, ressource par ressource - jamais plus que la carte */
  pris: Cost
  /** honneur pour le défenseur : positif s'il a tenu, nul s'il est tombé */
  honneur: number
  /** la revanche s'ouvre-t-elle (raid gagné ET riposte lisible) */
  revanche: boolean
  /** pourquoi le butin est nul, s'il l'est - le panneau le dit, sinon il a l'air cassé */
  note: string | null
}

/**
 * Ce qu'un rapport vérifié fait au règne du défenseur.
 *
 * `resources` est l'état COURANT de ses coffres, et il n'y sert qu'à une chose :
 * ne pas prendre ce qui n'est plus là. Le montant vient de la CARTE (décision 3) -
 * l'état courant ne peut que le réduire, jamais l'augmenter.
 */
export function consequences(
  s: SnapDuel,
  r: RapportRaid,
  resources: Record<ResourceId, number>,
): Consequences {
  const ref = empreinteCarte(r.cible)
  const fiche = s.duel.cartes.find((c) => c.ref === ref) ?? null
  if (!r.issue.victoire) {
    return {
      pris: {},
      honneur: honneurDefense(r.issue),
      revanche: false,
      note: 'Votre plan a tenu : rien n’a été emporté, et il n’y a rien à venger.',
    }
  }
  if (fiche?.pille) {
    return {
      pris: {},
      honneur: 0,
      revanche: r.riposte !== null,
      note: 'Cette carte avait déjà été pillée : les greniers qu’elle promettait sont vides depuis.',
    }
  }
  const pris: Cost = {}
  for (const res of ORDRE_RES) {
    /*
     * ⚠️ On lit le butin de la CARTE ÉMISE (`fiche.butin`) avant celui du rapport.
     * Les deux devraient être identiques - l'empreinte porte sur le butin, donc un
     * rapport dont le butin diffère est déjà tombé sur `'inconnue'`. Mais l'ordre de
     * lecture est ce qui rend cette garantie inutile : même si la serrure sautait un
     * jour, le montant resterait celui qu'on a signé.
     */
    const promis = fiche?.butin[res] ?? r.cible.butin[res] ?? 0
    const n = Math.min(promis, Math.max(0, Math.floor(resources[res] ?? 0)))
    if (n > 0) pris[res] = n
  }
  const vide = ORDRE_RES.every((res) => (pris[res] ?? 0) === 0)
  return {
    pris,
    honneur: 0,
    revanche: r.riposte !== null,
    note: vide ? 'Vos coffres étaient vides : ils n’ont rien trouvé à charger.' : null,
  }
}

/**
 * L'état après un rapport accepté. Trois choses y changent, et une quatrième
 * n'y change PAS.
 *
 *  · la graine entre dans `vus` : le même rapport ne s'appliquera plus ;
 *  · la carte est marquée `pille` si le chèque a été encaissé ;
 *  · la revanche s'ouvre, en tête, et la quatrième chasse la plus ancienne ;
 *  · la GARNISON ne bouge pas d'un homme (décision 6). Aucun mur n'est abattu non
 *    plus : `s.wallHp` n'a rien à voir avec cette bataille, elle s'est jouée sur une
 *    image de l'enceinte, pas sur l'enceinte.
 */
export function duelApresRapport(etat: EtatDuel, r: RapportRaid, c: Consequences, jour: number): EtatDuel {
  const ref = empreinteCarte(r.cible)
  const encaisse = ORDRE_RES.some((res) => (c.pris[res] ?? 0) > 0)
  const revanches = [...etat.revanches]
  if (c.revanche && r.riposte) {
    const refRiposte = empreinteCarte(r.riposte)
    const neuve: Revanche = { ref: refRiposte, cite: r.cite, carte: r.riposte, jour, pris: { ...c.pris } }
    // dédoublonnée par empreinte : deux rapports du même agresseur avec la même
    // carte de riposte ne donnent pas deux vengeances sur la même cible
    revanches.unshift(neuve)
    for (let i = revanches.length - 1; i > 0; i--) {
      if (revanches[i].ref === refRiposte) revanches.splice(i, 1)
    }
  }
  return {
    ...etat,
    cartes: etat.cartes.map((f) => (f.ref === ref && encaisse ? { ...f, pille: true } : f)),
    vus: [r.graine, ...etat.vus.filter((g) => g !== r.graine)].slice(0, VUS_MAX),
    revanches: revanches.slice(0, REVANCHES_MAX),
    honneur: Math.max(0, etat.honneur + c.honneur),
  }
}

/** une revanche consommée : on l'a frappée, elle n'est plus due */
export function duelApresRevanche(etat: EtatDuel, ref: string): EtatDuel {
  return { ...etat, revanches: etat.revanches.filter((r) => r.ref !== ref) }
}

// ── Ce que le panneau doit pouvoir dire ──────────────────────────────────────

/**
 * Puissance indicative d'une carte, sur la même échelle que `VillageCible.puissance`
 * (les huit places de la table vont de 25 à 400) : c'est ce qui permet au panneau de
 * dire « cette cité vaut le fort achéen » sans inventer une seconde grandeur.
 *
 * Elle n'entre NULLE PART dans le combat. C'est un chiffre pour l'œil, et il ne doit
 * jamais devenir une entrée du déroulé - sans quoi la moindre retouche de la formule
 * invaliderait tous les rapports en circulation.
 */
export function puissanceCarte(c: CarteDefense): number {
  const troupes = UNIT_IDS.reduce((a, u) => a + (c.garnison[u] ?? 0) * (UNITS[u]?.atk ?? 0), 0)
  const heros = c.heros.reduce((a, h) => a + 12 * h.niveau, 0)
  return Math.round((troupes + heros + c.murHp / 20 + c.tours * 14 + c.redoute * 18) * c.atk)
}

/** la carte en une ligne, pour la liste des cibles */
export function resumeCarte(c: CarteDefense): string {
  const hommes = hommesDe(c.garnison)
  const parts = [
    `🧱 mur ${c.mur}`,
    `👥 ${hommes} homme${hommes > 1 ? 's' : ''}`,
    ...(c.tours > 0 ? [`🏹 ${c.tours} tour${c.tours > 1 ? 's' : ''}`] : []),
    ...(c.redoute > 0 ? [`🛡️ redoute ${c.redoute}`] : []),
    ...(c.heros.length > 0 ? [c.heros.map((h) => HEROS[h.id].emoji).join('')] : []),
  ]
  return `${c.cite} - ${parts.join(' · ')}`
}

/** le plan de la carte, dit comme le bloc des remparts le dit chez soi */
export function resumeDefense(c: CarteDefense): string {
  return resumePlan(c.plan)
}

/** le butin d'une carte, en une ligne lisible : « 120 🌾, 90 🪙 » */
export function resumeButin(b: Cost): string {
  const parts = ORDRE_RES.filter((r) => (b[r] ?? 0) > 0).map((r) => `${b[r]} ${RES[r].emoji}`)
  return parts.length > 0 ? parts.join(', ') : 'rien à prendre'
}

/**
 * Ce que le panneau doit montrer d'une carte publiée : ce qu'elle promet, et si le
 * chèque est encore ouvert. La part du grenier est recalculée pour l'affichage - un
 * joueur qui a doublé son agora depuis doit voir que sa vieille carte n'engage plus
 * grand-chose, et donc comprendre qu'il faut en republier une.
 */
export function ficheCarteEmise(f: CarteEmise, resources: Record<ResourceId, number>): string {
  if (f.pille) return `Carte du jour ${f.jour} - déjà pillée, elle ne promet plus rien.`
  const encore = ORDRE_RES.some((r) => (f.butin[r] ?? 0) > 0 && (resources[r] ?? 0) > 0)
  return encore
    ? `Carte du jour ${f.jour} - en jeu : ${resumeButin(f.butin)}.`
    : `Carte du jour ${f.jour} - vos coffres ne couvrent plus ce qu’elle promet.`
}

/** le plafond du système, dit d'une phrase - à afficher là où l'on publie */
export function promessePublication(resources: Record<ResourceId, number>): string {
  return `Vous mettez en jeu ${resumeButin(butinOffert(resources))}, et pas un grain de plus : une carte est un chèque, et il ne s’encaisse qu’une fois.`
}

/**
 * Le plafond de STOCKAGE, dit en clair pour le panneau : c'est `PART_BUTIN` de ce
 * que l'agora peut tenir, ou `PLAFOND_BUTIN_PAR_RES` si l'agora tient davantage.
 * Utile pour expliquer AVANT de publier ce qu'une carte pourra jamais coûter.
 */
export function plafondButin(agora: number): number {
  return Math.min(Math.floor((STOCKAGE[agora] ?? 0) * PART_BUTIN), PLAFOND_BUTIN_PAR_RES)
}
