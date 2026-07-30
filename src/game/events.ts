import type { BuildingId, Cost, GodId, ResourceId, UnitId } from './types'

/** Vue en lecture seule de l'état, pour les conditions d'événements. */
export interface GameSnap {
  resources: Record<ResourceId, number>
  army: Record<UnitId, number>
  pop: number
  morale: number
  threat: number
  buildings: Record<BuildingId, { level: number }>
  gods: Record<GodId, { relation: number }>
}

export function armee(s: GameSnap): number {
  return s.army.lancier + s.army.archer + s.army.hoplite
}

/** API de mutation fournie par le store lors de la résolution d'un choix. */
export interface EffectCtx {
  add(res: ResourceId, n: number): void
  faveur(n: number): void
  pop(n: number): void
  units(u: UnitId, n: number): void
  relation(g: GodId, n: number): void
  /** durMs null = permanent, sinon modificateur temporaire */
  morale(delta: number, label: string, durMs?: number): void
  schedule(type: string, inMs: number, payload?: Record<string, number | string>): void
  /** révèle la prochaine attaque (présages) */
  revealAttack(): void
  /** vole un % des ressources ; retourne le détail pour le texte */
  stealPct(p: number, quoi?: ResourceId[]): string
  damageWallPct(p: number): void
  /** retire jusqu'à n soldats au hasard ; retourne le nombre effectif */
  loseSoldiers(n: number): number
  droughtFor(ms: number): void
}

export interface EventChoice {
  label: string
  /** coût prélevé par le store avant apply ; grise le bouton si insuffisant */
  cout?: Cost
  /** condition supplémentaire (ex : avoir 3 soldats) */
  requiert?: (s: GameSnap) => boolean
  requiertLabel?: string
  /** murmure d'Athéna (affiché si relation ≥ 25) — reçoit le roll pour dire VRAI */
  hint?: (roll: number) => string | null
  /** applique les effets et retourne le récit de l'issue */
  apply: (ctx: EffectCtx, roll: number) => string[]
}

export interface EventDef {
  id: string
  emoji: string
  titre: string
  texte: string
  condition?: (s: GameSnap) => boolean
  weight: number
  cooldown: number
  /** événements de crise : vérifiés en priorité et plus fréquemment */
  priorite?: boolean
  choices: EventChoice[]
}

