import { BUILDINGS } from './data'
import type { BuildingId, Cost, ResourceId } from './types'

/*
 * ═══════════════════ LES TECHNOLOGIES DE L'ÂGE DU BRONZE ═══════════════════
 *
 * Un village qui monte ses dix bâtiments au niveau 4 a fini d'apprendre : il ne
 * lui reste qu'à empiler des ressources. L'arbre des découvertes ouvre une
 * seconde ligne de progrès, qui ne se paie pas seulement en pierre mais en
 * TEMPS - et le temps, on ne l'a qu'une fois.
 *
 * Trois partis pris, qui font tout l'intérêt :
 *
 *  · UNE SEULE recherche à la fois. Aucune file d'attente, aucun cumul : lancer
 *    la charrue, c'est renoncer pendant trois minutes au soufflet de forge. Sans
 *    cette contrainte, l'arbre ne serait qu'une liste de courses à cocher ;
 *  · les effets sont MODESTES et permanents (6 à 15 %). Une découverte ne
 *    remplace jamais un niveau de bâtiment ; dix découvertes bien choisies
 *    pèsent autant, et disent quelle cité on a voulu ;
 *  · l'arbre a des RACINES ET DES BRANCHES. La corde tressée ne rapporte presque
 *    rien, mais sans elle ni poulie, ni voile, ni arc composite. On investit à
 *    perte pour ouvrir ce qui compte.
 *
 * OUVERTURE DE LA RECHERCHE : l'AGORA NIVEAU 2. C'est le choix le plus juste -
 * l'agora est le conseil, le lieu où l'on décide et où l'on tient les comptes ;
 * son niveau 2 (« un dallage de pierre, des étals et une stoa de bois ») est le
 * premier moment où le village a de quoi loger des scribes. Chaque découverte
 * peut en outre exiger SON atelier : le soufflet demande une forge, l'écriture
 * un temple. Le linéaire B ne sort pas des champs.
 *
 * Tout ce fichier est PUR : le store appelle, l'état est à lui.
 */

/** l'agora du conseil ouvre la recherche à son second niveau */
export const AGORA_RECHERCHE = 2

// ── Ce que les découvertes changent ──────────────────────────────────────────

/**
 * Multiplicateurs cumulés des découvertes acquises, en PARTS (0.12 = +12 %).
 * Mêmes noms que `BonusFaveurs` et `EffetsReliques` là où les trois se
 * recouvrent : le store les additionne de la même façon, sans traduction.
 */
export interface EffetsTechnos {
  grainPct: number
  boisPct: number
  pierrePct: number
  bronzePct: number
  faveurPct: number
  /** durée des chantiers, en moins */
  chantierPct: number
  /** durée de formation des recrues, en moins */
  recruesPct: number
  /** structure des remparts */
  murPct: number
  /** structure des bâtiments de l'intérieur */
  structurePct: number
  /** portée des tours d'archers */
  porteePct: number
  /** capacité d'entrepôt */
  stockagePct: number
  /** marge prélevée par les marchands du port, en moins */
  margePortPct: number
  /** dégâts de toute l'armée */
  degatsPct: number
  /** butin rapporté d'expédition */
  butinPct: number
  /** grain mangé par les bouches et les soldats, en moins */
  consoPct: number
  /** durée des recherches suivantes, en moins */
  recherchePct: number
}

export const TECHNOS_NEUTRES: EffetsTechnos = {
  grainPct: 0,
  boisPct: 0,
  pierrePct: 0,
  bronzePct: 0,
  faveurPct: 0,
  chantierPct: 0,
  recruesPct: 0,
  murPct: 0,
  structurePct: 0,
  porteePct: 0,
  stockagePct: 0,
  margePortPct: 0,
  degatsPct: 0,
  butinPct: 0,
  consoPct: 0,
  recherchePct: 0,
}

export const CLES_EFFETS = Object.keys(TECHNOS_NEUTRES) as (keyof EffetsTechnos)[]

