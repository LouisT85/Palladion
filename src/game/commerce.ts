import { MARGE_PORT, RES, VALEUR_RES } from './data'
import { SEUIL_HOSTILE, statutVillage, type StatutVillage } from './diplomatie'
import { VILLAGES_CIBLES, VILLAGES_PAR_ID, type VillageCible } from './expeditions'
import { METEOS, SAISONS, type MeteoId, type SaisonId } from './saisons'
import type { Cost, ResourceId } from './types'

/*
 * ═══════════════════════ LE COMMERCE VIVANT ═══════════════════════
 *
 * Le port était un distributeur : quarante de ceci contre dix de cela, au même
 * taux au premier jour du printemps et sous la neige, que la Troade fût en paix
 * ou en armes. On n'y décidait rien - on y convertissait.
 *
 * Trois pièces rendent le négoce décidable :
 *
 *  1. LES COURS BOUGENT. Chaque marchandise a un cours (un multiplicateur autour
 *     de 1) qui suit une CIBLE dictée par le monde : la sécheresse brûle les
 *     champs et le grain monte, la grande récolte le fait chuter, l'hiver ferme
 *     la mer et renchérit tout, un assaut encaissé laisse des ruines et toute la
 *     côte réclame de la pierre.
 *
 *     La dérive est LENTE ET LISIBLE, et c'est un choix de conception, pas une
 *     approximation : le joueur doit pouvoir voir le grain monter, se dire « je
 *     vends au prochain relevé », et avoir raison. D'où deux règles tenues ici :
 *       · aucun tirage au sort. Le cours se dirige vers une cible qu'on peut
 *         afficher, à vitesse bornée (VITESSE_COURS par minute). Un bruit
 *         aléatoire donnerait la même courbe en apparence et rendrait toute
 *         attente absurde : on ne peut pas guetter du hasard ;
 *       · les cours sont bornés (COURS_MIN…COURS_MAX). Pas de spirale, donc pas
 *         de partie qui se gagne en regardant un chiffre grossir.
 *
 *  2. LES CARAVANES. Vendre au quai, c'est sûr et médiocre : le port prélève sa
 *     marge. Charger une caravane pour une place forte de la Troade, c'est le
 *     prix plein majoré de la distance - contre du temps et un risque de tout
 *     perdre. Et le risque se NÉGOCIE : il dépend de ce que le village visé
 *     pense de vous. Une caravane chez un allié est presque sûre.
 *
 *  3. LES ROUTES SE FERMENT. Un village hostile refoule vos marchands, l'hiver
 *     ferme la mer, et quand la région est en armes les longues routes tombent
 *     les premières. Une route fermée, c'est aussi un tribut d'alliance qui
 *     n'arrive plus - la diplomatie a désormais une géographie.
 *
 * Tout ce fichier est PUR : il ne lit qu'un instantané (`SnapCommerce`) et ne
 * touche à rien. Le store appelle, l'état est à lui.
 */

// ── Les marchandises ─────────────────────────────────────────────────────────

/**
 * Le lingot de bronze est l'UNITÉ DE COMPTE. C'est le métal de l'âge, celui que
 * les comptoirs pèsent, et le jeu en faisait déjà sa monnaie de fait (le port en
 * produit, tout ce qui est cher se paie en bronze). On ne le cote donc pas
 * contre lui-même : son cours vaut 1, toujours, et c'est en lingots que
 * s'expriment tous les prix de ce fichier.
 */
export const NUMERAIRE: ResourceId = 'bronze'

/** ce qui s'achète et se vend au comptoir - le lingot est le prix, pas la marchandise */
export const RES_MARCHANDES: ResourceId[] = ['bois', 'pierre', 'grain']

/** un cours par ressource, autour de 1 ; celui du numéraire ne bouge jamais */
export type Cours = Record<ResourceId, number>

/** la charretée : l'unité dans laquelle on cote et dans laquelle on charge */
export const LOT_VENTE = 50

/** un cours ne descend jamais plus bas, ni ne monte plus haut */
export const COURS_MIN = 0.55
export const COURS_MAX = 1.85

/** ce qu'un cours peut parcourir en une minute de jeu - lent, exprès */
export const VITESSE_COURS = 0.05

