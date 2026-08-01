import { armee, ferveurMax, jalons, seuil, type ActeCampagne } from './types'

/*
 * ACTE II — LA COLÈRE
 *
 * L'acte I apprenait la peur. Celui-ci apprend le PRIX. Le siège s'installe pour
 * dix ans : la guerre cesse d'être un orage de passage et devient une économie,
 * où tout se paie — y compris la protection des dieux.
 *
 * Deux systèmes entrent en scène, et ils se disputent le même grenier :
 *
 *  · LE TEMPLE. Un sacrifice coûte cinquante mesures de grain et rend huit points
 *    de ferveur. Se faire chérir d'un Olympien, c'est donc puiser quatre fois dans
 *    un grenier que la canicule ne remplit plus — et découvrir au passage qu'un
 *    dieu chéri frappe un quart plus fort qu'un dieu indifférent (`multRelation`).
 *    C'est le meilleur endroit du jeu pour comprendre le mot « faveur » : elle se
 *    retranche quelque part. Et un temple sans prêtre à son poste ne rend rien du
 *    tout, ce que le joueur ne peut apprendre qu'en le vérifiant.
 *
 *  · LE MUR QUI ACHÈTE DU TEMPS. Tant qu'un pan tient, les lanciers patientent au
 *    ralliement sans porter un coup : seuls les archers postés tirent. Un assaut se
 *    gagne donc au moment où l'on décide combien d'hommes montent sur la pierre,
 *    pas dans la mêlée. D'où la vraie question de l'acte : quatre lanciers ont
 *    suffi au printemps, combien d'archers faut-il cet été ?
 *
 * Aucun héros. Le seul grand nom de la saison est assis sous sa tente à vingt
 * stades d'ici, et il ne se lèvera pas pour un village de fermiers.
 */
