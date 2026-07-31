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

/** ruban fermé entre deux hauteurs le long de l'arc — le corps du mur en volume */
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
        <stop offset="42%" stopColor="#b7ac93" />
        <stop offset="100%" stopColor="#857a61" />
      </linearGradient>
      <linearGradient id="mur-face4" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#e6dfca" />
        <stop offset="42%" stopColor="#c6bca4" />
        <stop offset="100%" stopColor="#93886d" />
      </linearGradient>
      <linearGradient id="mur-dalle" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#e2dac6" />
        <stop offset="55%" stopColor="#c6bca4" />
        <stop offset="100%" stopColor="#9c9179" />
      </linearGradient>
      <linearGradient id="mur-sec" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#cdc2a5" />
        <stop offset="45%" stopColor="#a89c80" />
        <stop offset="100%" stopColor="#7d7259" />
      </linearGradient>
    </defs>
  )
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

/** créneaux volumiques : face avant + dessus clair + flanc est ombré, en 3 chemins */
function creneauxPaths(pts: { x: number; y: number; a: number }[], hBase: number, hM: number, wM: number, seed: number) {
  const rnd = alea(seed)
  let face = ''
  let dessus = ''
  let flanc = ''
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
  }
  return { face, dessus, flanc }
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
      <ellipse cx={9} cy={4} rx={14} ry={4.6} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou1)" />
      <AOBase rx={12.5} ry={3.8} cy={2.5} />
      {/* fût légèrement évasé à la base */}
      <path d="M-10,-40 L-11.6,1 Q0,4.2 11.6,1 L10,-40 Z" fill="url(#a-cyl-pierre)" />
      {/* cerclages d'assises épousant le cylindre */}
      <path d="M-10.9,-11 Q0,-8.6 10.9,-11" stroke={PAL.pierreJoint} strokeWidth={0.7} fill="none" opacity={0.45} />
      <path d="M-10.4,-25 Q0,-22.8 10.4,-25" stroke={PAL.pierreJoint} strokeWidth={0.7} fill="none" opacity={0.45} />
      {/* meurtrière, arête ouest éclairée */}
      <rect x={-1} y={-31} width={2} height={7.5} rx={0.9} fill="#392e1d" />
      <line x1={-1.1} y1={-30.5} x2={-1.1} y2={-24} stroke="#efe8d6" strokeWidth={0.5} opacity={0.8} />
      {/* encorbellement du parapet + ombre portée sous le débord */}
      <path d="M-12.8,-44.5 L-12.8,-40.5 Q0,-37.4 12.8,-40.5 L12.8,-44.5 Z" fill="url(#a-cyl-pierre)" />
      <path d="M-12.4,-40.6 Q0,-37.6 12.4,-40.6" stroke={PAL.ombrePortee} strokeWidth={1.6} fill="none" opacity={0.28} />
      {/* merlons arrière dépassant derrière la plateforme */}
      {[-8.5, -1.5, 5.5].map((mx) => (
        <rect key={mx} x={mx} y={-52} width={4} height={5.5} fill="#a1977d" />
      ))}
      {/* plateforme : margelle claire, sol en demi-teinte */}
      <ellipse cx={0} cy={-46} rx={12.8} ry={3.4} fill="#e2dbc7" />
      <ellipse cx={0.6} cy={-45.6} rx={10.6} ry={2.6} fill="#c9bfa7" />
      {/* merlons avant, de l'ouest éclairé à l'est ombré */}
      {[
        { mx: -12.4, c: '#ddd5c1' },
        { mx: -6, c: '#d3cab5' },
        { mx: 1, c: '#c2b8a0' },
        { mx: 8, c: '#a89d83' },
      ].map((m) => (
        <g key={m.mx}>
          <rect x={m.mx} y={-49.6} width={4.4} height={7.3} fill={m.c} />
          <rect x={m.mx} y={-49.6} width={4.4} height={1.1} fill="#efe8d5" />
        </g>
      ))}
      {/* hampe, fanion et feu de guet */}
      <line x1={0} y1={-48} x2={0} y2={-66} stroke="#5d4a33" strokeWidth={2} />
      <path d="M0,-66 L14,-61 L0,-56 Z" fill="#b3543f" />
      <path d="M0,-66 L14,-61 L0,-63.8 Z" fill="#d0705a" opacity={0.9} />
      {flamme && (
        <>
          <path d="M-2.6,-47.6 L2.6,-47.6 L1.8,-44.8 L-1.8,-44.8 Z" fill="#8a6b2e" />
          <circle cx={0} cy={-50} r={3} fill="#f2b04a">
            <animate attributeName="r" values="3;4;3" dur="1.2s" repeatCount="indefinite" />
          </circle>
          <circle cx={0} cy={-50.6} r={1.4} fill="#fbe08d" />
        </>
      )}
    </g>
  )
}

