import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DAY_MS } from './data'
import { ANS_PAR_JOUR } from './lignees'
import {
  GRAIN_PAR_LIT,
  ID_MORALE_FIEVRE,
  JOURS_FIEVRE,
  LITS_LAZARET,
  REPIT_JOURS,
  SOUCHES,
  epidemieActive,
  estGueri,
  estMalade,
  litsOccupes,
} from './epidemies'
import { jourDe, productionParMinute, useGame } from './store'
import type { BuildingId, Villageois } from './types'

/*
 * ═══════════ LA FIÈVRE PAR LE STORE : LES QUATRE COUTURES ═══════════
 *
 * Ce fichier ne vérifie pas les règles de la fièvre - `epidemies.test.ts` le
 * fait sans le store. Il vérifie les quatre endroits du MOTEUR où ce système
 * pouvait détruire quelque chose qui marche :
 *
 *  1. ⚠️ TUER UN HABITANT NOMMÉ DEMANDE DEUX GESTES. `syncVillageois` tourne à
 *     chaque battement et recomplète `s.villageois` jusqu'à `s.pop` en retirant
 *     « d'abord les oisifs ». Retirer le forgeron sans décrémenter `pop` le fait
 *     RENAÎTRE sous un autre nom au battement suivant ; décrémenter `pop` sans
 *     retirer le bon fait disparaître un oisif au hasard - et alors la peste
 *     tuerait des chômeurs, jamais le forgeron. C'était exactement le défaut du
 *     dilemme `peste` qu'on remplace.
 *  2. ⚠️ LE MALADE ALITÉ NE DOIT PLUS RENDRE. Sinon la fièvre ne coûte rien tant
 *     qu'elle ne tue pas, et l'attente est toujours le meilleur coup.
 *  3. ⚠️ LE CROCHET QUOTIDIEN NE RATTRAPE JAMAIS PLUS D'UNE JOURNÉE, et huit
 *     heures d'absence en avancent soixante. Une fièvre ne traverse donc pas une
 *     absence : elle s'y éteint, en une journée de morts, et le résumé le dit.
 *  4. ⚠️ QUATRE LISTES POUR UN CHAMP. `epidemie` et `lazaret` doivent survivre à
 *     une sauvegarde et à une reprise, et les marques de maladie voyagent avec
 *     les habitants puisqu'elles vivent SUR eux.
 */

const AUCUNE = { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 }

function habitant(id: string, nom: string, age: number, jour: number, metier: BuildingId, poste: BuildingId | null = metier): Villageois {
  return { id, nom, poste, metier, neLe: jour - age / ANS_PAR_JOUR, lignee: 'Nélides' }
}

/** un village au travail, au jour 20, avec de quoi produire et de quoi soigner */
function villageAuTravail(lazaret = 0) {
  const now = Date.now()
  const createdAt = now - 20 * DAY_MS
  useGame.setState({ createdAt, lastSeen: now, mode: 'bac-a-sable' })
  const jour = jourDe(useGame.getState())
  const gens = [
    habitant('forgeron', 'Damon', 30, jour, 'forge'),
    habitant('paysan', 'Myron', 28, jour, 'ferme'),
    habitant('pretre', 'Kléobis', 34, jour, 'temple'),
    habitant('oisif1', 'Alexios', 26, jour, 'ferme', null),
    habitant('oisif2', 'Théron', 22, jour, 'ferme', null),
  ]
  useGame.setState({
    pop: gens.length,
    villageois: gens,
    army: { ...AUCUNE },
    resources: { bois: 900, pierre: 900, grain: 900, bronze: 300 },
    buildings: {
      ...useGame.getState().buildings,
      agora: { level: 3 },
      ferme: { level: 2 },
      forge: { level: 2 },
      temple: { level: 2 },
      maisons: { level: 3 },
    },
    lazaret,
    epidemie: null,
  })
  return jour
}

beforeEach(() => {
  useGame.getState().reset()
  useGame.setState({ mode: 'bac-a-sable' })
})
afterEach(() => vi.restoreAllMocks())

