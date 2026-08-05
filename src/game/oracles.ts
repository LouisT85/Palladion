import { ENEMIES, SECTEURS, UNITS, UNIT_IDS } from './data'
import { EVENTS_BY_ID } from './events'
import { HEROS, HERO_IDS } from './heros'
import { VILLAGES_PAR_ID, garnisonEffective, puissanceEffective } from './expeditions'
import { JOURS_PAR_SAISON, METEOS, SAISONS, SAISON_IDS, type MeteoId, type SaisonId } from './saisons'
import type { BuildingId, EnemyId, GodId, HeroId, UnitId, WaveUnit } from './types'

/*
 * ═══════════════════ LES ORACLES PAYANTS ═══════════════════
 *
 * Athéna murmure gratuitement, mais seulement si elle vous aime, et seulement
 * sur le dilemme du jour. Le reste du temps, le joueur décide dans le noir :
 * il lève des hommes contre une vague qu'il ne connaît pas, il part en
 * expédition sur une garnison qu'il devine, il sème avant une saison qu'il n'a
 * pas comptée.
 *
 * Ici, on ACHÈTE de savoir. Trois règles, et elles ne se négocient pas :
 *
 *  · l'oracle dit VRAI. Chaque réponse est lue dans l'état déjà tiré - la vague
 *    armée à l'alerte, le `roll` figé du dilemme actif, les poids de météo de la
 *    saison. Aucune ligne n'est inventée, aucune n'est arrondie en faveur du
 *    joueur. Un oracle qui mentirait une fois sur dix ne serait plus une
 *    information, seulement une loterie de plus ;
 *
 *  · l'oracle ne vend pas de vide. Si la chose n'existe PAS ENCORE dans l'état -
 *    aucune vague armée, aucun dilemme ouvert, aucun village désigné - il répond
 *    honnêtement qu'il ne voit rien, et l'on ne prélève NI faveur NI grain, et
 *    l'on ne consomme pas son délai. C'est la contrepartie de la première règle :
 *    puisqu'il ne peut pas broder, il doit pouvoir se taire gratuitement ;
 *
 *  · l'oracle se fait attendre. Chaque question a son propre délai de garde. Sans
 *    lui, le temple deviendrait un tableau de bord qu'on rafraîchit, et le jeu
 *    n'aurait plus d'incertitude à gérer - seulement un prix à payer une fois.
 *
 * On paie DEUX fois : la faveur pour le devin, le grain pour la bête qu'on ouvre
 * devant lui. Un village affamé ne consulte pas.
 */

export type OracleId = 'ciel' | 'heros' | 'garnison' | 'dilemme' | 'assaut'

export interface OracleDef {
  id: OracleId
  nom: string
  emoji: string
  /** la question telle qu'on la pose au devin */
  question: string
  /** ce que la réponse contiendra - le joueur doit savoir ce qu'il achète */
  desc: string
  /** points de faveur versés au devin */
  coutFaveur: number
  /** grain de la bête sacrifiée */
  coutGrain: number
  /** délai de garde propre à cette question (ms) */
  cooldown: number
  /** niveau de temple requis - les grandes questions demandent un grand autel */
  temple: number
}

/**
 * Les cinq questions, par prix croissant. Le prix suit ce que la réponse fait
 * gagner : lire le ciel réoriente une récolte, lire l'assaut qui monte décide
 * d'une bataille.
 */
