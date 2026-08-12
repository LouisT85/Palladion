import { useMemo, useState } from 'react'
import { EFFETS_LIGNE, EFFETS_TIR } from '../../game/combat'
import { ecrireCarte, ecrireRapport, lireCarte, lireRapport } from '../../game/cartes'
import { BUILDINGS, DEFENSES_DEFS, DEFENSE_IDS, RES, UNITS, UNIT_IDS, troupes as troupes0 } from '../../game/data'
import {
  CARTES_MAX,
  COUT_RAID,
  DELAI_RAID_JOURS,
  DUEL_VIDE,
  consequences,
  deroulerRaid,
  duelJouable,
  ficheCarteEmise,
  hommesDe,
  motifRefusRaid as direRefusRaid,
  motifRefusRapport as direRefusRapport,
  plafondButin,
  prochainRang,
  promessePublication,
  puissanceCarte,
  rangDe,
  refusRaid,
  refusRapport,
  resumeButin,
  type CarteDefense,
  type EtatDuel,
  type IssueRaid,
  type RapportRaid,
  type Revanche,
  type SnapDuel,
} from '../../game/duel'
import { MAX_TROUPES, detailPuissanceColonne } from '../../game/expeditions'
import { HEROS } from '../../game/heros'
import { HEROS_PLAN, PANS, UNITES_PLAN, planValide, type PanId, type PlanDefense } from '../../game/plandefense'
import { jourDe, useGame, type GameState } from '../../game/store'
import type { BuildingId, Cost, DefensesInterieures, ResourceId, UnitId } from '../../game/types'
import { Montant } from './Icones'
import { Astuce } from './Infobulle'
import { Modale } from './Modale'
import { court } from './Ordres'

/*
 * ═══════════════════════ LE PANNEAU DES DUELS ═══════════════════════
 *
 * PALLADION n'a pas de serveur. Frapper le village d'un autre joueur se fait donc
 * par COURRIER : on s'échange des codes en texte, comme on s'échange déjà une
 * partie entière. Techniquement c'est du base64 ; pour le joueur, ce doit être
 * trois gestes, et cet écran n'a pas d'autre travail que de les rendre évidents.
 *
 * ── LA RÈGLE DE CE FICHIER : IL NE JUGE RIEN ─────────────────────────────────
 *
 * Tout ce qui s'appelle « recevable », « refusé », « puissant », « plafonné » se
 * décide dans `src/game/duel.ts` et NULLE PART AILLEURS. Le panneau appelle
 * `refusRaid` / `refusRapport` et affiche `motifRefusRaid` / `motifRefusRapport` ;
 * il ne recopie pas un seul de leurs douze cas. Ce n'est pas de la discipline
 * gratuite : la version du défenseur et celle de l'attaquant doivent trancher
 * IDENTIQUEMENT, sans quoi un rapport honnête est refusé et le joueur conclut que
 * le jeu est cassé. Un contrôle recopié ici serait une seconde loi, et deux lois
 * finissent toujours par différer.
 *
 * ── POURQUOI TROIS ONGLETS, ET DANS CET ORDRE ────────────────────────────────
 *
 *  ① MA CITÉ. Le geste d'émission est le plus dangereux du système, parce qu'il
 *     ressemble à un partage de sauvegarde et n'en est pas un. Deux choses sont
 *     donc encadrées, jamais glissées dans une ligne de texte : LE RÉSUMÉ DE CE
 *     QUE L'ADVERSAIRE VERRA - ses murs, sa garnison, son plan, ses héros - et LE
 *     BUTIN QU'ON MET EN JEU. « Vous publiez une cible, pas votre règne » ne se
 *     comprend qu'en voyant la cible.
 *
 *     ⚠️ Et ce résumé est LU DANS LE CODE QU'ON DONNE, pas dans le règne courant :
 *     on décode sa propre carte avant de l'afficher. C'est la seule façon de
 *     garantir que le joueur a vu exactement ce que l'autre lira - un résumé bâti
 *     sur `s.army` et `s.wallHp` montrerait l'état d'aujourd'hui, pas celui que la
 *     carte a gelé hier, et le premier écart serait pris pour un mensonge du jeu.
 *
 *  ② ATTAQUER. On voit la cité AVANT de s'engager, on compose sa colonne, et l'on
 *     DÉSIGNE LES PANS par lesquels on entre - c'est le seul choix de ce panneau
 *     qui affronte vraiment le plan qu'un humain a réglé en temps de paix. Un code
 *     qui ne se lit pas affiche SON MOTIF - « ce n'est pas une carte de défense »,
 *     « il vient d'une autre version » - jamais « erreur » : c'est la leçon
 *     d'`importerTexte`, et c'est ce qui distingue un système de courrier d'un
 *     système cassé.
 *
 *  ③ LE COURRIER. Un rapport reçu est une PRÉTENTION, pas un fait. L'écran montre
 *     donc ce que l'adversaire prétend, puis ce que la simulation rejouée chez
 *     nous en dit, et n'allume « encaisser » qu'au second. Le refus, lui aussi,
 *     dit lequel des huit contrôles a manqué.
 *
 * ── DEUX CONTRAINTES DU DÉPÔT QUI FAÇONNENT LA FORME ─────────────────────────
 *
 * · AUCUN BOUTON NOUVEAU DANS LA BARRE DU HAUT : elle en compte dix et la
 *   navigation a déjà été jugée peu fluide. On entre par l'AGORA - le conseil est
 *   l'endroit où l'on reçoit les hérauts - et par les EXPÉDITIONS, qui est déjà
 *   l'écran où l'on choisit qui frapper. `BlocDuel` porte les deux portes.
 *
 * · UN BOUTON ÉTEINT DIT TOUJOURS POURQUOI. Ici, presque tous les refus viennent
 *   d'un code : ils sont donc affichés SOUS LE CHAMP, à l'endroit où le joueur
 *   vient de coller, et pas au bas du panneau.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// L'ADAPTATEUR — LE SEUL ENDROIT À RECÂBLER
//
// Trois choses seulement manquent à ce panneau, et chacune passe par une fonction
// unique : le DÉCODEUR (deux fonctions du codec), les GESTES (quatre actions du
// store) et les DEUX CODES que `EtatDuel` ne porte pas encore. Le modèle, lui,
// n'est PAS redéclaré ici : `CarteDefense`, `RapportRaid`, `IssueRaid`, `EtatDuel`
// et `SnapDuel` viennent de `src/game/duel.ts`, et c'est ce qui fait qu'un champ
// renommé là-bas casse `tsc` à la ligne exacte plutôt que d'afficher `undefined`
// à l'écran.
// ═══════════════════════════════════════════════════════════════════════════════

/** une lecture de code : ce qu'on a lu, ou POURQUOI on n'a pas pu */
export type Lecture<T> = { ok: true; valeur: T } | { ok: false; motif: string }

/*
 * ⚠️ LES DEUX SEULES FONCTIONS À REMPLACER AU CÂBLAGE, et elles exigent du codec
 * une chose précise : rendre les types de `duel.ts`, pas les siens. Le codec est
 * la SERRURE du système (préfixe, version, somme de contrôle) ; les règles sont la
 * LOI. Si la serrure décode un autre objet que celui que la loi juge, il faut un
 * traducteur entre les deux - et un traducteur est le troisième endroit où l'on
 * peut se tromper sur la force d'un mur.
 *
 * Les stubs REFUSENT avec un motif au lieu de mentir : un décodeur permissif par
 * défaut laisserait « la simulation confirme » s'afficher sans qu'aucune
 * simulation ait eu lieu, et c'est le seul mensonge que ce système ne peut pas se
 * permettre.
 */

