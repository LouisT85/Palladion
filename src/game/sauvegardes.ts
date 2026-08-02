import { STORAGE_KEY } from './data'

/*
 * ═══════════════════ TROIS EMPLACEMENTS, ET UN FICHIER ═══════════════════
 *
 * Le jeu n'avait qu'une partie à la fois, et rien ne survivait à un vidage du
 * navigateur : dix heures de règne tenaient à une case à cocher dans les
 * préférences de Chrome. Trois choses manquaient, et ce module les apporte
 * sans toucher au moteur :
 *
 *  · TROIS EMPLACEMENTS. Chacun est une clé de `localStorage` à part entière ;
 *    l'emplacement actif est mémorisé, et `STORAGE_KEY` reste l'emplacement 1
 *    pour que les parties d'avant se retrouvent là où elles étaient.
 *
 *  · L'EXPORT vers un fichier, que le joueur range où il veut.
 *
 *  · L'IMPORT, qui contrôle ce qu'il lit avant de l'écrire : un fichier
 *    illisible ne doit jamais remplacer une partie en cours.
 *
 * Rien ici ne connaît le contenu d'une sauvegarde : le module manipule du texte
 * et des dates. C'est ce qui lui permet de survivre aux changements du store.
 */

export const NB_EMPLACEMENTS = 3
const CLE_ACTIF = 'palladion-emplacement'

/** clé de stockage d'un emplacement - le premier garde la clé historique */
export function cleEmplacement(i: number): string {
  return i === 0 ? STORAGE_KEY : `${STORAGE_KEY}-${i + 1}`
}

/** emplacement actuellement joué (0 à NB_EMPLACEMENTS − 1) */
export function emplacementActif(): number {
  try {
    const n = Number(localStorage.getItem(CLE_ACTIF))
    return Number.isInteger(n) && n >= 0 && n < NB_EMPLACEMENTS ? n : 0
  } catch {
    return 0
  }
}

export function poserEmplacementActif(i: number): void {
  try {
    localStorage.setItem(CLE_ACTIF, String(i))
  } catch {
    // stockage indisponible : on jouera l'emplacement 1 à la prochaine ouverture
  }
}

export interface ResumeEmplacement {
  index: number
  /** vide = aucun village ici */
  occupe: boolean
  /** jour de règne atteint, tel qu'on l'annonce au joueur */
  jour: number
  pop: number
  /** somme des niveaux de bâtiments - une mesure honnête de l'avancement */
  niveaux: number
  mode: 'bac-a-sable' | 'campagne' | null
  /** numéro d'acte (1 à 5) si la partie est une campagne */
  acte: number | null
  /** dernière fois que la partie a été jouée */
  vuLe: number | null
}

const VIDE = (index: number): ResumeEmplacement => ({
  index,
  occupe: false,
  jour: 0,
  pop: 0,
  niveaux: 0,
  mode: null,
  acte: null,
  vuLe: null,
})

/** une journée de jeu, en millisecondes réelles (doit suivre DAY_MS) */
const JOUR_MS = 8 * 60_000

/**
 * Ce qu'on peut dire d'un emplacement SANS charger la partie. On lit le JSON à
 * plat et l'on ne touche à rien : une sauvegarde d'une version future, dont on
 * ne comprendrait pas la moitié des champs, doit quand même s'afficher.
 */
