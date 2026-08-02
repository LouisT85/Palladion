import { GODS } from '../../game/data'
import { HEROS, type HeroId } from '../../game/heros'
import type { BattleEffect, GodId } from '../../game/types'
import { alea } from './art'

/*
 * ═══════════════ LA MAIN DES DIEUX, À LA MESURE DE LA FERVEUR ═══════════════
 *
 * Une bénédiction ne se lit pas seulement dans les chiffres : elle se voit.
 * Le palier de ferveur (0 maudit → 6 élu) pilote ici la mise en scène entière -
 * couleur, ampleur, nombre de ramifications, éclat du ciel.
 *
 * Règle non négociable : un dieu OFFENSÉ (palier ≤ 1) produit un visuel PÂLE et
 * AVORTÉ - l'éclair n'atteint pas le sol, l'onde meurt à trois pas, le halo
 * s'éteint aussitôt. La punition doit se voir avant même de se compter.
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

/** avancement de l'effet, de 0 (apparition) à 1 (dissipation) */
function progres(e: BattleEffect, now: number): number {
  const debut = e.debut ?? e.until - 2200
  const duree = Math.max(1, e.until - debut)
  return Math.max(0, Math.min(1, (now - debut) / duree))
}

// ── ZEUS : l'éclair ──────────────────────────────────────────────────────────

/** zigzag descendant depuis le ciel - dévié par le seed pour que deux coups diffèrent */
function traitFoudre(x: number, y: number, haut: number, ampl: number, seed: number): string {
  const rnd = alea(seed)
  const n = 6
  let d = `M${(x + (rnd() - 0.5) * ampl).toFixed(1)},${(y - haut).toFixed(1)}`
  for (let i = 1; i <= n; i++) {
    const t = i / n
    d += ` L${(x + (rnd() - 0.5) * ampl * (1 - t * 0.55)).toFixed(1)},${(y - haut * (1 - t)).toFixed(1)}`
  }
  return d
}

const TONS_ZEUS: Record<Registre, { coeur: string; halo: string; large: number }> = {
  avorte: { coeur: '#cfc9a8', halo: '#8a866e', large: 1.6 },
  faible: { coeur: '#f0dc94', halo: '#c9a83c', large: 2.4 },
  grace: { coeur: '#fdf0a8', halo: '#e8c04a', large: 3.2 },
  cheri: { coeur: '#f4fbff', halo: '#9fd4ff', large: 4 },
  elu: { coeur: '#fff2fb', halo: '#c0439a', large: 5 },
}

function Zeus({ e, now, reg }: { e: BattleEffect; now: number; reg: Registre }) {
  const t = progres(e, now)
  const T = TONS_ZEUS[reg]
  const seed = Math.round(e.x * 7 + e.y)
  // un dieu offensé lâche une étincelle qui n'arrive jamais jusqu'aux hommes
  const haut = reg === 'avorte' ? 46 : reg === 'faible' ? 110 : reg === 'grace' ? 150 : reg === 'cheri' ? 220 : 320
  const branches = reg === 'elu' ? 3 : reg === 'cheri' ? 2 : 1
  // l'éclair claque puis s'éteint : plein feu sur le premier tiers
  const vie = t < 0.18 ? t / 0.18 : Math.max(0, 1 - (t - 0.18) / 0.82)
  const opac = (reg === 'avorte' ? 0.42 : 1) * vie

  return (
    <g opacity={opac} pointerEvents="none">
      {/* l'élu fend le ciel : toute la scène blanchit un instant */}
      {reg === 'elu' && t < 0.3 && (
        <circle cx={e.x} cy={e.y} r={260} fill="#e8bcdd" opacity={0.18 * (1 - t / 0.3)} />
      )}
      {Array.from({ length: branches }, (_, i) => {
        const d = traitFoudre(e.x, e.y, haut * (i === 0 ? 1 : 0.62), 16 + i * 10, seed + i * 31)
        return (
          <g key={i}>
            <path d={d} stroke={T.halo} strokeWidth={T.large * 2.6} fill="none" opacity={0.4} strokeLinecap="round" />
            <path d={d} stroke={T.coeur} strokeWidth={T.large} fill="none" strokeLinecap="round" />
          </g>
        )
      })}
      {/* impact au sol - inexistant quand le dieu se détourne */}
      {reg !== 'avorte' && (
        <>
          <circle cx={e.x} cy={e.y} r={9 + 16 * t} fill="none" stroke={T.halo} strokeWidth={2} opacity={1 - t} />
          <circle cx={e.x} cy={e.y} r={7} fill={T.coeur} opacity={0.55 * (1 - t)} />
        </>
      )}
      {reg === 'avorte' && (
        // l'étincelle se dissout en fumée : le ciel n'a pas répondu
        <circle cx={e.x} cy={e.y - haut * 0.55} r={4 + 9 * t} fill="#9a9683" opacity={0.3 * (1 - t)} />
      )}
    </g>
  )
}