/** tour d'archers constructible — fût cylindrique, plateforme crénelée, archer de faction */
function TourArcher({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={7.5} cy={3.4} rx={12} ry={4} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou1)" />
      <AOBase rx={10.5} ry={3.2} cy={2.2} />
      <path d="M-8.2,-35 L-9.6,1 Q0,3.8 9.6,1 L8.2,-35 Z" fill="url(#a-cyl-pierre)" />
      <path d="M-9,-10 Q0,-7.8 9,-10" stroke={PAL.pierreJoint} strokeWidth={0.6} fill="none" opacity={0.45} />
      <path d="M-8.6,-22 Q0,-20 8.6,-22" stroke={PAL.pierreJoint} strokeWidth={0.6} fill="none" opacity={0.45} />
      <circle cx={0} cy={-19} r={1.6} fill="#4a3a28" />
      {/* encorbellement + ombre sous le débord */}
      <path d="M-11,-39.5 L-11,-36 Q0,-33.2 11,-36 L11,-39.5 Z" fill="url(#a-cyl-pierre)" />
      <path d="M-10.6,-36.1 Q0,-33.4 10.6,-36.1" stroke={PAL.ombrePortee} strokeWidth={1.4} fill="none" opacity={0.26} />
      {/* merlons arrière */}
      {[-6.5, 0.8].map((mx) => (
        <rect key={mx} x={mx} y={-46.5} width={3.6} height={5} fill="#a1977d" />
      ))}
      {/* plateforme */}
      <ellipse cx={0} cy={-41} rx={11} ry={2.9} fill="#e2dbc7" />
      <ellipse cx={0.5} cy={-40.7} rx={9} ry={2.2} fill="#cbc1a9" />
      {/* merlons avant */}
      {[
        { mx: -10.7, c: '#ddd5c1' },
        { mx: -5, c: '#cfc5af' },
        { mx: 1, c: '#c0b59d' },
        { mx: 7, c: '#a89d83' },
      ].map((m) => (
        <g key={m.mx}>
          <rect x={m.mx} y={-44.2} width={3.7} height={6.2} fill={m.c} />
          <rect x={m.mx} y={-44.2} width={3.7} height={1} fill="#efe8d5" />
        </g>
      ))}
      {/* archer de faction */}
      <g transform="translate(0,-41)">
        <path d="M-2.2,0 L-1.5,-6 L1.5,-6 L2.2,0 Z" fill="#4a6a5a" />
        <circle cx={0} cy={-7.6} r={2.1} fill="#d9a97c" />
        <path d="M-2.1,-8 A2.1,2.1 0 0 1 2.1,-8" fill="#8f8a7c" />
        <path d="M3.2,-8.5 Q6.5,-4.5 3.2,-0.5" stroke="#7a5a35" strokeWidth={1.1} fill="none" />
        <line x1={3.2} y1={-8.5} x2={3.2} y2={-0.5} stroke="#e0d9c8" strokeWidth={0.5} />
      </g>
      <line x1={-9} y1={-44} x2={-9} y2={-54} stroke="#5d4a33" strokeWidth={1.4} />
      <path d="M-9,-54 L-1,-51.5 L-9,-49 Z" fill="#c9a441" />
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
          {/* tympan de pierre au-dessus des vantaux */}
          <rect x={-9.5} y={-20.5} width={19} height={5} fill="#b3a88e" />
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
          <path d="M-9.2,6 L-9.2,-12.4 A9.2,9.2 0 0 1 9.2,-12.4 L9.2,6 Z" fill="#2c2214" />
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
          <rect x={-21} y={-38} width={42} height={44} fill="url(#mur-face4)" />
          <MurPierre x={-21} y={-38} w={42} h={12} seed={12} />
          <path d="M-21,-16 h42 M-21,-6 h42" stroke={PAL.pierreJoint} strokeWidth={0.7} strokeDasharray="7 5" opacity={0.35} />
          <rect x={-21} y={3.4} width={42} height={2.6} fill={PAL.ombrePortee} opacity={0.16} />
          {/* frise : écho de la porte des Lionnes */}
          <rect x={-23} y={-43.5} width={46} height={5.5} fill="#e6dfcb" />
          <rect x={-23} y={-43.5} width={46} height={1.2} fill="#f4efe1" />
          <rect x={-23} y={-38.4} width={46} height={1.1} fill={PAL.ombrePortee} opacity={0.24} />
          <path d="M-10,-39 L-9,-42.6 L-3.2,-39 Z" fill="#8c8474" />
          <path d="M10,-39 L9,-42.6 L3.2,-39 Z" fill="#8c8474" />
          <rect x={-1.4} y={-42.8} width={2.8} height={3.8} fill="#9a9078" />
          <rect x={-2} y={-43.3} width={4} height={1} fill="#b5ab90" />
          {/* chemin de ronde + créneaux du porche */}
          <rect x={-24.5} y={-48.2} width={49} height={4.7} fill="url(#mur-dalle)" />
          {[
            { mx: -24.5, c: '#ddd5c1' },
            { mx: -15.7, c: '#d3cab5' },
            { mx: -6.9, c: '#c9bfa8' },
            { mx: 1.9, c: '#beb49c' },
            { mx: 10.7, c: '#b0a58b' },
            { mx: 19.5, c: '#a2977e' },
          ].map((m) => (
            <g key={m.mx}>
              <rect x={m.mx} y={-53.2} width={5} height={5} fill={m.c} />
              <rect x={m.mx} y={-53.2} width={5} height={1.1} fill="#f2ecd9" />
              <rect x={m.mx + 5} y={-52.8} width={1} height={4.6} fill="#8a8069" />
            </g>
          ))}
          {/* arc monumental */}
          <path d="M-15,6 L-15,-16 A15,15 0 0 1 15,-16 L15,6 L11.4,6 L11.4,-15.4 A11.4,11.4 0 0 0 -11.4,-15.4 L-11.4,6 Z" fill="#e2dac6" />
          <path d="M-11.5,-20 L-14.2,-22.8 M0,-27 L0,-31 M11.5,-20 L14.2,-22.8" stroke={PAL.pierreJoint} strokeWidth={0.9} opacity={0.55} />
          <path d="M-3,-31 L-2,-27.2 L2,-27.2 L3,-31 Z" fill="#f4efe1" />
          {/* embrasure profonde */}
          <path d="M-11.4,6 L-11.4,-15.4 A11.4,11.4 0 0 1 11.4,-15.4 L11.4,6 Z" fill="#241a0e" />
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
  /** géométrie de l'enceinte — par défaut celle du village du joueur */
  geo?: GeoMur
  /** tours d'archers bâties sur l'enceinte */
  tours?: number
  /** fraction d'arc dessinée (chantier en cours) — 1 = enceinte complète */
  span?: number
}