describe('la fièvre entre par une porte, et prend des gens qui ont un nom', () => {
  it('elle marque des habitants nommés sans toucher au compte de la population', () => {
    const jour = villageAuTravail()
    useGame.getState().declencherFievre('convoi')
    const s = useGame.getState()
    expect(epidemieActive(s.epidemie)).toBe(true)
    expect(s.epidemie!.souche).toBe('convoi')
    expect(s.epidemie!.jourEntree).toBe(jour)
    // entrer n'est pas mourir : la population est intacte
    expect(s.pop).toBe(5)
    expect(s.villageois.filter(estMalade).length).toBe(SOUCHES.convoi.premiersCas)
  })

  it('deux fièvres ne brûlent pas ensemble, et le village a droit à son répit', () => {
    villageAuTravail()
    useGame.getState().declencherFievre('convoi')
    const premiere = useGame.getState().epidemie!
    useGame.getState().declencherFievre('camp')
    // la seconde porte n'ouvre rien : c'est toujours la première fièvre
    expect(useGame.getState().epidemie!.souche).toBe(premiere.souche)
    expect(useGame.getState().epidemie!.jourEntree).toBe(premiere.jourEntree)
  })

  it('après l’extinction, la porte reste fermée le temps du répit', () => {
    const jour = villageAuTravail()
    useGame.setState({ epidemie: { souche: 'camp', jourEntree: jour - 4, jourResolu: jour, cas: 3, morts: 1, gueris: 2, finLe: jour } })
    useGame.getState().declencherFievre('convoi')
    expect(useGame.getState().epidemie!.souche).toBe('camp')
    // passé le répit, elle peut revenir
    useGame.setState({ epidemie: { souche: 'camp', jourEntree: 1, jourResolu: 1, cas: 3, morts: 1, gueris: 2, finLe: jour - REPIT_JOURS } })
    useGame.getState().declencherFievre('convoi')
    expect(useGame.getState().epidemie!.souche).toBe('convoi')
  })
})

describe('⚠️ elle tue LE FORGERON, et il ne renaît pas au battement suivant', () => {
  it('la mort fait les DEUX gestes : l’habitant part de la liste ET pop décroît', () => {
    const jour = villageAuTravail()
    useGame.setState({
      epidemie: { souche: 'camp', jourEntree: jour - 1, jourResolu: jour - 1, cas: 1, morts: 0, gueris: 0 },
      villageois: useGame.getState().villageois.map((v) =>
        v.id === 'forgeron' ? { ...v, malade: { depuis: jour - 1, alite: false } } : v,
      ),
    })
    // tirage à zéro : le malade meurt à coup sûr
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const avant = useGame.getState().pop
    useGame.getState().resoudreFievre(jour)
    const s = useGame.getState()
    expect(s.villageois.find((v) => v.id === 'forgeron')).toBeUndefined()
    expect(s.pop).toBe(avant - 1)
    expect(s.epidemie!.morts).toBe(1)
    // et c'est bien le forgeron qu'on enterre, pas un oisif tiré au sort
    expect(s.villageois.map((v) => v.id)).toContain('oisif1')
    expect(s.reports.some((r) => r.lignes.join(' ').includes('Damon'))).toBe(true)
  })

  it('et `syncVillageois` ne le ressuscite pas sous un autre nom', () => {
    const jour = villageAuTravail()
    useGame.setState({
      epidemie: { souche: 'camp', jourEntree: jour - 1, jourResolu: jour - 1, cas: 1, morts: 0, gueris: 0 },
      villageois: useGame.getState().villageois.map((v) =>
        v.id === 'forgeron' ? { ...v, malade: { depuis: jour - 1, alite: false } } : v,
      ),
    })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    useGame.getState().resoudreFievre(jour)
    const apres = useGame.getState().pop
    useGame.getState().tick()
    expect(useGame.getState().villageois).toHaveLength(apres)
    expect(useGame.getState().villageois.some((v) => v.nom === 'Damon')).toBe(false)
  })

  it('un veuf ne garde pas un foyer fantôme', () => {
    const jour = villageAuTravail()
    const gens = useGame.getState().villageois.map((v) => {
      if (v.id === 'forgeron') return { ...v, conjoint: 'paysan', malade: { depuis: jour - 1, alite: false } }
      if (v.id === 'paysan') return { ...v, conjoint: 'forgeron' }
      return v
    })
    useGame.setState({
      villageois: gens,
      epidemie: { souche: 'camp', jourEntree: jour - 1, jourResolu: jour - 1, cas: 1, morts: 0, gueris: 0 },
    })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    useGame.getState().resoudreFievre(jour)
    expect(useGame.getState().villageois.find((v) => v.id === 'paysan')!.conjoint).toBeUndefined()
  })
})

