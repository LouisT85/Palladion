import type { BuildingId } from '../../game/types'

/*
 * Les villageois au travail — la vie du village, façon Age of Empires / Clash of Clans.
 * Chaque bâtiment productif a son artisan : geste en boucle (SMIL, aucun coût JS),
 * particules synchronisées (copeaux, éclats, étincelles) au moment de l'impact.
 * Coordonnées : l'espace de dessin du bâtiment (le même que BatimentArt).
 */

const PEAU = '#d9a97c'
const T = '#4a3a28'

function CorpsOuvrier({ tunique = '#b3906b', marche }: { tunique?: string; marche?: boolean }) {
  return (
    <g>
      <ellipse cx={1} cy={0.8} rx={4.5} ry={1.4} fill="#241a0c" opacity={0.14} />
      {marche ? (
        <>
          <line x1={0} y1={-4} x2={-1.5} y2={0} stroke={PEAU} strokeWidth={1.5}>
            <animateTransform attributeName="transform" type="rotate" values="16 0 -4;-16 0 -4;16 0 -4" dur="0.45s" repeatCount="indefinite" />
          </line>
          <line x1={0} y1={-4} x2={1.5} y2={0} stroke="#c99a6e" strokeWidth={1.5}>
            <animateTransform attributeName="transform" type="rotate" values="-16 0 -4;16 0 -4;-16 0 -4" dur="0.45s" repeatCount="indefinite" />
          </line>
        </>
      ) : (
        <>
          <line x1={-1.5} y1={0} x2={-1.5} y2={-4} stroke={PEAU} strokeWidth={1.5} />
          <line x1={1.5} y1={0} x2={1.5} y2={-4} stroke="#c99a6e" strokeWidth={1.5} />
        </>
      )}
      <path d="M-2.8,-3.8 L-2,-10.5 L2,-10.5 L2.8,-3.8 Z" fill={tunique} stroke={T} strokeWidth={0.5} />
      <circle cx={0} cy={-12.4} r={2.5} fill={PEAU} />
      <path d="M-2.5,-12.9 A2.5,2.5 0 0 1 2.5,-12.9" fill="#6b533c" />
    </g>
  )
}

/** particules d'impact synchronisées avec le geste (jaillissent à ~45 % du cycle) */
function Eclats({ x, y, c, dur, begin = '0s' }: { x: number; y: number; c: string; dur: string; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {[
        { dx: 5, dy: -6, w: 1.8 },
        { dx: -3, dy: -7, w: 1.4 },
        { dx: 7, dy: -2, w: 1.2 },
      ].map((p, i) => (
        <rect key={i} x={0} y={0} width={p.w} height={p.w * 0.7} fill={c} opacity={0}>
          <animate attributeName="x" values={`0;${p.dx};${p.dx * 1.4}`} keyTimes="0;0.6;1" dur={dur} begin={begin} repeatCount="indefinite" />
          <animate attributeName="y" values={`0;${p.dy};${p.dy * 0.4}`} keyTimes="0;0.6;1" dur={dur} begin={begin} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0;0.95;0.7;0" keyTimes="0;0.45;0.5;0.75;1" dur={dur} begin={begin} repeatCount="indefinite" />
        </rect>
      ))}
    </g>
  )
}

// ── métiers ──────────────────────────────────────────────────────────────────
function Bucheron({ x, y, flip, begin = '0s' }: { x: number; y: number; flip?: boolean; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`}>
      <CorpsOuvrier tunique="#8c9a7a" />
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="-72 1 -9.5;28 1 -9.5;28 1 -9.5;-72 1 -9.5"
          keyTimes="0;0.42;0.5;1"
          dur="1.7s"
          begin={begin}
          repeatCount="indefinite"
        />
        <line x1={1} y1={-9.5} x2={7.5} y2={-6.5} stroke={PEAU} strokeWidth={1.4} />
        <line x1={7.5} y1={-6.5} x2={11} y2={-4.6} stroke="#7a5a35" strokeWidth={1.6} />
        <path d="M10.4,-6.4 l3,1.2 q-0.4,2.4 -2.8,2.2 Z" fill="#9aa0a8" stroke={T} strokeWidth={0.5} />
      </g>
      <Eclats x={9} y={-1} c="#d3b787" dur="1.7s" begin={begin} />
    </g>
  )
}

function Tailleur({ x, y, flip, begin = '0s' }: { x: number; y: number; flip?: boolean; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`}>
      <CorpsOuvrier tunique="#a08a68" />
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="-65 1 -9.5;30 1 -9.5;30 1 -9.5;-65 1 -9.5"
          keyTimes="0;0.4;0.5;1"
          dur="1.9s"
          begin={begin}
          repeatCount="indefinite"
        />
        <line x1={1} y1={-9.5} x2={8} y2={-6.5} stroke={PEAU} strokeWidth={1.4} />
        <line x1={8} y1={-6.5} x2={11.5} y2={-5} stroke="#7a5a35" strokeWidth={1.5} />
        <path d="M11,-6.6 q3,-0.8 4.4,1.4" stroke="#8f8a7c" strokeWidth={1.7} fill="none" />
      </g>
      <Eclats x={10} y={-2} c="#c2bcae" dur="1.9s" begin={begin} />
    </g>
  )
}

