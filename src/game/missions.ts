import { WALL_HP } from './data'
import type { BuildingId, Cost, GodId, ResourceId, UnitId } from './types'

/*
 * Missions à récompenses — le fil rouge du joueur, façon Clash of Clans :
 * toujours un objectif visible, une récompense qui débloque l'étape suivante.
 * Elles se réclament dans l'ordre (les 3 premières non réclamées sont actives).
 *
 * Le fil est découpé en cinq actes : le hameau, le village qui s'organise,
 * la pierre et le bronze, la cité fortifiée, la légende. Chaque acte introduit
 * un système (postes de travail, tours d'archers, fronts multiples, ferveur)
 * avant de demander de le maîtriser.
 */

/**
 * Vue du jeu dont les missions ont besoin. Le store appelle `progres` avec
 * l'état complet, donc tout champ de GameState déclaré ici est disponible à
 * l'exécution : cette interface sert de contrat minimal et documente les
 * leviers qu'une mission peut observer.
 */
export interface EtatMissions {
  buildings: Record<BuildingId, { level: number }>
  /** habitants nommés — seul le poste tenu intéresse les missions de travail */
  villageois: { poste: BuildingId | null }[]
  army: Record<UnitId, number>
  resources: Record<ResourceId, number>
  pop: number
  morale: number
  faveur: number
  /** tours d'archers dressées sur l'enceinte */
  tours: number
  /** points de structure restants des remparts */
  wallHp: number
  /** menace courante — c'est elle qui commande le nombre de fronts d'un assaut */
  threat: number
  stats: { repousses: number; perdus: number; evenements: number }
  expeditions: Record<string, { etoiles: number }>
  gods: Record<GodId, { relation: number }>
}

/**
 * Où la mission se joue. C'est ce qui rattache le fil rouge au jeu : un clic sur
 * la mission ouvre l'écran concerné — le chantier, le recensement, la carte des
 * expéditions. Sans cela, les missions n'étaient qu'une liste à côté du jeu, et
 * « affectez un villageois au temple » laissait le joueur chercher où.
 */
export type CibleMission =
  | { quoi: 'batiment'; id: BuildingId }
  | { quoi: 'habitants' }
  | { quoi: 'panneau'; id: 'expeditions' | 'pantheon' | 'heros' }

export interface MissionDef {
  id: string
  emoji: string
  titre: string
  desc: string
  /** progression courante (fait quand cur ≥ max) */
  progres: (s: EtatMissions) => { cur: number; max: number }
  recompense: { res?: Cost; faveur?: number; pop?: number }
  /** l'écran où l'accomplir — absent quand il n'y a rien à aller cliquer */
  cible?: CibleMission
}

/** raccourcis de lisibilité pour les cibles les plus fréquentes */
const AU = (id: BuildingId): CibleMission => ({ quoi: 'batiment', id })
const HABITANTS: CibleMission = { quoi: 'habitants' }
const CARTE: CibleMission = { quoi: 'panneau', id: 'expeditions' }
const OLYMPE: CibleMission = { quoi: 'panneau', id: 'pantheon' }

type Progres = { cur: number; max: number }

/** borne la progression : la jauge ne dépasse jamais 100 % */
function seuil(cur: number, max: number): Progres {
  return { cur: Math.min(cur, max), max }
}

/** mission à plusieurs conditions : la jauge compte les jalons franchis */
function jalons(...conditions: boolean[]): Progres {
  return { cur: conditions.filter(Boolean).length, max: conditions.length }
}

function niveau(b: BuildingId, n: number) {
  return (s: EtatMissions) => seuil(s.buildings[b].level, n)
}

function armee(s: EtatMissions): number {
  return s.army.lancier + s.army.archer + s.army.hoplite
}

/** villageois tenant un poste dans ce bâtiment */
function auPoste(s: EtatMissions, b: BuildingId): number {
  return s.villageois.filter((v) => v.poste === b).length
}

/** villageois occupant un poste, tous ateliers confondus */
function auTravail(s: EtatMissions): number {
  return s.villageois.filter((v) => v.poste !== null).length
}

