import { HEROS } from '../../game/heros'
import type { HeroId } from '../../game/types'

/*
 * Silhouettes des huit héros - une par légende.
 *
 * Ils portaient tous la même cuirasse et la même crête : on ne les
 * distinguait qu'à la couleur et au nom écrit au-dessus de leur tête. Chacun
 * reçoit ici l'attribut par lequel la tradition le reconnaît, choisi pour
 * tenir la lecture à 14 px de haut - c'est la SILHOUETTE qui doit parler, pas
 * le détail :
 *
 *   Hector    haut cimier de crin, grande lance, bouclier au cheval
 *   Ulysse    pilos de marin (pas de casque), grand arc dans le dos, chouette
 *   Achille   le plus grand, triple cimier, lance de Pélée, talon liseré rouge
 *   Ajax      bouclier-tour de sept peaux de bœuf, aucune crête
 *   Agamemnon diadème d'or, sceptre, manteau de pourpre traînant au sol
 *   Cassandre robe longue, cheveux dénoués, bandelettes de laine, laurier
 *   Énée      son père Anchise sur les épaules, les pénates en besace
 *   Diomède   casque à joues rabattues, DEUX lances, trapu et agressif
 *
 * Repères communs (avant mise à l'échelle, figure tournée vers +x, comme les
 * figurines de bataille) : sol y=0, hanches -4.6, épaules -12.6, tête -15.4
 * (r 2.9), sommet de calotte -18.9. Lumière au NORD-OUEST : flanc gauche
 * éclairé, flanc droit dans l'ombre, aucun contour noir.
 */

const PEAU = '#d9a97c'
const PEAU_OMBRE = '#bd8a5c'
const BRONZE = '#8a7845'
const BRONZE_LIT = '#f2e6b0'
const BRONZE_MI = '#a08c50'
const BRONZE_OMBRE = '#5c5231'
const OR = '#dcc36a'
const OR_LIT = '#f6ebb4'
const OR_OMBRE = '#8a6b2e'
const BOIS = '#6b4c2a'
const BOIS_LIT = '#a8845d'
const CUIR = '#5d4230'
const FER = '#e4eaef'
const FER_OMBRE = '#87909a'
const LIN = '#efe7d6'
const FEUILLE = '#6f8f52'
const FEUILLE_LIT = '#93b06a'

