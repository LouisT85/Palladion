import type { ReactNode } from 'react'
import { AOBase, Batisse3D, Fenetre3D, MurPierre, OmbreVolume, PAL, Porte3D, alea } from '../art'
import { Buisson, Feu, Fumee, OlivierMini } from './primitives'

/*
 * CASERNE - camp d'entraînement puis école de guerre.
 * Peint réaliste (bible docs/STYLE-ART.md) : lumière NW, ombres portées SE,
 * zéro contour noir, modelé par les valeurs.
 *  1. terrain d'exercice battu + faisceau de lances + tente de campagne
 *  2. baraquement de bois + cible criblée de flèches
 *  3. cour d'armes pavée + panoplies de bronze + caserne de pierre
 *  4. école de guerre : tour de guet, bannière d'or, feu de camp
 * Les Recrues d'Ouvriers.tsx s'exercent à (-19,5) et (-7,11), lance pointée
 * vers l'OUEST : les mannequins sont plantés juste devant leurs coups.
 */

// bronze : casques et cuirasses - sombre pour se détacher de la paille
const BR = { creux: '#5c451c', mi: '#8f6d29', clair: '#b8933a', spec: '#e2c778' }
// paille battue : quatre valeurs (ombre propre → éclat NW)
const PA = { ombre: '#6f5225', mi: '#a8853e', lit: '#d3b46c', ecl: '#eddfa8' }
// fer forgé
const FE = { ombre: '#6f7780', mi: '#9aa2ab', lit: '#e2e8ee' }
// cuir et hampes
const CU = { ombre: '#4a3520', mi: '#7a5a35', lit: '#a8845d' }

/* ── sol d'exercice battu : 2 tons, piste tassée, empreintes, gravier ───── */
function SolExercice() {
  const rnd = alea(17)
  const pas: ReactNode[] = []
  for (let i = 0; i < 10; i++) {
    const t = i / 9
    const px = -38 + t * 34 + (rnd() - 0.5) * 4
    const py = 3 + Math.sin(t * Math.PI) * 7 + (rnd() - 0.5) * 3
    const a = -20 + rnd() * 44
    // une paire d'empreintes = un seul nœud (deux sous-chemins)
    pas.push(
      <path
        key={`p${i}`}
        transform={`translate(${px},${py}) rotate(${a})`}
        d="M-2.15,0 a1.05,0.5 0 1,0 2.1,0 a1.05,0.5 0 1,0 -2.1,0 M0.05,0.9 a1.05,0.5 0 1,0 2.1,0 a1.05,0.5 0 1,0 -2.1,0"
        fill="#66502f"
        opacity={0.32}
      />,
    )
  }
  const cailloux: ReactNode[] = []
  for (let i = 0; i < 5; i++) {
    const cx = -46 + rnd() * 60
    const cy = -2 + rnd() * 16
    const r = 0.85 + rnd() * 0.7
    cailloux.push(
      <g key={`c${i}`}>
        <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.64} fill="#968c74" />
        <ellipse cx={cx - r * 0.22} cy={cy - r * 0.24} rx={r * 0.6} ry={r * 0.32} fill="#c6bc9f" />
      </g>,
    )
  }
  return (
    <g>
      {/* aire en tons superposés : bord terreux, cœur sec et clair */}
      <ellipse cx={2} cy={3} rx={50} ry={15.6} fill="#9c8455" opacity={0.8} />
      <ellipse cx={-3} cy={3} rx={44} ry={13.2} fill="#b89d64" />
      <ellipse cx={-16} cy={5} rx={24} ry={8.2} fill="#c8ac70" opacity={0.9} />
      {/* piste tassée autour des mannequins : deux arcs flous, jamais un cerne */}
      <path d="M-40,5.6 A18,7 0 0 0 -5,8.6" fill="none" stroke="#7f6636" strokeWidth={3.8} opacity={0.34} filter="url(#a-flou2)" />
      <path d="M-38,3 A17,6.4 0 0 1 -6,2.4" fill="none" stroke="#7f6636" strokeWidth={2.4} opacity={0.22} filter="url(#a-flou2)" />
      {/* plaques : poussière sèche éclairée, terre grasse à l'ombre */}
      <ellipse cx={-13} cy={-1} rx={11.5} ry={3.4} fill="#dcc286" opacity={0.28} filter="url(#a-flou2)" />
      <ellipse cx={-33} cy={12} rx={9.5} ry={3.2} fill="#6b5530" opacity={0.22} filter="url(#a-flou2)" />
      <ellipse cx={14} cy={-2} rx={11} ry={3.4} fill="#7f6636" opacity={0.18} filter="url(#a-flou2)" />
      {pas}
      {cailloux}
      {/* terre craquelée */}
      <path d="M-31,14 q4.5,-1.2 7.5,0.6 M-4,13.5 q4,1.1 7,-0.2 M-44,7 q3,1.4 5.5,0.4" stroke="#8c7444" strokeWidth={0.6} fill="none" opacity={0.45} />
      {/* touffes rases en bordure : base sombre, pointes claires */}
      <path
        d="M-47,4 q1.2,-2.6 2.2,-3.2 M-45.6,4.4 q0.7,-2.2 1.7,-2.8 M-18,16.5 q0.9,-2.2 1.9,-2.7 M-16.6,16.8 q0.6,-1.9 1.5,-2.4 M-40,12.5 q0.8,-2 1.7,-2.5"
        stroke="#5f6438"
        strokeWidth={1.1}
        fill="none"
        opacity={0.6}
      />
      <path
        d="M-47,4 q1.2,-2.6 2.2,-3.2 M-45.6,4.4 q0.7,-2.2 1.7,-2.8 M-18,16.5 q0.9,-2.2 1.9,-2.7 M-16.6,16.8 q0.6,-1.9 1.5,-2.4 M-40,12.5 q0.8,-2 1.7,-2.5"
        stroke="#8b9159"
        strokeWidth={0.55}
        fill="none"
        opacity={0.7}
      />
    </g>
  )
}

/* ── cour d'armes dallée (niv. 3+) : terrasse basse, dalles fuyantes ─────
 * Le sol doit se lire comme un SOL : dalles très écrasées et cisaillées,
 * valeurs serrées et chaudes (jamais un appareil de mur), chant de terrasse
 * visible au sud pour donner l'épaisseur. */
function CourPavee({ seed = 5 }: { seed?: number }) {
  const rnd = alea(seed)
  const tons = ['#c8b485', '#bfab7c', '#d1bd92', '#b5a372']
  const RX = 30
  const RY = 8.5
  const dalles: ReactNode[] = []
  let yTop = -RY + 0.5
  for (let row = 0; row < 5; row++) {
    const hh = 1.5 + row * 0.5 // rangs plus hauts en approchant : fuite
    let cx = -RX + (row % 2 ? 7 : 0) + rnd() * 2
    while (cx < RX) {
      const ww = 13 + row * 2.2 + rnd() * 4
      const mx = cx + ww / 2
      const my = yTop + hh / 2
      if ((mx / RX) ** 2 + (my / RY) ** 2 <= 0.95) {
        // cisaillement + creusement au bord : la rangée épouse le plan du sol
        const sk = 0.9
        const dip = 1.5 * (mx / RX) ** 2 * (my < 0 ? 1 : -1)
        const y0 = yTop + dip
        const hv = hh - 0.5
        dalles.push(
          <path
            key={`${row}-${cx.toFixed(0)}`}
            d={`M${cx},${y0 + hv} L${cx + sk},${y0} L${cx + ww - 1.2 + sk},${y0 - 0.35} L${cx + ww - 1.2},${y0 + hv - 0.35} Z`}
            fill={tons[Math.floor(rnd() * tons.length)]}
          />,
        )
      }
      cx += ww
    }
    yTop += hh
  }
  return (
    <g>
      {/* chant de la terrasse au sud : épaisseur en demi-teinte */}
      <path d={`M${-RX + 1},1 A${RX},${RY} 0 0 0 ${RX - 1},1 L${RX - 1},-0.6 A${RX},${RY} 0 0 1 ${-RX + 1},-0.6 Z`} fill="#9c8b64" />
      {/* lit de pose : joints en creux, chaud et sombre */}
      <ellipse cx={0} cy={0} rx={RX} ry={RY} fill="#93815a" opacity={0.8} />
      {dalles}
      {/* la cour s'enfonce dans l'ombre du bâtiment au nord */}
      <ellipse cx={-2} cy={-RY + 2.2} rx={RX * 0.8} ry={3} fill={PAL.ombrePortee} opacity={0.22} filter="url(#a-flou2)" />
      {/* usure : passage terreux vers la porte, éclat sec au sud-est */}
      <ellipse cx={-2} cy={3} rx={12} ry={3.4} fill="#a08b5c" opacity={0.3} filter="url(#a-flou2)" />
      <ellipse cx={14} cy={2} rx={9} ry={2.6} fill="#fff6e0" opacity={0.12} filter="url(#a-flou2)" />
      {/* herbe dans les joints, bord sud fondu dans la terre battue */}
      <path d="M-14,6.2 q0.7,-1.8 1.6,-2.2 M16,5 q0.6,-1.7 1.5,-2.1" stroke="#6f7442" strokeWidth={0.8} fill="none" opacity={0.6} />
      <path d={`M${-RX + 3},5 A${RX},${RY} 0 0 0 ${RX - 4},3`} fill="none" stroke="#9c8455" strokeWidth={3} opacity={0.45} filter="url(#a-flou2)" />
    </g>
  )
}

