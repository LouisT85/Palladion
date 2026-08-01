import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BUILDING_IDS,
  CONSO_POP,
  CONSO_SOLDAT,
  LOT_ECHANGE,
  METIER_IDS,
  MODE_TEST,
  POP_CAP,
  POSTES,
  RENDEMENT_HORS_METIER,
  STOCKAGE,
  WALL_HP,
} from './data'
import { METEOS, SAISONS, type SaisonId } from './saisons'
import {
  BATIMENTS_A_POSTES,
  candidatsPour,
  efficaciteDe,
  multMorale,
  murMax,
  peutPayer,
  popCap,
  postesPourvus,
  postesTotal,
  productionParMinute,
  rendement,
  stockageMax,
  tauxParMinute,
  useGame,
  type GameState,
} from './store'
import type { BuildingId, ResourceId, Villageois } from './types'

/*
 * L'économie du village. C'est la partie du jeu que le joueur regarde le plus
 * longtemps : une ligne de production fausse ne se voit pas tout de suite, mais
 * elle fausse tout l'équilibrage jusqu'à la fin de la partie. On teste donc
 * l'assiette de calcul (postes, métiers, ambiance, saison, entrepôt) plutôt que
 * les nombres affichés.
 *
 * Partage du travail avec les fichiers voisins, pour ne rien tester deux fois :
 * `saisons.test.ts` possède les tables de saison et de ciel (dont la fermeture
 * de la mer et le tiers du port en hiver), `horsligne.test.ts` la reprise de
 * partie et la faveur gagnée en dormant, `heros.test.ts` la table des passifs de
 * la maisonnée. Ici, ce qui reste : les postes, le rendement, l'aiguillage
 * atelier → ressource, les deux plafonds de l'entrepôt — et du passif d'Hector,
 * seulement le bout de la chaîne, là où le chantier de réparation s'en sert.
 */

// ── Outillage ────────────────────────────────────────────────────────────────
const RESSOURCES: ResourceId[] = ['bois', 'pierre', 'grain', 'bronze']

/** l'état tout neuf du store, capturé avant que le premier test n'y touche */
const ETAT_VIERGE = useGame.getState()

beforeEach(() => {
  useGame.setState(ETAT_VIERGE, true)
  localStorage.clear()
})

let compteur = 0
/** un habitant jetable : son métier de naissance, et éventuellement son poste */
function habitant(metier: BuildingId, poste: BuildingId | null = null): Villageois {
  compteur++
  return { id: `v${compteur}`, nom: `Habitant ${compteur}`, poste, metier }
}

/** une équipe complète d'ouvriers du métier, envoyée dans son propre atelier */
function equipe(metier: BuildingId, n: number): Villageois[] {
  return Array.from({ length: n }, () => habitant(metier, metier))
}

/** table de bâtiments complète — tout ce qui n'est pas cité reste à zéro */
function niveaux(patch: Partial<Record<BuildingId, number>>): GameState['buildings'] {
  const out = {} as GameState['buildings']
  for (const b of BUILDING_IDS) out[b] = { level: patch[b] ?? 0 }
  return out
}

/**
 * Pose un village dans un état parfaitement défini. Les valeurs par défaut sont
 * choisies neutres et SANS HORLOGE : `lastSeen` et `droughtUntil` sont figés, de
 * sorte qu'aucun test ne dépende du moment où la suite s'exécute, ni de celui
 * qui l'a précédé (les toasts sont remis à zéro pour la même raison).
 */
function poserVillage(patch: Partial<GameState>): GameState {
  useGame.setState({
    morale: 100,
    saison: 'ete',
    meteo: 'clair',
    droughtUntil: 0,
    createdAt: 0,
    lastSeen: 0,
    pop: 0,
    army: { lancier: 0, archer: 0, hoplite: 0 },
    villageois: [],
    buildings: niveaux({ agora: 1 }),
    resources: { bois: 0, pierre: 0, grain: 0, bronze: 0 },
    toasts: [],
    ...patch,
  })
  return useGame.getState()
}

function production(patch: Partial<GameState>, now = 0): Record<ResourceId, number> {
  return productionParMinute(poserVillage(patch), now)
}

