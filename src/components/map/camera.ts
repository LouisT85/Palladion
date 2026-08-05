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
 * Un foyer de bataille : là où ça se passe VRAIMENT sur un pan donné. Tant que
 * la colonne marche encore, c'est le pan de mur qu'elle vise ; dès qu'elle est
 * au contact, c'est le barycentre des assaillants.
 */
interface Foyer {
  x: number
  y: number
  /** combien d'hommes s'y trouvent - sert à pondérer le cadrage */
  poids: number
  /** 0 = pan intact, 1 = pan tombé : l'urgence attire l'œil */
  urgence: number
}

/** les foyers actifs de la bataille, un par pan réellement assailli */
export function foyersBataille(b: BattleState, vivants: Fighter[]): Foyer[] {
  const foyers: Foyer[] = []
  b.secteurs.forEach((s, i) => {
    const siens = vivants.filter((f) => f.camp === 'attaque' && Math.min(f.secteur ?? 0, b.secteurs.length - 1) === i)
    if (siens.length === 0) return
    // barycentre de la colonne, ramené vers son pan : on veut voir les DEUX
    const mx = siens.reduce((a, f) => a + f.x, 0) / siens.length
    const my = siens.reduce((a, f) => a + f.y, 0) / siens.length
    const entame = s.max > 0 ? 1 - s.hp / s.max : 1
    foyers.push({
      x: (mx + s.x) / 2,
      y: (my + s.y) / 2,
      poids: siens.length,
      urgence: s.breche ? 1 : entame,
    })
  })
  return foyers
}

/**
 * Où poser la caméra.
 *
 * Le principe : on cadre **tous les foyers actifs**, pas seulement le plus
 * chaud. Auparavant la vue s'ancrait sur un unique « pan chaud » que le poids
 * des béliers plaçait presque toujours à la porte de l'est : un assaut sur
 * trois fronts se jouait donc hors de l'écran des deux tiers. Désormais on
 * calcule la boîte englobante des foyers, on la cadre entièrement, et l'on ne
 * resserre sur un seul pan que lorsqu'il n'y en a qu'un — ou qu'un seul est
 * en train de céder, cas où l'urgence mérite le gros plan.
 */
function cadrageBataille(b: BattleState | null, vue: VueScene): Cadrage {
  const large: Cadrage = { cx: vue.w / 2, cy: vue.h / 2, z: 1 }
  if (!b) return large
  const vivants = b.fighters.filter((f) => f.etat !== 'mort')
  if (vivants.length === 0) return large

  const foyers = foyersBataille(b, vivants)
  if (foyers.length === 0) {
    // plus d'assaillant assigné : on suit ce qui bouge encore
    const mx = vivants.reduce((a, f) => a + f.x, 0) / vivants.length
    const my = vivants.reduce((a, f) => a + f.y, 0) / vivants.length
    return recadrer({ cx: mx, cy: my, z: borne(2, vue.zMin, vue.zMax) }, vue)
  }

  /*
   * Un pan qui va tomber vole la vedette : si un seul foyer est vraiment
   * critique (pan entamé aux trois quarts ou déjà percé) alors qu'un autre
   * n'est qu'escarmouche, on lui donne le gros plan. C'est le moment où le
   * joueur doit voir précisément ce qui se passe pour y jeter ses hommes.
   */
  const critiques = foyers.filter((f) => f.urgence > 0.72)
  const retenus = critiques.length === 1 && foyers.length > 1 ? critiques : foyers

  // boîte englobante des foyers retenus, élargie par les hommes qui y sont
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  let sx = 0
  let sy = 0
  let sp = 0
  for (const f of retenus) {
    const p = f.poids + 4 + f.urgence * 6
    sx += f.x * p
    sy += f.y * p
    sp += p
    x0 = Math.min(x0, f.x)
    x1 = Math.max(x1, f.x)
    y0 = Math.min(y0, f.y)
    y1 = Math.max(y1, f.y)
  }
  const cx = sx / sp
  const cy = sy / sp

  /*
   * Les combattants proches du cadrage l'élargissent ; les traînards partis à
   * l'autre bout de la carte, non — sans quoi un unique fuyard ferait dézoomer
   * toute la scène.
   */
  const rayonUtile = vue.w * 0.34
  for (const f of vivants) {
    if (Math.hypot(f.x - cx, f.y - cy) > rayonUtile) continue
    x0 = Math.min(x0, f.x)
    x1 = Math.max(x1, f.x)
    y0 = Math.min(y0, f.y)
    y1 = Math.max(y1, f.y)
  }

  // marge : généreuse sur un seul front (on peut se serrer), plus fine à trois
  const marge = retenus.length > 1 ? 110 : 160
  const z = borne(
    Math.min(vue.w / ((x1 - x0) * 1.18 + marge), vue.h / ((y1 - y0) * 1.18 + marge * 0.85)),
    vue.zMin,
    vue.zMax,
  )

  // le bandeau « assaut en cours » mange le haut de la scène : on descend un peu
  // le cadrage pour ne pas jouer le front nord derrière lui
  return recadrer({ cx, cy: cy - 34 / z, z }, vue)
}

