import type { ReactNode } from 'react'
import { AOBase, Batisse3D, Colonne3D, MurPierre, OmbreVolume, PAL, Porte3D, alea } from '../art'
import { Amphore, Buisson, Feu, Fumee, OlivierMini } from './primitives'

/*
 * AGORA - peint réaliste (bible docs/STYLE-ART.md) : lumière NW, ombres SE.
 *  1. place de terre battue + autel du foyer
 *  2. dallage + étals + stoa de bois
 *  3. stoa de pierre à colonnade + statue + entrepôts
 *  4. grande agora de marbre cerclée d'or
 * Le foyer central (Feu + Fumee) reste l'âme du lieu à tous les niveaux.
 * IDs de defs locaux préfixés « ag- ».
 */

/** dallage suggéré : pierres irrégulières en 2-3 tons + pierres de bordure */
function Dallage({ rx, ry, seed = 5, marbre = false }: { rx: number; ry: number; seed?: number; marbre?: boolean }) {
  const rnd = alea(seed)
  const tons = marbre
    ? ['#e9e2cf', '#ddd5c0', '#f0e9d8', '#d6cdb7']
    : ['#cfc5aa', '#c3b89b', '#d8cfb5', '#c8bda0']
  const dalles: ReactNode[] = []
  const nR = 6
  const pitch = (ry * 1.5) / nR
  for (let r = 0; r < nR; r++) {
    const ty = -ry * 0.72 + (r + 0.5) * pitch
    const demi = rx * Math.sqrt(Math.max(0.06, 1 - (ty / ry) ** 2)) * 0.94
    let cx = -demi + rnd() * 8 - 4
    while (cx < demi - 4) {
      const pw = 9 + rnd() * 11
      const fin = Math.min(demi, cx + pw)
      if (rnd() > 0.13 && fin - cx > 3.5) {
        dalles.push(
          <rect
            key={`${r}-${cx.toFixed(0)}`}
            x={Math.max(-demi, cx)}
            y={ty - pitch / 2 + 0.35 + (rnd() - 0.5) * 0.7}
            width={fin - Math.max(-demi, cx) - 0.9}
            height={pitch - 0.7 - rnd() * 0.5}
            rx={0.9}
            fill={tons[Math.floor(rnd() * tons.length)]}
            opacity={0.86 + rnd() * 0.14}
          />,
        )
      }
      cx = fin + 0.4
    }
  }
  // pierres de bordure irrégulières, en remplacement d'un anneau trop parfait
  const bords: ReactNode[] = []
  const nB = 15
  for (let i = 0; i < nB; i++) {
    const a = (i / nB) * Math.PI * 2 + rnd() * 0.2
    const bx = Math.cos(a) * (rx - 2.4)
    const by = Math.sin(a) * (ry - 1.6)
    bords.push(
      <rect
        key={`b${i}`}
        x={bx - 2.4 - rnd() * 1.4}
        y={by - 0.9}
        width={4.2 + rnd() * 2.6}
        height={1.7 + rnd() * 0.6}
        rx={0.8}
        fill={marbre ? '#c2b89f' : '#a2946f'}
        opacity={0.85}
      />,
    )
  }
  return (
    <g>
      {dalles}
      {bords}
    </g>
  )
}

/** colombe picorant au sol */
function Colombe({ x = 0, y = 0, flip = false }: { x?: number; y?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`}>
      <ellipse cx={0.6} cy={0.4} rx={1.8} ry={0.5} fill={PAL.ombrePortee} opacity={0.15} />
      <ellipse cx={0} cy={-1.1} rx={1.5} ry={1} fill="#d9d4c6" />
      <ellipse cx={-0.4} cy={-1.4} rx={1} ry={0.6} fill="#efeadd" />
      <circle cx={1.3} cy={-1.9} r={0.55} fill="#c9c4b4" />
      <path d="M1.75,-1.95 l0.75,0.25 l-0.75,0.25 Z" fill="#c98a3c" />
    </g>
  )
}

/** caisse de bois sans contour : faces par valeurs, cerclage sombre */
function CaisseArt({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y})${s !== 1 ? ` scale(${s})` : ''}`}>
      <ellipse cx={1.2} cy={0.4} rx={4.4} ry={1.2} fill={PAL.ombrePortee} opacity={0.15} />
      <rect x={-3.6} y={-6.4} width={7.2} height={6.4} fill="url(#a-bois-l)" />
      <rect x={2.1} y={-6.4} width={1.5} height={6.4} fill={PAL.boisOmbre} opacity={0.5} />
      <rect x={-3.6} y={-6.4} width={7.2} height={1} fill="#c2a071" />
      <path d="M-3.6,-4.5 h7.2 M-3.6,-2.1 h7.2" stroke={PAL.boisOmbre} strokeWidth={0.5} opacity={0.55} />
      <path d="M-1.1,-6.4 v6.4 M1.2,-6.4 v6.4" stroke={PAL.boisOmbre} strokeWidth={0.5} opacity={0.3} />
    </g>
  )
}

