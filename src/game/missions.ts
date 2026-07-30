import type { BuildingId, Cost, GodId, UnitId } from './types'

/*
 * Missions à récompenses — le fil rouge du joueur, façon Clash of Clans :
 * toujours un objectif visible, une récompense qui débloque l'étape suivante.
 * Elles se réclament dans l'ordre (les 3 premières non réclamées sont actives).
 */

export interface EtatMissions {
  buildings: Record<BuildingId, { level: number }>
  army: Record<UnitId, number>
  pop: number
  morale: number
  stats: { repousses: number; perdus: number; evenements: number }
  expeditions: Record<string, { etoiles: number }>
  gods: Record<GodId, { relation: number }>
}

export interface MissionDef {
  id: string
  emoji: string
  titre: string
  desc: string
  /** progression courante (fait quand cur ≥ max) */
  progres: (s: EtatMissions) => { cur: number; max: number }
  recompense: { res?: Cost; faveur?: number; pop?: number }
}

function niveau(b: BuildingId, n: number) {
  return (s: EtatMissions) => ({ cur: Math.min(s.buildings[b].level, n), max: n })
}

function armee(s: EtatMissions): number {
  return s.army.lancier + s.army.archer + s.army.hoplite
}

export const MISSIONS: MissionDef[] = [
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
    desc: 'Entretenez une garnison de 3 soldats.',
    progres: (s) => ({ cur: Math.min(armee(s), 3), max: 3 }),
    recompense: { res: { bronze: 30, grain: 50 } },
  },
  {
    id: 'premiere-victoire',
    emoji: '🏆',
    titre: 'Première victoire',
    desc: 'Repoussez un assaut : que les pillards apprennent votre nom.',
    progres: (s) => ({ cur: Math.min(s.stats.repousses, 1), max: 1 }),
    recompense: { res: { bronze: 60 }, faveur: 10 },
  },
  {
    id: 'maison-des-dieux',
    emoji: '⚡',
    titre: 'La maison des dieux',
    desc: 'Élevez un temple : sans les Olympiens, aucune muraille ne tient.',
    progres: niveau('temple', 1),
    recompense: { res: { pierre: 80 }, faveur: 15 },
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
    id: 'yeux-sur-les-murs',
    emoji: '🏹',
    titre: 'Des yeux sur les murs',
    desc: 'Formez 2 archers : depuis les remparts, chaque flèche compte double.',
    progres: (s) => ({ cur: Math.min(s.army.archer, 2), max: 2 }),
    recompense: { res: { bronze: 40 } },
  },
  {
    id: 'premier-raid',
    emoji: '🏴‍☠️',
    titre: 'Premier raid',
    desc: 'Menez une expédition victorieuse contre un village de la Troade.',
    progres: (s) => ({
      cur: Object.values(s.expeditions).some((e) => e.etoiles >= 1) ? 1 : 0,
      max: 1,
    }),
    recompense: { res: { bronze: 100 }, faveur: 10 },
  },
  {
    id: 'muraille-de-pierre',
    emoji: '🏰',
    titre: 'Muraille de pierre',
    desc: 'Remplacez la palissade par un mur de pierre sèche (remparts niveau 2).',
    progres: niveau('remparts', 2),
    recompense: { res: { grain: 120, bronze: 40 } },
  },
  {
    id: 'commerce-egeen',
    emoji: '⚓',
    titre: 'Le commerce égéen',
    desc: 'Construisez le port : l’Égée est une route, pas une frontière.',
    progres: niveau('port', 1),
    recompense: { res: { bronze: 60 } },
  },
  {
    id: 'trois-etoiles',
    emoji: '⭐',
    titre: 'Trois étoiles',
    desc: 'Rasez un village ennemi sans presque aucune perte (3★).',
    progres: (s) => ({
      cur: Object.values(s.expeditions).some((e) => e.etoiles >= 3) ? 1 : 0,
      max: 1,
    }),
    recompense: { res: { bronze: 80 }, faveur: 15 },
  },
  {
    id: 'muraille-d-hoplites',
    emoji: '⚔️',
    titre: 'Une muraille d’hoplites',
    desc: 'Formez 2 hoplites, l’élite au bouclier rond.',
    progres: (s) => ({ cur: Math.min(s.army.hoplite, 2), max: 2 }),
    recompense: { res: { grain: 60 }, faveur: 10 },
  },
  {
    id: 'devotion',
    emoji: '🦉',
    titre: 'Dévotion',
    desc: 'Gagnez la confiance d’un Olympien (relation ≥ 25). Athéna murmure aux fidèles…',
    progres: (s) => ({
      cur: Object.values(s.gods).some((g) => g.relation >= 25) ? 1 : 0,
      max: 1,
    }),
    recompense: { faveur: 25 },
  },
  {
    id: 'prosperite',
    emoji: '💰',
    titre: 'Prospérité',
    desc: 'Portez l’Agora au niveau 3 : que votre place rivalise avec celles d’Ionie.',
    progres: niveau('agora', 3),
    recompense: { res: { pierre: 200, bronze: 80 }, faveur: 20 },
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
    recompense: { res: { bois: 300, pierre: 300, grain: 300, bronze: 100 }, faveur: 30 },
  },
]

export const MISSIONS_PAR_ID: Record<string, MissionDef> = Object.fromEntries(MISSIONS.map((m) => [m.id, m]))

/** les 3 premières missions non réclamées, dans l'ordre du fil rouge */
export function missionsActives(reclamees: string[]): MissionDef[] {
  return MISSIONS.filter((m) => !reclamees.includes(m.id)).slice(0, 3)
}
