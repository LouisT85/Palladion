import { describe, expect, it } from 'vitest'
import { AGE_ADULTE, AGE_ANCIEN, ANS_PAR_JOUR } from './lignees'
import {
  CAS_MAX_PAR_JOUR,
  COUTS_LAZARET,
  EFFICACITE_FIEVREUX,
  GRAIN_PAR_LIT,
  JOURS_FIEVRE,
  JOURS_MAX,
  LAZARET_MAX,
  LITS_LAZARET,
  MORALE_MAX,
  REPIT_JOURS,
  SOIN_MAX,
  SOUCHES,
  SOUCHE_IDS,
  choisirCible,
  coutLazaret,
  efficaciteMalade,
  entassement,
  epidemieActive,
  estContagieux,
  estGueri,
  estMalade,
  etatSanitaire,
  fragiliteAge,
  hygiene,
  litsLibres,
  litsOccupes,
  litsTotal,
  malades,
  moraleFievre,
  motifAliter,
  porteOuverte,
  premiersCas,
  pressionContagion,
  pronostic,
  refusAliter,
  resoudreAbsence,
  resoudreJournee,
  risqueEntreeJournee,
  risqueMortJour,
  risquePorte,
  soinDe,
  type EtatEpidemie,
  type Habitant,
  type SnapEpidemie,
} from './epidemies'

/*
 * ═══════════════ LA FIÈVRE : CE QUE CES TESTS TIENNENT ═══════════════
 *
 * Ce sont des PROMESSES DE JEU, et chacune répond à une façon dont ce système
 * pouvait être injouable ou injuste :
 *
 *  1. « On ne meurt jamais le jour où l'on tombe malade. » Sans cela le joueur
 *     apprendrait qu'il a une épidémie en lisant l'avis de décès, et le lazaret
 *     ne servirait qu'à la fièvre suivante.
 *  2. « Un malade coûte quelque chose tout de suite. » Sans cela, attendre
 *     serait toujours le meilleur coup, et la maladie ne serait qu'un dé de
 *     mortalité.
 *  3. « Un lit sauve, et il se paie. » Les deux ensemble, sinon ce n'est pas une
 *     décision.
 *  4. « Elle finit. » Bornée par malade (trois journées) ET par épidémie (six),
 *     avec des relevés qu'on ne reprend pas : une fièvre qui pourrait tourner
 *     indéfiniment serait un état permanent, pas un événement.
 *  5. « Une nuit d'absence n'expédie pas soixante journées de contagion. »
 *  6. « Un village qui garde de la marge dans ses maisons n'engendre pas sa
 *     propre peste. » C'est la récompense d'une dépense qu'on reporte toujours.
 *
 * TOUS les tirages sont donnés à la main : `tirer()` est une file de nombres.
 * Une épidémie testée avec `Math.random()` aurait été un test qui passe quatre
 * fois sur cinq, c'est-à-dire un test qui ne tient rien.
 */

/** une file de tirages : on donne exactement ce que la journée va consommer */
function des(...valeurs: number[]): () => number {
  let i = 0
  // au-delà de la file, on rend 0,999 : aucun seuil de probabilité ne le passe,
  // donc « plus rien ne se produit » - un défaut lisible, jamais un hasard
  return () => (i < valeurs.length ? valeurs[i++] : 0.999)
}

function habitant(id: string, age: number, jour = 10, o: Partial<Habitant> = {}): Habitant {
  return {
    id,
    nom: id,
    metier: 'ferme',
    poste: 'ferme',
    neLe: jour - age / ANS_PAR_JOUR,
    lignee: 'Nélides',
    ...o,
  }
}

function malade(id: string, age: number, depuis: number, alite = false, jour = 10): Habitant {
  return habitant(id, age, jour, { malade: { depuis, alite } })
}

const EPIDEMIE: EtatEpidemie = {
  souche: 'camp',
  jourEntree: 10,
  jourResolu: 10,
  cas: 2,
  morts: 0,
  gueris: 0,
}

