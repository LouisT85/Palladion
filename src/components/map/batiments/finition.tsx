import { PAL } from '../art'
import { Feu, Fumee } from './primitives'

/*
 * ═══════════════════ FINITIONS (v2, dans le langage d'origine) ═══════════════════
 * Pièces ajoutées aux dessins d'origine pour les enrichir sans les trahir :
 * même vue de face 3/4, mêmes trois valeurs par matière, lumière NW, ombre SE,
 * zéro contour noir. Uniquement des objets d'époque (Grèce archaïque et
 * classique) : pithoi, métier à tisser à pesons, four à pain, aire de battage,
 * pressoir à levier, hermès, charbonnière, kouros ébauché, casque corinthien.
 * Coordonnées ÉCRAN, ancre au pied de l'objet.
 */

const f = (n: number) => (Math.round(n * 10) / 10).toString()
const Ombre = ({ rx, dx = 2.4, o = 0.2 }: { rx: number; dx?: number; o?: number }) => (
  <ellipse cx={dx} cy={0.7} rx={rx} ry={rx * 0.26} fill={PAL.ombrePortee} opacity={o} />
)

/**
 * Passe de lumière : glacis chaud venu du nord-ouest (soft-light) et ombre
 * douce au sud-est (multiply). Donne le volume d'ensemble, comme un vernis.
 */
export function Lumiere({ rx, h, cy = 0 }: { rx: number; h: number; cy?: number }) {
  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id="fin-lum">
          <stop offset="0%" stopColor="#fff2cc" stopOpacity="0.7" />
          <stop offset="55%" stopColor="#ffe3a3" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffe3a3" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fin-omb">
          <stop offset="0%" stopColor="#2a1a08" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#2a1a08" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={-rx * 0.34} cy={cy - h * 0.62} rx={rx * 0.95} ry={h * 0.72} fill="url(#fin-lum)" style={{ mixBlendMode: 'soft-light' }} />
      <ellipse cx={rx * 0.5} cy={cy + 6} rx={rx * 0.62} ry={h * 0.32} fill="url(#fin-omb)" style={{ mixBlendMode: 'multiply' }} opacity={0.55} />
    </g>
  )
}

/** lueur d'un foyer sur le sol et les murs proches, qui respire */
export function LueurFeu({ x, y, r = 16 }: { x: number; y: number; r?: number }) {
  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id="fin-feu">
          <stop offset="0%" stopColor="#ffc46a" stopOpacity="0.75" />
          <stop offset="45%" stopColor="#e8843a" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#e8843a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={x} cy={y} rx={r} ry={r * 0.55} fill="url(#fin-feu)" style={{ mixBlendMode: 'screen' }}>
        <animate attributeName="opacity" values="0.85;0.55;0.95;0.7;0.85" dur="2.2s" repeatCount="indefinite" />
      </ellipse>
    </g>
  )
}

/** pithos : la grande jarre de réserve, souvent enterrée jusqu'à mi-panse */
export function Pithos({ x, y, s = 1, enterre = false }: { x: number; y: number; s?: number; enterre?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <Ombre rx={7} />
      <path d="M-5,0 C-6.6,-4 -6,-9 -3.2,-11 L-3.4,-12.4 L3.4,-12.4 L3.2,-11 C6,-9 6.6,-4 5,0 Z" fill="#a3673f" />
      <path d="M-5,0 C-6.6,-4 -6,-9 -3.2,-11 L-1.8,-11 C-3.6,-8.6 -4,-4 -2.8,0 Z" fill="#d5a070" opacity={0.7} />
      <path d="M3.2,-11 C6,-9 6.6,-4 5,0 L2.6,0 C3.8,-4 3.6,-8 2,-11 Z" fill="#6e3f22" opacity={0.6} />
      <path d="M-5.8,-7.4 Q0,-6 5.8,-7.4" stroke="#7a4526" strokeWidth={0.7} fill="none" />
      <path d="M-5.6,-6.2 q1,-0.8 2,0 q1,0.8 2,0 q1,-0.8 2,0 q1,0.8 2,0 q1,-0.8 2,0" stroke="#7a4526" strokeWidth={0.45} fill="none" opacity={0.8} />
      <ellipse cx={0} cy={-12.4} rx={3.6} ry={1.05} fill="#8c552f" />
      <ellipse cx={0} cy={-12.4} rx={2.5} ry={0.62} fill="#2a1a0e" />
      <path d="M-3.4,-12.8 Q-1.6,-13.4 0,-13.4" stroke="#e0b07e" strokeWidth={0.5} fill="none" />
      {enterre && (
        <g>
          <path d="M-7.4,1 Q-7,-3.4 -4.8,-3.8 Q0,-2.6 4.8,-3.8 Q7,-3.4 7.4,1 Z" fill="#a8925f" />
          <path d="M-7,-1.6 Q-6.4,-3.4 -4.8,-3.8 Q-1.6,-3 0,-3" stroke="#cdb784" strokeWidth={0.7} fill="none" />
        </g>
      )}
    </g>
  )
}