/** le coefficient de saison tel que l'infobulle du HUD l'annonce au joueur */
function factSaison(saison: SaisonId, res: ResourceId): number {
  return SAISONS[saison].prod[res] ?? 1
}

/** le poste que tient cet habitant, relu dans le store et retrouvé par son id */
function posteDe(id: string): BuildingId | null {
  const v = useGame.getState().villageois.find((x) => x.id === id)
  if (!v) throw new Error(`habitant ${id} introuvable dans le store`)
  return v.poste
}

/** émoji du dernier toast — c'est par là que le joueur apprend un refus */
function dernierEmoji(): string | undefined {
  const t = useGame.getState().toasts
  return t[t.length - 1]?.emoji
}

/** Hector à notre table — recruté, et vivant */
function avecHector(): GameState['heros'] {
  const base = useGame.getState().heros
  return { ...base, hector: { ...base.hector, recrute: true, mort: false } }
}

// ── Le mode test change les règles : autant le dire tout de suite ────────────
describe('mode test', () => {
  it('accepte n’importe quelle dépense sous Vitest, et refuse le découvert dès qu’on l’éteint', async () => {
    /*
     * `import.meta.env.MODE` vaut « test » ici, donc MODE_TEST est vrai et le
     * trésor accepte tout. Ce n'est pas un détail : c'est la raison pour
     * laquelle les tests d'échange ci-dessous ne vérifient que la ressource
     * REÇUE. La vraie règle du découvert ne s'observe qu'en rechargeant le
     * module hors mode test — sans quoi elle ne serait vérifiée nulle part.
     */
    expect(MODE_TEST).toBe(true)
    expect(peutPayer({ bois: 0, pierre: 0, grain: 0, bronze: 0 }, { bois: 9_999 })).toBe(true)

    vi.stubEnv('MODE', 'production')
    try {
      vi.resetModules()
      const { peutPayer: peutPayerReel } = await import('./store')
      const coffre = { bois: 10, pierre: 5, grain: 0, bronze: 0 }
      // au centime près, c'est payable : le refus doit se jouer sur « < », pas sur « ≤ »
      expect(peutPayerReel(coffre, { bois: 10 })).toBe(true)
      expect(peutPayerReel(coffre, { bois: 11 })).toBe(false)
      // et une seule ligne insuffisante suffit à faire échouer tout le paiement
      expect(peutPayerReel(coffre, { bois: 5, pierre: 6 })).toBe(false)
      expect(peutPayerReel(coffre, { grain: 1 })).toBe(false)
    } finally {
      vi.unstubAllEnvs()
      vi.resetModules()
    }
  })
})

