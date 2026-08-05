import { beforeEach, describe, expect, it } from 'vitest'
import { PREMIER_ASSAUT_MS } from './data'
import { titrePrestige } from './hautsfaits'
import {
  ARCHIVE_VIDE,
  CLE_ARCHIVE,
  CLE_HERITAGE,
  PRESTIGE_PAR_POINT,
  PREMIER_ASSAUT_PLANCHER_MS,
  VAGUE_PLUS_MAX,
  apercuHeritage,
  appliquerHeritage,
  bilanDeFin,
  coutHeritage,
  coutHerosConnu,
  ecrireArchive,
  effacerArchive,
  heritageDisponible,
  lireArchive,
  lireHeritageEnAttente,
  malusDifficulte,
  normaliserChoix,
  oublierHeritageEnAttente,
  optionsHeritage,
  pointsHeritage,
  poserHeritageEnAttente,
  reportRelations,
  resteHeritage,
  resumeHeritage,
  type BilanRegne,
} from './ngplus'

/*
 * NOUVELLE PARTIE +.
 *
 * Deux promesses sont testées ici plus que le reste, parce que les casser
 * décevrait durablement : un mauvais règne ne doit JAMAIS faire baisser
 * l'héritage (le meilleur score paie), et un panier ne doit jamais valoir plus
 * que ce qu'on croit avoir payé (le marché doit être honnête). Le reste - les
 * barèmes - est vérifié par ses bornes et sa monotonie, pas par ses valeurs
 * exactes, qu'un équilibrage doit pouvoir bouger.
 */

const bilan = (champs: Partial<BilanRegne> = {}): BilanRegne => ({
  prestige: 500,
  titre: 'Seigneur de la plaine',
  jours: 20,
  pop: 18,
  repousses: 7,
  hautsFaits: 9,
  relations: {},
  finiLe: 1_700_000_000_000,
  ...champs,
})

beforeEach(() => {
  localStorage.clear()
})

describe('le budget d’héritage', () => {
  it('vaut zéro tant qu’on n’a pas le prestige d’un point', () => {
    expect(heritageDisponible(0)).toBe(0)
    expect(heritageDisponible(PRESTIGE_PAR_POINT - 1)).toBe(0)
    expect(heritageDisponible(PRESTIGE_PAR_POINT)).toBe(1)
  })

  it('ne rend jamais de points pour un prestige négatif', () => {
    expect(heritageDisponible(-500)).toBe(0)
  })

  it('croît linéairement, pour que le joueur puisse le calculer de tête', () => {
    expect(heritageDisponible(1000)).toBe(40)
    expect(heritageDisponible(1400)).toBe(56)
  })
})

describe('l’archive', () => {
  it('est vide quand rien n’a jamais été écrit', () => {
    expect(lireArchive()).toEqual(ARCHIVE_VIDE)
  })

  it('compte les règnes et cumule les prestiges', () => {
    ecrireArchive(bilan({ prestige: 300 }))
    const a = ecrireArchive(bilan({ prestige: 200 }))
    expect(a.regnes).toBe(2)
    expect(a.prestigeCumule).toBe(500)
  })

  it('garde le MEILLEUR règne : un essai raté ne coûte rien', () => {
    ecrireArchive(bilan({ prestige: 900 }))
    const a = ecrireArchive(bilan({ prestige: 40 }))
    expect(a.meilleur).toBe(900)
    expect(pointsHeritage(a)).toBe(heritageDisponible(900))
  })

  it('retient les titres sans doublon, dans l’ordre', () => {
    ecrireArchive(bilan({ titre: 'Chef de guerre' }))
    ecrireArchive(bilan({ titre: 'Chef de guerre' }))
    const a = ecrireArchive(bilan({ titre: 'Prince d’Ilion' }))
    expect(a.titres).toEqual(['Chef de guerre', 'Prince d’Ilion'])
  })

  it('remplace le DERNIER règne : c’est lui qui porte les relations à reporter', () => {
    ecrireArchive(bilan({ relations: { 'cite-lesbos': 50 } }))
    const a = ecrireArchive(bilan({ relations: { 'cite-lesbos': -80 } }))
    expect(a.dernier?.relations).toEqual({ 'cite-lesbos': -80 })
  })

  it('relit ce qu’elle a écrit', () => {
    const ecrit = ecrireArchive(bilan({ prestige: 777 }))
    expect(lireArchive()).toEqual(ecrit)
  })

  it('traite une archive illisible comme une archive vide', () => {
    localStorage.setItem(CLE_ARCHIVE, '{ ceci n’est pas du json')
    expect(lireArchive()).toEqual(ARCHIVE_VIDE)
  })

  it('nettoie les champs aberrants d’une archive trafiquée', () => {
    localStorage.setItem(CLE_ARCHIVE, JSON.stringify({ regnes: 'douze', meilleur: -30, titres: [1, 'Roi'] }))
    const a = lireArchive()
    expect(a.regnes).toBe(0)
    expect(a.meilleur).toBe(0)
    expect(a.titres).toEqual(['Roi'])
  })

  it('s’efface', () => {
    ecrireArchive(bilan())
    effacerArchive()
    expect(lireArchive().regnes).toBe(0)
  })
})

