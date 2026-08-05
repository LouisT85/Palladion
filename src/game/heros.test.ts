import { describe, expect, it } from 'vitest'
import { BUILDINGS, FAVEUR_MAX, GOD_IDS, POP_CAP, STOCKAGE, UNITS, multRelation } from './data'
import { VILLAGES_CIBLES } from './expeditions'
import {
  BONUS_NEUTRE,
  DELAI_ENTRE_NOEUDS_MS,
  DELAI_PREMIER_NOEUD_MS,
  HEROS,
  HERO_ATK_BASE,
  HERO_HP_BASE,
  HERO_IDS,
  NIVEAU_MAX,
  attenteNoeud,
  cumulerPassifs,
  entretienTotal,
  etatHeroInitial,
  forceNiveau,
  noeudMur,
  peutMonter,
  statsCombatHeros,
  xpRequise,
  type BonusHeros,
  type HeroId,
  type HeroState,
} from './heros'
import { ferveur, relationEffective, useGame, type GameState } from './store'

/*
 * Les héros sont la partie la plus chère du jeu en contenu écrit et la plus
 * fragile en équilibrage : huit fiches à la main, des arcs à embranchements et
 * des passifs qui s'additionnent en silence. On verrouille ici ce qui ne se voit
 * pas à l'écran - la cohérence des tables, la progression, le moment exact où un
 * nœud d'arc a le droit de s'ouvrir, et le branchement des passifs sur la partie.
 *
 * Deux partis pris pour que chaque test puisse rougir :
 *  - les valeurs attendues sont écrites en clair (0,15 pour Hector, 5,7 🌾 pour
 *    la table complète) plutôt que relues dans la table qu'on prétend vérifier ;
 *  - les invariants d'arc sont des recensements EXHAUSTIFS (« il existe
 *    exactement un cul-de-sac, celui d'Achille »), de sorte qu'un nœud ajouté ou
 *    un plafond déplacé se signale au lieu de passer entre les mailles.
 *
 * Note d'environnement : sous Vitest `import.meta.env.MODE` vaut 'test', donc
 * MODE_TEST est VRAI (data.ts). Deux conséquences pour ce domaine : `payer()`
 * accepte tout, donc le prix d'un recrutement ou d'un parti d'arc n'est pas
 * observable par le store ; et le tick n'appelle pas `entretenirHeros`
 * (store.ts, « les héros mangent »), donc le départ après trois impayés est hors
 * d'atteinte. D'où l'attaque de l'entretien par sa fonction pure.
 */

/** une maisonnée neuve : les huit héros connus de nom, aucun au service */
function maisonneeVide(): Record<HeroId, HeroState> {
  return Object.fromEntries(HERO_IDS.map((h) => [h, etatHeroInitial()])) as Record<HeroId, HeroState>
}

/** une maisonnée où les héros nommés sont entrés au service, vivants et disponibles */
function auService(...ids: HeroId[]): Record<HeroId, HeroState> {
  const etats = maisonneeVide()
  for (const id of ids) etats[id].recrute = true
  return etats
}

/** ce que CHAQUE héros apporte, seul, à la maisonnée - écrit à la main exprès */
const APPORT: Record<HeroId, Partial<BonusHeros>> = {
  hector: { wallHpPct: 0.15 },
  ulysse: { revelerVague: true, alerteBonusMs: 120_000 },
  achille: { degatsMeleePct: 0.4 },
  ajax: { gardeDuCorpsPct: 0.25 },
  agamemnon: { butinPct: 0.2, relationTous: -10 },
  cassandre: { alerteBonusMs: 120_000, revelerDilemmes: true },
  enee: { popParSaison: 2 },
  diomede: { degatsExpeditionPct: 0.25 },
}

/** ce que chaque héros mange par minute, seul à table */
const ENTRETIEN: Record<HeroId, { grain: number; faveur: number }> = {
  hector: { grain: 0.6, faveur: 0 },
  ulysse: { grain: 0, faveur: 0.25 },
  achille: { grain: 1.2, faveur: 0 },
  ajax: { grain: 0.8, faveur: 0 },
  agamemnon: { grain: 1.5, faveur: 0.15 },
  cassandre: { grain: 0, faveur: 0.35 },
  enee: { grain: 0.7, faveur: 0 },
  diomede: { grain: 0.9, faveur: 0 },
}