function Forgeron({ x, y, flip, begin = '0s' }: { x: number; y: number; flip?: boolean; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`}>
      <CorpsOuvrier tunique="#7d5a44" />
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="-80 1 -9.5;20 1 -9.5;20 1 -9.5;-80 1 -9.5"
          keyTimes="0;0.38;0.46;1"
          dur="1.3s"
          begin={begin}
          repeatCount="indefinite"
        />
        <line x1={1} y1={-9.5} x2={7} y2={-6.5} stroke={PEAU} strokeWidth={1.4} />
        <line x1={7} y1={-6.5} x2={9.6} y2={-5.4} stroke="#7a5a35" strokeWidth={1.4} />
        <rect x={9} y={-7.4} width={3.2} height={2.6} rx={0.7} fill="#8f8a7c" stroke={T} strokeWidth={0.5} />
      </g>
      {/* étincelles dorées */}
      <g transform="translate(8,-2)">
        {[
          { dx: 4, dy: -7 },
          { dx: -2, dy: -8 },
          { dx: 6, dy: -4 },
        ].map((p, i) => (
          <circle key={i} r={0.9} fill="#f5d06c" opacity={0}>
            <animate attributeName="cx" values={`0;${p.dx}`} dur="1.3s" begin={begin} repeatCount="indefinite" />
            <animate attributeName="cy" values={`0;${p.dy};${p.dy * 0.5}`} keyTimes="0;0.6;1" dur="1.3s" begin={begin} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0;1;0.6;0" keyTimes="0;0.4;0.46;0.7;1" dur="1.3s" begin={begin} repeatCount="indefinite" />
          </circle>
        ))}
      </g>
    </g>
  )
}

function Faucheur({ x, y, flip, begin = '0s' }: { x: number; y: number; flip?: boolean; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`}>
      <CorpsOuvrier tunique="#c9a06c" />
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="-24 0 -8;20 0 -8;-24 0 -8"
          keyTimes="0;0.5;1"
          dur="2.6s"
          begin={begin}
          repeatCount="indefinite"
        />
        <line x1={0} y1={-8} x2={8} y2={-3} stroke={PEAU} strokeWidth={1.4} />
        <line x1={4} y1={-10} x2={10} y2={0} stroke="#7a5a35" strokeWidth={1.4} />
        <path d="M10,0 q4,1.6 7,-0.6" stroke="#9aa0a8" strokeWidth={1.5} fill="none" />
      </g>
    </g>
  )
}

function Pretre({ x, y, begin = '0s' }: { x: number; y: number; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <CorpsOuvrier tunique="#ece5d2" />
      <line x1={-2} y1={-9.5} x2={-5.5} y2={-12} stroke={PEAU} strokeWidth={1.3}>
        <animateTransform attributeName="transform" type="rotate" values="0 -2 -9.5;-28 -2 -9.5;0 -2 -9.5" dur="3.4s" begin={begin} repeatCount="indefinite" />
      </line>
      <line x1={2} y1={-9.5} x2={5.5} y2={-12} stroke={PEAU} strokeWidth={1.3}>
        <animateTransform attributeName="transform" type="rotate" values="0 2 -9.5;28 2 -9.5;0 2 -9.5" dur="3.4s" begin={begin} repeatCount="indefinite" />
      </line>
    </g>
  )
}

function Recrue({ x, y, flip, begin = '0s' }: { x: number; y: number; flip?: boolean; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`}>
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0;-4.5,0;-4.5,0;0,0" keyTimes="0;0.3;0.42;1" dur="1.5s" begin={begin} repeatCount="indefinite" />
        <CorpsOuvrier tunique="#3e5a7a" />
        <line x1={-1} y1={-8.5} x2={-9} y2={-7} stroke="#7a5a35" strokeWidth={1.3} />
        <path d="M-9,-7 l-2.6,-0.5 l2.2,-1.6 Z" fill="#c9a441" />
        <circle cx={3.4} cy={-8} r={2.6} fill="#8c6b3f" stroke="#5d4a33" strokeWidth={0.7} />
      </g>
    </g>
  )
}

function Marchande({ x, y, begin = '0s' }: { x: number; y: number; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <CorpsOuvrier tunique="#9a8ca8" />
      <line x1={2} y1={-9.5} x2={5.5} y2={-11.5} stroke={PEAU} strokeWidth={1.3}>
        <animateTransform attributeName="transform" type="rotate" values="0 2 -9.5;24 2 -9.5;0 2 -9.5;0 2 -9.5" keyTimes="0;0.15;0.3;1" dur="3.8s" begin={begin} repeatCount="indefinite" />
      </line>
    </g>
  )
}

function Docker({ x, y, flip, begin = '0s' }: { x: number; y: number; flip?: boolean; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`}>
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0;0,-1.4;0,0" dur="1.1s" begin={begin} repeatCount="indefinite" />
        <CorpsOuvrier tunique="#7c9a8e" />
        <rect x={-3.4} y={-17.4} width={6.8} height={4.6} fill="#a3814f" stroke={T} strokeWidth={0.7} />
        <path d="M-3.4,-17.4 L3.4,-12.8 M3.4,-17.4 L-3.4,-12.8" stroke="#7a5a35" strokeWidth={0.6} />
      </g>
    </g>
  )
}

