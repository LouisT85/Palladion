/*
 * ═══════════════════ LES ANNALES DU RÈGNE ═══════════════════
 *
 * Le jeu ne gardait aucune mémoire chiffrée de lui-même. Le journal racontait
 * des ÉVÉNEMENTS — « assaut repoussé », « Hector est entré à votre service » —
 * mais rien ne disait si la cité montait ou descendait. Un joueur qui trouvait
 * ses greniers vides ne pouvait pas savoir s'ils se vidaient depuis dix minutes
 * ou depuis le début, ni si sa menace grimpait plus vite que son armée.
 *
 * Un relevé toutes les trente secondes, un tableau borné, et l'on peut enfin
 * TRACER le règne. Deux principes :
 *
 *  · on n'enregistre que des états lisibles à l'œil — stocks, effectifs,
 *    menace, ambiance : rien qui demande d'expliquer une formule ;
 *  · le tableau est BORNÉ et arrondi. Une sauvegarde n'a pas à grossir sans fin
 *    parce qu'on laisse l'onglet ouvert une nuit.
 */

/** un relevé toutes les trente secondes de temps réel */
export const PAS_RELEVE_MS = 30_000
/** au-delà, on oublie le plus ancien — deux bonnes heures de jeu tiennent */
export const MAX_RELEVES = 260

export interface Releve {
  /** instant réel du relevé */
  t: number
  /** jour de jeu à cet instant */
  jour: number
  bois: number
  pierre: number
  grain: number
  bronze: number
  /** faveur au temple */
  faveur: number
  pop: number
  /** soldats sous les armes, toutes unités confondues */
  armee: number
  menace: number
  ambiance: number
  /** structure des remparts, en pour-cent de leur maximum */
  mur: number
  prestige: number
}

/** les séries qu'on sait tracer, avec de quoi les dessiner */
export interface SerieDef {
  cle: keyof Omit<Releve, 't' | 'jour'>
  nom: string
  couleur: string
  /** unité affichée après la valeur */
  unite?: string
}

export interface GrapheDef {
  id: string
  titre: string
  /** ce que la courbe apprend, en une phrase — sinon ce n'est qu'un joli tracé */
  lecture: string
  series: SerieDef[]
  /** échelle fixe (0…max) plutôt qu'ajustée au contenu */
  max?: number
}

export const GRAPHES: GrapheDef[] = [
  {
    id: 'ressources',
    titre: 'Les greniers',
    lecture:
      'Une courbe qui plafonne dit que l’entrepôt déborde et que la récolte se perd ; une qui pique du nez dit qu’on mange ses réserves.',
    series: [
      { cle: 'bois', nom: 'Bois', couleur: '#a8763f' },
      { cle: 'pierre', nom: 'Pierre', couleur: '#8b95a1' },
      { cle: 'grain', nom: 'Grain', couleur: '#d9b44a' },
      { cle: 'bronze', nom: 'Bronze', couleur: '#c98a4b' },
    ],
  },
  {
    id: 'guerre',
    titre: 'La guerre',
    lecture:
      'La menace monte avec votre richesse et vos pillages ; si sa courbe s’écarte durablement de celle de la garnison, l’assaut de trop approche.',
    series: [
      { cle: 'menace', nom: 'Menace', couleur: '#c0563f', unite: '' },
      { cle: 'armee', nom: 'Garnison', couleur: '#5f86b5' },
      { cle: 'mur', nom: 'Remparts', couleur: '#9aa3a8', unite: ' %' },
    ],
  },
  {
    id: 'village',
    titre: 'Le village',
    lecture:
      'Population, ambiance et faveur avancent ensemble quand le règne est sain. Une ambiance qui décroche annonce les désertions.',
    series: [
      { cle: 'pop', nom: 'Habitants', couleur: '#7fb069' },
      { cle: 'ambiance', nom: 'Ambiance', couleur: '#e8c04a' },
      { cle: 'faveur', nom: 'Faveur', couleur: '#b78fd0' },
    ],
  },
  {
    id: 'prestige',
    titre: 'Le prestige',
    lecture: 'La seule note finale. Elle ne redescend qu’en perdant ce que le village MONTRE encore — jamais les hauts faits.',
    series: [{ cle: 'prestige', nom: 'Prestige', couleur: '#e8c04a' }],
  },
]

/** valeurs d'une série, dans l'ordre du temps */
export function serie(annales: Releve[], cle: SerieDef['cle']): number[] {
  return annales.map((r) => r[cle])
}

/**
 * Pente d'une série sur les `n` derniers relevés, par minute. C'est ce chiffre
 * qui répond à « est-ce que ça monte ? » — la question que la courbe pose et
 * qu'un œil moyen tranche mal sur trente points serrés.
 */
export function pente(annales: Releve[], cle: SerieDef['cle'], n = 10): number {
  const bout = annales.slice(-Math.max(2, n))
  if (bout.length < 2) return 0
  const dt = (bout[bout.length - 1].t - bout[0].t) / 60_000
  if (dt <= 0) return 0
  return (bout[bout.length - 1][cle] - bout[0][cle]) / dt
}

/** minimum et maximum d'un jeu de séries — l'échelle commune du graphe */
export function bornes(annales: Releve[], series: SerieDef[], max?: number): { bas: number; haut: number } {
  if (max !== undefined) return { bas: 0, haut: max }
  let haut = 0
  for (const s of series) for (const r of annales) haut = Math.max(haut, r[s.cle])
  // un plafond rond et jamais nul : une courbe plate à zéro doit rester lisible
  return { bas: 0, haut: Math.max(10, Math.ceil(haut / 10) * 10) }
}

/** « +12,4 /min », « −3 /min », « stable » */
export function motPente(p: number): string {
  if (Math.abs(p) < 0.05) return 'stable'
  const v = Math.abs(p) >= 10 ? Math.round(Math.abs(p)) : Math.round(Math.abs(p) * 10) / 10
  return `${p > 0 ? '+' : '−'}${String(v).replace('.', ',')} /min`
}
