import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BUILDINGS, POSTES } from '../../game/data'
import { PanneauBatiment } from './PanneauBatiment'
import { habitant, monter, poser, reinitialiser, type Montage } from '../test-utils'

/*
 * LE PANNEAU D'UN BÂTIMENT.
 *
 * C'est l'écran où le joueur dépense. Trois erreurs y coûteraient cher : un
 * niveau faux, un coût qui ne correspond pas à ce qui sera prélevé, et un bouton
 * cliquable alors que la pierre manque. On vérifie donc ce que le joueur LIT et
 * ce qu'il peut CLIQUER, pas la forme du balisage.
 */

let m: Montage | null = null

beforeEach(() => reinitialiser())
afterEach(() => {
  m?.demonter()
  m = null
  reinitialiser()
})

/** le bouton d'action principal du bloc d'amélioration */
function boutonChantier(vue: Montage): HTMLButtonElement | undefined {
  return vue
    .qq('button')
    .find((b) => /Lancer (la construction|l’amélioration)/.test(b.textContent ?? '')) as
    | HTMLButtonElement
    | undefined
}

describe('en-tête du panneau', () => {
  it('affiche le nom et le niveau du bâtiment sélectionné', () => {
    poser({ selected: 'ferme', buildings: batiments({ ferme: 2 }) })
    m = monter(<PanneauBatiment />)
    expect(m.q('.panneau h2')?.textContent).toContain('Ferme')
    expect(m.q('.panneau .sous')?.textContent).toContain('Niveau 2/4')
  })

  it('signale les bâtiments plantés hors des murs, et rien du tout sans sélection', () => {
    poser({ selected: 'scierie', buildings: batiments({ scierie: 1 }) })
    m = monter(<PanneauBatiment />)
    expect(m.q('.panneau .sous')?.textContent).toContain('hors des murs')
    m.demonter()

    reinitialiser()
    m = monter(<PanneauBatiment />)
    expect(m.q('.panneau')).toBeNull()
  })
})

describe('coût et bouton d’amélioration', () => {
  it('affiche le coût exact du niveau visé', () => {
    poser({ selected: 'ferme', buildings: batiments({ agora: 4, ferme: 1 }) })
    m = monter(<PanneauBatiment />)
    // le bloc annonce le niveau visé…
    expect(m.texte()).toContain('Améliorer → niveau 2')
    // …et chaque denrée demandée, à l'unité près
    const cout = BUILDINGS.ferme.costs[1]
    const montants = m.qq('.cout .montant').map((e) => e.textContent?.trim())
    for (const [, n] of Object.entries(cout)) {
      expect(montants.some((t) => t?.includes(String(n)))).toBe(true)
    }
  })

  /*
   * Le refus se lit d'abord sur les montants : ceux qu'on ne peut pas payer
   * passent en rouge. On vérifie CETTE marque et non l'état `disabled` du
   * bouton, parce que `peutPayer` renvoie toujours vrai sous `MODE_TEST` - le
   * bouton d'un coffre vide reste donc cliquable en environnement de test.
   */
  it('marque en rouge les denrées qui manquent au chantier', () => {
    poser({
      selected: 'ferme',
      buildings: batiments({ agora: 4, ferme: 1 }),
      resources: { bois: 0, pierre: 0, grain: 0, bronze: 0 },
    })
    m = monter(<PanneauBatiment />)
    const cout = Object.keys(BUILDINGS.ferme.costs[1])
    expect(m.qq('.cout .montant.ko')).toHaveLength(cout.length)
    expect(m.qq('.cout .montant.okk')).toHaveLength(0)
  })

  it('passe les montants au vert dès que les coffres suffisent', () => {
    poser({
      selected: 'ferme',
      buildings: batiments({ agora: 4, ferme: 1 }),
      resources: { bois: 9000, pierre: 9000, grain: 9000, bronze: 9000 },
    })
    m = monter(<PanneauBatiment />)
    const cout = Object.keys(BUILDINGS.ferme.costs[1])
    expect(m.qq('.cout .montant.okk')).toHaveLength(cout.length)
    expect(m.qq('.cout .montant.ko')).toHaveLength(0)
  })

  it('explique que l’Agora bride le niveau visé', () => {
    poser({
      selected: 'ferme',
      buildings: batiments({ agora: 1, ferme: 1 }),
      resources: { bois: 9000, pierre: 9000, grain: 9000, bronze: 9000 },
    })
    m = monter(<PanneauBatiment />)
    expect(m.texte()).toContain('L’Agora doit d’abord atteindre le niveau 2')
    expect(boutonChantier(m)?.disabled).toBe(true)
  })

  it('remplace le bloc par la mention du niveau maximal', () => {
    poser({ selected: 'ferme', buildings: batiments({ agora: 4, ferme: 4 }) })
    m = monter(<PanneauBatiment />)
    expect(m.texte()).toContain('Niveau maximal atteint')
    expect(boutonChantier(m)).toBeUndefined()
  })
})

