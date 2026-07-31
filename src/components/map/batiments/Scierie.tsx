import { Fragment, type ReactNode } from 'react'
import { AOBase, Batisse3D, MurPierre, OmbreVolume, PAL, alea } from '../art'

/*
 * SCIERIE — peint réaliste (bible docs/STYLE-ART.md) : lumière NW, ombres
 * portées SE, zéro contour noir, modelé par les valeurs.
 *  1. clairière du bûcheron : souche, rondins, fagots
 *  2. deux appentis, scie de long, charrette
 *  3. atelier de sciage, séchoir à planches, treuil de halage
 *  4. grand chantier : halle, grue de levage, bassin de flottage et radeaux
 * Les bûcherons d'Ouvriers.tsx frappent à (24,4) et (-8,13) : la zone de
 * coupe reste dégagée, un billot entaillé est posé sous chaque hache.
 */

// ── nuances locales, autour de la palette PAL ──────────────────────────────
const ECORCE_O = '#3f2f1c' // creux d'écorce, contacts entre rondins
const ECORCE_L = '#c09c68' // arête d'écorce au soleil
const SCIE_L = '#eddaa6' // bois de sciage frais, plein soleil
const SCIE_M = '#d4b981'
const SCIE_O = '#a37e4d'
const FER_L = '#e2d8c1' // fer chaud : pas de bleu dans l'acier
const FER_M = '#a09581'
const FER_O = '#5f5445'
const CORDE = '#d3bc92'
const VERT_O = '#3e5231'
const VERT_M = '#54703f'
const VERT_L = '#6d8a4f'
const VERT_XL = '#95ae6c'
const EAU_L = '#9fb4a2'

/** défs locales — préfixe sc- */
function DefsScierie() {
  return (
    <defs>
      {/* écorce d'un rondin couché : cylindre éclairé par le dessus */}
      <linearGradient id="sc-ecorce" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c09c68" />
        <stop offset="20%" stopColor="#9b7a4f" />
        <stop offset="55%" stopColor="#6d5335" />
        <stop offset="100%" stopColor="#372918" />
      </linearGradient>
      {/* bois de bout : cœur clair décentré au NW, liseré d'écorce sombre */}
      <radialGradient id="sc-coupe" cx="0.38" cy="0.34" r="0.78">
        <stop offset="0%" stopColor="#f4e4ba" />
        <stop offset="52%" stopColor="#ddbf88" />
        <stop offset="86%" stopColor="#a97e49" />
        <stop offset="100%" stopColor="#5e452b" />
      </radialGradient>
      {/* poteau vertical : lumière à gauche */}
      <linearGradient id="sc-poteau" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#b08b60" />
        <stop offset="42%" stopColor="#7c5d3b" />
        <stop offset="100%" stopColor="#4c3723" />
      </linearGradient>
      {/* planche sciée : dessus au soleil, chant dans l'ombre */}
      <linearGradient id="sc-planche" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={SCIE_L} />
        <stop offset="55%" stopColor={SCIE_M} />
        <stop offset="100%" stopColor={SCIE_O} />
      </linearGradient>
      {/* pente de chaume : faîtage au soleil, égout dans la demi-teinte */}
      <linearGradient id="sc-chaume-p" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#8f7139" />
        <stop offset="45%" stopColor="#ae8f4f" />
        <stop offset="100%" stopColor="#c6a45c" />
      </linearGradient>
      {/* lame de fer : biseau clair à gauche, dos sombre */}
      <linearGradient id="sc-lame" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={FER_L} />
        <stop offset="42%" stopColor={FER_M} />
        <stop offset="100%" stopColor={FER_O} />
      </linearGradient>
      {/* bassin de flottage : fond sombre au loin, reflet du ciel devant */}
      <linearGradient id="sc-eau" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#495c50" />
        <stop offset="45%" stopColor="#5e7365" />
        <stop offset="100%" stopColor="#7d9081" />
      </linearGradient>
    </defs>
  )
}

/** cernes en spirale claire (déterministe) — sy < 1 pour une coupe en ellipse */
function spirale(cx: number, cy: number, r: number, sy = 1, tours = 3.1): string {
  let d = `M${cx.toFixed(1)},${cy.toFixed(1)}`
  const n = 20
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const a = t * tours * Math.PI * 2
    d += ` L${(cx + Math.cos(a) * t * r).toFixed(1)},${(cy + Math.sin(a) * t * r * sy).toFixed(1)}`
  }
  return d
}

/** bois de bout : aubier clair, cernes en spirale, fentes de séchage, liseré d'écorce */
function Coupe({ cx, cy, r, sy = 1, seed = 3 }: { cx: number; cy: number; r: number; sy?: number; seed?: number }) {
  const rnd = alea(seed * 31 + 7)
  const detail = r >= 2.1
  let fentes = ''
  if (detail) {
    for (let i = 0; i < 3; i++) {
      const a = rnd() * Math.PI * 2
      const t = 0.44 + rnd() * 0.45
      fentes += ` M${(cx + Math.cos(a) * r * 0.14).toFixed(1)},${(cy + Math.sin(a) * r * 0.14 * sy).toFixed(1)} L${(cx + Math.cos(a) * r * t).toFixed(1)},${(cy + Math.sin(a) * r * t * sy).toFixed(1)}`
    }
  }
  // 1 nœud pour les petites sections, 3 pour les grosses : le budget SVG compte
  return (
    <>
      <ellipse cx={cx} cy={cy} rx={r} ry={r * sy} fill="url(#sc-coupe)" />
      {detail && (
        <path d={spirale(cx - r * 0.08, cy - r * 0.1 * sy, r * 0.62, sy)} fill="none" stroke="#f6e8c0" strokeWidth={0.45} opacity={0.5} />
      )}
      {detail && <path d={fentes.trim()} stroke="#9c7442" strokeWidth={0.42} opacity={0.55} fill="none" />}
    </>
  )
}

/**
 * Rondin couché : cylindre en dégradé, stries d'écorce, sous-face au contact
 * assombrie, coupe à cernes au bout droit. Ancre : extrémité gauche.
 * `flip` renvoie la coupe à gauche (le rondin s'étend vers x-).
 */
function Rondin({
  x,
  y,
  l = 22,
  r = 3,
  rot = 0,
  flip = false,
  seed = 3,
  bout = true,
}: {
  x: number
  y: number
  l?: number
  r?: number
  rot?: number
  flip?: boolean
  seed?: number
  bout?: boolean
}) {
  const rnd = alea(seed * 13 + l)
  let stries = ''
  for (let i = 0; i < 3; i++) {
    const sx = l * (0.14 + 0.25 * i + rnd() * 0.07)
    const sy = (rnd() - 0.45) * r * 1.1
    stries += ` M${sx.toFixed(1)},${sy.toFixed(1)} q${(l * 0.08).toFixed(1)},${(0.7 - rnd() * 1.4).toFixed(1)} ${(l * 0.17).toFixed(1)},0`
  }
  return (
    <g transform={`translate(${x},${y})${rot ? ` rotate(${rot})` : ''}${flip ? ' scale(-1,1)' : ''}`}>
      <rect x={0} y={-r} width={l} height={r * 2} rx={r * 0.85} fill="url(#sc-ecorce)" />
      {/* fil de lumière NW sur le dessus du cylindre */}
      <rect x={r * 0.8} y={-r + 0.3} width={Math.max(2, l - r * 2)} height={r * 0.38} rx={r * 0.19} fill={ECORCE_L} opacity={0.45} />
      {/* stries d'écorce */}
      <path d={stries.trim()} stroke={ECORCE_O} strokeWidth={0.5} fill="none" opacity={0.4} />
      {/* bout gauche dans la pénombre — seulement sur les grosses pièces */}
      {r >= 2 && <ellipse cx={r * 0.55} cy={0} rx={r * 0.5} ry={r * 0.9} fill="#3a2b1a" opacity={0.45} />}
      {bout && <Coupe cx={l - r * 0.72} cy={0} r={r * 0.9} sy={1.05} seed={seed} />}
    </g>
  )
}

/** pile de grumes : rangs décalés, creux d'ombre au contact, chantiers et piquets */
function PileGrumes({ x, y, n = 3, l = 26, r = 3.1, seed = 5 }: { x: number; y: number; n?: number; l?: number; r?: number; seed?: number }) {
  const rnd = alea(seed)
  const rangs: ReactNode[] = []
  let creux = ''
  const pas = r * 1.6
  for (let i = 0; i < n; i++) {
    const dx = i * (1.4 + rnd() * 1.5) + (rnd() - 0.5) * 1.8
    const dy = -i * pas - r
    const ll = l - i * (2 + rnd() * 2.4)
    if (i > 0) creux += ` M${(dx + r).toFixed(1)},${(dy + r * 0.7).toFixed(1)} h${Math.max(3, ll - r * 2).toFixed(1)} v${(r * 0.85).toFixed(1)} h${(-Math.max(3, ll - r * 2)).toFixed(1)} Z`
    rangs.push(
      <Fragment key={i}>
        {/* rang aperçu derrière, plus haut et plus court : épaisseur du tas */}
        {i === 0 && n > 2 && <Rondin x={dx + 3.5} y={dy - pas * 0.52} l={ll - 5} r={r * 0.92} seed={seed + 40} />}
        <Rondin x={dx} y={dy} l={ll} r={r} seed={seed + i * 3} />
      </Fragment>,
    )
  }
  const H = n * pas + r
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={l * 0.6} ry={l * 0.16} cx={l / 2} cy={1.4} />
      <path d={`M3,1 L${l},1 L${l + H * 0.78},${1 + H * 0.32} L${8 + H * 0.78},${1 + H * 0.32} Z`} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou2)" />
      {/* piquets de retenue, plantés derrière la pile */}
      <line x1={1.5} y1={0.5} x2={-1} y2={-H - 1.5} stroke="#4a3623" strokeWidth={1.9} />
      <line x1={1.2} y1={0.2} x2={-1.1} y2={-H - 1.1} stroke="#96754c" strokeWidth={0.6} opacity={0.7} />
      <line x1={l - 3} y1={0.5} x2={l + 0.5} y2={-H - 0.5} stroke="#4a3623" strokeWidth={1.9} />
      {/* chantiers : deux traverses qui décollent la pile du sol */}
      <path
        d={`M${l * 0.16 - 1.4},-1.6 h${2.8 + r * 0.6} v2.6 h${-(2.8 + r * 0.6)} Z M${l * 0.68 - 1.4},-1.6 h${2.8 + r * 0.6} v2.6 h${-(2.8 + r * 0.6)} Z`}
        fill="#5e4529"
      />
      <path
        d={`M${l * 0.16 - 1.4},-1.6 h${2.8 + r * 0.6} v0.8 h${-(2.8 + r * 0.6)} Z M${l * 0.68 - 1.4},-1.6 h${2.8 + r * 0.6} v0.8 h${-(2.8 + r * 0.6)} Z`}
        fill="#96754c"
      />
      {/* ombre de la pile sur ses propres chantiers */}
      <rect x={2} y={-1.8} width={l - 4} height={1.6} fill={PAL.ombrePortee} opacity={0.35} filter="url(#a-flou1)" />
      {rangs}
      {/* creux d'ombre au contact entre les rangs */}
      {creux && <path d={creux.trim()} fill={ECORCE_O} opacity={0.4} filter="url(#a-flou1)" />}
    </g>
  )
}