/** meilleure relation obtenue avec un Olympien — la ferveur se mesure au plus dévoué */
function ferveurMax(s: EtatMissions): number {
  return Object.values(s.gods).reduce((a, g) => Math.max(a, g.relation), -100)
}

function etoilesCumulees(s: EtatMissions): number {
  return Object.values(s.expeditions).reduce((a, e) => a + e.etoiles, 0)
}

function meilleurRaid(s: EtatMissions): number {
  return Object.values(s.expeditions).reduce((a, e) => Math.max(a, e.etoiles), 0)
}

export const MISSIONS: MissionDef[] = [
  // ── Acte I — Le hameau ─────────────────────────────────────────────────────
  {
    id: 'nouveau-depart',
    emoji: '🏺',
    titre: 'Un nouveau départ',
    desc: 'Athéna veille sur les commencements. Réclamez les provisions du voyage.',
    progres: () => ({ cur: 1, max: 1 }),
    recompense: { res: { bois: 150, pierre: 100, grain: 120 } },
  },
  {
    id: 'le-pain-d-abord',
    emoji: '🌾',
    titre: 'Le pain d’abord',
    desc: 'Construisez la ferme : un village qui a faim n’obéit pas longtemps.',
    progres: niveau('ferme', 1),
    recompense: { res: { bois: 80, pierre: 50 } },
  },
  {
    id: 'bras-aux-champs',
    emoji: '👨‍🌾',
    titre: 'Des bras aux champs',
    desc: 'Un atelier vide ne produit rien : envoyez un villageois tenir le poste de paysan à la ferme.',
    progres: (s) => seuil(auPoste(s, 'ferme'), 1),
    recompense: { res: { grain: 80 } },
  },
  {
    id: 'bois-pour-l-hiver',
    emoji: '🪓',
    titre: 'Du bois pour l’hiver',
    desc: 'Établissez le camp de bûcherons dans la forêt du mont Ida.',
    progres: niveau('scierie', 1),
    recompense: { res: { grain: 100, pierre: 40 } },
  },
  {
    id: 'pierre-du-pays',
    emoji: '⛏️',
    titre: 'La pierre du pays',
    desc: 'Ouvrez la carrière : Troie elle-même est née de ces collines.',
    progres: niveau('carriere', 1),
    recompense: { res: { bois: 90, grain: 40 } },
  },
  {
    id: 'trois-au-travail',
    emoji: '👷',
    titre: 'Trois villageois au travail',
    desc: 'Répartissez vos habitants : trois d’entre eux doivent tenir un poste, champ, forêt ou carrière.',
    progres: (s) => seuil(auTravail(s), 3),
    recompense: { res: { bois: 70, pierre: 70, grain: 70 } },
  },
  {
    id: 'premiers-remparts',
    emoji: '🧱',
    titre: 'Premiers remparts',
    desc: 'Dressez une palissade. Même le pin coupé à la hâte arrête une flèche.',
    progres: niveau('remparts', 1),
    recompense: { res: { grain: 60, pierre: 60 } },
  },
  {
    id: 'appel-aux-armes',
    emoji: '🛡️',
    titre: 'L’appel aux armes',
    desc: 'Bâtissez la caserne : la Troade n’est pas tendre avec les désarmés.',
    progres: niveau('caserne', 1),
    recompense: { res: { bois: 60, bronze: 25 } },
  },
  {
    id: 'trois-lances',
    emoji: '🗡️',
    titre: 'Trois lances au râtelier',
    desc: 'Entretenez une garnison de 3 soldats — on n’enrôle que des villageois sans emploi.',
    progres: (s) => seuil(armee(s), 3),
    recompense: { res: { bronze: 30, grain: 50 } },
  },
  {
    id: 'premiere-victoire',
    emoji: '🏆',
    titre: 'Première victoire',
    desc: 'Repoussez un assaut : que les pillards apprennent votre nom.',
    progres: (s) => seuil(s.stats.repousses, 1),
    recompense: { res: { bronze: 60 }, faveur: 10 },
  },

  // ── Acte II — Le village s'organise ────────────────────────────────────────
  {
    id: 'maison-des-dieux',
    emoji: '⚡',
    titre: 'La maison des dieux',
    desc: 'Élevez un temple : sans les Olympiens, aucune muraille ne tient.',
    progres: niveau('temple', 1),
    recompense: { res: { pierre: 80 }, faveur: 15 },
  },
  {
    id: 'un-pretre-au-temple',
    emoji: '🙏',
    titre: 'Un prêtre au temple',
    desc: 'Nul autel ne fume tout seul : affectez un villageois au temple pour que la faveur monte.',
    progres: (s) => seuil(auPoste(s, 'temple'), 1),
    recompense: { res: { grain: 90 }, faveur: 20 },
  },
  {
    id: 'grandir',
    emoji: '🏛️',
    titre: 'Grandir',
    desc: 'Portez l’Agora au niveau 2 pour débloquer l’essor du village.',
    progres: niveau('agora', 2),
    recompense: { res: { bois: 150, pierre: 100 } },
  },
  {
    id: 'un-toit-pour-tous',
    emoji: '🏠',
    titre: 'Un toit pour tous',
    desc: 'Améliorez les habitations au niveau 2 : des bras pour les champs et la lance.',
    progres: niveau('maisons', 2),
    recompense: { res: { grain: 80 }, pop: 2 },
  },
  {
    id: 'dix-habitants',
    emoji: '👥',
    titre: 'Dix feux au village',
    desc: 'Nourrissez 10 habitants. Le grain et l’ambiance décident des naissances.',
    progres: (s) => seuil(s.pop, 10),
    recompense: { res: { grain: 120, bois: 60 } },
  },
  {
    id: 'champs-a-deux-mains',
    emoji: '🌿',
    titre: 'Les champs à deux mains',
    desc: 'Pourvoyez tous les postes de la ferme de niveau 2 : deux paysans dans les sillons.',
    progres: (s) => seuil(auPoste(s, 'ferme'), 2),
    recompense: { res: { bois: 120, pierre: 80 } },
  },
  {
    id: 'yeux-sur-les-murs',
    emoji: '🏹',
    titre: 'Des yeux sur les murs',
    desc: 'Formez 2 archers : depuis les remparts, chaque flèche compte double.',
    progres: (s) => seuil(s.army.archer, 2),
    recompense: { res: { bronze: 40, bois: 60 } },
  },
  {
    id: 'bucherons-et-carriers',
    emoji: '🪵',
    titre: 'Bûcherons et carriers',
    desc: 'Deux hommes à la forêt, deux à la carrière : les chantiers réclament du bois et de la pierre.',
    progres: (s) => seuil(Math.min(auPoste(s, 'scierie'), 2) + Math.min(auPoste(s, 'carriere'), 2), 4),
    recompense: { res: { bois: 140, pierre: 140 } },
  },
  {
    id: 'premier-raid',
    emoji: '🏴‍☠️',
    titre: 'Premier raid',
    desc: 'Menez une expédition victorieuse contre un village de la Troade.',
    progres: (s) => seuil(meilleurRaid(s), 1),
    recompense: { res: { bronze: 100 }, faveur: 10 },
  },
  {
    id: 'premiers-dilemmes',
    emoji: '🎭',
    titre: 'Le poids des choix',
    desc: 'Tranchez 3 dilemmes. Gouverner, c’est décevoir quelqu’un chaque fois.',
    progres: (s) => seuil(s.stats.evenements, 3),
    recompense: { res: { grain: 120, bronze: 40 }, faveur: 10 },
  },

  // ── Acte III — La pierre et le bronze ──────────────────────────────────────
  {
    id: 'muraille-de-pierre',
    emoji: '🏰',
    titre: 'Muraille de pierre',
    desc: 'Remplacez la palissade par un mur de pierre sèche (remparts niveau 2).',
    progres: niveau('remparts', 2),
    recompense: { res: { grain: 120, bronze: 40 } },
  },
  {
    id: 'premiere-tour',
    emoji: '🗼',
    titre: 'Une tour sur l’enceinte',
    desc: 'Bâtissez une tour d’archers : elle tire d’elle-même sur qui s’approche de son pan de mur.',
    progres: (s) => seuil(s.tours, 1),
    recompense: { res: { pierre: 160, bois: 80 } },
  },
  {
    id: 'forge-de-bronze',
    emoji: '⚒️',
    titre: 'La forge de bronze',
    desc: 'Allumez la forge : sans bronze, ni armes ni cuirasses.',
    progres: niveau('forge', 1),
    recompense: { res: { pierre: 120, bois: 80 } },
  },
  {
    id: 'un-forgeron',
    emoji: '🔨',
    titre: 'Un forgeron à l’enclume',
    desc: 'Mettez un villageois à la forge : le soufflet ne se lève pas sans main.',
    progres: (s) => seuil(auPoste(s, 'forge'), 1),
    recompense: { res: { bronze: 70 } },
  },
  {
    id: 'commerce-egeen',
    emoji: '⚓',
    titre: 'Le commerce égéen',
    desc: 'Construisez le port : l’Égée est une route, pas une frontière.',
    progres: niveau('port', 1),
    recompense: { res: { bronze: 60, bois: 80 } },
  },
  {
    id: 'le-docker',
    emoji: '🧺',
    titre: 'Un docker sur le quai',
    desc: 'Affectez un villageois au port pour que les navires soient chargés.',
    progres: (s) => seuil(auPoste(s, 'port'), 1),
    recompense: { res: { bois: 150, bronze: 40 } },
  },
  {
    id: 'reserves-du-village',
    emoji: '📦',
    titre: 'Les réserves du village',
    desc: 'Constituez un vrai stock : 400 bois et 400 pierre en entrepôt avant les grands chantiers.',
    progres: (s) => jalons(s.resources.bois >= 400, s.resources.pierre >= 400),
    recompense: { res: { grain: 200 }, faveur: 10 },
  },
  {
    id: 'devotion',
    emoji: '🦉',
    titre: 'Dévotion',
    desc: 'Entrez en grâce auprès d’un Olympien (relation ≥ 25). Athéna murmure aux fidèles…',
    progres: (s) => jalons(ferveurMax(s) >= 25),
    recompense: { faveur: 25 },
  },
  {
    id: 'deux-etoiles',
    emoji: '⭐',
    titre: 'Deux étoiles',
    desc: 'Enlevez un village en perdant moins de la moitié de vos troupes (2★).',
    progres: (s) => seuil(meilleurRaid(s), 2),
    recompense: { res: { bronze: 120, grain: 100 }, faveur: 15 },
  },

  // ── Acte IV — La cité fortifiée ────────────────────────────────────────────
  {
    id: 'prosperite',
    emoji: '💰',
    titre: 'Prospérité',
    desc: 'Portez l’Agora au niveau 3 : que votre place rivalise avec celles d’Ionie.',
    progres: niveau('agora', 3),
    recompense: { res: { pierre: 200, bronze: 80 }, faveur: 20 },
  },
  {
    id: 'quinze-habitants',
    emoji: '👨‍👩‍👧‍👦',
    titre: 'Quinze habitants',
    desc: 'Agrandissez les habitations et nourrissez 15 âmes.',
    progres: (s) => seuil(s.pop, 15),
    recompense: { res: { grain: 220 }, pop: 1 },
  },
  {
    id: 'cour-d-armes',
    emoji: '🏟️',
    titre: 'La cour d’armes',
    desc: 'Portez la caserne au niveau 3 : les panoplies de bronze ouvrent la voie aux hoplites.',
    progres: niveau('caserne', 3),
    recompense: { res: { bronze: 140, pierre: 120 } },
  },
  {
    id: 'muraille-d-hoplites',
    emoji: '⚔️',
    titre: 'Une muraille d’hoplites',
    desc: 'Formez 2 hoplites, l’élite au bouclier rond.',
    progres: (s) => seuil(s.army.hoplite, 2),
    recompense: { res: { grain: 160, bronze: 60 }, faveur: 10 },
  },
  {
    id: 'remparts-crenelees',
    emoji: '🏯',
    titre: 'Créneaux et porte de chêne',
    desc: 'Portez les remparts au niveau 3 : l’enceinte peut alors porter une seconde tour.',
    progres: niveau('remparts', 3),
    recompense: { res: { pierre: 260, bronze: 60 } },
  },
  {
    id: 'deux-tours',
    emoji: '🗼',
    titre: 'Deux tours de guet',
    desc: 'Dressez une seconde tour. Chacune ne couvre que son arc — la porte en réclame deux.',
    progres: (s) => seuil(s.tours, 2),
    recompense: { res: { pierre: 300, bois: 140 } },
  },
  {
    id: 'dix-au-travail',
    emoji: '👷',
    titre: 'Dix villageois à l’ouvrage',
    desc: 'Faites tourner vos ateliers à plein : 10 habitants tenant un poste en même temps.',
    progres: (s) => seuil(auTravail(s), 10),
    recompense: { res: { grain: 240, bois: 180 } },
  },
  {
    id: 'deux-fronts',
    emoji: '🐎',
    titre: 'Assaut sur deux fronts',
    desc: 'Passé 28 de menace, les bandes se scindent et frappent deux pans de mur à la fois. Tenez bon : 4 assauts repoussés.',
    progres: (s) => jalons(s.threat >= 28, s.stats.repousses >= 4),
    recompense: { res: { pierre: 240, bronze: 80 }, faveur: 20 },
  },
  {
    id: 'cheri-des-dieux',
    emoji: '🕊️',
    titre: 'Chéri d’un dieu',
    desc: 'Portez la relation d’un Olympien à 40 : ses bénédictions frappent plus fort et durent plus longtemps.',
    progres: (s) => jalons(ferveurMax(s) >= 40),
    recompense: { res: { grain: 150 }, faveur: 35 },
  },
  {
    id: 'trois-etoiles',
    emoji: '🌠',
    titre: 'Trois étoiles',
    desc: 'Rasez un village ennemi sans presque aucune perte (3★).',
    progres: (s) => seuil(meilleurRaid(s), 3),
    recompense: { res: { bronze: 160 }, faveur: 20 },
  },
  {
    id: 'six-etoiles',
    emoji: '💫',
    titre: 'Six étoiles en Troade',
    desc: 'Cumulez 6 étoiles sur l’ensemble de vos expéditions.',
    progres: (s) => seuil(etoilesCumulees(s), 6),
    recompense: { res: { bronze: 180, grain: 200 } },
  },

  // ── Acte V — Vers la légende ──────────────────────────────────────────────
  {
    id: 'temple-d-ares',
    emoji: '🐗',
    titre: 'Le culte d’Arès',
    desc: 'Portez le temple au niveau 3 : le dieu de la guerre accepte enfin vos offrandes.',
    progres: niveau('temple', 3),
    recompense: { res: { pierre: 320, bronze: 100 }, faveur: 20 },
  },
  {
    id: 'tresor-de-bronze',
    emoji: '🪙',
    titre: 'Le trésor de bronze',
    desc: 'Amassez 600 de bronze : forge, port et butins doivent tourner ensemble.',
    progres: (s) => seuil(s.resources.bronze, 600),
    recompense: { res: { bois: 300, pierre: 300 } },
  },
  {
    id: 'ambiance-de-fete',
    emoji: '🍇',
    titre: 'Vin et musique',
    desc: 'Portez l’ambiance à 70. Une victoire récente et des greniers pleins y suffisent.',
    progres: (s) => seuil(Math.round(s.morale), 70),
    recompense: { res: { grain: 300 }, faveur: 25 },
  },
  {
    id: 'dix-dilemmes',
    emoji: '🎭',
    titre: 'Le juge du village',
    desc: 'Tranchez 10 dilemmes. Vos habitants savent désormais à qui ils ont affaire.',
    progres: (s) => seuil(s.stats.evenements, 10),
    recompense: { res: { bronze: 200, grain: 250 }, faveur: 20 },
  },
  {
    id: 'murs-de-poseidon',
    emoji: '🔱',
    titre: 'Les murs de Poséidon',
    desc: 'Portez les remparts au niveau 4 — ceux de Troie, dit-on, furent bâtis de la main du dieu.',
    progres: niveau('remparts', 4),
    recompense: { res: { pierre: 400, bronze: 120 }, faveur: 25 },
  },
  {
    id: 'enceinte-restauree',
    emoji: '🛠️',
    titre: 'Enceinte sans fissure',
    desc: 'Réparez la muraille jusqu’au dernier moellon : structure au maximum avant le prochain assaut.',
    progres: (s) => jalons(s.buildings.remparts.level >= 4, s.wallHp >= WALL_HP[4]),
    recompense: { res: { pierre: 350, bois: 200 } },
  },
  {
    id: 'les-quatre-tours',
    emoji: '🗼',
    titre: 'Les quatre tours',
    desc: 'Complétez l’enceinte : deux tours à la porte, une au sud, une au nord. Aucun pan sans archers.',
    progres: (s) => seuil(s.tours, 4),
    recompense: { res: { pierre: 450, bois: 250 }, faveur: 25 },
  },
  {
    id: 'trois-fronts',
    emoji: '🌪️',
    titre: 'Cerné de toutes parts',
    desc: 'Au-delà de 55 de menace, l’ennemi attaque les trois secteurs ensemble. Survivez : 8 assauts repoussés.',
    progres: (s) => jalons(s.threat >= 55, s.stats.repousses >= 8),
    recompense: { res: { bronze: 260, pierre: 300 }, faveur: 30 },
  },
  {
    id: 'elu-du-dieu',
    emoji: '✨',
    titre: 'Élu du dieu',
    desc: 'Portez la relation d’un Olympien à 70 : au sommet de la ferveur, son bras pèse une fois et demie.',
    progres: (s) => jalons(ferveurMax(s) >= 70),
    recompense: { res: { grain: 300 }, faveur: 50 },
  },
  {
    id: 'ferme-a-plein',
    emoji: '🐂',
    titre: 'Le domaine agricole',
    desc: 'Portez la ferme au niveau 4 et pourvoyez ses quatre postes : moulin, oliveraie, greniers pleins.',
    progres: (s) => seuil(auPoste(s, 'ferme'), 4),
    recompense: { res: { grain: 450, bois: 250 }, pop: 2 },
  },
  {
    id: 'trente-habitants',
    emoji: '🏘️',
    titre: 'Trente habitants',
    desc: 'Un quartier entier vit derrière vos murs : atteignez 30 habitants.',
    progres: (s) => seuil(s.pop, 30),
    recompense: { res: { grain: 400, pierre: 250 }, pop: 3 },
  },
  {
    id: 'douze-etoiles',
    emoji: '🌌',
    titre: 'Douze étoiles',
    desc: 'Cumulez 12 étoiles en campagne : la Troade entière connaît vos enseignes.',
    progres: (s) => seuil(etoilesCumulees(s), 12),
    recompense: { res: { bronze: 320, bois: 350 } },
  },
  {
    id: 'tous-aux-postes',
    emoji: '🐝',
    titre: 'Une ruche d’ateliers',
    desc: '15 villageois au travail en même temps, du champ au quai — et une garnison malgré tout.',
    progres: (s) => seuil(auTravail(s), 15),
    recompense: { res: { bois: 400, pierre: 400, grain: 400 }, faveur: 25 },
  },
  {
    id: 'cite-de-legende',
    emoji: '🌟',
    titre: 'Cité de légende',
    desc: 'Portez tous les bâtiments au niveau 3 ou plus. Les aèdes chanteront Palladion.',
    progres: (s) => {
      const ids = Object.keys(s.buildings) as BuildingId[]
      return { cur: ids.filter((b) => s.buildings[b].level >= 3).length, max: ids.length }
    },
    recompense: { res: { bois: 500, pierre: 500, grain: 500, bronze: 200 }, faveur: 30 },
  },
  {
    id: 'palladion',
    emoji: '👑',
    titre: 'Le Palladion',
    desc: 'Achevez la cité : tous les bâtiments au niveau 4. La statue tombée du ciel a trouvé sa demeure.',
    progres: (s) => {
      const ids = Object.keys(s.buildings) as BuildingId[]
      return { cur: ids.filter((b) => s.buildings[b].level >= 4).length, max: ids.length }
    },
    recompense: { res: { bois: 700, pierre: 700, grain: 700, bronze: 400 }, faveur: 40, pop: 4 },
  },
]

