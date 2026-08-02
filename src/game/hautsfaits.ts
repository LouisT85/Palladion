import { BUILDING_IDS, GOD_IDS, POSTES, STOCKAGE } from './data'
import { HERO_IDS } from './heros'
import { VILLAGES_CIBLES } from './expeditions'
import type { BuildingId, GodId, ResourceId, UnitId } from './types'
import type { SaisonId } from './saisons'

/*
 * Les hauts faits ne sont pas des cases à cocher : chacun raconte une manière
 * de jouer. On les gagne UNE fois et pour toujours — même si l'on perd ensuite
 * ce qui les a permis. Ils alimentent le prestige, seule note finale du règne.
 */

/** vue en lecture seule de la partie, suffisante pour juger tous les hauts faits */
export interface SnapHautFait {
  resources: Record<ResourceId, number>
  faveur: number
  army: Record<UnitId, number>
  pop: number
  morale: number
  tours: number
  buildings: Record<BuildingId, { level: number }>
  gods: Record<GodId, { relation: number }>
  stats: { repousses: number; perdus: number; evenements: number }
  expeditions: Record<string, { etoiles: number; pillages?: number }>
  alliances: Record<string, unknown>
  heros: Record<string, { recrute: boolean; niveau: number; mort: boolean; arc: number }>
  villageois: { poste: BuildingId | null; lignee?: string }[]
  saison: SaisonId
  /** journées écoulées depuis la fondation (1 = premier jour) */
  jour: number
  /** compteurs de faits ponctuels tenus par le store */
  exploits: Record<string, number>
}

export type CategorieHF = 'batisseur' | 'guerre' | 'divin' | 'peuple' | 'legende'

export interface HautFaitDef {
  id: string
  emoji: string
  titre: string
  desc: string
  cat: CategorieHF
  /** points de prestige rapportés */
  points: number
  atteint: (s: SnapHautFait) => boolean
}

export const CATEGORIES: Record<CategorieHF, { nom: string; emoji: string }> = {
  batisseur: { nom: 'Bâtisseur', emoji: '🏗️' },
  guerre: { nom: 'Guerre', emoji: '⚔️' },
  divin: { nom: 'Olympe', emoji: '⚡' },
  peuple: { nom: 'Le peuple', emoji: '👥' },
  legende: { nom: 'Légende', emoji: '🏛️' },
}

/** journées de jeu par année (4 saisons × 4 journées) */
export const JOURS_PAR_AN = 16

const niveaux = (s: SnapHautFait): number => BUILDING_IDS.reduce((a, b) => a + s.buildings[b].level, 0)
const etoiles = (s: SnapHautFait): number => Object.values(s.expeditions).reduce((a, e) => a + e.etoiles, 0)
const herosVivants = (s: SnapHautFait): number =>
  HERO_IDS.filter((h) => s.heros[h]?.recrute && !s.heros[h].mort).length