/* ── bouclier rond décoré : reflets NW, motifs grecs, posé ou accroché ──── */
function BouclierRond({
  x,
  y,
  r = 3.6,
  tilt = -10,
  fond = '#8c6b3f',
  motif = 'aucun',
  mur = false,
}: {
  x: number
  y: number
  r?: number
  tilt?: number
  fond?: string
  motif?: 'aucun' | 'cercles' | 'gamma' | 'rais'
  mur?: boolean
}) {
  return (
    <g transform={`translate(${x},${y})`}>
      {mur ? (
        <circle cx={r * 0.34} cy={-r * 0.68} r={r * 1.02} fill={PAL.ombrePortee} opacity={0.2} filter="url(#a-flou1)" />
      ) : (
        <ellipse cx={r * 0.5} cy={r * 0.24} rx={r * 1.08} ry={r * 0.4} fill={PAL.ombrePortee} opacity={0.17} filter="url(#a-flou1)" />
      )}
      <g transform={`rotate(${tilt}) translate(0,${mur ? -r * 1.02 : -r * 0.92})`}>
        {/* jante de bois puis champ peint, bombé par un liseré clair au NW */}
        <circle r={r} fill="#57422a" />
        <circle r={r * 0.85} fill={fond} />
        {motif === 'cercles' && <circle r={r * 0.56} fill="none" stroke="#d3c6a4" strokeWidth={r * 0.14} opacity={0.75} />}
        {motif === 'gamma' &&
          [45, 135, 225, 315].map((a) => (
            <path key={a} transform={`rotate(${a})`} d={`M${-r * 0.14},${-r * 0.6} h${r * 0.38} v${r * 0.28}`} stroke="#d3c6a4" strokeWidth={r * 0.13} fill="none" opacity={0.75} />
          ))}
        {motif === 'rais' &&
          [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path key={a} transform={`rotate(${a})`} d={`M0,${-r * 0.66} v${r * 0.22}`} stroke="#d3c6a4" strokeWidth={r * 0.11} opacity={0.65} />
          ))}
        {/* umbo de bronze + éclat */}
        <circle r={r * 0.22} fill={BR.mi} />
        <path d={`M${-r * 0.19},${-r * 0.05} A${r * 0.22},${r * 0.22} 0 0 1 ${r * 0.05},${-r * 0.2}`} stroke={BR.spec} strokeWidth={r * 0.12} fill="none" />
        {/* reflet en arc côté lumière, ombre du bord au SE */}
        <path d={`M${-r * 0.62},${-r * 0.46} A${r * 0.78},${r * 0.78} 0 0 1 ${r * 0.24},${-r * 0.72}`} stroke="#fff6e0" strokeWidth={r * 0.15} fill="none" opacity={0.4} />
        <path d={`M${r * 0.66},${r * 0.38} A${r * 0.8},${r * 0.8} 0 0 1 ${-r * 0.24},${r * 0.74}`} stroke={PAL.ombrePortee} strokeWidth={r * 0.22} fill="none" opacity={0.26} />
      </g>
    </g>
  )
}

/* ── mannequin d'exercice (pell) : poteau, bras de traverse, torse de paille ─ */
function Mannequin({ x, y, seed = 1, armure = false, bouclier = false }: { x: number; y: number; seed?: number; armure?: boolean; bouclier?: boolean }) {
  const rnd = alea(seed * 53)
  const tilt = -3 + rnd() * 8
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-1.6,0.5 L1.9,0.5 L11,4.6 L5.6,5.1 Z" fill={PAL.ombrePortee} opacity={0.22} filter="url(#a-flou1)" />
      {/* tertre de terre remuée au pied du poteau */}
      <ellipse cx={0.6} cy={0.7} rx={5.8} ry={1.9} fill="#8f7647" />
      <ellipse cx={-0.5} cy={0.1} rx={4.6} ry={1.4} fill="#bda269" />
      <AOBase rx={5} ry={1.6} />
      <g transform={`rotate(${tilt})`}>
        {/* poteau : arête gauche au soleil, droite dans l'ombre */}
        <rect x={-1.4} y={-13.6} width={2.8} height={13.8} fill={PAL.boisMi} />
        <rect x={-1.4} y={-13.6} width={0.95} height={13.8} fill={PAL.boisLit} />
        <rect x={0.7} y={-13.6} width={0.7} height={13.8} fill={PAL.boisOmbre} opacity={0.85} />
        {/* traverse des bras : dessus éclairé, dessous en ombre franche */}
        <rect x={-7.6} y={-10.9} width={15.2} height={2.3} fill={PAL.boisMi} />
        <rect x={-7.6} y={-10.9} width={15.2} height={0.7} fill={PAL.boisLit} />
        <rect x={-7.6} y={-9.2} width={15.2} height={0.7} fill={PAL.boisOmbre} opacity={0.8} />
        {/* poings de paille ligotés aux extrémités des bras */}
        {[-1, 1].map((s) => (
          <g key={s} transform={`translate(${s * 7.9},-9.7)`}>
            <path d="M-1.9,1.5 C-2.4,-0.4 -1.7,-1.9 0,-1.9 C1.7,-1.9 2.4,-0.4 1.9,1.5 Q0,2.6 -1.9,1.5 Z M-1.4,2.1 q-0.7,1.1 -1.5,1.5" fill={PA.ombre} stroke={PA.ombre} strokeWidth={0.6} />
            <path d="M-1.9,1.5 C-2.4,-0.4 -1.7,-1.9 0,-1.9 C0.5,-1.9 0.9,-1.7 1.1,-1.5 L0.9,1.9 Q-0.8,2.1 -1.9,1.5 Z" fill={s < 0 ? PA.lit : PA.mi} />
            <path d="M-1.6,0.2 Q0,0.9 1.6,0.2" stroke="#4f3a1c" strokeWidth={0.55} fill="none" />
          </g>
        ))}
        {/* torse de paille sanglé sur la traverse : trois valeurs */}
        <path d="M-3.4,-3.6 C-4.3,-6.4 -4,-8.8 -2.8,-9.9 L2.8,-9.9 C4,-8.8 4.3,-6.4 3.4,-3.6 Q0,-2.2 -3.4,-3.6 Z" fill={PA.ombre} />
        <path d="M-3.3,-3.7 C-4.1,-6.4 -3.8,-8.7 -2.7,-9.8 L1.6,-9.8 C2.5,-8.5 2.6,-6.2 1.8,-3.4 Q-1.1,-2.6 -3.3,-3.7 Z" fill={PA.mi} />
        <path d="M-3.1,-3.8 C-3.8,-6.4 -3.5,-8.6 -2.5,-9.7 L-0.2,-9.7 C0.3,-8.1 0.3,-5.9 -0.3,-3.3 Q-1.9,-2.9 -3.1,-3.8 Z" fill={PA.lit} />
        <path d="M-2.5,-8.8 q0.3,2.6 -0.1,4.9 M2.2,-9 q0.4,2.6 0,4.9" stroke={PA.ecl} strokeWidth={0.5} fill="none" opacity={0.55} />
        {/* corde de ceinture : creux sombre + fil éclairé */}
        <path d="M-3.6,-5.4 Q0,-4.2 3.6,-5.4" stroke="#4f3a1c" strokeWidth={0.9} fill="none" />
        <path d="M-3.6,-6 Q0,-4.8 3.6,-6" stroke={CU.lit} strokeWidth={0.4} fill="none" opacity={0.7} />
        {/* entailles d'exercice */}
        <path d="M-2.2,-8.2 l1.9,-1 M-1.8,-6.2 l2,-1.1 M0.6,-7.4 l1.6,-0.9" stroke="#4f3a1c" strokeWidth={0.55} fill="none" opacity={0.7} />
        {/* paille qui s'échappe en bas */}
        <path d="M-2.5,-3.4 q-0.7,1.7 -1.6,2.3 M-0.5,-2.8 q-0.1,1.7 -0.7,2.6 M1.9,-3.2 q0.6,1.4 1.4,2.1" stroke={PA.mi} strokeWidth={0.75} fill="none" />
        {armure && (
          <g>
            {/* cuirasse de bronze sanglée sur la paille, spéculaire NW */}
            <path d="M-3.3,-3.9 L-3.8,-9.1 Q0,-10.4 3.8,-9.1 L3.3,-3.9 Q0,-2.7 -3.3,-3.9 Z" fill={BR.mi} />
            <path d="M-3.3,-3.9 L-3.8,-9.1 Q-1.7,-9.9 -0.4,-9.8 L-0.2,-3.5 Q-1.8,-3.3 -3.3,-3.9 Z" fill={BR.clair} />
            <path d="M-2.5,-9.2 Q-2.1,-6.9 -2.4,-4.4" stroke={BR.spec} strokeWidth={0.95} opacity={0.85} fill="none" />
            <path d="M-1.6,-7.6 Q0,-7 1.6,-7.6 M-1.3,-5.7 Q0,-5.2 1.3,-5.7" stroke={BR.creux} strokeWidth={0.5} opacity={0.75} fill="none" />
            <path d="M3.3,-3.9 L3.8,-9.1" stroke={BR.creux} strokeWidth={0.8} opacity={0.85} />
            <ellipse cx={1.8} cy={-6.4} rx={0.9} ry={1.1} fill={BR.creux} opacity={0.6} />
          </g>
        )}
        {/* casque cabossé sur le sommet du poteau : bronze sombre, éclat NW */}
        <path d="M-2.9,-13.4 C-3.1,-16.4 -1.6,-18 0,-18 C1.5,-18 2.6,-17.2 2.8,-16 L2.1,-15.1 L2.9,-14.4 L2.9,-13.4 Z" fill={BR.mi} />
        <path d="M-2.9,-13.4 C-3.1,-16.4 -1.6,-18 0,-18 C0.4,-18 0.7,-17.9 1,-17.7 L0.7,-13.4 Z" fill={BR.clair} />
        <path d="M2.8,-16 L2.1,-15.1 L2.9,-14.4" stroke={BR.creux} strokeWidth={0.75} fill="none" opacity={0.9} />
        <path d="M-2.1,-16.6 Q-1.1,-17.6 0.1,-17.5" stroke={BR.spec} strokeWidth={0.85} fill="none" opacity={0.9} />
        <path d="M-2.9,-13.4 L2.9,-13.4" stroke={BR.creux} strokeWidth={0.7} opacity={0.8} />
        <path d="M-2.7,-13.4 l0.35,1.9 l1.05,0 l0.2,-1.9 Z" fill={BR.creux} opacity={0.85} />
        {/* tronçon de flèche resté planté dans la paille */}
        <line x1={2.2} y1={-7.2} x2={6.2} y2={-8.9} stroke={CU.ombre} strokeWidth={0.85} />
        <line x1={3.4} y1={-7.7} x2={6.2} y2={-8.9} stroke={CU.lit} strokeWidth={0.4} />
        <path d="M6.2,-8.9 l1.9,-0.5 l-0.5,1.5 Z" fill="#e0d6bc" />
      </g>
      {bouclier && <BouclierRond x={-6.8} y={0.8} r={3.1} tilt={-15} fond={armure ? '#9c4d3a' : '#8c6b3f'} motif={armure ? 'cercles' : 'aucun'} />}
    </g>
  )
}