function snap(o: Partial<SnapEpidemie> = {}): SnapEpidemie {
  return {
    jour: 11,
    saison: 'printemps',
    pop: 20,
    popCap: 22,
    grain: 400,
    morale: 55,
    lazaret: 0,
    medecine: 0,
    soigneurs: 0,
    villageois: [],
    epidemie: EPIDEMIE,
    ...o,
  }
}

describe('la fièvre ne tue personne le jour où elle le prend', () => {
  it('un homme pris aujourd’hui traverse la journée, quel que soit le tirage', () => {
    /*
     * Le tirage est 0 : la mort est certaine pour quiconque peut mourir. Celui
     * qui vient d'être pris ne doit pas figurer parmi les morts - c'est la
     * garantie qui donne au joueur une journée pleine (huit minutes réelles)
     * pour ouvrir le panneau et trier.
     */
    const s = snap({ jour: 11, villageois: [malade('a', 30, 11)] })
    const out = resoudreJournee(s, des(0, 0, 0, 0))
    expect(out.morts).toEqual([])
    expect(out.gueris).toEqual([])
  })

  it('il ne contamine personne non plus le premier jour : la fièvre incube', () => {
    const v = malade('a', 30, 11)
    expect(estContagieux(v, 11)).toBe(false)
    expect(estContagieux(v, 12)).toBe(true)
  })

  it('mais dès le lendemain, le tirage le concerne', () => {
    const s = snap({ jour: 12, villageois: [malade('a', 30, 11)] })
    expect(resoudreJournee(s, des(0)).morts).toEqual(['a'])
  })
})

describe('un malade coûte quelque chose avant de mourir', () => {
  it('debout, il ne rend plus qu’un tiers à son poste', () => {
    expect(efficaciteMalade(malade('a', 30, 10))).toBe(EFFICACITE_FIEVREUX)
    expect(EFFICACITE_FIEVREUX).toBeLessThan(0.5)
  })

  it('couché, il ne rend rien du tout - c’est le prix du lit', () => {
    expect(efficaciteMalade(malade('a', 30, 10, true))).toBe(0)
  })

  it('relevé, il rend de nouveau plein', () => {
    const v = habitant('a', 30, 10, { malade: { depuis: 8, alite: false, gueriLe: 10 } })
    expect(efficaciteMalade(v)).toBe(1)
    expect(estMalade(v)).toBe(false)
    expect(estGueri(v)).toBe(true)
  })

  it('chaque lit occupé mange du grain, tous les jours', () => {
    const s = snap({ jour: 12, villageois: [malade('a', 30, 11, true), malade('b', 30, 11, true)] })
    expect(resoudreJournee(s, des()).coutGrain).toBe(2 * GRAIN_PAR_LIT)
  })

  it('la fièvre pèse sur l’ambiance, et le poids plafonne', () => {
    expect(moraleFievre(1)).toBe(-2)
    expect(moraleFievre(4)).toBe(-8)
    expect(moraleFievre(40)).toBe(-MORALE_MAX)
  })
})

describe('un lit sauve, et sans grain il ne sauve plus rien', () => {
  it('coucher un malade divise son risque de mourir', () => {
    const s = snap({ lazaret: 3, soigneurs: 2, medecine: 0.1 })
    const debout = risqueMortJour(malade('a', 30, 10), s)
    const couche = risqueMortJour(malade('a', 30, 10, true), s)
    expect(couche).toBeLessThan(debout / 3)
  })

  it('le soin plafonne : on ne guérit pas la peste à l’âge du bronze', () => {
    expect(soinDe({ lazaret: 3, soigneurs: 3, medecine: 0.5, grain: 400 })).toBe(SOIN_MAX)
  })

  it('greniers vides, le lazaret ne soigne plus : ni bouillon, ni linge bouilli', () => {
    expect(soinDe({ lazaret: 3, soigneurs: 3, medecine: 0.3, grain: 0 })).toBe(0)
    const s = snap({ lazaret: 3, soigneurs: 3, grain: 0 })
    expect(risqueMortJour(malade('a', 30, 10, true), s)).toBe(risqueMortJour(malade('a', 30, 10), s))
  })

  it('sans lazaret, aucun soin - un lit est un bâtiment, pas une intention', () => {
    expect(soinDe({ lazaret: 0, soigneurs: 3, medecine: 0.3, grain: 400 })).toBe(0)
  })
})

