import { REDOUTE_POSTES } from '../../../game/data'
import { PAL } from '../art'
import { Boite, DefsIso, Flamme, MATS, OmbreSE, P, poly, seg, type Mat } from './iso'
import { Amphores, Baie, Caisse, Oriflamme, Sol } from './kit'

/*
 * ═══════════════════════════ LA REDOUTE (v2) ═══════════════════════════
 * La plateforme à scorpions du dedans, redessinée en volumes projetés. Ses
 * postes de tir tombent exactement sur REDOUTE_POSTES (data.ts), que le
 * moteur de bataille lit : le plateau a été calé pour que chaque scorpion
 * se dresse sur son poste. Un scorpion de plus par niveau.
 *  1. LE BÂTI - caissons de rondins emplis de terre, palissade, échelle.
 *  2. LA PLATEFORME - base de moellons, tablier de bois, rampe.
 *  3. LA REDOUTE - plateforme de pierre crénelée, escalier, râteliers de
 *     traits.
 *  4. LE BASTION - parement de pierre de taille, merlons, ferrures de bronze,
 *     braseros de veille, étendards.
 */

const f = (n: number) => (Math.round(n * 10) / 10).toString()

const X0 = -40
const X1 = 56
const Z0 = 0
const Z1 = 34
const H = 34

/** scorpion : affût, bras de l'arc, trait engagé ; bronze aux niveaux hauts */
function Scorpion({ X, Y, bronze, i }: { X: number; Y: number; bronze: boolean; i: number }) {
  const fer = bronze ? 'url(#iso-or)' : '#7a7f86'
  return (
    <g transform={`translate(${f(X)},${f(Y)})`}>
      <ellipse cx={2} cy={0.6} rx={6} ry={1.6} fill={PAL.ombrePortee} opacity={0.25} />
      <path d="M-3,0 L0,-6 L3,0 M0,-6 L0,1" stroke="#5f462d" strokeWidth={1.1} />
      <g>
        <animateTransform attributeName="transform" type="rotate" values={`-8 0 -7;6 0 -7;-8 0 -7`} dur={`${7 + i}s`} repeatCount="indefinite" />
        <path d="M-9,-8.4 L6,-6" stroke="#6a4e30" strokeWidth={1.8} strokeLinecap="round" />
        <path d="M-9,-8.9 L6,-6.5" stroke="#b89468" strokeWidth={0.5} />
        <path d="M-5,-8 C-6,-12 -4,-15 -1,-15.6 M-5,-8 C-6,-4 -4,-1.2 -1,-0.8" stroke="#8a6941" strokeWidth={1.2} fill="none" />
        <path d="M-1,-15.6 L3,-7 L-1,-0.8" stroke="#dccaa0" strokeWidth={0.4} fill="none" />
        <rect x={-6.2} y={-9.6} width={2.4} height={3.2} fill={fer} />
        <path d="M-9,-8.4 L-12.4,-8.9" stroke="#6a4e30" strokeWidth={0.6} />
        <path d="M-12.4,-8.9 L-14,-8.6 L-12.4,-8.2 Z" fill={fer} />
      </g>
    </g>
  )
}

/** caisson de rondins vu en bout, rempli de terre (niveau 1) */
function Caissons() {
  const rondins = []
  for (let y = 0; y < H; y += 3.4) {
    rondins.push(<path key={`f${y}`} d={poly([[X0, y, Z0], [X1, y, Z0], [X1, y + 3.4, Z0], [X0, y + 3.4, Z0]])} fill={Math.round(y / 3.4) % 2 ? '#7c5a30' : '#6a4b2a'} />)
    rondins.push(<path key={`l${y}`} d={seg([X0, y + 3.2, Z0], [X1, y + 3.2, Z0])} stroke="#a98050" strokeWidth={0.6} />)
    rondins.push(<path key={`e${y}`} d={poly([[X1, y, Z0], [X1, y, Z1], [X1, y + 3.4, Z1], [X1, y + 3.4, Z0]])} fill={Math.round(y / 3.4) % 2 ? '#5f462d' : '#4f3a24'} />)
  }
  const bouts = []
  for (let y = 1.7; y < H; y += 6.8) for (let z = 3; z < Z1; z += 7) {
    const [X, Y] = P(X1, y, z)
    bouts.push(<ellipse key={`${y}-${z}`} cx={X} cy={Y} rx={1.5} ry={1.7} fill="#cba66b" />)
  }
  return <g>{rondins}{bouts}</g>
}

