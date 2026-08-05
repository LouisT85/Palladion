import { WALL_HP, troupes } from '../data'
import { jalons, seuil, type ActeCampagne } from './types'

/*
 * ACTE IV - LE FLEUVE
 *
 * Le seul acte qui commence par une perte. Le joueur n'hérite pas d'un village à
 * agrandir : il hérite d'un pan de mur couché (murPart 0,42), de trois fronts
 * assaillables et de quatre minutes avant la première colonne. Il n'a rien de
 * neuf à bâtir - il a à REMETTRE DEBOUT ce qu'il avait déjà, sous la pluie,
 * pendant qu'on le frappe. C'est une autre façon de jouer, et elle est plus dure.
 *
 * Deux tensions se croisent, et elles sont tout l'acte :
 *
 *  · ACHILLE, que le récit impose sans le faire payer. Il vaut trois hoplites,
 *    donne +40 % de dégâts à toute l'armée, mange 1,2 de grain la minute et fait
 *    tomber le moral de 8 s'il traverse deux assauts sans qu'on lâche sa fureur.
 *    Un allié qu'on ne commande pas : on le supporte, et il peut mourir.
 *
 *  · LES FUYARDS DES DEUX CAMPS. Des Troyens chassés de la plaine, des esclaves
 *    échappés du camp achéen. On ne peut pas refuser en fermant sa porte : la
 *    porte est cassée. Il faut donc trancher, et chaque réponse coûte quelque
 *    chose - d'où l'objectif sur les dilemmes plutôt que sur un total de vivres.
 *
 * Enfin Poséidon, qu'on a laissé s'offenser depuis trois actes (−20), redevient
 * indispensable : sa bénédiction est la seule chose au monde qui relève un pan
 * effondré AU MILIEU d'un assaut. L'acte oblige à se réconcilier avec lui.
 */