/** souche : racines lobées, fût à écorce, coupe claire à cernes, coin ou hache */
function Souche({ x, y, r = 4, h = 4.5, hache = false, coin = false }: { x: number; y: number; r?: number; h?: number; hache?: boolean; coin?: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={r * 2.2} ry={r * 0.8} cy={0.5} />
      <path d={`M${-r + 1},0.8 L${r + 2},0.8 L${r + h + 3.5},${0.8 + h * 0.45} L${-r + 3.5},${0.8 + h * 0.45} Z`} fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou1)" />
      {/* racines : lobes éclairés à l'ouest, sombres à l'est */}
      <path d={`M${-r + 0.8},-1.2 C${-r - 1.8},-0.8 ${-r - 3.4},0.6 ${-r - 4.6},1.9 C${-r - 2.4},1.5 ${-r - 0.6},1.3 ${-r + 1.6},0.9 Z`} fill="#8f6e46" />
      <path d={`M${-r + 0.8},-1.2 C${-r - 1.8},-0.8 ${-r - 3.2},0.4 ${-r - 4.2},1.5`} stroke="#b08a58" strokeWidth={0.7} fill="none" opacity={0.7} />
      <path d={`M${r - 0.8},-1.2 C${r + 1.6},-0.7 ${r + 2.6},0.5 ${r + 3.4},1.7 C${r + 1.6},1.5 ${r + 0.4},1.3 ${r - 1.6},0.9 Z`} fill="#5b4127" />
      <path d={`M-1.2,0.4 C-2,1.3 -2.8,1.9 -3.8,2.5 C-2.2,2.3 -0.8,1.9 0.8,1.3 Z`} fill="#6a4d2d" />
      {/* fût : flanc cylindrique, base évasée */}
      <path d={`M${-r},0 C${-r - 0.6},${-h * 0.55} ${-r + 0.2},${-h * 0.8} ${-r + 0.2},${-h} L${r - 0.2},${-h} C${r - 0.2},${-h * 0.8} ${r + 0.6},${-h * 0.55} ${r},0 Q0,${r * 0.55} ${-r},0 Z`} fill="url(#sc-poteau)" />
      {/* coupe : dessus au soleil, bord d'écorce mordu */}
      <ellipse cx={0} cy={-h + 0.3} rx={r + 0.2} ry={(r + 0.2) * 0.44} fill="#7f5e39" />
      <Coupe cx={-0.2} cy={-h - 0.3} r={r * 0.95} sy={0.44} seed={r * 7} />
      {coin && (
        <g>
          {/* coin de fer fiché dans le fil du bois */}
          <path d={`M${r * 0.15},${-h - 1.4} l2.6,0.5 l-1.5,2.1 Z`} fill={FER_M} />
          <path d={`M${r * 0.15},${-h - 1.4} l2.6,0.5 l-1.1,0.15 Z`} fill={FER_L} />
        </g>
      )}
      {hache && (
        <g transform={`translate(0.4,${-h})`}>
          {/* hache plantée : manche deux tons, fer chaud, tranchant qui accroche */}
          <line x1={1.4} y1={-1.4} x2={7} y2={-10} stroke="#6b4c2a" strokeWidth={1.8} />
          <line x1={1.2} y1={-1.7} x2={6.5} y2={-9.9} stroke="#b08a58" strokeWidth={0.75} opacity={0.85} />
          <path d="M-1.4,-3.6 L3,-1.8 Q2.8,1.6 -1,1 Q-2,-1.2 -1.4,-3.6 Z" fill="#8a8171" />
          <path d="M-1.4,-3.6 L3,-1.8 L0.4,-2.2 Z" fill="#ded5c1" />
          <path d="M-1.4,-3.6 Q-2.4,-1.2 -1,1 L-0.2,0.4 Q-1.2,-1.4 -0.6,-3.3 Z" fill="#f0e9d7" />
          <path d="M1.6,-2.4 Q1.4,0.4 -0.4,0.5" stroke="#5e5545" strokeWidth={0.6} fill="none" opacity={0.7} />
        </g>
      )}
    </g>
  )
}

/** copeaux : taches claires au sol + copeaux enroulés, éclats de bois */
function Copeaux({ x, y, s = 1, seed = 11 }: { x: number; y: number; s?: number; seed?: number }) {
  const rnd = alea(seed)
  let curls = ''
  for (let i = 0; i < 6; i++) {
    const fx = (rnd() - 0.5) * 13
    const fy = (rnd() - 0.5) * 4
    if (i % 3 === 0) curls += ` M${fx.toFixed(1)},${fy.toFixed(1)} q0.9,-0.9 1.9,-0.2`
    else curls += ` M${fx.toFixed(1)},${fy.toFixed(1)} l${(1.3 + rnd()).toFixed(1)},${(rnd() * 0.6 - 0.3).toFixed(1)}`
  }
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={0.5} cy={0} rx={8} ry={2.6} fill="#cbb182" opacity={0.45} />
      <ellipse cx={-1.6} cy={-0.5} rx={4.6} ry={1.5} fill="#e2cd9a" opacity={0.5} />
      <path d={curls.trim()} stroke="#e7d5a6" strokeWidth={0.75} fill="none" opacity={0.8} strokeLinecap="round" />
    </g>
  )
}

/** monticule de sciure : masse en trois valeurs, pelle plantée */
function Sciure({ x, y, s = 1, pelle = false }: { x: number; y: number; s?: number; pelle?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <AOBase rx={11} ry={3.4} cy={0.6} o={0.8} />
      <path d="M-9.5,0.4 C-7.6,-4.6 -3.6,-7.4 0.2,-7.5 C4.4,-7.5 8.2,-4.4 10,0.4 Z" fill="#c9ad78" />
      <path d="M-9.5,0.4 C-7.6,-4.6 -3.6,-7.4 0.2,-7.5 C1.2,-5.4 -2.4,-3.2 -4.2,0.4 Z" fill="#eddcac" />
      <path d="M4.4,-5.6 C7,-3.8 8.8,-1.8 10,0.4 L4.6,0.4 Z" fill="#a7854c" />
      <path d="M-6.4,-1.6 q1.6,-1 3.2,-0.4 M2.6,-3.4 q1.4,0.6 2.2,1.8" stroke="#f6e8bd" strokeWidth={0.6} fill="none" opacity={0.7} />
      {pelle && (
        <g>
          <line x1={5.4} y1={-2.6} x2={9.6} y2={-12.6} stroke="#6b4c2a" strokeWidth={1.4} />
          <line x1={5.2} y1={-2.8} x2={9.3} y2={-12.5} stroke="#b08a58" strokeWidth={0.6} opacity={0.85} />
          <path d="M4,-1 L7.4,-4.2 L6.2,-6 L2.6,-3 Z" fill={FER_M} />
          <path d="M4,-1 L7.4,-4.2 L6.9,-4.9 L3.4,-1.8 Z" fill={FER_L} opacity={0.8} />
        </g>
      )}
    </g>
  )
}

/** bûches fendues : petit tas de quartiers, faces de fente pâles vers le soleil */
function Buches({ x, y, s = 1, seed = 4 }: { x: number; y: number; s?: number; seed?: number }) {
  const rnd = alea(seed)
  const rangs = [
    { by: -1.4, n: 3, dx: 0 },
    { by: -4.4, n: 2, dx: 1.6 },
    { by: -7.2, n: 1, dx: 3.4 },
  ]
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <AOBase rx={9.5} ry={3} cx={4.5} cy={0.6} o={0.85} />
      <path d="M0,0.6 L11,0.6 L16,2.6 L5,2.6 Z" fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou1)" />
      {rangs.map((r, i) =>
        Array.from({ length: r.n }, (_, j) => {
          const bx = r.dx + j * 2.8 + (rnd() - 0.5) * 1.1
          const by = r.by + (rnd() - 0.5) * 0.8
          const bw = 2 + rnd() * 0.7
          const bh = 3 + rnd() * 0.7
          const rot = (rnd() - 0.5) * 9
          const fendu = (i * 3 + j) % 3 !== 2
          return (
            <g key={`${i}-${j}`} transform={`rotate(${rot.toFixed(1)} ${(bx + bw / 2).toFixed(1)} ${(by + bh / 2).toFixed(1)})`}>
              {/* quartier vu en bout : écorce d'un côté, faces de fente de l'autre */}
              <path d={`M${bx},${by} l${bw},0 l0,${bh} l${-bw},0 Z`} fill="#5e4629" />
              {fendu ? (
                <>
                  <path d={`M${bx + 0.25},${by + 0.25} l${bw - 0.5},0 l${-(bw - 0.5) * 0.55},${bh - 0.5} Z`} fill={i % 2 ? '#dbc190' : '#e8d29e'} />
                  <path d={`M${bx + 0.25},${by + 0.25} l${bw - 0.5},0 l${-(bw - 0.5) * 0.3},${(bh - 0.5) * 0.28} Z`} fill="#f2e3b4" />
                  <path d={`M${bx + 0.25},${by + 0.25} l${(bw - 0.5) * 0.45},${bh - 0.5}`} stroke="#a97e4a" strokeWidth={0.35} opacity={0.6} />
                </>
              ) : (
                <>
                  <path d={`M${bx + 0.25},${by + 0.25} a${(bw - 0.5) / 2},${bh * 0.4} 0 0 1 ${bw - 0.5},0 l0,${bh - 0.5} l${-(bw - 0.5)},0 Z`} fill="#8a6a41" />
                  <path d={`M${bx + 0.4},${by + 1.1} a${(bw - 0.8) / 2},${bh * 0.3} 0 0 1 ${bw - 0.8},0`} stroke="#bb9560" strokeWidth={0.45} fill="none" opacity={0.75} />
                </>
              )}
            </g>
          )
        }),
      )}
    </g>
  )
}