describe('les lits sont moins nombreux que les malades : c’est le triage', () => {
  it('le lazaret ne peut jamais coucher tout un village', () => {
    expect(litsTotal(LAZARET_MAX)).toBeLessThan(20)
    expect(LITS_LAZARET).toEqual([0, 3, 6, 10])
  })

  it('un lazaret plein refuse le lit suivant, et le dit', () => {
    const s = snap({
      lazaret: 1,
      villageois: [malade('a', 30, 10, true), malade('b', 30, 10, true), malade('c', 30, 10, true), malade('d', 30, 10)],
    })
    expect(litsOccupes(s.villageois)).toBe(3)
    expect(litsLibres(s)).toBe(0)
    expect(refusAliter(s, 'd')).toBe('complet')
    expect(motifAliter('complet')).toContain('renvoyer')
  })

  it('sans lazaret, le refus enseigne où l’on ouvre des lits', () => {
    const s = snap({ lazaret: 0, villageois: [malade('a', 30, 10)] })
    expect(refusAliter(s, 'a')).toBe('pas-de-lazaret')
    expect(motifAliter('pas-de-lazaret')).toContain('temple')
  })

  it('on ne couche ni un bien-portant ni un relevé', () => {
    const s = snap({
      lazaret: 2,
      villageois: [habitant('sain', 30), habitant('releve', 30, 10, { malade: { depuis: 8, alite: false, gueriLe: 10 } })],
    })
    expect(refusAliter(s, 'sain')).toBe('pas-malade')
    expect(refusAliter(s, 'releve')).toBe('gueri')
  })

  it('le lazaret s’achète au prix d’une tour d’archers - des murs, ou des lits', () => {
    expect(COUTS_LAZARET).toHaveLength(LAZARET_MAX)
    expect(coutLazaret(0)).toEqual({ bois: 140, pierre: 40 })
    expect(coutLazaret(LAZARET_MAX)).toBeNull()
  })
})

describe('coucher un malade le retire de la contagion', () => {
  it('deux fiévreux debout donnent la fièvre ; les mêmes couchés ne la donnent plus', () => {
    const debout = [malade('a', 30, 10), malade('b', 30, 10), habitant('c', 30), habitant('d', 30), habitant('e', 30)]
    const couches = [malade('a', 30, 10, true), malade('b', 30, 10, true), habitant('c', 30), habitant('d', 30), habitant('e', 30)]
    // 0,9 pour survivre, 0,9 pour ne pas guérir, 0 pour que la part décimale passe
    const avecDebout = resoudreJournee(snap({ jour: 11, villageois: debout }), des(0.9, 0.9, 0.9, 0.9, 0, 0.1, 0.1))
    const avecCouches = resoudreJournee(snap({ jour: 11, villageois: couches }), des(0.9, 0.9, 0.9, 0.9, 0, 0.1, 0.1))
    expect(avecDebout.nouveaux.length).toBeGreaterThan(0)
    expect(avecCouches.nouveaux).toEqual([])
  })
})