/*
 * Où chaque mission se joue, en un seul tableau plutôt qu'une ligne de plus dans
 * chacune des cinquante définitions ci-dessus. Les missions absentes d'ici ne
 * mènent nulle part — « repoussez un assaut » ne s'accomplit sur aucun écran.
 */
const CIBLES: Record<string, CibleMission> = {
  'le-pain-d-abord': AU('ferme'),
  'bras-aux-champs': HABITANTS,
  'bois-pour-l-hiver': AU('scierie'),
  'pierre-du-pays': AU('carriere'),
  'trois-au-travail': HABITANTS,
  'premiers-remparts': AU('remparts'),
  'appel-aux-armes': AU('caserne'),
  'trois-lances': AU('caserne'),
  'maison-des-dieux': AU('temple'),
  'un-pretre-au-temple': HABITANTS,
  grandir: AU('agora'),
  'un-toit-pour-tous': AU('maisons'),
  'dix-habitants': AU('maisons'),
  'champs-a-deux-mains': HABITANTS,
  'yeux-sur-les-murs': AU('caserne'),
  'bucherons-et-carriers': HABITANTS,
  'premier-raid': CARTE,
  'muraille-de-pierre': AU('remparts'),
  'premiere-tour': AU('remparts'),
  'forge-de-bronze': AU('forge'),
  'un-forgeron': HABITANTS,
  'commerce-egeen': AU('port'),
  'le-docker': HABITANTS,
  'reserves-du-village': AU('agora'),
  devotion: OLYMPE,
  'deux-etoiles': CARTE,
  prosperite: AU('agora'),
  'quinze-habitants': AU('maisons'),
  'cour-d-armes': AU('caserne'),
  'muraille-d-hoplites': AU('caserne'),
  'remparts-crenelees': AU('remparts'),
  'deux-tours': AU('remparts'),
  'dix-au-travail': HABITANTS,
  'deux-fronts': AU('remparts'),
  'cheri-des-dieux': OLYMPE,
  'trois-etoiles': CARTE,
  'six-etoiles': CARTE,
  'temple-d-ares': AU('temple'),
  'tresor-de-bronze': AU('forge'),
  'murs-de-poseidon': AU('remparts'),
  'enceinte-restauree': AU('remparts'),
  'les-quatre-tours': AU('remparts'),
  'trois-fronts': AU('remparts'),
  'elu-du-dieu': OLYMPE,
  'ferme-a-plein': AU('ferme'),
  'trente-habitants': AU('maisons'),
  'douze-etoiles': CARTE,
  'tous-aux-postes': HABITANTS,
  'cite-de-legende': AU('agora'),
  palladion: AU('agora'),
}
for (const m of MISSIONS) m.cible = CIBLES[m.id]

