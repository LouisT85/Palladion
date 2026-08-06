import { memo } from 'react'
import { MAP, TOUR_ANGLES } from '../../game/data'
import { AOBase, PAL, alea } from './art'

/*
 * ═══════════════════════════ L'ENCEINTE ═══════════════════════════
 *
 * Tout le dessin découle de QUATRE règles de géométrie. Les trois quarts des
 * défauts qu'on reprochait aux remparts venaient de leur absence.
 *
 * R1 — ON ÉCHANTILLONNE EN LONGUEUR D'ARC, JAMAIS EN ANGLE. Un pas angulaire
 *   constant s'écrase aux deux extrémités est/ouest de l'ellipse : les créneaux
 *   s'y empilaient à la verticale, 3,7 px de large espacés de 8,9 px, et
 *   flottaient sur l'herbe. `abscisse()` + `anglesArc()` donnent des points
 *   régulièrement espacés À L'ÉCRAN, quelle que soit l'ellipse.
 *
 * R2 — PAS DE CRÉNEAUX LÀ OÙ LA CRÊTE EST DEBOUT. Un merlon n'a de sens que si
 *   la crête court plus à plat que 33°, soit |tx| > 0,55 sur la tangente écran.
 *   En deçà - les ~0,37 rad de part et d'autre de la porte et du point ouest -
 *   le parapet devient CONTINU, avec une encoche d'ombre au rythme des créneaux.
 *
 * R3 — LE CHEMIN DE RONDE A UNE ÉPAISSEUR APPARENTE VARIABLE. Le mur est un
 *   anneau entre DEUX ellipses (`dedans(geo, W)`), pas un ruban d'épaisseur
 *   constante : vu de bout à l'est et à l'ouest, son dessus n'est plus qu'un
 *   décalé horizontal ; vu de face au sud et au nord, il s'ouvre en dallage.
 *
 * R4 — DEUX FACES, PAS UNE. La couche `front` (arc sud) montre la face
 *   EXTERNE : appareil, archères, contreforts, mâchicoulis. La couche `back`
 *   (arc nord) montre la face INTERNE - c'est celle qui regarde le joueur :
 *   enduit, escaliers, appentis, aucune archère.
 *
 * Et une règle de raccord : LA TOUR EST DESSINÉE POUR SON NIVEAU DE MUR. Son
 * plancher EST le chemin de ronde, son axe suit l'ellipse de MI-ÉPAISSEUR (elle
 * chevauche la courtine au lieu d'être posée dessus), et cinq pièces la
 * soudent - encoche de la crête, retours de parapet, larmier de jonction,
 * ombre portée sur la face, accès.
 */

/** demi-ouverture de la porte, en radians (angle 0 = est) */
const PORTE = 0.1

export interface GeoMur {
  cx: number
  cy: number
  rx: number
  ry: number
}

function pt(geo: GeoMur, a: number): { x: number; y: number } {
  return { x: geo.cx + geo.rx * Math.cos(a), y: geo.cy + geo.ry * Math.sin(a) }
}

/** compression de la vue oblique : 1 px de PLAN vaut k px d'écran en profondeur */
function komp(geo: GeoMur): number {
  return geo.ry / geo.rx
}

/** l'ellipse du NU INTÉRIEUR, à `d` px de plan en deçà du nu extérieur */
function dedans(geo: GeoMur, d: number): GeoMur {
  return { cx: geo.cx, cy: geo.cy, rx: geo.rx - d, ry: geo.ry - d * komp(geo) }
}

/** tangente écran unitaire - |tx| dit si la crête court à plat ou debout (R2) */
function tangente(geo: GeoMur, a: number): { tx: number; ty: number } {
  const dx = -geo.rx * Math.sin(a)
  const dy = geo.ry * Math.cos(a)
  const L = Math.hypot(dx, dy) || 1
  return { tx: dx / L, ty: dy / L }
}

/**
 * Déplacement ÉCRAN d'un déplacement de d px de PLAN vers le dehors. Ce n'est
 * PAS la normale écran unitaire : la profondeur est comprimée de k = ry/rx par
 * la vue oblique, et l'oublier gonfle les débords de 1/k au sud (les merlons
 * devenaient des plaques blanches de 6 px au lieu de 3,7).
 */
function saillie(geo: GeoMur, a: number, d: number): { dx: number; dy: number } {
  return { dx: d * Math.cos(a), dy: d * (geo.ry / geo.rx) * Math.sin(a) }
}

/** polyligne le long de l'arc : `dy` en hauteur, `dOut` vers le dehors */
function ligne(geo: GeoMur, a0: number, a1: number, n: number, dy = 0, dOut = 0): string {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    const p = pt(geo, a)
    let x = p.x
    let y = p.y + dy
    if (dOut) {
      const u = saillie(geo, a, dOut)
      x += u.dx
      y += u.dy
    }
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }
  return d
}

/** ruban fermé entre deux courbes, éventuellement portées par deux ellipses */
function ruban(
  gA: GeoMur,
  dyA: number,
  gB: GeoMur,
  dyB: number,
  a0: number,
  a1: number,
  n: number,
  outA = 0,
  outB = 0,
): string {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    const p = pt(gA, a)
    let x = p.x
    let y = p.y + dyA
    if (outA) {
      const u = saillie(gA, a, outA)
      x += u.dx
      y += u.dy
    }
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n
    const p = pt(gB, a)
    let x = p.x
    let y = p.y + dyB
    if (outB) {
      const u = saillie(gB, a, outB)
      x += u.dx
      y += u.dy
    }
    d += `L${x.toFixed(1)},${y.toFixed(1)}`
  }
  return d + 'Z'
}

/** table d'abscisse curviligne de l'arc - le socle de R1 */
interface Abs {
  as: number[]
  ss: number[]
  L: number
}

function abscisse(geo: GeoMur, a0: number, a1: number, n = 220): Abs {
  const as = [a0]
  const ss = [0]
  let s = 0
  let prec = pt(geo, a0)
  for (let i = 1; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    const p = pt(geo, a)
    s += Math.hypot(p.x - prec.x, p.y - prec.y)
    as.push(a)
    ss.push(s)
    prec = p
  }
  return { as, ss, L: s }
}

/** angles espacés de `pasPx` px d'ARC ÉCRAN (R1), décalés de `phase` px */
function anglesArc(t: Abs, pasPx: number, phase = 0, marge = 0): number[] {
  const out: number[] = []
  if (pasPx <= 0) return out
  let j = 0
  for (let s = marge + pasPx * 0.5 + phase; s <= t.L - marge; s += pasPx) {
    while (j < t.ss.length - 2 && t.ss[j + 1] < s) j++
    const seg = t.ss[j + 1] - t.ss[j]
    const f = seg > 1e-6 ? (s - t.ss[j]) / seg : 0
    out.push(t.as[j] + (t.as[j + 1] - t.as[j]) * f)
  }
  return out
}

/** nombre de segments pour approcher un arc de `L` px sans facettes visibles */
function pasCourbe(L: number): number {
  return Math.max(6, Math.min(96, Math.round(L / 9)))
}

/*
 * ─────────────── LES COTES, NIVEAU PAR NIVEAU ───────────────
 * H     hauteur de la FACE, du pied au chemin de ronde (= plancher des tours)
 * W     épaisseur en PLAN (l'épaisseur apparente du dessus vaut W·k·|sin a|)
 * par   hauteur du parapet extérieur au-dessus du chemin de ronde
 * pas   pas d'arc du couronnement (pieux, poteaux de hourd, créneaux)
 * wM    largeur du merlon en plan
 * La CRÊTE vaut donc H + par : 25 / 24 / 32,5 / 42,5.
 */
interface Cote {
  H: number
  W: number
  par: number
  pas: number
  wM: number
  pasBloc: number
  rangs: number
  hAssise: number
}

const COTES: Cote[] = [
  { H: 0, W: 0, par: 0, pas: 0, wM: 0, pasBloc: 0, rangs: 0, hAssise: 0 },
  { H: 16, W: 3, par: 9, pas: 6.5, wM: 0, pasBloc: 0, rangs: 0, hAssise: 0 },
  { H: 20, W: 5, par: 6, pas: 10, wM: 0, pasBloc: 9, rangs: 5, hAssise: 4 },
  { H: 27, W: 7.5, par: 5.5, pas: 13, wM: 8, pasBloc: 12, rangs: 5, hAssise: 4.8 },
  { H: 36, W: 10, par: 6.5, pas: 15, wM: 9, pasBloc: 13, rangs: 6, hAssise: 5.4 },
]

function cote(niveau: number): Cote {
  return COTES[Math.max(0, Math.min(4, Math.round(niveau)))]
}

/** hauteur du chemin de ronde au-dessus du pied du mur (la garnison s'y poste) */
export function hauteurRonde(niveau: number): number {
  return cote(niveau).H
}

/*
 * ─────────────── LES TOURS, INDEXÉES SUR LE MUR ───────────────
 * D    diamètre du fût
 * par  hauteur du parapet de la tour (celui du mur + 1,5 : la tour dépasse d'un
 *      cheveu, et c'est le COURONNEMENT qui fait l'accent, pas la hauteur)
 * toit surhaussement du couronnement au-dessus de la crête de la tour
 */
interface CoteTour {
  D: number
  par: number
  toit: number
}

const COTES_TOUR: (CoteTour | null)[] = [
  null,
  null,
  { D: 15, par: 5.5, toit: 4 },
  { D: 19, par: 7, toit: 5 },
  { D: 24, par: 8, toit: 7 },
]

/** dégradés du domaine (préfixe mur-) : lumière à l'OUEST, ombre à l'EST */
function DefsMur() {
  return (
    <defs>
      <linearGradient id="mur-face" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#c5baa0" />
        <stop offset="42%" stopColor="#8e8367" />
        <stop offset="100%" stopColor="#544a35" />
      </linearGradient>
      <linearGradient id="mur-face4" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#d2c9b1" />
        <stop offset="42%" stopColor="#978c70" />
        <stop offset="100%" stopColor="#5c5238" />
      </linearGradient>
      <linearGradient id="mur-dalle" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#e2dac6" />
        <stop offset="55%" stopColor="#c2b89f" />
        <stop offset="100%" stopColor="#8f8367" />
      </linearGradient>
      <linearGradient id="mur-sec" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#b8ab8c" />
        <stop offset="45%" stopColor="#8a7e63" />
        <stop offset="100%" stopColor="#544b38" />
      </linearGradient>
      {/* face INTERNE (couche arrière) : enduit de terre mat, pas de bel appareil */}
      <linearGradient id="mur-interne" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#bdb08e" />
        <stop offset="45%" stopColor="#a1936f" />
        <stop offset="100%" stopColor="#7d7052" />
      </linearGradient>
      {/* bande claire du couronnement : forte à l'ouest, s'éteint vers l'est */}
      <linearGradient id="mur-lum" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#f7f1dd" stopOpacity="0.95" />
        <stop offset="55%" stopColor="#efe8d3" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#e6dfc9" stopOpacity="0.18" />
      </linearGradient>
      {/* pied du mur : l'ombre s'épaissit vers l'est */}
      <linearGradient id="mur-pied" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#241a08" stopOpacity="0.14" />
        <stop offset="55%" stopColor="#241a08" stopOpacity="0.26" />
        <stop offset="100%" stopColor="#241a08" stopOpacity="0.42" />
      </linearGradient>
      {/* pénombre d'embrasure : plus noire en haut, sol qui reçoit un peu de jour */}
      <linearGradient id="mur-antre" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#150e07" />
        <stop offset="72%" stopColor="#2a1f10" />
        <stop offset="100%" stopColor="#45351d" />
      </linearGradient>
    </defs>
  )
}

/** tons de pierre, du plus éclairé (ouest) au plus ombré (est) */
const TONS_SEC = ['#d5cbb0', '#bfb397', '#a3977b', '#877b60', '#6d6248']
const TONS_TAILLE = ['#d8cfb9', '#c5b9a0', '#ab9f85', '#8f8368', '#75694f']

/**
 * Assises de pierre épousant l'arc, à pas d'ARC (R1) : les blocs gardent un
 * rapport de 2,5:1 partout au lieu de s'étirer en traînées de 6,4:1 au sud.
 * Un chemin par ton (perf), plus le bossage du niveau 4.
 */
function assisesArc(
  geo: GeoMur,
  t: Abs,
  pasPx: number,
  dyHaut: number,
  rangs: number,
  hA: number,
  nTons: number,
  seed: number,
  bossage: boolean,
): { tons: string[]; boss: string; liseret: string } {
  const rnd = alea(seed)
  const tons = Array.from({ length: nTons }, () => '')
  let boss = ''
  let liseret = ''
  for (let r = 0; r < rangs; r++) {
    const as = anglesArc(t, pasPx, r % 2 ? pasPx * 0.5 : 0, 1)
    for (let i = 0; i + 1 < as.length; i++) {
      if (rnd() < 0.08) continue
      const a = as[i]
      const b = a + (as[i + 1] - a) * (0.8 + rnd() * 0.16)
      const p0 = pt(geo, a)
      const p1 = pt(geo, b)
      const jit = (rnd() - 0.5) * 0.6
      const y0 = p0.y + dyHaut + r * hA + jit
      const y1 = p1.y + dyHaut + r * hA + jit
      const h = hA * (0.84 + rnd() * 0.13)
      // lumière NW : l'ouest (a ≈ π) est clair, l'est (a ≈ 0) est sombre
      const lit = (1 - Math.cos((a + b) / 2)) / 2
      const k = Math.min(nTons - 1, Math.max(0, Math.round((1 - lit) * (nTons - 1) + (rnd() - 0.5) * 1.5)))
      const x0 = p0.x.toFixed(1)
      const x1 = p1.x.toFixed(1)
      tons[k] +=
        `M${x0},${y0.toFixed(1)}L${x1},${y1.toFixed(1)}` +
        `L${x1},${(y1 + h).toFixed(1)}L${x0},${(y0 + h).toFixed(1)}Z`
      if (bossage) {
        boss += `M${x0},${y0.toFixed(1)}L${x1},${y1.toFixed(1)}L${x1},${(y1 + 1).toFixed(1)}L${x0},${(y0 + 1).toFixed(1)}Z`
        liseret += `M${x0},${(y0 + h - 0.8).toFixed(1)}L${x1},${(y1 + h - 0.8).toFixed(1)}L${x1},${(y1 + h).toFixed(1)}L${x0},${(y0 + h).toFixed(1)}Z`
      }
    }
  }
  return { tons, boss, liseret }
}

/**
 * Pieux taillés en pointe (palissade), 3 valeurs de bois + arête ouest + pointe.
 * Les points arrivent déjà espacés en longueur d'arc.
 */
