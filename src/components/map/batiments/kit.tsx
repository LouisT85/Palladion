import type { ReactNode } from 'react'
import { PAL, alea } from '../art'
import { Arbre, Boite, ColonneDorique, Flamme, MATS, OmbreSE, P, ToitDeuxPans, Volute, poly, seg, type Mat, type V3 } from './iso'

/*
 * ═══════════════════ BOÎTE À OUTILS DES ÉDIFICES (v2) ═══════════════════
 * Pièces réutilisées par tous les bâtiments redessinés en projection 3/4 :
 * bâtisses complètes (murs + toit), baies, toits à faîtage est-ouest, mobilier
 * de chantier et de ferme, bateaux, eau. Même bible : lumière NW, ombres SE,
 * zéro contour noir, alea() jamais Math.random().
 */

const f = (n: number) => (Math.round(n * 10) / 10).toString()

/** point monde → attribut transform translate() */
export function T(x: number, y: number, z: number, s = 1): string {
  const [X, Y] = P(x, y, z)
  return `translate(${f(X)},${f(Y)})${s !== 1 ? ` scale(${s})` : ''}`
}

// ─────────────────────────────── toits ─────────────────────────────────────

/**
 * Toit à faîtage EST-OUEST : on voit le long pan SUD (qui prend le jour) et le
 * pignon EST, dans l'ombre. Rangs de tuiles parallèles au faîte, couvre-joints
 * qui descendent vers l'égout.
 */
export function ToitEO({
  xa, xb, z0, z1, yEgout, yFaite, chaume = false, pas = 4.6, pignon, flanc,
}: { xa: number; xb: number; z0: number; z1: number; yEgout: number; yFaite: number; chaume?: boolean; pas?: number; pignon?: string; flanc?: boolean }) {
  const zm = (z0 + z1) / 2
  const S: V3[] = [[xa, yEgout, z0], [xb, yEgout, z0], [xb, yFaite, zm], [xa, yFaite, zm]]
  const N: V3[] = [[xa, yFaite, zm], [xb, yFaite, zm], [xb, yEgout, z1], [xa, yEgout, z1]]
  let rangs = ''
  const nR = Math.max(3, Math.round((yFaite - yEgout) / 1.7))
  for (let i = 1; i < nR; i++) {
    const t = i / nR
    rangs += seg([xa, yEgout + (yFaite - yEgout) * t, z0 + (zm - z0) * t], [xb, yEgout + (yFaite - yEgout) * t, z0 + (zm - z0) * t])
  }
  let couv = ''
  for (let x = xa + pas * 0.5; x < xb; x += pas) couv += seg([x, yEgout, z0], [x, yFaite, zm])
  return (
    <g>
      <path d={poly(N)} fill={chaume ? '#8a6d38' : '#7e3f25'} />
      <path d={poly(S)} fill={chaume ? 'url(#iso-chaume-o)' : 'url(#iso-toit-o)'} />
      <path d={rangs} stroke={chaume ? '#9a7a3e' : '#9a4f30'} strokeWidth={0.55} opacity={0.6} />
      {!chaume && <path d={couv} stroke="#f2a67c" strokeWidth={1} opacity={0.5} />}
      {!chaume && <path d={couv} stroke="#8e4428" strokeWidth={0.4} opacity={0.45} transform="translate(0.7,0.2)" />}
      {chaume && <path d={couv} stroke="#f0dca4" strokeWidth={0.5} opacity={0.35} />}
      {flanc !== false && <path d={poly([[xb, yEgout, z0], [xb, yFaite, zm], [xb, yEgout, z1]])} fill={pignon ?? (chaume ? '#8a6d38' : '#8e4a2e')} />}
      <path d={seg([xa, yFaite, zm], [xb, yFaite, zm])} stroke={chaume ? '#f0dca4' : PAL.toitArete} strokeWidth={1.3} />
      <path d={seg([xa, yEgout, z0], [xb, yEgout, z0])} stroke={chaume ? '#6f5528' : '#5e2e1a'} strokeWidth={0.8} opacity={0.7} />
      <path d={seg([xb, yEgout, z0], [xb, yFaite, zm])} stroke={chaume ? '#e6cd8e' : '#e39067'} strokeWidth={0.8} opacity={0.6} />
    </g>
  )
}

// ─────────────────────────────── bâtisse ───────────────────────────────────

export type Toit = 'tuiles' | 'chaume' | 'plat' | 'terrasse'

/**
 * Une bâtisse complète : ombre portée SE, murs (façade sud, flanc est), baies
 * (enfants, dessinées sur les murs), puis le toit. `faite` choisit l'axe du
 * faîtage : NS montre le pignon au joueur, EO le long pan.
 */
