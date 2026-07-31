import { Fragment, type ReactNode } from 'react'
import { AOBase, OmbreVolume, PAL, alea } from '../art'

/*
 * CARRIÈRE — peint réaliste (bible docs/STYLE-ART.md) : lumière NW, ombres
 * portées SE, zéro contour noir, le volume vient des valeurs.
 *  1. premier front de taille, coins de bois enfoncés dans la veine
 *  2. échafaudages contre la paroi + rampe de halage
 *  3. fosse étagée (gradins), blocs calibrés, traîneau sur rondins
 *  4. carrière monumentale : obélisque en cours de détachement, fûts couchés
 *
 * La star est le FRONT DE TAILLE. Sa lecture repose sur une échelle de
 * valeurs stricte : la roche PATINÉE du sommet est ocre et sombre, la zone
 * EXPLOITÉE du bas est calcaire frais et clair, et chaque dessus de banc —
 * seule surface horizontale — reçoit le ciel donc reste le point le plus
 * lumineux. Sous chaque surplomb, une ombre franche : c'est elle qui creuse.
 * Les tailleurs d'Ouvriers.tsx frappent à (12,9) et (-22,13) : un bloc en
 * cours d'équarrissage attend sous chaque ciseau, la zone reste dégagée.
 */

/** défs locales — préfixe car- */
function DefsCarriere() {
  return (
    <defs>
      {/* bancs : 4 valeurs, du calcaire frais (bas de la fosse) à la roche patinée (sommet) */}
      <linearGradient id="car-b1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d6c7a1" />
        <stop offset="100%" stopColor="#a89573" />
      </linearGradient>
      <linearGradient id="car-b2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c5b48d" />
        <stop offset="100%" stopColor="#988662" />
      </linearGradient>
      <linearGradient id="car-b3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ae9d76" />
        <stop offset="100%" stopColor="#847351" />
      </linearGradient>
      <linearGradient id="car-b4" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#978763" />
        <stop offset="100%" stopColor="#6d6146" />
      </linearGradient>
      {/* pierre fraîchement sciée */}
      <linearGradient id="car-frais" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ece3c4" />
        <stop offset="100%" stopColor="#c8bb96" />
      </linearGradient>
      {/* retour est de la paroi : pan tourné vers l'est, donc à l'ombre */}
      <linearGradient id="car-est" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8d7f5e" />
        <stop offset="100%" stopColor="#665b43" />
      </linearGradient>
      {/* ombre de fond de fosse : le pied de la paroi baigne dans la pénombre */}
      <linearGradient id="car-pied" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4a4232" stopOpacity="0" />
        <stop offset="100%" stopColor="#463e2e" stopOpacity="0.42" />
      </linearGradient>
      {/* fût couché : haut éclairé, ventre en demi-teinte, dessous sombre */}
      <linearGradient id="car-tambour" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c3b898" />
        <stop offset="14%" stopColor="#eee6cf" />
        <stop offset="50%" stopColor="#d1c7ab" />
        <stop offset="100%" stopColor="#847a61" />
      </linearGradient>
      {/* couronnement : terre sèche et herbe rase au sommet de la falaise */}
      <linearGradient id="car-terre" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#b0a068" />
        <stop offset="50%" stopColor="#8f8351" />
        <stop offset="100%" stopColor="#6e6844" />
      </linearGradient>
      {/* poussière calcaire au pied du front */}
      <radialGradient id="car-poussiere">
        <stop offset="0%" stopColor="#eee6cb" stopOpacity="0.85" />
        <stop offset="60%" stopColor="#e2d8b8" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#e2d8b8" stopOpacity="0" />
      </radialGradient>
      {/* perche de bois : lumière à gauche */}
      <linearGradient id="car-perche" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ab8760" />
        <stop offset="45%" stopColor="#835f3d" />
        <stop offset="100%" stopColor="#5c4128" />
      </linearGradient>
    </defs>
  )
}

const BANCS = ['url(#car-b1)', 'url(#car-b2)', 'url(#car-b3)', 'url(#car-b4)']
/** dessus de banc : clair en bas de fosse (pierre fraîche), ocre en haut (patine) */
const LIPS = ['#f6eed3', '#e8d9b0', '#d2c091', '#b9a77b']

// ── petits outils de géométrie ───────────────────────────────────────────────

/** abscisses régulières */
function absc(x0: number, x1: number, n: number): number[] {
  return Array.from({ length: n + 1 }, (_, i) => x0 + ((x1 - x0) * i) / n)
}

/** profil horizontal légèrement irrégulier (déterministe) autour de y */
function profil(n: number, y: number, amp: number, rnd: () => number): number[] {
  return Array.from({ length: n + 1 }, () => y + (rnd() - 0.5) * 2 * amp)
}

/** bande fermée entre un profil haut et un profil bas ; `flare` évase les flancs */
function bande(X: number[], haut: number[], bas: number[], flare = 0): string {
  const n = X.length - 1
  let d = `M${X[0].toFixed(1)},${haut[0].toFixed(1)}`
  for (let i = 1; i <= n; i++) d += ` L${X[i].toFixed(1)},${haut[i].toFixed(1)}`
  if (flare) d += ` L${(X[n] + flare).toFixed(1)},${bas[n].toFixed(1)}`
  for (let i = n; i >= 0; i--) d += ` L${X[i].toFixed(1)},${bas[i].toFixed(1)}`
  if (flare) d += ` L${(X[0] - flare).toFixed(1)},${bas[0].toFixed(1)}`
  return `${d} Z`
}

/** polyligne ouverte */
function polyl(X: number[], Y: number[]): string {
  let d = `M${X[0].toFixed(1)},${Y[0].toFixed(1)}`
  for (let i = 1; i < X.length; i++) d += ` L${X[i].toFixed(1)},${Y[i].toFixed(1)}`
  return d
}

// ── matière : éclats, touffes ────────────────────────────────────────────────

/** éclats de taille : esquilles anguleuses à trois valeurs, chacune son ombre */
function Gravats({ x, y, w, h = 7, n = 10, seed = 3 }: { x: number; y: number; w: number; h?: number; n?: number; seed?: number }) {
  const rnd = alea(seed)
  const items: ReactNode[] = []
  for (let i = 0; i < n; i++) {
    const px = x + (rnd() - 0.5) * w
    const py = y + (rnd() - 0.5) * h
    const s = 1 + rnd() * 1.9
    const t = rnd()
    items.push(
      <Fragment key={i}>
        <ellipse cx={px + s * 0.75} cy={py + s * 0.3} rx={s * 1.15} ry={s * 0.42} fill={PAL.ombrePortee} opacity={0.17} />
        <path
          d={`M${(px - s).toFixed(1)},${py.toFixed(1)} L${(px - s * 0.35).toFixed(1)},${(py - s * 1.05).toFixed(1)} L${(px + s * 0.9).toFixed(1)},${(py - s * 0.3).toFixed(1)} L${(px + s * 0.45).toFixed(1)},${(py + s * 0.3).toFixed(1)} Z`}
          fill={t > 0.78 ? '#e2d7b6' : t > 0.42 ? '#c0b28c' : '#988b6b'}
        />
        {s > 2 && (
          <path
            d={`M${(px - s).toFixed(1)},${py.toFixed(1)} L${(px - s * 0.35).toFixed(1)},${(py - s * 1.05).toFixed(1)} L${(px + s * 0.9).toFixed(1)},${(py - s * 0.3).toFixed(1)}`}
            stroke="#f4eeda"
            strokeWidth={0.55}
            opacity={0.55}
            fill="none"
          />
        )}
      </Fragment>,
    )
  }
  return <g>{items}</g>
}

/** buisson bas de garrigue sur la crête — trois valeurs, ombre portée SE */
function Garrigue({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2.4} cy={0.6} rx={5.6} ry={1.5} fill={PAL.ombrePortee} opacity={0.18} />
      <path d="M-4.6,0.6 C-4.8,-3 -2.6,-5.2 0.4,-5.2 C3.4,-5.2 5.2,-3.2 5,0.6 Z" fill="#4f5734" />
      <path d="M-4.2,0.2 C-4.2,-2.8 -2.4,-4.6 0.2,-4.6 C1.6,-4.6 2.8,-4 3.4,-2.8 C1.6,-1.4 -1.6,-0.6 -4.2,0.2 Z" fill="#68713f" />
      <path d="M-3.4,-1.6 C-3.2,-3.6 -1.8,-4.6 -0.2,-4.4 C-0.6,-3 -1.8,-2.2 -3.4,-1.6 Z" fill="#878b4f" />
    </g>
  )
}

