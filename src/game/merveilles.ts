import { BUILDINGS, RES } from './data'
import { TECHNO_PAR_ID, effetsTechnos } from './technologies'
import type { BuildingId, Cost, ResourceId } from './types'

/*
 * ═══════════════════════════ LES MERVEILLES ═══════════════════════════
 *
 * Les technologies sont le chemin ; la merveille est le couronnement. Après
 * quarante minutes de règne, le village a tout bâti, tout découvert, et il ne
 * lui reste qu'à regarder ses greniers déborder. La merveille donne à ce trop-
 * plein une destination, et à la partie une SIGNATURE.
 *
 * La règle qui fait tout : ON N'EN BÂTIT QU'UNE. Six projets, un seul règne.
 *
 *  · le coût est ÉNORME - deux à trois fois le prix d'un bâtiment au niveau 4,
 *    dans les quatre ressources à la fois. On ne s'y engage pas par curiosité ;
 *  · le chantier est LONG (dix à quinze minutes). Pendant ce temps le village
 *    vit sans rien de neuf : c'est le vrai prix, pas le tas de pierre ;
 *  · l'effet n'est PAS un pourcentage. Une ferveur qui ne peut plus tomber, un
 *    mur qui se répare seul, un moral qui ne descend plus : chacune retire une
 *    inquiétude du jeu, et l'on joue autrement le quart d'heure qui suit.
 *
 * Les prérequis exigent des bâtiments au dernier niveau ET des découvertes
 * précises : la Grande Forge veut le four à réverbère, le Phare veut savoir
 * lire le ciel. Sans l'arbre, aucune merveille - c'est ce qui relie les deux.
 *
 * Tout ce fichier est PUR : le store appelle, l'état est à lui.
 */

export type MerveilleId = 'palladion-dore' | 'murs-poseidon' | 'phare' | 'theatre' | 'grande-forge' | 'jardins'

/**
 * Ce qu'une merveille achevée change. Rien ici ne ressemble aux petits
 * pourcentages des reliques : ce sont des règles qui sautent.
 */
export interface EffetMerveille {
  /** plancher de relation garanti à CHAQUE dieu : la ferveur ne descend plus dessous */
  planchierRelation?: number
  faveurPct?: number
  /** structure de l'enceinte en plus */
  murPct?: number
  /** part du mur maximal remaçonnée chaque minute, sans rien payer */
  murRepareParMin?: number
  /** préavis d'assaut multiplié : on voit venir de bien plus loin */
  preavisMult?: number
  /** les fronts de l'assaut sont annoncés, toujours, sans Ulysse */
  revelerFronts?: boolean
  /** la mer reste ouverte en hiver */
  merOuverte?: boolean
  /** portée des tours */
  porteePct?: number
  /** l'ambiance ne peut plus descendre sous ce seuil */
  moralPlancher?: number
  /** gains des dilemmes majorés (ressources, faveur, ambiance) */
  dilemmesPct?: number
  bronzePct?: number
  grainPct?: number
  /** prix des unités, en moins */
  uniteRemisePct?: number
  /** durée de formation, en moins */
  recruesPct?: number
  /** délai entre deux naissances divisé par ce facteur */
  popMult?: number
  /** places d'habitation en plus, quel que soit le niveau des maisons */
  popCapPlus?: number
}

export const MERVEILLE_NEUTRE: EffetMerveille = {}

export interface MerveilleDef {
  id: MerveilleId
  nom: string
  emoji: string
  /** ce qu'elle est, et ce qu'on voit quand on la regarde */
  desc: string
  /** ce qu'elle change, en une phrase de joueur */
  promesse: string
  /** les lignes de l'effet, pour la fiche */
  effets: string[]
  cout: Cost
  /** durée de chantier de base, en secondes */
  duree: number
  /** bâtiments exigés, au niveau dit */
  batiments: { id: BuildingId; niveau: number }[]
  /** découvertes exigées */
  technos: string[]
  effet: EffetMerveille
}