// ── affectation par bâtiment ─────────────────────────────────────────────────
export function Ouvriers({ id, level }: { id: BuildingId; level: number }) {
  if (level <= 0) return null
  const deux = level >= 3
  switch (id) {
    case 'scierie':
      return (
        <g>
          <Bucheron x={24} y={4} flip />
          {deux && <Bucheron x={-8} y={13} begin="0.8s" />}
        </g>
      )
    case 'carriere':
      return (
        <g>
          <Tailleur x={12} y={9} flip />
          {deux && <Tailleur x={-22} y={13} begin="0.9s" flip />}
        </g>
      )
    case 'forge':
      return (
        <g>
          <Forgeron x={12} y={6} flip />
          {level >= 4 && <Forgeron x={-22} y={13} begin="0.6s" />}
        </g>
      )
    case 'ferme':
      return (
        <g>
          <Faucheur x={34} y={10} />
          {deux && <Faucheur x={58} y={-14} begin="1.2s" />}
        </g>
      )
    case 'temple':
      return <Pretre x={level === 1 ? -8 : 0} y={level === 1 ? 12 : 15} />
    case 'caserne':
      return (
        <g>
          <Recrue x={-19} y={5} />
          {deux && <Recrue x={-7} y={11} begin="0.7s" />}
        </g>
      )
    case 'agora':
      return level >= 2 ? (
        <g>
          <Marchande x={-30} y={-3} />
          {deux && <Marchande x={30} y={0} begin="1.6s" />}
        </g>
      ) : (
        <Marchande x={18} y={4} />
      )
    case 'port':
      return (
        <g>
          <Docker x={18} y={7} flip />
          {deux && <Docker x={40} y={-2} begin="0.5s" flip />}
        </g>
      )
    default:
      return null
  }
}

// ── porteurs de ressources (sur la carte, coordonnées monde) ─────────────────
function Porteur({
  path,
  dur,
  charge,
  begin = '0s',
}: {
  path: string
  dur: string
  charge: 'bois' | 'grain' | 'pierre'
  begin?: string
}) {
  return (
    <g opacity={0}>
      <animateMotion dur={dur} repeatCount="indefinite" path={path} begin={begin} />
      <animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.05;0.94;1" dur={dur} begin={begin} repeatCount="indefinite" />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0;0,-1.1;0,0" dur="0.4s" repeatCount="indefinite" additive="sum" />
        <CorpsOuvrier marche />
        {charge === 'bois' && (
          <g transform="translate(0,-13.6) rotate(-8)">
            {[0, 1].map((i) => (
              <rect key={i} x={-6} y={-i * 2.2 - 2} width={12} height={2} rx={1} fill={i ? '#a3814f' : '#8f6f42'} stroke={T} strokeWidth={0.5} />
            ))}
          </g>
        )}
        {charge === 'grain' && (
          <path d="M-2.8,-14.4 C-3.3,-17.4 -2.2,-19.2 0,-19.2 C2.2,-19.2 3.3,-17.4 2.8,-14.4 Z" fill="#cbb289" stroke={T} strokeWidth={0.6} />
        )}
        {charge === 'pierre' && <rect x={-2.6} y={-18.4} width={5.2} height={4} fill="#c2bcae" stroke={T} strokeWidth={0.6} />}
      </g>
    </g>
  )
}

/** navettes des porteurs : des ateliers vers l'agora, par la porte de l'est */
export function Porteurs({
  scierie,
  ferme,
  carriere,
  actif,
}: {
  scierie: boolean
  ferme: boolean
  carriere: boolean
  actif: boolean
}) {
  if (!actif) return null
  return (
    <g pointerEvents="none">
      {scierie && (
        <Porteur
          path="M952,262 C 938,330 920,400 908,440 C 866,447 730,451 632,449"
          dur="26s"
          charge="bois"
        />
      )}
      {ferme && (
        <Porteur
          path="M345,652 C 500,636 690,575 850,505 C 885,489 900,468 905,449 C 862,449 730,452 634,450"
          dur="34s"
          charge="grain"
          begin="9s"
        />
      )}
      {carriere && (
        <Porteur
          path="M172,262 C 400,225 760,240 885,320 C 908,370 909,415 906,442 C 868,448 740,452 640,450"
          dur="42s"
          charge="pierre"
          begin="15s"
        />
      )}
    </g>
  )
}