/**
 * Élasticité aux saisons : le cours suit l'inverse de l'abondance. Un tiers,
 * pas plus - la grande récolte doit faire baisser le grain d'un dixième, pas le
 * rendre invendable.
 */
export const ELASTICITE_SAISON = 0.35
/** même chose pour le ciel du jour, deux fois plus doux (il tourne bien plus vite) */
export const ELASTICITE_METEO = 0.18

/** la houle des marchands : une respiration lente et minuscule, mais visible */
export const HOULE = 0.04
export const HOULE_MS = 7 * 60_000

/** marge du comptoir par défaut, quand on n'a pas le niveau du port sous la main */
export const MARGE_COMPTOIR = MARGE_PORT[2]

export function bornerCours(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.max(COURS_MIN, Math.min(COURS_MAX, n))
}

/** les cours d'une partie neuve : tout au pair, rien à guetter encore */
export function coursInitiaux(): Cours {
  return { bois: 1, pierre: 1, grain: 1, bronze: 1 }
}

// ── L'instantané que les règles lisent ───────────────────────────────────────

/**
 * Ce dont le commerce a besoin. Les noms suivent ceux du store partout où c'est
 * possible, pour que le tick puisse le monter sans réfléchir.
 */
export interface SnapCommerce {
  now: number
  saison: SaisonId
  meteo: MeteoId
  /** la mer est fermée : `merFermee(s)` (l'hiver, sauf grâce de Poséidon) */
  merFermee: boolean
  /** menace courante du règne, 5…100 (`s.threat`) */
  menace: number
  /** sécheresse en cours (`now < s.droughtUntil`) */
  secheresse: boolean
  /** pans effondrés + bâtiments en ruine : on rebâtit, les matériaux montent */
  ruines: number
  /** niveau du port : sa marge, et le nombre de caravanes qu'on peut tenir */
  port: number
  /** ce que chaque place forte pense de vous (`s.relations`) */
  relations: Record<string, number>
  /** alliances en cours (`s.alliances`) - le mariage rend la route très sûre */
  alliances: Record<string, { mariage?: unknown }>
  /** les cours du jour */
  cours: Cours
}

function relationDe(snap: SnapCommerce, villageId: string): number {
  return snap.relations?.[villageId] ?? 0
}

function statutDe(snap: SnapCommerce, villageId: string): StatutVillage {
  const a = snap.alliances?.[villageId]
  return statutVillage(relationDe(snap, villageId), !!a, !!a?.mariage)
}

// ── 1. Les cours ─────────────────────────────────────────────────────────────

/** décalage de houle propre à chaque marchandise : les trois ne montent pas ensemble */
function phaseHoule(res: ResourceId): number {
  return RES_MARCHANDES.indexOf(res) * ((2 * Math.PI) / 3)
}

/**
 * Le cours vers lequel la marchandise tend, ici et maintenant. C'est la pièce
 * centrale : tout ce que le monde fait au village passe par elle, et l'interface
 * peut l'afficher telle quelle (c'est la flèche ↗/↘ du tableau).
 */
export function cibleCours(res: ResourceId, snap: SnapCommerce): number {
  if (res === NUMERAIRE) return 1

  // rareté saisonnière : le cours suit l'inverse de ce que la terre donne
  const prodSaison = SAISONS[snap.saison]?.prod[res] ?? 1
  let c = Math.pow(Math.max(0.1, prodSaison), -ELASTICITE_SAISON)

  // le ciel du jour, dans le même esprit mais bien plus doux
  const prodMeteo = METEOS[snap.meteo]?.prod ?? 1
  c *= Math.pow(Math.max(0.1, prodMeteo), -ELASTICITE_METEO)

  // la mer fermée renchérit TOUT : plus un bateau, donc plus de concurrence
  if (snap.merFermee) c *= 1.12

  // la sécheresse brûle les champs, et cela se lit d'abord sur le grain
  if (snap.secheresse && res === 'grain') c *= 1.35

  // après un assaut encaissé, tout le monde rebâtit : la pierre d'abord, le bois ensuite
  const chantiers = Math.min(3, Math.max(0, snap.ruines))
  if (res === 'pierre') c *= 1 + 0.12 * chantiers
  if (res === 'bois') c *= 1 + 0.05 * chantiers

  // une région en armes, ce sont des routes chères : la menace pèse sur tout
  c *= 1 + (Math.max(0, snap.menace - 40) / 100) * 0.4

  // la houle des marchands - déterministe, minuscule, mais elle fait vivre le tableau
  c *= 1 + HOULE * Math.sin((2 * Math.PI * snap.now) / HOULE_MS + phaseHoule(res))

  return bornerCours(c)
}

