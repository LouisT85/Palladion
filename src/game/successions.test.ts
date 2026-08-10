import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DAY_MS } from './data'
import { AGE_ADULTE, AGE_LIMITE, ANS_PAR_JOUR, ageDe } from './lignees'
import {
  AGE_MAX_HERITIER,
  CANDIDATS_MAX,
  INTERREGNE_GRAIN_MAX,
  INTERREGNE_MORALE_MAX,
  TRAITS,
  TRAITS_PAR_ID,
  TRAIT_COURT,
  TRAIT_LONG,
  ageDuChef,
  candidats,
  coutInterregne,
  effetsChef,
  fonderChef,
  risqueDuChef,
  traitsDe,
  type Chef,
} from './successions'
import { jourDe, murMax, productionParMinute, relationEffective, useGame } from './store'
import type { BuildingId, Villageois } from './types'

/*
 * ═══════════════════ LES SUCCESSIONS, ET LE PIÈGE DES DEUX GESTES ═══════════════════
 *
 * Trois endroits où ce système pouvait casser quelque chose qui marche, et c'est
 * ce que ces tests gardent :
 *
 *  · `syncVillageois` recomplète la liste des habitants jusqu'à `pop` À CHAQUE
 *    BATTEMENT, en retirant « d'abord les oisifs ». Couronner un héritier demande
 *    donc DEUX gestes simultanés - le retirer de la liste ET décrémenter `pop`.
 *    Le premier seul le fait renaître au battement suivant sous un autre nom ; le
 *    second seul fait disparaître un oisif au hasard à sa place.
 *
 *  · UNE SAUVEGARDE EXISTANTE n'a pas de dynastie. Si `init` avait fondé son chef
 *    au jour 1 d'un village qui est au jour quarante, ce chef aurait eu cent vingt
 *    ans - au-delà de l'âge limite - donc serait mort au premier battement, et le
 *    joueur se serait réveillé en interrègne sans avoir rien fait.
 *
 *  · UN ACTE DE CAMPAGNE remet `createdAt` au premier matin de sa saison. Le jour
 *    courant retombe de quarante à cinq, et `ageDe` rend zéro dès que la naissance
 *    est postérieure au jour courant : le chef devenait un nourrisson.
 */

const AUCUNE = { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 }

function habitant(id: string, nom: string, lignee: string, age: number, jour: number, metier: BuildingId = 'ferme'): Villageois {
  return { id, nom, poste: null, metier, neLe: jour - age / ANS_PAR_JOUR, lignee }
}

/** un chef d'un âge donné, au jour donné */
function chefDe(age: number, jour: number, traits: string[] = []): Chef {
  return { nom: 'Théron', lignee: 'Nélides', neLe: jour - age / ANS_PAR_JOUR, depuis: jour - 5, traits }
}

beforeEach(() => {
  useGame.getState().reset()
  useGame.setState({ mode: 'bac-a-sable' })
})
afterEach(() => vi.restoreAllMocks())

describe('le fondateur est la référence plate', () => {
  it('il n’a aucun trait - sinon le défi de la semaine ne serait plus comparable', () => {
    /*
     * La graine du défi est partagée : même Troade, mêmes vagues, mêmes dilemmes
     * pour tous. Un fondateur aux traits tirés au sort aurait donné à l'un « Fils
     * de la terre » et à l'autre « Impie », et le classement n'aurait plus rien
     * voulu dire. Le tempérament entre dans le règne à la PREMIÈRE succession.
     */
    for (const tirage of [0, 0.17, 0.5, 0.83, 0.999]) {
      expect(fonderChef(tirage, 1).traits).toEqual([])
    }
  })

  it('une partie neuve commence avec un chef vivant, dans la force de l’âge', () => {
    const s = useGame.getState()
    expect(s.dynastie.chef).not.toBeNull()
    expect(s.dynastie.vacanceDepuis).toBeNull()
    const age = ageDuChef(s.dynastie.chef!, jourDe(s))
    expect(age).toBeGreaterThanOrEqual(AGE_ADULTE)
    expect(age).toBeLessThan(AGE_MAX_HERITIER)
  })

  it('il vieillit sur la même horloge que ses sujets', () => {
    const chef = fonderChef(0.4, 10)
    // deux ans par journée de jeu : dix journées de plus font vingt ans de plus
    expect(ageDuChef(chef, 20) - ageDuChef(chef, 10)).toBe(10 * ANS_PAR_JOUR)
  })
})

