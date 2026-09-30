import type { ReactNode } from 'react'
import { PAL, alea } from '../art'

/*
 * ═════════════════════════ PROJECTION 3/4 (v2) ═════════════════════════
 * Toute l'architecture v2 se construit en VRAIS volumes, puis se projette :
 *   monde : x vers l'est, y vers le haut, z vers le nord (la profondeur)
 *   écran : X = x + z·KX,  Y = -y - z·KY
 * La profondeur fuit vers le haut-droite : on voit la façade SUD (demi-
 * teinte), le flanc EST (ombre) et les DESSUS (éclairés par le soleil NW).
 * C'est ce qui donne à chaque édifice son poids : un toit a deux pans qu'on
 * voit filer, une colonnade de flanc s'enfonce, un dallage se lit en plan.
 * Ancre : (0,0,0) = centre du pied de la façade → écran (0,0).
 */

export const KX = 0.5
export const KY = 0.3

export type V3 = readonly [number, number, number]

const f = (n: number) => (Math.round(n * 10) / 10).toString()

export function P(x: number, y: number, z: number): [number, number] {
  return [x + z * KX, -y - z * KY]
}

/** polygone monde → attribut d */
export function poly(pts: V3[]): string {
  return pts.map((p, i) => {
    const [X, Y] = P(p[0], p[1], p[2])
    return `${i ? 'L' : 'M'}${f(X)},${f(Y)}`
  }).join('') + 'Z'
}

/** segment monde → attribut d (à concaténer) */
export function seg(a: V3, b: V3): string {
  const [ax, ay] = P(a[0], a[1], a[2])
  const [bx, by] = P(b[0], b[1], b[2])
  return `M${f(ax)},${f(ay)}L${f(bx)},${f(by)}`
}

/* ── matériaux : trois valeurs par matière (façade sud, flanc est, dessus) ── */
export interface Mat {
  face: string
  flanc: string
  dessus: string
  arete: string
  joint: string
}

export const MATS: Record<'marbre' | 'pierre' | 'stuc' | 'bois' | 'moellon', Mat> = {
  marbre: { face: 'url(#iso-marbre-f)', flanc: 'url(#iso-marbre-s)', dessus: '#fbf7ec', arete: '#ffffff', joint: '#cfc7b2' },
  pierre: { face: 'url(#iso-pierre-f)', flanc: 'url(#iso-pierre-s)', dessus: '#e8e0cc', arete: '#f6f1e3', joint: PAL.pierreJoint },
  stuc: { face: 'url(#iso-stuc-f)', flanc: 'url(#iso-stuc-s)', dessus: '#f6ecd4', arete: '#fff8e6', joint: PAL.stucOmbre },
  bois: { face: 'url(#iso-bois-f)', flanc: 'url(#iso-bois-s)', dessus: '#b89468', arete: '#c9a878', joint: PAL.boisOmbre },
  moellon: { face: 'url(#iso-moellon-f)', flanc: 'url(#iso-moellon-s)', dessus: '#c9bfa6', arete: '#ddd4bd', joint: '#7e7460' },
}

