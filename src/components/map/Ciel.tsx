import { METEOS, SAISONS, type MeteoId, type SaisonId } from '../../game/saisons'
import { alea } from './art'

/*
 * Le ciel de la Troade, posé PAR-DESSUS la peinture : une teinte de saison qui
 * réchauffe ou refroidit toute la scène, puis ce qui tombe du ciel ce jour-là.
 * Tout est animé en SMIL — aucun coût JS par image, et le tick à 4 Hz n'y touche
 * jamais. Les semis sont déterministes (alea) : la pluie ne saute pas d'un
 * rendu à l'autre.
 */

/** goutte, flocon, voile : engendrés une fois pour toutes au chargement */
function semis(n: number, seed: number, w: number, h: number, y0: number) {
  const rnd = alea(seed)
  return Array.from({ length: n }, () => ({
    x: rnd() * w,
    y: y0 + rnd() * (h - y0),
    t: rnd(),
    s: 0.65 + rnd() * 0.7,
  }))
}

const GOUTTES = semis(64, 91, 1200, 800, 40)
const FLOCONS = semis(52, 137, 1200, 800, 20)

/** rideau de pluie : traits obliques qui filent, densité doublée sous l'orage */
function Pluie({ w, h, fort }: { w: number; h: number; fort?: boolean }) {
  const gouttes = fort ? GOUTTES : GOUTTES.slice(0, 40)
  return (
    <g pointerEvents="none" opacity={fort ? 0.5 : 0.36}>
      {gouttes.map((g, i) => {
        const dur = (0.42 + g.t * 0.3).toFixed(2)
        const len = (11 + g.s * 9).toFixed(1)
        return (
          <line
            key={i}
            x1={g.x}
            y1={g.y}
            x2={g.x - 4.5}
            y2={Number(g.y) + Number(len)}
            stroke="#cfe0e6"
            strokeWidth={g.s < 1 ? 0.8 : 1.1}
            strokeLinecap="round"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values={`0,-${(h * 0.34).toFixed(0)};0,${(h * 0.34).toFixed(0)}`}
              dur={`${dur}s`}
              begin={`-${(g.t * 0.7).toFixed(2)}s`}
              repeatCount="indefinite"
            />
          </line>
        )
      })}
      {/* flaques : le sol renvoie la lumière là où l'eau stagne */}
      {[
        [420, 520, 46, 9],
        [760, 610, 58, 11],
        [980, 430, 38, 8],
        [250, 660, 42, 9],
      ].map(([x, y, rx, ry], i) => (
        <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill="#a8c4cc" opacity={0.22}>
          <animate attributeName="opacity" values="0.14;0.26;0.14" dur={`${5 + i}s`} repeatCount="indefinite" />
        </ellipse>
      ))}
      <rect x={0} y={0} width={w} height={h} fill="#5c7f92" opacity={fort ? 0.16 : 0.1} />
    </g>
  )
}

