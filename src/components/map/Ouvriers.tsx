import { memo } from 'react'
import type { BuildingId } from '../../game/types'

/*
 * Les villageois au travail - la vie du village, façon Age of Empires / Clash of Clans.
 * Chaque bâtiment productif a son artisan : geste en boucle (SMIL, aucun coût JS),
 * particules synchronisées (copeaux, éclats, étincelles) au moment de l'impact.
 * Coordonnées : l'espace de dessin du bâtiment (le même que BatimentArt).
 */

const PEAU = '#d9a97c'
const PEAU_OMBRE = '#bd8a5c'

/** mélange déterministe de deux hex - modelé des étoffes autour de leur teinte */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const c = (sa: number, sb: number) => Math.round(sa + (sb - sa) * t)
  return `#${((c((pa >> 16) & 255, (pb >> 16) & 255) << 16) | (c((pa >> 8) & 255, (pb >> 8) & 255) << 8) | c(pa & 255, pb & 255)).toString(16).padStart(6, '0')}`
}

function CorpsOuvrier({ tunique = '#b3906b', marche }: { tunique?: string; marche?: boolean }) {
  return (
    <g>
      {/* ombre au sol adoucie : deux ellipses terre superposées */}
      <ellipse cx={1.2} cy={0.9} rx={5} ry={1.6} fill="#241a0c" opacity={0.09} />
      <ellipse cx={1} cy={0.8} rx={3.4} ry={1.15} fill="#241a0c" opacity={0.14} />
      {marche ? (
        <>
          <path d="M0,-4 L-1.5,-0.4 L-0.5,-0.25" stroke={PEAU} strokeWidth={1.5} fill="none" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" values="16 0 -4;-16 0 -4;16 0 -4" dur="0.45s" repeatCount="indefinite" />
          </path>
          <path d="M0,-4 L1.5,-0.4 L2.5,-0.25" stroke={PEAU_OMBRE} strokeWidth={1.5} fill="none" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" values="-16 0 -4;16 0 -4;-16 0 -4" dur="0.45s" repeatCount="indefinite" />
          </path>
        </>
      ) : (
        <>
          <path d="M-1.5,-4 L-1.5,-0.4 L-0.5,-0.25" stroke={PEAU} strokeWidth={1.5} fill="none" strokeLinecap="round" />
          <path d="M1.5,-4 L1.5,-0.4 L2.5,-0.25" stroke={PEAU_OMBRE} strokeWidth={1.5} fill="none" strokeLinecap="round" />
        </>
      )}
      {/* tunique de travail : flanc ouest au soleil, revers est ombré, ceinture de cuir */}
      <path d="M-2.8,-3.8 L-2,-10.5 L2,-10.5 L2.8,-3.8 Z" fill={tunique} />
      <path d="M-2.8,-3.8 L-2,-10.5 L-0.6,-10.5 L-1,-3.8 Z" fill={mix(tunique, '#ffe9c2', 0.22)} />
      <path d="M2,-10.5 L2.8,-3.8 L1.9,-3.8 L1.5,-10.5 Z" fill={mix(tunique, '#221408', 0.32)} opacity={0.8} />
      <path d="M-2.5,-6.2 L2.5,-6.2 L2.58,-7.1 L-2.58,-7.1 Z" fill="#5d4230" />
      {/* tête : joue est dans l'ombre, cheveux avec mèche au soleil */}
      <circle cx={0} cy={-12.4} r={2.5} fill={PEAU} />
      <path d="M0.85,-14.75 A2.5,2.5 0 0 1 0.85,-10.05 A3.6,3.6 0 0 0 0.85,-14.75 Z" fill={PEAU_OMBRE} />
      <path d="M-2.5,-12.9 A2.5,2.5 0 0 1 2.5,-12.9" fill="#5f4630" />
      <path d="M-1.95,-13.7 A2.3,2.3 0 0 1 -0.3,-14.85" stroke="#8a6a4a" strokeWidth={0.9} fill="none" strokeLinecap="round" />
    </g>
  )
}

