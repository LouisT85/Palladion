import { DEFENSES_DEFS, GOD_IDS, PREMIER_ASSAUT_MS, type DefenseId } from './data'
import { GRACES } from './faveurs'
import { HEROS, HERO_IDS } from './heros'
import { titrePrestige } from './hautsfaits'
import type { BuildingId, GodId, HeroId, ResourceId } from './types'

/*
 * ═══════════════════ NOUVELLE PARTIE + : CE QUE LE RÈGNE LÈGUE ═══════════════════
 *
 * Rien ne poussait à FINIR une partie. Abdiquer donnait un score, un titre, et
 * cela s'arrêtait là : le règne suivant repartait de sept habitants et de trois
 * cent trente bois, exactement comme le premier. Un joueur qui avait tenu cinq
 * ans n'avait aucune raison de refermer le livre.
 *
 * Ici, le prestige se DÉPENSE au départ du règne suivant. Quatre partis pris,
 * tous là pour que le marché reste honnête :
 *
 *  · l'héritage se calcule sur le PLUS BEAU règne, jamais sur le dernier. Un
 *    essai raté ne coûte donc rien - sinon plus personne n'oserait tenter un
 *    règne de pillard, et le mode punirait l'expérimentation ;
 *  · chaque point dépensé se paie en DIFFICULTÉ, et le prix est affiché avant
 *    l'achat (`malusDifficulte`). Prendre une muraille de pierre debout, c'est
 *    accepter que la plaine arme en conséquence ;
 *  · la TROADE SE SOUVIENT du dernier règne, pas du meilleur : les relations
 *    sont reportées atténuées, et les rancunes s'effacent moins vite que les
 *    bienfaits (`reportRelations`). On oublie un bienfaiteur, jamais un pillard ;
 *  · l'archive vit HORS de la sauvegarde de partie, dans sa propre clé. Elle
 *    doit survivre à un effacement d'emplacement : c'est la mémoire du joueur,
 *    pas celle du village.
 *
 * Tout ce fichier est PUR à deux exceptions près, `lireArchive` / `ecrireArchive`,
 * qui touchent `localStorage` et n'échouent jamais bruyamment.
 */

// ── L'archive, mémoire d'entre deux parties ───────────────────────────────────

export const CLE_ARCHIVE = 'palladion-archive'

/** ce qu'un règne achevé laisse d'exploitable au suivant */
export interface BilanRegne {
  /** prestige final, tel que `prestige()` de hautsfaits.ts le calcule */
  prestige: number
  /** titre donné par les aèdes */
  titre: string
  /** journées de règne atteintes */
  jours: number
  pop: number
  repousses: number
  /** nombre de hauts faits acquis */
  hautsFaits: number
  /** relations diplomatiques à la chute - la Troade s'en souviendra */
  relations: Record<string, number>
  /** ms epoch de la fin du règne */
  finiLe: number
}

export interface Archive {
  version: 1
  /** règnes menés à leur terme */
  regnes: number
  /** somme des prestiges de tous les règnes - le chiffre dont on se vante */
  prestigeCumule: number
  /** meilleur prestige atteint : c'est LUI qui paie l'héritage */
  meilleur: number
  /** titres distincts obtenus, du plus ancien au plus récent */
  titres: string[]
  /** le dernier règne, source des relations reportées */
  dernier: BilanRegne | null
}

export const ARCHIVE_VIDE: Archive = {
  version: 1,
  regnes: 0,
  prestigeCumule: 0,
  meilleur: 0,
  titres: [],
  dernier: null,
}

function nombre(x: unknown, defaut = 0): number {
  return typeof x === 'number' && Number.isFinite(x) ? x : defaut
}

/**
 * L'archive telle qu'on la trouve. Aucune lecture ne peut échouer : une archive
 * illisible vaut une archive vide, parce qu'un joueur privé de son héritage doit
 * pouvoir jouer quand même.
 */
export function lireArchive(): Archive {
  try {
    const brut = localStorage.getItem(CLE_ARCHIVE)
    if (!brut) return { ...ARCHIVE_VIDE }
    const d = JSON.parse(brut) as Record<string, unknown>
    const dernier = (d.dernier ?? null) as BilanRegne | null
    return {
      version: 1,
      regnes: Math.max(0, Math.round(nombre(d.regnes))),
      prestigeCumule: Math.max(0, Math.round(nombre(d.prestigeCumule))),
      meilleur: Math.max(0, Math.round(nombre(d.meilleur))),
      titres: Array.isArray(d.titres) ? d.titres.filter((t): t is string => typeof t === 'string') : [],
      dernier: dernier && typeof dernier === 'object' ? dernier : null,
    }
  } catch {
    return { ...ARCHIVE_VIDE }
  }
}