// ── POSÉIDON : l'onde ────────────────────────────────────────────────────────

const TONS_POSEIDON: Record<Registre, { onde: string; ecume: string; anneaux: number; portee: number }> = {
  avorte: { onde: '#6f8478', ecume: '#93a89c', anneaux: 1, portee: 26 },
  faible: { onde: '#4f8f6a', ecume: '#7dbb96', anneaux: 2, portee: 52 },
  grace: { onde: '#3fa39a', ecume: '#8fd9cf', anneaux: 2, portee: 78 },
  cheri: { onde: '#35b9c4', ecume: '#b6f0f2', anneaux: 3, portee: 108 },
  elu: { onde: '#2fc7d6', ecume: '#f2fdff', anneaux: 4, portee: 150 },
}

function Poseidon({ e, now, reg }: { e: BattleEffect; now: number; reg: Registre }) {
  const t = progres(e, now)
  const T = TONS_POSEIDON[reg]
  const opac = (reg === 'avorte' ? 0.4 : 1) * (1 - t * t)
  return (
    <g opacity={opac} pointerEvents="none">
      {Array.from({ length: T.anneaux }, (_, i) => {
        const decal = i * 0.18
        const u = Math.max(0, Math.min(1, (t - decal) / (1 - decal)))
        return (
          <ellipse
            key={i}
            cx={e.x}
            cy={e.y}
            rx={10 + T.portee * u}
            ry={(10 + T.portee * u) * 0.42}
            fill="none"
            stroke={i === 0 ? T.ecume : T.onde}
            strokeWidth={3.4 - i * 0.6}
            opacity={1 - u}
          />
        )
      })}
      {/* le raz-de-marée de l'élu : une crête d'écume qui déferle vraiment */}
      {(reg === 'elu' || reg === 'cheri') && (
        <g opacity={1 - t}>
          <path
            d={`M${e.x - T.portee},${e.y + 6} Q${e.x - T.portee * 0.4},${e.y - 34 - 20 * t} ${e.x},${e.y - 6} Q${e.x + T.portee * 0.4},${e.y - 34 - 20 * t} ${e.x + T.portee},${e.y + 6}`}
            fill="none"
            stroke={T.onde}
            strokeWidth={9}
            opacity={0.55}
            strokeLinecap="round"
          />
          <path
            d={`M${e.x - T.portee},${e.y + 2} Q${e.x - T.portee * 0.4},${e.y - 40 - 20 * t} ${e.x},${e.y - 10} Q${e.x + T.portee * 0.4},${e.y - 40 - 20 * t} ${e.x + T.portee},${e.y + 2}`}
            fill="none"
            stroke={T.ecume}
            strokeWidth={3.2}
            strokeLinecap="round"
          />
          {/* embruns projetés en cloche */}
          {[-0.7, -0.3, 0.15, 0.55, 0.85].map((k, i) => (
            <circle
              key={i}
              cx={e.x + k * T.portee}
              cy={e.y - 22 - 46 * t - i * 3}
              r={3 - t * 2}
              fill={T.ecume}
              opacity={0.8 - t}
            />
          ))}
        </g>
      )}
      {/* les pierres se ressoudent : trois blocs qui remontent en place */}
      {reg !== 'avorte' &&
        [-16, 0, 16].map((dx, i) => (
          <rect
            key={dx}
            x={e.x + dx - 5}
            y={e.y - 6 - 14 * Math.min(1, t * 1.6) - i}
            width={10}
            height={7}
            rx={1.2}
            fill="#cfc7ac"
            opacity={(1 - t) * 0.8}
          />
        ))}
    </g>
  )
}