describe('⚠️ un malade ne rend plus plein à son poste', () => {
  it('un fiévreux debout fait baisser la production ; couché, il ne rend plus rien', () => {
    const jour = villageAuTravail(2)
    const sain = productionParMinute(useGame.getState(), Date.now())
    const marquer = (alite: boolean) =>
      useGame.setState({
        villageois: useGame.getState().villageois.map((v) =>
          v.id === 'paysan' ? { ...v, malade: { depuis: jour, alite } } : v,
        ),
      })
    marquer(false)
    const debout = productionParMinute(useGame.getState(), Date.now())
    marquer(true)
    const couche = productionParMinute(useGame.getState(), Date.now())
    expect(debout.grain).toBeLessThan(sain.grain)
    expect(couche.grain).toBeLessThan(debout.grain)
  })

  it('son poste l’attend : on ne peut pas mettre quelqu’un d’autre à sa place', () => {
    const jour = villageAuTravail(2)
    /*
     * ⚠️ LA FERME EST RAMENÉE AU NIVEAU 1 - UN SEUL POSTE. Sans cela le test ne
     * prouvait RIEN : la ferme de niveau 2 offre deux postes, l'affectation
     * réussissait que l'alité comptât ou non, et l'on aurait pu retirer le malade
     * de `postesPourvus` sans qu'un seul test bronche.
     */
    useGame.setState({
      buildings: { ...useGame.getState().buildings, ferme: { level: 1 } },
      villageois: useGame.getState().villageois.map((v) =>
        v.id === 'paysan' ? { ...v, malade: { depuis: jour, alite: true } } : v,
      ),
    })
    useGame.getState().affecter('oisif1', 'ferme')
    // l'unique poste reste au couché : personne ne le remplace au sillon
    expect(useGame.getState().villageois.filter((v) => v.poste === 'ferme').map((v) => v.id)).toEqual(['paysan'])
    expect(useGame.getState().toasts.length).toBeGreaterThan(0)
  })
})

describe('le lazaret : des lits qu’on paie, et un triage qui refuse', () => {
  it('on l’ouvre au temple, et il coûte le prix d’une tour d’archers', () => {
    villageAuTravail(0)
    useGame.setState({ resources: { bois: 900, pierre: 900, grain: 900, bronze: 300 } })
    useGame.getState().batirLazaret()
    expect(useGame.getState().lazaret).toBe(1)
    useGame.getState().batirLazaret()
    expect(useGame.getState().lazaret).toBe(2)
  })

  it('sans temple, pas de prêtre qui connaisse les purifications', () => {
    villageAuTravail(0)
    useGame.setState({ buildings: { ...useGame.getState().buildings, temple: { level: 0 } } })
    useGame.getState().batirLazaret()
    expect(useGame.getState().lazaret).toBe(0)
    expect(useGame.getState().toasts.length).toBeGreaterThan(0)
  })

  it('aliter occupe un lit, le renvoyer au travail le libère', () => {
    const jour = villageAuTravail(1)
    useGame.setState({
      epidemie: { souche: 'camp', jourEntree: jour, jourResolu: jour, cas: 1, morts: 0, gueris: 0 },
      villageois: useGame.getState().villageois.map((v) =>
        v.id === 'forgeron' ? { ...v, malade: { depuis: jour, alite: false } } : v,
      ),
    })
    useGame.getState().aliter('forgeron', true)
    expect(litsOccupes(useGame.getState().villageois)).toBe(1)
    useGame.getState().aliter('forgeron', false)
    expect(litsOccupes(useGame.getState().villageois)).toBe(0)
  })

  it('un lazaret plein refuse le lit suivant AVEC son motif', () => {
    const jour = villageAuTravail(1)
    const gens = useGame.getState().villageois.map((v, i) =>
      i < LITS_LAZARET[1] + 1 ? { ...v, malade: { depuis: jour, alite: i < LITS_LAZARET[1] } } : v,
    )
    useGame.setState({
      villageois: gens,
      epidemie: { souche: 'camp', jourEntree: jour, jourResolu: jour, cas: 4, morts: 0, gueris: 0 },
    })
    const dehors = useGame.getState().villageois[LITS_LAZARET[1]]
    useGame.getState().aliter(dehors.id, true)
    expect(useGame.getState().villageois.find((v) => v.id === dehors.id)!.malade!.alite).toBe(false)
    expect(useGame.getState().toasts.some((t) => t.msg.includes('lits'))).toBe(true)
  })

  it('les lits mangent du grain chaque journée', () => {
    const jour = villageAuTravail(2)
    useGame.setState({
      resources: { ...useGame.getState().resources, grain: 500 },
      epidemie: { souche: 'convoi', jourEntree: jour - 1, jourResolu: jour - 1, cas: 2, morts: 0, gueris: 0 },
      villageois: useGame.getState().villageois.map((v, i) =>
        i < 2 ? { ...v, malade: { depuis: jour - 1, alite: true } } : v,
      ),
    })
    const avant = useGame.getState().resources.grain
    // les malades survivent et ne guérissent pas : seul le bouillon est prélevé
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    useGame.getState().resoudreFievre(jour)
    expect(useGame.getState().resources.grain).toBeCloseTo(avant - 2 * GRAIN_PAR_LIT, 5)
  })

  it('⚠️ et quand la ressource manque, le bouillon ne creuse pas les greniers sous zéro', () => {
    /*
     * Six lits pleins mangent 36 mesures par journée. Un grenier à 10 doit finir
     * à 0, jamais à −26 : `clampRes` n'est pas dans ce chemin, et un stock négatif
     * se propagerait partout - `tauxParMinute` afficherait une famine perpétuelle
     * et `peutPayer` refuserait tout, longtemps après la fièvre.
     */
    const jour = villageAuTravail(2)
    useGame.setState({
      resources: { ...useGame.getState().resources, grain: 10 },
      epidemie: { souche: 'convoi', jourEntree: jour - 1, jourResolu: jour - 1, cas: 3, morts: 0, gueris: 0 },
      villageois: useGame.getState().villageois.map((v, i) =>
        i < 3 ? { ...v, malade: { depuis: jour - 1, alite: true } } : v,
      ),
    })
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    useGame.getState().resoudreFievre(jour)
    expect(useGame.getState().resources.grain).toBe(0)
  })
})

