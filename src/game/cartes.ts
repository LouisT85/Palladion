import { carteValide, rapportValide, type CarteDefense, type IssueRaid, type PanId, type RapportRaid } from './duel'
import type {
  BuildingId,
  DefensesInterieures,
  HeroId,
  OrdreLigne,
  OrdreTir,
  ResourceId,
  UnitId,
} from './types'

/*
 * ═════════════════ LE COURRIER : DEUX CODES, ET RIEN D'AUTRE ═════════════════
 *
 * PALLADION n'a pas de serveur et n'en aura pas. Pour qu'un joueur puisse raider
 * la cité d'un autre, il faut donc que la cité VOYAGE - et elle ne peut voyager
 * que sous la forme qu'on colle dans un message. Ce module est ce format, et
 * rien de plus : il encode, il décode, il ne lit pas le store et n'écrit rien.
 *
 *  ① `PALL-D1-…` LA CARTE DE DÉFENSE (`CarteDefense`). Tout ce qu'il faut pour
 *    attaquer une cité, et rien de plus.
 *  ② `PALL-R1-…` LE RAPPORT DE RAID (`RapportRaid`). La carte attaquée ENTIÈRE,
 *    la colonne, les PANS assaillis, la graine, l'issue prétendue, et la carte de
 *    l'attaquant - sans quoi la revanche serait impossible et le système à sens
 *    unique.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE MODULE NE DÉFINIT AUCUN CHAMP. `duel.ts` FAIT FOI.
 *
 * C'est la première règle du fichier, et elle a été payée : deux modèles de
 * `CarteDefense` ont coexisté quelques jours - l'un ici, l'autre dans `duel.ts` -
 * et ils ne portaient pas les mêmes champs. Celui d'ici transportait la maison
 * régnante et les traits du chef ; celui des règles portait `atk`, `reduc`,
 * `butin`, `jour` et `serie`, dont dépendent l'empreinte, le plafond du butin et
 * l'unicité du chèque. Un code écrit par l'un ne décrivait donc RIEN de ce que
 * l'autre allait juger : chaque rapport honnête serait tombé sur `'inconnue'`.
 *
 * Les trois interfaces sont donc IMPORTÉES, jamais redéclarées, et le résultat de
 * tout décodage repasse par les désinfectants de `duel.ts` (`carteValide`,
 * `rapportValide`, qui appelle lui-même `colonneValide` et `pansValides`). Une
 * carte qui sort d'ici est bornée par les règles du jeu, pas par les miennes.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CINQ DÉCISIONS DE FORME, ET LE DÉFAUT QUE CHACUNE ÉVITE
 *
 * · UN TABLEAU DE BITS, PAS DU JSON. MESURÉ, sur la même cité de niveau 4
 *   complète (garnison au plafond des règles, les huit héros, plan entier, butin
 *   plafonné, nom de quarante caractères) :
 *
 *     `btoa(JSON.stringify(carte))` ......... 1 432 caractères
 *     champs fixes en bits, base64url .......... 187 caractères
 *
 *   Sept fois moins, et surtout du bon côté de la seule limite qui compte : un
 *   code qu'on ne peut pas coller d'un bloc dans un message est un code qu'on
 *   recopiera de travers, ou qu'on ne renverra pas. Chaque champ prend donc
 *   EXACTEMENT le nombre de bits qu'il lui faut - 3 pour un niveau, 1 pour un
 *   ouvrage bâti ou non, et un bit de présence devant chaque effectif comme
 *   devant chaque part de butin, ce qui fait tomber un village nu à 79
 *   caractères. Un rapport, qui porte DEUX cités entières, va de 294 caractères
 *   (l'ordinaire) à 419 (deux cités maximales). Les mesures sont refaites à
 *   chaque exécution (`cartes.test.ts` §1) : la borne des 900 caractères du
 *   contrat est gardée par un test, pas par une intention.
 *
 * · LE FORMAT POSSÈDE SES PROPRES LISTES ORDONNÉES (`BATIMENTS_CODE`,
 *   `UNITES_CODE`, `HEROS_CODE`…) et ne dérive JAMAIS son ordre de `data.ts` ni
 *   de `heros.ts`. La raison est brutale : un index sur le fil est un contrat
 *   gravé, et réordonner `HEROS` pour l'affichage - ce que personne ne penserait
 *   à faire précautionneusement - transformerait silencieusement tous les Hector
 *   déjà échangés en Ulysse. Les listes d'ici sont écrites à la main et FIGÉES ;
 *   `cartes.test.ts` §0 vérifie qu'elles couvrent exactement les listes du jeu,
 *   si bien qu'un héros ajouté ailleurs casse un test au lieu de corrompre un
 *   code.
 *
 * · `atk` ET `reduc` VOYAGENT AU BIT PRÈS, SUR HUIT OCTETS CHACUN. Ce sont les
 *   deux seuls nombres à virgule du format, et ils coûtent seize octets là où
 *   deux auraient suffi à les rendre au dix-millième. C'est le prix de la
 *   serrure : `empreinteCarte` hache `atk.toFixed(4)`, et un cumul de passifs
 *   réel ne tombe pas sur une grille décimale (1 + 0,15 + 0,25 vaut
 *   1,4000000000000001 en machine). Arrondir au dix-millième aurait rendu une
 *   carte MINUSCULEMENT différente de celle que le défenseur a signée, donc une
 *   autre empreinte, donc `'inconnue'` sur tous les rapports honnêtes - le pire
 *   défaut possible de ce système, celui qui ne se voit qu'entre deux joueurs.
 *
 * · LA GRAINE PREND TRENTE-TROIS BITS, ET CE N'EST PAS UNE COQUETTERIE.
 *   `graineRaid` rend `empreinte(...) + 1`, et l'empreinte vaut au plus
 *   0xFFFFFFFF : une graine peut donc valoir 2^32 tout rond. Écrite sur
 *   trente-deux bits par décalages, cette valeur-là revenait à ZÉRO, le défenseur
 *   recalculait la vraie graine, ne la retrouvait pas dans le rapport, et
 *   refusait pour `'graine'` un assaut parfaitement honnête - une fois sur quatre
 *   milliards, donc jamais en test et un jour chez un joueur.
 *
 * · TOUT CE QUI ENTRE EST DÉSINFECTÉ, ET LE DÉCODEUR NE LÈVE JAMAIS. C'est la
 *   leçon d'`importerTexte` (sauvegardes.ts) : « remplacer un règne de dix heures
 *   par le contenu d'un fichier au hasard serait la pire chose que ce module
 *   puisse faire ». Ici c'est pire encore, parce que le texte vient d'un
 *   ADVERSAIRE : il a intérêt à mentir. Un code tronqué, recopié avec un retour à
 *   la ligne au milieu, une lettre changée, fabriqué à la main, vide, ou long de
 *   cent mille caractères se refuse chacun AVEC SON MOTIF (`RefusCode`), et un
 *   code qui passe toutes les portes est encore borné champ par champ par
 *   `carteValide`. `cartes.test.ts` §5 lance mille codes bruités à graine fixe :
 *   aucun ne doit lever.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE CE MODULE NE FAIT PAS, ET POURQUOI C'EST IMPORTANT
 *
 * Il ne juge PAS si un rapport dit vrai, et il ne porte AUCUNE identité de carte.
 * La somme de contrôle protège de la recopie fautive, pas du mensonge : quatre
 * octets se refabriquent en une seconde, et il n'y a pas de secret à cacher dans
 * un client qu'on peut lire. La serrure est ailleurs, et il n'y en a qu'une -
 * `empreinteCarte` (duel.ts), calculée sur la forme canonique de la carte. Ce
 * module lui livre les champs exacts au bit près, et c'est tout ce qu'on lui
 * demande.
 */