/** tronc abattu : fût couché, moignons de branches ébranchées, cime encore verte */
function TroncAbattu({ x, y, l = 40, r = 3.4, rot = 0, seed = 7 }: { x: number; y: number; l?: number; r?: number; rot?: number; seed?: number }) {
  const rnd = alea(seed)
  const stubs = Array.from({ length: 4 }, (_, i) => ({
    sx: l * (0.2 + i * 0.19),
    up: rnd() > 0.45,
  }))
  return (
    <g transform={`translate(${x},${y})${rot ? ` rotate(${rot})` : ''}`}>
      <ellipse cx={l * 0.5 + 3} cy={r + 1.6} rx={l * 0.52} ry={r * 0.8} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou2)" />
      {stubs.map((s2, i) => {
        const dx = 2 + rnd() * 1.2
        const dy = 2 + rnd() * 1.2
        return (
          <Fragment key={i}>
            <path d={`M${s2.sx},${s2.up ? -r + 0.8 : r - 0.8} l${dx},${s2.up ? -dy : dy}`} stroke="#5b4127" strokeWidth={2.1} />
            <path d={`M${s2.sx},${s2.up ? -r + 0.3 : r - 1.2} l${dx * 0.85},${s2.up ? -dy * 0.85 : dy * 0.85}`} stroke="#8f6f45" strokeWidth={0.7} opacity={0.7} />
            <ellipse cx={s2.sx + dx} cy={s2.up ? -r + 0.8 - dy : r - 0.8 + dy} rx={0.8} ry={0.7} fill="#c9a875" />
          </Fragment>
        )
      })}
      <Rondin x={0} y={0} l={l} r={r} seed={seed} />
      {/* entailles de l'abattage près de la souche */}
      <path d={`M${l * 0.06},${-r * 0.2} l2.4,1.6 l-2.6,0.6 Z`} fill="#4a3521" opacity={0.85} />
      <path d={`M${l * 0.06},${-r * 0.2} l2.4,1.6 l-1,-1.6 Z`} fill="#e8cf9c" opacity={0.8} />
    </g>
  )
}

/** poutres équarries : blocs à arêtes vives, contrepoint des rondins ronds */
function Poutres({ x, y, l = 24, seed = 8 }: { x: number; y: number; l?: number; seed?: number }) {
  const rnd = alea(seed)
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={l * 0.55} ry={l * 0.14} cx={l / 2} cy={1} />
      <path d={`M2,1 L${l},1 L${l + 7},3.6 L${9},3.6 Z`} fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou2)" />
      {[0, 1].map((i) => {
        const dx = i * 2.2
        const dy = -i * 3.6
        const ll = l - i * 4 - rnd() * 1.5
        return (
          <Fragment key={i}>
            {/* face avant en demi-teinte, dessus en demi-lumière, chant est ombré */}
            <rect x={dx} y={dy - 3.4} width={ll} height={3.4} fill="#a37f4e" />
            <path d={`M${dx},${dy - 3.4} L${dx + 2.4},${dy - 4.9} L${dx + ll + 2.4},${dy - 4.9} L${dx + ll},${dy - 3.4} Z`} fill={SCIE_M} />
            <path d={`M${dx + ll},${dy - 3.4} L${dx + ll + 2.4},${dy - 4.9} L${dx + ll + 2.4},${dy - 1.6} L${dx + ll},${dy} Z`} fill="#7c5e3b" />
            {/* refends entre poutres jointives */}
            <path d={`M${dx + ll * 0.34},${dy - 3.4} v3.4 M${dx + ll * 0.68},${dy - 3.4} v3.4`} stroke={ECORCE_O} strokeWidth={0.55} opacity={0.3} />
            <path d={`M${dx + ll * 0.34 + 2.4},${dy - 4.9} l-2.4,1.5 M${dx + ll * 0.68 + 2.4},${dy - 4.9} l-2.4,1.5`} stroke={ECORCE_O} strokeWidth={0.5} opacity={0.25} />
            <rect x={dx} y={dy - 0.7} width={ll} height={0.7} fill={ECORCE_O} opacity={0.3} />
          </Fragment>
        )
      })}
    </g>
  )
}

/** chevalet : deux paires de jambes en X, traverse haute, entaille de repos */
function Chevalet({ x, y, h = 8.5 }: { x: number; y: number; h?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={2.2} cy={0.9} rx={6.4} ry={1.3} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou1)" />
      {/* paire arrière, dans l'ombre */}
      <path d={`M-3.4,-1.6 L3.6,${-h - 1.6} M3.4,-1.6 L-3.6,${-h - 1.6}`} stroke="#493523" strokeWidth={1.7} fill="none" />
      {/* paire avant, éclairée */}
      <path d={`M-4.8,0.4 L4.6,${-h} M4.8,0.4 L-4.6,${-h}`} stroke="#75583a" strokeWidth={2.1} fill="none" />
      <path d={`M-4.7,0 L4.3,${-h + 0.3} M-3.2,${-h * 0.42} L3.2,${-h * 0.44}`} stroke="#b08a58" strokeWidth={0.7} opacity={0.8} fill="none" />
    </g>
  )
}

/** scie de long : grume sur chevalets, scie à cadre dans le trait, coin de fente */
function ScieDeLong({ x, y, seed = 21 }: { x: number; y: number; seed?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <OmbreVolume w={32} h={14} o={0.13} />
      <Chevalet x={-11} y={0} />
      <Chevalet x={10} y={-0.5} />
      {/* planches débitées, dressées contre le chevalet ouest */}
      <g transform="translate(-17,1) rotate(-81)">
        <rect x={0} y={-0.9} width={14} height={1.9} fill="#a3814f" />
        <rect x={0} y={-0.9} width={14} height={0.5} fill="#c2a068" />
        <rect x={0.5} y={1} width={13} height={1.7} fill="#82633c" />
      </g>
      <Rondin x={-17} y={-9.8} l={34} r={3} seed={seed} />
      {/* trait de scie ouvert sur le dessus + coin de fer qui maintient la fente */}
      <path d="M-9,-12.2 L1.4,-12.3" stroke="#4a3521" strokeWidth={1.1} opacity={0.8} />
      <path d="M-9.6,-12.8 L-8.2,-12.6 L-8.9,-11.2 Z" fill={FER_M} />
      <path d="M-9.6,-12.8 L-8.2,-12.6 L-8.8,-12.4 Z" fill={FER_L} />
      {/* scie à cadre : châssis de bois, lame tendue par un garrot */}
      <g>
        {/* montants du cadre */}
        <rect x={-3.4} y={-24.5} width={2} height={17} fill="#8a6a41" />
        <rect x={-3.4} y={-24.5} width={0.7} height={17} fill="#b6905c" />
        <rect x={5.4} y={-24.5} width={2} height={17} fill="#6b4c2a" />
        {/* traverses haute et basse */}
        <rect x={-4} y={-25.4} width={11.4} height={2} rx={0.8} fill="#8a6a41" />
        <rect x={-4} y={-25.4} width={11.4} height={0.7} rx={0.35} fill="#b6905c" />
        <rect x={-3.8} y={-9.2} width={11} height={1.7} rx={0.7} fill="#7c5e3b" />
        {/* garrot de tension : cordage torsadé + bâtonnet */}
        <path d="M-2.6,-23.4 q4.4,-1.2 8.8,0 M-2.6,-22.4 q4.4,1.2 8.8,0" stroke={CORDE} strokeWidth={0.8} fill="none" />
        <line x1={0.6} y1={-24.4} x2={3.4} y2={-21.4} stroke="#6b4c2a" strokeWidth={1.1} />
        {/* lame tendue au milieu du cadre, plongée dans le trait */}
        <path d="M0.7,-22.6 L2.6,-22.6 L2.4,-10.4 L0.9,-10.4 Z" fill="url(#sc-lame)" />
        <path d="M0.9,-10.4 L1.2,-8.6 L1.65,-10.3 L2.1,-8.6 L2.4,-10.4 Z" fill={FER_M} />
        <path d="M0.9,-19.8 L2.5,-18.2 L2.5,-16.4 L0.9,-18 Z" fill="#f6f1e0" opacity={0.7} />
      </g>
      <Copeaux x={2} y={2} s={0.85} seed={seed + 10} />
    </g>
  )
}

