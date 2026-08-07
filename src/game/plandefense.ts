import { EFFETS_LIGNE, EFFETS_TIR, posterHeros } from './combat'
import { SECTEURS, UNIT_IDS } from './data'
import { HEROS, HERO_IDS, absenceHero, type AbsenceHero, type HeroState } from './heros'
import type { BattleState, HeroId, OrdreLigne, OrdreTir, OrdresBataille, UnitId } from './types'

/*
 * ═══════════════════ LE PLAN DE DÉFENSE ═══════════════════
 *
 * Il n'y avait pas de plan. La barre d'ordres - posture de la ligne, façon de
 * tirer, et surtout le PAN de l'enceinte que tient chaque type d'unité - ne
 * s'affichait qu'une fois la bataille commencée. Le joueur découvrait donc où
 * poster ses hommes au moment où ils étaient déjà en train de mourir, et devait
 * refaire les mêmes cinq gestes à chaque assaut.
 *
 * Le plan est la même décision, prise en temps de paix et gardée. Trois choses à
 * y comprendre, et ce sont les trois raisons de la forme qu'il a :
 *
 *  1. UN PAN SE DÉSIGNE PAR SON NOM, JAMAIS PAR SON RANG. Les fronts d'un assaut
 *     sont tirés au sort (`choisirFronts`) : la porte de l'est est toujours du
 *     lot, les flancs sont mêlés. « Secteur n° 1 » désigne donc le mur du nord
 *     un soir et celui du sud le lendemain. Le plan retient `'nord'`, et c'est
 *     à l'ouverture de la bataille qu'on le traduit en rang.
 *
 *  2. UN ORDRE QUI NE PEUT PAS S'EXÉCUTER DORT, IL NE DÉRAILLE PAS. Un pan qu'on
 *     n'assaille pas ce soir-là, un type d'unité qu'on n'a pas encore levé : dans
 *     les deux cas l'ordre reste écrit dans le plan et ne commande personne. Ce
 *     qu'il ne fait JAMAIS, c'est envoyer des hommes tenir un autre mur que celui
 *     qu'on a désigné - ni les retirer de la bataille.
 *
 *  3. LE PLAN EST LU UNE FOIS, À L'OUVERTURE. Les ordres de la bataille en cours
 *     sont une COPIE : le plan n'a plus de prise sur eux. C'est ce qui interdit
 *     de s'en servir pour contourner le délai de `DELAI_ORDRE_MS` en pleine
 *     mêlée - et ce que vérifie le test « le plan ne pilote pas à distance ».
 *
 *  4. LES HÉROS S'Y POSTENT NOMMÉMENT, et c'est la seule chose que le plan ne
 *     désigne pas par catégorie. « On ne peut pas les bouger en défense » était
 *     exact : `secteurAssigne` rendait `null` pour tout héros, aucune table du
 *     plan ne portait leur nom, et le seul homme qui tient un mur à lui seul
 *     était le seul qu'on ne pouvait pas placer. Il a donc sa table (`heros`),
 *     ses trois cas dégradés (absent, pan désert, expédition), et son chemin
 *     jusqu'au terrain : `pansHeros` traduit, `appliquerPlanHeros` exécute.
 */

/** un pan de l'enceinte, désigné par l'`id` de `SECTEURS` : 'porte' | 'sud' | 'nord' */
export type PanId = string

export interface PlanDefense {
  /** posture de la ligne de mêlée, adoptée dès le premier choc */
  ligne: OrdreLigne
  /** façon de tirer, adoptée dès le premier choc */
  tir: OrdreTir
  /** le pan que tient chaque type d'unité - par NOM de pan, jamais par rang */
  pans: Partial<Record<UnitId, PanId>>
  /**
   * Le pan que tient chaque HÉROS, nommément : Hector au nord, Ajax à la porte.
   *
   * Une table à part, et non une entrée de `pans`, pour une raison de fond : on
   * poste un TYPE d'unité et un INDIVIDU. « Les hoplites au nord » commande les
   * trente hoplites ; « Hector au nord » ne dit rien d'Ajax, alors que le moteur
   * de bataille compte l'un et l'autre comme des hoplites. Les mêler ferait suivre
   * à tous les héros l'ordre donné à l'infanterie lourde - c'est-à-dire l'inverse
   * de ce qu'on demande, qui est de placer CETTE pièce-là.
   */
  heros: Partial<Record<HeroId, PanId>>
}

/** les pans de l'enceinte, tels que le plan les nomme */
export const PANS: { id: PanId; nom: string; angle: number }[] = SECTEURS.map((s) => ({
  id: s.id,
  nom: s.nom,
  angle: s.angle,
}))

