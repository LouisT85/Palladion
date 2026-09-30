import { memo, type ReactNode } from 'react'
import { MAP, TOUR_ANGLES } from '../../game/data'
import { PAL, alea } from './art'
import { Feu } from './batiments/primitives'
import { Brasero, Fanion } from './batiments/vie'

/*
 * ═══════════════════════════ L'ENCEINTE (v2, refonte) ═══════════════════════════
 *
 * Redessinée de zéro. L'enceinte est une ellipse vue en oblique depuis le sud :
 * 1 px de PLAN en profondeur vaut k = ry/rx px d'écran. On en dessine deux
 * couches : `back` (arc nord, avant les bâtiments) où l'on voit la FACE INTERNE,
 * et `front` (arc sud, après eux) où l'on voit la FACE EXTERNE.
 *
 * Tout le modelé vient de l'orientation : chaque pierre prend sa valeur selon
 * la direction de la face qui la porte (lumière au NORD-OUEST). La face ouest
 * est claire, la face sud en demi-teinte, la face est dans l'ombre - pour
 * l'extérieur comme pour l'intérieur. Zéro contour noir.
 *
 * La progression se lit à la MATIÈRE, puis au COURONNEMENT, puis aux TOURS :
 *  1. PALISSADE - pieux épointés liés de harts, levée de terre au pied, chemin
 *     de planches sur poteaux côté village, échafauds de guet ;
 *  2. MUR DE MOELLONS - appareil irrégulier, chaînage de bois, parapet de
 *     planches, tours de pierre à étage de bois et toit de bardeaux ;
 *  3. REMPART APPAREILLÉ - assises réglées, créneaux, archères, tours carrées
 *     crénelées, porte voûtée entre deux massifs ;
 *  4. GRAND REMPART - calcaire blanc isodome à bossages, plinthe et corniche,
 *     tours à étage fenêtré et toit de tuiles (type Messène), tourelles de
 *     guet, porte monumentale à fronton, vantaux de bronze cloutés.
 *
 * Contrats tenus : `hauteurRonde` (le chemin de ronde est la cote de la
 * garnison et du plancher des tours), aucune cote indéfinie quelle que soit
 * l'ellipse, chantier partiel (`span`), porte percée, pans effondrés.
 */

export interface GeoMur {
  cx: number
  cy: number
  rx: number
  ry: number
}

/** demi-ouverture de la porte, en radians (angle 0 = est) */
const PORTE = 0.1
/** demi-largeur angulaire d'un pan effondré */
const DA = 0.11

const f = (n: number) => (Math.round((Number.isFinite(n) ? n : 0) * 10) / 10).toString()
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

function pt(g: GeoMur, a: number): { x: number; y: number } {
  return { x: g.cx + g.rx * Math.cos(a), y: g.cy + g.ry * Math.sin(a) }
}
/** l'ellipse décalée de `d` px de PLAN vers le dehors (d < 0 : vers le dedans) */
function grow(g: GeoMur, d: number): GeoMur {
  const k = g.rx > 0 ? g.ry / g.rx : 1
  return { cx: g.cx, cy: g.cy, rx: Math.max(1, g.rx + d), ry: Math.max(1, g.ry + d * k) }
}

interface Abs {
  as: number[]
  ss: number[]
  L: number
}
function abscisse(g: GeoMur, a0: number, a1: number, n = 260): Abs {
  const as = [a0]
  const ss = [0]
  let prev = pt(g, a0)
  let L = 0
  for (let i = 1; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    const p = pt(g, a)
    L += Math.hypot(p.x - prev.x, p.y - prev.y)
    as.push(a)
    ss.push(L)
    prev = p
  }
  return { as, ss, L }
}
/** angle atteint après `s` px d'arc écran */
function aDe(t: Abs, s: number): number {
  if (t.L <= 0) return t.as[0]
  const sc = clamp(s, 0, t.L)
  let lo = 0
  let hi = t.ss.length - 1
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1
    if (t.ss[m] <= sc) lo = m
    else hi = m
  }
  const d = t.ss[hi] - t.ss[lo]
  return t.as[lo] + (t.as[hi] - t.as[lo]) * (d > 0 ? (sc - t.ss[lo]) / d : 0)
}
function anglesPas(t: Abs, pas: number, phase = 0): number[] {
  const out: number[] = []
  if (pas <= 0 || t.L <= 0) return out
  for (let s = phase; s <= t.L; s += pas) out.push(aDe(t, s))
  return out
}
/** polyligne le long de l'arc, à la hauteur `h` */
function ligne(g: GeoMur, a0: number, a1: number, n: number, h: number): string {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const p = pt(g, a0 + ((a1 - a0) * i) / n)
    d += `${i ? 'L' : 'M'}${f(p.x)},${f(p.y - h)}`
  }
  return d
}
/** ruban fermé : aller sur gA à hA, retour sur gB à hB */
function ruban(gA: GeoMur, hA: number, gB: GeoMur, hB: number, a0: number, a1: number, n: number): string {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const p = pt(gA, a0 + ((a1 - a0) * i) / n)
    d += `${i ? 'L' : 'M'}${f(p.x)},${f(p.y - hA)}`
  }
  for (let i = n; i >= 0; i--) {
    const p = pt(gB, a0 + ((a1 - a0) * i) / n)
    d += `L${f(p.x)},${f(p.y - hB)}`
  }
  return d + 'Z'
}

// ─────────────────────────────── cotes ─────────────────────────────────────

/*
 * H     hauteur de la face, du pied au chemin de ronde (= plancher des tours)
 * W     épaisseur du mur en plan
 * par   hauteur du parapet au-dessus du chemin de ronde
 * pas   pas du couronnement (pieux, poteaux, créneaux)
 * bloc  longueur moyenne d'une pierre, hA hauteur d'assise
 */
interface Cote {
  H: number
  W: number
  par: number
  pas: number
  bloc: number
  hA: number
}
const COTES: Cote[] = [
  { H: 0, W: 0, par: 0, pas: 0, bloc: 0, hA: 0 },
  { H: 16, W: 3, par: 9, pas: 4.4, bloc: 0, hA: 0 },
  { H: 20, W: 5, par: 6, pas: 9, bloc: 6.5, hA: 3.2 },
  { H: 27, W: 7.5, par: 5.5, pas: 12.5, bloc: 11, hA: 4.4 },
  { H: 36, W: 10, par: 6.5, pas: 14.5, bloc: 14, hA: 5.2 },
]
function cote(niveau: number): Cote {
  return COTES[Math.max(0, Math.min(4, Math.round(niveau)))]
}

/** hauteur du chemin de ronde au-dessus du pied du mur (la garnison s'y poste) */
export function hauteurRonde(niveau: number): number {
  return cote(niveau).H
}

/** palettes par matière, du plus éclairé au plus ombré */
const PALS: string[][] = [
  [],
  ['#bf9b6c', '#a07d52', '#7f613d', '#624a2e', '#48371f'],
  ['#d3c7a8', '#b8ab8b', '#9b8f71', '#7d7258', '#615743'],
  ['#dcd2b8', '#c5b99f', '#a99d83', '#8c8067', '#6f654f'],
  ['#efe8d6', '#dad1b9', '#bfb59b', '#a0967d', '#837a62'],
]
/** joints : plus sombres que la pierre, jamais noirs */
const JOINTS = ['', '#4a3a26', '#5e5540', '#6a604b', '#8a8068']
/** nappes qui font tomber la valeur au pied de la face interne (sourdes et neutres) */
const PIED = ['#4b463b', '#3c382f', '#2f2b25']

/** valeur d'une face selon sa normale en plan (angle), lumière au NW */
const lumiere = (n: number) => clamp(0.52 - 0.42 * Math.cos(n) - 0.08 * Math.sin(n), 0.04, 0.96)
const ton = (l: number, j: number) => clamp(Math.round((1 - l) * 4 + j), 0, 4)

// ─────────────────────────────── appareil ──────────────────────────────────

/**
 * L'appareil d'une face courbe : assises, pierres décalées d'une assise à
 * l'autre, chaque pierre prend la valeur de sa face (± un ton de hasard).
 * `coupe(a)` plafonne la hauteur (brèche, chantier) : le bord devient
 * ÉBRÉCHÉ, assise par assise, au lieu d'un trait droit.
 */
