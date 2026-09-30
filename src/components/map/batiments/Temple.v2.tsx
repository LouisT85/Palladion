import { PAL, alea } from '../art'
import { Arbre, Aire, AOPied, Boite, ColonneDorique, Cypres, DefsIso, Flamme, MATS, OmbreSE, P, ToitDeuxPans, Volute, poly, seg, type Mat } from './iso'

/*
 * ═══════════════════════════ LE TEMPLE (v2) ═══════════════════════════
 * Redessiné en vrais volumes projetés (voir iso.tsx) : on voit la façade, le
 * flanc est qui file, les deux pans du toit et le dallage en plan. Chaque
 * niveau change d'échelle ET de matière, et se reconnaît d'un coup d'œil :
 *  1. LE BOIS SACRÉ - le chêne du dieu, ses bandelettes, l'autel de pierres
 *     entassées, le xoanon de bois sous son auvent de chaume.
 *  2. LE NAISKOS - une chapelle de stuc à deux colonnes entre antes, toit de
 *     tuiles, fronton peint, autel et olivier.
 *  3. LE TEMPLE DE PIERRE - hexastyle dorique en calcaire, frise de triglyphes
 *     peinte, fronton bleu d'Égée, parvis dallé, cyprès, grand autel.
 *  4. LE GRAND TEMPLE DE MARBRE ET D'OR - octastyle de marbre, boucliers
 *     dorés à l'architrave, fronton sculpté, acrotères d'or, statue de culte
 *     qui luit au fond de la cella, statues de bronze, braseros.
 *
 * Intégration inchangée : export Temple({ n }), ancre (0,0) au pied de la
 * façade, boîte x ∈ [-135,135], y ∈ [-100,32]. Les prêtres d'Ouvriers.tsx
 * officient en (0,15) et (-20,10) : ces deux points restent sur le parvis
 * dégagé, devant les degrés, à tous les niveaux.
 */

const f = (n: number) => (Math.round(n * 10) / 10).toString()

// ─────────────────────────── mobilier sacré ───────────────────────────────

/** autel : socle, corniche, table tachée de cendre, feu et fumée */
function Autel({ x, z, w = 14, d = 8, h = 7, m = MATS.pierre, feu = true, k = 1 }: { x: number; z: number; w?: number; d?: number; h?: number; m?: Mat; feu?: boolean; k?: number }) {
  const [cx, cy] = P(x + w / 2, h + 1.2, z + d / 2)
  return (
    <g>
      <OmbreSE x0={x} x1={x + w} z0={z} z1={z + d} h={h + 6} o={0.18} />
      <Boite x0={x} x1={x + w} z0={z} z1={z + d} y0={0} y1={h} m={m} />
      <Boite x0={x - 1} x1={x + w + 1} z0={z - 1} z1={z + d + 1} y0={h} y1={h + 1.4} m={m} />
      <path d={poly([[x + 1.5, h + 1.45, z + 1], [x + w - 1.5, h + 1.45, z + 1], [x + w - 1.5, h + 1.45, z + d - 1], [x + 1.5, h + 1.45, z + d - 1]])} fill="#5a4a3a" opacity={0.55} />
      <path d={seg([x + 2, h * 0.55, z], [x + w - 2, h * 0.55, z])} stroke="#9a3f2c" strokeWidth={0.9} opacity={0.6} />
      {feu && <Flamme x={cx} y={cy} k={k} />}
      {feu && <Volute x={cx + 1} y={cy - 10 * k} h={36} />}
    </g>
  )
}

/** trépied votif de bronze : trois pieds grêles, vasque, anses annulaires */
function Trepied({ X, Y, s = 1, or = false }: { X: number; Y: number; s?: number; or?: boolean }) {
  const b = or ? 'url(#iso-or)' : '#a8702a'
  return (
    <g transform={`translate(${f(X)},${f(Y)}) scale(${s})`}>
      <ellipse cx={3} cy={0.8} rx={6} ry={1.6} fill={PAL.ombrePortee} opacity={0.2} filter="url(#a-flou1)" />
      <path d="M-4,0 L-2,-11 M4,0 L2,-11 M0.4,1 L0,-11" stroke={or ? '#b38a3a' : '#7a4f18'} strokeWidth={1} />
      <path d="M-4,0 L-2,-11" stroke="#f0cd84" strokeWidth={0.35} />
      <path d="M-5.6,-11 Q-5.6,-16.4 0,-16.4 Q5.6,-16.4 5.6,-11 Z" fill={b} />
      <path d="M-5.6,-11 Q-5.6,-16.4 0,-16.4 Q-3,-15 -3,-11 Z" fill="#fbe7a6" opacity={0.7} />
      <ellipse cx={0} cy={-16.4} rx={5.6} ry={1.3} fill="#5a3a10" />
      <path d="M-4.4,-17 a2.1,2.1 0 1 1 2.6,-1.8 M4.4,-17 a2.1,2.1 0 1 0 -2.6,-1.8" stroke={or ? '#d9b25a' : '#b98034'} strokeWidth={0.9} fill="none" />
    </g>
  )
}