/**
 * Les troupes qu'un plan de défense peut poster. Le bélier n'y est pas, et ce
 * n'est pas un oubli : `creerBataille` ne met JAMAIS de bélier parmi les
 * défenseurs - ni dans la ligne de mêlée, ni sur les créneaux. Lui donner un pan
 * à tenir serait promettre au joueur une garnison qui n'existe pas.
 */
export const UNITES_PLAN: UnitId[] = UNIT_IDS.filter((u) => u !== 'belier')

/**
 * Les héros qu'un plan peut poster : les huit, sans exception.
 *
 * Y compris Cassandre, qui n'a pas de bras. Ce n'est pas une distraction : le
 * store envoie sur le terrain TOUT héros engagé, vivant et qui ne boude pas
 * (`herosEnColonne`), la prophétesse comprise, et `creerBataille` lui donne les
 * points de vie et la frappe de son niveau comme aux autres. Elle est là, elle
 * encaisse, elle frappe - lui refuser un pan serait mentir sur ce qui se passe.
 */
export const HEROS_PLAN: HeroId[] = HERO_IDS

/** le plan d'un chef qui n'a rien décidé : on tient, on tire tendu, personne n'est posté */
export function planParDefaut(): PlanDefense {
  return { ligne: 'tenir', tir: 'tendu', pans: {}, heros: {} }
}

/**
 * Désinfecte un plan venu d'ailleurs - une sauvegarde d'avant le plan, un fichier
 * repris à la main, une version où un pan s'appelait autrement. Rien de ce qui
 * entre ici n'est cru sur parole : un ordre illisible vaut pas d'ordre.
 */
export function planValide(brut: unknown): PlanDefense {
  const p = (brut ?? {}) as Partial<PlanDefense>
  const ligne = typeof p.ligne === 'string' && p.ligne in EFFETS_LIGNE ? (p.ligne as OrdreLigne) : 'tenir'
  const tir = typeof p.tir === 'string' && p.tir in EFFETS_TIR ? (p.tir as OrdreTir) : 'tendu'
  const pans: Partial<Record<UnitId, PanId>> = {}
  const source = (p.pans ?? {}) as Record<string, unknown>
  for (const u of UNITES_PLAN) {
    const v = source[u]
    if (typeof v === 'string' && PANS.some((x) => x.id === v)) pans[u] = v
  }
  // les héros, à la même enseigne : une sauvegarde d'avant leur entrée dans le
  // plan n'a pas de table `heros`, et cela vaut « aucun héros posté »
  const hs: Partial<Record<HeroId, PanId>> = {}
  const sourceH = (p.heros ?? {}) as Record<string, unknown>
  for (const h of HEROS_PLAN) {
    const v = sourceH[h]
    if (typeof v === 'string' && PANS.some((x) => x.id === v)) hs[h] = v
  }
  return { ligne, tir, pans, heros: hs }
}

/**
 * Rang d'un pan nommé parmi les secteurs RÉELLEMENT assaillis, ou `null` si
 * l'ennemi ne vient pas par là ce soir. On reconnaît le pan par son nom, et à
 * défaut par son angle : `BattleState.secteurs` ne garde pas l'`id`.
 */
export function indexDuPan(panId: PanId, secteurs: readonly { nom: string; angle: number }[]): number | null {
  const ref = SECTEURS.find((s) => s.id === panId)
  if (!ref) return null
  const parNom = secteurs.findIndex((s) => s.nom === ref.nom)
  if (parNom >= 0) return parNom
  const parAngle = secteurs.findIndex((s) => Math.abs(s.angle - ref.angle) < 0.01)
  return parAngle >= 0 ? parAngle : null
}

/**
 * Les ordres qu'une DÉFENSE DU VILLAGE adopte à son ouverture. Les pans y sont
 * traduits en rangs ; ceux que l'ennemi n'assaille pas ce soir sont laissés de
 * côté - ces hommes-là reprennent la consigne ordinaire (courir au pan enfoncé),
 * qui est de loin la moins mauvaise quand on ne tient pas le mur visé.
 *
 * `prochainAt: 0` : le plan ne coûte pas au joueur cinq secondes de main morte au
 * premier choc. Il a décidé avant, il peut se dédire tout de suite.
 */