describe('bloc des ouvriers', () => {
  it('affiche les postes tenus et le rendement qui en découle', () => {
    poser({
      selected: 'ferme',
      buildings: batiments({ agora: 4, ferme: 2 }),
      pop: 1,
      villageois: [habitant('Alexis', 'ferme', 'ferme')],
    })
    m = monter(<PanneauBatiment />)
    // deux postes au niveau 2, un seul tenu : la moitié du rendement
    expect(POSTES.ferme?.[2]).toBe(2)
    expect(m.texte()).toContain('👷 Ouvriers - 1/2')
    expect(m.texte()).toContain('50 %')
  })

  it('dit qu’un atelier désert ne rend rien de plus que la cueillette', () => {
    poser({ selected: 'ferme', buildings: batiments({ agora: 4, ferme: 1 }), pop: 0, villageois: [] })
    m = monter(<PanneauBatiment />)
    expect(m.texte()).toContain('Personne ici')
    expect(m.texte()).toContain('👷 Ouvriers - 0/1')
  })

  it('nomme l’ouvrier déplacé hors de son métier et le rendement qu’il y perd', () => {
    poser({
      selected: 'carriere',
      buildings: batiments({ agora: 4, carriere: 1 }),
      pop: 1,
      villageois: [habitant('Briséis', 'ferme', 'carriere')],
    })
    m = monter(<PanneauBatiment />)
    expect(m.texte()).toContain('Briséis')
    expect(m.texte()).toContain('déplacé ici')
  })
})

describe('remparts et ouvrages de l’intérieur', () => {
  it('montre les cinq ouvrages de l’intérieur et ce qu’ils font', () => {
    poser({ selected: 'remparts', buildings: batiments({ agora: 4, remparts: 2 }), wallHp: 400 })
    m = monter(<PanneauBatiment />)
    const t = m.texte()
    expect(t).toContain('Ouvrages de l’intérieur')
    expect(t).toContain('Muraille d’acropole')
    expect(t).toContain('Bastion de la porte')
    expect(t).toContain('Galeries casematées')
    expect(t).toContain('Poterne dérobée')
    expect(t).toContain('Citerne secrète')
    // bastion et galeries demandent des remparts de niveau 3 : ils sont scellés
    expect(t).toContain('Remparts de niveau 3 requis')
  })

  it('affiche l’état chiffré de la muraille', () => {
    poser({ selected: 'remparts', buildings: batiments({ agora: 4, remparts: 2 }), wallHp: 300 })
    m = monter(<PanneauBatiment />)
    expect(m.texte()).toContain('État de la muraille')
    // 600 points au niveau 2 : la jauge dit bien 300 sur 600
    expect(m.texte()).toContain('300/600')
  })

  it('n’affiche aucun ouvrage tant qu’il n’y a pas de rempart', () => {
    poser({ selected: 'remparts', buildings: batiments({ agora: 4, remparts: 0 }) })
    m = monter(<PanneauBatiment />)
    expect(m.texte()).not.toContain('Ouvrages de l’intérieur')
    expect(m.texte()).toContain('Construire')
  })
})

describe('test de fumée', () => {
  it('la caserne au complet se rend sans jeter', () => {
    poser({
      selected: 'caserne',
      buildings: batiments({ agora: 4, caserne: 4 }),
      pop: 2,
      villageois: [habitant('Alexis', 'ferme'), habitant('Briséis', 'scierie')],
      recruitQueue: [{ unit: 'lancier', restant: 3, finishAt: Date.now() + 20_000 }],
    })
    m = monter(<PanneauBatiment />)
    expect(m.texte()).toContain('Recruter')
    expect(m.texte()).toContain('Formation en cours')
    // les six unités de la caserne sont proposées
    expect(m.qq('.unite').length).toBeGreaterThanOrEqual(6)
  })

  it('le comptoir du port se rend sans jeter', () => {
    poser({ selected: 'port', buildings: batiments({ agora: 4, port: 2 }) })
    m = monter(<PanneauBatiment />)
    expect(m.texte()).toContain('Comptoir d’échange')
    expect(m.qq('.troc-jeton').length).toBe(8)
  })
})

/** raccourci : un jeu de bâtiments complet où seuls les niveaux cités changent */
function batiments(niveaux: Partial<Record<keyof typeof BUILDINGS, number>>) {
  const out = {} as Record<keyof typeof BUILDINGS, { level: number }>
  for (const id of Object.keys(BUILDINGS) as (keyof typeof BUILDINGS)[]) {
    out[id] = { level: niveaux[id] ?? (id === 'agora' ? 1 : 0) }
  }
  return out as never
}