describe('la contagion suit des conditions qu’on peut changer', () => {
  const base = snap({ villageois: [] })

  it('un village entassé dans ses maisons la propage plus vite', () => {
    expect(entassement(22, 22)).toBeGreaterThan(entassement(11, 22))
  })

  it('l’hiver la porte, l’automne la freine', () => {
    expect(pressionContagion({ ...base, saison: 'hiver' })).toBeGreaterThan(
      pressionContagion({ ...base, saison: 'automne' }),
    )
  })

  it('les greniers vides et le moral bas l’aggravent tous les deux', () => {
    expect(pressionContagion({ ...base, grain: 0 })).toBeGreaterThan(pressionContagion(base))
    expect(pressionContagion({ ...base, morale: 10 })).toBeGreaterThan(pressionContagion(base))
  })

  it('le lazaret et la médecine la freinent, sans jamais l’arrêter tout à fait', () => {
    expect(hygiene({ lazaret: 0, medecine: 0 })).toBe(0)
    expect(pressionContagion({ ...base, lazaret: 3, medecine: 0.3 })).toBeLessThan(pressionContagion(base))
    expect(hygiene({ lazaret: 3, medecine: 1 })).toBeLessThanOrEqual(0.6)
    expect(pressionContagion({ ...base, lazaret: 3, medecine: 1 })).toBeGreaterThan(0)
  })

  it('jamais plus de trois nouveaux cas par journée : le triage doit rester jouable', () => {
    const foule: Habitant[] = []
    for (let i = 0; i < 10; i++) foule.push(malade(`m${i}`, 30, 10))
    for (let i = 0; i < 20; i++) foule.push(habitant(`s${i}`, 30))
    // tous survivent et aucun ne guérit, puis la contagion s'emballe
    const tirages: number[] = []
    for (let i = 0; i < 10; i++) tirages.push(0.9, 0.9)
    const out = resoudreJournee(snap({ jour: 11, saison: 'hiver', grain: 0, villageois: foule }), des(...tirages))
    expect(out.nouveaux.length).toBe(CAS_MAX_PAR_JOUR)
  })
})

describe('elle prend d’abord les faibles - donc les métiers qui s’éteignent', () => {
  it('un enfant et un ancien meurent plus qu’un homme dans la force de l’âge', () => {
    expect(fragiliteAge(8)).toBeGreaterThan(fragiliteAge(30))
    expect(fragiliteAge(AGE_ANCIEN + 4)).toBeGreaterThan(fragiliteAge(AGE_ADULTE + 4))
    const s = snap({})
    expect(risqueMortJour(malade('vieux', 70, 10), s)).toBeGreaterThan(risqueMortJour(malade('homme', 30, 10), s))
  })

  it('entre deux candidats, la fièvre garde le plus fragile', () => {
    const gens = [habitant('adulte', 30), habitant('ancien', 70)]
    // les deux tirages désignent l'index 0 puis l'index 1 : c'est l'ancien qui tombe
    expect(choisirCible(gens, 10, des(0, 0.9))?.id).toBe('ancien')
    expect(choisirCible([], 10, des(0))).toBeNull()
  })

  it('le premier cas passe par la porte : la fièvre des quais prend un docker', () => {
    const gens = [habitant('paysan', 30), habitant('docker', 30, 10, { poste: 'port', metier: 'port' })]
    expect(premiersCas(snap({ villageois: gens }), 'convoi', des(0, 0))).toEqual(['docker'])
  })

  it('le dilemme peut forcer le nombre de premiers cas - c’est ce qu’il décide', () => {
    const gens = [habitant('a', 30), habitant('b', 30), habitant('c', 30), habitant('d', 30)]
    expect(premiersCas(snap({ villageois: gens }), 'camp', des(0.1, 0.1, 0.3, 0.3, 0.6, 0.6), 3)).toHaveLength(3)
    expect(premiersCas(snap({ villageois: gens }), 'camp', des(0.1, 0.1), 1)).toHaveLength(1)
  })

  it('et elle ne reprend jamais un relevé, ni un malade', () => {
    const gens = [
      malade('malade', 30, 10),
      habitant('releve', 30, 10, { malade: { depuis: 8, alite: false, gueriLe: 10 } }),
      habitant('sain', 30),
    ]
    expect(premiersCas(snap({ villageois: gens }), 'entassement', des(0, 0, 0, 0))).toEqual(['sain'])
  })
})