function Appareil({
  g, a0, a1, y0, y1, hA, bloc, normale, pal, joint, seed, coupe, irregulier = false, bossage = false,
}: {
  g: GeoMur; a0: number; a1: number; y0: number; y1: number; hA: number; bloc: number
  normale: (a: number) => number; pal: string[]; joint: string; seed: number
  coupe?: (a: number) => number; irregulier?: boolean; bossage?: boolean
}) {
  const t = abscisse(g, a0, a1)
  const rnd = alea(seed)
  const d = ['', '', '', '', '']
  let joints = ''
  let clair = ''
  let sombre = ''
  if (t.L <= 0 || hA <= 0 || bloc <= 0 || y1 <= y0) return null
  let y = y0
  let row = 0
  while (y < y1 - 0.25) {
    const hh = Math.min(y1 - y, hA * (irregulier ? 0.72 + rnd() * 0.56 : 1))
    const ya = y
    const yb = y + hh
    let s0 = 0
    let s1 = row % 2 ? bloc * (irregulier ? 0.3 + rnd() * 0.5 : 0.5) : bloc * (irregulier ? 0.6 + rnd() * 0.6 : 1)
    while (s0 < t.L - 0.1) {
      const sb = Math.min(t.L, s1)
      const aa = aDe(t, s0)
      const ab = aDe(t, sb)
      const am = (aa + ab) / 2
      const cap = coupe ? coupe(am) : Infinity
      if (ya < cap) {
        const top = Math.min(yb, cap)
        const pa = pt(g, aa)
        const pb = pt(g, ab)
        const q = `M${f(pa.x)},${f(pa.y - ya)}L${f(pb.x)},${f(pb.y - ya)}L${f(pb.x)},${f(pb.y - top)}L${f(pa.x)},${f(pa.y - top)}Z`
        d[ton(lumiere(normale(am)), (rnd() - 0.5) * (irregulier ? 2.2 : 1.3))] += q
        joints += `M${f(pa.x)},${f(pa.y - ya)}L${f(pa.x)},${f(pa.y - top)}M${f(pa.x)},${f(pa.y - top)}L${f(pb.x)},${f(pb.y - top)}`
        if (bossage && top - ya > 2.4 && sb - s0 > 3) {
          const i0 = aDe(t, s0 + 1)
          const i1 = aDe(t, sb - 1)
          const qa = pt(g, i0)
          const qb = pt(g, i1)
          clair += `M${f(qa.x)},${f(qa.y - top + 1)}L${f(qb.x)},${f(qb.y - top + 1)}`
          sombre += `M${f(qa.x)},${f(qa.y - ya - 0.8)}L${f(qb.x)},${f(qb.y - ya - 0.8)}`
        }
      }
      s0 = sb
      s1 = sb + bloc * (irregulier ? 0.55 + rnd() * 0.9 : 0.85 + rnd() * 0.3)
    }
    y = yb
    row++
  }
  return (
    <g>
      {d.map((p, i) => (p ? <path key={i} d={p} fill={pal[i]} /> : null))}
      <path d={joints} stroke={joint} strokeWidth={irregulier ? 0.55 : 0.45} opacity={0.6} fill="none" />
      {clair && <path d={clair} stroke="#fffaf0" strokeWidth={0.6} opacity={0.55} fill="none" />}
      {sombre && <path d={sombre} stroke="#5a5242" strokeWidth={0.55} opacity={0.4} fill="none" />}
    </g>
  )
}

// ─────────────────────────────── tours ─────────────────────────────────────

interface CoteTour {
  D: number
  h: number
}
const COTES_TOUR: (CoteTour | null)[] = [null, null, { D: 20, h: 30 }, { D: 26, h: 52 }, { D: 32, h: 70 }]

/** blocs d'une face plane (rectangle écran), trois tons, joints décalés */
function blocsPlan(x: number, y: number, w: number, h: number, hA: number, bl: number, tons: string[], seed: number, bossage = false): ReactNode {
  const rnd = alea(seed)
  const d = ['', '', '']
  let j = ''
  let cl = ''
  let row = 0
  for (let yy = 0; yy < h - 0.2; yy += hA, row++) {
    const hh = Math.min(hA, h - yy)
    let xx = row % 2 ? -bl * 0.5 : 0
    while (xx < w) {
      const xa = Math.max(0, xx)
      const xb = Math.min(w, xx + bl * (0.8 + rnd() * 0.4))
      if (xb - xa > 0.4) {
        d[Math.floor(rnd() * 3)] += `M${f(x + xa)},${f(y - yy)}h${f(xb - xa)}v${f(-hh)}h${f(xa - xb)}Z`
        j += `M${f(x + xa)},${f(y - yy)}v${f(-hh)}`
        if (bossage && xb - xa > 3 && hh > 2.4) cl += `M${f(x + xa + 0.9)},${f(y - yy - hh + 0.9)}h${f(xb - xa - 1.8)}`
      }
      xx = xb
    }
    j += `M${f(x)},${f(y - yy)}h${f(w)}`
  }
  return (
    <g>
      {d.map((p, i) => (p ? <path key={i} d={p} fill={tons[i]} /> : null))}
      <path d={j} stroke="#5e5540" strokeWidth={0.4} opacity={0.5} fill="none" />
      {cl && <path d={cl} stroke="#fffaf0" strokeWidth={0.55} opacity={0.6} fill="none" />}
    </g>
  )
}

/** parallélogramme du retour est (face de flanc), en écran */
function flanc(x: number, y: number, h: number, ox: number, oy: number): string {
  return `M${f(x)},${f(y)}L${f(x + ox)},${f(y + oy)}L${f(x + ox)},${f(y + oy - h)}L${f(x)},${f(y - h)}Z`
}
function dessus(x: number, y: number, w: number, ox: number, oy: number): string {
  return `M${f(x)},${f(y)}L${f(x + w)},${f(y)}L${f(x + w + ox)},${f(y + oy)}L${f(x + ox)},${f(y + oy)}Z`
}

/** toit en pavillon : pan sud éclairé, pan est à l'ombre, faîte, épi */
function Pavillon({ x, y, w, ox, oy, hT, tuiles, epi }: { x: number; y: number; w: number; ox: number; oy: number; hT: number; tuiles: boolean; epi?: boolean }) {
  const A = { x: x - 1.6, y: y + 0.6 }
  const B = { x: x + w + 1.6, y: y + 0.6 }
  const C = { x: B.x + ox, y: B.y + oy }
  const Dd = { x: A.x + ox, y: A.y + oy }
  const S = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 - hT }
  let rangs = ''
  for (let i = 1; i < 5; i++) {
    const u = i / 5
    rangs += `M${f(A.x + (S.x - A.x) * u)},${f(A.y + (S.y - A.y) * u)}L${f(B.x + (S.x - B.x) * u)},${f(B.y + (S.y - B.y) * u)}`
  }
  const cS = tuiles ? '#d27a50' : '#8f7148'
  const cE = tuiles ? '#8a4529' : '#5d4a2f'
  const cN = tuiles ? '#6e3620' : '#4a3a24'
  return (
    <g>
      <path d={`M${f(Dd.x)},${f(Dd.y)}L${f(C.x)},${f(C.y)}L${f(S.x)},${f(S.y)}Z`} fill={cN} />
      <path d={`M${f(B.x)},${f(B.y)}L${f(C.x)},${f(C.y)}L${f(S.x)},${f(S.y)}Z`} fill={cE} />
      <path d={`M${f(A.x)},${f(A.y)}L${f(B.x)},${f(B.y)}L${f(S.x)},${f(S.y)}Z`} fill={cS} />
      <path d={rangs} stroke={tuiles ? '#9a4f30' : '#5f4a2e'} strokeWidth={0.5} opacity={0.6} fill="none" />
      {tuiles && <path d={`M${f(A.x + (S.x - A.x) * 0.1)},${f(A.y + (S.y - A.y) * 0.1)}L${f(S.x)},${f(S.y)}`} stroke="#f2a67c" strokeWidth={0.8} opacity={0.7} />}
      <path d={`M${f(B.x)},${f(B.y)}L${f(S.x)},${f(S.y)}`} stroke={tuiles ? '#f0a57a' : '#b8945e'} strokeWidth={0.9} />
      <path d={`M${f(A.x)},${f(A.y)}L${f(B.x)},${f(B.y)}`} stroke={tuiles ? '#5e2e1a' : '#3d2e1c'} strokeWidth={0.8} opacity={0.7} />
      {epi && <circle cx={S.x} cy={S.y - 1.2} r={1.4} fill={PAL.or} />}
    </g>
  )
}

/**
 * Une tour carrée, vue de face avec son retour est (la convention des
 * bâtiments d'origine). (x, y) = milieu du pied de la face visible.
 */