function pieuxPaths(
  pts: { x: number; y: number }[],
  dyBase: number,
  hBase: number,
  hVar: number,
  w: number,
  seed: number,
) {
  const rnd = alea(seed)
  const corps = ['', '', '']
  let arete = ''
  let pointe = ''
  for (const p of pts) {
    const h = hBase + rnd() * hVar
    const x0 = (p.x - w / 2).toFixed(1)
    const x1 = (p.x + w / 2).toFixed(1)
    const yB = (p.y + dyBase).toFixed(1)
    const yT = p.y + dyBase - h
    const yEp = (yT + 2.4).toFixed(1)
    const k = Math.floor(rnd() * 3)
    corps[k] += `M${x0},${yB}L${x0},${yEp}L${p.x.toFixed(1)},${yT.toFixed(1)}L${x1},${yEp}L${x1},${yB}Z`
    arete += `M${x0},${yB}L${x0},${yEp}L${(p.x - w / 2 + w * 0.34).toFixed(1)},${(yT + 1.3).toFixed(1)}L${(p.x - w / 2 + w * 0.34).toFixed(1)},${yB}Z`
    pointe += `M${(p.x - w / 2 + 0.4).toFixed(1)},${(yT + 2.2).toFixed(1)}L${p.x.toFixed(1)},${yT.toFixed(1)}L${(p.x + w / 2 - 0.4).toFixed(1)},${(yT + 2.2).toFixed(1)}L${p.x.toFixed(1)},${(yT + 1.3).toFixed(1)}Z`
  }
  return { corps, arete, pointe }
}

/**
 * LE COURONNEMENT. Un merlon par pas d'arc là où la crête court à plat, une
 * encoche d'ombre sur un parapet continu là où elle se dresse (R2), rien du
 * tout au droit d'une tour (encoche de raccord). Six chemins pour tout l'arc.
 */
function couronnement(
  geo: GeoMur,
  angles: number[],
  H: number,
  par: number,
  wM: number,
  W: number,
  arriere: boolean,
  encoches: { a: number; da: number }[],
  seed: number,
) {
  const rnd = alea(seed)
  // épaisseur du parapet en PLAN. À 0,62·W il ne restait que 3,8 px de chemin de
  // ronde : vu du nord les merlons devenaient des plaques et le dallage
  // disparaissait. Un parapet vaut le tiers de l'épaisseur du mur.
  const tp = Math.max(2.2, W * 0.34)
  let face = ''
  let dessus = ''
  let flanc = ''
  let interne = ''
  let ombre = ''
  let jour = ''
  let crans = ''
  let prec: { xd: number; y: number } | null = null
  for (const a of angles) {
    if (encoches.some((e) => Math.abs(a - e.a) < e.da)) {
      prec = null
      continue
    }
    const p = pt(geo, a)
    const { tx } = tangente(geo, a)
    const u = saillie(geo, a, -tp)
    const plat = Math.abs(tx) > 0.55
    const yB = p.y - H
    if (!plat) {
      // crête debout (R2) : le parapet est CONTINU, on ne marque que le rythme
      crans += `M${p.x.toFixed(1)},${(yB - 0.6).toFixed(1)}L${(p.x + u.dx).toFixed(1)},${(yB - 0.6 + u.dy).toFixed(1)}L${(p.x + u.dx).toFixed(1)},${(yB - par + 0.8 + u.dy).toFixed(1)}L${p.x.toFixed(1)},${(yB - par + 0.8).toFixed(1)}Z`
      prec = null
      continue
    }
    const w = wM * Math.abs(tx)
    const h = par + (rnd() - 0.5) * 0.9
    const x0 = p.x - w / 2
    const x1 = p.x + w / 2
    const yT = yB - h
    const dx = u.dx
    const dy = u.dy
    if (arriere) {
      // le merlon est au LOIN : on voit son dessus, puis sa face INTERNE
      dessus += `M${x0.toFixed(1)},${yT.toFixed(1)}L${(x0 + dx).toFixed(1)},${(yT + dy).toFixed(1)}L${(x1 + dx).toFixed(1)},${(yT + dy).toFixed(1)}L${x1.toFixed(1)},${yT.toFixed(1)}Z`
      interne += `M${(x0 + dx).toFixed(1)},${(yT + dy).toFixed(1)}L${(x1 + dx).toFixed(1)},${(yT + dy).toFixed(1)}L${(x1 + dx).toFixed(1)},${(yB + dy).toFixed(1)}L${(x0 + dx).toFixed(1)},${(yB + dy).toFixed(1)}Z`
      // son ombre tombe SUR le dallage, vers le sud-est
      ombre += `M${(x0 + dx).toFixed(1)},${(yB + dy).toFixed(1)}L${(x1 + dx).toFixed(1)},${(yB + dy).toFixed(1)}L${(x1 + dx + h * 0.6).toFixed(1)},${(yB + dy + h * 0.3).toFixed(1)}L${(x0 + dx + h * 0.6).toFixed(1)},${(yB + dy + h * 0.3).toFixed(1)}Z`
    } else {
      // le merlon est au PREMIER PLAN : sa face externe, son dessus, son flanc est
      face += `M${x0.toFixed(1)},${yB.toFixed(1)}L${x0.toFixed(1)},${yT.toFixed(1)}L${x1.toFixed(1)},${yT.toFixed(1)}L${x1.toFixed(1)},${yB.toFixed(1)}Z`
      dessus += `M${x0.toFixed(1)},${yT.toFixed(1)}L${(x0 + dx).toFixed(1)},${(yT + dy).toFixed(1)}L${(x1 + dx).toFixed(1)},${(yT + dy).toFixed(1)}L${x1.toFixed(1)},${yT.toFixed(1)}Z`
      if (Math.abs(tx) > 0.78)
        flanc += `M${x1.toFixed(1)},${yB.toFixed(1)}L${x1.toFixed(1)},${yT.toFixed(1)}L${(x1 + dx).toFixed(1)},${(yT + dy).toFixed(1)}L${(x1 + dx).toFixed(1)},${(yB + dy).toFixed(1)}Z`
      // le JOUR entre deux merlons : la gorge d'ombre sur le dallage
      if (prec && x0 - prec.xd > 1.2 && Math.abs(prec.y - yB) < par)
        jour +=
          `M${prec.xd.toFixed(1)},${prec.y.toFixed(1)}L${x0.toFixed(1)},${yB.toFixed(1)}` +
          `L${(x0 + dx).toFixed(1)},${(yB + dy).toFixed(1)}L${(prec.xd + dx).toFixed(1)},${(prec.y + dy).toFixed(1)}Z`
    }
    prec = { xd: x1, y: yB }
  }
  return { face, dessus, flanc, interne, ombre, jour, crans }
}

/**
 * Angle où la crête cesse de courir à plat : |tx| = 0,55, soit 33° de
 * l'horizontale. Déduit de l'ellipse, donc juste pour la carte comme pour la
 * scène d'expédition, qui n'ont pas le même aplatissement. En deçà de ce seuil,
 * les créneaux cèdent la place à un parapet CONTINU (R2).
 */
function seuilPlat(geo: GeoMur): number {
  return Math.atan(0.6586 * (geo.ry / geo.rx))
}

/**
 * Contreforts : massifs saillants du nu extérieur - les SEULS accents verticaux
 * d'un arc de 830 px, sans quoi la courtine est un ruban. Trois chemins pour
 * tous les massifs de la couche.
 */
function contreforts(geo: GeoMur, angles: number[], H: number, larg: number, saillieP: number, k: number) {
  let face = ''
  let flanc = ''
  let lum = ''
  for (const a of angles) {
    const { tx, ty } = tangente(geo, a)
    const p = pt(geo, a)
    const o = saillie(geo, a, saillieP)
    const demi = (larg * Math.abs(tx)) / 2 + 1
    const hx = tx * demi
    const hy = ty * demi
    const yH = -H * k
    const gx = p.x - hx
    const gy = p.y - hy
    const dx2 = p.x + hx
    const dy2 = p.y + hy
    // le massif s'amincit en montant (fruit) et se termine par un chanfrein
    face +=
      `M${(gx + o.dx).toFixed(1)},${(gy + o.dy + 2).toFixed(1)}L${(dx2 + o.dx).toFixed(1)},${(dy2 + o.dy + 2).toFixed(1)}` +
      `L${(dx2 + o.dx * 0.55).toFixed(1)},${(dy2 + o.dy * 0.55 + yH + 3).toFixed(1)}L${(dx2 - hx * 0.3).toFixed(1)},${(dy2 - hy * 0.3 + yH).toFixed(1)}` +
      `L${(gx + hx * 0.3).toFixed(1)},${(gy + hy * 0.3 + yH).toFixed(1)}L${(gx + o.dx * 0.55).toFixed(1)},${(gy + o.dy * 0.55 + yH + 3).toFixed(1)}Z`
    // le flanc EST prend l'ombre, le liseré OUEST la lumière
    flanc +=
      `M${(dx2 + o.dx).toFixed(1)},${(dy2 + o.dy + 2).toFixed(1)}L${dx2.toFixed(1)},${(dy2 + 2).toFixed(1)}` +
      `L${(dx2 - hx * 0.3).toFixed(1)},${(dy2 - hy * 0.3 + yH).toFixed(1)}L${(dx2 + o.dx * 0.55).toFixed(1)},${(dy2 + o.dy * 0.55 + yH + 3).toFixed(1)}Z`
    lum +=
      `M${(gx + o.dx).toFixed(1)},${(gy + o.dy + 2).toFixed(1)}L${(gx + o.dx + 1.2).toFixed(1)},${(gy + o.dy + 2).toFixed(1)}` +
      `L${(gx + o.dx * 0.55 + 1.2).toFixed(1)},${(gy + o.dy * 0.55 + yH + 3).toFixed(1)}L${(gx + o.dx * 0.55).toFixed(1)},${(gy + o.dy * 0.55 + yH + 3).toFixed(1)}Z`
  }
  return { face, flanc, lum }
}

/**
 * Archères : de VRAIES embrasures, pas des tirets noirs. Ébrasement trapézoïdal
 * au nu extérieur, fente, linteau clair, seuil sombre, coulure de pluie.
 */
function archeres(geo: GeoMur, angles: number[], H: number) {
  let ebras = ''
  let fente = ''
  let linteau = ''
  let coulure = ''
  for (const a of angles) {
    const p = pt(geo, a)
    const yh = p.y - H * 0.62
    const h = H * 0.3
    ebras += `M${(p.x - 2.4).toFixed(1)},${(yh - 1).toFixed(1)}L${(p.x + 2.4).toFixed(1)},${(yh - 1).toFixed(1)}L${(p.x + 1.5).toFixed(1)},${(yh + h + 1.6).toFixed(1)}L${(p.x - 1.5).toFixed(1)},${(yh + h + 1.6).toFixed(1)}Z`
    fente += `M${(p.x - 0.8).toFixed(1)},${yh.toFixed(1)}h1.6v${h.toFixed(1)}h-1.6Z`
    // pas de noir : la fente est un trou, on la peint dans l'ombre du matériau
    linteau += `M${(p.x - 2.4).toFixed(1)},${(yh - 1).toFixed(1)}h4.8v0.9h-4.8Z`
    coulure += `M${(p.x - 1.2).toFixed(1)},${(yh + h + 1.6).toFixed(1)}L${(p.x + 1.2).toFixed(1)},${(yh + h + 1.6).toFixed(1)}L${(p.x + 0.7).toFixed(1)},${(yh + h + 1.6 + H * 0.2).toFixed(1)}L${(p.x - 0.7).toFixed(1)},${(yh + h + 1.6 + H * 0.2).toFixed(1)}Z`
  }
  return { ebras, fente, linteau, coulure }
}

/** étendard planté sur le parapet interne du chemin de ronde (niveau 4) */
function Etendard({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}>
      <line x1={0} y1={0.5} x2={0} y2={-16} stroke="#5d4a33" strokeWidth={1.4} />
      <line x1={-0.5} y1={0} x2={-0.5} y2={-15.6} stroke="#8a6b45" strokeWidth={0.5} opacity={0.8} />
      <circle cx={0} cy={-16.6} r={1.1} fill={PAL.or} />
      <path d="M0.7,-15.6 Q5.5,-17.4 10.5,-14.8 L8.8,-11.2 Q5,-13.4 0.7,-11.6 Z" fill={c} />
      <path d="M0.7,-15.6 Q5.5,-17.4 10.5,-14.8 L10,-13.7 Q5.4,-16.1 0.7,-14.3 Z" fill="#fbf3dd" opacity={0.28} />
    </g>
  )
}

/**
 * ═══════════════ LA TOUR, ENCASTRÉE DANS SA COURTINE ═══════════════
 *
 * Elle n'est plus un objet autonome de cote fixe posé sur l'ellipse : son
 * plancher EST le chemin de ronde de SON niveau de mur, son axe suit l'ellipse
 * de MI-ÉPAISSEUR (elle chevauche donc la courtine - saillie au-dehors,
 * empattement au-dedans, comme toute tour dont le diamètre dépasse l'épaisseur
 * du mur), et cinq pièces la soudent au parapet.
 *
 * `guet` : la tourelle de veille du niveau 4, même famille, deux tiers du
 * gabarit, flamme au sommet - on ne la confond pas avec une tour d'archers.
 */
