import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  ALERTE_LONGUE_MS,
  ALERTE_MS,
  ANCIEN_STORAGE_KEY,
  ASSAUT_MAX_MS,
  ASSAUT_MIN_MS,
  ASSAUTS_DE_GRACE,
  MENACE_PREMIERS_ASSAUTS,
  BASE_PROD,
  BUILDINGS,
  BUILDING_IDS,
  CONSO_POP,
  CONSO_SOLDAT,
  DAY_MS,
  ENEMIES,
  FAVEUR_MAX,
  GODS,
  GOD_IDS,
  METIERS,
  METIERS_DEPART,
  metierManquant,
  MODE_TEST,
  NOMS_VILLAGEOIS,
  OFFLINE_CAP_MS,
  POP_CAP,
  POSTES,
  PREMIER_ASSAUT_MS,
  PROD,
  RENDEMENT_HORS_METIER,
  RES,
  SECTEURS,
  tirerMetier,
  multRelation,
  nbFronts,
  palierFerveur,
  STOCKAGE,
  STORAGE_KEY,
  coutEchange,
  LOT_ECHANGE,
  TOURS_MAX,
  TOUR_COUTS,
  UNITS,
  UNIT_IDS,
  WALL_HP,
  troupes,
} from './data'
import {
  DELAI_ORDRE_MS,
  EFFETS_LIGNE,
  EFFETS_TIR,
  GEO_EXPEDITION,
  GEO_VILLAGE,
  ORDRES_NEUTRES,
  abattreChef,
  abriterSecteur,
  boucherBreche,
  budgetVague,
  fureurHeros,
  creerBataille,
  descVague,
  foudreDeZeus,
  genererVague,
  marqueDivine,
  pertesDefense,
  resoudreHorsLigne,
  sonnerRetraite,
  tailleVague,
  tickBataille,
  uid,
} from './combat'
import { EVENTS, EVENTS_BY_ID, type EffectCtx, type GameSnap } from './events'
import {
  BUTIN_REPETE,
  EXPEDITION_TIMEOUT_MS,
  MAX_TROUPES,
  RAID_COOLDOWN_MS,
  SECOURS_FENETRE_MS,
  TRIBUT_MS,
  VILLAGES_CIBLES,
  VILLAGES_PAR_ID,
  appelsAPortee,
  assiegeants,
  garnisonEffective,
  puissanceAssiegeants,
  renfortsDe,
  tributDe,
  type Intention,
  type VillageCible,
} from './expeditions'
import {
  BONUS_NEUTRE,
  HEROS,
  HERO_CONVALESCENCE_MS,
  HERO_IDS,
  NIVEAU_MAX,
  XP_ASSAUT_REPOUSSE,
  XP_EXPEDITION,
  XP_PAR_ETOILE,
  cumulerPassifs,
  entretienTotal,
  etatHeroInitial,
  forceNiveau,
  noeudMur,
  peutMonter,
  xpRequise,
  type BonusHeros,
  type HeroId,
  type HeroState,
} from './heros'
import { MAX_RELEVES, PAS_RELEVE_MS, type Releve } from './annales'
import { CHAMPION_PAR_ID, chanceChampion, ficheChampion, tirerChampion } from './champions'
import {
  COUT_PILLAGE,
  COUT_PILLAGE_VOISINS,
  COUT_TRAHISON_VOISINS,
  GAIN_PRESENT,
  GAIN_SECOURS,
  GAIN_SECOURS_VOISINS,
  MULT_TRIBUT_MARIAGE,
  PARDON_PAR_JOUR,
  RELATION_NEUTRE,
  SEUIL_MARIAGE,
  SEUIL_PACTE,
  SEUIL_RUPTURE,
  borner,
  coutMariage,
  coutPacte,
  coutPresent,
  menaceDiplomatique,
  statutVillage,
  type StatutVillage,
} from './diplomatie'
import { GRACE_PAR_ID, cumulerFaveurs, dieuDe, graceSuivante, type BonusFaveurs } from './faveurs'
import {
  ageDe,
  estAdulte,
  foyersFeconds,
  ligneeLibre,
  metierTransmis,
  rendementAge,
  risqueDeMort,
  trouverParti,
} from './lignees'
import { HAUTS_FAITS, detailPrestige, prestige, titrePrestige, type SnapHautFait } from './hautsfaits'
import { MISSIONS_PAR_ID, missionsActives, rangMission } from './missions'
import { ACTES_CAMPAGNE, NB_ACTES, acteAccompli, type EtatActe } from './campagne'
import { cleEmplacement, emplacementActif, poserEmplacementActif } from './sauvegardes'
import { NB_ETAPES, type SnapTuto } from './tutoriel'
import {
  BONUS_ORAGE_ZEUS,
  DUREE_METEO_MS,
  JOURS_PAR_SAISON,
  METEOS,
  PORT_HIVER,
  SAISONS,
  SAISON_IDS,
  modsBataille,
  multProduction,
  saisonDe,
  tirerMeteo,
  type MeteoId,
  type SaisonId,
} from './saisons'
import type {
  ActiveEvent,
  Alliance,
  BattleState,
  BuildingId,
  BuildingState,
  EnemyId,
  EtatExpedition,
  GodId,
  GodState,
  MoraleModifier,
  PendingEffect,
  RecruitJob,
  Report,
  OrdreLigne,
  OrdreTir,
  OrdresBataille,
  ResourceId,
  Toast,
  UnitId,
  Villageois,
  WaveUnit,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
export interface RecompenseDef {
  bronze: number
  faveur: number
  /** +25 % si l'assaut a été déclenché volontairement */
  bonus: boolean
}

export interface ExpeditionEnCours {
  villageId: string
  /** piller ou secourir : deux façons de marcher, deux façons d'en revenir */
  intention: Intention
  envoyes: Record<UnitId, number>
  wallHp: number
  battle: BattleState
  result: { victoire: boolean; etoiles: number; lignes: string[] } | null
}

/**
 * Avancement dans la campagne. Les compteurs d'un acte sont des DIFFÉRENCES : on
 * fige à l'ouverture de l'acte ce que le règne comptait déjà, et l'acte ne mesure
 * que ce qui s'est passé depuis. Sans cela, « repoussez trois assauts » serait
 * accompli d'avance par un joueur qui en a repoussé vingt aux actes précédents.
 */
export interface EtatCampagne {
  /** index dans ACTES_CAMPAGNE */
  acte: number
  debutActe: number
  /** état des compteurs du règne au premier matin de l'acte */
  base: { repousses: number; perdus: number; evenements: number; exploits: Record<string, number> }
  /** le prologue a été lu : on ne le remontre pas à chaque rechargement */
  prologueVu: boolean
  /**
   * Objectifs déjà FRANCHIS, par id. Ils sont verrouillés : un objectif accompli
   * ne doit pas être défait par la conséquence du suivant. Le premier acte le
   * montrait cruellement - « levez trois soldats » repassait à 2/3 dès qu'un
   * lancier tombait pendant l'assaut que le même acte demande de repousser, et
   * l'acte ne s'achevait jamais.
   */
  objectifsFaits: string[]
  /** tous les objectifs obligatoires sont franchis - l'épilogue attend */
  accompli: boolean
  /** condition de défaite atteinte : l'acte est à reprendre */
  perdu: boolean
  /** les cinq actes sont derrière nous */
  fini: boolean
}

export interface GameState {
  // persistant
  createdAt: number
  lastSeen: number
  resources: Record<ResourceId, number>
  faveur: number
  pop: number
  nextPopAt: number
  buildings: Record<BuildingId, BuildingState>
  /** les habitants, nommés et affectables à un métier */
  villageois: Villageois[]
  wallHp: number
  /** tours d'archers bâties sur l'enceinte */
  tours: number
  /** angles des pans effondrés lors du dernier assaut - visibles jusqu'à réparation */
  brechesMur: number[]
  army: Record<UnitId, number>
  recruitQueue: RecruitJob[]
  moraleMods: MoraleModifier[]
  morale: number
  gods: Record<GodId, GodState>
  threatMod: number
  threat: number
  nextAttackAt: number
  warned: boolean
  incomingWave: WaveUnit[] | null
  defRecompense: RecompenseDef | null
  eventCooldowns: Record<string, number>
  lastEventAt: number
  activeEvent: ActiveEvent | null
  eventOutcome: string[] | null
  pendingEffects: PendingEffect[]
  reports: Report[]
  stats: { repousses: number; perdus: number; evenements: number }
  expeditions: Record<string, EtatExpedition>
  tutorialDone: boolean
  droughtUntil: number
  aresBoostUntil: number
  nextDesertAt: number
  /** vitesse du jeu façon Sims (1/2/4/8) - forcée à ×1 pendant les batailles */
  vitesse: number
  /** missions dont la récompense a été réclamée */
  missionsReclamees: string[]
  /** saison en cours - déduite du jour, mémorisée pour détecter le basculement */
  saison: SaisonId
  meteo: MeteoId
  /** instant du prochain tirage de météo */
  meteoJusqua: number
  /** les héros de la matière troyenne, recrutés ou non */
  heros: Record<HeroId, HeroState>
  /** prochain rappel d'entretien impayé */
  rappelHerosAt: number
  /** secteurs que la vague qui vient va assaillir (révélés par Ulysse) */
  incomingFronts: string[] | null
  /**
   * Le champion achéen qui mènera la vague annoncée, s'il y en a un. Tiré dès
   * l'alerte : les éclaireurs reconnaissent un nom de loin, et le joueur doit
   * pouvoir s'y préparer plutôt que le découvrir à la première épée.
   */
  incomingChampion: HeroId | null
  /** ruse d'Ulysse armée : la prochaine expédition entre sans donner un coup de bélier */
  siegeGratuit: boolean
  /** part des troupes qu'Énée ramènera d'une défaite (0 = capacité non armée) */
  sauverTroupes: number
  /** un héros attend votre parole : nœud d'arc ouvert */
  arcHeros: { heros: HeroId; noeud: string } | null
  /** récit de l'issue, une fois le choix tranché */
  arcIssue: string[] | null
  /** un village assiégé appelle à l'aide - la fenêtre se referme vite */
  appelSecours: { villageId: string; expireAt: number } | null
  /** instant du prochain appel possible */
  prochainAppelAt: number
  /** villages sauvés devenus alliés : tribut régulier et renforts aux remparts */
  alliances: Record<string, Alliance>
  /**
   * Ce que chacune des huit places fortes pense de vous (−100…+100). Ce n'était
   * qu'un compteur de pillages : piller Ténédos ne changeait rien à ce que
   * pensait Lesbos, et une alliance nouée ne pouvait plus se défaire.
   */
  relations: Record<string, number>
  /** hauts faits acquis - une fois gagnés, jamais repris */
  hautsFaits: string[]
  /**
   * Les annales : un relevé chiffré toutes les trente secondes. C'est la seule
   * mémoire QUANTITATIVE du règne - le journal, lui, ne raconte que des faits.
   */
  annales: Releve[]
  /** instant du prochain relevé */
  prochainReleveAt: number
  /**
   * Dernière journée de jeu dont les familles ont vu passer les noces et les
   * enterrements. Le calendrier n'avait aucun crochet « le jour a tourné » :
   * celui-ci en tient lieu, et il se sauvegarde pour qu'une absence de six heures
   * ne déclenche pas six heures de mariages au réveil.
   */
  dernierJourVecu: number
  /** compteurs de faits ponctuels que l'état seul ne raconte pas */
  exploits: Record<string, number>
  /** écran de fin de règne, ouvert par l'abdication */
  finDePartie: { score: number; titre: string; desc: string; lignes: string[] } | null
  /** étape courante de la leçon de Zeus - null = pas de tutoriel en cours */
  tutoriel: number | null
  /**
   * Comment on joue. `null` = on ne le sait pas encore, l'écran de choix s'ouvre.
   * Une sauvegarde antérieure à la campagne est forcément un bac à sable.
   */
  mode: 'bac-a-sable' | 'campagne' | null
  /** avancement dans « La Chute » - null hors campagne */
  campagne: EtatCampagne | null
  /**
   * Grâces achetées dans l'arbre de faveur, par id. Elles sont ACQUISES : le prix
   * a été versé en points de relation, la relation peut retomber, le don reste.
   */
  graces: string[]

  // runtime (non sauvegardé)
  /** missions déjà signalées « prêtes » (toast unique) */
  missionsNotifiees: string[]
  battle: BattleState | null
  /** renforts alliés engagés dans la bataille en cours : ils tombent avant les vôtres */
  renfortsEngages: Record<UnitId, number> | null
  expedition: ExpeditionEnCours | null
  battleReport: Report | null
  /** salve de victoire à jouer par-dessus la scène (runtime, éphémère) */
  victoire: { at: number; type: 'defense' | 'expedition'; etoiles: number; detail: string } | null
  offlineSummary: string[] | null
  toasts: Toast[]
  selected: BuildingId | null
  panel:
    | 'pantheon'
    | 'journal'
    | 'aide'
    | 'expeditions'
    | 'heros'
    | 'hauts-faits'
    | 'missions'
    | 'campagne'
    | 'sauvegardes'
    | 'annales'
    | null
  /**
   * Recensement des habitants ouvert. C'est de l'affichage pur, mais il vit
   * dans le store et non dans le HUD : le tutoriel doit pouvoir le refermer
   * entre deux étapes, sinon il reste en travers de la cible suivante.
   */
  popOuvert: boolean

  // actions
  init: () => void
  tick: () => void
  upgrade: (b: BuildingId) => void
  recruter: (u: UnitId, n: number) => void
  reparerRemparts: () => void
  construireTour: () => void
  affecter: (villageoisId: string, poste: BuildingId | null) => void
  /** pourvoit d'un coup tous les postes libres avec les villageois oisifs */
  echanger: (donner: ResourceId, recevoir: ResourceId) => void
  sacrifier: (g: GodId) => void
  benir: (g: GodId) => void
  /** verser des points de relation contre une grâce permanente */
  acquerirGrace: (id: string) => void
  /** changer la posture de la ligne ou la façon de tirer, pendant la bataille */
  donnerOrdre: (quoi: 'ligne' | 'tir', valeur: OrdreLigne | OrdreTir) => void
  /** affecter un type d'unité à un secteur de l'enceinte (null = au plus pressé) */
  assignerSecteur: (u: UnitId, secteur: number | null) => void
  /** porter un présent à une place forte : cela rachète une rancune */
  offrirPresent: (villageId: string) => void
  /** acheter une alliance à qui vous voit déjà d'un bon œil */
  proposerPacte: (villageId: string) => void
  /** donner un habitant en mariage : une alliance que rien ne dénoue */
  scellerMariage: (villageId: string, villageoisId: string) => void
  recruterHeros: (h: HeroId) => void
  capaciteHeros: (h: HeroId) => void
  choisirArc: (i: number) => void
  fermerArc: () => void
  choisirEvenement: (i: number) => void
  fermerEvenement: () => void
  lancerMaintenant: () => void
  lancerExpedition: (villageId: string, troupes: Record<UnitId, number>, intention?: Intention) => void
  ignorerSecours: () => void
  abdiquer: () => void
  fermerFin: () => void
  demarrerTutoriel: () => void
  etapeTutoSuivante: () => void
  arreterTutoriel: () => void
  retraiteExpedition: () => void
  fermerExpedition: () => void
  attaqueTest: () => void
  setVitesse: (v: number) => void
  reclamerMission: (id: string) => void
  /** conduit le joueur là où la mission se joue : bâtiment, recensement, panneau */
  allerAMission: (id: string) => void
  /** choisit le mode de jeu au premier lancement */
  choisirMode: (m: 'bac-a-sable' | 'campagne') => void
  /** le prologue est lu : le compte à rebours du premier assaut démarre */
  commencerActe: () => void
  /** l'épilogue est lu : on enchaîne sur l'acte suivant, ou l'on clôt la campagne */
  acteSuivant: () => void
  /** reprendre l'acte perdu depuis son premier matin */
  rejouerActe: () => void
  /** range la partie en cours et ouvre celle d'un autre emplacement */
  changerEmplacement: (i: number) => void
  select: (b: BuildingId | null) => void
  openPanel: (p: GameState['panel']) => void
  ouvrirRecensement: (v: boolean) => void
  fermerOffline: () => void
  fermerBattleReport: () => void
  fermerVictoire: () => void
  save: () => void
  reset: () => void
}

// ── Helpers purs (exportés pour l'UI) ────────────────────────────────────────
export function stockageMax(s: Pick<GameState, 'buildings'>): number {
  return STOCKAGE[s.buildings.agora.level] ?? STOCKAGE[1]
}
export function popCap(s: Pick<GameState, 'buildings'>): number {
  return POP_CAP[s.buildings.maisons.level]
}
export function armeeTotale(army: Record<UnitId, number>): number {
  return UNIT_IDS.reduce((a, u) => a + army[u], 0)
}
export function multMorale(morale: number): number {
  return 0.5 + (morale / 100) * 0.75
}

// ── Postes de travail ────────────────────────────────────────────────────────
/** nombre de postes offerts par un bâtiment à son niveau actuel */
export function postesTotal(s: Pick<GameState, 'buildings'>, b: BuildingId): number {
  return POSTES[b]?.[s.buildings[b].level] ?? 0
}
/** villageois actuellement au travail dans ce bâtiment */
export function postesPourvus(s: Pick<GameState, 'villageois'>, b: BuildingId): number {
  return s.villageois.filter((v) => v.poste === b).length
}
/**
 * Rendement d'un bâtiment (0…1). Ce n'est plus un simple compte de têtes :
 * chaque villageois vaut 1 à SON métier, et RENDEMENT_HORS_METIER ailleurs.
 * Une carrière tenue par deux paysans tourne donc moins bien qu'une carrière
 * tenue par deux tailleurs de pierre - c'est tout l'intérêt d'affecter soi-même.
 */
export function rendement(
  s: Pick<GameState, 'buildings' | 'villageois'> & Partial<Pick<GameState, 'lastSeen' | 'createdAt'>>,
  b: BuildingId,
): number {
  const total = postesTotal(s, b)
  if (total <= 0) return 0
  /*
   * L'âge compte désormais autant que le métier : un enfant aide sans remplacer,
   * un ancien a tout appris mais n'a plus les bras. Sans calendrier sous la main
   * (un test, un instantané), on lit tout le monde comme adulte plutôt que de
   * renvoyer un rendement faux.
   */
  const jour =
    s.lastSeen !== undefined && s.createdAt !== undefined
      ? jourDe({ lastSeen: s.lastSeen, createdAt: s.createdAt })
      : 9999
  const force = s.villageois.filter((v) => v.poste === b).reduce((a, v) => a + efficaciteDe(v, jour), 0)
  return Math.min(1, force / total)
}
/** villageois de ce métier qui ne sont affectés nulle part - les meilleurs candidats */
export function candidatsPour(s: Pick<GameState, 'villageois'>, b: BuildingId): Villageois[] {
  const libres = s.villageois.filter((v) => v.poste === null)
  // le bon métier d'abord, les bonnes volontés ensuite
  return [...libres].sort((x, y) => Number(y.metier === b) - Number(x.metier === b))
}
/** villageois sans emploi - ceux qu'on peut enrôler ou affecter */
export function oisifs(s: Pick<GameState, 'villageois'>): Villageois[] {
  return s.villageois.filter((v) => v.poste === null)
}
/** bâtiments qui offrent des postes (dans l'ordre de la carte) */
export const BATIMENTS_A_POSTES = BUILDING_IDS.filter((b) => POSTES[b] !== undefined)

/** nom du métier de naissance d'un villageois */
export function metierDe(v: Villageois): string {
  return METIERS[v.metier] ?? BUILDINGS[v.metier].nom
}

/**
 * Ce que ce villageois rend à son poste : plein à son métier, moins ailleurs -
 * et le tout pondéré par son ÂGE. Un enfant aide sans remplacer, un ancien a
 * tout appris mais n'a plus les bras. C'est ce qui fait de la pyramide des âges
 * une donnée du village, et non un ornement d'état civil.
 */
export function efficaciteDe(v: Villageois, jour = 9999): number {
  if (v.poste === null) return 0
  return (v.poste === v.metier ? 1 : RENDEMENT_HORS_METIER) * rendementAge(ageDe(v, jour))
}

/**
 * Réaligne la liste des villageois sur `pop` (source de vérité numérique
 * utilisée par les événements, les missions et le recrutement).
 * Idempotent : appelé à chaque tick, il ne fait rien si tout concorde.
 */
function syncVillageois(s: GameState): void {
  const jour = jourDe(s)
  while (s.villageois.length < s.pop) {
    const utilises = new Set(s.villageois.map((v) => v.nom))
    const libres = NOMS_VILLAGEOIS.filter((n) => !utilises.has(n))
    const nom = libres.length > 0 ? libres[Math.floor(Math.random() * libres.length)] : `Habitant ${s.villageois.length + 1}`
    /*
     * Chacun naît avec un métier - et la fournée de départ est écrite d'avance :
     * un homme de chaque métier, plus un second paysan. Ensuite, chaque naissance
     * comble le plus grand manque. Le tirage purement aléatoire donnait des
     * villages à quatre paysans sans un seul prêtre : la faveur ne montait pas
     * et le joueur n'y pouvait rien.
     */
    const i = s.villageois.length
    const manquant = metierManquant(s.villageois.map((v) => v.metier))
    if (i < METIERS_DEPART.length) {
      /*
       * Les fondateurs. Tous adultes - un village qui naîtrait avec quatre
       * nourrissons serait injouable - et d'âges échelonnés, pour qu'ils ne
       * meurent pas tous le même jour trois heures plus tard.
       */
      s.villageois.push({
        id: uid('v'),
        nom,
        poste: null,
        metier: METIERS_DEPART[i],
        neLe: jour - (10 + i * 2.5),
        lignee: ligneeLibre(
          s.villageois.map((v) => v.lignee ?? ''),
          Math.random(),
        ),
      })
      continue
    }
    /*
     * Ensuite, deux façons de gagner un habitant, et elles ne se valent pas :
     *
     *  · un FOYER a un enfant. L'enfant porte la maison de son parent, apprend le
     *    métier de son père ou de sa mère, et met huit journées à devenir utile ;
     *  · à défaut de foyer, quelqu'un ARRIVE de la côte, adulte et avec le métier
     *    qui manque. C'est plus commode, mais on ne le choisit pas.
     *
     * Marier son forgeron, c'est donc se donner des forgerons. Le laisser mourir
     * célibataire, c'est perdre la forge avec lui.
     */
    const foyers = foyersFeconds(s.villageois, jour)
    const foyer = foyers.length > 0 ? foyers[Math.floor(Math.random() * foyers.length)] : null
    const conjoint = foyer ? s.villageois.find((v) => v.id === foyer.conjoint) : undefined
    if (foyer && conjoint) {
      s.villageois.push({
        id: uid('v'),
        nom,
        poste: null,
        metier: metierTransmis(foyer.metier, conjoint.metier, manquant, Math.random()),
        neLe: jour,
        lignee: foyer.lignee,
        parents: [foyer.nom, conjoint.nom],
      })
      pushToast(s, '👶', `${nom} naît chez les ${foyer.lignee} - ${foyer.nom} et ${conjoint.nom}.`)
    } else {
      s.villageois.push({
        id: uid('v'),
        nom,
        poste: null,
        metier: manquant,
        // un nouveau venu a déjà vécu : il arrive adulte, avec son métier appris
        neLe: jour - (9 + Math.random() * 8),
        lignee: ligneeLibre(
          s.villageois.map((v) => v.lignee ?? ''),
          Math.random(),
        ),
      })
    }
  }
  while (s.villageois.length > s.pop) {
    // on retire d'abord les oisifs : un artisan ne disparaît qu'en dernier
    const i = s.villageois.findIndex((v) => v.poste === null)
    const [parti] = s.villageois.splice(i >= 0 ? i : s.villageois.length - 1, 1)
    if (parti) veuvage(s, parti)
  }
  // un poste supprimé par une rétrogradation libère son occupant
  for (const v of s.villageois) {
    if (v.poste && postesPourvus(s, v.poste) > postesTotal(s, v.poste)) {
      const trop = postesPourvus(s, v.poste) - postesTotal(s, v.poste)
      if (trop > 0) v.poste = null
    }
  }
}

/** son conjoint le pleure et redevient libre - un veuf peut se remarier */
function veuvage(s: GameState, parti: Villageois): void {
  if (!parti.conjoint) return
  const reste = s.villageois.find((v) => v.id === parti.conjoint)
  if (reste) delete reste.conjoint
}

/**
 * Ce que le calendrier fait aux familles, une fois par journée de jeu : on marie
 * ceux qui peuvent l'être, et l'on enterre ceux que l'âge emporte.
 *
 * Le mariage n'est pas décoratif - sans foyer, un village ne fait pas d'enfants
 * et ne peut compter que sur des arrivants dont il ne choisit pas le métier.
 */
function vieDesFamilles(s: GameState, jour: number): void {
  /*
   * Les rancunes s'émoussent. Sans cela, un seul raid de la première heure
   * condamnerait le règne entier à la haine de la Troade : on veut que piller
   * coûte, pas que ce soit sans retour.
   */
  for (const v of VILLAGES_CIBLES) {
    const r = relationVillage(s, v.id)
    if (r < 0) s.relations[v.id] = borner(Math.min(0, r + PARDON_PAR_JOUR))
  }
  verifierAlliances(s, s.lastSeen)

  // ── on marie, deux foyers par journée au plus : une noce reste un événement ──
  for (let n = 0; n < 2; n++) {
    const parti = trouverParti(s.villageois, jour)
    if (!parti) break
    const [a, b] = parti
    a.conjoint = b.id
    b.conjoint = a.id
    // la femme entre dans la maison de l'époux : une seule lignée par foyer
    b.lignee = a.lignee
    pushToast(s, '💍', `${a.nom} et ${b.nom} font foyer chez les ${a.lignee}.`)
    noter(s, 'mariages')
  }

  // ── puis l'âge emporte les siens ──
  for (const v of [...s.villageois]) {
    const age = ageDe(v, jour)
    if (Math.random() >= risqueDeMort(age)) continue
    s.villageois = s.villageois.filter((x) => x.id !== v.id)
    s.pop = Math.max(0, s.pop - 1)
    veuvage(s, v)
    noter(s, 'anciensEnterres')
    pushReport(s, '⚱️', `${v.nom} des ${v.lignee ?? 'sans maison'} s’est éteint`, [
      `${v.nom} est mort à ${age} ans, ${v.poste ? `à son poste (${BUILDINGS[v.poste].nom})` : 'sans emploi'}.`,
      `Son métier - ${METIERS[v.metier] ?? BUILDINGS[v.metier].nom} - ne se transmet plus que par ses enfants.`,
    ])
  }
}
/**
 * L'hiver ferme la mer : plus une nef ne quitte le port. Sauf si l'Ébranleur du
 * sol a promis le contraire - « Mer ouverte » lève la saison morte du port.
 */
export function merFermee(s: Pick<GameState, 'saison'> & { graces?: string[] }): boolean {
  if (!SAISONS[s.saison].merFermee) return false
  return !bonusFaveurs(s).merOuverte
}

/** jour de jeu en cours (1 = jour de la fondation) */
export function jourDe(s: Pick<GameState, 'lastSeen' | 'createdAt'>): number {
  return Math.floor((s.lastSeen - s.createdAt) / DAY_MS) + 1
}

/**
 * Production brute par minute : ateliers au prorata de leurs postes tenus,
 * ambiance du village, puis saison et ciel du jour. Source de vérité unique
 * pour le tick, l'affichage du HUD et la résolution hors-ligne.
 */
export function productionParMinute(s: GameState, now: number): Record<ResourceId, number> {
  const m = multMorale(s.morale)
  const drought = now < s.droughtUntil ? 0.5 : 1
  const rd = (b: BuildingId) => rendement(s, b)
  const ciel = (r: ResourceId) => multProduction(s.saison, s.meteo, r)
  // l'hiver ferme la mer : les navires marchands restent au mouillage - sauf si
  // Poséidon a rendu la mer navigable, et alors le port tourne à plein en janvier
  const port = PROD.port[s.buildings.port.level] * rd('port') * (merFermee(s) ? PORT_HIVER : 1)
  // Zeus Xenios veille sur les greniers : sa grâce grossit toutes les récoltes
  const zx = 1 + bonusFaveurs(s).recoltePct
  return {
    bois: (BASE_PROD.bois + PROD.scierie[s.buildings.scierie.level] * rd('scierie')) * m * ciel('bois') * zx,
    pierre: (BASE_PROD.pierre + PROD.carriere[s.buildings.carriere.level] * rd('carriere')) * m * ciel('pierre') * zx,
    grain: (BASE_PROD.grain + PROD.ferme[s.buildings.ferme.level] * rd('ferme') * drought) * m * ciel('grain') * zx,
    bronze: (BASE_PROD.bronze + PROD.forge[s.buildings.forge.level] * rd('forge') + port) * m * ciel('bronze') * zx,
  }
}

/** production nette par minute pour l'affichage (production − consommation) */
export function tauxParMinute(s: GameState): Record<ResourceId, number> {
  const brut = productionParMinute(s, s.lastSeen)
  return {
    ...brut,
    grain: brut.grain - s.pop * CONSO_POP - armeeTotale(s.army) * CONSO_SOLDAT,
  }
}
// ── Héros ────────────────────────────────────────────────────────────────────
/** passifs cumulés des héros vivants et présents */
export function bonusHeros(s: Pick<GameState, 'heros'>): BonusHeros {
  return s.heros ? cumulerPassifs(s.heros) : BONUS_NEUTRE
}

/** points de structure maximaux de l'enceinte - Hector l'épaissit, Poséidon aussi */
export function murMax(s: Pick<GameState, 'buildings' | 'heros' | 'graces'>): number {
  return Math.round(WALL_HP[s.buildings.remparts.level] * (1 + bonusHeros(s).wallHpPct + bonusFaveurs(s).murPct))
}

/**
 * Relation réellement pesée par un dieu : l'orgueil d'Agamemnon retranche dix
 * points à chaque Olympien tant qu'il siège à votre table.
 */
export function relationEffective(s: Pick<GameState, 'gods' | 'heros'>, g: GodId): number {
  return Math.max(-100, Math.min(100, s.gods[g].relation + bonusHeros(s).relationTous))
}

export interface ConditionHero {
  txt: string
  ok: boolean
}

/** ce que la cité doit prouver pour qu'un héros daigne s'y arrêter */
export function conditionsHeros(s: GameState, h: HeroId): ConditionHero[] {
  const r = HEROS[h].requiert
  const out: ConditionHero[] = []
  if (r.batiment) {
    out.push({
      txt: `${BUILDINGS[r.batiment.id].nom} niveau ${r.batiment.niveau}`,
      ok: s.buildings[r.batiment.id].level >= r.batiment.niveau,
    })
  }
  if (r.armee !== undefined) {
    out.push({ txt: `${r.armee} soldats sous les armes`, ok: armeeTotale(s.army) >= r.armee })
  }
  if (r.relation) {
    out.push({
      txt: `Relation ${GODS[r.relation.dieu].nom} ≥ ${r.relation.min}`,
      ok: s.gods[r.relation.dieu].relation >= r.relation.min,
    })
  }
  if (r.morale !== undefined) out.push({ txt: `Ambiance ≥ ${r.morale}`, ok: s.morale >= r.morale })
  if (r.assautsRepousses !== undefined) {
    out.push({ txt: `${r.assautsRepousses} assauts repoussés`, ok: s.stats.repousses >= r.assautsRepousses })
  }
  if (r.etoiles !== undefined) {
    out.push({ txt: `${r.etoiles} ★ gagnées en expédition`, ok: totalEtoiles(s.expeditions) >= r.etoiles })
  }
  return out
}

export function herosDisponible(s: GameState, h: HeroId): boolean {
  const e = s.heros[h]
  return !!e && !e.recrute && !e.mort && conditionsHeros(s, h).every((c) => c.ok)
}

/** héros présents et vivants, dans l'ordre du panthéon */
export function herosActifs(s: Pick<GameState, 'heros'>): HeroId[] {
  return HERO_IDS.filter((h) => s.heros?.[h]?.recrute && !s.heros[h].mort)
}

/** entretien dû chaque minute, pour l'affichage - Arès nourrit les braves à moindre frais */
export function entretienHeros(s: Pick<GameState, 'heros' | 'graces'>): { grain: number; faveur: number } {
  if (!s.heros) return { grain: 0, faveur: 0 }
  const brut = entretienTotal(s.heros)
  const remise = 1 - bonusFaveurs(s).entretienPct
  return { grain: brut.grain * remise, faveur: brut.faveur * remise }
}

/**
 * Grâces cumulées de l'arbre de faveur. Appelée dans des chemins chauds (le tick,
 * le HUD) : on garde le dernier tableau lu en cache, car les grâces changent une
 * douzaine de fois dans un règne et jamais entre deux images.
 */
const SANS_GRACE: string[] = []
let cacheGraces: { cle: string[]; val: BonusFaveurs } | null = null
export function bonusFaveurs(s: { graces?: string[] }): BonusFaveurs {
  const g = s.graces ?? SANS_GRACE
  if (cacheGraces && cacheGraces.cle === g) return cacheGraces.val
  const val = cumulerFaveurs(g)
  cacheGraces = { cle: g, val }
  return val
}

/** grâce déjà versée ? */
export function aGrace(s: Pick<GameState, 'graces'>, id: string): boolean {
  return (s.graces ?? []).includes(id)
}

export function coutBenediction(s: Pick<GameState, 'buildings' | 'graces'>, g: GodId): number {
  const base = GODS[g].benediction.cout
  const brut = s.buildings.temple.level >= 4 ? base * 0.75 : base
  // « Le bras du roi » : Zeus fait baisser le prix de TOUTES les bénédictions
  return Math.max(5, Math.round(brut * (1 - bonusFaveurs(s).remisePct)))
}
/**
 * Ferveur : puissance des bénédictions du dieu, de ×0.4 (maudit) à ×1.6 (élu).
 * La jauge de relation devient ainsi le vrai levier du panthéon.
 */
export function ferveur(s: Pick<GameState, 'gods' | 'heros'>, g: GodId): number {
  return multRelation(relationEffective(s, g))
}
export function fmtDuree(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(s / 60)
  return m > 0 ? `${m} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`
}
export function etoilesPour(mortsTotal: number, envoyesTotal: number): number {
  const ratio = envoyesTotal > 0 ? mortsTotal / envoyesTotal : 1
  return ratio < 0.2 ? 3 : ratio < 0.5 ? 2 : 1
}

function calcMorale(s: GameState, now: number): number {
  let m = 50 + s.buildings.agora.level * 2 + s.buildings.temple.level
  for (const mod of s.moraleMods) if (mod.expiresAt === null || mod.expiresAt > now) m += mod.delta
  if (s.resources.grain <= 0) m -= 20 // famine
  return Math.max(0, Math.min(100, m))
}

function calcThreat(s: GameState, now: number): number {
  /*
   * EN CAMPAGNE, la menace est ÉCRITE, pas émergente. Chaque acte annonce la
   * sienne, calculée par son auteur pour que ses objectifs soient tenables -
   * l'acte I promet une bande qui « tâte le terrain », le V une colonne qui se
   * scinde en trois fronts. La formule du bac à sable, qui monte avec les
   * bâtiments et les minutes, écrasait cette valeur dès le premier battement : un
   * acte ne pouvait pas doser sa propre difficulté, et le premier assaut du
   * premier acte arrivait à dix pillards contre trois lanciers.
   *
   * `threatMod` continue de jouer : un pillage l'alourdit, un assaut repoussé
   * l'allège. Ce que le joueur fait compte encore, à l'intérieur de l'acte.
   */
  if (s.campagne && !s.campagne.fini) {
    const acte = ACTES_CAMPAGNE[s.campagne.acte]
    if (acte) return Math.max(5, Math.min(100, acte.menace.threat + s.threatMod))
  }
  const niveaux = BUILDING_IDS.reduce((a, b) => a + s.buildings[b].level, 0)
  const minutes = (now - s.createdAt) / 60_000
  /*
   * Chaque tour d'archers attire la convoitise, et chaque village de la Troade
   * que l'on s'est mis à dos arme contre nous. La diplomatie a donc un prix
   * MESURABLE : piller les huit places fortes, c'est doubler la taille des vagues
   * qui viennent, sans qu'on ait rien bâti de plus.
   */
  const brute = Math.max(
    5,
    Math.min(
      100,
      8 + niveaux * 1.2 + s.tours * 4 + minutes * 0.15 + s.threatMod + menaceDiplomatique(s.relations ?? {}),
    ),
  )
  /*
   * Grâce des premiers assauts. Un village sans mur ni garnison ne doit pas
   * recevoir cinq pillards à la septième minute : les deux premières bandes tâtent
   * le terrain, et c'est ce que le jeu promet depuis son premier écran.
   */
  const assauts = s.stats.repousses + s.stats.perdus
  return assauts < ASSAUTS_DE_GRACE ? Math.min(brute, MENACE_PREMIERS_ASSAUTS) : brute
}

function clampRes(s: GameState, _res: ResourceId, val: number): number {
  return Math.max(0, Math.min(stockageMax(s), val))
}

function payer(s: GameState, cout: Partial<Record<ResourceId, number>>): boolean {
  if (MODE_TEST) return true
  for (const [r, n] of Object.entries(cout) as [ResourceId, number][]) {
    if (s.resources[r] < n) return false
  }
  for (const [r, n] of Object.entries(cout) as [ResourceId, number][]) s.resources[r] -= n
  return true
}
export function peutPayer(
  resources: Record<ResourceId, number>,
  cout: Partial<Record<ResourceId, number>>,
): boolean {
  if (MODE_TEST) return true
  return (Object.entries(cout) as [ResourceId, number][]).every(([r, n]) => resources[r] >= n)
}

function pushToast(s: GameState, emoji: string, msg: string): void {
  s.toasts.push({ id: uid('t'), emoji, msg, until: Date.now() + 6000 })
  if (s.toasts.length > 5) s.toasts.shift()
}

/**
 * La bataille où le joueur a des hommes engagés : la défense du village, ou son
 * expédition tant qu'elle n'est pas résolue. Les ordres valent pour les deux -
 * ce sont les mêmes soldats, et ils obéissent des deux côtés de la plaine.
 */
function batailleDuJoueur(s: GameState): BattleState | null {
  if (s.battle) return s.battle
  return s.expedition && !s.expedition.result ? s.expedition.battle : null
}

/** les ordres d'une bataille, posés à la neutralité au premier appel */
function ordresDe(b: BattleState): OrdresBataille {
  if (!b.ordres) b.ordres = { ...ORDRES_NEUTRES, secteurs: {} }
  return b.ordres
}

function pushReport(s: GameState, emoji: string, titre: string, lignes: string[]): Report {
  const r: Report = { id: uid('r'), at: Date.now(), emoji, titre, lignes }
  s.reports.unshift(r)
  if (s.reports.length > 30) s.reports.pop()
  return r
}

function retirerSoldats(s: GameState, n: number): number {
  let retire = 0
  for (let i = 0; i < n; i++) {
    const pool = UNIT_IDS.filter((u) => s.army[u] > 0)
    if (pool.length === 0) break
    const u = pool[Math.floor(Math.random() * pool.length)]
    s.army[u]--
    retire++
  }
  return retire
}

function volerPct(s: GameState, p: number, quoi?: ResourceId[]): string {
  const cibles = quoi ?? (Object.keys(RES) as ResourceId[])
  const parts: string[] = []
  for (const r of cibles) {
    const perdu = Math.floor(s.resources[r] * p)
    if (perdu > 0) {
      s.resources[r] -= perdu
      parts.push(`${perdu} ${RES[r].emoji}`)
    }
  }
  return parts.length ? parts.join(', ') : 'presque rien'
}

/**
 * Tire les fronts d'une vague : la porte de l'est est toujours visée
 * (c'est la voie royale), les autres secteurs s'ajoutent avec la menace.
 * Chaque assaut est ainsi différent - impossible de fortifier un seul côté.
 */
function choisirFronts(threat: number): typeof SECTEURS {
  const n = Math.min(nbFronts(threat), SECTEURS.length)
  const autres = SECTEURS.slice(1)
  // mélange déterministe-au-tirage des flancs
  for (let i = autres.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[autres[i], autres[j]] = [autres[j], autres[i]]
  }
  return [SECTEURS[0], ...autres.slice(0, n - 1)]
}

/**
 * Les héros qui ne peuvent PAS venir vous assiéger : les vôtres, et les morts.
 * C'est la meilleure raison d'aller chercher Achille - tant qu'il mange à votre
 * table, il ne marche pas sur vos murs.
 */
function herosHorsJeu(s: GameState): HeroId[] {
  return HERO_IDS.filter((h) => s.heros?.[h]?.recrute || s.heros?.[h]?.mort)
}

/** prépare l'alerte : vague, fronts visés, champion éventuel et récompense */
function armerAlerte(s: GameState): void {
  if (!s.incomingWave) s.incomingWave = genererVague(s.threat)
  // les fronts sont tirés dès l'alerte : c'est ce qu'Ulysse est capable de lire
  if (!s.incomingFronts) s.incomingFronts = choisirFronts(s.threat).map((f) => f.id)
  /*
   * Le champion se tire une fois pour toutes, à l'alerte. Les éclaireurs
   * reconnaissent un nom de loin : le joueur a le temps de lever des hommes, de
   * bâtir une tour ou de vider son temple avant qu'Achille ne soit à la porte.
   */
  if (s.incomingChampion === null) {
    const c = tirerChampion(s.threat, herosHorsJeu(s), chanceChampion(s.threat), Math.random(), Math.random())
    if (c) {
      s.incomingChampion = c.id
      const fiche = ficheChampion(c.id)
      pushToast(s, fiche.emoji, `${c.titre} !`)
      pushReport(s, fiche.emoji, `${fiche.nom} marche sur le village`, [
        c.presage,
        `Sa manœuvre : ${c.capacite.nom} - ${c.capacite.desc}`,
        'Abattez-le et elle meurt avec lui.',
      ])
    }
  }
  if (!s.defRecompense) {
    const puissance = budgetVague(s.incomingWave)
    // un nom en tête de colonne, c'est un butin qui en vaut la peine
    const prime = s.incomingChampion ? 1.6 : 1
    s.defRecompense = { bronze: Math.round((12 + puissance * 0.4) * prime), faveur: 8, bonus: false }
  }
  s.warned = true
}

/** secteurs réellement assaillis par la vague annoncée */
function frontsAnnonces(s: GameState): typeof SECTEURS {
  const trouves = (s.incomingFronts ?? [])
    .map((id) => SECTEURS.find((x) => x.id === id))
    .filter((x): x is (typeof SECTEURS)[number] => !!x)
  return trouves.length > 0 ? trouves : choisirFronts(s.threat)
}

/**
 * Fronts d'un assaut nocturne. On préfère ceux que les éclaireurs avaient
 * annoncés ; à défaut - un assaut tombé pendant l'absence, sans alerte - on
 * reprend la règle du jeu : c'est la menace qui décide du nombre de colonnes.
 */
function frontsDeLaNuit(s: GameState): typeof SECTEURS {
  const annonces = (s.incomingFronts ?? [])
    .map((id) => SECTEURS.find((x) => x.id === id))
    .filter((x): x is (typeof SECTEURS)[number] => !!x)
  return annonces.length > 0 ? annonces : SECTEURS.slice(0, nbFronts(s.threat))
}

/** « la porte de l'est », « la porte de l'est et le mur du nord » */
function motPans(angles: number[]): string {
  const noms = angles
    .map((a) => SECTEURS.find((x) => Math.abs(x.angle - a) < 0.01)?.nom.toLowerCase())
    .filter((n): n is string => !!n)
  if (noms.length === 0) return 'un pan de mur'
  if (noms.length === 1) return noms[0]
  return `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`
}

function snap(s: GameState): GameSnap {
  return s
}

function makeCtx(s: GameState, now: number): EffectCtx {
  return {
    add: (r, n) => {
      s.resources[r] = clampRes(s, r, s.resources[r] + n)
    },
    faveur: (n) => {
      s.faveur = Math.max(0, Math.min(FAVEUR_MAX, s.faveur + n))
    },
    pop: (n) => {
      s.pop = Math.max(0, s.pop + n)
    },
    units: (u, n) => {
      s.army[u] = Math.max(0, s.army[u] + n)
    },
    relation: (g, n) => {
      s.gods[g].relation = Math.max(-100, Math.min(100, s.gods[g].relation + n))
    },
    morale: (delta, label, durMs) => {
      s.moraleMods.push({ id: uid('m'), label, delta, expiresAt: durMs ? now + durMs : null })
    },
    schedule: (type, inMs, payload) => {
      s.pendingEffects.push({ at: now + inMs, type, payload })
    },
    revealAttack: () => {
      armerAlerte(s)
    },
    stealPct: (p, quoi) => volerPct(s, p, quoi),
    damageWallPct: (p) => {
      s.wallHp = Math.max(0, Math.round(s.wallHp * (1 - p)))
    },
    loseSoldiers: (n) => retirerSoldats(s, n),
    droughtFor: (ms) => {
      s.droughtUntil = now + ms
    },
  }
}

// ── État initial ──────────────────────────────────────────────────────────────
function etatInitial(now: number): Omit<GameState, keyof ActionsOnly> {
  const buildings = {} as Record<BuildingId, BuildingState>
  for (const b of BUILDING_IDS) buildings[b] = { level: b === 'agora' ? 1 : 0 }
  return {
    // décalé d'un dixième de journée : la partie commence au matin, pas en pleine nuit
    createdAt: now - DAY_MS * 0.1,
    lastSeen: now,
    /*
     * La mise de départ, calculée sur la chaîne que le premier assaut exige :
     * ferme, camp de bûcherons, palissade, caserne et deux lances - 310 de bois
     * et 90 de pierre. À 220 de bois il fallait attendre la cueillette pour la
     * caserne, et la première bande trouvait un village sans un seul soldat. La
     * troisième lance, elle, se paie sur les premières minutes de production :
     * c'est le premier enseignement du jeu, pas une punition.
     */
    resources: { bois: 330, pierre: 180, grain: 220, bronze: 24 },
    faveur: 10,
    // sept bras au départ : de quoi tenir les premiers postes ET enrôler
    pop: 7,
    nextPopAt: now + 45_000,
    buildings,
    villageois: [],
    wallHp: 0,
    tours: 0,
    brechesMur: [],
    army: { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0 },
    recruitQueue: [],
    moraleMods: [],
    morale: 52,
    gods: Object.fromEntries(GOD_IDS.map((g) => [g, { relation: 0, cooldownUntil: 0 } as GodState])) as Record<
      GodId,
      GodState
    >,
    threatMod: 0,
    threat: 10,
    nextAttackAt: now + PREMIER_ASSAUT_MS,
    warned: false,
    incomingWave: null,
    defRecompense: null,
    eventCooldowns: {},
    lastEventAt: now,
    activeEvent: null,
    eventOutcome: null,
    pendingEffects: [],
    reports: [],
    stats: { repousses: 0, perdus: 0, evenements: 0 },
    expeditions: {},
    tutorialDone: false,
    droughtUntil: 0,
    aresBoostUntil: 0,
    nextDesertAt: 0,
    vitesse: 1,
    missionsReclamees: [],
    saison: 'printemps',
    meteo: 'clair',
    meteoJusqua: now + DUREE_METEO_MS,
    heros: Object.fromEntries(HERO_IDS.map((h) => [h, etatHeroInitial()])) as Record<HeroId, HeroState>,
    rappelHerosAt: 0,
    incomingFronts: null,
    incomingChampion: null,
    siegeGratuit: false,
    sauverTroupes: 0,
    arcHeros: null,
    arcIssue: null,
    appelSecours: null,
    prochainAppelAt: now + 9 * 60_000,
    alliances: {},
    relations: {},
    hautsFaits: [],
    annales: [],
    prochainReleveAt: now + PAS_RELEVE_MS,
    dernierJourVecu: 1,
    exploits: {},
    finDePartie: null,
    tutoriel: null,
    mode: null,
    campagne: null,
    graces: [],
    missionsNotifiees: [],
    battle: null,
    renfortsEngages: null,
    expedition: null,
    battleReport: null,
    victoire: null,
    offlineSummary: null,
    toasts: [],
    selected: null,
    panel: null,
    popOuvert: false,
  }
}
type ActionsOnly = {
  init: unknown
  tick: unknown
  upgrade: unknown
  recruter: unknown
  reparerRemparts: unknown
  construireTour: unknown
  affecter: unknown
  echanger: unknown
  sacrifier: unknown
  benir: unknown
  acquerirGrace: unknown
  donnerOrdre: unknown
  assignerSecteur: unknown
  offrirPresent: unknown
  proposerPacte: unknown
  scellerMariage: unknown
  recruterHeros: unknown
  capaciteHeros: unknown
  choisirArc: unknown
  fermerArc: unknown
  choisirEvenement: unknown
  fermerEvenement: unknown
  lancerMaintenant: unknown
  lancerExpedition: unknown
  ignorerSecours: unknown
  abdiquer: unknown
  fermerFin: unknown
  demarrerTutoriel: unknown
  etapeTutoSuivante: unknown
  arreterTutoriel: unknown
  retraiteExpedition: unknown
  fermerExpedition: unknown
  attaqueTest: unknown
  setVitesse: unknown
  reclamerMission: unknown
  allerAMission: unknown
  choisirMode: unknown
  commencerActe: unknown
  acteSuivant: unknown
  rejouerActe: unknown
  changerEmplacement: unknown
  select: unknown
  openPanel: unknown
  ouvrirRecensement: unknown
  fermerOffline: unknown
  fermerBattleReport: unknown
  fermerVictoire: unknown
  save: unknown
  reset: unknown
}

const CHAMPS_SAUVES = [
  'createdAt',
  'lastSeen',
  'resources',
  'faveur',
  'pop',
  'nextPopAt',
  'buildings',
  'villageois',
  'wallHp',
  'tours',
  'brechesMur',
  'army',
  'recruitQueue',
  'moraleMods',
  'morale',
  'gods',
  'threatMod',
  'threat',
  'nextAttackAt',
  'warned',
  'incomingWave',
  'defRecompense',
  'eventCooldowns',
  'lastEventAt',
  'activeEvent',
  'eventOutcome',
  'pendingEffects',
  'reports',
  'stats',
  'expeditions',
  'tutorialDone',
  'droughtUntil',
  'aresBoostUntil',
  'nextDesertAt',
  'vitesse',
  'missionsReclamees',
  'saison',
  'meteo',
  'meteoJusqua',
  'heros',
  'rappelHerosAt',
  'incomingFronts',
  'incomingChampion',
  'siegeGratuit',
  'sauverTroupes',
  'appelSecours',
  'prochainAppelAt',
  'alliances',
  'relations',
  'hautsFaits',
  'annales',
  'prochainReleveAt',
  'dernierJourVecu',
  'exploits',
  'tutoriel',
  'mode',
  'campagne',
  'graces',
] as const

export const VITESSES = [1, 2, 4, 8] as const

// ── Saisons et météo ─────────────────────────────────────────────────────────
/** ce qu'une saison change aux récoltes, en une phrase lisible */
function resumeRecoltes(saison: SaisonId): string {
  const parts: string[] = []
  for (const r of Object.keys(RES) as ResourceId[]) {
    const v = SAISONS[saison].prod[r] ?? 1
    if (Math.abs(v - 1) < 0.02) continue
    parts.push(`${RES[r].nom.toLowerCase()} ${v > 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)} %`)
  }
  return parts.length ? `Récoltes : ${parts.join(', ')}.` : 'Les récoltes suivent leur cours.'
}

/**
 * Fait tourner le calendrier : la saison suit les journées écoulées, la météo
 * se retire toutes les DUREE_METEO_MS. Les deux pèsent sur la récolte comme sur
 * la bataille - et se voient sur la carte.
 */
function tournerCiel(s: GameState, now: number): void {
  const saison = saisonDe(Math.floor((now - s.createdAt) / DAY_MS))
  if (saison !== s.saison) {
    // sortir de l'hiver le grenier non vide, c'est déjà une victoire
    if (s.saison === 'hiver' && s.resources.grain > 0) noter(s, 'hiverTraverse')
    s.saison = saison
    s.meteo = tirerMeteo(saison)
    s.meteoJusqua = now + DUREE_METEO_MS
    const def = SAISONS[saison]
    // Énée traîne toujours une colonne de réfugiés derrière lui
    const parSaison = cumulerPassifs(s.heros).popParSaison
    if (parSaison > 0) {
      const gagnes = Math.min(parSaison, Math.max(0, popCap(s) - s.pop))
      if (gagnes > 0) {
        s.pop += gagnes
        pushToast(s, '👥', `${gagnes} réfugié${gagnes > 1 ? 's' : ''} suivent Énée jusqu’à vos portes.`)
      }
    }
    pushToast(s, def.emoji, `${def.nom} - ${def.desc}`)
    pushReport(s, def.emoji, `${def.nom} sur la Troade`, [
      def.desc,
      resumeRecoltes(saison),
      def.merFermee
        ? 'La mer se ferme : le port ne tourne plus qu’au tiers et les places d’outre-mer sont hors d’atteinte.'
        : 'La mer est ouverte : on peut porter la guerre au-delà du détroit.',
    ])
    return
  }
  if (now >= s.meteoJusqua) {
    const avant = s.meteo
    s.meteo = tirerMeteo(saison)
    s.meteoJusqua = now + DUREE_METEO_MS
    if (s.meteo !== avant) pushToast(s, METEOS[s.meteo].emoji, `${METEOS[s.meteo].nom} - ${METEOS[s.meteo].desc}`)
  }
}

// ── Héros : expérience, entretien, arcs ──────────────────────────────────────

/** les héros qui descendent sur le terrain : présents, vivants, et pas alités */
function herosAuCombat(s: GameState, now: number): { id: HeroId; niveau: number }[] {
  return HERO_IDS.filter((h) => {
    const e = s.heros[h]
    return e?.recrute && !e.mort && now >= e.boudeJusqua
  }).map((h) => ({ id: h, niveau: s.heros[h].niveau }))
}

/**
 * Après la bataille, on relève les héros tombés. Ils ne meurent pas ici - seul
 * leur arc peut les tuer - mais ils sortent blessés : capacité indisponible
 * le temps de la convalescence, et le village le sait.
 */
function relverHerosTombes(s: GameState, b: BattleState, now: number): void {
  for (const f of b.fighters) {
    if (!f.heros || f.etat !== 'mort') continue
    const e = s.heros[f.heros]
    if (!e?.recrute || e.mort) continue
    e.boudeJusqua = Math.max(e.boudeJusqua, now + HERO_CONVALESCENCE_MS)
    pushToast(s, '🩹', `${HEROS[f.heros].nom} est tombé au combat - on le relève, mais il ne se battra plus avant un moment.`)
    pushReport(s, '🩹', `${HEROS[f.heros].nom} blessé`, [
      'On l’a sorti de la mêlée le bouclier fendu et le souffle court.',
      `Sa capacité reste indisponible ${Math.round(HERO_CONVALESCENCE_MS / 60_000)} minutes, le temps qu’il se relève.`,
      'Un héros ne meurt que dans son propre récit - pas dans une échauffourée.',
    ])
  }
}

/** distribue de l'expérience aux héros présents et fait monter ceux qui le peuvent */
function gagnerXp(s: GameState, n: number): void {
  for (const h of HERO_IDS) {
    const e = s.heros[h]
    if (!e?.recrute || e.mort || !peutMonter(e)) continue
    e.xp += n
    let seuil = xpRequise(HEROS[h], e.niveau)
    while (e.xp >= seuil && peutMonter(e)) {
      e.xp -= seuil
      e.niveau++
      pushToast(s, HEROS[h].emoji, `${HEROS[h].nom} passe au niveau ${e.niveau} - sa légende grandit.`)
      seuil = xpRequise(HEROS[h], e.niveau)
    }
    if (!peutMonter(e)) e.xp = 0
  }
}

/** ouvre le prochain nœud d'arc mûr, s'il n'y a rien d'autre à l'écran */
function ouvrirArcMur(s: GameState): void {
  if (s.arcHeros || s.activeEvent || s.battle || s.expedition) return
  for (const h of HERO_IDS) {
    const n = noeudMur(HEROS[h], s.heros[h])
    if (n) {
      s.arcHeros = { heros: h, noeud: n.id }
      s.arcIssue = null
      return
    }
  }
}

/**
 * Un héros mange, exige des honneurs - et s'en va si on l'ignore. Trois rappels
 * sans réponse et il reprend la route : c'est ce qui empêche d'en collectionner
 * huit sans y penser.
 */
function entretenirHeros(s: GameState, now: number, dtJeu: number): void {
  // même barème que l'affichage : la grâce d'Arès allège la table des héros
  const ent = entretienHeros(s)
  if (ent.grain <= 0 && ent.faveur <= 0) {
    s.rappelHerosAt = 0
    return
  }
  const dG = (ent.grain / 60) * dtJeu
  const dF = (ent.faveur / 60) * dtJeu
  if (s.resources.grain >= dG && s.faveur >= dF) {
    s.resources.grain -= dG
    s.faveur -= dF
    s.rappelHerosAt = 0
    return
  }
  if (s.rappelHerosAt === 0) {
    s.rappelHerosAt = now + 60_000
    pushToast(s, '🍖', 'Vos héros réclament leur dû : greniers vides et autels muets.')
    return
  }
  if (now < s.rappelHerosAt) return
  s.rappelHerosAt = now + 60_000
  for (const h of HERO_IDS) {
    const e = s.heros[h]
    if (!e?.recrute || e.mort) continue
    e.impayes++
    if (e.impayes < 3) continue
    e.recrute = false
    e.impayes = 0
    pushToast(s, HEROS[h].emoji, `${HEROS[h].nom} plie bagage - on n’honore pas un héros de promesses.`)
    pushReport(s, HEROS[h].emoji, `${HEROS[h].nom} s’en va`, [
      'Trois fois il a réclamé son dû, trois fois la table est restée vide.',
      'Il reprend la route sans un mot. Rien n’interdit de le rappeler - en payant, cette fois.',
    ])
  }
}

// ── Hauts faits et prestige ──────────────────────────────────────────────────

/** vue figée de la partie, telle que la jugent les hauts faits */
export function snapHautFait(s: GameState): SnapHautFait {
  return {
    resources: s.resources,
    faveur: s.faveur,
    army: s.army,
    pop: s.pop,
    morale: s.morale,
    tours: s.tours,
    buildings: s.buildings,
    gods: s.gods,
    stats: s.stats,
    expeditions: s.expeditions,
    alliances: s.alliances,
    heros: s.heros,
    villageois: s.villageois,
    saison: s.saison,
    jour: jourDe(s),
    exploits: s.exploits ?? {},
  }
}

// ── Campagne : « La Chute » ──────────────────────────────────────────────────

/** vue que lisent les objectifs d'acte - compteurs ramenés à l'acte en cours */
export function etatActe(s: GameState): EtatActe {
  const base = s.campagne?.base
  const depuis = (cle: string) => (s.exploits[cle] ?? 0) - (base?.exploits[cle] ?? 0)
  return {
    resources: s.resources,
    faveur: s.faveur,
    pop: s.pop,
    morale: s.morale,
    threat: s.threat,
    wallHp: s.wallHp,
    tours: s.tours,
    jour: Math.floor((s.lastSeen - (s.campagne?.debutActe ?? s.createdAt)) / DAY_MS) + 1,
    buildings: s.buildings,
    army: s.army,
    villageois: s.villageois,
    gods: s.gods,
    heros: s.heros,
    alliances: Object.keys(s.alliances ?? {}),
    faits: {
      assautsRepousses: s.stats.repousses - (base?.repousses ?? 0),
      assautsPerdus: s.stats.perdus - (base?.perdus ?? 0),
      assautsMurIntact: depuis('assautMurIntact'),
      assautsSansPerte: depuis('assautSansPerte'),
      raidsReussis: depuis('raids'),
      secoursPortes: depuis('secours'),
      dilemmesTranches: s.stats.evenements - (base?.evenements ?? 0),
      benedictions: depuis('benedictions'),
      pertesCiviles: depuis('pertesCiviles'),
    },
  }
}

/** fige les compteurs du règne : l'acte ne mesurera que ce qui vient après */
function baseFaits(s: GameState) {
  return {
    repousses: s.stats.repousses,
    perdus: s.stats.perdus,
    evenements: s.stats.evenements,
    exploits: { ...s.exploits },
  }
}

/**
 * Pose l'état de départ d'un acte. Un acte de campagne ne recommence pas de
 * zéro : il HÉRITE d'une situation écrite, qui raconte à elle seule ce qui vient
 * de se passer - c'est ce qui permet à l'acte IV de s'ouvrir sur une brèche.
 */
function appliquerActe(s: GameState, i: number, now: number): void {
  const acte = ACTES_CAMPAGNE[i]
  if (!acte) return
  const d = acte.depart
  s.resources = { ...d.resources }
  s.pop = d.pop
  s.villageois = []
  for (const b of BUILDING_IDS) s.buildings[b] = { level: d.batiments[b] ?? 0 }
  s.army = { ...d.army }
  s.recruitQueue = []
  s.morale = d.morale
  s.moraleMods = []
  s.faveur = d.faveur
  s.tours = d.tours
  s.saison = d.saison
  s.meteo = d.meteo
  s.meteoJusqua = now + DUREE_METEO_MS
  for (const g of GOD_IDS) s.gods[g] = { relation: d.relations[g] ?? 0, cooldownUntil: 0 }
  // murMax lit les passifs de héros : on pose donc les héros AVANT la structure
  for (const h of HERO_IDS) s.heros[h] = etatHeroInitial()
  // les héros que le récit impose entrent sans condition ni rançon
  for (const h of acte.herosScriptes) s.heros[h] = { ...etatHeroInitial(), recrute: true, niveau: 2 }
  s.wallHp = Math.round(murMax(s) * d.murPart)
  s.brechesMur = d.murPart <= 0.55 && (d.batiments.remparts ?? 0) > 0 ? [0] : []
  s.threat = acte.menace.threat
  s.threatMod = acte.menace.threatMod
  s.nextAttackAt = now + acte.menace.premierAssautMs
  s.warned = false
  s.incomingWave = null
  s.incomingFronts = null
  s.incomingChampion = null
  s.defRecompense = null
  // le calendrier repart au premier matin de l'acte, dans la bonne saison
  s.createdAt = now - DAY_MS * (SAISON_IDS.indexOf(d.saison) * JOURS_PAR_SAISON + 0.15)
  s.lastSeen = now
  s.nextPopAt = now + 45_000
  s.battle = null
  s.expedition = null
  s.activeEvent = null
  s.eventOutcome = null
  s.pendingEffects = []
  s.arcHeros = null
  s.arcIssue = null
  s.appelSecours = null
  s.prochainAppelAt = now + 6 * 60_000
  s.selected = null
  s.panel = null
  s.popOuvert = false
  s.victoire = null
  s.battleReport = null
  s.reports = []
  s.campagne = {
    acte: i,
    debutActe: now,
    base: baseFaits(s),
    prologueVu: false,
    objectifsFaits: [],
    accompli: false,
    perdu: false,
    fini: false,
  }
}

/** vue de l'état que lisent les conditions d'avancement du tutoriel */
export function snapTuto(s: GameState): SnapTuto {
  return {
    resources: s.resources,
    buildings: s.buildings,
    villageois: s.villageois,
    army: s.army,
    recruitQueue: s.recruitQueue,
    gods: s.gods,
    heros: s.heros,
    panel: s.panel,
    pop: s.pop,
    faveur: s.faveur,
  }
}

/** score de prestige de la partie en cours */
export function prestigeCourant(s: GameState): number {
  return prestige(snapHautFait(s), s.hautsFaits ?? [])
}

/**
 * Un relevé des annales. Tout y est ARRONDI : une sauvegarde n'a pas à porter
 * quinze décimales de grain, et une courbe ne se lit pas au dixième près.
 */
function releverAnnales(s: GameState, now: number): void {
  const max = murMax(s)
  s.annales.push({
    t: now,
    jour: jourDe(s),
    bois: Math.round(s.resources.bois),
    pierre: Math.round(s.resources.pierre),
    grain: Math.round(s.resources.grain),
    bronze: Math.round(s.resources.bronze),
    faveur: Math.round(s.faveur),
    pop: s.pop,
    armee: armeeTotale(s.army),
    menace: Math.round(s.threat),
    ambiance: Math.round(s.morale),
    mur: max > 0 ? Math.round((s.wallHp / max) * 100) : 0,
    prestige: prestigeCourant(s),
  })
  // le tableau est borné : on oublie les plus vieux relevés, jamais les récents
  if (s.annales.length > MAX_RELEVES) s.annales.splice(0, s.annales.length - MAX_RELEVES)
}

/** contrôle les hauts faits non encore acquis, et sacre ceux qui viennent de tomber */
function verifierHautsFaits(s: GameState): void {
  const snap = snapHautFait(s)
  for (const hf of HAUTS_FAITS) {
    if (s.hautsFaits.includes(hf.id)) continue
    if (!hf.atteint(snap)) continue
    s.hautsFaits.push(hf.id)
    pushToast(s, hf.emoji, `Haut fait : ${hf.titre} (+${hf.points} prestige)`)
    pushReport(s, '🏅', `Haut fait - ${hf.titre}`, [hf.desc, `+${hf.points} points de prestige.`])
  }
}

/** enregistre un fait ponctuel que l'état seul ne raconterait pas */
function noter(s: GameState, cle: string, n = 1): void {
  s.exploits[cle] = (s.exploits[cle] ?? 0) + n
}

// ── Appels au secours et alliances ───────────────────────────────────────────

// ── Diplomatie : ce que la Troade pense de vous ──────────────────────────────

/** relation avec un village - zéro pour celui qu'on n'a jamais approché */
export function relationVillage(s: Pick<GameState, 'relations'>, id: string): number {
  return s.relations?.[id] ?? RELATION_NEUTRE
}

/** statut diplomatique d'un village, tel que l'affiche le panneau */
export function statutDe(s: Pick<GameState, 'relations' | 'alliances'>, id: string): StatutVillage {
  const a = s.alliances?.[id]
  return statutVillage(relationVillage(s, id), !!a, !!a?.mariage)
}

/**
 * Bouger une relation. Un village lié par le sang ne se fâche plus : c'est ce
 * qu'on a payé en donnant un habitant, et le pardon perpétuel en fait partie.
 */
function bougerRelation(s: GameState, id: string, delta: number): void {
  if (delta === 0) return
  if (s.alliances[id]?.mariage && delta < 0) return
  s.relations[id] = borner(relationVillage(s, id) + delta)
}

/**
 * Ce que la côte apprend de vos actes. La Troade est petite : ce qu'on fait à
 * Lesbos se sait à Ténédos avant le soir. C'est ce qui empêche de piller les
 * huit places forte l'une après l'autre sans jamais en payer le prix.
 */
function ondeDiplomatique(s: GameState, sauf: string, delta: number): void {
  for (const v of VILLAGES_CIBLES) {
    if (v.id === sauf) continue
    bougerRelation(s, v.id, delta)
  }
}

/**
 * Une alliance ordinaire ne survit pas à une relation tombée à zéro : celui
 * qu'on a sauvé puis fâché reprend sa parole. Un mariage, lui, tient.
 */
function verifierAlliances(s: GameState, now: number): void {
  for (const [id, a] of Object.entries(s.alliances)) {
    if (a.mariage) continue
    if (relationVillage(s, id) > SEUIL_RUPTURE) continue
    delete s.alliances[id]
    const v = VILLAGES_PAR_ID[id]
    pushToast(s, '💔', `${v?.nom ?? id} reprend sa parole : l’alliance est rompue.`)
    pushReport(s, '💔', `Alliance rompue - ${v?.nom ?? id}`, [
      'On ne tient pas parole à qui ne la tient pas. Plus de tribut, plus de renforts sur vos remparts.',
      'Un présent ou deux suffiraient peut-être à renouer - un mariage, lui, aurait tenu.',
    ])
    noter(s, 'alliancesRompues')
  }
  void now
}

/**
 * Un village de la Troade est assiégé et appelle à l'aide. La fenêtre est
 * courte, il n'y a rien à rafler au bout - mais un allié vaut mieux qu'un
 * grenier plein quand la vague suivante arrive.
 */
function tirerAppelSecours(s: GameState, now: number): void {
  if (s.appelSecours || s.expedition || s.battle || !s.tutorialDone) return
  if (now < s.prochainAppelAt) return
  // seuls les villages ni alliés ni fraîchement pillés appellent le voisin
  const pool = VILLAGES_CIBLES.filter(
    (v) => !s.alliances[v.id] && (s.expeditions[v.id]?.pillages ?? 0) === 0 && !(v.maritime && SAISONS[s.saison].merFermee),
  )
  s.prochainAppelAt = now + 7 * 60_000 + Math.random() * 5 * 60_000
  if (pool.length === 0 || armeeTotale(s.army) < 3) return
  /*
   * On n'appelle à l'aide que celui qui peut venir. Le tirage était uniforme sur
   * les huit places fortes : un chef à trois lanciers se voyait offrir la
   * délivrance de la citadelle de Ténédos, dont les assiégeants pèsent 247 - une
   * fenêtre qu'il ne pouvait qu'ignorer, et Zeus comptait son absence.
   */
  const aPortee = appelsAPortee(pool, s.army)
  if (aPortee.length === 0) return
  // le plus fort de ceux qu'on peut délivrer : un secours doit rester un risque
  const v = aPortee.reduce((a, b) => (puissanceAssiegeants(b) > puissanceAssiegeants(a) ? b : a))
  s.appelSecours = { villageId: v.id, expireAt: now + SECOURS_FENETRE_MS }
  pushToast(s, '🤝', `${v.nom} est assiégé et implore votre aide !`)
  pushReport(s, '🤝', `${v.nom} appelle au secours`, [
    `Un coureur arrive, les pieds en sang : une bande armée cerne ${v.nom}.`,
    'Aucun butin à espérer - mais Zeus veille sur qui répond aux suppliants, et un village sauvé n’oublie pas.',
    `La fenêtre se referme dans ${Math.round(SECOURS_FENETRE_MS / 60_000)} minutes.`,
  ])
}

/** l'appel expire : le village tombe, et Zeus a compté qui n'est pas venu */
function expirerAppel(s: GameState, now: number): void {
  if (!s.appelSecours || now < s.appelSecours.expireAt) return
  const v = VILLAGES_PAR_ID[s.appelSecours.villageId]
  s.appelSecours = null
  if (!v) return
  s.gods.zeus.relation = Math.max(-100, s.gods.zeus.relation - 4)
  s.threatMod += 3
  pushReport(s, '🔥', `${v.nom} est tombé`, [
    'Personne n’est venu. Au matin, on a vu la fumée depuis les remparts.',
    'Zeus Xenios protège les suppliants : votre relation avec lui en pâtit (−4).',
    'Une bande de plus rôde dans la région : la menace monte.',
  ])
  pushToast(s, '🔥', `${v.nom} est tombé faute de secours - Zeus s’en souviendra.`)
}

/** les alliés paient tribut, régulièrement et sans qu'on le demande */
function verserTributs(s: GameState, now: number): void {
  for (const [id, a] of Object.entries(s.alliances)) {
    if (now < a.tributAt) continue
    a.tributAt = now + TRIBUT_MS
    const v = VILLAGES_PAR_ID[id]
    if (!v) continue
    const parts: string[] = []
    // un village lié par le sang verse le double : c'est ce qu'on a acheté
    const mult = a.mariage ? MULT_TRIBUT_MARIAGE : 1
    for (const [r, n] of Object.entries(tributDe(v)) as [ResourceId, number][]) {
      const du = n * mult
      s.resources[r] = clampRes(s, r, s.resources[r] + du)
      parts.push(`+${du} ${RES[r].emoji}`)
    }
    if (parts.length) {
      pushToast(s, a.mariage ? '💍' : '🤝', `Tribut de ${v.nom} : ${parts.join(', ')}${a.mariage ? ' (parenté)' : ''}`)
    }
  }
}

/** renforts alliés dépêchés sur vos remparts quand l'assaut sonne */
function renfortsAllies(s: GameState): Record<UnitId, number> {
  const out: Record<UnitId, number> = { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0 }
  for (const id of Object.keys(s.alliances)) {
    const v = VILLAGES_PAR_ID[id]
    if (!v) continue
    const r = renfortsDe(v)
    for (const u of UNIT_IDS) out[u] += r[u]
  }
  return out
}

// ── Effets différés ───────────────────────────────────────────────────────────
function appliquerEffetDiffere(s: GameState, eff: PendingEffect, now: number): void {
  switch (eff.type) {
    case 'trahison-refugies': {
      const vol = volerPct(s, 0.25, ['grain', 'bronze'])
      s.pop = Math.max(0, s.pop - 4)
      s.moraleMods.push({ id: uid('m'), label: 'Trahison des réfugiés', delta: -10, expiresAt: now + 8 * 60_000 })
      pushReport(s, '🗡️', 'Les réfugiés ont trahi', [
        'À la nuit tombée, vos « réfugiés » ont vidé les réserves et filé vers les collines.',
        `Perdu : ${vol}.`,
        'Athéna l’avait peut-être murmuré à qui savait l’entendre…',
      ])
      pushToast(s, '🗡️', 'Les réfugiés vous ont trahi !')
      break
    }
    case 'promesse-mutins': {
      if (s.morale < 40) {
        const morts = retirerSoldats(s, 2)
        s.moraleMods.push({ id: uid('m'), label: 'Promesses trahies', delta: -18, expiresAt: now + 10 * 60_000 })
        pushReport(s, '🔥', 'Les promesses n’ont pas suffi', [
          'Les jours meilleurs ne sont pas venus. La colère non plus n’est pas partie.',
          `${morts} soldat(s) ont déserté avec les mutins.`,
        ])
        pushToast(s, '🔥', 'La foule n’a pas oublié vos promesses…')
      } else {
        pushReport(s, '🕊️', 'La parole tenue', [
          'L’ambiance s’est améliorée : les meneurs de la mutinerie déposent leurs torches.',
        ])
      }
      break
    }
    case 'butin-troie': {
      s.resources.bronze = clampRes(s, 'bronze', s.resources.bronze + 120)
      s.resources.grain = clampRes(s, 'grain', s.resources.grain + 60)
      pushReport(s, '🏰', 'La gratitude de Troie', [
        'Un char aux couleurs de Priam livre votre part du butin de la sortie d’Hector.',
        '+120 🪙, +60 🌾. Vos soldats reviendront couverts de gloire - ceux qui reviendront.',
      ])
      pushToast(s, '🏰', 'Troie partage le butin : +120 🪙, +60 🌾')
      break
    }
  }
}

// ── Fin de bataille défensive ─────────────────────────────────────────────────
function finirBataille(s: GameState, victoire: boolean, fuite: boolean, now: number): void {
  const b = s.battle
  if (!b) return
  const pertes = pertesDefense(b)
  const lignes: string[] = []
  // les héros tombés sont relevés blessés, jamais rayés de l'effectif
  relverHerosTombes(s, b, now)
  // les renforts alliés meurent en premier : c'est tout l'intérêt d'un allié
  const renf = s.renfortsEngages
  let alliesTombes = 0
  // « Prudence » : une part des tombés n'est que blessée, et rentre au village
  const epargne = bonusFaveurs(s).epargnePct
  let releves = 0
  for (const [u, n] of Object.entries(pertes) as [UnitId, number][]) {
    const parAllies = Math.min(n, renf?.[u] ?? 0)
    alliesTombes += parAllies
    const brut = n - parAllies
    const rendus = epargne > 0 ? Math.round(brut * epargne) : 0
    releves += rendus
    const miens = brut - rendus
    if (miens > 0) {
      s.army[u] = Math.max(0, s.army[u] - miens)
      lignes.push(`${miens} ${UNITS[u].nom.toLowerCase()}${miens > 1 ? 's' : ''} tombé(s)`)
    }
  }
  if (releves > 0) {
    lignes.push(`🦉 ${releves} blessé${releves > 1 ? 's' : ''} relevé${releves > 1 ? 's' : ''} par la prudence d’Athéna.`)
  }
  if (alliesTombes > 0) {
    lignes.push(`🤝 ${alliesTombes} allié${alliesTombes > 1 ? 's' : ''} sont tombés pour vos murs.`)
  }
  s.renfortsEngages = null
  const morts = b.fighters.filter((f) => f.camp === 'attaque' && f.hp <= 0).length
  const fuyards = b.fighters.filter((f) => f.camp === 'attaque' && f.etat === 'mort' && f.hp > 0).length
  fuite = fuite || fuyards > 0

  if (victoire) {
    s.stats.repousses++
    s.threatMod -= 5
    // ce que le compteur d'assauts ne dit pas : la manière
    const sansPerte = Object.keys(pertes).length === 0
    const murIntact = b.secteurs.every((sec) => !sec.breche)
    if (sansPerte) noter(s, 'assautSansPerte')
    if (sansPerte && b.secteurs.length >= 3) noter(s, 'assautTroisFronts')
    if (murIntact) noter(s, 'assautMurIntact')
    const rec = s.defRecompense ?? { bronze: 20, faveur: 8, bonus: false }
    const mult = rec.bonus ? 1.25 : 1
    const bronze = Math.round(rec.bronze * mult)
    const faveur = Math.round(rec.faveur * mult)
    s.resources.bronze = clampRes(s, 'bronze', s.resources.bronze + bronze)
    s.faveur = Math.min(FAVEUR_MAX, s.faveur + faveur)
    s.moraleMods.push({ id: uid('m'), label: 'Victoire éclatante', delta: 10, expiresAt: now + 10 * 60_000 })
    const r = pushReport(s, '🏆', fuite ? 'L’ennemi est en déroute !' : 'Assaut repoussé !', [
      `La bande (${descVague(b.wave)}) a été ${fuite ? 'mise en fuite' : 'anéantie'} : ${morts} assaillants abattus${fuyards ? `, ${fuyards} en fuite` : ''}.`,
      lignes.length ? `Vos pertes : ${lignes.join(', ')}.` : 'Aucune perte dans vos rangs - les aèdes chanteront ce jour.',
      `🎁 Récompense : +${bronze} 🪙, +${faveur} ✨${rec.bonus ? ' (bonus d’audace +25 %)' : ''}. Ambiance +10.`,
    ])
    s.battleReport = r
    // la salve de victoire : trois secondes de lauriers par-dessus la scène
    s.victoire = {
      at: now,
      type: 'defense',
      etoiles: sansPerte ? 3 : murIntact ? 2 : 1,
      detail: sansPerte ? 'Pas un homme perdu' : fuite ? 'L’ennemi en déroute' : 'Assaut repoussé',
    }
  } else {
    s.stats.perdus++
    s.threatMod -= 15
    const vol = volerPct(s, 0.3)
    s.moraleMods.push({ id: uid('m'), label: 'Village pillé', delta: -14, expiresAt: now + 10 * 60_000 })
    const r = pushReport(s, '💀', 'Le village a été pillé', [
      `Les assaillants (${descVague(b.wave)}) ont enfoncé vos défenses.`,
      lignes.length ? `Vos pertes : ${lignes.join(', ')}.` : 'Vos défenseurs ont été balayés.',
      `Pillé : ${vol}. Ambiance −14.`,
      'Repus de butin, ils vous laisseront tranquilles… un temps.',
    ])
    s.battleReport = r
  }
  // les héros présents apprennent de chaque assaut - même perdu, mais moins
  gagnerXp(s, victoire ? XP_ASSAUT_REPOUSSE : Math.round(XP_ASSAUT_REPOUSSE * 0.4))
  // Achille ne supporte pas d'avoir regardé la bataille sans y entrer
  const ach = s.heros.achille
  if (ach?.recrute && !ach.mort) {
    ach.inactif++
    if (ach.inactif >= 2) {
      ach.inactif = 0
      const malus = HEROS.achille.passif.maloraleSiInactif ?? 8
      s.moraleMods.push({ id: uid('m'), label: 'Achille sous sa tente', delta: -malus, expiresAt: now + 8 * 60_000 })
      pushToast(s, '⚔️', 'Deux assauts sans lâcher Achille : la troupe murmure, le moral tombe.')
    }
  }

  // les pans tombés restent à terre : le village vit avec ses brèches jusqu'à
  // ce qu'on paie la pierre pour les relever
  s.brechesMur = b.secteurs.filter((sec) => sec.breche).map((sec) => sec.angle)
  if (s.brechesMur.length > 0) {
    pushToast(s, '🧱', `${s.brechesMur.length} pan${s.brechesMur.length > 1 ? 's' : ''} de mur à terre - réparez avant le prochain assaut.`)
  }

  s.battle = null
  s.warned = false
  s.incomingWave = null
  s.incomingFronts = null
  s.incomingChampion = null
  s.defRecompense = null
  s.nextAttackAt = now + ASSAUT_MIN_MS + Math.random() * (ASSAUT_MAX_MS - ASSAUT_MIN_MS)
}

// ── Fin d'expédition ──────────────────────────────────────────────────────────
function finirExpedition(s: GameState, v: VillageCible, victoire: boolean, now: number): void {
  const exp = s.expedition
  if (!exp) return
  const b = exp.battle
  const lignes: string[] = []
  // un héros mis à terre au loin rentre blessé, pas mort
  relverHerosTombes(s, b, now)

  // survivants (les fuyards hp>0 rentrent au village) - et ceux qu'Énée arrache
  // à la déroute : sa capacité ne joue qu'une fois, et seulement sur une défaite
  const partEnee = !victoire && s.sauverTroupes > 0 ? s.sauverTroupes : 0
  let envoyesTotal = 0
  let mortsTotal = 0
  let sauvesParEnee = 0
  const pertesTxt: string[] = []
  // « Prudence » : on relève les blessés au lieu de les laisser sur le champ
  const epargne = bonusFaveurs(s).epargnePct
  let relevesTotal = 0
  for (const u of UNIT_IDS) {
    const envoyes = exp.envoyes[u] ?? 0
    if (envoyes === 0) continue
    envoyesTotal += envoyes
    const morts = b.fighters.filter((f) => f.camp === 'attaque' && f.type === u && f.etat === 'mort' && f.hp <= 0).length
    const debout = Math.max(0, envoyes - morts)
    const releves = epargne > 0 ? Math.round(morts * epargne) : 0
    relevesTotal += releves
    const rentrent = Math.max(debout + releves, partEnee > 0 ? Math.round(envoyes * partEnee) : 0)
    // ce qu'Énée arrache en plus de ce que la déesse a déjà sauvé
    sauvesParEnee += Math.max(0, rentrent - debout - releves)
    const perdus = envoyes - rentrent
    mortsTotal += perdus
    s.army[u] += rentrent
    if (perdus > 0) pertesTxt.push(`${perdus} ${UNITS[u].nom.toLowerCase()}${perdus > 1 ? 's' : ''}`)
  }
  if (partEnee > 0) s.sauverTroupes = 0
  const noteEpargne =
    relevesTotal > 0
      ? ` 🦉 La prudence d’Athéna en a fait relever ${relevesTotal} au lieu de les laisser au sol.`
      : ''

  const etat = s.expeditions[v.id]
  const deja = etat?.etoiles ?? 0
  const pillages = etat?.pillages ?? 0
  const secours = exp.intention === 'secours'

  // ── secours : rien à rafler, mais un allié pour la suite ──
  if (secours) {
    const etoiles = victoire ? etoilesPour(mortsTotal, envoyesTotal) : 0
    s.expeditions[v.id] = { etoiles: Math.max(deja, etoiles), dernierRaid: now, pillages }
    if (victoire) {
      noter(s, 'secours')
      s.alliances[v.id] = { depuis: now, tributAt: now + TRIBUT_MS }
      // la côte entière apprend qu'on est venu : lever un siège vaut du crédit partout
      bougerRelation(s, v.id, GAIN_SECOURS)
      ondeDiplomatique(s, v.id, GAIN_SECOURS_VOISINS)
      s.gods.zeus.relation = Math.min(100, s.gods.zeus.relation + 12)
      s.gods.athena.relation = Math.min(100, s.gods.athena.relation + 7)
      s.moraleMods.push({ id: uid('m'), label: 'Le village sauvé', delta: 9, expiresAt: now + 12 * 60_000 })
      gagnerXp(s, XP_EXPEDITION + etoiles * XP_PAR_ETOILE)
      const trib = (Object.entries(tributDe(v)) as [ResourceId, number][])
        .map(([r, n]) => `${n} ${RES[r].emoji}`)
        .join(', ')
      const renf = renfortsDe(v)
      lignes.push(
        `Le siège de ${v.nom} est levé ! ${'★'.repeat(etoiles)}${'☆'.repeat(3 - etoiles)}`,
        'Aucun butin : on ne pille pas ceux qu’on vient de sauver.',
        pertesTxt.length ? `Vos pertes : ${pertesTxt.join(', ')}.${noteEpargne}` : 'Pas un homme perdu - les aèdes s’en empareront.',
        `🤝 ${v.nom} devient votre allié : tribut de ${trib} toutes les ${Math.round(TRIBUT_MS / 60_000)} min, et ${UNIT_IDS.filter((u) => renf[u] > 0).map((u) => `${renf[u]} ${UNITS[u].nom.toLowerCase()}${renf[u] > 1 ? 's' : ''}`).join(', ')} en renfort à chaque assaut.`,
        'Zeus +12, Athéna +7, ambiance +9.',
      )
      exp.result = { victoire: true, etoiles, lignes }
      s.victoire = { at: now, type: 'expedition', etoiles, detail: `${v.nom} délivré` }
      pushReport(s, '🤝', `Secours porté - ${v.nom}`, lignes)
    } else {
      s.moraleMods.push({ id: uid('m'), label: 'Secours manqué', delta: -8, expiresAt: now + 10 * 60_000 })
      s.gods.zeus.relation = Math.max(-100, s.gods.zeus.relation - 3)
      gagnerXp(s, Math.round(XP_EXPEDITION * 0.4))
      lignes.push(
        `Vos hommes n’ont pas percé les lignes qui étranglent ${v.nom}.`,
        pertesTxt.length ? `Vos pertes : ${pertesTxt.join(', ')}.${noteEpargne}` : 'Vos troupes ont dû refluer.',
        ...(sauvesParEnee > 0 ? [`🔥 Énée couvre la retraite : ${sauvesParEnee} homme(s) rentrent quand même.`] : []),
        'Mourir pour rien reste mourir : ambiance −8, Zeus −3.',
      )
      exp.result = { victoire: false, etoiles: 0, lignes }
      pushReport(s, '🤝', `Secours manqué - ${v.nom}`, lignes)
    }
    if (s.appelSecours?.villageId === v.id) s.appelSecours = null
    return
  }

  if (victoire) {
    const etoiles = etoilesPour(mortsTotal, envoyesTotal)
    // « Soif de bronze » : ce qu'on prend par la lance, Arès veut qu'on le prenne entier
    const mult = (deja > 0 ? BUTIN_REPETE : 1) * (1 + bonusHeros(s).butinPct + bonusFaveurs(s).butinPct)
    const butinTxt: string[] = []
    for (const [r, n] of Object.entries(v.butin) as [ResourceId, number][]) {
      const gain = Math.round(n * mult)
      s.resources[r] = clampRes(s, r, s.resources[r] + gain)
      butinTxt.push(`+${gain} ${RES[r].emoji}`)
    }
    gagnerXp(s, XP_EXPEDITION + etoiles * XP_PAR_ETOILE)
    s.gods.ares.relation = Math.min(100, s.gods.ares.relation + 4)
    // Zeus protège l'hôte et le suppliant : piller se paie auprès de lui
    s.gods.zeus.relation = Math.max(-100, s.gods.zeus.relation - 5)
    s.threatMod += 4
    s.moraleMods.push({ id: uid('m'), label: 'Raid victorieux', delta: 6, expiresAt: now + 8 * 60_000 })
    s.expeditions[v.id] = { etoiles: Math.max(deja, etoiles), dernierRaid: now, pillages: pillages + 1 }
    /*
     * Piller un allié rompt l'alliance sur-le-champ - et cela se retient. Un
     * mariage ne protège pas de cela : on peut trahir sa propre parenté, cela
     * coûte simplement bien plus cher auprès de toute la côte.
     */
    const trahison = !!s.alliances[v.id]
    if (trahison) noter(s, 'trahisons')
    delete s.alliances[v.id]
    // ce qu'on fait à l'un, les sept autres l'apprennent avant le soir
    bougerRelation(s, v.id, COUT_PILLAGE)
    ondeDiplomatique(s, v.id, trahison ? COUT_TRAHISON_VOISINS : COUT_PILLAGE_VOISINS)
    if (trahison) {
      // le sang trahi ne se rachète pas d'un présent
      s.relations[v.id] = -100
    }
    lignes.push(
      `${v.nom} est tombé ! ${'★'.repeat(etoiles)}${'☆'.repeat(3 - etoiles)}`,
      `Butin : ${butinTxt.join(', ')}${deja > 0 ? ' (village déjà pillé : butin réduit)' : ''}.`,
      pertesTxt.length ? `Vos pertes : ${pertesTxt.join(', ')}.${noteEpargne}` : 'Aucune perte - un triomphe digne d’Achille.',
      `Arès +4, ambiance +6 - mais Zeus Xenios −5, et la région retient votre nom (menace +4).`,
      `Ils s’en souviendront : à votre prochaine visite, la garnison sera plus fournie (${pillages + 1} pillage${pillages > 0 ? 's' : ''} encaissé${pillages > 0 ? 's' : ''}).`,
      ...(trahison ? ['🗡️ L’alliance est rompue : on ne pille pas impunément ceux qu’on a sauvés.'] : []),
    )
    exp.result = { victoire: true, etoiles, lignes }
    s.victoire = { at: now, type: 'expedition', etoiles, detail: `${v.nom} est tombé` }
    pushReport(s, '🏴‍☠️', `Raid victorieux - ${v.nom}`, lignes)
  } else {
    s.expeditions[v.id] = { etoiles: deja, dernierRaid: now, pillages }
    s.moraleMods.push({ id: uid('m'), label: 'Raid repoussé', delta: -6, expiresAt: now + 8 * 60_000 })
    gagnerXp(s, Math.round(XP_EXPEDITION * 0.4))
    lignes.push(
      `L’assaut sur ${v.nom} a échoué.`,
      pertesTxt.length ? `Vos pertes : ${pertesTxt.join(', ')}.${noteEpargne}` : 'Vos troupes ont battu en retraite à temps.',
      ...(sauvesParEnee > 0
        ? [`🔥 Énée couvre la retraite : ${sauvesParEnee} homme${sauvesParEnee > 1 ? 's' : ''} qu’on croyait perdu${sauvesParEnee > 1 ? 's' : ''} rentre${sauvesParEnee > 1 ? 'nt' : ''} au village.`]
        : []),
      'Les survivants rentrent la tête basse. Ambiance −6.',
    )
    exp.result = { victoire: false, etoiles: 0, lignes }
    pushReport(s, '🏳️', `Raid repoussé - ${v.nom}`, lignes)
  }
}

// ── Hors-ligne ────────────────────────────────────────────────────────────────
function simulerHorsLigne(s: GameState, now: number): void {
  const dt = Math.min(Math.max(0, now - s.lastSeen), OFFLINE_CAP_MS)
  if (dt < 30_000) return
  const lignes: string[] = [`Pendant votre absence (${fmtDuree(dt)}) :`]

  // production (au taux courant)
  const minutes = dt / 60_000
  const taux = tauxParMinute(s)
  for (const r of Object.keys(RES) as ResourceId[]) {
    const avant = s.resources[r]
    s.resources[r] = clampRes(s, r, s.resources[r] + taux[r] * minutes)
    const delta = Math.round(s.resources[r] - avant)
    if (delta !== 0) lignes.push(`${delta > 0 ? '+' : ''}${delta} ${RES[r].emoji} ${RES[r].nom.toLowerCase()}`)
  }
  s.faveur = Math.min(
    FAVEUR_MAX,
    s.faveur + PROD.temple[s.buildings.temple.level] * minutes * (1 + bonusFaveurs(s).faveurPct),
  )

  // constructions terminées
  for (const bId of BUILDING_IDS) {
    const b = s.buildings[bId]
    if (b.targetLevel !== undefined && b.busyUntil !== undefined && b.busyUntil <= now) {
      b.level = b.targetLevel
      if (bId === 'remparts') s.wallHp = murMax(s)
      lignes.push(`🏗️ ${BUILDINGS[bId].nom} achevé(e) au niveau ${b.level}`)
      delete b.targetLevel
      delete b.busyUntil
    }
  }

  // recrutements
  let formes = 0
  while (s.recruitQueue.length > 0 && s.recruitQueue[0].finishAt <= now) {
    const job = s.recruitQueue[0]
    s.army[job.unit]++
    formes++
    job.restant--
    if (job.restant <= 0) s.recruitQueue.shift()
    else job.finishAt += UNITS[job.unit].time * 1000
  }
  if (formes > 0) lignes.push(`🛡️ ${formes} recrue(s) ont terminé leur formation`)

  // croissance de population
  const cap = popCap(s)
  const gagnes = Math.min(Math.floor(dt / 45_000), Math.max(0, cap - s.pop))
  if (gagnes > 0 && s.resources.grain > 0) {
    s.pop += gagnes
    lignes.push(`👥 +${gagnes} villageois`)
  }

  // attaques survenues hors-ligne (max 3)
  let n = 0
  while (s.nextAttackAt <= now && n < 3) {
    n++
    const wave = s.incomingWave ?? genererVague(calcThreat(s, s.nextAttackAt))
    // les fronts annoncés la veille, ou ceux que la menace commandait cette nuit-là
    const fronts = frontsDeLaNuit(s)
    /*
     * Le champion annoncé mène la colonne, onglet fermé comme onglet ouvert.
     * Sans cela, apprendre qu'Achille marche sur le village serait devenu une
     * bonne raison de quitter la page - la nuit l'aurait effacé.
     */
    const champNuit = n === 1 ? s.incomingChampion : null
    const res = resoudreHorsLigne(
      wave,
      s.army,
      s.buildings.remparts.level,
      s.wallHp,
      s.tours,
      fronts,
      champNuit !== null,
    )
    if (champNuit) {
      const fiche = ficheChampion(champNuit)
      lignes.push(`${fiche.emoji} ${fiche.nom} menait la colonne cette nuit-là.`)
    }
    for (const [u, p] of Object.entries(res.pertes) as [UnitId, number][]) {
      s.army[u] = Math.max(0, s.army[u] - p)
    }
    s.wallHp = Math.max(0, s.wallHp - res.degatsRemparts)
    // au réveil, on doit voir par où ils sont passés - et sur QUELS pans
    if (res.anglesOuverts.length > 0) {
      s.brechesMur = [...new Set([...s.brechesMur, ...res.anglesOuverts])]
    }
    if (res.victoire) {
      s.stats.repousses++
      const nomsPans = res.anglesOuverts.length > 0 ? ` - ${motPans(res.anglesOuverts)} à relever` : ''
      lignes.push(`⚔️ Assaut nocturne (${descVague(wave)}) repoussé par la garnison !${nomsPans}`)
    } else {
      s.stats.perdus++
      const vol = volerPct(s, res.volePct)
      const par = res.anglesOuverts.length > 0 ? ` par ${motPans(res.anglesOuverts)}` : ''
      lignes.push(`💀 Assaut nocturne (${descVague(wave)}) : le village a été pillé${par} (${vol})`)
      s.moraleMods.push({ id: uid('m'), label: 'Pillé pendant la nuit', delta: -10, expiresAt: now + 8 * 60_000 })
      // un sac coûte des vies, pas seulement des réserves
      const civils = Math.min(Math.max(0, s.pop - 2), 1 + Math.floor(Math.random() * 2))
      if (civils > 0) {
        s.pop -= civils
        noter(s, 'pertesCiviles', civils)
        lignes.push(`⚰️ ${civils} habitant${civils > 1 ? 's' : ''} n’${civils > 1 ? 'ont' : 'a'} pas survécu au sac.`)
      }
    }
    s.incomingWave = null
    s.incomingFronts = null
    s.incomingChampion = null
    s.warned = false
    s.defRecompense = null
    s.nextAttackAt += ASSAUT_MIN_MS + Math.random() * (ASSAUT_MAX_MS - ASSAUT_MIN_MS)
  }

  // effets différés échus
  const echus = s.pendingEffects.filter((e) => e.at <= now)
  s.pendingEffects = s.pendingEffects.filter((e) => e.at > now)
  for (const e of echus) appliquerEffetDiffere(s, e, now)

  if (lignes.length === 1) lignes.push('Rien à signaler - le village a dormi en paix.')
  s.offlineSummary = lignes
}

// ─────────────────────────────────────────────────────────────────────────────
export const useGame = create<GameState>()(
  immer((set, get) => ({
    ...etatInitial(Date.now()),

    init: () => {
      /*
       * On charge l'emplacement ACTIF. La clé historique reste celle du premier :
       * un joueur qui rouvre le jeu après la mise à jour retrouve sa partie là où
       * elle a toujours été, et découvre seulement qu'il y a deux cases de plus.
       * La migration « ILION » ne vaut, elle, que pour ce premier emplacement.
       */
      const cle = cleEmplacement(emplacementActif())
      const brut = localStorage.getItem(cle) ?? (cle === STORAGE_KEY ? localStorage.getItem(ANCIEN_STORAGE_KEY) : null)
      const now = Date.now()
      if (brut) {
        try {
          const data = JSON.parse(brut) as Partial<GameState>
          set((s) => {
            Object.assign(s, etatInitial(now), data, {
              battle: null,
              expedition: null,
              battleReport: null,
              offlineSummary: null,
              toasts: [],
              selected: null,
              panel: null,
              arcHeros: null,
              arcIssue: null,
              renfortsEngages: null,
              finDePartie: null,
            })
            // une sauvegarde antérieure aux hauts faits n'a ni liste ni compteurs
            s.hautsFaits = s.hautsFaits ?? []
            s.exploits = s.exploits ?? {}
            s.alliances = s.alliances ?? {}
            /*
             * ⚠️ L'ARMÉE, D'ABORD. `Object.assign` REMPLACE la table des effectifs
             * par celle du fichier : une sauvegarde écrite avant le frondeur, le
             * peltaste et le bélier arrive donc avec trois clés manquantes. Tout ce
             * qui somme les six unités - `armeeTotale`, la consommation de grain, la
             * puissance d'une garnison - rendait alors NaN, et le NaN se propageait
             * aux ressources dès le premier battement. C'était le bogue : une partie
             * d'avant la mise à jour affichait « NaN grain » puis se figeait.
             *
             * Même raisonnement pour tout ce qui a été ajouté depuis : on complète
             * sans jamais écraser ce qui a été joué.
             */
            s.army = troupes(s.army ?? {})
            /*
             * Même piège pour les TABLES : bâtiments, dieux, ressources. Chacune
             * est remplacée en bloc par celle du fichier, et il suffit d'une clé
             * manquante - un bâtiment ajouté depuis, un fichier écrit à la main -
             * pour que le premier rendu lise `undefined.level` et vide la page.
             * On recompose donc chaque table sur la liste de référence, en gardant
             * ce que le fichier dit et en comblant le reste.
             */
            // le `Partial` n'est pas cosmétique : le type PROMET les clés, le
            // fichier ne les tient pas - c'est tout le sujet de cette migration
            s.buildings = Object.fromEntries(
              BUILDING_IDS.map((b) => [b, { level: 0, ...((s.buildings?.[b] ?? {}) as Partial<BuildingState>) }]),
            ) as Record<BuildingId, BuildingState>
            s.gods = Object.fromEntries(
              GOD_IDS.map((g) => [
                g,
                { relation: 0, cooldownUntil: 0, ...((s.gods?.[g] ?? {}) as Partial<GodState>) },
              ]),
            ) as Record<GodId, GodState>
            /*
             * Et l'on désinfecte les nombres. Un NaN écrit une fois dans le fichier
             * y reste pour toujours et contamine tout ce qu'il touche - c'est
             * exactement ce qui arrivait aux ressources d'une partie reprise après
             * l'ajout des trois unités.
             */
            const nombre = (x: unknown, defaut: number): number =>
              typeof x === 'number' && Number.isFinite(x) ? x : defaut
            for (const r of Object.keys(RES) as ResourceId[]) {
              s.resources[r] = Math.max(0, nombre(s.resources?.[r], 0))
            }
            s.faveur = Math.max(0, Math.min(FAVEUR_MAX, nombre(s.faveur, 0)))
            s.pop = Math.max(0, Math.round(nombre(s.pop, 0)))
            s.wallHp = Math.max(0, nombre(s.wallHp, 0))
            s.morale = Math.max(0, Math.min(100, nombre(s.morale, 50)))
            s.relations = s.relations ?? {}
            s.graces = Array.isArray(s.graces) ? s.graces : []
            /*
             * La campagne, ensuite. Une partie commencée avant le VERROUILLAGE des
             * objectifs n'a pas de liste `objectifsFaits` : le suivi d'acte lisait
             * alors `undefined.includes(...)` et vidait la page au premier rendu.
             * On recompose l'avancement au complet, en gardant ce qui a été joué.
             */
            if (s.campagne) {
              const c = s.campagne as Partial<EtatCampagne>
              s.campagne = {
                acte: Math.max(0, Math.min(NB_ACTES - 1, Math.round(nombre(c.acte, 0)))),
                debutActe: nombre(c.debutActe, now),
                base: {
                  repousses: nombre(c.base?.repousses, 0),
                  perdus: nombre(c.base?.perdus, 0),
                  evenements: nombre(c.base?.evenements, 0),
                  exploits: c.base?.exploits ?? {},
                },
                prologueVu: c.prologueVu ?? true,
                objectifsFaits: Array.isArray(c.objectifsFaits) ? c.objectifsFaits : [],
                accompli: !!c.accompli,
                perdu: !!c.perdu,
                fini: !!c.fini,
              }
            }
            s.annales = Array.isArray(s.annales) ? s.annales : []
            if (typeof s.prochainReleveAt !== 'number') s.prochainReleveAt = now + PAS_RELEVE_MS
            s.incomingChampion = s.incomingChampion ?? null
            // avant les métiers, les habitants n'en avaient pas : on leur en donne
            // un cohérent avec le poste qu'ils tiennent déjà, pour ne pas les punir
            for (const v of s.villageois) {
              if (!v.metier) v.metier = v.poste ?? tirerMetier()
            }
            /*
             * Avant les lignées, un habitant n'avait ni âge ni maison. Sans date de
             * naissance il serait lu comme un adulte de trente ans - passable - mais
             * sans MAISON, `trouverParti` refuserait de le marier à quiconque (deux
             * `undefined` se valent), et un vieux village n'aurait plus jamais un
             * seul foyer. On donne donc à chacun un âge d'adulte échelonné et une
             * maison, et le village reprend sa vie là où il en était.
             */
            const jourRepris = jourDe({ lastSeen: s.lastSeen, createdAt: s.createdAt })
            s.villageois.forEach((v, i) => {
              if (v.neLe === undefined) v.neLe = jourRepris - (9 + (i % 13))
              if (!v.lignee) {
                v.lignee = ligneeLibre(
                  s.villageois.map((x) => x.lignee ?? ''),
                  ((i * 37) % 100) / 100,
                )
              }
            })
            // on ne rejoue pas d'un coup les noces et les deuils des journées passées
            s.dernierJourVecu = jourRepris
            // une sauvegarde antérieure à la campagne est un bac à sable : on ne
            // rouvre pas l'écran de choix à un joueur qui a déjà une cité
            if (s.mode == null) s.mode = 'bac-a-sable'
            // une partie reprise qui n'est pas en pleine leçon a déjà commencé :
            // les dilemmes doivent pouvoir tomber, même sur une vieille sauvegarde
            if (s.tutoriel === null) s.tutorialDone = true
            // sauvegardes antérieures aux héros : on complète les champs manquants
            // sans jamais écraser ce qui a déjà été joué
            s.heros = Object.fromEntries(
              HERO_IDS.map((h) => [h, { ...etatHeroInitial(), ...(s.heros?.[h] ?? {}) }]),
            ) as Record<HeroId, HeroState>
            simulerHorsLigne(s, now)
            s.lastSeen = now
            // ne jamais reprendre avec une attaque « dans le passé »
            if (s.nextAttackAt <= now + 30_000) s.nextAttackAt = now + 60_000
          })
          // écrire la nouvelle clé AVANT de retirer l'ancienne : aucune fenêtre sans sauvegarde
          get().save()
          localStorage.removeItem(ANCIEN_STORAGE_KEY)
          return
        } catch {
          // sauvegarde corrompue : nouvelle partie
        }
      }
      /*
       * Première partie : on demande d'abord COMMENT on veut jouer (bac à sable ou
       * campagne). C'est `choisirMode` qui lance la leçon de Zeus ou l'acte I -
       * démarrer le tutoriel ici le ferait passer par-dessus l'écran de choix.
       */
      set((s) => {
        Object.assign(s, etatInitial(now))
      })
    },

    tick: () => {
      const now = Date.now()
      set((s) => {
        const dtMs = Math.min(2000, Math.max(0, now - s.lastSeen))
        const dt = dtMs / 1000
        s.lastSeen = now

        // ── vitesse du jeu (façon Sims) : ×1 forcé pendant les batailles ──
        const enBataille = s.battle !== null || (s.expedition !== null && !s.expedition.result)
        const vitesse = enBataille ? 1 : s.vitesse
        /** secondes de jeu écoulées ce tick */
        const dtJeu = dt * vitesse
        // on rapproche toutes les échéances du présent : le temps « avance » plus vite
        const avance = dtMs * (vitesse - 1)
        if (avance > 0) {
          s.createdAt -= avance // cycle jour/nuit et menace accélérés
          s.nextPopAt -= avance
          s.nextAttackAt -= avance
          s.lastEventAt -= avance
          if (s.nextDesertAt > 0) s.nextDesertAt -= avance
          if (s.droughtUntil > now) s.droughtUntil -= avance
          if (s.aresBoostUntil > now) s.aresBoostUntil -= avance
          s.meteoJusqua -= avance
          if (s.rappelHerosAt > now) s.rappelHerosAt -= avance
          for (const h of HERO_IDS) {
            const e = s.heros[h]
            if (!e) continue
            if (e.cooldownUntil > now) e.cooldownUntil -= avance
            if (e.boudeJusqua > now) e.boudeJusqua -= avance
          }
          for (const bId of BUILDING_IDS) {
            const b = s.buildings[bId]
            if (b.busyUntil !== undefined) b.busyUntil -= avance
          }
          for (const job of s.recruitQueue) job.finishAt -= avance
          for (const g of GOD_IDS) {
            if (s.gods[g].cooldownUntil > now) s.gods[g].cooldownUntil -= avance
          }
          for (const m of s.moraleMods) {
            if (m.expiresAt !== null) m.expiresAt -= avance
          }
          for (const e of s.pendingEffects) e.at -= avance
          for (const k of Object.keys(s.eventCooldowns)) s.eventCooldowns[k] -= avance
          for (const k of Object.keys(s.expeditions)) s.expeditions[k].dernierRaid -= avance
          for (const k of Object.keys(s.alliances)) s.alliances[k].tributAt -= avance
          s.prochainAppelAt -= avance
          if (s.appelSecours) s.appelSecours.expireAt -= avance
        }

        // les habitants suivent la population (naissances, pertes, récompenses)
        syncVillageois(s)

        // morale & menace
        s.moraleMods = s.moraleMods.filter((m) => m.expiresAt === null || m.expiresAt > now)
        s.morale = calcMorale(s, now)
        s.threatMod = s.threatMod < 0 ? Math.min(0, s.threatMod + dtJeu / 60) : s.threatMod
        s.threat = calcThreat(s, now)

        // le calendrier tourne : printemps → été → automne → hiver, et le ciel avec
        tournerCiel(s, now)
        // les héros mangent et exigent des honneurs, même en temps de paix
        if (!MODE_TEST) entretenirHeros(s, now, dtJeu)

        // la Troade vit sa vie : on appelle au secours, on paie tribut, on tombe
        tirerAppelSecours(s, now)
        expirerAppel(s, now)
        verserTributs(s, now)

        /*
         * Campagne : on relit les objectifs de l'acte à chaque battement. On ne
         * juge ni pendant une bataille ni pendant une expédition - un acte ne
         * doit pas s'achever au milieu d'une mêlée, l'épilogue passerait
         * par-dessus la scène.
         */
        if (s.campagne && !s.campagne.fini && s.campagne.prologueVu && !enBataille) {
          const acte = ACTES_CAMPAGNE[s.campagne.acte]
          const vue = etatActe(s)
          if (acte && !s.campagne.accompli && !s.campagne.perdu) {
            /*
             * On VERROUILLE chaque objectif au moment où sa jauge se remplit. Sans
             * cela, tenir tous les objectifs EN MÊME TEMPS devenait le vrai
             * objectif - et l'acte I était infinissable, puisque l'assaut qu'il
             * demande de repousser tue les lances qu'il demande de lever.
             */
            for (const o of acte.objectifs) {
              if (s.campagne.objectifsFaits.includes(o.id)) continue
              const p = o.progres(vue)
              if (p.cur >= p.max) {
                s.campagne.objectifsFaits.push(o.id)
                pushToast(s, '◆', `Objectif franchi : ${o.texte}`)
              }
            }
            if (acte.defaite?.atteinte(vue)) {
              s.campagne.perdu = true
              pushToast(s, '💀', `${acte.titre} : le village n’a pas tenu.`)
            } else if (acteAccompli(acte, s.campagne.objectifsFaits)) {
              s.campagne.accompli = true
              pushToast(s, acte.emoji, `${acte.titre} - accompli !`)
            }
          }
        }

        // mode test : coffres pleins en permanence
        if (MODE_TEST) {
          const max = stockageMax(s)
          for (const r of Object.keys(RES) as ResourceId[]) s.resources[r] = max
          s.faveur = FAVEUR_MAX
          if (s.pop < popCap(s)) s.pop = popCap(s)
        } else {
          // production - chaque atelier ne rend qu'au prorata de ses postes tenus
          const parMin = productionParMinute(s, now)
          for (const r of Object.keys(parMin) as ResourceId[]) {
            s.resources[r] = clampRes(s, r, s.resources[r] + (parMin[r] / 60) * dtJeu)
          }
          const conso = (s.pop * CONSO_POP + armeeTotale(s.army) * CONSO_SOLDAT) / 60
          s.resources.grain = Math.max(0, s.resources.grain - conso * dtJeu)
          // sans prêtre au temple, les dieux n'entendent rien
          s.faveur = Math.min(
            FAVEUR_MAX,
            s.faveur +
              ((PROD.temple[s.buildings.temple.level] * rendement(s, 'temple') * (1 + bonusFaveurs(s).faveurPct)) / 60) *
                dtJeu,
          )
        }

        // désertions en cas de moral effondré
        if (s.morale <= 5 && armeeTotale(s.army) > 0) {
          if (s.nextDesertAt === 0) s.nextDesertAt = now + 60_000
          else if (now >= s.nextDesertAt) {
            retirerSoldats(s, 1)
            s.nextDesertAt = now + 60_000
            pushToast(s, '🏃', 'Un soldat déserte - le moral est au plus bas !')
          }
        } else {
          s.nextDesertAt = 0
        }

        /*
         * Population. Le grenier vide ne coûtait jusqu'ici qu'un malus de moral :
         * on pouvait laisser le grain à zéro indéfiniment sans qu'un habitant ne
         * bouge. Désormais on part - par petits groupes, la nuit, comme le
         * racontent les rapports. Jamais sous deux âmes cependant : un village
         * peut se réduire à un hameau, il ne s'éteint pas de faim.
         */
        if (now >= s.nextPopAt) {
          s.nextPopAt = now + 45_000
          if (s.resources.grain > 0 && s.morale >= 30 && s.pop < popCap(s)) s.pop++
          else if (s.resources.grain <= 0 && s.pop > 2) {
            s.pop--
            noter(s, 'pertesCiviles')
            pushToast(s, '🥖', 'Un foyer quitte le village : il n’y a plus rien dans les greniers.')
          }
        }

        // constructions
        for (const bId of BUILDING_IDS) {
          const b = s.buildings[bId]
          if (b.targetLevel !== undefined && b.busyUntil !== undefined && b.busyUntil <= now) {
            b.level = b.targetLevel
            if (bId === 'remparts') {
              s.wallHp = murMax(s)
              s.brechesMur = []
            }
            pushToast(s, BUILDINGS[bId].emoji, `${BUILDINGS[bId].nom} : niveau ${b.level} achevé !`)
            delete b.targetLevel
            delete b.busyUntil
            /*
             * Le chantier ouvre des postes - mais PERSONNE ne s'y met tout seul.
             * C'est au joueur de choisir qui va où, et de préférence quelqu'un
             * dont c'est le métier. On se contente de le lui signaler.
             */
            const aPourvoir = postesTotal(s, bId) - postesPourvus(s, bId)
            if (aPourvoir > 0) {
              const nomMetier = METIERS[bId] ?? 'ouvriers'
              pushToast(
                s,
                '👷',
                `${BUILDINGS[bId].nom} : ${aPourvoir} poste${aPourvoir > 1 ? 's' : ''} de ${nomMetier.toLowerCase()} à pourvoir - sans personne, l’atelier ne rend rien.`,
              )
            }
          }
        }

        // recrutement
        if (s.recruitQueue.length > 0 && s.recruitQueue[0].finishAt <= now) {
          const job = s.recruitQueue[0]
          s.army[job.unit]++
          job.restant--
          pushToast(s, UNITS[job.unit].emoji, `${UNITS[job.unit].nom} prêt au combat`)
          if (job.restant <= 0) s.recruitQueue.shift()
          else {
            const vitesse = MODE_TEST
              ? 0.03
              : (s.buildings.caserne.level >= 4 ? 0.75 : 1) * (now < s.aresBoostUntil ? 0.5 : 1)
            job.finishAt = now + UNITS[job.unit].time * 1000 * vitesse
          }
        }

        // effets différés
        if (s.pendingEffects.some((e) => e.at <= now)) {
          const echus = s.pendingEffects.filter((e) => e.at <= now)
          s.pendingEffects = s.pendingEffects.filter((e) => e.at > now)
          for (const e of echus) appliquerEffetDiffere(s, e, now)
        }

        // ── expédition en cours ──
        if (s.expedition && !s.expedition.result) {
          const v = VILLAGES_PAR_ID[s.expedition.villageId]
          const b = s.expedition.battle
          if (now - b.startedAt > EXPEDITION_TIMEOUT_MS) sonnerRetraite(b)
          const out = tickBataille(b, {
            now,
            dt,
            wallHp: s.expedition.wallHp,
            wallLevel: v.mur,
            mods: modsBataille(s.meteo),
          })
          s.expedition.wallHp = out.wallHp
          if (out.brecheOuverte) pushToast(s, '💥', `Brèche dans les murs de ${v.nom} !`)
          if (out.finie) finirExpedition(s, v, out.pillage, now)
        }

        // ── attaques sur le village ──
        if (!s.battle) {
          // par la brume, les éclaireurs voient trop tard ; Ulysse et Cassandre
          // rendent au contraire de précieuses minutes
          const fenetre =
            (s.buildings.remparts.level >= 2 ? ALERTE_LONGUE_MS : ALERTE_MS) * METEOS[s.meteo].alerte +
            bonusHeros(s).alerteBonusMs
          if (!s.warned && now >= s.nextAttackAt - fenetre) {
            armerAlerte(s)
            pushToast(s, '🐎', `Éclaireurs : ${tailleVague(s.incomingWave!)} assaillants approchent par l’est !`)
          }
          if (now >= s.nextAttackAt) {
            if (s.expedition) {
              // vos troupes sont au loin : l'ennemi temporise
              s.nextAttackAt = now + 45_000
            } else {
              armerAlerte(s)
              // la vague se scinde entre les fronts tirés dès l'alerte
              const bh = bonusHeros(s)
              // les alliés dépêchent des hommes : ils tomberont avant les vôtres
              const renf = renfortsAllies(s)
              const totalRenf = UNIT_IDS.reduce((a, u) => a + renf[u], 0)
              s.renfortsEngages = totalRenf > 0 ? renf : null
              if (totalRenf > 0) {
                pushToast(s, '🤝', `${totalRenf} combattant${totalRenf > 1 ? 's' : ''} envoyé${totalRenf > 1 ? 's' : ''} par vos alliés prennent place sur les remparts.`)
              }
              s.battle = creerBataille({
                attaquants: s.incomingWave!,
                // votre garnison ET les renforts alliés, unité par unité : les
                // six types y passent, y compris ceux qu'un allié n'envoie jamais
                defenseurs: troupes(
                  Object.fromEntries(UNIT_IDS.map((u) => [u, s.army[u] + (renf[u] ?? 0)])) as Record<UnitId, number>,
                ),
                wallLevel: s.buildings.remparts.level,
                now,
                geo: GEO_VILLAGE,
                campJoueur: 'defense',
                tours: s.tours,
                fronts: frontsAnnonces(s),
                wallHpTotal: s.wallHp,
                // les alliés ferment la ligne, à leurs couleurs : on doit voir
                // qui est venu mourir pour vos murs
                renforts: totalRenf > 0 ? renf : undefined,
                // la fureur d'Arès s'ajoute aux passifs des héros
                bonusAtkJoueur: 1 + bh.degatsMeleePct + bonusFaveurs(s).degatsPct,
                // `gardeDuCorpsPct` porte désormais la valeur ANNONCÉE au joueur :
                // plus de division cachée par deux entre la fiche et l'usage
                reducJoueur: 1 - bh.gardeDuCorpsPct,
                // l'Ébranleur du sol allonge le tir des tours
                porteeTours: 1 + bonusFaveurs(s).porteePct,
                // le nom annoncé par les éclaireurs marche bien en tête de colonne
                champion: s.incomingChampion ? CHAMPION_PAR_ID[s.incomingChampion] : undefined,
                // les héros ne regardent pas depuis les murs : ils descendent
                herosPresents: herosAuCombat(s, now),
              })
              if (s.buildings.ferme.level > 0) {
                s.resources.grain = Math.max(0, s.resources.grain * 0.97) // champs piétinés
              }
              pushToast(s, '⚔️', 'À L’ASSAUT ! Défendez le village !')
            }
          }
        } else {
          // bataille en cours
          const out = tickBataille(s.battle, {
            now,
            dt,
            wallHp: s.wallHp,
            wallLevel: s.buildings.remparts.level,
            mods: modsBataille(s.meteo),
          })
          s.wallHp = out.wallHp
          if (out.brecheOuverte) pushToast(s, '💥', 'BRÈCHE ! Les remparts ont cédé !')
          /*
           * Le champion lance sa manœuvre, ou tombe. Les deux se disent : l'une
           * pour qu'on sache ce qui vient de changer sous nos yeux, l'autre parce
           * qu'abattre un nom pareil est le fait d'armes d'un règne.
           */
          const champ = s.battle?.champion
          if (out.championAgit && champ) {
            const def = CHAMPION_PAR_ID[champ.id]
            pushToast(s, def.capacite.emoji, `${champ.nom} : ${def.capacite.nom} !`)
          }
          if (out.championAbattu && champ) {
            const def = CHAMPION_PAR_ID[champ.id]
            s.resources.bronze = clampRes(s, 'bronze', s.resources.bronze + def.butin.bronze)
            s.faveur = Math.min(FAVEUR_MAX, s.faveur + def.butin.faveur)
            s.gods.ares.relation = Math.min(100, s.gods.ares.relation + 10)
            noter(s, 'championsAbattus')
            pushToast(s, '💀', `${champ.nom} est tombé sous vos murs !`)
            pushReport(s, champ.emoji, `${champ.nom} est tombé`, [
              `On a dépouillé le corps d’un héros devant votre porte. Les aèdes s’en empareront.`,
              `Sa manœuvre - ${def.capacite.nom} - s’est éteinte avec lui.`,
              `Butin : +${def.butin.bronze} 🪙, +${def.butin.faveur} ✨. Arès, qui aime le sang versé, vous en sait gré (+10).`,
            ])
          }
          if (out.finie) finirBataille(s, out.victoireDefense, out.fuite, now)
        }

        // ── événements ──
        if (
          !s.activeEvent &&
          !s.eventOutcome &&
          !s.arcHeros &&
          !s.battle &&
          !s.expedition &&
          s.tutoriel === null &&
          s.tutorialDone &&
          now - s.lastEventAt > 60_000
        ) {
          const eligibles = EVENTS.filter(
            (e) => (s.eventCooldowns[e.id] ?? 0) <= now && (!e.condition || e.condition(snap(s))),
          )
          const crises = eligibles.filter((e) => e.priorite)
          const pool = crises.length > 0 ? crises : eligibles
          const proba = crises.length > 0 ? (dtMs * vitesse) / 20_000 : (dtMs * vitesse) / 210_000
          if (pool.length > 0 && Math.random() < proba) {
            const somme = pool.reduce((a, e) => a + e.weight, 0)
            let r = Math.random() * somme
            let choisi = pool[0]
            for (const e of pool) {
              r -= e.weight
              if (r <= 0) {
                choisi = e
                break
              }
            }
            s.activeEvent = { defId: choisi.id, roll: Math.random(), startedAt: now }
            s.lastEventAt = now
          }
        }

        // ── un héros attend votre parole (jamais pendant un dilemme ni un assaut) ──
        if (s.tutorialDone) ouvrirArcMur(s)

        // ── hauts faits : on regarde si le règne vient d'entrer dans la légende ──
        verifierHautsFaits(s)

        /*
         * ── les familles : noces et enterrements, une fois par journée ──
         * On ne rattrape jamais plus d'UNE journée : rentrer après six heures
         * d'absence ne doit pas marier la moitié du village d'un coup.
         */
        {
          const jour = jourDe(s)
          if (jour !== s.dernierJourVecu) {
            s.dernierJourVecu = jour
            vieDesFamilles(s, jour)
          }
        }

        /*
         * ── les annales : un relevé chiffré toutes les trente secondes ──
         * On rattrape au plus un pas : rentrer après huit heures d'absence ne
         * doit pas remplir le tableau de mille points identiques.
         */
        if (now >= s.prochainReleveAt) {
          releverAnnales(s, now)
          s.prochainReleveAt = now + PAS_RELEVE_MS
        }

        /*
         * Missions prêtes à réclamer (toast unique). En campagne, le fil rouge du
         * bac à sable se tait : ce sont les objectifs de l'acte qui commandent, et
         * deux séries de consignes concurrentes ne feraient qu'embrouiller.
         */
        for (const m of s.campagne ? [] : missionsActives(s.missionsReclamees)) {
          if (s.missionsNotifiees.includes(m.id)) continue
          const p = m.progres(s)
          if (p.cur >= p.max && m.id !== 'nouveau-depart') {
            s.missionsNotifiees.push(m.id)
            pushToast(s, '🏅', `Mission accomplie : ${m.titre} - réclamez votre récompense !`)
          }
        }

        // toasts expirés
        s.toasts = s.toasts.filter((t) => t.until > now)
      })

      // sauvegarde périodique (toutes les ~10 s)
      const st = get()
      if (!st.battle && !st.expedition && now % 10_000 < 300) st.save()
    },

    upgrade: (bId) => {
      set((s) => {
        const b = s.buildings[bId]
        const def = BUILDINGS[bId]
        const cible = b.level + 1
        if (b.targetLevel !== undefined || cible > 4) return
        if (bId !== 'agora' && cible > s.buildings.agora.level) {
          pushToast(s, '🏛️', `L’Agora doit d’abord atteindre le niveau ${cible}.`)
          return
        }
        const chantiers = BUILDING_IDS.filter((x) => s.buildings[x].targetLevel !== undefined).length
        if (chantiers >= 2) {
          pushToast(s, '🏗️', 'Vos ouvriers ne peuvent mener que 2 chantiers de front.')
          return
        }
        if (!payer(s, def.costs[cible - 1])) {
          pushToast(s, '❌', 'Ressources insuffisantes.')
          return
        }
        b.targetLevel = cible
        b.busyUntil = Date.now() + (MODE_TEST ? 1500 : def.times[cible - 1] * 1000)
        pushToast(s, '🏗️', `${def.nom} : chantier du niveau ${cible} lancé.`)
      })
    },

    recruter: (u, n) => {
      set((s) => {
        const def = UNITS[u]
        if (s.buildings.caserne.level < def.caserne) return
        const cout: Partial<Record<ResourceId, number>> = {}
        for (const [r, c] of Object.entries(def.cost) as [ResourceId, number][]) cout[r] = c * n
        /*
         * On n'enrôle que des bras disponibles : un artisan reste à son poste, et
         * l'on ne met pas une lance dans les mains d'un enfant. Un village peuplé
         * de nourrissons ne lève donc pas d'armée - c'est le prix d'une natalité
         * qu'on n'a pas préparée.
         */
        const jourCourant = jourDe(s)
        const dispo = s.villageois.filter((v) => v.poste === null && estAdulte(v, jourCourant))
        if (dispo.length < n) {
          const enfants = s.villageois.filter((v) => v.poste === null && !estAdulte(v, jourCourant)).length
          pushToast(
            s,
            '👥',
            dispo.length === 0
              ? enfants > 0
                ? `Aucun adulte disponible - ${enfants} enfant${enfants > 1 ? 's' : ''} attend${enfants > 1 ? 'ent' : ''} de grandir.`
                : 'Aucun villageois disponible - libérez un artisan de son poste.'
              : `Seulement ${dispo.length} adulte(s) sans emploi.`,
          )
          return
        }
        if (!payer(s, cout)) {
          pushToast(s, '❌', 'Ressources insuffisantes.')
          return
        }
        // les recrues quittent le village pour la caserne
        const noms = dispo.slice(0, n).map((v) => v.nom)
        for (const v of dispo.slice(0, n)) {
          s.villageois.splice(s.villageois.indexOf(v), 1)
        }
        s.pop -= n
        pushToast(s, def.emoji, `${noms.join(', ')} prend${n > 1 ? 'nent' : ''} les armes.`)
        const now = Date.now()
        const vitesse = MODE_TEST
          ? 0.03
          : (s.buildings.caserne.level >= 4 ? 0.75 : 1) *
            (now < s.aresBoostUntil ? 0.5 : 1) *
            // « Métier » : Athéna presse les casernes, pour toujours
            (1 - bonusFaveurs(s).recruesPct)
        const dernier = s.recruitQueue[s.recruitQueue.length - 1]
        const debut = dernier ? dernier.finishAt + (dernier.restant - 1) * UNITS[dernier.unit].time * 1000 * vitesse : now
        s.recruitQueue.push({ unit: u, restant: n, finishAt: debut + def.time * 1000 * vitesse })
      })
    },

    reparerRemparts: () => {
      set((s) => {
        if (s.battle) return
        const max = murMax(s)
        const manque = max - s.wallHp
        if (manque <= 0) return
        const cout = Math.ceil(manque / 8)
        if (!payer(s, { pierre: cout })) {
          pushToast(s, '❌', `Il faut ${cout} 🪨 pour réparer.`)
          return
        }
        s.wallHp = max
        s.brechesMur = []
        pushToast(s, '🧱', 'Remparts réparés : les pans effondrés sont relevés.')
      })
    },

    construireTour: () => {
      set((s) => {
        const max = TOURS_MAX[s.buildings.remparts.level]
        if (s.battle) return
        if (max === 0) {
          pushToast(s, '🏹', 'Il faut des remparts de niveau 2 pour asseoir une tour.')
          return
        }
        if (s.tours >= max) {
          pushToast(s, '🏹', 'L’enceinte ne peut porter davantage de tours - rehaussez les remparts.')
          return
        }
        if (!payer(s, TOUR_COUTS[s.tours])) {
          pushToast(s, '❌', 'Ressources insuffisantes.')
          return
        }
        s.tours++
        pushToast(s, '🏹', `Tour d’archers dressée (${s.tours}/${max}). Sa silhouette attire l’œil des pillards…`)
      })
      get().save()
    },

    affecter: (villageoisId, poste) => {
      set((s) => {
        const v = s.villageois.find((x) => x.id === villageoisId)
        if (!v) return
        if (poste === null) {
          v.poste = null
          return
        }
        if (postesTotal(s, poste) <= 0) {
          pushToast(s, '🚧', `${BUILDINGS[poste].nom} n’offre aucun poste à ce niveau.`)
          return
        }
        if (v.poste !== poste && postesPourvus(s, poste) >= postesTotal(s, poste)) {
          pushToast(s, '👥', `Tous les postes de ${BUILDINGS[poste].nom} sont déjà tenus.`)
          return
        }
        v.poste = poste
      })
      get().save()
    },

    echanger: (donner, recevoir) => {
      set((s) => {
        const niveau = s.buildings.port.level
        if (niveau < 1 || donner === recevoir) return
        // le comptoir échange à la valeur, marge du port comprise
        const coutDonne = coutEchange(niveau, donner, recevoir)
        const cout: Partial<Record<ResourceId, number>> = {}
        cout[donner] = coutDonne
        // entrepôt plein : on refuse AVANT d'encaisser, sinon le joueur paie pour rien
        if (s.resources[recevoir] >= stockageMax(s)) {
          pushToast(s, '📦', `L’entrepôt est plein de ${RES[recevoir].nom.toLowerCase()} : agrandissez l’Agora.`)
          return
        }
        if (!payer(s, cout)) {
          pushToast(s, '❌', `Il faut ${coutDonne} ${RES[donner].emoji} pour cet échange.`)
          return
        }
        s.resources[recevoir] = clampRes(s, recevoir, s.resources[recevoir] + LOT_ECHANGE)
        pushToast(s, '⚓', `Échange : −${coutDonne} ${RES[donner].emoji} → +${LOT_ECHANGE} ${RES[recevoir].emoji}`)
      })
    },

    sacrifier: (g) => {
      set((s) => {
        if (s.buildings.temple.level < GODS[g].temple) return
        if (!payer(s, { grain: 50 })) {
          pushToast(s, '❌', 'Il faut 50 🌾 pour un sacrifice.')
          return
        }
        s.gods[g].relation = Math.min(100, s.gods[g].relation + 8)
        s.faveur = Math.min(FAVEUR_MAX, s.faveur + 5)
        pushToast(s, GODS[g].emoji, `La fumée du sacrifice plaît à ${GODS[g].nom}. (+8 relation, +5 ✨)`)
      })
    },

    benir: (g) => {
      set((s) => {
        const dieu = GODS[g]
        const now = Date.now()
        const bataille = s.battle ?? (s.expedition && !s.expedition.result ? s.expedition.battle : null)
        if (s.buildings.temple.level < dieu.temple) return
        if (s.gods[g].cooldownUntil > now) return
        if (dieu.benediction.batailleUniquement && !bataille) {
          pushToast(s, dieu.emoji, `${dieu.benediction.nom} ne peut être invoquée qu’en bataille.`)
          return
        }
        if (g === 'poseidon' && murMax(s) <= 0) {
          pushToast(s, '🔱', 'Aucun rempart à consolider - bâtissez d’abord une enceinte.')
          return
        }
        const cout = coutBenediction(s, g)
        if (s.faveur < cout) {
          pushToast(s, '❌', `Il faut ${cout} ✨ de faveur.`)
          return
        }
        s.faveur -= cout
        s.gods[g].cooldownUntil = now + dieu.benediction.cooldown / (MODE_TEST ? 12 : 1)
        s.gods[g].relation = Math.min(100, s.gods[g].relation + 2)
        noter(s, 'benedictions')
        /*
         * Ferveur : plus le dieu vous chérit, plus son bras est lourd - et plus sa
         * manifestation est spectaculaire (le palier pilote la mise en scène).
         *
         * On lit la relation EFFECTIVE, pas la brute : l'orgueil d'Agamemnon
         * (−10 sur tous les Olympiens) était jusqu'ici purement cosmétique sur les
         * bénédictions. Le panthéon annonçait ×1,24, le joueur recevait ×1,30 - et
         * le seul héros dont le passif soit un DÉFAUT ne coûtait rien.
         */
        const rel = relationEffective(s, g)
        const force = multRelation(rel)
        const palier = palierFerveur(rel)
        const pct = (x: number) => Math.round(x * 100)
        if (bataille && g !== 'zeus') marqueDivine(bataille, now, g, palier)

        switch (g) {
          case 'zeus': {
            if (bataille) {
              // le ciel gronde déjà : la foudre du maître du tonnerre tombe plus lourd
              const orage = s.meteo === 'orage' ? BONUS_ORAGE_ZEUS : 1
              const touches = foudreDeZeus(bataille, now, force * orage, palier)
              pushToast(
                s,
                '⚡',
                `La foudre de Zeus frappe ${touches} ennemis (${pct(force * orage)} % de puissance)${orage > 1 ? ' - l’orage la porte !' : ''}`,
              )
            }
            break
          }
          case 'poseidon': {
            const max = murMax(s)
            const part = 0.45 * force
            s.wallHp = Math.min(max, Math.round(s.wallHp + max * part))
            // le trident ressoude : les pans à terre se relèvent, dedans comme dehors
            s.brechesMur = []
            // en pleine bataille, les pans effondrés se relèvent aussi
            if (s.battle) {
              if (s.battle.secteurs.some((x) => x.breche)) noter(s, 'brecheRecollee')
              for (const sec of s.battle.secteurs) {
                sec.hp = Math.min(sec.max, sec.hp + sec.max * part)
                if (sec.hp > 0) sec.breche = false
              }
              s.battle.breche = s.battle.secteurs.every((x) => x.breche)
            }
            pushToast(s, '🔱', `Les pierres se ressoudent : remparts restaurés de ${pct(part)} %.`)
            break
          }
          case 'athena': {
            if (bataille) {
              // ferveur haute = réduction plus forte ET plus longue
              const reduction = Math.max(0.15, 1 - 0.6 * force)
              bataille.defBuffUntil = now + 25_000 * force
              bataille.defBuffForce = reduction
              pushToast(
                s,
                '🦉',
                `L’Égide couvre vos combattants (−${pct(1 - reduction)} % de dégâts subis, ${Math.round(25 * force)} s).`,
              )
            }
            break
          }
          case 'ares': {
            if (bataille) {
              bataille.atkBuffUntil = now + 25_000 * force
              bataille.atkBuffForce = 1 + 0.6 * force
              pushToast(
                s,
                '🐗',
                `Fureur d’Arès : +${pct(0.6 * force)} % d’attaque pendant ${Math.round(25 * force)} s !`,
              )
            } else {
              s.aresBoostUntil = now + 60_000 * force
              if (s.recruitQueue.length > 0) {
                const job = s.recruitQueue[0]
                job.finishAt = now + (job.finishAt - now) / 2
              }
              pushToast(s, '🐗', `Arès presse vos recrues : formation accélérée (${Math.round(60 * force)} s).`)
            }
            break
          }
        }
      })
    },

    /*
     * Acheter une grâce. C'est le seul endroit du jeu où la relation à un dieu
     * DESCEND par la volonté du joueur : on troque la force des bénédictions à
     * venir contre un don qui ne s'éteint jamais. L'arbitrage est tout l'intérêt.
     */
    acquerirGrace: (id: string) => {
      set((s) => {
        const grace = GRACE_PAR_ID[id]
        if (!grace) return
        if (s.graces.includes(id)) return
        const g = dieuDe(id)
        if (!g) return
        if (s.buildings.temple.level < GODS[g].temple) {
          pushToast(s, '🏛️', `Il faut un temple de niveau ${GODS[g].temple} pour approcher ${GODS[g].nom}.`)
          return
        }
        // les grâces d'un dieu se prennent dans l'ordre : pas de saut de rang
        if (graceSuivante(g, s.graces)?.id !== id) {
          pushToast(s, GODS[g].emoji, `${GODS[g].nom} n’accorde ses dons que l’un après l’autre.`)
          return
        }
        // on paie en relation EFFECTIVE : l'orgueil du roi rend les dons plus chers
        if (relationEffective(s, g) < grace.cout) {
          pushToast(s, '❌', `Il faut ${grace.cout} de relation avec ${GODS[g].nom} - la vôtre n’y suffit pas.`)
          return
        }
        s.gods[g].relation = Math.max(-100, s.gods[g].relation - grace.cout)
        s.graces.push(id)
        noter(s, 'graces')
        pushToast(
          s,
          grace.emoji,
          `${GODS[g].nom} vous accorde « ${grace.nom} » - pour toujours. (−${grace.cout} de relation)`,
        )
        pushReport(s, grace.emoji, `Grâce de ${GODS[g].nom} : ${grace.nom}`, [
          grace.desc,
          `Vous avez versé ${grace.cout} points de relation. Le don, lui, ne se reprend pas.`,
        ])
      })
    },

    /*
     * Un ordre à la troupe. Il ne se donne qu'en bataille - défense du village
     * comme expédition, ce sont les mêmes hommes - et il se TIENT : cinq secondes
     * avant d'en changer, faute de quoi on alternerait charge et mur de boucliers
     * à chaque coup porté, ce qui n'est plus une décision mais un tapotement.
     */
    donnerOrdre: (quoi, valeur) => {
      set((s) => {
        const b = batailleDuJoueur(s)
        if (!b || b.result) return
        const o = ordresDe(b)
        if (o[quoi] === valeur) return
        const now = Date.now()
        if (now < o.prochainAt) return
        if (quoi === 'ligne') {
          o.ligne = valeur as OrdreLigne
          const e = EFFETS_LIGNE[o.ligne]
          pushToast(s, e.emoji, `Ordre transmis : ${e.nom.toLowerCase()}.`)
        } else {
          o.tir = valeur as OrdreTir
          const e = EFFETS_TIR[o.tir]
          pushToast(s, e.emoji, `Ordre transmis aux tireurs : ${e.nom.toLowerCase()}.`)
        }
        o.prochainAt = now + DELAI_ORDRE_MS
      })
    },

    /*
     * Assigner un type d'unité à un pan de l'enceinte. Ces hommes-là tiennent CE
     * secteur : ils s'y postent, n'y frappent que ce qui l'assaille, et ne courent
     * plus au plus chaud. C'est la seule réponse possible à un assaut sur trois
     * fronts quand on n'a pas trois garnisons.
     */
    assignerSecteur: (u, secteur) => {
      set((s) => {
        const b = batailleDuJoueur(s)
        if (!b || b.result) return
        const o = ordresDe(b)
        if (secteur === null) delete o.secteurs[u]
        else if (secteur >= 0 && secteur < b.secteurs.length) o.secteurs[u] = secteur
        else return
        const nom = secteur === null ? 'au plus pressé' : b.secteurs[secteur].nom
        pushToast(s, UNITS[u].emoji, `${UNITS[u].nom}s : ${nom}.`)
      })
    },

    /*
     * ── Trois façons de traiter avec la Troade sans lever une lance ──
     *
     * Le jeu n'en offrait aucune : on pillait, on secourait, et c'était tout.
     * Un chef qui avait fâché un voisin ne pouvait plus rien y faire ; un chef
     * bien vu ne pouvait pas transformer cette estime en quoi que ce soit.
     */

    /** un présent rachète une rancune - et coûte cher, car réparer coûte plus que casser */
    offrirPresent: (villageId: string) => {
      set((s) => {
        const v = VILLAGES_PAR_ID[villageId]
        if (!v) return
        if (relationVillage(s, villageId) >= 100) {
          pushToast(s, v.emoji, `${v.nom} ne peut pas mieux vous vouloir.`)
          return
        }
        const cout = coutPresent(v)
        if (!payer(s, cout)) {
          pushToast(s, '❌', 'De quoi faire les présents d’usage vous manque.')
          return
        }
        bougerRelation(s, villageId, GAIN_PRESENT)
        noter(s, 'presents')
        pushToast(s, '🎁', `Présent porté à ${v.nom} (+${GAIN_PRESENT} de relation).`)
      })
    },

    /**
     * Un pacte : l'alliance achetée plutôt que méritée. Elle donne exactement ce
     * que donne un secours - tribut et renforts - mais elle se dénoue comme lui
     * si la relation retombe. C'est le chemin des riches, pas celui des braves.
     */
    proposerPacte: (villageId: string) => {
      set((s) => {
        const v = VILLAGES_PAR_ID[villageId]
        if (!v) return
        if (s.alliances[villageId]) {
          pushToast(s, '🤝', `${v.nom} est déjà votre allié.`)
          return
        }
        if (relationVillage(s, villageId) < SEUIL_PACTE) {
          pushToast(s, v.emoji, `${v.nom} ne traitera pas avec vous : il faut ${SEUIL_PACTE} de relation.`)
          return
        }
        const cout = coutPacte(v)
        if (!payer(s, cout)) {
          pushToast(s, '❌', 'Un pacte se scelle sur des présents que vous n’avez pas.')
          return
        }
        const now = Date.now()
        s.alliances[villageId] = { depuis: now, tributAt: now + TRIBUT_MS }
        noter(s, 'pactes')
        pushToast(s, '🤝', `Pacte scellé avec ${v.nom}.`)
        pushReport(s, '🤝', `Pacte - ${v.nom}`, [
          `${v.nom} entre dans votre alliance sans qu’un coup ait été porté.`,
          `Tribut toutes les ${Math.round(TRIBUT_MS / 60_000)} min et renforts sur vos remparts à chaque assaut.`,
          'Un pacte se dénoue comme il s’est noué : laissez la relation retomber et l’on reprendra sa parole.',
        ])
      })
    },

    /**
     * Un mariage. On donne un habitant - un adulte, avec son métier et sa maison -
     * et l'on reçoit une alliance que rien ne dénoue, au tribut doublé. C'est le
     * seul engagement irréversible du jeu, et le seul qui coûte un bras au village.
     */
    scellerMariage: (villageId: string, villageoisId: string) => {
      set((s) => {
        const v = VILLAGES_PAR_ID[villageId]
        if (!v) return
        if (s.alliances[villageId]?.mariage) {
          pushToast(s, '💍', `Une parenté vous lie déjà à ${v.nom}.`)
          return
        }
        if (relationVillage(s, villageId) < SEUIL_MARIAGE) {
          pushToast(s, v.emoji, `${v.nom} ne donnera pas sa main : il faut ${SEUIL_MARIAGE} de relation.`)
          return
        }
        const jour = jourDe(s)
        const promis = s.villageois.find((x) => x.id === villageoisId)
        if (!promis || !estAdulte(promis, jour)) {
          pushToast(s, '👥', 'Il faut un adulte du village pour sceller une parenté.')
          return
        }
        if (promis.conjoint) {
          pushToast(s, '💍', `${promis.nom} a déjà un foyer ici.`)
          return
        }
        const cout = coutMariage(v)
        if (!payer(s, cout)) {
          pushToast(s, '❌', 'Une dot ne se paie pas avec des promesses.')
          return
        }
        const now = Date.now()
        // le promis quitte le village : c'est LE coût, et il est définitif
        s.villageois = s.villageois.filter((x) => x.id !== villageoisId)
        s.pop = Math.max(0, s.pop - 1)
        veuvage(s, promis)
        s.alliances[villageId] = {
          depuis: now,
          tributAt: now + TRIBUT_MS,
          mariage: { villageois: promis.nom, lignee: promis.lignee, depuis: now },
        }
        s.relations[villageId] = 100
        s.gods.zeus.relation = Math.min(100, s.gods.zeus.relation + 8)
        s.moraleMods.push({ id: uid('m'), label: 'Une noce au loin', delta: 6, expiresAt: now + 10 * 60_000 })
        noter(s, 'mariagesDiplomatiques')
        pushToast(s, '💍', `${promis.nom} part pour ${v.nom} : vos maisons ne font plus qu’une.`)
        pushReport(s, '💍', `Parenté scellée - ${v.nom}`, [
          `${promis.nom}${promis.lignee ? ` des ${promis.lignee}` : ''} quitte le village pour ${v.nom}.`,
          'Le village perd un bras et un métier - mais gagne une alliance que rien ne dénoue.',
          `Tribut doublé, renforts à chaque assaut, et Zeus Xenios approuve (+8).`,
        ])
      })
    },

    recruterHeros: (h) => {
      set((s) => {
        const def = HEROS[h]
        const e = s.heros[h]
        if (!e || e.recrute || e.mort) return
        if (!conditionsHeros(s, h).every((c) => c.ok)) {
          pushToast(s, def.emoji, `${def.nom} ne se met pas au service de n’importe quelle bourgade.`)
          return
        }
        if (!payer(s, def.coutRecrutement)) {
          pushToast(s, '❌', 'De quoi faire les présents d’usage vous manque encore.')
          return
        }
        e.recrute = true
        e.impayes = 0
        e.inactif = 0
        const ent = [
          def.entretien.grain ? `${def.entretien.grain} 🌾/min` : '',
          def.entretien.faveur ? `${def.entretien.faveur} ✨/min` : '',
        ]
          .filter(Boolean)
          .join(' + ')
        pushToast(s, def.emoji, `${def.nom} entre à votre service.`)
        pushReport(s, def.emoji, `${def.nom} rejoint la cité`, [
          def.desc,
          `Passif : ${def.passif.desc}`,
          `${def.capacite.emoji} ${def.capacite.nom} - ${def.capacite.desc}`,
          `Entretien : ${ent || 'aucun'}. Un héros qu’on n’honore pas s’en va.`,
        ])
      })
      get().save()
    },

    capaciteHeros: (h) => {
      set((s) => {
        const def = HEROS[h]
        const e = s.heros[h]
        const now = Date.now()
        const bataille = s.battle ?? (s.expedition && !s.expedition.result ? s.expedition.battle : null)
        if (!e?.recrute || e.mort) return
        if (now < e.boudeJusqua) {
          pushToast(s, def.emoji, `${def.nom} reste sous sa tente : il vous garde rancune.`)
          return
        }
        if (now < e.cooldownUntil) return
        if (def.capacite.batailleUniquement && !bataille) {
          pushToast(s, def.emoji, `${def.capacite.nom} ne se joue qu’au cœur de la mêlée.`)
          return
        }
        if (s.faveur < def.capacite.cout) {
          pushToast(s, '❌', `Il faut ${def.capacite.cout} ✨ pour appeler ${def.nom}.`)
          return
        }
        // la puissance d'une capacité suit le niveau du héros : ×1 puis ×1.8
        const force = forceNiveau(e.niveau)
        const eff = def.capacite.effet
        let message: string | null = null

        switch (eff.type) {
          case 'bouclier-secteur': {
            if (!bataille) return
            const nom = abriterSecteur(bataille, now, eff.duree * force, eff.absorbe, h)
            message = `${def.nom} se plante devant ${nom ?? 'la brèche'} : ${Math.round(eff.absorbe * 100)} % des coups pour lui, ${Math.round((eff.duree * force) / 1000)} s.`
            break
          }
          case 'fureur': {
            if (!bataille) return
            const n = fureurHeros(bataille, now, eff.degats * force, h)
            e.inactif = 0
            message = `Fureur du Pélide : ${n} ennemis fauchés d’un seul élan.`
            break
          }
          case 'boucher-breche': {
            if (!bataille) return
            const nom = boucherBreche(bataille, now, eff.duree * force, h)
            message = `${def.nom} comble ${nom ?? 'la brèche'} de son seul corps - infranchissable ${Math.round((eff.duree * force) / 1000)} s.`
            break
          }
          case 'tuer-chef': {
            if (!bataille) return
            const cible = abattreChef(bataille, now, h)
            if (!cible) {
              pushToast(s, def.emoji, 'Plus personne en face qui vaille sa lance.')
              return
            }
            message = `Aristie de ${def.nom} : le plus fort d’en face tombe sur place.`
            break
          }
          case 'siege-gratuit': {
            if (s.siegeGratuit) {
              pushToast(s, def.emoji, 'La ruse est déjà prête - reste à s’en servir.')
              return
            }
            s.siegeGratuit = true
            message = 'L’offrande de bois est prête : votre prochaine expédition entrera sans coup de bélier.'
            break
          }
          case 'sauver-troupes': {
            if (s.sauverTroupes > 0) return
            s.sauverTroupes = eff.part
            message = `${def.nom} veille sur la retraite : en cas de défaite, ${Math.round(eff.part * 100)} % de vos troupes rentreront.`
            break
          }
          case 'recrues': {
            const n = eff.n
            s.army[eff.unite] += n
            message = `Ordre du roi : ${n} ${UNITS[eff.unite].nom.toLowerCase()}s enrôlés et armés sur-le-champ.`
            break
          }
          case 'annuler-vague': {
            if (!s.warned || !s.incomingWave || s.battle) {
              pushToast(s, def.emoji, 'Aucune vague annoncée : il n’y a rien à conjurer.')
              return
            }
            s.incomingWave = null
            s.incomingFronts = null
            s.incomingChampion = null
            s.defRecompense = null
            s.warned = false
            s.nextAttackAt = now + ASSAUT_MIN_MS + Math.random() * (ASSAUT_MAX_MS - ASSAUT_MIN_MS)
            message = 'Cassandre décrit l’assaut avec tant de précision qu’il n’aura pas lieu.'
            break
          }
        }

        s.faveur -= def.capacite.cout
        e.cooldownUntil = now + def.capacite.cooldown / (MODE_TEST ? 8 : 1)
        if (message) pushToast(s, def.capacite.emoji, message)
      })
    },

    choisirArc: (i) => {
      set((s) => {
        if (!s.arcHeros || s.arcIssue) return
        const h = s.arcHeros.heros
        const def = HEROS[h]
        const noeud = def.arc.find((n) => n.id === s.arcHeros!.noeud)
        const e = s.heros[h]
        if (!noeud || !e) return
        const opt = noeud.options[i]
        if (!opt) return
        if (opt.cout && !payer(s, opt.cout)) {
          pushToast(s, '❌', 'Ressources insuffisantes pour ce parti-là.')
          return
        }
        const now = Date.now()
        const f = opt.effets
        const lignes: string[] = [opt.issue]

        // l'ordre compte : un plafond posé maintenant borne le gain de niveau
        if (f.plafond !== undefined) {
          e.plafond = Math.min(e.plafond, f.plafond)
          lignes.push(`⛔ ${def.nom} ne dépassera plus le niveau ${e.plafond}.`)
        }
        if (f.niveau) {
          const avant = e.niveau
          e.niveau = Math.min(Math.min(NIVEAU_MAX, e.plafond), e.niveau + f.niveau)
          e.xp = 0
          if (e.niveau > avant) lignes.push(`⭐ ${def.nom} passe au niveau ${e.niveau}.`)
        }
        if (f.morale) {
          s.moraleMods.push({
            id: uid('m'),
            label: f.morale.label,
            delta: f.morale.delta,
            expiresAt: f.morale.durMs ? now + f.morale.durMs : null,
          })
          lignes.push(`🎭 Ambiance ${f.morale.delta > 0 ? '+' : ''}${f.morale.delta} - ${f.morale.label}.`)
        }
        for (const r of f.relation ?? []) {
          s.gods[r.dieu].relation = Math.max(-100, Math.min(100, s.gods[r.dieu].relation + r.delta))
          lignes.push(`${GODS[r.dieu].emoji} ${GODS[r.dieu].nom} ${r.delta > 0 ? '+' : ''}${r.delta}.`)
        }
        if (f.res) {
          const parts: string[] = []
          for (const [r, n] of Object.entries(f.res) as [ResourceId, number][]) {
            s.resources[r] = clampRes(s, r, s.resources[r] + n)
            parts.push(`${n > 0 ? '+' : ''}${n} ${RES[r].emoji}`)
          }
          if (parts.length) lignes.push(parts.join(', '))
        }
        if (f.faveur) {
          s.faveur = Math.max(0, Math.min(FAVEUR_MAX, s.faveur + f.faveur))
          lignes.push(`✨ Faveur ${f.faveur > 0 ? '+' : ''}${f.faveur}.`)
        }
        if (f.pop) {
          s.pop = Math.max(0, s.pop + f.pop)
          lignes.push(`👥 Habitants ${f.pop > 0 ? '+' : ''}${f.pop}.`)
        }
        if (f.boude) {
          e.boudeJusqua = now + f.boude
          lignes.push(`😤 ${def.nom} boude : sa capacité est indisponible ${Math.round(f.boude / 60_000)} min.`)
        }
        if (f.mort) {
          e.mort = true
          lignes.push(`💀 ${def.nom} est mort. Son nom reste ; son bras, non.`)
        }

        e.arc++
        e.choix.push(`${noeud.id}:${opt.label}`)
        s.arcIssue = lignes
        pushReport(s, noeud.emoji, `${def.nom} - ${noeud.titre}`, lignes)
      })
      get().save()
    },

    fermerArc: () => {
      set((s) => {
        s.arcHeros = null
        s.arcIssue = null
      })
    },

    choisirEvenement: (i) => {
      set((s) => {
        if (!s.activeEvent || s.eventOutcome) return
        const def = EVENTS_BY_ID[s.activeEvent.defId]
        const choix = def.choices[i]
        if (!choix) return
        if (choix.requiert && !choix.requiert(snap(s))) return
        if (choix.cout && !payer(s, choix.cout)) return
        const now = Date.now()
        const lignes = choix.apply(makeCtx(s, now), s.activeEvent.roll)
        s.eventOutcome = lignes
        s.eventCooldowns[def.id] = now + def.cooldown
        s.stats.evenements++
        s.lastEventAt = now
        pushReport(s, def.emoji, def.titre, lignes)
      })
      get().save()
    },

    fermerEvenement: () => {
      set((s) => {
        s.activeEvent = null
        s.eventOutcome = null
      })
    },

    lancerMaintenant: () => {
      set((s) => {
        if (!s.warned || s.battle || s.expedition || !s.defRecompense) return
        s.defRecompense.bonus = true
        s.nextAttackAt = Date.now()
        pushToast(s, '⚔️', 'Vous provoquez l’ennemi : il charge ! (récompense +25 %)')
      })
    },

    lancerExpedition: (villageId, troupes, intention = 'pillage') => {
      set((s) => {
        if (s.expedition || s.battle) return
        const v = VILLAGES_PAR_ID[villageId]
        if (!v) return
        if (v.maritime && SAISONS[s.saison].merFermee) {
          pushToast(s, '❄️', `${v.nom} est au-delà du détroit : la mer est prise, aucune nef ne partira avant le dégel.`)
          return
        }
        const secours = intention === 'secours'
        if (secours && s.appelSecours?.villageId !== villageId) {
          pushToast(s, '🤝', `${v.nom} n’a rien demandé - on ne secourt pas les gens de force.`)
          return
        }
        const dernier = s.expeditions[villageId]?.dernierRaid ?? 0
        const now = Date.now()
        // porter secours n'attend pas la fin d'un cooldown de pillage
        if (!secours && now - dernier < RAID_COOLDOWN_MS / (MODE_TEST ? 10 : 1)) return
        let total = 0
        for (const u of UNIT_IDS) {
          const n = troupes[u] ?? 0
          if (n < 0 || n > s.army[u]) return
          total += n
        }
        if (total === 0 || total > MAX_TROUPES) return
        for (const u of UNIT_IDS) s.army[u] -= troupes[u] ?? 0
        const attaquants = UNIT_IDS.filter((u) => (troupes[u] ?? 0) > 0).map((u) => ({
          enemy: u,
          count: troupes[u],
        }))
        const bh = bonusHeros(s)
        // en secours, on se bat en rase campagne contre les assiégeants : aucun mur
        const ruse = !secours && s.siegeGratuit
        const mur = secours ? 0 : v.mur
        s.expedition = {
          villageId,
          intention,
          envoyes: { ...troupes },
          wallHp: ruse || secours ? 0 : WALL_HP[v.mur],
          battle: creerBataille({
            attaquants,
            defenseurs: secours ? assiegeants(v) : garnisonEffective(v, s.expeditions[villageId]?.pillages ?? 0),
            wallLevel: mur,
            now,
            geo: GEO_EXPEDITION,
            campJoueur: 'attaque',
            sansSiege: ruse,
            bonusAtkJoueur: 1 + bh.degatsMeleePct + bh.degatsExpeditionPct + bonusFaveurs(s).degatsPct,
            // la garde d'Ajax vaut aussi loin de chez soi : sa fiche la promet sans
            // réserve, et le store l'oubliait en expédition
            reducJoueur: 1 - bh.gardeDuCorpsPct,
            // ils marchent avec la colonne, en tête
            herosPresents: herosAuCombat(s, now),
          }),
          result: null,
        }
        if (ruse) {
          s.siegeGratuit = false
          pushToast(s, '🐎', 'La ruse d’Ulysse opère : vos hommes sont déjà dans la place.')
        }
        s.panel = null
        pushToast(
          s,
          secours ? '🤝' : '🏴‍☠️',
          secours ? `Vos troupes courent délivrer ${v.nom} !` : `Vos troupes marchent sur ${v.nom} !`,
        )
      })
    },

    ignorerSecours: () => {
      set((s) => {
        if (!s.appelSecours) return
        const v = VILLAGES_PAR_ID[s.appelSecours.villageId]
        s.appelSecours = null
        s.gods.zeus.relation = Math.max(-100, s.gods.zeus.relation - 4)
        pushToast(s, '🚪', `Vous fermez la porte au coureur de ${v?.nom ?? 'ce village'} - Zeus a vu.`)
      })
      get().save()
    },

    // ── Campagne « La Chute » ───────────────────────────────────────────────
    choisirMode: (m) => {
      set((s) => {
        s.mode = m
        if (m === 'campagne') {
          // l'acte I enseigne en jouant : la leçon de Zeus n'a pas sa place ici
          s.tutoriel = null
          s.tutorialDone = true
          appliquerActe(s, 0, Date.now())
        } else {
          s.campagne = null
          s.tutoriel = 0
        }
      })
      get().save()
    },

    commencerActe: () => {
      set((s) => {
        if (!s.campagne) return
        s.campagne.prologueVu = true
        /*
         * Le compte à rebours part quand le joueur prend la main, pas quand il
         * ouvre le prologue : lire ne doit rien coûter.
         */
        const acte = ACTES_CAMPAGNE[s.campagne.acte]
        if (acte) s.nextAttackAt = Date.now() + acte.menace.premierAssautMs
      })
      get().save()
    },

    acteSuivant: () => {
      set((s) => {
        if (!s.campagne) return
        const acte = ACTES_CAMPAGNE[s.campagne.acte]
        const prochain = s.campagne.acte + 1
        if (prochain >= NB_ACTES) {
          // la campagne est close : le village reste jouable en bac à sable
          s.campagne.fini = true
          s.campagne.accompli = false
          s.mode = 'bac-a-sable'
          if (acte?.recompense.res) {
            for (const [r, n] of Object.entries(acte.recompense.res) as [ResourceId, number][]) {
              s.resources[r] = clampRes(s, r, s.resources[r] + n)
            }
          }
          pushToast(s, '👑', 'La Chute est achevée - votre village a survécu à la guerre de Troie.')
          return
        }
        appliquerActe(s, prochain, Date.now())
        // la récompense de l'acte accompli s'ajoute à la dot du suivant
        if (acte?.recompense.res) {
          for (const [r, n] of Object.entries(acte.recompense.res) as [ResourceId, number][]) {
            s.resources[r] = clampRes(s, r, s.resources[r] + n)
          }
        }
        if (acte?.recompense.faveur) s.faveur = Math.min(FAVEUR_MAX, s.faveur + acte.recompense.faveur)
        if (acte?.recompense.pop) s.pop += acte.recompense.pop
      })
      get().save()
    },

    rejouerActe: () => {
      set((s) => {
        if (!s.campagne) return
        appliquerActe(s, s.campagne.acte, Date.now())
      })
      get().save()
    },

    /**
     * Changer d'emplacement, c'est ranger sa partie et en ouvrir une autre. On
     * SAUVEGARDE d'abord, toujours : basculer ne doit jamais coûter les cinq
     * dernières minutes de jeu. Puis `init()` relit la clé du nouvel emplacement,
     * comme au premier chargement - un emplacement vide rouvre donc l'écran de
     * choix du mode, ce qui est exactement ce qu'on attend d'une case libre.
     */
    changerEmplacement: (i) => {
      get().save()
      poserEmplacementActif(i)
      get().init()
    },

    /**
     * Abdiquer, c'est choisir la fin de son règne : le score se fige, les aèdes
     * donnent un titre, puis la cité repart de zéro. Rien d'autre ne termine
     * une partie - un village peut être pillé cent fois et se relever.
     */
    abdiquer: () => {
      set((s) => {
        if (s.battle || (s.expedition && !s.expedition.result)) return
        verifierHautsFaits(s)
        const detail = detailPrestige(snapHautFait(s), s.hautsFaits)
        const score = detail.reduce((a, d) => a + d.points, 0)
        const t = titrePrestige(score)
        s.finDePartie = {
          score,
          titre: t.titre,
          desc: t.desc,
          lignes: detail.filter((d) => d.points !== 0).map((d) => `${d.label} : ${d.points}`),
        }
        pushReport(s, '👑', `Fin du règne - ${t.titre}`, [
          `${score} points de prestige, ${s.hautsFaits.length}/${HAUTS_FAITS.length} hauts faits.`,
          t.desc,
        ])
      })
    },

    fermerFin: () => {
      set((s) => void (s.finDePartie = null))
    },

    /*
     * La leçon de Zeus. Elle se déroule dans le jeu réel - aucune simulation à
     * part : ce que le joueur bâtit pendant le tutoriel, il le garde. On se
     * contente de repousser le premier assaut le temps de la leçon, pour ne pas
     * mêler la théorie et la panique.
     */
    demarrerTutoriel: () => {
      set((s) => {
        s.tutoriel = 0
        s.panel = null
        s.nextAttackAt = Math.max(s.nextAttackAt, Date.now() + PREMIER_ASSAUT_MS)
      })
    },

    etapeTutoSuivante: () => {
      set((s) => {
        if (s.tutoriel === null) return
        const suivant = s.tutoriel + 1
        if (suivant >= NB_ETAPES) {
          s.tutoriel = null
          s.tutorialDone = true
          pushToast(s, '⚡', 'Zeus remonte à l’Olympe. La plaine est à vous.')
          return
        }
        s.tutoriel = suivant
        /*
         * On referme TOUT ce qui pourrait couvrir la cible suivante : modale,
         * panneau de bâtiment, recensement. C'était le défaut le plus pénible
         * de la première version - le recensement restait en travers de l'étape
         * des remparts, et la leçon devenait injouable.
         */
        s.panel = null
        s.selected = null
        s.popOuvert = false
        s.nextAttackAt = Math.max(s.nextAttackAt, Date.now() + 4 * 60_000)
      })
      get().save()
    },

    arreterTutoriel: () => {
      set((s) => {
        s.tutoriel = null
        s.tutorialDone = true
        pushToast(s, '❔', 'Leçon écourtée - tout est rappelé dans l’aide, en haut à droite.')
      })
      get().save()
    },

    retraiteExpedition: () => {
      set((s) => {
        if (!s.expedition || s.expedition.result) return
        sonnerRetraite(s.expedition.battle)
        pushToast(s, '🏳️', 'Retraite ! Vos troupes refluent vers le village.')
      })
    },

    fermerExpedition: () => {
      set((s) => {
        if (s.expedition && !s.expedition.result) return // l'assaut se joue jusqu'au bout
        s.expedition = null
      })
      get().save()
    },

    attaqueTest: () => {
      set((s) => {
        if (!MODE_TEST || s.battle || s.expedition) return
        s.nextAttackAt = Date.now() + 3000
        s.warned = false
        s.incomingWave = null
        s.incomingFronts = null
        s.defRecompense = null
        pushToast(s, '🧪', 'Attaque test dans 3 secondes…')
      })
    },

    setVitesse: (v) => {
      set((s) => {
        if (!VITESSES.includes(v as (typeof VITESSES)[number])) return
        s.vitesse = v
      })
    },

    reclamerMission: (id) => {
      set((s) => {
        const def = MISSIONS_PAR_ID[id]
        if (!def || s.missionsReclamees.includes(id)) return
        if (!missionsActives(s.missionsReclamees).some((m) => m.id === id)) return
        const p = def.progres(s)
        if (p.cur < p.max) return
        const rec = def.recompense
        if (rec.res) {
          for (const [r, n] of Object.entries(rec.res) as [ResourceId, number][]) {
            s.resources[r] = clampRes(s, r, s.resources[r] + n)
          }
        }
        if (rec.faveur) s.faveur = Math.min(FAVEUR_MAX, s.faveur + rec.faveur)
        if (rec.pop) s.pop += rec.pop
        s.missionsReclamees.push(id)
        pushToast(s, def.emoji, `${def.titre} : récompense reçue !`)
        // le fil rouge laisse une trace dans la chronique, comme les batailles
        const gains: string[] = []
        if (rec.res) {
          for (const [r, n] of Object.entries(rec.res) as [ResourceId, number][]) {
            gains.push(`+${n} ${RES[r].emoji}`)
          }
        }
        if (rec.faveur) gains.push(`+${rec.faveur} ✨`)
        if (rec.pop) gains.push(`+${rec.pop} habitant${rec.pop > 1 ? 's' : ''}`)
        pushReport(s, def.emoji, `Mission ${rangMission(id)} - ${def.titre}`, [
          def.desc,
          `Récompense : ${gains.join(' · ')}`,
        ])
      })
      get().save()
    },

    /*
     * « Y aller » : la mission cesse d'être une consigne pour devenir un bouton.
     * On referme ce qui traîne avant d'ouvrir la bonne chose, sinon deux modales
     * se superposent et l'on ne voit plus rien.
     */
    allerAMission: (id) => {
      set((s) => {
        const cible = MISSIONS_PAR_ID[id]?.cible
        if (!cible) return
        s.panel = null
        s.selected = null
        s.popOuvert = false
        if (cible.quoi === 'batiment') s.selected = cible.id
        else if (cible.quoi === 'habitants') s.popOuvert = true
        else s.panel = cible.id
      })
    },

    select: (b) => set((s) => void (s.selected = b)),
    ouvrirRecensement: (v) => set((s) => void (s.popOuvert = v)),
    /*
     * Ouvrir un panneau n'a plus d'effet de bord sur `tutorialDone` : ce drapeau
     * appartient désormais à la leçon de Zeus. Le lever ici rallumait les
     * dilemmes EN PLEINE leçon - et une modale d'événement se plantait en
     * travers de l'étape suivante.
     */
    openPanel: (p) => set((s) => void (s.panel = p)),
    fermerOffline: () => set((s) => void (s.offlineSummary = null)),
    fermerBattleReport: () => set((s) => void (s.battleReport = null)),
    fermerVictoire: () => set((s) => void (s.victoire = null)),

    save: () => {
      const s = get()
      const data: Record<string, unknown> = {}
      for (const k of CHAMPS_SAUVES) data[k] = s[k]
      try {
        localStorage.setItem(cleEmplacement(emplacementActif()), JSON.stringify(data))
      } catch {
        // stockage plein / indisponible : tant pis pour cette fois
      }
    },

    reset: () => {
      // l'état mémoire est remis à neuf : ni l'autosave ni le `beforeunload`
      // ne peuvent ressusciter l'ancienne partie après ce point
      set((s) => {
        /*
         * On ne démarre PAS la leçon de Zeus ici. Une partie neuve commence par
         * l'écran de choix du mode (`mode` revient à null avec l'état initial),
         * et c'est `choisirMode` qui lance ensuite la leçon ou l'acte I. Poser
         * `tutoriel = 0` faisait s'afficher les deux à la fois : Zeus donnait sa
         * deuxième leçon par-dessus l'écran qui demandait encore comment jouer.
         * Ce code datait d'avant la campagne, quand « partie neuve » ne pouvait
         * vouloir dire qu'une seule chose.
         */
        Object.assign(s, etatInitial(Date.now()))
        pushToast(s, '🏛️', 'Une nouvelle cité s’élève - tout est à rebâtir.')
      })
      try {
        localStorage.removeItem(cleEmplacement(emplacementActif()))
        localStorage.removeItem(ANCIEN_STORAGE_KEY)
      } catch {
        // stockage indisponible : la partie repart tout de même de zéro
      }
    },
  })),
)

/*
 * Atelier de captures et de mise au point. En DÉVELOPPEMENT SEULEMENT, le store
 * est accessible depuis la console et depuis `scripts/captures.mjs`, qui pose
 * des états de jeu précis avant de photographier l'écran. `import.meta.env.DEV`
 * étant statiquement faux en production, tout ceci disparaît du bundle.
 */
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __palladion?: typeof useGame }).__palladion = useGame
}

/** total d'étoiles gagnées en campagne */
export function totalEtoiles(expeditions: Record<string, EtatExpedition>): number {
  return Object.values(expeditions).reduce((a, e) => a + e.etoiles, 0)
}

/** rappel pour l'UI : l'ennemi type d'une vague village est un EnemyId */
export function estEnemyId(x: string): x is EnemyId {
  return x in ENEMIES
}
