import { T, Aire, OmbreSol, Charrette } from './primitives'

// ── SCIERIE ──────────────────────────────────────────────────────────────────
function Rondin({ x, y, l = 22, r = 3 }: { x: number; y: number; l?: number; r?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={-r} width={l} height={r * 2} rx={r} fill="#a3814f" stroke={T} strokeWidth={0.8} />
      <circle cx={l} cy={0} r={r - 0.4} fill="#d3b787" stroke={T} strokeWidth={0.7} />
      <circle cx={l} cy={0} r={(r - 0.4) * 0.5} fill="none" stroke="#a98e5f" strokeWidth={0.7} />
    </g>
  )
}

export function Scierie({ n }: { n: number }) {
  return (
    <g>
      <Aire rx={40} ry={13} fill="#bda67a" />
      <ellipse cx={6} cy={4} rx={22} ry={7} fill="#d8c9a2" opacity={0.7} />
      <g transform="translate(-24,2)">
        <OmbreSol rx={16} ry={4.6} dx={4} o={0.14} />
        <Rondin x={-14} y={-3} />
        <Rondin x={-12} y={-8.6} l={20} />
        <Rondin x={-9} y={-13.8} l={16} />
        {n >= 3 && <Rondin x={-7} y={-18.4} l={12} r={2.6} />}
      </g>
      <g transform="translate(8,0)">
        <path d="M-8,0 L-3,-9 L2,0 M8,0 L13,-9 L18,0" stroke="#7a5a35" strokeWidth={1.8} fill="none" />
        <Rondin x={-8} y={-10} l={26} r={2.6} />
        <path d="M4,-13 l3,-7" stroke="#9aa0a8" strokeWidth={1.6} />
        <path d="M7,-20 h4" stroke="#7a5a35" strokeWidth={2.2} />
      </g>
      <g transform="translate(30,8)">
        <circle r={4.6} fill="#a3814f" stroke={T} strokeWidth={0.9} />
        <circle r={2.2} fill="#d3b787" />
        <path d="M1,-3 l4,-7 l2.6,1.4 q-1,3 -3.4,3 Z" fill="#8f8a7c" stroke={T} strokeWidth={0.7} />
      </g>
      {n >= 2 && (
        <g transform="translate(2,-16)">
          <line x1={-16} y1={16} x2={-16} y2={-2} stroke="#7a5a35" strokeWidth={2.2} />
          <line x1={16} y1={16} x2={16} y2={-6} stroke="#7a5a35" strokeWidth={2.2} />
          <path d="M-20,-2 L20,-7 L20,-1.6 L-20,3.4 Z" fill="url(#p-chaume)" stroke={T} strokeWidth={1} />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={-12 + i} y={10 - i * 2.6} width={24} height={2.4} fill={i % 2 ? '#c9a875' : '#b8935c'} stroke={T} strokeWidth={0.6} />
          ))}
        </g>
      )}
      {n >= 3 && <Charrette x={-38} y={16} />}
      {n >= 4 && (
        <g transform="translate(26,-18)">
          <line x1={-10} y1={22} x2={0} y2={-8} stroke="#7a5a35" strokeWidth={2.6} />
          <line x1={10} y1={22} x2={0} y2={-8} stroke="#7a5a35" strokeWidth={2.6} />
          <line x1={0} y1={-8} x2={16} y2={-2} stroke="#7a5a35" strokeWidth={2} />
          <line x1={16} y1={-2} x2={16} y2={12} stroke="#5d4a33" strokeWidth={1} />
          <Rondin x={9} y={13} l={14} r={2.4} />
          <circle cx={16} cy={-2} r={1.6} fill="#8f8a7c" stroke={T} strokeWidth={0.7} />
        </g>
      )}
    </g>
  )
}
