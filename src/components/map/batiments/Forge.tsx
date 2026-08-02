import type { ReactNode } from 'react'
import { AOBase, Batisse3D, Fenetre3D, MurPierre, OmbreVolume, PAL, alea } from '../art'

/*
 * FORGE - peint réaliste (bible docs/STYLE-ART.md) : lumière NW, ombres SE.
 *  1. foyer d'argile + soufflet + enclume en plein air
 *  2. atelier couvert (appentis de tuiles, lanterne à fumée)
 *  3. forge en dur : four de briques contre le mur + râtelier d'armes
 *  4. manufacture d'Héphaïstos : fours jumeaux, cuirasses étincelantes
 * Les forgerons de Ouvriers.tsx frappent en (12,6) et (-22,13) : l'enclume
 * principale reste en (3.5,7), la seconde en (-13.5,14).
 * La forge IRRADIE : halo radial sur les briques, nappe chaude au sol,
 * liserés orangés sur les flancs ouest - contre l'acier et l'eau, froids.
 * IDs de defs locaux préfixés « f- ».
 */

// silhouette du dôme, partagée par les deux tailles de four
const DOME =
  'M-8.2,0.8 C-8.7,-5.5 -6.4,-10.6 -3.2,-12.8 C-1.6,-13.9 1.6,-13.9 3.2,-12.8 C6.4,-10.6 8.7,-5.5 8.2,0.8 Q0,2.2 -8.2,0.8 Z'

function DefsForge() {
  return (
    <defs>
      {/* dôme de briques réfractaires : lumière NW décentrée, pourtour éteint */}
      <radialGradient id="f-dome" cx="0.33" cy="0.22" r="0.82">
        <stop offset="0%" stopColor="#dd9463" />
        <stop offset="38%" stopColor="#b25c37" />
        <stop offset="72%" stopColor="#8a4324" />
        <stop offset="100%" stopColor="#552a17" />
      </radialGradient>
      {/* foyer rustique : torchis et argile crue du niveau 1 */}
      <radialGradient id="f-argile" cx="0.33" cy="0.22" r="0.82">
        <stop offset="0%" stopColor="#d3b184" />
        <stop offset="42%" stopColor="#a8815a" />
        <stop offset="100%" stopColor="#6a4f34" />
      </radialGradient>
      {/* gueule incandescente : cœur blanc, braise aux bords */}
      <radialGradient id="f-gueule" cx="0.5" cy="0.74" r="0.9">
        <stop offset="0%" stopColor="#fffbe6" />
        <stop offset="22%" stopColor="#ffe58a" />
        <stop offset="52%" stopColor="#ffab3f" />
        <stop offset="80%" stopColor="#dd5f1e" />
        <stop offset="100%" stopColor="#8c2e10" />
      </radialGradient>
      {/* halo de chaleur : irradie sur la brique, l'air et les murs */}
      <radialGradient id="f-halo">
        <stop offset="0%" stopColor="#ffd47a" stopOpacity="0.7" />
        <stop offset="40%" stopColor="#ff9a3c" stopOpacity="0.32" />
        <stop offset="100%" stopColor="#f2751c" stopOpacity="0" />
      </radialGradient>
      {/* lueur chaude projetée au sol devant la gueule */}
      <radialGradient id="f-lueur">
        <stop offset="0%" stopColor="#ffc271" stopOpacity="0.6" />
        <stop offset="45%" stopColor="#f7902f" stopOpacity="0.28" />
        <stop offset="100%" stopColor="#e8761c" stopOpacity="0" />
      </radialGradient>
      {/* fumée grasse de charbon / vapeur de trempe */}
      <radialGradient id="f-fumee">
        <stop offset="0%" stopColor="#f0ebde" stopOpacity="0.9" />
        <stop offset="52%" stopColor="#ddd6c8" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#cac2b3" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="f-suie">
        <stop offset="0%" stopColor="#837c72" stopOpacity="0.85" />
        <stop offset="52%" stopColor="#7a736a" stopOpacity="0.42" />
        <stop offset="100%" stopColor="#6f6960" stopOpacity="0" />
      </radialGradient>
      {/* eau du bac de trempe : profonde, reflet froid */}
      <radialGradient id="f-eau" cx="0.38" cy="0.32" r="0.95">
        <stop offset="0%" stopColor="#57798f" />
        <stop offset="60%" stopColor="#33505f" />
        <stop offset="100%" stopColor="#22323e" />
      </radialGradient>
      {/* bronze poli : éclat NW, chant SE éteint */}
      <linearGradient id="f-bronze" x1="0" y1="0" x2="0.85" y2="1">
        <stop offset="0%" stopColor="#f8e3a6" />
        <stop offset="34%" stopColor="#e0b960" />
        <stop offset="72%" stopColor="#a6813a" />
        <stop offset="100%" stopColor="#6d5324" />
      </linearGradient>
      {/* acier : reflet froid, très contrasté */}
      <linearGradient id="f-acier" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor="#9ba4ae" />
        <stop offset="45%" stopColor="#6b727b" />
        <stop offset="100%" stopColor="#3e434a" />
      </linearGradient>
      {/* cuir du soufflet : masse sombre, à peine éclairée au sommet */}
      <linearGradient id="f-cuir" x1="0.1" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stopColor="#7a4a2c" />
        <stop offset="45%" stopColor="#5d341e" />
        <stop offset="100%" stopColor="#3b2113" />
      </linearGradient>
    </defs>
  )
}

/** bouffées à bords fondus - remplace les disques opaques, même cadence SMIL */
function FumeeForge({ x = 0, y = 0, s = 1, t = 0, grasse = false }: { x?: number; y?: number; s?: number; t?: number; grasse?: boolean }) {
  const f = grasse ? 'url(#f-suie)' : 'url(#f-fumee)'
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {[
        { r0: 1.7, r1: 5.4, dx: 4.4, dy: -19, o: 0.9 },
        { r0: 1.2, r1: 3.9, dx: 6.6, dy: -14, o: 0.62 },
      ].map((p, i) => {
        const b = `${(t + i * 1.6).toFixed(2)}s`
        return (
          <circle key={i} r={p.r0} fill={f} opacity={0}>
            <animate attributeName="cy" values={`0;${p.dy}`} dur="3.2s" begin={b} repeatCount="indefinite" />
            <animate attributeName="cx" values={`0;${p.dx}`} dur="3.2s" begin={b} repeatCount="indefinite" />
            <animate attributeName="r" values={`${p.r0};${p.r1}`} dur="3.2s" begin={b} repeatCount="indefinite" />
            <animate attributeName="opacity" values={`0;${p.o};0`} keyTimes="0;0.18;1" dur="3.2s" begin={b} repeatCount="indefinite" />
          </circle>
        )
      })}
    </g>
  )
}

/** assises du dôme : joints qui suivent le galbe + briques dépareillées */
const COURS = [
  { y: -1.0, hw: 8.3, sag: 1.3, h: 2.5 },
  { y: -3.8, hw: 8.5, sag: 1.6, h: 2.7 },
  { y: -6.7, hw: 7.7, sag: 1.7, h: 2.6 },
  { y: -9.4, hw: 6.2, sag: 1.6, h: 2.3 },
  { y: -11.6, hw: 4.0, sag: 1.0, h: 1.9 },
]

