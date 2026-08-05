import { beforeEach, describe, expect, it } from 'vitest'
import { resoudreHorsLigne } from './combat'
import {
  ANCIEN_STORAGE_KEY,
  ASSAUT_MAX_MS,
  ASSAUT_MIN_MS,
  BUILDING_IDS,
  FAVEUR_MAX,
  OFFLINE_CAP_MS,
  POP_CAP,
  RES,
  STOCKAGE,
  STORAGE_KEY,
  WALL_HP,
} from './data'
import { HERO_IDS } from './heros'
import { murMax, rendement, tauxParMinute, useGame, type GameState } from './store'
import type { BuildingId, BuildingState, ResourceId, Villageois, WaveUnit } from './types'

/*
 * La résolution hors-ligne est la seule partie du jeu que le joueur ne voit pas
 * tourner : elle s'exécute une fois, au chargement, et ce qu'elle se trompe est
 * définitif - un grenier vidé ou un rempart abattu ne se rejoue pas. D'où ce
 * fichier, qui recharge de vraies sauvegardes et vérifie ce que le village
 * trouve à son réveil.
 *
 * Deux règles de conduite s'y appliquent :
 *
 * - Chaque chargement repart d'un store et d'un disque neufs (`rechargerApres`
 *   remet tout à zéro avant de poser sa sauvegarde), pour qu'aucun test ne
 *   dépende de celui qui l'a précédé ni de l'ordre du fichier.
 *
 * - Les nombres attendus sont écrits en clair (« 3,5 de cueillette × 0,89
 *   d'ambiance × 1,05 de printemps ») plutôt que recalculés depuis les tables :
 *   un test qui rappelle la formule qu'il vérifie ne vérifie rien.
 *
 * Note d'environnement : sous Vitest, `import.meta.env.MODE` vaut 'test', donc
 * MODE_TEST est VRAI. Cela ne concerne que `payer()` et le tick (qui remplit les
 * coffres à ras bord) ; `simulerHorsLigne` n'en tient aucun compte, et les
 * montants exacts vérifiés plus bas le prouvent : si la résolution hors-ligne se
 * mettait à recopier le tick, les stocks sauteraient au plafond de l'agora et
 * la moitié de ce fichier rougirait.
 */

/** bâtiments au complet - sans agora debout, la capacité de stockage serait nulle */
function niveaux(n: Partial<Record<BuildingId, number>>): Record<BuildingId, BuildingState> {
  const out = {} as Record<BuildingId, BuildingState>
  for (const b of BUILDING_IDS) out[b] = { level: n[b] ?? (b === 'agora' ? 1 : 0) }
  return out
}

/**
 * Village de référence : greniers spacieux, printemps clair, aucun assaut à
 * l'horizon et une population déjà au plafond des maisons - de sorte que rien
 * ne bouge sinon ce que le test cherche à éprouver.
 *
 * Le ciel et la date de fondation sont posés explicitement : `simulerHorsLigne`
 * ne fait pas tourner le calendrier, toute la production d'une absence sort donc
 * à la saison et à la météo du moment du départ. Les figer est la seule façon
 * d'obtenir deux fois le même chiffre.
 */
function socle(): Partial<GameState> {
  const now = Date.now()
  return {
    createdAt: now - 60_000,
    buildings: niveaux({ agora: 4 }),
    resources: { bois: 100, pierre: 100, grain: 100, bronze: 100 },
    faveur: 0,
    pop: 7,
    villageois: [],
    army: { lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 },
    recruitQueue: [],
    morale: 52,
    moraleMods: [],
    saison: 'printemps',
    meteo: 'clair',
    wallHp: 0,
    tours: 0,
    brechesMur: [],
    incomingWave: null,
    incomingFronts: null,
    defRecompense: null,
    warned: false,
    pendingEffects: [],
    reports: [],
    stats: { repousses: 0, perdus: 0, evenements: 0 },
    droughtUntil: 0,
    nextAttackAt: now + 6 * 3_600_000,
    nextPopAt: now + 6 * 3_600_000,
    lastEventAt: now,
    nextDesertAt: 0,
    tutoriel: 0,
  }
}