export function Batisse({
  x0, x1, z0, z1, h, m = MATS.stuc, toit = 'tuiles', faite = 'NS', g, deb = 2.2, enfants, soubassement = true, ombre = true, porche,
}: {
  x0: number; x1: number; z0: number; z1: number; h: number; m?: Mat; toit?: Toit; faite?: 'NS' | 'EO'; g?: number; deb?: number
  enfants?: ReactNode; soubassement?: boolean; ombre?: boolean
  /** porche à colonnes en façade : profondeur, nombre de colonnes, matière */
  porche?: { p: number; cols: number; mat?: 'bois' | 'pierre' | 'marbre' }
}) {
  const w = x1 - x0
  const d = z1 - z0
  const zw = z0 + (porche?.p ?? 0)
  const gg = g ?? (faite === 'NS' ? w * 0.34 : d * 0.34)
  const chaume = toit === 'chaume'
  return (
    <g>
      {ombre && <OmbreSE x0={x0} x1={x1} z0={z0} z1={z1} h={h + gg} />}
      <Boite x0={x0} x1={x1} z0={zw} z1={z1} y0={0} y1={h} m={m} sansDessus={toit !== 'plat' && toit !== 'terrasse'} />
      {soubassement && <Boite x0={x0 - 0.4} x1={x1 + 0.4} z0={zw - 0.4} z1={z1} y0={0} y1={2.2} m={MATS.moellon} sansDessus />}
      {/* bande d'ombre sous l'avant-toit */}
      {toit !== 'plat' && toit !== 'terrasse' && (
        <path d={poly([[x0, h - 3, zw], [x1, h - 3, zw], [x1, h - 3, z1], [x1, h, z1], [x1, h, zw], [x0, h, zw]])} fill={PAL.ombrePortee} opacity={0.26} filter="url(#a-flou1)" />
      )}
      {porche && <path d={poly([[x0, h - 8, zw], [x1, h - 8, zw], [x1, h, zw], [x0, h, zw]])} fill={PAL.ombrePortee} opacity={0.3} filter="url(#a-flou1)" />}
      {enfants}
      {porche && (
        <>
          <Boite x0={x0 - 0.6} x1={x1 + 0.6} z0={z0 - 1} z1={zw} y0={0} y1={1.4} m={porche.mat === 'bois' ? MATS.moellon : porche.mat === 'marbre' ? MATS.marbre : MATS.pierre} />
          <Boite x0={x1 - 2.4} x1={x1} z0={z0} z1={zw} y0={1.4} y1={h} m={m} />
          {Array.from({ length: porche.cols }, (_, i) => {
            const cx = x0 + 2.6 + (i * (w - 5.2)) / Math.max(1, porche.cols - 1)
            return <ColonneDorique key={i} x={cx} y0={1.4} z={z0 + 1.4} h={h - 3.6} r={porche.mat === 'bois' ? 1.3 : 1.8} mat={porche.mat ?? 'pierre'} />
          })}
          <Boite x0={x0 - 0.4} x1={x1 + 0.4} z0={z0} z1={zw + 0.4} y0={h - 2.2} y1={h} m={porche.mat === 'bois' ? MATS.bois : m} sansDessus />
        </>
      )}
      {toit === 'plat' && (
        <>
          <Boite x0={x0 - 0.6} x1={x1 + 0.6} z0={z0 - 0.6} z1={z1 + 0.6} y0={h} y1={h + 1.6} m={m} />
          <path d={poly([[x0 + 1, h + 1.62, z0 + 1], [x1 - 1, h + 1.62, z0 + 1], [x1 - 1, h + 1.62, z1 - 1], [x0 + 1, h + 1.62, z1 - 1]])} fill="#a89274" opacity={0.5} />
        </>
      )}
      {toit === 'terrasse' && (
        <>
          <Boite x0={x0} x1={x1} z0={z0} z1={z1} y0={h} y1={h + 1} m={MATS.bois} />
          <path d={poly([[x0 + 0.6, h + 1.02, z0 + 0.6], [x1 - 0.6, h + 1.02, z0 + 0.6], [x1 - 0.6, h + 1.02, z1 - 0.6], [x0 + 0.6, h + 1.02, z1 - 0.6]])} fill="#bda57c" />
          {Array.from({ length: Math.floor(w / 3) }, (_, i) => <path key={i} d={seg([x0 + 1.5 + i * 3, h + 1.05, z0 + 0.6], [x0 + 1.5 + i * 3, h + 1.05, z1 - 0.6])} stroke="#8a7350" strokeWidth={0.4} opacity={0.6} />)}
        </>
      )}
      {(toit === 'tuiles' || toit === 'chaume') && faite === 'NS' && (
        <>
          <ToitDeuxPans xa={x0 - deb} xb={x1 + deb} z0={z0 - deb} z1={z1 + deb * 0.6} yEgout={h} yFaite={h + gg} chaume={chaume} antefixes={!chaume} pasTuile={chaume ? 3.4 : 4.6} />
          <path d={poly([[x0, h, z0], [(x0 + x1) / 2, h + gg - 1, z0], [x1, h, z0]])} fill={m.face} />
          <path d={poly([[x0, h, z0], [(x0 + x1) / 2, h + gg - 1, z0], [x1, h, z0]])} fill={PAL.ombrePortee} opacity={0.18} />
          <path d={seg([x0 - deb, h, z0 - deb], [(x0 + x1) / 2, h + gg, z0 - deb]) + seg([(x0 + x1) / 2, h + gg, z0 - deb], [x1 + deb, h, z0 - deb])} stroke={chaume ? '#f0dca4' : '#f0a57a'} strokeWidth={chaume ? 1.6 : 1.1} />
        </>
      )}
      {(toit === 'tuiles' || toit === 'chaume') && faite === 'EO' && (
        <>
          <path d={poly([[x1, h, z0], [x1, h + gg - 1, (z0 + z1) / 2], [x1, h, z1]])} fill={m.flanc} />
          <ToitEO xa={x0 - deb} xb={x1 + deb} z0={z0 - deb} z1={z1 + deb} yEgout={h} yFaite={h + gg} chaume={chaume} flanc={false} />
        </>
      )}
    </g>
  )
}

/**
 * Une baie sur un mur : porte, fenêtre, arche. `face` = 'S' (mur z = plan,
 * `a` = x du centre) ou 'E' (mur x = plan, `a` = z du centre).
 */
export function Baie({
  face = 'S', a, plan, y0 = 0, w, h, type = 'fenetre', volets = false, lueur = false,
}: { face?: 'S' | 'E'; a: number; plan: number; y0?: number; w: number; h: number; type?: 'porte' | 'fenetre' | 'arche'; volets?: boolean; lueur?: boolean }) {
  const q = (u: number, y: number): V3 => (face === 'S' ? [a + u, y, plan - 0.05] : [plan + 0.05, y, a + u])
  const r = w / 2
  const haut = type === 'arche' ? y0 + h - r : y0 + h
  const arc = (rr: number, dy = 0) => {
    const pts: V3[] = []
    for (let i = 0; i <= 8; i++) {
      const t = Math.PI - (i / 8) * Math.PI
      pts.push(q(Math.cos(t) * rr, haut + Math.sin(t) * rr + dy))
    }
    return pts
  }
  const cadre: V3[] = type === 'arche' ? [q(-r - 1, y0), ...arc(r + 1), q(r + 1, y0)] : [q(-r - 1, y0 - (type === 'fenetre' ? 1 : 0)), q(r + 1, y0 - (type === 'fenetre' ? 1 : 0)), q(r + 1, haut + 1.2), q(-r - 1, haut + 1.2)]
  const vide: V3[] = type === 'arche' ? [q(-r, y0), ...arc(r), q(r, y0)] : [q(-r, y0), q(r, y0), q(r, haut), q(-r, haut)]
  const flanc = face === 'E'
  return (
    <g>
      <path d={poly(cadre)} fill={flanc ? '#8f856b' : '#d8cfb7'} opacity={0.85} />
      <path d={poly(vide)} fill={lueur ? '#3a220e' : '#2a1d10'} />
      {lueur && <path d={poly(vide)} fill="url(#iso-lueur)" opacity={0.7}><animate attributeName="opacity" values="0.55;0.85;0.55" dur="3.6s" repeatCount="indefinite" /></path>}
      {type === 'porte' && !lueur && (
        <>
          <path d={poly([q(-r + 0.6, y0), q(r - 0.6, y0), q(r - 0.6, haut - 0.4), q(-r + 0.6, haut - 0.4)])} fill={flanc ? '#5a4128' : '#7a5a36'} />
          <path d={seg(q(0, y0), q(0, haut - 0.4))} stroke="#3d2c17" strokeWidth={0.6} />
          <path d={seg(q(-r + 0.6, y0 + h * 0.3), q(r - 0.6, y0 + h * 0.3)) + seg(q(-r + 0.6, y0 + h * 0.7), q(r - 0.6, y0 + h * 0.7))} stroke="#3d2c17" strokeWidth={0.4} opacity={0.6} />
        </>
      )}
      {/* ombre du linteau dans l'embrasure */}
      <path d={poly([q(-r, haut - 1.2), q(r, haut - 1.2), q(r, haut), q(-r, haut)])} fill="#140d05" opacity={0.6} />
      {type === 'fenetre' && <path d={seg(q(-r - 1, y0 - 0.2), q(r + 1, y0 - 0.2))} stroke="#f2ead6" strokeWidth={0.8} opacity={flanc ? 0.4 : 0.9} />}
      {volets && (
        <>
          <path d={poly([q(-r - 3.2, y0), q(-r - 0.6, y0), q(-r - 0.6, haut), q(-r - 3.2, haut)])} fill={flanc ? '#56766a' : '#7c9a8e'} />
          <path d={poly([q(r + 0.6, y0), q(r + 3.2, y0), q(r + 3.2, haut), q(r + 0.6, haut)])} fill={flanc ? '#4b675c' : '#6b8a7d'} />
        </>
      )}
    </g>
  )
}

// ─────────────────────────────── sols ──────────────────────────────────────

/** tache de sol libre (écran), deux tons, bord fondu - terre battue, sable */
export function Sol({ cx, cy, rx, ry, c1 = '#b39f70', c2 = '#c8b485', rot = 0 }: { cx: number; cy: number; rx: number; ry: number; c1?: string; c2?: string; rot?: number }) {
  return (
    <g transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={c1} opacity={0.55} filter="url(#a-flou2)" />
      <ellipse cx={cx - rx * 0.08} cy={cy + ry * 0.04} rx={rx * 0.72} ry={ry * 0.66} fill={c2} opacity={0.55} />
    </g>
  )
}

