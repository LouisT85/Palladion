import { afterEach, describe, expect, it } from 'vitest'
import {
  GEO_EXPEDITION,
  GEO_VILLAGE,
  MAX_BATTEMENTS,
  RETRAITE_APRES_MS,
  creerBataille,
  deroulerBataille,
  genererVague,
  mortsAttaque,
  pertesAttaque,
  pertesDefense,
  rejouerIsole,
  sonnerRetraite,
  tickBataille,
  type CibleBatiment,
  type OptionsBataille,
  type TickBatailleOut,
} from './combat'
import { TICK_MS, WALL_HP } from './data'
import { aleaPose, creerAleaCompte, poserAlea } from './defi'
import type { BattleState, UnitId } from './types'

/*
 * ═══════════ LE MOTEUR DE BATAILLE SE REJOUE, OU RIEN N'EST HONNÊTE ═══════════
 *
 * PALLADION n'a pas de serveur. Quand un joueur raide le village d'un autre, il
 * n'y a personne pour arbitrer : le rapport qu'il renvoie dit « j'ai gagné, voici
 * la graine ». La seule chose qui empêche d'écrire n'importe quoi dans ce rapport
 * est que le défenseur REJOUE la bataille chez lui et retrouve la même issue.
 * L'anti-triche de ce jeu, c'est la reproductibilité - et elle se teste.
 *
 * Or elle n'existait pas. `combat.ts` appelait `Math.random` vingt et une fois en
 * direct : la position de départ de chaque assaillant, la seconde de la première
 * salve de chaque archer, le jet de panique de chaque battement. Le mode défi
 * croyait être déterministe, mais `poserAlea` ne détourne que `hasard()`, que le
 * moteur n'appelait jamais. Deux exécutions du même assaut avec la même graine ne
 * rendaient PAS le même résultat.
 *
 * Ce fichier tient quatre promesses, et la quatrième est la plus importante :
 *
 *  1. MÊME GRAINE, MÊME BATAILLE - au coup près, et pas seulement sur le mot
 *     « victoire » : chaque combattant finit à la même position, avec les mêmes
 *     points de vie, et chaque pan de mur au même nombre.
 *  2. GRAINE DIFFÉRENTE, BATAILLE DIFFÉRENTE. Sans quoi la reproductibilité
 *     serait obtenue en supprimant le hasard, ce qui n'est pas le marché.
 *  3. LES DEUX SENS DE LA GUERRE. Le raid se joue chez l'attaquant (colonne en
 *     marche) et se vérifie chez le défenseur : les deux camps doivent se rejouer.
 *  4. SANS ALEA POSÉ, RIEN N'A CHANGÉ. `hasard()` vaut alors exactement
 *     `Math.random` : le bac à sable, la campagne et le siège gardent leur
 *     imprévu, la bataille finit, et les deux camps y laissent du monde.
 */

const ARMEE = (partiel: Partial<Record<UnitId, number>>): Record<UnitId, number> => ({
  lancier: 0,
  archer: 0,
  hoplite: 0,
  frondeur: 0,
  peltaste: 0,
  belier: 0,
  char: 0,
  ...partiel,
})

/** les bâtiments du village, dont le cœur : leur chute décide de la défaite */
function batiments(): CibleBatiment[] {
  return [
    { id: 'ferme', x: 470, y: 300, hp: 400 },
    { id: 'scierie', x: 420, y: 340, hp: 400 },
    { id: 'agora', x: 450, y: 315, hp: 900, coeur: true },
  ]
}

/**
 * L'assaut de référence : trois fronts, un mur de niveau 3, deux tours, une
 * garnison mêlée, deux héros postés et un champion achéen en tête de colonne.
 *
 * Ce n'est pas un scénario de complaisance : on y traverse TOUS les endroits du
 * moteur qui tiraient au sort - le placement des colonnes, l'heure de la première
 * salve des archers et des tours, le nuage de poussière du bélier, le jet de
 * panique, la position de repli d'un tireur qui descend du rempart, et les
 * renforts que le champion fait déboucher en pleine bataille.
 */
