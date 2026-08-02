import { AOBase, MurPierre, OmbreVolume, PAL, alea } from '../art'
import { Feu, Fumee } from './primitives'

/*
 * PORT - la mer occupe le triangle SUD-OUEST du cadre (bas-gauche), la terre
 * le nord-est. Peint réaliste (docs/STYLE-ART.md) : lumière NW, ombres portées
 * SE, zéro contour noir. IDs de defs locaux préfixés « po- ».
 *  1. ponton sur pilotis + barque de pêche
 *  2. quai de pierre appareillée + voilier marchand
 *  3. deux quais, entrepôt, phare de fortune
 *  4. port franc : trirème à éperon de bronze, comptoirs phéniciens
 *
 * Repères d'intégration : les dockers de Ouvriers.tsx sont posés en (18,7) et
 * (40,-2) - ces deux points restent au sec sur le terre-plein du quai.
 */

/* ── géométrie partagée ───────────────────────────────────────────────────── */
/** ligne de rive : descend doucement vers le sud-ouest, l'eau est en dessous */
const D_RIVE = 'M-84,-18 C-60,-12 -36,-5 -14,3 C8,11 28,19 44,26'
/** anse : rive au nord-est, bord du large refermé au sud-ouest */
const D_EAU = `${D_RIVE} C40,30 26,32.2 8,31.4 C-24,30.4 -58,28 -76,19 C-85,14 -88,-6 -84,-18 Z`
/** axe de la grève : la rive décalée de 8 vers l'intérieur (normale NE) */
const D_GREVE = 'M-81,-26 C-57,-20 -33,-13 -11,-5 C11,3 31,11 47,18'

/** quai : arête d'eau QA→QB, terre-plein décalé de QV, parement de QH */
const QA = [-42, -8] as const
const QB = [30, 18] as const
const QV = [4, -12] as const
const QH = 10
const D_QUAI_FACE = `M${QA[0]},${QA[1]} L${QB[0]},${QB[1]} L${QB[0]},${QB[1] + QH} L${QA[0]},${QA[1] + QH} Z`
const D_QUAI_DECK = `M${QA[0]},${QA[1]} L${QB[0]},${QB[1]} L${QB[0] + QV[0]},${QB[1] + QV[1]} L${QA[0] + QV[0]},${QA[1] + QV[1]} Z`

function PortDefs() {
  return (
    <defs>
      {/* eau : turquoise du haut-fond (le long de la rive) → bleu du large (SW) */}
      <linearGradient id="po-eau" x1="0.85" y1="0" x2="0.12" y2="1">
        <stop offset="0%" stopColor="#7ecac1" />
        <stop offset="26%" stopColor="#4f9fb2" />
        <stop offset="64%" stopColor="#2b708d" />
        <stop offset="100%" stopColor="#17415a" />
      </linearGradient>
      {/* bordé : plat-bord au soleil, bas de coque dans l'ombre, retour de
          lumière de l'eau juste au-dessus de la flottaison */}
      <linearGradient id="po-coque" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#b58f63" />
        <stop offset="42%" stopColor="#8a6942" />
        <stop offset="80%" stopColor="#4f3821" />
        <stop offset="100%" stopColor="#7a6140" />
      </linearGradient>
      <linearGradient id="po-coque-noire" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8b7855" />
        <stop offset="42%" stopColor="#584833" />
        <stop offset="80%" stopColor="#2e241a" />
        <stop offset="100%" stopColor="#5a4b33" />
      </linearGradient>
      {/* voile : bord d'attaque au soleil → creux → chute dans l'ombre */}
      <linearGradient id="po-voile" x1="0.05" y1="0.05" x2="1" y2="0.9">
        <stop offset="0%" stopColor="#f2e9d1" />
        <stop offset="28%" stopColor="#dccdaa" />
        <stop offset="64%" stopColor="#b6a583" />
        <stop offset="100%" stopColor="#85755b" />
      </linearGradient>
      <linearGradient id="po-voile-r" x1="0.05" y1="0.05" x2="1" y2="0.9">
        <stop offset="0%" stopColor="#e79c81" />
        <stop offset="30%" stopColor="#cc7157" />
        <stop offset="66%" stopColor="#a04b39" />
        <stop offset="100%" stopColor="#6f3226" />
      </linearGradient>
      <linearGradient id="po-bronze" x1="0" y1="0" x2="0.85" y2="0.7">
        <stop offset="0%" stopColor="#f0d68e" />
        <stop offset="36%" stopColor="#bb9143" />
        <stop offset="100%" stopColor="#68491d" />
      </linearGradient>
      <clipPath id="po-clip-eau">
        <path d={D_EAU} />
      </clipPath>
      <clipPath id="po-clip-quai">
        <path d={D_QUAI_FACE} />
      </clipPath>
    </defs>
  )
}

/* ── grève, puis nappe d'eau par-dessus (la rive se dessine d'elle-même) ───── */
function Greve() {
  return (
    <g>
      {/* fondu du sable dans l'herbe */}
      <path d={D_GREVE} stroke="#c2a870" strokeWidth={28} fill="none" opacity={0.38} filter="url(#a-flou4)" strokeLinecap="round" />
      {/* sable sec */}
      <path d={D_GREVE} stroke="#d5be84" strokeWidth={14} fill="none" opacity={0.82} strokeLinecap="round" />
      {/* plaques de sable inégales : la grève n'est pas un ruban régulier */}
      <g opacity={0.4} filter="url(#a-flou2)">
        <ellipse cx={-60} cy={-24} rx={17} ry={6} transform="rotate(16 -60 -24)" fill="#e2cf9c" />
        <ellipse cx={-18} cy={-9} rx={14} ry={5} transform="rotate(20 -18 -9)" fill="#dfcb96" />
        <ellipse cx={22} cy={5} rx={13} ry={5} transform="rotate(22 22 5)" fill="#e2cf9c" />
        <ellipse cx={-38} cy={-12} rx={9} ry={3.4} transform="rotate(18 -38 -12)" fill="#c8ae78" />
      </g>
      {/* sable mouillé le long de l'eau, fondu */}
      <path d={D_RIVE} stroke="#ad9161" strokeWidth={9} fill="none" opacity={0.65} filter="url(#a-flou2)" strokeLinecap="round" />
      {/* laisse de mer : croissants de varech, jamais une ligne continue */}
      <path d="M-64,-24 q5,1.5 10,0 M-42,-16 q6,1.6 12,0 M-14,-6 q5,1.5 10,0 M10,3 q6,1.6 12,0" stroke="#a68b5f" strokeWidth={1.3} fill="none" opacity={0.35} />
      <g fill="#9e8967" opacity={0.7}>
        <ellipse cx={-52} cy={-14} rx={1.8} ry={1} />
        <ellipse cx={-22} cy={-4} rx={1.5} ry={0.85} />
        <ellipse cx={6} cy={6} rx={1.9} ry={1.05} />
        <ellipse cx={-68} cy={-20} rx={1.4} ry={0.8} />
      </g>
    </g>
  )
}

function NappeEau() {
  return (
    <g>
      {/* frange floue du large : l'eau se fond au lieu d'être coupée net */}
      <path d={D_EAU} fill="#1b4a62" opacity={0.55} filter="url(#a-flou4)" />
      <path d={D_EAU} fill="url(#po-eau)" />
      <g clipPath="url(#po-clip-eau)">
        {/* haut-fond : liseré étroit, brisé en plaques irrégulières */}
        <path d={D_RIVE} stroke="#78c9b9" strokeWidth={7} fill="none" opacity={0.42} filter="url(#a-flou2)" />
        <path d="M-72,-15 q11,3.5 21,7 M-32,-2 q10,4 19,9 M2,11 q8,4 15,9 M-56,-9 q7,2.4 13,4.6" stroke="#a6ded0" strokeWidth={4} fill="none" opacity={0.4} filter="url(#a-flou2)" />
        {/* masse profonde qui remonte du large + herbiers sombres */}
        <ellipse cx={-52} cy={33} rx={56} ry={19} fill="#0b2c40" opacity={0.5} filter="url(#a-flou4)" />
        <ellipse cx={12} cy={34} rx={30} ry={13} fill="#10364c" opacity={0.42} filter="url(#a-flou4)" />
        <ellipse cx={-42} cy={13} rx={15} ry={5} fill="#1c5468" opacity={0.35} filter="url(#a-flou2)" />
        <ellipse cx={-68} cy={2} rx={11} ry={4} fill="#1c5468" opacity={0.3} filter="url(#a-flou2)" />
        {/* houle : deux trains parallèles à la côte, dérive très lente */}
        <g>
          <animateTransform attributeName="transform" type="translate" values="0 0;4 3;0 0" dur="15s" repeatCount="indefinite" />
          <path d="M-88,-6 C-62,0 -34,8 -8,17 C4,21 14,26 20,30" stroke="#5cadb6" strokeWidth={3.6} fill="none" opacity={0.3} filter="url(#a-flou2)">
            <animate attributeName="opacity" values="0.3;0.13;0.3" dur="9s" repeatCount="indefinite" />
          </path>
          <path d="M-86,10 C-62,16 -40,22 -20,29" stroke="#3d879e" strokeWidth={3} fill="none" opacity={0.26} filter="url(#a-flou2)">
            <animate attributeName="opacity" values="0.12;0.26;0.12" dur="12s" repeatCount="indefinite" />
          </path>
        </g>
        {/* moutonnement épars, crêtes brisées éclairées au NW */}
        <g stroke="#d8efeb" strokeWidth={1.1} fill="none" strokeLinecap="round" opacity={0.32}>
          <path d="M-64,0 q6,-2.2 12,0 M-38,10 q5,-2 10,0 M-70,15 q6,-2.4 12,0 M-20,22 q5,-1.8 9,0 M-46,24 q6,-2.2 11,0">
            <animate attributeName="opacity" values="0.32;0.13;0.32" dur="5.5s" repeatCount="indefinite" />
          </path>
        </g>
      </g>
      {/* écume de rive : frange brisée, inégale */}
      <path d={D_RIVE} stroke="#f4fbf5" strokeWidth={2} fill="none" strokeDasharray="14 8 24 12 6 5" opacity={0.7} filter="url(#a-flou1)">
        <animate attributeName="opacity" values="0.7;0.38;0.7" dur="6.5s" repeatCount="indefinite" />
      </path>
      <path d="M-78,-15 C-56,-10 -34,-3 -14,4" stroke="#d6efe7" strokeWidth={1.3} fill="none" strokeDasharray="8 15 18 10" opacity={0.4} filter="url(#a-flou1)">
        <animate attributeName="opacity" values="0.28;0.5;0.28" dur="9s" repeatCount="indefinite" />
      </path>
    </g>
  )
}

/** reflet vertical étiré dans l'eau, brisé par deux rides horizontales */
function Reflet({ x, y, w = 16, h = 12, c = '#e6dcc4', o = 0.32, seed = 3 }: { x: number; y: number; w?: number; h?: number; c?: string; o?: number; seed?: number }) {
  const rnd = alea(seed)
  const barres = []
  for (let i = 0; i < 3; i++) {
    const bx = x - w / 2 + ((i + 0.5) * w) / 3
    barres.push(<rect key={i} x={bx - w / 11} y={y} width={w / 5.5} height={h * (0.5 + rnd() * 0.6)} fill={c} opacity={o * (0.6 + rnd() * 0.55)} />)
  }
  return (
    <g filter="url(#a-flou1)" clipPath="url(#po-clip-eau)">
      {barres}
      <rect x={x - w / 2 - 1} y={y + h * 0.38} width={w + 2} height={1.8} fill="#3f8ba2" opacity={0.42}>
        <animate attributeName="opacity" values="0.42;0.2;0.42" dur="7s" repeatCount="indefinite" />
      </rect>
    </g>
  )
}

