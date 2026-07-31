import { AOBase, Batisse3D, Fenetre3D, MurPierre, OmbreVolume, PAL, Porte3D, alea } from '../art'
import { Feu, Fumee } from './primitives'

/*
 * MAISONS — quartier d'habitation, peint réaliste (bible : docs/STYLE-ART.md).
 * Lumière NW, ombres portées SE, zéro contour noir.
 *  1. campement de toile et feu de camp    2. cabanes de torchis à chaume
 *  3. maisons de pierre à tuiles           4. quartier prospère : étage,
 *     cour dallée, pergola, oliviers, linge qui sèche au vent.
 */

// ── accessoires de vie ───────────────────────────────────────────────────────

/** jarre de terre cuite modelée : panse, reflet côté lumière, ombre côté est */
function Jarre({ x = 0, y = 0, s = 1, c = '#a3673f' }: { x?: number; y?: number; s?: number; c?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={1.6} cy={0.7} rx={3.4} ry={1.1} fill={PAL.ombrePortee} opacity={0.16} />
      <path d="M-2.6,0 C-3.8,-2.8 -3.1,-6 -1.5,-7.2 L-2.3,-8.5 L2.3,-8.5 L1.5,-7.2 C3.1,-6 3.8,-2.8 2.6,0 Z" fill={c} />
      <path d="M-1.7,-6.6 C-2.6,-5.2 -2.8,-3 -2.1,-1" stroke="#d99a66" strokeWidth={1.1} fill="none" opacity={0.75} />
      <path d="M1.9,-6.4 C2.7,-4.8 2.8,-2.6 2.2,-0.8" stroke="#5f3a20" strokeWidth={1.2} fill="none" opacity={0.6} />
      <ellipse cx={0} cy={-8.5} rx={2.3} ry={0.7} fill="#3a2817" />
      <path d="M-2.1,-7.4 q-1.4,-0.7 -0.9,-1.8 M2.1,-7.4 q1.4,-0.7 0.9,-1.8" stroke="#6e4326" strokeWidth={0.8} fill="none" />
    </g>
  )
}

/** panier d'osier tressé, bord éclairé */
function Panier({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={1.2} cy={0.5} rx={3.6} ry={1} fill={PAL.ombrePortee} opacity={0.14} />
      <path d="M-3.4,-4 L3.4,-4 L2.6,0 L-2.6,0 Z" fill="#b08a58" />
      <path d="M-3.2,-3 L3.2,-3 M-2.9,-1.6 L2.9,-1.6" stroke="#8a6a40" strokeWidth={0.7} opacity={0.8} />
      <ellipse cx={0} cy={-4} rx={3.4} ry={1} fill="#c9a06c" />
      <ellipse cx={-0.4} cy={-4.1} rx={2.4} ry={0.6} fill="#7a5c38" />
    </g>
  )
}

/** banc : planche posée sur deux pierres, chant éclairé */
function Banc({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={1.5} cy={0.6} rx={6} ry={1.2} fill={PAL.ombrePortee} opacity={0.14} />
      <rect x={-4.6} y={-2.6} width={2.2} height={2.6} fill={PAL.pierreMi} />
      <rect x={2.6} y={-2.6} width={2.2} height={2.6} fill={PAL.pierreOmbre} />
      <rect x={-6} y={-4} width={12} height={1.6} fill={PAL.boisMi} />
      <rect x={-6} y={-4} width={12} height={0.6} fill={PAL.boisLit} />
    </g>
  )
}

/** poule picorant — silhouette 2 tons, crête rouge */
function Poule({ x = 0, y = 0, c = '#ece5d2', flip = false }: { x?: number; y?: number; c?: string; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -1 : 1},1)`}>
      <ellipse cx={0.5} cy={0.4} rx={2.6} ry={0.7} fill={PAL.ombrePortee} opacity={0.14} />
      <path d="M-2.6,-2.4 q-0.9,-1.6 0.4,-2.4 L-1.2,-3.4 Z" fill="#8a7a5e" />
      <ellipse cx={0} cy={-2} rx={2.3} ry={1.7} fill={c} />
      <path d="M-1.8,-1 q1.8,1 3.6,0 L1.4,-2 Z" fill="#b8ab8c" opacity={0.6} />
      <circle cx={2} cy={-3.6} r={1} fill={c} />
      <path d="M2.9,-3.7 l1.3,0.4 -1.3,0.6 Z" fill="#d9a23c" />
      <path d="M1.5,-4.4 q0.6,-1 1.2,-0.1 Z" fill="#c0563f" />
      <line x1={-0.4} y1={-0.4} x2={-0.4} y2={0.5} stroke="#8a6a40" strokeWidth={0.6} />
      <line x1={0.8} y1={-0.4} x2={0.8} y2={0.5} stroke="#8a6a40" strokeWidth={0.6} />
    </g>
  )
}

/** chèvre — corps modelé (dos éclairé, ventre ombré), cornes recourbées */
function ChevreArt({ x = 0, y = 0, s = 1, c = '#d4c8ac', flip = false }: { x?: number; y?: number; s?: number; c?: string; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s})`}>
      <ellipse cx={1} cy={0.8} rx={5} ry={1.3} fill={PAL.ombrePortee} opacity={0.15} />
      <line x1={-3} y1={-1.4} x2={-3.2} y2={0.7} stroke="#6b533c" strokeWidth={1} />
      <line x1={-1.4} y1={-1.4} x2={-1.5} y2={0.6} stroke="#584430" strokeWidth={1} />
      <line x1={2.2} y1={-1.4} x2={2.1} y2={0.7} stroke="#6b533c" strokeWidth={1} />
      <line x1={3.4} y1={-1.4} x2={3.5} y2={0.6} stroke="#584430" strokeWidth={1} />
      <ellipse cx={0} cy={-3.6} rx={4.4} ry={2.5} fill={c} />
      <path d="M-4,-3 q4,2.4 8,0 L3.6,-4.4 L-3.6,-4.4 Z" fill="#b3a685" opacity={0.65} />
      <ellipse cx={-1.4} cy={-4.8} rx={2.6} ry={1.1} fill="#f0e9d6" opacity={0.8} />
      <circle cx={4.6} cy={-5.7} r={1.9} fill={c} />
      <path d="M5.8,-5 q1.2,0.3 1.4,1.2 l-1.6,-0.2 Z" fill="#a08a68" />
      <path d="M5.1,-7.4 q1.7,-1.4 0.8,-3.1" stroke="#77593a" strokeWidth={1.1} fill="none" />
      <path d="M4,-7.5 q0.9,-1.6 0.1,-2.9" stroke="#8a6a40" strokeWidth={0.9} fill="none" opacity={0.8} />
      <path d="M3.2,-6.4 q-1.4,-0.3 -1.8,0.7" stroke="#a08a68" strokeWidth={1} fill="none" />
    </g>
  )
}

