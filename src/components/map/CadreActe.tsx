import type { CadreActe } from '../../game/campagne'
import { D_TERRE } from './Terrain'

/*
 * ═══════════════════ LE DÉCOR DES CINQ ACTES ═══════════════════
 *
 * La campagne ne se contente pas de changer la saison et le ciel : chaque acte
 * plante un REPÈRE dans le paysage, et ce repère est toujours le même que dans
 * l'Iliade. On les reconnaît sans lire une ligne :
 *
 *   · grève      - mille nefs noires tirées sur le sable, à l'ouest ;
 *   · plaine     - le camp achéen installé pour dix ans, tentes et fumées ;
 *   · murailles  - Ilion sur son tertre, à l'est de la plaine ;
 *   · fleuve     - le Scamandre débordé, qui coupe la plaine en deux ;
 *   · ruines     - la ville en flammes, et la carcasse du cheval sur la grève.
 *
 * Ce sont des couches ADDITIVES, posées entre le terrain et le village : elles ne
 * touchent pas à la carte, elles la peuplent. Tout est dessiné dans le repère
 * 1200×800 de la carte, avec l'horizon à y = 212 et la mer au sud-ouest.
 *
 * Style : lumière au nord-ouest, ombres portées vers le sud-est, aucun contour
 * noir, aucun tirage aléatoire au rendu - les positions sont écrites en dur ou
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

/** ACTE I - la grève de Sigée : la flotte échouée, gréements à l'horizon */
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
          d'où ces coordonnées serrées - une voile posée plus haut flotterait
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

/** ACTE II - le camp achéen installé pour durer : tentes, palissade, fumées */
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
           * s'ÉLARGIT en montant et penche avec le vent - cinq traits verticaux
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
 * ACTE IV - le Scamandre débordé. Il traverse la plaine du nord-est vers la mer
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
      {/* moires du courant, animées très lentement - un fleuve en crue est lourd */}
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
 * ACTE V - la carcasse du cheval, abandonnée sur la grève désertée. Posée au haut
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
      {/* la pique de Laocoon, restée dans le flanc - le bois avait sonné creux */}
      <path d="M-6,8 L-30,-6" stroke="#6b5333" strokeWidth={1.6} />
      <path d="M-30,-6 l-5,-1.4 l3,4 Z" fill="#9aa0a8" />
      {/* dédicace à Athéna, gravée sur le poitrail */}
      <path d="M-20,-2 L-8,-3" stroke="#a89463" strokeWidth={1.4} opacity={0.8} />
    </g>
  )
}

/*
 * ═══════════════════ LE SOL DES CINQ ACTES ═══════════════════
 *
 * Les repères ne suffisaient pas. On plantait des nefs et des murailles sur la
 * MÊME prairie de bac à sable : la grève de Sigée avait la couleur d'un pré au
 * printemps, et la ville en cendres poussait sur du gazon. Le décor disait
 * « nous sommes en Troade », jamais « nous sommes au dixième jour du siège ».
 *
 * Cette couche repeint la terre elle-même, clippée sur la même silhouette que la
 * plaine (`D_TERRE`) pour que rien ne déborde sur la mer :
 *
 *   · grève      - le sable remonte dans l'herbe, les dunes gagnent ;
 *   · plaine     - dix ans de camp : boue, ornières de chars, feux éteints ;
 *   · murailles  - la poussière du siège, la terre battue, plus une fleur ;
 *   · fleuve     - la crue a tout détrempé : flaques, limon, roseaux ;
 *   · ruines     - la cendre est tombée sur tout, et quelques braises tiennent.
 *
 * Deux règles tenues : aucun tirage au rendu (les semis sont dérivés d'un indice)
 * et aucune opacité assez forte pour effacer le relief du terrain - on TEINTE,
 * on ne recouvre pas.
 */

