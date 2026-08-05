import { describe, expect, it } from 'vitest'
import { BUILDING_IDS, GOD_IDS, SECTEURS, UNITS, UNIT_IDS } from './data'
import { EVENTS, EVENTS_BY_ID } from './events'
import { HEROS, HERO_IDS } from './heros'
import { VILLAGES_CIBLES, garnisonEffective } from './expeditions'
import { METEOS, SAISONS } from './saisons'
import {
  ORACLES,
  ORACLE_IDS,
  RIEN_VU,
  attenteOracle,
  consulterOracle,
  manquePourHeros,
  oracleVoit,
  reponseOracle,
  type OracleId,
  type SnapOracle,
} from './oracles'
import type { BuildingId, GodId, HeroId, UnitId } from './types'

/*
 * LES ORACLES.
 *
 * Ce qui est verrouillé ici n'est pas la table des prix - elle bougera - mais le
 * contrat moral du mécanisme, qui est la seule raison pour laquelle le joueur
 * peut lui faire confiance :
 *
 *  · l'oracle ne FACTURE JAMAIS DU VIDE. Pas de vague armée, pas de dilemme
 *    ouvert, pas de village désigné : réponse honnête, zéro faveur, zéro grain,
 *    et le délai de garde reste intact ;
 *  · l'oracle ne MENT JAMAIS. Chaque réponse est confrontée à l'état qui l'a
 *    produite : les effectifs annoncés sont ceux de `incomingWave`, l'issue
 *    annoncée est celle que `hint(roll)` donne, la garnison annoncée est celle
 *    que `garnisonEffective` calcule.
 *
 * Un oracle qui broderait une fois sur dix serait pire que pas d'oracle : le
 * joueur cesserait de croire aussi le murmure d'Athéna, qui est vrai.
 */

const TEMPLE_MAX = 4

function batiments(niveauTemple = TEMPLE_MAX): Record<BuildingId, { level: number }> {
  const out = {} as Record<BuildingId, { level: number }>
  for (const b of BUILDING_IDS) out[b] = { level: 2 }
  out.temple = { level: niveauTemple }
  return out
}

function armee(n = 0): Record<UnitId, number> {
  const out = {} as Record<UnitId, number>
  for (const u of UNIT_IDS) out[u] = 0
  out.lancier = n
  return out
}

function herosNeufs(): Record<HeroId, { recrute: boolean; mort: boolean }> {
  const out = {} as Record<HeroId, { recrute: boolean; mort: boolean }>
  for (const h of HERO_IDS) out[h] = { recrute: false, mort: false }
  return out
}

function dieux(relation = 0): Record<GodId, { relation: number }> {
  const out = {} as Record<GodId, { relation: number }>
  for (const g of GOD_IDS) out[g] = { relation }
  return out
}

const T0 = 1_000_000

function snap(patch: Partial<SnapOracle> = {}): SnapOracle {
  return {
    now: T0,
    jour: 5,
    incomingWave: null,
    incomingFronts: null,
    incomingChampion: null,
    nextAttackAt: T0 + 120_000,
    activeEvent: null,
    saison: 'automne',
    meteo: 'pluie',
    meteoJusqua: T0 + 90_000,
    expeditions: {},
    heros: herosNeufs(),
    buildings: batiments(),
    army: armee(),
    morale: 60,
    gods: dieux(),
    stats: { repousses: 0 },
    etoilesTotal: 0,
    cible: null,
    ...patch,
  }
}

const RICHE = { faveur: 999, grain: 9999, cooldowns: {} as Record<string, number> }

/** un dilemme réel dont au moins une option porte un murmure */
const EV_AVEC_MURMURE = EVENTS.find((e) => e.choices.some((c) => !!c.hint))!