/* ── cible de tir : mat de paille tressée sur trépied, flèches plantées ─── */
function CibleTir({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-3.6,0.6 L3.6,0.6 L10.4,3.8 L4,4 Z" fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou1)" />
      <AOBase rx={5} ry={1.5} />
      {/* trépied : pied ouest au soleil, pied est ombré, jambe arrière neutre */}
      <line x1={-4.2} y1={0.6} x2={-0.7} y2={-5.4} stroke={PAL.boisMi} strokeWidth={1.5} />
      <line x1={-4} y1={0.4} x2={-0.9} y2={-5.2} stroke={PAL.boisLit} strokeWidth={0.6} />
      <line x1={4.2} y1={0.6} x2={0.7} y2={-5.4} stroke={PAL.boisOmbre} strokeWidth={1.5} />
      <line x1={0.8} y1={2} x2={0} y2={-5} stroke={PAL.boisMi} strokeWidth={1.2} opacity={0.75} />
      <path d="M-2.4,-3.4 Q0,-2.6 2.4,-3.4" stroke="#4f3a1c" strokeWidth={0.7} fill="none" />
      {/* chant du mat en paille tressée, vu par l'est */}
      <ellipse cx={0.9} cy={-9} rx={5.6} ry={5.7} fill={PA.ombre} />
      <circle cx={0} cy={-9.4} r={5.5} fill={PA.mi} />
      <path d="M-5.2,-11 A5.5,5.5 0 0 1 4.6,-12" stroke={PA.ecl} strokeWidth={0.6} fill="none" opacity={0.5} />
      <path d="M-4.9,-6.4 A5.5,5.5 0 0 0 4.8,-7.4" stroke="#5b421c" strokeWidth={0.6} fill="none" opacity={0.5} />
      {/* champ peint : rouge terre et crème, pas de rouge criard */}
      <circle cx={-0.1} cy={-9.5} r={4.2} fill="#cfc2a1" />
      <circle cx={-0.1} cy={-9.5} r={3} fill="#9c4d3a" />
      <circle cx={-0.1} cy={-9.5} r={1.8} fill="#cfc2a1" />
      <circle cx={-0.1} cy={-9.5} r={0.85} fill="#9c4d3a" />
      {/* modelé du disque : ombre interne SE, reflet NW */}
      <path d="M4.5,-7 A5.4,5.4 0 0 1 -2.6,-4.6 A6.6,6.6 0 0 0 4.5,-7 Z" fill={PAL.ombrePortee} opacity={0.16} />
      <path d="M-4.8,-11.8 A5.4,5.4 0 0 1 -0.6,-14.9" stroke="#fff6e0" strokeWidth={0.9} fill="none" opacity={0.4} />
      {/* flèches plantées, ombre du fût SUR la face peinte */}
      <line x1={-0.5} y1={-9} x2={2.8} y2={-10.1} stroke={PAL.ombrePortee} strokeWidth={0.85} opacity={0.3} />
      <line x1={-0.8} y1={-9.9} x2={5.8} y2={-12.6} stroke={CU.ombre} strokeWidth={0.95} />
      <line x1={1.4} y1={-10.8} x2={5.8} y2={-12.6} stroke={CU.lit} strokeWidth={0.45} />
      <path d="M5.8,-12.6 l1.9,-1.3 l-0.3,1.7 Z" fill="#9c4d3a" />
      <path d="M5,-12.3 l1.7,-1.2 l-0.2,1.6 Z" fill="#ece5d2" />
      <line x1={-2} y1={-6.6} x2={0.9} y2={-6.6} stroke={PAL.ombrePortee} strokeWidth={0.75} opacity={0.28} />
      <line x1={-2.3} y1={-7.3} x2={3.8} y2={-8} stroke={CU.ombre} strokeWidth={0.95} />
      <path d="M3.8,-8 l1.9,-0.6 l-0.5,1.5 Z" fill="#ece5d2" />
      <line x1={-1.7} y1={-12.3} x2={4.4} y2={-15.3} stroke={CU.ombre} strokeWidth={0.9} />
      <path d="M4.4,-15.3 l1.8,-1 l-0.2,1.6 Z" fill="#ece5d2" />
      {/* flèche perdue, fichée dans le sol */}
      <ellipse cx={7.6} cy={1.5} rx={1.7} ry={0.55} fill={PAL.ombrePortee} opacity={0.18} />
      <line x1={7.2} y1={1.3} x2={9.8} y2={-3.3} stroke={CU.ombre} strokeWidth={0.9} />
      <path d="M9.8,-3.3 l1.5,-1.5 l0.1,1.7 Z" fill="#9c4d3a" />
    </g>
  )
}

