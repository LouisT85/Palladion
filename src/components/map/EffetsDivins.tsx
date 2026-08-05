import { GODS } from '../../game/data'
import { HEROS, type HeroId } from '../../game/heros'
import type { BattleEffect, GodId } from '../../game/types'
import { PAL, alea } from './art'

/*
 * ═══════════════ LA MAIN DES DIEUX, À LA MESURE DE LA FERVEUR ═══════════════
 *
 * Une bénédiction ne se lit pas seulement dans les chiffres : elle se voit.
 * Le palier de ferveur (0 maudit → 6 élu) pilote ici la mise en scène entière -
 * couleur, ampleur, nombre de ramifications, éclat du ciel.
 *
 * Règle non négociable : un dieu OFFENSÉ (palier ≤ 1) produit un visuel PÂLE et
 * AVORTÉ - l'éclair n'atteint pas le sol, l'onde meurt à trois pas, le dôme
 * s'effondre avant d'être tissé. La punition se voit avant de se compter.
 *
 * TOUT est animé en SMIL. La carte ne se re-rend que 4×/s : une animation
 * calculée en JS à chaque rendu avançait par saccades de 250 ms. Ici chaque
 * effet porte sa propre horloge - le navigateur l'interpole à 60 Hz, et le
 * même code sert la bataille (une passe) et l'aperçu du panthéon (en boucle).
 */

/** cinq registres de mise en scène, du châtiment à la gloire */
type Registre = 'avorte' | 'faible' | 'grace' | 'cheri' | 'elu'

function registreDe(palier: number): Registre {
  if (palier <= 1) return 'avorte'
  if (palier <= 3) return 'faible'
  if (palier === 4) return 'grace'
  if (palier === 5) return 'cheri'
  return 'elu'
}

/** horloge d'un effet : P = durée d'un cycle (ms) ; boucle = aperçu du panthéon */
type Tempo = { P: number; boucle: boolean }

/** tout effet reçoit son ancrage au sol, son registre, son tempo et son grain */
type Scene = { x: number; y: number; reg: Registre; tp: Tempo; seed: number }

// ── Petite grammaire d'animation ─────────────────────────────────────────────

/*
 * La chorégraphie s'écrit en FRACTIONS de la vie de l'effet : `t0` → `t1`.
 * `cadrage` étale les valeurs sur cette fenêtre, tient la première avant et la
 * dernière après. Une seule écriture pour les deux usages : en bataille
 * l'animation joue une fois et gèle, dans l'aperçu elle boucle - et comme tout
 * meurt avant t = 0.95, la reprise ne montre aucun saut.
 */
function cadrage(v: (number | string)[], t0: number, t1: number) {
  const kt: string[] = []
  const vv: (number | string)[] = []
  if (t0 > 0.001) {
    kt.push('0')
    vv.push(v[0])
  }
  v.forEach((val, i) => {
    kt.push((v.length === 1 ? t1 : t0 + ((t1 - t0) * i) / (v.length - 1)).toFixed(4))
    vv.push(val)
  })
  if (t1 < 0.999) {
    kt.push('1')
    vv.push(v[v.length - 1])
  }
  return { values: vv.join(';'), keyTimes: kt.join(';') }
}

/** animation d'attribut, placée dans la fenêtre [t0,t1] du cycle */
function A({
  a,
  v,
  t0 = 0,
  t1 = 1,
  tp,
}: {
  a: string
  v: (number | string)[]
  t0?: number
  t1?: number
  tp: Tempo
}) {
  return (
    <animate
      attributeName={a}
      {...cadrage(v, t0, t1)}
      dur={`${tp.P}ms`}
      repeatCount={tp.boucle ? 'indefinite' : 1}
      fill="freeze"
    />
  )
}

/** transformation animée - le groupe visé doit avoir son origine locale au bon endroit */
function AT({
  type,
  v,
  t0 = 0,
  t1 = 1,
  tp,
}: {
  type: 'translate' | 'scale' | 'rotate'
  v: string[]
  t0?: number
  t1?: number
  tp: Tempo
}) {
  return (
    <animateTransform
      attributeName="transform"
      type={type}
      {...cadrage(v, t0, t1)}
      dur={`${tp.P}ms`}
      repeatCount={tp.boucle ? 'indefinite' : 1}
      fill="freeze"
    />
  )
}

/** déplacement le long d'un tracé, cantonné à la fenêtre [t0,t1] */
function AM({ d, t0 = 0, t1 = 1, tp }: { d: string; t0?: number; t1?: number; tp: Tempo }) {
  const kp: string[] = []
  const kt: string[] = []
  if (t0 > 0.001) {
    kp.push('0')
    kt.push('0')
  }
  kp.push('0')
  kt.push(t0.toFixed(4))
  kp.push('1')
  kt.push(t1.toFixed(4))
  if (t1 < 0.999) {
    kp.push('1')
    kt.push('1')
  }
  return (
    <animateMotion
      path={d}
      keyPoints={kp.join(';')}
      keyTimes={kt.join(';')}
      calcMode="linear"
      dur={`${tp.P}ms`}
      repeatCount={tp.boucle ? 'indefinite' : 1}
      fill="freeze"
    />
  )
}

/** battement d'ailes : rapide, indépendant de la fenêtre, cadencé sur le cycle */
function Ailes({ tp, d, teinte, tour }: { tp: Tempo; d: string; teinte: string; tour: number }) {
  return (
    <g>
      <animateTransform
        attributeName="transform"
        type="scale"
        values="1 1;1 -0.55;1 1"
        dur={`${Math.round(tp.P / tour)}ms`}
        repeatCount="indefinite"
      />
      <path d={d} fill={teinte} />
      <path d={`${d}`} fill="none" stroke={teinte} strokeWidth={0.6} opacity={0.5} />
    </g>
  )
}

/** orbite elliptique fermée, démarrée à l'angle a0 : chaque oiseau a sa phase */
function orbite(cx: number, cy: number, rx: number, ry: number, a0: number): string {
  const p = (a: number) => `${(cx + Math.cos(a) * rx).toFixed(1)},${(cy + Math.sin(a) * ry).toFixed(1)}`
  return `M${p(a0)} A${rx.toFixed(1)},${ry.toFixed(1)} 0 0 1 ${p(a0 + Math.PI)} A${rx.toFixed(1)},${ry.toFixed(1)} 0 0 1 ${p(a0)}`
}

// ── ZEUS : l'éclair ──────────────────────────────────────────────────────────

/** zigzag descendant depuis le ciel - dévié par le seed pour que deux coups diffèrent */
function traitFoudre(haut: number, ampl: number, seed: number, bas: number): string {
  const rnd = alea(seed)
  const n = 6
  let d = `M${((rnd() - 0.5) * ampl).toFixed(1)},${(bas - haut).toFixed(1)}`
  for (let i = 1; i <= n; i++) {
    const t = i / n
    d += ` L${((rnd() - 0.5) * ampl * (1 - t * 0.55)).toFixed(1)},${(bas - haut * (1 - t)).toFixed(1)}`
  }
  return d
}

const TONS_ZEUS: Record<Registre, { coeur: string; halo: string; large: number; haut: number; branches: number }> = {
  avorte: { coeur: '#cfc9a8', halo: '#8a866e', large: 2, haut: 62, branches: 1 },
  faible: { coeur: '#f0dc94', halo: '#c9a83c', large: 2.4, haut: 110, branches: 1 },
  grace: { coeur: '#fdf0a8', halo: '#e8c04a', large: 3.2, haut: 150, branches: 1 },
  cheri: { coeur: '#f4fbff', halo: '#9fd4ff', large: 4, haut: 220, branches: 2 },
  elu: { coeur: '#fff2fb', halo: '#c0439a', large: 5, haut: 320, branches: 3 },
}

