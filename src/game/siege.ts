import { CHAMPIONS, type ChampionDef } from './champions'
import { budgetVague, descVague } from './combat'
import { ENEMIES } from './data'
import type { EnemyId, HeroId, ResourceId, WaveUnit } from './types'

/*
 * ═══════════════════════ LE SIÈGE SANS FIN ═══════════════════════
 *
 * Le bac à sable laisse respirer : entre deux assauts on bâtit, on négocie, on
 * délibère. Le siège, lui, ne demande qu'une chose - COMBIEN DE TEMPS ? Les
 * vagues s'enchaînent, chacune plus lourde que la précédente, et l'on compte.
 *
 * Trois partis pris, tous au service de cette question :
 *
 *  · la difficulté est ÉCRITE, pas tirée. Une vague 12 doit être plus dure
 *    qu'une vague 9, toujours, sinon le score ne veut rien dire et le joueur
 *    n'apprend rien de sa mort. `genererVague` de combat.ts tire au sort son
 *    budget : on ne l'emploie donc pas ici, on compose à la table ;
 *  · le répit rétrécit mais ne disparaît jamais. Sans un moment pour rebâtir un
 *    pan de mur, la fin n'est plus une défaite, c'est une horloge ;
 *  · le mode retire tout ce qui fait délibérer - dilemmes, expéditions - et
 *    double la production, sinon on regarde ses ruines sans pouvoir les relever.
 *
 * Tout ce fichier est PUR : le store appelle, l'état est à lui.
 */

/** L'état d'un siège en cours. Le store le porte dans `s.siege`. */
export interface EtatSiege {
  /** numéro de la dernière vague LANCÉE ; 0 tant que la première n'est pas partie */
  vague: number
  /** vagues effectivement repoussées - c'est le chiffre du record */
  tenues: number
  /** cumul des défenseurs tombés, toutes vagues confondues */
  pertes: number
  /** début du siège (ms epoch), pour la durée totale au bilan */
  debutAt: number
  /** date de déclenchement de la prochaine vague (ms epoch) */
  prochaineAt: number
  /** durée du répit courant (ms) - le bandeau en fait une jauge */
  repit: number
  /** points accumulés */
  points: number
  /** meilleur nombre de vagues tenues avant ce siège-ci, pour savoir si on le bat */
  record: number
  /** le Palladion est tombé : le bilan s'affiche et le compte s'arrête */
  fini: boolean
}

// ── Ce que le mode change ─────────────────────────────────────────────────────

/**
 * Les règles particulières du siège, en un seul endroit pour que le store n'ait
 * rien à deviner. Les ressources de départ sont celles du bac à sable, en plus
 * fournies : on n'a pas le loisir d'attendre la première récolte.
 */
export const REGLES_SIEGE = {
  /** aucun dilemme : on ne délibère pas entre deux assauts */
  dilemmes: false,
  /** aucune expédition : on est assiégé, les troupes ne sortent pas */
  expeditions: false,
  /** production doublée - la reconstruction est la seule vraie manœuvre du mode */
  productionMult: 2,
  /** de quoi bâtir tout de suite au lieu de regarder pousser le grain */
  ressourcesDepart: { bois: 600, pierre: 400, grain: 400, bronze: 90 } as Record<ResourceId, number>,
  /** faveur de départ : un dieu utilisable dès la deuxième vague */
  faveurDepart: 25,
  /** bras au départ, contre sept en bac à sable */
  popDepart: 10,
  /** répit avant la première vague : le temps de poser une palissade */
  premierRepitMs: 150_000,
} as const

// ── Composition des vagues ────────────────────────────────────────────────────

/**
 * Budget de la n-ième vague. Croissance quadratique douce : les premières
 * montent lentement (on apprend), les tardives écrasent (on meurt).
 *   v1 ≈ 55, v5 ≈ 219, v10 ≈ 604, v15 ≈ 1239, v20 ≈ 2124.
 */
export function budgetSiege(n: number): number {
  const k = Math.max(0, n - 1)
  return 55 + 25 * k + 4 * k * k
}