/** métier à tisser vertical à pesons : l'ouvrage des femmes de la maison */
export function MetierTisser({ x, y, s = 1, c = '#b0412e' }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={3} cy={0.6} rx={8} ry={1.6} fill={PAL.ombrePortee} opacity={0.18} />
      <path d="M-6,0 L-5,-17.4 M6,0 L5,-17.4" stroke="#6a4e30" strokeWidth={1.4} />
      <path d="M-6.3,0 L-5.3,-17.4" stroke="#b89468" strokeWidth={0.45} />
      <rect x={-6.4} y={-18.2} width={12.8} height={1.6} rx={0.6} fill="#7c5a30" />
      <rect x={-6.4} y={-18.2} width={12.8} height={0.6} rx={0.3} fill="#b89468" />
      <rect x={-4.6} y={-16.6} width={9.2} height={5.2} fill={c} />
      <path d="M-4.6,-14.6 h9.2" stroke="#e8c04a" strokeWidth={0.8} />
      <path d="M-4.2,-12.6 l1,-0.8 l1,0.8 l1,-0.8 l1,0.8 l1,-0.8 l1,0.8 l1,-0.8 l1,0.8" stroke="#efe3c4" strokeWidth={0.45} fill="none" />
      <path d={Array.from({ length: 9 }, (_, i) => `M${f(-4 + i)},-11.4 L${f(-4 + i)},-4`).join(' ')} stroke="#e8dcc0" strokeWidth={0.3} />
      <path d="M-5.2,-8 L5.2,-8" stroke="#8a6941" strokeWidth={0.9} />
      {[-3.5, -1.5, 0.5, 2.5].map((px) => (
        <g key={px}>
          <path d={`M${px - 0.8},-2.6 L${px + 0.8},-2.6 L${px + 1},-4.4 L${px - 1},-4.4 Z`} fill="#a3673f" transform={`rotate(180 ${px} -3.5)`} />
          <path d={`M${px - 0.8},-4.4 L${px - 0.2},-4.4 L${px - 0.4},-2.6 Z`} fill="#d5a070" opacity={0.7} />
        </g>
      ))}
    </g>
  )
}

/** four à pain en coupole de terre, bouche rougeoyante, fumée */
export function FourPain({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={4} cy={1} rx={9} ry={2.4} fill={PAL.ombrePortee} opacity={0.2} />
      <path d="M-6,0 C-6.6,-6 -2.6,-9 0,-9 C2.6,-9 6.6,-6 6,0 Z" fill="#d9c49a" />
      <path d="M1.6,-8.8 C4,-8 6.6,-5.4 6,0 L2.4,0 C3.4,-3.4 3,-6.6 1.6,-8.8 Z" fill="#a88e62" />
      <path d="M-5.6,-2.6 C-5.8,-6 -3,-8.6 -0.6,-8.8" stroke="#fff4dc" strokeWidth={0.8} fill="none" opacity={0.7} />
      <path d="M-4.4,-4 q1,-0.4 1.8,0.2 M1,-6.6 q1,-0.2 1.6,0.4" stroke="#8a7350" strokeWidth={0.4} fill="none" opacity={0.6} />
      <path d="M-2.4,0 L-2.4,-2.6 A2.4,2.4 0 0 1 2.4,-2.6 L2.4,0 Z" fill="#1f160c" />
      <path d="M-1.6,0 L-1.6,-2 A1.6,1.6 0 0 1 1.6,-2 L1.6,0 Z" fill="#d8642a" opacity={0.75}>
        <animate attributeName="opacity" values="0.75;0.45;0.75" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M-2.6,-3.6 Q0,-6 2.6,-3.6" stroke="#3a2c1c" strokeWidth={1.4} fill="none" opacity={0.45} />
      <Fumee x={0.6} y={-9} />
    </g>
  )
}

