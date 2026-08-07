import { memo, type ReactNode } from 'react'
import type { VillageCible } from '../../game/expeditions'
import { idCoeur, posOuvrage } from '../../game/ouvrages'
import type { SaisonId } from '../../game/saisons'
import { AOBase, Batisse3D, Colonne3D, PAL, Porte3D, alea } from './art'
import { Anim, AnimT } from './smil'

/*
 * ═══════════════ LES PLACES FORTES DE LA TROADE ═══════════════
 *
 * Les scènes d'assaut se contentaient de deux rectangles et d'un tas de
 * marchandises : un camp de pillards ressemblait à une citadelle. Chaque cible
 * a désormais son décor peint - tentes de peaux, comptoir à amphores, cité à
 * colonnade, forteresse à donjon - et son cadre : plaine, colline, grève ou île.
 *
 * Mêmes conventions que la carte du village : soleil au nord-ouest, ombres
 * portées vers le sud-est, aucun contour noir, tirages déterministes (alea).
 */

type Decor = VillageCible['decor']
type Terrain = VillageCible['terrain']

// ── Le cadre : ce qu'il y a derrière et autour de l'enceinte ─────────────────

const CIELS: Record<SaisonId, [string, string, string]> = {
  printemps: ['#79b0d2', '#a5cdd9', '#dbe8dc'],
  ete: ['#6fa8cf', '#b6d2d4', '#eee2b8'],
  automne: ['#7c9fb8', '#c2c4b4', '#e7d9b4'],
  hiver: ['#5f7488', '#93a7b2', '#cfd8dc'],
}
const SOLS: Record<SaisonId, [string, string]> = {
  printemps: ['#9db463', '#7d9450'],
  ete: ['#c3b477', '#a49962'],
  automne: ['#b79a5c', '#96803f'],
  hiver: ['#c3cbc6', '#9daaa5'],
}

/** ligne de crête tirée une fois, propre à chaque type de terrain */
function crete(seed: number, sommets: number, hMin: number, hMax: number): string {
  const rnd = alea(seed)
  let d = 'M0,150'
  for (let i = 0; i <= sommets; i++) {
    const x = (900 * i) / sommets
    const y = hMin + rnd() * (hMax - hMin)
    d += ` L${x.toFixed(0)},${y.toFixed(0)}`
  }
  return `${d} L900,150 Z`
}
const CRETE_PLAINE = crete(7, 7, 74, 116)
const CRETE_COLLINE = crete(19, 6, 40, 96)
const CRETE_ILE = crete(31, 8, 96, 128)

/** décor de fond : ciel, reliefs, sol et, s'il y a lieu, la mer */
export function DecorExpedition({ v, saison }: { v: VillageCible; saison: SaisonId }) {
  const [c0, c1, c2] = CIELS[saison]
  const [s0, s1] = SOLS[saison]
  const t: Terrain = v.terrain
  const hiver = saison === 'hiver'
  return (
    <g>
      <defs>
        <linearGradient id="xp-ciel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c0} />
          <stop offset="60%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        <linearGradient id="xp-sol" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={s0} />
          <stop offset="100%" stopColor={s1} />
        </linearGradient>
        <linearGradient id="xp-mer" x1="0.9" y1="0" x2="0.1" y2="1">
          <stop offset="0%" stopColor="#69bcbc" />
          <stop offset="45%" stopColor="#3d8ca3" />
          <stop offset="100%" stopColor="#1a4a63" />
        </linearGradient>
      </defs>

      <rect x={0} y={0} width={900} height={152} fill="url(#xp-ciel)" />
      {/* reliefs lointains, voilés par la distance */}
      <path d={t === 'colline' ? CRETE_COLLINE : t === 'ile' ? CRETE_ILE : CRETE_PLAINE} fill="#8b9c96" opacity={0.75} />
      <path
        d={t === 'colline' ? CRETE_COLLINE : t === 'ile' ? CRETE_ILE : CRETE_PLAINE}
        fill="#c7d2d0"
        opacity={0.4}
        transform="translate(0,7)"
      />
      {hiver && <rect x={0} y={60} width={900} height={92} fill="#e6eff4" opacity={0.3} />}

      <rect x={0} y={148} width={900} height={412} fill="url(#xp-sol)" />

      {/* la mer : bande au sud pour une grève, tout autour pour une île */}
      {t === 'cote' && (
        <g>
          <path d="M0,470 C160,452 330,470 470,500 C600,528 760,520 900,536 L900,560 L0,560 Z" fill="#e0cb99" />
          <path d="M0,492 C160,476 330,494 470,522 C610,548 760,540 900,552 L900,560 L0,560 Z" fill="url(#xp-mer)" />
          <path
            d="M0,492 C160,476 330,494 470,522 C610,548 760,540 900,552"
            stroke="#f2faf6"
            strokeWidth={2}
            fill="none"
            strokeDasharray="18 10 30 12"
            opacity={0.8}
          />
        </g>
      )}
      {t === 'ile' && (
        <g>
          <rect x={0} y={148} width={900} height={412} fill="url(#xp-mer)" />
          {/* haut-fond turquoise qui cerne l'île, puis la grève, puis la terre */}
          <ellipse cx={438} cy={330} rx={386} ry={186} fill="#6fc4bc" opacity={0.5} />
          <ellipse cx={438} cy={330} rx={344} ry={164} fill="#e0cb99" />
          <ellipse cx={436} cy={324} rx={318} ry={148} fill="url(#xp-sol)" />
          <ellipse
            cx={438}
            cy={330}
            rx={344}
            ry={164}
            fill="none"
            stroke="#f6fdf9"
            strokeWidth={2.4}
            strokeDasharray="22 13 36 15"
            opacity={0.75}
          />
          {/* houle au large, sur les quatre coins d'eau libre */}
          <path
            d="M42,236 q22,-7 44,0 M812,252 q22,-7 44,0 M74,486 q22,-7 44,0 M770,502 q22,-7 44,0 M20,392 q22,-7 44,0 M840,404 q22,-7 44,0"
            stroke="#bfe4e2"
            strokeWidth={1.8}
            fill="none"
            opacity={0.55}
          />
          {/* une voile au large : on est bien venu par la mer */}
          <g transform="translate(122,268) scale(1.35)" opacity={0.95}>
            <ellipse cx={0} cy={1} rx={9} ry={1.6} fill="#12313f" opacity={0.35} />
            <path d="M-7,0 Q0,3 8,0 L5,-2 L-5,-2 Z" fill="#5d4a33" />
            <path d="M0,-2 L0,-13 L7.5,-3 Z" fill="#efe9db" />
            <path d="M0,-2 L0,-13 L2.4,-10 L2.4,-2.6 Z" fill="#d8cfba" />
          </g>
        </g>
      )}
      {t === 'colline' && (
        <g opacity={0.5}>
          {/* terrasses de culture accrochées à la pente */}
          {[196, 226, 256].map((y, i) => (
            <path
              key={y}
              d={`M0,${y} C220,${y - 12} 620,${y + 10} 900,${y - 6}`}
              stroke={i % 2 ? '#8b9a56' : '#a2ab6a'}
              strokeWidth={9}
              fill="none"
            />
          ))}
        </g>
      )}

      {/* aire de terre battue autour de l'enceinte, plus dense devant la porte */}
      <ellipse cx={440} cy={330} rx={330} ry={150} fill="#c2b380" opacity={0.28} />
      <path
        d="M900,382 C 800,362 742,338 676,322"
        stroke="#c9b085"
        strokeWidth={17}
        fill="none"
        strokeLinecap="round"
        opacity={0.9}
      />
      <path
        d="M898,376 C 802,357 744,333 678,317"
        stroke="#dcc89c"
        strokeWidth={2.6}
        fill="none"
        opacity={0.5}
        strokeDasharray="16 12 26 10"
      />
    </g>
  )
}

// ── Menus objets réutilisés d'un décor à l'autre ─────────────────────────────

function Feu({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={1.5} cy={1} rx={9} ry={3} fill={PAL.ombrePortee} opacity={0.16} />
      <ellipse cx={0} cy={0.5} rx={7.5} ry={2.6} fill="#6b6152" />
      <path d="M-6,0 L-1,-4 M6,0 L1,-4 M-4,0 L4,-3" stroke="#5f462d" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M0,-3 q4,-4 1.6,-9 q4,4 1.4,9 Z" fill="#e8913c">
        <animate attributeName="opacity" values="1;0.72;1" dur="0.9s" repeatCount="indefinite" />
      </path>
      <path d="M-0.6,-3 q-3.4,-3.4 -1,-7.6 q-3,3.6 -1.2,7.6 Z" fill="#f2b04a" />
      <path d="M0.2,-4 q1.6,-2 0.6,-4.4 q1.8,2 0.5,4.4 Z" fill="#fbe08d" />
      {/* fumée qui monte et se dilue */}
      <g opacity={0.35}>
        <circle cx={1} cy={-14} r={3.4} fill="#cfc7b4">
          <animate attributeName="cy" values="-12;-30" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.45;0" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx={-1.6} cy={-18} r={2.6} fill="#cfc7b4">
          <animate attributeName="cy" values="-16;-36" dur="5s" begin="1.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0" dur="5s" begin="1.2s" repeatCount="indefinite" />
        </circle>
      </g>
    </g>
  )
}

function Tente({ x = 0, y = 0, l = 30, h = 22, teinte = '#a98a5f' }: { x?: number; y?: number; l?: number; h?: number; teinte?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={l * 0.62} ry={l * 0.17} cy={1.5} />
      <ellipse cx={l * 0.3} cy={2} rx={l * 0.7} ry={l * 0.19} fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou2)" />
      {/* peaux cousues tendues sur une perche : pan ouest au soleil, pan est ombré */}
      <path d={`M${-l / 2},0 L0,${-h} L${l * 0.12},0 Z`} fill={teinte} />
      <path d={`M${l * 0.12},0 L0,${-h} L${l / 2},0 Z`} fill="#7a6142" />
      <path d={`M${-l / 2},0 L0,${-h} L${-l * 0.2},0 Z`} fill="#c4a578" />
      {/* coutures et pièces rapportées */}
      <path d={`M${-l * 0.3},${-h * 0.35} L${-l * 0.08},${-h * 0.62}`} stroke="#8a7049" strokeWidth={0.9} />
      <path d={`M${l * 0.24},${-h * 0.32} L${l * 0.06},${-h * 0.6}`} stroke="#63503a" strokeWidth={0.9} />
      {/* perche faîtière et piquets */}
      <path d={`M0,${-h} L0,${-h - 5}`} stroke="#5f462d" strokeWidth={1.6} />
      <path d={`M${-l / 2},0 l-4,3 M${l / 2},0 l4,3`} stroke="#5f462d" strokeWidth={1.2} />
      {/* entrée relevée, pénombre à l'intérieur */}
      <path d={`M${-l * 0.1},0 L0,${-h * 0.55} L${l * 0.1},0 Z`} fill="#2e2216" />
    </g>
  )
}

function Amphores({ x = 0, y = 0, n = 4 }: { x?: number; y?: number; n?: number }) {
  const rnd = alea(x + y)
  return (
    <g transform={`translate(${x},${y})`}>
      {Array.from({ length: n }, (_, i) => {
        const dx = (i - (n - 1) / 2) * 9 + (rnd() - 0.5) * 2
        const s = 0.9 + rnd() * 0.3
        return (
          <g key={i} transform={`translate(${dx.toFixed(1)},0) scale(${s.toFixed(2)})`}>
            <ellipse cx={1.4} cy={0.8} rx={4.4} ry={1.5} fill={PAL.ombrePortee} opacity={0.16} />
            <path d="M0,0 q-4.2,-3 -3.4,-8 q0.6,-4 3.4,-6 q2.8,2 3.4,6 q0.8,5 -3.4,8 Z" fill="#a3673f" />
            <path d="M0,0 q-4.2,-3 -3.4,-8 q0.6,-4 3.4,-6 q-1.4,4 -1.6,8 q-0.2,3.6 1.6,6 Z" fill="#c48450" />
            <path d="M-1.6,-14 h3.2 v1.6 h-3.2 Z" fill="#8c552f" />
            <path d="M-2.6,-12.6 q-2,1.6 -1.4,3.6 M2.6,-12.6 q2,1.6 1.4,3.6" stroke="#8c552f" strokeWidth={0.9} fill="none" />
          </g>
        )
      })}
    </g>
  )
}