describe('les traits font un chef, et aucun n’est un cadeau', () => {
  it('deux traits, jamais le même deux fois', () => {
    for (const cle of ['v-1', 'v-2', 'Damon', 'x', 'Kalliopé-Nélides-7', '']) {
      const t = traitsDe(cle)
      expect(t).toHaveLength(2)
      expect(t[0]).not.toBe(t[1])
      for (const id of t) expect(TRAITS_PAR_ID[id]).toBeDefined()
    }
  })

  it('deux traits ne se contredisent jamais - vu sur une capture, pas dans un test', () => {
    /*
     * Le premier jet ne garantissait que la distinction des ids. La première image
     * du panneau montrait une prétendante « Noué de chêne » ET « De santé fragile » :
     * deux ids différents, une carte absurde, et `risqueDuChef` qui tranchait en
     * silence. On balaie donc tout l'espace des empreintes atteignables.
     */
    const contraires: [string, string][] = [
      [TRAIT_COURT, TRAIT_LONG],
      ['pieux', 'impie'],
    ]
    for (let i = 0; i < 4000; i++) {
      const [a, b] = traitsDe(`v-${i}`)
      expect(a).not.toBe(b)
      for (const [x, y] of contraires) {
        expect([a, b].filter((id) => id === x || id === y).length, `${a} + ${b}`).toBeLessThan(2)
      }
    }
  })

  it('les traits d’un homme ne changent pas sous les yeux du joueur', () => {
    // le panneau les recalcule à chaque ouverture : s'ils dansaient, on ne
    // pourrait pas comparer deux héritiers
    const a = traitsDe('v-42')
    for (let i = 0; i < 20; i++) expect(traitsDe('v-42')).toEqual(a)
  })

  it('aucun trait ne donne sans retirer', () => {
    /*
     * La règle du tableau. Un chef dont les deux traits seraient des cadeaux
     * ferait de la succession une loterie qu'on relance, pas un choix qu'on
     * assume.
     */
    for (const t of TRAITS) {
      const e = effetsChef([t.id])
      const chiffres = [e.grainPct, e.murPct, e.degatsPct, e.butinPct, e.recruesPct, e.faveurPct, e.morale]
      const relations = Object.values(e.relation)
      const bien = chiffres.some((n) => n > 0) || relations.some((n) => n > 0)
      const mal = chiffres.some((n) => n < 0) || relations.some((n) => n < 0)
      // les deux traits de longévité sont l'exception assumée : leur prix est le TEMPS
      if (t.id === TRAIT_COURT || t.id === TRAIT_LONG) continue
      expect(bien, `${t.id} ne donne rien`).toBe(true)
      expect(mal, `${t.id} ne coûte rien`).toBe(true)
    }
  })

  it('deux traits se cumulent, et un chef sans trait ne change rien', () => {
    expect(effetsChef([])).toEqual(effetsChef(undefined))
    const seul = effetsChef(['guerrier'])
    const deux = effetsChef(['guerrier', 'pillard'])
    expect(deux.degatsPct).toBe(seul.degatsPct)
    expect(deux.butinPct).toBeGreaterThan(seul.butinPct)
  })

  it('un trait inconnu est ignoré au lieu de vider les autres', () => {
    // une sauvegarde reprise à la main, un trait renommé depuis : on ne casse pas
    expect(effetsChef(['guerrier', 'trait-qui-nexiste-pas']).degatsPct).toBe(effetsChef(['guerrier']).degatsPct)
  })
})

