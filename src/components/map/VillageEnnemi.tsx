import type { VillageCible } from '../../game/expeditions'
import type { SaisonId } from '../../game/saisons'
import { AOBase, Batisse3D, Colonne3D, PAL, Porte3D, alea } from './art'

/*
 * ═══════════════ LES PLACES FORTES DE LA TROADE ═══════════════
 *
 * Les scènes d'assaut se contentaient de deux rectangles et d'un tas de
 * marchandises : un camp de pillards ressemblait à une citadelle. Chaque cible
 * a désormais son décor peint — tentes de peaux, comptoir à amphores, cité à
 * colonnade, forteresse à donjon — et son cadre : plaine, colline, grève ou île.
 *
 * Mêmes conventions que la carte du village : soleil au nord-ouest, ombres
 * portées vers le sud-est, aucun contour noir, tirages déterministes (alea).
 */

type Decor = VillageCible['decor']
type Terrain = VillageCible['terrain']

// ── Le cadre : ce qu'il y a derrière et autour de l'enceinte ─────────────────

const CIELS: Record<SaisonId, [string, string, string]> = {
  printemps: ['#79b0d2', '#a5cdd9', '#dbe8dc'],
  ete: ['#6fa8cf', '#b6d2d4', '#eee2b8'],
  automne: ['#7c9fb8', '#c2c4b4', '#e7d9b4'],
  hiver: ['#5f7488', '#93a7b2', '#cfd8dc'],
}
const SOLS: Record<SaisonId, [string, string]> = {
  printemps: ['#9db463', '#7d9450'],
  ete: ['#c3b477', '#a49962'],
  automne: ['#b79a5c', '#96803f'],
  hiver: ['#c3cbc6', '#9daaa5'],
}

/** ligne de crête tirée une fois, propre à chaque type de terrain */
function crete(seed: number, sommets: number, hMin: number, hMax: number): string {
  const rnd = alea(seed)
  let d = 'M0,150'
  for (let i = 0; i <= sommets; i++) {
    const x = (900 * i) / sommets
    const y = hMin + rnd() * (hMax - hMin)
    d += ` L${x.toFixed(0)},${y.toFixed(0)}`
  }
  return `${d} L900,150 Z`
}
const CRETE_PLAINE = crete(7, 7, 74, 116)
const CRETE_COLLINE = crete(19, 6, 40, 96)
const CRETE_ILE = crete(31, 8, 96, 128)

