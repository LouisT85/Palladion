import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CLE_DEFIS,
  CONTRAINTES,
  MAX_ENTREES,
  MULT_PAR_POIDS,
  PRIME_OBJECTIF,
  aleaPose,
  classementLocal,
  creerAlea,
  creerAleaCompte,
  defiDeLaSemaine,
  dureteDe,
  enregistrerDefi,
  grainesSemaine,
  hasard,
  melanger,
  meilleurDefi,
  poserAlea,
  progressionObjectif,
  recordDefi,
  reglesDefi,
  scoreDefi,
  tirerContraintes,
  tirerEntier,
  tirerObjectif,
  type EntreeDefi,
  type SnapDefi,
} from './defi'

/*
 * LE DÉFI DE LA SEMAINE.
 *
 * Le mode ne tient que sur une promesse : LA MÊME SEMAINE DONNE LA MÊME PARTIE.
 * Tout ce qui suit la vérifie sous ses trois angles - le générateur rend deux
 * fois la même suite, la semaine ISO est calculée juste (y compris à cheval sur
 * l'an neuf), et le tirage des contraintes ne dépend de rien d'autre que de la
 * graine. Le reste - barèmes, classement - est testé par ses bornes.
 */

const snap = (champs: Partial<SnapDefi> = {}): SnapDefi => ({
  prestige: 400,
  repousses: 6,
  pop: 20,
  hautsFaits: 8,
  jour: 18,
  ...champs,
})

const entree = (champs: Partial<EntreeDefi> = {}): EntreeDefi => ({
  numero: 30,
  annee: 2026,
  semaine: 30,
  points: 1000,
  objectifAtteint: false,
  finiLe: 1_700_000_000_000,
  ...champs,
})

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  // un alea posé fuiterait sur les autres fichiers de test : le moteur entier
  // deviendrait déterministe sans que personne ne l'ait demandé
  poserAlea(null)
})

describe('le générateur', () => {
  it('rend deux fois la même suite pour une même graine', () => {
    const a = creerAlea(12345)
    const b = creerAlea(12345)
    const suiteA = Array.from({ length: 20 }, a)
    const suiteB = Array.from({ length: 20 }, b)
    expect(suiteA).toEqual(suiteB)
  })

  it('rend des suites différentes pour des graines voisines', () => {
    const a = Array.from({ length: 10 }, creerAlea(1))
    const b = Array.from({ length: 10 }, creerAlea(2))
    expect(a).not.toEqual(b)
  })

  it('tire dans [0, 1[ et couvre l’intervalle', () => {
    const alea = creerAlea(7)
    const tirages = Array.from({ length: 500 }, alea)
    for (const t of tirages) {
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThan(1)
    }
    expect(Math.min(...tirages)).toBeLessThan(0.05)
    expect(Math.max(...tirages)).toBeGreaterThan(0.95)
  })

  it('supporte la graine zéro sans se bloquer', () => {
    const alea = creerAlea(0)
    const a = alea()
    expect(a).not.toBe(alea())
  })

  it('brasse deux entiers voisins en deux graines lointaines', () => {
    expect(melanger(202632)).not.toBe(melanger(202633))
    expect(Math.abs(melanger(202632) - melanger(202633))).toBeGreaterThan(1000)
  })

  it('rend le même entier pour le même mélange', () => {
    expect(melanger(999)).toBe(melanger(999))
  })

  it('compte ses tirages et sait reprendre au milieu', () => {
    const suite = Array.from({ length: 10 }, creerAlea(4242))
    const a = creerAleaCompte(4242)
    for (let i = 0; i < 4; i++) a.alea()
    expect(a.compte()).toBe(4)
    // reprise après rechargement de page : la suite continue au même point
    const b = creerAleaCompte(4242, a.compte())
    expect([b.alea(), b.alea()]).toEqual([suite[4], suite[5]])
  })

  it('délègue à Math.random tant qu’aucun alea n’est posé', () => {
    expect(aleaPose()).toBe(false)
    const a = hasard()
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(1)
  })

  it('rend le hasard déterministe une fois l’alea posé, et le rend ensuite', () => {
    poserAlea(creerAlea(11))
    const attendu = Array.from({ length: 5 }, creerAlea(11))
    expect(Array.from({ length: 5 }, hasard)).toEqual(attendu)
    poserAlea(null)
    expect(aleaPose()).toBe(false)
  })

  it('tire des entiers bornés, bornes comprises', () => {
    const alea = creerAlea(3)
    const vus = new Set<number>()
    for (let i = 0; i < 200; i++) vus.add(tirerEntier(alea, 2, 3))
    expect([...vus].sort()).toEqual([2, 3])
    expect(tirerEntier(alea, 5, 5)).toBe(5)
  })
})