function TourMur({
  geo,
  a,
  niveau,
  arriere,
  guet,
  span = 1,
}: {
  geo: GeoMur
  a: number
  niveau: number
  arriere: boolean
  guet?: boolean
  span?: number
}) {
  const c = cote(niveau)
  const ct = COTES_TOUR[Math.max(0, Math.min(4, niveau))]
  if (!ct) return null
  const k = komp(geo)
  const D = guet ? ct.D * 0.74 : ct.D
  const R = D / 2
  const rb = R * k
  const parT = ct.par
  // l'axe de la tour suit la MI-ÉPAISSEUR du mur : c'est ce qui l'encastre
  const C = pt(dedans(geo, c.W / 2), a)
  const plancher = -c.H
  const crete = plancher - parT
  const { tx, ty } = tangente(geo, a)
  // point de crête de la courtine au droit de la tour (repère monde)
  const Pm = pt(geo, a)
  const yRonde = Pm.y - c.H
  const n4 = niveau >= 4
  const tonPierre = n4 ? '#7d7053' : '#6f6349'
  const bras = R + 7
  const mw = (D + 2.8) / 4 - 1.6
  // le pas d'arc de l'ombre portée sur la face, exprimé en angle
  const dsda = Math.hypot(geo.rx * Math.sin(a), geo.ry * Math.cos(a)) || 1
  const aOmb = a - (0.85 * D) / dsda
  const Po = pt(geo, aOmb)
  return (
    <g>
      {/* ── les pièces de RACCORD, en repère monde, alignées sur la tangente ── */}
      {/* 4. OMBRE DE LA TOUR SUR LA FACE DU MUR : elle suit la face, sinon la
          tour reste un autocollant (peinte, jamais floutée) */}
      {!arriere && (
        <path
          d={
            `M${(Pm.x + tx * R * 0.9).toFixed(1)},${(Pm.y + ty * R * 0.9 + 1).toFixed(1)}` +
            `L${(Pm.x + tx * R * 0.9).toFixed(1)},${(yRonde + ty * R * 0.9).toFixed(1)}` +
            `L${Po.x.toFixed(1)},${(Po.y - c.H * 0.72).toFixed(1)}L${Po.x.toFixed(1)},${(Po.y + 1).toFixed(1)}Z`
          }
          fill={PAL.ombrePortee}
          opacity={0.15}
        />
      )}
      {/* 2. RETOURS : la tranche du parapet coupé, de part et d'autre du fût */}
      {[-1, 1].map((sg) => {
        const x = Pm.x + tx * sg * (R + 0.5)
        const y = yRonde + ty * sg * (R + 0.5)
        return (
          <path
            key={sg}
            d={`M${x.toFixed(1)},${y.toFixed(1)}L${(x + tx * sg * 2.8).toFixed(1)},${(y + ty * sg * 2.8).toFixed(1)}L${(x + tx * sg * 2.8).toFixed(1)},${(y + ty * sg * 2.8 - c.par).toFixed(1)}L${x.toFixed(1)},${(y - c.par).toFixed(1)}Z`}
            fill={tonPierre}
          />
        )
      })}
      {/* 3. LARMIER DE JONCTION : la bande claire du plancher court sur le mur
          et passe DEVANT le fût - c'est elle qui soude les deux volumes */}
      <path
        d={`M${(Pm.x - tx * bras).toFixed(1)},${(yRonde - ty * bras).toFixed(1)}L${(Pm.x + tx * bras).toFixed(1)},${(yRonde + ty * bras).toFixed(1)}L${(Pm.x + tx * bras).toFixed(1)},${(yRonde + ty * bras + 1.6).toFixed(1)}L${(Pm.x - tx * bras).toFixed(1)},${(yRonde - ty * bras + 1.6).toFixed(1)}Z`}
        fill="#e6dfc9"
        opacity={0.5}
      />

      <g transform={`translate(${C.x.toFixed(1)},${C.y.toFixed(1)})`}>
        {/* ombre au sol : seulement au-dehors (couche avant) - au nord elle
            tomberait dans le village */}
        {!arriere && (
          <ellipse cx={R * 0.6} cy={rb * 0.8} rx={R * 1.15} ry={rb * 1.1} fill={PAL.ombrePortee} opacity={0.17} filter="url(#a-flou1)" />
        )}
        <AOBase rx={R * 0.95} ry={rb * 0.8} cy={rb * 0.4} />
        {/* fût à fruit léger. Le voile de TON accorde la tour à SA portion de
            courtine : sans lui, le cylindre reste un silo de plâtre planté à
            côté d'un mur de pierre, quelle que soit la géométrie. */}
        <path
          d={`M${(-R).toFixed(1)},${plancher}L${(-R * 1.07).toFixed(1)},0Q0,${(rb * 2.1).toFixed(1)} ${(R * 1.07).toFixed(1)},0L${R.toFixed(1)},${plancher}Z`}
          fill="url(#a-cyl-pierre)"
        />
        <path
          d={`M${(-R).toFixed(1)},${plancher}L${(-R * 1.07).toFixed(1)},0Q0,${(rb * 2.1).toFixed(1)} ${(R * 1.07).toFixed(1)},0L${R.toFixed(1)},${plancher}Z`}
          fill={(n4 ? TONS_TAILLE : TONS_SEC)[Math.min(4, Math.max(0, Math.round((1 + Math.cos(a)) * 2)))]}
          opacity={0.34}
        />
        {/* APPAREIL du fût : assises courbes et joints décalés, sinon le fût est
            un silo de plâtre à côté d'un mur de pierre */}
        {(() => {
          const rangs = Math.max(3, Math.round(c.H / (c.hAssise + 0.6)))
          const hA = c.H / rangs
          let joints = ''
          let lits = ''
          const rnd = alea(niveau * 7 + Math.round(a * 40))
          for (let r = 1; r < rangs; r++) {
            const y = plancher + r * hA
            const rr = R * (1 + 0.07 * (r / rangs))
            lits += `M${(-rr).toFixed(1)},${y.toFixed(1)}Q0,${(y + rb * 0.62).toFixed(1)} ${rr.toFixed(1)},${y.toFixed(1)}`
            const n = 3
            for (let i = 0; i < n; i++) {
              const f = (i + (r % 2 ? 0.5 : 0)) / n - 0.5
              const jx = f * 2 * rr * 0.92
              const jy = y + rb * 0.62 * (1 - (jx / rr) * (jx / rr)) * (rnd() * 0.1 + 0.95)
              joints += `M${jx.toFixed(1)},${jy.toFixed(1)}L${jx.toFixed(1)},${(jy - hA + 0.6).toFixed(1)}`
            }
          }
          return (
            <>
              <path d={lits} stroke={PAL.pierreJoint} strokeWidth={0.7} fill="none" opacity={0.4} />
              <path d={joints} stroke={PAL.pierreJoint} strokeWidth={0.6} fill="none" opacity={0.3} />
            </>
          )
        })()}
        {/* plinthe évasée au pied */}
        <path
          d={`M${(-R * 1.07).toFixed(1)},-3.4L${(-R * 1.14).toFixed(1)},0Q0,${(rb * 2.24).toFixed(1)} ${(R * 1.14).toFixed(1)},0L${(R * 1.07).toFixed(1)},-3.4Q0,${(rb * 1.6 - 3.4).toFixed(1)} ${(-R * 1.07).toFixed(1)},-3.4Z`}
          fill={tonPierre}
          opacity={0.4}
        />
        {/* 5. ACCÈS - au-dehors une archère alignée sur celles du mur ;
            au-dedans la porte du chemin de ronde et sa volée de marches */}
        {!arriere ? (
          <>
            <path d={`M-2.4,${(plancher * 0.62 - 1.2).toFixed(1)}h4.8l-1,${(c.H * 0.3 + 3).toFixed(1)}h-2.8Z`} fill="#8d8269" opacity={0.85} />
            <rect x={-0.8} y={plancher * 0.62} width={1.6} height={c.H * 0.3} fill="#3a2e1c" />
            <rect x={-2.4} y={plancher * 0.62 - 1.2} width={4.8} height={0.9} fill="#efe8d6" opacity={0.75} />
          </>
        ) : (
          <>
            {/* la volée de marches qui descend sur le chemin de ronde */}
            <path d={`M${(-R - 1).toFixed(1)},${(plancher + 1).toFixed(1)}L${(-R - 1 - 5 * 5).toFixed(1)},${(plancher + 1 + 5 * 3.1).toFixed(1)}L${(-R - 1 - 5 * 5).toFixed(1)},${(plancher + 4.4 + 5 * 3.1).toFixed(1)}L${(-R - 1).toFixed(1)},${(plancher + 4.4).toFixed(1)}Z`} fill={PAL.ombrePortee} opacity={0.2} />
            {(() => {
              let m = ''
              let l = ''
              for (let i = 0; i < 5; i++) {
                const x = -R - 1 - i * 5
                const y = plancher + 1 + i * 3.1
                m += `M${(x - 6.4).toFixed(1)},${y.toFixed(1)}h6.4v2.4h-6.4Z`
                l += `M${(x - 6.4).toFixed(1)},${y.toFixed(1)}h6.4v0.8h-6.4Z`
              }
              return (
                <>
                  <path d={m} fill="#bcb29b" />
                  <path d={l} fill="#ddd5c2" />
                </>
              )
            })()}
            {/* la porte du chemin de ronde, sur le flanc ouest */}
            <path d={`M${(-R * 0.78).toFixed(1)},${(plancher + 0.5).toFixed(1)}h4.4v-6.4h-4.4Z`} fill="url(#mur-antre)" />
            <rect x={-R * 0.78} y={plancher - 6.6} width={4.4} height={0.9} fill="#d8cfb8" opacity={0.75} />
          </>
        )}
        {/* encorbellement du parapet + ombre portée sous le débord */}
        <path
          d={
            `M${(-R - 1.5).toFixed(1)},${(plancher - 3.4).toFixed(1)}Q0,${(plancher - 3.4 + rb * 1.7).toFixed(1)} ${(R + 1.5).toFixed(1)},${(plancher - 3.4).toFixed(1)}` +
            `L${(R + 1.5).toFixed(1)},${(plancher - 0.6).toFixed(1)}Q0,${(plancher - 0.6 + rb * 1.7).toFixed(1)} ${(-R - 1.5).toFixed(1)},${(plancher - 0.6).toFixed(1)}Z`
          }
          fill="url(#a-cyl-pierre)"
        />
        <path
          d={`M${(-R - 1.2).toFixed(1)},${(plancher - 0.6).toFixed(1)}Q0,${(plancher - 0.6 + rb * 1.7).toFixed(1)} ${(R + 1.2).toFixed(1)},${(plancher - 0.6).toFixed(1)}`}
          stroke={PAL.ombrePortee}
          strokeWidth={1.4}
          fill="none"
          opacity={0.26}
        />
        {/*
          LA COURONNE. Un cylindre vu d'en haut : les merlons du FOND sont plus
          hauts à l'écran de rb, ceux du DEVANT plus bas de rb, et le plancher
          se lit entre les deux. Les dessiner tous à la même ordonnée écrasait la
          plate-forme en un filet et faisait flotter l'archer.
        */}
        {[-0.5, 0, 0.5].map((f) => (
          <rect
            key={f}
            x={R * f - D * 0.11}
            y={crete - rb * Math.sqrt(Math.max(0, 1 - f * f)) * 0.86}
            width={D * 0.22}
            height={parT * 0.9}
            fill="#a1977d"
          />
        ))}
        {/* LE COURONNEMENT, posé AVANT la plate-forme : il se lit dans l'enceinte
            du parapet, et c'est lui - non la hauteur - qui fait l'accent */}
        {niveau === 2 && (
          <>
            <path d={`M0,${(crete - ct.toit - 2).toFixed(1)}L${(R * 0.92).toFixed(1)},${(crete + 1).toFixed(1)}L${(-R * 0.92).toFixed(1)},${(crete + 1).toFixed(1)}Z`} fill={PAL.chaumeOmbre} />
            <path d={`M0,${(crete - ct.toit - 2).toFixed(1)}L${(-R * 0.92).toFixed(1)},${(crete + 1).toFixed(1)}L${(-R * 0.16).toFixed(1)},${(crete + 1).toFixed(1)}Z`} fill={PAL.chaumeLit} />
          </>
        )}
        {niveau === 3 && (
          <>
            <path d={`M0,${(crete - ct.toit - 1).toFixed(1)}L${(R * 0.9).toFixed(1)},${(crete + 1).toFixed(1)}L${(-R * 0.9).toFixed(1)},${(crete + 1).toFixed(1)}Z`} fill={PAL.boisMi} />
            <path d={`M0,${(crete - ct.toit - 1).toFixed(1)}L${(-R * 0.9).toFixed(1)},${(crete + 1).toFixed(1)}L${(-R * 0.2).toFixed(1)},${(crete + 1).toFixed(1)}Z`} fill={PAL.boisLit} />
            <path d={`M0,${(crete - ct.toit - 1).toFixed(1)}L${(-R * 0.5).toFixed(1)},${(crete - ct.toit * 0.4).toFixed(1)}`} stroke="#c8a878" strokeWidth={0.9} fill="none" />
          </>
        )}
        {niveau >= 4 && !guet && (
          <>
            <path d={`M0,${(crete - ct.toit - 2).toFixed(1)}L${(R * 0.88).toFixed(1)},${(crete + 1).toFixed(1)}L${(-R * 0.88).toFixed(1)},${(crete + 1).toFixed(1)}Z`} fill={PAL.toitOmbre} />
            <path d={`M0,${(crete - ct.toit - 2).toFixed(1)}L${(-R * 0.88).toFixed(1)},${(crete + 1).toFixed(1)}L${(-R * 0.12).toFixed(1)},${(crete + 1).toFixed(1)}Z`} fill={PAL.toitMi} />
            <path d={`M0,${(crete - ct.toit - 2).toFixed(1)}L${(-R * 0.5).toFixed(1)},${(crete - ct.toit * 0.42).toFixed(1)}`} stroke={PAL.toitArete} strokeWidth={0.9} fill="none" />
            <circle cx={0} cy={crete - ct.toit - 2.4} r={0.9} fill={PAL.or} />
          </>
        )}
        {/* plate-forme : margelle claire, sol en demi-teinte */}
        <ellipse cx={0} cy={plancher - 1} rx={R + 1.4} ry={rb} fill="#e2dbc7" />
        <ellipse cx={R * 0.08} cy={plancher - 0.6} rx={R * 0.8} ry={rb * 0.74} fill="#c9bfa7" />
        {/* l'archer de faction, campé derrière son merlon */}
        {!guet && span >= 1 && (
          <g transform={`translate(${(R * 0.12).toFixed(1)},${(plancher - rb * 0.3).toFixed(1)})`}>
            <path d="M-2.2,0 L-1.5,-6 L1.5,-6 L2.2,0 Z" fill="#4a6a5a" />
            <circle cx={0} cy={-7.6} r={2.1} fill={PAL.peau} />
            <path d="M-2.1,-8 A2.1,2.1 0 0 1 2.1,-8" fill="#8f8a7c" />
            <path d="M3.2,-8.5 Q6.5,-4.5 3.2,-0.5" stroke="#7a5a35" strokeWidth={1.1} fill="none" />
            <line x1={3.2} y1={-8.5} x2={3.2} y2={-0.5} stroke="#e0d9c8" strokeWidth={0.5} />
          </g>
        )}
        {/* merlons AVANT : plus bas de rb, de l'ouest éclairé à l'est ombré */}
        {[-0.72, -0.24, 0.24, 0.72].map((f, i) => (
          <g key={f}>
            <rect
              x={R * f - mw / 2}
              y={crete + rb * Math.sqrt(Math.max(0, 1 - f * f)) * 0.86}
              width={mw}
              height={parT}
              fill={['#ddd5c1', '#d3cab5', '#c2b8a0', '#a89d83'][i]}
            />
            <rect x={R * f - mw / 2} y={crete + rb * Math.sqrt(Math.max(0, 1 - f * f)) * 0.86} width={mw} height={1} fill="#efe8d5" />
          </g>
        ))}
        {/* fanion (tour d'archers) ou flamme de veille (tourelle de guet) */}
        {guet ? (
          <>
            {/* le brasier de veille : trépied, braise, et la flamme qui bat */}
            <path d={`M-3,${(crete + 0.4).toFixed(1)}h6l-1,2.8h-4Z`} fill="#6a5228" />
            <path d={`M-3,${(crete + 0.4).toFixed(1)}h6v1h-6Z`} fill="#8a6b2e" />
            <path d={`M0,${(crete - 6.4).toFixed(1)}Q2.8,${(crete - 2.6).toFixed(1)} 2,${(crete + 0.2).toFixed(1)}Q0,${(crete - 1.4).toFixed(1)} -2,${(crete + 0.2).toFixed(1)}Q-2.6,${(crete - 3).toFixed(1)} 0,${(crete - 6.4).toFixed(1)}Z`} fill="#e0872f">
              <animate attributeName="opacity" values="0.85;1;0.85" dur="1.2s" repeatCount="indefinite" />
            </path>
            <path d={`M0,${(crete - 4.4).toFixed(1)}Q1.5,${(crete - 2).toFixed(1)} 0.9,${(crete - 0.2).toFixed(1)}Q0,${(crete - 1).toFixed(1)} -0.9,${(crete - 0.2).toFixed(1)}Q-1.4,${(crete - 2.2).toFixed(1)} 0,${(crete - 4.4).toFixed(1)}Z`} fill="#fbe08d" />
          </>
        ) : (
          <>
            <line x1={-R * 0.78} y1={crete + 1} x2={-R * 0.78} y2={crete - ct.toit - 5} stroke="#5d4a33" strokeWidth={1.3} />
            <path
              d={`M${(-R * 0.78).toFixed(1)},${(crete - ct.toit - 5).toFixed(1)}L${(-R * 0.78 + 7.5).toFixed(1)},${(crete - ct.toit - 2.8).toFixed(1)}L${(-R * 0.78).toFixed(1)},${(crete - ct.toit - 0.6).toFixed(1)}Z`}
              fill="#c9a441"
            />
          </>
        )}
      </g>
    </g>
  )
}