/** stèle votive à sommet cintré, inscription suggérée */
function Stele({ X, Y, h = 13, s = 1 }: { X: number; Y: number; h?: number; s?: number }) {
  return (
    <g transform={`translate(${f(X)},${f(Y)}) scale(${s})`}>
      <ellipse cx={3} cy={0.6} rx={5} ry={1.3} fill={PAL.ombrePortee} opacity={0.2} />
      <path d={`M-3.4,0 L-3.4,${-h + 3} Q-3.4,${-h} 0,${-h} Q3.4,${-h} 3.4,${-h + 3} L3.4,0 Z`} fill="url(#iso-pierre-f)" />
      <path d={`M3.4,0 L3.4,${-h + 3} L4.8,${-h + 2.2} L4.8,-0.8 Z`} fill="url(#iso-pierre-s)" />
      <path d={`M-3.4,${-h + 3} Q-3.4,${-h} 0,${-h}`} stroke="#f6f1e3" strokeWidth={0.7} fill="none" />
      <path d={`M-2,${-h + 5} h4 M-2,${-h + 6.8} h3.4 M-2,${-h + 8.6} h4 M-2,${-h + 10.4} h2.6`} stroke={PAL.pierreJoint} strokeWidth={0.5} opacity={0.7} />
    </g>
  )
}

/** brasero de bronze sur haut trépied, feu vif */
function Brasero({ X, Y, s = 1 }: { X: number; Y: number; s?: number }) {
  return (
    <g transform={`translate(${f(X)},${f(Y)}) scale(${s})`}>
      <ellipse cx={4} cy={0.8} rx={6} ry={1.6} fill={PAL.ombrePortee} opacity={0.2} filter="url(#a-flou1)" />
      <path d="M-3.2,0 L-1.2,-13 M3.2,0 L1.2,-13 M0.3,0.8 L0,-13" stroke="#5c4018" strokeWidth={0.9} />
      <path d="M-4.6,-13 L4.6,-13 L3.4,-16.4 L-3.4,-16.4 Z" fill="url(#iso-or)" />
      <ellipse cx={0} cy={-16.4} rx={3.4} ry={0.9} fill="#f7e3a8" />
      <Flamme x={0} y={-16.4} k={0.62} />
    </g>
  )
}

/** statue de bronze sur piédestal : l'hoplite à la lance, patine verte aux creux */
function Statue({ x, z, flip = false, marbre = true }: { x: number; z: number; flip?: boolean; marbre?: boolean }) {
  const m = marbre ? MATS.marbre : MATS.pierre
  const [X, Y] = P(x + 4, 11, z + 4)
  return (
    <g>
      <OmbreSE x0={x} x1={x + 8} z0={z} z1={z + 8} h={30} o={0.16} />
      <Boite x0={x} x1={x + 8} z0={z} z1={z + 8} y0={0} y1={9} m={m} />
      <Boite x0={x - 0.8} x1={x + 8.8} z0={z - 0.8} z1={z + 8.8} y0={9} y1={11} m={m} />
      <g transform={`translate(${f(X)},${f(Y)})${flip ? ' scale(-1,1)' : ''}`}>
        <path d="M-2.4,0 L-1.6,-9 L-2.6,-15 L-1.4,-19.4 L1.6,-19.4 L2.8,-15 L1.8,-9 L2.6,0 L0.8,0 L0.2,-8 L-0.6,0 Z" fill="#6e5424" />
        <path d="M-2.4,0 L-1.6,-9 L-2.6,-15 L-1.4,-19.4 L0,-19.4 L-0.4,-15 L-0.6,0 Z" fill="#b98e3e" />
        <circle cx={0} cy={-21.4} r={2} fill="#8a6a2c" />
        <path d="M-1.4,-21.8 a2,2 0 0 1 2.4,-1.4" stroke="#e0bc66" strokeWidth={0.7} fill="none" />
        <path d="M-2.2,-22.6 Q0,-26.4 2.4,-22.4" fill="#4f6f5a" />
        <line x1={3.4} y1={1} x2={4.6} y2={-28} stroke="#5c4018" strokeWidth={0.8} />
        <path d="M4.6,-28 L3.9,-31 L5.5,-31 Z" fill="#e0bc66" />
        <ellipse cx={-3.2} cy={-13} rx={2.8} ry={3.4} fill="#8a6a2c" />
        <path d="M-6,-13 a2.8,3.4 0 0 1 2.8,-3.4" stroke="#e0bc66" strokeWidth={0.7} fill="none" />
        <path d="M-0.2,-6 L1.4,-2 M-1.4,-15.6 L0.4,-12.6" stroke="#4f6f5a" strokeWidth={0.6} opacity={0.6} />
      </g>
    </g>
  )
}

