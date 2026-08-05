import { BUILDINGS, GODS } from './data'
import type { BuildingId, GodId, UnitId } from './types'

/*
 * ═══════════════════ LA COLÈRE DIVINE ═══════════════════
 *
 * Un dieu maudit ne faisait qu'une chose : frapper mou. Sa bénédiction tombait à
 * ×0.4 et c'était tout. Autrement dit, l'offenser revenait à renoncer à un
 * bouton - un manque à gagner, jamais une menace. On pouvait cracher sur Poséidon
 * pendant deux heures sans que la mer bouge.
 *
 * Ici, le dieu offensé AGIT. Quatre paliers, et à chacun ses calamités, qui LUI
 * ressemblent : Zeus le ciel et les serments, Poséidon la pierre et l'eau, Athéna
 * qui retire ce qu'elle avait prêté d'intelligence, Arès qui souffle la peur dans
 * les rangs.
 *
 * Deux garde-fous, sans quoi le système serait une punition et non un risque :
 *
 *  · la colère est ÉVITABLE ET RÉPARABLE. Elle ne s'ouvre qu'à −40, très loin de
 *    l'indifférence, et un sacrifice à l'autel remonte la relation comme
 *    n'importe quand : `paliersColere` étant une pure lecture de la relation, le
 *    palier retombe à la seconde où le joueur a versé de quoi. On ne pose donc
 *    aucun verrou, aucune dette, aucun compteur de rancune - la seule chose à
 *    faire pour arrêter les calamités est celle que le jeu proposait déjà ;
 *
 *  · aucune calamité n'enchaîne DEUX FOIS SUR LA MÊME CIBLE. La dernière frappée
 *    est portée dans le snapshot et exclue du tirage suivant. Sans cela, la foudre
 *    pouvait raser le même grenier en deux coups et le joueur n'avait rien à
 *    décider - seulement à regarder. Une calamité doit déplacer le problème, pas
 *    achever une ruine.
 */

// ── Paliers ─────────────────────────────────────────────────────────────────

export interface SeuilColere {
  /** 1 à 4 */
  palier: number
  /** relation à partir de laquelle (en descendant) ce palier s'ouvre */
  seuil: number
  nom: string
  /** ce que le joueur doit comprendre du danger, en une phrase */
  desc: string
}

/**
 * Les quatre marches de la disgrâce. Elles commencent bien en dessous de
 * « Contrarié » : on ne tombe pas dedans par inadvertance, il faut avoir refusé
 * l'hospitalité, brisé des serments ou vidé le temple pendant longtemps.
 */
export const SEUILS_COLERE: SeuilColere[] = [
  {
    palier: 1,
    seuil: -40,
    nom: 'Contrariété',
    desc: 'Le dieu détourne le regard. Un signe de temps à autre, pour qu’on comprenne.',
  },
  {
    palier: 2,
    seuil: -60,
    nom: 'Colère',
    desc: 'Il frappe, et plus souvent. Ce qu’il vous avait prêté, il commence à le reprendre.',
  },
  {
    palier: 3,
    seuil: -80,
    nom: 'Courroux',
    desc: 'Il s’acharne. Les calamités se suivent de près et ne se contentent plus d’un toit.',
  },
  {
    palier: 4,
    seuil: -95,
    nom: 'Vengeance',
    desc: 'Il veut la ruine du village, et il a tout son temps.',
  },
]

/** la relation au-dessus de laquelle aucun dieu n'envoie rien */
export const SEUIL_HORS_COLERE = -40

/**
 * Palier de colère d'une relation : 0 = le dieu se tient tranquille, 4 = il veut
 * votre perte. Pure lecture - c'est ce qui rend la colère réparable d'un seul
 * sacrifice.
 */
export function paliersColere(relation: number): number {
  let p = 0
  for (const s of SEUILS_COLERE) if (relation <= s.seuil) p = s.palier
  return p
}