/** décor de fond : ciel, reliefs, sol et, s'il y a lieu, la mer */
export function DecorExpedition({ v, saison }: { v: VillageCible; saison: SaisonId }) {
  const [c0, c1, c2] = CIELS[saison]
  const [s0, s1] = SOLS[saison]
  const t: Terrain = v.terrain
  const hiver = saison === 'hiver'
  return (
    <g>
      <defs>
        <linearGradient id="xp-ciel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c0} />
          <stop offset="60%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        <linearGradient id="xp-sol" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={s0} />
          <stop offset="100%" stopColor={s1} />
        </linearGradient>
        <linearGradient id="xp-mer" x1="0.9" y1="0" x2="0.1" y2="1">
          <stop offset="0%" stopColor="#69bcbc" />
          <stop offset="45%" stopColor="#3d8ca3" />
          <stop offset="100%" stopColor="#1a4a63" />
        </linearGradient>
      </defs>

      <rect x={0} y={0} width={900} height={152} fill="url(#xp-ciel)" />
      {/* reliefs lointains, voilés par la distance */}
      <path d={t === 'colline' ? CRETE_COLLINE : t === 'ile' ? CRETE_ILE : CRETE_PLAINE} fill="#8b9c96" opacity={0.75} />
      <path
        d={t === 'colline' ? CRETE_COLLINE : t === 'ile' ? CRETE_ILE : CRETE_PLAINE}
        fill="#c7d2d0"
        opacity={0.4}
        transform="translate(0,7)"
      />
      {hiver && <rect x={0} y={60} width={900} height={92} fill="#e6eff4" opacity={0.3} />}

      <rect x={0} y={148} width={900} height={412} fill="url(#xp-sol)" />

      {/* la mer : bande au sud pour une grève, tout autour pour une île */}
      {t === 'cote' && (
        <g>
          <path d="M0,470 C160,452 330,470 470,500 C600,528 760,520 900,536 L900,560 L0,560 Z" fill="#e0cb99" />
          <path d="M0,492 C160,476 330,494 470,522 C610,548 760,540 900,552 L900,560 L0,560 Z" fill="url(#xp-mer)" />
          <path
            d="M0,492 C160,476 330,494 470,522 C610,548 760,540 900,552"
            stroke="#f2faf6"
            strokeWidth={2}
            fill="none"
            strokeDasharray="18 10 30 12"
            opacity={0.8}
          />
        </g>
      )}
      {t === 'ile' && (
        <g>
          <rect x={0} y={148} width={900} height={412} fill="url(#xp-mer)" />
          <ellipse cx={440} cy={330} rx={392} ry={196} fill="#d8c495" />
          <ellipse cx={438} cy={326} rx={368} ry={180} fill="url(#xp-sol)" />
          <ellipse
            cx={440}
            cy={330}
            rx={392}
            ry={196}
            fill="none"
            stroke="#f2faf6"
            strokeWidth={2.4}
            strokeDasharray="20 12 34 14"
            opacity={0.7}
          />
          {/* houle au large */}
          <path
            d="M40,214 q22,-7 44,0 M760,232 q22,-7 44,0 M96,470 q22,-7 44,0 M726,486 q22,-7 44,0"
            stroke="#bfe4e2"
            strokeWidth={1.6}
            fill="none"
            opacity={0.5}
          />
        </g>
      )}
      {t === 'colline' && (
        <g opacity={0.5}>
          {/* terrasses de culture accrochées à la pente */}
          {[196, 226, 256].map((y, i) => (
            <path
              key={y}
              d={`M0,${y} C220,${y - 12} 620,${y + 10} 900,${y - 6}`}
              stroke={i % 2 ? '#8b9a56' : '#a2ab6a'}
              strokeWidth={9}
              fill="none"
            />
          ))}
        </g>
      )}

      {/* aire de terre battue autour de l'enceinte, plus dense devant la porte */}
      <ellipse cx={440} cy={330} rx={330} ry={150} fill="#c2b380" opacity={0.28} />
      <path
        d="M900,382 C 800,362 742,338 676,322"
        stroke="#c9b085"
        strokeWidth={17}
        fill="none"
        strokeLinecap="round"
        opacity={0.9}
      />
      <path
        d="M898,376 C 802,357 744,333 678,317"
        stroke="#dcc89c"
        strokeWidth={2.6}
        fill="none"
        opacity={0.5}
        strokeDasharray="16 12 26 10"
      />
    </g>
  )
}

// ── Menus objets réutilisés d'un décor à l'autre ─────────────────────────────

function Feu({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={1.5} cy={1} rx={9} ry={3} fill={PAL.ombrePortee} opacity={0.16} />
      <ellipse cx={0} cy={0.5} rx={7.5} ry={2.6} fill="#6b6152" />
      <path d="M-6,0 L-1,-4 M6,0 L1,-4 M-4,0 L4,-3" stroke="#5f462d" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M0,-3 q4,-4 1.6,-9 q4,4 1.4,9 Z" fill="#e8913c">
        <animate attributeName="opacity" values="1;0.72;1" dur="0.9s" repeatCount="indefinite" />
      </path>
      <path d="M-0.6,-3 q-3.4,-3.4 -1,-7.6 q-3,3.6 -1.2,7.6 Z" fill="#f2b04a" />
      <path d="M0.2,-4 q1.6,-2 0.6,-4.4 q1.8,2 0.5,4.4 Z" fill="#fbe08d" />
      {/* fumée qui monte et se dilue */}
      <g opacity={0.35}>
        <circle cx={1} cy={-14} r={3.4} fill="#cfc7b4">
          <animate attributeName="cy" values="-12;-30" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.45;0" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx={-1.6} cy={-18} r={2.6} fill="#cfc7b4">
          <animate attributeName="cy" values="-16;-36" dur="5s" begin="1.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0" dur="5s" begin="1.2s" repeatCount="indefinite" />
        </circle>
      </g>
    </g>
  )
}