function Butin({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={2} cy={3} rx={17} ry={5} fill={PAL.ombrePortee} opacity={0.15} filter="url(#a-flou1)" />
      {/* coffre bardé de bronze, couvercle entrouvert sur l'or */}
      <path d="M-13,2 L-13,-7 L11,-7 L11,2 Z" fill="#8c6b3f" />
      <path d="M-13,-7 L-11,-11 L13,-11 L11,-7 Z" fill="#a8845d" />
      <path d="M11,-7 L13,-11 L13,-2 L11,2 Z" fill="#5f462d" />
      <path d="M-13,-3.4 L11,-3.4" stroke="#c9a441" strokeWidth={1.4} />
      <path d="M-2,-7 L-2,2" stroke="#c9a441" strokeWidth={1.2} />
      {/* jarres et lingots posés à côté */}
      <ellipse cx={-19} cy={-2} rx={3.4} ry={5} fill="#a3673f" />
      <ellipse cx={-20} cy={-3.4} rx={1.8} ry={2.6} fill="#c48450" />
      <path d="M17,2 q3,-2.4 6,0 q-3,1.6 -6,0 Z" fill="#c9922f" />
      <path d="M18,-1 q2.6,-2 5.2,0 q-2.6,1.4 -5.2,0 Z" fill="#e0b256" />
    </g>
  )
}

function Cypres({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={5} cy={0.6} rx={7} ry={2} fill={PAL.ombrePortee} opacity={0.15} />
      <path d="M-1,-1 L1,-1 L0.8,1 L-0.8,1 Z" fill="#6a4e31" />
      <path d="M0,-30 C5,-19 5.6,-9 0,-3 C-5.6,-9 -5,-19 0,-30 Z" fill="#2f4a34" />
      <path d="M0,-29 C-4.6,-19 -4.4,-10 -0.4,-4 C-2.6,-10 -2.4,-19 0,-29 Z" fill="#4b6a43" />
      <path d="M-0.7,-27 C-3.5,-19 -3.4,-12 -1.3,-6.5 C-2.3,-12 -2.1,-19 -0.7,-27 Z" fill="#68855a" />
    </g>
  )
}

function Etendard({ x = 0, y = 0, c }: { x?: number; y?: number; c: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={1} x2={0} y2={-26} stroke="#5d4a33" strokeWidth={1.8} />
      <line x1={-0.6} y1={0} x2={-0.6} y2={-25.4} stroke="#8a6b45" strokeWidth={0.7} opacity={0.8} />
      <circle cx={0} cy={-27} r={1.5} fill={PAL.or} />
      <path d="M1,-25.6 Q8,-28 15,-24 L12.6,-18.6 Q7,-21.6 1,-19 Z" fill={c} />
      <path d="M1,-25.6 Q8,-28 15,-24 L14.2,-22.4 Q7.6,-26 1,-23.6 Z" fill="#fbf3dd" opacity={0.3} />
    </g>
  )
}


// ── Ce qu'il reste d'un ouvrage abattu ───────────────────────────────────────

/*
 * ═════════════ UN OUVRAGE ABATTU DOIT AVOIR L'AIR ABATTU ═════════════
 *
 * Les ruines vivaient dans `SanteOuvrages` : un tas de gravats posé au sol ET
 * trois grands disques gris translucides animés en rayon jusqu'à 2,4×. Or le
 * décor, lui, ne savait RIEN de la chute : la tente restait debout, intacte,
 * avec un halo pâle par-dessus. Rien dans ce dessin ne disait la chute.
 *
 * (Le mot « transparent » du joueur avait une SECONDE cause, plus grave et sans
 * rapport avec ce fichier : les dégradés de la scène d'expédition ne se peignent
 * pas, parce que la carte du village, éteinte en `display:none` sous la scène,
 * porte les mêmes identifiants de `<defs>` et les capte. Voir l'en-tête de
 * `SanteOuvrages.tsx` : le relevé y est, le correctif est dans `styles.css`.)
 *
 * Le décor est donc désormais CONSCIENT de ce qui est tombé et remplace chaque
 * élément abattu par sa ruine. C'est la voie chère - huit archétypes à dessiner
 * deux fois - mais la seule qui fasse coïncider le dessin et l'état. L'autre
 * voie (couvrir l'élément d'un effondrement assez dense pour le masquer)
 * demandait, pour cacher un donjon de 74 unités, une tache de la taille du
 * donjon : et une tache ne raconte pas un assaut.
 *
 * LA RÈGLE DE LECTURE, tirée de trois cycles capture → regard → critique :
 *
 *  1. c'est la HAUTEUR qui dit la chute. Une ruine ne monte jamais au-delà du
 *     tiers de ce qu'elle remplace, et s'étale plus large qu'elle n'est haute ;
 *  2. la matière S'ASSOMBRIT - un toit à terre n'a plus d'arête au soleil ;
 *  3. braises et fumée sont l'assaisonnement, jamais le plat. Une volute
 *     ÉTROITE (rayon 2 à 4, jamais grossie de plus de moitié), pas un disque ;
 *  4. il reste toujours un DÉBRIS RECONNAISSABLE - la perche de la tente, un
 *     tambour de colonne, une tuile - sans quoi les huit ruines se ressemblent.
 *
 * LA CORRESPONDANCE DES POSITIONS ne se recopie plus à la main : `posOuvrage()`
 * est la source unique, et `ouvrages.test.ts` monte les huit décors pour
 * vérifier que chaque ouvrage déclaré a bien, dans le dessin, un debout ET une
 * ruine - c'est le lien qui se cassait en silence.
 */

/** les trois teintes d'une matière à terre : monticule, arête au soleil, creux */
const RUINE_MAT = {
  peaux: ['#7c6444', '#9c8058', '#54432e'],
  torchis: ['#94805a', '#b39c72', '#6b593d'],
  bois: ['#6b5334', '#8b6f49', '#453422'],
  cendre: ['#5f584e', '#7d7469', '#403a34'],
  pierre: ['#9a9080', '#b8ae96', '#6f6656'],
  marbre: ['#b3aa96', '#d2cab4', '#847b69'],
} as const
type Matiere = keyof typeof RUINE_MAT

/** est-ce de la maçonnerie ? elle se brise en BLOCS, le reste en mottes */
const TAILLE = (m: Matiere): boolean => m === 'pierre' || m === 'marbre'

/**
 * La terre roussie. C'est le signal le plus fort et le moins cher : une auréole
 * sombre au sol détache la ruine du pré et dit le feu avant qu'on ait vu la
 * moindre flamme. Posée en PREMIER, sous tout le reste.
 *
 * Deux essais pour la calibrer. Ronde et large (0,8 l), elle se lisait « flaque »
 * ou « cratère » - capture regardée, c'était pire que rien. Il la faut PLUS
 * ÉTROITE que les débris, et bosselée : une brûlure n'a pas de contour au compas.
 */
function Roussi({ l }: { l: number }) {
  return (
    <g pointerEvents="none">
      <path
        d={`M${-l * 0.5},0 q${(l * 0.16).toFixed(1)},${(-l * 0.13).toFixed(1)} ${(l * 0.34).toFixed(1)},${(-l * 0.05).toFixed(1)} q${(l * 0.2).toFixed(1)},${(l * 0.02).toFixed(1)} ${(l * 0.36).toFixed(1)},${(l * 0.07).toFixed(1)} q${(l * 0.1).toFixed(1)},${(l * 0.12).toFixed(1)} ${(-l * 0.16).toFixed(1)},${(l * 0.14).toFixed(1)} q${(-l * 0.34).toFixed(1)},${(l * 0.06).toFixed(1)} ${(-l * 0.9).toFixed(1)},${(-l * 0.16).toFixed(1)} Z`}
        fill="#463b2c"
        opacity={0.17}
      />
      <ellipse cx={-l * 0.03} cy={-0.4} rx={l * 0.31} ry={l * 0.1} fill="#2e2519" opacity={0.22} />
    </g>
  )
}

/**
 * Trois nuances de la même pierre. Sans elles, un tas de maçonnerie donne six
 * cubes rigoureusement identiques - capture regardée du corps de garde mysien :
 * des morceaux de sucre. Une carrière ne rend pas deux blocs de la même couleur.
 */
const NUANCES: Record<'pierre' | 'marbre', (readonly [string, string, string])[]> = {
  pierre: [
    ['#9a9080', '#b8ae96', '#6f6656'],
    ['#8a8171', '#a79d86', '#615949'],
    ['#a79d8c', '#c6bda6', '#7b7161'],
  ],
  marbre: [
    ['#b3aa96', '#d2cab4', '#847b69'],
    ['#a49b87', '#c1b9a3', '#766d5c'],
    ['#c0b7a2', '#ded6c0', '#918878'],
  ],
}

/** un bloc taillé, tombé de son assise : trois faces, sommet au soleil */
function Bloc({ r, mat, tourne, nuance = 0 }: { r: number; mat: Matiere; tourne: number; nuance?: number }) {
  const [mi, lit, creux] =
    mat === 'pierre' || mat === 'marbre' ? NUANCES[mat][nuance % 3] : RUINE_MAT[mat]
  const h = r * 0.7
  return (
    <g transform={`rotate(${tourne.toFixed(0)})`}>
      <path d={`M${-r},0 L0,${(r * 0.42).toFixed(1)} L${r},0 L0,${(-r * 0.42).toFixed(1)} Z`} fill={lit} />
      <path d={`M${-r},0 L0,${(r * 0.42).toFixed(1)} L0,${(r * 0.42 + h).toFixed(1)} L${-r},${h.toFixed(1)} Z`} fill={mi} />
      <path d={`M${r},0 L0,${(r * 0.42).toFixed(1)} L0,${(r * 0.42 + h).toFixed(1)} L${r},${h.toFixed(1)} Z`} fill={creux} />
    </g>
  )
}

/**
 * Le tas : ombre portée au sud-est, monticule bas, versant nord-ouest éclairé,
 * et les débris posés dessus - des BLOCS pour la maçonnerie, des mottes pour le
 * torchis et les peaux. Rien ne dit aussi vite « à terre » qu'une masse plus
 * large que haute ; rien ne dit aussi vite « pierre » qu'une arête.
 */