function Zeus({ x, y, reg, tp, seed }: Scene) {
  const T = TONS_ZEUS[reg]
  const av = reg === 'avorte'
  // l'étincelle d'un dieu offensé s'éteint en plein ciel : elle ne touche personne
  const suspens = av ? 56 : 0

  return (
    <g transform={`translate(${x},${y})`} pointerEvents="none">
      {/* l'élu fend le ciel : toute la scène blanchit un instant */}
      {(reg === 'elu' || reg === 'cheri') && (
        <circle r={reg === 'elu' ? 250 : 150} fill={reg === 'elu' ? '#e8bcdd' : '#c6e4ff'} opacity={0}>
          <A a="opacity" v={[0, reg === 'elu' ? 0.24 : 0.13, 0]} t0={0.01} t1={0.3} tp={tp} />
        </circle>
      )}

      {/* les traits de foudre : tracés en un éclair, puis ils claquent et meurent */}
      {Array.from({ length: T.branches }, (_, i) => {
        const d = traitFoudre(T.haut * (i === 0 ? 1 : 0.6), 16 + i * 10, seed + i * 31, -suspens)
        const t0 = i * 0.05
        return (
          <g key={i} opacity={0}>
            <A
              a="opacity"
              v={av ? [0, 0.5, 0.16, 0.4, 0] : [0, 1, 0.35, 1, 0.6, 0.14, 0]}
              t0={t0}
              t1={av ? 0.3 : 0.52}
              tp={tp}
            />
            <path
              d={d}
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset={100}
              stroke={T.halo}
              strokeWidth={T.large * 3}
              fill="none"
              strokeLinecap="round"
              opacity={0.4}
            >
              <A a="stroke-dashoffset" v={[100, 0]} t0={t0} t1={t0 + 0.05} tp={tp} />
            </path>
            <path
              d={d}
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset={100}
              stroke={T.coeur}
              strokeWidth={T.large}
              fill="none"
              strokeLinecap="round"
            >
              <A a="stroke-dashoffset" v={[100, 0]} t0={t0} t1={t0 + 0.05} tp={tp} />
            </path>
          </g>
        )
      })}

      {/* impact au sol - inexistant quand le dieu se détourne */}
      {!av && (
        <>
          <ellipse rx={9} ry={3.5} fill={T.coeur} opacity={0}>
            <A a="rx" v={[8, 30]} t0={0.03} t1={0.6} tp={tp} />
            <A a="ry" v={[3, 11]} t0={0.03} t1={0.6} tp={tp} />
            <A a="opacity" v={[0, 0.42, 0]} t0={0.02} t1={0.6} tp={tp} />
          </ellipse>
          <circle r={9} fill="none" stroke={T.halo} strokeWidth={2.4} opacity={0}>
            <A a="r" v={[7, 34]} t0={0.04} t1={0.58} tp={tp} />
            <A a="opacity" v={[0, 0.9, 0]} t0={0.04} t1={0.58} tp={tp} />
          </circle>
          {(reg === 'cheri' || reg === 'elu') && (
            <circle r={9} fill="none" stroke={T.coeur} strokeWidth={1.4} opacity={0}>
              <A a="r" v={[9, 58]} t0={0.14} t1={0.8} tp={tp} />
              <A a="opacity" v={[0, 0.55, 0]} t0={0.14} t1={0.8} tp={tp} />
            </circle>
          )}
          {/* éclats projetés par le coup */}
          <g opacity={0}>
            <A a="opacity" v={[0, 0.95, 0]} t0={0.03} t1={0.4} tp={tp} />
            <AT type="scale" v={['0.2', '1.2']} t0={0.03} t1={0.4} tp={tp} />
            {[200, 232, 262, 292, 322, 348].map((deg) => {
              const a = (deg * Math.PI) / 180
              const l = 14 + T.large * 3
              return (
                <line
                  key={deg}
                  x1={Math.cos(a) * 5}
                  y1={Math.sin(a) * 2.4}
                  x2={Math.cos(a) * l}
                  y2={Math.sin(a) * l * 0.5}
                  stroke={T.coeur}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
              )
            })}
          </g>
          {/* brûlure qui refroidit sur le sol, et la fumée qui monte après le coup */}
          <ellipse rx={18} ry={7} fill={T.halo} opacity={0}>
            <A a="rx" v={[14, 24]} t0={0.06} t1={0.95} tp={tp} />
            <A a="opacity" v={[0, 0.4, 0.22, 0]} t0={0.06} t1={0.95} tp={tp} />
          </ellipse>
          {[-4, 3, 8].map((dx, i) => (
            <g key={dx}>
              <AT type="translate" v={['0 0', `${dx} ${-26 - i * 6}`]} t0={0.22 + i * 0.07} t1={0.95} tp={tp} />
              <circle cx={dx * 0.4} cy={-4} r={4} fill="#b8b2a0" opacity={0}>
                <A a="r" v={[3, 9 + i]} t0={0.22 + i * 0.07} t1={0.95} tp={tp} />
                <A a="opacity" v={[0, 0.3, 0]} t0={0.22 + i * 0.07} t1={0.95} tp={tp} />
              </circle>
            </g>
          ))}
        </>
      )}

      {/* l'étincelle avortée se dissout en fumée : le ciel n'a pas répondu */}
      {av && (
        <g transform={`translate(0,${-suspens})`}>
          <circle r={4} fill="#9a9683" opacity={0}>
            <A a="r" v={[3, 13]} t0={0.16} t1={0.5} tp={tp} />
            <A a="opacity" v={[0, 0.28, 0]} t0={0.16} t1={0.5} tp={tp} />
          </circle>
          <circle cx={5} cy={6} r={3} fill="#9a9683" opacity={0}>
            <A a="r" v={[2, 8]} t0={0.2} t1={0.54} tp={tp} />
            <A a="opacity" v={[0, 0.2, 0]} t0={0.2} t1={0.54} tp={tp} />
          </circle>
        </g>
      )}
    </g>
  )
}

// ── POSÉIDON : le sol tremble, l'eau jaillit, la pierre se remboîte ──────────

const TONS_POSEIDON: Record<
  Registre,
  { fond: string; onde: string; ecume: string; anneaux: number; R: number; jets: number; pierres: number }
> = {
  avorte: { fond: '#4a5852', onde: '#6f8478', ecume: '#96a89e', anneaux: 1, R: 30, jets: 1, pierres: 3 },
  faible: { fond: '#1e4c53', onde: '#3f8a86', ecume: '#8fd0c4', anneaux: 2, R: 58, jets: 3, pierres: 4 },
  grace: { fond: '#175a67', onde: '#3fa39a', ecume: '#a8e6db', anneaux: 3, R: 82, jets: 4, pierres: 5 },
  cheri: { fond: '#0f6478', onde: '#35b9c4', ecume: '#c8f4f6', anneaux: 3, R: 112, jets: 5, pierres: 5 },
  elu: { fond: '#0b6e86', onde: '#2fc7d6', ecume: '#f2fdff', anneaux: 4, R: 150, jets: 5, pierres: 5 },
}