/**
 * Talus d'éboulis au bout du front : cône de gravats qui masque la tranche de
 * la paroi. Flanc gauche éclairé, sommet en demi-teinte, flanc droit ombré.
 */
function Talus({ x, y, w = 26, h = 9, seed = 4 }: { x: number; y: number; w?: number; h?: number; seed?: number }) {
  const rnd = alea(seed)
  const s = -0.1 + rnd() * 0.2
  // crête brisée du cône d'éboulis : anguleuse, jamais un dôme lisse
  const pts = [
    [-0.5, 0.8],
    [-0.36, -h * 0.42],
    [-0.2, -h * 0.72],
    [-0.05 + s, -h],
    [0.12, -h * 0.8],
    [0.3, -h * 0.44],
    [0.5, 0.8],
  ]
  const d = pts.map(([a, b], i) => `${i ? 'L' : 'M'}${(x + a * w).toFixed(1)},${(y + b).toFixed(1)}`).join(' ') + ' Z'
  return (
    <g>
      <ellipse cx={x + w * 0.16} cy={y + 1.4} rx={w * 0.56} ry={h * 0.28} fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou2)" />
      <path d={d} fill="#af9f79" />
      <path
        d={`M${x - w * 0.5},${y + 0.8} L${x - w * 0.36},${y - h * 0.42} L${x - w * 0.2},${y - h * 0.72} L${x + (s - 0.05) * w},${y - h} L${x - w * 0.02},${y - h * 0.52} L${x - w * 0.14},${y - h * 0.16} L${x - w * 0.26},${y + 0.8} Z`}
        fill="#cfc094"
      />
      <path d={`M${x + (s - 0.05) * w},${y - h} L${x + w * 0.12},${y - h * 0.8} L${x + w * 0.3},${y - h * 0.44} L${x + w * 0.5},${y + 0.8} L${x + w * 0.24},${y + 0.8} Z`} fill="#877a5c" />
      <Gravats x={x} y={y - 0.5} w={w * 0.85} h={h * 0.45} n={4} seed={seed + 21} />
    </g>
  )
}

/**
 * Empreintes de blocs enlevés dans le sol de la fosse : rectangles évidés,
 * lèvre supérieure éclairée, fond dans l'ombre. C'est la signature d'un
 * chantier d'extraction.
 */
function Empreintes({ x, y, seed = 5 }: { x: number; y: number; seed?: number }) {
  const rnd = alea(seed)
  const items: ReactNode[] = []
  for (let i = 0; i < 2; i++) {
    const px = x + (rnd() - 0.5) * 26
    const py = y + i * 4.4 + (rnd() - 0.5) * 2
    const w = 12 + rnd() * 9
    const h = 3.6 + rnd() * 1.6
    items.push(
      <g key={i}>
        <path d={`M${px},${py} L${px + w},${py} L${px + w - 3},${py - h} L${px - 3},${py - h} Z`} fill="#a1946f" opacity={0.3} />
        <path d={`M${px - 3},${py - h} L${px + w - 3},${py - h}`} stroke="#6f6551" strokeWidth={0.9} opacity={0.3} />
        <path d={`M${px},${py} L${px + w},${py}`} stroke="#eee6c9" strokeWidth={0.9} opacity={0.35} />
      </g>,
    )
  }
  return <g>{items}</g>
}

/**
 * Galerie taillée au pied du front : la seule vraie valeur sombre de la
 * carrière — elle creuse la paroi et donne l'échelle. Linteau de bois étayé.
 */
function Galerie({ x, y, w = 13, h = 11 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      {/* embrasure : sciage frais autour du vide */}
      <rect x={x - w / 2 - 1.6} y={y - h - 2} width={w + 3.2} height={h + 2} fill="#c9bd9a" />
      <rect x={x - w / 2 - 1.6} y={y - h - 2} width={w + 3.2} height={1.4} fill="#efe6c9" />
      {/* le vide */}
      <path d={`M${x - w / 2},${y} L${x - w / 2},${y - h + 1.5} Q${x},${y - h - 1.4} ${x + w / 2},${y - h + 1.5} L${x + w / 2},${y} Z`} fill="#3a3428" />
      <path d={`M${x - w / 2},${y - h + 1.5} Q${x},${y - h - 1.4} ${x + w / 2},${y - h + 1.5} L${x + w / 2},${y - h + 3.4} Q${x},${y - h + 0.6} ${x - w / 2},${y - h + 3.4} Z`} fill="#241f16" />
      {/* sol de la galerie qui attrape un reste de lumière */}
      <path d={`M${x - w / 2 + 1},${y} L${x + w / 2 - 1},${y} L${x + w / 2 - 2.6},${y - 1.8} L${x - w / 2 + 2.6},${y - 1.8} Z`} fill="#7e7358" opacity={0.9} />
      {/* étais de bois */}
      <rect x={x - w / 2 - 0.4} y={y - h + 1} width={1.8} height={h - 1} fill="#7c5c3a" />
      <rect x={x - w / 2 - 0.4} y={y - h + 1} width={0.7} height={h - 1} fill="#ab8760" />
      <rect x={x + w / 2 - 1.4} y={y - h + 1} width={1.8} height={h - 1} fill="#5c4128" />
      <path d={`M${x - w / 2 - 1},${y - h + 1.4} L${x + w / 2 + 1},${y - h + 1.4} L${x + w / 2 + 0.2},${y - h - 0.2} L${x - w / 2 - 0.2},${y - h - 0.2} Z`} fill="#8a6440" />
      <path d={`M${x - w / 2 - 1},${y - h + 1.4} L${x + w / 2 + 1},${y - h + 1.4} L${x + w / 2 + 1},${y - h + 2.1} L${x - w / 2 - 1},${y - h + 2.1} Z`} fill="#4f3a22" opacity={0.8} />
    </g>
  )
}

// ── le front de taille ───────────────────────────────────────────────────────

type Banc = { X: number[]; arete: number[]; recul: number[]; ton: number }

/**
 * Falaise stratifiée. Chaque banc est peint du haut vers le bas de la paroi :
 * masse (valeur d'autant plus sombre qu'on monte : patine), DESSUS clair (il
 * reçoit le ciel), ombre franche du banc supérieur portée sur ce dessus,
 * arête vive. Les flancs de chaque assise s'évasent : pas d'empilement de
 * briques, une falaise qui prend du fruit.
 */
