import { METIERS, NOMS_VILLAGEOIS } from './data'
import { AGE_ADULTE, AGE_ANCIEN, AGE_FRAGILE, ageDe, ligneeLibre, risqueDeMort } from './lignees'
import type { BuildingId, GodId, Villageois } from './types'

/*
 * ═══════════════════════ LES SUCCESSIONS ═══════════════════════
 *
 * Le joueur était une abstraction. Le village avait des habitants nommés, des
 * maisons, des noces, des enterrements - et personne au sommet : les ordres
 * venaient de nulle part, et la fin d'un règne ne pouvait être qu'une
 * abdication volontaire.
 *
 * Il a désormais UN CHEF. Il porte un nom, une maison, un âge, et DEUX TRAITS
 * qui changent la façon de jouer. Il vieillit comme tout le monde - deux ans par
 * journée de jeu - et il meurt. À sa mort, le trône est VACANT : on choisit un
 * héritier parmi les adultes des lignées du village, et chacun porte ses propres
 * traits. Le règne ne s'arrête pas ; il change de main, et de tempérament.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUATRE DÉCISIONS DE CONCEPTION, ET CE QU'ELLES ÉVITENT.
 *
 * 1. LE CHEF N'EST PAS DANS `villageois`, ET NE COMPTE PAS DANS `pop`.
 *    C'est la seule façon d'échapper au piège de `syncVillageois`, qui tourne à
 *    chaque battement et recomplète la liste jusqu'à `pop` en retirant « d'abord
 *    les oisifs ». Un chef rangé parmi les habitants aurait été effacé par cette
 *    boucle à la première rétrogradation d'atelier, sans un mot.
 *    Conséquence VOULUE : couronner un héritier RETIRE un habitant du village -
 *    un bras, et son métier. On choisit donc quel métier on accepte de perdre,
 *    et c'est l'arbitrage central du panneau.
 *
 * 2. LA MORT OUVRE UNE VACANCE, ELLE N'INTRONISE PERSONNE.
 *    Le successeur ne peut pas être tiré au sort : « un héritier CHOISI parmi les
 *    lignées » est la demande, et c'est aussi ce qui rend la mort intéressante
 *    plutôt que subie. Cela règle du même coup le rattrapage hors ligne : huit
 *    heures d'absence avancent le calendrier de soixante journées, soit cent
 *    vingt ans - le chef meurt forcément. S'il fallait introniser sur-le-champ,
 *    le joueur serait revenu devant un inconnu sur le trône. Il revient devant un
 *    trône VIDE et devant ses candidats : le moment devient un rendez-vous.
 *
 * 3. LA VACANCE COÛTE, MAIS NE TUE PAS.
 *    Sans prix, on la laisserait ouverte pour toujours et le système n'existerait
 *    plus. Avec un prix mortel, une absence d'une nuit ruinerait un règne. Elle
 *    pèse donc sur l'ambiance et sur la production, proportionnellement à sa
 *    durée, et plafonne : un village sans chef s'étiole, il ne s'effondre pas.
 *
 * 4. LES TRAITS SE DÉDUISENT DE L'IDENTITÉ, ILS NE SE STOCKENT PAS DEUX FOIS.
 *    Un candidat n'est pas un objet à sauvegarder : c'est un habitant, et ses
 *    traits sortent de son `id` par un tirage stable. La liste des candidats
 *    n'est donc jamais persistée - elle se recalcule à l'ouverture du panneau.
 *    C'est ce qui empêche la surface d'état d'enfler, et c'est ce qui garantit
 *    qu'un candidat montré est toujours un habitant qui existe ENCORE : une
 *    liste figée aurait proposé des morts après une épidémie.
 */

// ── Les traits ───────────────────────────────────────────────────────────────

/**
 * Ce qu'un chef change au règne. Les noms sont ceux que le store additionne
 * déjà - un trait est un terme de plus dans une somme existante, jamais une
 * branche nouvelle. Sept canaux, pas quatorze : un chef doit se RÉSUMER en deux
 * phrases, sinon le joueur ne peut pas choisir entre deux héritiers.
 */
