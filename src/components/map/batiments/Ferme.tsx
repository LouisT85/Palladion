import type { ReactNode } from 'react'
import { AOBase, Batisse3D, Fenetre3D, OmbreVolume, PAL, Porte3D, alea } from '../art'
import { Fumee } from './primitives'

/*
 * FERME — les champs s'étendent vers l'EST (x+), loin de la mer.
 * Peint réaliste (bible docs/STYLE-ART.md) : lumière NW, ombres portées SE,
 * zéro contour noir, modelé par les valeurs.
 *  1. un champ d'orge + hutte de torchis     2. deux champs + enclos à chèvres
 *  3. grands champs dorés + grange + bœufs   4. domaine : oliveraie, moulin, greniers
 * Les Faucheurs d'Ouvriers.tsx travaillent à (34,10) et (58,-14) :
 * ces points restent DANS les parcelles.
 */

type Stade = 'jeune' | 'mur' | 'or'

/** parcelle en sillons peints : bandes ocre/or variées par sillon (alea),
 *  silhouette irrégulière, crêtes éclairées NW / creux ombrés, lèvre de
 *  terre au SE, taches d'usure floues, gerbes liées au stade or */
function Champ({ x, y, w, h, stade, seed = 1 }: { x: number; y: number; w: number; h: number; stade: Stade; seed?: number }) {
  const rnd = alea(seed * 31 + w)
  const sk = Math.min(3.5, h * 0.16)

  // gammes ordonnées du sombre au clair (marche aléatoire → voisins proches)
  const tons =
    stade === 'jeune'
      ? ['#87693f', '#8d7148', '#96784a', '#9a7c50', '#a3854f']
      : stade === 'mur'
        ? ['#ab8c3e', '#b39344', '#bc9c4b', '#c5a654', '#cfb160']
        : ['#c69b3d', '#cda642', '#d4ac48', '#ddb750', '#e6c366']
  const creux = stade === 'jeune' ? '#6b5433' : stade === 'mur' ? '#84622c' : '#8d6a2a'
  const crete = stade === 'jeune' ? '#b09265' : stade === 'mur' ? '#e3c179' : '#f2d883'

  // frontières de sillons avec jitter : silhouette organique, jamais laser
  const n = Math.max(7, Math.round(h / 2.4))
  const eL: number[] = []
  const eR: number[] = []
  const eY: number[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    eL.push(-w / 2 + sk * (1 - t) + (rnd() - 0.5) * 2.2)
    eR.push(w / 2 - sk * t + (rnd() - 0.5) * 2.2)
    eY.push(-h / 2 + h * t + (i > 0 && i < n ? (rnd() - 0.5) * 0.8 : 0))
  }

  // marche aléatoire dans la gamme : bandes voisines proches en valeur
  let iTon = Math.floor(rnd() * tons.length)
  const bandes: ReactNode[] = []
  const grooves: string[] = []
  const cretes: string[] = []
  for (let i = 0; i < n; i++) {
    iTon = Math.min(tons.length - 1, Math.max(0, iTon + (rnd() > 0.5 ? 1 : -1)))
    bandes.push(
      <path
        key={i}
        d={`M${eL[i]},${eY[i]} L${eR[i]},${eY[i]} L${eR[i + 1]},${eY[i + 1]} L${eL[i + 1]},${eY[i + 1]} Z`}
        fill={tons[iTon]}
      />,
    )
    if (i > 0) {
      const mx = (eL[i] + eR[i]) / 2
      grooves.push(`M${eL[i] + 1},${eY[i]} Q${mx},${eY[i] + 0.7} ${eR[i] - 1},${eY[i]}`)
      cretes.push(`M${eL[i] + 2},${eY[i] - 0.8} Q${mx},${eY[i] - 0.2} ${eR[i] - 2},${eY[i] - 0.8}`)
    }
  }

  // touffes d'épis débordant de la lisière sud : brins serrés, presque droits
  const touffes: string[] = []
  const nT = Math.round(w / 6)
  for (let k = 0; k < nT; k++) {
    const tx = eL[n] + 3 + (k + rnd() * 0.7) * ((w - 6) / nT)
    const ty = h / 2 + 0.3 + rnd() * 0.9
    touffes.push(`M${tx - 0.5},${ty} q-0.4,-1.6 -0.7,-2.3 M${tx},${ty} q0,-1.9 -0.1,-2.7 M${tx + 0.5},${ty} q0.4,-1.5 0.6,-2.2`)
  }
  for (let k = 0; k < 3; k++) {
    const i = 1 + Math.floor(rnd() * (n - 1))
    const tx = eR[i] + 0.3 + rnd() * 0.7
    touffes.push(`M${tx},${eY[i]} q-0.2,-1.7 -0.5,-2.4 M${tx + 0.5},${eY[i]} q0.3,-1.5 0.4,-2.1`)
  }

  // grain de la moisson : chaumes clairsemés dans les bandes
  const brinsSombres: string[] = []
  const brinsClairs: string[] = []
  if (stade !== 'jeune') {
    const nB = Math.round((w * h) / 62)
    for (let k = 0; k < nB; k++) {
      const i = Math.floor(rnd() * n)
      const bx = eL[i] + 3 + rnd() * (eR[i] - eL[i] - 6)
      const by = (eY[i] + eY[i + 1]) / 2 + (rnd() - 0.5) * 1.6
      ;(rnd() > 0.45 ? brinsSombres : brinsClairs).push(`M${bx},${by} l${rnd() * 0.8 - 0.4},-1.5`)
    }
  }

  // taches d'usure : zones plus sèches / plus grasses, floues
  const taches = [0, 1, 2].map((k) => {
    const clair = k % 2 === 0
    return {
      cx: -w * 0.32 + rnd() * w * 0.64,
      cy: -h * 0.3 + rnd() * h * 0.6,
      rx: w * (0.12 + rnd() * 0.1),
      ry: h * (0.14 + rnd() * 0.1),
      f: clair ? (stade === 'jeune' ? '#b09468' : '#f0d98e') : stade === 'jeune' ? '#5f4a2c' : '#8f6d30',
      o: clair ? 0.13 : 0.12,
    }
  })

  // gerbes liées, posées sur les chaumes (stade or)
  const gerbes =
    stade === 'or'
      ? [0, 1].map(() => ({ gx: -w * 0.28 + rnd() * w * 0.56, gy: -h * 0.22 + rnd() * h * 0.44 }))
      : []

  const hull = `M${eL[0]},${eY[0]} L${eR[0]},${eY[0]} ${eR.map((v, i) => `L${v},${eY[i]}`).join(' ')} L${eR[n]},${eY[n]} L${eL[n]},${eY[n]} ${[...eL].reverse().map((v, i) => `L${v},${eY[n - i]}`).join(' ')} Z`

  return (
    <g transform={`translate(${x},${y})`}>
      {/* ombre douce du léger relief de la parcelle, au SE seulement */}
      <path
        d={`M${eR[0] + 1.2},${eY[0] + 1.5} L${eR[n] + 1},${eY[n] + 1.2} L${eL[n] + 2},${eY[n] + 1.4}`}
        stroke={PAL.ombrePortee}
        strokeWidth={2}
        opacity={0.13}
        fill="none"
        filter="url(#a-flou1)"
      />
      {/* assise de terre retournée, à peine plus large que les bandes */}
      <path d={hull} fill="#8a6d40" stroke="#8a6d40" strokeWidth={1.6} strokeLinejoin="round" />
      {/* lèvre SE plus grasse, lèvre NW frappée de lumière */}
      <path d={`M${eR[0] + 0.8},${eY[0] + 1} L${eR[n] + 0.6},${eY[n] + 0.4} L${eL[n] + 1.5},${eY[n] + 0.7}`} stroke="#5d472a" strokeWidth={1.1} opacity={0.7} fill="none" />
      <path d={`M${eR[0] + 0.2},${eY[0] - 0.9} L${eL[0] + 0.4},${eY[0] - 0.9} L${eL[n] - 0.9},${eY[n] - 0.3}`} stroke="#b69762" strokeWidth={0.9} opacity={0.75} fill="none" />
      {bandes}
      {/* creux des sillons (ombre) puis crêtes prises par la lumière NW —
          traits rompus : de la terre travaillée, pas des joints de planches */}
      <path d={grooves.join(' ')} stroke={creux} strokeWidth={0.85} opacity={0.34} fill="none" strokeDasharray="2.6 1.6" />
      <path d={cretes.join(' ')} stroke={crete} strokeWidth={0.6} opacity={0.4} fill="none" strokeDasharray="1.9 2.3" />
      {stade === 'jeune' && (
        <>
          {/* rangs de pousses : pied sombre, pointe éclairée NW */}
          <path
            d={Array.from({ length: n }, (_, i) => `M${eL[i] + 3},${(eY[i] + eY[i + 1]) / 2 + 0.3} L${eR[i] - 3},${(eY[i] + eY[i + 1]) / 2 + 0.3}`).join(' ')}
            stroke="#5f7a3e"
            strokeWidth={1.5}
            strokeDasharray="1.5 2.6"
            fill="none"
            opacity={0.85}
          />
          <path
            d={Array.from({ length: n }, (_, i) => `M${eL[i] + 2.6},${(eY[i] + eY[i + 1]) / 2 - 0.5} L${eR[i] - 3.4},${(eY[i] + eY[i + 1]) / 2 - 0.5}`).join(' ')}
            stroke="#93ac62"
            strokeWidth={0.9}
            strokeDasharray="1.2 2.9"
            fill="none"
            opacity={0.9}
          />
        </>
      )}
      {brinsSombres.length > 0 && <path d={brinsSombres.join(' ')} stroke={stade === 'or' ? '#96742d' : '#8a6a30'} strokeWidth={0.55} opacity={0.35} fill="none" />}
      {brinsClairs.length > 0 && <path d={brinsClairs.join(' ')} stroke={stade === 'or' ? '#f0d488' : '#ddb968'} strokeWidth={0.55} opacity={0.45} fill="none" />}
      {taches.map((t, k) => (
        <ellipse key={k} cx={t.cx} cy={t.cy} rx={t.rx} ry={t.ry} fill={t.f} opacity={t.o} filter="url(#a-flou2)" />
      ))}
      {/* lumière NW, pénombre SE */}
      <ellipse cx={-w * 0.22} cy={-h * 0.22} rx={w * 0.34} ry={h * 0.32} fill="#f7e6ae" opacity={stade === 'or' ? 0.18 : 0.08} filter="url(#a-flou2)" />
      <ellipse cx={w * 0.26} cy={h * 0.24} rx={w * 0.3} ry={h * 0.28} fill={PAL.ombrePortee} opacity={0.1} filter="url(#a-flou2)" />
      {gerbes.map((g, k) => (
        <g key={k} transform={`translate(${g.gx},${g.gy})`}>
          <ellipse cx={1.2} cy={0.5} rx={3} ry={0.9} fill={PAL.ombrePortee} opacity={0.15} />
          <path d="M-2.2,0 C-2.4,-3 -1.2,-5.4 0,-5.8 C1.2,-5.4 2.4,-3 2.2,0 Q0,0.8 -2.2,0 Z" fill="#e2c876" />
          <path d="M1,-5 C1.7,-4 2.3,-2.2 2.2,0 Q1.6,0.4 1.1,0.4 C1.5,-1.8 1.4,-3.6 1,-5 Z" fill="#b3934f" />
          <path d="M-1.7,-4.4 C-2.1,-3 -2.3,-1.4 -2.2,0 L-1.4,0.2 C-1.6,-1.6 -1.6,-3.2 -1.7,-4.4 Z" fill="#f0dc94" opacity={0.9} />
          <path d="M-1.5,-3.4 L1.5,-3.4" stroke="#8a6c38" strokeWidth={0.7} />
          <path d="M-0.8,-5.4 l-0.9,-1.7 M0,-5.7 l0,-2 M0.8,-5.4 l0.9,-1.7 M-0.3,-5.6 l-0.4,-1.9 M0.4,-5.6 l0.5,-1.8" stroke="#dfc072" strokeWidth={0.55} fill="none" />
          <path d="M-1.7,-7.1 q0.9,0.7 1.7,0.4 M1.7,-7.1 q-0.7,0.6 -1.2,0.4" stroke="#a9884a" strokeWidth={0.4} fill="none" opacity={0.8} />
        </g>
      ))}
      <path d={touffes.join(' ')} stroke={stade === 'jeune' ? '#8a9c66' : '#dcb95e'} strokeWidth={0.7} fill="none" opacity={0.9} />
    </g>
  )
}

