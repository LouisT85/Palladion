import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Murailles, hauteurRonde } from './Murailles'
import { monterSvg, reinitialiser, type Montage } from '../test-utils'

/*
 * LA GÉOMÉTRIE DE L'ENCEINTE.
 *
 * Le mur n'est pas une image : c'est un calcul. Chaque chemin sort d'un
 * échantillonnage de l'ellipse, et une seule division par zéro y suffit à
 * peindre `NaN` dans un attribut `d` - ce qui, en SVG, ne lève RIEN : le chemin
 * disparaît en silence, et le mur perd sa face ou son parapet sans qu'aucun test
 * ne s'en plaigne. Ces tests-là ne jugent pas le dessin (les captures s'en
 * chargent) ; ils garantissent qu'aucune cote n'est indéfinie, aux quatre
 * niveaux, sur les deux couches, pour DEUX ellipses différentes - celle de la
 * carte et celle, bien plus plate, de la scène d'expédition - et pendant un
 * chantier, quand l'arc n'est dessiné qu'en partie.
 */

let m: Montage | null = null

const GEO_CARTE = { cx: 575, cy: 445, rx: 330, ry: 195 }
/** l'ellipse de la scène d'expédition : plus petite ET plus plate */
const GEO_EXP = { cx: 430, cy: 315, rx: 235, ry: 130 }

beforeEach(() => reinitialiser())
afterEach(() => {
  m?.demonter()
  m = null
  reinitialiser()
})

/** tous les nombres portés par les attributs géométriques du fragment monté */
function cotes(mo: Montage): { total: number; suspects: string[] } {
  const suspects: string[] = []
  let total = 0
  const ATTRS = ['d', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'transform', 'stroke-width']
  for (const el of mo.qq('svg *')) {
    for (const a of ATTRS) {
      const v = el.getAttribute(a)
      if (v === null) continue
      total++
      if (/NaN|Infinity|undefined/.test(v)) suspects.push(`${el.tagName}.${a} = ${v.slice(0, 70)}`)
      // une largeur ou une hauteur négative fait disparaître le rectangle
      if ((a === 'width' || a === 'height' || a === 'r' || a === 'rx' || a === 'ry') && Number(v) < 0)
        suspects.push(`${el.tagName}.${a} = ${v}`)
    }
  }
  return { total, suspects }
}

describe('Murailles - aucune cote indéfinie', () => {
  for (const [nom, geo] of [
    ['carte', GEO_CARTE],
    ['expédition', GEO_EXP],
  ] as const) {
    for (const niveau of [0, 1, 2, 3, 4]) {
      for (const layer of ['back', 'front'] as const) {
        it(`${nom} · remparts ${niveau} · couche ${layer}`, () => {
          m = monterSvg(
            <Murailles
              niveau={niveau}
              hp={7}
              max={10}
              breche={false}
              layer={layer}
              geo={geo}
              tours={niveau >= 4 ? 4 : niveau >= 3 ? 2 : niveau >= 2 ? 1 : 0}
              brechesAngles={[1.1, 4.3]}
            />,
          )
          const { total, suspects } = cotes(m)
          expect(suspects, suspects.join(' | ')).toEqual([])
          // niveau 0 mis à part, une couche dessine toujours quelque chose
          if (niveau > 0) expect(total).toBeGreaterThan(30)
        })
      }
    }
  }

  it('chantier : un arc partiel ne casse aucun chemin', () => {
    for (const span of [1 / 3, 2 / 3, 0.05]) {
      const mo = monterSvg(
        <>
          <Murailles niveau={3} hp={10} max={10} breche={false} layer="back" span={span} />
          <Murailles niveau={4} hp={10} max={10} breche={false} layer="front" span={span} tours={4} />
        </>,
      )
      const { suspects } = cotes(mo)
      mo.demonter()
      expect(suspects, `span ${span} : ${suspects.join(' | ')}`).toEqual([])
    }
  })

  it('porte percée et pans effondrés restent dessinables', () => {
    for (const niveau of [1, 2, 3, 4]) {
      const mo = monterSvg(
        <Murailles niveau={niveau} hp={1} max={10} breche layer="front" tours={2} brechesAngles={[0.9, 2.2]} />,
      )
      const { suspects } = cotes(mo)
      mo.demonter()
      expect(suspects, `remparts ${niveau} : ${suspects.join(' | ')}`).toEqual([])
    }
  })
})