function FrontTaille({
  x0,
  x1,
  yPied,
  yBas,
  bancs,
  hb,
  seed,
  crete = true,
}: {
  x0: number
  x1: number
  yPied: number
  /** niveau du sol de la fosse : le banc de pied descend jusque‑là */
  yBas: number
  bancs: number
  hb: number
  seed: number
  crete?: boolean
}) {
  const rnd = alea(seed)
  const N = 6
  const liste: Banc[] = []
  let y = yPied
  for (let i = 0; i < bancs; i++) {
    const h = hb * (1 - i * 0.07) * (0.86 + rnd() * 0.28)
    const l = 1.1 + rnd() * 0.8
    // silhouette voulue : bord gauche presque droit, retrait franc à droite
    const gx0 = x0 + i * 1.1 + (rnd() - 0.5) * 2.6
    const gx1 = x1 - i * (x1 - x0) * 0.135 - (rnd() - 0.5) * 3
    const X = absc(gx0, gx1, N)
    const arete = profil(N, y - h, 0.55, rnd)
    const recul = arete.map((v) => v - l - rnd() * 0.4)
    liste.push({ X, arete, recul, ton: Math.min(3, Math.round((i / Math.max(1, bancs - 1)) * 3.4)) })
    y -= h + l
  }
  const solFosse = Array.from({ length: N + 1 }, () => yBas)
  const haut = liste[bancs - 1]
  const sommet = haut.recul.map((v) => v - 5 - rnd() * 3)

  return (
    <g>
      {/* couronnement de terre sèche : il coiffe la roche et l'assombrit par contraste */}
      {crete && (
        <g>
          <path d={bande(haut.X, sommet, haut.recul.map((v) => v + 0.8), 1.5)} fill="url(#car-terre)" />
          <path d={polyl(haut.X, sommet)} stroke="#c6b878" strokeWidth={1.4} opacity={0.75} fill="none" />
          <path d={polyl(haut.X, haut.recul.map((v) => v - 0.4))} stroke={PAL.ombrePortee} strokeWidth={1.6} opacity={0.28} fill="none" filter="url(#a-flou1)" />
        </g>
      )}

      {/* bancs, du plus haut (arrière) au plus bas (avant). La masse de chaque
          assise s'arrête au dessus de l'assise inférieure : son dégradé se lit
          alors en entier — clair sous l'arête, sombre au pied de la face. */}
      {liste
        .map((b, i) => ({ b, i }))
        .reverse()
        .map(({ b, i }) => {
          const bas = i > 0 ? liste[i - 1].recul.map((v) => v + 1.8) : solFosse
          // retour est : la paroi tourne le coin et s'enfonce dans la colline.
          // Le pan regarde l'est → il est dans l'ombre ; son dessus, horizontal,
          // reste aussi lumineux que celui de la face sud.
          const xr = b.X[b.X.length - 1]
          const yrT = b.recul[b.recul.length - 1]
          const yrA = b.arete[b.arete.length - 1]
          const yrB = bas[bas.length - 1]
          const d = 7 + ((i * 37) % 9)
          const dh = d * 0.45
          return (
            <g key={i}>
              <path d={`M${xr},${yrT} L${xr + d},${yrT - dh} L${xr + d},${yrB - dh} L${xr},${yrB} Z`} fill="url(#car-est)" />
              <path d={`M${xr},${yrT} L${xr + d},${yrT - dh} L${xr + d},${yrA - dh} L${xr},${yrA} Z`} fill={LIPS[b.ton]} opacity={0.88} />
              <path d={`M${xr},${yrT} L${xr + d},${yrT - dh}`} stroke={PAL.ombrePortee} strokeWidth={1.6} opacity={0.3} fill="none" filter="url(#a-flou1)" />
              <path d={bande(b.X, b.recul, bas, i > 0 ? 0.6 : 1.8)} fill={BANCS[b.ton]} />
              {/* dessus du banc : seule surface horizontale, la plus lumineuse */}
              <path d={bande(b.X, b.recul, b.arete)} fill={LIPS[b.ton]} />
              {/* arête d'angle sud/est : liseré sombre, jamais un contour */}
              <path d={polyl([xr - 0.6, xr - 0.6], [yrA, yrB])} stroke="#6b6149" strokeWidth={1.2} opacity={0.35} fill="none" />
              {/* ombre franche du surplomb, portée sur ce dessus et décalée SE */}
              <path d={polyl(b.X.map((v) => v + 1.4), b.recul.map((v) => v + 0.5))} stroke={PAL.ombrePortee} strokeWidth={2.1} opacity={0.36} fill="none" filter="url(#a-flou1)" />
              {/* arête vive dessus/face */}
              <path d={polyl(b.X, b.arete)} stroke="#fbf5e2" strokeWidth={0.8} opacity={0.5} fill="none" />
              {/* pied de face : contact sombre avec l'assise inférieure */}
              {i > 0 && (
                <path d={polyl(liste[i - 1].X, liste[i - 1].recul.map((v) => v - 0.8))} stroke="#655c48" strokeWidth={2.6} opacity={0.3} fill="none" filter="url(#a-flou1)" />
              )}
            </g>
          )
        })}

      {/* facettes : la paroi n'est pas un plan — deux pans tournés vers l'est,
          strictement contenus dans la silhouette de l'assise concernée */}
      {[0.26, 0.62].map((t, i) => {
        const b = liste[Math.min(bancs - 1, 1)]
        const bx0 = b.X[0]
        const bw = b.X[b.X.length - 1] - bx0
        const px = bx0 + 3 + t * (bw - 18)
        const pw = 8 + i * 4
        const yh = b.arete[2]
        return (
          <path key={t} d={`M${px},${yBas - 1} L${px + 2.2},${yh} L${px + pw},${yh + 3} L${px + pw + 3},${yBas - 1} Z`} fill="#5b5340" opacity={0.13} />
        )
      })}

      {/* fractures verticales : joint sombre, lèvre droite qui rattrape la lumière */}
      {(() => {
        const yB = Math.min(yPied + 2, liste[0].arete[2] + 4)
        const dur: string[] = []
        const clair: string[] = []
        for (let k = 0; k < 2 + Math.round(bancs / 2); k++) {
          const fx = x0 + 8 + rnd() * (x1 - x0 - 18)
          const dx = (rnd() - 0.5) * 4
          const yH = liste[1 + Math.floor(rnd() * (bancs - 1))].arete[2]
          dur.push(`M${fx.toFixed(1)},${yB.toFixed(1)} L${(fx + dx).toFixed(1)},${yH.toFixed(1)}`)
          clair.push(`M${(fx + 1.2).toFixed(1)},${yB.toFixed(1)} L${(fx + dx + 1.2).toFixed(1)},${(yH + 1.4).toFixed(1)}`)
        }
        return (
          <>
            <path d={dur.join(' ')} stroke="#5e5543" strokeWidth={1.5} opacity={0.42} fill="none" />
            <path d={clair.join(' ')} stroke="#f4edd8" strokeWidth={0.8} opacity={0.34} fill="none" />
          </>
        )
      })()}

      {/* cheminée : une diaclase franche traverse toute la falaise et casse le
          rythme des assises — sans elle, la paroi retombe en mille-feuille */}
      {(() => {
        const cx = x0 + (x1 - x0) * 0.44
        const yh = haut.recul[3]
        return (
          <g>
            <path d={`M${cx},${yBas} L${cx + 1.6},${yh} L${cx + 4.4},${yh} L${cx + 3.4},${yBas} Z`} fill="#5b5341" opacity={0.4} />
            <path d={`M${cx + 3.4},${yBas} L${cx + 4.4},${yh} L${cx + 5.8},${yh + 0.6} L${cx + 5},${yBas} Z`} fill="#f4edd8" opacity={0.28} />
          </g>
        )
      })()}

      {/* pénombre du fond de fosse : elle fait ressortir les blocs devant */}
      <path d={bande(liste[0].X, liste[0].arete.map((v) => v + 1.5), Array.from({ length: N + 1 }, () => yBas + 1), 2.6)} fill="url(#car-pied)" />

      {/* pied du front : occlusion au contact du sol, puis poussière calcaire */}
      <path
        d={bande(absc(x0, x1, 3), [yBas - 6, yBas - 7, yBas - 6.4, yBas - 5], [yBas + 2.4, yBas + 2.8, yBas + 2.6, yBas + 2])}
        fill={PAL.ombrePortee}
        opacity={0.22}
        filter="url(#a-flou2)"
      />
    </g>
  )
}

/** gradins d'extraction : dessus fraîchement scié (clair), contremarche ombrée */
function Gradins({
  x0,
  x1,
  y0,
  marches,
  hm,
  pm,
  inset,
  seed,
}: {
  x0: number
  x1: number
  y0: number
  marches: number
  hm: number
  pm: number
  inset: number
  seed: number
}) {
  const rnd = alea(seed)
  const rows: ReactNode[] = []
  for (let k = marches - 1; k >= 0; k--) {
    const yF = y0 - k * (hm + pm)
    // extrémités franchement inégales : une fosse s'attaque au hasard des veines
    const ax = x0 + k * inset * 0.55 + (rnd() - 0.2) * 7
    const bx = x1 - k * inset * 1.1 - (rnd() - 0.3) * 8
    const X = absc(ax, bx, 4)
    const tread = X.map(() => yF - hm - pm + (rnd() - 0.5) * 0.8)
    const nez = X.map(() => yF - hm + (rnd() - 0.5) * 0.7)
    rows.push(
      <g key={k}>
        {/* contremarche : franchement plus sombre que le dessus, sciée verticalement */}
        <path d={bande(X, nez, X.map(() => yF + 1.5), 1.8)} fill="url(#car-b3)" />
        <path
          d={[0.16, 0.36, 0.56, 0.76, 0.92].map((t) => `M${(ax + t * (bx - ax)).toFixed(1)},${(yF - hm + 0.8).toFixed(1)} l0.7,${(hm - 0.6).toFixed(1)}`).join(' ')}
          stroke="#6a6049"
          strokeWidth={0.8}
          opacity={0.45}
          fill="none"
        />
        {/* dessus du gradin : pierre fraîche, la plus claire */}
        <path d={bande(X, tread, nez)} fill="url(#car-frais)" />
        {/* ombre de la contremarche supérieure sur ce dessus */}
        <path d={polyl(X.map((v) => v + 1.8), tread.map((v) => v + 0.6))} stroke={PAL.ombrePortee} strokeWidth={2.8} opacity={0.36} fill="none" filter="url(#a-flou1)" />
        {/* nez de marche éclairé + son ombre au pied de la contremarche */}
        <path d={polyl(X, nez)} stroke="#fdf7e4" strokeWidth={1.1} opacity={0.7} fill="none" />
        <path d={polyl(X.map((v) => v + 1.2), X.map(() => yF + 0.6))} stroke={PAL.ombrePortee} strokeWidth={2} opacity={0.22} fill="none" filter="url(#a-flou1)" />
        {/* débris abandonnés sur le gradin : la marque du travail en cours */}
        {k < 2 && <Gravats x={(ax + bx) / 2 + (k % 2 ? -9 : 8)} y={yF - hm - 1.4} w={(bx - ax) * 0.5} h={pm * 0.5} n={3} seed={seed + k * 13} />}
      </g>,
    )
  }
  return <g>{rows}</g>
}