function Decombres({ l, mat, seed, h }: { l: number; mat: Matiere; seed: number; h?: number }) {
  const [mi, lit, creux] = RUINE_MAT[mat]
  const haut = h ?? l * 0.2
  const rnd = alea(seed)
  const taille = TAILLE(mat)
  const debris = Array.from({ length: taille ? 6 : 7 }, () => ({
    x: (rnd() - 0.5) * l * 0.98,
    y: -rnd() * haut * 0.8,
    r: l * (taille ? 0.08 + rnd() * 0.06 : 0.045 + rnd() * 0.055),
    a: (rnd() - 0.5) * 26,
    n: Math.floor(rnd() * 3),
  }))
  /*
   * Le monticule. Courbe douce pour ce qui s'effondre en tas (peaux, torchis,
   * cendre) ; ARÊTES pour la maçonnerie - une belle courbe pâle sur du marbre
   * faisait une congère, capture regardée, et pas un tas de pierres taillées.
   */
  const bosse = taille
    ? `M${(-l * 0.6).toFixed(1)},1 L${(-l * 0.42).toFixed(1)},${(-haut * 0.62).toFixed(1)} L${(-l * 0.14).toFixed(1)},${(-haut * 0.98).toFixed(1)} L${(l * 0.2).toFixed(1)},${(-haut * 0.78).toFixed(1)} L${(l * 0.44).toFixed(1)},${(-haut * 0.5).toFixed(1)} L${(l * 0.6).toFixed(1)},1 Z`
    : `M${(-l * 0.6).toFixed(1)},1 Q${(-l * 0.36).toFixed(1)},${(-haut * 1.02).toFixed(1)} ${(-l * 0.02).toFixed(1)},${(-haut * 0.9).toFixed(1)} Q${(l * 0.36).toFixed(1)},${(-haut * 1.08).toFixed(1)} ${(l * 0.6).toFixed(1)},1 Z`
  const versant = taille
    ? `M${(-l * 0.6).toFixed(1)},1 L${(-l * 0.42).toFixed(1)},${(-haut * 0.62).toFixed(1)} L${(-l * 0.14).toFixed(1)},${(-haut * 0.98).toFixed(1)} L${(-l * 0.18).toFixed(1)},${(-haut * 0.3).toFixed(1)} L${(-l * 0.3).toFixed(1)},1 Z`
    : `M${(-l * 0.6).toFixed(1)},1 Q${(-l * 0.36).toFixed(1)},${(-haut * 1.02).toFixed(1)} ${(-l * 0.02).toFixed(1)},${(-haut * 0.9).toFixed(1)} Q${(-l * 0.22).toFixed(1)},${(-haut * 0.34).toFixed(1)} ${(-l * 0.3).toFixed(1)},1 Z`
  return (
    <g>
      <ellipse cx={l * 0.17} cy={2.6} rx={l * 0.62} ry={l * 0.18} fill={PAL.ombrePortee} opacity={0.22} />
      <path d={bosse} fill={mi} />
      {/* le versant nord-ouest reçoit le jour, le pied sud-est reste dans le creux */}
      <path d={versant} fill={lit} />
      <path d={`M${l * 0.16},${-haut * 0.34} Q${l * 0.42},${-haut * 0.2} ${l * 0.6},1 L${l * 0.1},1 Z`} fill={creux} />
      {debris.map((e, i) =>
        taille ? (
          <g key={i} transform={`translate(${e.x.toFixed(1)},${e.y.toFixed(1)})`}>
            <Bloc r={e.r} mat={mat} tourne={e.a} nuance={e.n} />
          </g>
        ) : (
          <g key={i}>
            <ellipse cx={e.x + e.r * 0.4} cy={e.y + e.r * 0.5} rx={e.r} ry={e.r * 0.5} fill={creux} opacity={0.6} />
            <ellipse cx={e.x} cy={e.y} rx={e.r} ry={e.r * 0.58} fill={i % 3 ? lit : mi} />
          </g>
        ),
      )}
    </g>
  )
}

/**
 * Braises et fumée.
 *
 * ── DEUX ESSAIS AVANT CELUI-CI, CHACUN SUR UNE CAPTURE REGARDÉE ─────────────
 *
 * L'ancienne ruine posait trois grands disques gris à faible opacité, grossis
 * jusqu'à 2,4× : c'est CELA que le joueur a lu « transparent », et il avait
 * raison. La première correction les a rétrécis à des cercles de rayon 2 à 3,4 -
 * mais un petit disque gris pâle qui flotte à vingt unités du sol, sans rien qui
 * le rattache au feu, ne se lit pas « fumée » : il se lit « tache d'affichage ».
 * Capture de la tente du chef en gros plan, regardée : deux ronds pâles en l'air,
 * détachés de tout. Le même défaut, en plus petit.
 *
 * Ce qui marche, éprouvé sur les trois archétypes :
 *  1. la volute est une FORME EFFILÉE, pas un rond - un rond n'a pas de sens de
 *     montée, et c'est le sens qui fait lire la fumée ;
 *  2. elle reste BASSE (elle ne monte qu'à un demi-l) et elle DISPARAÎT avant le
 *     haut de sa course, aux deux tiers de l'opacité perdus à mi-chemin ;
 *  3. elle part du foyer et non d'un point en l'air.
 */
function Braises({ l, seed }: { l: number; seed: number }) {
  const rnd = alea(seed + 91)
  const volutes = [0, 1].map((i) => ({
    dx: (rnd() - 0.5) * l * 0.2,
    r: 1.5 + rnd() * 0.9,
    dur: 2900 + i * 1200,
    op: 0.3 - i * 0.09,
  }))
  return (
    <g pointerEvents="none">
      {/* le foyer noirci. Rouge franc, il faisait une tache de sang sur la pierre
          pâle (capture du corps de garde regardée) : il lui faut du brun. */}
      <ellipse cx={-l * 0.04} cy={-1.2} rx={l * 0.12} ry={l * 0.045} fill="#43301f" opacity={0.46} />
      <ellipse cx={l * 0.02} cy={-1.8} rx={l * 0.055} ry={l * 0.022} fill="#c2551f" opacity={0.5}>
        <Anim attributeName="opacity" values="0.2;0.75;0.2" dur="1.9s" repeatCount="indefinite" />
      </ellipse>
      {volutes.map((v, i) => (
        <g key={i}>
          <AnimT
            attributeName="transform"
            type="translate"
            values={`${v.dx.toFixed(1)},0;${(v.dx * 1.6).toFixed(1)},${(-l * 0.5).toFixed(1)}`}
            dur={`${v.dur}ms`}
            repeatCount="indefinite"
          />
          {/* une virgule de fumée : large en haut, pincée sur le foyer */}
          <path
            d={`M0,-1 q${(-v.r * 1.1).toFixed(1)},${(-v.r * 2.2).toFixed(1)} ${(-v.r * 0.3).toFixed(1)},${(-v.r * 3.6).toFixed(1)} q${(v.r * 1.5).toFixed(1)},${(-v.r * 1.1).toFixed(1)} ${(v.r * 1.1).toFixed(1)},${(v.r * 1.4).toFixed(1)} q${(-v.r * 0.5).toFixed(1)},${(v.r * 1.5).toFixed(1)} ${(-v.r * 0.8).toFixed(1)},${(v.r * 2.2).toFixed(1)} Z`}
            fill="#5a5148"
            opacity={v.op}
          >
            <Anim
              attributeName="opacity"
              values={`${v.op};${(v.op * 0.34).toFixed(2)};0`}
              keyTimes="0;0.45;1"
              dur={`${v.dur}ms`}
              repeatCount="indefinite"
            />
          </path>
        </g>
      ))}
    </g>
  )
}

/**
 * Un moignon de mur : ce qui tient encore d'un ouvrage de maçonnerie. UNE SEULE
 * masse continue, dont l'arête du haut monte et descend par gradins inégaux, et
 * dont chaque gradin montre l'ÉPAISSEUR du mur en pleine lumière.
 *
 * Trois versions jetées avant celle-ci, chacune sur une capture regardée :
 *  · une découpe en dents de scie se lisait « mur bas », pas « mur rompu » ;
 *  · en soulignant la cassure d'un gros trait clair on obtenait un ruban pâle en
 *    zigzag qui volait la vedette à toute la scène ;
 *  · en dressant des créneaux séparés au-dessus d'une assise, on obtenait six
 *    pierres levées - un cromlech, pas une ruine.
 * Ce qui marche : une masse d'un seul tenant, PLUS LARGE QUE HAUTE, dont on voit
 * le dessus. Les gradins font au moins une fois et demie leur hauteur en largeur.
 */
function Moignon({
  w,
  h,
  mat,
  seed,
  dents = 4,
}: {
  w: number
  h: number
  mat: Matiere
  seed: number
  dents?: number
}) {
  const [mi, lit, creux] = RUINE_MAT[mat]
  const rnd = alea(seed + 17)
  const ep = Math.max(1.6, w * 0.05) // épaisseur du mur, vue de dessus
  // largeur de gradin au moins égale à 1,5 fois la hauteur du moignon
  const n = Math.max(2, Math.min(dents, Math.round(w / (h * 1.5))))
  const pas = w / n
  const gradins = Array.from({ length: n }, (_, i) => ({
    x0: -w / 2 + pas * i,
    x1: -w / 2 + pas * (i + 1),
    y: -h * (0.42 + rnd() * 0.58),
  }))
  // la masse d'un seul tenant : on monte, on longe chaque gradin, on redescend
  let masse = `M${(-w / 2).toFixed(1)},0`
  for (const g of gradins) masse += ` L${g.x0.toFixed(1)},${g.y.toFixed(1)} L${g.x1.toFixed(1)},${g.y.toFixed(1)}`
  masse += ` L${(w / 2).toFixed(1)},0 Z`
  return (
    <g>
      <ellipse cx={w * 0.2} cy={2.4} rx={w * 0.58} ry={Math.max(3, w * 0.14)} fill={PAL.ombrePortee} opacity={0.2} />
      <path d={masse} fill={mi} />
      {/* la face ouest du premier gradin prend le jour de plein fouet */}
      <path
        d={`M${(-w / 2).toFixed(1)},0 L${(-w / 2).toFixed(1)},${gradins[0].y.toFixed(1)} L${(-w / 2 + pas * 0.34).toFixed(1)},${(gradins[0].y * 0.94).toFixed(1)} L${(-w / 2 + pas * 0.34).toFixed(1)},0 Z`}
        fill={lit}
        opacity={0.55}
      />
      {/* le dessus de chaque gradin, et le retour d'angle quand on redescend */}
      {gradins.map((g, i) => (
        <g key={i}>
          <path
            d={`M${g.x0.toFixed(1)},${g.y.toFixed(1)} L${(g.x0 + ep * 0.85).toFixed(1)},${(g.y - ep).toFixed(1)} L${(g.x1 + ep * 0.85).toFixed(1)},${(g.y - ep).toFixed(1)} L${g.x1.toFixed(1)},${g.y.toFixed(1)} Z`}
            fill={lit}
          />
          {i < n - 1 && gradins[i + 1].y > g.y && (
            <path
              d={`M${g.x1.toFixed(1)},${g.y.toFixed(1)} L${(g.x1 + ep * 0.85).toFixed(1)},${(g.y - ep).toFixed(1)} L${(g.x1 + ep * 0.85).toFixed(1)},${(gradins[i + 1].y - ep).toFixed(1)} L${g.x1.toFixed(1)},${gradins[i + 1].y.toFixed(1)} Z`}
              fill={creux}
            />
          )}
          {/* joints d'assise : ils disent la maçonnerie, pas le rocher */}
          {[0.34, 0.66].map((k) => (
            <path
              key={k}
              d={`M${g.x0.toFixed(1)},${(g.y * k).toFixed(1)} L${g.x1.toFixed(1)},${(g.y * k).toFixed(1)}`}
              stroke={PAL.pierreJoint}
              strokeWidth={0.8}
              opacity={0.26}
            />
          ))}
        </g>
      ))}
      {/* le retour est de la masse, dans l'ombre */}
      <path
        d={`M${(w / 2).toFixed(1)},0 L${(w / 2).toFixed(1)},${gradins[n - 1].y.toFixed(1)} L${(w / 2 + ep * 0.85).toFixed(1)},${(gradins[n - 1].y - ep).toFixed(1)} L${(w / 2 + ep * 0.85).toFixed(1)},${(-ep).toFixed(1)} Z`}
        fill={creux}
      />
    </g>
  )
}

