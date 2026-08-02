import { useEffect, useRef, useState, type RefObject } from 'react'
import type { BattleState, Fighter } from '../../game/types'

/*
 * ════════════════════════════ LA CAMÉRA ════════════════════════════
 *
 * Deux conducteurs, jamais en même temps :
 *  · AUTOMATIQUE - pendant un assaut, la vue se rapproche du front le plus
 *    chaud et le suit, en douceur ;
 *  · MANUEL - dès que le joueur touche la molette ou fait glisser la carte,
 *    il prend la main et la garde jusqu'à ce qu'il recentre.
 *
 * Le SVG garde son viewBox : seul un groupe intérieur est transformé, si bien
 * que le cadre doré, la météo et le voile de nuit restent collés à l'écran.
 */

/** fenêtre de la scène et amplitude de zoom autorisée à la caméra automatique */
export interface VueScene {
  w: number
  h: number
  zMin: number
  zMax: number
}

/** bornes du zoom manuel : vue d'ensemble ↔ nez sur les figurines */
export const ZOOM_MIN = 1
export const ZOOM_MAX = 5

/**
 * Instant du dernier déplacement à la souris. Une seule caméra est active à la
 * fois, d'où le module-level : n'importe quel gestionnaire de clic de la scène
 * peut ainsi savoir qu'il ne doit PAS réagir - on vient de faire glisser, pas
 * de cliquer.
 */
let dernierGlissement = 0
export function vientDeGlisser(): boolean {
  return performance.now() - dernierGlissement < 220
}

interface Cadrage {
  cx: number
  cy: number
  z: number
}