export interface TechnoDef {
  id: string
  nom: string
  emoji: string
  /** ce que c'est, historiquement - une phrase ou deux, pas un manuel */
  desc: string
  /** l'effet en une ligne, pour l'arbre */
  effet: string
  cout: Cost
  /** temps de recherche de base, en secondes */
  duree: number
  /** découvertes qui doivent précéder celle-ci */
  requiert: string[]
  /** atelier exigé en plus de l'agora du conseil */
  batiment?: { id: BuildingId; niveau: number }
  bonus: Partial<EffetsTechnos>
}

/**
 * Les vingt découvertes. Toutes attestées dans l'Égée du bronze récent ou dans
 * son voisinage immédiat : rien qui vienne d'un âge postérieur, pas de fer, pas
 * d'alphabet, pas de moulin. L'ordre du tableau est celui de la lecture, pas
 * celui de l'arbre - `arbreTechnos()` calcule les colonnes.
 */
export const TECHNOS: TechnoDef[] = [
  // ── Racines : rien ne les précède, elles ouvrent tout le reste ─────────────
  {
    id: 'charrue',
    nom: 'Charrue à soc',
    emoji: '🌾',
    desc: 'Le soc de bois durci au feu retourne la terre au lieu de la gratter. Deux fois plus de sillon dans la journée, et la jachère revient moins vite.',
    effet: '+12 % de grain',
    cout: { bois: 90, pierre: 40 },
    duree: 90,
    requiert: [],
    batiment: { id: 'ferme', niveau: 1 },
    bonus: { grainPct: 0.12 },
  },
  {
    id: 'corde',
    nom: 'Corde tressée',
    emoji: '🪢',
    desc: 'Le lin et le chanvre tordus en trois brins tiennent dix fois la charge d’une lanière de cuir. Ce n’est rien, et c’est ce qui rend tout le reste possible.',
    effet: '−8 % sur la durée des chantiers',
    cout: { bois: 60 },
    duree: 70,
    requiert: [],
    bonus: { chantierPct: 0.08 },
  },
  {
    id: 'arpentage',
    nom: 'Arpentage',
    emoji: '📐',
    desc: 'La corde à treize nœuds et l’équerre du maçon : un angle droit se vérifie avant de poser la pierre, pas après. Les murs cessent de se déverser.',
    effet: '+10 % de structure aux bâtiments',
    cout: { pierre: 80, bois: 40 },
    duree: 100,
    requiert: [],
    bonus: { structurePct: 0.1 },
  },
  {
    id: 'tour-potier',
    nom: 'Tour de potier',
    emoji: '🏺',
    desc: 'Le tour rapide sort en un jour ce que la main colombine met une semaine à monter. Des jarres de stockage par centaines, toutes de même contenance.',
    effet: '+15 % de capacité d’entrepôt',
    cout: { bois: 70, pierre: 60 },
    duree: 90,
    requiert: [],
    bonus: { stockagePct: 0.15 },
  },
  {
    id: 'salaison',
    nom: 'Salaison',
    emoji: '🧂',
    desc: 'Le sel des marais salants tire l’eau de la chair : le poisson et le porc passent l’hiver. Ce qui ne pourrit plus n’a pas besoin d’être remplacé.',
    effet: '−10 % de grain consommé',
    cout: { bois: 60, grain: 80 },
    duree: 110,
    requiert: [],
    batiment: { id: 'port', niveau: 1 },
    bonus: { consoPct: 0.1 },
  },
  {
    id: 'apiculture',
    nom: 'Apiculture',
    emoji: '🍯',
    desc: 'Des ruches de terre cuite couchées au flanc du coteau. Le miel sucre le pain des hommes et l’hydromel des libations - les dieux y sont sensibles.',
    effet: '+6 % de grain, +6 % de faveur',
    cout: { bois: 50, grain: 60 },
    duree: 90,
    requiert: [],
    bonus: { grainPct: 0.06, faveurPct: 0.06 },
  },

  // ── Deuxième rang ─────────────────────────────────────────────────────────
  {
    id: 'joug',
    nom: 'Joug d’attelage',
    emoji: '🐂',
    desc: 'Le joug d’encolure répartit l’effort sur les deux bœufs de la paire. On laboure la terre lourde et l’on sort les troncs des fonds de vallée.',
    effet: '+10 % de grain, +8 % de bois',
    cout: { bois: 120, pierre: 50, bronze: 10 },
    duree: 150,
    requiert: ['charrue'],
    bonus: { grainPct: 0.1, boisPct: 0.08 },
  },
  {
    id: 'poulie',
    nom: 'Poulie et treuil',
    emoji: '⚙️',
    desc: 'Une gorge dans un rondin, une corde, un cabestan : le bloc de six cents livres monte au sommet du rempart avec quatre hommes au lieu de vingt.',
    effet: '−12 % sur la durée des chantiers, +8 % de pierre',
    cout: { bois: 140, pierre: 90, bronze: 15 },
    duree: 170,
    requiert: ['corde'],
    bonus: { chantierPct: 0.12, pierrePct: 0.08 },
  },
  {
    id: 'irrigation',
    nom: 'Irrigation par canaux',
    emoji: '💧',
    desc: 'Le marais drainé, la source captée, l’eau conduite au sillon par des rigoles de pierre. La sécheresse cesse d’être une catastrophe.',
    effet: '+15 % de grain',
    cout: { pierre: 200, bois: 120 },
    duree: 200,
    requiert: ['charrue', 'arpentage'],
    bonus: { grainPct: 0.15 },
  },
  {
    id: 'chaux',
    nom: 'Chaux et mortier',
    emoji: '🧱',
    desc: 'Le calcaire cuit, éteint, mêlé de sable : les pierres ne sont plus posées les unes sur les autres, elles sont liées. Le bélier s’y casse les dents.',
    effet: '+15 % de structure aux remparts, +10 % aux bâtiments',
    cout: { pierre: 260, bois: 100 },
    duree: 220,
    requiert: ['arpentage'],
    batiment: { id: 'carriere', niveau: 2 },
    bonus: { murPct: 0.15, structurePct: 0.1 },
  },
  {
    id: 'roue-rayons',
    nom: 'Roue à rayons',
    emoji: '☸️',
    desc: 'Six rayons de frêne au lieu du disque plein : la roue perd les trois quarts de son poids sans rien céder. Les convois vont deux fois plus vite.',
    effet: '+8 % de butin d’expédition, +6 % de bois',
    cout: { bois: 160, bronze: 20 },
    duree: 180,
    requiert: ['joug'],
    bonus: { butinPct: 0.08, boisPct: 0.06 },
  },
  {
    id: 'soufflet',
    nom: 'Forge à soufflet double',
    emoji: '🔥',
    desc: 'Deux outres de peau alternées donnent un vent continu : le foyer passe le point de fusion du cuivre et ne redescend plus entre deux coups.',
    effet: '+15 % de bronze',
    cout: { pierre: 120, bois: 140, bronze: 25 },
    duree: 200,
    requiert: [],
    batiment: { id: 'forge', niveau: 2 },
    bonus: { bronzePct: 0.15 },
  },
  {
    id: 'greffe',
    nom: 'Greffe de l’olivier',
    emoji: '🫒',
    desc: 'L’olivier sauvage greffé d’un rameau franc donne en six ans ce qu’il n’aurait jamais donné. L’huile nourrit, éclaire et coule sur les autels.',
    effet: '+10 % de grain, +5 % de faveur',
    cout: { grain: 140, bois: 80 },
    duree: 190,
    requiert: ['charrue'],
    batiment: { id: 'ferme', niveau: 2 },
    bonus: { grainPct: 0.1, faveurPct: 0.05 },
  },
  {
    id: 'ecriture',
    nom: 'Écriture (linéaire B)',
    emoji: '📜',
    desc: 'Des syllabes gravées sur l’argile crue, et le palais sait enfin ce qu’il possède : tant de jarres d’huile, tant d’hommes, tant de moutons. Compter, c’est gouverner.',
    effet: '−20 % sur la durée des recherches, +10 % de capacité d’entrepôt',
    cout: { pierre: 180, bronze: 30, grain: 100 },
    duree: 240,
    requiert: [],
    batiment: { id: 'temple', niveau: 2 },
    bonus: { recherchePct: 0.2, stockagePct: 0.1 },
  },

  // ── Troisième rang : l'écriture garde la porte ────────────────────────────
  {
    id: 'etain',
    nom: 'Alliage à l’étain',
    emoji: '🪙',
    desc: 'Un dixième d’étain dans le cuivre, et le métal mou devient bronze : il tient le fil, il tient le choc. Tout l’âge porte le nom de cette proportion.',
    effet: '+12 % de bronze, +8 % de dégâts',
    cout: { bronze: 60, pierre: 160, bois: 120 },
    duree: 260,
    requiert: ['soufflet'],
    batiment: { id: 'port', niveau: 2 },
    bonus: { bronzePct: 0.12, degatsPct: 0.08 },
  },
  {
    id: 'four-reverbere',
    nom: 'Four à réverbère',
    emoji: '🏭',
    desc: 'La voûte renvoie la chaleur sur la charge au lieu de la laisser filer par la cheminée. On fond au lingot ce qu’on fondait à la poignée.',
    effet: '+15 % de bronze, +5 % de structure',
    cout: { pierre: 300, bois: 200, bronze: 50 },
    duree: 300,
    requiert: ['soufflet', 'ecriture'],
    bonus: { bronzePct: 0.15, structurePct: 0.05 },
  },
  {
    id: 'voile-quille',
    nom: 'Voile carrée et quille',
    emoji: '⛵',
    desc: 'Une quille qui mord l’eau, une voile carrée sur mât unique : le navire remonte un peu au vent et porte quatre fois sa charge de rameurs.',
    effet: '−15 % de marge au port, +5 % de butin',
    cout: { bois: 260, bronze: 40 },
    duree: 250,
    requiert: ['corde'],
    batiment: { id: 'port', niveau: 2 },
    bonus: { margePortPct: 0.15, butinPct: 0.05 },
  },
  {
    id: 'essieu',
    nom: 'Essieu de char',
    emoji: '🛞',
    desc: 'L’essieu reporté à l’arrière de la caisse et graissé de suif : le char de guerre tourne court sans verser. On les assemble à la chaîne.',
    effet: '−10 % sur la formation des troupes, +6 % de dégâts',
    cout: { bois: 200, bronze: 55 },
    duree: 260,
    requiert: ['roue-rayons'],
    batiment: { id: 'caserne', niveau: 2 },
    bonus: { recruesPct: 0.1, degatsPct: 0.06 },
  },
  {
    id: 'arc-composite',
    nom: 'Arc composite',
    emoji: '🏹',
    desc: 'Bois, corne et tendon collés à la colle de poisson, l’arc bandé à l’envers de sa courbure. Il porte deux cents pas là où l’arc simple en fait cent.',
    effet: '+15 % de portée des tours, +5 % de dégâts',
    cout: { bois: 180, bronze: 45 },
    duree: 240,
    requiert: ['corde'],
    batiment: { id: 'caserne', niveau: 2 },
    bonus: { porteePct: 0.15, degatsPct: 0.05 },
  },
  {
    id: 'astronomie',
    nom: 'Astronomie de navigation',
    emoji: '✨',
    desc: 'Les Pléiades se lèvent, la mer s’ouvre ; elles se couchent, on tire les coques au sec. Le chariot du nord tient le cap la nuit, sans côte en vue.',
    effet: '−10 % de marge au port, +10 % de faveur, +8 % de bronze',
    cout: { pierre: 220, bronze: 70, grain: 120 },
    duree: 320,
    requiert: ['ecriture', 'voile-quille'],
    batiment: { id: 'temple', niveau: 3 },
    bonus: { margePortPct: 0.1, faveurPct: 0.1, bronzePct: 0.08 },
  },
]