export interface EffetsChef {
  grainPct: number
  murPct: number
  degatsPct: number
  butinPct: number
  /** durée de formation des recrues, EN MOINS */
  recruesPct: number
  faveurPct: number
  /** modificateur d'ambiance permanent tant qu'il règne */
  morale: number
  /** ce dieu le regarde d'un meilleur œil - ou d'un plus mauvais */
  relation: Partial<Record<GodId, number>>
}

export const CHEF_NEUTRE: EffetsChef = {
  grainPct: 0,
  murPct: 0,
  degatsPct: 0,
  butinPct: 0,
  recruesPct: 0,
  faveurPct: 0,
  morale: 0,
  relation: {},
}

export interface TraitDef {
  id: string
  nom: string
  emoji: string
  /** ce que le trait dit de l'homme, pas de ses chiffres */
  desc: string
  /** l'effet en une ligne, pour la carte du candidat */
  effet: string
  bonus: Partial<EffetsChef>
}

/*
 * Douze traits, et aucun n'est purement bon. C'est la règle de ce tableau : un
 * chef dont les deux traits seraient des cadeaux ferait de la succession une
 * loterie qu'on relance, et non un choix qu'on assume. Chacun donne d'un côté et
 * retire de l'autre, ou ne donne qu'à une condition.
 */
export const TRAITS: TraitDef[] = [
  {
    id: 'batisseur',
    nom: 'Bâtisseur',
    emoji: '🧱',
    desc: 'Il a grandi sur les chantiers de son père et sait ce que coûte une assise mal posée. Il regarde les murs avant les hommes.',
    effet: 'Structure des remparts +12 %, mais dégâts de l’armée −6 %',
    bonus: { murPct: 0.12, degatsPct: -0.06 },
  },
  {
    id: 'guerrier',
    nom: 'Homme de guerre',
    emoji: '🗡️',
    desc: 'Il a pris sa première lance à quinze ans et n’a jamais aimé qu’on lui parle de greniers.',
    effet: 'Dégâts de l’armée +14 %, mais récoltes −7 %',
    bonus: { degatsPct: 0.14, grainPct: -0.07 },
  },
  {
    id: 'laboureur',
    nom: 'Fils de la terre',
    emoji: '🌾',
    desc: 'Il connaît chaque sillon par son nom et le dit à qui veut l’entendre. Les greniers pleins sont sa seule vanité.',
    effet: 'Récoltes +14 %, mais butin d’expédition −12 %',
    bonus: { grainPct: 0.14, butinPct: -0.12 },
  },
  {
    id: 'pieux',
    nom: 'Pieux',
    emoji: '🙏',
    desc: 'Il ne tranche rien sans avoir consulté l’autel, ce que les uns nomment sagesse et les autres lenteur.',
    effet: 'Faveur +18 %, tous les Olympiens +6 - mais formation des recrues −10 %',
    bonus: {
      faveurPct: 0.18,
      recruesPct: -0.1,
      relation: { zeus: 6, poseidon: 6, athena: 6, ares: 6 },
    },
  },
  {
    id: 'impie',
    nom: 'Impie',
    emoji: '⚡',
    desc: 'Il dit tout haut que les dieux n’ont jamais rebâti un mur. Le village l’écoute et frissonne.',
    effet: 'Récoltes +10 % et dégâts +8 % - mais Zeus et Athéna −14',
    bonus: { grainPct: 0.1, degatsPct: 0.08, relation: { zeus: -14, athena: -14 } },
  },
  {
    id: 'aime',
    nom: 'Aimé du peuple',
    emoji: '🫂',
    desc: 'On l’a vu porter des sacs avec les autres avant qu’il ne porte le sceptre, et personne ne l’a oublié.',
    effet: 'Ambiance +8 en permanence, mais Arès −10 : il déteste les tendres',
    bonus: { morale: 8, relation: { ares: -10 } },
  },
  {
    id: 'dur',
    nom: 'Main dure',
    emoji: '⛓️',
    desc: 'Il fait tenir les postes et les serments sans lever la voix, et l’on ne discute pas deux fois.',
    effet: 'Recrues −22 % de formation, mais ambiance −7',
    bonus: { recruesPct: 0.22, morale: -7 },
  },
  {
    id: 'pillard',
    nom: 'Pillard',
    emoji: '🏴‍☠️',
    desc: 'Il a compris jeune qu’une saison de razzia rapporte plus que trois de moisson, et il n’en a pas changé.',
    effet: 'Butin d’expédition +25 %, mais ambiance −5 et Zeus −8',
    bonus: { butinPct: 0.25, morale: -5, relation: { zeus: -8 } },
  },
  {
    id: 'prudent',
    nom: 'Prudent',
    emoji: '🛡️',
    desc: 'Il a vu tomber un mur dans son enfance et n’a plus jamais trouvé une enceinte assez haute.',
    effet: 'Structure des remparts +18 %, mais butin −10 % et récoltes −4 %',
    bonus: { murPct: 0.18, butinPct: -0.1, grainPct: -0.04 },
  },
  {
    id: 'prodigue',
    nom: 'Prodigue',
    emoji: '🍷',
    desc: 'Il tient table ouverte et le village l’adore pour cela. Les greniers, eux, s’en souviennent l’hiver.',
    effet: 'Ambiance +12, mais récoltes −12 %',
    bonus: { morale: 12, grainPct: -0.12 },
  },
  {
    id: 'maladif',
    nom: 'De santé fragile',
    emoji: '🩹',
    desc: 'Il a toujours toussé. Son père disait qu’il ne verrait pas trente ans, et son père s’est trompé - jusqu’ici.',
    effet: 'Il vieillit deux fois plus vite : son règne sera court',
    bonus: { morale: -3 },
  },
  {
    id: 'longevif',
    nom: 'Noué de chêne',
    emoji: '🌳',
    desc: 'Trois de ses frères sont morts avant lui et il n’a pas même une cicatrice. Le village y voit un signe.',
    effet: 'Il vieillit deux fois moins vite : son règne sera long',
    bonus: { morale: 3 },
  },
]