/** ruche de paille tressée sur sa pierre plate, abeilles en orbite */
export function Ruche({ x, y, s = 1, d = 0 }: { x: number; y: number; s?: number; d?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <Ombre rx={5} />
      <rect x={-4.6} y={-1.6} width={9.2} height={1.8} fill={PAL.pierreMi} />
      <rect x={-4.6} y={-1.6} width={9.2} height={0.6} fill={PAL.pierreLit} />
      <path d="M-4,-1.6 C-4.4,-6 -2.6,-8.6 0,-8.6 C2.6,-8.6 4.4,-6 4,-1.6 Z" fill={PAL.chaumeOmbre} />
      <path d="M-4,-1.6 C-4.4,-6 -2.6,-8.6 -0.4,-8.6 C-1.8,-7 -2.4,-4.4 -2,-1.6 Z" fill={PAL.chaumeLit} />
      <path d="M-4.1,-3.4 Q0,-2.4 4.1,-3.4 M-3.8,-5.4 Q0,-4.4 3.8,-5.4 M-2.8,-7.2 Q0,-6.4 2.8,-7.2" stroke="#8a6f34" strokeWidth={0.45} fill="none" />
      <ellipse cx={0.4} cy={-2.4} rx={0.9} ry={0.6} fill="#3a2c1c" />
      {[0, 1].map((i) => (
        <circle key={i} r={0.45} fill="#e8c04a">
          <animateMotion path={`M0,-5 m${-4 - i * 2},0 a${4 + i * 2},${2 + i} 0 1 ${i} ${8 + i * 4},0 a${4 + i * 2},${2 + i} 0 1 ${i} ${-8 - i * 4},0`} dur={`${1.6 + i * 0.7}s`} begin={`${-d}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  )
}

/** aire de battage : dallage circulaire cerné de pierres, paille dorée, bœuf qui tourne */
export function AireBattage({ x, y, rx = 12, ry = 4, boeuf = false }: { x: number; y: number; rx?: number; ry?: number; boeuf?: boolean }) {
  const pierres = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2
    return { x: Math.cos(a) * (rx + 0.9), y: Math.sin(a) * (ry + 0.5), clair: Math.sin(a) < 0 }
  })
  const rr = rx * 0.6
  const rv = ry * 0.6
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={0.6} cy={0.8} rx={rx + 1.8} ry={ry + 1} fill="#7e7460" />
      <ellipse cx={0} cy={0} rx={rx} ry={ry} fill="#c9ad6e" />
      <ellipse cx={-rx * 0.1} cy={-ry * 0.08} rx={rx * 0.74} ry={ry * 0.7} fill="#dcc186" />
      <path d={`M${f(-rx * 0.6)},${f(-ry * 0.1)} q2,-0.8 4,0 M${f(-rx * 0.1)},${f(ry * 0.3)} q2,-0.8 4,0 M${f(rx * 0.3)},${f(-ry * 0.4)} q2,-0.8 4,0 M${f(-rx * 0.4)},${f(ry * 0.5)} q1.6,-0.6 3.2,0`} stroke="#f2dc98" strokeWidth={0.6} fill="none" />
      {pierres.map((p, i) => <ellipse key={i} cx={f(p.x)} cy={f(p.y)} rx={1.2} ry={0.7} fill={p.clair ? '#b7ad96' : '#8b8169'} />)}
      <path d="M0,0 L0,-7" stroke="#6a4e30" strokeWidth={0.9} />
      <path d="M-0.3,0 L-0.3,-7" stroke="#b89468" strokeWidth={0.3} />
      {boeuf && (
        <g>
          <animateMotion path={`M${rr},0 A${rr},${rv} 0 1 1 ${-rr},0 A${rr},${rv} 0 1 1 ${rr},0`} dur="16s" repeatCount="indefinite" />
          <ellipse cx={1} cy={0.4} rx={4} ry={0.9} fill={PAL.ombrePortee} opacity={0.2} />
          <path d="M-2.6,-2.2 L-2.6,0 M-1.4,-2 L-1.4,0 M1.6,-2 L1.6,0 M2.6,-2.2 L2.6,0" stroke="#5a4028" strokeWidth={0.7} />
          <ellipse cx={0} cy={-3.4} rx={3.8} ry={1.9} fill="#8f6a44" />
          <ellipse cx={-0.6} cy={-4} rx={2.8} ry={1.1} fill="#b58a5e" />
          <ellipse cx={-4.4} cy={-3.8} rx={1.5} ry={1.1} fill="#7a5a38" />
          <path d="M-4.6,-4.8 q-0.4,-1.4 0.8,-1.8 M-5.4,-4.8 q-1,-1.2 -0.2,-2" stroke="#e8dcc0" strokeWidth={0.45} fill="none" />
        </g>
      )}
    </g>
  )
}

/** pressoir à olives à levier : pile de scourtins, poutre, contrepoids de pierre */
export function Pressoir({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={6} cy={1} rx={16} ry={2.6} fill={PAL.ombrePortee} opacity={0.18} />
      <rect x={-13} y={-17} width={4.2} height={17} fill="#b3a88d" />
      <rect x={-13} y={-17} width={1.5} height={17} fill="#ddd4bd" />
      <rect x={-8.8} y={-17} width={1.2} height={17} fill="#877c63" />
      <ellipse cx={2} cy={-1.6} rx={7.4} ry={2.6} fill="#a79d85" />
      <ellipse cx={2} cy={-2.2} rx={6.4} ry={2} fill="#d6ccb3" />
      <path d="M8.2,-1.4 L10.6,-0.6" stroke="#8b8169" strokeWidth={1.2} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <ellipse cx={2} cy={-3.6 - i * 1.6} rx={3.8} ry={1.2} fill={i % 2 ? '#8a6d38' : '#a5854a'} />
          <ellipse cx={1.4} cy={-4 - i * 1.6} rx={2} ry={0.5} fill="#c9a864" opacity={0.7} />
        </g>
      ))}
      <path d="M-11,-13 L22,-8.4" stroke="#5f462d" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M-11,-13.8 L22,-9.2" stroke="#a8845d" strokeWidth={0.6} />
      <path d="M2,-8.2 L2,-10.6" stroke="#6a4e30" strokeWidth={1} />
      <path d="M20.6,-8.4 L20.6,-4.4" stroke="#c9b689" strokeWidth={0.5} />
      <rect x={17.4} y={-4.6} width={6.4} height={4.4} fill="#b3a88d" />
      <rect x={17.4} y={-4.6} width={6.4} height={1.2} fill="#ddd4bd" />
      <rect x={22.2} y={-4.6} width={1.6} height={4.4} fill="#877c63" />
      <g transform="translate(11.6,0.4)">
        <path d="M-1.8,0 C-2.6,-2 -2,-3.6 -1,-4 L-1.2,-4.8 L1.2,-4.8 L1,-4 C2,-3.6 2.6,-2 1.8,0 Z" fill="#8c552f" />
        <path d="M-1.8,0 C-2.6,-2 -2,-3.6 -1,-4 L-0.4,-4 C-1.2,-3 -1.4,-1.6 -0.8,0 Z" fill="#c98f5a" opacity={0.7} />
      </g>
    </g>
  )
}

/** hermès : pilier de marbre à tête barbue, rameau votif noué */
export function Hermes({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <Ombre rx={4.4} dx={3} />
      <rect x={-2.6} y={-1.6} width={5.2} height={1.6} fill="#c7bca2" />
      <rect x={-1.8} y={-13} width={3.6} height={11.4} fill="#e8e0cc" />
      <rect x={-1.8} y={-13} width={1.2} height={11.4} fill="#fbf7ec" />
      <rect x={0.9} y={-13} width={0.9} height={11.4} fill="#b5ab93" />
      <path d="M-1.8,-9 L-3,-9 L-3,-8 L-1.8,-8 M1.8,-9 L3,-9 L3,-8 L1.8,-8" fill="#d6ccb3" stroke="#d6ccb3" strokeWidth={0.4} />
      <circle cx={0} cy={-15} r={2.3} fill="#f1eadb" />
      <path d="M-1.8,-14.4 Q0,-11 1.8,-14.4" fill="#c9bfa6" />
      <path d="M-1.6,-16.4 a2,2 0 0 1 2.4,-0.8" stroke="#ffffff" strokeWidth={0.6} fill="none" />
      <path d="M-2.2,-16.8 Q0,-18.2 2.2,-16.8" stroke="#6f8354" strokeWidth={0.9} fill="none" />
      <path d="M1.9,-12.6 q0.8,2 0.2,3.6" stroke="#b0412e" strokeWidth={0.6} fill="none" />
    </g>
  )
}

/** pierre de l'assemblée : bloc à deux degrés d'où parlent les anciens */
export function PierreAssemblee({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <Ombre rx={9} dx={3} />
      <path d="M-8,0 L-8,-2.6 L6,-2.6 L6,0 Z" fill="#b8ad93" />
      <path d="M6,0 L6,-2.6 L8.6,-3.6 L8.6,-1 Z" fill="#8b8169" />
      <path d="M-8,-2.6 L-5.4,-3.6 L8.6,-3.6 L6,-2.6 Z" fill="#ddd4bd" />
      <path d="M-5,-3.6 L-5,-6 L4,-6 L4,-3.6 Z" fill="#c2b79d" />
      <path d="M4,-3.6 L4,-6 L6,-6.8 L6,-4.4 Z" fill="#938970" />
      <path d="M-5,-6 L-3,-6.8 L6,-6.8 L4,-6 Z" fill="#e8e0cc" />
      <path d="M-8,-2.7 L6,-2.7 M-5,-6.1 L4,-6.1" stroke="#fbf6ea" strokeWidth={0.5} />
      <path d="M-3,-1.4 l1.6,0 M1.6,-4.8 l1.4,0" stroke="#8b8169" strokeWidth={0.4} opacity={0.6} />
    </g>
  )
}

/** charbonnière : meule de bois couverte de terre, qui fume par ses évents */
export function Charbonniere({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={4} cy={1} rx={13} ry={3} fill={PAL.ombrePortee} opacity={0.22} />
      <ellipse cx={0} cy={0.4} rx={12} ry={2.8} fill="#3a2e22" />
      <path d="M-10.6,0 C-10.6,-6 -5,-10 0,-10 C5,-10 10.6,-6 10.6,0 Z" fill="#6b5a44" />
      <path d="M-10.6,0 C-10.6,-6 -5,-10 -0.6,-10 C-4,-8 -6,-4 -5.4,0 Z" fill="#8f7c5e" />
      <path d="M3,-9.6 C7,-8 10.6,-5 10.6,0 L6,0 C6.6,-4 5.6,-7 3,-9.6 Z" fill="#4e4032" />
      <path d="M-8,-3 q2,-0.8 3.4,0.2 M-3,-6.8 q1.6,-0.6 3,0 M3.4,-4 q1.4,-0.6 2.8,0.2" stroke="#a8946e" strokeWidth={0.5} fill="none" opacity={0.7} />
      {[[-4, -7.6], [3, -8.4], [6.6, -3.4]].map(([vx, vy], i) => (
        <g key={i}>
          <ellipse cx={vx} cy={vy} rx={0.9} ry={0.5} fill="#1c140c" />
          <ellipse cx={vx} cy={vy} rx={0.5} ry={0.3} fill="#e8732a" opacity={0.8}>
            <animate attributeName="opacity" values="0.8;0.3;0.8" dur={`${1.6 + i * 0.4}s`} repeatCount="indefinite" />
          </ellipse>
        </g>
      ))}
      <Fumee x={-4} y={-8} />
      <Fumee x={3} y={-9} />
      <path d="M11,-0.4 L15,-6 M12.4,0 L16.4,-5.4" stroke="#6a4e30" strokeWidth={0.8} />
      <path d="M14.6,-6.4 L16.8,-5" stroke="#6a4e30" strokeWidth={0.8} />
    </g>
  )
}

/** kouros ébauché couché sur ses cales, maillet et ciseau posés dessus */
export function Kouros({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={3} cy={1} rx={17} ry={2.6} fill={PAL.ombrePortee} opacity={0.2} />
      <rect x={-10} y={-2.4} width={3.4} height={2.4} fill="#8a6941" />
      <rect x={6} y={-2.4} width={3.4} height={2.4} fill="#7c5a30" />
      {/* le corps, encore pris dans sa gangue : tête, épaules, bras collés, jambes jointes */}
      <path d="M-15,-5.4 C-15.6,-7.4 -14,-9 -12,-8.8 C-10.4,-8.6 -10,-7.8 -9.6,-7.6 L-5,-8.8 C-2,-9 2,-8.4 5,-7.6 L12,-6.8 L14.6,-6.6 L14.6,-3.2 L12,-3 L5,-2.8 C2,-2.4 -2,-2.2 -5,-2.4 L-9.6,-3.2 C-10,-3 -10.4,-2.4 -12,-2.2 C-14,-2 -15.6,-3.4 -15,-5.4 Z" fill="#e2d9c2" />
      <path d="M-15,-5.4 C-15.6,-7.4 -14,-9 -12,-8.8 C-10.4,-8.6 -10,-7.8 -9.6,-7.6 L-5,-8.8 C-2,-9 2,-8.4 5,-7.6 L12,-6.8 L14.6,-6.6 L14.6,-5.6 L-15,-5.8 Z" fill="#fbf7ec" />
      <path d="M-5,-2.4 C-2,-2.2 2,-2.4 5,-2.8 L12,-3 L14.6,-3.2 L14.6,-4 L-9.6,-3.6 Z" fill="#b5ab93" />
      <path d="M-9.6,-7.6 L-9.6,-3.2 M5,-7.6 C6,-6 6,-4.4 5,-2.8 M-5,-7.8 L4,-7.4 M8,-5 L14.4,-5" stroke="#a79d85" strokeWidth={0.5} fill="none" />
      <path d="M-13.6,-6.2 q0.6,-0.6 1.2,0" stroke="#a79d85" strokeWidth={0.4} fill="none" />
      <path d="M-2,-4 l0.8,0.2 M1,-6 l0.6,0.3 M9,-4.4 l0.8,0.1 M-7,-5 l0.6,0.3" stroke="#bdb298" strokeWidth={0.5} />
      <g transform="translate(2,-9.4) rotate(-14)">
        <rect x={-0.4} y={-0.3} width={6} height={0.9} fill="#6b4c2a" />
        <rect x={-2.8} y={-1.2} width={2.6} height={2.6} rx={0.5} fill="#8a6941" />
      </g>
      <path d="M7.4,-9 L10.6,-8.2" stroke="#8a929b" strokeWidth={0.8} />
    </g>
  )
}

/** casque corinthien de bronze sur son poteau, cnémides appuyées au pied */
export function CasqueSupport({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <Ombre rx={5.4} dx={3} />
      <path d="M0,0 L0,-11" stroke="#6a4e30" strokeWidth={1.3} />
      <path d="M-0.4,0 L-0.4,-11" stroke="#b89468" strokeWidth={0.4} />
      <path d="M-3.6,-11 C-4,-15 -2.4,-17.6 0,-17.6 C2.4,-17.6 4,-15 3.6,-11 L2.2,-10.4 L1.2,-13 L-1.2,-13 L-2.2,-10.4 Z" fill="#b98034" />
      <path d="M-3.6,-11 C-4,-15 -2.4,-17.6 0,-17.6 C-1.6,-16.4 -2.4,-14 -2.2,-10.4 Z" fill="#f0cd84" />
      <path d="M1.4,-17.2 C3,-16 4,-14 3.6,-11 L2.6,-10.6 C3,-13 2.6,-15.4 1.4,-17.2 Z" fill="#7a4f18" />
      <path d="M-1.2,-13 L-1.4,-14.8 L1.4,-14.8 L1.2,-13 Z" fill="#241a0c" />
      <path d="M-4,-18 Q0,-22.6 4.4,-18.4 L3.6,-17.4 Q0,-20.8 -3.4,-17.2 Z" fill="#b0412e" />
      <path d="M-4,-18 Q-2,-20.6 0.6,-20.8" stroke="#e2735a" strokeWidth={0.6} fill="none" />
      <path d="M3.4,0 L4.6,-6 Q5.4,-7 6,-6 L5.2,0 Z" fill="#a8702a" />
      <path d="M3.4,0 L4.6,-6 Q4.9,-6.5 5.2,-6.4 L4.2,0 Z" fill="#e6b863" />
    </g>
  )
}

/** chaudrons de bronze (lébès) : la belle ouvrage que la forge vend */
export function Chaudrons({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const un = (cx: number, r: number, k: number) => (
    <g key={k}>
      <path d={`M${cx - r},${-r * 0.9} C${cx - r},0.2 ${cx + r},0.2 ${cx + r},${-r * 0.9} Z`} fill="#a8702a" />
      <path d={`M${cx - r},${-r * 0.9} C${cx - r},${-r * 0.2} ${cx - r * 0.4},0 ${cx - r * 0.2},0 C${cx - r * 0.7},${-r * 0.3} ${cx - r * 0.7},${-r * 0.7} ${cx - r * 0.6},${-r * 0.9} Z`} fill="#f0cd84" opacity={0.8} />
      <ellipse cx={cx} cy={-r * 0.9} rx={r} ry={r * 0.26} fill="#5a3a10" />
      <path d={`M${cx - r},${-r * 0.9} a${r},${r * 0.26} 0 0 1 ${r * 2},0`} stroke="#e0ad55" strokeWidth={0.6} fill="none" />
      <path d={`M${cx - r * 0.8},${-r * 1.1} a${r * 0.3},${r * 0.3} 0 1 1 ${r * 0.5},${-r * 0.1} M${cx + r * 0.8},${-r * 1.1} a${r * 0.3},${r * 0.3} 0 1 0 ${-r * 0.5},${-r * 0.1}`} stroke="#b98034" strokeWidth={0.6} fill="none" />
    </g>
  )
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <Ombre rx={9} dx={3} />
      {un(-3.4, 4.2, 0)}
      {un(4.6, 3.2, 1)}
    </g>
  )
}

/** pointes de lance forgées, alignées sur une natte */
export function PointesLance({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-7,0 L6,0 L8,-2.4 L-5,-2.4 Z" fill="#b39a6a" />
      <path d="M-7,0 L6,0 L6.4,-0.5 L-6.6,-0.5 Z" fill="#8a7350" />
      {[-4.4, -1.6, 1.2, 4].map((px, i) => (
        <g key={i} transform={`translate(${px},-1.2) rotate(-12)`}>
          <path d="M-2.4,0 L0,-0.9 L2.6,0 L0,0.9 Z" fill="#7d858d" />
          <path d="M-2.4,0 L0,-0.9 L2.6,0 Z" fill="#c9d0d6" />
          <path d="M-2.4,0 L-3.8,0" stroke="#5a616a" strokeWidth={0.6} />
        </g>
      ))}
    </g>
  )
}

/** puits : margelle de pierre, potence de bois et seau */
export function Puits({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={4} cy={1} rx={9} ry={2.4} fill={PAL.ombrePortee} opacity={0.2} />
      <path d="M-5.6,0 L-5.6,-4.6 A5.6,2 0 0 1 5.6,-4.6 L5.6,0 A5.6,2 0 0 1 -5.6,0 Z" fill="#c9bea3" />
      <path d="M1.4,1.9 A5.6,2 0 0 0 5.6,0 L5.6,-4.6 A5.6,2 0 0 1 1.4,-2.7 Z" fill="#978c73" />
      <path d="M-5.6,-4.6 L-5.6,0 A5.6,2 0 0 0 -3,1.7 L-3,-2.9 Z" fill="#e2dac6" />
      <path d="M-5,-2.2 q2,0.8 4,0.9 M1.4,-1 q2,-0.4 3.6,-1.4" stroke="#8b8169" strokeWidth={0.4} fill="none" opacity={0.6} />
      <ellipse cx={0} cy={-4.6} rx={5.6} ry={2} fill="#e8e0cc" />
      <ellipse cx={0} cy={-4.6} rx={4.2} ry={1.4} fill="#1f2a30" />
      <path d="M-4.8,-4.6 L-4.8,-15 M4.8,-4.6 L4.8,-15 M-5.6,-15 L5.6,-15" stroke="#6a4e30" strokeWidth={1.2} />
      <path d="M-5.1,-4.6 L-5.1,-15" stroke="#b89468" strokeWidth={0.4} />
      <path d="M0,-15 L0,-9.4" stroke="#c9b689" strokeWidth={0.4} />
      <path d="M-1.4,-9.4 L1.4,-9.4 L1,-7.4 L-1,-7.4 Z" fill="#7c5a30" />
    </g>
  )
}

/** autel domestique de Zeus Herkeios au milieu de la cour, flamme votive */
export function AutelDomestique({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <Ombre rx={5.6} dx={3} />
      <path d="M-3.6,0 L-3.6,-5.4 L3,-5.4 L3,0 Z" fill="#e2d9c2" />
      <path d="M-3.6,0 L-3.6,-5.4 L-2.2,-5.4 L-2.2,0 Z" fill="#fbf7ec" />
      <path d="M3,0 L3,-5.4 L4.8,-6.2 L4.8,-0.8 Z" fill="#b5ab93" />
      <path d="M-4.4,-5.4 L3.8,-5.4 L5.6,-6.2 L-2.6,-6.2 Z" fill="#f4eee0" />
      <path d="M-4.4,-5.2 L3.8,-5.2" stroke="#b0412e" strokeWidth={0.7} />
      <path d="M-2.4,-3 Q-0.4,-4 1.6,-3" stroke="#6f8354" strokeWidth={0.8} fill="none" />
      <Feu x={0.6} y={-6.2} r={1.8} />
    </g>
  )
}

/** meule à bras (va-et-vient) : pierre dormante, molette, farine */
export function MeuleBras({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <Ombre rx={7} dx={2.6} />
      <path d="M-6.4,0 L-5.6,-2.6 L5.4,-3.4 L6.6,-0.6 Z" fill="#8b8169" />
      <path d="M-5.6,-2.6 L5.4,-3.4 L4.6,-4.2 L-5,-3.4 Z" fill="#c9bfa6" />
      <path d="M-2.4,-3.6 L2.6,-4 L2.8,-5.8 L-2.2,-5.4 Z" fill="#a79d85" />
      <path d="M-2.4,-3.6 L-2.2,-5.4 L-1.2,-5.5 L-1.4,-3.7 Z" fill="#ddd4bd" />
      <ellipse cx={7.6} cy={-0.4} rx={2.6} ry={1} fill="#efe6d0" />
      <ellipse cx={7.2} cy={-0.8} rx={1.4} ry={0.5} fill="#fbf6ea" />
      <path d="M-8.6,0.6 C-9,-1.4 -8,-2.8 -6.8,-2.8 L-6.8,0.6 Z" fill="#b8964e" />
    </g>
  )
}