export function nomPalier(palier: number): string {
  return SEUILS_COLERE.find((s) => s.palier === palier)?.nom ?? 'Apaisé'
}

export function descPalier(palier: number): string {
  return SEUILS_COLERE.find((s) => s.palier === palier)?.desc ?? 'Le dieu ne vous en veut pas.'
}

/**
 * Délai avant la prochaine calamité de ce dieu. Plus il est loin, plus il revient
 * vite. Le `roll` module de ±20 % pour que le joueur ne puisse pas régler sa
 * montre sur le malheur.
 */
export function delaiProchaineCalamite(palier: number, roll = 0.5): number {
  const base = [0, 7 * 60_000, 4.5 * 60_000, 3 * 60_000, 2 * 60_000][Math.max(0, Math.min(4, palier))]
  if (base === 0) return 0
  return Math.round(base * (0.8 + 0.4 * Math.max(0, Math.min(1, roll))))
}

// ── Calamités ───────────────────────────────────────────────────────────────

/**
 * Ce que le store doit exécuter. Aucune calamité ne touche l'état ici : elles
 * décrivent, le tick applique. C'est ce qui permet de les tirer dans un test sans
 * monter une partie.
 */
export type EffetCalamite =
  /** la foudre sur un bâtiment : points de structure en moins */
  | { type: 'foudre'; batiment: BuildingId; degats: number }
  /** un allié se retourne : le pacte se rompt et la relation s'effondre */
  | { type: 'serment-rompu' }
  /** le sol tremble : part de la structure des remparts perdue */
  | { type: 'seisme'; part: number }
  /** la mer se ferme : port au ralenti et plus d'expédition maritime */
  | { type: 'mer-fermee'; jusqua: number }
  /** un bâtiment s'effondre : il retombe d'un niveau */
  | { type: 'ruine'; batiment: BuildingId }
  /** Athéna reprend son murmure : plus d'indice sur les dilemmes */
  | { type: 'sagesse-retiree'; jusqua: number }
  /** les artisans s'y prennent mal : production réduite d'une part */
  | { type: 'maladresse'; jusqua: number; part: number }
  /** les guetteurs ne voient plus : les tours tirent court */
  | { type: 'tours-aveugles'; jusqua: number; part: number }
  /** des soldats s'en vont dans la nuit */
  | { type: 'desertion'; nombre: number; unite: UnitId }
  /** la panique : le moral de bataille s'effondre plus tôt */
  | { type: 'panique'; jusqua: number; part: number }
  /** une rixe dans le village : l'ambiance chute */
  | { type: 'rixe'; delta: number }

export interface Calamite {
  /** id de la définition qui l'a produite */
  defId: string
  dieu: GodId
  nom: string
  emoji: string
  palier: number
  effet: EffetCalamite
  /** le récit pour le journal - jamais moins de deux lignes, c'est un événement */
  recit: string[]
  /**
   * Ce qui a été frappé, quand la frappe a une cible identifiable (id de
   * bâtiment, « remparts », « troupe »…). Le store le range dans l'état pour que
   * le tirage suivant l'exclue.
   */
  cibleId?: string
}

/** ce que la colère a besoin de LIRE - noms de champs alignés sur le store */
export interface SnapColere {
  now: number
  /** niveaux des bâtiments : on ne foudroie pas un terrain vague */
  buildings: Record<BuildingId, { level: number; ruine?: boolean }>
  wallHp: number
  wallMax: number
  army: Record<UnitId, number>
  /** ids des villages alliés - sans allié, aucun serment à rompre */
  alliances: string[]
  morale: number
  tours: number
  /** la dernière cible frappée, tous dieux confondus : jamais deux fois de suite */
  derniereCible: string | null
}

