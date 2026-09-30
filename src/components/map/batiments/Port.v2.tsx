import { PAL, alea } from '../art'
import { Arbre, Boite, ColonneDorique, Cypres, DefsIso, Flamme, MATS, OmbreSE, P, Volute, poly, seg, type V3 } from './iso'
import { Amphores, Baie, Batisse, Bloc, Caisse, Charrette, Eau, Foyer, Herbes, Navire, Oriflamme, Sacs, Sol, T, Tonneau, Velum } from './kit'

/*
 * ═══════════════════════════ LE PORT (v2) ═══════════════════════════
 * Redessiné en volumes projetés. La mer occupe le sud-ouest ; la rive court
 * en diagonale de A (couchant) à B (levant). Chaque niveau se lit d'un coup
 * d'œil, et chacun GARDE les acquis du précédent :
 *  1. LA GRÈVE - cabane de pêcheurs en chaume, ponton sur pilotis, barque,
 *     filets à sécher, feu de poix.
 *  2. LE QUAI - un parement de pierre remplace la grève, bittes, premier
 *     entrepôt de stuc, voilier marchand à quai.
 *  3. LE PORT DE COMMERCE - jetée enrochée et tour à feu de bois, grue à
 *     contrepoids qui charge le navire, grand entrepôt à tuiles.
 *  4. LE PORT FRANC - phare de pierre au feu qui porte loin, portique à
 *     colonnes, trière à éperon, comptoirs sous vélums, Poséidon sur la jetée.
 *
 * Intégration : export Port({ n }), ancre (0,0), boîte x ∈ [-135,135],
 * y ∈ [-100,32]. Dockers d'Ouvriers.tsx en (18,7) et (40,-2) : au sec, au
 * bord du quai, face aux marchandises.
 */

const f = (n: number) => (Math.round(n * 10) / 10).toString()

// ligne de rive (monde) : de A au couchant à B au levant
const A: [number, number] = [-128, 18]
const B: [number, number] = [84, -46]
const zRive = (x: number) => A[1] + ((x - A[0]) * (B[1] - A[1])) / (B[0] - A[0])
const ROT = (Math.atan2(P(B[0], 0, B[1])[1] - P(A[0], 0, A[1])[1], P(B[0], 0, B[1])[0] - P(A[0], 0, A[1])[0]) * 180) / Math.PI

/** point sur l'eau à l'écran, à `recul` du bord (vers le large) */
function surLeau(x: number, recul: number, wl: number): [number, number] {
  return P(x, wl, zRive(x) - recul)
}

// ─────────────────────────────── la rive ───────────────────────────────────

function Mer({ wl }: { wl: number }) {
  const pts: V3[] = [[A[0], wl, A[1]], [B[0], wl, B[1]], [B[0], wl, -118], [-66, wl, -118], [-128, wl, -44]]
  const [ax, ay] = P(A[0], wl, A[1])
  const [bx, by] = P(B[0], wl, B[1])
  return <Eau pts={pts} rive={`M${f(ax)},${f(ay)} L${f(bx)},${f(by)}`} />
}

function Greve() {
  const [ax, ay] = P(A[0], 0, A[1])
  const [bx, by] = P(B[0], 0, B[1])
  return (
    <g>
      <path d={`M${f(ax)},${f(ay - 7)} L${f(bx)},${f(by - 7)}`} stroke="#d5be84" strokeWidth={10} opacity={0.6} strokeLinecap="round" filter="url(#a-flou1)" />
      <path d={`M${f(ax)},${f(ay - 1)} L${f(bx)},${f(by - 1)}`} stroke="#ad9161" strokeWidth={6} opacity={0.6} filter="url(#a-flou2)" />
      <path d={`M${f(ax + 20)},${f(ay - 4)} q5,1.4 10,0 M${f(ax + 70)},${f(ay + 2)} q6,1.6 12,0 M${f(ax + 130)},${f(ay + 8)} q5,1.4 10,0`} stroke="#8a7550" strokeWidth={1.1} fill="none" opacity={0.45} />
    </g>
  )
}

