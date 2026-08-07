import { useState, type CSSProperties, type ReactNode } from 'react'
import { DELAI_ORDRE_MS, EFFETS_LIGNE, EFFETS_TIR, ORDRES_NEUTRES, estTireur } from '../../game/combat'
import { UNITS } from '../../game/data'
import { HEROS } from '../../game/heros'
import { HEROS_PLAN, pansDormants, planValide, type HeroPlacable, type PlanDefense } from '../../game/plandefense'
import { useGame } from '../../game/store'
import type { BattleState, HeroId, OrdreLigne, OrdreTir, UnitId } from '../../game/types'
import { Astuce } from './Infobulle'

/*
 * ═══════════════════ LE VOCABULAIRE DES ORDRES ═══════════════════
 *
 * On regardait la bataille. Les bénédictions mises à part, rien de ce que
 * faisait le joueur pendant l'assaut ne changeait ce que faisaient ses hommes.
 *
 * Trois postures, deux façons de tirer, un pan de mur assignable par unité. La
 * difficulté n'est pas de les offrir : c'est de les offrir SANS manger l'écran.
 * Première version : trois rangées de boutons larges, une phrase d'explication
 * en permanence, une ligne par type d'unité. Le bandeau faisait trois cents
 * pixels de haut et couvrait la moitié de la plaine, au moment précis où l'on a
 * besoin de la voir. D'où les JETONS courts, et l'assignation des pans repliée.
 *
 * ── Puis le plan de défense est arrivé ──
 *
 * Les mêmes trois décisions se prennent maintenant AUSSI en temps de paix, dans
 * le plan de défense (`PlanDefense.tsx`). Il n'était pas question d'en dessiner
 * une seconde interface : le joueur apprendrait deux fois la même chose et
 * douterait de savoir laquelle commande. Ce module porte donc les BRIQUES
 * COMMUNES - jetons de posture, jetons de tir, schéma de l'enceinte - et la barre
 * de bataille n'en est plus qu'un assemblage. Le panneau de paix en est un autre.
 *
 * ── Puis le schéma a été trop grand pour la barre ──
 *
 * « Le système est bon mais l'intégration est difficile. » Mesuré, et c'était
 * une affaire de centimètres. Le panneau d'assaut vit dans une colonne de 330 px
 * à gauche de la scène ; la bande qu'il peut occuper sans recouvrir une jauge de
 * secteur mesure 327 px de haut à 1100 × 800 (entre le bas de la jauge du nord,
 * y 323, et le haut de celle du sud, y 650). Replié, le panneau en consomme déjà
 * 208 à 222 selon qu'un champion mène la colonne. Il reste donc 105 à 119 px.
 *
 * L'ellipse de l'enceinte en réclame 280 : elle ne rentre pas, elle n'est jamais
 * rentrée, et l'ouvrir faisait défiler le panneau puis recouvrir DEUX des trois
 * jauges. Le même geste - désigner une pièce, désigner un pan - tient en revanche
 * en QUATRE RANGS de 22 px. Le module rend donc la même interface sous deux
 * DISPOSITIONS : `schema` à la table du conseil, où l'on a 600 px de large et
 * besoin de voir OÙ est le nord ; `rangs` sous les flèches, où l'on a la vraie
 * enceinte sous les yeux derrière le panneau et où redessiner une seconde
 * muraille par-dessus la première n'apprend rien à personne.
 *
 * Mêmes jetons, même état « pièce désignée », même glisser-déposer, même phrase
 * d'aide : une grammaire, deux densités. Le gabarit `compact` qui existait avant
 * - la même ellipse, en plus petit - a été retiré : il ne réglait rien, une
 * ellipse de 330 px de large reste haute de 230.
 */

// ═══════════════════ Les jetons de posture et de tir ═══════════════════

/** où l'on donne l'ordre : sous les flèches, ou à la table du conseil */
export type ContexteOrdres = 'bataille' | 'plan'

/**
 * Les trois postures de la ligne de mêlée. Mêmes jetons, même ordre, mêmes
 * astuces en paix et en bataille - c'est tout l'intérêt de les avoir sortis ici.
 */
export function JetonsLigne({
  valeur,
  onChoisir,
  gele = false,
  attente = 0,
  contexte = 'bataille',
}: {
  valeur: OrdreLigne
  onChoisir: (id: OrdreLigne) => void
  /**
   * On ne peut pas en changer. Soit parce qu'un ordre se tient (`attente > 0`),
   * soit parce qu'on lit le plan pendant un assaut - là, les ordres se donnent
   * sur la barre, et le plan ne doit pas servir à contourner le délai.
   */
  gele?: boolean
  /** ce qu'il reste à attendre, en millisecondes */
  attente?: number
  contexte?: ContexteOrdres
}) {
  return (
    <div className="ordres-rangee">
      <span className="ordres-etiquette">⚑ Ligne</span>
      {(Object.keys(EFFETS_LIGNE) as OrdreLigne[]).map((id) => {
        const e = EFFETS_LIGNE[id]
        const actif = valeur === id
        return (
          <Astuce
            key={id}
            titre={`${e.emoji} ${e.nom}`}
            resume={e.desc}
            note={
              gele && !actif
                ? attente > 0
                  ? `Un ordre se tient : ${Math.ceil(attente / 1000)} s avant d’en changer.`
                  : 'L’assaut est engagé : la posture se change sur la barre d’ordres, pas dans le plan.'
                : actif
                  ? contexte === 'plan'
                    ? 'Posture adoptée dès le premier choc.'
                    : 'Posture en cours.'
                  : undefined
            }
          >
            <button className={`ordre${actif ? ' actif' : ''}`} disabled={gele && !actif} onClick={() => onChoisir(id)}>
              {e.emoji} {e.nom.split(' ')[0]}
            </button>
          </Astuce>
        )
      })}
      {gele && attente > 0 && (
        <span className="ordres-delai" style={{ ['--part' as string]: `${100 - (attente / DELAI_ORDRE_MS) * 100}%` }}>
          {Math.ceil(attente / 1000)} s
        </span>
      )}
    </div>
  )
}