export interface CalamiteDef {
  id: string
  dieu: GodId
  /** palier à partir duquel elle peut tomber */
  palier: number
  nom: string
  emoji: string
  /** ce que le joueur risque, en une ligne - pour le bandeau d'alerte */
  menace: string
  poids: number
  /**
   * Compose la calamité concrète, ou rend `null` si l'état ne s'y prête pas :
   * rien à foudroyer, aucun allié à retourner, aucun soldat à faire déserter.
   * Un dieu en colère qui n'a pas de prise se tait, il n'invente pas.
   */
  fabriquer: (snap: SnapColere, roll: number, palier: number) => Calamite | null
}

/** bâtiments qu'un dieu peut frapper : debout, pas déjà en ruine, pas la dernière cible */
function ciblesBatiments(snap: SnapColere, exclure: BuildingId[] = []): BuildingId[] {
  return (Object.keys(snap.buildings) as BuildingId[]).filter(
    (b) =>
      (snap.buildings[b]?.level ?? 0) > 0 &&
      !snap.buildings[b]?.ruine &&
      b !== snap.derniereCible &&
      !exclure.includes(b),
  )
}

/** choisit dans une liste avec un roll, sans jamais sortir des bornes */
function tirerDans<T>(liste: T[], roll: number): T {
  const i = Math.min(liste.length - 1, Math.max(0, Math.floor(roll * liste.length)))
  return liste[i]
}

/**
 * Enveloppe une calamité de son identité. On relit la définition par son id
 * plutôt que de la fermer dans la portée : les `fabriquer` vivent DANS le tableau
 * qu'ils devraient citer, et une référence par index se décale à la première
 * calamité qu'on insère au milieu.
 */
function base(defId: string, palier: number, effet: EffetCalamite, recit: string[], cibleId?: string): Calamite {
  const d = CALAMITE_PAR_ID[defId]
  return { defId, dieu: d.dieu, nom: d.nom, emoji: d.emoji, palier, effet, recit, cibleId }
}

