import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DELAI_ORDRE_MS,
  EFFETS_LIGNE,
  EFFETS_TIR,
  GEO_VILLAGE,
  ORDRES_NEUTRES,
  creerBataille,
  tickBataille,
} from './combat'
import { SECTEURS, TICK_MS, WALL_HP, troupes } from './data'
import { useGame } from './store'
import type { BattleState, Fighter, OrdreLigne, OrdreTir, OrdresBataille } from './types'

/*
 * LES ORDRES DE BATAILLE.
 *
 * On regardait la bataille : hors bénédictions, aucun geste du joueur ne
 * changeait ce que faisaient ses hommes. Trois postures, deux façons de tirer,
 * un pan assignable par unité — et la seule chose qui compte ici est que CHAQUE
 * ordre fasse quelque chose de mesurable, et que chacun ait un PRIX.
 *
 * Un ordre qui n'aurait que des avantages ne serait pas un ordre, ce serait un
 * bouton « gagner ». C'est ce que ces tests vérifient d'abord.
 */

let etatAlea = 0
function tirage(): number {
  etatAlea = (etatAlea + 0x6d2b79f5) >>> 0
  let t = etatAlea
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

beforeEach(() => {
  etatAlea = 20_260_801
  vi.spyOn(Math, 'random').mockImplementation(tirage)
})
afterEach(() => {
  vi.restoreAllMocks()
})

function ordres(p: Partial<OrdresBataille> = {}): OrdresBataille {
  return { ...ORDRES_NEUTRES, secteurs: {}, ...p }
}

function bataille(reglages: Partial<Parameters<typeof creerBataille>[0]> = {}): BattleState {
  return creerBataille({
    attaquants: [{ enemy: 'pillard', count: 6 }],
    defenseurs: troupes({ lancier: 4 }),
    wallLevel: 2,
    now: 0,
    geo: GEO_VILLAGE,
    campJoueur: 'defense',
    wallHpTotal: WALL_HP[2],
    ...reglages,
  })
}

/** avance la bataille de `n` battements */
function avancer(b: BattleState, n: number, wallLevel = 2): void {
  let now = 0
  for (let i = 0; i < n; i++) {
    now += TICK_MS
    tickBataille(b, { now, dt: TICK_MS / 1000, wallHp: 0, wallLevel })
  }
}

/** met tout le monde au corps à corps, autour du ralliement */
function corpsACorps(b: BattleState): void {
  const r = b.geo.ralliement
  for (const f of b.fighters) {
    if (f.camp !== 'attaque') continue
    f.etat = 'melee'
    f.x = r.x + 10
    f.y = r.y
    f.tx = f.x
    f.ty = f.y
    f.nextHit = 0
  }
  for (const f of b.fighters) {
    if (f.camp === 'defense') f.nextHit = 0
  }
}

const pv = (b: BattleState, camp: 'attaque' | 'defense'): number =>
  b.fighters.filter((f) => f.camp === camp).reduce((a, f) => a + Math.max(0, f.hp), 0)

/**
 * Rend tout le monde inépuisable. Sans cela, on ne mesure pas ce que la posture
 * change aux coups portés mais ce qu'elle change au nombre de survivants : une
 * ligne qui frappe plus fort meurt plus vite, et — pire — elle ROMPT plus tôt,
 * puisque « charger » relève le seuil de panique. Les trois effets se mêlent au
 * point d'inverser la mesure. On fige donc les effectifs pour lire les seuls
 * multiplicateurs, et l'on éprouve la rupture ailleurs, dans son propre test.
 */
function immortels(b: BattleState): void {
  for (const f of b.fighters) {
    f.hp = 1e6
    f.maxHp = 1e6
  }
}

describe('la table des ordres', () => {
  it('donne à chaque posture un prix, jamais que des avantages', () => {
    for (const id of Object.keys(EFFETS_LIGNE) as OrdreLigne[]) {
      const e = EFFETS_LIGNE[id]
      expect(e.nom.length, id).toBeGreaterThan(3)
      expect(e.desc.trim().length, id).toBeGreaterThan(30)
      if (id === 'tenir') continue
      /*
       * Le contrat : une posture qui frappe plus fort DOIT encaisser plus fort,
       * et réciproquement. Le jour où quelqu'un règle `charge` à `recus: 1`, ce
       * n'est plus un choix tactique, c'est un bouton à presser toujours.
       */
      if (e.degats > 1) expect(e.recus, id).toBeGreaterThan(1)
      if (e.recus < 1) expect(e.degats, id).toBeLessThan(1)
    }
    // le tir en cloche porte plus loin et frappe plus mou : jamais l'inverse
    expect(EFFETS_TIR.cloche.portee).toBeGreaterThan(EFFETS_TIR.tendu.portee)
    expect(EFFETS_TIR.cloche.degats).toBeLessThan(EFFETS_TIR.tendu.degats)
  })
})

/**
 * Ce qu'une posture change aux coups portés et reçus, l'autre camp rendu
 * inépuisable pour que la mesure ne dépende pas de qui tombe le premier.
 */
function echange(ligne: OrdreLigne): { subi: number; inflige: number } {
  const b = bataille()
  b.ordres = ordres({ ligne })
  corpsACorps(b)
  immortels(b)
  const avantAtk = pv(b, 'attaque')
  const avantDef = pv(b, 'defense')
  avancer(b, 30)
  return { inflige: avantAtk - pv(b, 'attaque'), subi: avantDef - pv(b, 'defense') }
}

describe('mur de boucliers', () => {
  it('encaisse bien mieux, et rend bien moins', () => {
    const neutre = echange('tenir')
    const mur = echange('mur')
    expect(mur.subi).toBeLessThan(neutre.subi)
    expect(mur.inflige).toBeLessThan(neutre.inflige)
  })

  it('ne rompt pas la ligne pour courir après un fuyard hors de portée', () => {
    /*
     * Un assaillant isolé LOIN dans l'enceinte. En posture neutre, la ligne s'y
     * précipite ; en mur de boucliers, elle ne lâche pas sa position. C'est là
     * tout l'intérêt de la posture : couvrir un point, pas gagner du terrain.
     */
    const poser = (ligne: OrdreLigne) => {
      const b = bataille({ attaquants: [{ enemy: 'pillard', count: 1 }] })
      b.ordres = ordres({ ligne })
      const loin = b.fighters.find((f) => f.camp === 'attaque')!
      loin.etat = 'melee'
      loin.x = b.geo.place.x - 120
      loin.y = b.geo.place.y
      loin.tx = loin.x
      loin.ty = loin.y
      const lancier = b.fighters.find((f) => f.camp === 'defense')!
      const depart = { x: lancier.x, y: lancier.y }
      avancer(b, 24)
      return Math.hypot(lancier.x - depart.x, lancier.y - depart.y)
    }
    expect(poser('mur')).toBeLessThan(poser('tenir'))
  })

  it('tient là où une ligne ordinaire aurait rompu — et la charge, elle, casse', () => {
    /*
     * Même moral pour les trois postures : dix hommes, cinq à terre. Le seuil
     * ordinaire est à 45 % : à 50 % debout, personne ne devrait rompre. La charge
     * relève ce seuil, le mur de boucliers l'abaisse — c'est là que se lit le vrai
     * prix de chaque ordre, et pas dans la table des coefficients.
     */
    const ruptures = (ligne: OrdreLigne): number => {
      const b = bataille({ attaquants: [{ enemy: 'pillard', count: 2 }], defenseurs: troupes({ lancier: 10 }) })
      b.ordres = ordres({ ligne })
      // personne ne tombe de lui-même : le moral doit rester à 50 % tout du long,
      // sans quoi la bataille s'achève et le bloc de panique ne tourne même plus
      immortels(b)
      const garnison = b.fighters.filter((f) => f.camp === 'defense')
      for (const f of garnison.slice(0, 5)) f.etat = 'mort'
      let total = 0
      let now = 0
      // la rupture est un tirage par battement : on laisse le temps au dé de
      // parler, sinon le test dirait « pas de chance » au lieu de « pas de risque »
      for (let i = 0; i < 400; i++) {
        now += TICK_MS
        total += tickBataille(b, { now, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 2 }).rompus.length
      }
      return total
    }
    expect(ruptures('charge')).toBeGreaterThan(0)
    expect(ruptures('tenir')).toBe(0)
    expect(ruptures('mur')).toBe(0)
  })
})

describe('charger', () => {
  it('frappe plus fort — et encaisse davantage pour ce plaisir', () => {
    const neutre = echange('tenir')
    const charge = echange('charge')
    expect(charge.inflige).toBeGreaterThan(neutre.inflige)
    expect(charge.subi).toBeGreaterThan(neutre.subi)
  })

  it('sort crever les béliers sous le mur au lieu de les laisser cogner', () => {
    /*
     * Un bélier au pied du rempart, mur intact. En posture neutre la garnison
     * attend derrière : le mur tombera. En charge, elle sort le tuer. C'est le
     * seul moyen de sauver un pan qui va céder, et il n'existait pas.
     */
    const essai = (ligne: OrdreLigne) => {
      const b = bataille({
        attaquants: [{ enemy: 'belier', count: 1 }],
        defenseurs: troupes({ lancier: 5 }),
      })
      b.ordres = ordres({ ligne })
      const belier = b.fighters.find((f) => f.camp === 'attaque')!
      belier.etat = 'siege'
      belier.x = b.secteurs[0].x + 16
      belier.y = b.secteurs[0].y
      belier.tx = belier.x
      belier.ty = belier.y
      belier.nextHit = 0
      avancer(b, 60)
      return { belier: belier.hp, mur: b.secteurs[0].hp }
    }
    const attendre = essai('tenir')
    const sortir = essai('charge')
    // le bélier est entamé quand on charge, intact quand on attend
    expect(sortir.belier).toBeLessThan(attendre.belier)
    // et le mur s'en porte mieux : on a tué la machine avant qu'elle finisse
    expect(sortir.mur).toBeGreaterThan(attendre.mur)
  })
})

describe('tir en cloche', () => {
  it('atteint ce qu’un tir tendu ne couvre pas', () => {
    const tirs = (tir: OrdreTir, ecart: number): number => {
      const b = bataille({ attaquants: [{ enemy: 'pillard', count: 1 }], defenseurs: troupes({ archer: 1 }) })
      b.ordres = ordres({ tir })
      const archer = b.fighters.find((f) => f.type === 'archer')!
      const cible = b.fighters.find((f) => f.camp === 'attaque')!
      archer.nextHit = 0
      cible.x = archer.x + ecart
      cible.y = archer.y
      cible.tx = cible.x
      cible.ty = cible.y
      cible.etat = 'siege'
      tickBataille(b, { now: 10_000, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 2 })
      return b.projectiles.length
    }
    // à 380 pas, l'arc tendu ne porte plus ; la cloche, si
    expect(tirs('tendu', 380)).toBe(0)
    expect(tirs('cloche', 380)).toBe(1)
    // et de près, les deux décochent — la cloche n'interdit rien
    expect(tirs('tendu', 150)).toBe(1)
    expect(tirs('cloche', 150)).toBe(1)
  })

  it('arrose le plus gros tas plutôt que l’homme le plus proche', () => {
    /*
     * Un isolé TOUT PRÈS, un paquet de quatre plus loin. Le tir tendu prend
     * l'isolé ; la cloche doit prendre le tas. C'est toute la raison d'être de
     * l'ordre : les béliers et leur escorte se massent, on tire dans le tas.
     */
    const vise = (tir: OrdreTir): 'isole' | 'tas' | 'rien' => {
      const b = bataille({ attaquants: [{ enemy: 'pillard', count: 5 }], defenseurs: troupes({ archer: 1 }) })
      b.ordres = ordres({ tir })
      const archer = b.fighters.find((f) => f.type === 'archer')!
      archer.nextHit = 0
      const ennemis = b.fighters.filter((f) => f.camp === 'attaque')
      const poser = (f: Fighter, dx: number, dy: number) => {
        f.x = archer.x + dx
        f.y = archer.y + dy
        f.tx = f.x
        f.ty = f.y
        f.etat = 'siege'
      }
      poser(ennemis[0], 60, 0) // l'isolé, tout près
      ennemis.slice(1).forEach((f, i) => poser(f, 190 + (i % 2) * 12, (i - 1) * 14)) // le tas
      tickBataille(b, { now: 10_000, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 2 })
      const p = b.projectiles[0]
      if (!p) return 'rien'
      return p.targetId === ennemis[0].id ? 'isole' : 'tas'
    }
    expect(vise('tendu')).toBe('isole')
    expect(vise('cloche')).toBe('tas')
  })

  it('frappe plus mou : la flèche retombe de haut', () => {
    const degat = (tir: OrdreTir): number => {
      const b = bataille({ attaquants: [{ enemy: 'pillard', count: 1 }], defenseurs: troupes({ archer: 1 }) })
      b.ordres = ordres({ tir })
      const archer = b.fighters.find((f) => f.type === 'archer')!
      const cible = b.fighters.find((f) => f.camp === 'attaque')!
      archer.nextHit = 0
      cible.x = archer.x + 120
      cible.y = archer.y
      cible.tx = cible.x
      cible.ty = cible.y
      cible.etat = 'siege'
      tickBataille(b, { now: 10_000, dt: TICK_MS / 1000, wallHp: 0, wallLevel: 2 })
      return b.projectiles[0]?.dmg ?? 0
    }
    expect(degat('cloche')).toBeLessThan(degat('tendu'))
  })
})

describe('assigner une unité à un pan', () => {
  it('l’y poste et l’y garde, même si l’on s’égorge à l’autre bout', () => {
    /*
     * Trois fronts, une menace au SUD seulement. Sans assignation, les lanciers
     * courent tous au sud. Assignés au nord, ils tiennent le nord — c'est la
     * seule réponse possible à un assaut sur trois fronts avec une garnison
     * unique, et le moteur l'ignorait complètement.
     */
    const b = bataille({
      attaquants: [{ enemy: 'pillard', count: 3 }],
      defenseurs: troupes({ lancier: 4 }),
      fronts: SECTEURS,
      wallLevel: 0,
      wallHpTotal: 0,
    })
    const iNord = b.secteurs.findIndex((s) => s.nom.includes('nord'))
    const iSud = b.secteurs.findIndex((s) => s.nom.includes('sud'))
    expect(iNord).toBeGreaterThanOrEqual(0)
    b.ordres = ordres({ secteurs: { lancier: iNord } })
    // toute la menace entre par le sud, et elle ne tombera pas : on veut lire où
    // vont les hommes, pas combien de temps l'ennemi survit
    for (const f of b.fighters) {
      if (f.camp !== 'attaque') continue
      f.secteur = iSud
      f.etat = 'melee'
      f.x = b.secteurs[iSud].x
      f.y = b.secteurs[iSud].y - 20
      f.tx = f.x
      f.ty = f.y
    }
    immortels(b)
    avancer(b, 40, 0)
    const lanciers = b.fighters.filter((f) => f.camp === 'defense')
    const versNord = lanciers.filter(
      (f) => Math.hypot(f.x - b.secteurs[iNord].x, f.y - b.secteurs[iNord].y) < 140,
    )
    expect(versNord).toHaveLength(lanciers.length)
    // et personne n'a été frapper au sud : ce pan n'est pas le leur
    const auSud = lanciers.filter((f) => Math.hypot(f.x - b.secteurs[iSud].x, f.y - b.secteurs[iSud].y) < 140)
    expect(auSud).toHaveLength(0)
  })

  it('sans assignation, la garnison court au plus chaud — comme avant', () => {
    const b = bataille({
      attaquants: [{ enemy: 'pillard', count: 3 }],
      defenseurs: troupes({ lancier: 4 }),
      fronts: SECTEURS,
      wallLevel: 0,
      wallHpTotal: 0,
    })
    const iSud = b.secteurs.findIndex((s) => s.nom.includes('sud'))
    for (const f of b.fighters) {
      if (f.camp !== 'attaque') continue
      f.secteur = iSud
      f.etat = 'melee'
      f.x = b.secteurs[iSud].x
      f.y = b.secteurs[iSud].y - 20
      f.tx = f.x
      f.ty = f.y
    }
    immortels(b)
    avancer(b, 40, 0)
    const auSud = b.fighters.filter(
      (f) => f.camp === 'defense' && Math.hypot(f.x - b.secteurs[iSud].x, f.y - b.secteurs[iSud].y) < 160,
    )
    expect(auSud.length).toBeGreaterThan(0)
  })
})

describe('donner un ordre depuis le store', () => {
  beforeEach(() => {
    useGame.getState().reset()
  })

  it('ne commande rien hors bataille', () => {
    useGame.getState().donnerOrdre('ligne', 'charge')
    expect(useGame.getState().battle).toBeNull()
  })

  it('transmet l’ordre, puis le fait tenir cinq secondes', () => {
    useGame.setState((s) => {
      s.battle = bataille()
      return s
    })
    const jeu = () => useGame.getState()
    jeu().donnerOrdre('ligne', 'charge')
    expect(jeu().battle!.ordres!.ligne).toBe('charge')
    // aussitôt après, on ne peut plus en changer : un ordre se tient
    jeu().donnerOrdre('ligne', 'mur')
    expect(jeu().battle!.ordres!.ligne).toBe('charge')
    // le délai passé, la troupe écoute de nouveau
    const echu = jeu().battle!.ordres!.prochainAt - DELAI_ORDRE_MS - 1
    useGame.setState((s) => {
      s.battle!.ordres!.prochainAt = echu
      return s
    })
    jeu().donnerOrdre('ligne', 'mur')
    expect(jeu().battle!.ordres!.ligne).toBe('mur')
  })

  it('assigne un pan, et sait revenir au plus pressé', () => {
    useGame.setState((s) => {
      s.battle = bataille({ fronts: SECTEURS })
      return s
    })
    const jeu = () => useGame.getState()
    jeu().assignerSecteur('lancier', 2)
    expect(jeu().battle!.ordres!.secteurs.lancier).toBe(2)
    jeu().assignerSecteur('lancier', null)
    expect(jeu().battle!.ordres!.secteurs.lancier).toBeUndefined()
    // un pan qui n'existe pas ne s'assigne pas
    jeu().assignerSecteur('lancier', 9)
    expect(jeu().battle!.ordres!.secteurs.lancier).toBeUndefined()
  })

  it('commande aussi les troupes parties en expédition : ce sont les mêmes hommes', () => {
    useGame.setState((s) => {
      s.expedition = {
        villageId: 'thrace',
        intention: 'pillage',
        envoyes: troupes({ lancier: 4 }),
        wallHp: 100,
        battle: bataille({ campJoueur: 'attaque' }),
        result: null,
      }
      return s
    })
    useGame.getState().donnerOrdre('tir', 'cloche')
    expect(useGame.getState().expedition!.battle.ordres!.tir).toBe('cloche')
  })
})