/** Les deux façons de tirer. `tireurs` à false : l'ordre ne commande personne, on le dit. */
export function JetonsTir({
  valeur,
  onChoisir,
  gele = false,
  tireurs = true,
  contexte = 'bataille',
  children,
}: {
  valeur: OrdreTir
  onChoisir: (id: OrdreTir) => void
  gele?: boolean
  tireurs?: boolean
  contexte?: ContexteOrdres
  /** ce qu'on accroche au bout de la rangée - le replié des pans, en bataille */
  children?: ReactNode
}) {
  return (
    <div className="ordres-rangee">
      <span className="ordres-etiquette">🏹 Tir</span>
      {(Object.keys(EFFETS_TIR) as OrdreTir[]).map((id) => {
        const e = EFFETS_TIR[id]
        const actif = valeur === id
        return (
          <Astuce
            key={id}
            titre={`${e.emoji} ${e.nom}`}
            resume={e.desc}
            note={
              gele && !actif && contexte === 'plan'
                ? 'L’assaut est engagé : le tir se règle sur la barre d’ordres, pas dans le plan.'
                : tireurs
                  ? undefined
                  : contexte === 'plan'
                    ? 'Vous n’avez ni archer ni frondeur : cet ordre attend qu’on en lève.'
                    : 'Aucun tireur en ligne : cet ordre ne commande personne pour l’instant.'
            }
          >
            <button
              className={`ordre${actif ? ' actif' : ''}${tireurs ? '' : ' muet'}`}
              disabled={gele && !actif}
              onClick={() => onChoisir(id)}
            >
              {e.emoji} {id === 'tendu' ? 'Tendu' : 'Cloche'}
            </button>
          </Astuce>
        )
      })}
      {children}
    </div>
  )
}

// ═══════════════════ Le schéma de l'enceinte ═══════════════════

/**
 * Raccourci d'un nom de secteur : « Mur du nord » → « Nord ». La porte de l'est
 * garde son nom de REPÈRE - « Est » ne dirait pas que c'est par là qu'on entre,
 * et c'est le seul pan que toute vague assaille.
 */
export function court(nom: string): string {
  if (/porte/i.test(nom)) return 'Porte'
  const m = nom.match(/(est|sud|nord|ouest)/i)
  return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() : nom.slice(0, 4)
}

/** un pan tel que le schéma le dessine */
export interface PanCarte {
  /** id de `SECTEURS` en paix ; le rang, faute de mieux, en bataille */
  id: string
  nom: string
  /** angle sur l'ellipse : 0 = est / porte, +1,5 = sud, −1,5 = nord */
  angle: number
  /** les types d'unité qui tiennent ce pan */
  unites: UnitId[]
  /** part de structure restante (bataille seulement) */
  part?: number
  breche?: boolean
  /** l'ennemi vient par là (bataille, ou fronts révélés). undefined = on ne sait pas */
  assailli?: boolean
}

/*
 * Géométrie du schéma. Le rapport 104/62 est celui de l'enceinte du jeu
 * (`MAP.mur` : 330 × 195) - le joueur doit reconnaître SA place, pas un cercle.
 * La boîte est plus grande que l'ellipse : les étiquettes des pans se posent
 * DEHORS, à `DR_ETIQUETTE` du mur, et il faut la place de les contenir en entier.
 */
const G = { w: 372, h: 262, cx: 168, cy: 131, rx: 104, ry: 62 }
const DR_ETIQUETTE = 44
const surMur = (angle: number, dr = 0) => ({
  x: G.cx + (G.rx + dr) * Math.cos(angle),
  y: G.cy + (G.ry + dr) * Math.sin(angle),
})
/** l'arc d'un pan : ± `demi` rad autour de son angle (0,42 par défaut) */
function arcPan(angle: number, dr = 0, demi = 0.42): string {
  const a = surMur(angle - demi, dr)
  const b = surMur(angle + demi, dr)
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} A ${G.rx + dr} ${G.ry + dr} 0 0 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
}
/** ancrage de l'étiquette d'un pan, en % de la boîte - hors les murs, du côté de son angle */
function ancrePan(angle: number): CSSProperties {
  const p = surMur(angle, DR_ETIQUETTE)
  return { left: `${((p.x / G.w) * 100).toFixed(1)}%`, top: `${((p.y / G.h) * 100).toFixed(1)}%` }
}

/**
 * Trois toits au cœur de la place. Ils ne servent à rien, et ils servent à tout :
 * sans eux le schéma est une ellipse abstraite, avec eux c'est un village qu'on
 * défend. Lumière au nord-ouest comme partout : pan gauche clair, pan droit sombre.
 */