/**
 * Pan de mur effondré ailleurs qu'à la porte. Trois plans se lisent : la trouée
 * d'ombre au travers du mur - avec l'ÉPAISSEUR du blocage et le dallage tranché
 * en porte-à-faux -, le talus de pierres qui la comble à demi, puis les blocs et
 * les poutres du chemin de ronde répandus au-dehors.
 */
function Decombres({
  geo,
  angle,
  crete,
  ep,
  arriere,
  bois,
}: {
  geo: GeoMur
  angle: number
  crete: number
  ep: number
  arriere?: boolean
  bois?: boolean
}) {
  const T = bois
    ? { assise: '#59431f', assiseLit: '#6f5636', face: '#7d5e39', dessus: '#a8845d', flanc: '#5c4227', pied: '#4a3519', lumps: '#6a4e2d', lumpsLit: '#8b6a40', poudre: '#a89066' }
    : { assise: '#7e7768', assiseLit: '#928a78', face: '#a09884', dessus: '#c6bda6', flanc: '#7c7565', pied: '#6d6657', lumps: '#8f8878', lumpsLit: '#aea695', poudre: '#cfc7b0' }
  const demi = 0.1
  const g = pt(geo, angle - demi)
  const m = pt(geo, angle)
  const d = pt(geo, angle + demi)
  // le tas roule au-dehors sur l'arc avant ; au nord, c'est le versant du
  // DEDANS qu'on voit, et les pierres tombées dans le village
  const sens = arriere ? -1 : 1
  const ox = Math.cos(angle) * sens
  const oy = Math.sin(angle) * sens
  const h = crete
  const k = Math.max(0.62, Math.min(1.1, h / 33))
  const larg = Math.hypot(d.x - g.x, d.y - g.y) / 2
  // le décalé écran de l'épaisseur du mur : c'est ce qui donne à voir la TRANCHE
  const u = saillie(geo, angle, -ep)

  /** point sur la lèvre supérieure de la cassure, t ∈ [0,1] le long de l'arc */
  const lip = (t: number, frac: number) => ({
    x: g.x + (d.x - g.x) * t,
    y: g.y + (d.y - g.y) * t - h * frac,
  })
  const dents = [lip(0, 0.99), lip(0.13, 0.7), lip(0.26, 0.8), lip(0.41, 0.52), lip(0.58, 0.63), lip(0.74, 0.46), lip(0.88, 0.74), lip(1, 0.97)]
  const troue =
    `M${g.x.toFixed(1)},${(g.y + 2).toFixed(1)}` +
    dents.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('') +
    `L${d.x.toFixed(1)},${(d.y + 2).toFixed(1)}Z`
  // la face du fond : le nu opposé du mur, en retrait de son épaisseur
  const fond =
    `M${(g.x + u.dx).toFixed(1)},${(g.y + u.dy + 2).toFixed(1)}` +
    dents.map((p) => `L${(p.x + u.dx).toFixed(1)},${(p.y + u.dy + 1.5).toFixed(1)}`).join('') +
    `L${(d.x + u.dx).toFixed(1)},${(d.y + u.dy + 2).toFixed(1)}Z`

  const BLOCS: [number, number, number, number, number][] = [
    [-0.62, 0.02, 0.34, 0.2, -13],
    [0.02, -0.1, 0.42, 0.24, 7],
    [0.6, 0.05, 0.31, 0.18, -6],
    [-0.2, 0.17, 0.37, 0.17, 3],
    [0.98, 0.16, 0.24, 0.14, 12],
  ]
  const PIERRES: [number, number, number][] = [
    [-0.95, 0.12, 0.1], [-0.36, 0.13, 0.12], [0.3, 0.12, 0.1], [0.74, 0.13, 0.09],
    [-0.72, -0.07, 0.09], [-0.06, -0.26, 0.1], [0.4, -0.13, 0.08], [1.16, 0.17, 0.07],
  ]
  return (
    <g>
      {/* l'ombre du tas est posée AVANT la trouée : elle ne doit pas la barbouiller */}
      <ellipse
        cx={m.x + ox * 4 + larg * 0.14}
        cy={m.y + oy * 4 + h * 0.18}
        rx={larg * 1.12}
        ry={h * 0.19}
        fill={PAL.ombrePortee}
        opacity={0.2}
        filter="url(#a-flou2)"
      />
      {/* LA TROUÉE EN TROIS PLANS - c'est ce qui manquait : un rectangle noir
          plat ne disait ni l'épaisseur du mur, ni ce qu'on voit au travers.
          1. l'ombre de l'ébrasement, 2. le NU OPPOSÉ du mur au fond,
          3. les deux joues de blocage rompu sur les côtés. */}
      <path d={troue} fill="#2a2013" />
      <path d={fond} fill={bois ? '#5c4227' : '#8d8269'} />
      <path d={fond} fill={PAL.ombrePortee} opacity={0.28} />
      {!bois && (
        <>
          {/* joue OUEST : elle prend le jour ; joue EST : elle est dans l'ombre */}
          <path
            d={
              `M${g.x.toFixed(1)},${(g.y + 2).toFixed(1)}L${dents[0].x.toFixed(1)},${dents[0].y.toFixed(1)}` +
              `L${(dents[0].x + u.dx).toFixed(1)},${(dents[0].y + u.dy + 1.5).toFixed(1)}L${(g.x + u.dx).toFixed(1)},${(g.y + u.dy + 2).toFixed(1)}Z`
            }
            fill="#c0b69c"
          />
          <path
            d={
              `M${d.x.toFixed(1)},${(d.y + 2).toFixed(1)}L${dents[7].x.toFixed(1)},${dents[7].y.toFixed(1)}` +
              `L${(dents[7].x + u.dx).toFixed(1)},${(dents[7].y + u.dy + 1.5).toFixed(1)}L${(d.x + u.dx).toFixed(1)},${(d.y + u.dy + 2).toFixed(1)}Z`
            }
            fill="#6f6349"
          />
          {/* le DALLAGE TRANCHÉ : la tranche du mur court tout le long de la
              lèvre - c'est elle qui dit l'épaisseur, et elle ne peut pas
              flotter comme le faisaient des dalles isolées */}
          <path
            d={
              dents.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('') +
              dents
                .slice()
                .reverse()
                .map((p) => `L${(p.x + u.dx).toFixed(1)},${(p.y + u.dy + 1).toFixed(1)}`)
                .join('') +
              'Z'
            }
            fill="#cbc1a9"
          />
        </>
      )}
      {/* lèvre de cassure : matière fraîche au soleil, joint sombre côté ombre */}
      <path
        d={`M${g.x.toFixed(1)},${(g.y + 1).toFixed(1)}` + dents.slice(0, 5).map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('')}
        stroke={bois ? '#d6b788' : '#e6dfcb'}
        strokeWidth={1.6}
        fill="none"
        opacity={0.75}
      />
      <path
        d={dents.slice(4).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('') + `L${d.x.toFixed(1)},${(d.y + 1).toFixed(1)}`}
        stroke="#463b2c"
        strokeWidth={1.6}
        fill="none"
        opacity={0.6}
      />
      {/* couronnement descellé, resté en travers au-dessus du trou */}
      <g transform={`translate(${m.x.toFixed(1)},${(m.y - h - 1).toFixed(1)}) scale(${k.toFixed(2)})`}>
        <g transform="rotate(-17)">
          <rect x={-14} y={-4.4} width={9} height={4.6} fill={T.face} />
          <rect x={-14} y={-4.4} width={9} height={1.1} fill={T.dessus} />
        </g>
        <g transform="rotate(24)">
          <rect x={6} y={-3.6} width={8} height={4.2} fill={T.flanc} />
          <rect x={6} y={-3.6} width={8} height={1} fill={T.dessus} />
        </g>
      </g>
      {/* le tas : assise tassée, gros débris, menu fretin entre eux */}
      <g transform={`translate(${(m.x + ox * 4).toFixed(1)},${(m.y + oy * 4).toFixed(1)})`}>
        <ellipse cx={0} cy={h * 0.12} rx={larg * 0.98} ry={h * 0.15} fill={T.assise} />
        <ellipse cx={-larg * 0.12} cy={h * 0.09} rx={larg * 0.72} ry={h * 0.11} fill={T.assiseLit} />
        {BLOCS.map(([fx, fy, fw, fh, rot]) => {
          const w = fw * h * (bois ? 1.5 : 1)
          const hb = fh * h * (bois ? 0.55 : 1)
          return (
            <g key={`b${fx}-${fy}`} transform={`translate(${(fx * larg).toFixed(1)},${(fy * h).toFixed(1)}) rotate(${rot})`}>
              <rect x={-w / 2} y={-hb / 2} width={w} height={hb} fill={T.face} />
              <rect x={-w / 2} y={-hb / 2} width={w} height={hb * 0.26} fill={T.dessus} />
              <rect x={w / 2 - w * 0.16} y={-hb / 2} width={w * 0.16} height={hb} fill={T.flanc} />
            </g>
          )
        })}
        {PIERRES.map(([fx, fy, fr]) => {
          const bx = fx * larg
          const by = fy * h
          const r = fr * h
          return (
            <g key={`p${fx}-${fy}`}>
              <ellipse cx={bx} cy={by} rx={r} ry={r * 0.82} fill={T.lumps} />
              <ellipse cx={bx - r * 0.26} cy={by - r * 0.3} rx={r * 0.56} ry={r * 0.4} fill={T.lumpsLit} />
            </g>
          )
        })}
        {/* poutres du chemin de ronde tombées en travers, éclat de bois clair */}
        <g transform={`scale(${k.toFixed(2)})`}>
          <path d="M-22,-2 L2,-8 L2.8,-5.4 L-21.4,0.6 Z" fill="#6f5233" />
          <path d="M-22,-2 L2,-8 L2.4,-6.7 L-21.7,-0.7 Z" fill="#8f6d44" />
          <path d="M9,4 L27,-1 L27.6,1.2 L9.6,6.2 Z" fill="#5f462d" />
          <path d="M27,-1 L29.6,-0.2 L27.6,1.2 Z" fill="#b08f5e" />
        </g>
        <ellipse cx={larg * 0.06} cy={h * 0.26} rx={larg * 1.05} ry={h * 0.12} fill={T.poudre} opacity={0.28} />
      </g>
    </g>
  )
}

/** un pan de mur rectangulaire appareillé : 4 tons, 2 chemins de modelé */
function blocsRect(x: number, y: number, w: number, h: number, hA: number, seed: number, tons: string[]) {
  const rnd = alea(seed)
  const paths = Array.from({ length: tons.length }, () => '')
  const rangs = Math.max(1, Math.round(h / hA))
  for (let r = 0; r < rangs; r++) {
    const yr = y + h - (r + 1) * hA
    let cx = x + (r % 2 ? -hA * 0.4 : 0)
    while (cx < x + w) {
      const bw = Math.min(hA * (1.7 + rnd() * 0.9), x + w - cx)
      if (bw > 1.4) {
        const k = Math.min(tons.length - 1, Math.max(0, Math.round((rnd() * (tons.length - 1) + ((cx - x) / w) * (tons.length - 1)) / 2)))
        paths[k] += `M${cx.toFixed(1)},${yr.toFixed(1)}h${(bw - 0.8).toFixed(1)}v${(hA - 0.8).toFixed(1)}h-${(bw - 0.8).toFixed(1)}Z`
      }
      cx += bw
    }
  }
  return paths
}

/**
 * ═══════════════════ LA PORTE, BÂTIE SUR SES DEUX BOUTS ═══════════════════
 *
 * L'enceinte n'arrive pas à la porte en un point : elle y arrive par DEUX bouts,
 * pt(geo,−0,1) et pt(geo,+0,1), séparés de 2·ry·sin(0,1) px en hauteur (38,9 px
 * sur la carte). Une porte symétrique posée à pt(geo,0) ne pouvait donc PAS se
 * raccorder - d'où le ruban du mur qui traversait le porche en diagonale.
 *
 * Ici chaque JOUE est bâtie sur SON bout d'arc, avec sa propre cote de pied et
 * d'arase, et l'escalier de liaison rachète la différence sur le flanc interne.
 * Ce n'est plus un défaut : c'est la pente du terrain, qui est la vérité de la
 * vue oblique.
 */