/*
 * ═══ CÂBLÉ. Les quatre fonctions du codec, telles quelles ═══
 *
 * Le codec parle DÉSORMAIS le modèle de `duel.ts` : `lireCarte` rend une
 * `CarteDefense` des règles, pas une forme à lui. C'est ce qui permet de le brancher
 * par un import au lieu d'un traducteur - et un traducteur aurait été le troisième
 * endroit où se tromper sur la force d'un mur.
 *
 * Sa `Lecture<T>` porte un champ `refus` de plus que celle déclarée ici : c'est
 * accepté sans conversion, un objet plus riche satisfait un type plus pauvre.
 */

/**
 * LES DEUX ÉCRIVAINS, et ils sont aussi nécessaires que les deux lecteurs.
 *
 * `store.ts` rend des OBJETS - `publierCarte()` une `CarteDefense`,
 * `lancerRaidDuel()` un `RapportRaid` - et n'encode rien : c'est le partage voulu
 * (« les RÈGLES sont dans duel.ts, l'ENCODAGE dans cartes.ts »). Le panneau est
 * donc le seul endroit du jeu qui transforme un objet en texte à coller. Tant que
 * ces deux corps rendent `null`, la carte se publie bel et bien et le raid part -
 * mais aucun code ne s'affiche, et le panneau le DIT au lieu de montrer un cadre
 * vide.
 */


/** le courrier des duels, jamais nul : une sauvegarde d'avant le système n'en a pas */
function duelDe(s: GameState): EtatDuel {
  return (s as unknown as { duel?: EtatDuel | null }).duel ?? DUEL_VIDE
}

/**
 * ═══ LES DEUX CODES DE LA SESSION, ET POURQUOI ILS SONT ICI ═══
 *
 * `EtatDuel` ne garde d'une carte publiée que son EMPREINTE (`CarteEmise` : ref,
 * jour, butin, pillé) - assez pour juger un rapport, pas assez pour rendre au
 * joueur le texte qu'il doit coller dans un message. Et le rapport d'un raid n'est
 * gardé nulle part : `lancerRaidDuel` le RETOURNE, une fois, à celui qui l'appelle.
 *
 * Le panneau les met donc de côté au niveau du MODULE, et non dans son état React :
 * il se démonte à chaque fermeture de la modale, et un pli perdu parce qu'on a
 * refermé un panneau est la seule avarie de ce système qui laisse un AUTRE joueur
 * sans nouvelles de son propre village.
 *
 * ⚠️ CE N'EST PAS LE BON ENDROIT, et il ne faut pas s'y habituer : un rechargement
 * de la page les efface. La vraie place de ces deux textes est `EtatDuel`, donc
 * `duel.ts` et `CHAMPS_SAUVES` - c'est écrit dans le câblage. D'ici là, ceci évite
 * la perte au geste le plus fréquent (fermer la modale) et non à tous.
 */
interface CodesDuel {
  /** le code de ma carte du moment, tel qu'il a été scellé */
  carte: string | null
  /**
   * Le rapport à renvoyer à celui qu'on vient de frapper. `code: null` signifie
   * « le rapport existe, l'écrivain n'a pas su l'écrire » - un état que le panneau
   * doit nommer, parce que le joueur y a laissé des hommes et attend son pli.
   */
  pli: { code: string | null; cite: string; victoire: boolean } | null
}

const CODES: CodesDuel = { carte: null, pli: null }

/** remet les deux codes à neuf - un règne neuf ne garde pas le courrier du précédent */
export function oublierCodesDuel(): void {
  CODES.carte = null
  CODES.pli = null
}

/**
 * L'INSTANTANÉ que les règles lisent, monté en UN endroit.
 *
 * `refusRaid`, `refusRapport` et `consequences` prennent tous le même `SnapDuel` :
 * le bâtir trois fois à trois endroits du fichier, c'est se donner trois occasions
 * de dire « assiégé » à l'un et « libre » à l'autre, et le joueur verrait alors un
 * bouton allumé refuser son propre geste.
 */
function instantDuel(s: GameState): SnapDuel {
  return {
    duel: duelDe(s),
    army: s.army,
    grain: s.resources.grain,
    colonneDehors: s.expedition !== null,
    enBataille: s.battle !== null,
    assiege: s.siege !== null,
    jour: jourDe(s),
  }
}

/**
 * Ouvre ce panneau. Le cast tombe au câblage, quand `'duel'` entre dans l'union
 * des panneaux de `store.ts` : d'ici là `openPanel('duel')` ne compilerait pas, et
 * le panneau ne pourrait pas déclarer ses deux portes d'entrée.
 */
function ouvrirDuel(s: GameState): void {
  s.openPanel('duel')
}

/**
 * LES QUATRE GESTES DU STORE, tels qu'il les expose vraiment.
 *
 * Trois d'entre eux RENDENT quelque chose, et c'est la clé de ce panneau :
 * `publierCarte` rend la carte, `lancerRaidDuel` rend le rapport (ou `null` quand
 * il a refusé - le motif part alors en toast), `appliquerRapport` rend le verdict.
 * Le store n'encode rien et ne garde aucun texte : c'est ici que l'objet devient
 * un code à coller.
 *
 * La recherche reste TOLÉRANTE (`?? null`) et le panneau montre son motif quand un
 * geste manque, plutôt qu'un bouton mort. C'est ce qui lui permet de vivre dans un
 * règne à moitié câblé sans jamais mentir sur ce qu'il sait faire.
 */
interface ActionsDuel {
  publier: (() => CarteDefense) | null
  raider: ((carte: CarteDefense, colonne: Partial<Record<UnitId, number>>, pans: PanId[]) => RapportRaid | null) | null
  juger: ((rapport: RapportRaid) => boolean) | null
  oublier: ((ref: string) => void) | null
}

function actionsDuel(s: GameState): ActionsDuel {
  const b = s as unknown as {
    publierCarte?: () => CarteDefense
    lancerRaidDuel?: (
      carte: CarteDefense,
      colonne: Partial<Record<UnitId, number>>,
      pans: PanId[],
    ) => RapportRaid | null
    appliquerRapport?: (rapport: RapportRaid) => boolean
    oublierRevanche?: (ref: string) => void
  }
  return {
    publier: b.publierCarte ?? null,
    raider: b.lancerRaidDuel ?? null,
    juger: b.appliquerRapport ?? null,
    oublier: b.oublierRevanche ?? null,
  }
}

/** le motif d'un geste que le store ne porte pas encore - il disparaît au câblage */
const MOTIF_SANS_STORE = 'Les hérauts ne partent pas encore de cette agora.'

/** l'ordre du jeu pour les quatre ressources - celui de `RES`, jamais un autre */
const RES_IDS = Object.keys(RES) as ResourceId[]

/** un butin est-il vide ? Quatre `?? 0` recopiés partout finissaient par différer. */
function butinVide(b: Cost): boolean {
  return RES_IDS.every((r) => (b[r] ?? 0) <= 0)
}