/* ── ponton sur pilotis ───────────────────────────────────────────────────── */
/**
 * Ponton qui descend de la grève vers le large (bas-gauche), presque
 * perpendiculaire à la rive. Pilotis verticaux, reflets d'aplomb dans l'eau.
 */
function Ponton({ x = 0, y = 0, s = 1, seed = 4 }: { x?: number; y?: number; s?: number; seed?: number }) {
  const rnd = alea(seed)
  const S1 = [-12, -16] // arête NW, côté terre
  const E1 = [-50, 8] // arête NW, côté large
  const dec = [9.8, 3.4] // vers l'arête SE (largeur du tablier, le long de la rive)
  const S2 = [S1[0] + dec[0], S1[1] + dec[1]]
  const E2 = [E1[0] + dec[0], E1[1] + dec[1]]
  const u = [E1[0] - S1[0], E1[1] - S1[1]]
  const pas = Math.hypot(u[0], u[1])

  const nPl = 13
  const dPl = (par: number) =>
    Array.from({ length: nPl }, (_, i) => i)
      .filter((i) => i % 2 === par)
      .map((i) => {
        const t = (i + 0.5) / nPl
        const px = S1[0] + u[0] * t
        const py = S1[1] + u[1] * t
        return `M${px.toFixed(1)},${py.toFixed(1)} l${dec[0]},${dec[1]}`
      })
      .join(' ')

  const pilots = [0.34, 0.64, 0.94]
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {/* ombre du tablier sur l'eau, décalée SE */}
      <g clipPath="url(#po-clip-eau)">
        <path d={`M${S1[0] + 6},${S1[1] + 5} L${E1[0] + 6},${E1[1] + 5} L${E2[0] + 6},${E2[1] + 5} L${S2[0] + 6},${S2[1] + 5} Z`} fill="#0c2e42" opacity={0.4} filter="url(#a-flou2)" />
      </g>
      {/* pilotis de l'arête NW (derrière le tablier) */}
      <path
        d={pilots
          .map((t) => {
            const px = S1[0] + u[0] * t
            const py = S1[1] + u[1] * t
            return `M${px.toFixed(1)},${py.toFixed(1)} l0,${(8 + rnd() * 3).toFixed(1)}`
          })
          .join(' ')}
        stroke="#6a4f31"
        strokeWidth={2.4}
      />
      {/* entretoises en croix */}
      <path
        d={pilots
          .map((t) => {
            const px = S1[0] + u[0] * t + dec[0] * 0.5
            const py = S1[1] + u[1] * t + dec[1] * 0.5
            return `M${px - 5.4},${py + 3} L${px + 5.4},${py + 7.5} M${px + 5.4},${py + 3} L${px - 5.4},${py + 7.5}`
          })
          .join(' ')}
        stroke="#5b4229"
        strokeWidth={1}
        opacity={0.85}
      />
      {/* tablier : planches jointives, deux tons */}
      <path d={`M${S1[0]},${S1[1]} L${E1[0]},${E1[1]} L${E2[0]},${E2[1]} L${S2[0]},${S2[1]} Z`} fill="#8a6941" />
      <path d={dPl(0)} stroke="#a48459" strokeWidth={(pas / nPl) * 0.95} opacity={0.9} />
      <path d={dPl(1)} stroke="#8c6c43" strokeWidth={(pas / nPl) * 0.95} opacity={0.9} />
      <line x1={S1[0]} y1={S1[1]} x2={E1[0]} y2={E1[1]} stroke="#c8a575" strokeWidth={1.4} opacity={0.9} />
      {/* longrine sous l'arête SE, dans l'ombre */}
      <path d={`M${S2[0]},${S2[1]} L${E2[0]},${E2[1]} L${E2[0]},${E2[1] + 2.6} L${S2[0]},${S2[1] + 2.6} Z`} fill="#4d3823" />
      <line x1={S2[0]} y1={S2[1]} x2={E2[0]} y2={E2[1]} stroke="#6f5334" strokeWidth={1.1} opacity={0.9} />
      {/* pilotis de l'arête SE, marque de flottaison, reflet d'aplomb */}
      {pilots.map((t, i) => {
        const px = S2[0] + u[0] * t
        const py = S2[1] + u[1] * t + 2.4
        const hp = 9 + rnd() * 3.5
        return (
          <g key={`n${i}`}>
            <rect x={px - 1.6} y={py} width={3.2} height={hp} fill="#6b4f31" />
            <rect x={px - 1.6} y={py} width={1.1} height={hp} fill="#98774e" />
            <rect x={px + 0.9} y={py} width={0.7} height={hp} fill="#493419" opacity={0.8} />
            {i > 0 && <rect x={px - 1.7} y={py + hp - 3.2} width={3.4} height={1.4} fill="#48684f" opacity={0.7} />}
            {i > 0 && <ellipse cx={px} cy={py + hp - 1.4} rx={2.8} ry={1} fill="#e8f4ec" opacity={0.45} />}
            {i === 2 && <Reflet x={px} y={py + hp - 1} w={5} h={11} c="#43301c" o={0.44} seed={seed + 9 + i} />}
          </g>
        )
      })}
      {/* pieu d'amarrage au bout du ponton */}
      <g>
        <rect x={E2[0] - 1.9} y={E2[1] - 12} width={3.6} height={17} fill="#6b4f31" />
        <rect x={E2[0] - 1.9} y={E2[1] - 12} width={1.2} height={17} fill="#9c7b51" />
        <ellipse cx={E2[0] - 0.1} cy={E2[1] - 12.2} rx={2.2} ry={1} fill="#b18e5f" />
        <path d={`M${E2[0] - 2.1},${E2[1] - 8.4} q2,1.2 4,0 M${E2[0] - 2.1},${E2[1] - 6.8} q2,1.2 4,0`} stroke="#dccaa0" strokeWidth={0.9} fill="none" />
        <Reflet x={E2[0]} y={E2[1] + 4} w={5} h={11} c="#43301c" o={0.4} seed={seed + 3} />
      </g>
      <AOBase rx={10} ry={3.6} cx={S1[0] + 5} cy={S1[1] + 4} o={0.85} />
    </g>
  )
}

/* ── quai de pierre appareillée ───────────────────────────────────────────── */
function Bitte({ x, y, h = 7.5, s = 1 }: { x: number; y: number; h?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={1.6} cy={0.5} rx={3.6} ry={1.3} fill={PAL.ombrePortee} opacity={0.22} filter="url(#a-flou1)" />
      <path d={`M-2.2,0 L-1.8,${-h} q1.8,-1.3 3.7,0 L2.2,0 Z`} fill="#7d5f3b" />
      <path d={`M-2.2,0 L-1.8,${-h} q0.7,-0.5 1.4,-0.45 L-0.7,0 Z`} fill="#b08c5d" />
      <ellipse cx={0} cy={-h - 0.45} rx={2} ry={0.9} fill="#c39e6d" />
      <path d={`M-2.1,${-h * 0.62} q2.1,1.25 4.2,0 M-2.1,${-h * 0.44} q2.1,1.25 4.2,0`} stroke="#dccaa0" strokeWidth={0.85} fill="none" />
    </g>
  )
}