/** avance `de` vers `vers` d'au plus `pas` - jamais de dépassement, donc jamais d'oscillation */
function approcher(de: number, vers: number, pas: number): number {
  const ecart = vers - de
  if (Math.abs(ecart) <= pas) return vers
  return de + Math.sign(ecart) * pas
}

/**
 * Fait avancer les cours de `dtMs`. Ils se dirigent vers leur cible à vitesse
 * bornée : une absence d'une heure les trouve simplement arrivés, jamais partis
 * en spirale.
 */
export function deriverCours(cours: Cours, snap: SnapCommerce, dtMs: number): Cours {
  const pas = VITESSE_COURS * (Math.max(0, dtMs) / 60_000)
  const out = coursInitiaux()
  for (const res of RES_MARCHANDES) {
    const actuel = bornerCours(cours?.[res] ?? 1)
    out[res] = approcher(actuel, cibleCours(res, snap), pas)
  }
  return out
}

/** ce que valent, en lingots, LOT_VENTE unités de cette marchandise - marge non comprise */
export function valeurLot(res: ResourceId, cours: Cours): number {
  if (res === NUMERAIRE) return 0
  const c = bornerCours(cours?.[res] ?? 1)
  return (LOT_VENTE * VALEUR_RES[res] * c) / VALEUR_RES[NUMERAIRE]
}

/**
 * Ce que le comptoir DONNE pour une charretée : la valeur, moins sa marge. Sans
 * port (marge nulle), personne n'achète - le quai n'existe pas.
 */
export function prixVente(res: ResourceId, cours: Cours, marge: number = MARGE_COMPTOIR): number {
  if (res === NUMERAIRE || marge <= 0) return 0
  return Math.max(1, Math.floor(valeurLot(res, cours) / marge))
}

/** ce que le comptoir RÉCLAME pour une charretée : la valeur, plus sa marge */
export function prixAchat(res: ResourceId, cours: Cours, marge: number = MARGE_COMPTOIR): number {
  if (res === NUMERAIRE || marge <= 0) return 0
  return Math.max(1, Math.ceil(valeurLot(res, cours) * marge))
}

export type Tendance = 'hausse' | 'baisse' | 'stable'

/** la flèche du tableau : où va le cours, pas où il est */
export function tendanceCours(res: ResourceId, snap: SnapCommerce): Tendance {
  const ecart = cibleCours(res, snap) - bornerCours(snap.cours?.[res] ?? 1)
  if (ecart > 0.012) return 'hausse'
  if (ecart < -0.012) return 'baisse'
  return 'stable'
}

/** où le cours se situe dans sa fourchette (0 = au plus bas, 1 = au plus haut) */
export function positionCours(res: ResourceId, cours: Cours): number {
  const c = bornerCours(cours?.[res] ?? 1)
  return (c - COURS_MIN) / (COURS_MAX - COURS_MIN)
}

/** « au plus haut », « haut », « au pair »… - de quoi décider sans lire un multiplicateur */
export function motCours(res: ResourceId, cours: Cours): string {
  const c = bornerCours(cours?.[res] ?? 1)
  if (c >= 1.45) return 'au plus haut'
  if (c >= 1.15) return 'haut'
  if (c > 0.9) return 'au pair'
  if (c > 0.72) return 'bas'
  return 'au plus bas'
}

/**
 * Pourquoi ce cours-là. Sans cette liste, la fluctuation n'est qu'un chiffre qui
 * change tout seul : le joueur doit pouvoir relier le prix du grain à la
 * sécheresse qu'il subit.
 */