/** sac de grain : toile claire, flanc droit ombré, lien noué */
function SacArt({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y})${s !== 1 ? ` scale(${s})` : ''}`}>
      <ellipse cx={0.8} cy={0.3} rx={3.4} ry={1} fill={PAL.ombrePortee} opacity={0.14} />
      <path d="M-3,0 C-3.6,-3.4 -2.4,-5.6 0,-5.6 C2.4,-5.6 3.6,-3.4 3,0 Z" fill="#cbb289" />
      <path d="M1,0 C1.7,-2.5 1.6,-4.5 0.8,-5.4 C2.2,-4.9 3.4,-3.2 3,0 Z" fill="#a98d5f" />
      <path d="M-1.2,-5.3 L1.2,-5.3" stroke="#8a7248" strokeWidth={1} />
    </g>
  )
}

/** parasol de toile sur perche inclinée - abrite la marchande du niveau 1 */
function Parasol({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y})${s !== 1 ? ` scale(${s})` : ''}`}>
      <ellipse cx={3} cy={0.8} rx={8} ry={2} fill={PAL.ombrePortee} opacity={0.12} filter="url(#a-flou1)" />
      <line x1={0.6} y1={0} x2={-1.8} y2={-13.6} stroke={PAL.boisMi} strokeWidth={1.2} />
      {/* toile : calotte éclairée NW, bord tombant ombré */}
      <ellipse cx={-2} cy={-14} rx={9.6} ry={3.4} fill="#e5d8ba" />
      <path d="M-11.6,-13.6 Q-2,-10.4 7.6,-13.6 L7.4,-12.6 Q-2,-9.4 -11.4,-12.6 Z" fill="#b99e6e" />
      <ellipse cx={-3.6} cy={-14.8} rx={6.6} ry={2} fill="#f2e9d2" />
      <path d="M-2,-16.9 L-8.6,-13.7 M-2,-16.9 L4.6,-13.7 M-2,-16.9 L-2,-11.2" stroke="#c9b587" strokeWidth={0.6} opacity={0.8} />
      <circle cx={-2} cy={-17.4} r={0.8} fill="#b0503a" />
    </g>
  )
}

/** autel du foyer public : bloc appareillé, corniche, halo du feu perpétuel */
function Foyer({ n }: { n: number }) {
  const w = n >= 3 ? 14 : n === 2 ? 12 : 11
  return (
    <g transform={`translate(0,${n >= 2 ? 3 : -1})`}>
      {/* socle dallé rond dès que la place est pavée - rebord doré au niveau 4 */}
      {n >= 2 && <ellipse cx={0.6} cy={1} rx={w * 1.02} ry={w * 0.33} fill={n >= 4 ? '#c6bca1' : '#b1a584'} />}
      {n >= 2 && <ellipse cx={-0.4} cy={0.5} rx={w * 0.9} ry={w * 0.27} fill={n >= 4 ? '#ded5bf' : '#c9bfa2'} />}
      {n >= 4 && <ellipse cx={-0.4} cy={0.5} rx={w * 0.9} ry={w * 0.27} fill="none" stroke={PAL.or} strokeWidth={1.1} opacity={0.9} />}
      {/* niveau 1 : cercle de pierres et cendres du foyer rustique */}
      {n === 1 && (
        <g>
          <ellipse cx={4.5} cy={2.6} rx={7.5} ry={2.4} fill="#8d7a55" opacity={0.45} />
          {[
            [-8.2, 1.6, '#b6ac93'],
            [-5, 3.4, '#c4b99c'],
            [0.4, 4.4, '#aca188'],
            [5.8, 3.6, '#c0b498'],
            [8.4, 1.4, '#b2a78c'],
          ].map(([px, py, c], i) => (
            <ellipse key={i} cx={px as number} cy={py as number} rx={1.7} ry={1} fill={c as string} />
          ))}
        </g>
      )}
      <AOBase rx={w * 0.72} ry={w * 0.2} />
      <OmbreVolume w={w} h={11} o={0.15} />
      {/* retour est ombré + corps appareillé */}
      <path d={`M${w / 2},0 L${w / 2 + 3.6},-1.6 L${w / 2 + 3.6},-9.2 L${w / 2},-7.8 Z`} fill="url(#a-pierre-o)" />
      <MurPierre x={-w / 2} y={-7.8} w={w} h={7.8} seed={9} />
      {/* modelé du bloc : arête gauche éclairée, flanc droit assombri */}
      <line x1={-w / 2 + 0.5} y1={-0.3} x2={-w / 2 + 0.5} y2={-7.5} stroke="#fff6e0" strokeWidth={0.8} opacity={0.4} />
      <rect x={w / 2 - 2.6} y={-7.8} width={2.6} height={7.8} fill={PAL.ombrePortee} opacity={0.14} />
      {/* corniche débordante, dessus clair */}
      <rect x={-w / 2 - 1.5} y={-10.2} width={w + 3} height={2.5} fill={n >= 4 ? PAL.marbreLit : PAL.pierreLit} />
      {n >= 4 && <rect x={-w / 2 - 1.5} y={-7.7} width={w + 3} height={0.7} fill={PAL.or} />}
      <rect x={-w / 2 - 1.2} y={n >= 4 ? -7 : -7.7} width={w + 2.4} height={0.9} fill={PAL.ombrePortee} opacity={0.22} />
      {/* vasque cendrée + halo chaud du feu */}
      <ellipse cx={0} cy={-10} rx={w / 2 - 1} ry={1.7} fill="#8a8170" />
      <ellipse cx={0} cy={-10.2} rx={w / 2 - 2.2} ry={1.15} fill="#3d3428" />
      <circle cx={0} cy={-11.5} r={5.6} fill="#f5a24a" opacity={0.2} filter="url(#a-flou2)" />
      <Feu x={0} y={-11.4} r={n >= 3 ? 2.8 : 2.4} />
      <Fumee x={0} y={-14} />
    </g>
  )
}