/** l'assise se déploie à la mesure de l'onde : cinq blocs le long du mur */
const ECART_PIERRE = (R: number) => Math.max(14, R * 0.18)

function Poseidon({ x, y, reg, tp, seed }: Scene) {
  const T = TONS_POSEIDON[reg]
  const av = reg === 'avorte'
  const R = T.R
  const rnd = alea(seed)
  const grand = reg === 'cheri' || reg === 'elu'

  // le sol tressaute une dizaine de fois, puis se calme
  const secousse = Array.from({ length: 14 }, (_, i) => {
    const amp = (av ? 1.1 : 3) * (1 - i / 14)
    return i === 13 ? '0 0' : `${((rnd() - 0.5) * 2 * amp).toFixed(2)} ${((rnd() - 0.5) * amp).toFixed(2)}`
  })
  const finSecousse = av ? 0.3 : 0.62

  return (
    <g transform={`translate(${x},${y})`} pointerEvents="none">
      {/* nappe d'eau qui affleure sous le choc */}
      <ellipse rx={R * 0.5} ry={R * 0.2} fill={T.fond} opacity={0}>
        <A a="rx" v={[R * 0.25, R * 0.95]} t0={0} t1={av ? 0.3 : 0.7} tp={tp} />
        <A a="ry" v={[R * 0.1, R * 0.38]} t0={0} t1={av ? 0.3 : 0.7} tp={tp} />
        <A a="opacity" v={[0, av ? 0.16 : 0.34, 0]} t0={0} t1={av ? 0.32 : 0.9} tp={tp} />
      </ellipse>

      {/* ondes de choc concentriques qui courent au sol */}
      {Array.from({ length: T.anneaux }, (_, i) => {
        const t0 = i * 0.11
        const t1 = Math.min(av ? 0.32 : 0.92, t0 + (av ? 0.28 : 0.6))
        return (
          <ellipse key={i} rx={8} ry={3} fill="none" stroke={i === 0 ? T.ecume : T.onde} strokeWidth={4} opacity={0}>
            <A a="rx" v={[8, R]} t0={t0} t1={t1} tp={tp} />
            <A a="ry" v={[3, R * 0.4]} t0={t0} t1={t1} tp={tp} />
            <A a="stroke-width" v={[4.4, 0.8]} t0={t0} t1={t1} tp={tp} />
            <A a="opacity" v={[0, av ? 0.4 : 0.95, 0]} t0={t0} t1={t1} tp={tp} />
          </ellipse>
        )
      })}

      {/* gerbes d'écume : l'eau sort de terre le long de l'onde, jamais deux pareilles */}
      {Array.from({ length: T.jets }, (_, i) => {
        const k = T.jets === 1 ? 0.15 : -0.88 + (1.76 * i) / (T.jets - 1)
        const jx = k * R * 0.92
        const jy = -R * 0.3 * Math.sqrt(Math.max(0, 1 - k * k)) * 0.55
        const h = (av ? 13 : 22 + R * 0.3) * (0.62 + 0.34 * (1 - Math.abs(k))) * (0.82 + rnd() * 0.38)
        const e = 1 + R * 0.014 // une gerbe est large : elle jaillit, elle ne perce pas
        const pen = (rnd() - 0.5) * h * 0.3 // la gerbe penche, elle n'est pas un cône
        const t0 = 0.05 + Math.abs(k) * 0.12
        const t1 = Math.min(av ? 0.33 : 0.94, t0 + (av ? 0.24 : 0.56))
        return (
          <g key={i} transform={`translate(${jx.toFixed(1)},${jy.toFixed(1)})`}>
            <g opacity={0}>
              <A a="opacity" v={[0, 1, 0.9, 0]} t0={t0} t1={t1} tp={tp} />
              <AT
                type="scale"
                v={av ? ['1 0.05', '1 0.5', '1 0.1'] : ['1 0.05', '1 1.12', '1 0.9', '1 0.12']}
                t0={t0}
                t1={t1}
                tp={tp}
              />
              {/* lèvre d'eau au ras du sol : la gerbe a une base, pas un socle */}
              <path
                d={`M${(-3.4 * e).toFixed(1)},0 C${(-2.6 * e).toFixed(1)},-3 ${(-1.2 * e).toFixed(1)},-4 0,-4.2 C${(1.4 * e).toFixed(1)},-4 ${(2.8 * e).toFixed(1)},-2.8 ${(3.6 * e).toFixed(1)},0 Z`}
                fill={T.onde}
                opacity={0.5}
                transform="scale(2 1)"
              />
              <path
                d={`M${(-3.4 * e).toFixed(1)},0 C${(-4 * e).toFixed(1)},${(-h * 0.4).toFixed(1)} ${(pen - 2.4 * e).toFixed(1)},${(-h * 0.72).toFixed(1)} ${(pen - 1).toFixed(1)},${(-h).toFixed(1)} C${(pen + 1.8 * e).toFixed(1)},${(-h * 0.7).toFixed(1)} ${(2.8 * e).toFixed(1)},${(-h * 0.38).toFixed(1)} ${(3.6 * e).toFixed(1)},0 Z`}
                fill={T.onde}
                opacity={0.9}
              />
              <path
                d={`M${(-1.7 * e).toFixed(1)},0 C${(-2.2 * e).toFixed(1)},${(-h * 0.44).toFixed(1)} ${(pen - 1.2 * e).toFixed(1)},${(-h * 0.76).toFixed(1)} ${(pen - 0.5).toFixed(1)},${(-h * 1.02).toFixed(1)} C${(pen + 1 * e).toFixed(1)},${(-h * 0.64).toFixed(1)} ${(1.4 * e).toFixed(1)},${(-h * 0.32).toFixed(1)} ${(2 * e).toFixed(1)},0 Z`}
                fill={T.ecume}
              />
              {/* l'eau se disloque en gouttes au sommet */}
              <circle cx={pen - 0.6} cy={-h - 2.4 * e} r={2.1} fill={T.ecume} />
              <circle cx={pen + 3 * e} cy={-h - 6 * e} r={1.3} fill={T.ecume} opacity={0.9} />
              <circle cx={pen - 3.8 * e} cy={-h - 8 * e} r={1} fill={T.ecume} opacity={0.8} />
              <circle cx={pen + 1.6 * e} cy={-h * 0.7} r={1.2} fill={T.ecume} opacity={0.7} />
            </g>
          </g>
        )
      })}

      {/* la pierre : les blocs se soulèvent et se remboîtent, la fissure se referme */}
      <g>
        <AT type="translate" v={secousse} t0={0} t1={finSecousse} tp={tp} />
        {Array.from({ length: T.pierres }, (_, i) => {
          const sx = (i - (T.pierres - 1) / 2) * ECART_PIERRE(R)
          const t0 = 0.06 + i * 0.055
          const t1 = Math.min(av ? 0.34 : 0.9, t0 + (av ? 0.24 : 0.5))
          const lev = av ? 3 : 15 + rnd() * 5
          return (
            <g key={i} transform={`translate(${sx.toFixed(1)},0)`}>
              <g>
                <AT
                  type="translate"
                  v={av ? ['0 5', `0 ${(-lev).toFixed(1)}`, '0 3', '0 5'] : ['0 6', `0 ${(-lev).toFixed(1)}`, '0 -2.5', '0 0', '0 0']}
                  t0={t0}
                  t1={t1}
                  tp={tp}
                />
                <A a="opacity" v={av ? [0, 0.55, 0.4, 0] : [0, 1, 1, 1]} t0={t0} t1={t1} tp={tp} />
                <rect x={-6.5} y={-8} width={13} height={8} rx={0.8} fill={PAL.pierreMi} />
                <path d="M-6.5,-8 L-4.6,-10 L8.4,-10 L6.5,-8 Z" fill={PAL.pierreLit} />
                <path d="M6.5,-8 L8.4,-10 L8.4,-2 L6.5,0 Z" fill={PAL.pierreOmbre} />
                <path d="M-6.5,-8 L-6.5,0 L-5.2,0 L-5.2,-8 Z" fill={PAL.pierreLit} opacity={0.5} />
              </g>
              {!av && (
                <ellipse rx={3} ry={1.4} fill={T.ecume} opacity={0}>
                  <A a="rx" v={[3, 12]} t0={t1 - 0.14} t1={t1 + 0.16} tp={tp} />
                  <A a="opacity" v={[0, 0.45, 0]} t0={t1 - 0.14} t1={t1 + 0.16} tp={tp} />
                </ellipse>
              )}
            </g>
          )
        })}
        {/* fissures : elles se résorbent d'un bout à l'autre - sauf offense, où elles restent béantes */}
        {[-1, 0, 1].map((s, i) => {
          const cx = s * ECART_PIERRE(R) * 1.5
          const d = `M${cx - 8},${4 + i} l4,-3 l-2,4 l6,-2 l3,3.5`
          const t0 = 0.2 + i * 0.06
          return (
            <path
              key={s}
              d={d}
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset={0}
              stroke="#3b3a2c"
              strokeWidth={1.6}
              fill="none"
              strokeLinecap="round"
              opacity={0}
            >
              {!av && <A a="stroke-dashoffset" v={[0, -100]} t0={t0} t1={t0 + 0.42} tp={tp} />}
              <A a="opacity" v={av ? [0, 0.7, 0.7, 0] : [0, 0.75, 0]} t0={0.04} t1={av ? 0.34 : t0 + 0.44} tp={tp} />
            </path>
          )
        })}
      </g>

      {/* le raz-de-marée : une crête d'écume balaie la scène de part en part */}
      {grand && (
        <g opacity={0}>
          <A a="opacity" v={[0, 1, 1, 0]} t0={0.16} t1={0.94} tp={tp} />
          <g>
            <AT type="translate" v={[`${(-R * 1.5).toFixed(0)} 0`, `${(R * 1.5).toFixed(0)} 0`]} t0={0.16} t1={0.94} tp={tp} />
            {(() => {
              // une vraie lame : dos long, crête qui se creuse, lèvre qui se retourne
              const H = R * 0.25
              const L = R * 0.66
              return (
                <>
                  <path
                    d={`M${-L},10 C${-L * 0.66},${(-H * 0.12).toFixed(1)} ${-L * 0.4},${(-H * 0.78).toFixed(1)} ${(L * 0.06).toFixed(1)},${(-H).toFixed(1)} C${(L * 0.34).toFixed(1)},${(-H * 1.04).toFixed(1)} ${(L * 0.5).toFixed(1)},${(-H * 0.5).toFixed(1)} ${(L * 0.62).toFixed(1)},10 Z`}
                    fill={T.fond}
                    opacity={0.6}
                  />
                  <path
                    d={`M${-L * 0.86},10 C${-L * 0.56},${(-H * 0.1).toFixed(1)} ${-L * 0.32},${(-H * 0.66).toFixed(1)} ${(L * 0.1).toFixed(1)},${(-H * 0.86).toFixed(1)} C${(L * 0.32).toFixed(1)},${(-H * 0.86).toFixed(1)} ${(L * 0.42).toFixed(1)},${(-H * 0.38).toFixed(1)} ${(L * 0.52).toFixed(1)},10 Z`}
                    fill={T.onde}
                    opacity={0.75}
                  />
                  {/* la lèvre d'écume se retourne vers l'avant */}
                  <path
                    d={`M${(L * 0.06).toFixed(1)},${(-H).toFixed(1)} C${(L * 0.36).toFixed(1)},${(-H * 1.1).toFixed(1)} ${(L * 0.52).toFixed(1)},${(-H * 0.86).toFixed(1)} ${(L * 0.5).toFixed(1)},${(-H * 0.52).toFixed(1)} C${(L * 0.4).toFixed(1)},${(-H * 0.8).toFixed(1)} ${(L * 0.2).toFixed(1)},${(-H * 0.9).toFixed(1)} ${(L * 0.06).toFixed(1)},${(-H).toFixed(1)} Z`}
                    fill={T.ecume}
                  />
                  <path
                    d={`M${-L * 0.8},8 C${-L * 0.5},2 ${-L * 0.28},${(-H * 0.62).toFixed(1)} ${(L * 0.06).toFixed(1)},${(-H * 0.96).toFixed(1)}`}
                    fill="none"
                    stroke={T.ecume}
                    strokeWidth={3}
                    strokeLinecap="round"
                    opacity={0.8}
                  />
                  {/* embruns arrachés à la crête */}
                  {[0.16, 0.3, 0.44, 0.58].map((u, i) => (
                    <circle
                      key={u}
                      cx={L * (0.08 + u * 0.4)}
                      cy={-H * (1.06 + u * 0.4)}
                      r={2.8 - i * 0.5}
                      fill={T.ecume}
                      opacity={0.85}
                    />
                  ))}
                  {/* traîne d'écume qui reste au sol derrière la lame */}
                  <ellipse cx={-L * 0.45} cy={8} rx={L * 0.5} ry={4.5} fill={T.ecume} opacity={0.3} />
                </>
              )
            })()}
          </g>
        </g>
      )}
    </g>
  )
}

