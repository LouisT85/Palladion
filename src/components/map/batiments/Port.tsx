import { T, OmbreSol, Batisse, Tourelle, Feu, Amphore, Caisse, Sac, Banniere } from './primitives'

// ── PORT ─────────────────────────────────────────────────────────────────────
function Barque({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-11,0 Q0,5.5 13,0 L9,-3.4 L-8,-3.4 Z" fill="#8a6231" stroke={T} strokeWidth={0.9} />
      <line x1={-6} y1={-3.4} x2={-6} y2={-1} stroke="#5d4a33" strokeWidth={0.9} />
      <line x1={2} y1={-3.4} x2={2} y2={-1} stroke="#5d4a33" strokeWidth={0.9} />
    </g>
  )
}

function Voilier({ x = 0, y = 0, s = 1, voileRouge }: { x?: number; y?: number; s?: number; voileRouge?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-16,0 Q0,7 19,0 L13,-4.6 L-12,-4.6 Z" fill="#93714a" stroke={T} strokeWidth={1} />
      <circle cx={-9.5} cy={-2.2} r={1.3} fill="#ece5d2" stroke={T} strokeWidth={0.5} />
      <line x1={1} y1={-4.6} x2={1} y2={-22} stroke="#5d4a33" strokeWidth={1.8} />
      <line x1={-8} y1={-19} x2={10} y2={-19} stroke="#5d4a33" strokeWidth={1.1} />
      <path d="M-7.4,-18.4 Q1,-13 9.4,-18.4 L9.4,-6.5 Q1,-9.5 -7.4,-6.5 Z" fill={voileRouge ? '#c96a52' : '#efe9db'} stroke={T} strokeWidth={0.8} />
      {voileRouge && <path d="M-5,-13 h10" stroke="#8a3f30" strokeWidth={1} />}
    </g>
  )
}

function Trireme({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-26,0 Q0,8 28,0 L30,-3 L22,-6 L-20,-6 L-28,-2.6 Z" fill="#8a6231" stroke={T} strokeWidth={1} />
      <path d="M-28,-2.6 L-33,-4.6 L-28,-5.4" fill="#75583a" stroke={T} strokeWidth={0.9} />
      <circle cx={-22} cy={-4} r={1.7} fill="#ece5d2" stroke={T} strokeWidth={0.6} />
      <circle cx={-22} cy={-4} r={0.7} fill="#1d3348" />
      {[-14, -7, 0, 7, 14].map((ox) => (
        <circle key={ox} cx={ox} cy={-5.4} r={2.2} fill={ox % 2 ? '#c9a441' : '#8c6b3f'} stroke="#5d4a33" strokeWidth={0.7} />
      ))}
      {[-16, -9, -2, 5, 12].map((ox) => (
        <line key={ox} x1={ox} y1={0} x2={ox - 3} y2={4.6} stroke="#5d4a33" strokeWidth={1} />
      ))}
      <line x1={2} y1={-6} x2={2} y2={-24} stroke="#5d4a33" strokeWidth={1.8} />
      <path d="M-6,-21 Q2,-16.6 10,-21 L10,-9.5 Q2,-12 -6,-9.5 Z" fill="#c96a52" stroke={T} strokeWidth={0.8} />
    </g>
  )
}

export function Port({ n }: { n: number }) {
  return (
    <g>
      <ellipse cx={14} cy={-4} rx={34} ry={11} fill="#d3bd8c" opacity={0.75} />
      {n < 2 ? (
        <g transform="rotate(19)">
          <rect x={-38} y={-4} width={44} height={7} rx={1.4} fill="url(#p-bois)" stroke={T} strokeWidth={1} />
          {[-32, -20, -8].map((px) => (
            <g key={px}>
              <line x1={px} y1={3} x2={px} y2={8} stroke="#5d4a33" strokeWidth={2.2} />
              <circle cx={px} cy={2.4} r={1.4} fill="#75583a" stroke={T} strokeWidth={0.6} />
            </g>
          ))}
        </g>
      ) : (
        <g transform="rotate(17)">
          <rect x={-44} y={-6} width={52} height={9} fill="url(#p-pierre)" stroke={T} strokeWidth={1.1} />
          <rect x={-44} y={3} width={52} height={3} fill="#a89f8c" stroke={T} strokeWidth={0.8} />
          {[-38, -24, -10].map((px) => (
            <rect key={px} x={px} y={-9.4} width={3.4} height={4} rx={1} fill="#75583a" stroke={T} strokeWidth={0.7} />
          ))}
        </g>
      )}
      <g transform="translate(30,-12)">
        <line x1={-8} y1={8} x2={-8} y2={-4} stroke="#7a5a35" strokeWidth={1.4} />
        <line x1={6} y1={8} x2={6} y2={-4} stroke="#7a5a35" strokeWidth={1.4} />
        <path d="M-8,-3 Q-1,0 6,-3 L6,4 Q-1,7 -8,4 Z" fill="none" stroke="#8c8270" strokeWidth={0.7} />
        <path d="M-8,0 Q-1,3 6,0 M-5,-3.6 L-5,4.6 M-1,-2.6 L-1,5.6 M3,-3.2 L3,5" stroke="#8c8270" strokeWidth={0.6} fill="none" />
      </g>
      {n === 1 && <Barque x={-34} y={24} />}
      {n === 2 && <Voilier x={-36} y={26} s={0.95} />}
      {n === 3 && <Voilier x={-38} y={28} voileRouge />}
      {n >= 4 && <Trireme x={-40} y={30} />}
      {n >= 3 && <Barque x={-12} y={34} s={0.8} />}
      <Caisse x={12} y={-2} />
      <Amphore x={19} y={-1} s={0.9} />
      <Amphore x={23} y={1} c="#8c552f" s={0.8} />
      {n >= 2 && <Sac x={7} y={2} />}
      {n >= 2 && (
        <g transform="translate(38,2)">
          <circle r={3.2} fill="none" stroke="#a3894a" strokeWidth={2.2} />
        </g>
      )}
      {n >= 3 && (
        <g transform="translate(30,-24)">
          <OmbreSol rx={15} ry={5} dx={4.5} />
          <Batisse w={28} h={13} g={7.5} mur="url(#p-torchis)" enfants={<rect x={-5} y={-9} width={10} height={9} fill="#5d4426" stroke={T} strokeWidth={0.8} />} />
        </g>
      )}
      {n >= 3 && (
        <g transform="translate(54,-6)">
          <OmbreSol rx={7} ry={2.8} dx={3} />
          <Tourelle w={11} h={n >= 4 ? 30 : 22} mur="url(#p-pierre)" />
          <Feu x={0} y={n >= 4 ? -40 : -32} r={2.6} />
        </g>
      )}
      {n >= 4 && (
        <g>
          <Caisse x={4} y={8} s={1.1} />
          <Caisse x={12} y={10} s={0.9} />
          <Amphore x={30} y={6} />
          <Banniere x={62} y={-2} c="#4fa3a5" />
        </g>
      )}
    </g>
  )
}