/** rouleaux d'étoffes empilés, bout roulé éclairé */
function Etoffes({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-3.6} y={-2.3} width={7.2} height={2.3} rx={1.15} fill="#7c6a9c" />
      <rect x={-3.6} y={-2.3} width={7.2} height={0.7} rx={0.35} fill="#241a08" opacity={0.18} />
      <ellipse cx={3.4} cy={-1.15} rx={0.9} ry={1.15} fill="#9a8bb8" />
      <rect x={-3} y={-4.4} width={6.2} height={2.2} rx={1.1} fill="#b0503a" />
      <ellipse cx={3} cy={-3.3} rx={0.85} ry={1.1} fill="#cd7a58" />
      <rect x={-3} y={-4.4} width={6.2} height={0.6} rx={0.3} fill="#e0906c" opacity={0.8} />
    </g>
  )
}

/** corbeille tressée débordant de fruits */
function Corbeille({ x = 0, y = 0, s = 1, fruits = '#c9694f' }: { x?: number; y?: number; s?: number; fruits?: string }) {
  return (
    <g transform={`translate(${x},${y})${s !== 1 ? ` scale(${s})` : ''}`}>
      <path d="M-3,0 L-3.8,-3.8 L3.8,-3.8 L3,0 Z" fill="#c09a5c" />
      <path d="M-3.6,-2.7 h7.2 M-3.3,-1.3 h6.6" stroke="#96723c" strokeWidth={0.6} opacity={0.9} />
      <path d="M-3.8,-3.8 h7.6" stroke="#dcbf85" strokeWidth={0.9} />
      <circle cx={-1.6} cy={-4.4} r={1.2} fill={fruits} />
      <circle cx={0.7} cy={-4.9} r={1.2} fill="#a34e39" />
      <circle cx={2.2} cy={-4.2} r={1.05} fill="#dd8a66" />
    </g>
  )
}

/** pile de poteries : deux amphores et des bols empilés */
function Poteries({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={-4.6} cy={-0.7} rx={1.8} ry={0.8} fill="#a3673f" />
      <ellipse cx={-4.6} cy={-1.6} rx={1.8} ry={0.8} fill="#c97a58" />
      <ellipse cx={-4.6} cy={-2.4} rx={1.7} ry={0.75} fill="#8c552f" />
      <Amphore x={-0.8} y={0} s={0.62} />
      <Amphore x={2.8} y={0.2} c="#8c552f" s={0.52} />
    </g>
  )
}

/**
 * étal de marché volumique : comptoir de bois, marchandises colorées,
 * auvent rayé 2 valeurs en pente vers le joueur, feston au bord.
 */
function EtalArt({
  x = 0,
  y = 0,
  c = '#b0503a',
  s = 1,
  biens = 'tissus',
}: {
  x?: number
  y?: number
  c?: string
  s?: number
  biens?: 'tissus' | 'poterie' | 'fruits'
}) {
  const f = 12.8 / 11.6 // évasement de l'auvent vers l'avant
  const bw = 23.2 / 7
  return (
    <g transform={`translate(${x},${y})${s !== 1 ? ` scale(${s})` : ''}`}>
      {/* ombre portée SE + AO */}
      <path d="M-8,0.8 L10,0.8 L16,4.6 L-2,4.6 Z" fill={PAL.ombrePortee} opacity={0.13} filter="url(#a-flou2)" />
      <AOBase rx={10.5} ry={2.6} cy={0.8} />
      {/* pieds arrière du comptoir */}
      <line x1={-7.6} y1={0} x2={-7.6} y2={-6.5} stroke={PAL.boisOmbre} strokeWidth={1.5} />
      <line x1={7.6} y1={0} x2={7.6} y2={-6.5} stroke={PAL.boisOmbre} strokeWidth={1.5} />
      {/* face avant du comptoir, flanc droit ombré */}
      <rect x={-9} y={-7} width={18} height={5.8} fill="url(#a-bois-l)" />
      <line x1={-9} y1={-3.4} x2={9} y2={-3.4} stroke={PAL.boisOmbre} strokeWidth={0.5} opacity={0.5} />
      <rect x={7.5} y={-7} width={1.5} height={5.8} fill={PAL.boisOmbre} opacity={0.5} />
      {/* plateau débordant, chant éclairé */}
      <rect x={-10} y={-8.6} width={20} height={1.9} fill="#c39a6b" />
      <rect x={-10} y={-8.6} width={20} height={0.6} fill="#dab88c" />
      {/* marchandises */}
      {biens === 'tissus' && (
        <>
          <Etoffes x={-4} y={-8.5} />
          <Corbeille x={4.5} y={-8.4} s={0.85} fruits="#d9b25a" />
        </>
      )}
      {biens === 'poterie' && (
        <>
          <Poteries x={-2.5} y={-8.4} />
          <Corbeille x={6} y={-8.4} s={0.78} fruits="#8a9c6c" />
        </>
      )}
      {biens === 'fruits' && (
        <>
          <Corbeille x={-4.5} y={-8.4} />
          <Corbeille x={0.5} y={-8.4} s={0.9} fruits="#8a9c6c" />
          <circle cx={5} cy={-9.5} r={1.5} fill="#c2a539" />
          <circle cx={6.8} cy={-9.2} r={1.3} fill="#a08a2e" />
        </>
      )}
      {/* ombre douce de l'auvent sur les marchandises */}
      <rect x={-9.5} y={-11.2} width={19} height={1.8} fill={PAL.ombrePortee} opacity={0.1} filter="url(#a-flou1)" />
      {/* poteaux avant */}
      <line x1={-9.5} y1={0} x2={-9.5} y2={-13.4} stroke={PAL.boisMi} strokeWidth={1.7} />
      <line x1={9.5} y1={0} x2={9.5} y2={-13.4} stroke={PAL.boisMi} strokeWidth={1.7} />
      {/* botte d'oignons suspendue au poteau */}
      {biens === 'fruits' && (
        <g>
          <line x1={-9.5} y1={-12.6} x2={-9.5} y2={-10.4} stroke="#96723c" strokeWidth={0.6} />
          <circle cx={-9.5} cy={-9.8} r={1} fill="#c2a539" />
          <circle cx={-9.1} cy={-8.4} r={0.9} fill="#a08a2e" />
        </g>
      )}
      {/* auvent rayé : fond crème, 3 lés colorés, bas assombri, arête éclairée */}
      <path d={`M-11.6,-18.6 L11.6,-18.6 L12.8,-13.2 L-12.8,-13.2 Z`} fill="#efe5cb" />
      {[1, 3, 5].map((k) => {
        const x0 = -11.6 + k * bw
        const x1 = x0 + bw
        return <path key={k} d={`M${x0},-18.6 L${x1},-18.6 L${x1 * f},-13.2 L${x0 * f},-13.2 Z`} fill={c} />
      })}
      <path d="M-12.4,-15 L12.4,-15 L12.8,-13.2 L-12.8,-13.2 Z" fill="#241a08" opacity={0.13} />
      <line x1={-11.6} y1={-18.6} x2={11.6} y2={-18.6} stroke="#fff6e0" strokeWidth={0.9} opacity={0.75} />
      {/* feston du bord avant */}
      <path d={`M-12.8,-13.2 ${Array.from({ length: 8 }, () => 'q1.6,1.9 3.2,0').join(' ')} Z`} fill="#ddceab" />
    </g>
  )
}

