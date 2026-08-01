import { TOURS_MAX } from '../data'
import { auPoste, jalons, seuil, type ActeCampagne } from './types'

/*
 * ACTE V — LE CHEVAL
 *
 * La fin, et il faut qu'elle en soit une. Les quatre premiers actes montaient :
 * un peu plus de menace, un peu plus de mur, un peu plus de monde. Celui-ci ne
 * monte pas — il tient. Le camp achéen a disparu dans la nuit, le cheval est
 * entré dans Ilion, et tout ce que la ville contenait va se déverser sur la
 * route qui passe devant la porte du village.
 *
 * D'où l'unique question de l'acte : la porte de l'est cède-t-elle avant le
 * jour ? Trois choses conspirent contre elle. L'hiver, qui rend la moitié d'un
 * champ et ferme la mer. La brume, qui fait tirer les tours à vingt pas et
 * prévenir les éclaireurs trop tard. Et une menace assez haute pour que chaque
 * vague se scinde en trois fronts — porte, mur du sud, mur du nord — ce qui
 * rend enfin nécessaire la quatrième tour que personne n'avait bâtie.
 *
 * Le joueur ne sauve pas Troie : Troie est déjà perdue au premier paragraphe.
 * Il recueille ce qui en sort. Et ce qu'il gagne, à la fin, n'est pas une
 * victoire — c'est une statue de bois noir tombée du ciel, et la charge de
 * rester debout autour d'elle.
 */