function Quai({ n }: { n: number }) {
  const [ax, ay] = QA
  const [bx, by] = QB
  const dx = bx - ax
  const dy = by - ay
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI
  const long = Math.hypot(dx, dy)
  const rnd = alea(21)
  // dallage : deux rangs de dalles irrégulières, joints ouverts
  const P = (t: number, u: number): [number, number] => [ax + dx * t + QV[0] * u, ay + dy * t + QV[1] * u]
  const tonsAv = ['#b4a684', '#bfb18e', '#a89a79', '#b9ab88']
  const tonsAr = ['#c5b894', '#cec1a0', '#bbad8b', '#c9bc99']
  const dalles = []
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 2; j++) {
      const t0 = i / 5 + 0.005
      const t1 = (i + 1) / 5 - 0.005
      const u0 = j / 2 + 0.012
      const u1 = (j + 1) / 2 - 0.012
      const a0 = P(t0, u0)
      const a1 = P(t1, u0)
      const a2 = P(t1, u1)
      const a3 = P(t0, u1)
      const tons = j === 0 ? tonsAv : tonsAr
      dalles.push(<path key={`${i}-${j}`} d={`M${a0[0]},${a0[1]} L${a1[0]},${a1[1]} L${a2[0]},${a2[1]} L${a3[0]},${a3[1]} Z`} fill={tons[Math.floor(rnd() * 4)]} />)
    }
  }
  return (
    <g>
      {/* ombre du quai portée dans l'eau */}
      <g clipPath="url(#po-clip-eau)">
        <path d={`M${ax},${ay + QH} L${bx},${by + QH} L${bx - 5},${by + QH + 6} L${ax - 5},${ay + QH + 6} Z`} fill="#0c2e42" opacity={0.45} filter="url(#a-flou2)" />
      </g>

      {/* bande dallée le long de l'arête - le reste du sol reste le terre-plein */}
      <path d={D_QUAI_DECK} fill="#877b62" />
      {dalles}
      {/* la terre du port mord sur le dallage : l'arrière du quai n'a pas de bord net */}
      <path
        d={`M${ax + 4},${ay + QV[1] - 0.5} C${ax + 18},${ay + QV[1] - 2.5} ${ax + 32},${ay + 4} ${bx - 4},${by + QV[1] - 0.5} L${bx - 6},${by + QV[1] + 2.4} C${ax + 32},${ay + 7} ${ax + 18},${ay + 0.6} ${ax + 3},${ay + QV[1] + 2.4} Z`}
        fill="#b3a47e"
        opacity={0.3}
        filter="url(#a-flou2)"
      />
      <path d={`M${ax + 24},${ay + 7} L${bx - 5},${by - 1} L${bx - 2},${by + 3} L${ax + 26},${ay + 11} Z`} fill="#a4977a" opacity={0.28} filter="url(#a-flou2)" />

      {/* retour d'angle au sud-est : le quai s'arrête, on voit son épaisseur */}
      <path d={`M${bx},${by} L${bx + QV[0]},${by + QV[1]} L${bx + QV[0]},${by + QV[1] + QH - 2} L${bx},${by + QH} Z`} fill="url(#a-pierre-o)" />
      <path d={`M${bx},${by} L${bx + QV[0]},${by + QV[1]} L${bx + QV[0]},${by + QV[1] + 1.6} L${bx},${by + 1.6} Z`} fill={PAL.pierreMi} />

      {/* parement appareillé : mur vertical franchement plus sombre que le dallage */}
      <path d={D_QUAI_FACE} fill="url(#a-pierre-o)" />
      <g clipPath="url(#po-clip-quai)">
        <g transform={`translate(${ax},${ay}) rotate(${ang})`}>
          <MurPierre x={0} y={0} w={long + 2} h={QH + 2} seed={11} ombre />
        </g>
        {/* le mur regarde le large : voile d'ombre franche, plus dense en bas */}
        <path d={D_QUAI_FACE} fill="#41392b" opacity={0.27} />
        <path d={`M${ax},${ay + QH * 0.5} L${bx},${by + QH * 0.5} L${bx},${by + QH} L${ax},${ay + QH} Z`} fill="#241d12" opacity={0.17} filter="url(#a-flou2)" />
        {/* bandeau d'assise : rompt la grande surface du parement */}
        <path d={`M${ax},${ay + QH * 0.38} L${bx},${by + QH * 0.38}`} stroke="#d3cab3" strokeWidth={1.1} opacity={0.5} />
        <path d={`M${ax},${ay + QH * 0.38 + 1.1} L${bx},${by + QH * 0.38 + 1.1}`} stroke="#6f6552" strokeWidth={0.9} opacity={0.5} />
        {/* joints de l'appareil : assises et coupes verticales décalées, en un tracé */}
        <path d={[0.16, 0.62, 0.86].map((f) => `M${ax},${ay + QH * f} L${bx},${by + QH * f}`).join(' ')} stroke={PAL.pierreJoint} strokeWidth={0.7} opacity={0.5} />
        <path
          d={[0.16, 0.62]
            .flatMap((f, k) => Array.from({ length: 6 }, (_, i) => {
              const t = (i + (k % 2 ? 0.5 : 0)) / 6 + 0.06
              return `M${ax + dx * t},${ay + dy * t + QH * f} l0,${QH * 0.24}`
            }))
            .join(' ')}
          stroke={PAL.pierreJoint}
          strokeWidth={0.6}
          opacity={0.42}
        />
        {/* quelques blocs qui accrochent encore la lumière rasante */}
        <path
          d={`M${ax + dx * 0.1},${ay + dy * 0.1 + 2} l6,2.2 l-1.2,2.2 l-6,-2.2 Z M${ax + dx * 0.44},${ay + dy * 0.44 + 6} l5,1.8 l-1,2 l-5,-1.8 Z M${ax + dx * 0.76},${ay + dy * 0.76 + 2.4} l5.5,2 l-1.1,2.1 l-5.5,-2 Z`}
          fill="#e2dac6"
          opacity={0.3}
        />
        {/* ombre franche du couronnement */}
        <path d={`M${ax},${ay} L${bx},${by} L${bx},${by + 3} L${ax},${ay + 3} Z`} fill={PAL.ombrePortee} opacity={0.45} filter="url(#a-flou1)" />
        {/* pied mouillé : algues, retour de lumière de l'eau */}
        <path d={`M${ax},${ay + QH - 3.2} L${bx},${by + QH - 3.2} L${bx},${by + QH} L${ax},${ay + QH} Z`} fill="#3c5844" opacity={0.45} />
        <path d={`M${ax},${ay + QH - 1} L${bx},${by + QH - 1}`} stroke="#96cfc4" strokeWidth={1.5} opacity={0.28} />
      </g>
      {/* couronnement : dalles de rive irrégulières qui accrochent le soleil */}
      {Array.from({ length: 6 }, (_, i) => {
        const t0 = i / 6 + 0.006
        const t1 = (i + 1) / 6 - 0.006
        const ep = 1.9 + rnd() * 0.9
        return (
          <path
            key={`d${i}`}
            d={`M${ax + dx * t0},${ay + dy * t0} L${ax + dx * t1},${ay + dy * t1} L${ax + dx * t1},${ay + dy * t1 - ep} L${ax + dx * t0},${ay + dy * t0 - ep} Z`}
            fill={i % 2 ? '#ded6c1' : PAL.pierreLit}
          />
        )
      })}
      {/* arête du couronnement : liseré clair, brisé dalle par dalle */}
      <path
        d={Array.from({ length: 6 }, (_, i) => {
          const t0 = i / 6 + 0.02
          const t1 = (i + 1) / 6 - 0.02
          return `M${ax + dx * t0},${ay + dy * t0 - 2.4} L${ax + dx * t1},${ay + dy * t1 - 2.4}`
        }).join(' ')}
        stroke="#f6f1e3"
        strokeWidth={1}
        opacity={0.7}
      />
      {/* enrochement là où le quai meurt dans la grève (côté terre) */}
      <g>
        <ellipse cx={ax + 4} cy={ay - 3} rx={7} ry={3.2} fill={PAL.ombrePortee} opacity={0.2} filter="url(#a-flou2)" />
        <path d={`M${ax + 1},${ay + 1} L${ax - 1},${ay - 3} L${ax + 3.6},${ay - 6} L${ax + 7},${ay - 3} L${ax + 5.6},${ay + 0.5} Z`} fill="#7a7159" />
        <path d={`M${ax - 1},${ay - 3} L${ax + 3.6},${ay - 6} L${ax + 5},${ay - 4.6} L${ax + 0.6},${ay - 2.2} Z`} fill="#a09781" />
        <path d={`M${ax + 3.4},${ay - 6.6} L${ax + 6.4},${ay - 9} L${ax + 9.4},${ay - 6.6} L${ax + 7},${ay - 4.2} Z`} fill="#6e6552" />
        <path d={`M${ax + 3.4},${ay - 6.6} L${ax + 6.4},${ay - 9} L${ax + 7.6},${ay - 7.8} L${ax + 4.6},${ay - 5.6} Z`} fill="#948b74" />
      </g>
      {/* écume qui bat le parement */}
      <path d={`M${ax - 1},${ay + QH + 0.5} L${bx + 1},${by + QH + 0.5}`} stroke="#eef8f2" strokeWidth={1.5} fill="none" strokeDasharray="6 5 12 4" opacity={0.55}>
        <animate attributeName="opacity" values="0.55;0.26;0.55" dur="5s" repeatCount="indefinite" />
      </path>

      {/* bittes d'amarrage et anneaux scellés */}
      {[0.14, 0.42, 0.7].map((t, i) => (
        <Bitte key={t} x={ax + dx * t + 2.5} y={ay + dy * t - 2.4} h={7 + rnd()} s={0.95 + i * 0.05} />
      ))}
      <circle cx={ax + dx * 0.28 + 2} cy={ay + dy * 0.28 - 1} r={2} fill="none" stroke="#7c705c" strokeWidth={1.3} />
      {n >= 4 && <circle cx={ax + dx * 0.56 + 2} cy={ay + dy * 0.56 - 1} r={1.9} fill="none" stroke="#7c705c" strokeWidth={1.2} />}
    </g>
  )
}

/* ── bateaux ──────────────────────────────────────────────────────────────── */
/** œil peint à la proue - apotropaïque */
function OeilPeint({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-3,0 Q0,-2.4 3,0 Q0,2.2 -3,0 Z" fill="#f2ebd8" />
      <circle cx={-0.4} cy={-0.1} r={1.1} fill="#24405b" />
      <path d="M-3.2,-1.2 Q0,-3.4 3.2,-1.2" stroke="#6b4a2c" strokeWidth={0.7} fill="none" />
    </g>
  )
}

/**
 * Coque volumique de trois quarts : ouverture de pont en ellipse foreshortenée,
 * bordé à clins sur le flanc, étrave et étambot relevés, œil peint à la proue.
 */
function Coque({
  l,
  rx,
  prof = 10.5,
  sombre = false,
  bande,
  seed = 6,
}: {
  l: number
  rx: number
  prof?: number
  sombre?: boolean
  bande?: string
  seed?: number
}) {
  const ry = rx * 0.24
  const cy = -ry - 2.4
  const bas = cy + prof
  const clins = []
  for (let i = 0; i < 3; i++) {
    const k = 1 + i * 0.05
    const o = 2 + i * (prof * 0.24)
    clins.push(
      <path
        key={i}
        d={`M${-rx * k - 1},${cy + o * 0.42} Q0,${cy + ry + o + 1.4} ${rx * k + 1},${cy + o * 0.42}`}
        stroke={i % 2 ? (sombre ? '#332619' : '#5b4227') : sombre ? '#7a6546' : '#a5814f'}
        strokeWidth={prof > 13 ? 1.7 : 1.35}
        fill="none"
        opacity={0.85}
      />,
    )
  }
  return (
    <g>
      {/* intérieur dans la pénombre + face interne du bordé opposé, éclairée */}
      <ellipse cx={0} cy={cy} rx={rx} ry={ry} fill="#38290f" />
      <path d={`M${-rx},${cy} A${rx},${ry} 0 0 1 ${rx},${cy} L${rx - 1.5},${cy} A${rx - 1.5},${ry - 0.8} 0 0 0 ${-rx + 1.5},${cy} Z`} fill={sombre ? '#7b6747' : '#9c7a51'} />
      {/* flanc : plat-bord éclairé → bas de bordé dans l'ombre */}
      <path
        d={`M${-l},${cy - 1.2} C${-l + 1.4},${cy + prof * 0.48} ${-rx * 0.68},${bas} 0,${bas} C${rx * 0.68},${bas} ${l - 1.4},${cy + prof * 0.52} ${l},${cy - 0.8} L${rx},${cy} A${rx},${ry} 0 0 1 ${-rx},${cy} Z`}
        fill={sombre ? 'url(#po-coque-noire)' : 'url(#po-coque)'}
      />
      {clins}
      {bande && <path d={`M${-rx * 1.02},${cy + 1.4} Q0,${cy + ry + 3.4} ${rx * 1.02},${cy + 1.4}`} stroke={bande} strokeWidth={2.2} fill="none" opacity={0.9} />}
      {/* plat-bord : liseré clair sur l'arête proche */}
      <path d={`M${-rx},${cy} A${rx},${ry} 0 0 1 ${rx},${cy}`} stroke={sombre ? '#b39c72' : '#ccaa78'} strokeWidth={1.5} fill="none" opacity={0.92} />
      {/* étrave puis étambot relevés */}
      <path d={`M${-l},${cy - 1} C${-l - 1.2},${cy - 3} ${-l - 0.9},${cy - 4.8} ${-l + 1.4},${cy - 5.8}`} stroke="#785a37" strokeWidth={1.7} fill="none" strokeLinecap="round" />
      <path d={`M${-l + 0.2},${cy - 1.4} C${-l - 0.7},${cy - 3} ${-l - 0.4},${cy - 4.4} ${-l + 1.8},${cy - 5.4}`} stroke="#a5814f" strokeWidth={0.7} fill="none" strokeLinecap="round" />
      <path d={`M${l},${cy - 0.6} C${l + 1.1},${cy - 2.6} ${l + 0.8},${cy - 4.2} ${l - 1.2},${cy - 5.1}`} stroke="#6a4e30" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      {/* flottaison : eau qui frange la coque */}
      <path d={`M${-l + 3},${bas - 0.4} Q0,${bas + 1.8} ${l - 3},${bas - 0.2}`} stroke="#cfe6dc" strokeWidth={1} fill="none" opacity={0.3} />
      <OeilPeint x={-l + rx * 0.3} y={cy + prof * 0.28} s={rx > 18 ? 1.05 : 0.8} />
      {/* bancs de nage vus en raccourci */}
      {[-0.45, 0, 0.45].map((t, i) => {
        const bxx = rx * t
        const half = ry * Math.sqrt(Math.max(0, 1 - t * t)) * 0.94
        return <path key={i} d={`M${bxx - 0.9},${cy - half} L${bxx + 0.9},${cy - half + 0.4} L${bxx + 0.9},${cy + half} L${bxx - 0.9},${cy + half - 0.4} Z`} fill={(seed + i) % 2 ? '#9a7748' : '#87683f'} />
      })}
    </g>
  )
}