function assautSurLeVillage(reglages: Partial<OptionsBataille> = {}): BattleState {
  return creerBataille({
    attaquants: [
      { enemy: 'pillard', count: 9 },
      { enemy: 'guerrier', count: 5 },
      { enemy: 'belier', count: 2 },
    ],
    defenseurs: ARMEE({ lancier: 8, archer: 6, hoplite: 4, frondeur: 3, peltaste: 2 }),
    wallLevel: 3,
    wallHpTotal: WALL_HP[3],
    now: 0,
    geo: GEO_VILLAGE,
    campJoueur: 'defense',
    tours: 2,
    redoute: 1,
    fronts: [
      { nom: 'Porte de l’est', angle: 0, spawn: GEO_VILLAGE.spawn },
      { nom: 'Mur du sud', angle: 1.5, spawn: { x: 520, y: 560 } },
      { nom: 'Mur du nord', angle: -1.5, spawn: { x: 380, y: 40 } },
    ],
    herosPresents: [
      { id: 'hector', niveau: 2 },
      { id: 'enee', niveau: 1 },
    ],
    ...reglages,
  })
}

/**
 * L'assaut à l'équilibre : seize assaillants contre huit défenseurs derrière un
 * mur de niveau 2 et une tour, sans héros. C'est le scénario où la graine se
 * voit, et ses chiffres sont MESURÉS, pas devinés - deux tests en dépendent, et
 * une garnison mal choisie les rend menteurs tous les deux :
 *
 *  · sur les huit graines de « fait basculer l'issue », le village tient six
 *    fois et tombe deux fois. Une garnison de 3 lanciers et 2 archers derrière
 *    un mur de niveau 1 - ce qu'on avait d'abord posé - tombait sous les HUIT :
 *    le test passait parce que le nombre de battements variait, sans jamais
 *    éprouver ce qu'il annonçait ;
 *  · au vrai hasard, sur quatre mille assauts, les deux camps laissent du monde
 *    à CHAQUE fois. La même garnison de 3 et 2 voyait un assaut sur quatre mille
 *    emporter la place sans perdre un seul homme : « coûte du monde aux deux
 *    camps » rougissait alors une fois sur quatre mille, ce qu'aucune reprise de
 *    huit essais ne pouvait voir.
 */
function assautSerre(): BattleState {
  return assautSurLeVillage({
    attaquants: [
      { enemy: 'pillard', count: 10 },
      { enemy: 'guerrier', count: 6 },
    ],
    defenseurs: ARMEE({ lancier: 4, archer: 4 }),
    wallLevel: 2,
    wallHpTotal: WALL_HP[2],
    tours: 1,
    redoute: 0,
    herosPresents: [],
  })
}

/** le raid vu de chez l'attaquant : ma colonne marche sur la place d'un autre */
function raidSurUneCite(reglages: Partial<OptionsBataille> = {}): BattleState {
  return creerBataille({
    attaquants: [{ enemy: 'pillard', count: 12 }],
    defenseurs: ARMEE({ lancier: 6, archer: 4, hoplite: 2 }),
    wallLevel: 2,
    wallHpTotal: WALL_HP[2],
    now: 0,
    geo: GEO_EXPEDITION,
    campJoueur: 'attaque',
    tours: 1,
    herosPresents: [{ id: 'achille', niveau: 3 }],
    ...reglages,
  })
}

/**
 * Ce qu'on compare : l'état COMPLET, réduit aux nombres qui décident.
 *
 * Comparer « victoire » ne prouve rien - deux batailles peuvent finir de la même
 * façon par des chemins différents, et c'est justement ce qui laissait passer le
 * non-déterminisme d'hier. On relève donc chaque combattant (position, points de
 * vie, état, cible tenue, prochain coup), chaque pan de mur, chaque projectile en
 * vol, chaque bâtiment entamé, et les pertes des deux camps.
 */
function empreinte(b: BattleState, cibles: CibleBatiment[], fin: unknown, battements: number) {
  return {
    battements,
    fin,
    phase: b.phase,
    breche: b.breche,
    moral: b.moral,
    secteurs: b.secteurs.map((s) => ({ nom: s.nom, hp: s.hp, max: s.max, breche: s.breche })),
    combattants: b.fighters.map((f) => ({
      id: f.id,
      camp: f.camp,
      type: f.type,
      heros: f.heros ?? null,
      etat: f.etat,
      hp: f.hp,
      maxHp: f.maxHp,
      x: f.x,
      y: f.y,
      tx: f.tx,
      ty: f.ty,
      secteur: f.secteur ?? null,
      cibleId: f.cibleId ?? null,
      nextHit: f.nextHit,
      seed: f.seed,
    })),
    projectiles: b.projectiles.map((p) => ({ ...p })),
    batiments: cibles.map((c) => ({ id: c.id, hp: c.hp })),
    pertesDefense: pertesDefense(b),
    mortsAttaque: mortsAttaque(b),
    pertesAttaque: pertesAttaque(b),
  }
}