// ── ATHÉNA : le halo et l'égide ──────────────────────────────────────────────

const TONS_ATHENA: Record<Registre, { halo: string; trait: string; rayon: number }> = {
  avorte: { halo: '#8d8f8a', trait: '#a7a9a4', rayon: 26 },
  faible: { halo: '#b9c1c6', trait: '#dfe5e8', rayon: 40 },
  grace: { halo: '#e2d6a8', trait: '#f4ecc9', rayon: 56 },
  cheri: { halo: '#e8c04a', trait: '#fbeeb4', rayon: 72 },
  elu: { halo: '#f0d264', trait: '#fff8dc', rayon: 92 },
}

function Athena({ e, now, reg }: { e: BattleEffect; now: number; reg: Registre }) {
  const t = progres(e, now)
  const T = TONS_ATHENA[reg]
  // le halo s'installe, tient, puis se retire - sauf offense : il meurt aussitôt
  const vie = reg === 'avorte' ? Math.max(0, 1 - t * 2.4) : t < 0.2 ? t / 0.2 : Math.max(0, 1 - (t - 0.2) / 0.8)
  const r = T.rayon * (reg === 'avorte' ? 0.6 : 0.75 + 0.25 * Math.min(1, t * 3))
  const rot = t * (reg === 'elu' ? 300 : reg === 'cheri' ? 160 : 60)
  const pointes = reg === 'elu' ? 12 : reg === 'cheri' ? 8 : 6
  return (
    <g opacity={vie * (reg === 'avorte' ? 0.45 : 1)} pointerEvents="none">
      <circle cx={e.x} cy={e.y} r={r} fill={T.halo} opacity={0.12} />
      <circle cx={e.x} cy={e.y} r={r} fill="none" stroke={T.halo} strokeWidth={2.2} opacity={0.75} />
      <circle cx={e.x} cy={e.y} r={r * 0.82} fill="none" stroke={T.trait} strokeWidth={0.9} opacity={0.6} />
      {/* pointes de lance disposées en couronne, plus nombreuses à haute ferveur */}
      {reg !== 'avorte' && (
        <g transform={`rotate(${rot.toFixed(1)} ${e.x} ${e.y})`}>
          {Array.from({ length: pointes }, (_, i) => {
            const a = (i / pointes) * Math.PI * 2
            const x1 = e.x + Math.cos(a) * r
            const y1 = e.y + Math.sin(a) * r * 0.9
            const x2 = e.x + Math.cos(a) * (r + 9)
            const y2 = e.y + Math.sin(a) * (r + 9) * 0.9
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={T.trait} strokeWidth={1.8} strokeLinecap="round" />
          })}
        </g>
      )}
      {/* l'égide de l'élu : la Gorgone tourne au centre et pétrifie qui la regarde */}
      {reg === 'elu' && (
        <g transform={`translate(${e.x},${e.y}) rotate(${(-rot * 0.6).toFixed(1)})`}>
          <circle r={17} fill="#2c3a2e" opacity={0.85} />
          <circle r={17} fill="none" stroke="#f0d264" strokeWidth={2} />
          {/* chevelure de serpents */}
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2
            return (
              <path
                key={i}
                d={`M${(Math.cos(a) * 15).toFixed(1)},${(Math.sin(a) * 15).toFixed(1)} q${(Math.cos(a + 0.9) * 9).toFixed(1)},${(Math.sin(a + 0.9) * 9).toFixed(1)} ${(Math.cos(a) * 25).toFixed(1)},${(Math.sin(a) * 25).toFixed(1)}`}
                stroke="#7fa05c"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
              />
            )
          })}
          {/* face : yeux fixes et bouche ouverte */}
          <circle cx={-5.5} cy={-3} r={2.6} fill="#f6f0d8" />
          <circle cx={5.5} cy={-3} r={2.6} fill="#f6f0d8" />
          <circle cx={-5.5} cy={-3} r={1.2} fill="#20261f" />
          <circle cx={5.5} cy={-3} r={1.2} fill="#20261f" />
          <path d="M-5,5 Q0,10 5,5 Q0,7.5 -5,5 Z" fill="#c0563f" />
        </g>
      )}
    </g>
  )
}

