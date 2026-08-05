import { act, type ReactElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { useGame, type GameState } from '../game/store'

/*
 * OUTILLAGE DES TESTS DE RENDU.
 *
 * Les 344 tests du socle vérifient les RÈGLES ; rien ne vérifiait l'écran. Or
 * une règle juste affichée de travers est un bug pour le joueur : une pastille
 * qui dit « 0 oisif » alors que trois bras traînent, un bouton d'amélioration
 * cliquable sans avoir la pierre.
 *
 * Pas de @testing-library ici : aucune dépendance n'est ajoutée au projet. On
 * monte de vrais composants avec `react-dom/client` et l'`act` que React 18.3
 * expose lui-même, puis on interroge le DOM à la main.
 */

// sans ce drapeau, React 18 avertit à chaque `act` qu'il ne sait pas où il tourne
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/*
 * jsdom n'implémente pas `matchMedia`, et plusieurs composants s'en servent pour
 * décider de leur état de départ (le suivi des missions se replie sur écran
 * étroit). On répond « écran large » : c'est la vue de référence du jeu.
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((requete: string) => ({
    matches: false,
    media: requete,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

export interface Montage {
  /** le nœud où le composant a été rendu */
  container: HTMLElement
  /**
   * Tout le texte visible. On lit `document.body` et non le conteneur : le
   * châssis des modales (panthéon, héros, recensement…) sort du flux par un
   * portail vers `body`, et ce texte-là est justement celui que le joueur voit.
   */
  texte: () => string
  /** premier élément correspondant au sélecteur, portails compris */
  q: (sel: string) => Element | null
  /** tous les éléments correspondant au sélecteur, portails compris */
  qq: (sel: string) => Element[]
  demonter: () => void
}

export function monter(element: ReactElement): Montage {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(element)
  })
  return {
    container,
    texte: () => document.body.textContent ?? '',
    q: (sel) => document.body.querySelector(sel),
    qq: (sel) => [...document.body.querySelectorAll(sel)],
    demonter: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

/** monte un fragment SVG (couches de la carte : jauges de secteur, santé des bâtiments) */
export function monterSvg(enfants: ReactNode): Montage {
  return monter(<svg viewBox="0 0 1000 600">{enfants}</svg>)
}

/*
 * L'état neuf, saisi une fois pour toutes à l'import : le store est un singleton
 * global, donc un test qui pose vingt villageois les laisserait au suivant.
 */
const CHAMPS_NEUFS = Object.fromEntries(
  Object.entries(useGame.getState()).filter(([, v]) => typeof v !== 'function'),
)

/** remet le store dans l'état d'une partie neuve, et vide le DOM des portails oubliés */
export function reinitialiser(): void {
  useGame.setState(structuredClone(CHAMPS_NEUFS) as Partial<GameState>)
  document.body.innerHTML = ''
}

/** raccourci de préparation : pose un morceau d'état sur la partie neuve */
export function poser(etat: Partial<GameState>): void {
  useGame.setState(etat)
}

/** un habitant de test - métier de naissance, poste tenu, âge adulte par défaut */
export function habitant(
  nom: string,
  metier: GameState['villageois'][number]['metier'],
  poste: GameState['villageois'][number]['poste'] = null,
  extra: Partial<GameState['villageois'][number]> = {},
): GameState['villageois'][number] {
  return { id: `v-${nom}`, nom, metier, poste, ...extra }
}