/**
 * Cueillette de base au socle, par minute : 3,5 🪵 (BASE_PROD) × 0,89
 * d'ambiance (moral 52) × 1,05 de printemps clair. Sert de référence aux
 * quelques montants vérifiés au centième - si l'un de ces trois facteurs bouge,
 * on veut le savoir ici aussi, car le hors-ligne promet au joueur le taux que
 * le HUD affiche.
 */
const BOIS_PAR_MIN = 3.5 * 0.89 * 1.05

/** remet le store et le disque à neuf */
function reinitialiser(): void {
  useGame.getState().reset()
  localStorage.clear()
}

/**
 * Pose l'état voulu sur un village neuf, l'écrit dans localStorage comme le fait
 * l'autosave, puis recharge la partie après `absenceMs` d'absence. C'est
 * exactement le chemin du joueur qui rouvre son onglet le lendemain - et la
 * remise à zéro initiale garantit qu'un test peut en enchaîner plusieurs.
 */
function rechargerApres(absenceMs: number, patch: Partial<GameState>): GameState {
  reinitialiser()
  useGame.setState({ ...patch, lastSeen: Date.now() - absenceMs })
  useGame.getState().save()
  useGame.getState().init()
  return useGame.getState()
}

beforeEach(reinitialiser)

describe('production pendant l’absence', () => {
  it('ne crédite jamais plus de huit heures de récolte', () => {
    const quatreHeures = rechargerApres(4 * 3_600_000, socle()).resources.bois - 100
    const huitHeures = rechargerApres(OFFLINE_CAP_MS, socle()).resources.bois - 100
    const troisJours = rechargerApres(3 * 24 * 3_600_000, socle()).resources.bois - 100

    // en deçà du plafond la récolte est strictement proportionnelle à l'absence
    expect(huitHeures).toBeCloseTo(quatreHeures * 2, 1)
    // et au-delà, plus rien ne s'ajoute : c'est la seule chose qui empêche une
    // semaine de vacances de remplir les greniers d'un coup
    expect(troisJours).toBe(huitHeures)
    // l'agora de niveau 4 est assez vaste pour que rien ne soit écrêté ici :
    // le plafond mesuré est bien celui du temps, pas celui du stock
    expect(100 + huitHeures).toBeLessThan(STOCKAGE[4])
  })

  it('compte les bras au travail, comme le fait le HUD', () => {
    /*
     * Le tick ne fait produire un atelier qu'au prorata de ses postes tenus. Si
     * la résolution hors-ligne l'oubliait, dormir vaudrait mieux que jouer : un
     * camp de bûcherons désert rapporterait la nuit ce qu'il ne rapporte pas le
     * jour. On compare donc deux villages qui ne diffèrent que par UN poste.
     */
    const bucheron: Villageois = { id: 'v1', nom: 'Nikandros', poste: 'scierie', metier: 'scierie' }
    const village = { ...socle(), buildings: niveaux({ agora: 4, scierie: 2 }) }

    const tenu = rechargerApres(10 * 60_000, { ...village, villageois: [bucheron] })
    // deux postes ouverts au niveau 2, un seul pourvu : l'atelier tourne à moitié
    expect(rendement(tenu, 'scierie')).toBe(0.5)
    const gainTenu = tenu.resources.bois - 100

    const desert = rechargerApres(10 * 60_000, { ...village, villageois: [{ ...bucheron, poste: null }] })
    expect(rendement(desert, 'scierie')).toBe(0)
    const gainDesert = desert.resources.bois - 100

    /*
     * 3,5 de cueillette seule contre 3,5 + la moitié des 17 🪵/min d'une scierie
     * de niveau 2. Le rapport ne dépend ni de l'ambiance ni de la saison, qui se
     * simplifient : il ne mesure que la prise en compte du poste.
     */
    expect(gainTenu / gainDesert).toBeCloseTo((3.5 + 17 * 0.5) / 3.5, 2)
  })

  it('rend exactement le taux par minute affiché dans le HUD', () => {
    const absence = 20 * 60_000
    reinitialiser()
    useGame.setState({ ...socle(), lastSeen: Date.now() - absence })
    // le HUD promet ce taux au joueur : l'absence doit tenir cette promesse
    const taux = tauxParMinute(useGame.getState())
    const avant = { ...useGame.getState().resources }
    useGame.getState().save()
    useGame.getState().init()
    const apres = useGame.getState().resources
    for (const r of Object.keys(RES) as ResourceId[]) {
      expect(apres[r]).toBeCloseTo(avant[r] + taux[r] * 20, 1)
    }

    // et ce taux est bien celui des tables, pas un raccourci maison
    expect(apres.bois - avant.bois).toBeCloseTo(BOIS_PAR_MIN * 20, 1)
    /*
     * Les bouches à nourrir se retranchent APRÈS la saison : sept villageois
     * mangent 1,75 🌾/min, et pas 1,75 × 1,3 sous prétexte que le printemps est
     * généreux. Confondre les deux fausserait tout l'équilibre du grenier.
     */
    expect(apres.grain - avant.grain).toBeCloseTo((3.5 * 0.89 * 1.3 - 7 * 0.25) * 20, 1)
    // sans forge ni port, le bronze ne sort pas de terre tout seul
    expect(apres.bronze).toBe(avant.bronze)
  })

  it('n’entasse pas au-delà de ce que l’agora peut garder', () => {
    const maigre = rechargerApres(OFFLINE_CAP_MS, {
      ...socle(),
      buildings: niveaux({ agora: 2 }),
      resources: { bois: 10, pierre: 10, grain: 10, bronze: 10 },
    })
    expect(maigre.resources.bois).toBe(STOCKAGE[2])
    expect(maigre.resources.pierre).toBe(STOCKAGE[2])

    /*
     * Le même village avec une agora de plus : le bois butte sur le nouveau
     * plafond, la pierre - qui sort deux fois moins vite - n'y arrive pas. Sans
     * ce second chargement, un écrêtage figé sur une constante passerait.
     */
    const vaste = rechargerApres(OFFLINE_CAP_MS, {
      ...socle(),
      buildings: niveaux({ agora: 3 }),
      resources: { bois: 10, pierre: 10, grain: 10, bronze: 10 },
    })
    expect(vaste.resources.bois).toBe(STOCKAGE[3])
    expect(vaste.resources.pierre).toBeGreaterThan(STOCKAGE[2])
    expect(vaste.resources.pierre).toBeLessThan(STOCKAGE[3])
  })

  it('laisse une garnison affamée vider les greniers, sans jamais passer sous zéro', () => {
    // quarante lanciers mangent 20 🌾/min : les champs ne suivent pas
    const s = rechargerApres(4 * 3_600_000, {
      ...socle(),
      resources: { bois: 50, pierre: 50, grain: 80, bronze: 0 },
      army: { lancier: 40, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 },
    })
    expect(s.resources.grain).toBe(0)
    for (const r of Object.keys(RES) as ResourceId[]) {
      expect(s.resources[r]).toBeGreaterThanOrEqual(0)
    }
    // le résumé annonce la perte réelle - 80, pas les milliers de grains
    // théoriquement mangés : le joueur ne peut pas perdre ce qu'il n'avait pas
    expect(s.offlineSummary).toContain('-80 🌾 grain')
    // la disette n'arrête pas les autres chantiers
    expect(s.resources.bois).toBeGreaterThan(50)
  })

  it('écrête la faveur du temple à la jauge, et ne l’invente pas sans temple', () => {
    // temple de niveau 1 : 1,2 faveur par minute
    const dixMinutes = rechargerApres(10 * 60_000, {
      ...socle(),
      buildings: niveaux({ agora: 2, temple: 1 }),
    })
    expect(dixMinutes.faveur).toBeCloseTo(1.2 * 10, 1)

    // huit heures en donneraient 576 : la jauge ne dépasse jamais son maximum
    const nuitEntiere = rechargerApres(OFFLINE_CAP_MS, {
      ...socle(),
      buildings: niveaux({ agora: 2, temple: 1 }),
    })
    expect(nuitEntiere.faveur).toBe(FAVEUR_MAX)

    // sans autel, les dieux n'ont rien à entendre : la faveur ne bouge pas
    const sansTemple = rechargerApres(OFFLINE_CAP_MS, { ...socle(), faveur: 17 })
    expect(sansTemple.faveur).toBe(17)
  })

  it('ne fabrique rien quand la sauvegarde vient du futur', () => {
    /*
     * Un joueur qui remet son horloge en arrière (ou une machine qui se
     * resynchronise) relit une sauvegarde postérieure au présent. Sans le
     * plancher à zéro sur `dt`, l'écart négatif retirerait des ressources et
     * ferait reculer les chantiers - une partie détruite par un fuseau horaire.
     */
    const s = rechargerApres(-3_600_000, socle())
    expect(s.offlineSummary).toBeNull()
    expect(s.resources).toEqual({ bois: 100, pierre: 100, grain: 100, bronze: 100 })
    expect(s.faveur).toBe(0)
  })
})