describe('la longévité se paie en temps, pas en pourcentage', () => {
  it('le maladif meurt plus tôt, le noué de chêne plus tard', () => {
    const jour = 40
    const age = 66
    const commun = risqueDuChef(chefDe(age, jour), jour)
    const court = risqueDuChef(chefDe(age, jour, [TRAIT_COURT]), jour)
    const long = risqueDuChef(chefDe(age, jour, [TRAIT_LONG]), jour)
    expect(court).toBeGreaterThan(commun)
    expect(long).toBeLessThan(commun)
  })

  it('personne n’est immortel : passé l’âge limite, la mort est certaine', () => {
    const jour = 60
    expect(risqueDuChef(chefDe(AGE_LIMITE + 4, jour, [TRAIT_LONG]), jour)).toBeGreaterThan(0)
    expect(risqueDuChef(chefDe(AGE_LIMITE + 40, jour, [TRAIT_LONG]), jour)).toBe(1)
  })

  it('un chef jeune ne risque rien', () => {
    expect(risqueDuChef(chefDe(30, 20), 20)).toBe(0)
  })
})

describe('les prétendants sont ceux que le village reconnaîtrait', () => {
  const jour = 30

  it('le sang du chef passe devant les autres maisons', () => {
    const gens = [
      habitant('a', 'Alexios', 'Bacchiades', 24, jour),
      habitant('b', 'Damon', 'Nélides', 40, jour),
      habitant('c', 'Théron', 'Nélides', 30, jour),
    ]
    const l = candidats(gens, jour, 'Nélides')
    expect(l[0].lignee).toBe('Nélides')
    expect(l[1].lignee).toBe('Nélides')
    // et à sang égal, le plus jeune d'abord : un long règne vaut mieux qu'un court
    expect(l[0].age).toBeLessThan(l[1].age)
    expect(l[0].duSang).toBe(true)
    expect(l[2].duSang).toBe(false)
  })

  it('on ne couronne ni un enfant ni un ancien', () => {
    const gens = [
      habitant('enfant', 'Kléobis', 'Nélides', 10, jour),
      habitant('vieux', 'Néléos', 'Nélides', AGE_MAX_HERITIER + 6, jour),
      habitant('bon', 'Myron', 'Nélides', 28, jour),
    ]
    const l = candidats(gens, jour, 'Nélides')
    expect(l.map((c) => c.id)).toEqual(['bon'])
  })

  it('on n’en présente jamais plus de trois : assez pour choisir, assez peu pour lire', () => {
    const gens = Array.from({ length: 12 }, (_, i) => habitant(`v${i}`, `Nom${i}`, 'Nélides', 20 + i, jour))
    expect(candidats(gens, jour, 'Nélides')).toHaveLength(CANDIDATS_MAX)
  })

  it('un village sans adulte ne présente personne - et c’est une situation, pas un plantage', () => {
    const gens = [habitant('e', 'Kléobis', 'Nélides', 8, jour)]
    expect(candidats(gens, jour, 'Nélides')).toEqual([])
  })

  it('chaque prétendant arrive avec son métier et ses traits, lisibles avant le choix', () => {
    const gens = [habitant('a', 'Alexios', 'Nélides', 24, jour, 'forge')]
    const [c] = candidats(gens, jour, 'Nélides')
    expect(c.metierNom).toBe('Forgeron')
    expect(c.traits).toEqual(traitsDe('a'))
  })
})

describe('un trône vide coûte, mais ne ruine pas', () => {
  it('sans vacance, rien n’est perdu', () => {
    expect(coutInterregne(null, 20)).toEqual({ jours: 0, morale: 0, grainPct: 0 })
  })

  it('le prix monte avec les journées', () => {
    const un = coutInterregne(20, 21)
    const trois = coutInterregne(20, 23)
    expect(trois.morale).toBeLessThan(un.morale)
    expect(trois.grainPct).toBeLessThan(un.grainPct)
  })

  it('et il PLAFONNE : une nuit d’absence ne ruine pas un règne', () => {
    /*
     * Huit heures hors ligne avancent le calendrier de soixante journées. Sans
     * plafond, l'interrègne ôterait trois cent soixante points d'ambiance - un
     * village rayé de la carte pour avoir dormi.
     */
    const enorme = coutInterregne(1, 1000)
    expect(enorme.morale).toBe(-INTERREGNE_MORALE_MAX)
    expect(enorme.grainPct).toBe(-INTERREGNE_GRAIN_MAX)
  })
})