/**
 * Inscrit un règne achevé et renvoie l'archive à jour. On n'écrase jamais le
 * meilleur score : c'est la promesse qui rend le mode jouable sans crainte.
 */
export function ecrireArchive(bilan: BilanRegne): Archive {
  const avant = lireArchive()
  const prestige = Math.max(0, Math.round(bilan.prestige))
  const apres: Archive = {
    version: 1,
    regnes: avant.regnes + 1,
    prestigeCumule: avant.prestigeCumule + prestige,
    meilleur: Math.max(avant.meilleur, prestige),
    titres: avant.titres.includes(bilan.titre) ? avant.titres : [...avant.titres, bilan.titre],
    dernier: { ...bilan, prestige },
  }
  try {
    localStorage.setItem(CLE_ARCHIVE, JSON.stringify(apres))
  } catch {
    // stockage indisponible : le règne restera non compté, mais la partie suivante
    // doit pouvoir commencer - on rend quand même l'archive telle qu'elle serait
  }
  return apres
}

export function effacerArchive(): void {
  try {
    localStorage.removeItem(CLE_ARCHIVE)
  } catch {
    // rien à faire
  }
}

// ── Le panier en attente (le pont entre l'écran et le store) ──────────────────

export const CLE_HERITAGE = 'palladion-heritage'

/*
 * Le panneau d'héritage se valide AVANT que la partie neuve n'existe : il n'y a
 * pas encore d'état sur lequel poser les dons. Le panier est donc déposé ici, et
 * la fondation du village le ramasse. Un seul panier à la fois, consommé à la
 * lecture par `oublierHeritageEnAttente` : un don ne doit pas se reprendre à
 * chaque nouvelle partie.
 */
export function poserHeritageEnAttente(choix: ChoixHeritage): void {
  try {
    localStorage.setItem(CLE_HERITAGE, JSON.stringify(normaliserChoix(choix)))
  } catch {
    // stockage indisponible : la partie commencera sans héritage, sans planter
  }
}

export function lireHeritageEnAttente(): ChoixHeritage {
  try {
    const brut = localStorage.getItem(CLE_HERITAGE)
    if (!brut) return {}
    return normaliserChoix(JSON.parse(brut) as ChoixHeritage)
  } catch {
    return {}
  }
}

export function oublierHeritageEnAttente(): void {
  try {
    localStorage.removeItem(CLE_HERITAGE)
  } catch {
    // rien à faire
  }
}

// ── Le budget ─────────────────────────────────────────────────────────────────

/** prestige nécessaire pour un point d'héritage */
export const PRESTIGE_PAR_POINT = 25

/**
 * Points d'héritage que vaut un prestige. Barème linéaire, exprès : le joueur
 * doit pouvoir faire le calcul de tête devant l'écran de bilan. Un règne
 * honnête (≈ 300) ouvre douze points, soit deux dons modestes ; un règne de
 * légende (≈ 1400) en ouvre cinquante-six et permet de partir avec une muraille.
 */
export function heritageDisponible(prestige: number): number {
  return Math.max(0, Math.floor(Math.max(0, prestige) / PRESTIGE_PAR_POINT))
}

/** ce que l'archive ouvre au prochain règne - le MEILLEUR règne paie, pas le dernier */
export function pointsHeritage(a: Archive): number {
  return heritageDisponible(a.meilleur)
}

// ── Le marché ─────────────────────────────────────────────────────────────────

/** ce qu'un don pose sur un état neuf */
export interface EffetHeritage {
  /** ressources AJOUTÉES à la mise de départ */
  res?: Partial<Record<ResourceId, number>>
  /** habitants en plus */
  pop?: number
  /** faveur de départ en plus */
  faveur?: number
  /** niveau MINIMAL des remparts (le store recalera `wallHp` sur `murMax`) */
  remparts?: number
  /** tours d'archers déjà dressées */
  tours?: number
  /** niveau minimal d'un bâtiment */
  batiment?: { id: BuildingId; niveau: number }
  /** ouvrage intérieur déjà creusé - le savoir-faire hérité du règne d'avant */
  defense?: DefenseId
  /** héros connu de nom : il se présente sans que ses conditions soient remplies */
  heros?: HeroId
  /** grâce divine acquise d'office */
  grace?: string
  /** relation de départ accordée à chaque Olympien */
  relationTous?: number
}

