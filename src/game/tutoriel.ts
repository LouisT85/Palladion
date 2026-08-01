import { BUILDING_IDS } from './data'
import type { BuildingId, GodId, HeroId, ResourceId, UnitId } from './types'

/*
 * ═════════════════════ LA LEÇON DE ZEUS ═════════════════════
 *
 * Une prise en main SCÉNARISÉE, pas une suite de bulles d'aide. Le maître de
 * l'Olympe descend expliquer sa création, et à chaque étape il exige un geste :
 * bâtir la ferme, y placer un paysan, lever une lance, ouvrir son temple. Le
 * reste de l'écran est éteint tant que ce geste n'est pas fait — on ne peut pas
 * se perdre, et on ne peut pas non plus se contenter de cliquer « suivant ».
 *
 * Deux règles de conception :
 *  · une étape = UNE idée. Jamais deux mécaniques dans le même encart.
 *  · toute étape qui exige un geste dit EXACTEMENT lequel, et se valide seule.
 */

/** vue en lecture seule de la partie, telle que la lisent les conditions */
export interface SnapTuto {
  resources: Record<ResourceId, number>
  buildings: Record<BuildingId, { level: number; targetLevel?: number }>
  villageois: { poste: BuildingId | null; metier: BuildingId }[]
  army: Record<UnitId, number>
  recruitQueue: unknown[]
  gods: Record<GodId, { relation: number }>
  heros: Record<HeroId, { recrute: boolean }>
  panel: string | null
  pop: number
  faveur: number
}

export type PlaceCarte = 'centre' | 'bas' | 'haut' | 'gauche' | 'droite'

export interface EtapeTuto {
  id: string
  titre: string
  /** ce que Zeus dit — un paragraphe par élément */
  texte: string[]
  humeur?: 'calme' | 'grave' | 'content'
  /**
   * Éléments mis en lumière ET laissés cliquables (valeurs de `data-tuto`).
   * Plusieurs, car un geste en demande souvent deux : la carte pour choisir
   * l'emplacement, puis le panneau qui s'ouvre pour lancer le chantier.
   */
  cibles?: string[]
  /** où poser l'encart par rapport à la première cible */
  place?: PlaceCarte
  /**
   * Geste attendu. Tant qu'il n'est pas accompli, pas de bouton « Suivant » :
   * `ordre` dit quoi faire, `fait` détecte quand c'est fait.
   */
  ordre?: string
  fait?: (s: SnapTuto) => boolean
  /**
   * Variante « ouvre, regarde, referme » pour les grands panneaux. On ne peut
   * pas se contenter de valider à l'ouverture : l'étape suivante refermerait le
   * panneau au quart de seconde, et le joueur n'aurait rien vu. On attend donc
   * qu'il l'ait ouvert PUIS refermé lui-même.
   */
  voir?: 'pantheon' | 'expeditions' | 'heros'
}

const enChantier = (s: SnapTuto, b: BuildingId): boolean =>
  s.buildings[b].level >= 1 || s.buildings[b].targetLevel !== undefined