export function Murailles({ niveau, hp, max, breche, layer, geo = MAP.mur, tours = 0, span = 1 }: Props) {
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
  const hFace = niveau >= 4 ? 21 : niveau === 3 ? 15 : niveau === 2 ? 9 : 12

  return (
    <g>
      <DefsMur />

      {niveau === 1 &&
        (() => {
          const px = pieuxPaths(echantillons(geo, a0, a1, 0.026), 2.5, 14, 4, 5, layer === 'front' ? 3 : 5)
          return (
            <g>
              {/* ombre portée au sol côté SE + levée de terre au pied */}
              <path d={chemin(geo, a0, a1, 5)} stroke={PAL.ombrePortee} strokeWidth={9} fill="none" opacity={0.17} filter="url(#a-flou2)" strokeLinecap="round" />
              <path d={chemin(geo, a0, a1, 1.5)} stroke="#8a7449" strokeWidth={5} fill="none" opacity={0.55} strokeLinecap="round" />
              <path d={chemin(geo, a0, a1, 0.6)} stroke="#6b5636" strokeWidth={2.2} fill="none" opacity={0.5} />
              {/* traverse liant les pieux */}
              <path d={chemin(geo, a0, a1, -6)} stroke="#5f462d" strokeWidth={2} fill="none" opacity={0.85} />
              {/* pieux : 3 valeurs de bois, arête ouest éclairée, pointes taillées claires */}
              <path d={px.corps[0]} fill="#7d5e39" />
              <path d={px.corps[1]} fill="#6e5230" />
              <path d={px.corps[2]} fill="#89693f" />
              <path d={px.arete} fill="#a8845d" opacity={0.85} />
              <path d={px.pointe} fill="#d6b788" />
            </g>
          )
        })()}

      {niveau === 2 &&
        (() => {
          const rnd = alea(layer === 'front' ? 21 : 22)
          const pierres = echantillons(geo, a0 + 0.02, a1 - 0.02, 0.06)
          const px = pieuxPaths(echantillons(geo, a0 + 0.05, a1 - 0.05, 0.07), -10.2, 7.5, 3, 3.4, layer === 'front' ? 7 : 9)
          return (
            <g>
              <path d={chemin(geo, a0, a1, 4.5)} stroke={PAL.ombrePortee} strokeWidth={9} fill="none" opacity={0.17} filter="url(#a-flou2)" strokeLinecap="round" />
              {/* corps en pierre sèche */}
              <path d={bande(geo, a0, a1, 2, -11)} fill="url(#mur-sec)" />
              {/* moellons aux tons variés */}
              {pierres.map((p, i) => {
                const w = (4 + rnd() * 4.5) * (0.4 + 0.6 * Math.abs(Math.sin(p.a)))
                const yc = p.y + 1 - rnd() * 9.5
                return (
                  <rect
                    key={i}
                    x={p.x - w / 2}
                    y={yc - 1.4}
                    width={w}
                    height={2.4 + rnd() * 1.4}
                    rx={0.8}
                    fill={['#cfc5aa', '#bdb094', '#9c8f73', '#d8cfb6'][i % 4]}
                    opacity={0.65}
                  />
                )
              })}
              {/* assises, pied à l'ombre, couronnement clair */}
              <path d={chemin(geo, a0, a1, -3.8)} stroke={PAL.pierreJoint} strokeWidth={0.8} fill="none" strokeDasharray="7 4" opacity={0.5} />
              <path d={chemin(geo, a0, a1, -7.4)} stroke={PAL.pierreJoint} strokeWidth={0.8} fill="none" strokeDasharray="5 6" opacity={0.45} />
              <path d={chemin(geo, a0, a1, 1)} stroke={PAL.ombrePortee} strokeWidth={2.6} fill="none" opacity={0.24} />
              <path d={chemin(geo, a0, a1, -10.6)} stroke="#e8e1cd" strokeWidth={1.4} fill="none" opacity={0.85} />
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
          const ep = n4 ? 5.4 : 4.6
          const grad = n4 ? 'url(#mur-face4)' : 'url(#mur-face)'
          const rnd = alea((layer === 'front' ? 31 : 32) + niveau)
          const merlons = creneauxPaths(
            echantillons(geo, a0 + 0.02, a1 - 0.02, n4 ? 0.042 : 0.05),
            h + ep - 0.6,
            n4 ? 4.8 : 4,
            n4 ? 5.4 : 4.8,
            niveau * 3 + (layer === 'front' ? 1 : 2),
          )
          const patches = echantillons(geo, a0 + 0.03, a1 - 0.03, 0.1)
          let dalles = ''
          if (n4)
            for (const p of echantillons(geo, a0 + 0.04, a1 - 0.04, 0.12))
              dalles += `M${p.x.toFixed(1)},${(p.y - h - 1).toFixed(1)}L${p.x.toFixed(1)},${(p.y - h - ep + 0.8).toFixed(1)}`
          return (
            <g>
              {/* ombre portée du mur, bande floue décalée vers le SE */}
              <path d={chemin(geo, a0, a1, h * 0.38)} stroke={PAL.ombrePortee} strokeWidth={h * 0.62} fill="none" opacity={0.17} filter="url(#a-flou2)" strokeLinecap="round" />
              {/* face externe : ouest éclairé → est ombré */}
              <path d={bande(geo, a0, a1, 2, -h)} fill={grad} />
              {/* respiration de l'appareillage */}
              {patches.map((p, i) => {
                const w = (5 + rnd() * 5) * (0.35 + 0.65 * Math.abs(Math.sin(p.a)))
                const yc = p.y + 1 - rnd() * (h - 2)
                return (
                  <rect
                    key={i}
                    x={p.x - w / 2}
                    y={yc - 1.6}
                    width={w}
                    height={2.6 + rnd() * 1.4}
                    rx={0.8}
                    fill={['#d8d0bc', '#c9bfa8', '#9c9178', '#877c64'][i % 4]}
                    opacity={0.4}
                  />
                )
              })}
              {/* assises */}
              <path d={chemin(geo, a0, a1, -h * 0.33)} stroke={PAL.pierreJoint} strokeWidth={0.9} fill="none" strokeDasharray="8 5" opacity={0.35} />
              <path d={chemin(geo, a0, a1, -h * 0.66)} stroke={PAL.pierreJoint} strokeWidth={0.9} fill="none" strokeDasharray="6 6" opacity={0.32} />
              {n4 && <path d={chemin(geo, a0, a1, -3.4)} stroke="#8d8269" strokeWidth={1.1} fill="none" opacity={0.45} />}
              {/* pied dans l'ombre + bande claire au sommet de la face */}
              <path d={chemin(geo, a0, a1, 0.8)} stroke={PAL.ombrePortee} strokeWidth={3.6} fill="none" opacity={0.26} />
              <path d={chemin(geo, a0, a1, -h + 0.8)} stroke="#ece5d1" strokeWidth={1.5} fill="none" opacity={0.9} />
              {/* chemin de ronde dallé */}
              <path d={bande(geo, a0, a1, -h, -h - ep)} fill="url(#mur-dalle)" />
              {n4 && <path d={dalles} stroke="#a59b82" strokeWidth={0.7} fill="none" opacity={0.6} />}
              <path d={chemin(geo, a0, a1, -h - ep / 2)} stroke="#b3a98f" strokeWidth={0.7} fill="none" strokeDasharray="6 7" opacity={0.5} />
              <path d={chemin(geo, a0, a1, -h - ep + 0.5)} stroke="#948a72" strokeWidth={1} fill="none" opacity={0.75} />
              {/* créneaux volumiques sur le parapet externe */}
              <path d={merlons.face} fill={grad} />
              <path d={merlons.flanc} fill="#867b62" />
              <path d={merlons.dessus} fill="#efe8d5" />
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
}