/** quai de pierre appareillée le long de la rive : parement sud, couronnement */
function Quai({ wl, x0 = A[0], x1 = B[0] }: { wl: number; x0?: number; x1?: number }) {
  const a: V3 = [x0, 0, zRive(x0)]
  const b: V3 = [x1, 0, zRive(x1)]
  const aw: V3 = [x0, wl, zRive(x0)]
  const bw: V3 = [x1, wl, zRive(x1)]
  let joints = ''
  for (let t = 0.04; t < 1; t += 0.052) {
    const x = x0 + (x1 - x0) * t
    const k = Math.round(t * 100) % 2
    joints += seg([x, wl + (k ? 0 : 2.4), zRive(x)], [x, wl + (k ? 2.4 : 4.4), zRive(x)])
  }
  return (
    <g>
      <path d={poly([a, b, bw, aw])} fill="url(#iso-pierre-s)" />
      <path d={seg([x0, wl + 2.4, zRive(x0)], [x1, wl + 2.4, zRive(x1)])} stroke={PAL.pierreJoint} strokeWidth={0.6} opacity={0.6} />
      <path d={joints} stroke={PAL.pierreJoint} strokeWidth={0.5} opacity={0.55} />
      <path d={poly([[x0, wl, zRive(x0)], [x1, wl, zRive(x1)], [x1, wl + 1.8, zRive(x1)], [x0, wl + 1.8, zRive(x0)]])} fill="#3c5844" opacity={0.55} />
      <path d={poly([[x0, -0.8, zRive(x0)], [x1, -0.8, zRive(x1)], [x1, 0, zRive(x1)], [x0, 0, zRive(x0)]])} fill="#e8e0cc" />
      <path d={seg(a, b)} stroke="#fbf6ea" strokeWidth={0.8} />
      {/* bande dallée du quai */}
      <path d={poly([a, b, [x1, 0, zRive(x1) + 10], [x0, 0, zRive(x0) + 10]])} fill="#c9bea0" opacity={0.85} />
      <path d={Array.from({ length: 16 }, (_, i) => { const x = x0 + ((x1 - x0) * (i + 0.5)) / 16; return seg([x, 0, zRive(x)], [x, 0, zRive(x) + 10]) }).join('')} stroke="#9d927a" strokeWidth={0.5} opacity={0.6} />
      <path d={seg([x0, 0, zRive(x0) + 5], [x1, 0, zRive(x1) + 5])} stroke="#9d927a" strokeWidth={0.5} opacity={0.6} />
    </g>
  )
}

function Bitte({ x }: { x: number }) {
  const [X, Y] = P(x, 0, zRive(x) + 2)
  return (
    <g transform={`translate(${f(X)},${f(Y)})`}>
      <ellipse cx={1.6} cy={0.5} rx={3} ry={1} fill={PAL.ombrePortee} opacity={0.25} />
      <path d="M-1.6,0 L-1.4,-4.6 A1.5,0.6 0 0 1 1.4,-4.6 L1.6,0 Z" fill="url(#iso-fut-bois)" />
      <ellipse cx={0} cy={-4.6} rx={1.5} ry={0.6} fill="#b89468" />
      <path d="M-1.6,-2.6 q1.6,1 3.2,0" stroke="#dccaa0" strokeWidth={0.7} fill="none" />
    </g>
  )
}

/** ponton de bois sur pilotis, qui s'avance vers le large */
function Ponton({ x, L = 46, wl = 0 }: { x: number; L?: number; wl?: number }) {
  const z0 = zRive(x) + 4
  const z1 = z0 - L
  const planches = Array.from({ length: Math.round(L / 2.2) }, (_, i) => seg([x, 1.4, z0 - i * 2.2], [x + 7, 1.4, z0 - i * 2.2])).join('')
  return (
    <g>
      <path d={poly([[x + 2, wl, z0], [x + 11, wl, z0], [x + 11, wl, z1 - 2], [x + 2, wl, z1 - 2]])} fill="#0c2e42" opacity={0.3} filter="url(#a-flou2)" />
      {Array.from({ length: 5 }, (_, i) => {
        const z = z0 - 4 - i * ((L - 6) / 4)
        return (
          <g key={i}>
            <path d={seg([x + 0.6, wl - 1, z], [x + 0.6, 1.4, z])} stroke="#4f3a24" strokeWidth={1.6} />
            <path d={seg([x + 6.4, wl - 1, z], [x + 6.4, 1.4, z])} stroke="#6a4e30" strokeWidth={1.6} />
            <path d={seg([x + 6.4, wl + 0.6, z], [x + 6.4, wl + 1.6, z])} stroke="#48684f" strokeWidth={1.8} opacity={0.7} />
          </g>
        )
      })}
      <Boite x0={x} x1={x + 7} z0={z1} z1={z0} y0={0.4} y1={1.4} m={MATS.bois} />
      <path d={planches} stroke="#6f5234" strokeWidth={0.4} opacity={0.7} />
      <path d={seg([x + 6.6, 1.4, z1], [x + 6.6, 7, z1])} stroke="#6a4e30" strokeWidth={1.8} />
      <path d={seg([x + 6.6, 5, z1], [x + 6.6, 5.8, z1])} stroke="#dccaa0" strokeWidth={2} />
    </g>
  )
}