/** semis reproductible : n points répartis sur la terre ferme */
function semis(n: number, graine: number, hautMin = 300): { x: number; y: number; r: number }[] {
  const out: { x: number; y: number; r: number }[] = []
  let g = graine
  const suivant = () => {
    g = (g * 1103515245 + 12345) % 2147483648
    return g / 2147483648
  }
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    const x = 30 + suivant() * 1150
    const y = hautMin + suivant() * (795 - hautMin)
    // on reste à l'est du rivage : la mer occupe le coin sud-ouest
    const bordMer = y > 584 ? 40 + ((y - 584) / 216) * 250 : 0
    if (x < bordMer) continue
    out.push({ x, y, r: 0.4 + suivant() })
  }
  return out
}

function SolGreve() {
  return (
    <g clipPath="url(#sol-terre)" pointerEvents="none">
      {/* le sable a gagné toute la plaine, et franchement près de l'eau */}
      <rect x={0} y={300} width={1200} height={500} fill="#dfcb97" opacity={0.3} />
      <ellipse cx={330} cy={700} rx={560} ry={300} fill="#e9d8a6" opacity={0.42} />
      <ellipse cx={620} cy={790} rx={700} ry={220} fill="#dcc793" opacity={0.32} />
      {/* dunes : longues crêtes pâles côté NW, creux d'ombre côté SE */}
      {[
        'M60,646 C210,624 356,650 470,706',
        'M120,714 C266,690 420,714 546,764',
        'M244,586 C352,570 466,586 548,620',
      ].map((d, i) => (
        <g key={i}>
          <path d={d} stroke="#f1e2b6" strokeWidth={7} fill="none" opacity={0.5} strokeLinecap="round" />
          <path d={d} stroke="#b9a171" strokeWidth={3} fill="none" opacity={0.35} transform="translate(2,4)" />
        </g>
      ))}
      {/* oyats : l'herbe rase et sèche qui tient le sable */}
      {semis(46, 7, 560).map((p, i) => (
        <path
          key={i}
          d={`M${p.x},${p.y} q${p.r > 0.9 ? 3 : -3},-7 ${p.r > 0.9 ? 1 : -1},-12`}
          stroke={i % 3 === 0 ? '#b3ae7c' : '#9aa06a'}
          strokeWidth={1}
          fill="none"
          opacity={0.72}
        />
      ))}
      {/* galets roulés, plus nombreux près de l'eau */}
      {semis(26, 19, 600).map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx={2.2 + p.r * 2} ry={1.4 + p.r} fill="#cfc4a6" opacity={0.7}>
          {i % 4 === 0 ? <animate attributeName="opacity" values="0.7;0.7" dur="9s" /> : null}
        </ellipse>
      ))}
    </g>
  )
}

function SolCamp() {
  return (
    <g clipPath="url(#sol-terre)" pointerEvents="none">
      {/* dix ans de piétinement : la prairie a viré à la terre battue */}
      <rect x={0} y={300} width={1200} height={500} fill="#9b8a5e" opacity={0.3} />
      <ellipse cx={700} cy={560} rx={520} ry={230} fill="#8d7c53" opacity={0.28} />
      {/* ornières de chars : deux sillons parallèles, creux à l'ombre */}
      {[
        'M1190,392 C980,404 800,452 660,520 C520,588 420,660 372,760',
        'M1190,432 C990,446 820,494 686,560 C556,624 462,692 418,786',
        'M300,352 C468,360 640,392 800,452',
      ].map((d, i) => (
        <g key={i} opacity={0.55}>
          <path d={d} stroke="#6f6140" strokeWidth={5} fill="none" strokeLinecap="round" />
          <path d={d} stroke="#b8a674" strokeWidth={1.8} fill="none" transform="translate(-1,-2)" />
        </g>
      ))}
      {/* feux éteints : ronds de cendre cernés de pierres noircies */}
      {semis(14, 23, 340).map((p, i) => (
        <g key={i} opacity={0.72}>
          <circle cx={p.x} cy={p.y} r={7 + p.r * 3} fill="#5e5646" />
          <circle cx={p.x} cy={p.y} r={4 + p.r * 2} fill="#3f3a30" />
          {[0, 1.6, 3.1, 4.7].map((a) => (
            <circle
              key={a}
              cx={p.x + Math.cos(a) * (9 + p.r * 3)}
              cy={p.y + Math.sin(a) * (5 + p.r * 2)}
              r={1.8}
              fill="#8b8270"
            />
          ))}
        </g>
      ))}
      {/* touffes rescapées entre les tentes : l'herbe ne revient que par plaques */}
      {semis(30, 41, 330).map((p, i) => (
        <path
          key={i}
          d={`M${p.x},${p.y} l${p.r > 0.8 ? 2 : -2},-6`}
          stroke="#7e8a4e"
          strokeWidth={1.1}
          opacity={0.5}
          fill="none"
        />
      ))}
    </g>
  )
}

