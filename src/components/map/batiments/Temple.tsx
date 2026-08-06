import { AOBase, Colonne3D, MurPierre, OmbreVolume, PAL, alea } from '../art'
import { Amphore, Buisson, Feu, Fumee, OlivierMini } from './primitives'
import { Anim } from '../smil'

/*
 * ═══════════════════════════ LE TEMPLE ═══════════════════════════
 *
 * Il a été écrit le premier, comme référence de la bible visuelle - et les neuf
 * autres bâtiments l'ont dépassé depuis. Deux manques criants dans la version
 * précédente, tous deux structurels :
 *
 *  · PAS DE FLANC. Le corps n'était qu'un rectangle plat surmonté d'un fronton :
 *    en vue 3/4, un temple sans sa colonnade latérale qui fuit vers le fond n'a
 *    aucun volume. C'est le péristyle de flanc qui fait le temple grec.
 *  · PAS DE SANCTUAIRE. Un temple n'est jamais seul : il est le centre d'un
 *    téménos peuplé - péribole, autel des sacrifices, trépieds votifs, stèles,
 *    trésors, bois sacré. Sans cela il flotte, isolé, au milieu de rien.
 *
 * Les quatre âges du sanctuaire, chacun reconnaissable d'un coup d'œil :
 *  1. LE BOIS SACRÉ - un chêne, un autel de cendres, un péribole de pierre sèche.
 *     Pas de bâtiment : le dieu habite l'arbre.
 *  2. LE NAÏSKOS - distyle in antis, socle de pierre et murs de brique crue à
 *     pans de bois, rampe d'accès, toit de terre cuite à antéfixes. L'archaïsme.
 *  3. LE PÉRIPTÈRE DE PIERRE - colonnade sur les quatre faces, frise à triglyphes
 *     et métopes peintes, porte de bronze, statue de culte devinée dans l'ombre.
 *  4. LE GRAND TEMPLE DE MARBRE ET D'OR - huit colonnes, acrotères dorés,
 *     boucliers ex-voto pendus à l'architrave, tympan peint, chrysélephantine.
 *
 * Conventions tenues : lumière au nord-ouest, ombres au sud-est, aucun contour
 * noir, `alea` et jamais `Math.random`, ancre (0,0) au pied, ids préfixés `t-`.
 * Les desservants d'`Ouvriers.tsx` se tiennent en (0,15) et (-20,10) : le parvis
 * leur reste dégagé.
 */

// ── Le bois sacré ────────────────────────────────────────────────────────────

/** chêne sacré : couronne étagée du sombre au clair, tronc évasé, bandelettes */
function CheneSacre({ x = 0, y = 0, s = 1, seed = 3 }: { x?: number; y?: number; s?: number; seed?: number }) {
  const rnd = alea(seed)
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={7} cy={2} rx={18} ry={4.8} fill={PAL.ombrePortee} opacity={0.17} filter="url(#a-flou2)" />
      {/* tronc évasé, flanc droit dans l'ombre, écorce marquée */}
      <path d="M-3.4,0 C-3,-5 -2.6,-10 -1.6,-15 L1.6,-15 C2.6,-10 3,-5 3.4,0 Q0,1.6 -3.4,0 Z" fill="#6e5233" />
      <path d="M1.2,-1 C1.8,-6 2,-10 1.4,-14.4 L1.6,-15 C2.6,-10 3,-5 3.4,0 Q1.8,0.8 1.2,-1 Z" fill="#4f3a22" />
      <path d="M-2.4,-2 C-2.6,-7 -2.2,-11 -1.4,-14.4" stroke="#a07c50" strokeWidth={0.9} fill="none" opacity={0.9} />
      {/* deux branches basses, qui portent les offrandes */}
      <path d="M-1.4,-13 C-6,-15 -9,-16.4 -11.4,-15.6" stroke="#6e5233" strokeWidth={1.7} fill="none" />
      <path d="M1.4,-13.6 C5.4,-15.4 8.4,-16.6 10.6,-16" stroke="#5e4529" strokeWidth={1.5} fill="none" />
      {/* couronne : ombre propre basse → demi-teinte → masses éclairées NW */}
      <ellipse cx={4} cy={-16} rx={14.5} ry={8.5} fill="#465d3a" />
      <ellipse cx={-4} cy={-17.5} rx={13.5} ry={8.5} fill="#546f45" />
      <ellipse cx={2} cy={-21} rx={12} ry={7} fill="#657f50" />
      <ellipse cx={-5} cy={-22.5} rx={9} ry={5.6} fill="#79955f" />
      <ellipse cx={-8.5} cy={-24.5} rx={5.5} ry={3.4} fill="#8fac72" />
      <ellipse cx={1} cy={-24.5} rx={4.5} ry={2.8} fill="#87a469" opacity={0.9} />
      {/* touffes de bord, pour casser la silhouette trop ronde */}
      {[0, 1, 2, 3].map((i) => {
        const a = -2.7 + rnd() * 2.6
        return (
          <ellipse
            key={i}
            cx={Math.cos(a) * 13 + 1}
            cy={-19 + Math.sin(a) * 7}
            rx={3.4 + rnd() * 1.6}
            ry={2.2 + rnd()}
            fill={i % 2 ? '#6b8654' : '#5a7548'}
          />
        )
      })}
      {/* bandelettes votives suspendues aux branches, et deux pinakes peints */}
      <path d="M-9,-14.4 l0,4.6 M-1,-12.6 l0,5.2 M7,-14.6 l0,4.6" stroke="#e8e2d2" strokeWidth={1.2} />
      <path d="M-9,-9.8 l0,1.6 M-1,-7.4 l0,1.6 M7,-10 l0,1.6" stroke="#c0563f" strokeWidth={1.2} />
      <g transform="translate(-10.6,-15)">
        <rect x={-2.4} y={0} width={4.8} height={5.6} fill="#c9b696" />
        <rect x={-2.4} y={0} width={4.8} height={1} fill="#e0d3b4" />
        <path d="M-1.2,2 h2.4 M-1.2,3.4 h2.4" stroke="#8a6b3e" strokeWidth={0.6} />
      </g>
    </g>
  )
}

/** autel de pierre : bloc appareillé, corniche claire, dessus taché de cendre */
function Autel({ x = 0, y = 0, larg = 16, cendres = true }: { x?: number; y?: number; larg?: number; cendres?: boolean }) {
  const w = larg
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={w * 0.75} ry={w * 0.22} />
      <OmbreVolume w={w} h={11} o={0.15} />
      <path d={`M${w / 2},0 L${w / 2 + 4},-1.8 L${w / 2 + 4},-9.8 L${w / 2},-8 Z`} fill="url(#a-pierre-o)" />
      <MurPierre x={-w / 2} y={-8} w={w} h={8} seed={7} />
      {/* corniche débordante, dessus clair, ombre sous le débord */}
      <rect x={-w / 2 - 1.6} y={-10.4} width={w + 3.2} height={2.6} fill={PAL.pierreLit} />
      <rect x={-w / 2 - 1.6} y={-8} width={w + 3.2} height={0.9} fill={PAL.ombrePortee} opacity={0.25} />
      {cendres && (
        <>
          <ellipse cx={0} cy={-10.2} rx={w / 2 - 1.5} ry={1.6} fill="#8a8170" />
          <ellipse cx={0} cy={-10.4} rx={w / 2 - 2.6} ry={1.1} fill="#3d3428" />
          {/* traînées de cendre sur le flanc : l'autel SERT */}
          <path d={`M${-w * 0.22},-8.2 l-0.6,2.6 M${w * 0.1},-8.2 l0.5,3.2`} stroke="#9a9282" strokeWidth={0.8} opacity={0.6} />
        </>
      )}
    </g>
  )
}