export const ORACLES: Record<OracleId, OracleDef> = {
  ciel: {
    id: 'ciel',
    nom: 'Le vol des oiseaux',
    emoji: '🕊️',
    question: 'Que porte le ciel ?',
    desc: 'La météo présente, ce qu’il en reste, la saison qui vient et ce qu’elle peut donner.',
    coutFaveur: 8,
    coutGrain: 20,
    cooldown: 90_000,
    temple: 1,
  },
  heros: {
    id: 'heros',
    nom: 'Les noms à venir',
    emoji: '🏛️',
    question: 'Un héros se présentera-t-il ?',
    desc: 'Le prochain nom que la renommée vous amènera, et ce qu’il attend de vous pour venir.',
    coutFaveur: 14,
    coutGrain: 30,
    cooldown: 120_000,
    temple: 1,
  },
  garnison: {
    id: 'garnison',
    nom: 'Le regard au loin',
    emoji: '🔭',
    question: 'Que cache cette place forte ?',
    desc: 'La garnison exacte d’un village cible, son mur, et ce que ses pillages passés y ont ajouté.',
    coutFaveur: 20,
    coutGrain: 45,
    cooldown: 150_000,
    temple: 2,
  },
  dilemme: {
    id: 'dilemme',
    nom: 'Le foie de la victime',
    emoji: '🫀',
    question: 'Où mène chacune des voies ?',
    desc: 'Pour le dilemme ouvert, l’issue déjà tirée de chaque option - le murmure d’Athéna, mais payé et sans condition de ferveur.',
    coutFaveur: 28,
    coutGrain: 60,
    cooldown: 240_000,
    temple: 2,
  },
  assaut: {
    id: 'assaut',
    nom: 'La fumée de l’autel',
    emoji: '🔥',
    question: 'Qui monte de la plaine ?',
    desc: 'La composition exacte de la vague annoncée, les pans qu’elle visera, le nom qui la mène et l’heure de son arrivée.',
    coutFaveur: 40,
    coutGrain: 90,
    cooldown: 300_000,
    temple: 3,
  },
}

export const ORACLE_IDS = Object.keys(ORACLES) as OracleId[]

/**
 * Ce que l'oracle a besoin de LIRE. Les noms de champs sont ceux du store, pour
 * que le tick puisse lui passer son état sans le recopier.
 */
export interface SnapOracle {
  now: number
  /** journée de jeu courante (`jourDe(s)`) */
  jour: number
  /** la vague déjà tirée pour l'assaut annoncé - `null` = rien d'armé */
  incomingWave: WaveUnit[] | null
  incomingFronts: string[] | null
  incomingChampion: HeroId | null
  nextAttackAt: number
  /** le dilemme ouvert et son `roll` figé - c'est lui qui rend la réponse vraie */
  activeEvent: { defId: string; roll: number } | null
  saison: SaisonId
  meteo: MeteoId
  meteoJusqua: number
  expeditions: Record<string, { etoiles: number; pillages?: number }>
  heros: Record<HeroId, { recrute: boolean; mort: boolean }>
  buildings: Record<BuildingId, { level: number }>
  army: Record<UnitId, number>
  morale: number
  gods: Record<GodId, { relation: number }>
  stats: { repousses: number }
  /** étoiles cumulées sur toute la Troade */
  etoilesTotal: number
  /** village visé quand on pose la question de la garnison */
  cible?: string | null
}

/** ce que le devin dit quand il n'a rien vu - et qu'il ne facture pas */
export const RIEN_VU: Record<OracleId, string> = {
  ciel: 'Les nuées sont immobiles : le devin ne lit rien qu’on ne voie déjà.',
  heros: 'Aucun nom ne monte : ceux qui devaient venir sont à votre table, ou sous la terre.',
  garnison: 'Le devin demande qu’on lui désigne une place forte : il ne devine pas où porter le regard.',
  dilemme: 'Aucune affaire n’attend votre parole. Le foie ne dit rien de ce qui n’est pas encore posé.',
  assaut: 'La plaine est vide. Rien n’est en marche, et le devin refuse de vous vendre un ennemi imaginaire.',
}

// ── Réponses ────────────────────────────────────────────────────────────────

/** libellé d'un groupe de vague, ennemi ou unité (les expéditions partagent le type) */
function nomGroupe(g: WaveUnit): string {
  const e = ENEMIES[g.enemy as EnemyId]
  if (e) return g.count > 1 ? e.pluriel : e.nom
  const u = UNITS[g.enemy as UnitId]
  return u ? u.nom : String(g.enemy)
}

