import { REDOUTE_POSTES } from '../../../game/data'
import { AOBase, MurPierre, OmbreVolume, PAL, alea } from '../art'
import { Anim, AnimT } from '../smil'

/*
 * ═══════════════════════ LA REDOUTE ═══════════════════════
 *
 * Le pendant intérieur de la tour d'archers : une plateforme de tir COMPACTE et
 * SURÉLEVÉE, dressée derrière l'agora, sur laquelle sont affûtés un à trois
 * SCORPIONS - les grandes arbalètes de rempart. Elle ne regarde pas la plaine ;
 * elle regarde la place, et elle n'ouvre le feu qu'une fois le mur passé.
 *
 * SILHOUETTE, et c'est là tout l'enjeu du dessin. Une première version étalée sur
 * deux cents pixels se lisait comme un bout de muraille - exactement ce qu'il ne
 * fallait pas. La Redoute est donc TRAPUE et HAUTE : un massif carré, une rampe
 * de service à gauche, et au sommet les bras d'arc qui débordent du parapet. On
 * doit lire « machine » avant de lire « mur ».
 *
 * ORDRE DE PEINTURE, en vue 3/4 depuis le sud : le parapet est DEVANT les
 * machines, donc peint APRÈS elles. Les affûts s'enfoncent ainsi derrière la
 * pierre au lieu de se poser dessus - deuxième version où les scorpions
 * flottaient au-dessus des créneaux comme des jouets sur une étagère.
 *
 * LUMIÈRE. Nord-ouest, comme partout : parement gauche clair, joue droite dans
 * l'ombre, ombre portée au sud-est. Zéro contour noir - le modelé vient des
 * valeurs, jamais d'un trait.
 *
 * Trois niveaux : terre et rondins, puis pierre à embrasures, puis massif
 * appareillé à créneaux. Un scorpion de plus à chacun.
 */

/** un scorpion : affût, treuil, bras d'arc recourbés, glissière et trait armé */
function Scorpion({ x, y, s = 1, seed = 1, tour }: { x: number; y: number; s?: number; seed?: number; tour: number }) {
  const rnd = alea(seed * 31 + 7)
  // chaque pièce garde son cap : trois machines alignées à l'identique feraient décor
  const cap = -14 + rnd() * 24
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {/* affût : deux jumelles de bois, arête gauche prise par la lumière */}
      <path d="M-6.4,2 L-3,-11 L3,-11 L6.4,2 Z" fill={PAL.boisMi} />
      <path d="M-6.4,2 L-3,-11 L-1.4,-11 L-4.2,2 Z" fill={PAL.boisLit} />
      <path d="M3,-11 L6.4,2 L4,2 L1.6,-11 Z" fill={PAL.boisOmbre} />
      {/* cheville de pivot, en bronze */}
      <circle cx={0} cy={-10.6} r={1.5} fill="#9c7b3e" />

      {/* la machine balaie lentement son secteur : elle CHERCHE */}
      <g transform={`rotate(${cap})`}>
        <AnimT
          attributeName="transform"
          type="rotate"
          values={`${cap - 11};${cap + 11};${cap - 11}`}
          dur={`${8 + (tour % 3) * 1.9}s`}
          repeatCount="indefinite"
        />
        {/* la caisse : corps de l'arme, du volume et non un trait */}
        <path d="M-3.2,-11 L-3.2,-24 L3.2,-24 L3.2,-11 Z" fill={PAL.boisMi} />
        <path d="M-3.2,-11 L-3.2,-24 L-1,-24 L-1,-11 Z" fill={PAL.boisLit} />
        <path d="M1.4,-24 L3.2,-24 L3.2,-11 L1.4,-11 Z" fill={PAL.boisOmbre} />
        <path d="M-3.2,-15 L3.2,-15 M-3.2,-20.4 L3.2,-20.4" stroke="#6f5836" strokeWidth={0.8} />

        {/* les deux bras d'arc, épais et recourbés : la signature de l'engin */}
        <path d="M-2.4,-23 C-10,-25.4 -16,-22.4 -18.6,-16" fill="none" stroke={PAL.boisOmbre} strokeWidth={3.4} strokeLinecap="round" />
        <path d="M2.4,-23 C10,-25.4 16,-22.4 18.6,-16" fill="none" stroke={PAL.boisOmbre} strokeWidth={3.4} strokeLinecap="round" />
        <path d="M-2.4,-23.9 C-9.4,-26.1 -15,-23.4 -17.4,-17.6" fill="none" stroke={PAL.boisLit} strokeWidth={1.2} strokeLinecap="round" />
        <path d="M2.4,-23.9 C9.4,-26.1 15,-23.4 17.4,-17.6" fill="none" stroke="#96754d" strokeWidth={1} strokeLinecap="round" />
        <circle cx={-18.6} cy={-16} r={1.7} fill="#c8b184" />
        <circle cx={18.6} cy={-16} r={1.7} fill="#a89268" />

        {/* la corde, tendue d'un bras à l'autre par-dessus la glissière */}
        <path d="M-18.6,-16 L0,-20.4 L18.6,-16" fill="none" stroke="#efe6cd" strokeWidth={1.1} />
        {/* le trait armé : court, empenné, pointe de bronze - pas une chandelle */}
        <path d="M0,-20.4 L0,-30.4" stroke="#c9b58c" strokeWidth={1.8} />
        <path d="M0,-32.6 L-2,-29 L2,-29 Z" fill="#9c7b3e" />
        <path d="M-2.2,-20.8 L0,-23.6 L2.2,-20.8 Z" fill="#e6dcc4" />
        {/* treuil d'armement et sa manivelle */}
        <circle cx={0} cy={-13.6} r={2.8} fill={PAL.boisOmbre} />
        <circle cx={-0.6} cy={-14.2} r={1.9} fill={PAL.boisLit} />
        <path d="M0,-13.6 L4.4,-11.2" stroke="#6f5836" strokeWidth={1.2} strokeLinecap="round" />
        <circle cx={4.8} cy={-11} r={1} fill="#9c7b3e" />
      </g>
    </g>
  )
}

