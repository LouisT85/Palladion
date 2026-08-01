#!/usr/bin/env node
/*
 * Captures d'écran du README, reproductibles.
 *
 *   npm run dev -- --port 5199 --strictPort     (dans un autre terminal)
 *   node scripts/captures.mjs [port]
 *
 * Chaque vignette pose un état de jeu PRÉCIS avant de photographier : ni chance
 * ni patience requises, et deux exécutions donnent la même image. Le store est
 * exposé sur `window.__palladion` en développement uniquement (voir store.ts).
 *
 * Le navigateur est le Chrome (ou l'Edge) déjà installé sur la machine — aucun
 * téléchargement de 130 Mo, `playwright-core` suffit.
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = process.argv[2] ?? '5199'
const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SORTIE = resolve(RACINE, 'docs')
const VUE = { width: 1600, height: 900 }
/** le tick du jeu bat à 4 Hz : deux battements suffisent pour que tout se répercute */
const RESPIRE = 700
/** une journée de jeu, en millisecondes réelles (doit suivre DAY_MS de data.ts) */
const JOUR = 8 * 60_000

mkdirSync(SORTIE, { recursive: true })

// ── Fabriques d'états ────────────────────────────────────────────────────────

const NIVEAUX = (n) => ({
  agora: { level: n },
  remparts: { level: n },
  maisons: { level: n },
  ferme: { level: n },
  scierie: { level: n },
  carriere: { level: n },
  forge: { level: n },
  caserne: { level: n },
  temple: { level: n },
  port: { level: n },
})

/**
 * Âge du village choisi pour tomber sur la bonne saison ET en plein jour :
 * la saison suit `floor(jour / 4) % 4`, la phase du jour la partie décimale
 * (0,30 = matinée franche). Poser une saison qui contredirait l'âge ferait
 * basculer le calendrier au premier tick — et surgir un bandeau de saison.
 */
const AGE = {
  printemps: JOUR * 2.3, // jour 2
  ete: JOUR * 6.3, // jour 6
  automne: JOUR * 9.3, // jour 9
  hiver: JOUR * 14.3, // jour 14
  printempsAn2: JOUR * 17.3, // jour 17
  eteAn2: JOUR * 21.3, // jour 21
}

/**
 * Sauvegarde PARTIELLE : `init()` fusionne l'état initial avec ce qu'on donne,
 * il suffit donc de décrire ce qui doit changer. `lastSeen` au présent évite la
 * fenêtre « pendant votre absence ».
 */
function sauvegarde(age, champs) {
  const now = Date.now()
  return {
    createdAt: now - age,
    lastSeen: now,
    nextAttackAt: now + 30 * 60_000, // aucune alerte à l'écran, sauf demande contraire
    tutorialDone: false, // aucun dilemme ne s'invite pendant la pose
    ...champs,
  }
}

const ARMEE = (l, a, h) => ({ lancier: l, archer: a, hoplite: h })
const RELATIONS = (z, p, at, ar) => ({
  zeus: { relation: z, cooldownUntil: 0 },
  poseidon: { relation: p, cooldownUntil: 0 },
  athena: { relation: at, cooldownUntil: 0 },
  ares: { relation: ar, cooldownUntil: 0 },
})

/**
 * Un héros à votre service. `arc` par défaut à 9 : au-delà du dernier nœud,
 * donc aucun dilemme de héros ne s'ouvrira par-dessus la vignette. Le panneau
 * l'affiche quand même comme « arc terminé ».
 */
const HERO = (niveau, arc = 9) => ({
  recrute: true,
  niveau,
  xp: 30 + niveau * 20,
  arc,
  choix: [],
  mort: false,
  cooldownUntil: 0,
  boudeJusqua: 0,
  plafond: 5,
  impayes: 0,
  inactif: 0,
})

/**
 * Missions déjà réclamées. Le suivi n'affiche que les cinq suivantes : sans
 * cela, une cité achevée s'afficherait avec « Construisez la ferme » en tête,
 * ce qui n'a aucun sens. L'ordre suit celui de missions.ts.
 */