/** bandelette votive nouée à une branche, qui se balance */
function Bandelette({ X, Y, c = '#b0412e', l = 9, d = 0 }: { X: number; Y: number; c?: string; l?: number; d?: number }) {
  return (
    <g>
      <animateTransform attributeName="transform" type="rotate" values={`-7 ${X} ${Y};7 ${X} ${Y};-7 ${X} ${Y}`} dur={`${2.8 + d}s`} begin={`${-d}s`} repeatCount="indefinite" />
      <path d={`M${X - 0.6},${Y} q-1,${l * 0.5} 0.2,${l} l1.2,0 q-0.6,${-l * 0.5} 0.4,${-l} Z`} fill={c} />
      <path d={`M${X - 0.6},${Y} q-1,${l * 0.5} 0.2,${l}`} stroke="#fff3e0" strokeWidth={0.35} fill="none" opacity={0.5} />
    </g>
  )
}

/** pierre levée de bornage, trois faces */
function Borne({ X, Y, s = 1, seed = 1 }: { X: number; Y: number; s?: number; seed?: number }) {
  const r = alea(seed)
  const h = 4 + r() * 3
  return (
    <g transform={`translate(${f(X)},${f(Y)}) scale(${s})`}>
      <ellipse cx={2} cy={0.5} rx={4} ry={1.1} fill={PAL.ombrePortee} opacity={0.2} />
      <path d={`M-2.4,0 L-1.8,${-h} L1.4,${-h - 0.6} L2.2,0 Z`} fill="#b3a88d" />
      <path d={`M-2.4,0 L-1.8,${-h} L-0.4,${-h - 0.3} L-0.8,0 Z`} fill="#d6ccb3" />
      <path d={`M2.2,0 L1.4,${-h - 0.6} L3.2,${-h} L3.6,-0.6 Z`} fill="#877c63" />
    </g>
  )
}

// ═══════════════════════════ 1 · LE BOIS SACRÉ ═════════════════════════════

function BoisSacre() {
  const bornes: [number, number][] = []
  for (let i = 0; i < 13; i++) {
    const a = Math.PI * 0.95 + (i / 12) * Math.PI * 1.1
    bornes.push([Math.cos(a) * 64 + 4, Math.sin(a) * 20 - 6])
  }
  return (
    <g>
      {/* aire sacrée : terre battue en deux tons, usée au centre */}
      <ellipse cx={4} cy={-4} rx={74} ry={24} fill="#b39f70" opacity={0.55} />
      <ellipse cx={0} cy={-2} rx={52} ry={16} fill="#c8b485" opacity={0.6} />
      <ellipse cx={10} cy={2} rx={24} ry={7} fill="#d6c496" opacity={0.55} />
      {/* bornes de l'enclos, derrière */}
      {bornes.filter(([, y]) => y < -6).map(([x, y], i) => <Borne key={`b${i}`} X={x} Y={y} s={0.9} seed={i + 3} />)}
      {/* olivier au couchant */}
      <Arbre x={-54} y={-6} essence="olivier" haut={40} larg={34} seed={7} />
      {/* le chêne du dieu : le grand arbre qui fait le sanctuaire */}
      <Arbre
        x={10}
        y={-12}
        essence="chene"
        haut={70}
        larg={84}
        seed={3}
        enfants={
          <g>
            <Bandelette X={-18} Y={-44} c="#b0412e" />
            <Bandelette X={-8} Y={-40} c="#efe3c4" l={11} d={0.7} />
            <Bandelette X={14} Y={-46} c="#b0412e" l={8} d={1.3} />
            <Bandelette X={22} Y={-40} c="#e8c04a" l={10} d={0.4} />
            {/* pinakes : tablettes votives pendues à la branche basse */}
            <g transform="translate(-12,-34)">
              <line x1={0} y1={0} x2={0} y2={3} stroke="#6a4e30" strokeWidth={0.4} />
              <rect x={-2.2} y={3} width={4.4} height={3.4} fill="#c98f5a" />
              <rect x={-2.2} y={3} width={1.4} height={3.4} fill="#e2b27e" />
            </g>
            <g transform="translate(6,-36)">
              <line x1={0} y1={0} x2={0} y2={2.4} stroke="#6a4e30" strokeWidth={0.4} />
              <rect x={-2} y={2.4} width={4} height={3.2} fill="#b87a4a" />
            </g>
          </g>
        }
      />
      {/* xoanon : l'idole de bois sous son auvent de chaume */}
      <g>
        <OmbreSE x0={-40} x1={-22} z0={-10} z1={2} h={20} o={0.16} />
        {([[-40, -10], [-40, 1], [-23.6, -10], [-23.6, 1]] as const).map(([x, z], i) => (
          <Boite key={i} x0={x} x1={x + 1.6} z0={z} z1={z + 1.6} y0={0} y1={16} m={MATS.bois} sansDessus />
        ))}
        {(() => {
          const [X, Y] = P(-31.2, 0, -4.4)
          return (
            <g transform={`translate(${f(X)},${f(Y)})`}>
              <ellipse cx={1.6} cy={0.6} rx={4} ry={1} fill={PAL.ombrePortee} opacity={0.25} />
              <path d="M-2.6,0 L-2.2,-11 Q-2.4,-14.6 0,-14.8 Q2.4,-14.6 2.2,-11 L2.6,0 Z" fill="#8a6535" />
              <path d="M-2.6,0 L-2.2,-11 Q-2.4,-14.6 0,-14.8 L-0.6,-11 L-0.8,0 Z" fill="#b58f60" />
              <path d="M-2.4,-9 h4.8 M-2.5,-5 h5" stroke="#b0412e" strokeWidth={1} />
              <circle cx={-0.8} cy={-12.4} r={0.35} fill="#2a1d10" /><circle cx={0.8} cy={-12.4} r={0.35} fill="#2a1d10" />
              <path d="M-3.4,-15 Q0,-17 3.4,-15" stroke="#e8c04a" strokeWidth={0.8} fill="none" />
            </g>
          )
        })()}
        <ToitDeuxPans xa={-42} xb={-20} z0={-11.4} z1={4} yEgout={16} yFaite={22} chaume pasTuile={4} />
        <path d={poly([[-42, 16, -11.4], [-31, 22, -11.4], [-20, 16, -11.4]])} fill="#8a6d38" />
        <path d={seg([-42, 16, -11.4], [-31, 22, -11.4])} stroke="#f0dca4" strokeWidth={1} />
      </g>
      {/* autel de pierres sèches entassées, feu du sacrifice */}
      <Autel x={14} z={-18} w={19} d={11} h={7} m={MATS.moellon} k={1.2} />
      <path d={`M${f(P(17, 6.6, -16)[0])},${f(P(17, 6.6, -16)[1])} q2,-1.4 4,0 q2,-1.4 4,0 q2,-1.4 4,0`} stroke="#6f9a52" strokeWidth={1.2} fill="none" />
      {/* offrandes au pied de l'autel */}
      {(() => {
        const [X, Y] = P(36, 0, -18)
        return (
          <g transform={`translate(${f(X)},${f(Y)})`}>
            <ellipse cx={2} cy={0.6} rx={6} ry={1.4} fill={PAL.ombrePortee} opacity={0.2} />
            <path d="M-2.4,0 C-3.6,-3 -2.8,-6.4 -1.4,-7.2 L-1.8,-8.6 L1.8,-8.6 L1.4,-7.2 C2.8,-6.4 3.6,-3 2.4,0 Z" fill="#a3673f" />
            <path d="M-2.4,0 C-3.6,-3 -2.8,-6.4 -1.4,-7.2 L-0.6,-7.2 C-1.8,-5.6 -2,-2.6 -1.2,0 Z" fill="#d5a573" opacity={0.7} />
            <ellipse cx={5.6} cy={-1} rx={2.6} ry={1.4} fill="#8c552f" />
            <ellipse cx={5.4} cy={-1.4} rx={1.8} ry={0.7} fill="#c9a441" />
          </g>
        )
      })()}
      {/* bornes de l'enclos, devant */}
      {bornes.filter(([, y]) => y >= -6).map(([x, y], i) => <Borne key={`f${i}`} X={x} Y={y} s={0.9} seed={i + 21} />)}
    </g>
  )
}

