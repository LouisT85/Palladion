import type { SaisonId } from './saisons'
import type { BuildingId } from './types'

/*
 * ═══════════════════ LE DÉFI DE LA SEMAINE ═══════════════════
 *
 * Un score ne veut rien dire si la partie n'était pas la même. Deux joueurs qui
 * annoncent « 1 400 de prestige » n'ont peut-être pas affronté les mêmes vagues,
 * ni la même météo, ni les mêmes dilemmes - le hasard décidait, et personne ne
 * pouvait se comparer à personne.
 *
 * Le défi supprime le hasard sans supprimer l'imprévu :
 *
 *  · une GRAINE dérivée de la semaine ISO courante. Tout le monde tire la même
 *    Troade du lundi au dimanche, et la semaine suivante en tire une autre ;
 *  · un générateur DÉTERMINISTE (mulberry32, seize lignes, aucune dépendance)
 *    que le store emploie partout où `Math.random` intervenait. La fonction
 *    `hasard()` de ce module est le seul point d'entrée : sans défi en cours elle
 *    délègue à `Math.random`, ce qui laisse les autres modes exactement comme ils
 *    étaient (voir `poserAlea` plus bas, et la note sur la reprise de partie) ;
 *  · des CONTRAINTES tirées de la graine, deux ou trois par semaine, jamais deux
 *    de la même famille - « hiver perpétuel » et « été sans fin » ne peuvent pas
 *    tomber ensemble ;
 *  · un OBJECTIF affiché d'avance, dont la barre s'abaisse quand les contraintes
 *    serrent : le défi doit rester gagnable la semaine où il est cruel.
 *
 * Le score final multiplie le règne par la dureté de la semaine, si bien qu'une
 * semaine facile ne rapporte pas plus qu'une semaine terrible.
 */

// ── Le générateur ─────────────────────────────────────────────────────────────

/**
 * Brasse un entier en un autre, très différent, de manière reproductible
 * (splitmix32). Sans cela, les semaines 32 et 33 donneraient deux graines
 * voisines - donc deux Troades presque identiques, ce qui ruinerait l'intérêt de
 * la rotation hebdomadaire.
 */
export function melanger(n: number): number {
  let x = (n | 0) >>> 0
  x = (x + 0x9e3779b9) >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad) >>> 0
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97) >>> 0
  return (x ^ (x >>> 15)) >>> 0
}

/**
 * mulberry32 : un tirage uniforme dans [0, 1[, reproductible à partir d'une
 * graine entière. Même graine, même suite, sur n'importe quel navigateur - c'est
 * toute la raison de ne pas employer `Math.random`, dont l'implémentation varie.
 */