/** frange d'égout du chaume : festons + brins peignés + bourrelet de faîtage */
function ChaumePeigne({ w, h, g, prof }: { w: number; h: number; g: number; prof: number }) {
  const deb = 2.5
  const A = [-w / 2 - deb, -h] as const
  const B = [0, -h - g] as const
  const C = [w / 2 + deb, -h] as const
  const N = 7
  // bord d'égout épais : un bourrelet de paille coupée, sous-face ondulée
  const bord = (P: readonly [number, number] | number[], Q: readonly [number, number] | number[], ep: number) => {
    let d = `M${P[0]},${P[1]}`
    for (let i = 1; i <= N; i++) {
      const t = i / N
      const px = P[0] + (Q[0] - P[0]) * t
      const py = P[1] + (Q[1] - P[1]) * t + ep
      const mx = P[0] + (Q[0] - P[0]) * (t - 0.5 / N)
      const my = P[1] + (Q[1] - P[1]) * (t - 0.5 / N) + ep + (i % 2 ? 1.1 : 0.5)
      d += ` Q${mx.toFixed(1)},${my.toFixed(1)} ${px.toFixed(1)},${py.toFixed(1)}`
    }
    d += ` L${Q[0]},${Q[1]} Z`
    return d
  }
  let brins = ''
  for (let i = 0; i <= N; i++) {
    const t = i / N
    // brins peignés : de l'égout vers le faîtage, dans le plan du pan
    brins += ` M${(A[0] + (B[0] - A[0]) * t).toFixed(1)},${(A[1] + (B[1] - A[1]) * t).toFixed(1)} L${(A[0] + (B[0] - A[0]) * t + 0.5).toFixed(1)},${(A[1] + (B[1] - A[1]) * t - prof * 0.55).toFixed(1)}`
    brins += ` M${(C[0] + (B[0] - C[0]) * t).toFixed(1)},${(C[1] + (B[1] - C[1]) * t).toFixed(1)} L${(C[0] + (B[0] - C[0]) * t - 0.5).toFixed(1)},${(C[1] + (B[1] - C[1]) * t - prof * 0.48).toFixed(1)}`
  }
  const panL = `M${A[0]},${A[1]} L${B[0]},${B[1]} L${B[0]},${B[1] - prof} L${A[0]},${A[1] - prof} Z`
  const panR = `M${C[0]},${C[1]} L${B[0]},${B[1]} L${B[0]},${B[1] - prof} L${C[0]},${C[1] - prof} Z`
  return (
    <g>
      {/* patine du chaume : le pan gauche reste au soleil, le droit s'enfonce */}
      <path d={panL} fill="#9c7d42" opacity={0.26} />
      <path d={panR} fill="#6f5730" opacity={0.42} />
      {/* plaques de paille plus ou moins tassées */}
      <ellipse cx={A[0] * 0.55} cy={A[1] - prof * 0.62} rx={w * 0.13} ry={prof * 0.2} fill="#d8bb74" opacity={0.3} />
      <ellipse cx={C[0] * 0.4} cy={C[1] - prof * 0.4} rx={w * 0.11} ry={prof * 0.18} fill="#4f3d20" opacity={0.18} />
      {/* brins peignés dans la pente */}
      <path d={brins.trim()} stroke="#7d6334" strokeWidth={0.55} fill="none" opacity={0.5} />
      {/* épaisseur de la paille à l'égout : bourrelet plein, sous-face ondulée */}
      <path d={bord(A, B, 2.3)} fill="#a9884b" />
      <path d={bord(C, B, 2.1)} fill="#7d6334" />
      <path d={`M${A[0]},${A[1]} L${B[0]},${B[1]}`} stroke="#dcc182" strokeWidth={0.9} opacity={0.7} />
      <path d={`M${C[0]},${C[1]} L${B[0]},${B[1]}`} stroke="#9c7d42" strokeWidth={0.8} opacity={0.7} />
      {/* bourrelet de faîtage + liens croisés */}
      <path d={`M0,${-h - g - prof + 0.4} L0,${-h - g - 0.4}`} stroke="#e6cf94" strokeWidth={2.8} strokeLinecap="round" />
      <path d={`M0,${-h - g - prof + 0.4} L0,${-h - g - 0.4}`} stroke="#f6e8bc" strokeWidth={0.9} strokeLinecap="round" opacity={0.8} />
      <path d={`M-1.9,${-h - g - prof * 0.72} L1.9,${-h - g - prof * 0.6} M-1.9,${-h - g - prof * 0.32} L1.9,${-h - g - prof * 0.2}`} stroke="#8a6c39" strokeWidth={0.8} opacity={0.85} fill="none" />
    </g>
  )
}

/** appentis : toit de chaume mono-pente sur poteaux contreventés, réserve sombre */
function Appentis({ x, y, w = 26, scieMurale = false, seed = 4 }: { x: number; y: number; w?: number; scieMurale?: boolean; seed?: number }) {
  const rnd = alea(seed)
  const hEg = -9.5 // égout avant
  const hFa = -17.5 // faîtage arrière
  const N = Math.max(5, Math.round(w / 4))
  // la paille fléchit : égout et faîtage légèrement bombés, jamais rectilignes
  const xe = (t: number) => -w / 2 - 2.5 + (w + 5) * t
  const ye = (t: number) => hEg + 0.6 * 4 * t * (1 - t)
  const xf = (t: number) => -w / 2 + 0.5 + (w - 1) * t
  const yf = (t: number) => hFa - 0.35 * 4 * t * (1 - t)
  let toit = `M${xe(0).toFixed(1)},${ye(0).toFixed(1)}`
  for (let i = 1; i <= N; i++) toit += ` L${xe(i / N).toFixed(1)},${ye(i / N).toFixed(1)}`
  for (let i = N; i >= 0; i--) toit += ` L${xf(i / N).toFixed(1)},${yf(i / N).toFixed(1)}`
  toit += ' Z'
  // bourrelet d'égout : bande pleine à sous-face ondulée
  let bord = `M${xe(0).toFixed(1)},${ye(0).toFixed(1)}`
  for (let i = 1; i <= N; i++) {
    const t = i / N
    const xm = xe(t - 0.5 / N)
    const ym = ye(t - 0.5 / N) + 2.4 + rnd() * 1.1
    bord += ` Q${xm.toFixed(1)},${ym.toFixed(1)} ${xe(t).toFixed(1)},${(ye(t) + 2).toFixed(1)}`
  }
  for (let i = N; i >= 0; i--) bord += ` L${xe(i / N).toFixed(1)},${ye(i / N).toFixed(1)}`
  bord += ' Z'
  let brins = ''
  for (let i = 0; i <= N; i++) {
    const t = i / N
    brins += ` M${xe(t).toFixed(1)},${(ye(t) - 0.4).toFixed(1)} L${xf(t).toFixed(1)},${(yf(t) + 0.6).toFixed(1)}`
  }
  // cours de bottes : courbe intermédiaire entre égout et faîtage
  const cours = (u: number) => {
    let d = `M${(xe(0) + (xf(0) - xe(0)) * u).toFixed(1)},${(ye(0) + (yf(0) - ye(0)) * u).toFixed(1)}`
    for (let i = 1; i <= N; i++) {
      const t = i / N
      d += ` L${(xe(t) + (xf(t) - xe(t)) * u).toFixed(1)},${(ye(t) + (yf(t) - ye(t)) * u).toFixed(1)}`
    }
    return d
  }
  let arete = `M${xe(0).toFixed(1)},${ye(0).toFixed(1)}`
  for (let i = 1; i <= N; i++) arete += ` L${xe(i / N).toFixed(1)},${ye(i / N).toFixed(1)}`
  let faitage = `M${xf(0).toFixed(1)},${yf(0).toFixed(1)}`
  for (let i = 1; i <= N; i++) faitage += ` L${xf(i / N).toFixed(1)},${yf(i / N).toFixed(1)}`
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={w * 0.6} ry={w * 0.17} cy={1.5} />
      <OmbreVolume w={w} h={15} o={0.15} />
      {/* fond dans la pénombre + planches de réserve qui accrochent la lumière */}
      <rect x={-w / 2 + 1} y={-10} width={w - 2} height={10.6} fill="#332615" />
      {[0, 1, 2].map((i) => (
        <Fragment key={i}>
          <rect x={-w / 2 + 2.5 + i * 0.9} y={-3 - i * 2.5} width={w - 7} height={2.2} fill="url(#sc-planche)" />
          <rect x={-w / 2 + 2.5 + i * 0.9} y={-3 - i * 2.5} width={w - 7} height={0.7} fill={SCIE_L} />
          <rect x={-w / 2 + 2.5 + i * 0.9} y={-1 - i * 2.5} width={w - 7} height={0.8} fill={ECORCE_O} opacity={0.35} />
        </Fragment>
      ))}
      <rect x={-w / 2 + 1} y={-10} width={w - 2} height={2.6} fill={PAL.ombrePortee} opacity={0.55} />
      {scieMurale && (
        <g>
          {/* passe-partout accroché sous le toit : dos épais, denture, poignées */}
          <path d={`M${-w / 2 + 4},-8.8 Q0,-6.1 ${w / 2 - 4},-8.8 L${w / 2 - 4},-6.6 Q0,-3.9 ${-w / 2 + 4},-6.6 Z`} fill="url(#sc-lame)" />
          <path d={`M${-w / 2 + 4},-6.6 Q0,-3.9 ${w / 2 - 4},-6.6`} stroke="#7a7261" strokeWidth={0.8} fill="none" />
          <path d={`M${-w / 2 + 5},-7.9 q2,0.7 4,1.2`} stroke="#f4efdd" strokeWidth={0.6} opacity={0.7} fill="none" />
          <path d={`M${-w / 2 + 4},-9.4 L${-w / 2 + 4},-6.2 M${w / 2 - 4},-9.4 L${w / 2 - 4},-6.2`} stroke="#6b4c2a" strokeWidth={1.8} />
          <path d={`M${-w / 2 + 3.4},-9.6 h1.4 M${w / 2 - 4.7},-9.6 h1.4`} stroke="#96754c" strokeWidth={1.1} />
        </g>
      )}
      {/* poteaux avant + jambes de force */}
      {[-w / 2 + 2, w / 2 - 2].map((px, i) => (
        <Fragment key={px}>
          <rect x={px - 1.2} y={-9.8} width={2.4} height={10.6} fill="url(#sc-poteau)" />
          <line x1={px - 0.8} y1={0.4} x2={px - 0.8} y2={-9.4} stroke="#bb9560" strokeWidth={0.6} opacity={0.8} />
          <line x1={px + (i ? -1 : 1) * 1} y1={-8} x2={px + (i ? -5.5 : 5.5)} y2={-9.4} stroke="#5f4629" strokeWidth={1.3} />
        </Fragment>
      ))}
      {/* toit de chaume mono-pente, paille fléchie */}
      <path d={toit} fill="url(#sc-chaume-p)" />
      {/* deux cours de bottes + peignage des brins */}
      <path d={cours(0.35)} stroke="#8a6c39" strokeWidth={1.1} fill="none" opacity={0.4} />
      <path d={cours(0.68)} stroke="#8a6c39" strokeWidth={0.9} fill="none" opacity={0.32} />
      <path d={brins.trim()} stroke={PAL.chaumeOmbre} strokeWidth={0.5} fill="none" opacity={0.34} />
      {/* le versant est s'enfonce dans l'ombre */}
      <path
        d={`M${xe(0.62).toFixed(1)},${ye(0.62).toFixed(1)} L${xe(1).toFixed(1)},${ye(1).toFixed(1)} L${xf(1).toFixed(1)},${yf(1).toFixed(1)} L${xf(0.62).toFixed(1)},${yf(0.62).toFixed(1)} Z`}
        fill="#5c4726"
        opacity={0.14}
      />
      <path d={bord} fill="#a9884b" />
      <path d={arete} stroke="#dcc182" strokeWidth={0.9} opacity={0.7} fill="none" />
      <path d={`M${w / 2 + 2.5},${hEg} L${w / 2 - 0.5},${hFa}`} stroke="#7d6334" strokeWidth={1.5} opacity={0.75} />
      <path d={faitage} stroke="#e6cf94" strokeWidth={1.7} fill="none" />
    </g>
  )
}