/** jetée enrochée qui ferme le couchant de l'anse, perpendiculaire à la rive */
function Jetee({ wl, L }: { wl: number; L: number }) {
  const x0 = -76
  const x1 = -62
  const z1 = zRive(x0) + 2
  const z0 = z1 - L
  const rnd = alea(17)
  return (
    <g>
      <path d={poly([[x1, wl, z0], [x1 + 8, wl, z0 - 4], [x1 + 8, wl, z1], [x1, wl, z1]])} fill="#0c2e42" opacity={0.35} filter="url(#a-flou2)" />
      <Boite x0={x0} x1={x1} z0={z0} z1={z1} y0={wl - 1} y1={0} m={MATS.pierre} />
      <path d={poly([[x0 + 1.2, 0.02, z0 + 1.2], [x1 - 1.2, 0.02, z0 + 1.2], [x1 - 1.2, 0.02, z1], [x0 + 1.2, 0.02, z1]])} fill="#c9bea0" />
      {Array.from({ length: 9 }, (_, i) => {
        const z = z0 + 2 + i * ((L - 4) / 8)
        const [X, Y] = P(x1 + 1.6, wl + 0.4, z)
        const w = 3 + rnd() * 2
        return <path key={i} d={`M${f(X - w)},${f(Y)} L${f(X - w * 0.6)},${f(Y - 2.4 - rnd())} L${f(X + w * 0.4)},${f(Y - 2.8)} L${f(X + w)},${f(Y)} Z`} fill={i % 2 ? '#8b8169' : '#a79d85'} />
      })}
      <path d={seg([x1 + 2, wl + 0.2, z0], [x1 + 2, wl + 0.2, z1])} stroke="#eef8f2" strokeWidth={1.4} strokeDasharray="6 4 10 3" opacity={0.55}>
        <animate attributeName="opacity" values="0.55;0.25;0.55" dur="5s" repeatCount="indefinite" />
      </path>
    </g>
  )
}

// ─────────────────────────────── édifices ──────────────────────────────────

/** cabane de pêcheurs : bois et torchis, chaume, filets pendus au flanc */
function Cabane() {
  return (
    <g>
      <Batisse x0={4} x1={34} z0={14} z1={34} h={14} m={MATS.bois} toit="chaume" faite="EO" soubassement={false} enfants={
        <>
          <Baie a={13} plan={14} w={5} h={9.5} type="porte" />
          <Baie a={25} plan={14} y0={6} w={3.4} h={3.4} volets />
          <Baie face="E" a={28} plan={34} y0={5} w={3.4} h={3} />
          <path d={poly([[34.1, 3, 17], [34.1, 10, 17], [34.1, 10, 23], [34.1, 3, 23]])} fill="#c4b992" opacity={0.45} />
          <path d={[18, 19.4, 20.8, 22.2].map((z) => seg([34.15, 3, z], [34.15, 10, z])).join('') + [4.4, 6, 7.6, 9.2].map((y) => seg([34.15, y, 17], [34.15, y, 23])).join('')} stroke="#6b5f45" strokeWidth={0.35} />
        </>
      } />
    </g>
  )
}

/** entrepôt : stuc et tuiles, grandes portes, rampe de chargement */
function Entrepot({ grand }: { grand: boolean }) {
  const x0 = grand ? 12 : 16
  const x1 = grand ? 70 : 56
  const z0 = 12
  const z1 = grand ? 46 : 38
  const h = grand ? 26 : 19
  return (
    <Batisse x0={x0} x1={x1} z0={z0} z1={z1} h={h} m={grand ? MATS.pierre : MATS.stuc} faite="EO" g={grand ? 9 : 7} enfants={
      <>
        <Baie a={x0 + (x1 - x0) * 0.3} plan={z0} w={7} h={11} type={grand ? 'arche' : 'porte'} />
        <Baie a={x0 + (x1 - x0) * 0.7} plan={z0} w={7} h={11} type={grand ? 'arche' : 'porte'} />
        {grand && <Baie a={x0 + (x1 - x0) * 0.5} plan={z0} y0={13} w={4} h={3.4} />}
        <Baie face="E" a={(z0 + z1) / 2} plan={x1} y0={8} w={4} h={3.4} volets />
        {grand && <path d={seg([x0, h - 5, z0], [x1, h - 5, z0])} stroke="#9a3f2c" strokeWidth={0.9} opacity={0.7} />}
      </>
    } />
  )
}

