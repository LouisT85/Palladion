import type { GodId } from './types'

/*
 * ═══════════════════ L'ARBRE DE FAVEUR ═══════════════════
 *
 * La relation à un dieu ne servait qu'à une chose : multiplier la puissance de sa
 * bénédiction. Elle montait, elle descendait, et l'on n'en faisait jamais rien -
 * c'était une jauge, pas une décision.
 *
 * Ici, la relation se DÉPENSE. Chaque Olympien offre trois grâces permanentes,
 * payées en points de relation. Trois principes :
 *
 *  · ce qu'on achète est ACQUIS : une grâce ne se perd pas si le dieu se refroidit
 *    ensuite. On a versé le prix, on garde le don ;
 *  · ce qu'on dépense est PERDU pour la puissance des bénédictions - la relation
 *    retombe d'autant. Monter sa ferveur ou l'échanger, c'est le vrai arbitrage ;
 *  · les grâces d'un dieu se prennent DANS L'ORDRE : la troisième d'Arès n'a de
 *    sens qu'après les deux premières, et l'ordre raconte quelque chose de lui.
 */

export interface Grace {
  id: string
  nom: string
  desc: string
  emoji: string
  /** points de relation à verser - retirés définitivement */
  cout: number
}

export interface BonusFaveurs {
  /** production de faveur multipliée */
  faveurPct: number
  /** coût des bénédictions réduit (part) */
  remisePct: number
  /** structure des remparts en plus */
  murPct: number
  /** dégâts de toute l'armée en plus */
  degatsPct: number
  /** récolte de toutes les ressources en plus */
  recoltePct: number
  /** temps de formation des recrues réduit (part) */
  recruesPct: number
  /** butin d'expédition en plus */
  butinPct: number
  /** les tours tirent plus loin (part) */
  porteePct: number
  /** un assaut sur N est annoncé avec ses fronts, sans Ulysse */
  revelerFronts: boolean
  /** la mer reste ouverte en hiver */
  merOuverte: boolean
  /** les héros mangent moins */
  entretienPct: number
  /** une part des pertes de bataille est épargnée */
  epargnePct: number
}

export const FAVEURS_NEUTRES: BonusFaveurs = {
  faveurPct: 0,
  remisePct: 0,
  murPct: 0,
  degatsPct: 0,
  recoltePct: 0,
  recruesPct: 0,
  butinPct: 0,
  porteePct: 0,
  revelerFronts: false,
  merOuverte: false,
  entretienPct: 0,
  epargnePct: 0,
}

/**
 * Les douze grâces, trois par dieu, dans l'ordre où elles se prennent. Chacune
 * dit quelque chose du dieu qui l'accorde : Zeus donne le ciel et la loi,
 * Poséidon la pierre et la mer, Athéna le métier et la ruse, Arès la fureur et
 * le sang. Aucune n'est un simple pourcentage de plus.
 */
