import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from './data'
import {
  NB_EMPLACEMENTS,
  cleEmplacement,
  copierEmplacement,
  effacerEmplacement,
  emplacementActif,
  exporterTexte,
  importerTexte,
  lireResume,
  lireResumes,
  nomFichier,
  poserEmplacementActif,
} from './sauvegardes'
import { useGame } from './store'

/*
 * TROIS EMPLACEMENTS ET UN FICHIER.
 *
 * C'est la seule partie du jeu dont une erreur EFFACE quelque chose. On y teste
 * donc moins les cas nominaux que les cas laids : le fichier qui n'en est pas
 * un, la sauvegarde d'une version future, l'emplacement illisible, et surtout la
 * promesse qui compte - basculer ne perd jamais la partie qu'on quitte.
 */

/** une partie plausible, réduite aux champs que le résumé sait lire */
function partie(champs: Record<string, unknown> = {}): string {
  return JSON.stringify({
    createdAt: 1_000_000,
    lastSeen: 1_000_000 + 8 * 60_000 * 3.4,
    pop: 12,
    resources: { bois: 100, pierre: 100, grain: 100, bronze: 10 },
    buildings: { agora: { level: 2 }, ferme: { level: 1 } },
    mode: 'bac-a-sable',
    ...champs,
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('les emplacements', () => {
  it('garde la clé historique pour le premier : une partie d’avant reste où elle est', () => {
    expect(cleEmplacement(0)).toBe(STORAGE_KEY)
    // et les suivants ne marchent jamais sur ses plates-bandes
    const cles = Array.from({ length: NB_EMPLACEMENTS }, (_, i) => cleEmplacement(i))
    expect(new Set(cles).size).toBe(NB_EMPLACEMENTS)
  })

  it('retombe sur le premier emplacement quand la préférence est absurde', () => {
    localStorage.setItem('palladion-emplacement', 'boum')
    expect(emplacementActif()).toBe(0)
    poserEmplacementActif(2)
    expect(emplacementActif()).toBe(2)
    localStorage.setItem('palladion-emplacement', '99')
    expect(emplacementActif()).toBe(0)
  })

  it('résume une partie sans la charger', () => {
    localStorage.setItem(cleEmplacement(1), partie())
    const r = lireResume(1)
    expect(r.occupe).toBe(true)
    expect(r.pop).toBe(12)
    // 3,4 journées écoulées : on entame la quatrième
    expect(r.jour).toBe(4)
    // deux bâtiments, niveaux 2 et 1
    expect(r.niveaux).toBe(3)
    expect(r.acte).toBeNull()
  })

  it('annonce l’acte d’une campagne, et rien pour une campagne achevée', () => {
    localStorage.setItem(cleEmplacement(0), partie({ mode: 'campagne', campagne: { acte: 2, fini: false } }))
    expect(lireResume(0).acte).toBe(3)
    localStorage.setItem(cleEmplacement(0), partie({ mode: 'campagne', campagne: { acte: 4, fini: true } }))
    expect(lireResume(0).acte).toBeNull()
  })

  it('montre un emplacement illisible plutôt que de le cacher', () => {
    // sinon le joueur voit une case « libre » qu'il ne peut pas remplir
    localStorage.setItem(cleEmplacement(2), '{ceci nest pas du JSON')
    const r = lireResume(2)
    expect(r.occupe).toBe(true)
    expect(r.jour).toBe(0)
  })

  it('rend un emplacement à sa liberté quand on l’efface', () => {
    localStorage.setItem(cleEmplacement(1), partie())
    effacerEmplacement(1)
    expect(lireResume(1).occupe).toBe(false)
    // et l'on n'a touché à aucun autre
    expect(lireResumes()).toHaveLength(NB_EMPLACEMENTS)
  })

  it('recopie une partie d’un emplacement à l’autre, à l’identique', () => {
    localStorage.setItem(cleEmplacement(0), partie({ pop: 33 }))
    expect(copierEmplacement(0, 2)).toBe(true)
    expect(lireResume(2).pop).toBe(33)
    expect(copierEmplacement(1, 2)).toBe(false) // la source est vide
  })
})

describe('le fichier', () => {
  it('exporte une enveloppe relisible, et rien d’un emplacement vide', () => {
    localStorage.setItem(cleEmplacement(0), partie())
    const texte = exporterTexte(0)!
    expect(texte).not.toBeNull()
    const f = JSON.parse(texte)
    expect(f.jeu).toBe('palladion')
    expect(f.version).toBe(1)
    expect(f.partie.pop).toBe(12)
    expect(exporterTexte(1)).toBeNull()
  })

  it('fait l’aller-retour sans rien perdre', () => {
    localStorage.setItem(cleEmplacement(0), partie({ pop: 41 }))
    const texte = exporterTexte(0)!
    localStorage.clear()
    expect(importerTexte(texte, 2)).toEqual({ ok: true })
    expect(lireResume(2).pop).toBe(41)
  })

  it('refuse ce qui n’est pas une partie, sans écraser celle qui est là', () => {
    localStorage.setItem(cleEmplacement(1), partie({ pop: 7 }))
    for (const mauvais of ['', 'bonjour', '[]', '{"jeu":"autre-chose"}', '{"pop":3}']) {
      const issue = importerTexte(mauvais, 1)
      expect(issue.ok, mauvais).toBe(false)
      if (!issue.ok) expect(issue.raison.length).toBeGreaterThan(10)
    }
    // la partie qui était là n'a pas bougé d'un cheveu
    expect(lireResume(1).pop).toBe(7)
  })

  it('accepte aussi une sauvegarde nue, sans enveloppe', () => {
    // un joueur qui recopie le contenu de localStorage à la main doit pouvoir
    // le remettre : on est tolérant à l'entrée, strict sur le contrôle
    expect(importerTexte(partie({ pop: 5 }), 0)).toEqual({ ok: true })
    expect(lireResume(0).pop).toBe(5)
  })

  it('nomme le fichier d’après le règne qu’il contient', () => {
    localStorage.setItem(cleEmplacement(0), partie())
    const nom = nomFichier(lireResume(0))
    expect(nom).toMatch(/^palladion-jour-\d+-\d{4}-\d{2}-\d{2}\.json$/)
  })
})

describe('la bascule ne perd jamais la partie qu’on quitte', () => {
  it('range la partie en cours avant d’ouvrir l’autre emplacement', () => {
    vi.spyOn(Date, 'now').mockReturnValue(5_000_000)
    useGame.getState().init()
    useGame.getState().choisirMode('bac-a-sable')
    // une partie reconnaissable, jamais sauvegardée explicitement
    useGame.setState({ pop: 27, faveur: 61 })

    useGame.getState().changerEmplacement(1)
    // l'emplacement 2 est vierge : on y repart de zéro
    expect(useGame.getState().pop).not.toBe(27)
    expect(emplacementActif()).toBe(1)

    // et en revenant, tout est là - c'est toute la promesse
    useGame.getState().changerEmplacement(0)
    expect(useGame.getState().pop).toBe(27)
    expect(useGame.getState().faveur).toBe(61)
  })

  it('ouvre l’écran de choix du mode sur un emplacement neuf', () => {
    vi.spyOn(Date, 'now').mockReturnValue(6_000_000)
    useGame.getState().init()
    useGame.getState().choisirMode('bac-a-sable')
    useGame.getState().changerEmplacement(2)
    // `mode` à null, c'est ce qui déclenche l'écran de choix
    expect(useGame.getState().mode).toBeNull()
    expect(useGame.getState().campagne).toBeNull()
  })

  it('écrit bien dans l’emplacement actif, et pas dans le premier', () => {
    vi.spyOn(Date, 'now').mockReturnValue(7_000_000)
    poserEmplacementActif(2)
    useGame.getState().init()
    useGame.getState().choisirMode('bac-a-sable')
    useGame.setState({ pop: 19 })
    useGame.getState().save()
    expect(lireResume(2).pop).toBe(19)
    expect(lireResume(0).occupe).toBe(false)
  })
})