export const ETAPES: EtapeTuto[] = [
  {
    id: 'bienvenue',
    titre: 'Zeus descend de l’Olympe',
    humeur: 'calme',
    texte: [
      'Mortel. Tu vois cette plaine ? Elle est à toi. Ce tas de cabanes aussi.',
      'Troie brûlera bientôt à quelques lieues d’ici, et les armées passeront par ta porte. Je vais te montrer comment tenir — une fois. Ensuite tu te débrouilleras.',
    ],
    place: 'centre',
  },
  {
    id: 'ressources',
    titre: 'Ce que la terre te donne',
    texte: [
      'Bois, pierre, grain, bronze. Tout part de là : on ne bâtit pas un rempart avec des prières.',
      'Le chiffre du dessous est ce qui rentre chaque minute. S’il passe au rouge, tu manges tes réserves. Passe la souris sur un jeton : il te dira tout.',
    ],
    cibles: ['ressources'],
    place: 'bas',
  },
  {
    id: 'ambiance',
    titre: 'L’humeur de tes gens',
    texte: [
      'Un village content travaille mieux. Un village morose traîne les pieds, et sous vingt-cinq il se mutine.',
      'À côté, la menace : plus tu prospères, plus on te convoite. C’est la rançon de la réussite, et tu n’y échapperas pas.',
    ],
    cibles: ['ambiance', 'menace'],
    place: 'bas',
  },
  {
    id: 'batir',
    titre: 'Bâtis d’abord une ferme',
    humeur: 'grave',
    texte: [
      'Un village qui a faim n’obéit pas longtemps. Ta première pierre sera un champ.',
      'Les emplacements en pointillés attendent qu’on les remplisse. Clique sur la ferme, puis lance le chantier dans le panneau qui s’ouvre.',
    ],
    cibles: ['carte-ferme', 'panneau'],
    place: 'droite',
    ordre: 'Cliquez la ferme sur la carte, puis « Lancer la construction »',
    fait: (s) => enChantier(s, 'ferme'),
  },
  {
    id: 'chantier',
    titre: 'Le temps des bâtisseurs',
    texte: [
      'Rien ne se bâtit d’un claquement de doigts. Tes ouvriers y sont, la barre au-dessus du chantier dit où ils en sont. Deux chantiers de front, pas plus.',
      'Tu n’as pas à regarder pousser les murs : presse le temps. **×2, ×4, ×8** — ou les touches 1 à 4. Tout accélère, la production comme les assauts.',
      'Fais-le maintenant, et attends que le champ sorte de terre.',
    ],
    cibles: ['vitesses', 'carte-ferme'],
    place: 'bas',
    ordre: 'Accélérez le temps et laissez le chantier s’achever',
    fait: (s) => s.buildings.ferme.level >= 1,
  },
  {
    id: 'metiers',
    titre: 'Un atelier sans bras ne rend rien',
    texte: [
      'Tu croyais qu’un champ se cultive tout seul ? Chacun de tes habitants est né avec un métier : paysan, bûcheron, tailleur de pierre, forgeron, prêtre, docker.',
      'À son métier, il donne tout. Ailleurs, il fait ce qu’il peut — un peu plus de la moitié. Et **personne ne prend son poste sans qu’on le lui dise** : c’est ton travail, pas le mien.',
      'Ouvre le recensement et envoie quelqu’un à la ferme. Un paysan, si le sort t’en a donné un.',
    ],
    cibles: ['habitants', 'recensement'],
    place: 'bas',
    ordre: 'Ouvrez « Habitants » et affectez quelqu’un à la ferme',
    fait: (s) => s.villageois.some((v) => v.poste === 'ferme'),
  },
  {
    id: 'remparts',
    titre: 'Puis dresse une enceinte',
    humeur: 'grave',
    texte: [
      'Ce qui vient par la route de l’est ne demandera pas la permission. Même une palissade de pieux vaut mieux qu’un champ ouvert.',
      'Chaque pan de ton mur se défend pour son compte, et peut céder seul. Tu verras.',
    ],
    cibles: ['carte-remparts', 'panneau'],
    place: 'gauche',
    ordre: 'Cliquez la porte à l’est, puis « Lancer la construction »',
    fait: (s) => enChantier(s, 'remparts'),
  },
  {
    id: 'caserne',
    titre: 'Une lance, un homme en moins aux champs',
    texte: [
      'Là, sur la carte, l’emplacement de la caserne. Tu la bâtiras quand ton bois le permettra — mais retiens d’abord la règle.',
      '**Un soldat est un villageois en moins.** Il quitte l’atelier, il ne produit plus, et il mange le double.',
      'Une armée trop grosse affame la cité qu’elle protège. C’est le premier arbitrage d’un chef, et le plus mal compris.',
    ],
    cibles: ['carte-caserne'],
    place: 'gauche',
  },
  {
    id: 'assaut',
    titre: 'Quand les cors sonneront',
    humeur: 'grave',
    texte: [
      'Tes éclaireurs t’avertiront cinq minutes à l’avance : combien ils sont, par où ils viennent, et ce que tu gagnes si tu tiens.',
      'La bataille se joue sous tes yeux, sur cette carte. Tes archers tirent depuis les murs tant que les murs tiennent. Après, c’est la mêlée dans tes rues.',
      'Si tu es pressé, tu pourras même les provoquer : vingt-cinq pour cent de butin en plus, et pas une seconde de préparation en moins.',
    ],
    cibles: ['menace'],
    place: 'bas',
  },
  {
    id: 'pantheon',
    titre: 'Nous autres, sur l’Olympe',
    texte: [
      'Nous sommes quatre à regarder ce que tu fais : moi, Poséidon, Athéna, Arès. Chacun tient un compte.',
      'La **faveur** paie nos bénédictions. La **relation** en fixe la force : de la moitié pour qui nous offense au double pour notre élu. Et un dieu offensé le montre — sa foudre n’atteint même plus le sol.',
      'Ouvre le panthéon. Regarde à quoi ressemble ma main quand elle est contente de toi.',
    ],
    cibles: ['bouton-pantheon', 'modale-pantheon'],
    place: 'bas',
    ordre: 'Ouvrez le Panthéon — puis refermez-le quand vous aurez vu',
    voir: 'pantheon',
  },
  {
    id: 'expeditions',
    titre: 'Le monde ne s’arrête pas à ta porte',
    texte: [
      'Huit places fortes autour de toi. Tu peux les **piller** — riche, rapide, et je te le ferai payer, car je protège l’hôte et le suppliant.',
      'Ou les **secourir** quand elles appellent. Rien à rafler, des hommes à perdre pour rien — mais un allié qui paiera tribut et enverra ses lances mourir sur tes murs à ta place.',
      'La richesse ou le réseau. Choisis souvent, tu verras ce que tu es.',
    ],
    cibles: ['bouton-expeditions', 'modale-expeditions'],
    place: 'bas',
    ordre: 'Ouvrez la carte des expéditions — puis refermez-la',
    voir: 'expeditions',
  },
  {
    id: 'heros',
    titre: 'Ceux dont on chantera le nom',
    texte: [
      'Hector, Ulysse, Achille, Cassandre… Ils ne s’achètent pas. Ils viennent quand ta cité mérite qu’on s’y arrête.',
      'Ils mangent chaque minute, ils exigent des honneurs, et ils s’en vont si tu les ignores trois fois. En échange, ils se battent au premier rang de tes lignes.',
      'Et chacun traverse une histoire dont certaines fins sont sans retour. Achille peut mourir sous tes yeux. Ne l’oublie pas au moment de choisir.',
    ],
    cibles: ['bouton-heros', 'modale-heros'],
    place: 'bas',
    ordre: 'Ouvrez le panneau des héros — puis refermez-le',
    voir: 'heros',
  },
  {
    id: 'missions',
    titre: 'De quoi t’occuper',
    texte: [
      'Cinquante-cinq objectifs jalonnent ton règne, du premier toit à la cité de légende. Chacun paie une récompense qui finance le suivant.',
      'Quand un objectif est atteint, le bandeau s’allume : réclame, et enchaîne.',
    ],
    cibles: ['missions'],
    place: 'droite',
  },
  {
    id: 'temps',
    titre: 'Le temps et le regard',
    texte: [
      'Les saisons tournent : l’hiver ferme la mer et vide les greniers. Le ciel change aussi — sous la pluie, un arc porte mal.',
      'Tu peux presser le temps avec ×2, ×4, ×8, ou les touches 1 à 4. Il repassera seul à ×1 dès qu’on t’attaquera.',
      'Et la carte se manipule : molette pour approcher, glisser pour te déplacer, double-clic pour reprendre la vue d’ensemble.',
    ],
    cibles: ['vitesses'],
    place: 'bas',
  },
  {
    id: 'adieu',
    titre: 'À toi de jouer',
    humeur: 'content',
    texte: [
      'Voilà. Bâtis, nourris, arme, honore — et tiens.',
      'Je regarderai. Nous regarderons tous. Le point d’interrogation en haut te redira tout ceci si ta mémoire flanche.',
      'Que la plaine te soit clémente, mortel.',
    ],
    place: 'centre',
  },
]

export const NB_ETAPES = ETAPES.length

/** les bâtiments que le tutoriel fait construire, dans l'ordre */
export const BATIS_TUTO: BuildingId[] = BUILDING_IDS.filter((b) => b === 'ferme' || b === 'remparts' || b === 'caserne')
