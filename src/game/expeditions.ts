import { UNITS, UNIT_IDS, troupes } from './data'
import type { Cost, UnitId } from './types'

/**
 * Deux façons de marcher sur un village : le piller (riche, mais on s'en souvient
 * et les dieux de l'hospitalité comptent les points) ou le secourir (rien à
 * gagner sur l'instant, un allié pour la suite). Le choix est cornélien à dessein.
 */
export type Intention = 'pillage' | 'secours'

export interface VillageCible {
  id: string
  nom: string
  emoji: string
  desc: string
  /** niveau des remparts ennemis (0-4) */
  mur: number
  garnison: Record<UnitId, number>
  /** butin complet (premier pillage victorieux) */
  butin: Cost
  /** puissance indicative, pour guider le joueur */
  puissance: number
  /** true = de l'autre côté de l'eau : inatteignable quand l'hiver ferme la mer */
  maritime?: boolean
  /** décor de la scène d'assaut */
  decor: 'camp' | 'hameau' | 'comptoir' | 'village' | 'fort' | 'cite' | 'citadelle' | 'forteresse'
  /** cadre du lieu : plaine, grève ou île - pilote le terrain de la scène */
  terrain: 'plaine' | 'cote' | 'ile' | 'colline'
}

/** cooldown entre deux raids sur le même village */
export const RAID_COOLDOWN_MS = 8 * 60_000
/** part du butin lors des pillages suivants */
export const BUTIN_REPETE = 0.4
/** effectif maximal d'une expédition */
export const MAX_TROUPES = 20
/** durée maximale d'un assaut avant retraite forcée */
export const EXPEDITION_TIMEOUT_MS = 180_000
/** un village pillé renforce sa garnison : +25 % par pillage encaissé, plafonné */
export const RENFORT_PAR_PILLAGE = 0.25
export const RENFORT_MAX = 1.75
/** fenêtre pendant laquelle un appel au secours reste honorable */
export const SECOURS_FENETRE_MS = 5 * 60_000
/** un allié envoie son tribut toutes les trois minutes */
export const TRIBUT_MS = 3 * 60_000