function Tente({ x, y, l = 30, h = 22, teinte = '#a98a5f' }: { x: number; y: number; l?: number; h?: number; teinte?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={l * 0.62} ry={l * 0.17} cy={1.5} />
      <ellipse cx={l * 0.3} cy={2} rx={l * 0.7} ry={l * 0.19} fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou2)" />
      {/* peaux cousues tendues sur une perche : pan ouest au soleil, pan est ombré */}
      <path d={`M${-l / 2},0 L0,${-h} L${l * 0.12},0 Z`} fill={teinte} />
      <path d={`M${l * 0.12},0 L0,${-h} L${l / 2},0 Z`} fill="#7a6142" />
      <path d={`M${-l / 2},0 L0,${-h} L${-l * 0.2},0 Z`} fill="#c4a578" />
      {/* coutures et pièces rapportées */}
      <path d={`M${-l * 0.3},${-h * 0.35} L${-l * 0.08},${-h * 0.62}`} stroke="#8a7049" strokeWidth={0.9} />
      <path d={`M${l * 0.24},${-h * 0.32} L${l * 0.06},${-h * 0.6}`} stroke="#63503a" strokeWidth={0.9} />
      {/* perche faîtière et piquets */}
      <path d={`M0,${-h} L0,${-h - 5}`} stroke="#5f462d" strokeWidth={1.6} />
      <path d={`M${-l / 2},0 l-4,3 M${l / 2},0 l4,3`} stroke="#5f462d" strokeWidth={1.2} />
      {/* entrée relevée, pénombre à l'intérieur */}
      <path d={`M${-l * 0.1},0 L0,${-h * 0.55} L${l * 0.1},0 Z`} fill="#2e2216" />
    </g>
  )
}

function Amphores({ x, y, n = 4 }: { x: number; y: number; n?: number }) {
  const rnd = alea(x + y)
  return (
    <g transform={`translate(${x},${y})`}>
      {Array.from({ length: n }, (_, i) => {
        const dx = (i - (n - 1) / 2) * 9 + (rnd() - 0.5) * 2
        const s = 0.9 + rnd() * 0.3
        return (
          <g key={i} transform={`translate(${dx.toFixed(1)},0) scale(${s.toFixed(2)})`}>
            <ellipse cx={1.4} cy={0.8} rx={4.4} ry={1.5} fill={PAL.ombrePortee} opacity={0.16} />
            <path d="M0,0 q-4.2,-3 -3.4,-8 q0.6,-4 3.4,-6 q2.8,2 3.4,6 q0.8,5 -3.4,8 Z" fill="#a3673f" />
            <path d="M0,0 q-4.2,-3 -3.4,-8 q0.6,-4 3.4,-6 q-1.4,4 -1.6,8 q-0.2,3.6 1.6,6 Z" fill="#c48450" />
            <path d="M-1.6,-14 h3.2 v1.6 h-3.2 Z" fill="#8c552f" />
            <path d="M-2.6,-12.6 q-2,1.6 -1.4,3.6 M2.6,-12.6 q2,1.6 1.4,3.6" stroke="#8c552f" strokeWidth={0.9} fill="none" />
          </g>
        )
      })}
    </g>
  )
}

function Butin({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={2} cy={3} rx={17} ry={5} fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou1)" />
      {/* coffre bardé de bronze, couvercle entrouvert sur l'or */}
      <path d="M-13,2 L-13,-7 L11,-7 L11,2 Z" fill="#8c6b3f" />
      <path d="M-13,-7 L-11,-11 L13,-11 L11,-7 Z" fill="#a8845d" />
      <path d="M11,-7 L13,-11 L13,-2 L11,2 Z" fill="#5f462d" />
      <path d="M-13,-3.4 L11,-3.4" stroke="#c9a441" strokeWidth={1.4} />
      <path d="M-2,-7 L-2,2" stroke="#c9a441" strokeWidth={1.2} />
      {/* jarres et lingots posés à côté */}
      <ellipse cx={-19} cy={-2} rx={3.4} ry={5} fill="#a3673f" />
      <ellipse cx={-20} cy={-3.4} rx={1.8} ry={2.6} fill="#c48450" />
      <path d="M17,2 q3,-2.4 6,0 q-3,1.6 -6,0 Z" fill="#c9922f" />
      <path d="M18,-1 q2.6,-2 5.2,0 q-2.6,1.4 -5.2,0 Z" fill="#e0b256" />
    </g>
  )
}

