import type { ReactNode } from 'react'

/*
 * ═══════════════════════════ BIBLE VISUELLE ═══════════════════════════
 * Style : peint réaliste méditerranéen (Age of Empires / Zeus).
 * Le volume vient de la LUMIÈRE, jamais de contours noirs.
 *
 * Conventions absolues - tout composant d'art les respecte :
 *  · Soleil au NORD-OUEST (haut-gauche). Faces ouest et pans de toit
 *    gauches ÉCLAIRÉS ; faces est et pans droits DANS L'OMBRE ; façades
 *    sud en demi-teinte.
 *  · Ombres portées projetées vers le SUD-EST : +x, +y×0.42 - douces
 *    (flou), couleur terre (#241a08), opacité 0.14-0.2.
 *  · Occlusion ambiante à la base de tout volume posé au sol (AOBase).
 *  · Ancre bâtiment : (0,0) = centre du pied. Boîte maximale :
 *    x ∈ [-135, 135], y ∈ [-100, +32] (le clip des chantiers en dépend).
 *  · JAMAIS de Math.random() dans un render (re-rendu 4×/s) : utiliser
 *    alea(seed) - déterministe, stable d'un rendu à l'autre.
 *  · Liserés fins autorisés uniquement dans la teinte sombre du matériau
 *    (jamais #000). Épaisseur ≤ 1.
 *  · IDs de defs préfixés « a- » (bible) ou par domaine (« t- » temple…).
 *  · Budget : ≤ ~400 nœuds SVG par bâtiment au niveau 4.
 */