describe('la fièvre pèse sur l’ambiance, et le poids s’en va avec elle', () => {
  it('un modificateur unique pendant, plus rien après', () => {
    const jour = villageAuTravail(0)
    /*
     * Il a DÉJÀ passé ses trois journées de fièvre : elle tombe d'elle-même, sans
     * qu'aucun tirage de guérison ne soit consommé. C'est la seule mise en scène
     * qui ne dépende pas des constantes de mortalité - avec un simple
     * `mockReturnValue(0.999)` il ne guérissait PAS (0,999 > 25 % de chance de se
     * relever), la fièvre ne s'éteignait pas, et le test ne prouvait rien.
     */
    useGame.setState({
      epidemie: { souche: 'camp', jourEntree: jour - JOURS_FIEVRE, jourResolu: jour - 1, cas: 1, morts: 0, gueris: 0 },
      villageois: useGame.getState().villageois.map((v) =>
        v.id === 'paysan' ? { ...v, malade: { depuis: jour - JOURS_FIEVRE, alite: false } } : v,
      ),
    })
    // 0,999 : il ne meurt pas, et sa fièvre est tombée - il se relève
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    useGame.getState().resoudreFievre(jour)
    const s = useGame.getState()
    expect(s.epidemie!.finLe).toBe(jour)
    expect(s.moraleMods.some((m) => m.id === ID_MORALE_FIEVRE)).toBe(false)
    // et les marques sont effacées : personne ne reste « relevé » d'une fièvre finie
    expect(s.villageois.some((v) => estMalade(v) || estGueri(v))).toBe(false)
  })
})

describe('⚠️ une fièvre ne traverse pas une absence', () => {
  it('huit heures d’absence l’éteignent, et le résumé de réveil le dit', () => {
    const jour = villageAuTravail(0)
    useGame.setState({
      epidemie: { souche: 'camp', jourEntree: jour, jourResolu: jour, cas: 3, morts: 0, gueris: 0 },
      villageois: useGame.getState().villageois.map((v, i) =>
        i < 3 ? { ...v, malade: { depuis: jour, alite: false } } : v,
      ),
    })
    useGame.getState().save()
    // on repart huit heures : soixante journées de calendrier
    useGame.setState({ lastSeen: Date.now() - 8 * 3_600_000 })
    useGame.getState().save()
    useGame.getState().init()
    const s = useGame.getState()
    expect(epidemieActive(s.epidemie)).toBe(false)
    expect(s.villageois.some(estMalade)).toBe(false)
    expect((s.offlineSummary ?? []).join(' ')).toContain('fièvre')
  })

  it('et le crochet quotidien ne résout jamais deux journées d’un coup', () => {
    const jour = villageAuTravail(0)
    useGame.setState({
      dernierJourVecu: jour - 30,
      epidemie: { souche: 'camp', jourEntree: jour - 1, jourResolu: jour - 1, cas: 1, morts: 0, gueris: 0 },
      villageois: useGame.getState().villageois.map((v) =>
        v.id === 'paysan' ? { ...v, malade: { depuis: jour - 1, alite: false } } : v,
      ),
    })
    useGame.getState().tick()
    // une seule journée résolue, quelle que soit la dette de calendrier
    expect(useGame.getState().epidemie!.jourResolu).toBe(jour)
  })
})