function Tour({ x, y, niveau, guet = false, fete, seed }: { x: number; y: number; niveau: number; guet?: boolean; fete: boolean; seed: number }) {
  const ct = COTES_TOUR[Math.min(4, niveau)]
  if (!ct) return null
  const c = cote(niveau)
  const D = guet ? ct.D * 0.72 : ct.D
  const R = D * 0.5
  const ox = R * 0.9
  const oy = -R * 0.45
  const x0 = x - (D + ox) / 2
  const pal = PALS[niveau]
  const face3 = [pal[1], pal[2], pal[1]]
  const out: ReactNode[] = []
  out.push(<ellipse key="om" cx={x + D * 0.35} cy={y + 2} rx={D * 0.9} ry={D * 0.22} fill={PAL.ombrePortee} opacity={0.22} filter="url(#a-flou2)" />)

  if (niveau === 2) {
    const hs = c.H + 1
    const hb = 10
    out.push(
      <g key="t2">
        <path d={flanc(x0 + D, y, hs, ox, oy)} fill={pal[3]} />
        <rect x={f(x0)} y={f(y - hs)} width={f(D)} height={f(hs)} fill={pal[2]} />
        {blocsPlan(x0, y, D, hs, 3.2, 5.5, face3, seed)}
        <path d={`M${f(x0 + D)},${f(y - 6)}l${f(ox)},${f(oy)}M${f(x0 + D)},${f(y - 13)}l${f(ox)},${f(oy)}`} stroke={JOINTS[2]} strokeWidth={0.45} opacity={0.5} />
        {/* étage de bois en encorbellement */}
        <path d={flanc(x0 + D + 1, y - hs, hb, ox, oy)} fill="#5f462d" />
        <rect x={f(x0 - 1)} y={f(y - hs - hb)} width={f(D + 2)} height={f(hb)} fill="#8a6941" />
        <path d={Array.from({ length: Math.round(D / 2.2) }, (_, i) => `M${f(x0 + 0.4 + i * 2.2)},${f(y - hs)}v${-hb}`).join('')} stroke="#5f462d" strokeWidth={0.4} opacity={0.7} />
        <rect x={f(x0 - 1)} y={f(y - hs - hb)} width={f(D + 2)} height={1} fill="#b89468" />
        <rect x={f(x - 4)} y={f(y - hs - 7)} width={1.4} height={4.4} fill="#241a0c" />
        <rect x={f(x + 1)} y={f(y - hs - 7)} width={1.4} height={4.4} fill="#241a0c" />
        {[0, 1, 2].map((i) => <path key={i} d={`M${f(x0 + 1 + i * (D - 2) / 2)},${f(y - hs)}l-1.2,3`} stroke="#4a3520" strokeWidth={0.8} />)}
        <Pavillon x={x0 - 1} y={y - hs - hb} w={D + 2} ox={ox} oy={oy} hT={8} tuiles={false} />
      </g>,
    )
  } else if (niveau === 3) {
    const h = guet ? ct.h * 0.8 : ct.h
    const hm = 3.6
    out.push(
      <g key="t3">
        <path d={flanc(x0 + D, y, h, ox, oy)} fill={pal[3]} />
        <rect x={f(x0)} y={f(y - h)} width={f(D)} height={f(h)} fill={pal[2]} />
        {blocsPlan(x0, y, D, h, c.hA, 7, face3, seed)}
        <path d={Array.from({ length: Math.floor(h / c.hA) }, (_, i) => `M${f(x0 + D)},${f(y - (i + 1) * c.hA)}l${f(ox)},${f(oy)}`).join('')} stroke={JOINTS[3]} strokeWidth={0.45} opacity={0.5} />
        <path d={dessus(x0, y - h, D, ox, oy)} fill={pal[0]} />
        {/* ombre du rebord sur la face */}
        <rect x={f(x0)} y={f(y - h)} width={f(D)} height={2.2} fill="#3c382f" opacity={0.3} />
        {/* archères */}
        {[c.H * 0.45, c.H + 5].map((hh, i) => (
          <g key={i}>
            <rect x={f(x - 0.7)} y={f(y - hh - 5.6)} width={1.4} height={5.6} fill="#1f1a14" />
            <rect x={f(x - 1.4)} y={f(y - hh)} width={2.8} height={0.7} fill={pal[0]} />
          </g>
        ))}
        {/* merlons : trois en façade, deux au retour */}
        {[0, 1, 2].map((i) => {
          const mw = D / 5
          const mx = x0 + i * 2 * mw
          return (
            <g key={'m' + i}>
              <rect x={f(mx)} y={f(y - h - hm)} width={f(mw)} height={hm} fill={pal[1]} />
              <rect x={f(mx)} y={f(y - h - hm)} width={f(mw)} height={0.7} fill={pal[0]} />
            </g>
          )
        })}
        {[0.25, 0.75].map((u, i) => (
          <path key={'r' + i} d={flanc(x0 + D + ox * (u - 0.14), y - h + oy * (u - 0.14), hm, ox * 0.28, oy * 0.28)} fill={pal[3]} />
        ))}
      </g>,
    )
  } else {
    const h = guet ? ct.h * 0.72 : ct.h
    const hBas = c.H + c.par
    out.push(
      <g key="t4">
        <path d={flanc(x0 + D, y, h, ox, oy)} fill={pal[3]} />
        <rect x={f(x0)} y={f(y - h)} width={f(D)} height={f(h)} fill={pal[1]} />
        {blocsPlan(x0, y, D, h, c.hA, 9, [pal[0], pal[1], pal[2]], seed, true)}
        <path d={Array.from({ length: Math.floor(h / c.hA) }, (_, i) => `M${f(x0 + D)},${f(y - (i + 1) * c.hA)}l${f(ox)},${f(oy)}`).join('')} stroke={JOINTS[4]} strokeWidth={0.45} opacity={0.5} />
        {/* plinthe et cordon au niveau du chemin de ronde */}
        <rect x={f(x0 - 0.8)} y={f(y - 3)} width={f(D + 0.8)} height={3} fill={pal[2]} />
        <path d={flanc(x0 + D, y, 3, ox, oy)} fill={pal[4]} />
        <rect x={f(x0 - 0.6)} y={f(y - hBas - 1.4)} width={f(D + 1.2)} height={1.6} fill={pal[0]} />
        <path d={flanc(x0 + D + 0.6, y - hBas + 0.2, 1.6, ox, oy)} fill={pal[3]} />
        {/* archère basse, fenêtres cintrées de l'étage */}
        <rect x={f(x - 0.7)} y={f(y - c.H * 0.5 - 6)} width={1.4} height={6} fill="#1f1a14" />
        {(guet ? [0] : [-D * 0.2, D * 0.2]).map((dx, i) => {
          const wx = x - ox / 2 + dx
          const wy = y - hBas - 5
          return (
            <g key={i}>
              <path d={`M${f(wx - 2)},${f(wy)}v-5.4a2,2 0 0 1 4,0v5.4Z`} fill="#2a1f14" />
              <path d={`M${f(wx - 2.8)},${f(wy + 0.2)}h5.6v0.8h-5.6Z`} fill={pal[0]} />
              <path d={`M${f(wx - 2)},${f(wy - 5.4)}a2,2 0 0 1 4,0`} stroke={pal[0]} strokeWidth={0.8} fill="none" />
            </g>
          )
        })}
        <rect x={f(x0 - 0.6)} y={f(y - h - 1.6)} width={f(D + 1.2)} height={1.8} fill={pal[0]} />
        <Pavillon x={x0} y={y - h - 1.6} w={D} ox={ox} oy={oy} hT={guet ? 8 : 12} tuiles epi={!guet} />
      </g>,
    )
  }
  const sommet = niveau === 2 ? c.H + 1 + 10 + 8 : niveau === 3 ? (guet ? ct.h * 0.8 : ct.h) + 3.6 : (guet ? ct.h * 0.72 : ct.h) + 1.6 + (guet ? 8 : 12)
  if (niveau >= 3 && fete && !guet) {
    out.push(<Fanion key="fa" x={x0 + (D + ox) / 2} y={y - sommet + (niveau >= 4 ? 0 : 1)} h={niveau >= 4 ? 16 : 13} c={niveau >= 4 ? '#7c2f4e' : '#b0412e'} c2={niveau >= 4 ? '#b45f80' : '#e2735a'} debut={seed % 3} />)
  }
  return <g>{out}</g>
}

// ─────────────────────────────── porte ─────────────────────────────────────

function Vantaux({ x, y, w, h, bronze, ouverte }: { x: number; y: number; w: number; h: number; bronze: boolean; ouverte: boolean }) {
  const bois = bronze ? '#8a5a20' : '#7a5a36'
  const boisC = bronze ? '#c98f3a' : '#a8845d'
  if (ouverte) {
    return (
      <g>
        <rect x={f(x)} y={f(y - h)} width={f(w)} height={f(h)} fill="#1f160c" />
        <path d={`M${f(x)},${f(y)}L${f(x + w * 0.22)},${f(y + 2)}L${f(x + w * 0.22)},${f(y - h + 3)}L${f(x)},${f(y - h)}Z`} fill={bois} />
        <path d={`M${f(x + w * 0.62)},${f(y + 1.4)}L${f(x + w * 1.05)},${f(y + 4)}L${f(x + w * 0.98)},${f(y + 1)}L${f(x + w * 0.6)},${f(y - 2)}Z`} fill={bois} opacity={0.9} />
      </g>
    )
  }
  let planches = ''
  for (let i = 1; i < 8; i++) planches += `M${f(x + (w * i) / 8)},${f(y)}v${f(-h)}`
  return (
    <g>
      <rect x={f(x)} y={f(y - h)} width={f(w)} height={f(h)} fill={bois} />
      <rect x={f(x)} y={f(y - h)} width={f(w * 0.12)} height={f(h)} fill={boisC} opacity={0.6} />
      <path d={planches} stroke="#3d2c17" strokeWidth={0.4} opacity={0.6} />
      <path d={`M${f(x + w / 2)},${f(y)}v${f(-h)}`} stroke="#2a1d10" strokeWidth={0.8} />
      <path d={`M${f(x)},${f(y - h * 0.25)}h${f(w)}M${f(x)},${f(y - h * 0.7)}h${f(w)}`} stroke={bronze ? '#f0cd84' : '#4a4540'} strokeWidth={bronze ? 1 : 0.9} />
      {bronze && Array.from({ length: 12 }, (_, i) => <circle key={i} cx={f(x + 1.4 + (i % 6) * ((w - 2.8) / 5))} cy={f(y - h * (i < 6 ? 0.45 : 0.9))} r={0.5} fill="#f6dc9a" />)}
    </g>
  )
}

/**
 * La porte, à l'extrémité est de l'ellipse, entre les deux bouts du mur. Vue
 * de face avec son retour, comme les bâtiments d'origine.
 */