/*
 * LA FACE INTERNE SE TIENT PAR LA VALEUR.
 *
 * Elle a été refusée deux fois de suite, et pour deux raisons opposées : d'abord
 * parce qu'elle était une bande pâle et vide sur huit cents pixels d'arc, ensuite
 * parce que le remblai de terre censé la remplir « rendait mal » - une nappe brune
 * que ni ventre, ni sentier, ni rigoles, ni herbe n'ont sauvée. Ce qui a fini par
 * tenir n'est pas un objet de plus : le parement descend au sol et s'ASSOMBRIT
 * vers son pied.
 *
 * Ces deux tests protègent l'un et l'autre bout de cette leçon. Ils ne jugent pas
 * le dessin - ils interdisent de revenir à l'un des deux échecs : le remblai qui
 * revient, ou l'aplat d'un seul ton qui reparaît.
 */
describe('Murailles - la face interne a une valeur, pas un remblai', () => {
  /** un remplissage littéral, décomposé en luminance et en saturation */
  function tons(mo: Montage): { lum: number; sat: number; hex: string }[] {
    const vus = new Set<string>()
    const out: { lum: number; sat: number; hex: string }[] = []
    for (const el of mo.qq('svg *')) {
      const f = el.getAttribute('fill')
      if (!f || !/^#[0-9a-f]{6}$/i.test(f) || vus.has(f)) continue
      vus.add(f)
      const n = parseInt(f.slice(1), 16)
      const r = (n >> 16) & 255
      const v = (n >> 8) & 255
      const b = n & 255
      const hi = Math.max(r, v, b)
      out.push({ lum: (r * 0.299 + v * 0.587 + b * 0.114) / 255, sat: hi ? (hi - Math.min(r, v, b)) / hi : 0, hex: f })
    }
    return out
  }

  for (const niveau of [2, 3, 4]) {
    it(`remparts ${niveau} : le parement du dedans s’étage en trois tons sourds`, () => {
      m = monterSvg(
        <Murailles niveau={niveau} hp={10} max={10} breche={false} layer="back" geo={GEO_CARTE} tours={niveau - 1} />,
      )
      const t = tons(m)
      // la plage complète : un aplat d’un seul ton ne passe pas
      const lums = t.map((x) => x.lum).sort((a, b) => a - b)
      expect(lums.length, 'la couche interne ne peint aucun ton littéral').toBeGreaterThan(6)
      expect(lums[lums.length - 1] - lums[0]).toBeGreaterThan(0.3)
      /*
       * ET SURTOUT les nappes qui font tomber la valeur vers le pied. On les
       * reconnaît à ce qu’elles sont SOURDES et NEUTRES : le bois du chaînage et
       * du hourd est sourd lui aussi, mais franchement coloré (saturation > 0,49
       * contre 0,34 pour la pierre à l’ombre). Sans ces trois marches, la face
       * redevient la bande pâle et vide qu’on a refusée.
       */
      const marches = t.filter((x) => x.lum > 0.12 && x.lum < 0.32 && x.sat < 0.42)
      expect(marches.map((x) => x.hex).join(' ')).toSatisfy(() => marches.length >= 3)
    })
  }

  it('le remblai de terre ne revient pas', () => {
    for (const niveau of [2, 3, 4]) {
      const mo = monterSvg(
        <Murailles niveau={niveau} hp={10} max={10} breche={false} layer="back" geo={GEO_CARTE} tours={1} />,
      )
      const html = mo.qq('svg')[0]?.outerHTML ?? ''
      mo.demonter()
      expect(html, `remparts ${niveau}`).not.toContain('mur-terre')
    }
  })
})

describe('Murailles - le chemin de ronde est la cote de référence', () => {
  /*
   * `hauteurRonde` est le contrat que la tour, la garnison et les jauges doivent
   * partager : le plancher d'une tour EST le chemin de ronde de son niveau de
   * mur. C'est l'absence de ce contrat qui faisait culminer la tour d'archers 16
   * à 25 px au-dessus du parapet, quel que soit le niveau.
   */
  it('croît strictement avec le niveau', () => {
    const h = [0, 1, 2, 3, 4].map(hauteurRonde)
    expect(h[0]).toBe(0)
    for (let n = 2; n <= 4; n++) expect(h[n]).toBeGreaterThan(h[n - 1])
  })

  it('borne les niveaux hors table sans lever', () => {
    expect(hauteurRonde(9)).toBe(hauteurRonde(4))
    expect(hauteurRonde(-3)).toBe(0)
  })
})