function ToitsDuVillage() {
  return (
    <g opacity="0.85">
      {[
        { x: -50, y: 32, l: 13 },
        { x: -16, y: 38, l: 16 },
        { x: 18, y: 31, l: 11 },
      ].map((t) => (
        <g key={t.x} transform={`translate(${G.cx + t.x},${G.cy + t.y})`}>
          <ellipse cx={2} cy={5} rx={t.l * 0.9} ry={4} fill="#0d1017" opacity="0.4" />
          <path d={`M ${-t.l} 4 L 0 ${-t.l * 0.62} L 0 4 Z`} fill="#b56b45" />
          <path d={`M 0 ${-t.l * 0.62} L ${t.l} 4 L 0 4 Z`} fill="#7e4629" />
          <path d={`M ${-t.l} 4 L 0 ${-t.l * 0.62}`} stroke="#dc9367" strokeWidth="1" fill="none" />
        </g>
      ))}
    </g>
  )
}

/**
 * LA PIÈCE QU'ON TIENT EN MAIN, en attente d'un pan où la poser.
 *
 * Deux natures, et l'interface ne doit surtout pas les confondre : on poste un
 * TYPE (« les hoplites au nord » commande les trente) ou un HOMME (« Hector au
 * nord » ne dit rien d'Ajax). Le plan les range dans deux tables distinctes pour
 * cette raison exacte ; le jeton qu'on saisit porte donc sa nature avec lui.
 */
export type Piece = { quoi: 'unite'; id: UnitId } | { quoi: 'hero'; id: HeroId }
const memePiece = (a: Piece | null, b: Piece): boolean => a !== null && a.quoi === b.quoi && a.id === b.id
/** ce que le glisser-déposer transporte : `u:hoplite`, `h:hector` */
const codePiece = (p: Piece): string => `${p.quoi === 'unite' ? 'u' : 'h'}:${p.id}`
function lirePiece(code: string): Piece | null {
  const [q, id] = code.split(':')
  if (q === 'u' && id in UNITS) return { quoi: 'unite', id: id as UnitId }
  if (q === 'h' && HEROS_PLAN.includes(id as HeroId)) return { quoi: 'hero', id: id as HeroId }
  return null
}
const emblemePiece = (p: Piece): string => (p.quoi === 'unite' ? UNITS[p.id].emoji : HEROS[p.id].emoji)

/** un type d'unité, posé quelque part : emoji, effectif, et l'état de son ordre */
function JetonUnite({
  u,
  pan,
  effectif,
  choisi,
  dort,
  onChoisir,
}: {
  u: UnitId
  pan: string | null
  effectif: number
  choisi: boolean
  dort: boolean
  onChoisir: (p: Piece | null) => void
}) {
  return (
    <Astuce
      titre={`${UNITS[u].emoji} ${UNITS[u].nom}`}
      resume={UNITS[u].desc}
      note={
        effectif <= 0
          ? 'Vous n’en avez aucun : l’ordre est gardé, il commandera le jour où vous en lèverez.'
          : dort
            ? 'Ce pan n’est pas assailli aujourd’hui : ces hommes vont au plus pressé.'
            : pan === null
              ? 'Au plus pressé : ils courent au pan enfoncé.'
              : 'Ils tiennent ce pan et n’en bougent plus.'
      }
    >
      <button
        className={`plan-jeton${choisi ? ' choisi' : ''}${effectif <= 0 ? ' vide' : ''}${dort ? ' dort' : ''}`}
        draggable
        onDragStart={(e) => {
          onChoisir({ quoi: 'unite', id: u })
          e.dataTransfer.setData('text/plain', codePiece({ quoi: 'unite', id: u }))
          e.dataTransfer.effectAllowed = 'move'
        }}
        onClick={() => onChoisir(choisi ? null : { quoi: 'unite', id: u })}
        aria-pressed={choisi}
      >
        {UNITS[u].emoji}
        <i>{effectif}</i>
      </button>
    </Astuce>
  )
}

/** pourquoi un héros posté ne descendra pas sur le terrain */
const MOTIF_ABSENCE: Record<string, string> = {
  'non-recrute': 'Il n’est pas encore à votre service : l’ordre est gardé pour le jour où vous l’engagerez.',
  mort: 'Il est tombé. L’ordre reste écrit, mais plus personne ne le tiendra.',
  boude: 'Il boude sous sa tente et ne descendra pas : ce pan sera nu.',
}

/**
 * UN HÉROS, posé sur un pan. Même jeton que celui d'une troupe - même taille,
 * même bordure, même « choisi » - à trois différences près, qui sont les trois
 * choses qu'un homme a et qu'un type n'a pas : ses couleurs, son NIVEAU en
 * exposant (là où la troupe affiche son effectif), et le fait qu'il puisse être
 * absent alors qu'on l'a posté.
 *
 * `fige` : sous les flèches, un héros ne se déplace plus. Ce n'est pas une
 * pudeur d'interface, c'est le moteur : `posterHeros` TÉLÉPORTE le combattant à
 * l'entrée du secteur (`f.x = p.x`), ce qui est juste à l'ouverture de la
 * bataille - « en place avant le premier coup de bélier » - et absurde en pleine
 * mêlée, où l'on verrait Hector disparaître d'un mur pour reparaître à l'autre.
 * On le montre donc là où il est, et on ne ment pas sur ce qu'on peut en faire.
 */
