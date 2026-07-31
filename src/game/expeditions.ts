import type { Cost, UnitId } from './types'

export interface VillageCible {
  id: string
  nom: string
  emoji: string
  desc: string
  /** niveau des remparts ennemis (0–4) */
  mur: number
  garnison: Record<UnitId, number>
  /** butin complet (premier pillage victorieux) */
  butin: Cost
  /** puissance indicative, pour guider le joueur */
  puissance: number
}

/** cooldown entre deux raids sur le même village */
export const RAID_COOLDOWN_MS = 8 * 60_000
/** part du butin lors des pillages suivants */
export const BUTIN_REPETE = 0.4
/** effectif maximal d'une expédition */
export const MAX_TROUPES = 20
/** durée maximale d'un assaut avant retraite forcée */
export const EXPEDITION_TIMEOUT_MS = 180_000

export const VILLAGES_CIBLES: VillageCible[] = [
  {
    id: 'camp-pillards',
    nom: 'Camp de pillards',
    emoji: '⛺',
    desc: 'Ceux-là même qui rançonnent la région. Des tentes, un feu, et vos ressources volées.',
    mur: 0,
    garnison: { lancier: 2, archer: 0, hoplite: 0 },
    butin: { bois: 160, grain: 120 },
    puissance: 25,
  },
  {
    id: 'hameau-thrace',
    nom: 'Hameau thrace',
    emoji: '🛖',
    desc: 'Des mercenaires thraces y font halte entre deux campagnes. Leur palissade est récente.',
    mur: 1,
    garnison: { lancier: 3, archer: 1, hoplite: 0 },
    butin: { bois: 260, pierre: 140 },
    puissance: 55,
  },
  {
    id: 'comptoir-phenicien',
    nom: 'Comptoir phénicien',
    emoji: '⚖️',
    desc: 'Un entrepôt de lingots gardé par des vigiles. Poséidon détourne le regard des affaires des mortels.',
    mur: 1,
    garnison: { lancier: 3, archer: 2, hoplite: 0 },
    butin: { bronze: 90, bois: 160 },
    puissance: 75,
  },
  {
    id: 'village-dardanien',
    nom: 'Village dardanien',
    emoji: '🏘️',
    desc: 'Des cousins de Troie, retranchés derrière un mur de pierre sèche et de bonnes récoltes.',
    mur: 2,
    garnison: { lancier: 5, archer: 2, hoplite: 0 },
    butin: { pierre: 300, grain: 220 },
    puissance: 110,
  },
  {
    id: 'fort-acheen',
    nom: 'Fort achéen',
    emoji: '🪖',
    desc: 'Un poste avancé du camp d’Agamemnon. Y frapper, c’est mordre le lion.',
    mur: 2,
    garnison: { lancier: 4, archer: 3, hoplite: 1 },
    butin: { bronze: 140, pierre: 260 },
    puissance: 150,
  },
  {
    id: 'cite-lesbos',
    nom: 'Cité de Lesbos',
    emoji: '🏛️',
    desc: 'Une cité prospère de l’autre rive, aux murailles crénelées. Achille l’a pillée avant vous.',
    mur: 3,
    garnison: { lancier: 6, archer: 4, hoplite: 2 },
    butin: { bois: 420, pierre: 360, bronze: 110 },
    puissance: 210,
  },
  {
    id: 'citadelle-tenedos',
    nom: 'Citadelle de Ténédos',
    emoji: '🗿',
    desc: 'L’île-forteresse où la flotte achéenne cache ses réserves. Hautes murailles, garnison aguerrie.',
    mur: 3,
    garnison: { lancier: 6, archer: 5, hoplite: 4 },
    butin: { bronze: 220, grain: 420 },
    puissance: 290,
  },
  {
    id: 'forteresse-mysienne',
    nom: 'Forteresse mysienne',
    emoji: '🏰',
    desc: 'La grande place forte de Mysie. Seuls les héros dignes des aèdes en reviennent chargés d’or.',
    mur: 4,
    garnison: { lancier: 8, archer: 6, hoplite: 6 },
    butin: { bois: 620, pierre: 520, bronze: 320 },
    puissance: 420,
  },
]

export const VILLAGES_PAR_ID: Record<string, VillageCible> = Object.fromEntries(
  VILLAGES_CIBLES.map((v) => [v.id, v]),
)

/** puissance indicative d'une troupe du joueur (même métrique que `puissance`) */
export function puissanceTroupes(troupes: Record<UnitId, number>, atk: Record<UnitId, number>, hp: Record<UnitId, number>): number {
  return (Object.keys(troupes) as UnitId[]).reduce(
    (a, u) => a + troupes[u] * (atk[u] + hp[u] / 8),
    0,
  )
}