export function creerAlea(graine: number): () => number {
  let a = (graine >>> 0) || 1
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

export interface AleaCompte {
  /** le tirage, à employer comme `Math.random` */
  alea: () => number
  /** nombre de tirages consommés depuis la graine - à SAUVEGARDER */
  compte: () => number
}

/**
 * Le même générateur, mais qui compte ses tirages et sait reprendre au milieu.
 * C'est ce qui rend le défi reproductible APRÈS un rechargement de page : le
 * store sauvegarde `compte()`, et au retour `creerAleaCompte(graine, compte)`
 * ravance la suite jusqu'au même point. Rembobiner coûte une boucle vide de
 * quelques milliers de tours - trois microsecondes, une fois par ouverture.
 */
export function creerAleaCompte(graine: number, depuis = 0): AleaCompte {
  const base = creerAlea(graine)
  let n = Math.max(0, Math.floor(depuis))
  for (let i = 0; i < n; i++) base()
  return {
    alea: () => {
      n++
      return base()
    },
    compte: () => n,
  }
}

/*
 * LE POINT D'ENTRÉE UNIQUE DU HASARD.
 *
 * `source` est nulle par défaut : `hasard()` vaut alors exactement `Math.random`,
 * et le bac à sable, la campagne et le siège ne changent pas d'un cheveu. En mode
 * défi, le store appelle `poserAlea(creerAleaCompte(graine, compte).alea)` à
 * l'ouverture de la partie et `poserAlea(null)` en la quittant.
 */
let source: (() => number) | null = null

export function poserAlea(f: (() => number) | null): void {
  source = f
}

/** un alea déterministe est-il en place ? (l'UI l'affiche, les tests le vérifient) */
export function aleaPose(): boolean {
  return source !== null
}

/** LE tirage du jeu. À substituer à `Math.random` dans le moteur. */
export function hasard(): number {
  return (source ?? Math.random)()
}

// ── Petits outils de tirage ───────────────────────────────────────────────────

/** entier dans [min, max], bornes comprises */
export function tirerEntier(alea: () => number, min: number, max: number): number {
  if (max <= min) return min
  return min + Math.floor(alea() * (max - min + 1))
}

/** un élément d'une liste non vide */
export function tirerDans<T>(alea: () => number, liste: readonly T[]): T {
  return liste[Math.floor(alea() * liste.length) % liste.length]
}

// ── La semaine ────────────────────────────────────────────────────────────────

/**
 * Le jeudi de la semaine ISO d'une date, à midi UTC. Le jeudi porte l'année ISO :
 * c'est la définition de la norme, et c'est ce qui évite les erreurs de fin
 * décembre. On travaille sur la date LOCALE du joueur - le défi se compare entre
 * amis, pas entre fuseaux.
 */
function jeudiISO(date: Date): Date {
  const t = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12))
  const jour = (t.getUTCDay() + 6) % 7 // lundi = 0
  t.setUTCDate(t.getUTCDate() - jour + 3)
  return t
}

/** le premier jeudi d'une année ISO - celui de la semaine 1 */
function jeudiSemaine1(annee: number): Date {
  return jeudiISO(new Date(annee, 0, 4))
}

const SEMAINE_MS = 7 * 86_400_000

/** origine du comptage : la semaine 1 de 2026 porte le numéro 1 */
export const ANNEE_ORIGINE = 2026

export interface GrainesSemaine {
  /** année ISO (celle du jeudi de la semaine) */
  annee: number
  /** numéro de semaine ISO, 1 à 53 */
  semaine: number
  /** numéro du défi depuis l'origine, monotone : « Défi n° 32 » */
  numero: number
  /** la graine du moteur, dérivée de l'année et de la semaine */
  graine: number
}

/**
 * La graine de la semaine d'une date. Tout le reste du module en dépend, et rien
 * d'autre ne dépend de l'horloge : c'est le seul endroit à regarder si un jour
 * on veut des défis quotidiens.
 */
export function grainesSemaine(date: Date = new Date()): GrainesSemaine {
  const jeudi = jeudiISO(date)
  const annee = jeudi.getUTCFullYear()
  const semaine = 1 + Math.round((jeudi.getTime() - jeudiSemaine1(annee).getTime()) / SEMAINE_MS)
  const depuis = Math.round((jeudi.getTime() - jeudiSemaine1(ANNEE_ORIGINE).getTime()) / SEMAINE_MS)
  return {
    annee,
    semaine,
    numero: Math.max(1, depuis + 1),
    graine: melanger(annee * 100 + semaine),
  }
}

// ── Les contraintes ───────────────────────────────────────────────────────────

/** ce qu'une contrainte retire au village - le store lit ces champs, pas les textes */
export interface EffetContrainte {
  /** ce bâtiment ne peut pas être élevé */
  batimentInterdit?: BuildingId
  /** nombre maximal de tours d'archers */
  toursMax?: number
  /** menace multipliée : les vagues grossissent d'autant */
  menaceMult?: number
  /** la roue des saisons ne tourne plus */
  saisonFixe?: SaisonId
  /** aucun héros ne se présente à votre porte */
  sansHeros?: boolean
  /** les troupes ne sortent pas du village */
  sansExpeditions?: boolean
  /** les Olympiens regardent sans intervenir */
  sansBenediction?: boolean
  /** toutes les récoltes multipliées */
  productionMult?: number
  /** plafond d'habitants, quel que soit le niveau des maisons */
  popMax?: number
  /** aucun dilemme ne se présente */
  sansDilemmes?: boolean
}