describe('table des huit héros', () => {
  it('indexe chaque héros par son propre identifiant et le rend reconnaissable', () => {
    // le store itère `HERO_IDS` puis lit `HEROS[id]` : une clé qui ne correspond
    // pas à son `id` ferait pointer un passif ou un arc sur le mauvais héros
    expect([...HERO_IDS]).toEqual(['hector', 'ulysse', 'achille', 'ajax', 'agamemnon', 'cassandre', 'enee', 'diomede'])
    for (const id of HERO_IDS) expect(HEROS[id].id).toBe(id)
    // la fiche, la jauge d'xp et le pion sur la carte n'ont que ces trois signes
    // pour distinguer deux héros : deux emojis ou deux couleurs identiques et le
    // joueur ne sait plus lequel il envoie au combat
    for (const champ of ['nom', 'emoji', 'couleur'] as const) {
      const vus = HERO_IDS.map((h) => HEROS[h][champ])
      expect(new Set(vus).size, `${champ} en double`).toBe(HERO_IDS.length)
      for (const v of vus) expect(v.length).toBeGreaterThan(0)
    }
    for (const id of HERO_IDS) expect(HEROS[id].couleur).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('fait payer chaque héros à l’entrée et chaque mois, sans jamais dépasser les coffres', () => {
    const coffreMax = STOCKAGE[STOCKAGE.length - 1]
    for (const id of HERO_IDS) {
      const def = HEROS[id]
      const prix = Object.values(def.coutRecrutement)
      // un héros gratuit ou entretenu pour rien serait à prendre sans réfléchir :
      // toute la tension de la maisonnée tient à ces deux nombres
      expect(prix.length).toBeGreaterThan(0)
      for (const n of prix) {
        expect(n).toBeGreaterThan(0)
        // et un présent plus gros que l'entrepôt le plus grand serait impayable
        // pour toujours, sans que rien ne le dise au joueur
        expect(n, `${id} demande plus que l’agora ne peut contenir`).toBeLessThanOrEqual(coffreMax)
      }
      const entretien = Object.values(def.entretien)
      expect(entretien.length).toBeGreaterThan(0)
      for (const n of entretien) expect(n).toBeGreaterThan(0)
    }
  })

  it('ne réclame à personne des preuves que la partie ne peut pas fournir', () => {
    // `conditionsHeros` n'a aucun garde-fou : une exigence hors d'atteinte ne
    // produit pas d'erreur, juste une ligne rouge éternelle dans le panneau des
    // héros. Chaque plafond ci-dessous est celui du jeu, pas un chiffre choisi
    const etoilesMax = 3 * VILLAGES_CIBLES.length
    const brasMax = POP_CAP[POP_CAP.length - 1]
    for (const id of HERO_IDS) {
      const r = HEROS[id].requiert
      // sans condition, le héros s'offrirait au premier jour de la partie
      expect(Object.keys(r).length, `${id} ne demande rien`).toBeGreaterThan(0)
      if (r.batiment) {
        // `upgrade` refuse tout chantier au-delà du niveau 4 : au-dessus, le
        // bâtiment exigé n'existe pas
        expect(r.batiment.niveau).toBeGreaterThan(0)
        expect(r.batiment.niveau).toBeLessThanOrEqual(BUILDINGS[r.batiment.id].costs.length)
      }
      if (r.relation) expect(Math.abs(r.relation.min)).toBeLessThanOrEqual(100)
      if (r.morale !== undefined) expect(r.morale).toBeLessThanOrEqual(100)
      if (r.etoiles !== undefined) expect(r.etoiles).toBeLessThanOrEqual(etoilesMax)
      // un soldat est un villageois enrôlé (`recruter` décrémente la population) :
      // exiger plus de bras que les maisons n'en abritent serait sans issue
      if (r.armee !== undefined) expect(r.armee).toBeLessThanOrEqual(brasMax)
    }
  })

  it('garde chaque capacité invocable, et ne la promet que là où elle peut agir', () => {
    // ces quatre effets sortent en silence de `capaciteHeros` s'il n'y a pas de
    // mêlée (`if (!bataille) return`, sans message ni remboursement) : sans le
    // drapeau `batailleUniquement`, le clic ne produirait rien du tout
    const exigeUneMelee: string[] = ['bouclier-secteur', 'fureur', 'boucher-breche', 'tuer-chef']
    for (const id of HERO_IDS) {
      const { capacite } = HEROS[id]
      // une capacité au-dessus du plafond de faveur ne serait jamais invocable :
      // le store refuse dès que `faveur < cout`, sans l'expliquer
      expect(capacite.cout).toBeGreaterThan(0)
      expect(capacite.cout).toBeLessThanOrEqual(FAVEUR_MAX)
      expect(capacite.cooldown).toBeGreaterThan(0)
      if (exigeUneMelee.includes(capacite.effet.type)) {
        expect(capacite.batailleUniquement, `${id} promet un effet de mêlée hors bataille`).toBe(true)
      }
    }
    // huit héros, huit outils : deux capacités du même type rendraient l'un des
    // deux porteurs redondant, et le switch du store ne le dirait pas
    expect(new Set(HERO_IDS.map((h) => HEROS[h].capacite.effet.type)).size).toBe(HERO_IDS.length)
  })

  it('couvre exactement les montées de niveau par la table d’expérience', () => {
    for (const id of HERO_IDS) {
      const { xpParNiveau } = HEROS[id]
      // quatre paliers pour cinq niveaux : une entrée en trop ou en moins et un
      // héros resterait bloqué avant le maximum, ou monterait au-delà
      expect(xpParNiveau).toHaveLength(NIVEAU_MAX - 1)
      for (let i = 1; i < xpParNiveau.length; i++) {
        expect(xpParNiveau[i], `${id} : palier ${i + 1} plus doux que le précédent`).toBeGreaterThan(xpParNiveau[i - 1])
      }
    }
    // Achille monte le plus vite, Agamemnon le plus lentement : c'est voulu
    expect(HEROS.achille.xpParNiveau[0]).toBeLessThan(HEROS.agamemnon.xpParNiveau[0])
  })

  it('donne à chaque nœud d’arc une identité, un vrai choix et des effets applicables', () => {
    const vus = new Set<string>()
    for (const id of HERO_IDS) {
      const def = HEROS[id]
      expect(def.arc.length).toBeGreaterThan(0)
      for (const n of def.arc) {
        // `choisirArc` retrouve le nœud par son id : deux homonymes chez le même
        // héros et c'est le premier qui répondrait, avec les effets de l'autre
        expect(vus.has(n.id), `${n.id} en double`).toBe(false)
        vus.add(n.id)
        expect(n.id.startsWith(id)).toBe(true)
        expect(n.texte.length).toBeGreaterThan(0)
        // un nœud à option unique n'est pas un dilemme, c'est une annonce
        expect(n.options.length).toBeGreaterThanOrEqual(2)
        for (const o of n.options) {
          expect(o.label.length).toBeGreaterThan(0)
          expect(o.issue.length).toBeGreaterThan(0)
          // une option sans effet mécanique ne coûte rien et ne change rien
          expect(Object.keys(o.effets).length).toBeGreaterThan(0)
          for (const c of Object.values(o.cout ?? {})) expect(c).toBeGreaterThan(0)
          // `choisirArc` teste `if (f.niveau)` : un gain de 0 serait ignoré sans
          // un mot, et un gain négatif ferait reculer le héros
          if (o.effets.niveau !== undefined) expect(o.effets.niveau).toBeGreaterThanOrEqual(1)
          if (o.effets.boude !== undefined) expect(o.effets.boude).toBeGreaterThan(0)
          if (o.effets.plafond !== undefined) {
            // le plafond est posé AVANT le gain de niveau et le borne : plus bas
            // que le niveau du nœud lui-même, il condamnerait un héros à vivre
            // au-dessus de son propre plafond, état dont `peutMonter` ne sort pas
            expect(o.effets.plafond, `${n.id} plafonne sous son propre niveau`).toBeGreaterThanOrEqual(n.niveauRequis)
            expect(o.effets.plafond).toBeLessThanOrEqual(NIVEAU_MAX)
          }
        }
      }
    }
  })

  it('déclenche les nœuds par niveaux croissants et jamais hors d’atteinte', () => {
    for (const id of HERO_IDS) {
      const def = HEROS[id]
      for (let i = 0; i < def.arc.length; i++) {
        const n = def.arc[i]
        // un nœud au niveau 1 tomberait à la seconde du recrutement, avant que
        // le joueur ait vu le héros se battre ; un nœud au-delà du niveau
        // maximum ne tomberait jamais
        expect(n.niveauRequis).toBeGreaterThanOrEqual(2)
        expect(n.niveauRequis).toBeLessThanOrEqual(NIVEAU_MAX)
        // `noeudMur` avance dans l'ordre du tableau : un nœud plus exigeant que
        // son successeur bloquerait la suite de l'arc derrière lui
        if (i > 0) expect(n.niveauRequis).toBeGreaterThanOrEqual(def.arc[i - 1].niveauRequis)
      }
    }
  })
})

describe('progression d’un héros', () => {
  it('lit le palier du niveau COURANT, et ne réclame plus rien au sommet', () => {
    /*
     * L'index est décalé d'un cran (niveau 1 → première case). Ces valeurs en
     * dur sont le seul garde-fou contre un décalage silencieux : relire
     * `xpParNiveau[niveau - 1]` dans le test reviendrait à recopier la fonction
     * et laisserait passer l'erreur classique - faire monter le niveau 1 au prix
     * du 2.
     */
    expect(HEROS.achille.xpParNiveau).toEqual([80, 200, 380, 640])
    expect(xpRequise(HEROS.achille, 1)).toBe(80)
    expect(xpRequise(HEROS.achille, 2)).toBe(200)
    expect(xpRequise(HEROS.achille, 4)).toBe(640)
    // et c'est bien la table du héros passé qu'on lit, pas une table commune
    expect(xpRequise(HEROS.agamemnon, 1)).toBe(120)
    for (const id of HERO_IDS) {
      // aucun palier intermédiaire ne doit être un mur : un `Infinity` avant le
      // sommet figerait le héros à mi-parcours sans rien afficher
      for (let n = 1; n < NIVEAU_MAX; n++) expect(Number.isFinite(xpRequise(HEROS[id], n))).toBe(true)
      // arrivé au sommet, `gagnerXp` compare l'xp à ce seuil dans un `while` :
      // un nombre fini relancerait la montée indéfiniment
      expect(xpRequise(HEROS[id], NIVEAU_MAX)).toBe(Infinity)
      expect(xpRequise(HEROS[id], NIVEAU_MAX + 2)).toBe(Infinity)
    }
  })

  it('arrête la montée à la mort, au plafond, et au niveau maximum', () => {
    const e = etatHeroInitial()
    expect(peutMonter(e)).toBe(true)
    expect(peutMonter({ ...e, mort: true })).toBe(false)
    expect(peutMonter({ ...e, niveau: NIVEAU_MAX })).toBe(false)
    // un choix d'arc peut le briser en route : le plafond l'emporte sur le reste
    expect(peutMonter({ ...e, niveau: 3, plafond: 3 })).toBe(false)
    expect(peutMonter({ ...e, niveau: 2, plafond: 3 })).toBe(true)
    // et un plafond farfelu ne fait pas franchir la limite du jeu
    expect(peutMonter({ ...e, niveau: NIVEAU_MAX, plafond: 99 })).toBe(false)
    expect(peutMonter({ ...e, niveau: NIVEAU_MAX - 1, plafond: 99 })).toBe(true)
  })

  it('renforce les capacités du niveau 1 au niveau 5 sans jamais les affaiblir', () => {
    // le store multiplie durées et dégâts par cette force : la faire descendre
    // sous 1 rendrait un héros de niveau 1 moins bon que ne le dit sa fiche.
    // Les trois points en dur pincent la droite entière, pas seulement ses bouts
    expect(forceNiveau(1)).toBe(1)
    expect(forceNiveau(3)).toBeCloseTo(1.4, 10)
    expect(forceNiveau(NIVEAU_MAX)).toBeCloseTo(1.8, 10)
    for (let niveau = 2; niveau <= NIVEAU_MAX; niveau++) {
      expect(forceNiveau(niveau)).toBeGreaterThan(forceNiveau(niveau - 1))
    }
  })

  it('descend sur le terrain avec des points de vie et une frappe qui suivent le niveau', () => {
    expect(statsCombatHeros(1)).toEqual({ hp: HERO_HP_BASE, atk: HERO_ATK_BASE })
    // 240 × 1,4 = 336 et 26 × 1,4 = 36,4 : l'arrondi doit trancher vers le bas
    expect(statsCombatHeros(3)).toEqual({ hp: 336, atk: 36 })
    // au sommet : 240 × 1,8 et 26 × 1,8
    expect(statsCombatHeros(NIVEAU_MAX)).toEqual({ hp: 432, atk: 47 })
    for (let niveau = 2; niveau <= NIVEAU_MAX; niveau++) {
      expect(statsCombatHeros(niveau).hp).toBeGreaterThan(statsCombatHeros(niveau - 1).hp)
      expect(statsCombatHeros(niveau).atk).toBeGreaterThan(statsCombatHeros(niveau - 1).atk)
    }
    // le moteur fait combattre le héros comme un hoplite (combat.ts) : s'il ne
    // valait pas franchement plus que l'infanterie lourde qu'il remplace au
    // premier rang, le descendre sur le terrain serait une mauvaise affaire
    const base = statsCombatHeros(1)
    expect(base.hp).toBeGreaterThan(2 * UNITS.hoplite.hp)
    expect(base.atk).toBeGreaterThan(UNITS.hoplite.atk)
  })
})

describe('passifs cumulés de la maisonnée', () => {
  it('n’oublie et ne double aucun passif quand les huit sont à table', () => {
    /*
     * L'agrégation est une longue suite de `+=` copiés-collés : le champ oublié
     * ou compté deux fois ne se voit nulle part à l'écran. Cette attente est
     * exhaustive (`toEqual`) et écrite à la main, donc un champ ajouté à
     * `BonusHeros` sans être agrégé la fait rougir.
     */
    expect(cumulerPassifs(auService(...HERO_IDS))).toEqual({
      wallHpPct: 0.15,
      degatsMeleePct: 0.4,
      degatsExpeditionPct: 0.25,
      butinPct: 0.2,
      // l'orgueil du roi des rois est un malus, et il doit survivre à la somme
      relationTous: -10,
      revelerVague: true,
      // Ulysse et Cassandre annoncent chacun deux minutes plus tôt, et ces deux
      // minutes s'AJOUTENT : un `=` à la place du `+=` rendrait 120 000
      alerteBonusMs: 240_000,
      revelerDilemmes: true,
      popParSaison: 2,
      // la fiche d'Ajax promet « 25 % de dégâts en moins », et c'est exactement ce
      // que porte le champ : le store le retranche tel quel (`reducJoueur`)
      gardeDuCorpsPct: 0.25,
    })
  })

  it('n’attribue à chacun que son propre passif, et rien du tout à qui n’est pas là', () => {
    // le neutre est le point de départ de l'agrégation : s'il portait un bonus,
    // la maisonnée vide en profiterait déjà
    expect(BONUS_NEUTRE).toEqual({
      wallHpPct: 0,
      degatsMeleePct: 0,
      degatsExpeditionPct: 0,
      butinPct: 0,
      relationTous: 0,
      revelerVague: false,
      alerteBonusMs: 0,
      revelerDilemmes: false,
      popParSaison: 0,
      gardeDuCorpsPct: 0,
    })
    // un héros connu de nom mais jamais engagé ne doit rien apporter
    expect(cumulerPassifs(maisonneeVide())).toEqual(BONUS_NEUTRE)
    // la table du test doit suivre le panthéon : un héros ajouté sans passif
    // attendu passerait sinon inaperçu
    expect(Object.keys(APPORT).sort()).toEqual([...HERO_IDS].sort())
    for (const id of HERO_IDS) {
      // chaque champ appartient à un seul porteur : une ligne d'agrégation qui
      // lirait le mauvais passif se verrait ici, héros par héros
      expect(cumulerPassifs(auService(id)), id).toEqual({ ...BONUS_NEUTRE, ...APPORT[id] })
    }
  })

  it('ne compte ni le héros mort ni celui qui a plié bagage', () => {
    const etats = auService('achille', 'ajax')
    etats.achille.mort = true
    // mort dans son arc, Achille laisse un état `recrute: true` derrière lui :
    // c'est exactement le cas où ses +40 % de dégâts pourraient lui survivre
    expect(cumulerPassifs(etats)).toEqual({ ...BONUS_NEUTRE, ...APPORT.ajax })
    // celui qui s'en va après trois impayés repasse à `recrute: false`
    etats.ajax.recrute = false
    expect(cumulerPassifs(etats)).toEqual(BONUS_NEUTRE)
  })
})

describe('entretien de la maisonnée', () => {
  it('facture à la minute ce que chaque héros mange, convive par convive', () => {
    expect(entretienTotal(maisonneeVide())).toEqual({ grain: 0, faveur: 0 })
    expect(Object.keys(ENTRETIEN).sort()).toEqual([...HERO_IDS].sort())
    // huit ancres écrites à la main : retoucher l'entretien d'un seul héros doit
    // se voir, y compris si un autre est retouché en sens inverse
    for (const id of HERO_IDS) expect(entretienTotal(auService(id)), id).toEqual(ENTRETIEN[id])
    // les huit à table : c'est ce total que le tick prélève chaque minute et qui
    // décide du départ d'un impayé. Un `Math.max` à la place de la somme le
    // ferait tomber à 1,5 🌾 - la maisonnée deviendrait gratuite à partir du
    // deuxième héros
    const total = entretienTotal(auService(...HERO_IDS))
    expect(total.grain).toBeCloseTo(5.7, 6)
    expect(total.faveur).toBeCloseTo(0.75, 6)
  })

  it('cesse de nourrir un héros mort ou parti', () => {
    const etats = auService('achille', 'agamemnon')
    etats.achille.mort = true
    // un mort qui mange encore, c'est une fuite de grain que rien ne signale
    expect(entretienTotal(etats)).toEqual(ENTRETIEN.agamemnon)
    etats.agamemnon.recrute = false
    expect(entretienTotal(etats)).toEqual({ grain: 0, faveur: 0 })
  })
})

describe('ouverture des nœuds d’arc', () => {
  it('n’ouvre un nœud ni trop tôt, ni pour un absent, ni après la fin', () => {
    const def = HEROS.hector
    const e = etatHeroInitial()
    // le premier nœud d'Hector attend le niveau 2 : c'est le contrat de la table
    expect(def.arc[0].niveauRequis).toBe(2)
    expect(noeudMur(def, e)).toBeNull() // connu de nom, pas au service
    expect(noeudMur(def, { ...e, recrute: true })).toBeNull() // niveau 1 : trop tôt
    expect(noeudMur(def, { ...e, recrute: true, niveau: 2 })).toBe(def.arc[0])
    // un héros mort n'a plus d'histoire, même s'il lui restait des nœuds
    expect(noeudMur(def, { ...e, recrute: true, niveau: NIVEAU_MAX, mort: true })).toBeNull()
    // arc épuisé : plus rien à raconter, et surtout pas le dernier nœud à nouveau
    expect(noeudMur(def, { ...e, recrute: true, niveau: NIVEAU_MAX, arc: def.arc.length })).toBeNull()
    // les nœuds se prennent dans l'ordre : au niveau 4, c'est le deuxième qui
    // s'ouvre si le premier a été tranché, pas le troisième
    expect(noeudMur(def, { ...e, recrute: true, niveau: 4, arc: 1 })).toBe(def.arc[1])
    // celui qui boude garde son récit : `noeudMur` ignore `boudeJusqua`, et c'est
    // ce qui permet de le réconcilier par un dilemme
    expect(noeudMur(def, { ...e, recrute: true, niveau: 2, boudeJusqua: Date.now() + 600_000 })).toBe(def.arc[0])
  })

  it('fait RESPIRER l’arc : deux nœuds ne peuvent pas tomber coup sur coup', () => {
    /*
     * Le défaut réel, observé en jouant l'acte III : Hector, imposé par le récit
     * au niveau 2, voyait TOUS ses nœuds mûrs à la seconde de son entrée - le
     * niveau requis était la seule condition. On enchaînait ses dilemmes en
     * quelques battements et il mourait avant qu'on ait vu sa tête.
     *
     * Le contrat, désormais : un délai s'interpose, et le niveau ne suffit plus.
     */
    const def = HEROS.hector
    const t = 1_000_000
    const pret: HeroState = { ...etatHeroInitial(), recrute: true, niveau: NIVEAU_MAX }

    // sans délai posé, rien ne change : les vieilles sauvegardes gardent leur arc
    expect(noeudMur(def, pret, t)).toBe(def.arc[0])

    // avec un délai en cours, le nœud attend - même au niveau maximum
    const enAttente: HeroState = { ...pret, prochainNoeudAt: t + 60_000 }
    expect(noeudMur(def, enAttente, t)).toBeNull()
    expect(attenteNoeud(enAttente, t)).toBe(60_000)
    // et il s'ouvre à la seconde où le délai expire
    expect(noeudMur(def, enAttente, t + 60_000)).toBe(def.arc[0])
    expect(attenteNoeud(enAttente, t + 60_000)).toBe(0)

    // les deux délais sont d'un ordre de grandeur JOUABLE : quelques minutes,
    // assez pour un assaut - pas quelques secondes, pas une demi-heure
    for (const d of [DELAI_PREMIER_NOEUD_MS, DELAI_ENTRE_NOEUDS_MS]) {
      expect(d).toBeGreaterThanOrEqual(5 * 60_000)
      expect(d).toBeLessThanOrEqual(15 * 60_000)
    }
  })

  it('impose ce répit aux héros que la campagne met à votre porte', () => {
    /*
     * C'est le cas qui a mordu : les héros scriptés entrent au niveau 2, donc
     * plusieurs nœuds sont d'emblée à portée. Ils doivent arriver AVEC leur
     * délai déjà posé - sinon le premier battement de l'acte ouvre le dilemme.
     */
    useGame.getState().reset()
    useGame.getState().choisirMode('campagne')
    const s = useGame.getState()
    const scriptes = HERO_IDS.filter((h) => s.heros[h].recrute)
    for (const h of scriptes) {
      const e = s.heros[h]
      expect(attenteNoeud(e, s.lastSeen), h).toBeGreaterThan(0)
      expect(noeudMur(HEROS[h], e, s.lastSeen), h).toBeNull()
    }
  })

  it('ne cache aucun cul-de-sac narratif : tout arc va jusqu’à sa dernière page', () => {
    /*
     * Un parti qui tue le héros ou le plafonne SOUS le nœud suivant efface la
     * fin de son récit sans un mot : `peutMonter` devient faux, `noeudMur` rend
     * `null` pour toujours. On recense donc tous les partis qui referment un arc
     * et on exige que la liste reste VIDE - un nœud ajouté, un plafond abaissé ou
     * une mort avancée d'un chapitre se signale ici.
     *
     * (Un tel cul-de-sac a existé : « Le retenir de force » plafonnait Achille au
     * niveau 3 quand « La flèche de Pâris » en exige 4. Le plafond est passé à 4.)
     */
    const ferme: string[] = []
    for (const id of HERO_IDS) {
      const arc = HEROS[id].arc
      for (let i = 0; i < arc.length - 1; i++) {
        const suivant = arc[i + 1]
        const survivants = arc[i].options.filter(
          (o) => !o.effets.mort && (o.effets.plafond ?? NIVEAU_MAX) >= suivant.niveauRequis,
        )
        for (const o of arc[i].options) {
          if (!survivants.includes(o)) ferme.push(`${arc[i].id} · ${o.label} → ${suivant.id}`)
        }
        // et aucun nœud ne doit refermer TOUTES ses portes : un arc dont un
        // chapitre entier est un piège ne se termine jamais, quel que soit le choix
        expect(survivants.length, `${arc[i].id} ferme l’accès à ${suivant.id}`).toBeGreaterThan(0)
      }
    }
    expect(ferme).toEqual([])
  })

  it('laisse la dernière page d’Achille atteignable, même après l’avoir retenu de force', () => {
    const def = HEROS.achille
    const retenir = def.arc[1].options.find((o) => o.effets.plafond !== undefined)
    expect(retenir?.effets.plafond).toBeDefined()
    // on reconstitue l'état exactement comme `choisirArc` le laisse : plafond
    // rabaissé (`Math.min`), puis nœud suivant. Rien n'est écrit en dur, donc
    // abaisser le plafond d'un cran dans heros.ts fait tomber ce test
    const brise: HeroState = {
      ...etatHeroInitial(),
      recrute: true,
      niveau: def.arc[1].niveauRequis,
      plafond: Math.min(NIVEAU_MAX, retenir!.effets.plafond!),
      arc: 2,
    }
    /*
     * Le plafond doit couvrir EXACTEMENT le dernier nœud : ni moins (l'arc
     * s'arrêterait en silence), ni forcément plus (le parti perdrait sa morsure -
     * un Achille retenu ne doit pas finir aussi haut que celui qu'on a lâché).
     */
    expect(brise.plafond).toBe(def.arc[2].niveauRequis)
    // il peut encore gagner le rang qui lui manque, et rien au-delà
    expect(peutMonter(brise)).toBe(true)
    expect(noeudMur(def, brise)).toBeNull() // pas encore : il lui faut ce rang
    const auPlafond: HeroState = { ...brise, niveau: brise.plafond }
    expect(peutMonter(auPlafond)).toBe(false)
    expect(noeudMur(def, auPlafond)).toBe(def.arc[2])
    // et l'autre parti, lui, monte jusqu'au bout de la légende
    const libre: HeroState = { ...brise, plafond: NIVEAU_MAX, niveau: def.arc[2].niveauRequis }
    expect(noeudMur(def, libre)).toBe(def.arc[2])
  })
})

/*
 * ── Les passifs branchés sur la partie ───────────────────────────────────────
 * Une table juste ne sert à rien si le store ne la lit pas. On repose donc une
 * partie muette (aucun assaut, aucun dilemme, aucun appel au secours à
 * l'horizon) et on n'observe que ce que les héros y changent.
 */

/** tous les Olympiens à la même relation - le seul levier qui nous intéresse ici */
function relations(n: number): GameState['gods'] {
  return Object.fromEntries(GOD_IDS.map((g) => [g, { relation: n, cooldownUntil: 0 }])) as GameState['gods']
}

function poserPartie(champs: Partial<GameState> = {}): void {
  useGame.getState().reset()
  const now = Date.now()
  useGame.setState({
    nextAttackAt: now + 60 * 60_000,
    prochainAppelAt: now + 60 * 60_000,
    nextPopAt: now + 60 * 60_000,
    lastEventAt: now,
    lastSeen: now,
    toasts: [],
    reports: [],
    ...champs,
  })
}

describe('les passifs branchés sur la partie', () => {
  it('retranche l’orgueil d’Agamemnon de la relation pesée par CHAQUE Olympien', () => {
    poserPartie({ gods: relations(50) })
    for (const g of GOD_IDS) expect(relationEffective(useGame.getState(), g)).toBe(50)
    useGame.setState({ heros: auService('agamemnon') })
    // le malus vaut pour tout le panthéon, pas seulement pour Zeus : c'est ce qui
    // fait du roi des rois un choix et non une aubaine
    for (const g of GOD_IDS) expect(relationEffective(useGame.getState(), g)).toBe(40)
    // et il se paie en puissance de bénédiction : à 50 avec lui, un dieu frappe
    // comme à 40 sans lui (c'est la ferveur que le Panthéon annonce au joueur)
    expect(ferveur(useGame.getState(), 'zeus')).toBeCloseTo(multRelation(40), 10)
    expect(ferveur(useGame.getState(), 'zeus')).toBeLessThan(multRelation(50))
    // les jauges ne vont pas au-delà de ±100 : le malus ne doit pas les crever
    useGame.setState({ gods: relations(-95) })
    expect(relationEffective(useGame.getState(), 'zeus')).toBe(-100)
    useGame.setState({ gods: relations(100) })
    expect(relationEffective(useGame.getState(), 'zeus')).toBe(90)
  })

  it('emmène les héros et leurs passifs en expédition, sauf celui qui boude', () => {
    const etats = auService('achille', 'diomede', 'ajax')
    // Ajax garde rancune : il reste au village, mais son passif, lui, ne dépend
    // pas de son humeur (`cumulerPassifs` ignore `boudeJusqua`)
    etats.ajax.boudeJusqua = Date.now() + 10 * 60_000
    poserPartie({ army: { lancier: 5, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 }, heros: etats })
    useGame.getState().lancerExpedition('camp-pillards', { lancier: 5, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 })
    const exp = useGame.getState().expedition
    expect(exp).not.toBeNull()
    // 1 + 40 % (Achille, partout) + 25 % (Diomède, en expédition seulement) :
    // oublier l'un des deux termes dans le store donnerait 1,4 ou 1,25
    expect(exp!.battle.bonusAtkJoueur).toBeCloseTo(1.65, 6)
    // ils marchent en tête de colonne - et le boudeur n'y est pas
    const colonne = exp!.battle.fighters.filter((f) => f.heros)
    expect(colonne.map((f) => f.heros)).toEqual(['achille', 'diomede'])
    for (const f of colonne) expect(f.camp).toBe('attaque')
    /*
     * La garde d'Ajax vaut aussi loin de chez soi. `lancerExpedition` ne
     * transmettait pas `reducJoueur` : le moteur retombait sur 1, et la fiche
     * d'Ajax - qui la promet sans réserve - mentait en pillage comme en secours.
     *
     * 0,75 et non 1, alors qu'Ajax ne marche pas dans cette colonne : un PASSIF
     * s'applique depuis la maisonnée, pas depuis le champ de bataille. C'est vrai
     * de tous les autres (les murs d'Hector, le butin d'Agamemnon), et la garde
     * n'a aucune raison de faire exception.
     */
    expect(exp!.battle.reducJoueur).toBeCloseTo(0.75, 6)
  })

  it('n’applique la garde d’Ajax qu’à la défense du village, et à la moitié de sa valeur', () => {
    // contre-épreuve du test précédent : sans elle, « `reducJoueur` absent en
    // expédition » pourrait simplement vouloir dire que le champ ne sert à rien.
    // On force l'assaut par le tick, seul chemin qui construise une bataille
    // défensive, et on lit ce que le store a transmis au moteur
    const armee = { lancier: 4, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0, char: 0 }
    poserPartie({ army: armee, nextAttackAt: Date.now() - 1 })
    useGame.getState().tick()
    const sansHeros = useGame.getState().battle
    expect(sansHeros).not.toBeNull()
    expect(sansHeros!.reducJoueur).toBe(1)

    poserPartie({ army: armee, heros: auService('ajax'), nextAttackAt: Date.now() - 1 })
    useGame.getState().tick()
    const avecAjax = useGame.getState().battle
    expect(avecAjax).not.toBeNull()
    // 0,5 dans la fiche, ×0,5 dans le store : les 25 % promis au joueur ne
    // tiennent qu'à cette division. Quiconque relira `gardeDuCorpsPct` sans elle
    // doublera la protection sans s'en apercevoir
    expect(avecAjax!.reducJoueur).toBeCloseTo(0.75, 6)
    expect(avecAjax!.fighters.filter((f) => f.heros).map((f) => f.heros)).toEqual(['ajax'])
  })
})