// ── Les listes ordonnées du format. FIGÉES. Voir l'en-tête. ──────────────────

/** l'ordre des onze bâtiments sur le fil - jamais réordonner, seulement ajouter en queue */
export const BATIMENTS_CODE: BuildingId[] = [
  'agora',
  'remparts',
  'maisons',
  'ferme',
  'scierie',
  'carriere',
  'forge',
  'caserne',
  'temple',
  'port',
  'redoute',
]

/** l'ordre des sept types de troupe sur le fil */
export const UNITES_CODE: UnitId[] = ['lancier', 'archer', 'hoplite', 'frondeur', 'peltaste', 'belier', 'char']

/** l'ordre des huit héros sur le fil */
export const HEROS_CODE: HeroId[] = [
  'hector',
  'ulysse',
  'achille',
  'ajax',
  'agamemnon',
  'cassandre',
  'enee',
  'diomede',
]

/**
 * L'ordre des pans de l'enceinte sur le fil. Il sert DEUX fois : le pan que tient
 * chaque unité dans un plan (0 vaut « aucun pan assigné »), et le masque des pans
 * assaillis d'un rapport, un bit par pan.
 */
export const PANS_CODE: PanId[] = ['porte', 'sud', 'nord']

/** l'ordre des quatre ressources sur le fil (le butin mis en jeu) */
export const RES_CODE: ResourceId[] = ['bois', 'pierre', 'grain', 'bronze']

/** l'ordre des trois postures de ligne sur le fil */
export const LIGNES_CODE: OrdreLigne[] = ['tenir', 'mur', 'charge']

/** l'ordre des deux façons de tirer sur le fil */
export const TIRS_CODE: OrdreTir[] = ['tendu', 'cloche']

/** les quatre ouvrages du dedans qui n'ont qu'un niveau - l'acropole en a plusieurs */
const OUVRAGES_BINAIRES: (keyof DefensesInterieures)[] = ['bastion', 'galeries', 'poterne', 'citerne']

// ── Les largeurs de champ. Chacune est un contrat gravé. ─────────────────────

/*
 * ⚠️ CHAQUE LARGEUR DOIT COUVRIR LA BORNE QUE `carteValide` APPLIQUE, sans quoi
 * une carte parfaitement légale ne survivrait pas au fil : le format écrêterait un
 * champ que les règles acceptent, l'empreinte changerait, et le rapport honnête
 * tomberait sur `'inconnue'`. `cartes.test.ts` §0 compare les largeurs aux bornes
 * de `duel.ts` une par une - c'est le seul test qui garde ce couplage.
 */

/**
 * Un niveau tient sur 3 bits : bâtiment, remparts, Redoute, acropole. Cinq
 * valeurs suffiraient (0-4), 3 bits en laissent huit - de quoi ajouter un
 * cinquième niveau sans changer la version du format, et `carteValide` reborne de
 * toute façon, donc un 7 fabriqué à la main retombe à 4.
 */
const L_NIVEAU = 3
/**
 * Un effectif tient sur 16 bits, soit 65 535 hommes par type. C'est absurde en
 * jeu et c'est voulu : LE FORMAT NE DOIT PAS ÊTRE CE QUI PLAFONNE UNE GARNISON.
 * `GARNISON_MAX_PAR_UNITE` vaut soixante aujourd'hui et peut tripler demain sans
 * qu'un seul bit change ici - alors qu'un champ trop juste se paierait en cartes
 * écrêtées, donc en empreintes fausses.
 */