/** les douze calamités, trois par Olympien - le miroir sombre de l'arbre de faveur */
export const CALAMITES: CalamiteDef[] = [
  // ── Zeus : le ciel et la loi ───────────────────────────────────────────────
  {
    id: 'zeus-foudre',
    dieu: 'zeus',
    palier: 1,
    nom: 'La foudre',
    emoji: '⚡',
    menace: 'un de vos toits foudroyé',
    poids: 3,
    fabriquer: (snap, roll, palier) => {
      const cibles = ciblesBatiments(snap, ['remparts'])
      if (cibles.length === 0) return null
      const b = tirerDans(cibles, roll)
      const degats = [0, 25, 40, 60, 85][palier] ?? 25
      const nom = BUILDINGS[b]?.nom ?? b
      return base(
        'zeus-foudre',
        palier,
        { type: 'foudre', batiment: b, degats },
        [
          `Le ciel s’est ouvert sans un nuage et la foudre est tombée sur ${nom}.`,
          `La charpente a cédé sur ${degats} points de structure. Personne n’a crié : tout le monde a compris.`,
        ],
        b,
      )
    },
  },
  {
    id: 'zeus-serment',
    dieu: 'zeus',
    palier: 2,
    nom: 'Le serment rompu',
    emoji: '🤝',
    menace: 'un allié qui se retourne',
    poids: 2,
    fabriquer: (snap, _roll, palier) => {
      if (snap.alliances.length === 0) return null
      return base(
        'zeus-serment',
        palier,
        { type: 'serment-rompu' },
        [
          'Le gardien des serments a délié ceux qu’on vous avait faits.',
          'Un de vos alliés a renvoyé vos présents et ne reconnaît plus le pacte. Le tribut ne viendra plus.',
        ],
        'allie',
      )
    },
  },
  {
    id: 'zeus-effondrement',
    dieu: 'zeus',
    palier: 3,
    nom: 'Le toit qui cède',
    emoji: '🏚️',
    menace: 'un bâtiment qui retombe d’un niveau',
    poids: 1,
    fabriquer: (snap, roll, palier) => {
      const cibles = ciblesBatiments(snap, ['agora', 'remparts']).filter((b) => snap.buildings[b].level > 1)
      if (cibles.length === 0) return null
      const b = tirerDans(cibles, roll)
      const nom = BUILDINGS[b]?.nom ?? b
      return base(
        'zeus-effondrement',
        palier,
        { type: 'ruine', batiment: b },
        [
          `${nom} s’est affaissé dans la nuit, sans secousse, sans vent.`,
          'Il faudra tout relever d’un niveau. Les vieux disent qu’il ne fallait pas fermer la porte aux suppliants.',
        ],
        b,
      )
    },
  },
  // ── Poséidon : la pierre et la mer ────────────────────────────────────────
  {
    id: 'poseidon-seisme',
    dieu: 'poseidon',
    palier: 1,
    nom: 'Le séisme',
    emoji: '🌍',
    menace: 'vos remparts fissurés',
    poids: 3,
    fabriquer: (snap, _roll, palier) => {
      if (snap.wallHp <= 1) return null
      const part = [0, 0.08, 0.13, 0.2, 0.28][palier] ?? 0.08
      return base(
        'poseidon-seisme',
        palier,
        { type: 'seisme', part },
        [
          'La terre a bougé deux fois, brièvement, et la poussière est montée de tout le mur d’enceinte.',
          `L’appareil s’est disjoint sur ${Math.round(part * 100)} % de sa solidité. L’Ébranleur du sol n’a même pas eu besoin de la mer.`,
        ],
        'remparts',
      )
    },
  },
  {
    id: 'poseidon-mer',
    dieu: 'poseidon',
    palier: 2,
    nom: 'La mer fermée',
    emoji: '🌊',
    menace: 'la mer close et le port au ralenti',
    poids: 2,
    fabriquer: (snap, _roll, palier) => {
      if ((snap.buildings.port?.level ?? 0) <= 0) return null
      const duree = ([0, 3, 5, 8, 12][palier] ?? 3) * 60_000
      return base(
        'poseidon-mer',
        palier,
        { type: 'mer-fermee', jusqua: snap.now + duree },
        [
          'La houle s’est levée d’un coup et n’est pas retombée. Aucune quille ne sortira.',
          `Le port tourne au ralenti et les îles sont hors d’atteinte pour ${Math.round(duree / 60_000)} minutes.`,
        ],
        'mer',
      )
    },
  },
  {
    id: 'poseidon-quais',
    dieu: 'poseidon',
    palier: 3,
    nom: 'Les quais brisés',
    emoji: '⚓',
    menace: 'le port emporté',
    poids: 1,
    fabriquer: (snap, _roll, palier) => {
      if ((snap.buildings.port?.level ?? 0) <= 1 || snap.buildings.port?.ruine) return null
      return base(
        'poseidon-quais',
        palier,
        { type: 'ruine', batiment: 'port' },
        [
          'Une vague est entrée dans le bassin par le travers et a emporté la moitié des appontements.',
          'Le port est à relever. On a retrouvé les cordages accrochés aux oliviers.',
        ],
        'port',
      )
    },
  },
  // ── Athéna : ce qu'elle avait prêté d'intelligence ────────────────────────
  {
    id: 'athena-sagesse',
    dieu: 'athena',
    palier: 1,
    nom: 'La sagesse retirée',
    emoji: '🦉',
    menace: 'les dilemmes qui ne murmurent plus',
    poids: 3,
    fabriquer: (snap, _roll, palier) => {
      const duree = ([0, 4, 7, 11, 16][palier] ?? 4) * 60_000
      return base(
        'athena-sagesse',
        palier,
        { type: 'sagesse-retiree', jusqua: snap.now + duree },
        [
          'La chouette a quitté le fronton du temple et personne ne l’a vue partir.',
          `Plus un conseil, plus un pressentiment : vous trancherez à l’aveugle pendant ${Math.round(duree / 60_000)} minutes.`,
        ],
        'sagesse',
      )
    },
  },
  {
    id: 'athena-maladresse',
    dieu: 'athena',
    palier: 2,
    nom: 'La main gauche',
    emoji: '⚱️',
    menace: 'vos artisans qui gâchent l’ouvrage',
    poids: 2,
    fabriquer: (snap, _roll, palier) => {
      // gâcher l'ouvrage suppose un atelier : sur un terrain vague, la déesse n'a rien à retirer
      const ateliers = (['ferme', 'scierie', 'carriere', 'forge', 'port'] as BuildingId[]).some(
        (b) => (snap.buildings[b]?.level ?? 0) > 0,
      )
      if (!ateliers) return null
      const duree = ([0, 3, 5, 8, 12][palier] ?? 3) * 60_000
      const part = [0, 0.12, 0.18, 0.25, 0.35][palier] ?? 0.12
      return base(
        'athena-maladresse',
        palier,
        { type: 'maladresse', jusqua: snap.now + duree, part },
        [
          'Les moules ont fendu à la forge, les scies ont mordu de travers, deux jarres se sont brisées à vide.',
          `La déesse des artisans a retiré sa main : −${Math.round(part * 100)} % sur tout ce qu’on produit, ${Math.round(duree / 60_000)} minutes durant.`,
        ],
        'ateliers',
      )
    },
  },
  {
    id: 'athena-guet',
    dieu: 'athena',
    palier: 3,
    nom: 'Le guet aveugle',
    emoji: '🌫️',
    menace: 'vos tours qui tirent court',
    poids: 1,
    fabriquer: (snap, _roll, palier) => {
      if (snap.tours <= 0) return null
      const duree = ([0, 3, 5, 8, 12][palier] ?? 3) * 60_000
      const part = [0, 0.15, 0.22, 0.3, 0.4][palier] ?? 0.15
      return base(
        'athena-guet',
        palier,
        { type: 'tours-aveugles', jusqua: snap.now + duree, part },
        [
          'Une brume basse s’est couchée sur l’enceinte, et elle ne suit pas le vent.',
          `Les archers des tours ne distinguent plus la plaine : −${Math.round(part * 100)} % de portée pendant ${Math.round(duree / 60_000)} minutes.`,
        ],
        'tours',
      )
    },
  },
  // ── Arès : la peur dans les rangs ─────────────────────────────────────────
  {
    id: 'ares-desertion',
    dieu: 'ares',
    palier: 1,
    nom: 'La désertion',
    emoji: '🏃',
    menace: 'des soldats qui s’en vont dans la nuit',
    poids: 3,
    fabriquer: (snap, roll, palier) => {
      const dispo = (Object.keys(snap.army) as UnitId[]).filter((u) => (snap.army[u] ?? 0) > 0)
      if (dispo.length === 0) return null
      const u = tirerDans(dispo, roll)
      const part = [0, 0.1, 0.16, 0.24, 0.34][palier] ?? 0.1
      const nombre = Math.max(1, Math.round((snap.army[u] ?? 0) * part))
      return base(
        'ares-desertion',
        palier,
        { type: 'desertion', nombre, unite: u },
        [
          `${nombre} homme${nombre > 1 ? 's' : ''} ont plié leur paquetage avant l’aube.`,
          'Ils ont dit que le dieu de la guerre ne marchait plus avec vous, et qu’ils n’avaient pas envie de mourir pour rien.',
        ],
        'troupe',
      )
    },
  },
  {
    id: 'ares-panique',
    dieu: 'ares',
    palier: 2,
    nom: 'La panique',
    emoji: '😱',
    menace: 'vos lignes qui rompent trop tôt',
    poids: 2,
    fabriquer: (snap, _roll, palier) => {
      // une panique dans une caserne vide n'est pas une calamité, c'est un décor
      if ((Object.keys(snap.army) as UnitId[]).every((u) => (snap.army[u] ?? 0) <= 0)) return null
      const duree = ([0, 4, 6, 9, 14][palier] ?? 4) * 60_000
      const part = [0, 0.12, 0.2, 0.28, 0.4][palier] ?? 0.12
      return base(
        'ares-panique',
        palier,
        { type: 'panique', jusqua: snap.now + duree, part },
        [
          'Un cri sans cause a couru la caserne à deux heures du matin. On a mis longtemps à rallumer les lampes.',
          `Vos hommes rompront plus tôt : −${Math.round(part * 100)} % de moral en bataille pendant ${Math.round(duree / 60_000)} minutes.`,
        ],
        'moral-bataille',
      )
    },
  },
  {
    id: 'ares-rixe',
    dieu: 'ares',
    palier: 3,
    nom: 'La rixe',
    emoji: '🩸',
    menace: 'le sang versé entre les vôtres',
    poids: 1,
    fabriquer: (snap, _roll, palier) => {
      if (snap.morale <= 5) return null
      const delta = -([0, 8, 12, 18, 25][palier] ?? 8)
      return base(
        'ares-rixe',
        palier,
        { type: 'rixe', delta },
        [
          'Deux familles se sont battues sur la place pour une histoire de bornes. Il y a eu du sang, et il y aura des comptes.',
          `L’ambiance du village tombe de ${Math.abs(delta)} points. Le dieu du carnage a eu sa part, faute de guerre.`,
        ],
        'ambiance',
      )
    },
  },
]