export const TECHNO_PAR_ID: Record<string, TechnoDef> = Object.fromEntries(TECHNOS.map((t) => [t.id, t]))
export const TECHNO_IDS = TECHNOS.map((t) => t.id)

// ── L'instantané que ces règles demandent ────────────────────────────────────

/** vue en lecture seule de la partie, tout ce qu'il faut pour juger l'arbre */
export interface SnapTechno {
  buildings: Record<BuildingId, { level: number }>
  resources: Record<ResourceId, number>
  /** découvertes déjà acquises - sert au calcul des durées */
  technos?: string[]
}

// ── Ouverture, disponibilité, prérequis manquants ────────────────────────────

/** le conseil siège-t-il dans une agora assez grande pour tenir des comptes ? */
export function rechercheOuverte(snap: SnapTechno): boolean {
  return (snap.buildings.agora?.level ?? 0) >= AGORA_RECHERCHE
}

/**
 * Ce qui manque pour lancer cette recherche, en clair et dans l'ordre où le
 * joueur peut y remédier. Tableau vide = on peut chercher. Les ressources n'en
 * font PAS partie : elles se lisent sur le coût, et un manque momentané de
 * pierre n'est pas un prérequis d'arbre.
 */
export function manquePourTechno(id: string, acquises: string[], snap: SnapTechno): string[] {
  const def = TECHNO_PAR_ID[id]
  if (!def) return ['Découverte inconnue.']
  const out: string[] = []
  if (acquises.includes(id)) return ['Déjà acquise.']
  if (!rechercheOuverte(snap)) out.push(`Agora niveau ${AGORA_RECHERCHE} (les scribes du conseil)`)
  if (def.batiment) {
    const b = def.batiment
    if ((snap.buildings[b.id]?.level ?? 0) < b.niveau) out.push(`${BUILDINGS[b.id].nom} niveau ${b.niveau}`)
  }
  for (const r of def.requiert) {
    if (!acquises.includes(r)) out.push(`${TECHNO_PAR_ID[r]?.nom ?? r} (découverte préalable)`)
  }
  return out
}