export const EFFECTIF_MAX = 65535
const L_EFFECTIF = 16
/** structure de l'enceinte : `WALL_HP[4]` vaut 2 200, et `carteValide` en tolère le double */
const L_STRUCTURE = 16
/** une part de butin : `PLAFOND_BUTIN_PAR_RES` vaut 300, et le format ne veut pas être son plafond */
const L_BUTIN = 16
/** un pan assigné : 0 = aucun, sinon rang dans `PANS_CODE` + 1 */
const L_PAN = 3
/** nombre de tours sur l'enceinte - `TOURS_MAX[4]` en vaut 4 */
const L_TOURS = 3
/** un niveau de héros, 1 à 5 */
const L_NIVEAU_HEROS = 3
/**
 * La graine, sur TRENTE-TROIS bits. Voir l'en-tête : `graineRaid` rend
 * `empreinte(...) + 1`, donc 2^32 est une graine atteignable, et trente-deux bits
 * l'auraient ramenée à zéro.
 */
const L_GRAINE = 33
/** nombre d'étoiles réclamées, 0 à 3 */
const L_ETOILES = 2
/**
 * La journée d'émission et le rang de la carte dans le règne : 24 bits chacun,
 * soit 16 777 215, quand `carteValide` les borne à dix millions. Un règne de trois
 * heures compte une trentaine de journées ; la marge est là pour la sauvegarde
 * reprise à la main, pas pour le jeu.
 */
const L_JOUR = 24
const L_SERIE = 24
/** longueur d'un texte en octets, et longueur du corps embarqué */
const L_OCTET = 8
const L_LONGUEUR = 16
/** un nombre à virgule : huit octets, l'IEEE-754 tel quel. Voir l'en-tête. */
const L_REEL = 8

// ── Les préfixes et les versions ─────────────────────────────────────────────

export const PREFIXE_CARTE = 'PALL-D'
export const PREFIXE_RAPPORT = 'PALL-R'
export const VERSION_CARTE = 1
export const VERSION_RAPPORT = 1

/**
 * Au-delà, on refuse sans même regarder. Une carte fait de 79 à 262 caractères et
 * un rapport - qui en porte DEUX, la cible et la riposte - de 294 à 419 : 4 000
 * laisse dix fois la marge nécessaire à une version future, et coupe court à un
 * collage de cent mille caractères - qu'on ne doit NI décoder, NI parcourir, NI
 * hacher, sous peine de figer l'onglet du joueur sur un texte que quelqu'un lui a
 * envoyé pour le figer.
 *
 * Elle sert DEUX fois dans `deballer`, et l'ordre importe : `MAX_CODE * 8` sur le
 * texte BRUT avant l'essuyage des blancs (le facteur laisse passer un code abîmé
 * jusqu'à porter une espace entre chaque caractère), puis `MAX_CODE` sur le texte
 * essuyé. Ne garder que la seconde porte, c'était offrir à qui colle dix millions
 * de caractères la seconde pleine que met `replace` à les parcourir - mesuré, et
 * gardé par un test depuis.
 */
export const MAX_CODE = 4000

// ── Ce qu'on refuse, et comment on le dit ────────────────────────────────────

export type RefusCode =
  /** rien à lire : le presse-papier était vide */
  | 'vide'
  /** cent mille caractères : on ne les regarde même pas */
  | 'enorme'
  /** ce n'est pas un code de PALLADION */
  | 'prefixe'
  /** c'en est un, mais de l'autre sorte : un rapport là où on attend une carte */
  | 'genre'
  /** il vient d'une version que ce jeu ne sait pas lire */
  | 'version'
  /** des caractères qui n'appartiennent pas à l'alphabet du format */
  | 'caracteres'
  /** coupé, ou rallongé : la longueur annoncée ne tombe pas */
  | 'tronque'
  /** une lettre a changé en route, ou le code a été fabriqué à la main */
  | 'somme'

/** ce qu'une lecture rend : la valeur, ou le refus et son motif */
export type Lecture<T> = { ok: true; valeur: T } | { ok: false; refus: RefusCode; motif: string }

/**
 * Le refus dit au joueur dans ses termes. Un code refusé sans motif est la
 * première cause d'abandon : le joueur ne sait pas s'il a mal collé, si son
 * adversaire s'est trompé, ou si le jeu est cassé - et il conclut toujours la
 * troisième.
 */
export function motifRefusCode(r: RefusCode): string {
  switch (r) {
    case 'vide':
      return 'Il n’y a rien à lire : collez le code que votre adversaire vous a envoyé.'
    case 'enorme':
      return 'Ce texte est bien trop long pour être un code de PALLADION. Ne collez que la ligne qui commence par « PALL- ».'
    case 'prefixe':
      return 'Ce n’est pas un code de PALLADION. Un code commence par « PALL-D » (une cité) ou « PALL-R » (un rapport de raid).'
    case 'genre':
      return 'Ce code est bien de PALLADION, mais ce n’est pas celui qu’on attend ici.'
    case 'version':
      return 'Ce code vient d’une autre version de PALLADION. Mettez le jeu à jour, ou demandez un code à jour.'
    case 'caracteres':
      return 'Ce code contient des caractères étrangers au format : il a été abîmé par le copier-coller. Redemandez-le.'
    case 'tronque':
      return 'Ce code n’est pas entier : il a été coupé à la recopie. Recollez-le en une seule fois, sans rien laisser.'
    case 'somme':
      return 'Ce code ne se relit pas : sa somme de contrôle ne tombe pas juste. Une lettre a changé en route, ou il a été fabriqué.'
  }
}