describe('la semaine ISO', () => {
  it('place le 1er janvier 2026, un jeudi, dans la semaine 1', () => {
    const g = grainesSemaine(new Date(2026, 0, 1))
    expect(g.annee).toBe(2026)
    expect(g.semaine).toBe(1)
    expect(g.numero).toBe(1)
  })

  it('donne la même graine à tous les jours d’une même semaine', () => {
    // lundi 3 août 2026 au dimanche 9 août
    const lundi = grainesSemaine(new Date(2026, 7, 3))
    const dimanche = grainesSemaine(new Date(2026, 7, 9))
    expect(dimanche.graine).toBe(lundi.graine)
    expect(dimanche.numero).toBe(lundi.numero)
  })

  it('change de graine au lundi suivant', () => {
    const avant = grainesSemaine(new Date(2026, 7, 9))
    const apres = grainesSemaine(new Date(2026, 7, 10))
    expect(apres.graine).not.toBe(avant.graine)
    expect(apres.numero).toBe(avant.numero + 1)
  })

  it('rattache le 1er janvier 2027, un vendredi, à la semaine 53 de 2026', () => {
    const g = grainesSemaine(new Date(2027, 0, 1))
    expect(g.annee).toBe(2026)
    expect(g.semaine).toBe(53)
    expect(g.numero).toBe(53)
  })

  it('numérote sans trou d’une année sur l’autre', () => {
    expect(grainesSemaine(new Date(2027, 0, 4)).numero).toBe(54)
  })
})

describe('les contraintes', () => {
  it('n’a pas deux contraintes du même identifiant, ni de poids nul', () => {
    expect(new Set(CONTRAINTES.map((c) => c.id)).size).toBe(CONTRAINTES.length)
    for (const c of CONTRAINTES) {
      expect(c.poids).toBeGreaterThan(0)
      expect(Object.keys(c.effet).length).toBeGreaterThan(0)
    }
  })

  it('en tire deux ou trois, jamais deux de la même famille', () => {
    for (let g = 0; g < 200; g++) {
      const prises = tirerContraintes(creerAlea(melanger(g)))
      expect(prises.length).toBeGreaterThanOrEqual(2)
      expect(prises.length).toBeLessThanOrEqual(3)
      expect(new Set(prises.map((c) => c.famille)).size).toBe(prises.length)
    }
  })

  it('tire toujours les mêmes pour une graine donnée', () => {
    const a = tirerContraintes(creerAlea(555)).map((c) => c.id)
    const b = tirerContraintes(creerAlea(555)).map((c) => c.id)
    expect(a).toEqual(b)
  })

  it('finit par proposer chaque contrainte de la table', () => {
    const vues = new Set<string>()
    for (let g = 0; g < 400; g++) for (const c of tirerContraintes(creerAlea(melanger(g)))) vues.add(c.id)
    expect(vues.size).toBe(CONTRAINTES.length)
  })

  it('additionne les poids en une dureté', () => {
    expect(dureteDe([])).toBe(0)
    const deux = CONTRAINTES.slice(0, 2)
    expect(dureteDe(deux)).toBe(deux[0].poids + deux[1].poids)
  })
})

