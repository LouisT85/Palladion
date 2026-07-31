import { T, Aire, OmbreSol, Batisse, Tourelle, Porte, Fenetre, Feu, Ratelier, Banniere, Tente } from './primitives'

// ── CASERNE ──────────────────────────────────────────────────────────────────
function Mannequin({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={0} x2={0} y2={-11} stroke="#7a5a35" strokeWidth={2.2} />
      <line x1={-6} y1={-7.5} x2={6} y2={-7.5} stroke="#7a5a35" strokeWidth={1.8} />
      <circle cx={0} cy={-13.4} r={2.6} fill="#c9b696" stroke={T} strokeWidth={0.8} />
      <path d="M-2.6,-13.8 A2.6,2.6 0 0 1 2.6,-13.8" fill="#8f8a7c" />
      <circle cx={-6} cy={-7.5} r={2.8} fill="#8c6b3f" stroke="#5d4a33" strokeWidth={0.8} />
    </g>
  )
}

function Cible({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={-3.5} y1={0} x2={0} y2={-4} stroke="#7a5a35" strokeWidth={1.3} />
      <line x1={3.5} y1={0} x2={0} y2={-4} stroke="#7a5a35" strokeWidth={1.3} />
      <circle cx={0} cy={-9} r={5} fill="#ece5d2" stroke={T} strokeWidth={0.8} />
      <circle cx={0} cy={-9} r={3} fill="#c0563f" />
      <circle cx={0} cy={-9} r={1.2} fill="#ece5d2" />
      <line x1={1} y1={-9.6} x2={5} y2={-13} stroke="#5d4a33" strokeWidth={0.9} />
    </g>
  )
}

export function Caserne({ n }: { n: number }) {
  return (
    <g>
      <Aire rx={44} ry={14} fill="#c2a76f" />
      <ellipse cx={-12} cy={4} rx={24} ry={8.5} fill="#cdb27c" opacity={0.8} />
      <Mannequin x={-28} y={0} />
      <Mannequin x={-16} y={6} />
      <Ratelier x={-2} y={2} />
      {n === 1 && <Tente x={22} y={-2} w={26} h={16} c="#a8b090" />}
      {n === 2 && (
        <g transform="translate(24,-2)">
          <OmbreSol rx={16} ry={5.2} dx={5} />
          <Batisse w={30} h={13} g={8} mur="url(#p-bois)" toit="chaume" enfants={<Porte w={6.5} h={9.5} />} />
        </g>
      )}
      {n >= 3 && (
        <g transform="translate(24,-4)">
          <OmbreSol rx={18} ry={5.6} dx={5} />
          <Batisse
            w={34}
            h={16}
            g={9}
            mur="url(#p-pierre)"
            enfants={
              <>
                <Porte w={7} h={11} />
                <Fenetre x={-9} y={-4} w={4} h={4.6} />
                <Fenetre x={9} y={-4} w={4} h={4.6} />
              </>
            }
          />
          <g transform="translate(21,2)">
            <line x1={0} y1={0} x2={0} y2={-30} stroke="#5d4a33" strokeWidth={1.8} />
            <path d="M0,-30 L11,-26 L0,-22 Z" fill="#b3543f" stroke={T} strokeWidth={0.7} />
          </g>
        </g>
      )}
      {n >= 2 && <Cible x={-38} y={12} />}
      {n >= 2 && (
        <g transform="translate(8,14)">
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={i * 6} cy={0} r={3.2} fill="#8c6b3f" stroke="#5d4a33" strokeWidth={0.9} />
          ))}
        </g>
      )}
      {n >= 4 && (
        <g transform="translate(46,-14)">
          <OmbreSol rx={9} ry={3.4} dx={3.5} />
          <Tourelle w={15} h={24} mur="url(#p-pierre)" creneaux />
          <Banniere x={0} y={-36} c="#c9a441" />
        </g>
      )}
      {n >= 4 && <Feu x={-6} y={16} r={2.4} />}
    </g>
  )
}