/** particules d'impact synchronisées avec le geste (jaillissent à ~45 % du cycle) */
function Eclats({ x, y, c, dur, begin = '0s' }: { x: number; y: number; c: string; dur: string; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {[
        { dx: 5, dy: -6, w: 1.8 },
        { dx: -3, dy: -7, w: 1.4 },
        { dx: 7, dy: -2, w: 1.2 },
      ].map((p, i) => (
        <rect key={i} x={0} y={0} width={p.w} height={p.w * 0.7} fill={c} opacity={0}>
          <animate attributeName="x" values={`0;${p.dx};${p.dx * 1.4}`} keyTimes="0;0.6;1" dur={dur} begin={begin} repeatCount="indefinite" />
          <animate attributeName="y" values={`0;${p.dy};${p.dy * 0.4}`} keyTimes="0;0.6;1" dur={dur} begin={begin} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0;0.95;0.7;0" keyTimes="0;0.45;0.5;0.75;1" dur={dur} begin={begin} repeatCount="indefinite" />
        </rect>
      ))}
    </g>
  )
}

// ── métiers ──────────────────────────────────────────────────────────────────
function Bucheron({ x, y, flip, begin = '0s' }: { x: number; y: number; flip?: boolean; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`}>
      <CorpsOuvrier tunique="#8c9a7a" />
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="-72 1 -9.5;28 1 -9.5;28 1 -9.5;-72 1 -9.5"
          keyTimes="0;0.42;0.5;1"
          dur="1.7s"
          begin={begin}
          repeatCount="indefinite"
        />
        <line x1={1} y1={-9.5} x2={7.5} y2={-6.5} stroke={PEAU} strokeWidth={1.4} />
        {/* manche deux tons + fer de hache à facette éclairée */}
        <line x1={7.5} y1={-6.5} x2={11} y2={-4.6} stroke="#6b4c2a" strokeWidth={1.6} />
        <line x1={7.6} y1={-6.8} x2={10.9} y2={-5} stroke="#a8845d" strokeWidth={0.8} />
        <path d="M10.4,-6.4 l3,1.2 q-0.4,2.4 -2.8,2.2 Z" fill="#8a929b" />
        <path d="M10.4,-6.4 L13.4,-5.2 L11.2,-5.55 Z" fill="#c8cdd3" />
      </g>
      <Eclats x={9} y={-1} c="#d3b787" dur="1.7s" begin={begin} />
    </g>
  )
}

function Tailleur({ x, y, flip, begin = '0s' }: { x: number; y: number; flip?: boolean; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`}>
      <CorpsOuvrier tunique="#a08a68" />
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="-65 1 -9.5;30 1 -9.5;30 1 -9.5;-65 1 -9.5"
          keyTimes="0;0.4;0.5;1"
          dur="1.9s"
          begin={begin}
          repeatCount="indefinite"
        />
        <line x1={1} y1={-9.5} x2={8} y2={-6.5} stroke={PEAU} strokeWidth={1.4} />
        {/* manche deux tons + pic de fer, dos éclairé */}
        <line x1={8} y1={-6.5} x2={11.5} y2={-5} stroke="#6b4c2a" strokeWidth={1.5} />
        <line x1={8.1} y1={-6.8} x2={11.4} y2={-5.35} stroke="#a8845d" strokeWidth={0.8} />
        <path d="M11,-6.6 q3,-0.8 4.4,1.4" stroke="#7f8790" strokeWidth={1.7} fill="none" />
        <path d="M11,-6.85 q2.9,-0.75 4.2,1.1" stroke="#dfe5ea" strokeWidth={0.8} fill="none" />
      </g>
      <Eclats x={10} y={-2} c="#c2bcae" dur="1.9s" begin={begin} />
    </g>
  )
}

