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
 * QUATRE niveaux : terre et rondins, puis pierre à embrasures, puis massif
 * appareillé à créneaux, puis l'ouvrage du règne - deux bastionnets en saillie,
 * un parapet en encorbellement qui porte une quatrième pièce. Un scorpion de plus
 * à chacun.
 *
 * La progression se lit à quatre traits, et c'est voulu : la MATIÈRE change au
 * niveau 2 (la terre devient pierre), le COURONNEMENT change au niveau 3 (les
 * embrasures deviennent créneaux), le PLAN change au niveau 4 (le massif cesse
 * d'être un rectangle - il pousse des flancs, et sa crête déborde sur des
 * corbeaux). Un niveau qui ne change que de
 * deux pixels de haut ne se voit pas ; un niveau qui change de silhouette, si.
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

/*
 * BASTIONNET du quatrième niveau : un saillant carré qui déborde du front et
 * descend jusqu'au sol. C'est lui qui fait qu'on voit le dernier niveau sans lire
 * l'infobulle - le plan cesse d'être un rectangle. Il flanque le mur : de là, on
 * prend d'écharpe celui qui vient cogner la face.
 *
 * `cote` = −1 à gauche (pris par la lumière du nord-ouest), +1 à droite (dans
 * l'ombre). Le volume vient de trois faces et de rien d'autre : face avant, joue
 * latérale, dessus - aucun contour.
 */
function Bastionnet({ x, haut, cote }: { x: number; haut: number; cote: -1 | 1 }) {
  const w = 21
  const h = haut * 0.82
  // la joue latérale s'enfonce vers le nord : en vue 3/4 elle monte de 4 px
  const j = 8
  const x0 = x - (cote < 0 ? 0 : w)
  const x1 = x0 + w
  return (
    <g>
      {/* ombre portée au pied, vers le sud-est */}
      <ellipse cx={x0 + w / 2 + 4} cy={5} rx={w * 0.72} ry={4} fill={PAL.ombrePortee} opacity={0.2} />
      {/* face avant */}
      <path d={`M${x0},4 L${x0},${-h} L${x1},${-h} L${x1},4 Z`} fill={PAL.pierreMi} />
      {/* joue latérale, du côté où l'on voit l'épaisseur */}
      {cote < 0 ? (
        <path d={`M${x0},4 L${x0 - j},${4 - j * 0.42} L${x0 - j},${-h - j * 0.42} L${x0},${-h} Z`} fill={PAL.pierreLit} />
      ) : (
        <path d={`M${x1},4 L${x1 + j},${4 - j * 0.42} L${x1 + j},${-h - j * 0.42} L${x1},${-h} Z`} fill={PAL.pierreOmbre} />
      )}
      {/* glacis : chaud à gauche, refroidi à droite - la lumière tient tout */}
      <path
        d={`M${x0},4 L${x0},${-h} L${x1},${-h} L${x1},4 Z`}
        fill={cote < 0 ? '#e8cf9e' : '#6b5f47'}
        opacity={cote < 0 ? 0.2 : 0.16}
      />
      {/* assises : deux joints suffisent à dire l'appareil */}
      <path d={`M${x0},${-h * 0.34} L${x1},${-h * 0.34} M${x0},${-h * 0.67} L${x1},${-h * 0.67}`} stroke={PAL.pierreJoint} strokeWidth={0.8} opacity={0.5} />
      {/* dessus, en raccourci : la tablette qu'on foule */}
      <path
        d={`M${x0},${-h} L${x0 - (cote < 0 ? j : 0)},${-h - (cote < 0 ? j * 0.42 : 0)} L${x1 + (cote > 0 ? j : 0)},${-h - (cote > 0 ? j * 0.42 : 0)} L${x1},${-h} Z`}
        fill={PAL.marbreLit}
      />
      <path d={`M${x0 - (cote < 0 ? j : 0)},${-h - (cote < 0 ? j * 0.42 : 0) - 2.2} L${x1 + (cote > 0 ? j : 0)},${-h - (cote > 0 ? j * 0.42 : 0) - 2.2} L${x1 + (cote > 0 ? j : 0)},${-h - (cote > 0 ? j * 0.42 : 0)} L${x0 - (cote < 0 ? j : 0)},${-h - (cote < 0 ? j * 0.42 : 0)} Z`} fill={PAL.pierreLit} />
      {/* une archère étroite : le saillant tire d'écharpe */}
      <path d={`M${x0 + w / 2 - 1.4},${-h * 0.66} L${x0 + w / 2 + 1.4},${-h * 0.66} L${x0 + w / 2 + 1.4},${-h * 0.3} L${x0 + w / 2 - 1.4},${-h * 0.3} Z`} fill="#655b4c" />
      <path d={`M${x0 + w / 2 - 1.4},${-h * 0.66} L${x0 + w / 2 - 0.5},${-h * 0.66} L${x0 + w / 2 - 0.5},${-h * 0.3} L${x0 + w / 2 - 1.4},${-h * 0.3} Z`} fill={PAL.pierreLit} opacity={0.7} />
    </g>
  )
}

