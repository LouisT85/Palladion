import { memo } from 'react'
import { MAP, TOUR_ANGLES } from '../../game/data'
import { AOBase, MurPierre, PAL, alea } from './art'

/** demi-ouverture de la porte, en radians (angle 0 = est) */
const PORTE = 0.1

export interface GeoMur {
  cx: number
  cy: number
  rx: number
  ry: number
}

function pt(geo: GeoMur, a: number): { x: number; y: number } {
  return { x: geo.cx + geo.rx * Math.cos(a), y: geo.cy + geo.ry * Math.sin(a) }
}

function chemin(geo: GeoMur, a0: number, a1: number, dy = 0, n = 46): string {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    const p = pt(geo, a)
    d += `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${(p.y + dy).toFixed(1)}`
  }
  return d
}

function echantillons(geo: GeoMur, a0: number, a1: number, pas: number): { x: number; y: number; a: number }[] {
  const pts: { x: number; y: number; a: number }[] = []
  for (let a = a0; a <= a1 + 1e-6; a += pas) pts.push({ ...pt(geo, a), a })
  return pts
}

/** ruban fermé entre deux hauteurs le long de l'arc - le corps du mur en volume */
function bande(geo: GeoMur, a0: number, a1: number, dyBas: number, dyHaut: number, n = 46): string {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    const p = pt(geo, a)
    d += `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${(p.y + dyBas).toFixed(1)}`
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n
    const p = pt(geo, a)
    d += `L${p.x.toFixed(1)},${(p.y + dyHaut).toFixed(1)}`
  }
  return d + 'Z'
}

/** dégradés du domaine (préfixe mur-) : lumière à l'OUEST, ombre à l'EST */
function DefsMur() {
  return (
    <defs>
      <linearGradient id="mur-face" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#d8cfb8" />
        <stop offset="42%" stopColor="#aca17f" />
        <stop offset="100%" stopColor="#6f6349" />
      </linearGradient>
      <linearGradient id="mur-face4" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#e6dfca" />
        <stop offset="42%" stopColor="#bcb094" />
        <stop offset="100%" stopColor="#7d7053" />
      </linearGradient>
      <linearGradient id="mur-dalle" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#e2dac6" />
        <stop offset="55%" stopColor="#c2b89f" />
        <stop offset="100%" stopColor="#8f8367" />
      </linearGradient>
      <linearGradient id="mur-sec" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#c9bda0" />
        <stop offset="45%" stopColor="#a2967a" />
        <stop offset="100%" stopColor="#6f6449" />
      </linearGradient>
      {/* bande claire du couronnement : forte à l'ouest, s'éteint vers l'est */}
      <linearGradient id="mur-lum" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#f7f1dd" stopOpacity="0.95" />
        <stop offset="55%" stopColor="#efe8d3" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#e6dfc9" stopOpacity="0.18" />
      </linearGradient>
      {/* pied du mur : l'ombre s'épaissit vers l'est */}
      <linearGradient id="mur-pied" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#241a08" stopOpacity="0.14" />
        <stop offset="55%" stopColor="#241a08" stopOpacity="0.26" />
        <stop offset="100%" stopColor="#241a08" stopOpacity="0.42" />
      </linearGradient>
      {/* pénombre d'embrasure : plus noire en haut, sol qui reçoit un peu de jour */}
      <linearGradient id="mur-antre" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#150e07" />
        <stop offset="72%" stopColor="#2a1f10" />
        <stop offset="100%" stopColor="#45351d" />
      </linearGradient>
    </defs>
  )
}

/** tons de pierre, du plus éclairé (ouest) au plus ombré (est) */
const TONS_SEC = ['#dbd2b9', '#c8bda1', '#b0a487', '#96896c', '#7a6e53']
const TONS_TAILLE = ['#ddd5c1', '#cdc3ac', '#b9ae95', '#9f937a', '#877b62']

/**
 * assises de pierre épousant l'arc, groupées en UN chemin par ton (perf).
 * Le ton de chaque bloc répond à la lumière NW - ouest clair, est sombre -
 * avec un tirage alea() pour la vibration peinte. Les joints sont les
 * respirations où le corps du mur affleure.
 */
function assisesArc(
  geo: GeoMur,
  a0: number,
  a1: number,
  pas: number,
  dyHaut: number,
  rangs: number,
  hAssise: number,
  nTons: number,
  seed: number,
): string[] {
  const rnd = alea(seed)
  const paths = Array.from({ length: nTons }, () => '')
  for (let r = 0; r < rangs; r++) {
    const off = r % 2 ? pas * 0.5 : 0
    for (let a = a0 + off; a + pas <= a1 + 1e-6; a += pas * (1 + rnd() * 0.25)) {
      if (rnd() < 0.13) continue
      const fin = Math.min(a + pas * (0.78 + rnd() * 0.2), a1)
      const p0 = pt(geo, a)
      const p1 = pt(geo, fin)
      const jit = (rnd() - 0.5) * 0.7
      const y0 = p0.y + dyHaut + r * hAssise + jit
      const y1 = p1.y + dyHaut + r * hAssise + jit
      const h = hAssise * (0.8 + rnd() * 0.16)
      const lit = (1 - Math.cos((a + fin) / 2)) / 2
      const k = Math.min(nTons - 1, Math.max(0, Math.round((1 - lit) * (nTons - 1) + (rnd() - 0.5) * 1.7)))
      paths[k] +=
        `M${p0.x.toFixed(1)},${y0.toFixed(1)}L${p1.x.toFixed(1)},${y1.toFixed(1)}` +
        `L${p1.x.toFixed(1)},${(y1 + h).toFixed(1)}L${p0.x.toFixed(1)},${(y0 + h).toFixed(1)}Z`
    }
  }
  return paths
}

/**
 * pieux taillés en pointe, regroupés en 3 chemins par valeur de bois
 * (+ arêtes éclairées à l'ouest, pointes fraîchement taillées claires)
 */
function pieuxPaths(
  pts: { x: number; y: number }[],
  dyBase: number,
  hBase: number,
  hVar: number,
  w: number,
  seed: number,
) {
  const rnd = alea(seed)
  const corps = ['', '', '']
  let arete = ''
  let pointe = ''
  for (const p of pts) {
    const h = hBase + rnd() * hVar
    const x0 = (p.x - w / 2).toFixed(1)
    const x1 = (p.x + w / 2).toFixed(1)
    const yB = (p.y + dyBase).toFixed(1)
    const yT = p.y + dyBase - h
    const yEp = (yT + 2.4).toFixed(1)
    const k = Math.floor(rnd() * 3)
    corps[k] += `M${x0},${yB}L${x0},${yEp}L${p.x.toFixed(1)},${yT.toFixed(1)}L${x1},${yEp}L${x1},${yB}Z`
    arete += `M${x0},${yB}L${x0},${yEp}L${(p.x - w / 2 + w * 0.34).toFixed(1)},${(yT + 1.3).toFixed(1)}L${(p.x - w / 2 + w * 0.34).toFixed(1)},${yB}Z`
    pointe += `M${(p.x - w / 2 + 0.4).toFixed(1)},${(yT + 2.2).toFixed(1)}L${p.x.toFixed(1)},${yT.toFixed(1)}L${(p.x + w / 2 - 0.4).toFixed(1)},${(yT + 2.2).toFixed(1)}L${p.x.toFixed(1)},${(yT + 1.3).toFixed(1)}Z`
  }
  return { corps, arete, pointe }
}