/**
 * Poutres carbonisées en travers du tas : le bois ne s'écroule pas en poudre.
 *
 * Elles faisaient d'abord la moitié de la bâtisse et ne pesaient que deux unités
 * d'épaisseur - capture regardée, on obtenait une étoile de traits noirs qui
 * volait la vedette au tas. Courtes et épaisses, elles racontent la charpente
 * sans devenir le sujet.
 */
function Poutres({ l, seed, n = 4 }: { l: number; seed: number; n?: number }) {
  const rnd = alea(seed + 43)
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x0 = (rnd() - 0.5) * l * 0.72
        const y0 = -rnd() * l * 0.1
        const ang = (rnd() - 0.5) * 1.5
        const lg = l * (0.16 + rnd() * 0.2)
        return (
          <g key={i} transform={`translate(${x0.toFixed(1)},${y0.toFixed(1)}) rotate(${((ang * 180) / Math.PI).toFixed(0)})`}>
            <path d={`M0,2 L${lg.toFixed(1)},2`} stroke={PAL.ombrePortee} strokeWidth={3.4} opacity={0.2} strokeLinecap="round" />
            <path d={`M0,0 L${lg.toFixed(1)},0`} stroke={i % 2 ? '#57432c' : '#402f1f'} strokeWidth={3.2} strokeLinecap="round" />
            <path d={`M0,-1 L${(lg * 0.66).toFixed(1)},-1`} stroke="#7d6749" strokeWidth={1} strokeLinecap="round" opacity={0.75} />
          </g>
        )
      })}
    </g>
  )
}

