import { MAP } from '../../game/data'
import type { SaisonId } from '../../game/saisons'
import { PAL, alea } from './art'

/** phase du jour ∈ [0,1) : 0–0.08 aube, 0.08–0.55 jour, 0.55–0.68 crépuscule, 0.68–1 nuit */
export function phaseJour(now: number, createdAt: number, dayMs: number): number {
  return ((now - createdAt) % dayMs) / dayMs
}

export function nomPhase(p: number): string {
  if (p < 0.08) return 'Aube'
  if (p < 0.55) return 'Jour'
  if (p < 0.68) return 'Crépuscule'
  return 'Nuit'
}

/** l'horizon : toutes les montagnes reposent exactement sur cette ligne */
const HORIZON = 212

/*
 * ── Arbres volumiques ──────────────────────────────────────────────────────
 * Lumière NW : masse sombre (ombre propre) → demi-teinte → éclat en haut-
 * gauche. Ombre portée au sol décalée vers le SE. Zéro contour noir.
 * Le feuillage suit la saison : vert tendre au printemps, poussiéreux en été,
 * roux à l'automne, branches nues sous la neige.
 */

/** cinq valeurs de feuillage (ombre → lumière) par saison, pour l'olivier */
const FEUILLAGE: Record<SaisonId, [string, string, string, string, string]> = {
  printemps: ['#54663f', '#455636', '#6d8250', '#87995f', '#a5b27e'],
  ete: ['#5b6640', '#4a5436', '#757c4b', '#8f9159', '#a9a878'],
  automne: ['#7a5c2a', '#634922', '#9c7433', '#ba9340', '#d3ad5c'],
  hiver: ['#4e5744', '#40483a', '#5f6a52', '#75805f', '#8d9673'],
}
/** quatre valeurs pour la flamme du cyprès (masse → rehaut) */
const CYPRES: Record<SaisonId, [string, string, string, string]> = {
  printemps: ['#2c4632', '#47653f', '#688551', '#84a166'],
  ete: ['#2f4633', '#4a6340', '#6b8050', '#879c63'],
  automne: ['#2b3f2d', '#42583a', '#617248', '#7d8b58'],
  hiver: ['#25382a', '#3a4e36', '#546245', '#6f7a58'],
}

function Arbre({
  x,
  y,
  t,
  s = 1,
  saison = 'printemps',
}: {
  x: number
  y: number
  t: 'olivier' | 'cypres'
  s?: number
  saison?: SaisonId
}) {
  const hiver = saison === 'hiver'
  if (t === 'cypres') {
    const [c0, c1, c2, c3] = CYPRES[saison]
    return (
      <g transform={`translate(${x},${y}) scale(${s})`}>
        {/* ombre portée SE, allongée (arbre haut) */}
        <ellipse cx={8} cy={0.8} rx={11} ry={2.4} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou1)" />
        {/* pied du tronc */}
        <path d="M-1.4,-3.5 L1.4,-3.5 L1,1 L-1,1 Z" fill="#6a4e31" />
        <path d="M0.2,-3.5 L1.4,-3.5 L1,1 L0.4,1 Z" fill="#49351f" />
        {/* flamme : ombre propre → demi-teinte → lumière NW → rehaut */}
        <path d="M0,-39 C6.2,-25 7.2,-12 0,-4 C-7.2,-12 -6.2,-25 0,-39Z" fill={c0} />
        <path d="M0,-38.4 C-6,-24.5 -5.6,-12.5 -0.4,-5 C-3.2,-12.5 -2.8,-24.5 0,-38.4Z" fill={c1} />
        <path d="M-0.8,-36 C-4.8,-25 -4.6,-14.5 -1.6,-8 C-3,-15 -2.8,-25.5 -0.8,-36Z" fill={c2} />
        <path d="M-1.7,-32.5 C-3.7,-25 -3.6,-17 -2.1,-11.5 C-2.9,-17.5 -2.8,-25 -1.7,-32.5Z" fill={c3} opacity={0.9} />
        {/* creux d'ombre côté SE + pointes de texture */}
        <path d="M1.5,-32 C3.8,-24 4.1,-15 1.7,-8.5 C2.8,-15.5 2.7,-23.5 1.5,-32Z" fill="#213827" opacity={0.85} />
        <path d="M-2.9,-20 l-1.3,2.4 M2.9,-24 l1.4,2.2 M-3.3,-13.5 l-1.4,2 M3.1,-16 l1.5,2" stroke="#3a5238" strokeWidth={0.7} fill="none" opacity={0.65} />
        {/* givre accroché aux branches côté lumière */}
        {hiver && (
          <path
            d="M-3,-30 l-1.4,1.6 M-3.6,-22 l-1.6,1.4 M2.8,-27 l1.5,1.5 M3,-18 l1.6,1.3"
            stroke="#eef4f6"
            strokeWidth={1}
            fill="none"
            opacity={0.7}
            strokeLinecap="round"
          />
        )}
      </g>
    )
  }
  const [f0, f1, f2, f3, f4] = FEUILLAGE[saison]
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {/* ombre portée SE */}
      <ellipse cx={8} cy={1.6} rx={12.5} ry={2.9} fill={PAL.ombrePortee} opacity={hiver ? 0.1 : 0.16} filter="url(#a-flou1)" />
      {/* tronc noueux : flanc NW éclairé, flanc SE sombre */}
      <path d="M-2.4,0.6 C-3.6,-4.5 -4.4,-9 -2.6,-13.5 L0.6,-13 C-0.8,-8.5 -0.2,-4 1.6,0.6 Z" fill="#7c5e39" />
      <path d="M0.6,-13 C-0.6,-8.5 0,-4 1.6,0.6 L-0.2,0.6 C-1.2,-4 -1.7,-8.5 -0.9,-12.8 Z" fill="#523c25" />
      <path d="M-2.8,-2 C-3.4,-6.5 -3.6,-10 -2.4,-13" stroke="#a5834f" strokeWidth={0.9} fill="none" opacity={0.9} />
      {hiver ? (
        <g>
          {/* charpente nue : maîtresses branches, ramilles, un peu de neige dessus */}
          <path
            d="M-1.4,-13 C-4.5,-16 -7.5,-18 -9.5,-21.5 M-0.6,-13 C-0.4,-18 -0.9,-22 -1.6,-25.5 M0.4,-13 C3.2,-16.5 6,-18.5 8.4,-20.5"
            stroke="#6b5236"
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M-6.5,-19 l-2.6,-1.4 M-8.6,-21 l-1.2,-2.4 M-1.2,-21 l-2.4,-2 M-1.4,-23.5 l2,-2.2 M5.4,-18.4 l1.2,-2.6 M7.6,-20 l2.4,-1.2"
            stroke="#7f6543"
            strokeWidth={0.9}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M-9.4,-21.9 l1.6,-0.5 M-1.7,-25.9 l1.5,-0.4 M8.3,-20.9 l1.6,-0.4"
            stroke="#f2f7fa"
            strokeWidth={1.3}
            fill="none"
            opacity={0.8}
            strokeLinecap="round"
          />
        </g>
      ) : (
        <g>
          {/* couronne : ombre propre → demi-teintes → éclats NW */}
          <ellipse cx={1.6} cy={-15} rx={12.8} ry={7.6} fill={f0} />
          <ellipse cx={6} cy={-12.6} rx={6.8} ry={4.3} fill={f1} />
          <ellipse cx={-1.8} cy={-16.8} rx={10.8} ry={6.4} fill={f2} />
          <ellipse cx={-4.6} cy={-19.4} rx={7.4} ry={4.5} fill={f3} />
          <ellipse cx={-7} cy={-21.3} rx={4} ry={2.4} fill={f4} />
          <ellipse cx={0.6} cy={-20.9} rx={3.3} ry={2} fill={f3} opacity={0.9} />
          {/* frémissement argenté du feuillage */}
          <path d="M-9.5,-17.5 l2,-0.8 M-1,-22.6 l2.2,-0.5 M5,-18.5 l2,-0.7" stroke={f4} strokeWidth={0.8} fill="none" opacity={0.7} />
          {/* fleurs blanches du printemps ; feuilles lâchées au pied à l'automne */}
          {saison === 'printemps' && (
            <g fill="#f6f1e0" opacity={0.85}>
              <circle cx={-6.4} cy={-20.6} r={1.1} />
              <circle cx={-1.6} cy={-21.8} r={0.9} />
              <circle cx={3.4} cy={-19.2} r={1} />
              <circle cx={-9.2} cy={-16.4} r={0.8} />
            </g>
          )}
          {saison === 'automne' && (
            <g fill="#b8873c" opacity={0.75}>
              <ellipse cx={-8} cy={-3.5} rx={1.6} ry={0.8} />
              <ellipse cx={4.6} cy={-1.8} rx={1.5} ry={0.7} transform="rotate(24 4.6 -1.8)" />
              <ellipse cx={-2.4} cy={-0.6} rx={1.7} ry={0.8} transform="rotate(-16 -2.4 -0.6)" />
            </g>
          )}
        </g>
      )}
    </g>
  )
}

