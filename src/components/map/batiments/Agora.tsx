import { Fragment, type ReactNode } from 'react'
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
    : ['#c9b791', '#bda67f', '#d2c099', '#b09e75', '#c3b088']
  const clair = marbre ? '#f8f3e7' : '#dccdaa'
  const dalles: ReactNode[] = []
  const nR = 6
  const pitch = (ry * 1.5) / nR
  for (let r = 0; r < nR; r++) {
    const ty = -ry * 0.72 + (r + 0.5) * pitch
    const demi = rx * Math.sqrt(Math.max(0.06, 1 - (ty / ry) ** 2)) * 0.94
    let cx = -demi + rnd() * 8 - 4
    while (cx < demi - 4) {
      // quelques grandes dalles cassent la régularité d'un pas unique
      const pw = (rnd() > 0.8 ? 19 : 8) + rnd() * 11
      const fin = Math.min(demi, cx + pw)
      const x0 = Math.max(-demi, cx)
      const dw = fin - x0 - 1.1
      if (rnd() > 0.11 && dw > 3) {
        const y0 = ty - pitch / 2 + 0.45 + (rnd() - 0.5) * 0.8
        const dh = pitch - 0.95 - rnd() * 0.5
        const d = rnd()
        // un liseré éclairé sur les unes, un joint creux sur les autres, rien sur le reste
        dalles.push(
          <Fragment key={`${r}-${cx.toFixed(0)}`}>
            <rect x={x0} y={y0} width={dw} height={dh} rx={0.9} fill={tons[Math.floor(rnd() * tons.length)]} />
            {d > 0.58 && <rect x={x0 + 0.6} y={y0} width={dw - 1.2} height={0.7} rx={0.35} fill={clair} opacity={0.8} />}
            {d < 0.16 && <rect x={x0 + dw - 0.9} y={y0 + 0.4} width={0.9} height={dh - 0.4} fill={PAL.pierreJoint} opacity={0.22} />}
          </Fragment>,
        )
      }
      cx = fin + 0.5
    }
  }
  // pierres de bordure irrégulières, en remplacement d'un anneau trop parfait
  const bords: ReactNode[] = []
  const nB = 15
  for (let i = 0; i < nB; i++) {
    const a = (i / nB) * Math.PI * 2 + rnd() * 0.2
    const bx = Math.cos(a) * (rx - 2.4)
    const by = Math.sin(a) * (ry - 1.6)
    const bw = 4.2 + rnd() * 2.6
    const bh = 1.7 + rnd() * 0.6
    bords.push(
      <Fragment key={`b${i}`}>
        <rect x={bx - 2.4 - rnd() * 1.4} y={by - 0.9} width={bw} height={bh} rx={0.8} fill={marbre ? '#b8ae95' : '#94886a'} />
        <rect x={bx - 2 - rnd() * 1.4} y={by - 0.9} width={bw - 1} height={0.65} rx={0.3} fill={marbre ? '#d5ccb5' : '#b0a37f'} />
      </Fragment>,
    )
  }
  return (
    <g>
      {dalles}
      {bords}
    </g>
  )
}

/** terre battue du niveau 1 : plaques d'usure et cailloux, jamais un aplat */
function TerreBattue({ rx, ry, seed = 11 }: { rx: number; ry: number; seed?: number }) {
  const rnd = alea(seed)
  const tons = ['#c9ae74', '#b8995f', '#d2ba85', '#ab8d55']
  const taches: ReactNode[] = []
  for (let i = 0; i < 13; i++) {
    const a = rnd() * Math.PI * 2
    const d = 0.22 + rnd() * 0.72
    taches.push(
      <ellipse
        key={i}
        cx={Math.cos(a) * rx * d}
        cy={Math.sin(a) * ry * d}
        rx={5 + rnd() * 11}
        ry={2 + rnd() * 3.4}
        fill={tons[Math.floor(rnd() * 4)]}
        opacity={0.42 + rnd() * 0.3}
      />,
    )
  }
  const cailloux: ReactNode[] = []
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2
    const d = 0.2 + rnd() * 0.76
    const px = Math.cos(a) * rx * d
    const py = Math.sin(a) * ry * d
    const r = 0.7 + rnd() * 1.1
    cailloux.push(
      <Fragment key={i}>
        <ellipse cx={px} cy={py} rx={r} ry={r * 0.62} fill={['#94856a', '#a2937a', '#7f725a'][Math.floor(rnd() * 3)]} />
        <ellipse cx={px - r * 0.26} cy={py - r * 0.2} rx={r * 0.55} ry={r * 0.28} fill="#b5a888" opacity={0.6} />
      </Fragment>,
    )
  }
  return (
    <g>
      {taches}
      {cailloux}
    </g>
  )
}

/** ornières de charrettes creusées dans la terre : creux sombre, lèvre éclairée au NW */
function Ornieres() {
  return (
    <g fill="none" strokeLinecap="round">
      <path d="M-40,4 Q-16,9.6 4,7.8 T40,2.4" stroke="#9a7f50" strokeWidth={2.7} opacity={0.5} />
      <path d="M-40,2.5 Q-16,8.1 4,6.3 T40,1" stroke="#d9c495" strokeWidth={0.9} opacity={0.45} />
      <path d="M-37,9.2 Q-14,13.8 6,12 T35,7" stroke="#9a7f50" strokeWidth={2.2} opacity={0.42} />
      <path d="M-37,7.9 Q-14,12.5 6,10.7 T35,5.8" stroke="#d9c495" strokeWidth={0.8} opacity={0.4} />
      <path d="M-28,-7 Q-8,-4.2 14,-6.4" stroke="#a98c58" strokeWidth={1.5} opacity={0.32} />
    </g>
  )
}

