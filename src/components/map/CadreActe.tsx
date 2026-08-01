import type { CadreActe } from '../../game/campagne'

/*
 * ═══════════════════ LE DÉCOR DES CINQ ACTES ═══════════════════
 *
 * La campagne ne se contente pas de changer la saison et le ciel : chaque acte
 * plante un REPÈRE dans le paysage, et ce repère est toujours le même que dans
 * l'Iliade. On les reconnaît sans lire une ligne :
 *
 *   · grève      — mille nefs noires tirées sur le sable, à l'ouest ;
 *   · plaine     — le camp achéen installé pour dix ans, tentes et fumées ;
 *   · murailles  — Ilion sur son tertre, à l'est de la plaine ;
 *   · fleuve     — le Scamandre débordé, qui coupe la plaine en deux ;
 *   · ruines     — la ville en flammes, et la carcasse du cheval sur la grève.
 *
 * Ce sont des couches ADDITIVES, posées entre le terrain et le village : elles ne
 * touchent pas à la carte, elles la peuplent. Tout est dessiné dans le repère
 * 1200×800 de la carte, avec l'horizon à y = 212 et la mer au sud-ouest.
 *
 * Style : lumière au nord-ouest, ombres portées vers le sud-est, aucun contour
 * noir, aucun tirage aléatoire au rendu — les positions sont écrites en dur ou
 * dérivées d'un indice, pour que deux rendus donnent la même image.
 */

const HORIZON = 212

/** une nef noire tirée à sec, vue de trois quarts arrière */
function Nef({ x, y, s = 1, teinte = '#33291f' }: { x: number; y: number; s?: number; teinte?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {/* ombre au sol, allongée vers le sud-est */}
      <ellipse cx={4} cy={2} rx={26} ry={4.4} fill="#6b5a3c" opacity={0.28} />
      {/* coque : quille relevée aux deux bouts, flanc nord éclairé */}
      <path d={`M-24,0 Q-20,-7 -6,-8 L10,-8 Q22,-7 25,-1 Q14,3 -4,3 Q-18,3 -24,0 Z`} fill={teinte} />
      <path d={`M-22,-1 Q-18,-6 -6,-6.8 L9,-6.8 Q19,-6 22,-2 Q12,-4.4 -2,-4.6 Q-15,-4.4 -22,-1 Z`} fill="#54432f" />
      {/* éperon et poupe recourbée */}
      <path d="M25,-1 Q29,-4 27,-9 Q24,-6 23,-2 Z" fill={teinte} />
      <path d="M-24,0 Q-28,-5 -25,-11 Q-22,-6 -22,-1 Z" fill="#423425" />
      {/* mât couché sur les bancs, comme on le fait au sec */}
      <path d="M-16,-6 L18,-8.6" stroke="#7b6242" strokeWidth={1.1} />
      {/* rames en faisceau appuyées contre le flanc */}
      <path d="M-8,-7 l-5,7 M-4,-7 l-4,7 M0,-7 l-3.4,7" stroke="#8a7150" strokeWidth={0.8} opacity={0.85} />
    </g>
  )
}