function JetonHero({
  h,
  choisi,
  dort,
  fige,
  onChoisir,
}: {
  h: HeroPlacable
  choisi: boolean
  dort: boolean
  fige: boolean
  onChoisir: (p: Piece | null) => void
}) {
  const piece: Piece = { quoi: 'hero', id: h.id }
  return (
    <Astuce
      titre={`${h.emoji} ${h.nom}`}
      resume={`Niveau ${h.niveau}. Un héros vaut une dizaine d’hommes sur le pan qu’il tient - et il n’en tient qu’un.`}
      note={
        !h.present
          ? MOTIF_ABSENCE[h.absence ?? 'non-recrute']
          : fige
            ? 'L’assaut est engagé : un héros ne traverse pas la cour en pleine mêlée. Il tient le pan où le plan l’a posté.'
            : dort
              ? 'Ce pan n’est pas assailli aujourd’hui : il ira au plus pressé.'
              : h.pan === null
                ? 'Au plus pressé : il court au pan enfoncé.'
                : 'Il tient ce pan et n’en bouge plus.'
      }
    >
      <button
        className={`plan-jeton hero${choisi ? ' choisi' : ''}${h.present ? '' : ' vide'}${dort ? ' dort' : ''}`}
        style={{ borderColor: `${h.couleur}99` }}
        disabled={fige}
        draggable={!fige}
        onDragStart={(e) => {
          onChoisir(piece)
          e.dataTransfer.setData('text/plain', codePiece(piece))
          e.dataTransfer.effectAllowed = 'move'
        }}
        onClick={() => onChoisir(choisi ? null : piece)}
        aria-pressed={choisi}
      >
        {h.emoji}
        <i>{h.niveau}</i>
      </button>
    </Astuce>
  )
}

/** une zone où poser des hommes : un pan de l'enceinte, ou la réserve (`pan === null`) */
function ZonePan({
  pan,
  titre,
  unites,
  heros,
  effectifs,
  dormants,
  dormantsHeros,
  herosFiges,
  choisi,
  onChoisir,
  onDeposer,
  style,
  classe = '',
  detail,
}: {
  pan: string | null
  titre: string
  unites: UnitId[]
  /** les héros de CE pan, déjà filtrés par l'appelant */
  heros: HeroPlacable[]
  effectifs: Partial<Record<UnitId, number>>
  dormants: UnitId[]
  dormantsHeros: HeroId[]
  /** on ne déplace plus un héros : on le montre où il est */
  herosFiges: boolean
  choisi: Piece | null
  onChoisir: (p: Piece | null) => void
  onDeposer: (p: Piece, pan: string | null) => void
  style?: CSSProperties
  classe?: string
  detail?: ReactNode
}) {
  // la pièce en main est-elle DÉJÀ ici ? alors pas de cible « poser ici »
  const dejaLa =
    choisi !== null &&
    (choisi.quoi === 'unite' ? unites.includes(choisi.id) : heros.some((x) => x.id === choisi.id))
  return (
    <div
      className={`plan-zone ${classe}`}
      style={style}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const p = lirePiece(e.dataTransfer.getData('text/plain'))
        if (p) onDeposer(p, pan)
      }}
    >
      <span className="plan-zone-nom">{titre}</span>
      <div className="plan-zone-jetons">
        {unites.map((u) => (
          <JetonUnite
            key={u}
            u={u}
            pan={pan}
            effectif={effectifs[u] ?? 0}
            choisi={memePiece(choisi, { quoi: 'unite', id: u })}
            dort={dormants.includes(u)}
            onChoisir={onChoisir}
          />
        ))}
        {heros.map((h) => (
          <JetonHero
            key={h.id}
            h={h}
            choisi={memePiece(choisi, { quoi: 'hero', id: h.id })}
            dort={dormantsHeros.includes(h.id)}
            fige={herosFiges}
            onChoisir={onChoisir}
          />
        ))}
        {/* la cible accessible : elle n'apparaît qu'une fois la pièce désignée */}
        {choisi !== null && !dejaLa && (
          <button className="plan-poser" onClick={() => onDeposer(choisi, pan)}>
            {emblemePiece(choisi)} ici
          </button>
        )}
      </div>
      {detail}
    </div>
  )
}

/**
 * L'ENCEINTE, SES PANS, ET QUI LES TIENT.
 *
 * Une liste de menus déroulants ne dit rien de « l'emplacement » : on y choisit
 * « Nord » sans savoir où est le nord, ni que la porte de l'est est le seul pan
 * toujours visé. Le schéma le montre - l'ellipse aux proportions de la place, ses
 * trois pans nommés à leur vraie position, et les hommes posés dessus.
 *
 * On désigne une troupe ou un héros, puis le pan à tenir. Le glisser-déposer fait
 * la même chose pour qui préfère la souris ; le clavier suit les boutons.
 *
 * DEUX DISPOSITIONS, une seule grammaire (voir l'en-tête du fichier) :
 *  · `schema` - l'ellipse. 280 px de haut, à la table du conseil ;
 *  · `rangs`  - un pan par ligne. 22 px chacun, sous les flèches, où l'on n'a
 *    que 105 à 119 px et où la vraie muraille est déjà à l'écran, derrière.
 */