function Porte({ geo, niveau, breche }: { geo: GeoMur; niveau: number; breche: boolean }) {
  if (niveau <= 0) return null
  const c = cote(niveau)
  const n4 = niveau >= 4
  const N = pt(geo, -PORTE)
  const S = pt(geo, PORTE)
  const M = pt(geo, 0)
  const crete = c.H + c.par
  const ep = c.W * komp(geo)

  if (breche) {
    // les deux joues tiennent encore, le passage est comblé d'éboulis
    return (
      <g>
        {[N, S].map((P, i) => (
          <g key={i}>
            <path
              d={`M${(P.x - 11).toFixed(1)},${(P.y + 2).toFixed(1)}h22v-${(crete * 0.55).toFixed(1)}l-6,-4l-10,3l-6,-5Z`}
              fill={n4 ? 'url(#mur-face4)' : 'url(#mur-face)'}
            />
            <path d={`M${(P.x - 11).toFixed(1)},${(P.y + 2 - crete * 0.55).toFixed(1)}l6,5l10,-3l6,4l0,1.6l-6,-3.4l-10,3l-6,-4.6Z`} fill="#e6dfcb" opacity={0.6} />
          </g>
        ))}
        <g transform={`translate(${M.x.toFixed(1)},${M.y.toFixed(1)})`}>
          <ellipse cx={3} cy={7} rx={23} ry={7.5} fill={PAL.ombrePortee} opacity={0.18} filter="url(#a-flou2)" />
          <ellipse cx={0} cy={6} rx={20} ry={7} fill="#8f887a" />
          <ellipse cx={-2} cy={5} rx={14} ry={5} fill="#9c9484" />
          {[
            { bx: -9, by: 2, r: 5 },
            { bx: 6, by: 4, r: 6 },
            { bx: 0, by: -2, r: 4 },
            { bx: 12, by: 0, r: 3.2 },
            { bx: -16, by: 4, r: 3 },
          ].map((b) => (
            <g key={`${b.bx}${b.by}`}>
              <circle cx={b.bx} cy={b.by} r={b.r} fill="#9d9585" />
              <ellipse cx={b.bx - b.r * 0.3} cy={b.by - b.r * 0.38} rx={b.r * 0.62} ry={b.r * 0.5} fill="#bfb7a5" />
            </g>
          ))}
          <g transform="rotate(-35 -13 -4)">
            <rect x={-16} y={-14} width={6} height={20} fill="#6f5233" />
            <rect x={-16} y={-14} width={1.5} height={20} fill="#8f6d44" />
            <path d="M-16,-14 L-13,-19 L-11.5,-14 Z" fill="#b08f5e" />
          </g>
          <g transform="rotate(28 13 -3)">
            <rect x={10} y={-12} width={6} height={18} fill="#6f5233" />
            <rect x={10} y={-12} width={1.4} height={18} fill="#8f6d44" />
            <path d="M10,-12 L13.5,-16.5 L16,-12 Z" fill="#b08f5e" />
          </g>
        </g>
      </g>
    )
  }

  // ── niveaux 1 et 2 : les deux bouts d'arc portent leurs jambages, et le
  //    CADRE du passage est porté en saillie vers le dehors. Les deux bouts sont
  //    à la MÊME abscisse (cos(−0,1) = cos(+0,1)) : un « linteau en biais » qui
  //    les joindrait serait un poteau vertical, pas un linteau. C'est donc une
  //    ÉCHARPE qui fait la liaison, et le cadre qui porte le vantail. ──────────
  if (niveau <= 2) {
    const bois = niveau === 1
    const larg = bois ? 7 : 11
    const jx = M.x - 7
    const hN = N.y - crete + (bois ? 3 : 1)
    const hS = S.y - crete + (bois ? 3 : 1)
    const px = M.x + 9
    const solP = M.y + 2
    const hautP = M.y - (c.H + 5)
    const dem = bois ? 9 : 10
    return (
      <g>
        <ellipse cx={px + 3} cy={solP + 4} rx={dem + 9} ry={6} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou1)" />
        {/* les deux jambages, chacun planté sur SON bout d'arc, à SA hauteur */}
        {[
          { P: N, hh: hN, ton: bois ? '#6a4c2c' : '#a89d83', avant: false },
          { P: S, hh: hS, ton: bois ? '#7a5b37' : '#b7ac93', avant: true },
        ].map(({ P, hh, ton, avant }, i) =>
          bois ? (
            <g key={i}>
              <path d={`M${(jx - larg / 2).toFixed(1)},${(P.y + 2).toFixed(1)}L${(jx - larg / 2).toFixed(1)},${(hh - 3).toFixed(1)}L${jx.toFixed(1)},${(hh - 6).toFixed(1)}L${(jx + larg / 2).toFixed(1)},${(hh - 3).toFixed(1)}L${(jx + larg / 2).toFixed(1)},${(P.y + 2).toFixed(1)}Z`} fill={ton} />
              <path d={`M${(jx - larg / 2).toFixed(1)},${(P.y + 2).toFixed(1)}L${(jx - larg / 2).toFixed(1)},${(hh - 3).toFixed(1)}L${(jx - larg / 2 + 2.2).toFixed(1)},${(hh - 4).toFixed(1)}L${(jx - larg / 2 + 2.2).toFixed(1)},${(P.y + 2).toFixed(1)}Z`} fill="#9a744a" opacity={0.9} />
              <path d={`M${(jx - 2.2).toFixed(1)},${(hh - 3.4).toFixed(1)}L${jx.toFixed(1)},${(hh - 6).toFixed(1)}L${(jx + 2.2).toFixed(1)},${(hh - 3.4).toFixed(1)}Z`} fill="#d6b788" />
              {!avant && <path d={`M${(jx - larg / 2).toFixed(1)},${(P.y + 2).toFixed(1)}L${(jx - larg / 2).toFixed(1)},${(hh - 3).toFixed(1)}L${jx.toFixed(1)},${(hh - 6).toFixed(1)}L${(jx + larg / 2).toFixed(1)},${(hh - 3).toFixed(1)}L${(jx + larg / 2).toFixed(1)},${(P.y + 2).toFixed(1)}Z`} fill="#2f2110" opacity={0.18} />}
            </g>
          ) : (
            <g key={i}>
              <rect x={jx - larg / 2} y={hh} width={larg} height={P.y + 2 - hh} fill={ton} />
              {blocsRect(jx - larg / 2, hh, larg, P.y + 2 - hh, 4.6, 30 + i, TONS_SEC).map((d, j) => (
                <path key={j} d={d} fill={TONS_SEC[j]} />
              ))}
              <rect x={jx + larg / 2 - 2} y={hh} width={2} height={P.y + 2 - hh} fill={PAL.ombrePortee} opacity={0.18} />
              <rect x={jx - larg / 2 - 1.4} y={hh - 2.4} width={larg + 2.8} height={2.8} fill="#ddd5c1" />
              {!avant && <rect x={jx - larg / 2 - 1.4} y={hh - 2.4} width={larg + 2.8} height={P.y + 4.4 - hh} fill="#5c5238" opacity={0.16} />}
            </g>
          ),
        )}
        {/* l'ÉCHARPE : la pièce oblique qui rattrape les 39 px entre les deux
            bouts d'arc et vient s'appuyer sur le cadre du passage */}
        <path
          d={`M${(jx + larg / 2 - 1).toFixed(1)},${(hN - 1).toFixed(1)}L${(px + dem).toFixed(1)},${(hautP - 1).toFixed(1)}L${(px + dem).toFixed(1)},${(hautP + 2.4).toFixed(1)}L${(jx + larg / 2 - 1).toFixed(1)},${(hN + 2.4).toFixed(1)}Z`}
          fill="#5c4227"
        />
        <path
          d={`M${(jx + larg / 2 - 1).toFixed(1)},${(hN - 1).toFixed(1)}L${(px + dem).toFixed(1)},${(hautP - 1).toFixed(1)}L${(px + dem).toFixed(1)},${(hautP - 0.1).toFixed(1)}L${(jx + larg / 2 - 1).toFixed(1)},${(hN + 0.9).toFixed(1)}Z`}
          fill="#96713f"
        />
        {/* LE CADRE DU PASSAGE, en saillie vers le dehors : deux poteaux, un
            linteau, et le vantail accroché dessous */}
        <g>
          {[-dem, dem].map((dx) => (
            <g key={dx}>
              <path d={`M${(px + dx - 2.6).toFixed(1)},${solP.toFixed(1)}L${(px + dx - 2.6).toFixed(1)},${hautP.toFixed(1)}L${(px + dx + 2.6).toFixed(1)},${hautP.toFixed(1)}L${(px + dx + 2.6).toFixed(1)},${solP.toFixed(1)}Z`} fill={dx < 0 ? '#7a5b37' : '#6a4c2c'} />
              <path d={`M${(px + dx - 2.6).toFixed(1)},${solP.toFixed(1)}L${(px + dx - 2.6).toFixed(1)},${hautP.toFixed(1)}L${(px + dx - 1).toFixed(1)},${hautP.toFixed(1)}L${(px + dx - 1).toFixed(1)},${solP.toFixed(1)}Z`} fill="#9a744a" opacity={0.85} />
            </g>
          ))}
          {/* le vantail, sous le linteau */}
          <rect x={px - dem + 2} y={hautP + 3} width={dem - 2} height={solP - hautP - 3} fill="#8a6535" />
          <rect x={px} y={hautP + 3} width={dem - 2} height={solP - hautP - 3} fill="#7a582c" />
          <path
            d={`M${(px - dem + 5).toFixed(1)},${(hautP + 3).toFixed(1)}V${solP.toFixed(1)}M${(px - 2.5).toFixed(1)},${(hautP + 3).toFixed(1)}V${solP.toFixed(1)}M${(px + 3).toFixed(1)},${(hautP + 3).toFixed(1)}V${solP.toFixed(1)}M${(px + dem - 3).toFixed(1)},${(hautP + 3).toFixed(1)}V${solP.toFixed(1)}`}
            stroke="#684a25"
            strokeWidth={1}
            opacity={0.8}
          />
          <path d={`M${(px - dem + 2.4).toFixed(1)},${(hautP + 5).toFixed(1)}L${(px - 0.6).toFixed(1)},${(solP - 1).toFixed(1)}M${(px + dem - 0.4).toFixed(1)},${(hautP + 5).toFixed(1)}L${(px + 0.6).toFixed(1)},${(solP - 1).toFixed(1)}`} stroke="#5f462d" strokeWidth={1.3} opacity={0.7} />
          {/* linteau : dessus éclairé, sous-face en ombre */}
          <rect x={px - dem - 4} y={hautP - 4.4} width={2 * dem + 8} height={4.4} fill="#7a5a35" />
          <rect x={px - dem - 4} y={hautP - 4.4} width={2 * dem + 8} height={1.2} fill="#a8845d" />
          <rect x={px - dem - 4} y={hautP} width={2 * dem + 8} height={1.2} fill={PAL.ombrePortee} opacity={0.3} />
        </g>
        {/* l'échelle (n1) ou la volée de marches (n2) qui rachète les 39 px */}
        {(() => {
          const xe = jx - larg / 2 - 11
          const n = bois ? 8 : 6
          let m = ''
          let l = ''
          for (let i = 0; i < n; i++) {
            const y = S.y - c.H - 1 - (i * (S.y - N.y)) / n
            m += `M${xe.toFixed(1)},${y.toFixed(1)}h9.5v${((S.y - N.y) / n - 0.8).toFixed(1)}h-9.5Z`
            l += `M${xe.toFixed(1)},${y.toFixed(1)}h9.5v0.9h-9.5Z`
          }
          return bois ? (
            <g>
              <rect x={xe + 0.4} y={N.y - c.H - 2} width={1.4} height={S.y - N.y} fill="#5c4227" />
              <rect x={xe + 7.6} y={N.y - c.H - 2} width={1.4} height={S.y - N.y} fill="#5c4227" />
              <path d={l} fill="#7d5e39" />
            </g>
          ) : (
            <g>
              <path d={`M${xe.toFixed(1)},${(N.y - c.H + 2).toFixed(1)}h9.5V${(S.y - c.H + 8).toFixed(1)}h-9.5Z`} fill="#9d9078" />
              <path d={m} fill="#b5aa90" />
              <path d={l} fill="#e2dac6" />
            </g>
          )
        })()}
        {/* RETOURS : la courtine finit sur une joue d'ombre */}
        {[N, S].map((P, i) => (
          <path
            key={i}
            d={`M${P.x.toFixed(1)},${(P.y + 2).toFixed(1)}L${(P.x - 3.5).toFixed(1)},${(P.y + 2).toFixed(1)}L${(P.x - 3.5).toFixed(1)},${(P.y - crete).toFixed(1)}L${P.x.toFixed(1)},${(P.y - crete).toFixed(1)}Z`}
            fill={bois ? '#3f2d18' : '#6f6349'}
            opacity={0.45}
          />
        ))}
      </g>
    )
  }

  // ── niveaux 3 et 4 : deux BASTIONS rectangulaires (pas des cylindres : c'est
  //    ce qui les distingue des tours de courtine) + le porche en saillie ──
  const larg = n4 ? 24 : 20
  const grad = n4 ? 'url(#mur-face4)' : 'url(#mur-face)'
  const tons = n4 ? TONS_TAILLE : TONS_SEC
  const jx = M.x - 5
  const joue = (P: { x: number; y: number }, seed: number, avant: boolean) => {
    const pied = P.y + 2
    const arase = P.y - crete - 3.5
    const x0 = jx - larg / 2
    return (
      <g>
        {avant && <ellipse cx={jx + 7} cy={pied + 3} rx={larg * 0.8} ry={7} fill={PAL.ombrePortee} opacity={0.17} filter="url(#a-flou2)" />}
        <rect x={x0} y={arase} width={larg} height={pied - arase} fill={grad} />
        {blocsRect(x0, arase + 3, larg, pied - arase - 3, n4 ? 5.4 : 4.8, seed, tons).map((d, j) => (
          <path key={j} d={d} fill={tons[j]} opacity={0.85} />
        ))}
        {/* le fruit du pied, l'ombre à l'est, le liseré clair à l'ouest */}
        <rect x={x0 - 1} y={pied - 4} width={larg + 2} height={4} fill={grad} />
        <rect x={x0 - 1} y={pied - 4} width={larg + 2} height={1} fill="#e6dfc9" opacity={0.45} />
        <rect x={x0 + larg - 3.5} y={arase} width={3.5} height={pied - arase} fill={PAL.ombrePortee} opacity={0.18} />
        <rect x={x0} y={arase} width={1.2} height={pied - arase} fill="#f2ecd9" opacity={0.4} />
        {/* archère du bastion */}
        <rect x={jx - 1} y={arase + 11} width={2} height={c.H * 0.28} fill="#3a2e1c" />
        <rect x={jx - 2.4} y={arase + 9.8} width={4.8} height={0.9} fill="#efe8d6" opacity={0.7} />
        {/* couronnement : dallage, merlons, retour du parapet de la courtine */}
        <rect x={x0 - 1.5} y={arase - 3.4} width={larg + 3} height={3.6} fill="url(#mur-dalle)" />
        <rect x={x0 - 1.5} y={arase} width={larg + 3} height={1.2} fill={PAL.ombrePortee} opacity={0.24} />
        {Array.from({ length: 4 }, (_, i) => {
          const mw = (larg + 3) / 4 - 1.8
          const mx = x0 - 1.5 + (i * (larg + 3)) / 4
          return (
            <g key={i}>
              <rect x={mx} y={arase - 3.4 - c.par} width={mw} height={c.par} fill={['#ddd5c1', '#d3cab5', '#c2b8a0', '#a89d83'][i]} />
              <rect x={mx} y={arase - 3.4 - c.par} width={mw} height={1} fill="#efe8d5" />
            </g>
          )
        })}
        {/* la joue du FOND recule d'un ton : sans cela les deux bastions et le
            porche se confondent en une seule masse pâle */}
        {!avant && <rect x={x0 - 1.5} y={arase - 3.4 - c.par} width={larg + 3} height={pied - arase + 3.4 + c.par} fill="#6b5f45" opacity={0.16} />}
      </g>
    )
  }

  const baie = n4 ? 22 : 18
  const px = M.x + 11
  const seuil = M.y + 2
  const naissance = M.y - c.H * 0.55
  const rArc = baie / 2
  const haut = naissance - rArc - 6

  return (
    <g>
      {/* JOUE NORD : bâtie sur pt(geo,−0,1), son arase 3,5 px au-dessus de SA crête */}
      {joue(N, 61, false)}
      {/* l'escalier de liaison : il monte les 39 px du chemin de ronde sud à
          celui du nord, sur le flanc INTERNE - c'est lui qui fait lire la porte
          comme un morceau du rempart et non comme un décor posé devant */}
      {(() => {
        const xe = jx - larg / 2 - 12
        const yBas = S.y - c.H - 1
        const yHaut = N.y - c.H - 1
        let m = ''
        let l = ''
        for (let i = 0; i < 8; i++) {
          const y = yBas - (i * (S.y - N.y)) / 8
          m += `M${xe.toFixed(1)},${y.toFixed(1)}h11v${((S.y - N.y) / 8 - 0.7).toFixed(1)}h-11Z`
          l += `M${xe.toFixed(1)},${y.toFixed(1)}h11v0.9h-11Z`
        }
        return (
          <g>
            {/* la maçonnerie qui porte la volée */}
            <path d={`M${xe.toFixed(1)},${(yHaut + 3).toFixed(1)}L${(xe + 11).toFixed(1)},${(yHaut + 3).toFixed(1)}L${(xe + 11).toFixed(1)},${(yBas + 9).toFixed(1)}L${xe.toFixed(1)},${(yBas + 9).toFixed(1)}Z`} fill="#9d9078" />
            <path d={`M${xe.toFixed(1)},${(yHaut + 3).toFixed(1)}L${(xe + 2).toFixed(1)},${(yHaut + 3).toFixed(1)}L${(xe + 2).toFixed(1)},${(yBas + 9).toFixed(1)}L${xe.toFixed(1)},${(yBas + 9).toFixed(1)}Z`} fill="#c2b89f" opacity={0.55} />
            <path d={m} fill="#b5aa90" />
            <path d={l} fill="#e2dac6" />
          </g>
        )
      })()}
      {/* JOUE SUD : bâtie sur pt(geo,+0,1), 39 px plus bas - la pente du terrain */}
      {joue(S, 62, true)}
      {/* LE PORCHE, porté en saillie vers le dehors, entre les deux joues */}
      <g>
        {/* l'ombre portée de tout l'ouvrage, vers le SE */}
        <ellipse cx={px + 6} cy={seuil + 4} rx={baie + 12} ry={8} fill={PAL.ombrePortee} opacity={0.17} filter="url(#a-flou2)" />
        <rect x={px - baie / 2 - 7} y={haut} width={baie + 14} height={seuil - haut} fill={grad} />
        {/* angle rentrant entre le porche et les joues : toujours dans l'ombre */}
        <rect x={px - baie / 2 - 7} y={haut} width={2.6} height={seuil - haut} fill={PAL.ombrePortee} opacity={0.2} />
        {blocsRect(px - baie / 2 - 7, haut + 5, baie + 14, seuil - haut - 5, n4 ? 5.4 : 4.8, 63, tons).map((d, j) => (
          <path key={j} d={d} fill={tons[j]} opacity={0.7} />
        ))}
        {/* frise du niveau 4 : écho de la porte des Lionnes */}
        {n4 && (
          <>
            <rect x={px - baie / 2 - 9} y={haut - 5.5} width={baie + 18} height={5.5} fill="#e6dfcb" />
            <rect x={px - baie / 2 - 9} y={haut - 5.5} width={baie + 18} height={1.2} fill="#f4efe1" />
            <path d={`M${(px - 10).toFixed(1)},${(haut - 0.6).toFixed(1)}L${(px - 9).toFixed(1)},${(haut - 4.4).toFixed(1)}L${(px - 3.2).toFixed(1)},${(haut - 0.6).toFixed(1)}Z`} fill="#8c8474" />
            <path d={`M${(px + 10).toFixed(1)},${(haut - 0.6).toFixed(1)}L${(px + 9).toFixed(1)},${(haut - 4.4).toFixed(1)}L${(px + 3.2).toFixed(1)},${(haut - 0.6).toFixed(1)}Z`} fill="#8c8474" />
            <rect x={px - 1.4} y={haut - 4.6} width={2.8} height={4} fill="#9a9078" />
          </>
        )}
        {/* chemin de ronde du porche + créneaux */}
        <rect x={px - baie / 2 - 9} y={haut - (n4 ? 10.2 : 4.6)} width={baie + 18} height={4.6} fill="url(#mur-dalle)" />
        {Array.from({ length: 4 }, (_, i) => {
          const mw = (baie + 18) / 4 - 2
          const mx = px - baie / 2 - 9 + (i * (baie + 18)) / 4
          return (
            <g key={i}>
              <rect x={mx} y={haut - (n4 ? 10.2 : 4.6) - c.par} width={mw} height={c.par} fill={['#ddd5c1', '#d3cab5', '#c2b8a0', '#a89d83'][i]} />
              <rect x={mx} y={haut - (n4 ? 10.2 : 4.6) - c.par} width={mw} height={1} fill="#efe8d5" />
            </g>
          )
        })}
        {/* arc appareillé, claveaux marqués, clef éclairée */}
        <path
          d={`M${(px - rArc - 3.4).toFixed(1)},${seuil.toFixed(1)}L${(px - rArc - 3.4).toFixed(1)},${naissance.toFixed(1)}A${(rArc + 3.4).toFixed(1)},${(rArc + 3.4).toFixed(1)} 0 0 1 ${(px + rArc + 3.4).toFixed(1)},${naissance.toFixed(1)}L${(px + rArc + 3.4).toFixed(1)},${seuil.toFixed(1)}L${(px + rArc).toFixed(1)},${seuil.toFixed(1)}L${(px + rArc).toFixed(1)},${naissance.toFixed(1)}A${rArc.toFixed(1)},${rArc.toFixed(1)} 0 0 0 ${(px - rArc).toFixed(1)},${naissance.toFixed(1)}L${(px - rArc).toFixed(1)},${seuil.toFixed(1)}Z`}
          fill={n4 ? '#e2dac6' : '#d5cdb9'}
        />
        <path
          d={`M${(px - rArc * 0.75).toFixed(1)},${(naissance - rArc * 0.68).toFixed(1)}L${(px - rArc * 0.95).toFixed(1)},${(naissance - rArc * 0.86).toFixed(1)}M${px.toFixed(1)},${(naissance - rArc).toFixed(1)}L${px.toFixed(1)},${(naissance - rArc - 3.4).toFixed(1)}M${(px + rArc * 0.75).toFixed(1)},${(naissance - rArc * 0.68).toFixed(1)}L${(px + rArc * 0.95).toFixed(1)},${(naissance - rArc * 0.86).toFixed(1)}`}
          stroke={PAL.pierreJoint}
          strokeWidth={0.9}
          fill="none"
          opacity={0.55}
        />
        <path d={`M${(px - 2.8).toFixed(1)},${(naissance - rArc - 3.4).toFixed(1)}L${(px - 1.8).toFixed(1)},${(naissance - rArc).toFixed(1)}L${(px + 1.8).toFixed(1)},${(naissance - rArc).toFixed(1)}L${(px + 2.8).toFixed(1)},${(naissance - rArc - 3.4).toFixed(1)}Z`} fill="#f4efe1" />
        {/* embrasure profonde */}
        <path d={`M${(px - rArc).toFixed(1)},${seuil.toFixed(1)}L${(px - rArc).toFixed(1)},${naissance.toFixed(1)}A${rArc.toFixed(1)},${rArc.toFixed(1)} 0 0 1 ${(px + rArc).toFixed(1)},${naissance.toFixed(1)}L${(px + rArc).toFixed(1)},${seuil.toFixed(1)}Z`} fill="url(#mur-antre)" />
        {/* vantaux de bois bardés de bronze, en retrait */}
        {(() => {
          const r = rArc - 2
          const h = naissance - seuil
          return (
            <g transform={`translate(${px.toFixed(1)},${seuil.toFixed(1)})`}>
              <path d={`M${(-r).toFixed(1)},0L${(-r).toFixed(1)},${h.toFixed(1)}A${r.toFixed(1)},${r.toFixed(1)} 0 0 1 ${r.toFixed(1)},${h.toFixed(1)}L${r.toFixed(1)},0Z`} fill="#6d4e2c" />
              <path d={`M${(-r).toFixed(1)},0L${(-r).toFixed(1)},${h.toFixed(1)}A${r.toFixed(1)},${r.toFixed(1)} 0 0 1 ${(-r * 0.34).toFixed(1)},${(h - r * 0.94).toFixed(1)}L${(-r * 0.34).toFixed(1)},0Z`} fill="#7d5b34" />
              <line x1={0} y1={h - r} x2={0} y2={0} stroke="#4a3018" strokeWidth={1.3} />
              {/* bandages de bronze */}
              {[0.18, 0.5, 0.82].map((f) => (
                <g key={f}>
                  <rect x={-r} y={h * f} width={r * 2} height={1.9} fill="#8a6b2e" />
                  <rect x={-r} y={h * f} width={r * 2} height={0.6} fill="#c9a441" opacity={0.8} />
                </g>
              ))}
              {/* clous de bronze */}
              {[-r * 0.55, r * 0.55].map((sx) =>
                [0.3, 0.62, 0.92].map((f) => <circle key={`${sx}${f}`} cx={sx} cy={h * f - 2.6} r={1.1} fill={PAL.or} />),
              )}
            </g>
          )
        })()}
        {/* seuil à deux degrés */}
        <rect x={px - rArc} y={seuil - 2} width={baie} height={2.4} fill="#c8bda2" />
        <rect x={px - rArc - 2} y={seuil + 0.2} width={baie + 4} height={1.8} fill="#b6ab90" />
      </g>
      {/* RETOURS : la courtine finit sur une joue d'ombre, elle ne s'évanouit plus */}
      {[N, S].map((P, i) => (
        <path
          key={i}
          d={`M${P.x.toFixed(1)},${(P.y + 2).toFixed(1)}L${(P.x - 3.5).toFixed(1)},${(P.y + 2).toFixed(1)}L${(P.x - 3.5).toFixed(1)},${(P.y - crete).toFixed(1)}L${P.x.toFixed(1)},${(P.y - crete).toFixed(1)}Z`}
          fill={n4 ? '#7d7053' : '#6f6349'}
          opacity={0.5}
        />
      ))}
      {/* et l'épaisseur du mur au droit du passage : on voit la tranche */}
      <rect x={M.x - 2} y={M.y - c.H - ep} width={4} height={ep} fill={PAL.pierreLit} opacity={0.5} />
    </g>
  )
}

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