/**
 * Joue une bataille de bout en bout sous une graine donnée, et rend son
 * empreinte.
 *
 * `rejouerIsole` est indispensable ici : `uid` est un compteur de module, si bien
 * que la même bataille jouée deux fois de suite dans le même fichier de test
 * donnerait `atk-1…` puis `atk-27…`. Les identifiants ne changent pas l'issue,
 * mais ils interdiraient la comparaison champ par champ - qui est tout l'objet de
 * ce fichier. Le compteur du jeu vivant est rendu intact au retour.
 */
function jouerSousGraine(graine: number | null, fabrique: () => BattleState, wallLevel: number) {
  poserAlea(graine === null ? null : creerAleaCompte(graine).alea)
  try {
    return rejouerIsole(() => {
      const cibles = batiments()
      const b = fabrique()
      const d = deroulerBataille(b, {
        wallLevel,
        /*
         * Le MÊME tableau à chaque battement : les coups portés doivent s'y cumuler.
         *
         * `redouteHp` est tenu à pleine structure ici, et c'est un choix de test,
         * PAS un modèle à recopier : ce qui compte pour ce fichier est que la
         * valeur soit la même à chaque battement, donc reproductible. Un vrai
         * rejeu de raid doit la LIRE dans `cibles` (la Redoute est un bâtiment
         * comme les autres pour `ciblesBatiments`, et le store lui réécrit ses
         * points chaque battement), faute de quoi `(ctx.redouteHp ?? 1) > 0` la
         * laisse tirer éternellement : la place rejouée se défendrait mieux que
         * la place attaquée, et le rapport honnête de l'attaquant serait refusé.
         */
        contexte: () => ({ cibles, redouteHp: 500 }),
      })
      return { empreinte: empreinte(b, cibles, d.fin, d.battements), deroule: d, bataille: b }
    })
  } finally {
    poserAlea(null)
  }
}

afterEach(() => {
  // un alea qui survit à son test contaminerait tous les suivants du fichier
  poserAlea(null)
})

describe('la même graine rend exactement la même bataille', () => {
  it('rejoue un assaut de trois fronts au coup près, position par position', () => {
    const a = jouerSousGraine(20260812, () => assautSurLeVillage(), 3)
    const b = jouerSousGraine(20260812, () => assautSurLeVillage(), 3)

    // le verdict d'abord, parce que c'est lui que le rapport de raid annonce
    expect(b.deroule.terminee).toBe(a.deroule.terminee)
    expect(b.deroule.fin.victoireDefense).toBe(a.deroule.fin.victoireDefense)
    expect(b.deroule.fin.pillage).toBe(a.deroule.fin.pillage)
    expect(b.deroule.battements).toBe(a.deroule.battements)
    // puis TOUT le reste : un seul flottant qui diverge et la vérification est morte
    expect(b.empreinte).toEqual(a.empreinte)
  })

  it('rejoue un raid mené par le joueur, l’autre sens de la guerre', () => {
    const a = jouerSousGraine(777, () => raidSurUneCite(), 2)
    const b = jouerSousGraine(777, () => raidSurUneCite(), 2)
    expect(b.deroule.fin.victoireDefense).toBe(a.deroule.fin.victoireDefense)
    expect(b.empreinte).toEqual(a.empreinte)
  })

  it('rejoue la composition d’une vague, qui se tirait elle aussi au hasard', () => {
    const sous = (graine: number) => {
      poserAlea(creerAleaCompte(graine).alea)
      const v = [genererVague(30), genererVague(60), genererVague(90)]
      poserAlea(null)
      return v
    }
    expect(sous(4242)).toEqual(sous(4242))
    expect(sous(4242)).not.toEqual(sous(4243))
  })

  it('n’exige pas de rembobinage : la graine seule suffit à repartir du même point', () => {
    /*
     * `creerAleaCompte(graine, compte)` sait reprendre une suite au milieu - c'est
     * ce dont le mode défi se sert après un rechargement de page. La vérification
     * d'un rapport, elle, part TOUJOURS de zéro : ce test fixe cette convention,
     * car un rapport qui exigerait de connaître le nombre de tirages déjà
     * consommés par la partie de l'attaquant serait invérifiable.
     */
    const a = jouerSousGraine(31337, () => assautSurLeVillage(), 3)
    const rembobine = jouerSousGraine(31337, () => assautSurLeVillage(), 3)
    expect(rembobine.empreinte).toEqual(a.empreinte)
    expect(aleaPose()).toBe(false)
  })
})