export function SchemaEnceinte({
  pans,
  reserve,
  effectifs,
  dormants = [],
  heros = [],
  dormantsHeros = [],
  onDeposer,
  onDeposerHero,
  note,
  repli,
  disposition = 'schema',
}: {
  pans: PanCarte[]
  /** les types qu'aucun pan ne retient : ils vont au plus pressé */
  reserve: UnitId[]
  effectifs: Partial<Record<UnitId, number>>
  /** ordres qui ne commandent personne ce soir : leur pan n'est pas assailli */
  dormants?: UnitId[]
  /**
   * Les héros à montrer, avec le pan de chacun. `HeroPlacable.pan` désigne un
   * `PanCarte.id` : l'id de `SECTEURS` à la table du conseil, le RANG du secteur
   * en bataille - exactement comme pour les pans eux-mêmes.
   */
  heros?: HeroPlacable[]
  /** héros dont le pan n'est pas assailli ce soir */
  dormantsHeros?: HeroId[]
  onDeposer: (u: UnitId, pan: string | null) => void
  /** absent = les héros se lisent mais ne se déplacent pas (c'est le cas en bataille) */
  onDeposerHero?: (h: HeroId, pan: string | null) => void
  note?: ReactNode
  /** un geste accroché au bout du rang « au plus pressé » (rangs seulement) */
  repli?: ReactNode
  /**
   * `schema` - l'ellipse de l'enceinte, 280 px de haut, à la table du conseil.
   * `rangs`  - un pan par ligne, 22 px chacun, sous les flèches. Le gabarit
   * `compact` d'autrefois n'existe plus : il servait à faire tenir l'ellipse dans
   * la barre d'ordres, et l'ellipse n'y tient pas, même resserrée (mesuré).
   */
  disposition?: 'schema' | 'rangs'
}) {
  const [choisi, setChoisi] = useState<Piece | null>(null)
  const herosFiges = onDeposerHero === undefined
  const deposer = (p: Piece, pan: string | null) => {
    if (p.quoi === 'unite') onDeposer(p.id, pan)
    else if (onDeposerHero) onDeposerHero(p.id, pan)
    else return
    setChoisi(null)
  }
  const herosDuPan = (id: string | null) => heros.filter((h) => h.pan === id)
  /** ce qu'on rappelle sous les jetons : la pièce en main, ou la consigne */
  const aide = choisi ? (
    <>
      {emblemePiece(choisi)}{' '}
      <b>{choisi.quoi === 'unite' ? UNITS[choisi.id].nom : HEROS[choisi.id].nom}</b> - désignez le pan à tenir, ou
      « Au plus pressé ».
    </>
  ) : (
    (note ?? <>Cliquez une troupe, puis le pan qu’elle doit tenir. Le glisser-déposer marche aussi.</>)
  )
  /*
   * En rangs, la phrase d'aide ne s'affiche QUE lorsqu'elle apprend quelque
   * chose - une pièce en main, ou un avertissement -, et elle tient sur UNE
   * ligne. Chaque ligne y vaut 13 px sur les 101 dont dispose la section
   * (mesuré, panneau au pire : champion, brèche, trois fronts) ; le mode
   * d'emploi complet est déjà dans l'astuce du jeton « ⚔ Pans », le répéter en
   * permanence sous les flèches, c'est payer deux fois.
   */
  const aideRangs = choisi ? (
    <>
      {emblemePiece(choisi)} <b>{choisi.quoi === 'unite' ? UNITS[choisi.id].nom : HEROS[choisi.id].nom}</b> → quel pan ?
    </>
  ) : (
    note
  )

  /*
   * ── DISPOSITION EN RANGS ──
   * Pas de SVG, pas de positionnement absolu, pas de second fond : la muraille
   * est derrière le panneau, à l'écran, avec ses vraies jauges. On ne redessine
   * pas ce qu'on a sous les yeux - on dit seulement QUI tient QUOI, dans l'ordre
   * où la bataille a rangé ses fronts.
   */
  if (disposition === 'rangs') {
    return (
      <div className="plan-rangs">
        {pans.map((p) => (
          <ZonePan
            key={p.id}
            pan={p.id}
            titre={court(p.nom)}
            unites={p.unites}
            heros={herosDuPan(p.id)}
            effectifs={effectifs}
            dormants={dormants}
            dormantsHeros={dormantsHeros}
            herosFiges={herosFiges}
            choisi={choisi}
            onChoisir={setChoisi}
            onDeposer={deposer}
            classe={`rang${p.breche ? ' perce' : ''}${p.assailli ? ' assailli' : ''}`}
            detail={
              p.breche ? (
                <span className="plan-zone-etat perce">percé</span>
              ) : p.part !== undefined ? (
                <span className="plan-zone-etat">{Math.round(p.part * 100)} %</span>
              ) : undefined
            }
          />
        ))}
        <ZonePan
          pan={null}
          titre="Au plus pressé"
          unites={reserve}
          heros={herosDuPan(null)}
          effectifs={effectifs}
          dormants={dormants}
          dormantsHeros={dormantsHeros}
          herosFiges={herosFiges}
          choisi={choisi}
          onChoisir={setChoisi}
          onDeposer={deposer}
          classe="rang reserve"
          detail={repli}
        />
        {aideRangs !== undefined && <div className="plan-aide">{aideRangs}</div>}
      </div>
    )
  }

  return (
    <div className="plan-carte">
      <div className="plan-scene">
        <svg viewBox={`0 0 ${G.w} ${G.h}`} className="plan-fond" aria-hidden="true">
          <defs>
            {/* lumière au nord-ouest : la pierre s'éclaire en haut à gauche et
                s'éteint vers le sud-est, comme partout ailleurs dans le jeu */}
            <linearGradient id="pd-mur" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#b6ac93" />
              <stop offset="52%" stopColor="#8d8370" />
              <stop offset="100%" stopColor="#655c4b" />
            </linearGradient>
            <radialGradient id="pd-sol" cx="38%" cy="34%" r="76%">
              <stop offset="0%" stopColor="#3b3524" />
              <stop offset="100%" stopColor="#221d13" />
            </radialGradient>
            <radialGradient id="pd-dehors" cx="50%" cy="50%" r="62%">
              <stop offset="0%" stopColor="#151d27" />
              <stop offset="100%" stopColor="#0c141d" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width={G.w} height={G.h} fill="url(#pd-dehors)" rx="10" />
          {/* occlusion au pied du mur, décalée vers le sud-est */}
          <ellipse cx={G.cx + 5} cy={G.cy + 5} rx={G.rx + 10} ry={G.ry + 10} fill="#080d13" opacity="0.62" />
          <ellipse cx={G.cx} cy={G.cy} rx={G.rx} ry={G.ry} fill="url(#pd-sol)" />
          {/* la place, au cœur : c'est ce qu'on défend */}
          <ellipse cx={G.cx - 6} cy={G.cy - 2} rx="56" ry="28" fill="#4a4028" opacity="0.42" />
          <ToitsDuVillage />
          {/* l'enceinte : un seul trait, mais dégradé - le volume vient des valeurs */}
          <ellipse cx={G.cx} cy={G.cy} rx={G.rx} ry={G.ry} fill="none" stroke="url(#pd-mur)" strokeWidth="6.5" />
          {/* assises de pierre : des joints dans la teinte sombre du matériau */}
          <ellipse
            cx={G.cx}
            cy={G.cy}
            rx={G.rx}
            ry={G.ry}
            fill="none"
            stroke="#6d6350"
            strokeWidth="6.5"
            strokeDasharray="1.6 11"
            opacity="0.55"
          />
          {/* l'ombre que le mur jette sur le dedans, au sud-est */}
          <path
            d={arcPan(0.75, -5.5)}
            fill="none"
            stroke="#12100a"
            strokeWidth="5"
            opacity="0.35"
            strokeLinecap="round"
          />
          {/* liseré clair côté lumière, dans la teinte du matériau - jamais de noir */}
          <path d={arcPan(-2.3, -4.2)} fill="none" stroke="#f7eed8" strokeWidth="1.4" opacity="0.6" />
          <path d={arcPan(-3.6, -4.2)} fill="none" stroke="#f7eed8" strokeWidth="1.1" opacity="0.4" />
          {pans.map((p) => {
            const perce = p.breche
            const tenu = p.unites.length > 0
            const couleur = perce ? '#e0715a' : tenu ? '#e8c04a' : '#efe3c8'
            const point = surMur(p.angle)
            const etiquette = surMur(p.angle, DR_ETIQUETTE - 22)
            const porte = p.nom.toLowerCase().includes('porte')
            return (
              <g key={p.id}>
                {/* le pan lui-même, plus épais que le reste du mur */}
                <path
                  d={arcPan(p.angle)}
                  fill="none"
                  stroke={couleur}
                  strokeWidth={perce ? 4 : 9}
                  strokeLinecap="round"
                  strokeDasharray={perce ? '7 6' : undefined}
                  opacity={perce ? 0.95 : tenu ? 0.95 : 0.72}
                />
                {/* créneaux : c'est ce qui fait qu'un pan se voit comme un pan */}
                {!perce && (
                  <path
                    d={arcPan(p.angle, 4.5)}
                    fill="none"
                    stroke={couleur}
                    strokeWidth="3.5"
                    strokeDasharray="2.4 7"
                    opacity={tenu ? 0.9 : 0.6}
                  />
                )}
                {/* la porte de l'est : deux montants et un battant, elle se reconnaît */}
                {porte && !perce && (
                  <g>
                    <path d={arcPan(p.angle, 0, 0.1)} fill="none" stroke="#6b4a2c" strokeWidth="10" />
                    <path d={arcPan(p.angle, 0, 0.1)} fill="none" stroke="#8a6238" strokeWidth="10" strokeDasharray="1.4 4" opacity="0.8" />
                    <circle cx={surMur(p.angle - 0.13).x} cy={surMur(p.angle - 0.13).y} r="3.6" fill="#d3bb8d" />
                    <circle cx={surMur(p.angle + 0.13).x} cy={surMur(p.angle + 0.13).y} r="3.6" fill="#9c8760" />
                  </g>
                )}
                {/* ce qu'il reste de structure, en bataille : un liseré au pied du pan */}
                {p.part !== undefined && !perce && (
                  <path
                    d={arcPan(p.angle, -9)}
                    fill="none"
                    stroke={p.part < 0.35 ? '#e8a04a' : '#7fae8a'}
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.9"
                    pathLength={100}
                    strokeDasharray={`${Math.max(0, Math.min(100, p.part * 100))} 100`}
                  />
                )}
                {/* le trait qui relie le pan à son étiquette */}
                <line
                  x1={point.x}
                  y1={point.y}
                  x2={etiquette.x}
                  y2={etiquette.y}
                  stroke={couleur}
                  strokeWidth="1"
                  opacity="0.5"
                  strokeDasharray="3 3"
                />
                {/* l'ennemi vient par là : un chevron rouge qui pique vers le mur */}
                {p.assailli && (
                  <path
                    d={(() => {
                      const t = surMur(p.angle, 13)
                      const q = surMur(p.angle, 30)
                      const g1 = surMur(p.angle - 0.13, 27)
                      const g2 = surMur(p.angle + 0.13, 27)
                      return (
                        `M ${q.x.toFixed(1)} ${q.y.toFixed(1)} L ${t.x.toFixed(1)} ${t.y.toFixed(1)} ` +
                        `M ${g1.x.toFixed(1)} ${g1.y.toFixed(1)} L ${t.x.toFixed(1)} ${t.y.toFixed(1)} ` +
                        `L ${g2.x.toFixed(1)} ${g2.y.toFixed(1)}`
                      )
                    })()}
                    fill="none"
                    stroke="#e0715a"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                )}
              </g>
            )
          })}
        </svg>

        {pans.map((p) => (
          <ZonePan
            key={p.id}
            pan={p.id}
            titre={court(p.nom)}
            unites={p.unites}
            heros={herosDuPan(p.id)}
            effectifs={effectifs}
            dormants={dormants}
            dormantsHeros={dormantsHeros}
            herosFiges={herosFiges}
            choisi={choisi}
            onChoisir={setChoisi}
            onDeposer={deposer}
            style={ancrePan(p.angle)}
            classe={`pan${p.breche ? ' perce' : ''}${p.assailli ? ' assailli' : ''}`}
            detail={
              p.breche ? (
                <span className="plan-zone-etat perce">percé</span>
              ) : p.part !== undefined ? (
                <span className="plan-zone-etat">{Math.round(p.part * 100)} %</span>
              ) : undefined
            }
          />
        ))}
        <ZonePan
          pan={null}
          titre="Réserve"
          unites={reserve}
          heros={herosDuPan(null)}
          effectifs={effectifs}
          dormants={dormants}
          dormantsHeros={dormantsHeros}
          herosFiges={herosFiges}
          choisi={choisi}
          onChoisir={setChoisi}
          onDeposer={deposer}
          classe="reserve"
          style={{ left: `${((G.cx / G.w) * 100).toFixed(1)}%`, top: `${((G.cy / G.h) * 100).toFixed(1)}%` }}
        />
      </div>

      <div className="plan-aide">{aide}</div>
    </div>
  )
}