export const MERVEILLES: MerveilleDef[] = [
  {
    id: 'palladion-dore',
    nom: 'Le Palladion doré',
    emoji: '🗿',
    desc: 'La statue tombée du ciel, jusque-là de bois noirci, revêtue de feuilles d’or battu et dressée sur un socle de marbre au fond de la cella. On la voit briller depuis la plaine.',
    promesse: 'Les dieux ne vous quittent plus : aucune ferveur ne peut retomber au-dessous de la bienveillance.',
    effets: [
      'Relation plancher de +40 auprès des quatre Olympiens',
      'Aucun palier de colère ne peut plus s’ouvrir',
      '+30 % de faveur produite',
    ],
    cout: { bois: 1400, pierre: 2200, bronze: 900, grain: 900 },
    duree: 780,
    batiments: [
      { id: 'temple', niveau: 4 },
      { id: 'agora', niveau: 3 },
    ],
    technos: ['etain', 'four-reverbere'],
    effet: { planchierRelation: 40, faveurPct: 0.3 },
  },
  {
    id: 'murs-poseidon',
    nom: 'Les Murs de Poséidon',
    emoji: '🧱',
    desc: 'L’enceinte reprise bloc à bloc comme le dieu la bâtit pour Laomédon : des cyclopéens de dix tonnes, ajustés sans un jour, que nul bélier n’ébranle. Ce qui se fend se referme.',
    promesse: 'L’enceinte gagne la moitié de sa structure et se remaçonne d’elle-même entre deux assauts.',
    effets: [
      '+50 % de structure aux remparts',
      'Le mur se répare seul de 3 % par minute, gratuitement',
      '+20 % de portée pour les tours',
    ],
    cout: { bois: 900, pierre: 3200, bronze: 600, grain: 700 },
    duree: 840,
    batiments: [
      { id: 'remparts', niveau: 4 },
      { id: 'carriere', niveau: 3 },
    ],
    technos: ['chaux', 'poulie'],
    effet: { murPct: 0.5, murRepareParMin: 0.03, porteePct: 0.2 },
  },
  {
    id: 'phare',
    nom: 'Le Phare du cap',
    emoji: '🗼',
    desc: 'Une tour de pierre au bout du promontoire, un feu de résine entretenu nuit et jour, un miroir de bronze poli derrière la flamme. On voit la voile avant qu’elle ne voie la côte.',
    promesse: 'Plus rien ne vous surprend : les assauts sont annoncés deux fois plus tôt, avec leurs fronts, et la mer ne se ferme jamais.',
    effets: [
      'Préavis d’assaut doublé',
      'Les fronts de chaque assaut sont révélés, toujours',
      'Le port travaille même en hiver',
      '+20 % de portée pour les tours',
    ],
    cout: { bois: 1600, pierre: 1800, bronze: 750, grain: 800 },
    duree: 720,
    batiments: [
      { id: 'port', niveau: 4 },
      { id: 'remparts', niveau: 3 },
    ],
    technos: ['voile-quille', 'astronomie'],
    effet: { preavisMult: 2, revelerFronts: true, merOuverte: true, porteePct: 0.2 },
  },
  {
    id: 'theatre',
    nom: 'Le Théâtre de la colline',
    emoji: '🎭',
    desc: 'Des gradins taillés à même la pente, une orchestra de terre battue, un autel au milieu. Le village entier s’y assied pour entendre ses propres histoires - et repart plus léger.',
    promesse: 'Le peuple ne désespère plus : l’ambiance ne descend plus sous soixante-dix, et les délibérations rapportent moitié plus.',
    effets: [
      'Ambiance plancher de 70, quoi qu’il arrive',
      '+50 % sur tout ce que rapporte un dilemme',
      '+20 % de faveur produite',
    ],
    cout: { bois: 1500, pierre: 1900, bronze: 500, grain: 1200 },
    duree: 660,
    batiments: [
      { id: 'agora', niveau: 4 },
      { id: 'maisons', niveau: 3 },
    ],
    technos: ['arpentage', 'ecriture'],
    effet: { moralPlancher: 70, dilemmesPct: 0.5, faveurPct: 0.2 },
  },
  {
    id: 'grande-forge',
    nom: 'La Grande Forge',
    emoji: '⚒️',
    desc: 'Douze foyers sous une même charpente, les soufflets menés par un attelage, les moules alignés sur cent pas. Le bronze n’y est plus compté, il y coule.',
    promesse: 'Le bronze cesse d’être le goulot du village : il double presque, et l’on arme les hommes pour un tiers de moins.',
    effets: [
      '+80 % de bronze produit',
      '−30 % sur le prix de toutes les unités',
      '−25 % sur leur durée de formation',
    ],
    cout: { bois: 1300, pierre: 1700, bronze: 1000, grain: 700 },
    duree: 720,
    batiments: [
      { id: 'forge', niveau: 4 },
      { id: 'caserne', niveau: 3 },
    ],
    technos: ['soufflet', 'four-reverbere', 'etain'],
    effet: { bronzePct: 0.8, uniteRemisePct: 0.3, recruesPct: 0.25 },
  },
  {
    id: 'jardins',
    nom: 'Les Jardins en terrasses',
    emoji: '🌳',
    desc: 'Sept terrasses irriguées à flanc de coteau, figuiers, vignes et grenadiers, l’eau montée par des noria de bois. On y mange à sa faim en toute saison.',
    promesse: 'Le village se remplit : les naissances viennent trois fois plus vite et les maisons trouvent toujours de la place.',
    effets: [
      'Naissances trois fois plus rapides',
      '+4 places d’habitation, quel que soit le niveau des maisons',
      '+35 % de grain produit',
    ],
    cout: { bois: 1200, pierre: 1500, bronze: 450, grain: 1600 },
    duree: 660,
    batiments: [
      { id: 'ferme', niveau: 4 },
      { id: 'maisons', niveau: 4 },
    ],
    technos: ['irrigation', 'greffe'],
    effet: { popMult: 3, popCapPlus: 4, grainPct: 0.35 },
  },
]