export function ordresDefense(
  plan: PlanDefense | null | undefined,
  secteurs: readonly { nom: string; angle: number }[],
): OrdresBataille {
  const p = planValide(plan)
  const secteursOrdres: Partial<Record<UnitId, number>> = {}
  for (const u of UNITES_PLAN) {
    const pan = p.pans[u]
    if (!pan) continue
    const i = indexDuPan(pan, secteurs)
    if (i === null) continue
    secteursOrdres[u] = i
  }
  return { ligne: p.ligne, tir: p.tir, secteurs: secteursOrdres, prochainAt: 0 }
}

/**
 * ═══════════ OÙ SE TIENT CHAQUE HÉROS ═══════════
 *
 * Un héros ne peut pas passer par `OrdresBataille.secteurs`, qui est indexé par
 * TYPE d'unité : le moteur compte tout héros comme un hoplite, donc y écrire son
 * pan enverrait aussi les trente hoplites, et poster Hector au nord déplacerait
 * Ajax avec lui. Son pan voyage donc sur le combattant lui-même
 * (`Fighter.secteur`), que `posterHeros` inscrit ici et que `secteurAssigne`
 * relit à chaque battement.
 *
 * Cela se fait à l'OUVERTURE de la bataille et une seule fois, comme les ordres :
 * régler le plan en pleine mêlée ne déplace donc personne - même garantie que
 * pour les troupes, et même raison (le délai de `DELAI_ORDRE_MS` ne doit pas
 * avoir de porte de service).
 *
 * Les trois cas où le placement ne commande rien - et où il ne doit RIEN casser :
 *
 *  · le héros n'est pas là (pas engagé, mort, ou il boude sous sa tente) : il n'a
 *    pas de combattant sur le terrain, `posterHeros` ne trouve rien à poster, et
 *    l'ordre reste écrit pour le jour où il reviendra ;
 *  · son pan n'est pas assailli ce soir : `indexDuPan` rend `null`, on ne lui
 *    donne aucun secteur, et il reprend la consigne ordinaire - courir au pan
 *    enfoncé. Exactement la règle des troupes, et pour la même raison : mieux vaut
 *    un héros au mauvais endroit qu'un héros qui garde un mur désert ;
 *  · on est en expédition : il n'y a pas de pan là-bas, la fonction se tait.
 *
 * ── CE QUE POSTER COÛTE, MESURÉ ─────────────────────────────────────────────
 *
 * Poster n'est pas gratuit, et il faut le dire : assaut sur DEUX pans (porte et
 * nord), 21 assaillants contre une garnison de 4 hoplites / 4 lanciers / 3 archers
 * et Hector au niveau 5, sept graines, assaillants abattus au bout de 225 s :
 *
 *   personne de posté        13 · 16 · 15 · 15 · 18 · 16 · 15   moyenne 15,4
 *   Hector au nord           12 · 16 · 14 · 12 · 13 · 14 · 12   moyenne 13,3
 *   les hoplites au nord      7 · 10 · 12 · 13 ·  9 · 13 · 12   moyenne 10,9
 *
 * Diviser sa ligne se paie, et se paie PLUS CHER avec une troupe qu'avec un héros.
 * Ce n'est donc pas un défaut du placement des héros : c'est la propriété du pan
 * assigné, la même depuis qu'il existe pour les unités - « ces hommes-là tiennent
 * CE pan et ne courent pas ailleurs ». La brèche du nord, elle, tombe à la même
 * seconde dans les trois cas (12-13 s) : derrière son mur, un héros ne peut pas
 * frapper qui le bat, et il n'affronte la colonne du nord que seul, une fois le
 * pan ouvert, pendant que le reste de la ligne court à l'autre trou.
 *
 * Le placement paie donc quand on SAIT par où l'ennemi vient - les fronts que
 * révèlent Ulysse ou l'œil de Zeus - et coûte quand on parie à l'aveugle. C'est
 * un choix, pas un réglage à cocher, et le panneau ne doit pas le vendre autrement.
 */
export function pansHeros(
  plan: PlanDefense | null | undefined,
  secteurs: readonly { nom: string; angle: number }[],
): Partial<Record<HeroId, number>> {
  const p = planValide(plan)
  const out: Partial<Record<HeroId, number>> = {}
  for (const h of HEROS_PLAN) {
    const pan = p.heros[h]
    if (!pan) continue
    const i = indexDuPan(pan, secteurs)
    if (i === null) continue
    out[h] = i
  }
  return out
}

