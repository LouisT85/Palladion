import { beforeEach, describe, expect, it } from 'vitest'
import { DAY_MS } from './data'
import {
  COUT_FAVEUR_HECATOMBE,
  PART_TROUPEAU,
  RELATION_MINIMUM,
  RESTE_MINIMUM_MS,
  RITES_HECATOMBE,
  SAISON_MS,
  bonusHecatombe,
  indexSaison,
  refusHecatombe,
  resteDeSaison,
  riteActif,
} from './hecatombe'
import { murMax, productionParMinute, useGame } from './store'
import type { GodId } from './types'

/*
 * ═══════════════════ L'HÉCATOMBE, ET SES DEUX PIÈGES ═══════════════════
 *
 * Le rite est simple à décrire et difficile à tenir, parce qu'il touche deux
 * endroits du moteur où ce jeu s'est déjà brûlé.
 *
 *  · LE TEMPS. L'effet dure « jusqu'au basculement de saison », et le store a
 *    deux façons de faire avancer le temps qui ne se ressemblent pas : le bloc de
 *    vitesse du tick, qui RECULE `createdAt` à chaque battement pour simuler
 *    l'accélération, et le rattrapage hors ligne, qui peut avancer le calendrier
 *    de soixante journées d'un coup. Un rite qui aurait porté une échéance en
 *    millisecondes aurait duré huit fois trop longtemps à ×8, et aurait survécu
 *    intact à huit heures d'absence. Ces tests exigent le contraire : le rite
 *    expire quand la SAISON tourne, quelle que soit la façon dont elle a tourné.
 *
 *  · L'ARITHMÉTIQUE. Les bonus de ce jeu se composent selon deux lois
 *    différentes - les sources de `murPct` s'additionnent dans une seule
 *    parenthèse, tandis que les grâces sont un facteur séparé des découvertes.
 *    Mêler les deux change en silence les chiffres qu'`horsligne.test.ts` écrit
 *    en produits explicites. Ces tests exigent qu'une hécatombe absente ne
 *    change RIEN, au nombre près.
 */

/** un règne prêt à offrir : temple bâti, dieu conquis, faveur en caisse */
/*
 * ⚠️ L'ANCRE, ET LES DEUX FLAKES QU'ELLE A COÛTÉS.
 *
 * `offrirHecatombe` lit `Date.now()`, l'horloge réelle, et refuse l'offrande dans
 * le dernier cinquième de la saison. Il faut donc que le règne de test commence au
 * MATIN d'une saison, sans quoi le résultat dépend de l'heure qu'il est.
 *
 *  · Premier jet : `createdAt: 0`. La saison en cours dépendait de l'horloge, et
 *    une fois sur cinq le rite était refusé sans qu'une ligne de code ait changé.
 *  · Deuxième jet : `Date.now() - (Date.now() % SAISON_MS)`. Cela ancre la
 *    fondation sur un multiple de la durée de saison - ce qui ne dit rien du temps
 *    ÉCOULÉ depuis. `now - createdAt` valait alors `Date.now() % SAISON_MS`, un
 *    reste quelconque entre zéro et trente-deux minutes : le même tirage, déguisé.
 *    Il a passé une fois, puis échoué à 134 secondes de saison restante.
 *
 * La bonne ancre est la plus simple : la cité est fondée MAINTENANT. Le temps
 * écoulé vaut zéro, il reste une saison pleine, et l'index de saison vaut 0 - sans
 * arithmétique modulaire à relire.
 */
function ancreDeSaison(): number {
  return Date.now()
}

function regnePieux(dieu: GodId = 'poseidon') {
  const s = useGame.getState()
  const createdAt = ancreDeSaison()
  useGame.setState({
    createdAt,
    lastSeen: createdAt,
    hecatombe: null,
    faveur: 100,
    resources: { bois: 2000, pierre: 2000, grain: 2000, bronze: 2000 },
    buildings: { ...s.buildings, temple: { level: 3 }, remparts: { level: 3 }, agora: { level: 3 } },
    gods: { ...s.gods, [dieu]: { relation: 60, cooldownUntil: 0 } },
    moraleMods: [],
    nextAttackAt: 0,
  })
}

beforeEach(() => {
  useGame.getState().reset()
  useGame.setState({ mode: 'bac-a-sable' })
})