/** mélange déterministe de deux hex - pour nuancer autour de la couleur de maison */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const c = (sa: number, sb: number) => Math.round(sa + (sb - sa) * t)
  const r = c((pa >> 16) & 255, (pb >> 16) & 255)
  const g = c((pa >> 8) & 255, (pb >> 8) & 255)
  const bl = c(pa & 255, pb & 255)
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`
}
const drapLit = (c: string) => mix(c, '#ffe9c2', 0.34)
const drapOmbre = (c: string) => mix(c, '#221408', 0.34)

type AnimHeros = 'idle' | 'marche' | 'combat' | 'tir'

/**
 * Échelle propre à chaque héros : Achille domine tout le monde, Ajax est une
 * tour, Diomède est ramassé, Cassandre a la stature d'une prêtresse et non
 * d'un hoplite.
 */
const ECH: Record<HeroId, number> = {
  hector: 1.3,
  ulysse: 1.24,
  achille: 1.44,
  ajax: 1.36,
  agamemnon: 1.29,
  cassandre: 1.2,
  enee: 1.24,
  diomede: 1.18,
}

/** y du point le plus haut de chaque silhouette (crête, sceptre, tête d'Anchise) */
const CIME: Record<HeroId, number> = {
  hector: -25,
  ulysse: -23.4,
  achille: -27,
  ajax: -21.2,
  agamemnon: -23.2,
  cassandre: -20.4,
  enee: -27.6,
  diomede: -22.2,
}

/** hauteur utile de la figure, pour poser son nom juste au-dessus */
export function sommetHeros(h: HeroId, ech = 1): number {
  return CIME[h] * ECH[h] * ech
}

// ─────────────────────────── pièces communes ───────────────────────────

/** ombre au sol : trois ellipses terre superposées, bord fondu sans filtre */
function OmbreSol({ rx = 6, ry = 2.1 }: { rx?: number; ry?: number }) {
  return (
    <>
      <ellipse cx={rx * 0.16} cy={1.2} rx={rx * 1.22} ry={ry * 1.18} fill="#241a08" opacity={0.06} />
      <ellipse cx={rx * 0.1} cy={1.1} rx={rx * 0.92} ry={ry * 0.92} fill="#241a08" opacity={0.1} />
      <ellipse cx={rx * 0.06} cy={1} rx={rx * 0.6} ry={ry * 0.64} fill="#241a08" opacity={0.13} />
    </>
  )
}

function Jambes({
  marche,
  decal,
  ecart = 1.9,
  ep = 1.9,
  talonRouge,
}: {
  marche?: boolean
  decal: string
  ecart?: number
  ep?: number
  talonRouge?: boolean
}) {
  const y = -4.6
  return (
    <>
      <path d={`M${-ecart},${y} L${-ecart},-0.5 L${-ecart + 1.15},-0.35`} stroke={PEAU} strokeWidth={ep} fill="none" strokeLinecap="round">
        {marche && (
          <animateTransform attributeName="transform" type="rotate" values={`20 0 ${y};-20 0 ${y};20 0 ${y}`} dur="0.62s" begin={decal} repeatCount="indefinite" />
        )}
      </path>
      <path d={`M${ecart},${y} L${ecart},-0.5 L${ecart + 1.15},-0.35`} stroke={PEAU_OMBRE} strokeWidth={ep} fill="none" strokeLinecap="round">
        {marche && (
          <animateTransform attributeName="transform" type="rotate" values={`-20 0 ${y};20 0 ${y};-20 0 ${y}`} dur="0.62s" begin={decal} repeatCount="indefinite" />
        )}
      </path>
      {/* le talon : tout ce par quoi Achille est mortel, un simple liseré */}
      {talonRouge && <path d={`M${ecart - 0.15},-1.7 L${ecart + 0.65},-0.55`} stroke="#b4402f" strokeWidth={1} strokeLinecap="round" />}
    </>
  )
}

/** cuirasse : flanc ouest au soleil, flanc est éteint, ceinture de cuir */
function Buste({ c, larg = 3.3, or }: { c: string; larg?: number; or?: boolean }) {
  const top = -12.6
  const bas = -4.6
  const yc = -7.5
  return (
    <g>
      <path d={`M${-larg},${bas} L${-larg + 0.8},${top} L${larg - 0.8},${top} L${larg},${bas} Z`} fill={c} />
      <path d={`M${-larg},${bas} L${-larg + 0.8},${top} L${-larg + 2.4},${top} L${-larg + 2},${bas} Z`} fill={drapLit(c)} />
      <path d={`M${larg - 0.8},${top} L${larg},${bas} L${larg - 1.1},${bas} L${larg - 1.6},${top} Z`} fill={drapOmbre(c)} />
      {/* ceinture */}
      <path d={`M${-larg + 0.25},${yc} L${larg - 0.25},${yc} L${larg - 0.15},${yc - 1.05} L${-larg + 0.15},${yc - 1.05} Z`} fill={CUIR} />
      <path d={`M${-larg + 0.2},${yc - 1.05} L-0.3,${yc - 1.05} L-0.3,${yc} L${-larg + 0.25},${yc} Z`} fill="#7a5a3e" opacity={0.75} />
      {/* ourlet clair sur l'épaule ouest, creux d'ombre sous le menton */}
      <path d={`M${-larg + 0.8},${top} L0.5,${top}`} stroke={drapLit(c)} strokeWidth={0.9} opacity={0.85} />
      <path d={`M-1.6,${top + 0.1} Q0,${top + 0.85} 1.6,${top + 0.1}`} stroke={drapOmbre(c)} strokeWidth={0.7} fill="none" opacity={0.5} />
      {or && (
        <g>
          {/* pectoral ouvragé : deux arcs d'or et des clous d'épaule */}
          <path d="M-2.2,-11.2 Q0,-9.5 2.2,-11.2" stroke={OR} strokeWidth={0.8} fill="none" />
          <path d="M-1.8,-10.3 Q0,-8.9 1.8,-10.3" stroke={OR_OMBRE} strokeWidth={0.5} fill="none" opacity={0.9} />
          <circle cx={-2.1} cy={-12.2} r={0.75} fill={OR} />
          <circle cx={-2.25} cy={-12.35} r={0.4} fill={OR_LIT} />
          <circle cx={2.1} cy={-12.2} r={0.75} fill={OR_OMBRE} />
          <path d={`M${-larg + 0.35},${yc + 0.12} L${larg - 0.35},${yc + 0.12}`} stroke={OR} strokeWidth={0.45} opacity={0.9} />
        </g>
      )}
      {/* ptéruges de cuir sous la cuirasse */}
      <path d="M-2.3,-4.9 L-2.1,-3 L-1.2,-3.1 L-1.3,-4.8 Z" fill={BOIS} />
      <path d="M-0.6,-4.8 L-0.5,-2.9 L0.45,-3 L0.45,-4.8 Z" fill="#83694a" />
      <path d="M1.15,-4.8 L1.35,-3.1 L2.2,-3.2 L2.3,-4.9 Z" fill={CUIR} />
    </g>
  )
}

/** tête : face au soleil, joue est dans l'ombre */
function Tete({ barbe, barbeC = '#5f4630', oeil }: { barbe?: boolean; barbeC?: string; oeil?: boolean }) {
  return (
    <g>
      <circle cx={0} cy={-15.4} r={2.9} fill={PEAU} />
      <path d="M0.96,-18.14 A2.9,2.9 0 0 1 0.96,-12.66 A4.2,4.2 0 0 0 0.96,-18.14 Z" fill={PEAU_OMBRE} />
      {/* barbe : un coin sous le menton, pas un masque - le visage doit rester
          clair sous le bronze, sinon les huit héros n'ont plus qu'un trou noir
          en travers de la figure */}
      {barbe && (
        <g>
          <path d="M-1.7,-13.5 Q-1.1,-11.5 0.8,-11.8 Q2.3,-12.1 2.45,-13.7 Q0.7,-12.7 -1.7,-13.5 Z" fill={barbeC} />
          <path d="M-1.7,-13.5 Q-1.3,-12.2 -0.2,-11.85 Q-0.9,-12.8 -0.75,-13.2 Z" fill={mix(barbeC, '#ffe9c2', 0.3)} />
        </g>
      )}
      <circle cx={1.55} cy={-14.6} r={0.4} fill="#42311d" opacity={oeil ? 1 : 0.85} />
      {oeil && <path d="M-1.4,-14.75 L-0.5,-14.85" stroke="#42311d" strokeWidth={0.35} opacity={0.55} />}
    </g>
  )
}

/** casque de bronze : couvre-nuque, calotte modelée, nasal - la crête est à part */
function Casque({ joues, bandeauOr }: { joues?: boolean; bandeauOr?: boolean }) {
  return (
    // relevé d'un demi-point : au ras des sourcils, le bourrelet du bord mangeait
    // tout le visage et il ne restait qu'une bande sombre entre bronze et cuirasse
    <g transform="translate(0,-0.7)">
      {/* couvre-nuque en deux lames (le dos est à gauche) */}
      <path d="M-2.75,-15.75 L-4.1,-13.1 L-2.2,-12.95 L-1.85,-15.2 Z" fill="#4e4423" />
      <path d="M-2.75,-15.75 L-3.45,-14.35 L-2,-14.2 L-1.85,-15.2 Z" fill="#7a6c3e" />
      {/* calotte */}
      <path d="M-3,-15.7 Q-3,-18.95 0,-18.95 Q3,-18.95 3,-15.7 L3,-14.9 L-3,-14.9 Z" fill={BRONZE} />
      <path d="M0.6,-18.9 Q3,-18.3 3,-15.7 L3,-14.9 L0.95,-14.9 Q2.05,-17.2 0.6,-18.9 Z" fill={BRONZE_OMBRE} />
      <path d="M-2.2,-16.9 Q-1.6,-18.1 -0.4,-18.35" stroke={BRONZE_LIT} strokeWidth={0.8} fill="none" strokeLinecap="round" />
      <path d="M-2.6,-15.6 Q-2.5,-16.6 -1.95,-17.3" stroke="#c9b878" strokeWidth={0.55} fill="none" strokeLinecap="round" opacity={0.9} />
      {/* bourrelet du bord */}
      <path d="M-3,-14.9 L3,-14.9" stroke="#4c431f" strokeWidth={0.9} />
      <path d="M-2.9,-15.4 L2.9,-15.4" stroke={BRONZE_MI} strokeWidth={0.45} opacity={0.7} />
      {bandeauOr && <path d="M-2.95,-15.75 L2.95,-15.75" stroke={OR} strokeWidth={0.7} opacity={0.95} />}
      {/* nasal court au front */}
      <path d="M2.35,-16.3 L3,-15.7 L3,-14.9 L1.9,-15.6 Z" fill="#6a5f3a" />
      {/* joues rabattues : le visage disparaît derrière le bronze */}
      {joues && (
        <g>
          <path d="M-2.5,-14.9 L-2.8,-11.8 L-1.25,-12.1 L-1.15,-14.9 Z" fill={BRONZE} />
          <path d="M-2.5,-14.9 L-2.68,-12.9 L-1.75,-13.05 L-1.7,-14.9 Z" fill={BRONZE_MI} />
          <path d="M1.75,-14.9 L1.95,-12 L2.95,-12.5 L3,-14.9 Z" fill={BRONZE_MI} />
          <path d="M2.3,-14.9 L2.45,-12.3 L2.95,-12.5 L3,-14.9 Z" fill={BRONZE_OMBRE} />
          <path d="M1.85,-14.35 L2.9,-14.35" stroke={BRONZE_LIT} strokeWidth={0.4} opacity={0.7} />
        </g>
      )}
    </g>
  )
}

/**
 * Cimier de crin : brosse cintrée posée sur la calotte. `haut` la dresse
 * (Hector), `arc` lui ajoute son support de bronze.
 */
function Cimier({
  c,
  haut = 3.4,
  dx = 0,
  larg = 1,
  arc,
  sombre,
}: {
  c: string
  haut?: number
  dx?: number
  /** plumes latérales du triple cimier : plus étroites, sinon les trois fondent en une */
  larg?: number
  arc?: boolean
  sombre?: number
}) {
  const y0 = -19.3
  const s = y0 - haut
  const teinte = sombre ? mix(c, '#221408', sombre) : c
  return (
    <g transform={`translate(${dx},0) scale(${larg},1)`}>
      {arc && <path d={`M-2.5,${y0 + 0.4} Q0.2,${s - 1.3} 3,${y0 + 0.7}`} stroke={BRONZE_OMBRE} strokeWidth={0.85} fill="none" />}
      <path d={`M-2.9,${y0 + 0.5} Q-2.3,${s} 0.3,${s - 0.3} Q2.9,${s + 0.3} 3.1,${y0 + 0.9} Q0.2,${y0 - 1.1} -2.9,${y0 + 0.5} Z`} fill={teinte} />
      {/* mèches ouest frappées par le soleil, racine sombre qui assoit la brosse */}
      <path d={`M-2.9,${y0 + 0.5} Q-2.3,${s} 0.3,${s - 0.3} Q-0.9,${s + 1.1} -1.5,${y0 - 0.2} Z`} fill={drapLit(teinte)} opacity={0.85} />
      <path d={`M2.2,${s + 0.5} Q3,${s + 1.2} 3.1,${y0 + 0.9} Q2.4,${y0 - 0.4} 1.7,${y0 - 0.7} Z`} fill={drapOmbre(teinte)} opacity={0.8} />
      <path d={`M-2.8,${y0 + 0.35} Q0.2,${y0 - 1.2} 3,${y0 + 0.75}`} stroke={drapOmbre(teinte)} strokeWidth={0.75} fill="none" />
      {/* mèches : sans elles la brosse n'est qu'un dôme, et le crin ne se lit pas */}
      <path d={`M-1.6,${y0 - 0.6} Q-1.3,${s + 1.3} -0.2,${s + 0.2}`} stroke={drapOmbre(teinte)} strokeWidth={0.5} fill="none" opacity={0.75} />
      <path d={`M1.3,${y0 - 0.5} Q1.5,${s + 1.5} 1,${s + 0.5}`} stroke={drapOmbre(teinte)} strokeWidth={0.5} fill="none" opacity={0.6} />
      <path d={`M-0.4,${y0 - 0.9} Q-0.3,${s + 1.2} 0.5,${s + 0.1}`} stroke={drapLit(teinte)} strokeWidth={0.45} fill="none" opacity={0.55} />
    </g>
  )
}

/** emblème peint sur le champ du bouclier, dessiné dans une boîte de ±2,4 */
function Embleme({ kind }: { kind: 'cheval' | 'chouette' }) {
  if (kind === 'cheval') {
    // dompteur de chevaux : un cheval cabré, en or sur le champ
    return (
      <g>
        <path d="M-1.5,-0.3 Q-2.4,0.3 -2.1,1.3 L-1.55,1.05 Q-1.85,0.4 -1.15,0.25 Z" fill={OR_OMBRE} />
        <path d="M-1.5,-0.5 Q-0.2,-1 0.9,-0.55 L1.5,-1.95 L2.45,-1.75 L2.05,-0.9 L1.4,-0.3 L1.35,0.45 L1.55,1.6 L1,1.6 L0.78,0.5 L-0.4,0.62 L-0.55,1.6 L-1.1,1.6 L-1,0.5 L-1.5,0.4 Z" fill={OR} />
        <path d="M0.95,-0.6 L1.55,-1.9 L1.95,-1.75 L1.3,-0.35 Z" fill={OR_LIT} />
      </g>
    )
  }
  // chouette d'Athéna, de face
  return (
    <g>
      <path d="M-1.5,-1.15 L-2,-2.3 L-0.65,-1.7 Z" fill={OR} />
      <path d="M1.5,-1.15 L2,-2.3 L0.65,-1.7 Z" fill={OR_OMBRE} />
      <ellipse cx={0} cy={0.25} rx={1.55} ry={1.95} fill={OR} />
      <path d="M-1.55,0.1 A1.55,1.95 0 0 1 -0.1,-1.68 A1.9,2.3 0 0 0 -1.2,1.5 Z" fill={OR_LIT} opacity={0.75} />
      <circle cx={-0.65} cy={-0.55} r={0.6} fill="#3f3418" />
      <circle cx={0.68} cy={-0.55} r={0.6} fill="#3f3418" />
      <path d="M0,-0.25 L-0.36,0.55 L0.36,0.55 Z" fill="#3f3418" />
      <path d="M-0.9,1.55 L0.9,1.55" stroke={OR_OMBRE} strokeWidth={0.35} opacity={0.8} />
    </g>
  )
}

/** bouclier rond bombé : rive, champ aux couleurs de la maison, umbo, emblème */
function BouclierRond({
  c,
  r = 4.4,
  cx = -4.4,
  cy = -9.6,
  embleme,
}: {
  c: string
  r?: number
  cx?: number
  cy?: number
  embleme?: 'cheval' | 'chouette'
}) {
  const k = r / 4.4
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#4f3d22" />
      <path
        d={`M${cx - r * 0.87},${cy - r * 0.38} A${r},${r} 0 0 1 ${cx - r * 0.29},${cy - r * 0.94}`}
        stroke="#c8a869"
        strokeWidth={0.75}
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={r - 0.85} fill={drapOmbre(c)} />
      <circle cx={cx - r * 0.13} cy={cy - r * 0.13} r={r - 1.4} fill={c} />
      <circle cx={cx - r * 0.26} cy={cy - r * 0.26} r={r - 2.35} fill={drapLit(c)} opacity={0.55} />
      <path
        d={`M${cx + r * 0.79},${cy + r * 0.4} A${r - 0.85},${r - 0.85} 0 0 1 ${cx + r * 0.27},${cy + r * 0.86}`}
        stroke="#241408"
        strokeWidth={0.8}
        fill="none"
        strokeLinecap="round"
        opacity={0.4}
      />
      {embleme ? (
        <g transform={`translate(${cx - r * 0.08},${cy - r * 0.06}) scale(${(k * 1.02).toFixed(2)})`}>
          <Embleme kind={embleme} />
        </g>
      ) : (
        <>
          <circle cx={cx} cy={cy} r={1.3 * k} fill={OR_OMBRE} />
          <circle cx={cx - 0.3} cy={cy - 0.3} r={0.85 * k} fill={OR_LIT} />
        </>
      )}
    </g>
  )
}

/** lance : hampe deux tons, bras qui la porte, fer à deux facettes */
function Lance({ x0 = 4, y0 = 2, x1 = 7, y1 = -18, w = 1.4, bras = true }: { x0?: number; y0?: number; x1?: number; y1?: number; w?: number; bras?: boolean }) {
  const mx = x0 + (x1 - x0) * 0.55
  const my = y0 + (y1 - y0) * 0.55
  const ux = (x1 - x0) / Math.hypot(x1 - x0, y1 - y0)
  const uy = (y1 - y0) / Math.hypot(x1 - x0, y1 - y0)
  const mainX = x0 + (x1 - x0) * 0.42
  return (
    <g>
      {bras && (
        <>
          <line x1={1.4} y1={-10.2} x2={mainX} y2={-9.4} stroke={PEAU} strokeWidth={1.4} />
          <circle cx={mainX} cy={-9.4} r={0.95} fill={PEAU} />
        </>
      )}
      <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={BOIS} strokeWidth={w} />
      <line x1={mx} y1={my} x2={x1} y2={y1} stroke={BOIS_LIT} strokeWidth={w * 0.62} />
      {/* fer : éclat NW, revers dans l'ombre */}
      <path d={`M${x1},${y1} L${x1 + ux * 3.2 - uy * 0.1},${y1 + uy * 3.2} L${x1 + 1.15},${y1 - 0.2} Z`} fill={FER} />
      <path d={`M${x1 + 1.15},${y1 - 0.2} L${x1 + ux * 3.2},${y1 + uy * 3.2} L${x1 + 2.25},${y1 + 0.4} Z`} fill={FER_OMBRE} />
      <line x1={x1 - 0.2} y1={y1 + 0.35} x2={x1 + 1.5} y2={y1 - 0.05} stroke="#4f3a22" strokeWidth={0.85} />
    </g>
  )
}

// ─────────────────────────── attributs de légende ───────────────────────────

/** le bouclier-tour d'Ajax : sept peaux de bœuf, presque aussi haut que lui */
function BouclierTour({ c }: { c: string }) {
  const hides = [-15.4, -13.2, -11, -8.8, -6.6, -4.4]
  return (
    <g>
      {/* rive de cuir clouté */}
      <path d="M-9.6,-1.6 Q-10.1,-16.4 -5.4,-17.6 Q-0.9,-16.5 -1.3,-1.5 Q-5.4,-0.3 -9.6,-1.6 Z" fill="#4a3418" />
      <path d="M-9,-2 Q-9.5,-15.9 -5.4,-17 Q-1.5,-16 -1.9,-1.9 Q-5.4,-0.9 -9,-2 Z" fill={drapOmbre(c)} />
      <path d="M-9,-2 Q-9.5,-15.9 -5.4,-17 L-5,-1.05 Q-7.2,-1.2 -9,-2 Z" fill={c} />
      <path d="M-8.6,-3 Q-9,-15.2 -6.2,-16.4 L-6,-1.4 Q-7.5,-1.6 -8.6,-3 Z" fill={drapLit(c)} opacity={0.6} />
      {/* coutures des sept peaux */}
      {hides.map((y, i) => (
        <g key={y}>
          <path d={`M-8.95,${y} Q-5.4,${y - 0.9} -1.95,${y + 0.1}`} stroke="#3a2913" strokeWidth={0.7} fill="none" opacity={0.7 + i * 0.02} />
          <path d={`M-8.9,${y + 0.5} Q-5.4,${y - 0.4} -2,${y + 0.6}`} stroke={drapLit(c)} strokeWidth={0.45} fill="none" opacity={0.5} />
        </g>
      ))}
      {/* umbo de bronze et clous de rive */}
      <circle cx={-5.5} cy={-9.2} r={1.7} fill={OR_OMBRE} />
      <circle cx={-5.85} cy={-9.55} r={1.05} fill={OR} />
      <circle cx={-6.05} cy={-9.75} r={0.5} fill={OR_LIT} />
      <path d="M-9.35,-14.4 L-8.8,-14.45 M-9.5,-8.6 L-8.95,-8.6 M-9.35,-4.4 L-8.8,-4.35" stroke="#c8a869" strokeWidth={0.5} opacity={0.7} />
      <path d="M-9.9,-13.4 Q-9.9,-16 -7,-17.2" stroke="#c8a869" strokeWidth={0.7} fill="none" opacity={0.8} />
    </g>
  )
}

/** pilos : le bonnet de feutre conique des marins et des rameurs */
function Pilos() {
  return (
    <g>
      <path d="M-2.4,-16.6 Q-2.1,-21.3 0.25,-22.6 Q2.35,-20.9 2.7,-16.4 Q0,-17.7 -2.4,-16.6 Z" fill="#b9a67e" />
      <path d="M0.25,-22.6 Q2.35,-20.9 2.7,-16.4 Q1.4,-17 0.55,-17.2 Q1.1,-19.7 0.25,-22.6 Z" fill="#8b7a55" />
      <path d="M-1.7,-17.8 Q-1.3,-20.4 -0.1,-21.7" stroke="#dccdaa" strokeWidth={0.7} fill="none" strokeLinecap="round" />
      {/* bourdalou de laine */}
      <path d="M-2.43,-16.65 Q0,-17.75 2.7,-16.5" stroke="#6f6144" strokeWidth={0.85} fill="none" />
      <path d="M-2.25,-17.15 Q0,-18.2 2.5,-17.05" stroke={LIN} strokeWidth={0.5} fill="none" opacity={0.75} />
    </g>
  )
}

/** le grand arc d'Ulysse, en bandoulière dans le dos (dessiné derrière le corps) */
function ArcDos() {
  return (
    <g>
      <path d="M-4.8,-19.6 Q-10.6,-11.2 -4.2,-2.4" stroke={BOIS} strokeWidth={1.6} fill="none" />
      <path d="M-5.2,-19.4 Q-10.9,-11.2 -4.6,-2.6" stroke={BOIS_LIT} strokeWidth={0.75} fill="none" />
      <line x1={-4.8} y1={-19.6} x2={-4.2} y2={-2.4} stroke="#e0d9c8" strokeWidth={0.55} />
      {/* poignée gainée et cornes de l'arc */}
      <line x1={-9.15} y1={-12} x2={-9.5} y2={-10} stroke="#4f3a22" strokeWidth={1.3} />
      <circle cx={-4.8} cy={-19.6} r={0.55} fill="#4f3a22" />
      <circle cx={-4.2} cy={-2.4} r={0.55} fill="#4f3a22" />
    </g>
  )
}

/** cape courte de voyage, agitée par le vent (dessinée derrière le corps) */
function Cape({ c, anime }: { c: string; anime?: boolean }) {
  const d0 = 'M-3.2,-12.8 Q-8.6,-8.2 -6,-1.2 L-2,-3.2 Z'
  const d1 = 'M-3.2,-12.8 Q-9.8,-8.6 -7.1,-0.7 L-2,-3.2 Z'
  return (
    <g>
      <path d={d0} fill={c} opacity={0.9}>
        {anime && <animate attributeName="d" values={`${d0};${d1};${d0}`} dur="4.6s" repeatCount="indefinite" />}
      </path>
      <path d="M-3.2,-12.8 Q-6.6,-9.2 -5.3,-3.9 L-3.5,-4.8 Z" fill={drapLit(c)} opacity={0.45} />
      <path d="M-4.9,-9.6 Q-5.2,-6 -5.9,-2.6" stroke={drapOmbre(c)} strokeWidth={0.6} fill="none" opacity={0.8} />
    </g>
  )
}

/**
 * Manteau de pourpre du roi des rois : il traîne jusqu'au sol. Tiré vers le
 * pourpre et non laissé à l'or de sa maison - un manteau de la même teinte que
 * la cuirasse ne se voyait pas, et c'est LUI qui donne sa silhouette au roi.
 */
function ManteauLong({ c: base }: { c: string }) {
  const c = mix(base, '#6b2547', 0.62)
  return (
    <g>
      <path d="M-3.3,-12.9 Q-9.4,-8.4 -8.2,-0.2 L-0.6,-0.2 L-1.4,-12.9 Z" fill={c} />
      <path d="M-3.3,-12.9 Q-8.1,-8.8 -7,-0.2 L-4.6,-0.2 L-2.6,-12.9 Z" fill={drapLit(c)} opacity={0.5} />
      <path d="M-1.4,-12.9 L-0.6,-0.2 L-3,-0.2 L-2.6,-12.9 Z" fill={drapOmbre(c)} opacity={0.55} />
      <path d="M-5.6,-10 Q-6.6,-5.4 -6.4,-0.6 M-3.9,-9 Q-4.3,-5 -4.4,-0.5" stroke={drapOmbre(c)} strokeWidth={0.55} fill="none" opacity={0.75} />
      {/* galon d'or sur l'ourlet du bas et fibule à l'épaule */}
      <path d="M-8.15,-0.55 L-0.65,-0.55" stroke={OR} strokeWidth={0.6} opacity={0.9} />
      <circle cx={-2.9} cy={-12.6} r={0.85} fill={OR_OMBRE} />
      <circle cx={-3.05} cy={-12.8} r={0.5} fill={OR_LIT} />
    </g>
  )
}

/** diadème d'or sur la calotte : le seul roi de la bande */
function DiademeOr() {
  return (
    <g>
      <path
        d="M-2.95,-17.1 Q0,-18.55 2.95,-17.15 L2.95,-18.15 L2.25,-19.6 L1.5,-18.5 L0.6,-20.7 L-0.4,-18.7 L-1.25,-19.9 L-2,-18.6 L-2.95,-19.2 Z"
        fill={OR}
      />
      <path d="M-2.95,-17.1 Q-1.4,-17.85 0,-18.15 L0.6,-20.7 L-0.4,-18.7 L-1.25,-19.9 L-2,-18.6 L-2.95,-19.2 Z" fill={OR_LIT} />
      <path d="M1.5,-18.5 L2.25,-19.6 L2.95,-18.15 L2.95,-17.15 Q2.2,-17.5 1.6,-17.75 Z" fill={OR_OMBRE} />
      <path d="M-2.9,-17.5 Q0,-18.9 2.9,-17.55" stroke={OR_OMBRE} strokeWidth={0.4} fill="none" opacity={0.8} />
      <circle cx={0.6} cy={-20.9} r={0.55} fill="#e8534a" />
    </g>
  )
}

/** sceptre : hampe d'or à l'aigle, tenu droit - Agamemnon ne se penche pas */
function Sceptre() {
  return (
    <g>
      <line x1={1.6} y1={-10.6} x2={5} y2={-10.2} stroke={PEAU} strokeWidth={1.4} />
      <line x1={5.4} y1={1.4} x2={5.4} y2={-19.4} stroke={BOIS} strokeWidth={1.5} />
      <line x1={5.05} y1={-1} x2={5.05} y2={-19.2} stroke={BOIS_LIT} strokeWidth={0.7} />
      <circle cx={5.4} cy={-10.2} r={0.9} fill={PEAU} />
      {/* bagues d'or */}
      <path d="M4.6,-14.6 L6.2,-14.6 M4.6,-5.6 L6.2,-5.6" stroke={OR} strokeWidth={0.7} />
      {/* aigle au sommet : corps d'or et deux ailes ouvertes */}
      <path d="M5.4,-19.4 L3.5,-21.5 L4.7,-21 Z" fill={OR_OMBRE} />
      <path d="M5.4,-19.4 L7.5,-21.9 L6.2,-21.1 Z" fill={OR} />
      <ellipse cx={5.45} cy={-20.6} rx={1} ry={1.5} fill={OR} />
      <path d="M4.55,-21 A1,1.5 0 0 1 5.55,-22.05 A1.3,1.9 0 0 0 4.75,-19.9 Z" fill={OR_LIT} />
      <path d="M5.45,-22.1 L6.6,-22.6 L5.8,-21.6 Z" fill={OR_OMBRE} />
    </g>
  )
}

/** robe longue de prêtresse, ceinturée haut - silhouette en cloche */
function Robe({ c }: { c: string }) {
  return (
    <g>
      <path d="M-2.7,-12.4 L-4.8,-0.3 L4.6,-0.3 L2.7,-12.4 Z" fill={c} />
      <path d="M-2.7,-12.4 L-4.8,-0.3 L-1.9,-0.3 L-1.2,-12.4 Z" fill={drapLit(c)} />
      <path d="M2.7,-12.4 L4.6,-0.3 L2.2,-0.3 L1.5,-12.4 Z" fill={drapOmbre(c)} />
      {/* plis verticaux et ourlet brodé */}
      <path d="M-0.5,-11.4 L-1.4,-0.6 M1,-11.4 L1.5,-0.6" stroke={drapOmbre(c)} strokeWidth={0.5} fill="none" opacity={0.7} />
      <path d="M-4.65,-1 L4.45,-1" stroke={drapOmbre(c)} strokeWidth={0.7} opacity={0.85} />
      <path d="M-4.4,-1.7 L4.2,-1.7" stroke={LIN} strokeWidth={0.5} opacity={0.75} />
      {/* ceinture haute de laine, nouée */}
      <path d="M-2.35,-10.4 L2.35,-10.4 L2.25,-11.4 L-2.25,-11.4 Z" fill={LIN} />
      <path d="M-2.3,-11.4 L-0.2,-11.4 L-0.2,-10.4 L-2.3,-10.4 Z" fill="#ffffff" opacity={0.35} />
      <path d="M0.4,-10.4 L0.1,-8.2 M1,-10.4 L1.2,-8.4" stroke={LIN} strokeWidth={0.5} fill="none" opacity={0.9} />
      {/* pieds nus qui dépassent de l'ourlet */}
      <path d="M-1.4,-0.35 L-0.3,-0.2 M1.3,-0.35 L2.4,-0.2" stroke={PEAU_OMBRE} strokeWidth={0.9} strokeLinecap="round" />
    </g>
  )
}

/** la masse de cheveux, DERRIÈRE la tête - dessinée avant le visage */
function CheveuxDos() {
  return (
    <g>
      <path d="M-3.5,-17.4 Q-5.2,-13 -3.1,-10.4 L2.6,-10.4 Q4.4,-13.2 3.2,-17.2 Q0,-19.7 -3.5,-17.4 Z" fill="#4a3423" />
      <path d="M-3.5,-17.4 Q-5,-13.4 -3.3,-10.7 L-1.8,-10.7 Q-3.2,-14.2 -1.6,-18.4 Z" fill="#6b4c31" />
      <path d="M3.2,-17.2 Q4.4,-13.2 2.6,-10.4 L1.4,-10.4 Q3.3,-13.6 2.4,-17 Z" fill="#3a2718" />
      <path d="M-4.3,-15.4 Q-4.6,-12.9 -3.5,-11" stroke="#8a6746" strokeWidth={0.55} fill="none" opacity={0.8} />
    </g>
  )
}

/**
 * Frange et bandelettes de laine, PAR-DESSUS le visage : la chevelure dénouée
 * encadre la figure au lieu de l'effacer - une prêtresse, pas une cagoule.
 */
function CheveuxPretresse({ anime }: { anime?: boolean }) {
  const b0 = 'M-3,-16.1 Q-5.4,-14.2 -4.8,-11.2'
  const b1 = 'M-3,-16.1 Q-6.2,-14.4 -5.7,-11'
  return (
    <g>
      {/* frange sur le haut du front, mèches libres sur les tempes */}
      <path d="M-3,-16.5 Q-2.4,-19.1 0.2,-19.2 Q2.9,-18.9 3.15,-16.3 Q0,-17.9 -3,-16.5 Z" fill="#5b3f2a" />
      <path d="M-3,-16.5 Q-2.5,-18.8 -0.3,-19.15 Q-1.3,-17.9 -1.5,-16.8 Z" fill="#7d5a3a" />
      <path d="M-2.2,-18.3 Q-0.7,-19.05 1.1,-18.75" stroke="#8a6746" strokeWidth={0.6} fill="none" strokeLinecap="round" opacity={0.9} />
      <path d="M2.95,-16.9 Q3.6,-14.6 2.9,-12.6" stroke="#3a2718" strokeWidth={0.75} fill="none" />
      {/* bandelettes de laine : bandeau au front, ruban qui traîne dans le vent */}
      <path d="M-3.05,-16.55 Q0,-18 3.15,-16.4" stroke={LIN} strokeWidth={1.05} fill="none" />
      <path d="M-2.85,-16.95 Q0,-18.3 2.95,-16.8" stroke="#ffffff" strokeWidth={0.45} fill="none" opacity={0.5} />
      <path d={b0} stroke={LIN} strokeWidth={0.85} fill="none" strokeLinecap="round">
        {anime && <animate attributeName="d" values={`${b0};${b1};${b0}`} dur="5.2s" repeatCount="indefinite" />}
      </path>
      <path d="M-2.5,-15.3 Q-4.2,-13.9 -3.8,-11.7" stroke="#d9cfb6" strokeWidth={0.6} fill="none" strokeLinecap="round" />
    </g>
  )
}

/** rameau de laurier tenu à la main - sa seule arme */
function RameauLaurier({ anime }: { anime?: boolean }) {
  const feuilles: [number, number, number][] = [
    [0.6, -2.2, -32],
    [1.5, -3.6, -18],
    [2.4, -5, -34],
    [3.1, -6.6, -14],
    [3.8, -8.2, -30],
  ]
  return (
    <g transform="translate(3.4,-8.6)">
      {anime && <animateTransform attributeName="transform" type="rotate" values="0 0 0;-5 0 0;0 0 0" dur="5.6s" additive="sum" repeatCount="indefinite" />}
      <line x1={-1.6} y1={-1.2} x2={0.4} y2={-1.6} stroke={PEAU} strokeWidth={1.3} />
      <circle cx={0.5} cy={-1.6} r={0.85} fill={PEAU} />
      <path d="M0.2,-1.4 Q2.8,-5.2 4.4,-9.2" stroke="#5c6b3a" strokeWidth={0.85} fill="none" />
      {feuilles.map(([x, y, a], i) => (
        <g key={i} transform={`translate(${x},${y}) rotate(${a})`}>
          <ellipse cx={0} cy={0} rx={0.6} ry={1.5} fill={i % 2 ? FEUILLE : FEUILLE_LIT} />
          <ellipse cx={-0.15} cy={-0.25} rx={0.28} ry={0.9} fill={FEUILLE_LIT} opacity={0.7} />
        </g>
      ))}
      {feuilles.map(([x, y, a], i) => (
        <ellipse key={`d${i}`} cx={x - 1.35} cy={y + 0.9} rx={0.55} ry={1.35} fill={FEUILLE} opacity={0.85} transform={`rotate(${-a * 0.7} ${x - 1.35} ${y + 0.9})`} />
      ))}
    </g>
  )
}

/**
 * Anchise sur les épaules de son fils - l'image la plus célèbre d'Énée, et
 * celle qui rend sa silhouette reconnaissable même minuscule : deux têtes.
 */
function AnchiseBuste() {
  const drap = '#9aa3ad'
  return (
    // décalé vers l'arrière et posé assez haut pour que son buste dépasse du
    // casque : sinon on ne voit qu'une tête greffée sur le cimier de son fils
    <g transform="translate(-1.3,0.4)">
      {/* buste : le vieillard est vêtu de gris de laine - il ne porte plus les
          couleurs d'une maison, il n'est plus qu'un père qu'on emporte */}
      <path d="M-2.4,-18.2 L-1.9,-23.2 L2,-23.2 L2.5,-18.2 Z" fill={drap} />
      <path d="M-2.4,-18.2 L-1.9,-23.2 L-0.6,-23.2 L-0.9,-18.2 Z" fill="#c2c8ce" />
      <path d="M2,-23.2 L2.5,-18.2 L1.5,-18.2 L1.2,-23.2 Z" fill="#6d757e" />
      <path d="M-2.2,-20.2 L2.3,-20.2" stroke="#77808a" strokeWidth={0.55} opacity={0.8} />
      {/* bras qui se retient à la tête de son fils */}
      <path d="M-2,-22.2 Q-4.6,-20.4 -4.2,-17.6" stroke={PEAU} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      <path d="M1.9,-22.2 Q4,-20.8 3.9,-18.6" stroke={PEAU_OMBRE} strokeWidth={1.3} fill="none" strokeLinecap="round" />
      {/* tête : crâne dégarni, couronne de cheveux blancs, barbe courte */}
      <circle cx={0.1} cy={-25.2} r={2.15} fill={PEAU} />
      <path d="M0.81,-27.23 A2.15,2.15 0 0 1 0.81,-23.17 A3.1,3.1 0 0 0 0.81,-27.23 Z" fill={PEAU_OMBRE} />
      <path d="M-2.05,-25.4 Q-2.3,-26.6 -1.1,-26.9 Q-1.6,-26 -1.4,-24.9 Z" fill="#e3ddcd" />
      <path d="M1.4,-26.7 Q2.35,-26.2 2.2,-25 Q1.8,-25.7 1.1,-26.1 Z" fill="#c6c0b0" />
      <path d="M-1.6,-24.2 Q-1,-22 0.8,-22.4 Q2,-22.8 2.1,-24.5 Q0.5,-23.2 -1.6,-24.2 Z" fill="#e8e2d2" />
      <circle cx={1.3} cy={-25.6} r={0.35} fill="#42311d" />
    </g>
  )
}

/** les jambes du vieillard, qui pendent en travers du buste de son fils */
function AnchiseJambes() {
  return (
    <g>
      <path d="M-3.4,-16.4 Q-4.9,-14 -4.1,-11.4 L-2.7,-11.8 Q-3.4,-14 -2,-16 Z" fill="#8b939c" />
      <path d="M1.5,-16.2 Q3.2,-13.9 2.5,-11.2 L1.2,-11.6 Q1.8,-13.8 0.5,-15.8 Z" fill="#6d757e" />
      <path d="M-4.15,-11.5 L-2.6,-11.9" stroke={PEAU_OMBRE} strokeWidth={0.9} strokeLinecap="round" />
      <path d="M2.45,-11.3 L1.15,-11.7" stroke={PEAU_OMBRE} strokeWidth={0.9} strokeLinecap="round" />
    </g>
  )
}

/** les pénates : les dieux de la maison, emportés dans une besace */
function Penates() {
  return (
    <g>
      <path d="M2.2,-8.4 Q5,-8.8 5.4,-6.4 Q5.6,-4 3,-3.8 Q1.6,-4 1.6,-6.2 Z" fill="#8a6f4a" />
      <path d="M2.2,-8.4 Q4,-8.6 4.6,-7.2 Q3.4,-4.4 3,-3.8 Q1.6,-4 1.6,-6.2 Z" fill="#a98a5d" />
      <path d="M2,-8.2 Q3.6,-9 5.2,-8" stroke="#5d4a33" strokeWidth={0.6} fill="none" />
      {/* deux statuettes qui dépassent du sac */}
      <path d="M2.9,-8.6 L2.9,-10.6 L3.7,-10.6 L3.7,-8.6 Z" fill={OR_OMBRE} />
      <circle cx={3.3} cy={-11.1} r={0.62} fill={OR} />
      <path d="M4.1,-8.5 L4.2,-10 L4.9,-10 L4.8,-8.5 Z" fill="#a8956a" />
      <circle cx={4.55} cy={-10.45} r={0.5} fill={OR_LIT} />
    </g>
  )
}

// ─────────────────────────── la figure complète ───────────────────────────

/**
 * Un héros, reconnaissable à son attribut. `detail` ajoute ce que la carte
 * peut se permettre et que la mêlée ne verrait pas (vent dans les étoffes,
 * regard, reflets) ; en bataille on garde la silhouette nue.
 */
export function SilhouetteHeros({
  h,
  anim = 'idle',
  seed = 0,
  dur = 2.1,
  detail = false,
  ech = 1,
}: {
  h: HeroId
  anim?: AnimHeros
  seed?: number
  dur?: number
  detail?: boolean
  ech?: number
}) {
  const c = HEROS[h].couleur
  const marche = anim === 'marche'
  const combat = anim === 'combat'
  const decal = `-${(seed * 3.1).toFixed(2)}s`
  const durS = `${dur}s`
  const echelle = ECH[h] * ech

  /* le coup porté : le buste part en avant, l'arme le suit d'un cran */
  const jab = combat ? (
    <animateTransform
      attributeName="transform"
      type="translate"
      values="0,0;-1.6,0.4;3.4,-1;0,0;0,0"
      keyTimes="0;0.06;0.13;0.3;1"
      dur={durS}
      begin={decal}
      repeatCount="indefinite"
    />
  ) : null

  let dos: React.ReactNode = null
  let corps: React.ReactNode = null
  let devant: React.ReactNode = null
  let ombre = { rx: 6.2, ry: 2.2 }
  let jambes: React.ReactNode = <Jambes marche={marche} decal={decal} />

  switch (h) {
    case 'hector':
      // le Rempart : cimier dressé, grand bouclier au cheval, lance de mêlée
      dos = <Cape c={c} anime={detail} />
      corps = (
        <>
          <Buste c={c} larg={3.4} />
          <Tete barbe oeil={detail} />
          <Casque />
          <Cimier c={c} haut={5.4} arc />
        </>
      )
      devant = (
        <>
          <g>
            {jab}
            <Lance x0={4.2} y0={2} x1={7.4} y1={-21.4} />
          </g>
          <BouclierRond c={c} r={5.2} cx={-4.6} cy={-9.4} embleme="cheval" />
        </>
      )
      ombre = { rx: 7, ry: 2.4 }
      break

    case 'ulysse':
      // le marin : pas de casque mais le pilos, l'arc massif dans le dos
      dos = (
        <>
          <ArcDos />
          <Cape c={c} anime={detail} />
        </>
      )
      corps = (
        <>
          <Buste c={c} larg={3.1} />
          <Tete barbe barbeC="#4a3423" oeil={detail} />
          <Pilos />
        </>
      )
      devant = (
        <>
          <g>
            {jab}
            <Lance x0={4.2} y0={2} x1={6.6} y1={-17.6} w={1.25} />
          </g>
          <BouclierRond c={c} r={3.7} cx={-3.8} cy={-9.2} embleme="chouette" />
        </>
      )
      ombre = { rx: 6.4, ry: 2.2 }
      break

    case 'achille':
      // le plus grand et le plus terrible : triple cimier, lance de Pélée
      dos = <Cape c={c} anime={detail} />
      corps = (
        <>
          <Buste c={c} larg={3.6} or />
          <Tete oeil={detail} />
          <Casque bandeauOr />
          {/* triple cimier : deux plumes latérales étroites encadrent la haute */}
          <Cimier c={c} haut={3.6} dx={-2.1} larg={0.5} sombre={0.3} />
          <Cimier c={c} haut={3.9} dx={2.2} larg={0.5} sombre={0.15} />
          <Cimier c={c} haut={6.2} larg={0.82} arc />
        </>
      )
      devant = (
        <>
          <g>
            {jab}
            <Lance x0={4.4} y0={2.2} x1={8} y1={-23.6} w={1.55} />
          </g>
          <BouclierRond c={c} r={4.7} cx={-4.6} cy={-9.6} />
        </>
      )
      jambes = <Jambes marche={marche} decal={decal} ecart={2} ep={2} talonRouge />
      ombre = { rx: 7.2, ry: 2.5 }
      break

    case 'ajax':
      // la tour : le bouclier fait la silhouette, aucune crête ne le surmonte
      corps = (
        <>
          <Buste c={c} larg={3.8} />
          <Tete barbe />
          <Casque />
        </>
      )
      devant = (
        <>
          <g>
            {jab}
            <Lance x0={4.6} y0={2} x1={6.8} y1={-17.4} w={1.5} />
          </g>
          <BouclierTour c={c} />
        </>
      )
      jambes = <Jambes marche={marche} decal={decal} ecart={2.2} ep={2.1} />
      ombre = { rx: 7.8, ry: 2.6 }
      break

    case 'agamemnon':
      // le roi des rois : diadème, sceptre, pourpre qui traîne, port raide
      dos = <ManteauLong c={c} />
      corps = (
        <>
          <Buste c={c} larg={3.4} or />
          <Tete barbe barbeC="#4e3a26" oeil={detail} />
          <Casque bandeauOr />
          <DiademeOr />
        </>
      )
      devant = (
        <>
          <Sceptre />
          <BouclierRond c={c} r={3.9} cx={-4} cy={-9.4} />
        </>
      )
      ombre = { rx: 7.4, ry: 2.5 }
      break

    case 'cassandre':
      // la prêtresse : robe en cloche, chevelure libre, laurier - pas d'arme
      jambes = null
      corps = (
        <>
          <Robe c={c} />
          <CheveuxDos />
          <Tete oeil={detail} />
          <CheveuxPretresse anime={detail} />
          {/* étole de laine sur les épaules */}
          <path d="M-2.9,-12.1 Q0,-10.6 2.9,-12.1 L2.6,-11 Q0,-9.6 -2.6,-11 Z" fill={LIN} opacity={0.9} />
        </>
      )
      devant = <RameauLaurier anime={detail} />
      ombre = { rx: 6.4, ry: 2.2 }
      break

    case 'enee':
      // le pieux : son père sur les épaules, ses dieux dans une besace
      corps = (
        <>
          <AnchiseBuste />
          <Buste c={c} larg={3.3} />
          <Tete barbe barbeC="#54402a" oeil={detail} />
          <Casque />
          <AnchiseJambes />
          <Penates />
          {/* le bras d'Énée, replié pour tenir la jambe de son père */}
          <path d="M-2.9,-11.2 Q-4.6,-13.2 -3.7,-15.2" stroke={PEAU} strokeWidth={1.4} fill="none" strokeLinecap="round" />
        </>
      )
      devant = <BouclierRond c={c} r={3.6} cx={-5} cy={-8.4} />
      ombre = { rx: 6.8, ry: 2.3 }
      break

    case 'diomede':
      // le fauve compact : joues rabattues, deux lances, épaules larges
      corps = (
        <>
          <Buste c={c} larg={3.7} />
          <Tete />
          <Casque joues />
          <Cimier c={c} haut={2.2} sombre={0.1} />
        </>
      )
      devant = (
        <>
          <g>
            {jab}
            <Lance x0={4} y0={2} x1={6.4} y1={-17.2} w={1.3} />
            <Lance x0={5.4} y0={2} x1={8.6} y1={-15} w={1.2} bras={false} />
          </g>
          <BouclierRond c={c} r={4.3} cx={-4.4} cy={-9.2} embleme="chouette" />
        </>
      )
      jambes = <Jambes marche={marche} decal={decal} ecart={2.1} ep={2} />
      ombre = { rx: 7, ry: 2.4 }
      break
  }

  return (
    <g transform={`scale(${echelle.toFixed(3)})`}>
      <OmbreSol rx={ombre.rx} ry={ombre.ry} />
      {dos}
      {jambes}
      <g>
        {marche && <animateTransform attributeName="transform" type="translate" values="0,0;0,-1.2;0,0" dur="0.31s" begin={decal} repeatCount="indefinite" />}
        {corps}
        {devant}
      </g>
    </g>
  )
}

/**
 * L'attribut du héros, planté à côté de lui quand il est hors de combat :
 * un héros assis et bandé reste identifiable par ce qu'il a posé par terre.
 */
export function AttributPose({ h }: { h: HeroId }) {
  const c = HEROS[h].couleur
  switch (h) {
    case 'hector':
      return (
        <g transform="translate(9,0) scale(0.95)">
          <Lance x0={0} y0={1} x1={2.6} y1={-19} bras={false} />
          <g transform="translate(1.2,3.4) scale(0.85)">
            <BouclierRond c={c} r={5} cx={0} cy={-4.6} embleme="cheval" />
          </g>
        </g>
      )
    case 'ulysse':
      return (
        <g transform="translate(10.4,-1.4) scale(0.9)">
          <ArcDos />
        </g>
      )
    case 'achille':
      return (
        <g transform="translate(9.4,0) scale(1)">
          <Lance x0={0} y0={1} x1={3.2} y1={-22} w={1.5} bras={false} />
        </g>
      )
    case 'ajax':
      return (
        <g transform="translate(15.6,0.6) scale(0.9)">
          <BouclierTour c={c} />
        </g>
      )
    case 'agamemnon':
      return (
        <g transform="translate(4.8,0)">
          <Sceptre />
        </g>
      )
    case 'cassandre':
      return (
        <g transform="translate(6.6,4.4) rotate(28)">
          <RameauLaurier />
        </g>
      )
    case 'enee':
      return (
        <g transform="translate(6.4,4) scale(1.1)">
          <Penates />
        </g>
      )
    case 'diomede':
      return (
        <g transform="translate(8.6,0) scale(0.95)">
          <Lance x0={0} y0={1} x1={2.2} y1={-17.4} bras={false} />
          <Lance x0={1.6} y0={1} x1={4.6} y1={-15.6} w={1.2} bras={false} />
        </g>
      )
  }
}