/** saignée d'extraction : bloc en cours de détachement dans la paroi */
function Saignee({ x, y, w = 18, h = 8, coins = true }: { x: number; y: number; w?: number; h?: number; coins?: boolean }) {
  return (
    <g>
      {/* tranchée de dégagement : joint sombre au pourtour */}
      <path d={`M${x - 2},${y + 1} L${x - 2},${y - h - 2.4} L${x + w + 2},${y - h - 2.4} L${x + w + 2},${y + 1}`} stroke="#584f3d" strokeWidth={3.2} opacity={0.6} fill="none" />
      {/* lit de sciage frais, plus clair que la roche patinée */}
      <rect x={x} y={y - h} width={w} height={h} fill="#e2d8ba" />
      <rect x={x} y={y - h} width={w} height={1.4} fill="#4f4838" opacity={0.45} />
      <rect x={x} y={y - h + 1.4} width={w} height={1.2} fill="#f4ecd3" opacity={0.7} />
      <rect x={x} y={y - h} width={1.6} height={h} fill="#5b5342" opacity={0.3} />
      <rect x={x} y={y - 1.4} width={w} height={1.4} fill="#5b5342" opacity={0.28} />
      <rect x={x + w - 1.4} y={y - h} width={1.4} height={h} fill="#f4ecd3" opacity={0.35} />
      <path
        d={`M${x + 2},${y - h + 1.2} l2,${h - 2.4} M${x + w * 0.36},${y - h + 1} l2,${h - 2.2} M${x + w * 0.68},${y - h + 1.4} l2,${h - 2.6}`}
        stroke="#9c9074"
        strokeWidth={0.7}
        opacity={0.35}
        fill="none"
      />
      {coins &&
        [0.16, 0.38, 0.6, 0.82].map((t) => (
          <rect key={t} x={x + t * w} y={y - h - 0.4} width={1.6} height={1.5} fill="#5f5745" opacity={0.8} />
        ))}
    </g>
  )
}

// ── pierre travaillée ────────────────────────────────────────────────────────

/**
 * Bloc équarri, trois faces : dessus clair, face avant en demi-teinte,
 * flanc est dans l'ombre. Traces de ciseau sur la face avant, AO au sol.
 */
function BlocPierre({
  x,
  y,
  w = 14,
  h = 8,
  p = 5,
  frais = true,
  coins = false,
  marque = false,
}: {
  x: number
  y: number
  w?: number
  h?: number
  p?: number
  frais?: boolean
  /** rangée de trous de coin sur le dessus */
  coins?: boolean
  /** marque de carrier à l'ocre rouge */
  marque?: boolean
}) {
  const dy = p * 0.45
  return (
    <g>
      <AOBase rx={w * 0.72} ry={w * 0.2} cx={x + 1} cy={y + 1} />
      <OmbreVolume w={w} h={h} x={x} y={y} o={0.16} />
      {/* flanc est — ombre */}
      <path d={`M${x + w / 2},${y} L${x + w / 2 + p},${y - dy} L${x + w / 2 + p},${y - h - dy} L${x + w / 2},${y - h} Z`} fill={frais ? '#95886a' : '#82755b'} />
      {/* face avant — demi-teinte */}
      <rect x={x - w / 2} y={y - h} width={w} height={h} fill={frais ? '#cdbf9a' : '#b6a884'} />
      <rect x={x - w / 2} y={y - h} width={w} height={h * 0.34} fill={frais ? '#ded2ae' : '#c6b995'} />
      {/* dessus — le plus clair */}
      <path d={`M${x - w / 2},${y - h} L${x + w / 2},${y - h} L${x + w / 2 + p},${y - h - dy} L${x - w / 2 + p},${y - h - dy} Z`} fill={frais ? '#f3ebd0' : '#ded2b0'} />
      {/* arêtes : vive en haut, liseré clair à gauche, contact sombre en bas */}
      <path
        d={`M${x - w / 2},${y - h} H${x + w / 2} M${x - w / 2 + 0.5},${y - h} V${y}`}
        stroke="#fbf5e0"
        strokeWidth={0.9}
        opacity={0.6}
        fill="none"
      />
      <path
        d={`M${x + w / 2 - 0.6},${y - h + 0.5} V${y} M${x - w / 2},${y - 0.6} H${x + w / 2}`}
        stroke="#736952"
        strokeWidth={1.1}
        opacity={0.38}
        fill="none"
      />
      {/* layure : le ciseau a laissé des sillons obliques, pas des joints */}
      <path
        d={`M${x - w / 2 + 1.6},${y - h + 1.4} l2.2,${h - 2.6} M${x - w / 2 + w * 0.3},${y - h + 1} l2.2,${h - 2.2} M${x - w / 2 + w * 0.52},${y - h + 1.6} l2.2,${h - 2.8} M${x - w / 2 + w * 0.74},${y - h + 1} l2.2,${h - 2.2}`}
        stroke="#a89c80"
        strokeWidth={0.7}
        opacity={0.3}
        fill="none"
      />
      <path
        d={`M${x - w / 2 + 3},${y - h - dy + 1.2} l${p * 0.55},${dy * 0.55} M${x + w / 2 - 4},${y - h - dy + 1.2} l${p * 0.55},${dy * 0.55}`}
        stroke="#d5cbae"
        strokeWidth={0.7}
        opacity={0.7}
        fill="none"
      />
      {/* trous de coin alignés : la pierre va être fendue */}
      {coins && (
        <path
          d={[0.22, 0.44, 0.66, 0.86].map((t) => `M${(x - w / 2 + t * w + p * 0.5).toFixed(1)},${(y - h - dy * 0.5).toFixed(1)} h1.1 v0.8 h-1.1 Z`).join(' ')}
          fill="#6b6149"
          opacity={0.45}
        />
      )}
      {/* marque de carrier tracée à l'ocre rouge : destination du bloc */}
      {marque && (
        <path
          d={`M${x - w / 2 + 2.4},${y - h * 0.78} l0,3.4 M${x - w / 2 + 4.4},${y - h * 0.78} l0,3.4 M${x - w / 2 + 6.4},${y - h * 0.78} l1.6,3.4 M${x - w / 2 + 9.6},${y - h * 0.78} l-1.6,3.4`}
          stroke="#a8503a"
          strokeWidth={0.9}
          opacity={0.7}
          fill="none"
        />
      )}
    </g>
  )
}

/** rocher brut non équarri : trois valeurs, silhouette anguleuse */
function Rocher({ x, y, s = 1, seed = 2 }: { x: number; y: number; s?: number; seed?: number }) {
  const rnd = alea(seed)
  const a = 1 + rnd() * 0.4
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2.5} cy={0.8} rx={9 * a} ry={2.8} fill={PAL.ombrePortee} opacity={0.17} filter="url(#a-flou1)" />
      <path d={`M-8,0 L-7,-5.5 L-2,-8.6 L${4 * a},-7.4 L7.4,-3 L6.6,0 Z`} fill="#b5a884" />
      <path d="M-8,0 L-7,-5.5 L-2,-8.6 L-1,-5 L-2.4,0 Z" fill="#d8ccab" />
      <path d={`M${4 * a},-7.4 L7.4,-3 L6.6,0 L2.6,0 L1.6,-5.6 Z`} fill="#7f7457" />
      <path d="M-7,-5.5 L-2,-8.6 L4,-7.4" stroke="#f4eeda" strokeWidth={0.7} opacity={0.5} fill="none" />
      <path d="M-4.6,-6.8 L-3.4,-1.4 M1.2,-7.6 L0.4,-1" stroke="#7e7460" strokeWidth={0.7} opacity={0.35} fill="none" />
    </g>
  )
}