/** stèle votive, sommet cintré, inscription suggérée */
function Stele({ x, y, h = 12, s = 1 }: { x: number; y: number; h?: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2} cy={1} rx={4.5} ry={1.4} fill={PAL.ombrePortee} opacity={0.15} />
      <path d={`M-2.6,0 L-2.6,${-h} Q0,${-h - 2.6} 2.6,${-h} L2.6,0 Z`} fill="url(#a-pierre-l)" />
      <path d={`M2.6,0 L2.6,${-h}`} stroke={PAL.pierreOmbre} strokeWidth={1} opacity={0.7} />
      <path d={`M-1.2,${-h + 3} h2.4 M-1.2,${-h + 5} h2.4 M-1.2,${-h + 7} h1.6`} stroke={PAL.pierreOmbre} strokeWidth={0.6} opacity={0.8} />
    </g>
  )
}

/**
 * Trépied votif de bronze - l'offrande grecque par excellence. Trois pieds
 * grêles, une vasque, deux anses hautes. Il dit « sanctuaire » à lui seul.
 */
function Trepied({ x, y, s = 1, or = false }: { x: number; y: number; s?: number; or?: boolean }) {
  const bronze = or ? PAL.or : '#a07a34'
  const clair = or ? '#eed693' : '#c9a441'
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2} cy={1} rx={5} ry={1.6} fill={PAL.ombrePortee} opacity={0.17} />
      {/* trois pieds, celui du milieu vu de face */}
      <path d="M-3.6,0 L-2,-9 M3.6,0 L2,-9 M0,0.6 L0,-9" stroke={bronze} strokeWidth={1.3} />
      <path d="M-3.6,0 L-2.6,-9" stroke={clair} strokeWidth={0.6} />
      {/* vasque : lèvre claire, panse en demi-teinte, dessous ombré */}
      <path d="M-5,-9 L5,-9 L3.4,-13.6 L-3.4,-13.6 Z" fill={bronze} />
      <path d="M-5,-9 L-1.4,-9 L-2.6,-13.6 L-3.4,-13.6 Z" fill={clair} />
      <ellipse cx={0} cy={-13.6} rx={3.6} ry={1.2} fill={clair} />
      <ellipse cx={0} cy={-13.8} rx={2.4} ry={0.7} fill="#6e5525" />
      {/* deux anses hautes, la signature du trépied */}
      <path d="M-3.2,-13.4 C-5.4,-17 -3.4,-19.4 -1.4,-18.4" fill="none" stroke={bronze} strokeWidth={1.1} />
      <path d="M3.2,-13.4 C5.4,-17 3.4,-19.4 1.4,-18.4" fill="none" stroke={bronze} strokeWidth={1.1} />
    </g>
  )
}

/** péribole : mur de pierre sèche qui borne le sacré, en arc de cercle */
function Peribole({ rx, ry, y = 0, h = 5, seed = 21 }: { rx: number; ry: number; y?: number; h?: number; seed?: number }) {
  const rnd = alea(seed)
  const pts: string[] = []
  const n = 16
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i * Math.PI) / n
    pts.push(`${(Math.cos(a) * rx).toFixed(1)},${(y + Math.sin(a) * ry).toFixed(1)}`)
  }
  return (
    <g>
      {/* la masse du mur, puis son couronnement clair */}
      <path d={`M${pts.join(' L')}`} fill="none" stroke="#9a9080" strokeWidth={h} strokeLinecap="round" />
      <path d={`M${pts.join(' L')}`} fill="none" stroke={PAL.pierreLit} strokeWidth={h * 0.4} strokeLinecap="round" transform={`translate(0,${-h * 0.32})`} />
      {/* moellons irréguliers posés dessus : la pierre sèche n'est pas lisse */}
      {Array.from({ length: 11 }, (_, i) => {
        const a = Math.PI + ((i + 0.5) * Math.PI) / 11
        const px = Math.cos(a) * rx
        const py = y + Math.sin(a) * ry
        return (
          <ellipse
            key={i}
            cx={px}
            cy={py - h * 0.3}
            rx={2.4 + rnd() * 1.8}
            ry={1.3 + rnd() * 0.8}
            fill={i % 2 ? '#c8bfa8' : '#aca291'}
          />
        )
      })}
    </g>
  )
}

/** vasque lustrale sur pied - on s'y purifie avant d'entrer */
function Perirrhanterion({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={2} cy={1} rx={5.4} ry={1.8} fill={PAL.ombrePortee} opacity={0.17} />
      <path d="M-3.4,0 L-1.6,-8 L1.6,-8 L3.4,0 Z" fill="url(#a-pierre-l)" />
      <path d="M1.4,-8 L3.4,0 L2,0 L0.6,-8 Z" fill={PAL.pierreOmbre} />
      <path d="M-6,-8 L6,-8 L4.4,-11.4 L-4.4,-11.4 Z" fill={PAL.pierreMi} />
      <ellipse cx={0} cy={-11.4} rx={4.6} ry={1.6} fill={PAL.pierreLit} />
      <ellipse cx={0} cy={-11.5} rx={3.2} ry={1} fill="#6f8e94" />
      <ellipse cx={-0.8} cy={-11.8} rx={1.6} ry={0.5} fill="#a8c6c6" opacity={0.8} />
    </g>
  )
}

/** bucrane sur poteau : le crâne du bœuf sacrifié, cloué face au chemin */
function Bucrane({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={1.6} cy={0.8} rx={3} ry={1.1} fill={PAL.ombrePortee} opacity={0.16} />
      <path d="M-1,0 L-0.6,-13 L0.6,-13 L1,0 Z" fill={PAL.boisMi} />
      <path d="M-1,0 L-0.6,-13 L0,-13 L-0.2,0 Z" fill={PAL.boisLit} />
      {/* le crâne : os clair, orbites dans l'ombre, cornes recourbées */}
      <path d="M-3,-13.4 Q0,-15.6 3,-13.4 L2,-18.6 Q0,-19.8 -2,-18.6 Z" fill="#e4dcc6" />
      <path d="M-3,-13.4 Q0,-15.6 3,-13.4 L2.4,-15 Q0,-16.6 -2.4,-15 Z" fill="#cdc4ac" />
      <ellipse cx={-1.3} cy={-17.2} rx={0.8} ry={1} fill="#6b6250" />
      <ellipse cx={1.3} cy={-17.2} rx={0.8} ry={1} fill="#6b6250" />
      <path d="M-2,-18.6 C-4.6,-19.8 -5.4,-17.6 -4.4,-16.4" fill="none" stroke="#d8cdae" strokeWidth={1.2} />
      <path d="M2,-18.6 C4.6,-19.8 5.4,-17.6 4.4,-16.4" fill="none" stroke="#c4b99a" strokeWidth={1.2} />
    </g>
  )
}