/* ── râtelier fourni : lances en faisceau, casque pendu, boucliers appuyés ─ */
function RatelierArmes({ x, y, n }: { x: number; y: number; n: number }) {
  const lances = [-5.6, -2.6, 0.4, 3.4]
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-8.4,0.8 L8.4,0.8 L15.2,5.2 L-0.6,5.2 Z" fill={PAL.ombrePortee} opacity={0.2} filter="url(#a-flou1)" />
      <AOBase rx={10} ry={2.4} />
      {/* montants : ouest au soleil, est dans l'ombre */}
      <rect x={-8.4} y={-11.6} width={2.1} height={12} fill={PAL.boisMi} />
      <rect x={-8.4} y={-11.6} width={0.8} height={12} fill={PAL.boisLit} />
      <rect x={6.3} y={-11.6} width={2.1} height={12} fill={PAL.boisOmbre} />
      <rect x={6.3} y={-11.6} width={0.6} height={12} fill={PAL.boisMi} opacity={0.8} />
      {/* lisse haute chevillée */}
      <rect x={-9.4} y={-11.2} width={18.8} height={1.7} fill={PAL.boisMi} />
      <rect x={-9.4} y={-11.2} width={18.8} height={0.55} fill={PAL.boisLit} />
      <rect x={-9.4} y={-9.7} width={18.8} height={0.5} fill={PAL.boisOmbre} opacity={0.7} />
      <circle cx={-7.4} cy={-10.4} r={0.5} fill={PAL.boisOmbre} />
      <circle cx={7.4} cy={-10.4} r={0.5} fill={PAL.boisOmbre} />
      {/* lances : fûts deux tons, fers à deux facettes, talons alignés au sol */}
      {lances.map((lx, i) => (
        <g key={i}>
          <line x1={lx + 2.2} y1={1.4} x2={lx - 0.8} y2={-14} stroke={i % 2 ? CU.mi : CU.ombre} strokeWidth={1.2} />
          <line x1={lx + 1.6} y1={-1.6} x2={lx - 0.6} y2={-13.2} stroke={CU.lit} strokeWidth={0.45} opacity={0.9} />
          <path d={`M${lx - 1.5},${-13.8} L${lx - 0.85},${-17.4} L${lx - 0.8},${-13.95} Z`} fill={i % 2 ? FE.lit : BR.spec} />
          <path d={`M${lx - 0.8},${-13.95} L${lx - 0.85},${-17.4} L${lx - 0.1},${-13.8} Z`} fill={i % 2 ? FE.ombre : BR.mi} />
        </g>
      ))}
      {/* casque de rechange pendu à la lisse */}
      <path d="M2.6,-9.2 C2.4,-11.5 3.5,-12.6 4.8,-12.6 C6.1,-12.6 7.1,-11.5 6.9,-9.2 Z" fill={BR.mi} />
      <path d="M2.6,-9.2 C2.4,-11.5 3.5,-12.6 4.8,-12.6 C5.1,-12.6 5.4,-12.5 5.6,-12.4 L5.3,-9.2 Z" fill={BR.clair} />
      <path d="M3.3,-11.5 Q4.1,-12.2 4.9,-12.1" stroke={BR.spec} strokeWidth={0.6} fill="none" />
      <path d="M2.6,-9.2 L6.9,-9.2" stroke={BR.creux} strokeWidth={0.55} opacity={0.8} />
      {/* bouclier appuyé contre le montant ouest */}
      <BouclierRond x={-7.8} y={2} r={3.5} tilt={-13} fond={n >= 3 ? '#3a5470' : '#8c6b3f'} motif={n >= 3 ? 'gamma' : 'aucun'} />
    </g>
  )
}

/* ── rang de boucliers appuyés sur une lisse basse ──────────────────────── */
function RangBoucliers({ x, y, n }: { x: number; y: number; n: number }) {
  const decos: { fond: string; motif: 'aucun' | 'cercles' | 'gamma' | 'rais'; r: number }[] =
    n >= 3
      ? [
          { fond: '#9c4d3a', motif: 'gamma', r: 4 },
          { fond: '#3a5470', motif: 'rais', r: 3.7 },
          { fond: '#8c6b3f', motif: 'cercles', r: 4.1 },
        ]
      : [
          { fond: '#8c6b3f', motif: 'aucun', r: 3.8 },
          { fond: '#7c5f38', motif: 'aucun', r: 4 },
        ]
  const larg = (decos.length - 1) * 8 + 4
  return (
    <g transform={`translate(${x},${y})`}>
      {/* lisse basse, piquets chevillés : les boucliers s'y adossent */}
      <line x1={-4} y1={-4.2} x2={larg} y2={-4.2} stroke={PAL.boisMi} strokeWidth={1.5} />
      <line x1={-4} y1={-4.8} x2={larg} y2={-4.8} stroke={PAL.boisLit} strokeWidth={0.5} opacity={0.8} />
      <line x1={-3.4} y1={0.6} x2={-3.4} y2={-5.4} stroke={PAL.boisOmbre} strokeWidth={1.6} />
      <line x1={larg - 0.6} y1={0.6} x2={larg - 0.6} y2={-5.4} stroke={PAL.boisOmbre} strokeWidth={1.6} />
      {decos.map((d, i) => (
        <BouclierRond key={i} x={i * 8} y={0} r={d.r} tilt={i % 2 ? 9 : -10} fond={d.fond} motif={d.motif} />
      ))}
    </g>
  )
}