function AssisesBriques({ seed, rustique, simple }: { seed: number; rustique?: boolean; simple?: boolean }) {
  const rnd = alea(seed)
  const joint = rustique ? '#87613a' : '#6f3319'
  const clair = rustique ? '#e2c79a' : '#eaa878'
  const sombre = rustique ? '#8a6540' : '#7e3f24'
  const n: ReactNode[] = []
  const dLits: string[] = [] // joints d'assise
  const dMonts: string[] = [] // joints verticaux
  COURS.forEach((c, i) => {
    const yAt = (t: number) => c.y - c.sag * (1 - t * t)
    dLits.push(`M${-c.hw},${c.y} Q0,${c.y - c.sag * 2} ${c.hw},${c.y}`)
    // joints verticaux décalés d'une assise à l'autre - la brique, pas l'argile
    const ts = i % 2 ? [-0.66, -0.22, 0.24, 0.68] : [-0.84, -0.44, 0, 0.44, 0.84]
    if (!rustique) {
      ts.forEach((t) => dMonts.push(`M${(t * c.hw).toFixed(2)},${yAt(t).toFixed(2)} l${(t * 0.9).toFixed(2)},${c.h.toFixed(2)}`))
    }
    // la matière n'est jamais uniforme : deux blocs hors ton par assise basse
    if (i < (simple ? 2 : 3)) {
      for (let k = 0; k < 2; k++) {
        const t = -0.7 + rnd() * 1.4
        const t0 = t - 0.17
        const t1 = t + 0.17
        n.push(
          <path
            key={`b${i}-${k}`}
            d={
              `M${(t0 * c.hw).toFixed(2)},${yAt(t0).toFixed(2)} L${(t1 * c.hw).toFixed(2)},${yAt(t1).toFixed(2)} ` +
              `L${(t1 * c.hw + t1 * 0.9).toFixed(2)},${(yAt(t1) + c.h * 0.9).toFixed(2)} L${(t0 * c.hw + t0 * 0.9).toFixed(2)},${(yAt(t0) + c.h * 0.9).toFixed(2)} Z`
            }
            fill={rnd() > 0.5 ? clair : sombre}
            opacity={0.16 + rnd() * 0.12}
          />,
        )
      }
    }
  })
  return (
    <g>
      <path d={dLits.join(' ')} stroke={joint} strokeWidth={rustique ? 0.8 : 0.6} opacity={rustique ? 0.26 : 0.5} fill="none" />
      {!rustique && <path d={dMonts.join(' ')} stroke={joint} strokeWidth={0.45} opacity={0.28} fill="none" />}
      {n}
    </g>
  )
}

/** four à dôme : gueule incandescente, halo radial, nappe de lumière au sol */
function FourBriques({
  x,
  y,
  s = 1,
  t = 0,
  fumee = true,
  etincelles = false,
  souche = false,
  rustique = false,
  mur = false,
  simple = false,
  seed = 5,
}: {
  x: number
  y: number
  s?: number
  t?: number
  fumee?: boolean
  etincelles?: boolean
  souche?: boolean
  rustique?: boolean
  mur?: boolean
  /** second four du niveau 4 : même dessin, moins de détails secondaires */
  simple?: boolean
  seed?: number
}) {
  const b = `${t}s`
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {/* la gueule éclaire la paroi derrière elle */}
      {mur && (
        <ellipse cx={1} cy={-9} rx={16} ry={15} fill="url(#f-halo)" opacity={0.26}>
          <animate attributeName="opacity" values="0.26;0.15;0.26" dur="1.1s" begin={b} repeatCount="indefinite" />
        </ellipse>
      )}
      <OmbreVolume w={16} h={12} o={0.15} />
      <AOBase rx={11} ry={3.3} cy={1.4} />

      {/* nappe de lumière : éventail au sol + flaque chaude devant la gueule */}
      {!simple && (
        <path d="M-4.4,0.6 L4.4,0.6 L12.5,8.2 L-11.2,8.2 Z" fill="url(#f-lueur)" opacity={0.5} filter="url(#a-flou2)">
          <animate attributeName="opacity" values="0.5;0.28;0.5" dur="1.1s" begin={b} repeatCount="indefinite" />
        </path>
      )}
      <ellipse cx={0.4} cy={3} rx={11.5} ry={4.2} fill="url(#f-lueur)">
        <animate attributeName="opacity" values="1;0.6;1" dur="1.1s" begin={b} repeatCount="indefinite" />
      </ellipse>
      <ellipse cx={0.2} cy={2.4} rx={5.6} ry={2.1} fill="#ffa63f" opacity={0.34} filter="url(#a-flou2)">
        <animate attributeName="opacity" values="0.34;0.18;0.34" dur="1.1s" begin={b} repeatCount="indefinite" />
      </ellipse>

      {/* pierres de calage à la base */}
      {!simple && (
        <g>
          <path d="M-9.8,0.7 q1.7,-2.7 3.6,-0.6 q-0.4,1.5 -3.4,1.3 Z" fill={PAL.pierreMi} />
          <path d="M7.2,1 q1.3,-2.3 3.1,-0.4 q0,1.4 -2.7,1.1 Z" fill={PAL.pierreOmbre} />
        </g>
      )}

      {/* dôme + appareil */}
      <path d={DOME} fill={rustique ? 'url(#f-argile)' : 'url(#f-dome)'} />
      <AssisesBriques seed={seed} rustique={rustique} simple={simple} />
      {/* ombre propre : le quart SE du dôme se détache du fond */}
      <path
        d="M8.2,0.8 C8.7,-5.5 6.4,-10.6 3.2,-12.8 C4.2,-11.6 5.4,-8.6 5.6,-5 C5.8,-1.8 5.2,0.8 4,1.6 Q6.4,1.5 8.2,0.8 Z"
        fill="#4a2513"
        opacity={0.42}
        filter="url(#a-flou1)"
      />
      {/* ombre de contact au pied du dôme */}
      <path d="M-8,0.4 Q0,2.4 8,0.4 Q0,3 -8,0.4 Z" fill="#3a1f11" opacity={0.4} filter="url(#a-flou1)" />
      {/* arête éclairée NW */}
      <path d="M-7.2,-6.9 Q-6,-11.2 -2.2,-13" stroke={rustique ? '#eed7ae' : '#f6c69c'} strokeWidth={1.6} opacity={0.55} fill="none" filter="url(#a-flou1)" />
      {rustique && (
        <g>
          {/* colombins d'argile et fissures de cuisson */}
          <path d="M-7.4,-4.6 Q0,-6.2 7.4,-4.6 M-5.6,-8.6 Q0,-10.2 5.6,-8.6" stroke="#8a6640" strokeWidth={0.9} opacity={0.3} fill="none" />
          <path d="M-3.2,-11.6 l-1,3.4 l0.8,2.2 M4.4,-9.4 l0.7,2.6 M-6,-4.4 l1.6,1.2" stroke="#6b4a2a" strokeWidth={0.55} opacity={0.5} fill="none" />
          {/* brins de paille du torchis */}
          <path d="M-5,-6.2 l1.4,0.5 M2.6,-7.4 l1.3,0.3 M-1.4,-2.6 l1.5,-0.4" stroke="#d3b184" strokeWidth={0.4} opacity={0.55} />
        </g>
      )}

      {/* évent : souche de terre cuite (dès le niveau 2) ou simple trou */}
      {souche ? (
        <g>
          <path d="M-2.5,-12.7 L-2.2,-16.8 L2.2,-16.8 L2.5,-12.7 Z" fill="url(#f-dome)" />
          <path d="M1.3,-16.7 L2.2,-16.8 L2.5,-12.7 L1.5,-12.7 Z" fill="#6a3520" opacity={0.6} />
          <path d="M-2.3,-16.6 L-1.5,-16.7 L-1.7,-12.7 L-2.45,-12.7 Z" fill="#eaa878" opacity={0.55} />
          <ellipse cx={0} cy={-16.9} rx={2.35} ry={0.9} fill="#3a2013" />
          <path d="M-2.35,-17.1 Q0,-17.9 2.35,-17.1" stroke="#e8a877" strokeWidth={0.6} opacity={0.85} fill="none" />
        </g>
      ) : (
        <g>
          <ellipse cx={0} cy={-13.1} rx={2.2} ry={0.9} fill="#3a2013" />
          <path d="M-2.2,-13.3 Q0,-14.1 2.2,-13.3" stroke={rustique ? '#e6cda2' : '#e8a877'} strokeWidth={0.6} opacity={0.8} fill="none" />
        </g>
      )}

      {/* gueule : arc de voussoirs, cavité noire, halo, puis le feu */}
      <path
        d="M-5,1.2 L-5,-2.2 Q-5,-6.5 0,-6.5 Q5,-6.5 5,-2.2 L5,1.2 L3.4,1.2 L3.4,-2.1 Q3.4,-5 0,-5 Q-3.4,-5 -3.4,-2.1 L-3.4,1.2 Z"
        fill={rustique ? '#c9a476' : '#c98155'}
      />
      <path d="M-5,-2.2 Q-5,-6.5 0,-6.5 Q5,-6.5 5,-2.2" stroke={rustique ? '#e8d3ac' : '#e8b58c'} strokeWidth={0.7} opacity={0.7} fill="none" />
      <path d="M-4.2,-4.7 l-0.75,-0.55 M-2.1,-5.9 l-0.3,-0.85 M2.1,-5.9 l0.3,-0.85 M4.2,-4.7 l0.75,-0.55" stroke="#8a4a2b" strokeWidth={0.5} opacity={0.55} />
      <path d="M-3.4,1.2 L-3.4,-2.1 Q-3.4,-5 0,-5 Q3.4,-5 3.4,-2.1 L3.4,1.2 Z" fill="#1b0a04" />
      <ellipse cx={0} cy={-1.4} rx={8} ry={7.2} fill="url(#f-halo)">
        <animate attributeName="opacity" values="1;0.62;1" dur="1.1s" begin={b} repeatCount="indefinite" />
      </ellipse>
      <ellipse cx={0} cy={-0.5} rx={3.1} ry={2.9} fill="url(#f-gueule)">
        <animate attributeName="opacity" values="1;0.76;1" dur="1.1s" begin={b} repeatCount="indefinite" />
      </ellipse>
      <circle cx={-0.2} cy={-1.2} r={1.5} fill="#fff6d6">
        <animate attributeName="r" values="1.5;1;1.5" dur="1.1s" begin={b} repeatCount="indefinite" />
      </circle>
      {/* sole : braises qui couvent, lèvre embrasée par en dessous */}
      {!simple && (
        <g>
          <path d="M-2.6,1.1 Q0,0.1 2.6,1.1 Z" fill="#3a2016" />
          <circle cx={-1.4} cy={0.7} r={0.42} fill="#ff9a3c" opacity={0.9} />
          <circle cx={1.3} cy={0.9} r={0.35} fill="#ffc470" opacity={0.85} />
        </g>
      )}
      <path d="M-3.3,1 Q0,-4.4 3.3,1" stroke="#ffce7d" strokeWidth={0.8} opacity={0.5} fill="none" />

      {etincelles && (
        <g transform="translate(0,-2.6)">
          {(simple ? [{ dx: 3.8, dy: -9, d: '1.3s' }] : [
            { dx: 3.8, dy: -9, d: '1.3s' },
            { dx: -2.8, dy: -10.5, d: '1.7s' },
          ]).map((p, i) => (
            <circle key={i} r={0.85} fill="#ffdf8e" opacity={0}>
              <animate attributeName="cx" values={`0;${p.dx}`} dur={p.d} begin={b} repeatCount="indefinite" />
              <animate attributeName="cy" values={`0;${p.dy}`} dur={p.d} begin={b} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;0" keyTimes="0;0.25;1" dur={p.d} begin={b} repeatCount="indefinite" />
            </circle>
          ))}
        </g>
      )}
      {fumee && <FumeeForge x={0.5} y={souche ? -17.6 : -13.9} s={0.9} t={t} grasse />}
    </g>
  )
}