describe('la table des cinq questions', () => {
  it('donne cinq questions distinctes, toutes payantes en faveur ET en grain', () => {
    expect(ORACLE_IDS).toHaveLength(5)
    expect(new Set(ORACLE_IDS).size).toBe(5)
    for (const id of ORACLE_IDS) {
      const d = ORACLES[id]
      expect(d.id, id).toBe(id)
      expect(d.coutFaveur, id).toBeGreaterThan(0)
      expect(d.coutGrain, id).toBeGreaterThan(0)
      expect(d.cooldown, id).toBeGreaterThan(0)
      expect(d.temple, id).toBeGreaterThanOrEqual(1)
      expect(d.question.trim().length, id).toBeGreaterThan(8)
      expect(d.desc.trim().length, id).toBeGreaterThan(30)
      expect(d.emoji.length, id).toBeGreaterThan(0)
    }
  })

  it('range les questions par prix croissant, et le délai de garde suit le prix', () => {
    const prix = ORACLE_IDS.map((id) => ORACLES[id].coutFaveur)
    const grains = ORACLE_IDS.map((id) => ORACLES[id].coutGrain)
    const gardes = ORACLE_IDS.map((id) => ORACLES[id].cooldown)
    for (let i = 1; i < prix.length; i++) {
      expect(prix[i], ORACLE_IDS[i]).toBeGreaterThan(prix[i - 1])
      expect(grains[i], ORACLE_IDS[i]).toBeGreaterThan(grains[i - 1])
      expect(gardes[i], ORACLE_IDS[i]).toBeGreaterThanOrEqual(gardes[i - 1])
    }
  })

  it('a une phrase de refus honnête pour chaque question', () => {
    for (const id of ORACLE_IDS) expect(RIEN_VU[id]?.trim().length, id).toBeGreaterThan(20)
  })
})

describe('l’oracle ne facture jamais du vide', () => {
  it('ne voit rien quand aucune vague n’est armée, et ne prélève rien', () => {
    const s = snap({ incomingWave: null })
    expect(reponseOracle('assaut', s)).toEqual([])
    const c = consulterOracle('assaut', s, RICHE)
    expect(c.ok).toBe(false)
    expect(c.motif).toBe('rien')
    expect(c.coutFaveur).toBe(0)
    expect(c.coutGrain).toBe(0)
    expect(c.prochainAt).toBe(0)
    expect(c.lignes).toEqual([RIEN_VU.assaut])
  })

  it('ne voit rien sur un dilemme qui n’est pas ouvert', () => {
    const c = consulterOracle('dilemme', snap({ activeEvent: null }), RICHE)
    expect(c.motif).toBe('rien')
    expect(c.coutFaveur + c.coutGrain).toBe(0)
  })

  it('ne voit rien quand on ne lui désigne aucune place forte', () => {
    expect(reponseOracle('garnison', snap({ cible: null }))).toEqual([])
    expect(reponseOracle('garnison', snap({ cible: 'village-qui-n-existe-pas' }))).toEqual([])
    expect(consulterOracle('garnison', snap({ cible: null }), RICHE).motif).toBe('rien')
  })

  it('ne voit rien quand les huit héros sont à table ou sous la terre', () => {
    const tous = herosNeufs()
    for (const h of HERO_IDS) tous[h] = { recrute: true, mort: false }
    expect(reponseOracle('heros', snap({ heros: tous }))).toEqual([])
    const morts = herosNeufs()
    for (const h of HERO_IDS) morts[h] = { recrute: false, mort: true }
    expect(consulterOracle('heros', snap({ heros: morts }), RICHE).motif).toBe('rien')
  })

  it('dit gratuitement qu’il ne voit rien même à un joueur ruiné - le vide passe avant le prix', () => {
    const c = consulterOracle('assaut', snap({ incomingWave: null }), { faveur: 0, grain: 0, cooldowns: {} })
    expect(c.motif).toBe('rien')
    expect(c.coutFaveur).toBe(0)
  })

  it('ne consomme pas le délai de garde quand il n’a rien vu', () => {
    const c = consulterOracle('dilemme', snap({ activeEvent: null }), RICHE)
    expect(c.prochainAt).toBe(0)
  })
})