/** rame : manche de bois, pelle immergée, remous à l'entrée dans l'eau */
function Rame({ x, y, a = 34, l = 15 }: { x: number; y: number; a?: number; l?: number }) {
  const r = (a * Math.PI) / 180
  const ex = x - l * Math.cos(r)
  const ey = y + l * Math.sin(r)
  return (
    <>
      <line x1={x} y1={y} x2={ex} y2={ey} stroke="#6b4f30" strokeWidth={1.9} strokeLinecap="round" />
      <ellipse cx={ex} cy={ey} rx={2.8} ry={1.5} transform={`rotate(${-a} ${ex} ${ey})`} fill="#9c7a4d" />
      <ellipse cx={ex - 0.4} cy={ey + 1.1} rx={2.8} ry={1} fill="#cfe8e0" opacity={0.4} />
    </>
  )
}

/**
 * Voile carrée modelée : creux du vent (bord d'attaque au soleil à gauche,
 * chute dans l'ombre à droite), bandes de ris et cargues décrivant le galbe.
 */
function Voile({ demiL = 10, haut = -24, bas = -9, rouge = false, bande = false }: { demiL?: number; haut?: number; bas?: number; rouge?: boolean; bande?: boolean }) {
  const H = haut
  const B = bas
  const c = (B - H) * 0.26 // profondeur du ventre
  const D = demiL
  return (
    <g>
      <path d={`M${-D},${H} C${-D * 0.34},${H + c * 1.2} ${D * 0.46},${H + c} ${D},${H + 0.7} L${D},${B} C${D * 0.46},${B - c * 0.9} ${-D * 0.34},${B - c * 1.1} ${-D},${B - 0.5} Z`} fill={rouge ? 'url(#po-voile-r)' : 'url(#po-voile)'} />
      {/* éclat du ventre, resserré vers le bord d'attaque (NW) */}
      <path d={`M${-D * 0.72},${H + 1.8} C${-D * 0.42},${H + c * 1.15} ${-D * 0.24},${H + c} ${-D * 0.18},${H + c * 0.7} L${-D * 0.22},${B - c * 0.7} C${-D * 0.42},${B - c} ${-D * 0.6},${B - 1.2} ${-D * 0.72},${B - 0.6} Z`} fill={rouge ? '#f0b193' : '#fffdf6'} opacity={0.24} />
      {/* pli d'ombre franc le long de la chute */}
      <path d={`M${D * 0.34},${H + c * 1.08} C${D * 0.68},${H + c * 0.9} ${D * 0.9},${H + 1.8} ${D},${H + 0.7} L${D},${B} C${D * 0.9},${B - 1.6} ${D * 0.66},${B - c * 0.85} ${D * 0.34},${B - c} Z`} fill={rouge ? '#5f2a20' : '#786a52'} opacity={0.5} />
      {/* bandes de ris : elles épousent la courbure → lisent le volume */}
      {[0.3, 0.62].map((t) => {
        const y0 = H + (B - H) * t
        return (
          <path
            key={t}
            d={`M${-D},${y0 - 0.4} C${-D * 0.34},${y0 + c * (1.15 - t * 0.5)} ${D * 0.46},${y0 + c * (0.95 - t * 0.4)} ${D},${y0 + 0.4}`}
            stroke={rouge ? '#8b4234' : '#93815f'}
            strokeWidth={1}
            fill="none"
            opacity={0.8}
          />
        )
      })}
      {/* cargues du guindant à la bordure */}
      <path
        d={[-0.62, -0.24, 0.16, 0.56].map((t) => `M${D * t},${H + c * (1.1 - Math.abs(t) * 0.5)} L${D * t * 1.03},${B - c * (1 - Math.abs(t) * 0.45)}`).join(' ')}
        stroke={rouge ? '#8b4234' : '#b6a684'}
        strokeWidth={0.55}
        fill="none"
        opacity={0.55}
      />
      {bande && (
        <path
          d={`M${-D * 0.97},${H + (B - H) * 0.46} C${-D * 0.32},${H + (B - H) * 0.46 + c * 1.05} ${D * 0.46},${H + (B - H) * 0.46 + c * 0.85} ${D * 0.97},${H + (B - H) * 0.46}`}
          stroke={rouge ? '#eed49f' : '#b8503f'}
          strokeWidth={2.4}
          fill="none"
          opacity={0.9}
        />
      )}
      {/* ralingues : guindant éclairé, chute sombre */}
      <path d={`M${-D},${H} L${-D},${B - 0.5}`} stroke={rouge ? '#f4bda4' : '#fffef8'} strokeWidth={1} opacity={0.8} />
      <path d={`M${D},${H + 0.7} L${D},${B}`} stroke={rouge ? '#5f2a20' : '#8b7d63'} strokeWidth={1} opacity={0.75} />
    </g>
  )
}

/** mât : trois valeurs verticales (lumière NW, demi-teinte, ombre est) */
function Mat({ x = 0, base = -6, haut = -26 }: { x?: number; base?: number; haut?: number }) {
  return (
    <g>
      <rect x={x - 1.5} y={haut} width={3} height={base - haut} fill="#785a37" />
      <rect x={x - 1.5} y={haut} width={1.05} height={base - haut} fill="#ab8760" />
      <rect x={x + 0.8} y={haut} width={0.7} height={base - haut} fill="#4d3822" opacity={0.85} />
      <ellipse cx={x} cy={haut - 0.4} rx={1.9} ry={0.9} fill="#c2a173" />
    </g>
  )
}

function Barque({ x = 0, y = 0, s = 1, seed = 5, rames = true }: { x?: number; y?: number; s?: number; seed?: number; rames?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={3} cy={4} rx={14} ry={3} fill="#0c2e42" opacity={0.38} filter="url(#a-flou2)" />
      <Reflet x={1} y={3.6} w={23} h={11} c="#5a4429" o={0.36} seed={seed} />
      {rames && (
        <>
          <Rame x={-4} y={-3} a={40} l={13} />
          <Rame x={4} y={-2.6} a={48} l={11.5} />
        </>
      )}
      <Coque l={14} rx={10} prof={9} seed={seed} />
      {/* nasse d'osier et filet en vrac au fond */}
      <ellipse cx={4} cy={-4.6} rx={3.1} ry={1.3} fill="#8b7a4e" />
      <path d="M1.3,-5.1 q2.6,1.2 5.4,0 M1.8,-4.1 q2.2,1 4.4,0" stroke="#cbb98a" strokeWidth={0.45} fill="none" opacity={0.8} />
      <path d="M-5.6,-5.8 q2,1.4 4,0.2" stroke="#b9a778" strokeWidth={1.5} fill="none" opacity={0.7} />
    </g>
  )
}

function Voilier({ x = 0, y = 0, s = 1, rouge = false, seed = 8 }: { x?: number; y?: number; s?: number; rouge?: boolean; seed?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={4} cy={4.8} rx={19} ry={3.6} fill="#0c2e42" opacity={0.4} filter="url(#a-flou2)" />
      <Reflet x={2} y={4.2} w={30} h={17} c="#5a4429" o={0.34} seed={seed} />
      {/* aviron-gouvernail à l'étambot */}
      <line x1={14} y1={-3.8} x2={22} y2={4} stroke="#785a37" strokeWidth={1.8} strokeLinecap="round" />
      <ellipse cx={22.5} cy={4.4} rx={2.7} ry={1.5} transform="rotate(45 22.5 4.4)" fill="#6a4e30" />
      <Coque l={18} rx={13} prof={11} bande={rouge ? '#8c4a3c' : '#8f6a3e'} seed={seed} />
      {/* mât, vergue, gréement */}
      <Mat x={1} base={-5.4} haut={-42} />
      <line x1={-11.6} y1={-35.4} x2={13.6} y2={-35.4} stroke="#6a4e30" strokeWidth={1.7} />
      <line x1={-11.6} y1={-36.1} x2={13.6} y2={-36.1} stroke="#a8845d" strokeWidth={0.75} />
      <path d="M1,-41.4 L-12,-7.4 M1,-41.4 L13.4,-7 M1,-41.4 L-18,-5.6" stroke="#c9b689" strokeWidth={0.6} fill="none" opacity={0.7} />
      <Voile demiL={12.4} haut={-34.6} bas={-10.4} rouge={rouge} bande />
      {/* flamme de tête de mât */}
      <path d="M1,-42.6 L8.4,-40.8 L1,-39.2 Z" fill={rouge ? '#4fa3a5' : '#c2694f'}>
        <animateTransform attributeName="transform" type="rotate" values="-6 1 -41;6 1 -41;-6 1 -41" dur="4.5s" repeatCount="indefinite" />
      </path>
      {/* pont chargé : amphores calées entre les bancs */}
      <ellipse cx={-7} cy={-5} rx={3} ry={1.35} fill="#8b5f38" />
      <ellipse cx={8.2} cy={-4.8} rx={2.7} ry={1.25} fill="#7d5533" />
    </g>
  )
}