/*
 * Le parapet du premier état : un CLAYONNAGE - claie d'osier tressée entre des
 * piquets, doublée de terre. Deux fascines posées à plat se lisaient comme des
 * planches ; le tressage, lui, dit tout de suite « ouvrage de campagne monté à
 * la hâte », et c'est exactement ce qu'est une redoute de premier niveau.
 */
function Clayonnage({ larg, y }: { larg: number; y: number }) {
  const rnd = alea(77)
  const h = 12
  const x0 = -larg + 2
  const x1 = larg + 1
  const piquets = 9
  return (
    <g transform={`translate(0,${y})`}>
      {/* la masse de terre derrière la claie */}
      <path d={`M${x0},0 L${x0},${-h} L${x1},${-h} L${x1},0 Z`} fill="#8f7a52" />
      <path d={`M${x0},${-h} L${x1},${-h} L${x1},${-h + 2.4} L${x0},${-h + 2.4} Z`} fill="#b39a6a" />
      {/* le tressage : cinq cordons d'osier ondulant entre les piquets */}
      {[0, 1, 2, 3, 4].map((r) => {
        const yr = -2 - r * 2.2
        const amp = r % 2 ? 1.1 : -1.1
        let d = `M${x0},${yr}`
        for (let i = 0; i < piquets; i++) {
          const xa = x0 + ((i + 0.5) * (x1 - x0)) / piquets
          const xb = x0 + ((i + 1) * (x1 - x0)) / piquets
          d += ` Q${xa},${yr + amp} ${xb},${yr}`
        }
        return <path key={r} d={d} fill="none" stroke={r % 2 ? '#9d8154' : '#876d46'} strokeWidth={1.7} />
      })}
      {/* les piquets, fichés en terre et dépassant en haut */}
      {Array.from({ length: piquets }, (_, i) => {
        const px = x0 + 3 + (i * (x1 - x0 - 6)) / (piquets - 1)
        const depasse = 2.4 + rnd() * 3.4
        return (
          <g key={i}>
            <path d={`M${px},0.6 L${px + 0.6},${-h - depasse}`} stroke={PAL.boisOmbre} strokeWidth={2} />
            <path d={`M${px - 0.5},0.6 L${px + 0.1},${-h - depasse}`} stroke={PAL.boisLit} strokeWidth={0.7} />
          </g>
        )
      })}
    </g>
  )
}