const MISSIONS = [
  'nouveau-depart', 'le-pain-d-abord', 'bras-aux-champs', 'bois-pour-l-hiver', 'pierre-du-pays',
  'trois-au-travail', 'premiers-remparts', 'appel-aux-armes', 'trois-lances', 'premiere-victoire',
  'maison-des-dieux', 'un-pretre-au-temple', 'grandir', 'un-toit-pour-tous', 'dix-habitants',
  'champs-a-deux-mains', 'yeux-sur-les-murs', 'bucherons-et-carriers', 'premier-raid', 'premiers-dilemmes',
  'muraille-de-pierre', 'premiere-tour', 'forge-de-bronze', 'un-forgeron', 'commerce-egeen',
  'le-docker', 'reserves-du-village', 'devotion', 'deux-etoiles', 'prosperite',
  'quinze-habitants', 'cour-d-armes', 'muraille-d-hoplites', 'remparts-crenelees', 'deux-tours',
  'dix-au-travail', 'deux-fronts', 'cheri-des-dieux', 'trois-etoiles', 'six-etoiles',
]
const jusqua = (n) => MISSIONS.slice(0, n)

/** état d'une cité accomplie, réutilisé par plusieurs vignettes */
const CITE = {
  missionsReclamees: jusqua(38),
  resources: { bois: 1800, pierre: 1900, grain: 1700, bronze: 1200 },
  buildings: NIVEAUX(4),
  wallHp: 2200,
  tours: 4,
  pop: 44,
  faveur: 96,
  army: ARMEE(10, 8, 6),
  morale: 86,
  saison: 'ete',
  meteo: 'clair',
}

// ── Les vignettes ────────────────────────────────────────────────────────────