/** poteau de bois de la stoa rustique - se détache du mur assombri derrière */
function Poteau({ x, h }: { x: number; h: number }) {
  return (
    <g>
      <rect x={x - 2.4} y={-1.6} width={4.8} height={1.6} fill={PAL.pierreMi} />
      <rect x={x - 2.1} y={-h} width={4.2} height={h - 1.4} fill="#b58e5c" />
      <line x1={x + 1.5} y1={-h + 0.5} x2={x + 1.5} y2={-2} stroke="#57402a" strokeWidth={1.2} />
      <line x1={x - 1.5} y1={-h + 0.5} x2={x - 1.5} y2={-2} stroke="#d8b078" strokeWidth={1.1} />
      <rect x={x - 2.8} y={-h - 1.4} width={5.6} height={1.6} fill={PAL.boisOmbre} />
    </g>
  )
}

/**
 * stoa : portique long vu de face - podium, mur de fond dans la pénombre
 * (ombres des colonnes décalées SE), colonnade, entablement, toit en croupe
 * (pan frontal en demi-teinte, arêtier gauche éclairé, droit ombré).
 */
function Stoa({ w, h, mode }: { w: number; h: number; mode: 'bois' | 'pierre' | 'marbre' }) {
  const bois = mode === 'bois'
  const marbre = mode === 'marbre'
  const nCols = Math.max(4, Math.round(w / (bois ? 13 : 12)))
  const pas = (w - 8) / (nCols - 1)
  const cols = Array.from({ length: nCols }, (_, i) => -w / 2 + 4 + i * pas)
  const podH = bois ? 2.4 : 4.8
  const mur = bois ? '#c4ab80' : marbre ? '#b8ad94' : '#a99d82'
  const yCap = -h - 2 // bas de l'architrave
  const yT = bois ? -h - 3 : yCap - 8.4 // ligne d'égout du toit
  const g = bois ? 5.5 : 7
  const kf = bois ? 11 : 15
  const oh = 4.5
  // portes des boutiques du fond : au milieu des travées, jamais dans l'axe du foyer
  const bay = (k: number) => -w / 2 + 4 + (k + 0.5) * pas
  const portes = nCols >= 6 ? [bay(1), bay(nCols - 3)] : [bay(0), bay(nCols - 2)]
  const antefixes = bois ? [] : Array.from({ length: Math.round((w + 6) / 11) + 1 }, (_, i) => -w / 2 - 3 + (i * (w + 6)) / Math.round((w + 6) / 11))

  return (
    <g>
      <defs>
        <linearGradient id="ag-toit-f" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d68a5c" />
          <stop offset="50%" stopColor="#c06844" />
          <stop offset="100%" stopColor="#96502f" />
        </linearGradient>
      </defs>
      <AOBase rx={w * 0.6} ry={w * 0.14} cy={2} />
      <OmbreVolume w={w + 6} h={h + podH + 10} y={1.5} o={0.16} />

      {/* podium à degrés, retour est ombré */}
      {Array.from({ length: bois ? 1 : 2 }, (_, i) => {
        const mw = w + 8 - i * 5
        const yb = -i * 2.4
        return (
          <g key={i}>
            <path d={`M${mw / 2},${yb} L${mw / 2 + 3.8},${yb - 1.7} L${mw / 2 + 3.8},${yb - 4.1} L${mw / 2},${yb - 2.4} Z`} fill="url(#a-pierre-o)" />
            <rect x={-mw / 2} y={yb - 2.4} width={mw} height={2.4} fill={i % 2 ? '#d8d0bb' : '#cfc7b2'} />
            <rect x={-mw / 2} y={yb - 2.4} width={mw} height={0.75} fill="#efe9d8" />
          </g>
        )
      })}

      <g transform={`translate(0,${-podH})`}>
        {/* mur de fond dans la pénombre */}
        <rect x={-w / 2 + 1.5} y={-h - 2} width={w - 3} height={h + 2} fill={mur} />
        <rect x={-w / 2 + 1.5} y={-h - 2} width={w - 3} height={h + 2} fill="url(#a-ao)" opacity={bois ? 0.55 : 0.75} />
        {/* voile de pénombre uniforme sous le portique de bois */}
        {bois && <rect x={-w / 2 + 1.5} y={-h - 2} width={w - 3} height={h + 2} fill={PAL.ombrePortee} opacity={0.24} />}
        {/* ombre du toit en haut du mur */}
        <rect x={-w / 2 + 1.5} y={-h - 2} width={w - 3} height={2.8} fill={PAL.ombrePortee} opacity={0.2} filter="url(#a-flou1)" />
        {/* madriers apparents du mur de la stoa rustique */}
        {bois &&
          [0.32, 0.58, 0.84].map((t) => (
            <line key={t} x1={-w / 2 + 2.5} y1={-h * t} x2={w / 2 - 2.5} y2={-h * t} stroke="#8a6f4a" strokeWidth={0.8} opacity={0.35} />
          ))}
        {/* portes des boutiques du fond */}
        {portes.map((px) => (
          <g key={px}>
            <rect x={px - 3.2} y={-h * 0.74} width={6.4} height={h * 0.74} fill="#3a2b18" />
            <rect x={px - 3.2} y={-h * 0.74} width={6.4} height={1} fill="#241a08" />
          </g>
        ))}
        {/* ombres des colonnes portées sur le mur, décalées SE */}
        {cols.map((x) => (
          <rect key={`m${x}`} x={x + 1.8} y={-h - 0.5} width={2.6} height={h + 0.5} fill={PAL.ombrePortee} opacity={0.12} filter="url(#a-flou1)" />
        ))}
        {/* ombres au sol du portique */}
        {cols.map((x) => (
          <path key={`s${x}`} d={`M${x - 2},-0.4 L${x + 2.4},-0.4 L${x + 6.4},1.8 L${x + 2},1.8 Z`} fill={PAL.ombrePortee} opacity={0.13} filter="url(#a-flou1)" />
        ))}
        {/* colonnade */}
        {cols.map((x) => (bois ? <Poteau key={x} x={x} h={h} /> : <Colonne3D key={x} x={x} h={h} larg={marbre ? 5.2 : 4.8} or={marbre} />))}
        {/* guirlandes de laurier suspendues entre les colonnes - grande fête du niveau 4 */}
        {marbre &&
          cols.map((x, i) =>
            i === cols.length - 1 ? null : (
              <g key={`g${i}`}>
                <path d={`M${x + 1.6},${-h + 2.6} Q${x + pas / 2},${-h + 8.6} ${x + pas - 1.6},${-h + 2.6}`} stroke="#5a7245" strokeWidth={1.9} fill="none" />
                <path d={`M${x + 1.6},${-h + 2.6} Q${x + pas / 2},${-h + 7.8} ${x + pas - 1.6},${-h + 2.6}`} stroke="#7a955e" strokeWidth={0.8} fill="none" opacity={0.9} />
              </g>
            ),
          )}

        {/* entablement */}
        {bois ? (
          <>
            <rect x={-w / 2 - 2} y={-h - 3} width={w + 4} height={3.2} fill="url(#a-bois-l)" />
            <rect x={-w / 2 - 2} y={-h - 0.2} width={w + 4} height={0.6} fill={PAL.boisOmbre} opacity={0.7} />
            <rect x={-w / 2 - 2} y={-h - 3} width={w + 4} height={0.7} fill="#c2a071" />
          </>
        ) : (
          <>
            <rect x={-w / 2 - 2} y={yCap - 3.2} width={w + 4} height={3.4} fill={marbre ? 'url(#a-marbre-l)' : 'url(#a-pierre-l)'} />
            <rect x={-w / 2 - 2} y={yCap - 6.2} width={w + 4} height={3.2} fill={marbre ? '#e9e2cf' : '#d3cab5'} />
            {/* frise : triglyphes en pierre, bosses d'or en marbre */}
            {!marbre &&
              cols.map((x, i) =>
                i === cols.length - 1 ? null : (
                  <g key={`tg${i}`}>
                    <rect x={x + pas / 2 - 1.5} y={yCap - 5.9} width={3} height={2.7} fill="#a89d82" />
                    <path d={`M${x + pas / 2 - 0.75},${yCap - 5.7} v2.2 M${x + pas / 2 + 0.55},${yCap - 5.7} v2.2`} stroke="#847860" strokeWidth={0.6} />
                  </g>
                ),
              )}
            {marbre && <rect x={-w / 2 - 2} y={yCap - 5.2} width={w + 4} height={1} fill={PAL.or} opacity={0.9} />}
            {marbre &&
              cols.map((x, i) => (i === cols.length - 1 ? null : <circle key={`r${i}`} cx={x + pas / 2} cy={yCap - 4.6} r={0.95} fill={PAL.or} />))}
            <rect x={-w / 2 - 3.4} y={yCap - 8.4} width={w + 6.8} height={2.4} fill={marbre ? '#f4efe0' : '#e2dac6'} />
            <rect x={-w / 2 - 2} y={yCap - 6.2} width={w + 4} height={0.9} fill={PAL.ombrePortee} opacity={0.2} />
          </>
        )}

        {/* toit en croupe : pan frontal demi-teinte, rangées de tuiles */}
        <path d={`M${-w / 2 - oh},${yT} L${w / 2 + oh},${yT} L${w / 2 - kf},${yT - g} L${-w / 2 + kf},${yT - g} Z`} fill="url(#ag-toit-f)" />
        {[0.35, 0.68].map((t) => {
          const xa = -w / 2 - oh + (oh + kf) * t
          const xb = w / 2 + oh - (oh + kf) * t
          return <line key={t} x1={xa} y1={yT - g * t} x2={xb} y2={yT - g * t} stroke={PAL.toitOmbre} strokeWidth={0.9} opacity={0.45} strokeDasharray="3.4 1.2" />
        })}
        {/* faîtage clair + arêtiers (gauche éclairé, droit ombré) */}
        <line x1={-w / 2 + kf} y1={yT - g} x2={w / 2 - kf} y2={yT - g} stroke={PAL.toitArete} strokeWidth={1.6} />
        <line x1={-w / 2 - oh} y1={yT} x2={-w / 2 + kf} y2={yT - g} stroke={PAL.toitArete} strokeWidth={1.2} opacity={0.9} />
        <line x1={w / 2 + oh} y1={yT} x2={w / 2 - kf} y2={yT - g} stroke={PAL.toitOmbre} strokeWidth={1.1} opacity={0.85} />
        <line x1={-w / 2 - oh} y1={yT + 0.3} x2={w / 2 + oh} y2={yT + 0.3} stroke="#8e4a2e" strokeWidth={0.7} opacity={0.55} />
        {/* acrotères d'or aux extrémités du faîtage */}
        {marbre &&
          [-w / 2 + kf, w / 2 - kf].map((ax) => <path key={ax} d={`M${ax - 2},${yT - g} q2,-3.6 4,0 Z`} fill={PAL.or} />)}
        {/* antéfixes le long de l'égout */}
        {antefixes.map((ax) => (
          <circle key={ax} cx={ax} cy={yT - 0.4} r={1.15} fill={marbre ? PAL.or : PAL.toitArete} />
        ))}
      </g>
    </g>
  )
}