/* ── panoplie de bronze : cuirasse musclée et casque à crinière (niv. 3+) ── */
function Panoplie({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-2,0.6 L2,0.6 L10.4,4.8 L5.2,5.2 Z" fill={PAL.ombrePortee} opacity={0.21} filter="url(#a-flou1)" />
      <AOBase rx={5.2} ry={1.6} />
      <g transform={flip ? 'scale(-1,1)' : undefined}>
        {/* mât + traverse */}
        <rect x={-0.95} y={-14} width={1.9} height={14.2} fill={PAL.boisMi} />
        <rect x={-0.95} y={-14} width={0.7} height={14.2} fill={PAL.boisLit} />
        <rect x={-5.8} y={-10.9} width={11.6} height={1.5} fill={PAL.boisMi} />
        <rect x={-5.8} y={-10.9} width={11.6} height={0.5} fill={PAL.boisLit} />
        {/* cuirasse musclée : moitié NW claire, spéculaire vertical */}
        <path d="M-3.9,-4 L-4.5,-10.2 Q0,-11.9 4.5,-10.2 L3.9,-4 Q0,-2.4 -3.9,-4 Z" fill={BR.mi} />
        <path d="M-3.9,-4 L-4.5,-10.2 Q-1.9,-11.2 -0.4,-11.1 L-0.2,-3.4 Q-2.1,-3.1 -3.9,-4 Z" fill={BR.clair} />
        <path d="M-3,-10.3 Q-2.5,-7.4 -2.9,-4.5" stroke={BR.spec} strokeWidth={1} opacity={0.9} fill="none" />
        <path d="M-2,-8.8 Q0,-8 2,-8.8 M-1.6,-6.5 Q0,-5.8 1.6,-6.5 M-0.1,-8.4 L-0.1,-4.7" stroke={BR.creux} strokeWidth={0.55} opacity={0.8} fill="none" />
        <path d="M3.9,-4 L4.5,-10.2" stroke={BR.creux} strokeWidth={0.85} opacity={0.85} />
        {/* ptéruges de cuir sous la cuirasse */}
        <path d="M-3.1,-3.7 l-0.3,2.1 M-1.7,-3.2 l-0.2,2.2 M0,-3 l0,2.2 M1.7,-3.2 l0.2,2.2 M3.1,-3.7 l0.3,2.1" stroke="#7a5a35" strokeWidth={1.05} />
        {/* casque à crinière écarlate */}
        <path d="M-2.4,-13.8 C-2.6,-16.4 -1.2,-17.9 0.1,-17.9 C1.6,-17.9 2.7,-16.4 2.5,-13.8 Z" fill={BR.clair} />
        <path d="M-2.4,-13.8 C-2.6,-16.4 -1.2,-17.9 0.1,-17.9 C0.4,-17.9 0.7,-17.8 1,-17.6 L0.7,-13.8 Z" fill={BR.spec} />
        <path d="M-0.6,-13.8 l0.5,1.7 l1.4,0 l0.4,-1.7 Z" fill={BR.creux} />
        <path d="M-0.2,-17.8 C1.2,-20.3 3.9,-20.5 5.6,-18.4 C3.7,-18.8 1.9,-18.2 0.8,-17.1 Z" fill="#9c4d3a" />
        <path d="M0.6,-18 C1.9,-19.4 3.5,-19.8 4.8,-19" stroke="#743428" strokeWidth={0.5} fill="none" opacity={0.8} />
        {/* lance de parade appuyée */}
        <line x1={6.8} y1={1.4} x2={3.5} y2={-16.2} stroke={CU.ombre} strokeWidth={1.15} />
        <line x1={6.2} y1={-1.6} x2={3.7} y2={-15.2} stroke={CU.lit} strokeWidth={0.45} />
        <path d="M2.85,-16 L3.4,-19.4 L3.5,-16.05 Z" fill={BR.spec} />
        <path d="M3.5,-16.05 L3.4,-19.4 L4.15,-16 Z" fill={BR.mi} />
      </g>
      <BouclierRond x={flip ? 5 : -5} y={1.2} r={3.9} tilt={flip ? 13 : -13} fond="#9c4d3a" motif="gamma" />
    </g>
  )
}

/* ── faisceau de lances en cône (niv. 1) ────────────────────────────────── */
function Faisceau({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-2.4,0.6 L2.4,0.6 L7.4,3 L1.4,3.2 Z" fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou1)" />
      <AOBase rx={4} ry={1.2} />
      <ellipse cx={0} cy={0.2} rx={2.8} ry={0.95} fill="#8f7647" opacity={0.7} />
      <line x1={-2.6} y1={0.4} x2={-0.8} y2={-13.6} stroke={CU.mi} strokeWidth={1.15} />
      <line x1={0.4} y1={0.9} x2={0.1} y2={-14.2} stroke={CU.ombre} strokeWidth={1.15} />
      <line x1={2.8} y1={0.1} x2={1} y2={-13.4} stroke={CU.lit} strokeWidth={1.15} />
      {/* fers au-dessus de la ligature */}
      <path d="M-0.05,-14 L0.75,-17.6 L0.85,-13.9 Z" fill={FE.lit} />
      <path d="M0.85,-13.9 L0.75,-17.6 L1.55,-13.75 Z" fill={FE.ombre} />
      <path d="M-1.55,-13.4 L-0.85,-16.8 L-0.6,-13.3 Z" fill={BR.spec} />
      <path d="M-0.6,-13.3 L-0.85,-16.8 L0.05,-13.2 Z" fill={BR.mi} />
      {/* ligature de cuir haute : les hampes forment un faisceau serré */}
      <path d="M-1.2,-9.8 Q0.2,-9.1 1.7,-10" stroke="#4f3a1c" strokeWidth={1.4} fill="none" />
      <path d="M-1.2,-10.5 Q0.2,-9.8 1.7,-10.7" stroke={CU.lit} strokeWidth={0.45} fill="none" opacity={0.7} />
    </g>
  )
}

/* ── coffre d'armes de campagne : bois cerclé de fer, casque posé dessus ── */
function CoffreArmes({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-5,0.4 L5,0.4 L9.6,2.8 L-0.8,2.8 Z" fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou1)" />
      <AOBase rx={6} ry={1.8} />
      {/* retour est, face sud, couvercle bombé éclairé */}
      <path d="M5,0.2 L7.4,-1 L7.4,-5.4 L5,-4.2 Z" fill="url(#a-bois-o)" />
      <rect x={-5} y={-4.2} width={10} height={4.4} fill="url(#a-bois-l)" />
      <path d="M-5,-4.2 C-4.4,-6 -3,-6.6 0,-6.6 C3,-6.6 4.4,-6 5,-4.2 Z" fill={PAL.boisLit} />
      <path d="M0,-6.6 C3,-6.6 4.4,-6 5,-4.2 L7.4,-5.4 C6.6,-6.6 4.6,-7.2 2.2,-7.2 Z" fill={PAL.boisMi} />
      <path d="M-2.6,-4.2 L-2.6,0.2 M2.6,-4.2 L2.6,0.2" stroke="#5c5346" strokeWidth={0.9} opacity={0.85} />
      <path d="M-2.2,-4.2 L-2.2,0.2" stroke="#8a8074" strokeWidth={0.4} opacity={0.6} />
      <rect x={-0.9} y={-3.4} width={1.8} height={1.6} fill={BR.mi} />
      <rect x={-0.9} y={-3.4} width={1.8} height={0.5} fill={BR.spec} />
    </g>
  )
}

/* ── tente de campagne (niv. 1) : toile 4 valeurs, haubans, fanion ──────── */
function TenteCamp({ x, y, s = 1, fanion = true }: { x: number; y: number; s?: number; fanion?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <AOBase rx={16} ry={4.4} cy={1.5} />
      <OmbreVolume w={27} h={14} y={0.5} o={0.15} />
      {/* pans arrière : gauche au soleil, droit dans l'ombre - faîte long */}
      <path d="M-13.5,0 L0,-14 L0,-22 L-13.5,-8.4 Z" fill="#e4d3a8" />
      <path d="M13.5,0 L0,-14 L0,-22 L13.5,-8.4 Z" fill="#94804f" />
      <line x1={0} y1={-14} x2={0} y2={-22} stroke="#f6ecd2" strokeWidth={1.3} />
      {/* face sud : deux panneaux de toile, le gauche plus proche du soleil */}
      <path d="M-13.5,0 L0,-14 L0,0 Z" fill="#d2be8d" />
      <path d="M13.5,0 L0,-14 L0,0 Z" fill="#b5a071" />
      {/* coutures rayonnantes + creux de toile */}
      <path d="M-7,0 L-0.4,-13.2 M7,0 L0.4,-13.2" stroke="#a08a59" strokeWidth={0.6} opacity={0.7} />
      <path d="M-10.4,0 q1.4,-4.4 4,-7.6 M10.4,0 q-1.4,-4.4 -4,-7.6" stroke="#c6b184" strokeWidth={0.5} opacity={0.55} fill="none" />
      <path d="M-13.5,0 L0,-14" stroke="#f4e8c4" strokeWidth={1.2} opacity={0.9} />
      <path d="M13.5,0 L0,-14" stroke="#846f42" strokeWidth={1.2} opacity={0.9} />
      {/* ourlet lesté au sol, contact franc */}
      <path d="M-13.5,0 Q-6,1.4 0,0 Q6,1.4 13.5,0 L13.5,-1 Q6,0.4 0,-1 Q-6,0.4 -13.5,-1 Z" fill="#8a7549" opacity={0.65} />
      {/* ouverture : pénombre dedans, un pan roulé et attaché */}
      <path d="M-3.6,0 L0,-7.4 L3.6,0 Z" fill="#332616" />
      <path d="M0,-7.4 L3.6,0 L5.8,0 Z" fill="#c6b184" />
      <path d="M-3.6,0 C-5.2,-1.6 -5,-4.4 -3.2,-5.6 L-2,-3.2 L-2.2,0 Z" fill="#e2d0a2" />
      <path d="M-4.4,-3.4 q1.6,-0.6 2.6,0.2" stroke="#846f42" strokeWidth={0.6} fill="none" />
      {/* haubans et piquets */}
      <line x1={-13.5} y1={0} x2={-18.4} y2={2.6} stroke="#8a6a40" strokeWidth={0.8} />
      <line x1={13.5} y1={0} x2={18.4} y2={2.6} stroke="#8a6a40" strokeWidth={0.8} />
      <line x1={-18.4} y1={1.4} x2={-18.4} y2={3.2} stroke="#4f3a1c" strokeWidth={1.2} />
      <line x1={18.4} y1={1.4} x2={18.4} y2={3.2} stroke="#4f3a1c" strokeWidth={1.2} />
      {/* fanion du camp au faîte */}
      {fanion && (
        <g>
          <line x1={0} y1={-14} x2={0} y2={-20.6} stroke="#5f462d" strokeWidth={1.1} />
          <path d="M0,-20.6 L6.4,-19.1 L0,-17.4 Z" fill="#9c4d3a" />
          <path d="M0,-20.6 L2.6,-20 L2.6,-18 L0,-17.4 Z" fill="#743428" opacity={0.6} />
        </g>
      )}
    </g>
  )
}

/* ── bannière flottante SMIL : deux états d'ondulation ──────────────────── */
function BanniereFlot({ x, y, h = 14, s = 1, c = '#9c4d3a', cFonce = '#743428' }: { x: number; y: number; h?: number; s?: number; c?: string; cFonce?: string }) {
  const d1 = 'M0,0 C3.5,-0.9 7,0.6 10.6,-0.5 L10,5.4 C6.8,6.3 3.6,4.9 0,5.8 Z'
  const d2 = 'M0,0 C3.5,0.8 7,-0.7 10.6,0.6 L10,6.2 C6.8,5.2 3.6,6.6 0,5.8 Z'
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={0} x2={0} y2={-h} stroke="#5f462d" strokeWidth={2.3} />
      <line x1={-0.7} y1={-1} x2={-0.7} y2={-h + 0.5} stroke={PAL.boisLit} strokeWidth={0.7} opacity={0.9} />
      <circle cx={0} cy={-h - 1} r={1.2} fill={BR.clair} />
      <circle cx={-0.35} cy={-h - 1.3} r={0.55} fill={BR.spec} />
      <g transform={`translate(0.4,${-h + 0.8}) scale(${s})`}>
        {/* traverse de hampe */}
        <line x1={-0.4} y1={-0.8} x2={9.6} y2={-0.8} stroke="#5f462d" strokeWidth={0.9} />
        <path fill={c}>
          <animate attributeName="d" values={`${d1};${d2};${d1}`} dur="1.7s" repeatCount="indefinite" />
        </path>
        {/* étoffe modelée : creux d'ondulation sombres, crête éclairée */}
        <path d="M0,0 L2.6,0.35 L2.5,5.5 L0,5.8 Z" fill={cFonce} opacity={0.5} />
        <path d="M2.6,0.35 C3.6,0.6 4.4,0.5 5.2,0.2 L5,5.3 C4.2,5.6 3.4,5.7 2.5,5.5 Z" fill="#fff2dd" opacity={0.16} />
        <path d="M5.2,0.2 C6,-0.1 6.8,-0.2 7.6,0 L7.4,5.1 C6.6,4.9 5.8,5 5,5.3 Z" fill={cFonce} opacity={0.3} />
        <path d="M9.4,0 L9.1,5 M7.8,0.05 L7.6,5.05" stroke={cFonce} strokeWidth={0.5} opacity={0.35} />
        {/* frange et pointe battue par le vent */}
        <path d="M10.4,0.2 l1.5,0.9 M10.2,2.6 l1.6,0.8 M10,5 l1.5,0.7" stroke={cFonce} strokeWidth={0.6} opacity={0.7} />
      </g>
    </g>
  )
}