/** champ en plan : sillons parallèles à l'axe x, culture selon le niveau */
export function Champ({
  x0, x1, z0, z1, culture = 'ble', seed = 1,
}: { x0: number; x1: number; z0: number; z1: number; culture?: 'labour' | 'ble' | 'mur' | 'vigne' | 'legumes'; seed?: number }) {
  const rnd = alea(seed)
  const fond = culture === 'labour' ? '#8a6a44' : culture === 'ble' ? '#9aa24e' : culture === 'mur' ? '#d9b75a' : culture === 'vigne' ? '#9b8458' : '#7d6a44'
  const sillon = culture === 'labour' ? '#6f5234' : culture === 'ble' ? '#7b8a3c' : culture === 'mur' ? '#b8913a' : '#7a6440'
  const clair = culture === 'labour' ? '#a88660' : culture === 'ble' ? '#b9c068' : culture === 'mur' ? '#f0d47a' : '#b9a070'
  let dS = ''
  let dC = ''
  for (let z = z0 + 2; z < z1 - 1; z += 3) {
    dS += seg([x0 + 0.8, 0, z], [x1 - 0.8, 0, z])
    dC += seg([x0 + 0.8, 0, z + 1], [x1 - 0.8, 0, z + 1])
  }
  const plants: ReactNode[] = []
  if (culture === 'vigne' || culture === 'legumes') {
    for (let z = z0 + 3; z < z1 - 2; z += culture === 'vigne' ? 6 : 4) {
      for (let x = x0 + 3; x < x1 - 2; x += culture === 'vigne' ? 5 : 3.4) {
        const [X, Y] = P(x + rnd(), 0, z)
        plants.push(
          culture === 'vigne' ? (
            <g key={`${x}-${z}`}>
              <path d={`M${f(X)},${f(Y)} l0,-5`} stroke="#5f462d" strokeWidth={0.6} />
              <ellipse cx={X - 0.4} cy={Y - 5.4} rx={2.4} ry={1.8} fill="#4f6f33" />
              <ellipse cx={X - 1} cy={Y - 6} rx={1.2} ry={0.8} fill="#7b9a48" />
              {rnd() > 0.5 && <circle cx={X + 1} cy={Y - 4.4} r={0.7} fill="#6a3a5a" />}
            </g>
          ) : (
            <g key={`${x}-${z}`}>
              <ellipse cx={X} cy={Y - 1} rx={1.4} ry={1} fill={rnd() > 0.5 ? '#4f6f33' : '#6f9150'} />
              <ellipse cx={X - 0.4} cy={Y - 1.4} rx={0.6} ry={0.4} fill="#98b56c" />
            </g>
          ),
        )
      }
    }
  }
  return (
    <g>
      <path d={poly([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]])} fill={fond} />
      <path d={dS} stroke={sillon} strokeWidth={1} opacity={0.75} />
      <path d={dC} stroke={clair} strokeWidth={0.8} opacity={0.7} />
      {culture === 'mur' && (
        <path d={poly([[x0, 0, z0], [x1, 0, z0], [x1, 2.6, z0], [x0, 2.6, z0]])} fill="#c9a44a" />
      )}
      {culture === 'mur' && <path d={seg([x0, 2.6, z0], [x1, 2.6, z0]) + seg([x0, 2.6, z0], [x0, 2.6, z1])} stroke="#f6e39b" strokeWidth={0.8} />}
      {plants}
      <path d={seg([x0, 0, z0], [x1, 0, z0]) + seg([x1, 0, z0], [x1, 0, z1])} stroke="#5f4a2e" strokeWidth={0.8} opacity={0.45} />
    </g>
  )
}

/** clôture de piquets et deux lisses, le long d'une polyligne monde (y = 0) */
export function Cloture({ pts, h = 5.4, pas = 5 }: { pts: [number, number][]; h?: number; pas?: number }) {
  let piq = ''
  let lis = ''
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i]
    const [bx, bz] = pts[i + 1]
    const L = Math.hypot(bx - ax, bz - az)
    const n = Math.max(1, Math.round(L / pas))
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n
      const z = az + ((bz - az) * k) / n
      piq += seg([x, 0, z], [x, h, z])
    }
    lis += seg([ax, h * 0.8, az], [bx, h * 0.8, bz]) + seg([ax, h * 0.42, az], [bx, h * 0.42, bz])
  }
  return (
    <g>
      <path d={piq} stroke="#5f462d" strokeWidth={1.1} />
      <path d={lis} stroke="#8a6941" strokeWidth={0.9} />
      <path d={lis} stroke="#c09a68" strokeWidth={0.35} transform="translate(0,-0.35)" />
    </g>
  )
}

/** muret de moellons le long de l'axe x (z fixe) ou z (x fixe) */
export function Muret({ x0, x1, z0, z1, h = 4, m = MATS.moellon }: { x0: number; x1: number; z0: number; z1: number; h?: number; m?: Mat }) {
  return (
    <g>
      <Boite x0={x0} x1={x1} z0={z0} z1={z1} y0={0} y1={h} m={m} />
      <path d={seg([x0, h * 0.5, z0], [x1, h * 0.5, z0])} stroke={m.joint} strokeWidth={0.4} opacity={0.6} />
    </g>
  )
}

// ─────────────────────────────── mobilier ──────────────────────────────────

export function Caisse({ x, z, c = 5, y = 0 }: { x: number; z: number; c?: number; y?: number }) {
  return (
    <g>
      <Boite x0={x} x1={x + c} z0={z} z1={z + c} y0={y} y1={y + c * 0.9} m={MATS.bois} />
      <path d={seg([x, y, z], [x + c, y + c * 0.9, z]) + seg([x + c, y, z], [x, y + c * 0.9, z])} stroke="#4f3a24" strokeWidth={0.5} opacity={0.7} />
    </g>
  )
}

export function Tonneau({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <g transform={T(x, 0, z, s)}>
      <ellipse cx={2} cy={0.6} rx={4.4} ry={1.2} fill={PAL.ombrePortee} opacity={0.22} />
      <path d="M-3,0 C-3.8,-2.6 -3.8,-5.4 -3,-8 L3,-8 C3.8,-5.4 3.8,-2.6 3,0 Z" fill="url(#iso-fut-bois)" />
      <ellipse cx={0} cy={-8} rx={3} ry={0.9} fill="#a8845d" />
      <path d="M-3.4,-2 L3.4,-2 M-3.5,-6 L3.5,-6" stroke="#4a4540" strokeWidth={0.7} />
    </g>
  )
}

export function Amphores({ x, z, n = 3, s = 1, seed = 2 }: { x: number; z: number; n?: number; s?: number; seed?: number }) {
  const rnd = alea(seed)
  const tons = ['#a3673f', '#8c552f', '#b1764a']
  return (
    <g transform={T(x, 0, z, s)}>
      <ellipse cx={n * 2} cy={0.8} rx={n * 3.4} ry={1.4} fill={PAL.ombrePortee} opacity={0.2} />
      {Array.from({ length: n }, (_, i) => {
        const ax = i * 4.4 - (i % 2) * 0.6
        const ay = (i % 2) * 1.2
        const h = 8 + rnd() * 1.6
        return (
          <g key={i} transform={`translate(${f(ax)},${f(ay)})`}>
            <path d={`M-2.3,${-h * 0.2} C-3.4,${-h * 0.5} -2.8,${-h * 0.85} -1.3,${-h} L-1.8,${-h - 1.4} L1.8,${-h - 1.4} L1.3,${-h} C2.8,${-h * 0.85} 3.4,${-h * 0.5} 2.3,${-h * 0.2} L0,0.6 Z`} fill={tons[i % 3]} />
            <path d={`M-2,${-h * 0.3} C-2.8,${-h * 0.55} -2.2,${-h * 0.82} -1.2,${-h + 0.3}`} stroke="#e0b07e" strokeWidth={0.9} fill="none" opacity={0.6} />
            <path d={`M-1.8,${-h - 1} q-1.4,-1 -0.6,-2 M1.8,${-h - 1} q1.4,-1 0.6,-2`} stroke="#6a4324" strokeWidth={0.6} fill="none" />
          </g>
        )
      })}
    </g>
  )
}

