import type { SVGProps } from 'react'

/*
 * ═════════════ DÉMARRER UNE ANIMATION SMIL AU MOMENT DE SON INSERTION ═════════════
 *
 * Piège coûteux, et vérifié au navigateur : l'horloge SMIL est celle du DOCUMENT,
 * pas celle de l'élément. Un `<animate dur="2s" fill="freeze">` inséré trois
 * minutes après le chargement de la page a son intervalle [0 s ; 2 s] ENTIÈREMENT
 * DANS LE PASSÉ - le navigateur le considère fini et gèle aussitôt la dernière
 * valeur. Mesure faite sur Chromium : opacité lue 200 ms après l'insertion d'un
 * fondu « 1 → 0 » = 0. L'effet ne se voit jamais.
 *
 * C'est ce qui rendait l'éclair de Zeus invisible, faisait apparaître les flèches
 * directement sur leur cible et couchait les morts avant qu'ils tombent : tout ce
 * qui naît en cours de partie, c'est-à-dire tout le spectacle de la bataille.
 *
 * Le remède : `begin="indefinite"` - qui n'arme aucun intervalle - puis un appel
 * à `beginElement()` dès que le nœud entre dans le document. L'animation part
 * alors de l'instant présent. Même mesure après correction : 0,89 à 200 ms, 0,49
 * à 1 s, 0 à 2,2 s.
 *
 * Ces trois enveloppes remplacent `<animate>`, `<animateTransform>` et
 * `<animateMotion>` PARTOUT où l'élément apparaît en cours de partie. Les
 * animations décoratives permanentes (fanions, fumées, flots) sont posées au
 * montage de la carte et bouclent sans fin : elles n'ont pas besoin de ceci.
 */

/** ref appelée à l'insertion du nœud : c'est là que l'horloge de l'effet démarre */
function demarrer(el: SVGAnimationElement | null) {
  // `beginElement` n'existe pas sous jsdom - les tests de rendu ne doivent pas tomber
  el?.beginElement?.()
}

export function Anim(props: SVGProps<SVGAnimateElement>) {
  return <animate ref={demarrer} {...props} begin="indefinite" />
}

export function AnimT(props: SVGProps<SVGAnimateTransformElement>) {
  return <animateTransform ref={demarrer} {...props} begin="indefinite" />
}

export function AnimM(props: SVGProps<SVGAnimateMotionElement>) {
  return <animateMotion ref={demarrer} {...props} begin="indefinite" />
}