export const TRAITS_PAR_ID: Record<string, TraitDef> = Object.fromEntries(TRAITS.map((t) => [t.id, t]))

/**
 * Les deux traits qui vieillissent le chef autrement. Ils sont nommés ici plutôt
 * que portés par un champ d'`EffetsChef` : leur effet n'est pas un pourcentage
 * ajouté à une somme, c'est un facteur sur le TEMPS, et il ne se lit qu'à un seul
 * endroit - la mortalité. Un champ dans `EffetsChef` aurait laissé croire qu'il
 * se cumule avec le reste.
 */
export const TRAIT_COURT = 'maladif'
export const TRAIT_LONG = 'longevif'

/** ce que valent les traits d'un chef, cumulés */
export function effetsChef(traits: string[] | undefined): EffetsChef {
  if (!traits || traits.length === 0) return CHEF_NEUTRE
  const out: EffetsChef = { ...CHEF_NEUTRE, relation: {} }
  for (const id of traits) {
    const t = TRAITS_PAR_ID[id]
    if (!t) continue
    out.grainPct += t.bonus.grainPct ?? 0
    out.murPct += t.bonus.murPct ?? 0
    out.degatsPct += t.bonus.degatsPct ?? 0
    out.butinPct += t.bonus.butinPct ?? 0
    out.recruesPct += t.bonus.recruesPct ?? 0
    out.faveurPct += t.bonus.faveurPct ?? 0
    out.morale += t.bonus.morale ?? 0
    for (const [g, n] of Object.entries(t.bonus.relation ?? {}) as [GodId, number][]) {
      out.relation[g] = (out.relation[g] ?? 0) + n
    }
  }
  return out
}

// ── Le chef et sa dynastie ───────────────────────────────────────────────────

export interface Chef {
  nom: string
  /** sa maison - celle dont il est issu, et qui règne avec lui */
  lignee: string
  /**
   * Jour de jeu de sa naissance. Son âge s'en déduit exactement comme celui d'un
   * habitant (`ageDe`), et pour la même raison : aucun compteur à faire tourner,
   * donc rien à décaler dans le bloc de vitesse du tick.
   */
  neLe: number
  /** jour où il a pris le sceptre */
  depuis: number
  /** ses deux traits, par id */
  traits: string[]
  /** son métier d'avant, s'il fut un habitant - le fondateur n'en a pas */
  metier?: BuildingId
}