/** clôture de bois : piquets au fût éclairé côté ouest, lisses en demi-teinte */
function EnclosBois({ pts }: { pts: [number, number][] }) {
  return (
    <g>
      {pts.map(([x, y], i) => {
        const s = pts[i + 1]
        return (
          <g key={i}>
            {s && <line x1={x} y1={y - 4.6} x2={s[0]} y2={s[1] - 4.6} stroke="#8a6a40" strokeWidth={1.2} />}
            {s && <line x1={x} y1={y - 2} x2={s[0]} y2={s[1] - 2} stroke="#75583a" strokeWidth={1.2} />}
            <line x1={x + 0.8} y1={y + 0.8} x2={x + 2.4} y2={y + 1.2} stroke={PAL.ombrePortee} strokeWidth={1} opacity={0.15} />
            <line x1={x} y1={y - 6.4} x2={x} y2={y} stroke="#5f462d" strokeWidth={1.8} />
            <line x1={x - 0.5} y1={y - 6.2} x2={x - 0.5} y2={y - 0.4} stroke="#a8845d" strokeWidth={0.8} />
          </g>
        )
      })}
    </g>
  )
}

/** pile de bûches : rondins vus en bout, cœur clair, cernes */
function Buches({ x = 0, y = 0 }: { x?: number; y?: number }) {
  const rangs: [number, number][] = [
    [-3.4, -2], [0, -2], [3.4, -2],
    [-1.7, -4.9], [1.7, -4.9],
    [0, -7.7],
  ]
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={2} cy={0.6} rx={6.5} ry={1.6} fill={PAL.ombrePortee} opacity={0.16} />
      {rangs.map(([bx, by], i) => (
        <g key={i}>
          <circle cx={bx} cy={by} r={1.9} fill="#5f462d" />
          <circle cx={bx - 0.25} cy={by - 0.25} r={1.4} fill={i % 2 ? '#c9a06c' : '#b8905c'} />
          <circle cx={bx - 0.25} cy={by - 0.25} r={0.6} fill="#8a6a40" opacity={0.8} />
        </g>
      ))}
    </g>
  )
}

/** olivier volumique : tronc noueux, 3 valeurs de feuillage, ombre au sol SE */
function Olivier({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={5.5} cy={1.6} rx={10} ry={2.8} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou2)" />
      <path d="M-2,0 C-2.8,-3.6 -1,-6.4 -2.2,-9.6 L0.9,-10.4 C0.4,-6.8 2.2,-3.8 2.4,0 Q0.2,1.1 -2,0 Z" fill="#7a5f3c" />
      <path d="M0.8,-0.6 C1,-4 1.6,-7 0.7,-10.2 L0.9,-10.4 C0.4,-6.8 2.2,-3.8 2.4,0 Q1.6,0.6 0.8,-0.6 Z" fill="#57422a" />
      <path d="M-1.4,-1.4 C-1.9,-4.6 -0.8,-7.4 -1.5,-9.4" stroke="#a08050" strokeWidth={0.8} fill="none" opacity={0.85} />
      <ellipse cx={1.5} cy={-12.5} rx={9} ry={5.2} fill="#5c6e46" />
      <ellipse cx={-2} cy={-14.5} rx={7.8} ry={4.6} fill="#6f8354" />
      <ellipse cx={5} cy={-14} rx={4.6} ry={3} fill="#68804f" />
      <ellipse cx={-4} cy={-16.4} rx={5} ry={3} fill="#879c66" />
      <ellipse cx={-6.6} cy={-17.6} rx={2.6} ry={1.6} fill="#98ad74" />
    </g>
  )
}