/** coins de bois enfoncés dans une saignée : la roche va se fendre */
function CoinsBois({ x, y, n = 5, larg = 16 }: { x: number; y: number; n?: number; larg?: number }) {
  const pas = larg / (n - 1)
  return (
    <g>
      <path d={`M${x - 2},${y} h${larg + 4}`} stroke="#5f5745" strokeWidth={1.4} opacity={0.5} />
      <path d={`M${x - 2},${y + 1.1} h${larg + 4}`} stroke="#f2ead1" strokeWidth={0.7} opacity={0.35} />
      <path
        d={Array.from({ length: n }, (_, i) => `M${x + i * pas - 1.1},${y - 2} L${x + i * pas + 1.1},${y - 2} L${x + i * pas + 0.4},${y + 0.5} L${x + i * pas - 0.4},${y + 0.5} Z`).join(' ')}
        fill="#7d5c3a"
      />
      <path
        d={Array.from({ length: n }, (_, i) => `M${x + i * pas - 1.1},${y - 2} L${x + i * pas - 0.2},${y - 2} L${x + i * pas - 0.4},${y + 0.5} Z`).join(' ')}
        fill="#a38055"
      />
      <path
        d={Array.from({ length: n }, (_, i) => `M${x + i * pas - 1.2},${y - 2.5} h2.4 v0.6 h-2.4 Z`).join(' ')}
        fill="#c2a075"
      />
    </g>
  )
}

/** masse de tailleur posée contre la roche */
function Masse({ x, y, a = -22 }: { x: number; y: number; a?: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${a})`}>
      <ellipse cx={2} cy={0.6} rx={4} ry={1.3} fill={PAL.ombrePortee} opacity={0.16} />
      <line x1={0} y1={0} x2={0} y2={-11} stroke="url(#car-perche)" strokeWidth={1.8} />
      <rect x={-2.6} y={-14.2} width={5.2} height={3.6} rx={0.8} fill="#8b8271" />
      <rect x={-2.6} y={-14.2} width={5.2} height={1.2} rx={0.6} fill="#c9c2b2" />
      <rect x={-2.6} y={-11.4} width={5.2} height={0.8} fill="#5f5748" opacity={0.7} />
    </g>
  )
}

/** levier de fer appuyé contre un bloc */
function Levier({ x, y, a = -58 }: { x: number; y: number; a?: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${a})`}>
      <ellipse cx={1.6} cy={0.5} rx={3} ry={1} fill={PAL.ombrePortee} opacity={0.15} />
      <line x1={0} y1={0} x2={0.5} y2={-10.5} stroke="#7a7261" strokeWidth={1.5} />
      <line x1={-0.4} y1={-1} x2={0.1} y2={-10.2} stroke="#c0bba8" strokeWidth={0.6} opacity={0.8} />
      <path d="M0.4,-10.5 q2,-1.1 2.8,0.5" stroke="#8b8471" strokeWidth={1.4} fill="none" />
    </g>
  )
}

/** couffin d'osier plein d'éclats */
function Couffin({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={1.5} cy={0.6} rx={5} ry={1.6} fill={PAL.ombrePortee} opacity={0.17} />
      <path d="M-4.4,-5.6 L4.4,-5.6 L3,0 L-3,0 Z" fill="#9c7a4c" />
      <path d="M-4.4,-5.6 L-1.6,-5.6 L-1.4,0 L-3,0 Z" fill="#c19a63" />
      <path d="M-4.4,-4.4 h8.8 M-4,-2.6 h8" stroke="#7d5f3a" strokeWidth={0.7} opacity={0.7} />
      <ellipse cx={0} cy={-5.6} rx={4.4} ry={1.4} fill="#d5cbad" />
      <path d="M-2.6,-6.4 l1.4,-1 l1.6,0.8 l1.4,-1.2" stroke="#f0ead6" strokeWidth={1.1} fill="none" opacity={0.9} />
    </g>
  )
}

// ── charpente et engins ──────────────────────────────────────────────────────

/** échafaudage de perches ligaturées contre la paroi, plateau et échelle */
function Echafaudage({ x, y, h, w = 20, seed = 6 }: { x: number; y: number; h: number; w?: number; seed?: number }) {
  const rnd = alea(seed)
  const poteaux = [x, x + w * (0.48 + rnd() * 0.14), x + w]
  const plateau = y - h
  return (
    <g>
      {/* ombres portées sur la roche, décalées SE */}
      <path
        d={poteaux.map((px) => `M${(px + 2.6).toFixed(1)},${y} L${(px + 3.8).toFixed(1)},${(plateau + 1).toFixed(1)}`).join(' ')}
        stroke={PAL.ombrePortee}
        strokeWidth={2.4}
        opacity={0.2}
        filter="url(#a-flou1)"
        fill="none"
      />
      <path d={`M${x - 1},${plateau - 0.4} L${x + w + 4},${plateau - 0.4} l3.4,2.6 L${x + 2.4},${plateau + 2.2}Z`} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou1)" />
      {/* entretoises */}
      {[0.34, 0.68].map((t) => (
        <g key={t}>
          <line x1={x - 2} y1={y - h * t} x2={x + w + 2.4} y2={y - h * t - 1} stroke="#6b4c2e" strokeWidth={1.7} />
          <line x1={x - 2} y1={y - h * t - 0.6} x2={x + w + 2.4} y2={y - h * t - 1.6} stroke="#a8845d" strokeWidth={0.7} opacity={0.9} />
        </g>
      ))}
      <line x1={x + 0.5} y1={y - 1} x2={x + w - 1} y2={plateau + 2} stroke="#7c5c3a" strokeWidth={1.3} opacity={0.95} />
      {/* poteaux + ligatures */}
      <path d={poteaux.map((px) => `M${px},${y + 1} L${(px + 1.2).toFixed(1)},${plateau}`).join(' ')} stroke="url(#car-perche)" strokeWidth={2.4} fill="none" />
      <path d={poteaux.map((px) => `M${(px - 1.6).toFixed(1)},${y + 1.2} a2.6,1 0 0 0 5.2,0 a2.6,1 0 0 0 -5.2,0 Z`).join(' ')} fill={PAL.ombrePortee} opacity={0.22} />
      <path
        d={poteaux.map((px, i) => `M${(px + 0.3).toFixed(1)},${(y - h * 0.34 - i * 0.2).toFixed(1)} L${(px + 2.7).toFixed(1)},${(y - h * 0.34 - 0.6 - i * 0.2).toFixed(1)}`).join(' ')}
        stroke="#4f3a22"
        strokeWidth={1}
        opacity={0.8}
        fill="none"
      />
      {/* plateau de planches : dessus clair, tranche dans l'ombre */}
      <path d={`M${x - 3},${plateau} L${x + w + 5},${plateau} L${x + w + 7.4},${plateau - 2.2} L${x - 0.8},${plateau - 2.2} Z`} fill="#c19a63" />
      <path d={`M${x - 3},${plateau} L${x + w + 5},${plateau} L${x + w + 5},${plateau + 1.8} L${x - 3},${plateau + 1.8} Z`} fill="#6b4c2e" />
      {[0.3, 0.6].map((t) => (
        <line key={t} x1={x - 3 + t * (w + 8) + 2} y1={plateau} x2={x - 0.8 + t * (w + 8) + 2} y2={plateau - 2.2} stroke="#9c7a4c" strokeWidth={0.7} opacity={0.8} />
      ))}
      {/* échelle appuyée */}
      <line x1={x + w * 0.22} y1={y + 1} x2={x + w * 0.5} y2={plateau - 1} stroke="#8a6440" strokeWidth={1.4} />
      <line x1={x + w * 0.36} y1={y + 1} x2={x + w * 0.64} y2={plateau - 1} stroke="#a8845d" strokeWidth={1.4} />
      {Array.from({ length: 5 }, (_, i) => {
        const t = (i + 0.5) / 5
        return <line key={i} x1={x + w * 0.22 + t * (w * 0.28)} y1={y + 1 - t * (h + 2)} x2={x + w * 0.36 + t * (w * 0.28)} y2={y + 1 - t * (h + 2)} stroke="#c19a63" strokeWidth={0.9} />
      })}
      {/* outil oublié sur le plateau */}
      <rect x={x + w * 0.66} y={plateau - 3.4} width={4.6} height={1.4} rx={0.5} fill="#a89e84" />
      <line x1={x + 2} y1={plateau - 1.2} x2={x + 7} y2={plateau - 3.4} stroke={PAL.boisMi} strokeWidth={1.1} />
    </g>
  )
}

/**
 * Rampe de roche : le remblai d'éboulis qui monte du sol de la fosse au banc
 * d'exploitation. Chaussée poussiéreuse éclairée, flanc sud en demi-teinte,
 * pied noyé dans les gravats. C'est elle qui referme l'angle droit de la fosse.
 */