/** portique à colonnes (stoa) : marchands à l'abri, fond sombre, tuiles */
function Stoa() {
  const x0 = -42
  const x1 = 8
  const z0 = 22
  const z1 = 38
  const h = 18
  const cols = [-39, -31, -23, -15, -7, 1, 5]
  return (
    <g>
      <OmbreSE x0={x0} x1={x1} z0={z0} z1={z1} h={h + 8} />
      <Boite x0={x0 - 1.4} x1={x1 + 1.4} z0={z0 - 2} z1={z1} y0={0} y1={1.6} m={MATS.marbre} />
      <Boite x0={x0} x1={x1} z0={z0 + 6} z1={z1} y0={1.6} y1={h} m={MATS.stuc} sansDessus />
      <path d={poly([[x0, 1.6, z0 + 6], [x1, 1.6, z0 + 6], [x1, h, z0 + 6], [x0, h, z0 + 6]])} fill="#8f7550" />
      <path d={poly([[x0, h - 7, z0 + 6], [x1, h - 7, z0 + 6], [x1, h, z0 + 6], [x0, h, z0 + 6]])} fill={PAL.ombrePortee} opacity={0.4} filter="url(#a-flou1)" />
      <Amphores x={-34} z={z0 + 4} n={4} s={0.8} seed={9} />
      <Sacs x={-12} z={z0 + 4} n={3} s={0.8} />
      {cols.slice(0, 6).map((x) => <ColonneDorique key={x} x={x} y0={1.6} z={z0} h={h - 1.6} r={1.7} mat="marbre" />)}
      <Boite x0={x0 - 0.6} x1={x1 + 0.6} z0={z0 - 1} z1={z1} y0={h} y1={h + 2.6} m={MATS.marbre} />
      <path d={seg([x0 - 0.6, h + 1.3, z0 - 1], [x1 + 0.6, h + 1.3, z0 - 1])} stroke="#2c4660" strokeWidth={1.1} />
      <path d={poly([[x1 + 0.6, h + 2.6, z0 - 1], [x1 + 0.6, h + 7, (z0 + z1) / 2], [x1 + 0.6, h + 2.6, z1]])} fill="url(#iso-marbre-s)" />
      <ToitLong x0={x0 - 2} x1={x1 + 2} z0={z0 - 2.4} z1={z1 + 1} y={h + 2.6} g={4.4} />
    </g>
  )
}

function ToitLong({ x0, x1, z0, z1, y, g }: { x0: number; x1: number; z0: number; z1: number; y: number; g: number }) {
  const zm = (z0 + z1) / 2
  let couv = ''
  for (let x = x0 + 2; x < x1; x += 4.4) couv += seg([x, y, z0], [x, y + g, zm])
  return (
    <g>
      <path d={poly([[x0, y, z0], [x1, y, z0], [x1, y + g, zm], [x0, y + g, zm]])} fill="url(#iso-toit-o)" />
      <path d={couv} stroke="#f2a67c" strokeWidth={1} opacity={0.55} />
      <path d={seg([x0, y + g, zm], [x1, y + g, zm])} stroke={PAL.toitArete} strokeWidth={1.3} />
      <path d={seg([x0, y, z0], [x1, y, z0])} stroke="#5e2e1a" strokeWidth={0.8} opacity={0.7} />
    </g>
  )
}