/** trésor : petite bâtisse votive à fronton, où les cités déposent leurs offrandes */
function Tresor({ x, y, w = 20, h = 13 }: { x: number; y: number; w?: number; h?: number }) {
  const p = w * 0.24
  return (
    <g transform={`translate(${x},${y})`}>
      <AOBase rx={w * 0.62} ry={w * 0.2} cy={1.4} />
      <OmbreVolume w={w} h={h + 8} o={0.15} />
      {/* corps : face sud en demi-teinte, retour est ombré */}
      <rect x={-w / 2} y={-h} width={w} height={h} fill="url(#a-stuc-l)" />
      <path d={`M${w / 2},0 L${w / 2 + p},${-p * 0.42} L${w / 2 + p},${-h - p * 0.42} L${w / 2},${-h} Z`} fill="url(#a-stuc-o)" />
      <rect x={-2.4} y={-h + 2} width={4.8} height={h - 2} fill="#3a2c1c" />
      {/* deux colonnettes in antis */}
      <Colonne3D x={-w * 0.3} h={h - 1} larg={3} />
      <Colonne3D x={w * 0.3} h={h - 1} larg={3} />
      {/* entablement, fronton et pans de tuiles */}
      <rect x={-w / 2 - 1.6} y={-h - 3} width={w + 3.2} height={3} fill={PAL.pierreLit} />
      <rect x={-w / 2 - 1.6} y={-h} width={w + 3.2} height={0.9} fill={PAL.ombrePortee} opacity={0.2} />
      <path d={`M${-w / 2 - 2},${-h - 3} L0,${-h - 3 - w * 0.19} L${w / 2 + 2},${-h - 3} Z`} fill={PAL.marbreLit} />
      <path d={`M${-w / 2 + 2},${-h - 4} L0,${-h - 4 - w * 0.14} L${w / 2 - 2},${-h - 4} Z`} fill={PAL.marbreOmbre} />
      <path
        d={`M${-w / 2 - 2},${-h - 3} L0,${-h - 3 - w * 0.19} L${p},${-h - 3 - w * 0.19 - p * 0.42} L${-w / 2 - 2 + p},${-h - 3 - p * 0.42} Z`}
        fill="url(#a-toit-l)"
      />
      <path d={`M0,${-h - 3 - w * 0.19} L${w / 2 + 2},${-h - 3} L${w / 2 + 2 + p},${-h - 3 - p * 0.42} L${p},${-h - 3 - w * 0.19 - p * 0.42} Z`} fill="url(#a-toit-o)" />
    </g>
  )
}

// ── Le corps du temple ───────────────────────────────────────────────────────

/**
 * Colonne dorique un peu plus riche que `Colonne3D` : galbe, cannelures à
 * arêtes, échine bombée et abaque. Réservée au temple - c'est son ordre.
 */
function ColonneDorique({ x, h, larg = 5.6, or = false }: { x: number; h: number; larg?: number; or?: boolean }) {
  const w = larg
  const hf = h - 3.4
  return (
    <g>
      {/* fût : léger galbe (plus étroit en haut), dégradé cylindrique */}
      <path d={`M${x - w / 2},0 L${x - w * 0.42},${-hf} L${x + w * 0.42},${-hf} L${x + w / 2},0 Z`} fill="url(#a-cyl)" />
      {/* cannelures : arête claire à gauche du creux, ombre à droite */}
      {[-0.3, -0.1, 0.12, 0.32].map((f) => (
        <g key={f}>
          <line x1={x + w * f} y1={-hf + 1} x2={x + w * f * 0.86} y2={-1} stroke="#f2ecdc" strokeWidth={0.45} opacity={0.5} />
          <line x1={x + w * f + 0.7} y1={-hf + 1} x2={x + w * f * 0.86 + 0.7} y2={-1} stroke="#8f8368" strokeWidth={0.5} opacity={0.55} />
        </g>
      ))}
      {/* trois anneaux au sommet du fût, sous le chapiteau */}
      <line x1={x - w * 0.42} y1={-hf + 1.2} x2={x + w * 0.42} y2={-hf + 1.2} stroke="#8f8368" strokeWidth={0.5} opacity={0.7} />
      {/* échine bombée puis abaque, dessous dans l'ombre */}
      <path d={`M${x - w * 0.42},${-hf} Q${x - w * 0.7},${-hf - 1.8} ${x - w * 0.74},${-hf - 2.6} L${x + w * 0.74},${-hf - 2.6} Q${x + w * 0.7},${-hf - 1.8} ${x + w * 0.42},${-hf} Z`} fill={or ? '#c9a441' : PAL.marbreOmbre} />
      <path d={`M${x - w * 0.42},${-hf} Q${x - w * 0.7},${-hf - 1.8} ${x - w * 0.74},${-hf - 2.6} L${x - w * 0.2},${-hf - 2.6} Q${x - w * 0.3},${-hf - 1.4} ${x - w * 0.1},${-hf} Z`} fill={or ? '#eed693' : PAL.marbreLit} />
      <rect x={x - w * 0.86} y={-hf - 3.4} width={w * 1.72} height={2.4} fill={or ? PAL.or : PAL.marbreLit} />
      <rect x={x - w * 0.86} y={-hf - 3.4} width={w * 1.72} height={0.8} fill={or ? '#f2dda4' : '#fbf7ec'} />
    </g>
  )
}

/** crépidoma : degrés du temple, face avant en demi-teinte, dessus éclairé */
function Degres({ w, marches = 3, prof = 0 }: { w: number; marches?: number; prof?: number }) {
  /*
   * ORDRE DE PEINTURE : du degré le plus BAS au plus haut. L'inverse - qui semble
   * naturel - fait que le dessus de chaque marche recouvre le nez de celle du
   * dessus : les trois degrés fondaient en une seule dalle pâle et le temple
   * paraissait posé sur un tapis.
   */
  const rangs = []
  for (let i = 0; i < marches; i++) {
    const mw = w + (marches - i - 1) * 7
    const y = -i * 2.6
    rangs.push(
      <g key={i}>
        {/*
          Le retour de flanc du degré : un PARALLÉLOGRAMME qui fuit vers le
          nord-est du même vecteur (prof, -prof×0,42) que tout le reste du
          bâtiment. Une première version décalait la hauteur en même temps que la
          profondeur et produisait un éclat diagonal - la marche paraissait
          tranchée en biseau.
        */}
        <path
          d={`M${mw / 2},${y} L${mw / 2 + prof},${y - prof * 0.42} L${mw / 2 + prof},${y - prof * 0.42 - 2.6} L${mw / 2},${y - 2.6} Z`}
          fill="url(#a-pierre-o)"
        />
        {/* le dessus de la marche, qui fuit lui aussi : c'est lui qui fait le sol */}
        <path
          d={`M${-mw / 2},${y - 2.6} L${mw / 2},${y - 2.6} L${mw / 2 + prof},${y - 2.6 - prof * 0.42} L${-mw / 2 + prof},${y - 2.6 - prof * 0.42} Z`}
          fill={i % 2 ? '#d5cdb8' : '#dcd4bf'}
        />
        {/* la contremarche, en demi-teinte, et son nez éclairé : c'est ce qui compte */}
        {/*
          Les valeurs faisaient tout : contremarche et nez se tenaient à trois
          points d'écart, et les trois degrés se fondaient en une dalle unie. Le
          nez est maintenant franchement clair, la contremarche franchement en
          demi-teinte, et une ombre se glisse au pied de chacune.
        */}
        <rect x={-mw / 2} y={y - 2.6} width={mw} height={2.6} fill={i % 2 ? '#aaa08a' : '#b6ac96'} />
        <rect x={-mw / 2} y={y - 2.6} width={mw} height={1.1} fill="#f4eee0" />
        <rect x={-mw / 2} y={y - 1.5} width={mw} height={0.6} fill={PAL.ombrePortee} opacity={0.2} />
      </g>,
    )
  }
  return <g>{rangs}</g>
}

/**
 * Corps du temple périptère. La nouveauté tient en un mot : le FLANC. Une
 * seconde colonnade fuit vers le nord-est, le toit se prolonge au-dessus d'elle,
 * et le bâtiment cesse d'être un décor de théâtre pour devenir un volume.
 */