export function Sacs({ x, z, n = 3, s = 1 }: { x: number; z: number; n?: number; s?: number }) {
  return (
    <g transform={T(x, 0, z, s)}>
      <ellipse cx={n * 2} cy={0.6} rx={n * 3.2} ry={1.3} fill={PAL.ombrePortee} opacity={0.2} />
      {Array.from({ length: n }, (_, i) => {
        const sx = i * 4.2
        const sy = i === n - 1 && n > 2 ? -4.4 : 0
        const ox = i === n - 1 && n > 2 ? -6.2 : 0
        return (
          <g key={i} transform={`translate(${f(sx + ox)},${sy})`}>
            <path d="M-2.8,0 C-3.6,-2.6 -2.6,-5.2 -1,-5.6 L-0.6,-6.6 L0.8,-6.6 L1.2,-5.6 C2.8,-5.2 3.6,-2.6 2.8,0 Z" fill="#cbb289" />
            <path d="M-2.8,0 C-3.6,-2.6 -2.6,-5.2 -1,-5.6 L-0.4,-5.4 C-1.6,-4 -2,-2 -1.4,0 Z" fill="#e4d2ac" />
            <path d="M1.2,-5.6 C2.8,-5.2 3.6,-2.6 2.8,0 L1.4,0 C2.2,-2 2,-4 1.2,-5.6 Z" fill="#a08a64" />
          </g>
        )
      })}
    </g>
  )
}

/** pile de grumes le long de x, bouts de bois tournés vers l'est (visibles) */
export function PileGrumes({ x, z, L = 22, rangs = 2, r = 2.2 }: { x: number; z: number; L?: number; rangs?: number; r?: number }) {
  const out: ReactNode[] = []
  let k = 0
  for (let j = 0; j < rangs; j++) {
    const n = rangs - j + 1
    for (let i = 0; i < n; i++) {
      const zz = z + i * r * 2 + j * r
      const yy = r + j * r * 1.7
      const [ax, ay] = P(x, yy, zz)
      const [bx, by] = P(x + L, yy, zz)
      out.push(
        <g key={k++}>
          <path d={`M${f(ax)},${f(ay - r)} L${f(bx)},${f(by - r)} L${f(bx)},${f(by + r)} L${f(ax)},${f(ay + r)} Z`} fill={j % 2 ? '#7c5a30' : '#6a4b2a'} />
          <path d={`M${f(ax)},${f(ay - r)} L${f(bx)},${f(by - r)}`} stroke="#a98050" strokeWidth={0.8} />
          <path d={`M${f(ax + L * 0.3)},${f(ay - r * 0.2)} l${f(L * 0.2)},0 M${f(ax + L * 0.6)},${f(ay + r * 0.4)} l${f(L * 0.16)},0`} stroke="#4c3418" strokeWidth={0.4} opacity={0.6} />
          <ellipse cx={bx} cy={by} rx={r * 0.9} ry={r} fill="#cba66b" />
          <ellipse cx={bx} cy={by} rx={r * 0.5} ry={r * 0.55} fill="none" stroke="#a47f4c" strokeWidth={0.4} />
        </g>,
      )
    }
  }
  return (
    <g>
      <OmbreSE x0={x} x1={x + L} z0={z} z1={z + rangs * r * 3} h={rangs * r * 3} o={0.18} />
      {out}
    </g>
  )
}

/** pile de planches sciées, empilées en croisillons */
export function PilePlanches({ x, z, L = 18, n = 5 }: { x: number; z: number; L?: number; n?: number }) {
  return (
    <g>
      <OmbreSE x0={x} x1={x + L} z0={z} z1={z + 8} h={n * 1.3} o={0.16} />
      {Array.from({ length: n }, (_, i) => (
        <Boite key={i} x0={x + (i % 2) * 0.6} x1={x + L - (i % 2) * 0.6} z0={z} z1={z + 8} y0={i * 1.3} y1={i * 1.3 + 1.1} m={i % 2 ? MATS.bois : { ...MATS.bois, dessus: '#d0ad7c' }} />
      ))}
    </g>
  )
}

/** bloc de pierre taillée, avec éventuels traits de scie */
export function Bloc({ x, z, w = 8, d = 6, h = 5, m = MATS.pierre, y = 0 }: { x: number; z: number; w?: number; d?: number; h?: number; m?: Mat; y?: number }) {
  return (
    <g>
      <OmbreSE x0={x} x1={x + w} z0={z} z1={z + d} h={h + y} o={0.16} />
      <Boite x0={x} x1={x + w} z0={z} z1={z + d} y0={y} y1={y + h} m={m} />
      <path d={seg([x + w * 0.3, y + h, z], [x + w * 0.3, y + h * 0.4, z])} stroke={m.joint} strokeWidth={0.4} opacity={0.5} />
    </g>
  )
}

/** feu de camp ou foyer de plein air, cercle de pierres */
export function Foyer({ x, z, k = 1 }: { x: number; z: number; k?: number }) {
  const [X, Y] = P(x, 0, z)
  return (
    <g>
      <ellipse cx={X} cy={Y} rx={5 * k} ry={1.8 * k} fill="#3a2c1c" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = (i / 7) * Math.PI * 2
        return <ellipse key={i} cx={X + Math.cos(a) * 5 * k} cy={Y + Math.sin(a) * 1.8 * k} rx={1.3 * k} ry={0.8 * k} fill={Math.sin(a) < 0 ? '#b7ad96' : '#8b8169'} />
      })}
      <Flamme x={X} y={Y - 0.4} k={0.8 * k} />
      <Volute x={X + 1} y={Y - 9 * k} h={28} o={0.34} />
    </g>
  )
}

/** puits : margelle ronde, potence et seau */
export function Puits({ x, z }: { x: number; z: number }) {
  const [X, Y] = P(x, 0, z)
  return (
    <g transform={`translate(${f(X)},${f(Y)})`}>
      <ellipse cx={4} cy={1} rx={9} ry={2.4} fill={PAL.ombrePortee} opacity={0.2} filter="url(#a-flou1)" />
      <path d="M-5.6,0 L-5.6,-4.6 A5.6,2 0 0 1 5.6,-4.6 L5.6,0 A5.6,2 0 0 1 -5.6,0 Z" fill="url(#iso-pierre-f)" />
      <path d="M1.4,1.9 A5.6,2 0 0 0 5.6,0 L5.6,-4.6 A5.6,2 0 0 1 1.4,-2.7 Z" fill="url(#iso-pierre-s)" />
      <ellipse cx={0} cy={-4.6} rx={5.6} ry={2} fill="#e8e0cc" />
      <ellipse cx={0} cy={-4.6} rx={4.2} ry={1.4} fill="#1f2a30" />
      <path d="M-4.8,-4.6 L-4.8,-15 M4.8,-4.6 L4.8,-15 M-5.6,-15 L5.6,-15" stroke="#6a4e30" strokeWidth={1.2} />
      <path d="M0,-15 L0,-9.4" stroke="#c9b689" strokeWidth={0.4} />
      <path d="M-1.4,-9.4 L1.4,-9.4 L1,-7.4 L-1,-7.4 Z" fill="#7c5a30" />
    </g>
  )
}