/** statue civique sur socle (bronze, dorée au niveau 4) : deux valeurs, lance, ombre SE */
function StatueArt({
  x = 0,
  y = 0,
  or = false,
  s = 1,
  colombe = false,
  flip = false,
}: {
  x?: number
  y?: number
  or?: boolean
  s?: number
  colombe?: boolean
  flip?: boolean
}) {
  const cM = or ? PAL.or : '#8f6f42'
  const cL = or ? '#e8c97e' : '#c29c62'
  const cO = or ? '#8a6b2e' : '#5f4628'
  return (
    <g transform={`translate(${x},${y})${s !== 1 ? ` scale(${s})` : ''}`}>
      <path d="M-4,0.8 L4,0.8 L12.5,5 L4.5,5 Z" fill={PAL.ombrePortee} opacity={0.17} filter="url(#a-flou2)" />
      <AOBase rx={6} ry={1.8} />
      {/* socle à deux degrés, retour est ombré */}
      <path d="M5.5,0 L7.5,-0.9 L7.5,-3.9 L5.5,-3 Z" fill="url(#a-pierre-o)" />
      <rect x={-5.5} y={-3} width={11} height={3} fill={PAL.pierreMi} />
      <rect x={-5.5} y={-3} width={11} height={0.9} fill={PAL.pierreLit} />
      <path d="M4,-3 L5.6,-3.8 L5.6,-8.6 L4,-7.9 Z" fill="url(#a-pierre-o)" />
      <rect x={-4} y={-7.9} width={8} height={4.9} fill="url(#a-pierre-l)" />
      <rect x={-4.6} y={-9} width={9.2} height={1.3} fill={PAL.pierreLit} />
      {/* figure drapée, flanc droit dans l'ombre (lumière NW quel que soit le côté du bras) */}
      <path d="M-2,-9 L-1.5,-13.4 Q-2.1,-15.4 -1.7,-17 L1.8,-17 Q2.3,-14.6 1.8,-13 L2.3,-9 Z" fill={cM} />
      <path d="M0.9,-9 L1.2,-13 Q1.6,-15 1.3,-16.8 L1.8,-17 Q2.3,-14.6 1.8,-13 L2.3,-9 Z" fill={cO} />
      <path d="M-1.7,-16.8 Q-2.1,-15 -1.6,-13.4 L-1.3,-10" stroke={cL} strokeWidth={0.7} fill="none" opacity={0.9} />
      <circle cx={0.1} cy={-18.4} r={1.7} fill={cM} />
      <path d="M0.6,-19.9 A1.7,1.7 0 0 1 1.7,-18 L0.9,-17.4 Z" fill={cO} opacity={0.8} />
      {/* bras levé et lance - côté place (retourné si flip) */}
      {flip ? (
        <g>
          <path d="M-1.5,-16 L-4.1,-18.2" stroke={cM} strokeWidth={1.2} strokeLinecap="round" />
          <line x1={-4.3} y1={-23} x2={-4.3} y2={-6.5} stroke="#8a7a5c" strokeWidth={0.8} />
          <path d="M-4.3,-23 l-0.9,2.6 h1.8 Z" fill={or ? PAL.or : '#a8987a'} />
        </g>
      ) : (
        <g>
          <path d="M1.6,-16 L4.2,-18.2" stroke={cM} strokeWidth={1.2} strokeLinecap="round" />
          <line x1={4.4} y1={-23} x2={4.4} y2={-6.5} stroke="#8a7a5c" strokeWidth={0.8} />
          <path d="M4.4,-23 l-0.9,2.6 h1.8 Z" fill={or ? PAL.or : '#a8987a'} />
        </g>
      )}
      {/* colombe perchée sur la tête du héros */}
      {colombe && <Colombe x={-0.3} y={-20} />}
    </g>
  )
}

