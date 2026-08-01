import type { BuildingId, Cost, GodId, HeroId, UnitId } from './types'

// l'identifiant vit dans types.ts (comme UnitId ou GodId) pour que le moteur de
// bataille puisse marquer un combattant « héros » sans dépendre de ce module
export type { HeroId }

/*
 * Les héros de la matière troyenne. Ils ne s'achètent pas : ils viennent quand
 * la cité en est digne, exigent des honneurs, gagnent des niveaux, traversent
 * un arc à embranchements — et peuvent mourir. C'est ce qui rend leur présence
 * tendue plutôt que confortable.
 */

/** état d'un héros dans une partie */
export interface HeroState {
  /** false = pas encore recruté (mais peut-être déjà disponible) */
  recrute: boolean
  niveau: number
  /** expérience vers le niveau suivant */
  xp: number
  /** index du nœud courant de son arc narratif (0 = pas commencé) */
  arc: number
  /** choix déjà tranchés dans l'arc, par id de nœud */
  choix: string[]
  /** mort définitivement — il ne revient pas */
  mort: boolean
  /** prochaine utilisation autorisée de sa capacité active */
  cooldownUntil: number
  /** il boude : capacité indisponible tant que ce n'est pas résolu */
  boudeJusqua: number
  /** niveau maximum auquel un choix d'arc l'a condamné (5 = aucun plafond) */
  plafond: number
  /** rappels d'entretien restés sans réponse — au troisième, il s'en va */
  impayes: number
  /** assauts traversés sans qu'on l'ait lâché sur l'ennemi (Achille) */
  inactif: number
}

/** état d'un héros au premier jour : connu de nom, à votre service en rien */
export function etatHeroInitial(): HeroState {
  return {
    recrute: false,
    niveau: 1,
    xp: 0,
    arc: 0,
    choix: [],
    mort: false,
    cooldownUntil: 0,
    boudeJusqua: 0,
    plafond: 5,
    impayes: 0,
    inactif: 0,
  }
}

export interface CapaciteHero {
  nom: string
  emoji: string
  /** ce que fait la capacité, en clair */
  desc: string
  /** coût en faveur */
  cout: number
  cooldown: number
  /** ne peut être invoquée qu'en bataille */
  batailleUniquement: boolean
  /** effet mécanique, résolu par le store */
  effet:
    | { type: 'bouclier-secteur'; duree: number; absorbe: number }
    | { type: 'siege-gratuit' }
    | { type: 'fureur'; duree: number; degats: number }
    | { type: 'boucher-breche'; duree: number }
    | { type: 'recrues'; unite: UnitId; n: number }
    | { type: 'annuler-vague' }
    | { type: 'sauver-troupes'; part: number }
    | { type: 'tuer-chef' }
}

export interface PassifHero {
  desc: string
  /** bonus appliqués en continu (le store les lit) */
  wallHpPct?: number
  degatsMeleePct?: number
  degatsExpeditionPct?: number
  butinPct?: number
  /** points de relation retranchés à CHAQUE Olympien, tant qu'il est là */
  relationTous?: number
  /** révèle la composition ET les fronts de la prochaine vague */
  revelerVague?: boolean
  /** fenêtre d'alerte allongée (ms) */
  alerteBonusMs?: number
  /** révèle l'issue vraie des dilemmes, comme Athéna */
  revelerDilemmes?: boolean
  /** habitants supplémentaires par saison */
  popParSaison?: number
  /** encaisse une part des dégâts destinés aux alliés proches */
  gardeDuCorpsPct?: number
  /** malus de moral s'il reste inactif */
  maloraleSiInactif?: number
}

export interface NoeudArc {
  id: string
  titre: string
  emoji: string
  /** niveau du héros requis pour que le nœud se déclenche */
  niveauRequis: number
  texte: string
  options: {
    label: string
    /** conséquence racontée */
    issue: string
    cout?: Cost
    /** effets mécaniques que le store applique */
    effets: {
      niveau?: number
      morale?: { delta: number; label: string; durMs?: number }
      /** un même choix peut contenter un dieu et froisser un autre */
      relation?: { dieu: GodId; delta: number }[]
      res?: Cost
      faveur?: number
      pop?: number
      /** le héros meurt (fin de son arc) */
      mort?: boolean
      /** il boude n ms : capacité indisponible */
      boude?: number
      /** plafonne sa progression à ce niveau */
      plafond?: number
    }
  }[]
}

export interface HeroDef {
  id: HeroId
  nom: string
  titre: string
  emoji: string
  couleur: string
  /** son histoire en deux phrases */
  desc: string
  /** conditions d'apparition — toutes requises */
  requiert: {
    batiment?: { id: BuildingId; niveau: number }
    armee?: number
    relation?: { dieu: GodId; min: number }
    morale?: number
    assautsRepousses?: number
    etoiles?: number
  }
  /** ce qu'il coûte pour entrer à votre service */
  coutRecrutement: Cost
  /** entretien par minute — un héros ne vit pas d'amour */
  entretien: { grain?: number; faveur?: number }
  /** xp nécessaire pour passer au niveau suivant (index = niveau courant − 1) */
  xpParNiveau: number[]
  passif: PassifHero
  capacite: CapaciteHero
  arc: NoeudArc[]
}