export const MISSIONS_PAR_ID: Record<string, MissionDef> = Object.fromEntries(MISSIONS.map((m) => [m.id, m]))

/** rang de la mission dans le fil rouge (1 = la première) */
export function rangMission(id: string): number {
  return MISSIONS.findIndex((m) => m.id === id) + 1
}

/**
 * Les cinq actes, bornés par le rang de leur dernière mission. Ils n'étaient
 * jusqu'ici que des commentaires dans ce fichier ; le panneau du fil rouge les
 * affiche, ce qui donne au joueur une idée du chemin plutôt qu'une liste de
 * cinquante-cinq lignes.
 */
export const ACTES: { nom: string; fin: number }[] = [
  { nom: 'Acte I — Le hameau', fin: 10 },
  { nom: 'Acte II — Le village s’organise', fin: 20 },
  { nom: 'Acte III — La pierre et le bronze', fin: 29 },
  { nom: 'Acte IV — La cité fortifiée', fin: 40 },
  { nom: 'Acte V — Vers la légende', fin: MISSIONS.length },
]

/** l'acte auquel appartient cette mission (par son rang, 1-indexé) */
export function acteDe(rang: number): string {
  return (ACTES.find((a) => rang <= a.fin) ?? ACTES[ACTES.length - 1]).nom
}

/** les 3 premières missions non réclamées, dans l'ordre du fil rouge */
export function missionsActives(reclamees: string[]): MissionDef[] {
  return MISSIONS.filter((m) => !reclamees.includes(m.id)).slice(0, 3)
}