function Porte({ geo, niveau, breche }: { geo: GeoMur; niveau: number; breche: boolean }) {
  if (niveau <= 0) return null
  const c = cote(niveau)
  const pal = PALS[niveau]
  const bout = pt(geo, PORTE)
  const x = bout.x - 2
  const y = bout.y + 3.4
  const W = niveau === 1 ? 30 : niveau === 2 ? 36 : niveau === 3 ? 46 : 56
  const R = niveau === 1 ? 0 : 14
  const ox = R * 0.9
  const oy = -R * 0.45
  const x0 = x - W / 2
  const wO = niveau === 1 ? 14 : niveau === 2 ? 13 : niveau === 3 ? 12 : 14
  const hO = niveau === 1 ? 20 : niveau === 2 ? 17 : niveau === 3 ? 19 : 23
  const out: ReactNode[] = []
  out.push(<ellipse key="om" cx={x + W * 0.3} cy={y + 3} rx={W * 0.8} ry={6} fill={PAL.ombrePortee} opacity={0.24} filter="url(#a-flou2)" />)

  if (niveau === 1) {
    const hP = c.H + c.par + 8
    out.push(
      <g key="p1">
        {/* deux fûts de chêne, linteau, plate-forme de guet */}
        {[x0, x0 + W - 5].map((px, i) => (
          <g key={i}>
            <rect x={f(px)} y={f(y - hP)} width={5} height={f(hP)} fill="#7f613d" />
            <rect x={f(px)} y={f(y - hP)} width={1.8} height={f(hP)} fill="#bf9b6c" />
            <rect x={f(px + 3.6)} y={f(y - hP)} width={1.4} height={f(hP)} fill="#48371f" />
            <path d={`M${f(px)},${f(y - hP)}l2.5,-3.4l2.5,3.4Z`} fill="#a07d52" />
          </g>
        ))}
        <Vantaux x={x0 + 5} y={y} w={W - 10} h={hO} bronze={false} ouverte={breche} />
        <rect x={f(x0 - 2)} y={f(y - hO - 4)} width={f(W + 4)} height={3.4} fill="#6a4e30" />
        <rect x={f(x0 - 2)} y={f(y - hO - 4)} width={f(W + 4)} height={1} fill="#b89468" />
        <path d={`M${f(x0)},${f(y - hO - 4)}V${f(y - hO - 14)}M${f(x0 + W)},${f(y - hO - 4)}V${f(y - hO - 14)}M${f(x0)},${f(y - hO - 10)}H${f(x0 + W)}`} stroke="#5f462d" strokeWidth={1} />
        <Pavillon x={x0 - 1} y={y - hO - 14} w={W + 2} ox={6} oy={-2.8} hT={6} tuiles={false} />
      </g>,
    )
  } else {
    const hB = niveau === 2 ? c.H + 4 : niveau === 3 ? c.H + c.par + 6 : c.H + c.par + 10
    const face3 = niveau === 4 ? [pal[0], pal[1], pal[2]] : [pal[1], pal[2], pal[1]]
    out.push(
      <g key="pb">
        <path d={flanc(x0 + W, y, hB, ox, oy)} fill={pal[3]} />
        <path d={Array.from({ length: Math.floor(hB / c.hA) }, (_, i) => `M${f(x0 + W)},${f(y - (i + 1) * c.hA)}l${f(ox)},${f(oy)}`).join('')} stroke={JOINTS[niveau]} strokeWidth={0.45} opacity={0.5} />
        <rect x={f(x0)} y={f(y - hB)} width={f(W)} height={f(hB)} fill={pal[2]} />
        {blocsPlan(x0, y, W, hB, c.hA, niveau === 2 ? 6 : niveau === 3 ? 8 : 10, face3, 71 + niveau, niveau === 4)}
        {/* le passage : cintré en pierre, droit sous linteau de bois au niveau 2 */}
        {niveau === 2 ? (
          <g>
            <rect x={f(x - wO / 2)} y={f(y - hO)} width={f(wO)} height={f(hO)} fill="#1f160c" />
            <Vantaux x={x - wO / 2} y={y} w={wO} h={hO} bronze={false} ouverte={breche} />
            <rect x={f(x - wO / 2 - 3)} y={f(y - hO - 3.2)} width={f(wO + 6)} height={3.2} fill="#6a4e30" />
            <rect x={f(x - wO / 2 - 3)} y={f(y - hO - 3.2)} width={f(wO + 6)} height={0.9} fill="#b89468" />
          </g>
        ) : (
          <g>
            <path d={`M${f(x - wO / 2 - 2.2)},${f(y)}V${f(y - hO + wO / 2)}A${f(wO / 2 + 2.2)},${f(wO / 2 + 2.2)} 0 0 1 ${f(x + wO / 2 + 2.2)},${f(y - hO + wO / 2)}V${f(y)}Z`} fill={pal[0]} />
            <path d={`M${f(x - wO / 2)},${f(y)}V${f(y - hO + wO / 2)}A${f(wO / 2)},${f(wO / 2)} 0 0 1 ${f(x + wO / 2)},${f(y - hO + wO / 2)}V${f(y)}Z`} fill="#1f160c" />
            {/* claveaux */}
            <path d={Array.from({ length: 9 }, (_, i) => {
              const a = Math.PI - (i * Math.PI) / 8
              const cx = x
              const cy = y - hO + wO / 2
              return `M${f(cx + Math.cos(a) * wO / 2)},${f(cy - Math.sin(a) * wO / 2)}L${f(cx + Math.cos(a) * (wO / 2 + 2.2))},${f(cy - Math.sin(a) * (wO / 2 + 2.2))}`
            }).join('')} stroke={JOINTS[niveau]} strokeWidth={0.5} opacity={0.7} />
            {niveau === 4 && <path d={`M${f(x - 1.4)},${f(y - hO - 2.2)}h2.8l-0.4,2.4h-2Z`} fill={PAL.or} />}
            <Vantaux x={x - wO / 2 + 0.6} y={y} w={wO - 1.2} h={hO - wO / 2 - 0.4} bronze={niveau === 4} ouverte={breche} />
            <path d={`M${f(x - wO / 2 + 0.6)},${f(y - hO + wO / 2)}A${f(wO / 2 - 0.6)},${f(wO / 2 - 0.6)} 0 0 1 ${f(x + wO / 2 - 0.6)},${f(y - hO + wO / 2)}Z`} fill={breche ? '#1f160c' : niveau === 4 ? '#5a3a10' : '#3d2c17'} />
          </g>
        )}
        {/* couronnement du massif */}
        {niveau === 2 && (
          <g>
            <path d={flanc(x0 + W, y - hB, 7, ox, oy)} fill="#5f462d" />
            <rect x={f(x0 - 1)} y={f(y - hB - 7)} width={f(W + 2)} height={7} fill="#8a6941" />
            <path d={Array.from({ length: Math.round(W / 2.4) }, (_, i) => `M${f(x0 + i * 2.4)},${f(y - hB)}v-7`).join('')} stroke="#5f462d" strokeWidth={0.4} opacity={0.7} />
            <Pavillon x={x0 - 1} y={y - hB - 7} w={W + 2} ox={ox} oy={oy} hT={7} tuiles={false} />
          </g>
        )}
        {niveau === 3 && (
          <g>
            <path d={dessus(x0, y - hB, W, ox, oy)} fill={pal[0]} />
            {Array.from({ length: 6 }, (_, i) => {
              const mw = W / 11
              return <rect key={i} x={f(x0 + i * 2 * mw)} y={f(y - hB - 3.8)} width={f(mw)} height={3.8} fill={pal[1]} />
            })}
            {[0.2, 0.6].map((u, i) => <path key={i} d={flanc(x0 + W + ox * u, y - hB + oy * u, 3.8, ox * 0.24, oy * 0.24)} fill={pal[3]} />)}
            {[-W * 0.32, W * 0.32].map((dx, i) => (
              <g key={i}>
                <rect x={f(x + dx - 0.7)} y={f(y - hB + 6)} width={1.4} height={5.6} fill="#1f1a14" />
                <rect x={f(x + dx - 1.4)} y={f(y - hB + 11.6)} width={2.8} height={0.7} fill={pal[0]} />
              </g>
            ))}
          </g>
        )}
        {niveau === 4 && (
          <g>
            {/* entablement : architrave, frise à triglyphes, corniche, fronton */}
            <rect x={f(x0 - 1)} y={f(y - hB - 2.6)} width={f(W + 2)} height={2.6} fill={pal[0]} />
            <rect x={f(x0 - 1)} y={f(y - hB - 6.4)} width={f(W + 2)} height={3.8} fill={pal[1]} />
            <path d={Array.from({ length: 9 }, (_, i) => `M${f(x0 + 2 + i * (W - 4) / 8)},${f(y - hB - 6)}v3`).join('')} stroke="#2c4660" strokeWidth={1.4} />
            <rect x={f(x0 - 2)} y={f(y - hB - 8)} width={f(W + 4)} height={1.6} fill="#fbf7ec" />
            <path d={flanc(x0 + W + 1, y - hB, 8, ox, oy)} fill={pal[3]} />
            <path d={`M${f(x0 - 2)},${f(y - hB - 8)}L${f(x)},${f(y - hB - 17)}L${f(x0 + W + 2)},${f(y - hB - 8)}Z`} fill={pal[1]} />
            <path d={`M${f(x0 + 3)},${f(y - hB - 9)}L${f(x)},${f(y - hB - 15.2)}L${f(x0 + W - 3)},${f(y - hB - 9)}Z`} fill="#35536b" />
            <circle cx={f(x)} cy={f(y - hB - 11)} r={1.8} fill={PAL.or} />
            <path d={`M${f(x0 - 2)},${f(y - hB - 8)}L${f(x)},${f(y - hB - 17)}L${f(x0 + W + 2)},${f(y - hB - 8)}`} stroke="#fffaf0" strokeWidth={1.1} fill="none" />
            <path d={`M${f(x0 + W + 2)},${f(y - hB - 8)}L${f(x0 + W + 2 + ox)},${f(y - hB - 8 + oy)}L${f(x + ox)},${f(y - hB - 17 + oy)}L${f(x)},${f(y - hB - 17)}Z`} fill="#8a4529" />
            <circle cx={f(x)} cy={f(y - hB - 18.4)} r={1.4} fill={PAL.or} />
            {/* boucliers dorés de part et d'autre du passage */}
            {[-W * 0.3, W * 0.3].map((dx, i) => (
              <g key={i}>
                <circle cx={f(x + dx)} cy={f(y - hO * 0.7)} r={3.2} fill={PAL.or} />
                <circle cx={f(x + dx)} cy={f(y - hO * 0.7)} r={2.2} fill="#7c2f4e" />
                <path d={`M${f(x + dx - 2.2)},${f(y - hO * 0.7)}a2.2,2.2 0 0 1 2.2,-2.2`} stroke="#f6dc9a" strokeWidth={0.6} fill="none" />
              </g>
            ))}
          </g>
        )}
      </g>,
    )
  }
  // les tours qui flanquent la porte (niveaux 3 et 4)
  if (niveau >= 3) {
    out.unshift(<Tour key="tn" x={x0 + 2} y={y - 6} niveau={niveau} guet fete={false} seed={91} />)
    out.push(<Tour key="ts" x={x0 + W + 4} y={y + 6} niveau={niveau} guet fete={false} seed={93} />)
  }
  if (niveau >= 4 && !breche) {
    out.push(<Brasero key="b1" x={x0 - 4} y={y + 4} s={1.1} />)
    out.push(<Brasero key="b2" x={x0 + W + 16} y={y + 10} s={1.1} />)
  }
  if (breche) {
    const rnd = alea(57)
    out.push(
      <g key="gr">
        {Array.from({ length: 8 }, (_, i) => {
          const bx = x - W * 0.4 + rnd() * W * 0.9
          const by = y + 1 + rnd() * 6
          const bw = 3 + rnd() * 4
          return <path key={i} d={`M${f(bx)},${f(by)}l${f(bw)},-0.6l0.4,${f(-bw * 0.5)}l${f(-bw)},0.4Z`} fill={i % 2 ? pal[1] ?? '#a07d52' : pal[3] ?? '#624a2e'} />
        })}
      </g>,
    )
  }
  return <g>{out}</g>
}