function Cypres({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={5} cy={0.6} rx={7} ry={2} fill={PAL.ombrePortee} opacity={0.15} />
      <path d="M-1,-1 L1,-1 L0.8,1 L-0.8,1 Z" fill="#6a4e31" />
      <path d="M0,-30 C5,-19 5.6,-9 0,-3 C-5.6,-9 -5,-19 0,-30 Z" fill="#2f4a34" />
      <path d="M0,-29 C-4.6,-19 -4.4,-10 -0.4,-4 C-2.6,-10 -2.4,-19 0,-29 Z" fill="#4b6a43" />
      <path d="M-0.7,-27 C-3.5,-19 -3.4,-12 -1.3,-6.5 C-2.3,-12 -2.1,-19 -0.7,-27 Z" fill="#68855a" />
    </g>
  )
}

function Etendard({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={1} x2={0} y2={-26} stroke="#5d4a33" strokeWidth={1.8} />
      <line x1={-0.6} y1={0} x2={-0.6} y2={-25.4} stroke="#8a6b45" strokeWidth={0.7} opacity={0.8} />
      <circle cx={0} cy={-27} r={1.5} fill={PAL.or} />
      <path d="M1,-25.6 Q8,-28 15,-24 L12.6,-18.6 Q7,-21.6 1,-19 Z" fill={c} />
      <path d="M1,-25.6 Q8,-28 15,-24 L14.2,-22.4 Q7.6,-26 1,-23.6 Z" fill="#fbf3dd" opacity={0.3} />
    </g>
  )
}

// ── Les huit cœurs de village ────────────────────────────────────────────────