function minutes(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s} s`
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`
}

/** noms lisibles des pans annoncés - les ids seuls ne parlent pas au joueur */
function nomsFronts(ids: string[]): string[] {
  return ids.map((id) => SECTEURS.find((x) => x.id === id)?.nom ?? id)
}

function reponseAssaut(snap: SnapOracle): string[] {
  const w = snap.incomingWave
  if (!w || w.length === 0) return []
  const total = w.reduce((a, g) => a + g.count, 0)
  const out = [
    `La colonne compte ${total} homme${total > 1 ? 's' : ''} et engins :`,
    ...w.map((g) => `· ${g.count} ${nomGroupe(g)}`),
  ]
  const fronts = snap.incomingFronts ?? []
  if (fronts.length > 0) {
    const noms = nomsFronts(fronts)
    out.push(
      noms.length === 1
        ? `Elle se jettera tout entière sur ${noms[0]}.`
        : `Elle se scindera en ${noms.length} fronts : ${noms.join(', ')}.`,
    )
  }
  if (snap.incomingChampion) {
    const h = HEROS[snap.incomingChampion]
    if (h) out.push(`${h.emoji} ${h.nom} mène la colonne. Abattez-le et sa manœuvre meurt avec lui.`)
  } else {
    out.push('Aucun nom connu ne la mène : ce ne sont que des soldats.')
  }
  const reste = snap.nextAttackAt - snap.now
  if (reste > 0) out.push(`Elle sera sous vos murs dans ${minutes(reste)}.`)
  else out.push('Elle est déjà à la porte.')
  return out
}

function reponseDilemme(snap: SnapOracle): string[] {
  const ev = snap.activeEvent
  if (!ev) return []
  const def = EVENTS_BY_ID[ev.defId]
  if (!def) return []
  const out = [`${def.emoji} ${def.titre} - voici où mène chaque voie :`]
  for (const c of def.choices) {
    /*
     * On lit le murmure sur l'issue DÉJÀ tirée depuis le roll de l'instance :
     * c'est la même mécanique qu'Athéna, donc la même impossibilité de mentir.
     * Une option sans murmure est une option dont rien ne dépend du hasard - on
     * le dit, plutôt que d'inventer une prophétie pour remplir la ligne.
     */
    const murmure = c.hint ? c.hint(ev.roll) : null
    out.push(`· « ${c.label} » → ${murmure ?? 'rien ne s’y joue au sort : son effet est écrit.'}`)
  }
  return out
}

function reponseCiel(snap: SnapOracle): string[] {
  const s = SAISONS[snap.saison]
  const m = METEOS[snap.meteo]
  if (!s || !m) return []
  const out = [
    `${m.emoji} ${m.nom} - ${m.desc}`,
    `Il en reste ${minutes(snap.meteoJusqua - snap.now)}.`,
    `${s.emoji} ${s.nom} : ${s.desc}`,
  ]
  const joursRestants = JOURS_PAR_SAISON - (snap.jour % JOURS_PAR_SAISON)
  /*
   * La saison qui vient se lit sur la ROUE, pas sur le calendrier : `snap.saison`
   * et `jourDe(s)` sont tenus en phase par le store, mais si jamais ils
   * divergeaient, le devin annoncerait une saison qui contredirait celle qu'il
   * vient de nommer - et cela, c'est mentir.
   */
  const suivante = SAISONS[SAISON_IDS[(SAISON_IDS.indexOf(snap.saison) + 1) % SAISON_IDS.length]]
  out.push(
    `${suivante.emoji} ${suivante.nom} dans ${joursRestants} journée${joursRestants > 1 ? 's' : ''} : ${suivante.desc}`,
  )
  /*
   * La météo suivante n'est PAS encore tirée : la prédire serait mentir. Le devin
   * donne donc ce qu'il sait réellement - les poids de la saison à venir, dans
   * l'ordre - et le joueur en fait ce qu'il veut.
   */
  const somme = suivante.meteos.reduce((a, x) => a + x.poids, 0)
  const chances = [...suivante.meteos]
    .sort((a, b) => b.poids - a.poids)
    .map((x) => `${METEOS[x.id].emoji} ${METEOS[x.id].nom} ${Math.round((x.poids / somme) * 100)} %`)
  out.push(`Ce que ce ciel-là peut porter : ${chances.join(', ')}.`)
  return out
}