export type CategorieDon = 'reserves' | 'peuple' | 'pierre' | 'olympe' | 'legende'

export const CATEGORIES_DON: Record<CategorieDon, { nom: string; emoji: string }> = {
  reserves: { nom: 'Les réserves', emoji: '📦' },
  peuple: { nom: 'Le peuple', emoji: '👥' },
  pierre: { nom: 'La pierre', emoji: '🧱' },
  olympe: { nom: 'L’Olympe', emoji: '⚡' },
  legende: { nom: 'Les noms', emoji: '🛡️' },
}

export interface DonHeritage {
  id: string
  emoji: string
  nom: string
  /** ce qu'il change, en une phrase que le joueur lit avant de payer */
  desc: string
  cat: CategorieDon
  /** prix en points d'héritage */
  cout: number
  /** nombre maximal d'exemplaires - 1 par défaut */
  max: number
  effet: EffetHeritage
}

/**
 * Un héros « connu de nom » coûte d'autant plus cher que ses conditions
 * d'apparition sont exigeantes : c'est précisément ce qu'on achète, le droit de
 * ne pas les remplir. Le prix de recrutement, lui, reste dû.
 */
export function coutHerosConnu(h: HeroId): number {
  const r = HEROS[h].requiert
  const conditions = Object.keys(r).length
  return 8 + 2 * conditions
}

const DONS_FIXES: DonHeritage[] = [
  // ── Les réserves ───────────────────────────────────────────────────────────
  {
    id: 'grain-de-semence',
    emoji: '🌾',
    nom: 'Grain de semence',
    desc: '+200 grain et +200 bois dans les coffres du premier matin.',
    cat: 'reserves',
    cout: 4,
    max: 3,
    effet: { res: { grain: 200, bois: 200 } },
  },
  {
    id: 'caisse-de-bronze',
    emoji: '🪙',
    nom: 'Caisse de bronze',
    desc: '+150 pierre et +60 bronze - de quoi armer avant la première bande.',
    cat: 'reserves',
    cout: 5,
    max: 3,
    effet: { res: { pierre: 150, bronze: 60 } },
  },
  {
    id: 'ferme-ancienne',
    emoji: '🚜',
    nom: 'Terres déjà labourées',
    desc: 'La ferme se dresse au niveau 2 dès la fondation.',
    cat: 'reserves',
    cout: 9,
    max: 1,
    effet: { batiment: { id: 'ferme', niveau: 2 } },
  },
  {
    id: 'atelier-legue',
    emoji: '⚒️',
    nom: 'Atelier légué',
    desc: 'La forge tourne dès le premier jour, au niveau 1.',
    cat: 'reserves',
    cout: 7,
    max: 1,
    effet: { batiment: { id: 'forge', niveau: 1 } },
  },

  // ── Le peuple ──────────────────────────────────────────────────────────────
  {
    id: 'deux-bras',
    emoji: '👥',
    nom: 'Deux bras de plus',
    desc: '+2 habitants au départ, avec leur métier de naissance.',
    cat: 'peuple',
    cout: 4,
    max: 3,
    effet: { pop: 2 },
  },
  {
    id: 'caserne-heritee',
    emoji: '🛖',
    nom: 'Caserne héritée',
    desc: 'La caserne est debout au niveau 1 : on enrôle avant d’avoir bâti.',
    cat: 'peuple',
    cout: 7,
    max: 1,
    effet: { batiment: { id: 'caserne', niveau: 1 } },
  },
  {
    id: 'citerne-heritee',
    emoji: '💧',
    nom: 'La citerne se rouvre',
    desc: 'Les quatre-vingt-dix-neuf marches sont déjà taillées : l’ambiance ne s’effondre plus en siège.',
    cat: 'peuple',
    cout: 10,
    max: 1,
    effet: { defense: 'citerne' },
  },

  // ── La pierre ──────────────────────────────────────────────────────────────
  {
    id: 'palissade-debout',
    emoji: '🪵',
    nom: 'Palissade debout',
    desc: 'Les remparts commencent au niveau 1, structure pleine.',
    cat: 'pierre',
    cout: 6,
    max: 1,
    effet: { remparts: 1 },
  },
  {
    id: 'enceinte-de-pierre',
    emoji: '🧱',
    nom: 'Enceinte de pierre',
    desc: 'Les remparts commencent au niveau 2. La plaine le sait et arme en face.',
    cat: 'pierre',
    cout: 13,
    max: 1,
    effet: { remparts: 2 },
  },
  {
    id: 'muraille-heritee',
    emoji: '🏯',
    nom: 'Muraille héritée',
    desc: 'Les remparts commencent au niveau 3 - l’enceinte d’un règne accompli.',
    cat: 'pierre',
    cout: 22,
    max: 1,
    effet: { remparts: 3 },
  },
  {
    id: 'tour-heritee',
    emoji: '🏹',
    nom: 'Tour d’archers',
    desc: 'Une tour est déjà dressée sur l’enceinte.',
    cat: 'pierre',
    cout: 8,
    max: 2,
    effet: { tours: 1 },
  },
  {
    id: 'poterne-heritee',
    emoji: '🚪',
    nom: 'La poterne se souvient',
    desc: `${DEFENSES_DEFS.poterne.nom} déjà percée : la charge de vos hommes porte 30 % plus fort.`,
    cat: 'pierre',
    cout: 10,
    max: 1,
    effet: { defense: 'poterne' },
  },

  // ── L'Olympe ───────────────────────────────────────────────────────────────
  {
    id: 'faveur-initiale',
    emoji: '🔥',
    nom: 'Autel encore chaud',
    desc: '+40 de faveur au premier matin : une bénédiction avant le premier assaut.',
    cat: 'olympe',
    cout: 5,
    max: 2,
    effet: { faveur: 40 },
  },
  {
    id: 'ferveur-heritee',
    emoji: '🙏',
    nom: 'Ferveur héritée',
    desc: '+20 de relation avec les quatre Olympiens - on se souvient de vos hécatombes.',
    cat: 'olympe',
    cout: 9,
    max: 1,
    effet: { relationTous: 20 },
  },
  ...GOD_IDS.map((g): DonHeritage => {
    const grace = GRACES[g][0]
    return {
      id: `grace-${grace.id}`,
      emoji: grace.emoji,
      nom: `${grace.nom} (${g === 'zeus' ? 'Zeus' : g === 'poseidon' ? 'Poséidon' : g === 'athena' ? 'Athéna' : 'Arès'})`,
      desc: grace.desc,
      cat: 'olympe',
      cout: 12,
      max: 1,
      effet: { grace: grace.id },
    }
  }),
]