const VIGNETTES = [
  {
    nom: 'village-debut',
    format: 'jpeg',
    quoi: 'Le hameau des premiers jours',
    save: sauvegarde(AGE.printemps, {
      resources: { bois: 210, pierre: 140, grain: 260, bronze: 34 },
      buildings: {
        ...NIVEAUX(0),
        agora: { level: 1 },
        maisons: { level: 1 },
        ferme: { level: 1 },
        scierie: { level: 1 },
        carriere: { level: 1 },
        remparts: { level: 1 },
      },
      wallHp: 250,
      pop: 8,
      army: ARMEE(2, 0, 0),
      morale: 62,
      saison: 'printemps',
      meteo: 'clair',
      missionsReclamees: jusqua(2),
    }),
    apres: { auTravail: true },
  },
  {
    nom: 'tutoriel',
    format: 'jpeg',
    quoi: 'La leçon de Zeus — focus verrouillé sur le geste attendu',
    save: sauvegarde(AGE.printemps, {
      resources: { bois: 220, pierre: 150, grain: 220, bronze: 20 },
      buildings: { ...NIVEAUX(0), agora: { level: 1 } },
      pop: 7,
      army: ARMEE(0, 0, 0),
      morale: 52,
      saison: 'printemps',
      meteo: 'clair',
    }),
    // étape 3 : « Bâtis d'abord une ferme », panneau de la ferme déjà ouvert
    apres: { tuto: 3, tutoSelection: 'ferme' },
  },
  {
    nom: 'village-max',
    format: 'jpeg',
    quoi: 'La cité de légende — dix domaines au niveau 4, quatre tours',
    save: sauvegarde(AGE.ete, {
      ...CITE,
      resources: { bois: 2100, pierre: 2400, grain: 2600, bronze: 1450 },
      pop: 46,
      gods: RELATIONS(74, 61, 80, 44),
      expeditions: { 'camp-pillards': { etoiles: 3, dernierRaid: 0, pillages: 1 } },
    }),
    apres: { auTravail: true },
  },
  {
    nom: 'saisons',
    format: 'jpeg',
    quoi: 'L’hiver ferme la mer — neige au sol, congères, arbres nus',
    save: sauvegarde(AGE.hiver, {
      resources: { bois: 1400, pierre: 1600, grain: 900, bronze: 720 },
      buildings: { ...NIVEAUX(3), agora: { level: 4 }, remparts: { level: 4 }, maisons: { level: 4 } },
      wallHp: 2200,
      tours: 3,
      pop: 33,
      faveur: 58,
      army: ARMEE(6, 5, 3),
      morale: 71,
      saison: 'hiver',
      meteo: 'neige',
      missionsReclamees: jusqua(30),
    }),
    apres: { auTravail: true },
  },
  {
    nom: 'missions',
    format: 'jpeg',
    quoi: 'Le fil rouge des missions, toujours à l’écran',
    save: sauvegarde(AGE.automne, {
      resources: { bois: 640, pierre: 520, grain: 700, bronze: 180 },
      buildings: { ...NIVEAUX(2), agora: { level: 3 }, ferme: { level: 3 }, remparts: { level: 2 } },
      wallHp: 600,
      tours: 1,
      pop: 19,
      faveur: 41,
      army: ARMEE(5, 3, 0),
      morale: 74,
      saison: 'automne',
      meteo: 'clair',
      missionsReclamees: jusqua(16),
    }),
    apres: { auTravail: true },
  },
  {
    nom: 'campagne',
    format: 'jpeg',
    quoi: 'Le prologue de l’acte I — objectifs imposés, situation héritée',
    // aucune sauvegarde : on veut l'écran de choix du mode, puis la campagne
    save: null,
    apres: { campagne: true },
  },
  {
    nom: 'missions-fil',
    quoi: 'Le fil rouge complet — cinq actes, et un bouton par mission',
    save: sauvegarde(AGE.automne, {
      resources: { bois: 640, pierre: 520, grain: 700, bronze: 180 },
      buildings: { ...NIVEAUX(2), agora: { level: 3 }, ferme: { level: 3 }, remparts: { level: 2 } },
      wallHp: 600,
      tours: 1,
      pop: 19,
      faveur: 41,
      army: ARMEE(5, 3, 0),
      morale: 74,
      saison: 'automne',
      meteo: 'clair',
      missionsReclamees: jusqua(16),
    }),
    apres: { auTravail: true, panel: 'missions' },
  },
  {
    nom: 'bataille',
    format: 'jpeg',
    quoi: 'Un assaut sur trois fronts, joué en direct sur la carte',
    save: sauvegarde(AGE.ete, {
      ...CITE,
      faveur: 100,
      army: ARMEE(10, 8, 6),
      threatMod: 40,
      threat: 82,
      gods: RELATIONS(72, 55, 66, 58),
    }),
    apres: { auTravail: true, assaut: true },
    // assez pour que la colonne soit au pied des murs et que les tours tirent,
    // pas assez pour que tout soit déjà fini
    attendre: 17_000,
  },
  {
    nom: 'expedition',
    format: 'jpeg',
    quoi: 'L’assaut de la cité de Lesbos — décor peint, caméra serrée',
    save: sauvegarde(AGE.ete, { ...CITE, faveur: 100, army: ARMEE(11, 8, 7) }),
    apres: { auTravail: true, expedition: { village: 'cite-lesbos', troupes: ARMEE(8, 5, 5), intention: 'pillage' } },
    attendre: 21_000,
  },
  {
    nom: 'heros',
    quoi: 'La maisonnée héroïque — passifs, capacités, arcs, entretien',
    save: sauvegarde(AGE.ete, {
      ...CITE,
      gods: RELATIONS(66, 52, 74, 48),
      stats: { repousses: 9, perdus: 1, evenements: 14 },
      expeditions: {
        'camp-pillards': { etoiles: 3, dernierRaid: 0 },
        'hameau-thrace': { etoiles: 3, dernierRaid: 0 },
      },
      // Cassandre au niveau 2 : son deuxième nœud attend le niveau 3, elle
      // n'interrompra donc pas la pose — mais le panneau montre « arc 1/2 »
      heros: { hector: HERO(4), ulysse: HERO(3), cassandre: HERO(2, 1) },
    }),
    apres: { auTravail: true, panel: 'heros' },
  },
  {
    nom: 'heros-arc',
    quoi: 'L’arc d’Hector : un choix qui peut le tuer pour de bon',
    save: sauvegarde(AGE.ete, {
      ...CITE,
      gods: RELATIONS(66, 52, 74, 48),
      stats: { repousses: 12, perdus: 1, evenements: 18 },
      // niveau 4, deux nœuds derrière lui : « la poursuite autour des murs »
      heros: { hector: HERO(4, 2) },
    }),
    apres: { auTravail: true, arcHeros: true },
  },
  {
    nom: 'pantheon',
    quoi: 'La ferveur se voit — aperçu de la manifestation de chaque dieu',
    save: sauvegarde(AGE.ete, {
      ...CITE,
      faveur: 88,
      // Zeus élu et Poséidon offensé en tête de liste : le premier écran montre
      // d'emblée les deux extrêmes — l'éclair pourpre et la manifestation avortée
      gods: RELATIONS(82, -58, 47, 4),
    }),
    apres: { auTravail: true, panel: 'pantheon' },
  },
  {
    nom: 'hauts-faits',
    quoi: 'Quarante-cinq hauts faits et le prestige du règne',
    save: sauvegarde(AGE.eteAn2, {
      ...CITE,
      resources: { bois: 2400, pierre: 2600, grain: 2500, bronze: 1800 },
      pop: 48,
      faveur: 100,
      army: ARMEE(12, 9, 8),
      morale: 90,
      gods: RELATIONS(84, 76, 88, 71),
      stats: { repousses: 21, perdus: 2, evenements: 33 },
      expeditions: {
        'camp-pillards': { etoiles: 3, dernierRaid: 0, pillages: 2 },
        'hameau-thrace': { etoiles: 3, dernierRaid: 0, pillages: 1 },
        'comptoir-phenicien': { etoiles: 3, dernierRaid: 0, pillages: 1 },
        'village-dardanien': { etoiles: 2, dernierRaid: 0 },
        'fort-acheen': { etoiles: 3, dernierRaid: 0, pillages: 1 },
      },
      alliances: { 'cite-lesbos': { depuis: 0, tributAt: Date.now() + 90_000 } },
      heros: { hector: HERO(5, 3), ajax: HERO(3, 1), enee: HERO(2) },
      exploits: {
        assautSansPerte: 3,
        assautTroisFronts: 1,
        assautMurIntact: 4,
        benedictions: 27,
        secours: 2,
        hiverTraverse: 1,
        brecheRecollee: 1,
      },
    }),
    apres: { auTravail: true, panel: 'hauts-faits' },
  },
  {
    nom: 'evenement',
    quoi: 'Un dilemme — et le murmure d’Athéna, qui ne peut pas mentir',
    save: sauvegarde(AGE.automne, {
      resources: { bois: 780, pierre: 640, grain: 820, bronze: 240 },
      buildings: { ...NIVEAUX(2), agora: { level: 3 }, temple: { level: 3 }, remparts: { level: 3 } },
      wallHp: 1250,
      tours: 2,
      pop: 22,
      faveur: 56,
      army: ARMEE(5, 4, 1),
      morale: 76,
      saison: 'automne',
      meteo: 'pluie',
      // Athéna ≥ 25 : elle souffle la vérité cachée sous chaque option
      gods: RELATIONS(38, 22, 61, 12),
    }),
    apres: { auTravail: true, evenement: { defId: 'refugies-troyens', roll: 0.37 } },
  },
]