// ── ARÈS : la brume rouge, la braise, l'aura sanglante ───────────────────────

const TONS_ARES: Record<Registre, { brume: string; braise: string; rayon: number; corbeaux: number }> = {
  avorte: { brume: '#7d6a66', braise: '#9c8a84', rayon: 24, corbeaux: 0 },
  faible: { brume: '#9a4a3c', braise: '#c07a52', rayon: 42, corbeaux: 0 },
  grace: { brume: '#b34a34', braise: '#e8913c', rayon: 58, corbeaux: 0 },
  cheri: { brume: '#c0402c', braise: '#ffb04a', rayon: 76, corbeaux: 2 },
  elu: { brume: '#a81b16', braise: '#ffd06a', rayon: 96, corbeaux: 3 },
}

function Ares({ e, now, reg }: { e: BattleEffect; now: number; reg: Registre }) {
  const t = progres(e, now)
  const T = TONS_ARES[reg]
  const vie = reg === 'avorte' ? Math.max(0, 1 - t * 2.2) : 1 - t * t
  const rnd = alea(Math.round(e.x + e.y * 3))
  const braises = reg === 'avorte' ? 0 : reg === 'faible' ? 5 : reg === 'grace' ? 9 : 14
  return (
    <g opacity={vie * (reg === 'avorte' ? 0.4 : 1)} pointerEvents="none">
      {/* nappe de brume sanglante qui gonfle au sol */}
      <ellipse
        cx={e.x}
        cy={e.y}
        rx={T.rayon * (0.5 + t * 0.6)}
        ry={T.rayon * 0.36 * (0.5 + t * 0.6)}
        fill={T.brume}
        opacity={0.3}
      />
      <ellipse
        cx={e.x - T.rayon * 0.15}
        cy={e.y - 4}
        rx={T.rayon * 0.62 * (0.5 + t * 0.5)}
        ry={T.rayon * 0.26 * (0.5 + t * 0.5)}
        fill={T.brume}
        opacity={0.24}
      />
      {/* braises qui montent - le feu de la guerre prend vraiment à haute ferveur */}
      {Array.from({ length: braises }, (_, i) => {
        const dx = (rnd() - 0.5) * T.rayon * 1.5
        const h = 20 + rnd() * T.rayon
        const r = 0.9 + rnd() * 1.6
        return (
          <circle
            key={i}
            cx={e.x + dx + Math.sin(t * 6 + i) * 4}
            cy={e.y - h * t}
            r={r * (1 - t * 0.6)}
            fill={i % 3 === 0 ? '#fff0c0' : T.braise}
            opacity={0.85 * (1 - t)}
          />
        )
      })}
      {/* l'aura de l'élu, et les corbeaux qui tournent au-dessus du carnage */}
      {reg !== 'avorte' && reg !== 'faible' && (
        <circle cx={e.x} cy={e.y} r={T.rayon * (0.7 + t * 0.4)} fill="none" stroke={T.brume} strokeWidth={2.6} opacity={0.5 * (1 - t)} />
      )}
      {Array.from({ length: T.corbeaux }, (_, i) => {
        const a = t * 4 + (i / Math.max(1, T.corbeaux)) * Math.PI * 2
        const cx = e.x + Math.cos(a) * T.rayon * 0.85
        const cy = e.y - 34 + Math.sin(a) * T.rayon * 0.3
        return (
          <g key={i} transform={`translate(${cx.toFixed(1)},${cy.toFixed(1)})`} opacity={0.9 * (1 - t * 0.5)}>
            <path
              d="M-6,0 Q-3,-4 0,-0.5 Q3,-4 6,0"
              stroke="#231d1c"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
            <ellipse cx={0} cy={0.6} rx={2.4} ry={1.1} fill="#231d1c" />
          </g>
        )
      })}
    </g>
  )
}