/** PRNG déterministe (mulberry32) - remplace Math.random dans les renders */
export function alea(seed: number): () => number {
  let a = (seed * 1_000_003) >>> 0 || 7
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Palette maîtresse - s'y tenir pour que la carte reste UNE peinture */
export const PAL = {
  // stuc / enduit chaulé
  stucLit: '#f2e7cd',
  stucMi: '#ddc9a4',
  stucOmbre: '#b39a72',
  // pierre calcaire
  pierreLit: '#ddd5c2',
  pierreMi: '#bcb29b',
  pierreOmbre: '#948a72',
  pierreJoint: '#7e7460',
  // marbre
  marbreLit: '#f6f1e4',
  marbreOmbre: '#cfc7b2',
  // terracotta (toits)
  toitLit: '#cf7850',
  toitMi: '#b55f3c',
  toitOmbre: '#8e4a2e',
  toitArete: '#e89a6e',
  // chaume
  chaumeLit: '#d9bd7c',
  chaumeOmbre: '#a5854a',
  // bois
  boisLit: '#a8845d',
  boisMi: '#836342',
  boisOmbre: '#5f462d',
  // divers
  or: '#d9b25a',
  ombrePortee: '#241a08',
  peau: '#d9a97c',
} as const

/**
 * Défs partagées de la bible - à monter UNE fois dans chaque <svg> de scène
 * (VillageMap, scène d'expédition, aperçus).
 */
export function DefsArt() {
  return (
    <>
      {/* ── matériaux : version éclairée (-l) et ombrée (-o) ── */}
      <linearGradient id="a-stuc-l" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PAL.stucLit} />
        <stop offset="100%" stopColor={PAL.stucMi} />
      </linearGradient>
      <linearGradient id="a-stuc-o" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c5ac83" />
        <stop offset="100%" stopColor={PAL.stucOmbre} />
      </linearGradient>
      <linearGradient id="a-pierre-l" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PAL.pierreLit} />
        <stop offset="100%" stopColor={PAL.pierreMi} />
      </linearGradient>
      <linearGradient id="a-pierre-o" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a89e86" />
        <stop offset="100%" stopColor={PAL.pierreOmbre} />
      </linearGradient>
      <linearGradient id="a-marbre-l" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PAL.marbreLit} />
        <stop offset="100%" stopColor="#e2dac6" />
      </linearGradient>
      <linearGradient id="a-marbre-o" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ddd5c0" />
        <stop offset="100%" stopColor={PAL.marbreOmbre} />
      </linearGradient>
      <linearGradient id="a-bois-l" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PAL.boisLit} />
        <stop offset="100%" stopColor={PAL.boisMi} />
      </linearGradient>
      <linearGradient id="a-bois-o" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#77593a" />
        <stop offset="100%" stopColor={PAL.boisOmbre} />
      </linearGradient>
      {/* toits : le pan gauche reçoit le soleil, le droit est dans l'ombre */}
      <linearGradient id="a-toit-l" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#dd8a5e" />
        <stop offset="100%" stopColor={PAL.toitLit} />
      </linearGradient>
      <linearGradient id="a-toit-o" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a1552f" />
        <stop offset="100%" stopColor={PAL.toitOmbre} />
      </linearGradient>
      <linearGradient id="a-chaume-l" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e2c98c" />
        <stop offset="100%" stopColor={PAL.chaumeLit} />
      </linearGradient>
      <linearGradient id="a-chaume-o" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#b3934f" />
        <stop offset="100%" stopColor={PAL.chaumeOmbre} />
      </linearGradient>
      {/* cylindre (colonnes, tours rondes) : ombre‑lumière‑ombre horizontal */}
      <linearGradient id="a-cyl" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#b0a284" />
        <stop offset="28%" stopColor={PAL.marbreLit} />
        <stop offset="55%" stopColor="#ded4bc" />
        <stop offset="100%" stopColor="#8f8368" />
      </linearGradient>
      <linearGradient id="a-cyl-pierre" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#9a9078" />
        <stop offset="28%" stopColor={PAL.pierreLit} />
        <stop offset="55%" stopColor="#c4bAA2" />
        <stop offset="100%" stopColor="#7c7259" />
      </linearGradient>
      {/* occlusion ambiante */}
      <radialGradient id="a-ao">
        <stop offset="0%" stopColor="#1d1408" stopOpacity="0.32" />
        <stop offset="60%" stopColor="#1d1408" stopOpacity="0.16" />
        <stop offset="100%" stopColor="#1d1408" stopOpacity="0" />
      </radialGradient>
      {/* flous : ombres portées et halos */}
      <filter id="a-flou1" colorInterpolationFilters="sRGB" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="0.8" />
      </filter>
      <filter id="a-flou2" colorInterpolationFilters="sRGB" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
      <filter id="a-flou4" colorInterpolationFilters="sRGB" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="4.5" />
      </filter>
    </>
  )
}

/** Occlusion ambiante à la base d'un volume - TOUJOURS sous le bâtiment */
export function AOBase({ rx, ry = 0, cx = 0, cy = 1, o = 1 }: { rx: number; ry?: number; cx?: number; cy?: number; o?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry || rx * 0.3} fill="url(#a-ao)" opacity={o} />
}

/**
 * Ombre portée d'un volume debout, projetée vers le SE.
 * `w` = largeur au sol, `h` = hauteur du volume (pilote la longueur).
 */
export function OmbreVolume({ w, h, x = 0, y = 0, o = 0.16 }: { w: number; h: number; x?: number; y?: number; o?: number }) {
  const L = h * 0.55
  return (
    <path
      d={`M${x - w / 2 + 2},${y} L${x + w / 2 - 1},${y} L${x + w / 2 - 1 + L * 0.92},${y + L * 0.4} L${x - w / 2 + 6 + L * 0.92},${y + L * 0.4} Z`}
      fill={PAL.ombrePortee}
      opacity={o}
      filter="url(#a-flou2)"
    />
  )
}