/** enclume d'acier sur billot cerclé : table froide, flanc ouest rougeoyant */
function Enclume({ x, y, s = 1, t = 0, piece = true }: { x: number; y: number; s?: number; t?: number; piece?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2.6} cy={0.9} rx={6.6} ry={2} fill={PAL.ombrePortee} opacity={0.19} filter="url(#a-flou1)" />
      {/* billot de chêne : fût trapu, chant ouest éclairé, cercle de fer */}
      <path d="M-3.6,0.9 L-3.3,-3.2 L3.3,-3.2 L3.6,0.9 Q0,2 -3.6,0.9 Z" fill="url(#a-bois-o)" />
      <path d="M-3.6,0.9 L-3.3,-3.2 L-2,-3.2 L-2.3,1.25 Z" fill="#9b784f" />
      <path d="M2.1,-3.2 L3.3,-3.2 L3.6,0.9 L2.5,1.3 Z" fill="#43301c" opacity={0.6} />
      <ellipse cx={0} cy={-3.3} rx={3.35} ry={1.2} fill="#b08a58" />
      <ellipse cx={-0.3} cy={-3.4} rx={2.2} ry={0.72} fill="#93703f" opacity={0.85} />
      <ellipse cx={-0.45} cy={-3.5} rx={1} ry={0.32} fill="#79593a" opacity={0.85} />
      <path d="M-3.45,-1.5 Q0,-0.55 3.45,-1.5" stroke="#43403a" strokeWidth={0.95} fill="none" opacity={0.9} />
      <path d="M-3.4,-1.65 Q-1.9,-1.3 -0.6,-1.15" stroke="#8b939c" strokeWidth={0.45} fill="none" opacity={0.85} />
      {/* enclume : pied, étranglement, corps, bigorne, table spéculaire */}
      <path d="M-2.5,-3.4 L-2.5,-4.4 L2.5,-4.4 L2.5,-3.4 Z" fill="#383d44" />
      <path d="M-1.5,-4.4 L-1.2,-5.2 L1.4,-5.2 L1.7,-4.4 Z" fill="#4e545d" />
      <path d="M-3.5,-5.2 L-3.5,-6.9 L2.4,-6.9 L2.4,-5.2 Z" fill="url(#f-acier)" />
      <path d="M2.4,-6.9 Q5.2,-6.9 6.7,-6.1 Q5,-5.4 2.4,-5.2 Z" fill="#565d66" />
      <path d="M2.4,-6.9 Q5.2,-6.9 6.7,-6.1 L5.7,-5.95 Q4.4,-6.45 2.4,-6.5 Z" fill="#8b939d" />
      <path d="M-3.5,-6.9 L-3.1,-7.7 L2.6,-7.7 L2.4,-6.9 Z" fill="#a8b1bb" />
      <path d="M-3.1,-7.7 L2.6,-7.7 L2.5,-7.45 L-3.2,-7.45 Z" fill="#dbe3ea" opacity={0.85} />
      {/* le four rougeoie sur les arêtes ouest - contraste chaud / froid */}
      <path d="M-3.55,-5.3 L-3.55,-6.85" stroke="#ff9a45" strokeWidth={0.9} opacity={0.6} />
      <path d="M-3.62,-3.5 L-3.5,-1" stroke="#ff9a45" strokeWidth={0.8} opacity={0.32} />
      {piece && (
        <g>
          <ellipse cx={-0.4} cy={-8} rx={3.6} ry={1.7} fill="url(#f-halo)" opacity={0.55}>
            <animate attributeName="opacity" values="0.55;0.25;0.55" dur="1.3s" begin={`${t}s`} repeatCount="indefinite" />
          </ellipse>
          <rect x={-2.6} y={-8.5} width={4.4} height={0.95} rx={0.45} fill="#dd5f1e" />
          <rect x={-2.6} y={-8.5} width={4.4} height={0.95} rx={0.45} fill="#ffd66b">
            <animate attributeName="opacity" values="0.95;0.4;0.95" dur="1.3s" begin={`${t}s`} repeatCount="indefinite" />
          </rect>
        </g>
      )}
      {/* battitures et chutes de fer au pied */}
      <path d="M-5.4,1.5 l1.5,-0.35 M4.8,1.7 l1.6,0.2" stroke="#5a5f66" strokeWidth={0.5} opacity={0.8} />
      <circle cx={5.6} cy={1} r={0.4} fill="#e8913c" opacity={0.85} />
    </g>
  )
}