describe('la mort du chef ouvre une vacance, elle n’intronise personne', () => {
  it('le chef meurt dans le crochet quotidien, et le trône reste vide', () => {
    const now = Date.now()
    const s = useGame.getState()
    useGame.setState({
      createdAt: now - 45 * DAY_MS,
      lastSeen: now - 45 * DAY_MS,
      dernierJourVecu: 1,
      dynastie: { chef: { ...s.dynastie.chef!, neLe: -60, depuis: 1 }, vacanceDepuis: null, passes: [] },
    })
    // le chef a largement passé l'âge limite : sa mort est certaine
    vi.spyOn(Math, 'random').mockReturnValue(0)
    useGame.getState().tick()
    const d = useGame.getState().dynastie
    expect(d.chef).toBeNull()
    expect(d.vacanceDepuis).not.toBeNull()
    expect(d.passes).toHaveLength(1)
    expect(useGame.getState().reports.some((r) => r.titre.startsWith('Mort de'))).toBe(true)
  })

  it('le trône vide se voit dans l’ambiance et dans les champs', () => {
    const now = Date.now()
    useGame.setState({
      createdAt: now - 20 * DAY_MS,
      lastSeen: now,
      buildings: { ...useGame.getState().buildings, ferme: { level: 3 }, agora: { level: 3 } },
      villageois: [],
      dynastie: { chef: null, vacanceDepuis: 1, passes: [] },
    })
    const vide = productionParMinute(useGame.getState(), now)
    useGame.setState({ dynastie: { chef: chefDe(40, 20), vacanceDepuis: null, passes: [] } })
    const tenu = productionParMinute(useGame.getState(), now)
    expect(vide.grain).toBeLessThan(tenu.grain)
  })
})

describe('couronner un héritier retire un bras au village', () => {
  function regneVacant() {
    const now = Date.now()
    const createdAt = now - 20 * DAY_MS
    useGame.setState({ createdAt, lastSeen: now })
    const jour = jourDe(useGame.getState())
    const gens = [
      habitant('h1', 'Alexios', 'Nélides', 24, jour, 'forge'),
      habitant('h2', 'Damon', 'Bacchiades', 30, jour, 'ferme'),
      habitant('h3', 'Myron', 'Kydonides', 34, jour, 'carriere'),
    ]
    useGame.setState({
      villageois: gens,
      pop: gens.length,
      dynastie: { chef: null, vacanceDepuis: jour, passes: [{ nom: 'X', lignee: 'Nélides', jours: 8, mortA: 70 }] },
    })
    return { jour, gens }
  }

  it('l’héritier quitte la liste ET la population, dans le même geste', () => {
    /*
     * LE PIÈGE. `syncVillageois` recomplète la liste jusqu'à `pop` à chaque
     * battement : retirer l'habitant sans décrémenter `pop` l'aurait fait renaître
     * sous un autre nom au battement suivant.
     */
    regneVacant()
    const popAvant = useGame.getState().pop
    useGame.getState().couronner('h1')
    const s = useGame.getState()
    expect(s.dynastie.chef?.nom).toBe('Alexios')
    expect(s.villageois.find((v) => v.id === 'h1')).toBeUndefined()
    expect(s.pop).toBe(popAvant - 1)
    // et il ne renaît pas au battement suivant
    useGame.getState().tick()
    expect(useGame.getState().villageois).toHaveLength(popAvant - 1)
  })

  it('le couronnement referme la vacance et grave le règne', () => {
    regneVacant()
    useGame.getState().couronner('h2')
    const s = useGame.getState()
    expect(s.dynastie.vacanceDepuis).toBeNull()
    expect(s.dynastie.chef?.lignee).toBe('Bacchiades')
    expect(s.reports.some((r) => r.titre.includes('règne'))).toBe(true)
  })

  it('l’héritier arrive avec les traits qu’on lui avait montrés', () => {
    regneVacant()
    useGame.getState().couronner('h3')
    expect(useGame.getState().dynastie.chef?.traits).toEqual(traitsDe('h3'))
  })

  it('l’héritier garde son âge : il ne rajeunit pas en montant sur le trône', () => {
    const { jour, gens } = regneVacant()
    const avant = ageDe(gens[0], jour)
    useGame.getState().couronner('h1')
    expect(ageDuChef(useGame.getState().dynastie.chef!, jour)).toBe(avant)
  })

  it('on ne couronne pas un habitant que le panneau n’a pas présenté', () => {
    const { jour } = regneVacant()
    // un ancien, hors de la liste des prétendants
    const vieux = habitant('vieux', 'Néléos', 'Nélides', AGE_MAX_HERITIER + 10, jour)
    useGame.setState({ villageois: [...useGame.getState().villageois, vieux], pop: 4 })
    useGame.getState().couronner('vieux')
    expect(useGame.getState().dynastie.chef).toBeNull()
    expect(useGame.getState().dynastie.vacanceDepuis).not.toBeNull()
  })

  it('on ne couronne pas quand le trône est déjà tenu', () => {
    regneVacant()
    useGame.getState().couronner('h1')
    const chef = useGame.getState().dynastie.chef
    useGame.getState().couronner('h2')
    expect(useGame.getState().dynastie.chef).toEqual(chef)
  })
})