const refus = <T>(r: RefusCode, motif?: string): Lecture<T> => ({ ok: false, refus: r, motif: motif ?? motifRefusCode(r) })

// ── L'écriture et la lecture des bits ────────────────────────────────────────

/**
 * L'écrivain à bits. Tout passe par lui, y compris les octets d'un nom et ceux
 * d'un nombre à virgule : mélanger l'écriture bit à bit et l'écriture octet par
 * octet aurait demandé un alignement, et un alignement est exactement le genre de
 * détail qui fait qu'un champ se relit décalé d'un bit une fois sur huit.
 */
class Plume {
  private octets: number[] = []
  private acc = 0
  private n = 0

  private bit(b: number): void {
    this.acc = (this.acc << 1) | (b & 1)
    this.n++
    if (this.n === 8) {
      this.octets.push(this.acc & 0xff)
      this.acc = 0
      this.n = 0
    }
  }

  nombre(v: number, largeur: number): void {
    const plafond = 2 ** largeur - 1
    const brut = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0
    const x = Math.max(0, Math.min(plafond, brut)) >>> 0
    for (let i = largeur - 1; i >= 0; i--) this.bit((x >>> i) & 1)
  }

  /**
   * Un nombre qui peut dépasser trente-deux bits. Il s'écrit par DIVISIONS et non
   * par décalages, et c'est toute la raison de cette méthode : `x >>> 32` vaut `x`
   * en JavaScript, et `2**32 >>> 0` vaut ZÉRO. La graine de `graineRaid`
   * (`empreinte(...) + 1`) atteint exactement cette valeur une fois sur quatre
   * milliards ; écrite par `nombre`, elle serait partie à zéro et le défenseur
   * aurait refusé pour `'graine'` un rapport honnête.
   */
  grand(v: number, largeur: number): void {
    const plafond = 2 ** largeur - 1
    const brut = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0
    const x = Math.max(0, Math.min(plafond, brut))
    for (let i = largeur - 1; i >= 0; i--) this.bit(Math.floor(x / 2 ** i) % 2)
  }

  /**
   * Un nombre à virgule, TEL QUEL : les huit octets de l'IEEE-754. Voir l'en-tête -
   * `atk` et `reduc` entrent dans l'empreinte par leur `toFixed(4)`, et une carte
   * arrondie en chemin n'est plus la carte que le défenseur a signée.
   */
  reel(v: number): void {
    const vue = new DataView(new ArrayBuffer(L_REEL))
    vue.setFloat64(0, typeof v === 'number' ? v : 0)
    for (let k = 0; k < L_REEL; k++) this.nombre(vue.getUint8(k), L_OCTET)
  }

  drapeau(b: boolean): void {
    this.nombre(b ? 1 : 0, 1)
  }

  /** un texte : sa longueur en octets, puis ses octets UTF-8 */
  texte(s: string): void {
    const o = new TextEncoder().encode(s)
    this.nombre(o.length, L_OCTET)
    for (const b of o) this.nombre(b, L_OCTET)
  }

  /** un corps embarqué : sa longueur, puis ses octets (une carte dans un rapport) */
  bloc(o: Uint8Array): void {
    this.nombre(o.length, L_LONGUEUR)
    for (const b of o) this.nombre(b, L_OCTET)
  }

  fermer(): Uint8Array {
    // le dernier octet est complété par des zéros : ils ne se relisent jamais,
    // puisque la longueur du corps est écrite dans l'en-tête du code
    if (this.n > 0) this.octets.push((this.acc << (8 - this.n)) & 0xff)
    return new Uint8Array(this.octets)
  }
}

/**
 * Le lecteur à bits. Il ne LÈVE JAMAIS : lire au-delà de la fin rend des zéros et
 * lève le drapeau `deborde`, qu'on interroge une fois à la fin. Une exception au
 * milieu d'un décodage aurait demandé un `try` autour de chaque lecture, et il
 * aurait suffi d'en oublier un pour qu'un code fabriqué fasse tomber l'onglet.
 */
class Oeil {
  private i = 0
  deborde = false

  constructor(private readonly octets: Uint8Array) {}

  nombre(largeur: number): number {
    let v = 0
    for (let k = 0; k < largeur; k++) {
      let bit = 0
      if (this.i < this.octets.length * 8) bit = (this.octets[this.i >> 3] >> (7 - (this.i & 7))) & 1
      else this.deborde = true
      this.i++
      // `v * 2` et non `v << 1` : un mot de 32 bits lu au décalage deviendrait
      // négatif dès que son bit de poids fort est à 1, et les trente-trois bits
      // d'une graine n'y tiendraient même pas
      v = v * 2 + bit
    }
    return v
  }

  /** les huit octets d'un IEEE-754, rendus tels quels. NaN compris : `carteValide` le borne. */
  reel(): number {
    const vue = new DataView(new ArrayBuffer(L_REEL))
    for (let k = 0; k < L_REEL; k++) vue.setUint8(k, this.nombre(L_OCTET))
    return vue.getFloat64(0)
  }

  drapeau(): boolean {
    return this.nombre(1) === 1
  }

  texte(): string {
    const n = this.nombre(L_OCTET)
    const o = new Uint8Array(n)
    for (let k = 0; k < n; k++) o[k] = this.nombre(L_OCTET)
    // `fatal: false` par défaut : de l'UTF-8 abîmé donne des losanges, pas une
    // exception - et `carteValide` borne la longueur juste après
    return new TextDecoder().decode(o)
  }