function CorpsTemple({
  w,
  hCol,
  nCols,
  nFlanc,
  marbre,
  or,
}: {
  w: number
  hCol: number
  nCols: number
  /** colonnes visibles sur le flanc - 0 pour un naïskos sans péristyle */
  nFlanc: number
  marbre?: boolean
  or?: boolean
}) {
  const rnd = alea(nCols * 17)
  const pas = (w - 11) / (nCols - 1)
  const cols = Array.from({ length: nCols }, (_, i) => -w / 2 + 5.5 + i * pas)
  /** fuite du flanc : dx vers l'est, dy vers le haut (vue 3/4) */
  const prof = nFlanc > 0 ? w * 0.34 : w * 0.16
  const dyp = prof * 0.42
  const gToit = w * 0.15
  const yEnt = -hCol - 2
  const cella = marbre ? '#b8ad94' : '#a99d82'
  const larg = marbre ? 6 : 5.4

  return (
    <g>
      {/*
        ── LE FLANC ──
        Toute la profondeur du bâtiment s'exprime par UN SEUL vecteur de fuite :
        `(prof, -dyp)`, comme partout ailleurs sur la carte. Tout ce qui appartient
        au flanc est donc un parallélogramme construit sur ce vecteur, et les
        colonnes latérales gardent une hauteur CONSTANTE - seule leur base remonte.
        C'est ce qui manquait : une version où la hauteur diminuait en même temps
        que la profondeur décrochait les chapiteaux de leur entablement.

        Ordre : mur de cella (fond), colonnes, puis entablement et toit qui leur
        passent devant et coiffent leurs chapiteaux.
      */}
      {nFlanc > 0 && (
        <g>
          {/* mur de la cella, qui fuit vers le nord-est, dans l'ombre */}
          <path
            d={`M${w / 2 - 6},0 L${w / 2 - 6 + prof},${-dyp} L${w / 2 - 6 + prof},${yEnt - dyp} L${w / 2 - 6},${yEnt} Z`}
            fill={marbre ? '#a89c81' : '#988c72'}
          />
          {/* ombre du débord de corniche sur ce mur */}
          <path
            d={`M${w / 2 - 6},${yEnt} L${w / 2 - 6 + prof},${yEnt - dyp} L${w / 2 - 6 + prof},${yEnt - dyp + 4} L${w / 2 - 6},${yEnt + 4} Z`}
            fill={PAL.ombrePortee}
            opacity={0.18}
          />
          {/* le sol du portique latéral, entre le mur et les colonnes */}
          <path
            d={`M${w / 2 - 6},0 L${w / 2 - 6 + prof},${-dyp} L${w / 2 - 2 + prof},${-dyp + 1.6} L${w / 2 - 2},1.6 Z`}
            fill="#c4bba6"
          />
          {/* colonnes du flanc : hauteur constante, base qui remonte avec la fuite */}
          {Array.from({ length: nFlanc }, (_, i) => {
            const f = (i + 1) / (nFlanc + 0.5)
            const cx = w / 2 - 3 + prof * f
            const cy = -dyp * f
            return (
              <g key={i} transform={`translate(0,${cy})`}>
                <path
                  d={`M${cx - larg * 0.5},-0.4 L${cx + larg * 0.6},-0.4 L${cx + larg * 1.5},1.8 L${cx + larg * 0.4},1.8 Z`}
                  fill={PAL.ombrePortee}
                  opacity={0.12}
                />
                <ColonneDorique x={cx} h={hCol} larg={larg * 0.94} />
              </g>
            )
          })}
          {/* entablement du flanc : architrave, frise, corniche - tous parallèles */}
          <path
            d={`M${w / 2 - 2},${yEnt - 3.4} L${w / 2 - 2 + prof},${yEnt - 3.4 - dyp} L${w / 2 - 2 + prof},${yEnt + 0.2 - dyp} L${w / 2 - 2},${yEnt + 0.2} Z`}
            fill={marbre ? '#ded6c2' : '#c9c0aa'}
          />
          <path
            d={`M${w / 2 - 2},${yEnt - 7} L${w / 2 - 2 + prof},${yEnt - 7 - dyp} L${w / 2 - 2 + prof},${yEnt - 3.4 - dyp} L${w / 2 - 2},${yEnt - 3.4} Z`}
            fill={marbre ? '#cdc4ad' : '#bab19b'}
          />
          {/* triglyphes du flanc, un par entrecolonnement */}
          {Array.from({ length: nFlanc }, (_, i) => {
            const f = (i + 0.5) / (nFlanc + 0.5)
            const tx = w / 2 - 2 + prof * f
            const ty = yEnt - 6.6 - dyp * f
            return <rect key={i} x={tx} y={ty} width={2.8} height={2.9} fill={marbre ? '#a89c81' : '#988c72'} />
          })}
          <path
            d={`M${w / 2 - 3.4},${yEnt - 9.4} L${w / 2 - 3.4 + prof},${yEnt - 9.4 - dyp} L${w / 2 - 3.4 + prof},${yEnt - 6.8 - dyp} L${w / 2 - 3.4},${yEnt - 6.8} Z`}
            fill={marbre ? '#e6dfcd' : '#d4cbb6'}
          />
          {/* pan de toit latéral : il monte du bord de la corniche vers le faîte */}
          <path
            d={`M${w / 2 - 3.4},${yEnt - 9.4} L${w / 2 - 3.4 + prof},${yEnt - 9.4 - dyp} L${prof},${yEnt - 9.4 - gToit - dyp} L${0},${yEnt - 9.4 - gToit} Z`}
            fill="url(#a-toit-o)"
          />
          {[0.34, 0.68].map((f) => (
            <line
              key={f}
              x1={w / 2 - 3.4 - (w / 2 - 3.4) * f}
              y1={yEnt - 9.4 - gToit * f}
              x2={w / 2 - 3.4 + prof - (w / 2 - 3.4) * f}
              y2={yEnt - 9.4 - dyp - gToit * f}
              stroke="#5e3520"
              strokeWidth={0.9}
              opacity={0.38}
              strokeDasharray="4 1.4"
            />
          ))}
          {/* le faîtage, qui fuit lui aussi : c'est l'arête haute du bâtiment */}
          <line
            x1={0}
            y1={yEnt - 9.4 - gToit}
            x2={prof}
            y2={yEnt - 9.4 - gToit - dyp}
            stroke={PAL.toitArete}
            strokeWidth={1.6}
          />
          {/* antéfixes : tuiles de rive dressées le long de l'égout latéral */}
          {Array.from({ length: nFlanc + 1 }, (_, i) => {
            const f = (i + 0.5) / (nFlanc + 1)
            const ax = w / 2 - 3.4 + prof * f
            const ay = yEnt - 9.4 - dyp * f
            return <path key={i} d={`M${ax - 1.3},${ay} q1.3,-2.6 2.6,0 Z`} fill={or ? PAL.or : PAL.toitArete} />
          })}
        </g>
      )}

      {/* ── la façade ── */}
      {/* cella dans la pénombre, derrière la colonnade */}
      <rect x={-w / 2 + 3} y={yEnt} width={w - 6} height={hCol + 2} fill={cella} />
      <rect x={-w / 2 + 3} y={yEnt} width={w - 6} height={hCol + 2} fill="url(#a-ao)" opacity={0.9} />
      {/* les antes : les retours de mur qui encadrent la porte */}
      <rect x={-w / 2 + 3} y={yEnt} width={3.4} height={hCol + 2} fill={marbre ? '#c6bba1' : '#b3a78c'} />
      <rect x={w / 2 - 6.4} y={yEnt} width={3.4} height={hCol + 2} fill={marbre ? '#9e9378' : '#8e8369'} />

      {/* porte de la cella, et ce qu'on devine derrière */}
      <rect x={-6.6} y={-hCol + 2.5} width={13.2} height={hCol - 2.5} fill="#241a10" />
      <rect x={-6.6} y={-hCol + 2.5} width={13.2} height={1.4} fill="#0f0a06" />
      {/* le sol de la cella, éclairé de biais par la porte */}
      <path d="M-6.6,0 L6.6,0 L4.4,-2.2 L-4.4,-2.2 Z" fill="#4a4034" />
      {/* chambranle de pierre, linteau clair */}
      <path d={`M-8.2,${-hCol + 2.5} L-6.6,${-hCol + 2.5} L-6.6,0 L-8.2,0 Z`} fill={PAL.pierreLit} />
      <path d={`M6.6,${-hCol + 2.5} L8.2,${-hCol + 2.5} L8.2,0 L6.6,0 Z`} fill={PAL.pierreOmbre} />
      <rect x={-8.6} y={-hCol + 1.2} width={17.2} height={1.6} fill={marbre ? PAL.marbreLit : PAL.pierreLit} />
      {or ? (
        <>
          {/*
            La statue chryséléphantine, DEVINÉE dans la pénombre de la cella. Une
            première version la dessinait haute comme la porte et large comme un
            fût : elle se lisait comme une colonne dorée plantée dans l'entrée.
            Elle tient maintenant dans l'embrasure, socle au seuil, tête sous le
            linteau - et c'est la lueur autour d'elle qui attire l'œil.
          */}
          <g transform={`translate(0,${-0.4})`}>
            {/* halo de lampes, qui respire */}
            <ellipse cx={0} cy={-6.6} rx={4.6} ry={6.4} fill={PAL.or} opacity={0.16}>
              <Anim attributeName="opacity" values="0.16;0.3;0.16" dur="4.2s" repeatCount="indefinite" />
            </ellipse>
            {/* socle */}
            <rect x={-2.6} y={-1.6} width={5.2} height={1.6} fill="#6e5525" />
            {/* corps drapé : or à gauche pris par la lueur, bronze à droite */}
            <path d="M-2,-1.6 L-1.6,-9 Q0,-10.2 1.6,-9 L2,-1.6 Z" fill="#8a6b2e" />
            <path d="M-2,-1.6 L-1.6,-9 Q-0.9,-9.7 -0.4,-9.3 L-0.4,-1.6 Z" fill={PAL.or} />
            {/* bras tendu portant la Victoire, et la lance de l'autre main */}
            <path d="M1.5,-8 l2.2,0.6" stroke="#8a6b2e" strokeWidth={0.8} />
            <path d="M-1.7,-8.4 l-0.6,-4.2" stroke="#9c7b3e" strokeWidth={0.7} />
            {/* tête et casque à cimier */}
            <circle cx={0} cy={-10.2} r={1.4} fill="#f0dbb0" />
            <path d="M-1.5,-11 q1.5,-1.9 3,0 Z" fill={PAL.or} />
            <path d="M0,-12.7 l0,-1.4" stroke={PAL.or} strokeWidth={0.8} />
          </g>
        </>
      ) : marbre ? null : (
        /* aux premiers âges, deux battants de bois cloutés de bronze */
        <>
          <path d={`M-6.2,${-hCol + 3.4} L-0.4,${-hCol + 3.4} L-0.4,-0.6 L-6.2,-0.6 Z`} fill="#4a3620" />
          <path d={`M0.4,${-hCol + 3.4} L6.2,${-hCol + 3.4} L6.2,-0.6 L0.4,-0.6 Z`} fill="#3d2c1a" />
          {[0.25, 0.5, 0.75].map((f) => (
            <g key={f}>
              <circle cx={-3.3} cy={-hCol + 3.4 + (hCol - 4) * f} r={0.7} fill="#9c7b3e" />
              <circle cx={3.3} cy={-hCol + 3.4 + (hCol - 4) * f} r={0.7} fill="#846734" />
            </g>
          ))}
        </>
      )}

      {/* ombres des colonnes projetées sur le sol du portique */}
      {cols.map((x) => (
        <path
          key={`o${x}`}
          d={`M${x - 2},-0.5 L${x + 2.6},-0.5 L${x + 7},2.2 L${x + 2},2.2 Z`}
          fill={PAL.ombrePortee}
          opacity={0.13}
          filter="url(#a-flou1)"
        />
      ))}
      {/* la colonnade de façade */}
      {/*
        Les chapiteaux restent de MARBRE, même au dernier âge. Dorés, leurs abaques
        se touchaient bord à bord et formaient un ruban d'or continu en travers de
        la façade - on ne lisait plus des colonnes mais une frise. L'or est réservé
        à ce qui doit briller seul : acrotères, boucliers, statue.
      */}
      {cols.map((x) => (
        <ColonneDorique key={x} x={x} h={hCol} larg={larg} />
      ))}

      {/* entablement : architrave + frise à triglyphes et métopes + corniche */}
      <rect x={-w / 2 - 2} y={yEnt - 3.4} width={w + 4} height={3.6} fill={marbre ? 'url(#a-marbre-l)' : 'url(#a-pierre-l)'} />
      {/* les gouttes sous l'architrave : le détail qui dit « dorique » */}
      {cols.map((x, i) =>
        i === cols.length - 1 ? null : (
          <path
            key={`g${i}`}
            d={`M${x + pas / 2 - 1.4},${yEnt - 0.2} h2.8`}
            stroke={marbre ? '#c6bba1' : '#a89d82'}
            strokeWidth={1}
            opacity={0.8}
          />
        ),
      )}
      <rect x={-w / 2 - 2} y={yEnt - 7} width={w + 4} height={3.6} fill={marbre ? '#e9e2cf' : '#d3cab5'} />
      {cols.map((x, i) =>
        i === cols.length - 1 ? null : (
          <g key={`t${i}`}>
            {/* métope : le panneau peint entre deux triglyphes */}
            <rect
              x={x + pas / 2 - 1.7 + 1.8}
              y={yEnt - 6.6}
              width={pas - 5.2}
              height={2.9}
              fill={marbre ? '#c9b07e' : '#b8a078'}
              opacity={0.55}
            />
            {/* triglyphe : trois canaux verticaux */}
            <rect x={x + pas / 2 - 1.7} y={yEnt - 6.6} width={3.4} height={2.9} fill={marbre ? '#b8ad94' : '#a89d82'} />
            <path
              d={`M${x + pas / 2 - 0.9},${yEnt - 6.4} v2.4 M${x + pas / 2 + 0.5},${yEnt - 6.4} v2.4`}
              stroke={marbre ? '#8f8368' : '#847860'}
              strokeWidth={0.7}
            />
          </g>
        ),
      )}
      {/* corniche débordante + son ombre sur la frise */}
      <rect x={-w / 2 - 3.4} y={yEnt - 9.4} width={w + 6.8} height={2.6} fill={marbre ? '#f4efe0' : '#e2dac6'} />
      <rect x={-w / 2 - 2} y={yEnt - 7} width={w + 4} height={1} fill={PAL.ombrePortee} opacity={0.22} />

      {/* boucliers ex-voto pendus à l'architrave - butin consacré au dieu */}
      {or &&
        cols.slice(0, -1).map((x, i) =>
          i % 2 === 0 ? (
            <g key={`b${i}`} transform={`translate(${x + pas / 2},${yEnt - 1.7})`}>
              {/* le bouclier pend et porte son ombre sur l'architrave */}
              <ellipse cx={0.8} cy={0.4} rx={2.1} ry={2} fill={PAL.ombrePortee} opacity={0.14} />
              <circle r={2.1} fill="#8a6b2e" />
              <circle r={1.7} fill={PAL.or} />
              <circle r={0.9} fill="#e8c97e" />
              <circle cx={-0.4} cy={-0.5} r={0.4} fill="#f6ead0" />
            </g>
          ) : null,
        )}

      {/*
        Le grand pan de toit OUEST. Un temple a son faîte perpendiculaire à la
        façade - c'est pour cela que le fronton est sur le petit côté. Les deux
        longs pans fuient donc vers le fond du même vecteur que tout le reste, et
        celui-ci était resté PLAT : le toit se lisait comme deux dalles rouges
        posées de travers, avec une couture au milieu.
      */}
      <path
        d={`M${-w / 2 - 3},${yEnt - 9.4} L0,${yEnt - 9.4 - gToit} L${prof},${yEnt - 9.4 - gToit - dyp} L${-w / 2 - 3 + prof},${yEnt - 9.4 - dyp} Z`}
        fill="url(#a-toit-l)"
      />
      {/* rangs de tuiles du pan ouest, parallèles au faîte */}
      {[0.34, 0.68].map((f) => (
        <line
          key={f}
          x1={-w / 2 - 3 + (w / 2 + 3) * f}
          y1={yEnt - 9.4 - gToit * f}
          x2={-w / 2 - 3 + prof + (w / 2 + 3) * f}
          y2={yEnt - 9.4 - dyp - gToit * f}
          stroke={PAL.toitOmbre}
          strokeWidth={0.9}
          opacity={0.42}
          strokeDasharray="4 1.4"
        />
      ))}
      {/* antéfixes de l'égout ouest */}
      {Array.from({ length: nFlanc + 1 }, (_, i) => {
        const f = (i + 0.5) / (nFlanc + 1)
        const ax = -w / 2 - 3 + prof * f
        const ay = yEnt - 9.4 - dyp * f
        return <path key={`ao${i}`} d={`M${ax - 1.3},${ay} q1.3,-2.6 2.6,0 Z`} fill={or ? PAL.or : PAL.toitArete} />
      })}
      <line
        x1={0}
        y1={yEnt - 9.4 - gToit}
        x2={prof}
        y2={yEnt - 9.4 - gToit - dyp}
        stroke={PAL.toitArete}
        strokeWidth={1.8}
      />

      {/* fronton : rampants clairs, tympan en retrait, figures sculptées */}
      <path d={`M${-w / 2 - 4},${yEnt - 9.4} L0,${yEnt - 9.4 - gToit} L${w / 2 + 4},${yEnt - 9.4} Z`} fill={marbre ? 'url(#a-marbre-l)' : 'url(#a-pierre-l)'} />
      <path d={`M${-w / 2 + 3},${yEnt - 10.6} L0,${yEnt - 10.2 - gToit * 0.82} L${w / 2 - 3},${yEnt - 10.6} Z`} fill={marbre ? '#cdc3aa' : '#b5aa8e'} />
      {/* fond peint du tympan, bleu d'Égée - les Grecs peignaient leurs temples */}
      {(marbre || nCols >= 4) && (
        <path d={`M${-w / 2 + 4.4},${yEnt - 11.2} L0,${yEnt - 10.8 - gToit * 0.74} L${w / 2 - 4.4},${yEnt - 11.2} Z`} fill="#4a6b7d" opacity={0.42} />
      )}
      {Array.from({ length: Math.min(5, nCols - 1) }, (_, i) => {
        const n = Math.min(5, nCols - 1)
        const t = (i + 1) / (n + 1)
        const fx = -w / 2 + 6 + t * (w - 12)
        const fh = gToit * 0.62 * (1 - Math.abs(t - 0.5) * 1.7) + 2
        const dore = or && rnd() > 0.45
        return (
          <g key={i}>
            {/* corps et tête : une figure, non un fuseau */}
            <path
              d={`M${fx - 1.8},${yEnt - 11} L${fx - 1.3},${yEnt - 11 - fh * 0.72} L${fx + 1.3},${yEnt - 11 - fh * 0.72} L${fx + 1.8},${yEnt - 11} Z`}
              fill={dore ? '#c9a441' : '#6e6450'}
            />
            <circle cx={fx} cy={yEnt - 11.6 - fh * 0.82} r={Math.max(0.8, fh * 0.13)} fill={dore ? '#e8c97e' : '#7d7360'} />
            {/* un bras tendu, qui donne le geste */}
            <path
              d={`M${fx + 1},${yEnt - 11 - fh * 0.6} l${1.8 + i * 0.2},${-1.4}`}
              stroke={dore ? '#c9a441' : '#6e6450'}
              strokeWidth={0.9}
            />
          </g>
        )
      })}
      {/* rampants + acrotères */}
      <path d={`M${-w / 2 - 4},${yEnt - 9.4} L0,${yEnt - 9.4 - gToit}`} stroke={marbre ? '#fbf7ec' : '#efe9d8'} strokeWidth={1.5} />
      <path d={`M${w / 2 + 4},${yEnt - 9.4} L0,${yEnt - 9.4 - gToit}`} stroke={marbre ? '#d8d0bb' : '#c4baa2'} strokeWidth={1.2} />
      {/* acrotère central : palmette, dorée au dernier âge */}
      <g transform={`translate(0,${yEnt - 9 - gToit})`}>
        {/* palmette : un cœur plein et deux volutes - pas trois traits en fourche */}
        <path d="M-3.4,0 q3.4,-6.2 6.8,0 Z" fill={or ? PAL.or : marbre ? '#f4efe0' : '#e2dac6'} />
        <path d="M-1.2,-0.4 q1.2,-3.8 2.4,0 Z" fill={or ? '#e8c97e' : PAL.marbreLit} />
        <path d="M-3.2,-0.6 q-1.4,-1.8 0.2,-2.6" fill="none" stroke={or ? '#8a6b2e' : PAL.pierreOmbre} strokeWidth={0.7} />
        <path d="M3.2,-0.6 q1.4,-1.8 -0.2,-2.6" fill="none" stroke={or ? '#8a6b2e' : PAL.pierreOmbre} strokeWidth={0.7} />
      </g>
      <path d={`M${-w / 2 - 6},${yEnt - 9.4} q2,-3.4 4,0 Z`} fill={or ? PAL.or : marbre ? '#f4efe0' : '#e2dac6'} />
      <path d={`M${w / 2 + 2},${yEnt - 9.4} q2,-3.4 4,0 Z`} fill={or ? PAL.or : marbre ? '#f4efe0' : '#e2dac6'} />
    </g>
  )
}