const MIN = 60_000

export const HEROS: Record<HeroId, HeroDef> = {
  hector: {
    id: 'hector',
    nom: 'Hector',
    titre: 'Rempart des Troyens, dompteur de chevaux',
    emoji: '🛡️',
    couleur: '#6f9ac4',
    desc:
      'Fils de Priam, le meilleur des Troyens. Il ne se bat pas pour la gloire mais pour les murs derrière lesquels dorment les siens.',
    requiert: { batiment: { id: 'remparts', niveau: 3 }, relation: { dieu: 'zeus', min: 15 } },
    coutRecrutement: { bronze: 90, grain: 150 },
    entretien: { grain: 0.6 },
    xpParNiveau: [100, 240, 460, 800],
    passif: {
      desc: '+15 % de structure aux remparts ; vos défenseurs ne rompent jamais les rangs.',
      wallHpPct: 0.15,
    },
    capacite: {
      nom: 'Rempart de Troie',
      emoji: '🛡️',
      desc: 'Hector se plante devant le pan le plus menacé : il absorbe 70 % des dégâts de siège pendant 20 s.',
      cout: 30,
      cooldown: 150_000,
      batailleUniquement: true,
      effet: { type: 'bouclier-secteur', duree: 20_000, absorbe: 0.7 },
    },
    arc: [
      {
        id: 'hector-adieu',
        titre: 'Les adieux d’Andromaque',
        emoji: '👶',
        niveauRequis: 2,
        texte:
          'Andromaque le retient sur le seuil, l’enfant dans les bras : « Reste sur les murs. Si tu sors, tu feras de moi une veuve et de lui un orphelin. » Hector attend votre parole.',
        options: [
          {
            label: 'Qu’il tienne les murs',
            issue:
              'Hector reste. Le village respire, mais l’ennemi apprend qu’aucun Troyen ne sort plus : il s’enhardit.',
            effets: { morale: { delta: 8, label: 'Hector veille', durMs: 12 * MIN }, niveau: 1 },
          },
          {
            label: 'Qu’il sorte affronter l’ennemi',
            issue:
              'Il sort et disperse les pillards. Sa légende grandit — et Andromaque ne vous adresse plus la parole.',
            effets: { niveau: 1, morale: { delta: -5, label: 'Andromaque en deuil d’avance', durMs: 10 * MIN }, relation: [{ dieu: 'ares', delta: 8 }] },
          },
        ],
      },
      {
        id: 'hector-duel',
        titre: 'Le défi lancé aux murs',
        emoji: '⚔️',
        niveauRequis: 3,
        texte:
          'Un champion achéen s’avance seul et appelle Hector par son nom, trois fois. Toute la Troade écoute. Refuser, c’est avouer la peur ; accepter, c’est risquer le meilleur de vos hommes sur un coup de dé.',
        options: [
          {
            label: 'Accepter le duel',
            issue:
              'Hector triomphe de justesse, l’épaule ouverte. On chante son nom du mont Ida à la mer — il en tire une force nouvelle.',
            effets: { niveau: 2, morale: { delta: 12, label: 'Le duel d’Hector', durMs: 15 * MIN }, relation: [{ dieu: 'ares', delta: 12 }] },
          },
          {
            label: 'Refuser et tenir les murs',
            issue:
              'Le champion crache au pied de la porte et s’en va. Vos hommes ont vu Hector baisser les yeux : quelque chose s’est brisé.',
            effets: { morale: { delta: -10, label: 'Le défi non relevé', durMs: 12 * MIN }, relation: [{ dieu: 'ares', delta: -10 }], boude: 4 * MIN },
          },
          {
            label: 'Le remplacer par un volontaire',
            issue:
              'Un jeune lancier se présente et meurt bravement. Hector n’a rien dit, mais il ne vous regarde plus pareil.',
            cout: { bronze: 40 },
            effets: { morale: { delta: 3, label: 'Le sacrifice du volontaire', durMs: 8 * MIN }, boude: 2 * MIN },
          },
        ],
      },
      {
        id: 'hector-achille',
        titre: 'La poursuite autour des murs',
        emoji: '💀',
        niveauRequis: 4,
        texte:
          'Achille est là, dehors, et il ne repartira pas sans le sang d’Hector. Les portes sont closes. Hector, casque sous le bras, demande simplement : « Dois-je sortir ? »',
        options: [
          {
            label: 'Le laisser affronter son destin',
            issue:
              'Hector tombe, traîné dans la poussière. Le village pleure son rempart — mais son nom devient un cri de ralliement que rien n’éteindra.',
            effets: { mort: true, morale: { delta: -18, label: 'Hector est mort', durMs: 20 * MIN }, relation: [{ dieu: 'zeus', delta: 15 }], faveur: 30 },
          },
          {
            label: 'Lui ordonner de rester',
            issue:
              'Il obéit, et vit. Mais un Hector qui n’a pas répondu à l’appel n’est plus tout à fait Hector : il ne progressera plus.',
            effets: { plafond: 4, morale: { delta: -6, label: 'L’honneur ravalé', durMs: 15 * MIN } },
          },
          {
            label: 'Sortir avec toute la garnison',
            issue:
              'La sortie en masse surprend Achille, qui recule. Hector est sauf, vos pertes sont lourdes, et les dieux jugent la manœuvre plus rusée que noble.',
            cout: { bronze: 80, grain: 120 },
            effets: { niveau: 1, morale: { delta: 5, label: 'La grande sortie', durMs: 10 * MIN }, relation: [{ dieu: 'athena', delta: 10 }] },
          },
        ],
      },
    ],
  },

  ulysse: {
    id: 'ulysse',
    nom: 'Ulysse',
    titre: 'L’homme aux mille ruses, roi d’Ithaque',
    emoji: '🐎',
    couleur: '#9fb4c7',
    desc:
      'Il préfère une bonne idée à dix bataillons. Athéna l’aime pour cela, et ses ennemis ne s’en aperçoivent que trop tard.',
    requiert: { batiment: { id: 'port', niveau: 2 }, relation: { dieu: 'athena', min: 40 } },
    coutRecrutement: { bronze: 120, bois: 200 },
    entretien: { faveur: 0.25 },
    xpParNiveau: [90, 210, 400, 700],
    passif: {
      desc: 'Vos éclaireurs révèlent la composition ET les fronts visés de la prochaine vague, 2 min plus tôt.',
      revelerVague: true,
      alerteBonusMs: 2 * MIN,
    },
    capacite: {
      nom: 'Ruse du cheval',
      emoji: '🐎',
      desc: 'Votre prochaine expédition entre sans donner un coup de bélier : aucun dégât de siège à porter.',
      cout: 40,
      cooldown: 300_000,
      batailleUniquement: false,
      effet: { type: 'siege-gratuit' },
    },
    arc: [
      {
        id: 'ulysse-serment',
        titre: 'Le serment des prétendants',
        emoji: '📜',
        niveauRequis: 2,
        texte:
          'Une nef d’Ithaque mouille au port : Pénélope est assiégée de prétendants, son fils menacé. Ulysse vous demande un congé — et trois navires.',
        options: [
          {
            label: 'Le laisser partir avec des navires',
            issue:
              'Il revient trois saisons plus tard, l’arc à la main et le regard plus dur. Ce qu’il a vu chez lui l’a aiguisé.',
            cout: { bois: 250, bronze: 60 },
            effets: { niveau: 2, relation: [{ dieu: 'athena', delta: 12 }] },
          },
          {
            label: 'Refuser : on a besoin de lui ici',
            issue:
              'Il reste, loyal en apparence. Mais un homme qui pense à Ithaque ne pense pas à vos murs : ses conseils se font distraits.',
            effets: { boude: 6 * MIN, relation: [{ dieu: 'athena', delta: -8 }] },
          },
        ],
      },
      {
        id: 'ulysse-cheval',
        titre: 'L’idée du cheval',
        emoji: '🎠',
        niveauRequis: 3,
        texte:
          'Ulysse déroule un plan sur le sable : une offrande de bois creuse, assez grande pour vingt hommes. « Ils l’ouvriront eux-mêmes. Aucun mur ne résiste à la curiosité. » Athéna, dit-il, approuve.',
        options: [
          {
            label: 'Bâtir le cheval',
            issue:
              'Le stratagème entre dans la légende avant même d’avoir servi. Vos charpentiers y laissent leur bois, Athéna y gagne un fidèle.',
            cout: { bois: 400, bronze: 80 },
            effets: { niveau: 2, relation: [{ dieu: 'athena', delta: 20 }] },
          },
          {
            label: 'Trop retors — refuser',
            issue:
              'Vous préférez l’honneur des armes. Arès vous en sait gré ; Ulysse remballe son plan sans un mot et vous en garde rancune.',
            effets: { relation: [{ dieu: 'ares', delta: 12 }], boude: 5 * MIN, plafond: 3 },
          },
        ],
      },
    ],
  },

  achille: {
    id: 'achille',
    nom: 'Achille',
    titre: 'Le Pélide aux pieds rapides',
    emoji: '⚔️',
    couleur: '#c0563f',
    desc:
      'La plus grande lance du monde connu, dans le corps du plus susceptible des hommes. On ne commande pas Achille : on le supporte.',
    requiert: { armee: 10, relation: { dieu: 'ares', min: 25 }, assautsRepousses: 3 },
    coutRecrutement: { bronze: 180, grain: 200 },
    entretien: { grain: 1.2 },
    xpParNiveau: [80, 200, 380, 640],
    passif: {
      desc: '+40 % aux dégâts de toute votre armée. Mais s’il traverse deux assauts sans qu’on lâche sa fureur, le moral tombe de 8.',
      degatsMeleePct: 0.4,
      maloraleSiInactif: 8,
    },
    capacite: {
      nom: 'Fureur du Pélide',
      emoji: '🔥',
      desc: 'Achille fauche tout sur son passage et devient invulnérable 8 s — puis s’effondre, épuisé.',
      cout: 45,
      cooldown: 200_000,
      batailleUniquement: true,
      effet: { type: 'fureur', duree: 8000, degats: 180 },
    },
    arc: [
      {
        id: 'achille-querelle',
        titre: 'La querelle du butin',
        emoji: '😤',
        niveauRequis: 2,
        texte:
          'Achille exige la plus belle part du dernier pillage — celle que vous aviez promise à la garnison. Il est sous sa tente, sa lance plantée dans le sable, et il attend.',
        options: [
          {
            label: 'Céder : la part est à lui',
            issue:
              'Il sort en riant et la garnison serre les dents. Le moral vacille, mais Achille est de nouveau à vous.',
            cout: { bronze: 100 },
            effets: { morale: { delta: -8, label: 'Le butin détourné', durMs: 12 * MIN }, niveau: 1 },
          },
          {
            label: 'Tenir : la parole donnée d’abord',
            issue:
              'Achille se retire sous sa tente et n’en bougera pas de longtemps. Vos hommes, eux, vous savent juste.',
            effets: { morale: { delta: 10, label: 'La parole tenue', durMs: 14 * MIN }, boude: 8 * MIN, relation: [{ dieu: 'ares', delta: 10 }] },
          },
          {
            label: 'Partager en deux parts égales',
            issue:
              'Personne n’est content, tout le monde est servi. Achille grommelle mais reprend son poste.',
            cout: { bronze: 50 },
            effets: { morale: { delta: 2, label: 'Le compromis du butin', durMs: 8 * MIN }, boude: 2 * MIN },
          },
        ],
      },
      {
        id: 'achille-patrocle',
        titre: 'La mort de Patrocle',
        emoji: '🕯️',
        niveauRequis: 3,
        texte:
          'Patrocle a pris ses armes et est tombé sous les murs ennemis. Achille hurle depuis trois heures. Il veut sortir, seul, maintenant.',
        options: [
          {
            label: 'Le lâcher sur l’ennemi',
            issue:
              'Ce qui suit ne s’appelle plus une bataille. Achille revient couvert de sang qui n’est pas le sien, transfiguré — sa fureur est désormais sans retour.',
            effets: { niveau: 2, morale: { delta: -4, label: 'L’horreur du carnage', durMs: 8 * MIN }, relation: [{ dieu: 'ares', delta: 22 }] },
          },
          {
            label: 'Le retenir de force',
            issue:
              'Il faut six hommes pour le maîtriser. Il vit, il obéit, mais quelque chose en lui s’est éteint : il ne montera plus qu’un rang, et ce sera le dernier.',
            /*
             * Plafond 4 et non 3 : à 3, Achille n'atteignait jamais le niveau que
             * réclame « La flèche de Pâris », et son arc s'arrêtait en silence sur
             * cette branche — le joueur ne voyait jamais la fin de son histoire.
             */
            effets: { plafond: 4, morale: { delta: 4, label: 'La fureur contenue', durMs: 10 * MIN } },
          },
        ],
      },
      {
        id: 'achille-talon',
        titre: 'La flèche de Pâris',
        emoji: '🏹',
        niveauRequis: 4,
        texte:
          'Un archer troyen a visé bas, et touché. Achille tient debout par orgueil seulement. Le guérisseur dit qu’un homme qui se bat encore ne se relèvera pas.',
        options: [
          {
            label: 'Le laisser mourir les armes à la main',
            issue:
              'Il tombe au troisième assaut, entouré d’ennemis morts. Les aèdes chanteront ce jour pendant mille ans — et vous n’aurez plus jamais d’Achille.',
            effets: { mort: true, morale: { delta: -14, label: 'Achille est tombé', durMs: 18 * MIN }, faveur: 40, relation: [{ dieu: 'ares', delta: 25 }] },
          },
          {
            label: 'L’écarter du combat pour de bon',
            issue:
              'Il survit, boiteux, à regarder les autres se battre. Sa fureur est perdue, mais sa présence rassure encore.',
            effets: { plafond: 4, boude: 999 * MIN, morale: { delta: 3, label: 'Le Pélide en retraite', durMs: 12 * MIN } },
          },
        ],
      },
    ],
  },

  ajax: {
    id: 'ajax',
    nom: 'Ajax',
    titre: 'Le rempart des Achéens, fils de Télamon',
    emoji: '🪨',
    couleur: '#8a8a6f',
    desc:
      'Une tour d’homme derrière un bouclier de sept peaux de bœuf. Il ne recule pas, jamais, et c’est à la fois sa force et sa perte.',
    requiert: { morale: 65, batiment: { id: 'caserne', niveau: 3 } },
    coutRecrutement: { bronze: 110, pierre: 200 },
    entretien: { grain: 0.8 },
    xpParNiveau: [110, 250, 470, 820],
    passif: {
      desc: 'Ajax se met en travers : vos combattants encaissent 25 % de dégâts en moins tant qu’il tient le rang.',
      // la valeur ANNONCÉE, pas le double : le store la retranchait de moitié à
      // l'usage, ce qui rendait la fiche vraie par accident et la relecture fausse
      gardeDuCorpsPct: 0.25,
    },
    capacite: {
      nom: 'Mur de boucliers',
      emoji: '🪨',
      desc: 'Ajax comble une brèche de son seul corps : le secteur est infranchissable 25 s.',
      cout: 35,
      cooldown: 180_000,
      batailleUniquement: true,
      effet: { type: 'boucher-breche', duree: 25_000 },
    },
    arc: [
      {
        id: 'ajax-armes',
        titre: 'Les armes du mort',
        emoji: '🛡️',
        niveauRequis: 2,
        texte:
          'On doit attribuer la panoplie du plus grand guerrier tombé. Ajax l’a méritée par le bras ; un autre la réclame par la parole. Vous arbitrez.',
        options: [
          {
            label: 'Les donner à Ajax',
            issue: 'Il pleure sans le cacher et jure de tenir seul n’importe quelle brèche. Il tient parole.',
            effets: { niveau: 2, morale: { delta: 6, label: 'La justice d’Ajax', durMs: 12 * MIN } },
          },
          {
            label: 'Les donner au beau parleur',
            issue:
              'Ajax ne dit rien. Il s’assied face à la mer et n’en revient qu’au bout d’une saison, plus sombre.',
            effets: { boude: 7 * MIN, morale: { delta: -6, label: 'L’injustice faite à Ajax', durMs: 12 * MIN }, faveur: 20 },
          },
        ],
      },
      {
        id: 'ajax-folie',
        titre: 'La nuit des troupeaux',
        emoji: '🐂',
        niveauRequis: 3,
        texte:
          'Au matin, on trouve le troupeau égorgé et Ajax endormi au milieu, l’épée à la main. Il ne se souvient de rien. Athéna, dit le prêtre, lui a troublé l’esprit.',
        options: [
          {
            label: 'Étouffer l’affaire',
            issue:
              'On enterre les bêtes en silence. Ajax reprend son poste sans comprendre pourquoi on le regarde ainsi.',
            cout: { grain: 150 },
            effets: { morale: { delta: -4, label: 'Le secret du troupeau', durMs: 10 * MIN }, niveau: 1 },
          },
          {
            label: 'Le confier au temple',
            issue:
              'Les prêtres l’apaisent en trois jours de rites coûteux. Il revient lucide et reconnaissant — Athéna aussi.',
            cout: { grain: 100, bronze: 40 },
            effets: { niveau: 1, relation: [{ dieu: 'athena', delta: 15 }], faveur: -10 },
          },
          {
            label: 'Le juger devant le village',
            issue:
              'Le procès l’humilie. Il se retire sur la grève et l’on ne le reverra pas de bon cœur.',
            effets: { boude: 10 * MIN, plafond: 3, morale: { delta: 3, label: 'La loi appliquée', durMs: 8 * MIN } },
          },
        ],
      },
    ],
  },

  agamemnon: {
    id: 'agamemnon',
    nom: 'Agamemnon',
    titre: 'Roi des rois, pasteur des peuples',
    emoji: '👑',
    couleur: '#c9a441',
    desc:
      'Il apporte l’autorité, l’or et les hommes — et le mépris des dieux pour ceux qui se croient au-dessus d’eux.',
    requiert: { armee: 12, batiment: { id: 'agora', niveau: 3 } },
    coutRecrutement: { bronze: 220, grain: 250 },
    entretien: { grain: 1.5, faveur: 0.15 },
    xpParNiveau: [120, 280, 520, 900],
    passif: {
      desc: '+20 % de butin sur toutes vos expéditions. Mais son orgueil vous coûte 10 points de relation avec chaque Olympien.',
      butinPct: 0.2,
      relationTous: -10,
    },
    capacite: {
      nom: 'Ordre du roi',
      emoji: '👑',
      desc: 'Trois lanciers sont enrôlés et armés sur-le-champ, sans attendre la caserne.',
      cout: 35,
      cooldown: 240_000,
      batailleUniquement: false,
      effet: { type: 'recrues', unite: 'lancier', n: 3 },
    },
    arc: [
      {
        id: 'agamemnon-iphigenie',
        titre: 'Le vent qui ne vient pas',
        emoji: '🌬️',
        niveauRequis: 2,
        texte:
          'Aucun souffle depuis six jours : la flotte est clouée au port. Le devin annonce qu’il faut un sacrifice, et Agamemnon parle à voix basse d’une jeune vie. Le village entier a compris.',
        options: [
          {
            label: 'Refuser tout net',
            issue:
              'Le vent viendra ou ne viendra pas, mais aucun enfant ne mourra ici. Zeus et Athéna en prennent note ; Agamemnon vous juge faible.',
            effets: { relation: [{ dieu: 'zeus', delta: 18 }], morale: { delta: 10, label: 'Le refus du sacrifice', durMs: 15 * MIN }, boude: 5 * MIN },
          },
          {
            label: 'Sacrifier cent bêtes à la place',
            issue:
              'L’hécatombe vide les enclos. Le vent se lève le lendemain — allez savoir pourquoi.',
            cout: { grain: 300 },
            effets: { niveau: 1, faveur: 25, relation: [{ dieu: 'poseidon', delta: 12 }] },
          },
          {
            label: 'Le laisser faire',
            issue:
              'Le vent se lève, et quelque chose se referme dans le village. On obéit désormais par peur.',
            effets: { niveau: 2, morale: { delta: -16, label: 'Le crime d’Aulis', durMs: 25 * MIN }, relation: [{ dieu: 'zeus', delta: -25 }] },
          },
        ],
      },
      {
        id: 'agamemnon-retour',
        titre: 'Le bain du retour',
        emoji: '🩸',
        niveauRequis: 4,
        texte:
          'Une nef de Mycènes apporte une lettre de sa femme : on l’attend, on lui a préparé un bain et un festin. Agamemnon sourit. Cassandre, si elle est là, blêmit.',
        options: [
          {
            label: 'Le laisser rentrer chez lui',
            issue:
              'Il part comblé. Trois jours plus tard, un marin raconte ce qui l’attendait derrière la porte du bain.',
            effets: { mort: true, faveur: 20, morale: { delta: -5, label: 'La fin du roi des rois', durMs: 10 * MIN } },
          },
          {
            label: 'Le retenir sous un prétexte',
            issue:
              'Il reste, furieux, mais vivant — et son or reste avec lui.',
            cout: { bronze: 150 },
            effets: { niveau: 1, boude: 4 * MIN },
          },
        ],
      },
    ],
  },

  cassandre: {
    id: 'cassandre',
    nom: 'Cassandre',
    titre: 'Prophétesse que nul ne croit',
    emoji: '🔮',
    couleur: '#9a8ca8',
    desc:
      'Apollon lui a donné de voir l’avenir, puis l’a condamnée à n’être jamais crue. Vous, vous allez la croire.',
    requiert: { batiment: { id: 'temple', niveau: 3 } },
    coutRecrutement: { grain: 180, bronze: 60 },
    entretien: { faveur: 0.35 },
    xpParNiveau: [100, 230, 430, 760],
    passif: {
      desc: 'Les assauts sont annoncés 2 min plus tôt, et l’issue vraie de chaque dilemme vous est révélée.',
      alerteBonusMs: 2 * MIN,
      revelerDilemmes: true,
    },
    capacite: {
      nom: 'Prophétie',
      emoji: '🔮',
      desc: 'Elle décrit l’assaut à venir avec tant de précision qu’il n’aura pas lieu : la vague est annulée.',
      cout: 55,
      cooldown: 420_000,
      batailleUniquement: false,
      effet: { type: 'annuler-vague' },
    },
    arc: [
      {
        id: 'cassandre-avertissement',
        titre: 'Le cheval qu’il ne faut pas ouvrir',
        emoji: '🐴',
        niveauRequis: 2,
        texte:
          'Cassandre s’est jetée devant l’offrande de bois trouvée à l’aube : « Il y a des hommes dedans. Brûlez-la. » Le village voudrait la garder — c’est une belle pièce, et un présage favorable.',
        options: [
          {
            label: 'La croire et brûler l’offrande',
            issue:
              'Des cris sortent des flammes. Personne ne doutera plus d’elle — et c’est la première fois de sa vie.',
            effets: { niveau: 2, morale: { delta: 8, label: 'La prophétesse écoutée', durMs: 14 * MIN }, relation: [{ dieu: 'athena', delta: 10 }] },
          },
          {
            label: 'Garder l’offrande',
            issue:
              'La nuit, une vingtaine d’ombres en sortent. Vous perdez des hommes et des vivres — et Cassandre ne dit plus rien pendant longtemps.',
            effets: { morale: { delta: -12, label: 'L’avertissement ignoré', durMs: 16 * MIN }, res: { grain: -200, bronze: -60 }, boude: 8 * MIN },
          },
        ],
      },
      {
        id: 'cassandre-apollon',
        titre: 'Le marché d’Apollon',
        emoji: '☀️',
        niveauRequis: 3,
        texte:
          'Elle vous confie qu’Apollon lui propose de lever la malédiction — au prix d’un serment qu’elle ne veut pas nommer. « Décidez pour moi. Vous êtes le seul qui m’écoute. »',
        options: [
          {
            label: 'Qu’elle accepte',
            issue:
              'On la croit désormais partout, et ses visions se font plus nettes. Mais elle ne vous regarde plus jamais de la même façon.',
            effets: { niveau: 2, faveur: 30, morale: { delta: -5, label: 'Le serment de Cassandre', durMs: 10 * MIN } },
          },
          {
            label: 'Qu’elle refuse',
            issue:
              'Elle refuse, soulagée. Sa malédiction demeure, votre confiance aussi — et elle reste entière.',
            effets: { niveau: 1, morale: { delta: 6, label: 'Cassandre libre', durMs: 12 * MIN }, relation: [{ dieu: 'athena', delta: 12 }] },
          },
        ],
      },
    ],
  },

  enee: {
    id: 'enee',
    nom: 'Énée',
    titre: 'Le pieux, fils d’Aphrodite',
    emoji: '🔥',
    couleur: '#c9976a',
    desc:
      'Il porte son père sur son dos et ses dieux dans ses bras. Là où d’autres meurent, Énée fait survivre les siens.',
    requiert: { batiment: { id: 'maisons', niveau: 3 }, relation: { dieu: 'zeus', min: 25 } },
    coutRecrutement: { grain: 200, bois: 150 },
    entretien: { grain: 0.7 },
    xpParNiveau: [95, 220, 420, 740],
    passif: {
      desc: 'Des réfugiés le suivent : +2 habitants à chaque changement de saison.',
      popParSaison: 2,
    },
    capacite: {
      nom: 'Fuite d’Ilion',
      emoji: '🔥',
      desc: 'En cas de défaite, Énée ramène 80 % de vos troupes au lieu de les perdre.',
      cout: 30,
      cooldown: 300_000,
      batailleUniquement: true,
      effet: { type: 'sauver-troupes', part: 0.8 },
    },
    arc: [
      {
        id: 'enee-anchise',
        titre: 'Le père sur les épaules',
        emoji: '👴',
        niveauRequis: 2,
        texte:
          'Anchise, son père, ne marche plus. Énée demande une place au village pour un vieillard qui ne produira rien — et refuse de le laisser derrière.',
        options: [
          {
            label: 'Accueillir le vieillard',
            issue:
              'Anchise raconte le soir venu des histoires que les enfants n’oublieront pas. Une bouche de plus, une mémoire de plus.',
            effets: { pop: 1, morale: { delta: 7, label: 'La piété d’Énée', durMs: 15 * MIN }, relation: [{ dieu: 'zeus', delta: 12 }], niveau: 1 },
          },
          {
            label: 'Refuser : trop de bouches',
            issue:
              'Énée s’incline sans un mot et va installer son père hors des murs. Il vous sert encore, mais plus jamais de bon cœur.',
            effets: { boude: 6 * MIN, relation: [{ dieu: 'zeus', delta: -15 }], morale: { delta: -8, label: 'Le vieillard chassé', durMs: 12 * MIN } },
          },
        ],
      },
      {
        id: 'enee-depart',
        titre: 'La terre promise',
        emoji: '⛵',
        niveauRequis: 4,
        texte:
          'Énée a rêvé d’une côte à l’ouest où sa lignée fondera une ville plus grande que Troie. Il vous demande des navires et la moitié des réfugiés.',
        options: [
          {
            label: 'Le laisser partir fonder sa ville',
            issue:
              'Les voiles disparaissent à l’ouest. Vous perdez des bras et un héros — mais on dira que Rome est née de votre village.',
            effets: { mort: true, pop: -3, faveur: 50, morale: { delta: 10, label: 'La légende d’Énée', durMs: 20 * MIN } },
          },
          {
            label: 'Le garder ici',
            issue:
              'Il range son rêve et reste. Les réfugiés continuent d’affluer, mais il regarde souvent la mer.',
            cout: { bronze: 100 },
            effets: { niveau: 1, morale: { delta: -3, label: 'Le rêve remis', durMs: 8 * MIN } },
          },
        ],
      },
    ],
  },

  diomede: {
    id: 'diomede',
    nom: 'Diomède',
    titre: 'Dompteur de chevaux, favori d’Athéna',
    emoji: '🗡️',
    couleur: '#7d9a6a',
    desc:
      'Le seul mortel à avoir blessé un dieu et à s’en être tiré. En expédition, il est une catastrophe naturelle.',
    requiert: { etoiles: 6, relation: { dieu: 'athena', min: 25 } },
    coutRecrutement: { bronze: 140, grain: 120 },
    entretien: { grain: 0.9 },
    xpParNiveau: [100, 230, 440, 780],
    passif: {
      desc: '+25 % aux dégâts de vos troupes en expédition.',
      degatsExpeditionPct: 0.25,
    },
    capacite: {
      nom: 'Aristie',
      emoji: '🗡️',
      desc: 'Diomède fond sur le plus puissant défenseur ennemi et l’abat sur place.',
      cout: 35,
      cooldown: 180_000,
      batailleUniquement: true,
      effet: { type: 'tuer-chef' },
    },
    arc: [
      {
        id: 'diomede-nuit',
        titre: 'L’expédition nocturne',
        emoji: '🌙',
        niveauRequis: 2,
        texte:
          'Diomède propose d’aller égorger des sentinelles avant l’aube, avec Ulysse s’il est là. Ce n’est pas glorieux. C’est très efficace.',
        options: [
          {
            label: 'Approuver le coup de main',
            issue:
              'Ils reviennent avec des chevaux volés et du sang jusqu’aux coudes. La prochaine vague sera moins nombreuse.',
            effets: { niveau: 2, relation: [{ dieu: 'athena', delta: 12 }], res: { bronze: 60 } },
          },
          {
            label: 'Interdire : ce n’est pas la guerre',
            issue:
              'Il obéit et affûte sa lance en silence. Arès approuve, Athéna trouve cela naïf.',
            effets: { relation: [{ dieu: 'ares', delta: 10 }], boude: 3 * MIN },
          },
        ],
      },
      {
        id: 'diomede-dieu',
        titre: 'La lance contre le dieu',
        emoji: '⚡',
        niveauRequis: 4,
        texte:
          'Diomède jure avoir vu un dieu combattre dans les rangs ennemis, et veut le charger. « Athéna me guidera le bras. » Les prêtres se signent.',
        options: [
          {
            label: 'Le laisser charger',
            issue:
              'Il revient la lance ensanglantée et l’air de ne pas y croire lui-même. Athéna rit dans le vent ; les autres dieux, moins.',
            effets: { niveau: 2, relation: [{ dieu: 'athena', delta: 20 }], faveur: -20, morale: { delta: 8, label: 'La lance contre le dieu', durMs: 14 * MIN } },
          },
          {
            label: 'Lui rappeler sa place de mortel',
            issue:
              'Il baisse sa lance. Les dieux respirent, et vous gardez un héros vivant plutôt qu’une légende morte.',
            effets: { niveau: 1, faveur: 20 },
          },
        ],
      },
    ],
  },
}