// ── Postes, métiers, rendement ───────────────────────────────────────────────
describe('postes de travail', () => {
  it('n’ouvre de postes que dans les six ateliers, et jamais moins en montant de niveau', () => {
    /*
     * Deux tables écrites à la main doivent rester d'accord : POSTES (combien de
     * bras) et METIERS (comment on les appelle). Un atelier à postes sans
     * intitulé de métier afficherait un poste anonyme dans le recensement, et un
     * métier sans postes donnerait un habitant qu'on ne peut affecter nulle part.
     */
    expect([...BATIMENTS_A_POSTES].sort()).toEqual([...METIER_IDS].sort())

    for (const b of BATIMENTS_A_POSTES) {
      const table = POSTES[b]
      if (!table) throw new Error(`POSTES ne dit rien de ${b}`)
      expect(table).toHaveLength(5)
      // un bâtiment pas encore bâti n'emploie personne, sinon il produirait sans exister
      expect(table[0]).toBe(0)
      expect(table[4]).toBeGreaterThan(0)
      // une table qui redescendrait mettrait un ouvrier à la rue à chaque montée de niveau
      for (let n = 1; n < table.length; n++) expect(table[n]).toBeGreaterThanOrEqual(table[n - 1])
    }

    // l'agora, les remparts, les maisons et la caserne n'emploient personne, même
    // au dernier niveau : y « affecter » un habitant inventerait un septième métier
    const cite = poserVillage({ buildings: niveaux({ agora: 4, remparts: 4, maisons: 4, caserne: 4 }) })
    for (const b of BUILDING_IDS) {
      if (BATIMENTS_A_POSTES.includes(b)) continue
      expect(postesTotal(cite, b)).toBe(0)
      expect(rendement(cite, b)).toBe(0)
    }
  })

  it('ne paie l’atelier qu’au prorata exact de ce que valent ses ouvriers', () => {
    const atelier = niveaux({ agora: 1, scierie: 1 }) // un unique poste
    const desert = production({ buildings: atelier }).bois
    const sansAtelier = production({ buildings: niveaux({ agora: 1 }) }).bois
    const plein = production({ buildings: atelier, villageois: [habitant('scierie', 'scierie')] }).bois
    const horsMetier = production({ buildings: atelier, villageois: [habitant('ferme', 'scierie')] }).bois

    /*
     * La règle qui donne tout son sens au recensement : un camp de bûcherons
     * désert produit EXACTEMENT autant qu'un village qui n'en a pas — et la
     * cueillette de base reste acquise, un village ruiné peut toujours se relever.
     */
    expect(desert).toBe(sansAtelier)
    expect(desert).toBeGreaterThan(0)
    /*
     * On mesure la part du bûcheronnage, pas la production totale : le paysan
     * envoyé à la scierie en rend exactement la fraction annoncée. C'est le seul
     * chiffre qui rende l'affectation manuelle intéressante à décider.
     */
    expect((horsMetier - desert) / (plein - desert)).toBeCloseTo(RENDEMENT_HORS_METIER, 5)
    expect(horsMetier).toBeGreaterThan(desert)
    expect(horsMetier).toBeLessThan(plein)
  })

  it('rend au prorata des postes tenus, sans jamais dépasser le plein', () => {
    const batiments = niveaux({ agora: 1, carriere: 4 })
    const etat = (villageois: Villageois[]) => poserVillage({ buildings: batiments, villageois })

    expect(postesTotal(etat([]), 'carriere')).toBe(4)
    // trois tailleurs sur quatre postes : trois quarts du rendement, pas plus
    expect(rendement(etat(equipe('carriere', 3)), 'carriere')).toBeCloseTo(0.75, 5)
    // quatre bras étrangers au métier : la carrière tourne à leur cadence à eux
    expect(rendement(etat([1, 2, 3, 4].map(() => habitant('ferme', 'carriere'))), 'carriere')).toBeCloseTo(
      RENDEMENT_HORS_METIER,
      5,
    )
    // moitié-moitié : entre les deux, et strictement — pas d'arrondi à l'entier
    const mixte = rendement(
      etat([...equipe('carriere', 2), habitant('ferme', 'carriere'), habitant('ferme', 'carriere')]),
      'carriere',
    )
    expect(mixte).toBeCloseTo((2 + 2 * RENDEMENT_HORS_METIER) / 4, 5)

    /*
     * Entasser cinq hommes sur quatre postes ne doit rien ajouter : sans le
     * plafond, un village surpeuplé produirait plus que ses ateliers ne peuvent
     * contenir, et l'agrandissement de la carrière ne servirait plus à rien.
     */
    const complet = etat(equipe('carriere', 4))
    expect(rendement(complet, 'carriere')).toBe(1)
    const surpeuple = etat(equipe('carriere', 5))
    expect(rendement(surpeuple, 'carriere')).toBe(1)
    expect(postesPourvus(surpeuple, 'carriere')).toBe(5) // les têtes sont bien comptées…
    expect(productionParMinute(surpeuple, 0).pierre).toBeCloseTo(productionParMinute(complet, 0).pierre, 10) // …sans payer davantage
  })

  it('chiffre ce que rend chaque habitant à son poste', () => {
    // le recensement affiche ce pourcentage habitant par habitant : c'est la
    // brique dont `rendement` fait la somme, et elle doit dire la même chose
    expect(efficaciteDe(habitant('carriere', null))).toBe(0)
    expect(efficaciteDe(habitant('carriere', 'carriere'))).toBe(1)
    expect(efficaciteDe(habitant('carriere', 'ferme'))).toBe(RENDEMENT_HORS_METIER)
  })

  it('propose d’abord tous ceux du bon métier, et jamais quelqu’un déjà au travail', () => {
    const s = poserVillage({
      buildings: niveaux({ agora: 1, carriere: 4 }),
      villageois: [
        habitant('ferme'),
        habitant('carriere'),
        habitant('scierie'),
        habitant('carriere'),
        habitant('carriere', 'carriere'),
      ],
    })
    const candidats = candidatsPour(s, 'carriere')

    // débaucher un homme d'un atelier pour en garnir un autre n'est pas au menu
    expect(candidats).toHaveLength(4)
    expect(candidats.every((v) => v.poste === null)).toBe(true)
    /*
     * Le panneau du bâtiment attrape `candidats[0]` d'un seul clic : les deux
     * tailleurs de pierre doivent donc passer devant les deux autres, et pas
     * seulement le premier trouvé — un comparateur qui n'en remonterait qu'un
     * enverrait un bûcheron à la carrière au deuxième clic.
     */
    expect(candidats.slice(0, 2).map((v) => v.metier)).toEqual(['carriere', 'carriere'])
  })

  it('refuse d’affecter à un poste inexistant ou déjà tenu, et le dit', () => {
    poserVillage({ buildings: niveaux({ agora: 1, ferme: 1 }), villageois: [habitant('ferme'), habitant('ferme')] })
    const [a, b] = useGame.getState().villageois

    // l'agora n'offre aucun poste : le refus doit être expliqué, pas silencieux
    useGame.getState().affecter(a.id, 'agora')
    expect(posteDe(a.id)).toBeNull()
    expect(dernierEmoji()).toBe('🚧')

    useGame.getState().affecter(a.id, 'ferme')
    expect(posteDe(a.id)).toBe('ferme')

    // la ferme de niveau 1 n'a qu'un seul poste : le second reste à la rue
    useGame.getState().affecter(b.id, 'ferme')
    expect(posteDe(b.id)).toBeNull()
    expect(dernierEmoji()).toBe('👥')
  })

  it('libère un poste sur demande, et le rend aussitôt disponible au suivant', () => {
    /*
     * Le panneau du bâtiment renvoie un ouvrier chez lui par `affecter(id, null)`.
     * Si cette branche cessait de vider le poste, le joueur se retrouverait avec
     * un atelier définitivement complet et un habitant qu'il croit oisif.
     */
    poserVillage({ buildings: niveaux({ agora: 1, ferme: 1 }), villageois: [habitant('ferme'), habitant('ferme')] })
    const [a, b] = useGame.getState().villageois

    useGame.getState().affecter(a.id, 'ferme')
    useGame.getState().affecter(b.id, 'ferme') // refusé : le champ est tenu
    expect(posteDe(b.id)).toBeNull()

    useGame.getState().affecter(a.id, null)
    expect(posteDe(a.id)).toBeNull()
    expect(postesPourvus(useGame.getState(), 'ferme')).toBe(0)

    useGame.getState().affecter(b.id, 'ferme')
    expect(posteDe(b.id)).toBe('ferme')
    expect(rendement(useGame.getState(), 'ferme')).toBe(1)
  })
})