/** muret de pierres sèches : deux assises de moellons, chants éclairés NW,
 *  flanc sud dans l'ombre, ombre portée SE */
function Muret({ x1, y1, x2, y2, seed = 1 }: { x1: number; y1: number; x2: number; y2: number; seed?: number }) {
  const rnd = alea(seed * 53 + 11)
  const L = Math.hypot(x2 - x1, y2 - y1)
  const n = Math.max(6, Math.round(L / 2.5))
  const bas = ['#8a7f66', '#948a70', '#7f755e']
  const haut = ['#b3a98f', '#bcb298', '#a89e85', '#b0a58a']
  const assiseBasse: ReactNode[] = []
  const assiseHaute: ReactNode[] = []
  const lumieres: ReactNode[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const px = x1 + (x2 - x1) * t + (rnd() - 0.5) * 0.8
    const py = y1 + (y2 - y1) * t + (rnd() - 0.5) * 0.5
    const r = 1.45 + rnd() * 0.65
    assiseBasse.push(<ellipse key={`b${i}`} cx={px} cy={py - 0.9} rx={r} ry={r * 0.6} fill={bas[Math.floor(rnd() * bas.length)]} />)
    if (i % 2 === 0 || rnd() > 0.3) {
      const hx = px + (rnd() - 0.5) * 1.2
      const hr = 1.3 + rnd() * 0.6
      assiseHaute.push(<ellipse key={`h${i}`} cx={hx} cy={py - 2.2} rx={hr} ry={hr * 0.62} fill={haut[Math.floor(rnd() * haut.length)]} />)
      if (rnd() > 0.4) lumieres.push(<ellipse key={`l${i}`} cx={hx - 0.4} cy={py - 2.6} rx={hr * 0.48} ry={hr * 0.24} fill="#cfc6ac" opacity={0.75} />)
    }
  }
  return (
    <g>
      <line x1={x1 + 1.8} y1={y1 + 1.4} x2={x2 + 1.8} y2={y2 + 1.4} stroke={PAL.ombrePortee} strokeWidth={2.6} opacity={0.16} filter="url(#a-flou1)" />
      {/* semelle sombre : pied du muret dans son ombre */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6b604b" strokeWidth={2.6} strokeLinecap="round" />
      {assiseBasse}
      {assiseHaute}
      {lumieres}
    </g>
  )
}

/** l'épouvantail — le gardien immuable des champs */
function Epouvantail({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={2} cy={0.7} rx={4.2} ry={1.2} fill={PAL.ombrePortee} opacity={0.14} />
      <line x1={0} y1={0} x2={0} y2={-13} stroke="#7a5a35" strokeWidth={1.6} />
      <line x1={-5.5} y1={-9.5} x2={5.5} y2={-9.5} stroke="#8a6a40" strokeWidth={1.3} />
      {/* tunique qui pend, flanc est dans l'ombre */}
      <path d="M-3,-9.5 L-1.4,-4.2 L1.6,-4.2 L3,-9.5 Z" fill="#b3906b" />
      <path d="M1.2,-9.5 L3,-9.5 L1.6,-4.2 L0.5,-4.2 Z" fill="#8f7050" />
      {/* tête de paille + chapeau */}
      <circle cx={0} cy={-14.6} r={2.3} fill="#d8bd6e" />
      <path d="M1.2,-16.4 A2.3,2.3 0 0 1 2.1,-13.5" stroke="#a98c4e" strokeWidth={0.9} fill="none" />
      <path d="M-3.4,-15.9 L3.4,-15.9 L0,-18.8 Z" fill="#a9834a" />
      <path d="M-3.4,-15.9 L0,-18.8 L-0.7,-15.9 Z" fill="#c9a45f" />
      {/* corneille posée sur le bras */}
      <path d="M3.8,-8.6 q0.8,-1.7 2,-1.1 q1,0.5 0.4,1.2 l1.7,0.4 q-2,1 -3.4,0.4 q-0.9,-0.3 -0.7,-0.9 Z" fill="#3a3733" />
    </g>
  )
}

/** hutte de torchis à colombage, toit de chaume ; appentis au niveau 2 */
function Hutte({ n }: { n: number }) {
  return (
    <Batisse3D
      w={26}
      h={12}
      g={7}
      prof={8}
      mat="stuc"
      toit="chaume"
      retour={6}
      enfants={
        <>
          {/* teinte torchis sur l'enduit */}
          <path d="M-13,0 L-13,-12 L0,-19 L13,-12 L13,0 Z" fill="#c39a63" opacity={0.28} />
          {/* colombage : poteaux d'angle + rampants sous le chaume */}
          <path d="M-11.3,-0.4 V-10.9 M11.3,-0.4 V-10.9 M-12.6,-11.6 L0,-18.3 L12.6,-11.6" stroke={PAL.boisMi} strokeWidth={1.3} fill="none" opacity={0.9} />
          {n >= 2 && (
            <g>
              {/* appentis adossé au flanc est, pénombre dessous */}
              <path d="M13,0 L13,-7.4 L20.5,-3.4 L20.5,0 Z" fill="#6b533a" opacity={0.5} />
              <path d="M20.2,-3.6 V0.5" stroke={PAL.boisOmbre} strokeWidth={1.2} />
              <path d="M12.4,-9.8 L21.2,-5.2 L21.2,-3.2 L12.4,-7.6 Z" fill="url(#a-chaume-o)" />
              <path d="M12.4,-9.8 L21.2,-5.2" stroke="#c9ab68" strokeWidth={0.8} opacity={0.9} />
              <Sac x={17} y={0.6} s={0.8} />
            </g>
          )}
          <Porte3D w={6} h={9} x={3.5} />
          <Fenetre3D x={-6.5} y={-4} w={3.6} h={3.8} />
        </>
      }
    />
  )
}

/** corps de ferme en pierre, tuiles (niveaux 3–4) */
function FermePierre({ n }: { n: number }) {
  return (
    <Batisse3D
      w={34}
      h={16}
      g={9}
      prof={10}
      mat="pierre"
      toit="tuiles"
      enfants={
        <>
          <path d="M-16.5,-4.5 H16.5 M-16.5,-8.8 H16.5 M-16.5,-13 H16.5" stroke={PAL.pierreJoint} strokeWidth={0.5} opacity={0.28} fill="none" />
          <Porte3D w={7} h={11} x={-6} />
          <Fenetre3D x={8} y={-5} volets />
          {n >= 4 && <Fenetre3D x={8} y={-12} w={4} h={4.4} />}
        </>
      }
    />
  )
}

/** grange de bois : grande porte charretière, fenil garni de foin */
function Grange({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <Batisse3D
        w={30}
        h={14}
        g={8}
        prof={9}
        mat="bois"
        toit="chaume"
        retour={6}
        enfants={
          <>
            {/* planches verticales de la façade, joints dans la teinte sombre */}
            <path d="M-11.8,-0.3 V-11.6 M-10,-0.3 V-12.6 M11.8,-0.3 V-11.6 M10,-0.3 V-12.6" stroke="#5f462d" strokeWidth={0.6} opacity={0.5} fill="none" />
            <path d="M-11,-0.3 V-12 M10.9,-0.3 V-12.1" stroke="#b3906b" strokeWidth={0.5} opacity={0.45} fill="none" />
            {/* porte charretière cintrée, vantail entrouvert */}
            <path d="M-9,0 L-9,-10.4 Q0,-13.4 9,-10.4 L9,0 Z" fill={PAL.boisOmbre} />
            <path d="M-9,-10.4 Q0,-13.4 9,-10.4 L9,-9.6 Q0,-12.5 -9,-9.6 Z" fill="#8f7048" />
            <path d="M-7.6,0 L-7.6,-9.7 Q0,-12.3 7.6,-9.7 L7.6,0 Z" fill="#332614" />
            <path d="M1.2,0 L1.2,-10.7 L7.6,-9.7 L7.6,0 Z" fill="#75583a" />
            <path d="M3.3,-10.4 V-0.2 M5.5,-10 V-0.2" stroke="#5f462d" strokeWidth={0.7} opacity={0.8} fill="none" />
            <path d="M2,-10.6 V-0.2" stroke="#8f7048" strokeWidth={0.5} opacity={0.8} fill="none" />
            {/* foin qui déborde du seuil, deux valeurs */}
            <path d="M-6.2,0 q2,-2.6 5,-2.2 q3.2,0.4 4.2,2.2 Z" fill="#d3b264" />
            <path d="M-6.2,0 q1.6,-2.1 3.8,-2.2 q-1.6,1 -2.2,2.2 Z" fill="#e6c87e" />
            {/* fenil dans le pignon */}
            <rect x={-2.6} y={-19} width={5.2} height={4.2} fill="#3a2b18" />
            <path d="M-2.6,-15.2 q2.6,-2 5.2,-0.2 l0,0.4 l-5.2,0 Z" fill="#d3b264" />
            {/* poulie du fenil */}
            <path d="M0,-19.6 l0,1.2" stroke="#4f3d28" strokeWidth={0.7} />
          </>
        }
      />
    </g>
  )
}

/** moulin-tour : fût conique de pierre, calotte de chaume, ailes qui tournent */
function Moulin({ x, y }: { x: number; y: number }) {
  const H = 26
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={11} ry={3.2} />
      <OmbreVolume w={17} h={H + 8} o={0.16} />
      {/* fût conique appareillé */}
      <path d={`M-9,0 C-8.2,-9 -7.4,-18 -6.2,${-H} L6.2,${-H} C7.4,-18 8.2,-9 9,0 Z`} fill="url(#a-cyl-pierre)" />
      <path d="M-8.3,-7 Q0,-5.4 8.3,-7 M-7.6,-14 Q0,-12.6 7.6,-14 M-7,-20.5 Q0,-19.4 7,-20.5" stroke={PAL.pierreJoint} strokeWidth={0.5} fill="none" opacity={0.35} />
      <Porte3D w={5.5} h={8.5} />
      <rect x={-1.5} y={-20.4} width={3} height={3.6} rx={0.6} fill="#3c2d1a" />
      {/* calotte de chaume : flanc ouest éclairé */}
      <path d={`M-7.4,${-H} C-3,${-H + 2} 3,${-H + 2} 7.4,${-H} L0.5,${-H - 10} Z`} fill="#8a6f3c" />
      <path d={`M-7.4,${-H} C-4.6,${-H + 1.4} -1.6,${-H + 1.9} 0.8,${-H + 1.8} L0.5,${-H - 10} Z`} fill="#c4a55d" />
      <path d={`M-7.4,${-H} L0.5,${-H - 10}`} stroke="#e2c98c" strokeWidth={0.9} opacity={0.9} />
      {/* ailes : rotation lente autour du moyeu */}
      <g transform={`translate(1,${-H - 2})`}>
        <g>
          <animateTransform attributeName="transform" type="rotate" values="0;360" dur="22s" repeatCount="indefinite" />
          {[45, 135, 225, 315].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <line x1={0} y1={-2} x2={0} y2={-16.5} stroke="#6e5233" strokeWidth={1.1} />
              <path d="M0.7,-4.2 L4.4,-5.6 L4.4,-14 L0.7,-15.8 Z" fill="#eae1c8" opacity={0.95} />
              <path d="M0.7,-7.4 L4.4,-8.3 M0.7,-10.6 L4.4,-11.2 M0.7,-13.6 L4.4,-13.9" stroke="#b9a97f" strokeWidth={0.45} opacity={0.8} fill="none" />
            </g>
          ))}
        </g>
        <circle r={1.7} fill="#4f3d28" />
        <circle cx={-0.5} cy={-0.5} r={0.7} fill="#95744c" />
      </g>
    </g>
  )
}