// ── Les quatre âges ──────────────────────────────────────────────────────────

/** 1 · le bois sacré : le dieu habite l'arbre, il n'y a pas encore de maison */
function BoisSacre() {
  return (
    <g>
      {/* la clairière : terre battue en deux tons, plus claire là où l'on marche */}
      <ellipse cx={0} cy={2} rx={46} ry={14.5} fill="#b9a878" opacity={0.75} />
      <ellipse cx={-6} cy={1} rx={28} ry={9} fill="#c8b88a" opacity={0.85} />
      {/* le péribole borne le sacré : au-delà, on est dehors */}
      <Peribole rx={46} ry={13} y={-1} h={4.6} seed={21} />
      {/* le chemin d'accès, dallé de pierres plates */}
      {[
        [-38, 9],
        [-27, 11],
        [-15, 12.4],
        [-3, 13],
      ].map(([px, py], i) => (
        <ellipse key={i} cx={px} cy={py} rx={4.4 - i * 0.2} ry={1.7} fill="#cdc4ac" opacity={0.8} />
      ))}

      <CheneSacre x={22} y={-1} s={1.55} seed={3} />
      <CheneSacre x={-34} y={-3} s={0.82} seed={9} />
      <Autel x={-8} y={0} larg={19} />
      <Feu x={-8} y={-13} r={2.8} />
      <Fumee x={-8} y={-16} />
      {/* les offrandes s'accumulent : c'est ce qui fait un sanctuaire */}
      <Trepied x={9} y={1} s={0.85} />
      <Bucrane x={-24} y={0} s={0.9} />
      <Stele x={-19} y={2} h={11} s={0.9} />
      <Perirrhanterion x={-30} y={7} s={0.8} />
      <Amphore x={3} y={4} s={0.85} />
      <Amphore x={7.5} y={6} c="#8c552f" s={0.75} />
      <Buisson x={-42} y={7} s={0.9} />
      <Buisson x={38} y={9} s={0.8} />
      <path d="M-16,8 q3,1.6 6,0 M14,9 q3,1.6 6,0" stroke="#8f8a55" strokeWidth={1} fill="none" opacity={0.6} />
    </g>
  )
}