/** séchoir : lits de planches fraîches sur chantiers, claire-voie et ombres */
function SechoirPlanches({ x, y, w = 26, n = 4, seed = 6 }: { x: number; y: number; w?: number; n?: number; seed?: number }) {
  const rnd = alea(seed)
  const H = 3.4 + n * 3
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={w * 0.58} ry={w * 0.15} cy={1} />
      <path d={`M${-w / 2 + 2},1 L${w / 2 - 1},1 L${w / 2 - 1 + H * 0.7},${1 + H * 0.3} L${-w / 2 + 6 + H * 0.7},${1 + H * 0.3} Z`} fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou2)" />
      {/* montants */}
      {[-w / 2 + 3, w / 2 - 3].map((px) => (
        <Fragment key={px}>
          <rect x={px - 1.1} y={-H - 1} width={2.2} height={H + 2} fill="url(#sc-poteau)" />
          <line x1={px - 0.7} y1={0.6} x2={px - 0.7} y2={-H - 0.6} stroke="#bb9560" strokeWidth={0.55} opacity={0.8} />
        </Fragment>
      ))}
      {/* lits de planches, bouts irréguliers */}
      {Array.from({ length: n }, (_, i) => {
        const dl = rnd() * 2.5
        const dr = rnd() * 2
        const py = -3.2 - i * 3
        return (
          <Fragment key={i}>
            <rect x={-w / 2 + 2.5 + dl} y={py} width={w - 5 - dl - dr} height={2.1} fill="url(#sc-planche)" />
            <rect x={-w / 2 + 2.5 + dl} y={py} width={w - 5 - dl - dr} height={0.65} fill={SCIE_L} />
            <rect x={-w / 2 + 3 + dl} y={py + 2.1} width={w - 6 - dl - dr} height={0.9} fill={ECORCE_O} opacity={0.4} />
          </Fragment>
        )
      })}
      {/* traverses de calage visibles aux bouts */}
      <rect x={-w / 2 + 1.6} y={-H + 0.4} width={2.6} height={H - 1} fill="#6a4f31" opacity={0.75} />
    </g>
  )
}

/** charrette à grumes : plateau, roues à rayons, chargement arrimé */
function CharretteGrumes({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2.5} cy={0.9} rx={12.5} ry={2.3} fill={PAL.ombrePortee} opacity={0.17} filter="url(#a-flou1)" />
      {/* brancards */}
      <line x1={9.5} y1={-5} x2={16.5} y2={-2.6} stroke="#6b4c2a" strokeWidth={1.5} />
      <line x1={9.6} y1={-5.4} x2={16.4} y2={-3.1} stroke="#b08a58" strokeWidth={0.6} opacity={0.8} />
      {/* plateau + ranchers */}
      <path d="M-10.5,-4.2 L10.5,-4.2 L9,-7.4 L-9,-7.4 Z" fill="#7d5e3b" />
      <path d="M-9,-7.4 L9,-7.4 L8.6,-6.5 L-8.6,-6.5 Z" fill="#b08a58" />
      <path d="M-8.6,-7.2 L-9.6,-13.4 M8.4,-7.2 L9.4,-13.2" stroke="#5f4629" strokeWidth={1.3} />
      {/* grumes chargées + liens */}
      <Rondin x={-8.5} y={-9.4} l={17} r={2.2} seed={7} />
      <Rondin x={-7} y={-12.6} l={14} r={2} seed={9} />
      <path d="M-4.5,-14.8 L-3.5,-4.4 M4,-14.6 L5,-4.4" stroke={CORDE} strokeWidth={0.85} opacity={0.9} />
      {/* roues : jante sombre, rayons clairs, moyeu, cerclage */}
      {[-5, 5.5].map((wx) => (
        <Fragment key={wx}>
          <circle cx={wx} cy={-2.8} r={3.8} fill="#6f5334" stroke="#453221" strokeWidth={1.2} />
          <path d={`M${wx},-6.2 L${wx},0.6 M${wx - 3},-4.5 L${wx + 3},-1.1 M${wx + 3},-4.5 L${wx - 3},-1.1`} stroke="#b08a58" strokeWidth={0.6} opacity={0.9} />
          <circle cx={wx} cy={-2.8} r={1} fill="#3b2b1a" />
        </Fragment>
      ))}
    </g>
  )
}

/** pin : étages de branches festonnés, trois valeurs, lisière NW éclairée */
function Pin({ x, y, s = 1, seed = 2 }: { x: number; y: number; s?: number; seed?: number }) {
  const rnd = alea(seed)
  const etages = [
    { b: -5.5, w: 8.6, hh: 10, c: VERT_O },
    { b: -10.4, w: 7, hh: 9, c: VERT_M },
    { b: -15.2, w: 5.4, hh: 8, c: VERT_L },
    { b: -19.8, w: 3.5, hh: 6.6, c: VERT_XL },
  ]
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={6} cy={1.3} rx={8.5} ry={2.2} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou2)" />
      <path d="M-1.3,0 L-0.8,-8 L0.8,-8 L1.3,0 Q0,1 -1.3,0 Z" fill="#6b5031" />
      <path d="M0.4,-1 L0.7,-7.6 L1.3,0 Q0.7,0.6 0.4,-1 Z" fill="#48331e" />
      {etages.map((e, i) => {
        const j = 0.6 + rnd() * 0.7
        return (
          <path
            key={i}
            d={`M${-e.w},${e.b} Q${-e.w * 0.52},${e.b + 1.8 * j} ${-e.w * 0.2},${e.b + 0.3} Q0,${e.b + 2.1 * j} ${e.w * 0.24},${e.b + 0.3} Q${e.w * 0.58},${e.b + 1.7 * j} ${e.w},${e.b} L${e.w * 0.1},${e.b - e.hh} Z`}
            fill={e.c}
          />
        )
      })}
      {/* lisières éclairées au NW et creux d'ombre à l'est, d'un seul trait */}
      <path
        d={etages.map((e) => `M${-e.w + 0.6},${e.b - 0.5} L${e.w * 0.06},${e.b - e.hh + 0.8}`).join(' ')}
        stroke={VERT_XL}
        strokeWidth={1.1}
        opacity={0.8}
        fill="none"
      />
      <path
        d={etages.map((e) => `M${e.w - 0.4},${e.b - 0.3} L${e.w * 0.12},${e.b - e.hh + 1.2}`).join(' ')}
        stroke="#2f4126"
        strokeWidth={0.9}
        opacity={0.45}
        fill="none"
      />
      <path d="M0.2,-26.4 L-0.5,-21.6 L1,-21.6 Z" fill={VERT_XL} />
    </g>
  )
}

/** broussaille basse : fougères en éventail, deux verts */
function Broussaille({ x, y, s = 1, seed = 3 }: { x: number; y: number; s?: number; seed?: number }) {
  const rnd = alea(seed)
  let f1 = ''
  let f2 = ''
  for (let i = 0; i < 5; i++) {
    const a = -1.4 + i * 0.55 + (rnd() - 0.5) * 0.2
    const L = 4 + rnd() * 2.6
    const ex = Math.cos(a - Math.PI / 2) * L
    const ey = Math.sin(a - Math.PI / 2) * L
    const seg = ` M0,0 Q${(ex * 0.4).toFixed(1)},${(ey * 0.7).toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`
    if (i % 2) f1 += seg
    else f2 += seg
  }
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={1.6} cy={0.6} rx={5} ry={1.4} fill={PAL.ombrePortee} opacity={0.13} />
      <path d={f1.trim()} stroke={VERT_M} strokeWidth={1.3} fill="none" strokeLinecap="round" />
      <path d={f2.trim()} stroke={VERT_L} strokeWidth={1.1} fill="none" strokeLinecap="round" />
      <path d={f2.trim()} stroke={VERT_XL} strokeWidth={0.45} fill="none" opacity={0.7} />
    </g>
  )
}