/** parts du budget par type d'assaillant, du premier palier au dernier */
const PALIERS: { desVague: number; parts: Partial<Record<EnemyId, number>>; garantis: EnemyId[] }[] = [
  { desVague: 1, parts: { pillard: 1 }, garantis: ['pillard'] },
  { desVague: 3, parts: { pillard: 0.6, guerrier: 0.4 }, garantis: ['guerrier'] },
  { desVague: 6, parts: { pillard: 0.35, guerrier: 0.45, mercenaire: 0.2 }, garantis: ['mercenaire'] },
  { desVague: 8, parts: { pillard: 0.25, guerrier: 0.4, mercenaire: 0.25, belier: 0.1 }, garantis: ['belier'] },
  { desVague: 12, parts: { pillard: 0.2, guerrier: 0.35, mercenaire: 0.3, belier: 0.15 }, garantis: ['belier'] },
]

function palierDe(n: number) {
  let p = PALIERS[0]
  for (const c of PALIERS) if (n >= c.desVague) p = c
  return p
}

/**
 * Nombre de fronts assaillis. Un seul pan tant qu'on apprend à tenir un pan,
 * puis deux, puis trois : c'est la montée la plus brutale du mode, parce qu'elle
 * force à répartir une garnison qu'on n'a pas.
 */
export function frontsSiege(n: number): number {
  if (n >= 9) return 3
  if (n >= 4) return 2
  return 1
}

/** une vague sur cinq porte un nom */
export const INTERVALLE_CHAMPION = 5

/**
 * Le champion qui mène la vague, ou `null`. Un nom toutes les cinq vagues, dans
 * l'ordre croissant de ce qu'ils exigent normalement pour se déplacer : on
 * commence par Cassandre et l'on finit par le Pélide, puis la liste recommence.
 */
export function championSiege(n: number): ChampionDef | null {
  if (n <= 0 || n % INTERVALLE_CHAMPION !== 0) return null
  const ordre = [...CHAMPIONS].sort((a, b) => a.menaceMin - b.menaceMin)
  return ordre[(n / INTERVALLE_CHAMPION - 1) % ordre.length]
}

/**
 * La n-ième vague, composée à la table donc reproductible : deux joueurs qui
 * atteignent la vague 14 ont affronté exactement la même chose.
 */
export function vagueSiege(n: number): {
  wave: WaveUnit[]
  fronts: number
  annonce: string
  champion: HeroId | null
} {
  const cible = budgetSiege(n)
  const palier = palierDe(n)
  const counts: Partial<Record<EnemyId, number>> = {}
  for (const [id, part] of Object.entries(palier.parts) as [EnemyId, number][]) {
    const nb = Math.floor((cible * part) / ENEMIES[id].budget)
    if (nb > 0) counts[id] = nb
  }
  // un palier s'ouvre sur une PRÉSENCE : à la vague 8, on doit voir un bélier,
  // même si sa part de budget ne suffit pas encore à en payer un
  for (const id of palier.garantis) counts[id] = Math.max(1, counts[id] ?? 0)

  // les arrondis à l'entier laissent de la monnaie : on la dépense en pillards,
  // ce qui garantit un budget réel toujours à moins d'un pillard de la cible -
  // et donc une difficulté strictement croissante d'une vague à l'autre
  const wave = () => (Object.entries(counts) as [EnemyId, number][]).map(([enemy, count]) => ({ enemy, count }))
  let reste = cible - budgetVague(wave())
  while (reste >= ENEMIES.pillard.budget) {
    counts.pillard = (counts.pillard ?? 0) + 1
    reste -= ENEMIES.pillard.budget
  }

  const w = wave()
  const champion = championSiege(n)
  const fronts = frontsSiege(n)
  const annonce =
    `Vague ${n} - ${descVague(w)}, sur ${fronts === 1 ? 'un front' : fronts === 2 ? 'deux fronts' : 'trois fronts'}.` +
    (champion ? ` ${champion.titre}.` : '')
  return { wave: w, fronts, annonce, champion: champion ? champion.id : null }
}

// ── Le répit ──────────────────────────────────────────────────────────────────

/** premier répit, avant que la machine ne serre */
export const REPIT_MAX_MS = 92_000
/** plancher : sous cela, on ne répare plus rien et la défaite n'est plus jouée */
export const REPIT_MIN_MS = 26_000
/** ce que chaque vague retire au répit suivant */
export const REPIT_PAS_MS = 6_000

/**
 * Répit accordé après la n-ième vague. Décroît d'une vague à l'autre puis se
 * bloque : le mode veut tuer par la masse, pas par l'essoufflement.
 */
