import type { ReactNode } from 'react'
import { AOBase, OmbreVolume, PAL, alea } from '../art'
import { Amphore, Banniere, Buisson, Caisse, Charrette, Chevre, Feu, Ratelier, Sac } from './primitives'

/*
 * ═══════════════════════ LA VIE DES BÂTIMENTS (v2) ═══════════════════════
 * Ce qui s'ajoute AUTOUR de chaque édifice, niveau après niveau, pour que
 * l'amélioration se VOIE : oiseaux de plus en plus nombreux, fumées, fanions,
 * ruches, linge, offrandes, lumière divine…
 *
 * Règles tenues (docs/STYLE-ART.md) :
 *  · rien ne touche au dessin d'origine - la vie se pose PAR-DESSUS, à la
 *    périphérie de l'emprise (|x| ≥ 66 au sol) ou dans le ciel (y ≤ -58) ;
 *    les artisans d'Ouvriers.tsx gardent leurs repères ;
 *  · lumière NW, ombres portées SE (#241a08), zéro contour noir ;
 *  · aucun Math.random : alea(seed) ;
 *  · animations SMIL permanentes, posées au montage (pas besoin d'AnimT) ;
 *  · boîte x ∈ [-135, 135], y ∈ [-100, +32].
 */

// ─────────────────────────── oiseaux en vol ───────────────────────────────

const AILE_H = 'M-5,-0.8 Q-2.4,-3.2 0,0 Q2.4,-3.2 5,-0.8 Q2.4,-1.3 0,0.9 Q-2.4,-1.3 -5,-0.8 Z'
const AILE_B = 'M-5,1.9 Q-2.4,-0.3 0,0 Q2.4,-0.3 5,1.9 Q2.4,1.3 0,0.9 Q-2.4,1.3 -5,1.9 Z'
/** planeur (rapace, cigogne) : ailes longues, presque immobiles, doigts écartés */
const AILE_PLANE = 'M-7,-0.4 Q-3.6,-1.8 0,0 Q3.6,-1.8 7,-0.4 L6.2,0.4 Q3.4,-0.6 0,1 Q-3.4,-0.6 -6.2,0.4 Z'
const AILE_PLANE2 = 'M-7,0.4 Q-3.6,-1.2 0,0 Q3.6,-1.2 7,0.4 L6.2,1.1 Q3.4,0 0,1 Q-3.4,0 -6.2,1.1 Z'

type Espece = 'mouette' | 'colombe' | 'corbeau' | 'hirondelle' | 'rapace' | 'pigeon'
const PLUMAGE: Record<Espece, { dessous: string; dessus: string; corps: string; bec: string }> = {
  mouette: { dessous: '#b9c3c4', dessus: '#f6f3ea', corps: '#fffdf6', bec: '#dd9a3c' },
  colombe: { dessous: '#d8d2c4', dessus: '#fffdf8', corps: '#ffffff', bec: '#d9a97c' },
  pigeon: { dessous: '#7d8791', dessus: '#aab3b9', corps: '#c3c9cc', bec: '#5a5550' },
  corbeau: { dessous: '#1f1c1a', dessus: '#3e3935', corps: '#2c2825', bec: '#1a1714' },
  hirondelle: { dessous: '#1d2a3c', dessus: '#34496a', corps: '#e8dcc0', bec: '#1a1714' },
  rapace: { dessous: '#5e4128', dessus: '#9a6f45', corps: '#7c5634', bec: '#e0b256' },
}

/** un oiseau qui tourne en grand orbe lent ; `debut` décale la phase */
export function OiseauVol({
  cx, cy, rx, ry, dur, debut = 0, s = 1, sens = 1, espece = 'mouette',
}: { cx: number; cy: number; rx: number; ry: number; dur: number; debut?: number; s?: number; sens?: 1 | -1; espece?: Espece }) {
  const sw = sens > 0 ? 1 : 0
  const orbe = `M${cx - rx},${cy} a${rx},${ry} 0 1 ${sw} ${rx * 2},0 a${rx},${ry} 0 1 ${sw} ${-rx * 2},0`
  const p = PLUMAGE[espece]
  const plane = espece === 'rapace'
  const a1 = plane ? AILE_PLANE : AILE_H
  const a2 = plane ? AILE_PLANE2 : AILE_B
  const bat = `${(plane ? 3.2 : espece === 'hirondelle' ? 0.35 : 0.8 + (debut % 3) * 0.08).toFixed(2)}s`
  const k = espece === 'hirondelle' ? 0.7 : 1
  return (
    <g>
      <animateMotion path={orbe} dur={`${dur}s`} begin={`${-debut}s`} repeatCount="indefinite" />
      <g transform={`scale(${s * k})`}>
        <path d={a1} fill={p.dessous}>
          <animate attributeName="d" values={`${a1};${a2};${a1}`} dur={bat} begin={`${-debut * 0.37}s`} repeatCount="indefinite" />
        </path>
        <path d={a1} fill={p.dessus} transform="translate(-0.3,-0.35) scale(0.9)">
          <animate attributeName="d" values={`${a1};${a2};${a1}`} dur={bat} begin={`${-debut * 0.37}s`} repeatCount="indefinite" />
        </path>
        {espece === 'hirondelle' && <path d="M0.8,0.4 L3.4,2.2 L1.6,0.4 L3.6,1.2 Z" fill={p.dessous} />}
        <ellipse cx={0} cy={0.1} rx={1.7} ry={0.95} fill={p.corps} />
        <path d="M-1.9,-0.2 L-2.9,0.1 L-1.9,0.4 Z" fill={p.bec} />
      </g>
    </g>
  )
}