/**
 * Applique le plan aux héros d'une DÉFENSE DU VILLAGE, sur la bataille qu'on
 * vient de créer. À appeler juste après `ordresDefense`, avec le même plan.
 *
 * Le garde-fou `campJoueur` n'est pas de la coquetterie : appelée par erreur sur
 * une expédition, cette fonction planterait les héros sur « le secteur 0 », qui
 * est la porte de l'ENNEMI - ils y arriveraient avant la colonne et s'y feraient
 * tuer seuls. Elle refuse plutôt que d'obéir.
 */
export function appliquerPlanHeros(b: BattleState, plan: PlanDefense | null | undefined): void {
  if (b.campJoueur !== 'defense') return
  posterHeros(b, pansHeros(plan, b.secteurs))
}

/**
 * Les héros dont le placement dort ce soir : leur pan n'est pas assailli. À dire
 * au joueur, comme `pansDormants` le fait pour les troupes.
 */
export function herosDormants(
  plan: PlanDefense | null | undefined,
  secteurs: readonly { nom: string; angle: number }[],
): HeroId[] {
  const p = planValide(plan)
  return HEROS_PLAN.filter((h) => {
    const pan = p.heros[h]
    return !!pan && indexDuPan(pan, secteurs) === null
  })
}

/** un héros du plan, tel que le panneau doit le montrer */
export interface HeroPlacable {
  id: HeroId
  nom: string
  emoji: string
  couleur: string
  niveau: number
  /** le pan qu'il tient, ou `null` : il court au plus pressé */
  pan: PanId | null
  /** il descendra bien sur le terrain à la prochaine bataille */
  present: boolean
  /** et sinon pourquoi : `null` quand il est présent */
  absence: AbsenceHero | null
}

/**
 * Les héros que le plan peut poster, dans l'ordre du panthéon, avec ce qu'il faut
 * pour les afficher et l'état de chacun.
 *
 * Les absents y FIGURENT, et c'est voulu : le plan garde l'ordre donné à un héros
 * qu'on n'a pas encore engagé, tout comme il garde celui donné à des archers
 * qu'on n'a pas levés. On ne cache pas la case, on dit qu'elle est vide.
 */
export function herosPlacables(
  plan: PlanDefense | null | undefined,
  etats: Record<HeroId, HeroState> | undefined,
  now: number,
): HeroPlacable[] {
  const p = planValide(plan)
  return HEROS_PLAN.map((h) => {
    const def = HEROS[h]
    const etat = etats?.[h]
    const absence = absenceHero(etat, now)
    return {
      id: h,
      nom: def.nom,
      emoji: def.emoji,
      couleur: def.couleur,
      niveau: etat?.niveau ?? 1,
      pan: p.heros[h] ?? null,
      present: absence === null,
      absence,
    }
  })
}

/**
 * Les héros que le plan poste alors qu'ils ne seront pas là. Même office que
 * `pansSansHommes` : l'ordre est gardé, mais on le signale, faute de quoi le
 * joueur croit son mur tenu par Hector alors qu'Hector est encore à recruter.
 */
export function herosAbsents(
  plan: PlanDefense | null | undefined,
  etats: Record<HeroId, HeroState> | undefined,
  now: number,
): HeroId[] {
  const p = planValide(plan)
  return HEROS_PLAN.filter((h) => !!p.heros[h] && absenceHero(etats?.[h], now) !== null)
}

/**
 * Les héros postés sur CE pan, dans l'ordre du panthéon. Pendant du filtre que le
 * panneau fait déjà sur les troupes (`UNITES_PLAN.filter(u => plan.pans[u] === p.id)`),
 * et il vaut mieux qu'il vienne d'ici : c'est la seule façon de garantir qu'on lit
 * la table `heros` et jamais `pans`. Un panneau qui se tromperait de table
 * n'afficherait rien de faux - il écrirait, lui, l'ordre des trente hoplites.
 */
export function herosDuPan(plan: PlanDefense | null | undefined, pan: PanId): HeroId[] {
  const p = planValide(plan)
  return HEROS_PLAN.filter((h) => p.heros[h] === pan)
}

/** poste un héros sur un pan, ou le rend au plus pressé (`null`) */
export function planAvecHero(plan: PlanDefense | null | undefined, h: HeroId, pan: PanId | null): PlanDefense {
  const p = planValide(plan)
  const heros = { ...p.heros }
  if (pan === null || !PANS.some((x) => x.id === pan) || !HEROS_PLAN.includes(h)) delete heros[h]
  else heros[h] = pan
  return { ...p, heros }
}