describe('assauts nocturnes', () => {
  it('applique à la lettre les pertes et les dégâts de l’assaut échu', () => {
    const now = Date.now()
    // combat volontairement serré : la garnison l'emporte mais y laisse des
    // hommes. Une victoire écrasante ne prouverait rien - avec zéro perte, on
    // pourrait supprimer l'application des pertes sans que rien ne rougisse.
    const vague: WaveUnit[] = [{ enemy: 'guerrier', count: 9 }]
    const army = { lancier: 10, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 }
    const attendu = resoudreHorsLigne(vague, army, 1, WALL_HP[1], 0)
    expect(attendu.victoire).toBe(true)
    const tombes = attendu.pertes.lancier ?? 0
    expect(tombes).toBeGreaterThan(0)

    const s = rechargerApres(90_000, {
      ...socle(),
      buildings: niveaux({ agora: 2, remparts: 1 }),
      wallHp: WALL_HP[1],
      army,
      incomingWave: vague,
      incomingFronts: ['porte', 'sud'],
      defRecompense: { bronze: 30, faveur: 8, bonus: false },
      warned: true,
      nextAttackAt: now - 5_000,
    })

    expect(s.stats.repousses).toBe(1)
    expect(s.stats.perdus).toBe(0)
    // la garnison paie le prix exact annoncé par le résolveur
    expect(s.army.lancier).toBe(10 - tombes)
    expect(s.wallHp).toBe(WALL_HP[1] - attendu.degatsRemparts)
    expect(s.wallHp).toBeGreaterThan(0)
    expect(s.wallHp).toBeLessThanOrEqual(murMax(s))
    // porte tenue : pas de brèche à dessiner, pas de pillage, pas de deuil
    expect(s.brechesMur).toEqual([])
    expect(s.resources.bronze).toBe(100)
    expect(s.moraleMods).toEqual([])

    // l'alerte est entièrement consommée : au réveil, ce n'est plus « une vague
    // approche » - sinon la carte garderait ses flèches sur des fronts fantômes
    expect(s.incomingWave).toBeNull()
    expect(s.incomingFronts).toBeNull()
    expect(s.defRecompense).toBeNull()
    expect(s.warned).toBe(false)
    /*
     * Le prochain assaut est reporté par la boucle hors-ligne, dans la fenêtre
     * normale de 8 à 16 minutes. Se contenter de « plus tard que maintenant »
     * ne prouverait rien : le garde-fou de `init` repousse de toute façon une
     * échéance restée dans le passé.
     */
    expect(s.nextAttackAt).toBeGreaterThanOrEqual(now - 5_000 + ASSAUT_MIN_MS)
    expect(s.nextAttackAt).toBeLessThan(now - 5_000 + ASSAUT_MAX_MS)
  })

  it('ne résout jamais plus de trois assauts, et montre par où ils sont entrés', () => {
    const now = Date.now()
    const s = rechargerApres(OFFLINE_CAP_MS, {
      ...socle(),
      // village vieux et gras : la menace est au maximum, les vagues énormes,
      // et sans un seul soldat la palissade tombe à chaque fois
      createdAt: now - 20 * 3_600_000,
      buildings: niveaux({ agora: 2, remparts: 1 }),
      wallHp: WALL_HP[1],
      nextAttackAt: now - OFFLINE_CAP_MS,
    })

    // huit heures laisseraient passer une trentaine de vagues : on s'arrête à 3
    expect(s.stats.perdus).toBe(3)
    expect(s.stats.repousses).toBe(0)
    expect(s.offlineSummary!.filter((l) => l.includes('Assaut nocturne'))).toHaveLength(3)
    expect(s.offlineSummary!.some((l) => l.includes('pillé'))).toBe(true)

    // la porte a cédé : la brèche reste ouverte jusqu'à réparation
    expect(s.wallHp).toBe(0)
    expect(s.brechesMur).toEqual([0])

    const deuils = s.moraleMods.filter((m) => m.label === 'Pillé pendant la nuit')
    expect(deuils).toHaveLength(3)
    for (const d of deuils) expect(d.delta).toBe(-10)
    /*
     * Le moral lui-même n'est PAS recalculé hors-ligne (store.ts:1398 ne rappelle
     * jamais `calcMorale`) : les trois pénalités ne se feront sentir qu'au premier
     * battement d'horloge. Comportement RÉEL, divergence connue - voir le rapport.
     */
    expect(s.morale).toBe(52)

    /*
     * Trois pillages de 30 % sur un bronze que rien ne produit ici (ni forge ni
     * port) : 100 → 70 → 49 → 35. Chaque assaut manquant se verrait au centime.
     */
    expect(s.resources.bronze).toBe(35)

    // et l'on ne se réveille jamais avec un assaut déjà dû : `init` repousse
    // d'une minute l'échéance restée loin derrière
    expect(s.nextAttackAt).toBeGreaterThanOrEqual(now + 60_000)
    expect(s.nextAttackAt).toBeLessThan(now + 65_000)
  })
})