/** un chef passé, pour la chronique et pour le prestige du règne */
export interface ChefPasse {
  nom: string
  lignee: string
  /** journées de jeu régnées */
  jours: number
  /** son âge à sa mort */
  mortA: number
}

export interface Dynastie {
  chef: Chef | null
  /**
   * Le trône est vide depuis cette journée. Les CANDIDATS n'y sont pas : ils se
   * recalculent depuis les habitants à l'ouverture du panneau, sinon une liste
   * figée finirait par proposer des morts.
   */
  vacanceDepuis: number | null
  /** les chefs d'avant, du plus ancien au plus récent - borné, voir MEMOIRE_MAX */
  passes: ChefPasse[]
}

/**
 * Un règne voit passer trois générations, donc trois ou quatre chefs. On en
 * retient douze : de quoi couvrir une partie très longue sans qu'une liste
 * sauvegardée puisse enfler indéfiniment.
 */
export const MEMOIRE_MAX = 12

export const DYNASTIE_VIDE: Dynastie = { chef: null, vacanceDepuis: null, passes: [] }

// ── Le tirage des traits ─────────────────────────────────────────────────────

/**
 * Un hachage stable d'une chaîne. Il n'a pas à être bon en cryptographie : il
 * doit seulement rendre TOUJOURS le même nombre pour le même identifiant, afin
 * que les traits d'un candidat ne changent pas entre deux ouvertures du panneau.
 * C'est pour cela qu'on ne tire pas au sort ici : un `Math.random()` aurait fait
 * danser les traits sous les yeux du joueur pendant qu'il compare.
 */