/** parement de pierre selon le niveau, joints d'assises */
function Parement({ m, pas = 5 }: { m: Mat; pas?: number }) {
  let j = ''
  for (let y = pas; y < H; y += pas) j += seg([X0, y, Z0], [X1, y, Z0]) + seg([X1, y, Z0], [X1, y, Z1])
  let v = ''
  let k = 0
  for (let y = 0; y < H; y += pas, k++) for (let x = X0 + (k % 2 ? 4 : 8); x < X1; x += 9) v += seg([x, y, Z0], [x, Math.min(H, y + pas), Z0])
  return (
    <g>
      <Boite x0={X0} x1={X1} z0={Z0} z1={Z1} y0={0} y1={H} m={m} sansDessus />
      <path d={j} stroke={m.joint} strokeWidth={0.5} opacity={0.6} />
      <path d={v} stroke={m.joint} strokeWidth={0.45} opacity={0.45} />
      {/* talus au pied : la base s'évase et s'assombrit */}
      <path d={poly([[X0 - 2, 0, Z0 - 3], [X1 + 2, 0, Z0 - 3], [X1, 5, Z0], [X0, 5, Z0]])} fill={m.flanc} opacity={0.8} />
    </g>
  )
}

/** tablier supérieur : plancher ou dalles */
function Tablier({ bois }: { bois: boolean }) {
  let d = ''
  if (bois) for (let x = X0 + 3; x < X1; x += 3) d += seg([x, H, Z0], [x, H, Z1])
  else {
    for (let x = X0 + 8; x < X1; x += 8) d += seg([x, H, Z0], [x, H, Z1])
    for (let z = Z0 + 7; z < Z1; z += 7) d += seg([X0, H, z], [X1, H, z])
  }
  return (
    <g>
      <path d={poly([[X0, H, Z0], [X1, H, Z0], [X1, H, Z1], [X0, H, Z1]])} fill={bois ? '#b89468' : '#ddd4bd'} />
      <path d={d} stroke={bois ? '#7c5a30' : '#a79d85'} strokeWidth={0.5} opacity={0.7} />
      <path d={seg([X0, H, Z0], [X1, H, Z0])} stroke={bois ? '#e0c49a' : '#fbf6ea'} strokeWidth={0.9} />
    </g>
  )
}

/** garde-corps : palissade de pieux (bois) ou merlons (pierre) sur le rebord avant et est */
function Rebord({ merlons, m }: { merlons: boolean; m: Mat }) {
  if (!merlons) {
    let p = ''
    for (let x = X0 + 1; x <= X1; x += 2.6) p += seg([x, H, Z0 + 0.6], [x, H + 5, Z0 + 0.6])
    for (let z = Z0 + 2; z <= Z1; z += 2.6) p += seg([X1 - 0.6, H, z], [X1 - 0.6, H + 5, z])
    return <path d={p} stroke="#6a4e30" strokeWidth={1.3} />
  }
  const out = []
  for (let x = X0; x < X1 - 3; x += 7) out.push(<Boite key={`s${x}`} x0={x} x1={x + 3.6} z0={Z0} z1={Z0 + 2} y0={H} y1={H + 4.4} m={m} />)
  for (let z = Z0 + 2; z < Z1 - 2; z += 7) out.push(<Boite key={`e${z}`} x0={X1 - 2} x1={X1} z0={z} z1={z + 3.6} y0={H} y1={H + 4.4} m={m} />)
  return <g>{out}</g>
}