/* ── mât d'enseigne planté dans un socle de pierre (niv. 3) ─────────────── */
function MatEnseigne({ x, y, h }: { x: number; y: number; h: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-3,0.2 L3,0.2 L9.6,3.6 L1.4,3.8 Z" fill={PAL.ombrePortee} opacity={0.18} filter="url(#a-flou1)" />
      <AOBase rx={5} ry={1.6} />
      {/* socle : deux blocs, dessus éclairé, retour est ombré */}
      <path d="M3.6,-0.2 L5.2,-1.2 L5.2,-4 L3.6,-3 Z" fill={PAL.pierreOmbre} />
      <rect x={-3.8} y={-3} width={7.4} height={3} fill={PAL.pierreMi} />
      <rect x={-3.8} y={-3} width={7.4} height={0.9} fill={PAL.pierreLit} />
      <rect x={-2.6} y={-4.4} width={5.2} height={1.4} fill={PAL.pierreLit} />
      <rect x={-2.6} y={-4.4} width={5.2} height={0.5} fill="#efe9d8" />
      <BanniereFlot x={0} y={-4.4} h={h} s={1.25} />
    </g>
  )
}

/* ── tour de guet cylindrique (niv. 4) : fût fruité, couronne crénelée ──── */
function TourGuet({ x, y }: { x: number; y: number }) {
  const h = 27
  const rB = 9.6 // rayon au pied
  const rT = 7.8 // rayon sous la couronne
  const rC = 9.4 // rayon de la couronne
  const yC = -h - 3.4 // dessus de la couronne
  return (
    <g transform={`translate(${x},${y})`}>
      <OmbreVolume w={18} h={h + 8} o={0.16} />
      <path d={`M${-rB},0 A${rB},2.8 0 0 0 ${rB},0 Z`} fill="#6d6349" />
      <AOBase rx={11} ry={3.2} cy={1.2} />
      {/* fût cylindrique légèrement fruité + empattement */}
      <path d={`M${-rB},0 L${-rT},${-h} L${rT},${-h} L${rB},0 Z`} fill="url(#a-cyl-pierre)" />
      <path d={`M${-rB - 1},0 L${-rB},-4.2 L${rB},-4.2 L${rB + 1},0 Z`} fill="url(#a-cyl-pierre)" />
      <path d={`M${-rB},-4.2 L${rB},-4.2`} stroke={PAL.pierreLit} strokeWidth={0.8} opacity={0.6} />
      {/* assises épousant le cylindre */}
      {[-8, -12.5, -17, -21.5, -25].map((yy) => {
        const wAt = rB - ((rB - rT) * -yy) / h
        return <path key={yy} d={`M${-wAt},${yy} Q0,${yy + 1.8} ${wAt},${yy}`} stroke={PAL.pierreJoint} strokeWidth={0.6} fill="none" opacity={0.5} />
      })}
      <path d="M-3.8,-9.8 l0,-2.4 M3.4,-14.4 l0,-2.3 M-4.6,-18.9 l0,-2.3 M2.2,-23.2 l0,-2.2" stroke={PAL.pierreJoint} strokeWidth={0.6} opacity={0.45} />
      {/* patine chaude sur le fût, puis flanc est plongé dans l'ombre */}
      <path d={`M${-rB},0 L${-rT},${-h} L${rT},${-h} L${rB},0 Z`} fill="#b39a72" opacity={0.2} />
      <path d={`M${rT - 2.4},${-h} L${rB - 2.8},0 L${rB},0 L${rT},${-h} Z`} fill={PAL.ombrePortee} opacity={0.2} />
      <path d={`M${-rB},0 L${-rT},${-h} L${-rT + 1.4},${-h} L${-rB + 1.6},0 Z`} fill="#fff6e0" opacity={0.18} />
      {/* porte basse cintrée, marche de pierre */}
      <path d="M-2.9,0 L-2.9,-5.2 A2.9,2.9 0 0 1 2.9,-5.2 L2.9,0 Z" fill={PAL.pierreMi} />
      <path d="M-2.1,0 L-2.1,-5 A2.1,2.1 0 0 1 2.1,-5 L2.1,0 Z" fill="#312416" />
      <path d="M-2.1,-5 A2.1,2.1 0 0 1 2.1,-5" stroke={PAL.pierreLit} strokeWidth={0.7} fill="none" opacity={0.8} />
      {/* meurtrières : embrasure sombre, linteau clair */}
      <rect x={-1.8} y={-16.6} width={2.7} height={5.6} rx={1.3} fill="#312416" />
      <path d="M-2,-16.8 L1.1,-16.8" stroke={PAL.pierreLit} strokeWidth={0.9} />
      <rect x={2.4} y={-22.6} width={2.2} height={4} rx={1.1} fill="#312416" opacity={0.9} />
      {/* ombre de l'encorbellement sur le fût */}
      <path d={`M${-rT},${-h} A${rT},2 0 0 0 ${rT},${-h} L${rT},${-h + 2.6} A${rT},2 0 0 1 ${-rT},${-h + 2.6} Z`} fill={PAL.ombrePortee} opacity={0.26} filter="url(#a-flou1)" />
      {/* merlons arrière (dans la masse d'ombre de la tour) */}
      {[-5.2, 0.4, 5.6].map((mx) => (
        <rect key={`b${mx}`} x={mx - 1.5} y={yC - 6} width={3} height={4.2} fill="#82775c" />
      ))}
      {/* encorbellement puis plateforme */}
      <path d={`M${-rC},${yC} L${rC},${yC} L${rT},${-h} L${-rT},${-h} Z`} fill="url(#a-cyl-pierre)" />
      <path d={`M${-rC},${yC} L${rC},${yC}`} stroke={PAL.pierreLit} strokeWidth={0.8} opacity={0.7} />
      <ellipse cx={0} cy={yC} rx={rC} ry={2.7} fill="#cfc7b3" />
      <ellipse cx={0} cy={yC - 0.3} rx={rC - 2.6} ry={1.8} fill="#867c62" />
      {/* bannière d'or de l'école de guerre, plantée au fond du chemin de ronde */}
      <BanniereFlot x={-2.4} y={yC - 1.6} h={13} s={1.35} c={PAL.or} cFonce="#a8862e" />
      {/* merlons avant : demi-teinte + arête ouest éclairée */}
      {[-7.6, -2.6, 2.6, 7.6].map((mx) => {
        const my = yC + 2.7 * Math.sqrt(Math.max(0, 1 - (mx / rC) ** 2))
        return (
          <g key={`m${mx}`}>
            <rect x={mx - 1.5} y={my - 4.4} width={3} height={4.4} fill={PAL.pierreMi} />
            <rect x={mx - 1.5} y={my - 4.4} width={1} height={4.4} fill={PAL.pierreLit} />
          </g>
        )
      })}
    </g>
  )
}

/* ── feu de camp : cercle de pierres, trépied et marmite, flamme SMIL ───── */
function FeuCamp({ x, y }: { x: number; y: number }) {
  const pierres: [number, number, string][] = [
    [-4.3, 0.2, '#b0a68e'],
    [-2.6, 1.5, '#948a72'],
    [0.1, 2, '#b0a68e'],
    [2.8, 1.6, '#9c927a'],
    [4.4, 0.3, '#b0a68e'],
  ]
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={5.8} ry={1.9} />
      <ellipse cx={0} cy={0} rx={7} ry={2.6} fill="#e8913c" opacity={0.17} filter="url(#a-flou2)" />
      <ellipse cx={0} cy={0} rx={3.3} ry={1.4} fill="#33291a" />
      <line x1={-2.7} y1={0.6} x2={2.5} y2={-1.3} stroke="#4f3a22" strokeWidth={1.4} />
      <line x1={-2.3} y1={-1.4} x2={2.7} y2={0.8} stroke="#5f462d" strokeWidth={1.4} />
      {pierres.map(([px, py, c], i) => (
        <ellipse key={i} cx={px} cy={py} rx={1.2} ry={0.8} fill={c} stroke="#d3cab7" strokeWidth={0.35} strokeOpacity={0.45} />
      ))}
      {/* langues de flamme peintes, puis le halo animé */}
      <path d="M-2.2,-0.6 C-2.6,-3.2 -1,-4.4 -0.4,-6.6 C0.4,-4.4 1.4,-3.6 1.8,-1.8 C2.2,-3 2.6,-3.6 2.6,-4.6 C3.4,-3 3.2,-1.2 2.4,-0.2 Z" fill="#d9752c" />
      <path d="M-1.2,-0.8 C-1.4,-2.6 -0.4,-3.4 0,-5.2 C0.6,-3.6 1,-2.8 1.2,-1.4 Q0,-0.2 -1.2,-0.8 Z" fill="#f0bb52" />
      {/* trépied et marmite noircie devant */}
      <Feu x={-0.2} y={-2} r={1.6} />
      <line x1={-4.4} y1={0.4} x2={-0.4} y2={-7.4} stroke={CU.ombre} strokeWidth={0.9} />
      <line x1={4.4} y1={0.4} x2={0.4} y2={-7.4} stroke={CU.mi} strokeWidth={0.9} />
      <path d="M-2.2,-4.6 C-2.6,-6.2 -2,-7 0,-7 C2,-7 2.6,-6.2 2.2,-4.6 Q0,-3.6 -2.2,-4.6 Z" fill="#3a3026" />
      <path d="M-2.2,-4.6 C-2.6,-6.2 -2,-7 0,-7 C0.4,-7 0.8,-6.9 1,-6.8 L0.8,-3.9 Q-0.8,-4 -2.2,-4.6 Z" fill="#57493a" />
      <path d="M-1.8,-6.4 Q0,-5.8 1.8,-6.4" stroke="#7a6b58" strokeWidth={0.5} fill="none" opacity={0.8} />
      <Fumee x={0.8} y={-7.6} />
    </g>
  )
}