/** tour à feu, bois (niv. 3) ou phare de pierre (niv. 4), au musoir de la jetée */
function Phare({ pierre, zPied }: { pierre: boolean; wl: number; zPied: number }) {
  const x0 = -75
  const x1 = pierre ? -61 : -65
  const z0 = zPied
  const z1 = z0 + (x1 - x0)
  const h = pierre ? 62 : 32
  const [fx, fy] = P((x0 + x1) / 2, h + 3, (z0 + z1) / 2)
  if (!pierre) {
    return (
      <g>
        <OmbreSE x0={x0} x1={x1} z0={z0} z1={z1} h={h} />
        {[[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z], i) => <path key={i} d={seg([x, 0, z], [(x0 + x1) / 2 + (x - (x0 + x1) / 2) * 0.55, h, (z0 + z1) / 2 + (z - (z0 + z1) / 2) * 0.55])} stroke={i === 1 || i === 2 ? '#5f462d' : '#8a6941'} strokeWidth={1.6} />)}
        {[0.3, 0.62].map((t) => {
          const k = 1 - t * 0.45
          const xm = (x0 + x1) / 2
          const zm = (z0 + z1) / 2
          return <path key={t} d={seg([xm - (xm - x0) * k, h * t, zm - (zm - z0) * k], [xm + (x1 - xm) * k, h * t, zm - (zm - z0) * k]) + seg([xm + (x1 - xm) * k, h * t, zm - (zm - z0) * k], [xm + (x1 - xm) * k, h * t, zm + (z1 - zm) * k])} stroke="#6a4e30" strokeWidth={1} />
        })}
        <Boite x0={x0 + 1.6} x1={x1 - 1.6} z0={z0 + 1.6} z1={z1 - 1.6} y0={h} y1={h + 1.4} m={MATS.bois} />
        <path d={`M${f(fx - 3.4)},${f(fy + 2)} L${f(fx + 3.4)},${f(fy + 2)} L${f(fx + 2.6)},${f(fy - 1)} L${f(fx - 2.6)},${f(fy - 1)} Z`} fill="url(#iso-or)" />
        <Flamme x={fx} y={fy - 1} k={0.9} />
        <Volute x={fx + 1} y={fy - 12} h={30} />
      </g>
    )
  }
  const xm = (x0 + x1) / 2
  const zm = (z0 + z1) / 2
  const etage = (y0: number, y1: number, k0: number, k1: number, key: string) => (
    <g key={key}>
      <path d={poly([[xm + (x1 - xm) * k0, y0, zm - (zm - z0) * k0], [xm + (x1 - xm) * k0, y0, zm + (z1 - zm) * k0], [xm + (x1 - xm) * k1, y1, zm + (z1 - zm) * k1], [xm + (x1 - xm) * k1, y1, zm - (zm - z0) * k1]])} fill="url(#iso-pierre-s)" />
      <path d={poly([[xm - (xm - x0) * k0, y0, zm - (zm - z0) * k0], [xm + (x1 - xm) * k0, y0, zm - (zm - z0) * k0], [xm + (x1 - xm) * k1, y1, zm - (zm - z0) * k1], [xm - (xm - x0) * k1, y1, zm - (zm - z0) * k1]])} fill="url(#iso-pierre-f)" />
      {Array.from({ length: Math.floor((y1 - y0) / 4) }, (_, i) => {
        const y = y0 + 4 + i * 4
        const k = k0 + ((k1 - k0) * (y - y0)) / (y1 - y0)
        return <path key={i} d={seg([xm - (xm - x0) * k, y, zm - (zm - z0) * k], [xm + (x1 - xm) * k, y, zm - (zm - z0) * k]) + seg([xm + (x1 - xm) * k, y, zm - (zm - z0) * k], [xm + (x1 - xm) * k, y, zm + (z1 - zm) * k])} stroke={PAL.pierreJoint} strokeWidth={0.45} opacity={0.5} />
      })}
      <Boite x0={xm - (xm - x0) * k1 - 1} x1={xm + (x1 - xm) * k1 + 1} z0={zm - (zm - z0) * k1 - 1} z1={zm + (z1 - zm) * k1 + 1} y0={y1} y1={y1 + 1.8} m={MATS.marbre} />
    </g>
  )
  return (
    <g>
      <OmbreSE x0={x0} x1={x1} z0={z0} z1={z1} h={h * 0.8} o={0.24} />
      {etage(0, 28, 1, 0.84, 'a')}
      {etage(29.8, 48, 0.72, 0.6, 'b')}
      <Baie a={xm} plan={zm - (zm - z0) * 0.98} w={3.4} h={6} type="arche" lueur />
      <Baie a={xm} plan={zm - (zm - z0) * 0.66} y0={36} w={2.6} h={4} type="arche" />
      {/* lanterne à colonnettes, feu, faisceau qui balaie le large */}
      {[[-1, -1], [1, -1], [1, 1]].map(([sx, sz], i) => <path key={i} d={seg([xm + sx * 3.4, 49.8, zm + sz * 3.4], [xm + sx * 3.4, 58, zm + sz * 3.4])} stroke={i === 2 ? '#bdb298' : '#fbf7ec'} strokeWidth={1.3} />)}
      <Boite x0={xm - 4.6} x1={xm + 4.6} z0={zm - 4.6} z1={zm + 4.6} y0={58} y1={59.6} m={MATS.marbre} />
      <path d={`M${f(P(xm, 59.6, zm)[0] - 4)},${f(P(xm, 59.6, zm)[1])} Q${f(P(xm, 59.6, zm)[0])},${f(P(xm, 59.6, zm)[1] - 6)} ${f(P(xm, 59.6, zm)[0] + 4)},${f(P(xm, 59.6, zm)[1])} Z`} fill="url(#iso-or)" />
      {(() => {
        const [X, Y] = P(xm, 51, zm)
        return (
          <g>
            <circle cx={X} cy={Y - 2} r={20} fill="url(#iso-lueur)" opacity={0.8}>
              <animate attributeName="opacity" values="0.8;0.55;0.8" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <path d={`M${f(X)},${f(Y - 3)} L${f(X - 70)},${f(Y - 20)} L${f(X - 70)},${f(Y + 16)} Z`} fill="#fff1c2" opacity={0.2} filter="url(#a-flou2)">
              <animateTransform attributeName="transform" type="rotate" values={`-14 ${f(X)} ${f(Y - 3)};18 ${f(X)} ${f(Y - 3)};-14 ${f(X)} ${f(Y - 3)}`} dur="12s" repeatCount="indefinite" />
            </path>
            <Flamme x={X} y={Y + 1} k={1.1} />
          </g>
        )
      })()}
    </g>
  )
}