/** créneaux volumiques : face avant + dessus clair + flanc est ombré + ombre portée SE, en 4 chemins */
function creneauxPaths(pts: { x: number; y: number; a: number }[], hBase: number, hM: number, wM: number, seed: number) {
  const rnd = alea(seed)
  let face = ''
  let dessus = ''
  let flanc = ''
  let ombre = ''
  for (const p of pts) {
    const w = wM * (0.55 + 0.45 * Math.abs(Math.sin(p.a)))
    const h = hM + (rnd() - 0.5) * 1.1
    const x0 = (p.x - w / 2).toFixed(1)
    const x1 = (p.x + w / 2).toFixed(1)
    const x1p = (p.x + w / 2 + 0.8).toFixed(1)
    const yB = (p.y - hBase).toFixed(1)
    const yBp = (p.y - hBase - 1.5).toFixed(1)
    const yT = (p.y - hBase - h).toFixed(1)
    const yTp = (p.y - hBase - h - 1.5).toFixed(1)
    const x0p = (p.x - w / 2 + 0.8).toFixed(1)
    face += `M${x0},${yB}L${x0},${yT}L${x1},${yT}L${x1},${yB}Z`
    dessus += `M${x0},${yT}L${x0p},${yTp}L${x1p},${yTp}L${x1},${yT}Z`
    flanc += `M${x1},${yB}L${x1},${yT}L${x1p},${yTp}L${x1p},${yBp}Z`
    ombre += `M${x0},${yB}L${x1},${yB}L${(p.x + w / 2 + 2.4).toFixed(1)},${(p.y - hBase + 2).toFixed(1)}L${(p.x - w / 2 + 2.8).toFixed(1)},${(p.y - hBase + 2).toFixed(1)}Z`
  }
  return { face, dessus, flanc, ombre }
}

/** étendard planté sur le chemin de ronde (niveau 4) */
function Etendard({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={0.5} x2={0} y2={-16} stroke="#5d4a33" strokeWidth={1.4} />
      <line x1={-0.5} y1={0} x2={-0.5} y2={-15.6} stroke="#8a6b45" strokeWidth={0.5} opacity={0.8} />
      <circle cx={0} cy={-16.6} r={1.1} fill={PAL.or} />
      <path d="M0.7,-15.6 Q5.5,-17.4 10.5,-14.8 L8.8,-11.2 Q5,-13.4 0.7,-11.6 Z" fill={c} />
      <path d="M0.7,-15.6 Q5.5,-17.4 10.5,-14.8 L10,-13.7 Q5.4,-16.1 0.7,-14.3 Z" fill="#fbf3dd" opacity={0.28} />
    </g>
  )
}

/** tour de guet cylindrique : fût en dégradé, encorbellement, couronne crénelée */
function Tour({ x, y, flamme }: { x: number; y: number; flamme?: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={10} cy={4} rx={15} ry={4.8} fill={PAL.ombrePortee} opacity={0.17} filter="url(#a-flou1)" />
      <AOBase rx={12.5} ry={3.8} cy={2.5} />
      {/* fût légèrement évasé à la base */}
      <path d="M-10,-45 L-11.6,1 Q0,4.2 11.6,1 L10,-45 Z" fill="url(#a-cyl-pierre)" />
      {/* cerclages d'assises épousant le cylindre */}
      <path d="M-11,-12 Q0,-9.6 11,-12" stroke={PAL.pierreJoint} strokeWidth={0.7} fill="none" opacity={0.45} />
      <path d="M-10.4,-28 Q0,-25.8 10.4,-28" stroke={PAL.pierreJoint} strokeWidth={0.7} fill="none" opacity={0.45} />
      {/* meurtrière, arête ouest éclairée */}
      <rect x={-1} y={-35} width={2} height={7.5} rx={0.9} fill="#392e1d" />
      <line x1={-1.1} y1={-34.5} x2={-1.1} y2={-28} stroke="#efe8d6" strokeWidth={0.5} opacity={0.8} />
      {/* encorbellement du parapet + ombre portée sous le débord */}
      <path d="M-12.8,-49.5 L-12.8,-45.5 Q0,-42.4 12.8,-45.5 L12.8,-49.5 Z" fill="url(#a-cyl-pierre)" />
      <path d="M-12.4,-45.6 Q0,-42.6 12.4,-45.6" stroke={PAL.ombrePortee} strokeWidth={1.6} fill="none" opacity={0.28} />
      {/* merlons arrière dépassant derrière la plateforme */}
      {[-8.5, -1.5, 5.5].map((mx) => (
        <rect key={mx} x={mx} y={-57} width={4} height={5.5} fill="#a1977d" />
      ))}
      {/* plateforme : margelle claire, sol en demi-teinte */}
      <ellipse cx={0} cy={-51} rx={12.8} ry={3.4} fill="#e2dbc7" />
      <ellipse cx={0.6} cy={-50.6} rx={10.6} ry={2.6} fill="#c9bfa7" />
      {/* merlons avant, de l'ouest éclairé à l'est ombré */}
      {[
        { mx: -12.4, c: '#ddd5c1' },
        { mx: -6, c: '#d3cab5' },
        { mx: 1, c: '#c2b8a0' },
        { mx: 8, c: '#a89d83' },
      ].map((m) => (
        <g key={m.mx}>
          <rect x={m.mx} y={-54.6} width={4.4} height={7.3} fill={m.c} />
          <rect x={m.mx} y={-54.6} width={4.4} height={1.1} fill="#efe8d5" />
        </g>
      ))}
      {/* hampe, fanion et feu de guet */}
      <line x1={0} y1={-53} x2={0} y2={-71} stroke="#5d4a33" strokeWidth={2} />
      <path d="M0,-71 L14,-66 L0,-61 Z" fill="#b3543f" />
      <path d="M0,-71 L14,-66 L0,-68.8 Z" fill="#d0705a" opacity={0.9} />
      {flamme && (
        <>
          <path d="M-2.6,-52.6 L2.6,-52.6 L1.8,-49.8 L-1.8,-49.8 Z" fill="#8a6b2e" />
          <circle cx={0} cy={-55} r={3} fill="#f2b04a">
            <animate attributeName="r" values="3;4;3" dur="1.2s" repeatCount="indefinite" />
          </circle>
          <circle cx={0} cy={-55.6} r={1.4} fill="#fbe08d" />
        </>
      )}
    </g>
  )
}