export const ACTE_IV: ActeCampagne = {
  id: 'le-fleuve',
  numero: 4,
  titre: 'Acte IV - Le fleuve',
  lieu: 'Les rives du Scamandre, à la fin de l’automne',
  emoji: '🌊',
  cadre: 'fleuve',
  prologue: [
    'Le pan qui flanque la porte de l’est s’est couché cette nuit, sans bruit, dans la boue. Au matin il y avait un trou de quinze pieds à l’endroit où l’on montait la garde, et deux hommes dessous.',
    'Deux lieues plus loin, la guerre a changé de couleur. Un jeune homme a revêtu les armes d’Achille pour faire reculer les Troyens ; Hector l’a tué en croyant tuer le Pélide, et lui a pris son armure. On l’appelait Patrocle. Achille n’a pas pleuré : il a hurlé toute la nuit, et on l’entendait d’ici.',
    'Depuis, le Scamandre ne coule plus, il pousse. Achille y jette les morts par brassées et le fleuve les recrache dans les roseaux ; l’eau a passé les berges, pris les champs bas et la moitié de la route. Les vieux disent qu’un fleuve s’est levé contre un homme. Les vieux ont peut-être raison.',
    'Cet homme campe chez toi. Personne ne l’a invité : il est arrivé avec ses Myrmidons, a désigné la meilleure grange et s’y est installé. Il mange le grain de six familles et ne remercie pas. Tant qu’il est là, aucune vague ne t’emportera - et le jour où il tombera, il ne restera que ton mur.',
    'Sur la route, deux files attendent : des Troyens qui fuient la plaine, des esclaves achéens qui fuient leur camp. Ta porte est cassée, tu ne peux même pas dire non en la fermant. Relève le mur d’abord. Ensuite, décide qui entre.',
  ],
  epilogue: [
    'Le mur tient. Le pan de l’est a été rebâti avec les pierres de la grange écroulée, et le dernier assaut est venu se casser dessus sans qu’un moellon bouge.',
    'L’eau est redescendue d’un pied. Ce qu’elle laisse sur les berges, on ne le regarde pas de trop près : on l’enterre en haut du champ, sans demander de quel camp.',
    'Une nuit, un chariot est passé sous tes murs sans escorte, à la lueur d’une seule torche : un vieillard, un cocher, des étoffes pliées et des trépieds de bronze. Priam allait racheter le corps de son fils à l’homme qui l’avait tué. On lui a ouvert, et on n’a rien pris - on n’allège pas la rançon d’un père.',
    'Achille a rendu le corps. Les deux camps ont brûlé leurs morts pendant onze jours, et pendant onze jours personne n’est venu frapper chez toi. Cela ne sauve pas Troie. Cela t’a laissé le temps de finir ton mur.',
  ],
  echec: [
    'La brèche est restée ouverte. Ils sont entrés par là trois fois, et la troisième personne n’a couru la boucher : il n’y avait plus assez de bras pour à la fois tenir la porte et porter les blessés.',
    'Achille est reparti vers ses nefs sans se retourner - on ne meurt pas pour un mur qu’on n’a pas bâti. Le fleuve, lui, est resté. Il faudra reprendre au premier matin, du temps où la porte tenait encore.',
  ],
  depart: {
    // trois actes de guerre ont rempli les greniers et vidé les carrières : il y a
    // de quoi relever un mur, pas de quoi bâtir une cité
    resources: { bois: 900, pierre: 820, grain: 520, bronze: 380 },
    pop: 24,
    // dix domaines debout, aucun au-dessus de l'agora - le port est resté un ponton
    batiments: {
      agora: 3,
      maisons: 3,
      ferme: 3,
      scierie: 2,
      carriere: 2,
      remparts: 3,
      caserne: 3,
      temple: 2,
      forge: 2,
      port: 1,
    },
    army: troupes({ lancier: 7, archer: 5, hoplite: 2, frondeur: 0, peltaste: 0, belier: 0, char: 0 }),
    // le premier matin, avant que l'agora et le temple ne remettent le village d'aplomb
    morale: 44,
    faveur: 58,
    // deux tours : le maximum qu'une muraille de niveau 3 puisse asseoir
    tours: 2,
    saison: 'automne',
    meteo: 'pluie',
    // un pan est déjà tombé : l'acte commence dans la brèche
    murPart: 0.42,
    // Poséidon a compté les corps jetés dans son fleuve, et il tient ses comptes
    relations: { zeus: 18, poseidon: -20, athena: 22, ares: 24 },
  },
  menace: {
    // quatre minutes : le temps de comprendre qu'on répare AVANT de recruter
    premierAssautMs: 4 * 60_000,
    // au-delà de 55, une vague se scinde en trois fronts : la brèche n'est plus seule
    threat: 58,
    threatMod: 22,
  },
  // Achille entre sans rançon ni condition : c'est le récit qui l'amène, pas la cité
  herosScriptes: ['achille'],
  objectifs: [
    {
      id: 'enceinte',
      texte: 'Relevez l’enceinte : la muraille de pierre debout, sans un pan à terre',
      pourquoi: 'Une brèche ne se compte pas en pierres manquantes mais en hommes qui passent.',
      // la structure se compare au maximum du NIVEAU tenu (WALL_HP), jamais à
      // elle-même : à 95 % on tolère les éclats, pas un pan couché
      progres: (s) =>
        jalons(
          s.buildings.remparts.level >= 3,
          s.wallHp >= Math.round(WALL_HP[s.buildings.remparts.level] * 0.95),
        ),
    },
    {
      id: 'sans-breche',
      texte: 'Tenez deux assauts sans qu’un seul pan de mur reste à terre',
      pourquoi: 'Un pan qui tombe n’est perdu que si l’on n’appelle personne pour le relever.',
      progres: (s) => seuil(s.faits.assautsMurIntact, 2),
    },
    {
      id: 'quatre-assauts',
      texte: 'Repoussez quatre assauts',
      pourquoi: 'La plaine change de main deux fois par jour, et ce qui reflue reflue par chez vous.',
      progres: (s) => seuil(s.faits.assautsRepousses, 4),
    },
    {
      id: 'fuyards',
      texte: 'Tranchez trois dilemmes : accueillir ou refuser, mais tranchez',
      pourquoi: 'Les deux files sur la route sont l’une troyenne et l’autre achéenne ; aucune réponse n’est propre, et ne rien répondre en est une.',
      progres: (s) => seuil(s.faits.dilemmesTranches, 3),
    },
    {
      id: 'poseidon',
      texte: 'Ramenez Poséidon en grâce, et appelez deux fois les dieux sur vos murs',
      pourquoi: 'Il a bâti les murailles de Troie de ses mains : personne d’autre ne ressoude un pan effondré au milieu d’un assaut.',
      progres: (s) => jalons(s.gods.poseidon.relation >= 25, s.faits.benedictions >= 2),
    },
    {
      id: 'secours',
      texte: 'Portez secours à un village assiégé, une fois, dans le pire mois de la guerre',
      pourquoi: 'Sortir vos hommes quand vous n’en avez pas assez pour vos propres murs : c’est précisément ce que Zeus regarde.',
      facultatif: true,
      progres: (s) => seuil(s.faits.secoursPortes, 1),
    },
  ],
  defaite: {
    texte: 'Le village a rompu : trois assauts perdus dans la brèche - ou deux coup sur coup, et plus personne pour y retourner.',
    // deux défaites rapprochées cumulent leurs « Village pillé » (−14 chacun) :
    // le moral tombe à 30 et la garnison se débande. C'est la seconde façon de perdre.
    atteinte: (s) =>
      s.pop <= 0 || s.faits.assautsPerdus >= 3 || (s.faits.assautsPerdus >= 2 && s.morale <= 30),
  },
  // la rançon de Priam a passé par le village : des étoffes, du bronze, des trépieds
  recompense: { res: { pierre: 420, grain: 380, bronze: 260 }, faveur: 34, pop: 2 },
}