describe('les règles fusionnées', () => {
  it('ne retire rien quand il n’y a pas de contrainte', () => {
    expect(reglesDefi([])).toEqual({
      batimentsInterdits: [],
      toursMax: null,
      menaceMult: 1,
      productionMult: 1,
      saisonFixe: null,
      popMax: null,
      sansHeros: false,
      sansExpeditions: false,
      sansBenediction: false,
      sansDilemmes: false,
    })
  })

  it('cumule interdits, plafonds et multiplicateurs', () => {
    const r = reglesDefi(
      CONTRAINTES.filter((c) => ['sans-port', 'menace-doublee', 'une-seule-tour', 'terre-ingrate'].includes(c.id)),
    )
    expect(r.batimentsInterdits).toEqual(['port'])
    expect(r.menaceMult).toBe(2)
    expect(r.toursMax).toBe(1)
    expect(r.productionMult).toBeCloseTo(0.8)
  })

  it('retient le plafond le plus sévère et la saison figée', () => {
    const clos = CONTRAINTES.find((c) => c.id === 'village-clos')!
    const hiver = CONTRAINTES.find((c) => c.id === 'hiver-perpetuel')!
    const r = reglesDefi([clos, hiver, { ...clos, id: 'plus-clos', effet: { popMax: 9 } }])
    expect(r.popMax).toBe(9)
    expect(r.saisonFixe).toBe('hiver')
  })

  it('lève les interdits qui n’ont pas de valeur', () => {
    const r = reglesDefi(CONTRAINTES.filter((c) => ['sans-heros', 'sans-expeditions', 'sans-dilemmes'].includes(c.id)))
    expect(r.sansHeros).toBe(true)
    expect(r.sansExpeditions).toBe(true)
    expect(r.sansDilemmes).toBe(true)
    expect(r.sansBenediction).toBe(false)
  })
})

describe('l’objectif', () => {
  it('demande toujours quelque chose d’atteignable', () => {
    for (let g = 0; g < 100; g++) {
      const alea = creerAlea(melanger(g))
      const contraintes = tirerContraintes(alea)
      const o = tirerObjectif(alea, contraintes)
      expect(o.cible).toBeGreaterThan(0)
      expect(o.label.length).toBeGreaterThan(3)
    }
  })

  it('abaisse la barre quand la semaine est dure', () => {
    const dure = CONTRAINTES.filter((c) => ['menace-doublee', 'hiver-perpetuel', 'terre-ingrate'].includes(c.id))
    const cibleDouce = tirerObjectif(creerAlea(9), []).cible
    const cibleDure = tirerObjectif(creerAlea(9), dure).cible
    expect(cibleDure).toBeLessThan(cibleDouce)
  })

  it('arrondit un objectif de prestige à un chiffre rond', () => {
    for (let g = 0; g < 60; g++) {
      const o = tirerObjectif(creerAlea(melanger(g)), CONTRAINTES.slice(0, 2))
      if (o.type === 'prestige') expect(o.cible % 25).toBe(0)
    }
  })
})

describe('le défi de la semaine', () => {
  const lundi = new Date(2026, 7, 3)

  it('est une fonction pure de la date', () => {
    expect(defiDeLaSemaine(lundi)).toEqual(defiDeLaSemaine(new Date(2026, 7, 8)))
  })

  it('change de contraintes ou d’objectif d’une semaine à l’autre', () => {
    const a = defiDeLaSemaine(lundi)
    const b = defiDeLaSemaine(new Date(2026, 7, 10))
    expect(a.graine).not.toBe(b.graine)
    const memeDefi =
      a.contraintes.map((c) => c.id).join() === b.contraintes.map((c) => c.id).join() &&
      a.objectif.cible === b.objectif.cible &&
      a.objectif.type === b.objectif.type
    expect(memeDefi).toBe(false)
  })

  it('majore le score de la dureté de la semaine', () => {
    const d = defiDeLaSemaine(lundi)
    expect(d.mult).toBeCloseTo(1 + d.durete * MULT_PAR_POIDS)
    expect(d.description).toContain(d.contraintes[0].nom.toLowerCase())
  })
})