/**
 * `famille` sert à une seule chose, mais elle est essentielle : deux contraintes
 * de la même famille ne peuvent pas tomber la même semaine. Sans elle on aurait
 * « hiver perpétuel » ET « été sans fin », ou deux plafonds d'habitants
 * contradictoires. `poids` mesure la dureté : il abaisse l'objectif et majore le
 * score final.
 */
export interface ContrainteDef {
  id: string
  emoji: string
  nom: string
  desc: string
  famille: 'ciel' | 'pierre' | 'guerre' | 'noms' | 'monde' | 'olympe' | 'peuple'
  poids: number
  effet: EffetContrainte
}

export const CONTRAINTES: ContrainteDef[] = [
  {
    id: 'sans-port',
    emoji: '⚓',
    nom: 'La mer est fermée',
    desc: 'Aucun port ne sera bâti : ni pêche, ni comptoir, ni bronze venu des îles.',
    famille: 'pierre',
    poids: 3,
    effet: { batimentInterdit: 'port' },
  },
  {
    id: 'sans-forge',
    emoji: '⚒️',
    nom: 'Nul feu de forge',
    desc: 'La forge reste interdite : le bronze devra venir d’ailleurs.',
    famille: 'pierre',
    poids: 4,
    effet: { batimentInterdit: 'forge' },
  },
  {
    id: 'menace-doublee',
    emoji: '🔥',
    nom: 'Toute la plaine arme',
    desc: 'La menace compte double. Chaque vague est deux fois ce qu’elle devrait être.',
    famille: 'guerre',
    poids: 7,
    effet: { menaceMult: 2 },
  },
  {
    id: 'une-seule-tour',
    emoji: '🏹',
    nom: 'Une seule tour',
    desc: 'L’enceinte ne portera qu’une tour d’archers - choisissez bien son pan.',
    famille: 'guerre',
    poids: 3,
    effet: { toursMax: 1 },
  },
  {
    id: 'hiver-perpetuel',
    emoji: '❄️',
    nom: 'Hiver perpétuel',
    desc: 'La roue des saisons s’est arrêtée sur l’hiver. Les greniers ne se rempliront pas seuls.',
    famille: 'ciel',
    poids: 6,
    effet: { saisonFixe: 'hiver' },
  },
  {
    id: 'ete-sans-fin',
    emoji: '☀️',
    nom: 'Été sans fin',
    desc: 'Un été qui ne finit pas : les moissons abondent, la terre se craquelle et les Achéens naviguent.',
    famille: 'ciel',
    poids: 2,
    effet: { saisonFixe: 'ete' },
  },
  {
    id: 'sans-heros',
    emoji: '🛡️',
    nom: 'Nul nom ne vient',
    desc: 'Aucun héros ne se présentera. Vos murs ne tiendront que par vos hommes.',
    famille: 'noms',
    poids: 5,
    effet: { sansHeros: true },
  },
  {
    id: 'sans-expeditions',
    emoji: '🚫',
    nom: 'Les portes closes',
    desc: 'Aucune expédition : ni razzia, ni secours, rien ne sort du village.',
    famille: 'monde',
    poids: 4,
    effet: { sansExpeditions: true },
  },
  {
    id: 'sans-benediction',
    emoji: '🙈',
    nom: 'Les dieux regardent',
    desc: 'Aucune bénédiction ne sera accordée. La faveur ne servira qu’aux grâces.',
    famille: 'olympe',
    poids: 5,
    effet: { sansBenediction: true },
  },
  {
    id: 'terre-ingrate',
    emoji: '🥀',
    nom: 'Terre ingrate',
    desc: 'La Troade rend un cinquième de moins, sur toutes les ressources.',
    famille: 'peuple',
    poids: 4,
    effet: { productionMult: 0.8 },
  },
  {
    id: 'village-clos',
    emoji: '🚪',
    nom: 'Village clos',
    desc: 'Quatorze habitants au plus, quoi qu’en disent les maisons.',
    famille: 'peuple',
    poids: 4,
    effet: { popMax: 14 },
  },
  {
    id: 'sans-dilemmes',
    emoji: '🤐',
    nom: 'Personne ne demande rien',
    desc: 'Aucun dilemme ne vous sera soumis - ni le tort ni le profit qui vont avec.',
    famille: 'monde',
    poids: 1,
    effet: { sansDilemmes: true },
  },
]