/** rampe qui monte le long du flanc est, de la cour au tablier */
function Escalier({ m }: { m: Mat }) {
  const za = Z0 - 30
  let marches = ''
  for (let t = 0.06; t < 1; t += 0.07) marches += seg([X1, H * t, za + (Z1 - za) * t], [X1 + 8, H * t, za + (Z1 - za) * t])
  return (
    <g>
      <path d={poly([[X1 + 8, 0, za], [X1 + 8, 0, Z1], [X1 + 8, H, Z1]])} fill={m.flanc} />
      <path d={poly([[X1, 0, za], [X1 + 8, 0, za], [X1 + 8, H, Z1], [X1, H, Z1]])} fill={m.dessus} />
      <path d={marches} stroke={m.joint} strokeWidth={0.6} opacity={0.7} />
      <path d={seg([X1 + 8, 0, za], [X1 + 8, H, Z1])} stroke={m.arete} strokeWidth={0.8} />
    </g>
  )
}

/** échelle de bois appuyée au bâti (niveau 1) */
function Echelle() {
  const a: [number, number, number] = [X1 + 8, 0, 14]
  const b: [number, number, number] = [X1, H + 2, 14]
  let barreaux = ''
  for (let t = 0.08; t < 1; t += 0.09) barreaux += seg([a[0] + (b[0] - a[0]) * t, (b[1] - a[1]) * t, 12.6], [a[0] + (b[0] - a[0]) * t, (b[1] - a[1]) * t, 15.4])
  return (
    <g>
      <path d={seg([a[0], 0, 12.6], [b[0], b[1], 12.6]) + seg([a[0], 0, 15.4], [b[0], b[1], 15.4])} stroke="#6a4e30" strokeWidth={1} />
      <path d={barreaux} stroke="#8a6941" strokeWidth={0.7} />
    </g>
  )
}

/** râtelier de traits de scorpion */
function Traits({ x, z }: { x: number; z: number }) {
  const [X, Y] = P(x, H, z)
  return (
    <g transform={`translate(${f(X)},${f(Y)})`}>
      <path d="M0,0 L0,-5 M9,0 L9,-5 M-0.6,-4 L9.6,-4" stroke="#5f462d" strokeWidth={0.8} />
      {[1, 2.4, 3.8, 5.2, 6.6, 8].map((dx) => <g key={dx}><path d={`M${dx},-0.4 L${dx - 1},-9`} stroke="#8a6941" strokeWidth={0.5} /><path d={`M${dx - 1},-9 l-0.5,-1.4 l1,0 Z`} fill="#8a929b" /></g>)}
    </g>
  )
}

function BraseroVeille({ x, z }: { x: number; z: number }) {
  const [X, Y] = P(x, H + 4.4, z)
  return (
    <g transform={`translate(${f(X)},${f(Y)})`}>
      <path d="M-3,0 L-1.4,-7 M3,0 L1.4,-7" stroke="#5c4018" strokeWidth={0.8} />
      <path d="M-3.6,-7 L3.6,-7 L2.8,-9.6 L-2.8,-9.6 Z" fill="url(#iso-or)" />
      <Flamme x={0} y={-9.6} k={0.55} />
    </g>
  )
}