/* ── emblème de pignon : bouclier peint sur lances croisées ─────────────── */
function Embleme({ y, or = false }: { y: number; or?: boolean }) {
  return (
    <g transform={`translate(0,${y})`}>
      <ellipse cx={0.8} cy={0.6} rx={4.4} ry={4.2} fill={PAL.ombrePortee} opacity={0.18} filter="url(#a-flou1)" />
      <path d="M-4.4,2.9 L4.4,-2.9 M-4.4,-2.9 L4.4,2.9" stroke={CU.ombre} strokeWidth={1.1} />
      <path d="M4.4,-2.9 l1.5,-1 l-0.5,1.7 Z M-4.4,-2.9 l-1.5,-1 l0.5,1.7 Z" fill={FE.mi} />
      <circle r={3.4} fill="#57422a" />
      <circle r={3} fill={or ? BR.clair : '#9c4d3a'} />
      <circle r={1.9} fill="none" stroke={or ? BR.spec : '#d3c6a4'} strokeWidth={0.6} opacity={0.85} />
      <circle r={0.8} fill={or ? BR.spec : '#d3c6a4'} />
      <path d="M-2.3,-1.5 A2.8,2.8 0 0 1 0.8,-2.7" stroke="#fff6e0" strokeWidth={0.8} fill="none" opacity={0.5} />
      <path d="M2.4,1.7 A3,3 0 0 1 -0.8,2.9" stroke={PAL.ombrePortee} strokeWidth={0.9} fill="none" opacity={0.25} />
    </g>
  )
}

/* ── planches verticales sur un pignon de bois (niv. 2) ─────────────────── */
function PlanchesPignon({ w, h, g, seed = 4 }: { w: number; h: number; g: number; seed?: number }) {
  const rnd = alea(seed)
  const seams: ReactNode[] = []
  let px = -w / 2 + 3
  while (px < w / 2 - 1.5) {
    const yTop = -h - g * (1 - Math.abs((2 * px) / w)) + 1
    seams.push(
      <g key={px.toFixed(1)}>
        <line x1={px} y1={-0.5} x2={px} y2={yTop} stroke={PAL.boisOmbre} strokeWidth={0.75} opacity={0.6} />
        <line x1={px + 0.7} y1={-0.5} x2={px + 0.7} y2={yTop} stroke={PAL.boisLit} strokeWidth={0.5} opacity={0.32} />
      </g>,
    )
    px += 3.1 + rnd() * 1.3
  }
  return <g>{seams}</g>
}

/* ── frange de chaume qui déborde du pignon (niv. 2) ────────────────────── */
function FrangeChaume({ w, h, g }: { w: number; h: number; g: number }) {
  const brins: ReactNode[] = []
  for (let i = 0; i <= 9; i++) {
    const t = i / 9
    const px = -w / 2 - 2.5 + t * (w / 2 + 2.5)
    const py = -h - g * (1 - Math.abs((2 * px) / w))
    brins.push(<path key={`l${i}`} d={`M${px},${py} l${-0.4 - (i % 3) * 0.3},${1.9 + (i % 2) * 0.9}`} stroke={i % 2 ? '#c9ab6b' : '#e0c68a'} strokeWidth={0.9} />)
    const px2 = w / 2 + 2.5 - t * (w / 2 + 2.5)
    const py2 = -h - g * (1 - Math.abs((2 * px2) / w))
    brins.push(<path key={`r${i}`} d={`M${px2},${py2} l${0.4 + (i % 3) * 0.3},${1.7 + (i % 2) * 0.9}`} stroke={i % 2 ? '#9a8149' : '#b3934f'} strokeWidth={0.9} />)
  }
  return <g>{brins}</g>
}

/* ── chaînage d'angle + soubassement de la caserne de pierre (niv. 3+) ──── */
function AppareilFacade({ w, h }: { w: number; h: number }) {
  const quoins: ReactNode[] = []
  for (let i = 0; i < 4; i++) {
    const yy = -3.4 - i * 3.1
    const large = i % 2 === 0
    quoins.push(
      <g key={i}>
        <rect x={-w / 2} y={yy} width={large ? 5.6 : 3.8} height={2.9} fill={i % 2 ? '#e2dbc7' : '#d1c9b4'} />
        <rect x={-w / 2} y={yy} width={large ? 5.6 : 3.8} height={0.7} fill="#f2ecdc" opacity={0.55} />
        <rect x={w / 2 - (large ? 5.6 : 3.8)} y={yy} width={large ? 5.6 : 3.8} height={2.9} fill={i % 2 ? '#b2a891' : '#a49a82'} />
      </g>,
    )
  }
  return (
    <g>
      {/* soubassement de pierre grise, sali par la cour : casse la valeur du mur */}
      <MurPierre x={-w / 2} y={-4.2} w={w} h={4.2} seed={11} ombre />
      <rect x={-w / 2} y={-4.2} width={w} height={4.2} fill="#6f6448" opacity={0.22} />
      <rect x={-w / 2} y={-4.8} width={w} height={1} fill={PAL.pierreLit} />
      {quoins}
      {/* patine : lavis chaud en bas de mur, mur est plus sombre */}
      <rect x={-w / 2} y={-7} width={w} height={7} fill="#b39a72" opacity={0.16} filter="url(#a-flou2)" />
      <rect x={w / 2 - 7} y={-h + 1} width={7} height={h - 1} fill={PAL.ombrePortee} opacity={0.11} filter="url(#a-flou2)" />
      {/* coulures sous les appuis de fenêtre */}
      <path d="M-13.6,-4.4 l-0.3,3.6 M-11.4,-4.4 l0.2,3 M11.4,-4.4 l-0.2,3.2 M13.6,-4.4 l0.3,3.4" stroke="#9c9078" strokeWidth={0.6} opacity={0.4} />
    </g>
  )
}

/* ── auvent de toile devant la porte (niv. 3+) ──────────────────────────── */
function Auvent({ y }: { y: number }) {
  return (
    <g transform={`translate(0,${y})`}>
      {/* ombre de l'auvent sur la façade */}
      <path d="M-8.6,0.6 L8.6,0.6 L7.4,4 L-7.4,4 Z" fill={PAL.ombrePortee} opacity={0.22} filter="url(#a-flou1)" />
      <path d="M-9.6,-1.8 L9.6,-1.8 L7.9,1.5 L-7.9,1.5 Z" fill="#8f7644" />
      <path d="M-9.6,-1.8 L9.6,-1.8 L8.9,-0.5 L-8.9,-0.5 Z" fill="#b39760" />
      <path d="M-7.9,1.5 L7.9,1.5" stroke="#6b5730" strokeWidth={0.9} opacity={0.85} />
      <path d="M-3.3,-1.8 L-2.9,1.5 M3.3,-1.8 L2.9,1.5" stroke="#7d6840" strokeWidth={0.5} opacity={0.6} />
      {/* poteaux inclinés */}
      <line x1={-7.9} y1={1.5} x2={-8.8} y2={9.6} stroke={PAL.boisMi} strokeWidth={1.5} />
      <line x1={-8.2} y1={1.5} x2={-9.1} y2={9.6} stroke={PAL.boisLit} strokeWidth={0.55} />
      <line x1={7.9} y1={1.5} x2={8.8} y2={9.6} stroke={PAL.boisOmbre} strokeWidth={1.5} />
    </g>
  )
}