/** tour d'archers constructible - fût cylindrique, plateforme crénelée, archer de faction */
function TourArcher({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={8.5} cy={3.4} rx={13} ry={4.2} fill={PAL.ombrePortee} opacity={0.17} filter="url(#a-flou1)" />
      <AOBase rx={10.5} ry={3.2} cy={2.2} />
      <path d="M-8.2,-40 L-9.6,1 Q0,3.8 9.6,1 L8.2,-40 Z" fill="url(#a-cyl-pierre)" />
      <path d="M-9,-11 Q0,-8.8 9,-11" stroke={PAL.pierreJoint} strokeWidth={0.6} fill="none" opacity={0.45} />
      <path d="M-8.6,-25 Q0,-23 8.6,-25" stroke={PAL.pierreJoint} strokeWidth={0.6} fill="none" opacity={0.45} />
      <circle cx={0} cy={-21.5} r={1.6} fill="#4a3a28" />
      {/* encorbellement + ombre sous le débord */}
      <path d="M-11,-44.5 L-11,-41 Q0,-38.2 11,-41 L11,-44.5 Z" fill="url(#a-cyl-pierre)" />
      <path d="M-10.6,-41.1 Q0,-38.4 10.6,-41.1" stroke={PAL.ombrePortee} strokeWidth={1.4} fill="none" opacity={0.26} />
      {/* merlons arrière */}
      {[-6.5, 0.8].map((mx) => (
        <rect key={mx} x={mx} y={-51.5} width={3.6} height={5} fill="#a1977d" />
      ))}
      {/* plateforme */}
      <ellipse cx={0} cy={-46} rx={11} ry={2.9} fill="#e2dbc7" />
      <ellipse cx={0.5} cy={-45.7} rx={9} ry={2.2} fill="#cbc1a9" />
      {/* merlons avant */}
      {[
        { mx: -10.7, c: '#ddd5c1' },
        { mx: -5, c: '#cfc5af' },
        { mx: 1, c: '#c0b59d' },
        { mx: 7, c: '#a89d83' },
      ].map((m) => (
        <g key={m.mx}>
          <rect x={m.mx} y={-49.2} width={3.7} height={6.2} fill={m.c} />
          <rect x={m.mx} y={-49.2} width={3.7} height={1} fill="#efe8d5" />
        </g>
      ))}
      {/* archer de faction */}
      <g transform="translate(0,-46)">
        <path d="M-2.2,0 L-1.5,-6 L1.5,-6 L2.2,0 Z" fill="#4a6a5a" />
        <circle cx={0} cy={-7.6} r={2.1} fill="#d9a97c" />
        <path d="M-2.1,-8 A2.1,2.1 0 0 1 2.1,-8" fill="#8f8a7c" />
        <path d="M3.2,-8.5 Q6.5,-4.5 3.2,-0.5" stroke="#7a5a35" strokeWidth={1.1} fill="none" />
        <line x1={3.2} y1={-8.5} x2={3.2} y2={-0.5} stroke="#e0d9c8" strokeWidth={0.5} />
      </g>
      <line x1={-9} y1={-49} x2={-9} y2={-59} stroke="#5d4a33" strokeWidth={1.4} />
      <path d="M-9,-59 L-1,-56.5 L-9,-54 Z" fill="#c9a441" />
    </g>
  )
}

/**
 * Pan de mur effondré ailleurs qu'à la porte. Trois plans se lisent : la trouée
 * d'ombre au travers du mur, le talus de pierres qui la comble à demi, puis les
 * blocs et les poutres du chemin de ronde répandus au-dehors. Rien de rectiligne
 * ni de plat : la cassure est dentelée, chaque pierre a sa face au soleil NW.
 */