// ── Boucle de capture ────────────────────────────────────────────────────────

/** lance le Chrome (ou l'Edge) du poste plutôt que d'en télécharger un */
async function ouvrirNavigateur() {
  for (const channel of ['chrome', 'msedge']) {
    try {
      return await chromium.launch({ channel })
    } catch {
      // canal absent : on essaie le suivant
    }
  }
  return chromium.launch()
}

const navigateur = await ouvrirNavigateur()
const erreurs = []
let echecs = 0

for (const v of VIGNETTES) {
  // un contexte neuf par vignette : aucun état ne déborde sur la suivante
  const contexte = await navigateur.newContext({ viewport: VUE, reducedMotion: 'no-preference' })
  const page = await contexte.newPage()
  const avant = erreurs.length
  page.on('pageerror', (e) => erreurs.push(`${v.nom} : ${e}`))
  page.on('console', (m) => {
    if (m.type() === 'error') erreurs.push(`${v.nom} : ${m.text()}`)
  })

  // la sauvegarde est posée AVANT le premier script de la page : `init()` la lit.
  // `save: null` = première partie, donc l'écran de choix du mode s'ouvre.
  if (v.save) {
    await page.addInitScript(
      ([cle, data]) => localStorage.setItem(cle, data),
      ['palladion-save-v1', JSON.stringify(v.save)],
    )
  } else {
    await page.addInitScript(() => localStorage.clear())
  }
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__palladion, null, { timeout: 20_000 })
  await page.waitForTimeout(RESPIRE)

  if (v.apres) {
    await page.evaluate((a) => {
      const jeu = window.__palladion
      /*
       * Un village prospère n'a pas quarante bras à ne rien faire. Mais dans le
       * jeu, PERSONNE ne prend son poste tout seul : la pose doit donc affecter
       * les habitants elle-même, et chacun à son métier quand c'est possible.
       */
      if (a.auTravail) {
        for (const b of ['ferme', 'scierie', 'carriere', 'forge', 'temple', 'port']) {
          // au plus quatre postes par atelier ; l'action refuse d'elle-même le reste
          for (let i = 0; i < 4; i++) {
            const g = jeu.getState()
            const libre =
              g.villageois.find((v) => v.poste === null && v.metier === b) ??
              g.villageois.find((v) => v.poste === null)
            if (!libre) break
            const avant = g.villageois.filter((v) => v.poste === b).length
            g.affecter(libre.id, b)
            if (jeu.getState().villageois.filter((v) => v.poste === b).length === avant) break
          }
        }
      }
      // la campagne : on choisit le mode, l'acte I se pose et le prologue s'ouvre
      if (a.campagne) jeu.getState().choisirMode('campagne')
      if (a.panel) jeu.getState().openPanel(a.panel)
      if (a.assaut) jeu.setState({ nextAttackAt: Date.now() + 400 })
      // la leçon de Zeus : on se pose sur l'étape voulue, panneau déjà ouvert
      if (a.tuto !== undefined) jeu.setState({ tutoriel: a.tuto, selected: a.tutoSelection ?? null })
      // le tick ouvre de lui-même le nœud d'arc mûr : il suffit de l'y autoriser
      if (a.arcHeros) jeu.setState({ tutorialDone: true })
      if (a.expedition) {
        jeu.getState().lancerExpedition(a.expedition.village, a.expedition.troupes, a.expedition.intention)
      }
      if (a.evenement) {
        jeu.setState({
          activeEvent: { ...a.evenement, startedAt: Date.now() },
          eventOutcome: null,
        })
      }
    }, v.apres)
  }
  await page.waitForTimeout(v.attendre ?? RESPIRE * 2)

  // les bulles de notification appartiennent au jeu, pas à la photo
  await page.evaluate(() => window.__palladion.setState({ toasts: [] }))
  await page.waitForTimeout(160)

  /*
   * Les scènes de carte portent un grain fractal sur chaque pixel : en PNG
   * elles pèsent plus d'un mégaoctet pièce. En JPEG de qualité 88, elles
   * tombent à ~200 Ko sans qu'on voie la différence. Les panneaux, eux, sont
   * pleins de petit texte : ils restent en PNG, où il demeure net.
   */
  const jpeg = v.format === 'jpeg'
  const fichier = resolve(SORTIE, `${v.nom}.${jpeg ? 'jpg' : 'png'}`)
  await page.screenshot({ path: fichier, animations: 'allow', ...(jpeg ? { type: 'jpeg', quality: 88 } : {}) })
  const nouvelles = erreurs.slice(avant)
  if (nouvelles.length) echecs++
  console.log(`${nouvelles.length ? '⚠' : '✓'} ${v.nom.padEnd(14)} ${v.quoi}`)
  await contexte.close()
}

await navigateur.close()

if (erreurs.length) {
  console.error(`\n${erreurs.length} erreur(s) JS sur ${echecs} vignette(s) :`)
  for (const e of erreurs) console.error('  ' + e)
  process.exit(1)
}
console.log(`\n${VIGNETTES.length} captures écrites dans docs/.`)
