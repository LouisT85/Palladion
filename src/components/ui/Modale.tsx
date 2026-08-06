import { useEffect, useRef, type ReactNode } from 'react'
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
   * PENDANT QU'ON DÉFILE, LES VIGNETTES SVG DU CORPS S'ARRÊTENT.
   *
   * Un `<svg>` dont l'horloge SMIL tourne réinvalide son calque à CHAQUE image,
   * quoi qu'il anime. Tant qu'il est immobile, la note est petite ; mais dans un
   * conteneur qui DÉFILE, Chromium ne peut plus réutiliser de tuile et repeint
   * tout le corps à chaque image. Le panthéon monte trois de ces horloges - les
   * aperçus de manifestation divine, 88 nœuds SMIL en tout - et les payait cher :
   *
   *   panthéon, défilement à la molette, carte du village déjà gelée
   *     horloges des vignettes libres ... 66,6 ms/image = 15,0 i/s
   *     horloges arrêtées ..............  16,7 ms/image = 59,9 i/s
   *   (build de production, A/B entrelacé, 6 tours ; les hauts faits, qui n'ont
   *    aucun SVG animé dans leur corps, défilaient déjà à 16,7 ms.)
   *
   * On ne les arrête donc que LE TEMPS DU GESTE, et on les rend 180 ms après le
   * dernier cran de molette : la vignette joue toujours sa manifestation en
   * boucle - promesse de son infobulle -, simplement pas pendant qu'elle file
   * sous les yeux du joueur. Écarté, mesuré sans effet : `content-visibility:
   * auto` sur les cartes de dieu (66,6 ms, inchangé).
   */
  const corps = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = corps.current
    if (!el) return
    let repos: number | undefined
    // le filtre n'est pas de la coquetterie : jsdom, qui fait tourner les tests
    // de rendu de ces mêmes panneaux, ne connaît pas l'horloge SMIL
    const horloges = () => Array.from(el.querySelectorAll('svg')).filter((s) => typeof s.pauseAnimations === 'function')
    const rendre = () => horloges().forEach((s) => s.unpauseAnimations())
    const onDefile = () => {
      // on requête à chaque cran : React peut remonter une vignette en cours de
      // route, et une horloge neuve repartirait sans qu'on le sache
      horloges().forEach((s) => {
        if (!s.animationsPaused()) s.pauseAnimations()
      })
      window.clearTimeout(repos)
      repos = window.setTimeout(rendre, 180)
    }
    el.addEventListener('scroll', onDefile, { passive: true })
    return () => {
      el.removeEventListener('scroll', onDefile)
      window.clearTimeout(repos)
      rendre()
    }
  }, [])

  /*
   * Portail vers `body`. Deux raisons, et le `backdrop-filter` du panneau de
   * bâtiment - qu'on a retiré depuis - n'en était que la troisième : `.panneau`
   * porte `overflow-y: auto` (il rognerait ce qui en sort) et, positionné avec
   * `z-index: 15`, il ouvre son propre contexte d'empilement. Le recensement,
   * qui s'ouvre depuis lui, doit donc sortir du flux quoi qu'il arrive.
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
        <div className="modale-corps" ref={corps}>
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
