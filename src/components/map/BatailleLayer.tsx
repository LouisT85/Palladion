import type { BattleState, Fighter } from '../../game/types'

/*
 * Figurines de bataille — animées en SMIL (aucun coût JS par frame) :
 *  - marche : jambes en ciseaux, balancement du corps, cape d'ombre qui suit
 *  - mêlée / siège : coup d'arme porté en boucle — jab de lance, taillade de
 *    dague, estoc d'épée — désynchronisé par figurine via `seed`
 *  - tir : l'archer bande son arc au rythme réel de sa cadence
 *  - mort : la figurine bascule au sol puis se dissout dans la poussière
 * Les durées de cycle collent aux cadences de combat.ts pour que le geste
 * et le coup restent crédibles l'un envers l'autre.
 */

type Anim = 'idle' | 'marche' | 'combat' | 'tir'

const PEAU = '#d9a97c'
/** ombre propre de la peau (flanc est du visage, bras au second plan) */
const PEAU_OMBRE = '#bd8a5c'

/** mélange déterministe de deux hex — pour nuancer les tuniques autour de leur teinte */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const c = (sa: number, sb: number) => Math.round(sa + (sb - sa) * t)
  const r = c((pa >> 16) & 255, (pb >> 16) & 255)
  const g = c((pa >> 8) & 255, (pb >> 8) & 255)
  const bl = c(pa & 255, pb & 255)
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`
}
/** flanc éclairé (soleil NW) et creux des plis d'une étoffe */
const drapLit = (c: string) => mix(c, '#ffe9c2', 0.34)
const drapOmbre = (c: string) => mix(c, '#221408', 0.34)

/** ombre au sol commune : deux ellipses terre superposées, bord doux sans filtre */
function OmbreSol({ rx = 5, ry = 1.8 }: { rx?: number; ry?: number }) {
  return (
    <>
      <ellipse cx={rx * 0.12} cy={1.1} rx={rx * 1.12} ry={ry * 1.12} fill="#241a08" opacity={0.09} />
      <ellipse cx={rx * 0.07} cy={1} rx={rx * 0.76} ry={ry * 0.78} fill="#241a08" opacity={0.14} />
    </>
  )
}

/** casque de bronze : calotte modelée, reflet NW, couvre-nuque — la crête est à part */
function Casque() {
  return (
    <g>
      {/* couvre-nuque (le dos est à gauche, la figurine regarde vers +x) */}
      <path d="M-2.6,-13.2 L-3.6,-11.2 L-2,-11 L-1.8,-12.8 Z" fill="#564c2c" />
      {/* calotte : demi-teinte, flanc est ombré, reflet spéculaire NW */}
      <path d="M-2.75,-13.4 A2.75,2.75 0 0 1 2.75,-13.4 L2.75,-12.7 L-2.75,-12.7 Z" fill="#7e714a" />
      <path d="M0.4,-16.1 A2.75,2.75 0 0 1 2.75,-13.4 L2.75,-12.7 L1.1,-12.7 Q1.6,-14.9 0.4,-16.1 Z" fill="#5c5231" />
      <path d="M-2.15,-14.35 A2.55,2.55 0 0 1 -0.2,-15.65" stroke="#ece1ac" strokeWidth={1.1} fill="none" strokeLinecap="round" />
      {/* bord inférieur dans la teinte sombre du bronze — assoit le casque sur le visage */}
      <path d="M-2.75,-12.7 L2.75,-12.7" stroke="#4c431f" strokeWidth={0.8} />
      {/* nasal court au front */}
      <path d="M2.1,-14 L2.75,-13.4 L2.75,-12.7 L1.75,-13.3 Z" fill="#6a5f3a" />
    </g>
  )
}

/** crête d'officier : brosse fournie, racine sombre, mèche avant au soleil */
function Crete() {
  return (
    <g>
      <path
        d="M-2.7,-15.1 L-1.7,-18.2 L-0.9,-17.2 L-0.2,-19 L0.7,-17.3 L1.4,-18.5 L2,-16.9 L2.6,-15.4 Q0,-16.9 -2.7,-15.1 Z"
        fill="#a8483a"
      />
      <path d="M-0.2,-19 L0.7,-17.3 L-0.7,-17 Z" fill="#cf6a4e" />
      <path d="M-2.7,-15.1 Q0,-16.9 2.6,-15.4" stroke="#7c322a" strokeWidth={1} fill="none" />
    </g>
  )
}

export function Bonhomme({
  tunique,
  arme,
  taille = 1,
  crete,
  anim = 'idle',
  seed = 0,
  dur = 2.1,
}: {
  tunique: string
  arme: 'lance' | 'arc' | 'dague' | 'bouclier-lourd'
  taille?: number
  crete?: boolean
  anim?: Anim
  seed?: number
  /** durée (s) du cycle d'attaque — alignée sur la cadence de frappe */
  dur?: number
}) {
  const marche = anim === 'marche'
  const combat = anim === 'combat'
  const tir = anim === 'tir'
  // désynchronise les boucles : pas d'armée de clones qui frappent en chœur
  const decal = `-${(seed * 3.1).toFixed(2)}s`
  const durS = `${dur}s`

  return (
    <g transform={`scale(${taille})`}>
      <OmbreSol rx={5} ry={1.8} />

      {/* jambes */}
      {marche ? (
        <>
          <line x1={-1.6} y1={-4} x2={-1.6} y2={0} stroke={PEAU} strokeWidth={1.6}>
            <animateTransform attributeName="transform" type="rotate" values="22 0 -4;-22 0 -4;22 0 -4" dur="0.6s" begin={decal} repeatCount="indefinite" />
          </line>
          <line x1={1.6} y1={-4} x2={1.6} y2={0} stroke={PEAU_OMBRE} strokeWidth={1.6}>
            <animateTransform attributeName="transform" type="rotate" values="-22 0 -4;22 0 -4;-22 0 -4" dur="0.6s" begin={decal} repeatCount="indefinite" />
          </line>
        </>
      ) : (
        <>
          <line x1={-1.6} y1={0} x2={-1.6} y2={-4} stroke={PEAU} strokeWidth={1.6} />
          <line x1={1.6} y1={0} x2={1.6} y2={-4} stroke={PEAU_OMBRE} strokeWidth={1.6} />
        </>
      )}

      {/* corps, tête et arme — le buste porte le geste */}
      <g>
        {marche && (
          <animateTransform attributeName="transform" type="translate" values="0,0;0,-1.2;0,0" dur="0.3s" begin={decal} repeatCount="indefinite" />
        )}
        {combat && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0;2.4,-0.6;0,0;0,0"
            keyTimes="0;0.1;0.22;1"
            dur={durS}
            begin={decal}
            repeatCount="indefinite"
          />
        )}

        {/* tunique : flanc gauche au soleil, plis creusés dans la teinte sombre, ceinture */}
        <path d="M-3,-4 L-2.2,-11 L2.2,-11 L3,-4 Z" fill={tunique} />
        <path d="M-3,-4 L-2.2,-11 L-0.7,-11 L-1.1,-4 Z" fill={mix(tunique, '#ffe9c2', 0.22)} />
        <path d="M2.2,-11 L3,-4 L2,-4 L1.6,-11 Z" fill={drapOmbre(tunique)} opacity={0.8} />
        <path d="M0.7,-4.4 L0.5,-6.2" stroke={drapOmbre(tunique)} strokeWidth={0.8} opacity={0.85} />
        <path d="M-2.68,-6.5 L2.68,-6.5 L2.76,-7.5 L-2.76,-7.5 Z" fill="#5d4230" />
        <path d="M-2.76,-7.5 L-0.3,-7.5 L-0.3,-6.5 L-2.68,-6.5 Z" fill="#7a5a3e" opacity={0.75} />
        {/* épaules : ourlet clair côté lumière */}
        <path d="M-2.2,-11 L0.4,-11" stroke={drapLit(tunique)} strokeWidth={0.9} opacity={0.8} />
        {/* tête : face au soleil, joue est dans l'ombre */}
        <circle cx={0} cy={-13} r={2.7} fill={PEAU} />
        <path d="M0.9,-15.55 A2.7,2.7 0 0 1 0.9,-10.45 A3.9,3.9 0 0 0 0.9,-15.55 Z" fill={PEAU_OMBRE} />
        <Casque />
        {crete && <Crete />}

        {/* carquois en biais dans le dos des archers, deux flèches qui dépassent */}
        {arme === 'arc' && (
          <g>
            <line x1={-4.6} y1={-10.6} x2={-4} y2={-11.9} stroke="#5d4a33" strokeWidth={0.8} />
            <line x1={-3.8} y1={-10.9} x2={-3.3} y2={-12.2} stroke="#5d4a33" strokeWidth={0.8} />
            <path d="M-5.3,-10.3 L-3.9,-10.9 L-2.4,-7.4 L-3.8,-6.9 Z" fill="#7a5230" />
            <path d="M-5.3,-10.3 L-4.6,-10.6 L-3.1,-7.15 L-3.8,-6.9 Z" fill="#9a6f42" />
          </g>
        )}

        {/* ── armes ── */}
        {arme === 'lance' && (
          <g>
            {combat && (
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0;-1.6,0.4;3.4,-1;0,0;0,0"
                keyTimes="0;0.06;0.13;0.3;1"
                dur={durS}
                begin={decal}
                repeatCount="indefinite"
              />
            )}
            {/* hampe deux tons : bas en ombre, haut frappé par le soleil */}
            <line x1={4} y1={2} x2={7} y2={-18} stroke="#6b4c2a" strokeWidth={1.3} />
            <line x1={5.6} y1={-8.6} x2={7} y2={-18} stroke="#a8845d" strokeWidth={0.9} />
            {/* fer à deux facettes : éclat NW, revers dans l'ombre */}
            <path d="M7,-18 L7.9,-21 L8.1,-18.2 Z" fill="#e4eaef" />
            <path d="M8.1,-18.2 L7.9,-21 L9.2,-18.4 Z" fill="#87909a" />
            <line x1={7} y1={-17.7} x2={8.6} y2={-18.1} stroke="#4f3a22" strokeWidth={0.8} />
          </g>
        )}

        {arme === 'dague' && (
          <g>
            {combat && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 2 -8;-55 2 -8;28 2 -8;0 2 -8;0 2 -8"
                keyTimes="0;0.08;0.15;0.32;1"
                dur={durS}
                begin={decal}
                repeatCount="indefinite"
              />
            )}
            <line x1={2} y1={-8} x2={4.5} y2={-8.8} stroke={PEAU} strokeWidth={1.3} />
            {/* lame : dos dans l'ombre, fil qui accroche la lumière, petite garde */}
            <line x1={4.5} y1={-8.8} x2={8} y2={-11.5} stroke="#8a929b" strokeWidth={1.4} />
            <line x1={4.9} y1={-9.35} x2={7.7} y2={-11.5} stroke="#e6ebf0" strokeWidth={0.8} />
            <line x1={4.35} y1={-9.6} x2={5.1} y2={-8.2} stroke="#8c6b3f" strokeWidth={0.9} />
          </g>
        )}

        {arme === 'bouclier-lourd' && (
          <g>
            {combat && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 2 -9;-48 2 -9;22 2 -9;0 2 -9;0 2 -9"
                keyTimes="0;0.07;0.14;0.3;1"
                dur={durS}
                begin={decal}
                repeatCount="indefinite"
              />
            )}
            {/* épée courte (xiphos) : lame à deux facettes, garde de bronze, pommeau */}
            <line x1={2.6} y1={-9} x2={5} y2={-9.6} stroke={PEAU} strokeWidth={1.3} />
            <line x1={5} y1={-9.6} x2={9.2} y2={-12.6} stroke="#a9b0b8" strokeWidth={1.5} />
            <line x1={5.35} y1={-10.15} x2={8.9} y2={-12.65} stroke="#eef2f6" strokeWidth={0.8} />
            <line x1={5.4} y1={-10.8} x2={6.2} y2={-9.2} stroke="#8c6b3f" strokeWidth={1.1} />
            <circle cx={4.7} cy={-9.35} r={0.8} fill="#6b4c2a" />
          </g>
        )}

        {arme === 'arc' && (
          <g>
            {tir && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 3 -9;-13 3 -9;-13 3 -9;4 3 -9;0 3 -9"
                keyTimes="0;0.3;0.52;0.6;1"
                dur={durS}
                begin={decal}
                repeatCount="indefinite"
              />
            )}
            {/* arc deux tons : dos du bois dans l'ombre, ventre côté lumière, poignée gainée */}
            <path d="M4.5,-15 Q9,-9.5 4.5,-4" stroke="#6b4c2a" strokeWidth={1.4} fill="none" />
            <path d="M4.3,-15.2 Q8.7,-9.7 4.3,-4.4" stroke="#a8845d" strokeWidth={0.8} fill="none" />
            <line x1={6.35} y1={-10.4} x2={6.75} y2={-8.6} stroke="#4f3a22" strokeWidth={1.1} />
            {tir ? (
              <>
                {/* corde tirée puis relâchée, flèche encochée qui disparaît au départ */}
                <path stroke="#e0d9c8" strokeWidth={0.5} fill="none" d="M4.5,-15 L4.5,-4">
                  <animate
                    attributeName="d"
                    values="M4.5,-15 L4.5,-4;M4.5,-15 L1.8,-9.5 L4.5,-4;M4.5,-15 L1.8,-9.5 L4.5,-4;M4.5,-15 L4.5,-4"
                    keyTimes="0;0.3;0.52;0.6"
                    dur={durS}
                    begin={decal}
                    repeatCount="indefinite"
                  />
                </path>
                <line x1={1.8} y1={-9.5} x2={8.4} y2={-9.5} stroke="#5d4a33" strokeWidth={0.9}>
                  <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.3;0.52;0.56;1" dur={durS} begin={decal} repeatCount="indefinite" />
                </line>
              </>
            ) : (
              <line x1={4.5} y1={-15} x2={4.5} y2={-4} stroke="#e0d9c8" strokeWidth={0.5} />
            )}
          </g>
        )}

        {/* bouclier (à gauche) — bombé : arcs concentriques décalés vers la lumière NW */}
        {arme === 'lance' && (
          <g>
            <circle cx={-4} cy={-8} r={3.5} fill="#4f3d22" />
            <circle cx={-4} cy={-8} r={3} fill="#7c5f38" />
            <circle cx={-4.5} cy={-8.5} r={2.2} fill="#97744a" />
            <circle cx={-5} cy={-9} r={1.3} fill="#b3905f" />
            <circle cx={-4} cy={-8} r={1.05} fill="#4f3d22" />
            <circle cx={-4.2} cy={-8.2} r={0.8} fill="#cbbd91" />
          </g>
        )}
        {arme === 'bouclier-lourd' && (
          <g>
            {/* rive de bronze, champ aux couleurs du camp, umbo doré */}
            <circle cx={-4} cy={-8} r={4.9} fill="#6e5526" />
            <path d="M-8.3,-9.9 A4.9,4.9 0 0 1 -5.4,-12.6" stroke="#dcc36a" strokeWidth={0.8} fill="none" strokeLinecap="round" />
            <circle cx={-4} cy={-8} r={4.15} fill={drapOmbre(tunique)} />
            <circle cx={-4.7} cy={-8.7} r={3.3} fill={tunique} />
            <circle cx={-5.4} cy={-9.4} r={2.2} fill={drapLit(tunique)} />
            <circle cx={-4} cy={-8} r={1.4} fill="#8a6b2e" />
            <circle cx={-4.3} cy={-8.3} r={0.9} fill="#ecd88f" />
          </g>
        )}
      </g>
    </g>
  )
}

function Belier({ enMarche }: { enMarche?: boolean }) {
  return (
    <g>
      <OmbreSol rx={16} ry={3.2} />
      {/* charpente : chevrons deux tons, arête ouest au soleil, ligatures de corde */}
      <line x1={-12} y1={0} x2={-9} y2={-14} stroke="#6b4c2a" strokeWidth={2.6} />
      <line x1={-12.5} y1={0} x2={-9.5} y2={-14} stroke="#a8845d" strokeWidth={0.9} />
      <line x1={12} y1={0} x2={9} y2={-14} stroke="#5f462d" strokeWidth={2.6} />
      <line x1={11.4} y1={0} x2={8.5} y2={-13.6} stroke="#83694a" strokeWidth={0.9} />
      <line x1={-9.9} y1={-12.2} x2={-8.5} y2={-12.6} stroke="#4f3a22" strokeWidth={1} />
      <line x1={9.9} y1={-12.2} x2={8.5} y2={-12.6} stroke="#4f3a22" strokeWidth={1} />
      {/* toit de peaux cousues : pan ouest éclairé, pan est ombré, ourlet qui pend */}
      <path d="M-13,-13 Q-10.8,-11.5 -8.6,-13 Q-6.4,-11.5 -4.2,-13 Q-2,-11.5 0.2,-13 Q2.4,-11.5 4.6,-13 Q6.8,-11.5 9,-13 Q11,-11.5 13,-13 L13,-13.4 L-13,-13.4 Z" fill="#77593a" />
      <path d="M-13,-13.2 L0,-18 L1,-13.2 Z" fill="#a9895f" />
      <path d="M1,-13.2 L0,-18 L13,-13.2 Z" fill="#77593a" />
      <path d="M-8.3,-14.9 L-7,-13.3 M-3.6,-16.6 L-2.2,-13.4" stroke="#8a6a45" strokeWidth={0.8} opacity={0.8} />
      <path d="M4.4,-16.3 L5.6,-13.4 M8.6,-14.7 L9.4,-13.4" stroke="#5d4230" strokeWidth={0.8} opacity={0.8} />
      <path d="M-13,-13.2 L0,-18" stroke="#c9a97a" strokeWidth={0.9} />
      {/* tronc suspendu — au repos pendant la marche, en plein élan au siège */}
      <g>
        {!enMarche && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0;3,0;-7,0;0,0"
            keyTimes="0;0.35;0.55;1"
            dur="1.7s"
            repeatCount="indefinite"
          />
        )}
        {/* suspentes de corde, accrochées sous l'auvent */}
        <line x1={-7} y1={-13.6} x2={-7} y2={-9.6} stroke="#5d4a33" strokeWidth={0.8} />
        <line x1={7} y1={-13.6} x2={7} y2={-9.6} stroke="#5d4a33" strokeWidth={0.8} />
        {/* fût : dessus au soleil, fibre du bois, cul du tronc en bois de bout */}
        <rect x={-15} y={-10} width={30} height={5} rx={2.5} fill="#7c5a30" />
        <rect x={-14.2} y={-9.7} width={28} height={1.7} rx={0.85} fill="#a8845d" />
        <path d="M-11,-6.4 L6,-6.4 M-6,-7.9 L10,-7.9" stroke="#5f462d" strokeWidth={0.8} opacity={0.7} />
        <ellipse cx={14.6} cy={-7.5} rx={1.2} ry={2.3} fill="#5f462d" />
        {/* tête de bélier en bronze : masque, corne enroulée, mufle projeté vers le mur */}
        <circle cx={-15.6} cy={-7.5} r={2.9} fill="#8a6b2e" />
        <path d="M-17.4,-9.7 A2.9,2.9 0 0 0 -18.5,-7.6 L-15.6,-7.5 Z" fill="#b08c35" />
        <path d="M-18.2,-8.3 L-20.6,-6.6 L-17.6,-5.3 Z" fill="#7a5c24" />
        <path d="M-18.2,-8.3 L-20.6,-6.6 L-18.9,-7.5 Z" fill="#c9a441" />
        <circle cx={-14.7} cy={-9.3} r={1.5} fill="#8a6b2e" />
        <circle cx={-14.7} cy={-9.3} r={1.5} fill="none" stroke="#c9a441" strokeWidth={0.9} />
        <circle cx={-14.7} cy={-9.3} r={0.8} fill="#5c471c" />
      </g>
      {/* porteurs sous la carapace */}
      {[-8, 0, 8].map((x) => (
        <g key={x}>
          {enMarche && (
            <animateTransform attributeName="transform" type="rotate" values={`10 ${x} 0;-10 ${x} 0;10 ${x} 0`} dur="0.7s" begin={`${x * 0.03}s`} repeatCount="indefinite" />
          )}
          <path d={`M${x - 1.4},0 L${x - 1},-3.4 L${x + 1},-3.4 L${x + 1.4},0 Z`} fill="#7d3b32" />
          <path d={`M${x - 1.4},0 L${x - 1},-3.4 L${x},-3.4 L${x - 0.2},0 Z`} fill="#9d5847" />
          <circle cx={x} cy={-4.3} r={1.15} fill={PEAU} />
        </g>
      ))}
    </g>
  )
}

interface Look {
  tunique: string
  arme: 'lance' | 'arc' | 'dague' | 'bouclier-lourd'
  taille: number
  crete?: boolean
}

/** allure par type — la couleur de tunique dépend du camp du joueur */
function lookDe(f: Fighter, estJoueur: boolean): Look | 'belier' {
  switch (f.type) {
    case 'belier':
      return 'belier'
    case 'pillard':
      return { tunique: '#7d5a44', arme: 'dague', taille: 0.95 }
    case 'guerrier':
      return { tunique: '#7d3b32', arme: 'lance', taille: 1.05 }
    case 'mercenaire':
      return { tunique: '#5a3140', arme: 'bouclier-lourd', taille: 1.2, crete: true }
    case 'lancier':
      return { tunique: estJoueur ? '#3e5a7a' : '#8a4636', arme: 'lance', taille: 1 }
    case 'archer':
      return { tunique: estJoueur ? '#4a6a5a' : '#7d5a44', arme: 'arc', taille: 0.95 }
    case 'hoplite':
      return { tunique: estJoueur ? '#31506e' : '#6e3348', arme: 'bouclier-lourd', taille: 1.15, crete: true }
  }
}

/** durée de dissolution d'une dépouille (ms) */
export const DUREE_DEPOUILLE = 5200

/** dépouille : la figurine bascule au sol, puis s'efface doucement */
function Depouille({ f, campJoueur, now }: { f: Fighter; campJoueur: 'attaque' | 'defense'; now: number }) {
  const t = (now - (f.mortAt ?? now)) / DUREE_DEPOUILLE
  const look = lookDe(f, f.camp === campJoueur)
  const contenu = look === 'belier' ? <Belier /> : <Bonhomme {...look} />
  const sens = f.camp === 'attaque' ? 82 : -82
  return (
    <g transform={`translate(${f.x},${f.y})`} opacity={Math.max(0, 0.75 * (1 - t))}>
      <g transform={`rotate(${sens})`}>
        {/* la chute : jouée une fois au montage, figée ensuite */}
        <animateTransform
          attributeName="transform"
          type="rotate"
          values={`0;${sens}`}
          keyTimes="0;1"
          calcMode="spline"
          keySplines="0.55 0 0.9 0.6"
          dur="0.45s"
          fill="freeze"
        />
        {contenu}
      </g>
    </g>
  )
}

function FigurineCombattant({
  f,
  campJoueur,
  auContact,
}: {
  f: Fighter
  campJoueur: 'attaque' | 'defense'
  auContact: boolean
}) {
  const estJoueur = f.camp === campJoueur
  const look = lookDe(f, estJoueur)
  const dx = f.tx - f.x
  const dy = f.ty - f.y
  const bouge = Math.hypot(dx, dy) > 6

  // face à sa route, ou à défaut face au camp adverse
  const versLaGauche = Math.abs(dx) > 1 ? dx < 0 : f.camp === 'attaque'

  let anim: Anim = 'idle'
  if (f.etat === 'marche' || f.etat === 'fuite') anim = 'marche'
  else if (f.type === 'archer' && f.camp === 'defense') anim = bouge ? 'marche' : 'tir'
  else if (f.etat === 'siege') anim = 'combat' // on frappe la muraille
  else if (bouge) anim = 'marche'
  else if (auContact) anim = 'combat'

  // cadences réelles : mêlée 2,1 s ; tir 2,6 s ; sape des murs 1,7 s
  const dur = anim === 'tir' ? 2.6 : f.etat === 'siege' ? 1.7 : 2.1

  const contenu =
    look === 'belier' ? (
      <Belier enMarche={f.etat === 'marche'} />
    ) : (
      <Bonhomme {...look} anim={anim} seed={f.seed} dur={dur} />
    )
  const blesse = f.hp < f.maxHp && f.hp > 0

  return (
    <g style={{ transform: `translate(${f.x}px,${f.y}px)`, transition: 'transform 0.3s linear' }}>
      <g transform={versLaGauche ? 'scale(-1,1)' : undefined}>{contenu}</g>
      {blesse && (
        <g transform="translate(0,-22)">
          <rect x={-7} y={0} width={14} height={2.4} rx={1.2} fill="#2b2b2b" opacity={0.7} />
          <rect
            x={-7}
            y={0}
            width={Math.max(1, 14 * (f.hp / f.maxHp))}
            height={2.4}
            rx={1.2}
            fill={estJoueur ? '#3f9d63' : '#c0563f'}
          />
        </g>
      )}
    </g>
  )
}

// ── Couche bataille ──────────────────────────────────────────────────────────
export function BatailleLayer({
  battle,
  now,
  wallHp,
  wallMax,
}: {
  battle: BattleState
  now: number
  wallHp: number
  wallMax: number
}) {
  const vivants = battle.fighters.filter((f) => f.etat !== 'mort')
  const tries = [...vivants].sort((a, b) => a.y - b.y)
  const depouilles = battle.fighters.filter(
    (f) => f.etat === 'mort' && f.hp <= 0 && f.mortAt !== undefined && now - f.mortAt < DUREE_DEPOUILLE,
  )
  const porte = battle.geo.porte

  // « au contact » : un adversaire vivant à portée de coup — déclenche le geste d'attaque
  const contact = (f: Fighter): boolean =>
    vivants.some(
      (o) => o.camp !== f.camp && o.etat !== 'fuite' && Math.hypot(o.x - f.x, o.y - f.y) < 26,
    )

  return (
    <g>
      {depouilles.map((f) => (
        <Depouille key={f.id} f={f} campJoueur={battle.campJoueur} now={now} />
      ))}
      {tries.map((f) => (
        <FigurineCombattant key={f.id} f={f} campJoueur={battle.campJoueur} auContact={contact(f)} />
      ))}

      {/* flèches — tirées en cloche, la pointe suit la trajectoire */}
      {battle.projectiles.map((p) => {
        const d = Math.hypot(p.x1 - p.x0, p.y1 - p.y0)
        const mx = (p.x0 + p.x1) / 2
        const my = (p.y0 + p.y1) / 2 - Math.min(46, 14 + d * 0.16)
        return (
          <g key={p.id}>
            <g>
              <animateMotion dur={`${p.dur}ms`} path={`M${p.x0},${p.y0} Q${mx},${my} ${p.x1},${p.y1}`} fill="freeze" rotate="auto" />
              <line x1={-4.5} y1={0} x2={4} y2={0} stroke="#5d4a33" strokeWidth={1.3} />
              <path d="M4.5,0 l-2.2,-1.3 l0,2.6 Z" fill="#9aa0a8" />
              <path d="M-4.5,0 l-1.8,-1.5 M-4.5,0 l-1.8,1.5 M-3.2,0 l-1.8,-1.5 M-3.2,0 l-1.8,1.5" stroke="#e0d9c8" strokeWidth={0.7} />
            </g>
          </g>
        )
      })}

      {/* effets divins et brèches */}
      {battle.effects.map((e) => {
        if (e.type === 'foudre') {
          return (
            <g key={e.id} opacity={Math.max(0, (e.until - now) / 900)}>
              <path
                d={`M${e.x + 4},${e.y - 120} L${e.x - 5},${e.y - 62} L${e.x + 3},${e.y - 58} L${e.x - 2},${e.y}`}
                stroke="#f5d06c"
                strokeWidth={3}
                fill="none"
              />
              <circle cx={e.x} cy={e.y} r={9} fill="#f5d06c" opacity={0.5} />
            </g>
          )
        }
        if (e.type === 'benediction') {
          return (
            <circle key={e.id} cx={e.x} cy={e.y} r={20} fill="none" stroke="#4fa3a5" strokeWidth={3} opacity={Math.max(0, (e.until - now) / 2000)}>
              <animate attributeName="r" values="8;42" dur="2s" fill="freeze" />
            </circle>
          )
        }
        if (e.type === 'impact') {
          const t = Math.max(0, (e.until - now) / 320)
          return (
            <g key={e.id} transform={`translate(${e.x},${e.y})`} opacity={t}>
              <g transform={`scale(${1.5 - t * 0.6})`}>
                <path d="M0,-4.5 L1.1,-1.1 L4.5,0 L1.1,1.1 L0,4.5 L-1.1,1.1 L-4.5,0 L-1.1,-1.1 Z" fill="#ffe9a8" stroke="#e8913c" strokeWidth={0.6} />
              </g>
              <circle r={5.5 * (1.6 - t * 0.6)} fill="none" stroke="#ffe9a8" strokeWidth={0.8} opacity={t * 0.5} />
            </g>
          )
        }
        if (e.type === 'poussiere') {
          const t = Math.max(0, (e.until - now) / 700)
          return (
            <g key={e.id} opacity={t * 0.7} fill="#c9bfa4">
              <circle cx={e.x - 3} cy={e.y} r={4 + (1 - t) * 6} />
              <circle cx={e.x + 4} cy={e.y - 3} r={3 + (1 - t) * 5} opacity={0.8} />
              <circle cx={e.x + 1} cy={e.y - 7} r={2 + (1 - t) * 4} opacity={0.6} />
            </g>
          )
        }
        // brèche : nuage de poussière
        return (
          <g key={e.id} opacity={Math.max(0, (e.until - now) / 4000)} fill="#b5ab93">
            <circle cx={e.x - 8} cy={e.y - 6} r={8} opacity={0.7}>
              <animate attributeName="r" values="6;14" dur="2.5s" fill="freeze" />
            </circle>
            <circle cx={e.x + 7} cy={e.y - 10} r={6} opacity={0.6}>
              <animate attributeName="r" values="5;12" dur="2.5s" fill="freeze" />
            </circle>
          </g>
        )
      })}

      {/* jauge des remparts pendant l'assaut */}
      {wallMax > 0 && (
        <g transform={`translate(${porte.x - 30},${porte.y - 60})`}>
          <rect x={0} y={0} width={60} height={7} rx={3.5} fill="#1d1d1d" opacity={0.75} />
          <rect x={1} y={1} width={Math.max(2, 58 * (wallHp / wallMax))} height={5} rx={2.5} fill={wallHp / wallMax > 0.4 ? '#8f9d5a' : '#c0563f'} />
          <text x={30} y={-4} textAnchor="middle" fontSize={10} fill="#f0e8d8" fontWeight={700} style={{ paintOrder: 'stroke' }} stroke="#00000088" strokeWidth={2}>
            🧱 {Math.ceil(wallHp)}
          </text>
        </g>
      )}
    </g>
  )
}