/** bac de trempe : douelles cerclées, eau sombre, vapeur, sol détrempé */
function BacTrempe({ x, y, s = 1, t = 0 }: { x: number; y: number; s?: number; t?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {/* le sol boit l'eau : tache froide, contrepoint du halo du four */}
      <ellipse cx={2.6} cy={1.4} rx={6.4} ry={2} fill="#425560" opacity={0.12} filter="url(#a-flou2)" />
      <ellipse cx={1.8} cy={0.8} rx={5.4} ry={1.7} fill={PAL.ombrePortee} opacity={0.17} filter="url(#a-flou1)" />
      {/* cuve : galbe cylindrique, flanc ouest au soleil, flanc est éteint */}
      <path d="M-4.3,0.4 C-5.1,-2 -5,-4 -4.7,-5.3 L4.7,-5.3 C5,-4 5.1,-2 4.3,0.4 Q0,1.8 -4.3,0.4 Z" fill="url(#a-bois-l)" />
      <path d="M1.7,-5.3 L4.7,-5.3 C5,-4 5.1,-2 4.3,0.4 Q3.1,1.05 1.9,1.25 C2.5,-1.4 2.3,-3.4 1.7,-5.3 Z" fill="#63482e" opacity={0.8} />
      <path d="M-4.7,-5.3 L-3.4,-5.3 C-3.9,-3.4 -4,-1.4 -3.6,1.15 Q-4,0.95 -4.3,0.4 C-5.1,-2 -5,-4 -4.7,-5.3 Z" fill="#cdad82" opacity={0.85} />
      <path d="M-2.2,-5.2 C-2.5,-3 -2.5,-1 -2.3,0.95 M0,-5.3 C0,-3 0,-1 0,1.25 M2.2,-5.2 C2.4,-3 2.4,-1 2.2,0.95" stroke="#5f462d" strokeWidth={0.45} opacity={0.5} fill="none" />
      {/* cercles de fer, arête claire dessus */}
      <path d="M-4.95,-3.9 Q0,-2.65 4.95,-3.9" stroke="#3a3833" strokeWidth={1.4} fill="none" />
      <path d="M-4.9,-4.25 Q-2.6,-3.55 -0.4,-3.32" stroke="#a2acb6" strokeWidth={0.5} fill="none" opacity={0.9} />
      <path d="M-4.6,-0.55 Q0,0.7 4.6,-0.55" stroke="#3a3833" strokeWidth={1.4} fill="none" />
      <path d="M-4.55,-0.9 Q-2.5,-0.25 -0.6,-0.02" stroke="#8b939c" strokeWidth={0.45} fill="none" opacity={0.75} />
      {/* eau : miroir profond, reflet du ciel, ride */}
      <ellipse cx={0} cy={-5.3} rx={4.72} ry={1.68} fill="#54402c" />
      <ellipse cx={0} cy={-5.35} rx={3.7} ry={1.18} fill="url(#f-eau)" />
      <path d="M-2.4,-5.75 Q-1,-6.3 0.6,-5.95" stroke="#93bfda" strokeWidth={0.5} opacity={0.7} fill="none" />
      <circle cx={-1.9} cy={-5.65} r={0.4} fill="#e6f2fb" opacity={0.85} />
      {/* liseré chaud volé au four, côté ouest */}
      <path d="M-4.6,-4.6 C-4.95,-2.6 -4.85,-1 -4.25,0.2" stroke="#ff9a45" strokeWidth={0.8} opacity={0.38} fill="none" />
      {/* lame en attente de trempe, posée contre la cuve */}
      <path d="M5,-0.4 L5.9,-0.2 L4.3,-7.6 L3.7,-7.6 Z" fill="url(#f-acier)" />
      <path d="M5,-0.4 L5.4,-0.3 L3.9,-7.6 L3.7,-7.6 Z" fill="#c3ccd4" opacity={0.8} />
      <path d="M4.85,-1.1 L5.85,-0.9" stroke="#5c3f21" strokeWidth={1.1} />
      {/* vapeur */}
      {[
        { cx: 0.8, r: 1.1, d: '3.6s', b: `${t}s` },
        { cx: -1.4, r: 0.8, d: '3.6s', b: `${t + 1.8}s` },
      ].map((p, i) => (
        <circle key={i} cx={p.cx} cy={-5.6} r={p.r} fill="url(#f-fumee)" opacity={0}>
          <animate attributeName="cy" values="-5.6;-13.5" dur={p.d} begin={p.b} repeatCount="indefinite" />
          <animate attributeName="r" values={`${p.r};${p.r * 3.2}`} dur={p.d} begin={p.b} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.75;0" keyTimes="0;0.2;1" dur={p.d} begin={p.b} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  )
}

/** soufflet de cuir sur chevalet : buse enfoncée dans le flanc du four (à droite) */
function Soufflet({ x, y, s = 1, t = 0 }: { x: number; y: number; s?: number; t?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={0.5} cy={0.9} rx={6.4} ry={2} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou1)" />
      {/* chevalet : deux montants trapus, traverse */}
      <path d="M-3.9,0.8 L-3.5,-3.2 L-2.1,-3.2 L-2.5,0.8 Z" fill={PAL.boisMi} />
      <path d="M-3.9,0.8 L-3.5,-3.2 L-2.9,-3.2 L-3.3,0.8 Z" fill="#b08d63" />
      <path d="M3,1 L3.4,-3.7 L4.7,-3.7 L4.3,1 Z" fill={PAL.boisOmbre} />
      <path d="M-3.3,-1.4 L3.9,-1.1 L3.9,-0.4 L-3.3,-0.7 Z" fill={PAL.boisOmbre} opacity={0.85} />
      {/* poumon de cuir : masse sombre en accordéon, bien renflée à l'ouest */}
      <path d="M7.2,-5.2 L-4.6,-9.8 C-8.6,-10.6 -8.8,-2.2 -4.4,-3 L7.2,-4.4 Z" fill="url(#f-cuir)" />
      <path d="M-4.6,-9.8 C-8.6,-10.6 -8.8,-2.2 -4.4,-3 L-3.1,-3.2 C-6.4,-3.6 -6.3,-9 -3.4,-9.4 Z" fill="#3b2113" opacity={0.55} />
      {/* planche du cul, à l'ouest */}
      <path d="M-4.6,-9.9 C-7.6,-10.6 -7.8,-2.2 -4.4,-2.9 L-5.3,-3.1 C-8.4,-3.6 -8.3,-9.3 -5.4,-9.7 Z" fill="#7d5c38" />
      {[0.24, 0.5, 0.76].map((k) => {
        const px = -4.6 + 11.8 * k
        const py = -9.8 + 4.6 * k
        const qx = -4.4 + 11.6 * k
        const qy = -3 - 1.4 * k
        return (
          <g key={k}>
            <path d={`M${px},${py} Q${(px + qx) / 2 - 1.6},${(py + qy) / 2} ${qx},${qy}`} stroke="#b57c4e" strokeWidth={1.8} fill="none" />
            <path d={`M${px + 0.8},${py} Q${(px + qx) / 2 - 0.7},${(py + qy) / 2} ${qx + 0.8},${qy}`} stroke="#2b170c" strokeWidth={0.9} fill="none" opacity={0.8} />
          </g>
        )
      })}
      <path d="M-4.2,-9.6 L7.1,-5.3" stroke="#c99268" strokeWidth={0.7} opacity={0.7} />
      {/* cerclage de laiton au col */}
      <path d="M7,-5.3 L7,-4.4" stroke="#a6813a" strokeWidth={1.2} />
      {/* planche basse fixe, clouée sous le cuir */}
      <path d="M-4.8,-2.9 L7.2,-4.35 L7.2,-3.3 L-4.7,-1.7 Z" fill="#7d5c38" />
      <path d="M-4.8,-2.9 L7.2,-4.35 L7.2,-4 L-4.8,-2.55 Z" fill="#a8845d" />
      {/* buse de fer plantée dans le flanc du four + tuyère rougie */}
      <path d="M6.9,-5.2 L10.4,-4.9 L10.4,-3.8 L6.9,-4.1 Z" fill="#6e757e" />
      <path d="M6.9,-5.2 L10.4,-4.9 L10.4,-4.6 L6.9,-4.9 Z" fill="#a7aeb6" />
      <ellipse cx={10.5} cy={-4.3} rx={2.1} ry={1.8} fill="url(#f-halo)" />
      {/* planche haute mobile : bat la mesure du feu (charnière au col) */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="-8 7 -4.9;3 7 -4.9;-8 7 -4.9"
          keyTimes="0;0.4;1"
          dur="1.1s"
          begin={`${t}s`}
          repeatCount="indefinite"
        />
        <path d="M-5,-11 L7.1,-6.3 L7.1,-5.3 L-4.8,-9.9 Z" fill="#8f6b43" />
        <path d="M-5,-11 L7.1,-6.3 L7.1,-5.95 L-5,-10.65 Z" fill="#c9a97e" />
        <path d="M-3.6,-10.4 L-5.8,-14.6 L-4.6,-15 L-2.6,-10.8 Z" fill={PAL.boisMi} />
        <path d="M-5.8,-14.6 L-4.6,-15 L-5,-15.8 L-6.3,-15.3 Z" fill="#5a616a" />
      </g>
    </g>
  )
}

/** râtelier : lances au fer clair, boucliers de bronze à éclat spéculaire */
function RatelierArmes({ x, y, s = 1, bouclier = true, seed = 3 }: { x: number; y: number; s?: number; bouclier?: boolean; seed?: number }) {
  const rnd = alea(seed)
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={3} cy={1} rx={9} ry={2.2} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou1)" />
      {/* montants : bois deux tons, cales de pierre au pied */}
      {[-6.5, 6.5].map((px) => (
        <g key={px}>
          <path d={`M${px - 1.1},0.7 L${px - 0.85},-12 L${px + 0.85},-12 L${px + 1.1},0.7 Z`} fill="#7d5c38" />
          <path d={`M${px - 1.1},0.7 L${px - 0.85},-12 L${px - 0.3},-12 L${px - 0.5},0.7 Z`} fill="#a8845d" />
          <path d={`M${px + 0.3},-12 L${px + 0.85},-12 L${px + 1.1},0.7 L${px + 0.45},0.7 Z`} fill="#4f3a22" opacity={0.85} />
          <path d={`M${px - 2},1 q2,-2.2 4,0 q-2,1 -4,0 Z`} fill={PAL.pierreMi} opacity={0.9} />
        </g>
      ))}
      <path d="M-8,-10.6 L8,-10.6 L8,-11.5 L-8,-11.5 Z" fill="#7d5c38" />
      <path d="M-8,-11.5 L8,-11.5 L8,-11.15 L-8,-11.15 Z" fill="#a8845d" />
      <line x1={-7.4} y1={-4.2} x2={7.4} y2={-4.2} stroke={PAL.boisOmbre} strokeWidth={1.1} opacity={0.9} />
      {/* lances : hampe deux tons, fer à deux facettes */}
      {[-4.3, -1.5, 1.4, 4.2].map((lx, i) => {
        const inc = 1.3 + rnd() * 0.9
        return (
          <g key={lx}>
            <line x1={lx} y1={-11.9} x2={lx + inc} y2={0.9} stroke="#5c3f21" strokeWidth={1.2} />
            <line x1={lx - 0.2} y1={-11.7} x2={lx + inc * 0.45} y2={-5.4} stroke="#9c7c53" strokeWidth={0.55} opacity={0.9} />
            <path d={`M${lx - 0.6},-12 L${lx + 0.2},${-14.3 - i * 0.3} L${lx + 0.8},-11.85 Z`} fill="#6a727c" />
            <path d={`M${lx - 0.6},-12 L${lx + 0.2},${-14.3 - i * 0.3} L${lx + 0.18},-11.95 Z`} fill="#c3ccd4" />
          </g>
        )
      })}
      {/* bouclier bombé appuyé contre le montant est */}
      {bouclier && (
        <g transform="translate(10.2,-3.6)">
          <ellipse cx={0.8} cy={4} rx={3.6} ry={1.2} fill={PAL.ombrePortee} opacity={0.15} />
          <circle r={4.3} fill="#7d5f26" />
          <circle r={3.7} fill="url(#f-bronze)" />
          <circle cx={-0.7} cy={-0.7} r={1.4} fill="#f3d992" />
          <circle cx={-1} cy={-1} r={0.6} fill="#fff8e2" />
          <path d="M-2.9,-1.7 Q-1.8,-3.2 0.2,-3.4" stroke="#fff6dd" strokeWidth={0.9} opacity={0.9} fill="none">
            <animate attributeName="opacity" values="0.45;1;0.45" dur="3.1s" repeatCount="indefinite" />
          </path>
        </g>
      )}
      {/* petit bouclier suspendu au montant par sa lanière */}
      <g transform="translate(-7.4,-6.6)">
        <line x1={0.4} y1={-2.6} x2={0.9} y2={-6.2} stroke="#6b4c2a" strokeWidth={0.7} />
        <circle r={2.9} fill="#6d5324" />
        <circle r={2.4} fill="url(#f-bronze)" opacity={0.9} />
        <circle cx={-0.5} cy={-0.5} r={0.85} fill="#efd38b" />
      </g>
    </g>
  )
}

/** lingots de bronze empilés : or chaud, chants au repos */
function Lingots({ x, y, s = 1, petit = false }: { x: number; y: number; s?: number; petit?: boolean }) {
  // pyramide 3 + 2 : dessus clair, face mi-teinte, chant est éteint
  const rangs: [number, number][] = petit
    ? [
        [-2.4, 0],
        [2.4, 0.3],
        [0, -2.5],
      ]
    : [
        [-4.4, 0],
        [0, 0.3],
        [4.4, 0.6],
        [-2.2, -2.7],
        [2.2, -2.4],
      ]
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={1.6} cy={1.4} rx={petit ? 6.4 : 9} ry={2.2} fill={PAL.ombrePortee} opacity={0.17} filter="url(#a-flou1)" />
      {rangs.map(([lx, ly], i) => (
        <g key={i} transform={`translate(${lx},${ly})`}>
          <path d="M-2.6,0 L2.6,0 L2.1,-2.1 L-2.1,-2.1 Z" fill="#b98d33" />
          <path d="M-2.1,-2.1 L2.1,-2.1 L2.9,-3 L-1.3,-3 Z" fill="#f0d68e" />
          <path d="M2.1,-2.1 L2.9,-3 L2.9,-2.55 L2.6,0 Z" fill="#6d5320" />
        </g>
      ))}
    </g>
  )
}

/** tas de charbon de bois : facettes mates, cendre au pied, une braise */
function TasCharbon({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={1.2} cy={0.9} rx={7.4} ry={2} fill={PAL.ombrePortee} opacity={0.16} />
      <ellipse cx={0.6} cy={0.6} rx={6.8} ry={1.7} fill="#a89c86" opacity={0.5} />
      <path d="M-6,0.4 Q-4.2,-4.4 0,-5 Q4.6,-4.4 6,0.4 Q0,1.8 -6,0.4 Z" fill="#2a231b" />
      <path d="M-4.2,-1.6 L-2.6,-3 L-1.2,-1.4 L-2.9,-0.2 Z" fill="#463b2e" />
      <path d="M0.2,-4.4 L2,-3.4 L1.2,-1.7 L-0.6,-2.6 Z" fill="#1d1811" />
      <path d="M2.6,-2.6 L4.4,-1.6 L3.8,0 L2.2,-0.8 Z" fill="#3b3227" />
      <path d="M-1.6,-1 L0.4,-0.4 L0,0.8 L-1.9,0.3 Z" fill="#171310" />
      <path d="M-3.6,-2.8 l1.1,-0.6 M1.4,-3.9 l1.1,-0.3 M3.2,-1.2 l0.9,0.4" stroke="#77695a" strokeWidth={0.45} opacity={0.65} />
      <circle cx={1.6} cy={-2.2} r={0.5} fill="#e8913c">
        <animate attributeName="opacity" values="0.95;0.25;0.95" dur="2.3s" repeatCount="indefinite" />
      </circle>
    </g>
  )
}

/** établi : plateau épais, étau de bois, outils, lame ébauchée */
function Etabli({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2} cy={0.8} rx={9} ry={2.2} fill={PAL.ombrePortee} opacity={0.16} filter="url(#a-flou1)" />
      {/* pieds + entretoise */}
      <path d="M-6.6,0.6 L-6.2,-4.6 L-4.9,-4.6 L-5.3,0.6 Z" fill={PAL.boisMi} />
      <path d="M5.6,0.8 L5.2,-4.4 L6.5,-4.4 L6.9,0.8 Z" fill={PAL.boisOmbre} />
      <path d="M-5.6,-1.6 L6,-1.4 L6,-0.8 L-5.6,-1 Z" fill={PAL.boisOmbre} opacity={0.85} />
      {/* plateau : chant en demi-teinte, dessus éclairé */}
      <path d="M-8,-4.5 L8,-4.3 L8,-5.6 L-8,-5.8 Z" fill="#7d5c38" />
      <path d="M-8,-5.8 L8,-5.6 L9.2,-7 L-6.8,-7.2 Z" fill="#a8845d" />
      <path d="M-6.8,-7.2 L9.2,-7 L9.2,-6.7 L-6.8,-6.9 Z" fill="#c9a97e" opacity={0.85} />
      {/* étau de bois + vis */}
      <path d="M-6.4,-7 L-3.4,-7 L-3.4,-9.4 L-6.4,-9.4 Z" fill="#8f6b43" />
      <path d="M-6.4,-9.4 L-3.4,-9.4 L-3.4,-9.05 L-6.4,-9.05 Z" fill="#c2a175" />
      <line x1={-6.8} y1={-8.3} x2={-2.9} y2={-8.3} stroke="#5a616a" strokeWidth={0.7} />
      {/* lame ébauchée serrée dans l'étau : acier froid, soie brute */}
      <path d="M-4.6,-9.4 L-4,-9.4 L-3.2,-16.4 L-4.4,-16.4 Z" fill="url(#f-acier)" />
      <path d="M-4.6,-9.4 L-4.2,-9.4 L-3.6,-16.4 L-4.4,-16.4 Z" fill="#d0d8e0" opacity={0.85} />
      {/* outils sur le plateau */}
      <line x1={0.6} y1={-7} x2={4.4} y2={-6.6} stroke="#6b4c2a" strokeWidth={0.9} />
      <path d="M-0.4,-7.9 L1.6,-7.7 L1.6,-6.5 L-0.4,-6.7 Z" fill="#787f88" />
      <path d="M-0.4,-7.9 L1.6,-7.7 L1.6,-7.2 L-0.4,-7.4 Z" fill="#c8cdd3" />
      <path d="M5,-7 Q7.4,-8.4 8.6,-7 Q7,-6.2 5,-7 Z" fill="#8a6b2e" />
      <path d="M5.4,-7.2 Q7.2,-8 8.2,-7.2" stroke="#e0b960" strokeWidth={0.6} fill="none" />
    </g>
  )
}

