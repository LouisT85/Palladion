import { AOBase, Colonne3D, MurPierre, OmbreVolume, PAL, alea } from '../art'
import { Amphore, Buisson, Feu, Fumee, OlivierMini } from './primitives'

/*
 * TEMPLE — bâtiment de RÉFÉRENCE de la bible visuelle (docs/STYLE-ART.md).
 * Peint réaliste : lumière NW, ombres portées SE, zéro contour noir.
 *  1. autel sous le vieux chêne     2. naïskos à fronton peint
 *  3. temple périptère de pierre    4. grand temple de marbre et d'or
 */

/** chêne sacré : couronne étagée du sombre au clair, tronc évasé à la base */
function ChêneSacre({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={7} cy={2} rx={18} ry={4.8} fill={PAL.ombrePortee} opacity={0.17} filter="url(#a-flou2)" />
      {/* tronc évasé, flanc droit dans l'ombre */}
      <path d="M-3.4,0 C-3,-5 -2.6,-10 -1.6,-15 L1.6,-15 C2.6,-10 3,-5 3.4,0 Q0,1.6 -3.4,0 Z" fill="#6e5233" />
      <path d="M1.2,-1 C1.8,-6 2,-10 1.4,-14.4 L1.6,-15 C2.6,-10 3,-5 3.4,0 Q1.8,0.8 1.2,-1 Z" fill="#4f3a22" />
      <path d="M-2.4,-2 C-2.6,-7 -2.2,-11 -1.4,-14.4" stroke="#a07c50" strokeWidth={0.9} fill="none" opacity={0.9} />
      {/* couronne : ombre propre basse → demi-teinte → masses éclairées NW */}
      <ellipse cx={4} cy={-16} rx={14.5} ry={8.5} fill="#465d3a" />
      <ellipse cx={-4} cy={-17.5} rx={13.5} ry={8.5} fill="#546f45" />
      <ellipse cx={2} cy={-21} rx={12} ry={7} fill="#657f50" />
      <ellipse cx={-5} cy={-22.5} rx={9} ry={5.6} fill="#79955f" />
      <ellipse cx={-8.5} cy={-24.5} rx={5.5} ry={3.4} fill="#8fac72" />
      <ellipse cx={1} cy={-24.5} rx={4.5} ry={2.8} fill="#87a469" opacity={0.9} />
      {/* bandelettes votives suspendues aux branches basses */}
      <path d="M-9,-12.5 l0,4.6 M-1,-11 l0,5.2 M7,-12 l0,4.6" stroke="#e8e2d2" strokeWidth={1.2} />
      <path d="M-9,-7.9 l0,1.6 M-1,-5.8 l0,1.6 M7,-7.4 l0,1.6" stroke="#c0563f" strokeWidth={1.2} />
    </g>
  )
}

/** autel de pierre : bloc appareillé, corniche claire, dessus taché de cendre */
function Autel({ x = 0, y = 0, larg = 16 }: { x?: number; y?: number; larg?: number }) {
  const w = larg
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={w * 0.75} ry={w * 0.22} />
      <OmbreVolume w={w} h={11} o={0.15} />
      {/* corps appareillé + retour est ombré */}
      <path d={`M${w / 2},0 L${w / 2 + 4},-1.8 L${w / 2 + 4},-9.8 L${w / 2},-8 Z`} fill="url(#a-pierre-o)" />
      <MurPierre x={-w / 2} y={-8} w={w} h={8} seed={7} />
      {/* corniche débordante, dessus clair, ombre sous le débord */}
      <rect x={-w / 2 - 1.6} y={-10.4} width={w + 3.2} height={2.6} fill={PAL.pierreLit} />
      <rect x={-w / 2 - 1.6} y={-8} width={w + 3.2} height={0.9} fill={PAL.ombrePortee} opacity={0.25} />
      <ellipse cx={0} cy={-10.2} rx={w / 2 - 1.5} ry={1.6} fill="#8a8170" />
      <ellipse cx={0} cy={-10.4} rx={w / 2 - 2.6} ry={1.1} fill="#3d3428" />
    </g>
  )
}

