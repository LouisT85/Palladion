import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ETAPES, NB_ETAPES, type EtapeTuto, type PlaceCarte } from '../../game/tutoriel'
import { snapTuto, useGame } from '../../game/store'
import { PortraitZeus } from './Zeus'

/*
 * L'ÉCRAN DE LA LEÇON.
 *
 * Deux mécanismes distincts, volontairement séparés :
 *
 *  · ce qu'on VOIT — un masque SVG plein écran percé d'un trou par cible. Il
 *    n'intercepte rien du tout (`pointer-events: none`), il ne fait qu'éteindre.
 *
 *  · ce qu'on PEUT TOUCHER — un écouteur en phase de capture qui avale tout
 *    clic hors des cibles. C'est lui, et lui seul, qui verrouille le focus.
 *
 * Les avoir séparés permet plusieurs cibles à la fois : bâtir la ferme demande
 * la carte ET le panneau qui s'ouvre ensuite. Un masque à volets rectangulaires
 * n'aurait pas su faire ça.
 *
 * Les étapes qui exigent un geste n'ont pas de bouton « Suivant » : on relit
 * l'état du jeu quatre fois par seconde et on avance dès que le geste est fait.
 */

const MARGE = 8

interface Cadre {
  x: number
  y: number
  w: number
  h: number
}

function cadresDe(cibles: string[]): Cadre[] {
  const out: Cadre[] = []
  for (const c of cibles) {
    const el = document.querySelector(`[data-tuto="${c}"]`)
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    out.push({ x: r.left - MARGE, y: r.top - MARGE, w: r.width + MARGE * 2, h: r.height + MARGE * 2 })
  }
  return out
}

/** deux listes de cadres décrivent-elles la même chose ? (évite les rendus inutiles) */
function memeCadres(a: Cadre[], b: Cadre[]): boolean {
  if (a.length !== b.length) return false
  return a.every((c, i) => Math.abs(c.x - b[i].x) < 0.5 && Math.abs(c.y - b[i].y) < 0.5 && c.w === b[i].w && c.h === b[i].h)
}

/** où poser l'encart pour qu'il ne recouvre ni la cible ni le bord de l'écran */
function placerCarte(c: Cadre | undefined, place: PlaceCarte | undefined, taille: { w: number; h: number }) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (!c || place === 'centre') {
    return { left: (vw - taille.w) / 2, top: Math.max(20, (vh - taille.h) / 2) }
  }
  const marge = 18
  let left = c.x + c.w / 2 - taille.w / 2
  let top = c.y + c.h + marge
  if (place === 'haut') top = c.y - taille.h - marge
  if (place === 'gauche') {
    left = c.x - taille.w - marge
    top = c.y + c.h / 2 - taille.h / 2
  }
  if (place === 'droite') {
    left = c.x + c.w + marge
    top = c.y + c.h / 2 - taille.h / 2
  }
  // si ça déborde en bas, on bascule au-dessus de la cible plutôt que hors écran
  if (top + taille.h > vh - 12) top = Math.max(12, c.y - taille.h - marge)
  return {
    left: Math.max(12, Math.min(vw - taille.w - 12, left)),
    top: Math.max(12, Math.min(vh - taille.h - 12, top)),
  }
}