export const ACTE_II: ActeCampagne = {
  id: 'la-colere',
  numero: 2,
  titre: 'Acte II — La colère',
  lieu: 'La plaine du Scamandre, en été',
  emoji: '🔥',
  cadre: 'plaine',
  prologue: [
    'Rien n’a bougé depuis les semailles. Le camp n’a pas marché sur Troie, Troie n’est pas sortie de ses murs : mille nefs tirées sur le sable, des tentes jusqu’au fleuve, et une odeur de bûcher qui monte quand le vent tourne. Chez eux, dit-on, on brûle les morts par fournées depuis qu’un prêtre d’Apollon est reparti les mains vides.',
    'Là-dedans, deux rois se sont querellés pour une captive. Agamemnon a pris la fille qu’Achille avait reçue en part ; Achille a planté sa lance devant sa tente et ne s’en éloigne plus. Une armée qui ne se bat pas ne mange pas moins : elle mange davantage, et elle s’ennuie.',
    'Alors les fourrageurs remontent la plaine, plus loin chaque semaine, parce que la grève est tondue et que cette guerre est partie pour dix ans. Ils arrivent maintenant avec des chariots et du bronze, et ils achètent. À qui refuse de vendre, ils reviennent la nuit sans les chariots.',
    'Le ciel ne t’aidera pas. Le Scamandre s’est retiré entre ses galets, l’orge grille debout, et chaque boisseau qu’on brûle sur un autel est un boisseau qu’on ne mangera pas. Il faudra le brûler quand même : élève un temple, mets-y ton prêtre, apprends les noms — et vois ce qu’un dieu content rend en échange de ce qui te manque.',
    'Quatre lanciers ont suffi au printemps. Ce qui remonte de la grève cet été arrive en rang, et tes pieux ont déjà été forcés une fois. Il te faut de la pierre, et des hommes qui tirent de haut.',
  ],
  epilogue: [
    'L’été s’achève. Le grenier est bas, l’autel a pris l’habitude de fumer droit, et le muret de pierre porte la marque des deux colonnes qu’il a renvoyées.',
    'Au camp, rien n’est résolu. On a envoyé trois hommes sous la tente d’Achille, avec des promesses, des trépieds et des chevaux ; ils sont revenus avec les trépieds. Personne ne remettra les nefs à l’eau cette année.',
    'Les fourrageurs, eux, ont changé de manière : ils s’arrêtent devant la porte, posent le bronze et attendent qu’on leur pèse le grain. Ce n’est pas de l’amitié, c’est un calcul — et un calcul se refait.',
    'Les premières pluies sont pour bientôt. De l’autre côté de la plaine, on dit qu’Hector fait compter les chars.',
  ],
  echec: [
    'Ils sont entrés deux fois. La seconde, il n’y avait presque plus rien à charger : le grain était mangé, les jarres à sec, et l’on ne défend pas une place vide. Tes gens sont partis vers le camp par petits groupes, la nuit — là-bas au moins on mange, même mal, même en creusant les tombes des autres.',
    'Les dieux n’ont rien répondu, faute d’avoir eu quoi que ce soit à brûler. Un village qui n’a plus rien à offrir n’a plus rien à demander.',
  ],
  /*
   * On hérite d'un printemps de travail : l'agora est montée d'un cran, et comme
   * elle plafonne tout le reste, c'est elle qui fixe la borne de l'acte — rien ne
   * dépassera le niveau 2, temple compris. La palissade est celle de l'acte I, un
   * pan forcé et rafistolé (0,7 × WALL_HP[1] = 175 points de structure).
   *
   * Les réserves sont taillées pour ne PAS tout permettre. Le chantier complet de
   * l'acte coûte 625 bois et 560 pierres (temple 1+2, muret, caserne 2, cinq
   * archers) : il en manque environ deux cents de chaque, soit une vingtaine de
   * minutes de scierie et de carrière. L'été double la mise sur la pierre (×1,2)
   * et ampute l'orge (×0,8) — c'est la saison où l'on bâtit et où l'on jeûne.
   */
  depart: {
    resources: { bois: 420, pierre: 360, grain: 340, bronze: 60 },
    pop: 13,
    batiments: { agora: 2, maisons: 2, ferme: 2, scierie: 1, carriere: 1, remparts: 1, caserne: 1 },
    // quatre lanciers de milice : une caserne de terre battue ne sait rien instruire
    // d'autre (UNITS.archer.caserne = 2)
    army: { lancier: 4, archer: 0, hoplite: 0 },
    // 50 + agora × 2 : exactement ce que `calcMorale` rendra au premier tick
    morale: 54,
    // trente points : de quoi payer un Rempart du Trident (40) vers la dixième
    // minute, au temple neuf — pas deux
    faveur: 30,
    // TOURS_MAX[1] = 0 : on ne pose pas de tour sur des pieux
    tours: 0,
    saison: 'ete',
    meteo: 'canicule',
    murPart: 0.7,
    // Poséidon a bâti les murailles de Troie et n'a jamais été payé : il ne
    // ressoudera vos pierres qu'à contrecœur. Zeus, lui, écoute déjà un peu.
    relations: { zeus: 10, poseidon: -8, athena: 2, ares: 6 },
  },
  menace: {
    // dix minutes : de quoi lancer d'un coup le muret, la caserne et l'autel (300
    // bois, 360 pierres, les trois chantiers tournent en parallèle), puis instruire
    // trois archers. Les cinq demandés ne seront prêts qu'au second assaut.
    premierAssautMs: 10 * 60_000,
    /*
     * 8 + 10 niveaux de bâtiments × 1,2 = 20, et `threatMod` reste à zéro : la
     * menace de cet acte ne vient pas d'un ajout permanent, elle vient du village
     * lui-même. Chaque cran bâti la fait monter d'un peu plus d'un point, si bien
     * qu'elle atteint 25 au premier assaut (~9 unités, dont des guerriers achéens
     * dès 20) et frôle les 30 au troisième — le seuil où `nbFronts` ouvre un second
     * pan. Deux fronts à la fois, c'est la leçon de l'acte III : ici, on ne fait que
     * l'apercevoir.
     */
    threat: 20,
    threatMod: 0,
  },
  herosScriptes: [],
  objectifs: [
    {
      id: 'temple',
      texte: 'Élevez un sanctuaire de pierre et mettez-y votre prêtre',
      pourquoi:
        'Un autel désert ne rend pas une étincelle de faveur, et un paysan qu’on y poste n’en tire que la moitié.',
      // POSTES.temple[2] = 1 : un seul poste, donc c'est LE prêtre du village qu'il
      // faut y mettre. Il existe toujours — METIERS_DEPART place un temple en
      // cinquième position, et la population part de 13.
      progres: (s) =>
        jalons(
          s.buildings.temple.level >= 2,
          s.villageois.some((v) => v.poste === 'temple' && v.metier === 'temple'),
        ),
    },
    {
      id: 'ferveur',
      texte: 'Faites-vous chérir d’un Olympien : quarante points de ferveur',
      pourquoi:
        'Un sacrifice coûte cinquante mesures de grain que la canicule ne rendra pas : voilà le prix réel d’un dieu qui frappe fort.',
      // Zeus part de 10 et un sacrifice rend 8 : quatre offrandes, 200 mesures, et
      // le palier « Chéri » (40) porte ses bénédictions à 124 % de leur puissance.
      progres: (s) => seuil(Math.round(ferveurMax(s)), 40),
    },
    {
      id: 'benedictions',
      texte: 'Invoquez trois fois le bras d’un dieu',
      pourquoi: 'La faveur qui dort au temple ne sauve personne : elle ne vaut qu’à la minute où l’on ose la dépenser.',
      /*
       * Trois bras accessibles au temple 2 : l'Égide d'Athéna (35, en bataille), le
       * Rempart du Trident (40, à tout moment), la Foudre de Zeus (50, en bataille).
       * Le moins cher des trois passages coûte 110 de faveur ; l'acte en produit
       * environ 130 — 30 au départ, 2,2 par minute au sanctuaire pourvu, 5 par
       * offrande, 8 par assaut renvoyé. Le cooldown de 240 s interdit seulement
       * d'appeler deux fois le même dieu dans la même bataille.
       */
      progres: (s) => seuil(s.faits.benedictions, 3),
    },
    {
      id: 'garnison',
      texte: 'Portez la garnison à neuf hommes, dont cinq archers',
      pourquoi:
        'Un archer tire du haut du mur sans qu’on l’atteigne ; un lancier, lui, attend que la pierre cède pour servir à quelque chose.',
      // La caserne de niveau 2 (160 bois, 130 pierres) est ce qui débloque l'arc.
      // Cinq archers coûtent 225 bois et 40 bronze sur les 60 en caisse, et cinq
      // paires de bras oisives sur les treize habitants — POP_CAP[2] = 22 laisse
      // largement le village se repeupler derrière eux.
      progres: (s) => jalons(armee(s) >= 9, s.army.archer >= 5),
    },
    {
      id: 'muret',
      texte: 'Doublez la palissade d’un muret de pierre, et repoussez deux colonnes',
      pourquoi:
        'Des pieux arrêtaient trois pillards ; le muret, lui, tient assez longtemps pour que vos archers vident la plaine.',
      // 80 bois et 150 pierres, et l'achèvement du chantier remet la structure au
      // maximum : les 175 points hérités du printemps redeviennent WALL_HP[2] = 600.
      progres: (s) => jalons(s.buildings.remparts.level >= 2, s.faits.assautsRepousses >= 2),
    },
    {
      id: 'pan-intact',
      texte: 'Traversez un assaut sans qu’un seul pan cède',
      pourquoi:
        'Le Trident ressoude la pierre en pleine bataille : c’est là que la faveur achetée en grain se change en muraille.',
      /*
       * Facultatif, et c'est voulu : la chose se joue à la vingtaine de secondes.
       * Six cents points de structure tiennent une vingtaine de secondes sous neuf
       * assaillants, le temps pour cinq archers d'abattre un peu moins que la
       * colonne entière. Le Rempart du Trident rend 42 % de la structure et fait
       * basculer le compte — mais un tirage de vague trop lourd doit pouvoir rater
       * sans bloquer la campagne.
       */
      facultatif: true,
      progres: (s) => seuil(s.faits.assautsMurIntact, 1),
    },
  ],
  defaite: {
    texte: 'Deux fois pillé et le ventre vide : le village se disperse.',
    // Trois portes, toutes atteignables : la garnison balayée trois fois, ou deux
    // pillages (30 % des réserves à chaque fois) sur un village qui jeûne déjà.
    atteinte: (s) =>
      s.pop <= 0 || s.faits.assautsPerdus >= 3 || (s.faits.assautsPerdus >= 2 && s.resources.grain <= 0),
  },
  recompense: { res: { bois: 260, pierre: 300, grain: 200, bronze: 90 }, faveur: 18, pop: 3 },
}