/** mouton ou chèvre qui broute (la tête plonge par à-coups) */
export function Betail({ x, z, s = 1, sorte = 'mouton', flip = false, d = 0 }: { x: number; z: number; s?: number; sorte?: 'mouton' | 'chevre' | 'boeuf'; flip?: boolean; d?: number }) {
  const [X, Y] = P(x, 0, z)
  const c = sorte === 'mouton' ? ['#efe9dc', '#d6ccb8', '#b8ad96'] : sorte === 'chevre' ? ['#c9a878', '#a8845d', '#7c5a30'] : ['#b58a5e', '#8f6a44', '#6a4b2a']
  const k = sorte === 'boeuf' ? 1.6 : 1
  return (
    <g transform={`translate(${f(X)},${f(Y)}) scale(${flip ? -s * k : s * k},${s * k})`}>
      <ellipse cx={1} cy={0.4} rx={4.6} ry={1.1} fill={PAL.ombrePortee} opacity={0.2} />
      <path d="M-2.8,-2.6 L-2.8,0 M-1.6,-2.4 L-1.6,0 M1.8,-2.4 L1.8,0 M2.8,-2.6 L2.8,0" stroke={c[2]} strokeWidth={0.7} />
      <ellipse cx={0} cy={-3.8} rx={4} ry={2.2} fill={c[1]} />
      <ellipse cx={-0.6} cy={-4.4} rx={3} ry={1.4} fill={c[0]} />
      <g>
        <animateTransform attributeName="transform" type="rotate" values="0 -3.6 -4.4;0 -3.6 -4.4;34 -3.6 -4.4;34 -3.6 -4.4;0 -3.6 -4.4" keyTimes="0;0.4;0.5;0.85;1" dur="4.6s" begin={`${-d}s`} repeatCount="indefinite" />
        <ellipse cx={-5} cy={-4.8} rx={1.7} ry={1.2} fill={sorte === 'mouton' ? '#4a4038' : c[1]} />
        {sorte !== 'mouton' && <path d="M-4.8,-5.8 q-0.4,-1.6 0.8,-2.2 M-5.6,-5.8 q-1,-1.4 -0.2,-2.4" stroke={sorte === 'boeuf' ? '#e8dcc0' : '#6a4b2a'} strokeWidth={0.5} fill="none" />}
      </g>
    </g>
  )
}

/** charrette à deux roues, timon au sol, chargée ou non */
export function Charrette({ x, z, charge, flip = false }: { x: number; z: number; charge?: 'bois' | 'pierre' | 'grain' | 'amphores'; flip?: boolean }) {
  const [X, Y] = P(x, 0, z)
  return (
    <g transform={`translate(${f(X)},${f(Y)})${flip ? ' scale(-1,1)' : ''}`}>
      <ellipse cx={3} cy={0.8} rx={12} ry={2} fill={PAL.ombrePortee} opacity={0.2} filter="url(#a-flou1)" />
      <path d="M-8,-5 L-18,-1.4" stroke="#5f462d" strokeWidth={1.1} />
      <path d="M-8,-9 L8,-9 L9,-5 L-8,-5 Z" fill="#8a6941" />
      <path d="M-8,-9 L8,-9 L7.6,-8.2 L-7.8,-8.2 Z" fill="#c09a68" />
      <path d="M-8,-5 L9,-5" stroke="#4f3a24" strokeWidth={0.8} />
      {charge === 'bois' && [0, 1, 2].map((i) => <rect key={i} x={-7 + i * 1.2} y={-12 - i * 1.8} width={14 - i * 2.4} height={2.2} rx={1.1} fill={i % 2 ? '#8a6535' : '#6a4b2a'} />)}
      {charge === 'pierre' && <><rect x={-6} y={-13} width={7} height={4} fill="#c7bca2" /><rect x={1.4} y={-12.4} width={5.4} height={3.4} fill="#b3a88d" /><rect x={-6} y={-13} width={7} height={1.2} fill="#e8e0cc" /></>}
      {charge === 'grain' && <><path d="M-6,-9 C-6.6,-12 -4,-14 -2,-13 C0,-15 3,-15 4,-13 C6,-13.4 7.6,-11 7,-9 Z" fill="#cbb289" /><path d="M-6,-9 C-6.6,-12 -4,-14 -2,-13 L-2,-9 Z" fill="#e4d2ac" /></>}
      {charge === 'amphores' && [-4.6, -0.6, 3.4].map((ax) => <path key={ax} d={`M${ax - 1.6},-9 C${ax - 2.4},-11 ${ax - 1.8},-13 ${ax - 0.8},-13.6 L${ax - 1},-14.6 L${ax + 1},-14.6 L${ax + 0.8},-13.6 C${ax + 1.8},-13 ${ax + 2.4},-11 ${ax + 1.6},-9 Z`} fill="#a3673f" />)}
      <circle cx={2} cy={-4} r={4.2} fill="none" stroke="#4a3520" strokeWidth={1.3} />
      <path d="M2,-8 L2,0 M-2,-4 L6,-4 M-0.9,-6.9 L4.9,-1.1 M-0.9,-1.1 L4.9,-6.9" stroke="#7c5a30" strokeWidth={0.55} />
      <circle cx={2} cy={-4} r={0.9} fill="#8a6941" />
      <path d="M-2,-6.4 A4.2,4.2 0 0 1 1.6,-8.2" stroke="#b58f60" strokeWidth={0.5} fill="none" />
    </g>
  )
}

/** fanion triangulaire qui claque, sur sa hampe - planté au point monde */
export function Oriflamme({ x, z, y = 0, h = 20, c = '#b0412e', c2 = '#e2735a', d = 0 }: { x: number; z: number; y?: number; h?: number; c?: string; c2?: string; d?: number }) {
  const [X, Y] = P(x, y, z)
  const f1 = `M0.9,${-h + 0.6} Q6,${-h + 1} 12,${-h + 3.4} Q6,${-h + 4.6} 0.9,${-h + 6.6} Z`
  const f2 = `M0.9,${-h + 0.6} Q6,${-h + 3} 12,${-h + 2.4} Q6,${-h + 6} 0.9,${-h + 6.6} Z`
  return (
    <g transform={`translate(${f(X)},${f(Y)})`}>
      {y === 0 && <ellipse cx={1.6} cy={0.6} rx={3.2} ry={1.1} fill={PAL.ombrePortee} opacity={0.2} />}
      <line x1={0} y1={0} x2={0} y2={-h} stroke="#6a4e30" strokeWidth={1.2} />
      <line x1={-0.4} y1={0} x2={-0.4} y2={-h} stroke="#a8845d" strokeWidth={0.45} />
      <circle cx={0} cy={-h - 0.6} r={0.9} fill={PAL.or} />
      <path d={f1} fill={c}>
        <animate attributeName="d" values={`${f1};${f2};${f1}`} dur="1.8s" begin={`${-d}s`} repeatCount="indefinite" />
      </path>
      <path d={`M0.9,${-h + 0.6} Q4,${-h + 1} 7,${-h + 2} L0.9,${-h + 3.2} Z`} fill={c2} opacity={0.7} />
    </g>
  )
}