export function repitApres(n: number): number {
  return Math.max(REPIT_MIN_MS, REPIT_MAX_MS - Math.max(0, n) * REPIT_PAS_MS)
}

// ── Le score ──────────────────────────────────────────────────────────────────

/** durée de référence d'un assaut : au-delà, plus aucune prime de vitesse */
export const DUREE_REF_MS = 90_000
/** ce que coûte chaque défenseur tombé */
export const MALUS_PERTE = 12
/** part maximale ajoutée pour une vague balayée d'emblée */
export const PRIME_VITESSE = 0.5

/**
 * Points d'une vague repoussée. On paie la vague pour ce qu'elle valait, on
 * majore la propreté du travail - une vague brisée en vingt secondes vaut une
 * fois et demie la même vague traînée deux minutes - et l'on retire le prix du
 * sang versé. Jamais négatif : une vague tenue reste une vague tenue.
 */
export function pointsVague(n: number, pertes: number, tempsMs: number): number {
  const base = 40 + 60 * Math.max(1, n)
  const vite = Math.max(0, Math.min(1, (DUREE_REF_MS - Math.max(0, tempsMs)) / DUREE_REF_MS))
  return Math.max(0, Math.round(base * (1 + PRIME_VITESSE * vite) - MALUS_PERTE * Math.max(0, pertes)))
}

/** les huit paliers, du dérisoire au sublime */
export const RANGS_SIEGE: { seuil: number; titre: string }[] = [
  { seuil: 0, titre: 'Poussière de la plaine' },
  { seuil: 250, titre: 'Guetteur d’une nuit' },
  { seuil: 700, titre: 'Gardien de la porte' },
  { seuil: 1500, titre: 'Rempart de la Troade' },
  { seuil: 3000, titre: 'Fléau des Achéens' },
  { seuil: 5500, titre: 'Égal des héros' },
  { seuil: 9000, titre: 'Bras d’Arès' },
  { seuil: 15_000, titre: 'Palladion inviolé' },
]

/** le titre que les aèdes donneront à ce siège */
export function rangSiege(points: number): string {
  let titre = RANGS_SIEGE[0].titre
  for (const r of RANGS_SIEGE) if (points >= r.seuil) titre = r.titre
  return titre
}

/** rang suivant et ce qu'il reste à gagner pour l'atteindre, ou `null` au sommet */
export function prochainRang(points: number): { titre: string; manque: number } | null {
  const r = RANGS_SIEGE.find((x) => points < x.seuil)
  return r ? { titre: r.titre, manque: r.seuil - points } : null
}

// ── Transitions (le store se contente de recopier) ────────────────────────────

/** Ouvre un siège. `record` vient de la sauvegarde : il survit aux parties. */
export function demarrerSiege(now: number, record = 0): EtatSiege {
  return {
    vague: 0,
    tenues: 0,
    pertes: 0,
    debutAt: now,
    prochaineAt: now + REGLES_SIEGE.premierRepitMs,
    repit: REGLES_SIEGE.premierRepitMs,
    points: 0,
    record,
    fini: false,
  }
}

/** La vague part : on incrémente le compteur et l'on repousse l'échéance. */
export function lancerVague(e: EtatSiege): EtatSiege {
  const vague = e.vague + 1
  // pas d'échéance pendant la bataille : c'est sa fin qui rouvre le compte
  return { ...e, vague, prochaineAt: Number.POSITIVE_INFINITY }
}

/**
 * La vague est repoussée : on encaisse les points, on ouvre le répit suivant.
 * `tempsMs` est la durée de la bataille, `pertes` les défenseurs tombés.
 */
export function apresVague(e: EtatSiege, pertes: number, tempsMs: number, now: number): EtatSiege {
  const repit = repitApres(e.vague)
  return {
    ...e,
    tenues: e.vague,
    pertes: e.pertes + Math.max(0, pertes),
    points: e.points + pointsVague(e.vague, pertes, tempsMs),
    repit,
    prochaineAt: now + repit,
  }
}

/** Le Palladion est tombé : le compte se ferme, le record se met à jour. */
export function cloreSiege(e: EtatSiege): EtatSiege {
  return { ...e, fini: true, prochaineAt: Number.POSITIVE_INFINITY, record: Math.max(e.record, e.tenues) }
}