/** pierres de bordure posées à même la terre : blocs irréguliers, dessus éclairé */
function BordurePierres({ rx, ry, seed = 3, nb = 15 }: { rx: number; ry: number; seed?: number; nb?: number }) {
  const rnd = alea(seed)
  const pierres: { y: number; el: ReactNode }[] = []
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + (rnd() - 0.5) * 0.26
    const px = Math.cos(a) * rx
    const py = Math.sin(a) * ry
    const w = 3.2 + rnd() * 2.6
    const h = 1.8 + rnd() * 1.2
    const ton = ['#9d9174', '#8d8163', '#a89b7e'][Math.floor(rnd() * 3)]
    pierres.push({
      y: py,
      el: (
        <g key={i} transform={`rotate(${((rnd() - 0.5) * 22).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)})`}>
          <rect x={px - w / 2} y={py - h} width={w} height={h} rx={0.9} fill={ton} />
          <rect x={px - w / 2 + 0.4} y={py - h} width={w - 0.8} height={0.7} rx={0.35} fill="#bcb08e" opacity={0.75} />
          <rect x={px + w / 2 - 1} y={py - h + 0.5} width={1} height={h - 0.5} fill={PAL.pierreJoint} opacity={0.4} />
        </g>
      ),
    })
  }
  pierres.sort((a, b) => a.y - b.y)
  return <g>{pierres.map((p) => p.el)}</g>
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

/**
 * foyer commun du niveau 1 : cercle de pierres brutes posées sur la terre,
 * lit de cendres, bûches à demi consumées. Les pierres du devant passent
 * devant le lit de braises pour donner la cuvette.
 */
function FoyerPierres() {
  const rnd = alea(21)
  const arriere: ReactNode[] = []
  const avant: ReactNode[] = []
  const nS = 11
  for (let i = 0; i < nS; i++) {
    const a = (i / nS) * Math.PI * 2 + 0.22 + (rnd() - 0.5) * 0.2
    const px = Math.cos(a) * 10.6
    const py = Math.sin(a) * 3.6
    const w = 2.9 + rnd() * 1.5
    const h = 2 + rnd() * 1.1
    const ton = ['#9d9075', '#8c8067', '#a99c81'][Math.floor(rnd() * 3)]
    const el = (
      <Fragment key={i}>
        <ellipse cx={px} cy={py - h * 0.34} rx={w * 0.55} ry={h * 0.7} fill={ton} />
        <ellipse cx={px - w * 0.16} cy={py - h * 0.62} rx={w * 0.32} ry={h * 0.3} fill="#bfb391" opacity={0.8} />
        {/* suie sur la face tournée vers le feu */}
        <ellipse cx={px - Math.cos(a) * w * 0.22} cy={py - h * 0.34 - Math.sin(a) * h * 0.3} rx={w * 0.3} ry={h * 0.34} fill="#3a3025" opacity={0.28} />
      </Fragment>
    )
    if (py > 0.4) avant.push(el)
    else arriere.push(el)
  }
  return (
    <g>
      <ellipse cx={1.6} cy={1.8} rx={15} ry={5.2} fill={PAL.ombrePortee} opacity={0.1} filter="url(#a-flou2)" />
      {/* auréole de terre brûlée et de cendres balayées */}
      <ellipse cx={0} cy={0} rx={15.5} ry={5.4} fill="#9c8256" opacity={0.5} />
      <ellipse cx={-0.8} cy={-0.4} rx={11.8} ry={4} fill="#8c7b5c" opacity={0.6} />
      {arriere}
      {/* cuvette : cendre claire, cendre froide, braises */}
      <ellipse cx={0} cy={-0.4} rx={8.6} ry={3} fill="#7a7062" />
      <ellipse cx={-0.6} cy={-1} rx={6.8} ry={2.2} fill="#4c4238" />
      <ellipse cx={-1} cy={-1.3} rx={3.8} ry={1.2} fill="#95552a" opacity={0.85} />
      {/* deux bûches en croix, bouts fraîchement fendus */}
      <path d="M-6.8,-1 L2.4,-3.6 L3.2,-2.1 L-6.1,0.5 Z" fill="#5e4630" />
      <path d="M2.4,-3.6 L3.2,-2.1 L4.6,-2.5 L3.7,-4.1 Z" fill="#9c7549" />
      <path d="M6.4,-0.4 L-1.8,-4 L-2.6,-2.5 L5.7,1.1 Z" fill="#6d5238" />
      <path d="M-1.8,-4 L-2.6,-2.5 L-4,-3.1 L-3.1,-4.6 Z" fill="#9c7549" />
      {avant}
    </g>
  )
}