const PAR_DIEU: Record<GodId, (p: { e: BattleEffect; now: number; reg: Registre }) => JSX.Element> = {
  zeus: Zeus,
  poseidon: Poseidon,
  athena: Athena,
  ares: Ares,
}

/** manifestation d'un dieu, mise en scène selon la ferveur qu'on lui porte */
export function EffetDivin({ e, now }: { e: BattleEffect; now: number }) {
  const dieu = e.dieu ?? 'zeus'
  const Rendu = PAR_DIEU[dieu]
  return <Rendu e={e} now={now} reg={registreDe(e.palier ?? 3)} />
}

/**
 * Intervention d'un héros : un cercle aux couleurs de sa maison, son emblème
 * au centre, et une onde de choc qui part de lui. Court, net, reconnaissable.
 */
export function EffetHeros({ e, now }: { e: BattleEffect; now: number }) {
  const def = HEROS[e.heros as HeroId]
  if (!def) return null
  const t = progres(e, now)
  const vie = t < 0.14 ? t / 0.14 : Math.max(0, 1 - (t - 0.14) / 0.86)
  return (
    <g opacity={vie} pointerEvents="none">
      <circle cx={e.x} cy={e.y} r={26 + 40 * t} fill="none" stroke={def.couleur} strokeWidth={3} opacity={0.6 * (1 - t)} />
      <circle cx={e.x} cy={e.y} r={26} fill={def.couleur} opacity={0.16} />
      <circle cx={e.x} cy={e.y} r={26} fill="none" stroke={def.couleur} strokeWidth={2.4} />
      <text x={e.x} y={e.y + 8} textAnchor="middle" fontSize={22}>
        {def.emoji}
      </text>
      <text
        x={e.x}
        y={e.y - 32}
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

/**
 * Aperçu statique d'une manifestation, pour le panthéon : le joueur voit à quoi
 * ressemble le bras de son dieu avant de dépenser sa faveur.
 */
export function ApercuDivin({ dieu, palier, taille = 84 }: { dieu: GodId; palier: number; taille?: number }) {
  const e: BattleEffect = { id: 'apercu', type: 'divin', x: taille / 2, y: taille * 0.72, until: 0, dieu, palier }
  const Rendu = PAR_DIEU[dieu]
  return (
    <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`} aria-hidden="true">
      <rect x={0} y={0} width={taille} height={taille} rx={8} fill="#0a141d" />
      <g>
        {/* on fige l'animation à son apogée : 22 % du parcours */}
        <Rendu e={{ ...e, debut: 0, until: 1000 }} now={220} reg={registreDe(palier)} />
      </g>
      <rect
        x={0.6}
        y={0.6}
        width={taille - 1.2}
        height={taille - 1.2}
        rx={8}
        fill="none"
        stroke={GODS[dieu].couleur}
        strokeOpacity={0.35}
      />
    </svg>
  )
}
