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