/** autel du foyer public : bloc appareillé, corniche, halo du feu perpétuel */
function Foyer({ n }: { n: number }) {
  // niveau 1 : pas d'autel taillé, un vrai foyer de pierres à même la place
  if (n === 1) {
    return (
      <g>
        <FoyerPierres />
        <circle cx={0} cy={-3.6} r={7.4} fill="#f5a24a" opacity={0.2} filter="url(#a-flou2)" />
        <Feu x={0} y={-3.6} r={2.9} />
        {/* fumée volontairement ténue : sans cela le bouillon lu à l'arrêt fait une boule blanche */}
        <g opacity={0.55}>
          <Fumee x={0} y={-6.6} />
        </g>
      </g>
    )
  }
  const w = n >= 3 ? 14 : 12
  return (
    <g transform="translate(0,3)">
      {/* socle dallé rond dès que la place est pavée - rebord doré au niveau 4 */}
      <ellipse cx={0.6} cy={1} rx={w * 1.02} ry={w * 0.33} fill={n >= 4 ? '#c6bca1' : '#b1a584'} />
      <ellipse cx={-0.4} cy={0.5} rx={w * 0.9} ry={w * 0.27} fill={n >= 4 ? '#ded5bf' : '#c9bfa2'} />
      {n >= 4 && <ellipse cx={-0.4} cy={0.5} rx={w * 0.9} ry={w * 0.27} fill="none" stroke={PAL.or} strokeWidth={1.1} opacity={0.9} />}
      <AOBase rx={w * 0.72} ry={w * 0.2} />
      <OmbreVolume w={w} h={11} o={0.15} />
      {/* retour est ombré + corps appareillé */}
      <path d={`M${w / 2},0 L${w / 2 + 3.6},-1.6 L${w / 2 + 3.6},-9.2 L${w / 2},-7.8 Z`} fill="url(#a-pierre-o)" />
      <MurPierre x={-w / 2} y={-7.8} w={w} h={7.8} seed={9} ombre={n < 4} />
      {/* modelé du bloc : arête gauche éclairée, flanc droit assombri */}
      <line x1={-w / 2 + 0.5} y1={-0.3} x2={-w / 2 + 0.5} y2={-7.5} stroke="#fff6e0" strokeWidth={0.8} opacity={0.35} />
      <rect x={w / 2 - 2.6} y={-7.8} width={2.6} height={7.8} fill={PAL.ombrePortee} opacity={0.16} />
      {/* traînées de suie léchées par des siècles de flammes */}
      {n < 4 && (
        <g fill="#3a3025" opacity={0.2}>
          <path d={`M${-w / 4},-7.6 q1.2,2.4 0.4,4.4 q-1.6,-2 -1.6,-4.4 Z`} />
          <path d={`M${w / 5},-7.6 q1.4,2 0.8,3.6 q-1.8,-1.6 -1.8,-3.6 Z`} />
        </g>
      )}
      {/* corniche débordante, dessus clair */}
      <rect x={-w / 2 - 1.5} y={-10.2} width={w + 3} height={2.5} fill={n >= 4 ? PAL.marbreLit : '#cdc3a9'} />
      {n >= 4 && <rect x={-w / 2 - 1.5} y={-7.7} width={w + 3} height={0.7} fill={PAL.or} />}
      <rect x={-w / 2 - 1.2} y={n >= 4 ? -7 : -7.7} width={w + 2.4} height={0.9} fill={PAL.ombrePortee} opacity={0.22} />
      {/* vasque cendrée + halo chaud du feu */}
      <ellipse cx={0} cy={-10} rx={w / 2 - 1} ry={1.7} fill="#8a8170" />
      <ellipse cx={0} cy={-10.2} rx={w / 2 - 2.2} ry={1.15} fill="#3d3428" />
      <circle cx={0} cy={-11.5} r={5.6} fill="#f5a24a" opacity={0.2} filter="url(#a-flou2)" />
      <Feu x={0} y={-11.4} r={n >= 3 ? 2.8 : 2.4} />
      <g opacity={0.6}>
        <Fumee x={0} y={-14} />
      </g>
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

/** jarre de terre cuite peinte : flanc ouest éclairé, flanc est ombré, col creux */
function Jarre({ x = 0, y = 0, s = 1, sombre = false }: { x?: number; y?: number; s?: number; sombre?: boolean }) {
  const M = sombre ? '#8c5a33' : '#b4733f'
  const L = sombre ? '#b58253' : '#d99a5f'
  const O = sombre ? '#5d3a1e' : '#7d4a26'
  return (
    <g transform={`translate(${x},${y})${s !== 1 ? ` scale(${s})` : ''}`}>
      <ellipse cx={1.3} cy={0.5} rx={3.8} ry={1.2} fill={PAL.ombrePortee} opacity={0.15} />
      <path d="M-3.2,-3.6 C-3.2,-0.8 -1.8,0 0,0 C1.8,0 3.2,-0.8 3.2,-3.6 C3.2,-6.6 2,-8.4 1.4,-9.2 L-1.4,-9.2 C-2,-8.4 -3.2,-6.6 -3.2,-3.6 Z" fill={M} />
      <path d="M-3.2,-3.6 C-3.2,-6.6 -2,-8.4 -1.4,-9.2 L-0.2,-9.2 C-0.9,-8.2 -1.9,-6.4 -1.9,-3.6 C-1.9,-1.4 -1.2,-0.3 -0.2,0 C-1.9,0 -3.2,-0.9 -3.2,-3.6 Z" fill={L} />
      <path d="M1.5,-9.2 C2.1,-8.3 3.2,-6.6 3.2,-3.6 C3.2,-0.8 1.8,0 0,0 C1.2,-0.5 1.9,-1.6 1.9,-3.6 C1.9,-6.3 1.1,-8.2 0.5,-9.2 Z" fill={O} />
      <ellipse cx={0} cy={-9.3} rx={1.9} ry={0.7} fill={O} />
      <ellipse cx={-0.3} cy={-9.6} rx={1.4} ry={0.45} fill={L} opacity={0.9} />
      <path d="M-2.6,-6.9 q1.3,0.6 2.6,0.6 q1.3,0 2.6,-0.6" stroke={O} strokeWidth={0.6} fill="none" opacity={0.45} />
    </g>
  )
}

/** tas de bûches fendues : bouts en coupe, cœur clair, écorce sombre */
function Buches({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={1.3} cy={0.6} rx={7} ry={1.8} fill={PAL.ombrePortee} opacity={0.14} />
      {[
        [-4.6, -1.7, 0],
        [-1.6, -1.7, 1],
        [1.4, -1.7, 0],
        [4.4, -1.7, 1],
        [-3.1, -4.4, 1],
        [-0.1, -4.4, 0],
        [2.9, -4.4, 1],
        [-0.1, -7, 0],
      ].map(([px, py, k], i) => (
        <Fragment key={i}>
          <ellipse cx={px as number} cy={py as number} rx={1.6} ry={1.5} fill="#6b4f33" />
          <ellipse cx={(px as number) - 0.26} cy={(py as number) - 0.26} rx={1.12} ry={1.02} fill={k ? '#c9a672' : '#b8935f'} />
        </Fragment>
      ))}
    </g>
  )
}

/** chèvre du village : trois valeurs, zéro contour, cornes fines */
function ChevreArt({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={1.3} cy={0.5} rx={5.4} ry={1.5} fill={PAL.ombrePortee} opacity={0.15} />
      <rect x={-3.4} y={-3.6} width={1.3} height={3.7} fill="#8e7f62" />
      <rect x={-1.5} y={-3.6} width={1.2} height={3.5} fill="#71644b" />
      <rect x={2.2} y={-3.6} width={1.3} height={3.7} fill="#71644b" />
      <ellipse cx={0} cy={-5.6} rx={4.6} ry={2.8} fill="#c2b393" />
      <ellipse cx={-1} cy={-6.6} rx={3.3} ry={1.5} fill="#ded2b2" />
      <path d="M2.4,-7.8 A4.6,2.8 0 0 1 3.6,-4.2 L1.6,-4.6 Z" fill="#8d8064" />
      <g transform="rotate(-16 5.3 -7.6)">
        <ellipse cx={5.3} cy={-7.6} rx={2.3} ry={1.5} fill="#cdbfa0" />
        <ellipse cx={6.7} cy={-7.2} rx={1.1} ry={0.8} fill="#9a8c6d" />
      </g>
      <path d="M4.6,-8.9 q0.9,-2.1 2.5,-2.4 M5.7,-9 q1.4,-1.7 2.9,-1.6" stroke="#6b5c42" strokeWidth={0.8} fill="none" />
      <circle cx={6.1} cy={-7.8} r={0.4} fill="#3a3125" />
      <path d="M7.1,-6.3 q0.4,1.5 -0.5,2.1" stroke="#b8a988" strokeWidth={0.9} fill="none" />
      <path d="M-4.3,-7 q-1.8,0.6 -1.5,2.4" stroke="#c2b393" strokeWidth={1.2} fill="none" />
    </g>
  )
}

/** piquet d'attache et la bête au bout de sa corde */
function PiquetBete({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={0.9} cy={0.4} rx={2} ry={0.8} fill={PAL.ombrePortee} opacity={0.15} />
      <rect x={-0.9} y={-8.6} width={1.8} height={8.6} fill={PAL.boisMi} />
      <rect x={-0.9} y={-8.6} width={0.7} height={8.6} fill="#a8845d" />
      <path d="M-0.9,-8.2 L0.9,-9.4 L0.9,-8.2 Z" fill={PAL.boisOmbre} />
      <path d="M0.7,-7.4 Q4.8,-5.2 8,-7.2" stroke="#b0996d" strokeWidth={0.7} fill="none" />
      <ChevreArt x={9.4} y={1.2} />
    </g>
  )
}

/** linge qui sèche sur une corde tendue entre deux perches fourchues */
function LingeSeche({ x = 0, y = 0 }: { x?: number; y?: number }) {
  const draps = [
    { dx: 3, w: 5.4, h: 9, c: '#d6c8a5', l: '#f0e6cb' },
    { dx: 9.2, w: 4.4, h: 6.8, c: '#a8563e', l: '#c97a58' },
    { dx: 14.6, w: 4.8, h: 8.2, c: '#78899b', l: '#9dafbd' },
  ]
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={10} cy={1.2} rx={13} ry={2.6} fill={PAL.ombrePortee} opacity={0.1} filter="url(#a-flou1)" />
      {[0, 18].map((px) => (
        <g key={px}>
          <rect x={px - 0.95} y={-21} width={1.9} height={21} fill={PAL.boisMi} />
          <rect x={px - 0.95} y={-21} width={0.75} height={21} fill="#a8845d" />
          <path d={`M${px},-20.4 l-2.3,-2.6 M${px},-20.4 l2.3,-2.6`} stroke={PAL.boisMi} strokeWidth={1.1} fill="none" />
        </g>
      ))}
      <path d="M0,-21.8 Q9,-19.2 18,-21.8" stroke="#a8946c" strokeWidth={0.7} fill="none" />
      {draps.map((d, i) => {
        const top = -21.6 + Math.sin((d.dx / 18) * Math.PI) * 2.2
        const g = d.w / 2
        return (
          <g key={i}>
            <path d={`M${d.dx - g},${top} L${d.dx + g},${top} L${d.dx + g + 0.8},${top + d.h} Q${d.dx},${top + d.h + 1.7} ${d.dx - g - 0.7},${top + d.h} Z`} fill={d.c} />
            <path d={`M${d.dx - g},${top} L${d.dx - g + 1.5},${top} L${d.dx - g + 0.9},${top + d.h + 0.5} L${d.dx - g - 0.7},${top + d.h} Z`} fill={d.l} opacity={0.9} />
            <path d={`M${d.dx + g - 1.4},${top} L${d.dx + g},${top} L${d.dx + g + 0.8},${top + d.h} L${d.dx + g - 0.9},${top + d.h + 0.4} Z`} fill={PAL.ombrePortee} opacity={0.18} />
            <path d={`M${d.dx - g},${top + 1} L${d.dx + g},${top + 1}`} stroke={PAL.ombrePortee} strokeWidth={0.6} opacity={0.2} />
          </g>
        )
      })}
    </g>
  )
}

/**
 * étal rudimentaire du niveau 1 : planche sur tréteaux abritée par une toile
 * tendue sur quatre perches. Toile éclairée sur l'arête haute, lèvre avant
 * ombrée, plis marqués - et son ombre jetée au sol vers le SE.
 */
function AuventToile({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {/* ombre de la toile au sol */}
      <path d="M-11,-3.4 L14,-3.4 L23,2.4 L-2,2.4 Z" fill={PAL.ombrePortee} opacity={0.14} filter="url(#a-flou2)" />
      {/* perches arrière */}
      {[-13, 13].map((px) => (
        <g key={px}>
          <rect x={px - 0.9} y={-27.4} width={1.8} height={22.4} fill={PAL.boisMi} />
          <rect x={px - 0.9} y={-27.4} width={0.7} height={22.4} fill="#a8845d" />
        </g>
      ))}
      <AOBase rx={14} ry={3.2} cy={0.8} />
      {/* tréteaux en X puis planche débordante */}
      {[-9, 9].map((px) => (
        <g key={px}>
          <path d={`M${px - 3.4},0 L${px + 2.6},-7.4`} stroke={PAL.boisMi} strokeWidth={1.5} />
          <path d={`M${px + 3.4},0 L${px - 2.6},-7.4`} stroke={PAL.boisOmbre} strokeWidth={1.5} />
        </g>
      ))}
      <rect x={-13} y={-9.5} width={26} height={2.2} fill="url(#a-bois-l)" />
      <rect x={-13} y={-9.5} width={26} height={0.7} fill="#d5b586" />
      <rect x={-13} y={-7.9} width={26} height={0.6} fill={PAL.boisOmbre} opacity={0.55} />
      {/* marchandises sur la planche */}
      <Etoffes x={-7.5} y={-9.5} />
      <Corbeille x={0.5} y={-9.4} s={0.85} fruits="#c9694f" />
      <Jarre x={8.5} y={-9.3} s={0.72} />
      {/* perches avant */}
      {[-15, 15].map((px) => (
        <g key={px}>
          <ellipse cx={px + 1.1} cy={3.5} rx={2.2} ry={0.9} fill={PAL.ombrePortee} opacity={0.14} />
          <rect x={px - 1} y={-22} width={2} height={25.5} fill={PAL.boisMi} />
          <rect x={px - 1} y={-22} width={0.8} height={25.5} fill="#a8845d" />
        </g>
      ))}
      {/* toile : nappe, arête haute éclairée, lèvre avant retombante et ombrée */}
      <path d="M-14,-27.8 L14,-27.8 L16.6,-22 Q0,-19.3 -16.6,-22 Z" fill="#ded0ac" />
      <path d="M-14,-27.8 L14,-27.8 L14.7,-26 L-14.7,-26 Z" fill="#f2e8cd" />
      <path d="M-16.6,-22 Q0,-19.3 16.6,-22 L15.6,-24.3 Q0,-21.7 -15.6,-24.3 Z" fill={PAL.ombrePortee} opacity={0.13} />
      <path
        d="M-14,-27.8 L-10.6,-21.1 M-7,-27.8 L-5,-20.2 M0,-27.8 L0,-19.9 M7,-27.8 L5,-20.2 M14,-27.8 L10.6,-21.1"
        stroke="#c4ab80"
        strokeWidth={0.55}
        fill="none"
        opacity={0.55}
      />
      {/* liens de corde aux perches */}
      <path d="M-15,-21.8 l-1.5,-0.6 M15,-21.8 l1.5,-0.6 M-13,-27.4 l-1,-0.6 M13,-27.4 l1,-0.6" stroke="#a8946c" strokeWidth={0.6} fill="none" />
    </g>
  )
}

/** natte tressée au sol, étoffes pliées et paniers : l'étalage à même la place */
function NatteEtoffes({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-11,-4 L9,-4 L12,3 L-8,3 Z" fill="#b89e6b" />
      <path d="M-11,-4 L9,-4 L9.4,-3 L-10.6,-3 Z" fill="#cfb684" />
      <path d="M-10.1,-1.8 L10.1,-1.8 M-9.4,0.2 L10.8,0.2 M-8.7,2 L11.5,2" stroke="#8e7346" strokeWidth={0.7} opacity={0.6} />
      <path d="M-6,-4 L-3,3 M-1,-4 L2,3 M4,-4 L7,3" stroke="#a38a58" strokeWidth={0.6} opacity={0.5} />
      <Etoffes x={-7} y={-1.6} />
      <Corbeille x={5} y={1.6} s={0.78} fruits="#c9694f" />
    </g>
  )
}

/** banc de village : planche posée sur deux pierres */
function BancBois({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={1.6} cy={0.8} rx={7.6} ry={1.6} fill={PAL.ombrePortee} opacity={0.13} />
      {[-5.5, 3].map((px) => (
        <g key={px}>
          <rect x={px} y={-2.5} width={2.7} height={2.5} fill={PAL.pierreMi} />
          <rect x={px} y={-2.5} width={2.7} height={0.75} fill={PAL.pierreLit} />
          <rect x={px + 1.9} y={-2.5} width={0.8} height={2.5} fill={PAL.pierreOmbre} opacity={0.6} />
        </g>
      ))}
      <rect x={-7} y={-4.4} width={14} height={2.1} fill="url(#a-bois-l)" />
      <rect x={-7} y={-4.4} width={14} height={0.65} fill="#d5b586" />
      <rect x={-7} y={-2.7} width={14} height={0.5} fill={PAL.boisOmbre} opacity={0.6} />
    </g>
  )
}

/** chien couché sur la pierre tiède */
function ChienCouche({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={1.5} cy={0.5} rx={6.4} ry={1.6} fill={PAL.ombrePortee} opacity={0.16} />
      {/* corps couché : dos éclairé, ventre dans l'ombre, croupe ombrée */}
      <ellipse cx={0} cy={-2} rx={5.4} ry={2.2} fill="#8f6a41" />
      <ellipse cx={-1.1} cy={-2.9} rx={4.1} ry={1.3} fill="#bd9159" />
      <path d="M2.8,-3.8 A5.4,2.2 0 0 1 4.7,-0.8 L2.4,-1.2 Z" fill="#68492b" />
      {/* pattes repliées devant */}
      <path d="M-3.6,-0.9 q3.4,-0.5 6,0.1" stroke="#a67e4d" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      {/* tête tournée vers le marché */}
      <ellipse cx={5.8} cy={-4.2} rx={2.3} ry={1.9} fill="#a87d4c" />
      <ellipse cx={5.2} cy={-5.1} rx={1.5} ry={0.9} fill="#c99a60" />
      <path d="M4.3,-5.3 q-1.7,-1.6 0.2,-2.4 q1.3,0.8 1.1,2.4 Z" fill="#5f4327" />
      <path d="M7.2,-3.9 q1.7,0.2 1.9,1 q-1.2,0.8 -2.4,0.3 Z" fill="#8f6a41" />
      <circle cx={6.9} cy={-4.6} r={0.4} fill="#2e2213" />
      <circle cx={8.7} cy={-3.2} r={0.42} fill="#2e2213" />
      {/* queue enroulée */}
      <path d="M-5,-2.8 q-2.7,-1.2 -2.1,-3.3" stroke="#8f6a41" strokeWidth={1.3} fill="none" strokeLinecap="round" />
    </g>
  )
}

/** cageot de poissons : dos bleutés, ventres clairs, ouïes sombres */
function Poissons({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y})${s !== 1 ? ` scale(${s})` : ''}`}>
      <path d="M-6,0 L-5.4,-2.6 L5.4,-2.6 L6,0 Z" fill="#a3814f" />
      <path d="M-5.4,-2.6 L5.4,-2.6 L5.2,-1.9 L-5.2,-1.9 Z" fill="#c9a76f" />
      {[
        [-3.2, -3.1, 0],
        [0.4, -3.6, 1],
        [3.5, -3, 0],
      ].map(([px, py, k], i) => (
        <g key={i}>
          <ellipse cx={px as number} cy={py as number} rx={3} ry={1.1} fill={k ? '#8ba0ab' : '#9fb2b8'} />
          <ellipse cx={(px as number) - 0.5} cy={(py as number) - 0.35} rx={2.1} ry={0.5} fill="#d3dee1" opacity={0.85} />
          <path d={`M${(px as number) + 2.7},${py as number} l1.7,-1.1 l0,2.2 Z`} fill="#78909b" />
          <circle cx={(px as number) - 2.2} cy={(py as number) - 0.2} r={0.34} fill="#3d4a50" />
        </g>
      ))}
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
  biens?: 'tissus' | 'poterie' | 'fruits' | 'poissons'
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
      {biens === 'poissons' && (
        <>
          <Poissons x={-3.5} y={-8.5} />
          <Corbeille x={5.5} y={-8.4} s={0.78} fruits="#8a9c6c" />
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

/**
 * poteau de bois équarri de la stoa rustique : sabot de pierre, fût à trois
 * valeurs (arête ouest vive, flanc est ombré), sommier et aisseliers - c'est
 * la charpenterie qui doit se lire, pas une simple barre.
 */
function Poteau({ x, h }: { x: number; h: number }) {
  return (
    <g>
      {/* sabot de pierre qui isole le bois du sol */}
      <rect x={x - 3.4} y={-2.5} width={6.8} height={2.5} fill={PAL.pierreMi} />
      <rect x={x - 3.4} y={-2.5} width={6.8} height={0.8} fill={PAL.pierreLit} />
      <rect x={x + 2.2} y={-2.5} width={1.2} height={2.5} fill={PAL.pierreOmbre} opacity={0.7} />
      {/* fût */}
      <rect x={x - 2.6} y={-h - 0.4} width={5.2} height={h - 2} fill="#a8814f" />
      <rect x={x - 2.6} y={-h - 0.4} width={1.4} height={h - 2} fill="#d0a86f" />
      <rect x={x + 1.1} y={-h - 0.4} width={1.5} height={h - 2} fill="#6d5132" />
      <line x1={x - 0.5} y1={-h + 1} x2={x - 0.5} y2={-3.4} stroke="#8a6840" strokeWidth={0.55} opacity={0.7} />
      {/* aisseliers vers la poutre : gauche éclairé, droit ombré */}
      <path d={`M${x - 2.5},${-h + 5.2} L${x - 6.6},${-h - 0.4} L${x - 4.9},${-h - 0.4} L${x - 2.5},${-h + 3.2} Z`} fill="#9b7845" />
      <path d={`M${x + 2.5},${-h + 5.2} L${x + 6.6},${-h - 0.4} L${x + 4.9},${-h - 0.4} L${x + 2.5},${-h + 3.2} Z`} fill="#6d5132" />
      {/* sommier posé en tête */}
      <rect x={x - 4.1} y={-h - 2.5} width={8.2} height={2.2} fill="#96733f" />
      <rect x={x - 4.1} y={-h - 2.5} width={8.2} height={0.7} fill="#c49b62" />
      <rect x={x + 2.6} y={-h - 2.5} width={1.5} height={2.2} fill={PAL.boisOmbre} opacity={0.55} />
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
  const rnd = alea(37)
  const nCols = Math.max(4, Math.round(w / (bois ? 9.5 : 12)))
  const pas = (w - 8) / (nCols - 1)
  const cols = Array.from({ length: nCols }, (_, i) => -w / 2 + 4 + i * pas)
  const podH = bois ? 3.4 : 4.8
  const mur = bois ? '#a5834f' : marbre ? '#b8ad94' : '#a99d82'
  const yCap = -h - 2 // bas de l'architrave
  const yT = bois ? -h - 6.4 : yCap - 8.4 // ligne d'égout du toit
  const g = bois ? 8.6 : 7
  const kf = bois ? 13 : 15
  const oh = bois ? 5.5 : 4.5
  const nPl = Math.max(6, Math.round((w - 3) / 5)) // madriers du mur de fond
  const larPl = (w - 3) / nPl
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
        <linearGradient id="ag-chaume-f" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e3c98c" />
          <stop offset="45%" stopColor="#c9a86a" />
          <stop offset="100%" stopColor="#a3843f" />
        </linearGradient>
      </defs>
      <AOBase rx={w * 0.6} ry={w * 0.14} cy={2} />
      <OmbreVolume w={w + 6} h={h + podH + 10} y={1.5} o={0.16} />

      {/* podium : une assise de dalles inégales sous le bois, deux degrés en pierre */}
      {bois ? (
        <g>
          <path d={`M${(w + 8) / 2},0 L${(w + 8) / 2 + 3.8},-1.7 L${(w + 8) / 2 + 3.8},${-podH - 1.7} L${(w + 8) / 2},${-podH} Z`} fill="url(#a-pierre-o)" />
          <rect x={-(w + 8) / 2} y={-podH} width={w + 8} height={podH} fill="#c2b9a0" />
          <rect x={-(w + 8) / 2} y={-podH} width={w + 8} height={0.95} fill="#e8e1cd" />
          {Array.from({ length: 8 }, (_, i) => {
            const px = -(w + 8) / 2 + ((i + 1) * (w + 8)) / 9 + (rnd() - 0.5) * 3.4
            return <rect key={i} x={px} y={-podH + 0.95} width={0.8} height={podH - 0.95} fill={PAL.pierreJoint} opacity={0.35} />
          })}
          <rect x={-(w + 8) / 2} y={-1} width={w + 8} height={1} fill={PAL.ombrePortee} opacity={0.16} />
        </g>
      ) : (
        Array.from({ length: 2 }, (_, i) => {
          const mw = w + 8 - i * 5
          const yb = -i * 2.4
          return (
            <g key={i}>
              <path d={`M${mw / 2},${yb} L${mw / 2 + 3.8},${yb - 1.7} L${mw / 2 + 3.8},${yb - 4.1} L${mw / 2},${yb - 2.4} Z`} fill="url(#a-pierre-o)" />
              <rect x={-mw / 2} y={yb - 2.4} width={mw} height={2.4} fill={i % 2 ? '#d8d0bb' : '#cfc7b2'} />
              <rect x={-mw / 2} y={yb - 2.4} width={mw} height={0.75} fill="#efe9d8" />
            </g>
          )
        })
      )}

      <g transform={`translate(0,${-podH})`}>
        {/* mur de fond dans la pénombre */}
        <rect x={-w / 2 + 1.5} y={-h - 2} width={w - 3} height={h + 2} fill={mur} />
        {/* madriers verticaux du mur de la stoa rustique : arête claire à l'ouest de chaque planche */}
        {bois &&
          Array.from({ length: nPl }, (_, i) => {
            const px = -w / 2 + 1.5 + i * larPl
            return (
              <Fragment key={i}>
                <rect x={px} y={-h - 2} width={larPl - 0.5} height={h + 2} fill={['#a8854f', '#9a7845', '#b28f58', '#8f6f40'][Math.floor(rnd() * 4)]} />
                <rect x={px} y={-h - 2} width={0.6} height={h + 2} fill="#c8a672" opacity={0.5} />
                <rect x={px + larPl - 1.1} y={-h - 2} width={0.6} height={h + 2} fill={PAL.ombrePortee} opacity={0.3} />
              </Fragment>
            )
          })}
        {/* lisse horizontale qui chaîne les madriers */}
        {bois && <rect x={-w / 2 + 1.5} y={-h * 0.6} width={w - 3} height={1.7} fill="#8a6f4a" opacity={0.55} />}
        {bois && <rect x={-w / 2 + 1.5} y={-h * 0.6} width={w - 3} height={0.5} fill="#c8a672" opacity={0.4} />}
        <rect x={-w / 2 + 1.5} y={-h - 2} width={w - 3} height={h + 2} fill="url(#a-ao)" opacity={bois ? 0.5 : 0.75} />
        {/* voile de pénombre uniforme sous le portique de bois */}
        {bois && <rect x={-w / 2 + 1.5} y={-h - 2} width={w - 3} height={h + 2} fill={PAL.ombrePortee} opacity={0.28} />}
        {/* ombre du toit en haut du mur - franche sous le débord de la charpente */}
        <rect x={-w / 2 + 1.5} y={-h - 2} width={w - 3} height={bois ? 4.8 : 2.8} fill={PAL.ombrePortee} opacity={bois ? 0.3 : 0.2} filter="url(#a-flou1)" />
        {/* portes des boutiques du fond */}
        {portes.map((px) => (
          <g key={px}>
            {bois && <rect x={px - 4.2} y={-h * 0.74 - 1.6} width={8.4} height={1.8} fill="#8a6a43" />}
            {bois && <rect x={px - 4.2} y={-h * 0.74 - 1.6} width={8.4} height={0.6} fill="#b8935f" />}
            <rect x={px - 3.2} y={-h * 0.74} width={6.4} height={h * 0.74} fill="#3a2b18" />
            <rect x={px - 3.2} y={-h * 0.74} width={6.4} height={1} fill="#241a08" />
            {bois && <rect x={px - 3.2} y={-h * 0.74} width={0.9} height={h * 0.74} fill="#5f462d" opacity={0.8} />}
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
            {/* poutre faîtière : dessus éclairé, face en demi-teinte, sous-face ombrée */}
            <rect x={-w / 2 - 3.2} y={yT} width={w + 6.4} height={3.8} fill="url(#a-bois-l)" />
            <rect x={-w / 2 - 3.2} y={yT} width={w + 6.4} height={0.9} fill="#d5b586" />
            <rect x={-w / 2 - 3.2} y={yT + 3.1} width={w + 6.4} height={0.7} fill={PAL.boisOmbre} opacity={0.7} />
            {/* assemblages chevillés au-dessus de chaque poteau */}
            {cols.map((x) => (
              <circle key={`ch${x}`} cx={x} cy={yT + 1.9} r={0.65} fill="#6d5132" opacity={0.75} />
            ))}
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

        {/* toit de chaume de la stoa rustique : pan avant, croupes distinctes, faîtage roulé */}
        {bois && (
          <g>
            <path d={`M${-w / 2 - oh},${yT} L${w / 2 + oh},${yT} L${w / 2 - kf},${yT - g} L${-w / 2 + kf},${yT - g} Z`} fill="url(#ag-chaume-f)" />
            {/* peignage du chaume, dans le sens de la pente */}
            {Array.from({ length: 14 }, (_, i) => {
              const t = (i + 0.5) / 14
              return (
                <line
                  key={i}
                  x1={-w / 2 - oh + (w + 2 * oh) * t}
                  y1={yT}
                  x2={-w / 2 + kf + (w - 2 * kf) * t}
                  y2={yT - g}
                  stroke="#9c7f45"
                  strokeWidth={0.5}
                  opacity={0.26}
                />
              )
            })}
            {/* liens de paille */}
            {[0.34, 0.68].map((t) => (
              <line
                key={t}
                x1={-w / 2 - oh + (oh + kf) * t}
                y1={yT - g * t}
                x2={w / 2 + oh - (oh + kf) * t}
                y2={yT - g * t}
                stroke="#8a6f3a"
                strokeWidth={0.85}
                opacity={0.3}
              />
            ))}
            {/* croupes : retour gauche au soleil, retour droit dans l'ombre */}
            <path d={`M${-w / 2 - oh},${yT} L${-w / 2 + kf},${yT - g} L${-w / 2 + kf - 3.4},${yT - g + 0.5} L${-w / 2 - oh + 2.6},${yT + 0.5} Z`} fill="#f0dba7" opacity={0.85} />
            <path d={`M${w / 2 + oh},${yT} L${w / 2 - kf},${yT - g} L${w / 2 - kf + 3.4},${yT - g + 0.5} L${w / 2 + oh - 2.6},${yT + 0.5} Z`} fill={PAL.ombrePortee} opacity={0.2} />
            {/* faîtage : rouleau de chaume clair posé à cheval */}
            <path d={`M${-w / 2 + kf - 2},${yT - g + 0.8} Q0,${yT - g - 3.4} ${w / 2 - kf + 2},${yT - g + 0.8} Q0,${yT - g + 1.6} ${-w / 2 + kf - 2},${yT - g + 0.8} Z`} fill="#eeda9f" />
            <path d={`M${-w / 2 + kf - 2},${yT - g + 0.9} Q0,${yT - g + 1.7} ${w / 2 - kf + 2},${yT - g + 0.9}`} stroke="#a5854a" strokeWidth={0.9} fill="none" opacity={0.65} />
            {/* égout ébouriffé, débordant sur la poutre */}
            <path
              d={`M${-w / 2 - oh},${yT - 0.2} ${Array.from({ length: Math.round((w + 2 * oh) / 4) }, () => 'q2,2.7 4,0').join(' ')} L${w / 2 + oh},${yT - 1} Z`}
              fill="#b8964f"
            />
            <line x1={-w / 2 - oh} y1={yT - 0.6} x2={w / 2 + oh} y2={yT - 0.6} stroke="#f2dfae" strokeWidth={1} opacity={0.7} />
          </g>
        )}
        {/* toit en croupe de tuiles : pan frontal demi-teinte, rangées de tuiles */}
        {!bois && <path d={`M${-w / 2 - oh},${yT} L${w / 2 + oh},${yT} L${w / 2 - kf},${yT - g} L${-w / 2 + kf},${yT - g} Z`} fill="url(#ag-toit-f)" />}
        {!bois &&
          [0.35, 0.68].map((t) => {
          const xa = -w / 2 - oh + (oh + kf) * t
          const xb = w / 2 + oh - (oh + kf) * t
          return <line key={t} x1={xa} y1={yT - g * t} x2={xb} y2={yT - g * t} stroke={PAL.toitOmbre} strokeWidth={0.9} opacity={0.45} strokeDasharray="3.4 1.2" />
        })}
        {/* faîtage clair + arêtiers (gauche éclairé, droit ombré) */}
        {!bois && (
          <g>
            <line x1={-w / 2 + kf} y1={yT - g} x2={w / 2 - kf} y2={yT - g} stroke={PAL.toitArete} strokeWidth={1.6} />
            <line x1={-w / 2 - oh} y1={yT} x2={-w / 2 + kf} y2={yT - g} stroke={PAL.toitArete} strokeWidth={1.2} opacity={0.9} />
            <line x1={w / 2 + oh} y1={yT} x2={w / 2 - kf} y2={yT - g} stroke={PAL.toitOmbre} strokeWidth={1.1} opacity={0.85} />
            <line x1={-w / 2 - oh} y1={yT + 0.3} x2={w / 2 + oh} y2={yT + 0.3} stroke="#8e4a2e" strokeWidth={0.7} opacity={0.55} />
          </g>
        )}
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
        {/* ── la place de terre battue : plaques d'usure, cailloux, ornières ── */}
        <ellipse cx={3} cy={2} rx={46} ry={15} fill={PAL.ombrePortee} opacity={0.09} filter="url(#a-flou2)" />
        <ellipse cx={0} cy={0} rx={46} ry={15} fill="#ab8e55" />
        <TerreBattue rx={46} ry={15} />
        <Ornieres />
        <BordurePierres rx={45} ry={14.4} />
        {/* ── fond de place : olivier du village, linge qui sèche ── */}
        <OlivierMini x={-8} y={-12} s={0.85} />
        <LingeSeche x={24} y={-6} />
        {/* ── l'étal rudimentaire sous sa toile, à l'ouest ── */}
        <AuventToile x={-27} y={2} />
        {/* ── le foyer commun : l'âme du lieu ── */}
        <Foyer n={1} />
        <Buches x={-13} y={6.5} />
        {/* ── le coin de la marchande (Ouvriers.tsx la pose en 18,4) ── */}
        <NatteEtoffes x={17} y={7} />
        <Jarre x={23} y={9.5} s={0.95} />
        <Jarre x={26.5} y={11.5} sombre s={0.75} />
        {/* ── la vie de la place : bête au piquet, banc, paniers, colombes ── */}
        <PiquetBete x={-36} y={7} />
        <CaisseArt x={-30} y={11} s={0.85} />
        <BancBois x={-3} y={12.5} />
        <Colombe x={7} y={12} />
        <Colombe x={11} y={13.4} flip />
        <CaisseArt x={31} y={10.5} s={0.8} />
        <Corbeille x={34.5} y={8} s={0.8} fruits="#8a9c6c" />
        <Buisson x={-47} y={9} s={0.85} />
        <Buisson x={45} y={7.5} s={0.7} />
      </g>
    )
  }

  const marbre = n >= 4
  const rx = marbre ? 54 : 48
  const ry = marbre ? 17.5 : 16
  const stoaW = n === 2 ? 54 : n === 3 ? 66 : 82
  const stoaH = n === 2 ? 11.5 : n === 3 ? 13 : 15
  // faîtage du chaume de la stoa de bois, pour y percher les colombes
  const faiteBois = -14 - 3.4 - stoaH - 6.4 - 8.6

  return (
    <g>
      {/* place dallée : fond joint, dalles suggérées, pierres de bordure */}
      <ellipse cx={3} cy={1.5} rx={rx} ry={ry} fill={PAL.ombrePortee} opacity={0.09} filter="url(#a-flou2)" />
      <ellipse cx={0} cy={0} rx={rx} ry={ry} fill={marbre ? '#c6bca1' : '#9d9075'} />
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

      {/* colombes sur le faîtage de chaume */}
      {n === 2 && (
        <g>
          <Colombe x={-13} y={faiteBois} />
          <Colombe x={16} y={faiteBois + 0.6} flip />
        </g>
      )}
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
      {n === 2 && <EtalArt x={12} y={17} c="#4a6f88" biens="poissons" s={0.82} />}
      {n >= 3 && <EtalArt x={14} y={15} c="#7c6a9c" biens="fruits" s={0.85} />}

      {/* fret du marché et chien qui somnole : le niveau 2 doit vivre lui aussi */}
      {n === 2 && (
        <g>
          <CaisseArt x={-35} y={11.5} s={0.9} />
          <CaisseArt x={-31} y={8} s={0.72} />
          <Corbeille x={-39} y={9.5} s={0.85} fruits="#8a9c6c" />
          <Jarre x={35} y={9.5} s={0.95} />
          <Jarre x={31} y={12.5} sombre s={0.8} />
          <ChienCouche x={-16} y={16} />
        </g>
      )}

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