/** treuil de halage : bâti, tambour cordé, roue à rochet, rampe et grume tirée */
function Treuil({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={16} ry={4.4} cy={2} />
      <OmbreVolume w={16} h={13} o={0.14} />
      {/* rampe de halage : deux longrines + traverses */}
      <g>
        <line x1={-27} y1={9} x2={-6} y2={-2.5} stroke="#5f4629" strokeWidth={2} />
        <line x1={-24} y1={11} x2={-3} y2={-0.5} stroke="#5f4629" strokeWidth={2} />
        <line x1={-26.8} y1={8.6} x2={-6.2} y2={-2.9} stroke="#b08a58" strokeWidth={0.6} opacity={0.75} />
        {[0.2, 0.5, 0.8].map((t) => (
          <line
            key={t}
            x1={-27 + t * 21 + 1.5}
            y1={9 - t * 11.5 + 1}
            x2={-27 + t * 21 + 4.5}
            y2={9 - t * 11.5 + 3}
            stroke="#4c3823"
            strokeWidth={1.4}
          />
        ))}
      </g>
      {/* grume en cours de montée sur la rampe */}
      <Rondin x={-21} y={2.5} l={14} r={2.6} rot={-28} seed={17} />
      {/* bâti : deux montants dépassant du tambour + jambes de force */}
      {[-8.5, 8.5].map((px) => (
        <Fragment key={px}>
          <rect x={px - 1.6} y={-17} width={3.2} height={18.5} fill="url(#sc-poteau)" />
          <line x1={px - 1.1} y1={1} x2={px - 1.1} y2={-16.4} stroke="#bb9560" strokeWidth={0.7} opacity={0.8} />
          <path
            d={`M${px},-16.6 l${px < 0 ? 1.4 : -1.4},-1.6 l${px < 0 ? 1.4 : -1.4},1.6 Z`}
            fill="#8f6f45"
          />
          <path
            d={`M${px + (px < 0 ? -1.6 : 1.6)},-4.6 L${px + (px < 0 ? -6.4 : 6.4)},1.4`}
            stroke="#5f4629"
            strokeWidth={1.6}
          />
        </Fragment>
      ))}
      <line x1={-8} y1={-3.4} x2={8} y2={-4.8} stroke="#5f4629" strokeWidth={1.6} />
      <line x1={-7.6} y1={-3.9} x2={7.8} y2={-5.3} stroke="#a8845d" strokeWidth={0.55} opacity={0.7} />
      {/* tambour : cylindre couché d'un montant à l'autre */}
      <rect x={-8.5} y={-13.6} width={17} height={6.4} rx={0.5} fill="#6b4f31" />
      <rect x={-8.5} y={-13.6} width={17} height={1.9} fill="#96754c" />
      <rect x={-8.5} y={-8.6} width={17} height={1.4} fill="#42311e" opacity={0.7} />
      {/* cordage enroulé au centre du tambour */}
      <rect x={-3.2} y={-13.4} width={6.6} height={6} fill="#a68e64" />
      <rect x={-3.2} y={-13.4} width={6.6} height={1.4} fill="#c9b184" />
      <rect x={-3.2} y={-8.9} width={6.6} height={1.2} fill="#6f5c3b" opacity={0.85} />
      <path d="M-1.6,-13.4 q0.9,3 0,6 M0.4,-13.4 q0.9,3 0,6 M2.2,-13.4 q0.9,3 0,6" stroke="#7d6a45" strokeWidth={0.6} fill="none" opacity={0.8} />
      {/* joues du tambour + axe traversant */}
      <ellipse cx={-8.4} cy={-10.4} rx={1.7} ry={3.3} fill="#a8845d" />
      <ellipse cx={-8.8} cy={-10.8} rx={0.6} ry={1.1} fill="#42311e" />
      <ellipse cx={8.4} cy={-10.4} rx={1.7} ry={3.3} fill="#59422a" />
      {/* grande roue à rayons : c'est elle qui dit « treuil » d'un coup d'œil */}
      <circle cx={10.4} cy={-10.4} r={4.4} fill="#6b4f31" />
      <circle cx={10.4} cy={-10.4} r={4.4} fill="none" stroke="#42311e" strokeWidth={1.2} />
      <circle cx={10.4} cy={-10.4} r={3.6} fill="none" stroke="#a8845d" strokeWidth={0.5} opacity={0.7} />
      <path
        d="M10.4,-14.6 L10.4,-6.2 M6.6,-12.5 L14.2,-8.3 M6.6,-8.3 L14.2,-12.5"
        stroke="#96754c"
        strokeWidth={0.9}
      />
      <circle cx={10.4} cy={-10.4} r={1.2} fill="#42311e" />
      <circle cx={10} cy={-10.8} r={0.5} fill="#a8845d" />
      {/* manette sur la jante + cliquet de blocage */}
      <line x1={13.6} y1={-13} x2={15.4} y2={-14.4} stroke="#6b4c2a" strokeWidth={1.8} />
      <path d="M12.6,-15.4 L11,-13.2 L12.4,-13.7 Z" fill={FER_M} />
      <path d="M12.6,-15.4 L11,-13.2 L11.6,-13.6 Z" fill={FER_L} />
      {/* corde tendue du tambour à la grume */}
      <path d="M-7.4,-12.2 Q-12.4,-9 -16.5,-2.6" stroke={CORDE} strokeWidth={0.9} fill="none" />
      <path d="M-7.4,-12.5 Q-12.4,-9.4 -16.6,-3" stroke="#efe2c4" strokeWidth={0.35} fill="none" opacity={0.6} />
    </g>
  )
}

/** grue de levage : mât en treillis, flèche haubanée, lest de pierre, charge suspendue */
function Grue({ x, y }: { x: number; y: number }) {
  const mH = -46 // tête du mât
  const fx = 19
  const fy = -52 // tête de flèche
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={15} ry={4.2} cy={1.5} />
      <OmbreVolume w={12} h={34} x={2} o={0.15} />
      {/* plateforme : semelles croisées + platelage */}
      <rect x={-11} y={-1.4} width={22} height={2.8} fill="#6f5334" />
      <rect x={-11} y={-1.4} width={22} height={0.9} fill="#a8845d" />
      <path d="M-6,2.2 L6,-3.4 L6,-4.8 L-6,0.8 Z" fill="#5f4629" />
      {/* lest : caisse de pierres arrimée, côté opposé à la flèche */}
      <g>
        <rect x={-15} y={-10} width={9.8} height={8.8} fill="#5b4127" />
        <MurPierre x={-14.2} y={-9.2} w={8.2} h={7.4} seed={12} ombre />
        <rect x={-14.2} y={-9.2} width={8.2} height={7.4} fill="#6b4c2a" opacity={0.46} />
        <rect x={-15} y={-10} width={9.8} height={1.2} fill="#96754c" />
        <rect x={-15} y={-2.4} width={9.8} height={1.2} fill="#3f2f1c" />
        <path d="M-11,-10 v8.8 M-15,-6.4 h9.8" stroke="#6b4c2a" strokeWidth={1.3} opacity={0.85} />
        <path d="M-11.4,-10 v8.8" stroke="#a8845d" strokeWidth={0.5} opacity={0.7} />
      </g>
      {/* mât en treillis : deux poteaux + croisillons */}
      <rect x={-3.4} y={mH} width={2.6} height={-mH} fill="url(#sc-poteau)" />
      <rect x={1} y={mH} width={2.6} height={-mH} fill="url(#sc-poteau)" />
      <line x1={-2.9} y1={-1} x2={-2.9} y2={mH + 1} stroke="#c09c68" strokeWidth={0.6} opacity={0.8} />
      <line x1={3.1} y1={-1} x2={3.1} y2={mH + 1} stroke="#3f2f1c" strokeWidth={0.7} opacity={0.5} />
      <path
        d={[0, 1, 2, 3, 4, 5]
          .map((i) => {
            const y0 = -3 - i * 7.2
            return `M-1.1,${y0} L2.3,${y0 - 7.2} M2.3,${y0} L-1.1,${y0 - 7.2}`
          })
          .join(' ')}
        stroke="#6a4f31"
        strokeWidth={1.1}
        fill="none"
        opacity={0.95}
      />
      <rect x={-4.6} y={mH - 2.2} width={9} height={2.4} fill="#7c5e3b" />
      <rect x={-4.6} y={mH - 2.2} width={9} height={0.8} fill="#b08a58" />
      {/* haubans vers deux pieux d'ancrage */}
      <path
        d={`M-3,${mH - 1} Q-12,${mH * 0.55} -14,-10.4 M3.6,${mH - 1} Q13,${mH * 0.5} 15.5,-1.6`}
        stroke="#bda37a"
        strokeWidth={0.5}
        fill="none"
        opacity={0.55}
      />
      <AOBase rx={3.4} ry={1.2} cx={15.5} cy={1.4} o={0.9} />
      <line x1={15.5} y1={-3.4} x2={15.5} y2={1.4} stroke="#5f4629" strokeWidth={1.8} />
      <line x1={15.1} y1={-3.2} x2={15.1} y2={1} stroke="#a8845d" strokeWidth={0.55} opacity={0.7} />
      {/* flèche + jambe de force + hauban de tête */}
      <line x1={0.4} y1={mH + 1} x2={fx} y2={fy} stroke="#7c5e3b" strokeWidth={2.8} />
      <line x1={0.6} y1={mH + 0.3} x2={fx - 0.3} y2={fy - 0.8} stroke="#b08a58" strokeWidth={1} opacity={0.9} />
      <line x1={fx - 6} y1={fy + 3.4} x2={2.2} y2={mH + 12} stroke="#6a4f31" strokeWidth={1.5} />
      <path d={`M${fx},${fy} Q${fx * 0.5},${fy + 3} 1.4,${mH + 2}`} stroke="#bda37a" strokeWidth={0.55} fill="none" opacity={0.7} />
      {/* treuil au pied du mât : tambour cordé + manivelle */}
      <rect x={-3.6} y={-9.4} width={8} height={3.4} rx={0.5} fill="#5b4127" />
      <rect x={-1.2} y={-9.2} width={3.2} height={3} fill="#8a7452" />
      <path d="M4.8,-7.7 L7.4,-9.6 L7.4,-7.4" stroke={FER_O} strokeWidth={1.2} fill="none" />
      {/* câble de levée le long du mât */}
      <path d={`M2.2,-8.6 L2.6,${mH - 0.6}`} stroke={CORDE} strokeWidth={0.5} opacity={0.75} />
      {/* moufle en tête de flèche */}
      <path d={`M${fx - 1.6},${fy - 1.4} L${fx + 1.6},${fy - 1.4} L${fx + 1.2},${fy + 1.8} L${fx - 1.2},${fy + 1.8} Z`} fill="#7c5e3b" />
      <circle cx={fx} cy={fy + 0.4} r={1.5} fill={FER_M} />
      <circle cx={fx - 0.4} cy={fy} r={0.5} fill={FER_L} />
      {/* charge : grume élinguée, balancement très lent */}
      <ellipse cx={fx + 5} cy={1} rx={9} ry={2} fill={PAL.ombrePortee} opacity={0.11} filter="url(#a-flou2)" />
      <g>
        <animateTransform attributeName="transform" type="rotate" values={`-2.1 ${fx} ${fy};2.1 ${fx} ${fy};-2.1 ${fx} ${fy}`} dur="11s" repeatCount="indefinite" />
        <line x1={fx} y1={fy} x2={fx} y2={fy + 26} stroke={CORDE} strokeWidth={0.9} />
        <path d={`M${fx},${fy + 26} L${fx - 6},${fy + 30} M${fx},${fy + 26} L${fx + 6},${fy + 30}`} stroke="#cbb289" strokeWidth={0.75} fill="none" />
        <circle cx={fx} cy={fy + 26} r={0.9} fill={FER_M} />
        <Rondin x={fx - 7.5} y={fy + 31} l={15} r={2.6} seed={23} />
      </g>
    </g>
  )
}