/** cuirasse de bronze sur mannequin, casque à crête, jambières - l'étal d'Héphaïstos */
function Cuirasse({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2} cy={0.8} rx={6.4} ry={1.8} fill={PAL.ombrePortee} opacity={0.18} filter="url(#a-flou1)" />
      {/* présentoir : panneau de planches sombres - le bronze y prend toute sa valeur */}
      <path d="M-5.8,-0.4 L-5.5,-16.2 L5.5,-16.2 L5.8,-0.4 Z" fill="#5a4327" />
      <path d="M-5.8,-0.4 L-5.5,-16.2 L-4.4,-16.2 L-4.6,-0.4 Z" fill="#7a5731" />
      <path d="M4.3,-16.2 L5.5,-16.2 L5.8,-0.4 L4.5,-0.4 Z" fill="#40301b" />
      <path d="M-1.9,-16.1 L-1.8,-0.5 M1.9,-16.1 L2,-0.5" stroke="#40301b" strokeWidth={0.5} opacity={0.8} />
      <path d="M-5.6,-16.2 L5.6,-16.2 L5.6,-15.5 L-5.6,-15.5 Z" fill="#9a7449" />
      {/* mât du mannequin */}
      <path d="M-1,-0.4 L-0.8,-15 L0.8,-15 L1,-0.4 Z" fill={PAL.boisMi} />
      <path d="M-1,-0.4 L-0.8,-15 L-0.2,-15 L-0.35,-0.4 Z" fill="#ac8a60" />
      <path d="M-6,-11.6 L6,-11.6 L6,-10.7 L-6,-10.7 Z" fill="#5f4527" />
      {/* plastron : épaules larges, taille serrée, bronze à quatre valeurs */}
      <path
        d="M-3.6,-3.4 C-5,-7 -6.2,-10.4 -5.8,-12.4 L5.8,-12.4 C6.2,-10.4 5,-7 3.6,-3.4 C1.8,-2.4 -1.8,-2.4 -3.6,-3.4 Z"
        fill="url(#f-bronze)"
      />
      <path d="M-3.6,-3.4 C-5,-7 -6.2,-10.4 -5.8,-12.4 L-3.6,-12.4 C-3.9,-10.2 -2.8,-6.6 -1.6,-2.9 Z" fill="#f6e0a0" opacity={0.8} />
      <path d="M3.4,-12.4 L5.8,-12.4 C6.2,-10.4 5,-7 3.6,-3.4 L1.9,-2.85 C3.2,-6.6 3.9,-10 3.4,-12.4 Z" fill="#5f4720" opacity={0.9} />
      {/* encolure creuse + musculature ciselée */}
      <path d="M-2.5,-12.4 A2.5,1.7 0 0 0 2.5,-12.4 Z" fill="#42311b" />
      <path d="M-3.9,-9.4 Q0,-8 3.9,-9.4" stroke="#8f7028" strokeWidth={0.7} fill="none" opacity={0.9} />
      <path d="M-1.9,-6.8 Q0,-6.2 1.9,-6.8 M-1.6,-5.3 Q0,-4.8 1.6,-5.3" stroke="#8f7028" strokeWidth={0.6} fill="none" opacity={0.85} />
      <path d="M0,-12 L0,-2.9" stroke="#8f7028" strokeWidth={0.4} opacity={0.55} />
      {/* épaulières rivetées */}
      <path d="M-5.9,-12.3 Q-4.6,-13.9 -2.8,-12.9 L-3.1,-11.4 Z" fill="#c69b40" />
      <path d="M5.9,-12.3 Q4.6,-13.9 2.8,-12.9 L3.1,-11.4 Z" fill="#7d5f26" />
      {/* éclat spéculaire qui court sur le bronze */}
      <path d="M-4.9,-10.6 Q-4,-12 -2.4,-12.2" stroke="#fff8e2" strokeWidth={1.1} fill="none">
        <animate attributeName="opacity" values="0.25;1;0.25" dur="2.8s" repeatCount="indefinite" />
      </path>
      {/* casque corinthien à crête pourpre, détaché du plastron par son ombre */}
      <ellipse cx={0.4} cy={-13} rx={3} ry={1} fill="#2a1d0f" opacity={0.55} filter="url(#a-flou1)" />
      <path d="M-2.9,-15.2 A2.9,3.3 0 0 1 2.9,-15.2 L2.3,-13.4 L-2.3,-13.4 Z" fill="url(#f-bronze)" />
      <path d="M-2.9,-15.2 A2.9,3.3 0 0 1 -0.6,-18.4 L-0.8,-14.6 Z" fill="#f6e0a0" opacity={0.75} />
      <path d="M-1.5,-14.3 L-0.4,-14.3 L-0.4,-13.4 L-1.5,-13.4 Z M0.4,-14.3 L1.5,-14.3 L1.5,-13.4 L0.4,-13.4 Z" fill="#2f2212" />
      <path d="M-0.25,-14.6 L0.25,-14.6 L0.25,-13.2 L-0.25,-13.2 Z" fill="#c69b40" />
      <path d="M-3,-17 Q0,-21.4 3,-17 Q0,-18.4 -3,-17 Z" fill="#a84a37" />
      <path d="M-2.4,-17.4 Q0,-20.4 2.2,-17.6" stroke="#cf6a52" strokeWidth={0.7} fill="none" opacity={0.9} />
      {/* jambières de bronze appuyées contre le panneau */}
      <path d="M4.6,0.4 C6,-0.8 6.4,-3 5.8,-4.6 L7.4,-4.4 C8,-2.4 7.4,-0.4 6.3,0.7 Z" fill="#8a6b2e" />
      <path d="M4.6,0.4 C6,-0.8 6.4,-3 5.8,-4.6 L6.4,-4.5 C6.8,-2.6 6.4,-0.6 5.4,0.6 Z" fill="#dcb45c" />
    </g>
  )
}