/** dégradés de la projection - à monter une fois dans le <defs> de l'édifice */
export function DefsIso() {
  const lin = (id: string, a: string, b: string, c?: string) => (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={a} />
      {c && <stop offset="55%" stopColor={b} />}
      <stop offset="100%" stopColor={c ?? b} />
    </linearGradient>
  )
  return (
    <>
      {lin('iso-marbre-f', '#f4eee0', '#e3dac4', '#cfc5ac')}
      {lin('iso-marbre-s', '#d2c8b0', '#bdb298', '#a99e84')}
      {lin('iso-pierre-f', '#ddd4bd', '#c7bca2', '#afa488')}
      {lin('iso-pierre-s', '#b1a68b', '#9d9277', '#877c63')}
      {lin('iso-stuc-f', '#f2e7cd', '#e2d0ac', '#cdb68d')}
      {lin('iso-stuc-s', '#c9b18a', '#b39a72', '#9c835e')}
      {lin('iso-bois-f', '#a8845d', '#8a6942', '#6f5234')}
      {lin('iso-bois-s', '#77593a', '#624930', '#4f3a24')}
      {lin('iso-moellon-f', '#c9bfa6', '#b3a88d', '#9a8f75')}
      {lin('iso-moellon-s', '#9d9277', '#877c63', '#72684f')}
      {/* toits de terre cuite : pan ouest au soleil, pan est dans l'ombre */}
      <linearGradient id="iso-toit-o" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#c86e47" />
        <stop offset="100%" stopColor="#e39067" />
      </linearGradient>
      <linearGradient id="iso-toit-e" x1="1" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#7e3f25" />
        <stop offset="100%" stopColor="#a4553a" />
      </linearGradient>
      <linearGradient id="iso-chaume-o" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#c9a864" />
        <stop offset="100%" stopColor="#e6cd8e" />
      </linearGradient>
      <linearGradient id="iso-chaume-e" x1="1" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#8a6d38" />
        <stop offset="100%" stopColor="#a8884c" />
      </linearGradient>
      {/* fût cylindrique : ombre - éclat NW - demi-teinte - ombre propre est */}
      <linearGradient id="iso-fut-marbre" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#c9bfa6" />
        <stop offset="24%" stopColor="#fffcf3" />
        <stop offset="58%" stopColor="#e2d9c2" />
        <stop offset="100%" stopColor="#a39880" />
      </linearGradient>
      <linearGradient id="iso-fut-pierre" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#a69b80" />
        <stop offset="24%" stopColor="#ebe3cf" />
        <stop offset="58%" stopColor="#c6bba1" />
        <stop offset="100%" stopColor="#81775e" />
      </linearGradient>
      <linearGradient id="iso-fut-bois" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#6a4e30" />
        <stop offset="26%" stopColor="#b89468" />
        <stop offset="60%" stopColor="#8a6942" />
        <stop offset="100%" stopColor="#4f3a24" />
      </linearGradient>
      <linearGradient id="iso-or" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fbe7a6" />
        <stop offset="45%" stopColor="#d9b25a" />
        <stop offset="100%" stopColor="#8d6a24" />
      </linearGradient>
      <radialGradient id="iso-fumee">
        <stop offset="0%" stopColor="#ece6da" stopOpacity="0.9" />
        <stop offset="60%" stopColor="#e3dccd" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#e3dccd" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="iso-fumee-noire">
        <stop offset="0%" stopColor="#6a635c" stopOpacity="0.9" />
        <stop offset="60%" stopColor="#6a635c" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#6a635c" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="iso-lueur">
        <stop offset="0%" stopColor="#ffe7a3" stopOpacity="0.95" />
        <stop offset="55%" stopColor="#e8a948" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#6b3c12" stopOpacity="0" />
      </radialGradient>
    </>
  )
}

/**
 * Un parallélépipède : flanc est, façade sud, dessus. Arête vive claire sur
 * le rebord du dessus (là où le soleil accroche), angle sud-est sombre.
 */
export function Boite({
  x0, x1, z0, z1, y0, y1, m, sansDessus = false, sansFlanc = false,
}: { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number; m: Mat; sansDessus?: boolean; sansFlanc?: boolean }) {
  return (
    <g>
      {!sansFlanc && <path d={poly([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]])} fill={m.flanc} />}
      <path d={poly([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]])} fill={m.face} />
      {!sansDessus && <path d={poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]])} fill={m.dessus} />}
      {!sansDessus && <path d={seg([x0, y1, z0], [x1, y1, z0])} stroke={m.arete} strokeWidth={0.7} opacity={0.9} />}
      {!sansFlanc && <path d={seg([x1, y0, z0], [x1, y1, z0])} stroke={m.joint} strokeWidth={0.5} opacity={0.7} />}
    </g>
  )
}

/** ombre portée d'un volume au sol, projetée vers le SUD-EST, floue */
export function OmbreSE({ x0, x1, z0, z1, h, o = 0.2 }: { x0: number; x1: number; z0: number; z1: number; h: number; o?: number }) {
  const L = h * 0.5
  return (
    <path
      d={poly([[x0, 0, z0], [x1, 0, z0], [x1 + L, 0, z0 - L * 0.55], [x1 + L, 0, z1 - L * 0.55], [x1, 0, z1]])}
      fill={PAL.ombrePortee}
      opacity={o}
      filter="url(#a-flou4)"
    />
  )
}

/** occlusion au pied d'une façade : bande sombre floue le long du sol */
export function AOPied({ x0, x1, z }: { x0: number; x1: number; z: number }) {
  return <path d={poly([[x0, 0, z], [x1, 0, z], [x1, 2.2, z], [x0, 2.2, z]])} fill="#1d1408" opacity={0.28} filter="url(#a-flou1)" />
}