/**
 * Le marché complet. Les héros sont engendrés depuis leur table : ajouter un
 * neuvième héros au jeu l'ajoutera d'office ici, avec son prix juste.
 */
export function optionsHeritage(): DonHeritage[] {
  const heros = HERO_IDS.map((h): DonHeritage => {
    const d = HEROS[h]
    return {
      id: `heros-${h}`,
      emoji: d.emoji,
      nom: `${d.nom} vous connaît`,
      desc: `${d.titre}. Il se présente sans condition - son prix de recrutement reste dû.`,
      cat: 'legende',
      cout: coutHerosConnu(h),
      max: 1,
      effet: { heros: h },
    }
  })
  return [...DONS_FIXES, ...heros]
}

export const DONS_PAR_ID: Record<string, DonHeritage> = Object.fromEntries(optionsHeritage().map((d) => [d.id, d]))

/** le panier : identifiant de don → nombre d'exemplaires */
export type ChoixHeritage = Record<string, number>

/** panier nettoyé : dons inconnus jetés, exemplaires bornés à leur maximum */
export function normaliserChoix(choix: ChoixHeritage): ChoixHeritage {
  const net: ChoixHeritage = {}
  for (const [id, n] of Object.entries(choix ?? {})) {
    const don = DONS_PAR_ID[id]
    if (!don) continue
    const k = Math.min(don.max, Math.max(0, Math.floor(nombre(n))))
    if (k > 0) net[id] = k
  }
  return net
}

export function coutHeritage(choix: ChoixHeritage): number {
  return Object.entries(normaliserChoix(choix)).reduce((a, [id, n]) => a + DONS_PAR_ID[id].cout * n, 0)
}

/** ce qu'il reste de budget après ce panier - négatif = panier refusé */
export function resteHeritage(budget: number, choix: ChoixHeritage): number {
  return Math.floor(budget) - coutHeritage(choix)
}

// ── Le prix : la difficulté ───────────────────────────────────────────────────

export interface MalusDifficulte {
  /** à ajouter à `s.threatMod` de l'état neuf */
  threatMod: number
  /** délai avant le premier assaut, en remplacement de PREMIER_ASSAUT_MS */
  premierAssautMs: number
  /** part RETIRÉE au délai entre deux assauts (0…0,45) : 0,3 = vagues 30 % plus rapprochées */
  vaguePlus: number
}