/** ce que l'on voit DANS l'enceinte — ancré sur la place du village visé */
export function CoeurVillage({ decor }: { decor: Decor }) {
  switch (decor) {
    case 'camp':
      return (
        <g>
          <ellipse cx={0} cy={12} rx={150} ry={48} fill="#b8a476" opacity={0.4} />
          <Tente x={-92} y={4} l={34} h={25} />
          <Tente x={-30} y={16} l={40} h={29} teinte="#b0895b" />
          <Tente x={38} y={2} l={30} h={22} teinte="#9c7f56" />
          <Tente x={96} y={18} l={36} h={26} />
          <Feu x={-4} y={-16} s={1.15} />
          {/* râtelier de lances et boucliers pris à d'autres */}
          <g transform="translate(74,-14)">
            <path d="M-14,0 L14,0" stroke="#5f462d" strokeWidth={2.2} />
            <path d="M-12,0 L-13,-22 M-5,0 L-5.6,-24 M3,0 L3.4,-21 M11,0 L12,-23" stroke="#6b4c2a" strokeWidth={1.6} />
            <path d="M-13,-22 l-1.4,-4 l2.6,0 Z M-5.6,-24 l-1.4,-4 l2.6,0 Z M3.4,-21 l-1.4,-4 l2.6,0 Z" fill="#c8ced4" />
          </g>
          <Butin x={4} y={40} />
          <ellipse cx={-118} cy={40} rx={9} ry={5} fill="#8a7049" />
        </g>
      )

    case 'hameau':
      return (
        <g>
          <ellipse cx={0} cy={14} rx={150} ry={46} fill="#b3a878" opacity={0.35} />
          <g transform="translate(-86,4)">
            <Batisse3D w={40} h={20} g={11} prof={10} mat="bois" toit="chaume" />
          </g>
          <g transform="translate(-12,20)">
            <Batisse3D w={52} h={24} g={13} prof={12} mat="bois" toit="chaume" enfants={<Porte3D w={9} h={13} />} />
          </g>
          <g transform="translate(74,2)">
            <Batisse3D w={36} h={18} g={10} prof={9} mat="bois" toit="chaume" />
          </g>
          {/* muret de pierre sèche et enclos à chèvres */}
          <path d="M-140,34 q40,-8 84,0 q46,8 96,-2" stroke="#a49a83" strokeWidth={6} fill="none" strokeLinecap="round" />
          <path d="M-140,32 q40,-8 84,0 q46,8 96,-2" stroke="#c8bfa8" strokeWidth={2} fill="none" />
          <g transform="translate(112,36)">
            {[0, 13, 25].map((dx) => (
              <g key={dx} transform={`translate(${dx},0)`}>
                <ellipse cx={1.4} cy={0.6} rx={4.4} ry={1.3} fill={PAL.ombrePortee} opacity={0.14} />
                <ellipse cx={0} cy={-3} rx={4.2} ry={2.6} fill="#cfc4ab" />
                <circle cx={4} cy={-4.4} r={1.7} fill="#8c8270" />
                <path d="M5.4,-5.6 l1.4,-1" stroke="#6f6656" strokeWidth={0.8} />
              </g>
            ))}
          </g>
          <Feu x={-46} y={-6} s={0.85} />
          <Butin x={30} y={44} />
        </g>
      )

    case 'comptoir':
      return (
        <g>
          <ellipse cx={0} cy={14} rx={155} ry={48} fill="#c0b078" opacity={0.35} />
          {/* entrepôt à toit plat, façade blanchie à la chaux */}
          <g transform="translate(-52,16)">
            <AOBase rx={52} ry={13} cy={2} />
            <path d="M-52,0 L-52,-34 L52,-34 L52,0 Z" fill="url(#a-stuc-l)" />
            <path d="M52,0 L60,-5 L60,-38 L52,-34 Z" fill="url(#a-stuc-o)" />
            <path d="M-54,-34 L-54,-39 L62,-39 L62,-34 Z" fill={PAL.pierreLit} />
            <path d="M-54,-39 L-46,-43 L70,-43 L62,-39 Z" fill={PAL.marbreLit} />
            <path d="M-52,-31 L52,-31" stroke={PAL.pierreJoint} strokeWidth={0.9} opacity={0.4} strokeDasharray="7 5" />
            <Porte3D w={13} h={19} x={-14} />
            {/* volets de bois et grande baie de chargement */}
            <rect x={14} y={-26} width={22} height={16} fill="#3a2c1c" />
            <rect x={14} y={-26} width={22} height={2.4} fill="#8c6b3f" />
          </g>
          <Amphores x={62} y={16} n={5} />
          <Amphores x={70} y={34} n={4} />
          {/* balance du changeur et caisses cerclées */}
          <g transform="translate(-6,42)">
            <line x1={0} y1={0} x2={0} y2={-20} stroke="#6b4c2a" strokeWidth={2} />
            <line x1={-11} y1={-20} x2={11} y2={-20} stroke="#8a6b2e" strokeWidth={1.6} />
            <path d="M-14,-16 q3,4 6,0 Z M8,-16 q3,4 6,0 Z" fill="#c9a441" />
          </g>
          <Butin x={-118} y={40} />
        </g>
      )

    case 'village':
      return (
        <g>
          <ellipse cx={0} cy={14} rx={155} ry={48} fill="#b6a870" opacity={0.35} />
          <g transform="translate(-96,2)">
            <Batisse3D w={44} h={24} g={12} prof={11} mat="stuc" toit="tuiles" />
          </g>
          <g transform="translate(-24,22)">
            <Batisse3D w={58} h={30} g={15} prof={13} mat="pierre" toit="tuiles" enfants={<Porte3D w={10} h={15} />} />
          </g>
          <g transform="translate(56,4)">
            <Batisse3D w={40} h={22} g={12} prof={10} mat="stuc" toit="tuiles" />
          </g>
          <g transform="translate(112,26)">
            <Batisse3D w={34} h={18} g={10} prof={9} mat="stuc" toit="chaume" />
          </g>
          {/* puits de la place, margelle et treuil */}
          <g transform="translate(4,46)">
            <ellipse cx={2} cy={2} rx={13} ry={4.4} fill={PAL.ombrePortee} opacity={0.16} />
            <ellipse cx={0} cy={0} rx={11} ry={4} fill={PAL.pierreMi} />
            <ellipse cx={0} cy={-2} rx={11} ry={4} fill={PAL.pierreLit} />
            <ellipse cx={0} cy={-2} rx={7} ry={2.4} fill="#2a2117" />
            <path d="M-9,-3 L-9,-16 M9,-3 L9,-16 M-10,-16 L10,-16" stroke="#6b4c2a" strokeWidth={2} />
            <path d="M0,-16 L0,-9" stroke="#5d4a33" strokeWidth={0.9} />
            <rect x={-2.4} y={-9} width={4.8} height={3.4} fill="#7c5a30" />
          </g>
          <Cypres x={-136} y={30} s={0.95} />
          <Butin x={78} y={46} />
        </g>
      )

    case 'fort':
      return (
        <g>
          <ellipse cx={0} cy={14} rx={155} ry={48} fill="#a89c74" opacity={0.4} />
          {/* baraquements longs, charpente apparente */}
          <g transform="translate(-70,14)">
            <Batisse3D w={82} h={22} g={10} prof={14} mat="bois" toit="bois" />
          </g>
          <g transform="translate(48,26)">
            <Batisse3D w={66} h={20} g={9} prof={12} mat="bois" toit="bois" />
          </g>
          {/* tour de guet en rondins */}
          <g transform="translate(112,4)">
            <AOBase rx={13} ry={4} cy={2} />
            <path d="M-9,0 L-7,-34 L7,-34 L9,0 Z" fill="url(#a-bois-l)" />
            <path d="M7,-34 L9,0 L13,-3 L11,-36 Z" fill="url(#a-bois-o)" />
            <path d="M-11,-34 L13,-34 L13,-38 L-11,-38 Z" fill="#7c5a30" />
            <path d="M-11,-38 L1,-46 L13,-38 Z" fill="#8a6535" />
            <path d="M-11,-38 L1,-46 L1,-41 Z" fill="#a8845d" />
            <path d="M-7,-24 h5 v5 h-5 Z" fill="#3a2c1c" />
          </g>
          {/* râteliers de boucliers ronds, aux couleurs achéennes */}
          <g transform="translate(-8,44)">
            {[-26, -8, 10, 28].map((dx, i) => (
              <g key={dx} transform={`translate(${dx},0)`}>
                <circle r={7.5} fill="#6e5526" />
                <circle r={6.2} fill={i % 2 ? '#7d3b32' : '#31506e'} />
                <circle r={4} fill={i % 2 ? '#9d5847' : '#456b8f'} />
                <circle r={1.8} fill="#dcc36a" />
              </g>
            ))}
            <path d="M-34,8 L34,8" stroke="#5f462d" strokeWidth={2.4} />
          </g>
          <Feu x={-118} y={30} s={0.9} />
          <Etendard x={-40} y={-10} c="#31506e" />
          <Etendard x={22} y={-4} c="#7d3b32" />
        </g>
      )

    case 'cite':
      return (
        <g>
          <ellipse cx={0} cy={14} rx={160} ry={48} fill="#c6bb88" opacity={0.35} />
          {/* petit temple périptère au centre : socle, colonnes, fronton */}
          <g transform="translate(0,0)">
            <AOBase rx={54} ry={14} cy={3} />
            <path d="M-52,2 L52,2 L48,-4 L-48,-4 Z" fill={PAL.pierreMi} />
            <path d="M-48,-4 L48,-4 L45,-9 L-45,-9 Z" fill={PAL.pierreLit} />
            {[-38, -25, -12, 1, 14, 27, 40].map((x) => (
              <Colonne3D key={x} x={x} h={34} larg={6} />
            ))}
            <g transform="translate(0,-43)">
              <path d="M-50,0 L50,0 L50,-6 L-50,-6 Z" fill={PAL.marbreLit} />
              <path d="M-50,-6 L0,-22 L50,-6 Z" fill={PAL.marbreOmbre} />
              <path d="M-50,-6 L0,-22 L0,-17 L-44,-6 Z" fill={PAL.marbreLit} />
              <circle cx={0} cy={-11} r={3.4} fill={PAL.or} />
            </g>
          </g>
          <g transform="translate(-108,26)">
            <Batisse3D w={46} h={26} g={13} prof={11} mat="stuc" toit="tuiles" />
          </g>
          <g transform="translate(104,30)">
            <Batisse3D w={50} h={26} g={13} prof={12} mat="stuc" toit="tuiles" />
          </g>
          <Cypres x={-58} y={38} s={1.05} />
          <Cypres x={58} y={40} s={0.95} />
          <Butin x={0} y={50} />
        </g>
      )

    case 'citadelle':
      return (
        <g>
          {/* éperon rocheux : la citadelle est bâtie dessus, pas à côté */}
          <path d="M-150,44 Q-96,4 -30,10 Q40,-2 104,16 Q150,28 150,50 Z" fill="#8d8672" />
          <path d="M-150,44 Q-96,4 -30,10 Q10,4 44,10 Q-30,22 -150,50 Z" fill="#aaa38d" />
          <path d="M-60,18 l10,8 M18,10 l10,8 M84,22 l9,7" stroke="#6f6858" strokeWidth={1.6} opacity={0.6} />
          {/* donjon massif à créneaux */}
          <g transform="translate(-14,4)">
            <AOBase rx={36} ry={10} cy={2} />
            <path d="M-30,0 L-30,-54 L30,-54 L30,0 Z" fill="url(#a-pierre-l)" />
            <path d="M30,0 L38,-6 L38,-58 L30,-54 Z" fill="url(#a-pierre-o)" />
            <path d="M-30,-40 L30,-40 M-30,-24 L30,-24" stroke={PAL.pierreJoint} strokeWidth={0.9} opacity={0.4} strokeDasharray="8 5" />
            <rect x={-4} y={-38} width={8} height={13} rx={2} fill="#32281a" />
            <rect x={-18} y={-38} width={5} height={11} rx={2} fill="#32281a" />
            <rect x={13} y={-38} width={5} height={11} rx={2} fill="#32281a" />
            <Porte3D w={13} h={20} />
            {/* couronnement crénelé */}
            <path d="M-33,-54 L41,-54 L41,-60 L-33,-60 Z" fill={PAL.pierreLit} />
            {[-33, -22, -11, 0, 11, 22, 33].map((x) => (
              <rect key={x} x={x} y={-67} width={7} height={7} fill={x < 5 ? '#ddd5c1' : '#b5ab92'} />
            ))}
          </g>
          {/* greniers voûtés adossés au rocher */}
          <g transform="translate(94,26)">
            <AOBase rx={24} ry={7} cy={2} />
            <path d="M-22,0 L-22,-14 A22,11 0 0 1 22,-14 L22,0 Z" fill="url(#a-pierre-l)" />
            <path d="M-22,-14 A22,11 0 0 1 22,-14" stroke={PAL.marbreLit} strokeWidth={2} fill="none" />
            <rect x={-5} y={-13} width={10} height={13} fill="#32281a" />
          </g>
          <Etendard x={-72} y={4} c="#c9a441" />
          <Butin x={54} y={44} />
        </g>
      )

    case 'forteresse':
      return (
        <g>
          <ellipse cx={0} cy={16} rx={165} ry={50} fill="#a99e7c" opacity={0.4} />
          {/* corps de garde monumental, appareil cyclopéen */}
          <g transform="translate(-6,10)">
            <AOBase rx={56} ry={14} cy={3} />
            <path d="M-50,0 L-50,-64 L50,-64 L50,0 Z" fill="url(#a-pierre-l)" />
            <path d="M50,0 L60,-8 L60,-70 L50,-64 Z" fill="url(#a-pierre-o)" />
            {/* assises cyclopéennes marquées */}
            {[-52, -38, -24, -10].map((y) => (
              <path key={y} d={`M-50,${y} L50,${y}`} stroke={PAL.pierreJoint} strokeWidth={1.1} opacity={0.35} strokeDasharray="14 7" />
            ))}
            <Porte3D w={18} h={28} />
            {/* frise à triglyphes et couronnement */}
            <path d="M-54,-64 L54,-64 L54,-71 L-54,-71 Z" fill={PAL.marbreLit} />
            {[-46, -30, -14, 2, 18, 34].map((x) => (
              <rect key={x} x={x} y={-70} width={5} height={5} fill="#9a9078" />
            ))}
            <path d="M-56,-71 L58,-71 L58,-77 L-56,-77 Z" fill={PAL.pierreLit} />
            {[-56, -43, -30, -17, -4, 9, 22, 35, 48].map((x) => (
              <g key={x}>
                <rect x={x} y={-86} width={8} height={9} fill={x < 0 ? '#ddd5c1' : '#b5ab92'} />
                <rect x={x} y={-86} width={8} height={1.6} fill="#f2ecd9" />
              </g>
            ))}
          </g>
          {/* tours d'angle trapues */}
          {[-118, 106].map((x, i) => (
            <g key={x} transform={`translate(${x},22)`}>
              <AOBase rx={20} ry={6} cy={2} />
              <path d="M-16,0 L-14,-46 L14,-46 L16,0 Z" fill={i ? 'url(#a-pierre-o)' : 'url(#a-pierre-l)'} />
              <path d="M-18,-46 L18,-46 L18,-52 L-18,-52 Z" fill={PAL.pierreLit} />
              {[-18, -9, 0, 9].map((mx) => (
                <rect key={mx} x={mx} y={-58} width={7} height={6} fill="#c9bfa7" />
              ))}
              <rect x={-3} y={-34} width={6} height={11} rx={2} fill="#32281a" />
            </g>
          ))}
          <Etendard x={-72} y={0} c="#b3543f" />
          <Etendard x={62} y={4} c="#c9a441" />
          <Butin x={-6} y={50} />
        </g>
      )
  }
}
