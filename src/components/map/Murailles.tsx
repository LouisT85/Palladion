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
 *   remblai, éperons, chaînage, volées, appentis, aucune archère.
 *
 * R5 — TOUT OUVRAGE DU DEDANS A UNE ÉPAISSEUR. Un ouvrage qui avance de d px de
 *   PLAN dans la place a son pied `saillie(gi, a, −d)` px PLUS BAS À L'ÉCRAN que
 *   la base du parement. Chaque pièce a DEUX appuis - son pied sur la ligne de
 *   sol de SA profondeur, son sommet contre le parement.
 *
 * R6 — LA PROFONDEUR NE SE DIT PAS PAR UN DÉCALÉ EN X. Au nord de l'ellipse
 *   cos a → 0 : `saillie` n'y rend presque QUE du y. Un volume qui comptait sur
 *   son décalé horizontal pour se lire y devenait plat - l'appentis y était un
 *   rectangle de 23,7 px cisaillé de 5,4, une planche peinte sur le mur, et
 *   c'est ce « truc en bois » que le joueur a signalé. Ce qui fuit doit donc
 *   RÉTRÉCIR (faîte plus étroit que l'égout, éperon à fruit) et porter des
 *   lignes qui joignent l'avant à l'arrière (chevrons, glacis, lits de pierre).
 *   Corollaire : ce qui court le long de l'arc (replats du remblai) ne peut pas
 *   se dresser, ce qui descend la pente le peut - au nord, une coulée devient
 *   un piquet.
 *
 * R7 — TOUT OUVRAGE POSÉ SUR LA CRÊTE SE MESURE EN PLAN, ET SE TERMINE. Deux
 *   pièges se sont refermés au même endroit - les deux extrémités est et ouest,
 *   là où la tangente se dresse - et sur deux ouvrages différents :
 *     · une LONGUEUR d'écran constante met l'ouvrage EN TRAVERS de la crête au
 *       lieu de l'y coucher : la longueur se cote en plan, `etire(geo, a)` la
 *       projette (c'est à `saillie` ce que la longueur est à la profondeur) ;
 *     · une section constante fait finir l'ouvrage sur une COUPE FRANCHE. Un
 *       ouvrage de bois s'arrête sur un pignon, un poteau cornier, un about de
 *       poutre ; un ouvrage de TERRE ne s'arrête pas du tout, il s'amortit -
 *       `biseau` / `rubanMourant` l'éteignent sur une longueur d'arc.
 *   Corollaire de R2 : quand une pièce perd sa lisibilité aux extrémités, une
 *   AUTRE doit la reprendre - le bardage du hourd cède au plancher en
 *   encorbellement et aux abouts de poutre, qui eux s'y ouvrent.
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

/**
 * ÉTIREMENT DE L'ARC : 1 px de PLAN mesuré LE LONG du mur vaut `etire` px
 * d'écran le long de la tangente. C'est le pendant, POUR LES LONGUEURS, de ce
 * que `saillie` est pour les profondeurs - il vaut 1 au nord et au sud, k à
 * l'est et à l'ouest.
 *
 * Sans lui, un ouvrage POSÉ sur la crête garde sa longueur d'écran partout :
 * l'échafaud de guet du niveau 1 restait un plancher horizontal de 15 px là où
 * la crête se dresse, donc EN TRAVERS d'elle. Avec lui il se couche dessus.
 */
function etire(geo: GeoMur, a: number): number {
  return Math.hypot(Math.sin(a), komp(geo) * Math.cos(a))
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

/** abscisse curviligne ÉCRAN d'un angle, lue dans la table de R1 */
function absDe(t: Abs, a: number): number {
  const n = t.as.length - 1
  const d = t.as[n] - t.as[0]
  if (Math.abs(d) < 1e-9) return 0
  const f = Math.max(0, Math.min(n, ((a - t.as[0]) / d) * n))
  const i = Math.min(n - 1, Math.floor(f))
  return t.ss[i] + (t.ss[i + 1] - t.ss[i]) * (f - i)
}

/**
 * BISEAU D'ABOUT : 0 à l'extrémité de l'arc, 1 au-delà de `px` px d'ARC ÉCRAN,
 * raccord doux entre les deux - et mesuré en arc, jamais en angle (R1).
 *
 * Un arc de couche va du point ouest à la porte : il a donc DEUX bouts, et tout
 * ouvrage à section constante s'y termine sur une coupe franche. C'est
 * supportable pour un mur, qui a le droit de finir net sur une joue de pierre ;
 * ça ne l'est pas pour un ouvrage de TERRE, qui n'a pas de tranche.
 */
function biseau(t: Abs, a: number, px: number): number {
  if (px <= 0) return 1
  const s = absDe(t, a)
  const u = Math.max(0, Math.min(1, Math.min(s, t.L - s) / px))
  return u * u * (3 - 2 * u)
}

/**
 * Ruban dont la hauteur ET la profondeur MEURENT aux deux bouts, en se rabattant
 * sur la ligne `dyFin` du nu. Le remblai était dessiné à section constante : au
 * point ouest et à la porte, où sa profondeur ne se projette plus qu'en x, il se
 * terminait sur une dalle brune de `profTal` px de large tranchée net dans
 * l'herbe - la « fin plate » signalée par le joueur. Un talus, lui, s'amortit.
 */
function rubanMourant(
  g: GeoMur,
  t: Abs,
  dyA: number,
  dyB: number,
  a0: number,
  a1: number,
  n: number,
  outA: number,
  outB: number,
  dyFin: number,
  fonduPx: number,
): string {
  let d = ''
  for (let s = 0; s < 2; s++) {
    const dy = s === 0 ? dyA : dyB
    const out = s === 0 ? outA : outB
    for (let j = 0; j <= n; j++) {
      const i = s === 0 ? j : n - j
      const a = a0 + ((a1 - a0) * i) / n
      const f = biseau(t, a, fonduPx)
      const p = pt(g, a)
      const u = saillie(g, a, out * f)
      d += `${d === '' ? 'M' : 'L'}${(p.x + u.dx).toFixed(1)},${(p.y + dyFin + (dy - dyFin) * f + u.dy).toFixed(1)}`
    }
  }
  return d + 'Z'
}

/** la même extinction, pour une polyligne (crête du talus, pied, contact) */
function ligneMourante(
  g: GeoMur,
  t: Abs,
  a0: number,
  a1: number,
  n: number,
  dy: number,
  dOut: number,
  dyFin: number,
  fonduPx: number,
): string {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    const f = biseau(t, a, fonduPx)
    const p = pt(g, a)
    const u = saillie(g, a, dOut * f)
    d += `${i === 0 ? 'M' : 'L'}${(p.x + u.dx).toFixed(1)},${(p.y + dyFin + (dy - dyFin) * f + u.dy).toFixed(1)}`
  }
  return d
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
      {/* le REMBLAI du dedans : terre battue, claire à l'ouest, sourde à l'est */}
      <linearGradient id="mur-terre" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#8f7a4c" />
        <stop offset="45%" stopColor="#7a6640" />
        <stop offset="100%" stopColor="#54452a" />
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
 * ═══════════════ LES ÉCHAFAUDS DE GUET (niveau 1) ═══════════════
 *
 * Une palissade n'a pas de chemin de ronde : pour voir par-dessus, on monte des
 * échafauds. Dessinés en ÉLÉVATION FRONTALE - un plancher de 15 px, deux
 * montants qui montent, une traverse par-dessus -, ils se lisaient comme des
 * TABLES posées sur les pointes : rien dessous, rien derrière, personne dessus.
 * Le joueur a demandé ce que ça représentait, et il avait raison de ne pas
 * comprendre. Quatre pièces le disent, et c'étaient les quatre qui manquaient :
 *
 *  · LE PLANCHER A UNE ÉPAISSEUR. Sa tranche ET son dessus, pris entre le nu de
 *    la palissade et une ellipse `dP` px de plan en deçà : un anneau, qui se
 *    pince au nord et au sud et S'OUVRE à l'est et à l'ouest (R3). La table
 *    devient une caisse - et aux deux extrémités, là où la crête se dresse,
 *    c'est le DESSUS du plancher qui porte à lui seul tout le volume. Sa
 *    longueur, elle, est une longueur de PLAN (`etire`) : à longueur d'écran
 *    constante il se mettait en travers de la crête au lieu de s'y coucher.
 *
 *  · LES POTEAUX DESCENDENT AU SOL, derrière le rideau de pieux, donc
 *    `dP·k` px PLUS BAS à l'écran (R5) - contrefiche et échelle comprises. Ils
 *    ne se voient QUE de la couche arrière : de dehors la palissade les cache,
 *    et c'est justement ce qui est juste.
 *
 *  · L'ÉCHAFAUD EST DERRIÈRE LA PALISSADE, pas dessus. Sur la couche avant il
 *    se peint donc AVANT les pieux : les pointes lui passent devant, et cette
 *    seule occlusion dit d'où on regarde. Peint après, il redevenait un objet
 *    posé sur le couronnement - la table.
 *
 *  · UN HOMME Y VEILLE, lance dressée. À vingt pixels de large c'est la
 *    SILHOUETTE qui dit « on veille ici », pas la charpente : le fer de la
 *    lance dépasse la ligne des pointes de 12 px, et c'est le seul accent
 *    vertical d'un rideau de pieux long de 830.
 *
 * C'est la grammaire de `TourMur` - plancher, garde-corps, accès, homme de
 * faction, ombre au pied - transposée au bois et à deux poteaux.
 */
function EchafaudsGuet({
  geo,
  angles,
  crete,
  arriere,
  span,
}: {
  geo: GeoMur
  angles: number[]
  crete: number
  arriere: boolean
  span: number
}) {
  /** longueur du plancher et avancée dans la place, en px de PLAN */
  const Lg = 17
  const dP = 9
  /**
   * Dessus du plancher. Il se cale DANS la ligne des pointes (qui montent de
   * −25 à −29) et non au-dessus : posé plus haut, la caisse flottait de deux px
   * au-dessus des pieux vue du sud. Ici les plus hautes pointes la traversent,
   * et c'est cette interpénétration qui l'assied.
   */
  const yPl = -crete - 2
  const ePl = 3
  const hG = 7.4
  let ombre = ''
  let poteau = ''
  let poteauLum = ''
  let jambes = ''
  let echelle = ''
  let barreaux = ''
  let dessus = ''
  let planches = ''
  let tranche = ''
  let trancheLit = ''
  let montants = ''
  let lisse = ''
  let lisseLit = ''
  let corps = ''
  let tete = ''
  let casque = ''
  let hampe = ''
  let fer = ''
  angles.forEach((a, idx) => {
    const p = pt(geo, a)
    const { tx, ty } = tangente(geo, a)
    const e = etire(geo, a)
    const hx = (tx * Lg * e) / 2
    const hy = (ty * Lg * e) / 2
    // vers le DEDANS : plus bas à l'écran au nord, plus haut au sud (R5)
    const o = saillie(geo, a, -dP)
    // les quatre coins du plancher - deux sur la crête, deux en arrière
    const ax = p.x - hx
    const ay = p.y - hy + yPl
    const bx = p.x + hx
    const by = p.y + hy + yPl
    const ySol = p.y + 2.5 + o.dy
    // DESSUS du plancher : l'anneau entre les deux nus
    dessus +=
      `M${ax.toFixed(1)},${ay.toFixed(1)}L${bx.toFixed(1)},${by.toFixed(1)}` +
      `L${(bx + o.dx).toFixed(1)},${(by + o.dy).toFixed(1)}L${(ax + o.dx).toFixed(1)},${(ay + o.dy).toFixed(1)}Z`
    // les madriers : des lignes qui joignent l'avant à l'arrière (R6)
    for (const f of [-0.34, 0.34]) {
      const jx = p.x + hx * f
      const jy = p.y + hy * f + yPl
      planches +=
        `M${jx.toFixed(1)},${jy.toFixed(1)}L${(jx + o.dx).toFixed(1)},${(jy + o.dy).toFixed(1)}` +
        `L${(jx + o.dx + 0.7).toFixed(1)},${(jy + o.dy).toFixed(1)}L${(jx + 0.7).toFixed(1)},${jy.toFixed(1)}Z`
    }
    // TRANCHE du plancher : celle qu'on voit - l'arrière au nord, l'avant au
    // sud (R4). C'est elle qui pose la caisse sur les pointes.
    const sx = arriere ? o.dx : 0
    const sy = arriere ? o.dy : 0
    tranche +=
      `M${(ax + sx).toFixed(1)},${(ay + sy).toFixed(1)}L${(bx + sx).toFixed(1)},${(by + sy).toFixed(1)}` +
      `L${(bx + sx).toFixed(1)},${(by + sy + ePl).toFixed(1)}L${(ax + sx).toFixed(1)},${(ay + sy + ePl).toFixed(1)}Z`
    trancheLit +=
      `M${(ax + sx).toFixed(1)},${(ay + sy).toFixed(1)}L${(bx + sx).toFixed(1)},${(by + sy).toFixed(1)}` +
      `L${(bx + sx).toFixed(1)},${(by + sy + 0.9).toFixed(1)}L${(ax + sx).toFixed(1)},${(ay + sy + 0.9).toFixed(1)}Z`
    // GARDE-CORPS, au nu de la palissade : des montants FINS et une lisse
    // continue - rien à voir avec un pieu de 5,4 px taillé en pointe
    for (const f of [-0.86, 0, 0.86]) {
      const mx = p.x + hx * f
      const my = p.y + hy * f + yPl
      montants += `M${(mx - 0.85).toFixed(1)},${(my - hG).toFixed(1)}h1.7v${(hG + 0.6).toFixed(1)}h-1.7Z`
    }
    lisse +=
      `M${(ax - tx * 1.2).toFixed(1)},${(ay - ty * 1.2 - hG).toFixed(1)}L${(bx + tx * 1.2).toFixed(1)},${(by + ty * 1.2 - hG).toFixed(1)}` +
      `L${(bx + tx * 1.2).toFixed(1)},${(by + ty * 1.2 - hG + 1.8).toFixed(1)}L${(ax - tx * 1.2).toFixed(1)},${(ay - ty * 1.2 - hG + 1.8).toFixed(1)}Z`
    lisseLit +=
      `M${(ax - tx * 1.2).toFixed(1)},${(ay - ty * 1.2 - hG).toFixed(1)}L${(bx + tx * 1.2).toFixed(1)},${(by + ty * 1.2 - hG).toFixed(1)}` +
      `L${(bx + tx * 1.2).toFixed(1)},${(by + ty * 1.2 - hG + 0.7).toFixed(1)}L${(ax - tx * 1.2).toFixed(1)},${(ay - ty * 1.2 - hG + 0.7).toFixed(1)}Z`
    /*
     * LA CHARPENTE. Elle se peint sur LES DEUX couches, et non sur la seule
     * couche arrière comme on l'avait d'abord posé : au sud franc la palissade
     * la couvre entièrement (elle est peinte après, cf. plus bas), mais au
     * sud-est et au sud-ouest le décalé de profondeur a une grosse composante
     * en x - le plancher déborde la silhouette du rideau, et il y débordait
     * SANS pieds. L'occlusion s'obtient par l'ordre de peinture, jamais par un
     * drapeau : ce qui doit être caché, la palissade le cache.
     */
    {
      // POTEAUX : du dessous du plancher jusqu'au sol de LEUR profondeur - le
      // seul trait qui change la table en ouvrage
      for (const f of [-0.72, 0.72]) {
        const qx = p.x + hx * f + o.dx
        const qy = p.y + hy * f + o.dy + yPl + ePl - 0.4
        poteau += `M${(qx - 1.15).toFixed(1)},${qy.toFixed(1)}h2.3V${ySol.toFixed(1)}h-2.3Z`
        poteauLum += `M${(qx - 1.15).toFixed(1)},${qy.toFixed(1)}h0.8V${ySol.toFixed(1)}h-0.8Z`
        ombre +=
          `M${(qx - 1.3).toFixed(1)},${ySol.toFixed(1)}L${(qx + 1.3).toFixed(1)},${ySol.toFixed(1)}` +
          `L${(qx + 6.4).toFixed(1)},${(ySol + 2.2).toFixed(1)}L${(qx + 3.4).toFixed(1)},${(ySol + 2.2).toFixed(1)}Z`
      }
      // CONTREFICHE : la jambe de force qui l'empêche de se coucher
      const jx0 = p.x - hx * 0.72 + o.dx
      const jx1 = p.x + hx * 0.55 + o.dx
      const jy1 = p.y + hy * 0.55 + o.dy + yPl + ePl
      jambes +=
        `M${jx0.toFixed(1)},${ySol.toFixed(1)}L${(jx0 + 1.6).toFixed(1)},${ySol.toFixed(1)}` +
        `L${(jx1 + 1.6).toFixed(1)},${jy1.toFixed(1)}L${jx1.toFixed(1)},${jy1.toFixed(1)}Z`
      // ÉCHELLE, appuyée contre l'about ouest du plancher : on monte par là,
      // et ses montants le dépassent de 2 px comme toute échelle posée
      const ex0 = ax + o.dx * 0.5
      const ey0 = ay + o.dy * 0.5 - 2.2
      const fx0 = ex0 - 3.6 + o.dx * 0.3
      for (const s of [-1.7, 0.8]) {
        echelle +=
          `M${(ex0 + s).toFixed(1)},${ey0.toFixed(1)}L${(ex0 + s + 0.9).toFixed(1)},${ey0.toFixed(1)}` +
          `L${(fx0 + s + 0.9).toFixed(1)},${ySol.toFixed(1)}L${(fx0 + s).toFixed(1)},${ySol.toFixed(1)}Z`
      }
      for (let i = 1; i <= 5; i++) {
        const g = i / 6
        const rx0 = ex0 + (fx0 - ex0) * g
        const ry0 = ey0 + (ySol - ey0) * g
        barreaux += `M${(rx0 - 1.7).toFixed(1)},${ry0.toFixed(1)}h3.4v0.85h-3.4Z`
      }
    }
    /*
     * L'HOMME DE FACTION. Campé au MILIEU du plancher, il tombait pile derrière
     * le montant central du garde-corps - qui se peint après lui, puisque de
     * dehors c'est son parapet : il n'en restait qu'une tête au-dessus de la
     * lisse et une fente de tunique. Il se tient donc dans une TRAVÉE, entre
     * deux montants, et alternativement d'un côté puis de l'autre.
     */
    if (span >= 1) {
      const sg = idx % 2 ? -1 : 1
      const wx = p.x + o.dx * 0.5 + hx * sg * 0.43
      const wy = p.y + o.dy * 0.5 + hy * sg * 0.43 + yPl + 0.6
      corps +=
        `M${(wx - 2.1).toFixed(1)},${wy.toFixed(1)}L${(wx - 1.5).toFixed(1)},${(wy - 5.6).toFixed(1)}` +
        `L${(wx + 1.5).toFixed(1)},${(wy - 5.6).toFixed(1)}L${(wx + 2.1).toFixed(1)},${wy.toFixed(1)}Z`
      tete += `M${(wx - 1.8).toFixed(1)},${(wy - 7.4).toFixed(1)}a1.8,1.8 0 1,0 3.6,0a1.8,1.8 0 1,0 -3.6,0Z`
      casque +=
        `M${(wx - 1.9).toFixed(1)},${(wy - 7.7).toFixed(1)}A1.9,1.9 0 0 1 ${(wx + 1.9).toFixed(1)},${(wy - 7.7).toFixed(1)}` +
        `L${(wx + 1.9).toFixed(1)},${(wy - 7.1).toFixed(1)}L${(wx - 1.9).toFixed(1)},${(wy - 7.1).toFixed(1)}Z`
      const lx = wx + sg * 2.9
      hampe += `M${(lx - 0.5).toFixed(1)},${(wy - 13.2).toFixed(1)}h1v13.8h-1Z`
      fer += `M${(lx - 1.3).toFixed(1)},${(wy - 13).toFixed(1)}L${lx.toFixed(1)},${(wy - 16.6).toFixed(1)}L${(lx + 1.3).toFixed(1)},${(wy - 13).toFixed(1)}Z`
    }
  })
  const gardeCorps = (
    <>
      <path d={montants} fill="#7d5e39" />
      <path d={lisse} fill="#8b6a40" />
      <path d={lisseLit} fill="#c1996a" opacity={0.9} />
    </>
  )
  return (
    <g>
      {/* le pied des poteaux, dans la place */}
      <path d={ombre} fill={PAL.ombrePortee} opacity={0.17} />
      <path d={jambes} fill="#5c4227" />
      <path d={poteau} fill="#6a4e2d" />
      <path d={poteauLum} fill="#96713f" opacity={0.85} />
      {/* le garde-corps du FOND passe derrière le plancher */}
      {arriere && gardeCorps}
      {/* du dedans le plancher prend le jour ; du dehors on ne l'aperçoit
          qu'entre les montants, dans l'ombre du garde-corps */}
      <path d={dessus} fill={arriere ? '#a8845d' : '#5f4830'} />
      <path d={planches} fill={arriere ? '#6a4e2d' : '#4a3620'} opacity={0.7} />
      <path d={tranche} fill="#5c4227" />
      <path d={trancheLit} fill="#8b6a40" />
      {/* l'échelle est appuyée SUR la tranche, elle la croise */}
      <path d={echelle} fill="#8b6a40" />
      <path d={barreaux} fill="#5c4227" />
      <path d={corps} fill="#4a6a5a" />
      <path d={hampe} fill="#5f462d" />
      <path d={fer} fill="#cfc7b2" />
      <path d={tete} fill={PAL.peau} />
      <path d={casque} fill="#8f8a7c" />
      {/* … et devant lui au sud : c'est son parapet */}
      {!arriere && gardeCorps}
    </g>
  )
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

/*
 * ═════════ R5 — LES OUVRAGES DU DEDANS ONT UNE ÉPAISSEUR ═════════
 *
 * Un mur ne tient pas parce qu'il est épais : il tient parce qu'on l'épaule du
 * DEDANS. Quatre pièces le font ici - le remblai qui encaisse le bélier, les
 * éperons qui le prennent à revers, le chaînage qui le ceinture, les volées
 * qui montent au chemin de ronde - et toutes obéissent à la règle qui manquait :
 *
 *   UN OUVRAGE QUI AVANCE DE d PX DE PLAN DANS LA PLACE A SON PIED
 *   `saillie(gi, a, −d)` PLUS BAS À L'ÉCRAN QUE LA BASE DU PAREMENT.
 *
 * L'appentis était dessiné SANS ce terme : posé sur la base du parement comme
 * s'il avait zéro épaisseur, il flottait de d·k px au-dessus de l'endroit où
 * tombait son ombre - 6,7 px au niveau 3, 8,9 px au niveau 4 -, et son pan de
 * toit, un simple rectangle incliné, ne s'appuyait sur rien. Toute pièce du
 * dedans a donc désormais DEUX appuis : son pied sur la ligne de sol de SA
 * profondeur, son sommet contre le parement.
 */
interface Dedans {
  /** hauteur du remblai contre le parement */
  hTal: number
  /** avancée en plan du PIED du remblai dans la place */
  profTal: number
  /** éperons : avancée du nu avant, largeur en plan, hauteur, pas d'arc */
  profEp: number
  largEp: number
  hEp: number
  pasEp: number
  /** appentis : avancée du nu avant, demi-largeur, faîte, poteaux */
  profApp: number
  demApp: number
  hApp: number
  hPot: number
}

/**
 * Les cotes du dedans se DÉDUISENT de celles du mur - aucune n'est écrite deux
 * fois, et un niveau 4 est donc épaulé plus fort qu'un niveau 3 sans réglage.
 *
 * DEUX de ces cotes étaient fausses, et c'est tout ce qui manquait à la face
 * interne pour tenir debout :
 *
 *  · `profTal = 1,6·W` donnait au remblai 12 px de PLAN au niveau 3, soit
 *    12·k·|sin a| = 7 px d'écran au nord. Un talus de 7 px au pied d'un mur de
 *    27 n'est pas un talus, c'est un filet d'ombre. Un remblai de terre ne tient
 *    pas plus raide que 1,25 de base pour 1 de haut : son pied avance donc de
 *    l'épaisseur du mur PLUS 1,25 fois sa propre hauteur, et il se voit.
 *
 *  · `hEp = 0,62·H` arrêtait l'éperon à 10,3 px SOUS le chemin de ronde (n3) -
 *    17,1 px SOUS l'arase au niveau 4 : le massif ne touchait rien en haut, se
 *    coiffait d'un chapeau clair et se lisait comme une stèle plantée devant le
 *    mur. Un contrefort meurt CONTRE le parement, juste sous le bahut, par un
 *    glacis qui rend l'eau au mur. Le défaut était partagé par les niveaux 3
 *    ET 4 : il fallait le corriger dans la cote, pas dans un dessin.
 */
function cotesDedans(c: Cote): Dedans {
  const hTal = c.H * 0.34
  const profTal = c.W * 1.6 + hTal * 1.25
  return {
    hTal,
    profTal,
    // éperons et appentis dépassent le pied du remblai : leur pied est AU SOL,
    // et c'est la terre qui vient s'entasser entre eux et les border
    /*
     * L'ÉPERON EST LARGE ET PEU SAILLANT, PAS ÉTROIT ET PROFOND. Mené jusqu'au
     * pied du talus (profTal + 4 = 27,5 px de plan au niveau 3) son flanc
     * s'étalait de profEp·|cos a| = 21,7 px à l'écran vers l'ouest de l'arc :
     * une plaque pâle plus large que haute, qui mangeait le mur. Réduit sans
     * être élargi, il devenait un pilier de 10 px pour 27 de haut - une stèle.
     * Une épaisseur de mur en saillie pour 1,6 en largeur donne un CONTREFORT :
     * le même rapport que ceux du dehors, qui eux se lisent déjà bien.
     */
    profEp: c.W,
    largEp: c.W * 1.6,
    hEp: c.H - 3.4,
    pasEp: 42 + c.H * 0.8,
    profApp: profTal + 6,
    demApp: 10,
    // le faîte passe SOUS le lit de chaînage haut (0,78·H) : l'appentis se range
    // dans la structure du mur au lieu de la trancher
    hApp: c.H * 0.66,
    hPot: c.H * 0.52,
  }
}

/**
 * ÉPERONS INTÉRIEURS : le pendant du contrefort extérieur, côté place. Massif
 * qui naît large et EN AVANT au sol, et meurt CONTRE le parement juste sous le
 * bahut - ce double appui est tout ce qui le distingue d'une stèle posée là.
 * Huit chemins pour tous les massifs de la couche.
 *
 * Trois pièces le font APPARTENIR au mur, et elles manquaient toutes les trois :
 *  · le GLACIS - le versant qui coiffe le massif et rend l'eau au parement ; un
 *    chapeau horizontal, lui, disait « ce bloc s'arrête ici » ;
 *  · le FRUIT - le nu avant se rapproche du mur en montant (0,62 de la saillie
 *    au sommet) : un prisme droit se lit comme une armoire, un massif à fruit
 *    comme une poussée ;
 *  · la BERGE de terre qui vient border son pied : sans elle le massif est posé
 *    SUR le remblai au lieu d'en sortir.
 */
function eperons(gi: GeoMur, angles: number[], d: Dedans, H: number, hA: number) {
  let ombre = ''
  let face = ''
  let faceOmbre = ''
  let flancJour = ''
  let flancOmbre = ''
  let glacis = ''
  let arete = ''
  let pied = ''
  let joints = ''
  let berge = ''
  const { largEp: larg, profEp: prof, hEp, hTal } = d
  /** fraction de la saillie encore tenue au sommet : le fruit du massif */
  const fT = 0.74
  for (const a of angles) {
    const p = pt(gi, a)
    const { tx, ty } = tangente(gi, a)
    const o = saillie(gi, a, -prof)
    const demi = (larg * Math.abs(tx)) / 2 + 1.1
    const demiT = demi * 0.9
    /*
     * UN PRISME, PAS UN QUADRILATÈRE PENCHÉ. Dessiné d'un seul tenant entre son
     * pied (avancé de `prof`) et son sommet (contre le parement), le massif se
     * couchait : le décalé écran de la profondeur devenait une INCLINAISON, et
     * on lisait une planche appuyée au mur. Ici les faces sont séparées - nu
     * AVANT à fruit, FLANC (celui que la profondeur découvre), GLACIS entre le
     * sommet du nu avant et le parement -, et le décalé redevient de l'épaisseur.
     */
    const sw = tx >= 0 ? -1 : 1
    // quatre points du PAREMENT : les deux joues, en bas et en haut
    const wx = p.x + sw * tx * demi
    const wy = p.y + sw * ty * demi
    const ex = p.x - sw * tx * demi
    const ey = p.y - sw * ty * demi
    const wxT = p.x + sw * tx * demiT
    const wyT = p.y + sw * ty * demiT
    const exT = p.x - sw * tx * demiT
    const eyT = p.y - sw * ty * demiT
    // les mêmes, portés au NU AVANT : plein décalé en bas, `fT` en haut
    const wxA = wx + o.dx
    const wyA = wy + o.dy
    const exA = ex + o.dx
    const eyA = ey + o.dy
    const wxB = wxT + o.dx * fT
    const wyB = wyT + o.dy * fT - hEp
    const exB = exT + o.dx * fT
    const eyB = eyT + o.dy * fT - hEp
    // NU AVANT : planté au SOL à `prof` px de plan du mur, et qui se resserre
    face +=
      `M${wxA.toFixed(1)},${(wyA + 2).toFixed(1)}L${exA.toFixed(1)},${(eyA + 2).toFixed(1)}` +
      `L${exB.toFixed(1)},${eyB.toFixed(1)}L${wxB.toFixed(1)},${wyB.toFixed(1)}Z`
    // le tiers EST du nu avant tourne à l'ombre : c'est ce qui lui donne son
    // volume sans le moindre contour
    const gm = 0.66
    faceOmbre +=
      `M${(wxA + (exA - wxA) * gm).toFixed(1)},${(wyA + (eyA - wyA) * gm + 2).toFixed(1)}L${exA.toFixed(1)},${(eyA + 2).toFixed(1)}` +
      `L${exB.toFixed(1)},${eyB.toFixed(1)}L${(wxB + (exB - wxB) * gm).toFixed(1)},${(wyB + (eyB - wyB) * gm).toFixed(1)}Z`
    // GLACIS : le versant qui monte du nu avant jusqu'au parement, 2,6 px plus
    // haut - c'est LUI qui soude le massif au mur
    glacis +=
      `M${wxB.toFixed(1)},${wyB.toFixed(1)}L${exB.toFixed(1)},${eyB.toFixed(1)}` +
      `L${exT.toFixed(1)},${(eyT - hEp - 2.6).toFixed(1)}L${wxT.toFixed(1)},${(wyT - hEp - 2.6).toFixed(1)}Z`
    // l'arête du glacis prend le jour : le liseré clair de la bible, jamais noir
    arete += `M${wxB.toFixed(1)},${wyB.toFixed(1)}L${exB.toFixed(1)},${eyB.toFixed(1)}L${exB.toFixed(1)},${(eyB + 1.1).toFixed(1)}L${wxB.toFixed(1)},${(wyB + 1.1).toFixed(1)}Z`
    // FLANC : celui que le décalé découvre. Le nu avant part-il vers l'est
    // (o.dx > 0) ? alors c'est le flanc OUEST qu'on voit, et il prend le jour.
    const ouest = o.dx >= 0
    const cx = ouest ? wx : ex
    const cy = ouest ? wy : ey
    const cxT = ouest ? wxT : exT
    const cyT = ouest ? wyT : eyT
    const cxB = ouest ? wxB : exB
    const cyB = ouest ? wyB : eyB
    const cf =
      `M${cx.toFixed(1)},${(cy + 2).toFixed(1)}L${(cx + o.dx).toFixed(1)},${(cy + o.dy + 2).toFixed(1)}` +
      `L${cxB.toFixed(1)},${cyB.toFixed(1)}L${cxT.toFixed(1)},${(cyT - hEp - 2.6).toFixed(1)}Z`
    if (ouest) flancJour += cf
    else flancOmbre += cf
    // occlusion au pied du nu avant : sans elle le massif reste posé, pas planté
    pied += `M${wxA.toFixed(1)},${(wyA - 1).toFixed(1)}L${exA.toFixed(1)},${(eyA - 1).toFixed(1)}L${exA.toFixed(1)},${(eyA + 2).toFixed(1)}L${wxA.toFixed(1)},${(wyA + 2).toFixed(1)}Z`
    /*
     * LES LITS DU MASSIF SONT CEUX DU MUR. Trois joints posés à des fractions
     * arbitraires de sa hauteur faisaient un objet à part, appuyé contre la
     * courtine ; alignés sur les assises du parement (`hA`, comptées depuis le
     * chemin de ronde comme celles de `assisesArc`), ils font un massif LIÉ à
     * la maçonnerie - c'est le chaînage qui se voit, pas un placage.
     */
    for (let r = 1; (r + 1) * hA < H - 2; r++) {
      const f = (H - 2 - (r + 1) * hA) / hEp
      if (f < 0.06 || f > 0.96) continue
      const gx0 = wxA + (wxB - wxA) * f
      const gy0 = wyA + 2 + (wyB - wyA - 2) * f
      const gx1 = exA + (exB - exA) * f
      const gy1 = eyA + 2 + (eyB - eyA - 2) * f
      joints +=
        `M${gx0.toFixed(1)},${gy0.toFixed(1)}L${gx1.toFixed(1)},${gy1.toFixed(1)}` +
        `L${gx1.toFixed(1)},${(gy1 + 0.9).toFixed(1)}L${gx0.toFixed(1)},${(gy0 + 0.9).toFixed(1)}Z`
      // le même lit court sur le FLANC : c'est lui qui dit que la masse recule
      const px0 = cx + (cxT - cx) * f
      const py0 = cy + 2 + (cyT - hEp - 4.6 - cy) * f
      const qx0 = cx + o.dx + (cxB - cx - o.dx) * f
      const qy0 = cy + o.dy + 2 + (cyB - cy - o.dy - 2) * f
      joints +=
        `M${px0.toFixed(1)},${py0.toFixed(1)}L${qx0.toFixed(1)},${qy0.toFixed(1)}` +
        `L${qx0.toFixed(1)},${(qy0 + 0.9).toFixed(1)}L${px0.toFixed(1)},${(py0 + 0.9).toFixed(1)}Z`
    }
    // BERGE : la terre du remblai vient border le pied du massif. Peinte APRÈS
    // lui, elle l'enterre de 3 px et c'est ce qui le fait sortir du sol.
    const bw = (wxA + exA) / 2
    const bh = (wyA + eyA) / 2 + 2
    berge +=
      `M${(wxA - 4.2).toFixed(1)},${(wyA + 2.2).toFixed(1)}Q${bw.toFixed(1)},${(bh - 5.4).toFixed(1)} ${(exA + 4.2).toFixed(1)},${(eyA + 2.2).toFixed(1)}` +
      `L${(exA + 4.2).toFixed(1)},${(eyA + 3.6).toFixed(1)}L${(wxA - 4.2).toFixed(1)},${(wyA + 3.6).toFixed(1)}Z`
    /*
     * L'OMBRE PORTÉE S'ARRÊTE AU REMBLAI. Menée jusqu'au pied du massif elle
     * débordait sur l'herbe en une nappe grise : le massif est en avant du mur,
     * mais son ombre tombe sur le PAREMENT, qui s'arrête à la crête du talus.
     */
    const s = Math.max(4.6, prof * 0.8)
    const yC = p.y - hTal
    ombre +=
      `M${ex.toFixed(1)},${(ey - hEp - 2.6).toFixed(1)}L${(ex + s).toFixed(1)},${(ey - hEp - 2.6 + s * 0.42).toFixed(1)}` +
      `L${(ex + s).toFixed(1)},${(yC + s * 0.42).toFixed(1)}L${ex.toFixed(1)},${yC.toFixed(1)}Z`
  }
  return { ombre, face, faceOmbre, flancJour, flancOmbre, glacis, arete, pied, joints, berge }
}

/**
 * ═══════════ CE QUI POUSSE ET CE QUI SE CREUSE SUR LE REMBLAI ═══════════
 *
 * Le talus du dedans est la plus grande surface de tout l'intérieur - il couvre
 * la moitié basse du mur sur ses huit cents pixels d'arc - et il n'avait qu'une
 * chose : sa couleur. Un dégradé, un voile clair, une ombre au pied. Le joueur a
 * eu le mot juste : « à l'intérieur c'est vraiment pas ça ». Dehors chaque
 * assise, chaque contrefort, chaque merlon porte trois valeurs ; dedans, une
 * bande unie de terre.
 *
 * Trois manques, et ce sont ceux d'une PENTE :
 *  · une pente a un VENTRE. Sans une ombre à mi-hauteur, deux tons superposés
 *    font un ruban plat, jamais un talus ;
 *  · une pente de terre VIT. De l'herbe pousse là où l'on ne marche pas - donc
 *    partout sauf sur la crête - et des touffes rompent la ligne interminable ;
 *  · une pente de terre S'USE. La pluie y creuse des rigoles verticales, et les
 *    hommes y tracent un sentier battu le long de la crête, celui qui mène aux
 *    volées.
 *
 * Tout se coupe au biseau du remblai (`fd`) : sans quoi l'herbe continuerait de
 * pousser là où la terre s'est déjà éteinte, sur l'herbe de la plaine.
 */
function garnitureTalus(
  gi: GeoMur,
  t: Abs,
  a0: number,
  a1: number,
  nC: number,
  hTal: number,
  profTal: number,
  fd: number,
  seed: number,
): { ventre: string; sentier: string; rigoles: string; herbe: string; herbeClair: string } {
  const rnd = alea(seed)
  // le ventre de la pente : une ombre entre la crête et le pied, décalée vers
  // l'aval - c'est elle qui donne la courbure, la seule pièce indispensable
  const ventre = rubanMourant(gi, t, -hTal * 0.62, -hTal * 0.06, a0, a1, nC, -profTal * 0.22, -profTal * 0.66, 2, fd)
  // le sentier battu de la crête : la terre y est tassée et claire
  const sentier = ligneMourante(gi, t, a0, a1, nC, -hTal * 0.86, -profTal * 0.1, 2, fd)
  let rigoles = ''
  let herbe = ''
  let herbeClair = ''
  for (const a of anglesArc(t, 21, 9)) {
    const bi = biseau(t, a, fd)
    if (bi < 0.2) continue
    const p = pt(gi, a)
    const hT = hTal * bi
    // ── rigole : la pluie descend la pente, donc DANS le sens du dévers ──
    if (rnd() > 0.42) {
      const f0 = 0.24 + rnd() * 0.2
      const f1 = 0.82 + rnd() * 0.16
      const o0 = saillie(gi, a, -profTal * bi * f0)
      const o1 = saillie(gi, a, -profTal * bi * f1)
      const y0 = p.y - hT + (hT + 2) * f0 + o0.dy
      const y1 = p.y - hT + (hT + 2) * f1 + o1.dy
      const lg = 1 + rnd() * 1.1
      rigoles +=
        `M${(p.x + o0.dx).toFixed(1)},${y0.toFixed(1)}` +
        `L${(p.x + o0.dx + lg).toFixed(1)},${(y0 + 0.4).toFixed(1)}` +
        `L${(p.x + o1.dx + lg * 0.5).toFixed(1)},${y1.toFixed(1)}` +
        `L${(p.x + o1.dx).toFixed(1)},${(y1 - 0.3).toFixed(1)}Z`
    }
    // ── touffes : sur le flanc, jamais sur le sentier de crête ──
    const n = 1 + Math.floor(rnd() * 2)
    for (let k = 0; k < n; k++) {
      const f = 0.34 + rnd() * 0.6
      const o = saillie(gi, a, -profTal * bi * f)
      const gx = p.x + o.dx + (rnd() - 0.5) * 7
      const gy = p.y - hT + (hT + 2) * f + o.dy
      const h = 1.8 + rnd() * 1.9
      herbe +=
        `M${gx.toFixed(1)},${gy.toFixed(1)}l${(-h * 0.5).toFixed(1)},${(-h).toFixed(1)}` +
        `M${gx.toFixed(1)},${gy.toFixed(1)}l${(h * 0.12).toFixed(1)},${(-h * 1.25).toFixed(1)}` +
        `M${gx.toFixed(1)},${gy.toFixed(1)}l${(h * 0.62).toFixed(1)},${(-h * 0.9).toFixed(1)}`
      herbeClair += `M${gx.toFixed(1)},${gy.toFixed(1)}l${(h * 0.12).toFixed(1)},${(-h * 1.25).toFixed(1)}`
    }
  }
  return { ventre, sentier, rigoles, herbe, herbeClair }
}

/**
 * CHAÎNAGE APPARENT. Le lit de poutres noyé dans la maçonnerie, dont on voit du
 * dedans la course et les TÊTES. Sans lui la face interne restait une bande
 * lisse de 19 px de haut sur 820 px de long : rien n'y disait qu'une structure
 * retenait le mur.
 */
function chainage(
  gi: GeoMur,
  t: Abs,
  a0: number,
  a1: number,
  n: number,
  dy: number,
  hB: number,
  pasTete: number,
  phaseTete: number,
) {
  // la maçonnerie SURPLOMBE la poutre : sans ce creux d'ombre au-dessus, le lit
  // se lisait comme une main courante posée devant le mur, pas comme un bois
  // noyé dedans. C'est cette lecture-là qui faisait un « truc en bois » de plus.
  const creux = ruban(gi, dy - 1.4, gi, dy, a0, a1, n)
  const bande = ruban(gi, dy, gi, dy + hB, a0, a1, n)
  const lit = ruban(gi, dy, gi, dy + hB * 0.34, a0, a1, n)
  const sous = ruban(gi, dy + hB, gi, dy + hB + 0.9, a0, a1, n)
  let tetes = ''
  let tetesLit = ''
  let tetesOmbre = ''
  for (const a of anglesArc(t, pasTete, phaseTete)) {
    const p = pt(gi, a)
    const { tx } = tangente(gi, a)
    const w = 3.4 * Math.max(0.4, Math.abs(tx))
    const y = p.y + dy - 1.1
    const h = hB + 2.2
    tetes += `M${(p.x - w / 2).toFixed(1)},${y.toFixed(1)}h${w.toFixed(1)}v${h.toFixed(1)}h-${w.toFixed(1)}Z`
    tetesLit += `M${(p.x - w / 2).toFixed(1)},${y.toFixed(1)}h${w.toFixed(1)}v1.1h-${w.toFixed(1)}Z`
    // la joue est de la tête, et l'ombre qu'elle jette sur le parement
    tetesOmbre +=
      `M${(p.x + w / 2 - 0.9).toFixed(1)},${y.toFixed(1)}h0.9v${h.toFixed(1)}h-0.9Z` +
      `M${(p.x + w / 2).toFixed(1)},${(y + 0.6).toFixed(1)}l1.6,0.7v${h.toFixed(1)}l-1.6,-0.7Z`
  }
  return { creux, bande, lit, sous, tetes, tetesLit, tetesOmbre }
}

/**
 * ═════════════ APPENTIS DE SERVICE - « LE TRUC EN BOIS » ═════════════
 *
 * C'est la pièce que le joueur a montrée du doigt, et elle flottait pour une
 * raison très précise, qu'aucune retouche de couleur n'aurait réparée :
 *
 *   SON PAN DE TOIT ÉTAIT UN RECTANGLE. Faîte et égout avaient la MÊME
 *   demi-largeur `lg`, et l'écart horizontal entre les deux valait `o.dx`, qui
 *   s'annule au nord de l'ellipse (cos a → 0). Au pan nord de la carte -
 *   exactement la capture - le quadrilatère mesurait 23,7 px de large pour
 *   5,4 px de cisaillement : une PLANCHE peinte à plat sur le parement. Le
 *   caisson sous l'auvent, lui, était rempli de #54432a, plus sombre que tout
 *   ce qui l'entoure : on lisait une ombre, pas un volume. D'où l'impression
 *   d'un rectangle de bois clair accroché à rien.
 *
 * La profondeur, dans cette vue oblique, ne se dit PAS par un décalé en x -
 * il n'en existe pas au nord - mais par un décalé EN Y (`o.dy = prof·k·sin a`)
 * et par le RÉTRÉCISSEMENT de ce qui s'éloigne. L'appentis est donc rebâti sur
 * quatre appuis mesurés :
 *
 *  1. le faîte est CONTRE le parement, à `hApp` du sol du mur, et il est plus
 *     ÉTROIT que l'égout (0,86) : le pan devient un plan qui fuit ;
 *  2. l'égout est porté par deux poteaux dont le pied est AU SOL, `profApp·k`
 *     px plus bas à l'écran que la base du parement (R5) ;
 *  3. les CHEVRONS courent du faîte à l'égout - obliques, ils disent la pente
 *     là où les rangées de chaume, horizontales, disaient un panneau plat ;
 *  4. le PIGNON visible (celui que le décalé découvre) ferme le volume, et
 *     trois CORBEAUX scellés dans le parement portent la panne faîtière.
 *
 * Tout est déduit de `gi`, de `a` et des cotes : juste pour n'importe quelle
 * ellipse, donc pour la scène d'expédition comme pour la carte.
 */
function AppentisMur({ gi, a, d }: { gi: GeoMur; a: number; d: Dedans }) {
  const p = pt(gi, a)
  const o = saillie(gi, a, -d.profApp)
  const { tx } = tangente(gi, a)
  // vu de bout (est/ouest de l'ellipse) l'appentis ne doit pas s'étaler
  const demE = d.demApp * Math.max(0.55, Math.abs(tx))
  const demF = demE * 0.86
  const xA = p.x + o.dx
  const ySol = p.y + o.dy + 2
  const yEg = ySol - d.hPot
  const yFa = p.y - d.hApp
  const sh = 5.2
  const q = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ) =>
    `M${x0.toFixed(1)},${y0.toFixed(1)}L${x1.toFixed(1)},${y1.toFixed(1)}` +
    `L${x2.toFixed(1)},${y2.toFixed(1)}L${x3.toFixed(1)},${y3.toFixed(1)}Z`
  // le débord du chaume, égout et rives
  const dbE = demE + 1.4
  const dbF = demF + 1
  const yCh = yEg - 1.8
  // le pignon qu'on voit est celui vers lequel le nu avant s'écarte
  const ouest = o.dx >= 0
  const sg = ouest ? -1 : 1
  const pgB = p.x + sg * demF
  const pgA = xA + sg * demE
  return (
    <g>
      {/* ombre au sol, PEINTE (deux valeurs, jamais floutée) et jetée au SE */}
      <ellipse cx={xA + demE * 0.5} cy={ySol + 1.8} rx={demE * 1.35} ry={3.8} fill={PAL.ombrePortee} opacity={0.12} />
      <ellipse cx={xA + demE * 0.3} cy={ySol + 0.7} rx={demE * 1.02} ry={2.5} fill={PAL.ombrePortee} opacity={0.17} />
      {/* l'ombre portée SUR le parement : c'est elle qui l'attache au mur */}
      <path
        d={q(p.x + dbF, yFa, p.x + dbF + sh, yFa + sh * 0.42, xA + dbE + sh, yCh + sh * 0.42, xA + dbE, yCh)}
        fill={PAL.ombrePortee}
        opacity={0.17}
      />
      {/* LA PANNE FAÎTIÈRE, SCELLÉE DANS LE MUR, et les deux corbeaux qui la
          portent. Elle DÉPASSE le pan de toit de part et d'autre : c'est la
          seule pièce qui puisse montrer, hors de l'ombre de l'auvent, que
          l'appentis tient au parement et non à côté. (Des corbeaux placés sous
          le faîte étaient invisibles - le pan les recouvrait entièrement.) */}
      <path d={q(p.x - dbF - 4.4, yFa + 0.2, p.x + dbF + 4.4, yFa + 0.2, p.x + dbF + 4.4, yFa + 2.6, p.x - dbF - 4.4, yFa + 2.6)} fill={PAL.boisMi} />
      <path d={q(p.x - dbF - 4.4, yFa + 0.2, p.x + dbF + 4.4, yFa + 0.2, p.x + dbF + 4.4, yFa + 1.1, p.x - dbF - 4.4, yFa + 1.1)} fill={PAL.boisLit} />
      {[-1, 1].map((s) => (
        <g key={s}>
          <path d={q(p.x + s * (dbF + 3.4) - 1.4, yFa + 2.6, p.x + s * (dbF + 3.4) + 1.4, yFa + 2.6, p.x + s * (dbF + 3.4) + 1.4, yFa + 5.6, p.x + s * (dbF + 3.4) - 1.4, yFa + 5.6)} fill="#9d9179" />
          <path d={q(p.x + s * (dbF + 3.4) - 1.4, yFa + 2.6, p.x + s * (dbF + 3.4) + 1.4, yFa + 2.6, p.x + s * (dbF + 3.4) + 1.4, yFa + 3.4, p.x + s * (dbF + 3.4) - 1.4, yFa + 3.4)} fill={PAL.pierreLit} />
        </g>
      ))}
      {/* LA PÉNOMBRE SOUS L'AUVENT, cadrée par les deux poteaux. Deux valeurs :
          le fond de l'abri et le sol qui reçoit encore un peu de jour */}
      <path d={q(xA - demE, yEg, xA + demE, yEg, xA + demE, ySol, xA - demE, ySol)} fill="#5b4a2e" />
      <path d={q(xA - demE, ySol - d.hPot * 0.3, xA + demE, ySol - d.hPot * 0.3, xA + demE, ySol, xA - demE, ySol)} fill="#75603c" />
      {/* ce qu'on y range : bois fendu et deux jarres - la vie du dedans */}
      <path
        d={
          q(xA - demE + 1.6, ySol - 4.2, xA - demE + 7.4, ySol - 4.2, xA - demE + 7.4, ySol - 0.6, xA - demE + 1.6, ySol - 0.6) +
          q(xA - demE + 1.6, ySol - 4.2, xA - demE + 7.4, ySol - 4.2, xA - demE + 7.4, ySol - 3.2, xA - demE + 1.6, ySol - 3.2)
        }
        fill="#7d5e39"
      />
      <path d={q(xA - demE + 1.6, ySol - 4.2, xA - demE + 7.4, ySol - 4.2, xA - demE + 7.4, ySol - 3.5, xA - demE + 1.6, ySol - 3.5)} fill="#a8845d" />
      <ellipse cx={xA + demE - 4} cy={ySol - 2.4} rx={2.4} ry={3} fill="#8a6b45" />
      <ellipse cx={xA + demE - 4.7} cy={ySol - 3.2} rx={1} ry={1.5} fill="#b08f5e" opacity={0.7} />
      {/* LE PIGNON : le côté que le décalé découvre ferme le volume. Sans lui
          l'auvent n'avait ni épaisseur ni intérieur, juste une face noire. */}
      <path d={q(pgB, yFa, pgA, yEg, pgA, ySol, pgB, p.y + 2)} fill={ouest ? '#a3855a' : '#6b5334'} />
      <path
        d={
          q(pgB, yFa + (p.y + 2 - yFa) * 0.42, pgA, yEg + (ySol - yEg) * 0.42, pgA, yEg + (ySol - yEg) * 0.42 + 1, pgB, yFa + (p.y + 2 - yFa) * 0.42 + 1) +
          q(pgB, yFa + (p.y + 2 - yFa) * 0.72, pgA, yEg + (ySol - yEg) * 0.72, pgA, yEg + (ySol - yEg) * 0.72 + 1, pgB, yFa + (p.y + 2 - yFa) * 0.72 + 1)
        }
        fill={ouest ? '#88693f' : '#57422a'}
        opacity={0.8}
      />
      {/* les deux POTEAUX, plantés au sol, et leur sablière */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <path d={q(xA + s * demE - 1.5, yEg, xA + s * demE + 1.5, yEg, xA + s * demE + 1.5, ySol + 0.6, xA + s * demE - 1.5, ySol + 0.6)} fill={s < 0 ? PAL.boisMi : '#5f462d'} />
          <path d={q(xA + s * demE - 1.5, yEg, xA + s * demE - 0.5, yEg, xA + s * demE - 0.5, ySol + 0.6, xA + s * demE - 1.5, ySol + 0.6)} fill={PAL.boisLit} opacity={0.85} />
          {/* l'empattement : la pierre de calage sous le poteau */}
          <ellipse cx={xA + s * demE} cy={ySol + 0.8} rx={2.6} ry={1.1} fill="#a89d83" />
        </g>
      ))}
      <path d={q(xA - demE - 1, yEg - 0.4, xA + demE + 1, yEg - 0.4, xA + demE + 1, yEg + 1.9, xA - demE - 1, yEg + 1.9)} fill={PAL.boisMi} />
      <path d={q(xA - demE - 1, yEg - 0.4, xA + demE + 1, yEg - 0.4, xA + demE + 1, yEg + 0.5, xA - demE - 1, yEg + 0.5)} fill={PAL.boisLit} />
      {/* LE PAN DE TOIT : faîte ÉTROIT contre le parement, égout LARGE en avant
          et plus bas - le rétrécissement est ce qui fait fuir le plan */}
      <path d={q(p.x - dbF, yFa, p.x + dbF, yFa, xA + dbE, yCh, xA - dbE, yCh)} fill={PAL.chaumeOmbre} />
      <path d={q(p.x - dbF, yFa, p.x - dbF * 0.1, yFa, xA - dbE * 0.1, yCh, xA - dbE, yCh)} fill={PAL.chaumeLit} opacity={0.4} />
      {/* LES CHEVRONS, du faîte à l'égout : obliques, ils disent la pente. Les
          rangées horizontales de l'ancien dessin disaient un panneau plat. */}
      {(() => {
        let ch = ''
        for (const f of [-0.66, -0.22, 0.22, 0.66]) {
          const x0 = p.x + f * dbF
          const x1 = xA + f * dbE
          ch += q(x0 - 0.6, yFa, x0 + 0.6, yFa, x1 + 0.7, yCh, x1 - 0.7, yCh)
        }
        return <path d={ch} fill="#8a6d3c" opacity={0.42} />
      })()}
      {/* deux liens de chaume en travers, et l'arête claire du faîte */}
      {(() => {
        let rangs = ''
        for (const f of [0.42, 0.76]) {
          const y = yFa + (yCh - yFa) * f
          const xg = p.x - dbF + (xA - dbE - (p.x - dbF)) * f
          const xd = p.x + dbF + (xA + dbE - (p.x + dbF)) * f
          rangs += q(xg, y, xd, y, xd, y + 0.9, xg, y + 0.9)
        }
        return <path d={rangs} fill="#7d6234" opacity={0.5} />
      })()}
      <path d={q(p.x - dbF, yFa, p.x + dbF, yFa, p.x + dbF, yFa + 1.2, p.x - dbF, yFa + 1.2)} fill="#ecd9a0" opacity={0.7} />
      {/* l'égout : la tranche du chaume, qui donne son épaisseur au pan, et
          l'ombre qu'il jette sous lui */}
      <path d={q(xA - dbE, yCh, xA + dbE, yCh, xA + dbE, yCh + 2, xA - dbE, yCh + 2)} fill="#8a6d3c" />
      <path d={q(xA - dbE, yCh, xA + dbE, yCh, xA + dbE, yCh + 0.7, xA - dbE, yCh + 0.7)} fill="#c2a066" opacity={0.8} />
      <path d={q(xA - demE, yCh + 2, xA + demE, yCh + 2, xA + demE, yCh + 3.4, xA - demE, yCh + 3.4)} fill={PAL.ombrePortee} opacity={0.2} />
    </g>
  )
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
              {/* l’échafaud de guet est DERRIÈRE le rideau : de dehors, les
                  pointes doivent lui passer devant */}
              {!arriere && <EchafaudsGuet geo={geo} angles={gardes} crete={crete} arriere={arriere} span={span} />}
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
              {arriere && <EchafaudsGuet geo={geo} angles={gardes} crete={crete} arriere={arriere} span={span} />}
            </g>
          )
        })()}

      {niveau === 2 &&
        (() => {
          const gFace = arriere ? gi : geo
          const as = assisesArc(gFace, t, c.pasBloc, -H + 1.4, c.rangs, c.hAssise, 5, arriere ? 22 : 21, false)
          const poteaux = anglesArc(t, c.pas, 0, 1).filter((a) => !encoches.some((e) => Math.abs(a - e.a) < e.da))
          const cf = anglesArc(t, 52, 20)
          /*
           * ═════════════════════ LE HOURD ═════════════════════
           *
           * La galerie de bois posée sur le mur de pierre sèche. Elle était
           * dessinée en ÉLÉVATION FRONTALE : un ruban de 5,5 px de haut suivant
           * la crête, des poteaux de 2,4 px de large et un chapeau horizontal.
           * Au nord, où la crête court à plat, cela se lit très bien. Aux deux
           * extrémités est et ouest, où la tangente se dresse, un ruban à
           * hauteur constante n'a plus AUCUNE largeur apparente : il ne restait
           * que la file des poteaux et de leurs chapeaux, une fermeture éclair
           * de petits « T » posée sur la tranche du mur. Le volume s'effondrait
           * exactement là où le joueur l'a vu s'effondrer.
           *
           * Le remède est celui de R3 : un hourd a une PROFONDEUR - c'est même
           * sa raison d'être militaire, on jette par le trou du plancher ce
           * qu'on n'atteint pas du sommet. Cette profondeur se dessine comme
           * l'épaisseur du chemin de ronde, par un ANNEAU entre deux ellipses,
           * qui se pince au nord et au sud et s'ouvre à l'est et à l'ouest :
           *
           *   `gH` nu EXTÉRIEUR de la galerie, `dH` px de plan hors du parement
           *   `gB` nu intérieur du bardage
           *   `gR` / `gRi` les deux nus de la main courante, qui déborde des deux
           *
           * Trois pièces se relaient donc selon l'angle, sans réglage : au nord
           * le BARDAGE (large, la crête est à plat), à l'est et à l'ouest le
           * PLANCHER en encorbellement et les ABOUTS DE POUTRE (larges, la
           * profondeur y est horizontale), la MAIN COURANTE partout.
           *
           * Et la galerie se TERMINE : à chaque bout de l'arc - la porte à
           * l'est, le point ouest où les deux couches se rejoignent - un
           * PIGNON ferme sa coupe, un poteau cornier le tient et l'about de la
           * poutre de sole sort dessous. Une coupe franche n'est pas une fin.
           */
          const dH = 3.4
          const eB = 1.5
          const gH = dedans(geo, -dH)
          const gB = dedans(geo, -dH + eB)
          const gR = dedans(geo, -dH - 0.7)
          const gRi = dedans(geo, -dH + eB + 1.2)
          /** la face qu'on VOIT : l'extérieure au sud, l'intérieure au nord (R4) */
          const gF = arriere ? gB : gH
          const yC = -H - c.par
          let pot = ''
          let potLum = ''
          let corb = ''
          let corbLit = ''
          for (const a of poteaux) {
            const p = pt(gF, a)
            const { tx } = tangente(geo, a)
            // le poteau s'AMINCIT là où on le prend de bout, et c'est le
            // plancher qui prend le relais - le même passage de main que R2
            const w = 2.7 * Math.max(0.44, Math.abs(tx))
            pot += `M${(p.x - w / 2).toFixed(1)},${(p.y + yC).toFixed(1)}h${w.toFixed(1)}v${(c.par + 0.3).toFixed(1)}h-${w.toFixed(1)}Z`
            potLum += `M${(p.x - w / 2).toFixed(1)},${(p.y + yC).toFixed(1)}h${(w * 0.34).toFixed(1)}v${(c.par + 0.3).toFixed(1)}h-${(w * 0.34).toFixed(1)}Z`
            if (!arriere) {
              /*
               * ABOUT DE POUTRE : la sole qui sort du parement et porte la
               * galerie. C'est par elle qu'on comprend que le bois SORT du mur.
               * Elle doit être plus LARGE que le poteau qu'elle porte, sinon
               * les deux s'enfilent en un seul bâtonnet sombre et le hourd
               * gagne une rangée de clous.
               */
              const q = pt(geo, a)
              const u = saillie(geo, a, dH)
              const wc = 3.8 * Math.max(0.56, Math.abs(tx))
              corb +=
                `M${(q.x - wc / 2).toFixed(1)},${(q.y - H + 0.4).toFixed(1)}L${(q.x + wc / 2).toFixed(1)},${(q.y - H + 0.4).toFixed(1)}` +
                `L${(q.x + wc / 2 + u.dx).toFixed(1)},${(q.y - H + 2.7 + u.dy).toFixed(1)}L${(q.x - wc / 2 + u.dx).toFixed(1)},${(q.y - H + 2.7 + u.dy).toFixed(1)}Z`
              corbLit +=
                `M${(q.x - wc / 2).toFixed(1)},${(q.y - H + 0.4).toFixed(1)}L${(q.x - wc / 2 + 1.1).toFixed(1)},${(q.y - H + 0.4).toFixed(1)}` +
                `L${(q.x - wc / 2 + 1.1 + u.dx).toFixed(1)},${(q.y - H + 2.7 + u.dy).toFixed(1)}L${(q.x - wc / 2 + u.dx).toFixed(1)},${(q.y - H + 2.7 + u.dy).toFixed(1)}Z`
            }
          }
          /*
           * LES DEUX ABOUTS DE LA GALERIE. Ils ne sont pas de même nature, et
           * les traiter pareil se voyait :
           *  · à la PORTE (et à l'about d'un chantier) la galerie s'arrête pour
           *    de bon : elle se ferme sur un PIGNON, la coupe pleine de sa
           *    section, plus son poteau cornier ;
           *  · au POINT OUEST les deux couches se rejoignent bout à bout - il
           *    n'y a rien à fermer. Un pignon posé là faisait un pavé sombre
           *    collé sur le flanc du hourd, à l'endroit même que le joueur
           *    regarde. Il n'y reste que le poteau, qui tient le joint et
           *    masque le pas de 1,5 px entre les deux faces vues (R4).
           */
          const bouts: { a: number; plein: boolean }[] = arriere
            ? [{ a: a0, plein: false }, { a: a1, plein: true }]
            : [{ a: a0, plein: true }, { a: a1, plein: span < 1 }]
          let pignon = ''
          let pignonLit = ''
          let cornier = ''
          let corniere = ''
          let chapeau = ''
          for (const { a: aE, plein } of bouts) {
            const pm = pt(geo, aE)
            const ph = pt(gH, aE)
            if (plein) {
              // le pignon : la COUPE de la galerie, du plancher à la courante
              pignon +=
                `M${pm.x.toFixed(1)},${(pm.y - H + 0.6).toFixed(1)}L${ph.x.toFixed(1)},${(ph.y - H + 0.6).toFixed(1)}` +
                `L${ph.x.toFixed(1)},${(ph.y + yC).toFixed(1)}L${pm.x.toFixed(1)},${(pm.y + yC).toFixed(1)}Z`
              pignonLit +=
                `M${pm.x.toFixed(1)},${(pm.y + yC).toFixed(1)}L${ph.x.toFixed(1)},${(ph.y + yC).toFixed(1)}` +
                `L${ph.x.toFixed(1)},${(ph.y + yC + 1).toFixed(1)}L${pm.x.toFixed(1)},${(pm.y + yC + 1).toFixed(1)}Z`
            }
            /*
             * LE POTEAU CORNIER se dresse DANS le pignon, il n'en sort pas.
             * Dessiné comme un rectangle d'axes écran de 3,4 px, il devenait au
             * point ouest - où les deux couches aboutissent l'une contre
             * l'autre - un pavé de 8 px collé sur le flanc de la galerie : une
             * verrue, pas une fin. Il se cote comme les autres poteaux, au
             * tiers près en plus fort, et c'est le PIGNON qui dit la coupe.
             */
            const pf = pt(gF, aE)
            const { tx } = tangente(geo, aE)
            const w = 3.4 * Math.max(0.46, Math.abs(tx))
            cornier += `M${(pf.x - w / 2).toFixed(1)},${(pf.y + yC - 0.8).toFixed(1)}h${w.toFixed(1)}v${(c.par + 2.4).toFixed(1)}h-${w.toFixed(1)}Z`
            corniere += `M${(pf.x - w / 2).toFixed(1)},${(pf.y + yC - 0.8).toFixed(1)}h${(w * 0.34).toFixed(1)}v${(c.par + 2.4).toFixed(1)}h-${(w * 0.34).toFixed(1)}Z`
            // le chapeau du poteau : ce qui distingue un about d'une coupure
            chapeau += `M${(pf.x - w / 2 - 0.8).toFixed(1)},${(pf.y + yC - 2).toFixed(1)}h${(w + 1.6).toFixed(1)}v1.4h-${(w + 1.6).toFixed(1)}Z`
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
              {/* AU DEDANS, le remblai (R5) : la levée de terre du niveau 1 ne
                  disparaît pas quand on passe à la pierre, elle s'adosse au mur.
                  C'est la même pièce qu'aux niveaux 3 et 4, aux cotes de CE mur. */}
              {arriere ? (
                (() => {
                  const d2 = cotesDedans(c)
                  const fd = d2.profTal * 2.6
                  const g2 = garnitureTalus(gi, t, a0, a1, nC, d2.hTal, d2.profTal, fd, 205)
                  return (
                    <g>
                      <path d={rubanMourant(gi, t, -d2.hTal, 2, a0, a1, nC, 0, -d2.profTal, 2, fd)} fill="url(#mur-terre)" />
                      <path d={rubanMourant(gi, t, -d2.hTal, 2, a0, a1, nC, 0, -d2.profTal * 0.45, 2, fd)} fill="#a68f57" opacity={0.45} />
                      {/* le ventre de la pente, puis le sentier battu de la crête */}
                      <path d={g2.ventre} fill="#5a4a2b" opacity={0.3} />
                      <path d={g2.sentier} stroke="#cbb87f" strokeWidth={2.6} fill="none" opacity={0.42} />
                      <path d={rubanMourant(gi, t, 2, 2, a0, a1, nC, -d2.profTal * 0.72, -d2.profTal, 2, fd)} fill="#4a3c23" opacity={0.55} />
                      <path d={g2.rigoles} fill="#5f4d2c" opacity={0.4} />
                      <path d={g2.herbe} stroke="#79874c" strokeWidth={0.8} fill="none" opacity={0.85} />
                      <path d={g2.herbeClair} stroke="#93a05e" strokeWidth={0.7} fill="none" />
                      <path d={ligneMourante(gi, t, a0, a1, nC, -d2.hTal - 0.8, 0, 2, fd)} stroke={PAL.ombrePortee} strokeWidth={1.8} fill="none" opacity={0.26} />
                      <path d={ligneMourante(gi, t, a0, a1, nC, -d2.hTal + 0.5, 0, 2, fd)} stroke="#c3ab6c" strokeWidth={1.3} fill="none" opacity={0.8} />
                      <path d={ligneMourante(gi, t, a0, a1, nC, 2.4, -d2.profTal, 2.4, fd)} stroke="url(#mur-pied)" strokeWidth={4} fill="none" />
                    </g>
                  )
                })()
              ) : (
                <path d={ligne(gFace, a0, a1, nC, 0.9)} stroke="url(#mur-pied)" strokeWidth={5} fill="none" />
              )}
              {/* le sommet n'est plus une palissade de pointes mais un HOURD :
                  chemin de bois EN ENCORBELLEMENT, bardé de planches */}
              <path d={ruban(geo, -H, gi, -H, a0, a1, nC)} fill="url(#mur-dalle)" />
              <path d={ligne(geo, a0, a1, nC, -H + 0.6)} stroke={PAL.ombrePortee} strokeWidth={2} fill="none" opacity={0.16} />
              {/* AU DEHORS SEULEMENT : l'ombre que le débord jette sur la pierre,
                  et les abouts des poutres de sole qui le portent - c'est par
                  eux qu'on lit que le bois SORT du mur, et à l'est comme à
                  l'ouest ce sont eux qui restent quand le bardage se voit de
                  bout */}
              {!arriere && (
                <>
                  <path d={ligne(geo, a0, a1, nC, -H + 2.4)} stroke={PAL.ombrePortee} strokeWidth={3.2} fill="none" opacity={0.24} />
                  <path d={corb} fill="#7d5e39" />
                  <path d={corbLit} fill="#a8845d" opacity={0.9} />
                </>
              )}
              {/* LE PLANCHER EN ENCORBELLEMENT : l'anneau entre le nu du mur et
                  celui de la galerie. Il se pince au nord et au sud, il S'OUVRE
                  à l'est et à l'ouest (R3) - c'est lui, et lui seul, qui porte
                  le volume du hourd là où le bardage n'en a plus */}
              <path d={ruban(gH, -H, geo, -H, a0, a1, nC)} fill="#9a744a" />
              <path d={ruban(gH, -H, gH, -H + 1.1, a0, a1, nC)} fill="#4f3820" opacity={0.8} />
              {/* le BARDAGE, sur la face vue (R4) */}
              <path d={ruban(gF, -H + 0.6, gF, yC, a0, a1, nC)} fill="#6a4e2d" />
              <path d={ligne(gF, a0, a1, nC, yC + 1.3)} stroke="#96713f" strokeWidth={1.5} fill="none" opacity={0.95} />
              <path d={ligne(gF, a0, a1, nC, -H - 2.6)} stroke="#8b6a40" strokeWidth={1.1} fill="none" opacity={0.7} />
              <path d={ligne(gF, a0, a1, nC, -H + 0.3)} stroke="#3f2d18" strokeWidth={1.2} fill="none" opacity={0.6} />
              <path d={pot} fill="#5c4227" />
              <path d={potLum} fill="#9a744a" opacity={0.9} />
              {/* MAIN COURANTE : un anneau, pas un trait. Elle déborde du
                  bardage des deux côtés, si bien qu'à l'est et à l'ouest - où
                  le bardage n'a plus d'épaisseur apparente - c'est son DESSUS,
                  large de 3,4 px, qui tient la crête */}
              <path d={ruban(gR, yC, gRi, yC, a0, a1, nC)} fill="#8b6a40" />
              <path d={ligne(gRi, a0, a1, nC, yC)} stroke="#c1996a" strokeWidth={1} fill="none" opacity={0.75} />
              {/* … et la galerie SE TERMINE : pignon, poteau cornier, sole */}
              <path d={pignon} fill="#5c4227" />
              <path d={pignonLit} fill="#a8845d" opacity={0.85} />
              <path d={cornier} fill="#6a4e2d" />
              <path d={corniere} fill="#a8845d" opacity={0.8} />
              <path d={chapeau} fill="#96713f" />
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
          // ── LES OUVRAGES DU DEDANS (R5) : remblai, éperons, chaînage, volées
          //    et appentis. Aucun au droit d'une tour (le fût les avalerait), et
          //    les éperons cèdent le pas aux volées et aux appentis. ──
          const dd = cotesDedans(c)
          /**
           * Longueur d'arc sur laquelle le remblai s'amortit à chaque bout. Vaut
           * 2,6 fois sa propre avancée : le talus meurt donc sur une pente de
           * plan comparable à la sienne, et non sur une tranche.
           */
          const fdTal = dd.profTal * 2.6
          /** px d'ARC → radians à cet angle : sert à espacer les ouvrages (R1) */
          const angPx = (a: number, px: number) => px / (Math.hypot(geo.rx * Math.sin(a), geo.ry * Math.cos(a)) || 1)
          const libre = (a: number, f: number) => !encoches.some((e) => Math.abs(a - e.a) < e.da * f)
          const aEsc = arriere ? anglesArc(t, 240, 70).filter((a) => libre(a, 2.2)) : []
          const aApp = arriere ? anglesArc(t, 300, 150).filter((a) => libre(a, 2.4)) : []
          const aEp = arriere
            ? anglesArc(t, dd.pasEp, 18).filter(
                (a) =>
                  libre(a, 1.5) &&
                  !aEsc.some((b) => Math.abs(a - b) < angPx(a, 36)) &&
                  !aApp.some((b) => Math.abs(a - b) < angPx(a, 30)),
              )
            : []
          const ep = eperons(gi, aEp, dd, H, c.hAssise)
          // deux lits de chaînage au niveau 3, TROIS au niveau 4 : la progression
          // se lit aussi du dedans, et un seul lit se prenait pour une rambarde
          // Les têtes de poutres sont DÉCALÉES d'un lit à l'autre. Alignées, les
          // deux lits et leurs têtes composaient un quadrillage : le mur de
          // pierre se lisait comme un pan de bois, et c'était un « truc en
          // bois » de plus sur la face interne.
          const chz = (n4 ? [0.44, 0.64, 0.84] : [0.5, 0.78]).map((f, i) =>
            chainage(gi, t, a0, a1, nC, -H * f, n4 ? 3 : 2.7, n4 ? 26 : 23, (i * 2 + 1) * 6.5),
          )
          /*
           * LA TERRE DU REMBLAI EST BATTUE, PAS VERSÉE. Une nappe unie de 14 px
           * d'écran ne se lit pas comme un talus : ce sont les REPLATS - les
           * paliers qu'un remblai damé garde en séchant - et les pierres qui en
           * revêtent le pied qui lui donnent sa matière, et qui disent que c'est
           * de la terre entassée contre le mur, pas une ombre.
           *
           * Des coulées dans le SENS DE LA PENTE avaient été essayées d'abord :
           * la profondeur ne se projetant presque qu'en y au nord, elles y
           * devenaient un rang de traits verticaux régulièrement espacés - une
           * palissade de piquets plantée dans le talus. Les replats, eux,
           * courent le long de l'arc : ils ne peuvent pas se dresser.
           */
          let stries = ''
          let cailloux = ''
          let caillouxLit = ''
          const gt = garnitureTalus(gi, t, a0, a1, nC, dd.hTal, dd.profTal, fdTal, niveau * 31 + 7)
          if (arriere) {
            const rt = alea(niveau * 17 + 5)
            // replats et pierres suivent le BISEAU du remblai : sans cela, la
            // terre s'amortissait mais ses stries restaient posées sur l'herbe
            for (const a of anglesArc(t, 17, 4)) {
              const bi = biseau(t, a, fdTal)
              if (bi < 0.12) continue
              const o = saillie(gi, a, -dd.profTal * bi)
              const p = pt(gi, a)
              const { tx, ty } = tangente(gi, a)
              const f = 0.22 + rt() * 0.5
              const hTb = dd.hTal * bi
              const hh = hTb + 2 + o.dy
              const cxp = p.x + o.dx * f
              const cyp = p.y - hTb + hh * f
              const lg = 4.2 + rt() * 4.4
              const ep2 = 1 + rt() * 0.8
              stries +=
                `M${(cxp - tx * lg).toFixed(1)},${(cyp - ty * lg).toFixed(1)}L${(cxp + tx * lg).toFixed(1)},${(cyp + ty * lg).toFixed(1)}` +
                `L${(cxp + tx * lg).toFixed(1)},${(cyp + ty * lg + ep2).toFixed(1)}L${(cxp - tx * lg).toFixed(1)},${(cyp - ty * lg + ep2).toFixed(1)}Z`
            }
            for (const a of anglesArc(t, 21, 9)) {
              const bi = biseau(t, a, fdTal)
              if (bi < 0.12) continue
              const o = saillie(gi, a, -dd.profTal * bi)
              const p = pt(gi, a)
              const f = 0.82 + rt() * 0.16
              const hTb = dd.hTal * bi
              const x = p.x + o.dx * f
              const y = p.y - hTb + (hTb + 2 + o.dy) * f
              const r = 1.5 + rt() * 1.3
              cailloux += `M${(x - r).toFixed(1)},${y.toFixed(1)}L${x.toFixed(1)},${(y - r * 0.72).toFixed(1)}L${(x + r).toFixed(1)},${y.toFixed(1)}L${x.toFixed(1)},${(y + r * 0.6).toFixed(1)}Z`
              caillouxLit += `M${(x - r * 0.7).toFixed(1)},${(y - r * 0.1).toFixed(1)}L${x.toFixed(1)},${(y - r * 0.66).toFixed(1)}L${(x + r * 0.3).toFixed(1)},${(y - r * 0.24).toFixed(1)}L${(x - r * 0.2).toFixed(1)},${(y + r * 0.06).toFixed(1)}Z`
            }
          }
          let esc = ''
          let escLum = ''
          let escFlanc = ''
          let escJoints = ''
          let escRampe = ''
          let escRampeLit = ''
          for (const a of aEsc) {
            const p = pt(gi, a)
            const { tx, ty } = tangente(gi, a)
            const o = saillie(gi, a, -dd.profTal)
            /*
             * LA VOLÉE GARDE SA PENTE, QUELLE QUE SOIT L'ELLIPSE. Elle part du
             * SOL, au pied du talus, et monte dans le sens où la base du mur
             * DESCEND à l'écran : dans l'autre sens la chute du terrain s'ajoute
             * à la hauteur du mur et la volée se dresse à 75°, une échelle. Sa
             * longueur d'arc `s` est ensuite RÉSOLUE pour que la pente écran
             * vaille 1,35 - soit 53° au nord comme à l'ouest, sur la carte comme
             * sur l'ellipse bien plus plate de l'expédition.
             */
            const sg = ty >= 0 ? 1 : -1
            const ax = tx * sg
            const ay = ty * sg
            const s = (H + 2 + o.dy) / (1.35 * Math.abs(ax) + ay)
            const fx = p.x + o.dx
            const fy = p.y + o.dy + 2
            // le haut de la volée : sur la base du mur `s` px d'arc plus loin,
            // donc sur le chemin de ronde de CE point-là
            const gx = p.x + ax * s
            const yG = p.y + ay * s + 2
            const ty2 = yG - 2 - H
            const nM = Math.max(5, Math.min(12, Math.round((fy - ty2) / 3.6)))
            const hM = (fy - ty2) / nM
            const g = (gx - fx) / nM
            /*
             * LE PROFIL EN ESCALIER, D'UN SEUL TENANT. Chaque marche était
             * dessinée du nez jusqu'à l'arrivée : les marches du bas faisaient
             * 30 px de fond et la volée se lisait comme un empilement de dalles.
             * Ici la maçonnerie est UN polygone - sol, contremarche, marche,
             * contremarche… - et les marches n'ont plus que leur giron.
             */
            let prof = `M${fx.toFixed(1)},${fy.toFixed(1)}`
            for (let i = 0; i < nM; i++) {
              const x0 = fx + g * i
              const yy = fy - hM * (i + 1)
              prof += `L${x0.toFixed(1)},${yy.toFixed(1)}L${(x0 + g).toFixed(1)},${yy.toFixed(1)}`
              esc += `M${x0.toFixed(1)},${yy.toFixed(1)}L${(x0 + g).toFixed(1)},${yy.toFixed(1)}L${(x0 + g).toFixed(1)},${(yy + 1.9).toFixed(1)}L${x0.toFixed(1)},${(yy + 1.9).toFixed(1)}Z`
              escLum += `M${x0.toFixed(1)},${yy.toFixed(1)}L${(x0 + g).toFixed(1)},${yy.toFixed(1)}L${(x0 + g).toFixed(1)},${(yy + 0.8).toFixed(1)}L${x0.toFixed(1)},${(yy + 0.8).toFixed(1)}Z`
            }
            escFlanc += `${prof}L${gx.toFixed(1)},${yG.toFixed(1)}Z`
            /*
             * DEUX APPUIS POUR LA VOLÉE AUSSI. Elle naissait dans l'herbe et
             * mourait dans le vide : ni dé de pied, ni palier d'arrivée. On
             * ajoute donc la DALLE DE PIED, posée au sol devant la première
             * marche, et le PALIER qui la raccorde au dallage - et des joints
             * verticaux sur le mur d'échiffre, qui n'était qu'un aplat pâle.
             */
            const sn = Math.sign(g) || 1
            escRampe +=
              `M${(fx - sn * 6.5).toFixed(1)},${(fy - 2.6).toFixed(1)}L${(fx + sn * 2).toFixed(1)},${(fy - 2.6).toFixed(1)}L${(fx + sn * 2).toFixed(1)},${(fy + 0.8).toFixed(1)}L${(fx - sn * 6.5).toFixed(1)},${(fy + 0.8).toFixed(1)}Z` +
              `M${(gx - sn * 2).toFixed(1)},${(ty2 - 0.4).toFixed(1)}L${(gx + sn * 7).toFixed(1)},${(ty2 - 0.4).toFixed(1)}L${(gx + sn * 7).toFixed(1)},${(ty2 + 2.6).toFixed(1)}L${(gx - sn * 2).toFixed(1)},${(ty2 + 2.6).toFixed(1)}Z`
            escRampeLit +=
              `M${(fx - sn * 6.5).toFixed(1)},${(fy - 2.6).toFixed(1)}L${(fx + sn * 2).toFixed(1)},${(fy - 2.6).toFixed(1)}L${(fx + sn * 2).toFixed(1)},${(fy - 1.6).toFixed(1)}L${(fx - sn * 6.5).toFixed(1)},${(fy - 1.6).toFixed(1)}Z` +
              `M${(gx - sn * 2).toFixed(1)},${(ty2 - 0.4).toFixed(1)}L${(gx + sn * 7).toFixed(1)},${(ty2 - 0.4).toFixed(1)}L${(gx + sn * 7).toFixed(1)},${(ty2 + 0.7).toFixed(1)}L${(gx - sn * 2).toFixed(1)},${(ty2 + 0.7).toFixed(1)}Z`
            for (let i = 1; i < nM; i++) {
              const x = fx + g * i
              const yb = fy + ((yG - fy) * i) / nM
              const yh = fy - hM * i + 1.9
              if (yb - yh < 1.5) continue
              escJoints += `M${x.toFixed(1)},${yh.toFixed(1)}L${(x + 0.9).toFixed(1)},${yh.toFixed(1)}L${(x + 0.9).toFixed(1)},${yb.toFixed(1)}L${x.toFixed(1)},${yb.toFixed(1)}Z`
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
                    <path key={i} d={d} fill={TONS_SEC[i]} opacity={0.46} />
                  ))}
                  {/* lumière rasante juste sous le bahut, puis l'ombre du parapet */}
                  <path d={ligne(gi, a0, a1, nC, -H + 1.2)} stroke="#d5cbb2" strokeWidth={1.4} fill="none" opacity={0.4} />
                  <path d={ligne(gi, a0, a1, nC, -H + 3.4)} stroke={PAL.ombrePortee} strokeWidth={2.6} fill="none" opacity={0.14} />
                  {/* CHAÎNAGE APPARENT : les lits de poutres et leurs têtes.
                      Posés AVANT les éperons, qui doivent les masquer là où ils
                      passent. Le creux d'ombre au-dessus est ce qui les NOIE
                      dans la maçonnerie au lieu de les poser devant. */}
                  {chz.map((ch, i) => (
                    <g key={i}>
                      <path d={ch.creux} fill={PAL.ombrePortee} opacity={0.24} />
                      <path d={ch.bande} fill={PAL.boisMi} />
                      <path d={ch.lit} fill={PAL.boisLit} opacity={0.85} />
                      <path d={ch.sous} fill={PAL.ombrePortee} opacity={0.2} />
                      <path d={ch.tetesOmbre} fill={PAL.ombrePortee} opacity={0.3} />
                      <path d={ch.tetes} fill="#6f5636" />
                      <path d={ch.tetesLit} fill="#a8845d" opacity={0.9} />
                    </g>
                  ))}
                  {/* LE REMBLAI ADOSSÉ : le talus de terre qui encaisse le
                      bélier. Sa crête porte contre le parement, son pied avance
                      de profTal px de plan dans la place - donc plus bas à
                      l'écran. C'est LUI la ligne de sol de tout le dedans. */}
                  <path d={rubanMourant(gi, t, -dd.hTal, 2, a0, a1, nC, 0, -dd.profTal, 2, fdTal)} fill="url(#mur-terre)" />
                  <path d={rubanMourant(gi, t, -dd.hTal, 2, a0, a1, nC, 0, -dd.profTal * 0.4, 2, fdTal)} fill="#a68f57" opacity={0.42} />
                  {/* LE VENTRE DE LA PENTE. Deux tons superposés font un ruban
                      plat ; il faut une ombre à mi-hauteur, décalée vers l'aval,
                      pour qu'un talus se courbe. C'est la pièce qui manquait le
                      plus, et la moins coûteuse. */}
                  <path d={gt.ventre} fill="#5a4a2b" opacity={0.32} />
                  <path d={rubanMourant(gi, t, -dd.hTal, -dd.hTal + 1.6, a0, a1, nC, 0, -dd.profTal * 0.12, 2, fdTal)} fill="#c3ab6c" opacity={0.5} />
                  {/* le sentier battu qui court sous la crête, celui par lequel
                      on gagne les volées : la terre y est tassée, donc claire */}
                  <path d={gt.sentier} stroke="#cbb87f" strokeWidth={3.2} fill="none" opacity={0.45} />
                  <path d={rubanMourant(gi, t, 2, 2, a0, a1, nC, -dd.profTal * 0.74, -dd.profTal, 2, fdTal)} fill="#4a3c23" opacity={0.5} />
                  {/* la terre est BATTUE, pas versée : des coulées dans le sens
                      de la pente, et un pied revêtu de pierres */}
                  <path d={stries} fill="#5f4d2c" opacity={0.42} />
                  <path d={gt.rigoles} fill="#5f4d2c" opacity={0.42} />
                  <path d={cailloux} fill="#8f8878" />
                  <path d={caillouxLit} fill="#b5ad99" opacity={0.6} />
                  {/* ET DE L'HERBE. Une pente de terre vit : elle pousse partout
                      sauf sur le sentier. Sans elle, huit cents pixels de talus
                      n'ont rien qui rompe la ligne. */}
                  <path d={gt.herbe} stroke="#79874c" strokeWidth={0.85} fill="none" opacity={0.85} />
                  <path d={gt.herbeClair} stroke="#93a05e" strokeWidth={0.7} fill="none" />
                  {/* le pli du raccord : ombre de contact sur le parement, puis
                      la crête du remblai qui prend le jour */}
                  <path d={ligneMourante(gi, t, a0, a1, nC, -dd.hTal - 1, 0, 2, fdTal)} stroke={PAL.ombrePortee} strokeWidth={2.4} fill="none" opacity={0.3} />
                  <path d={ligneMourante(gi, t, a0, a1, nC, -dd.hTal + 0.5, 0, 2, fdTal)} stroke="#cdb679" strokeWidth={1.4} fill="none" opacity={0.75} />
                  <path d={ligneMourante(gi, t, a0, a1, nC, 2.6, -dd.profTal, 2.6, fdTal)} stroke="url(#mur-pied)" strokeWidth={H * 0.18} fill="none" />
                  {/* ÉPERONS : les massifs qui prennent le mur à revers. Pied au
                      SOL en avant du remblai, glacis mourant CONTRE le parement
                      sous le bahut - c'est ce double appui qui les fait tenir. */}
                  <path d={ep.ombre} fill={PAL.ombrePortee} opacity={0.26} />
                  {/*
                    LA VALEUR, ENCORE. Au zoom ces massifs sont bien construits -
                    nu avant, tiers à l'ombre, flanc, glacis, joints alignés sur
                    les assises. À l'échelle de la carte ils sautaient pourtant aux
                    yeux comme dix stèles blanches : ils étaient plus CLAIRS que
                    tout ce qui les entoure, alors qu'ils se dressent sur une face
                    qui tourne le dos au soleil du nord-ouest. Un ouvrage adossé à
                    un mur d'ombre ne peut pas être plus lumineux que lui. Seule
                    l'arête du glacis reste franche : une ligne, pas une surface.
                  */}
                  <path d={ep.face} fill="url(#mur-interne)" />
                  <path d={ep.face} fill="#5c5340" opacity={0.42} />
                  <path d={ep.faceOmbre} fill="#4f4534" opacity={0.28} />
                  <path d={ep.flancOmbre} fill="#5f5540" />
                  <path d={ep.flancJour} fill="#9e9174" />
                  <path d={ep.joints} fill={PAL.pierreJoint} opacity={0.45} />
                  <path d={ep.pied} fill={PAL.ombrePortee} opacity={0.24} />
                  <path d={ep.glacis} fill="#8d8268" />
                  <path d={ep.arete} fill="#ddd5c2" opacity={0.42} />
                  {/* la terre vient border leur pied : le massif SORT du remblai
                      au lieu d'être posé dessus */}
                  <path d={ep.berge} fill="#6d5a34" />
                  <path d={ep.berge} fill="#a68f57" opacity={0.35} transform="translate(-0.6,-0.8)" />
                  {/* RAMPES D'ACCÈS : elles partent du SOL, au pied du remblai,
                      et leur mur d'échiffre porte les marches jusqu'au dallage */}
                  {/* l'ombre de la volée : son propre profil, décalé au SE */}
                  <path d={escFlanc} fill={PAL.ombrePortee} opacity={0.15} transform="translate(4.4,1.9)" />
                  {/* même correction pour le mur d'échiffre : c'était le plus
                      grand aplat clair du dedans, un triangle pâle de la hauteur
                      du talus. Il rentre dans l'ombre de la face, et ses joints
                      ressortent - une maçonnerie, pas une rampe de carton. */}
                  <path d={escFlanc} fill="url(#mur-interne)" />
                  <path d={escFlanc} fill="#5c5340" opacity={0.4} />
                  <path d={escJoints} fill={PAL.pierreJoint} opacity={0.42} />
                  <path d={esc} fill="#b5aa90" />
                  <path d={escLum} fill="#ddd5c2" />
                  {/* le garde-corps de la volée, rampant avec elle */}
                  <path d={escRampe} fill="#9e937a" />
                  <path d={escRampeLit} fill="#ddd5c2" opacity={0.85} />
                  {/* appentis de service, posés sur leurs pieds : la vie du dedans */}
                  {aApp.map((a) => (
                    <AppentisMur key={a} gi={gi} a={a} d={dd} />
                  ))}
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