// ── ATHÉNA : le dôme tissé, la chouette, l'égide ─────────────────────────────

const TONS_ATHENA: Record<Registre, { halo: string; trait: string; r: number; fils: number }> = {
  avorte: { halo: '#8d8f8a', trait: '#a7a9a4', r: 32, fils: 2 },
  faible: { halo: '#b9c1c6', trait: '#dfe5e8', r: 48, fils: 2 },
  grace: { halo: '#e2d6a8', trait: '#f4ecc9', r: 64, fils: 3 },
  cheri: { halo: '#e8c04a', trait: '#fbeeb4', r: 82, fils: 3 },
  elu: { halo: '#f0d264', trait: '#fff8dc', r: 100, fils: 4 },
}

/** arc de dôme en anse de panier : demi-largeur w, sommet à -h */
function arcDome(w: number, h: number): string {
  return `M${-w},0 C${-w},${(-h * 1.34).toFixed(1)} ${w},${(-h * 1.34).toFixed(1)} ${w},0`
}

function Athena({ x, y, reg, tp }: Scene) {
  const T = TONS_ATHENA[reg]
  const av = reg === 'avorte'
  const r = T.r
  const grand = reg === 'cheri' || reg === 'elu'
  const ech = Math.max(0.75, r / 80)

  return (
    <g transform={`translate(${x},${y})`} pointerEvents="none">
      {/* cercles d'or au sol : l'égide prend appui sur la terre */}
      {grand &&
        [0, 1, 2].map((i) => {
          const t0 = 0.1 + i * 0.16
          return (
            <ellipse key={i} rx={r * 0.4} ry={r * 0.13} fill="none" stroke={T.halo} strokeWidth={1.8} opacity={0}>
              <A a="rx" v={[r * 0.35, r * 1.05]} t0={t0} t1={t0 + 0.55} tp={tp} />
              <A a="ry" v={[r * 0.11, r * 0.34]} t0={t0} t1={t0 + 0.55} tp={tp} />
              <A a="opacity" v={[0, 0.6, 0]} t0={t0} t1={t0 + 0.55} tp={tp} />
            </ellipse>
          )
        })}

      {/* LE DÔME : il se déploie d'un coup, tient, puis se retire.
          Offensé, il monte à peine et s'affaisse aussitôt. */}
      <g opacity={0}>
        <A a="opacity" v={av ? [0, 0.5, 0.3, 0] : [0, 1, 1, 1, 0]} t0={0} t1={av ? 0.34 : 0.94} tp={tp} />
        <g>
          <AT
            type="scale"
            v={av ? ['0.34 0.06', '0.44 0.4', '0.46 0.1'] : ['0.3 0.08', '1.06 1.05', '1 1', '1 1', '0.96 0.9']}
            t0={0}
            t1={av ? 0.34 : 0.94}
            tp={tp}
          />
          {/* corps lumineux : trois voiles emboîtés, le cœur plus dense que le bord */}
          <path d={arcDome(r, r)} fill={T.halo} opacity={0.1} />
          <path d={arcDome(r * 0.74, r * 0.82)} fill={T.halo} opacity={0.09} />
          <path d={arcDome(r * 0.44, r * 0.56)} fill={T.trait} opacity={0.08} />
          <path d={arcDome(r, r)} fill="none" stroke={T.halo} strokeWidth={2.6} strokeLinecap="round" />
          <path d={arcDome(r * 0.965, r * 0.97)} fill="none" stroke={T.trait} strokeWidth={0.9} opacity={0.5} />
          <ellipse rx={r} ry={r * 0.3} fill="none" stroke={T.halo} strokeWidth={1.2} opacity={0.4} />
          {/* voile tissé : quelques fils seulement, qui scintillent en décalé */}
          {Array.from({ length: T.fils }, (_, i) => {
            const w = r * (0.3 + (0.6 * i) / Math.max(1, T.fils - 1))
            return (
              <path key={`m${i}`} d={arcDome(w, r * 0.99)} fill="none" stroke={T.trait} strokeWidth={0.7} opacity={0.24}>
                <A a="opacity" v={[0.12, 0.46, 0.18, 0.4, 0.14]} t0={i * 0.07} t1={0.95} tp={tp} />
              </path>
            )
          })}
          {[0.42, 0.74].map((h, i) => {
            const rr = r * Math.sqrt(Math.max(0.02, 1 - h * h))
            return (
              <path
                key={`p${h}`}
                d={`M${-rr},${-r * h} A${rr},${rr * 0.3} 0 0 0 ${rr},${-r * h}`}
                fill="none"
                stroke={T.trait}
                strokeWidth={0.8}
                opacity={0.26}
              >
                <A a="opacity" v={[0.14, 0.5, 0.2, 0.44, 0.16]} t0={0.03 + i * 0.09} t1={0.95} tp={tp} />
              </path>
            )
          })}
          {/* arête de lumière au sommet, côté nord-ouest */}
          <path
            d={`M${-r * 0.5},${-r * 0.86} C${-r * 0.24},${-r * 1.04} ${r * 0.1},${-r * 1.04} ${r * 0.3},${-r * 0.94}`}
            fill="none"
            stroke={T.trait}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.65}
          />
        </g>
      </g>

      {/* le voile qui se défait : trois fils tombent quand la déesse se détourne */}
      {av &&
        [-10, 2, 12].map((dx, i) => (
          <g key={dx}>
            <g>
              <AT type="translate" v={['0 0', `${dx * 0.2} 14`]} t0={0.12 + i * 0.04} t1={0.36} tp={tp} />
              <line
                x1={dx}
                y1={-18}
                x2={dx + 2}
                y2={-11}
                stroke={T.trait}
                strokeWidth={1.2}
                strokeLinecap="round"
                opacity={0}
              >
                <A a="opacity" v={[0, 0.5, 0]} t0={0.12 + i * 0.04} t1={0.36} tp={tp} />
              </line>
            </g>
          </g>
        ))}

      {/* la chouette traverse le dôme d'un bord à l'autre */}
      {!av && reg !== 'faible' && (
        <g opacity={0}>
          <A a="opacity" v={[0, 1, 1, 0]} t0={0.14} t1={0.82} tp={tp} />
          <g>
            <AM
              d={`M${-r * 1.45},${-r * 0.5} Q0,${-r * 1.34} ${r * 1.45},${-r * 0.46}`}
              t0={0.14}
              t1={0.82}
              tp={tp}
            />
            <g transform={`scale(${ech.toFixed(2)})`}>
              <Ailes tp={tp} d="M-2,-1 C-7,-5.5 -12.5,-4.5 -15,-1 C-10.5,0.4 -6,1 -2,1.4 Z" teinte="#8a7c5e" tour={9} />
              <Ailes tp={tp} d="M2,-1 C7,-5.5 12.5,-4.5 15,-1 C10.5,0.4 6,1 2,1.4 Z" teinte="#6d6149" tour={9} />
              <ellipse cy={1} rx={4.8} ry={5.6} fill="#a2946f" />
              <ellipse cx={-1.3} cy={0.4} rx={3.1} ry={4.2} fill="#e6dab4" />
              <circle cy={-4.6} r={4.4} fill="#cfc09a" />
              <circle cx={-1.4} cy={-5.4} r={1.2} fill="#f8f2dc" />
              <circle cx={-1.8} cy={-5} r={2.1} fill="none" stroke="#7d7053" strokeWidth={0.8} />
              <circle cx={1.8} cy={-5} r={2.1} fill="none" stroke="#7d7053" strokeWidth={0.8} />
              <circle cx={-1.8} cy={-5} r={1.5} fill="#fbf5e2" />
              <circle cx={1.8} cy={-5} r={1.5} fill="#fbf5e2" />
              <circle cx={-1.8} cy={-5} r={0.8} fill="#2b2a24" />
              <circle cx={1.8} cy={-5} r={0.8} fill="#2b2a24" />
              <path d="M0,-3.8 L-1.1,-1.9 L1.1,-1.9 Z" fill="#e0a63f" />
              <path d="M-3.6,-7.6 L-2.4,-10 L-1,-7.8 Z" fill="#b8a97f" />
              <path d="M3.6,-7.6 L2.4,-10 L1,-7.8 Z" fill="#8f8264" />
            </g>
          </g>
        </g>
      )}

      {/* L'ÉGIDE DE L'ÉLU : la Gorgone tourne lentement, ses serpents se tordent */}
      {reg === 'elu' && (
        <g transform={`translate(0,${(-r * 0.56).toFixed(1)}) scale(${(r / 68).toFixed(2)})`} opacity={0}>
          <A a="opacity" v={[0, 1, 1, 0]} t0={0.18} t1={0.92} tp={tp} />
          <g>
            <AT type="rotate" v={['0', '34']} t0={0.18} t1={0.92} tp={tp} />
            {/* chevelure de serpents : chacun se tord autour du centre de l'égide */}
            {Array.from({ length: 9 }, (_, i) => {
              const a = ((i / 9) * 360).toFixed(1)
              return (
                <g key={i} transform={`rotate(${a})`}>
                  <g>
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      values={i % 2 ? '-8;8;-8' : '8;-8;8'}
                      dur={`${Math.round(tp.P / 2.5)}ms`}
                      repeatCount="indefinite"
                    />
                    <path
                      d="M14,0 C20,-5 26,-1 29,-5 C31,-7.5 33,-6 33,-3.6"
                      fill="none"
                      stroke="#5f7f42"
                      strokeWidth={3.4}
                      strokeLinecap="round"
                    />
                    <path
                      d="M14,-1.2 C19.6,-6 25.4,-2.2 28.6,-6"
                      fill="none"
                      stroke="#9dbd6e"
                      strokeWidth={1.1}
                      opacity={0.75}
                    />
                    <ellipse cx={33.4} cy={-3.4} rx={2.4} ry={1.7} fill="#7fa05c" transform="rotate(-24 33.4 -3.4)" />
                    <circle cx={34.4} cy={-4} r={0.5} fill="#e8c04a" />
                  </g>
                </g>
              )
            })}
            {/* cercles concentriques d'or - le bouclier lui-même */}
            <circle r={19} fill="#2b3a2b" />
            <circle r={19} fill="none" stroke={T.halo} strokeWidth={2.6} />
            <circle r={15.4} fill="none" stroke={T.trait} strokeWidth={1} opacity={0.65} />
            {Array.from({ length: 8 }, (_, i) => {
              const b = (i / 8) * Math.PI * 2
              return <circle key={i} cx={Math.cos(b) * 17.2} cy={Math.sin(b) * 17.2} r={1} fill={T.trait} opacity={0.8} />
            })}
            <circle r={23} fill="none" stroke={T.halo} strokeWidth={1.2} opacity={0.5}>
              <A a="r" v={[21, 28, 21]} t0={0.2} t1={0.9} tp={tp} />
            </circle>
            {/* LA FACE QUI PÉTRIFIE : mufle large, crocs sortis, langue pendante */}
            <ellipse cy={0.5} rx={11.4} ry={12.4} fill="#8ea677" />
            <ellipse cx={-2.4} cy={-1.5} rx={8} ry={9.4} fill="#a8bd8c" />
            <path d="M-10,-5.6 Q-5.6,-9 -1.6,-6" fill="none" stroke="#41522f" strokeWidth={2.2} strokeLinecap="round" />
            <path d="M10,-5.6 Q5.6,-9 1.6,-6" fill="none" stroke="#41522f" strokeWidth={2.2} strokeLinecap="round" />
            <path d="M-8.6,-2.6 Q-5.6,-5.6 -2.2,-2.8 Q-5.4,-0.4 -8.6,-2.6 Z" fill="#f6f0d8" />
            <path d="M8.6,-2.6 Q5.6,-5.6 2.2,-2.8 Q5.4,-0.4 8.6,-2.6 Z" fill="#f6f0d8" />
            <circle cx={-5.4} cy={-2.6} r={1.5} fill="#20261f" />
            <circle cx={5.4} cy={-2.6} r={1.5} fill="#20261f" />
            <path d="M-1.6,-1 L-2.8,3 L1.4,3 L0.2,-1 Z" fill="#6f8757" opacity={0.8} />
            <path d="M-7,4.2 Q0,5.6 7,4.2 Q5.2,10.6 0,11 Q-5.2,10.6 -7,4.2 Z" fill="#3c211c" />
            <path d="M-5.2,4.6 L-3.4,7.6 L-1.8,4.6 Z" fill="#f6f0d8" />
            <path d="M5.2,4.6 L3.4,7.6 L1.8,4.6 Z" fill="#f6f0d8" />
            <path d="M-1.8,8.4 Q0,13.4 1.8,8.4 Z" fill="#b0453a" />
          </g>
        </g>
      )}
    </g>
  )
}

