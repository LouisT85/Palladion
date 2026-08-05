import type { Ouvrage } from '../../game/ouvrages'
import { PAL, alea } from './art'
import { Jauge } from './SanteBatiments'
import { Anim, AnimT } from './smil'

/*
 * ═══════════ CE QUE L'ON DÉMOLIT CHEZ L'AUTRE, ET CE QU'IL EN RESTE ═══════════
 *
 * Le pendant exact de `SanteBatiments`, tourné vers l'extérieur. Même grammaire
 * de lecture - vert, ambre, rouge - et même règle d'apparition : rien ne s'affiche
 * tant que rien n'est entamé, le CŒUR de la place excepté, parce que c'est lui qui
 * dit combien de temps il reste avant que la place soit prise.
 *
 * Une différence, voulue : ici CHAQUE ouvrage porte son nom. Chez soi, le joueur
 * connaît son village par cœur et dix étiquettes seraient du bruit ; chez l'autre
 * il découvre la place, et « Greniers voûtés » lui apprend en un mot ce qu'il est
 * en train de brûler.
 *
 * Un ouvrage tombé ne disparaît pas du décor peint : on pose dessus des ruines
 * fumantes. Effacer le dessin laisserait un trou dans la composition ; le
 * couvrir de gravats et de fumée raconte l'assaut.
 */

/** gravats et fumée sur un ouvrage abattu - le décor peint reste dessous */
function Ruine({ o }: { o: Ouvrage }) {
  const rnd = alea(o.x * 7 + o.y * 13 + o.nom.length)
  const l = Math.max(18, o.haut * 0.62)
  // trois volutes qui montent sans fin : la place fume jusqu'à la fin du raid
  const volutes = [0, 1, 2].map((i) => ({
    dx: (rnd() - 0.5) * l * 0.7,
    r: 5 + rnd() * 5,
    dur: 3400 + i * 900,
    o: 0.34 - i * 0.07,
  }))
  const pierres = [0, 1, 2, 3, 4].map(() => ({
    x: (rnd() - 0.5) * l,
    y: -rnd() * 6,
    rx: 2.4 + rnd() * 3.4,
  }))
  return (
    <g transform={`translate(${o.x},${o.y})`} pointerEvents="none">
      {/* le tas : ombre au sol, gravats clairs au nord-ouest, sombres au sud-est */}
      <ellipse cx={l * 0.14} cy={2.4} rx={l * 0.66} ry={l * 0.2} fill={PAL.ombrePortee} opacity={0.2} />
      <ellipse cx={0} cy={0} rx={l * 0.58} ry={l * 0.18} fill="#8d8270" />
      <ellipse cx={-l * 0.1} cy={-2} rx={l * 0.46} ry={l * 0.14} fill="#a89d87" />
      {pierres.map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.rx * 0.62} fill={i % 2 ? '#b5aa93' : '#7d7362' } />
      ))}
      {/* braises : elles respirent, sans jamais s'éteindre */}
      <ellipse cx={l * 0.06} cy={-1.6} rx={l * 0.22} ry={l * 0.08} fill="#c9522c" opacity={0.5}>
        <Anim attributeName="opacity" values="0.5;0.24;0.5" dur="2.1s" repeatCount="indefinite" />
      </ellipse>
      {volutes.map((v, i) => (
        <g key={i}>
          <AnimT
            attributeName="transform"
            type="translate"
            values={`${v.dx},0;${v.dx * 1.6},${-l * 1.5}`}
            dur={`${v.dur}ms`}
            repeatCount="indefinite"
          />
          <circle cx={0} cy={-4} r={v.r} fill="#6d6459" opacity={v.o}>
            <Anim attributeName="r" values={`${v.r};${v.r * 2.4}`} dur={`${v.dur}ms`} repeatCount="indefinite" />
            <Anim attributeName="opacity" values={`${v.o};0`} dur={`${v.dur}ms`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
    </g>
  )
}

export function SanteOuvrages({ ouvrages, actif }: { ouvrages: Ouvrage[] | undefined; actif: boolean }) {
  if (!ouvrages || !actif) return null
  return (
    <g>
      {ouvrages.filter((o) => o.hp <= 0).map((o) => (
        <Ruine key={o.id} o={o} />
      ))}
      {ouvrages.map((o) => {
        const part = Math.max(0, Math.min(1, o.hp / o.max))
        // intact et sans importance : pas de jauge. Le cœur, lui, se lit toujours.
        if (part >= 0.999 && !o.coeur) return null
        if (part <= 0) return null
        return (
          <Jauge
            key={o.id}
            x={o.x}
            y={o.y - o.haut - (o.coeur ? 16 : 10)}
            part={part}
            nom={o.nom}
            coeur={o.coeur}
            emoji="🏴"
            titre
          />
        )
      })}
    </g>
  )
}