function Trireme({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  const shields = [-16.2, -10.8, -5.4, 0, 5.4, 10.8, 16.2]
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={5} cy={6.6} rx={30} ry={4.4} fill="#0a2a3d" opacity={0.42} filter="url(#a-flou2)" />
      <Reflet x={0} y={6} w={48} h={18} c="#3b2e1e" o={0.36} seed={12} />

      {/* rangée basse : rames courtes, presque à plat sur l'eau */}
      <g opacity={0.92}>
        <animateTransform attributeName="transform" type="rotate" values="-1.8 -4 -2;1.5 -4 -2;-1.8 -4 -2" dur="6s" repeatCount="indefinite" />
        {[-15, -7.5, 0, 7.5, 15].map((ox, i) => (
          <Rame key={ox} x={ox} y={0.4} a={13} l={11 + (i % 2) * 1.6} />
        ))}
      </g>

      {/* coque longue, bordé sombre, bande de proue ocre */}
      <Coque l={26} rx={21} prof={13} sombre bande="#a8813a" seed={4} />

      {/* parexeiresia : caisson latéral d'où sort la rangée haute */}
      <path d="M-21,-5.6 C-10.5,-2.4 10.5,-2.4 21,-5.6 L21,-3.1 C10.5,0.1 -10.5,0.1 -21,-3.1 Z" fill="#63502f" />
      <path d="M-21,-5.6 C-10.5,-2.4 10.5,-2.4 21,-5.6 L21,-4.5 C10.5,-1.3 -10.5,-1.3 -21,-4.5 Z" fill="#9a8054" />
      {/* rangée haute : rames longues, cadence décalée */}
      <g>
        <animateTransform attributeName="transform" type="rotate" values="1.6 -4 -4;-1.7 -4 -4;1.6 -4 -4" dur="6s" repeatCount="indefinite" />
        {[-17, -9.5, -2, 5.5, 13].map((ox, i) => (
          <Rame key={ox} x={ox} y={-3.6} a={34} l={17 + (i % 2) * 2} />
        ))}
      </g>

      {/* éperon de bronze à trois lames, soudé à l'étrave */}
      <path d="M-25,-7 C-30.5,-6.8 -35.5,-5.8 -41.4,-3.2 C-36,-1.8 -30,-2.6 -25,-2.8 Z" fill="url(#po-bronze)" />
      <path d="M-25,-6.6 C-30.5,-6.4 -35.5,-5.4 -40.6,-3.2 C-36,-3.5 -30,-4.5 -25,-4.7 Z" fill="#f0d68e" opacity={0.55} />
      <path d="M-28,-3 L-37.8,-1.7 M-28,-4.8 L-37.8,-3.4" stroke="#5c4018" strokeWidth={0.85} opacity={0.9} />
      <path d="M-40,-0.4 Q-32,3.2 -23,2.8" stroke="#dcf0e6" strokeWidth={1.8} fill="none" opacity={0.5}>
        <animate attributeName="opacity" values="0.5;0.24;0.5" dur="4s" repeatCount="indefinite" />
      </path>
      {/* étambot recourbé (aphlaston) */}
      <path d="M26,-6.4 C31.5,-10.4 33.4,-16 29.6,-19.8 C28.3,-21.3 26.4,-21.1 25.6,-19.6" stroke="#63502f" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <path d="M26,-6.4 C31,-10.2 32.7,-15.4 29.3,-19" stroke="#a8895b" strokeWidth={0.9} fill="none" />

      {/* pavois : boucliers ronds accrochés au plat-bord */}
      {shields.map((bx, i) => {
        const t = bx / 21
        const by = -8.6 + 2 * (1 - t * t)
        const bronze = i % 2 === 0
        return (
          <g key={bx}>
            <circle cx={bx} cy={by} r={2.9} fill={bronze ? '#a8813a' : '#8c4a3c'} />
            <path d={`M${bx - 2.9},${by} A2.9,2.9 0 0 1 ${bx},${by - 2.9} A2.9,2.9 0 0 0 ${bx - 2.9},${by} Z`} fill={bronze ? '#e0bc66' : '#c07257'} />
            <circle cx={bx} cy={by} r={0.95} fill={bronze ? '#f6e2a4' : '#e2c480'} />
          </g>
        )
      })}

      {/* mât, grande voile rayée, gréement */}
      <Mat x={2} base={-8.4} haut={-52} />
      <line x1={-13} y1={-45} x2={17} y2={-45} stroke="#6a4e30" strokeWidth={1.9} />
      <line x1={-13} y1={-45.8} x2={17} y2={-45.8} stroke="#a8845d" strokeWidth={0.85} />
      <path d="M2,-51.4 L-18,-9.4 M2,-51.4 L21,-9.2 M2,-51.4 L-25,-7 M2,-51.4 L25,-7.4" stroke="#c9b689" strokeWidth={0.6} fill="none" opacity={0.7} />
      <Voile demiL={14.6} haut={-44} bas={-15} rouge bande />
      <path d="M2,-53 L11.4,-50.6 L2,-48.8 Z" fill="#4fa3a5">
        <animateTransform attributeName="transform" type="rotate" values="-7 2 -51;7 2 -51;-7 2 -51" dur="4.2s" repeatCount="indefinite" />
      </path>
      {/* tente de poupe du triérarque */}
      <path d="M16,-9 L24.4,-9 L22.6,-15.4 L17.8,-15.4 Z" fill="#b2a684" />
      <path d="M16,-9 L17.8,-15.4 L19.7,-15.4 L18.4,-9 Z" fill="#d6cbaa" />
      <path d="M17.8,-15.4 L22.6,-15.4 L22,-16.6 L18.4,-16.6 Z" fill="#8c4a3c" />
    </g>
  )
}

