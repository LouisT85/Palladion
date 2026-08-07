import type { Ouvrage } from '../../game/ouvrages'
import { Jauge } from './SanteBatiments'

/*
 * ═══════════ CE QUE L'ON DÉMOLIT CHEZ L'AUTRE ═══════════
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
 * ── CE QUI A ÉTÉ RETIRÉ D'ICI, ET POURQUOI ──
 *
 * Cette couche dessinait aussi, pour tout ouvrage à zéro, un tas de gravats ET
 * trois grands disques gris translucides animés en rayon jusqu'à 2,4×. Le décor
 * ne savait rien de la chute : la tente restait DEBOUT, intacte, sous un halo
 * pâle. La ruine appartient au DÉCOR, pas à la couche d'information : c'est
 * `Interieur` (VillageEnnemi.tsx) qui remplace désormais chaque élément abattu
 * par sa ruine, à la position que `ouvrages.ts` déclare. Une seule vérité, un
 * seul dessin. Il ne reste ici que ce qui est de son ressort : des jauges.
 *
 * ⚠️ CE N'ÉTAIT PAS LA CAUSE PRINCIPALE DES « BÂTIMENTS TRANSPARENTS ».
 *
 * Ces disques étaient laids, mais le vrai coupable est ailleurs et il est
 * MESURÉ : `main.scene.scene-derriere > svg.carte { display: none }`
 * (styles.css) retire la carte du village du rendu pendant une expédition. Or
 * ses `<defs>` portent les MÊMES identifiants que ceux de la scène d'expédition
 * (`DefsArt` est monté deux fois), et le navigateur résout `url(#a-bois-l)` sur
 * le PREMIER du document - celui de la carte éteinte. Tout ce qui est peint d'un
 * dégradé dans la scène d'expédition devient donc invisible : le fût de la tour
 * de guet, les murs des baraquements, l'occlusion des bases. Ne subsistent que
 * les à-plats - d'où la meurtrière qui flotte, seule, en carré noir.
 *
 * Relevé du pixel au centre du fût de la tour de guet, fort achéen :
 *   display:none .............. (170,168,112) - l'herbe : rien n'est peint
 *   content-visibility:hidden . (145,114,75)  - le bois
 * et le prix en images par seconde, mêlée gelée, cas entrelacés :
 *   display:none 31,8 · content-visibility:hidden 31,2 · carte peinte 10,4
 * Le correctif ne coûte donc rien. Il est hors de ce fichier : voir `aCabler`.
 */

export function SanteOuvrages({ ouvrages, actif }: { ouvrages: Ouvrage[] | undefined; actif: boolean }) {
  if (!ouvrages || !actif) return null
  return (
    <g>
      {ouvrages.map((o) => {
        const part = Math.max(0, Math.min(1, o.hp / o.max))
        // intact et sans importance : pas de jauge. Le cœur, lui, se lit toujours.
        if (part >= 0.999 && !o.coeur) return null
        // abattu : la ruine peinte dans le décor le dit mieux qu'une barre vide
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