/** drap suspendu qui ondule (SMIL léger) — épinglé en haut, bas au vent */
function Drap({ x = 0, y = 0, w = 5, h = 6.5, c = '#ece5d2', dur = '3s', tard = '0s' }: { x?: number; y?: number; w?: number; h?: number; c?: string; dur?: string; tard?: string }) {
  const d0 = `M0,0 L${w},0 L${w + 0.7},${h} Q${w / 2},${h + 1.7} -0.4,${h - 0.5} Z`
  const d1 = `M0,0 L${w},0 L${w - 0.7},${h - 0.4} Q${w / 2},${h - 1.5} 0.5,${h + 0.6} Z`
  return (
    <g transform={`translate(${x},${y})`}>
      <path d={d0} fill={c}>
        <animate attributeName="d" values={`${d0};${d1};${d0}`} dur={dur} begin={tard} repeatCount="indefinite" />
      </path>
      <rect x={-0.2} y={-0.4} width={w + 0.4} height={1.3} fill={c} />
      <rect x={-0.2} y={0.6} width={w + 0.4} height={0.5} fill={PAL.ombrePortee} opacity={0.18} />
    </g>
  )
}

/** corde à linge entre deux perches, draps animés */
function Linge({ x = 0, y = 0, larg = 24, y2 = 2, habits = ['#ece5d2', '#c98d6b', '#7c9a8e'] }: { x?: number; y?: number; larg?: number; y2?: number; habits?: string[] }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0.8} y1={14.4} x2={4.6} y2={15.8} stroke={PAL.ombrePortee} strokeWidth={1.4} opacity={0.15} />
      <line x1={larg + 0.8} y1={y2 + 14.4} x2={larg + 4.6} y2={y2 + 15.8} stroke={PAL.ombrePortee} strokeWidth={1.4} opacity={0.15} />
      <line x1={0} y1={0} x2={0} y2={14} stroke="#5f462d" strokeWidth={1.5} />
      <line x1={-0.5} y1={0.4} x2={-0.5} y2={13.6} stroke="#a8845d" strokeWidth={0.7} />
      <line x1={larg} y1={y2} x2={larg} y2={y2 + 14} stroke="#5f462d" strokeWidth={1.5} />
      <path d={`M0,0 Q${larg / 2},${y2 / 2 + 1.6} ${larg},${y2}`} stroke="#e0d9c8" strokeWidth={0.9} fill="none" />
      {habits.map((c, i) => {
        const t = (i + 1) / (habits.length + 1)
        const cx = larg * t - 2.6
        const cy = y2 * t + 1.4 * (1 - Math.abs(t - 0.5) * 2) * 1.1 + 0.3
        return <Drap key={i} x={cx} y={cy} w={4.6 + (i % 2) * 1.4} h={5.6 + ((i + 1) % 2) * 1.6} c={c} dur={`${2.6 + i * 0.5}s`} tard={`${i * 0.7}s`} />
      })}
    </g>
  )
}