describe('une graine différente rend une bataille différente', () => {
  it('déplace les colonnes, les salves et les pertes', () => {
    const a = jouerSousGraine(1, () => assautSurLeVillage(), 3)
    const b = jouerSousGraine(2, () => assautSurLeVillage(), 3)
    expect(b.empreinte).not.toEqual(a.empreinte)
    // et ce n'est pas qu'une virgule de décor : ni les morts ni la durée ne collent
    const resume = (r: typeof a) => `${r.empreinte.pertesAttaque} morts en ${r.deroule.battements} battements`
    expect(resume(b)).not.toBe(resume(a))
  })

  it('fait basculer l’issue d’un assaut serré selon la graine', () => {
    /*
     * La promesse qui compte pour le multijoueur : la graine n'est pas une
     * décoration, elle décide QUI GAGNE. Si toutes les graines donnaient la même
     * issue, transmettre la graine dans le rapport ne servirait à rien.
     *
     * On éprouve donc `victoireDefense` SEUL, et l'on exige les deux valeurs.
     * Compter les clés d'un triple « issue/pillage/battements », comme on le
     * faisait d'abord, ne prouvait rien du tout : le nombre de battements varie
     * d'une graine à l'autre même quand la place tombe à tous les coups, si bien
     * que le test passait sur un scénario où le village était perdu sous les huit
     * graines. C'est le genre de vert qui coûte un lot entier.
     */
    const tenu = [11, 22, 33, 44, 55, 66, 77, 88].map(
      (graine) => jouerSousGraine(graine, assautSerre, 2).deroule.fin.victoireDefense,
    )
    expect(new Set(tenu)).toEqual(new Set([true, false]))
  })
})

describe('sans alea posé, le moteur est celui d’hier', () => {
  it('laisse le hasard au hasard : deux assauts identiques divergent', () => {
    const a = jouerSousGraine(null, () => assautSurLeVillage(), 3)
    const b = jouerSousGraine(null, () => assautSurLeVillage(), 3)
    /*
     * On ne compare PAS le verdict : deux assauts de même effectif finissent
     * souvent de la même façon, et l'égalité ne prouverait rien. Ce qui doit
     * différer, c'est le placement - c'est là que `Math.random` intervient dès le
     * premier battement.
     */
    expect(b.empreinte.combattants).not.toEqual(a.empreinte.combattants)
  })

  it('finit, ne boucle pas, et coûte du monde aux deux camps', () => {
    const r = jouerSousGraine(null, assautSerre, 2)
    expect(r.deroule.terminee).toBe(true)
    expect(r.deroule.fin.finie).toBe(true)
    // largement en deçà de la borne : une bataille qui frôle la borne est suspecte
    expect(r.deroule.battements).toBeLessThan(2000)
    expect(r.empreinte.pertesAttaque).toBeGreaterThan(0)
    const perdus = Object.values(r.empreinte.pertesDefense).reduce((x, y) => x + (y ?? 0), 0)
    expect(perdus).toBeGreaterThan(0)
    // le mur a été attaqué : la structure n'est plus celle du premier battement
    expect(r.empreinte.secteurs.some((s) => s.hp < s.max)).toBe(true)
  })

  it('rend le compteur d’identifiants intact : le jeu vivant n’en souffre pas', () => {
    /*
     * `rejouerIsole` remet le compteur de `uid` à zéro le temps du déroulé. S'il ne
     * le restaurait pas, les bandeaux et les rapports d'une partie en cours
     * porteraient des identifiants déjà employés, et React en effacerait un.
     */
    const avant = rejouerIsole(() => assautSurLeVillage().fighters[0].id)
    jouerSousGraine(9, () => assautSurLeVillage(), 3)
    const apres = rejouerIsole(() => assautSurLeVillage().fighters[0].id)
    expect(apres).toBe(avant)
  })
})