// ═══════════════════ Le plan de défense, tel que le store le garde ═══════════════════

/*
 * Le champ `planDefense` et l'action `reglerPlanDefense` sont câblés dans
 * `store.ts`. On les lit ici par un accès étroit et UNIQUE : ce module compile
 * seul, et le câblage n'a qu'une porte d'entrée à changer.
 */
interface StoreAvecPlan {
  planDefense?: unknown
  reglerPlanDefense?: (plan: PlanDefense) => void
}
export function usePlanDefense(): PlanDefense {
  return planValide(useGame((s) => (s as unknown as StoreAvecPlan).planDefense))
}
export function useReglerPlan(): (plan: PlanDefense) => void {
  const f = useGame((s) => (s as unknown as StoreAvecPlan).reglerPlanDefense)
  return f ?? (() => undefined)
}

// ═══════════════════ La barre d'ordres, en bataille ═══════════════════

/** les types d'unité du joueur réellement présents dans cette bataille */
function typesEngages(b: BattleState): UnitId[] {
  const vus = new Set<UnitId>()
  for (const f of b.fighters) {
    if (f.camp !== b.campJoueur || f.heros || f.etat === 'mort') continue
    if (f.type in UNITS) vus.add(f.type as UnitId)
  }
  return (Object.keys(UNITS) as UnitId[]).filter((u) => vus.has(u))
}

