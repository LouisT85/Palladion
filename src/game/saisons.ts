import type { ResourceId } from './types'

/*
 * Le temps qui passe sur la Troade : quatre saisons, et une météo qui tourne
 * par-dessus. Les deux pèsent sur l'économie ET sur les batailles — un assaut
 * sous la pluie d'automne ne se joue pas comme un assaut par un matin d'été.
 */

export type SaisonId = 'printemps' | 'ete' | 'automne' | 'hiver'
export type MeteoId = 'clair' | 'pluie' | 'brume' | 'orage' | 'canicule' | 'neige'

/** une saison dure quatre journées de jeu (soit ~32 min réelles) */
export const JOURS_PAR_SAISON = 4

export interface SaisonDef {
  id: SaisonId
  nom: string
  emoji: string
  /** ce que le joueur doit comprendre en une phrase */
  desc: string
  /** multiplicateurs de production par ressource */
  prod: Partial<Record<ResourceId, number>>
  /** météos possibles, avec leur poids */
  meteos: { id: MeteoId; poids: number }[]
  /** teinte d'ambiance appliquée à la carte */
  teinte: string
  teinteOpacite: number
  /** couleur dominante du feuillage cette saison */
  feuillage: string
  /** true = la mer est fermée : pas d'expédition maritime, port ralenti */
  merFermee?: boolean
}

export const SAISONS: Record<SaisonId, SaisonDef> = {
  printemps: {
    id: 'printemps',
    nom: 'Printemps',
    emoji: '🌱',
    desc: 'Les semailles lèvent : les champs donnent généreusement, la pierre attend.',
    prod: { grain: 1.3, bois: 1.05, pierre: 0.95, bronze: 1 },
    meteos: [
      { id: 'clair', poids: 50 },
      { id: 'pluie', poids: 30 },
      { id: 'brume', poids: 12 },
      { id: 'orage', poids: 8 },
    ],
    teinte: '#7fbf5a',
    teinteOpacite: 0.06,
    feuillage: '#6f9a52',
  },
  ete: {
    id: 'ete',
    nom: 'Été',
    emoji: '☀️',
    desc: 'La terre craque de sécheresse, mais les chantiers avancent et la mer est ouverte.',
    prod: { grain: 0.8, bois: 1, pierre: 1.2, bronze: 1.15 },
    meteos: [
      { id: 'clair', poids: 55 },
      { id: 'canicule', poids: 28 },
      { id: 'orage', poids: 12 },
      { id: 'brume', poids: 5 },
    ],
    teinte: '#e8c46a',
    teinteOpacite: 0.09,
    feuillage: '#8a9a55',
  },
  automne: {
    id: 'automne',
    nom: 'Automne',
    emoji: '🍂',
    desc: 'La grande récolte : les greniers débordent avant que le froid ne vienne.',
    prod: { grain: 1.45, bois: 1.15, pierre: 1, bronze: 1 },
    meteos: [
      { id: 'clair', poids: 35 },
      { id: 'pluie', poids: 34 },
      { id: 'brume', poids: 20 },
      { id: 'orage', poids: 11 },
    ],
    teinte: '#c97f3a',
    teinteOpacite: 0.1,
    feuillage: '#a5813c',
  },
  hiver: {
    id: 'hiver',
    nom: 'Hiver',
    emoji: '❄️',
    desc: 'Tout ralentit, la mer se ferme. On vit sur les réserves et on répare les murs.',
    prod: { grain: 0.5, bois: 0.75, pierre: 0.7, bronze: 0.85 },
    meteos: [
      { id: 'neige', poids: 38 },
      { id: 'brume', poids: 27 },
      { id: 'pluie', poids: 20 },
      { id: 'clair', poids: 15 },
    ],
    teinte: '#9db6cf',
    teinteOpacite: 0.13,
    feuillage: '#7f8a6f',
    merFermee: true,
  },
}