function reponseGarnison(snap: SnapOracle): string[] {
  const id = snap.cible
  if (!id) return []
  const v = VILLAGES_PAR_ID[id]
  if (!v) return []
  const etat = snap.expeditions[id]
  const pillages = etat?.pillages ?? 0
  const g = garnisonEffective(v, pillages)
  const lignes = UNIT_IDS.filter((u) => (g[u] ?? 0) > 0).map((u) => `· ${g[u]} ${UNITS[u].nom}`)
  const out = [`${v.emoji} ${v.nom} - ce que le devin voit derrière le mur :`, ...lignes]
  if (lignes.length === 0) out.push('· pas un homme en armes : la place est vide.')
  out.push(v.mur > 0 ? `Mur de niveau ${v.mur}, qu’il faudra ouvrir.` : 'Aucun mur : on entre de plain-pied.')
  if (pillages > 0) {
    out.push(`Ils vous ont déjà vu venir ${pillages} fois : la garde a été renforcée d’autant.`)
  }
  out.push(`Puissance de la place : ${puissanceEffective(v, pillages)}.`)
  return out
}

/** ce qu'un héros attend encore de vous, en clair */
export function manquePourHeros(id: HeroId, snap: SnapOracle): string[] {
  const def = HEROS[id]
  const r = def.requiert
  const out: string[] = []
  if (r.batiment && (snap.buildings[r.batiment.id]?.level ?? 0) < r.batiment.niveau) {
    out.push(`${r.batiment.id} au niveau ${r.batiment.niveau}`)
  }
  if (r.armee) {
    const total = UNIT_IDS.reduce((a, u) => a + (snap.army[u] ?? 0), 0)
    if (total < r.armee) out.push(`${r.armee} soldats (vous en avez ${total})`)
  }
  if (r.relation && (snap.gods[r.relation.dieu]?.relation ?? 0) < r.relation.min) {
    out.push(`${r.relation.dieu} à ${r.relation.min} de ferveur`)
  }
  if (r.morale && snap.morale < r.morale) out.push(`une ambiance de ${r.morale}`)
  if (r.assautsRepousses && snap.stats.repousses < r.assautsRepousses) {
    out.push(`${r.assautsRepousses} assauts tenus (vous en avez ${snap.stats.repousses})`)
  }
  if (r.etoiles && snap.etoilesTotal < r.etoiles) {
    out.push(`${r.etoiles} étoiles en Troade (vous en avez ${snap.etoilesTotal})`)
  }
  return out
}

function reponseHeros(snap: SnapOracle): string[] {
  const candidats = HERO_IDS.filter((h) => !snap.heros[h]?.recrute && !snap.heros[h]?.mort)
  if (candidats.length === 0) return []
  // celui dont il manque le moins : c'est bien « le prochain » qu'on achète
  const classes = candidats
    .map((h) => ({ h, manque: manquePourHeros(h, snap) }))
    .sort((a, b) => a.manque.length - b.manque.length)
  const out: string[] = []
  const prets = classes.filter((c) => c.manque.length === 0)
  for (const c of prets) {
    const d = HEROS[c.h]
    out.push(`${d.emoji} ${d.nom} peut entrer à votre service dès maintenant : ${d.titre}.`)
  }
  const proche = classes.find((c) => c.manque.length > 0)
  if (proche) {
    const d = HEROS[proche.h]
    out.push(`${d.emoji} ${d.nom} viendrait, mais il attend : ${proche.manque.join(', ')}.`)
  }
  if (out.length === 0) return []
  return out
}