export const HERO_IDS = Object.keys(HEROS) as HeroId[]

/** xp gagnée par un héros à l'issue d'une bataille ou d'une expédition */
export const XP_ASSAUT_REPOUSSE = 40
export const XP_EXPEDITION = 55
export const XP_PAR_ETOILE = 15

/** niveau maximum atteignable par un héros (5, ou moins si un choix l'a brisé) */
export const NIVEAU_MAX = 5

/** un héros progresse-t-il encore ? */
export function peutMonter(etat: HeroState): boolean {
  return !etat.mort && etat.niveau < Math.min(NIVEAU_MAX, etat.plafond)
}

/** xp requise pour le prochain niveau (Infinity si au maximum) */
export function xpRequise(def: HeroDef, niveau: number): number {
  return def.xpParNiveau[niveau - 1] ?? Infinity
}

/** puissance d'une capacité selon le niveau : ×1 au niveau 1, ×1.8 au niveau 5 */
export function forceNiveau(niveau: number): number {
  return 1 + (niveau - 1) * 0.2
}

/*
 * Un héros ne reste pas au chaud pendant qu'on se bat pour lui : il descend sur
 * le champ de bataille avec les autres. Il y vaut trois hoplites, encaisse
 * comme un mur — mais s'il tombe, il n'est pas rayé de l'effectif : il est
 * BLESSÉ, et sa capacité reste indisponible le temps qu'il se relève. Seul son
 * arc narratif peut le tuer pour de bon.
 */