  bloc(): Uint8Array {
    const n = this.nombre(L_LONGUEUR)
    const o = new Uint8Array(n)
    for (let k = 0; k < n; k++) o[k] = this.nombre(L_OCTET)
    return o
  }
}

// ── L'alphabet base64url, écrit à la main ────────────────────────────────────

/*
 * `btoa` aurait suffi à l'aller, mais pas au retour : `atob` accepte des espaces,
 * refuse en levant, et travaille en Latin-1 - trois comportements qu'on ne veut
 * pas ici, où le refus doit être un motif et non une exception. Trente lignes
 * écrites à la main donnent le contrôle exact sur ce qui est accepté, et
 * `base64url` (avec `-` et `_`, sans `=`) survit à un collage dans une URL comme
 * dans un message.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const RANGS: Record<string, number> = Object.fromEntries(Array.from(ALPHABET, (c, i) => [c, i]))

function versB64u(o: Uint8Array): string {
  let out = ''
  for (let i = 0; i < o.length; i += 3) {
    const a = o[i]
    const b = i + 1 < o.length ? o[i + 1] : 0
    const c = i + 2 < o.length ? o[i + 2] : 0
    const mot = (a << 16) | (b << 8) | c
    out += ALPHABET[(mot >> 18) & 63] + ALPHABET[(mot >> 12) & 63]
    if (i + 1 < o.length) out += ALPHABET[(mot >> 6) & 63]
    if (i + 2 < o.length) out += ALPHABET[mot & 63]
  }
  return out
}

/** `null` quand un caractère n'appartient pas à l'alphabet - jamais d'exception */
function depuisB64u(s: string): Uint8Array | null {
  const rangs: number[] = []
  for (const c of s) {
    const r = RANGS[c]
    if (r === undefined) return null
    rangs.push(r)
  }
  // un groupe d'un seul caractère ne code aucun octet entier : c'est un code
  // coupé au mauvais endroit, et le dire ici vaut mieux que rendre un octet faux
  if (rangs.length % 4 === 1) return null
  const out = new Uint8Array(Math.floor((rangs.length * 6) / 8))
  let j = 0
  for (let i = 0; i < rangs.length; i += 4) {
    const n = Math.min(4, rangs.length - i)
    let mot = 0
    for (let k = 0; k < 4; k++) mot = (mot << 6) | (k < n ? rangs[i + k] : 0)
    if (j < out.length) out[j++] = (mot >> 16) & 0xff
    if (j < out.length) out[j++] = (mot >> 8) & 0xff
    if (j < out.length) out[j++] = mot & 0xff
  }
  return out
}

/**
 * Le hachage FNV-1a sur 32 bits, celui-là même qu'emploie `empreinteCarte` sur la
 * forme canonique d'une carte. Il n'a pas à être bon en cryptographie et il ne
 * prétend pas l'être : quatre octets se refabriquent, et un client qu'on peut lire
 * ne cache aucun secret. Il attrape ce qu'il doit attraper - la lettre changée à la
 * recopie, le code coupé, le collage de deux moitiés - et l'honnêteté du duel vient
 * d'ailleurs (on rejoue le combat, voir l'en-tête).
 */