/*
 * LE COURONNEMENT DU QUATRIÈME NIVEAU : un parapet EN ENCORBELLEMENT, porté par
 * des corbeaux qui débordent le massif de treize pixels de chaque côté.
 *
 * Il a fallu trois essais REGARDÉS pour y venir, et les deux premiers valent
 * d'être dits, sans quoi on les refera :
 *
 *  1. « plus large » - `larg` porté à 60. À la vue d'ensemble de la carte,
 *     l'ouvrage devenait une dalle grise de cent trente pixels qu'on lisait comme
 *     un pan de courtine. C'est l'écueil que ce dessin avait déjà rencontré à sa
 *     toute première version.
 *  2. « plus haut » - un réduit dressé derrière, portant la quatrième pièce d'un
 *     cran plus haut. Le parapet du bas, peint APRÈS lui puisqu'il est devant,
 *     l'avalait presque entièrement : il n'en restait qu'un bloc ambigu au-dessus
 *     de la crête, et le dernier niveau se lisait « le troisième, en plus
 *     encombré ».
 *
 * L'encorbellement, lui, résout les trois problèmes d'un coup : il donne les
 * trente pixels de crête qu'il faut pour poser une quatrième pièce sans que les
 * bras d'arc se chevauchent, il n'ajoute RIEN à l'emprise au sol (les corbeaux
 * sont en l'air, et l'enceinte est comptée au sol), et la file de corbeaux fait
 * sous la crête une bande sombre pointillée qui se voit de loin - c'est elle, et
 * non un détail de sculpture, qui dit « ouvrage du règne ».
 */
function Encorbellement({ larg, deb, y }: { larg: number; deb: number; y: number }) {
  return (
    <g>
      {/* les corbeaux, par paquets, sous chaque débord */}
      {[-1, 1].map((cote) =>
        [0, 1, 2, 3].map((i) => {
          const x = cote * (larg - 4) + cote * i * 4.4
          return (
            <g key={`${cote}-${i}`}>
              <path d={`M${x - 1.9},${y} L${x + 1.9},${y} L${x + 1.3},${y + 5.4} L${x - 1.3},${y + 5.4} Z`} fill={PAL.pierreMi} />
              <path
                d={`M${x - 1.9},${y} L${x - 0.6},${y} L${x - 0.1},${y + 5.4} L${x - 1.3},${y + 5.4} Z`}
                fill={cote < 0 ? PAL.pierreLit : PAL.pierreOmbre}
              />
            </g>
          )
        }),
      )}
      {/* le dessous du débord, dans l'ombre : c'est lui qui creuse */}
      <path d={`M${-larg - deb},${y} L${larg + deb},${y} L${larg + deb},${y + 2.6} L${-larg - deb},${y + 2.6} Z`} fill={PAL.ombrePortee} opacity={0.24} />
      {/* la tablette portée, qui déborde franchement */}
      <path d={`M${-larg - deb},${y - 3.4} L${larg + deb},${y - 3.4} L${larg + deb},${y} L${-larg - deb},${y} Z`} fill={PAL.pierreLit} />
      <path d={`M${-larg - deb},${y - 3.4} L${larg + deb},${y - 3.4}`} stroke={PAL.marbreLit} strokeWidth={1.3} />
    </g>
  )
}

/*
 * ═══════════════════ LE PIED DE L'OUVRAGE ═══════════════════
 *
 * « Le haut est génial mais on ne distingue pas bien le bas. » Le joueur avait
 * raison, et la cause tenait en un mot : le tiers inférieur était d'un SEUL TON,
 * sans rien qui dise où finit la maçonnerie et où commence la terre. Le parapet,
 * les scorpions, les créneaux avaient chacun trois valeurs ; l'empattement en
 * avait une, et se posait sur l'herbe comme une image découpée.
 *
 * Quatre choses font qu'un massif REPOSE au lieu de flotter, et ce sont les
 * mêmes qu'aux remparts :
 *  1. un EMPATTEMENT à ressauts - la pierre s'élargit par degrés en descendant,
 *     chacun avec son dessus éclairé et sa face en demi-teinte. C'est ce ressaut
 *     qui dit l'épaisseur, pas le contour ;
 *  2. le BAS EST PLUS SOMBRE. Un mur est humide et sale à son pied : une bande
 *     assombrie sur la dernière assise, et quelques blocs plus foncés ;
 *  3. LE CONTACT AU SOL - la terre s'amoncelle contre l'empattement, en deux
 *     tons, avec des touffes d'herbe et des éclats de taille tombés du chantier.
 *     Sans cela l'ouvrage est POSÉ ; avec, il est ANCRÉ ;
 *  4. LES TRACES DU SERVICE - ornières des charrois qui montent les traits,
 *     jusqu'au pied de la rampe. Un ouvrage qui sert a un sol usé.
 */