export const CONTRAINTE_PAR_ID: Record<string, ContrainteDef> = Object.fromEntries(CONTRAINTES.map((c) => [c.id, c]))

/**
 * Tire les contraintes de la semaine : deux ou trois, de familles distinctes. On
 * parcourt une copie mélangée de la table plutôt que de retirer au hasard jusqu'à
 * trouver, pour que le tirage consomme un nombre PRÉVISIBLE de valeurs de l'alea.
 */
export function tirerContraintes(alea: () => number): ContrainteDef[] {
  const combien = tirerEntier(alea, 2, 3)
  const ordre = [...CONTRAINTES]
  // mélange de Fisher-Yates, sens décroissant : un tirage par élément, toujours
  for (let i = ordre.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1))
    ;[ordre[i], ordre[j]] = [ordre[j], ordre[i]]
  }
  const prises: ContrainteDef[] = []
  const familles = new Set<string>()
  for (const c of ordre) {
    if (prises.length >= combien) break
    if (familles.has(c.famille)) continue
    familles.add(c.famille)
    prises.push(c)
  }
  return prises
}

/** somme des poids : la dureté de la semaine */
export function dureteDe(contraintes: ContrainteDef[]): number {
  return contraintes.reduce((a, c) => a + c.poids, 0)
}

/** les effets de toutes les contraintes, fusionnés dans la forme que le store lit */
export interface ReglesDefi {
  batimentsInterdits: BuildingId[]
  toursMax: number | null
  menaceMult: number
  productionMult: number
  saisonFixe: SaisonId | null
  popMax: number | null
  sansHeros: boolean
  sansExpeditions: boolean
  sansBenediction: boolean
  sansDilemmes: boolean
}

export function reglesDefi(contraintes: ContrainteDef[]): ReglesDefi {
  const r: ReglesDefi = {
    batimentsInterdits: [],
    toursMax: null,
    menaceMult: 1,
    productionMult: 1,
    saisonFixe: null,
    popMax: null,
    sansHeros: false,
    sansExpeditions: false,
    sansBenediction: false,
    sansDilemmes: false,
  }
  for (const c of contraintes) {
    const e = c.effet
    if (e.batimentInterdit && !r.batimentsInterdits.includes(e.batimentInterdit)) {
      r.batimentsInterdits.push(e.batimentInterdit)
    }
    // les plafonds se cumulent par le plus sévère, les multiplicateurs par produit
    if (e.toursMax !== undefined) r.toursMax = r.toursMax === null ? e.toursMax : Math.min(r.toursMax, e.toursMax)
    if (e.popMax !== undefined) r.popMax = r.popMax === null ? e.popMax : Math.min(r.popMax, e.popMax)
    if (e.menaceMult !== undefined) r.menaceMult *= e.menaceMult
    if (e.productionMult !== undefined) r.productionMult *= e.productionMult
    if (e.saisonFixe !== undefined) r.saisonFixe = e.saisonFixe
    if (e.sansHeros) r.sansHeros = true
    if (e.sansExpeditions) r.sansExpeditions = true
    if (e.sansBenediction) r.sansBenediction = true
    if (e.sansDilemmes) r.sansDilemmes = true
  }
  return r
}

// ── L'objectif ────────────────────────────────────────────────────────────────

export type TypeObjectif = 'assauts' | 'prestige' | 'habitants'

export interface ObjectifDefi {
  type: TypeObjectif
  cible: number
  /** « Tenir 11 assauts » - le titre affiché */
  label: string
  /** pourquoi c'est difficile cette semaine-là */
  desc: string
}

/** ce qu'on demande une semaine sans contrainte : la barre de référence */
export const CIBLES_BASE: Record<TypeObjectif, number> = { assauts: 12, prestige: 600, habitants: 30 }
/** part maximale retirée à la barre quand la semaine est atroce */
export const REMISE_MAX = 0.4