/** stèle votive */
function Stele({ x, y, h = 12, s = 1 }: { x: number; y: number; h?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2} cy={1} rx={4.5} ry={1.4} fill={PAL.ombrePortee} opacity={0.15} />
      <path d={`M-2.6,0 L-2.6,${-h} Q0,${-h - 2.6} 2.6,${-h} L2.6,0 Z`} fill="url(#a-pierre-l)" />
      <path d={`M2.6,0 L2.6,${-h}`} stroke={PAL.pierreOmbre} strokeWidth={1} opacity={0.7} />
      <path d={`M-1.2,${-h + 3} h2.4 M-1.2,${-h + 5} h2.4`} stroke={PAL.pierreOmbre} strokeWidth={0.6} opacity={0.8} />
    </g>
  )
}

/** crépidoma : degrés du temple, face avant en demi-teinte, dessus éclairé */
function Degres({ w, marches = 3 }: { w: number; marches?: number }) {
  const rangs = []
  for (let i = 0; i < marches; i++) {
    const mw = w + i * 7
    const y = -(marches - i - 1) * 2.6
    rangs.push(
      <g key={i}>
        <path d={`M${mw / 2},${y} L${mw / 2 + 4.5},${y - 2} L${mw / 2 + 4.5},${y - 4.4} L${mw / 2},${y - 2.6} Z`} fill="url(#a-pierre-o)" />
        <rect x={-mw / 2} y={y - 2.6} width={mw} height={2.6} fill={i % 2 ? '#cfc7b2' : '#d8d0bb'} />
        <rect x={-mw / 2} y={y - 2.6} width={mw} height={0.8} fill="#efe9d8" />
      </g>,
    )
  }
  return <g>{rangs}</g>
}

/**
 * corps du temple : colonnade sur podium, cella dans la pénombre derrière,
 * entablement à triglyphes, fronton sculpté, toit à double pan.
 */