/** sol en plan : aire rectangulaire projetée, avec son dallage éventuel */
export function Aire({
  x0, x1, z0, z1, fill, dalles, joint = '#9d927a', o = 1,
}: { x0: number; x1: number; z0: number; z1: number; fill: string; dalles?: { dx: number; dz: number }; joint?: string; o?: number }) {
  let d = ''
  if (dalles) {
    for (let x = x0 + dalles.dx; x < x1 - 0.5; x += dalles.dx) d += seg([x, 0, z0], [x, 0, z1])
    for (let z = z0 + dalles.dz; z < z1 - 0.5; z += dalles.dz) d += seg([x0, 0, z], [x1, 0, z])
  }
  return (
    <g opacity={o}>
      <path d={poly([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]])} fill={fill} />
      {d && <path d={d} stroke={joint} strokeWidth={0.5} opacity={0.55} />}
    </g>
  )
}

/**
 * Colonne dorique au pied (x, y0, z) : fût à entasis en dégradé cylindrique,
 * deux cannelures, échine bombée, abaque, ombre propre sous le chapiteau.
 */
export function ColonneDorique({
  x, y0, z, h, r, mat = 'marbre', or = false,
}: { x: number; y0: number; z: number; h: number; r: number; mat?: 'marbre' | 'pierre' | 'bois'; or?: boolean }) {
  const [X, Y] = P(x, y0, z)
  const rt = r * 0.8
  const hc = r * 0.9
  const top = Y - h
  const fut = `url(#iso-fut-${mat})`
  const clair = mat === 'marbre' ? '#fffcf3' : mat === 'pierre' ? '#ebe3cf' : '#b89468'
  const sombre = mat === 'marbre' ? '#bdb298' : mat === 'pierre' ? '#8f856b' : '#4f3a24'
  return (
    <g>
      <path d={`M${f(X - r)},${f(Y)} C${f(X - r * 1.04)},${f(Y - h * 0.4)} ${f(X - rt * 1.02)},${f(top + hc + h * 0.2)} ${f(X - rt)},${f(top + hc)} L${f(X + rt)},${f(top + hc)} C${f(X + rt * 1.02)},${f(top + hc + h * 0.2)} ${f(X + r * 1.04)},${f(Y - h * 0.4)} ${f(X + r)},${f(Y)} Z`} fill={fut} />
      {mat !== 'bois' && (
        <path d={`M${f(X - r * 0.36)},${f(Y - 0.5)} L${f(X - rt * 0.34)},${f(top + hc + 0.6)} M${f(X + r * 0.3)},${f(Y - 0.5)} L${f(X + rt * 0.28)},${f(top + hc + 0.6)}`} stroke={sombre} strokeWidth={0.45} opacity={0.55} />
      )}
      {/* échine puis abaque */}
      <path d={`M${f(X - rt)},${f(top + hc)} Q${f(X - r * 1.25)},${f(top + hc * 0.35)} ${f(X - r * 1.28)},${f(top + hc * 0.3)} L${f(X + r * 1.28)},${f(top + hc * 0.3)} Q${f(X + r * 1.25)},${f(top + hc * 0.35)} ${f(X + rt)},${f(top + hc)} Z`} fill={or ? 'url(#iso-or)' : clair} />
      <rect x={f(X - r * 1.36)} y={f(top)} width={f(r * 2.72)} height={f(hc * 0.34)} fill={or ? '#e8c97e' : clair} />
      <rect x={f(X - r * 1.36)} y={f(top + hc * 0.3)} width={f(r * 2.72)} height={0.5} fill={sombre} opacity={0.5} />
      <path d={`M${f(X - rt)},${f(top + hc)} L${f(X + rt)},${f(top + hc)} L${f(X + rt)},${f(top + hc + 1.8)} L${f(X - rt)},${f(top + hc + 1.8)} Z`} fill={PAL.ombrePortee} opacity={0.22} />
    </g>
  )
}

/**
 * Toit à deux pans, faîtage NORD-SUD (pignon face au joueur) : pan ouest au
 * soleil, pan est dans l'ombre. Rangs de tuiles parallèles à l'égout, couvre-
 * joints qui montent de l'égout au faîte, faîtage clair, antéfixes au bord est.
 */