/**
 * Les ordres qu'une EXPÉDITION adopte. La posture et le tir suivent le plan - ce
 * sont les mêmes hommes, et « mur de boucliers » veut dire la même chose devant
 * une place forte étrangère. Les PANS, non, et c'est délibéré :
 *
 *  · loin de chez soi il n'y a pas de pan à tenir. Une scène d'expédition n'a
 *    qu'un seul secteur - la porte de l'ENNEMI - donc le choix n'en est pas un ;
 *  · et il ne changerait rien. MESURÉ : à graine égale, poster les quatre types
 *    de mêlée et les tireurs sur ce secteur unique donne exactement les mêmes
 *    dégâts qu'un plan sans pan (0,0 % d'écart sur 5 graines × 3 postures). La
 *    raison en est géométrique : l'entrée du secteur 0 de `GEO_EXPEDITION` est à
 *    41 pas du ralliement, et tous les assaillants portent déjà `secteur = 0`.
 *
 * Un réglage sans effet est pire qu'un réglage absent : il se croit obéi. Le
 * panneau ne montre donc pas de pans quand on parle d'expédition.
 */
export function ordresExpedition(plan: PlanDefense | null | undefined): OrdresBataille {
  const p = planValide(plan)
  return { ligne: p.ligne, tir: p.tir, secteurs: {}, prochainAt: 0 }
}

/**
 * Les troupes dont l'ordre DORT ce soir : leur pan n'est pas assailli. À dire au
 * joueur, sans quoi il verrait son plan silencieusement ignoré et croirait à une
 * perte de réglage.
 */
export function pansDormants(
  plan: PlanDefense | null | undefined,
  secteurs: readonly { nom: string; angle: number }[],
): UnitId[] {
  const p = planValide(plan)
  return UNITES_PLAN.filter((u) => {
    const pan = p.pans[u]
    return !!pan && indexDuPan(pan, secteurs) === null
  })
}

/**
 * Les troupes que le plan poste sans qu'on en ait un seul homme. L'ordre est
 * gardé - on lève des archers demain, et le plan doit s'en souvenir - mais on le
 * signale, faute de quoi le joueur croit avoir garni un mur qui est nu.
 */
export function pansSansHommes(
  plan: PlanDefense | null | undefined,
  effectifs: Partial<Record<UnitId, number>>,
): UnitId[] {
  const p = planValide(plan)
  return UNITES_PLAN.filter((u) => !!p.pans[u] && (effectifs[u] ?? 0) <= 0)
}

/** poste un type d'unité sur un pan, ou le rend au plus pressé (`null`) */
export function planAvecPan(plan: PlanDefense | null | undefined, u: UnitId, pan: PanId | null): PlanDefense {
  const p = planValide(plan)
  const pans = { ...p.pans }
  if (pan === null || !PANS.some((x) => x.id === pan) || !UNITES_PLAN.includes(u)) delete pans[u]
  else pans[u] = pan
  return { ...p, pans }
}

/** change la posture de la ligne ou la façon de tirer, dans le plan */
export function planAvecOrdre(
  plan: PlanDefense | null | undefined,
  quoi: 'ligne' | 'tir',
  valeur: OrdreLigne | OrdreTir,
): PlanDefense {
  const p = planValide(plan)
  if (quoi === 'ligne') return valeur in EFFETS_LIGNE ? { ...p, ligne: valeur as OrdreLigne } : p
  return valeur in EFFETS_TIR ? { ...p, tir: valeur as OrdreTir } : p
}

/**
 * Le plan en une ligne, pour le bloc des remparts :
 * « 🧱 Mur de boucliers · 🏹 Tir tendu · 2 pans tenus · 🛡️⚔️ postés »
 *
 * Les héros y paraissent par leur EMBLÈME et non par un compte. « 3 héros postés »
 * ne dit pas lesquels, et c'est précisément ce qu'on veut savoir d'un coup d'œil
 * quand on relit son plan : Hector est-il au mur, oui ou non.
 */
export function resumePlan(plan: PlanDefense | null | undefined): string {
  const p = planValide(plan)
  const n = UNITES_PLAN.filter((u) => p.pans[u]).length
  const pans = n === 0 ? 'aucun pan assigné' : `${n} pan${n > 1 ? 's' : ''} tenu${n > 1 ? 's' : ''}`
  const hs = HEROS_PLAN.filter((h) => p.heros[h])
  const heros = hs.length > 0 ? ` · ${hs.map((h) => HEROS[h].emoji).join('')} postés` : ''
  return `${EFFETS_LIGNE[p.ligne].emoji} ${EFFETS_LIGNE[p.ligne].nom} · ${EFFETS_TIR[p.tir].emoji} ${EFFETS_TIR[p.tir].nom} · ${pans}${heros}`
}