describe('le déroulé hors écran est borné', () => {
  it('rend la main sans verdict plutôt que de figer l’onglet', () => {
    const b = assautSurLeVillage()
    // personne ne peut mourir : la bataille ne peut donc pas finir d'elle-même
    for (const f of b.fighters) {
      f.hp = 1e9
      f.maxHp = 1e9
    }
    const d = deroulerBataille(b, { wallLevel: 3, maxBattements: 40, retraiteApresMs: 0 })
    expect(d.battements).toBe(40)
    expect(d.terminee).toBe(false)
    expect(d.fin.finie).toBe(false)
  })

  it('mène la MÊME bataille que la boucle du store, battement par battement', () => {
    /*
     * La promesse dont tout le reste dépend, et qu'aucun autre test ne couvre.
     *
     * `deroulerBataille` est un SECOND chemin vers `tickBataille` : le premier est
     * la boucle du store, qui avance de `TICK_MS`, chaîne `out.wallHp` d'un
     * battement au suivant, sonne la retraite passé le délai des expéditions et
     * n'expose les bâtiments comme cibles qu'une fois l'enceinte percée. Si les
     * deux chemins divergeaient d'un cheveu, la vérification d'un rapport
     * refuserait des raids honnêtes - le défenseur rejouerait une AUTRE bataille
     * que celle que l'attaquant a réellement jouée sous ses yeux, et personne ne
     * comprendrait pourquoi. On reconstitue donc la boucle du store à la main et
     * l'on exige l'égalité de l'état final, champ par champ.
     */
    const parLeStore = (graine: number) => {
      poserAlea(creerAleaCompte(graine).alea)
      try {
        return rejouerIsole(() => {
          const cibles = batiments()
          const b = assautSerre()
          let now = b.startedAt
          let wallHp = b.secteurs.reduce((a, s) => a + Math.max(0, s.hp), 0)
          let out!: TickBatailleOut
          let battements = 0
          while (battements < MAX_BATTEMENTS) {
            now += TICK_MS
            battements++
            if (now - b.startedAt > RETRAITE_APRES_MS) sonnerRetraite(b)
            out = tickBataille(b, {
              now,
              dt: TICK_MS / 1000,
              wallHp,
              wallLevel: 2,
              // le store ne livre l'intérieur qu'après la brèche : on l'imite
              cibles: b.breche ? cibles : undefined,
            })
            wallHp = out.wallHp
            if (out.finie) break
          }
          return empreinte(b, cibles, out, battements)
        })
      } finally {
        poserAlea(null)
      }
    }
    const parLeDeroule = (graine: number) => {
      poserAlea(creerAleaCompte(graine).alea)
      try {
        return rejouerIsole(() => {
          const cibles = batiments()
          const b = assautSerre()
          const d = deroulerBataille(b, {
            wallLevel: 2,
            contexte: () => ({ cibles: b.breche ? cibles : undefined }),
          })
          return empreinte(b, cibles, d.fin, d.battements)
        })
      } finally {
        poserAlea(null)
      }
    }
    // deux graines qui tiennent et deux qui tombent : les deux issues sont couvertes
    for (const graine of [11, 33, 55, 77]) {
      expect(parLeDeroule(graine), `graine ${graine}`).toEqual(parLeStore(graine))
    }
  })

  it('avance au pas fixe : l’horloge du déroulé ne dépend pas de la machine', () => {
    /*
     * `dt` entre dans les déplacements, les cadences et le jet de panique. Une
     * bataille déroulée au rythme réel de l'écran - 250 ms, puis 263 parce que
     * l'onglet a bronché - ne se rejouerait pas. Le pas est donc celui du store
     * quand la machine suit, et l'instant final s'en déduit exactement.
     */
    const b = assautSurLeVillage()
    const d = deroulerBataille(b, { wallLevel: 3, maxBattements: 12, retraiteApresMs: 0, debut: 0 })
    expect(d.now).toBe(12 * 250)
  })
})