/** neige : flocons lents qui dérivent, plus un voile blanc bleuté sur le tout */
function Neige({ w, h }: { w: number; h: number }) {
  return (
    <g pointerEvents="none">
      <rect x={0} y={0} width={w} height={h} fill="#dfeaf2" opacity={0.14} />
      {FLOCONS.map((f, i) => {
        const dur = (5.5 + f.t * 5).toFixed(1)
        return (
          <g key={i}>
            <animateTransform
              attributeName="transform"
              type="translate"
              values={`0,-${(h * 0.5).toFixed(0)};0,${(h * 0.5).toFixed(0)}`}
              dur={`${dur}s`}
              begin={`-${(f.t * 9).toFixed(1)}s`}
              repeatCount="indefinite"
            />
            <circle cx={f.x} cy={f.y} r={f.s * 1.5} fill="#f6fbff" opacity={0.8}>
              {/* balancement latéral : un flocon ne tombe jamais droit */}
              <animate
                attributeName="cx"
                values={`${f.x};${f.x + 9 * f.s};${f.x - 7 * f.s};${f.x}`}
                dur={`${(3 + f.t * 2).toFixed(1)}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        )
      })}
    </g>
  )
}

/** brume : nappes basses qui glissent lentement en travers de la plaine */
function Brume({ w, h }: { w: number; h: number }) {
  return (
    <g pointerEvents="none">
      <rect x={0} y={0} width={w} height={h} fill="#d3dcd8" opacity={0.2} />
      {[
        { y: 300, ry: 34, o: 0.3, dur: 46, dir: 1 },
        { y: 420, ry: 46, o: 0.34, dur: 62, dir: -1 },
        { y: 545, ry: 40, o: 0.3, dur: 54, dir: 1 },
        { y: 680, ry: 52, o: 0.26, dur: 74, dir: -1 },
      ].map((n, i) => (
        <g key={i}>
          <animateTransform
            attributeName="transform"
            type="translate"
            values={n.dir > 0 ? `-${w * 0.3},0;${w * 0.3},0;-${w * 0.3},0` : `${w * 0.3},0;-${w * 0.3},0;${w * 0.3},0`}
            dur={`${n.dur}s`}
            repeatCount="indefinite"
          />
          <ellipse cx={w / 2} cy={n.y} rx={w * 0.62} ry={n.ry} fill="#e6ece8" opacity={n.o} filter="url(#a-flou4)" />
        </g>
      ))}
      {/* le fond de scène se noie : les montagnes disparaissent presque */}
      <rect x={0} y={0} width={w} height={260} fill="#dde4e0" opacity={0.42} />
    </g>
  )
}

/** canicule : l'air tremble au ras du sol et la lumière écrase les couleurs */
function Canicule({ w, h }: { w: number; h: number }) {
  return (
    <g pointerEvents="none">
      <rect x={0} y={0} width={w} height={h} fill="#f2c874" opacity={0.13} />
      {[330, 450, 580, 700].map((y, i) => (
        <ellipse key={y} cx={w / 2} cy={y} rx={w * 0.55} ry={7} fill="#fff0c4" opacity={0.16} filter="url(#a-flou2)">
          <animate attributeName="ry" values="5;11;5" dur={`${2.6 + i * 0.5}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.1;0.22;0.1" dur={`${3.2 + i * 0.4}s`} repeatCount="indefinite" />
        </ellipse>
      ))}
    </g>
  )
}

/** orage : la pluie battante, plus l'éclair qui blanchit toute la scène */
function Orage({ w, h }: { w: number; h: number }) {
  return (
    <g pointerEvents="none">
      <Pluie w={w} h={h} fort />
      <rect x={0} y={0} width={w} height={h} fill="#f6f2e0" opacity={0}>
        <animate
          attributeName="opacity"
          values="0;0;0.42;0.06;0.3;0;0"
          keyTimes="0;0.62;0.645;0.665;0.685;0.72;1"
          dur="9s"
          repeatCount="indefinite"
        />
      </rect>
      {/* la déchirure du ciel, au-dessus de l'Ida */}
      <path
        d="M548,0 L520,74 L556,80 L512,186"
        stroke="#fdf6d8"
        strokeWidth={3.2}
        fill="none"
        opacity={0}
        strokeLinejoin="round"
      >
        <animate
          attributeName="opacity"
          values="0;0;1;0.2;0.8;0;0"
          keyTimes="0;0.62;0.64;0.662;0.682;0.71;1"
          dur="9s"
          repeatCount="indefinite"
        />
      </path>
    </g>
  )
}

/** ce qui tombe du ciel — rien du tout par temps clair */
export function Meteo({ meteo, w, h }: { meteo: MeteoId; w: number; h: number }) {
  switch (meteo) {
    case 'pluie':
      return <Pluie w={w} h={h} />
    case 'neige':
      return <Neige w={w} h={h} />
    case 'brume':
      return <Brume w={w} h={h} />
    case 'orage':
      return <Orage w={w} h={h} />
    case 'canicule':
      return <Canicule w={w} h={h} />
    default:
      return null
  }
}

/** teinte d'ambiance de la saison — l'été jaunit tout, l'hiver bleuit tout */
export function VoileSaison({ saison, w, h }: { saison: SaisonId; w: number; h: number }) {
  const def = SAISONS[saison]
  return (
    <g pointerEvents="none">
      <rect x={0} y={0} width={w} height={h} fill={def.teinte} opacity={def.teinteOpacite} style={{ mixBlendMode: 'soft-light' }} />
      {/* l'hiver ne teinte pas seulement : il DÉLAVE. Une nappe froide en fondu
          normal éteint le vert de la plaine, ce qu'un soft-light ne fait pas. */}
      {saison === 'hiver' && <rect x={0} y={0} width={w} height={h} fill="#cfe0ea" opacity={0.17} />}
      {/* l'été écrase de lumière rasante le bas de la scène */}
      {saison === 'ete' && <rect x={0} y={h * 0.45} width={w} height={h * 0.55} fill="#f0d789" opacity={0.05} />}
    </g>
  )
}

/** pastille du HUD : saison, ciel, et ce que les deux coûtent */
export function libelleCiel(saison: SaisonId, meteo: MeteoId): { txt: string; emoji: string; detail: string } {
  const s = SAISONS[saison]
  const m = METEOS[meteo]
  return {
    txt: s.nom,
    emoji: s.emoji,
    detail: `${s.nom} — ${s.desc}\n${m.emoji} ${m.nom} : ${m.desc}`,
  }
}