/** les découvertes que l'on peut lancer tout de suite, dans l'ordre du tableau */
export function technosDisponibles(acquises: string[], snap: SnapTechno): TechnoDef[] {
  return TECHNOS.filter((t) => !acquises.includes(t.id) && manquePourTechno(t.id, acquises, snap).length === 0)
}

/** coût en ressources - fixe, il ne dépend de rien */
export function coutTechno(id: string): Cost {
  return TECHNO_PAR_ID[id]?.cout ?? {}
}

/** a-t-on de quoi payer ? le store garde la main sur le paiement lui-même */
export function coutPayable(id: string, snap: SnapTechno): boolean {
  const c = coutTechno(id)
  return (Object.keys(c) as ResourceId[]).every((r) => (snap.resources[r] ?? 0) >= (c[r] ?? 0))
}

/**
 * Durée de recherche en MILLISECONDES. Deux choses la raccourcissent, et les
 * deux sont des décisions du joueur : l'écriture (qui tient les archives) et
 * l'agora agrandie au-delà du niveau qui ouvre la recherche - 6 % par niveau.
 * Plancher à vingt secondes : une découverte doit s'attendre.
 */
export function dureeTechno(id: string, snap: SnapTechno): number {
  const def = TECHNO_PAR_ID[id]
  if (!def) return 0
  const acquises = snap.technos ?? []
  const archives = effetsTechnos(acquises).recherchePct
  const agora = Math.max(0, (snap.buildings.agora?.level ?? 0) - AGORA_RECHERCHE) * 0.06
  const mult = Math.max(0.4, 1 - archives - agora)
  return Math.max(20_000, Math.round(def.duree * 1000 * mult))
}