/** vélum rayé tendu sur quatre perches (étal, marché, auvent) */
export function Velum({ x0, x1, z0, z1, h = 14, c = '#b0412e', c2 = '#efe3c4' }: { x0: number; x1: number; z0: number; z1: number; h?: number; c?: string; c2?: string }) {
  const n = Math.max(3, Math.round((x1 - x0) / 3))
  const bandes: ReactNode[] = []
  for (let i = 0; i < n; i++) {
    const a = x0 + ((x1 - x0) * i) / n
    const b = x0 + ((x1 - x0) * (i + 1)) / n
    bandes.push(<path key={i} d={poly([[a, h, z0], [b, h, z0], [b, h + 2.4, z1], [a, h + 2.4, z1]])} fill={i % 2 ? c2 : c} />)
  }
  let fr = ''
  for (let i = 0; i <= n; i++) {
    const a = x0 + ((x1 - x0) * i) / n
    fr += seg([a, h, z0], [a, h - 1.6, z0])
  }
  return (
    <g>
      {[[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z], i) => <path key={i} d={seg([x, 0, z], [x, h + (z === z1 ? 2.4 : 0), z])} stroke="#5f462d" strokeWidth={1} />)}
      {bandes}
      <path d={poly([[x0, h, z0], [x1, h, z0], [x1, h + 2.4, z1], [x0, h + 2.4, z1]])} fill="#fff8e6" opacity={0.12} />
      <path d={fr} stroke={c} strokeWidth={1.1} />
      <path d={poly([[x0, 0, z0 - 1], [x1, 0, z0 - 1], [x1 + 3, 0, z0 - 6], [x0 + 3, 0, z0 - 6]])} fill={PAL.ombrePortee} opacity={0} />
    </g>
  )
}

// ─────────────────────────────── végétation ────────────────────────────────

/** petit buisson de laurier-rose / myrte */
export function Buisson({ x, z, s = 1, seed = 1, fleurs }: { x: number; z: number; s?: number; seed?: number; fleurs?: string }) {
  const [X, Y] = P(x, 0, z)
  const rnd = alea(seed)
  return (
    <g>
      <Arbre x={X} y={Y} essence="laurier" haut={10 * s} larg={16 * s} seed={seed} />
      {fleurs && Array.from({ length: 6 }, (_, i) => <circle key={i} cx={X + (rnd() - 0.5) * 12 * s} cy={Y - (4 + rnd() * 6) * s} r={0.8} fill={fleurs} />)}
    </g>
  )
}

/** touffes d'herbe sèche au pied des volumes, pour fondre le bâti dans le sol */
export function Herbes({ pts, seed = 1 }: { pts: [number, number][]; seed?: number }) {
  const rnd = alea(seed)
  return (
    <g>
      {pts.map(([x, z], i) => {
        const [X, Y] = P(x, 0, z)
        const c = rnd() > 0.5 ? '#7b8a3c' : '#9aa24e'
        return <path key={i} d={`M${f(X - 2)},${f(Y)} q0.6,-3 1,-3.6 M${f(X)},${f(Y)} q0,-3.6 0.4,-4.4 M${f(X + 2)},${f(Y)} q-0.4,-3 -1,-3.4`} stroke={c} strokeWidth={0.7} fill="none" />
      })}
    </g>
  )
}

// ─────────────────────────────── bateaux ───────────────────────────────────

/**
 * Navire vu de flanc, en écran (X, Y = flottaison au milieu). `L` longueur.
 * sorte : barque, marchand (coque ronde, voile carrée), triere (longue, rames,
 * éperon, boucliers). L'eau le frange ; son reflet se brise sous lui.
 */
export function Navire({ X, Y, L = 40, sorte = 'marchand', rot = 0, voile = '#efe3c4', bande = '#8e3b2a', flip = false }: { X: number; Y: number; L?: number; sorte?: 'barque' | 'marchand' | 'triere'; rot?: number; voile?: string; bande?: string; flip?: boolean }) {
  const h = sorte === 'barque' ? L * 0.16 : sorte === 'marchand' ? L * 0.2 : L * 0.12
  const l = L / 2
  const coque = sorte === 'triere' ? '#3e3226' : '#6f5234'
  const coqueC = sorte === 'triere' ? '#6a5a44' : '#a8845d'
  const mat = sorte === 'barque' ? 0 : sorte === 'marchand' ? L * 0.8 : L * 0.62
  const vl = sorte === 'marchand' ? L * 0.3 : L * 0.24
  return (
    <g transform={`translate(${f(X)},${f(Y)}) rotate(${rot})${flip ? ' scale(-1,1)' : ''}`}>
      {/* reflet et ombre sur l'eau */}
      <ellipse cx={3} cy={2.4} rx={l * 1.05} ry={h * 0.5} fill="#0b2c40" opacity={0.35} filter="url(#a-flou2)" />
      <path d={`M${-l * 0.7},${h * 0.5} L${l * 0.7},${h * 0.5}`} stroke="#3b2e1e" strokeWidth={h * 0.6} opacity={0.18} strokeDasharray="4 3" filter="url(#a-flou1)" />
      {sorte === 'triere' && (
        <g>
          <animateTransform attributeName="transform" type="rotate" values="-3 0 0;3 0 0;-3 0 0" dur="3.2s" repeatCount="indefinite" />
          <path d={Array.from({ length: 11 }, (_, i) => `M${f(-l * 0.7 + i * L * 0.075)},${f(-h * 0.2)} l-4,${f(h * 1.7)}`).join(' ')} stroke="#8a6941" strokeWidth={0.8} />
        </g>
      )}
      {/* coque : flanc galbé, préceinte, étrave et étambot relevés */}
      <path d={`M${-l},${-h} C${-l * 0.86},${h * 0.2} ${-l * 0.5},${h * 0.8} 0,${h * 0.8} C${l * 0.5},${h * 0.8} ${l * 0.86},${h * 0.2} ${l},${-h} Z`} fill={coque} />
      <path d={`M${-l},${-h} C${-l * 0.9},${-h * 0.4} ${-l * 0.5},${-h * 0.1} 0,${-h * 0.1} C${l * 0.5},${-h * 0.1} ${l * 0.9},${-h * 0.4} ${l},${-h} Z`} fill={coqueC} />
      <path d={`M${-l * 0.96},${-h * 0.5} C${-l * 0.5},${h * 0.1} ${l * 0.5},${h * 0.1} ${l * 0.96},${-h * 0.5}`} stroke={bande} strokeWidth={h * 0.22} fill="none" />
      <path d={`M${-l},${-h} C${-l * 0.9},${-h * 0.4} ${-l * 0.5},${-h * 0.1} 0,${-h * 0.1} C${l * 0.5},${-h * 0.1} ${l * 0.9},${-h * 0.4} ${l},${-h}`} stroke="#e2c79a" strokeWidth={0.7} fill="none" opacity={0.8} />
      <path d={`M${-l},${-h} q${-L * 0.05},${-h * 0.8} ${L * 0.03},${-h * 1.4}`} stroke={coque} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <path d={`M${l},${-h} q${L * 0.08},${-h * 0.6} ${L * 0.02},${-h * 1.8} q-1.4,-1 -2.4,0.4`} stroke={coque} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      {sorte === 'triere' && <path d={`M${-l},${h * 0.1} L${-l - L * 0.12},${h * 0.4} L${-l},${h * 0.7} Z`} fill="url(#iso-or)" />}
      {sorte !== 'barque' && (
        <g transform={`translate(${f(-l * 0.72)},${f(-h * 0.2)})`}>
          <path d="M-2.4,0 Q0,-1.8 2.4,0 Q0,1.6 -2.4,0 Z" fill="#f2ebd8" />
          <circle cx={-0.3} cy={0} r={0.8} fill="#24405b" />
        </g>
      )}
      {sorte === 'triere' && Array.from({ length: 7 }, (_, i) => {
        const bx = -l * 0.5 + i * L * 0.12
        return <g key={i}><circle cx={bx} cy={-h * 1.25} r={h * 0.5} fill={i % 2 ? '#8e3b2a' : '#a8813a'} /><path d={`M${bx - h * 0.5},${-h * 1.25} a${h * 0.5},${h * 0.5} 0 0 1 ${h * 0.5},${-h * 0.5}`} stroke="#f0cd84" strokeWidth={0.5} fill="none" /></g>
      })}
      {/* eau qui frange la flottaison */}
      <path d={`M${-l * 0.9},${h * 0.35} Q0,${h * 1.1} ${l * 0.9},${h * 0.35}`} stroke="#dcefe8" strokeWidth={0.9} fill="none" opacity={0.5}>
        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="3s" repeatCount="indefinite" />
      </path>
      {/* mât, vergue, voile gonflée, haubans */}
      {mat > 0 && (
        <g>
          <path d={`M${-l * 0.9},${-h} L0,${-mat} L${l * 0.9},${-h}`} stroke="#c9b689" strokeWidth={0.4} fill="none" opacity={0.8} />
          <rect x={-0.9} y={-mat} width={1.8} height={mat - h * 0.2} fill="#6a4e30" />
          <rect x={-0.9} y={-mat} width={0.6} height={mat - h * 0.2} fill="#a8845d" />
          <path d={`M${-vl},${-mat * 0.9} L${vl},${-mat * 0.9}`} stroke="#5f462d" strokeWidth={1.2} />
          <path d={`M${-vl},${-mat * 0.9} C${-vl * 0.4},${-mat * 0.84} ${vl * 0.5},${-mat * 0.86} ${vl},${-mat * 0.9} L${vl},${-mat * 0.34} C${vl * 0.5},${-mat * 0.4} ${-vl * 0.4},${-mat * 0.38} ${-vl},${-mat * 0.34} Z`} fill={voile}>
            <animate attributeName="d" values={`M${-vl},${-mat * 0.9} C${-vl * 0.4},${-mat * 0.84} ${vl * 0.5},${-mat * 0.86} ${vl},${-mat * 0.9} L${vl},${-mat * 0.34} C${vl * 0.5},${-mat * 0.4} ${-vl * 0.4},${-mat * 0.38} ${-vl},${-mat * 0.34} Z;M${-vl},${-mat * 0.9} C${-vl * 0.4},${-mat * 0.82} ${vl * 0.5},${-mat * 0.84} ${vl},${-mat * 0.9} L${vl},${-mat * 0.34} C${vl * 0.5},${-mat * 0.44} ${-vl * 0.4},${-mat * 0.42} ${-vl},${-mat * 0.34} Z;M${-vl},${-mat * 0.9} C${-vl * 0.4},${-mat * 0.84} ${vl * 0.5},${-mat * 0.86} ${vl},${-mat * 0.9} L${vl},${-mat * 0.34} C${vl * 0.5},${-mat * 0.4} ${-vl * 0.4},${-mat * 0.38} ${-vl},${-mat * 0.34} Z`} dur="5s" repeatCount="indefinite" />
          </path>
          <path d={`M${-vl},${-mat * 0.9} L${-vl * 0.3},${-mat * 0.87} L${-vl * 0.4},${-mat * 0.37} L${-vl},${-mat * 0.34} Z`} fill="#ffffff" opacity={0.28} />
          <path d={`M${vl * 0.4},${-mat * 0.87} L${vl},${-mat * 0.9} L${vl},${-mat * 0.34} L${vl * 0.4},${-mat * 0.4} Z`} fill={PAL.ombrePortee} opacity={0.2} />
          {sorte === 'triere' && <path d={`M${-vl},${-mat * 0.62} C${-vl * 0.4},${-mat * 0.58} ${vl * 0.5},${-mat * 0.6} ${vl},${-mat * 0.62}`} stroke="#b0412e" strokeWidth={2.2} fill="none" />}
          <path d={`M0,${-mat} l6,1.4 l-6,1.6 Z`} fill={bande}>
            <animateTransform attributeName="transform" type="rotate" values={`-6 0 ${-mat};6 0 ${-mat};-6 0 ${-mat}`} dur="3.6s" repeatCount="indefinite" />
          </path>
        </g>
      )}
      {sorte === 'barque' && <path d={`M${-l * 0.3},${-h * 0.4} L${-l * 0.9},${h * 1.4} M${l * 0.2},${-h * 0.4} L${-l * 0.1},${h * 1.5}`} stroke="#8a6941" strokeWidth={0.8} />}
    </g>
  )
}

