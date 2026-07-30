import type { BuildingId } from '../../game/types'

// ── Primitives réutilisables ─────────────────────────────────────────────────
function Ombre({ rx = 30, ry = 9, y = 4 }: { rx?: number; ry?: number; y?: number }) {
  return <ellipse cx={0} cy={y} rx={rx} ry={ry} fill="#000" opacity={0.13} />
}

function Flamme({ x = 0, y = 0, r = 3.5 }: { x?: number; y?: number; r?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={r} fill="#e8913c">
        <animate attributeName="r" values={`${r};${r * 1.35};${r}`} dur="0.9s" repeatCount="indefinite" />
      </circle>
      <circle r={r * 0.5} cy={-1} fill="#f5d06c" />
    </g>
  )
}

function Fumee({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`} fill="#d8d4c8">
      <circle r={3} opacity={0.6}>
        <animate attributeName="cy" values="0;-14" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle r={2.2} opacity={0.5}>
        <animate attributeName="cy" values="0;-12" dur="3s" begin="1.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0" dur="3s" begin="1.4s" repeatCount="indefinite" />
      </circle>
    </g>
  )
}

function Colonne({ x, h, w = 4 }: { x: number; h: number; w?: number }) {
  return (
    <g>
      <rect x={x - w / 2} y={-h} width={w} height={h} fill="#e6e0d0" stroke="#a89f8c" strokeWidth={0.7} />
      <rect x={x - w / 2 - 1} y={-h - 2.5} width={w + 2} height={3} fill="#d8d1c0" />
    </g>
  )
}

function Fronton({ w, y, fill = '#d8d1c0', trim = '#b3543f' }: { w: number; y: number; fill?: string; trim?: string }) {
  return (
    <g>
      <path d={`M${-w / 2},${y} L0,${y - w * 0.22} L${w / 2},${y} Z`} fill={fill} stroke="#a89f8c" strokeWidth={1} />
      <path d={`M${-w / 2},${y} L0,${y - w * 0.22} L${w / 2},${y}`} fill="none" stroke={trim} strokeWidth={1.4} />
    </g>
  )
}

function Banniere({ x = 0, y = 0, h = 24, c = '#b3543f' }: { x?: number; y?: number; h?: number; c?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={0} x2={0} y2={-h} stroke="#5d4a33" strokeWidth={2} />
      <path d={`M0,${-h} L13,${-h + 4.5} L0,${-h + 9} Z`} fill={c} />
    </g>
  )
}

function Olivier({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M0,0 C-2,-5 -3,-9 -1,-12" stroke="#7a5a35" strokeWidth={2.5} fill="none" />
      <ellipse cx={-1} cy={-15} rx={9} ry={6} fill="#75855a" />
      <ellipse cx={5} cy={-12} rx={6} ry={4.5} fill="#83936a" />
    </g>
  )
}

function ToitTuiles({ w, h, y }: { w: number; h: number; y: number }) {
  return (
    <g>
      <path d={`M${-w / 2 - 3},${y} L0,${y - h} L${w / 2 + 3},${y} Z`} fill="#b3543f" stroke="#8a3f30" strokeWidth={1} />
      <path d={`M${-w / 4},${y - h / 2} L0,${y - h} L${w / 4},${y - h / 2}`} fill="none" stroke="#c96a52" strokeWidth={1.2} />
    </g>
  )
}

// ── Bâtiments ────────────────────────────────────────────────────────────────
function Agora({ n }: { n: number }) {
  return (
    <g>
      <Ombre rx={40} ry={13} y={2} />
      <ellipse cx={0} cy={0} rx={40} ry={14} fill={n >= 4 ? '#e8e2d2' : n >= 2 ? '#cfc4a8' : '#c2a76f'} stroke="#a89f8c" strokeWidth={n >= 2 ? 1 : 0} />
      {n >= 2 && <ellipse cx={0} cy={0} rx={30} ry={10} fill="none" stroke="#b5ab93" strokeWidth={0.8} />}
      {/* autel central */}
      <rect x={-4} y={-10} width={8} height={8} fill="#b0a58e" stroke="#8c8270" strokeWidth={0.8} />
      {n >= 4 && <Flamme x={0} y={-12} r={2.6} />}
      {/* étals de marché */}
      {n >= 2 && (
        <g>
          <rect x={-32} y={-12} width={13} height={8} fill="#c9b696" />
          <path d="M-33,-12 L-25.5,-17 L-18,-12 Z" fill="#b3543f" />
          <rect x={18} y={-10} width={13} height={7} fill="#c9b696" />
          <path d="M17,-10 L24.5,-15 L32,-10 Z" fill="#7d9670" />
        </g>
      )}
      {/* stoa / colonnade */}
      {n >= 3 && (
        <g transform="translate(0,-14)">
          <rect x={-26} y={-2} width={52} height={3} fill="#cfc4a8" />
          {[-22, -8, 8, 22].map((x) => (
            <Colonne key={x} x={x} h={14} />
          ))}
          <rect x={-28} y={-19} width={56} height={4} fill="#d8d1c0" stroke="#a89f8c" strokeWidth={0.7} />
        </g>
      )}
      {/* statue du fondateur */}
      {n >= 3 && (
        <g transform="translate(30,-16)">
          <rect x={-4} y={4} width={8} height={5} fill="#b0a58e" />
          <circle cx={0} cy={-6} r={2.5} fill="#d8d1c0" />
          <path d="M-2.5,-4 L2.5,-4 L3,4 L-3,4 Z" fill="#d8d1c0" />
        </g>
      )}
      {n >= 4 && (
        <g>
          <Flamme x={-34} y={-14} r={2.2} />
          <Flamme x={34} y={-12} r={2.2} />
        </g>
      )}
    </g>
  )
}

function Temple({ n }: { n: number }) {
  if (n === 1) {
    return (
      <g>
        <Ombre rx={22} ry={7} />
        <path d="M14,0 C12,-8 10,-16 13,-24" stroke="#6b4d2e" strokeWidth={3.5} fill="none" />
        <ellipse cx={12} cy={-28} rx={13} ry={9} fill="#5d7247" />
        <rect x={-16} y={-9} width={12} height={9} fill="#b0a58e" stroke="#8c8270" strokeWidth={0.8} />
        <Flamme x={-10} y={-12} r={2.8} />
        <Fumee x={-10} y={-16} />
      </g>
    )
  }
  const w = n === 2 ? 40 : n === 3 ? 56 : 72
  const h = n === 2 ? 16 : n === 3 ? 21 : 26
  const cols = n === 2 ? [-12, 12] : n === 3 ? [-21, -7, 7, 21] : [-30, -18, -6, 6, 18, 30]
  return (
    <g>
      <Ombre rx={w / 2 + 8} ry={9} />
      {/* degrés */}
      <rect x={-w / 2 - 6} y={-3} width={w + 12} height={4} fill="#cfc8ba" stroke="#a89f8c" strokeWidth={0.7} />
      <rect x={-w / 2 - 3} y={-6} width={w + 6} height={3.5} fill="#d8d1c0" />
      {/* cella */}
      <rect x={-w / 2 + 6} y={-6 - h + 3} width={w - 12} height={h - 3} fill={n >= 4 ? '#efe9db' : '#e0d9c8'} />
      {n >= 4 && <rect x={-5} y={-6 - h + 6} width={10} height={h - 8} fill="#c9a441" opacity={0.9} />}
      {cols.map((x) => (
        <Colonne key={x} x={x} h={h} w={n >= 4 ? 5 : 4} />
      ))}
      <Fronton w={w + 8} y={-6 - h} fill={n >= 4 ? '#e8e2d2' : '#d8d1c0'} trim={n >= 4 ? '#c9a441' : '#b3543f'} />
      {/* autel devant */}
      <rect x={-4} y={2} width={8} height={5} fill="#b0a58e" />
      {n >= 3 && <Fumee x={0} y={-2} />}
      {n >= 4 && <Flamme x={0} y={0} r={2.4} />}
    </g>
  )
}

function Maisons({ n }: { n: number }) {
  if (n === 1) {
    return (
      <g>
        <Ombre rx={30} ry={9} />
        <path d="M-28,2 L-16,-16 L-4,2 Z" fill="#c9b696" stroke="#a08a68" strokeWidth={1} />
        <path d="M-16,-16 L-16,2" stroke="#a08a68" strokeWidth={1} />
        <path d="M6,3 L17,-13 L28,3 Z" fill="#bfa988" stroke="#a08a68" strokeWidth={1} />
        <Flamme x={-2} y={6} r={2.5} />
      </g>
    )
  }
  if (n === 2) {
    return (
      <g>
        <Ombre rx={34} ry={10} />
        <rect x={-30} y={-12} width={20} height={14} fill="#b3906b" stroke="#8c6f4e" strokeWidth={0.8} />
        <path d="M-33,-12 L-20,-22 L-7,-12 Z" fill="#c8b26a" stroke="#a3904f" strokeWidth={1} />
        <rect x={6} y={-10} width={18} height={12} fill="#b3906b" stroke="#8c6f4e" strokeWidth={0.8} />
        <path d="M3,-10 L15,-19 L27,-10 Z" fill="#c8b26a" stroke="#a3904f" strokeWidth={1} />
        <rect x={-24} y={-6} width={4} height={8} fill="#5d4a33" />
        <Fumee x={15} y={-20} />
      </g>
    )
  }
  return (
    <g>
      <Ombre rx={42} ry={12} />
      {/* maisons de pierre à toits de tuiles */}
      <g transform="translate(-24,0)">
        <rect x={-11} y={-13} width={22} height={14} fill="#d8cfc0" stroke="#a89f8c" strokeWidth={0.8} />
        <ToitTuiles w={22} h={9} y={-13} />
        <rect x={-4} y={-7} width={5} height={8} fill="#5d4a33" />
        <rect x={4} y={-9} width={4} height={4} fill="#6e675c" />
      </g>
      <g transform="translate(6,3)">
        <rect x={-10} y={-12} width={20} height={13} fill="#d3c9b8" stroke="#a89f8c" strokeWidth={0.8} />
        <ToitTuiles w={20} h={8} y={-12} />
        <rect x={-3} y={-6} width={5} height={7} fill="#5d4a33" />
      </g>
      <g transform="translate(30,-4)">
        <rect x={-9} y={-11} width={18} height={12} fill="#d8cfc0" stroke="#a89f8c" strokeWidth={0.8} />
        <ToitTuiles w={18} h={7} y={-11} />
      </g>
      {n >= 4 && (
        <g>
          {/* maison à étage + cour + olivier */}
          <g transform="translate(-30,-16)">
            <rect x={-8} y={-12} width={16} height={12} fill="#e0d9c8" stroke="#a89f8c" strokeWidth={0.8} />
            <ToitTuiles w={16} h={7} y={-12} />
            <rect x={-3} y={-8} width={4} height={4} fill="#6e675c" />
          </g>
          <path d="M14,8 L44,8" stroke="#b5ab93" strokeWidth={2.5} />
          <Olivier x={46} y={6} s={0.9} />
          <ellipse cx={-6} cy={9} rx={2.4} ry={3.2} fill="#a3673f" />
          <ellipse cx={0} cy={10} rx={2.4} ry={3.2} fill="#8c552f" />
          <Fumee x={-24} y={-24} />
        </g>
      )}
      {n === 3 && <Fumee x={-24} y={-20} />}
    </g>
  )
}

function Ferme({ n }: { n: number }) {
  return (
    <g>
      <Ombre rx={45} ry={12} y={6} />
      {/* champs */}
      <g>
        <rect x={-46} y={-8} width={38} height={20} rx={3} fill={n >= 3 ? '#d9b545' : '#c9a84c'} stroke="#a3904f" strokeWidth={0.8} />
        {[-4, 0, 4, 8].map((y) => (
          <line key={y} x1={-43} y1={y} x2={-11} y2={y} stroke="#b0913a" strokeWidth={1.2} />
        ))}
      </g>
      {n >= 2 && (
        <g>
          <rect x={-4} y={2} width={32} height={15} rx={3} fill="#c9a84c" stroke="#a3904f" strokeWidth={0.8} />
          {[6, 10, 14].map((y) => (
            <line key={y} x1={-1} y1={y} x2={25} y2={y} stroke="#b0913a" strokeWidth={1.1} />
          ))}
          {/* enclos */}
          <path d="M30,-10 L52,-10 L52,2 L30,2 Z" fill="none" stroke="#8c6f4e" strokeWidth={1.6} />
          <circle cx={38} cy={-4} r={2.6} fill="#e8e2d2" />
          <circle cx={45} cy={-6} r={2.6} fill="#d8cfc0" />
        </g>
      )}
      {/* hutte → grange */}
      {n < 3 ? (
        <g transform="translate(14,-14)">
          <rect x={-8} y={-8} width={16} height={9} fill="#b3906b" stroke="#8c6f4e" strokeWidth={0.8} />
          <path d="M-10,-8 L0,-15 L10,-8 Z" fill="#c8b26a" stroke="#a3904f" strokeWidth={0.8} />
        </g>
      ) : (
        <g transform="translate(16,-16)">
          <rect x={-14} y={-11} width={28} height={12} fill="#a3673f" stroke="#7d4e2f" strokeWidth={0.8} />
          <path d="M-16,-11 L0,-20 L16,-11 Z" fill="#c96a52" stroke="#8a3f30" strokeWidth={0.8} />
          <rect x={-4} y={-6} width={8} height={7} fill="#5d4a33" />
        </g>
      )}
      {n >= 3 && (
        <g>
          {/* bœufs */}
          <ellipse cx={-26} cy={16} rx={5} ry={3} fill="#7d6248" />
          <ellipse cx={-14} cy={18} rx={5} ry={3} fill="#6b533c" />
        </g>
      )}
      {n >= 4 && (
        <g>
          <Olivier x={44} y={-16} s={0.9} />
          <Olivier x={54} y={-6} s={0.75} />
          {/* grenier cylindrique */}
          <g transform="translate(36,-24)">
            <rect x={-6} y={-10} width={12} height={11} rx={2} fill="#d8cfc0" stroke="#a89f8c" strokeWidth={0.8} />
            <path d="M-7,-10 L0,-16 L7,-10 Z" fill="#c8b26a" />
          </g>
        </g>
      )}
    </g>
  )
}

function Scierie({ n }: { n: number }) {
  return (
    <g>
      <Ombre rx={32} ry={10} />
      {/* souche et rondins */}
      <circle cx={-22} cy={0} r={5} fill="#a3814f" stroke="#7a5a35" strokeWidth={1} />
      <circle cx={-22} cy={0} r={2.2} fill="#c9ab77" />
      <g>
        {[0, 1, 2, n >= 3 ? 3 : -1].filter((i) => i >= 0).map((i) => (
          <g key={i}>
            <rect x={-6 + (i % 2) * 3} y={-3 - i * 4.5} width={26} height={4.5} rx={2.2} fill={i % 2 ? '#a3814f' : '#8f6f42'} />
            <circle cx={22 + (i % 2) * 3} cy={-1 - i * 4.5} r={2.2} fill="#c9ab77" />
          </g>
        ))}
      </g>
      {n >= 2 && (
        <g transform="translate(4,-14)">
          <line x1={-14} y1={8} x2={-14} y2={-8} stroke="#7a5a35" strokeWidth={2.5} />
          <line x1={14} y1={8} x2={14} y2={-12} stroke="#7a5a35" strokeWidth={2.5} />
          <path d="M-18,-6 L18,-14 L20,-10 L-16,-2 Z" fill="#c8b26a" stroke="#a3904f" strokeWidth={0.8} />
          <rect x={-6} y={-2} width={14} height={2.5} fill="#9aa0a8" transform="rotate(-12 0 0)" />
        </g>
      )}
      {n >= 3 && (
        <g transform="translate(30,4)">
          <rect x={-8} y={-6} width={16} height={6} fill="#8c6f4e" />
          <circle cx={-5} cy={2} r={3} fill="#5d4a33" />
          <circle cx={5} cy={2} r={3} fill="#5d4a33" />
        </g>
      )}
      {n >= 4 && (
        <g transform="translate(-4,-20)">
          <line x1={-10} y1={14} x2={0} y2={-14} stroke="#7a5a35" strokeWidth={3} />
          <line x1={10} y1={14} x2={0} y2={-14} stroke="#7a5a35" strokeWidth={3} />
          <line x1={0} y1={-14} x2={14} y2={-10} stroke="#7a5a35" strokeWidth={2} />
          <line x1={14} y1={-10} x2={14} y2={2} stroke="#5d4a33" strokeWidth={1} />
          <rect x={8} y={2} width={12} height={3.5} rx={1.6} fill="#a3814f" />
        </g>
      )}
    </g>
  )
}

function Carriere({ n }: { n: number }) {
  return (
    <g>
      <Ombre rx={36} ry={10} y={6} />
      {/* front de taille */}
      <path d="M-36,6 L-30,-18 L-6,-24 L16,-14 L22,6 Z" fill="#9a9488" stroke="#6e675c" strokeWidth={1} />
      <path d="M-28,-2 L-12,-8 M-20,-12 L-2,-14 M2,-8 L14,-4" stroke="#7c766a" strokeWidth={1.2} fill="none" />
      {n >= 2 && (
        <g>
          <line x1={-30} y1={-18} x2={-30} y2={4} stroke="#7a5a35" strokeWidth={2} />
          <line x1={-14} y1={-22} x2={-14} y2={4} stroke="#7a5a35" strokeWidth={2} />
          <line x1={-32} y1={-8} x2={-12} y2={-12} stroke="#7a5a35" strokeWidth={1.6} />
          <path d="M22,6 L40,10" stroke="#c4ab80" strokeWidth={5} />
        </g>
      )}
      {n >= 3 && (
        <g>
          <rect x={24} y={-6} width={11} height={8} fill="#b5af9f" stroke="#6e675c" strokeWidth={0.8} />
          <rect x={28} y={-13} width={10} height={7} fill="#c2bcae" stroke="#6e675c" strokeWidth={0.8} />
          <rect x={36} y={-4} width={9} height={6} fill="#aaa494" stroke="#6e675c" strokeWidth={0.8} />
        </g>
      )}
      {n >= 4 && (
        <g>
          <circle cx={48} cy={2} r={5} fill="#c2bcae" stroke="#6e675c" strokeWidth={1} />
          <circle cx={48} cy={2} r={2} fill="#a89f8c" />
          <circle cx={58} cy={5} r={5} fill="#b5af9f" stroke="#6e675c" strokeWidth={1} />
          <rect x={40} y={-16} width={14} height={9} fill="#cfc8ba" stroke="#6e675c" strokeWidth={1} />
        </g>
      )}
    </g>
  )
}

function Forge({ n }: { n: number }) {
  return (
    <g>
      <Ombre rx={28} ry={9} />
      {n >= 2 && (
        <g>
          <rect x={-22} y={-16} width={40} height={17} fill="#c9b696" stroke="#a08a68" strokeWidth={0.8} />
          <path d="M-25,-16 L-2,-26 L21,-16 Z" fill={n >= 4 ? '#b3543f' : '#c8b26a'} stroke="#a3904f" strokeWidth={0.8} />
          <Fumee x={10} y={-27} />
        </g>
      )}
      {/* foyer */}
      <path d="M-18,1 A8,7 0 0 1 -4,1 Z" fill="#6e675c" />
      <Flamme x={-11} y={-3} r={3.2} />
      {/* enclume */}
      <g transform="translate(6,-2)">
        <rect x={-5} y={-3} width={10} height={3} fill="#3d3a36" />
        <rect x={-2} y={0} width={4} height={4} fill="#4a4642" />
      </g>
      {n === 1 && <Fumee x={-11} y={-8} />}
      {n >= 3 && (
        <g>
          {/* râtelier de lances */}
          {[24, 28, 32].map((x) => (
            <line key={x} x1={x} y1={2} x2={x + 3} y2={-16} stroke="#7a5a35" strokeWidth={1.6} />
          ))}
          {[24, 28, 32].map((x) => (
            <path key={x} d={`M${x + 3},-16 l1.4,-4 l1.6,3.4 Z`} fill="#c9a441" />
          ))}
        </g>
      )}
      {n >= 4 && (
        <g>
          <path d="M2,1 A7,6 0 0 1 14,1 Z" fill="#6e675c" />
          <Flamme x={8} y={-2} r={2.8} />
          <circle cx={-6} cy={-8} r={1} fill="#f5d06c">
            <animate attributeName="cy" values="-8;-18" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0" dur="1.4s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </g>
  )
}

function Caserne({ n }: { n: number }) {
  return (
    <g>
      <Ombre rx={36} ry={11} />
      {/* terrain d'exercice */}
      <ellipse cx={-14} cy={2} rx={22} ry={9} fill="#c2a76f" opacity={0.9} />
      {/* mannequin d'entraînement */}
      <g transform="translate(-22,-4)">
        <line x1={0} y1={6} x2={0} y2={-10} stroke="#7a5a35" strokeWidth={2.5} />
        <line x1={-6} y1={-6} x2={6} y2={-6} stroke="#7a5a35" strokeWidth={2} />
        <circle cx={0} cy={-13} r={3} fill="#c9b696" />
      </g>
      {/* râtelier */}
      <g transform="translate(-4,-6)">
        <line x1={-5} y1={8} x2={-5} y2={-6} stroke="#7a5a35" strokeWidth={2} />
        <line x1={5} y1={8} x2={5} y2={-6} stroke="#7a5a35" strokeWidth={2} />
        <line x1={-7} y1={-5} x2={7} y2={-5} stroke="#7a5a35" strokeWidth={1.6} />
        <line x1={-3} y1={-5} x2={-1} y2={7} stroke="#8f8a7c" strokeWidth={1.4} />
        <line x1={2} y1={-5} x2={4} y2={7} stroke="#8f8a7c" strokeWidth={1.4} />
      </g>
      {n >= 2 && (
        <g transform="translate(22,-6)">
          <rect x={-13} y={-10} width={26} height={13} fill="#b3906b" stroke="#8c6f4e" strokeWidth={0.8} />
          <path d="M-15,-10 L0,-19 L15,-10 Z" fill="#c8b26a" stroke="#a3904f" strokeWidth={0.8} />
          <rect x={-3} y={-5} width={6} height={8} fill="#5d4a33" />
          {/* cible */}
          <g transform="translate(-22,14)">
            <circle r={4.5} fill="#e0d9c8" />
            <circle r={2.6} fill="#b3543f" />
            <circle r={1} fill="#e0d9c8" />
          </g>
        </g>
      )}
      {n >= 3 && (
        <g transform="translate(22,-6)">
          <rect x={-13} y={-10} width={26} height={13} fill="#cfc8ba" stroke="#8c8577" strokeWidth={0.9} />
          <ToitTuiles w={26} h={9} y={-10} />
          <rect x={-3} y={-5} width={6} height={8} fill="#5d4a33" />
          <Banniere x={16} y={4} h={22} />
        </g>
      )}
      {n >= 4 && (
        <g transform="translate(36,-16)">
          <rect x={-6} y={-14} width={12} height={22} fill="#c2bcae" stroke="#6e675c" strokeWidth={1} />
          {[-6, 0].map((x) => (
            <rect key={x} x={x} y={-17} width={5} height={4} fill="#c2bcae" stroke="#6e675c" strokeWidth={0.8} />
          ))}
          <Banniere x={0} y={-17} h={14} c="#c9a441" />
        </g>
      )}
    </g>
  )
}

function Port({ n }: { n: number }) {
  return (
    <g>
      {/* ponton / quai (vers la mer, au sud-ouest) */}
      {n < 2 ? (
        <g>
          <rect x={-8} y={-4} width={40} height={7} rx={2} fill="#8c6f4e" transform="rotate(18 0 0)" />
          <path d="M-30,14 q8,6 18,0 l-3,6 q-6,4 -12,0 Z" fill="#8a6231" />
        </g>
      ) : (
        <g>
          <rect x={-10} y={-5} width={46} height={9} rx={1.5} fill="#aaa494" stroke="#6e675c" strokeWidth={0.9} transform="rotate(16 0 0)" />
          {n >= 3 && <rect x={-2} y={8} width={36} height={7} rx={1.5} fill="#9d9788" stroke="#6e675c" strokeWidth={0.8} transform="rotate(24 0 0)" />}
        </g>
      )}
      {/* embarcations */}
      {n === 1 && (
        <g transform="translate(-26,20)">
          <path d="M-10,0 Q0,6 12,0 L8,-3 L-7,-3 Z" fill="#7a5a35" />
        </g>
      )}
      {n === 2 && (
        <g transform="translate(-28,18)">
          <path d="M-14,0 Q0,7 16,0 L11,-4 L-10,-4 Z" fill="#7a5a35" />
          <line x1={0} y1={-4} x2={0} y2={-20} stroke="#5d4a33" strokeWidth={2} />
          <path d="M0,-19 L11,-8 L0,-8 Z" fill="#e0d9c8" />
        </g>
      )}
      {n >= 3 && (
        <g transform="translate(-30,20)">
          <path d="M-18,0 Q0,8 22,0 L16,-5 L-13,-5 Z" fill="#8a6231" stroke="#5d4a33" strokeWidth={0.8} />
          <circle cx={-11} cy={-2.5} r={1.4} fill="#e8e2d2" />
          <line x1={2} y1={-5} x2={2} y2={-24} stroke="#5d4a33" strokeWidth={2} />
          <path d="M2,-23 L16,-10 L2,-10 Z" fill={n >= 4 ? '#b3543f' : '#e0d9c8'} />
          {n >= 4 &&
            [-14, -8, -2, 4, 10].map((x) => <line key={x} x1={x} y1={0} x2={x - 3} y2={5} stroke="#5d4a33" strokeWidth={1.2} />)}
        </g>
      )}
      {/* entrepôt et phare */}
      {n >= 3 && (
        <g transform="translate(26,-12)">
          <rect x={-10} y={-8} width={20} height={10} fill="#c9b696" stroke="#a08a68" strokeWidth={0.8} />
          <path d="M-12,-8 L0,-15 L12,-8 Z" fill="#c8b26a" />
        </g>
      )}
      {n >= 3 && (
        <g transform="translate(44,-2)">
          <rect x={-4} y={-20} width={8} height={22} fill="#cfc8ba" stroke="#8c8577" strokeWidth={0.9} />
          <Flamme x={0} y={-23} r={2.6} />
        </g>
      )}
      {n >= 4 && (
        <g>
          <rect x={12} y={2} width={7} height={6} fill="#a3673f" />
          <rect x={20} y={4} width={7} height={6} fill="#8c552f" />
          <ellipse cx={34} cy={8} rx={2.6} ry={3.4} fill="#a3673f" />
        </g>
      )}
    </g>
  )
}

// ── Sélecteur ────────────────────────────────────────────────────────────────
export function BatimentArt({ id, level }: { id: BuildingId; level: number }) {
  switch (id) {
    case 'agora':
      return <Agora n={level} />
    case 'temple':
      return <Temple n={level} />
    case 'maisons':
      return <Maisons n={level} />
    case 'ferme':
      return <Ferme n={level} />
    case 'scierie':
      return <Scierie n={level} />
    case 'carriere':
      return <Carriere n={level} />
    case 'forge':
      return <Forge n={level} />
    case 'caserne':
      return <Caserne n={level} />
    case 'port':
      return <Port n={level} />
    case 'remparts':
      return null // dessinés par <Murailles/>
  }
}

/** échafaudage affiché pendant un chantier */
export function Chantier() {
  return (
    <g opacity={0.95}>
      <line x1={-16} y1={4} x2={-16} y2={-22} stroke="#7a5a35" strokeWidth={2} />
      <line x1={16} y1={4} x2={16} y2={-22} stroke="#7a5a35" strokeWidth={2} />
      <line x1={-18} y1={-20} x2={18} y2={-20} stroke="#7a5a35" strokeWidth={1.6} />
      <line x1={-18} y1={-8} x2={18} y2={-8} stroke="#7a5a35" strokeWidth={1.6} />
      <line x1={-16} y1={-20} x2={16} y2={-8} stroke="#8a6a40" strokeWidth={1} />
      <rect x={-8} y={-2} width={12} height={5} fill="#b5af9f" stroke="#6e675c" strokeWidth={0.7} />
    </g>
  )
}