export function ToitDeuxPans({
  xa, xb, z0, z1, yEgout, yFaite, chaume = false, antefixes = false, pasTuile = 5.2,
}: { xa: number; xb: number; z0: number; z1: number; yEgout: number; yFaite: number; chaume?: boolean; antefixes?: boolean; pasTuile?: number }) {
  const xm = (xa + xb) / 2
  const O: V3[] = [[xa, yEgout, z0], [xm, yFaite, z0], [xm, yFaite, z1], [xa, yEgout, z1]]
  const E: V3[] = [[xb, yEgout, z0], [xm, yFaite, z0], [xm, yFaite, z1], [xb, yEgout, z1]]
  let rangsO = ''
  let rangsE = ''
  const nR = Math.max(3, Math.round((yFaite - yEgout) / 1.8))
  for (let i = 1; i < nR; i++) {
    const t = i / nR
    const yo = yEgout + (yFaite - yEgout) * t
    rangsO += seg([xa + (xm - xa) * t, yo, z0], [xa + (xm - xa) * t, yo, z1])
    rangsE += seg([xb + (xm - xb) * t, yo, z0], [xb + (xm - xb) * t, yo, z1])
  }
  let couvO = ''
  let couvE = ''
  const pieds: [number, number][] = []
  for (let z = z0 + pasTuile * 0.5; z < z1; z += pasTuile) {
    couvO += seg([xa, yEgout, z], [xm, yFaite, z])
    couvE += seg([xb, yEgout, z], [xm, yFaite, z])
    pieds.push(P(xb, yEgout, z))
  }
  return (
    <g>
      <path d={poly(O)} fill={chaume ? 'url(#iso-chaume-o)' : 'url(#iso-toit-o)'} />
      <path d={poly(E)} fill={chaume ? 'url(#iso-chaume-e)' : 'url(#iso-toit-e)'} />
      <path d={rangsO} stroke={chaume ? '#a5854a' : '#9a4f30'} strokeWidth={0.55} opacity={0.6} />
      <path d={rangsE} stroke={chaume ? '#6f5528' : '#5e2e1a'} strokeWidth={0.55} opacity={0.6} />
      {!chaume && <path d={couvO} stroke="#f2a67c" strokeWidth={1.1} opacity={0.55} />}
      {!chaume && <path d={couvO} stroke="#9a4f30" strokeWidth={0.4} opacity={0.5} transform="translate(0.8,0.3)" />}
      {!chaume && <path d={couvE} stroke="#b0613f" strokeWidth={1.1} opacity={0.55} />}
      {/* faîtage et égout ouest qui accrochent la lumière */}
      <path d={seg([xm, yFaite, z0], [xm, yFaite, z1])} stroke={chaume ? '#f0dca4' : PAL.toitArete} strokeWidth={1.4} />
      <path d={seg([xa, yEgout, z0], [xa, yEgout, z1])} stroke={chaume ? '#e6cd8e' : '#f0a57a'} strokeWidth={0.9} opacity={0.8} />
      <path d={seg([xb, yEgout, z0], [xb, yEgout, z1])} stroke="#4a2414" strokeWidth={0.8} opacity={0.7} />
      {antefixes && pieds.map(([X, Y], i) => (
        <path key={i} d={`M${f(X - 1)},${f(Y)} Q${f(X - 1.1)},${f(Y - 2.2)} ${f(X)},${f(Y - 2.8)} Q${f(X + 1.1)},${f(Y - 2.2)} ${f(X + 1)},${f(Y)} Z`} fill="#e39067" />
      ))}
    </g>
  )
}

/* ─────────────────────────── végétation peinte ─────────────────────────── */

const FEUILLAGES = {
  chene: ['#34502a', '#4f6f33', '#7b9a48', '#a8c068'],
  olivier: ['#4d5d44', '#6f8160', '#96a784', '#bcc8a8'],
  laurier: ['#2f4a2c', '#4a6b37', '#6f9150', '#98b56c'],
  pin: ['#22382a', '#34513a', '#527250', '#7a986a'],
} as const

/**
 * Arbre peint en masses : chaque touffe a son ombre propre (bas-droite), sa
 * demi-teinte, et son éclat haut-gauche. Tronc évasé, ombre portée SE.
 * (x, y) = pied du tronc à l'écran.
 */