// ─────────────────────────────── décombres ─────────────────────────────────

/** tas de décombres au droit d'un pan effondré */
function Decombres({ g, a, crete, niveau, seed }: { g: GeoMur; a: number; crete: number; niveau: number; seed: number }) {
  const rnd = alea(seed)
  const pal = PALS[niveau]
  const pl = pt(g, a - DA - 0.02)
  const pr = pt(g, a + DA + 0.02)
  const pm = pt(g, a)
  const hT = crete * 0.32
  const tas = `M${f(pl.x)},${f(pl.y + 4)}Q${f((pl.x + pm.x) / 2)},${f(pm.y - hT)} ${f(pm.x)},${f(pm.y - hT * 0.9)}Q${f((pr.x + pm.x) / 2)},${f(pm.y - hT * 1.1)} ${f(pr.x)},${f(pr.y + 4)}Z`
  const blocs = Array.from({ length: 11 }, (_, i) => {
    const u = rnd()
    const bx = pl.x + (pr.x - pl.x) * u
    const by = pl.y + (pr.y - pl.y) * u + 3 - rnd() * hT * 0.8
    const bw = 2.4 + rnd() * (niveau >= 3 ? 5 : 3.4)
    return { bx, by, bw, bh: bw * 0.55, t: i % 3 }
  })
  if (niveau === 1) {
    return (
      <g>
        <path d={tas} fill="#7f613d" opacity={0.85} />
        {blocs.map((b, i) => <path key={i} d={`M${f(b.bx - 5)},${f(b.by)}L${f(b.bx + 5)},${f(b.by - 2 + (i % 3))}`} stroke={i % 2 ? '#a07d52' : '#624a2e'} strokeWidth={1.8} strokeLinecap="round" />)}
      </g>
    )
  }
  return (
    <g>
      <path d={tas} fill={pal[3]} />
      <path d={tas} fill={pal[1]} opacity={0.55} transform="translate(-1.2,-1.2) scale(1)" />
      {blocs.map((b, i) => (
        <g key={i}>
          <path d={`M${f(b.bx)},${f(b.by)}h${f(b.bw)}v${f(-b.bh)}h${f(-b.bw)}Z`} fill={pal[b.t + 1]} />
          <path d={`M${f(b.bx)},${f(b.by - b.bh)}h${f(b.bw)}`} stroke={pal[0]} strokeWidth={0.6} />
        </g>
      ))}
    </g>
  )
}

// ─────────────────────────────── l'enceinte ────────────────────────────────

interface Props {
  niveau: number
  hp: number
  max: number
  breche: boolean
  layer: 'back' | 'front'
  /** géométrie de l'enceinte - par défaut celle du village du joueur */
  geo?: GeoMur
  /** tours d'archers bâties sur l'enceinte */
  tours?: number
  /** fraction d'arc dessinée (chantier en cours) - 1 = enceinte complète */
  span?: number
  /** angles des secteurs effondrés : chaque pan cède à son propre endroit */
  brechesAngles?: number[]
}

/** angles des tourelles de guet du niveau 4, par couche */
const GUET = { front: [0.85, 2.29], back: [3.99, 5.43] }
/** angles des escaliers qui montent au chemin de ronde, côté village */
const ESCALIERS = [3.55, 5.12]
/** échafauds de guet de la palissade */
const ECHAFAUDS = { front: [0.95, 2.2], back: [3.8, 5.25] }

/** échafaud de guet derrière la palissade : quatre poteaux, plancher, abri de chaume */
function Echafaud({ x, y, H }: { x: number; y: number; H: number }) {
  const hP = H + 10
  return (
    <g>
      <path d={`M${f(x - 6)},${f(y)}V${f(y - hP)}M${f(x + 6)},${f(y)}V${f(y - hP)}M${f(x - 3)},${f(y - 3)}V${f(y - hP - 2)}M${f(x + 9)},${f(y - 3)}V${f(y - hP - 2)}`} stroke="#6a4e30" strokeWidth={1.3} />
      <path d={`M${f(x - 6)},${f(y - 4)}L${f(x + 6)},${f(y - hP + 2)}M${f(x + 6)},${f(y - 4)}L${f(x - 6)},${f(y - hP + 2)}`} stroke="#7f613d" strokeWidth={0.7} />
      <path d={`M${f(x - 7)},${f(y - hP)}h14l3,-3h-14Z`} fill="#8a6941" />
      <path d={`M${f(x - 7)},${f(y - hP)}h14`} stroke="#b89468" strokeWidth={0.7} />
      <path d={`M${f(x - 7)},${f(y - hP - 4)}h14l3,-3`} stroke="#6a4e30" strokeWidth={0.8} fill="none" />
      <path d={`M${f(x - 7)},${f(y - hP - 7)}V${f(y - hP - 12)}M${f(x + 7)},${f(y - hP - 7)}V${f(y - hP - 12)}`} stroke="#6a4e30" strokeWidth={0.9} />
      <path d={`M${f(x - 9)},${f(y - hP - 11)}L${f(x + 1.5)},${f(y - hP - 19)}L${f(x + 12)},${f(y - hP - 11)}Z`} fill="#c9a864" />
      <path d={`M${f(x + 1.5)},${f(y - hP - 19)}L${f(x + 12)},${f(y - hP - 11)}L${f(x + 14)},${f(y - hP - 13)}L${f(x + 4)},${f(y - hP - 20.5)}Z`} fill="#8a6d38" />
      <path d={`M${f(x - 9)},${f(y - hP - 11)}L${f(x + 1.5)},${f(y - hP - 19)}`} stroke="#ecd594" strokeWidth={0.8} />
    </g>
  )
}