export const HERO_HP_BASE = 240
export const HERO_ATK_BASE = 26
/** temps de convalescence après avoir été mis à terre en bataille */
export const HERO_CONVALESCENCE_MS = 5 * 60_000

export function statsCombatHeros(niveau: number): { hp: number; atk: number } {
  const f = forceNiveau(niveau)
  return { hp: Math.round(HERO_HP_BASE * f), atk: Math.round(HERO_ATK_BASE * f) }
}

/** prochain nœud d'arc à déclencher, s'il est mûr — sinon null */
export function noeudMur(def: HeroDef, etat: HeroState): NoeudArc | null {
  if (etat.mort || !etat.recrute) return null
  const n = def.arc[etat.arc]
  if (!n) return null
  return etat.niveau >= n.niveauRequis ? n : null
}

/** somme des passifs de tous les héros à votre service, appliquée en continu */
export interface BonusHeros {
  wallHpPct: number
  degatsMeleePct: number
  degatsExpeditionPct: number
  butinPct: number
  relationTous: number
  revelerVague: boolean
  alerteBonusMs: number
  revelerDilemmes: boolean
  popParSaison: number
  gardeDuCorpsPct: number
}

export const BONUS_NEUTRE: BonusHeros = {
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
}

/** agrège les passifs des héros vivants et présents */
export function cumulerPassifs(etats: Record<HeroId, HeroState>): BonusHeros {
  const b: BonusHeros = { ...BONUS_NEUTRE }
  for (const id of HERO_IDS) {
    const e = etats[id]
    if (!e || !e.recrute || e.mort) continue
    const p = HEROS[id].passif
    b.wallHpPct += p.wallHpPct ?? 0
    b.degatsMeleePct += p.degatsMeleePct ?? 0
    b.degatsExpeditionPct += p.degatsExpeditionPct ?? 0
    b.butinPct += p.butinPct ?? 0
    b.relationTous += p.relationTous ?? 0
    b.alerteBonusMs += p.alerteBonusMs ?? 0
    b.popParSaison += p.popParSaison ?? 0
    /*
     * Somme, comme tous les autres passifs — et non `Math.max`, qui contredisait
     * le contrat de `BonusHeros` et aurait ignoré un second garde du corps le jour
     * où il en existerait un. Plafonné à 80 % : aucune maisonnée ne rend une
     * garnison invulnérable.
     */
    b.gardeDuCorpsPct = Math.min(0.8, b.gardeDuCorpsPct + (p.gardeDuCorpsPct ?? 0))
    b.revelerVague ||= !!p.revelerVague
    b.revelerDilemmes ||= !!p.revelerDilemmes
  }
  return b
}

/** entretien total dû chaque minute par la maisonnée héroïque */
export function entretienTotal(etats: Record<HeroId, HeroState>): { grain: number; faveur: number } {
  let grain = 0
  let faveur = 0
  for (const id of HERO_IDS) {
    const e = etats[id]
    if (!e || !e.recrute || e.mort) continue
    grain += HEROS[id].entretien.grain ?? 0
    faveur += HEROS[id].entretien.faveur ?? 0
  }
  return { grain, faveur }
}