/** la couverture répandue : tuiles cassées, ou chaume éparpillé et roussi */
function Couverture({ l, seed, quoi }: { l: number; seed: number; quoi: 'tuiles' | 'chaume' | 'bois' }) {
  const rnd = alea(seed + 71)
  if (quoi === 'chaume') {
    return (
      <g>
        {Array.from({ length: 9 }, (_, i) => {
          const x = (rnd() - 0.5) * l * 1.1
          const y = -rnd() * l * 0.09
          const a = (rnd() - 0.5) * 60
          return (
            <path
              key={i}
              d={`M${x.toFixed(1)},${y.toFixed(1)} l${(6 + rnd() * 6).toFixed(1)},0`}
              stroke={i % 3 ? PAL.chaumeOmbre : '#8a6b3a'}
              strokeWidth={1.5}
              strokeLinecap="round"
              transform={`rotate(${a.toFixed(0)},${x.toFixed(1)},${y.toFixed(1)})`}
            />
          )
        })}
      </g>
    )
  }
  if (quoi === 'bois') return <Poutres l={l} seed={seed + 5} n={4} />
  return (
    <g>
      {Array.from({ length: 12 }, (_, i) => {
        const x = (rnd() - 0.5) * l * 1.05
        const y = -rnd() * l * 0.11
        const s = 0.8 + rnd() * 0.7
        return (
          <g key={i} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s.toFixed(2)}) rotate(${((rnd() - 0.5) * 50).toFixed(0)})`}>
            <path d="M-3.4,1.4 L3.4,1.4 L2.6,-0.6 L-2.6,-0.6 Z" fill={PAL.ombrePortee} opacity={0.18} />
            <path d="M-3.4,0.8 L3.4,0.8 L2.6,-1.2 L-2.6,-1.2 Z" fill={i % 2 ? '#a1552f' : '#8e4a2e'} />
            <path d="M-3.4,0.8 L-2.6,-1.2 L0,-1.2 L-1,0.8 Z" fill={PAL.toitArete} opacity={0.5} />
          </g>
        )
      })}
    </g>
  )
}

// ── Les ruines des huit archétypes ───────────────────────────────────────────

/** une tente couchée : la perche rompue, les peaux affalées, deux piquets tordus */
function TenteAffalee({ l, h, teinte, seed }: { l: number; h: number; teinte: string; seed: number }) {
  const rnd = alea(seed + 3)
  /*
   * TROIS ESSAIS, TROIS CAPTURES REGARDÉES.
   *
   *  · au cinquième de la longueur, la toile faisait encore un cerf-volant
   *    pointu : une voile posée, pas une tente tombée ;
   *  · au sixième (l × 0,16) avec un pan est presque noir, gros plan regardé sur
   *    la tente du chef : on lisait « une planche brune et deux rondins ». La
   *    toile était trop plate pour se voir, et la perche - trait de 1,8 en
   *    travers de tout - devenait le sujet ;
   *  · ce qui marche : la toile garde la MÉMOIRE de la tente. La perche rompue
   *    est TOMBÉE DESSOUS et en soulève encore une arête, à un quart de la
   *    hauteur d'origine ; les deux haubans du vent restent tendus sur leurs
   *    piquets et tirent la toile en pointes. C'est cette arête et ces pointes
   *    qui disent « tente », et rien d'autre : à terre, une peau est une peau.
   */
  const ht = Math.max(l * 0.2, h * 0.26)
  const sombre = '#6a5638'
  const creux = '#54452f'
  // le faîte soulevé par le tronçon de perche resté dessous, à l'ouest du centre
  const fx = -l * 0.12
  return (
    <g>
      <Roussi l={l * 0.9} />
      <ellipse cx={l * 0.22} cy={2.4} rx={l * 0.64} ry={l * 0.18} fill={PAL.ombrePortee} opacity={0.2} />
      {/* le tronçon de perche EST SOUS LA TOILE : posé d'abord, il explique l'arête */}
      <path
        d={`M${(-l * 0.5).toFixed(1)},1 L${(fx + l * 0.16).toFixed(1)},${(-ht * 0.94).toFixed(1)}`}
        stroke="#5f462d"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* la peau affalée : une arête vive sur la perche, puis deux versants mous
          qui retombent en pointes vers les piquets encore plantés */}
      <path
        d={`M${(-l * 0.58).toFixed(1)},1 Q${(-l * 0.34).toFixed(1)},${(-ht * 0.34).toFixed(1)} ${fx.toFixed(1)},${(-ht * 0.94).toFixed(1)} Q${(l * 0.1).toFixed(1)},${(-ht * 0.52).toFixed(1)} ${(l * 0.24).toFixed(1)},${(-ht * 0.6).toFixed(1)} Q${(l * 0.44).toFixed(1)},${(-ht * 0.66).toFixed(1)} ${(l * 0.6).toFixed(1)},1 Z`}
        fill={teinte}
      />
      {/* versant nord-ouest au jour */}
      <path
        d={`M${(-l * 0.58).toFixed(1)},1 Q${(-l * 0.34).toFixed(1)},${(-ht * 0.34).toFixed(1)} ${fx.toFixed(1)},${(-ht * 0.94).toFixed(1)} L${(fx - l * 0.02).toFixed(1)},${(-ht * 0.36).toFixed(1)} Q${(-l * 0.24).toFixed(1)},${(-ht * 0.14).toFixed(1)} ${(-l * 0.36).toFixed(1)},1 Z`}
        fill="#c4a578"
      />
      {/* versant sud-est dans l'ombre, sans jamais aller au noir */}
      <path
        d={`M${fx.toFixed(1)},${(-ht * 0.94).toFixed(1)} Q${(l * 0.1).toFixed(1)},${(-ht * 0.52).toFixed(1)} ${(l * 0.24).toFixed(1)},${(-ht * 0.6).toFixed(1)} Q${(l * 0.44).toFixed(1)},${(-ht * 0.66).toFixed(1)} ${(l * 0.6).toFixed(1)},1 L${(l * 0.06).toFixed(1)},1 Z`}
        fill={sombre}
      />
      {/* les creux entre les plis : c'est ce qui fait « affalé » et non « plié » */}
      <path
        d={`M${(fx + l * 0.04).toFixed(1)},${(-ht * 0.8).toFixed(1)} Q${(l * 0.06).toFixed(1)},${(-ht * 0.3).toFixed(1)} ${(l * 0.22).toFixed(1)},${(-ht * 0.52).toFixed(1)}`}
        stroke={creux}
        strokeWidth={1.1}
        fill="none"
        opacity={0.7}
      />
      <path
        d={`M${(-l * 0.42).toFixed(1)},${(-ht * 0.12).toFixed(1)} Q${(-l * 0.2).toFixed(1)},${(-ht * 0.3).toFixed(1)} ${(-l * 0.04).toFixed(1)},${(-ht * 0.16).toFixed(1)}`}
        stroke={creux}
        strokeWidth={0.8}
        fill="none"
        opacity={0.45}
      />
      {/* le bout de perche rompu qui dépasse de la toile, éclat de la cassure au jour */}
      <path
        d={`M${(fx + l * 0.14).toFixed(1)},${(-ht * 0.88).toFixed(1)} l${(l * 0.13).toFixed(1)},${(-ht * 0.24).toFixed(1)}`}
        stroke="#6b4c2a"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <path
        d={`M${(fx + l * 0.25).toFixed(1)},${(-ht * 1.06).toFixed(1)} l${(l * 0.035).toFixed(1)},${(-ht * 0.16).toFixed(1)} l${(l * 0.03).toFixed(1)},${(ht * 0.12).toFixed(1)} Z`}
        fill="#c9a97c"
      />
      {/* les deux haubans TENDUS sur leurs piquets : ce sont eux qui disent
          « tente » d'un coup d'œil - une peau seule ne dit rien */}
      <path
        d={`M${(-l * 0.56).toFixed(1)},0 L${(-l * 0.74).toFixed(1)},2.6 M${(-l * 0.74).toFixed(1)},2.6 l-1.4,2.4`}
        stroke="#7a6142"
        strokeWidth={0.9}
        fill="none"
      />
      <path
        d={`M${(l * 0.58).toFixed(1)},0 L${(l * 0.76).toFixed(1)},2.4 M${(l * 0.76).toFixed(1)},2.4 l1.6,2.2`}
        stroke="#7a6142"
        strokeWidth={0.9}
        fill="none"
      />
      {Array.from({ length: 3 }, (_, i) => {
        const x = (rnd() - 0.5) * l * 0.8
        return (
          <ellipse key={i} cx={x} cy={-rnd() * 1.6} rx={1.4 + rnd() * 1.2} ry={0.9} fill={i % 2 ? RUINE_MAT.peaux[0] : creux} />
        )
      })}
      <Braises l={l * 0.62} seed={seed} />
    </g>
  )
}

/** un coffre pillé : renversé, couvercle arraché, jarres brisées, or dispersé */
function ButinPille({ seed }: { seed: number }) {
  const rnd = alea(seed + 11)
  return (
    <g>
      <ellipse cx={3} cy={3} rx={19} ry={5.4} fill={PAL.ombrePortee} opacity={0.16} />
      {/* le coffre sur le flanc, ouvert et vide */}
      <path d="M-14,2 L-11,-6 L7,-8 L10,1 Z" fill="#6f5432" />
      <path d="M-14,2 L-11,-6 L-6,-6.6 L-9,2 Z" fill="#8c6b3f" />
      <path d="M-9,-4.6 L6,-6" stroke="#c9a441" strokeWidth={1.2} opacity={0.8} />
      <path d="M-10.4,-5.6 Q-2,-9.4 7.6,-7.6 L7,-6.2 Q-2,-8 -10,-4.6 Z" fill="#2f2417" opacity={0.7} />
      {/* le couvercle arraché, à plat */}
      <path d="M12,2 L16,-3 L30,-1.6 L26,3 Z" fill="#a8845d" />
      <path d="M12,2 L16,-3 L18,-2.8 L14,2 Z" fill="#5f462d" />
      {/* tessons de jarre et quelques pièces oubliées */}
      <path d="M-22,2 q3,-6 7,-4 q-2,3 -3,4 Z" fill="#a3673f" />
      <path d="M-25,1 q2.6,-1.6 4.4,0 q-2.2,1.4 -4.4,0 Z" fill="#c48450" />
      {Array.from({ length: 4 }, (_, i) => (
        <ellipse
          key={i}
          cx={-6 + rnd() * 26}
          cy={1 + rnd() * 2}
          rx={1.5 + rnd()}
          ry={0.9}
          fill={i % 2 ? PAL.or : '#c9922f'}
        />
      ))}
    </g>
  )
}

/**
 * Une bâtisse écroulée : deux moignons de mur aux extrémités, la couverture
 * répandue entre eux, les poutres noircies, et le tas au milieu.
 */
function BatisseEcroulee({
  w,
  h,
  mat,
  toit,
  seed,
  feu = true,
}: {
  w: number
  h: number
  mat: Matiere
  toit: 'tuiles' | 'chaume' | 'bois'
  seed: number
  feu?: boolean
}) {
  return (
    <g>
      <Roussi l={w} />
      <Decombres l={w * 1.02} mat={mat} seed={seed} h={Math.min(h * 0.3, w * 0.17)} />
      <g transform={`translate(${(-w * 0.36).toFixed(1)},0)`}>
        <Moignon w={w * 0.3} h={h * 0.32} mat={mat} seed={seed + 2} dents={4} />
      </g>
      <g transform={`translate(${(w * 0.38).toFixed(1)},0)`}>
        <Moignon w={w * 0.22} h={h * 0.22} mat={mat} seed={seed + 8} dents={3} />
      </g>
      {/* une seule charpente : quand le toit EST de bois, `Couverture` la pose */}
      {toit !== 'bois' && <Poutres l={w} seed={seed} n={3} />}
      <Couverture l={w} seed={seed} quoi={toit} />
      {feu && <Braises l={w * 0.5} seed={seed} />}
    </g>
  )
}

/** une tour de rondins rompue : le fût cassé bas, les rondins tombés en travers */
function TourRompue({ seed }: { seed: number }) {
  return (
    <g>
      <Roussi l={30} />
      <ellipse cx={5} cy={2.4} rx={17} ry={5} fill={PAL.ombrePortee} opacity={0.18} />
      {/* le fût cassé : deux rondins encore dressés, éclatés en écharde */}
      <path d="M-8,0 L-7,-13 L-4.6,-16 L-3,-11 L-2,0 Z" fill="url(#a-bois-l)" />
      <path d="M2,0 L2.6,-9 L4.6,-12 L6,-7.4 L7,0 Z" fill="url(#a-bois-o)" />
      <path d="M-7,-13 L-4.6,-16 L-3,-11 Z" fill="#c9a97c" opacity={0.6} />
      <path d="M2.6,-9 L4.6,-12 L6,-7.4 Z" fill="#a8845d" opacity={0.7} />
      <Poutres l={40} seed={seed + 6} n={5} />
      <Decombres l={26} mat="bois" seed={seed} h={4.4} />
      <Braises l={16} seed={seed + 2} />
    </g>
  )
}

/** une tour de pierre décapitée : le couronnement à terre, l'arête déchiquetée */
function TourDecapitee({ w, h, seed }: { w: number; h: number; seed: number }) {
  return (
    <g>
      <Roussi l={w * 1.5} />
      <AOBase rx={w * 0.62} ry={w * 0.2} cy={2} />
      {/* le tronçon qui tient encore : un tiers de la hauteur, sommet rompu */}
      <g transform={`translate(0,0)`}>
        <Moignon w={w} h={h * 0.34} mat="pierre" seed={seed} dents={4} />
      </g>
      {/* les moellons du couronnement, tombés au pied vers le sud-est */}
      <g transform={`translate(${(w * 0.72).toFixed(1)},1)`}>
        <Decombres l={w * 0.8} mat="pierre" seed={seed + 4} h={w * 0.2} />
      </g>
      <Braises l={w * 0.5} seed={seed + 9} />
    </g>
  )
}

/**
 * Un temple rompu : le stylobate tient (on reconnaît encore un temple), les
 * colonnes sont couchées en tambours, le fronton est en morceaux au pied.
 *
 * ORDRE. Au premier essai le tas de décombres était peint EN DERNIER : il
 * recouvrait les tambours et le fronton, et la capture ne montrait qu'une purée
 * pâle. Les décombres passent derrière, les débris RECONNAISSABLES devant - sans
 * quoi les huit ruines se ressemblent toutes.
 */
function TempleRompu({ seed }: { seed: number }) {
  return (
    <g>
      <Roussi l={112} />
      <AOBase rx={54} ry={14} cy={3} />
      {/* le stylobate, seul survivant */}
      <path d="M-52,2 L52,2 L48,-4 L-48,-4 Z" fill={PAL.pierreMi} />
      <path d="M-48,-4 L48,-4 L45,-9 L-45,-9 Z" fill={PAL.pierreLit} />
      {/* le tas d'abord, les débris ensuite */}
      <g transform="translate(8,-4)">
        <Decombres l={46} mat="marbre" seed={seed} h={9} />
      </g>
      {/* deux fûts brisés, encore debout sur leur base : eux GARDENT leur marbre
          (ils n'ont pas roulé dans la poussière), et c'est ce contraste avec les
          tambours salis qui fait lire la chute des autres */}
      {[-38, 27].map((x, i) => {
        const ht = 6 + i * 5
        return (
          <g key={x} transform={`translate(${x},-9)`}>
            {/* trois faces, comme une colonne debout : sans le côté sombre, le fût
                cassé n'était qu'un rectangle de papier blanc */}
            <path d={`M-3.4,0 L-3.1,${-ht} L1,${-ht - 0.8} L1.1,0 Z`} fill={PAL.marbreLit} />
            <path d={`M1.1,0 L1,${-ht - 0.8} L3.4,${-ht - 0.4} L3.6,0 Z`} fill={PAL.marbreOmbre} />
            <path d={`M-3.1,${-ht} L1,${-ht - 0.8} L3.4,${-ht - 0.4} L1.6,${-ht + 2.2} L-2.4,${-ht + 2.6} Z`} fill="#f6f1e4" />
            <path d={`M-1.2,${-ht + 1} L1.4,${-ht + 0.6} L1,${-ht + 2} L-1,${-ht + 2.2} Z`} fill="#9a9182" opacity={0.6} />
          </g>
        )
      })}
      {/*
        * Les tambours des colonnes tombées.
        *
        * Premier essai : six, alignés, deux fois plus gros que les colonnes
        * debout - une rangée de beignets. Deuxième : à la largeur d'un fût, mais
        * TOUS de la même taille et peints du marbre NEUF (`PAL.marbreLit` sur
        * `PAL.marbreOmbre`). Capture regardée, gros plan sur le temple de Lesbos :
        * sept rouleaux blancs identiques, propres, posés sur l'herbe - des
        * bobines, pas des tambours de colonne. Deux d'entre eux avaient même roulé
        * hors de l'enceinte du stylobate, seuls au milieu du pré.
        *
        * Ce qui marche : le marbre TOMBÉ prend la teinte sale de `RUINE_MAT`
        * (celui qui tient encore garde son éclat, et le contraste fait le reste),
        * les tambours sont de trois calibres, et aucun ne s'éloigne du tas.
        */}
      {[
        [-30, 5, 12, 1],
        [-17, 9, -8, 0.8],
        [-5, 3, 24, 1.15],
        [8, 11, -18, 0.72],
        [20, 6, 6, 1.05],
        [30, 12, 32, 0.85],
        [38, 3, -26, 0.66],
      ].map(([x, dy, rot, s], i) => (
        <g key={x} transform={`translate(${x},${dy}) rotate(${rot}) scale(${s})`}>
          <ellipse cx={1.2} cy={1.4} rx={4} ry={1.7} fill={PAL.ombrePortee} opacity={0.22} />
          <path
            d="M-3.6,0 L-3.6,-3.4 A3.6,1.5 0 0 1 3.6,-3.4 L3.6,0 A3.6,1.5 0 0 1 -3.6,0 Z"
            fill={RUINE_MAT.marbre[2]}
          />
          {/* la face au jour, salie elle aussi : la poussière retombe sur tout */}
          <path d="M-3.6,0 L-3.6,-3.4 A3.6,1.5 0 0 1 -0.6,-4.8 L-0.6,-1.3 A3.6,1.5 0 0 0 -3.6,0 Z" fill={RUINE_MAT.marbre[1]} />
          <ellipse cx={0} cy={-3.4} rx={3.6} ry={1.5} fill={i % 2 ? RUINE_MAT.marbre[1] : RUINE_MAT.marbre[0]} />
          {/* le trou du goujon, et la trace de terre sur la tranche */}
          <ellipse cx={0} cy={-3.4} rx={1.5} ry={0.62} fill="#6f6656" opacity={0.55} />
          <path d="M-3.2,-0.6 q3.2,1.1 6.4,-0.4" stroke="#6f6656" strokeWidth={0.7} fill="none" opacity={0.4} />
        </g>
      ))}
      {/* le fronton, tombé de biais, avec son acrotère doré - marbre SALI comme
          tout ce qui a touché terre */}
      <g transform="translate(-34,10) rotate(-9)">
        <ellipse cx={-2} cy={2} rx={13} ry={3.6} fill={PAL.ombrePortee} opacity={0.2} />
        <path d="M-15,1 L-4,-8 L10,1 Z" fill={RUINE_MAT.marbre[2]} />
        <path d="M-15,1 L-4,-8 L-2,-6 L-10,1 Z" fill={RUINE_MAT.marbre[1]} />
        <path d="M-4,-8 L10,1 L7,1 L-3.4,-6 Z" fill="#6f6656" />
        {/* la corniche, à la base : c'est elle qui fait lire « fronton » et non « voile » */}
        <path d="M-16,1 L11,1 L10,3.4 L-15.4,3.4 Z" fill={RUINE_MAT.marbre[1]} />
        <path d="M-15.4,3.4 L10,3.4 L9.4,4.6 L-15,4.6 Z" fill={RUINE_MAT.marbre[2]} />
        <circle cx={-4} cy={-5.4} r={2.2} fill={PAL.or} opacity={0.8} />
      </g>
      <Braises l={26} seed={seed + 1} />
    </g>
  )
}

/**
 * Une masse de maçonnerie rompue : donjon, corps de garde - le grand œuvre à
 * terre.
 *
 * LE PAN D'ANGLE. Le moignon seul ne suffisait pas : `Moignon` s'interdit des
 * gradins plus hauts que larges (sans quoi on obtient un cromlech), si bien
 * qu'une masse de 104 unités de large donnait une arête presque plate. Capture
 * regardée sur le corps de garde mysien : un muret de jardin, pas un donjon
 * rompu. Ce qui fait lire la RUPTURE, c'est qu'UN ANGLE tienne encore et domine
 * le reste - on voit alors d'où c'est tombé.
 */
function MasseRompue({ w, h, seed }: { w: number; h: number; seed: number }) {
  const hp = h * 0.46 // hauteur du pan d'angle survivant
  const wp = w * 0.19
  return (
    <g>
      <Roussi l={w * 1.35} />
      <AOBase rx={w * 0.62} ry={w * 0.2} cy={3} />
      <Moignon w={w} h={h * 0.28} mat="pierre" seed={seed} dents={6} />
      {/* le pan d'angle nord-ouest, rompu en biais : la face au jour, le retour
          dans l'ombre, et l'arête cassée en deux marches inégales */}
      <g transform={`translate(${(-w * 0.4).toFixed(1)},0)`}>
        <path
          d={`M${(-wp / 2).toFixed(1)},1 L${(-wp / 2).toFixed(1)},${(-hp).toFixed(1)} L${(wp * 0.1).toFixed(1)},${(-hp * 0.94).toFixed(1)} L${(wp * 0.14).toFixed(1)},${(-hp * 0.62).toFixed(1)} L${(wp / 2).toFixed(1)},${(-hp * 0.56).toFixed(1)} L${(wp / 2).toFixed(1)},1 Z`}
          fill={PAL.pierreMi}
        />
        <path
          d={`M${(-wp / 2).toFixed(1)},1 L${(-wp / 2).toFixed(1)},${(-hp).toFixed(1)} L${(-wp * 0.16).toFixed(1)},${(-hp * 0.97).toFixed(1)} L${(-wp * 0.16).toFixed(1)},1 Z`}
          fill={PAL.pierreLit}
        />
        {/* le dessus de la cassure : c'est l'épaisseur qui dit le mur */}
        <path
          d={`M${(-wp / 2).toFixed(1)},${(-hp).toFixed(1)} L${(-wp / 2 + 2.4).toFixed(1)},${(-hp - 2.2).toFixed(1)} L${(wp * 0.1 + 2.4).toFixed(1)},${(-hp * 0.94 - 2.2).toFixed(1)} L${(wp * 0.1).toFixed(1)},${(-hp * 0.94).toFixed(1)} Z`}
          fill={PAL.pierreLit}
        />
        <path
          d={`M${(wp * 0.14).toFixed(1)},${(-hp * 0.62).toFixed(1)} L${(wp * 0.14 + 2.4).toFixed(1)},${(-hp * 0.62 - 2.2).toFixed(1)} L${(wp / 2 + 2.4).toFixed(1)},${(-hp * 0.56 - 2.2).toFixed(1)} L${(wp / 2).toFixed(1)},${(-hp * 0.56).toFixed(1)} Z`}
          fill={PAL.pierreLit}
        />
        <path
          d={`M${(wp / 2).toFixed(1)},1 L${(wp / 2).toFixed(1)},${(-hp * 0.56).toFixed(1)} L${(wp / 2 + 2.4).toFixed(1)},${(-hp * 0.56 - 2.2).toFixed(1)} L${(wp / 2 + 2.4).toFixed(1)},-1.2 Z`}
          fill={PAL.pierreOmbre}
        />
        {/* assises : elles disent l'appareil, et l'échelle de ce qui est tombé */}
        {[0.24, 0.46, 0.68].map((k) => (
          <path
            key={k}
            d={`M${(-wp / 2).toFixed(1)},${(-hp * k).toFixed(1)} L${(wp / 2).toFixed(1)},${(-hp * k).toFixed(1)}`}
            stroke={PAL.pierreJoint}
            strokeWidth={0.8}
            opacity={0.3}
          />
        ))}
      </g>
      {/* le linteau de la porte, tombé en travers du seuil */}
      <g transform={`translate(${(-w * 0.06).toFixed(1)},1)`}>
        <path d={`M${-w * 0.16},2 L${w * 0.18},0.6 L${w * 0.19},-3.4 L${-w * 0.15},-2 Z`} fill={PAL.pierreMi} />
        <path d={`M${-w * 0.16},2 L${-w * 0.15},-2 L${-w * 0.09},-2.3 L${-w * 0.1},1.7 Z`} fill={PAL.pierreLit} />
      </g>
      <g transform={`translate(${(w * 0.5).toFixed(1)},1)`}>
        <Decombres l={w * 0.7} mat="pierre" seed={seed + 6} h={w * 0.16} />
      </g>
      <g transform={`translate(${(-w * 0.46).toFixed(1)},0)`}>
        <Decombres l={w * 0.42} mat="pierre" seed={seed + 14} h={w * 0.11} />
      </g>
      <Braises l={w * 0.42} seed={seed + 3} />
    </g>
  )
}

/** des amphores brisées : tessons et flaque répandue */
function AmphoresBrisees({ n, seed }: { n: number; seed: number }) {
  const rnd = alea(seed + 31)
  return (
    <g>
      <ellipse cx={2} cy={0.6} rx={n * 4.6} ry={4} fill="#6d5a2e" opacity={0.28} />
      {Array.from({ length: n }, (_, i) => {
        const dx = (i - (n - 1) / 2) * 9 + (rnd() - 0.5) * 3
        const rot = (rnd() - 0.5) * 80
        return (
          <g key={i} transform={`translate(${dx.toFixed(1)},0) rotate(${rot.toFixed(0)})`}>
            <path d="M-3.6,0 q-1.4,-4 0.8,-6.4 q2.6,1.4 3,6.4 Z" fill="#a3673f" />
            <path d="M-3.6,0 q-1.4,-4 0.8,-6.4 q-0.6,3 -0.2,6.4 Z" fill="#c48450" />
            <path d={`M${(2 + rnd() * 3).toFixed(1)},0 q2.4,-2 4.4,-0.4 q-2,1.6 -4.4,0.4 Z`} fill="#8c552f" />
          </g>
        )
      })}
    </g>
  )
}

/** l'enclos rompu : les piquets brisés, la claie à terre, le bétail parti */
function EnclosRompu({ seed }: { seed: number }) {
  const rnd = alea(seed + 37)
  return (
    <g>
      <ellipse cx={2} cy={1.6} rx={22} ry={4.6} fill={PAL.ombrePortee} opacity={0.14} />
      {[-12, 1, 13].map((dx, i) => (
        <path
          key={dx}
          d={`M${dx},0 l${(rnd() * 4 - 2).toFixed(1)},${(-3 - rnd() * 3).toFixed(1)}`}
          stroke={i % 2 ? '#6b4c2a' : '#5f462d'}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      ))}
      <path d="M-16,1 L16,-1.6" stroke="#7c5a30" strokeWidth={2} strokeLinecap="round" />
      <path d="M-10,3 L18,1.4" stroke="#5f462d" strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />
    </g>
  )
}

/** le puits comblé : la margelle rompue, le treuil abattu dedans */
function PuitsComble({ seed }: { seed: number }) {
  return (
    <g>
      <ellipse cx={2} cy={2} rx={13} ry={4.4} fill={PAL.ombrePortee} opacity={0.16} />
      <path d="M-11,0 A11,4 0 0 0 4,-1.4 L2,-3.6 A11,4 0 0 1 -10,-2.6 Z" fill={PAL.pierreMi} />
      <path d="M-10,-2.4 A10,3.6 0 0 1 6,-3 L4,-1 A10,3.6 0 0 0 -9,-0.6 Z" fill={PAL.pierreLit} />
      <Decombres l={20} mat="pierre" seed={seed} h={3.6} />
      <path d="M-7,-1 L5,-7" stroke="#6b4c2a" strokeWidth={2} strokeLinecap="round" />
      <path d="M8,-1.6 l5,1.4" stroke="#5d4a33" strokeWidth={1.4} strokeLinecap="round" />
    </g>
  )
}

/** la balance du changeur rompue : le fléau à terre, les plateaux renversés */
function BalanceRompue() {
  return (
    <g>
      <ellipse cx={2} cy={1.4} rx={14} ry={4} fill={PAL.ombrePortee} opacity={0.14} />
      <path d="M-11,0 L9,-4.6" stroke="#6b4c2a" strokeWidth={2} strokeLinecap="round" />
      <path d="M-6,0 L-4,-7" stroke="#8a6b2e" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M-13,0 q3,-3.6 6,0 Z" fill="#c9a441" />
      <path d="M8,-2.6 q3,-3.6 6,0 Z" fill="#b0902f" />
    </g>
  )
}

/** le râtelier renversé : les boucliers à plat, la barre rompue */
function RatelierRenverse({ seed }: { seed: number }) {
  const rnd = alea(seed + 53)
  return (
    <g>
      <ellipse cx={2} cy={2} rx={34} ry={7} fill={PAL.ombrePortee} opacity={0.14} />
      {[-26, -8, 10, 28].map((dx, i) => (
        <g key={dx} transform={`translate(${dx + (rnd() - 0.5) * 4},${(rnd() * 3).toFixed(1)}) scale(1,0.42)`}>
          <circle r={7.5} fill="#5b451f" />
          <circle r={6.2} fill={i % 2 ? '#68312a' : '#28405a'} />
          <circle r={4} fill={i % 2 ? '#824839' : '#385875'} />
          <circle r={1.8} fill="#b39d51" />
        </g>
      ))}
      <path d="M-34,5 L-2,3" stroke="#5f462d" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M6,4 L32,6" stroke="#4a3721" strokeWidth={2.2} strokeLinecap="round" />
    </g>
  )
}

/** le feu du camp piétiné : cendres froides et pierres dispersées */
function FeuEteint({ seed }: { seed: number }) {
  const rnd = alea(seed + 59)
  return (
    <g>
      <ellipse cx={1.5} cy={1} rx={10} ry={3.4} fill={PAL.ombrePortee} opacity={0.14} />
      <ellipse cx={0} cy={0.4} rx={8} ry={2.8} fill={RUINE_MAT.cendre[2]} />
      <ellipse cx={-1.2} cy={-0.6} rx={5.4} ry={1.8} fill={RUINE_MAT.cendre[1]} />
      {Array.from({ length: 4 }, (_, i) => (
        <ellipse
          key={i}
          cx={(rnd() - 0.5) * 20}
          cy={(rnd() - 0.5) * 4}
          rx={1.8 + rnd() * 1.4}
          ry={1.2}
          fill={RUINE_MAT.cendre[0]}
        />
      ))}
      <path d="M-7,0 L-2,-2.4" stroke="#3f3125" strokeWidth={1.6} strokeLinecap="round" />
    </g>
  )
}

/** l'étendard abattu : le mât rompu, l'étoffe traînée dans la poussière */
function EtendardAbattu({ c, seed }: { c: string; seed: number }) {
  const rnd = alea(seed + 67)
  return (
    <g>
      <ellipse cx={9} cy={1.6} rx={17} ry={4.2} fill={PAL.ombrePortee} opacity={0.15} />
      {/* le mât en deux tronçons, dont un moignon encore planté */}
      <path d="M0,1 L1,-7" stroke="#5d4a33" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M0.6,-6.4 l1.6,-2.6 l1.4,2" fill="none" stroke="#8a6b45" strokeWidth={0.9} />
      <path d="M3,-1 L24,-3.4" stroke="#5d4a33" strokeWidth={1.8} strokeLinecap="round" />
      {/* l'étoffe à plat, salie */}
      <path d="M6,-2.6 Q13,-7 22,-4.4 L21,-0.6 Q13,-3 6,0.4 Z" fill={c} opacity={0.85} />
      <path d="M6,-2.6 Q13,-7 22,-4.4 L21.6,-3.2 Q13,-5.6 6,-1.6 Z" fill="#fbf3dd" opacity={0.22} />
      <circle cx={26} cy={-3.4} r={1.4} fill={PAL.or} opacity={0.7} />
      {Array.from({ length: 3 }, (_, i) => (
        <ellipse key={i} cx={(rnd() - 0.2) * 22} cy={rnd() * 2} rx={1.4 + rnd()} ry={0.9} fill="#7d7362" />
      ))}
    </g>
  )
}

/** les greniers voûtés effondrés : la voûte rompue en arc brisé, le grain répandu */
function GreniersEffondres({ seed }: { seed: number }) {
  return (
    <g>
      <Roussi l={44} />
      <AOBase rx={24} ry={7} cy={2} />
      {/* les deux naissances de la voûte, l'arc manquant entre elles */}
      <path d="M-22,0 L-22,-11 A22,11 0 0 1 -12,-9.4 L-12,0 Z" fill="url(#a-pierre-l)" />
      <path d="M14,0 L14,-8.6 A22,11 0 0 1 22,-9.8 L22,0 Z" fill="url(#a-pierre-o)" />
      <Decombres l={38} mat="pierre" seed={seed} h={7} />
      {/* le grain répandu au pied */}
      <ellipse cx={2} cy={1.6} rx={16} ry={4} fill="#c9a94f" opacity={0.5} />
      <ellipse cx={-3} cy={0.4} rx={9} ry={2.4} fill="#e0c469" opacity={0.5} />
      <Braises l={18} seed={seed + 4} />
    </g>
  )
}

// ── Les huit cœurs de village ────────────────────────────────────────────────

/**
 * Ce que l'on voit DANS l'enceinte, ancré sur la place du village visé.
 * L'échelle est commune : l'enceinte fait 470 × 260, les cœurs sont dessinés
 * sur ±150 et remis à l'échelle ici pour occuper vraiment la place - un temple
 * perdu au milieu d'un pré ne ressemble pas à une cité.
 *
 * `abattus` est une CHAÎNE, pas un `Set` : la scène se re-rend quatre fois par
 * seconde et le décor n'a aucune raison de suivre. Avec une chaîne stable
 * (`|tente-e|butin|`), `memo` fait son travail et le décor n'est recalculé qu'au
 * moment où un ouvrage tombe vraiment. Les barres délimitent, sans quoi
 * « tente-e » se trouverait dans « tente-ne ».
 */
export const CoeurVillage = memo(function CoeurVillage({
  decor,
  abattus = '',
}: {
  decor: Decor
  abattus?: string
}) {
  return (
    <g transform="scale(1.28)">
      {/* aire de vie : le sol de l'enceinte est piétiné, plus clair que la plaine */}
      <ellipse cx={0} cy={10} rx={172} ry={82} fill="#c9b98a" opacity={0.32} />
      <ellipse cx={-14} cy={2} rx={124} ry={56} fill="#d6c795" opacity={0.28} />
      <Interieur decor={decor} abattus={abattus} />
    </g>
  )
})

/** la chaîne que `CoeurVillage` attend, construite depuis les ids tombés */
export function signatureAbattus(ids: string[]): string {
  return ids.length === 0 ? '' : `|${ids.join('|')}|`
}

/**
 * Un élément du décor qui sait tomber. Il porte sa position - lue dans
 * `ouvrages.ts`, jamais recopiée - et se marque `data-ouvrage` debout,
 * `data-ruine` à terre : c'est ce que le test de correspondance interroge.
 */
function Ouvrage({
  decor,
  id,
  abattus,
  debout,
  ruine,
}: {
  decor: Decor
  id: string
  abattus: string
  debout: ReactNode
  ruine: ReactNode
}) {
  const { x, y } = posOuvrage(decor, id)
  const tombe = abattus.includes(`|${id}|`)
  return (
    <g
      transform={`translate(${x},${y})`}
      {...(tombe ? { 'data-ruine': id } : { 'data-ouvrage': id })}
    >
      {tombe ? ruine : debout}
    </g>
  )
}

function Interieur({ decor, abattus }: { decor: Decor; abattus: string }) {
  /** un ouvrage de CE décor : `o('tente-o', <debout/>, <ruine/>)` */
  const o = (id: string, debout: ReactNode, ruine: ReactNode) => (
    <Ouvrage key={id} decor={decor} id={id} abattus={abattus} debout={debout} ruine={ruine} />
  )
  /**
   * QUAND LE CŒUR TOMBE, ON ABAT LES COULEURS. Les étendards purement décoratifs
   * - ceux qui ne sont pas des ouvrages - continuaient de claquer, neufs, au
   * milieu d'une place rasée : capture de la forteresse mysienne regardée, un
   * fanion d'or intact au-dessus de six tas de pierres. Ils suivent désormais la
   * chute du cœur.
   */
  const coeurTombe = abattus.includes(`|${idCoeur(decor)}|`)
  /** graine déterministe propre à un ouvrage : deux ruines voisines diffèrent */
  const g = (id: string) => {
    const p = posOuvrage(decor, id)
    return p.x * 7 + p.y * 13 + id.length * 29
  }

  switch (decor) {
    case 'camp':
      return (
        <g>
          <ellipse cx={0} cy={12} rx={150} ry={48} fill="#b8a476" opacity={0.4} />
          {o('tente-o', <Tente l={34} h={25} />, <TenteAffalee l={34} h={25} teinte="#a98a5f" seed={g('tente-o')} />)}
          {o(
            'tente-chef',
            <Tente l={40} h={29} teinte="#b0895b" />,
            <TenteAffalee l={40} h={29} teinte="#b0895b" seed={g('tente-chef')} />,
          )}
          {o(
            'tente-e',
            <Tente l={30} h={22} teinte="#9c7f56" />,
            <TenteAffalee l={30} h={22} teinte="#9c7f56" seed={g('tente-e')} />,
          )}
          {o('tente-ne', <Tente l={36} h={26} />, <TenteAffalee l={36} h={26} teinte="#a98a5f" seed={g('tente-ne')} />)}
          <Feu x={-4} y={-16} s={1.15} />
          {/* râtelier de lances et boucliers pris à d'autres */}
          <g transform="translate(74,-14)">
            <path d="M-14,0 L14,0" stroke="#5f462d" strokeWidth={2.2} />
            <path d="M-12,0 L-13,-22 M-5,0 L-5.6,-24 M3,0 L3.4,-21 M11,0 L12,-23" stroke="#6b4c2a" strokeWidth={1.6} />
            <path d="M-13,-22 l-1.4,-4 l2.6,0 Z M-5.6,-24 l-1.4,-4 l2.6,0 Z M3.4,-21 l-1.4,-4 l2.6,0 Z" fill="#c8ced4" />
          </g>
          {o('butin', <Butin />, <ButinPille seed={g('butin')} />)}
          <ellipse cx={-118} cy={40} rx={9} ry={5} fill="#8a7049" />
        </g>
      )

    case 'hameau':
      return (
        <g>
          <ellipse cx={0} cy={14} rx={150} ry={46} fill="#b3a878" opacity={0.35} />
          {o(
            'hutte-o',
            <Batisse3D w={40} h={20} g={11} prof={10} mat="bois" toit="chaume" />,
            <BatisseEcroulee w={40} h={20} mat="torchis" toit="chaume" seed={g('hutte-o')} />,
          )}
          {o(
            'grande-hutte',
            <Batisse3D w={52} h={24} g={13} prof={12} mat="bois" toit="chaume" enfants={<Porte3D w={9} h={13} />} />,
            <BatisseEcroulee w={52} h={24} mat="torchis" toit="chaume" seed={g('grande-hutte')} />,
          )}
          {o(
            'hutte-e',
            <Batisse3D w={36} h={18} g={10} prof={9} mat="bois" toit="chaume" />,
            <BatisseEcroulee w={36} h={18} mat="torchis" toit="chaume" seed={g('hutte-e')} />,
          )}
          {/* muret de pierre sèche */}
          <path d="M-140,34 q40,-8 84,0 q46,8 96,-2" stroke="#a49a83" strokeWidth={6} fill="none" strokeLinecap="round" />
          <path d="M-140,32 q40,-8 84,0 q46,8 96,-2" stroke="#c8bfa8" strokeWidth={2} fill="none" />
          {o(
            'enclos',
            <g>
              {/* les trois chèvres se répartissent AUTOUR du point de l'ouvrage,
                  qui est le centre de l'enclos - et non son premier piquet */}
              {[-12, 1, 13].map((dx) => (
                <g key={dx} transform={`translate(${dx},0)`}>
                  <ellipse cx={1.4} cy={0.6} rx={4.4} ry={1.3} fill={PAL.ombrePortee} opacity={0.14} />
                  <ellipse cx={0} cy={-3} rx={4.2} ry={2.6} fill="#cfc4ab" />
                  <circle cx={4} cy={-4.4} r={1.7} fill="#8c8270" />
                  <path d="M5.4,-5.6 l1.4,-1" stroke="#6f6656" strokeWidth={0.8} />
                </g>
              ))}
            </g>,
            <EnclosRompu seed={g('enclos')} />,
          )}
          <Feu x={-46} y={-6} s={0.85} />
          {o('butin', <Butin />, <ButinPille seed={g('butin')} />)}
        </g>
      )

    case 'comptoir':
      return (
        <g>
          <ellipse cx={0} cy={14} rx={155} ry={48} fill="#c0b078" opacity={0.35} />
          {o(
            'entrepot',
            <g>
              <AOBase rx={52} ry={13} cy={2} />
              <path d="M-52,0 L-52,-34 L52,-34 L52,0 Z" fill="url(#a-stuc-l)" />
              <path d="M52,0 L60,-5 L60,-38 L52,-34 Z" fill="url(#a-stuc-o)" />
              <path d="M-54,-34 L-54,-39 L62,-39 L62,-34 Z" fill={PAL.pierreLit} />
              <path d="M-54,-39 L-46,-43 L70,-43 L62,-39 Z" fill={PAL.marbreLit} />
              <path d="M-52,-31 L52,-31" stroke={PAL.pierreJoint} strokeWidth={0.9} opacity={0.4} strokeDasharray="7 5" />
              <Porte3D w={13} h={19} x={-14} />
              {/* volet de bois de la baie de chargement, encadré comme il se doit */}
              <rect x={14} y={-26} width={22} height={16} fill="#6b512f" />
              <rect x={15.2} y={-24.8} width={19.6} height={13.6} fill="#4a3a22" />
              <path d="M25,-24.8 L25,-11.2" stroke="#6b512f" strokeWidth={1.2} />
              <rect x={14} y={-26} width={22} height={2.4} fill="#8c6b3f" />
            </g>,
            <BatisseEcroulee w={104} h={40} mat="pierre" toit="bois" seed={g('entrepot')} />,
          )}
          {o('amphores-h', <Amphores n={5} />, <AmphoresBrisees n={5} seed={g('amphores-h')} />)}
          {o('amphores-v', <Amphores n={4} />, <AmphoresBrisees n={4} seed={g('amphores-v')} />)}
          {o(
            'balance',
            <g>
              <line x1={0} y1={0} x2={0} y2={-20} stroke="#6b4c2a" strokeWidth={2} />
              <line x1={-11} y1={-20} x2={11} y2={-20} stroke="#8a6b2e" strokeWidth={1.6} />
              <path d="M-14,-16 q3,4 6,0 Z M8,-16 q3,4 6,0 Z" fill="#c9a441" />
            </g>,
            <BalanceRompue />,
          )}
          {o('butin', <Butin />, <ButinPille seed={g('butin')} />)}
        </g>
      )

    case 'village':
      return (
        <g>
          <ellipse cx={0} cy={14} rx={155} ry={48} fill="#b6a870" opacity={0.35} />
          {o(
            'maison-o',
            <Batisse3D w={44} h={24} g={12} prof={11} mat="stuc" toit="tuiles" />,
            <BatisseEcroulee w={44} h={24} mat="pierre" toit="tuiles" seed={g('maison-o')} />,
          )}
          {o(
            'grande-maison',
            <Batisse3D w={58} h={30} g={15} prof={13} mat="pierre" toit="tuiles" enfants={<Porte3D w={10} h={15} />} />,
            <BatisseEcroulee w={58} h={30} mat="pierre" toit="tuiles" seed={g('grande-maison')} />,
          )}
          {o(
            'maison-e',
            <Batisse3D w={40} h={22} g={12} prof={10} mat="stuc" toit="tuiles" />,
            <BatisseEcroulee w={40} h={22} mat="pierre" toit="tuiles" seed={g('maison-e')} />,
          )}
          {o(
            'maison-ne',
            <Batisse3D w={34} h={18} g={10} prof={9} mat="stuc" toit="chaume" />,
            <BatisseEcroulee w={34} h={18} mat="pierre" toit="chaume" seed={g('maison-ne')} />,
          )}
          {o(
            'puits',
            <g>
              <ellipse cx={2} cy={2} rx={13} ry={4.4} fill={PAL.ombrePortee} opacity={0.16} />
              <ellipse cx={0} cy={0} rx={11} ry={4} fill={PAL.pierreMi} />
              <ellipse cx={0} cy={-2} rx={11} ry={4} fill={PAL.pierreLit} />
              <ellipse cx={0} cy={-2} rx={7} ry={2.4} fill="#2a2117" />
              <path d="M-9,-3 L-9,-16 M9,-3 L9,-16 M-10,-16 L10,-16" stroke="#6b4c2a" strokeWidth={2} />
              <path d="M0,-16 L0,-9" stroke="#5d4a33" strokeWidth={0.9} />
              <rect x={-2.4} y={-9} width={4.8} height={3.4} fill="#7c5a30" />
            </g>,
            <PuitsComble seed={g('puits')} />,
          )}
          <Cypres x={-136} y={30} s={0.95} />
          {o('butin', <Butin />, <ButinPille seed={g('butin')} />)}
        </g>
      )

    case 'fort':
      return (
        <g>
          <ellipse cx={0} cy={14} rx={155} ry={48} fill="#a89c74" opacity={0.4} />
          {o(
            'baraque-o',
            <Batisse3D w={82} h={22} g={10} prof={14} mat="bois" toit="bois" />,
            <BatisseEcroulee w={82} h={22} mat="bois" toit="bois" seed={g('baraque-o')} />,
          )}
          {o(
            'baraque-e',
            <Batisse3D w={66} h={20} g={9} prof={12} mat="bois" toit="bois" />,
            <BatisseEcroulee w={66} h={20} mat="bois" toit="bois" seed={g('baraque-e')} />,
          )}
          {o(
            'tour-guet',
            <g>
              <AOBase rx={13} ry={4} cy={2} />
              <path d="M-9,0 L-7,-34 L7,-34 L9,0 Z" fill="url(#a-bois-l)" />
              <path d="M7,-34 L9,0 L13,-3 L11,-36 Z" fill="url(#a-bois-o)" />
              <path d="M-11,-34 L13,-34 L13,-38 L-11,-38 Z" fill="#7c5a30" />
              <path d="M-11,-38 L1,-46 L13,-38 Z" fill="#8a6535" />
              <path d="M-11,-38 L1,-46 L1,-41 Z" fill="#a8845d" />
              {/* la meurtrière : encadrée de rondins, pas un carré noir posé là */}
              <path d="M-7.6,-24.6 h6.2 v6.2 h-6.2 Z" fill="#7c5a30" />
              <path d="M-7,-24 h5 v5 h-5 Z" fill="#4a3a22" />
              <path d="M-7,-24 h5 v1.4 h-5 Z" fill="#2f2417" />
            </g>,
            <TourRompue seed={g('tour-guet')} />,
          )}
          {o(
            'ratelier',
            <g>
              {[-26, -8, 10, 28].map((dx, i) => (
                <g key={dx} transform={`translate(${dx},0)`}>
                  <circle r={7.5} fill="#6e5526" />
                  <circle r={6.2} fill={i % 2 ? '#7d3b32' : '#31506e'} />
                  <circle r={4} fill={i % 2 ? '#9d5847' : '#456b8f'} />
                  <circle r={1.8} fill="#dcc36a" />
                </g>
              ))}
              <path d="M-34,8 L34,8" stroke="#5f462d" strokeWidth={2.4} />
            </g>,
            <RatelierRenverse seed={g('ratelier')} />,
          )}
          {o('feu', <Feu s={0.9} />, <FeuEteint seed={g('feu')} />)}
          {coeurTombe ? (
            <g>
              <g transform="translate(-40,-10)">
                <EtendardAbattu c="#31506e" seed={173} />
              </g>
              <g transform="translate(22,-4)">
                <EtendardAbattu c="#7d3b32" seed={229} />
              </g>
            </g>
          ) : (
            <g>
              <Etendard x={-40} y={-10} c="#31506e" />
              <Etendard x={22} y={-4} c="#7d3b32" />
            </g>
          )}
        </g>
      )

    case 'cite':
      return (
        <g>
          <ellipse cx={0} cy={14} rx={160} ry={48} fill="#c6bb88" opacity={0.35} />
          {o(
            'temple',
            <g>
              <AOBase rx={54} ry={14} cy={3} />
              <path d="M-52,2 L52,2 L48,-4 L-48,-4 Z" fill={PAL.pierreMi} />
              <path d="M-48,-4 L48,-4 L45,-9 L-45,-9 Z" fill={PAL.pierreLit} />
              {[-38, -25, -12, 1, 14, 27, 40].map((x) => (
                <Colonne3D key={x} x={x} h={34} larg={6} />
              ))}
              <g transform="translate(0,-43)">
                <path d="M-50,0 L50,0 L50,-6 L-50,-6 Z" fill={PAL.marbreLit} />
                <path d="M-50,-6 L0,-22 L50,-6 Z" fill={PAL.marbreOmbre} />
                <path d="M-50,-6 L0,-22 L0,-17 L-44,-6 Z" fill={PAL.marbreLit} />
                <circle cx={0} cy={-11} r={3.4} fill={PAL.or} />
              </g>
            </g>,
            <TempleRompu seed={g('temple')} />,
          )}
          {o(
            'maison-o',
            <Batisse3D w={46} h={26} g={13} prof={11} mat="stuc" toit="tuiles" />,
            <BatisseEcroulee w={46} h={26} mat="pierre" toit="tuiles" seed={g('maison-o')} />,
          )}
          {o(
            'maison-e',
            <Batisse3D w={50} h={26} g={13} prof={12} mat="stuc" toit="tuiles" />,
            <BatisseEcroulee w={50} h={26} mat="pierre" toit="tuiles" seed={g('maison-e')} />,
          )}
          <Cypres x={-58} y={38} s={1.05} />
          <Cypres x={58} y={40} s={0.95} />
          {o('butin', <Butin />, <ButinPille seed={g('butin')} />)}
        </g>
      )

    case 'citadelle':
      return (
        <g>
          {/* éperon rocheux : la citadelle est bâtie dessus, pas à côté */}
          <path d="M-150,44 Q-96,4 -30,10 Q40,-2 104,16 Q150,28 150,50 Z" fill="#8d8672" />
          <path d="M-150,44 Q-96,4 -30,10 Q10,4 44,10 Q-30,22 -150,50 Z" fill="#aaa38d" />
          <path d="M-60,18 l10,8 M18,10 l10,8 M84,22 l9,7" stroke="#6f6858" strokeWidth={1.6} opacity={0.6} />
          {o(
            'donjon',
            <g>
              <AOBase rx={36} ry={10} cy={2} />
              <path d="M-30,0 L-30,-54 L30,-54 L30,0 Z" fill="url(#a-pierre-l)" />
              <path d="M30,0 L38,-6 L38,-58 L30,-54 Z" fill="url(#a-pierre-o)" />
              <path d="M-30,-40 L30,-40 M-30,-24 L30,-24" stroke={PAL.pierreJoint} strokeWidth={0.9} opacity={0.4} strokeDasharray="8 5" />
              <rect x={-4} y={-38} width={8} height={13} rx={2} fill="#32281a" />
              <rect x={-18} y={-38} width={5} height={11} rx={2} fill="#32281a" />
              <rect x={13} y={-38} width={5} height={11} rx={2} fill="#32281a" />
              <Porte3D w={13} h={20} />
              {/* couronnement crénelé */}
              <path d="M-33,-54 L41,-54 L41,-60 L-33,-60 Z" fill={PAL.pierreLit} />
              {[-33, -22, -11, 0, 11, 22, 33].map((x) => (
                <rect key={x} x={x} y={-67} width={7} height={7} fill={x < 5 ? '#ddd5c1' : '#b5ab92'} />
              ))}
            </g>,
            <MasseRompue w={68} h={60} seed={g('donjon')} />,
          )}
          {o(
            'greniers',
            <g>
              <AOBase rx={24} ry={7} cy={2} />
              <path d="M-22,0 L-22,-14 A22,11 0 0 1 22,-14 L22,0 Z" fill="url(#a-pierre-l)" />
              <path d="M-22,-14 A22,11 0 0 1 22,-14" stroke={PAL.marbreLit} strokeWidth={2} fill="none" />
              <rect x={-5} y={-13} width={10} height={13} fill="#32281a" />
            </g>,
            <GreniersEffondres seed={g('greniers')} />,
          )}
          {o('etendard', <Etendard c="#c9a441" />, <EtendardAbattu c="#c9a441" seed={g('etendard')} />)}
          {o('butin', <Butin />, <ButinPille seed={g('butin')} />)}
        </g>
      )

    case 'forteresse':
      return (
        <g>
          <ellipse cx={0} cy={16} rx={165} ry={50} fill="#a99e7c" opacity={0.4} />
          {o(
            'corps-garde',
            <g>
              <AOBase rx={56} ry={14} cy={3} />
              <path d="M-50,0 L-50,-64 L50,-64 L50,0 Z" fill="url(#a-pierre-l)" />
              <path d="M50,0 L60,-8 L60,-70 L50,-64 Z" fill="url(#a-pierre-o)" />
              {/* assises cyclopéennes marquées */}
              {[-52, -38, -24, -10].map((y) => (
                <path key={y} d={`M-50,${y} L50,${y}`} stroke={PAL.pierreJoint} strokeWidth={1.1} opacity={0.35} strokeDasharray="14 7" />
              ))}
              <Porte3D w={18} h={28} />
              {/* frise à triglyphes et couronnement */}
              <path d="M-54,-64 L54,-64 L54,-71 L-54,-71 Z" fill={PAL.marbreLit} />
              {[-46, -30, -14, 2, 18, 34].map((x) => (
                <rect key={x} x={x} y={-70} width={5} height={5} fill="#9a9078" />
              ))}
              <path d="M-56,-71 L58,-71 L58,-77 L-56,-77 Z" fill={PAL.pierreLit} />
              {[-56, -43, -30, -17, -4, 9, 22, 35, 48].map((x) => (
                <g key={x}>
                  <rect x={x} y={-86} width={8} height={9} fill={x < 0 ? '#ddd5c1' : '#b5ab92'} />
                  <rect x={x} y={-86} width={8} height={1.6} fill="#f2ecd9" />
                </g>
              ))}
            </g>,
            <MasseRompue w={104} h={78} seed={g('corps-garde')} />,
          )}
          {/* tours d'angle trapues */}
          {(['tour-o', 'tour-e'] as const).map((id, i) =>
            o(
              id,
              <g>
                <AOBase rx={20} ry={6} cy={2} />
                <path d="M-16,0 L-14,-46 L14,-46 L16,0 Z" fill={i ? 'url(#a-pierre-o)' : 'url(#a-pierre-l)'} />
                <path d="M-18,-46 L18,-46 L18,-52 L-18,-52 Z" fill={PAL.pierreLit} />
                {[-18, -9, 0, 9].map((mx) => (
                  <rect key={mx} x={mx} y={-58} width={7} height={6} fill="#c9bfa7" />
                ))}
                <rect x={-3} y={-34} width={6} height={11} rx={2} fill="#32281a" />
              </g>,
              <TourDecapitee w={34} h={52} seed={g(id)} />,
            ),
          )}
          {o('etendard', <Etendard c="#b3543f" />, <EtendardAbattu c="#b3543f" seed={g('etendard')} />)}
          {coeurTombe ? (
            <g transform="translate(62,4)">
              <EtendardAbattu c="#c9a441" seed={311} />
            </g>
          ) : (
            <Etendard x={62} y={4} c="#c9a441" />
          )}
          {o('butin', <Butin />, <ButinPille seed={g('butin')} />)}
        </g>
      )
  }
}