/**
 * Constantes de temps de la caméra automatique (ms).
 *
 * Une seule valeur ne suffit pas : à 1150 ms le mouvement était si mou que le
 * commanditaire l'a jugé « lent », mais une caméra vive sur chaque frémissement
 * de la mêlée donnerait le mal de mer. On sépare donc les deux régimes — la
 * caméra RATTRAPE vite quand la cible saute (un nouveau front s'ouvre, un pan
 * cède), et FLOTTE doucement quand elle ne fait que suivre des hommes qui
 * marchent.
 */
const TAU_SUIVI = 900
const TAU_RATTRAPAGE = 260
/** au-delà de cet écart (px de monde), on considère que la cible a sauté */
const SAUT_PX = 90

/**
 * Le cadre du monde réellement visible, en unités de carte, ÉLARGI d'une marge.
 * Il sert au culling : ce qui n'y est pas n'a pas besoin d'exister dans le DOM.
 */
export interface CadreVisible {
  x0: number
  y0: number
  x1: number
  y1: number
}

/**
 * Palier de détail. Il ne sert pas à dégrader ce que le joueur regarde de près,
 * mais à savoir quand une figurine tombe sous le seuil où son détail ne se voit
 * plus - et surtout à ne PAS recalculer le culling tant qu'on n'a pas changé de
 * palier.
 */
export type PalierDetail = 'ensemble' | 'proche'

/**
 * Zoom à partir duquel le culling devient rentable. En dessous, la carte tient
 * tout entière à l'écran : chercher ce qu'on peut retirer coûterait plus que de
 * tout dessiner.
 */
export const ZOOM_CULLING = 1.35