function Forgeron({ x, y, flip, begin = '0s' }: { x: number; y: number; flip?: boolean; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`}>
      <CorpsOuvrier tunique="#7d5a44" />
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="-80 1 -9.5;20 1 -9.5;20 1 -9.5;-80 1 -9.5"
          keyTimes="0;0.38;0.46;1"
          dur="1.3s"
          begin={begin}
          repeatCount="indefinite"
        />
        <line x1={1} y1={-9.5} x2={7} y2={-6.5} stroke={PEAU} strokeWidth={1.4} />
        {/* marteau : manche deux tons, masse de fer au dessus éclairé */}
        <line x1={7} y1={-6.5} x2={9.6} y2={-5.4} stroke="#6b4c2a" strokeWidth={1.4} />
        <line x1={7.1} y1={-6.75} x2={9.5} y2={-5.7} stroke="#a8845d" strokeWidth={0.8} />
        <rect x={9} y={-7.4} width={3.2} height={2.6} rx={0.7} fill="#787f88" />
        <rect x={9} y={-7.4} width={3.2} height={1.1} rx={0.55} fill="#c8cdd3" />
      </g>
      {/* étincelles dorées */}
      <g transform="translate(8,-2)">
        {[
          { dx: 4, dy: -7 },
          { dx: -2, dy: -8 },
          { dx: 6, dy: -4 },
        ].map((p, i) => (
          <circle key={i} r={0.9} fill="#f5d06c" opacity={0}>
            <animate attributeName="cx" values={`0;${p.dx}`} dur="1.3s" begin={begin} repeatCount="indefinite" />
            <animate attributeName="cy" values={`0;${p.dy};${p.dy * 0.5}`} keyTimes="0;0.6;1" dur="1.3s" begin={begin} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0;1;0.6;0" keyTimes="0;0.4;0.46;0.7;1" dur="1.3s" begin={begin} repeatCount="indefinite" />
          </circle>
        ))}
      </g>
    </g>
  )
}

/** maçon de chantier : coups de maillet + éclats de pierre (exporté pour les chantiers) */
export function Batisseur({ x, y, flip, begin = '0s' }: { x: number; y: number; flip?: boolean; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`}>
      <CorpsOuvrier tunique="#b0846a" />
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="-70 1 -9.5;26 1 -9.5;26 1 -9.5;-70 1 -9.5"
          keyTimes="0;0.4;0.48;1"
          dur="1.5s"
          begin={begin}
          repeatCount="indefinite"
        />
        <line x1={1} y1={-9.5} x2={7.5} y2={-6.5} stroke={PEAU} strokeWidth={1.4} />
        {/* maillet : manche deux tons, tête au chant éclairé */}
        <line x1={7.5} y1={-6.5} x2={10.5} y2={-5.2} stroke="#6b4c2a" strokeWidth={1.5} />
        <line x1={7.6} y1={-6.75} x2={10.4} y2={-5.5} stroke="#a8845d" strokeWidth={0.8} />
        <rect x={9.6} y={-7.6} width={3.4} height={2.8} rx={0.8} fill="#787f88" />
        <rect x={9.6} y={-7.6} width={3.4} height={1.15} rx={0.55} fill="#c8cdd3" />
      </g>
      <Eclats x={10} y={-2} c="#d8d2c4" dur="1.5s" begin={begin} />
    </g>
  )
}