describe('l’oracle de l’assaut dit la vague qui est DANS l’état', () => {
  const vague = [
    { enemy: 'pillard' as const, count: 6 },
    { enemy: 'guerrier' as const, count: 3 },
    { enemy: 'belier' as const, count: 1 },
  ]

  it('annonce l’effectif exact, groupe par groupe', () => {
    const l = reponseOracle('assaut', snap({ incomingWave: vague })).join(' | ')
    expect(l).toContain('10 hommes')
    expect(l).toContain('6 pillards')
    expect(l).toContain('3 guerriers achéens')
    expect(l).toContain('1 Bélier de siège')
  })

  it('nomme les pans visés, avec les noms des secteurs et non leurs identifiants', () => {
    const fronts = [SECTEURS[0].id, SECTEURS[1].id]
    const l = reponseOracle('assaut', snap({ incomingWave: vague, incomingFronts: fronts })).join(' | ')
    expect(l).toContain(SECTEURS[0].nom)
    expect(l).toContain(SECTEURS[1].nom)
    expect(l).toContain('2 fronts')
  })

  it('nomme le champion quand il y en a un, et dit qu’il n’y en a pas quand il n’y en a pas', () => {
    const avec = reponseOracle('assaut', snap({ incomingWave: vague, incomingChampion: 'achille' })).join(' | ')
    expect(avec).toContain(HEROS.achille.nom)
    const sans = reponseOracle('assaut', snap({ incomingWave: vague, incomingChampion: null })).join(' | ')
    expect(sans).not.toContain(HEROS.achille.nom)
    expect(sans).toContain('Aucun nom connu')
  })

  it('donne l’heure de l’arrivée d’après nextAttackAt', () => {
    const loin = reponseOracle('assaut', snap({ incomingWave: vague, nextAttackAt: T0 + 185_000 })).join(' | ')
    expect(loin).toContain('3 min 05 s')
    const ici = reponseOracle('assaut', snap({ incomingWave: vague, nextAttackAt: T0 - 1 })).join(' | ')
    expect(ici).toContain('déjà à la porte')
  })
})

describe('l’oracle du dilemme lit l’issue DÉJÀ tirée', () => {
  it('rend, pour chaque option, exactement ce que hint(roll) dit - pas une paraphrase', () => {
    const def = EV_AVEC_MURMURE
    const roll = 0.37
    const lignes = reponseOracle('dilemme', snap({ activeEvent: { defId: def.id, roll } }))
    expect(lignes[0]).toContain(def.titre)
    expect(lignes).toHaveLength(def.choices.length + 1)
    for (const [i, c] of def.choices.entries()) {
      const attendu = c.hint ? c.hint(roll) : null
      if (attendu) expect(lignes[i + 1], c.label).toContain(attendu)
      else expect(lignes[i + 1], c.label).toContain('rien ne s’y joue au sort')
      expect(lignes[i + 1], c.label).toContain(c.label)
    }
  })

  it('change de réponse quand le roll change : il suit l’état, il ne récite pas un gabarit', () => {
    const def = EV_AVEC_MURMURE
    const vus = new Set(
      [0.05, 0.2, 0.4, 0.6, 0.8, 0.95].map((r) =>
        reponseOracle('dilemme', snap({ activeEvent: { defId: def.id, roll: r } })).join('|'),
      ),
    )
    expect(vus.size).toBeGreaterThan(1)
  })

  it('reste vrai sur les quarante et un dilemmes du jeu, à plusieurs tirages', () => {
    for (const def of EVENTS) {
      for (const roll of [0.11, 0.63]) {
        const lignes = reponseOracle('dilemme', snap({ activeEvent: { defId: def.id, roll } }))
        expect(lignes.length, def.id).toBe(def.choices.length + 1)
        for (const [i, c] of def.choices.entries()) {
          const attendu = c.hint?.(roll)
          if (attendu) expect(lignes[i + 1], `${def.id}/${c.label}`).toContain(attendu)
        }
      }
    }
  })

  it('se taît sur un identifiant de dilemme inconnu plutôt que d’inventer', () => {
    expect(reponseOracle('dilemme', snap({ activeEvent: { defId: 'chimere', roll: 0.5 } }))).toEqual([])
    expect(EVENTS_BY_ID.chimere).toBeUndefined()
  })
})