export function Arbre({ x, y, s = 1, seed = 1, essence = 'chene', haut = 40, larg = 26, enfants }: { x: number; y: number; s?: number; seed?: number; essence?: keyof typeof FEUILLAGES; haut?: number; larg?: number; enfants?: ReactNode }) {
  const rnd = alea(seed)
  const [c0, c1, c2, c3] = FEUILLAGES[essence]
  const nT = 13
  const touffes = Array.from({ length: nT }, (_, k) => {
    const an = (k / nT) * Math.PI * 2 + rnd() * 0.5
    const rr = k === 0 ? 0 : 0.45 + rnd() * 0.55
    return {
      x: Math.cos(an) * larg * 0.46 * rr,
      y: -haut * 0.64 + Math.sin(an) * haut * 0.2 * rr,
      r: larg * (0.19 + rnd() * 0.1),
    }
  })
  const tronc = essence === 'olivier' ? '#6b5b44' : '#5f462d'
  const T = haut * 0.5
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={larg * 0.42} cy={1.6} rx={larg * 0.66} ry={larg * 0.17} fill={PAL.ombrePortee} opacity={0.22} filter="url(#a-flou2)" />
      <ellipse cx={0.5} cy={0.6} rx={5.4} ry={1.4} fill="#1d1408" opacity={0.3} />
      {/* tronc évasé, racines, deux maîtresses branches qui montent dans la couronne */}
      <path d={`M-5.2,0.4 C-3.4,-1 -2.6,${-T * 0.3} -2.4,${-T * 0.62} C${-larg * 0.1},${-T * 0.86} ${-larg * 0.2},${-T} ${-larg * 0.26},${-T * 1.08} L${-larg * 0.2},${-T * 1.14} C${-larg * 0.1},${-T * 1.02} -1.4,${-T * 0.9} 0,${-T * 0.84} C1.6,${-T * 0.94} ${larg * 0.14},${-T * 1.04} ${larg * 0.22},${-T * 1.14} L${larg * 0.27},${-T * 1.08} C${larg * 0.18},${-T * 0.96} 2.8,${-T * 0.8} 2.6,${-T * 0.6} C2.8,${-T * 0.3} 3.6,-1 5.6,0.4 C2,1.4 -2,1.4 -5.2,0.4 Z`} fill={tronc} />
      <path d={`M-5.2,0.4 C-3.4,-1 -2.6,${-T * 0.3} -2.4,${-T * 0.62} C${-larg * 0.1},${-T * 0.86} ${-larg * 0.2},${-T} ${-larg * 0.26},${-T * 1.08} L${-larg * 0.23},${-T * 1.1} C${-larg * 0.12},${-T * 0.94} -1.6,${-T * 0.8} -0.8,${-T * 0.5} C-0.8,${-T * 0.26} -1.4,-0.6 -2.6,0.8 Z`} fill="#a08463" opacity={0.55} />
      <path d={`M1.2,${-T * 0.2} q0.6,-3 -0.2,-6 M-1.4,${-T * 0.44} q0.8,-2 0.2,-4`} stroke="#3e2d1c" strokeWidth={0.5} fill="none" opacity={0.6} />
      {/* masse d'ombre : d'abord, un peu plus bas et à droite */}
      {touffes.map((t, i) => <circle key={`o${i}`} cx={t.x + 1.6} cy={t.y + 2.2} r={t.r * 1.05} fill={c0} />)}
      {touffes.map((t, i) => <circle key={`m${i}`} cx={t.x - 0.4} cy={t.y - 0.4} r={t.r * 0.88} fill={c1} />)}
      {touffes.map((t, i) => <ellipse key={`l${i}`} cx={t.x - t.r * 0.28} cy={t.y - t.r * 0.3} rx={t.r * 0.52} ry={t.r * 0.36} transform={`rotate(-24 ${f(t.x - t.r * 0.28)} ${f(t.y - t.r * 0.3)})`} fill={c2} opacity={0.9} />)}
      {touffes.filter((_, i) => i % 3 === 0).map((t, i) => <ellipse key={`e${i}`} cx={t.x - t.r * 0.42} cy={t.y - t.r * 0.46} rx={t.r * 0.2} ry={t.r * 0.13} fill={c3} opacity={0.85} />)}
      {touffes.map((t, i) => <path key={`p${i}`} d={`M${f(t.x - t.r * 0.7)},${f(t.y + t.r * 0.1)} q${f(t.r * 0.3)},${f(-t.r * 0.2)} ${f(t.r * 0.6)},0 M${f(t.x + t.r * 0.1)},${f(t.y + t.r * 0.5)} q${f(t.r * 0.3)},${f(-t.r * 0.2)} ${f(t.r * 0.6)},0`} stroke={c0} strokeWidth={0.5} fill="none" opacity={0.5} />)}
      {enfants}
    </g>
  )
}