export function lireResume(i: number): ResumeEmplacement {
  try {
    const brut = localStorage.getItem(cleEmplacement(i))
    if (!brut) return VIDE(i)
    const d = JSON.parse(brut) as Record<string, unknown>
    const buildings = (d.buildings ?? {}) as Record<string, { level?: number }>
    const niveaux = Object.values(buildings).reduce((a, b) => a + (b?.level ?? 0), 0)
    const createdAt = typeof d.createdAt === 'number' ? d.createdAt : null
    const lastSeen = typeof d.lastSeen === 'number' ? d.lastSeen : null
    const campagne = d.campagne as { acte?: number; fini?: boolean } | null | undefined
    return {
      index: i,
      occupe: true,
      jour: createdAt && lastSeen ? Math.max(1, Math.floor((lastSeen - createdAt) / JOUR_MS) + 1) : 1,
      pop: typeof d.pop === 'number' ? d.pop : 0,
      niveaux,
      mode: (d.mode as ResumeEmplacement['mode']) ?? 'bac-a-sable',
      acte: campagne && !campagne.fini && typeof campagne.acte === 'number' ? campagne.acte + 1 : null,
      vuLe: lastSeen,
    }
  } catch {
    // un emplacement illisible se montre quand même : le joueur doit pouvoir
    // l'effacer plutôt que de se demander pourquoi il ne s'ouvre pas
    return { ...VIDE(i), occupe: true }
  }
}

export function lireResumes(): ResumeEmplacement[] {
  return Array.from({ length: NB_EMPLACEMENTS }, (_, i) => lireResume(i))
}

export function effacerEmplacement(i: number): void {
  try {
    localStorage.removeItem(cleEmplacement(i))
  } catch {
    // rien à faire : l'emplacement restera occupé jusqu'à la prochaine tentative
  }
}

/** recopie une partie d'un emplacement vers un autre */
export function copierEmplacement(depuis: number, vers: number): boolean {
  try {
    const brut = localStorage.getItem(cleEmplacement(depuis))
    if (!brut) return false
    localStorage.setItem(cleEmplacement(vers), brut)
    return true
  } catch {
    return false
  }
}

// ── Fichier ──────────────────────────────────────────────────────────────────

/** enveloppe du fichier exporté - la version permettra de refuser un jour */
interface Fichier {
  jeu: 'palladion'
  version: 1
  exporteLe: number
  partie: unknown
}

/** nom de fichier lisible : « palladion-jour-14-2026-08-01.json » */
export function nomFichier(resume: ResumeEmplacement): string {
  const d = new Date(resume.vuLe ?? Date.now())
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `palladion-jour-${resume.jour}-${iso}.json`
}

/** le texte à écrire dans le fichier, ou null si l'emplacement est vide */
export function exporterTexte(i: number): string | null {
  try {
    const brut = localStorage.getItem(cleEmplacement(i))
    if (!brut) return null
    const f: Fichier = { jeu: 'palladion', version: 1, exporteLe: Date.now(), partie: JSON.parse(brut) }
    return JSON.stringify(f, null, 2)
  } catch {
    return null
  }
}

export type IssueImport = { ok: true } | { ok: false; raison: string }

/**
 * Écrit un fichier dans un emplacement - après l'avoir CONTRÔLÉ. On refuse tout
 * ce qui n'est pas manifestement une partie de PALLADION : remplacer un règne de
 * dix heures par le contenu d'un fichier au hasard serait la pire chose que ce
 * module puisse faire.
 */
export function importerTexte(texte: string, vers: number): IssueImport {
  let f: unknown
  try {
    f = JSON.parse(texte)
  } catch {
    return { ok: false, raison: 'Ce fichier n’est pas lisible : ce n’est pas du JSON.' }
  }
  const enveloppe = f as Partial<Fichier>
  // on accepte aussi une sauvegarde nue (contenu de localStorage), plus tolérant
  const partie = (enveloppe?.jeu === 'palladion' ? enveloppe.partie : f) as Record<string, unknown> | null
  if (!partie || typeof partie !== 'object') {
    return { ok: false, raison: 'Ce fichier ne contient pas de partie.' }
  }
  const aLesSignes =
    typeof partie.lastSeen === 'number' && typeof partie.pop === 'number' && typeof partie.resources === 'object'
  if (!aLesSignes) {
    return { ok: false, raison: 'Ce fichier n’a pas la forme d’une partie de PALLADION.' }
  }
  try {
    localStorage.setItem(cleEmplacement(vers), JSON.stringify(partie))
    return { ok: true }
  } catch {
    return { ok: false, raison: 'Le stockage du navigateur a refusé l’écriture.' }
  }
}