function Decombres({ geo, angle, hFace, bois }: { geo: GeoMur; angle: number; hFace: number; bois?: boolean }) {
  // une palissade s'effondre en pieux rompus, une muraille en blocs de taille
  const T = bois
    ? { assise: '#59431f', assiseLit: '#6f5636', face: '#7d5e39', dessus: '#a8845d', flanc: '#5c4227', pied: '#4a3519', lumps: '#6a4e2d', lumpsLit: '#8b6a40', poudre: '#a89066' }
    : { assise: '#7e7768', assiseLit: '#928a78', face: '#a09884', dessus: '#c6bda6', flanc: '#7c7565', pied: '#6d6657', lumps: '#8f8878', lumpsLit: '#aea695', poudre: '#cfc7b0' }
  const demi = 0.1
  const g = pt(geo, angle - demi)
  const m = pt(geo, angle)
  const d = pt(geo, angle + demi)
  // vers le dehors de l'enceinte : c'est de ce côté que la pierre a roulé
  const ox = Math.cos(angle)
  const oy = Math.sin(angle)
  const h = hFace
  // tout le tas se met à l'échelle de la hauteur du mur (palissade → grand appareil)
  const k = Math.max(0.62, Math.min(1, h / 24))
  const larg = Math.hypot(d.x - g.x, d.y - g.y) / 2

  /** point sur la lèvre supérieure de la cassure, t ∈ [0,1] le long de l'arc */
  const lip = (t: number, frac: number) => ({
    x: g.x + (d.x - g.x) * t,
    y: g.y + (d.y - g.y) * t - h * frac,
  })
  const dents = [
    lip(0, 0.96),
    lip(0.14, 0.74),
    lip(0.28, 0.82),
    lip(0.42, 0.58),
    lip(0.56, 0.68),
    lip(0.72, 0.5),
    lip(0.86, 0.78),
    lip(1, 0.92),
  ]
  const troue =
    `M${g.x.toFixed(1)},${(g.y + 2).toFixed(1)}` +
    dents.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('') +
    `L${d.x.toFixed(1)},${(d.y + 2).toFixed(1)}Z`

  /**
   * Le tas : d'abord des BLOCS taillés descellés du grand appareil, puis des
   * pierres roulées entre eux. x en fractions de la demi-largeur de la trouée,
   * tailles en fractions de la hauteur du mur - un pan de palissade s'effondre
   * en petit, une muraille de niveau 4 en grand.
   */
  const BLOCS: [number, number, number, number, number][] = [
    // [fx, fy, largeur, hauteur, rotation]
    [-0.6, 0.02, 0.44, 0.26, -13],
    [0.04, -0.12, 0.52, 0.3, 7],
    [0.58, 0.06, 0.4, 0.24, -6],
    [-0.18, 0.22, 0.48, 0.22, 3],
    [0.95, 0.2, 0.3, 0.18, 12],
  ]
  const PIERRES: [number, number, number][] = [
    [-0.95, 0.16, 0.13], [-0.36, 0.16, 0.15], [0.3, 0.16, 0.13], [0.74, 0.16, 0.11],
    [-0.72, -0.1, 0.11], [-0.06, -0.34, 0.12], [0.4, -0.16, 0.1], [1.16, 0.22, 0.09],
  ]
  return (
    <g>
      {/* l'ombre du tas est posée AVANT la trouée : elle ne doit pas la barbouiller */}
      <g transform={`translate(${(m.x + ox * 4).toFixed(1)},${(m.y + oy * 4).toFixed(1)})`}>
        <ellipse cx={larg * 0.14} cy={h * 0.26} rx={larg * 1.12} ry={h * 0.28} fill={PAL.ombrePortee} opacity={0.2} filter="url(#a-flou2)" />
      </g>
      <path d={troue} fill="url(#mur-antre)" />
      {/* lèvre de cassure : matière fraîche au soleil, joint noir côté ombre */}
      <path
        d={`M${g.x.toFixed(1)},${(g.y + 1).toFixed(1)}` + dents.slice(0, 5).map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('')}
        stroke={bois ? '#d6b788' : '#e6dfcb'}
        strokeWidth={1.5}
        fill="none"
        opacity={0.7}
      />
      <path
        d={dents.slice(4).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('') + `L${d.x.toFixed(1)},${(d.y + 1).toFixed(1)}`}
        stroke="#463b2c"
        strokeWidth={1.5}
        fill="none"
        opacity={0.6}
      />
      {/* couronnement descellé, resté en travers au-dessus du trou */}
      <g transform={`translate(${m.x.toFixed(1)},${(m.y - h - 2).toFixed(1)}) scale(${k.toFixed(2)})`}>
        <g transform="rotate(-17)">
          <rect x={-14} y={-4.4} width={9} height={4.6} fill={T.face} />
          <rect x={-14} y={-4.4} width={9} height={1.1} fill={T.dessus} />
        </g>
        <g transform="rotate(24)">
          <rect x={6} y={-3.6} width={8} height={4.2} fill={T.flanc} />
          <rect x={6} y={-3.6} width={8} height={1} fill={T.dessus} />
        </g>
      </g>
      {/* le tas : assise tassée, gros débris, menu fretin entre eux */}
      <g transform={`translate(${(m.x + ox * 4).toFixed(1)},${(m.y + oy * 4).toFixed(1)})`}>
        <ellipse cx={0} cy={h * 0.17} rx={larg * 0.98} ry={h * 0.22} fill={T.assise} />
        <ellipse cx={-larg * 0.12} cy={h * 0.12} rx={larg * 0.72} ry={h * 0.17} fill={T.assiseLit} />
        {BLOCS.map(([fx, fy, fw, fh, rot]) => {
          const w = fw * h * (bois ? 1.5 : 1)
          const hb = fh * h * (bois ? 0.55 : 1)
          return (
            <g key={`b${fx}-${fy}`} transform={`translate(${(fx * larg).toFixed(1)},${(fy * h).toFixed(1)}) rotate(${rot})`}>
              <rect x={-w / 2} y={-hb / 2} width={w} height={hb} fill={T.face} />
              <rect x={-w / 2} y={-hb / 2} width={w} height={hb * 0.26} fill={T.dessus} />
              <rect x={w / 2 - w * 0.16} y={-hb / 2} width={w * 0.16} height={hb} fill={T.flanc} />
              <rect x={-w / 2} y={hb / 2 - hb * 0.16} width={w} height={hb * 0.16} fill={T.pied} opacity={0.7} />
            </g>
          )
        })}
        {PIERRES.map(([fx, fy, fr]) => {
          const bx = fx * larg
          const by = fy * h
          const r = fr * h
          return (
            <g key={`p${fx}-${fy}`}>
              <ellipse cx={bx} cy={by} rx={r} ry={r * 0.82} fill={T.lumps} />
              <ellipse cx={bx - r * 0.26} cy={by - r * 0.3} rx={r * 0.56} ry={r * 0.4} fill={T.lumpsLit} />
              <path
                d={`M${(bx - r * 0.75).toFixed(1)},${(by + r * 0.5).toFixed(1)} Q${bx.toFixed(1)},${(by + r * 0.95).toFixed(1)} ${(bx + r * 0.8).toFixed(1)},${(by + r * 0.4).toFixed(1)}`}
                stroke={T.pied}
                strokeWidth={0.8}
                fill="none"
                opacity={0.55}
              />
            </g>
          )
        })}
        {/* poutres du chemin de ronde tombées en travers, éclat de bois clair */}
        <g transform={`scale(${k.toFixed(2)})`}>
          <path d="M-22,-2 L2,-8 L2.8,-5.4 L-21.4,0.6 Z" fill="#6f5233" />
          <path d="M-22,-2 L2,-8 L2.4,-6.7 L-21.7,-0.7 Z" fill="#8f6d44" />
          <path d="M9,4 L27,-1 L27.6,1.2 L9.6,6.2 Z" fill="#5f462d" />
          <path d="M27,-1 L29.6,-0.2 L27.6,1.2 Z" fill="#b08f5e" />
        </g>
        {/* poussière de chaux (ou terre remuée) retombée sur l'herbe */}
        <ellipse cx={larg * 0.06} cy={h * 0.34} rx={larg * 1.05} ry={h * 0.16} fill={T.poudre} opacity={0.28} />
      </g>
    </g>
  )
}