/** angles des tourelles de veille du niveau 4, par couche */
const GUET = { front: [0.85, 2.29], back: [3.99, 5.43] }

/**
 * L'enceinte. Mémoïsée : hors assaut, ni le niveau ni les points de structure ne
 * bougent, et l'arc échantillonné coûte plusieurs centaines de nœuds par couche.
 */
export const Murailles = memo(function Murailles({
  niveau,
  hp,
  max,
  breche,
  layer,
  geo = MAP.mur,
  tours = 0,
  span = 1,
  brechesAngles,
}: Props) {
  const arriere = layer === 'back'
  const a0 = arriere ? Math.PI : PORTE
  const a1Complet = arriere ? 2 * Math.PI - PORTE : Math.PI
  const a1 = a0 + (a1Complet - a0) * span

  const t = abscisse(geo, a0, a1)
  const nC = pasCourbe(t.L)

  // niveau 0 : bornes de fondation, pour situer la future enceinte
  if (niveau <= 0) {
    return (
      <g opacity={0.5}>
        {anglesArc(t, 46).map((a, i) => {
          const p = pt(geo, a)
          return <circle key={i} cx={p.x} cy={p.y} r={2} fill="#8f887a" />
        })}
      </g>
    )
  }

  const c = cote(niveau)
  const H = c.H
  const crete = H + c.par
  const gi = dedans(geo, c.W)
  const n4 = niveau >= 4
  const n3 = niveau >= 3
  const grad = n4 ? 'url(#mur-face4)' : 'url(#mur-face)'
  const tonOmbre = n4 ? '#7d7053' : '#6f6349'
  const ratio = max > 0 ? hp / max : 1
  const fissures =
    ratio < 0.65
      ? [0.55, 2.6, 1.25, 3.7, 5.1, 1.9].slice(0, Math.min(6, Math.floor((1 - ratio) * 8))).filter((a) => {
          const enAvant = a > PORTE && a < Math.PI
          return arriere ? !enAvant : enAvant
        })
      : []

  // ── les tours : angles retenus pour CETTE couche, et leurs encoches ──
  const dansArc = (a: number) => {
    const an = arriere && a < 0 ? a + 2 * Math.PI : a
    return an >= a0 - 1e-6 && an <= a1 + 1e-6 ? an : null
  }
  const toursPosees: { a: number; guet?: boolean }[] = []
  if (COTES_TOUR[Math.min(4, niveau)])
    for (const a of TOUR_ANGLES.slice(0, tours)) {
      const an = dansArc(a)
      if (an !== null) toursPosees.push({ a: an })
    }
  if (n4)
    for (const a of (arriere ? GUET.back : GUET.front)) {
      const an = dansArc(a)
      if (an !== null) toursPosees.push({ a: an, guet: true })
    }
  // les pans effondrés interrompent le parapet comme une tour : sans cela des
  // merlons pendaient au-dessus de la trouée
  const pans = (span >= 1 ? (brechesAngles ?? []) : [])
    .map((a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI))
    .filter((a) => a > 0.3 && a < 2 * Math.PI - 0.3)
    .filter((a) => (arriere ? a >= Math.PI : a < Math.PI))
  const encoches = toursPosees.map(({ a, guet }) => {
    const ct = COTES_TOUR[Math.min(4, niveau)]
    const D = (guet ? (ct?.D ?? 0) * 0.74 : ct?.D ?? 0) || 0
    const dsda = Math.hypot(geo.rx * Math.sin(a), geo.ry * Math.cos(a)) || 1
    return { a, da: (0.62 * D) / dsda }
  })
  for (const a of pans) encoches.push({ a, da: 0.115 })

  return (
    <g>
      <DefsMur />

      {niveau === 1 &&
        (() => {
          const tous = anglesArc(t, c.pas, 0, 1)
          const debout = (a: number) => !encoches.some((e) => Math.abs(a - e.a) < e.da)
          const angles = tous.filter(debout)
          const px = pieuxPaths(angles.map((a) => pt(geo, a)), -4, c.par + H - 4, 4, 5.4, arriere ? 5 : 3)
          const gardes = anglesArc(t, 150, 40).filter((a) => !encoches.some((e) => Math.abs(a - e.a) < e.da * 1.6))
          const cf = anglesArc(t, 62, 14)
          // traverses SEGMENTÉES tous les 5 pieux : un seul stroke d'un bout à
          // l'autre faisait « voie ferrée » sur 830 px
          let trav = ''
          let travLum = ''
          let liga = ''
          for (const dy of [-crete + 9, -crete + 16]) {
            for (let i = 0; i + 5 < tous.length; i += 5) {
              if (!debout(tous[i]) || !debout(tous[i + 5])) continue
              const p = pt(geo, tous[i])
              const q = pt(geo, tous[i + 5])
              const jit = ((i * 7) % 3) * 0.5 - 0.5
              trav += `M${p.x.toFixed(1)},${(p.y + dy + jit - 1).toFixed(1)}L${q.x.toFixed(1)},${(q.y + dy + jit - 1).toFixed(1)}L${q.x.toFixed(1)},${(q.y + dy + jit + 1.1).toFixed(1)}L${p.x.toFixed(1)},${(p.y + dy + jit + 1.1).toFixed(1)}Z`
              travLum += `M${p.x.toFixed(1)},${(p.y + dy + jit - 1).toFixed(1)}L${q.x.toFixed(1)},${(q.y + dy + jit - 1).toFixed(1)}L${q.x.toFixed(1)},${(q.y + dy + jit - 0.3).toFixed(1)}L${p.x.toFixed(1)},${(p.y + dy + jit - 0.3).toFixed(1)}Z`
              liga += `M${(p.x - 1.4).toFixed(1)},${(p.y + dy + jit - 1.6).toFixed(1)}h2.8v3.4h-2.8Z`
            }
          }
          return (
            <g>
              {/* ombre portée au sol côté SE */}
              <path d={ligne(geo, a0, a1, nC, 5)} stroke={PAL.ombrePortee} strokeWidth={9} fill="none" opacity={0.16} filter="url(#a-flou2)" />
              {/* la LEVÉE DE TERRE : un talus BAS au pied, pas un remblai de la
                  hauteur de la palissade */}
              <path d={ruban(geo, 2.5, geo, -5, a0, a1, nC, 3)} fill="#5f4d2c" />
              <path d={ruban(geo, 1.2, geo, -5, a0, a1, nC, 1.4)} fill="#7a6640" />
              <path d={ligne(geo, a0, a1, nC, -5, 0.3)} stroke="#97814f" strokeWidth={1.1} fill="none" opacity={0.8} />
              <path d={ligne(geo, a0, a1, nC, 1.4, 2.9)} stroke="#4a3a20" strokeWidth={1.4} fill="none" opacity={0.5} />
              {/* fond de palissade : la pénombre entre les pieux, jamais le sol nu */}
              <path d={ruban(geo, -3.5, geo, -crete + 4, a0, a1, nC)} fill="#46331d" />
              {/* contreforts : deux pieux inclinés en V, appuyés au-dehors */}
              {(() => {
                let est = ''
                let ouest = ''
                for (const a of cf) {
                  const p = pt(geo, a)
                  const o = saillie(geo, a, 5)
                  const { tx, ty } = tangente(geo, a)
                  const bx = p.x + o.dx
                  const by = p.y + o.dy + 1
                  est += `M${(bx + tx * 5).toFixed(1)},${(by + ty * 5).toFixed(1)}L${(p.x + 1.1).toFixed(1)},${(p.y - H * 0.86).toFixed(1)}L${(p.x - 0.7).toFixed(1)},${(p.y - H * 0.86).toFixed(1)}L${(bx + tx * 5 - 1.7).toFixed(1)},${(by + ty * 5).toFixed(1)}Z`
                  ouest += `M${(bx - tx * 5).toFixed(1)},${(by - ty * 5).toFixed(1)}L${(p.x - 1.1).toFixed(1)},${(p.y - H * 0.86).toFixed(1)}L${(p.x + 0.7).toFixed(1)},${(p.y - H * 0.86).toFixed(1)}L${(bx - tx * 5 + 1.7).toFixed(1)},${(by - ty * 5).toFixed(1)}Z`
                }
                return (
                  <>
                    <path d={est} fill="#6a4e2d" />
                    <path d={ouest} fill="#8b6a40" />
                  </>
                )
              })()}
              {/* pieux : 3 valeurs de bois, arête ouest éclairée, pointes claires */}
              <path d={px.corps[0]} fill="#7d5e39" />
              <path d={px.corps[1]} fill="#6a4e2d" />
              <path d={px.corps[2]} fill="#8b6a40" />
              <path d={px.arete} fill="#aa865e" opacity={0.85} />
              <path d={px.pointe} fill="#d6b788" />
              {/* traverses lâchées devant les pieux + ligature de corde */}
              <path d={trav} fill="#5c4227" />
              <path d={travLum} fill="#96713f" opacity={0.9} />
              <path d={liga} fill="#4a3519" opacity={0.85} />
              {/* plates-formes de guet : la progression de silhouette du niveau 1 */}
              {(() => {
                let bois = ''
                let lum = ''
                let poteau = ''
                for (const a of gardes) {
                  const p = pt(geo, a)
                  const y = p.y - crete - 1
                  bois += `M${(p.x - 7.5).toFixed(1)},${y.toFixed(1)}h15v3.2h-15Z`
                  lum += `M${(p.x - 7.5).toFixed(1)},${y.toFixed(1)}h15v1h-15Z`
                  poteau += `M${(p.x - 6.6).toFixed(1)},${(y - 7.5).toFixed(1)}h1.5v7.5h-1.5ZM${(p.x + 5.1).toFixed(1)},${(y - 7.5).toFixed(1)}h1.5v7.5h-1.5Z`
                  bois += `M${(p.x - 7.5).toFixed(1)},${(y - 8.6).toFixed(1)}h15v1.4h-15Z`
                }
                return (
                  <>
                    <path d={poteau} fill="#6a4e2d" />
                    <path d={bois} fill={PAL.boisMi} />
                    <path d={lum} fill={PAL.boisLit} />
                  </>
                )
              })()}
            </g>
          )
        })()}

      {niveau === 2 &&
        (() => {
          const gFace = arriere ? gi : geo
          const as = assisesArc(gFace, t, c.pasBloc, -H + 1.4, c.rangs, c.hAssise, 5, arriere ? 22 : 21, false)
          const poteaux = anglesArc(t, c.pas, 0, 1).filter((a) => !encoches.some((e) => Math.abs(a - e.a) < e.da))
          const cf = anglesArc(t, 52, 20)
          // le HOURD : poteaux, bardage de planches, ligatures - en 4 chemins
          let pot = ''
          let potLum = ''
          let chapeau = ''
          for (const a of poteaux) {
            const p = pt(geo, a)
            pot += `M${(p.x - 1.2).toFixed(1)},${(p.y - H - c.par - 1).toFixed(1)}h2.4v${(c.par + 2).toFixed(1)}h-2.4Z`
            potLum += `M${(p.x - 1.2).toFixed(1)},${(p.y - H - c.par - 1).toFixed(1)}h0.8v${(c.par + 2).toFixed(1)}h-0.8Z`
            chapeau += `M${(p.x - 2).toFixed(1)},${(p.y - H - c.par - 2).toFixed(1)}h4v1.4h-4Z`
          }
          return (
            <g>
              <path d={ligne(geo, a0, a1, nC, 5)} stroke={PAL.ombrePortee} strokeWidth={10} fill="none" opacity={0.15} filter="url(#a-flou2)" />
              {/* corps en pierre sèche, face de 20 px : au point ouest elle ne se
                  réduit plus à un filet de 2 px */}
              <path d={ruban(gFace, 2, gFace, -H, a0, a1, nC)} fill={arriere ? 'url(#mur-interne)' : 'url(#mur-sec)'} />
              {/* contreforts : massifs de pierre, seuls accents verticaux */}
              {!arriere &&
                (() => {
                  const b = contreforts(geo, cf, H, 8, 2.6, 0.82)
                  return (
                    <g>
                      <path d={b.face} fill="url(#mur-sec)" />
                      <path d={b.face} fill="#e2dac6" opacity={0.18} />
                      <path d={b.flanc} fill={PAL.ombrePortee} opacity={0.24} />
                      <path d={b.lum} fill="#e6dfc9" opacity={0.5} />
                    </g>
                  )
                })()}
              {/* blocs par assises, tons répondant à la lumière NW - OPACITÉ 1 :
                  la pierre sèche doit être des blocs, pas un voile */}
              {as.tons.map((d, i) => (
                <path key={i} d={d} fill={TONS_SEC[i]} opacity={arriere ? 0.4 : 1} />
              ))}
              {/* lit de réglage : un rang de plaquettes au tiers de la hauteur */}
              <path d={ruban(gFace, -H * 0.44, gFace, -H * 0.44 + 1.6, a0, a1, nC)} fill="#cfc5ab" opacity={0.75} />
              {/* fruit : la plinthe est poussée vers le dehors */}
              <path d={ruban(gFace, 2, gFace, -4.4, a0, a1, nC, arriere ? 0 : 1.6)} fill={arriere ? 'url(#mur-interne)' : 'url(#mur-sec)'} />
              <path d={ligne(gFace, a0, a1, nC, -4.4, arriere ? 0 : 0.5)} stroke="#c8bda2" strokeWidth={1} fill="none" opacity={0.5} />
              <path d={ligne(gFace, a0, a1, nC, 0.9)} stroke="url(#mur-pied)" strokeWidth={5} fill="none" />
              {/* le sommet n'est plus une palissade de pointes mais un HOURD :
                  chemin de bois en encorbellement, bardé de planches */}
              <path d={ruban(geo, -H, gi, -H, a0, a1, nC)} fill="url(#mur-dalle)" />
              <path d={ligne(geo, a0, a1, nC, -H + 0.6)} stroke={PAL.ombrePortee} strokeWidth={2} fill="none" opacity={0.16} />
              <path d={ruban(geo, -H - 0.5, geo, -H - c.par, a0, a1, nC, 0.8, 0.8)} fill="#6a4e2d" />
              <path d={ligne(geo, a0, a1, nC, -H - c.par + 1.3, 0.8)} stroke="#96713f" strokeWidth={1.5} fill="none" opacity={0.95} />
              <path d={ligne(geo, a0, a1, nC, -H - 2.6, 0.8)} stroke="#8b6a40" strokeWidth={1.1} fill="none" opacity={0.7} />
              <path d={ligne(geo, a0, a1, nC, -H - 0.7, 0.8)} stroke="#3f2d18" strokeWidth={1.2} fill="none" opacity={0.6} />
              <path d={pot} fill="#5c4227" />
              <path d={potLum} fill="#9a744a" opacity={0.9} />
              <path d={chapeau} fill="#8b6a40" />
            </g>
          )
        })()}

      {niveau >= 3 &&
        (() => {
          const angles = anglesArc(t, c.pas, 0, 1)
          const cr = couronnement(geo, angles, H, c.par, c.wM, c.W, arriere, encoches, niveau * 3 + (arriere ? 2 : 1))
          // les assises se portent sur la face VUE : le nu extérieur au sud, le
          // nu intérieur au nord (R4)
          const gFace = arriere ? gi : geo
          const as = assisesArc(gFace, t, c.pasBloc, -H + 2, c.rangs, c.hAssise, 5, (arriere ? 42 : 41) + niveau, n4 && !arriere)
          const cf = anglesArc(t, n4 ? 86 : 78, 26)
          const arch = anglesArc(t, 55, 22)
          let dalles = ''
          for (const a of anglesArc(t, n4 ? 13 : 16, 4)) {
            const p = pt(geo, a)
            const q = pt(gi, a)
            dalles += `M${p.x.toFixed(1)},${(p.y - H).toFixed(1)}L${q.x.toFixed(1)},${(q.y - H).toFixed(1)}`
          }
          let mach = ''
          let joints = ''
          if (!arriere) {
            if (n4)
              for (const a of anglesArc(t, 13, 6)) {
                const p = pt(geo, a)
                const { tx } = tangente(geo, a)
                const w = 3.4 * Math.max(0.45, Math.abs(tx))
                mach += `M${(p.x - w / 2).toFixed(1)},${(p.y - H).toFixed(1)}L${(p.x - w / 2 + 0.9).toFixed(1)},${(p.y - H + 3.6).toFixed(1)}L${(p.x + w / 2 - 0.9).toFixed(1)},${(p.y - H + 3.6).toFixed(1)}L${(p.x + w / 2).toFixed(1)},${(p.y - H).toFixed(1)}Z`
              }
            // soubassement cyclopéen : un seul chemin pour tous les joints
            for (const a of anglesArc(t, 19, 3)) {
              const p = pt(geo, a)
              joints += `M${p.x.toFixed(1)},${(p.y + 1).toFixed(1)}L${p.x.toFixed(1)},${(p.y - c.hAssise - 2.6).toFixed(1)}`
            }
          }
          const ar = archeres(geo, arch, H)
          /*
           * LE PARAPET CONTINU (R2). Aux deux extrémités est/ouest de l'ellipse la
           * crête se dresse : un merlon n'y a plus de sens graphique, mais le
           * parapet doit tout de même exister - sans cette bande, le mur perdait
           * son garde-corps sur 0,37 rad de part et d'autre de la porte et du
           * point ouest, et n'était plus qu'un dessus de dallage.
           */
          const aS = seuilPlat(geo)
          const A0 = arriere ? Math.PI : 0
          const A1 = arriere ? 2 * Math.PI : Math.PI
          const gp = dedans(geo, c.W * 0.34)
          const zones = ([
            [a0, Math.min(a1, A0 + aS)],
            [Math.max(a0, Math.min(a1, A1 - aS)), a1],
          ] as [number, number][]).filter(([u, v]) => v - u > 0.006)
          const parapetPlein = (
            <g>
              {zones.map(([u, v], i) => {
                const n = pasCourbe(Math.hypot(geo.rx * (Math.cos(v) - Math.cos(u)), geo.ry * (Math.sin(v) - Math.sin(u))))
                return arriere ? (
                  <g key={i}>
                    <path d={ruban(geo, -H - c.par, gp, -H - c.par, u, v, n)} fill={PAL.pierreLit} />
                    <path d={ruban(gp, -H - c.par, gp, -H, u, v, n)} fill={n4 ? '#9d9179' : '#94886e'} />
                  </g>
                ) : (
                  <g key={i}>
                    <path d={ruban(geo, -H, geo, -H - c.par, u, v, n)} fill={grad} />
                    <path d={ruban(geo, -H - c.par, gp, -H - c.par, u, v, n)} fill={PAL.pierreLit} />
                  </g>
                )
              })}
            </g>
          )
          // ── escaliers et appentis du dedans : un chemin par valeur, et jamais
          //    au droit d'une tour (le fût les avalerait) ──
          let esc = ''
          let escLum = ''
          let escFlanc = ''
          if (arriere)
            for (const a of anglesArc(t, 240, 70)) {
              if (encoches.some((e) => Math.abs(a - e.a) < e.da * 2.2)) continue
              const p = pt(gi, a)
              escFlanc += `M${(p.x - 9).toFixed(1)},${(p.y + 1).toFixed(1)}L${(p.x + 6).toFixed(1)},${(p.y + 1).toFixed(1)}L${(p.x + 6).toFixed(1)},${(p.y - H).toFixed(1)}L${(p.x - 9).toFixed(1)},${(p.y - H * 0.1).toFixed(1)}Z`
              for (let i = 0; i < 7; i++) {
                const yy = p.y - ((i + 1) * H) / 7
                // chaque marche recule : c'est ce décalage qui fait une VOLÉE et
                // non une échelle de barreaux plaquée sur le mur
                const xx = p.x - 9 + i * 1.9
                esc += `M${xx.toFixed(1)},${yy.toFixed(1)}L${(p.x + 6).toFixed(1)},${yy.toFixed(1)}L${(p.x + 6).toFixed(1)},${(yy + H / 7 - 0.6).toFixed(1)}L${xx.toFixed(1)},${(yy + H / 7 - 0.6).toFixed(1)}Z`
                escLum += `M${xx.toFixed(1)},${yy.toFixed(1)}L${(p.x + 6).toFixed(1)},${yy.toFixed(1)}L${(p.x + 6).toFixed(1)},${(yy + 0.9).toFixed(1)}L${xx.toFixed(1)},${(yy + 0.9).toFixed(1)}Z`
              }
            }
          return (
            <g>
              {/* ombre portée du mur, bande floue décalée vers le SE */}
              <path d={ligne(geo, a0, a1, nC, H * 0.24)} stroke={PAL.ombrePortee} strokeWidth={H * 0.38} fill="none" opacity={0.14} filter="url(#a-flou2)" />

              {arriere ? (
                <>
                  {/* ═══ COUCHE ARRIÈRE : LA FACE INTERNE (R4) ═══
                      le parapet extérieur est au LOIN - on voit son DESSUS puis
                      sa face interne -, le dallage descend vers le joueur, et la
                      face du dedans est un enduit sans une seule archère */}
                  {parapetPlein}
                  <path d={cr.dessus} fill={PAL.pierreLit} />
                  <path d={cr.interne} fill={n4 ? '#9d9179' : '#94886e'} />
                  <path d={cr.crans} fill={tonOmbre} opacity={0.45} />
                  {/* dallage : il part du NU INTERNE DU PARAPET (sinon il
                      recouvrirait la face interne des merlons), s'ouvre au nord
                      et se pince à l'ouest (R3) */}
                  <path d={ruban(dedans(geo, c.W * 0.34), -H, gi, -H, a0, a1, nC)} fill="url(#mur-dalle)" />
                  <path d={cr.ombre} fill={PAL.ombrePortee} opacity={0.22} />
                  <path d={dalles} stroke="#a59b82" strokeWidth={0.7} fill="none" opacity={0.5} />
                  {/* bahut interne bas : le garde-corps du dedans */}
                  <path d={ruban(gi, -H, gi, -H - 2.6, a0, a1, nC)} fill="#cbc1a9" />
                  <path d={ligne(gi, a0, a1, nC, -H - 2.6)} stroke="#e6dfc9" strokeWidth={1} fill="none" opacity={0.7} />
                  {/* face interne : enduit de terre, assises noyées dedans */}
                  <path d={ruban(gi, 2, gi, -H, a0, a1, nC)} fill="url(#mur-interne)" />
                  {as.tons.map((d, i) => (
                    <path key={i} d={d} fill={TONS_SEC[i]} opacity={0.34} />
                  ))}
                  {/* lumière rasante juste sous le bahut, puis l'ombre du parapet */}
                  <path d={ligne(gi, a0, a1, nC, -H + 1.2)} stroke="#d5cbb2" strokeWidth={1.4} fill="none" opacity={0.4} />
                  <path d={ligne(gi, a0, a1, nC, -H + 3.4)} stroke={PAL.ombrePortee} strokeWidth={2.6} fill="none" opacity={0.14} />
                  <path d={ligne(gi, a0, a1, nC, -H * 0.46)} stroke="#7d7052" strokeWidth={1.2} fill="none" opacity={0.45} />
                  {/* socle : le mur repose sur un empattement, il ne sort pas du sol */}
                  <path d={ruban(gi, 2.4, gi, -3.6, a0, a1, nC, -1.6)} fill="#8d8064" />
                  <path d={ligne(gi, a0, a1, nC, -3.6, -1.6)} stroke="#b5a888" strokeWidth={1} fill="none" opacity={0.6} />
                  <path d={ligne(gi, a0, a1, nC, 0.9)} stroke="url(#mur-pied)" strokeWidth={H * 0.2} fill="none" />
                  {/* escaliers droits adossés : on monte au chemin de ronde */}
                  <path d={escFlanc} fill="#8b7d5e" />
                  <path d={escFlanc} fill={PAL.ombrePortee} opacity={0.18} />
                  <path d={esc} fill="#9d9179" />
                  <path d={escLum} fill="#cbc1a9" />
                  {/* appentis de bois adossés au mur : la vie du dedans */}
                  {anglesArc(t, 300, 150)
                    .filter((a) => !encoches.some((e) => Math.abs(a - e.a) < e.da * 2.4))
                    .map((a) => {
                      const p = pt(gi, a)
                      return (
                        <g key={a}>
                          <path d={`M${(p.x - 10).toFixed(1)},${(p.y + 1).toFixed(1)}L${(p.x - 10).toFixed(1)},${(p.y - 8).toFixed(1)}L${(p.x + 10).toFixed(1)},${(p.y - 13).toFixed(1)}L${(p.x + 10).toFixed(1)},${(p.y + 1).toFixed(1)}Z`} fill={PAL.boisMi} />
                          <path d={`M${(p.x - 10).toFixed(1)},${(p.y + 1).toFixed(1)}L${(p.x - 10).toFixed(1)},${(p.y - 8).toFixed(1)}L${(p.x - 3).toFixed(1)},${(p.y - 9.7).toFixed(1)}L${(p.x - 3).toFixed(1)},${(p.y + 1).toFixed(1)}Z`} fill={PAL.boisLit} opacity={0.7} />
                          <path d={`M${(p.x - 11.5).toFixed(1)},${(p.y - 7.6).toFixed(1)}L${(p.x + 11.5).toFixed(1)},${(p.y - 13.4).toFixed(1)}L${(p.x + 11.5).toFixed(1)},${(p.y - 10.8).toFixed(1)}L${(p.x - 11.5).toFixed(1)},${(p.y - 5).toFixed(1)}Z`} fill={PAL.chaumeOmbre} />
                          <path d={`M${(p.x - 11.5).toFixed(1)},${(p.y - 7.6).toFixed(1)}L${(p.x + 11.5).toFixed(1)},${(p.y - 13.4).toFixed(1)}L${(p.x + 11.5).toFixed(1)},${(p.y - 12.4).toFixed(1)}L${(p.x - 11.5).toFixed(1)},${(p.y - 6.6).toFixed(1)}Z`} fill={PAL.chaumeLit} />
                        </g>
                      )
                    })}
                </>
              ) : (
                <>
                  {/* ═══ COUCHE AVANT : LA FACE EXTERNE (R4) ═══ */}
                  <path d={ruban(geo, 2, geo, -H, a0, a1, nC)} fill={grad} />
                  {/* contreforts : les accents verticaux qui manquaient sur 830 px */}
                  {(() => {
                    const b = contreforts(geo, cf, H, n4 ? 10 : 9, n4 ? 3.4 : 3, 0.88)
                    return (
                      <g>
                        <path d={b.face} fill={grad} />
                        <path d={b.face} fill="#efe8d3" opacity={0.22} />
                        <path d={b.flanc} fill={PAL.ombrePortee} opacity={0.26} />
                        <path d={b.lum} fill="#f4efe1" opacity={0.5} />
                      </g>
                    )
                  })()}
                  {/* grand appareil : blocs à pas d'ARC (2,5:1 et non 6,4:1) */}
                  <g opacity={n4 ? 0.92 : 0.86}>
                    {as.tons.map((d, i) => (
                      <path key={i} d={d} fill={n4 ? TONS_TAILLE[i] : TONS_SEC[i]} />
                    ))}
                  </g>
                  {n4 && (
                    <>
                      <path d={as.boss} fill="#efe8d3" opacity={0.34} />
                      <path d={as.liseret} fill={PAL.ombrePortee} opacity={0.13} />
                    </>
                  )}
                  {/* soubassement cyclopéen : gros blocs, l'écho mycénien */}
                  <path d={ruban(geo, 2, geo, -c.hAssise - 2.6, a0, a1, nC)} fill="#8e8571" opacity={0.5} />
                  <path d={joints} stroke="#6f6349" strokeWidth={0.8} fill="none" opacity={0.45} />
                  {/* fruit : la plinthe est poussée vers le dehors */}
                  <path d={ruban(geo, 2, geo, -4.4, a0, a1, nC, 1.8, 0.4)} fill={grad} />
                  <path d={ligne(geo, a0, a1, nC, -4.4, 0.4)} stroke="#cfc5ab" strokeWidth={1} fill="none" opacity={0.4} />
                  {/* archères : de vraies embrasures, plus des tirets noirs */}
                  <path d={ar.coulure} fill={PAL.ombrePortee} opacity={0.12} />
                  <path d={ar.ebras} fill="#8d8269" opacity={0.85} />
                  <path d={ar.fente} fill="#42341f" />
                  <path d={ar.linteau} fill="#efe8d6" opacity={0.75} />
                  {/* CORDON D'ASSISE SAILLANT : LE détail qui dit « niveau 4 » */}
                  {n4 && (
                    <>
                      <path d={ruban(geo, -H * 0.6, geo, -H * 0.6 - 1.8, a0, a1, nC, 1.2, 1.2)} fill="#bdb29a" />
                      <path d={ligne(geo, a0, a1, nC, -H * 0.6 - 1.8, 1.2)} stroke="#e6dfc9" strokeWidth={0.8} fill="none" opacity={0.45} />
                      <path d={ligne(geo, a0, a1, nC, -H * 0.6 + 0.5, 0.5)} stroke={PAL.ombrePortee} strokeWidth={1.2} fill="none" opacity={0.18} />
                    </>
                  )}
                  {/* mâchicoulis : corbeaux sous le parapet */}
                  {n4 && <path d={mach} fill="#9f937a" />}
                  <path d={ligne(geo, a0, a1, nC, 0.9)} stroke="url(#mur-pied)" strokeWidth={H * 0.22} fill="none" />
                  {/* ombre du parapet portée sur le haut de la face */}
                  <path d={ligne(geo, a0, a1, nC, -H + 1.8)} stroke={PAL.ombrePortee} strokeWidth={3.4} fill="none" opacity={0.15} />
                  {/* chemin de ronde : dallage, travées, bahut interne */}
                  <path d={ruban(geo, -H, gi, -H, a0, a1, nC)} fill="url(#mur-dalle)" />
                  <path d={dalles} stroke="#a59b82" strokeWidth={0.7} fill="none" opacity={0.45} />
                  <path d={ruban(gi, -H, gi, -H - 2.6, a0, a1, nC)} fill="#c2b89f" />
                  <path d={ligne(gi, a0, a1, nC, -H - 2.6)} stroke="#e6dfc9" strokeWidth={1} fill="none" opacity={0.6} />
                  {/* créneaux volumiques (R1+R2) : plus d'échelle de cubes flottants */}
                  {parapetPlein}
                  <path d={cr.jour} fill="#7b7057" opacity={0.72} />
                  <path d={cr.face} fill={grad} />
                  <path d={cr.flanc} fill="#7b7057" />
                  <path d={cr.dessus} fill={PAL.pierreLit} />
                  <path d={cr.crans} fill={tonOmbre} opacity={0.45} />
                </>
              )}

              {/* étendards du niveau 4, plantés SUR le parapet interne */}
              {n4 &&
                anglesArc(t, 300, 90)
                  .filter((a) => !encoches.some((e) => Math.abs(a - e.a) < e.da * 2))
                  .map((a, i) => {
                    const p = pt(gi, a)
                    return <Etendard key={a} x={p.x} y={p.y - H - 2.6} c={i % 2 ? '#c9a441' : '#b3543f'} />
                  })}
            </g>
          )
        })()}

      {/* fissures : une entaille qui suit les joints, lèvre claire à l'ouest */}
      {fissures.map((a, i) => {
        const p = pt(geo, a)
        const y = p.y - crete + c.par + 2
        const d = `M${p.x.toFixed(1)},${y.toFixed(1)}l2.6,${(c.hAssise * 0.9).toFixed(1)}l-3.6,0.6l2.4,${(c.hAssise * 0.9).toFixed(1)}l-3.4,0.7l2.2,${(c.hAssise * 0.8).toFixed(1)}`
        return (
          <g key={i}>
            <path d={d} stroke="#4f4335" strokeWidth={1.7} fill="none" />
            <path d={d} stroke="#e6dfcb" strokeWidth={0.7} fill="none" transform="translate(-1,-0.4)" opacity={0.65} />
            <ellipse cx={p.x + 1} cy={p.y + 1} rx={4.4} ry={2} fill="#9d9585" opacity={0.8} />
            <ellipse cx={p.x} cy={p.y + 0.4} rx={2.6} ry={1.2} fill="#bfb7a5" opacity={0.8} />
          </g>
        )
      })}

      {/* pans effondrés hors de la porte - chaque secteur cède à son endroit */}
      {pans.map((a) => (
        <Decombres key={a} geo={geo} angle={a} crete={crete} ep={c.W} arriere={arriere} bois={niveau === 1} />
      ))}

      {/* LES TOURS, dessinées POUR leur niveau de mur et encastrées dedans */}
      {n3 || niveau === 2
        ? toursPosees.map((tp) => (
            <TourMur key={`${tp.a}${tp.guet ? 'g' : ''}`} geo={geo} a={tp.a} niveau={niveau} arriere={arriere} guet={tp.guet} span={span} />
          ))
        : null}

      {!arriere && span >= 1 && <Porte geo={geo} niveau={niveau} breche={breche} />}
    </g>
  )
})