/** grue à contrepoids : chevalet, treuil, flèche en balancier, charge oscillante */
function Grue({ x, grand }: { x: number; grand: boolean }) {
  const z = zRive(x) + 4
  const [X, Y] = P(x, 0, z)
  const H = grand ? 30 : 25
  const tip = [-22, -H - 8]
  const bout = [11, -H + 5]
  const cable = grand ? 44 : 38
  return (
    <g transform={`translate(${f(X)},${f(Y)})`}>
      <ellipse cx={8} cy={1.2} rx={11} ry={2.6} fill={PAL.ombrePortee} opacity={0.22} filter="url(#a-flou2)" />
      <path d={`M-5,0 L-0.8,${-H} M5,0 L0.8,${-H} M-2,2 L0,${-H}`} stroke="#5b4229" strokeWidth={2} strokeLinecap="round" />
      <path d={`M-5,0 L-0.8,${-H}`} stroke="#b08c5d" strokeWidth={0.7} />
      <path d={`M-3.6,${-H * 0.32} L3.6,${-H * 0.32} M-2.4,${-H * 0.62} L2.4,${-H * 0.62}`} stroke="#6a4e30" strokeWidth={1.2} />
      <rect x={-3.2} y={-H * 0.22 - 1.8} width={6.4} height={3.6} rx={1.6} fill="#8a6941" />
      <rect x={-3.2} y={-H * 0.22 - 1.8} width={6.4} height={1.2} rx={0.6} fill="#c09a68" />
      <g>
        <animateTransform attributeName="transform" type="rotate" values={`-6 0 ${-H};5 0 ${-H};-6 0 ${-H}`} dur="9s" repeatCount="indefinite" />
        <line x1={bout[0]} y1={bout[1]} x2={tip[0]} y2={tip[1]} stroke="#6a4e30" strokeWidth={2.2} strokeLinecap="round" />
        <line x1={bout[0]} y1={bout[1] - 0.7} x2={tip[0]} y2={tip[1] - 0.7} stroke="#b89468" strokeWidth={0.6} />
        <circle cx={0} cy={-H} r={1.2} fill="#4a3520" />
        <path d={`M${bout[0] - 3.2},${bout[1]} L${bout[0] + 3.2},${bout[1]} L${bout[0] + 2.6},${bout[1] + 5.4} L${bout[0] - 2.6},${bout[1] + 5.4} Z`} fill="#8b7a4e" />
        <path d={`M${bout[0] - 3.2},${bout[1]} L${bout[0] - 0.8},${bout[1]} L${bout[0] - 1},${bout[1] + 5.4} L${bout[0] - 2.6},${bout[1] + 5.4} Z`} fill="#b6a06a" />
        <line x1={tip[0]} y1={tip[1]} x2={tip[0]} y2={tip[1] + cable} stroke="#c9b689" strokeWidth={0.55} />
        <g transform={`translate(${tip[0]},${tip[1] + cable})`}>
          <animateTransform attributeName="transform" type="rotate" values={`-5 0 ${-cable};5 0 ${-cable};-5 0 ${-cable}`} dur="3.4s" repeatCount="indefinite" additive="sum" />
          <path d="M0,0 L-4,3.4 M0,0 L4,3.4" stroke="#c9b689" strokeWidth={0.5} />
          <path d="M-4,3.4 L4,3.4 L4.4,9.4 L-4.4,9.4 Z" fill="#8f6f42" />
          <path d="M-4,3.4 L4,3.4 L3.8,4.6 L-3.8,4.6 Z" fill="#c09a68" />
          <path d="M-4.4,9.4 L4,3.4 M4.4,9.4 L-4,3.4" stroke="#5f462d" strokeWidth={0.5} />
        </g>
      </g>
    </g>
  )
}