describe('l’hécatombe engage la saison entière', () => {
  it('un rite offert vaut jusqu’au basculement, et pas une saison de plus', () => {
    const rite = { dieu: 'poseidon' as GodId, saison: 3 }
    const debut = 3 * SAISON_MS + 1000
    expect(riteActif(rite, debut, 0)?.dieu).toBe('poseidon')
    // dernier instant de la saison 3
    expect(riteActif(rite, 4 * SAISON_MS - 1, 0)).not.toBeNull()
    // premier instant de la saison 4 : la fumée est retombée
    expect(riteActif(rite, 4 * SAISON_MS, 0)).toBeNull()
  })

  it('le rite d’une saison ne renaît pas quand la même saison revient l’année d’après', () => {
    /*
     * C'est tout l'objet de l'index ABSOLU. Un `SaisonId` revient toutes les
     * quatre journées : retenir « printemps » aurait rendu au joueur, une heure
     * plus tard, un effet qu'il avait payé une fois.
     */
    const rite = { dieu: 'ares' as GodId, saison: 0 }
    expect(riteActif(rite, 1000, 0)).not.toBeNull()
    // quatre saisons plus tard, le printemps est revenu - le rite, non
    expect(riteActif(rite, 4 * SAISON_MS + 1000, 0)).toBeNull()
  })

  it('accélérer le jeu raccourcit le rite dans la même proportion que la saison', () => {
    /*
     * Le bloc de vitesse du tick recule `createdAt` : à ×8, une seconde réelle
     * fait avancer le calendrier de huit. Comme le rite se lit sur ce même
     * `createdAt`, il n'y a rien à décaler - et c'est ce que ce test vérifie.
     */
    const rite = { dieu: 'athena' as GodId, saison: 0 }
    const now = 1000
    expect(riteActif(rite, now, 0)).not.toBeNull()
    // le tick a reculé createdAt d'une saison entière (l'équivalent de ×8 tenu un moment)
    expect(riteActif(rite, now, -SAISON_MS)).toBeNull()
  })

  it('huit heures d’absence éteignent le rite au lieu de le prolonger', () => {
    const rite = { dieu: 'zeus' as GodId, saison: 0 }
    /*
     * OFFLINE_CAP_MS vaut huit heures et DAY_MS huit minutes : une absence pleine
     * avance le calendrier de SOIXANTE journées, soit quinze saisons. Le chiffre
     * est écrit en clair plutôt que borné vaguement - c'est lui qui dit pourquoi
     * une échéance en millisecondes n'aurait pas survécu à ce saut.
     */
    const huitHeures = 8 * 3_600_000
    expect(indexSaison(huitHeures, 0)).toBe(15)
    expect(riteActif(rite, huitHeures, 0)).toBeNull()
  })
})

describe('l’offrande se refuse, et le refus s’explique', () => {
  const socle = { faveur: 100, hecatombe: null, now: 1000, createdAt: 0 }

  it('cent bêtes ne brûlent pas sur un autel de cendres', () => {
    expect(refusHecatombe({ ...socle, temple: 1, relation: 60 }, 'zeus')).toBe('temple')
    expect(refusHecatombe({ ...socle, temple: 2, relation: 60 }, 'zeus')).toBeNull()
  })

  it('Arès exige son temple à lui, plus haut que celui de Zeus', () => {
    // GODS.ares.temple = 3 : le sang sur l'autel arrive en dernier, et c'est juste
    expect(refusHecatombe({ ...socle, temple: 2, relation: 60 }, 'ares')).toBe('temple')
    expect(refusHecatombe({ ...socle, temple: 3, relation: 60 }, 'ares')).toBeNull()
  })

  it('on n’offre pas cent bêtes à un dieu qui ne vous écoute pas encore', () => {
    expect(refusHecatombe({ ...socle, temple: 3, relation: RELATION_MINIMUM - 1 }, 'zeus')).toBe('relation')
    expect(refusHecatombe({ ...socle, temple: 3, relation: RELATION_MINIMUM }, 'zeus')).toBeNull()
  })

  it('il faut de la faveur pour que le devin conduise le rite', () => {
    expect(refusHecatombe({ ...socle, temple: 3, relation: 60, faveur: COUT_FAVEUR_HECATOMBE - 1 }, 'zeus')).toBe(
      'faveur',
    )
  })

  it('une seule hécatombe par saison', () => {
    const deja = { dieu: 'zeus' as GodId, saison: 0 }
    expect(refusHecatombe({ ...socle, temple: 3, relation: 60, hecatombe: deja }, 'ares')).toBe('deja')
    // la saison suivante rouvre la porte
    expect(
      refusHecatombe({ ...socle, temple: 3, relation: 60, hecatombe: deja, now: SAISON_MS + 1000 }, 'ares'),
    ).toBeNull()
  })

  it('offrir dans le dernier cinquième de la saison est refusé, pas puni', () => {
    /*
     * Sans cette borne, payer 350 grain trois secondes avant le basculement était
     * un piège que le joueur ne pouvait apprendre qu'en le subissant.
     */
    const tard = SAISON_MS - RESTE_MINIMUM_MS + 1
    expect(refusHecatombe({ ...socle, temple: 3, relation: 60, now: tard }, 'zeus')).toBe('tard')
    const tot = SAISON_MS - RESTE_MINIMUM_MS - 1
    expect(refusHecatombe({ ...socle, temple: 3, relation: 60, now: tot }, 'zeus')).toBeNull()
  })

  it('ce qu’il reste de la saison se lit sans jamais devenir négatif', () => {
    expect(resteDeSaison(0, 0)).toBe(SAISON_MS)
    expect(resteDeSaison(SAISON_MS - 1, 0)).toBe(1)
    expect(resteDeSaison(SAISON_MS, 0)).toBe(SAISON_MS)
    expect(resteDeSaison(17 * DAY_MS, 0)).toBeGreaterThan(0)
  })
})