describe('le marché', () => {
  const dons = optionsHeritage()

  it('n’a pas deux dons du même identifiant', () => {
    expect(new Set(dons.map((d) => d.id)).size).toBe(dons.length)
  })

  it('n’a aucun don gratuit ni aucun don sans effet', () => {
    for (const d of dons) {
      expect(d.cout).toBeGreaterThan(0)
      expect(d.max).toBeGreaterThanOrEqual(1)
      expect(Object.keys(d.effet).length).toBeGreaterThan(0)
    }
  })

  it('propose un don par héros, d’autant plus cher qu’il est exigeant', () => {
    const heros = dons.filter((d) => d.effet.heros)
    expect(heros.length).toBe(8)
    expect(coutHerosConnu('hector')).toBeGreaterThan(coutHerosConnu('cassandre'))
  })

  it('jette les dons inconnus et borne les exemplaires', () => {
    expect(normaliserChoix({ 'don-qui-nexiste-pas': 3 })).toEqual({})
    expect(normaliserChoix({ 'grain-de-semence': 99 })).toEqual({ 'grain-de-semence': 3 })
    expect(normaliserChoix({ 'grain-de-semence': -2 })).toEqual({})
    expect(normaliserChoix({ 'grain-de-semence': Number.NaN })).toEqual({})
  })

  it('facture chaque exemplaire, et rien d’autre', () => {
    const prix = dons.find((d) => d.id === 'grain-de-semence')!.cout
    expect(coutHeritage({ 'grain-de-semence': 2 })).toBe(prix * 2)
    expect(coutHeritage({ 'grain-de-semence': 2, inconnu: 5 })).toBe(prix * 2)
    expect(coutHeritage({})).toBe(0)
  })

  it('dit ce qu’il reste, et passe sous zéro quand le panier dépasse', () => {
    expect(resteHeritage(20, { 'muraille-heritee': 1 })).toBeLessThan(0)
    expect(resteHeritage(30, { 'muraille-heritee': 1 })).toBe(30 - 22)
  })
})

describe('le panier en attente', () => {
  it('n’est rien tant que rien n’a été choisi', () => {
    expect(lireHeritageEnAttente()).toEqual({})
  })

  it('se relit nettoyé, puis s’oublie', () => {
    poserHeritageEnAttente({ 'grain-de-semence': 9, inconnu: 4 })
    expect(lireHeritageEnAttente()).toEqual({ 'grain-de-semence': 3 })
    oublierHeritageEnAttente()
    expect(lireHeritageEnAttente()).toEqual({})
  })

  it('ne rend rien d’un panier illisible', () => {
    localStorage.setItem(CLE_HERITAGE, 'pas du json')
    expect(lireHeritageEnAttente()).toEqual({})
  })
})

describe('appliquerHeritage', () => {
  it('cumule les ressources des exemplaires', () => {
    const m = appliquerHeritage({ 'grain-de-semence': 2 })
    expect(m.res.grain).toBe(400)
    expect(m.res.bois).toBe(400)
    expect(m.res.bronze).toBe(0)
  })

  it('garde le niveau de remparts le plus haut et pose le bâtiment avec', () => {
    const m = appliquerHeritage({ 'palissade-debout': 1, 'muraille-heritee': 1 })
    expect(m.remparts).toBe(3)
    expect(m.batiments.remparts).toBe(3)
  })

  it('accumule ouvrages, héros et grâces sans doublon', () => {
    const m = appliquerHeritage({ 'poterne-heritee': 1, 'citerne-heritee': 1, 'heros-hector': 1, 'grace-zeus-1': 1 })
    expect([...m.defenses].sort()).toEqual(['citerne', 'poterne'])
    expect(m.herosConnus).toEqual(['hector'])
    expect(m.graces).toEqual(['zeus-1'])
  })

  it('accorde la ferveur héritée aux quatre Olympiens', () => {
    const m = appliquerHeritage({ 'ferveur-heritee': 1 })
    expect(m.relations.zeus).toBe(20)
    expect(m.relations.ares).toBe(20)
  })

  it('rend un panier vide sans rien changer et sans malus', () => {
    const m = appliquerHeritage({})
    expect(m.pointsDepenses).toBe(0)
    expect(m.malus.threatMod).toBe(0)
    expect(m.malus.premierAssautMs).toBe(PREMIER_ASSAUT_MS)
    expect(resumeHeritage(m)).toEqual([])
  })

  it('facture exactement ce que le marché annonce', () => {
    const choix = { 'grain-de-semence': 2, 'tour-heritee': 2, 'heros-ulysse': 1 }
    expect(appliquerHeritage(choix).pointsDepenses).toBe(coutHeritage(choix))
  })

  it('résume le panier en clair pour l’écran', () => {
    const lignes = resumeHeritage(appliquerHeritage({ 'deux-bras': 1, 'tour-heritee': 1 }))
    expect(lignes.join(' | ')).toContain('+2 habitants')
    expect(lignes.join(' | ')).toContain('tour')
  })
})