function SolSiege() {
  return (
    <g clipPath="url(#sol-terre)" pointerEvents="none">
      {/* la poussière du siège : tout est gris-jaune, rien ne pousse */}
      <rect x={0} y={280} width={1200} height={520} fill="#a89871" opacity={0.34} />
      <ellipse cx={860} cy={430} rx={460} ry={200} fill="#bfae82" opacity={0.26} />
      {/* nappes de poussière soulevée, qui respirent très lentement */}
      {[
        [520, 470, 300, 90, 17],
        [880, 540, 260, 74, 23],
        [300, 620, 220, 64, 29],
      ].map(([cx, cy, rx, ry, d], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill="#d6c69a" opacity={0.16}>
          <animate attributeName="opacity" values="0.1;0.24;0.1" dur={`${d}s`} repeatCount="indefinite" />
        </ellipse>
      ))}
      {/* pierres de jet et éclats : ce que dix ans de siège laissent au sol */}
      {semis(40, 53, 320).map((p, i) => (
        <g key={i}>
          <ellipse cx={p.x} cy={p.y} rx={2.6 + p.r * 3} ry={1.8 + p.r * 2} fill="#8d8570" opacity={0.8} />
          <ellipse cx={p.x - 0.8} cy={p.y - 0.8} rx={1.6 + p.r * 2} ry={1 + p.r} fill="#bab19a" opacity={0.75} />
        </g>
      ))}
      {/* trous de fondrière laissés par les béliers qu'on traîne */}
      {semis(12, 67, 380).map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx={13 + p.r * 8} ry={5 + p.r * 3} fill="#6f6449" opacity={0.3} />
      ))}
    </g>
  )
}

function SolCrue() {
  return (
    <g clipPath="url(#sol-terre)" pointerEvents="none">
      {/* la crue a tout détrempé : la terre est sombre et lourde */}
      <rect x={0} y={300} width={1200} height={500} fill="#5d6a52" opacity={0.26} />
      {/* limon déposé le long de ce que le fleuve a débordé */}
      <path
        d="M1200,300 C1020,318 900,352 782,300 C700,264 596,258 500,300 C392,348 300,432 236,556 C196,632 176,712 168,800"
        stroke="#8c8560"
        strokeWidth={150}
        fill="none"
        opacity={0.22}
        strokeLinecap="round"
      />
      {/* flaques : miroirs de ciel restés dans les creux */}
      {semis(22, 11, 330).map((p, i) => (
        <g key={i}>
          <ellipse cx={p.x} cy={p.y} rx={12 + p.r * 16} ry={4 + p.r * 5} fill="#6f8b8c" opacity={0.55} />
          <ellipse cx={p.x - 2} cy={p.y - 1.2} rx={7 + p.r * 9} ry={2 + p.r * 2.4} fill="#a8c2bd" opacity={0.4}>
            <animate
              attributeName="opacity"
              values="0.28;0.46;0.28"
              dur={`${7 + (i % 5)}s`}
              repeatCount="indefinite"
            />
          </ellipse>
        </g>
      ))}
      {/* roseaux gagnés sur la prairie : le fleuve a apporté ses plantes */}
      {semis(28, 29, 340).map((p, i) => (
        <g key={i} opacity={0.7}>
          {[0, 3.4, 6.8].map((d) => (
            <path
              key={d}
              d={`M${p.x + d},${p.y} q${d === 3.4 ? 2 : -2},-9 ${d === 3.4 ? 0.6 : -0.6},-16`}
              stroke={i % 2 === 0 ? '#6f7f48' : '#7f8a52'}
              strokeWidth={1.1}
              fill="none"
            />
          ))}
        </g>
      ))}
    </g>
  )
}