export function Redoute({ n }: { n: number }) {
  if (n <= 0) return null
  const niv = Math.max(1, Math.min(4, n))
  const m = niv >= 4 ? MATS.pierre : niv === 3 ? MATS.pierre : MATS.moellon
  const postes = REDOUTE_POSTES.slice(0, niv)
  return (
    <g>
      <defs>
        <DefsIso />
      </defs>
      <Sol cx={8} cy={-4} rx={86} ry={24} c1="#a99f86" c2="#bdb298" />
      <OmbreSE x0={X0} x1={X1 + 8} z0={Z0} z1={Z1} h={H + 10} o={0.24} />
      {niv === 1 && <Caissons />}
      {niv === 2 && (
        <g>
          <Boite x0={X0} x1={X1} z0={Z0} z1={Z1} y0={0} y1={H * 0.55} m={MATS.moellon} sansDessus />
          <Boite x0={X0} x1={X1} z0={Z0} z1={Z1} y0={H * 0.55} y1={H} m={MATS.bois} sansDessus />
          {[X0 + 6, X0 + 30, X0 + 54, X0 + 78].map((x) => <path key={x} d={seg([x, H * 0.55, Z0 - 0.05], [x, H, Z0 - 0.05])} stroke="#4f3a24" strokeWidth={1.2} />)}
        </g>
      )}
      {niv >= 3 && <Parement m={m} pas={niv >= 4 ? 4.2 : 5.4} />}
      {niv >= 3 && <Baie a={(X0 + X1) / 2} plan={Z0} w={7} h={11} type="arche" />}
      {niv >= 4 && (
        <>
          <path d={seg([X0, H - 3, Z0], [X1, H - 3, Z0]) + seg([X1, H - 3, Z0], [X1, H - 3, Z1])} stroke="#f6f1e3" strokeWidth={1.4} />
          {[X0 + 10, X0 + 30, X1 - 30, X1 - 10].map((x) => {
            const [X, Y] = P(x, H * 0.62, Z0)
            return <g key={x}><circle cx={X} cy={Y} r={3} fill="url(#iso-or)" /><circle cx={X - 0.8} cy={Y - 0.8} r={0.9} fill="#fff3cf" /></g>
          })}
          <path d={poly([[(X0 + X1) / 2 - 3.2, 0, Z0 - 0.1], [(X0 + X1) / 2 + 3.2, 0, Z0 - 0.1], [(X0 + X1) / 2 + 3.2, 7.4, Z0 - 0.1], [(X0 + X1) / 2 - 3.2, 7.4, Z0 - 0.1]])} fill="#8a5a20" />
        </>
      )}
      {niv <= 1 ? <Echelle /> : <Escalier m={niv === 2 ? MATS.moellon : m} />}
      <Tablier bois={niv <= 2} />
      <Rebord merlons={niv >= 3} m={m} />
      {niv >= 4 && [[X0 - 12, Z1 - 12], [X0 - 12, Z0 - 4]].map(([x, z], i) => (
        <g key={`t${i}`}>
          <Boite x0={x} x1={x + 12} z0={z} z1={z + 12} y0={0} y1={H + 8} m={m} />
          {[0, 1].map((k) => <Boite key={k} x0={x + k * 7} x1={x + k * 7 + 4} z0={z} z1={z + 2} y0={H + 8} y1={H + 12} m={m} />)}
          <Boite x0={x + 10} x1={x + 12} z0={z + 5} z1={z + 9} y0={H + 8} y1={H + 12} m={m} />
          <Baie a={x + 6} plan={z} y0={H - 6} w={2.2} h={4} type="arche" />
        </g>
      ))}
      {niv >= 3 && <Traits x={-30} z={26} />}
      {niv >= 3 && <Caisse x={30} z={26} y={H} />}
      {postes.map((p, i) => <Scorpion key={i} X={p.dx} Y={p.dy} bronze={niv >= 4} i={i} />)}
      {niv >= 4 && (
        <>
          <BraseroVeille x={X0 + 2} z={Z0 + 1} />
          <BraseroVeille x={X1 - 1} z={Z0 + 1} />
          <Oriflamme x={X0 + 1} z={Z1 - 2} y={H} h={24} c="#7c2f4e" c2="#b45f80" />
          <Oriflamme x={X1 - 1} z={Z1 - 2} y={H} h={24} c="#c9922f" c2="#f0cd84" d={0.6} />
        </>
      )}
      <Amphores x={X1 + 12} z={-8} n={niv >= 3 ? 3 : 2} s={0.8} />
    </g>
  )
}