/** brasero de bronze sur trépied */
function Brasero({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={1.5} cy={1} rx={4} ry={1.3} fill={PAL.ombrePortee} opacity={0.16} />
      <path d="M-3,-6 L3,-6 L2,-2 L-2,-2 Z" fill="#8a6b2e" />
      <path d="M-3,-6 L3,-6 L2.6,-4.9 L-2.6,-4.9 Z" fill="#c9a441" />
      <line x1={0} y1={-2} x2={0} y2={0} stroke="#6e5525" strokeWidth={1.6} />
      <Feu x={0} y={-6.5} r={2} />
    </g>
  )
}

/** entrepôt du marché : petite bâtisse de pierre, fret à demeure */
function Entrepot({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={0} cy={1.5} rx={17} ry={5} fill="#b9a878" opacity={0.45} />
      <Batisse3D
        w={24}
        h={11}
        g={6}
        prof={7}
        mat="pierre"
        toit="tuiles"
        enfants={
          <>
            <Porte3D w={6.6} h={8.6} x={flip ? 3 : -3} />
            {/* évent sous le pignon */}
            <rect x={-1.5} y={-13.2} width={3} height={2.3} fill="#3c2d1a" />
            <rect x={-1.5} y={-13.2} width={3} height={0.6} fill="#241a08" />
          </>
        }
      />
      <CaisseArt x={flip ? -7.5 : 7.5} y={1.2} s={0.92} />
      <SacArt x={flip ? -11.5 : 11.5} y={2.2} s={0.95} />
      <Amphore x={flip ? -15.5 : 15.5} y={0.5} s={0.85} />
      <Amphore x={flip ? -18.5 : 18.5} y={1.8} c="#8c552f" s={0.68} />
    </g>
  )
}