/**
 * Nappe d'eau en plan (monde, y = 0) : turquoise du haut-fond au bleu du
 * large, reflets qui dérivent, écume le long d'une rive donnée en écran.
 */
export function Eau({ pts, rive }: { pts: V3[]; rive: string }) {
  return (
    <g>
      <defs>
        <linearGradient id="k-eau" x1="0.8" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#7ecac1" />
          <stop offset="30%" stopColor="#4f9fb2" />
          <stop offset="70%" stopColor="#2b708d" />
          <stop offset="100%" stopColor="#17415a" />
        </linearGradient>
        <clipPath id="k-clip-eau"><path d={poly(pts)} /></clipPath>
      </defs>
      <path d={poly(pts)} fill="#1b4a62" opacity={0.5} filter="url(#a-flou4)" />
      <path d={poly(pts)} fill="url(#k-eau)" />
      <g clipPath="url(#k-clip-eau)">
        <path d={rive} stroke="#9fe0d2" strokeWidth={9} fill="none" opacity={0.35} filter="url(#a-flou2)" />
        <g stroke="#d8efeb" strokeWidth={0.9} fill="none" strokeLinecap="round" opacity={0.4}>
          <animateTransform attributeName="transform" type="translate" values="0 0;5 1.6;0 0" dur="11s" repeatCount="indefinite" />
          <path d="M-120,14 q6,-2 12,0 M-96,22 q5,-1.8 10,0 M-70,18 q6,-2 12,0 M-52,28 q5,-1.8 9,0 M-30,24 q6,-2 12,0 M-110,30 q6,-2 12,0 M-6,30 q5,-1.8 10,0 M-80,34 q6,-2 12,0">
            <animate attributeName="opacity" values="1;0.35;1" dur="5s" repeatCount="indefinite" />
          </path>
        </g>
      </g>
      <path d={rive} stroke="#f4fbf5" strokeWidth={1.8} fill="none" strokeDasharray="14 7 22 10 6 5" opacity={0.7} filter="url(#a-flou1)">
        <animate attributeName="opacity" values="0.7;0.35;0.7" dur="6s" repeatCount="indefinite" />
      </path>
    </g>
  )
}

// ─────────────────────────────── portique, fontaine ────────────────────────

/**
 * Portique (stoa) : soubassement, mur du fond, colonnade en façade sud, mur
 * de tête à l'est, toit en appentis qui descend vers la place.
 */