/** bassin de flottage : berge détrempée, eau en trois valeurs, contour irrégulier */
function Bassin({ x, y, rx = 28, ry = 11 }: { x: number; y: number; rx?: number; ry?: number }) {
  // rive dessinée à la main : jamais une ellipse parfaite
  const rive = (k: number) =>
    `M${-rx * k},${-ry * 0.15 * k} C${-rx * 0.94 * k},${-ry * 0.92 * k} ${-rx * 0.32 * k},${-ry * 1.06 * k} ${rx * 0.18 * k},${-ry * 0.96 * k}` +
    ` C${rx * 0.72 * k},${-ry * 0.88 * k} ${rx * 1.02 * k},${-ry * 0.42 * k} ${rx * k},${ry * 0.1 * k}` +
    ` C${rx * 0.96 * k},${ry * 0.72 * k} ${rx * 0.46 * k},${ry * 1.04 * k} ${-rx * 0.12 * k},${ry * k}` +
    ` C${-rx * 0.62 * k},${ry * 0.96 * k} ${-rx * 0.98 * k},${ry * 0.6 * k} ${-rx * k},${-ry * 0.15 * k} Z`
  return (
    <g transform={`translate(${x},${y})`}>
      {/* berge : terre détrempée, plus sombre au bord de l'eau */}
      <path d={rive(1.16)} fill="#8a7b52" opacity={0.7} />
      <path d={rive(1.07)} fill="#665a37" opacity={0.5} />
      <path d={rive(1)} fill="url(#sc-eau)" />
      {/* ombre de la berge nord (l'eau est sombre au loin) */}
      <path d={`M${-rx * 0.94},${-ry * 0.3} C${-rx * 0.6},${-ry * 1.02} ${rx * 0.3},${-ry * 1.02} ${rx * 0.9},${-ry * 0.3} C${rx * 0.5},${-ry * 0.5} ${-rx * 0.5},${-ry * 0.5} ${-rx * 0.94},${-ry * 0.3} Z`} fill="#37453c" opacity={0.45} />
      {/* rides et reflets du ciel devant */}
      <path
        d={`M${-rx * 0.6},${ry * 0.46} q${rx * 0.3},${-1.7} ${rx * 0.6},0 M${-rx * 0.28},${ry * 0.7} q${rx * 0.2},${-1.2} ${rx * 0.42},0 M${rx * 0.14},${-ry * 0.46} q${rx * 0.18},${-1} ${rx * 0.32},0.2`}
        stroke={EAU_L}
        strokeWidth={0.8}
        fill="none"
        opacity={0.45}
      />
      {/* liseré humide au contact de la berge sud */}
      <path d={`M${-rx * 0.72},${ry * 0.72} C${-rx * 0.2},${ry * 1.04} ${rx * 0.3},${ry * 0.96} ${rx * 0.78},${ry * 0.5}`} stroke="#a8b8a4" strokeWidth={0.8} fill="none" opacity={0.35} />
    </g>
  )
}

/** radeau : grumes liées, mi-immergées, reflet sombre dans l'eau */
function Radeau({ x, y, rot = 0, seed = 21, s = 1 }: { x: number; y: number; rot?: number; seed?: number; s?: number }) {
  const rnd = alea(seed)
  const logs = Array.from({ length: 3 }, (_, i) => ({
    lx: -9 + (rnd() - 0.5) * 2.5,
    ly: i * 3.4 - 3.4,
    ll: 17 + rnd() * 3.5,
  }))
  const D = logs[2]
  return (
    <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
      <ellipse cx={2} cy={5.4} rx={13} ry={2.8} fill="#33463f" opacity={0.4} filter="url(#a-flou1)" />
      {logs.map((L, i) => (
        <Rondin key={i} x={L.lx} y={L.ly} l={L.ll} r={1.9} seed={seed + i} />
      ))}
      {/* liens transversaux */}
      <path d="M-3,-5.2 q1.5,1.7 0,3.4 q-1.5,1.7 0,3.4 M6.5,-5.2 q1.5,1.7 0,3.4 q-1.5,1.7 0,3.4" stroke="#bfa87f" strokeWidth={0.8} fill="none" opacity={0.6} />
      {/* ligne d'eau : le rang de devant s'enfonce, frange claire au contact */}
      <path d={`M${D.lx},${D.ly + 1} h${D.ll}`} stroke="#6b8072" strokeWidth={2.6} opacity={0.6} />
      <path d={`M${D.lx + 0.6},${D.ly + 0.2} h${D.ll - 1.6}`} stroke="#a3b6a5" strokeWidth={0.7} opacity={0.6} />
    </g>
  )
}

/** quai de planches et pieu d'amarrage sur le bord du bassin */
function Quai({ x, y, w = 20 }: { x: number; y: number; w?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={w * 0.62} ry={3} cx={1} cy={1.4} />
      <ellipse cx={2} cy={1.2} rx={w * 0.6} ry={2.4} fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou1)" />
      {/* pilotis fichés dans la vase */}
      <path d={`M${-w / 2 + 2},-2 h2 v4 h-2 Z M${w / 2 - 8},-2 h2 v4 h-2 Z`} fill="#4a3623" />
      {[0, 1].map((i) => (
        <Fragment key={i}>
          <rect x={-w / 2 + i * 0.8} y={-1.6 - i * 1.6} width={w - i * 1.6} height={1.5} fill="url(#sc-planche)" />
          <rect x={-w / 2 + i * 0.8} y={-1.6 - i * 1.6} width={w - i * 1.6} height={0.5} fill={SCIE_L} />
        </Fragment>
      ))}
      {/* pieu d'amarrage + corde qui plonge */}
      <rect x={w / 2 - 4} y={-9.5} width={2.6} height={9} rx={1.2} fill="url(#sc-poteau)" />
      <ellipse cx={w / 2 - 2.7} cy={-9.5} rx={1.3} ry={0.6} fill="#c19a66" />
      <path d={`M${w / 2 - 3.4},-8 q-4,1.6 -7.5,3.4`} stroke={CORDE} strokeWidth={0.8} fill="none" />
      <path d={`M${w / 2 - 3.2},-7.4 q1.6,1.4 0.4,2.8`} stroke={CORDE} strokeWidth={0.7} fill="none" opacity={0.8} />
    </g>
  )
}

/** sol commun : terre battue, ornières, tapis d'aiguilles, traînée de sciure */
function Sol({ n }: { n: number }) {
  const rx = 38 + n * 6
  const rnd = alea(n * 5 + 3)
  let cailloux = ''
  for (let i = 0; i < 6; i++) {
    const a = rnd() * Math.PI * 2
    const t = 0.35 + rnd() * 0.6
    cailloux += ` M${(Math.cos(a) * rx * t).toFixed(1)},${(4 + Math.sin(a) * rx * 0.3 * t).toFixed(1)} l${(1.4 + rnd()).toFixed(1)},0`
  }
  return (
    <g>
      {/* la clairière : le fond remonte derrière le chantier */}
      <ellipse cx={2} cy={1} rx={rx} ry={rx * 0.38} fill="#a2946a" opacity={0.75} />
      <ellipse cx={0} cy={3} rx={rx * 0.94} ry={rx * 0.3} fill="#b5a675" opacity={0.85} />
      <ellipse cx={-2} cy={2} rx={rx * 0.7} ry={rx * 0.21} fill="#c2b280" opacity={0.75} />
      <ellipse cx={7} cy={7} rx={rx * 0.44} ry={rx * 0.12} fill="#cfbf8c" opacity={0.45} />
      {/* ornières de charroi vers l'ouest, dès qu'une charrette roule ici */}
      {n >= 2 && (
        <g>
          <path
            d={`M${-rx * 0.95},${10} C${-rx * 0.5},${7.6} ${-rx * 0.2},${6} ${rx * 0.12},${5.4} M${-rx * 0.95},${12.4} C${-rx * 0.5},${10} ${-rx * 0.2},${8.4} ${rx * 0.1},${7.6}`}
            stroke="#8b7d51"
            strokeWidth={1.9}
            fill="none"
            opacity={0.33}
          />
          <path d={`M${-rx * 0.9},${9.4} C${-rx * 0.5},${7.1} ${-rx * 0.2},${5.5} ${rx * 0.1},${4.9}`} stroke="#d1c391" strokeWidth={0.8} fill="none" opacity={0.45} />
        </g>
      )}
      {/* tapis d'aiguilles vers la lisière nord-ouest — aplat deux tons */}
      <ellipse cx={-rx * 0.46} cy={-7} rx={rx * 0.4} ry={6} fill="#77764a" opacity={0.4} />
      <ellipse cx={-rx * 0.38} cy={-8.6} rx={rx * 0.25} ry={3.4} fill="#8a8855" opacity={0.4} />
      {/* traînée de sciure de la zone de coupe est */}
      <ellipse cx={15} cy={5} rx={16} ry={4.8} fill="#cbb182" opacity={0.4} />
      <ellipse cx={18} cy={4.4} rx={8.5} ry={2.7} fill="#e0cc98" opacity={0.45} />
      <path d={cailloux.trim()} stroke="#82744e" strokeWidth={1.1} opacity={0.3} strokeLinecap="round" />
    </g>
  )
}

/** billots entaillés posés sous les haches des bûcherons (24,4) et (-8,13) */
function ZoneCoupe({ deux = false }: { deux?: boolean }) {
  return (
    <g>
      {/* billot du bûcheron est : entaille fraîche sous la trajectoire de la hache */}
      <ellipse cx={5} cy={5.8} rx={11.5} ry={1.8} fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou1)" />
      <Rondin x={14} y={3} l={22} r={2.8} flip seed={5} />
      <path d="M11.8,0.6 L13.2,2.3 L14.6,0.6 Z" fill="#5e4128" />
      <path d="M12.1,0.7 L13.2,2 L13.9,0.7 Z" fill="#e2c592" opacity={0.9} />
      <Copeaux x={16.5} y={7} s={0.9} seed={41} />
      {deux && (
        <g>
          {/* billot du bûcheron ouest */}
          <ellipse cx={8} cy={13.8} rx={9.5} ry={1.6} fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou1)" />
          <Rondin x={0.5} y={11.5} l={16} r={2.5} seed={11} />
          <path d="M3.5,9.4 L4.6,10.9 L5.7,9.4 Z" fill="#5e4128" />
          <path d="M3.8,9.5 L4.6,10.6 L5.1,9.5 Z" fill="#e2c592" />
          <Copeaux x={2} y={16} s={0.8} seed={43} />
        </g>
      )}
    </g>
  )
}