describe('le prix : la difficulté', () => {
  it('ne coûte rien quand on ne dépense rien', () => {
    expect(malusDifficulte(0)).toEqual({ threatMod: 0, premierAssautMs: PREMIER_ASSAUT_MS, vaguePlus: 0 })
  })

  it('monte avec la dépense, sur les trois leviers', () => {
    const petit = malusDifficulte(10)
    const gros = malusDifficulte(40)
    expect(gros.threatMod).toBeGreaterThan(petit.threatMod)
    expect(gros.premierAssautMs).toBeLessThan(petit.premierAssautMs)
    expect(gros.vaguePlus).toBeGreaterThan(petit.vaguePlus)
  })

  it('laisse toujours le temps de bâtir une palissade', () => {
    expect(malusDifficulte(500).premierAssautMs).toBe(PREMIER_ASSAUT_PLANCHER_MS)
  })

  it('ne resserre jamais la cadence au-delà du plafond', () => {
    expect(malusDifficulte(1000).vaguePlus).toBe(VAGUE_PLUS_MAX)
  })
})

describe('la Troade se souvient', () => {
  it('conserve les rancunes mieux que les bienfaits', () => {
    const r = reportRelations({ ami: 60, ennemi: -60 })
    expect(r.ami).toBe(21)
    expect(r.ennemi).toBe(-36)
    expect(Math.abs(r.ennemi)).toBeGreaterThan(Math.abs(r.ami))
  })

  it('laisse un pillard entouré d’ennemis - assez pour rester hostile', () => {
    const r = reportRelations({ 'cite-lesbos': -90, 'citadelle-tenedos': -80 })
    expect(r['cite-lesbos']).toBeLessThanOrEqual(-40)
    expect(r['citadelle-tenedos']).toBeLessThanOrEqual(-40)
  })

  it('oublie ce qui ne pesait presque rien', () => {
    expect(reportRelations({ tiede: 5, neutre: 0, rien: -4 })).toEqual({})
  })

  it('reste dans les bornes de la diplomatie', () => {
    const r = reportRelations({ a: 100, b: -100 })
    expect(r.a).toBeLessThanOrEqual(100)
    expect(r.b).toBeGreaterThanOrEqual(-100)
  })
})

describe('le bilan de fin de règne', () => {
  it('donne le titre que les aèdes donneraient', () => {
    const b = bilanDeFin({ prestige: 760, jour: 30, pop: 22, repousses: 12, hautsFaits: 14, relations: {} }, 42)
    expect(b.titre).toBe(titrePrestige(760).titre)
    expect(b.finiLe).toBe(42)
  })

  it('recopie les relations plutôt que de les partager', () => {
    const relations = { 'fort-acheen': -50 }
    const b = bilanDeFin({ prestige: 100, jour: 1, pop: 1, repousses: 0, hautsFaits: 0, relations }, 0)
    relations['fort-acheen'] = 0
    expect(b.relations['fort-acheen']).toBe(-50)
  })

  it('annonce ce que le prochain règne gagnerait, et le record', () => {
    ecrireArchive(bilan({ prestige: 500 }))
    const a = lireArchive()
    const vu = apercuHeritage(a, 900)
    expect(vu.record).toBe(true)
    expect(vu.points).toBe(heritageDisponible(900))
    expect(vu.gagnes).toBe(heritageDisponible(900) - heritageDisponible(500))
  })

  it('n’annonce aucun gain quand le règne est moins beau que le précédent', () => {
    ecrireArchive(bilan({ prestige: 900 }))
    const vu = apercuHeritage(lireArchive(), 100)
    expect(vu.record).toBe(false)
    expect(vu.gagnes).toBe(0)
    expect(vu.points).toBe(heritageDisponible(900))
  })
})