/**
 * L'objectif de la semaine. La barre BAISSE avec la dureté : une semaine à
 * menace doublée et hiver perpétuel demande neuf assauts là où une semaine
 * clémente en demande douze. Sans cela, les semaines cruelles ne seraient jamais
 * gagnées et le classement n'aurait plus qu'une colonne.
 */
export function tirerObjectif(alea: () => number, contraintes: ContrainteDef[]): ObjectifDefi {
  const type = tirerDans(alea, ['assauts', 'prestige', 'habitants'] as const)
  const remise = Math.min(REMISE_MAX, dureteDe(contraintes) * 0.028)
  const brut = CIBLES_BASE[type] * (1 - remise)
  const cible = type === 'prestige' ? Math.round(brut / 25) * 25 : Math.max(3, Math.round(brut))
  const labels: Record<TypeObjectif, string> = {
    assauts: `Tenir ${cible} assauts`,
    prestige: `Atteindre ${cible} de prestige`,
    habitants: `Rassembler ${cible} habitants`,
  }
  const descs: Record<TypeObjectif, string> = {
    assauts: 'Chaque vague repoussée compte, celles où l’ennemi entre aussi - il faut seulement qu’il reparte.',
    prestige: 'Le prestige du règne, tel que les aèdes le comptent : bâti, tenu, honoré, allié.',
    habitants: 'Des bras vivants le jour du décompte. Nourrissez-les, ou ils ne seront plus là.',
  }
  return { type, cible, label: labels[type], desc: descs[type] }
}

// ── Le défi ───────────────────────────────────────────────────────────────────

export interface DefiSemaine {
  graine: number
  numero: number
  annee: number
  semaine: number
  contraintes: ContrainteDef[]
  objectif: ObjectifDefi
  /** la semaine en une phrase, pour le bandeau */
  description: string
  /** somme des poids des contraintes */
  durete: number
  /** multiplicateur de score de la semaine */
  mult: number
}

/** ce que la dureté ajoute au score : +5 % par point de poids */
export const MULT_PAR_POIDS = 0.05

/**
 * Le défi de la semaine. Fonction PURE de la date : deux appels le même jour
 * rendent le même objet, et deux joueurs de la même semaine jouent la même
 * chose. L'ordre des tirages ne doit jamais changer - il fixe l'identité de
 * toutes les semaines passées.
 */
export function defiDeLaSemaine(date: Date = new Date()): DefiSemaine {
  const g = grainesSemaine(date)
  const alea = creerAlea(g.graine)
  const contraintes = tirerContraintes(alea)
  const objectif = tirerObjectif(alea, contraintes)
  const durete = dureteDe(contraintes)
  return {
    ...g,
    contraintes,
    objectif,
    durete,
    mult: 1 + durete * MULT_PAR_POIDS,
    description: `${contraintes.map((c) => c.nom.toLowerCase()).join(', ')} - ${objectif.label.toLowerCase()}.`,
  }
}

// ── Le score ──────────────────────────────────────────────────────────────────

/** vue du règne suffisante pour noter un défi */
export interface SnapDefi {
  /** prestige tel que `prestige()` de hautsfaits.ts le rend */
  prestige: number
  repousses: number
  pop: number
  /** nombre de hauts faits acquis */
  hautsFaits: number
  jour: number
}

export interface ScoreDefi {
  points: number
  /** le calcul, ligne à ligne, tel que l'écran de bilan le montre */
  detail: { label: string; points: number }[]
  /** multiplicateur de la semaine appliqué au total */
  mult: number
  objectifAtteint: boolean
  /** avancement de l'objectif, 0 à 1 */
  progression: number
}

/** prime accordée quand l'objectif de la semaine est atteint */
export const PRIME_OBJECTIF = 0.3

/** où en est l'objectif, de 0 à 1 */
export function progressionObjectif(s: SnapDefi, o: ObjectifDefi): number {
  const fait = o.type === 'assauts' ? s.repousses : o.type === 'prestige' ? s.prestige : s.pop
  if (o.cible <= 0) return 1
  return Math.max(0, Math.min(1, fait / o.cible))
}