export function Agora({ n }: { n: number }) {
  if (n === 1) {
    return (
      <g>
        {/* place de terre battue : deux tons d'usure + liseré d'ombre SE */}
        <ellipse cx={3} cy={1.5} rx={40} ry={13} fill={PAL.ombrePortee} opacity={0.09} filter="url(#a-flou2)" />
        <ellipse cx={0} cy={0} rx={40} ry={13} fill="#bda36e" />
        <ellipse cx={-3} cy={-0.6} rx={31} ry={9.6} fill="#cbb17c" opacity={0.85} />
        <ellipse cx={9} cy={2.5} rx={15} ry={4.2} fill="#b2945e" opacity={0.65} />
        <ellipse cx={-21} cy={4} rx={9} ry={2.6} fill="#d5bd88" opacity={0.8} />
        <path d="M-32,5 Q-14,9 2,7 M10,8 Q22,8 32,4" stroke="#a98c58" strokeWidth={1.3} fill="none" opacity={0.5} />
        {/* pas japonais usés vers le foyer */}
        {[
          [9.5, 8.5, '#b5a67a'],
          [4.5, 10.4, '#ab9c72'],
          [-1.5, 11.6, '#bcac80'],
        ].map(([px, py, c], i) => (
          <ellipse key={i} cx={px as number} cy={py as number} rx={2.5} ry={1} fill={c as string} opacity={0.9} />
        ))}
        <Foyer n={1} />
        {/* coin de la marchande : natte, marchandises, parasol de toile */}
        <g transform="translate(19,7)">
          <path d="M-9,-3.5 L8,-3.5 L10,2 L-7,2 Z" fill="#d2bd90" />
          <path d="M-9,-3.5 L8,-3.5 L10,2 L-7,2 Z" fill="none" stroke="#ab8f5c" strokeWidth={0.7} opacity={0.8} />
          <rect x={-7.6} y={-2.6} width={4} height={1.8} rx={0.9} fill="#7c6a9c" />
          <Corbeille x={-1.5} y={-0.6} />
          <Amphore x={3.5} y={-0.8} s={0.8} />
          <Amphore x={6.8} y={0.4} c="#8c552f" s={0.62} />
        </g>
        <Parasol x={28} y={9} />
        {/* panneau d'annonces */}
        <g transform="translate(-25,-7)">
          <path d="M0.5,0.5 L5.5,2.6 L2,2.6 Z" fill={PAL.ombrePortee} opacity={0.14} />
          <line x1={0} y1={0} x2={0} y2={-11} stroke={PAL.boisMi} strokeWidth={1.8} />
          <rect x={-4.5} y={-12} width={9} height={5.5} fill="#e3dccb" />
          <rect x={-4.5} y={-12} width={9} height={1} fill="#f2ede0" />
          <rect x={-4.5} y={-7.3} width={9} height={0.8} fill={PAL.stucOmbre} opacity={0.55} />
          <path d="M-2.8,-10.4 h5.6 M-2.8,-8.9 h4" stroke="#8a7a5c" strokeWidth={0.7} />
        </g>
        {/* banc : planche sur deux pierres, une caisse oubliée à côté */}
        <g transform="translate(-13,9)">
          <ellipse cx={1.5} cy={0.8} rx={7.5} ry={1.5} fill={PAL.ombrePortee} opacity={0.13} />
          <rect x={-5.5} y={-2.4} width={2.6} height={2.4} fill={PAL.pierreMi} />
          <rect x={-5.5} y={-2.4} width={2.6} height={0.7} fill={PAL.pierreLit} />
          <rect x={3} y={-2.4} width={2.6} height={2.4} fill={PAL.pierreMi} />
          <rect x={3} y={-2.4} width={2.6} height={0.7} fill={PAL.pierreLit} />
          <rect x={-7} y={-4.2} width={14} height={2} fill="url(#a-bois-l)" />
          <rect x={-7} y={-4.2} width={14} height={0.6} fill="#d1b183" />
          <rect x={-7} y={-2.6} width={14} height={0.4} fill={PAL.boisOmbre} opacity={0.6} />
        </g>
        <CaisseArt x={-21} y={11} s={0.85} />
        <Colombe x={-6} y={6.5} />
        <Colombe x={-2.5} y={8} flip />
        <OlivierMini x={32} y={-5} s={0.95} />
        <Buisson x={-34} y={3} s={0.9} />
        <Buisson x={35} y={7} s={0.75} />
      </g>
    )
  }

  const marbre = n >= 4
  const rx = marbre ? 54 : 48
  const ry = marbre ? 17.5 : 16
  const stoaW = n === 2 ? 50 : n === 3 ? 66 : 82
  const stoaH = n === 2 ? 10 : n === 3 ? 13 : 15

  return (
    <g>
      {/* place dallée : fond joint, dalles suggérées, pierres de bordure */}
      <ellipse cx={3} cy={1.5} rx={rx} ry={ry} fill={PAL.ombrePortee} opacity={0.09} filter="url(#a-flou2)" />
      <ellipse cx={0} cy={0} rx={rx} ry={ry} fill={marbre ? '#c6bca1' : '#b3a686'} />
      <Dallage rx={rx} ry={ry} seed={n * 13 + 5} marbre={marbre} />
      {/* la grande agora cerclée d'or : bande dorée incrustée au pourtour */}
      {marbre && (
        <g>
          <ellipse cx={0.7} cy={0.5} rx={rx - 4} ry={ry - 1.6} fill="none" stroke="#8a6b2e" strokeWidth={1.2} opacity={0.5} strokeDasharray="7 2.6" />
          <ellipse cx={0} cy={0} rx={rx - 4} ry={ry - 1.6} fill="none" stroke={PAL.or} strokeWidth={1.2} opacity={0.8} strokeDasharray="7 2.6" />
        </g>
      )}

      {/* stoa au fond de la place */}
      <g transform="translate(0,-14)">
        <Stoa w={stoaW} h={stoaH} mode={n === 2 ? 'bois' : marbre ? 'marbre' : 'pierre'} />
      </g>

      {n >= 3 && <Entrepot x={-56} y={-3} />}
      {n >= 3 && <Entrepot x={56} y={-2} flip />}

      {/* colombes sur le faîtage */}
      {n >= 3 && (
        <g fill="#efe9dc">
          <ellipse cx={-10} cy={-14 - 4.8 - stoaH - 2 - 8.4 - 7 - 1} rx={1.4} ry={0.9} />
          <circle cx={-8.9} cy={-14 - 4.8 - stoaH - 2 - 8.4 - 7 - 1.8} r={0.6} />
          <ellipse cx={14} cy={-14 - 4.8 - stoaH - 2 - 8.4 - 7 - 1} rx={1.4} ry={0.9} />
          <circle cx={15.1} cy={-14 - 4.8 - stoaH - 2 - 8.4 - 7 - 1.8} r={0.6} />
        </g>
      )}

      <Foyer n={n} />

      {/* étals - emplacements des marchandes (Ouvriers.tsx) conservés */}
      <EtalArt x={-30} y={4} c="#b0503a" biens="tissus" />
      <EtalArt x={30} y={6} c="#5f7d64" biens="poterie" s={0.95} />
      {n >= 3 && <EtalArt x={14} y={15} c="#7c6a9c" biens="fruits" s={0.85} />}

      {/* statue civique bien dégagée, à l'avant-droit de la place, tournée vers le foyer */}
      {n >= 3 && <StatueArt x={marbre ? 52 : 50} y={14} or={marbre} s={marbre ? 1.3 : 1.2} colombe={!marbre} flip />}

      {/* fret en attente entre le foyer et l'étal aux étoffes */}
      <Corbeille x={-16} y={10.5} s={0.95} fruits="#d9b25a" />
      <Amphore x={-12.5} y={12} s={0.8} />
      {n >= 3 && <SacArt x={-19.5} y={11.8} s={0.9} />}

      {/* colombes picorant les miettes du marché */}
      <Colombe x={-7.5} y={8} />
      <Colombe x={-4} y={9.6} flip />

      {n === 2 && <Buisson x={-43} y={7} s={0.85} />}
      {n === 2 && <Buisson x={43} y={9} s={0.7} />}
      {n === 3 && <Buisson x={-51} y={14} s={0.8} />}
      {n === 3 && <Brasero x={-38} y={12} />}

      {marbre && (
        <g>
          <Brasero x={-36} y={13} />
          <Brasero x={36} y={12} />
          <OlivierMini x={-49} y={12} s={0.85} />
          <OlivierMini x={64} y={16} s={0.72} />
        </g>
      )}
    </g>
  )
}