// ─────────────────────────────────────────────────────────────────────────────
export const EVENTS: EventDef[] = [
  {
    id: 'refugies-troyens',
    emoji: '🏺',
    titre: 'Réfugiés de la guerre',
    texte:
      'Une colonne de réfugiés se présente à vos portes : femmes, vieillards, quelques hommes en âge de porter la lance. Leurs villages ont brûlé sous les torches achéennes. Ils implorent l’asile au nom de Zeus Xenios, protecteur des suppliants.',
    weight: 10,
    cooldown: 6 * 60_000,
    choices: [
      {
        label: 'Ouvrir les portes',
        hint: (roll) =>
          roll < 0.7
            ? '« Leurs yeux disent vrai. Accueille-les, tu ne le regretteras pas. »'
            : '« Leurs mains sont calleuses comme celles des brigands. Ils ne sont pas ce qu’ils prétendent… »',
        apply: (ctx, roll) => {
          ctx.pop(4)
          if (roll < 0.7) {
            ctx.units('lancier', 1)
            ctx.relation('zeus', 10)
            ctx.morale(5, 'Hospitalité honorée', 10 * 60_000)
            return [
              'Les réfugiés s’installent. Quatre familles rejoignent le village, et un jeune homme demande une lance pour défendre son nouveau foyer.',
              'Zeus sourit à qui honore la xenia. (+4 population, +1 lancier, Zeus +10)',
            ]
          }
          ctx.schedule('trahison-refugies', (3 + roll * 4) * 60_000)
          return [
            'Les réfugiés s’installent parmi vous. Quelque chose dans leurs regards vous met pourtant mal à l’aise… (+4 population)',
          ]
        },
      },
      {
        label: 'Refuser l’asile',
        apply: (ctx) => {
          ctx.relation('zeus', -18)
          ctx.morale(-6, 'Loi de l’hospitalité brisée', 10 * 60_000)
          return [
            'Les portes restent closes. La colonne s’éloigne sous la pluie, et un vieillard maudit votre toit.',
            'Vous avez brisé la loi de Zeus Xenios. Le Tonnant s’en souviendra. (Zeus −18, ambiance −6)',
          ]
        },
      },
    ],
  },
  {
    id: 'mendiant-mysterieux',
    emoji: '🧙',
    titre: 'Le mendiant au seuil',
    texte:
      'Un vieil homme en haillons frappe à la porte de l’agora. Il demande du pain, du vin, et une place près du feu. Ses yeux, étrangement, semblent retenir des orages.',
    weight: 8,
    cooldown: 8 * 60_000,
    choices: [
      {
        label: 'Offrir pain et vin (−30 🌾)',
        cout: { grain: 30 },
        hint: (roll) =>
          roll < 0.4
            ? '« Regarde ses yeux, ce ne sont pas ceux d’un mortel. Sers-le comme un roi. »'
            : '« Un simple vagabond — mais la xenia vaut pour tous. »',
        apply: (ctx, roll) => {
          ctx.relation('zeus', 15)
          if (roll < 0.4) {
            ctx.faveur(30)
            ctx.morale(8, 'Un dieu a béni votre table', 12 * 60_000)
            return [
              'Le vieillard mange, boit, puis se lève. Sa silhouette grandit, l’air sent la foudre — et il disparaît dans un éclair.',
              'C’était Zeus lui-même, éprouvant votre hospitalité. (+30 faveur, Zeus +15, ambiance +8)',
            ]
          }
          return ['Le mendiant vous bénit et reprend la route. Les dieux notent les gestes simples. (Zeus +15)']
        },
      },
      {
        label: 'Le chasser',
        apply: (ctx) => {
          ctx.relation('zeus', -20)
          ctx.morale(-3, 'Un suppliant chassé', 8 * 60_000)
          const detail = ctx.stealPct(0.05, ['grain'])
          return [
            'On repousse le vieillard à coups de bâton. Cette nuit-là, des rats envahissent les greniers…',
            `Perte : ${detail}. (Zeus −20)`,
          ]
        },
      },
    ],
  },
  {
    id: 'marchand-phenicien',
    emoji: '⛵',
    titre: 'Le marchand phénicien',
    texte:
      'Un navire aux voiles pourpres accoste. Le marchand propose du bronze de Chypre « au prix de l’amitié » : 60 lingots contre 200 stères de bois.',
    condition: (s) => s.buildings.port.level >= 1,
    weight: 8,
    cooldown: 7 * 60_000,
    choices: [
      {
        label: 'Acheter (−200 🪵 → +60 🥉)',
        cout: { bois: 200 },
        hint: (roll) =>
          roll < 0.85
            ? '« Le métal sonne clair. Affaire honnête. »'
            : '« Frappe les lingots du plat de l’épée : j’entends du plomb sous le bronze. »',
        apply: (ctx, roll) => {
          if (roll < 0.85) {
            ctx.add('bronze', 60)
            return ['Le bronze est excellent — les forgerons s’en réjouissent. (+60 bronze)']
          }
          ctx.add('bronze', 25)
          ctx.morale(-3, 'Floués par un marchand', 6 * 60_000)
          return [
            'Une fois le navire à l’horizon, la moitié des lingots se révèlent fourrés de plomb. (+25 bronze seulement)',
          ]
        },
      },
      {
        label: 'Décliner poliment',
        apply: () => ['Le marchand hausse les épaules et remet à la voile vers Lesbos.'],
      },
    ],
  },
  {
    id: 'oracle-errant',
    emoji: '🔮',
    titre: 'L’oracle errant',
    texte:
      'Une pythie voilée, chassée de Delphes dit-elle, propose de lire pour vous le vol des oiseaux — moyennant une offrande de grain.',
    weight: 7,
    cooldown: 9 * 60_000,
    choices: [
      {
        label: 'Offrir 40 🌾 pour les présages',
        cout: { grain: 40 },
        apply: (ctx) => {
          ctx.faveur(10)
          ctx.revealAttack()
          return [
            'La pythie brûle des laurier et scrute la fumée : « Je vois des lances sur la route de l’est… je vois QUAND elles viendront. »',
            'La prochaine attaque est révélée sur le bandeau d’alerte. (+10 faveur)',
          ]
        },
      },
      {
        label: 'L’éconduire',
        apply: (ctx) => {
          ctx.relation('athena', -4)
          return ['La pythie s’éloigne. « Les aveugles volontaires sont les préférés des Moires », lance-t-elle. (Athéna −4)']
        },
      },
    ],
  },
  {
    id: 'deserteurs-acheens',
    emoji: '🪖',
    titre: 'Déserteurs achéens',
    texte:
      'Deux hoplites au bouclier retourné demandent à servir votre village. Ils ont fui le camp d’Agamemnon — « dix ans de siège pour l’honneur d’un seul homme, c’en est trop ».',
    condition: (s) => s.buildings.caserne.level >= 1,
    weight: 7,
    cooldown: 9 * 60_000,
    choices: [
      {
        label: 'Les enrôler',
        apply: (ctx) => {
          ctx.units('hoplite', 2)
          ctx.relation('ares', 8)
          ctx.relation('zeus', -8)
          ctx.morale(-4, 'Des parjures parmi nous', 8 * 60_000)
          return [
            'Les deux hoplites prêtent serment à votre autel. De redoutables lames — mais des hommes qui ont déjà trahi un serment. (+2 hoplites, Arès +8, Zeus −8)',
          ]
        },
      },
      {
        label: 'Les renvoyer',
        apply: (ctx) => {
          ctx.relation('ares', -4)
          ctx.morale(2, 'La parole donnée est sacrée', 6 * 60_000)
          return ['Vous refusez des parjures. Le village approuve ; Arès, lui, méprise tant de scrupules. (Arès −4)']
        },
      },
    ],
  },
  {
    id: 'fete-dionysos',
    emoji: '🍇',
    titre: 'Les vendanges de Dionysos',
    texte:
      'Les vignes des coteaux plient sous les grappes. Les anciens réclament une fête en l’honneur de Dionysos : vin, chants, et bœufs à la broche.',
    weight: 8,
    cooldown: 10 * 60_000,
    choices: [
      {
        label: 'Organiser la fête (−80 🌾, −30 🪵)',
        cout: { grain: 80, bois: 30 },
        apply: (ctx) => {
          ctx.morale(18, 'Fête de Dionysos', 12 * 60_000)
          ctx.relation('zeus', 4)
          ctx.pop(1)
          return [
            'Trois jours de chants montent jusqu’aux étoiles. On danse, on marie deux jeunes gens, on oublie la guerre. (Ambiance +18)',
          ]
        },
      },
      {
        label: 'Refuser — les temps sont durs',
        apply: (ctx) => {
          ctx.morale(-4, 'Fête annulée', 5 * 60_000)
          return ['Les villageois rangent les amphores en silence. La guerre a déjà volé assez de joies. (Ambiance −4)']
        },
      },
    ],
  },
  {
    id: 'naufrages',
    emoji: '🌊',
    titre: 'L’épave de la trirème',
    texte:
      'À l’aube, une trirème éventrée gît sur les rochers près du port. Des survivants s’accrochent aux débris ; la cargaison flotte entre deux eaux.',
    condition: (s) => s.buildings.port.level >= 1,
    weight: 7,
    cooldown: 9 * 60_000,
    choices: [
      {
        label: 'Secourir les marins',
        apply: (ctx) => {
          ctx.relation('poseidon', 14)
          ctx.pop(2)
          ctx.morale(4, 'Marins sauvés des flots', 8 * 60_000)
          return [
            'Vos barques arrachent sept marins à la mer. Deux choisissent de rester et de servir le village. (Poséidon +14, +2 population)',
          ]
        },
      },
      {
        label: 'Piller la cargaison',
        apply: (ctx) => {
          ctx.add('bois', 120)
          ctx.add('bronze', 40)
          ctx.relation('poseidon', -20)
          ctx.relation('zeus', -6)
          ctx.morale(-5, 'Des noyés qu’on n’a pas secourus', 8 * 60_000)
          return [
            'On repêche les amphores et le bronze — pas les hommes. La mer rendra ce qu’on lui doit, dit le vieux pêcheur. (+120 bois, +40 bronze, Poséidon −20)',
          ]
        },
      },
    ],
  },
  {
    id: 'secheresse',
    emoji: '☀️',
    titre: 'Hélios accable les champs',
    texte:
      'Pas une goutte de pluie depuis des semaines. L’orge jaunit sur pied, les bœufs cherchent l’ombre. Les prêtres proposent un sacrifice pour appeler la pluie.',
    condition: (s) => s.buildings.ferme.level >= 1,
    weight: 6,
    cooldown: 11 * 60_000,
    choices: [
      {
        label: 'Sacrifier aux dieux (−50 🌾)',
        cout: { grain: 50 },
        apply: (ctx) => {
          ctx.relation('zeus', 4)
          ctx.morale(5, 'La pluie est revenue', 8 * 60_000)
          return ['Le soir même, des nuages crèvent au-dessus du mont Ida. Les champs boivent enfin. (Ambiance +5)']
        },
      },
      {
        label: 'Laisser brûler',
        apply: (ctx) => {
          ctx.droughtFor(6 * 60_000)
          ctx.morale(-6, 'Sécheresse', 6 * 60_000)
          return ['Le soleil poursuit son œuvre : la production de grain est réduite de moitié pendant 6 minutes. (Ambiance −6)']
        },
      },
    ],
  },
  {
    id: 'cheval-de-bois',
    emoji: '🐴',
    titre: 'Le cheval abandonné',
    texte:
      'Au matin, vos sentinelles découvrent devant la porte un grand cheval de bois monté sur des roues, sans trace de ses constructeurs. Un vieillard hurle sur la place : « Je crains les Grecs, même porteurs de présents ! »',
    condition: (s) => s.threat >= 30,
    weight: 6,
    cooldown: 15 * 60_000,
    choices: [
      {
        label: 'Le tirer dans l’enceinte',
        hint: (roll) =>
          roll < 0.5
            ? '« Ce bois sent le cèdre et l’or. Un trésor votif oublié — fais-le entrer. »'
            : '« J’entends des respirations derrière les planches. Brûle-le. BRÛLE-LE. »',
        apply: (ctx, roll) => {
          if (roll < 0.5) {
            ctx.add('bois', 200)
            ctx.add('bronze', 60)
            ctx.morale(6, 'Le présent des dieux', 8 * 60_000)
            return [
              'Le ventre du cheval regorge d’offrandes votives : bronze ciselé, bois précieux. Un ex-voto abandonné par une armée pressée. (+200 bois, +60 bronze)',
            ]
          }
          const vol = ctx.stealPct(0.35)
          const morts = ctx.loseSoldiers(2)
          ctx.morale(-12, 'Trahison du cheval de bois', 10 * 60_000)
          return [
            'À la nuit, une trappe s’ouvre sous le ventre de la bête. Des hommes en armes se glissent vers les entrepôts…',
            `Ils pillent et s’enfuient avant l’alerte. Perdu : ${vol}${morts ? `, ${morts} soldat(s) tombé(s)` : ''}. (Ambiance −12)`,
          ]
        },
      },
      {
        label: 'Le brûler sur place',
        apply: (ctx) => {
          ctx.add('bois', 20)
          ctx.relation('athena', 10)
          ctx.morale(2, 'Prudence récompensée', 6 * 60_000)
          return [
            'Le bûcher monte haut et clair. Dans les flammes, certains jurent entendre des cris… La prudence est la moitié de la sagesse. (Athéna +10, +20 bois)',
          ]
        },
      },
    ],
  },
  {
    id: 'emissaire-troie',
    emoji: '🏰',
    titre: 'L’émissaire de Troie',
    texte:
      'Un char aux chevaux blancs porte les couleurs de Priam. L’émissaire s’incline : « Hector, dompteur de chevaux, requiert des lances pour la sortie de demain. Troie saura s’en souvenir. »',
    condition: (s) => armee(s) >= 3,
    weight: 7,
    cooldown: 10 * 60_000,
    choices: [
      {
        label: 'Envoyer 3 soldats',
        requiert: (s) => armee(s) >= 3,
        requiertLabel: '3 soldats requis',
        apply: (ctx) => {
          ctx.loseSoldiers(3)
          ctx.relation('ares', 12)
          ctx.relation('zeus', 6)
          ctx.schedule('butin-troie', 8 * 60_000)
          return [
            'Trois des vôtres partent au pas de course derrière le char. Au loin, les trompes de Troie sonnent le rassemblement. (Arès +12, Zeus +6 — Troie partagera le butin.)',
          ]
        },
      },
      {
        label: 'Garder ses forces',
        apply: (ctx) => {
          ctx.relation('ares', -6)
          return ['L’émissaire repart sans un mot. On ne compte pas les absents dans les chants de victoire. (Arès −6)']
        },
      },
    ],
  },
  {
    id: 'loups-mont-ida',
    emoji: '🐺',
    titre: 'Les loups du mont Ida',
    texte:
      'Des bergers accourent, blêmes : une meute descendue de la montagne rôde autour des enclos. Trois brebis ont déjà été emportées.',
    weight: 8,
    cooldown: 7 * 60_000,
    choices: [
      {
        label: 'Organiser une battue',
        requiert: (s) => armee(s) >= 2,
        requiertLabel: '2 soldats requis',
        apply: (ctx, roll) => {
          if (roll < 0.8) {
            ctx.add('grain', 35)
            ctx.morale(3, 'La meute est chassée', 6 * 60_000)
            return ['Les lances font mouche : la meute décimée regagne la montagne, et le gibier garnit les tables. (+35 grain)']
          }
          const morts = ctx.loseSoldiers(1)
          ctx.morale(-3, 'Un chasseur tombé', 6 * 60_000)
          return [
            `La battue tourne mal dans un ravin embrumé : ${morts} lancier ne rentre pas. La meute, elle, ne reviendra pas non plus.`,
          ]
        },
      },
      {
        label: 'Barricader les enclos',
        apply: (ctx) => {
          ctx.add('grain', -40)
          ctx.morale(-3, 'Troupeaux égorgés', 6 * 60_000)
          return ['Les loups festoient trois nuits durant avant de repartir. (−40 grain)']
        },
      },
    ],
  },
  {
    id: 'jeux-funebres',
    emoji: '🏆',
    titre: 'Jeux funèbres',
    texte:
      'Un héros allié est tombé sous les murs de Troie. Sa famille demande que votre village accueille les jeux funèbres : course de chars, lutte, lancer de javelot.',
    weight: 6,
    cooldown: 12 * 60_000,
    choices: [
      {
        label: 'Accueillir les jeux (−50 🌾, −20 🥉)',
        cout: { grain: 50, bronze: 20 },
        apply: (ctx) => {
          ctx.morale(12, 'Gloire des jeux funèbres', 12 * 60_000)
          ctx.relation('ares', 6)
          ctx.relation('zeus', 6)
          return [
            'Poussière des chars, cris des parieurs, larmes et gloire mêlées : vos jeux honorent le mort comme à Olympie. (Ambiance +12, Arès +6, Zeus +6)',
          ]
        },
      },
      {
        label: 'Refuser',
        apply: (ctx) => {
          ctx.relation('ares', -5)
          return ['La dépouille poursuivra sa route vers un autre bûcher. (Arès −5)']
        },
      },
    ],
  },
  // ── Crises (priorité) ──────────────────────────────────────────────────────
  {
    id: 'mutinerie',
    emoji: '🔥',
    titre: 'MUTINERIE !',
    texte:
      'Le mécontentement a tourné à l’émeute : une foule armée de faux et de torches se masse devant l’agora. « Du pain ! Des murs ! Un chef digne de ce nom ! »',
    condition: (s) => s.morale < 25 && s.pop >= 5,
    weight: 30,
    cooldown: 6 * 60_000,
    priorite: true,
    choices: [
      {
        label: 'Ouvrir les greniers (−150 🌾)',
        cout: { grain: 150 },
        apply: (ctx) => {
          ctx.morale(15, 'Les greniers ont parlé', 10 * 60_000)
          return ['Le grain distribué éteint les torches une à une. On vous acclame — pour cette fois. (Ambiance +15)']
        },
      },
      {
        label: 'Promettre des jours meilleurs',
        apply: (ctx) => {
          ctx.morale(8, 'Promesses du chef', 5 * 60_000)
          ctx.schedule('promesse-mutins', 5 * 60_000)
          return [
            'Votre discours calme la foule… pour l’instant. Si l’ambiance ne s’améliore pas vite, ils reviendront — et pas pour parler.',
          ]
        },
      },
      {
        label: 'Réprimer par la force',
        requiert: (s) => armee(s) >= 3,
        requiertLabel: '3 soldats requis',
        apply: (ctx) => {
          ctx.pop(-2)
          ctx.morale(-10, 'Répression sanglante', 10 * 60_000)
          ctx.relation('ares', 6)
          ctx.relation('zeus', -8)
          return [
            'Les lances dispersent la foule. Deux meneurs sont bannis. L’ordre règne — un ordre de cendres. (Population −2, Arès +6, Zeus −8)',
          ]
        },
      },
    ],
  },
  {
    id: 'colere-zeus',
    emoji: '⛈️',
    titre: 'La colère de Zeus',
    texte:
      'Des nuages noirs comme la poix s’amoncellent au-dessus du village. Le tonnerre roule sans pluie : le Tonnant réclame son dû.',
    condition: (s) => s.gods.zeus.relation <= -40,
    weight: 25,
    cooldown: 10 * 60_000,
    priorite: true,
    choices: [
      {
        label: 'Grande offrande (−80 🌾)',
        cout: { grain: 80 },
        apply: (ctx) => {
          ctx.relation('zeus', 25)
          return ['La fumée du sacrifice monte droit : Zeus retient sa foudre. (Zeus +25)']
        },
      },
      {
        label: 'Subir l’orage',
        apply: (ctx) => {
          const vol = ctx.stealPct(0.25, ['bois', 'grain'])
          ctx.morale(-8, 'L’orage de Zeus', 8 * 60_000)
          ctx.relation('zeus', 10)
          return [`La foudre embrase greniers et charpentes. Perdu : ${vol}. La dette est payée — dans les flammes.`]
        },
      },
    ],
  },
  {
    id: 'colere-poseidon',
    emoji: '🌊',
    titre: 'L’Ébranleur du sol gronde',
    texte: 'Les chiens hurlent, l’eau des puits tremble. Poséidon, qu’on a offensé, caresse les fondations du village de son trident.',
    condition: (s) => s.gods.poseidon.relation <= -40,
    weight: 25,
    cooldown: 10 * 60_000,
    priorite: true,
    choices: [
      {
        label: 'Apaiser la mer (−60 🌾, −20 🥉)',
        cout: { grain: 60, bronze: 20 },
        apply: (ctx) => {
          ctx.relation('poseidon', 25)
          return ['Un taureau noir est offert aux flots. La terre se rendort. (Poséidon +25)']
        },
      },
      {
        label: 'Subir le séisme',
        apply: (ctx) => {
          ctx.damageWallPct(0.4)
          ctx.morale(-6, 'Séisme', 8 * 60_000)
          ctx.relation('poseidon', 10)
          return ['Le sol ondule comme une mer : les remparts se lézardent (−40 % de structure). La dette est payée — dans la pierre.']
        },
      },
    ],
  },
  {
    id: 'colere-athena',
    emoji: '🦉',
    titre: 'Athéna détourne le regard',
    texte:
      'Les décisions du conseil tournent à la querelle, les artisans gâchent leurs ouvrages, deux familles s’entre-déchirent pour un mur mitoyen. La déesse de la sagesse a retiré sa main.',
    condition: (s) => s.gods.athena.relation <= -40,
    weight: 25,
    cooldown: 10 * 60_000,
    priorite: true,
    choices: [
      {
        label: 'Offrande d’armes ciselées (−40 🥉)',
        cout: { bronze: 40 },
        apply: (ctx) => {
          ctx.relation('athena', 25)
          return ['Un bouclier gravé de chouettes est suspendu au temple. La concorde revient au conseil. (Athéna +25)']
        },
      },
      {
        label: 'Laisser la discorde courir',
        apply: (ctx) => {
          ctx.morale(-15, 'Discorde dans le village', 10 * 60_000)
          ctx.relation('athena', 10)
          return ['Les querelles empoisonnent chaque veillée. (Ambiance −15)']
        },
      },
    ],
  },
  {
    id: 'colere-ares',
    emoji: '🐗',
    titre: 'Arès sème la zizanie',
    texte:
      'Dans la caserne, les rixes éclatent pour un regard. Le dieu de la guerre, vexé, souffle la violence dans le cœur de vos soldats — ou leur murmure de partir vendre leur lance ailleurs.',
    condition: (s) => s.gods.ares.relation <= -40 && armee(s) >= 2,
    weight: 25,
    cooldown: 10 * 60_000,
    priorite: true,
    choices: [
      {
        label: 'Payer une solde d’honneur (−50 🥉)',
        cout: { bronze: 50 },
        apply: (ctx) => {
          ctx.relation('ares', 25)
          return ['Le bronze sonnant calme les esprits — Arès aime qu’on paie le prix du sang. (Arès +25)']
        },
      },
      {
        label: 'Laisser faire',
        apply: (ctx) => {
          const n = ctx.loseSoldiers(2)
          ctx.morale(-5, 'Désertions', 8 * 60_000)
          ctx.relation('ares', 10)
          return [`${n} soldat(s) franchissent la porte de nuit, baluchon sur la lance. (Ambiance −5)`]
        },
      },
    ],
  },
]

export const EVENTS_BY_ID: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]))