/** cheminée de pierre sur le pan de toit, fumée grasse */
function Cheminee({ x, y, h = 10, t = 0 }: { x: number; y: number; h?: number; t?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-2.7} y={-h} width={5.4} height={h} fill="url(#a-pierre-o)" />
      <rect x={-2.7} y={-h} width={5.4} height={h} fill="#6b5230" opacity={0.28} />
      <line x1={-2.25} y1={-h + 0.4} x2={-2.25} y2={-0.4} stroke="#c5bda8" strokeWidth={0.8} opacity={0.7} />
      <path d={`M-2.7,-1.6 h5.4 M-2.7,${-h * 0.55} h5.4`} stroke={PAL.pierreJoint} strokeWidth={0.5} opacity={0.6} />
      <rect x={-3.6} y={-h - 2.2} width={7.2} height={2.4} fill={PAL.pierreMi} />
      <rect x={-3.6} y={-h - 2.2} width={7.2} height={0.7} fill={PAL.pierreLit} />
      <rect x={-3.6} y={-h + 0.2} width={7.2} height={0.8} fill={PAL.ombrePortee} opacity={0.25} />
      <ellipse cx={0} cy={-h - 2.2} rx={2} ry={0.65} fill="#3a2c1c" />
      {/* la suie a coulé sous le couronnement */}
      <path d={`M-2.2,${-h + 0.4} q2.2,3.4 4.4,0.2 l0,2.4 q-2.2,2.4 -4.4,0 Z`} fill="#2b2118" opacity={0.2} />
      <FumeeForge x={0} y={-h - 3.4} t={t} grasse />
    </g>
  )
}