export function explicationCours(res: ResourceId, snap: SnapCommerce): string[] {
  const out: string[] = []
  if (res === NUMERAIRE) return ['Le lingot est l’unité de compte : tous les prix se disent en bronze.']
  const s = SAISONS[snap.saison]
  const prodSaison = s?.prod[res] ?? 1
  if (prodSaison < 0.95) out.push(`${s.emoji} ${s.nom} : la ressource se fait rare, le cours monte.`)
  if (prodSaison > 1.05) out.push(`${s.emoji} ${s.nom} : les réserves débordent, le cours cède.`)
  if (snap.merFermee) out.push('❄️ La mer est fermée : plus un bateau, donc tout renchérit.')
  if (snap.secheresse && res === 'grain') out.push('🔥 La sécheresse brûle les champs : le grain flambe.')
  const chantiers = Math.min(3, Math.max(0, snap.ruines))
  if (chantiers > 0 && (res === 'pierre' || res === 'bois'))
    out.push('🧱 On rebâtit partout après l’assaut : les matériaux sont demandés.')
  if (snap.menace > 55) out.push(`🗡️ La région est en armes (menace ${Math.round(snap.menace)}) : les routes coûtent cher.`)
  if (out.length === 0) out.push('Rien ne pousse ce cours dans un sens ou dans l’autre : il revient au pair.')
  return out
}

// ── 2. Les caravanes ─────────────────────────────────────────────────────────

/**
 * La route vers chaque place forte : combien d'étapes, et ce que le marché du
 * bout paie en plus. C'est une table écrite et non un calcul, parce que ces
 * huit lieux ont une géographie : Ténédos est une île, la Mysie est au bout du
 * monde, et le comptoir phénicien achète cher ce dont personne ne veut.
 */
export const ROUTES: Record<string, { etapes: number; bonus: number }> = {
  'camp-pillards': { etapes: 1, bonus: 0 },
  'hameau-thrace': { etapes: 2, bonus: 0 },
  'comptoir-phenicien': { etapes: 2, bonus: 0.15 },
  'village-dardanien': { etapes: 3, bonus: 0 },
  'fort-acheen': { etapes: 3, bonus: 0.05 },
  'cite-lesbos': { etapes: 4, bonus: 0.05 },
  'citadelle-tenedos': { etapes: 4, bonus: 0 },
  'forteresse-mysienne': { etapes: 5, bonus: 0 },
}

/** durée d'une étape, aller et retour compris */
export const DUREE_ETAPE_MS = 50_000

/**
 * Ce que la distance ajoute au prix, par étape au-delà de la première. Un quart :
 * il faut que la route de Mysie (cinq étapes, un tiers de chances d'y perdre la
 * charge) rapporte franchement plus, une fois le risque déduit, que l'aller-retour
 * tranquille au camp voisin - sinon personne n'irait jamais loin.
 */
export const PRIME_PAR_ETAPE = 0.25

/** charge minimale d'une caravane, et nombre de charretées qu'elle peut porter */
export const LOTS_MAX = 4

export function etapesVers(villageId: string): number {
  return ROUTES[villageId]?.etapes ?? 3
}

/** durée d'un aller-retour vers cette place forte */
export function dureeCaravane(villageId: string): number {
  return etapesVers(villageId) * DUREE_ETAPE_MS
}

/** le prix se majore de la distance : c'est tout le pari de la caravane */
export function primeCaravane(villageId: string): number {
  const r = ROUTES[villageId]
  return 1 + PRIME_PAR_ETAPE * (etapesVers(villageId) - 1) + (r?.bonus ?? 0)
}

/** risque de base, plancher et plafond : jamais gratuit, jamais perdu d'avance */
export const RISQUE_BASE = 0.05
export const RISQUE_PAR_ETAPE = 0.05
export const RISQUE_MIN = 0.02
export const RISQUE_MAX = 0.85

/** ce que le statut du village fait au danger de la route */
export const MULT_RISQUE_STATUT: Record<StatutVillage, number> = {
  marie: 0.2,
  allie: 0.35,
  ami: 0.7,
  neutre: 1,
  hostile: 1.4,
}

/**
 * Chance de perdre la charge, de 0 à 1. Trois termes seulement, pour que le
 * joueur puisse les tenir en tête : la longueur de la route, l'état de la
 * région, et ce que le village visé pense de vous.
 */
export function risqueCaravane(villageId: string, snap: SnapCommerce): number {
  let r = RISQUE_BASE + RISQUE_PAR_ETAPE * (etapesVers(villageId) - 1)
  r += (Math.max(0, snap.menace) / 100) * 0.25
  r -= (relationDe(snap, villageId) / 100) * 0.15
  r *= MULT_RISQUE_STATUT[statutDe(snap, villageId)]
  return Math.max(RISQUE_MIN, Math.min(RISQUE_MAX, r))
}