// ═══════════════════════════ 2 · LE NAISKOS ════════════════════════════════

function Naiskos() {
  const pierre = MATS.pierre
  const yS = 4.8
  const yA = 24
  const yE = 28.5
  const yR = 36.5
  return (
    <g>
      {/* aire du sanctuaire, puis un parvis de dalles devant la chapelle */}
      <ellipse cx={8} cy={-8} rx={92} ry={28} fill="#b39f70" opacity={0.55} />
      <ellipse cx={4} cy={-4} rx={62} ry={18} fill="#c8b485" opacity={0.55} />
      {/* le chêne du bois sacré reste : la chapelle s'est bâtie à son ombre */}
      <Arbre x={-44} y={-26} essence="chene" haut={62} larg={70} seed={3} enfants={<><Bandelette X={-14} Y={-38} /><Bandelette X={12} Y={-40} c="#efe3c4" d={0.8} /></>} />
      <Aire x0={-40} x1={40} z0={-28} z1={0} fill="#cfc2a0" dalles={{ dx: 10, dz: 7 }} />
      <g transform="scale(1.28)">
      {/* péribole : muret de moellons qui ferme le couchant */}
      <Boite x0={-44} x1={-41} z0={-18} z1={44} y0={0} y1={4.4} m={MATS.moellon} />
      <OmbreSE x0={-26} x1={26} z0={-3} z1={40} h={42} />
      {/* crépis de deux degrés */}
      <Boite x0={-28} x1={28} z0={-5} z1={41} y0={0} y1={2.4} m={pierre} />
      <Boite x0={-25.4} x1={25.4} z0={-2.4} z1={38.4} y0={2.4} y1={yS} m={pierre} />
      <AOPied x0={-28} x1={28} z={-5} />
      {/* cella de stuc, pronaos dans la pénombre, porte qui luit */}
      <Boite x0={-20} x1={20} z0={9} z1={35} y0={yS} y1={yA} m={MATS.stuc} sansDessus />
      <path d={poly([[-16, yS, 9], [16, yS, 9], [16, yA, 9], [-16, yA, 9]])} fill="#8f7550" />
      <path d={poly([[-16, yA - 7, 9], [16, yA - 7, 9], [16, yA, 9], [-16, yA, 9]])} fill={PAL.ombrePortee} opacity={0.35} filter="url(#a-flou1)" />
      <path d={poly([[-5, yS, 9], [5, yS, 9], [5, yS + 13, 9], [-5, yS + 13, 9]])} fill="#2a1d10" />
      <ellipse cx={P(0, yS + 6, 9)[0]} cy={P(0, yS + 6, 9)[1]} rx={4} ry={6} fill="url(#iso-lueur)">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="4s" repeatCount="indefinite" />
      </ellipse>
      {/* antes : têtes de mur de pierre qui encadrent le porche */}
      <Boite x0={-20} x1={-16} z0={1} z1={9} y0={yS} y1={yA} m={pierre} />
      <Boite x0={16} x1={20} z0={1} z1={9} y0={yS} y1={yA} m={pierre} />
      <ColonneDorique x={-7} y0={yS} z={3} h={yA - yS} r={2.3} mat="pierre" />
      <ColonneDorique x={7} y0={yS} z={3} h={yA - yS} r={2.3} mat="pierre" />
      {/* entablement : architrave, bandeau peint rouge et bleu */}
      <Boite x0={-21.5} x1={21.5} z0={0} z1={36} y0={yA} y1={yE} m={pierre} />
      <path d={seg([-21.5, yA + 2.8, 0], [21.5, yA + 2.8, 0]) + seg([21.5, yA + 2.8, 0], [21.5, yA + 2.8, 36])} stroke="#9a3f2c" strokeWidth={1.2} />
      <path d={[-18, -9, 0, 9, 18].map((x) => seg([x, yA + 1.6, 0], [x, yA + 4, 0])).join('')} stroke="#2f4a63" strokeWidth={2.2} />
      <ToitDeuxPans xa={-23.4} xb={23.4} z0={-1.2} z1={37.2} yEgout={yE} yFaite={yR} antefixes pasTuile={4.6} />
      {/* fronton : tympan rouge, disque d'or apotropaïque */}
      <path d={poly([[-22.4, yE, -1.2], [0, yR - 0.4, -1.2], [22.4, yE, -1.2]])} fill="url(#iso-pierre-f)" />
      <path d={poly([[-18.4, yE + 0.9, -1.2], [0, yR - 2.4, -1.2], [18.4, yE + 0.9, -1.2]])} fill="#8e3b2a" />
      <circle cx={P(0, yE + 3, -1.2)[0]} cy={P(0, yE + 3, -1.2)[1]} r={1.9} fill="url(#iso-or)" />
      <path d={seg([-22.8, yE, -1.2], [0, yR, -1.2]) + seg([0, yR, -1.2], [22.8, yE, -1.2])} stroke="#f6f1e3" strokeWidth={1.3} />
      <path d={`M${f(P(0, yR, -1.2)[0] - 1.8)},${f(P(0, yR, -1.2)[1])} q1.8,-4.4 3.6,0 Z`} fill="url(#iso-or)" />
      </g>
      {/* devant : autel, trépied, stèles - les prêtres ont leur place au centre */}
      <Autel x={26} z={-24} w={15} d={9} h={6.8} m={pierre} k={1.05} />
      <Trepied X={P(-36, 0, -16)[0]} Y={P(-36, 0, -16)[1]} />
      <Stele X={P(56, 0, 0)[0]} Y={P(56, 0, 0)[1]} />
      <Stele X={P(64, 0, 8)[0]} Y={P(64, 0, 8)[1]} h={10} s={0.9} />
      <Arbre x={92} y={4} essence="laurier" haut={30} larg={24} seed={12} />
      <Arbre x={-78} y={10} essence="laurier" haut={18} larg={20} seed={15} />
    </g>
  )
}