// ── ARÈS : la brume rouge, la braise, les corbeaux ───────────────────────────

const TONS_ARES: Record<Registre, { brume: string; braise: string; R: number; corbeaux: number; braises: number }> = {
  avorte: { brume: '#7d6a66', braise: '#9c8a84', R: 26, corbeaux: 0, braises: 3 },
  faible: { brume: '#9a4a3c', braise: '#c07a52', R: 44, corbeaux: 0, braises: 6 },
  grace: { brume: '#b34a34', braise: '#e8913c', R: 60, corbeaux: 0, braises: 9 },
  cheri: { brume: '#c0402c', braise: '#ffb04a', R: 78, corbeaux: 2, braises: 12 },
  elu: { brume: '#a81b16', braise: '#ffd06a', R: 98, corbeaux: 3, braises: 13 },
}

function Ares({ x, y, reg, tp, seed }: Scene) {
  const T = TONS_ARES[reg]
  const av = reg === 'avorte'
  const R = T.R
  const rnd = alea(seed)
  const grand = reg === 'cheri' || reg === 'elu'

  return (
    <g transform={`translate(${x},${y})`} pointerEvents="none">
      {/* le sol rougeoie sous la fureur */}
      {!av && (
        <>
          <ellipse rx={R * 0.9} ry={R * 0.34} fill={T.brume} opacity={0}>
            <A a="rx" v={[R * 0.4, R * 1.05]} t0={0} t1={0.5} tp={tp} />
            <A a="ry" v={[R * 0.16, R * 0.4]} t0={0} t1={0.5} tp={tp} />
            <A a="opacity" v={[0, grand ? 0.5 : 0.34, 0]} t0={0} t1={0.92} tp={tp} />
          </ellipse>
          {grand && (
            <>
              <ellipse rx={R * 0.5} ry={R * 0.19} fill="#e0331c" opacity={0}>
                <A a="rx" v={[R * 0.3, R * 0.66]} t0={0.03} t1={0.6} tp={tp} />
                <A a="opacity" v={[0, 0.5, 0.2, 0]} t0={0.03} t1={0.9} tp={tp} />
              </ellipse>
              {/* le sol lui-même rougeoie, braise sous la cendre */}
              <ellipse rx={R * 0.26} ry={R * 0.1} fill="#ff8a3c" opacity={0}>
                <A a="rx" v={[R * 0.16, R * 0.38]} t0={0.05} t1={0.62} tp={tp} />
                <A a="opacity" v={[0, 0.55, 0.24, 0]} t0={0.05} t1={0.88} tp={tp} />
              </ellipse>
              {[-0.55, -0.2, 0.24, 0.6].map((u, i) => (
                <ellipse
                  key={u}
                  cx={u * R * 0.8}
                  cy={u * u * R * 0.1 - 2}
                  rx={R * 0.14}
                  ry={R * 0.035}
                  fill="#ff7a34"
                  opacity={0}
                >
                  <A a="opacity" v={[0, 0.34, 0.14, 0]} t0={0.08 + i * 0.05} t1={0.9} tp={tp} />
                </ellipse>
              ))}
            </>
          )}
        </>
      )}

      {/* brume sanglante qui monte du sol - offensée, elle s'aplatit et crève */}
      {Array.from({ length: av ? 2 : 4 }, (_, i) => {
        const dx = (rnd() - 0.5) * R * 1.1
        const h = av ? 4 : 12 + rnd() * R * 0.34
        const t0 = i * 0.09
        const t1 = av ? 0.32 : Math.min(0.94, t0 + 0.7)
        return (
          <g key={i}>
            <AT type="translate" v={['0 4', `${(dx * 0.2).toFixed(1)} ${(-h).toFixed(1)}`]} t0={t0} t1={t1} tp={tp} />
            <ellipse cx={dx.toFixed(1)} cy={-6} rx={R * 0.34} ry={R * 0.2} fill={T.brume} opacity={0}>
              <A a="rx" v={[R * 0.22, R * 0.52]} t0={t0} t1={t1} tp={tp} />
              <A a="ry" v={[R * 0.1, av ? R * 0.12 : R * 0.26]} t0={t0} t1={t1} tp={tp} />
              <A a="opacity" v={[0, av ? 0.3 : 0.26, 0]} t0={t0} t1={t1} tp={tp} />
            </ellipse>
            {/* crête éclairée par en dessous : la brume a un volume */}
            {!av && (
              <ellipse cx={dx * 0.9 - R * 0.06} cy={-R * 0.16} rx={R * 0.2} ry={R * 0.1} fill={T.braise} opacity={0}>
                <A a="rx" v={[R * 0.12, R * 0.3]} t0={t0} t1={t1} tp={tp} />
                <A a="opacity" v={[0, 0.22, 0]} t0={t0} t1={t1} tp={tp} />
              </ellipse>
            )}
          </g>
        )
      })}

      {/* braises : elles montent en tourbillonnant. Chez le dieu offensé, elles retombent. */}
      {Array.from({ length: T.braises }, (_, i) => {
        const dx = (rnd() - 0.5) * R * 1.5
        const h = av ? -(6 + rnd() * 8) : 26 + rnd() * R * 0.9
        const der = (rnd() - 0.5) * 22
        const rr = (av ? 0.9 : 1.5) + rnd() * (av ? 0.8 : 2.2)
        const t0 = 0.02 + rnd() * (av ? 0.14 : 0.42)
        const t1 = Math.min(av ? 0.33 : 0.95, t0 + (av ? 0.2 : 0.48))
        return (
          <circle key={i} r={rr} fill={i % 3 === 0 ? '#fff0c0' : T.braise} opacity={0}>
            <AM
              d={`M${dx.toFixed(1)},0 q${(der * 0.5).toFixed(1)},${(-h * 0.5).toFixed(1)} ${(der).toFixed(1)},${(-h).toFixed(1)}`}
              t0={t0}
              t1={t1}
              tp={tp}
            />
            <A a="opacity" v={[0, av ? 0.5 : 0.95, 0]} t0={t0} t1={t1} tp={tp} />
            <A a="r" v={[rr, rr * 0.25]} t0={t0} t1={t1} tp={tp} />
          </circle>
        )
      })}

      {/* aura sanglante */}
      {!av && reg !== 'faible' && (
        <>
          {[0, 1].map((i) => {
            const t0 = 0.06 + i * 0.24
            return (
              <ellipse key={i} rx={R * 0.5} ry={R * 0.2} fill="none" stroke={T.brume} strokeWidth={3} opacity={0}>
                <A a="rx" v={[R * 0.45, R * 1.1]} t0={t0} t1={t0 + 0.56} tp={tp} />
                <A a="ry" v={[R * 0.18, R * 0.44]} t0={t0} t1={t0 + 0.56} tp={tp} />
                <A a="stroke-width" v={[3.4, 0.8]} t0={t0} t1={t0 + 0.56} tp={tp} />
                <A a="opacity" v={[0, 0.6, 0]} t0={t0} t1={t0 + 0.56} tp={tp} />
              </ellipse>
            )
          })}
        </>
      )}

      {/* les corbeaux tournoient au-dessus du carnage */}
      {Array.from({ length: T.corbeaux }, (_, i) => {
        const a0 = (i / T.corbeaux) * Math.PI * 2
        // ils tournent bas, dans la lueur : un corbeau noir sur ciel de nuit ne se voit pas
        return (
          <g key={i} opacity={0}>
            <A a="opacity" v={[0, 1, 1, 0]} t0={0.1} t1={0.92} tp={tp} />
            <g>
              <animateMotion
                path={orbite(0, -R * 0.46, R * 0.95, R * 0.26, a0)}
                dur={`${Math.round(tp.P * 1.15)}ms`}
                repeatCount="indefinite"
              />
              <g transform="scale(1.55)">
                <Ailes tp={tp} d="M-1.5,-0.6 C-5,-4.8 -9.5,-4.4 -12.5,-1 C-8.5,0.2 -4.5,0.8 -1.5,1.1 Z" teinte="#2f2429" tour={7} />
                <Ailes tp={tp} d="M1.5,-0.6 C5,-4.8 9.5,-4.4 12.5,-1 C8.5,0.2 4.5,0.8 1.5,1.1 Z" teinte="#221a1e" tour={7} />
                <ellipse cy={0.6} rx={5} ry={2.2} fill="#2b2326" />
                <circle cx={4.4} cy={-1.2} r={2.1} fill="#2b2326" />
                <path d="M6.1,-1.2 L9,-0.3 L6.1,0.7 Z" fill="#8a6a44" />
                <path d="M-5,0.8 L-9.4,2.6 L-4.8,1.9 Z" fill="#241d20" />
                <circle cx={4.9} cy={-1.7} r={0.7} fill="#ffb04a" />
                {/* liseré chaud sur le dos et l'aile : la lueur du sol les découpe */}
                <path d="M-4.4,-1.6 C-1.6,-2.6 1.8,-2.6 4,-1.9" fill="none" stroke="#a4472c" strokeWidth={0.9} opacity={0.9} />
                <path d="M-2,-0.9 C-5,-3.9 -8.4,-3.7 -11,-1.2" fill="none" stroke="#8e3a26" strokeWidth={0.8} opacity={0.7} />
              </g>
            </g>
          </g>
        )
      })}
    </g>
  )
}