export function empreinte(o: Uint8Array): number {
  let h = 2166136261
  for (let i = 0; i < o.length; i++) {
    h ^= o[i]
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// ── L'enveloppe : version, longueur, corps, somme ────────────────────────────

/**
 * Sept octets d'enveloppe : la version (1), la longueur du corps (2), la somme
 * de contrôle (4).
 *
 * La LONGUEUR n'est pas une redondance de la base64 : sans elle, un code amputé
 * de trois caractères se serait signalé par une somme fausse - « ce code a été
 * fabriqué » - alors qu'il a simplement été coupé en le recopiant, ce qui n'est
 * pas la même chose à dire au joueur et n'appelle pas le même geste.
 */
const ENVELOPPE = 7

function emballer(version: number, corps: Uint8Array): string {
  const somme = empreinte(corps)
  const tout = new Uint8Array(ENVELOPPE + corps.length)
  tout[0] = version & 0xff
  tout[1] = (corps.length >> 8) & 0xff
  tout[2] = corps.length & 0xff
  tout.set(corps, 3)
  tout[3 + corps.length] = (somme >>> 24) & 0xff
  tout[4 + corps.length] = (somme >>> 16) & 0xff
  tout[5 + corps.length] = (somme >>> 8) & 0xff
  tout[6 + corps.length] = somme & 0xff
  return versB64u(tout)
}

/**
 * Toutes les portes, dans l'ordre où elles doivent se fermer : du refus qui ne
 * coûte rien (un texte vide, cent mille caractères) vers celui qui coûte un
 * hachage. Un code hostile ne doit jamais faire travailler le jeu avant d'avoir
 * franchi les portes gratuites.
 */
function deballer(texte: unknown, lettre: 'D' | 'R', version: number): Lecture<Uint8Array> {
  if (typeof texte !== 'string') return refus('vide')
  /*
   * LA LONGUEUR BRUTE SE JUGE AVANT LE MOINDRE PARCOURS, et c'est tout l'intérêt
   * de cette ligne : `replace` scanne ce qu'on lui donne, et dix millions de
   * caractères collés dans le champ lui prennent une seconde pleine - MESURÉ. Une
   * seconde d'onglet figé, offerte à qui envoie ce texte exprès, alors que la porte
   * « enorme » existait justement pour ne pas les regarder.
   *
   * Le facteur huit, et non `MAX_CODE` tout court : on accepte encore un code
   * abîmé jusqu'à porter une espace entre chaque caractère (§3 bis), ce qui double
   * sa longueur, et un collage indenté en ajoute encore. Huit fois laisse passer
   * tout ce qui est récupérable et arrête tout ce qui est hostile.
   */
  if (texte.length > MAX_CODE * 8) return refus('enorme')
  // on essuie TOUS les blancs, pas seulement les bords : un code recopié depuis
  // un message est très souvent replié sur deux lignes, et un retour à la ligne
  // au milieu ne doit pas être un refus - c'est le cas le plus fréquent de tous
  const brut = texte.replace(/\s+/g, '')
  if (brut.length === 0) return refus('vide')
  if (brut.length > MAX_CODE) return refus('enorme')
  const m = /^PALL-([A-Z])([0-9]{1,3})-(.*)$/i.exec(brut)
  if (!m) return refus('prefixe')
  const genre = m[1].toUpperCase()
  if (genre !== 'D' && genre !== 'R') return refus('prefixe')
  if (genre !== lettre) {
    return refus(
      'genre',
      genre === 'D'
        ? 'Ceci est la carte d’une cité (« PALL-D »), pas un rapport de raid. Collez-la là où l’on choisit sa cible.'
        : 'Ceci est un rapport de raid (« PALL-R »), pas la carte d’une cité. Collez-le là où l’on relit ses assauts.',
    )
  }
  const v = Number(m[2])
  if (!Number.isInteger(v) || v < 1 || v > version) {
    return refus(
      'version',
      `Ce code est en version ${m[2]} et ce jeu lit la version ${version}. ${
        v > version ? 'Mettez PALLADION à jour.' : 'Demandez un code à jour à votre adversaire.'
      }`,
    )
  }
  const octets = depuisB64u(m[3])
  if (!octets) return refus('caracteres')
  if (octets.length < ENVELOPPE) return refus('tronque')
  if (octets[0] !== v) return refus('version', `L’en-tête de ce code se contredit : il s’annonce en deux versions.`)
  const longueur = (octets[1] << 8) | octets[2]
  if (octets.length !== ENVELOPPE + longueur) return refus('tronque')
  const corps = octets.subarray(3, 3 + longueur)
  const somme =
    ((octets[3 + longueur] << 24) | (octets[4 + longueur] << 16) | (octets[5 + longueur] << 8) | octets[6 + longueur]) >>>
    0
  if (empreinte(corps) !== somme) return refus('somme')
  return { ok: true, valeur: corps }
}

// ── Le corps d'une carte ─────────────────────────────────────────────────────

/** le rang d'un pan sur le fil : 0 vaut « aucun », et un pan inconnu vaut « aucun » aussi */
const rangDuPan = (pan: PanId | undefined): number => (pan === undefined ? 0 : PANS_CODE.indexOf(pan) + 1)

/** l'inverse, et il refuse la même chose : un rang qu'on ne connaît pas ne poste personne */
const panDuRang = (i: number): PanId | undefined => (i > 0 ? PANS_CODE[i - 1] : undefined)

/*
 * L'ORDRE DES CHAMPS SUR LE FIL EST CELUI DE `CarteDefense` DANS `duel.ts`, champ
 * pour champ. Ce n'est pas de l'esthétique : c'est ce qui permet de relire les deux
 * fichiers côte à côte et de voir d'un coup d'œil qu'aucun champ ne manque. Un
 * champ oublié ici ne casse rien de visible - le code se relit, la cité paraît
 * normale - mais l'empreinte change, et TOUS les rapports honnêtes tombent sur
 * `'inconnue'`. C'est le défaut le plus coûteux que ce module puisse avoir.
 */
function ecrireCorpsCarte(c: CarteDefense, p: Plume): void {
  p.texte(c.cite)
  p.nombre(c.mur, L_NIVEAU)
  p.nombre(c.murHp, L_STRUCTURE)
  p.nombre(c.tours, L_TOURS)
  p.nombre(c.redoute, L_NIVEAU)
  // un bit de présence devant chaque effectif : une cité sans garnison coûte
  // sept bits au lieu de cent douze, et c'est le cas le plus fréquent en début
  // de partie comme au lendemain d'un assaut perdu
  for (const u of UNITES_CODE) {
    const n = c.garnison[u] ?? 0
    p.drapeau(n > 0)
    if (n > 0) p.nombre(n, L_EFFECTIF)
  }
  p.nombre(c.interieur.acropole, L_NIVEAU)
  for (const o of OUVRAGES_BINAIRES) p.drapeau(c.interieur[o] === true)
  p.nombre(Math.max(0, LIGNES_CODE.indexOf(c.plan.ligne)), 2)
  p.nombre(Math.max(0, TIRS_CODE.indexOf(c.plan.tir)), 1)
  for (const u of UNITES_CODE) p.nombre(rangDuPan(c.plan.pans[u]), L_PAN)
  for (const h of HEROS_CODE) p.nombre(rangDuPan(c.plan.heros[h]), L_PAN)
  for (const h of HEROS_CODE) {
    const niveau = c.heros.find((x) => x.id === h)?.niveau
    p.drapeau(niveau !== undefined)
    if (niveau !== undefined) p.nombre(niveau, L_NIVEAU_HEROS)
  }
  p.reel(c.atk)
  p.reel(c.reduc)
  for (const b of BATIMENTS_CODE) p.nombre(c.niveaux[b] ?? 0, L_NIVEAU)
  for (const r of RES_CODE) {
    const n = c.butin[r] ?? 0
    p.drapeau(n > 0)
    if (n > 0) p.nombre(n, L_BUTIN)
  }
  p.nombre(c.jour, L_JOUR)
  p.nombre(c.serie, L_SERIE)
}

function lireCorpsCarte(o: Oeil): CarteDefense {
  const cite = o.texte()
  const mur = o.nombre(L_NIVEAU)
  const murHp = o.nombre(L_STRUCTURE)
  const tours = o.nombre(L_TOURS)
  const redoute = o.nombre(L_NIVEAU)
  const garnison: Partial<Record<UnitId, number>> = {}
  for (const u of UNITES_CODE) {
    const n = o.drapeau() ? o.nombre(L_EFFECTIF) : 0
    if (n > 0) garnison[u] = n
  }
  /*
   * L'ORDRE DES CINQ LIGNES CI-DESSOUS EST L'ORDRE DU FIL - celui de
   * `OUVRAGES_BINAIRES`, l'acropole en tête. Un littéral d'objet évalue ses
   * propriétés dans l'ordre du source, donc permuter deux lignes ici relirait le
   * bit du bastion dans les galeries. Écrit ainsi plutôt qu'en boucle parce qu'une
   * écriture indexée par une union de clefs n'est pas typable ; et l'aller-retour
   * de `cartes.test.ts` §2 dénoncerait aussitôt une permutation.
   */
  const interieur: DefensesInterieures = {
    acropole: o.nombre(L_NIVEAU),
    bastion: o.drapeau(),
    galeries: o.drapeau(),
    poterne: o.drapeau(),
    citerne: o.drapeau(),
  }
  const ligne = LIGNES_CODE[o.nombre(2)] ?? 'tenir'
  const tir = TIRS_CODE[o.nombre(1)] ?? 'tendu'
  const pans: Partial<Record<UnitId, PanId>> = {}
  for (const u of UNITES_CODE) {
    const pan = panDuRang(o.nombre(L_PAN))
    if (pan !== undefined) pans[u] = pan
  }
  const pansHeros: Partial<Record<HeroId, PanId>> = {}
  for (const h of HEROS_CODE) {
    const pan = panDuRang(o.nombre(L_PAN))
    if (pan !== undefined) pansHeros[h] = pan
  }
  const heros: { id: HeroId; niveau: number }[] = []
  for (const h of HEROS_CODE) if (o.drapeau()) heros.push({ id: h, niveau: o.nombre(L_NIVEAU_HEROS) })
  const atk = o.reel()
  const reduc = o.reel()
  const niveaux: Partial<Record<BuildingId, number>> = {}
  for (const b of BATIMENTS_CODE) {
    const n = o.nombre(L_NIVEAU)
    if (n > 0) niveaux[b] = n
  }
  const butin: Partial<Record<ResourceId, number>> = {}
  for (const r of RES_CODE) {
    const n = o.drapeau() ? o.nombre(L_BUTIN) : 0
    if (n > 0) butin[r] = n
  }
  const jour = o.nombre(L_JOUR)
  const serie = o.nombre(L_SERIE)
  /*
   * ⚠️ `carteValide` DE `duel.ts`, ET RIEN D'AUTRE. Un code fabriqué à la main peut
   * porter un niveau 7, un héros au niveau 0, cent hoplites par type ou un grenier
   * de rêve ; c'est aux RÈGLES de dire ce qui est recevable, jamais au format. Le
   * codec qui bornait lui-même a existé, et ses bornes n'étaient pas celles du jeu.
   */
  return carteValide({
    cite,
    mur,
    murHp,
    tours,
    redoute,
    garnison,
    interieur,
    plan: { ligne, tir, pans, heros: pansHeros },
    heros,
    atk,
    reduc,
    niveaux,
    butin,
    jour,
    serie,
  })
}

/** les octets du corps d'une carte - la matière de la somme et du code */
function corpsCarte(c: CarteDefense): Uint8Array {
  const p = new Plume()
  ecrireCorpsCarte(c, p)
  return p.fermer()
}

/**
 * Le code d'une carte de défense, prêt à coller dans un message.
 *
 * La carte passe par `carteValide` AVANT d'être écrite, et c'est ce qui rend
 * l'aller-retour exact : les deux bouts du courrier appliquent la même
 * normalisation, donc `lireCarte(ecrireCarte(c))` rend exactement
 * `carteValide(c)` - jamais « presque ».
 */
export function ecrireCarte(c: CarteDefense): string {
  return `${PREFIXE_CARTE}${VERSION_CARTE}-${emballer(VERSION_CARTE, corpsCarte(carteValide(c)))}`
}

/** relit un code de carte. Ne lève jamais : tout refus a son motif. */
export function lireCarte(texte: unknown): Lecture<CarteDefense> {
  const e = deballer(texte, 'D', VERSION_CARTE)
  if (!e.ok) return e
  const o = new Oeil(e.valeur)
  const carte = lireCorpsCarte(o)
  if (o.deborde) return refus('tronque')
  return { ok: true, valeur: carte }
}

// ── Le corps d'un rapport ────────────────────────────────────────────────────

/**
 * L'issue prétendue : trois champs sur le fil, et un QUATRIÈME QU'ON N'ÉCRIT PAS.
 *
 * `envoyes` ne voyage pas : `rapportValide` le recalcule de la colonne
 * (`hommesDe`). L'écrire aurait laissé un rapport annoncer vingt hommes engagés
 * avec une colonne de trois - le lecteur aurait alors écrasé le nombre reçu en
 * silence, donc le fil aurait porté un champ qui ne veut rien dire. Ce qui se
 * déduit ne se transporte pas.
 */
function ecrireIssue(i: IssueRaid, p: Plume): void {
  p.drapeau(i.victoire)
  p.nombre(i.etoiles, L_ETOILES)
  p.nombre(i.morts, L_EFFECTIF)
}

/*
 * L'ORDRE DES CHAMPS EST CELUI DE `RapportRaid`, comme pour la carte. Deux champs
 * y pèsent plus que les autres, et il faut savoir pourquoi avant d'y toucher :
 *
 *  · `pans` - LE défenseur ne peut pas rejouer le combat sans eux. Ils décident
 *    des fronts (`creerBataille` répartit la colonne front par front), ils entrent
 *    dans la graine (`graineRaid`), et un rapport sans pans est refusé (`'pans'`).
 *    Un masque de trois bits, un par pan de `PANS_CODE` : l'ordre du fil est celui
 *    de la liste figée, et `pansValides` remet la liste lue dans l'ordre canonique
 *    de `PANS` - deux joueurs qui ont cliqué dans l'ordre inverse obtiennent donc
 *    le même assaut, ce qui est exactement la promesse de `pansValides`.
 *  · `riposte` - la carte de l'attaquant, embarquée comme un BLOC. C'est par elle
 *    que la revanche existe. Un bit de présence devant : elle vaut `null` quand
 *    l'attaquant n'a rien à offrir, et le rapport s'applique quand même.
 *
 * Les deux cartes (cible et riposte) voyagent sans leur enveloppe. Elles n'en ont
 * pas besoin : la version du rapport les couvre, et la somme du rapport couvre
 * leurs octets. Réembarquer sept octets n'aurait rien protégé de plus - un rapport
 * dont une carte est abîmée est un rapport abîmé, et le refus est le même.
 */
function corpsRapport(r: RapportRaid): Uint8Array {
  const p = new Plume()
  p.texte(r.cite)
  p.bloc(corpsCarte(r.cible))
  for (const u of UNITES_CODE) {
    const n = r.colonne[u] ?? 0
    p.drapeau(n > 0)
    if (n > 0) p.nombre(n, L_EFFECTIF)
  }
  for (const pan of PANS_CODE) p.drapeau(r.pans.includes(pan))
  p.grand(r.graine, L_GRAINE)
  ecrireIssue(r.issue, p)
  p.drapeau(r.riposte !== null)
  if (r.riposte) p.bloc(corpsCarte(r.riposte))
  return p.fermer()
}

/** le code d'un rapport de raid, prêt à renvoyer à celui qu'on a frappé */
export function ecrireRapport(r: RapportRaid): string {
  return `${PREFIXE_RAPPORT}${VERSION_RAPPORT}-${emballer(VERSION_RAPPORT, corpsRapport(rapportValide(r)))}`
}

/** relit un code de rapport. Ne lève jamais : tout refus a son motif. */
export function lireRapport(texte: unknown): Lecture<RapportRaid> {
  const e = deballer(texte, 'R', VERSION_RAPPORT)
  if (!e.ok) return e
  const o = new Oeil(e.valeur)
  const cite = o.texte()
  /*
   * CHAQUE CARTE EMBARQUÉE A SON PROPRE DÉBORDEMENT, ET IL COMPTE AUTANT QUE CELUI
   * DU DEHORS. Un bloc est un flux séparé : le lecteur extérieur ne déborde que si
   * les octets du bloc manquent au code, pas si le bloc annonce une longueur
   * honnête mais trop courte pour contenir une carte.
   *
   * Sans cette conjonction, le défaut était réel et MESURÉ : un rapport dont on
   * raccourcit le bloc de six octets, la somme de contrôle refaite, passait toutes
   * les portes et rendait une carte amputée - ses héros disparus, le reste comblé
   * de zéros par le lecteur. Or ces cartes-là sont ce que le défenseur va JUGER
   * (la cible, dont l'empreinte doit retomber sur une carte qu'il a émise) et ce
   * qu'il va FRAPPER (la riposte, cible de sa revanche). Un adversaire pouvait donc
   * frapper pour de vrai et n'offrir en retour qu'une cité fantôme plus tendre que
   * la sienne, sans qu'un seul motif de refus ne s'affiche. `cartes.test.ts` §3 ter
   * la garde des trois côtés.
   */
  const oeilCible = new Oeil(o.bloc())
  const cible = lireCorpsCarte(oeilCible)
  const colonne: Partial<Record<UnitId, number>> = {}
  for (const u of UNITES_CODE) {
    const n = o.drapeau() ? o.nombre(L_EFFECTIF) : 0
    if (n > 0) colonne[u] = n
  }
  const pans: PanId[] = []
  for (const pan of PANS_CODE) if (o.drapeau()) pans.push(pan)
  const graine = o.nombre(L_GRAINE)
  const victoire = o.drapeau()
  const etoiles = o.nombre(L_ETOILES)
  const morts = o.nombre(L_EFFECTIF)
  let riposte: CarteDefense | null = null
  let riposteDeborde = false
  if (o.drapeau()) {
    const oeilRiposte = new Oeil(o.bloc())
    riposte = lireCorpsCarte(oeilRiposte)
    riposteDeborde = oeilRiposte.deborde
  }
  if (o.deborde || oeilCible.deborde || riposteDeborde) return refus('tronque')
  return {
    ok: true,
    // `rapportValide` de `duel.ts` : il désinfecte la colonne (`colonneValide`,
    // qui la rogne à `MAX_TROUPES`), les pans (`pansValides`, qui les remet dans
    // l'ordre canonique), l'issue, la cible et la riposte. Le codec ne juge rien.
    valeur: rapportValide({
      cite,
      cible,
      colonne,
      pans,
      graine,
      issue: { victoire, etoiles, morts },
      riposte,
    }),
  }
}