function SolCendres() {
  return (
    <g clipPath="url(#sol-terre)" pointerEvents="none">
      {/* la cendre est tombée sur tout : la plaine a perdu sa couleur */}
      <rect x={0} y={260} width={1200} height={540} fill="#4a4640" opacity={0.36} />
      <ellipse cx={880} cy={400} rx={480} ry={210} fill="#3a3630" opacity={0.3} />
      {/* coulées de suie descendues d'Ilion, vers le sud-ouest */}
      {[
        'M1060,300 C960,372 840,452 700,520',
        'M980,318 C880,400 760,486 618,566',
        'M1120,336 C1030,412 930,486 806,556',
      ].map((d, i) => (
        <path key={i} d={d} stroke="#2f2c28" strokeWidth={40} fill="none" opacity={0.14} strokeLinecap="round" />
      ))}
      {/* plaques calcinées, cernées d'un liseré encore chaud */}
      {semis(26, 71, 300).map((p, i) => (
        <g key={i}>
          <ellipse cx={p.x} cy={p.y} rx={14 + p.r * 14} ry={6 + p.r * 6} fill="#2b2825" opacity={0.55} />
          <ellipse
            cx={p.x}
            cy={p.y}
            rx={14 + p.r * 14}
            ry={6 + p.r * 6}
            fill="none"
            stroke="#8a4a24"
            strokeWidth={1}
            opacity={0.3}
          />
        </g>
      ))}
      {/* braises : quelques points qui respirent encore dans la cendre */}
      {semis(18, 83, 320).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.6 + p.r} fill="#e07a3a" opacity={0.7}>
          <animate
            attributeName="opacity"
            values="0.25;0.85;0.25"
            dur={`${2.4 + (i % 7) * 0.6}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
      {/* souches noircies : ce qui reste des oliviers de la plaine */}
      {semis(10, 97, 340).map((p, i) => (
        <g key={i} opacity={0.8}>
          <path d={`M${p.x},${p.y} l0,-13`} stroke="#332f2a" strokeWidth={3.4} strokeLinecap="round" />
          <path d={`M${p.x},${p.y - 9} l${p.r > 0.8 ? 7 : -7},-6`} stroke="#332f2a" strokeWidth={2} strokeLinecap="round" />
          <ellipse cx={p.x + 2} cy={p.y + 1} rx={7} ry={2.4} fill="#20201d" opacity={0.4} />
        </g>
      ))}
    </g>
  )
}

/** la terre ferme d'un acte, avant qu'on y plante quoi que ce soit */
function SolActe({ cadre }: { cadre: CadreActe }) {
  switch (cadre) {
    case 'greve':
      return <SolGreve />
    case 'plaine':
      return <SolCamp />
    case 'murailles':
      return <SolSiege />
    case 'fleuve':
      return <SolCrue />
    case 'ruines':
      return <SolCendres />
  }
}

/**
 * Le décor d'un acte, posé entre le terrain et le village : d'abord la TERRE
 * repeinte, ensuite les repères qu'on y plante. `null` en bac à sable - la
 * plaine de la Troade s'y suffit.
 */
export function DecorActe({ cadre }: { cadre: CadreActe | null }) {
  if (!cadre) return null
  return (
    <>
      <defs>
        {/* tout le sol d'acte est clippé sur la terre ferme : rien sur la mer */}
        <clipPath id="sol-terre">
          <path d={D_TERRE} />
        </clipPath>
      </defs>
      <SolActe cadre={cadre} />
      <Reperes cadre={cadre} />
    </>
  )
}

/** les repères plantés dans le paysage - nefs, camp, murailles, fleuve, cheval */
function Reperes({ cadre }: { cadre: CadreActe }) {
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