describe('le tempérament du chef se lit partout où il doit se lire', () => {
  function avecChef(traits: string[]) {
    const now = Date.now()
    const s = useGame.getState()
    useGame.setState({
      createdAt: now - 20 * DAY_MS,
      lastSeen: now,
      villageois: [],
      buildings: { ...s.buildings, ferme: { level: 3 }, remparts: { level: 3 }, agora: { level: 3 }, temple: { level: 2 } },
      dynastie: { chef: chefDe(40, 20, traits), vacanceDepuis: null, passes: [] },
      gods: { ...s.gods, zeus: { relation: 0, cooldownUntil: 0 } },
      moraleMods: [],
    })
    return now
  }

  it('le bâtisseur épaissit le mur, le guerrier ne l’épaissit pas', () => {
    avecChef(['batisseur'])
    const bat = murMax(useGame.getState())
    avecChef([])
    expect(bat).toBeGreaterThan(murMax(useGame.getState()))
  })

  it('le fils de la terre remplit les greniers, l’homme de guerre les vide', () => {
    const now = avecChef(['laboureur'])
    const labour = productionParMinute(useGame.getState(), now).grain
    avecChef(['guerrier'])
    expect(labour).toBeGreaterThan(productionParMinute(useGame.getState(), now).grain)
  })

  it('l’impie fait retomber Zeus le jour même, et cela se lit dans la relation EFFECTIVE', () => {
    avecChef(['impie'])
    const impie = relationEffective(useGame.getState(), 'zeus')
    avecChef([])
    expect(impie).toBeLessThan(relationEffective(useGame.getState(), 'zeus'))
    // la relation BRUTE, elle, n'a pas bougé : le chef n'emporte pas de points en mourant
    expect(useGame.getState().gods.zeus.relation).toBe(0)
  })

  it('l’aimé du peuple pèse sur l’ambiance sans qu’aucun modificateur ait été posé', () => {
    avecChef(['aime'])
    useGame.getState().tick()
    const aime = useGame.getState().morale
    avecChef(['dur'])
    useGame.getState().tick()
    expect(aime).toBeGreaterThan(useGame.getState().morale)
    // et rien n'a été ajouté à `moraleMods` : le calcul est dérivé, donc auto-entretenu
    expect(useGame.getState().moraleMods.some((m) => m.label.includes('chef'))).toBe(false)
  })
})