function RampeRoche({ xa, ya, xb, yb, seed = 9 }: { xa: number; ya: number; xb: number; yb: number; seed?: number }) {
  return (
    <g>
      {/* masse du remblai, de la chaussée jusqu'au sol */}
      <path d={`M${xa},${ya} L${xb},${yb} L${xb + 7},${yb + 3.4} L${xa + 5},${yb + 3.4} Z`} fill="url(#car-b3)" />
      <path d={`M${xa + 5},${yb + 3.4} L${xb + 7},${yb + 3.4}`} stroke="#5e5541" strokeWidth={1.6} opacity={0.4} />
      {/* chaussée : bande claire de poussière tassée */}
      <path d={`M${xa - 2},${ya + 0.6} L${xb + 6},${yb + 1.4} L${xb + 6},${yb - 2.6} L${xa - 2},${ya - 3.4} Z`} fill="#cdbe97" />
      <path d={`M${xa - 2},${ya - 3.4} L${xb + 6},${yb - 2.6}`} stroke="#ede4c6" strokeWidth={1.1} opacity={0.45} />
      <path d={`M${xa + 1},${ya - 0.6} L${xb + 6},${yb + 0.2}`} stroke="#e6dcbb" strokeWidth={1} opacity={0.35} />
      {/* ombre du remblai au sol, vers le SE */}
      <path d={`M${xa + 5},${yb + 3} L${xb + 7},${yb + 3} L${xb + 11},${yb + 6.4} L${xa + 9},${yb + 6.4} Z`} fill={PAL.ombrePortee} opacity={0.17} filter="url(#a-flou2)" />
      {/* rondins de halage en travers de la chaussée */}
      {(() => {
        // rondins posés EN TRAVERS de la chaussée : la normale à la pente
        const vx = xb + 8 - xa
        const vy = yb + 2.8 - ya
        const L = Math.hypot(vx, vy) || 1
        const seg = (dy: number) =>
          Array.from({ length: 6 }, (_, i) => {
            const t = (i + 0.5) / 6
            const px = xa - 2 + vx * t
            const py = ya - 1.4 + vy * t + dy
            const nx = (-vy / L) * 3.4
            const ny = (vx / L) * 3.4
            return `M${(px - nx).toFixed(1)},${(py - ny).toFixed(1)} L${(px + nx).toFixed(1)},${(py + ny).toFixed(1)}`
          }).join(' ')
        return (
          <>
            <path d={seg(0.5)} stroke="#6b5236" strokeWidth={1.8} opacity={0.5} fill="none" />
            <path d={seg(0)} stroke="#96794f" strokeWidth={1.7} opacity={0.85} fill="none" />
            <path d={seg(-0.7)} stroke="#b39468" strokeWidth={0.7} opacity={0.6} fill="none" />
          </>
        )
      })()}
      <Gravats x={(xa + xb) / 2 + 4} y={yb + 2} w={Math.abs(xb - xa) * 0.8} h={5} n={4} seed={seed} />
    </g>
  )
}

/** rampe de halage : chemin de rondins sur remblai, plus large vers le joueur */
function Rampe({ xa, ya, xb, yb, wa = 10, wb = 17, seed = 8 }: { xa: number; ya: number; xb: number; yb: number; wa?: number; wb?: number; seed?: number }) {
  const rnd = alea(seed)
  const n = 8
  const bas: string[] = []
  const corps: string[] = []
  const haut: string[] = []
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    const px = xa + (xb - xa) * t + (rnd() - 0.5) * 1.4
    const py = ya + (yb - ya) * t
    const hw = (wa + (wb - wa) * t) / 2
    bas.push(`M${(px - hw + 1).toFixed(1)},${(py + 0.5).toFixed(1)} L${(px + hw - 1).toFixed(1)},${(py + 1.8).toFixed(1)}`)
    corps.push(`M${(px - hw + 1).toFixed(1)},${(py - 0.4).toFixed(1)} L${(px + hw - 1).toFixed(1)},${(py + 0.9).toFixed(1)}`)
    haut.push(`M${(px - hw + 1).toFixed(1)},${(py - 1.1).toFixed(1)} L${(px + hw - 1).toFixed(1)},${(py + 0.2).toFixed(1)}`)
  }
  const traverses = (
    <>
      <path d={bas.join(' ')} stroke="#5c4128" strokeWidth={1.8} opacity={0.28} fill="none" />
      <path d={corps.join(' ')} stroke="#93794f" strokeWidth={1.9} opacity={0.9} fill="none" />
      <path d={haut.join(' ')} stroke="#b99a6c" strokeWidth={0.8} opacity={0.65} fill="none" />
    </>
  )
  return (
    <g>
      {/* remblai en deux tons, rive gauche éclairée, ombre portée en aval */}
      <path d={`M${xa},${ya + wa / 2 + 1.5} L${xb},${yb + wb / 2 + 2} L${xb},${yb + wb / 2 + 5} L${xa},${ya + wa / 2 + 3.4} Z`} fill={PAL.ombrePortee} opacity={0.17} filter="url(#a-flou2)" />
      <path d={`M${xa},${ya - wa / 2 - 1} L${xb},${yb - wb / 2 - 1} L${xb},${yb + wb / 2 + 2} L${xa},${ya + wa / 2 + 1.5} Z`} fill="#a1936c" opacity={0.9} />
      <path d={`M${xa},${ya - wa / 2 - 1} L${xb},${yb - wb / 2 - 1} L${xb},${yb - wb / 2 + 2.2} L${xa},${ya - wa / 2 + 1.4} Z`} fill="#cfc29a" opacity={0.9} />
      {traverses}
      {/* longrines de rive */}
      <line x1={xa} y1={ya - wa / 2} x2={xb} y2={yb - wb / 2} stroke="#7c5c3a" strokeWidth={1.6} />
      <line x1={xa} y1={ya - wa / 2 - 0.8} x2={xb} y2={yb - wb / 2 - 0.8} stroke="#bd9765" strokeWidth={0.8} />
      <line x1={xa} y1={ya + wa / 2} x2={xb} y2={yb + wb / 2} stroke="#6b4c2e" strokeWidth={1.7} />
    </g>
  )
}

/** traîneau à blocs sur rondins, cordes de halage tendues vers la rampe */
function Traineau({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={3} cy={2.4} rx={19} ry={5} fill={PAL.ombrePortee} opacity={0.18} filter="url(#a-flou2)" />
      <path d={[-11, 0, 11].map((rx) => `M${rx - 4},0 a4,1.6 0 0 1 8,0 a4,1.6 0 0 1 -8,0 Z`).join(' ')} fill="#7c5c3a" />
      <path d={[-11, 0, 11].map((rx) => `M${rx - 3.6},-1 a3.6,0.8 0 0 1 7.2,0 Z`).join(' ')} fill="#b98f60" />
      <path d="M-16,-2 L15,-2 L17.6,-4.2 L-14.6,-4.2 Z" fill="#8a6440" />
      <path d="M-16,-4.2 L15,-4.2 L15,-6 L-16,-6 Z" fill="#6b4c2e" />
      <path d="M-14.6,-4.2 L17.6,-4.2 L17.6,-5.4 L-14.6,-5.4 Z" fill="#a8845d" />
      <BlocPierre x={0} y={-5.6} w={20} h={9} p={5.5} coins />
      <path d="M-7,-14.8 L-6.4,-5.4 M7,-15 L7.6,-5.6" stroke="#6b5a3c" strokeWidth={1.3} opacity={0.85} />
      <path d="M-7.4,-14.8 L-6.8,-5.4" stroke="#a89468" strokeWidth={0.5} opacity={0.8} />
      <path d="M-16,-3 C-24,-2 -30,0.4 -37,1.6" stroke="#8b7a54" strokeWidth={1.5} fill="none" />
      <path d="M-16,-1.4 C-24,-0.4 -31,2 -38,3.4" stroke="#a89468" strokeWidth={1.2} fill="none" />
      <path d="M-16,-3.4 C-24,-2.4 -30,0 -37,1.2" stroke="#c7b68c" strokeWidth={0.6} fill="none" opacity={0.8} />
    </g>
  )
}