/**
 * LES HÉROS TELS QUE LA BATAILLE LES A POSÉS, et non tels que le plan les rêve.
 *
 * En paix on lit `plan.heros` ; sous les flèches c'est le TERRAIN qui dit la
 * vérité : le pan voyage sur le combattant (`Fighter.secteur`, posé une fois par
 * `appliquerPlanHeros`), un héros dont le pan n'était pas assailli n'en a aucun,
 * et un héros tombé n'est plus nulle part. Lire le plan ici afficherait Hector
 * au nord alors qu'il gît devant la porte.
 */
function herosEnLigne(b: BattleState, niveaux: Partial<Record<HeroId, number>>): HeroPlacable[] {
  const parId = new Map<HeroId, HeroPlacable>()
  for (const f of b.fighters) {
    if (!f.heros || f.camp !== b.campJoueur) continue
    const def = HEROS[f.heros]
    if (!def) continue
    parId.set(f.heros, {
      id: f.heros,
      nom: def.nom,
      emoji: def.emoji,
      couleur: def.couleur,
      niveau: niveaux[f.heros] ?? 1,
      pan: f.secteur === undefined ? null : String(f.secteur),
      present: f.etat !== 'mort',
      absence: f.etat === 'mort' ? 'mort' : null,
    })
  }
  // l'ordre du panthéon, comme partout ailleurs
  return HEROS_PLAN.map((h) => parId.get(h)).filter((x): x is HeroPlacable => x !== undefined)
}