function MuraillesBase({ niveau, hp, max, breche, layer, geo = MAP.mur, tours = 0, span = 1, brechesAngles }: Props) {
  const arriere = layer === 'back'
  const a0 = arriere ? Math.PI : PORTE
  const a1Complet = arriere ? 2 * Math.PI - PORTE : Math.PI
  const sp = clamp(Number.isFinite(span) ? span : 1, 0.02, 1)
  const a1 = a0 + (a1Complet - a0) * sp
  const nC = 96

  // niveau 0 : bornes de fondation
  if (niveau <= 0) {
    const t = abscisse(geo, a0, a1)
    return (
      <g opacity={0.55}>
        {anglesPas(t, 46, 10).map((a, i) => {
          const p = pt(geo, a)
          return (
            <g key={i}>
              <ellipse cx={f(p.x + 1)} cy={f(p.y + 0.6)} rx={2.6} ry={0.9} fill={PAL.ombrePortee} opacity={0.3} />
              <path d={`M${f(p.x - 1.4)},${f(p.y)}l0.4,-4h2l0.4,4Z`} fill="#a79d85" />
            </g>
          )
        })}
      </g>
    )
  }

  const n = Math.min(4, Math.round(niveau))
  const c = cote(n)
  const H = c.H
  const crete = H + c.par
  const pal = PALS[n]
  const joint = JOINTS[n]
  const gi = grow(geo, -c.W)
  const ratio = max > 0 ? hp / max : 1
  const fete = ratio >= 0.4
  const rndCren = alea(n * 31 + (arriere ? 7 : 3))

  // pans effondrés de cette couche
  const pans = (sp >= 1 ? brechesAngles ?? [] : [])
    .map((a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI))
    .filter((a) => a > 0.3 && a < 2 * Math.PI - 0.3)
    .filter((a) => (arriere ? a >= Math.PI : a < Math.PI))
  /** plafond de hauteur : brèche (ébréchée), bout de chantier (assises montantes) */
  const coupe = (a: number): number => {
    let cap = Infinity
    for (const b of pans) {
      const d = Math.abs(a - b)
      if (d < DA) return -1
      if (d < DA + 0.07) cap = Math.min(cap, crete * (0.2 + (0.8 * (d - DA)) / 0.07))
    }
    if (sp < 1) {
      const d = a1 - a
      if (d < 0.07) cap = Math.min(cap, crete * (0.15 + (0.85 * Math.max(0, d)) / 0.07))
    }
    return cap
  }

  // tours de cette couche
  const dansArc = (a: number) => {
    const an = arriere && a < 0 ? a + 2 * Math.PI : a
    return an >= a0 - 1e-6 && an <= a1 + 1e-6 ? an : null
  }
  const toursIci: { a: number; guet: boolean }[] = []
  if (COTES_TOUR[n]) for (const a of TOUR_ANGLES.slice(0, tours)) { const an = dansArc(a); if (an !== null && coupe(an) > 0) toursIci.push({ a: an, guet: false }) }
  if (n >= 4) for (const a of arriere ? GUET.back : GUET.front) { const an = dansArc(a); if (an !== null && coupe(an) > 0) toursIci.push({ a: an, guet: true }) }

  // fissures quand l'enceinte souffre
  const fissures = ratio < 0.65
    ? [0.55, 2.6, 1.25, 3.7, 5.1, 1.9].slice(0, Math.min(6, Math.floor((1 - ratio) * 8))).filter((a) => (arriere ? a >= Math.PI : a < Math.PI) && a >= a0 && a <= a1 && coupe(a) > crete)
    : []

  const nExt = (a: number) => a
  const nInt = (a: number) => a + Math.PI
  const out: ReactNode[] = []

  // ═══════════════════════ PALISSADE (niveau 1) ═══════════════════════
  if (n === 1) {
    const t = abscisse(geo, a0, a1)
    const pieux = anglesPas(t, c.pas, 1.5)
    const rnd = alea(arriere ? 19 : 11)
    let lit = ''
    let omb = ''
    let pointeL = ''
    let pointeO = ''
    const hauts: { x: number; y: number; h: number }[] = []
    for (const a of pieux) {
      const cap = coupe(a)
      if (cap < 3) continue
      const p = pt(geo, a)
      const h = Math.min(crete + (rnd() - 0.5) * 3, cap)
      const w = 3.6
      const x = p.x - w / 2
      const yb = p.y + 1
      lit += `M${f(x)},${f(yb)}h${f(w * 0.45)}v${f(-h)}h${f(-w * 0.45)}Z`
      omb += `M${f(x + w * 0.45)},${f(yb)}h${f(w * 0.55)}v${f(-h)}h${f(-w * 0.55)}Z`
      if (h >= crete - 3) {
        pointeL += `M${f(x)},${f(yb - h)}L${f(x + w / 2)},${f(yb - h - 3.4)}L${f(x + w * 0.45)},${f(yb - h)}Z`
        pointeO += `M${f(x + w * 0.45)},${f(yb - h)}L${f(x + w / 2)},${f(yb - h - 3.4)}L${f(x + w)},${f(yb - h)}Z`
      }
      hauts.push({ x: p.x, y: yb, h })
    }
    // harts : liens segmentés tous les cinq pieux
    let harts = ''
    for (const hh of [6.5, crete - 7]) {
      for (let i = 0; i + 5 < hauts.length; i += 5) {
        const A = hauts[i]
        const B = hauts[i + 5]
        if (A.h < hh + 1 || B.h < hh + 1) continue
        const j = (i % 3) * 0.4
        harts += `M${f(A.x)},${f(A.y - hh - j)}L${f(B.x)},${f(B.y - hh - j)}`
      }
    }
    const echafauds = (arriere ? ECHAFAUDS.back : ECHAFAUDS.front).filter((a) => a >= a0 && a <= a1 && coupe(a) > crete)
    const eIn = grow(geo, -9)
    if (!arriere) {
      // levée de terre au pied, dehors
      out.push(<path key="lev" d={ruban(geo, 0, grow(geo, 7), 0, a0, a1, nC)} fill="#8f7a52" />)
      out.push(<path key="levl" d={ligne(grow(geo, 2), a0, a1, nC, 1.4)} stroke="#b19a67" strokeWidth={2.2} fill="none" opacity={0.7} />)
      out.push(<path key="omb" d={ruban(grow(geo, 3), 0, grow(geo, 14), 0, a0, a1, nC)} fill={PAL.ombrePortee} opacity={0.12} />)
      echafauds.forEach((a, i) => { const p = pt(eIn, a); out.push(<Echafaud key={'e' + i} x={p.x} y={p.y} H={H} />) })
    }
    out.push(
      <g key="pal">
        <path d={omb} fill={arriere ? pal[3] : pal[2]} />
        <path d={lit} fill={arriere ? pal[2] : pal[0]} />
        <path d={pointeO} fill={pal[3]} />
        <path d={pointeL} fill={pal[1]} />
        <path d={harts} stroke="#3d2c17" strokeWidth={1.5} fill="none" />
        <path d={harts} stroke="#b89468" strokeWidth={0.45} fill="none" transform="translate(0,-0.6)" />
      </g>,
    )
    if (arriere) {
      // chemin de planches sur poteaux, côté village
      const w1 = grow(geo, -1.5)
      const w2 = grow(geo, -7)
      out.push(<path key="ch" d={ruban(w1, H, w2, H, a0, a1, nC)} fill="#8a6941" />)
      out.push(<path key="chb" d={ligne(w2, a0, a1, nC, H)} stroke="#5f462d" strokeWidth={1.4} fill="none" />)
      const tt = abscisse(w2, a0, a1)
      out.push(<path key="po" d={anglesPas(tt, 22, 8).filter((a) => coupe(a) > H).map((a) => { const p = pt(w2, a); return `M${f(p.x)},${f(p.y)}V${f(p.y - H)}` }).join('')} stroke="#5f462d" strokeWidth={1.3} />)
      out.push(<path key="pied" d={ruban(w2, 0, grow(geo, -12), 0, a0, a1, nC)} fill={PIED[0]} opacity={0.22} />)
      echafauds.forEach((a, i) => { const p = pt(eIn, a); out.push(<Echafaud key={'e' + i} x={p.x} y={p.y} H={H} />) })
    }
  }

  // ═══════════════════════ MURS DE PIERRE (niveaux 2 à 4) ═══════════════════════
  if (n >= 2) {
    const irr = n === 2
    const boss = n === 4
    const hCren = c.par * 0.45
    const gp = grow(geo, -1.6)
    const ta = abscisse(geo, a0, a1)
    const couronne = anglesPas(ta, c.pas, c.pas * 0.5)
    const raide = (a: number) => Math.abs(Math.sin(a)) < 0.34

    /** couronnement vu depuis l'extérieur (front) ou l'intérieur (back) */
    const Couronnement = ({ g, normale, avant }: { g: GeoMur; normale: (a: number) => number; avant: boolean }) => {
      if (n === 2) {
        // parapet de planches entre poteaux
        const tp = abscisse(g, a0, a1)
        const planches = anglesPas(tp, 2.4, 0.6)
        const dP = ['', '', '']
        let poteaux = ''
        for (const a of planches) {
          if (coupe(a) < crete) continue
          const p = pt(g, a)
          const l = lumiere(normale(a))
          dP[clamp(Math.round((1 - l) * 2), 0, 2)] += `M${f(p.x - 1.2)},${f(p.y - H)}h2.4v${f(-c.par)}h-2.4Z`
        }
        for (const a of couronne) {
          if (coupe(a) < crete) continue
          const p = pt(g, a)
          poteaux += `M${f(p.x)},${f(p.y - H + 1)}V${f(p.y - crete - 2.4)}`
        }
        const bois = ['#a8845d', '#8a6941', '#6a4e30']
        return (
          <g>
            {dP.map((d, i) => (d ? <path key={i} d={d} fill={bois[i]} /> : null))}
            <path d={ligne(g, a0, a1, nC, crete - 0.8)} stroke="#c09a68" strokeWidth={0.9} fill="none" opacity={avant ? 0.9 : 0.6} />
            <path d={poteaux} stroke="#4f3a24" strokeWidth={1.3} />
          </g>
        )
      }
      // créneaux de pierre : partie continue, puis merlons (ou parapet plein là où la crête se dresse)
      const merl = ['', '', '', '', '']
      let cap = ''
      const tp = abscisse(g, a0, a1)
      const wM = c.pas * 0.6
      for (let sM = c.pas * 0.5; sM <= tp.L; sM += c.pas) {
        const am = aDe(tp, sM)
        if (coupe(am) < crete) continue
        if (ratio < 0.5 && rndCren() < (0.5 - ratio) * 0.9) continue
        const plein = raide(am)
        const aa = aDe(tp, sM - (plein ? c.pas / 2 : wM / 2))
        const ab = aDe(tp, sM + (plein ? c.pas / 2 : wM / 2))
        const pa = pt(g, aa)
        const pb = pt(g, ab)
        const yb = H + hCren
        merl[ton(lumiere(normale(am)), 0)] += `M${f(pa.x)},${f(pa.y - yb)}L${f(pb.x)},${f(pb.y - yb)}L${f(pb.x)},${f(pb.y - crete)}L${f(pa.x)},${f(pa.y - crete)}Z`
        cap += `M${f(pa.x)},${f(pa.y - crete)}L${f(pb.x)},${f(pb.y - crete)}`
      }
      return (
        <g>
          <Appareil g={g} a0={a0} a1={a1} y0={H} y1={H + hCren} hA={hCren} bloc={c.bloc} normale={normale} pal={pal} joint={joint} seed={n * 13 + (avant ? 1 : 2)} coupe={coupe} bossage={false} />
          {merl.map((d, i) => (d ? <path key={i} d={d} fill={pal[i]} /> : null))}
          <path d={cap} stroke={pal[0]} strokeWidth={n === 4 ? 1.4 : 1} fill="none" />
          {n === 4 && <path d={cap} stroke="#fffaf0" strokeWidth={0.5} fill="none" transform="translate(0,-0.5)" />}
        </g>
      )
    }

    /** dessus du chemin de ronde, dallé */
    const Ronde = ({ gA, gB }: { gA: GeoMur; gB: GeoMur }) => {
      const tt = abscisse(gA, a0, a1)
      const dalles = anglesPas(tt, c.bloc * 0.9, 2).filter((a) => coupe(a) > H).map((a) => {
        const p = pt(gA, a)
        const q = pt(gB, a)
        return `M${f(p.x)},${f(p.y - H)}L${f(q.x)},${f(q.y - H)}`
      }).join('')
      return (
        <g>
          <path d={ruban(gA, H, gB, H, a0, a1, nC)} fill={n === 2 ? '#b5a888' : pal[1]} />
          <path d={dalles} stroke={joint} strokeWidth={0.4} opacity={0.5} />
        </g>
      )
    }

    if (!arriere) {
      // ── FACE EXTERNE ──
      out.push(<path key="omb" d={ruban(grow(geo, 2), 0, grow(geo, 6 + crete * 0.3), 0, a0, a1, nC)} fill={PAL.ombrePortee} opacity={0.1} />)
      out.push(<path key="omb2" d={ruban(grow(geo, 1), 0, grow(geo, 4 + crete * 0.12), 0, a0, a1, nC)} fill={PAL.ombrePortee} opacity={0.12} />)
      out.push(<Ronde key="ronde" gA={geo} gB={gi} />)
      out.push(<Appareil key="face" g={geo} a0={a0} a1={a1} y0={0} y1={H} hA={c.hA} bloc={c.bloc} normale={nExt} pal={pal} joint={joint} seed={n * 7 + 1} coupe={coupe} irregulier={irr} bossage={boss} />)
      if (n === 4) {
        // plinthe saillante et corniche au droit du chemin de ronde
        out.push(<path key="pl" d={ruban(grow(geo, 1.2), 0, grow(geo, 1.2), 3.2, a0, a1, nC)} fill={pal[2]} />)
        out.push(<path key="pll" d={ligne(grow(geo, 1.2), a0, a1, nC, 3.2)} stroke={pal[0]} strokeWidth={0.9} fill="none" />)
        out.push(<path key="co" d={ruban(grow(geo, 0.8), H - 1.6, grow(geo, 0.8), H, a0, a1, nC)} fill={pal[0]} />)
        out.push(<path key="coo" d={ligne(geo, a0, a1, nC, H - 2.2)} stroke="#6f654f" strokeWidth={0.8} fill="none" opacity={0.5} />)
      }
      if (n === 2) {
        // abouts du chaînage de bois noyé dans le mur
        const tt = abscisse(geo, a0, a1)
        out.push(<path key="ch" d={anglesPas(tt, 18, 6).filter((a) => coupe(a) > H).map((a) => { const p = pt(geo, a); return `M${f(p.x - 1.2)},${f(p.y - H * 0.55)}h2.4v-2h-2.4Z` }).join('')} fill="#6a4e30" />)
      }
      if (n >= 3) {
        // archères, une par travée de créneaux sur deux
        const tt = abscisse(geo, a0, a1)
        const ar = anglesPas(tt, c.pas * 3, c.pas).filter((a) => !raide(a) && coupe(a) > H && !toursIci.some((tp) => Math.abs(tp.a - a) < 0.08))
        out.push(<path key="ar" d={ar.map((a) => { const p = pt(geo, a); return `M${f(p.x - 0.6)},${f(p.y - H * 0.62)}h1.2v-5.4h-1.2Z` }).join('')} fill="#1f1a14" />)
        out.push(<path key="arl" d={ar.map((a) => { const p = pt(geo, a); return `M${f(p.x - 1.3)},${f(p.y - H * 0.62 + 0.4)}h2.6` }).join('')} stroke={pal[0]} strokeWidth={0.7} />)
      }
      // occlusion au pied
      out.push(<path key="ao" d={ruban(geo, 0, geo, 2.2, a0, a1, nC)} fill="#2a2218" opacity={0.28} />)
      out.push(<Couronnement key="cour" g={geo} normale={nExt} avant />)
    } else {
      // ── FACE INTERNE ── (le parapet extérieur au fond, le chemin, puis la face)
      out.push(<Couronnement key="cour" g={gp} normale={nInt} avant={false} />)
    }
    // tours de la couche arrière : entre le parapet et le chemin de ronde
    if (arriere) {
      toursIci.forEach((tp, i) => {
        const p = pt(gi, tp.a)
        const R = (COTES_TOUR[n]?.D ?? 0) * (tp.guet ? 0.72 : 1) * 0.45
        out.push(<Tour key={'tb' + i} x={p.x + R * 0.1} y={p.y + 1} niveau={n} guet={tp.guet} fete={fete} seed={i * 17 + 5} />)
      })
      out.push(<Ronde key="ronde" gA={gp} gB={gi} />)
      out.push(<Appareil key="face" g={gi} a0={a0} a1={a1} y0={0} y1={H} hA={c.hA} bloc={c.bloc} normale={nInt} pal={pal} joint={joint} seed={n * 7 + 2} coupe={coupe} irregulier={irr} bossage={false} />)
      // la valeur tombe vers le pied : trois nappes sourdes et neutres
      out.push(<path key="p0" d={ruban(gi, 0, gi, H * 0.42, a0, a1, nC)} fill={PIED[0]} opacity={0.2} />)
      out.push(<path key="p1" d={ruban(gi, 0, gi, H * 0.24, a0, a1, nC)} fill={PIED[1]} opacity={0.28} />)
      out.push(<path key="p2" d={ruban(gi, 0, gi, H * 0.1, a0, a1, nC)} fill={PIED[2]} opacity={0.4} />)
      // bande d'arête claire sous le chemin de ronde
      out.push(<path key="ar" d={ligne(gi, a0, a1, nC, H)} stroke={pal[0]} strokeWidth={0.9} fill="none" opacity={0.8} />)
      // escaliers qui montent au chemin de ronde
      ESCALIERS.filter((s) => s >= a0 && s + 0.12 <= a1 && coupe(s) > H && coupe(s + 0.12) > H && !toursIci.some((tp) => tp.a > s - 0.1 && tp.a < s + 0.2)).forEach((s, i) => {
        const ge = grow(gi, -4.5)
        const m = Math.max(4, Math.round(H / 2.6))
        let marches = ''
        let flancE = ''
        for (let j = 0; j < m; j++) {
          const aa = s + (0.12 * j) / m
          const ab = s + (0.12 * (j + 1)) / m
          const hh = (H * (j + 1)) / m
          const pa = pt(ge, aa)
          const pb = pt(ge, ab)
          const qa = pt(gi, aa)
          const qb = pt(gi, ab)
          marches += `M${f(pa.x)},${f(pa.y - hh)}L${f(pb.x)},${f(pb.y - hh)}L${f(qb.x)},${f(qb.y - hh)}L${f(qa.x)},${f(qa.y - hh)}Z`
          flancE += `M${f(pa.x)},${f(pa.y)}L${f(pb.x)},${f(pb.y)}L${f(pb.x)},${f(pb.y - hh)}L${f(pa.x)},${f(pa.y - hh)}Z`
        }
        out.push(
          <g key={'es' + i}>
            <path d={flancE} fill={pal[3]} />
            <path d={flancE} fill={PIED[1]} opacity={0.5} />
            <path d={marches} fill={pal[0]} />
          </g>,
        )
      })
    }
  }

  // fissures
  fissures.forEach((a, i) => {
    const g = arriere ? gi : geo
    const p = pt(g, a)
    const h0 = c.H * 0.15
    out.push(<path key={'fi' + i} d={`M${f(p.x)},${f(p.y - h0)}l1.4,-4l-1,-3.4l1.6,-4l-0.8,-3l1.2,-3.6`} stroke="#2a2218" strokeWidth={0.8} fill="none" opacity={0.7} />)
  })
  // décombres des pans effondrés
  pans.forEach((a, i) => out.push(<Decombres key={'de' + i} g={arriere ? gi : grow(geo, 3)} a={a} crete={crete} niveau={n} seed={i * 23 + 9} />))
  // chantier : échafaudage au bout de l'arc
  if (sp < 1) {
    const p = pt(arriere ? gi : geo, a1)
    const hS = crete * 0.8
    out.push(
      <g key="chantier">
        <path d={`M${f(p.x - 6)},${f(p.y + 2)}V${f(p.y - hS)}M${f(p.x + 6)},${f(p.y + 4)}V${f(p.y - hS + 2)}M${f(p.x - 7)},${f(p.y - hS * 0.5)}H${f(p.x + 7)}M${f(p.x - 7)},${f(p.y - hS * 0.9)}H${f(p.x + 7)}M${f(p.x - 6)},${f(p.y)}L${f(p.x + 6)},${f(p.y - hS * 0.5)}`} stroke="#6a4e30" strokeWidth={1.1} />
        <path d={`M${f(p.x - 8)},${f(p.y - hS * 0.5 - 1)}h16v1.2h-16Z`} fill="#a8845d" />
        {n >= 2 && <path d={`M${f(p.x + 8)},${f(p.y + 4)}h7v-3h-7ZM${f(p.x + 9)},${f(p.y + 1)}h5v-2.6h-5Z`} fill={pal[1]} />}
      </g>,
    )
  }

  // tours de la couche avant, devant le mur
  if (!arriere) {
    toursIci.forEach((tp, i) => {
      const p = pt(geo, tp.a)
      out.push(<Tour key={'tf' + i} x={p.x} y={p.y + 3.5} niveau={n} guet={tp.guet} fete={fete} seed={i * 17 + 3} />)
    })
  }

  if (!arriere && sp >= 1) out.push(<Porte key="porte" geo={geo} niveau={n} breche={breche} />)

  return <g>{out}</g>
}