// ═══════════════════════════════════════════════════════════════════════════════
// LE CODE COLLÉ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rend collable ce que le joueur a réellement collé.
 *
 * Un code qui voyage par messagerie revient plié en trois, avec des espaces
 * insécables, un retour à la ligne au milieu, et le plus souvent la phrase de son
 * expéditeur devant ET derrière : « tiens, voilà ma cité : PALL-D1-… dis-moi ce
 * que tu en penses ». Refuser cela, c'est refuser le cas NORMAL - et un joueur qui
 * voit « code invalide » sur un code valide n'essaie pas deux fois.
 *
 * Trois précautions qui ne se devinent pas :
 *  · on ne met RIEN en majuscules : le corps du code est du base64url, où « a » et
 *    « A » sont deux octets différents. Seule la recherche du préfixe ignore la
 *    casse.
 *  · on coupe au DERNIER préfixe rencontré : quand on répond à un message en le
 *    citant, l'ancien code est au-dessus du nouveau.
 *  · ON COUPE AUSSI LA QUEUE, au premier caractère étranger à l'alphabet du format
 *    (base64url et le tiret du préfixe). Sans cela « … à demain ! » recollé derrière
 *    le code lui ajoutait dix caractères une fois les espaces ôtés, et la somme de
 *    contrôle tombait faux sur un code parfaitement bon.
 *
 * ⚠️ CE QUE CETTE FONCTION NE PEUT PAS FAIRE, et qu'il ne faut pas croire réglé :
 * un mot de la phrase finale qui n'emploie que l'alphabet du format - « merci »,
 * « ok », « bien » - est INDISTINGUABLE de la suite du code, parce qu'un code plié
 * par une messagerie se recolle exactement comme cela. Seul le codec peut trancher :
 * lui seul connaît la longueur annoncée dans l'enveloppe. C'est donc à `lireCarte`
 * d'ignorer ce qui dépasse cette longueur, la somme de contrôle couvrant déjà le
 * corps. Le trancher ici demanderait de deviner, et deviner refuserait un jour un
 * code juste.
 */
export function nettoyerCode(brut: string): string {
  const serre = brut.replace(/\s+/g, '')
  const marques = [...serre.matchAll(/PALL-/gi)]
  const debut = marques.length > 0 ? (marques[marques.length - 1].index ?? 0) : 0
  const queue = serre.slice(debut)
  const fin = queue.search(/[^A-Za-z0-9_-]/)
  return fin === -1 ? queue : queue.slice(0, fin)
}

/**
 * Copie dans le presse-papiers, et DIT si elle a échoué.
 *
 * Trois chemins parce qu'aucun n'est garanti : `navigator.clipboard` n'existe pas
 * hors contexte sécurisé et lève quand la page n'a pas le focus, `execCommand` est
 * obsolète mais marche encore partout, et il reste des cas où rien ne passe. Dans
 * ce dernier cas on ne fait pas semblant : le panneau demande au joueur de
 * sélectionner le code lui-même. Un « copié ! » mensonger sur un code qu'on colle
 * ensuite dans un message vide est le pire des trois résultats.
 */
async function copier(texte: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texte)
      return true
    }
  } catch {
    // presse-papiers refusé (page sans focus, contexte non sécurisé) : on insiste
  }
  try {
    const z = document.createElement('textarea')
    z.value = texte
    z.style.position = 'fixed'
    z.style.opacity = '0'
    document.body.appendChild(z)
    z.select()
    const ok = document.execCommand('copy')
    z.remove()
    return ok
  } catch {
    return false
  }
}