/** façade de l'atelier : bardage de planches, contreventement, grande baie */
function FacadeAtelier({ w, h, g, seed = 3 }: { w: number; h: number; g: number; seed?: number }) {
  const rnd = alea(seed)
  let joints = ''
  let lumieres = ''
  let px = -w / 2 + 2.5
  while (px < w / 2 - 2) {
    joints += ` M${px.toFixed(1)},${(-h + 4.2).toFixed(1)} L${px.toFixed(1)},-3.4`
    lumieres += ` M${(px + 0.55).toFixed(1)},${(-h + 4.4).toFixed(1)} L${(px + 0.55).toFixed(1)},-3.6`
    px += 3 + rnd() * 1.8
  }
  const bw = w * 0.4
  return (
    <g>
      {/* soubassement de pierre sèche, réchauffé pour tenir avec le bois */}
      <MurPierre x={-w / 2 + 1.5} y={-3.4} w={w - 3} h={3.4} seed={seed * 3} ombre />
      <rect x={-w / 2 + 1.5} y={-3.4} width={w - 3} height={3.4} fill="#7c5e3b" opacity={0.34} />
      <rect x={-w / 2 + 1.5} y={-3.9} width={w - 3} height={0.8} fill="#a89b81" />
      <rect x={-w / 2 + 1.5} y={-3.9} width={w - 3} height={1.3} fill={PAL.ombrePortee} opacity={0.2} filter="url(#a-flou1)" />
      {/* bardage vertical */}
      <path d={joints.trim()} stroke={ECORCE_O} strokeWidth={0.55} opacity={0.3} fill="none" />
      <path d={lumieres.trim()} stroke="#c9a774" strokeWidth={0.5} opacity={0.28} fill="none" />
      {/* poteaux d'angle + contreventement en croix de Saint-André */}
      <rect x={-w / 2 + 0.4} y={-h + 1} width={2.6} height={h - 4} fill="url(#sc-poteau)" />
      <rect x={w / 2 - 3} y={-h + 1} width={2.6} height={h - 4} fill="#4c3723" />
      <path d={`M${-w / 2 + 3.4},-4.4 L${-w / 2 + 3.4 + (bw * 0.5 - 2)},${-h + 2}`} stroke="#7c5e3b" strokeWidth={1.6} />
      <path d={`M${-w / 2 + 3.4},${-h + 2} L${-w / 2 + 3.4 + (bw * 0.5 - 2)},-4.4`} stroke="#6a4f31" strokeWidth={1.6} />
      {/* grande baie de travail : pénombre, planches, chevalet en silhouette */}
      <rect x={-1.5} y={-h + 2.5} width={bw} height={h - 6.5} fill="#2e2314" />
      <rect x={-1.5} y={-h + 2.5} width={bw} height={2.2} fill="#170f07" opacity={0.7} />
      {[0, 1].map((i) => (
        <Fragment key={i}>
          <rect x={0.4 + i * 0.8} y={-4.6 - i * 2.6} width={bw - 4} height={2.2} fill="url(#sc-planche)" />
          <rect x={0.4 + i * 0.8} y={-4.6 - i * 2.6} width={bw - 4} height={0.65} fill={SCIE_L} />
        </Fragment>
      ))}
      {/* scie à cadre en silhouette dans la pénombre de l'atelier */}
      <rect x={bw * 0.52} y={-h + 3.6} width={1.3} height={9.5} fill="#6a4f31" />
      <rect x={bw * 0.52 + 4.4} y={-h + 3.6} width={1.3} height={9.5} fill="#5b4127" />
      <rect x={bw * 0.52 + 2.2} y={-h + 4.4} width={0.8} height={8.4} fill="#9c9382" opacity={0.75} />
      {/* linteau et jambages de la baie */}
      <rect x={-3.2} y={-h + 1.2} width={bw + 3.4} height={2} fill="#8a6a41" />
      <rect x={-3.2} y={-h + 1.2} width={bw + 3.4} height={0.7} fill="#b6905c" />
      <path d={`M-3.2,${-h + 3} h1.8 v${h - 7} h-1.8 Z M${bw - 1.4},${-h + 3} h1.8 v${h - 7} h-1.8 Z`} fill="#6b4c2a" />
      {/* lucarne sous le pignon + planches dressées contre le mur ouest */}
      <rect x={-3} y={-h - g * 0.42} width={6} height={3.8} fill="#2e2314" />
      <rect x={-3} y={-h - g * 0.42} width={6} height={1.1} fill={PAL.ombrePortee} opacity={0.6} />
      <g transform={`translate(${-w / 2 + 8},-4) rotate(-9)`}>
        <rect x={-1.4} y={-h + 6} width={2.6} height={h - 6} fill="url(#sc-planche)" />
        <rect x={-1.4} y={-h + 6} width={0.8} height={h - 6} fill={SCIE_L} opacity={0.8} />
        <rect x={1.6} y={-h + 8} width={2.4} height={h - 8} fill="#9c7950" />
      </g>
    </g>
  )
}

/** atelier de sciage : Batisse3D bois + chaume peigné, baie ouverte */
function Atelier({ x, y, w, h, g, seed = 3 }: { x: number; y: number; w: number; h: number; g: number; seed?: number }) {
  const prof = Math.round(w * 0.21)
  return (
    <g transform={`translate(${x},${y})`}>
      <Batisse3D w={w} h={h} g={g} prof={prof} mat="bois" toit="chaume" retour={Math.round(w * 0.22)} enfants={<FacadeAtelier w={w} h={h} g={g} seed={seed} />} />
      <ChaumePeigne w={w} h={h} g={g} prof={prof} />
    </g>
  )
}

export function Scierie({ n }: { n: number }) {
  return (
    <g>
      <DefsScierie />
      <Sol n={n} />

      {/* ── niveau 1 : la clairière du bûcheron ── */}
      {n === 1 && (
        <g>
          <Pin x={-44} y={-9} s={1.3} seed={3} />
          <Pin x={40} y={-15} s={1.05} seed={7} />
          <Pin x={52} y={-5} s={0.82} seed={11} />
          <Broussaille x={-56} y={2} s={1.1} seed={5} />
          <PileGrumes x={-36} y={-3} n={3} l={23} seed={5} />
          {/* l'arbre vient de tomber : souche fraîche, fût couché dans son axe */}
          <TroncAbattu x={2} y={-10} l={38} r={3.3} rot={5} seed={7} />
          <Souche x={-8} y={-8} r={5} h={5.8} hache />
          <Copeaux x={-1} y={-3} seed={17} />
          <Souche x={-18} y={10} r={2.9} h={3.2} coin />
          <Buches x={-34} y={14} s={1} seed={9} />
          <Broussaille x={34} y={11} s={0.9} seed={13} />
          <ZoneCoupe />
        </g>
      )}

      {/* ── niveau 2 : appentis et scie de long ── */}
      {n === 2 && (
        <g>
          <Pin x={-54} y={-7} s={1.1} seed={3} />
          <Pin x={54} y={-2} s={0.82} seed={7} />
          <Appentis x={-32} y={-6} w={27} seed={4} />
          <PileGrumes x={-6} y={-11} n={3} l={26} seed={7} />
          <Appentis x={40} y={-10} w={20} scieMurale seed={6} />
          <Buches x={18} y={-4} s={0.85} seed={9} />
          <Souche x={44} y={8} r={3.2} h={3.4} coin />
          <ScieDeLong x={-8} y={3} seed={21} />
          <Sciure x={-26} y={5} s={0.7} />
          <CharretteGrumes x={-44} y={13} s={0.95} />
          <Souche x={-18} y={11} r={2.7} h={3} hache />
          <Broussaille x={-58} y={6} s={1} seed={5} />
          <ZoneCoupe />
        </g>
      )}

      {/* ── niveau 3 : l'atelier de sciage ── */}
      {n === 3 && (
        <g>
          <Pin x={-60} y={-10} s={1.05} seed={3} />
          <Atelier x={-34} y={-3} w={34} h={15} g={9} seed={3} />
          <PileGrumes x={16} y={-15} n={4} l={26} seed={9} />
          <SechoirPlanches x={-8} y={-9} w={26} n={4} seed={6} />
          <Treuil x={48} y={-4} />
          <Buches x={22} y={-4} s={0.85} seed={9} />
          <Sciure x={-26} y={4} s={0.85} pelle />
          <ScieDeLong x={-10} y={5} seed={21} />
          <Souche x={52} y={11} r={3.2} h={3.4} coin />
          <CharretteGrumes x={-48} y={14} s={1} />
          <Souche x={-28} y={9} r={2.8} h={3} />
          <Broussaille x={-62} y={7} s={0.95} seed={5} />
          <ZoneCoupe deux />
        </g>
      )}

      {/* ── niveau 4 : le grand chantier du bois ── */}
      {n === 4 && (
        <g>
          <Atelier x={-46} y={-1} w={42} h={19} g={13} seed={5} />
          <SechoirPlanches x={-6} y={-11} w={26} n={4} seed={6} />
          <PileGrumes x={8} y={-17} n={4} l={26} seed={13} />
          <Grue x={46} y={-4} />
          <Bassin x={66} y={20} rx={22} ry={10} />
          <Radeau x={58} y={22} rot={-4} seed={23} s={0.74} />
          <Radeau x={76} y={16} rot={3} seed={29} s={0.6} />
          <Quai x={48} y={13} w={16} />
          <Broussaille x={42} y={26} s={0.85} seed={17} />
          <Poutres x={16} y={-9} l={15} seed={8} />
          <Sciure x={-34} y={4} s={0.9} pelle />
          <ScieDeLong x={-14} y={6} seed={21} />
          <CharretteGrumes x={-58} y={17} s={1} />
          <ZoneCoupe deux />
        </g>
      )}
    </g>
  )
}