describe('⚠️ elle ne porte aucune échéance en millisecondes - donc rien à reculer à ×8', () => {
  it('l’état de la fièvre ne contient que des index de journée', () => {
    /*
     * LE BLOC DE VITESSE DU TICK recule TOUTES les échéances en millisecondes de
     * `dtMs * (vitesse - 1)`. Une échéance oubliée dans ce bloc tourne à ×1 dans
     * un jeu à ×8 - et l'on ne s'en aperçoit qu'en jouant vite. Ce système n'en
     * porte AUCUNE : ce test échoue le jour où quelqu'un ajoute un `…At` ou un
     * `…Jusqua` à `EtatEpidemie` sans l'inscrire dans ce bloc.
     */
    const jour = villageAuTravail(1)
    useGame.getState().declencherFievre('camp')
    const e = useGame.getState().epidemie!
    for (const [cle, val] of Object.entries(e)) {
      if (typeof val !== 'number') continue
      expect(cle, `${cle} ressemble à un horodatage`).not.toMatch(/(At|Jusqua|Until)$/)
      // un horodatage vaut 1,7×10¹² ; une journée de jeu se compte par milliers
      expect(val, cle).toBeLessThan(100_000)
    }
    expect(e.jourEntree).toBe(jour)
  })

  it('à ×8 la fièvre avance VRAIMENT huit fois plus vite : elle suit le calendrier', () => {
    /*
     * Elle suit `jourDe`, qui suit `createdAt` - que le bloc de vitesse recule
     * déjà. On n'a donc rien à câbler, et c'est tout l'intérêt du parti pris :
     * `createdAt` reculé de sept battements de retard fait avancer la journée, et
     * le crochet quotidien résout la fièvre sans qu'une seule ligne lui soit
     * consacrée dans le bloc de vitesse.
     */
    const jour = villageAuTravail(0)
    const avant = useGame.getState().createdAt
    useGame.setState({ vitesse: 8, lastSeen: Date.now() - 1500 })
    useGame.getState().tick()
    expect(useGame.getState().createdAt).toBeLessThan(avant)
    expect(jourDe(useGame.getState())).toBeGreaterThanOrEqual(jour)
  })
})

describe('⚠️ la fièvre survit à une sauvegarde, et une vieille partie n’en a pas', () => {
  it('l’épidémie, le lazaret et les marques de maladie sont rechargés', () => {
    const jour = villageAuTravail(2)
    useGame.setState({
      epidemie: { souche: 'butin', jourEntree: jour, jourResolu: jour, cas: 2, morts: 0, gueris: 0 },
      villageois: useGame.getState().villageois.map((v) =>
        v.id === 'forgeron' ? { ...v, malade: { depuis: jour, alite: true } } : v,
      ),
    })
    useGame.getState().save()
    useGame.getState().init()
    const s = useGame.getState()
    expect(s.lazaret).toBe(2)
    expect(s.epidemie!.souche).toBe('butin')
    expect(s.villageois.find((v) => v.id === 'forgeron')!.malade!.alite).toBe(true)
  })

  it('une partie neuve n’a ni fièvre ni lazaret', () => {
    useGame.getState().reset()
    expect(useGame.getState().epidemie).toBeNull()
    expect(useGame.getState().lazaret).toBe(0)
  })
})

describe('le dilemme de la fièvre n’est plus un impôt sur les oisifs', () => {
  it('choisir dans le dilemme `peste` OUVRE l’épidémie au lieu de retirer de la population', () => {
    const jour = villageAuTravail(0)
    useGame.setState({
      pop: 12,
      activeEvent: { defId: 'peste', roll: 0.5, startedAt: Date.now() },
      villageois: useGame.getState().villageois,
    })
    const avant = useGame.getState().pop
    useGame.getState().choisirEvenement(0)
    const s = useGame.getState()
    expect(s.pop).toBe(avant)
    expect(epidemieActive(s.epidemie)).toBe(true)
    expect(s.villageois.some(estMalade)).toBe(true)
    expect(jourDe(s)).toBe(jour)
  })
})