describe('famine et désertion au réveil', () => {
  it('fait payer au moral la famine survenue pendant l’absence', () => {
    /*
     * `simulerHorsLigne` ne recalcule pas le moral : c'est le premier battement
     * d'horloge qui constate le grenier vide et retranche ses vingt points. On
     * éprouve donc la chaîne complète - absence, puis réveil - sur deux villages
     * qui ne diffèrent que par le contenu de leur grenier.
     */
    const garnison = { lancier: 40, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 }
    const village = { ...socle(), army: garnison }

    rechargerApres(60_000, { ...village, resources: { bois: 50, pierre: 50, grain: 2, bronze: 0 } })
    expect(useGame.getState().resources.grain).toBe(0)
    useGame.getState().tick()
    const moralAffame = useGame.getState().morale

    rechargerApres(60_000, { ...village, resources: { bois: 50, pierre: 50, grain: 600, bronze: 0 } })
    expect(useGame.getState().resources.grain).toBeGreaterThan(0)
    useGame.getState().tick()
    const moralNourri = useGame.getState().morale

    // 50 de base + 2 par niveau d'agora (4 ici) = 58, et la famine en coûte 20
    expect(moralNourri).toBe(58)
    expect(moralAffame).toBe(38)
  })

  it('ne coûte jamais un soldat à l’absence - la désertion attend le réveil', () => {
    /*
     * Le compte à rebours de désertion n'existe que dans le tick. Une nuit
     * entière de moral à zéro ne fait donc perdre personne : c'est le
     * comportement RÉEL, et une divergence connue avec la consigne (voir le
     * rapport). Ce test le verrouille dans les deux sens - rien pendant
     * l'absence, puis la mécanique complète au réveil.
     */
    const s = rechargerApres(OFFLINE_CAP_MS, {
      ...socle(),
      resources: { bois: 100, pierre: 100, grain: 600, bronze: 100 },
      army: { lancier: 0, archer: 0, hoplite: 5, frondeur: 0, peltaste: 0, belier: 0, char: 0 },
      moraleMods: [{ id: 'm-deuil', label: 'Deuil', delta: -80, expiresAt: null }],
    })
    // huit heures de désespoir, et pourtant la garnison est au complet
    expect(s.army.hoplite).toBe(5)
    expect(s.nextDesertAt).toBe(0)

    useGame.getState().tick()
    expect(useGame.getState().morale).toBe(0)
    // le compte à rebours s'arme d'abord : personne ne s'évapore au réveil
    expect(useGame.getState().nextDesertAt).toBeGreaterThan(Date.now())
    expect(useGame.getState().army.hoplite).toBe(5)

    useGame.setState({ nextDesertAt: Date.now() - 1 })
    useGame.getState().tick()
    expect(useGame.getState().army.hoplite).toBe(4)
    // et le joueur l'apprend, sinon la garnison fondrait en silence
    expect(useGame.getState().toasts.some((t) => t.msg.includes('déserte'))).toBe(true)
    // le compteur se réarme pour la désertion suivante
    expect(useGame.getState().nextDesertAt).toBeGreaterThan(Date.now())
  })
})

