import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Astuce } from './Infobulle'

/*
 * LE CHÂSSIS COMMUN DES MENUS.
 *
 * Tous les panneaux qui s'ouvrent par-dessus la carte - panthéon, héros, hauts
 * faits, expéditions, missions, journal, recensement, aide - partageaient le
 * même squelette copié six fois, et se fermaient de six façons différentes :
 * un bouton en bas de page qu'il fallait aller chercher après avoir déroulé
 * quarante-cinq hauts faits, ou un clic dans le vide que rien n'annonçait.
 *
 * Il y a maintenant trois sorties, toujours les mêmes :
 *   · la CROIX en haut à droite, visible dès l'ouverture et qui ne défile pas ;
 *   · la touche ÉCHAP ;
 *   · le clic hors du cadre.
 *
 * Les modales de DÉCISION (dilemme, arc de héros, rapport de bataille, fin de
 * règne) n'utilisent pas ce châssis : elles n'ont pas de sortie, c'est exprès.
 */
export function Modale({
  titre,
  sous,
  onFermer,
  large,
  classe,
  dataTuto,
  fermerTexte = 'Fermer',
  children,
}: {
  titre: ReactNode
  /** une ligne d'explication sous le titre */
  sous?: ReactNode
  onFermer: () => void
  /** gabarit élargi : les listes à cartes (héros, hauts faits, expéditions) */
  large?: boolean
  classe?: string
  /** cible du tutoriel, portée par le cadre lui-même */
  dataTuto?: string
  /** libellé du bouton de bas de page - `null` pour ne pas en mettre */
  fermerTexte?: string | null
  children: ReactNode
}) {
  // Échap ferme : c'est le réflexe de tout le monde, et cela ne coûte rien
  useEffect(() => {
    const onTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer()
    }
    window.addEventListener('keydown', onTouche)
    return () => window.removeEventListener('keydown', onTouche)
  }, [onFermer])

  /*
   * Portail vers `body` : le recensement s'ouvre depuis le panneau de bâtiment,
   * qui porte un `backdrop-filter`. Or un tel filtre crée un nouveau contexte de
   * conteneur - un `position: fixed` à l'intérieur s'y trouve piégé dans les
   * 330 px du panneau. Le châssis sort donc toujours du flux.
   */
  return createPortal(
    <div className="voile" onClick={onFermer}>
      <div
        className={`modale modale-chassis${large ? ' large' : ''}${classe ? ` ${classe}` : ''}`}
        data-tuto={dataTuto}
        onClick={(e) => e.stopPropagation()}
      >
        {/* le titre ne défile pas : la croix reste sous la main même au bas de
            quarante-cinq hauts faits */}
        <div className="modale-tete">
          <h2>{titre}</h2>
          {sous && <div className="modale-sous">{sous}</div>}
          <Astuce titre="✕ Fermer" resume="La touche Échap et un clic hors du panneau font la même chose.">
            <button className="modale-croix" onClick={onFermer} aria-label="Fermer">
              ✕
            </button>
          </Astuce>
        </div>
        <div className="modale-corps">
          {children}
          {fermerTexte !== null && (
            <button style={{ width: '100%', marginTop: 14 }} onClick={onFermer}>
              {fermerTexte}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