/** grenier sur pilotis : plateforme de bois, corps chaulé, toit de chaume */
function Grenier({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <AOBase rx={8} ry={2.4} />
      <OmbreVolume w={11} h={12} o={0.13} />
      <path d="M-4.4,0.3 V-3.8 M4.4,0.3 V-3.8 M6.5,-1.6 V-4.9" stroke={PAL.boisOmbre} strokeWidth={1.4} fill="none" />
      <path d="M-6,-3.8 L6,-3.8 L8.2,-5 L-3.8,-5 Z" fill={PAL.boisMi} />
      <path d="M-6,-3.8 L6,-3.8 L6,-4.4 L-6,-4.4 Z" fill={PAL.boisLit} />
      <g transform="translate(0.4,-5)">
        <path d="M5,0 L7.4,-1.2 L7.4,-6.1 L5,-5 Z" fill="url(#a-stuc-o)" />
        <path d="M-5,0 L-5,-5 L0,-8 L5,-5 L5,0 Z" fill="url(#a-stuc-l)" />
        <rect x={-1.3} y={-4.7} width={2.6} height={2.9} fill="#4a3a24" />
        <path d="M-6.2,-5 L0,-8 L0,-11 L-6.2,-8 Z" fill="url(#a-chaume-l)" />
        <path d="M6.2,-5 L0,-8 L0,-11 L6.2,-8 Z" fill="url(#a-chaume-o)" />
        <line x1={0} y1={-8} x2={0} y2={-11} stroke="#ecd9a0" strokeWidth={1} />
      </g>
    </g>
  )
}