export const HAUTS_FAITS: HautFaitDef[] = [
  // ── Bâtisseur ──────────────────────────────────────────────────────────────
  {
    id: 'premiere-pierre',
    emoji: '🧱',
    titre: 'La première pierre',
    desc: 'Achever un premier bâtiment.',
    cat: 'batisseur',
    points: 5,
    atteint: (s) => BUILDING_IDS.some((b) => b !== 'agora' && s.buildings[b].level >= 1),
  },
  {
    id: 'tout-est-bati',
    emoji: '🏘️',
    titre: 'Rien ne manque',
    desc: 'Avoir bâti les dix domaines du village.',
    cat: 'batisseur',
    points: 20,
    atteint: (s) => BUILDING_IDS.every((b) => s.buildings[b].level >= 1),
  },
  {
    id: 'agora-marbre',
    emoji: '🏛️',
    titre: 'Agora de marbre',
    desc: 'Porter l’Agora au niveau 4.',
    cat: 'batisseur',
    points: 20,
    atteint: (s) => s.buildings.agora.level >= 4,
  },
  {
    id: 'murs-poseidon',
    emoji: '🛡️',
    titre: 'Murailles bâties par Poséidon',
    desc: 'Porter les remparts au niveau 4.',
    cat: 'batisseur',
    points: 25,
    atteint: (s) => s.buildings.remparts.level >= 4,
  },
  {
    id: 'quatre-tours',
    emoji: '🏹',
    titre: 'Les quatre tours',
    desc: 'Dresser les quatre tours d’archers sur l’enceinte.',
    cat: 'batisseur',
    points: 20,
    atteint: (s) => s.tours >= 4,
  },
  {
    id: 'forge-hephaistos',
    emoji: '⚒️',
    titre: 'Manufacture d’Héphaïstos',
    desc: 'Porter la forge au niveau 4.',
    cat: 'batisseur',
    points: 15,
    atteint: (s) => s.buildings.forge.level >= 4,
  },
  {
    id: 'port-franc',
    emoji: '⚓',
    titre: 'Port franc',
    desc: 'Porter le port au niveau 4.',
    cat: 'batisseur',
    points: 15,
    atteint: (s) => s.buildings.port.level >= 4,
  },
  {
    id: 'cite-de-legende',
    emoji: '👑',
    titre: 'Cité de légende',
    desc: 'Porter les dix domaines au niveau 4.',
    cat: 'batisseur',
    points: 60,
    atteint: (s) => niveaux(s) >= BUILDING_IDS.length * 4,
  },
  {
    id: 'coffres-pleins',
    emoji: '📦',
    titre: 'Réserves d’empire',
    desc: 'Remplir les quatre entrepôts à ras bord en même temps.',
    cat: 'batisseur',
    points: 25,
    atteint: (s) => {
      const cap = STOCKAGE[s.buildings.agora.level] ?? 0
      return cap > 0 && (['bois', 'pierre', 'grain', 'bronze'] as ResourceId[]).every((r) => s.resources[r] >= cap * 0.98)
    },
  },

  // ── Guerre ─────────────────────────────────────────────────────────────────
  {
    id: 'premier-sang',
    emoji: '⚔️',
    titre: 'Premier sang',
    desc: 'Repousser un premier assaut.',
    cat: 'guerre',
    points: 5,
    atteint: (s) => s.stats.repousses >= 1,
  },
  {
    id: 'veteran',
    emoji: '🎖️',
    titre: 'Vétéran des murs',
    desc: 'Repousser dix assauts.',
    cat: 'guerre',
    points: 20,
    atteint: (s) => s.stats.repousses >= 10,
  },
  {
    id: 'rempart-des-troyens',
    emoji: '🛡️',
    titre: 'Rempart des Troyens',
    desc: 'Repousser vingt-cinq assauts.',
    cat: 'guerre',
    points: 45,
    atteint: (s) => s.stats.repousses >= 25,
  },
  {
    id: 'pas-un-homme',
    emoji: '🕊️',
    titre: 'Pas un homme',
    desc: 'Repousser un assaut sans perdre un seul soldat.',
    cat: 'guerre',
    points: 20,
    atteint: (s) => (s.exploits.assautSansPerte ?? 0) >= 1,
  },
  {
    id: 'trois-fronts',
    emoji: '🧭',
    titre: 'Sur trois fronts',
    desc: 'Tenir un assaut sur trois fronts sans perdre un homme.',
    cat: 'guerre',
    points: 45,
    atteint: (s) => (s.exploits.assautTroisFronts ?? 0) >= 1,
  },
  {
    id: 'muraille-intacte',
    emoji: '🧱',
    titre: 'Pas une pierre descellée',
    desc: 'Repousser un assaut sans qu’un seul pan de mur ne cède.',
    cat: 'guerre',
    points: 25,
    atteint: (s) => (s.exploits.assautMurIntact ?? 0) >= 1,
  },
  {
    id: 'petite-armee',
    emoji: '🗡️',
    titre: 'Une vraie troupe',
    desc: 'Entretenir vingt soldats en même temps.',
    cat: 'guerre',
    points: 15,
    atteint: (s) => s.army.lancier + s.army.archer + s.army.hoplite >= 20,
  },
  {
    id: 'phalange',
    emoji: '⚔️',
    titre: 'La phalange',
    desc: 'Aligner huit hoplites.',
    cat: 'guerre',
    points: 25,
    atteint: (s) => s.army.hoplite >= 8,
  },
  {
    id: 'premiere-razzia',
    emoji: '🏴‍☠️',
    titre: 'Première razzia',
    desc: 'Piller un village de la Troade.',
    cat: 'guerre',
    points: 10,
    atteint: (s) => Object.values(s.expeditions).some((e) => (e.pillages ?? 0) > 0),
  },
  {
    id: 'trois-etoiles',
    emoji: '⭐',
    titre: 'Sans une égratignure',
    desc: 'Rapporter trois étoiles d’une expédition.',
    cat: 'guerre',
    points: 20,
    atteint: (s) => Object.values(s.expeditions).some((e) => e.etoiles >= 3),
  },
  {
    id: 'troade-a-genoux',
    emoji: '🗺️',
    titre: 'La Troade à genoux',
    desc: 'Trois étoiles sur les huit places fortes.',
    cat: 'guerre',
    points: 70,
    atteint: (s) => VILLAGES_CIBLES.every((v) => (s.expeditions[v.id]?.etoiles ?? 0) >= 3),
  },
  {
    id: 'forteresse-mysienne',
    emoji: '🏰',
    titre: 'La grande place forte',
    desc: 'Prendre la forteresse mysienne.',
    cat: 'guerre',
    points: 35,
    atteint: (s) => (s.expeditions['forteresse-mysienne']?.etoiles ?? 0) >= 1,
  },

  // ── Olympe ─────────────────────────────────────────────────────────────────
  {
    id: 'premier-sacrifice',
    emoji: '🔥',
    titre: 'La fumée du sacrifice',
    desc: 'Obtenir une relation positive avec un Olympien.',
    cat: 'divin',
    points: 5,
    atteint: (s) => GOD_IDS.some((g) => s.gods[g].relation > 0),
  },
  {
    id: 'en-grace',
    emoji: '🙏',
    titre: 'En grâce',
    desc: 'Atteindre 40 de relation avec un dieu.',
    cat: 'divin',
    points: 15,
    atteint: (s) => GOD_IDS.some((g) => s.gods[g].relation >= 40),
  },
  {
    id: 'elu',
    emoji: '✨',
    titre: 'Élu du dieu',
    desc: 'Atteindre 70 de relation avec un dieu.',
    cat: 'divin',
    points: 30,
    atteint: (s) => GOD_IDS.some((g) => s.gods[g].relation >= 70),
  },
  {
    id: 'elu-des-quatre',
    emoji: '⚡',
    titre: 'Élu des quatre Olympiens',
    desc: 'Atteindre 70 de relation avec Zeus, Poséidon, Athéna et Arès.',
    cat: 'divin',
    points: 70,
    atteint: (s) => GOD_IDS.every((g) => s.gods[g].relation >= 70),
  },
  {
    id: 'maudit',
    emoji: '💀',
    titre: 'Maudit soit-il',
    desc: 'Descendre à −70 de relation avec un dieu. Ce n’est pas un compliment.',
    cat: 'divin',
    points: 10,
    atteint: (s) => GOD_IDS.some((g) => s.gods[g].relation <= -70),
  },
  {
    id: 'foudroyeur',
    emoji: '🌩️',
    titre: 'Le bras des dieux',
    desc: 'Invoquer vingt bénédictions.',
    cat: 'divin',
    points: 25,
    atteint: (s) => (s.exploits.benedictions ?? 0) >= 20,
  },
  {
    id: 'grande-maison',
    emoji: '🏛️',
    titre: 'Une grande maison',
    desc: 'Voir cinq vivants porter la même lignée. Une famille qui tient, c’est un métier qui se transmet.',
    cat: 'peuple',
    points: 30,
    atteint: (s) => {
      const compte = new Map<string, number>()
      for (const v of s.villageois) {
        if (!v.lignee) continue
        compte.set(v.lignee, (compte.get(v.lignee) ?? 0) + 1)
      }
      return [...compte.values()].some((n) => n >= 5)
    },
  },
  {
    id: 'trois-generations',
    emoji: '👶',
    titre: 'Trois générations',
    desc: 'Célébrer dix mariages dans le village. Les foyers font les enfants, les enfants font les métiers.',
    cat: 'peuple',
    points: 25,
    atteint: (s) => (s.exploits.mariages ?? 0) >= 10,
  },
  {
    id: 'sang-de-heros',
    emoji: '⚔️',
    titre: 'Le sang d’un héros',
    desc: 'Abattre sous vos murs un champion achéen — l’un de ceux dont on chante le nom.',
    cat: 'guerre',
    points: 40,
    atteint: (s) => (s.exploits.championsAbattus ?? 0) >= 1,
  },
  {
    id: 'tueur-de-noms',
    emoji: '☠️',
    titre: 'Tueur de noms',
    desc: 'En abattre trois. La plaine devant votre porte est devenue un cimetière de légendes.',
    cat: 'guerre',
    points: 70,
    atteint: (s) => (s.exploits.championsAbattus ?? 0) >= 3,
  },
  {
    id: 'douze-graces',
    emoji: '✨',
    titre: 'Les douze grâces',
    desc: 'Obtenir les trois grâces des quatre Olympiens. Il aura fallu leur plaire, puis tout dépenser.',
    cat: 'divin',
    points: 45,
    atteint: (s) => (s.exploits.graces ?? 0) >= 12,
  },
  {
    id: 'breche-recollee',
    emoji: '🔱',
    titre: 'Les pierres se ressoudent',
    desc: 'Refermer un pan de mur effondré au trident de Poséidon, en pleine bataille.',
    cat: 'divin',
    points: 25,
    atteint: (s) => (s.exploits.brecheRecollee ?? 0) >= 1,
  },
  {
    id: 'temple-chryselephantin',
    emoji: '🏛️',
    titre: 'Statue chryséléphantine',
    desc: 'Porter le temple au niveau 4.',
    cat: 'divin',
    points: 20,
    atteint: (s) => s.buildings.temple.level >= 4,
  },
  {
    id: 'faiseur-de-choix',
    emoji: '📜',
    titre: 'Faiseur de choix',
    desc: 'Trancher vingt-cinq dilemmes.',
    cat: 'divin',
    points: 25,
    atteint: (s) => s.stats.evenements >= 25,
  },

  // ── Le peuple ──────────────────────────────────────────────────────────────
  {
    id: 'village-exalte',
    emoji: '🎭',
    titre: 'Village en liesse',
    desc: 'Porter l’ambiance à 90.',
    cat: 'peuple',
    points: 20,
    atteint: (s) => s.morale >= 90,
  },
  {
    id: 'cinquante-ames',
    emoji: '👥',
    titre: 'Cinquante âmes',
    desc: 'Compter cinquante habitants.',
    cat: 'peuple',
    points: 30,
    atteint: (s) => s.pop >= 50,
  },
  {
    id: 'plein-emploi',
    emoji: '👷',
    titre: 'Plein emploi',
    desc: 'Tenir tous les postes de travail du village, sans un oisif.',
    cat: 'peuple',
    points: 25,
    atteint: (s) => {
      const postes = BUILDING_IDS.reduce((a, b) => a + (POSTES[b]?.[s.buildings[b].level] ?? 0), 0)
      if (postes === 0) return false
      const tenus = s.villageois.filter((v) => v.poste !== null).length
      return tenus >= postes && s.villageois.every((v) => v.poste !== null)
    },
  },
  {
    id: 'grand-hiver',
    emoji: '❄️',
    titre: 'Le grand hiver',
    desc: 'Traverser un hiver sans que le grenier ne se vide.',
    cat: 'peuple',
    points: 25,
    atteint: (s) => (s.exploits.hiverTraverse ?? 0) >= 1,
  },
  {
    id: 'une-annee',
    emoji: '🌗',
    titre: 'Une année entière',
    desc: 'Atteindre la deuxième année de la fondation.',
    cat: 'peuple',
    points: 20,
    atteint: (s) => s.jour > JOURS_PAR_AN,
  },
  {
    id: 'cinq-ans',
    emoji: '🕰️',
    titre: 'Cinq ans de règne',
    desc: 'Atteindre la cinquième année.',
    cat: 'peuple',
    points: 50,
    atteint: (s) => s.jour > JOURS_PAR_AN * 4,
  },
  {
    id: 'jamais-pille',
    emoji: '🕊️',
    titre: 'Jamais pillé',
    desc: 'Repousser dix assauts sans avoir jamais laissé entrer l’ennemi.',
    cat: 'peuple',
    points: 40,
    atteint: (s) => s.stats.repousses >= 10 && s.stats.perdus === 0,
  },

  // ── Légende ────────────────────────────────────────────────────────────────
  {
    id: 'heros-a-ma-table',
    emoji: '🛡️',
    titre: 'Un héros à ma table',
    desc: 'Prendre un héros à son service.',
    cat: 'legende',
    points: 15,
    atteint: (s) => HERO_IDS.some((h) => s.heros[h]?.recrute),
  },
  {
    id: 'cour-des-braves',
    emoji: '🏅',
    titre: 'La cour des braves',
    desc: 'Entretenir quatre héros vivants en même temps.',
    cat: 'legende',
    points: 40,
    atteint: (s) => herosVivants(s) >= 4,
  },
  {
    id: 'tous-les-heros',
    emoji: '👑',
    titre: 'Toute la matière troyenne',
    desc: 'Avoir eu les huit héros à son service.',
    cat: 'legende',
    points: 70,
    atteint: (s) => HERO_IDS.every((h) => s.heros[h]?.recrute || s.heros[h]?.mort),
  },
  {
    id: 'heros-au-sommet',
    emoji: '⭐',
    titre: 'Au sommet de sa légende',
    desc: 'Porter un héros au niveau 5.',
    cat: 'legende',
    points: 35,
    atteint: (s) => HERO_IDS.some((h) => s.heros[h]?.niveau >= 5 && !s.heros[h].mort),
  },
  {
    id: 'nom-pour-les-aedes',
    emoji: '🕯️',
    titre: 'Un nom pour les aèdes',
    desc: 'Aller au bout de l’arc d’un héros — jusqu’à sa mort.',
    cat: 'legende',
    points: 30,
    atteint: (s) => HERO_IDS.some((h) => s.heros[h]?.mort),
  },
  {
    id: 'le-sauveur',
    emoji: '🤝',
    titre: 'Le sauveur',
    desc: 'Lever le siège d’un village qui appelait à l’aide.',
    cat: 'legende',
    points: 20,
    atteint: (s) => (s.exploits.secours ?? 0) >= 1,
  },
  {
    id: 'reseau',
    emoji: '🤝',
    titre: 'Le réseau plutôt que l’or',
    desc: 'Compter trois villages alliés en même temps.',
    cat: 'legende',
    points: 45,
    atteint: (s) => Object.keys(s.alliances).length >= 3,
  },
  {
    id: 'le-traitre',
    emoji: '🗡️',
    titre: 'Le traître',
    desc: 'Piller un village qu’on avait sauvé. Zeus n’oublie pas.',
    cat: 'legende',
    points: 10,
    atteint: (s) => (s.exploits.trahisons ?? 0) >= 1,
  },
]