const PAR_DIEU: Record<GodId, (p: Scene) => JSX.Element> = {
  zeus: Zeus,
  poseidon: Poseidon,
  athena: Athena,
  ares: Ares,
}

/** manifestation d'un dieu, mise en scène selon la ferveur qu'on lui porte */
export function EffetDivin({ e }: { e: BattleEffect; now: number }) {
  const dieu = e.dieu ?? 'zeus'
  const Rendu = PAR_DIEU[dieu]
  const debut = e.debut ?? e.until - 2200
  return (
    <Rendu
      x={e.x}
      y={e.y}
      reg={registreDe(e.palier ?? 3)}
      tp={{ P: Math.max(700, e.until - debut), boucle: false }}
      seed={Math.round(e.x * 7 + e.y)}
    />
  )
}

/**
 * Intervention d'un héros : un cercle aux couleurs de sa maison, son emblème
 * au centre, et une onde de choc qui part de lui. Court, net, reconnaissable.
 */
export function EffetHeros({ e }: { e: BattleEffect; now: number }) {
  const def = HEROS[e.heros as HeroId]
  if (!def) return null
  const debut = e.debut ?? e.until - 2200
  const tp: Tempo = { P: Math.max(700, e.until - debut), boucle: false }
  return (
    <g transform={`translate(${e.x},${e.y})`} opacity={0} pointerEvents="none">
      <A a="opacity" v={[0, 1, 1, 0]} t0={0} t1={0.96} tp={tp} />
      <circle r={26} fill="none" stroke={def.couleur} strokeWidth={3} opacity={0}>
        <A a="r" v={[24, 70]} t0={0} t1={0.7} tp={tp} />
        <A a="opacity" v={[0, 0.6, 0]} t0={0} t1={0.7} tp={tp} />
      </circle>
      <circle r={26} fill={def.couleur} opacity={0.16} />
      <circle r={26} fill="none" stroke={def.couleur} strokeWidth={2.4} />
      <text y={8} textAnchor="middle" fontSize={22}>
        {def.emoji}
      </text>
      <text
        y={-32}
        textAnchor="middle"
        fontSize={11.5}
        fontWeight={700}
        fill="#f4ecd8"
        stroke="#0d1722"
        strokeWidth={2.6}
        style={{ paintOrder: 'stroke' }}
      >
        {def.nom}
      </text>
    </g>
  )
}