export const MERVEILLE_PAR_ID: Record<string, MerveilleDef> = Object.fromEntries(MERVEILLES.map((m) => [m.id, m]))
export const MERVEILLE_IDS = MERVEILLES.map((m) => m.id)

// ── L'instantané que ces règles demandent ────────────────────────────────────

/** vue en lecture seule de la partie, tout ce qu'il faut pour juger un projet */
export interface SnapMerveille {
  buildings: Record<BuildingId, { level: number }>
  resources: Record<ResourceId, number>
  /** la merveille engagée : en chantier (`faite: false`) ou achevée */
  merveille?: { id: string; faite: boolean } | null
}

// ── Peut-on la bâtir ? ───────────────────────────────────────────────────────

export interface VerdictMerveille {
  ok: boolean
  /** ce qui manque, en clair - vide si l'on peut lancer le chantier */
  manques: string[]
  /** une merveille est déjà engagée : plus aucune autre, jamais */
  dejaEngagee: boolean
}

/**
 * Le verdict complet, avec ses raisons. On énumère TOUT ce qui manque et non la
 * première pierre d'achoppement : devant un projet de dix minutes, le joueur a
 * besoin de savoir ce qui lui reste à faire, pas de le découvrir en trois fois.
 */
export function peutBatirMerveille(id: string, snap: SnapMerveille, technos: string[] = []): VerdictMerveille {
  const def = MERVEILLE_PAR_ID[id]
  if (!def) return { ok: false, manques: ['Merveille inconnue.'], dejaEngagee: false }

  const engagee = snap.merveille ?? null
  if (engagee) {
    const autre = MERVEILLE_PAR_ID[engagee.id]?.nom ?? engagee.id
    if (engagee.id === id) {
      return {
        ok: false,
        manques: [engagee.faite ? 'Elle est bâtie.' : 'Son chantier est en cours.'],
        dejaEngagee: true,
      }
    }
    return {
      ok: false,
      manques: [`${autre} : c’est la merveille de ce règne, et il n’y en a qu’une.`],
      dejaEngagee: true,
    }
  }

  const manques: string[] = []
  for (const b of def.batiments) {
    if ((snap.buildings[b.id]?.level ?? 0) < b.niveau) manques.push(`${BUILDINGS[b.id].nom} niveau ${b.niveau}`)
  }
  for (const t of def.technos) {
    if (!technos.includes(t)) manques.push(`${TECHNO_PAR_ID[t]?.nom ?? t} (découverte)`)
  }
  for (const r of Object.keys(def.cout) as ResourceId[]) {
    const du = def.cout[r] ?? 0
    const a = snap.resources[r] ?? 0
    if (a < du) manques.push(`${Math.ceil(du - a)} ${RES[r].nom.toLowerCase()} de plus`)
  }
  return { ok: manques.length === 0, manques, dejaEngagee: false }
}

/**
 * Les merveilles qu'on pourrait lancer maintenant. Tableau vide dès qu'une est
 * engagée : c'est la règle du règne unique, appliquée à la source.
 */
export function merveillesPossibles(snap: SnapMerveille, technos: string[] = []): MerveilleDef[] {
  return MERVEILLES.filter((m) => peutBatirMerveille(m.id, snap, technos).ok)
}

/** ce que la merveille achevée donne - rien si elle n'est pas finie */
export function effetMerveille(id: string | null | undefined): EffetMerveille {
  if (!id) return MERVEILLE_NEUTRE
  return MERVEILLE_PAR_ID[id]?.effet ?? MERVEILLE_NEUTRE
}

/** l'effet réellement en vigueur : un chantier en cours ne donne encore rien */
export function effetEnVigueur(m: { id: string; faite: boolean } | null | undefined): EffetMerveille {
  return m?.faite ? effetMerveille(m.id) : MERVEILLE_NEUTRE
}

export function coutMerveille(id: string): Cost {
  return MERVEILLE_PAR_ID[id]?.cout ?? {}
}

/**
 * Durée du chantier en MILLISECONDES. Les découvertes de levage y pèsent - la
 * poulie et la corde tressée ont été inventées pour cela - mais jamais au-delà
 * de la moitié : une merveille bâtie en cinq minutes ne serait plus un projet.
 */
export function dureeMerveille(id: string, technos: string[] = []): number {
  const def = MERVEILLE_PAR_ID[id]
  if (!def) return 0
  const mult = Math.max(0.5, 1 - effetsTechnos(technos).chantierPct)
  return Math.round(def.duree * 1000 * mult)
}

/** total du coût, toutes ressources confondues - pour trier les six par ampleur */
export function ampleurMerveille(id: string): number {
  const c = coutMerveille(id)
  return (Object.keys(c) as ResourceId[]).reduce((a, r) => a + (c[r] ?? 0), 0)
}