/** pergola : poteaux de bois, traverses, vigne — ombre AJOURÉE au sol (SE) */
function Pergola({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {/* ombre ajourée : bandes semi-transparentes projetées vers le SE */}
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${-9 + i * 4.4},1 l2.1,0 l4.8,4.6 l-2.1,0 Z`} fill={PAL.ombrePortee} opacity={0.13} />
      ))}
      <path d="M-10,0.4 L11,0.4 L14,3 L-7,3 Z" fill={PAL.ombrePortee} opacity={0.07} />
      {/* poteaux arrière (plus haut = plus loin) puis avant */}
      <line x1={-5.5} y1={-6} x2={-5.5} y2={-15.5} stroke="#75583a" strokeWidth={1.6} />
      <line x1={11} y1={-6} x2={11} y2={-15.5} stroke="#75583a" strokeWidth={1.6} />
      <line x1={-9} y1={0} x2={-9} y2={-13} stroke="#5f462d" strokeWidth={2} />
      <line x1={-9.6} y1={-0.4} x2={-9.6} y2={-12.6} stroke="#a8845d" strokeWidth={0.9} />
      <line x1={7.5} y1={0} x2={7.5} y2={-13} stroke="#5f462d" strokeWidth={2} />
      <line x1={6.9} y1={-0.4} x2={6.9} y2={-12.6} stroke="#a8845d" strokeWidth={0.9} />
      {/* cadre + lattes */}
      <path d="M-11,-13 L9.5,-13 L13,-15.5 L-7.5,-15.5" stroke={PAL.boisMi} strokeWidth={1.5} fill="none" />
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={-9.6 + i * 4.4} y1={-13} x2={-6.4 + i * 4.4} y2={-15.5} stroke={PAL.boisLit} strokeWidth={1.1} />
      ))}
      {/* vigne : 3 valeurs + sarment qui retombe */}
      <ellipse cx={2} cy={-15.6} rx={10} ry={2.8} fill="#5c6e46" />
      <ellipse cx={-2} cy={-16.8} rx={7.5} ry={2.4} fill="#6f8354" />
      <ellipse cx={-5} cy={-17.6} rx={4} ry={1.7} fill="#879c66" />
      <path d="M10,-14.6 q1.6,3 0.4,5.6" stroke="#6f8354" strokeWidth={1.1} fill="none" />
      <circle cx={10.6} cy={-9.6} r={1.2} fill="#6f8354" />
    </g>
  )
}

/** tente de toile modelée : pan gauche au soleil, pan droit dans l'ombre */
function TenteArt({ x = 0, y = 0, w = 24, h = 15, ocre = false }: { x?: number; y?: number; w?: number; h?: number; ocre?: boolean }) {
  const lit = ocre ? '#dcc191' : '#e9dbb5'
  const mi = ocre ? '#c8ab7c' : '#d5c399'
  const omb = ocre ? '#9d8258' : '#ab9670'
  const p = w * 0.3 // recul du faîte
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={w * 0.6} ry={w * 0.16} cy={1.5} />
      <OmbreVolume w={w * 0.9} h={h * 0.85} o={0.15} />
      {/* pans arrière convergeant vers le bout du faîte */}
      <path d={`M${-w / 2},0 L0,${-h} L0,${-h - p * 0.5} L${-w * 0.36},${-p * 0.62} Z`} fill={lit} />
      <path d={`M${w / 2},0 L0,${-h} L0,${-h - p * 0.5} L${w * 0.36},${-p * 0.62} Z`} fill={omb} />
      {/* face sud : demi-teinte, moitié droite légèrement plus sombre */}
      <path d={`M${-w / 2},0 L0,${-h} L${w / 2},0 Z`} fill={mi} />
      <path d={`M0,${-h} L${w / 2},0 L${w * 0.1},0 Z`} fill={omb} opacity={0.55} />
      <path d={`M${-w / 2},0 L0,${-h} L${-w * 0.35},0 Z`} fill={lit} opacity={0.7} />
      {/* coutures de la toile */}
      <path d={`M${-w * 0.3},${-h * 0.4} q${w * 0.3},${h * 0.12} ${w * 0.6},0`} stroke={omb} strokeWidth={0.7} fill="none" opacity={0.6} />
      <path d={`M${-w * 0.17},${-h * 0.66} q${w * 0.17},${h * 0.08} ${w * 0.34},0`} stroke={omb} strokeWidth={0.6} fill="none" opacity={0.5} />
      {/* rapiéçage cousu */}
      <rect x={w * 0.13} y={-h * 0.42} width={w * 0.14} height={h * 0.18} fill={omb} opacity={0.5} transform={`rotate(-8 ${w * 0.2} ${-h * 0.35})`} />
      {/* entrée : pénombre + rabat replié éclairé */}
      <path d={`M${-w * 0.14},0 L0,${-h * 0.6} L${w * 0.14},0 Z`} fill="#3c2d1a" />
      <path d={`M0,${-h * 0.6} L${w * 0.14},0 L${w * 0.26},0 Z`} fill={lit} />
      <line x1={0} y1={-h * 0.6} x2={0} y2={-0.5} stroke="#5f462d" strokeWidth={0.9} />
      {/* faîte, mât et cordages vers les piquets */}
      <line x1={0} y1={-h} x2={0} y2={-h - p * 0.5} stroke={ocre ? '#eed7a6' : '#f6ecc9'} strokeWidth={1} />
      <circle cx={0} cy={-h - p * 0.5} r={0.8} fill={PAL.boisMi} />
      <line x1={-w / 2} y1={0} x2={-w / 2 - 5} y2={2.6} stroke="#8a7a5e" strokeWidth={0.7} />
      <line x1={w / 2} y1={0} x2={w / 2 + 5} y2={2.6} stroke="#8a7a5e" strokeWidth={0.7} />
      <line x1={-w / 2 - 5.4} y1={1.6} x2={-w / 2 - 5} y2={3.2} stroke={PAL.boisOmbre} strokeWidth={1.2} />
      <line x1={w / 2 + 4.6} y1={1.6} x2={w / 2 + 5} y2={3.2} stroke={PAL.boisOmbre} strokeWidth={1.2} />
    </g>
  )
}

/** feu de camp : cercle de pierres, braises, bûches croisées, flamme SMIL */
function FeuCamp({ x = 0, y = 0 }: { x?: number; y?: number }) {
  const rnd = alea(41)
  const pierres = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + rnd() * 0.5
    return { px: Math.cos(a) * 6.2, py: Math.sin(a) * 2.6, r: 1.2 + rnd() * 0.7 }
  })
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={0} cy={0} rx={9} ry={3.6} fill="#8a7455" opacity={0.6} />
      <ellipse cx={0} cy={0} rx={5} ry={2} fill="#3d3428" />
      <ellipse cx={0} cy={0} rx={9} ry={4} fill="#e8913c" opacity={0.12} filter="url(#a-flou2)" />
      <line x1={-4.6} y1={1.4} x2={4} y2={-2.6} stroke="#5f462d" strokeWidth={1.6} />
      <line x1={4.6} y1={1.2} x2={-3.8} y2={-2.4} stroke="#77593a" strokeWidth={1.4} />
      {pierres.map((p, i) => (
        <g key={i}>
          <circle cx={p.px} cy={p.py} r={p.r} fill={PAL.pierreOmbre} />
          <circle cx={p.px - 0.35} cy={p.py - 0.4} r={p.r * 0.62} fill={PAL.pierreLit} />
        </g>
      ))}
      <Feu x={0} y={-2.6} r={2.6} />
      <Fumee x={0.5} y={-6} />
    </g>
  )
}

/** touffe d'herbe sèche */
function Touffe({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return <path d={`M${x - 3},${y} q1.2,-3 2.4,0 M${x - 0.6},${y + 0.4} q1.2,-3.4 2.4,0 M${x + 1.8},${y} q1.2,-2.6 2.4,0`} stroke="#8f8a55" strokeWidth={0.9} fill="none" opacity={0.65} />
}

/** sol de terre battue usée en deux tons superposés */
function SolUse({ rx, ry, teinte = '#c2b084', cx = 0, cy = 2 }: { rx: number; ry: number; teinte?: string; cx?: number; cy?: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={teinte} opacity={0.6} />
      <ellipse cx={cx - rx * 0.12} cy={cy - 1} rx={rx * 0.62} ry={ry * 0.6} fill="#cfbf93" opacity={0.7} />
    </g>
  )
}

/** cour dallée : dalles claires, joints, usure */
function Dallage({ x = 0, y = 0, rx = 24, ry = 8, seed = 9 }: { x?: number; y?: number; rx?: number; ry?: number; seed?: number }) {
  const rnd = alea(seed)
  const joints = Array.from({ length: 9 }, () => {
    const jx = (rnd() - 0.5) * rx * 1.5
    const jy = (rnd() - 0.5) * ry * 1.4
    const l = 4 + rnd() * 5
    const vert = rnd() > 0.55
    return { jx, jy, l, vert }
  })
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={0} cy={0} rx={rx} ry={ry} fill="#c6ba9c" opacity={0.9} />
      <ellipse cx={-2} cy={-0.8} rx={rx * 0.7} ry={ry * 0.65} fill="#d8cdae" opacity={0.85} />
      {joints.map((j, i) =>
        j.vert ? (
          <line key={i} x1={j.jx} y1={j.jy - j.l * 0.22} x2={j.jx + j.l * 0.3} y2={j.jy + j.l * 0.22} stroke="#a99c7d" strokeWidth={0.7} opacity={0.6} />
        ) : (
          <line key={i} x1={j.jx - j.l / 2} y1={j.jy} x2={j.jx + j.l / 2} y2={j.jy} stroke="#a99c7d" strokeWidth={0.7} opacity={0.6} />
        ),
      )}
    </g>
  )
}

// ── éléments de bâtisse ──────────────────────────────────────────────────────

/** frange et mèches de chaume par-dessus le toit d'une Batisse3D */
function FrangeChaume({ w, h, g, prof = 9, seed = 5 }: { w: number; h: number; g: number; prof?: number; seed?: number }) {
  const rnd = alea(seed)
  const frange = Array.from({ length: 7 }, (_, i) => (i + 0.5) / 7)
  return (
    <>
      {frange.map((t, i) => {
        const xl = -(w / 2 + 2.5) * (1 - t)
        const y = -h - g * t
        return (
          <g key={i}>
            <line x1={xl} y1={y + 0.2} x2={xl + 0.4 + rnd() * 0.8} y2={y + 2.3 + rnd()} stroke={PAL.chaumeOmbre} strokeWidth={0.8} opacity={0.8} />
            <line x1={-xl} y1={y + 0.2} x2={-xl + 0.6 + rnd() * 0.8} y2={y + 2.1 + rnd()} stroke="#87703b" strokeWidth={0.8} opacity={0.8} />
          </g>
        )
      })}
      {/* mèches éclairées sur le pan gauche, sombres sur le pan droit */}
      {[0.28, 0.52, 0.78].map((t, i) => {
        const u = 0.25 + rnd() * 0.5
        const x = -(w / 2 + 2.5) * (1 - t)
        const y = -h - g * t - prof * u
        return <path key={`m${i}`} d={`M${x + 1},${y} q-1.2,0.6 -2,1.9`} stroke="#ecd9a0" strokeWidth={0.7} fill="none" opacity={0.85} />
      })}
      {[0.35, 0.68].map((t, i) => {
        const u = 0.3 + rnd() * 0.4
        const x = (w / 2 + 2.5) * (1 - t)
        const y = -h - g * t - prof * u
        return <path key={`s${i}`} d={`M${x - 1},${y} q1.2,0.6 2,1.9`} stroke="#87703b" strokeWidth={0.7} fill="none" opacity={0.7} />
      })}
    </>
  )
}

/** souche de cheminée en terre cuite posée sur le pan gauche */
function Cheminee({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-1.6} y={-5} width={3.2} height={5.4} fill={PAL.toitMi} />
      <rect x={-1.6} y={-5} width={1.1} height={5.4} fill={PAL.toitLit} />
      <rect x={-2.2} y={-6.2} width={4.4} height={1.5} fill={PAL.toitArete} />
      <rect x={-2.2} y={-4.7} width={4.4} height={0.6} fill={PAL.ombrePortee} opacity={0.3} />
      <ellipse cx={0} cy={-6.2} rx={1.3} ry={0.5} fill="#3a2817" />
    </g>
  )
}

/** enduit terreux + pans de bois par-dessus la bâtisse stuc (rendu torchis) */
function Torchis({ w, h, g, seed }: { w: number; h: number; g: number; seed: number }) {
  const rnd = alea(seed)
  const taches = Array.from({ length: 4 }, () => ({
    tx: -w / 2 + 4 + rnd() * (w - 8),
    ty: -2.5 - rnd() * (h - 6),
    rx: 1.8 + rnd() * 2.4,
    ry: 1 + rnd() * 1.2,
  }))
  return (
    <>
      {/* lavis terreux sur la façade et le retour est */}
      <path d={`M${-w / 2},0 L${-w / 2},${-h} L0,${-h - g} L${w / 2},${-h} L${w / 2},0 Z`} fill="#bd9257" opacity={0.38} />
      <path d={`M${w / 2},0 L${w / 2 + 7},-3.15 L${w / 2 + 7},${-h - 3.15} L${w / 2},${-h} Z`} fill="#6e552f" opacity={0.4} />
      {taches.map((t, i) => (
        <ellipse key={i} cx={t.tx} cy={t.ty} rx={t.rx} ry={t.ry} fill="#a9855a" opacity={0.35} />
      ))}
      {/* colombage : sablière, poteaux corniers, écharpe, poinçon du pignon */}
      <line x1={-w / 2} y1={-h} x2={w / 2} y2={-h} stroke={PAL.boisMi} strokeWidth={1.7} />
      <line x1={-w / 2} y1={-h - 0.9} x2={w / 2} y2={-h - 0.9} stroke={PAL.boisLit} strokeWidth={0.7} opacity={0.8} />
      <line x1={-w / 2 + 1.2} y1={0} x2={-w / 2 + 1.2} y2={-h} stroke={PAL.boisMi} strokeWidth={1.6} />
      <line x1={w / 2 - 1.2} y1={0} x2={w / 2 - 1.2} y2={-h} stroke={PAL.boisOmbre} strokeWidth={1.6} />
      <line x1={-w / 2 + 2} y1={-1} x2={-w * 0.12} y2={-h + 1} stroke="#77593a" strokeWidth={1.3} opacity={0.9} />
      <line x1={0} y1={-h - g + 1.6} x2={0} y2={-h} stroke={PAL.boisMi} strokeWidth={1.5} />
    </>
  )
}

/** porte rustique : linteau de bois, vantail de planches dans la pénombre */
function PorteBois({ w = 6, h = 9, x = 0 }: { w?: number; h?: number; x?: number }) {
  return (
    <g>
      <rect x={x - w / 2} y={-h} width={w} height={h} fill="#3f2f1b" />
      <rect x={x - w / 2 + 0.8} y={-h + 0.8} width={w - 1.6} height={h - 0.8} fill="#54401f" />
      <line x1={x - 0.8} y1={-h + 1} x2={x - 0.8} y2={-0.5} stroke="#3f2f1b" strokeWidth={0.7} />
      <line x1={x + 1} y1={-h + 1} x2={x + 1} y2={-0.5} stroke="#3f2f1b" strokeWidth={0.7} />
      <rect x={x - w / 2 - 1} y={-h - 1.8} width={w + 2} height={1.8} fill={PAL.boisMi} />
      <rect x={x - w / 2 - 1} y={-h - 1.8} width={w + 2} height={0.7} fill={PAL.boisLit} />
    </g>
  )
}

/** fenêtre rustique : petite embrasure sombre sous linteau de bois */
function FenetreBois({ x, y, w = 4, h = 4 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <rect x={x - w / 2} y={y - h} width={w} height={h} fill="#3f2f1b" />
      <rect x={x - w / 2} y={y - h} width={w} height={1} fill="#241a08" opacity={0.8} />
      <rect x={x - w / 2 - 0.8} y={y - h - 1.4} width={w + 1.6} height={1.4} fill={PAL.boisMi} />
      <rect x={x - w / 2 - 0.8} y={y - h - 1.4} width={w + 1.6} height={0.6} fill={PAL.boisLit} />
    </g>
  )
}

/** escalier extérieur de pierre montant vers un palier (niveau 4) */
function Escalier({ x = 0, y = 0, ht = 11 }: { x?: number; y?: number; ht?: number }) {
  const long = 13
  return (
    <g transform={`translate(${x},${y})`}>
      <path d={`M2,1 L${-long + 3},${1.6}`} stroke={PAL.ombrePortee} strokeWidth={2.6} opacity={0.14} filter="url(#a-flou1)" />
      {/* masse rampante + marches */}
      <path d={`M0,${-ht} L0,0 L${-long},0 Z`} fill="url(#a-pierre-o)" />
      <path d={`M0,${-ht} L${-long},0 L${-long},-1 L0,${-ht - 1} Z`} fill={PAL.pierreMi} />
      {[0, 1, 2, 3, 4].map((i) => {
        const t = i / 5
        const t2 = (i + 1) / 5
        return (
          <g key={i}>
            <path d={`M${-long * t},${-ht * (1 - t) - 1} L${-long * t2},${-ht * (1 - t) - 1} L${-long * t2},${-ht * (1 - t2) - 1}`} stroke="#efe9d8" strokeWidth={1} fill="none" />
            <line x1={-long * t2} y1={-ht * (1 - t) - 0.2} x2={-long * t} y2={-ht * (1 - t) - 0.2} stroke={PAL.pierreOmbre} strokeWidth={0.8} opacity={0.7} />
          </g>
        )
      })}
    </g>
  )
}

/** pigeonnier : tourelle cylindrique, toit conique de tuiles, colombes */
function Pigeonnier({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={8} ry={2.6} cy={1} />
      <OmbreVolume w={10} h={22} o={0.15} />
      <rect x={-5} y={-17} width={10} height={17} fill="url(#a-cyl-pierre)" />
      <ellipse cx={0} cy={-17} rx={5} ry={1.4} fill={PAL.pierreLit} />
      {/* trous d'envol + corniche d'appui */}
      <rect x={-5} y={-11.6} width={10} height={0.9} fill={PAL.pierreLit} opacity={0.8} />
      {[-2.6, 0, 2.6].map((tx) => (
        <rect key={tx} x={tx - 0.9} y={-10.6} width={1.8} height={2} fill="#241a10" />
      ))}
      {/* toit conique : facette éclairée / facette ombrée */}
      <path d="M-6.4,-17.5 L0,-25.5 L0.6,-17.5 Z" fill={PAL.toitLit} />
      <path d="M6.4,-17.5 L0,-25.5 L0.6,-17.5 Z" fill={PAL.toitOmbre} />
      <path d="M-6.4,-17.5 L0,-25.5" stroke={PAL.toitArete} strokeWidth={1} />
      <circle cx={0} cy={-25.8} r={1} fill={PAL.toitArete} />
      {/* colombes */}
      <circle cx={-6.8} cy={-19.5} r={1.1} fill="#f2ede0" />
      <circle cx={-6} cy={-20.2} r={0.7} fill="#f2ede0" />
      <circle cx={3.4} cy={-12.4} r={1} fill="#e8e2d2" />
      <PorteBois w={4} h={5.6} />
    </g>
  )
}

// ── le quartier, niveau par niveau ───────────────────────────────────────────

export function Maisons({ n }: { n: number }) {
  if (n === 1) {
    return (
      <g>
        <SolUse rx={40} ry={13} teinte="#bfa878" />
        <Touffe x={-40} y={-3} />
        <Touffe x={33} y={10} />
        <TenteArt x={-18} y={0} w={26} h={16} />
        <TenteArt x={14} y={4} w={22} h={13} ocre />
        <FeuCamp x={2} y={-7} />
        {/* rondin pour s'asseoir près du feu */}
        <g transform="translate(-2,1)">
          <ellipse cx={1.5} cy={1.2} rx={6} ry={1.3} fill={PAL.ombrePortee} opacity={0.15} />
          <rect x={-5.5} y={-2.6} width={11} height={2.8} rx={1.3} fill="#77593a" />
          <rect x={-5.5} y={-2.6} width={11} height={1.1} rx={0.55} fill="#a8845d" />
          <ellipse cx={5.5} cy={-1.2} rx={1.2} ry={1.4} fill="#c9a06c" />
        </g>
        <Jarre x={-34} y={2} s={0.9} />
        <Panier x={27} y={9} s={0.9} />
        <path d="M28,-4 q4,-2 8,0 q-4,2 -8,0" fill="#b3906b" opacity={0.8} />
      </g>
    )
  }
  if (n === 2) {
    return (
      <g>
        <SolUse rx={44} ry={14} teinte="#bfa878" />
        <g transform="translate(-17,0)">
          <Batisse3D w={27} h={13} g={8} mat="stuc" toit="chaume" enfants={
            <>
              <Torchis w={27} h={13} g={8} seed={11} />
              <PorteBois w={6} h={9} />
            </>
          } />
          <FrangeChaume w={27} h={13} g={8} seed={13} />
        </g>
        <g transform="translate(18,4)">
          <Batisse3D w={24} h={11} g={7} mat="stuc" toit="chaume" enfants={
            <>
              <Torchis w={24} h={11} g={7} seed={23} />
              <PorteBois w={5.5} h={8} x={-3.5} />
              <FenetreBois x={6} y={-3} w={4} h={4} />
            </>
          } />
          <FrangeChaume w={24} h={11} g={7} seed={29} />
        </g>
        {/* enclos et chèvres conservés */}
        <EnclosBois pts={[[-38, 8], [-30, 12], [-19, 14], [-8, 13]]} />
        <ChevreArt x={-31} y={9} />
        <ChevreArt x={-24} y={11.5} c="#c8b18e" flip />
        <ChevreArt x={-15} y={10} s={0.85} />
        <Poule x={2} y={12} />
        <Poule x={8} y={14} c="#c9855c" flip />
        <Buches x={35} y={-2} />
        <Jarre x={-1} y={5} s={0.85} c="#8c552f" />
        <Panier x={4} y={7} s={0.8} />
        <Touffe x={-44} y={2} />
        <Fumee x={-17} y={-31} />
      </g>
    )
  }
  return (
    <g>
      <SolUse rx={n >= 4 ? 62 : 50} ry={n >= 4 ? 18 : 16} teinte="#c6b183" />
      {/* sentier reliant les seuils */}
      <path d="M-26,4 Q-8,10 8,9 Q22,8 34,0" stroke="#cfbf93" strokeWidth={5} fill="none" opacity={0.55} strokeLinecap="round" />
      {n >= 4 && <Dallage x={12} y={9} rx={26} ry={8.5} seed={9} />}

      {/* maison à étage du fond (niveau 4) — escalier extérieur vers le palier */}
      {n >= 4 && (
        <g transform="translate(-30,-22)">
          <Batisse3D w={26} h={26} g={8} mat="stuc" toit="tuiles" enfants={
            <>
              {/* bandeau séparant les niveaux + son liseré éclairé */}
              <rect x={-13} y={-13.6} width={26} height={1.4} fill={PAL.stucOmbre} opacity={0.75} />
              <rect x={-13} y={-14.2} width={26} height={0.7} fill="#f7eed8" opacity={0.8} />
              <Fenetre3D x={-2.5} y={-17} volets />
              <Fenetre3D x={7} y={-17} w={4.6} h={5.6} />
              <Porte3D w={5.6} h={8.6} x={4} />
              <Fenetre3D x={-6} y={-3.5} w={4.4} h={5} />
            </>
          } />
          <Cheminee x={-7} y={-31.5} />
          {/* palier + porte haute desservis par l'escalier extérieur */}
          <g transform="translate(0,-12.4)">
            <PorteBois w={4.6} h={7} x={-10.2} />
          </g>
          <rect x={-16.8} y={-13.6} width={4.4} height={1.4} fill={PAL.pierreLit} />
          <rect x={-16.8} y={-12.2} width={4.4} height={1} fill={PAL.pierreOmbre} />
          <Escalier x={-16.8} y={0} ht={11.4} />
          {/* linge pendu au rebord de la fenêtre de l'étage */}
          <Drap x={4.7} y={-16.8} w={4.6} h={4.4} c="#c98d6b" dur="3.4s" />
        </g>
      )}

      {/* trois maisons de pierre et de stuc */}
      <g transform="translate(-26,-2)">
        <Batisse3D w={28} h={15} g={8} mat="pierre" toit="tuiles" enfants={
          <>
            <MurPierre x={-14} y={-15} w={28} h={15} seed={31} />
            <Porte3D w={6} h={10} x={-4} />
            <Fenetre3D x={7} y={-4} volets />
          </>
        } />
        <Cheminee x={-5} y={-19.6} />
      </g>
      <g transform="translate(8,4)">
        <Batisse3D w={26} h={13} g={7.5} mat="stuc" toit="tuiles" enfants={
          <>
            <Porte3D w={5.5} h={9} />
            <Fenetre3D x={-7.5} y={-3} w={4.4} h={5} />
            {/* treille grimpante le long de l'arête est */}
            <path d="M11.2,-0.5 C10.6,-4 11.4,-7.5 10.2,-10.5" stroke="#57604a" strokeWidth={1} fill="none" />
            <ellipse cx={10.2} cy={-10.4} rx={2.2} ry={1.5} fill="#5c6e46" />
            <ellipse cx={9.4} cy={-11.3} rx={1.5} ry={1} fill="#879c66" />
            <ellipse cx={11.4} cy={-6.6} rx={1.7} ry={1.2} fill="#6f8354" />
            <ellipse cx={10.6} cy={-3.2} rx={1.4} ry={1} fill="#6f8354" />
            <ellipse cx={10.1} cy={-3.8} rx={0.9} ry={0.6} fill="#98ad74" />
          </>
        } />
      </g>
      <g transform="translate(34,-6)">
        <Batisse3D w={23} h={12} g={7} mat="pierre" toit="tuiles" enfants={
          <>
            {/* assises de pierre suggérées */}
            {[-3.4, -6.6, -9.6].map((ay) => (
              <line key={ay} x1={-11} y1={ay} x2={11} y2={ay} stroke={PAL.pierreJoint} strokeWidth={0.7} opacity={0.4} />
            ))}
            <path d="M-5,-0.2 V-3.4 M4,-3.4 V-6.6 M-3,-6.6 V-9.6 M7,-0.2 V-3.4" stroke={PAL.pierreJoint} strokeWidth={0.6} opacity={0.35} />
            <Porte3D w={5.4} h={8.6} x={3} />
            <FenetreBois x={-5.5} y={-3.5} w={3.8} h={4} />
          </>
        } />
      </g>

      {/* linge étendu dans la cour, entre deux perches plantées */}
      <Linge x={-9} y={-3} larg={22} y2={1} />

      <Jarre x={-42} y={4} />
      <Jarre x={-38} y={6} c="#8c552f" s={0.85} />
      <Banc x={-17} y={12} />
      <Poule x={17} y={13} />
      <Poule x={23} y={15} c="#c9855c" flip />
      <Panier x={21} y={10} s={0.9} />
      {n === 3 ? <Olivier x={48} y={8} s={0.9} /> : <Olivier x={-64} y={3} s={0.9} />}

      {n >= 4 && (
        <g>
          <Pergola x={40} y={10} />
          <Pigeonnier x={53} y={-13} />
          <Olivier x={-52} y={9} s={0.8} />
          <Jarre x={-16} y={14} s={0.9} c="#b3774a" />
          <Panier x={-12} y={16} s={0.85} />
          <Fumee x={-36} y={-59} />
        </g>
      )}
      {n === 3 && <Fumee x={-31} y={-28.5} />}
    </g>
  )
}