export const SAISON_IDS = Object.keys(SAISONS) as SaisonId[]

export interface MeteoDef {
  id: MeteoId
  nom: string
  emoji: string
  desc: string
  /** multiplicateur global de production */
  prod: number
  /** portée des archers et des tours (×) */
  portee: number
  /** vitesse de déplacement en bataille (×) — la boue ralentit tout le monde */
  vitesse: number
  /** dégâts des projectiles (×) : une corde mouillée porte mal */
  tir: number
  /** fenêtre d'alerte des éclaireurs (×) : par la brume, on voit venir trop tard */
  alerte: number
}

export const METEOS: Record<MeteoId, MeteoDef> = {
  clair: {
    id: 'clair',
    nom: 'Temps clair',
    emoji: '🌤️',
    desc: 'Rien ne gêne le travail ni le tir.',
    prod: 1,
    portee: 1,
    vitesse: 1,
    tir: 1,
    alerte: 1,
  },
  pluie: {
    id: 'pluie',
    nom: 'Pluie',
    emoji: '🌧️',
    desc: 'Cordes détendues et sol détrempé : les arcs portent mal, tout le monde patauge.',
    prod: 0.9,
    portee: 0.8,
    vitesse: 0.82,
    tir: 0.7,
    alerte: 1,
  },
  brume: {
    id: 'brume',
    nom: 'Brume',
    emoji: '🌫️',
    desc: 'On ne voit pas à vingt pas : les tours tirent court, les éclaireurs préviennent tard.',
    prod: 0.95,
    portee: 0.62,
    vitesse: 1,
    tir: 0.9,
    alerte: 0.55,
  },
  orage: {
    id: 'orage',
    nom: 'Orage',
    emoji: '⛈️',
    desc: 'Le ciel gronde — Zeus est proche, et sa foudre plus généreuse.',
    prod: 0.85,
    portee: 0.85,
    vitesse: 0.9,
    tir: 0.8,
    alerte: 0.85,
  },
  canicule: {
    id: 'canicule',
    nom: 'Canicule',
    emoji: '🔥',
    desc: 'La chaleur écrase les hommes : on travaille moins, on se bat moins vite.',
    prod: 0.78,
    portee: 1,
    vitesse: 0.88,
    tir: 1,
    alerte: 1,
  },
  neige: {
    id: 'neige',
    nom: 'Neige',
    emoji: '🌨️',
    desc: 'Les chemins disparaissent : les colonnes avancent au pas, les récoltes attendent.',
    prod: 0.7,
    portee: 0.75,
    vitesse: 0.7,
    tir: 0.85,
    alerte: 1.15,
  },
}

/** l'orage double la générosité de Zeus — un clin d'œil au maître du tonnerre */
export const BONUS_ORAGE_ZEUS = 1.35

/** saison courante d'après le nombre de journées écoulées depuis la fondation */
export function saisonDe(jour: number): SaisonId {
  return SAISON_IDS[Math.floor(jour / JOURS_PAR_SAISON) % SAISON_IDS.length]
}

/** année de jeu (1, 2, 3…) — pour le journal et les hauts faits */
export function anneeDe(jour: number): number {
  return Math.floor(jour / (JOURS_PAR_SAISON * SAISON_IDS.length)) + 1
}

/** tire une météo pour la saison donnée */
export function tirerMeteo(saison: SaisonId): MeteoId {
  const pool = SAISONS[saison].meteos
  const somme = pool.reduce((a, m) => a + m.poids, 0)
  let r = Math.random() * somme
  for (const m of pool) {
    r -= m.poids
    if (r <= 0) return m.id
  }
  return pool[0].id
}

/** multiplicateur de production d'une ressource, saison × météo */
export function multProduction(saison: SaisonId, meteo: MeteoId, res: ResourceId): number {
  return (SAISONS[saison].prod[res] ?? 1) * METEOS[meteo].prod
}
