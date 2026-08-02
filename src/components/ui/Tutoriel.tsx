import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ETAPES, NB_ETAPES, type EtapeTuto, type PlaceCarte } from '../../game/tutoriel'
import { snapTuto, useGame } from '../../game/store'
import { PortraitZeus } from './Zeus'

/*
 * L'ÉCRAN DE LA LEÇON.
 *
 * Deux mécanismes distincts, volontairement séparés :
 *
 *  · ce qu'on VOIT - un masque SVG plein écran percé d'un trou par cible. Il
 *    n'intercepte rien du tout (`pointer-events: none`), il ne fait qu'éteindre.
 *
 *  · ce qu'on PEUT TOUCHER - un écouteur en phase de capture qui avale tout
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

/** aire commune à deux rectangles - 0 s'ils ne se touchent pas */
function recouvrement(a: Cadre, b: Cadre): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

/**
 * Ce qui ne doit JAMAIS passer sous l'encart de Zeus, même quand toutes les
 * places sont mauvaises : la barre de titre des panneaux, donc leur croix de
 * fermeture. Quand la cible est un panneau entier - 680 px de large, 86 % de la
 * hauteur -, aucune position n'est libre, et l'encart finissait en travers de la
 * seule sortie visible : le joueur devait deviner qu'il fallait dérouler jusqu'au
 * bouton « Fermer » du bas.
 */
function zonesSacrees(): Cadre[] {
  const out: Cadre[] = []
  for (const el of document.querySelectorAll('.modale-tete, .modale-croix')) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) out.push({ x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 })
  }
  return out
}

/**
 * Où poser l'encart de Zeus.
 *
 * `place` n'est qu'une PRÉFÉRENCE : on essaie plusieurs positions et on garde
 * la première qui ne recouvre AUCUNE cible. Sans cela, l'encart se mettait en
 * travers du bouton à cliquer - au recensement, il masquait précisément la
 * ligne « + Danaé » qu'il demandait d'actionner, et la leçon était bloquée.
 *
 * Les zones sacrées, elles, pèsent quarante fois plus lourd qu'une cible
 * ordinaire dans le calcul : recouvrir une croix de fermeture est le pire des
 * défauts, puisque c'est la sortie.
 */
function placerCarte(
  cadres: Cadre[],
  place: PlaceCarte | undefined,
  taille: { w: number; h: number },
  sacres: Cadre[] = [],
) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const marge = 18
  const bord = 12
  const centre = { left: (vw - taille.w) / 2, top: Math.max(bord, (vh - taille.h) / 2) }
  if (cadres.length === 0 || place === 'centre') return centre
  /** ce que coûte une position : l'aire masquée, les sorties comptant quarante fois */
  const cout = (p: { left: number; top: number }): number => {
    const rect: Cadre = { x: p.left, y: p.top, w: taille.w, h: taille.h }
    const cibles = cadres.reduce((a, t) => a + recouvrement(rect, t), 0)
    const sorties = sacres.reduce((a, t) => a + recouvrement(rect, t), 0)
    return cibles + sorties * 40
  }

  // enveloppe de toutes les cibles : c'est d'elle qu'on s'écarte
  const x0 = Math.min(...cadres.map((c) => c.x))
  const y0 = Math.min(...cadres.map((c) => c.y))
  const x1 = Math.max(...cadres.map((c) => c.x + c.w))
  const y1 = Math.max(...cadres.map((c) => c.y + c.h))
  const union: Cadre = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }

  const clamp = (p: { left: number; top: number }) => ({
    left: Math.max(bord, Math.min(vw - taille.w - bord, p.left)),
    top: Math.max(bord, Math.min(vh - taille.h - bord, p.top)),
  })
  const relatif = (p: PlaceCarte) => {
    if (p === 'haut') return { left: union.x + union.w / 2 - taille.w / 2, top: union.y - taille.h - marge }
    if (p === 'gauche') return { left: union.x - taille.w - marge, top: union.y + union.h / 2 - taille.h / 2 }
    if (p === 'droite') return { left: union.x + union.w + marge, top: union.y + union.h / 2 - taille.h / 2 }
    return { left: union.x + union.w / 2 - taille.w / 2, top: union.y + union.h + marge }
  }

  // la place demandée d'abord, puis les autres, puis les quatre coins
  const candidats = [
    ...([place ?? 'bas', 'bas', 'haut', 'droite', 'gauche'] as PlaceCarte[]).map(relatif),
    { left: bord, top: vh - taille.h - bord },
    { left: vw - taille.w - bord, top: vh - taille.h - bord },
    { left: bord, top: bord },
    { left: vw - taille.w - bord, top: bord },
  ].map(clamp)

  let meilleur = candidats[0]
  let pire = Infinity
  for (const c of candidats) {
    const chevauche = cout(c)
    if (chevauche === 0) return c
    if (chevauche < pire) {
      pire = chevauche
      meilleur = c
    }
  }
  return meilleur
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
    setPos(placerCarte(cadres, etape.place, { w: el.offsetWidth, h: el.offsetHeight }, zonesSacrees()))
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

  /*
   * Geste attendu. Deux régimes :
   *  · `fait` - une condition sur l'état du jeu, relue quatre fois par seconde ;
   *  · `voir` - le joueur doit avoir OUVERT le panneau puis l'avoir REFERMÉ.
   *    Sans le second temps, l'étape se validerait à l'ouverture et la suivante
   *    refermerait le panneau au quart de seconde : rien à voir, leçon perdue.
   */
  const dejaVu = useRef(false)
  useEffect(() => {
    dejaVu.current = false
  }, [etape])

  useEffect(() => {
    if (!etape || (!etape.fait && !etape.voir)) return
    const id = window.setInterval(() => {
      const st = useGame.getState()
      if (etape.voir) {
        if (st.panel === etape.voir) dejaVu.current = true
        else if (dejaVu.current && st.panel === null) suivant()
        return
      }
      if (etape.fait?.(snapTuto(st))) suivant()
    }, 250)
    return () => clearInterval(id)
  }, [etape, suivant])

  if (!etape || etapeIdx === null) return null
  const attend = !!etape.fait || !!etape.voir

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
            Zeus - {etapeIdx + 1} / {NB_ETAPES}
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
 * Les textes de Zeus portent quelques **mots en gras** - la syntaxe Markdown la
 * plus universelle. On ne convertit QUE cela, sur du texte que nous écrivons
 * nous-mêmes : aucune saisie du joueur ne passe par ici.
 */
function gras(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
}