/** pas de quantification du cadre visible (unités de carte) */
const PAS_CADRE = 120

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
  /**
   * Cadre visible élargi, ou `null` quand toute la carte tient à l'écran.
   *
   * Il est QUANTIFIÉ au pas de 120 unités et ne change donc d'identité que
   * lorsqu'on a franchi une case : la boucle d'animation tourne à 60 images par
   * seconde, et rendre React à ce rythme coûterait bien plus que le culling ne
   * fait gagner.
   */
  cadre: CadreVisible | null
  /** palier de détail courant */
  palier: PalierDetail
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
  const [cadre, setCadre] = useState<CadreVisible | null>(null)
  const [palier, setPalier] = useState<PalierDetail>('ensemble')
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

    /*
     * Publication du cadrage vers React. On arrondit au pas de la grille et l'on
     * ne pose l'état QUE si la case a changé : sans cela, la carte se re-rendrait
     * soixante fois par seconde pendant un glissement.
     */
    let dernierCadre = ''
    const publier = (c: Cadrage) => {
      if (c.z < ZOOM_CULLING) {
        if (dernierCadre !== '') {
          dernierCadre = ''
          setCadre(null)
          setPalier('ensemble')
        }
        return
      }
      const demiW = vue.w / (2 * c.z)
      const demiH = vue.h / (2 * c.z)
      // une marge d'un demi-écran : un bâtiment qui entre par le bord est déjà là
      const q = (v: number) => Math.round(v / PAS_CADRE) * PAS_CADRE
      const r: CadreVisible = {
        x0: q(c.cx - demiW * 1.5),
        y0: q(c.cy - demiH * 1.5),
        x1: q(c.cx + demiW * 1.5),
        y1: q(c.cy + demiH * 1.5),
      }
      const cle = `${r.x0},${r.y0},${r.x1},${r.y1}`
      if (cle === dernierCadre) return
      dernierCadre = cle
      setCadre(r)
      setPalier('proche')
    }

    let precedent = performance.now()
    let calcul = 0
    let raf = requestAnimationFrame(function boucle(t: number) {
      raf = requestAnimationFrame(boucle)
      const dt = Math.min(140, t - precedent)
      precedent = t

      if (mainMise.current) {
        // en manuel, la vue colle au geste : aucune inertie, aucun retard
        appliquer(sceneRef.current, vu.current, vue)
        publier(vu.current)
        return
      }
      // la cible ne bouge qu'au rythme des ticks : inutile de la recalculer 60 fois/s
      if (t - calcul > 90) {
        calcul = t
        but.current = cadrageBataille(lireBataille(), vue)
      }
      const b = but.current
      /*
       * Deux régimes : on rattrape vif un but qui a sauté (front qui s'ouvre,
       * pan qui cède), on flotte doucement derrière des hommes qui marchent.
       * L'interpolation reste exponentielle, donc sans à-coup à la bascule.
       */
      const ecart = Math.hypot(b.cx - vu.current.cx, b.cy - vu.current.cy) * vu.current.z
      const ecartZ = Math.abs(b.z - vu.current.z) / Math.max(0.2, vu.current.z)
      const rattrape = ecart > SAUT_PX || ecartZ > 0.35
      const k = 1 - Math.exp(-dt / (rattrape ? TAU_RATTRAPAGE : TAU_SUIVI))
      vu.current = {
        cx: vu.current.cx + (b.cx - vu.current.cx) * k,
        cy: vu.current.cy + (b.cy - vu.current.cy) * k,
        z: vu.current.z + (b.z - vu.current.z) * k,
      }
      appliquer(sceneRef.current, vu.current, vue)
      publier(vu.current)
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
    cadre,
    palier,
    recentrer: () => commandes.current.recentrer(),
    zoomer: (f) => commandes.current.zoomer(f),
    aGlisse: vientDeGlisser,
  }
}

/** écrit la transformation sur le groupe de scène, image par image */
let derniereTransfo = ''

function appliquer(el: SVGGElement | null, c: Cadrage, vue: VueScene): void {
  if (!el) return
  // retour à la vue d'ensemble : on retire l'attribut pour ne rien laisser traîner
  if (Math.abs(c.z - 1) < 0.0015 && Math.abs(c.cx - vue.w / 2) < 0.6 && Math.abs(c.cy - vue.h / 2) < 0.6) {
    if (el.hasAttribute('transform')) el.removeAttribute('transform')
    derniereTransfo = ''
    return
  }
  const tx = vue.w / 2 - c.cx * c.z
  const ty = vue.h / 2 - c.cy * c.z
  const t = `translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${c.z.toFixed(4)})`
  /*
   * Ne RIEN écrire quand la valeur est identique. Réécrire le même attribut
   * invalide tout de même la rastérisation du sous-arbre, et une scène grossie
   * cinq fois porte des ombres et des flous que le navigateur recalcule alors
   * soixante fois par seconde - pour une image qui n'a pas bougé d'un pixel.
   */
  if (t === derniereTransfo) return
  derniereTransfo = t
  el.setAttribute('transform', t)
}