// ── L'APERÇU DU PANTHÉON ─────────────────────────────────────────────────────

/*
 * Le panthéon montrait l'effet de bataille tel quel dans un carré de 74 px :
 * un éclair de 320 px de haut n'y laissait qu'un trait vertical qui sortait du
 * cadre. On lui donne ici sa propre scène : l'empreinte réelle de l'effet dicte
 * l'échelle, rien n'est rogné, et la nuit + le sol + trois silhouettes disent
 * ce que la bénédiction fait vraiment au champ de bataille.
 */

/** encombrement de l'effet : largeur, hauteur au-dessus du sol, débord dessous */
function empreinte(dieu: GodId, reg: Registre): { l: number; haut: number; bas: number } {
  switch (dieu) {
    case 'zeus': {
      const T = TONS_ZEUS[reg]
      return { l: 84, haut: T.haut + (reg === 'avorte' ? 56 : 0) + 22, bas: 22 }
    }
    case 'poseidon': {
      const R = TONS_POSEIDON[reg].R
      return { l: R * 2.4, haut: 34 + R * 0.62, bas: R * 0.42 + 12 }
    }
    case 'athena': {
      const r = TONS_ATHENA[reg].r
      return { l: r * 2.5, haut: r * (reg === 'elu' ? 1.5 : 1.18) + 16, bas: r * 0.36 + 10 }
    }
    case 'ares': {
      const R = TONS_ARES[reg].R
      return { l: R * 2.6, haut: R * 1.05 + 34, bas: R * 0.36 + 10 }
    }
  }
}