/**
 * Le score du défi. Le règne est noté sur cinq axes puis multiplié par la dureté
 * de la semaine, et l'objectif atteint majore encore de trois dixièmes : une
 * semaine terrible où l'on a rempli le contrat bat une semaine douce où l'on a
 * bâti plus. C'est le seul barème qui rende les semaines comparables.
 */
export function scoreDefi(s: SnapDefi, defi: DefiSemaine): ScoreDefi {
  const detail = [
    { label: 'Prestige du règne', points: Math.max(0, Math.round(s.prestige)) },
    { label: 'Assauts repoussés', points: Math.max(0, Math.round(s.repousses)) * 20 },
    { label: 'Habitants', points: Math.max(0, Math.round(s.pop)) * 6 },
    { label: 'Hauts faits', points: Math.max(0, Math.round(s.hautsFaits)) * 10 },
    { label: 'Journées de règne', points: Math.max(0, Math.round(s.jour)) * 3 },
  ]
  const base = detail.reduce((a, d) => a + d.points, 0)
  const progression = progressionObjectif(s, defi.objectif)
  const objectifAtteint = progression >= 1
  const mult = defi.mult * (objectifAtteint ? 1 + PRIME_OBJECTIF : 1)
  return { points: Math.round(base * mult), detail, mult, objectifAtteint, progression }
}

// ── Le classement local ───────────────────────────────────────────────────────

export const CLE_DEFIS = 'palladion-defis'
/** au-delà, les vieilles semaines sortent de la liste */
export const MAX_ENTREES = 24

export interface EntreeDefi {
  numero: number
  annee: number
  semaine: number
  points: number
  objectifAtteint: boolean
  /** ms epoch de l'enregistrement */
  finiLe: number
}

/** les scores passés du joueur, du plus récent au plus ancien */
export function classementLocal(): EntreeDefi[] {
  try {
    const brut = localStorage.getItem(CLE_DEFIS)
    if (!brut) return []
    const d = JSON.parse(brut) as unknown
    if (!Array.isArray(d)) return []
    return d
      .filter((e): e is EntreeDefi => !!e && typeof e === 'object' && typeof (e as EntreeDefi).numero === 'number')
      .map((e) => ({
        numero: Math.round(e.numero),
        annee: Math.round(e.annee ?? 0),
        semaine: Math.round(e.semaine ?? 0),
        points: Math.max(0, Math.round(e.points ?? 0)),
        objectifAtteint: !!e.objectifAtteint,
        finiLe: typeof e.finiLe === 'number' ? e.finiLe : 0,
      }))
      .sort((a, b) => b.numero - a.numero)
  } catch {
    return []
  }
}

/**
 * Enregistre un score. Une seule ligne par semaine, et c'est le MEILLEUR qui
 * reste : recommencer le défi du lundi ne doit jamais abîmer ce qu'on avait
 * réussi. Renvoie le classement à jour.
 */
export function enregistrerDefi(e: EntreeDefi): EntreeDefi[] {
  const avant = classementLocal()
  const ancien = avant.find((x) => x.numero === e.numero)
  if (ancien && ancien.points >= e.points) return avant
  const apres = [...avant.filter((x) => x.numero !== e.numero), e]
    .sort((a, b) => b.numero - a.numero)
    .slice(0, MAX_ENTREES)
  try {
    localStorage.setItem(CLE_DEFIS, JSON.stringify(apres))
  } catch {
    // stockage indisponible : le score restera dans l'écran de bilan, sans mémoire
  }
  return apres
}

/** le meilleur score du joueur sur une semaine donnée */
export function meilleurDefi(numero: number): EntreeDefi | null {
  return classementLocal().find((e) => e.numero === numero) ?? null
}

/** le meilleur score toutes semaines confondues - le record dont on se vante */
export function recordDefi(): EntreeDefi | null {
  const l = classementLocal()
  if (l.length === 0) return null
  return l.reduce((a, b) => (b.points > a.points ? b : a))
}