function CorpsTemple({
  w,
  hCol,
  nCols,
  marbre,
  or,
}: {
  w: number
  hCol: number
  nCols: number
  marbre?: boolean
  or?: boolean
}) {
  const rnd = alea(nCols * 17)
  const pas = (w - 10) / (nCols - 1)
  const cols = Array.from({ length: nCols }, (_, i) => -w / 2 + 5 + i * pas)
  const prof = w * 0.16
  const gToit = w * 0.15
  const yEnt = -hCol - 2 // bas de l'architrave
  const cella = marbre ? '#b8ad94' : '#a99d82'

  return (
    <g>
      {/* cella dans la pénombre, derrière la colonnade */}
      <rect x={-w / 2 + 3} y={yEnt} width={w - 6} height={hCol + 2} fill={cella} />
      <rect x={-w / 2 + 3} y={yEnt} width={w - 6} height={hCol + 2} fill="url(#a-ao)" opacity={0.9} />
      {/* porte de la cella, entre les deux colonnes centrales */}
      <rect x={-4.6} y={-hCol + 2.5} width={9.2} height={hCol - 2.5} fill="#241a10" />
      <rect x={-4.6} y={-hCol + 2.5} width={9.2} height={1.4} fill="#0f0a06" />
      {or && <rect x={-3.4} y={-hCol + 4.5} width={6.8} height={hCol - 5} fill="#8a6b2e" />}
      {or && <circle cx={0} cy={-hCol * 0.45} r={2.2} fill={PAL.or} opacity={0.9} />}

      {/* ombres des colonnes projetées sur le sol du portique */}
      {cols.map((x) => (
        <path key={`o${x}`} d={`M${x - 2},-0.5 L${x + 2.6},-0.5 L${x + 7},2.2 L${x + 2},2.2 Z`} fill={PAL.ombrePortee} opacity={0.13} filter="url(#a-flou1)" />
      ))}
      {/* colonnade */}
      {cols.map((x) => (
        <Colonne3D key={x} x={x} h={hCol} larg={marbre ? 5.4 : 5} />
      ))}

      {/* entablement : architrave + frise à triglyphes + corniche */}
      <rect x={-w / 2 - 2} y={yEnt - 3.4} width={w + 4} height={3.6} fill={marbre ? 'url(#a-marbre-l)' : 'url(#a-pierre-l)'} />
      <rect x={-w / 2 - 2} y={yEnt - 7} width={w + 4} height={3.6} fill={marbre ? '#e9e2cf' : '#d3cab5'} />
      {cols.map((x, i) =>
        i === cols.length - 1 ? null : (
          <g key={`t${i}`}>
            <rect x={x + pas / 2 - 1.7} y={yEnt - 6.6} width={3.4} height={2.9} fill={marbre ? '#b8ad94' : '#a89d82'} />
            <path d={`M${x + pas / 2 - 0.9},${yEnt - 6.4} v2.4 M${x + pas / 2 + 0.5},${yEnt - 6.4} v2.4`} stroke={marbre ? '#8f8368' : '#847860'} strokeWidth={0.7} />
          </g>
        ),
      )}
      {/* corniche débordante + son ombre */}
      <rect x={-w / 2 - 3.4} y={yEnt - 9.4} width={w + 6.8} height={2.6} fill={marbre ? '#f4efe0' : '#e2dac6'} />
      <rect x={-w / 2 - 2} y={yEnt - 7} width={w + 4} height={1} fill={PAL.ombrePortee} opacity={0.22} />

      {/* pans de toit derrière le fronton */}
      <path d={`M${-w / 2 - 3},${yEnt - 9.4} L0,${yEnt - 9.4 - gToit} L0,${yEnt - 9.4 - gToit - prof} L${-w / 2 - 3},${yEnt - 9.4 - prof} Z`} fill="url(#a-toit-l)" />
      <path d={`M${w / 2 + 3},${yEnt - 9.4} L0,${yEnt - 9.4 - gToit} L0,${yEnt - 9.4 - gToit - prof} L${w / 2 + 3},${yEnt - 9.4 - prof} Z`} fill="url(#a-toit-o)" />
      {[0.33, 0.66].map((t) => (
        <g key={t}>
          <line x1={-w / 2 - 3} y1={yEnt - 9.4 - prof * t} x2={0} y2={yEnt - 9.4 - gToit - prof * t} stroke={PAL.toitOmbre} strokeWidth={0.9} opacity={0.5} strokeDasharray="3.4 1.2" />
          <line x1={w / 2 + 3} y1={yEnt - 9.4 - prof * t} x2={0} y2={yEnt - 9.4 - gToit - prof * t} stroke="#5e3520" strokeWidth={0.9} opacity={0.4} strokeDasharray="3.4 1.2" />
        </g>
      ))}
      <line x1={0} y1={yEnt - 9.4 - gToit} x2={0} y2={yEnt - 9.4 - gToit - prof} stroke={PAL.toitArete} strokeWidth={1.6} />

      {/* fronton : rampants clairs, tympan en retrait avec figures */}
      <path d={`M${-w / 2 - 4},${yEnt - 9.4} L0,${yEnt - 9.4 - gToit} L${w / 2 + 4},${yEnt - 9.4} Z`} fill={marbre ? 'url(#a-marbre-l)' : 'url(#a-pierre-l)'} />
      <path d={`M${-w / 2 + 3},${yEnt - 10.6} L0,${yEnt - 10.2 - gToit * 0.82} L${w / 2 - 3},${yEnt - 10.6} Z`} fill={marbre ? '#cdc3aa' : '#b5aa8e'} />
      {/* figures du tympan, en silhouettes */}
      {Array.from({ length: Math.min(5, nCols - 1) }, (_, i) => {
        const t = (i + 1) / (Math.min(5, nCols - 1) + 1)
        const fx = -w / 2 + 6 + t * (w - 12)
        const fh = (gToit * 0.62) * (1 - Math.abs(t - 0.5) * 1.7) + 2
        return <path key={i} d={`M${fx - 1.8},${yEnt - 11} L${fx - 1.2},${yEnt - 11 - fh} Q${fx},${yEnt - 12.6 - fh} ${fx + 1.2},${yEnt - 11 - fh} L${fx + 1.8},${yEnt - 11} Z`} fill={or && rnd() > 0.5 ? '#c9a441' : '#6e6450'} />
      })}
      {/* rampants + acrotères */}
      <path d={`M${-w / 2 - 4},${yEnt - 9.4} L0,${yEnt - 9.4 - gToit}`} stroke={marbre ? '#fbf7ec' : '#efe9d8'} strokeWidth={1.5} />
      <path d={`M${w / 2 + 4},${yEnt - 9.4} L0,${yEnt - 9.4 - gToit}`} stroke={marbre ? '#d8d0bb' : '#c4bAA2'.replace('AA', 'aa')} strokeWidth={1.2} />
      <path d={`M-2.6,${yEnt - 9 - gToit} q2.6,-4.4 5.2,0 Z`} fill={or ? PAL.or : marbre ? '#f4efe0' : '#e2dac6'} />
      <path d={`M${-w / 2 - 6},${yEnt - 9.4} q2,-3.4 4,0 Z`} fill={or ? PAL.or : marbre ? '#f4efe0' : '#e2dac6'} />
      <path d={`M${w / 2 + 2},${yEnt - 9.4} q2,-3.4 4,0 Z`} fill={or ? PAL.or : marbre ? '#f4efe0' : '#e2dac6'} />
    </g>
  )
}