const ARBRES: { x: number; y: number; t: 'olivier' | 'cypres'; s: number }[] = [
  // bosquet du nord-est, autour du camp de bûcherons
  { x: 892, y: 252, t: 'cypres', s: 1.05 },
  { x: 928, y: 230, t: 'olivier', s: 0.95 },
  { x: 1015, y: 252, t: 'cypres', s: 1.1 },
  { x: 1052, y: 288, t: 'cypres', s: 0.85 },
  { x: 1094, y: 258, t: 'cypres', s: 1 },
  { x: 1012, y: 335, t: 'olivier', s: 1 },
  { x: 1122, y: 300, t: 'olivier', s: 0.9 },
  { x: 1078, y: 352, t: 'cypres', s: 0.9 },
  { x: 1160, y: 342, t: 'olivier', s: 0.8 },
  // sud
  { x: 340, y: 722, t: 'olivier', s: 1 },
  { x: 424, y: 756, t: 'olivier', s: 0.85 },
  { x: 562, y: 732, t: 'cypres', s: 0.9 },
  { x: 662, y: 762, t: 'olivier', s: 1.1 },
  { x: 942, y: 692, t: 'cypres', s: 1 },
  { x: 1052, y: 642, t: 'olivier', s: 1 },
  { x: 1148, y: 712, t: 'cypres', s: 0.85 },
  // ouest
  { x: 62, y: 424, t: 'olivier', s: 0.9 },
  { x: 96, y: 522, t: 'cypres', s: 0.85 },
  { x: 152, y: 372, t: 'olivier', s: 0.75 },
]

const TOUFFES: [number, number][] = [
  [320, 300], [520, 268], [760, 292], [180, 470], [260, 560], [430, 692],
  [700, 700], [860, 640], [1080, 480], [1130, 560], [980, 420], [90, 620],
  [620, 258], [1010, 590],
]

const FLEURS: [number, number, string][] = [
  [370, 280, '#e8e2d2'], [610, 275, '#c0563f'], [820, 640, '#e8e2d2'],
  [230, 520, '#d9a0b0'], [1060, 520, '#e8e2d2'], [500, 715, '#c0563f'],
  [1120, 620, '#d9a0b0'], [140, 560, '#e8e2d2'],
]

/* ── éléments dispersés, générés UNE fois au chargement (déterministe) ────── */

/** vrai si le point tombe dans la mer ou dans l'enceinte du village */
function horsPrairie(x: number, y: number): boolean {
  const surMer = x < 315 && y > 545
  const dansMur = ((x - 575) / 348) ** 2 + ((y - 445) / 210) ** 2 < 1
  return surMer || dansMur
}

const TOUFFES_TOUT: [number, number][] = [...TOUFFES]
{
  const rnd = alea(23)
  for (let i = 0; i < 26; i++) {
    const x = 70 + rnd() * 1080
    const y = 240 + rnd() * 520
    if (!horsPrairie(x, y)) TOUFFES_TOUT.push([x, y])
  }
}
/* trois valeurs par touffe : brins d'ombre, demi-teinte, brin éclairé NW */
const D_TOUFFE_OMBRE = TOUFFES_TOUT.map(([x, y]) => `M${x + 1.4},${y} l2.6,-5 M${x + 0.4},${y} l0.6,-6.4`).join(' ')
const D_TOUFFE_DEMI = TOUFFES_TOUT.map(([x, y]) => `M${x},${y} l-1.6,-6 M${x - 0.8},${y} l-3.4,-4.6`).join(' ')
const D_TOUFFE_CLAIR = TOUFFES_TOUT.map(([x, y]) => `M${x - 0.3},${y - 0.5} l-2.2,-5.8`).join(' ')

const CAILLOUX: { x: number; y: number; r: number; t: number }[] = []
{
  const rnd = alea(31)
  for (let i = 0; i < 60 && CAILLOUX.length < 15; i++) {
    const x = 60 + rnd() * 1080
    const y = 240 + rnd() * 530
    const r = 1.5 + rnd() * 2
    if (!horsPrairie(x, y)) CAILLOUX.push({ x, y, r, t: rnd() })
  }
}

/** buissons bas du maquis — brisent la monotonie de la plaine */
const BUISSONS: { x: number; y: number; s: number }[] = []
{
  const rnd = alea(57)
  for (let i = 0; i < 44 && BUISSONS.length < 12; i++) {
    const x = 80 + rnd() * 1060
    const y = 255 + rnd() * 495
    if (!horsPrairie(x, y)) BUISSONS.push({ x, y, s: 0.7 + rnd() * 0.6 })
  }
}

const FLEURS_GROUPES = FLEURS.map(([x, y, c], i) => {
  const rnd = alea(i * 13 + 5)
  const pts = Array.from({ length: 4 }, () => ({
    dx: (rnd() - 0.5) * 12,
    dy: (rnd() - 0.5) * 7,
    r: 1 + rnd() * 0.8,
  }))
  return { x, y, c, pts }
})

/* ── montagnes : squelette sommets/cols conservé, crêtes irrégulières ─────── */
// sommets aux positions historiques : 80,170 · 320,144 · Ida 540,104 · 780,152 · 1010,164
const CRETES: [number, number][] = [
  [0, HORIZON], [80, 170], [190, 201], [320, 144], [420, 193], [540, 104],
  [660, 191], [780, 152], [900, 197], [1010, 164], [1120, 201], [1200, 180],
]
const CRETES_LOIN: [number, number][] = [
  [0, HORIZON], [110, 152], [205, 184], [330, 130], [455, 178], [575, 140],
  [690, 182], [810, 144], [930, 182], [1050, 150], [1200, 188],
]

/** polyligne de crête accidentée — les sommets restent exacts */
function traceCrete(pts: [number, number][], seed: number, jit: number): string {
  const rnd = alea(seed)
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const n = 7
    for (let k = 1; k <= n; k++) {
      const t = k / n
      const x = x0 + (x1 - x0) * t
      let y = y0 + (y1 - y0) * t
      if (k < n) y += (rnd() - 0.5) * 2 * jit * Math.sin(Math.PI * t) - rnd() * jit * 0.3
      d += ` L${x.toFixed(1)},${y.toFixed(1)}`
    }
  }
  return d
}
const D_CHAINE = `${traceCrete(CRETES, 11, 8)} L1200,${HORIZON} L0,${HORIZON} Z`
const D_LOIN = `${traceCrete(CRETES_LOIN, 5, 5)} L1200,${HORIZON} L0,${HORIZON} Z`

type Mont = { g: [number, number]; p: [number, number]; d: [number, number] }
function montsDe(cretes: [number, number][], pics: number[]): Mont[] {
  return pics.map((i) => ({ g: cretes[i - 1], p: cretes[i], d: cretes[i + 1] }))
}
const MONTS = montsDe(CRETES, [1, 3, 5, 7, 9])
const MONTS_LOIN = montsDe(CRETES_LOIN, [1, 3, 5, 7, 9])

/** arêtes NW frappées par le soleil — un seul path multi-segments */
const D_ARETES_LIT = `${MONTS.map(({ g, p }) => `M${g[0]},${g[1]} L${p[0]},${p[1]}`).join(' ')} M1120,201 L1200,180`