describe('la dynastie survit aux coutures du moteur', () => {
  it('une sauvegarde sans dynastie reprend avec un chef de son âge, pas un centenaire', () => {
    /*
     * LE BLOQUANT. `Object.assign(s, etatInitial(now), data)` : un fichier
     * antérieur garde le fondateur d'`etatInitial`, né au jour 1. Sur un village de
     * quarante journées, cela fait cent vingt ans - au-delà de l'âge limite, donc
     * mort au premier battement, et un interrègne que le joueur n'a pas provoqué.
     */
    const now = Date.now()
    const s = useGame.getState()
    const ancien: Record<string, unknown> = {}
    for (const k of ['resources', 'faveur', 'pop', 'buildings', 'villageois', 'army', 'gods', 'morale'] as const) {
      ancien[k] = s[k]
    }
    ancien.createdAt = now - 45 * DAY_MS
    ancien.lastSeen = now
    ancien.mode = 'bac-a-sable'
    localStorage.setItem('palladion-save-v1', JSON.stringify(ancien))
    useGame.getState().init()

    const d = useGame.getState().dynastie
    expect(d.chef).not.toBeNull()
    expect(d.vacanceDepuis).toBeNull()
    const age = ageDuChef(d.chef!, jourDe(useGame.getState()))
    expect(age).toBeLessThan(AGE_LIMITE)
    expect(age).toBeGreaterThanOrEqual(AGE_ADULTE)
    localStorage.clear()
  })

  it('un acte de campagne ne rajeunit pas le chef en nourrisson', () => {
    /*
     * `appliquerActe` remet `createdAt` au premier matin de sa saison : le jour
     * courant retombe, et `ageDe` rend ZÉRO dès que la naissance est postérieure au
     * jour courant. On préserve donc l'âge, qui est ce que le joueur voit.
     */
    const now = Date.now()
    useGame.setState({ createdAt: now - 40 * DAY_MS, lastSeen: now })
    const jour = jourDe(useGame.getState())
    useGame.setState({ dynastie: { chef: chefDe(48, jour), vacanceDepuis: null, passes: [] } })
    expect(ageDuChef(useGame.getState().dynastie.chef!, jour)).toBe(48)

    useGame.getState().choisirMode('campagne')
    useGame.getState().commencerActe()
    const apres = useGame.getState()
    const chef = apres.dynastie.chef
    expect(chef).not.toBeNull()
    // le mode a été rechoisi, donc c'est un fondateur neuf : il doit être adulte
    const age = ageDuChef(chef!, jourDe(apres))
    expect(age).toBeGreaterThanOrEqual(AGE_ADULTE)
    expect(age).toBeLessThan(AGE_LIMITE)
  })

  it('changer de mode ou abandonner la cité refonde la dynastie', () => {
    const now = Date.now()
    useGame.setState({
      createdAt: now - 20 * DAY_MS,
      lastSeen: now,
      dynastie: { chef: null, vacanceDepuis: 4, passes: [{ nom: 'X', lignee: 'Nélides', jours: 9, mortA: 72 }] },
    })
    useGame.getState().choisirMode('bac-a-sable')
    expect(useGame.getState().dynastie.passes).toEqual([])
    expect(useGame.getState().dynastie.chef).not.toBeNull()
  })

  it('la mémoire des règnes est bornée : une liste sauvegardée ne peut pas enfler', () => {
    const now = Date.now()
    const s = useGame.getState()
    useGame.setState({
      createdAt: now - 400 * DAY_MS,
      lastSeen: now - 400 * DAY_MS,
      dernierJourVecu: 1,
      army: AUCUNE,
      dynastie: {
        chef: { ...s.dynastie.chef!, neLe: -400, depuis: 1 },
        vacanceDepuis: null,
        passes: Array.from({ length: 12 }, (_, i) => ({ nom: `C${i}`, lignee: 'Nélides', jours: 3, mortA: 70 })),
      },
    })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    useGame.getState().tick()
    expect(useGame.getState().dynastie.passes.length).toBeLessThanOrEqual(12)
  })
})