/** Appareil de pierre : assises irrégulières générées, joints décalés, tons variés */
export function MurPierre({
  x = 0,
  y = 0,
  w,
  h,
  seed = 1,
  ombre = false,
}: {
  x?: number
  y?: number
  w: number
  h: number
  seed?: number
  ombre?: boolean
}) {
  const rnd = alea(seed)
  const tons = ombre
    ? ['#a89e86', '#9c927a', '#b0a68e', '#948a72']
    : ['#d5cdb9', '#c9c0aa', '#ddd5c2', '#beb49d']
  const rangs: ReactNode[] = []
  let cy = y + h
  let r = 0
  while (cy > y + 2) {
    const rh = 4.5 + rnd() * 2.5
    const haut = Math.max(y, cy - rh)
    let cx = x + (r % 2 === 0 ? 0 : -(4 + rnd() * 5))
    while (cx < x + w) {
      const pw = 7 + rnd() * 8
      const fin = Math.min(x + w, cx + pw)
      if (fin - Math.max(x, cx) > 1.5) {
        rangs.push(
          <rect
            key={`${r}-${cx.toFixed(0)}`}
            x={Math.max(x, cx)}
            y={haut}
            width={fin - Math.max(x, cx) - 0.7}
            height={cy - haut - 0.6}
            fill={tons[Math.floor(rnd() * tons.length)]}
          />,
        )
      }
      cx = fin
    }
    cy = haut
    r++
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={ombre ? PAL.pierreOmbre : PAL.pierreJoint} opacity={0.9} />
      {rangs}
    </g>
  )
}

/** Colonne à volume cylindrique : base à degrés, fût en dégradé, chapiteau */
export function Colonne3D({ x, h, larg = 5, or = false }: { x: number; h: number; larg?: number; or?: boolean }) {
  const w = larg
  return (
    <g>
      {/* base à deux degrés */}
      <rect x={x - w / 2 - 1.6} y={-2.4} width={w + 3.2} height={2.4} fill={PAL.pierreMi} />
      <rect x={x - w / 2 - 1.6} y={-2.4} width={w + 3.2} height={0.9} fill={PAL.pierreLit} />
      {/* fût cylindrique + cannelures */}
      <rect x={x - w / 2} y={-h} width={w} height={h - 2.2} fill="url(#a-cyl)" />
      <line x1={x - w * 0.18} y1={-h + 1.5} x2={x - w * 0.18} y2={-3.4} stroke="#a89b7e" strokeWidth={0.5} opacity={0.7} />
      <line x1={x + w * 0.16} y1={-h + 1.5} x2={x + w * 0.16} y2={-3.4} stroke="#8f8368" strokeWidth={0.5} opacity={0.7} />
      {/* chapiteau : échine + abaque, dessous dans l'ombre */}
      <rect x={x - w / 2 - 0.8} y={-h - 1.2} width={w + 1.6} height={1.6} fill={PAL.marbreOmbre} />
      <rect x={x - w / 2 - 1.7} y={-h - 3.4} width={w + 3.4} height={2.6} fill={or ? PAL.or : PAL.marbreLit} />
      <rect x={x - w / 2 - 1.7} y={-h - 3.4} width={w + 3.4} height={0.9} fill={or ? '#e8c97e' : '#fbf7ec'} />
    </g>
  )
}

/**
 * Bâtisse volumétrique - LE volume standard de la carte.
 * Pignon face au joueur (sud, demi-teinte), pan de toit gauche éclairé,
 * pan droit ombré, retour de mur est dans l'ombre, débord d'avant-toit
 * avec ombre portée sur la façade, faîtage clair, AO à la base.
 * Ancre : centre-bas de la façade.
 */