/** éperons rocheux : couloirs d'ombre côté SE, arêtes claires côté NW */
const SPURS: { d: string; lit: boolean; w: number }[] = []
{
  const rnd = alea(43)
  for (const { g, p, d } of MONTS) {
    const n = 3 + Math.floor(rnd() * 2)
    for (let k = 0; k < n; k++) {
      const t = 0.2 + rnd() * 0.65
      const bx = p[0] + (d[0] - p[0]) * t + (rnd() - 0.5) * 12
      const by = p[1] + (HORIZON - p[1]) * (0.4 + rnd() * 0.5)
      SPURS.push({
        d: `M${p[0]},${p[1]} Q${((p[0] + bx) / 2 + 6).toFixed(0)},${((p[1] + by) / 2).toFixed(0)} ${bx.toFixed(0)},${by.toFixed(0)}`,
        lit: false,
        w: 1.6 + rnd() * 1.6,
      })
    }
    for (let k = 0; k < 2; k++) {
      const t2 = 0.25 + rnd() * 0.5
      const lx = g[0] + (p[0] - g[0]) * t2 + (rnd() - 0.5) * 8
      const ly = p[1] + (HORIZON - p[1]) * (0.4 + rnd() * 0.4)
      SPURS.push({
        d: `M${p[0]},${p[1]} Q${((p[0] + lx) / 2 - 5).toFixed(0)},${((p[1] + ly) / 2).toFixed(0)} ${lx.toFixed(0)},${ly.toFixed(0)}`,
        lit: true,
        w: 1.3 + rnd() * 1.2,
      })
    }
  }
}

/** petites barres rocheuses en travers des versants (texture de strate) */
const STRATES: string = (() => {
  const rnd = alea(67)
  const out: string[] = []
  for (const { g, p, d } of MONTS) {
    for (let k = 0; k < 5; k++) {
      const versantOmbre = rnd() > 0.35
      const [a, b] = versantOmbre ? [p, d] : [g, p]
      const t = 0.25 + rnd() * 0.55
      const x = a[0] + (b[0] - a[0]) * t
      const y = a[1] + (b[1] - a[1]) * t + (HORIZON - Math.max(a[1], b[1])) * rnd() * 0.35
      const l = 5 + rnd() * 9
      out.push(`M${(x - l / 2).toFixed(0)},${y.toFixed(0)} q${(l / 2).toFixed(0)},${(rnd() * 3 - 1).toFixed(1)} ${l.toFixed(0)},0`)
    }
  }
  return out.join(' ')
})()

/* ── habits de saison : ce que la plaine porte au sol quatre fois par an ──── */

/** taches déterministes réparties sur la plaine, hors mer et hors enceinte */
function taches(seed: number, n: number, rMin: number, rMax: number) {
  const rnd = alea(seed)
  const out: { x: number; y: number; rx: number; ry: number; r: number }[] = []
  for (let i = 0; i < n * 4 && out.length < n; i++) {
    const x = 60 + rnd() * 1090
    const y = 235 + rnd() * 540
    if (horsPrairie(x, y)) continue
    const rx = rMin + rnd() * (rMax - rMin)
    out.push({ x, y, rx, ry: rx * (0.3 + rnd() * 0.2), r: (rnd() - 0.5) * 24 })
  }
  return out
}

const CONGERES = taches(71, 22, 18, 62)
const FEUILLES_MORTES = taches(83, 18, 14, 46)
const BRULIS = taches(97, 16, 20, 58)
const VERDURE = taches(103, 16, 16, 52)

function HabitsSaison({ saison }: { saison: SaisonId }) {
  if (saison === 'hiver') {
    return (
      <g pointerEvents="none">
        {/* congères : neige tassée, ourlée d'une ombre bleutée au sud-est pour
            qu'elle se lise comme un relief et non comme une tache pâle */}
        {CONGERES.map((t, i) => (
          <g key={i}>
            <ellipse
              cx={t.x + t.rx * 0.1}
              cy={t.y + t.ry * 0.5}
              rx={t.rx * 1.02}
              ry={t.ry * 0.9}
              transform={`rotate(${t.r} ${t.x} ${t.y})`}
              fill="#9db6cf"
              opacity={0.3}
            />
            <ellipse
              cx={t.x}
              cy={t.y}
              rx={t.rx}
              ry={t.ry}
              transform={`rotate(${t.r} ${t.x} ${t.y})`}
              fill="#f4f9fc"
              opacity={0.92 - (t.y - 235) / 3200}
            />
            <ellipse
              cx={t.x - t.rx * 0.18}
              cy={t.y - t.ry * 0.34}
              rx={t.rx * 0.6}
              ry={t.ry * 0.55}
              transform={`rotate(${t.r} ${t.x} ${t.y})`}
              fill="#ffffff"
              opacity={0.75}
            />
          </g>
        ))}
        {/* la neige a pris jusque sur les croupes et le bas des versants */}
        <path
          d={`M0,${HORIZON} Q80,190 160,206 Q260,186 360,208 Q470,192 580,210 Q700,194 820,208 Q930,190 1040,206 Q1120,196 1200,208`}
          stroke="#eaf2f6"
          strokeWidth={5}
          fill="none"
          opacity={0.75}
        />
        <rect x={0} y={150} width={MAP.w} height={64} fill="#e6eff4" opacity={0.28} />
      </g>
    )
  }
  if (saison === 'automne') {
    return (
      <g pointerEvents="none">
        {FEUILLES_MORTES.map((t, i) => (
          <ellipse
            key={i}
            cx={t.x}
            cy={t.y}
            rx={t.rx}
            ry={t.ry}
            transform={`rotate(${t.r} ${t.x} ${t.y})`}
            fill="#b07a34"
            opacity={0.3}
          />
        ))}
        {/* feuilles emportées par le vent, en travers de la plaine */}
        {[
          [260, 380, 17],
          [640, 470, 22],
          [980, 560, 19],
        ].map(([x, y, d], i) => (
          <g key={`v${i}`} opacity={0.7}>
            <animateMotion dur={`${d}s`} repeatCount="indefinite" path={`M${x},${y} q120,-40 260,20 q120,50 250,-30`} />
            <ellipse rx={2.4} ry={1.2} fill="#c08b3c" transform="rotate(20)" />
            <ellipse cx={7} cy={5} rx={2} ry={1} fill="#a5702c" transform="rotate(-35 7 5)" />
          </g>
        ))}
      </g>
    )
  }
  if (saison === 'ete') {
    return (
      <g pointerEvents="none">
        {BRULIS.map((t, i) => (
          <ellipse
            key={i}
            cx={t.x}
            cy={t.y}
            rx={t.rx}
            ry={t.ry}
            transform={`rotate(${t.r} ${t.x} ${t.y})`}
            fill="#dcc98a"
            opacity={0.34}
          />
        ))}
        {/* terre fendue par la sécheresse */}
        <path
          d="M300,520 l24,10 l-14,14 M690,610 l28,6 l-10,16 M1010,470 l22,12 l-16,12 M180,410 l20,10 l-12,13"
          stroke="#9c8a5c"
          strokeWidth={1.2}
          fill="none"
          opacity={0.45}
        />
      </g>
    )
  }
  return (
    <g pointerEvents="none">
      {VERDURE.map((t, i) => (
        <ellipse
          key={i}
          cx={t.x}
          cy={t.y}
          rx={t.rx}
          ry={t.ry}
          transform={`rotate(${t.r} ${t.x} ${t.y})`}
          fill="#6f9a3f"
          opacity={0.26}
        />
      ))}
    </g>
  )
}

/* ── mer : tracés partagés côte / masse d'eau ─────────────────────────────── */
const D_PLAGE = 'M0,584 C120,594 200,642 244,720 C264,760 272,800 272,800 L0,800 Z'
const D_MER = 'M0,596 C112,606 188,650 228,724 C247,762 254,800 254,800 L0,800 Z'
const D_RIVE = 'M0,598 C110,608 185,651 225,725 C243,762 251,800 251,800'