function Porte({ geo, niveau, breche }: { geo: GeoMur; niveau: number; breche: boolean }) {
  const { x, y } = pt(geo, 0)
  if (niveau <= 0) return null
  if (breche) {
    return (
      <g transform={`translate(${x},${y})`}>
        {/* éboulis : blocs aux faces éclairées au NW */}
        <ellipse cx={3} cy={7} rx={23} ry={7.5} fill={PAL.ombrePortee} opacity={0.18} filter="url(#a-flou2)" />
        <ellipse cx={0} cy={6} rx={20} ry={7} fill="#8f887a" />
        <ellipse cx={-2} cy={5} rx={14} ry={5} fill="#9c9484" />
        {[
          { bx: -9, by: 2, r: 5 },
          { bx: 6, by: 4, r: 6 },
          { bx: 0, by: -2, r: 4 },
          { bx: 12, by: 0, r: 3.2 },
          { bx: -16, by: 4, r: 3 },
        ].map((b) => (
          <g key={`${b.bx}${b.by}`}>
            <circle cx={b.bx} cy={b.by} r={b.r} fill="#9d9585" />
            <ellipse cx={b.bx - b.r * 0.3} cy={b.by - b.r * 0.38} rx={b.r * 0.62} ry={b.r * 0.5} fill="#bfb7a5" />
            <path d={`M${b.bx - b.r * 0.8},${b.by + b.r * 0.6} Q${b.bx},${b.by + b.r * 1.1} ${b.bx + b.r * 0.85},${b.by + b.r * 0.5}`} stroke="#6e6656" strokeWidth={1} fill="none" opacity={0.6} />
          </g>
        ))}
        {/* vantaux arrachés, éclats de bois clairs */}
        <g transform="rotate(-35 -13 -4)">
          <rect x={-16} y={-14} width={6} height={20} fill="#6f5233" />
          <rect x={-16} y={-14} width={1.5} height={20} fill="#8f6d44" />
          <path d="M-16,-14 L-13,-19 L-11.5,-14 Z" fill="#b08f5e" />
        </g>
        <g transform="rotate(28 13 -3)">
          <rect x={10} y={-12} width={6} height={18} fill="#6f5233" />
          <rect x={10} y={-12} width={1.4} height={18} fill="#8f6d44" />
          <path d="M10,-12 L13.5,-16.5 L16,-12 Z" fill="#b08f5e" />
        </g>
      </g>
    )
  }
  return (
    <g transform={`translate(${x},${y})`}>
      {niveau === 1 && (
        <>
          <ellipse cx={3} cy={5} rx={17} ry={5} fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou1)" />
          {/* vantaux de planches, vantail est plus sombre */}
          <rect x={-8.5} y={-15} width={8.5} height={21} fill="#8a6535" />
          <rect x={0} y={-15} width={8.5} height={21} fill="#7a582c" />
          <path d="M-6,-15 V6 M-3,-15 V6 M3,-15 V6 M6,-15 V6" stroke="#684a25" strokeWidth={1} opacity={0.8} />
          <path d="M-7.6,-12.5 L-1,2.5 M7.6,-12.5 L1,2.5" stroke="#5f462d" strokeWidth={1.2} opacity={0.7} />
          <rect x={-8.5} y={-15} width={17} height={1.8} fill={PAL.ombrePortee} opacity={0.32} />
          {/* linteau, dessus éclairé */}
          <rect x={-14.5} y={-19} width={29} height={3.8} fill="#7a5a35" />
          <rect x={-14.5} y={-19} width={29} height={1.1} fill="#a8845d" />
          {/* poteaux massifs à pointe taillée */}
          {[-12.5, 12.5].map((px, i) => (
            <g key={px}>
              <path d={`M${px - 2.7},6 L${px - 2.7},-21.5 L${px},-25 L${px + 2.7},-21.5 L${px + 2.7},6 Z`} fill={i ? '#6a4c2c' : '#7a5b37'} />
              <path d={`M${px - 2.7},6 L${px - 2.7},-21.5 L${px - 1.1},-22.9 L${px - 1.1},6 Z`} fill="#9a744a" opacity={0.9} />
              <path d={`M${px - 2.1},-21.8 L${px},-24.8 L${px + 2.1},-21.8 L${px},-21 Z`} fill="#d6b788" />
            </g>
          ))}
        </>
      )}
      {niveau === 2 && (
        <>
          <ellipse cx={3} cy={5.5} rx={19} ry={5.5} fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou1)" />
          {/* tympan de pierre au-dessus des vantaux : blocage à joints marqués */}
          <rect x={-9.5} y={-20.5} width={19} height={5} fill="#a89c80" />
          <rect x={-9.5} y={-20.5} width={19} height={1.1} fill="#c6bb9f" />
          <path d="M-4.8,-19.4 v3.6 M0.4,-20 v4 M5.2,-19.3 v3.3" stroke="#8a7f66" strokeWidth={0.7} opacity={0.8} />
          {/* vantaux */}
          <rect x={-9} y={-16} width={9} height={22} fill="#8a6231" />
          <rect x={0} y={-16} width={9} height={22} fill="#7a5628" />
          <path d="M-6,-16 V6 M-3,-16 V6 M3,-16 V6 M6,-16 V6" stroke="#684a25" strokeWidth={1} opacity={0.75} />
          <line x1={0} y1={-16} x2={0} y2={6} stroke="#563e1f" strokeWidth={1.2} />
          <rect x={-9} y={-16} width={18} height={1.8} fill={PAL.ombrePortee} opacity={0.3} />
          {/* linteau de bois posé sur les jambages */}
          <rect x={-17} y={-25} width={34} height={4.4} fill="#7a5a35" />
          <rect x={-17} y={-25} width={34} height={1.2} fill="#a8845d" />
          <rect x={-17} y={-20.8} width={34} height={1} fill={PAL.ombrePortee} opacity={0.28} />
          {/* jambages en pierre sèche, ouest éclairé / est ombré */}
          {[
            { jx: -13.5, tons: ['#d2c9b3', '#c3b8a0', '#cdc3ac', '#b8ad94'] },
            { jx: 13.5, tons: ['#b7ac93', '#a89d83', '#b0a58b', '#9c917a'] },
          ].map((j) => (
            <g key={j.jx}>
              {j.tons.map((c, k) => (
                <rect key={k} x={j.jx - 3.8 + (k % 2 ? 0.5 : -0.3)} y={6 - (k + 1) * 6.6} width={7.6 - (k % 2 ? 1 : 0)} height={5.9} rx={0.6} fill={c} />
              ))}
              <rect x={j.jx - 4.4} y={-23.5} width={8.8} height={2.6} fill="#ddd5c1" />
            </g>
          ))}
        </>
      )}
      {niveau === 3 && (
        <>
          <ellipse cx={4} cy={6} rx={30} ry={7} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou2)" />
          <Tour x={-24} y={-4} />
          <Tour x={24} y={-4} />
          {/* corps du porche */}
          <rect x={-16} y={-30} width={32} height={36} fill="url(#mur-face)" />
          <path d="M-16,-20.5 h32 M-16,-11 h32" stroke={PAL.pierreJoint} strokeWidth={0.7} strokeDasharray="6 4" opacity={0.4} />
          <rect x={-16} y={3.4} width={32} height={2.6} fill={PAL.ombrePortee} opacity={0.16} />
          {/* chemin de ronde du porche + créneaux */}
          <rect x={-17.5} y={-34.4} width={35} height={4.4} fill="url(#mur-dalle)" />
          <rect x={-17.5} y={-30.2} width={35} height={1.2} fill={PAL.ombrePortee} opacity={0.22} />
          {[
            { mx: -17.5, c: '#d8d0bc' },
            { mx: -9.85, c: '#cfc5af' },
            { mx: -2.2, c: '#c4baa2' },
            { mx: 5.45, c: '#b4aa92' },
            { mx: 13.1, c: '#a2977e' },
          ].map((m) => (
            <g key={m.mx}>
              <rect x={m.mx} y={-38.6} width={4.4} height={4.6} fill={m.c} />
              <rect x={m.mx} y={-38.6} width={4.4} height={1} fill="#efe8d5" />
              <rect x={m.mx + 4.4} y={-38.2} width={0.9} height={4.2} fill="#8a8069" />
            </g>
          ))}
          {/* arc appareillé, claveaux marqués, clef éclairée */}
          <path d="M-12.5,6 L-12.5,-13 A12.5,12.5 0 0 1 12.5,-13 L12.5,6 L9.2,6 L9.2,-12.4 A9.2,9.2 0 0 0 -9.2,-12.4 L-9.2,6 Z" fill="#d5cdb9" />
          <path d="M-9.5,-16.5 L-11.8,-18.9 M0,-22.2 L0,-25.6 M9.5,-16.5 L11.8,-18.9" stroke={PAL.pierreJoint} strokeWidth={0.8} opacity={0.6} />
          <path d="M-2.6,-25.6 L-1.6,-22.3 L1.6,-22.3 L2.6,-25.6 Z" fill="#ece5d1" />
          {/* embrasure profonde */}
          <path d="M-9.2,6 L-9.2,-12.4 A9.2,9.2 0 0 1 9.2,-12.4 L9.2,6 Z" fill="url(#mur-antre)" />
          {/* vantaux en retrait, bronze au niveau 3 */}
          <path d="M-7.4,6 L-7.4,-11.4 A7.4,7.4 0 0 1 7.4,-11.4 L7.4,6 Z" fill="#6d4e2c" />
          <path d="M-7.4,6 L-7.4,-11.4 A7.4,7.4 0 0 1 -2.4,-18 L-2.4,6 Z" fill="#7c5a34" />
          <path d="M-4.6,-16.5 V6 M4.6,-16.5 V6" stroke="#5a4022" strokeWidth={0.9} opacity={0.8} />
          <line x1={0} y1={-18.6} x2={0} y2={6} stroke="#4a3018" strokeWidth={1.1} />
          <rect x={-7.4} y={-9} width={14.8} height={1.4} fill="#8a6b2e" />
          <rect x={-7.4} y={-1} width={14.8} height={1.4} fill="#8a6b2e" />
          {[-4, 4].map((sx) => (
            <g key={sx}>
              <circle cx={sx} cy={-13} r={1} fill={PAL.or} />
              <circle cx={sx} cy={-5} r={1} fill={PAL.or} />
              <circle cx={sx} cy={2.6} r={1} fill={PAL.or} />
            </g>
          ))}
          {/* seuil */}
          <rect x={-9.2} y={4.4} width={18.4} height={2.2} fill="#bdb298" />
        </>
      )}
      {niveau >= 4 && (
        <>
          <ellipse cx={5} cy={7} rx={38} ry={8} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou2)" />
          <Tour x={-30} y={-4} flamme />
          <Tour x={30} y={-4} flamme />
          {/* corps monumental appareillé */}
          <rect x={-21} y={-42} width={42} height={48} fill="url(#mur-face4)" />
          <MurPierre x={-21} y={-42} w={42} h={12} seed={12} />
          <path d="M-21,-16 h42 M-21,-6 h42" stroke={PAL.pierreJoint} strokeWidth={0.7} strokeDasharray="7 5" opacity={0.35} />
          <rect x={-21} y={3.4} width={42} height={2.6} fill={PAL.ombrePortee} opacity={0.16} />
          {/* frise : écho de la porte des Lionnes */}
          <rect x={-23} y={-47.5} width={46} height={5.5} fill="#e6dfcb" />
          <rect x={-23} y={-47.5} width={46} height={1.2} fill="#f4efe1" />
          <rect x={-23} y={-42.4} width={46} height={1.1} fill={PAL.ombrePortee} opacity={0.24} />
          <path d="M-10,-43 L-9,-46.6 L-3.2,-43 Z" fill="#8c8474" />
          <path d="M10,-43 L9,-46.6 L3.2,-43 Z" fill="#8c8474" />
          <rect x={-1.4} y={-46.8} width={2.8} height={3.8} fill="#9a9078" />
          <rect x={-2} y={-47.3} width={4} height={1} fill="#b5ab90" />
          {/* chemin de ronde + créneaux du porche */}
          <rect x={-24.5} y={-52.2} width={49} height={4.7} fill="url(#mur-dalle)" />
          {[
            { mx: -24.5, c: '#ddd5c1' },
            { mx: -15.7, c: '#d3cab5' },
            { mx: -6.9, c: '#c9bfa8' },
            { mx: 1.9, c: '#beb49c' },
            { mx: 10.7, c: '#b0a58b' },
            { mx: 19.5, c: '#a2977e' },
          ].map((m) => (
            <g key={m.mx}>
              <rect x={m.mx} y={-57.2} width={5} height={5} fill={m.c} />
              <rect x={m.mx} y={-57.2} width={5} height={1.1} fill="#f2ecd9" />
              <rect x={m.mx + 5} y={-56.8} width={1} height={4.6} fill="#8a8069" />
            </g>
          ))}
          {/* arc monumental */}
          <path d="M-15,6 L-15,-16 A15,15 0 0 1 15,-16 L15,6 L11.4,6 L11.4,-15.4 A11.4,11.4 0 0 0 -11.4,-15.4 L-11.4,6 Z" fill="#e2dac6" />
          <path d="M-11.5,-20 L-14.2,-22.8 M0,-27 L0,-31 M11.5,-20 L14.2,-22.8" stroke={PAL.pierreJoint} strokeWidth={0.9} opacity={0.55} />
          <path d="M-3,-31 L-2,-27.2 L2,-27.2 L3,-31 Z" fill="#f4efe1" />
          {/* embrasure profonde */}
          <path d="M-11.4,6 L-11.4,-15.4 A11.4,11.4 0 0 1 11.4,-15.4 L11.4,6 Z" fill="url(#mur-antre)" />
          {/* vantaux de bois bardés de bronze */}
          <path d="M-9.4,6 L-9.4,-14.2 A9.4,9.4 0 0 1 9.4,-14.2 L9.4,6 Z" fill="#6d4e2c" />
          <path d="M-9.4,6 L-9.4,-14.2 A9.4,9.4 0 0 1 -3,-22.5 L-3,6 Z" fill="#7d5b34" />
          <line x1={0} y1={-23.6} x2={0} y2={6} stroke="#4a3018" strokeWidth={1.3} />
          {[-12, -4.5, 3].map((by) => (
            <g key={by}>
              <rect x={-9.4} y={by} width={18.8} height={1.9} fill="#8a6b2e" />
              <rect x={-9.4} y={by} width={18.8} height={0.6} fill="#c9a441" opacity={0.8} />
            </g>
          ))}
          {[-6, 6].map((sx) =>
            [-18, -8.5, 0.5].map((sy) => (
              <g key={`${sx}${sy}`}>
                <circle cx={sx} cy={sy} r={1.4} fill={PAL.or} />
                <circle cx={sx - 0.4} cy={sy - 0.4} r={0.5} fill="#f0d791" />
              </g>
            )),
          )}
          {/* seuil à deux degrés */}
          <rect x={-11.4} y={4} width={22.8} height={2.4} fill="#c8bda2" />
          <rect x={-13} y={5.4} width={26} height={1.8} fill="#b6ab90" />
        </>
      )}
    </g>
  )
}