/**
 * La réponse VRAIE à une question, lue dans l'état. Tableau VIDE = le devin ne
 * voit rien : c'est la seule façon dont il a le droit de ne pas répondre, et
 * c'est ce que `consulterOracle` traduit en consultation gratuite.
 */
export function reponseOracle(question: OracleId, snap: SnapOracle): string[] {
  switch (question) {
    case 'assaut':
      return reponseAssaut(snap)
    case 'dilemme':
      return reponseDilemme(snap)
    case 'ciel':
      return reponseCiel(snap)
    case 'garnison':
      return reponseGarnison(snap)
    case 'heros':
      return reponseHeros(snap)
  }
}

/** le devin a-t-il quelque chose à dire sur cette question, en l'état ? */
export function oracleVoit(question: OracleId, snap: SnapOracle): boolean {
  return reponseOracle(question, snap).length > 0
}

// ── Consultation ────────────────────────────────────────────────────────────

export type MotifOracle = 'ok' | 'temple' | 'attente' | 'rien' | 'ressources'

export interface Consultation {
  ok: boolean
  motif: MotifOracle
  /** la réponse, si elle a été obtenue ; sinon la phrase qui dit pourquoi non */
  lignes: string[]
  /** à prélever par le store - toujours 0 quand rien n'a été obtenu */
  coutFaveur: number
  coutGrain: number
  /** délai de garde à inscrire (0 = ne rien inscrire) */
  prochainAt: number
  /** attente restante en ms, quand `motif === 'attente'` */
  restant: number
}

/** attente restante avant de pouvoir reposer cette question */
export function attenteOracle(question: OracleId, cooldowns: Record<string, number>, now: number): number {
  return Math.max(0, (cooldowns[question] ?? 0) - now)
}

const REFUS = (motif: MotifOracle, lignes: string[], restant = 0): Consultation => ({
  ok: false,
  motif,
  lignes,
  coutFaveur: 0,
  coutGrain: 0,
  prochainAt: 0,
  restant,
})

/**
 * Décide d'une consultation, sans rien modifier : le store n'a plus qu'à
 * appliquer `coutFaveur`, `coutGrain` et `prochainAt` quand `ok`.
 *
 * L'ordre des refus n'est pas arbitraire. Le vide passe AVANT le prix : si le
 * devin n'a rien à dire, savoir qu'il n'a rien à dire ne se paie pas, même les
 * poches vides. Sans quoi un joueur ruiné ne pourrait jamais distinguer « je
 * n'ai pas les moyens » de « il n'y a rien à voir ».
 */
export function consulterOracle(
  question: OracleId,
  snap: SnapOracle,
  bourse: { faveur: number; grain: number; cooldowns: Record<string, number> },
): Consultation {
  const def = ORACLES[question]
  const temple = snap.buildings.temple?.level ?? 0
  if (temple < def.temple) {
    return REFUS('temple', [`Il faut un temple de niveau ${def.temple} pour poser cette question.`])
  }
  const restant = attenteOracle(question, bourse.cooldowns, snap.now)
  if (restant > 0) {
    return REFUS('attente', [`Le devin s’est retiré. Revenez dans ${minutes(restant)}.`], restant)
  }
  const lignes = reponseOracle(question, snap)
  if (lignes.length === 0) return REFUS('rien', [RIEN_VU[question]])
  if (bourse.faveur < def.coutFaveur || bourse.grain < def.coutGrain) {
    return REFUS('ressources', [`Il demande ${def.coutFaveur} de faveur et ${def.coutGrain} de grain.`])
  }
  return {
    ok: true,
    motif: 'ok',
    lignes,
    coutFaveur: def.coutFaveur,
    coutGrain: def.coutGrain,
    prochainAt: snap.now + def.cooldown,
    restant: 0,
  }
}
