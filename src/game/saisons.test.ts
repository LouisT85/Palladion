import { describe, expect, it, vi } from 'vitest'
import sourceCaptures from '../../scripts/captures.mjs?raw'
import { BUILDING_IDS, DAY_MS, MODE_TEST } from './data'
import { JOURS_PAR_AN } from './hautsfaits'
import {
  BONUS_ORAGE_ZEUS,
  DUREE_METEO_MS,
  JOURS_PAR_SAISON,
  METEOS,
  PORT_HIVER,
  SAISONS,
  SAISON_IDS,
  anneeDe,
  modsBataille,
  multProduction,
  resumeCiel,
  saisonDe,
  tirerMeteo,
  type MeteoId,
  type SaisonId,
} from './saisons'
import { jourDe, merFermee, productionParMinute, stockageMax, useGame, type GameState } from './store'
import type { BuildingId, BuildingState, ResourceId, Villageois } from './types'

/*
 * Le calendrier est la seule horloge du jeu : l'équilibrage des récoltes, la
 * fermeture de la mer, les hauts faits d'ancienneté et jusqu'aux captures
 * d'écran reposent sur une unique hypothèse - la saison se déduit du nombre de
 * journées écoulées depuis la fondation. On la vérifie donc des deux côtés :
 * sur les fonctions pures de saisons.ts, puis sur le tick du store.
 *
 * Deux partis pris pour que ce fichier ne mente jamais :
 * - le tirage du ciel se teste avec `Math.random` sous contrôle, jamais en
 *   espérant qu'un millier de tirages tombe bien ;
 * - les tests du store figent `Date.now`, parce qu'un test du calendrier qui
 *   dépend de l'heure de la machine ne prouve rien.
 *
 * Note d'environnement : sous Vitest `import.meta.env.MODE` vaut 'test', donc
 * MODE_TEST est ACTIF - le tick repose les coffres au maximum à chaque battement
 * (store.ts, bloc « mode test : coffres pleins en permanence »). Aucun effet de
 * saison ne se lit donc dans le stock : les récoltes se testent par
 * `productionParMinute`, jamais par `resources`.
 */

const RES_IDS: ResourceId[] = ['bois', 'pierre', 'grain', 'bronze']
const METEO_IDS = Object.keys(METEOS) as MeteoId[]

/** multiplicateur de saison pour une ressource - absent = table incomplète, on veut le savoir */
function mult(saison: SaisonId, res: ResourceId): number {
  const v = SAISONS[saison].prod[res]
  if (v === undefined) throw new Error(`la saison ${saison} ne dit rien de la ressource ${res}`)
  return v
}

/** les saisons dont le pool contient ce ciel, dans l'ordre du calendrier */
function saisonsAvec(meteo: MeteoId): SaisonId[] {
  return SAISON_IDS.filter((id) => SAISONS[id].meteos.some((m) => m.id === meteo))
}

// ── Les quatre saisons ────────────────────────────────────────────────────────