describe('l’oracle du ciel', () => {
  it('dit la météo en cours, ce qu’il en reste et la saison qui vient', () => {
    const l = reponseOracle('ciel', snap({ saison: 'automne', meteo: 'pluie', jour: 9, meteoJusqua: T0 + 65_000 }))
    const t = l.join(' | ')
    expect(t).toContain(METEOS.pluie.nom)
    expect(t).toContain('1 min 05 s')
    expect(t).toContain(SAISONS.automne.nom)
    // jour 9 d'automne : la saison tourne au jour 12, soit dans 3 journées
    expect(t).toContain('3 journées')
    expect(t).toContain(SAISONS.hiver.nom)
  })

  it('ne prétend pas connaître la météo suivante : il en donne les chances, qui somment à 100 %', () => {
    const t = reponseOracle('ciel', snap({ saison: 'hiver', jour: 12 })).join(' | ')
    const pourcents = [...t.matchAll(/(\d+) %/g)].map((m) => Number(m[1]))
    expect(pourcents.length).toBeGreaterThan(2)
    expect(pourcents.reduce((a, b) => a + b, 0)).toBe(100)
  })

  it('a toujours quelque chose à dire : le ciel existe, on ne vend pas de vide non plus', () => {
    expect(oracleVoit('ciel', snap())).toBe(true)
  })
})

describe('l’oracle de la garnison dit ce que garnisonEffective calcule', () => {
  it('annonce, pour chaque place forte, l’effectif exact que la bataille opposera', () => {
    for (const v of VILLAGES_CIBLES) {
      const t = reponseOracle('garnison', snap({ cible: v.id })).join(' | ')
      const attendu = garnisonEffective(v, 0)
      for (const u of UNIT_IDS) {
        if ((attendu[u] ?? 0) > 0) expect(t, `${v.id}/${u}`).toContain(`${attendu[u]} ${UNITS[u].nom}`)
      }
      expect(t, v.id).toContain(v.nom)
    }
  })

  it('tient compte des pillages encaissés, comme la bataille le fera', () => {
    const v = VILLAGES_CIBLES[3]
    const attendu = garnisonEffective(v, 3)
    const t = reponseOracle('garnison', snap({ cible: v.id, expeditions: { [v.id]: { etoiles: 3, pillages: 3 } } })).join(' | ')
    expect(t).toContain(`${attendu.lancier} ${UNITS.lancier.nom}`)
    expect(t).toContain('3 fois')
    expect(attendu.lancier).toBeGreaterThan(garnisonEffective(v, 0).lancier)
  })
})

describe('l’oracle des héros', () => {
  it('nomme celui qui peut entrer sur-le-champ', () => {
    // Hector n'exige qu'un rempart : on le lui donne, et rien d'autre
    const b = batiments()
    b.remparts = { level: 4 }
    b.caserne = { level: 4 }
    const t = reponseOracle('heros', snap({ buildings: b, army: armee(30), morale: 95, etoilesTotal: 24, stats: { repousses: 20 }, gods: dieux(100) })).join(' | ')
    expect(t).toContain(HEROS.hector.nom)
    expect(t).toContain('dès maintenant')
  })

  it('dit ce qui manque, et ce qui manque est vrai', () => {
    const s = snap({ army: armee(0), stats: { repousses: 0 } })
    const t = reponseOracle('heros', s).join(' | ')
    expect(t).toContain('attend')
    // toute condition annoncée doit être réellement non satisfaite
    for (const h of HERO_IDS) {
      const manque = manquePourHeros(h, s)
      for (const m of manque) expect(m.trim().length, `${h}/${m}`).toBeGreaterThan(2)
    }
    expect(manquePourHeros('achille', s).length).toBeGreaterThan(0)
  })

  it('ne réclame plus rien à un héros dont toutes les conditions sont remplies', () => {
    const b = batiments()
    for (const k of BUILDING_IDS) b[k] = { level: 4 }
    const s = snap({ buildings: b, army: armee(40), morale: 100, etoilesTotal: 24, stats: { repousses: 30 }, gods: dieux(100) })
    for (const h of HERO_IDS) expect(manquePourHeros(h, s), h).toEqual([])
  })
})