describe('résumé de l’absence', () => {
  it('se tait pour vingt-neuf secondes et parle pour trente et une', () => {
    const bref = rechargerApres(29_000, socle())
    // en deçà du seuil, la modale ne s'ouvre pas ET rien n'a poussé : une
    // absence non racontée ne doit pas non plus être créditée en douce
    expect(bref.offlineSummary).toBeNull()
    expect(bref.resources.bois).toBe(100)

    const juste = rechargerApres(31_000, socle())
    expect(juste.offlineSummary).not.toBeNull()
    expect(juste.resources.bois).toBeGreaterThan(100)
  })

  it('énumère ce qui a poussé, et rien d’autre', () => {
    const s = rechargerApres(3 * 60_000, socle())
    const lignes = s.offlineSummary!

    expect(lignes[0]).toContain('Pendant votre absence')
    expect(lignes[0]).toContain('3 min')
    // trois ressources ont bougé, une seule ligne chacune…
    expect(lignes.filter((l) => l.includes('bois'))).toHaveLength(1)
    expect(lignes.filter((l) => l.includes('pierre'))).toHaveLength(1)
    expect(lignes.filter((l) => l.includes('grain'))).toHaveLength(1)
    // …et le bronze, qui n'a pas bougé d'une unité, ne mérite pas sa ligne :
    // un résumé qui annonce « +0 🪙 » fait douter le joueur de tout le reste
    expect(lignes.some((l) => l.includes('bronze'))).toBe(false)
    expect(lignes).toHaveLength(4)
  })

  it('dit franchement que rien ne s’est passé quand le village a dormi en paix', () => {
    // greniers pleins à ras bord (agora 1 = 350), population au plafond, ni
    // chantier ni recrue ni assaut : aucune ligne ne peut être écrite
    const s = rechargerApres(2 * 60_000, {
      ...socle(),
      buildings: niveaux({ agora: 1 }),
      resources: { bois: STOCKAGE[1], pierre: STOCKAGE[1], grain: STOCKAGE[1], bronze: STOCKAGE[1] },
    })
    expect(s.offlineSummary).toHaveLength(2)
    expect(s.offlineSummary![1]).toContain('Rien à signaler')
  })
})