function borne(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

/** le centre reste tel que la fenêtre ne sorte jamais de la carte */
function recadrer(c: Cadrage, vue: VueScene): Cadrage {
  const demiW = vue.w / (2 * c.z)
  const demiH = vue.h / (2 * c.z)
  return { cx: borne(c.cx, demiW, vue.w - demiW), cy: borne(c.cy, demiH, vue.h - demiH), z: c.z }
}

// ── Cadrage automatique de bataille ──────────────────────────────────────────

/** assaillants vivants devant chaque secteur */
export function assaillantsParSecteur(b: BattleState, vivants: Fighter[]): number[] {
  const n = b.secteurs.map(() => 0)
  for (const f of vivants) {
    if (f.camp !== 'attaque') continue
    const i = Math.min(f.secteur ?? 0, n.length - 1)
    if (i >= 0) n[i]++
  }
  return n
}

/**
 * Le pan « chaud » : celui qui concentre les assaillants, pondéré par la
 * structure déjà entamée. −1 s'il n'y a rien à surveiller.
 */
export function indexSecteurChaud(b: BattleState, parSecteur: number[]): number {
  let idx = -1
  let meilleur = -Infinity
  b.secteurs.forEach((s, i) => {
    const entame = s.max > 0 ? 1 - s.hp / s.max : 1
    // un pan tombé n'a plus rien à défendre : il pèse moins qu'un pan qui craque
    const score = parSecteur[i] + entame * 7 - (s.breche ? 5 : 0)
    if (score > meilleur) {
      meilleur = score
      idx = i
    }
  })
  return idx
}

/**
 * Où poser la caméra : barycentre des combattants, tiré vers le front chaud et
 * ancré sur son pan de mur, avec un zoom déduit de l'étendue de la mêlée.
 * Dès que plusieurs pans sont assaillis, le centre de l'enceinte pèse dans la
 * balance : les trois fronts doivent tenir ensemble dans le cadre.
 */
function cadrageBataille(b: BattleState | null, vue: VueScene): Cadrage {
  const large: Cadrage = { cx: vue.w / 2, cy: vue.h / 2, z: 1 }
  if (!b) return large
  const vivants = b.fighters.filter((f) => f.etat !== 'mort')
  if (vivants.length === 0) return large

  const parSecteur = assaillantsParSecteur(b, vivants)
  const idx = indexSecteurChaud(b, parSecteur)
  const chaud = idx >= 0 ? b.secteurs[idx] : { x: b.geo.porte.x, y: b.geo.porte.y }
  const frontsActifs = parSecteur.filter((n) => n > 0).length

  let sx = 0
  let sy = 0
  let sp = 0
  const poser = (x: number, y: number, p: number) => {
    sx += x * p
    sy += y * p
    sp += p
  }
  for (const f of vivants) poser(f.x, f.y, f.camp === 'attaque' && (f.secteur ?? 0) === idx ? 2.2 : 0.8)
  const combattants = sp
  // le pan assailli reste dans le cadre même quand la colonne est encore loin
  poser(chaud.x, chaud.y, Math.max(5, combattants * (frontsActifs > 1 ? 0.2 : 0.42)))
  if (frontsActifs > 1) poser(b.geo.cx, b.geo.cy, combattants * 0.35)
  const cx = sx / sp
  const cy = sy / sp

  // étendue à cadrer - les traînards très à l'écart ne dictent pas le zoom
  let x0 = chaud.x
  let x1 = chaud.x
  let y0 = chaud.y
  let y1 = chaud.y
  for (const f of vivants) {
    if (Math.hypot(f.x - cx, f.y - cy) > vue.w * 0.4) continue
    x0 = Math.min(x0, f.x)
    x1 = Math.max(x1, f.x)
    y0 = Math.min(y0, f.y)
    y1 = Math.max(y1, f.y)
  }
  const z = borne(Math.min(vue.w / ((x1 - x0) * 1.25 + 150), vue.h / ((y1 - y0) * 1.25 + 130)), vue.zMin, vue.zMax)

  // le bandeau « assaut en cours » mange le haut de la scène : on descend un peu
  // le cadrage pour ne pas jouer le front nord derrière lui
  return recadrer({ cx, cy: cy - 34 / z, z }, vue)
}

/** constante de temps de la caméra automatique (ms) - elle doit s'oublier */
const TAU_CAMERA = 1150

export interface Camera {
  /** true = le joueur conduit ; la caméra de bataille se tait */
  manuel: boolean
  /** rend la main à la caméra automatique */
  recentrer: () => void
  /** zoom par pas, depuis les boutons du HUD */
  zoomer: (facteur: number) => void
  /** un glissement vient-il de se terminer ? (pour ne pas désélectionner) */
  aGlisse: () => boolean
  /** facteur de zoom courant, pour l'affichage */
  zoom: number
}

/**
 * Installe la caméra sur un `<svg>` et le groupe qu'elle transforme.
 * Molette = zoom au curseur, glisser = déplacement, double-clic = recentrage.
 */
export function useCamera(
  svgRef: RefObject<SVGSVGElement | null>,
  sceneRef: RefObject<SVGGElement | null>,
  vue: VueScene,
  lireBataille: () => BattleState | null,
): Camera {
  const [manuel, setManuel] = useState(false)
  const [zoom, setZoom] = useState(1)
  // toute la mécanique vit dans des refs : la boucle rAF ne doit rien re-rendre
  const vu = useRef<Cadrage>({ cx: vue.w / 2, cy: vue.h / 2, z: 1 })
  const but = useRef<Cadrage>({ cx: vue.w / 2, cy: vue.h / 2, z: 1 })
  const mainMise = useRef(false)
  const commandes = useRef<{ recentrer: () => void; zoomer: (f: number) => void }>({
    recentrer: () => {},
    zoomer: () => {},
  })

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    /** coordonnées du pointeur dans le repère du viewBox */
    const versViewBox = (e: { clientX: number; clientY: number }): { x: number; y: number } => {
      const ctm = svg.getScreenCTM()
      if (!ctm) return { x: vue.w / 2, y: vue.h / 2 }
      const p = svg.createSVGPoint()
      p.x = e.clientX
      p.y = e.clientY
      const q = p.matrixTransform(ctm.inverse())
      return { x: q.x, y: q.y }
    }

    const prendreLaMain = () => {
      if (mainMise.current) return
      mainMise.current = true
      // on part exactement d'où la caméra automatique en était : aucun saut
      but.current = { ...vu.current }
      setManuel(true)
    }

    const majZoomAffiche = () => setZoom(Math.round(but.current.z * 10) / 10)

    // ── molette : zoom centré sur le curseur ──
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      prendreLaMain()
      const m = versViewBox(e)
      const c = but.current
      const facteur = Math.exp(-e.deltaY * 0.0016)
      const z2 = borne(c.z * facteur, ZOOM_MIN, ZOOM_MAX)
      // le point du monde sous le curseur ne doit pas bouger d'un pixel
      const mondeX = (m.x - vue.w / 2) / c.z + c.cx
      const mondeY = (m.y - vue.h / 2) / c.z + c.cy
      const suivant = recadrer(
        { cx: mondeX - (m.x - vue.w / 2) / z2, cy: mondeY - (m.y - vue.h / 2) / z2, z: z2 },
        vue,
      )
      but.current = suivant
      vu.current = suivant
      majZoomAffiche()
      if (z2 <= ZOOM_MIN + 0.001) rendreLaMain()
    }

    // ── glisser : déplacement 1:1 avec la souris ──
    let glisse = false
    let depart = { x: 0, y: 0 }
    let bouge = false

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return
      glisse = true
      bouge = false
      depart = versViewBox(e)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!glisse) return
      const m = versViewBox(e)
      const dx = m.x - depart.x
      const dy = m.y - depart.y
      if (!bouge && Math.hypot(dx, dy) < 4) return
      if (!bouge) {
        bouge = true
        prendreLaMain()
        svg.setPointerCapture?.(e.pointerId)
        svg.style.cursor = 'grabbing'
      }
      const c = but.current
      const suivant = recadrer({ cx: c.cx - dx / c.z, cy: c.cy - dy / c.z, z: c.z }, vue)
      but.current = suivant
      vu.current = suivant
      depart = versViewBox(e)
    }
    const onPointerUp = (e: PointerEvent) => {
      if (!glisse) return
      glisse = false
      svg.style.cursor = ''
      if (bouge) {
        dernierGlissement = performance.now()
        svg.releasePointerCapture?.(e.pointerId)
      }
    }

    const rendreLaMain = () => {
      mainMise.current = false
      setManuel(false)
      setZoom(1)
    }
    const onDoubleClick = () => rendreLaMain()

    commandes.current = {
      recentrer: rendreLaMain,
      zoomer: (f: number) => {
        prendreLaMain()
        const c = but.current
        const z2 = borne(c.z * f, ZOOM_MIN, ZOOM_MAX)
        const suivant = recadrer({ ...c, z: z2 }, vue)
        but.current = suivant
        vu.current = suivant
        majZoomAffiche()
        if (z2 <= ZOOM_MIN + 0.001) rendreLaMain()
      },
    }

    // wheel doit être non passif pour pouvoir empêcher le défilement de la page
    svg.addEventListener('wheel', onWheel, { passive: false })
    svg.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    svg.addEventListener('dblclick', onDoubleClick)

    let precedent = performance.now()
    let calcul = 0
    let raf = requestAnimationFrame(function boucle(t: number) {
      raf = requestAnimationFrame(boucle)
      const dt = Math.min(140, t - precedent)
      precedent = t

      if (mainMise.current) {
        // en manuel, la vue colle au geste : aucune inertie, aucun retard
        appliquer(sceneRef.current, vu.current, vue)
        return
      }
      // la cible ne bouge qu'au rythme des ticks : inutile de la recalculer 60 fois/s
      if (t - calcul > 90) {
        calcul = t
        but.current = cadrageBataille(lireBataille(), vue)
      }
      const k = 1 - Math.exp(-dt / TAU_CAMERA)
      const b = but.current
      vu.current = {
        cx: vu.current.cx + (b.cx - vu.current.cx) * k,
        cy: vu.current.cy + (b.cy - vu.current.cy) * k,
        z: vu.current.z + (b.z - vu.current.z) * k,
      }
      appliquer(sceneRef.current, vu.current, vue)
    })

    return () => {
      cancelAnimationFrame(raf)
      svg.removeEventListener('wheel', onWheel)
      svg.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      svg.removeEventListener('dblclick', onDoubleClick)
    }
  }, [svgRef, sceneRef, vue, lireBataille])

  return {
    manuel,
    zoom,
    recentrer: () => commandes.current.recentrer(),
    zoomer: (f) => commandes.current.zoomer(f),
    aGlisse: vientDeGlisser,
  }
}

/** écrit la transformation sur le groupe de scène, image par image */
function appliquer(el: SVGGElement | null, c: Cadrage, vue: VueScene): void {
  if (!el) return
  // retour à la vue d'ensemble : on retire l'attribut pour ne rien laisser traîner
  if (Math.abs(c.z - 1) < 0.0015 && Math.abs(c.cx - vue.w / 2) < 0.6 && Math.abs(c.cy - vue.h / 2) < 0.6) {
    if (el.hasAttribute('transform')) el.removeAttribute('transform')
    return
  }
  const tx = vue.w / 2 - c.cx * c.z
  const ty = vue.h / 2 - c.cy * c.z
  el.setAttribute('transform', `translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${c.z.toFixed(4)})`)
}