export function Terrain({
  phase,
  paisible = true,
  saison = 'printemps',
}: {
  phase: number
  paisible?: boolean
  saison?: SaisonId
}) {
  // position du soleil / de la lune sur un arc
  const jour = phase >= 0.02 && phase < 0.62
  const tAstre = jour ? (phase - 0.02) / 0.6 : ((phase + 1 - 0.62) % 1) / 0.4
  const ax = 110 + tAstre * 980
  const ay = 140 - Math.sin(tAstre * Math.PI) * 95

  const crepuscule = phase >= 0.55 && phase < 0.68
  const aube = phase < 0.08
  const nuit = phase >= 0.68 || phase < 0.02
  const teinteHaze = nuit ? '#93a4a8' : crepuscule ? '#f0d8b2' : aube ? '#eee0c0' : '#e9efe6'

  return (
    <g>
      <defs>
        <linearGradient id="ter-ciel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={nuit ? '#26374d' : crepuscule ? '#a96336' : aube ? '#a8886d' : '#79b0d2'} />
          <stop offset="45%" stopColor={nuit ? '#3a4f63' : crepuscule ? '#d1935c' : aube ? '#cfb18c' : '#a5cdd9'} />
          <stop offset="80%" stopColor={nuit ? '#56696d' : crepuscule ? '#eec489' : aube ? '#e7d5ae' : '#cfe6e2'} />
          <stop offset="100%" stopColor={nuit ? '#6d7a72' : crepuscule ? '#f4dda6' : aube ? '#f0e4c4' : '#e6edda'} />
        </linearGradient>
        {/* voile de vapeur au ras de l'horizon, derrière les chaînes */}
        <linearGradient id="ter-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={teinteHaze} stopOpacity="0" />
          <stop offset="100%" stopColor={teinteHaze} stopOpacity="0.55" />
        </linearGradient>
        {/* chaîne lointaine : froide et pâle (perspective atmosphérique) */}
        <linearGradient id="ter-loin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9aaeb8" />
          <stop offset="100%" stopColor="#c0cdca" />
        </linearGradient>
        <linearGradient id="ter-mont" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#71876c" />
          <stop offset="55%" stopColor="#87977c" />
          <stop offset="100%" stopColor="#9aa78a" />
        </linearGradient>
        {/* brume au pied des montagnes */}
        <linearGradient id="ter-brume" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={teinteHaze} stopOpacity="0" />
          <stop offset="70%" stopColor={teinteHaze} stopOpacity="0.62" />
          <stop offset="100%" stopColor={teinteHaze} stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="ter-colline" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#697950" />
          <stop offset="55%" stopColor="#88905e" />
          <stop offset="100%" stopColor="#a7a26c" />
        </linearGradient>
        <linearGradient id="ter-plaine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b5ae77" />
          <stop offset="40%" stopColor="#a2a067" />
          <stop offset="100%" stopColor="#8b8955" />
        </linearGradient>
        {/* assombrissement doux du premier plan (profondeur) */}
        <linearGradient id="ter-prof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c7550" stopOpacity="0" />
          <stop offset="100%" stopColor="#6a6442" stopOpacity="0.18" />
        </linearGradient>
        {/* sable : haut de plage sec et clair → bas plus soutenu */}
        <linearGradient id="ter-sable" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#e6d5a4" />
          <stop offset="100%" stopColor="#cfb886" />
        </linearGradient>
        {/* nappes de prairie aux bords fondus (dégradés radiaux → transparent) */}
        <radialGradient id="ter-nap-olive">
          <stop offset="0%" stopColor="#7c9243" stopOpacity="0.66" />
          <stop offset="65%" stopColor="#7c9243" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#7c9243" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ter-nap-ocre">
          <stop offset="0%" stopColor="#cba25a" stopOpacity="0.55" />
          <stop offset="65%" stopColor="#cba25a" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#cba25a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ter-nap-paille">
          <stop offset="0%" stopColor="#ecdf97" stopOpacity="0.7" />
          <stop offset="65%" stopColor="#ecdf97" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ecdf97" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ter-nap-vert">
          <stop offset="0%" stopColor="#5f7038" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#5f7038" stopOpacity="0" />
        </radialGradient>
        {/* large flaque de soleil rasant sur la plaine */}
        <radialGradient id="ter-nap-soleil">
          <stop offset="0%" stopColor="#ece0a8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ece0a8" stopOpacity="0" />
        </radialGradient>
        {/* mer : turquoise contre la côte (NE) → profonde au large (SW) */}
        <linearGradient id="ter-mer" x1="0.88" y1="0.12" x2="0.06" y2="0.96">
          <stop offset="0%" stopColor="#6fbdbd" />
          <stop offset="22%" stopColor="#4597ab" />
          <stop offset="55%" stopColor="#276a85" />
          <stop offset="100%" stopColor="#153c52" />
        </linearGradient>
        <radialGradient id="ter-halo">
          <stop offset="0%" stopColor={jour ? '#f8e3a0' : '#e8e4d4'} stopOpacity={0.6} />
          <stop offset="100%" stopColor="#f8e3a0" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="ter-vignette" cx="50%" cy="44%" r="72%">
          <stop offset="0%" stopColor="#000" stopOpacity={0} />
          <stop offset="74%" stopColor="#000" stopOpacity={0} />
          <stop offset="100%" stopColor="#081020" stopOpacity={0.34} />
        </radialGradient>
        <filter id="ter-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0" />
        </filter>
        {/* clips : le modelé flouté reste DANS les silhouettes */}
        <clipPath id="ter-clip-chaine">
          <path d={D_CHAINE} />
        </clipPath>
        <clipPath id="ter-clip-loin">
          <path d={D_LOIN} />
        </clipPath>
        <clipPath id="ter-clip-mer">
          <path d={D_MER} />
        </clipPath>
      </defs>

      {/* ── ciel, halo et astre ── */}
      <rect x={0} y={0} width={MAP.w} height={HORIZON} fill="url(#ter-ciel)" />
      {/* étoiles, seulement en pleine nuit */}
      {nuit && (
        <g fill="#eef2e8">
          {[
            [96, 38, 1.1, 0.8], [214, 92, 0.8, 0.55], [342, 30, 0.9, 0.7], [438, 118, 0.7, 0.5],
            [606, 54, 1.1, 0.85], [724, 24, 0.8, 0.6], [836, 96, 0.9, 0.65], [948, 44, 0.7, 0.5],
            [1054, 112, 1, 0.7], [1148, 60, 0.8, 0.55], [520, 88, 0.6, 0.45], [162, 140, 0.6, 0.4],
          ].map(([sx, sy, sr, so], i) => (
            <circle key={i} cx={sx} cy={sy} r={sr} opacity={so}>
              {i % 3 === 0 && <animate attributeName="opacity" values={`${so};${so * 0.4};${so}`} dur={`${2.5 + i * 0.4}s`} repeatCount="indefinite" />}
            </circle>
          ))}
        </g>
      )}
      <circle cx={ax} cy={ay} r={64} fill="url(#ter-halo)" />
      {jour && <circle cx={ax} cy={ay} r={30} fill="#f8e3a0" opacity={0.35} />}
      <circle cx={ax} cy={ay} r={jour ? 21 : 15} fill={jour ? '#f6d67c' : '#eae6d6'} />
      {jour && <circle cx={ax - 3} cy={ay - 3} r={13} fill="#fbeaae" opacity={0.7} />}
      {!jour && <circle cx={ax - 6} cy={ay - 3} r={12.5} fill={crepuscule ? '#cd7f4e' : '#20303f'} opacity={0.55} />}
      {/* cirrus étirés, très discrets */}
      <g filter="url(#a-flou4)" opacity={jour ? 0.55 : 0.3}>
        <ellipse cx={250} cy={64} rx={95} ry={8} fill={crepuscule || aube ? '#f6d9b0' : '#f4f7ef'} opacity={0.55} />
        <ellipse cx={330} cy={52} rx={60} ry={6} fill={crepuscule || aube ? '#f6d9b0' : '#f4f7ef'} opacity={0.4} />
        <ellipse cx={860} cy={46} rx={115} ry={9} fill={crepuscule || aube ? '#f6d9b0' : '#f4f7ef'} opacity={0.45} />
        <ellipse cx={955} cy={58} rx={70} ry={6} fill={crepuscule || aube ? '#f6d9b0' : '#f4f7ef'} opacity={0.35} />
        <ellipse cx={560} cy={84} rx={70} ry={5.5} fill={crepuscule || aube ? '#f6d9b0' : '#f4f7ef'} opacity={0.3} />
      </g>
      {/* vapeur au ras de l'horizon */}
      <rect x={0} y={132} width={MAP.w} height={HORIZON - 132} fill="url(#ter-haze)" />

      {/* ── troisième plan : sliver de crêtes noyées dans la vapeur ── */}
      <path
        d={`M0,${HORIZON} L60,178 L150,190 L260,168 L360,186 L500,172 L640,188 L760,170 L880,186 L1000,172 L1100,188 L1200,178 L1200,${HORIZON} Z`}
        fill="#c7d2d4"
        opacity={0.75}
      />

      {/* ── chaîne lointaine, voilée par la distance ── */}
      <path d={D_LOIN} fill="url(#ter-loin)" />
      <g clipPath="url(#ter-clip-loin)">
        <g filter="url(#a-flou2)">
          {MONTS_LOIN.map(({ g, p, d }, i) => (
            <g key={i}>
              <path d={`M${g[0]},${g[1]} L${p[0]},${p[1]} L${p[0] + 10},${HORIZON} L${g[0] - 6},${HORIZON} Z`} fill="#c8d4cf" opacity={0.55} />
              <path d={`M${p[0]},${p[1]} L${d[0]},${d[1]} L${d[0]},${HORIZON} L${p[0] + 6},${HORIZON} Z`} fill="#7f939c" opacity={0.5} />
            </g>
          ))}
        </g>
        <rect x={0} y={146} width={MAP.w} height={HORIZON - 146} fill="url(#ter-haze)" />
      </g>

      {/* ── chaîne principale — le mont Ida au centre ── */}
      <path d={D_CHAINE} fill="url(#ter-mont)" />
      <g clipPath="url(#ter-clip-chaine)">
        <g filter="url(#a-flou2)">
          {/* versants NW éclairés / SE dans l'ombre — chaque mont a sa teinte */}
          {MONTS.map(({ g, p, d }, i) => {
            const lits = ['#a4b483', '#9db088', '#b2c294', '#9fb287', '#a7b78a']
            const ombres = ['#3f5348', '#43564a', '#37493f', '#41544a', '#455749']
            return (
              <g key={i}>
                <path d={`M${g[0]},${g[1]} L${p[0]},${p[1]} Q${p[0] + 26},${(p[1] + HORIZON) / 2} ${p[0] + 10},${HORIZON + 6} L${g[0] - 8},${HORIZON + 6} Z`} fill={lits[i]} opacity={0.75} />
                {/* bande de lumière rasante juste sous la crête NW */}
                <path d={`M${g[0]},${g[1]} L${p[0]},${p[1]}`} stroke="#c3d0a4" strokeWidth={7} fill="none" opacity={0.45} />
                {/* terminator incurvé : l'ombre suit un éperon, pas une verticale */}
                <path d={`M${p[0]},${p[1]} L${d[0]},${d[1]} L${d[0] + 2},${HORIZON + 6} L${p[0] + 34},${HORIZON + 6} Q${p[0] + 30},${(p[1] + HORIZON) / 2} ${p[0]},${p[1]} Z`} fill={ombres[i]} opacity={i === 2 ? 0.68 : 0.58} />
                {/* cœur d'ombre dense juste sous la crête SE */}
                <path d={`M${p[0]},${p[1]} L${d[0]},${d[1]}`} stroke="#2e4038" strokeWidth={6} fill="none" opacity={0.4} />
              </g>
            )
          })}
          {/* éperons éclairés et couloirs d'ombre */}
          {SPURS.map((s, i) => (
            <path key={i} d={s.d} stroke={s.lit ? '#bcca9f' : '#33463c'} strokeWidth={s.w} fill="none" opacity={s.lit ? 0.55 : 0.5} />
          ))}
          {/* roche nue sous le sommet de l'Ida */}
          <path d="M505,142 Q540,112 578,144 L566,168 Q540,158 516,166 Z" fill="#7b8069" opacity={0.55} />
          {/* éboulis au creux des cols */}
          <path d="M168,203 q22,5 44,2 M398,196 q22,5 44,1 M638,194 q22,5 44,1 M878,199 q22,5 44,1" stroke="#5f7365" strokeWidth={3} fill="none" opacity={0.4} />
        </g>
        {/* barres rocheuses en travers des versants */}
        <path d={STRATES} stroke="#4a5445" strokeWidth={1.1} fill="none" opacity={0.5} filter="url(#a-flou1)" />
        {/* arêtes NW frappées par la lumière, à peine adoucies */}
        <path d={D_ARETES_LIT} stroke="#dbe4c0" strokeWidth={2} fill="none" opacity={0.65} filter="url(#a-flou1)" />
        {/* neiges de l'Ida : face NW brillante, face SE bleutée, rochers qui percent */}
        <g filter="url(#a-flou1)">
          <path d="M503,143 L540,104 L577,143 L563,134 L551,144 L540,131 L528,144 L517,134 Z" fill="#ecf1e9" />
          <path d="M540,104 L577,143 L563,134 L551,144 L540,131 Z" fill="#b9cac9" />
          <path d="M540,104 L547,113 L540,119 L533,112 Z" fill="#f7faf4" />
          <path d="M536,115 L529,136 M546,116 L553,135 M540,121 L539,140" stroke="#a4b6b4" strokeWidth={0.9} fill="none" opacity={0.8} />
          <path d="M523,133 l4,-2 M557,131 l-5,-2 M540,142 l3,-1.4" stroke="#6e8272" strokeWidth={1.1} fill="none" opacity={0.7} />
          {/* langues de neige qui s'effilochent dans les couloirs */}
          <path d="M528,142 q-3,8 -7,13 M552,143 q3,8 6,12" stroke="#dde7dd" strokeWidth={1.6} fill="none" opacity={0.65} />
          {/* petit névé du deuxième sommet */}
          <path d="M296,155 L320,144 L344,155 L334,151 L324,157 L312,150 Z" fill="#e2e8de" opacity={0.9} />
          <path d="M320,144 L344,155 L334,151 L324,157 Z" fill="#c2cfca" opacity={0.8} />
        </g>
        {/* voile atmosphérique accroché à la base des versants */}
        <rect x={0} y={192} width={MAP.w} height={HORIZON - 192} fill="url(#ter-haze)" opacity={0.45} />
      </g>

      {/* brume accrochée au pied des versants */}
      <rect x={0} y={192} width={MAP.w} height={HORIZON - 192 + 2} fill="url(#ter-brume)" opacity={0.65} />

      {/* ── collines proches : deux bandes fondues, crêtes éclairées ── */}
      <path
        d={`M0,208 Q90,193 190,205 Q300,189 420,206 Q560,191 690,206 Q820,193 950,206 Q1080,194 1200,206 L1200,${HORIZON} L0,${HORIZON} Z`}
        fill="#67775a"
        opacity={0.9}
      />
      <path
        d={`M0,${HORIZON} Q80,190 160,206 Q260,186 360,208 Q470,192 580,210 Q700,194 820,208 Q930,190 1040,206 Q1120,196 1200,208 L1200,${HORIZON} Z`}
        fill="url(#ter-colline)"
      />
      <path
        d={`M0,${HORIZON} Q80,190 160,206 Q260,186 360,208 Q470,192 580,210 Q700,194 820,208 Q930,190 1040,206 Q1120,196 1200,208`}
        stroke="#b8bd85"
        strokeWidth={1.6}
        fill="none"
        opacity={0.6}
      />
      {/* ombre douce au revers sud des croupes */}
      <g transform="translate(0,5)">
        <path
          d={`M0,${HORIZON} Q80,190 160,206 Q260,186 360,208 Q470,192 580,210 Q700,194 820,208 Q930,190 1040,206 Q1120,196 1200,208`}
          stroke="#6b7852"
          strokeWidth={4}
          fill="none"
          opacity={0.28}
          filter="url(#a-flou2)"
        />
      </g>
      {/* parcelles sèches et maquis sur les pentes */}
      {[
        [480, 205, 40, 4.5, 0.4], [770, 203, 34, 4, 0.35], [1075, 204, 30, 3.6, 0.35], [240, 204, 28, 3.6, 0.3],
      ].map(([px, py, prx, pry, po], i) => (
        <ellipse key={`p${i}`} cx={px} cy={py} rx={prx} ry={pry} fill="#bdb47c" opacity={po} />
      ))}
      {[
        [138, 203], [312, 202], [548, 205], [772, 202], [962, 200], [1108, 202],
      ].map(([bx, by], i) => (
        <g key={i}>
          <ellipse cx={bx} cy={by} rx={3.4} ry={1.8} fill="#68774f" opacity={0.55} />
          <ellipse cx={bx - 1.2} cy={by - 0.8} rx={1.8} ry={1} fill="#839360" opacity={0.6} />
        </g>
      ))}
      {/* files de cyprès minuscules sur les croupes */}
      {[[212, 200], [218, 200.5], [594, 203], [600, 203.5], [846, 201], [1022, 200]].map(([cx2, cy2], i) => (
        <path key={`c${i}`} d={`M${cx2},${cy2} l1.1,-5 l1.1,5 Z`} fill="#485c42" opacity={0.75} />
      ))}

      {/* ── plaine : socle en dégradé + nappes multi-tons aux bords doux ── */}
      <rect x={0} y={HORIZON - 6} width={MAP.w} height={MAP.h - HORIZON + 6} fill="url(#ter-plaine)" />
      <ellipse cx={520} cy={460} rx={340} ry={135} fill="url(#ter-nap-soleil)" opacity={0.55} />
      <rect x={0} y={430} width={MAP.w} height={MAP.h - 430} fill="url(#ter-prof)" />
      {(
        [
          [350, 385, 250, 100, -6, 'olive', 0.75],
          [430, 420, 150, 60, 8, 'olive', 0.5],
          [820, 560, 280, 120, 4, 'ocre', 0.65],
          [905, 600, 150, 66, -6, 'ocre', 0.45],
          [600, 298, 320, 80, 0, 'paille', 0.7],
          [700, 285, 150, 45, 4, 'paille', 0.5],
          [160, 300, 150, 60, -10, 'ocre', 0.55],
          [1060, 350, 200, 90, 7, 'olive', 0.6],
          [1130, 395, 110, 52, -5, 'olive', 0.45],
          [460, 630, 230, 95, -4, 'paille', 0.55],
          [380, 665, 120, 48, 6, 'paille', 0.4],
          [960, 710, 250, 90, 5, 'olive', 0.5],
          [120, 480, 130, 65, -8, 'olive', 0.5],
          [610, 745, 270, 75, 0, 'ocre', 0.45],
          [1140, 550, 160, 80, 6, 'paille', 0.5],
          [300, 545, 165, 65, -5, 'ocre', 0.4],
          [880, 295, 170, 55, 3, 'vert', 0.45],
          [180, 655, 140, 55, 0, 'vert', 0.35],
          [1090, 660, 140, 58, -6, 'vert', 0.35],
          // petites taches de structure
          [750, 645, 105, 42, 5, 'paille', 0.35],
          [240, 420, 85, 36, 4, 'paille', 0.3],
          [1000, 470, 90, 40, -6, 'ocre', 0.3],
          [420, 295, 70, 28, 0, 'vert', 0.28],
          [660, 560, 80, 32, -5, 'vert', 0.25],
          [540, 690, 90, 36, 6, 'ocre', 0.3],
        ] as [number, number, number, number, number, string, number][]
      ).map(([cx, cy, rx, ry, rot, g, o], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill={`url(#ter-nap-${g})`} opacity={o} />
      ))}
      {/* longues touches de vent couché dans les herbes (coups de brosse) */}
      {(
        [
          [300, 330, 190, 12, -3, 0.3],
          [700, 350, 230, 13, 2, 0.26],
          [1000, 420, 170, 11, -2, 0.3],
          [250, 610, 210, 13, -4, 0.26],
          [820, 660, 260, 15, 3, 0.3],
          [1080, 590, 150, 10, 2, 0.24],
          [520, 720, 190, 12, -2, 0.26],
        ] as [number, number, number, number, number, number][]
      ).map(([cx, cy, rx, ry, rot, o], i) => (
        <ellipse key={`v${i}`} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill="url(#ter-nap-paille)" opacity={o} />
      ))}

      {/* ── ce que la saison pose au sol : neige, feuilles mortes, brûlis ── */}
      <HabitsSaison saison={saison} />

      {/* ── placette et sentiers intérieurs (terre battue, discrets) ── */}
      <ellipse cx={585} cy={452} rx={88} ry={34} fill="#c2b380" opacity={0.2} />
      <ellipse cx={592} cy={450} rx={50} ry={19} fill="#cdbd8a" opacity={0.26} />
      <path d="M890,447 C 780,450 690,452 620,450" stroke="#c8af83" strokeWidth={9} fill="none" opacity={0.5} strokeLinecap="round" />
      <path d="M888,444.5 C 782,447 696,449 624,447.5" stroke="#d6c297" strokeWidth={1.8} fill="none" opacity={0.32} strokeDasharray="18 13 26 9" />
      <path d="M560,435 C 510,400 465,365 440,345" stroke="#c8af83" strokeWidth={6} fill="none" opacity={0.28} strokeLinecap="round" />
      <path d="M545,460 C 500,485 470,505 450,518" stroke="#c8af83" strokeWidth={6} fill="none" opacity={0.28} strokeLinecap="round" />
      <path d="M620,462 C 660,485 685,500 700,515" stroke="#c8af83" strokeWidth={6} fill="none" opacity={0.28} strokeLinecap="round" />
      <path d="M610,430 C 645,405 670,380 688,362" stroke="#c8af83" strokeWidth={5} fill="none" opacity={0.24} strokeLinecap="round" />

      {/* ── routes : zone d'usure large, bande, bords irréguliers, ornières ── */}
      {/* route de l'est (celle du char) */}
      <path d={`M${MAP.w},485 C 1080,470 1000,455 ${MAP.porte.x + 8},${MAP.porte.y + 6}`} stroke="#b5a276" strokeWidth={44} fill="none" strokeLinecap="round" opacity={0.16} filter="url(#a-flou2)" />
      <path d={`M${MAP.w},485 C 1080,470 1000,455 ${MAP.porte.x + 8},${MAP.porte.y + 6}`} stroke="#bfab7e" strokeWidth={30} fill="none" strokeLinecap="round" opacity={0.4} />
      <path d={`M${MAP.w},485 C 1080,470 1000,455 ${MAP.porte.x + 8},${MAP.porte.y + 6}`} stroke="#ccb489" strokeWidth={15} fill="none" strokeLinecap="round" />
      <path d="M1200,480 C 1084,465 1006,450.5 916,446.5" stroke="#dcc89c" strokeWidth={3} fill="none" opacity={0.6} strokeDasharray="18 13 26 10" />
      <path d="M1198,490.5 C 1078,475.5 1000,460.5 914,456.5" stroke="#ad9268" strokeWidth={3} fill="none" opacity={0.5} strokeDasharray="22 15 13 18" />
      <path d="M1199,483 C 1081,468 1002,453.4 915,449.4" stroke="#9c8258" strokeWidth={1.5} fill="none" opacity={0.42} strokeDasharray="26 14" />
      <path d="M1199,487.6 C 1080,472.6 1000,457.6 914,453.4" stroke="#9c8258" strokeWidth={1.5} fill="none" opacity={0.42} strokeDasharray="21 17" />
      {/* élargissement devant la porte */}
      <ellipse cx={MAP.porte.x - 2} cy={MAP.porte.y + 6} rx={34} ry={13} fill="#bfab7e" opacity={0.4} />
      <ellipse cx={MAP.porte.x - 1} cy={MAP.porte.y + 5} rx={24} ry={9} fill="#ccb489" opacity={0.8} />

      {/* route du sud, vers la grève */}
      <path d={`M${MAP.porte.x - 40},520 C 500,640 320,690 196,732`} stroke="#b5a276" strokeWidth={30} fill="none" strokeLinecap="round" opacity={0.14} filter="url(#a-flou2)" />
      <path d={`M${MAP.porte.x - 40},520 C 500,640 320,690 196,732`} stroke="#bfab7e" strokeWidth={19} fill="none" strokeLinecap="round" opacity={0.35} />
      <path d={`M${MAP.porte.x - 40},520 C 500,640 320,690 196,732`} stroke="#c6ad81" strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.9} />
      <path d="M867,516.5 C 503,636 322,686 199,728" stroke="#d6c295" strokeWidth={2.4} fill="none" opacity={0.5} strokeDasharray="20 14 12 18" />
      <path d="M862,524 C 497,644 318,694 194,736" stroke="#a78d62" strokeWidth={2.4} fill="none" opacity={0.45} strokeDasharray="16 12 24 10" />
      <path d="M866,518.4 C 501,638 321,688 197,730" stroke="#9c8258" strokeWidth={1.3} fill="none" opacity={0.35} strokeDasharray="24 15" />
      <path d="M863,521.8 C 498,642 319,692 195,734" stroke="#9c8258" strokeWidth={1.3} fill="none" opacity={0.35} strokeDasharray="19 18" />

      {/* sente de la carrière */}
      <path d="M340,330 C 260,300 210,282 172,264" stroke="#bfab7e" strokeWidth={14} fill="none" opacity={0.3} strokeLinecap="round" />
      <path d="M340,330 C 260,300 210,282 172,264" stroke="#c6ad81" strokeWidth={7} fill="none" opacity={0.65} strokeLinecap="round" />
      <path d="M338,326.5 C 262,297 214,279 176,261.5" stroke="#d6c295" strokeWidth={1.8} fill="none" opacity={0.45} strokeDasharray="12 10 18 8" />

      {/* ── mer Égée (angle sud-ouest) : grève, eau profonde, houle, écume ── */}
      <path d={D_PLAGE} fill="url(#ter-sable)" />
      {/* poche de sable qui remonte dans l'herbe (une seule, au nord de la baie) */}
      <ellipse cx={95} cy={597} rx={36} ry={10} transform="rotate(15 95 597)" fill="#d9c592" opacity={0.85} />
      {/* langues d'herbe posées SUR le bord sable/herbe (tangentes à la courbe) */}
      {(
        [
          [28, 584, 30, 8, 8, 0.9],
          [113, 605, 28, 8, 21, 0.85],
          [153, 621, 22, 7, 30, 0.8],
          [188, 645, 26, 8, 39, 0.85],
          [218, 673, 22, 7, 48, 0.8],
          [258, 726, 18, 6, 66, 0.7],
          [270, 757, 16, 5, 71, 0.65],
        ] as [number, number, number, number, number, number][]
      ).map(([cx, cy, rx, ry, rot, o], i) => (
        <ellipse key={`d${i}`} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill="#a4a469" opacity={o} />
      ))}
      <ellipse cx={70} cy={591} rx={16} ry={5} transform="rotate(13 70 591)" fill="#8f9458" opacity={0.6} />
      <ellipse cx={200} cy={655} rx={14} ry={5} transform="rotate(42 200 655)" fill="#8f9458" opacity={0.55} />
      {/* oyats sur la dune */}
      <path d="M52,606 l-1.6,-5 M55,607 l0.4,-5.6 M58,606 l2,-4.6 M148,646 l-1.8,-5 M151,647 l0.6,-5.4 M154,646 l2.2,-4.4 M216,724 l-1.8,-4.6 M219,725 l0.6,-5.2 M222,724 l2,-4.2" stroke="#8e8a54" strokeWidth={1.1} fill="none" opacity={0.8} strokeLinecap="round" />
      {/* galets du haut de plage */}
      <path d="M60,632 a1.8,1.1 0 1 0 0.1,0 M112,668 a1.5,1 0 1 0 0.1,0 M170,700 a1.7,1.1 0 1 0 0.1,0 M204,752 a1.4,0.9 0 1 0 0.1,0" fill="#b39c72" opacity={0.7} />
      {/* sable humide le long de l'eau : bande mouillée + reflet du ciel */}
      <path d="M0,594 C114,604 190,648 231,722 C249,760 257,800 257,800" stroke="#b2946a" strokeWidth={10} fill="none" opacity={0.55} filter="url(#a-flou2)" />
      <path d="M0,590.5 C115,600.5 194,645 236,719 C253,758 261,800 261,800" stroke="#f2e7ba" strokeWidth={2} fill="none" opacity={0.6} />
      {/* eau : turquoise du bord → bleu profond du large */}
      <path d={D_MER} fill="url(#ter-mer)" />
      <g clipPath="url(#ter-clip-mer)">
        {/* creux d'eau profonde au large */}
        <ellipse cx={0} cy={800} rx={170} ry={120} fill="#0d2a3d" opacity={0.5} filter="url(#a-flou4)" />
        {/* haut-fond : sable qui transparaît par plaques irrégulières */}
        <path d="M12,610 q26,4 48,14 M96,640 q22,10 38,26 M170,700 q14,14 24,32 M216,762 q8,16 12,34" stroke="#7ecac2" strokeWidth={9} fill="none" opacity={0.4} filter="url(#a-flou2)" strokeLinecap="round" />
        <path d="M40,616 q20,4 34,12 M150,672 q16,12 28,28" stroke="#9adcCE" strokeWidth={4} fill="none" opacity={0.35} filter="url(#a-flou2)" strokeLinecap="round" />
        {/* bandes de houle, dérive lente vers la côte */}
        <g>
          <animateTransform attributeName="transform" type="translate" values="0 0; 5 4; 0 0" dur="11s" repeatCount="indefinite" />
          <path d="M-10,630 C82,642 148,682 184,752" stroke="#57a3b2" strokeWidth={4} fill="none" opacity={0.24} filter="url(#a-flou2)">
            <animate attributeName="opacity" values="0.24;0.1;0.24" dur="7s" repeatCount="indefinite" />
          </path>
          <path d="M-10,676 C60,688 108,722 134,784" stroke="#3f89a0" strokeWidth={3.5} fill="none" opacity={0.22} filter="url(#a-flou2)">
            <animate attributeName="opacity" values="0.22;0.1;0.22" dur="9s" repeatCount="indefinite" />
          </path>
          <path d="M-10,724 C40,734 72,762 88,800" stroke="#2a6a83" strokeWidth={3.5} fill="none" opacity={0.22} filter="url(#a-flou2)">
            <animate attributeName="opacity" values="0.1;0.22;0.1" dur="8s" repeatCount="indefinite" />
          </path>
        </g>
        {/* moutonnement épars au large : petites crêtes brisées */}
        <g stroke="#cfe9e8" strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.35}>
          <path d="M24,684 q9,-3.5 18,0 M60,718 q8,-3 16,0 M30,752 q10,-3.5 20,0 M92,664 q8,-3 15,0 M120,712 q7,-2.6 13,0 M64,780 q9,-3 17,0">
            <animate attributeName="opacity" values="0.35;0.14;0.35" dur="4.5s" repeatCount="indefinite" />
          </path>
        </g>
      </g>
      {/* écume sur la ligne de côte : franges brisées, inégales */}
      <path d={D_RIVE} stroke="#f4faf4" strokeWidth={2.2} fill="none" strokeDasharray="16 9 30 14 8 6" opacity={0.75} filter="url(#a-flou1)">
        <animate attributeName="opacity" values="0.75;0.4;0.75" dur="5.5s" repeatCount="indefinite" />
      </path>
      <path d="M4,606 C56,612 104,626 148,656 M180,690 C202,716 218,748 228,782" stroke="#d8eee8" strokeWidth={1.6} fill="none" strokeDasharray="10 18 22 12" opacity={0.45} filter="url(#a-flou1)">
        <animate attributeName="opacity" values="0.3;0.55;0.3" dur="7.5s" repeatCount="indefinite" />
      </path>
      {/* rochers côtiers, face NW claire, écume au pied */}
      {(
        [
          [238, 706, 1],
          [98, 599, 0.8],
          [256, 766, 0.9],
        ] as [number, number, number][]
      ).map(([rx, ry, s], i) => (
        <g key={i} transform={`translate(${rx},${ry}) scale(${s})`}>
          <ellipse cx={1.5} cy={1} rx={7} ry={2.6} fill="#183a4a" opacity={0.3} />
          <path d="M-6,1 Q-5,-4.5 -1,-5.5 Q4,-6 6,-1.5 L6.5,1.2 Q0,3 -6,1 Z" fill="#6e6a5c" />
          <path d="M-6,1 Q-5,-4.5 -1,-5.5 Q1.6,-5.8 3,-4.4 Q-1,-4.6 -2.6,-1.8 Q-4.4,0.4 -6,1 Z" fill="#989180" />
          <path d="M-7.5,1.6 Q0,4 7.6,1.8" stroke="#eaf5ef" strokeWidth={1.4} fill="none" opacity={0.75} strokeDasharray="4 3" />
        </g>
      ))}
      {/* voile au large */}
      <g transform="translate(70,656)" opacity={0.92}>
        <ellipse cx={0} cy={0.8} rx={8.5} ry={1.3} fill="#12313f" opacity={0.4} />
        <path d="M-7,0 Q0,3 8,0 L5,-2 L-5,-2 Z" fill="#5d4a33" />
        <path d="M-5,-2 L5,-2 L4.4,-1.1 L-4.4,-1.1 Z" fill="#7d6547" />
        <path d="M0,-2 L0,-12 L7,-3 Z" fill="#efe9db" />
        <path d="M0,-2 L0,-12 L2.2,-9.4 L2.2,-2.6 Z" fill="#d8cfba" />
        <path d="M-14,1.4 q4,1.2 6,0.2" stroke="#cfe9e6" strokeWidth={1} fill="none" opacity={0.5} />
      </g>

      {/* mouettes au-dessus de la baie */}
      {[
        { p: 'M120,600 a80,30 0 1 0 0.1,0', dur: '21s', s: 1 },
        { p: 'M80,680 a55,22 0 1 0 0.1,0', dur: '15s', s: 0.8 },
      ].map((m, i) => (
        <g key={i} opacity={0.85}>
          <animateMotion dur={m.dur} repeatCount="indefinite" path={m.p} />
          <g transform={`scale(${m.s})`} stroke="#f0ede2" strokeWidth={1.5} fill="none" strokeLinecap="round">
            <path d="M-4,0 Q-2,-2.4 0,0 Q2,-2.4 4,0">
              <animate attributeName="d" values="M-4,0 Q-2,-2.4 0,0 Q2,-2.4 4,0;M-4,-1 Q-2,0.6 0,-1 Q2,0.6 4,-1;M-4,0 Q-2,-2.4 0,0 Q2,-2.4 4,0" dur="0.7s" repeatCount="indefinite" />
            </path>
          </g>
        </g>
      ))}

      {/* ── rochers près de la carrière : blocs facettés, éclairés au NW ── */}
      {(
        [
          [92, 252, 24, 12],
          [130, 230, 14, 8],
          [236, 224, 17, 9],
        ] as [number, number, number, number][]
      ).map(([rx, ry, w, h], i) => (
        <g key={i} transform={`translate(${rx},${ry})`}>
          <ellipse cx={w * 0.22} cy={h * 0.4} rx={w * 1.04} ry={h * 0.6} fill={PAL.ombrePortee} opacity={0.15} />
          <path d={`M${-w},${h * 0.2} Q${-w * 0.8},${-h} ${-w * 0.15},${-h} Q${w * 0.75},${-h * 0.95} ${w},${h * 0.05} Q${w * 0.3},${h * 0.75} ${-w},${h * 0.2} Z`} fill="#7d7869" />
          <path d={`M${-w},${h * 0.2} Q${-w * 0.8},${-h} ${-w * 0.15},${-h} Q${w * 0.3},${-h * 0.97} ${w * 0.5},${-h * 0.55} Q${-w * 0.2},${-h * 0.5} ${-w * 0.55},${h * 0.05} Z`} fill="#a19a87" />
          <path d={`M${w * 0.28},${-h * 0.6} Q${w * 0.5},${0} ${w * 0.3},${h * 0.5}`} stroke="#5f5a4c" strokeWidth={0.8} fill="none" opacity={0.55} />
        </g>
      ))}

      {/* ── buissons bas du maquis ── */}
      {BUISSONS.map(({ x, y, s }, i) => (
        <g key={i} transform={`translate(${x},${y}) scale(${s})`}>
          <ellipse cx={2.6} cy={0.8} rx={5.4} ry={1.5} fill={PAL.ombrePortee} opacity={0.13} />
          <ellipse cx={0} cy={-2.2} rx={4.6} ry={2.8} fill="#5d6d44" />
          <ellipse cx={-1.4} cy={-3.1} rx={3} ry={1.8} fill="#788a55" />
          <ellipse cx={-2.4} cy={-3.8} rx={1.6} ry={1} fill="#93a469" />
        </g>
      ))}

      {/* ── cailloux épars de la plaine ── */}
      {CAILLOUX.map(({ x, y, r, t }, i) => (
        <g key={i}>
          <ellipse cx={x + r * 0.5} cy={y + r * 0.3} rx={r * 1.15} ry={r * 0.5} fill={PAL.ombrePortee} opacity={0.13} />
          <ellipse cx={x} cy={y} rx={r} ry={r * 0.68} fill={t > 0.5 ? '#96907b' : '#8d8672'} />
          <ellipse cx={x - r * 0.3} cy={y - r * 0.25} rx={r * 0.55} ry={r * 0.34} fill="#b3ac95" opacity={0.85} />
        </g>
      ))}

      {/* ── touffes d'herbe à trois valeurs, fleurs par petits groupes ── */}
      <path d={D_TOUFFE_OMBRE} stroke="#6d7245" strokeWidth={1.5} fill="none" opacity={0.75} strokeLinecap="round" />
      <path d={D_TOUFFE_DEMI} stroke="#8f8a55" strokeWidth={1.5} fill="none" opacity={0.8} strokeLinecap="round" />
      <path d={D_TOUFFE_CLAIR} stroke="#b5b271" strokeWidth={1.3} fill="none" opacity={0.85} strokeLinecap="round" />
      {FLEURS_GROUPES.map(({ x, y, c, pts }, i) => (
        <g key={i}>
          {pts.map((p, j) => (
            <circle key={j} cx={x + p.dx} cy={y + p.dy} r={p.r} fill={c} opacity={j === 0 ? 1 : 0.8} />
          ))}
          <circle cx={x + 2} cy={y + 4} r={0.9} fill="#7f8a52" opacity={0.8} />
        </g>
      ))}

      {ARBRES.map((a, i) => (
        <Arbre key={i} x={a.x} y={a.y} t={a.t} s={a.s * 1.12} saison={saison} />
      ))}

      {/* moutons au pré, au sud des champs */}
      <g>
        {[
          [452, 700, 1],
          [472, 712, 0.85],
          [492, 702, 0.9],
        ].map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x},${y}) scale(${s})`}>
            <ellipse cx={2} cy={1} rx={5.6} ry={1.5} fill={PAL.ombrePortee} opacity={0.15} />
            <line x1={-3} y1={-1} x2={-3} y2={0.9} stroke="#5a4936" strokeWidth={0.9} />
            <line x1={2.6} y1={-1} x2={2.6} y2={0.9} stroke="#5a4936" strokeWidth={0.9} />
            <ellipse cx={0} cy={-3.6} rx={5} ry={3.1} fill="#e7e1d0" />
            <ellipse cx={0.9} cy={-2.4} rx={4.2} ry={1.8} fill="#c9c1aa" opacity={0.8} />
            <ellipse cx={-1.3} cy={-4.7} rx={3.4} ry={1.7} fill="#f4efe2" />
            <circle cx={5} cy={-4.6} r={1.9} fill="#8c8270" />
            <circle cx={4.5} cy={-5.2} r={0.9} fill="#a89e8a" />
            <path d="M6.3,-5.6 l1.2,-0.7" stroke="#8c8270" strokeWidth={0.8} />
          </g>
        ))}
      </g>

      {/* char à bœufs sur la route de l'est (à l'abri pendant les assauts) */}
      <g opacity={paisible ? 0.95 : 0}>
        <animateMotion dur="30s" repeatCount="indefinite" rotate="auto" path={`M${MAP.porte.x + 14},${MAP.porte.y + 8} C 1000,455 1080,470 ${MAP.w - 6},484`} />
        <ellipse cx={0} cy={2} rx={13} ry={2.4} fill="#241a0c" opacity={0.14} />
        {/* bœuf */}
        <ellipse cx={9} cy={-4} rx={6} ry={3.2} fill="#7d6248" stroke="#4a3a28" strokeWidth={0.8} />
        <circle cx={14.6} cy={-5.6} r={2.1} fill="#6b533c" stroke="#4a3a28" strokeWidth={0.7} />
        <line x1={6} y1={-1.4} x2={6} y2={1} stroke="#4a3a28" strokeWidth={1.1} />
        <line x1={12} y1={-1.4} x2={12} y2={1} stroke="#4a3a28" strokeWidth={1.1} />
        {/* attelage + charrette */}
        <line x1={3} y1={-4} x2={-3} y2={-4.6} stroke="#5d4a33" strokeWidth={1.2} />
        <path d="M-14,-3 L-3,-3 L-4.4,-8.6 L-12.6,-8.6 Z" fill="#93714a" stroke="#4a3a28" strokeWidth={0.9} />
        <circle cx={-8.5} cy={-2} r={3} fill="#8a6a40" stroke="#4a3a28" strokeWidth={0.9} />
        <circle cx={-8.5} cy={-2} r={0.9} fill="#4a3a28" />
        <path d="M-11,-8.6 C-11.4,-11 -9.8,-12.4 -8,-12.4 C-6.2,-12.4 -5,-11 -5.4,-8.6 Z" fill="#cbb289" stroke="#4a3a28" strokeWidth={0.7} />
      </g>

      {/* grain léger sur toute la peinture */}
      <rect x={0} y={0} width={MAP.w} height={MAP.h} filter="url(#ter-grain)" opacity={0.85} />
    </g>
  )
}

/** vignettage doux, posé au-dessus de la scène */
export function Vignette() {
  return <rect x={0} y={0} width={MAP.w} height={MAP.h} fill="url(#ter-vignette)" pointerEvents="none" />
}

/** voile de nuit / crépuscule, posé au-dessus de toute la scène */
export function VoileJourNuit({ phase }: { phase: number }) {
  let opacity = 0
  let couleur = '#0c1830'
  if (phase >= 0.68 || phase < 0.03) {
    opacity = 0.38
  } else if (phase >= 0.55 && phase < 0.68) {
    opacity = ((phase - 0.55) / 0.13) * 0.3
    couleur = '#5a2c18'
  } else if (phase >= 0.03 && phase < 0.08) {
    opacity = 0.25 * (1 - (phase - 0.03) / 0.05)
  }
  if (opacity <= 0.01) return null
  return <rect x={0} y={0} width={MAP.w} height={MAP.h} fill={couleur} opacity={opacity} pointerEvents="none" />
}