/* ═══════════════ LE FOSSÉ ET LA VIE DU REMPART ═══════════════
 * Le fossé est dessiné SOUS le mur, dehors : sec et hérissé de pieux (1),
 * élargi (2), douve en eau à contrescarpe de pierre (3), douve large et
 * parementée (4). Il s'interrompt devant la porte (chaussée de terre).
 * Torches de veille dès le niveau 2, boucliers pendus au parapet dès le 3,
 * tentures pourpre et or au 4 - jamais à moins d'un pan d'une brèche, et
 * retirées quand l'enceinte souffre (< 40 % de structure).
 */
function Fosse({ niveau, layer, geo = MAP.mur, span = 1 }: Props) {
  if (niveau <= 0 || span < 1) return null
  const arriere = layer === 'back'
  const n = Math.min(4, Math.round(niveau))
  const eau = n >= 3
  const d0 = n >= 4 ? 5 : 6
  const d1 = n === 1 ? 12 : n === 2 ? 14 : n === 3 ? 16 : 19
  const g = (d: number) => grow(geo, d)
  const [a0, a1] = arriere ? [Math.PI, 2 * Math.PI - 0.3] : [0.3, Math.PI]
  const nn = 90
  let pieux = ''
  if (n === 1) {
    for (let a = a0 + 0.04; a < a1; a += 9 / Math.max(geo.rx, geo.ry)) {
      const p = pt(g((d0 + d1) / 2), a)
      pieux += `M${f(p.x - 0.6)},${f(p.y + 0.6)}L${f(p.x + 0.9)},${f(p.y - 4.2)}`
    }
  }
  return (
    <g>
      {eau ? (
        <>
          <path d={ruban(g(d0 - 1), 0, g(d1 + 1.6), 0, a0, a1, nn)} fill="#6f6553" />
          <path d={ruban(g(d0), 0, g(d1), 0, a0, a1, nn)} fill="#2f6f82" />
          <path d={ruban(g(d0), 0, g(d0 + (d1 - d0) * 0.45), 0, a0, a1, nn)} fill="#1f5467" opacity={0.7} />
          <path d={ligne(g(d0 + (d1 - d0) * 0.62), a0, a1, nn, 0)} stroke="#9fd6d8" strokeWidth={0.8} fill="none" strokeDasharray="10 7 4 9" opacity={0.55} />
          <path d={ligne(g(d1 + 0.8), a0, a1, nn, 0)} stroke={n >= 4 ? '#ddd4bd' : '#b3a88d'} strokeWidth={n >= 4 ? 2.2 : 1.6} fill="none" />
          {n >= 4 && <path d={ligne(g(d1 + 2), a0, a1, nn, 0)} stroke="#877c63" strokeWidth={0.8} fill="none" />}
        </>
      ) : (
        <>
          <path d={ruban(g(d0), 0, g(d1), 0, a0, a1, nn)} fill="#7a6644" />
          <path d={ruban(g(d0 + (d1 - d0) * 0.35), 0, g(d0 + (d1 - d0) * 0.7), 0, a0, a1, nn)} fill="#5c4b30" />
          <path d={ligne(g(d1), a0, a1, nn, 0)} stroke="#b19a67" strokeWidth={1.2} fill="none" />
          {pieux && <path d={pieux} stroke="#6a4e30" strokeWidth={1.1} strokeLinecap="round" />}
        </>
      )}
    </g>
  )
}