// ── Aiguillage des ateliers et coefficients d'ambiance ───────────────────────
describe('ce que chaque atelier verse au coffre', () => {
  it('ne verse la récolte d’un atelier que dans SA ressource', () => {
    /*
     * Quatre lignes de calcul écrites côte à côte, chacune avec sa table de
     * production, son bâtiment et son coefficient : c'est l'endroit du jeu où
     * une ligne recopiée trop vite ferait produire du bois à la carrière sans
     * que rien ne s'en aperçoive. On vérifie donc l'aiguillage complet, atelier
     * par atelier : tout ce qui n'est pas la ressource visée doit rester
     * rigoureusement inchangé.
     */
    const ateliers: { batiment: BuildingId; res: ResourceId | null }[] = [
      { batiment: 'scierie', res: 'bois' },
      { batiment: 'carriere', res: 'pierre' },
      { batiment: 'ferme', res: 'grain' },
      { batiment: 'forge', res: 'bronze' },
      { batiment: 'port', res: 'bronze' },
      // le temple ne remplit aucun coffre : il ne rend que de la faveur
      { batiment: 'temple', res: null },
    ]

    const nu = production({ buildings: niveaux({ agora: 2 }) })
    // le bronze ne se ramasse pas par terre : il se fond ou s'achète
    expect(nu.bronze).toBe(0)
    for (const r of ['bois', 'pierre', 'grain'] as ResourceId[]) expect(nu[r]).toBeGreaterThan(0)

    for (const { batiment, res } of ateliers) {
      const patch: Partial<Record<BuildingId, number>> = { agora: 2 }
      patch[batiment] = 4
      const s = poserVillage({ buildings: niveaux(patch), villageois: equipe(batiment, 4) })
      // l'atelier tourne à plein : ce qui suit ne peut donc pas être un faux vert
      expect(rendement(s, batiment)).toBe(1)

      const prod = productionParMinute(s, 0)
      for (const r of RESSOURCES) {
        if (r === res) expect(prod[r]).toBeGreaterThan(nu[r])
        else expect(prod[r], `${batiment} ne doit rien changer au ${r}`).toBeCloseTo(nu[r], 10)
      }
    }
  })

  it('applique à chaque ressource le coefficient de SA propre ligne de saison', () => {
    /*
     * Les quatre coefficients de saison sont lus dans la même boucle : les
     * échanger deux à deux (bois ↔ pierre, par exemple) laisserait le total
     * plausible et les quatre ressources positives. Seul le rapport entre deux
     * saisons, ressource par ressource, attrape l'interversion — d'où le choix
     * du printemps contre l'été, dont les quatre rapports sont tous distincts.
     */
    const village = {
      buildings: niveaux({ agora: 2, ferme: 2, scierie: 2, carriere: 2, forge: 2 }),
      villageois: [...equipe('ferme', 2), ...equipe('scierie', 2), ...equipe('carriere', 2), ...equipe('forge', 1)],
    }
    const printemps = production({ ...village, saison: 'printemps' })
    const ete = production({ ...village, saison: 'ete' })

    for (const r of RESSOURCES) {
      expect(printemps[r]).toBeGreaterThan(0)
      expect(printemps[r] / ete[r], `coefficient de saison du ${r}`).toBeCloseTo(
        factSaison('printemps', r) / factSaison('ete', r),
        5,
      )
    }
  })

  it('multiplie saison, météo et ambiance — il ne les additionne pas', () => {
    /*
     * Le HUD annonce trois coefficients séparés dans l'infobulle de chaque
     * ressource. Le rapport entre deux villages identiques placés sous deux
     * ciels différents doit donc valoir exactement le PRODUIT des trois
     * rapports annoncés. Une somme, une moyenne ou un facteur oublié rougit ici.
     */
    const champs = { buildings: niveaux({ agora: 2, ferme: 2 }), villageois: equipe('ferme', 2) }
    const doux = production({ ...champs, morale: 40, saison: 'printemps', meteo: 'clair' }).grain
    const rude = production({ ...champs, morale: 90, saison: 'hiver', meteo: 'neige' }).grain

    expect(rude / doux).toBeCloseTo(
      (factSaison('hiver', 'grain') / factSaison('printemps', 'grain')) *
        (METEOS.neige.prod / METEOS.clair.prod) *
        (multMorale(90) / multMorale(40)),
      5,
    )
    // et l'hiver enneigé reste, dans l'absolu, une saison de disette
    expect(rude).toBeLessThan(doux)
  })

  it('laisse toujours la moitié des bras à un village démoralisé', () => {
    /*
     * L'ambiance est le seul coefficient que le joueur fait bouger lui-même, et
     * elle ne doit jamais fermer les ateliers : à zéro il reste la moitié de la
     * production, sinon un village au fond du trou n'aurait plus les moyens de
     * s'en sortir et la partie serait perdue sans être jouée.
     * (L'infobulle du HUD recopie ces deux nombres à la main — Hud.tsx : si
     * l'équilibrage change ici, il faut aller la corriger là-bas.)
     */
    expect(multMorale(0)).toBeCloseTo(0.5, 10)
    expect(multMorale(100)).toBeCloseTo(1.25, 10)
    for (let m = 10; m <= 100; m += 10) expect(multMorale(m)).toBeGreaterThan(multMorale(m - 10))
  })

  it('assèche les champs sans tarir la cueillette, et rend la pluie au bout du compte', () => {
    /*
     * La sécheresse (bénédiction contrariée, dilemme perdu) coupe la récolte en
     * deux. Elle ne doit toucher QUE la ferme : sinon un village sans champ se
     * retrouverait affamé par un événement qui ne le concerne pas. Et elle doit
     * FINIR : une comparaison inversée ou une échéance ignorée condamnerait la
     * partie à une disette perpétuelle.
     */
    const champs = {
      buildings: niveaux({ agora: 2, ferme: 4 }),
      villageois: equipe('ferme', 4),
      droughtUntil: 1_000,
    }
    const cueilletteSeule = production({ buildings: niveaux({ agora: 2 }) }).grain
    const recolte = production({ ...champs, droughtUntil: 0 }).grain
    const secheresse = production(champs, 0).grain
    // 2 000 ms : l'échéance est passée, la bénédiction contrariée a fini son œuvre
    const apresLaSecheresse = production(champs, 2_000).grain

    expect(cueilletteSeule).toBeGreaterThan(0)
    expect(secheresse - cueilletteSeule).toBeCloseTo((recolte - cueilletteSeule) / 2, 5)
    // la cueillette, elle, n'a rien perdu
    expect(secheresse).toBeGreaterThan(cueilletteSeule)
    // et l'échéance passée, les champs retrouvent tout
    expect(apresLaSecheresse).toBeCloseTo(recolte, 10)
  })
})