export const HF_PAR_ID: Record<string, HautFaitDef> = Object.fromEntries(HAUTS_FAITS.map((h) => [h.id, h]))
export const POINTS_TOTAUX = HAUTS_FAITS.reduce((a, h) => a + h.points, 0)

// ── Prestige ─────────────────────────────────────────────────────────────────

export interface DetailPrestige {
  label: string
  points: number
}

/**
 * Score de prestige : ce que le règne laisse derrière lui. Bâti, tenu, honoré,
 * conquis, allié — chaque axe compte, aucun ne suffit seul.
 */
export function detailPrestige(s: SnapHautFait, acquis: string[]): DetailPrestige[] {
  const relationsPositives = GOD_IDS.reduce((a, g) => a + Math.max(0, s.gods[g].relation), 0)
  const niveauxHeros = HERO_IDS.reduce((a, h) => a + (s.heros[h]?.recrute && !s.heros[h].mort ? s.heros[h].niveau : 0), 0)
  return [
    { label: 'Bâtiments élevés', points: niveaux(s) * 4 },
    { label: 'Tours d’archers', points: s.tours * 6 },
    { label: 'Habitants', points: s.pop * 2 },
    { label: 'Assauts repoussés', points: s.stats.repousses * 4 },
    { label: 'Étoiles d’expédition', points: etoiles(s) * 8 },
    { label: 'Villages alliés', points: Object.keys(s.alliances).length * 18 },
    { label: 'Ferveur des Olympiens', points: Math.round(relationsPositives / 3) },
    { label: 'Héros à votre table', points: herosVivants(s) * 12 + niveauxHeros * 4 },
    { label: 'Journées de règne', points: s.jour * 2 },
    { label: 'Hauts faits', points: acquis.reduce((a, id) => a + (HF_PAR_ID[id]?.points ?? 0), 0) },
  ]
}

export function prestige(s: SnapHautFait, acquis: string[]): number {
  return detailPrestige(s, acquis).reduce((a, d) => a + d.points, 0)
}

/** ce que les aèdes retiendront du règne */
export function titrePrestige(score: number): { titre: string; desc: string } {
  if (score >= 1400) return { titre: 'Égal des dieux', desc: 'On ne sait plus si l’on raconte un homme ou un Olympien.' }
  if (score >= 1000) return { titre: 'Héros de la Troade', desc: 'Votre nom se chante d’Ilion à Mycènes.' }
  if (score >= 700) return { titre: 'Prince d’Ilion', desc: 'Priam vous aurait reçu à sa table.' }
  if (score >= 450) return { titre: 'Seigneur de la plaine', desc: 'La région compte avec vous — et vous craint un peu.' }
  if (score >= 250) return { titre: 'Chef de guerre', desc: 'On sait où sont vos murs, et qu’ils tiennent.' }
  if (score >= 120) return { titre: 'Maître de village', desc: 'Une bourgade honnête, quelques greniers pleins.' }
  return { titre: 'Roi de pacotille', desc: 'Un tas de cabanes et beaucoup d’ambition.' }
}