export const ACTE_V: ActeCampagne = {
  id: 'le-cheval',
  numero: 5,
  titre: 'Acte V — Le cheval',
  lieu: 'La Troade en cendres, au cœur de l’hiver',
  emoji: '🐴',
  cadre: 'ruines',
  prologue: [
    'Achille est mort à l’entrée de l’hiver. Une flèche tirée de loin, au ras du sol, dans le talon — la seule part de lui qu’une mère n’avait pas trempée dans le fleuve. On a brûlé le plus grand guerrier du monde sur la grève, et pendant quinze jours plus personne n’a rien tenté.',
    'Puis, un matin de brume, la grève était vide. Feux éteints, palissades du camp abattues, mille nefs disparues. Il ne restait sur le sable qu’une carcasse de bois haute comme trois hommes, en forme de cheval, et une dédicace gravée à Athéna.',
    'Cassandre s’est jetée devant, à Troie, en criant qu’il y avait des hommes dedans. On l’a écartée : c’est son métier de crier, et personne ne l’a jamais crue. Le prêtre Laocoon, lui, a lancé sa pique dans le flanc de la bête — « Je crains les Grecs, même porteurs de présents ! » Le bois a sonné creux. Deux serpents sont sortis de la mer, et on l’a fait taire pour de bon.',
    'Ils ont élargi la porte Scée de leurs propres mains pour faire entrer l’offrande. Toi, tu n’as pas de cheval devant ta porte. Tu as la neige, la brume, la mer fermée jusqu’au printemps, et la route d’Ilion qui descend droit sur ton village.',
    'Ce qui sortira du ventre de la bête cette nuit ouvrira la ville. Ce qui sortira de la ville, ensuite, viendra ici : les Troyens d’abord, en fuite, puis ceux qui les poursuivent. Ta porte est la dernière porte debout de la Troade. Elle ne doit pas céder avant le jour.',
  ],
  epilogue: [
    'Ilion a brûlé six jours. On voyait la lueur depuis le chemin de ronde, et la neige tombait dedans sans l’éteindre. Au matin du septième, la porte de l’est tenait encore : ébréchée, étayée, noire de suie — fermée.',
    'Énée est parti vers l’ouest à la fonte des neiges, son père sur le dos et ses dieux dans un panier, avec ceux qui voulaient une côte neuve. Il n’a pas remercié. Il a laissé quelque chose sur l’autel de l’agora, roulé dans une toile de voile.',
    'C’est une figure de bois noir, laide, haute comme un avant-bras, les yeux grands ouverts. Elle n’est pas de main d’homme : elle est tombée du ciel, et Athéna la reconnaît. On dit qu’il y en avait deux à Ilion — celle qu’on montrait et celle qu’on cachait ; Ulysse est entré une nuit et en a emporté une. Tu sais ce qu’il en est advenu.',
    'Tant qu’elle se tient dans la cité, la cité ne peut pas tomber. Ce n’est pas une promesse : Troie en avait une, et Troie fume encore. C’est une charge. Il faut seulement que quelqu’un reste debout autour d’elle — et cette nuit-là, c’était toi.',
  ],
  echec: [
    'La porte a cédé à l’heure où l’on ne veille plus. Ils sont passés par-dessus les fuyards sans même s’arrêter au grenier : ce n’était pas une razzia, c’était la fin d’un pays.',
    'De la Troade il ne reste plus un nom à prononcer. Aucun autel n’a reçu la statue, et personne ne racontera ce qui s’est passé ici. On reprend au premier matin, quand les voiles n’étaient encore que trois.',
  ],
  depart: {
    /*
     * Dix ans de guerre ont fait du grenier un bourg : agora de marbre, hautes
     * murailles, trois tours. Les réserves sont grasses en bois, en pierre et en
     * bronze — c'est l'hiver qui décide, et l'hiver se paie en grain.
     */
    resources: { bois: 1200, pierre: 1100, grain: 1000, bronze: 620 },
    pop: 30,
    // rien ne dépasse l'agora : elle est au dernier niveau, tout le reste peut suivre.
    // Le temple à 3 explique à lui seul la présence de Cassandre — c'est son exigence.
    batiments: {
      agora: 4,
      maisons: 3,
      ferme: 3,
      scierie: 3,
      carriere: 3,
      remparts: 4,
      caserne: 3,
      temple: 3,
      forge: 3,
      port: 2,
    },
    army: { lancier: 9, archer: 7, hoplite: 4 },
    // on ne se réjouit pas d'avoir survécu à Achille : on attend la suite
    morale: 50,
    faveur: 76,
    tours: 3,
    saison: 'hiver',
    meteo: 'brume',
    // le vantail de droite ne ferme plus tout à fait : la porte est le pan blessé
    murPart: 0.84,
    // Athéna a quitté Ilion — elle regarde ailleurs, pas encore ici.
    // Poséidon, qui bâtit les murs de Troie, n'a rien pardonné à la Troade.
    relations: { zeus: 26, poseidon: -22, athena: 30, ares: 30 },
  },
  menace: {
    /*
     * Quatre minutes : le temps d'ouvrir les greniers et de pourvoir les postes,
     * pas de flâner. Le moteur garde ensuite son intervalle de huit à seize
     * minutes — ce n'est donc pas la cadence qui serre la gorge, c'est la
     * composition : à 74 de menace la colonne se scinde en trois fronts, et la
     * brume rend chaque tour à moitié aveugle.
     */
    premierAssautMs: 4 * 60_000,
    threat: 74,
    threatMod: 30,
  },
  // le récit les met à votre porte sans rançon : le pieux qui sauve les siens,
  // la prophétesse que personne n'écoute. Ils viennent d'Ilion, ils n'ont plus rien.
  herosScriptes: ['enee', 'cassandre'],
  objectifs: [
    {
      id: 'la-nuit-la-plus-longue',
      texte: 'Traversez la nuit : repoussez cinq assauts',
      pourquoi: 'Ils ne pillent plus, ils nettoient la plaine — et une nuit d’hiver ne finit pas vite.',
      progres: (s) => seuil(s.faits.assautsRepousses, 5),
    },
    {
      id: 'la-porte-tient',
      texte: 'Tenez trois de ces assauts sans qu’un seul pan de mur ne cède',
      pourquoi:
        'On relève la muraille avant l’assaut, jamais pendant : une brèche à la porte de l’est, et ce n’est plus un siège, c’est un sac.',
      progres: (s) => seuil(s.faits.assautsMurIntact, 3),
    },
    {
      id: 'tour-du-nord',
      texte: 'Dressez la quatrième tour, celle qui couvre le mur du nord',
      pourquoi: 'La colonne se scinde en trois cette nuit, et un pan sans tour est un pan qu’on escalade tranquillement.',
      // TOURS_MAX[4] = 4 : les hautes murailles portent exactement quatre tours,
      // et la quatrième est justement celle du nord (TOUR_ANGLES)
      progres: (s) => seuil(s.tours, TOURS_MAX[4]),
    },
    {
      id: 'les-fuyards',
      texte: 'Ouvrez un quartier neuf et abritez quarante habitants',
      pourquoi: 'Énée arrive avec ce qui reste d’une ville, et Zeus retient surtout le nom de ceux qui referment leur porte.',
      // maisons 4 : POP_CAP passe de 34 à 52 — sans ce quartier, quarante ne tiennent pas
      progres: (s) => jalons(s.buildings.maisons.level >= 4, s.pop >= 40),
    },
    {
      id: 'le-grain-d-hiver',
      texte: 'Portez la ferme au niveau 4 et tenez ses quatre postes',
      pourquoi: 'L’hiver ne rend que la moitié d’un champ ; un champ sans paysan ne rend rien du tout, et le reste s’achète au comptoir.',
      progres: (s) => jalons(s.buildings.ferme.level >= 4, auPoste(s, 'ferme') >= 4),
    },
    {
      id: 'sans-un-mort',
      texte: 'Repoussez un assaut sans perdre un seul soldat',
      pourquoi: 'L’égide d’Athéna coûte moins cher qu’un enterrement.',
      facultatif: true,
      progres: (s) => seuil(s.faits.assautsSansPerte, 1),
    },
  ],
  /*
   * L'acte I pardonnait deux assauts perdus, à condition que la palissade soit
   * encore à terre : on y apprenait la peur. Ici, plus rien ne s'apprend. Deux
   * portes forcées dans la même nuit, ou douze habitants couchés dans la neige,
   * et il n'y a plus de village pour recevoir la statue.
   */
  defaite: {
    texte: 'La porte de l’est a cédé : le village a brûlé la même nuit qu’Ilion.',
    atteinte: (s) => s.pop <= 0 || s.faits.assautsPerdus >= 2 || s.faits.pertesCiviles >= 12,
  },
  // la campagne s'arrête là : ce qu'on donne sert au bac à sable qui suit,
  // c'est-à-dire à rebâtir en paix ce qui a tenu par miracle
  recompense: { res: { bois: 600, pierre: 600, grain: 600, bronze: 400 }, faveur: 40, pop: 4 },
}