describe('les quatre rites font quatre saisons différentes', () => {
  it('chaque Olympien a le sien, et aucun ne fait ce que fait un autre', () => {
    const dieux: GodId[] = ['zeus', 'poseidon', 'athena', 'ares']
    for (const g of dieux) expect(RITES_HECATOMBE[g].dieu).toBe(g)
    const signatures = dieux.map((g) => JSON.stringify(RITES_HECATOMBE[g].effet))
    expect(new Set(signatures).size).toBe(4)
  })

  it('les quatre saignent le troupeau : aucun rite n’est gratuit en grain', () => {
    for (const g of ['zeus', 'poseidon', 'athena', 'ares'] as GodId[]) {
      expect(RITES_HECATOMBE[g].effet.grainPct).toBe(-PART_TROUPEAU)
    }
  })

  it('Arès seul fâche le village : son autel ne rend rien à la table', () => {
    expect(RITES_HECATOMBE.ares.morale).toBeLessThan(0)
    for (const g of ['zeus', 'poseidon', 'athena'] as GodId[]) {
      expect(RITES_HECATOMBE[g].morale).toBeGreaterThan(0)
    }
  })

  it('la trêve de Zeus DIFFÈRE la colonne, elle ne la supprime pas', () => {
    /*
     * La première version posait un drapeau qui empêchait tout assaut tant que la
     * fumée montait : une saison de 32 minutes contre un assaut toutes les 8 à 16,
     * cela effaçait deux à quatre colonnes pour 40 de faveur. Le rite achetait la
     * fin du jeu. Il n'accorde plus qu'un répit, et il se paie s'il est trahi.
     */
    expect(RITES_HECATOMBE.zeus.effet.repitMs).toBeGreaterThan(0)
    expect(RITES_HECATOMBE.zeus.effet.romptSiGuerre).toBe(true)
    for (const g of ['poseidon', 'athena', 'ares'] as GodId[]) {
      expect(RITES_HECATOMBE[g].effet.repitMs).toBe(0)
      expect(RITES_HECATOMBE[g].effet.romptSiGuerre).toBe(false)
    }
  })
})

describe('sans hécatombe, rien ne change - au nombre près', () => {
  it('la production et la structure du mur sont identiques à ce qu’elles étaient', () => {
    regnePieux()
    const quand = Date.now()
    useGame.setState({ hecatombe: null })
    const sansRite = { mur: murMax(useGame.getState()), prod: productionParMinute(useGame.getState(), quand) }
    // un rite d'une AUTRE saison ne doit pas davantage compter
    useGame.setState({ hecatombe: { dieu: 'poseidon', saison: 99 } })
    expect(murMax(useGame.getState())).toBe(sansRite.mur)
    expect(productionParMinute(useGame.getState(), quand)).toEqual(sansRite.prod)
  })

  it('un rite neutre ne touche à aucun canal', () => {
    const n = bonusHecatombe(null, 0, 0)
    expect(Object.values(n).filter((v) => v !== 0 && v !== false)).toEqual([])
  })
})