/** chèvre de levage : bipode ligaturé, moufle et bloc suspendu */
function Chevre({ x, y, h = 30 }: { x: number; y: number; h?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={2} cy={1.4} rx={13} ry={4} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou2)" />
      <line x1={-9} y1={0} x2={-1.4} y2={-h} stroke="url(#car-perche)" strokeWidth={2.6} />
      <line x1={9} y1={1} x2={1} y2={-h} stroke="#6b4c2e" strokeWidth={2.6} />
      <line x1={16} y1={4} x2={1.6} y2={-h + 1} stroke="#7c5c3a" strokeWidth={1.6} opacity={0.9} />
      <line x1={-6} y1={-h * 0.45} x2={6.4} y2={-h * 0.45 + 1} stroke="#8a6440" strokeWidth={1.5} />
      <line x1={-2.6} y1={-h + 1.4} x2={2.4} y2={-h + 1.4} stroke="#4f3a22" strokeWidth={1.8} />
      <circle cx={-0.4} cy={-h + 4} r={2.1} fill="#8b8271" />
      <circle cx={-0.4} cy={-h + 4} r={0.9} fill="#5f5748" />
      <line x1={-0.4} y1={-h + 5.8} x2={-0.4} y2={-19} stroke="#8b7a54" strokeWidth={1.2} />
      <line x1={-0.9} y1={-h + 5.8} x2={-0.9} y2={-19} stroke="#c7b68c" strokeWidth={0.5} opacity={0.8} />
      <path d="M-6,-20 L5,-20 L3.6,-17.6 L-4.6,-17.6 Z" fill="#8b7a54" opacity={0.9} />
      <BlocPierre x={-0.4} y={-11} w={10} h={6.5} p={3.6} />
      <rect x={7} y={-5.4} width={9} height={3.6} rx={1.4} fill="#7c5c3a" />
      <rect x={7} y={-5.4} width={9} height={1.3} rx={0.6} fill="#b98f60" />
      <line x1={16} y1={-3.6} x2={19} y2={-6.4} stroke="#6b4c2e" strokeWidth={1.4} />
    </g>
  )
}

/** fût de colonne couché sur cales : cylindre cannelé, lit d'attente visible */
function FutCouche({ x, y, L = 34, r = 5, a = -4 }: { x: number; y: number; L?: number; r?: number; a?: number }) {
  const cann = [-1.52, -1.14, -0.76, -0.36, 0.04]
  return (
    <g transform={`translate(${x},${y}) rotate(${a})`}>
      <ellipse cx={L * 0.5 + 3} cy={1.8} rx={L * 0.56} ry={r * 0.7} fill={PAL.ombrePortee} opacity={0.18} filter="url(#a-flou2)" />
      <path d={[L * 0.16, L * 0.8].map((cx) => `M${cx - 4},0.6 L${cx + 4},0.6 L${cx + 2.6},-3 L${cx - 2.6},-3 Z`).join(' ')} fill="#7c5c3a" />
      <path d={[L * 0.16, L * 0.8].map((cx) => `M${cx - 4},0.6 L${cx - 1.6},0.6 L${cx - 2.6},-3 Z`).join(' ')} fill="#b98f60" />
      <rect x={0} y={-2 * r} width={L} height={2 * r} fill="url(#car-tambour)" />
      <ellipse cx={0} cy={-r} rx={2.6} ry={r} fill="#a1977c" />
      <path d={cann.map((k) => `M2.4,${(-r + k * r).toFixed(1)} H${(L - 3).toFixed(1)}`).join(' ')} stroke="#7f7457" strokeWidth={0.9} opacity={0.5} fill="none" />
      <path d={cann.map((k) => `M2.4,${(-r + k * r + 0.7).toFixed(1)} H${(L - 3).toFixed(1)}`).join(' ')} stroke="#f4eeda" strokeWidth={0.5} opacity={0.35} fill="none" />
      <ellipse cx={L} cy={-r} rx={3.2} ry={r} fill="url(#a-cyl-pierre)" />
      <ellipse cx={L} cy={-r} rx={2} ry={r * 0.62} fill="none" stroke="#a89e84" strokeWidth={0.6} opacity={0.8} />
      <rect x={L - 0.9} y={-r - 1.1} width={1.8} height={2.2} fill="#5f5745" opacity={0.8} />
      <line x1={1.5} y1={-2 * r + 0.6} x2={L - 1.5} y2={-2 * r + 0.6} stroke="#fbf6e6" strokeWidth={0.9} opacity={0.5} />
    </g>
  )
}

/** tambour de colonne debout : lit supérieur en ellipse, trou de louve */
function Tambour({ x, y, r = 6, h = 9 }: { x: number; y: number; r?: number; h?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={r * 1.5} ry={r * 0.6} cx={1} cy={1} />
      <OmbreVolume w={r * 2} h={h} o={0.16} />
      <path d={`M${-r},0 L${-r},${-h} A${r},${r * 0.42} 0 0 1 ${r},${-h} L${r},0 A${r},${r * 0.42} 0 0 0 ${-r},0 Z`} fill="url(#a-cyl-pierre)" />
      <ellipse cx={0} cy={-h} rx={r} ry={r * 0.42} fill="#ebe2c6" />
      <ellipse cx={0} cy={-h} rx={r * 0.6} ry={r * 0.26} fill="none" stroke="#b7ac90" strokeWidth={0.7} />
      <rect x={-1} y={-h - 0.9} width={2} height={1.8} fill="#5f5745" opacity={0.8} />
      <path d={`M${-r + 1},${-h * 0.55} a${r},${r * 0.42} 0 0 0 ${2 * r - 2},0`} stroke="#8f8468" strokeWidth={0.7} fill="none" opacity={0.5} />
    </g>
  )
}