/**
 * 2 · le naïskos : distyle in antis. Socle de pierre, murs de brique crue à pans
 * de bois, rampe d'accès plutôt qu'un escalier - c'est l'archaïsme, et cela doit
 * se voir : le temple de pierre viendra au niveau suivant.
 */
function Naiskos() {
  const w = 48
  const hCol = 16
  const prof = 12
  const dyp = prof * 0.42
  return (
    <g>
      <ellipse cx={0} cy={4} rx={50} ry={16} fill="#c2b389" opacity={0.65} />
      <ellipse cx={2} cy={3} rx={34} ry={11} fill="#cfc09a" opacity={0.7} />
      <Peribole rx={50} ry={14} y={1} h={4.2} seed={33} />
      <AOBase rx={w * 0.72} ry={w * 0.19} cy={3} />
      <OmbreVolume w={w + 12} h={hCol + 20} y={2} o={0.17} />

      <g transform="translate(0,-3)">
        {/* socle de pierre : deux assises, le retour de flanc dans l'ombre */}
        <path d={`M${w / 2 + 3},0 L${w / 2 + 3 + prof},${-dyp} L${w / 2 + 3 + prof},${-dyp - 5.4} L${w / 2 + 3},-5.4 Z`} fill="url(#a-pierre-o)" />
        <MurPierre x={-w / 2 - 3} y={-5.4} w={w + 6} h={5.4} seed={17} />
        <rect x={-w / 2 - 4.4} y={-6.6} width={w + 8.8} height={1.4} fill={PAL.pierreLit} />

        <g transform="translate(0,-6.6)">
          {/* le flanc : mur de brique crue qui fuit vers le nord-est */}
          <path d={`M${w / 2 - 3},${-hCol - 2} L${w / 2 - 3 + prof},${-hCol - 2 - dyp} L${w / 2 - 3 + prof},${-dyp} L${w / 2 - 3},0 Z`} fill="#a08a63" />
          {/* pans de bois du flanc : poteaux et sablières apparents */}
          {[0.3, 0.62].map((f) => (
            <path
              key={f}
              d={`M${w / 2 - 3 + prof * f},${-dyp * f} L${w / 2 - 3 + prof * f},${-hCol - 2 - dyp * f}`}
              stroke="#7c6340"
              strokeWidth={1.4}
            />
          ))}

          {/* la cella : brique crue enduite, sombre sous le porche */}
          <rect x={-w / 2 + 3} y={-hCol - 2} width={w - 6} height={hCol + 2} fill="#a99d82" />
          <rect x={-w / 2 + 3} y={-hCol - 2} width={w - 6} height={hCol + 2} fill="url(#a-ao)" opacity={0.85} />
          {/* les antes : les retours de mur qui encadrent le porche */}
          <rect x={-w / 2 + 2} y={-hCol - 2} width={5} height={hCol + 2} fill="#b3a78c" />
          <rect x={w / 2 - 7} y={-hCol - 2} width={5} height={hCol + 2} fill="#8e8369" />
          {/* pans de bois de la façade, à la mode archaïque */}
          <path d={`M${-w / 2 + 7},${-hCol - 2} h${w - 14}`} stroke="#8a6b3e" strokeWidth={1.2} opacity={0.7} />

          {/* porte à deux battants, cloutée de bronze */}
          <rect x={-5} y={-hCol + 2.6} width={10} height={hCol - 2.6} fill="#241a10" />
          <path d={`M-4.6,${-hCol + 3.2} L-0.4,${-hCol + 3.2} L-0.4,-0.6 L-4.6,-0.6 Z`} fill="#4a3620" />
          <path d={`M0.4,${-hCol + 3.2} L4.6,${-hCol + 3.2} L4.6,-0.6 L0.4,-0.6 Z`} fill="#3d2c1a" />
          {[0.3, 0.62].map((f) => (
            <g key={f}>
              <circle cx={-2.5} cy={-hCol + 3.2 + (hCol - 4) * f} r={0.7} fill="#9c7b3e" />
              <circle cx={2.5} cy={-hCol + 3.2 + (hCol - 4) * f} r={0.7} fill="#846734" />
            </g>
          ))}
          <rect x={-6.4} y={-hCol + 1.4} width={12.8} height={1.6} fill={PAL.pierreLit} />

          {/* les deux colonnes in antis, de bois tourné : l'ordre n'est pas encore de pierre */}
          {[-11, 11].map((x) => (
            <g key={x}>
              <path d={`M${x - 2},-0.5 L${x + 2.4},-0.5 L${x + 6},2 L${x + 1.8},2 Z`} fill={PAL.ombrePortee} opacity={0.12} filter="url(#a-flou1)" />
              <path d={`M${x - 2.6},0 L${x - 2.1},${-hCol + 2} L${x + 2.1},${-hCol + 2} L${x + 2.6},0 Z`} fill="#a8845d" />
              <path d={`M${x - 2.6},0 L${x - 2.1},${-hCol + 2} L${x - 0.9},${-hCol + 2} L${x - 1.3},0 Z`} fill="#c09a6c" />
              <path d={`M${x + 1.2},0 L${x + 1},${-hCol + 2} L${x + 2.1},${-hCol + 2} L${x + 2.6},0 Z`} fill="#7c6340" />
              {/* chapiteau de bois, large et plat */}
              <rect x={x - 3.6} y={-hCol} width={7.2} height={2} fill="#8a6b3e" />
              <rect x={x - 3.6} y={-hCol} width={7.2} height={0.7} fill="#b08f60" />
            </g>
          ))}

          {/* entablement de bois peint, frise à méandre */}
          <rect x={-w / 2 - 2} y={-hCol - 5.4} width={w + 4} height={3.4} fill="#c9b696" />
          <rect x={-w / 2 - 2} y={-hCol - 2} width={w + 4} height={0.9} fill={PAL.ombrePortee} opacity={0.2} />
          {Array.from({ length: 9 }, (_, i) => {
            const mx = -w / 2 + 2 + (i * (w - 4)) / 8
            return <path key={i} d={`M${mx},${-hCol - 4.8} h3.2 v2 h-1.8`} fill="none" stroke="#b3543f" strokeWidth={0.8} />
          })}
          <rect x={-w / 2 - 3.4} y={-hCol - 7.6} width={w + 6.8} height={2.2} fill="#ddd0b0" />

          {/* toit de terre cuite : le fronton, puis les deux longs pans qui fuient */}
          <path
            d={`M${-w / 2 - 4},${-hCol - 7.6} L0,${-hCol - 16.6} L${prof},${-hCol - 16.6 - dyp} L${-w / 2 - 4 + prof},${-hCol - 7.6 - dyp} Z`}
            fill="url(#a-toit-l)"
          />
          <path
            d={`M${w / 2 + 4},${-hCol - 7.6} L0,${-hCol - 16.6} L${prof},${-hCol - 16.6 - dyp} L${w / 2 + 4 + prof},${-hCol - 7.6 - dyp} Z`}
            fill="url(#a-toit-o)"
          />
          <path d={`M${-w / 2 - 4},${-hCol - 7.6} L0,${-hCol - 16.6} L${w / 2 + 4},${-hCol - 7.6} Z`} fill="#c9b696" />
          <path d={`M${-w / 2 + 2},${-hCol - 8.8} L0,${-hCol - 15.4} L${w / 2 - 2},${-hCol - 8.8} Z`} fill="#b09a76" />
          <path d={`M${-w / 2 - 4},${-hCol - 7.6} L0,${-hCol - 16.6}`} stroke={PAL.toitArete} strokeWidth={1.5} />
          <path d={`M0,${-hCol - 16.6} L${prof},${-hCol - 16.6 - dyp}`} stroke={PAL.toitArete} strokeWidth={1.6} />
          {[-0.66, -0.22, 0.22, 0.66].map((f) => (
            <path key={f} d={`M${(w / 2) * f - 1.4},${-hCol - 7.6} q1.4,-2.8 2.8,0 Z`} fill={PAL.toitArete} />
          ))}
          {/* acrotère de terre cuite peinte */}
          <path d={`M-2.6,${-hCol - 16.2} q2.6,-4.6 5.2,0 Z`} fill="#c9b696" />
        </g>

        {/* la rampe d'accès, à la mode archaïque : pas d'escalier */}
        <path d={`M-13,0 L13,0 L9,11 L-17,11 Z`} fill="#c2b48e" />
        <path d={`M-13,0 L13,0 L12.4,1.6 L-13.6,1.6 Z`} fill="#ddd4b8" />
        <path d={`M13,0 L9,11 L10.6,11 L14,0.4 Z`} fill={PAL.pierreOmbre} opacity={0.6} />
      </g>

      {/* le sanctuaire autour : autel, offrandes, arbre */}
      <g transform="translate(-2,11)">
        <Autel larg={12} />
        <Fumee x={0} y={-13} />
      </g>
      <Trepied x={26} y={9} s={0.85} />
      <Stele x={-34} y={5} h={11} />
      <Perirrhanterion x={-26} y={9} s={0.85} />
      <Amphore x={34} y={11} s={0.85} />
      <OlivierMini x={44} y={7} s={0.9} />
      <Buisson x={-44} y={9} s={0.85} />
    </g>
  )
}