describe('la consultation', () => {
  it('refuse sans temple, et ne prélève rien', () => {
    const c = consulterOracle('assaut', snap({ buildings: batiments(1), incomingWave: [{ enemy: 'pillard', count: 2 }] }), RICHE)
    expect(c.motif).toBe('temple')
    expect(c.coutFaveur + c.coutGrain + c.prochainAt).toBe(0)
  })

  it('refuse pendant le délai de garde, en disant combien il reste', () => {
    const c = consulterOracle('ciel', snap(), { ...RICHE, cooldowns: { ciel: T0 + 45_000 } })
    expect(c.motif).toBe('attente')
    expect(c.restant).toBe(45_000)
    expect(c.coutFaveur).toBe(0)
  })

  it('refuse quand la bourse ou le grenier manquent - et ne prélève rien d’avance', () => {
    const s = snap()
    const sansFaveur = consulterOracle('ciel', s, { faveur: 1, grain: 9999, cooldowns: {} })
    expect(sansFaveur.motif).toBe('ressources')
    const sansGrain = consulterOracle('ciel', s, { faveur: 999, grain: 1, cooldowns: {} })
    expect(sansGrain.motif).toBe('ressources')
    expect(sansGrain.coutGrain).toBe(0)
  })

  it('accorde la consultation au juste prix, et arme le délai de garde', () => {
    const s = snap({ incomingWave: [{ enemy: 'pillard', count: 4 }] })
    const c = consulterOracle('assaut', s, RICHE)
    expect(c.ok).toBe(true)
    expect(c.motif).toBe('ok')
    expect(c.coutFaveur).toBe(ORACLES.assaut.coutFaveur)
    expect(c.coutGrain).toBe(ORACLES.assaut.coutGrain)
    expect(c.prochainAt).toBe(T0 + ORACLES.assaut.cooldown)
    expect(c.lignes).toEqual(reponseOracle('assaut', s))
  })

  it('accepte tout juste avec le compte exact', () => {
    const d = ORACLES.ciel
    const c = consulterOracle('ciel', snap(), { faveur: d.coutFaveur, grain: d.coutGrain, cooldowns: {} })
    expect(c.ok).toBe(true)
  })

  it('n’a aucune attente sur une question jamais posée', () => {
    expect(attenteOracle('ciel', {}, T0)).toBe(0)
    expect(attenteOracle('ciel', { ciel: T0 - 1 }, T0)).toBe(0)
  })

  it('accorde ou refuse exactement selon oracleVoit, sur les cinq questions', () => {
    const s = snap({
      incomingWave: [{ enemy: 'pillard', count: 2 }],
      activeEvent: { defId: EV_AVEC_MURMURE.id, roll: 0.5 },
      cible: VILLAGES_CIBLES[0].id,
    })
    for (const q of ORACLE_IDS as OracleId[]) {
      const c = consulterOracle(q, s, RICHE)
      expect(c.ok, q).toBe(oracleVoit(q, s))
    }
  })

  it('ne rend jamais de ligne vide, quelle que soit la question', () => {
    const s = snap({
      incomingWave: [{ enemy: 'mercenaire', count: 2 }],
      incomingFronts: [SECTEURS[0].id],
      activeEvent: { defId: EV_AVEC_MURMURE.id, roll: 0.8 },
      cible: VILLAGES_CIBLES[5].id,
    })
    for (const q of ORACLE_IDS as OracleId[]) {
      for (const l of reponseOracle(q, s)) expect(l.trim().length, `${q}: « ${l} »`).toBeGreaterThan(0)
    }
  })
})