/** menace ajoutée par point d'héritage dépensé */
export const MENACE_PAR_POINT = 0.55
/** ce que chaque point retire au répit initial */
export const HATE_PAR_POINT_MS = 10_000
/** sous ce plancher, on n'a plus le temps de bâtir une palissade : la partie n'est plus jouée */
export const PREMIER_ASSAUT_PLANCHER_MS = 4 * 60_000
/** cadence : on ne descend jamais sous 55 % du délai normal entre deux vagues */
export const VAGUE_PLUS_MAX = 0.45
/** accélération de la cadence par point dépensé */
export const CADENCE_PAR_POINT = 0.012

/**
 * Le prix de l'héritage, payé en menace. Trois leviers, tous croissants avec la
 * dépense et tous plafonnés : partir avec une muraille de niveau 3 et deux tours
 * (38 points) vaut +21 de menace, un premier assaut à 4 min 40 et des vagues un
 * tiers plus rapprochées. C'est cher, c'est lisible, et c'est le contrat.
 */
export function malusDifficulte(pointsDepenses: number): MalusDifficulte {
  const p = Math.max(0, Math.round(pointsDepenses))
  return {
    threatMod: Math.round(p * MENACE_PAR_POINT),
    premierAssautMs: Math.max(PREMIER_ASSAUT_PLANCHER_MS, PREMIER_ASSAUT_MS - p * HATE_PAR_POINT_MS),
    vaguePlus: Math.min(VAGUE_PLUS_MAX, Math.round(p * CADENCE_PAR_POINT * 1000) / 1000),
  }
}

// ── Ce qu'on pose sur l'état neuf ─────────────────────────────────────────────

export interface ModifsHeritage {
  /** à AJOUTER aux ressources de départ */
  res: Record<ResourceId, number>
  /** habitants EN PLUS des sept de la fondation */
  pop: number
  /** faveur en plus */
  faveur: number
  /** niveau minimal des remparts - 0 si aucun don de pierre */
  remparts: number
  tours: number
  /** niveau minimal par bâtiment (le maximum l'emporte si deux dons se recouvrent) */
  batiments: Partial<Record<BuildingId, number>>
  defenses: DefenseId[]
  /** héros recrutables sans remplir leurs conditions */
  herosConnus: HeroId[]
  graces: string[]
  /** relation de départ, par dieu */
  relations: Record<GodId, number>
  pointsDepenses: number
  malus: MalusDifficulte
}

const RES_ZERO = (): Record<ResourceId, number> => ({ bois: 0, pierre: 0, grain: 0, bronze: 0 })

/**
 * Traduit un panier en modifications à poser sur un état NEUF. La fonction ne
 * connaît pas le store : elle rend une description, le store la recopie. Les
 * niveaux de bâtiment et de remparts sont des MINIMA - c'est ce qui permet de
 * cumuler deux dons sans jamais rétrograder quoi que ce soit.
 */
export function appliquerHeritage(choix: ChoixHeritage): ModifsHeritage {
  const net = normaliserChoix(choix)
  const m: ModifsHeritage = {
    res: RES_ZERO(),
    pop: 0,
    faveur: 0,
    remparts: 0,
    tours: 0,
    batiments: {},
    defenses: [],
    herosConnus: [],
    graces: [],
    relations: Object.fromEntries(GOD_IDS.map((g) => [g, 0])) as Record<GodId, number>,
    pointsDepenses: 0,
    malus: malusDifficulte(0),
  }
  for (const [id, n] of Object.entries(net)) {
    const don = DONS_PAR_ID[id]
    const e = don.effet
    m.pointsDepenses += don.cout * n
    if (e.res) for (const [r, v] of Object.entries(e.res) as [ResourceId, number][]) m.res[r] += v * n
    if (e.pop) m.pop += e.pop * n
    if (e.faveur) m.faveur += e.faveur * n
    if (e.tours) m.tours += e.tours * n
    if (e.remparts) m.remparts = Math.max(m.remparts, e.remparts)
    if (e.batiment) {
      const av = m.batiments[e.batiment.id] ?? 0
      m.batiments[e.batiment.id] = Math.max(av, e.batiment.niveau)
    }
    if (e.defense && !m.defenses.includes(e.defense)) m.defenses.push(e.defense)
    if (e.heros && !m.herosConnus.includes(e.heros)) m.herosConnus.push(e.heros)
    if (e.grace && !m.graces.includes(e.grace)) m.graces.push(e.grace)
    if (e.relationTous) for (const g of GOD_IDS) m.relations[g] += e.relationTous * n
  }
  // les remparts hérités impliquent l'enceinte : un niveau 3 pose aussi le bâtiment
  if (m.remparts > 0) m.batiments.remparts = Math.max(m.batiments.remparts ?? 0, m.remparts)
  m.malus = malusDifficulte(m.pointsDepenses)
  return m
}