describe('chantiers, recrues et effets différés échus', () => {
  it('achève le chantier échu, laisse l’autre sur son échafaudage', () => {
    const now = Date.now()
    const buildings = niveaux({ agora: 2, remparts: 1 })
    buildings.remparts = { level: 1, targetLevel: 2, busyUntil: now - 60_000 }
    // second chantier, lui, à peine commencé : il doit être encore là au réveil
    buildings.caserne = { level: 0, targetLevel: 1, busyUntil: now + 3_600_000 }
    const s = rechargerApres(10 * 60_000, { ...socle(), buildings, wallHp: 30, brechesMur: [0] })

    expect(s.buildings.remparts.level).toBe(2)
    expect(s.buildings.remparts.targetLevel).toBeUndefined()
    expect(s.buildings.remparts.busyUntil).toBeUndefined()
    expect(s.offlineSummary!.some((l) => l.includes('Remparts achevé(e) au niveau 2'))).toBe(true)
    // muraille neuve : tous ses points, y compris l'épaississement d'un héros
    expect(s.wallHp).toBe(murMax(s))
    expect(s.wallHp).toBe(WALL_HP[2])
    /*
     * Comportement RÉEL, et divergence connue avec le tick (store.ts:1660, qui
     * vide `brechesMur` en même temps) : un rempart achevé hors-ligne retrouve
     * tous ses points mais garde ses brèches à l'écran. Voir le rapport.
     */
    expect(s.brechesMur).toEqual([0])

    expect(s.buildings.caserne.level).toBe(0)
    expect(s.buildings.caserne.targetLevel).toBe(1)
    expect(s.buildings.caserne.busyUntil).toBeGreaterThan(now)
    expect(s.offlineSummary!.some((l) => l.includes('Caserne'))).toBe(false)
  })

  it('sort de la caserne les recrues formées, et seulement celles-là', () => {
    const now = Date.now()
    const s = rechargerApres(20 * 60_000, {
      ...socle(),
      buildings: niveaux({ agora: 2, caserne: 2 }),
      army: { lancier: 1, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 },
      recruitQueue: [
        // fournée entièrement écoulée : les trois lanciers sortent, la ligne part
        { unit: 'lancier', restant: 3, finishAt: now - 15 * 60_000 },
        /*
         * Fournée à cheval sur le réveil : un archer se forme en 26 s, la file
         * était échue depuis 30 s. Deux archers doivent donc sortir (à −30 s puis
         * à −4 s) et le troisième attendre l'échéance suivante. C'est ce qui
         * vérifie le report d'échéance `finishAt += temps de formation` : sans
         * lui, les cinq archers sortiraient d'un bloc.
         */
        { unit: 'archer', restant: 5, finishAt: now - 30_000 },
      ],
    })

    expect(s.army.lancier).toBe(4)
    expect(s.army.archer).toBe(2)
    expect(s.recruitQueue).toHaveLength(1)
    expect(s.recruitQueue[0].unit).toBe('archer')
    expect(s.recruitQueue[0].restant).toBe(3)
    expect(s.recruitQueue[0].finishAt).toBeGreaterThan(now)
    expect(s.offlineSummary!.some((l) => l.includes('5 recrue'))).toBe(true)
  })

  it('déclenche les effets différés échus et garde les autres pour plus tard', () => {
    const now = Date.now()
    const s = rechargerApres(5 * 60_000, {
      ...socle(),
      buildings: niveaux({ agora: 3 }),
      resources: { bois: 10, pierre: 10, grain: 10, bronze: 0 },
      pendingEffects: [
        { at: now - 60_000, type: 'butin-troie' },
        { at: now + 3_600_000, type: 'trahison-refugies' },
      ],
    })

    // le butin de Troie tombe pendant la nuit : sans forge ni port, ces 120
    // pièces de bronze ne peuvent venir que de là
    expect(s.resources.bronze).toBe(120)
    expect(s.reports[0].titre).toBe('La gratitude de Troie')
    expect(s.reports[0].lignes.join(' ')).toContain('+120 🪙, +60 🌾')

    /*
     * L'effet à échéance lointaine est conservé INTACT. Le vérifier par ses
     * conséquences et non par sa seule présence dans la file : la trahison des
     * réfugiés emporte quatre habitants et vingt points de moral, on doit donc
     * retrouver le village entier.
     */
    expect(s.pendingEffects).toHaveLength(1)
    expect(s.pendingEffects[0].type).toBe('trahison-refugies')
    expect(s.pendingEffects[0].at).toBeGreaterThan(now)
    expect(s.pop).toBe(7)
    expect(s.moraleMods).toEqual([])
    expect(s.reports).toHaveLength(1)
  })

  it('fait naître des villageois sans dépasser ce que les maisons peuvent loger', () => {
    const nourri = rechargerApres(OFFLINE_CAP_MS, {
      ...socle(),
      buildings: niveaux({ agora: 3, maisons: 2 }),
      resources: { bois: 10, pierre: 10, grain: 400, bronze: 0 },
    })
    // huit heures donneraient 640 naissances : les maisons en arrêtent 15
    expect(nourri.pop).toBe(POP_CAP[2])
    expect(nourri.offlineSummary!.some((l) => l.includes(`+${POP_CAP[2] - 7} villageois`))).toBe(true)

    /*
     * Le même village le grenier vide : on ne fait pas d'enfants sur une
     * disette. Sans cette seconde moitié, on pourrait supprimer la condition
     * sur le grain sans qu'aucun test ne rougisse.
     */
    const affame = rechargerApres(OFFLINE_CAP_MS, {
      ...socle(),
      buildings: niveaux({ agora: 3, maisons: 2 }),
      resources: { bois: 10, pierre: 10, grain: 0, bronze: 0 },
      army: { lancier: 40, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 },
    })
    expect(affame.resources.grain).toBe(0)
    expect(affame.pop).toBe(7)
    expect(affame.offlineSummary!.some((l) => l.includes('villageois'))).toBe(false)
  })
})