// ── Effets cumulés ───────────────────────────────────────────────────────────

/**
 * Somme des bonus des découvertes acquises. Appelée dans des chemins chauds (le
 * tick, le HUD) : on garde le dernier tableau lu en cache, comme `bonusFaveurs`
 * le fait pour les grâces - la liste change vingt fois dans un règne, jamais
 * entre deux images.
 */
let cacheEffets: { cle: string[]; val: EffetsTechnos } | null = null
export function effetsTechnos(acquises: string[] | undefined): EffetsTechnos {
  const liste = acquises ?? []
  if (cacheEffets && cacheEffets.cle === liste) return cacheEffets.val
  const out: EffetsTechnos = { ...TECHNOS_NEUTRES }
  for (const id of liste) {
    const def = TECHNO_PAR_ID[id]
    if (!def) continue
    for (const k of CLES_EFFETS) out[k] += def.bonus[k] ?? 0
  }
  cacheEffets = { cle: liste, val: out }
  return out
}

/** les effets acquis, en lignes lisibles - pour le récapitulatif du panneau */
export function resumeEffets(e: EffetsTechnos): { label: string; valeur: string }[] {
  const pct = (v: number) => `${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)} %`
  const moins = (v: number) => `−${Math.round(v * 100)} %`
  const lignes: { label: string; valeur: string }[] = [
    { label: 'Grain', valeur: pct(e.grainPct) },
    { label: 'Bois', valeur: pct(e.boisPct) },
    { label: 'Pierre', valeur: pct(e.pierrePct) },
    { label: 'Bronze', valeur: pct(e.bronzePct) },
    { label: 'Faveur', valeur: pct(e.faveurPct) },
    { label: 'Durée des chantiers', valeur: moins(e.chantierPct) },
    { label: 'Formation des troupes', valeur: moins(e.recruesPct) },
    { label: 'Structure des remparts', valeur: pct(e.murPct) },
    { label: 'Structure des bâtiments', valeur: pct(e.structurePct) },
    { label: 'Portée des tours', valeur: pct(e.porteePct) },
    { label: 'Entrepôt', valeur: pct(e.stockagePct) },
    { label: 'Marge du port', valeur: moins(e.margePortPct) },
    { label: 'Dégâts', valeur: pct(e.degatsPct) },
    { label: 'Butin', valeur: pct(e.butinPct) },
    { label: 'Grain consommé', valeur: moins(e.consoPct) },
    { label: 'Durée des recherches', valeur: moins(e.recherchePct) },
  ]
  // on ne récapitule que ce qui a été gagné : une colonne de « +0 % » n'informe personne
  return lignes.filter((_, i) => e[CLES_EFFETS[i]] !== 0)
}