/** obélisque en cours de détachement : tranchées de dégagement autour du monolithe */
function Obelisque({ x, y, L = 36, w = 9, a = -6 }: { x: number; y: number; L?: number; w?: number; a?: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${a})`}>
      {/* tranchée arrière : creux sombre, lèvre supérieure éclairée */}
      <path d={`M-3,${-w - 5} L${L + 6},${-w - 5} L${L + 6},${-w - 1.2} L-3,${-w - 1.2} Z`} fill="#6f6551" />
      <path d={`M-3,${-w - 5} L${L + 6},${-w - 5} L${L + 6},${-w - 4} L-3,${-w - 4} Z`} fill="#ddd3b4" opacity={0.75} />
      {/* tranchée avant */}
      <path d={`M-3,4 L${L + 6},4 L${L + 6},0 L-3,0 Z`} fill="#8b8065" />
      <path d={`M-3,4 L${L + 6},4 L${L + 6},4.9 L-3,4.9 Z`} fill="#d5cbad" opacity={0.6} />
      {/* monolithe : dessus clair, face avant demi-teinte, bout est ombré */}
      <path d={`M0,${-w} L${L},${-w} L${L + 3.4},${-w - 2.2} L3.4,${-w - 2.2} Z`} fill="#f0e8cd" />
      <path d={`M0,${-w} L${L},${-w} L${L},0 L0,0 Z`} fill="#d5caa9" />
      <path d={`M${L},${-w} L${L + 3.4},${-w - 2.2} L${L + 3.4},${-2.2} L${L},0 Z`} fill="#9e9377" />
      {/* pyramidion amorcé */}
      <path d={`M${L},${-w} L${L + 9},${-w * 0.5} L${L + 9},${-w * 0.38} L${L},0 Z`} fill="#c9be9d" />
      <path d={`M${L},${-w} L${L + 9},${-w * 0.5} L${L + 11},${-w * 0.66} L${L + 3.4},${-w - 2.2} Z`} fill="#e7dfc4" />
      <line x1={0} y1={-w} x2={L} y2={-w} stroke="#fdf8e8" strokeWidth={1} opacity={0.7} />
      <path d={[0.1, 0.28, 0.46, 0.64, 0.82].map((t) => `M${(3 + t * (L - 6)).toFixed(1)},${(-w + 1.2).toFixed(1)} l2.2,${(w - 2.4).toFixed(1)}`).join(' ')} stroke="#a89c80" strokeWidth={0.7} opacity={0.28} fill="none" />
      {[0.18, 0.38, 0.58, 0.78].map((t) => (
        <rect key={t} x={4 + t * (L - 6)} y={-w - 1.6} width={1.2} height={0.9} fill="#5f5745" opacity={0.5} />
      ))}
    </g>
  )
}

// ── la carrière ──────────────────────────────────────────────────────────────

export function Carriere({ n }: { n: number }) {
  const p = [
    { x0: -34, x1: 20, bancs: 3, hb: 5.8, sol: 2, marches: 0 },
    { x0: -44, x1: 26, bancs: 4, hb: 6.2, sol: 2, marches: 0 },
    { x0: -54, x1: 30, bancs: 4, hb: 7.2, sol: 3, marches: 2 },
    { x0: -64, x1: 36, bancs: 5, hb: 7.4, sol: 4, marches: 3 },
  ][Math.min(3, Math.max(0, n - 1))]

  const hm = 4.2
  const pm = 4.6
  const yPied = p.sol - p.marches * (hm + pm) - (p.marches ? 2.5 : 4)
  const hTot = p.bancs * (p.hb + 2)
  const rayon = (p.x1 - p.x0) * 0.6 + 14

  return (
    <g>
      <DefsCarriere />

      {/* ── sol : terre battue, puis poussière calcaire de plus en plus pâle ── */}
      <ellipse cx={4} cy={p.sol + 3} rx={rayon + 6} ry={(rayon + 6) * 0.25} fill="#9a8c5c" opacity={0.75} />
      <ellipse cx={0} cy={p.sol + 1} rx={rayon} ry={rayon * 0.23} fill="#bcae79" opacity={0.9} />
      <ellipse cx={-4} cy={p.sol - 2} rx={rayon * 0.72} ry={rayon * 0.18} fill="#d2c79f" opacity={0.85} />
      {/* halo de poussière calcaire : le sol pâlit à l'approche du front */}
      <ellipse cx={(p.x0 + p.x1) / 2 - 2} cy={p.sol + 1} rx={(p.x1 - p.x0) * 0.44} ry={9} fill="url(#car-poussiere)" />
      {/* ombre portée de tout le massif sur le carreau, vers le sud‑est */}
      <path
        d={`M${p.x0 + 8},${p.sol - 1} L${p.x1 - 2},${p.sol - 2} L${p.x1 + 20},${p.sol + 11} L${p.x0 + 24},${p.sol + 14} Z`}
        fill={PAL.ombrePortee}
        opacity={0.17}
        filter="url(#a-flou4)"
      />

      {/* ── LE FRONT DE TAILLE ── */}
      <FrontTaille x0={p.x0} x1={p.x1} yPied={yPied} yBas={p.marches ? yPied + 5 : p.sol + 3} bancs={p.bancs} hb={p.hb} seed={n * 11 + 3} />

      {/* garrigue rase sur la crête : elle donne l'échelle de la falaise */}
      <Garrigue x={p.x0 + 6} y={yPied - hTot - 4} s={0.8} />
      {n >= 3 && <Garrigue x={p.x0 + 22} y={yPied - hTot - 2} s={1} />}

      {/* ── galerie taillée dans le banc de pied : la valeur sombre de la scène ── */}
      {n >= 2 && <Galerie x={p.x0 + (n >= 3 ? 34 : 38)} y={yPied + 2} w={n >= 3 ? 13 : 12} h={n >= 3 ? 10 : 9.5} />}

      {/* ── remblai d'accès : il monte du sol de la fosse au banc d'exploitation ── */}
      {p.marches > 0 && <RampeRoche xa={p.x1 - 16} ya={yPied + 6} xb={p.x1 + 12} yb={p.sol + 6} seed={n * 9} />}

      {/* ── gradins d'extraction, décalés vers la partie haute du front ── */}
      {p.marches > 0 && (
        <Gradins x0={p.x0 + 4} x1={p.x1 - 15} y0={p.sol} marches={p.marches} hm={hm} pm={pm} inset={7} seed={n * 7 + 1} />
      )}

      {/* ombre de la paroi projetée sur le dessus du gradin supérieur */}
      {p.marches > 0 && (
        <path
          d={`M${p.x0 + 8},${yPied + 2} L${p.x1 - 16},${yPied + 2} L${p.x1 - 12},${yPied + 6} L${p.x0 + 12},${yPied + 6} Z`}
          fill={PAL.ombrePortee}
          opacity={0.26}
          filter="url(#a-flou2)"
        />
      )}

      {/* ── talus d'éboulis aux deux bouts du front ── */}
      <Talus x={p.x0 - 1} y={p.marches ? yPied + 7 : p.sol + 3} w={22 + p.bancs * 2} h={8 + p.bancs} seed={n * 4 + 1} />
      {p.marches === 0 && <Talus x={p.x1 + 3} y={p.sol + 2} w={18 + p.bancs} h={7 + p.bancs} seed={n * 4 + 8} />}

      {/* empreintes des blocs enlevés dans le sol de la fosse */}
      {n >= 2 && <Empreintes x={p.x0 + 14} y={p.sol + 7} seed={n * 6 + 2} />}

      {/* ── niveau 1 : la veine attaquée aux coins de bois ── */}
      {n === 1 && (
        <g>
          <Saignee x={-22} y={yPied - 1} w={18} h={7} />
          <CoinsBois x={-22} y={yPied + 6.5} n={5} larg={17} />
          <Masse x={-6} y={p.sol + 2} a={-52} />
          <Levier x={22} y={p.sol + 3} a={-64} />
          <Rocher x={-38} y={p.sol + 6} s={0.9} seed={4} />
          <Rocher x={28} y={p.sol + 3} s={0.75} seed={9} />
          <BlocPierre x={0} y={10} w={16} h={7} p={5} coins />
          <Couffin x={24} y={p.sol + 9} s={0.95} />
          <Gravats x={-12} y={p.sol + 6} w={40} h={9} n={9} seed={5} />
        </g>
      )}

      {/* ── niveau 2 : échafaudage sur la paroi, rampe de halage ── */}
      {n >= 2 && (
        <g>
          <Echafaudage x={p.x0 + 4} y={yPied + 4} h={hTot * (n >= 3 ? 0.5 : 0.44)} w={22} seed={n * 5} />
          {/* niveau 2 : la piste de halage quitte la fosse à plat */}
          {p.marches === 0 && <Rampe xa={p.x1 + 2} ya={p.sol + 4} xb={p.x1 + 20} yb={p.sol + 13} wa={10} wb={15} seed={n * 3 + 2} />}
        </g>
      )}
      {n === 2 && (
        <g>
          <Saignee x={6} y={yPied - 1} w={18} h={8} />
          <CoinsBois x={8} y={yPied + 7.5} n={5} larg={17} />
          <Masse x={12} y={p.sol + 3} a={-48} />
          <BlocPierre x={0} y={10} w={17} h={8} p={5.5} coins />
          <BlocPierre x={24} y={p.sol + 9} w={13} h={7} p={4.5} />
          <Couffin x={14} y={p.sol + 13} s={1} />
          <Levier x={-8} y={p.sol + 6} a={-52} />
          <Gravats x={-16} y={p.sol + 8} w={44} h={10} n={9} seed={7} />
        </g>
      )}

      {/* ── niveau 3 : blocs calibrés, traîneau sur rondins ── */}
      {n === 3 && (
        <g>
          <Saignee x={-18} y={p.sol - (hm + pm)} w={22} h={4} coins={false} />
          <CoinsBois x={-16} y={p.sol - (hm + pm) - 4.6} n={5} larg={18} />
          <Traineau x={26} y={p.sol + 14} s={0.9} />
          <BlocPierre x={0} y={10} w={18} h={8} p={5.5} coins marque />
          <BlocPierre x={-34} y={15} w={16} h={7.5} p={5} />
          <BlocPierre x={-48} y={p.sol + 11} w={14} h={7} p={4.5} />
          <BlocPierre x={-48} y={p.sol + 4} w={12} h={6} p={4} frais={false} />
          <Masse x={-2} y={p.sol + 5} a={-50} />
          <Levier x={-40} y={p.sol + 14} a={-58} />
          <Couffin x={12} y={p.sol + 15} s={1} />
          <Gravats x={-12} y={p.sol + 9} w={54} h={12} n={10} seed={9} />
          <path d="M2,18 C 14,20 26,23 38,26" stroke="#e4dbbe" strokeWidth={1.7} opacity={0.4} fill="none" />
          <path d="M2,22 C 14,24 26,26 38,29" stroke="#e4dbbe" strokeWidth={1.5} opacity={0.32} fill="none" />
        </g>
      )}

      {/* ── niveau 4 : obélisque en cours, fûts en attente, chèvre de levage ── */}
      {n >= 4 && (
        <g>
          <Saignee x={-26} y={p.sol - 2 * (hm + pm)} w={24} h={4} coins={false} />
          <CoinsBois x={-24} y={p.sol - 2 * (hm + pm) - 4.6} n={5} larg={20} />
          <Obelisque x={-56} y={15} L={27} w={8} a={-8} />
          <FutCouche x={-56} y={25} L={31} r={5} a={-3} />
          <Tambour x={-13} y={24} r={6} h={9.5} />
          <Chevre x={20} y={p.sol + 8} h={33} />
          <BlocPierre x={2} y={11} w={19} h={8.5} p={6} coins marque />
          <BlocPierre x={-32} y={13} w={17} h={8} p={5} />
          <Traineau x={44} y={p.sol + 15} s={0.8} />
          <Masse x={-8} y={p.sol + 6} a={-50} />
          <Couffin x={14} y={p.sol + 16} s={1} />
          <Gravats x={-6} y={p.sol + 12} w={58} h={14} n={10} seed={12} />
          <path d="M8,20 C 22,22 34,25 46,28" stroke="#e4dbbe" strokeWidth={1.8} opacity={0.4} fill="none" />
          <path d="M8,24 C 22,26 34,28 46,31" stroke="#e4dbbe" strokeWidth={1.5} opacity={0.32} fill="none" />
        </g>
      )}
    </g>
  )
}