/** appentis de tuiles sur poteaux + lanterne à fumée au-dessus du four */
function Appentis({ t = 0 }: { t?: number }) {
  return (
    <g>
      {/* poteau arrière + deux porteurs avant */}
      <line x1={-21} y1={-9} x2={-21} y2={-20.5} stroke={PAL.boisOmbre} strokeWidth={1.7} opacity={0.9} />
      {[
        [-26, 6, -15.5],
        [13, 4, -17],
      ].map(([px, py, ph]) => (
        <g key={px}>
          <ellipse cx={px + 1.2} cy={py + 0.9} rx={2.4} ry={0.9} fill={PAL.ombrePortee} opacity={0.17} />
          <path d={`M${px - 1.3},${py} L${px - 1},${ph} L${px + 1},${ph} L${px + 1.3},${py} Z`} fill={PAL.boisMi} />
          <path d={`M${px - 1.3},${py} L${px - 1},${ph} L${px - 0.35},${ph} L${px - 0.55},${py} Z`} fill="#b08d63" />
          <path d={`M${px + 0.4},${ph} L${px + 1},${ph} L${px + 1.3},${py} L${px + 0.6},${py} Z`} fill={PAL.boisOmbre} opacity={0.8} />
          {/* jambe de force : la charpente tient debout */}
          <path d={`M${px - 0.6},${ph + 4.4} L${px - 4.4},${ph + 0.6} L${px - 3.6},${ph + 0.2} L${px + 0.4},${ph + 4} Z`} fill="#7d5c38" />
        </g>
      ))}
      {/* chevrons sous le pan, vus par la tranche */}
      {[-20, -10, 0, 9].map((cx) => (
        <line key={cx} x1={cx} y1={-15.2 - cx * 0.045} x2={cx + 3.6} y2={-22.5 - cx * 0.045} stroke="#6b4c2a" strokeWidth={0.9} opacity={0.75} />
      ))}
      {/* pan unique incliné vers le NW : il prend la lumière */}
      <path d="M-28.5,-14.8 L15.5,-16.8 L19.5,-24.8 L-24.5,-22.3 Z" fill="url(#a-toit-l)" />
      {[0.3, 0.6, 0.85].map((k) => (
        <line
          key={k}
          x1={-28.5 + 4 * k}
          y1={-14.8 - 7.5 * k}
          x2={15.5 + 4 * k}
          y2={-16.8 - 8 * k}
          stroke={PAL.toitOmbre}
          strokeWidth={0.9}
          opacity={0.5}
          strokeDasharray="3.2 1.1"
        />
      ))}
      <line x1={-28.5} y1={-14.8} x2={15.5} y2={-16.8} stroke={PAL.toitArete} strokeWidth={1.4} opacity={0.95} />
      <line x1={15.5} y1={-16.8} x2={19.5} y2={-24.8} stroke={PAL.toitOmbre} strokeWidth={1} opacity={0.8} />
      <line x1={-24.5} y1={-22.3} x2={19.5} y2={-24.8} stroke="#e0956b" strokeWidth={0.9} opacity={0.7} />
      {/* lanterne à fumée : le pan s'ouvre au-dessus du four */}
      <path d="M-16.6,-19.4 L-10.4,-19.7 L-9.2,-22 L-15.4,-21.7 Z" fill="#3a2b1c" />
      <path d="M-16.6,-19.4 L-10.4,-19.7 L-10.6,-20.3 L-16.3,-20 Z" fill="#8a6b45" opacity={0.75} />
      <path d="M-15.4,-21.7 L-9.2,-22 L-9.3,-22.7 L-15.6,-22.4 Z" fill={PAL.toitArete} opacity={0.9} />
      <path d="M-16.6,-19.4 L-15.4,-21.7 M-10.4,-19.7 L-9.2,-22" stroke="#b8794f" strokeWidth={0.7} opacity={0.8} />
      <FumeeForge x={-12.6} y={-22} s={0.85} t={t} grasse />
    </g>
  )
}

/** porte cintrée : jambages de brique réfractaire, l'intérieur rougeoie */
function PorteForge({ x = 0, w = 9, h = 12, t = 0 }: { x?: number; w?: number; h?: number; t?: number }) {
  const r = w / 2
  const b = `${t}s`
  return (
    <g>
      {/* la lueur rase le seuil */}
      <ellipse cx={x} cy={1} rx={w * 0.9} ry={1.9} fill="url(#f-lueur)">
        <animate attributeName="opacity" values="1;0.55;1" dur="1.1s" begin={b} repeatCount="indefinite" />
      </ellipse>
      {/* encadrement : anneau de briques */}
      <path
        d={
          `M${x - r - 1.9},0 L${x - r - 1.9},${-h + r - 1} A${r + 1.9},${r + 1.9} 0 0 1 ${x + r + 1.9},${-h + r - 1} L${x + r + 1.9},0 ` +
          `L${x + r},0 L${x + r},${-h + r} A${r},${r} 0 0 0 ${x - r},${-h + r} L${x - r},0 Z`
        }
        fill="#c07a4f"
      />
      <path d={`M${x - r - 1.9},${-h + r - 1} A${r + 1.9},${r + 1.9} 0 0 1 ${x + r + 1.9},${-h + r - 1}`} stroke="#e0a077" strokeWidth={0.8} opacity={0.75} fill="none" />
      <path
        d={`M${x - r - 1.6},${-h + r - 3.4} l-1.5,-0.9 M${x - 1.6},${-h - 0.6} l-0.3,-1.5 M${x + 1.6},${-h - 0.6} l0.3,-1.5 M${x + r + 1.6},${-h + r - 3.4} l1.5,-0.9`}
        stroke="#8f4b2c"
        strokeWidth={0.55}
        opacity={0.6}
      />
      <path d={`M${x - r},0 L${x - r},${-h + r} A${r},${r} 0 0 1 ${x + r},${-h + r} L${x + r},0 Z`} fill="#1d0c06" />
      {/* le fond de l'atelier rougeoie : braises au sol, pénombre en haut */}
      <path
        d={`M${x - r + 0.6},-0.4 L${x - r + 0.6},${-h * 0.62} A${r - 0.6},${r - 0.6} 0 0 1 ${x + r - 0.6},${-h * 0.62} L${x + r - 0.6},-0.4 Z`}
        fill="url(#f-halo)"
      >
        <animate attributeName="opacity" values="1;0.62;1" dur="1.1s" begin={b} repeatCount="indefinite" />
      </path>
      <ellipse cx={x} cy={-1.8} rx={r - 1.6} ry={2.9} fill="url(#f-gueule)" opacity={0.78}>
        <animate attributeName="opacity" values="0.78;0.48;0.78" dur="1.1s" begin={b} repeatCount="indefinite" />
      </ellipse>
      {/* enclume et établi en contre-jour devant les braises */}
      <path
        d={`M${x - 4},0 L${x - 3.9},-2.6 L${x - 4.6},-2.6 L${x - 4.6},-3.4 L${x - 1.2},-3.4 L${x - 1.2},-2.6 L${x - 1.9},-2.6 L${x - 1.8},0 Z`}
        fill="#1a0a03"
      />
      <path d={`M${x + 1.4},0 L${x + 1.4},-3.4 L${x + 4.2},-3.4 L${x + 4.2},0 Z`} fill="#1f0d05" />
      <path d={`M${x - r},0 L${x - r},${-h + r}`} stroke="#170903" strokeWidth={0.9} opacity={0.75} />
    </g>
  )
}

/** outils pendus au mur : pinces, marteau, faucille à réparer */
function OutilsMur({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={-4.8} y1={0} x2={4.8} y2={0} stroke={PAL.boisOmbre} strokeWidth={0.9} />
      <line x1={-4.8} y1={-0.4} x2={4.8} y2={-0.4} stroke="#a8845d" strokeWidth={0.5} opacity={0.8} />
      <path d="M-3.2,0.4 L-3.5,4.8 M-2.5,0.4 L-2.2,4.8" stroke="#5a616a" strokeWidth={0.75} />
      <path d="M-3.5,4.8 Q-2.85,5.9 -2.2,4.8" stroke="#5a616a" strokeWidth={0.7} fill="none" />
      <path d="M-3.3,0.5 L-3.45,2.6" stroke="#a7aeb6" strokeWidth={0.4} opacity={0.9} />
      <line x1={0.6} y1={0.3} x2={0.6} y2={4.4} stroke="#6b4c2a" strokeWidth={0.85} />
      <rect x={-0.7} y={0.6} width={2.6} height={1.4} rx={0.4} fill="#6f767f" />
      <rect x={-0.7} y={0.6} width={2.6} height={0.6} rx={0.3} fill="#c8cdd3" />
      <path d="M3.4,0.4 Q4.9,2.5 3.6,4.6" stroke="#8b939c" strokeWidth={0.85} fill="none" />
      <path d="M3.4,0.4 Q4.6,2.3 3.5,4.3" stroke="#dee5eb" strokeWidth={0.35} fill="none" opacity={0.9} />
    </g>
  )
}

