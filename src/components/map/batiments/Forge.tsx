import { T, Aire, OmbreSol, Batisse, Porte, Fumee, Ratelier } from './primitives'

// ── FORGE ────────────────────────────────────────────────────────────────────
export function Forge({ n }: { n: number }) {
  return (
    <g>
      <Aire rx={36} ry={12} fill="#bda67a" />
      {n >= 3 && (
        <g transform="translate(2,-4)">
          <OmbreSol rx={20} ry={6} dx={6} />
          <Batisse w={40} h={15} g={9} mur="url(#p-pierre)" enfants={<Porte w={9} h={12} x={8} />} />
          <rect x={-14} y={-30} width={5} height={9} fill="#8c8577" stroke={T} strokeWidth={0.8} />
          <Fumee x={-11.5} y={-31} />
        </g>
      )}
      {n === 2 && (
        <g transform="translate(2,-6)">
          <line x1={-18} y1={10} x2={-18} y2={-8} stroke="#7a5a35" strokeWidth={2.2} />
          <line x1={18} y1={10} x2={18} y2={-8} stroke="#7a5a35" strokeWidth={2.2} />
          <line x1={-14} y1={10} x2={-14} y2={-7} stroke="#7a5a35" strokeWidth={1.6} opacity={0.7} />
          <path d="M-22,-8 L22,-12 L22,-6.4 L-22,-2.4 Z" fill="url(#p-tuiles)" stroke={T} strokeWidth={1} />
        </g>
      )}
      <g transform="translate(-14,2)">
        <OmbreSol rx={9} ry={3.4} dx={3.5} o={0.15} />
        <path d="M-7,0 L-5.4,-13 L5.4,-13 L7,0 Z" fill="#a3673f" stroke={T} strokeWidth={1} />
        <path d="M-6,-4 h12 M-5.4,-8 h11" stroke="#7d4e2f" strokeWidth={0.9} />
        <path d="M-3,0 A3,3.4 0 0 1 3,0 Z" fill="#f2b04a" />
        <circle cx={0} cy={-1} r={1.6} fill="#f5d06c">
          <animate attributeName="opacity" values="1;0.5;1" dur="1.1s" repeatCount="indefinite" />
        </circle>
        {n < 3 && <Fumee x={0} y={-15} />}
      </g>
      <g transform="translate(4,3)">
        <circle r={3.6} fill="#a3814f" stroke={T} strokeWidth={0.9} />
        <path d="M-4,-3.4 L4,-3.4 L3,-5.8 L5.4,-5.8 L5.4,-7.6 L-4,-7.6 Z" fill="#4a4642" stroke={T} strokeWidth={0.8} />
        <line x1={6} y1={-9} x2={9} y2={-12} stroke="#7a5a35" strokeWidth={1.4} />
        <rect x={8} y={-14} width={3.4} height={2.6} rx={0.8} fill="#8f8a7c" stroke={T} strokeWidth={0.6} />
      </g>
      <g transform="translate(17,4)">
        <path d="M-3.6,0 L-3.6,-5 A3.6,1.4 0 0 1 3.6,-5 L3.6,0 Z" fill="#7a5a35" stroke={T} strokeWidth={0.8} />
        <ellipse cx={0} cy={-5} rx={3.6} ry={1.4} fill="#5f88a8" stroke={T} strokeWidth={0.7} />
      </g>
      {n >= 2 && (
        <g transform="translate(-28,-1)">
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${-4 + (i % 2) * 2},${-i * 2.8} l8,0 l-1.6,-2.4 l-4.8,0 Z`} fill="#d9b25a" stroke="#a3822e" strokeWidth={0.7} />
          ))}
        </g>
      )}
      {n >= 3 && <Ratelier x={26} y={-6} />}
      {n >= 4 && (
        <g>
          <g transform="translate(-30,10)">
            <path d="M-6,0 L-4.6,-11 L4.6,-11 L6,0 Z" fill="#a3673f" stroke={T} strokeWidth={1} />
            <path d="M-2.6,0 A2.6,3 0 0 1 2.6,0 Z" fill="#f2b04a" />
          </g>
          <g transform="translate(36,4)">
            <line x1={0} y1={0} x2={0} y2={-12} stroke="#7a5a35" strokeWidth={1.6} />
            <path d="M-4,-12 Q0,-15 4,-12 L3.4,-5.4 Q0,-3.4 -3.4,-5.4 Z" fill="#d9b25a" stroke="#8c6b3f" strokeWidth={0.9} />
          </g>
          <circle cx={-8} cy={-9} r={0.9} fill="#f5d06c">
            <animate attributeName="cy" values="-9;-18" dur="1.3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0" dur="1.3s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </g>
  )
}