/** une volée : n oiseaux sur des orbes voisins, phases réparties (déterministe) */
export function Volee({ n, cx, cy, espece, seed = 1, s = 0.75, largeur = 30 }: { n: number; cx: number; cy: number; espece: Espece; seed?: number; s?: number; largeur?: number }) {
  const rnd = alea(seed)
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <OiseauVol
          key={i}
          cx={cx + (rnd() - 0.5) * 18}
          cy={cy + (rnd() - 0.5) * 10}
          rx={largeur * (0.6 + rnd() * 0.6)}
          ry={6 + rnd() * 5}
          dur={espece === 'rapace' ? 30 + rnd() * 10 : 16 + rnd() * 14}
          debut={rnd() * 20}
          s={s * (0.8 + rnd() * 0.3)}
          sens={i % 2 ? -1 : 1}
          espece={espece}
        />
      ))}
    </g>
  )
}

/** pigeon posé qui picore (la tête plonge par à-coups) */
export function OiseauSol({ x, y, s = 1, flip = false, espece = 'pigeon', debut = 0 }: { x: number; y: number; s?: number; flip?: boolean; espece?: Espece; debut?: number }) {
  const p = PLUMAGE[espece]
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s})`}>
      <ellipse cx={1} cy={0.4} rx={3} ry={0.9} fill={PAL.ombrePortee} opacity={0.2} />
      <path d="M-2.4,-1.2 C-2.6,-3.4 0,-4.2 2,-3.2 L4,-2.6 L2.4,-1.4 C1.6,-0.4 -1.4,-0.2 -2.4,-1.2 Z" fill={p.dessous} />
      <path d="M-2,-2.2 C-1.6,-3.6 0.4,-4 1.8,-3.2 C0.4,-3.2 -1,-2.8 -2,-2.2 Z" fill={p.dessus} />
      <path d="M-0.8,-0.6 L-1,0.2 M0.6,-0.6 L0.8,0.2" stroke="#b86a5a" strokeWidth={0.4} />
      <g>
        <animateTransform attributeName="transform" type="rotate" values="0 -1.8 -2.6;0 -1.8 -2.6;38 -1.8 -2.6;0 -1.8 -2.6;0 -1.8 -2.6" keyTimes="0;0.55;0.65;0.75;1" dur="2.6s" begin={`${-debut}s`} repeatCount="indefinite" />
        <circle cx={-2.6} cy={-3.6} r={1.05} fill={p.corps} />
        <circle cx={-2.9} cy={-3.8} r={0.28} fill="#1a1714" />
        <path d="M-3.5,-3.6 L-4.5,-3.3 L-3.5,-3.1 Z" fill={p.bec} />
      </g>
    </g>
  )
}

// ─────────────────────────── petites vies ─────────────────────────────────

/** papillon qui volète en huit autour d'un point */
export function Papillon({ x, y, c = '#e8c04a', debut = 0 }: { x: number; y: number; c?: string; debut?: number }) {
  const huit = `M${x},${y} c6,-5 10,2 4,4 c-6,2 -10,-6 -4,-4 c-4,4 -9,-2 -4,-5 c5,-3 8,3 4,5 Z`
  return (
    <g>
      <animateMotion path={huit} dur="7s" begin={`${-debut}s`} repeatCount="indefinite" />
      <path d="M0,0 Q-2.2,-2.4 -2.4,-0.2 Q-1.6,1.2 0,0 Q2.2,-2.4 2.4,-0.2 Q1.6,1.2 0,0 Z" fill={c}>
        <animateTransform attributeName="transform" type="scale" values="1 1;0.25 1;1 1" dur="0.28s" repeatCount="indefinite" />
      </path>
    </g>
  )
}

/** étincelles qui jaillissent et retombent en s'éteignant */
export function Etincelles({ x, y, n = 6, seed = 5, force = 1 }: { x: number; y: number; n?: number; seed?: number; force?: number }) {
  const rnd = alea(seed)
  return (
    <g transform={`translate(${x},${y})`}>
      {Array.from({ length: n }, (_, i) => {
        const dx = (rnd() - 0.4) * 16 * force
        const hy = -(6 + rnd() * 9) * force
        const d = 0.9 + rnd() * 0.8
        const b = rnd() * 2
        return (
          <circle key={i} r={0.55} fill={i % 2 ? '#ffd27a' : '#fff1c2'} opacity={0}>
            <animateMotion path={`M0,0 Q${dx * 0.5},${hy} ${dx},${-hy * 0.3}`} dur={`${d}s`} begin={`${b}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.9;0" dur={`${d}s`} begin={`${b}s`} repeatCount="indefinite" />
          </circle>
        )
      })}
    </g>
  )
}