export const VILLAGES_CIBLES: VillageCible[] = [
  {
    id: 'camp-pillards',
    nom: 'Camp de pillards',
    emoji: '⛺',
    desc: 'Ceux-là même qui rançonnent la région. Des tentes, un feu, et vos ressources volées.',
    mur: 0,
    garnison: { lancier: 2, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0 },
    butin: { bois: 160, grain: 120 },
    puissance: 25,
    decor: 'camp',
    terrain: 'plaine',
  },
  {
    id: 'hameau-thrace',
    nom: 'Hameau thrace',
    emoji: '🛖',
    desc: 'Des mercenaires thraces y font halte entre deux campagnes. Leur palissade est récente.',
    mur: 1,
    garnison: { lancier: 3, archer: 1, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0 },
    butin: { bois: 260, pierre: 140 },
    puissance: 55,
    decor: 'hameau',
    terrain: 'colline',
  },
  {
    id: 'comptoir-phenicien',
    nom: 'Comptoir phénicien',
    emoji: '⚖️',
    desc: 'Un entrepôt de lingots gardé par des vigiles. Poséidon détourne le regard des affaires des mortels.',
    mur: 1,
    garnison: { lancier: 3, archer: 2, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0 },
    butin: { bronze: 90, bois: 160 },
    puissance: 75,
    decor: 'comptoir',
    terrain: 'cote',
  },
  {
    id: 'village-dardanien',
    nom: 'Village dardanien',
    emoji: '🏘️',
    desc: 'Des cousins de Troie, retranchés derrière un mur de pierre sèche et de bonnes récoltes.',
    mur: 2,
    garnison: { lancier: 5, archer: 2, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0 },
    butin: { pierre: 300, grain: 220 },
    puissance: 110,
    decor: 'village',
    terrain: 'plaine',
  },
  {
    id: 'fort-acheen',
    nom: 'Fort achéen',
    emoji: '🪖',
    desc: 'Un poste avancé du camp d’Agamemnon. Y frapper, c’est mordre le lion.',
    mur: 2,
    garnison: { lancier: 4, archer: 3, hoplite: 1, frondeur: 0, peltaste: 0, belier: 0 },
    butin: { bronze: 140, pierre: 260 },
    puissance: 150,
    decor: 'fort',
    terrain: 'cote',
  },
  {
    id: 'cite-lesbos',
    nom: 'Cité de Lesbos',
    emoji: '🏛️',
    desc: 'Une cité prospère de l’autre rive, aux murailles crénelées. Achille l’a pillée avant vous.',
    mur: 3,
    garnison: { lancier: 6, archer: 4, hoplite: 2, frondeur: 0, peltaste: 0, belier: 0 },
    butin: { bois: 420, pierre: 360, bronze: 110 },
    puissance: 210,
    maritime: true,
    decor: 'cite',
    terrain: 'ile',
  },
  {
    id: 'citadelle-tenedos',
    nom: 'Citadelle de Ténédos',
    emoji: '🗿',
    desc: 'L’île-forteresse où la flotte achéenne cache ses réserves. Hautes murailles, garnison aguerrie.',
    mur: 3,
    garnison: { lancier: 6, archer: 5, hoplite: 4, frondeur: 0, peltaste: 0, belier: 0 },
    butin: { bronze: 220, grain: 420 },
    puissance: 290,
    maritime: true,
    decor: 'citadelle',
    terrain: 'ile',
  },
  {
    id: 'forteresse-mysienne',
    nom: 'Forteresse mysienne',
    emoji: '🏰',
    desc: 'La grande place forte de Mysie. Seuls les héros dignes des aèdes en reviennent chargés d’or.',
    mur: 4,
    garnison: { lancier: 8, archer: 6, hoplite: 6, frondeur: 0, peltaste: 0, belier: 0 },
    butin: { bois: 620, pierre: 520, bronze: 320 },
    puissance: 420,
    decor: 'forteresse',
    terrain: 'colline',
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

/**
 * Garnison réellement en place : un village déjà pillé se méfie et double les
 * gardes. C'est le prix du butin répété - le raid facile ne le reste jamais.
 */
export function garnisonEffective(v: VillageCible, pillages: number): Record<UnitId, number> {
  const k = Math.min(RENFORT_MAX, 1 + pillages * RENFORT_PAR_PILLAGE)
  return troupes({
    lancier: Math.round(v.garnison.lancier * k),
    archer: Math.round(v.garnison.archer * k),
    hoplite: Math.round(v.garnison.hoplite * k),
  })
}

export function puissanceEffective(v: VillageCible, pillages: number): number {
  return Math.round(v.puissance * Math.min(RENFORT_MAX, 1 + pillages * RENFORT_PAR_PILLAGE))
}

/**
 * La bande qui assiège un village appelant au secours. On la combat en rase
 * campagne (aucun mur à briser) : c'est plus court, plus sanglant, et il n'y a
 * rien à rafler au bout.
 */
export function assiegeants(v: VillageCible): Record<UnitId, number> {
  const p = v.puissance
  return troupes({
    lancier: Math.max(2, Math.round(p / 34)),
    archer: Math.max(1, Math.round(p / 70)),
    hoplite: p >= 140 ? Math.round(p / 130) : 0,
  })
}

/** puissance de la bande assiégeante, dans la même métrique que les villages */
export function puissanceAssiegeants(v: VillageCible): number {
  return Math.round(v.puissance * 0.85)
}

/**
 * Puissance d'une troupe, dans la métrique que le panneau d'expédition affiche au
 * joueur. C'est elle qui doit servir à décider QUI appelle au secours : un village
 * dont les assiégeants pèsent 247 ne peut pas implorer l'aide d'un chef qui a
 * trois lanciers - la fenêtre s'ouvrait, le joueur voyait le chiffre, et n'avait
 * plus qu'à regarder Zeus compter son absence.
 */
export function puissanceTroupe(army: Record<UnitId, number>): number {
  return UNIT_IDS.reduce((a, u) => a + (army[u] ?? 0) * (UNITS[u].atk + UNITS[u].hp / 8), 0)
}

/**
 * Les villages qui peuvent décemment appeler CE chef à l'aide : ceux dont les
 * assiégeants sont à sa portée. On garde une marge de 15 % - un secours doit être
 * un risque, pas une formalité - mais jamais l'impossible.
 */
export function appelsAPortee(candidats: VillageCible[], army: Record<UnitId, number>): VillageCible[] {
  const force = puissanceTroupe(army)
  return candidats.filter((v) => puissanceAssiegeants(v) <= force * 1.15)
}

/** tribut qu'un allié fait porter toutes les TRIBUT_MS - un dixième de son butin */
export function tributDe(v: VillageCible): Cost {
  const out: Cost = {}
  for (const [r, n] of Object.entries(v.butin) as [keyof Cost, number][]) {
    const part = Math.round(n * 0.1)
    if (part > 0) out[r] = part
  }
  return out
}

/** renforts qu'un allié envoie sur vos remparts quand l'assaut sonne */
export function renfortsDe(v: VillageCible): Record<UnitId, number> {
  const p = v.puissance
  return troupes({
    lancier: Math.max(1, Math.round(p / 90)),
    archer: p >= 100 ? 1 : 0,
    hoplite: p >= 250 ? 1 : 0,
  })
}