/** cyprès : flamme sombre, moitié ouest éclairée, touffes étagées */
export function Cypres({ x, y, h = 44, s = 1 }: { x: number; y: number; h?: number; s?: number }) {
  const w = h * 0.2
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={h * 0.28} cy={1.4} rx={h * 0.34} ry={2.4} fill={PAL.ombrePortee} opacity={0.2} filter="url(#a-flou2)" />
      <path d={`M0,${-h} C${w * 0.7},${-h * 0.72} ${w},${-h * 0.3} ${w * 0.62},0 L${-w * 0.62},0 C${-w},${-h * 0.3} ${-w * 0.7},${-h * 0.72} 0,${-h} Z`} fill="#2f4a2c" />
      <path d={`M0,${-h} C${-w * 0.7},${-h * 0.72} ${-w},${-h * 0.3} ${-w * 0.62},0 L${w * 0.05},0 C${-w * 0.1},${-h * 0.4} ${-w * 0.05},${-h * 0.75} 0,${-h} Z`} fill="#4a6b37" />
      <path d={`M${-w * 0.2},${-h * 0.85} C${-w * 0.55},${-h * 0.6} ${-w * 0.6},${-h * 0.36} ${-w * 0.45},${-h * 0.12}`} stroke="#6f9150" strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <path d={`M${-w * 0.5},${-h * 0.5} q${w * 0.4},-1.4 ${w * 0.8},0 M${-w * 0.6},${-h * 0.28} q${w * 0.5},-1.6 ${w},0 M${-w * 0.35},${-h * 0.7} q${w * 0.3},-1.2 ${w * 0.6},0`} stroke="#243a22" strokeWidth={0.6} fill="none" opacity={0.7} />
    </g>
  )
}

/** feu de braises nu : flamme en trois valeurs, qui danse */
export function Flamme({ x, y, k = 1 }: { x: number; y: number; k?: number }) {
  const a = `M${-3 * k},0 C${-3.8 * k},${-4.4 * k} ${-1.2 * k},${-6 * k} ${-0.4 * k},${-11 * k} C${1 * k},${-6 * k} ${3.6 * k},${-4.8 * k} ${3 * k},0 Z`
  const b = `M${-3 * k},0 C${-3.4 * k},${-4.8 * k} ${-0.2 * k},${-6.6 * k} ${0.6 * k},${-12 * k} C${1.4 * k},${-6.4 * k} ${3.8 * k},${-4.4 * k} ${3 * k},0 Z`
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={0} cy={-6 * k} r={10 * k} fill="url(#iso-lueur)" opacity={0.55}>
        <animate attributeName="opacity" values="0.55;0.38;0.55" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <path d={a} fill="#c8501f">
        <animate attributeName="d" values={`${a};${b};${a}`} dur="0.9s" repeatCount="indefinite" />
      </path>
      <path d={`M${-2 * k},0 C${-2.4 * k},${-3.4 * k} ${-0.6 * k},${-4.8 * k} ${0.2 * k},${-8.4 * k} C${1.2 * k},${-4.8 * k} ${2.4 * k},${-3.6 * k} ${2 * k},0 Z`} fill="#ec8a2e" />
      <path d={`M${-1 * k},0 C${-1.2 * k},${-2.4 * k} 0,${-3.4 * k} ${0.5 * k},${-5.4 * k} C${1 * k},${-3.2 * k} ${1.3 * k},${-2 * k} ${1.1 * k},0 Z`} fill="#f9dc7d" />
    </g>
  )
}

/** colonne de fumée : trois bouffées qui montent et s'élargissent en boucle */
export function Volute({ x, y, h = 34, o = 0.42 }: { x: number; y: number; h?: number; o?: number }) {
  return (
    <g>
      {[0, 1.4, 2.8].map((d, i) => (
        <circle key={i} cx={x} cy={y} r={2} fill="url(#iso-fumee)" opacity={0}>
          <animate attributeName="cy" values={`${y};${y - h}`} dur="4.2s" begin={`${d}s`} repeatCount="indefinite" />
          <animate attributeName="cx" values={`${x};${x + 4};${x + 9}`} dur="4.2s" begin={`${d}s`} repeatCount="indefinite" />
          <animate attributeName="r" values="3;10" dur="4.2s" begin={`${d}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values={`${o};${o * 0.7};0`} dur="4.2s" begin={`${d}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  )
}