export const GRACES: Record<GodId, Grace[]> = {
  zeus: [
    {
      id: 'zeus-1',
      nom: 'Xenios',
      emoji: '🕊️',
      desc: 'Le maître de l’hospitalité veille sur vos greniers : +10 % à toutes les récoltes.',
      cout: 20,
    },
    {
      id: 'zeus-2',
      nom: 'L’œil du ciel',
      emoji: '👁️',
      desc: 'Rien ne monte de la plaine sans qu’on vous le dise : les fronts d’un assaut sont annoncés d’avance.',
      cout: 35,
    },
    {
      id: 'zeus-3',
      nom: 'Le bras du roi',
      emoji: '⚡',
      desc: 'Les Olympiens vous écoutent à meilleur compte : −25 % sur le prix de toute bénédiction.',
      cout: 55,
    },
  ],
  poseidon: [
    {
      id: 'poseidon-1',
      nom: 'Bâtisseur de murs',
      emoji: '🧱',
      desc: 'Celui qui éleva les murailles de Troie épaissit les vôtres : +15 % de structure.',
      cout: 20,
    },
    {
      id: 'poseidon-2',
      nom: 'Mer ouverte',
      emoji: '🌊',
      desc: 'L’hiver ne ferme plus la mer : le port tourne à plein et les îles restent à portée.',
      cout: 40,
    },
    {
      id: 'poseidon-3',
      nom: 'Ébranleur du sol',
      emoji: '🔱',
      desc: 'Vos tours portent un cinquième plus loin - la plaine se couvre de flèches.',
      cout: 55,
    },
  ],
  athena: [
    {
      id: 'athena-1',
      nom: 'Métier',
      emoji: '⚱️',
      desc: 'La déesse des artisans presse vos casernes : −25 % sur le temps de formation des recrues.',
      cout: 20,
    },
    {
      id: 'athena-2',
      nom: 'Prudence',
      emoji: '🦉',
      desc: 'On rentre les blessés plutôt que de les laisser : un cinquième de vos pertes de bataille est épargné.',
      cout: 40,
    },
    {
      id: 'athena-3',
      nom: 'Faveur redoublée',
      emoji: '✨',
      desc: 'L’autel ne désemplit plus : +30 % de faveur produite par le temple.',
      cout: 55,
    },
  ],
  ares: [
    {
      id: 'ares-1',
      nom: 'Soif de bronze',
      emoji: '🏴‍☠️',
      desc: 'Ce qu’on prend par la lance, on le prend entier : +20 % de butin en expédition.',
      cout: 20,
    },
    {
      id: 'ares-2',
      nom: 'Fureur',
      emoji: '🩸',
      desc: 'Toute votre armée frappe plus fort : +15 % de dégâts, partout, toujours.',
      cout: 40,
    },
    {
      id: 'ares-3',
      nom: 'Entretien des braves',
      emoji: '🍖',
      desc: 'Vos héros se contentent de la part du soldat : −40 % sur ce qu’ils mangent chaque minute.',
      cout: 60,
    },
  ],
}

export const GRACES_TOUTES: Grace[] = Object.values(GRACES).flat()
export const GRACE_PAR_ID: Record<string, Grace> = Object.fromEntries(GRACES_TOUTES.map((g) => [g.id, g]))

/** le dieu qui accorde cette grâce */
export function dieuDe(id: string): GodId | null {
  for (const [g, liste] of Object.entries(GRACES) as [GodId, Grace[]][]) {
    if (liste.some((x) => x.id === id)) return g
  }
  return null
}

/**
 * La prochaine grâce qu'un dieu peut accorder - les siennes se prennent dans
 * l'ordre. `null` quand il a tout donné.
 */
export function graceSuivante(dieu: GodId, acquises: string[]): Grace | null {
  return GRACES[dieu].find((g) => !acquises.includes(g.id)) ?? null
}

/** somme des grâces acquises, dans la forme que le reste du jeu sait lire */
export function cumulerFaveurs(acquises: string[]): BonusFaveurs {
  const b = { ...FAVEURS_NEUTRES }
  for (const id of acquises) {
    switch (id) {
      case 'zeus-1':
        b.recoltePct += 0.1
        break
      case 'zeus-2':
        b.revelerFronts = true
        break
      case 'zeus-3':
        b.remisePct += 0.25
        break
      case 'poseidon-1':
        b.murPct += 0.15
        break
      case 'poseidon-2':
        b.merOuverte = true
        break
      case 'poseidon-3':
        b.porteePct += 0.2
        break
      case 'athena-1':
        b.recruesPct += 0.25
        break
      case 'athena-2':
        b.epargnePct += 0.2
        break
      case 'athena-3':
        b.faveurPct += 0.3
        break
      case 'ares-1':
        b.butinPct += 0.2
        break
      case 'ares-2':
        b.degatsPct += 0.15
        break
      case 'ares-3':
        b.entretienPct += 0.4
        break
    }
  }
  return b
}