describe('le score', () => {
  const defi = defiDeLaSemaine(new Date(2026, 7, 3))

  it('monte avec le règne', () => {
    const petit = scoreDefi(snap({ prestige: 100, repousses: 1, pop: 8, hautsFaits: 1, jour: 4 }), defi)
    const grand = scoreDefi(snap({ prestige: 1200, repousses: 22, pop: 44, hautsFaits: 30, jour: 60 }), defi)
    expect(grand.points).toBeGreaterThan(petit.points)
  })

  it('détaille son calcul, sans ligne négative', () => {
    const s = scoreDefi(snap(), defi)
    expect(s.detail.length).toBe(5)
    for (const d of s.detail) expect(d.points).toBeGreaterThanOrEqual(0)
  })

  it('paie la prime quand l’objectif est atteint', () => {
    const o = defi.objectif
    const juste = o.type === 'assauts' ? { repousses: o.cible } : o.type === 'prestige' ? { prestige: o.cible } : { pop: o.cible }
    const manque =
      o.type === 'assauts' ? { repousses: o.cible - 1 } : o.type === 'prestige' ? { prestige: o.cible - 1 } : { pop: o.cible - 1 }
    const atteint = scoreDefi(snap({ ...juste }), defi)
    const rate = scoreDefi(snap({ ...manque }), defi)
    expect(atteint.objectifAtteint).toBe(true)
    expect(rate.objectifAtteint).toBe(false)
    expect(atteint.mult).toBeCloseTo(defi.mult * (1 + PRIME_OBJECTIF))
  })

  it('borne la progression entre zéro et un', () => {
    expect(progressionObjectif(snap({ prestige: 0, repousses: 0, pop: 0 }), defi.objectif)).toBe(0)
    expect(progressionObjectif(snap({ prestige: 99_999, repousses: 999, pop: 999 }), defi.objectif)).toBe(1)
  })

  it('ne rend jamais de points négatifs, même sur un règne absurde', () => {
    const s = scoreDefi({ prestige: -50, repousses: -3, pop: -10, hautsFaits: -1, jour: -5 }, defi)
    expect(s.points).toBe(0)
  })
})

describe('le classement local', () => {
  it('est vide au départ, et sur un stockage illisible', () => {
    expect(classementLocal()).toEqual([])
    localStorage.setItem(CLE_DEFIS, 'pas du json')
    expect(classementLocal()).toEqual([])
  })

  it('garde une seule ligne par semaine, la meilleure', () => {
    enregistrerDefi(entree({ numero: 30, points: 1500 }))
    enregistrerDefi(entree({ numero: 30, points: 900 }))
    const l = classementLocal()
    expect(l.length).toBe(1)
    expect(l[0].points).toBe(1500)
  })

  it('remplace quand on fait mieux', () => {
    enregistrerDefi(entree({ numero: 31, points: 900 }))
    enregistrerDefi(entree({ numero: 31, points: 2400, objectifAtteint: true }))
    expect(meilleurDefi(31)?.points).toBe(2400)
    expect(meilleurDefi(31)?.objectifAtteint).toBe(true)
  })

  it('classe du plus récent au plus ancien', () => {
    enregistrerDefi(entree({ numero: 28 }))
    enregistrerDefi(entree({ numero: 32 }))
    enregistrerDefi(entree({ numero: 30 }))
    expect(classementLocal().map((e) => e.numero)).toEqual([32, 30, 28])
  })

  it('oublie les semaines les plus vieilles au-delà de la limite', () => {
    for (let i = 1; i <= MAX_ENTREES + 6; i++) enregistrerDefi(entree({ numero: i, points: 100 + i }))
    const l = classementLocal()
    expect(l.length).toBe(MAX_ENTREES)
    expect(l[l.length - 1].numero).toBe(MAX_ENTREES + 6 - MAX_ENTREES + 1)
  })

  it('dit le record toutes semaines confondues', () => {
    expect(recordDefi()).toBeNull()
    enregistrerDefi(entree({ numero: 10, points: 800 }))
    enregistrerDefi(entree({ numero: 11, points: 3200 }))
    enregistrerDefi(entree({ numero: 12, points: 1200 }))
    expect(recordDefi()?.numero).toBe(11)
  })

  it('ne rend aucun meilleur score pour une semaine jamais jouée', () => {
    expect(meilleurDefi(404)).toBeNull()
  })
})