// ── 3. Les routes ────────────────────────────────────────────────────────────

/**
 * Au-delà de ce seuil de menace, les longues routes tombent. La formule est
 * volontairement simple : plus la route est longue, plus tôt elle se ferme.
 * Cinq étapes lâchent à 60 de menace, une seule tient jusqu'à 92.
 */
export function seuilMenaceRoute(villageId: string): number {
  return 100 - etapesVers(villageId) * 8
}

/** la route est-elle praticable ? Vaut pour les caravanes ET pour le tribut d'un allié. */
export function routeOuverte(villageId: string, snap: SnapCommerce): boolean {
  return raisonRouteFermee(villageId, snap) === null
}

/**
 * Pourquoi la route est coupée, en une phrase que le joueur peut corriger -
 * `null` si elle est ouverte. On rend la RAISON et non un simple booléen : une
 * route fermée sans motif est un bogue aux yeux du joueur.
 */
export function raisonRouteFermee(villageId: string, snap: SnapCommerce): string | null {
  const v = VILLAGES_PAR_ID[villageId]
  if (!v) return 'Cette place forte n’est pas sur vos cartes.'
  const nom = v.nom
  if (relationDe(snap, villageId) <= SEUIL_HOSTILE)
    return `${nom} vous est hostile : ses gardes refoulent vos marchands.`
  if (v.maritime && snap.merFermee) return `L’hiver a fermé la mer : aucune coque ne passe pour ${nom}.`
  const seuil = seuilMenaceRoute(villageId)
  if (snap.menace >= seuil)
    return `La région est en armes (menace ${Math.round(snap.menace)}) : la route de ${nom}, à ${etapesVers(villageId)} étapes, n’est plus tenue.`
  return null
}

/** caravanes qu'on peut tenir en même temps - le port en décide, comme de sa marge */
export function caravanesMax(port: number): number {
  if (port <= 0) return 0
  return Math.min(3, 1 + Math.floor(port / 2))
}

// ── Les destinations, telles que le panneau les présente ──────────────────────

export interface Destination {
  village: VillageCible
  etapes: number
  duree: number
  /** 0…1 */
  risque: number
  /** majoration du prix appliquée au bout de la route */
  prime: number
  statut: StatutVillage
}

/**
 * Les places fortes vers lesquelles une caravane peut réellement partir, de la
 * plus sûre à la plus risquée. Sans port, la liste est vide : le village n'a
 * personne pour organiser un convoi.
 */
export function caravanesPossibles(snap: SnapCommerce): Destination[] {
  if (snap.port <= 0) return []
  return VILLAGES_CIBLES.filter((v) => routeOuverte(v.id, snap))
    .map((v) => ({
      village: v,
      etapes: etapesVers(v.id),
      duree: dureeCaravane(v.id),
      risque: risqueCaravane(v.id, snap),
      prime: primeCaravane(v.id),
      statut: statutDe(snap, v.id),
    }))
    .sort((a, b) => a.risque - b.risque)
}

// ── La caravane elle-même ────────────────────────────────────────────────────

export interface Caravane {
  id: string
  villageId: string
  /** ce qu'on a chargé */
  charge: Cost
  partieA: number
  /** instant du retour attendu */
  retourA: number
  /**
   * Le risque figé au départ. On l'a MONTRÉ au joueur avant qu'il charge : il
   * serait déloyal de le recalculer au retour parce que la menace a monté entre
   * temps. La route est ce qu'elle était le jour du départ.
   */
  risque: number
  /** le gain espéré au cours du jour du départ - le récit s'y réfère au retour */
  attendu: number
}

/** une charretée de telle marchandise, prête à charger */
export function chargeCaravane(res: ResourceId, lots: number): Cost {
  const n = Math.max(1, Math.min(LOTS_MAX, Math.round(lots)))
  return { [res]: n * LOT_VENTE }
}

/**
 * Ce qu'une charge rapporte au bout de la route, en lingots. La caravane touche
 * le prix PLEIN (c'est vous le marchand, il n'y a pas de marge à payer) majoré
 * de la distance - c'est ce qui la rend meilleure que le quai, et c'est ce qu'on
 * paie en temps et en risque.
 */
