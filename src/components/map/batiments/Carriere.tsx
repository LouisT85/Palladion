import { T, Aire, Bloc } from './primitives'

// ── CARRIÈRE ─────────────────────────────────────────────────────────────────
export function Carriere({ n }: { n: number }) {
  return (
    <g>
      <Aire rx={44} ry={13} fill="#b3ab90" />
      <g>
        <path d="M-42,6 L-38,-12 L-14,-20 L10,-14 L18,6 Z" fill="#9a9488" stroke={T} strokeWidth={1.1} />
        <path d="M-38,-12 L-14,-20 L10,-14 L6,-8 L-16,-13 L-34,-6 Z" fill="#aaa494" stroke="#7c766a" strokeWidth={0.8} />
        <path d="M-36,-2 L14,0" stroke="#7c766a" strokeWidth={1} opacity={0.8} />
        <path d="M-30,-8 L-16,-11 M-8,-11 L6,-7" stroke="#7c766a" strokeWidth={0.9} opacity={0.7} />
        <path d="M-12,4 L-10,-10 L4,-8 L4,4 Z" fill="#cfc8ba" stroke="#8c8577" strokeWidth={0.9} />
        <path d="M-8,-6 h9 M-8,-2 h9" stroke="#a89f8c" strokeWidth={0.8} />
      </g>
      <g transform="translate(14,2)">
        <line x1={0} y1={0} x2={7} y2={-9} stroke="#7a5a35" strokeWidth={1.6} />
        <path d="M5.6,-10.6 q3,-1.6 5,0.6 q-2.4,1.8 -4.4,1" fill="#8f8a7c" stroke={T} strokeWidth={0.7} />
      </g>
      <Bloc x={26} y={8} />
      {n >= 2 && (
        <g>
          <line x1={-30} y1={6} x2={-30} y2={-16} stroke="#7a5a35" strokeWidth={2} />
          <line x1={-12} y1={6} x2={-12} y2={-19} stroke="#7a5a35" strokeWidth={2} />
          <line x1={-33} y1={-10} x2={-9} y2={-14} stroke="#8a6a40" strokeWidth={2.2} />
          <g stroke="#8a6a40" strokeWidth={1.1}>
            <line x1={2} y1={5} x2={8} y2={-12} />
            <line x1={7} y1={5} x2={13} y2={-12} />
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1={3.5 + i * 1.4} y1={1 - i * 4} x2={8.5 + i * 1.4} y2={0 - i * 4} />
            ))}
          </g>
          <Bloc x={34} y={2} w={9} h={6} />
        </g>
      )}
      {n >= 3 && (
        <g>
          <path d="M18,14 L48,20" stroke="#c4ab80" strokeWidth={4} opacity={0.7} />
          <g transform="translate(34,16)">
            <rect x={-10} y={-3} width={20} height={3} fill="#93714a" stroke={T} strokeWidth={0.8} />
            <Bloc x={0} y={-3} w={13} h={9} />
            <circle cx={-7} cy={1} r={1.8} fill="#7a5a35" />
            <circle cx={0} cy={1} r={1.8} fill="#7a5a35" />
            <circle cx={7} cy={1} r={1.8} fill="#7a5a35" />
          </g>
        </g>
      )}
      {n >= 4 && (
        <g>
          {[0, 1].map((i) => (
            <g key={i} transform={`translate(${-30 + i * 15},${18 + i * 3})`}>
              <ellipse cx={0} cy={-7} rx={5.5} ry={2} fill="#d8d2c4" stroke={T} strokeWidth={0.8} />
              <path d="M-5.5,-7 L-5.5,0 A5.5,2 0 0 0 5.5,0 L5.5,-7" fill="#c2bcae" stroke={T} strokeWidth={0.8} />
            </g>
          ))}
          <g transform="translate(6,22) rotate(-8)">
            <rect x={-16} y={-5} width={32} height={7} rx={2} fill="#cfc8ba" stroke={T} strokeWidth={1} />
          </g>
        </g>
      )}
    </g>
  )
}