/** les lignes du récapitulatif, telles que le panneau les affiche */
export function resumeHeritage(m: ModifsHeritage): string[] {
  const l: string[] = []
  const res = (Object.entries(m.res) as [ResourceId, number][]).filter(([, v]) => v > 0)
  if (res.length > 0) l.push(res.map(([r, v]) => `+${v} ${r}`).join(', '))
  if (m.pop > 0) l.push(`+${m.pop} habitants`)
  if (m.faveur > 0) l.push(`+${m.faveur} de faveur`)
  if (m.remparts > 0) l.push(`remparts au niveau ${m.remparts}`)
  if (m.tours > 0) l.push(m.tours === 1 ? 'une tour dressée' : `${m.tours} tours dressées`)
  for (const [b, n] of Object.entries(m.batiments) as [BuildingId, number][]) {
    if (b !== 'remparts') l.push(`${b} au niveau ${n}`)
  }
  for (const d of m.defenses) l.push(DEFENSES_DEFS[d].nom)
  for (const h of m.herosConnus) l.push(`${HEROS[h].nom} vous connaît`)
  for (const g of m.graces) l.push(`grâce ${g}`)
  const rel = GOD_IDS.find((g) => m.relations[g] > 0)
  if (rel) l.push(`+${m.relations[rel]} de relation avec les Olympiens`)
  return l
}

// ── La Troade se souvient ─────────────────────────────────────────────────────

/** part conservée d'un bienfait : on oublie vite celui qui nous a sauvés */
export const REPORT_AMITIE = 0.35
/** part conservée d'une rancune : la côte se souvient de qui l'a pillée */
export const REPORT_RANCUNE = 0.6
/** sous ce seuil, la relation reportée ne vaut plus rien et l'on repart neutre */
export const REPORT_PLANCHER = 3

/**
 * Ce que la Troade garde du règne d'avant. L'asymétrie est le cœur de la règle :
 * un pillard recommence entouré d'ennemis - donc avec des vagues plus grosses,
 * puisque `menaceDiplomatique` compte les hostiles - tandis qu'un diplomate doit
 * retravailler ses amitiés presque depuis le début. C'est ce qui donne un poids
 * durable à une razzia de fin de partie, celle qu'on croyait gratuite.
 */
export function reportRelations(relationsPrecedentes: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [id, v] of Object.entries(relationsPrecedentes ?? {})) {
    const n = nombre(v)
    if (n === 0) continue
    const report = Math.round(n * (n > 0 ? REPORT_AMITIE : REPORT_RANCUNE))
    if (Math.abs(report) < REPORT_PLANCHER) continue
    out[id] = Math.max(-100, Math.min(100, report))
  }
  return out
}

// ── Le bilan de fin de règne ──────────────────────────────────────────────────

/** vue minimale du règne qui s'achève, tout ce dont le bilan a besoin */
export interface SnapFinRegne {
  prestige: number
  jour: number
  pop: number
  repousses: number
  hautsFaits: number
  relations: Record<string, number>
}

/** le bilan à archiver, titre compris */
export function bilanDeFin(s: SnapFinRegne, now: number): BilanRegne {
  const prestige = Math.max(0, Math.round(s.prestige))
  return {
    prestige,
    titre: titrePrestige(prestige).titre,
    jours: Math.max(1, Math.round(s.jour)),
    pop: Math.max(0, Math.round(s.pop)),
    repousses: Math.max(0, Math.round(s.repousses)),
    hautsFaits: Math.max(0, Math.round(s.hautsFaits)),
    relations: { ...(s.relations ?? {}) },
    finiLe: now,
  }
}

/** ce que le prochain règne recevra si l'on referme le livre maintenant */
export function apercuHeritage(archive: Archive, prestigeCourant: number): {
  points: number
  gagnes: number
  record: boolean
} {
  const total = heritageDisponible(Math.max(archive.meilleur, prestigeCourant))
  return {
    points: total,
    gagnes: Math.max(0, total - pointsHeritage(archive)),
    record: prestigeCourant > archive.meilleur,
  }
}