export function Tutoriel() {
  const etapeIdx = useGame((s) => s.tutoriel)
  const suivant = useGame((s) => s.etapeTutoSuivante)
  const arreter = useGame((s) => s.arreterTutoriel)
  const [cadres, setCadres] = useState<Cadre[]>([])
  const carte = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [ecran, setEcran] = useState({ w: 0, h: 0 })

  const etape: EtapeTuto | null = etapeIdx === null ? null : (ETAPES[etapeIdx] ?? null)
  const cibles = etape?.cibles ?? []

  // les cibles apparaissent, bougent, disparaissent : on les resuit en continu
  useLayoutEffect(() => {
    if (!etape) return
    let raf = 0
    const suivre = () => {
      raf = requestAnimationFrame(suivre)
      const c = cadresDe(cibles)
      setCadres((prec) => (memeCadres(prec, c) ? prec : c))
      setEcran((p) =>
        p.w === window.innerWidth && p.h === window.innerHeight ? p : { w: window.innerWidth, h: window.innerHeight },
      )
    }
    suivre()
    return () => cancelAnimationFrame(raf)
    // `cibles` est reconstruit à chaque rendu : c'est l'étape qui compte
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape])

  // repositionne l'encart une fois qu'on connaît sa taille réelle
  useLayoutEffect(() => {
    if (!etape) return
    const el = carte.current
    if (!el) return
    setPos(placerCarte(cadres[0], etape.place, { w: el.offsetWidth, h: el.offsetHeight }))
  }, [etape, cadres])

  /*
   * Verrouillage du focus. On avale, en phase de capture, tout événement de
   * pointeur qui ne vise ni une cible ni l'encart de Zeus. Le clavier reste
   * libre : couper Échap ou Tab enfermerait pour de bon.
   */
  useEffect(() => {
    if (!etape) return
    const autorise = (cible: EventTarget | null): boolean => {
      if (!(cible instanceof Node)) return false
      const el = cible instanceof Element ? cible : cible.parentElement
      if (!el) return false
      if (el.closest('.tuto-carte')) return true
      return cibles.some((c) => el.closest(`[data-tuto="${c}"]`))
    }
    const bloquer = (e: Event) => {
      if (autorise(e.target)) return
      e.stopPropagation()
      e.preventDefault()
    }
    const types = ['pointerdown', 'mousedown', 'click', 'dblclick', 'wheel'] as const
    for (const t of types) window.addEventListener(t, bloquer, { capture: true, passive: false })
    return () => {
      for (const t of types) window.removeEventListener(t, bloquer, { capture: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape])

  // geste attendu : on relit l'état du jeu et on avance dès qu'il est accompli
  useEffect(() => {
    if (!etape?.fait) return
    const test = etape.fait
    const id = window.setInterval(() => {
      if (test(snapTuto(useGame.getState()))) suivant()
    }, 250)
    return () => clearInterval(id)
  }, [etape, suivant])

  if (!etape || etapeIdx === null) return null
  const attend = !!etape.fait

  return (
    <div className="tuto">
      {/* le masque n'intercepte rien : il ne fait qu'éteindre ce qui n'est pas visé */}
      <svg className="tuto-masque" width={ecran.w} height={ecran.h} aria-hidden="true">
        <defs>
          <mask id="tuto-trous">
            <rect x={0} y={0} width={ecran.w} height={ecran.h} fill="#fff" />
            {cadres.map((c, i) => (
              <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} rx={10} fill="#000" />
            ))}
          </mask>
        </defs>
        <rect x={0} y={0} width={ecran.w} height={ecran.h} fill="#050a10" opacity={0.88} mask="url(#tuto-trous)" />
      </svg>
      {/* liserés dorés : on sait où regarder sans lire */}
      {cadres.map((c, i) => (
        <div key={i} className="tuto-cible" style={{ left: c.x, top: c.y, width: c.w, height: c.h }} />
      ))}

      <div className="tuto-carte" ref={carte} style={pos ? { left: pos.left, top: pos.top } : { opacity: 0 }}>
        <div className="tuto-zeus">
          <PortraitZeus taille={116} humeur={etape.humeur ?? 'calme'} />
        </div>
        <div className="tuto-corps">
          <div className="tuto-compteur">
            Zeus — {etapeIdx + 1} / {NB_ETAPES}
          </div>
          <h3>{etape.titre}</h3>
          {etape.texte.map((p, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: gras(p) }} />
          ))}
          <div className="tuto-pied">
            {attend ? (
              <span className="tuto-ordre">
                <span className="tuto-doigt">☞</span> {etape.ordre}
              </span>
            ) : (
              <button className="principal" onClick={suivant}>
                {etapeIdx === NB_ETAPES - 1 ? 'Prendre la tête du village' : 'Poursuis'}
              </button>
            )}
            <button className="tuto-passer" onClick={arreter} title="Vous pourrez tout relire dans l’aide (❔)">
              Passer la leçon
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Les textes de Zeus portent quelques **mots en gras** — la syntaxe Markdown la
 * plus universelle. On ne convertit QUE cela, sur du texte que nous écrivons
 * nous-mêmes : aucune saisie du joueur ne passe par ici.
 */
function gras(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
}