// ═════════════════════ 3 et 4 · LE TEMPLE PÉRIPTÈRE ════════════════════════

interface Plan {
  w: number
  d: number
  nF: number
  nS: number
  hCol: number
  r: number
  marbre: boolean
}

function TemplePeriptere({ w, d, nF, nS, hCol, r, marbre }: Plan) {
  const m = marbre ? MATS.marbre : MATS.pierre
  const sh = 2.6
  const so = 3
  const yS = sh * 3
  const yA = yS + hCol
  const yF = yA + 4.4
  const yC = yF + 4.6
  const yE = yC + 2.2
  const yR = yE + w * 0.09
  const hw = w / 2
  const marge = r + 2.6
  const colsF = Array.from({ length: nF }, (_, i) => -hw + marge + (i * (w - 2 * marge)) / (nF - 1))
  const colsS = Array.from({ length: nS }, (_, j) => marge + (j * (d - 2 * marge)) / (nS - 1))
  const cx0 = -hw + marge + 9
  const cx1 = hw - marge - 9
  const cz0 = marge + 9
  const cz1 = d - marge - 4
  const zf = -1.4
  const tri = marbre ? '#2c4660' : '#34536d'
  const tympan = marbre ? '#35536b' : '#3f6079'

  // triglyphes : au droit des colonnes et à mi-entrecolonnement
  const tF: number[] = []
  colsF.forEach((x, i) => { tF.push(x); if (i < colsF.length - 1) tF.push((x + colsF[i + 1]) / 2) })
  const tS: number[] = []
  colsS.forEach((z, j) => { if (j > 0) tS.push(z); if (j < colsS.length - 1) tS.push((z + colsS[j + 1]) / 2) })
  const dTriF = tF.map((x) => poly([[x - 1.7, yA + 4.4, 0], [x + 1.7, yA + 4.4, 0], [x + 1.7, yC, 0], [x - 1.7, yC, 0]])).join('')
  const dTriS = tS.map((z) => poly([[hw, yA + 4.4, z - 1.7], [hw, yA + 4.4, z + 1.7], [hw, yC, z + 1.7], [hw, yC, z - 1.7]])).join('')
  const dGlyF = tF.map((x) => seg([x - 0.5, yA + 4.8, 0], [x - 0.5, yC - 0.4, 0]) + seg([x + 0.6, yA + 4.8, 0], [x + 0.6, yC - 0.4, 0])).join('')

  // sculptures du fronton : figures qui décroissent vers les angles
  const figures = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((k) => {
    const x = (k * (hw - 7)) / 4.3
    const hT = (yR - yE - 2.4) * (1 - Math.abs(x) / (hw - 3))
    return { x, h: hT * (k === 0 ? 0.94 : 0.86), centre: k === 0 }
  }).filter((g) => g.h > 2)

  return (
    <g>
      <OmbreSE x0={-hw - 6} x1={hw + 6} z0={-6} z1={d + 6} h={yE + 22} o={0.3} />
      {/* crépidoma : trois degrés, du plus bas au plus haut */}
      {[0, 1, 2].map((i) => {
        const e = (2 - i) * so
        return <Boite key={i} x0={-hw - e} x1={hw + e} z0={-e} z1={d + e} y0={i * sh} y1={(i + 1) * sh} m={m} />
      })}
      <AOPied x0={-hw - 2 * so} x1={hw + 2 * so} z={-2 * so} />
      {/* cella : flanc est derrière la colonnade, pronaos dans la pénombre */}
      <Boite x0={cx0} x1={cx1} z0={cz0} z1={cz1} y0={yS} y1={yA} m={marbre ? MATS.marbre : MATS.stuc} sansDessus />
      <path d={poly([[cx0, yS, cz0], [cx1, yS, cz0], [cx1, yA, cz0], [cx0, yA, cz0]])} fill={marbre ? '#9d927a' : '#8f7a58'} />
      <path d={poly([[cx0, yA - 12, cz0], [cx1, yA - 12, cz0], [cx1, yA, cz0], [cx0, yA, cz0]])} fill={PAL.ombrePortee} opacity={0.4} filter="url(#a-flou2)" />
      {/* plafond du portique : ombre franche sur le haut du flanc de cella */}
      <path d={poly([[cx1, yA - 8, cz0], [cx1, yA - 8, cz1], [cx1, yA, cz1], [cx1, yA, cz0]])} fill={PAL.ombrePortee} opacity={0.3} filter="url(#a-flou1)" />
      {/* la porte, et la statue de culte qui luit au fond */}
      <path d={poly([[-7, yS, cz0], [7, yS, cz0], [7, yS + hCol * 0.64, cz0], [-7, yS + hCol * 0.64, cz0]])} fill="#1f160c" />
      {(() => {
        const [X, Y] = P(0, yS, cz0)
        const hh = hCol * 0.56
        return (
          <g>
            <ellipse cx={X} cy={Y - hh * 0.55} rx={6.4} ry={hh * 0.62} fill="url(#iso-lueur)">
              <animate attributeName="opacity" values="0.65;1;0.65" dur="4.2s" repeatCount="indefinite" />
            </ellipse>
            <path d={`M${f(X - 2.2)},${f(Y)} L${f(X - 1.6)},${f(Y - hh * 0.62)} L${f(X - 2.4)},${f(Y - hh * 0.78)} L${f(X)},${f(Y - hh)} L${f(X + 2.4)},${f(Y - hh * 0.78)} L${f(X + 1.6)},${f(Y - hh * 0.62)} L${f(X + 2.2)},${f(Y)} Z`} fill={marbre ? 'url(#iso-or)' : '#8a6a2c'} />
            <circle cx={X} cy={Y - hh - 1.8} r={1.6} fill={marbre ? '#f0cd84' : '#a8813a'} />
            <path d={seg([-7, yS, cz0], [-7, yS + hCol * 0.64, cz0]) + seg([-7, yS + hCol * 0.64, cz0], [7, yS + hCol * 0.64, cz0])} stroke={marbre ? '#e8c97e' : PAL.pierreLit} strokeWidth={1.1} />
          </g>
        )
      })()}
      {/* péristyle de flanc, du fond vers l'avant, puis la façade */}
      {colsS.slice(1).reverse().map((z) => (
        <ColonneDorique key={`s${z}`} x={colsF[nF - 1]} y0={yS} z={z} h={hCol} r={r} mat={marbre ? 'marbre' : 'pierre'} or={marbre} />
      ))}
      {colsF.map((x) => (
        <ColonneDorique key={`f${x}`} x={x} y0={yS} z={marge} h={hCol} r={r} mat={marbre ? 'marbre' : 'pierre'} or={marbre} />
      ))}
      {/* entablement : architrave, frise dorique, corniche */}
      <Boite x0={-hw} x1={hw} z0={0} z1={d} y0={yA} y1={yA + 4.4} m={m} />
      <Boite x0={-hw} x1={hw} z0={0} z1={d} y0={yA + 4.4} y1={yC} m={m} sansDessus />
      <path d={seg([-hw, yA + 4.4, 0], [hw, yA + 4.4, 0]) + seg([hw, yA + 4.4, 0], [hw, yA + 4.4, d])} stroke="#9a3f2c" strokeWidth={0.9} />
      <path d={dTriF} fill={tri} />
      <path d={dTriS} fill={tri} opacity={0.85} />
      <path d={dGlyF} stroke="#1c2e40" strokeWidth={0.45} />
      {marbre && colsF.map((x) => {
        const [X, Y] = P(x, yA + 2.2, 0)
        return (
          <g key={`bo${x}`}>
            <circle cx={X} cy={Y} r={1.8} fill="url(#iso-or)" />
            <circle cx={X - 0.5} cy={Y - 0.5} r={0.6} fill="#fff3cf" />
          </g>
        )
      })}
      <Boite x0={-hw - 1.2} x1={hw + 1.2} z0={-1.2} z1={d + 1.2} y0={yC} y1={yE} m={m} sansDessus />
      <path d={seg([-hw - 1.2, yC, -1.2], [hw + 1.2, yC, -1.2]) + seg([hw + 1.2, yC, -1.2], [hw + 1.2, yC, d + 1.2])} stroke={PAL.ombrePortee} strokeWidth={1.2} opacity={0.35} />
      {/* toit de tuiles, puis le fronton qui le ferme au sud */}
      <ToitDeuxPans xa={-hw - 1.8} xb={hw + 1.8} z0={zf} z1={d + 1.4} yEgout={yE} yFaite={yR} antefixes pasTuile={marbre ? 5.4 : 5} />
      <path d={poly([[-hw - 1.2, yE, zf], [0, yR - 0.4, zf], [hw + 1.2, yE, zf]])} fill={m.face} />
      <path d={poly([[-hw + 4, yE + 1.1, zf], [0, yR - 2.6, zf], [hw - 4, yE + 1.1, zf]])} fill={tympan} />
      {figures.map((g, i) => {
        const [X, Y] = P(g.x, yE + 1.2, zf)
        const larg = g.h * (g.centre ? 0.34 : 0.4)
        const fill = marbre ? (g.centre ? 'url(#iso-or)' : '#f4eee0') : '#ddd4bd'
        return (
          <g key={`fg${i}`}>
            <path d={`M${f(X - larg)},${f(Y)} L${f(X - larg * 0.7)},${f(Y - g.h * 0.72)} L${f(X + larg * 0.7)},${f(Y - g.h * 0.72)} L${f(X + larg)},${f(Y)} Z`} fill={fill} />
            <circle cx={X} cy={Y - g.h * 0.84} r={g.h * 0.14} fill={fill} />
            <path d={`M${f(X + larg * 0.2)},${f(Y)} L${f(X + larg * 0.5)},${f(Y - g.h * 0.72)}`} stroke={PAL.ombrePortee} strokeWidth={0.4} opacity={0.35} />
          </g>
        )
      })}
      <path d={seg([-hw - 1.8, yE, zf], [0, yR, zf]) + seg([0, yR, zf], [hw + 1.8, yE, zf])} stroke={m.arete} strokeWidth={1.6} />
      <path d={seg([-hw - 1.2, yE - 0.2, zf], [0, yR - 1.4, zf]) + seg([0, yR - 1.4, zf], [hw + 1.2, yE - 0.2, zf])} stroke={PAL.ombrePortee} strokeWidth={0.8} opacity={0.3} />
      {/* acrotères : palmette au faîte, griffons stylisés aux angles */}
      {([[0, yR, zf, 1], [0, yR, d + 1.4, 0.7], [-hw - 1.4, yE, zf, 0.6], [hw + 1.4, yE, zf, 0.6]] as const).map(([x, y, z, k], i) => {
        const [X, Y] = P(x, y, z)
        const or = marbre ? 'url(#iso-or)' : '#b0613f'
        return (
          <g key={`ac${i}`} transform={`translate(${f(X)},${f(Y)}) scale(${k})`}>
            <path d="M0,0 C-3.6,-2 -3.6,-6 -1.2,-7.4 C-1.4,-5 -0.6,-3.2 0,-2.6 C0.6,-3.2 1.4,-5 1.2,-7.4 C3.6,-6 3.6,-2 0,0 Z" fill={or} />
            <path d="M0,-2.6 L0,-9" stroke={or} strokeWidth={1.2} strokeLinecap="round" />
            <circle cx={0} cy={-9.4} r={1.2} fill={or} />
          </g>
        )
      })}
    </g>
  )
}