/** olivier noueux : tronc torsadé deux tons, frondaison sauge argentée */
function Olivier({ x, y, s = 1, seed = 5 }: { x: number; y: number; s?: number; seed?: number }) {
  const rnd = alea(seed * 17 + 3)
  const dx = (rnd() - 0.5) * 2
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={4.5} cy={1.2} rx={8.5} ry={2.4} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou1)" />
      {/* tronc court et noueux, torsade claire côté lumière */}
      <path d="M-2,0.6 C-2.6,-2.6 -2.9,-5.6 -1.3,-8.8 L1,-8.8 C1.8,-5.6 1.4,-2.6 2.2,0.6 Q0,1.5 -2,0.6 Z" fill="#7a5f3c" />
      <path d="M0.7,-0.2 C0.9,-3.4 0.7,-6.2 0.5,-8.4 L1,-8.8 C1.8,-5.6 1.4,-2.6 2.2,0.6 Q1.2,1 0.7,-0.2 Z" fill="#5c4526" />
      <path d="M-1.2,-0.4 C-1.6,-3.2 -1.1,-6 -0.4,-8.2" stroke="#9c7d4f" strokeWidth={0.7} fill="none" opacity={0.85} />
      {/* frondaison sauge : ombre propre basse, demi-teinte, éclat argenté NW */}
      <ellipse cx={1.8 + dx} cy={-10.4} rx={7.6} ry={4.8} fill="#5c6b48" />
      <ellipse cx={-0.8 + dx} cy={-12} rx={6.4} ry={4} fill="#71815a" />
      <ellipse cx={-2.6 + dx} cy={-13.6} rx={4.1} ry={2.6} fill="#8c9d70" />
      <ellipse cx={3 + dx} cy={-12.8} rx={2.5} ry={1.6} fill="#84956a" opacity={0.9} />
      <ellipse cx={-3.8 + dx} cy={-14.4} rx={2} ry={1.2} fill="#a7b98a" opacity={0.9} />
      <path d={`M${-4.8 + dx},-11.4 q1.4,0.7 2.6,0.3 M${1.2 + dx},-14 q1.2,0.5 2.2,0.1`} stroke="#b9c99b" strokeWidth={0.5} fill="none" opacity={0.7} />
    </g>
  )
}