function empreinte(cle: string): number {
  let h = 2166136261
  for (let i = 0; i < cle.length; i++) {
    h ^= cle.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/*
 * DEUX TRAITS QUI SE CONTREDISENT NE FONT PAS UN HOMME.
 *
 * Le premier jet ne garantissait que la DISTINCTION des deux traits, et cela ne
 * suffisait pas : la première capture du panneau montrait une prétendante
 * « Noué de chêne - il vieillit deux fois moins vite » ET « De santé fragile -
 * il vieillit deux fois plus vite ». Les deux ids étaient bien différents, la
 * carte était absurde, et `risqueDuChef` tranchait en silence pour le maladif -
 * le joueur lisait donc une promesse qui n'était pas tenue.
 *
 * Ce défaut n'était pas visible en test : les deux assertions qui comptaient
 * (« deux traits », « jamais le même deux fois ») passaient. Il a fallu REGARDER
 * l'image.
 */
const INCOMPATIBLES: [string, string][] = [
  // l'un allonge la vie, l'autre la raccourcit
  [TRAIT_COURT, TRAIT_LONG],
  // l'un honore tous les Olympiens, l'autre dit tout haut qu'ils sont inutiles
  ['pieux', 'impie'],
]

function seContredisent(a: string, b: string): boolean {
  return INCOMPATIBLES.some(([x, y]) => (a === x && b === y) || (a === y && b === x))
}

/** les deux traits que porte cette identité - stables, distincts, et cohérents */
export function traitsDe(cle: string): string[] {
  const h = empreinte(cle)
  const a = h % TRAITS.length
  // le second est décalé d'un pas premier avec la longueur du tableau : il ne
  // peut donc jamais retomber sur le premier, quelle que soit l'empreinte
  const pas = 1 + ((h >>> 8) % (TRAITS.length - 1))
  let b = (a + pas) % TRAITS.length
  /*
   * Et l'on avance jusqu'à un second trait qui ne contredise pas le premier. La
   * boucle est bornée par la longueur du tableau : elle finit toujours, puisque
   * chaque trait n'a au plus qu'un seul contraire.
   */
  for (let n = 0; n < TRAITS.length && (b === a || seContredisent(TRAITS[a].id, TRAITS[b].id)); n++) {
    b = (b + 1) % TRAITS.length
  }
  return [TRAITS[a].id, TRAITS[b].id]
}

// ── La succession ────────────────────────────────────────────────────────────

/** un prétendant au sceptre, tel que le panneau le montre */
export interface Candidat {
  id: string
  nom: string
  lignee: string
  age: number
  metier: BuildingId
  /** libellé du métier, déjà résolu : le panneau n'a pas à connaître la table */
  metierNom: string
  traits: string[]
  /** il est du sang du chef défunt - son fils, son neveu */
  duSang: boolean
}

/**
 * L'âge au-delà duquel on ne couronne plus. Un ancien de soixante-dix ans ferait
 * un règne de trois minutes, et l'on rouvrirait la vacance aussitôt : ce n'est
 * pas un choix, c'est une corvée.
 */
export const AGE_MAX_HERITIER = AGE_ANCIEN

/** combien de prétendants on présente. Trois : assez pour choisir, assez peu pour lire. */
export const CANDIDATS_MAX = 3

/**
 * Les prétendants, dans l'ordre où le village les reconnaîtrait : le sang du
 * chef d'abord, puis les autres maisons, et à âge égal le plus jeune - un long
 * règne vaut mieux qu'un court.
 *
 * On ne présente QUE des adultes qui ne sont pas des anciens : c'est la même
 * borne que pour porter les armes, et pour la même raison.
 */
export function candidats(
  villageois: Villageois[],
  jour: number,
  ligneeDuChef: string | null,
): Candidat[] {
  const eligibles = villageois.filter((v) => {
    const age = ageDe(v, jour)
    return age >= AGE_ADULTE && age < AGE_MAX_HERITIER
  })
  const notes = eligibles.map((v) => {
    const duSang = ligneeDuChef !== null && v.lignee === ligneeDuChef
    return {
      v,
      duSang,
      age: ageDe(v, jour),
    }
  })
  notes.sort((a, b) => {
    if (a.duSang !== b.duSang) return a.duSang ? -1 : 1
    return a.age - b.age
  })
  return notes.slice(0, CANDIDATS_MAX).map(({ v, duSang, age }) => ({
    id: v.id,
    nom: v.nom,
    lignee: v.lignee ?? 'sans maison',
    age,
    metier: v.metier,
    metierNom: METIERS[v.metier] ?? v.metier,
    traits: traitsDe(v.id),
    duSang,
  }))
}

/**
 * Le risque que le chef meure dans la journée.
 *
 * Il part de la mortalité commune (`risqueDeMort`) et la corrige de son
 * tempérament. On corrige l'ÂGE et non la probabilité : c'est ce qui rend le trait
 * lisible (« son règne sera court ») au lieu d'un pourcentage abstrait, et cela
 * évite qu'un modificateur de probabilité rende la mort certaine avant l'âge
 * limite.
 *
 * ⚠️ MAIS SEULEMENT LA PART D'ÂGE AU-DELÀ DE LA FRAGILITÉ, et c'est la correction
 * qui compte. Le premier jet multipliait l'âge ENTIER : le noué de chêne à 0,6
 * n'atteignait donc l'âge limite qu'à cent quarante-sept ans réels, soit
 * soixante-treize journées de jeu - il était immortel en pratique, et son trait
 * cessait d'être un pari pour devenir une fin de la succession. En ne corrigeant
 * que les années de vieillesse, le noué de chêne meurt vers cent quatre ans et le
 * maladif vers quatre-vingts : un écart qui se joue, et personne n'échappe à la
 * mort.
 */
export function risqueDuChef(chef: Chef, jour: number): number {
  const age = ageDe(chef, jour)
  if (age < AGE_FRAGILE) return 0
  const facteur = chef.traits.includes(TRAIT_COURT) ? 1.5 : chef.traits.includes(TRAIT_LONG) ? 0.6 : 1
  return risqueDeMort(Math.round(AGE_FRAGILE + (age - AGE_FRAGILE) * facteur))
}

/** l'âge du chef, en années - la même horloge que celle des habitants */
export function ageDuChef(chef: Chef, jour: number): number {
  return ageDe(chef, jour)
}

// ── L'interrègne ─────────────────────────────────────────────────────────────

/**
 * Ce que coûte un trône vide, par journée de vacance : l'ambiance d'abord - un
 * village sans chef murmure - puis les récoltes, parce que personne ne répartit
 * les corvées.
 */
export const INTERREGNE_MORALE_PAR_JOUR = 6
export const INTERREGNE_GRAIN_PAR_JOUR = 0.08

/**
 * Et le plafond, qui est la moitié de la règle. Sans lui, une nuit d'absence
 * suffirait à ruiner un règne : soixante journées de vacance ôteraient trois
 * cent soixante d'ambiance. Avec lui, un village sans chef s'étiole et attend.
 */
export const INTERREGNE_MORALE_MAX = 24
export const INTERREGNE_GRAIN_MAX = 0.3

export interface CoutInterregne {
  jours: number
  morale: number
  /** part de récolte perdue, entre 0 et INTERREGNE_GRAIN_MAX */
  grainPct: number
}

export function coutInterregne(vacanceDepuis: number | null, jour: number): CoutInterregne {
  if (vacanceDepuis === null) return { jours: 0, morale: 0, grainPct: 0 }
  const jours = Math.max(0, jour - vacanceDepuis)
  return {
    jours,
    morale: -Math.min(INTERREGNE_MORALE_MAX, jours * INTERREGNE_MORALE_PAR_JOUR),
    grainPct: -Math.min(INTERREGNE_GRAIN_MAX, jours * INTERREGNE_GRAIN_PAR_JOUR),
  }
}

// ── La fondation ─────────────────────────────────────────────────────────────

/**
 * Le premier chef, celui qui n'est l'héritier de personne.
 *
 * ═══ IL N'A AUCUN TRAIT, ET C'EST LE POINT ═══
 *
 * Le premier jet lui en tirait deux, comme à tout héritier. Trois raisons de ne
 * pas le faire, et la première suffirait :
 *
 *  · LE DÉFI DE LA SEMAINE repose sur une graine partagée - même Troade, mêmes
 *    vagues, mêmes dilemmes pour tous, donc des scores comparables. Un fondateur
 *    aux traits tirés au sort aurait donné à l'un « Fils de la terre » et à
 *    l'autre « Impie », et le classement n'aurait plus rien voulu dire.
 *  · LE JEU COMMENCE PAR UNE LEÇON. Faire débuter le joueur avec des récoltes à
 *    −12 % ou Zeus à −14 sans qu'il ait rien choisi, c'est le punir d'un tirage.
 *  · LA PREMIÈRE SUCCESSION DEVIENT UN ÉVÉNEMENT. Le fondateur est la référence
 *    plate ; le jour où il meurt, le règne prend pour la première fois un
 *    tempérament, et le joueur le SENT parce qu'il a connu la mesure d'avant.
 *
 * `jour` est obligatoire et sans valeur par défaut, et c'est délibéré : une
 * sauvegarde antérieure à ce système n'a pas de dynastie, et si `init` avait fondé
 * son chef au jour 1 d'un village qui est au jour quarante, ce chef serait né cent
 * vingt ans plus tôt - donc mort au premier battement, et le joueur se serait
 * réveillé en interrègne sans avoir rien fait. En exiger le jour force l'appelant
 * à répondre à la question.
 */
export function fonderChef(tirage: number, jour: number, ligneesPrises: string[] = []): Chef {
  const nom = NOMS_VILLAGEOIS[Math.floor(tirage * NOMS_VILLAGEOIS.length) % NOMS_VILLAGEOIS.length]
  const lignee = ligneeLibre(ligneesPrises, tirage)
  return {
    nom,
    lignee,
    // trente-deux ans : dans la force de l'âge, et loin de la mortalité
    neLe: jour - 16,
    depuis: jour,
    traits: [],
  }
}

/** le résumé d'un règne, pour la chronique */
export function resumeChef(chef: Chef, jour: number): string {
  const t = chef.traits.map((id) => TRAITS_PAR_ID[id]?.nom).filter(Boolean)
  return `${chef.nom} des ${chef.lignee}, ${ageDuChef(chef, jour)} ans, ${t.join(' et ')}`
}