function Faucheur({ x, y, flip, begin = '0s' }: { x: number; y: number; flip?: boolean; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`}>
      <CorpsOuvrier tunique="#cdbb92" />
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="-24 0 -8;20 0 -8;-24 0 -8"
          keyTimes="0;0.5;1"
          dur="2.6s"
          begin={begin}
          repeatCount="indefinite"
        />
        <line x1={0} y1={-8} x2={8} y2={-3} stroke={PEAU} strokeWidth={1.4} />
        {/* faux : manche deux tons, lame courbe qui accroche la lumière */}
        <line x1={4} y1={-10} x2={10} y2={0} stroke="#6b4c2a" strokeWidth={1.4} />
        <line x1={4.25} y1={-9.9} x2={7.2} y2={-5} stroke="#a8845d" strokeWidth={0.8} />
        <path d="M10,0 q4,1.6 7,-0.6" stroke="#8a929b" strokeWidth={1.5} fill="none" />
        <path d="M10.2,-0.3 q3.7,1.4 6.5,-0.6" stroke="#dfe5ea" strokeWidth={0.8} fill="none" />
      </g>
    </g>
  )
}

function Pretre({ x, y, begin = '0s' }: { x: number; y: number; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <CorpsOuvrier tunique="#ece5d2" />
      {/* clavus pourpre de l'officiant, interrompu par la ceinture */}
      <path d="M0.7,-3.9 L0.62,-6.2 M0.55,-7.1 L0.45,-10.4" stroke="#b3543f" strokeWidth={0.9} opacity={0.85} />
      <line x1={-2} y1={-9.5} x2={-5.5} y2={-12} stroke={PEAU} strokeWidth={1.3}>
        <animateTransform attributeName="transform" type="rotate" values="0 -2 -9.5;-28 -2 -9.5;0 -2 -9.5" dur="3.4s" begin={begin} repeatCount="indefinite" />
      </line>
      <line x1={2} y1={-9.5} x2={5.5} y2={-12} stroke={PEAU} strokeWidth={1.3}>
        <animateTransform attributeName="transform" type="rotate" values="0 2 -9.5;28 2 -9.5;0 2 -9.5" dur="3.4s" begin={begin} repeatCount="indefinite" />
      </line>
    </g>
  )
}

function Recrue({ x, y, flip, begin = '0s' }: { x: number; y: number; flip?: boolean; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`}>
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0;-4.5,0;-4.5,0;0,0" keyTimes="0;0.3;0.42;1" dur="1.5s" begin={begin} repeatCount="indefinite" />
        <CorpsOuvrier tunique="#3e5a7a" />
        {/* lance d'exercice deux tons, fer à facettes */}
        <line x1={-1} y1={-8.5} x2={-9} y2={-7} stroke="#6b4c2a" strokeWidth={1.3} />
        <line x1={-4.5} y1={-8} x2={-9} y2={-7.15} stroke="#a8845d" strokeWidth={0.8} />
        <path d="M-9,-7 L-11.6,-7.5 L-9.2,-8.05 Z" fill="#8b939c" />
        <path d="M-9.4,-9.1 L-11.6,-7.5 L-9.2,-8.05 Z" fill="#e4eaef" />
        {/* petit bouclier d'entraînement bombé */}
        <circle cx={3.4} cy={-8} r={2.8} fill="#4f3d22" />
        <circle cx={3.4} cy={-8} r={2.35} fill="#7c5f38" />
        <circle cx={3} cy={-8.4} r={1.6} fill="#9d7a4e" />
        <circle cx={2.7} cy={-8.7} r={0.9} fill="#bb9866" />
      </g>
    </g>
  )
}

function Marchande({ x, y, begin = '0s' }: { x: number; y: number; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <CorpsOuvrier tunique="#9a8ca8" />
      <line x1={2} y1={-9.5} x2={5.5} y2={-11.5} stroke={PEAU} strokeWidth={1.3}>
        <animateTransform attributeName="transform" type="rotate" values="0 2 -9.5;24 2 -9.5;0 2 -9.5;0 2 -9.5" keyTimes="0;0.15;0.3;1" dur="3.8s" begin={begin} repeatCount="indefinite" />
      </line>
    </g>
  )
}

function Docker({ x, y, flip, begin = '0s' }: { x: number; y: number; flip?: boolean; begin?: string }) {
  return (
    <g transform={`translate(${x},${y})${flip ? ' scale(-1,1)' : ''}`}>
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0;0,-1.4;0,0" dur="1.1s" begin={begin} repeatCount="indefinite" />
        <CorpsOuvrier tunique="#7c9a8e" />
        {/* caisse : couvercle au soleil, flanc est ombré, feuillard en croix */}
        <rect x={-3.4} y={-17.4} width={6.8} height={4.6} fill="#8f6f42" />
        <rect x={-3.4} y={-17.4} width={6.8} height={1.4} fill="#b08a58" />
        <rect x={2.2} y={-16} width={1.2} height={3.2} fill="#6b4c2a" opacity={0.7} />
        <path d="M-3.4,-17.4 L3.4,-12.8 M3.4,-17.4 L-3.4,-12.8" stroke="#5f462d" strokeWidth={0.8} />
      </g>
    </g>
  )
}

// ── affectation par bâtiment ─────────────────────────────────────────────────