describe('elle finit - c’est un événement, pas un état', () => {
  it('trois journées de fièvre et l’on se relève, soigné ou non', () => {
    const s = snap({ jour: 10 + JOURS_FIEVRE, villageois: [malade('a', 30, 10)] })
    // 0,9 : il ne meurt pas. Aucun tirage de guérison n'est consommé, la fièvre est tombée
    const out = resoudreJournee(s, des(0.9))
    expect(out.gueris).toEqual(['a'])
    expect(out.finie).toBe(true)
  })

  it('au bout de six journées, elle est éteinte même si des gens sont encore couchés', () => {
    const s = snap({ jour: 10 + JOURS_MAX, villageois: [malade('a', 30, 15), malade('b', 30, 15), habitant('c', 30)] })
    const out = resoudreJournee(s, des(0, 0, 0, 0))
    expect(out.morts).toEqual([])
    expect(out.gueris).toEqual(['a', 'b'])
    expect(out.nouveaux).toEqual([])
    expect(out.finie).toBe(true)
    expect(out.lignes.join(' ')).toContain('tour du village')
  })

  it('le dernier malade relevé, la fièvre est finie', () => {
    const s = snap({ jour: 12, villageois: [malade('a', 30, 11)] })
    const out = resoudreJournee(s, des(0.9, 0))
    expect(out.gueris).toEqual(['a'])
    expect(out.finie).toBe(true)
  })

  it('une fièvre éteinte n’est plus active, et le village a droit à un répit', () => {
    const finie: EtatEpidemie = { ...EPIDEMIE, finLe: 14 }
    expect(epidemieActive(finie)).toBe(false)
    expect(epidemieActive(EPIDEMIE)).toBe(true)
    expect(porteOuverte(finie, 14 + REPIT_JOURS - 1)).toBe(false)
    expect(porteOuverte(finie, 14 + REPIT_JOURS)).toBe(true)
    expect(porteOuverte(null, 1)).toBe(true)
    // et pendant qu'elle brûle, aucune seconde fièvre ne s'invite
    expect(porteOuverte(EPIDEMIE, 40)).toBe(false)
  })

  it('deux résolutions le même jour ne comptent qu’une fois', () => {
    // `jourResolu` valant 10, la journée 10 ne doit plus rien produire : le
    // crochet quotidien peut être rappelé sans que la fièvre avance deux fois
    const s = snap({ jour: 10, villageois: [malade('a', 30, 8)] })
    expect(resoudreJournee(s, des(0)).morts).toEqual([])
  })
})

