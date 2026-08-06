import { useState, type CSSProperties, type ReactNode } from 'react'
import { DELAI_ORDRE_MS, EFFETS_LIGNE, EFFETS_TIR, ORDRES_NEUTRES, estTireur } from '../../game/combat'
import { UNITS } from '../../game/data'
import { pansDormants, planValide, type PlanDefense } from '../../game/plandefense'
import { useGame } from '../../game/store'
import type { BattleState, OrdreLigne, OrdreTir, UnitId } from '../../game/types'
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
  onChoisir: (u: UnitId | null) => void
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
          onChoisir(u)
          e.dataTransfer.setData('text/plain', u)
          e.dataTransfer.effectAllowed = 'move'
        }}
        onClick={() => onChoisir(choisi ? null : u)}
        aria-pressed={choisi}
      >
        {UNITS[u].emoji}
        <i>{effectif}</i>
      </button>
    </Astuce>
  )
}

/** une zone où poser des hommes : un pan de l'enceinte, ou la réserve (`pan === null`) */
function ZonePan({
  pan,
  titre,
  unites,
  effectifs,
  dormants,
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
  effectifs: Partial<Record<UnitId, number>>
  dormants: UnitId[]
  choisi: UnitId | null
  onChoisir: (u: UnitId | null) => void
  onDeposer: (u: UnitId, pan: string | null) => void
  style?: CSSProperties
  classe?: string
  detail?: ReactNode
}) {
  return (
    <div
      className={`plan-zone ${classe}`}
      style={style}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const u = e.dataTransfer.getData('text/plain') as UnitId
        if (u in UNITS) onDeposer(u, pan)
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
            choisi={choisi === u}
            dort={dormants.includes(u)}
            onChoisir={onChoisir}
          />
        ))}
        {/* la cible accessible : elle n'apparaît qu'une fois la troupe désignée */}
        {choisi !== null && !unites.includes(choisi) && (
          <button className="plan-poser" onClick={() => onDeposer(choisi, pan)}>
            {UNITS[choisi].emoji} ici
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
 * On désigne une troupe, puis le pan qu'elle doit tenir. Le glisser-déposer fait
 * la même chose pour qui préfère la souris ; le clavier suit les boutons.
 */
export function SchemaEnceinte({
  pans,
  reserve,
  effectifs,
  dormants = [],
  onDeposer,
  note,
  compact = false,
}: {
  pans: PanCarte[]
  /** les types qu'aucun pan ne retient : ils vont au plus pressé */
  reserve: UnitId[]
  effectifs: Partial<Record<UnitId, number>>
  /** ordres qui ne commandent personne ce soir : leur pan n'est pas assailli */
  dormants?: UnitId[]
  onDeposer: (u: UnitId, pan: string | null) => void
  note?: ReactNode
  /** gabarit réduit : sous les flèches, la plaine doit rester visible */
  compact?: boolean
}) {
  const [choisi, setChoisi] = useState<UnitId | null>(null)
  const deposer = (u: UnitId, pan: string | null) => {
    onDeposer(u, pan)
    setChoisi(null)
  }

  return (
    <div className={`plan-carte${compact ? ' compact' : ''}`}>
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
            effectifs={effectifs}
            dormants={dormants}
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
          effectifs={effectifs}
          dormants={dormants}
          choisi={choisi}
          onChoisir={setChoisi}
          onDeposer={deposer}
          classe="reserve"
          style={{ left: `${((G.cx / G.w) * 100).toFixed(1)}%`, top: `${((G.cy / G.h) * 100).toFixed(1)}%` }}
        />
      </div>

      <div className="plan-aide">
        {choisi ? (
          <>
            {UNITS[choisi].emoji} <b>{UNITS[choisi].nom}</b> - désignez le pan à tenir, ou « Au plus pressé ».
          </>
        ) : (
          (note ?? <>Cliquez une troupe, puis le pan qu’elle doit tenir. Le glisser-déposer marche aussi.</>)
        )}
      </div>
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

export function BarreOrdres() {
  // la bataille où le joueur a des hommes : défense du village ou expédition
  const b = useGame((s) => s.battle ?? (s.expedition && !s.expedition.result ? s.expedition.battle : null))
  const donnerOrdre = useGame((s) => s.donnerOrdre)
  const assigner = useGame((s) => s.assignerSecteur)
  const now = useGame((s) => s.lastSeen)
  const plan = usePlanDefense()
  // le schéma ne se rend que déplié : replié, il coûterait quarante nœuds SVG
  // quatre fois par seconde pour rien
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

  return (
    <div className="ordres" data-tuto="ordres">
      <JetonsLigne valeur={o.ligne} onChoisir={(id) => donnerOrdre('ligne', id)} gele={gele} attente={attente} />
      <JetonsTir valeur={o.tir} onChoisir={(id) => donnerOrdre('tir', id)} gele={gele} tireurs={tireurs}>
        {/*
          L'assignation par pan n'a de sens qu'à partir de deux fronts, et elle
          n'intéresse qu'un joueur qui veut vraiment répartir sa garnison. Elle se
          replie donc derrière un jeton, au lieu d'occuper la moitié du ciel.
          Dépliée, c'est le MÊME schéma que celui du plan de défense : on ne
          redécouvre pas une interface sous les flèches.
        */}
        {parPan && (
          <details className="ordres-pans" onToggle={(e) => setOuvert(e.currentTarget.open)}>
            {/*
              L'astuce est DANS le résumé, et non autour du `details`. Deux raisons,
              apprises l'une après l'autre : un `<span>` intercalé entre `details`
              et `summary` casse le pliage du navigateur (le résumé doit rester
              premier enfant) ; et une astuce dont on couperait l'activité au
              dépliage changerait le type du nœud à cet endroit - React
              démonterait le `details`, qui se refermerait tout seul.
            */}
            <summary>
              <Astuce
                titre="⚔ Tenir un pan"
                resume="Assignez un type d’unité à un secteur : ces hommes-là s’y postent et n’y frappent que ce qui l’assaille. C’est la seule réponse à un assaut sur trois fronts quand on n’a qu’une garnison."
                note="Réglé d’avance dans le plan de défense, aux remparts."
              >
                <span>
                  ⚔ Pans{assignes > 0 ? ` · ${assignes}` : ''}
                  {dormants.length > 0 ? ' ⚠' : ''}
                </span>
              </Astuce>
            </summary>
            {ouvert && (
              <SchemaEnceinte
                pans={b.secteurs.map((sec, i) => ({
                  id: String(i),
                  nom: sec.nom,
                  angle: sec.angle,
                  unites: types.filter((u) => o.secteurs[u] === i),
                  part: sec.max > 0 ? sec.hp / sec.max : 0,
                  breche: sec.breche,
                  assailli: true,
                }))}
                reserve={types.filter((u) => o.secteurs[u] === undefined)}
                effectifs={b.engages}
                dormants={dormants}
                compact
                onDeposer={(u, pan) => assigner(u, pan === null ? null : Number(pan))}
                note={
                  dormants.length > 0 ? (
                    <>
                      ⚠ Votre plan poste {dormants.map((u) => UNITS[u].emoji).join(' ')} sur un pan que personne
                      n’assaille aujourd’hui : ces hommes vont au plus pressé.
                    </>
                  ) : undefined
                }
              />
            )}
          </details>
        )}
      </JetonsTir>
    </div>
  )
}