/** un poste de travail : où l'artisan se tient, et le décalage de son geste */
interface Poste {
  x: number
  y: number
  flip?: boolean
  begin?: string
}

/**
 * Places de travail par bâtiment, dans l'ordre où elles se remplissent — quatre
 * au maximum, comme le nombre de postes qu'un atelier peut offrir au niveau 4.
 *
 * Ces emplacements sont solidaires du dessin de chaque bâtiment : ils tombent
 * sur l'aire dégagée que l'art réserve (le champ pour la ferme, le front de
 * taille pour la carrière…). Les déplacer sans regarder la carte, c'est poser
 * un faucheur sur un toit.
 */
const POSTES_ATELIER: Partial<Record<BuildingId, Poste[]>> = {
  scierie: [
    { x: 24, y: 4, flip: true },
    { x: -8, y: 13, begin: '0.8s' },
    { x: 44, y: 16, flip: true, begin: '1.5s' },
    { x: -30, y: 2, begin: '0.4s' },
  ],
  carriere: [
    { x: 12, y: 9, flip: true },
    { x: -22, y: 13, flip: true, begin: '0.9s' },
    { x: 30, y: 2, begin: '1.7s' },
    { x: -6, y: 20, flip: true, begin: '0.5s' },
  ],
  forge: [
    { x: 12, y: 6, flip: true },
    { x: -22, y: 13, begin: '0.6s' },
    { x: 30, y: 16, flip: true, begin: '1.2s' },
  ],
  // la ferme travaille vers l'est, dans les parcelles
  ferme: [
    { x: 34, y: 10 },
    { x: 58, y: -14, begin: '1.2s' },
    { x: 80, y: 12, begin: '0.6s' },
    { x: 50, y: 24, begin: '1.8s' },
  ],
  temple: [
    { x: 0, y: 15 },
    { x: -20, y: 10, begin: '1.4s' },
  ],
  port: [
    { x: 18, y: 7, flip: true },
    { x: 40, y: -2, flip: true, begin: '0.5s' },
  ],
}

/** l'artisan correspondant au métier du bâtiment */
function Artisan({ id, p }: { id: BuildingId; p: Poste }) {
  switch (id) {
    case 'scierie':
      return <Bucheron x={p.x} y={p.y} flip={p.flip} begin={p.begin} />
    case 'carriere':
      return <Tailleur x={p.x} y={p.y} flip={p.flip} begin={p.begin} />
    case 'forge':
      return <Forgeron x={p.x} y={p.y} flip={p.flip} begin={p.begin} />
    case 'ferme':
      return <Faucheur x={p.x} y={p.y} flip={p.flip} begin={p.begin} />
    case 'temple':
      return <Pretre x={p.x} y={p.y} begin={p.begin} />
    case 'port':
      return <Docker x={p.x} y={p.y} flip={p.flip} begin={p.begin} />
    default:
      return null
  }
}

/**
 * Les artisans visibles sur un bâtiment.
 *
 * `ouvriers` = le nombre de villageois RÉELLEMENT affectés à ce poste. C'est le
 * seul compte qui vaille : le dessin doit être le reflet fidèle de l'affectation.
 * Auparavant on en déduisait le nombre du NIVEAU du bâtiment, si bien qu'une
 * ferme de niveau 2 avec deux paysans n'en montrait qu'un — l'affectation était
 * invisible, donc incompréhensible.
 *
 * La caserne et l'agora n'ont pas de poste de travail : leurs figures (recrue à
 * l'exercice, marchande à l'étal) relèvent de la vie du village et suivent le
 * niveau, pas l'affectation.
 */