export function Batisse3D({
  w,
  h,
  g,
  prof = 9,
  mat = 'stuc',
  toit = 'tuiles',
  retour = 7,
  enfants,
}: {
  w: number
  h: number
  /** montée du pignon */
  g: number
  /** profondeur visible des pans de toit */
  prof?: number
  mat?: 'stuc' | 'pierre' | 'bois'
  toit?: 'tuiles' | 'chaume' | 'bois'
  /** largeur du retour de mur est (0 = aucun) */
  retour?: number
  enfants?: ReactNode
}) {
  const facade = mat === 'pierre' ? 'url(#a-pierre-l)' : mat === 'bois' ? 'url(#a-bois-l)' : 'url(#a-stuc-l)'
  const flanc = mat === 'pierre' ? 'url(#a-pierre-o)' : mat === 'bois' ? 'url(#a-bois-o)' : 'url(#a-stuc-o)'
  const panL = toit === 'tuiles' ? 'url(#a-toit-l)' : toit === 'chaume' ? 'url(#a-chaume-l)' : 'url(#a-bois-l)'
  const panR = toit === 'tuiles' ? 'url(#a-toit-o)' : toit === 'chaume' ? 'url(#a-chaume-o)' : 'url(#a-bois-o)'
  const arete = toit === 'tuiles' ? PAL.toitArete : toit === 'chaume' ? '#ecd9a0' : '#c2a173'
  const rangSombre = toit === 'tuiles' ? PAL.toitOmbre : toit === 'chaume' ? PAL.chaumeOmbre : PAL.boisOmbre
  const deb = 2.5 // débord du toit au-delà des murs

  // rangées de tuiles/chaume sur chaque pan (lignes parallèles à l'égout)
  const rangs = Math.max(3, Math.round(prof / 3))
  const lignes = []
  for (let i = 1; i < rangs; i++) {
    const t = i / rangs
    lignes.push(t)
  }

  return (
    <g>
      <AOBase rx={w * 0.62} ry={w * 0.16} cy={2} />
      <OmbreVolume w={w} h={h + g * 0.7} y={1} />

      {/* retour de mur est (épaisseur du volume, dans l'ombre) */}
      {retour > 0 && (
        <path d={`M${w / 2},0 L${w / 2 + retour},${-retour * 0.45} L${w / 2 + retour},${-h - retour * 0.45} L${w / 2},${-h} Z`} fill={flanc} />
      )}

      {/* façade pignon */}
      <path d={`M${-w / 2},0 L${-w / 2},${-h} L0,${-h - g} L${w / 2},${-h} L${w / 2},0 Z`} fill={facade} />
      {/* soubassement + arête d'angle éclairée à gauche, ombrée à droite */}
      <rect x={-w / 2} y={-3} width={w} height={3} fill={PAL.pierreMi} opacity={0.55} />
      <line x1={-w / 2 + 0.6} y1={0} x2={-w / 2 + 0.6} y2={-h + 0.5} stroke="#fff6e0" strokeWidth={1.1} opacity={0.5} />
      <line x1={w / 2 - 0.7} y1={0} x2={w / 2 - 0.7} y2={-h + 0.5} stroke={PAL.stucOmbre} strokeWidth={1.4} opacity={0.55} />
      {/* ombre du débord d'avant-toit sur la façade */}
      <path d={`M${-w / 2},${-h + 3.2} L0,${-h - g + 3.4} L${w / 2},${-h + 3.2} L${w / 2},${-h} L0,${-h - g} L${-w / 2},${-h} Z`} fill={PAL.ombrePortee} opacity={0.22} filter="url(#a-flou1)" />

      {enfants}

      {/* pans de toit */}
      <g>
        {/* pan gauche - éclairé */}
        <path d={`M${-w / 2 - deb},${-h} L0,${-h - g} L0,${-h - g - prof} L${-w / 2 - deb},${-h - prof} Z`} fill={panL} />
        {lignes.map((t, i) => (
          <line
            key={`l${i}`}
            x1={-w / 2 - deb}
            y1={-h - prof * t}
            x2={0}
            y2={-h - g - prof * t}
            stroke={rangSombre}
            strokeWidth={0.9}
            opacity={0.55}
            strokeDasharray={toit === 'tuiles' ? '3.2 1.1' : undefined}
          />
        ))}
        {/* pan droit - dans l'ombre */}
        <path d={`M${w / 2 + deb},${-h} L0,${-h - g} L0,${-h - g - prof} L${w / 2 + deb},${-h - prof} Z`} fill={panR} />
        {lignes.map((t, i) => (
          <line
            key={`r${i}`}
            x1={w / 2 + deb}
            y1={-h - prof * t}
            x2={0}
            y2={-h - g - prof * t}
            stroke="#5e3520"
            strokeWidth={0.9}
            opacity={0.4}
            strokeDasharray={toit === 'tuiles' ? '3.2 1.1' : undefined}
          />
        ))}
        {/* égouts éclairés + faîtage */}
        <line x1={-w / 2 - deb} y1={-h} x2={0} y2={-h - g} stroke={arete} strokeWidth={1.3} opacity={0.9} />
        <line x1={0} y1={-h - g} x2={0} y2={-h - g - prof} stroke={arete} strokeWidth={1.6} />
        <line x1={w / 2 + deb} y1={-h} x2={0} y2={-h - g} stroke={rangSombre} strokeWidth={1} opacity={0.8} />
        {/* antéfixe au sommet du pignon */}
        {toit === 'tuiles' && <circle cx={0} cy={-h - g - 0.5} r={1.5} fill={arete} />}
      </g>
    </g>
  )
}