/** chèvre modelée en 2 valeurs, sans contour */
function Chevre({ x, y, c = '#e6dfcd', flip = false }: { x: number; y: number; c?: string; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`}>
      <ellipse cx={1.2} cy={0.9} rx={5.2} ry={1.4} fill={PAL.ombrePortee} opacity={0.13} />
      <path d="M-3.2,-1.8 V0.8 M-1.6,-1.6 V0.9 M2,-1.6 V0.9 M3.4,-1.8 V0.8" stroke="#8a7a5e" strokeWidth={1} fill="none" />
      <ellipse cx={0} cy={-3.7} rx={4.5} ry={2.7} fill={c} />
      <path d="M-3.9,-2.4 C-2,-1 2.4,-1 4.2,-2.6 C2.6,-1.1 -2.2,-1 -3.9,-2.4 Z" fill="#b0a488" />
      <path d="M-4.3,-4.6 C-2.6,-6.2 1,-6.4 3,-5.6 C0.6,-6 -2.4,-5.6 -4.3,-4.6 Z" fill="#f4efdf" />
      <circle cx={4.7} cy={-5.5} r={1.8} fill={c} />
      <path d="M5.6,-7 q1.3,-1.3 0.6,-2.6" stroke="#9a8a68" strokeWidth={0.8} fill="none" />
      <path d="M3.2,-5.9 l-1.5,0.7" stroke="#b0a488" strokeWidth={0.9} fill="none" />
    </g>
  )
}

/** bœuf de labour : masse brune, dos éclairé, ventre ombré, cornes en croissant */
function Boeuf({ x, y, flip = false, robe = '#7d6248', dos = '#9a7d5c' }: { x: number; y: number; flip?: boolean; robe?: string; dos?: string }) {
  return (
    <g transform={`translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`}>
      <ellipse cx={1.5} cy={1} rx={7.4} ry={2} fill={PAL.ombrePortee} opacity={0.14} />
      <path d="M-4.4,-2.2 V1 M-2.4,-2 V1.1 M3,-2 V1.1 M4.8,-2.2 V1" stroke="#4a3826" strokeWidth={1.3} fill="none" />
      <ellipse cx={0} cy={-4.8} rx={6.6} ry={3.7} fill={robe} />
      <path d="M-6.2,-5.8 C-4,-8.4 4,-8.4 6.2,-5.8 C4,-7.5 -4,-7.5 -6.2,-5.8 Z" fill={dos} />
      <path d="M-5.8,-3 C-3,-1.1 3.4,-1.1 6,-3.4 C3.6,-1.9 -3,-1.9 -5.8,-3 Z" fill="#5c4732" opacity={0.9} />
      {/* queue */}
      <path d="M-6.4,-5.4 q-1.2,2.2 -0.7,4.6" stroke="#5c4732" strokeWidth={0.8} fill="none" />
      {/* tête baissée : chanfrein, mufle sombre, oreille, cornes fines */}
      <path d="M4.6,-7.2 C6.6,-7.8 8.2,-7 8.6,-5.4 C8.9,-4.1 8.3,-3 7.2,-2.8 C5.8,-2.6 4.4,-3.8 4.2,-5.4 Z" fill="#6b533c" />
      <path d="M4.8,-7 C6.2,-7.5 7.4,-7.1 8,-6.2 C6.9,-6.6 5.7,-6.4 4.8,-5.8 Z" fill="#8a6d50" />
      <ellipse cx={7.9} cy={-3.4} rx={1.3} ry={0.9} fill="#4a3826" />
      <ellipse cx={4.3} cy={-7} rx={1} ry={0.55} fill="#5c4732" transform="rotate(-24 4.3 -7)" />
      <path d="M5.6,-7.6 C5.2,-9 5.8,-10.2 7,-10.6 C6.4,-9.4 6.4,-8.4 6.6,-7.7 Z" fill="#cbbd9c" />
      <path d="M7.6,-7.4 C8.4,-8.6 9.6,-9 10.6,-8.6 C9.6,-8 8.8,-7.2 8.4,-6.5 Z" fill="#b8a988" />
    </g>
  )
}

/** meule conique : masse ombrée, flanc NW éclairé, brins peignés */
function Meule({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2.6} cy={0.9} rx={7.2} ry={2} fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou1)" />
      <path d="M-6.8,0 C-6.4,-4.6 -3.4,-9.6 0,-11 C3.4,-9.6 6.4,-4.6 6.8,0 C2.4,1.5 -2.4,1.5 -6.8,0 Z" fill="#b08e4c" />
      <path d="M-6.8,0 C-6.4,-4.6 -3.4,-9.6 -0.2,-11 C-0.7,-7 -1.1,-3 -1.7,0.9 C-3.4,0.9 -5.2,0.6 -6.8,0 Z" fill="#ddbf78" />
      <path d="M-4.6,-1.4 q0.8,-3.4 2.6,-5.8 M1.4,-1 q1,-3 2.5,-5" stroke="#8f7038" strokeWidth={0.6} opacity={0.55} fill="none" />
      <circle cx={-0.1} cy={-10.8} r={1} fill="#c9a95e" />
    </g>
  )
}

/** sac de grain : toile claire, flanc est ombré, col noué */
function Sac({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={0.9} cy={0.4} rx={3.6} ry={1} fill={PAL.ombrePortee} opacity={0.14} />
      <path d="M-3,0 C-3.6,-3.4 -2.4,-5.6 0,-5.6 C2.4,-5.6 3.6,-3.4 3,0 Z" fill="#cfb98d" />
      <path d="M1,-5.4 C2.6,-4.6 3.4,-2.6 3,0 L0.7,0 C1.5,-2 1.5,-4 1,-5.4 Z" fill="#a8905f" />
      <path d="M-1.3,-5.3 L1.3,-5.3" stroke="#8a744c" strokeWidth={1} />
    </g>
  )
}

/** charrette : caisse de planches, roues cerclées, brancards vers l'est */
function Charrette({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={3} cy={0.6} rx={11} ry={2.4} fill={PAL.ombrePortee} opacity={0.14} filter="url(#a-flou1)" />
      {/* caisse : rebord éclairé, flanc en demi-teinte */}
      <path d="M-9,-4 L9,-4 L7.4,-9.4 L-7.4,-9.4 Z" fill={PAL.boisMi} />
      <path d="M-7.4,-9.4 L7.4,-9.4 L7.1,-8.5 L-7.1,-8.5 Z" fill="#c9a874" />
      <path d="M-8.6,-5.2 L8.6,-5.2" stroke={PAL.boisOmbre} strokeWidth={0.7} opacity={0.7} />
      <path d="M9,-5 L14.6,-3" stroke={PAL.boisOmbre} strokeWidth={1.3} />
      {/* roues : jante sombre, moyeu, rais discrets */}
      <circle cx={-4} cy={-2.5} r={3.6} fill="#4f3d28" />
      <circle cx={-4} cy={-2.5} r={2.6} fill="#7c603c" />
      <path d="M-4,-5.1 V0.1 M-6.6,-2.5 H-1.4" stroke="#a8845d" strokeWidth={0.6} opacity={0.8} fill="none" />
      <circle cx={-4} cy={-2.5} r={0.9} fill="#3a2b18" />
      <circle cx={5} cy={-2.5} r={3.6} fill="#4f3d28" />
      <circle cx={5} cy={-2.5} r={2.6} fill="#7c603c" />
      <path d="M5,-5.1 V0.1 M2.4,-2.5 H7.6" stroke="#a8845d" strokeWidth={0.6} opacity={0.8} fill="none" />
      <circle cx={5} cy={-2.5} r={0.9} fill="#3a2b18" />
      <Sac x={-3} y={-8.4} s={0.95} />
      <Sac x={2.4} y={-9} s={0.85} />
    </g>
  )
}

/** enclos à chèvres : terre piétinée, piquets et lisses de bois */
function EnclosChevres() {
  const pts: [number, number][] = [
    [-38, 6],
    [-40, 14],
    [-26, 18],
    [-16, 12],
    [-22, 5],
  ]
  return (
    <g>
      <ellipse cx={-28} cy={12} rx={14} ry={6} fill="#b39a6e" opacity={0.65} />
      <ellipse cx={-30} cy={11} rx={8} ry={3.4} fill="#a68c60" opacity={0.5} />
      {pts.map(([px, py], i) => {
        const nx = pts[i + 1]
        return (
          <g key={i}>
            <line x1={px + 0.8} y1={py + 0.6} x2={px + 1.6} y2={py + 0.9} stroke={PAL.ombrePortee} strokeWidth={1.2} opacity={0.15} />
            <line x1={px} y1={py - 6} x2={px} y2={py} stroke="#7a5a35" strokeWidth={1.8} />
            <line x1={px - 0.5} y1={py - 6} x2={px - 0.5} y2={py - 2} stroke="#a8845d" strokeWidth={0.7} opacity={0.9} />
            {nx && <line x1={px} y1={py - 4.6} x2={nx[0]} y2={nx[1] - 4.6} stroke="#8a6a40" strokeWidth={1.1} />}
            {nx && <line x1={px} y1={py - 1.9} x2={nx[0]} y2={nx[1] - 1.9} stroke="#7c5e38" strokeWidth={1.1} />}
          </g>
        )
      })}
      <Chevre x={-30} y={10} />
      <Chevre x={-23} y={13.5} c="#cfc7b5" flip />
    </g>
  )
}

/** poule qui picore */
function Poule({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`}>
      <ellipse cx={0.4} cy={0.3} rx={2} ry={0.6} fill={PAL.ombrePortee} opacity={0.12} />
      <path d="M-1.9,-1.3 C-2.5,-3 -0.8,-4 0.5,-3.6 C1.8,-3.2 2.2,-1.7 1.2,-0.7 Q-0.2,-0.1 -1.9,-1.3 Z" fill="#e0d6bd" />
      <path d="M-1.9,-1.3 Q-2.6,-2.6 -1.6,-3.6 Q-2,-2.4 -1.2,-1 Z" fill="#b3a684" />
      <circle cx={1.5} cy={-4} r={0.9} fill="#e0d6bd" />
      <path d="M2.3,-4 l1,0.4 l-1,0.4 Z" fill="#d9a33c" />
      <circle cx={1.5} cy={-4.9} r={0.4} fill="#c05a40" />
      <path d="M-0.6,-0.6 V0.4 M0.6,-0.6 V0.4" stroke="#c98d3f" strokeWidth={0.5} fill="none" />
    </g>
  )
}