/** Les artisans d'un atelier. Mémoïsés : ils ne changent qu'à l'affectation. */
export const Ouvriers = memo(function Ouvriers({ id, level, ouvriers }: { id: BuildingId; level: number; ouvriers?: number }) {
  if (level <= 0) return null

  if (id === 'caserne') {
    return (
      <g>
        <Recrue x={-19} y={5} />
        {level >= 3 && <Recrue x={-7} y={11} begin="0.7s" />}
      </g>
    )
  }
  if (id === 'agora') {
    return level >= 2 ? (
      <g>
        <Marchande x={-30} y={-3} />
        {level >= 3 && <Marchande x={30} y={0} begin="1.6s" />}
      </g>
    ) : (
      <Marchande x={18} y={4} />
    )
  }

  const postes = POSTES_ATELIER[id]
  if (!postes) return null
  // sans consigne, on retombe sur l'ancien comportement plutôt que de vider la carte
  const n = Math.min(postes.length, ouvriers ?? (level >= 3 ? 2 : 1))
  if (n <= 0) return null
  return (
    <g>
      {postes.slice(0, n).map((p, i) => (
        <Artisan key={i} id={id} p={p} />
      ))}
    </g>
  )
})

// ── porteurs de ressources (sur la carte, coordonnées monde) ─────────────────
function Porteur({
  path,
  dur,
  charge,
  begin = '0s',
}: {
  path: string
  dur: string
  charge: 'bois' | 'grain' | 'pierre'
  begin?: string
}) {
  return (
    <g opacity={0}>
      <animateMotion dur={dur} repeatCount="indefinite" path={path} begin={begin} />
      <animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.05;0.94;1" dur={dur} begin={begin} repeatCount="indefinite" />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0;0,-1.1;0,0" dur="0.4s" repeatCount="indefinite" additive="sum" />
        <CorpsOuvrier marche />
        {charge === 'bois' && (
          <g transform="translate(0,-13.6) rotate(-8)">
            {[0, 1].map((i) => (
              <g key={i}>
                <rect x={-6} y={-i * 2.2 - 2} width={12} height={2} rx={1} fill={i ? '#a3814f' : '#8f6f42'} />
                <rect x={-5.6} y={-i * 2.2 - 1.9} width={11.2} height={0.8} rx={0.4} fill={i ? '#c2a071' : '#ab8757'} />
                <ellipse cx={5.8} cy={-i * 2.2 - 1} rx={0.6} ry={0.9} fill="#5f462d" />
              </g>
            ))}
          </g>
        )}
        {charge === 'grain' && (
          <g>
            <path d="M-2.8,-14.4 C-3.3,-17.4 -2.2,-19.2 0,-19.2 C2.2,-19.2 3.3,-17.4 2.8,-14.4 Z" fill="#cbb289" />
            <path d="M0.8,-14.4 C1.6,-17.2 1.6,-18.8 0.4,-19.15 C1.8,-19 2.9,-17.4 2.8,-14.4 Z" fill="#a98f63" />
            <path d="M-0.9,-19 L1,-19" stroke="#8a6a4a" strokeWidth={0.8} />
          </g>
        )}
        {charge === 'pierre' && (
          <g>
            <rect x={-2.6} y={-18.4} width={5.2} height={4} fill="#b5ad98" />
            <path d="M-2.6,-18.4 L2.6,-18.4 L2.6,-17.3 L-2.6,-16.9 Z" fill="#d5cdb9" />
            <path d="M2.6,-18.4 L2.6,-14.4 L1.7,-14.4 L1.8,-18.4 Z" fill="#948a72" />
          </g>
        )}
      </g>
    </g>
  )
}

/** navettes des porteurs : des ateliers vers l'agora, par la porte de l'est */
export function Porteurs({
  scierie,
  ferme,
  carriere,
  actif,
}: {
  scierie: boolean
  ferme: boolean
  carriere: boolean
  actif: boolean
}) {
  if (!actif) return null
  return (
    <g pointerEvents="none">
      {scierie && (
        <Porteur
          path="M952,262 C 938,330 920,400 908,440 C 866,447 730,451 632,449"
          dur="26s"
          charge="bois"
        />
      )}
      {ferme && (
        <Porteur
          path="M345,652 C 500,636 690,575 850,505 C 885,489 900,468 905,449 C 862,449 730,452 634,450"
          dur="34s"
          charge="grain"
          begin="9s"
        />
      )}
      {carriere && (
        <Porteur
          path="M172,262 C 400,225 760,240 885,320 C 908,370 909,415 906,442 C 868,448 740,452 640,450"
          dur="42s"
          charge="pierre"
          begin="15s"
        />
      )}
    </g>
  )
}