// ── Le taux net affiché au joueur ────────────────────────────────────────────
describe('taux net par minute', () => {
  it('ne retranche les bouches à nourrir qu’au grain', () => {
    const s = poserVillage({
      buildings: niveaux({ agora: 2, ferme: 2 }),
      villageois: equipe('ferme', 2),
      pop: 10,
      army: { lancier: 1, archer: 0, hoplite: 0 },
    })
    const brut = productionParMinute(s, s.lastSeen)
    const net = tauxParMinute(s)

    expect(net.bois).toBe(brut.bois)
    expect(net.pierre).toBe(brut.pierre)
    expect(net.bronze).toBe(brut.bronze)
    /*
     * Dix habitants et un soldat : les rations ne sont pas les mêmes, et les
     * deux constantes ne doivent pas être interverties — d'où un effectif civil
     * et un effectif militaire volontairement dissemblables.
     */
    expect(brut.grain - net.grain).toBeCloseTo(10 * CONSO_POP + 1 * CONSO_SOLDAT, 5)
  })

  it('passe sous zéro quand la garnison mange plus que les champs ne donnent', () => {
    const s = poserVillage({
      buildings: niveaux({ agora: 2 }), // pas un seul champ : rien que la cueillette
      pop: 20,
      army: { lancier: 0, archer: 0, hoplite: 30 },
    })
    const brut = productionParMinute(s, s.lastSeen).grain
    expect(brut).toBeGreaterThan(0)
    /*
     * Le HUD doit pouvoir afficher un taux rouge, sinon la famine arrive sans
     * prévenir : un `Math.max(0, …)` posé là par prudence rendrait le compteur
     * rassurant et mensonger. On vérifie donc la valeur exacte, négative.
     */
    expect(tauxParMinute(s).grain).toBeCloseTo(brut - (20 * CONSO_POP + 30 * CONSO_SOLDAT), 5)
    expect(tauxParMinute(s).grain).toBeLessThan(0)
  })
})