function Sanctuaire({ n }: { n: number }) {
  const marbre = n >= 4
  const plan: Plan = marbre
    ? { w: 124, d: 74, nF: 8, nS: 6, hCol: 38, r: 3.6, marbre: true }
    : { w: 100, d: 60, nF: 6, nS: 5, hCol: 31, r: 3.2, marbre: false }
  const hw = plan.w / 2
  const sol = marbre ? '#ddd2b8' : '#c9ba96'
  const joint = marbre ? '#b3a78b' : '#9c8f73'
  const x0 = -hw - 26
  const x1 = hw + 26
  const z0 = -34
  const z1 = plan.d + 12
  const [wx, wy] = P(0, 0, -16)
  const buisson = (x: number, z: number, s: number, seed: number) => {
    const [X, Y] = P(x, 0, z)
    return <Arbre key={seed} x={X} y={Y} essence="laurier" haut={14 * s} larg={18 * s} seed={seed} />
  }
  return (
    <g>
      {/* terre du temenos, puis le parvis dallé */}
      <ellipse cx={20} cy={-10} rx={116} ry={34} fill="#b39f70" opacity={0.45} />
      <Boite x0={x0} x1={x1} z0={z0} z1={z1} y0={-1.6} y1={0} m={marbre ? MATS.marbre : MATS.pierre} sansDessus />
      <Aire x0={x0} x1={x1} z0={z0} z1={z1} fill={sol} dalles={{ dx: marbre ? 11 : 12.5, dz: marbre ? 8.5 : 9.5 }} joint={joint} />
      {/* usure du dallage : le passage des processions, plus clair ; les bords, plus sourds */}
      <ellipse cx={wx} cy={wy} rx={46} ry={9} fill={marbre ? '#f6f0e2' : '#e0d4b4'} opacity={0.6} filter="url(#a-flou4)" />
      <path d={poly([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]])} fill="none" stroke={marbre ? '#a89c80' : '#8c7f63'} strokeWidth={5} opacity={0.35} filter="url(#a-flou2)" />
      {marbre && <Aire x0={-9} x1={9} z0={z0} z1={-9} fill="#efe7d4" dalles={{ dx: 9, dz: 5 }} joint="#cfc7b2" />}
      {[buisson(x0 + 4, z1 - 6, 1, 31), buisson(x1 - 10, z1 - 2, 0.9, 32)]}
      {/* derrière : cyprès du bois sacré, puis le temple */}
      {marbre ? (
        <Cypres x={P(-hw - 16, 0, plan.d - 10)[0]} y={P(-hw - 16, 0, plan.d - 10)[1]} h={58} />
      ) : (
        <Arbre x={P(-hw - 22, 0, plan.d - 18)[0]} y={P(-hw - 22, 0, plan.d - 18)[1]} essence="chene" haut={60} larg={66} seed={3} />
      )}
      <Cypres x={P(-hw - 6, 0, plan.d + 6)[0]} y={P(-hw - 6, 0, plan.d + 6)[1]} h={marbre ? 50 : 40} />
      <Cypres x={P(hw + 16, 0, plan.d + 2)[0]} y={P(hw + 16, 0, plan.d + 2)[1]} h={marbre ? 54 : 44} />
      <TemplePeriptere {...plan} />
      {/* devant : autel, offrandes ; le centre du parvis reste aux prêtres */}
      <Autel x={marbre ? 38 : 34} z={-30} w={marbre ? 22 : 15} d={marbre ? 10 : 8} h={marbre ? 7.5 : 6.4} m={marbre ? MATS.marbre : MATS.pierre} k={marbre ? 1.2 : 1} />
      {marbre ? (
        <>
          <Statue x={-hw - 18} z={-20} marbre />
          <Statue x={hw + 12} z={-22} flip marbre />
          <Brasero X={P(-hw + 4, 0, -12)[0]} Y={P(-hw + 4, 0, -12)[1]} />
          <Brasero X={P(hw - 12, 0, -12)[0]} Y={P(hw - 12, 0, -12)[1]} />
          <Trepied X={P(-44, 0, -30)[0]} Y={P(-44, 0, -30)[1]} or />
          <Trepied X={P(76, 0, -8)[0]} Y={P(76, 0, -8)[1]} or s={0.9} />
        </>
      ) : (
        <>
          <Trepied X={P(-42, 0, -26)[0]} Y={P(-42, 0, -26)[1]} />
          <Stele X={P(hw + 14, 0, -18)[0]} Y={P(hw + 14, 0, -18)[1]} />
          <Stele X={P(hw + 22, 0, -10)[0]} Y={P(hw + 22, 0, -10)[1]} h={10} s={0.9} />
        </>
      )}
      {[buisson(x0 + 2, z0 + 8, 0.9, 33), buisson(x1 - 2, z0 + 14, 0.8, 34), buisson(x1 + 4, z0 + 30, 1, 35)]}
      <Arbre x={P(-hw - 28, 0, -16)[0]} y={P(-hw - 28, 0, -16)[1]} essence="olivier" haut={marbre ? 40 : 36} larg={30} seed={marbre ? 14 : 8} />
    </g>
  )
}

export function Temple({ n }: { n: number }) {
  return (
    <g>
      <defs>
        <DefsIso />
      </defs>
      {n <= 1 ? <BoisSacre /> : n === 2 ? <Naiskos /> : <Sanctuaire n={n} />}
    </g>
  )
}
