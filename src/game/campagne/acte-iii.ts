import { troupes } from '../data'
import { jalons, seuil, type ActeCampagne } from './types'

/*
 * ACTE III - SOUS LES MURS
 *
 * Les deux premiers actes se jouaient pour du grain : on venait prendre, on
 * repartait chargé, on revenait à la moisson suivante. Celui-ci change la
 * nature de la convoitise. Un village fortifié à mi-chemin du camp et de la
 * ville n'est plus un grenier : c'est un point d'appui - et un point d'appui,
 * on ne le pille pas, on le prend et on le garde. D'où des vagues qui ne
 * cherchent plus la grange mais la porte, et qui tâtent DEUX pans à la fois
 * pour voir lequel cède le premier.
 *
 * L'acte se joue donc en pierre : muraille crénelée, seconde tour, archers qui
 * ne descendent jamais du rempart. Et il apporte le premier héros. Hector ne
 * vient pas sauver le village - il vient s'appuyer dessus, il mange chaque
 * minute qu'il passe là, et le joueur découvre du même coup ce qu'un homme
 * comme lui change dans une mêlée.
 *
 * Ce que l'acte ne promet à personne : que cela serve à quelque chose. Hector
 * fait gagner un automne. Il ne fera pas gagner la guerre.
 */
export const ACTE_III: ActeCampagne = {
  id: 'sous-les-murs',
  numero: 3,
  titre: 'Acte III - Sous les murs',
  lieu: 'La plaine de Troie, à l’automne',
  emoji: '🏰',
  cadre: 'murailles',
  prologue: [
    'L’automne a détrempé la plaine. Depuis un mois, elle change de maître deux fois par jour : les Achéens la tiennent au matin, les Troyens au soir, et chaque soir on ramasse les morts un peu plus loin que la veille.',
    'Hier, Hector est allé jusqu’aux nefs. Il a mis le feu à celle de Protésilas - une seule coque, mais mille équipages ont vu la fumée monter de leur propre grève. Cette nuit, dans le camp, on a creusé un second fossé.',
    'Deux fois cet automne la guerre s’est arrêtée pour un duel : Pâris contre Ménélas devant les deux armées, puis Hector contre Ajax jusqu’à ce que la nuit les sépare. Deux fois elle a repris, plus lourde. Et l’on jure avoir vu des dieux dans la poussière, en personne, à pousser des chars et détourner des lances - quand les Olympiens descendent se battre eux-mêmes, c’est que les hommes ne suffisent plus.',
    'Ce qui a changé pour toi tient en une phrase : on ne vient plus pour ton grain, on vient pour tes murs. Un enclos qui tient debout entre le camp et la ville, les deux camps le veulent. Et l’on ne tâte plus une seule porte : on frappe deux pans à la fois.',
    'Hector est arrivé ce matin, trente hommes derrière lui, sans rien demander. Il tient ta porte parce qu’elle est debout, et il mangera ton grain tant qu’elle le restera. Bâtis en pierre, dresse une seconde tour, et regarde ce qu’un seul homme fait dans une mêlée. Cela ne sauvera pas Troie. Cela te fera passer l’automne.',
  ],
  epilogue: [
    'Les remparts ont tenu sur deux pans à la fois. Au matin, la porte de l’est fumait encore, le mur du sud avait perdu deux coudées de crénelage, et l’on comptait les morts dehors - pas dedans.',
    'Hector est reparti vers les nefs sans remercier personne. Avant de monter en char, il a passé la main sur la pierre neuve comme on tâte l’encolure d’un cheval : « De la bonne pierre. Garde-la pour toi. » Nul n’a su s’il parlait de ton mur ou de la ville derrière lui.',
    'Sur la grève, la fumée n’est pas retombée. On raconte qu’un homme a emprunté les armes d’Achille ce matin et pris la route de la ville, et que le Pélide, lui, n’est toujours pas sorti de sa tente. L’automne n’est pas fini.',
  ],
  echec: [
    'Ils sont entrés par le mur du nord pendant qu’on regardait la porte de l’est. Deux fronts : c’était un de trop, et il n’y avait qu’une tour.',
    'Hector n’a pas couvert la retraite. Un point d’appui qui s’effondre n’est plus un point d’appui, et il avait une guerre à mener. La guerre, elle, ne recommence pas à son début ; toi, si.',
  ],
  /*
   * On hérite de l'été : l'agora a passé le troisième niveau (elle plafonne tout
   * le reste, donc c'est elle qui autorise la muraille de pierre), le muret de
   * l'acte II porte déjà une tour - TOURS_MAX[2] n'en permet qu'une - et les
   * assauts de la canicule y ont laissé un cinquième de la structure.
   */
  depart: {
    resources: { bois: 700, pierre: 640, grain: 560, bronze: 220 },
    pop: 19,
    batiments: {
      agora: 3,
      maisons: 2,
      ferme: 2,
      scierie: 2,
      carriere: 2,
      remparts: 2,
      caserne: 2,
      temple: 2,
      forge: 1,
      // un ponton de bois hérité de l'été : en automne la mer est encore ouverte,
      // et le comptoir change le bois excédentaire en pierre à bâtir
      port: 1,
    },
    army: troupes({ lancier: 5, archer: 3, hoplite: 1, frondeur: 0, peltaste: 0, belier: 0 }),
    morale: 58,
    faveur: 40,
    tours: 1,
    saison: 'automne',
    // le ciel gronde tout l'acte : la foudre de Zeus frappe plus lourd, mais les
    // cordes d'arc se détendent et les tours tirent court
    meteo: 'orage',
    murPart: 0.8,
    // Poséidon a bâti les murailles de Troie et n'a jamais été payé : il ne
    // ressoude vos pierres qu'à contrecœur. Zeus, lui, est déjà en grâce -
    // c'est à ce titre qu'Hector s'arrête ici
    relations: { zeus: 16, poseidon: -6, athena: 15, ares: 12 },
  },
  menace: {
    // sept minutes : la muraille de pierre demande 220 s de chantier, la seconde
    // tour toute la pierre qui reste. De quoi choisir son ordre, pas tout faire.
    premierAssautMs: 7 * 60_000,
    // 8 + 19 niveaux de bâtiments × 1,2 + 1 tour × 4 + 8 ≈ 43 : deux fronts dès
    // le premier assaut (nbFronts passe à 2 dès 28), et la barre des trois
    // fronts (55) reste hors d'atteinte jusqu'à l'acte IV - un pan de trop pour
    // deux tours, ce n'est pas l'épreuve de cet acte-ci.
    threat: 43,
    threatMod: 8,
  },
  // Hector vient de lui-même, et pas par faveur du récit : la muraille de
  // niveau 3 et Zeus en grâce sont exactement ce qu'il exige (voir HEROS.hector)
  herosScriptes: ['hector'],
  objectifs: [
    {
      id: 'muraille-de-pierre',
      texte: 'Élevez vos remparts jusqu’à la muraille de pierre',
      pourquoi: 'Un pieu se coupe à la hache ; la pierre crénelée, il faut venir la chercher au bélier.',
      progres: (s) => seuil(s.buildings.remparts.level, 3),
    },
    {
      id: 'seconde-tour',
      // TOURS_MAX[3] = 2 : cette tour-là ne s'assoit que sur la muraille de
      // pierre. L'objectif précédent est donc son chantier préalable.
      texte: 'Flanquez l’enceinte d’une seconde tour d’archers',
      pourquoi: 'Une tour ne couvre que son arc de mur : la seconde n’est pas un luxe, c’est le second front.',
      progres: (s) => seuil(s.tours, 2),
    },
    {
      id: 'trois-assauts',
      texte: 'Repoussez trois assauts',
      pourquoi: 'La plaine change de main deux fois par jour ; votre porte ne doit changer de main aucune.',
      progres: (s) => seuil(s.faits.assautsRepousses, 3),
    },
    {
      id: 'sans-breche',
      texte: 'Tenez deux de ces assauts sans qu’un seul pan ne cède',
      pourquoi:
        'Dès qu’un pan s’ouvre, les archers quittent le rempart pour la cour - et un archer dans la cour ne vaut plus qu’un mauvais lancier.',
      progres: (s) => seuil(s.faits.assautsMurIntact, 2),
    },
    {
      id: 'hector-au-premier-rang',
      texte: 'Gardez Hector à votre table et menez-le au deuxième niveau',
      pourquoi:
        'Un héros n’est pas une statue de plus sur la place : il descend au premier rang, il encaisse - et il mange chaque minute qu’il passe chez vous.',
      progres: (s) =>
        jalons(s.heros.hector.recrute && !s.heros.hector.mort, s.heros.hector.niveau >= 2),
    },
    {
      id: 'sans-une-perte',
      texte: 'Traversez un assaut sans perdre un seul soldat',
      pourquoi: 'Sur un pan qui ne cède pas, un archer ne prend pas un coup : cet assaut-là se gagne au chantier, pas à la lance.',
      facultatif: true,
      progres: (s) => seuil(s.faits.assautsSansPerte, 1),
    },
  ],
  defaite: {
    texte: 'Le village est tombé : trois assauts dans les rues, ou plus un habitant sur les murs.',
    atteinte: (s) =>
      s.pop <= 0 || s.faits.assautsPerdus >= 3 || (s.faits.assautsPerdus >= 2 && s.wallHp <= 0),
  },
  recompense: { res: { pierre: 400, bois: 260, bronze: 170 }, faveur: 26, pop: 2 },
}