/** Porte de bois cintrée, encadrement en pierre, vantaux dans la pénombre */
export function Porte3D({ w = 8, h = 12, x = 0 }: { w?: number; h?: number; x?: number }) {
  return (
    <g>
      <path
        d={`M${x - w / 2 - 1.3},0 L${x - w / 2 - 1.3},${-h + w / 2 - 1} A${w / 2 + 1.3},${w / 2 + 1.3} 0 0 1 ${x + w / 2 + 1.3},${-h + w / 2 - 1} L${x + w / 2 + 1.3},0 Z`}
        fill={PAL.pierreMi}
      />
      <path
        d={`M${x - w / 2},0 L${x - w / 2},${-h + w / 2} A${w / 2},${w / 2} 0 0 1 ${x + w / 2},${-h + w / 2} L${x + w / 2},0 Z`}
        fill="#4a3520"
      />
      <path
        d={`M${x - w / 2 + 1.1},0 L${x - w / 2 + 1.1},${-h + w / 2} A${w / 2 - 1.1},${w / 2 - 1.1} 0 0 1 ${x + w / 2 - 1.1},${-h + w / 2} L${x + w / 2 - 1.1},0 Z`}
        fill="url(#a-bois-o)"
      />
      <line x1={x} y1={0} x2={x} y2={-h + 1} stroke="#3d2c17" strokeWidth={0.8} />
      <circle cx={x + 1.6} cy={-h * 0.42} r={0.7} fill="#2e2210" />
    </g>
  )
}

/** Fenêtre profonde : linteau, embrasure sombre, volet éclairé optionnel */
export function Fenetre3D({ x, y, w = 5, h = 6, volets = false }: { x: number; y: number; w?: number; h?: number; volets?: boolean }) {
  return (
    <g>
      <rect x={x - w / 2 - 0.9} y={y - h - 1} width={w + 1.8} height={h + 1.4} fill={PAL.pierreMi} opacity={0.8} />
      <rect x={x - w / 2} y={y - h} width={w} height={h} fill="#3c2d1a" />
      <rect x={x - w / 2} y={y - h} width={w} height={1.2} fill="#241a08" opacity={0.8} />
      {volets && <rect x={x - w / 2 - 3.1} y={y - h} width={2.6} height={h} fill="#7c9a8e" />}
      {volets && <rect x={x - w / 2 - 3.1} y={y - h} width={0.9} height={h} fill="#95b3a5" />}
      {volets && <rect x={x + w / 2 + 0.5} y={y - h} width={2.6} height={h} fill="#6b8a7d" />}
    </g>
  )
}