/** silhouettes de nuit : on comprend sur qui le dieu porte la main */
function Figurants({ dieu, cy, cx, mur }: { dieu: GodId; cy: number; cx: number; mur: number }) {
  const bonhomme = (bx: number, h: number, teinte: string) => (
    <g key={bx} transform={`translate(${bx},${cy})`}>
      <ellipse cy={1} rx={h * 0.32} ry={h * 0.1} fill="#050b12" opacity={0.4} />
      <path d={`M${-h * 0.2},0 L${-h * 0.14},${-h * 0.62} L${h * 0.14},${-h * 0.62} L${h * 0.2},0 Z`} fill={teinte} />
      <circle cy={-h * 0.74} r={h * 0.15} fill={teinte} />
      <path d={`M${-h * 0.2},0 L${-h * 0.14},${-h * 0.62} L${-h * 0.05},${-h * 0.62} L${-h * 0.1},0 Z`} fill="#3a5470" />
    </g>
  )
  if (dieu === 'poseidon') {
    // le pan de rempart que le dieu relève : cadré sur l'assise qui se remboîte
    const g = cx - mur / 2
    const n = Math.max(3, Math.round(mur / 12))
    return (
      <g>
        <rect x={g} y={cy - 8} width={mur} height={9} fill="#1b2c3d" />
        <rect x={g} y={cy - 9.6} width={mur} height={2.2} fill="#2a4056" />
        {Array.from({ length: n }, (_, i) => (
          <rect key={i} x={g + 1 + (i * (mur - 6)) / n} y={cy - 13} width={(mur - 6) / (n * 1.9)} height={3.6} fill="#22364a" />
        ))}
        {bonhomme(g - 7, 14, '#243a51')}
      </g>
    )
  }
  const teinte = dieu === 'ares' ? '#2d2130' : '#243a51'
  return <g>{[cx - 12, cx, cx + 13].map((bx, i) => bonhomme(bx, 15 + i * 1.5, teinte))}</g>
}

/**
 * Aperçu animé d'une manifestation, pour le panthéon : le joueur voit à quoi
 * ressemble le bras de son dieu, à sa ferveur du moment, avant de le payer.
 */
export function ApercuDivin({
  dieu,
  palier,
  largeur = 104,
  hauteur = 78,
}: {
  dieu: GodId
  palier: number
  largeur?: number
  hauteur?: number
}) {
  const reg = registreDe(palier)
  const Rendu = PAR_DIEU[dieu]
  const FW = 120
  const FH = 90
  const marge = 5
  /*
   * L'échelle découle de l'encombrement réel : on cadre, on ne rogne pas. Mais
   * les registres punis empruntent le cadrage de « en grâce » - sinon un effet
   * avorté, zoomé pour remplir la vignette, aurait l'air aussi ample qu'une
   * faveur. Le châtiment doit se voir PETIT dans un monde de taille constante.
   */
  const emp = empreinte(dieu, reg === 'avorte' || reg === 'faible' ? 'grace' : reg)
  const k = Math.min((FW - 2 * marge) / emp.l, (FH - 2 * marge) / (emp.haut + emp.bas), 1.2)
  const cy = FH - marge - emp.bas * k
  // le rempart de la vignette épouse l'assise que Poséidon remboîte
  const p = TONS_POSEIDON[reg]
  const mur = Math.min(FW - 16, (p.pierres - 1) * ECART_PIERRE(p.R) * k + 26)
  const id = `apd-${dieu}-${palier}`
  const teinteDieu = GODS[dieu].couleur

  return (
    <svg width={largeur} height={hauteur} viewBox={`0 0 ${FW} ${FH}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-ciel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#050c15" />
          <stop offset="70%" stopColor="#0c1a27" />
          <stop offset="100%" stopColor="#16283a" />
        </linearGradient>
        <radialGradient id={`${id}-lueur`} cx="0.5" cy="1" r="0.85">
          <stop offset="0%" stopColor={teinteDieu} stopOpacity={0.3} />
          <stop offset="100%" stopColor={teinteDieu} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${id}-sol`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a3324" />
          <stop offset="100%" stopColor="#141b16" />
        </linearGradient>
      </defs>

      {/* nuit, lueur d'horizon aux couleurs du dieu, sol */}
      <rect width={FW} height={FH} fill={`url(#${id}-ciel)`} />
      <ellipse cx={FW / 2} cy={cy} rx={FW * 0.62} ry={FH * 0.5} fill={`url(#${id}-lueur)`} />
      <rect y={cy} width={FW} height={FH - cy} fill={`url(#${id}-sol)`} />
      <rect y={cy - 1} width={FW} height={1.4} fill="#3d4a34" opacity={0.7} />

      <Figurants dieu={dieu} cy={cy} cx={FW / 2} mur={mur} />

      <g transform={`translate(${FW / 2},${cy}) scale(${k.toFixed(3)})`}>
        {/* la boucle dure ce que dure la vraie manifestation : l'éclair claque, l'égide
            s'attarde - et l'effet avorté se rejoue vite, car son échec est le message */}
        <Rendu
          x={0}
          y={0}
          reg={reg}
          tp={{ P: reg === 'avorte' ? 1300 : dieu === 'zeus' ? 1700 : 2600, boucle: true }}
          seed={17}
        />
      </g>

      <rect
        x={0.6}
        y={0.6}
        width={FW - 1.2}
        height={FH - 1.2}
        rx={7}
        fill="none"
        stroke={teinteDieu}
        strokeOpacity={0.32}
      />
    </svg>
  )
}