describe('une nuit d’absence n’expédie pas soixante journées de contagion', () => {
  it('la fièvre est menée à son terme, jamais au-delà, et c’est fini', () => {
    const gens = [malade('a', 30, 10), malade('b', 30, 10), malade('c', 30, 10)]
    // le premier meurt au premier tirage (0), les deux autres passent tout
    const out = resoudreAbsence(snap({ jour: 70, villageois: gens }), des(0, 0.9, 0.9))
    expect(out.morts).toEqual(['a'])
    expect(out.gueris).toEqual(['b', 'c'])
    expect(out.nouveaux).toEqual([])
    expect(out.finie).toBe(true)
    expect(out.lignes[0]).toContain('absence')
  })

  it('elle ne joue que les journées qui lui RESTAIENT, pas les soixante du calendrier', () => {
    /*
     * `jourResolu` valant 12 et la fièvre ayant pris cet homme au jour 10, il a
     * déjà passé deux journées : il ne lui en reste qu'UNE. Un seul tirage doit
     * donc être consommé - le second de la file ne doit jamais être lu, sinon
     * l'absence rejouerait des journées que le joueur n'a pas vécues.
     */
    const e: EtatEpidemie = { ...EPIDEMIE, jourResolu: 12 }
    const un = des(0.9, 0)
    const out = resoudreAbsence(snap({ jour: 70, epidemie: e, villageois: [malade('a', 30, 10)] }), un)
    expect(out.morts).toEqual([])
    expect(out.gueris).toEqual(['a'])
  })

  it('celui qui avait déjà fait ses trois journées se relève sans un tirage', () => {
    const e: EtatEpidemie = { ...EPIDEMIE, jourEntree: 10, jourResolu: 13 }
    // la file ne contient QUE des morts certaines : aucune ne doit être lue
    const out = resoudreAbsence(snap({ jour: 70, epidemie: e, villageois: [malade('a', 30, 10)] }), des(0, 0, 0))
    expect(out.morts).toEqual([])
    expect(out.gueris).toEqual(['a'])
  })

  it('⚠️ fermer l’onglet ne guérit personne : celui qu’on avait couché s’en tire, l’autre non', () => {
    /*
     * C'EST L'EXPLOIT QUE CE TEST FERME. Si une absence ne coûtait qu'un seul
     * tirage par malade, quitter le jeu au premier bûcher serait devenu le
     * meilleur remède : on revenait dix minutes plus tard, fièvre éteinte,
     * lazaret jamais bâti. Le triage fait AVANT de partir doit rester la seule
     * chose qui compte - et donc se voir dans les morts.
     */
    const soigne = snap({ jour: 70, lazaret: 3, soigneurs: 3, medecine: 0.2 })
    // le MÊME tirage pour les deux : seule la décision du joueur les sépare
    const meme = () => 0.1
    const debout = resoudreAbsence({ ...soigne, villageois: [malade('a', 30, 10)] }, meme)
    const couche = resoudreAbsence({ ...soigne, villageois: [malade('a', 30, 10, true)] }, meme)
    expect(debout.morts).toEqual(['a'])
    expect(couche.morts).toEqual([])
    // et le bouillon des lits a bien été prélevé pour les journées passées
    expect(couche.coutGrain).toBe(JOURS_FIEVRE * GRAIN_PAR_LIT)
    expect(debout.coutGrain).toBe(0)
  })

  it('⚠️ le retour ne vieillit pas les malades de cent vingt ans', () => {
    /*
     * Huit heures hors ligne avancent le calendrier de soixante journées, soit
     * cent vingt ans de vie. Lu au jour du RETOUR, un homme de trente ans serait
     * un ancien (fragilité 2,2) et l'horloge à elle seule doublerait la
     * mortalité. Le risque doit être le même qu'à la journée où il est tombé.
     */
    const v = malade('a', 30, 10)
    const auJour = risqueMortJour(v, snap({ jour: 11 }))
    const auRetour = risqueMortJour(v, snap({ jour: 70 }))
    expect(auRetour).toBe(auJour)
  })

  it('sans fièvre en cours, le retour ne produit rien', () => {
    const out = resoudreAbsence(snap({ epidemie: null }), des(0))
    expect(out.finie).toBe(false)
    expect(out.morts).toEqual([])
  })
})