export const CALAMITE_PAR_ID: Record<string, CalamiteDef> = Object.fromEntries(CALAMITES.map((c) => [c.id, c]))

/** ce que ce dieu peut envoyer à ce palier - pour dire au joueur ce qu'il risque */
export function calamitesPossibles(dieu: GodId, palier: number): CalamiteDef[] {
  return CALAMITES.filter((c) => c.dieu === dieu && c.palier <= palier)
}

/**
 * Tire la calamité que ce dieu envoie, ou `null` s'il n'a aucune prise sur l'état.
 *
 * Le tirage est pondéré (les frappes lourdes restent rares) puis, si la
 * candidate désignée ne peut pas se fabriquer - rien à foudroyer, plus d'allié,
 * la même cible que la dernière fois - on essaie les suivantes dans l'ordre.
 * Ainsi un dieu ne se tait que s'il n'avait VRAIMENT rien à frapper, et jamais
 * parce que le hasard a mal tourné.
 */
export function tirerCalamite(dieu: GodId, palier: number, snap: SnapColere, roll: number): Calamite | null {
  if (palier <= 0) return null
  const pool = calamitesPossibles(dieu, palier)
  if (pool.length === 0) return null
  const r = Math.max(0, Math.min(0.999999, roll))
  const total = pool.reduce((a, c) => a + c.poids, 0)
  let v = r * total
  let debut = 0
  for (let i = 0; i < pool.length; i++) {
    v -= pool[i].poids
    if (v <= 0) {
      debut = i
      break
    }
  }
  // second roll dérivé : la cible ne doit pas être corrélée au choix de la calamité
  const rollCible = (r * 7.3891 + 0.5772) % 1
  for (let k = 0; k < pool.length; k++) {
    const def = pool[(debut + k) % pool.length]
    const c = def.fabriquer(snap, rollCible, palier)
    if (!c) continue
    // la règle « jamais deux fois de suite la même cible » est tenue ICI, une
    // seule fois, plutôt que redite dans chacune des douze fabriques
    if (c.cibleId && c.cibleId === snap.derniereCible) continue
    return c
  }
  return null
}

/**
 * Le bandeau d'alerte en une phrase : qui est en colère, à quel point, et ce
 * qu'il faut faire. On nomme toujours le remède - une menace sans issue n'est
 * pas une mécanique de jeu.
 */
export function resumeColere(dieu: GodId, relation: number): string | null {
  const p = paliersColere(relation)
  if (p === 0) return null
  const d = GODS[dieu]
  return `${d.emoji} ${d.nom} - ${nomPalier(p)} (${Math.round(relation)}). ${descPalier(p)} Un sacrifice à son autel le calme.`
}