function PiedRedoute({ larg, joue, pierre, seed }: { larg: number; joue: number; pierre: boolean; seed: number }) {
  const rnd = alea(seed)
  /*
   * LES VALEURS FONT TOUT. Premier essai : l'empattement reprenait la palette du
   * parement, si bien qu'il se lisait comme « encore du mur » et que le joueur ne
   * distinguait toujours pas le bas. Un empattement est dans l'ombre portée de ce
   * qu'il porte, et il est sale : il doit donc être franchement PLUS SOMBRE que
   * la façade, avec un seul nez clair pour dire l'arête. C'est l'écart de valeur
   * qui sépare, pas le contour.
   */
  const sombre = pierre ? '#645c4d' : '#43341f'
  const mi = pierre ? '#8b8271' : '#634e30'
  const lit = pierre ? '#c3baa4' : '#96784f'
  return (
    <g>
      {/* ── 1. l'empattement, deux ressauts, et l'ombre de ce qu'il porte ── */}
      {/* le premier ressaut : nez clair, face en demi-teinte, ombre du mur dessus */}
      <path d={`M${-larg - 3},0 L${larg + 2},0 L${larg + 2},3.4 L${-larg - 3},3.4 Z`} fill={mi} />
      <path d={`M${-larg - 3},0 L${larg + 2},0 L${larg + 2},1.1 L${-larg - 3},1.1 Z`} fill={lit} />
      <path d={`M${-larg},0 L${larg},0 L${larg},1.1 L${-larg},1.1 Z`} fill={PAL.ombrePortee} opacity={0.3} />
      <path d={`M${larg + 2},0 L${larg + 2 + joue * 0.7},${-joue * 0.3} L${larg + 2 + joue * 0.7},${-joue * 0.3 + 3.4} L${larg + 2},3.4 Z`} fill={sombre} />
      {/* le second, plus large et plus sombre : c'est lui qui entre en terre */}
      <path d={`M${-larg - 7},3.4 L${larg + 5},3.4 L${larg + 5},7 L${-larg - 7},7 Z`} fill={sombre} />
      <path d={`M${-larg - 7},3.4 L${larg + 5},3.4 L${larg + 5},4.4 L${-larg - 7},4.4 Z`} fill={mi} />
      <path d={`M${-larg - 3},3.4 L${larg + 2},3.4 L${larg + 2},4.4 L${-larg - 3},4.4 Z`} fill={PAL.ombrePortee} opacity={0.26} />
      <path d={`M${larg + 5},3.4 L${larg + 5 + joue * 0.5},${-joue * 0.2 + 3.4} L${larg + 5 + joue * 0.5},${-joue * 0.2 + 7} L${larg + 5},7 Z`} fill={sombre} opacity={0.8} />
      {/* joints de l'empattement : de gros blocs, pas un bandeau lisse */}
      {pierre &&
        Array.from({ length: 7 }, (_, i) => {
          const jx = -larg - 5 + ((i + 1) * (larg * 2 + 10)) / 8
          return <path key={`j${i}`} d={`M${jx},4.4 L${jx + 0.8},7`} stroke="#4e4739" strokeWidth={0.8} opacity={0.55} />
        })}

      {/* ── 3. la terre s'amoncelle contre l'empattement ── */}
      <path
        d={`M${-larg - 11},7.4 Q${-larg * 0.5},4.6 ${-larg * 0.05},6.6 Q${larg * 0.45},8.4 ${larg + 9},5.8 L${larg + 9},9.6 Q${larg * 0.4},11.8 ${-larg * 0.1},10 Q${-larg * 0.55},8.4 ${-larg - 11},11 Z`}
        fill="#9d8a5e"
      />
      <path
        d={`M${-larg - 11},7.4 Q${-larg * 0.5},4.6 ${-larg * 0.05},6.6 Q${larg * 0.45},8.4 ${larg + 9},5.8 L${larg + 9},7.2 Q${larg * 0.45},9.8 ${-larg * 0.05},8 Q${-larg * 0.5},6 ${-larg - 11},8.8 Z`}
        fill="#bda878"
      />
      {/*
        Éclats de taille tombés du chantier. Ils se posent DANS la bande de terre,
        jamais sur l'herbe : dehors ils lisaient comme des points blancs semés au
        hasard. Et ils empruntent les tons du SOL, pas ceux de la pierre neuve -
        un éclat qui traîne depuis un mois n'est plus clair.
      */}
      {Array.from({ length: 8 }, (_, i) => {
        const x = -larg - 4 + rnd() * (larg * 2 + 10)
        const y = 6.4 + rnd() * 3.4
        const r = 0.9 + rnd() * 1.5
        return (
          <g key={i}>
            <ellipse cx={x} cy={y} rx={r} ry={r * 0.6} fill={i % 2 ? '#8b7d5e' : '#9c8e6c'} />
            <ellipse cx={x - r * 0.25} cy={y - r * 0.2} rx={r * 0.55} ry={r * 0.3} fill="#ab9d78" />
          </g>
        )
      })}
      {/* touffes d'herbe : elles poussent où l'on ne marche pas, donc aux angles */}
      {[-larg - 4, -larg + 7, larg - 5, larg + 6].map((x, i) => (
        <g key={x} transform={`translate(${x},${7.4 + (i % 2) * 2})`}>
          <path d="M0,0 q-1.2,-2.6 -2.2,-3.4 M0,0 q0.2,-3 -0.2,-4.2 M0,0 q1.4,-2.4 2.6,-3.2" stroke="#7d8c4e" strokeWidth={0.8} fill="none" />
        </g>
      ))}

      {/*
        ── 4. les ornières du charroi qui monte les traits, vers la rampe ──
        Elles étaient invisibles à l'échelle de la carte - même ton que le sol,
        opacité de moitié : des nœuds SVG payés pour rien. Une ornière est un
        CREUX : elle se dit par un sillon sombre doublé d'un bourrelet clair sur
        sa lèvre nord-ouest, comme tout le reste du relief de ce jeu.
      */}
      <path d={`M${-larg - 26},13.4 Q${-larg * 0.3},10.6 ${larg * 0.5},12.4`} stroke="#8a7a58" strokeWidth={1.8} fill="none" opacity={0.7} />
      <path d={`M${-larg - 26},12.5 Q${-larg * 0.3},9.7 ${larg * 0.5},11.5`} stroke="#c6b68b" strokeWidth={0.9} fill="none" opacity={0.6} />
      <path d={`M${-larg - 24},16 Q${-larg * 0.25},13.2 ${larg * 0.55},15`} stroke="#8a7a58" strokeWidth={1.5} fill="none" opacity={0.55} />
      <path d={`M${-larg - 24},15.2 Q${-larg * 0.25},12.4 ${larg * 0.55},14.2`} stroke="#c6b68b" strokeWidth={0.8} fill="none" opacity={0.45} />
    </g>
  )
}