/* ── bandeau peint sous l'avant-toit : marque de la caserne (niv. 3+) ───── */
function BandePeinte({ w, h, or = false }: { w: number; h: number; or?: boolean }) {
  const yB = -h + 4.6
  return (
    <g>
      <rect x={-w / 2 + 1} y={yB} width={w - 2} height={1.9} fill="#9c4d3a" opacity={0.62} />
      <rect x={-w / 2 + 1} y={yB} width={w - 2} height={0.5} fill="#c07a5c" opacity={0.5} />
      <path
        d={`M${-w / 2 + 3},${yB + 1.4} h2.4 v-1 h2.4 v1 h2.4 v-1 h2.4 v1 h2.4 v-1 h2.4 v1 h2.4 v-1 h2.4 v1 h2.4 v-1 h2.4`}
        fill="none"
        stroke={or ? BR.spec : '#d3c6a4'}
        strokeWidth={0.55}
        opacity={0.7}
      />
    </g>
  )
}

/* ── relief de chaume : cours d'épaisseur sur les deux pans (niv. 2) ────── */
function ToitChaume({ w, h, g, prof }: { w: number; h: number; g: number; prof: number }) {
  const deb = 2.5
  const cours = [0.22, 0.46, 0.7]
  return (
    <g>
      {/* pan gauche : bourrelet sombre sous chaque cours, crête éclairée */}
      {cours.map((t) => (
        <g key={`l${t}`}>
          <line x1={-w / 2 - deb} y1={-h - prof * t} x2={0} y2={-h - g - prof * t} stroke="#a3844a" strokeWidth={1.8} opacity={0.32} />
          <line x1={-w / 2 - deb} y1={-h - prof * t - 1} x2={0} y2={-h - g - prof * t - 1} stroke="#f0dda6" strokeWidth={0.8} opacity={0.45} />
        </g>
      ))}
      {cours.map((t) => (
        <g key={`r${t}`}>
          <line x1={w / 2 + deb} y1={-h - prof * t} x2={0} y2={-h - g - prof * t} stroke="#7d6636" strokeWidth={1.8} opacity={0.34} />
          <line x1={w / 2 + deb} y1={-h - prof * t - 1} x2={0} y2={-h - g - prof * t - 1} stroke="#c2a663" strokeWidth={0.8} opacity={0.35} />
        </g>
      ))}
      {/* la paille n'est pas blanchie : lavis ocre général, égout alourdi */}
      <path d={`M${-w / 2 - deb},${-h} L0,${-h - g} L0,${-h - g - prof} L${-w / 2 - deb},${-h - prof} Z`} fill="#ab7f34" opacity={0.3} />
      <path d={`M${-w / 2 - deb},${-h} L0,${-h - g} L0,${-h - g - prof * 0.3} L${-w / 2 - deb},${-h - prof * 0.3} Z`} fill="#a3844a" opacity={0.22} />
      <path d={`M${w / 2 + deb},${-h} L0,${-h - g} L0,${-h - g - prof * 0.3} L${w / 2 + deb},${-h - prof * 0.3} Z`} fill="#6b5730" opacity={0.24} />
    </g>
  )
}

/* ════════════════════════════ LA CASERNE ════════════════════════════════ */
export function Caserne({ n }: { n: number }) {
  const wB = n >= 3 ? 38 : 32
  const hB = n >= 3 ? 16 : 13
  const gB = n >= 3 ? 9 : 8

  return (
    <g>
      <SolExercice />
      {n >= 3 && (
        <g transform="translate(26,5.5)">
          <CourPavee />
        </g>
      )}
      <Buisson x={-46} y={9} s={0.85} />
      {n <= 2 && <OlivierMini x={52} y={4} s={0.95} />}
      {n === 3 && <OlivierMini x={49} y={-5} s={1} />}

      {/* corps de logis : tente → baraquement de bois → caserne de pierre */}
      {n === 1 && (
        <g>
          {/* tente de sous-officier en retrait : profondeur du camp */}
          <TenteCamp x={41} y={-7} s={0.62} fanion={false} />
          <TenteCamp x={22} y={-2} />
        </g>
      )}
      {n === 2 && (
        <g transform="translate(24,-2)">
          <Batisse3D
            w={wB}
            h={hB}
            g={gB}
            mat="bois"
            toit="chaume"
            retour={6}
            enfants={
              <>
                <PlanchesPignon w={wB} h={hB} g={gB} />
                <Porte3D w={6.5} h={9.5} />
                <Fenetre3D x={-10.5} y={-3.4} w={4.2} h={4.4} />
                {/* poteaux d'angle et sablière */}
                <rect x={-wB / 2} y={-hB} width={2} height={hB} fill={PAL.boisLit} opacity={0.7} />
                <rect x={wB / 2 - 2} y={-hB} width={2} height={hB} fill={PAL.boisOmbre} opacity={0.7} />
                <rect x={-wB / 2} y={-hB + 0.4} width={wB} height={1.5} fill={PAL.boisOmbre} opacity={0.45} />
                {/* ceinture de chevrons + ombre du sol au pied du bardage */}
                <rect x={-wB / 2} y={-7.4} width={wB} height={1.4} fill={PAL.boisOmbre} opacity={0.4} />
                <rect x={-wB / 2} y={-7.4} width={wB} height={0.45} fill={PAL.boisLit} opacity={0.35} />
                <rect x={-wB / 2} y={-2.2} width={wB} height={2.2} fill={PAL.ombrePortee} opacity={0.18} />
                <BouclierRond x={10.4} y={-6.4} r={3.2} fond="#8c6b3f" motif="cercles" mur />
              </>
            }
          />
          <ToitChaume w={wB} h={hB} g={gB} prof={9} />
          <FrangeChaume w={wB} h={hB} g={gB} />
          {/* faîtière de chaume ligotée le long de l'arête fuyante */}
          <path d={`M-1.3,${-hB - gB - 0.8} L1.3,${-hB - gB - 0.8} L1.1,${-hB - gB - 9.4} L-1.1,${-hB - gB - 9.4} Z`} fill="#c9ab6b" />
          <path d={`M-1.3,${-hB - gB - 0.8} L-0.2,${-hB - gB - 0.8} L-0.2,${-hB - gB - 9.4} L-1.1,${-hB - gB - 9.4} Z`} fill="#e0c68a" />
          <path d={`M-1.35,${-hB - gB - 3} L1.25,${-hB - gB - 3} M-1.3,${-hB - gB - 6} L1.2,${-hB - gB - 6}`} stroke="#8a7440" strokeWidth={0.7} />
        </g>
      )}
      {n >= 3 && (
        <g>
          {n >= 4 && <TourGuet x={54} y={-11} />}
          <g transform="translate(24,-4)">
            <Batisse3D
              w={wB}
              h={hB}
              g={gB}
              prof={10}
              mat="pierre"
              toit="tuiles"
              enfants={
                <>
                  <AppareilFacade w={wB} h={hB} />
                  <Porte3D w={7} h={11} />
                  <Fenetre3D x={-12.5} y={-4.6} w={4.4} h={5} />
                  <Fenetre3D x={12.5} y={-4.6} w={4.4} h={5} />
                  <BandePeinte w={wB} h={hB} or={n >= 4} />
                  <Embleme y={-hB - gB * 0.36} or={n >= 4} />
                </>
              }
            />
            {/* tuiles faîtières + auvent devant la porte */}
            {[-1.6, -4.6].map((dy) => (
              <ellipse key={dy} cx={0} cy={-hB - gB + dy} rx={1.5} ry={0.9} fill={PAL.toitArete} />
            ))}
            <Auvent y={-13.2} />
            {/* marche de seuil */}
            <path d="M-6,0 L6,0 L7.4,1.6 L-7.4,1.6 Z" fill={PAL.pierreMi} />
            <path d="M-6,0 L6,0 L6.6,0.7 L-6.6,0.7 Z" fill={PAL.pierreLit} />
          </g>
          {n === 3 && <MatEnseigne x={49} y={9} h={22} />}
          <Panoplie x={8} y={12} />
          {n >= 4 && <Panoplie x={52} y={7} flip />}
        </g>
      )}

      {/* zone d'entraînement à l'ouest - les Recrues frappent vers l'ouest */}
      <Mannequin x={-30} y={4} seed={3} armure={n >= 3} bouclier />
      <Mannequin x={-17} y={10} seed={8} armure={n >= 3} />
      <RatelierArmes x={-3} y={1} n={n} />
      {n === 1 && <Faisceau x={6} y={10} />}
      {n <= 2 && <CoffreArmes x={n === 1 ? 34 : 40} y={12} />}
      {n >= 2 && <CibleTir x={-40} y={13} />}
      {n >= 2 && <RangBoucliers x={n >= 3 ? 30 : 12} y={n >= 3 ? 16 : 15} n={n} />}
      {n >= 4 && <FeuCamp x={-7} y={17} />}
    </g>
  )
}