export function Portique({
  x0, x1, z0, z1, h, n, mat = 'marbre', enfants, frise = '#2c4660',
}: { x0: number; x1: number; z0: number; z1: number; h: number; n: number; mat?: 'pierre' | 'marbre' | 'bois'; enfants?: ReactNode; frise?: string }) {
  const m = mat === 'marbre' ? MATS.marbre : mat === 'bois' ? MATS.bois : MATS.pierre
  const g = (z1 - z0) * 0.34
  let couv = ''
  for (let x = x0 + 2; x < x1 + 1; x += 4.4) couv += seg([x, h + 2.4, z0 - 1.6], [x, h + 2.4 + g, z1])
  return (
    <g>
      <OmbreSE x0={x0} x1={x1} z0={z0} z1={z1} h={h + g} />
      <Boite x0={x0 - 1} x1={x1 + 1} z0={z0 - 2} z1={z1} y0={0} y1={1.6} m={m} />
      <Boite x0={x0} x1={x1} z0={z1 - 2} z1={z1} y0={1.6} y1={h} m={MATS.stuc} sansDessus sansFlanc />
      <path d={poly([[x0, 1.6, z1 - 2], [x1, 1.6, z1 - 2], [x1, h, z1 - 2], [x0, h, z1 - 2]])} fill="#8f7550" />
      <path d={poly([[x0, h - 9, z1 - 2], [x1, h - 9, z1 - 2], [x1, h, z1 - 2], [x0, h, z1 - 2]])} fill={PAL.ombrePortee} opacity={0.4} filter="url(#a-flou1)" />
      <path d={poly([[x0, 1.62, z0], [x1, 1.62, z0], [x1, 1.62, z1 - 2], [x0, 1.62, z1 - 2]])} fill={PAL.ombrePortee} opacity={0.22} />
      {enfants}
      <Boite x0={x1 - 2.6} x1={x1} z0={z0} z1={z1} y0={1.6} y1={h} m={m} />
      {Array.from({ length: n }, (_, i) => <ColonneDorique key={i} x={x0 + 2 + (i * (x1 - 2.6 - x0 - 4)) / (n - 1)} y0={1.6} z={z0 + 0.4} h={h - 1.6} r={mat === 'bois' ? 1.4 : 1.8} mat={mat} />)}
      <Boite x0={x0 - 0.6} x1={x1 + 0.6} z0={z0 - 1} z1={z1} y0={h} y1={h + 2.4} m={m} sansDessus />
      <path d={seg([x0 - 0.6, h + 1.2, z0 - 1], [x1 + 0.6, h + 1.2, z0 - 1])} stroke={frise} strokeWidth={1.2} />
      <path d={poly([[x1 + 0.6, h + 2.4, z0 - 1], [x1 + 0.6, h + 2.4 + g, z1], [x1 + 0.6, h + 2.4, z1]])} fill={m.flanc} />
      <path d={poly([[x0 - 1.4, h + 2.4, z0 - 1.6], [x1 + 1.4, h + 2.4, z0 - 1.6], [x1 + 1.4, h + 2.4 + g, z1], [x0 - 1.4, h + 2.4 + g, z1]])} fill="url(#iso-toit-o)" />
      <path d={couv} stroke="#f2a67c" strokeWidth={1} opacity={0.5} />
      <path d={seg([x0 - 1.4, h + 2.4 + g, z1], [x1 + 1.4, h + 2.4 + g, z1])} stroke={PAL.toitArete} strokeWidth={1.2} />
      <path d={seg([x0 - 1.4, h + 2.4, z0 - 1.6], [x1 + 1.4, h + 2.4, z0 - 1.6])} stroke="#5e2e1a" strokeWidth={0.8} opacity={0.7} />
    </g>
  )
}

/** fontaine : bassin de pierre, eau qui miroite, bouche de lion d'où coule un filet */
export function Fontaine({ x, z, w = 14, d = 9, m = MATS.pierre, lion = true }: { x: number; z: number; w?: number; d?: number; m?: Mat; lion?: boolean }) {
  const [sx, sy] = P(x + w / 2, 11, z + d - 0.4)
  const [bx, by] = P(x + w / 2, 3.2, z + d / 2)
  return (
    <g>
      <OmbreSE x0={x} x1={x + w} z0={z} z1={z + d} h={8} o={0.16} />
      {lion && <Boite x0={x + w * 0.25} x1={x + w * 0.75} z0={z + d - 1.6} z1={z + d + 1} y0={0} y1={14} m={m} />}
      <Boite x0={x} x1={x + w} z0={z} z1={z + d} y0={0} y1={3.6} m={m} sansDessus />
      <path d={poly([[x, 3.6, z], [x + w, 3.6, z], [x + w, 3.6, z + d], [x, 3.6, z + d]])} fill={m.dessus} />
      <path d={poly([[x + 1.2, 3.62, z + 1.2], [x + w - 1.2, 3.62, z + 1.2], [x + w - 1.2, 3.62, z + d - 1.2], [x + 1.2, 3.62, z + d - 1.2]])} fill="#3f8ba2" />
      <path d={poly([[x + 1.2, 3.64, z + 1.2], [x + w * 0.6, 3.64, z + 1.2], [x + w * 0.3, 3.64, z + d - 1.2], [x + 1.2, 3.64, z + d - 1.2]])} fill="#8fd0d6" opacity={0.4}>
        <animate attributeName="opacity" values="0.4;0.15;0.4" dur="4s" repeatCount="indefinite" />
      </path>
      {lion && (
        <g>
          <circle cx={sx} cy={sy} r={1.6} fill="url(#iso-or)" />
          <path d={`M${f(sx)},${f(sy + 1)} Q${f(sx + 0.6)},${f((sy + by) / 2)} ${f(bx)},${f(by)}`} stroke="#bfe6ea" strokeWidth={1.1} fill="none" strokeDasharray="2 1.4">
            <animate attributeName="stroke-dashoffset" values="0;-6.8" dur="0.6s" repeatCount="indefinite" />
          </path>
          <ellipse cx={bx} cy={by} rx={2.2} ry={0.7} fill="none" stroke="#e8f6f4" strokeWidth={0.5}>
            <animate attributeName="rx" values="1;3.4" dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0" dur="1.2s" repeatCount="indefinite" />
          </ellipse>
        </g>
      )}
    </g>
  )
}

/** étal de marché : tréteaux, plateau, marchandises colorées */
export function Etal({ x, z, w = 12, sorte = 'poterie' }: { x: number; z: number; w?: number; sorte?: 'poterie' | 'fruits' | 'etoffes' | 'poisson' }) {
  const [X, Y] = P(x, 5, z + 1)
  const items = sorte === 'poterie' ? ['#a3673f', '#8c552f', '#c98f5a', '#b1764a'] : sorte === 'fruits' ? ['#d05a41', '#e8c04a', '#6f9a52', '#c94a3a'] : sorte === 'etoffes' ? ['#7c2f4e', '#2f4a63', '#c9922f', '#efe3c4'] : ['#aab3b9', '#8f9aa0', '#c3c9cc', '#aab3b9']
  return (
    <g>
      <OmbreSE x0={x} x1={x + w} z0={z} z1={z + 4} h={6} o={0.16} />
      <path d={seg([x + 1, 0, z + 0.4], [x + 1, 5, z + 0.4]) + seg([x + w - 1, 0, z + 0.4], [x + w - 1, 5, z + 0.4])} stroke="#5f462d" strokeWidth={1} />
      <Boite x0={x} x1={x + w} z0={z} z1={z + 4} y0={5} y1={6} m={MATS.bois} />
      {items.map((c, i) => {
        const ix = X + 2 + i * (w / 4.2)
        return sorte === 'poterie' ? (
          <path key={i} d={`M${f(ix - 1.4)},${f(Y - 1)} C${f(ix - 2)},${f(Y - 3)} ${f(ix - 1)},${f(Y - 4.4)} ${f(ix)},${f(Y - 4.4)} C${f(ix + 1)},${f(Y - 4.4)} ${f(ix + 2)},${f(Y - 3)} ${f(ix + 1.4)},${f(Y - 1)} Z`} fill={c} />
        ) : sorte === 'etoffes' ? (
          <path key={i} d={`M${f(ix - 1.6)},${f(Y - 1)} L${f(ix - 1.6)},${f(Y - 3.4)} L${f(ix + 1.6)},${f(Y - 3.4)} L${f(ix + 1.6)},${f(Y - 1)} Z`} fill={c} />
        ) : (
          <g key={i}>
            <circle cx={ix - 0.6} cy={Y - 2} r={1.1} fill={c} />
            <circle cx={ix + 0.8} cy={Y - 2.2} r={1} fill={c} />
            <circle cx={ix} cy={Y - 3.2} r={1} fill={c} />
          </g>
        )
      })}
    </g>
  )
}