export function Redoute({ n }: { n: number }) {
  if (n <= 0) return null
  const niv = Math.max(1, Math.min(4, n))
  /*
   * Gabarit : TRAPU. Un massif d'environ 90 px de large pour 26 à 38 de haut,
   * là où les bâtiments du village occupent jusqu'à 270 px. La Redoute doit
   * paraître un ouvrage de campagne monté à la hâte, pas un édifice du règne.
   *
   * LE QUATRIÈME NIVEAU NE S'ÉLARGIT PAS - il MONTE. Premier essai fait à
   * `larg = 60`, regardé sur la carte : à la vue d'ensemble l'ouvrage devenait
   * une dalle grise de cent trente pixels qui se lisait comme un pan de courtine,
   * précisément l'écueil déjà rencontré à la première version de ce dessin. Le
   * dernier niveau garde donc la largeur du troisième et gagne huit pixels de
   * haut, deux saillants, une échauguette et un second étage de feu. Un ouvrage
   * de guerre impressionne par sa HAUTEUR, pas par son étalement - et l'enceinte,
   * mesurée, n'avait de toute façon pas cent trente pixels à lui donner.
   */
  const larg = niv === 4 ? 55 : 40 + niv * 5
  const haut = niv === 4 ? 50 : 20 + niv * 6
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

      {/*
        ── la rampe de service : c'est par là qu'on monte les traits ──

        RACCOURCIE de dix pixels (elle partait de −larg−34), et cela n'est pas de
        la cosmétique. La Redoute est désormais un bâtiment posé DANS l'enceinte,
        et l'enceinte est pleine : sa place a été trouvée par la mesure des boîtes
        réelles des dix autres édifices, dans la bande de 84 px qui sépare la
        forge de la caserne. Chaque pixel d'emprise à gauche était un pixel qui
        mordait sur l'agora. La rampe est donc plus RAIDE - ce qui, pour un
        ouvrage de campagne, se défend très bien.
      */}
      <g>
        {/* le remblai, en volume, avec sa propre ombre au sol */}
        <path d={`M${-larg - 24},7 L${-larg + 2},${pont + 5} L${-larg + 2},${pont + 13} L${-larg - 19},13 Z`} fill="#8e7f59" />
        <path d={`M${-larg - 24},7 L${-larg + 2},${pont + 5} L${-larg + 2},${pont + 8} L${-larg - 22},9.6 Z`} fill="#c2b285" />
        <path d={`M${-larg - 19},13 L${-larg + 2},${pont + 13} L${-larg + 2},${pont + 15} L${-larg - 18},15 Z`} fill="#6f6247" />
        {/* traverses de rondins qui retiennent la terre */}
        {[0.14, 0.32, 0.5, 0.68, 0.86].map((f) => {
          const x0 = -larg - 24 + f * 26
          const y0 = 7 + f * (pont + 5 - 7)
          return <path key={f} d={`M${x0},${y0 + 0.8} L${x0 + 1.4},${y0 + 6.6}`} stroke="#7a6c4c" strokeWidth={1.8} />
        })}
        {/* garde-corps de perches, côté vide */}
        <path d={`M${-larg - 22},6 L${-larg},${pont + 4}`} stroke={PAL.boisOmbre} strokeWidth={1.3} />
        {[0.25, 0.6, 0.9].map((f) => {
          const x0 = -larg - 22 + f * 22
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
          {/*
            LA JOUE, et non plus un aplat sombre de toute la hauteur. C'est le
            RETOUR du même ouvrage : les mêmes fûts vus de flanc, les mêmes moises
            qui tournent l'angle, le même remblai à son pied. Un ouvrage dont le
            côté ne montre rien de ce que montre la face n'est pas un volume,
            c'est un panneau posé de biais.
          */}
          <path d={`M${larg},0 L${larg + joue},${-joue * 0.4} L${larg + joue},${-haut - joue * 0.4} L${larg - 3},${-haut} Z`} fill="#5e4a2e" />
          {/* les fûts de flanc, plus serrés qu'en face : la perspective les tasse */}
          {[0.18, 0.42, 0.66, 0.88].map((f) => {
            const jx = larg + joue * f
            const jy = -joue * 0.4 * f
            return (
              <g key={f}>
                <path d={`M${jx},${jy} L${jx},${jy - haut}`} stroke="#4a3a23" strokeWidth={2.2} />
                <path d={`M${jx - 0.7},${jy} L${jx - 0.7},${jy - haut}`} stroke="#6d5636" strokeWidth={0.9} />
              </g>
            )
          })}
          {/* les deux moises tournent l'angle : c'est ce qui lie les deux faces */}
          {[0.34, 0.68].map((f) => (
            <g key={f}>
              <path
                d={`M${larg - 1},${-haut * f} L${larg + joue},${-haut * f - joue * 0.4} L${larg + joue},${-haut * f - joue * 0.4 + 2.6} L${larg - 1},${-haut * f + 3} Z`}
                fill="#54432a"
              />
              <path
                d={`M${larg - 1},${-haut * f} L${larg + joue},${-haut * f - joue * 0.4} L${larg + joue},${-haut * f - joue * 0.4 + 0.8} L${larg - 1},${-haut * f + 0.9} Z`}
                fill="#7b6440"
              />
            </g>
          ))}
          {/* et le remblai revient au pied de la joue */}
          <path
            d={`M${larg - 1},-1.4 L${larg + joue},${-joue * 0.4 - 1.4} L${larg + joue},${-joue * 0.4 + 2.6} L${larg - 1},2.6 Z`}
            fill="#7a6845"
          />
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
            /*
             * L'ÉCART DE VALEUR entre fûts voisins était trop faible : à la taille
             * de la carte, onze cylindres du même brun se fondent en une dalle -
             * c'est ce que le joueur voyait. On tire donc chaque fût dans une
             * gamme large, et l'on n'alterne pas mécaniquement : deux clairs
             * peuvent se suivre, comme dans un vrai rideau de bois abattu à la
             * hâte.
             */
            const g = rnd()
            const ame = g < 0.33 ? '#8d7048' : g < 0.66 ? '#7a6039' : '#6a5231'
            const clair = g < 0.33 ? '#b09068' : g < 0.66 ? '#9d7f52' : '#8a6f47'
            return (
              <g key={i}>
                <path d={`M${px - w / 2},-1 L${px - w / 2 + 0.8},${tete} L${px + w / 2 + 0.8},${tete} L${px + w / 2},-1 Z`} fill={ame} />
                <path d={`M${px - w / 2},-1 L${px - w / 2 + 0.8},${tete} L${px - w / 2 + 1.9},${tete} L${px - w / 2 + 1.1},-1 Z`} fill={clair} />
                <path d={`M${px + w / 2 - 0.9},-1 L${px + w / 2 + 0.1},${tete} L${px + w / 2 + 0.8},${tete} L${px + w / 2},-1 Z`} fill="#4f3d24" />
                {/* la tête du rondin, vue de dessus en raccourci */}
                <ellipse cx={px + 0.4} cy={tete} rx={w / 2} ry={w / 5} fill="#b08f60" />
              </g>
            )
          })}
          {/*
            LES MOISES. Un rideau de rondins ne tient pas debout tout seul : deux
            longrines horizontales le ceinturent, ligaturées à chaque troisième
            fût. C'est la pièce qui manquait le plus - sans elle, onze verticales
            parallèles n'ont aucune structure à lire, et l'œil ne voit qu'un aplat.
            Elles donnent en prime les deux lignes horizontales qui découpent la
            hauteur, et le bas cesse d'être un bloc.
          */}
          {[0.34, 0.68].map((f, k) => {
            const my = -haut * f
            return (
              <g key={f}>
                <path d={`M${-larg + 1},${my} L${larg - 1},${my - 0.6} L${larg - 1},${my + 2.6} L${-larg + 1},${my + 3.2} Z`} fill="#6b5433" />
                <path d={`M${-larg + 1},${my} L${larg - 1},${my - 0.6} L${larg - 1},${my + 0.7} L${-larg + 1},${my + 1.3} Z`} fill="#9c7c4e" />
                {/*
                  Ligatures, un fût sur trois. Deux traits VERTICAUX et clairs
                  lisaient comme des allumettes collées sur la longrine ; une
                  corde tourne autour du bois, donc elle est OBLIQUE, sombre à
                  l'ombre du tour précédent, et serrée - trois passes qui se
                  touchent, pas deux bâtons espacés.
                */}
                {[0, 1, 2, 3].map((j) => {
                  const lx = -larg + 8 + j * ((larg * 2 - 16) / 3) + (k ? 4 : 0)
                  return (
                    <g key={j}>
                      <path
                        d={`M${lx - 0.4},${my + 3.6} l1.5,-4.4 M${lx + 0.7},${my + 3.7} l1.5,-4.4 M${lx + 1.8},${my + 3.8} l1.5,-4.4`}
                        stroke="#8a7346"
                        strokeWidth={1.1}
                        fill="none"
                      />
                      <path
                        d={`M${lx - 0.1},${my + 3.2} l1.5,-4.4 M${lx + 1},${my + 3.3} l1.5,-4.4`}
                        stroke="#b5a173"
                        strokeWidth={0.6}
                        fill="none"
                      />
                    </g>
                  )
                })}
              </g>
            )
          })}
          {/* la terre du remblai déborde entre les rondins, au pied */}
          {/*
            LE PIED. Les rondins ne s'arrêtent pas en l'air : ils sont FICHÉS dans
            un remblai, et c'est ce remblai qu'on ne voyait pas. Il monte contre
            eux en deux tons, avale le bas de chaque fût, et se cale sur des
            pierres de blocage - la façon dont on tient une palissade quand on n'a
            ni chaux ni temps.
          */}
          <path
            d={`M${-larg - 2},0 Q${-larg * 0.35},${-5.4} ${larg * 0.15},${-3.2} Q${larg * 0.65},${-1.4} ${larg + 1},${-3.6} L${larg + 1},2 L${-larg - 2},2 Z`}
            fill="#8a7649"
          />
          <path
            d={`M${-larg - 2},0 Q${-larg * 0.35},${-5.4} ${larg * 0.15},${-3.2} Q${larg * 0.65},${-1.4} ${larg + 1},${-3.6} L${larg + 1},${-2} Q${larg * 0.65},0.2 ${larg * 0.15},${-1.6} Q${-larg * 0.35},${-3.6} ${-larg - 2},1.6 Z`}
            fill="#bda878"
          />
          {/* pierres de blocage, coincées entre les fûts */}
          {Array.from({ length: 7 }, (_, i) => {
            const bx = -larg + 6 + (i * (larg * 2 - 12)) / 6 + (rnd() - 0.5) * 5
            const by = -2.4 + rnd() * 3.4
            const br = 1.6 + rnd() * 1.8
            return (
              <g key={`bl${i}`}>
                <ellipse cx={bx} cy={by} rx={br} ry={br * 0.72} fill={i % 2 ? '#9a917c' : '#877e6a'} />
                <ellipse cx={bx - br * 0.25} cy={by - br * 0.28} rx={br * 0.6} ry={br * 0.38} fill="#b0a68e" />
              </g>
            )
          })}
          <PiedRedoute larg={larg} joue={joue} pierre={false} seed={71 + niv} />
          {/*
            ═══ LE PLANCHER DE TIR ═══
            Trois chemins plats - un quadrilatère, un filet clair, une ombre - et
            l'on ne comprenait pas ce qu'on regardait : une bande brune entre le
            parapet et le rideau, sans épaisseur ni matière. C'est pourtant la
            pièce qui explique tout le bâtiment, celle sur laquelle les scorpions
            reposent.
            Quatre choses la rendent lisible, et ce sont celles d'un vrai plancher :
            les MADRIERS, posés dans le sens de la profondeur ; le CHANT du
            plancher, qui donne son épaisseur ; les ABOUTS DE SOLIVE qui en
            sortent ; et les CORBEAUX qui portent le débord. On lit alors une
            charpente posée sur un rideau de rondins, ce qui est exactement ce
            qu'est cet ouvrage.
          */}
          {/*
            La surface du plancher est plus CLAIRE que le rideau : elle regarde le
            ciel quand lui regarde l'horizon. C'est cet écart de valeur - et non un
            trait de séparation - qui fait qu'on lit « un sol » puis « un mur », et
            non une seule masse brune de haut en bas.
          */}
          <path d={`M${-larg - 4},${-haut} L${larg + 3},${-haut} L${larg + joue},${pont} L${-larg},${pont} Z`} fill="#a3855a" />
          {/* les madriers : un joint tous les six pas, dans le sens de la fuite */}
          {Array.from({ length: 13 }, (_, i) => {
            const f = (i + 1) / 14
            const xa = -larg - 4 + f * (larg * 2 + 7)
            const xb = -larg + f * (larg * 2 + joue)
            return <path key={i} d={`M${xa},${-haut} L${xb},${pont}`} stroke="#6b5433" strokeWidth={0.8} opacity={0.75} />
          })}
          {/* deux madriers plus clairs : un plancher n'est pas fait d'un seul bois */}
          {[3, 8].map((i) => {
            const f = (i + 1) / 14
            const g = (i + 2) / 14
            return (
              <path
                key={i}
                d={`M${-larg - 4 + f * (larg * 2 + 7)},${-haut} L${-larg + f * (larg * 2 + joue)},${pont} L${-larg + g * (larg * 2 + joue)},${pont} L${-larg - 4 + g * (larg * 2 + 7)},${-haut} Z`}
                fill="#a08256"
                opacity={0.5}
              />
            )
          })}
          {/* l'arête du plancher, côté dedans, prise par la lumière */}
          <path d={`M${-larg},${pont} L${larg + joue},${pont}`} stroke={PAL.boisLit} strokeWidth={1.4} />
          {/* le CHANT : l'épaisseur du plancher, en débord au-dessus du rideau */}
          <path d={`M${-larg - 4},${-haut} L${larg + 3},${-haut} L${larg + 3},${-haut + 2.8} L${-larg - 4},${-haut + 2.8} Z`} fill="#6b5433" />
          <path d={`M${-larg - 4},${-haut} L${larg + 3},${-haut} L${larg + 3},${-haut + 0.9} L${-larg - 4},${-haut + 0.9} Z`} fill="#9c7c4e" />
          {/* les abouts de solive qui sortent du chant, un sur deux madriers */}
          {Array.from({ length: 7 }, (_, i) => {
            const sx = -larg - 1 + (i * (larg * 2 + 1)) / 6
            return (
              <g key={`s${i}`}>
                <rect x={sx} y={-haut + 0.4} width={2.6} height={3.6} fill="#7f6540" />
                <rect x={sx} y={-haut + 0.4} width={2.6} height={1} fill="#b08f60" />
              </g>
            )
          })}
          {/* les corbeaux qui portent le débord : deux plans, donc du volume */}
          {Array.from({ length: 4 }, (_, i) => {
            const cx = -larg + 6 + (i * (larg * 2 - 12)) / 3
            return (
              <g key={`c${i}`}>
                <path d={`M${cx},${-haut + 3.4} L${cx + 4.4},${-haut + 3.4} L${cx + 2.2},${-haut + 8.4} Z`} fill="#54432a" />
                <path d={`M${cx},${-haut + 3.4} L${cx + 1.6},${-haut + 3.4} L${cx + 1.4},${-haut + 6.6} Z`} fill="#8a6f47" />
              </g>
            )
          })}
          {/* ombre du débord sur le haut du rideau */}
          <path d={`M${-larg + 2},${-haut + 2.8} L${larg - 2},${-haut + 2.8} L${larg - 2},${-haut + 6.2} L${-larg + 2},${-haut + 6.2} Z`} fill={PAL.ombrePortee} opacity={0.2} />

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
          {/*
            LE PIED. Il n'était qu'un biseau d'un seul ton : l'ouvrage semblait
            découpé et posé sur l'herbe. Cf. `PiedRedoute` - deux ressauts, la
            dernière assise assombrie, la terre qui monte contre l'empattement.
          */}
          {/* la dernière assise est humide et sale : elle est plus sombre */}
          <path d={`M${-larg},${-5.5} L${larg},${-5.5} L${larg},0 L${-larg},0 Z`} fill={PAL.ombrePortee} opacity={0.13} />
          {Array.from({ length: 5 }, (_, i) => {
            const bx = -larg + 4 + (i * (larg * 2 - 10)) / 4 + (rnd() - 0.5) * 6
            return <rect key={`hu${i}`} x={bx} y={-5} width={7 + rnd() * 5} height={4.4} fill={PAL.pierreOmbre} opacity={0.22} />
          })}
          <PiedRedoute larg={larg} joue={joue} pierre seed={71 + niv} />

          {/*
            Les deux saillants du dernier niveau, PEINTS APRÈS la façade et avant
            le cordon : ils sont DEVANT le front, et leur tablette s'arrête sous
            la corniche. Peints avant, ils auraient disparu sous le parement.
          */}
          {niv === 4 && (
            <>
              <Bastionnet x={-larg + 2} haut={haut} cote={-1} />
              <Bastionnet x={larg - 2} haut={haut} cote={1} />
            </>
          )}

          {/* cordon de couronnement, puis le plancher de tir */}
          <path d={`M${-larg - 4},${-haut} L${larg + 3},${-haut} L${larg + joue},${pont} L${-larg},${pont} Z`} fill={PAL.pierreLit} />
          <path d={`M${-larg},${pont} L${larg + joue},${pont}`} stroke={PAL.marbreLit} strokeWidth={1.4} />
          <path d={`M${-larg - 4},${-haut} L${larg + 3},${-haut}`} stroke={PAL.pierreJoint} strokeWidth={0.9} opacity={0.45} />
          {/* ombre du cordon sur la façade : le débord se voit */}
          <path d={`M${-larg + 1},${-haut} L${larg - 1},${-haut} L${larg - 1},${-haut + 3.6} L${-larg + 1},${-haut + 3.6} Z`} fill={PAL.ombrePortee} opacity={0.15} />

          {/*
            Les machines d'abord : le parapet leur passera devant.

            DEUX ÉTAGES DE FEU au dernier niveau, et c'est le trait qui le fait
            reconnaître d'un coup d'œil. Le quatrième scorpion ne se serre pas sur
            la crête - quatre affûts de quarante pixels sur cent dix de parapet se
            chevauchaient et faisaient une haie de bâtons - il descend sur la
            tablette du bastionnet droit. Une batterie à deux niveaux se lit ; une
            rangée trop dense ne se compte pas.
          */}
          {/*
            La crête élargie du dernier niveau est peinte AVANT les machines : les
            corbeaux et la tablette passent derrière les affûts, la dentelle des
            merlons passera devant. C'est le même ordre qu'aux autres niveaux.
          */}
          {niv === 4 && <Encorbellement larg={larg} deb={14} y={pont + 1} />}
          {/*
            Les positions des affûts sur le plancher. Aux trois premiers niveaux
            elles suivent `REDOUTE_POSTES` ; au quatrième la batterie se REDISPOSE
            sur la crête portée - quatre machines à trente pixels d'écart, pour que
            les bras d'arc ne se chevauchent pas. C'est la seule mise en place qui
            permette de COMPTER les pièces d'un coup d'œil, et compter les pièces
            est la manière dont le joueur lit le niveau.
          */}
          {(niv === 4 ? [-51, -21, 9, 39] : REDOUTE_POSTES.slice(0, niv).map((p) => p.dx)).map((dx, i) => (
            <Scorpion key={i} x={dx} y={pont - (niv === 2 ? 9 : 12)} s={1.08} seed={i + 1} tour={i} />
          ))}

          {/* parapet : embrasures au niveau 2, créneaux aux niveaux 3 et 4 */}
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
              {/* mur d'allège continu, puis les merlons - élargi au niveau 4 */}
              {(() => {
                const g0 = niv === 4 ? -larg - 14 : -larg + 1
                const g1 = niv === 4 ? larg + 14 : larg + 2
                return (
                  <>
                    <path d={`M${g0},${pont + 1} L${g1},${pont + 1} L${g1},${pont - 7} L${g0},${pont - 7} Z`} fill={PAL.pierreMi} />
                    <path d={`M${g0},${pont - 7} L${g1},${pont - 7} L${g1},${pont - 9} L${g0},${pont - 9} Z`} fill={PAL.pierreLit} />
                    <path d={`M${g0},${pont + 1} L${-larg * 0.1},${pont + 1} L${-larg * 0.1},${pont - 9} L${g0},${pont - 9} Z`} fill="#e8cf9e" opacity={0.16} />
                  </>
                )
              })()}
              {/*
                Sept merlons au dernier niveau contre cinq au troisième, sur la
                même largeur : la crête se resserre, et c'est ce qui distingue les
                deux couronnements à l'œil, la hauteur étant presque la même.
              */}
              {/*
                Sept merlons au dernier niveau contre cinq au troisième, de MÊME
                épaisseur et de même hauteur : la crête est plus longue parce
                qu'elle est portée en encorbellement, elle n'est ni plus maigre ni
                plus haute. Une version à merlons rétrécis a été essayée puis
                regardée : le dernier niveau paraissait plus FAIBLE que le
                précédent, ce qui est exactement le contraire du propos.
              */}
              {(niv === 4
                ? [-1.12, -0.75, -0.37, 0, 0.37, 0.75, 1.12]
                : [-0.9, -0.42, 0.06, 0.54, 0.94]
              ).map((f, i) => {
                const w = 14
                const hm = 19
                const bx = larg * f - w / 2
                return (
                  <g key={f}>
                    <rect x={bx} y={pont - hm} width={w} height={hm - 8} fill={i % 2 ? PAL.pierreMi : PAL.pierreLit} />
                    <rect x={bx} y={pont - hm} width={w} height={2} fill={PAL.marbreLit} />
                    <rect x={bx + w - 2.4} y={pont - hm} width={2.4} height={hm - 8} fill={PAL.pierreOmbre} opacity={0.65} />
                    {f < 0 && <rect x={bx} y={pont - hm} width={w} height={hm - 8} fill="#e8cf9e" opacity={0.13} />}
                  </g>
                )
              })}
            </g>
          )}
        </g>
      )}

      {/* ── le train : ce qui sert les machines ── */}
      {/* râtelier de traits, dressé au pied de la rampe */}
      <g transform={`translate(${-larg - 15},7)`}>
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

      {/*
        Le fanion de la pièce : l'ouvrage est en batterie. Au dernier niveau il
        descend sur la tablette du bastionnet droit - le quatrième scorpion prend
        toute la droite du parapet, et la hampe se plantait au milieu de ses bras.
      */}
      {niv >= 2 && (
        <g transform={`translate(${niv === 4 ? larg + 11 : larg * 0.9},${pont - (niv === 2 ? 12 : 8)})`}>
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