/** Poséidon de bronze sur son socle, trident levé, à l'entrée de la jetée */
function Poseidon({ x, z }: { x: number; z: number }) {
  const [X, Y] = P(x + 4, 12, z + 4)
  return (
    <g>
      <OmbreSE x0={x} x1={x + 8} z0={z} z1={z + 8} h={36} o={0.16} />
      <Boite x0={x} x1={x + 8} z0={z} z1={z + 8} y0={0} y1={10} m={MATS.marbre} />
      <Boite x0={x - 0.8} x1={x + 8.8} z0={z - 0.8} z1={z + 8.8} y0={10} y1={12} m={MATS.marbre} />
      <g transform={`translate(${f(X)},${f(Y)})`}>
        <path d="M-2.6,0 L-1.8,-9 L-3,-15 L-1.6,-20 L1.8,-20 L3,-15 L2,-9 L2.8,0 L0.8,0 L0.2,-8 L-0.6,0 Z" fill="#4f6f5a" />
        <path d="M-2.6,0 L-1.8,-9 L-3,-15 L-1.6,-20 L0,-20 L-0.4,-15 L-0.6,0 Z" fill="#7ea38c" />
        <circle cx={0} cy={-22} r={2.1} fill="#4f6f5a" />
        <path d="M-2,-21 q2,3.6 4,0" fill="#3d5a48" />
        <path d="M3,-17 L6,-24" stroke="#4f6f5a" strokeWidth={1.2} strokeLinecap="round" />
        <line x1={6} y1={2} x2={6} y2={-34} stroke="#3d5a48" strokeWidth={0.9} />
        <path d="M3.6,-33 L3.6,-37 M6,-34 L6,-39 M8.4,-33 L8.4,-37 M3.6,-33 Q6,-31 8.4,-33" stroke="url(#iso-or)" strokeWidth={0.9} fill="none" />
      </g>
    </g>
  )
}

/** séchoir à poissons et filets tendus entre deux perches */
function Filets({ x, z }: { x: number; z: number }) {
  const [X, Y] = P(x, 0, z)
  let mailles = ''
  for (let i = 0; i <= 8; i++) mailles += `M${f(X - 8 + i * 2)},${f(Y - 12)} l1.2,10 `
  for (let j = 0; j <= 5; j++) mailles += `M${f(X - 8)},${f(Y - 12 + j * 2)} q8,1.6 16,0 `
  return (
    <g>
      <ellipse cx={X + 4} cy={Y + 1} rx={12} ry={2.4} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou2)" />
      <path d={`M${f(X - 9)},${f(Y)} l0,-14 M${f(X + 9)},${f(Y)} l0,-14`} stroke="#6a4e30" strokeWidth={1.4} />
      <path d={`M${f(X - 8)},${f(Y - 12)} q8,1.6 16,0 L${f(X + 8.6)},${f(Y - 2)} q-8,1.6 -16,0 Z`} fill="#c4b992" opacity={0.35} />
      <path d={mailles} stroke="#7b6f4f" strokeWidth={0.4} fill="none" />
      <path d={`M${f(X - 9.4)},${f(Y - 13)} q9,2 18.8,0`} stroke="#a08f64" strokeWidth={1.1} fill="none" />
    </g>
  )
}

// ═══════════════════════════════ COMPOSITION ═══════════════════════════════