export function BarreOrdres() {
  // la bataille où le joueur a des hommes : défense du village ou expédition
  const b = useGame((s) => s.battle ?? (s.expedition && !s.expedition.result ? s.expedition.battle : null))
  const donnerOrdre = useGame((s) => s.donnerOrdre)
  const assigner = useGame((s) => s.assignerSecteur)
  const now = useGame((s) => s.lastSeen)
  const etatsHeros = useGame((s) => s.heros)
  const plan = usePlanDefense()
  // les rangs ne se rendent que dépliés : repliés, ils coûteraient une trentaine
  // de nœuds quatre fois par seconde pour rien
  const [ouvert, setOuvert] = useState(false)
  if (!b || b.result) return null

  const o = b.ordres ?? ORDRES_NEUTRES
  const attente = Math.max(0, o.prochainAt - now)
  const gele = attente > 0
  const types = typesEngages(b)
  const tireurs = types.some((u) => estTireur(u))
  const parPan = b.secteurs.length > 1 && types.length > 0
  // un pan assigné se voit sans déplier : le compteur le dit
  const assignes = types.filter((u) => o.secteurs[u] !== undefined).length
  /*
   * Les ordres du plan que ce soir ne permet pas de tenir : leur pan n'est pas
   * assailli. Le joueur DOIT le savoir, sinon il voit « au plus pressé » là où il
   * avait écrit « nord » et croit avoir perdu son réglage.
   */
  const dormants = pansDormants(plan, b.secteurs).filter((u) => types.includes(u))
  const heros = herosEnLigne(b, Object.fromEntries(HEROS_PLAN.map((h) => [h, etatsHeros?.[h]?.niveau ?? 1])))

  return (
    <>
      <div className="ordres" data-tuto="ordres">
        <JetonsLigne valeur={o.ligne} onChoisir={(id) => donnerOrdre('ligne', id)} gele={gele} attente={attente} />
        <JetonsTir valeur={o.tir} onChoisir={(id) => donnerOrdre('tir', id)} gele={gele} tireurs={tireurs}>
          {/*
            LE PLI. L'assignation par pan n'a de sens qu'à partir de deux fronts et
            n'intéresse pas tout le monde à chaque assaut : elle se replie donc
            derrière un jeton. Ce n'est plus un `<details>` : le pliage natif
            imposait un `<summary>` encadré à l'intérieur de la rangée de tir - un
            cadre de plus - et forçait le contenu à rester enfant de cette rangée.
            Un bouton et un frère, et la section des pans devient une SECTION du
            panneau, au même rang que les ordres, séparée par un filet.
          */}
          {parPan && (
            <Astuce
              titre="⚔ Tenir un pan"
              resume="Désignez une troupe, puis le pan qu’elle doit tenir : ces hommes-là s’y postent et n’y frappent que ce qui l’assaille. C’est la seule réponse à un assaut sur trois fronts quand on n’a qu’une garnison."
              note="Se règle à froid dans le plan de défense, aux remparts - c'est là que les héros se postent aussi."
            >
              <button
                className={`ordres-pli${ouvert ? ' actif' : ''}`}
                aria-expanded={ouvert}
                onClick={() => setOuvert((v) => !v)}
              >
                ⚔ Pans{assignes > 0 ? ` · ${assignes}` : ''}
                {dormants.length > 0 ? ' ⚠' : ''}
              </button>
            </Astuce>
          )}
        </JetonsTir>
      </div>

      {parPan && ouvert && (
        <div className="ordres-pans">
          <SchemaEnceinte
            disposition="rangs"
            /*
              Rangés DU NORD AU SUD, et non dans l'ordre où la bataille a tiré
              ses fronts. C'est ce que le joueur a sous les yeux : la jauge du
              nord en haut de l'écran, celle du sud en bas. Une liste qui
              n'aurait pas cet ordre-là obligerait à traduire, et l'ellipse du
              plan, elle, n'a jamais eu ce problème - elle montrait la position.
            */
            pans={b.secteurs
              .map((sec, i) => ({
                id: String(i),
                nom: sec.nom,
                angle: sec.angle,
                unites: types.filter((u) => o.secteurs[u] === i),
                part: sec.max > 0 ? sec.hp / sec.max : 0,
                breche: sec.breche,
                assailli: true,
              }))
              .sort((a, c) => a.angle - c.angle)}
            reserve={types.filter((u) => o.secteurs[u] === undefined)}
            effectifs={b.engages}
            dormants={dormants}
            heros={heros}
            /* pas de `onDeposerHero` : voir `JetonHero`, `posterHeros` téléporte */
            onDeposer={(u, pan) => assigner(u, pan === null ? null : Number(pan))}
            /*
              L'avertissement tient sur UNE ligne, et il le doit : le panneau a
              298 px de haut au plus, et le pire cas en consomme 294. Le détail est dit trois
              fois ailleurs - le ⚠ sur le jeton « Pans », la bordure orange en
              tirets du jeton qui dort, et son astuce au survol.
            */
            note={
              dormants.length > 0 ? (
                <>⚠ {dormants.map((u) => UNITS[u].emoji).join(' ')} : leur pan n’est pas assailli ce soir.</>
              ) : undefined
            }
            /*
              LE GESTE DE REPLI, accroché au rang qui le nomme. `assignerSecteur`
              n'est soumis à AUCUN délai - c'est `donnerOrdre` qui porte
              `DELAI_ORDRE_MS`, pas lui (store.ts, `assignerSecteur` ne lit même
              pas `prochainAt`) - donc rendre toute la garnison au plus pressé se
              fait à la seconde où la brèche s'ouvre. C'est l'ordre qui vaut
              alors, et il tient en un clic.
            */
            repli={
              assignes > 0 ? (
                <Astuce
                  titre="↩ Tout au plus pressé"
                  resume="Vos hommes cessent de tenir leur pan et courent au mur enfoncé. Le réglage du plan n’est pas effacé : il reprendra à la prochaine bataille."
                  note="Aucun délai sur cet ordre-là - il part tout de suite."
                >
                  <button className="ordres-repli" onClick={() => types.forEach((u) => assigner(u, null))}>
                    ↩ tous
                  </button>
                </Astuce>
              ) : undefined
            }
          />
        </div>
      )}
    </>
  )
}