describe('chargement de la sauvegarde', () => {
  it('recharge une sauvegarde de deux champs sans perdre le reste du village', () => {
    // c'est le contrat sur lequel repose scripts/captures.mjs : poser deux
    // champs, recharger, et retrouver une partie complète et jouable
    const now = Date.now()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pop: 12, faveur: 42 }))
    useGame.getState().init()
    const s = useGame.getState()

    expect(s.pop).toBe(12)
    expect(s.faveur).toBe(42)
    expect(Object.keys(s.buildings).sort()).toEqual([...BUILDING_IDS].sort())
    expect(s.buildings.agora.level).toBe(1)
    expect(Object.keys(s.heros).sort()).toEqual([...HERO_IDS].sort())
    // le village est jouable : de quoi bâtir, de quoi manger, un moral, et le
    // temps de souffler avant le premier assaut
    expect(s.resources).toEqual({ bois: 330, pierre: 180, grain: 220, bronze: 24 })
    expect(s.morale).toBe(52)
    expect(s.nextAttackAt).toBeGreaterThan(now + 6 * 60_000)
    // sans `lastSeen`, il n'y a pas d'absence à raconter
    expect(s.offlineSummary).toBeNull()
    // sans `tutoriel`, la partie est réputée commencée : les dilemmes peuvent tomber
    expect(s.tutorialDone).toBe(true)

    // et le disque contient de nouveau une sauvegarde entière
    const resauve = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as Partial<GameState>
    expect(resauve.pop).toBe(12)
    expect(Object.keys(resauve.buildings!).sort()).toEqual([...BUILDING_IDS].sort())
    expect(Object.keys(resauve.heros!).sort()).toEqual([...HERO_IDS].sort())
  })

  it('simule l’absence même sur une sauvegarde réduite à trois champs', () => {
    const now = Date.now()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lastSeen: now - 2 * 60_000, pop: 3, morale: 70 }))
    useGame.getState().init()
    const s = useGame.getState()

    expect(s.offlineSummary).not.toBeNull()
    /*
     * La cueillette tourne même sur un village entièrement neuf, et au moral
     * SAUVÉ (70 → ×1,025), pas à celui de l'état initial : 3,5 🪵/min × 1,025 ×
     * 1,05 de printemps, deux minutes durant.
     */
    expect(s.resources.bois).toBeCloseTo(330 + 3.5 * 1.025 * 1.05 * 2, 1)
    // deux minutes = deux naissances (une toutes les 45 s), et le champ sauvé
    // n'est pas écrasé - le moral n'est pas recalculé hors-ligne
    expect(s.pop).toBe(5)
    expect(s.morale).toBe(70)
    expect(s.lastSeen).toBeGreaterThanOrEqual(now)
  })

  it('reprend une sauvegarde de l’époque ILION et la migre sous la nouvelle clé', () => {
    /*
     * Le jeu s'est appelé ILION. Les parties de ces joueurs doivent survivre au
     * changement de nom : on lit l'ancienne clé, on réécrit sous la nouvelle, et
     * l'ancienne disparaît seulement APRÈS - jamais de fenêtre sans sauvegarde.
     */
    localStorage.setItem(ANCIEN_STORAGE_KEY, JSON.stringify({ pop: 9, faveur: 33, tours: 2 }))
    useGame.getState().init()
    const s = useGame.getState()

    expect(s.pop).toBe(9)
    expect(s.faveur).toBe(33)
    expect(s.tours).toBe(2)
    expect(localStorage.getItem(ANCIEN_STORAGE_KEY)).toBeNull()
    const migree = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as Partial<GameState>
    expect(migree.pop).toBe(9)
    expect(migree.tours).toBe(2)
  })

  it('repart sur une partie neuve plutôt que de planter sur une sauvegarde illisible', () => {
    localStorage.setItem(STORAGE_KEY, '{ceci n’est pas du JSON')
    // un état de jeu bien avancé, qui ne doit rien laisser derrière lui
    useGame.setState({ pop: 99, faveur: 88, tutoriel: 5, resources: { bois: 9, pierre: 9, grain: 9, bronze: 9 } })
    expect(() => useGame.getState().init()).not.toThrow()

    const s = useGame.getState()
    expect(s.pop).toBe(7)
    expect(s.faveur).toBe(10)
    expect(s.resources).toEqual({ bois: 330, pierre: 180, grain: 220, bronze: 24 })
    /*
     * Et l'on repose la question du mode : bac à sable ou campagne. C'est le
     * choix qui lance ensuite la leçon de Zeus ou l'acte I - d'où un tutoriel
     * encore à `null` à cet instant précis.
     */
    expect(s.mode).toBeNull()
    expect(s.tutoriel).toBeNull()
    expect(s.offlineSummary).toBeNull()
  })
})