/** 3 et 4 · le temple de pierre, puis celui de marbre et d'or */
function TempleDePierre({ n }: { n: number }) {
  const marbre = n >= 4
  const w = n === 3 ? 66 : 82
  const hCol = n === 3 ? 20 : 25
  const nCols = n === 3 ? 6 : 8
  const nFlanc = n === 3 ? 3 : 4
  const or = n >= 4

  return (
    <g>
      {/* téménos : le parvis dallé, usé au centre par les processions */}
      <ellipse cx={0} cy={5} rx={w / 2 + 40} ry={17.5} fill={marbre ? '#cdc3a4' : '#c2b389'} opacity={0.65} />
      <ellipse cx={2} cy={4} rx={w / 2 + 20} ry={12} fill={marbre ? '#ddd4b8' : '#cfc09a'} opacity={0.7} />
      {/* joints de dalles, en éventail depuis l'entrée */}
      {[-0.7, -0.35, 0, 0.35, 0.7].map((f) => (
        <path
          key={f}
          d={`M${f * (w / 2 + 18)},14 L${f * (w / 2 + 8)},2`}
          stroke="#b0a284"
          strokeWidth={0.8}
          opacity={0.45}
        />
      ))}
      <Peribole rx={w / 2 + 40} ry={15.5} y={2} h={marbre ? 5 : 4.4} seed={41} />
      <AOBase rx={w * 0.7} ry={w * 0.18} cy={3} />
      <OmbreVolume w={w + 14} h={hCol + 20} y={2} o={0.17} />

      <g transform="translate(0,-4)">
        <Degres w={w + 6} marches={3} prof={w * 0.34} />
        {/*
          Le corps se pose sur le SOMMET du crépidoma, pas sur sa première marche.
          Un décalage d'une seule marche et les deux autres passaient derrière le
          bâtiment : le temple semblait posé à même le parvis.
        */}
        <g transform="translate(0,-7.8)">
          <CorpsTemple w={w} hCol={hCol} nCols={nCols} nFlanc={nFlanc} marbre={marbre} or={or} />
        </g>
      </g>

      {/* le grand autel des sacrifices, en avant du parvis - le cœur du culte */}
      <g transform="translate(0,11)">
        <Autel larg={marbre ? 18 : 14} />
        <Feu x={0} y={marbre ? -13 : -12} r={marbre ? 2.8 : 2.2} />
        <Fumee x={0} y={-14} />
      </g>

      {/* les offrandes : trépieds sur colonnettes, stèles, trésors */}
      <Trepied x={-w / 2 - 12} y={7} s={0.95} or={or} />
      <Trepied x={w / 2 + 13} y={9} s={0.9} or={or} />
      <Perirrhanterion x={-w / 2 - 3} y={13} s={0.9} />
      <Stele x={-w / 2 - 24} y={4} h={12} />
      <Amphore x={w / 2 + 4} y={14} s={0.85} />
      <Amphore x={w / 2 + 8} y={16} c="#8c552f" s={0.75} />
      <Tresor x={-w / 2 - 34} y={7} w={20} h={13} />
      <OlivierMini x={w / 2 + 26} y={8} s={0.95} />
      <CheneSacre x={-w / 2 - 47} y={4} s={0.72} seed={15} />

      {n >= 4 && (
        <g>
          {/* second trésor et bois sacré : le sanctuaire est devenu une petite ville */}
          <Tresor x={w / 2 + 38} y={11} w={17} h={11} />
          <Trepied x={-w / 2 - 20} y={12} s={0.8} or />
          <Stele x={w / 2 + 20} y={15} h={10} s={0.9} />
          {/* braseros de bronze aux angles du parvis */}
          {[-w / 2 - 7, w / 2 + 7].map((bx) => (
            <g key={bx} transform={`translate(${bx},17)`}>
              <ellipse cx={1.5} cy={1} rx={4} ry={1.3} fill={PAL.ombrePortee} opacity={0.16} />
              <path d="M-3,-6 L3,-6 L2,-2 L-2,-2 Z" fill="#8a6b2e" />
              <path d="M-3,-6 L3,-6 L2.6,-4.9 L-2.6,-4.9 Z" fill="#c9a441" />
              <line x1={0} y1={-2} x2={0} y2={0} stroke="#6e5525" strokeWidth={1.6} />
              <Feu x={0} y={-6.5} r={2} />
            </g>
          ))}
          <OlivierMini x={-w / 2 - 15} y={17} s={0.75} />
        </g>
      )}
    </g>
  )
}

export function Temple({ n }: { n: number }) {
  if (n === 1) return <BoisSacre />
  if (n === 2) return <Naiskos />
  return <TempleDePierre n={n} />
}