interface Props {
  niveau: number
  hp: number
  max: number
  breche: boolean
  layer: 'back' | 'front'
  /** géométrie de l'enceinte - par défaut celle du village du joueur */
  geo?: GeoMur
  /** tours d'archers bâties sur l'enceinte */
  tours?: number
  /** fraction d'arc dessinée (chantier en cours) - 1 = enceinte complète */
  span?: number
  /** angles des secteurs effondrés : chaque pan cède à son propre endroit */
  brechesAngles?: number[]
}

/**
 * L'enceinte. Mémoïsée : hors assaut, ni le niveau ni les points de structure ne
 * bougent, et l'arc échantillonné coûte plusieurs centaines de nœuds par couche.
 */
export const Murailles = memo(function Murailles({
  niveau,
  hp,
  max,
  breche,
  layer,
  geo = MAP.mur,
  tours = 0,
  span = 1,
  brechesAngles,
}: Props) {
  const a0 = layer === 'back' ? Math.PI : PORTE
  const a1Complet = layer === 'back' ? 2 * Math.PI - PORTE : Math.PI
  const a1 = a0 + (a1Complet - a0) * span

  // niveau 0 : bornes de fondation, pour situer la future enceinte
  if (niveau <= 0) {
    return (
      <g opacity={0.5}>
        {echantillons(geo, a0, a1, 0.32).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2} fill="#8f887a" />
        ))}
      </g>
    )
  }

  const ratio = max > 0 ? hp / max : 1
  const fissures =
    ratio < 0.65
      ? [0.55, 2.6, 1.25, 3.7, 5.1, 1.9].slice(0, Math.min(6, Math.floor((1 - ratio) * 8))).filter((a) => {
          const enAvant = a > PORTE && a < Math.PI
          return layer === 'front' ? enAvant : !enAvant
        })
      : []
  const hFace = niveau >= 4 ? 24 : niveau === 3 ? 17 : niveau === 2 ? 9 : 12

  return (
    <g>
      <DefsMur />

      {niveau === 1 &&
        (() => {
          const px = pieuxPaths(echantillons(geo, a0, a1, 0.026), 2.5, 14, 4, 5.4, layer === 'front' ? 3 : 5)
          return (
            <g>
              {/* ombre portée au sol côté SE + levée de terre au pied */}
              <path d={chemin(geo, a0, a1, 5.5)} stroke={PAL.ombrePortee} strokeWidth={10} fill="none" opacity={0.18} filter="url(#a-flou2)" strokeLinecap="round" />
              <path d={chemin(geo, a0, a1, 1.5)} stroke="#8a7449" strokeWidth={5} fill="none" opacity={0.55} strokeLinecap="round" />
              <path d={chemin(geo, a0, a1, 0.6)} stroke="#6b5636" strokeWidth={2.2} fill="none" opacity={0.5} />
              {/* fond de palissade : la pénombre entre les pieux, jamais le sol nu */}
              <path d={bande(geo, a0, a1, 2.2, -9.5)} fill="#46331d" />
              {/* pieux : 3 valeurs de bois, arête ouest éclairée, pointes taillées claires */}
              <path d={px.corps[0]} fill="#7d5e39" />
              <path d={px.corps[1]} fill="#6a4e2d" />
              <path d={px.corps[2]} fill="#8b6a40" />
              <path d={px.arete} fill="#aa865e" opacity={0.85} />
              <path d={px.pointe} fill="#d6b788" />
              {/* double traverse lachée DEVANT les pieux, chant supérieur éclairé */}
              <path d={chemin(geo, a0, a1, -3.6)} stroke="#5c4227" strokeWidth={2.1} fill="none" opacity={0.95} />
              <path d={chemin(geo, a0, a1, -4.4)} stroke="#96713f" strokeWidth={0.8} fill="none" opacity={0.9} />
              <path d={chemin(geo, a0, a1, -8.6)} stroke="#5c4227" strokeWidth={2} fill="none" opacity={0.9} />
              <path d={chemin(geo, a0, a1, -9.4)} stroke="#96713f" strokeWidth={0.8} fill="none" opacity={0.85} />
            </g>
          )
        })()}

      {niveau === 2 &&
        (() => {
          const pierres = assisesArc(geo, a0 + 0.015, a1 - 0.015, 0.062, -10.6, 3, 4.1, 5, layer === 'front' ? 21 : 22)
          const px = pieuxPaths(echantillons(geo, a0 + 0.05, a1 - 0.05, 0.058), -10.2, 8, 3, 4, layer === 'front' ? 7 : 9)
          return (
            <g>
              <path d={chemin(geo, a0, a1, 5)} stroke={PAL.ombrePortee} strokeWidth={10} fill="none" opacity={0.18} filter="url(#a-flou2)" strokeLinecap="round" />
              {/* corps en pierre sèche : les joints affleurent entre les blocs */}
              <path d={bande(geo, a0, a1, 2, -11)} fill="url(#mur-sec)" />
              <path d={bande(geo, a0, a1, 2, -11)} fill="#5f5540" opacity={0.35} />
              {/* blocs par assises, tons répondant à la lumière NW */}
              {pierres.map((d, i) => (
                <path key={i} d={d} fill={TONS_SEC[i]} />
              ))}
              {/* pied dans l'ombre (plus dense à l'est) + couronnement clair */}
              <path d={chemin(geo, a0, a1, 0.9)} stroke="url(#mur-pied)" strokeWidth={3} fill="none" />
              <path d={chemin(geo, a0, a1, -10.7)} stroke="url(#mur-lum)" strokeWidth={1.6} fill="none" />
              {/* pieux plantés au sommet */}
              <path d={px.corps[0]} fill="#7a5c38" />
              <path d={px.corps[1]} fill="#6c4f2f" />
              <path d={px.corps[2]} fill="#86673e" />
              <path d={px.arete} fill="#a8845d" opacity={0.8} />
              <path d={px.pointe} fill="#d6b788" />
            </g>
          )
        })()}

      {niveau >= 3 &&
        (() => {
          const n4 = niveau >= 4
          const h = hFace
          const ep = n4 ? 6.2 : 5.2
          const grad = n4 ? 'url(#mur-face4)' : 'url(#mur-face)'
          const merlons = creneauxPaths(
            echantillons(geo, a0 + 0.02, a1 - 0.02, n4 ? 0.046 : 0.054),
            h + ep - 0.6,
            n4 ? 5.6 : 4.6,
            n4 ? 6.2 : 5.4,
            niveau * 3 + (layer === 'front' ? 1 : 2),
          )
          const blocs = assisesArc(
            geo,
            a0 + 0.02,
            a1 - 0.02,
            n4 ? 0.105 : 0.12,
            -h + 1.6,
            n4 ? 3 : 2,
            n4 ? 5.6 : 5.4,
            5,
            (layer === 'front' ? 41 : 42) + niveau,
          )
          let dalles = ''
          if (n4)
            for (const p of echantillons(geo, a0 + 0.04, a1 - 0.04, 0.12))
              dalles += `M${p.x.toFixed(1)},${(p.y - h - 1).toFixed(1)}L${p.x.toFixed(1)},${(p.y - h - ep + 0.8).toFixed(1)}`
          // archères : fentes de tir sur la face EXTERNE seulement (arc sud)
          let archeres = ''
          let archeresLum = ''
          let coulures = ''
          const hA = h * 0.34
          if (layer === 'front')
            for (const p of echantillons(geo, a0 + 0.17, a1 - 0.17, 0.26)) {
              const yh = (p.y - h * 0.64).toFixed(1)
              archeres += `M${(p.x - 0.9).toFixed(1)},${yh}h1.8v${hA.toFixed(1)}h-1.8Z`
              archeresLum += `M${(p.x - 1.5).toFixed(1)},${yh}h0.6v${hA.toFixed(1)}h-0.6Z`
              coulures += `M${(p.x - 0.8).toFixed(1)},${(p.y - h * 0.64 + hA).toFixed(1)}h1.6v${(h * 0.17).toFixed(1)}h-1.6Z`
            }
          return (
            <g>
              {/* ombre portée du mur, bande floue décalée vers le SE */}
              <path d={chemin(geo, a0, a1, h * 0.4)} stroke={PAL.ombrePortee} strokeWidth={h * 0.7} fill="none" opacity={0.18} filter="url(#a-flou2)" strokeLinecap="round" />
              {/* face externe : ouest éclairé → est ombré */}
              <path d={bande(geo, a0, a1, 2, -h)} fill={grad} />
              {/* grand appareil : blocs par assises répondant à la lumière */}
              <g opacity={n4 ? 0.55 : 0.62}>
                {blocs.map((d, i) => (
                  <path key={i} d={d} fill={n4 ? TONS_TAILLE[i] : TONS_SEC[i]} />
                ))}
              </g>
              {/* joints d'assises basses */}
              <path d={chemin(geo, a0, a1, -h * 0.3)} stroke={PAL.pierreJoint} strokeWidth={0.9} fill="none" strokeDasharray="8 5" opacity={0.3} />
              {/* archères percées à mi-face, coulures de pluie sous les fentes */}
              <path d={coulures} fill={PAL.ombrePortee} opacity={0.13} filter="url(#a-flou1)" />
              <path d={archeres} fill="#382c1a" />
              <path d={archeresLum} fill="#efe8d6" opacity={0.75} />
              {n4 && <path d={chemin(geo, a0, a1, -3.4)} stroke="#8d8269" strokeWidth={1.1} fill="none" opacity={0.45} />}
              {/* pied dans l'ombre (plus dense à l'est) + éclat au sommet de la face */}
              <path d={chemin(geo, a0, a1, 0.9)} stroke="url(#mur-pied)" strokeWidth={h * 0.24} fill="none" />
              {/* ombre du parapet portée sur le haut de la face */}
              <path d={chemin(geo, a0, a1, -h + 2.4)} stroke={PAL.ombrePortee} strokeWidth={2.4} fill="none" opacity={0.16} filter="url(#a-flou1)" />
              <path d={chemin(geo, a0, a1, -h + 0.7)} stroke="url(#mur-lum)" strokeWidth={1.7} fill="none" />
              {/* chemin de ronde dallé : margelle externe sombre, lèvre interne claire */}
              <path d={bande(geo, a0, a1, -h, -h - ep)} fill="url(#mur-dalle)" />
              {n4 && <path d={dalles} stroke="#a59b82" strokeWidth={0.7} fill="none" opacity={0.6} />}
              <path d={chemin(geo, a0, a1, -h - ep / 2)} stroke="#b3a98f" strokeWidth={0.7} fill="none" strokeDasharray="6 7" opacity={0.5} />
              <path d={chemin(geo, a0, a1, -h + 0.2)} stroke="#7d7259" strokeWidth={0.9} fill="none" opacity={0.55} />
              <path d={chemin(geo, a0, a1, -h - ep + 0.5)} stroke="url(#mur-lum)" strokeWidth={1.1} fill="none" />
              {/* créneaux volumiques : ombre SE sur le dallage, puis les 3 faces */}
              <path d={merlons.ombre} fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou1)" />
              <path d={merlons.face} fill={grad} />
              <path d={merlons.flanc} fill="#7b7057" />
              <path d={merlons.dessus} fill="#f2ecd9" />
              {/* tours de guet et étendards du niveau 4 */}
              {n4 &&
                (layer === 'front' ? [0.85, 2.29] : [3.99, 5.43])
                  .filter((a) => a <= a1)
                  .map((a) => {
                    const p = pt(geo, a)
                    return <Tour key={a} x={p.x} y={p.y} flamme />
                  })}
              {n4 &&
                (layer === 'front' ? [1.45, 2.7] : [3.5, 4.7, 5.6])
                  .filter((a) => a <= a1)
                  .map((a, i) => {
                    const p = pt(geo, a)
                    return <Etendard key={a} x={p.x} y={p.y - h - 2} c={i % 2 ? '#c9a441' : '#b3543f'} />
                  })}
            </g>
          )
        })()}

      {/* fissures selon l'état des remparts : entaille sombre, lèvre éclairée */}
      {fissures.map((a, i) => {
        const p = pt(geo, a)
        const d = `M${p.x},${p.y - hFace + 3} l2.5,4 l-3.5,3 l2.5,4 l-1.5,3`
        return (
          <g key={i}>
            <path d={d} stroke="#4f4335" strokeWidth={1.6} fill="none" />
            <path d={d} stroke="#e6dfcb" strokeWidth={0.6} fill="none" transform="translate(0.9,-0.5)" opacity={0.7} />
          </g>
        )
      })}
      {ratio < 0.3 && layer === 'front' && (
        <g>
          {[
            { a: 0.7, dx: 6, dy: 8, r: 4 },
            { a: 2.4, dx: -4, dy: 9, r: 3 },
          ].map((b) => {
            const p = pt(geo, b.a)
            return (
              <g key={b.a} opacity={0.9}>
                <circle cx={p.x + b.dx} cy={p.y + b.dy} r={b.r} fill="#8f887a" />
                <ellipse cx={p.x + b.dx - b.r * 0.3} cy={p.y + b.dy - b.r * 0.35} rx={b.r * 0.6} ry={b.r * 0.45} fill="#aca496" />
              </g>
            )
          })}
        </g>
      )}

      {/* pans effondrés hors de la porte - chaque secteur cède à son endroit */}
      {span >= 1 &&
        (brechesAngles ?? [])
          .map((a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI))
          // la porte a son propre effondrement (composant Porte)
          .filter((a) => a > 0.3 && a < 2 * Math.PI - 0.3)
          .filter((a) => (layer === 'front' ? a < Math.PI : a >= Math.PI))
          .map((a) => <Decombres key={a} geo={geo} angle={a} hFace={hFace} bois={niveau === 1} />)}

      {/* tours d'archers du joueur, réparties de part et d'autre de la porte */}
      {niveau >= 1 &&
        tours > 0 &&
        TOUR_ANGLES.slice(0, tours)
          .filter((a) => (layer === 'front' ? a > 0 : a < 0))
          .map((a) => {
            const p = pt(geo, a)
            return <TourArcher key={a} x={p.x} y={p.y} />
          })}

      {layer === 'front' && span >= 1 && <Porte geo={geo} niveau={niveau} breche={breche} />}
    </g>
  )
})