describe('les quatre saisons', () => {
  it('pèsent sur les quatre ressources, sans jamais sortir de la fourchette jouable', () => {
    // une saison qui oublierait une ressource la laisserait silencieusement à ×1,
    // et un multiplicateur hors de [0,3 ; 2] rendrait une saison soit fatale soit
    // triviale : dans les deux cas l'équilibrage saute sans qu'on le voie
    for (const id of SAISON_IDS) {
      expect(Object.keys(SAISONS[id].prod).sort()).toEqual([...RES_IDS].sort())
      for (const r of RES_IDS) {
        expect(mult(id, r)).toBeGreaterThanOrEqual(0.3)
        expect(mult(id, r)).toBeLessThanOrEqual(2)
      }
      // `resumeRecoltes` (store.ts) tait tout écart de moins de 2 % : une saison
      // dont aucune ressource ne bouge afficherait « les récoltes suivent leur
      // cours » et ne serait, pour le joueur, qu'un changement de couleur
      expect(RES_IDS.some((r) => Math.abs(mult(id, r) - 1) >= 0.02)).toBe(true)
    }
    // quatre tables réellement différentes : un bloc recopié d'une saison à
    // l'autre (l'erreur classique de l'objet littéral) rougit ici
    expect(new Set(SAISON_IDS.map((id) => JSON.stringify(SAISONS[id].prod))).size).toBe(SAISON_IDS.length)
  })

  it('dessinent une année : l’automne nourrit, l’hiver affame', () => {
    // c'est toute la boucle de jeu - engranger à l'automne pour tenir l'hiver.
    // Un rééquilibrage qui inverserait cet ordre viderait la saison de son sens
    expect(mult('automne', 'grain')).toBeGreaterThan(mult('printemps', 'grain'))
    expect(mult('printemps', 'grain')).toBeGreaterThan(1)
    expect(mult('ete', 'grain')).toBeLessThan(1)
    expect(mult('hiver', 'grain')).toBeLessThan(mult('ete', 'grain'))
    // l'hiver est la seule saison qui rabote TOUT ; les trois autres laissent
    // toujours au joueur au moins un chantier rentable
    for (const r of RES_IDS) expect(mult('hiver', r)).toBeLessThan(1)
    for (const id of SAISON_IDS) {
      if (id === 'hiver') continue
      expect(RES_IDS.some((r) => mult(id, r) >= 1)).toBe(true)
    }
  })

  it('ne ferment la mer qu’en hiver', () => {
    // la mer fermée coupe les expéditions maritimes et bride le port : si une
    // deuxième saison se mettait à la fermer, la moitié de la carte deviendrait
    // inatteignable une année sur deux
    expect(SAISON_IDS.filter((id) => SAISONS[id].merFermee)).toEqual(['hiver'])
    expect(merFermee({ saison: 'hiver' })).toBe(true)
    for (const id of SAISON_IDS) {
      if (id !== 'hiver') expect(merFermee({ saison: id })).toBe(false)
    }
  })

  it('annoncent des poids de météo qui se lisent comme des pourcentages', () => {
    // les poids sont écrits à la main comme des pourcentages (ils totalisent 100) :
    // ajouter une météo sans retoucher les autres décalerait tout le tirage
    for (const id of SAISON_IDS) {
      const pool = SAISONS[id].meteos
      expect(pool.length).toBeGreaterThanOrEqual(3)
      expect(pool.reduce((a, m) => a + m.poids, 0)).toBe(100)
      expect(new Set(pool.map((m) => m.id)).size).toBe(pool.length)
      for (const m of pool) {
        expect(METEO_IDS).toContain(m.id)
        expect(m.poids).toBeGreaterThan(0)
      }
    }
    // aucune météo ne doit rester lettre morte : les six sont écrites, décrites
    // et illustrées, il faut donc que les six soient tirables quelque part
    expect(new Set(SAISON_IDS.flatMap((id) => SAISONS[id].meteos.map((m) => m.id)))).toEqual(new Set(METEO_IDS))
  })

  it('gardent chacune sa signature de ciel - et laissent toujours une éclaircie', () => {
    // le temps clair est la respiration du joueur : une saison sans lui serait
    // une punition continue de quatre journées
    expect(saisonsAvec('clair')).toEqual(SAISON_IDS)
    // deux ciels sont la signature d'une saison et ne doivent pas fuir ailleurs
    expect(saisonsAvec('neige')).toEqual(['hiver'])
    expect(saisonsAvec('canicule')).toEqual(['ete'])
    /*
     * L'orage est le seul mauvais temps qui RAPPORTE quelque chose : la foudre de
     * Zeus y frappe plus lourd (store.ts, bénédiction de Zeus). Il doit donc
     * rester tirable - et le rester hors de l'hiver, la saison où l'on n'a
     * justement pas de quoi payer une bénédiction.
     */
    expect(saisonsAvec('orage')).toEqual(['printemps', 'ete', 'automne'])
    expect(BONUS_ORAGE_ZEUS).toBeGreaterThan(1)
  })

  it('portent chacune une ambiance complète et distincte pour la carte', () => {
    // la carte lit teinte/feuillage sans garde-fou : une valeur vide donnerait un
    // hiver transparent ou un feuillage noir, et ça ne se voit qu'à l'écran
    for (const id of SAISON_IDS) {
      const s = SAISONS[id]
      expect(s.id).toBe(id)
      expect(s.nom.length).toBeGreaterThan(0)
      expect(s.emoji.length).toBeGreaterThan(0)
      expect(s.desc.length).toBeGreaterThan(20)
      expect(s.teinte).toMatch(/^#[0-9a-f]{6}$/i)
      expect(s.feuillage).toMatch(/^#[0-9a-f]{6}$/i)
      expect(s.teinteOpacite).toBeGreaterThan(0)
      expect(s.teinteOpacite).toBeLessThanOrEqual(0.2)
    }
    // quatre ambiances qui se ressemblent, c'est une année qui ne se voit plus :
    // teintes, feuillages et intitulés doivent tous différer d'une saison à l'autre
    for (const cle of ['nom', 'desc', 'teinte', 'feuillage'] as const) {
      expect(new Set(SAISON_IDS.map((id) => SAISONS[id][cle])).size).toBe(SAISON_IDS.length)
    }
    // l'hiver est le plus délavé, STRICTEMENT : c'est ce qui rend la saison
    // lisible d'un coup d'œil, une égalité suffirait à brouiller le repère
    for (const id of SAISON_IDS) {
      if (id !== 'hiver') expect(SAISONS.hiver.teinteOpacite).toBeGreaterThan(SAISONS[id].teinteOpacite)
    }
  })
})

// ── Le tirage du ciel ─────────────────────────────────────────────────────────

/**
 * Charnières du tirage, saison par saison : `tirerMeteo` parcourt le pool en
 * retranchant les poids de `Math.random() × 100`. On se place de part et d'autre
 * de chaque cumul (50 %, 80 %, 92 %… pour le printemps) à un dix-millième près :
 * un poids retouché, un pool réordonné ou un `<` mis pour un `<=` déplace au
 * moins une de ces frontières.
 */
const CHARNIERES: Record<SaisonId, [number, MeteoId][]> = {
  printemps: [
    [0, 'clair'],
    [0.4999, 'clair'],
    // 0,5 × 100 tombe sur 50 au bit près : le seul point du tableau qui atteint
    // exactement un cumul, donc le seul qui distingue `r <= 0` de `r < 0`. Le
    // créneau du temps clair est fermé à droite - un `<` le rognerait
    [0.5, 'clair'],
    [0.5001, 'pluie'],
    [0.7999, 'pluie'],
    [0.8001, 'brume'],
    [0.9199, 'brume'],
    [0.9201, 'orage'],
    [0.9999, 'orage'],
  ],
  ete: [
    [0, 'clair'],
    [0.5499, 'clair'],
    [0.5501, 'canicule'],
    [0.8299, 'canicule'],
    [0.8301, 'orage'],
    [0.9499, 'orage'],
    [0.9501, 'brume'],
    [0.9999, 'brume'],
  ],
  automne: [
    [0, 'clair'],
    [0.3499, 'clair'],
    [0.3501, 'pluie'],
    [0.6899, 'pluie'],
    [0.6901, 'brume'],
    [0.8899, 'brume'],
    [0.8901, 'orage'],
    [0.9999, 'orage'],
  ],
  hiver: [
    [0, 'neige'],
    [0.3799, 'neige'],
    [0.3801, 'brume'],
    [0.6499, 'brume'],
    [0.6501, 'pluie'],
    [0.8499, 'pluie'],
    [0.8501, 'clair'],
    [0.9999, 'clair'],
  ],
}

describe('tirage de la météo', () => {
  it('respecte les poids de chaque saison, borne par borne', () => {
    const alea = vi.spyOn(Math, 'random')
    for (const id of SAISON_IDS) {
      const cas = CHARNIERES[id]
      // le tableau de charnières doit couvrir TOUT le pool : sans cette garde, on
      // pourrait ajouter une météo à une saison sans jamais tester son créneau
      expect(new Set(cas.map(([, m]) => m))).toEqual(new Set(SAISONS[id].meteos.map((m) => m.id)))
      for (const [r, attendu] of cas) {
        alea.mockReturnValue(r)
        expect(tirerMeteo(id), `${id} à ${r}`).toBe(attendu)
      }
    }
  })
})

// ── Les six météos ────────────────────────────────────────────────────────────

describe('les six météos', () => {
  it('sont toutes décrites au joueur, jusque dans le résumé du HUD', () => {
    // la description part telle quelle dans le toast et dans `resumeCiel` : une
    // météo muette donnerait un bandeau vide au moment où le ciel change
    expect(METEO_IDS).toHaveLength(6)
    for (const id of METEO_IDS) {
      const m = METEOS[id]
      expect(m.id).toBe(id)
      expect(m.nom.length).toBeGreaterThan(0)
      expect(m.emoji.length).toBeGreaterThan(0)
      expect(m.desc.length).toBeGreaterThan(20)
      expect(m.desc.endsWith('.')).toBe(true)
    }
    // six ciels, six textes : un bloc recopié rendrait deux météos indiscernables
    for (const cle of ['nom', 'desc', 'emoji'] as const) {
      expect(new Set(METEO_IDS.map((id) => METEOS[id][cle])).size).toBe(METEO_IDS.length)
    }
    // le résumé se lit « saison · météo - ce que ça coûte » : la saison d'abord,
    // la description du ciel en dernier. Intervertir les deux arguments donnerait
    // « Neige · Hiver », que le HUD affiche tel quel
    const txt = resumeCiel('hiver', 'neige')
    expect(txt.startsWith(`${SAISONS.hiver.emoji} ${SAISONS.hiver.nom}`)).toBe(true)
    expect(txt.endsWith(METEOS.neige.desc)).toBe(true)
    expect(txt).toContain(METEOS.neige.nom)
    // et les 24 croisements donnent 24 phrases différentes : un argument ignoré
    // ferait s'effondrer ce compte
    const phrases = SAISON_IDS.flatMap((s) => METEO_IDS.map((m) => resumeCiel(s, m)))
    expect(new Set(phrases).size).toBe(SAISON_IDS.length * METEO_IDS.length)
  })

  it('gênent toujours, jamais elles n’avantagent - sauf le temps clair, neutre', () => {
    // la météo est une contrainte : si un multiplicateur passait au-dessus de 1,
    // le joueur aurait intérêt à attendre le mauvais temps pour attaquer
    for (const id of METEO_IDS) {
      const m = METEOS[id]
      expect(m.prod).toBeGreaterThanOrEqual(0.6)
      expect(m.prod).toBeLessThanOrEqual(1)
      for (const v of [m.portee, m.vitesse, m.tir]) {
        expect(v).toBeGreaterThanOrEqual(0.5)
        expect(v).toBeLessThanOrEqual(1)
      }
      expect(m.alerte).toBeGreaterThanOrEqual(0.5)
      expect(m.alerte).toBeLessThanOrEqual(1.2)
    }
    const neutre = (id: MeteoId): boolean => {
      const m = METEOS[id]
      return [m.prod, m.portee, m.vitesse, m.tir, m.alerte].every((v) => v === 1)
    }
    expect(METEO_IDS.filter(neutre)).toEqual(['clair'])
    // le temps clair est aussi le seul à ne rien coûter à la production…
    expect(METEO_IDS.filter((id) => METEOS[id].prod >= 1)).toEqual(['clair'])
    // … et la neige la seule à dépasser 1 où que ce soit : l'alerte, parce que la
    // neige trahit une colonne en marche. Une autre météo au-dessus de 1 serait
    // un cadeau déguisé
    expect(METEO_IDS.filter((id) => METEOS[id].alerte > 1)).toEqual(['neige'])
  })

  it('tiennent la promesse de leur description : la brume aveugle, la neige englue', () => {
    /** le pire ciel pour ce levier - et il doit être seul à ce niveau */
    const pireSeul = (cle: 'portee' | 'vitesse' | 'alerte'): MeteoId => {
      const mini = Math.min(...METEO_IDS.map((id) => METEOS[id][cle]))
      const exaequo = METEO_IDS.filter((id) => METEOS[id][cle] === mini)
      expect(exaequo, `deux ciels également pires pour ${cle}`).toHaveLength(1)
      return exaequo[0]
    }
    // « on ne voit pas à vingt pas » : la brume doit rester le pire des ciels pour
    // la portée ET pour l'alerte, sinon sa description ment au joueur
    expect(pireSeul('portee')).toBe('brume')
    expect(pireSeul('alerte')).toBe('brume')
    // en revanche elle ne ralentit personne : on y voit mal, on n'y patauge pas
    expect(METEOS.brume.vitesse).toBe(1)
    // « les colonnes avancent au pas » : c'est la neige qui ralentit le plus
    expect(pireSeul('vitesse')).toBe('neige')
  })

  it('ne passent à la bataille que les trois leviers du combat', () => {
    // les trois valeurs de la pluie sont distinctes : deux champs intervertis dans
    // `modsBataille` ne pourraient pas passer inaperçus
    expect(new Set([METEOS.pluie.portee, METEOS.pluie.vitesse, METEOS.pluie.tir]).size).toBe(3)
    expect(modsBataille('pluie')).toEqual({
      portee: METEOS.pluie.portee,
      vitesse: METEOS.pluie.vitesse,
      tir: METEOS.pluie.tir,
    })
    // `toEqual` interdit tout champ de plus : ni `prod` ni `alerte` n'ont à peser
    // sur le déroulé d'un assaut, et cela vaut pour les six ciels
    for (const id of METEO_IDS) {
      expect(Object.keys(modsBataille(id)).sort()).toEqual(['portee', 'tir', 'vitesse'])
    }
  })

  it('se croisent avec la saison sur toutes les ressources', () => {
    expect(multProduction('hiver', 'neige', 'grain')).toBeCloseTo(0.35, 5)
    expect(multProduction('automne', 'clair', 'grain')).toBeCloseTo(1.45, 5)
    // le ciel s'applique à TOUTES les ressources dans la même proportion : une
    // météo qui ne toucherait plus que les moissons rendrait la pluie indolore
    for (const r of RES_IDS) {
      const clair = multProduction('printemps', 'clair', r)
      expect(multProduction('printemps', 'pluie', r) / clair).toBeCloseTo(METEOS.pluie.prod, 5)
      expect(clair).toBeCloseTo(mult('printemps', r), 5)
    }
  })
})

// ── Le calendrier ─────────────────────────────────────────────────────────────

/**
 * La table de vérité du calendrier : deux années pleines, indexées par le nombre
 * de journées ÉCOULÉES depuis la fondation (0 = jour de la fondation). C'est
 * exactement l'hypothèse `floor(jour / 4) % 4` sur laquelle repose
 * scripts/captures.mjs pour poser ses états.
 */
const DEUX_ANNEES: SaisonId[] = [
  'printemps', 'printemps', 'printemps', 'printemps',
  'ete', 'ete', 'ete', 'ete',
  'automne', 'automne', 'automne', 'automne',
  'hiver', 'hiver', 'hiver', 'hiver',
  'printemps', 'printemps', 'printemps', 'printemps',
  'ete', 'ete', 'ete', 'ete',
  'automne', 'automne', 'automne', 'automne',
  'hiver', 'hiver', 'hiver', 'hiver',
]

/**
 * Journées charnières sur deux ans : la PREMIÈRE et la DERNIÈRE de chacune des
 * huit saisons. Les deux bords comptent - n'éprouver que les premières laisserait
 * passer un `+ 1` glissé dans le calcul du store (la veille du basculement est le
 * seul endroit où un décalage d'une journée se voit).
 */
const CHARNIERES_DU_STORE = [0, 3, 4, 7, 8, 11, 12, 15, 16, 19, 20, 23, 24, 27, 28, 31]

/** échéance de météo volontairement dépareillée : seule une vraie replanification y répond */
const ECHEANCE_BIDON = 12_345

/** horodatage figé : le calendrier se lit sur `createdAt`, jamais sur l'heure de la machine */
const T0 = 1_712_000_000_000

/** `Date.now` sous contrôle - sinon un tick lent suffirait à changer de journée */
function figerHorloge(): void {
  if (Date.now() !== T0) vi.spyOn(Date, 'now').mockReturnValue(T0)
}

/** niveaux de bâtiments complets, pour ne décrire que ceux qui comptent */
function niveaux(voulus: Partial<Record<BuildingId, number>>): Record<BuildingId, BuildingState> {
  const b = {} as Record<BuildingId, BuildingState>
  for (const id of BUILDING_IDS) b[id] = { level: voulus[id] ?? 0 }
  return b
}

/**
 * Pose une partie muette d'un âge donné (en journées de jeu) : ni assaut, ni
 * dilemme, ni appel au secours ne doivent venir troubler l'observation du seul
 * calendrier. `reset()` remet l'état à neuf entre deux cas.
 */
function poserPartie(joursEcoules: number, champs: Partial<GameState> = {}): void {
  figerHorloge()
  useGame.getState().reset()
  const now = Date.now()
  useGame.setState({
    createdAt: now - Math.round(joursEcoules * DAY_MS),
    lastSeen: now,
    nextAttackAt: now + 60 * 60_000,
    prochainAppelAt: now + 60 * 60_000,
    lastEventAt: now,
    meteoJusqua: now + DUREE_METEO_MS,
    reports: [],
    toasts: [],
    ...champs,
  })
}

/** les bandeaux « Automne sur la Troade » - ceux que les captures ne veulent pas voir */
function bandeauxSaison(): string[] {
  return useGame
    .getState()
    .reports.filter((r) => r.titre.endsWith('sur la Troade'))
    .map((r) => r.titre)
}

describe('calendrier', () => {
  it('cale l’horloge des saisons et du ciel sur la journée de jeu', () => {
    // ces constantes vivent dans trois fichiers différents et doivent rester
    // d'accord : deux météos par journée, quatre journées par saison, seize par an
    expect(DUREE_METEO_MS * 2).toBe(DAY_MS)
    // JOURS_PAR_AN est recopié en dur dans hautsfaits.ts : allonger les saisons
    // sans le suivre décalerait silencieusement les hauts faits d'ancienneté
    expect(JOURS_PAR_AN).toBe(JOURS_PAR_SAISON * SAISON_IDS.length)
    // l'ordre des clés de SAISONS *est* l'ordre du calendrier (`saisonDe` indexe
    // SAISON_IDS) : réordonner l'objet littéral suffirait à mélanger l'année
    expect(SAISON_IDS).toEqual(['printemps', 'ete', 'automne', 'hiver'])
    expect(PORT_HIVER).toBeGreaterThan(0)
    expect(PORT_HIVER).toBeLessThan(1)
  })

  it('déroule printemps → été → automne → hiver sur deux années pleines', () => {
    expect(DEUX_ANNEES).toHaveLength(2 * JOURS_PAR_AN)
    DEUX_ANNEES.forEach((attendu, ecoules) => {
      expect(saisonDe(ecoules), `journée ${ecoules}`).toBe(attendu)
      expect(anneeDe(ecoules)).toBe(ecoules < JOURS_PAR_AN ? 1 : 2)
    })
    // et la troisième année repart bien au printemps
    expect(saisonDe(2 * JOURS_PAR_AN)).toBe('printemps')
    expect(anneeDe(2 * JOURS_PAR_AN)).toBe(3)

    /*
     * Comportement RÉEL, figé ici tel qu'il est et non tel qu'on le voudrait :
     * `saisonDe` ne se défend pas d'un jour négatif. `createdAt` et `lastSeen`
     * sont des horodatages absolus - une horloge système reculée, ou une
     * sauvegarde venue du futur, donne un nombre de journées négatif, l'index
     * sort de la table et la fonction rend `undefined`. Le store écrirait ce
     * `undefined` dans `s.saison`, et la première lecture de `SAISONS[s.saison]`
     * emporterait l'écran. Si un jour on borne l'entrée, ce test rougira : c'est
     * le signal qu'il faut le mettre à jour, pas le contourner.
     */
    expect(saisonDe(-1) as SaisonId | undefined).toBeUndefined()
    expect(anneeDe(-1)).toBe(0)
  })

  it('compte les journées à partir de 1 le jour de la fondation', () => {
    const t0 = 1_700_000_000_000
    expect(jourDe({ createdAt: t0, lastSeen: t0 })).toBe(1)
    expect(jourDe({ createdAt: t0, lastSeen: t0 + DAY_MS - 1 })).toBe(1)
    expect(jourDe({ createdAt: t0, lastSeen: t0 + DAY_MS })).toBe(2)
    expect(jourDe({ createdAt: t0, lastSeen: t0 + 4 * DAY_MS })).toBe(5)
    // ATTENTION : `jourDe` est le numéro AFFICHÉ (1 = fondation) alors que
    // `saisonDe`/`anneeDe` prennent le nombre de journées ÉCOULÉES. Le décalage
    // d'un cran est voulu et il faut le conserver : c'est lui qui fait que le
    // haut fait « Une année entière » (jour > JOURS_PAR_AN) tombe pile à l'entrée
    // dans la deuxième année
    for (let ecoules = 0; ecoules < 2 * JOURS_PAR_AN; ecoules++) {
      const jour = jourDe({ createdAt: t0, lastSeen: t0 + ecoules * DAY_MS })
      expect(jour).toBe(ecoules + 1)
      expect(jour > JOURS_PAR_AN).toBe(anneeDe(ecoules) >= 2)
    }
  })

  it('fait basculer la saison du store aux deux bords de chaque saison, sur deux ans', () => {
    // premier et dernier jour des huit saisons de deux années : à chacun, le tick
    // doit corriger la saison posée, tirer un ciel de la NOUVELLE saison et
    // reprogrammer la météo. Les journées du milieu sont couvertes par la table de
    // `saisonDe` - inutile de repasser trente-deux fois par le store
    vi.spyOn(Math, 'random').mockReturnValue(0) // tirage bloqué sur le premier ciel du pool
    for (const ecoules of CHARNIERES_DU_STORE) {
      const attendu = DEUX_ANNEES[ecoules]
      // on part volontairement d'une saison fausse : le tick doit la corriger
      poserPartie(ecoules + 0.3, {
        saison: attendu === 'hiver' ? 'ete' : 'hiver',
        meteoJusqua: T0 + ECHEANCE_BIDON,
      })
      useGame.getState().tick()
      const s = useGame.getState()
      expect(s.saison, `journée ${ecoules}`).toBe(attendu)
      expect(jourDe(s)).toBe(ecoules + 1)
      // la saison du store se relit avec l'index des journées écoulées, pas avec
      // le numéro affiché - le jour de garde de tout ce fichier
      expect(saisonDe(jourDe(s) - 1)).toBe(s.saison)
      /*
       * Le ciel du basculement est tiré dans la NOUVELLE saison, jamais dans
       * celle qu'on quitte : avec le tirage bloqué sur le premier du pool, on lit
       * exactement de quel pool il sort. Se contenter de « ce ciel existe dans la
       * nouvelle saison » ne prouverait rien - les pools se recouvrent largement
       * (le temps clair est partout).
       */
      expect(s.meteo, `journée ${ecoules}`).toBe(SAISONS[attendu].meteos[0].id)
      // et sa prochaine relève est reportée d'une demi-journée pleine, sinon le
      // ciel changerait à nouveau au premier battement suivant
      expect(s.meteoJusqua).toBe(s.lastSeen + DUREE_METEO_MS)
      // un seul bandeau : la bascule s'annonce une fois, pas à chaque tick
      expect(bandeauxSaison()).toEqual([`${SAISONS[attendu].nom} sur la Troade`])
    }
  })

  it('annonce le basculement avec ce qu’il coûte au village', () => {
    // le rapport est la seule explication que le joueur reçoive : il doit nommer
    // la saison, dire ce qu'elle change aux récoltes et prévenir pour la mer
    poserPartie(12.3, { saison: 'printemps' })
    useGame.getState().tick()
    const s = useGame.getState()
    expect(s.saison).toBe('hiver')
    const rapport = s.reports.find((r) => r.titre === 'Hiver sur la Troade')
    expect(rapport?.lignes.join(' ')).toContain('La mer se ferme')
    expect(rapport?.lignes.join(' ')).toContain('grain −50 %')
    expect(s.toasts.some((t) => t.msg === `${SAISONS.hiver.nom} - ${SAISONS.hiver.desc}`)).toBe(true)
  })

  it('fait tourner le ciel à l’heure dite, sans annoncer de saison', () => {
    /*
     * L'autre moitié de `tournerCiel`, celle que personne ne regarde : à saison
     * inchangée, la météo se retire quand `meteoJusqua` est passé - et seulement
     * à ce moment-là. Un `>` mis pour un `>=`, ou une échéance qu'on oublie de
     * reporter, ferait tirer un ciel neuf à chaque battement (quatre par seconde).
     */
    vi.spyOn(Math, 'random').mockReturnValue(0) // premier du pool d'hiver : la neige
    poserPartie(13.3, { saison: 'hiver', meteo: 'clair', meteoJusqua: T0 - 1 })
    useGame.getState().tick()
    const apres = useGame.getState()
    expect(apres.meteo).toBe('neige')
    expect(apres.meteoJusqua).toBe(apres.lastSeen + DUREE_METEO_MS)
    expect(apres.toasts.some((t) => t.msg.includes(METEOS.neige.nom))).toBe(true)
    // le ciel qui tourne n'est pas une saison qui change : aucun bandeau
    expect(bandeauxSaison()).toEqual([])

    // et tant que l'échéance n'est pas atteinte, le ciel ne bouge plus d'un pouce
    poserPartie(13.3, { saison: 'hiver', meteo: 'clair', meteoJusqua: T0 + 1 })
    useGame.getState().tick()
    expect(useGame.getState().meteo).toBe('clair')
  })

  it('crédite la traversée de l’hiver seulement si le grenier n’est pas vide', () => {
    // le haut fait « Le grand hiver » se joue à la sortie de l'hiver et nulle part
    // ailleurs : c'est le seul moment où l'état du grenier est encore observable,
    // car le mode test repose les coffres à ras bord juste après
    expect(MODE_TEST).toBe(true)
    poserPartie(JOURS_PAR_AN + 0.3, { saison: 'hiver', resources: { bois: 10, pierre: 10, grain: 42, bronze: 0 } })
    useGame.getState().tick()
    expect(useGame.getState().saison).toBe('printemps')
    expect(useGame.getState().exploits.hiverTraverse).toBe(1)

    poserPartie(JOURS_PAR_AN + 0.3, { saison: 'hiver', resources: { bois: 10, pierre: 10, grain: 0, bronze: 0 } })
    useGame.getState().tick()
    const s = useGame.getState()
    expect(s.saison).toBe('printemps')
    expect(s.exploits.hiverTraverse ?? 0).toBe(0)
    /*
     * Le grenier posé à zéro finit pourtant plein : c'est la preuve que le
     * calendrier tourne AVANT le remplissage du mode test. Si l'ordre s'inversait
     * dans le tick, ce haut fait deviendrait acquis d'office - et plus aucun test
     * de saison ne pourrait observer une ressource.
     */
    expect(s.resources.grain).toBe(stockageMax(s))
  })
})

// ── Ce que le script de captures suppose du calendrier ────────────────────────

describe('âges de scripts/captures.mjs', () => {
  /**
   * Le script pose un âge ET une saison. S'ils se contredisent, le premier tick
   * fait surgir un bandeau de saison en travers de la capture - et onze images du
   * README sont à refaire. On lit donc le script tel qu'il est sur le disque :
   * recopier ses valeurs ici ne protégerait rien.
   */
  const jourDuScript = sourceCaptures.match(/^const JOUR = (\d+) \* 60_000$/m)
  const blocAges = sourceCaptures.match(/^const AGE = \{([\s\S]*?)^\}/m)

  it('parle bien de la même journée que data.ts', () => {
    expect(jourDuScript, 'scripts/captures.mjs ne déclare plus `const JOUR = N * 60_000`').not.toBeNull()
    // le script recopie DAY_MS à la main (il tourne hors du bundle) : sa propre
    // note dit « doit suivre DAY_MS de data.ts », voici le garde-fou
    expect(Number(jourDuScript?.[1]) * 60_000).toBe(DAY_MS)
  })

  it('visent des saisons que le calendrier confirmera, matinée comprise', () => {
    expect(blocAges, 'scripts/captures.mjs ne déclare plus `const AGE = { … }`').not.toBeNull()
    const ages = [...(blocAges?.[1] ?? '').matchAll(/(\w+):\s*JOUR \* ([\d.]+)/g)].map((m) => ({
      cle: m[1],
      jours: Number(m[2]),
    }))
    expect(ages.length).toBeGreaterThanOrEqual(SAISON_IDS.length)

    const vues = new Set<SaisonId>()
    for (const { cle, jours } of ages) {
      const an = /An(\d+)$/.exec(cle)
      const attendue = cle.replace(/An\d+$/, '') as SaisonId
      expect(SAISON_IDS, `la clé ${cle} ne nomme aucune saison`).toContain(attendue)
      vues.add(attendue)
      const ecoules = Math.floor(jours)
      expect(saisonDe(ecoules), `${cle} = JOUR × ${jours}`).toBe(attendue)
      expect(anneeDe(ecoules)).toBe(an ? Number(an[1]) : 1)
      // la partie décimale est la phase du jour : en pleine matinée, loin des
      // bords, pour qu'une capture ne tombe ni à l'aube ni sur un basculement
      const matinee = jours - ecoules
      expect(matinee, `${cle} frôle un changement de journée`).toBeGreaterThan(0.1)
      expect(matinee).toBeLessThan(0.6)
    }
    // les quatre saisons doivent rester illustrées dans le README
    expect(vues).toEqual(new Set(SAISON_IDS))

    // et le store confirme : à chacun de ces âges, la saison posée par le script
    // tient bon et aucun bandeau ne vient s'inviter dans l'image
    for (const { cle, jours } of ages) {
      poserPartie(jours, { saison: cle.replace(/An\d+$/, '') as SaisonId })
      useGame.getState().tick()
      expect(useGame.getState().saison, cle).toBe(cle.replace(/An\d+$/, ''))
      expect(bandeauxSaison(), cle).toEqual([])
    }
  })
})

// ── Ce que la saison change vraiment à la récolte ─────────────────────────────

describe('récoltes au fil des saisons', () => {
  const ARTISANS: Villageois[] = [
    { id: 'v-ferme', nom: 'Dolios', poste: 'ferme', metier: 'ferme' },
    { id: 'v-scierie', nom: 'Élatos', poste: 'scierie', metier: 'scierie' },
    { id: 'v-carriere', nom: 'Sthénélos', poste: 'carriere', metier: 'carriere' },
    { id: 'v-forge', nom: 'Lycos', poste: 'forge', metier: 'forge' },
  ]
  const DOCKER: Villageois = { id: 'v-port', nom: 'Nestor', poste: 'port', metier: 'port' }

  /** production par minute d'un village donné, dans la saison donnée, ciel clair */
  function recolte(
    saison: SaisonId,
    batiments: Record<BuildingId, BuildingState>,
    equipe: Villageois[],
  ): Record<ResourceId, number> {
    poserPartie(0.3, { saison, meteo: 'clair', buildings: batiments, villageois: equipe, pop: equipe.length })
    return productionParMinute(useGame.getState(), Date.now())
  }

  it('applique à chaque ressource SON coefficient de saison, pas un facteur commun', () => {
    // quatre ateliers tenus par leur homme de métier : le rapport hiver/été doit
    // suivre la table saison par saison. Un facteur unique appliqué à tout - la
    // simplification qui guette `productionParMinute` - donnerait quatre rapports
    // identiques, et l'hiver cesserait d'être une saison à choix
    const village = niveaux({ agora: 2, ferme: 1, scierie: 1, carriere: 1, forge: 1 })
    const hiver = recolte('hiver', village, ARTISANS)
    const ete = recolte('ete', village, ARTISANS)
    const rapports = RES_IDS.map((r) => {
      expect(ete[r], `l'été ne produit pas de ${r}`).toBeGreaterThan(0)
      return hiver[r] / ete[r]
    })
    RES_IDS.forEach((r, i) => {
      expect(rapports[i], r).toBeCloseTo(mult('hiver', r) / mult('ete', r), 5)
    })
    expect(new Set(rapports.map((v) => v.toFixed(4))).size).toBe(RES_IDS.length)
  })

  it('ne laisse plus tourner le port qu’à une fraction pendant l’hiver', () => {
    // le quai est ici la seule source de bronze (la cueillette de base n'en donne
    // pas) : on lit donc directement la double peine de l'hiver - le coefficient
    // de saison comme tout le monde, PORT_HIVER en plus parce que les nefs
    // restent au mouillage. Si le facteur disparaissait de `productionParMinute`,
    // le port encaisserait exactement la même chose que la forge
    const quai = niveaux({ agora: 2, port: 2 })
    const portHiver = recolte('hiver', quai, [DOCKER]).bronze
    const portEte = recolte('ete', quai, [DOCKER]).bronze
    expect(portEte).toBeGreaterThan(0)

    const saisonSeule = mult('hiver', 'bronze') / mult('ete', 'bronze')
    expect(portHiver / portEte).toBeCloseTo(saisonSeule * PORT_HIVER, 5)
    expect(portHiver / portEte).toBeLessThan(saisonSeule)
  })
})