describe('on peut la voir venir, et l’empêcher de naître chez soi', () => {
  it('un village qui garde de la marge dans ses maisons n’engendre pas sa peste', () => {
    const large = snap({ pop: 14, popCap: 22, epidemie: null })
    expect(risqueEntreeJournee(large)).toBe(0)
    expect(etatSanitaire(large).cle).toBe('sain')
  })

  it('plein à craquer, en hiver, greniers vides : le risque devient lisible et nommé', () => {
    const serre = snap({ pop: 22, popCap: 22, saison: 'hiver', grain: 0, morale: 20, epidemie: null })
    expect(risqueEntreeJournee(serre)).toBeGreaterThan(0.05)
    const etat = etatSanitaire(serre)
    expect(etat.cle).toBe('alarmant')
    expect(etat.causes.join(' ')).toContain('à l’étroit')
    expect(etat.causes.join(' ')).toContain('greniers')
    expect(etat.causes.join(' ')).toContain('lazaret')
  })

  it('le lazaret fait baisser le risque qu’elle naisse ET qu’elle entre', () => {
    const nu = snap({ pop: 22, popCap: 22, epidemie: null })
    const soigne = { ...nu, lazaret: 3, medecine: 0.2 }
    expect(risqueEntreeJournee(soigne)).toBeLessThan(risqueEntreeJournee(nu))
    for (const s of SOUCHE_IDS) {
      expect(risquePorte(s, soigne)).toBeLessThanOrEqual(risquePorte(s, nu))
    }
  })

  it('⚠️ pendant le répit, « sain » ne veut pas dire « des maisons suffisantes »', () => {
    /*
     * `risqueEntreeJournee` rend zéro tant que la porte est fermée. Un village
     * entassé jusqu'au toit se lisait donc « sain » les huit journées de répit,
     * le joueur en concluait que ses maisons suffisaient, et la fièvre revenait
     * sur un village qu'il n'avait pas agrandi. Le répit doit être NOMMÉ.
     */
    const serre = snap({
      jour: 16,
      pop: 22,
      popCap: 22,
      epidemie: { ...EPIDEMIE, finLe: 14 },
    })
    expect(risqueEntreeJournee(serre)).toBe(0)
    const etat = etatSanitaire(serre)
    expect(etat.causes[0]).toContain('aucune fièvre ne peut entrer')
    expect(etat.causes.join(' ')).toContain('à l’étroit')
  })

  it('aucune porte ne s’ouvre tant qu’une fièvre brûle - une seule à la fois', () => {
    const s = snap({ pop: 22, popCap: 22, saison: 'hiver', grain: 0 })
    expect(risqueEntreeJournee(s)).toBe(0)
    expect(risquePorte('convoi', s)).toBe(0)
  })
})

describe('les quatre souches ne se jouent pas pareil', () => {
  it('la plus contagieuse n’est pas la plus mortelle', () => {
    const parVirulence = [...SOUCHE_IDS].sort((a, b) => SOUCHES[b].virulence - SOUCHES[a].virulence)
    const parMortalite = [...SOUCHE_IDS].sort((a, b) => SOUCHES[b].mortalite - SOUCHES[a].mortalite)
    expect(parVirulence[0]).not.toBe(parMortalite[0])
  })

  it('chacune nomme sa porte et la leçon qu’on en tire', () => {
    for (const id of SOUCHE_IDS) {
      const d = SOUCHES[id]
      expect(d.porte.length).toBeGreaterThan(10)
      expect(d.lecon.length).toBeGreaterThan(10)
      expect(d.premiersCas).toBeGreaterThan(0)
      expect(d.recit.length).toBeGreaterThan(1)
    }
  })

  it('la fièvre du camp tue plus que celle des quais - le charnier contre le ballot', () => {
    const s = snap({})
    const camp = risqueMortJour(malade('a', 30, 10), { ...s, epidemie: { ...EPIDEMIE, souche: 'camp' } })
    const quais = risqueMortJour(malade('a', 30, 10), { ...s, epidemie: { ...EPIDEMIE, souche: 'convoi' } })
    expect(camp).toBeGreaterThan(quais * 1.5)
  })
})

describe('le panneau peut tout dire sans mentir', () => {
  it('le pronostic suit le risque réel, et le lit le fait changer', () => {
    const s = snap({ lazaret: 3, soigneurs: 2, medecine: 0.2 })
    const vieux = malade('v', 74, 10)
    const vieuxCouche = malade('v', 74, 10, true)
    expect(pronostic(vieux, s)).toBe('il peut ne pas voir demain')
    expect(pronostic(vieuxCouche, s)).not.toBe('il peut ne pas voir demain')
  })

  it('la liste des malades ne contient ni les sains ni les relevés', () => {
    const gens = [
      malade('a', 30, 10),
      habitant('b', 30),
      habitant('c', 30, 10, { malade: { depuis: 8, alite: false, gueriLe: 10 } }),
    ]
    expect(malades(gens).map((v) => v.id)).toEqual(['a'])
  })
})