function VieMurailles({ niveau, hp, max, layer, geo = MAP.mur, span = 1, brechesAngles }: Props) {
  if (niveau <= 0 || span < 1) return null
  const n = Math.min(4, Math.round(niveau))
  const arriere = layer === 'back'
  const c = cote(n)
  const crete = c.H + c.par
  const ratio = max > 0 ? hp / max : 1
  const fete = ratio >= 0.4
  const loin = (a: number) => !(brechesAngles ?? []).some((b) => Math.abs(((a - b + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) < 0.22)
  const surCouche = (a: number) => {
    const an = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    return arriere ? an >= Math.PI : an > PORTE && an < Math.PI
  }
  const loinTours = (a: number) => !TOUR_ANGLES.some((t) => Math.abs(((a - t + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) < 0.12)
  const sur = (angles: number[]) => angles.filter((a) => surCouche(a) && loin(a) && loinTours(a)).map((a) => ({ a, ...pt(geo, a) }))
  const gp = grow(geo, -c.W)
  return (
    <g>
      {n >= 2 && fete && sur(arriere ? [3.4, 4.25, 5.0, 5.65] : [0.62, 1.2, 1.9, 2.6]).map((p, i) => {
        const q = arriere ? pt(gp, p.a) : p
        return (
          <g key={'to' + i} transform={`translate(${f(q.x)},${f(q.y - c.H)})`}>
            <line x1={0} y1={0} x2={0} y2={-9} stroke="#5f462d" strokeWidth={1.1} />
            <path d="M-1.4,-9 L1.4,-9 L1,-10.6 L-1,-10.6 Z" fill="#8a5a20" />
            <circle cx={0} cy={-12} r={5} fill="#f8c86c" opacity={0.2} filter="url(#a-flou2)" />
            <Feu x={0} y={-11.4} r={1.2} />
          </g>
        )
      })}
      {n >= 3 && !arriere && sur([1.05, 1.34, 1.78, 2.05, 2.4]).map((p, i) => {
        const y = p.y - crete + 4.4
        const fond = ['#a8702a', '#8e3b2a', '#2f4a63'][i % 3]
        return (
          <g key={'bo' + i} transform={`translate(${f(p.x)},${f(y)})`}>
            <ellipse cx={1} cy={1.2} rx={3.4} ry={3.2} fill={PAL.ombrePortee} opacity={0.25} />
            <circle cx={0} cy={0} r={3.3} fill="#c9922f" />
            <circle cx={0} cy={0} r={2.6} fill={fond} />
            <path d="M-2.6,0 A2.6,2.6 0 0 1 0,-2.6" stroke="#f0cd84" strokeWidth={0.6} fill="none" />
            {i % 3 === 0 ? <path d="M-1.2,1 L0,-1.4 L1.2,1 Z" fill="#efe3c4" /> : <circle cx={0} cy={0} r={0.9} fill="#efe3c4" />}
          </g>
        )
      })}
      {n >= 4 && fete && !arriere && sur([1.12, 1.57, 2.0]).map((p, i) => {
        const w = 9
        const h = c.H * 0.55
        const y0 = p.y - c.H + 1
        const c1 = i === 1 ? '#c9922f' : '#7c2f4e'
        const c2 = i === 1 ? '#f0cd84' : '#b45f80'
        const d1 = `M${f(p.x - w / 2)},${f(y0)} L${f(p.x + w / 2)},${f(y0)} L${f(p.x + w / 2)},${f(y0 + h)} L${f(p.x)},${f(y0 + h - 3.4)} L${f(p.x - w / 2)},${f(y0 + h)} Z`
        const d2 = `M${f(p.x - w / 2)},${f(y0)} L${f(p.x + w / 2)},${f(y0)} L${f(p.x + w / 2 + 0.8)},${f(y0 + h)} L${f(p.x + 0.6)},${f(y0 + h - 3.4)} L${f(p.x - w / 2 + 0.6)},${f(y0 + h)} Z`
        return (
          <g key={'te' + i}>
            <path d={d1} fill={c1}>
              <animate attributeName="d" values={`${d1};${d2};${d1}`} dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
            </path>
            <path d={`M${f(p.x - w / 2)},${f(y0 + 3)} L${f(p.x + w / 2)},${f(y0 + 3)} M${f(p.x - w / 2)},${f(y0 + h - 6)} L${f(p.x + w / 2)},${f(y0 + h - 6)}`} stroke={c2} strokeWidth={1.1} />
            <circle cx={f(p.x)} cy={f(y0 + h * 0.45)} r={1.8} fill="none" stroke={c2} strokeWidth={0.8} />
            <rect x={f(p.x - w / 2 - 1)} y={f(y0 - 1.2)} width={f(w + 2)} height={1.4} fill="#5f462d" />
          </g>
        )
      })}
    </g>
  )
}

/**
 * L'enceinte. Mémoïsée : hors assaut, ni le niveau ni les points de structure
 * ne bougent, et l'arc échantillonné coûte plusieurs centaines de nœuds.
 */
export const Murailles = memo(function Murailles(props: Props) {
  return (
    <g>
      <Fosse {...props} />
      <MuraillesBase {...props} />
      <VieMurailles {...props} />
    </g>
  )
})