/** bouffées de poussière qui gonflent et se dissipent (carrière, chantier) */
export function Poussiere({ x, y, s = 1, debut = 0, c = '#e6dcc2' }: { x: number; y: number; s?: number; debut?: number; c?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} filter="url(#a-flou2)">
      {[0, 1.6, 3.1].map((d, i) => (
        <ellipse key={i} cx={i * 3 - 3} cy={0} rx={2} ry={1.4} fill={c} opacity={0}>
          <animate attributeName="rx" values="2;9" dur="4.6s" begin={`${-debut + d}s`} repeatCount="indefinite" />
          <animate attributeName="ry" values="1.4;5" dur="4.6s" begin={`${-debut + d}s`} repeatCount="indefinite" />
          <animate attributeName="cy" values="0;-9" dur="4.6s" begin={`${-debut + d}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0" dur="4.6s" begin={`${-debut + d}s`} repeatCount="indefinite" />
        </ellipse>
      ))}
    </g>
  )
}

/** fanion triangulaire qui claque au vent, sur sa hampe */
export function Fanion({ x, y, h = 20, c = '#b0412e', c2 = '#e2735a', s = 1, debut = 0 }: { x: number; y: number; h?: number; c?: string; c2?: string; s?: number; debut?: number }) {
  const f1 = `M0.9,${-h + 0.6} Q6,${-h + 1} 12,${-h + 3.4} Q6,${-h + 4.6} 0.9,${-h + 6.6} Z`
  const f2 = `M0.9,${-h + 0.6} Q6,${-h + 3} 12,${-h + 2.4} Q6,${-h + 6} 0.9,${-h + 6.6} Z`
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={1.6} cy={0.6} rx={3.2} ry={1.1} fill={PAL.ombrePortee} opacity={0.2} />
      <line x1={0} y1={0} x2={0} y2={-h} stroke="#6a4e30" strokeWidth={1.4} />
      <line x1={-0.45} y1={0} x2={-0.45} y2={-h} stroke="#a8845d" strokeWidth={0.5} />
      <circle cx={0} cy={-h - 0.6} r={0.9} fill={PAL.or} />
      <path d={f1} fill={c}>
        <animate attributeName="d" values={`${f1};${f2};${f1}`} dur="1.8s" begin={`${-debut}s`} repeatCount="indefinite" />
      </path>
      <path d={`M0.9,${-h + 0.6} Q4,${-h + 1} 7,${-h + 2} L0.9,${-h + 3.2} Z`} fill={c2} opacity={0.7} />
    </g>
  )
}

/** brasero de bronze sur trépied, feu vif */
export function Brasero({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2} cy={0.6} rx={4.6} ry={1.4} fill={PAL.ombrePortee} opacity={0.2} />
      <path d="M-3,0 L-1.6,-6 M3,0 L1.6,-6 M0,0.6 L0,-6" stroke="#5c4018" strokeWidth={0.9} />
      <path d="M-4,-6 L4,-6 L3,-9 L-3,-9 Z" fill="#a8702a" />
      <path d="M-4,-6 L-1,-6 L-0.8,-9 L-3,-9 Z" fill="#e0b256" />
      <ellipse cx={0} cy={-9} rx={3} ry={0.8} fill="#f7e3a8" />
      <circle cx={0} cy={-11} r={6.5} fill="#f8c86c" opacity={0.2} filter="url(#a-flou4)" />
      <Feu x={0} y={-10.4} r={1.6} />
    </g>
  )
}

/** trépied votif de bronze à chaudron, offrande des cités prospères */
export function Tripode({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <AOBase rx={6} ry={1.8} cy={0.4} />
      <OmbreVolume w={8} h={14} o={0.14} />
      <path d="M-3.6,0 L-1.8,-10 M3.6,0 L1.8,-10 M0,0.8 L0,-10" stroke="#8a5a20" strokeWidth={1.1} />
      <path d="M-3.6,0 L-1.8,-10" stroke="#e0b256" strokeWidth={0.4} />
      <path d="M-5,-10 Q-5,-15 0,-15 Q5,-15 5,-10 Z" fill="#b98034" />
      <path d="M-5,-10 Q-5,-15 0,-15 Q-2.6,-13.6 -2.6,-10 Z" fill="#f0c874" />
      <ellipse cx={0} cy={-15} rx={5} ry={1.2} fill="#6e4614" />
      <path d="M-4,-15.6 A2,2 0 1 1 -1.6,-17.4 M4,-15.6 A2,2 0 1 0 1.6,-17.4" stroke="#c98f3a" strokeWidth={0.8} fill="none" />
    </g>
  )
}

/** rayons de lumière divine qui tombent du ciel, respiration lente */
export function RayonsDivins({ x, y, h = 70, larg = 70 }: { x: number; y: number; h?: number; larg?: number }) {
  return (
    <g transform={`translate(${x},${y})`} filter="url(#a-flou2)">
      <defs>
        <linearGradient id="vie-rayon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff6d6" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fff6d6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[-0.42, -0.14, 0.16, 0.4].map((t, i) => (
        <path key={i} d={`M${t * 16 - 2.4},${-h} L${t * 16 + 2.4},${-h} L${t * larg + 9},0 L${t * larg - 9},0 Z`} fill="url(#vie-rayon)" opacity={0.4}>
          <animate attributeName="opacity" values="0.18;0.5;0.18" dur={`${6 + i * 1.3}s`} begin={`${-i * 1.7}s`} repeatCount="indefinite" />
        </path>
      ))}
    </g>
  )
}

/** fumée d'encens : filet mince qui ondule en montant */
export function Encens({ x, y }: { x: number; y: number }) {
  const d1 = `M${x},${y} C${x - 3},${y - 8} ${x + 4},${y - 14} ${x},${y - 24}`
  const d2 = `M${x},${y} C${x + 3},${y - 8} ${x - 4},${y - 15} ${x + 1},${y - 24}`
  return (
    <path d={d1} stroke="#efe9dc" strokeWidth={1.3} fill="none" opacity={0.45} strokeLinecap="round" filter="url(#a-flou1)">
      <animate attributeName="d" values={`${d1};${d2};${d1}`} dur="5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.45;0.25;0.45" dur="5s" repeatCount="indefinite" />
    </path>
  )
}

/** corde à linge entre deux perches, étoffes qui balancent */
export function Linge({ x, y, s = 1, tons = ['#e8dcc0', '#b0412e', '#6f8fa8'] }: { x: number; y: number; s?: number; tons?: string[] }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={3} cy={0.8} rx={14} ry={2.2} fill={PAL.ombrePortee} opacity={0.14} filter="url(#a-flou1)" />
      {[-11, 11].map((px) => (
        <g key={px}>
          <rect x={px - 0.7} y={-15} width={1.4} height={15} fill="#6a4e30" />
          <rect x={px - 0.7} y={-15} width={0.5} height={15} fill="#9c7b51" />
        </g>
      ))}
      <path d="M-11,-14 Q0,-11.4 11,-14" stroke="#cdbf9c" strokeWidth={0.45} fill="none" />
      {tons.map((c, i) => {
        const cx = -6 + i * 6
        const top = -12.8 + Math.abs(cx) * 0.03
        return (
          <g key={i}>
            <animateTransform attributeName="transform" type="rotate" values={`-5 ${cx} ${top};5 ${cx} ${top};-5 ${cx} ${top}`} dur={`${2.6 + i * 0.4}s`} repeatCount="indefinite" />
            <path d={`M${cx - 2.4},${top} L${cx + 2.4},${top} L${cx + 2.1},${top + 6.4} L${cx - 2.2},${top + 6} Z`} fill={c} />
            <path d={`M${cx - 2.4},${top} L${cx - 0.8},${top} L${cx - 1},${top + 6.1} L${cx - 2.2},${top + 6} Z`} fill="#fffaf0" opacity={0.25} />
            <path d={`M${cx + 1},${top} L${cx + 2.4},${top} L${cx + 2.1},${top + 6.4} L${cx + 1.2},${top + 6.2} Z`} fill={PAL.ombrePortee} opacity={0.18} />
          </g>
        )
      })}
    </g>
  )
}

/** pots de terre cuite fleuris (géraniums, basilic) */
export function PotsFleuris({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const pots = [
    { dx: -4, h: 4.2, fl: '#c94a3a' },
    { dx: 1.4, h: 5, fl: '#e8c04a' },
    { dx: 6, h: 3.6, fl: '#c94a3a' },
  ]
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2.6} cy={0.5} rx={8} ry={1.5} fill={PAL.ombrePortee} opacity={0.18} />
      {pots.map((p, i) => (
        <g key={i}>
          <path d={`M${p.dx - 2},${-p.h} L${p.dx + 2},${-p.h} L${p.dx + 1.5},0 L${p.dx - 1.5},0 Z`} fill={PAL.toitMi} />
          <path d={`M${p.dx - 2},${-p.h} L${p.dx - 0.6},${-p.h} L${p.dx - 0.4},0 L${p.dx - 1.5},0 Z`} fill={PAL.toitArete} opacity={0.7} />
          <rect x={p.dx - 2.3} y={-p.h - 0.8} width={4.6} height={1} fill={PAL.toitLit} />
          <ellipse cx={p.dx} cy={-p.h - 2.2} rx={2.8} ry={1.8} fill="#5e8a45" />
          <ellipse cx={p.dx - 0.8} cy={-p.h - 2.8} rx={1.6} ry={1} fill="#7fab5c" />
          {[-1.2, 0.6, 1.6].map((f, j) => (
            <circle key={j} cx={p.dx + f} cy={-p.h - 3 + (j % 2) * 1.2} r={0.75} fill={p.fl} />
          ))}
        </g>
      ))}
    </g>
  )
}

/** chat assis, la queue qui bat */
export function Chat({ x, y, s = 1, c = '#c98f4a' }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={1.4} cy={0.4} rx={3.4} ry={0.9} fill={PAL.ombrePortee} opacity={0.2} />
      <path d="M2,-0.4 Q5,-0.6 5.2,-3.6" stroke={c} strokeWidth={0.9} fill="none" strokeLinecap="round">
        <animate attributeName="d" values="M2,-0.4 Q5,-0.6 5.2,-3.6;M2,-0.4 Q5.4,0.4 6.4,-1.8;M2,-0.4 Q5,-0.6 5.2,-3.6" dur="2.4s" repeatCount="indefinite" />
      </path>
      <path d="M-2,0 C-2.6,-3 -1.4,-5 0,-5 C1.6,-5 2.6,-3 2.2,0 Z" fill={c} />
      <path d="M-2,0 C-2.6,-3 -1.4,-5 -0.2,-5 C-1,-3.6 -1.2,-2 -1,0 Z" fill="#e2b271" />
      <circle cx={-0.2} cy={-6} r={1.7} fill={c} />
      <path d="M-1.7,-7 L-1.4,-8.4 L-0.6,-7.4 Z M0.4,-7.4 L1.1,-8.4 L1.3,-7 Z" fill={c} />
      <circle cx={-0.9} cy={-6.1} r={0.25} fill="#3e5a2e" /><circle cx={0.4} cy={-6.1} r={0.25} fill="#3e5a2e" />
    </g>
  )
}

/** ruche en paille tressée (skep) sur sa pierre, abeilles en orbite */
export function Ruche({ x, y, s = 1, abeilles = 3, seed = 3 }: { x: number; y: number; s?: number; abeilles?: number; seed?: number }) {
  const rnd = alea(seed)
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={1.6} cy={0.6} rx={5} ry={1.4} fill={PAL.ombrePortee} opacity={0.2} />
      <rect x={-4.4} y={-1.6} width={8.8} height={1.8} fill={PAL.pierreMi} />
      <rect x={-4.4} y={-1.6} width={8.8} height={0.6} fill={PAL.pierreLit} />
      <path d="M-4,-1.6 C-4.4,-6 -2.6,-8.6 0,-8.6 C2.6,-8.6 4.4,-6 4,-1.6 Z" fill={PAL.chaumeOmbre} />
      <path d="M-4,-1.6 C-4.4,-6 -2.6,-8.6 -0.4,-8.6 C-1.8,-7 -2.4,-4.4 -2,-1.6 Z" fill={PAL.chaumeLit} />
      <path d="M-4.1,-3.4 Q0,-2.4 4.1,-3.4 M-3.8,-5.4 Q0,-4.4 3.8,-5.4 M-2.8,-7.2 Q0,-6.4 2.8,-7.2" stroke="#8a6f34" strokeWidth={0.45} fill="none" />
      <ellipse cx={0.4} cy={-2.4} rx={0.9} ry={0.6} fill="#3a2c1c" />
      {Array.from({ length: abeilles }, (_, i) => {
        const r = 4 + rnd() * 4
        return (
          <circle key={i} r={0.5} fill="#e8c04a">
            <animateMotion path={`M0,-5 m${-r},0 a${r},${r * 0.5} 0 1 ${i % 2} ${r * 2},0 a${r},${r * 0.5} 0 1 ${i % 2} ${-r * 2},0`} dur={`${1.4 + rnd()}s`} repeatCount="indefinite" />
          </circle>
        )
      })}
    </g>
  )
}

/** épouvantail : croix de bois, tunique en loques qui flotte, chapeau de paille */
export function Epouvantail({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={3} cy={0.6} rx={5} ry={1.3} fill={PAL.ombrePortee} opacity={0.18} />
      <rect x={-0.7} y={-20} width={1.4} height={20} fill="#6a4e30" />
      <rect x={-7} y={-15.4} width={14} height={1.2} fill="#7c5a30" />
      <rect x={-7} y={-15.4} width={14} height={0.45} fill="#a8845d" />
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-3 0 -15;4 0 -15;-3 0 -15" dur="3s" repeatCount="indefinite" />
        <path d="M-5.6,-14.4 L5.6,-14.4 L4.2,-7 L3,-8.2 L1.6,-6.6 L0,-7.8 L-1.6,-6.6 L-3,-8.2 L-4.2,-7 Z" fill="#9c8660" />
        <path d="M-5.6,-14.4 L-1,-14.4 L-1.6,-6.6 L-3,-8.2 L-4.2,-7 Z" fill="#c9b48a" />
      </g>
      <circle cx={0} cy={-17.6} r={2} fill="#d8c49a" />
      <path d="M-4,-18.6 L4,-18.6 L2,-20.6 L-2,-20.6 Z" fill={PAL.chaumeLit} />
      <path d="M-4,-18.6 L4,-18.6" stroke={PAL.chaumeOmbre} strokeWidth={0.6} />
    </g>
  )
}

/** cigogne sur son nid perché au sommet d'un poteau */
export function Cigogne({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <OmbreVolume w={3} h={30} o={0.12} />
      <rect x={-0.9} y={-26} width={1.8} height={26} fill="#6a4e30" />
      <rect x={-0.9} y={-26} width={0.6} height={26} fill="#9c7b51" />
      <ellipse cx={0} cy={-26.6} rx={5.6} ry={1.8} fill="#7c5a30" />
      <path d="M-5.4,-26.6 Q0,-28.6 5.4,-26.6" stroke="#a8845d" strokeWidth={0.6} fill="none" />
      <path d="M-4.6,-26 l1.4,0.8 M-2,-25.4 l1,1 M2,-25.6 l-1,1 M4.2,-26 l-1.2,0.9" stroke="#5f462d" strokeWidth={0.5} />
      <path d="M-2.6,-27.4 C-3,-31 0,-32 2.4,-30.4 L3.4,-28 Z" fill="#f6f3ea" />
      <path d="M1,-30.6 L3.6,-28 L1.4,-27.6 Z" fill="#2c2825" />
      <g>
        <animateTransform attributeName="transform" type="rotate" values="0 -2 -31;0 -2 -31;-18 -2 -31;0 -2 -31" keyTimes="0;0.7;0.8;1" dur="5s" repeatCount="indefinite" />
        <path d="M-2,-31 Q-2.8,-33.6 -2,-35.6" stroke="#f6f3ea" strokeWidth={0.9} fill="none" />
        <circle cx={-2} cy={-35.8} r={0.9} fill="#ffffff" />
        <path d="M-2.6,-35.8 L-5.8,-35.2 L-2.6,-35.2 Z" fill="#d05a41" />
      </g>
    </g>
  )
}

/** pile de grumes écorcées, bout de bois tourné vers le joueur */
export function PileGrumes({ x, y, s = 1, rangs = 2 }: { x: number; y: number; s?: number; rangs?: number }) {
  const g: ReactNode[] = []
  let k = 0
  for (let r = 0; r < rangs; r++) {
    const nb = 3 - r
    for (let i = 0; i < nb; i++) {
      const cx = -6 + i * 5 + r * 2.5
      const cy = -2.3 - r * 4.1
      g.push(
        <g key={k++}>
          <path d={`M${cx},${cy - 2.3} L${cx + 12},${cy - 4.8} L${cx + 12},${cy - 0.2} L${cx},${cy + 2.3} Z`} fill={r % 2 ? '#7c5a30' : '#6a4b2a'} />
          <path d={`M${cx},${cy - 2.3} L${cx + 12},${cy - 4.8}`} stroke="#a98050" strokeWidth={0.6} />
          <ellipse cx={cx} cy={cy} rx={2.4} ry={2.3} fill="#cba66b" />
          <ellipse cx={cx} cy={cy} rx={1.3} ry={1.2} fill="none" stroke="#a47f4c" strokeWidth={0.4} />
        </g>,
      )
    }
  }
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={6} cy={0.6} rx={14} ry={2.4} fill={PAL.ombrePortee} opacity={0.2} filter="url(#a-flou1)" />
      {g}
    </g>
  )
}

/** mannequin d'entraînement : poteau, bras, bouclier d'osier, entailles */
export function Mannequin({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={3} cy={0.6} rx={5.4} ry={1.4} fill={PAL.ombrePortee} opacity={0.2} />
      <rect x={-1} y={-18} width={2} height={18} fill="#6a4e30" />
      <rect x={-1} y={-18} width={0.7} height={18} fill="#9c7b51" />
      <rect x={-6.4} y={-14} width={12.8} height={1.4} fill="#7c5a30" />
      <path d="M-3.6,-13 L3.6,-13 L3,-5 L-3,-5 Z" fill={PAL.chaumeOmbre} />
      <path d="M-3.6,-13 L-1,-13 L-1.2,-5 L-3,-5 Z" fill={PAL.chaumeLit} />
      <path d="M-3.4,-10.4 L3.4,-10.4 M-3.2,-7.8 L3.2,-7.8" stroke="#8a6f34" strokeWidth={0.5} />
      <circle cx={0} cy={-19.6} r={2.2} fill={PAL.chaumeLit} />
      <path d="M-1.6,-11.4 l3,1.6 M-0.4,-8.6 l2.6,-1" stroke="#5f462d" strokeWidth={0.4} />
      <circle cx={6.4} cy={-10} r={3.6} fill="#8e3b2a" />
      <path d="M2.8,-10 A3.6,3.6 0 0 1 6.4,-13.6 A3.6,3.6 0 0 0 2.8,-10 Z" fill="#c65a3e" />
      <circle cx={6.4} cy={-10} r={3.6} fill="none" stroke="#c98f3a" strokeWidth={0.7} />
    </g>
  )
}

/** trophée (tropaion) : casque et cuirasse pris à l'ennemi, sur un tronc */
export function Trophee({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <AOBase rx={6} ry={1.8} cy={0.4} />
      <OmbreVolume w={6} h={26} o={0.14} />
      <rect x={-1.2} y={-22} width={2.4} height={22} fill="#5f462d" />
      <rect x={-1.2} y={-22} width={0.8} height={22} fill="#8a6535" />
      <rect x={-8} y={-19} width={16} height={1.4} fill="#6a4b2a" />
      <path d="M-4.6,-18 L4.6,-18 L3.8,-8 L-3.8,-8 Z" fill="#b98034" />
      <path d="M-4.6,-18 L-1.2,-18 L-1.4,-8 L-3.8,-8 Z" fill="#f0c874" />
      <path d="M-2.6,-15 Q0,-13.6 2.6,-15 M-2.8,-11.6 Q0,-10.4 2.8,-11.6" stroke="#6e4614" strokeWidth={0.5} fill="none" />
      <path d="M-3.2,-23 Q-3.4,-28 0,-28.2 Q3.4,-28 3.2,-23 L2.8,-20.4 L1,-21 L0.6,-23.4 L-0.6,-23.4 L-1,-21 L-2.8,-20.4 Z" fill="#c98f3a" />
      <path d="M-3.2,-23 Q-3.4,-28 0,-28.2 Q-1.6,-27 -1.8,-23 Z" fill="#fbe2a0" />
      <path d="M-4,-27.4 Q0,-32.6 4,-27.4 Q0,-30.4 -4,-27.4 Z" fill="#b0412e" />
      <circle cx={-7} cy={-17.4} r={2.6} fill="#8e3b2a" /><circle cx={-7} cy={-17.4} r={2.6} fill="none" stroke="#c98f3a" strokeWidth={0.6} />
      <line x1={8} y1={-18.4} x2={10} y2={-2} stroke="#6a4b2a" strokeWidth={0.8} />
      <path d="M8,-18.4 L7.2,-21.4 L8.8,-21.4 Z" fill="#e0b256" />
    </g>
  )
}

/** boucliers ronds adossés, en rang */
export function Boucliers({ x, y, s = 1, n = 3 }: { x: number; y: number; s?: number; n?: number }) {
  const tons = [['#8e3b2a', '#c65a3e'], ['#a8813a', '#e0bc66'], ['#3f5d74', '#6f8fa8']]
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={n * 2.6} cy={0.6} rx={n * 3.8} ry={1.4} fill={PAL.ombrePortee} opacity={0.18} />
      {Array.from({ length: n }, (_, i) => {
        const [a, b] = tons[i % 3]
        const cx = i * 5.4
        return (
          <g key={i}>
            <ellipse cx={cx} cy={-3.6} rx={3.2} ry={3.8} fill={a} />
            <path d={`M${cx - 3.2},-3.6 A3.2,3.8 0 0 1 ${cx},-7.4 A3.2,3.8 0 0 0 ${cx - 3.2},-3.6 Z`} fill={b} />
            <ellipse cx={cx} cy={-3.6} rx={3.2} ry={3.8} fill="none" stroke="#c98f3a" strokeWidth={0.6} />
            <circle cx={cx} cy={-3.6} r={0.8} fill="#f6e2a4" />
          </g>
        )
      })}
    </g>
  )
}

/** enclume de plein air sur sa souche, étincelles au rythme du marteau */
export function EnclumeDehors({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2} cy={0.6} rx={5.4} ry={1.5} fill={PAL.ombrePortee} opacity={0.22} />
      <path d="M-3,0 L-2.6,-5 L2.6,-5 L3,0 Z" fill="#6a4b2a" />
      <ellipse cx={0} cy={-5} rx={2.6} ry={0.8} fill="#a98050" />
      <path d="M-4.4,-5.4 L4,-5.4 L5.4,-7.2 L-2.4,-7.2 L-4.4,-6.4 Z" fill="#4a4540" />
      <path d="M-2.4,-7.2 L5.4,-7.2 L5,-7.8 L-2,-7.8 Z" fill="#8f8a84" />
      <Etincelles x={1.2} y={-8} n={7} seed={17} force={0.8} />
    </g>
  )
}

/** étendards jumeaux, pourpre et or, pour les édifices monumentaux */
function Oriflammes({ x, y, h = 30 }: { x: number; y: number; h?: number }) {
  return (
    <g>
      <Fanion x={x} y={y} h={h} c="#7c2f4e" c2="#b45f80" />
      <Fanion x={x + 7} y={y + 2.5} h={h - 3} c="#c9922f" c2="#f0cd84" debut={0.7} s={0.95} />
    </g>
  )
}

// ═════════════════════════════ PAR BÂTIMENT ═══════════════════════════════

/** Temple : le sacré se densifie - papillons du bois, encens, trépieds, lumière */
export function VieTemple({ n }: { n: number }) {
  return (
    <g>
      <Volee n={n + 1} cx={-6} cy={-70} espece="colombe" seed={11} s={0.9} largeur={36} />
      {n === 1 && (
        <>
          <Papillon x={-72} y={4} c="#e8c04a" />
          <Papillon x={70} y={-4} c="#efe3c4" debut={2.4} />
        </>
      )}
      {n >= 2 && <Encens x={-65} y={24.2} />}
      {n >= 2 && <Buisson x={-69} y={26.0} s={0.9} />}
      {n >= 3 && (
        <>
          <Tripode x={-64} y={27.8} s={0.95} />
          <Amphore x={-72} y={28.7} c="#a3673f" s={0.8} />
          <PotsFleuris x={66} y={28.7} s={0.9} />
        </>
      )}
      {n >= 4 && (
        <>
          <RayonsDivins x={0} y={-8} h={72} larg={80} />
          <Tripode x={76} y={26.0} s={0.9} />
          <Encens x={76} y={19.3} />
        </>
      )}
    </g>
  )
}

/** Agora : les pigeons, puis les fanions, puis la foule des jours de fête */
export function VieAgora({ n }: { n: number }) {
  return (
    <g>
      <OiseauSol x={-66} y={28.7} />
      <OiseauSol x={-62} y={30.1} flip debut={1.1} s={0.9} />
      {n >= 2 && <Fanion x={-75} y={26.0} h={22} c="#4f86a0" c2="#8fc0d4" />}
      {n >= 2 && <Volee n={n - 1} cx={10} cy={-66} espece="pigeon" seed={21} s={0.66} />}
      {n >= 3 && (
        <>
          <Chat x={69} y={28.7} s={0.9} />
          <OiseauSol x={73} y={30.5} s={0.85} debut={0.6} />
          <Sac x={-71} y={30.5} />
        </>
      )}
      {n >= 4 && (
        <>
          <Oriflammes x={75} y={23.3} h={32} />
          <Brasero x={-80} y={29.6} s={0.9} />
        </>
      )}
    </g>
  )
}

/** Maisons : chèvre au piquet, linge, pots fleuris, hirondelles sous les toits */
export function VieMaisons({ n }: { n: number }) {
  return (
    <g>
      <Chevre x={-72} y={27.8} />
      {n >= 2 && <Linge x={71} y={26.9} s={0.95} />}
      {n >= 2 && <Volee n={n - 1} cx={0} cy={-64} espece="hirondelle" seed={31} s={0.8} largeur={36} />}
      {n >= 3 && (
        <>
          <PotsFleuris x={-64} y={30.5} s={0.9} />
          <Chat x={-80} y={29.6} s={0.85} c="#8a8480" />
        </>
      )}
      {n >= 4 && (
        <>
          <Linge x={85} y={30.5} s={0.8} tons={['#6f9a52', '#efe3c4', '#c9922f']} />
          <Brasero x={-58} y={31.0} s={0.8} />
        </>
      )}
    </g>
  )
}

/** Ferme : corbeaux sur les sillons, épouvantail, ruches, cigogne */
export function VieFerme({ n }: { n: number }) {
  return (
    <g>
      <Volee n={n >= 2 ? 1 : 2} cx={-10} cy={-62} espece="corbeau" seed={41} s={0.7} />
      {n === 1 && <OiseauSol x={66} y={28.7} espece="corbeau" s={0.9} />}
      {n >= 2 && <Epouvantail x={-75} y={26.9} s={0.95} />}
      {n >= 3 && (
        <>
          <Ruche x={-104} y={-2} />
          <Ruche x={-96} y={3} s={0.85} seed={9} />
          <Papillon x={-100} y={-12} c="#efe3c4" />
        </>
      )}
      {n >= 4 && (
        <>
          <Cigogne x={-86} y={29.6} s={0.95} />
          <OiseauVol cx={-60} cy={-76} rx={30} ry={8} dur={34} espece="rapace" s={0.8} />
          <Ruche x={-112} y={4} s={0.8} seed={4} />
        </>
      )}
    </g>
  )
}

/** Scierie : grumes qui s'empilent, charrette, buse qui tourne au-dessus */
export function VieScierie({ n }: { n: number }) {
  return (
    <g>
      <PileGrumes x={-80} y={28.7} s={0.8} rangs={Math.min(3, n)} />
      {n >= 2 && <OiseauVol cx={0} cy={-70} rx={32} ry={9} dur={31} espece="rapace" s={0.8} />}
      {n >= 3 && <Charrette x={72} y={28.7} s={0.85} />}
      {n >= 3 && <Poussiere x={72} y={18} s={0.6} c="#d8c08a" />}
      {n >= 4 && (
        <>
          <PileGrumes x={-65} y={31.0} s={0.7} rangs={2} />
          <Fanion x={83} y={25.1} h={24} c="#6f9a52" c2="#93bb6c" />
          <OiseauVol cx={30} cy={-80} rx={22} ry={7} dur={27} debut={9} espece="rapace" s={0.66} sens={-1} />
        </>
      )}
    </g>
  )
}

/** Carrière : poussière de taille, corneilles, attelage, bloc sculpté */
export function VieCarriere({ n }: { n: number }) {
  return (
    <g>
      <Poussiere x={-20} y={-6} s={0.8} />
      {n >= 2 && <Poussiere x={24} y={-10} s={0.9} debut={2} />}
      {n >= 2 && <Volee n={2} cx={-20} cy={-64} espece="corbeau" seed={51} s={0.66} />}
      {n >= 3 && <Charrette x={75} y={28.7} s={0.9} />}
      {n >= 3 && <Caisse x={-73} y={29.6} s={0.9} />}
      {n >= 4 && (
        <>
          <Poussiere x={0} y={-2} s={1.1} debut={3.4} />
          <Fanion x={-83} y={26.9} h={24} c="#b0412e" />
          <g transform="translate(-72,24)">
            <ellipse cx={3} cy={0.6} rx={8} ry={1.8} fill={PAL.ombrePortee} opacity={0.2} />
            <path d="M-6,0 L-6,-8 L6,-9.4 L6,0 Z" fill={PAL.pierreMi} />
            <path d="M-6,-8 L6,-9.4 L8.6,-10.6 L-3.4,-9.2 Z" fill={PAL.pierreLit} />
            <path d="M6,0 L6,-9.4 L8.6,-10.6 L8.6,-1.2 Z" fill={PAL.pierreOmbre} />
            <path d="M-3.4,-2 C-3.8,-5 -2,-7 0,-7 C2,-7 3.6,-5 3.2,-2 Z" fill="#d6ccb4" />
            <circle cx={-0.2} cy={-5} r={0.5} fill={PAL.pierreJoint} />
          </g>
        </>
      )}
    </g>
  )
}

/** Forge : enclume dehors, râtelier d'armes finies, boucliers, fanion */
export function VieForge({ n }: { n: number }) {
  return (
    <g>
      <EnclumeDehors x={-69} y={28.7} />
      {n >= 2 && <Ratelier x={71} y={27.8} />}
      {n >= 3 && <Boucliers x={-86} y={30.5} s={0.85} n={3} />}
      {n >= 3 && <Volee n={1} cx={0} cy={-72} espece="corbeau" seed={61} s={0.7} />}
      {n >= 4 && (
        <>
          <Banniere x={83} y={26.0} h={20} c="#8e3b2a" />
          <Brasero x={-58} y={31.0} s={0.85} />
          <Volee n={2} cx={30} cy={-80} espece="corbeau" seed={62} s={0.6} />
        </>
      )}
    </g>
  )
}

/** Caserne : mannequins, boucliers, fanions, trophée - et l'aigle d'Arès */
export function VieCaserne({ n }: { n: number }) {
  return (
    <g>
      <Mannequin x={-72} y={28.7} />
      {n >= 2 && <Fanion x={72} y={26.9} h={24} c="#b0412e" />}
      {n >= 3 && (
        <>
          <Mannequin x={-83} y={31.0} s={0.85} />
          <Boucliers x={65} y={31.0} s={0.85} n={4} />
        </>
      )}
      {n >= 4 && (
        <>
          <Trophee x={86} y={28.7} />
          <OiseauVol cx={0} cy={-76} rx={36} ry={9} dur={32} espece="rapace" s={0.9} />
        </>
      )}
    </g>
  )
}

/** Redoute : fanion, brasero de veille, corbeaux, puis l'aigle */
export function VieRedoute({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <g>
      <Fanion x={-71} y={26.9} h={22} c="#b0412e" />
      {n >= 2 && <Brasero x={71} y={27.8} s={0.95} />}
      {n >= 3 && <Volee n={2} cx={-4} cy={-78} espece="corbeau" seed={71} s={0.66} />}
      {n >= 4 && (
        <>
          <Oriflammes x={-83} y={30.5} h={30} />
          <OiseauVol cx={20} cy={-86} rx={30} ry={8} dur={36} espece="rapace" s={0.85} sens={-1} />
        </>
      )}
    </g>
  )
}