/** tas de bois près de la hutte */
function TasBois({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={1.5} cy={0.6} rx={6} ry={1.6} fill={PAL.ombrePortee} opacity={0.13} />
      <rect x={-5.5} y={-2.6} width={11} height={2.6} rx={1.3} fill={PAL.boisMi} />
      <rect x={-4.5} y={-5} width={9} height={2.6} rx={1.3} fill={PAL.boisLit} />
      <circle cx={-4.8} cy={-1.3} r={1.1} fill="#c9a874" />
      <circle cx={-3.8} cy={-3.7} r={1.1} fill="#d9b98a" />
    </g>
  )
}

export function Ferme({ n }: { n: number }) {
  return (
    <g>
      {/* cour de terre battue, usée en deux tons */}
      <ellipse cx={-4} cy={3} rx={36} ry={12.5} fill="#b9a878" opacity={0.72} />
      <ellipse cx={-8} cy={1.5} rx={23} ry={8} fill="#c8b88a" opacity={0.85} />
      {/* chemin des champs : bande usée à deux tons + ornières de charroi */}
      <path d="M2,2.6 C12,3.6 22,4.4 33,4.6 C22,7.8 11,7.4 0,6.4 Z" fill="#cdb684" opacity={0.6} />
      <path d="M4,3.8 C13,4.6 21,5 30,5.2 C21,6.6 12,6.4 3,5.6 Z" fill="#dbc794" opacity={0.55} />
      <path d="M4,4 C13,4.8 21,5 29,5.1 M4,6 C13,6.4 20,6.3 28,6" stroke="#a68c5c" strokeWidth={0.6} opacity={0.5} fill="none" />

      {/* parcelles — vers l'est */}
      <Champ x={44} y={4} w={54} h={22} stade={n >= 3 ? 'or' : n === 2 ? 'mur' : 'jeune'} seed={3} />
      {n >= 2 && <Champ x={56} y={-21} w={44} h={17} stade={n >= 3 ? 'or' : 'mur'} seed={8} />}
      {n >= 4 && <Champ x={95} y={-2} w={36} h={22} stade="or" seed={13} />}

      {/* murets de pierres sèches entre les parcelles */}
      {n >= 3 && <Muret x1={27} y1={-10} x2={73} y2={-11.5} seed={4} />}
      {n >= 3 && <Muret x1={14.5} y1={-7} x2={12} y2={11} seed={9} />}
      {n >= 4 && <Muret x1={77} y1={-13.5} x2={74.5} y2={6} seed={14} />}

      <Epouvantail x={40} y={-4} />

      {/* le domaine : moulin et greniers */}
      {n >= 4 && <Moulin x={-55} y={-32} />}
      {n >= 4 && (
        <g>
          <Grenier x={16} y={-30} />
          <Grenier x={28} y={-26} s={0.9} />
        </g>
      )}

      {n >= 3 && <Grange x={-34} y={-14} />}

      {/* corps de ferme */}
      <g transform="translate(-6,0)">
        {n < 3 ? <Hutte n={n} /> : <FermePierre n={n} />}
        {n >= 3 && (
          <g>
            {/* souche de cheminée chaulée sur le faîtage, chapeau terracotta */}
            <rect x={-1.6} y={-30.6} width={3.2} height={4.4} fill="url(#a-stuc-o)" />
            <rect x={-1.6} y={-30.6} width={1.1} height={4.4} fill="#e8dcc0" opacity={0.85} />
            <rect x={-2.1} y={-31.6} width={4.2} height={1.2} fill={PAL.toitMi} />
            <rect x={-2.1} y={-31.6} width={4.2} height={0.5} fill={PAL.toitArete} opacity={0.9} />
            <Fumee x={0} y={-31.5} />
          </g>
        )}
      </g>

      {n >= 2 && <EnclosChevres />}

      {/* bétail, meules, charroi */}
      <Poule x={3} y={9} />
      <Poule x={-2} y={12} flip />
      {n === 1 && <TasBois x={10} y={13} />}
      {n === 1 && <Sac x={-14} y={7} s={0.9} />}
      {n === 2 && <Meule x={-8} y={16} s={0.85} />}
      {n >= 3 && (
        <g>
          <Boeuf x={12} y={16} flip />
          <Boeuf x={30} y={22} robe="#6b5140" dos="#8a6d52" />
          <Meule x={-12} y={15} />
          <Meule x={-3} y={18} s={0.8} />
          <Charrette x={-26} y={27} s={0.9} />
        </g>
      )}

      {/* oliveraie en quinconce */}
      {n >= 4 && (
        <g>
          <Olivier x={58} y={20} seed={21} />
          <Olivier x={74} y={27} s={0.92} seed={22} />
          <Olivier x={90} y={20} s={1.05} seed={23} />
          <Olivier x={106} y={27} s={0.9} seed={24} />
          <Olivier x={120} y={21} s={0.85} seed={25} />
        </g>
      )}
      {n >= 4 && (
        <g>
          <Sac x={6} y={10} />
          <Sac x={11} y={12} s={0.9} />
        </g>
      )}

      {/* herbes folles autour de la cour */}
      <path d="M-28,9 q3,1.8 6,0 M-2,12 q3,1.8 6,0 M-20,-6 q2.6,1.6 5.2,0" stroke="#8f8a55" strokeWidth={1} fill="none" opacity={0.6} />
    </g>
  )
}