/** le champ où l'on COLLE - tolérant par construction, et qui ne juge rien */
function ChampCode({
  valeur,
  onChange,
  invite,
}: {
  valeur: string
  onChange: (v: string) => void
  invite: string
}) {
  return (
    <textarea
      className="duel-champ"
      value={valeur}
      spellCheck={false}
      rows={3}
      placeholder={invite}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

/** le code à donner, avec son bouton et le repli quand la copie échoue */
function CodeADonner({ code, quoi }: { code: string; quoi: string }) {
  const [etat, setEtat] = useState<'repos' | 'copie' | 'manuel'>('repos')
  return (
    <div className="duel-code">
      <textarea className="duel-champ code" value={code} readOnly rows={3} spellCheck={false} />
      <div className="duel-code-actions">
        <button
          className="principal"
          onClick={() => {
            void copier(code).then((ok) => setEtat(ok ? 'copie' : 'manuel'))
          }}
        >
          📋 Copier {quoi}
        </button>
        <span className="duel-code-long">{code.length} caractères</span>
      </div>
      {etat === 'copie' && <div className="duel-ok">✔ Copié. Collez-le dans votre message.</div>}
      {etat === 'manuel' && (
        <div className="duel-motif">
          Votre navigateur refuse le presse-papiers depuis cette page. Sélectionnez le code ci-dessus et copiez-le à la
          main.
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LE RÉSUMÉ D'UNE CARTE — le même composant des deux côtés du courrier
// ═══════════════════════════════════════════════════════════════════════════════

/** une troupe écrite comme le jeu l'écrit partout : emoji, nombre, nom */
function Troupes({ garnison }: { garnison: Partial<Record<UnitId, number>> }) {
  const lignes = UNIT_IDS.filter((u) => (garnison[u] ?? 0) > 0)
  if (lignes.length === 0) return <span className="duel-vide">aucun homme sous les armes</span>
  return (
    <div className="duel-troupes">
      {lignes.map((u) => (
        <Astuce key={u} titre={`${UNITS[u].emoji} ${UNITS[u].nom}`} resume={`⚔ ${UNITS[u].atk} · ❤ ${UNITS[u].hp}`}>
          <span className="duel-troupe">
            {UNITS[u].emoji} {garnison[u]}
          </span>
        </Astuce>
      ))}
    </div>
  )
}

/**
 * Le plan de défense de la carte, lu pan par pan.
 *
 * `resumeDefense` existe et tient en une ligne, mais une ligne ne suffit pas ici :
 * l'attaquant choisit SES pans en fonction de ceux que tiennent les archers, et
 * « 2 pans tenus » ne lui apprend pas lesquels. On passe donc par `planValide`, qui
 * désinfecte un plan venu d'un autre navigateur - un pan qui s'appelait autrement
 * dans une version antérieure ne doit pas afficher un mur qui n'existe pas.
 */
function PlanCarte({ plan }: { plan: PlanDefense }) {
  const p = planValide(plan)
  const l = EFFETS_LIGNE[p.ligne] ?? EFFETS_LIGNE.tenir
  const t = EFFETS_TIR[p.tir] ?? EFFETS_TIR.tendu
  const postes = PANS.map((pan) => ({
    pan,
    unites: UNITES_PLAN.filter((u) => p.pans[u] === pan.id),
    heros: HEROS_PLAN.filter((h) => p.heros[h] === pan.id),
  })).filter((x) => x.unites.length > 0 || x.heros.length > 0)
  return (
    <>
      <div className="duel-ordres">
        <Astuce titre={`${l.emoji} ${l.nom}`} resume={l.desc}>
          <span className="duel-ordre">
            {l.emoji} {l.nom}
          </span>
        </Astuce>
        <Astuce titre={`${t.emoji} ${t.nom}`} resume={t.desc}>
          <span className="duel-ordre">
            {t.emoji} {t.nom}
          </span>
        </Astuce>
      </div>
      {postes.length === 0 ? (
        <div className="duel-sous">Aucun pan assigné : toute la garnison court au mur enfoncé.</div>
      ) : (
        <ul className="duel-pans">
          {postes.map((x) => (
            <li key={x.pan.id}>
              <b>{court(x.pan.nom)}</b> — {x.unites.map((u) => UNITS[u].emoji).join(' ')}
              {x.heros.length > 0 && ` ${x.heros.map((h) => `${HEROS[h].emoji} ${HEROS[h].nom}`).join(', ')}`}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

/**
 * Les cinq ouvrages du dedans, lus dans les mots du bloc qui les bâtit.
 *
 * Ils ne comptent QU'APRÈS la brèche, et c'est ce que l'attaquant doit peser avant
 * de partir : une cité à trois ouvrages ne se prend pas en enfonçant sa porte. Les
 * ouvrages ABSENTS sont montrés eux aussi, en creux - une liste qui ne nommerait
 * que le bâti laisserait croire que le reste n'existe pas dans le jeu.
 */
function Interieur({ d }: { d: DefensesInterieures }) {
  const bati = DEFENSE_IDS.filter((id) => (id === 'acropole' ? d.acropole > 0 : d[id]))
  if (bati.length === 0) return <div className="duel-sous">Aucun ouvrage du dedans : la brèche ouvre sur le cœur.</div>
  return (
    <div className="duel-batiments">
      {bati.map((id) => {
        const def = DEFENSES_DEFS[id]
        const n = id === 'acropole' ? d.acropole : 1
        return (
          <Astuce key={id} titre={`${def.emoji} ${def.nom}`} resume={def.desc} note={def.effet(Math.max(1, n))}>
            <span className="duel-bat">
              {def.emoji} {def.nom}
              {def.max > 1 ? ` ${n}` : ''}
            </span>
          </Astuce>
        )
      })}
    </div>
  )
}

/**
 * CE QUE L'ADVERSAIRE VOIT. Le même bloc sert à me montrer ma propre cible et à
 * montrer celle d'un ami : c'est la seule façon de garantir qu'un joueur qui
 * publie sa carte a vu EXACTEMENT ce que l'autre lira. Deux affichages distincts
 * auraient divergé au premier champ ajouté.
 */
function ResumeCarte({ carte, mienne }: { carte: CarteDefense; mienne?: boolean }) {
  const interieurs = (Object.keys(carte.niveaux) as BuildingId[])
    .filter((b) => BUILDINGS[b] && (carte.niveaux[b] ?? 0) > 0)
    .sort((a, b) => (carte.niveaux[b] ?? 0) - (carte.niveaux[a] ?? 0))
  return (
    <div className="duel-carte">
      <div className="duel-carte-tete">
        <span className="duel-emoji">🏛️</span>
        <div>
          <div className="duel-nom">{carte.cite}</div>
          <div className="duel-sous">
            Carte scellée au jour {carte.jour} du règne · puissance de la place ≈ <b>{puissanceCarte(carte)}</b>
          </div>
        </div>
      </div>

      <div className="duel-fiches">
        <div className="duel-fiche">
          <h4>🧱 L’enceinte</h4>
          {/*
            On écrit les points de structure SANS dénominateur, et c'est un choix.
            Le maximum d'un mur dépend de six sources que la carte ne porte pas
            (héros, grâces, reliques, découvertes, merveille, chef) : afficher
            « sur WALL_HP[niveau] » donnerait un pourcentage faux dès le premier
            bonus, et un défenseur à 1 400 points sur un mur de 1 250 lirait 112 %.
          */}
          <div className="duel-ligne">
            Remparts niveau {carte.mur} — {Math.round(carte.murHp)} points de structure au sceau
          </div>
          <div className="duel-ligne">
            🏹 {carte.tours} tour{carte.tours > 1 ? 's' : ''} d’archers
            {carte.tours === 0 ? ' — les créneaux sont nus' : ''}
          </div>
          <div className="duel-ligne">
            🎯 Redoute niveau {carte.redoute}
            {carte.redoute === 0 ? ' — aucun scorpion du dedans' : ''}
          </div>
        </div>

        <div className="duel-fiche">
          <h4>🛡️ La garnison</h4>
          <Troupes garnison={carte.garnison} />
          {carte.heros.length === 0 ? (
            <div className="duel-sous">Aucun héros aux remparts.</div>
          ) : (
            <div className="duel-heros">
              {carte.heros.map((h) => (
                <Astuce
                  key={h.id}
                  titre={`${HEROS[h.id]?.emoji ?? '🛡️'} ${HEROS[h.id]?.nom ?? h.id}`}
                  resume={HEROS[h.id]?.passif?.desc}
                >
                  <span className="duel-hero">
                    {HEROS[h.id]?.emoji ?? '🛡️'} {HEROS[h.id]?.nom ?? h.id} — niveau {h.niveau}
                  </span>
                </Astuce>
              ))}
            </div>
          )}
        </div>

        <div className="duel-fiche">
          <h4>⚑ Le plan de défense</h4>
          <PlanCarte plan={carte.plan} />
        </div>

        <div className="duel-fiche">
          <h4>🏯 Ce qui reste après la brèche</h4>
          <Interieur d={carte.interieur} />
          {/*
            `atk` et `reduc` au lieu des traits du chef et de la liste des passifs.
            La carte ne porte QUE ces deux nombres, déjà cumulés, et c'est délibéré
            dans `duel.ts` : l'attaquant n'a pas à savoir POURQUOI le mur rend les
            coups, et deux nombres se bornent d'un seul geste alors qu'une liste de
            sources se croit sur parole. On les dit donc pour ce qu'ils sont.
          */}
          <div className="duel-ligne">
            ⚔ Ses coups portent ×<b>{carte.atk.toFixed(2)}</b> · 🛡 ses hommes encaissent ×
            <b>{carte.reduc.toFixed(2)}</b>
          </div>
          <div className="duel-batiments">
            {interieurs.map((b) => (
              <span key={b} className={`duel-bat${BUILDINGS[b].interieur ? '' : ' dehors'}`}>
                {BUILDINGS[b].emoji} {BUILDINGS[b].nom} {carte.niveaux[b]}
              </span>
            ))}
          </div>
          <div className="duel-sous">
            Les bâtiments du dedans sont les cibles d’un assaut qui passe le mur ; ceux du dehors tombent sans qu’on
            l’enfonce.
          </div>
        </div>
      </div>

      <div className={`duel-plafond${mienne ? ' mienne' : ''}`}>
        <h4>{mienne ? '⚖️ Ce que cette carte met en jeu' : '💰 Ce qu’il y a à prendre'}</h4>
        <div className="duel-prix">
          {RES_IDS.filter((r) => (carte.butin[r] ?? 0) > 0).map((r) => (
            <Montant key={r} n={carte.butin[r] ?? 0} id={r} taille={14} />
          ))}
          {butinVide(carte.butin) && (
            <span className="duel-vide">rien à prendre : les greniers étaient vides à l’émission</span>
          )}
        </div>
        <div className="duel-sous">
          {mienne
            ? 'Ce montant a été arrêté au moment où vous avez scellé la carte, et il ne bougera plus : un raid réussi ne peut vous prendre davantage, quoi que vos greniers portent le jour où il tombe. Une carte est un chèque, et il ne s’encaisse qu’une fois. Rien d’autre ne sort de chez vous — ni chantiers, ni habitants, ni un seul homme de votre garnison.'
            : 'Un raid réussi ne rapporte jamais plus que ce montant, arrêté par le défenseur au moment où il a scellé sa carte — et moins si ses coffres se sont vidés depuis.'}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ① MA CITÉ
// ═══════════════════════════════════════════════════════════════════════════════

function OngletMaCite({ bump }: { bump: () => void }) {
  const s = useGame()
  const d = duelDe(s)
  const codes = CODES
  const a = actionsDuel(s)
  const refus = a.publier === null ? MOTIF_SANS_STORE : null
  /*
   * Ma propre carte est DÉCODÉE depuis le code que je vais donner, et pas bâtie
   * sur l'état courant du règne. C'est ce qui rend la promesse tenable : ce que je
   * lis ici est, au bit près, ce que l'autre lira chez lui. Décoder est pur, donc
   * mémoïsé sur le seul code - sans quoi on relirait un code à chaque battement,
   * quatre fois par seconde, pour repeindre les mêmes murs.
   */
  const lueMienne = useMemo(() => (codes.carte ? lireCarte(codes.carte) : null), [codes.carte])
  const rang = rangDe(d.honneur)
  const suite = prochainRang(d.honneur)
  return (
    <div className="duel-onglet">
      <div className="duel-avertit">
        <h4>⚠️ Une carte de défense n’est pas une sauvegarde</h4>
        Elle publie une CIBLE : vos murs, votre garnison, votre plan, vos héros, et le butin qu’un raid pourra vous
        prendre. Elle ne contient ni vos réserves, ni vos chantiers, ni vos habitants — la lire ne donne aucun moyen de
        reprendre votre règne. Donnez-la à qui vous voulez : c’est une invitation à vous attaquer, et elle ne s’annule
        pas une fois partie.
      </div>

      {d.cartes.length > 0 && codes.carte === null && (
        <div className="duel-motif">
          ⛔ Votre carte est publiée et elle sera honorée, mais l’écrivain des codes n’est pas encore en place dans ce
          règne : il n’y a rien à copier. Republiez-la quand il le sera.
        </div>
      )}

      {codes.carte ? (
        <>
          <CodeADonner code={codes.carte} quoi="ma carte" />
          <div className="duel-sous">
            {d.cartes.length > 1
              ? `${d.cartes.length} cartes sont encore honorées (${CARTES_MAX} au plus) : un ami qui garde un code plus ancien peut encore frapper, et c’est le butin de SA carte qui s’appliquera.`
              : 'Une seule carte est honorée. Un rapport qui n’en vise aucune est refusé — c’est ce qui empêche qu’on vous réclame un butin que vous n’avez jamais mis en jeu.'}
          </div>
          {lueMienne?.ok ? (
            <ResumeCarte carte={lueMienne.valeur} mienne />
          ) : (
            <div className="duel-motif">⛔ {lueMienne?.motif}</div>
          )}
        </>
      ) : (
        <div className="duel-sous">
          Rien n’est publié. Tant que vous n’avez pas scellé de carte, personne ne peut vous frapper : un rapport sans
          carte correspondante est refusé.
        </div>
      )}

      {/* les cartes plus anciennes, et ce que chacune engage ENCORE. Un joueur qui a
          doublé son agora depuis doit voir que sa vieille carte ne promet plus rien -
          c'est cela, et rien d'autre, qui lui apprend à en republier une. */}
      {d.cartes.length > 0 && (
        <div className="duel-bloc">
          <h3>Les cartes encore honorées</h3>
          {d.cartes.map((f) => (
            <div key={f.ref} className="duel-ligne">
              {f.pille ? '🕳️' : '⚖️'} {ficheCarteEmise(f, s.resources)}
            </div>
          ))}
        </div>
      )}

      <div className="duel-bloc">
        <h3>
          {rang.emoji} {rang.nom} — {d.honneur} d’honneur
        </h3>
        <div className="duel-sous">
          {suite
            ? `Encore ${suite.manque} d’honneur pour ${suite.rang.emoji} ${suite.rang.nom}. On en gagne en frappant, et en tenant ses murs contre un rapport qu’on refuse d’avoir mérité.`
            : 'Il n’y a plus de rang au-dessus. Les aèdes n’ont plus rien à ajouter.'}
        </div>
      </div>

      <Astuce
        titre="✍️ Sceller une carte de défense"
        resume="Le conseil relève l’état de la place - murs, tours, redoute, ouvrages, garnison, plan, héros - et en scelle un code à donner."
        lignes={[
          { label: 'Jour du règne', valeur: String(jourDe(s)) },
          { label: 'Cartes honorées', valeur: `${d.cartes.length} sur ${CARTES_MAX}` },
          { label: 'Plafond d’une ressource', valeur: String(plafondButin(s.buildings.agora.level)) },
        ]}
        note="Sceller une nouvelle carte n’annule pas les précédentes : ce sont des plis qui circulent, et l’on ne rattrape pas un pli. Au-delà de six, la plus ancienne sort de la mémoire — et les rapports qui la citeraient seraient refusés."
      >
        <button
          className="principal"
          style={{ width: '100%' }}
          disabled={refus !== null}
          onClick={() => {
            const c = a.publier?.()
            // la carte est publiée par le store QUOI QU'IL ARRIVE ; seul son texte
            // dépend de l'écrivain, et l'on n'écrase pas l'ancien code par un `null`
            if (c) CODES.carte = ecrireCarte(c)
            bump()
          }}
        >
          {codes.carte ? '✍️ Sceller une carte à jour' : '✍️ Sceller ma carte de défense'}
        </button>
      </Astuce>
      {/* la phrase que `duel.ts` écrit lui-même, chiffres compris : c'est la SEULE
          réponse à « qu'est-ce que je risque », et elle doit être là AVANT le clic */}
      <div className="duel-sous">{promessePublication(s.resources)}</div>
      {refus !== null && <div className="duel-motif">{refus}</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ② ATTAQUER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PAR OÙ L'ON ENTRE. C'est le choix de ce panneau, et le seul qui affronte
 * vraiment le plan qu'un humain a réglé en temps de paix.
 *
 * Il n'est pas décoratif : les pans entrent dans `graineRaid`, donc dans le
 * déroulé, donc dans le rapport que le défenseur rejouera. Un pan de plus ouvre un
 * second front - la garnison postée ailleurs y court, ou n'y court pas selon son
 * plan - et divise aussi sa propre colonne. `plandefense.ts` a mesuré ce que
 * diviser une ligne coûte au DÉFENSEUR ; c'est la même pièce, jouée de l'autre
 * côté de la table.
 */
function ChoixPans({ pans, setPans }: { pans: PanId[]; setPans: (p: PanId[]) => void }) {
  return (
    <div className="duel-bloc">
      <h3>Par où entrez-vous ? ({pans.length} pan{pans.length > 1 ? 's' : ''})</h3>
      {/*
        `duel-onglets` et non `duel-ordres`, alors que ce ne sont pas des onglets :
        c'est la SEULE règle de la feuille qui donne à `button.actif` une bordure et
        une couleur d'or. Dans `duel-ordres`, un pan choisi ne se distinguait d'un
        pan libre que par son emoji - et trois boutons d'apparence identique dont un
        seul est armé sont un piège, pas un choix.
      */}
      <div className="duel-onglets">
        {PANS.map((p) => {
          const pris = pans.includes(p.id)
          return (
            <button
              key={p.id}
              className={pris ? 'actif' : undefined}
              onClick={() => setPans(pris ? pans.filter((x) => x !== p.id) : [...pans, p.id])}
            >
              {pris ? '⚔️' : '○'} {court(p.nom)}
            </button>
          )
        })}
      </div>
      <div className="duel-sous">
        Un seul pan concentre l’assaut là où sa garnison l’attend peut-être ; deux ou trois l’obligent à se partager,
        mais partagent aussi votre colonne. Les pans voyagent dans le rapport : il ne pourra pas prétendre que vous
        êtes venu ailleurs.
      </div>
    </div>
  )
}

/**
 * La colonne qu'on compose, avec ce qu'elle pèse.
 *
 * ⚠️ SANS LES HÉROS, ET C'EST LA RÈGLE DU DUEL, PAS UN OUBLI. `duel.ts` (décision
 * 1) ne fait entrer dans l'assaut que ce que le défenseur peut RECONSTITUER : la
 * carte, la colonne, les pans. Les héros de l'attaquant, ses grâces, son chef et
 * sa météo n'y sont pas - il devrait sinon les croire sur parole. Le panneau
 * annonçait la puissance héros comprise : sur une colonne à deux héros, il
 * promettait 179 points qui ne partiront jamais. On ne montre donc que les hommes,
 * et l'on DIT que les héros restent au mur.
 */
function Colonne({
  troupes,
  setTroupes,
}: {
  troupes: Record<UnitId, number>
  setTroupes: (t: Record<UnitId, number>) => void
}) {
  const s = useGame()
  const total = UNIT_IDS.reduce((n, u) => n + troupes[u], 0)
  // `detailPuissanceColonne` sans héros ni bonus : la même métrique que les
  // expéditions, sur les seules entrées que le duel laisse passer
  const force = detailPuissanceColonne({ troupes })
  return (
    <div className="duel-bloc">
      <h3>
        Votre colonne ({total}/{MAX_TROUPES}) — puissance ≈ {Math.round(force.total)}
      </h3>
      {UNIT_IDS.map((u) => (
        <div key={u} className="unite">
          <span style={{ fontSize: 22 }}>{UNITS[u].emoji}</span>
          <div className="infos">
            <div className="nom">{UNITS[u].nom}</div>
            <div className="stats">
              disponibles : {s.army[u]} · ⚔{UNITS[u].atk} ❤{UNITS[u].hp}
            </div>
          </div>
          <div className="actions">
            <button disabled={troupes[u] <= 0} onClick={() => setTroupes({ ...troupes, [u]: troupes[u] - 1 })}>
              −
            </button>
            <span className="compteur">{troupes[u]}</span>
            <button
              disabled={troupes[u] >= s.army[u] || total >= MAX_TROUPES}
              onClick={() => setTroupes({ ...troupes, [u]: troupes[u] + 1 })}
            >
              +
            </button>
          </div>
        </div>
      ))}
      <div className="duel-sous">
        Vos héros ne marchent pas : un raid d’honneur ne compte que ce que l’autre peut recalculer chez lui. Ils
        restent sur VOTRE carte, où quelqu’un viendra les chercher.
      </div>
    </div>
  )
}

/** la cible du moment : un code qu'on a collé, ou une revanche qu'on est venu prendre */
type Cible =
  | { via: 'code'; carte: CarteDefense; code: string }
  | { via: 'revanche'; carte: CarteDefense; ref: string }

function OngletAttaquer({ revanche, bump }: { revanche: Revanche | null; bump: () => void }) {
  const s = useGame()
  const codes = CODES
  const a = actionsDuel(s)
  const [brut, setBrut] = useState('')
  const [troupes, setTroupes] = useState<Record<UnitId, number>>(troupes0({}))
  // la porte est le pan qu'on enfonce depuis Homère ; on part de là, et on divise
  // son assaut si l'on croit avoir compris le plan d'en face
  const [pans, setPans] = useState<PanId[]>(['porte'])
  const code = nettoyerCode(brut)
  // la lecture d'un code est du décodage pur : on ne la refait pas à chaque frappe
  const lecture = useMemo(() => (code.length === 0 ? null : lireCarte(code)), [code])

  const cible: Cible | null = revanche
    ? { via: 'revanche', carte: revanche.carte, ref: revanche.ref }
    : lecture?.ok
      ? { via: 'code', carte: lecture.valeur, code }
      : null

  /*
   * LE REFUS VIENT DES RÈGLES, ET DE NULLE PART AILLEURS. `refusRaid` juge les
   * douze cas dans son ordre - du plus général (assiégé, personne ne sort) au plus
   * précis (il vous manque des pans) - et `motifRefusRaid` les dit. Le panneau
   * n'en recopie aucun : une colonne vide, une bataille en cours et un délai non
   * écoulé y sont déjà, et les redire ici les ferait un jour différer.
   */
  /*
   * UN SEUL GESTE POUR LES DEUX CHEMINS, et c'est le store qui le veut ainsi :
   * `lancerRaidDuel` reçoit une CARTE, d'où qu'elle vienne, et consomme lui-même la
   * vengeance correspondante (`duelApresRevanche` sur l'empreinte de la cible). Une
   * version antérieure du panneau attendait deux actions distinctes et exigeait la
   * présence des DEUX : le bouton restait éteint sur « les hérauts ne partent pas
   * encore » alors que le geste était là, et le motif accusait l'agora d'un manque
   * qui n'existait pas.
   */
  const r = cible ? refusRaid(instantDuel(s), cible.carte, troupes, pans) : null
  const refus = (cible !== null && a.raider === null ? MOTIF_SANS_STORE : null) ?? (r ? direRefusRaid(r) : null)

  return (
    <div className="duel-onglet">
      {codes.pli && (
        <div className="duel-pli">
          <h4>📨 Un pli à renvoyer — {codes.pli.cite}</h4>
          <div className="duel-sous">
            {codes.pli.victoire
              ? 'Vous avez pris la place. Ce rapport porte la graine du combat : son roi le rejouera chez lui, et il ne pourra pas le refuser.'
              : 'Vous avez été repoussé. Renvoyez tout de même le rapport : c’est lui qui ouvre sa revanche, et ne rien renvoyer ne vous épargne rien.'}
          </div>
          {codes.pli.code === null ? (
            <div className="duel-motif">
              ⛔ Le rapport existe, mais l’écrivain des codes n’est pas encore en place : il n’y a rien à renvoyer. Vos
              hommes se sont battus pour rien de transmissible.
            </div>
          ) : (
            <CodeADonner code={codes.pli.code} quoi="le rapport" />
          )}
          <button
            style={{ width: '100%' }}
            onClick={() => {
              CODES.pli = null
              bump()
            }}
          >
            🗑️ Pli renvoyé, l’écarter
          </button>
        </div>
      )}

      {revanche ? (
        <div className="duel-bloc">
          <h3>⚔️ La revanche de {revanche.cite}</h3>
          <div className="duel-sous">
            Elle vous a pris {resumeButin(revanche.pris)} au jour {revanche.jour} du règne. Sa carte est arrivée dans
            son propre rapport : c’est elle que vous allez frapper, et vous n’avez pas eu besoin de la demander.
          </div>
        </div>
      ) : (
        <div className="duel-bloc">
          <h3>Le code d’une cité amie</h3>
          <div className="duel-sous">
            Collez ce qu’on vous a envoyé, phrase comprise et retours à la ligne compris : on n’en garde que le code.
          </div>
          <ChampCode valeur={brut} onChange={setBrut} invite="PALL-D1-…" />
          {lecture && !lecture.ok && <div className="duel-motif">⛔ {lecture.motif}</div>}
          {!lecture && (
            <div className="duel-sous">
              Vous ne pouvez frapper que les cités dont vous avez le code. Aucune liste, aucun classement : ce sont vos
              amis qui vous les donnent — ou vos ennemis, dans un rapport de raid.
            </div>
          )}
        </div>
      )}

      {cible && (
        <>
          <ResumeCarte carte={cible.carte} />
          <ChoixPans pans={pans} setPans={setPans} />
          <Colonne troupes={troupes} setTroupes={setTroupes} />
          <Astuce
            titre="⚔️ Marcher sur cette cité"
            resume="Le combat se joue chez vous, sur une graine que l’assaut lui-même détermine. Le rapport qui en sort est vérifiable : son roi le rejouera et obtiendra le même résultat."
            lignes={[
              { label: 'En face', valeur: `puissance ≈ ${puissanceCarte(cible.carte)}`, fort: true },
              { label: 'À prendre', valeur: resumeButin(cible.carte.butin) },
              { label: 'Hommes engagés', valeur: `${hommesDe(troupes)} sur ${MAX_TROUPES} au plus` },
              { label: 'La colonne mange', valeur: `${COUT_RAID.grain} 🌾 en chemin` },
            ]}
            note={`Vos morts sont vos morts, victoire ou défaite. Un raid d’honneur par journée (${DELAI_RAID_JOURS}), et le pli que vous renverrez ouvre sa revanche : il aura votre carte.`}
          >
            <button
              className="principal"
              style={{ width: '100%' }}
              disabled={refus !== null}
              onClick={() => {
                const rapport = a.raider?.(cible.carte, troupes, pans)
                /*
                 * `null` veut dire « le store a refusé », et il a déjà dit pourquoi en
                 * toast : on n'écrase alors PAS le pli précédent. Un joueur qui a un
                 * pli en attente et déclenche un raid impossible perdrait sinon le
                 * seul texte qui débloque quelqu'un d'autre.
                 */
                if (rapport) {
                  CODES.pli = {
                    code: ecrireRapport(rapport),
                    cite: cible.carte.cite,
                    victoire: rapport.issue.victoire,
                  }
                }
                bump()
              }}
            >
              ⚔️ Marcher sur {cible.carte.cite}
            </button>
          </Astuce>
          {refus !== null && <div className="duel-motif">{refus}</div>}
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ③ LE COURRIER
// ═══════════════════════════════════════════════════════════════════════════════

/** ce que le rapport PRÉTEND - dit comme une prétention, jamais comme un fait */
function Pretention({ r }: { r: RapportRaid }) {
  const hommes = UNIT_IDS.filter((u) => (r.colonne[u] ?? 0) > 0)
  const fronts = r.pans.map((p) => court(PANS.find((x) => x.id === p)?.nom ?? p))
  return (
    <div className="duel-bloc">
      <h3>Ce que {r.cite} prétend</h3>
      <div className={`duel-issue${r.issue.victoire ? ' pris' : ' repousse'}`}>
        {r.issue.victoire ? '🔥 « Nous avons pris la place »' : '🛡️ « Vos murs ont tenu »'}
      </div>
      <div className="duel-ligne">
        Contre votre carte du jour {r.cible.jour}, par {fronts.length === 0 ? 'aucun front' : fronts.join(' et ')}.
      </div>
      <div className="duel-ligne">
        Sa colonne :{' '}
        {hommes.length === 0 ? (
          <span className="duel-vide">aucun homme — cela seul suffira à le confondre</span>
        ) : (
          hommes.map((u) => `${r.colonne[u]} ${UNITS[u].emoji}`).join(' · ')
        )}
        {r.issue.morts > 0 &&
          ` · ${r.issue.morts} homme${r.issue.morts > 1 ? 's' : ''} sur ${r.issue.envoyes} laissé${
            r.issue.morts > 1 ? 's' : ''
          } sous vos murs`}
        {r.issue.etoiles > 0 && ` · ${'★'.repeat(r.issue.etoiles)}`}
      </div>
      <div className="duel-ligne">
        Ce que votre carte mettait en jeu :{' '}
        {butinVide(r.cible.butin) ? <span className="duel-vide">rien</span> : resumeButin(r.cible.butin)}
      </div>
      <div className="duel-ligne">
        {r.riposte
          ? `Il vous laisse son adresse : ${r.riposte.cite}. Encaisser ce rapport ouvre la revanche.`
          : 'Il ne joint pas sa carte : le rapport peut s’appliquer, mais aucune revanche ne s’ouvrira.'}
      </div>
      <div className="duel-graine">Graine du combat : {r.graine}</div>
    </div>
  )
}

function OngletCourrier({ onRiposter }: { onRiposter: (r: Revanche) => void }) {
  const s = useGame()
  const d = duelDe(s)
  const a = actionsDuel(s)
  const [brut, setBrut] = useState('')
  const code = nettoyerCode(brut)
  const lecture = useMemo(() => (code.length === 0 ? null : lireRapport(code)), [code])
  const rapport = lecture?.ok ? lecture.valeur : null

  /*
   * LA SEULE OPÉRATION COÛTEUSE DU PANNEAU, ET SA SEULE DÉPENDANCE EST LE RAPPORT.
   *
   * `deroulerRaid` rejoue une bataille entière hors écran. C'est une fonction PURE
   * de la carte, de la colonne, des pans et de la graine - tous portés par le
   * rapport, aucun venu du règne. On la mémoïse donc sur `rapport` seul.
   *
   * C'est exactement pour cela que `refusRapport` reçoit l'issue rejouée en
   * PARAMÈTRE au lieu de la calculer : la comparaison, elle, est à trois sous et
   * doit voir l'état FRAIS (une carte publiée entre-temps change le verdict). Elle
   * tourne donc à chaque rendu, hors du mémo. Mémoïser l'ensemble sur une liste du
   * store aurait fait rejouer un combat quatre fois par seconde ; ne rien mémoïser
   * aussi.
   */
  const rejoue: IssueRaid | null = useMemo(
    () =>
      /*
       * ⚠️ `duelJouable()` AVANT de dérouler, et ce n'est pas une précaution de
       * style : `deroulerRaid` pose une source de hasard puis la retire par un
       * `poserAlea(null)`. Appelé pendant une partie de DÉFI, il effacerait la
       * graine du classement - et il suffirait pour cela d'ouvrir cet onglet avec un
       * code dans le presse-papiers, sans rien encaisser. `refusRapport` refuse bien
       * pour `'defi'`, mais il le refuse APRÈS, et le mal serait déjà fait. C'est le
       * seul endroit du panneau où le simple fait de REGARDER change le règne.
       */
      rapport && duelJouable() ? deroulerRaid(rapport.cible, rapport.colonne, rapport.pans, rapport.graine) : null,
    [rapport],
  )
  const snap = instantDuel(s)
  const refusVerdict = rapport ? refusRapport(snap, rapport, rejoue) : null
  const suites = rapport && refusVerdict === null ? consequences(snap, rapport, s.resources) : null
  const refus = a.juger === null ? MOTIF_SANS_STORE : refusVerdict ? direRefusRapport(refusVerdict) : null

  return (
    <div className="duel-onglet">
      <div className="duel-bloc">
        <h3>Un rapport reçu</h3>
        <div className="duel-sous">
          Un rapport n’est pas une nouvelle : c’est une PRÉTENTION. Votre conseil rejoue le combat depuis la graine
          qu’il porte et votre carte qu’il vise. Si sa simulation donne autre chose que ce que l’envoyeur annonce, le
          rapport est refusé — et vous ne perdez rien.
        </div>
        <ChampCode valeur={brut} onChange={setBrut} invite="PALL-R1-…" />
        {lecture && !lecture.ok && <div className="duel-motif">⛔ {lecture.motif}</div>}
      </div>

      {rapport && (
        <>
          <Pretention r={rapport} />
          <div className={`duel-verdict${refusVerdict === null ? ' ok' : ' ko'}`}>
            <h4>{refusVerdict === null ? '✅ La simulation confirme' : '⛔ Refusé'}</h4>
            <div>
              {refusVerdict === null
                ? rejoue?.victoire
                  ? `Rejouée chez vous, la place tombe : ${rejoue.morts} de ses ${rejoue.envoyes} hommes y sont restés. Le rapport dit vrai.`
                  : `Rejouée chez vous, l’enceinte tient : il a laissé ${rejoue?.morts ?? 0} hommes sous vos murs pour rien. Le rapport dit vrai.`
                : direRefusRapport(refusVerdict)}
            </div>
            {/* ce que l'encaissement fera vraiment, calculé sur les coffres
                D'AUJOURD'HUI : la carte a promis un montant, un grenier vide ne le
                paie pas, et le joueur doit lire le chiffre réel avant de cliquer */}
            {suites && (
              <div className="duel-sous" style={{ marginTop: 6 }}>
                {butinVide(suites.pris)
                  ? (suites.note ?? 'Rien ne sortira de vos coffres.')
                  : `Ils emporteront ${resumeButin(suites.pris)}.`}
                {suites.honneur > 0 && ` Votre plan a tenu : +${suites.honneur} d’honneur.`}
                {suites.revanche && ' La revanche s’ouvrira.'}
              </div>
            )}
          </div>
          <button
            className="principal"
            style={{ width: '100%' }}
            disabled={refus !== null}
            onClick={() => {
              // le rapport DÉCODÉ, jamais son code : le store le revalide lui-même
              // (`rapportValide`) et rejuge tout par `refusRapport` - l'écran ne fait
              // pas foi, et c'est ici qu'un joueur malveillant s'y attaquerait
              if (a.juger?.(rapport)) setBrut('')
            }}
          >
            {rapport.issue.victoire ? '📨 Encaisser le rapport' : '📨 Classer le rapport'}
          </button>
          {refus !== null && <div className="duel-motif">{refus}</div>}
        </>
      )}

      <div className="duel-bloc">
        <h3>Les revanches ouvertes ({d.revanches.length})</h3>
        <div className="duel-sous">
          Un rapport encaissé vous donne le droit de frapper en retour, et la carte de celui qui vous a frappé : elle
          voyage dans son propre rapport. C’est le sel du système — on ne subit pas un raid sans adresse.
        </div>
        {d.revanches.length === 0 ? (
          <div className="duel-vide">Aucune. Personne ne vous a encore frappé, ou vous avez déjà rendu les coups.</div>
        ) : (
          d.revanches.map((r) => (
            <div key={r.ref} className="duel-revanche">
              <div>
                <div className="duel-nom">{r.cite}</div>
                <div className="duel-sous">
                  Vous a pris {resumeButin(r.pris)} au jour {r.jour} du règne
                </div>
              </div>
              <div>
                <button onClick={() => onRiposter(r)}>⚔️ Riposter</button>
                {/* renoncer est un geste du jeu, pas un ménage : trois vengeances au
                    plus, et la quatrième chasse la plus ancienne. Qui veut garder
                    celle qui compte doit pouvoir écarter celle qui ne vaut rien. */}
                {a.oublier && (
                  <button
                    onClick={() => a.oublier?.(r.ref)}
                    title="Renoncer à cette vengeance"
                    style={{ marginLeft: 5 }}
                  >
                    🕊️
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LE CADRE
// ═══════════════════════════════════════════════════════════════════════════════

type Onglet = 'cite' | 'attaquer' | 'courrier'

/**
 * L'onglet d'ouverture n'est pas toujours le premier.
 *
 * Un pli qu'on n'a pas renvoyé est la seule chose de ce panneau qui BLOQUE
 * quelqu'un d'autre : il ouvre donc l'écran. Vient ensuite la revanche - on a été
 * frappé, on veut rendre -, puis le cas du joueur qui n'a rien publié, à qui il
 * faut d'abord expliquer ce qu'est une carte.
 */
function ongletDOuverture(d: EtatDuel, codes: CodesDuel): Onglet {
  if (codes.pli) return 'attaquer'
  if (d.revanches.length > 0) return 'courrier'
  if (!codes.carte) return 'cite'
  return 'attaquer'
}

export function PanneauDuel({ onFermer }: { onFermer: () => void }) {
  const s = useGame()
  const d = duelDe(s)
  const codes = CODES
  const [onglet, setOnglet] = useState<Onglet>(() => ongletDOuverture(d, codes))
  /*
   * Le compteur qui redessine après un geste. `CODES` vit au niveau du module pour
   * survivre à la fermeture de la modale, donc React n'a aucun moyen de savoir
   * qu'il a changé : sans ce coup de coude, le code d'une carte qu'on vient de
   * sceller n'apparaîtrait qu'au battement suivant du tick - un quart de seconde
   * pendant lequel le joueur croit que son clic n'a rien fait.
   */
  const [, setEcho] = useState(0)
  const bump = () => setEcho((n) => n + 1)
  /*
   * La revanche qu'on est allé prendre. On garde la REVANCHE et non son code : elle
   * porte la carte entière (`Revanche.carte`), et le store la consomme par son
   * empreinte (`duelApresRevanche(etat, ref)`). Réencoder la carte pour la
   * redécoder aussitôt aurait ajouté un aller-retour de codec sur le seul chemin du
   * jeu où l'on tient déjà l'objet.
   */
  const [revanche, setRevanche] = useState<Revanche | null>(null)

  return (
    <Modale
      titre="🏺 Les hérauts — frapper la cité d’un autre roi"
      large
      onFermer={onFermer}
      sous="Aucun serveur, aucun compte : trois codes qui voyagent en texte. Vous publiez une cible, vous frappez celle d’un ami, et chaque rapport reçu est rejoué chez vous avant d’être cru."
    >
      <div className="duel">
        <div className="duel-onglets">
          <button className={onglet === 'cite' ? 'actif' : ''} onClick={() => setOnglet('cite')}>
            🏛️ Ma cité{codes.carte ? '' : ' · à sceller'}
          </button>
          <button
            className={onglet === 'attaquer' ? 'actif' : ''}
            onClick={() => {
              setRevanche(null)
              setOnglet('attaquer')
            }}
          >
            ⚔️ Attaquer{codes.pli ? ' · 📨 1 pli' : ''}
          </button>
          <button className={onglet === 'courrier' ? 'actif' : ''} onClick={() => setOnglet('courrier')}>
            📨 Le courrier{d.revanches.length > 0 ? ` · ${d.revanches.length}` : ''}
          </button>
        </div>

        {onglet === 'cite' && <OngletMaCite bump={bump} />}
        {/* la clé remonte la colonne et les pans quand une riposte change de cible :
            sans elle, `useState` gardait les vingt hommes composés contre la cité
            précédente, et le joueur partait sur une autre place avec un plan qu'il
            croyait avoir choisi pour elle */}
        {onglet === 'attaquer' && (
          <OngletAttaquer key={revanche?.ref ?? 'code'} revanche={revanche} bump={bump} />
        )}
        {onglet === 'courrier' && (
          <OngletCourrier
            onRiposter={(r) => {
              setRevanche(r)
              setOnglet('attaquer')
            }}
          />
        )}
      </div>
    </Modale>
  )
}

/**
 * LES DEUX PORTES D'ENTRÉE, dans un seul bloc réemployable.
 *
 * L'AGORA d'abord : le conseil est l'endroit du jeu où l'on reçoit les hérauts, et
 * c'est là qu'on lit son courrier. Les EXPÉDITIONS ensuite : c'est déjà l'écran où
 * l'on choisit qui frapper, et une cité amie n'est qu'une neuvième cible - à ceci
 * près qu'elle rend les coups.
 *
 * Le libellé porte l'URGENCE, comme celui des colonies : un pli qu'on n'a pas
 * renvoyé laisse un autre joueur sans nouvelles de son propre village, et rien
 * ailleurs sur la carte ne le dirait.
 */
export function BlocDuel() {
  const s = useGame()
  const d = duelDe(s)
  const codes = CODES
  const urgent = codes.pli !== null || d.revanches.length > 0
  const libelle = codes.pli
    ? `📨 Un pli à renvoyer à ${codes.pli.cite}`
    : d.revanches.length > 0
      ? `⚔️ ${d.revanches.length} revanche${d.revanches.length > 1 ? 's' : ''} à prendre`
      : codes.carte
        ? '🏺 Les hérauts — ma carte est publiée'
        : '🏺 Les hérauts — frapper un autre roi'
  return (
    <div className="bloc">
      <h3>🏺 Les hérauts</h3>
      <div className="desc" style={{ fontSize: 12 }}>
        Il n’y a pas de serveur : on s’échange des codes. Publiez votre cité comme cible, frappez celle d’un ami, et
        rejouez chez vous chaque rapport qu’on vous envoie avant de le croire.
      </div>
      <button
        className={urgent ? 'principal' : undefined}
        style={{ width: '100%', marginTop: 6 }}
        onClick={() => ouvrirDuel(s)}
      >
        {libelle}
      </button>
    </div>
  )
}