export function Redoute({ n }: { n: number }) {
  if (n <= 0) return null
  const niv = Math.max(1, Math.min(3, n))
  /*
   * Gabarit : TRAPU. Un massif d'environ 90 px de large pour 26 à 38 de haut,
   * là où les bâtiments du village occupent jusqu'à 270 px. La Redoute doit
   * paraître un ouvrage de campagne monté à la hâte, pas un édifice du règne.
   */
  const larg = 40 + niv * 5
  const haut = 20 + niv * 6
  // profondeur de la joue droite : ce qui donne le volume en vue 3/4
  const joue = 11 + niv * 1.5
  // niveau du plancher de tir, où les affûts sont calés
  const pont = -haut - joue * 0.42
  const rnd = alea(404 + niv)

  return (
    <g>
      <OmbreVolume w={larg * 2 + joue} h={haut + 26} y={2} o={0.18} />
      <AOBase rx={larg * 1.16} ry={13 + niv} cy={2.6} />

      {/* aire de service : terre battue en deux tons, plus clair là où l'on passe */}
      <ellipse cx={2} cy={2} rx={larg * 1.26} ry={14 + niv} fill="#b0a075" opacity={0.4} />
      <ellipse cx={-larg * 0.4} cy={5} rx={larg * 0.78} ry={9.5} fill="#c6b68b" opacity={0.44} />

      {/* ── la rampe de service : c'est par là qu'on monte les traits ── */}
      <g>
        {/* le remblai, en volume, avec sa propre ombre au sol */}
        <path d={`M${-larg - 34},7 L${-larg + 2},${pont + 5} L${-larg + 2},${pont + 13} L${-larg - 28},13 Z`} fill="#8e7f59" />
        <path d={`M${-larg - 34},7 L${-larg + 2},${pont + 5} L${-larg + 2},${pont + 8} L${-larg - 32},9.6 Z`} fill="#c2b285" />
        <path d={`M${-larg - 28},13 L${-larg + 2},${pont + 13} L${-larg + 2},${pont + 15} L${-larg - 27},15 Z`} fill="#6f6247" />
        {/* traverses de rondins qui retiennent la terre */}
        {[0.14, 0.32, 0.5, 0.68, 0.86].map((f) => {
          const x0 = -larg - 34 + f * 36
          const y0 = 7 + f * (pont + 5 - 7)
          return <path key={f} d={`M${x0},${y0 + 0.8} L${x0 + 1.4},${y0 + 6.6}`} stroke="#7a6c4c" strokeWidth={1.8} />
        })}
        {/* garde-corps de perches, côté vide */}
        <path d={`M${-larg - 32},6 L${-larg},${pont + 4}`} stroke={PAL.boisOmbre} strokeWidth={1.3} />
        {[0.25, 0.6, 0.9].map((f) => {
          const x0 = -larg - 32 + f * 32
          const y0 = 6 + f * (pont + 4 - 6)
          return <path key={f} d={`M${x0},${y0} L${x0},${y0 + 7}`} stroke={PAL.boisOmbre} strokeWidth={1.2} />
        })}
      </g>

      {/* ── le massif ── */}
      {niv === 1 ? (
        <g>
          {/* front de terre revêtu de rondins fichés debout */}
          <path d={`M${-larg},0 L${-larg + 3},${-haut} L${larg - 3},${-haut} L${larg},0 Z`} fill="#8a7049" />
          <path d={`M${-larg},0 L${-larg + 3},${-haut} L${-larg * 0.26},${-haut} L${-larg * 0.3},0 Z`} fill="#a08256" />
          <path d={`M${larg * 0.3},${-haut} L${larg - 3},${-haut} L${larg},0 L${larg * 0.36},0 Z`} fill="#6d5636" />
          <path d={`M${larg},0 L${larg + joue},${-joue * 0.4} L${larg + joue},${-haut - joue * 0.4} L${larg - 3},${-haut} Z`} fill="#5e4a2e" />
          {/*
            Rondins fichés debout, chacun son diamètre et sa valeur : neuf traits
            identiques donnaient une caisse à claire-voie. On les dessine comme
            des CYLINDRES - une âme claire au nord-ouest, un flanc sombre - et
            l'on brise l'alignement de leurs têtes.
          */}
          {Array.from({ length: 11 }, (_, i) => {
            const px = -larg + 4 + (i * (larg * 2 - 8)) / 10
            const w = 2.6 + rnd() * 2.2
            const tete = -haut + 1 + rnd() * 3
            return (
              <g key={i}>
                <path d={`M${px - w / 2},-1 L${px - w / 2 + 0.8},${tete} L${px + w / 2 + 0.8},${tete} L${px + w / 2},-1 Z`} fill="#7f6540" />
                <path d={`M${px - w / 2},-1 L${px - w / 2 + 0.8},${tete} L${px - w / 2 + 1.9},${tete} L${px - w / 2 + 1.1},-1 Z`} fill="#a08256" />
                <path d={`M${px + w / 2 - 0.9},-1 L${px + w / 2 + 0.1},${tete} L${px + w / 2 + 0.8},${tete} L${px + w / 2},-1 Z`} fill="#5e4a2e" />
                {/* la tête du rondin, vue de dessus en raccourci */}
                <ellipse cx={px + 0.4} cy={tete} rx={w / 2} ry={w / 5} fill="#b08f60" />
              </g>
            )
          })}
          {/* la terre du remblai déborde entre les rondins, au pied */}
          <path
            d={`M${-larg + 2},0 Q${-larg * 0.3},${-4} ${larg * 0.2},${-2.4} Q${larg * 0.7},${-1} ${larg - 2},${-3} L${larg - 2},1 L${-larg + 2},1 Z`}
            fill="#9d8a5e"
          />
          <path
            d={`M${-larg + 2},0 Q${-larg * 0.3},${-4} ${larg * 0.2},${-2.4} Q${larg * 0.7},${-1} ${larg - 2},${-3} L${larg - 2},${-1.6} Q${larg * 0.7},0.4 ${larg * 0.2},${-1} Q${-larg * 0.3},${-2.6} ${-larg + 2},1.4 Z`}
            fill="#b8a476"
          />
          {/* couronnement : plancher de madriers */}
          <path d={`M${-larg - 4},${-haut} L${larg + 3},${-haut} L${larg + joue},${pont} L${-larg},${pont} Z`} fill={PAL.boisMi} />
          <path d={`M${-larg},${pont} L${larg + joue},${pont}`} stroke={PAL.boisLit} strokeWidth={1.4} />
          {/* ombre du plancher sur le haut du front : le débord se voit */}
          <path d={`M${-larg + 2},${-haut} L${larg - 2},${-haut} L${larg - 2},${-haut + 3.4} L${-larg + 2},${-haut + 3.4} Z`} fill={PAL.ombrePortee} opacity={0.16} />

          {/* les machines, PUIS le parapet de fascines qui passe devant elles */}
          {REDOUTE_POSTES.slice(0, niv).map((p, i) => (
            <Scorpion key={i} x={p.dx} y={pont - 5} s={0.95} seed={i + 1} tour={i} />
          ))}
          <Clayonnage larg={larg} y={pont + 1} />
        </g>
      ) : (
        <g>
          {/* parement de pierre appareillée */}
          <g transform={`translate(${-larg},${-haut})`}>
            <MurPierre w={larg * 2} h={haut} seed={91 + niv} />
          </g>
          {/*
            La pierre nue de MurPierre sortait froide et plate. Deux glacis la
            réchauffent et la modèlent : ocre chaud sur la moitié gauche prise par
            le soleil, ombre montante à droite et au pied.
          */}
          <path d={`M${-larg},0 L${-larg},${-haut} L${-larg * 0.1},${-haut} L${-larg * 0.1},0 Z`} fill="#e8cf9e" opacity={0.17} />
          <path d={`M${larg * 0.24},0 L${larg * 0.24},${-haut} L${larg},${-haut} L${larg},0 Z`} fill="#6b5f47" opacity={0.14} />
          <path d={`M${-larg},0 L${larg},0 L${larg},${-5.5} L${-larg},${-5.5} Z`} fill={PAL.ombrePortee} opacity={0.1} />
          {/* joue droite dans l'ombre : c'est elle qui fait le volume */}
          <path
            d={`M${larg},0 L${larg + joue},${-joue * 0.42} L${larg + joue},${-haut - joue * 0.42} L${larg},${-haut} Z`}
            fill={PAL.pierreOmbre}
          />
          <path
            d={`M${larg},${-haut} L${larg + joue},${-haut - joue * 0.42} L${larg + joue},${-haut - joue * 0.42 + 4} L${larg},${-haut + 4} Z`}
            fill="#a89e86"
          />
          {/* arête d'angle gauche : liseré clair côté lumière */}
          <path d={`M${-larg},0 L${-larg},${-haut}`} stroke={PAL.pierreLit} strokeWidth={1.6} opacity={0.75} />
          {/* talus de base : la pierre s'évase, l'ouvrage s'ancre au sol */}
          <path d={`M${-larg},0 L${-larg - 6},4 L${larg + 4},4 L${larg},0 Z`} fill={PAL.pierreOmbre} opacity={0.85} />
          <path d={`M${-larg},0 L${-larg - 6},4 L${-larg * 0.2},4 L${-larg * 0.16},0 Z`} fill={PAL.pierreMi} />

          {/* cordon de couronnement, puis le plancher de tir */}
          <path d={`M${-larg - 4},${-haut} L${larg + 3},${-haut} L${larg + joue},${pont} L${-larg},${pont} Z`} fill={PAL.pierreLit} />
          <path d={`M${-larg},${pont} L${larg + joue},${pont}`} stroke={PAL.marbreLit} strokeWidth={1.4} />
          <path d={`M${-larg - 4},${-haut} L${larg + 3},${-haut}`} stroke={PAL.pierreJoint} strokeWidth={0.9} opacity={0.45} />
          {/* ombre du cordon sur la façade : le débord se voit */}
          <path d={`M${-larg + 1},${-haut} L${larg - 1},${-haut} L${larg - 1},${-haut + 3.6} L${-larg + 1},${-haut + 3.6} Z`} fill={PAL.ombrePortee} opacity={0.15} />

          {/* les machines d'abord : le parapet leur passera devant */}
          {REDOUTE_POSTES.slice(0, niv).map((p, i) => (
            <Scorpion key={i} x={p.dx} y={pont - (niv === 2 ? 9 : 12)} s={1.08} seed={i + 1} tour={i} />
          ))}

          {/* parapet : embrasures taillées au niveau 2, créneaux au niveau 3 */}
          {niv === 2 ? (
            <g>
              <path
                d={`M${-larg + 2},${pont + 1} L${larg + 1},${pont + 1} L${larg + 1},${pont - 12} L${-larg + 2},${pont - 12} Z`}
                fill={PAL.pierreMi}
              />
              <path
                d={`M${-larg + 2},${pont - 12} L${larg + 1},${pont - 12} L${larg + 1},${pont - 14.4} L${-larg + 2},${pont - 14.4} Z`}
                fill={PAL.pierreLit}
              />
              {/* glacis chaud sur la moitié éclairée du parapet */}
              <path d={`M${-larg + 2},${pont + 1} L${-larg * 0.1},${pont + 1} L${-larg * 0.1},${pont - 14.4} L${-larg + 2},${pont - 14.4} Z`} fill="#e8cf9e" opacity={0.16} />
              {/* embrasures : le tir passe par là */}
              {[-0.56, 0.04, 0.62].map((f) => {
                const cx = larg * f
                return (
                  <g key={f}>
                    {/* l'ébrasement : la pierre s'amincit vers l'extérieur */}
                    <path
                      d={`M${cx - 4.6},${pont - 0.6} L${cx + 4.6},${pont - 0.6} L${cx + 2.6},${pont - 9.6} L${cx - 2.6},${pont - 9.6} Z`}
                      fill="#8b8170"
                    />
                    {/* le jour, dans l'ombre - jamais du noir */}
                    <path
                      d={`M${cx - 3},${pont - 1.4} L${cx + 3},${pont - 1.4} L${cx + 1.8},${pont - 9} L${cx - 1.8},${pont - 9} Z`}
                      fill="#655b4c"
                    />
                    {/* seuil de tir, usé et clair : c'est là qu'on cale la machine */}
                    <path d={`M${cx - 5},${pont - 0.2} L${cx + 5},${pont - 0.2} L${cx + 5},${pont + 1} L${cx - 5},${pont + 1} Z`} fill={PAL.marbreLit} />
                    {/* joue gauche éclairée de l'embrasure */}
                    <path d={`M${cx - 4.6},${pont - 0.6} L${cx - 2.6},${pont - 9.6} L${cx - 1.8},${pont - 9} L${cx - 3},${pont - 1.4} Z`} fill={PAL.pierreLit} />
                  </g>
                )
              })}
            </g>
          ) : (
            <g>
              {/* mur d'allège continu, puis les merlons */}
              <path d={`M${-larg + 1},${pont + 1} L${larg + 2},${pont + 1} L${larg + 2},${pont - 7} L${-larg + 1},${pont - 7} Z`} fill={PAL.pierreMi} />
              <path d={`M${-larg + 1},${pont - 7} L${larg + 2},${pont - 7} L${larg + 2},${pont - 9} L${-larg + 1},${pont - 9} Z`} fill={PAL.pierreLit} />
              <path d={`M${-larg + 1},${pont + 1} L${-larg * 0.1},${pont + 1} L${-larg * 0.1},${pont - 9} L${-larg + 1},${pont - 9} Z`} fill="#e8cf9e" opacity={0.16} />
              {[-0.9, -0.42, 0.06, 0.54, 0.94].map((f, i) => {
                const bx = larg * f - 7
                return (
                  <g key={f}>
                    <rect x={bx} y={pont - 19} width={14} height={11} fill={i % 2 ? PAL.pierreMi : PAL.pierreLit} />
                    <rect x={bx} y={pont - 19} width={14} height={2} fill={PAL.marbreLit} />
                    <rect x={bx + 11.6} y={pont - 19} width={2.4} height={11} fill={PAL.pierreOmbre} opacity={0.65} />
                    {f < 0 && <rect x={bx} y={pont - 19} width={14} height={11} fill="#e8cf9e" opacity={0.13} />}
                  </g>
                )
              })}
            </g>
          )}
        </g>
      )}

      {/* ── le train : ce qui sert les machines ── */}
      {/* râtelier de traits, dressé au pied de la rampe */}
      <g transform={`translate(${-larg - 26},7)`}>
        <ellipse cx={2.4} cy={1} rx={7.5} ry={2.4} fill={PAL.ombrePortee} opacity={0.17} />
        <path d="M-6.4,0 L6.4,0" stroke={PAL.boisOmbre} strokeWidth={2} />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const px = -5.4 + i * 2.2
          const h = 17 + rnd() * 5
          return (
            <g key={i}>
              <path d={`M${px},0 L${px + 1},${-h}`} stroke="#c9b58c" strokeWidth={1.2} />
              <path d={`M${px + 1},${-h - 2.4} L${px - 0.6},${-h + 1} L${px + 2.6},${-h + 1} Z`} fill="#9c7b3e" />
            </g>
          )
        })}
      </g>
      {/* tonneau de suif pour les glissières */}
      <g transform={`translate(${larg + joue * 0.75},6)`}>
        <ellipse cx={2} cy={1.4} rx={7} ry={2.4} fill={PAL.ombrePortee} opacity={0.17} />
        <path d="M-5.4,0 L-4.4,-10 L4.4,-10 L5.4,0 Z" fill={PAL.boisMi} />
        <path d="M-5.4,0 L-4.4,-10 L-1.6,-10 L-2.2,0 Z" fill={PAL.boisLit} />
        <ellipse cx={0} cy={-10} rx={4.4} ry={1.5} fill="#6b5535" />
        <path d="M-5,-3.4 L5,-3.4 M-5.2,-6.8 L5.2,-6.8" stroke="#5f4a2c" strokeWidth={1} />
      </g>

      {/* le fanion de la pièce, planté DANS le parapet : l'ouvrage est en batterie */}
      {niv >= 2 && (
        <g transform={`translate(${larg * 0.9},${pont - (niv === 2 ? 12 : 8)})`}>
          <path d="M0,0 L0,-24" stroke={PAL.boisOmbre} strokeWidth={1.6} />
          <path d="M-0.5,-24 L-0.5,-21" stroke={PAL.boisLit} strokeWidth={0.8} />
          <path d="M0.8,-24 L14,-20 L0.8,-16 Z" fill="#8e4a2e">
            <Anim
              attributeName="d"
              values="M0.8,-24 L14,-20 L0.8,-16 Z;M0.8,-24 L11.8,-18.8 L0.8,-16 Z;M0.8,-24 L14,-20 L0.8,-16 Z"
              dur="3.6s"
              repeatCount="indefinite"
            />
          </path>
          <path d="M0.8,-24 L14,-20 L7,-20 Z" fill="#bd6640" opacity={0.85} />
        </g>
      )}
    </g>
  )
}