// ── FORGE ────────────────────────────────────────────────────────────────────
export function Forge({ n }: { n: number }) {
  const rnd = alea(43)
  const gros = n >= 4
  const aire = 37 + n * 2.6

  // suie et cendre au sol, chutes de fer qui traînent - semis déterministe
  const taches = Array.from({ length: 5 }, (_, i) => ({
    x: -26 + rnd() * 48,
    y: 1 + rnd() * 10,
    r: 1.7 + rnd() * 2.4,
    o: 0.16 + rnd() * 0.14,
    k: i,
  }))
  const debris = Array.from({ length: 4 }, (_, i) => ({
    x: -18 + rnd() * 38,
    y: 4 + rnd() * 9,
    a: -30 + rnd() * 60,
    k: i,
  }))

  // postes de travail : les forgerons frappent en (12,6) et (-22,13)
  const xFour = n === 1 ? -11 : n === 2 ? -13 : n === 3 ? -15 : -17
  const yFour = n === 1 ? 3 : n === 2 ? 3.5 : 4
  const sFour = n === 1 ? 0.92 : n === 2 ? 1 : n === 3 ? 1.02 : 1.06
  const xSouf = n === 1 ? -26 : n === 2 ? -29 : n === 3 ? -31 : -33.5
  const ySouf = n === 1 ? 5 : n === 2 ? 5.5 : 6
  // gabarit de la bâtisse en dur (niveaux 3 et 4)
  const W = gros ? 50 : 42
  const H = gros ? 18 : 15
  const G = gros ? 11 : 9

  return (
    <g>
      <DefsForge />
      {/* aire de travail : terre battue, cendre grasse autour des foyers */}
      <ellipse cx={0} cy={3} rx={aire} ry={13} fill="#b9a878" opacity={0.75} />
      <ellipse cx={-4} cy={2} rx={aire * 0.68} ry={9.4} fill="#c8b88a" opacity={0.85} />
      <ellipse cx={xFour - 1} cy={yFour + 5} rx={18} ry={6.2} fill="#4a3a28" opacity={0.19} filter="url(#a-flou2)" />
      <ellipse cx={xFour + 2} cy={yFour + 4} rx={9.5} ry={3.4} fill="#3a2c1e" opacity={0.2} />
      {taches.map((t) => (
        <ellipse key={t.k} cx={t.x} cy={t.y} rx={t.r} ry={t.r * 0.34} fill="#6e6152" opacity={t.o} />
      ))}
      {debris.map((d) => (
        <line key={d.k} x1={d.x} y1={d.y} x2={d.x + 1.7} y2={d.y + d.a * 0.016} stroke="#6b6558" strokeWidth={0.45} opacity={0.42} />
      ))}

      {/* ── niveau 3+ : la forge en dur ── */}
      {n >= 3 && (
        <g transform={`translate(${gros ? 4 : 2},${gros ? -8 : -5})`}>
          <Batisse3D
            w={W}
            h={H}
            g={G}
            prof={gros ? 10 : 9}
            mat="pierre"
            toit="tuiles"
            enfants={
              <>
                {/* la fumée a patiné toute la façade : pierre chaude et enfumée */}
                <path d={`M${-W / 2},0 L${-W / 2},${-H} L0,${-H - G} L${W / 2},${-H} L${W / 2},0 Z`} fill="#6b5230" opacity={0.34} />
                {/* le retour est reçoit la même patine */}
                <path d={`M${W / 2},0 L${W / 2 + 7},-3.15 L${W / 2 + 7},${-H - 3.15} L${W / 2},${-H} Z`} fill="#5c4526" opacity={0.3} />
                {/* soubassement appareillé : la forge est bâtie pour durer */}
                <MurPierre x={-W / 2} y={-6} w={W} h={6} seed={11} />
                <rect x={-W / 2} y={-6} width={W} height={6} fill="#6b5334" opacity={0.26} />
                <rect x={-W / 2} y={-6.4} width={W} height={0.7} fill={PAL.pierreLit} opacity={0.7} />
                {/* la suie a monté le long du mur au-dessus de la porte */}
                <path
                  d={`M${(gros ? 6 : 8) - 6},${gros ? -13 : -11} q6,-4 12,0 q-3.4,-7 -6,-11.5 q-2.6,4.5 -6,11.5 Z`}
                  fill="#241c13"
                  opacity={0.3}
                  filter="url(#a-flou2)"
                />
                <PorteForge x={gros ? 6 : 8} w={gros ? 10 : 9} h={gros ? 14 : 12} />
                {gros && <Fenetre3D x={20} y={-2} w={4.5} h={5} />}
                <OutilsMur x={gros ? 15 : -10} y={gros ? -12 : -11} />
                {gros && (
                  /* emblème d'Héphaïstos : marteau d'or au fronton */
                  <g transform="translate(6,-17)">
                    <line x1={0} y1={0} x2={0} y2={3.6} stroke="#a3822e" strokeWidth={0.9} />
                    <rect x={-1.8} y={-1.3} width={3.6} height={1.8} rx={0.5} fill={PAL.or} />
                    <rect x={-1.8} y={-1.3} width={3.6} height={0.75} rx={0.35} fill="#ecd28a" />
                  </g>
                )}
              </>
            }
          />
          <Cheminee x={gros ? -13 : -11} y={gros ? -23 : -19} h={gros ? 11 : 9} t={0.4} />
        </g>
      )}

      {/* ── niveau 2 : l'appentis couvre le poste de travail ── */}
      {n === 2 && <Appentis t={0.3} />}

      {/* ── fours ── */}
      {gros && <FourBriques x={-4} y={-1} s={0.95} t={0.55} souche etincelles mur simple seed={9} />}
      <FourBriques
        x={xFour}
        y={yFour}
        s={sFour}
        souche={n >= 2}
        rustique={n === 1}
        etincelles
        mur={n >= 3}
        fumee={n !== 2}
        seed={5}
      />
      <Soufflet x={xSouf} y={ySouf} s={n === 1 ? 0.85 : 0.9} />

      {/* ── postes de martelage et de trempe ── */}
      {/* la table de l'enclume vient sous le marteau du forgeron de Ouvriers.tsx */}
      <Enclume x={3.5} y={9} />
      {gros && <Enclume x={-13.5} y={15} t={0.6} />}
      <BacTrempe x={n === 1 ? 19 : gros ? 19 : 18} y={n === 1 ? 4 : gros ? 2 : 3} s={n === 1 ? 0.92 : 1} t={0.9} />

      {/* ── réserves, marchandises, étalage ── */}
      <TasCharbon x={n <= 2 ? -6 : gros ? -36 : -21} y={n <= 2 ? 13.5 : gros ? 9 : 13} s={n === 1 ? 0.85 : n === 2 ? 0.95 : 1.1} />
      {n >= 2 && <Lingots x={n === 2 ? 26 : gros ? 24 : 25} y={n === 2 ? 9 : 11} s={n === 2 ? 0.9 : 1} />}
      {gros && <Lingots x={7} y={15.5} s={0.85} petit />}
      {n === 2 && <Etabli x={-1} y={-3} s={0.95} />}
      {n === 3 && <Etabli x={21} y={2} />}
      {n >= 3 && <RatelierArmes x={gros ? 31 : 33} y={gros ? -2 : 0} s={gros ? 1.05 : 1} seed={3} />}
      {gros && <Cuirasse x={37} y={7} />}

      {/* outils oubliés au sol près de l'enclume */}
      <g transform="translate(9.5,10)">
        <line x1={0} y1={0} x2={3.4} y2={-1} stroke="#6b4c2a" strokeWidth={0.85} />
        <rect x={3.1} y={-2} width={1.6} height={2} rx={0.4} fill="#6b727b" />
        <rect x={3.1} y={-2} width={1.6} height={0.8} rx={0.3} fill="#a7aeb6" />
        <path d="M-2.6,1.2 L-5.8,1.9 M-2.6,2 L-5.6,2.9" stroke="#5a616a" strokeWidth={0.6} />
      </g>
    </g>
  )
}