describe('offrir l’hécatombe change le règne', () => {
  it('les taureaux de Poséidon remaçonnent l’enceinte entière, à sa hauteur NEUVE', () => {
    regnePieux('poseidon')
    useGame.setState({ wallHp: 1 })
    const avant = murMax(useGame.getState())
    useGame.getState().offrirHecatombe('poseidon')
    const s = useGame.getState()
    expect(s.hecatombe?.dieu).toBe('poseidon')
    // +33 % de structure, et le mur est plein à cette hauteur-là
    expect(murMax(s)).toBeGreaterThan(avant)
    expect(s.wallHp).toBe(murMax(s))
  })

  it('le troupeau saigné coûte un cinquième du grain, et rien d’autre', () => {
    regnePieux('athena')
    /*
     * On lit la production à l'instant RÉEL, celui où le rite s'inscrit : la lire
     * à `now = 0` la ferait juger par `indexSaison(0, createdAt)`, une saison
     * d'avant la fondation, où aucune fumée ne monte.
     */
    const quand = Date.now()
    const avant = productionParMinute(useGame.getState(), quand)
    useGame.getState().offrirHecatombe('athena')
    const apres = productionParMinute(useGame.getState(), quand)
    expect(apres.grain).toBeCloseTo(avant.grain * (1 - PART_TROUPEAU), 4)
    for (const r of ['bois', 'pierre', 'bronze'] as const) expect(apres[r]).toBeCloseTo(avant[r], 4)
  })

  it('le rite coûte la faveur et rend de la relation', () => {
    regnePieux('zeus')
    const avantFaveur = useGame.getState().faveur
    const avantRelation = useGame.getState().gods.zeus.relation
    useGame.getState().offrirHecatombe('zeus')
    expect(useGame.getState().faveur).toBe(avantFaveur - COUT_FAVEUR_HECATOMBE)
    expect(useGame.getState().gods.zeus.relation).toBeGreaterThan(avantRelation)
  })

  it('la trêve du roi repousse la colonne annoncée', () => {
    regnePieux('zeus')
    const avant = useGame.getState().nextAttackAt
    useGame.getState().offrirHecatombe('zeus')
    expect(useGame.getState().nextAttackAt).toBeGreaterThan(avant)
    expect(useGame.getState().warned).toBe(false)
  })

  it('le rite laisse une trace dans la chronique et une humeur dans le village', () => {
    regnePieux('ares')
    useGame.getState().offrirHecatombe('ares')
    const s = useGame.getState()
    expect(s.reports.some((r) => r.titre.includes('Hécatombe'))).toBe(true)
    expect(s.moraleMods.some((m) => m.label === RITES_HECATOMBE.ares.nom)).toBe(true)
  })

  it('on ne peut pas en offrir deux dans la même saison', () => {
    regnePieux('poseidon')
    useGame.getState().offrirHecatombe('poseidon')
    useGame.setState({ gods: { ...useGame.getState().gods, ares: { relation: 60, cooldownUntil: 0 } } })
    useGame.getState().offrirHecatombe('ares')
    expect(useGame.getState().hecatombe?.dieu).toBe('poseidon')
  })
})

describe('Zeus Xenios ne couvre pas qui pille pendant sa trêve', () => {
  it('lancer une expédition rompt la trêve et fâche le dieu', () => {
    regnePieux('zeus')
    useGame.getState().offrirHecatombe('zeus')
    const relationApresRite = useGame.getState().gods.zeus.relation
    expect(useGame.getState().hecatombe).not.toBeNull()

    useGame.setState({ army: { ...useGame.getState().army, hoplite: 6 } })
    useGame.getState().lancerExpedition('camp-pillards', {
      lancier: 0,
      archer: 0,
      hoplite: 4,
      frondeur: 0,
      peltaste: 0,
      belier: 0,
      char: 0,
    })
    const s = useGame.getState()
    expect(s.hecatombe).toBeNull()
    expect(s.gods.zeus.relation).toBeLessThan(relationApresRite)
    expect(s.reports.some((r) => r.titre === 'Trêve rompue')).toBe(true)
  })

  it('les trois autres rites survivent à une expédition - eux n’ont rien juré', () => {
    regnePieux('ares')
    useGame.getState().offrirHecatombe('ares')
    useGame.setState({ army: { ...useGame.getState().army, hoplite: 6 } })
    useGame.getState().lancerExpedition('camp-pillards', {
      lancier: 0,
      archer: 0,
      hoplite: 4,
      frondeur: 0,
      peltaste: 0,
      belier: 0,
      char: 0,
    })
    expect(useGame.getState().hecatombe?.dieu).toBe('ares')
  })
})

describe('l’hécatombe ne traverse ni les modes ni les règnes', () => {
  it('changer de mode éteint la fumée', () => {
    regnePieux('poseidon')
    useGame.getState().offrirHecatombe('poseidon')
    expect(useGame.getState().hecatombe).not.toBeNull()
    useGame.getState().choisirMode('campagne')
    expect(useGame.getState().hecatombe).toBeNull()
  })

  it('abandonner la cité l’éteint aussi', () => {
    regnePieux('athena')
    useGame.getState().offrirHecatombe('athena')
    useGame.getState().reset()
    expect(useGame.getState().hecatombe).toBeNull()
  })
})