export function Port({ n }: { n: number }) {
  const quai = n >= 2
  const wl = quai ? -5 : -0.6
  const Xq = (x: number, r: number) => surLeau(x, r, wl)
  const [n1x, n1y] = Xq(-14, 18)
  const [n2x, n2y] = Xq(40, 22)
  return (
    <g>
      <defs>
        <DefsIso />
      </defs>
      {/* terre-plein : terre battue, puis dallage qui gagne avec le port */}
      <Sol cx={30} cy={-18} rx={100} ry={30} rot={6} c1={quai ? '#b7aa84' : '#b39f70'} c2={quai ? '#c9be96' : '#c5b181'} />
      <Mer wl={wl} />
      {quai ? <Quai wl={wl} /> : <Greve />}
      {quai && [-100, -40, -8, 30, 60].map((x) => <Bitte key={x} x={x} />)}

      {/* niveau 1 : la grève des pêcheurs */}
      {n === 1 && (
        <>
          <Ponton x={-40} L={48} wl={wl} />
          <Navire X={P(-18, wl, -44)[0]} Y={P(-18, wl, -44)[1]} L={26} sorte="barque" rot={ROT} />
          <Cabane />
          <Filets x={-6} z={30} />
          <g transform={T(-96, 0, 30)}>
            <ellipse cx={4} cy={1} rx={16} ry={3} fill={PAL.ombrePortee} opacity={0.2} filter="url(#a-flou2)" />
            <path d="M-15,0 C-13.6,-3.6 -8,-6.8 1,-7 C10,-7.2 15,-4.2 16.4,0 Z" fill="#84663f" />
            <path d="M-15,0 C-13.6,-3.6 -8,-6.8 1,-7 C-4,-5.4 -8,-2.6 -9,0 Z" fill="#a88459" />
            <path d="M-14,-1.4 C-9,-5 -3,-6.4 1,-6.6 C6,-6.8 12,-4.6 15.4,-1.2" stroke="#c8a575" strokeWidth={1} fill="none" />
          </g>
          <Tonneau x={44} z={4} />
          <Amphores x={50} z={10} n={2} s={0.85} />
          <Foyer x={-14} z={10} k={0.8} />
          <Arbre x={P(-40, 0, 44)[0]} y={P(-40, 0, 44)[1]} essence="olivier" haut={40} larg={34} seed={4} />
          <Arbre x={P(70, 0, 36)[0]} y={P(70, 0, 36)[1]} essence="chene" haut={44} larg={40} seed={9} />
          <Herbes pts={[[4, 14], [34, 18], [62, 22], [-30, 28], [70, 6]]} />
        </>
      )}

      {/* niveau 2 : le quai, l'entrepôt, le marchand */}
      {n === 2 && (
        <>
          <Entrepot grand={false} />
          <Navire X={n1x} Y={n1y} L={50} sorte="marchand" rot={ROT} />
          <Navire X={n2x} Y={n2y} L={22} sorte="barque" rot={ROT} />
          <Caisse x={-4} z={-6} />
          <Caisse x={2} z={-4} c={4} />
          <Sacs x={48} z={-6} n={3} s={0.9} />
          <Amphores x={60} z={4} n={3} s={0.85} />
          <Charrette x={70} z={0} charge="amphores" flip />
          <Arbre x={P(80, 0, 40)[0]} y={P(80, 0, 40)[1]} essence="olivier" haut={32} larg={26} seed={4} />
        </>
      )}

      {/* niveau 3 : jetée, tour à feu, grue, grand entrepôt */}
      {n >= 3 && <Jetee wl={wl} L={n >= 4 ? 70 : 58} />}
      {n === 3 && (
        <>
          <Phare pierre={false} wl={wl} zPied={zRive(-76) + 2 - 58 + 1} />
          <Entrepot grand />
          <Navire X={n1x} Y={n1y} L={54} sorte="marchand" rot={ROT} voile="#e2a88e" bande="#2f4a63" />
          <Navire X={n2x + 10} Y={n2y + 6} L={22} sorte="barque" rot={ROT} />
          <Grue x={-24} grand={false} />
          <Caisse x={-2} z={-8} />
          <Caisse x={4} z={-6} c={4} />
          <Caisse x={2} z={-2} c={4} y={0} />
          <Sacs x={50} z={-8} n={4} s={0.9} />
          <Amphores x={-44} z={14} n={4} s={0.85} />
          <Tonneau x={66} z={-10} />
          <Charrette x={80} z={2} charge="grain" flip />
          <Arbre x={P(84, 0, 44)[0]} y={P(84, 0, 44)[1]} essence="olivier" haut={34} larg={28} seed={4} />
        </>
      )}

      {/* niveau 4 : le port franc */}
      {n >= 4 && (
        <>
          <Stoa />
          <Entrepot grand />
          <Phare pierre wl={wl} zPied={zRive(-76) + 2 - 70 + 1} />
          <Poseidon x={-82} z={zRive(-76) + 8} />
          <Navire X={n1x} Y={n1y} L={62} sorte="triere" rot={ROT} voile="#efe3c4" bande="#b0412e" />
          <Navire X={n2x + 16} Y={n2y + 12} L={40} sorte="marchand" rot={ROT} voile="#e2a88e" bande="#2f4a63" />
          <Grue x={-26} grand />
          <Velum x0={50} x1={70} z0={-24} z1={-14} h={12} c="#7c4f7a" />
          <Amphores x={54} z={-20} n={3} s={0.8} seed={4} />
          <Velum x0={66} x1={84} z0={-40} z1={-32} h={11} c="#2f4a63" />
          <Caisse x={-2} z={-8} />
          <Caisse x={4} z={-6} c={4} />
          <Sacs x={40} z={-10} n={3} s={0.85} />
          <Tonneau x={70} z={-2} />
          <Oriflamme x={-70} z={zRive(-70) + 6} h={30} c="#4fa3a5" c2="#7bc6c6" />
          <Oriflamme x={70} z={30} h={26} c="#7c2f4e" c2="#b45f80" d={0.6} />
          <Cypres x={P(78, 0, 46)[0]} y={P(78, 0, 46)[1]} h={40} />
          <Bloc x={-56} z={4} w={6} d={5} h={4} />
        </>
      )}
    </g>
  )
}
