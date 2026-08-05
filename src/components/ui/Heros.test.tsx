import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { HERO_IDS, HEROS, etatHeroInitial, type HeroState } from '../../game/heros'
import type { HeroId } from '../../game/types'
import { PanneauHeros } from './Heros'
import { monter, poser, reinitialiser, type Montage } from '../test-utils'

/*
 * LES HÉROS.
 *
 * Ils ne s'achètent pas : ils viennent quand la cité en est digne. Le panneau
 * doit donc dire trois choses sans se tromper - ce qui manque encore pour qu'un
 * héros vienne, ce qu'il vaut maintenant qu'il est là, et qu'il ne reviendra pas
 * quand il est tombé. Un héros mort proposé au recrutement serait un mensonge.
 */

let m: Montage | null = null

beforeEach(() => reinitialiser())
afterEach(() => {
  m?.demonter()
  m = null
  reinitialiser()
})

/** l'état des huit héros, avec un seul écarté du neuf */
function heros(id: HeroId, etat: Partial<HeroState>) {
  const out = {} as Record<HeroId, HeroState>
  for (const h of HERO_IDS) out[h] = etatHeroInitial()
  out[id] = { ...out[id], ...etat }
  return out as never
}

/** la carte d'un héros, repérée par son nom */
function carte(vue: Montage, nom: string): Element | undefined {
  return vue.qq('.heros-carte').find((c) => c.querySelector('h3')?.textContent === nom)
}

describe('panneau des héros', () => {
  it('montre à un héros non venu les conditions qui lui manquent', () => {
    m = monter(<PanneauHeros />)
    expect(m.texte()).toContain('Ceux qu’on pourrait convaincre')
    const c = carte(m, 'Hector')
    expect(c?.className).toContain('verrouille')
    // Hector exige des remparts de niveau 3 et la faveur de Zeus : ni l'un ni l'autre
    const conds = [...(c?.querySelectorAll('.heros-conds span') ?? [])].map((s) => s.textContent)
    expect(conds).toContain('✘ Remparts niveau 3')
    expect(conds).toContain('✘ Relation Zeus ≥ 15')
    expect(c?.querySelector('button')?.textContent).toBe('Il ne viendra pas encore')
    m.demonter()

    // les remparts montés, cette condition-là se coche - l'autre reste en défaut
    reinitialiser()
    poser({ buildings: batiments({ remparts: 3 }) })
    m = monter(<PanneauHeros />)
    const apres = [...(carte(m, 'Hector')?.querySelectorAll('.heros-conds span') ?? [])].map((x) => x.textContent)
    expect(apres).toContain('✔ Remparts niveau 3')
    expect(apres).toContain('✘ Relation Zeus ≥ 15')
  })

  it('montre du héros à son service son niveau, sa capacité et son entretien', () => {
    poser({ heros: heros('hector', { recrute: true, niveau: 3, xp: 40 }) })
    m = monter(<PanneauHeros />)
    expect(m.texte()).toContain('À votre service')
    const c = carte(m, 'Hector')
    // trois lauriers pleins sur les cinq possibles
    expect(c?.querySelectorAll('.heros-niveaux .plein')).toHaveLength(3)
    expect(c?.textContent).toContain(HEROS.hector.capacite.nom)
    expect(c?.textContent).toContain('puissance ×')
    // et ce qu'il prélève chaque minute sur les réserves
    expect(m.texte()).toContain('Entretien de la maisonnée')
    expect(m.texte()).toContain('0.6 🌾/min')
  })

  it('range le héros tombé au mémorial avec son épitaphe', () => {
    poser({ heros: heros('hector', { recrute: true, mort: true, niveau: 2 }) })
    m = monter(<PanneauHeros />)
    expect(m.texte()).toContain('Mémorial')
    expect(m.texte()).not.toContain('À votre service')
    const c = carte(m, 'Hector')
    expect(c?.className).toContain('mort')
    expect(c?.textContent).toContain('Tombé au niveau 2')
    expect(c?.textContent).toContain('il ne défendra plus rien')
  })

  it('annonce le plafond d’un héros dont l’arc a brisé la légende', () => {
    poser({ heros: heros('hector', { recrute: true, niveau: 2, plafond: 2 }) })
    m = monter(<PanneauHeros />)
    const c = carte(m, 'Hector')
    expect(c?.textContent).toContain('il ne dépassera pas le niveau 2')
    // plus de jauge d'expérience : il n'a plus de niveau à gagner
    expect(c?.querySelector('.heros-xp')).toBeNull()
    // les lauriers qu'il ne portera jamais sont barrés
    expect(c?.querySelectorAll('.heros-niveaux .barre')).toHaveLength(3)
  })

  /*
   * LE PIÈGE D'AGAMEMNON. Ses deux conditions cochées en vert, le bouton éteint,
   * et le coût affiché en gris neutre : le joueur lisait « tout est réuni » et
   * concluait à une panne. Il manquait simplement du bronze. Le coût doit donc
   * se colorer comme celui d'un chantier et chiffrer ce qui manque.
   *
   * (`peutPayer` répond toujours vrai sous MODE_TEST : on éprouve ici le MARQUAGE
   * du coût, qui lit les réserves en direct, et non l'état du bouton.)
   */
  it('dit lequel des présents manque quand les conditions sont pourtant réunies', () => {
    const requis = HEROS.agamemnon.coutRecrutement
    poser({
      buildings: batiments({ agora: 3 }),
      army: { lancier: 6, archer: 6, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 },
      resources: { bronze: 10, grain: 999, bois: 999, pierre: 999 },
    })
    m = monter(<PanneauHeros />)
    const c = carte(m, 'Agamemnon')
    const conds = [...(c?.querySelectorAll('.heros-conds span') ?? [])].map((s) => s.textContent)
    expect(conds).toContain('✔ Agora niveau 3')
    expect(conds).toContain('✔ 12 soldats sous les armes')
    // le bronze manque, le grain non : chacun porte sa couleur
    const pied = c?.querySelector('.heros-pied')
    expect(pied?.querySelectorAll('.montant.ko')).toHaveLength(1)
    expect(pied?.querySelectorAll('.montant.okk')).toHaveLength(1)
    // c'est bien le bronze qui pèche, et le chiffre exigé reste lisible
    expect(pied?.querySelector('.montant.ko')?.textContent).toContain(String(requis.bronze))
    m.demonter()

    // les coffres pleins, plus rien n'est en rouge
    reinitialiser()
    poser({
      buildings: batiments({ agora: 3 }),
      army: { lancier: 6, archer: 6, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 },
      resources: { bronze: 999, grain: 999, bois: 999, pierre: 999 },
    })
    m = monter(<PanneauHeros />)
    const pied2 = carte(m, 'Agamemnon')?.querySelector('.heros-pied')
    expect(pied2?.querySelectorAll('.montant.ko')).toHaveLength(0)
    expect(pied2?.querySelector('button')?.textContent).toBe('Le prendre à son service')
  })
})

/** bâtiments complets, seuls les niveaux cités s'écartent de zéro */
function batiments(niveaux: Record<string, number>) {
  const ids = [
    'agora',
    'remparts',
    'maisons',
    'ferme',
    'scierie',
    'carriere',
    'forge',
    'caserne',
    'temple',
    'port',
  ] as const
  const out = {} as Record<(typeof ids)[number], { level: number }>
  for (const id of ids) out[id] = { level: niveaux[id] ?? (id === 'agora' ? 1 : 0) }
  return out as never
}