// ── L'arbre, pour l'affichage ────────────────────────────────────────────────

/**
 * Profondeur d'une découverte : 0 pour une racine, sinon un cran après son plus
 * lointain prérequis. La `chaine` n'interdit qu'un cycle sur le chemin courant -
 * un ancêtre commun à deux branches doit pouvoir être compté deux fois, sans
 * quoi une découverte à deux parents se retrouverait rangée trop à gauche.
 */
const PROFONDEURS = new Map<string, number>()
function profondeur(id: string, chaine: Set<string> = new Set()): number {
  const memo = PROFONDEURS.get(id)
  if (memo !== undefined) return memo
  const def = TECHNO_PAR_ID[id]
  if (!def || def.requiert.length === 0 || chaine.has(id)) return 0
  chaine.add(id)
  const p = 1 + Math.max(...def.requiert.map((r) => profondeur(r, chaine)))
  chaine.delete(id)
  PROFONDEURS.set(id, p)
  return p
}

/**
 * L'arbre en colonnes : `arbreTechnos()[0]` sont les racines, `[1]` ce qui en
 * découle, et ainsi de suite. C'est le panneau qui décide s'il les met en
 * colonnes ou en rangées - ici on ne fait que ranger.
 */
export function arbreTechnos(): TechnoDef[][] {
  const niveaux: TechnoDef[][] = []
  for (const t of TECHNOS) {
    const p = profondeur(t.id)
    while (niveaux.length <= p) niveaux.push([])
    niveaux[p].push(t)
  }
  return niveaux
}

/** ce qui s'ouvre quand on acquiert cette découverte - argument de vente honnête */
export function debloquePar(id: string): TechnoDef[] {
  return TECHNOS.filter((t) => t.requiert.includes(id))
}