/* ── accessoires ──────────────────────────────────────────────────────────── */
function Mouette({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s})`}>
      <path d="M-2.6,0 C-3.2,-2 -1.5,-3.2 0.4,-3.1 C2.3,-3 3.2,-1.5 2.4,0 Z" fill="#f4f1e6" />
      <path d="M-2.4,-0.4 C-1.3,-2.2 0.6,-2.7 2,-1.8 C0.9,-2 -1,-1.7 -2.4,-0.4 Z" fill="#fffdf4" />
      <path d="M0.2,-2.2 C1.7,-2.4 2.8,-1.7 3,-0.6 L1.1,-1 Z" fill="#96a3a8" />
      <circle cx={-2.1} cy={-3.4} r={1.15} fill="#fbf8ee" />
      <circle cx={-2.55} cy={-3.6} r={0.32} fill="#3b3a33" />
      <path d="M-3.2,-3.3 L-4.7,-2.95 L-3.2,-2.75 Z" fill="#dd9a3c" />
    </g>
  )
}

/** amphores calées dans un râtelier de bois */
function AmphoresCalees({ x, y, s = 1, seed = 2, nb = 4 }: { x: number; y: number; s?: number; seed?: number; nb?: number }) {
  const rnd = alea(seed)
  const tons = ['#a3673f', '#8c552f', '#b1764a', '#96603a']
  const larg = nb * 5
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <AOBase rx={larg * 0.62} ry={3.2} cy={0.6} />
      <OmbreVolume w={larg} h={9} o={0.15} />
      <path d={`M${-larg / 2},0 L${-larg / 2 + 1},-6 M${larg / 2},0 L${larg / 2 - 1},-6`} stroke="#6a4e30" strokeWidth={1.6} />
      <path d={`M${-larg / 2 + 0.6},-4.6 L${larg / 2 - 0.6},-4.6`} stroke="#8a6941" strokeWidth={1.4} />
      {Array.from({ length: nb }, (_, i) => {
        const axx = -larg / 2 + 3 + i * 5
        const c = tons[Math.floor(rnd() * tons.length)]
        const h = 9.2 + rnd() * 1.6
        return (
          <g key={i}>
            <path
              d={`M${axx - 2.6},${-h * 0.3} C${axx - 3.6},${-h * 0.6} ${axx - 2.8},${-h * 0.9} ${axx - 1.5},${-h} L${axx - 2.3},${-h - 1.5} L${axx + 2.3},${-h - 1.5} L${axx + 1.5},${-h} C${axx + 2.8},${-h * 0.9} ${axx + 3.6},${-h * 0.6} ${axx + 2.6},${-h * 0.3} C${axx + 1.6},${-h * 0.08} ${axx - 1.6},${-h * 0.08} ${axx - 2.6},${-h * 0.3} Z`}
              fill={c}
            />
            <path d={`M${axx - 2.1},${-h * 0.4} C${axx - 2.8},${-h * 0.66} ${axx - 2.1},${-h * 0.9} ${axx - 1.3},${-h + 0.4}`} stroke="#d5a573" strokeWidth={1.15} fill="none" opacity={0.6} />
            <path d={`M${axx - 2},${-h - 1.1} q-1.5,-0.9 -0.9,-2 M${axx + 2},${-h - 1.1} q1.5,-0.9 0.9,-2 M${axx + 1.5},${-h * 0.4} C${axx + 2.3},${-h * 0.68} ${axx + 2},${-h * 0.9} ${axx + 1.2},${-h + 0.4}`} stroke="#6a4324" strokeWidth={0.85} fill="none" opacity={0.85} />
          </g>
        )
      })}
    </g>
  )
}

/** ballot de laine ou de lin, sanglé de cordes */
function Ballot({ x, y, s = 1, c = '#cdb98c' }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2} cy={0.6} rx={7} ry={2.2} fill={PAL.ombrePortee} opacity={0.19} filter="url(#a-flou1)" />
      <path d="M-6,0 C-7,-4 -6,-7.4 -3.6,-8.2 C-1,-9.1 3.4,-9 5.2,-7.6 C7.2,-6 7.4,-2.6 6,0 Z" fill={c} />
      <path d="M-6,0 C-7,-4 -6,-7.4 -3.6,-8.2 C-2.4,-8.6 -1.4,-8.7 -0.6,-8.7 C-2.4,-7.4 -3.4,-3.6 -3,0 Z" fill="#e5d7b3" />
      <path d="M3.4,-8.8 C5.6,-7.6 7.4,-4 6,0 L3.2,0 C4.8,-3.4 4.6,-6.6 3.4,-8.8 Z" fill="#9d8869" opacity={0.9} />
      <path d="M-5.2,-5.8 C-2,-7 3,-7 6.4,-5.4 M-1.2,-8.8 L-0.6,0 M2.6,-8.9 L3.2,0" stroke="#8a6f45" strokeWidth={0.8} fill="none" opacity={0.75} />
    </g>
  )
}

/** cage d'osier */
function Cage({ x, y, s = 1, oiseau = false }: { x: number; y: number; s?: number; oiseau?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2} cy={0.5} rx={6} ry={2} fill={PAL.ombrePortee} opacity={0.19} filter="url(#a-flou1)" />
      <path d="M-5,0 L-4.2,-7.6 L4.2,-7.6 L5,0 Z" fill="#8e7343" />
      <path d="M-5,0 L-4.2,-7.6 L-1.8,-7.6 L-2.2,0 Z" fill="#b6974f" />
      <path d="M2.2,-7.6 L4.2,-7.6 L5,0 L2.6,0 Z" fill="#5b4623" opacity={0.9} />
      <path d="M-4.6,-5.2 L4.6,-5.2 M-4.4,-2.6 L4.7,-2.6" stroke="#68512e" strokeWidth={0.8} />
      <path d="M-2.4,-7.4 L-2.6,0 M0,-7.5 L0,0 M2.4,-7.4 L2.6,0" stroke="#68512e" strokeWidth={0.7} opacity={0.8} />
      <path d="M-4.6,-7.8 L4.6,-7.8 L4,-9 L-4,-9 Z" fill="#a3854c" />
      {oiseau && (
        <g>
          <ellipse cx={-0.4} cy={-3.4} rx={2} ry={1.5} fill="#e8ded0" />
          <circle cx={-2} cy={-4.8} r={0.95} fill="#f2eade" />
          <circle cx={-2.3} cy={-5} r={0.3} fill="#3b3a33" />
          <path d="M-2.9,-4.7 L-4,-4.4 L-2.9,-4.2 Z" fill="#d78f3a" />
        </g>
      )}
    </g>
  )
}

/** filet de pêche étendu sur des perches, mailles en losange */
function Filet({ x, y, s = 1, c = '#8b7f5d' }: { x: number; y: number; s?: number; c?: string }) {
  const dV = Array.from({ length: 10 }, (_, i) => {
    const t = i / 9
    const mx = -8 + 16 * t
    return `M${mx.toFixed(1)},${(-3.6 + t * 1.4).toFixed(1)} C${(mx + 1.2).toFixed(1)},${(1 + t).toFixed(1)} ${(mx + 1.2).toFixed(1)},${(5 + t).toFixed(1)} ${mx.toFixed(1)},${(9.4 + t).toFixed(1)}`
  }).join(' ')
  const dH = Array.from({ length: 7 }, (_, j) => {
    const t = j / 6
    return `M-8,${(-3.6 + 13 * t).toFixed(1)} C-2.6,${(-1.4 + 13 * t).toFixed(1)} 2.6,${(-1.4 + 13 * t).toFixed(1)} 8,${(-2.2 + 13 * t).toFixed(1)}`
  }).join(' ')
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2} cy={11} rx={10} ry={2.8} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou2)" />
      <rect x={-9.2} y={-6} width={1.9} height={17} fill="#6a4e30" />
      <rect x={-9.2} y={-6} width={0.8} height={17} fill="#96754c" />
      <rect x={7.4} y={-6} width={1.9} height={17} fill="#6a4e30" />
      <rect x={7.4} y={-6} width={0.8} height={17} fill="#96754c" />
      {/* nappe translucide : le filet lit comme une étoffe avant ses mailles */}
      <path d="M-8,-3.6 C-2.6,-1.4 2.6,-1.4 8,-2.2 L8,10.4 C2.6,11.6 -2.6,11.6 -8,10.4 Z" fill="#c4b992" opacity={0.3} />
      <path d="M-8.6,-4.4 C-2.6,-2 2.6,-2 8.4,-3" stroke="#a08f64" strokeWidth={1.2} fill="none" />
      <path d={dV} stroke={c} strokeWidth={0.5} fill="none" opacity={0.85} />
      <path d={dH} stroke={c} strokeWidth={0.5} fill="none" opacity={0.85} />
      {/* ourlet lesté du bas */}
      <path d="M-8,10.4 C-2.6,11.6 2.6,11.6 8,10.4" stroke="#7b6f4f" strokeWidth={1.1} fill="none" />
      <ellipse cx={-3.4} cy={-2.8} rx={1.3} ry={0.9} fill="#c9a465" />
      <ellipse cx={2.4} cy={-2.2} rx={1.2} ry={0.85} fill="#b8934f" />
      <ellipse cx={-1} cy={11.2} rx={1} ry={0.7} fill="#8d5f38" />
      <ellipse cx={4.4} cy={10.8} rx={1} ry={0.7} fill="#8d5f38" />
    </g>
  )
}

/** cordage lové */
function Cordage({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={0.9} cy={0.4} rx={5} ry={1.8} fill={PAL.ombrePortee} opacity={0.19} />
      <ellipse cx={0} cy={-0.6} rx={4.6} ry={1.9} fill="#8f7548" />
      <ellipse cx={-0.2} cy={-1.2} rx={4} ry={1.6} fill="#a78a58" />
      <ellipse cx={-0.4} cy={-1.9} rx={3} ry={1.25} fill="#bda06a" />
      <ellipse cx={-0.5} cy={-2.5} rx={1.9} ry={0.8} fill="#cdb27c" />
      <ellipse cx={-0.5} cy={-2.6} rx={0.85} ry={0.4} fill="#6d5836" />
      {/* le bout du cordage qui traîne */}
      <path d="M4.4,-0.9 q3.2,0.9 5,2.4" stroke="#a78a58" strokeWidth={1.2} fill="none" />
    </g>
  )
}

/** barque retournée sur la grève, en carénage : quille en l'air, étais, pot de poix */
function BarqueRenversee({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={4} cy={1.2} rx={17} ry={3.2} fill={PAL.ombrePortee} opacity={0.2} filter="url(#a-flou2)" />
      {/* carène : longue, basse, pointue aux deux bouts */}
      <path d="M-17,0 C-15.6,-3.4 -10,-6.6 -1,-7 C8,-7.4 14.6,-4.4 16.4,0 Z" fill="#84663f" />
      <path d="M-17,0 C-15.6,-3.4 -10,-6.6 -1,-7 C-5.6,-5.4 -9.4,-2.6 -10.6,0 Z" fill="#a88459" />
      <path d="M7,-6.4 C12,-5 15.2,-2.6 16.4,0 L12.6,0 C11.6,-2.4 9.6,-4.8 7,-6.4 Z" fill="#4b3520" opacity={0.9} />
      {/* quille faîtière éclairée + deux virures */}
      <path d="M-15.6,-1.4 C-11,-5 -5,-6.4 -1,-6.6 C4,-6.8 11.6,-4.6 15.4,-1.2" stroke="#c8a575" strokeWidth={1.2} fill="none" opacity={0.85} />
      <path d="M-14.4,0.4 C-10.4,-3.2 -5,-4.8 -1,-5 C4,-5.2 10.6,-3 14.2,0.4" stroke="#6b4f31" strokeWidth={0.85} fill="none" opacity={0.6} />
      <path d="M-12.6,1 C-9,-1.6 -4.4,-3 -1,-3.2 C3.6,-3.4 9,-1.4 12.4,1" stroke="#6b4f31" strokeWidth={0.8} fill="none" opacity={0.5} />
      {/* étrave relevée à gauche */}
      <path d="M-17,0 C-18.6,-1.8 -19,-3.6 -18,-4.6" stroke="#7a5c39" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      {/* étais de bois et pot de poix */}
      <path d="M-12,0.4 L-16,-4.4 M11.4,0.4 L15.4,-3.8" stroke="#6a4e30" strokeWidth={1.4} />
      <path d="M19.4,0 C18.6,-3 19.8,-4.4 21.4,-4.4 C23,-4.4 24.2,-3 23.4,0 Z" fill="#4a3a28" />
      <ellipse cx={21.4} cy={-4.3} rx={2.1} ry={0.8} fill="#26200f" />
    </g>
  )
}

/** nasse d'osier posée sur le sable */
function Nasse({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={1.4} cy={0.5} rx={4.6} ry={1.5} fill={PAL.ombrePortee} opacity={0.17} />
      <path d="M-4,0 C-4.4,-4 -2,-6.4 0,-6.4 C2,-6.4 4.4,-4 4,0 Z" fill="#9c8551" />
      <path d="M-4,0 C-4.4,-4 -2,-6.4 -0.6,-6.4 C-2,-5 -2.8,-2.6 -2.4,0 Z" fill="#c1a86c" />
      <path d="M-3.7,-2.4 q3.7,1.4 7.4,0 M-3.3,-4.4 q3.3,1.2 6.6,0" stroke="#786336" strokeWidth={0.6} fill="none" opacity={0.85} />
      <ellipse cx={0} cy={-6.4} rx={1.4} ry={0.6} fill="#5c4b29" />
    </g>
  )
}

/** séchoir : perche entre deux fourches, poissons pendus par la tête */
function Sechoir({ x, y, s = 1, seed = 6 }: { x: number; y: number; s?: number; seed?: number }) {
  const rnd = alea(seed)
  const P = -11.5 // hauteur de la perche
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2} cy={0.8} rx={9.5} ry={2.4} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou2)" />
      {[-8, 8].map((px) => (
        <g key={px}>
          <rect x={px - 0.85} y={P} width={1.8} height={-P} fill="#6a4e30" />
          <rect x={px - 0.85} y={P} width={0.7} height={-P} fill="#96754c" />
          <path d={`M${px - 2.2},${P - 2.4} L${px},${P + 0.4} L${px + 2.2},${P - 2.4}`} stroke="#7a5c39" strokeWidth={1.2} fill="none" />
        </g>
      ))}
      <line x1={-9.6} y1={P - 0.4} x2={9.6} y2={P - 0.4} stroke="#8a6941" strokeWidth={1.4} />
      <line x1={-9.6} y1={P - 1} x2={9.6} y2={P - 1} stroke="#b08c5d" strokeWidth={0.6} />
      {[-6, -2.6, 0.8, 4.2, 7].map((fx, i) => {
        const h = 5 + rnd() * 1.6
        const y0 = P + 1.2
        const y1 = y0 + h
        return (
          <g key={fx}>
            <line x1={fx} y1={P} x2={fx} y2={y0} stroke="#cbb98a" strokeWidth={0.5} />
            {/* corps fusiforme : flanc argenté éclairé au NW, dos sombre à droite */}
            <path d={`M${fx},${y0} C${fx - 1.6},${y0 + 1.4} ${fx - 1.6},${y1 - 1.4} ${fx},${y1} C${fx + 1.6},${y1 - 1.4} ${fx + 1.6},${y0 + 1.4} ${fx},${y0} Z`} fill={i % 2 ? '#a49b86' : '#98907c'} />
            <path d={`M${fx},${y0} C${fx - 1.6},${y0 + 1.4} ${fx - 1.6},${y1 - 1.4} ${fx},${y1} C${fx - 0.5},${y1 - 2} ${fx - 0.85},${y0 + 2} ${fx},${y0} Z`} fill="#dcd6c2" />
            <path d={`M${fx - 1.4},${y1 + 2} L${fx},${y1 - 0.6} L${fx + 1.4},${y1 + 2} Z`} fill={i % 2 ? '#7f7663' : '#736b59'} />
            <circle cx={fx - 0.4} cy={y0 + 1.2} r={0.32} fill="#4a4335" />
          </g>
        )
      })}
    </g>
  )
}

/** pile de madriers débités, calée sur deux traverses */
function PileBois({ x, y, s = 1, seed = 5 }: { x: number; y: number; s?: number; seed?: number }) {
  const rnd = alea(seed)
  const rangs = []
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 3; i++) {
      const bx = -8 + i * 5.4 + r * 1.6
      const by = -2.6 - r * 3.1
      const t = rnd()
      rangs.push(
        <path
          key={`${r}-${i}`}
          d={`M${bx},${by} h4.8 v2.9 h-4.8 Z`}
          fill={t > 0.5 ? '#8d6c43' : '#7d5f3b'}
        />,
        <path key={`l${r}-${i}`} d={`M${bx},${by} h4.8 v0.95 h-4.8 Z`} fill={t > 0.5 ? '#b39067' : '#a4835a'} />,
        <ellipse key={`e${r}-${i}`} cx={bx + 4.8} cy={by + 1.45} rx={1} ry={1.45} fill="#c2a179" />,
      )
    }
  }
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={3} cy={0.8} rx={13} ry={3.4} fill={PAL.ombrePortee} opacity={0.19} filter="url(#a-flou2)" />
      <OmbreVolume w={22} h={11} o={0.14} />
      <rect x={-10} y={-2.6} width={22} height={2.6} fill="#5f462d" />
      {rangs}
    </g>
  )
}

/** ancre appuyée contre un billot : fer sombre, arête NW claire */
function Ancre({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2.5} cy={0.8} rx={8} ry={2.4} fill={PAL.ombrePortee} opacity={0.2} filter="url(#a-flou2)" />
      {/* billot */}
      <rect x={2.6} y={-5} width={5.4} height={5} fill="#7d5f3b" />
      <ellipse cx={5.3} cy={-5} rx={2.7} ry={1.1} fill="#a4835a" />
      {/* verge inclinée, jas, pattes */}
      <path d="M-6,0 L1.6,-15" stroke="#4e4a44" strokeWidth={2.3} strokeLinecap="round" />
      <path d="M-5.4,-0.4 L2,-14.8" stroke="#8a867c" strokeWidth={0.8} strokeLinecap="round" />
      <path d="M-2.4,-6.6 L4.4,-9.8" stroke="#4e4a44" strokeWidth={1.9} strokeLinecap="round" />
      <path d="M-6,0 C-9.6,-1.2 -10.4,-4.6 -8.6,-6.6" stroke="#4e4a44" strokeWidth={2.1} fill="none" strokeLinecap="round" />
      <path d="M-6,0 C-3.2,-2 -1.8,-4.6 -2.4,-6.6" stroke="#4e4a44" strokeWidth={2.1} fill="none" strokeLinecap="round" />
      <path d="M-8.9,-6.8 l-2.2,-1.2 l1.6,2.6 Z M-2.2,-6.8 l2.2,-1.2 l-1.6,2.6 Z" fill="#5f5a52" />
      <circle cx={1.9} cy={-16} r={1.5} fill="none" stroke="#4e4a44" strokeWidth={1.1} />
    </g>
  )
}

/** chèvre de levage : bigue de bois penchée sur l'eau, moufle et caisse pendue */
function Chevre({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={3.5} cy={1} rx={9} ry={2.8} fill={PAL.ombrePortee} opacity={0.2} filter="url(#a-flou2)" />
      <OmbreVolume w={13} h={22} o={0.14} />
      {/* jambes et entretoises */}
      <path d="M-6.2,0 L-1.5,-23 M6.2,0 L1.5,-23" stroke="#6a4e30" strokeWidth={2.3} strokeLinecap="round" />
      <path d="M-5.6,-2 L-1.3,-22.4" stroke="#a08054" strokeWidth={0.9} />
      <path d="M-4.4,-8 L4.4,-8 M-3,-15.4 L3,-15.4" stroke="#8a6941" strokeWidth={1.3} />
      {/* flèche penchée vers le large + hauban arrière tendu */}
      <path d="M0,-23 L-15,-17.4" stroke="#6a4e30" strokeWidth={2.1} strokeLinecap="round" />
      <path d="M0,-23.4 L-14.6,-18" stroke="#a08054" strokeWidth={0.8} />
      <path d="M0,-23 L10,-2" stroke="#c9b689" strokeWidth={0.7} fill="none" />
      {/* moufle et charge suspendue au-dessus de l'eau */}
      <line x1={-14.2} y1={-17.4} x2={-14.2} y2={-9} stroke="#c9b689" strokeWidth={0.7} />
      <circle cx={-14.2} cy={-18.1} r={1.2} fill="#8a6941" />
      <rect x={-17.2} y={-9} width={6.2} height={5.4} fill="#8f6f42" />
      <rect x={-17.2} y={-9} width={6.2} height={1.5} fill="#b08a58" />
      <path d="M-17.2,-9 L-11,-3.6 M-11,-9 L-17.2,-3.6" stroke="#5f462d" strokeWidth={0.8} />
    </g>
  )
}

/* ── entrepôt, phare, comptoirs ───────────────────────────────────────────── */
function Entrepot({ x, y, w = 30, h = 14, g = 8 }: { x: number; y: number; w?: number; h?: number; g?: number }) {
  const prof = 10
  const deb = 5.5
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={w * 0.72} ry={w * 0.2} cy={2.4} />
      <AOBase rx={w * 0.5} ry={w * 0.13} cy={1.6} />
      <OmbreVolume w={w} h={h + g * 0.7} y={1} o={0.19} />
      {/* emmarchement de pierre : le volume se pose vraiment sur le sol */}
      <path d={`M${-w / 2 - 1},0 L${w / 2 + 3},0 L${w / 2 + 4.4},2.2 L${-w / 2 - 2.4},2.2 Z`} fill="#a2987f" />
      <path d={`M${-w / 2 - 1},0 L${w / 2 + 3},0 L${w / 2 + 3.5},0.7 L${-w / 2 - 1.5},0.7 Z`} fill="#c2b9a2" />
      <path d={`M${w / 2},0 L${w / 2 + 4.5},-2 L${w / 2 + 4.5},${-h - 2} L${w / 2},${-h} Z`} fill="url(#a-stuc-o)" />
      <path d={`M${-w / 2},0 L${-w / 2},${-h} L0,${-h - g} L${w / 2},${-h} L${w / 2},0 Z`} fill="url(#a-stuc-l)" />
      <MurPierre x={-w / 2} y={-5} w={w} h={5} seed={17} />
      <line x1={-w / 2 + 0.7} y1={0} x2={-w / 2 + 0.7} y2={-h + 0.5} stroke="#fff6e0" strokeWidth={1.1} opacity={0.5} />
      <line x1={w / 2 - 0.8} y1={0} x2={w / 2 - 0.8} y2={-h + 0.5} stroke={PAL.stucOmbre} strokeWidth={1.4} opacity={0.55} />
      {/* pans de bois apparents */}
      <path d={`M${-w / 2 + 5},-5 L${-w / 2 + 5},${-h + 1} M${w / 2 - 5},-5 L${w / 2 - 5},${-h + 1} M${-w / 2 + 5},${-h + 1} L${w / 2 - 5},${-h + 1}`} stroke="#8a6941" strokeWidth={1.2} opacity={0.55} fill="none" />
      <path d={`M${-w / 2},${-h + 3.2} L0,${-h - g + 3.4} L${w / 2},${-h + 3.2} L${w / 2},${-h} L0,${-h - g} L${-w / 2},${-h} Z`} fill={PAL.ombrePortee} opacity={0.22} filter="url(#a-flou1)" />
      {/* grande porte à deux vantaux */}
      <rect x={-6.5} y={-11.5} width={13} height={11.5} fill="#5a4326" />
      <rect x={-6.5} y={-11.5} width={13} height={1.3} fill="#241a08" opacity={0.7} />
      <path d="M-6.2,-11 L-0.8,-11 L-0.8,0 L-6.2,0 Z" fill="url(#a-bois-o)" />
      <path d="M0.8,-11 L6.2,-11 L6.2,0 L0.8,0 Z" fill="#463019" />
      <path d="M-5.6,-10.4 L-1.4,-1" stroke="#8a6941" strokeWidth={0.8} opacity={0.7} />
      {/* poutre de levage sous le faîtage et sa charge */}
      <path d={`M0,${-h - g + 2} L-9,${-h - g + 3.6}`} stroke="#6a4e30" strokeWidth={1.9} strokeLinecap="round" />
      <line x1={-8.4} y1={-h - g + 3.8} x2={-8.4} y2={-h + 3.4} stroke="#c9b689" strokeWidth={0.7} />
      <rect x={-10.1} y={-h + 3.4} width={3.6} height={3.2} fill="#8f6f42" />
      <rect x={-10.1} y={-h + 3.4} width={3.6} height={1} fill="#b08a58" />
      {/* toit à deux pans */}
      <path d={`M${-w / 2 - deb},${-h} L0,${-h - g} L0,${-h - g - prof} L${-w / 2 - deb},${-h - prof} Z`} fill="url(#a-toit-l)" />
      <path d={`M${w / 2 + deb},${-h} L0,${-h - g} L0,${-h - g - prof} L${w / 2 + deb},${-h - prof} Z`} fill="url(#a-toit-o)" />
      <path d={[0.34, 0.68].map((t) => `M${-w / 2 - deb},${-h - prof * t} L0,${-h - g - prof * t}`).join(' ')} stroke={PAL.toitOmbre} strokeWidth={0.9} opacity={0.5} strokeDasharray="3.2 1.1" />
      <path d={[0.34, 0.68].map((t) => `M${w / 2 + deb},${-h - prof * t} L0,${-h - g - prof * t}`).join(' ')} stroke="#5e3520" strokeWidth={0.9} opacity={0.4} strokeDasharray="3.2 1.1" />
      <line x1={-w / 2 - deb} y1={-h} x2={0} y2={-h - g} stroke={PAL.toitArete} strokeWidth={1.3} opacity={0.9} />
      <line x1={0} y1={-h - g} x2={0} y2={-h - g - prof} stroke={PAL.toitArete} strokeWidth={1.6} />
      <line x1={w / 2 + deb} y1={-h} x2={0} y2={-h - g} stroke={PAL.toitOmbre} strokeWidth={1} opacity={0.8} />
      <Mouette x={-w * 0.28} y={-h - g - prof + 0.5} s={0.7} />
    </g>
  )
}

function Phare({ x, y, h = 22, pierre = false }: { x: number; y: number; h?: number; pierre?: boolean }) {
  const wB = pierre ? 15 : 11
  const wH = pierre ? 10 : 7.5
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={wB * 0.85} ry={wB * 0.3} cy={1.5} />
      <OmbreVolume w={wB} h={h} y={1} o={0.18} />
      <path d={`M${-wB / 2},0 L${-wH / 2},${-h} L${wH / 2},${-h} L${wB / 2},0 Z`} fill={pierre ? 'url(#a-cyl-pierre)' : 'url(#a-bois-l)'} />
      {pierre ? (
        <>
          <path
            d={[0.16, 0.34, 0.52, 0.7, 0.86]
              .map((t) => {
                const wt = wB + (wH - wB) * t
                return `M${-wt / 2},${-h * t} L${wt / 2},${-h * t}`
              })
              .join(' ')}
            stroke={PAL.pierreJoint}
            strokeWidth={0.7}
            opacity={0.5}
          />
          <path d={`M${-wB / 2 + 1},0 L${-wH / 2 + 1},${-h}`} stroke="#f0eada" strokeWidth={1.2} opacity={0.5} />
          <path d={`M${wB / 2 - 1.2},0 L${wH / 2 - 1.2},${-h}`} stroke={PAL.pierreOmbre} strokeWidth={1.7} opacity={0.6} />
          <path d="M-2.6,0 L-2.6,-6 A2.6,2.6 0 0 1 2.6,-6 L2.6,0 Z" fill="#3c2d1a" />
          <path d="M-2.6,-6 A2.6,2.6 0 0 1 2.6,-6 L2.6,-5 A2.6,2.6 0 0 0 -2.6,-5 Z" fill="#241a08" opacity={0.7} />
        </>
      ) : (
        <>
          <path d={`M${-wB / 2 + 2},0 L${-wH / 2 + 1.6},${-h}`} stroke="#a07f52" strokeWidth={1.9} fill="none" />
          <path d={`M${wB / 2 - 2},0 L${wH / 2 - 1.6},${-h}`} stroke="#75593a" strokeWidth={1.9} fill="none" />
          {[0.3, 0.62].map((t) => {
            const wt = wB + (wH - wB) * t
            return <line key={t} x1={-wt / 2 + 1.4} y1={-h * t} x2={wt / 2 - 1.4} y2={-h * t} stroke="#96754c" strokeWidth={1.2} />
          })}
          <path
            d={`M${-wB / 2 + 2},-1.5 L${wH / 2 - 2},${-h * 0.62} M${wB / 2 - 2},-1.5 L${-wH / 2 + 2},${-h * 0.62} M${-wB / 2 + 2.6},${-h * 0.62} L${wH / 2 - 2},${-h}`}
            stroke="#8a6941"
            strokeWidth={0.95}
            fill="none"
            opacity={0.8}
          />
        </>
      )}
      {/* corniche puis plateforme du feu (galerie en encorbellement) */}
      <path
        d={`M${-wH / 2 - (pierre ? 3.6 : 2.2)},${-h} L${wH / 2 + (pierre ? 3.6 : 2.2)},${-h} L${wH / 2 + (pierre ? 2.4 : 1.4)},${-h - 2.6} L${-wH / 2 - (pierre ? 2.4 : 1.4)},${-h - 2.6} Z`}
        fill={pierre ? PAL.pierreLit : '#a4834f'}
      />
      <path d={`M${-wH / 2 - (pierre ? 3.6 : 2.2)},${-h} L${wH / 2 + (pierre ? 3.6 : 2.2)},${-h} L${wH / 2 + 1.6},${-h + 1.5} L${-wH / 2 - 1.6},${-h + 1.5} Z`} fill={PAL.ombrePortee} opacity={0.34} filter="url(#a-flou1)" />
      <path d={`M${-wH / 2 - 2.4},${-h - 2.6} L${wH / 2 + 2.4},${-h - 2.6} L${wH / 2 + 2.4},${-h - 3.8} L${-wH / 2 - 2.4},${-h - 3.8} Z`} fill={pierre ? '#c0b69f' : '#7b5f3b'} />
      {/* garde-corps de la galerie */}
      {pierre && <path d={[-5.4, -1.8, 1.8, 5.4].map((gx) => `M${gx},${-h - 8.4} l0,4.6`).join(' ')} stroke={PAL.pierreMi} strokeWidth={1.2} />}
      {/* brasero de bronze sur son trépied */}
      <path d={`M${pierre ? -5 : -3.8},${-h - 3.8} L${pierre ? 5 : 3.8},${-h - 3.8} L${pierre ? 3.4 : 2.6},${-h - 9.4} L${pierre ? -3.4 : -2.6},${-h - 9.4} Z`} fill="url(#po-bronze)" />
      <path d={`M${pierre ? -3.4 : -2.6},${-h - 9.4} L${pierre ? 3.4 : 2.6},${-h - 9.4} L${pierre ? 2.9 : 2.2},${-h - 8.2} L${pierre ? -2.9 : -2.2},${-h - 8.2} Z`} fill="#f7e3a8" opacity={0.9} />
      <path d={`M${pierre ? -4.2 : -3.2},${-h - 6.4} L${pierre ? 4.2 : 3.2},${-h - 6.4}`} stroke="#66481c" strokeWidth={0.8} opacity={0.7} />
      <circle cx={0} cy={-h - 11} r={13} fill="#f8c86c" opacity={0.26} filter="url(#a-flou4)" />
      {/* flammes : trois valeurs, langues effilées, plus modestes sur le bûcher de bois */}
      {(() => {
        const k = pierre ? 1 : 0.72
        const b = -h - 9.4
        return (
          <g>
            <path d={`M${-3.4 * k},${b} C${-4.2 * k},${b - 4.6 * k} ${-1.6 * k},${b - 6.4 * k} ${-0.6 * k},${b - 11.6 * k} C${1 * k},${b - 6.2 * k} ${3.8 * k},${b - 5 * k} ${3.2 * k},${b} Z`} fill="#c8501f" opacity={0.85}>
              <animate attributeName="opacity" values="0.85;0.55;0.85" dur="1.7s" repeatCount="indefinite" />
            </path>
            <path d={`M${-2.2 * k},${b} C${-2.8 * k},${b - 3.6 * k} ${-0.8 * k},${b - 5.2 * k} ${0.2 * k},${b - 9 * k} C${1.4 * k},${b - 5 * k} ${2.6 * k},${b - 3.8 * k} ${2.2 * k},${b} Z`} fill="#e8802c" />
            <path d={`M${-1.1 * k},${b} C${-1.4 * k},${b - 2.6 * k} ${0},${b - 3.6 * k} ${0.6 * k},${b - 6 * k} C${1.2 * k},${b - 3.4 * k} ${1.4 * k},${b - 2.2 * k} ${1.2 * k},${b} Z`} fill="#f7d16d" />
          </g>
        )
      })()}
      <Feu x={0} y={-h - 11} r={pierre ? 2.2 : 1.6} />
      <Fumee x={2.5} y={-h - (pierre ? 20 : 17)} />
    </g>
  )
}

/** comptoir phénicien : étal sous un vélum rayé, marchandises exotiques */
function Comptoir({ x, y, s = 1, c = '#7c4f7a', c2 = '#d8c9a4' }: { x: number; y: number; s?: number; c?: string; c2?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <AOBase rx={14} ry={4.4} cy={1} />
      <OmbreVolume w={24} h={19} o={0.16} />
      <rect x={-12} y={-20} width={1.9} height={20} fill="#6a4e30" />
      <rect x={-12} y={-20} width={0.75} height={20} fill="#96754c" />
      <rect x={10.2} y={-20} width={1.9} height={20} fill="#5b4229" />
      {/* vélum bombé : pan gauche au soleil, pan droit dans l'ombre, frange */}
      <path d="M-14,-19.4 C-6,-23.4 6,-23.4 14,-19.4 L14,-15 C6,-19 -6,-19 -14,-15 Z" fill={c} />
      <path d="M-14,-19.4 C-8,-22.4 -1,-23.3 2,-23.3 L2,-18.9 C-3,-18.9 -9,-17.2 -14,-15 Z" fill="#a577a0" opacity={0.65} />
      <path d="M-10.2,-21.2 L-9.6,-16.6 M-4,-22.9 L-3.7,-18.3 M2.4,-22.9 L2.7,-18.3 M8.8,-21.1 L9.1,-16.5" stroke={c2} strokeWidth={1.7} opacity={0.9} />
      <path d="M-14,-15 C-6,-19 6,-19 14,-15" stroke="#42283f" strokeWidth={1} fill="none" opacity={0.55} />
      <path d="M-14,-15 l0,2.4 M-9,-16.9 l0,2.4 M-4,-18.1 l0,2.4 M1,-18.6 l0,2.4 M6,-18.1 l0,2.4 M11,-16.6 l0,2.4" stroke={c} strokeWidth={1.3} opacity={0.85} />
      {/* étal : plateau clair, tréteaux dans l'ombre */}
      <path d="M-11,-8 L11,-8 L12.4,-6.4 L-12.4,-6.4 Z" fill="#bfaa80" />
      <path d="M-11,-8 L11,-8 L11.4,-7.4 L-11.4,-7.4 Z" fill="#e5d5ad" />
      <path d="M-12.4,-6.4 L-9.4,0 M12.4,-6.4 L9.4,0" stroke="#6a4e30" strokeWidth={1.5} />
      <path d="M-12.4,-6.4 L12.4,-6.4 L12.4,-4.9 L-12.4,-4.9 Z" fill={PAL.ombrePortee} opacity={0.32} filter="url(#a-flou1)" />
      {/* marchandises : rouleaux de pourpre, verre soufflé, safran, amphorette */}
      <path d="M-9.6,-8.2 L-9,-13.4 L-6.2,-13.4 L-5.6,-8.2 Z" fill="#8c3f5e" />
      <path d="M-9.6,-8.2 L-9,-13.4 L-7.8,-13.4 L-8.2,-8.2 Z" fill="#b45f80" />
      <path d="M-4.4,-8.2 L-3.9,-12.2 L-1.5,-12.2 L-1,-8.2 Z" fill="#5c4a76" />
      <path d="M-4.4,-8.2 L-3.9,-12.2 L-3,-12.2 L-3.3,-8.2 Z" fill="#7e6a99" />
      <ellipse cx={2.6} cy={-9.4} rx={2.6} ry={1.3} fill="#4f8f8a" />
      <ellipse cx={2.4} cy={-9.8} rx={1.8} ry={0.8} fill="#87ccc2" />
      <path d="M6.4,-8.2 C5.7,-10.4 7,-11.7 8.4,-11.7 C9.8,-11.7 11.1,-10.4 10.4,-8.2 Z" fill="#c9a441" />
      <path d="M6.4,-8.2 C5.7,-10.4 7,-11.7 8,-11.7 C7.2,-10.8 7,-9.4 7.2,-8.2 Z" fill="#e7cb77" />
    </g>
  )
}

/* ── composition par niveau ───────────────────────────────────────────────── */
export function Port({ n }: { n: number }) {
  const dalle = n >= 2
  return (
    <g>
      <PortDefs />
      {/* aire du port : terre battue, puis dallage sommaire quand il grandit */}
      <ellipse cx={18} cy={-6} rx={68} ry={26} transform="rotate(19 18 -6)" fill={dalle ? '#bcaf88' : '#b7a475'} opacity={0.4} />
      <ellipse cx={22} cy={-10} rx={48} ry={18} transform="rotate(19 22 -10)" fill={dalle ? '#c9be96' : '#c5b181'} opacity={0.45} />
      <Greve />
      <NappeEau />

      {dalle && <Quai n={n} />}
      {(n === 1 || n >= 3) && <Ponton x={n === 1 ? 0 : -50} y={n === 1 ? 0 : 2} s={n === 1 ? 1 : 0.55} />}

      {/* flotte : les coques flottent SOUS le parement, les mâts passent devant */}
      {n === 1 && <Barque x={-52} y={16} s={1} />}
      {n === 2 && (
        <>
          <Barque x={-62} y={9} s={0.55} rames={false} seed={11} />
          <Voilier x={-20} y={20} s={1} />
        </>
      )}
      {n === 3 && (
        <>
          <Voilier x={-22} y={19} s={1.05} rouge />
          <Barque x={24} y={28} s={0.6} rames={false} seed={9} />
        </>
      )}
      {n >= 4 && (
        <>
          <Trireme x={-12} y={20} s={0.9} />
          <Barque x={26} y={28} s={0.55} seed={14} />
        </>
      )}

      {/* cargaison sur le terre-plein - (18,7) et (40,-2) restent libres */}
      <Cordage x={n >= 2 ? -18 : 10} y={n >= 2 ? -12 : -22} s={0.95} />
      <AmphoresCalees x={n >= 2 ? 30 : 20} y={n >= 2 ? 10 : -4} s={0.9} seed={3} nb={n >= 3 ? 4 : 3} />
      {n === 1 && (
        <>
          <BarqueRenversee x={-6} y={-20} s={0.92} />
          <Ancre x={-32} y={-20} s={0.58} />
          <Nasse x={-20} y={-14} s={0.95} />
          <Nasse x={-14} y={-11} s={0.8} />
          <Sechoir x={36} y={-12} s={0.9} />
          <Filet x={56} y={0} s={0.95} />
        </>
      )}
      {n >= 2 && (
        <>
          <Chevre x={8} y={2} s={1} />
          <Ballot x={-13} y={-6} s={0.95} />
          <Ballot x={-6} y={-10} s={0.82} c="#c0a97f" />
          <Ancre x={-38} y={-24} s={0.56} />
          <PileBois x={-58} y={-26} s={0.72} />
        </>
      )}
      {n === 2 && (
        <>
          <Sechoir x={40} y={-16} s={0.88} />
          <Filet x={48} y={-4} s={0.9} />
        </>
      )}
      {n >= 3 && (
        <>
          <Filet x={44} y={0} s={0.9} />
          <Cage x={30} y={16} s={0.9} oiseau />
        </>
      )}
      {n >= 4 && (
        <>
          <AmphoresCalees x={14} y={14} s={0.84} seed={8} nb={3} />
          <Cage x={38} y={21} s={0.88} />
          <Comptoir x={54} y={16} s={0.88} />
          <Comptoir x={72} y={26} s={0.7} c="#4a6f86" c2="#e8d9ae" />
        </>
      )}

      {/* entrepôt et phare */}
      {n >= 3 && <Entrepot x={22} y={-18} w={n >= 4 ? 34 : 30} h={n >= 4 ? 16 : 14} g={n >= 4 ? 9 : 8} />}
      {n >= 3 && <Phare x={62} y={-8} h={n >= 4 ? 32 : 25} pierre={n >= 4} />}

      {/* mouettes posées : sur une bitte du quai, sur la grève */}
      <Mouette x={n >= 2 ? -11.4 : -32} y={n >= 2 ? -7.4 : -16} s={0.8} />
      {n === 2 && <Mouette x={-36} y={-18} s={0.72} flip />}

      {/* pavillon du port franc, planté au bout du quai */}
      {n >= 4 && (
        <g transform="translate(-38,-13)">
          <ellipse cx={1.5} cy={0.6} rx={3.4} ry={1.3} fill={PAL.ombrePortee} opacity={0.2} />
          <line x1={0} y1={0} x2={0} y2={-32} stroke="#6a4e30" strokeWidth={2} />
          <line x1={-0.8} y1={0} x2={-0.8} y2={-32} stroke="#96754c" strokeWidth={0.75} />
          <path d="M-3.4,-24 L3.4,-24" stroke="#6a4e30" strokeWidth={1.2} />
          <path d="M0.9,-31.4 L13.4,-28.6 L0.9,-25 Z" fill="#4fa3a5" />
          <path d="M0.9,-31.4 L13.4,-28.6 L7.2,-29.9 L0.9,-27.4 Z" fill="#7bc6c6" />
        </g>
      )}
    </g>
  )
}