export function Temple({ n }: { n: number }) {
  if (n === 1) {
    return (
      <g>
        {/* clairière sacrée : terre battue usée en deux tons */}
        <ellipse cx={0} cy={2} rx={38} ry={12.5} fill="#b9a878" opacity={0.75} />
        <ellipse cx={-6} cy={1} rx={24} ry={8} fill="#c8b88a" opacity={0.85} />
        <ChêneSacre x={19} y={-1} s={1.5} />
        <Autel x={-10} y={0} larg={18} />
        <Feu x={-10} y={-13} r={2.8} />
        <Fumee x={-10} y={-16} />
        <Stele x={-30} y={-1} h={13} />
        <Stele x={-36} y={2} h={9} s={0.9} />
        <Amphore x={3} y={-1} s={0.85} />
        <Amphore x={7.5} y={1} c="#8c552f" s={0.75} />
        <Buisson x={-22} y={5} s={0.9} />
        <path d="M-16,6 q3,1.6 6,0 M4,7 q3,1.6 6,0" stroke="#8f8a55" strokeWidth={1} fill="none" opacity={0.6} />
      </g>
    )
  }

  const w = n === 2 ? 46 : n === 3 ? 64 : 80
  const hCol = n === 2 ? 15 : n === 3 ? 19 : 23
  const nCols = n === 2 ? 2 : n === 3 ? 4 : 6
  const marbre = n >= 4

  return (
    <g>
      {/* téménos : parvis dallé usé */}
      <ellipse cx={0} cy={4} rx={w / 2 + 26} ry={16} fill={marbre ? '#cdc3a4' : '#c2b389'} opacity={0.65} />
      <ellipse cx={2} cy={3} rx={w / 2 + 12} ry={11} fill={marbre ? '#ddd4b8' : '#cfc09a'} opacity={0.7} />
      <AOBase rx={w * 0.66} ry={w * 0.17} cy={3} />
      <OmbreVolume w={w + 10} h={hCol + 16} y={2} o={0.17} />

      <g transform="translate(0,-4)">
        <Degres w={w + 6} marches={n >= 3 ? 3 : 2} />
        <g transform={`translate(0,${-(n >= 3 ? 3 : 2) * 2.6 + 2.6 - 2.6})`}>
          <CorpsTemple w={w} hCol={hCol} nCols={nCols} marbre={marbre} or={n >= 4} />
        </g>
      </g>

      {/* autel des sacrifices devant le parvis */}
      <g transform="translate(0,9)">
        <Autel larg={n >= 3 ? 13 : 11} />
        {n >= 3 && <Feu x={0} y={-12} r={2.2} />}
        <Fumee x={0} y={-14} />
      </g>

      {n >= 3 && (
        <g>
          <Amphore x={-w / 2 - 15} y={4} />
          <Amphore x={-w / 2 - 10} y={6} c="#8c552f" s={0.85} />
          <OlivierMini x={w / 2 + 17} y={5} s={0.95} />
          <Stele x={-w / 2 - 20} y={0} h={11} />
        </g>
      )}
      {n >= 4 && (
        <g>
          {/* braseros de bronze aux angles du parvis */}
          {[-w / 2 - 6, w / 2 + 6].map((bx) => (
            <g key={bx} transform={`translate(${bx},10)`}>
              <ellipse cx={1.5} cy={1} rx={4} ry={1.3} fill={PAL.ombrePortee} opacity={0.16} />
              <path d="M-3,-6 L3,-6 L2,-2 L-2,-2 Z" fill="#8a6b2e" />
              <path d="M-3,-6 L3,-6 L2.6,-4.9 L-2.6,-4.9 Z" fill="#c9a441" />
              <line x1={0} y1={-2} x2={0} y2={0} stroke="#6e5525" strokeWidth={1.6} />
              <Feu x={0} y={-6.5} r={2} />
            </g>
          ))}
          <OlivierMini x={-w / 2 - 26} y={8} s={0.8} />
        </g>
      )}
    </g>
  )
}