/** ACTE I — la grève de Sigée : la flotte échouée, gréements à l'horizon */
function Greve() {
  // les nefs suivent la ligne de rivage (D_RIVE de Terrain.tsx), en trois rangs
  const rangs: { x: number; y: number; s: number }[] = []
  for (let i = 0; i < 7; i++) rangs.push({ x: 30 + i * 33, y: 636 + i * 17, s: 0.9 })
  for (let i = 0; i < 5; i++) rangs.push({ x: 18 + i * 34, y: 700 + i * 18, s: 1.05 })
  for (let i = 0; i < 4; i++) rangs.push({ x: 14 + i * 36, y: 762 + i * 12, s: 1.18 })
  return (
    <g pointerEvents="none">
      {/* voiles encore au large, dans l'eau et non dans le ciel : la flotte n'a
          pas fini d'arriver. La mer n'occupe que l'angle sud-ouest de la carte,
          d'où ces coordonnées serrées — une voile posée plus haut flotterait
          au-dessus de la prairie. */}
      <g opacity={0.62}>
        {[
          [58, 606],
          [96, 622],
          [30, 640],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x},${y}) scale(${0.42 + (i % 3) * 0.07})`}>
            <path d="M0,0 L0,-16 L11,-3 Z" fill="#e8e2d0" />
            <path d="M0,0 L0,-16 L4,-11 L4,-1 Z" fill="#cfc7b2" />
            <path d="M-5,1 Q0,4 6,1 Q0,3 -5,1 Z" fill="#3d3327" />
          </g>
        ))}
      </g>
      {/* la flotte au sec, du plus lointain au plus proche */}
      {rangs.map((n, i) => (
        <Nef key={i} x={n.x} y={n.y} s={n.s} teinte={i % 3 === 1 ? '#3a2f23' : '#33291f'} />
      ))}
      {/* feux de camp entre les coques, et leur fumée droite du matin */}
      {[
        [96, 672],
        [72, 742],
        [148, 706],
      ].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx={7} ry={2.6} fill="#6b5a3c" opacity={0.3} />
          <path d={`M${x - 3},${y} l3,-6 l3,6 Z`} fill="#d98a4e" />
          <path d={`M${x - 1.4},${y} l1.4,-3.4 l1.4,3.4 Z`} fill="#f0c469" />
          <path
            d={`M${x},${y - 7} q-4,-14 1,-26 q4,-12 -1,-22`}
            stroke="#cfc7b2"
            strokeWidth={3.2}
            fill="none"
            opacity={0.34}
            strokeLinecap="round"
          />
        </g>
      ))}
    </g>
  )
}

/** ACTE II — le camp achéen installé pour durer : tentes, palissade, fumées */
function CampAcheen() {
  const tentes: { x: number; y: number; s: number }[] = []
  for (let i = 0; i < 14; i++) tentes.push({ x: 132 + i * 41, y: HORIZON - 4 + (i % 3) * 3, s: 0.9 + (i % 4) * 0.06 })
  return (
    <g pointerEvents="none">
      {/* le camp est LOIN : on le peint pâle, comme la chaîne d'arrière-plan */}
      <g opacity={0.82}>
        {/* palissade continue devant les tentes */}
        <path d={`M120,${HORIZON + 5} L720,${HORIZON + 5}`} stroke="#8a7452" strokeWidth={2.6} />
        <path d={`M120,${HORIZON + 3.2} L720,${HORIZON + 3.2}`} stroke="#a68f68" strokeWidth={1.1} />
        {tentes.map((t, i) => (
          <g key={i} transform={`translate(${t.x},${t.y}) scale(${t.s})`}>
            {/* toile à deux pans : pan nord au soleil, pan est dans l'ombre */}
            <path d="M-11,0 L0,-13 L11,0 Z" fill="#c3b593" />
            <path d="M0,-13 L11,0 L4,0 Z" fill="#a2957a" />
            <path d="M-11,0 L0,-13 L-4,0 Z" fill="#d6c9a6" />
            {/* piquet de faîte */}
            <path d="M0,-13 L0,-17" stroke="#7b6242" strokeWidth={0.8} />
          </g>
        ))}
        {/* fumées de cuisine : les seules verticales de tout le décor */}
        {[196, 318, 440, 574, 668].map((x, i) => (
          <path
            key={x}
            d={`M${x},${HORIZON} q-5,-18 1,-32 q5,-13 -1,-24`}
            stroke="#d3cbb6"
            strokeWidth={3 + (i % 2)}
            fill="none"
            opacity={0.3}
            strokeLinecap="round"
          />
        ))}
      </g>
    </g>
  )
}

/**
 * Ilion sur son tertre. Deux paramètres : `feu` allume la ville (acte V) et
 * `ruine` ébrèche ses murs. C'est le même dessin, à deux moments de son histoire.
 */
function Ilion({ feu = false, ruine = false }: { feu?: boolean; ruine?: boolean }) {
  const mur = ruine ? '#8b8577' : '#c8c2ac'
  const murOmbre = ruine ? '#6d6759' : '#a49d86'
  return (
    <g pointerEvents="none" transform="translate(884,0)">
      {/* le tertre sur lequel la ville est assise */}
      <path d={`M-140,${HORIZON} Q-70,${HORIZON - 46} 10,${HORIZON - 52} Q96,${HORIZON - 44} 168,${HORIZON} Z`} fill="#8e9678" />
      <path d={`M-140,${HORIZON} Q-70,${HORIZON - 46} 10,${HORIZON - 52} Q40,${HORIZON - 30} 60,${HORIZON} Z`} fill="#9ba483" />
      {/* enceinte : courtine, créneaux, deux tours et la porte Scée */}
      <path d={`M-96,${HORIZON - 40} L96,${HORIZON - 40} L96,${HORIZON - 66} L-96,${HORIZON - 66} Z`} fill={mur} />
      <path d={`M-96,${HORIZON - 46} L96,${HORIZON - 46} L96,${HORIZON - 40} L-96,${HORIZON - 40} Z`} fill={murOmbre} />
      {Array.from({ length: 17 }, (_, i) => (
        <rect key={i} x={-96 + i * 12} y={HORIZON - 72} width={7} height={6} fill={mur} />
      ))}
      {/* tour nord et tour sud, plus hautes que la courtine */}
      {[-104, 88].map((x, i) => (
        <g key={i}>
          <path d={`M${x},${HORIZON - 40} L${x + 18},${HORIZON - 40} L${x + 18},${HORIZON - 92} L${x},${HORIZON - 92} Z`} fill={mur} />
          <path d={`M${x + 11},${HORIZON - 92} L${x + 18},${HORIZON - 92} L${x + 18},${HORIZON - 40} L${x + 11},${HORIZON - 40} Z`} fill={murOmbre} />
          <path d={`M${x - 2},${HORIZON - 98} L${x + 20},${HORIZON - 98} L${x + 20},${HORIZON - 92} L${x - 2},${HORIZON - 92} Z`} fill="#d8d2bc" />
        </g>
      ))}
      {/* la porte Scée, élargie de leurs propres mains pour l'offrande */}
      <path
        d={`M-14,${HORIZON - 40} L-14,${HORIZON - 58} Q0,${HORIZON - 66} 14,${HORIZON - 58} L14,${HORIZON - 40} Z`}
        fill={ruine ? '#2c2318' : '#5c4a30'}
      />
      {/* toits de la ville qui dépassent du rempart */}
      {[-70, -44, -16, 16, 46, 70].map((x, i) => (
        <path
          key={x}
          d={`M${x - 13},${HORIZON - 66} L${x},${HORIZON - 66 - 11 - (i % 3) * 4} L${x + 13},${HORIZON - 66} Z`}
          fill={ruine ? '#6b4a3a' : '#a4694e'}
        />
      ))}
      {/* pans effondrés : deux brèches dans la courtine */}
      {ruine && (
        <g>
          <path d={`M20,${HORIZON - 40} L26,${HORIZON - 62} L44,${HORIZON - 55} L50,${HORIZON - 40} Z`} fill="#8e9678" />
          <path d={`M-64,${HORIZON - 40} L-58,${HORIZON - 58} L-44,${HORIZON - 48} L-40,${HORIZON - 40} Z`} fill="#8e9678" />
        </g>
      )}
      {/* la ville brûle : lueur sous les fumées, puis les colonnes noires */}
      {feu && (
        <g>
          <ellipse cx={0} cy={HORIZON - 62} rx={128} ry={44} fill="#e0813a" opacity={0.24}>
            <animate attributeName="opacity" values="0.18;0.32;0.18" dur="4.6s" repeatCount="indefinite" />
          </ellipse>
          {/* les flammes sortent d'entre les toits */}
          {[-72, -30, 12, 54, 86].map((x, i) => (
            <path
              key={x}
              d={`M${x},${HORIZON - 66} l-4,-9 l7,-4 l-3,-8`}
              stroke="#f0b45c"
              strokeWidth={3}
              fill="none"
              opacity={0.75}
            >
              <animate attributeName="opacity" values="0.45;0.9;0.45" dur={`${1.6 + i * 0.3}s`} repeatCount="indefinite" />
            </path>
          ))}
          {/*
           * La fumée : trois masses et non cinq tuyaux. Une colonne de fumée
           * s'ÉLARGIT en montant et penche avec le vent — cinq traits verticaux
           * de même épaisseur se lisaient comme des cheminées d'usine.
           */}
          {[
            { x: -56, d: 1.5, l: 26 },
            { x: 6, d: 1.1, l: 34 },
            { x: 66, d: 1.35, l: 22 },
          ].map((c, i) => (
            <g key={c.x} opacity={0.3}>
              <path
                d={`M${c.x},${HORIZON - 70} q${-6 * c.d},-30 ${10 * c.d},-56 q${14 * c.d},-24 ${6 * c.d},-52`}
                stroke="#5b5348"
                strokeWidth={c.l}
                fill="none"
                strokeLinecap="round"
              >
                <animate attributeName="opacity" values="0.7;1;0.7" dur={`${7 + i * 2}s`} repeatCount="indefinite" />
              </path>
              <path
                d={`M${c.x + 4},${HORIZON - 78} q${-4 * c.d},-24 ${12 * c.d},-46`}
                stroke="#736a5c"
                strokeWidth={c.l * 0.55}
                fill="none"
                strokeLinecap="round"
                opacity={0.7}
              />
            </g>
          ))}
        </g>
      )}
    </g>
  )
}

/**
 * ACTE IV — le Scamandre débordé. Il traverse la plaine du nord-est vers la mer
 * du sud-ouest, en contournant l'enceinte par le nord : le village garde ses
 * abords, mais la plaine n'est plus franchissable sans mouiller ses lances.
 */
function Fleuve() {
  const lit = 'M1200,300 C1020,318 900,352 782,300 C700,264 596,258 500,300 C392,348 300,432 236,556 C196,632 176,712 168,800'
  return (
    <g pointerEvents="none">
      {/* berges limoneuses, puis l'eau, puis le fil du courant */}
      <path d={lit} stroke="#8c8560" strokeWidth={58} fill="none" opacity={0.5} strokeLinecap="round" />
      <path d={lit} stroke="#6d7f7a" strokeWidth={44} fill="none" strokeLinecap="round" />
      <path d={lit} stroke="#7d9089" strokeWidth={34} fill="none" strokeLinecap="round" />
      <path d={lit} stroke="#8fa39a" strokeWidth={16} fill="none" opacity={0.7} strokeLinecap="round" />
      {/* moires du courant, animées très lentement — un fleuve en crue est lourd */}
      <path d={lit} stroke="#c3d2c6" strokeWidth={2.6} fill="none" opacity={0.34} strokeDasharray="26 58" strokeLinecap="round">
        <animate attributeName="stroke-dashoffset" values="0;-336" dur="14s" repeatCount="indefinite" />
      </path>
      <path d={lit} stroke="#eef3ea" strokeWidth={1.3} fill="none" opacity={0.28} strokeDasharray="12 92" strokeLinecap="round">
        <animate attributeName="stroke-dashoffset" values="0;-312" dur="9s" repeatCount="indefinite" />
      </path>
      {/* ce que la crue emporte : troncs et boucliers en travers */}
      {[
        [742, 296, 14],
        [472, 316, -22],
        [268, 512, 38],
        [196, 690, 8],
      ].map(([x, y, a], i) => (
        <g key={i} transform={`translate(${x},${y}) rotate(${a})`}>
          {i % 2 === 0 ? (
            <>
              <rect x={-16} y={-2.6} width={32} height={5.2} rx={2.6} fill="#6b5333" />
              <rect x={-16} y={-2.6} width={32} height={2} rx={1} fill="#8a6d45" />
            </>
          ) : (
            <>
              <ellipse cx={0} cy={0} rx={8} ry={7} fill="#8a6a3e" />
              <ellipse cx={-1} cy={-1} rx={5} ry={4.4} fill="#a8813f" />
              <circle cx={-1} cy={-1} r={1.7} fill="#d7c07a" />
            </>
          )}
        </g>
      ))}
      {/* roseaux sur la rive intérieure, là où l'eau touche la prairie */}
      {[
        [300, 452],
        [252, 548],
        [214, 636],
        [636, 282],
        [820, 296],
      ].map(([x, y], i) => (
        <g key={i} opacity={0.8}>
          {[0, 4, 8, 12].map((d) => (
            <path
              key={d}
              d={`M${x + d},${y} q${d % 8 === 0 ? -3 : 3},-11 ${d % 8 === 0 ? -1 : 1},-19`}
              stroke={i % 2 === 0 ? '#7d8a4a' : '#8d9455'}
              strokeWidth={1.2}
              fill="none"
            />
          ))}
        </g>
      ))}
    </g>
  )
}

/**
 * ACTE V — la carcasse du cheval, abandonnée sur la grève désertée. Posée au haut
 * de plage, entre l'eau et la prairie : c'est là qu'on l'a laissé.
 */
function ChevalDeBois() {
  return (
    <g pointerEvents="none" transform="translate(338,776) scale(1.25)">
      <ellipse cx={6} cy={30} rx={44} ry={7} fill="#6b5a3c" opacity={0.3} />
      {/* plateforme à roues sur laquelle on l'a traîné */}
      <path d="M-34,26 L34,26 L30,31 L-30,31 Z" fill="#6b5333" />
      <circle cx={-20} cy={31} r={5} fill="#54432f" />
      <circle cx={20} cy={31} r={5} fill="#54432f" />
      <circle cx={-20} cy={31} r={2} fill="#7b6242" />
      <circle cx={20} cy={31} r={2} fill="#7b6242" />
      {/* corps : madriers assemblés, flanc nord éclairé */}
      <path d="M-26,26 L-22,-6 Q0,-14 24,-6 L28,26 Z" fill="#7b6242" />
      <path d="M-26,26 L-22,-6 Q-10,-11 -4,-11 L-2,26 Z" fill="#8f7550" />
      <path d="M14,-9 Q24,-7 28,26 L18,26 Z" fill="#5f4c33" />
      {/* les planches, une à une : c'est ce qui trahit l'ouvrage d'Épéios */}
      {[2, 9, 16, 23].map((y) => (
        <path key={y} d={`M-25,${y} L27,${y}`} stroke="#5f4c33" strokeWidth={0.9} opacity={0.65} />
      ))}
      {/* encolure, tête baissée, crinière de crin tressé */}
      <path d="M18,-6 Q30,-14 32,-30 L40,-28 Q42,-10 30,-2 Z" fill="#7b6242" />
      <path d="M32,-30 Q40,-34 46,-28 Q46,-20 38,-19 Q32,-22 32,-30 Z" fill="#8f7550" />
      <path d="M43,-27 Q47,-25 46,-21" stroke="#5f4c33" strokeWidth={1.1} fill="none" />
      <circle cx={41} cy={-26} r={1.5} fill="#3c3024" />
      <path d="M31,-30 l-3,-6 M35,-32 l-1,-7" stroke="#5f4c33" strokeWidth={1.6} strokeLinecap="round" />
      {/* la pique de Laocoon, restée dans le flanc — le bois avait sonné creux */}
      <path d="M-6,8 L-30,-6" stroke="#6b5333" strokeWidth={1.6} />
      <path d="M-30,-6 l-5,-1.4 l3,4 Z" fill="#9aa0a8" />
      {/* dédicace à Athéna, gravée sur le poitrail */}
      <path d="M-20,-2 L-8,-3" stroke="#a89463" strokeWidth={1.4} opacity={0.8} />
    </g>
  )
}

/**
 * Le décor d'un acte, posé entre le terrain et le village. `null` en bac à sable :
 * la plaine de la Troade s'y suffit.
 */
export function DecorActe({ cadre }: { cadre: CadreActe | null }) {
  if (!cadre) return null
  switch (cadre) {
    case 'greve':
      return <Greve />
    case 'plaine':
      return <CampAcheen />
    case 'murailles':
      return (
        <>
          <CampAcheen />
          <Ilion />
        </>
      )
    case 'fleuve':
      return (
        <>
          <CampAcheen />
          <Ilion />
          <Fleuve />
        </>
      )
    case 'ruines':
      return (
        <>
          <Ilion feu ruine />
          <ChevalDeBois />
        </>
      )
  }
}