export function gainCaravane(villageId: string, charge: Cost, cours: Cours): number {
  const prime = primeCaravane(villageId)
  let total = 0
  for (const res of RES_MARCHANDES) {
    const n = charge?.[res] ?? 0
    if (n > 0) total += (n / LOT_VENTE) * valeurLot(res, cours) * prime
  }
  return Math.round(total)
}

/** monte la caravane qui part : le store n'a qu'à l'ajouter à sa liste */
export function creerCaravane(id: string, villageId: string, charge: Cost, snap: SnapCommerce): Caravane {
  return {
    id,
    villageId,
    charge,
    partieA: snap.now,
    retourA: snap.now + dureeCaravane(villageId),
    risque: risqueCaravane(villageId, snap),
    attendu: gainCaravane(villageId, charge, snap.cours),
  }
}

/** « 150 grain », « 100 bois et 50 pierre » - la charge, en clair */
export function resumeCharge(charge: Cost): string {
  const parts = RES_MARCHANDES.filter((r) => (charge?.[r] ?? 0) > 0).map(
    (r) => `${charge[r]} ${RES[r].nom.toLowerCase()}`,
  )
  if (parts.length === 0) return 'rien'
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`
}

/** ce qui a mangé la caravane - choisi dans la bande d'échec, donc reproductible */
function malheur(v: VillageCible, part: number): string {
  if (v.maritime) {
    return part < 0.5
      ? `Une bourrasque a jeté la coque à la côte avant ${v.nom} : la charge est au fond.`
      : `Des écumeurs ont abordé le bateau en vue de ${v.nom} et tout emporté.`
  }
  if (part < 0.34) return `Des pillards ont coupé la route de ${v.nom} et pris la charge.`
  if (part < 0.67) return `Un péage armé s’est dressé avant ${v.nom} : les muletiers ont tout laissé pour passer.`
  return `Les gardes de ${v.nom} ont saisi la charge sous un prétexte quelconque.`
}

/**
 * Ce que la caravane rapporte. `roll` (0…1) est tiré par le store au moment de
 * la résolution ; sous le risque, la charge est perdue.
 *
 * Le prix est celui du RETOUR, pas celui du départ : c'est ce qui fait qu'une
 * longue route est un vrai pari, et le récit dit toujours de combien les cours
 * ont tourné pendant le voyage.
 */
export function resoudreCaravane(
  caravane: Caravane,
  snap: SnapCommerce,
  roll: number,
): { perdue: boolean; gain: Cost; recit: string[] } {
  const v = VILLAGES_PAR_ID[caravane.villageId]
  const nom = v?.nom ?? 'une place forte'
  if (!v) return { perdue: true, gain: {}, recit: ['La caravane s’est perdue en chemin.'] }

  if (roll < caravane.risque) {
    const part = caravane.risque > 0 ? Math.max(0, Math.min(0.999, roll / caravane.risque)) : 0
    return {
      perdue: true,
      gain: {},
      recit: [
        malheur(v, part),
        `Perdu : ${resumeCharge(caravane.charge)}. Les muletiers sont rentrés à pied.`,
      ],
    }
  }

  const gain = gainCaravane(caravane.villageId, caravane.charge, snap.cours)
  const recit = [
    `La caravane est rentrée de ${nom} sans encombre.`,
    `Vendu : ${resumeCharge(caravane.charge)} → ${gain} lingot${gain > 1 ? 's' : ''} de bronze.`,
  ]
  if (gain > caravane.attendu * 1.08) recit.push(`Les cours ont monté pendant le voyage : ${gain - caravane.attendu} lingots de plus qu’espéré.`)
  else if (gain < caravane.attendu * 0.92) recit.push(`Les cours ont fléchi pendant le voyage : ${caravane.attendu - gain} lingots de moins qu’espéré.`)
  return { perdue: false, gain: { bronze: gain }, recit }
}

/** les caravanes dont l'heure est passée - le tick n'a plus qu'à les résoudre */
export function caravanesEchues(caravanes: Caravane[], now: number): Caravane[] {
  return (caravanes ?? []).filter((c) => now >= c.retourA)
}