// ── Entrepôt et comptoir ─────────────────────────────────────────────────────
describe('entrepôt et comptoir', () => {
  it('lit l’agora pour le stock et les maisons pour la population', () => {
    // deux plafonds distincts, deux bâtiments distincts : les confondre est vite arrivé
    const s = poserVillage({ buildings: niveaux({ agora: 1, maisons: 4 }) })
    expect(stockageMax(s)).toBe(STOCKAGE[1])
    expect(popCap(s)).toBe(POP_CAP[4])

    const t = poserVillage({ buildings: niveaux({ agora: 4, maisons: 1 }) })
    expect(stockageMax(t)).toBe(STOCKAGE[4])
    expect(popCap(t)).toBe(POP_CAP[1])
  })

  it('écrête un échange qui ferait déborder les greniers', () => {
    /*
     * Le lot du comptoir est un chiffre rond : il tombe forcément à cheval sur
     * le plafond un jour ou l'autre. Ce jour-là, l'entrepôt doit rogner le
     * surplus au lieu de le stocker dans le vide.
     * (Le mode test rendant les paiements gratuits, on ne vérifie ici que la
     * ressource REÇUE — voir le premier describe.)
     */
    const aRasBord = STOCKAGE[1] - 3
    poserVillage({ buildings: niveaux({ agora: 1, port: 1 }), resources: { bois: aRasBord, pierre: 0, grain: 0, bronze: 500 } })
    useGame.getState().echanger('bronze', 'bois')
    expect(useGame.getState().resources.bois).toBe(STOCKAGE[1])
    expect(dernierEmoji()).toBe('⚓')

    // greniers pleins : le comptoir refuse au lieu d'encaisser pour rien
    useGame.getState().echanger('bronze', 'bois')
    expect(useGame.getState().resources.bois).toBe(STOCKAGE[1])
    expect(dernierEmoji()).toBe('📦')

    /*
     * Et le même échange, sous une plus grande agora, passe sans être rogné :
     * le plafond vient bien du bâtiment, pas d'une valeur figée dans le code.
     */
    poserVillage({ buildings: niveaux({ agora: 3, port: 1 }), resources: { bois: aRasBord, pierre: 0, grain: 0, bronze: 500 } })
    useGame.getState().echanger('bronze', 'bois')
    expect(useGame.getState().resources.bois).toBe(aRasBord + LOT_ECHANGE)
  })

  it('ne tient pas comptoir sans port, et n’échange pas une ressource contre elle-même', () => {
    /*
     * Deux gardes qui n'en ont pas l'air : sans port, `coutEchange` renvoie 0 —
     * l'échange serait donc gratuit ; et troquer du bois contre du bois
     * fabriquerait dix bois par clic. Le mode test payant tout sans regarder, ce
     * sont ces deux `return` qui tiennent la caisse, et rien d'autre.
     */
    const plein = { bois: 100, pierre: 100, grain: 100, bronze: 100 }
    poserVillage({ buildings: niveaux({ agora: 2 }), resources: { ...plein } })
    useGame.getState().echanger('bronze', 'bois')
    expect(useGame.getState().resources).toEqual(plein)
    expect(useGame.getState().toasts).toHaveLength(0) // pas même un refus : il n'y a pas de comptoir

    poserVillage({ buildings: niveaux({ agora: 2, port: 4 }), resources: { ...plein } })
    useGame.getState().echanger('bois', 'bois')
    expect(useGame.getState().resources).toEqual(plein)
  })
})

// ── Enceinte ─────────────────────────────────────────────────────────────────
describe('réparation de l’enceinte', () => {
  it('relève les murs jusqu’au maximum épaissi par Hector, brèches comprises', () => {
    /*
     * Le chantier de réparation doit viser murMax et non la table WALL_HP,
     * sinon l'enceinte d'Hector se retrouve définitivement plafonnée à
     * l'épaisseur d'un mur ordinaire dès la première réparation — et les pans
     * effondrés resteraient dessinés sur une muraille pourtant remise à neuf.
     */
    poserVillage({ buildings: niveaux({ agora: 3, remparts: 3 }), wallHp: 100, brechesMur: [0, 1.5], heros: avecHector() })
    useGame.getState().reparerRemparts()
    const s = useGame.getState()

    expect(s.wallHp).toBe(murMax(s))
    expect(s.wallHp).toBeGreaterThan(WALL_HP[3])
    expect(s.brechesMur).toEqual([])
  })
})
