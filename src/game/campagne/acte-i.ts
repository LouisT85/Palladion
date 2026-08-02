import { WALL_HP, troupes } from '../data'
import { armee, auPoste, jalons, seuil, type ActeCampagne } from './types'

/*
 * ACTE I - LES MILLE NEFS
 *
 * Le rôle de cet acte est d'apprendre la peur, pas la gestion : le joueur sait
 * déjà bâtir une ferme (Zeus le lui a montré). Ce qu'il découvre ici, c'est qu'il
 * n'est PAS l'objet de la guerre - les Achéens débarquent pour Troie, à deux
 * lieues de là, et son village n'est qu'un grenier sur leur chemin.
 *
 * D'où la contrainte de l'acte : nourrir des bouches qu'on n'a pas demandées
 * (les réfugiés de la côte) tout en dressant une palissade avant que les
 * premières bandes de fourrageurs ne remontent la grève.
 */
export const ACTE_I: ActeCampagne = {
  id: 'les-mille-nefs',
  numero: 1,
  titre: 'Acte I - Les mille nefs',
  lieu: 'La grève de Sigée, au printemps',
  emoji: '⛵',
  cadre: 'greve',
  prologue: [
    'On les a vues à l’aube. D’abord trois voiles, puis trente, puis on a cessé de compter - la mer, jusqu’à l’horizon, était couverte de nefs noires.',
    'Elles ne viennent pas pour toi. Elles viennent pour Troie, à deux lieues d’ici, parce qu’un prince troyen a emmené une reine d’Argos. Mille équipages vont camper sur cette grève, et mille équipages, cela mange.',
    'Ton village est le premier grenier sur leur route. Tes voisins de la côte, eux, n’ont déjà plus de village : ils arrivent par la route de l’est avec ce qu’ils ont pu porter.',
    'Dresse une palissade, mets du grain de côté, et prie pour qu’on t’oublie. On ne t’oubliera pas.',
  ],
  epilogue: [
    'La palissade a tenu. Les fourrageurs achéens ont pris trois chèvres, deux amphores et sont repartis en riant - mais ils sont repartis.',
    'Sur la grève, le camp s’installe pour durer : palissades, chantiers navals, tentes jusqu’à la rivière. Personne, dans ton village, ne croit plus que cette guerre sera courte.',
    'Et cette nuit, pour la première fois, on a entendu les cors sonner du côté de Troie.',
  ],
  echec: [
    'Ils ont enfoncé la palissade avant qu’elle ne soit debout. Ce qui restait de grain est parti sur leurs épaules, et ce qui restait de tes gens sur la route.',
    'Il n’y a pas de honte à tomber le premier jour d’une guerre de dix ans. Il y a seulement à recommencer.',
  ],
  depart: {
    /*
     * Le budget de l'acte, vérifié pièce par pièce : palissade 90 bois, caserne
     * 70 bois + 60 pierre, camp de bûcherons 30 + 30, carrière 50 bois, trois
     * lanciers 75 bois + 18 bronze. Soit 315 bois pour 300 en réserve - le
     * complément vient de la cueillette et des premiers ateliers, ce qui laisse
     * de la marge sans rien offrir.
     */
    resources: { bois: 300, pierre: 190, grain: 200, bronze: 24 },
    pop: 9,
    // l'agora et deux maisons debout : un village qui vivait déjà avant la guerre
    batiments: { agora: 1, maisons: 1, ferme: 1 },
    army: troupes({ lancier: 0, archer: 0, hoplite: 0, frondeur: 0, peltaste: 0, belier: 0 }),
    morale: 46,
    faveur: 12,
    tours: 0,
    saison: 'printemps',
    meteo: 'clair',
    murPart: 0,
    relations: { zeus: 4, poseidon: -6, athena: 0, ares: 0 },
  },
  menace: {
    // douze minutes : de quoi bâtir la palissade sans courir, mais pas de quoi flâner
    premierAssautMs: 12 * 60_000,
    /*
     * Six, et le chiffre est calculé, pas choisi au hasard : le budget d'une vague
     * vaut `menace × 5,5`, soit 28 à 38 ici, et un pillard en coûte 10 - donc trois
     * pillards, exactement ce que « ils tâtent le terrain » promet.
     *
     * C'est aussi la limite de ce que les trois lances exigées par l'acte peuvent
     * repousser : 3 lanciers (126 pv, 24 d'attaque) battent 3 pillards (90 pv,
     * 18 d'attaque) une fois la palissade tombée ; à cinq pillards, ils y restent.
     * Un acte ne doit pas demander une garnison qui perd son propre assaut.
     */
    threat: 6,
    threatMod: 0,
  },
  // aucun héros : personne d'illustre ne s'arrête encore chez un fermier
  herosScriptes: [],
  objectifs: [
    {
      id: 'palissade',
      texte: 'Dressez une palissade autour du village',
      pourquoi: 'Même du pin coupé à la hâte arrête une flèche - et décourage un fourrageur pressé.',
      progres: (s) => seuil(s.buildings.remparts.level, 1),
    },
    {
      id: 'greniers',
      texte: 'Tenez 260 de grain en réserve',
      pourquoi: 'Les réfugiés de la côte mangent aussi. Un grenier vide, et c’est la mutinerie avant l’assaut.',
      progres: (s) => seuil(Math.floor(s.resources.grain), 260),
    },
    {
      id: 'bras',
      texte: 'Mettez trois habitants au travail dans vos ateliers',
      pourquoi: 'Personne ne prend son poste tout seul : un atelier sans bras ne rend rien.',
      /*
       * TROIS et non quatre : l'agora de niveau 1 plafonne tous les ateliers au
       * niveau 1, donc à UN poste chacun. Le champ, la forêt et la carrière - le
       * trio que la leçon de Zeus recommande - en offrent exactement trois. En
       * exiger quatre obligeait à bâtir un quatrième atelier (80 bois pour la
       * forge) en plus de la palissade et de la caserne : l'acte se jouait à la
       * pièce près, ce qui n'est pas la leçon qu'il doit donner.
       */
      progres: (s) => seuil(s.villageois.filter((v) => v.poste !== null).length, 3),
    },
    {
      id: 'premiere-lance',
      texte: 'Levez trois soldats',
      pourquoi: 'Un soldat est un villageois en moins aux champs. C’est le premier arbitrage d’un chef.',
      progres: (s) => seuil(armee(s), 3),
    },
    {
      id: 'tenir',
      texte: 'Repoussez le premier assaut achéen',
      pourquoi: 'Ils tâtent le terrain. Ce qu’ils apprendront ce jour-là décidera de leur retour.',
      progres: (s) => seuil(s.faits.assautsRepousses, 1),
    },
    {
      id: 'paysan-au-champ',
      texte: 'Faites tenir le poste de la ferme par un paysan de métier',
      pourquoi: 'À son métier un homme rend tout ; ailleurs, à peine plus de la moitié.',
      facultatif: true,
      progres: (s) =>
        jalons(s.villageois.some((v) => v.poste === 'ferme' && v.metier === 'ferme'), auPoste(s, 'ferme') >= 1),
    },
  ],
  defaite: {
    texte: 'Le village est tombé : plus un habitant, plus un mur.',
    atteinte: (s) => s.pop <= 0 || (s.faits.assautsPerdus >= 2 && s.buildings.remparts.level === 0),
  },
  recompense: { res: { bois: 220, pierre: 200, grain: 180 }, faveur: 12, pop: 2 },
}

/** structure de mur imposée au départ de l'acte, d'après `murPart` */
export function murDeDepart(niveau: number, part: number): number {
  return Math.round((WALL_HP[niveau] ?? 0) * part)
}
