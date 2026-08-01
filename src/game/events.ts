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
// Issues multiples
//
// Un dilemme n'est un dilemme que si l'on ignore ce qu'il produira. Chaque
// option porte donc plusieurs issues pondérées, tirées au sort à l'ouverture.
// ─────────────────────────────────────────────────────────────────────────────

interface Issue {
  /** poids relatif dans le tirage — les catastrophes restent rares */
  p: number
  /** ce qu'Athéna murmure quand c'est CETTE issue qui est tirée */
  murmure?: string
  effet: (ctx: EffectCtx) => string[]
}

/**
 * Dérive un tirage propre à chaque option depuis le roll unique de l'instance.
 * Sans cela toutes les options basculeraient au même seuil, et il suffirait
 * d'en connaître une pour deviner le sort des autres.
 */
function tirage(roll: number, sel: number): number {
  let x = (Math.floor(roll * 0x7fffffff) ^ Math.imul(sel, 0x9e3779b9)) | 0
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d)
  x = Math.imul(x ^ (x >>> 12), 0x297a2d39)
  x ^= x >>> 15
  return (x >>> 0) / 0x100000000
}

/** graine tirée du libellé : deux options d'un même dilemme divergent d'office */
function graine(label: string): number {
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) | 0
  return h
}

/**
 * Fabrique une option à issues multiples. Le murmure d'Athéna est lu sur
 * l'issue déjà tirée : il ne peut structurellement pas mentir.
 */
function choix(o: {
  label: string
  cout?: Cost
  requiert?: (s: GameSnap) => boolean
  requiertLabel?: string
  issues: Issue[]
}): EventChoice {
  const total = o.issues.reduce((a, i) => a + i.p, 0)
  const sel = graine(o.label)
  const tirer = (roll: number): Issue => {
    let v = tirage(roll, sel) * total
    for (const i of o.issues) {
      v -= i.p
      if (v <= 0) return i
    }
    return o.issues[o.issues.length - 1]
  }
  return {
    label: o.label,
    cout: o.cout,
    requiert: o.requiert,
    requiertLabel: o.requiertLabel,
    hint: o.issues.some((i) => i.murmure) ? (roll) => tirer(roll).murmure ?? null : undefined,
    apply: (ctx, roll) => tirer(roll).effet(ctx),
  }
}

const MIN = 60_000

// ─────────────────────────────────────────────────────────────────────────────
export const EVENTS: EventDef[] = [
  // ── Xenia, hôtes et suppliants ─────────────────────────────────────────────
  {
    id: 'refugies-troyens',
    emoji: '🏺',
    titre: 'Réfugiés de la guerre',
    texte:
      'Une colonne de réfugiés se présente à vos portes : femmes, vieillards, quelques hommes en âge de porter la lance. Leurs villages ont brûlé sous les torches achéennes. Ils implorent l’asile au nom de Zeus Xenios, protecteur des suppliants.',
    weight: 10,
    cooldown: 6 * MIN,
    choices: [
      choix({
        label: 'Ouvrir grand les portes',
        issues: [
          {
            p: 4,
            murmure: '« Leurs mains sont calleuses du travail, pas du crime. Mais tes greniers vont maigrir. »',
            effet: (ctx) => {
              ctx.pop(4)
              ctx.add('grain', -50)
              ctx.relation('zeus', 10)
              ctx.morale(5, 'Hospitalité honorée', 10 * MIN)
              return [
                'Quatre familles s’installent contre le mur nord et se mettent au travail dès le lendemain.',
                'Zeus sourit à qui honore la xenia — mais quatre bouches de plus vident un grenier. (+4 population, −50 🌾, Zeus +10, ambiance +5)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« L’un d’eux réclamera une lance. Il te la rendra bien. »',
            effet: (ctx) => {
              ctx.pop(4)
              ctx.add('grain', -60)
              ctx.units('lancier', 1)
              ctx.relation('zeus', 8)
              ctx.morale(-3, 'Village surpeuplé', 6 * MIN)
              return [
                'Un jeune homme au visage brûlé demande une lance pour défendre son nouveau foyer. On la lui donne.',
                'Les ruelles sont trop étroites pour tant de monde, et les réserves fondent. (+4 population, +1 lancier, −60 🌾, Zeus +8, ambiance −3)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Ces hommes marchent en cadence. Ce sont des soldats, et ils comptent tes amphores. »',
            effet: (ctx) => {
              ctx.pop(4)
              ctx.add('grain', -40)
              ctx.relation('zeus', 10)
              ctx.schedule('trahison-refugies', 4 * MIN)
              return [
                'Les réfugiés s’installent parmi vous. Zeus a été honoré, la loi est sauve.',
                'Mais leurs regards mesurent les portes, et l’un d’eux compte les amphores en riant. (+4 population, −40 🌾, Zeus +10)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'N’accueillir que femmes et enfants (−30 🌾)',
        cout: { grain: 30 },
        issues: [
          {
            p: 6,
            murmure: '« Mesure prudente. Les hommes renvoyés iront pleurer ailleurs. »',
            effet: (ctx) => {
              ctx.pop(2)
              ctx.relation('zeus', 3)
              ctx.morale(3, 'Compassion mesurée', 8 * MIN)
              return [
                'Deux familles franchissent la porte ; les hommes valides sont refoulés vers la route de Thymbra.',
                'Le village approuve ce partage — Zeus, à demi. (+2 population, Zeus +3, ambiance +3)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Les hommes que tu renvoies dormiront dans les collines. Et ils ont faim. »',
            effet: (ctx) => {
              ctx.pop(2)
              ctx.relation('zeus', 3)
              const vol = ctx.stealPct(0.08, ['grain', 'bronze'])
              ctx.morale(-3, 'Rôdeurs dans les collines', 6 * MIN)
              return [
                'Les femmes entrent, les hommes campent dehors. Trois nuits plus tard, un hangar est fracturé.',
                `Perdu : ${vol}. On reconnaît, dit-on, le manteau d’un suppliant. (+2 population, Zeus +3)`,
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Refuser l’asile',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('zeus', -18)
              ctx.morale(-6, 'Loi de l’hospitalité brisée', 10 * MIN)
              return [
                'Les portes restent closes. La colonne s’éloigne sous la pluie, et un vieillard maudit votre toit.',
                'Vous avez brisé la loi de Zeus Xenios. Le Tonnant s’en souviendra. (Zeus −18, ambiance −6)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('zeus', -14)
              ctx.add('grain', 25)
              ctx.morale(-4, 'Portes closes', 8 * MIN)
              return [
                'Contre un seau d’eau passé par-dessus le mur, une mère vous laisse son dernier sac d’orge.',
                'Le marché est odieux, l’orge est bonne. (+25 🌾, Zeus −14, ambiance −4)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'mendiant-mysterieux',
    emoji: '🧙',
    titre: 'Le mendiant au seuil',
    texte:
      'Un vieil homme en haillons frappe à la porte de l’agora. Il demande du pain, du vin, et une place près du feu. Ses yeux, étrangement, semblent retenir des orages.',
    weight: 8,
    cooldown: 8 * MIN,
    choices: [
      choix({
        label: 'Le nourrir et le loger (−30 🌾)',
        cout: { grain: 30 },
        issues: [
          {
            p: 3,
            murmure: '« Regarde ses yeux : ce ne sont pas ceux d’un mortel. Sers-le comme un roi. »',
            effet: (ctx) => {
              ctx.relation('zeus', 15)
              ctx.faveur(30)
              ctx.morale(8, 'Un dieu a béni votre table', 12 * MIN)
              return [
                'Le vieillard mange, boit, puis se lève. Sa silhouette grandit, l’air sent la foudre — il disparaît dans un éclair.',
                'C’était le Tonnant, éprouvant votre hospitalité. (+30 ✨ faveur, Zeus +15, ambiance +8)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Un vagabond, rien de plus. Mais la xenia vaut aussi pour les riens. »',
            effet: (ctx) => {
              ctx.relation('zeus', 9)
              ctx.morale(4, 'Veillée de contes', 8 * MIN)
              return [
                'Trois nuits durant, l’étranger paie son pain de récits : Thèbes, la Colchide, les monstres de l’Ouest.',
                'Il repart au matin sans laisser son nom. (Zeus +9, ambiance +4)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Compte tes fibules après son départ. La loi est sauve, ton coffre non. »',
            effet: (ctx) => {
              ctx.relation('zeus', 8)
              const vol = ctx.stealPct(0.07, ['bronze'])
              ctx.morale(-2, 'Un hôte voleur', 5 * MIN)
              return [
                'Au matin, l’hôte a disparu — et avec lui ce qui traînait de métal.',
                `Perdu : ${vol}. Zeus n’en a pas moins vu votre table ouverte. (Zeus +8)`,
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Le confier aux prêtres (−12 ✨ faveur, −15 🌾)',
        cout: { grain: 15 },
        requiert: (s) => s.buildings.temple.level >= 1,
        requiertLabel: 'temple requis',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.faveur(-12)
              ctx.relation('zeus', 12)
              ctx.morale(2, 'Le temple a fait son office', 6 * MIN)
              return [
                'Les prêtres le lavent, le nourrissent et l’installent sous le portique.',
                'La faveur dépensée en huile et en pain vaut mieux qu’un serment. (−12 ✨, Zeus +12)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.faveur(-12)
              ctx.relation('zeus', 10)
              ctx.relation('athena', 8)
              return [
                'Le vieillard, une fois lavé, se révèle savant : il corrige le calendrier des fêtes et l’orientation de l’autel.',
                'Athéna aime les hôtes qui apprennent quelque chose à leurs hôtes. (−12 ✨, Zeus +10, Athéna +8)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Le chasser',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('zeus', -20)
              ctx.morale(-3, 'Un suppliant chassé', 8 * MIN)
              const vol = ctx.stealPct(0.05, ['grain'])
              return [
                'On repousse le vieillard à coups de bâton. Cette nuit-là, des rats envahissent les greniers…',
                `Perdu : ${vol}. (Zeus −20, ambiance −3)`,
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('zeus', -20)
              ctx.relation('athena', -6)
              ctx.morale(-6, 'La malédiction du mendiant', 8 * MIN)
              return [
                'Depuis le seuil, le vieil homme énumère à voix haute vos morts à venir, puis s’en va en riant.',
                'Personne ne dort bien pendant huit jours. (Zeus −20, Athéna −6, ambiance −6)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'esclave-fugitif',
    emoji: '⛓️',
    titre: 'L’homme aux poignets marqués',
    texte:
      'Un jeune homme se jette à vos genoux au milieu de l’agora. Ses poignets portent la trace des liens : il a fui le camp achéen où il portait l’eau. Il jure travailler mieux qu’un bœuf si on le cache.',
    weight: 6,
    cooldown: 11 * MIN,
    choices: [
      choix({
        label: 'Le cacher chez vous',
        issues: [
          {
            p: 5,
            murmure: '« Son maître viendra jusqu’à ta porte. Il faudra acheter son silence. »',
            effet: (ctx) => {
              ctx.pop(1)
              ctx.relation('zeus', 10)
              ctx.add('bronze', -30)
              ctx.morale(3, 'Un suppliant protégé', 6 * MIN)
              return [
                'Le fugitif dort dans la réserve à grain et travaille comme dix.',
                'Trois jours après, un intendant achéen le cherche : trente lingots achètent sa mauvaise vue. (+1 population, −30 🪙, Zeus +10)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Personne ne viendra le réclamer. Le camp a d’autres soucis que ses porteurs d’eau. »',
            effet: (ctx) => {
              ctx.pop(1)
              ctx.relation('zeus', 12)
              ctx.morale(6, 'Un homme rendu à lui-même', 10 * MIN)
              return [
                'Nul ne vient. Au bout d’un mois, le garçon coupe ses cheveux d’esclave et prend un nom grec.',
                'Le village a le sentiment d’avoir fait quelque chose de juste. (+1 population, Zeus +12, ambiance +6)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Son maître n’aime pas payer deux fois. Il viendra avec des lances. »',
            effet: (ctx) => {
              ctx.pop(1)
              ctx.relation('zeus', 12)
              const morts = ctx.loseSoldiers(1)
              const vol = ctx.stealPct(0.1, ['bronze', 'grain'])
              ctx.morale(-6, 'Représailles achéennes', 8 * MIN)
              return [
                'Le maître revient avec six mercenaires cariens et fouille le village de fond en comble.',
                `Ils repartent sans le fugitif mais avec ${vol}${morts ? `, et ${morts} des vôtres reste au sol` : ''}. (+1 population, Zeus +12)`,
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Le rendre contre récompense',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.add('bronze', 45)
              ctx.relation('zeus', -16)
              ctx.morale(-6, 'Un suppliant livré', 8 * MIN)
              return [
                'On le rend lié. L’intendant paie sans un mot et note votre nom sur une tablette.',
                'Le village regarde ailleurs. (+45 🪙, Zeus −16, ambiance −6)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.add('bronze', 60)
              ctx.relation('zeus', -20)
              ctx.relation('athena', -5)
              ctx.morale(-9, 'La honte du marché', 10 * MIN)
              return [
                'L’intendant surenchérit : le garçon savait lire les comptes du camp, il valait cher.',
                'Le prix reçu est excellent ; l’odeur qu’il laisse, moins. (+60 🪙, Zeus −20, Athéna −5, ambiance −9)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Le laisser repartir sur la route',
        issues: [
          {
            p: 1,
            effet: (ctx) => {
              ctx.relation('zeus', -4)
              ctx.morale(-2, 'Ni gîte ni chaînes', 4 * MIN)
              return [
                'On lui donne une outre d’eau et un signe vers le sud. Il disparaît entre les oliviers.',
                'Ni hôte, ni marchandise : les dieux n’ont pas de nom pour cela. (Zeus −4, ambiance −2)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'aede-de-passage',
    emoji: '🎼',
    titre: 'L’aède aveugle',
    texte:
      'Un chanteur aveugle, lyre à l’épaule, s’assied sur les marches de l’agora. Il offre trois nuits de chants — la colère d’Achille, le retour d’un homme rusé — contre le toit et la table.',
    weight: 8,
    cooldown: 8 * MIN,
    choices: [
      choix({
        label: 'L’accueillir trois nuits (−35 🌾)',
        cout: { grain: 35 },
        issues: [
          {
            p: 5,
            murmure: '« Il chante bien. Ton village s’endormira moins lourd. »',
            effet: (ctx) => {
              ctx.morale(10, 'Les chants de l’aède', 12 * MIN)
              ctx.relation('athena', 5)
              return [
                'Trois nuits durant, plus personne ne parle des morts ni des vagues à venir : on écoute.',
                'Il repart vers Chios en refusant qu’on le raccompagne. (Ambiance +10, Athéna +5)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Il chantera TON nom. On viendra pour le vérifier — le bon monde et le mauvais. »',
            effet: (ctx) => {
              ctx.morale(8, 'Notre nom dans les chants', 12 * MIN)
              ctx.pop(2)
              ctx.add('grain', -25)
              ctx.relation('athena', 4)
              return [
                'L’aède glisse votre nom dans le catalogue des chefs. Deux semaines plus tard, deux familles arrivent « au village dont on chante les murs ».',
                'La renommée nourrit l’orgueil, pas les greniers. (+2 population, −25 🌾, ambiance +8, Athéna +4)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Cet homme n’est pas aveugle et ne connaît que deux chants. Tu paies du vent. »',
            effet: (ctx) => {
              ctx.morale(-4, 'L’aède imposteur', 6 * MIN)
              ctx.relation('athena', -3)
              return [
                'Au deuxième soir, le bandeau glisse : l’homme voit fort bien, et sa lyre n’a que quatre cordes.',
                'On le met dehors sous les quolibets ; le grain, lui, est mangé. (Ambiance −4, Athéna −3)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Lui commander la geste de vos ancêtres (−15 🪙)',
        cout: { bronze: 15 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.morale(6, 'La geste des ancêtres', 10 * MIN)
              ctx.relation('zeus', 4)
              return [
                'L’aède invente à votre lignée un aïeul fils de nymphe et une victoire sur des géants.',
                'Personne n’y croit tout à fait ; tout le monde en est fier. (Ambiance +6, Zeus +4)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.morale(-5, 'La généalogie moqueuse', 8 * MIN)
              ctx.relation('zeus', -4)
              return [
                'Trop payé, l’aède en fait trop : votre grand-père y devient bouvier d’un roi qu’il aurait volé.',
                'La place a ri jusqu’aux larmes. Elle rira encore longtemps. (Ambiance −5, Zeus −4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Le renvoyer à la route',
        issues: [
          {
            p: 1,
            effet: (ctx) => {
              ctx.morale(-2, 'Un chanteur renvoyé', 4 * MIN)
              ctx.relation('athena', -3)
              return ['Il ramasse sa lyre sans un mot. « Les villages qu’on ne chante pas, on les oublie. » (Ambiance −2, Athéna −3)']
            },
          },
        ],
      }),
    ],
  },

  // ── Serments, sang et justice ──────────────────────────────────────────────
  {
    id: 'dette-de-sang',
    emoji: '🩸',
    titre: 'Dette de sang',
    texte:
      'Pour une borne déplacée de trois pieds, Théron a ouvert le crâne de son voisin. Les deux familles sont sorties armées de faux et se font face devant l’agora. On attend votre parole.',
    condition: (s) => s.pop >= 8,
    weight: 6,
    cooldown: 11 * MIN,
    choices: [
      choix({
        label: 'Imposer le prix du sang (−40 🪙 du trésor)',
        cout: { bronze: 40 },
        issues: [
          {
            p: 6,
            murmure: '« Le métal éteindra le fer. C’est ainsi qu’on gouverne. »',
            effet: (ctx) => {
              ctx.morale(8, 'Justice rendue', 10 * MIN)
              ctx.relation('zeus', 10)
              ctx.relation('athena', 6)
              return [
                'Le trésor du village paie la moitié, le meurtrier le reste. Les faux retournent aux hangars.',
                'Zeus, qui juge les serments, approuve qu’on ait tenu la balance. (Ambiance +8, Zeus +10, Athéna +6)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Ils prendront ton bronze. Ils ne pardonneront pas pour autant. »',
            effet: (ctx) => {
              ctx.relation('zeus', 6)
              ctx.morale(2, 'Paix achetée', 4 * MIN)
              ctx.morale(-6, 'Vendetta étouffée', 9 * MIN)
              return [
                'La famille du mort accepte le bronze en public et jure la vengeance en privé.',
                'Chaque veillée devient un calcul : qui sort, qui rentre, qui aiguise. (Zeus +6)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Bannir le meurtrier',
        issues: [
          {
            p: 6,
            murmure: '« Bannis-le. Le village respirera, et les dieux avec lui. »',
            effet: (ctx) => {
              ctx.pop(-1)
              ctx.morale(5, 'Le sang lavé par l’exil', 10 * MIN)
              ctx.relation('zeus', 8)
              ctx.relation('athena', 5)
              return [
                'Théron part avant l’aube, pieds nus, sans une lance. La coutume est respectée.',
                'Un bras de moins aux champs, une nuit de sommeil de plus pour tous. (Population −1, Zeus +8, Athéna +5)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Son clan ne te le pardonnera pas. Et lui, il trouvera des amis dans les collines. »',
            effet: (ctx) => {
              ctx.pop(-1)
              ctx.morale(-5, 'Un clan humilié', 9 * MIN)
              ctx.relation('ares', 5)
              return [
                'Théron s’en va — vers les collines, où l’on dit que des hommes sans village s’arment.',
                'Sa mère crache devant votre porte chaque matin. (Population −1, Arès +5, ambiance −5)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Laisser la vengeance suivre son cours',
        issues: [
          {
            p: 5,
            effet: (ctx) => {
              ctx.pop(-2)
              ctx.morale(-10, 'Sang sur l’agora', 10 * MIN)
              ctx.relation('ares', 12)
              return [
                'La nuit tranche mieux qu’un chef : deux corps au matin, et un silence de pierre.',
                'Arès seul est content. (Population −2, Arès +12, ambiance −10)',
              ]
            },
          },
          {
            p: 5,
            effet: (ctx) => {
              ctx.pop(-1)
              ctx.add('grain', -40)
              ctx.morale(-6, 'Une famille en fuite', 8 * MIN)
              ctx.relation('ares', 8)
              return [
                'La famille du meurtrier quitte le village avant la vengeance, chariot chargé de ce qu’elle peut.',
                'Y compris de sa part de grain. (Population −1, −40 🌾, Arès +8, ambiance −6)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'dispute-heritage',
    emoji: '⚖️',
    titre: 'L’oliveraie du père',
    texte:
      'Le vieux Kléobis est mort sans partager. Ses deux fils réclament l’oliveraie entière, chacun jurant sur l’autel que le père le lui a promise. L’un des deux est un parjure.',
    condition: (s) => s.pop >= 8,
    weight: 7,
    cooldown: 10 * MIN,
    choices: [
      choix({
        label: 'Partager le champ en deux',
        issues: [
          {
            p: 6,
            murmure: '« Deux petits champs valent moins qu’un grand, mais deux frères vivants valent plus. »',
            effet: (ctx) => {
              ctx.relation('athena', 8)
              ctx.morale(5, 'Partage équitable', 9 * MIN)
              ctx.add('grain', -30)
              return [
                'On plante une borne nouvelle au milieu des oliviers, sous les yeux de tout le village.',
                'La saison sera maigre : on a piétiné pour mesurer, et chacun bêche pour soi. (−30 🌾, Athéna +8, ambiance +5)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Ta borne ne tiendra pas l’hiver. Ils la déplaceront chacun d’un pied par nuit. »',
            effet: (ctx) => {
              ctx.relation('athena', 4)
              ctx.morale(-4, 'Querelle qui traîne', 8 * MIN)
              ctx.add('grain', -20)
              return [
                'La borne bouge la nuit, dans les deux sens. Le conseil s’en occupe à chaque veillée.',
                'On finira par en reparler, la faux à la main. (−20 🌾, Athéna +4, ambiance −4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Tout à l’aîné, selon la coutume',
        issues: [
          {
            p: 6,
            murmure: '« Le cadet partira. Ta coutume te coûtera deux paires de bras. »',
            effet: (ctx) => {
              ctx.relation('zeus', 8)
              ctx.pop(-2)
              ctx.morale(2, 'La coutume respectée', 6 * MIN)
              return [
                'L’aîné hérite. Le cadet charge sa femme et son fils sur une mule et s’en va vers la côte.',
                'La coutume tient, le village maigrit. (Population −2, Zeus +8)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Le cadet n’a plus de champ ? Alors il voudra une lance. »',
            effet: (ctx) => {
              ctx.relation('zeus', 8)
              ctx.pop(-1)
              ctx.units('lancier', 1)
              ctx.morale(-2, 'Un frère dépossédé', 6 * MIN)
              return [
                'Dépossédé, le cadet se présente à la caserne le soir même : « Je n’ai plus d’oliviers, donnez-moi du fer. »',
                'Il fait un lancier hargneux. (Population −1, +1 lancier, Zeus +8)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Trancher par l’épreuve de lutte',
        issues: [
          {
            p: 5,
            murmure: '« Les hommes aiment cela. Personne ne mourra aujourd’hui. »',
            effet: (ctx) => {
              ctx.relation('ares', 8)
              ctx.morale(6, 'L’épreuve de lutte', 8 * MIN)
              return [
                'Trois prises, poussière et sable ; l’aîné plie l’échine, le cadet emporte l’oliveraie et l’estime générale.',
                'Le village a eu son spectacle et sa justice. (Arès +8, ambiance +6)',
              ]
            },
          },
          {
            p: 5,
            murmure: '« L’un des deux ne se relèvera pas droit. Le sang appelle le sang. »',
            effet: (ctx) => {
              ctx.relation('ares', 10)
              ctx.pop(-1)
              ctx.morale(-7, 'L’épreuve a mal tourné', 9 * MIN)
              return [
                'La prise tourne mal : la nuque de l’aîné craque dans un bruit que personne n’oubliera.',
                'Le cadet hérite d’un champ et d’un fantôme. (Population −1, Arès +10, ambiance −7)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'sentinelle-endormie',
    emoji: '😴',
    titre: 'La sentinelle endormie',
    texte:
      'On a trouvé Kléitos ronflant contre la palissade, l’outre vide à ses pieds, au tour de garde le plus dangereux de la nuit. Toute la garnison attend de voir ce que vaut votre discipline.',
    condition: (s) => armee(s) >= 2 && s.threat >= 20,
    weight: 7,
    cooldown: 8 * MIN,
    choices: [
      choix({
        label: 'Le châtier devant la garnison',
        issues: [
          {
            p: 6,
            murmure: '« Frappe. La troupe le racontera à voix basse, et veillera. »',
            effet: (ctx) => {
              ctx.relation('ares', 8)
              ctx.morale(-5, 'Discipline de fer', 7 * MIN)
              return [
                'Vingt coups de hampe devant les rangs. Personne ne dort plus au mur nord.',
                'Personne ne rit non plus. (Arès +8, ambiance −5)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Tu frapperas trop fort. Il ne restera pas pour s’en souvenir. »',
            effet: (ctx) => {
              ctx.relation('ares', 6)
              ctx.pop(-1)
              ctx.morale(-8, 'Un homme brisé', 9 * MIN)
              return [
                'Kléitos ne se relève pas de la correction. Au matin, il a quitté le village en boitant.',
                'La garnison veille, mais regarde son chef autrement. (Population −1, Arès +6, ambiance −8)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Fermer les yeux',
        issues: [
          {
            p: 5,
            murmure: '« Cette nuit-là, personne n’est venu. Tu as de la chance, pas de la sagesse. »',
            effet: (ctx) => {
              ctx.morale(5, 'Un chef indulgent', 8 * MIN)
              ctx.relation('ares', -6)
              return [
                'On ramène Kléitos chez lui sans bruit. La troupe apprécie qu’on n’humilie pas un des siens.',
                'Arès crache devant tant de mollesse. (Ambiance +5, Arès −6)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Des mains ont profité du trou dans ta garde. Compte tes réserves. »',
            effet: (ctx) => {
              ctx.morale(3, 'Un chef indulgent', 6 * MIN)
              ctx.relation('ares', -6)
              const vol = ctx.stealPct(0.1, ['grain', 'bronze'])
              ctx.morale(-5, 'Le vol de la nuit', 7 * MIN)
              return [
                'La troupe vous aime — et des rôdeurs ont visité la réserve pendant que Kléitos rêvait.',
                `Perdu : ${vol}. (Arès −6)`,
              ]
            },
          },
          {
            p: 2,
            murmure: '« On a descellé des pierres pendant son sommeil. Va voir le mur avant l’assaut. »',
            effet: (ctx) => {
              ctx.morale(4, 'Un chef indulgent', 6 * MIN)
              ctx.relation('ares', -8)
              ctx.damageWallPct(0.08)
              return [
                'Au matin, on découvre douze pierres descellées au pied du mur, et des traces de pieds nus.',
                'Quelqu’un a préparé une entrée. (Remparts −8 %, Arès −8)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Doubler les tours de garde',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.morale(-4, 'Nuits sans sommeil', 8 * MIN)
              ctx.revealAttack()
              return [
                'Deux hommes par créneau, une nuit sur deux. La troupe titube — mais les guetteurs voient loin.',
                'On a repéré la colonne qui vient : sa venue est portée au bandeau d’alerte. (Ambiance −4)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.morale(-6, 'Garde harassée', 9 * MIN)
              ctx.relation('ares', 5)
              ctx.revealAttack()
              return [
                'Trois nuits de veille double épuisent la garnison, qui grogne — puis repère des feux à l’est.',
                'Arès aime les hommes qui dorment en armes. La prochaine attaque est révélée. (Ambiance −6, Arès +5)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'mariage',
    emoji: '💍',
    titre: 'Deux jeunes gens',
    texte:
      'Myrrhinè et Nikandros veulent s’unir. La coutume exige une dot, un bœuf, et trois jours de festin où l’on chante l’hyménée jusqu’à l’enrouement.',
    condition: (s) => s.pop >= 6,
    weight: 7,
    cooldown: 9 * MIN,
    choices: [
      choix({
        label: 'Doter le couple (−50 🌾, −20 🪙)',
        cout: { grain: 50, bronze: 20 },
        issues: [
          {
            p: 5,
            murmure: '« Cette maison sera pleine. Ton grain est bien placé. »',
            effet: (ctx) => {
              ctx.pop(2)
              ctx.morale(8, 'Noces du village', 10 * MIN)
              return [
                'On porte la mariée en char à travers l’agora sous une pluie de figues sèches.',
                'Deux familles s’allient, et deux bras de plus arrivent avec la dot. (+2 population, ambiance +8)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« La famille de la fille amènera un troupeau. Tu récupéreras ta dot au double. »',
            effet: (ctx) => {
              ctx.pop(3)
              ctx.add('grain', 40)
              ctx.morale(10, 'Grandes noces', 12 * MIN)
              ctx.relation('zeus', 5)
              return [
                'Le père de la mariée, flatté d’être traité en roi, amène quatre chèvres et son frère cadet.',
                'Zeus Téleios, gardien des mariages, honore les serments tenus. (+3 population, +40 🌾, Zeus +5, ambiance +10)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Le garçon était promis ailleurs. Tu as doté un parjure. »',
            effet: (ctx) => {
              ctx.pop(1)
              ctx.morale(-5, 'Serment de mariage rompu', 9 * MIN)
              ctx.relation('zeus', -8)
              return [
                'Au troisième jour, une femme de Thymbra arrive : Nikandros lui était promis devant témoins.',
                'La fête s’achève en pugilat et le village porte un parjure. (+1 population, Zeus −8, ambiance −5)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Union sobre, sans festin',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.pop(1)
              ctx.morale(2, 'Noces discrètes', 6 * MIN)
              return [
                'Un serment devant l’autel, une galette partagée, et chacun retourne aux champs.',
                'C’est peu, c’est fait. (+1 population, ambiance +2)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.pop(1)
              ctx.morale(-4, 'Noces mesquines', 7 * MIN)
              return [
                'Les deux familles comptent les galettes et concluent que le chef les tient pour rien.',
                'On se marie quand même, en boudant. (+1 population, ambiance −4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Interdire l’union (le garçon est utile ailleurs)',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.morale(-8, 'Amants séparés', 10 * MIN)
              ctx.relation('zeus', -6)
              return [
                'Nikandros repart aux carrières, Myrrhinè à son métier à tisser. Ils ne se regardent plus.',
                'Le village trouve cela dur, et le dit. (Zeus −6, ambiance −8)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.pop(-2)
              ctx.morale(-6, 'Les amants en fuite', 9 * MIN)
              ctx.relation('zeus', -8)
              return [
                'Ils partent ensemble dans la nuit, avec une outre et une couverture.',
                'On retrouve leurs traces sur la route de la mer. (Population −2, Zeus −8, ambiance −6)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'funerailles-ancien',
    emoji: '⚱️',
    titre: 'Le dernier des fondateurs',
    texte:
      'Le vieil Hégias s’est éteint. Il se souvenait du jour où l’on a planté le premier piquet du village. Reste à savoir quels honneurs on rend à une mémoire.',
    weight: 6,
    cooldown: 10 * MIN,
    choices: [
      choix({
        label: 'Bûcher digne d’un héros (−70 🪵)',
        cout: { bois: 70 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.morale(10, 'Funérailles héroïques', 11 * MIN)
              ctx.relation('zeus', 8)
              return [
                'Le bûcher monte plus haut qu’un toit. On verse le vin, on jette des mèches de cheveux.',
                'Chacun songe qu’il sera peut-être honoré ainsi. (Ambiance +10, Zeus +8)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.morale(12, 'Le présage du bûcher', 12 * MIN)
              ctx.relation('zeus', 10)
              ctx.faveur(12)
              return [
                'La fumée monte droite comme une colonne, sans un souffle pour la coucher : les dieux ont pris leur part.',
                'On enterre les cendres sous un tumulus qui portera son nom. (Ambiance +12, Zeus +10, +12 ✨)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Tombeau de pierre (−80 🪨)',
        cout: { pierre: 80 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.morale(8, 'Tombeau des fondateurs', 11 * MIN)
              ctx.relation('poseidon', 6)
              ctx.relation('athena', 4)
              return [
                'Une chambre de dalles, un couloir, un seuil : les tailleurs y mettent tout leur art.',
                'Ces pierres-là n’iront pas au rempart. (Ambiance +8, Poséidon +6, Athéna +4)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.morale(9, 'Le tombeau qui veille', 12 * MIN)
              ctx.relation('athena', 7)
              ctx.add('bronze', 15)
              return [
                'En creusant, on trouve dans l’ancienne fosse une pointe de lance de bronze vert-de-gris, du temps de la fondation.',
                'On la scelle dans le mur du tombeau — après en avoir fondu la moitié. (+15 🪙, Athéna +7, ambiance +9)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'L’ensevelir sans rites',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('zeus', -12)
              ctx.morale(-8, 'Un mort sans honneurs', 10 * MIN)
              return [
                'Deux hommes, une fosse, aucune libation. Le village regarde faire sans un mot.',
                'On ne parlera plus d’Hégias. On parlera de vous. (Zeus −12, ambiance −8)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('zeus', -14)
              ctx.pop(-1)
              ctx.morale(-6, 'Le fils parti', 9 * MIN)
              return [
                'Le fils d’Hégias creuse seul la fosse de son père, puis prend la route sans se retourner.',
                'Il emporte les outils de son père. (Population −1, Zeus −14, ambiance −6)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'jeux-funebres',
    emoji: '🏆',
    titre: 'Jeux funèbres',
    texte:
      'Un héros allié est tombé sous les murs de Troie. Sa famille demande que votre village accueille les jeux funèbres : course de chars, lutte, lancer de javelot, et des prix dignes du mort.',
    weight: 6,
    cooldown: 12 * MIN,
    choices: [
      choix({
        label: 'Accueillir les jeux (−50 🌾, −20 🪙)',
        cout: { grain: 50, bronze: 20 },
        issues: [
          {
            p: 5,
            murmure: '« Poussière, cris et gloire. Rien de plus, rien de moins. »',
            effet: (ctx) => {
              ctx.morale(12, 'Gloire des jeux funèbres', 12 * MIN)
              ctx.relation('ares', 6)
              ctx.relation('zeus', 6)
              return [
                'Poussière des chars, cris des parieurs, larmes et gloire mêlées : vos jeux honorent le mort comme à Olympie.',
                '(Ambiance +12, Arès +6, Zeus +6)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Un vainqueur restera. Il vaut mieux qu’un prix de bronze. »',
            effet: (ctx) => {
              ctx.morale(14, 'Un champion parmi nous', 12 * MIN)
              ctx.relation('ares', 10)
              ctx.units('lancier', 1)
              return [
                'Un garçon de nulle part rafle la lutte et le javelot. Il demande à rester et à servir.',
                'On lui donne une lance et un toit. (+1 lancier, Arès +10, ambiance +14)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Un essieu va casser dans le tournant. Arès aura son sang. »',
            effet: (ctx) => {
              ctx.morale(4, 'Des jeux endeuillés', 8 * MIN)
              ctx.pop(-1)
              ctx.relation('ares', 12)
              return [
                'Au troisième tour, un char verse : le conducteur est traîné sur vingt pas par ses propres chevaux.',
                'Les jeux funèbres ont fait un mort de plus. Arès trouve cela juste. (Population −1, Arès +12, ambiance +4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Honneurs modestes (−20 🌾)',
        cout: { grain: 20 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.morale(4, 'Honneurs rendus', 7 * MIN)
              ctx.relation('zeus', 3)
              return ['Une course à pied, une libation, un chant. C’est peu pour un héros, mais c’est rendu. (Ambiance +4, Zeus +3)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.morale(1, 'Honneurs comptés', 5 * MIN)
              ctx.relation('ares', -4)
              return [
                'La famille du mort compte les prix, calcule, et repart en parlant de mesquinerie.',
                'Arès méprise les jeux sans casse. (Arès −4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Refuser',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('ares', -5)
              return ['La dépouille poursuivra sa route vers un autre bûcher, et un autre village aura la gloire. (Arès −5)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('ares', -5)
              ctx.relation('zeus', -5)
              ctx.morale(-4, 'Un héros éconduit', 7 * MIN)
              return [
                'On apprend trop tard que le mort était cousin de deux familles d’ici.',
                'Elles ne l’oublieront pas. (Arès −5, Zeus −5, ambiance −4)',
              ]
            },
          },
        ],
      }),
    ],
  },

  // ── Oracles, présages et rites ─────────────────────────────────────────────
  {
    id: 'oracle-errant',
    emoji: '🔮',
    titre: 'L’oracle errant',
    texte:
      'Une pythie voilée, chassée de Delphes dit-elle, s’installe sous le figuier de l’agora. Elle propose de lire pour vous la fumée et le vol des oiseaux — moyennant une offrande.',
    weight: 7,
    cooldown: 9 * MIN,
    choices: [
      choix({
        label: 'Offrir 40 🌾 pour les présages',
        cout: { grain: 40 },
        issues: [
          {
            p: 6,
            murmure: '« Sa science est réelle. Tu sauras quand les lances viendront. »',
            effet: (ctx) => {
              ctx.faveur(10)
              ctx.revealAttack()
              ctx.relation('athena', 4)
              return [
                'La pythie brûle du laurier et scrute la fumée : « Je vois des lances sur la route de l’est… je vois QUAND elles viendront. »',
                'La prochaine attaque est portée au bandeau d’alerte. (+10 ✨, Athéna +4)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Cette femme n’a jamais vu Delphes. Tu paies pour de la fumée. »',
            effet: (ctx) => {
              ctx.faveur(2)
              ctx.morale(-4, 'Bernés par une fausse pythie', 7 * MIN)
              ctx.relation('athena', -3)
              return [
                'Elle prophétise « un grand malheur ou un grand bonheur, selon », encaisse l’orge et disparaît avant l’aube.',
                'Les villageois ont compris avant vous. (+2 ✨, Athéna −3, ambiance −4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Exiger la prophétie sans offrande',
        issues: [
          {
            p: 5,
            murmure: '« Elle parlera, sous la menace. Les dieux, eux, retiendront la manière. »',
            effet: (ctx) => {
              ctx.revealAttack()
              ctx.relation('zeus', -8)
              ctx.relation('athena', -6)
              return [
                'Deux lanciers derrière elle, la pythie parle : la route, le jour, le nombre.',
                'On n’extorque pas les dieux sans qu’ils tiennent le compte. (Zeus −8, Athéna −6 — attaque révélée)',
              ]
            },
          },
          {
            p: 5,
            murmure: '« Elle se taira et te maudira. Tu n’auras rien que sa haine. »',
            effet: (ctx) => {
              ctx.relation('athena', -10)
              ctx.morale(-5, 'La malédiction de la pythie', 8 * MIN)
              return [
                'Elle serre les dents, se mord la langue jusqu’au sang et crache aux pieds du chef.',
                '« Tu sauras tout, un jour. Trop tard. » (Athéna −10, ambiance −5)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'L’éconduire',
        issues: [
          {
            p: 1,
            effet: (ctx) => {
              ctx.relation('athena', -4)
              return ['« Les aveugles volontaires sont les préférés des Moires », lance-t-elle en s’éloignant. (Athéna −4)']
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'augures-oiseaux',
    emoji: '🦅',
    titre: 'Le vol des grues',
    texte:
      'Un long vol de grues traverse le ciel, à main droite, en criant. Le prêtre veut immoler une bête et lire les entrailles ; les chasseurs, eux, regardent les oiseaux comme on regarde un rôti.',
    condition: (s) => s.buildings.temple.level >= 1,
    weight: 7,
    cooldown: 9 * MIN,
    choices: [
      choix({
        label: 'Faire lire les entrailles (−35 🌾)',
        cout: { grain: 35 },
        issues: [
          {
            p: 6,
            murmure: '« Le foie sera net. Ton prêtre y verra la route de l’ennemi. »',
            effet: (ctx) => {
              ctx.revealAttack()
              ctx.faveur(8)
              return [
                'Le foie est lisse et bien lobé : le prêtre y lit une colonne d’hommes et un jour précis.',
                'La prochaine attaque est révélée. (+8 ✨)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Le présage est mauvais. Tu sauras — et ton village aussi, hélas. »',
            effet: (ctx) => {
              ctx.revealAttack()
              ctx.faveur(8)
              ctx.morale(-6, 'Présage funeste', 8 * MIN)
              return [
                'Le foie est taché, la vésicule noire. Le prêtre blêmit et parle trop fort devant trop de monde.',
                'On sait quand ils viennent ; on n’en dort plus. (+8 ✨, ambiance −6 — attaque révélée)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Abattre les grues pour la marmite',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.add('grain', 25)
              ctx.relation('zeus', -10)
              ctx.morale(4, 'Rôti de grue', 7 * MIN)
              return [
                'Onze grues tombent sous les flèches. On mange de la viande à s’en graisser le menton.',
                'Le prêtre mange aussi, en silence. Zeus regarde. (+25 🌾, Zeus −10, ambiance +4)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.add('grain', 25)
              ctx.relation('zeus', -14)
              ctx.faveur(-10)
              ctx.morale(2, 'Rôti de grue', 5 * MIN)
              return [
                'On abat le vol tout entier — dont l’oiseau de tête, qui portait un anneau de bronze au pied.',
                'Un oiseau consacré. Le temple se vide de sa faveur. (+25 🌾, −10 ✨, Zeus −14)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Interdire qu’on tente les dieux',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('athena', -5)
              return ['Les grues passent, personne ne bouge. « Alors à quoi sert le temple ? » demande un enfant. (Athéna −5)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('athena', -5)
              ctx.morale(-4, 'Un présage négligé', 7 * MIN)
              return [
                'Le prêtre remet son couteau au fourreau devant tout le village et ne dit plus rien pendant huit jours.',
                'Son silence pèse plus que ses prophéties. (Athéna −5, ambiance −4)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'eclipse-de-lune',
    emoji: '🌘',
    titre: 'La lune saigne',
    texte:
      'La lune pleine se couvre lentement d’une ombre rousse. Les chiens hurlent, les femmes battent les chaudrons pour la défendre, et l’on parle de fin du monde sur la place.',
    weight: 5,
    cooldown: 13 * MIN,
    choices: [
      choix({
        label: 'Sacrifice immédiat (−45 🌾)',
        cout: { grain: 45 },
        issues: [
          {
            p: 5,
            effet: (ctx) => {
              ctx.faveur(12)
              ctx.morale(6, 'La lune rendue', 9 * MIN)
              return [
                'Le temps de brûler les cuisses grasses, l’ombre glisse et la lune revient, blanche.',
                'Chacun se persuade que c’est l’offrande qui l’a rendue. (+12 ✨, ambiance +6)',
              ]
            },
          },
          {
            p: 3,
            effet: (ctx) => {
              ctx.faveur(18)
              ctx.relation('zeus', 6)
              ctx.morale(8, 'Nuit de grâce', 11 * MIN)
              return [
                'La flamme part droite et la lune ressort exactement quand le prêtre lève les bras.',
                'On en parlera comme d’un prodige — et de vous comme du chef qui savait quoi faire. (+18 ✨, Zeus +6, ambiance +8)',
              ]
            },
          },
          {
            p: 2,
            effet: (ctx) => {
              ctx.morale(-5, 'Sacrifice manqué', 8 * MIN)
              ctx.relation('zeus', -6)
              return [
                'La génisse s’échappe, renverse l’autel, brise deux amphores et blesse un enfant avant qu’on l’égorge de travers.',
                'Un sacrifice manqué est pire que pas de sacrifice. (Zeus −6, ambiance −5)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Expliquer que l’ombre passera',
        requiert: (s) => s.gods.athena.relation >= 15,
        requiertLabel: 'faveur d’Athéna requise',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('athena', 10)
              ctx.morale(4, 'La sagesse du chef', 8 * MIN)
              return [
                'Vous tracez trois cercles dans la poussière : la terre, la lune, l’ombre. Puis vous attendez.',
                'La lune revient à l’heure dite. On vous regarde comme un devin. (Athéna +10, ambiance +4)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('athena', 8)
              ctx.relation('zeus', -5)
              ctx.morale(-4, 'Le chef qui savait trop', 8 * MIN)
              return [
                'La lune revient — mais on vous a entendu dire que les dieux n’y étaient pour rien.',
                'Les vieilles font le geste de conjurer quand vous passez. (Athéna +8, Zeus −5, ambiance −4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Laisser la nuit faire son affaire',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.morale(-6, 'Nuit de terreur', 8 * MIN)
              return ['Personne ne dort, tout le monde crie, et au matin chacun reproche au chef son absence. (Ambiance −6)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.morale(-10, 'Panique nocturne', 9 * MIN)
              ctx.add('grain', -30)
              return [
                'La foule affolée renverse deux jarres de semence et piétine un abri à grain.',
                'La lune est revenue. L’orge, non. (−30 🌾, ambiance −10)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'presage-cassandre',
    emoji: '👁️',
    titre: 'La femme qui hurle',
    texte:
      'Une femme aux cheveux défaits traverse l’agora en criant : « Vos murs sont déjà tombés ! Je vois le feu aux poutres, je vois vos fils tirés par les pieds ! » Les enfants lui jettent des pierres ; les vieux se détournent.',
    condition: (s) => s.threat >= 25,
    weight: 6,
    cooldown: 12 * MIN,
    choices: [
      choix({
        label: 'La croire et étayer la porte (−60 🪨)',
        cout: { pierre: 60 },
        issues: [
          {
            p: 6,
            murmure: '« Écoute-la. Ce qu’elle voit est vrai, et tu peux encore t’y préparer. »',
            effet: (ctx) => {
              ctx.revealAttack()
              ctx.relation('athena', 8)
              ctx.morale(-4, 'La peur s’installe', 7 * MIN)
              return [
                'On double le linteau de la porte et l’on veille. La femme montre du doigt la route de l’est, et l’on y voit de la poussière.',
                'La prochaine attaque est révélée — et le village a entendu la prophétie. (Athéna +8, ambiance −4)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Elle dit vrai, et ton village en tirera du courage plutôt que de la peur. »',
            effet: (ctx) => {
              ctx.revealAttack()
              ctx.relation('athena', 10)
              ctx.morale(3, 'Prêts au pire', 8 * MIN)
              return [
                'Les hommes travaillent la nuit à la lueur des torches. Personne ne se plaint : on préfère savoir.',
                'La prochaine attaque est révélée. (Athéna +10, ambiance +3)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'La faire taire',
        issues: [
          {
            p: 6,
            murmure: '« Tu auras le silence. Rien de plus, rien de moins. »',
            effet: (ctx) => {
              ctx.morale(4, 'Le silence retrouvé', 7 * MIN)
              ctx.relation('athena', -10)
              return [
                'On la chasse à coups de hampe jusqu’au-delà des enclos. La place respire.',
                'Athéna, qui aime ceux qui voient, se détourne. (Athéna −10, ambiance +4)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Elle disait vrai. Cette nuit, des mains vont éprouver ta muraille. »',
            effet: (ctx) => {
              ctx.morale(5, 'Le silence retrouvé', 6 * MIN)
              ctx.relation('athena', -12)
              ctx.damageWallPct(0.12)
              return [
                'La nuit même, des ombres descellent des pierres à l’endroit exact que la femme montrait.',
                'On la cherche pour l’interroger : elle a disparu. (Remparts −12 %, Athéna −12)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'L’héberger au temple (−25 🌾)',
        cout: { grain: 25 },
        requiert: (s) => s.buildings.temple.level >= 1,
        requiertLabel: 'temple requis',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.faveur(12)
              ctx.relation('athena', 8)
              ctx.morale(-5, 'La prophétesse au temple', 9 * MIN)
              return [
                'Les prêtres l’installent sous le portique. Elle chante des choses horribles à voix basse, jour et nuit.',
                'La faveur des dieux monte ; le sommeil du village, non. (+12 ✨, Athéna +8, ambiance −5)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.faveur(15)
              ctx.relation('athena', 10)
              ctx.revealAttack()
              ctx.morale(-7, 'Les cris de la voyante', 9 * MIN)
              return [
                'Au troisième jour, elle nomme la porte, le jour et le nom du chef ennemi. Le prêtre note tout.',
                'La prochaine attaque est révélée — et personne n’ose plus passer devant le temple. (+15 ✨, Athéna +10, ambiance −7)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'taureau-egare',
    emoji: '🐂',
    titre: 'Le taureau sans marque',
    texte:
      'Un taureau noir, énorme, sans marque d’oreille ni entaille de propriétaire, broute tranquillement vos orges depuis l’aube. Personne ne vient le réclamer.',
    weight: 7,
    cooldown: 9 * MIN,
    choices: [
      choix({
        label: 'Le sacrifier à Zeus',
        issues: [
          {
            p: 6,
            murmure: '« Belle bête, beau sacrifice. Le Tonnant s’en souviendra. »',
            effet: (ctx) => {
              ctx.relation('zeus', 16)
              ctx.faveur(12)
              ctx.morale(4, 'Hécatombe et rôti', 8 * MIN)
              return [
                'Les cornes dorées à la feuille, la nuque tranchée d’un coup : un sacrifice de manuel.',
                'Les cuisses aux dieux, le reste au village. (Zeus +16, +12 ✨, ambiance +4)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Cette bête appartenait à un autel. Son prêtre viendra demander des comptes. »',
            effet: (ctx) => {
              ctx.relation('zeus', 18)
              ctx.relation('poseidon', -12)
              ctx.add('bronze', -25)
              return [
                'Trois jours après, un prêtre de Poséidon arrive, furieux : la bête était consacrée à l’Ébranleur.',
                'On l’apaise avec du métal, faute de pouvoir lui rendre son taureau. (Zeus +18, Poséidon −12, −25 🪙)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'L’atteler aux labours',
        issues: [
          {
            p: 5,
            murmure: '« Il tirera comme quatre. Tes sillons n’ont jamais été si droits. »',
            effet: (ctx) => {
              ctx.add('grain', 60)
              ctx.morale(2, 'Un bœuf de plus', 6 * MIN)
              return [
                'Sous le joug, la bête tire comme quatre. On retourne en trois jours la terre haute qu’on croyait perdue.',
                '(+60 🌾, ambiance +2)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Cette bête n’a jamais porté le joug. Quelqu’un va y laisser des côtes. »',
            effet: (ctx) => {
              ctx.add('grain', 30)
              ctx.pop(-1)
              ctx.morale(-5, 'Le laboureur encorné', 8 * MIN)
              return [
                'Au deuxième sillon, le taureau se cabre et encorne Damon contre le mur de pierres sèches.',
                'On finit le champ sans lui. (+30 🌾, population −1, ambiance −5)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Il retournera à la montagne dès la première nuit. Tu n’auras rien. »',
            effet: (ctx) => {
              ctx.add('grain', 10)
              ctx.morale(-2, 'Le taureau enfui', 5 * MIN)
              return [
                'La première nuit, il arrache le piquet et remonte vers l’Ida en beuglant.',
                'On a labouré un demi-arpent. (+10 🌾, ambiance −2)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Attendre qu’on le réclame',
        issues: [
          {
            p: 6,
            murmure: '« Son propriétaire viendra, et il paiera son honnêteté. »',
            effet: (ctx) => {
              ctx.relation('zeus', 8)
              ctx.add('bronze', 20)
              ctx.add('grain', -25)
              return [
                'Un éleveur de la côte arrive au sixième jour, reconnaît sa bête et laisse vingt lingots pour la garde.',
                'Entre-temps, le taureau a mangé le quart d’un champ. (+20 🪙, −25 🌾, Zeus +8)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Personne ne viendra, et la bête finira dans un ravin. »',
            effet: (ctx) => {
              ctx.add('grain', -30)
              ctx.morale(-3, 'Le taureau perdu', 6 * MIN)
              return [
                'Nul ne vient. Le huitième jour, on le retrouve la patte brisée au fond d’un ravin ; la viande est déjà tournée.',
                'Il aura mangé pour rien. (−30 🌾, ambiance −3)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'herbe-guerisseuse',
    emoji: '🌿',
    titre: 'La femme aux simples',
    texte:
      'Une vieille des collines descend avec un panier de racines et de feuilles séchées. Elle jure guérir les fièvres d’été, celles qui emportent les enfants — contre du bronze, pas des prières.',
    weight: 6,
    cooldown: 10 * MIN,
    choices: [
      choix({
        label: 'Acheter le remède (−30 🪙)',
        cout: { bronze: 30 },
        issues: [
          {
            p: 5,
            murmure: '« Ses simples valent son prix. Un enfant respirera mieux ce soir. »',
            effet: (ctx) => {
              ctx.pop(1)
              ctx.morale(8, 'Les fièvres reculent', 10 * MIN)
              return [
                'La décoction est amère et efficace. La petite de Phyllis passe la nuit, puis la suivante.',
                'On bénit le chef qui a payé. (+1 population, ambiance +8)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Elle guérira si bien qu’on l’écoutera plus que ton temple. »',
            effet: (ctx) => {
              ctx.pop(1)
              ctx.morale(10, 'La guérisseuse adorée', 11 * MIN)
              ctx.faveur(-10)
              return [
                'Trois guérisons en huit jours : on vient de deux villages voisins la consulter.',
                'On l’écoute désormais plus que le prêtre, et l’autel reste froid. (+1 population, −10 ✨, ambiance +10)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Il y a de la ciguë dans son panier. Elle ne sait plus lire ses feuilles. »',
            effet: (ctx) => {
              ctx.pop(-2)
              ctx.morale(-9, 'Le remède qui tue', 10 * MIN)
              return [
                'Deux malades meurent dans la nuit, les lèvres bleues. Dans le panier, on trouve de la ciguë mêlée au reste.',
                'La vieille jure qu’elle ne voit plus bien. (Population −2, ambiance −9)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'La loger au temple (−25 🌾)',
        cout: { grain: 25 },
        requiert: (s) => s.buildings.temple.level >= 1,
        requiertLabel: 'temple requis',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.faveur(8)
              ctx.relation('athena', 6)
              ctx.morale(6, 'Le temple soigne', 10 * MIN)
              return [
                'Les prêtres notent ses recettes sur des tablettes ; elle apprend d’eux les prières qui font patienter.',
                'Le savoir et le rite se marient bien. (+8 ✨, Athéna +6, ambiance +6)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.faveur(-6)
              ctx.relation('athena', -2)
              ctx.morale(3, 'Querelles au temple', 7 * MIN)
              return [
                'La vieille traite les prêtres de brûleurs de graisse ; les prêtres la traitent de sorcière.',
                'On soigne quand même, entre deux insultes. (−6 ✨, Athéna −2, ambiance +3)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'La chasser comme sorcière',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.morale(3, 'La peur des sorts', 6 * MIN)
              ctx.relation('athena', -8)
              ctx.relation('zeus', -4)
              return [
                'On la poursuit jusqu’aux premières pentes. Les mères rentrent leurs enfants, rassurées.',
                'Athéna n’aime pas qu’on brûle le savoir. (Athéna −8, Zeus −4, ambiance +3)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.pop(-1)
              ctx.morale(-8, 'Les fièvres emportent', 10 * MIN)
              ctx.relation('athena', -8)
              return [
                'Huit jours plus tard, la fièvre prend deux maisons. Un enfant meurt en criant le nom de la vieille.',
                'On se souvient très bien de qui l’a chassée. (Population −1, Athéna −8, ambiance −8)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'fete-dionysos',
    emoji: '🍇',
    titre: 'Les vendanges de Dionysos',
    texte:
      'Les vignes des coteaux plient sous les grappes. Les anciens réclament une fête en l’honneur de Dionysos : vin coupé d’eau puis vin pur, chants obscènes, et bœufs à la broche.',
    weight: 8,
    cooldown: 10 * MIN,
    choices: [
      choix({
        label: 'Grande fête (−80 🌾, −30 🪵)',
        cout: { grain: 80, bois: 30 },
        issues: [
          {
            p: 5,
            effet: (ctx) => {
              ctx.morale(18, 'Fête de Dionysos', 12 * MIN)
              ctx.relation('zeus', 4)
              ctx.pop(1)
              ctx.morale(-5, 'Lendemain de fête', 3 * MIN)
              return [
                'Trois jours de chants montent jusqu’aux étoiles. On danse, on marie deux jeunes gens, on oublie la guerre.',
                'Le quatrième jour, personne n’est bon à rien. (+1 population, ambiance +18 puis −5 le temps du mal de crâne)',
              ]
            },
          },
          {
            p: 3,
            effet: (ctx) => {
              ctx.morale(12, 'Fête de Dionysos', 10 * MIN)
              ctx.pop(-1)
              ctx.relation('ares', 4)
              return [
                'Au deuxième soir, le vin pur fait son œuvre : une rixe de faucheurs, un couteau, un mort.',
                'On enterre le lendemain, la tête lourde. (Population −1, Arès +4, ambiance +12)',
              ]
            },
          },
          {
            p: 2,
            effet: (ctx) => {
              ctx.morale(22, 'Le dieu était parmi nous', 13 * MIN)
              ctx.faveur(15)
              ctx.add('grain', -40)
              return [
                'Un jeune homme couronné de lierre danse toute la nuit sans qu’on sache d’où il vient, puis s’évanouit à l’aube.',
                'On a bu la réserve jusqu’à la lie, et personne ne le regrette. (−40 🌾, +15 ✨, ambiance +22)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Libation sobre au pressoir (−25 🌾)',
        cout: { grain: 25 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.morale(6, 'Libation des vendanges', 8 * MIN)
              return ['Une coupe versée sur la terre, un chant, et l’on retourne aux paniers. C’est convenable. (Ambiance +6)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.morale(4, 'Libation des vendanges', 7 * MIN)
              ctx.relation('zeus', 3)
              return [
                'Le vieux pressoir craque, le moût coule, un enfant chante faux : on repart au travail presque heureux.',
                '(Zeus +3, ambiance +4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Refuser — les temps sont durs',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.morale(-4, 'Fête annulée', 6 * MIN)
              return ['Les villageois rangent les amphores en silence. La guerre a déjà volé assez de joies. (Ambiance −4)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.morale(-8, 'Rancune des vendanges', 9 * MIN)
              ctx.pop(-1)
              return [
                'Le vigneron, qui attendait cette fête depuis la mort de son fils, plie ses affaires et s’en va.',
                'Il connaissait les coteaux mieux que personne. (Population −1, ambiance −8)',
              ]
            },
          },
        ],
      }),
    ],
  },

  // ── Terre, bêtes et fléaux ─────────────────────────────────────────────────
  {
    id: 'loups-mont-ida',
    emoji: '🐺',
    titre: 'Les loups du mont Ida',
    texte:
      'Des bergers accourent, blêmes : une meute descendue de la montagne rôde autour des enclos. Trois brebis ont déjà été emportées, et l’on a vu les yeux verts jusque devant la palissade.',
    weight: 8,
    cooldown: 7 * MIN,
    choices: [
      choix({
        label: 'Organiser une battue',
        requiert: (s) => armee(s) >= 2,
        requiertLabel: '2 soldats requis',
        issues: [
          {
            p: 6,
            murmure: '« La meute tombera. Vous mangerez du gibier huit jours. »',
            effet: (ctx) => {
              ctx.add('grain', 40)
              ctx.morale(3, 'La meute est chassée', 7 * MIN)
              return [
                'Les lances font mouche dans le ravin : cinq loups au sol, le reste remonte vers les neiges.',
                'Le gibier levé par la battue garnit les tables. (+40 🌾, ambiance +3)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Un de tes hommes ne rentrera pas du ravin. »',
            effet: (ctx) => {
              const morts = ctx.loseSoldiers(1)
              ctx.morale(-3, 'Un chasseur tombé', 7 * MIN)
              return [
                `La battue tourne mal dans un ravin embrumé : ${morts || 'un'} des vôtres reste au fond, la gorge ouverte.`,
                'La meute, elle, ne reviendra pas non plus.',
              ]
            },
          },
          {
            p: 1,
            murmure: '« N’y va pas. Ce ne sont pas des loups ordinaires, et ils sont trop. »',
            effet: (ctx) => {
              const morts = ctx.loseSoldiers(2)
              ctx.add('grain', -30)
              ctx.morale(-7, 'Battue désastreuse', 9 * MIN)
              return [
                `Ils étaient vingt, et ils attendaient : ${morts || 'deux'} soldat(s) perdu(s), les autres rentrent en courant.`,
                'La meute festoie deux nuits de plus. (−30 🌾, ambiance −7)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Leur abandonner une brebis (−35 🌾)',
        cout: { grain: 35 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.morale(2, 'Le tribut des loups', 6 * MIN)
              return ['On attache la bête à cent pas des enclos. Au matin, il n’en reste rien — et les loups sont repartis. (Ambiance +2)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.add('grain', -35)
              ctx.morale(-4, 'Les loups reviennent', 7 * MIN)
              return [
                'On leur a appris le chemin : ils reviennent trois nuits de suite réclamer leur part.',
                'Un troupeau nourrit mal une meute. (−35 🌾, ambiance −4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Barricader les enclos (−45 🪵)',
        cout: { bois: 45 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.morale(1, 'Enclos tenus', 5 * MIN)
              return ['Pieux serrés, ronces par-dessus : la meute tourne trois nuits, hurle, et remonte à la montagne. (Ambiance +1)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.add('grain', -35)
              ctx.morale(-3, 'Troupeaux égorgés', 7 * MIN)
              return [
                'Ils passent par le ruisseau, là où l’on n’a pas planté de pieux.',
                'Six brebis au matin, éventrées et à peine mangées. (−35 🌾, ambiance −3)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'crue-du-fleuve',
    emoji: '🌊',
    titre: 'Le fleuve gonfle',
    texte:
      'Les pluies du mont Ida ont grossi le Scamandre : l’eau brune monte vers les champs bas, chargée d’arbres arrachés. Il reste peut-être une demi-journée.',
    condition: (s) => s.buildings.ferme.level >= 1,
    weight: 6,
    cooldown: 11 * MIN,
    choices: [
      choix({
        label: 'Digue en hâte (−60 🪵, −40 🪨)',
        cout: { bois: 60, pierre: 40 },
        issues: [
          {
            p: 6,
            murmure: '« Ta digue tiendra. De justesse, mais elle tiendra. »',
            effet: (ctx) => {
              ctx.morale(5, 'La digue a tenu', 9 * MIN)
              ctx.relation('poseidon', 4)
              return [
                'Tout le village porte des pierres jusqu’à la nuit. L’eau vient battre le talus et s’arrête à un pied du sommet.',
                'Les champs sont sauvés. (Poséidon +4, ambiance +5)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Elle cédera au petit jour, à l’angle du saule. Prépare-toi à perdre l’orge. »',
            effet: (ctx) => {
              ctx.add('grain', -45)
              ctx.morale(-4, 'La digue rompue', 8 * MIN)
              return [
                'À l’aube, la digue cède à l’angle du vieux saule et l’eau prend les champs bas en une heure.',
                'On a perdu le bois, la pierre et l’orge. (−45 🌾, ambiance −4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Sauver les bêtes, abandonner les champs',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.add('grain', -60)
              ctx.morale(-3, 'Champs noyés', 7 * MIN)
              return [
                'On monte les troupeaux sur la colline avant la nuit. Les champs bas disparaissent sous l’eau brune.',
                'Pas un animal perdu, pas un épi sauvé. (−60 🌾, ambiance −3)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.add('grain', -40)
              ctx.morale(4, 'Le limon du fleuve', 9 * MIN)
              return [
                'L’eau se retire au bout de trois jours en laissant un limon noir, grasse promesse pour la prochaine saison.',
                'Les vieux disent n’avoir jamais vu si belle terre. (−40 🌾, ambiance +4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Jeter une génisse au fleuve pour Poséidon (−40 🌾)',
        cout: { grain: 40 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('poseidon', 14)
              ctx.morale(3, 'Le fleuve apaisé', 8 * MIN)
              return [
                'La bête est poussée dans le courant sous les prières. Le soir même, l’eau cesse de monter.',
                'Les champs bas en sortent boueux mais vivants. (Poséidon +14, ambiance +3)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('poseidon', 8)
              ctx.add('grain', -50)
              ctx.morale(-5, 'Le dieu n’a pas entendu', 8 * MIN)
              return [
                'La génisse emportée, l’eau monte encore de deux coudées et prend tout ce qui restait à prendre.',
                'On a payé deux fois : en bête et en orge. (−50 🌾, Poséidon +8, ambiance −5)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'sauterelles',
    emoji: '🦗',
    titre: 'Le nuage brun',
    texte:
      'Un nuage brun monte de la plaine, et le bruit qu’il fait n’est pas celui du vent. Les sauterelles seront sur les champs avant le soir.',
    condition: (s) => s.buildings.ferme.level >= 2,
    weight: 6,
    cooldown: 12 * MIN,
    choices: [
      choix({
        label: 'Battre les champs, fumées et tambours',
        issues: [
          {
            p: 5,
            murmure: '« Vous les détournerez, au prix de vos bras et d’une partie de la récolte. »',
            effet: (ctx) => {
              ctx.add('grain', -40)
              ctx.morale(-4, 'Village harassé', 7 * MIN)
              return [
                'Feux de paille verte, chaudrons frappés, draps agités : le nuage s’incline vers la plaine voisine.',
                'On a sauvé les deux tiers et perdu deux nuits de sommeil. (−40 🌾, ambiance −4)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Le village y trouvera de la fierté, et vous perdrez peu. »',
            effet: (ctx) => {
              ctx.add('grain', -25)
              ctx.morale(4, 'Tous aux champs', 8 * MIN)
              return [
                'Enfants, vieillards, prêtres : tout le monde bat les fossés. Le nuage passe presque sans se poser.',
                'On se découvre capable de quelque chose ensemble. (−25 🌾, ambiance +4)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Rien n’y fera. Elles mangeront jusqu’aux piquets de vigne. »',
            effet: (ctx) => {
              ctx.add('grain', -85)
              ctx.morale(-8, 'Champs dévorés', 10 * MIN)
              return [
                'Elles se posent quand même, sur quatre doigts d’épaisseur, et ne laissent que les tiges.',
                'Le bruit de leurs mâchoires a duré deux jours. (−85 🌾, ambiance −8)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Grande offrande pour détourner le fléau (−60 🌾)',
        cout: { grain: 60 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('zeus', 12)
              ctx.faveur(10)
              ctx.morale(4, 'Le fléau détourné', 9 * MIN)
              return [
                'Le vent tourne pendant la prière et pousse le nuage vers la mer, où il se noie.',
                'Le prêtre en tire une gloire durable. (Zeus +12, +10 ✨, ambiance +4)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('zeus', 10)
              ctx.add('grain', -60)
              ctx.morale(-6, 'Prière inutile', 9 * MIN)
              return [
                'On brûle les cuisses grasses ; les sauterelles se posent sur l’autel avec le reste.',
                'Zeus a pris l’offrande sans rendre le service. (−60 🌾, Zeus +10, ambiance −6)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Faucher en hâte ce qui peut l’être',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.add('grain', 35)
              ctx.morale(-2, 'Moisson verte', 6 * MIN)
              return [
                'On fauche l’orge à demi mûr et l’on rentre tout sous les toits avant le crépuscule.',
                'Le grain est vert, il nourrira mal — mais il est là. (+35 🌾, ambiance −2)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.add('grain', 10)
              ctx.morale(-5, 'Trop tard', 8 * MIN)
              return [
                'Le nuage arrive plus vite que prévu : on fauche à côté des sauterelles, à l’aveugle.',
                'On rentre quelques gerbes et beaucoup d’insectes. (+10 🌾, ambiance −5)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'secheresse',
    emoji: '☀️',
    titre: 'Hélios accable les champs',
    texte:
      'Pas une goutte depuis des semaines. L’orge jaunit sur pied, les bœufs cherchent l’ombre, le puits rend une eau boueuse. Les prêtres parlent de sacrifice, les tailleurs de pierre de creuser plus bas.',
    condition: (s) => s.buildings.ferme.level >= 1,
    weight: 6,
    cooldown: 11 * MIN,
    choices: [
      choix({
        label: 'Sacrifier pour la pluie (−50 🌾)',
        cout: { grain: 50 },
        issues: [
          {
            p: 5,
            murmure: '« La pluie viendra le soir même. »',
            effet: (ctx) => {
              ctx.relation('zeus', 8)
              ctx.morale(5, 'La pluie est revenue', 9 * MIN)
              return ['Le soir même, des nuages crèvent au-dessus du mont Ida. Les champs boivent enfin. (Zeus +8, ambiance +5)']
            },
          },
          {
            p: 3,
            murmure: '« Elle viendra, mais tard. Ton orge aura eu le temps de souffrir. »',
            effet: (ctx) => {
              ctx.relation('zeus', 6)
              ctx.droughtFor(3 * MIN)
              ctx.morale(-3, 'La pluie tarde', 6 * MIN)
              return [
                'Rien pendant huit jours, puis un orage court et violent qui ruisselle sans pénétrer.',
                'La production de grain reste réduite un moment encore. (Zeus +6, ambiance −3)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Le Tonnant est d’humeur généreuse. Prépare des seaux. »',
            effet: (ctx) => {
              ctx.relation('zeus', 12)
              ctx.faveur(12)
              ctx.morale(8, 'L’orage bienvenu', 10 * MIN)
              return [
                'Le ciel noircit avant que la fumée du sacrifice ait fini de monter. Il pleut trois jours.',
                'Les citernes débordent, les enfants dansent dans la boue. (Zeus +12, +12 ✨, ambiance +8)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Creuser un puits plus bas (−60 🪨, −30 🪵)',
        cout: { pierre: 60, bois: 30 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('poseidon', 8)
              ctx.morale(4, 'L’eau retrouvée', 9 * MIN)
              return [
                'À douze coudées, la pelle sonne mouillé : une veine froide et abondante.',
                'Poséidon tient aussi les eaux qui dorment sous la pierre. (Poséidon +8, ambiance +4)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('poseidon', -4)
              ctx.droughtFor(4 * MIN)
              ctx.morale(-5, 'Le puits sec', 8 * MIN)
              return [
                'Vingt coudées de pierre sèche, un étayage effondré, et pas une goutte.',
                'On a perdu le bois, la pierre et huit jours de bras. (Poséidon −4, ambiance −5)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Laisser brûler',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.droughtFor(6 * MIN)
              ctx.morale(-6, 'Sécheresse', 7 * MIN)
              return ['Le soleil poursuit son œuvre : la production de grain est réduite de moitié un long moment. (Ambiance −6)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.droughtFor(8 * MIN)
              ctx.pop(-1)
              ctx.morale(-9, 'Sécheresse et deuil', 9 * MIN)
              return [
                'La sécheresse s’installe. Une vieille meurt de soif dans sa cabane, seule, à trois pas d’une jarre vide.',
                'La production de grain reste réduite longtemps. (Population −1, ambiance −9)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'moisson-exceptionnelle',
    emoji: '🌾',
    titre: 'La moisson des dieux',
    texte:
      'L’orge plie sous le grain : de mémoire d’homme on n’a vu pareille moisson. Les greniers ne suffiront pas, et tout le monde a un avis sur ce qu’il faut en faire.',
    condition: (s) => s.buildings.ferme.level >= 2,
    weight: 7,
    cooldown: 10 * MIN,
    choices: [
      choix({
        label: 'Tout engranger',
        issues: [
          {
            p: 6,
            murmure: '« Tes greniers seront pleins, et ton village boudera. »',
            effet: (ctx) => {
              ctx.add('grain', 140)
              ctx.morale(-4, 'Le chef garde tout', 8 * MIN)
              return [
                'On empile jusqu’aux poutres, on bâche, on scelle. Pas une galette de plus dans les maisons.',
                'On murmure que le chef mange à sa faim. (+140 🌾, ambiance −4)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Trop de grain sous un même toit : les rats et l’humidité prendront leur part. »',
            effet: (ctx) => {
              ctx.add('grain', 160)
              const vol = ctx.stealPct(0.08, ['grain'])
              ctx.morale(-6, 'Grain gâté', 9 * MIN)
              return [
                'On entasse trop et trop vite ; au fond, le grain chauffe et moisit, et les rats font le reste.',
                `Rentré : +160 🌾, reperdu : ${vol}. Et personne n’a eu sa galette. (Ambiance −6)`,
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Vendre le surplus au port',
        requiert: (s) => s.buildings.port.level >= 1,
        requiertLabel: 'port requis',
        issues: [
          {
            p: 5,
            murmure: '« Bon prix, bonne affaire. Le village comptera les sacs qui partent. »',
            effet: (ctx) => {
              ctx.add('bronze', 70)
              ctx.morale(-3, 'Le grain qui s’en va', 7 * MIN)
              return [
                'Deux navires chargent jusqu’au plat-bord. Le bronze rentre, le grain part.',
                'Les femmes regardent partir les sacs sans rien dire. (+70 🪙, ambiance −3)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« L’acheteur te volera au poids. Tu t’en apercevras trop tard. »',
            effet: (ctx) => {
              ctx.add('bronze', 40)
              ctx.morale(-5, 'Marché de dupes', 8 * MIN)
              return [
                'Le facteur phénicien pèse avec ses propres pierres, et ses pierres sont légères.',
                'On a vendu la moisson du siècle pour une poignée de lingots. (+40 🪙, ambiance −5)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« La disette est ailleurs : ton grain vaut de l’or cette année. »',
            effet: (ctx) => {
              ctx.add('bronze', 115)
              ctx.morale(-6, 'Les greniers vides et le coffre plein', 9 * MIN)
              return [
                'La sécheresse a frappé toute la côte : votre orge se vend au prix du métal.',
                'Le coffre est lourd. Les greniers sonnent creux, et cela s’entend. (+115 🪙, ambiance −6)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Festin de la moisson (−60 🌾)',
        cout: { grain: 60 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.morale(14, 'Festin de la moisson', 12 * MIN)
              ctx.relation('zeus', 6)
              ctx.pop(1)
              return [
                'On mange en plein champ, sur les gerbes, jusqu’à la nuit. Un journalier de passage demande à rester.',
                '(+1 population, Zeus +6, ambiance +14)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.morale(16, 'Festin mémorable', 12 * MIN)
              ctx.pop(2)
              ctx.add('grain', -40)
              return [
                'Le festin s’étire sur quatre jours et attire les villages voisins ; deux familles s’installent.',
                'On a mangé bien au-delà de ce qui était prévu. (+2 population, −40 🌾, ambiance +16)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'forgeron-ivrogne',
    emoji: '🔥',
    titre: 'Le forgeron a bu',
    texte:
      'Straton le forgeron a vidé une outre avant de couler le bronze. Les lames sont molles, une pointe s’est tordue sous le doigt d’un lancier, et toute la fournée est bonne à refondre.',
    condition: (s) => s.buildings.forge.level >= 1,
    weight: 6,
    cooldown: 10 * MIN,
    choices: [
      choix({
        label: 'Le châtier devant la forge',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.add('bronze', 20)
              ctx.relation('ares', 4)
              ctx.morale(-5, 'Le forgeron humilié', 8 * MIN)
              return [
                'Straton refait la fournée sous les yeux du village, la joue enflée et les mains sûres.',
                'Le métal est bon. L’atelier ne rit plus. (+20 🪙, Arès +4, ambiance −5)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.add('bronze', -25)
              ctx.morale(-8, 'La main brisée', 10 * MIN)
              return [
                'Le coup part trop haut : Straton se protège de la main droite, qui casse net.',
                'Le village n’a plus de forgeron, et le bronze gâté reste gâté. (−25 🪙, ambiance −8)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Lui payer son vin et le laisser faire (−20 🌾)',
        cout: { grain: 20 },
        issues: [
          {
            p: 5,
            murmure: '« Laisse-le boire et frapper. Il travaille mieux qu’à jeun, le vieux fou. »',
            effet: (ctx) => {
              ctx.add('bronze', 40)
              ctx.morale(3, 'Le vieux rit', 7 * MIN)
              return [
                'Straton boit, chante, et sort de sa forge trente pointes qui sonnent comme des cloches.',
                'Personne ne comprend, tout le monde en profite. (+40 🪙, ambiance +3)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Il ne se relèvera pas de cette outre-là. Ton bronze est perdu. »',
            effet: (ctx) => {
              ctx.add('bronze', -30)
              ctx.morale(-4, 'Forge éteinte', 7 * MIN)
              return [
                'Il boit, s’endort sur son enclume, et la coulée figée arrache le fond du creuset.',
                'Deux jours de production dans un bloc informe. (−30 🪙, ambiance −4)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Sous le vin, il y a un maître. Il va sortir de sa forge quelque chose d’étonnant. »',
            effet: (ctx) => {
              ctx.add('bronze', 20)
              ctx.relation('athena', 10)
              ctx.faveur(10)
              return [
                'Au troisième jour, Straton sort un bouclier gravé de chouettes et de vagues, comme il n’en a jamais fait.',
                'On le suspend au temple. Athéna, dit le prêtre, a tenu le marteau. (+20 🪙, Athéna +10, +10 ✨)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Confier la forge à son fils',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.add('bronze', 15)
              ctx.pop(-1)
              ctx.morale(2, 'Une forge sobre', 7 * MIN)
              return [
                'Le fils travaille lentement, proprement, sans génie. Le père quitte le village au bout d’un mois.',
                'On ne sait pas où il est allé boire. (+15 🪙, population −1, ambiance +2)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.add('bronze', -25)
              ctx.morale(-3, 'L’apprenti maladroit', 7 * MIN)
              return [
                'Le garçon n’a pas la main : deux moules éclatent, une coulée part sur le sol de terre battue.',
                'Le père regarde en buvant. (−25 🪙, ambiance −3)',
              ]
            },
          },
        ],
      }),
    ],
  },

  // ── Mer, commerce et étrangers ─────────────────────────────────────────────
  {
    id: 'marchand-phenicien',
    emoji: '⛵',
    titre: 'Le marchand phénicien',
    texte:
      'Un navire aux voiles pourpres accoste. Le marchand déballe des lingots de Chypre, des étoffes teintes au murex, des fioles d’huile parfumée — et parle « prix de l’amitié » en souriant trop.',
    condition: (s) => s.buildings.port.level >= 1,
    weight: 8,
    cooldown: 7 * MIN,
    choices: [
      choix({
        label: 'Acheter le bronze (−200 🪵 → 🪙)',
        cout: { bois: 200 },
        issues: [
          {
            p: 6,
            murmure: '« Le métal sonne clair. Affaire honnête. »',
            effet: (ctx) => {
              ctx.add('bronze', 60)
              return ['Le bronze est excellent — les forgerons le font sonner du plat de l’épée et hochent la tête. (+60 🪙)']
            },
          },
          {
            p: 3,
            murmure: '« Frappe les lingots : j’entends du plomb sous le bronze. »',
            effet: (ctx) => {
              ctx.add('bronze', 25)
              ctx.morale(-3, 'Floués par un marchand', 7 * MIN)
              return [
                'Une fois le navire à l’horizon, la moitié des lingots se révèlent fourrés de plomb.',
                'On a payé du bois de charpente pour du remplissage. (+25 🪙, ambiance −3)',
              ]
            },
          },
          {
            p: 1,
            murmure: '« Il est pressé de repartir : il te lâchera plus que promis, et un présent en prime. »',
            effet: (ctx) => {
              ctx.add('bronze', 80)
              ctx.relation('ares', 5)
              return [
                'Le marchand, qui fuit une galère crétoise, solde sa cale et glisse un poignard chypriote dans la main du chef.',
                'La lame est superbe et le manche sent le sang. (+80 🪙, Arès +5)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Troquer du grain contre la pourpre (−90 🌾)',
        cout: { grain: 90 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.add('bronze', 35)
              ctx.morale(6, 'Étoffes de pourpre', 10 * MIN)
              return [
                'Deux pièces d’étoffe pourpre et trois fioles d’huile : de quoi habiller les fêtes pour dix ans.',
                'Le marchand reprend le reste en métal. (+35 🪙, ambiance +6)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.add('bronze', 15)
              ctx.morale(8, 'Le luxe du village', 11 * MIN)
              ctx.relation('athena', -4)
              return [
                'On se dispute les étoffes avant même qu’elles soient déballées, et la teinture déteint au premier lavage.',
                'Le village est très fier de ses guenilles roses. (+15 🪙, Athéna −4, ambiance +8)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Le laisser repartir',
        issues: [
          {
            p: 6,
            effet: () => ['Le marchand hausse les épaules et remet à la voile vers Lesbos. On le reverra, ou pas.'],
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.morale(-3, 'Le port dédaigné', 6 * MIN)
              return [
                'Il repart en riant : « Un port sans acheteur n’est qu’une plage. »',
                'Les pêcheurs, qui espéraient du métal, gardent la phrase en travers. (Ambiance −3)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'naufrages',
    emoji: '🌊',
    titre: 'L’épave de la trirème',
    texte:
      'À l’aube, une trirème éventrée gît sur les rochers près du port. Des survivants s’accrochent aux débris, la cargaison flotte entre deux eaux, et la mer monte.',
    condition: (s) => s.buildings.port.level >= 1,
    weight: 7,
    cooldown: 9 * MIN,
    choices: [
      choix({
        label: 'Secourir les marins (−25 🌾)',
        cout: { grain: 25 },
        issues: [
          {
            p: 5,
            murmure: '« Sauve-les. Deux resteront et travailleront pour toi. »',
            effet: (ctx) => {
              ctx.relation('poseidon', 14)
              ctx.pop(2)
              ctx.morale(4, 'Marins sauvés des flots', 9 * MIN)
              return [
                'Vos barques arrachent sept hommes à la mer. Deux, qui n’ont plus de port, choisissent de rester.',
                'La cargaison, elle, est perdue. (+2 population, Poséidon +14, ambiance +4)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Ils sont brisés. Tu les nourriras longtemps avant qu’ils te servent. »',
            effet: (ctx) => {
              ctx.relation('poseidon', 16)
              ctx.pop(1)
              ctx.add('grain', -35)
              ctx.morale(2, 'Naufragés soignés', 8 * MIN)
              return [
                'On ramène cinq hommes rompus, dont trois mourront quand même. Le dernier reste, boiteux.',
                'Les soins ont coûté plus que la reconnaissance. (+1 population, −35 🌾, Poséidon +16)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Celui que tu vas repêcher est riche. Il te paiera. »',
            effet: (ctx) => {
              ctx.relation('poseidon', 14)
              ctx.add('bronze', 50)
              ctx.morale(5, 'La gratitude d’un armateur', 9 * MIN)
              return [
                'Parmi les rescapés, un armateur de Phocée. Sa maison envoie une récompense un mois plus tard.',
                '(+50 🪙, Poséidon +14, ambiance +5)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Piller la cargaison',
        issues: [
          {
            p: 5,
            murmure: '« Bois et métal. Et un dieu qui te regarde faire. »',
            effet: (ctx) => {
              ctx.add('bois', 120)
              ctx.add('bronze', 40)
              ctx.relation('poseidon', -20)
              ctx.relation('zeus', -6)
              ctx.morale(-5, 'Des noyés qu’on n’a pas secourus', 9 * MIN)
              return [
                'On repêche les amphores et les poutres — pas les hommes.',
                '« La mer rendra ce qu’on lui doit », dit le vieux pêcheur. (+120 🪵, +40 🪙, Poséidon −20, Zeus −6)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Belle cale. Et un survivant qui criera ton nom dans tous les ports. »',
            effet: (ctx) => {
              ctx.add('bois', 160)
              ctx.add('bronze', 60)
              ctx.relation('poseidon', -24)
              ctx.morale(-9, 'La honte du rivage', 10 * MIN)
              return [
                'La cale était pleine de cèdre et de lingots. Un seul homme survit, et il a tout vu.',
                'Il part vers le sud en jurant de raconter. (+160 🪵, +60 🪙, Poséidon −24, ambiance −9)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Cette cale ne contient que des peaux pourries. Tu te damnes pour rien. »',
            effet: (ctx) => {
              ctx.add('bois', 40)
              ctx.relation('poseidon', -20)
              ctx.morale(-6, 'Pillage misérable', 8 * MIN)
              return [
                'On ne remonte que des peaux gonflées d’eau et du bois vermoulu ; les noyés, eux, sont bien morts.',
                'Le pire commerce du monde. (+40 🪵, Poséidon −20, ambiance −6)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Sauver les hommes ET la cargaison (−25 🌾)',
        cout: { grain: 25 },
        requiert: (s) => armee(s) >= 2,
        requiertLabel: '2 soldats requis',
        issues: [
          {
            p: 5,
            effet: (ctx) => {
              ctx.relation('poseidon', 8)
              ctx.pop(2)
              ctx.add('bois', 70)
              ctx.morale(2, 'Sauvetage rentable', 8 * MIN)
              return [
                'Les soldats tiennent les cordes, les pêcheurs plongent : sept hommes et la moitié des poutres.',
                'Poséidon apprécie modérément qu’on marchande avec lui. (+2 population, +70 🪵, Poséidon +8)',
              ]
            },
          },
          {
            p: 3,
            effet: (ctx) => {
              const morts = ctx.loseSoldiers(1)
              ctx.relation('poseidon', 10)
              ctx.pop(2)
              ctx.add('bois', 40)
              ctx.morale(-3, 'Un sauveteur noyé', 8 * MIN)
              return [
                `Une barque chavire sous le poids : ${morts || 'un'} des vôtres disparaît dans le ressac.`,
                'Les naufragés, eux, sont saufs. (+2 population, +40 🪵, Poséidon +10)',
              ]
            },
          },
          {
            p: 2,
            effet: (ctx) => {
              ctx.relation('poseidon', 12)
              ctx.pop(2)
              ctx.add('bois', 90)
              ctx.add('bronze', 25)
              ctx.morale(6, 'Sauvetage exemplaire', 10 * MIN)
              return [
                'La mer se calme une heure entière, juste le temps qu’il faut. Tout est sauvé, hommes et cale.',
                'On appellera cette heure « le calme de Poséidon ». (+2 population, +90 🪵, +25 🪙, Poséidon +12, ambiance +6)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'voyage-de-commerce',
    emoji: '🚢',
    titre: 'Le capitaine de Lemnos',
    texte:
      'Un capitaine au visage tanné propose d’emporter votre grain jusqu’à Lemnos, où la disette fait rage, et d’en ramener du métal. « La mer est belle, en cette saison. »',
    condition: (s) => s.buildings.port.level >= 2,
    weight: 6,
    cooldown: 12 * MIN,
    choices: [
      choix({
        label: 'Charger son navire (−120 🌾)',
        cout: { grain: 120 },
        issues: [
          {
            p: 5,
            murmure: '« Il reviendra, et sa cale sera lourde. »',
            effet: (ctx) => {
              ctx.add('bronze', 90)
              ctx.relation('poseidon', 4)
              return ['Trois semaines plus tard, le navire rentre au port chargé de métal et de nouvelles. (+90 🪙, Poséidon +4)']
            },
          },
          {
            p: 3,
            murmure: '« Ce navire ne reviendra pas. Garde ton grain. »',
            effet: (ctx) => {
              ctx.morale(-7, 'Le navire perdu', 9 * MIN)
              ctx.relation('poseidon', -4)
              return [
                'Une tempête d’équinoxe. On retrouve une rame et un coffre sur la plage, un mois après.',
                'Le grain, le navire et douze hommes. (Poséidon −4, ambiance −7)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Lemnos meurt de faim : ton orge y vaudra trois fois son prix. »',
            effet: (ctx) => {
              ctx.add('bronze', 145)
              ctx.morale(5, 'Le voyage fructueux', 9 * MIN)
              return [
                'À Lemnos, on s’arrache l’orge à prix d’or. Le capitaine rentre avec du métal, du vin et un chien.',
                '(+145 🪙, ambiance +5)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Confier la cargaison à un des vôtres (−120 🌾)',
        cout: { grain: 120 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.add('bronze', 110)
              ctx.morale(3, 'Notre homme à Lemnos', 8 * MIN)
              return [
                'Kallias, qui sait compter, part avec la cargaison et surveille la balance jusqu’à la dernière once.',
                'Il rentre maigre, brûlé, et avec tout le métal. (+110 🪙, ambiance +3)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.add('bronze', 30)
              ctx.pop(-1)
              ctx.morale(-5, 'Un homme resté au loin', 8 * MIN)
              return [
                'Kallias vend bien, puis épouse une Lemnienne et envoie le tiers de la somme avec ses excuses.',
                'On ne le reverra pas. (+30 🪙, population −1, ambiance −5)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Décliner',
        issues: [
          {
            p: 1,
            effet: () => ['« Comme il vous plaira. » Le capitaine trouvera un autre port et un autre grain.'],
          },
        ],
      }),
    ],
  },

  // ── Guerre, Troie et Achéens ───────────────────────────────────────────────
  {
    id: 'deserteurs-acheens',
    emoji: '🪖',
    titre: 'Déserteurs achéens',
    texte:
      'Deux hoplites au bouclier retourné demandent à servir votre village. Ils ont fui le camp d’Agamemnon — « dix ans de siège pour l’honneur d’un seul homme, c’en est trop ».',
    condition: (s) => s.buildings.caserne.level >= 1,
    weight: 7,
    cooldown: 9 * MIN,
    choices: [
      choix({
        label: 'Les enrôler',
        issues: [
          {
            p: 5,
            murmure: '« De bonnes lames. Et des hommes qui ont déjà rompu un serment. »',
            effet: (ctx) => {
              ctx.units('hoplite', 2)
              ctx.relation('ares', 8)
              ctx.relation('zeus', -8)
              ctx.morale(-4, 'Des parjures parmi nous', 8 * MIN)
              return [
                'Les deux hoplites prêtent serment à votre autel — le second de leur vie.',
                'Redoutables au combat, inquiétants au village. (+2 hoplites, Arès +8, Zeus −8, ambiance −4)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Ils savent quand la prochaine colonne passera. Fais-les parler. »',
            effet: (ctx) => {
              ctx.units('hoplite', 2)
              ctx.relation('ares', 10)
              ctx.relation('zeus', -10)
              ctx.revealAttack()
              return [
                'Autour du feu, ils dessinent dans la cendre les routes, les campements et les jours de marche.',
                'La prochaine attaque est révélée. (+2 hoplites, Arès +10, Zeus −10)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Ils repartiront, et pas seuls. Un parjure ne se corrige pas. »',
            effet: (ctx) => {
              ctx.units('hoplite', 2)
              ctx.relation('zeus', -10)
              const morts = ctx.loseSoldiers(3)
              ctx.morale(-7, 'Désertion contagieuse', 9 * MIN)
              return [
                'Trois nuits plus tard, les Achéens repartent — en emmenant deux de vos jeunes lanciers et l’argenterie de l’autel.',
                `Solde de l’affaire : ${morts} homme(s) hors des rangs. (Zeus −10, ambiance −7)`,
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Les livrer contre rançon',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.add('bronze', 60)
              ctx.relation('ares', -10)
              ctx.morale(-4, 'Deux hommes livrés', 8 * MIN)
              return [
                'Le camp paie sans discuter et les emmène pour l’exemple. On entend les cris depuis le rivage.',
                '(+60 🪙, Arès −10, ambiance −4)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.add('bronze', 85)
              ctx.relation('ares', -12)
              ctx.relation('zeus', -6)
              ctx.morale(-7, 'Le prix des parjures', 9 * MIN)
              return [
                'L’un des deux était neveu d’un capitaine : sa tête vaut cher. On paie, on remercie, on note votre nom.',
                'Le village apprend que son chef vend des suppliants. (+85 🪙, Arès −12, Zeus −6, ambiance −7)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Les renvoyer sur la route',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('ares', -4)
              ctx.morale(2, 'La parole donnée est sacrée', 7 * MIN)
              return ['Vous refusez des parjures. Le village approuve ; Arès méprise tant de scrupules. (Arès −4, ambiance +2)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('ares', -6)
              ctx.morale(-3, 'Deux lances de plus contre nous', 7 * MIN)
              return [
                'On les voit repartir vers les collines, où d’autres hommes sans village les attendent.',
                'On les reverra peut-être, torche à la main. (Arès −6, ambiance −3)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'archers-cretois',
    emoji: '🏹',
    titre: 'Les archers crétois',
    texte:
      'Une bande d’archers crétois campe devant la porte, arcs de corne à l’épaule. Leur chef mâche une racine et parle peu : « Nous tirons pour qui paie. Le prix est le prix. »',
    condition: (s) => s.buildings.caserne.level >= 1,
    weight: 6,
    cooldown: 10 * MIN,
    choices: [
      choix({
        label: 'Engager la bande (−70 🪙)',
        cout: { bronze: 70 },
        issues: [
          {
            p: 6,
            murmure: '« Ils tireront pour toi. Ils mangeront aussi comme quatre. »',
            effet: (ctx) => {
              ctx.units('archer', 3)
              ctx.add('grain', -40)
              ctx.morale(2, 'Des arcs sur nos murs', 7 * MIN)
              return [
                'Trois archers montent sur le rempart et se choisissent des créneaux comme on choisit un lit.',
                'Ils vident un grenier par semaine. (+3 archers, −40 🌾, ambiance +2)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Ils seront quatre, et ils pilleront les fermes voisines en ton nom. »',
            effet: (ctx) => {
              ctx.units('archer', 4)
              ctx.relation('ares', 6)
              ctx.relation('zeus', -8)
              ctx.morale(-5, 'Nos mercenaires font le vide', 8 * MIN)
              return [
                'Quatre arcs, et quatre hommes qui « réquisitionnent » chez les bergers du haut plateau.',
                'On vous doit désormais du sang chez les voisins. (+4 archers, Arès +6, Zeus −8, ambiance −5)',
              ]
            },
          },
          {
            p: 1,
            murmure: '« Ne paie pas. Ils partiront avant l’aube avec ton bronze. »',
            effet: (ctx) => {
              ctx.morale(-8, 'Volés par des mercenaires', 9 * MIN)
              ctx.relation('ares', -4)
              return [
                'Au matin, le camp est vide, les cendres froides, le bronze parti vers le sud.',
                'On a payé la leçon comptant. (Arès −4, ambiance −8)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'N’en prendre qu’un, comme maître d’arc (−25 🪙)',
        cout: { bronze: 25 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.units('archer', 1)
              ctx.morale(2, 'Un maître d’arc', 7 * MIN)
              return ['Le plus vieux reste, contre gîte et métal. Il crache sur les arcs du village, puis en fabrique un correct. (+1 archer)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.units('archer', 2)
              ctx.add('grain', -20)
              ctx.morale(4, 'L’école de l’arc', 9 * MIN)
              return [
                'Le Crétois prend un garçon du village en apprentissage et en fait, en trois semaines, un tireur.',
                'Deux arcs pour le prix d’un, et deux bouches à table. (+2 archers, −20 🌾, ambiance +4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Refuser ces loueurs de mort',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('ares', -5)
              ctx.morale(3, 'Nos murs, nos bras', 7 * MIN)
              return [
                'Le village préfère ses propres bras à des arcs qu’on loue. La bande lève le camp sans un mot.',
                '(Arès −5, ambiance +3)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('ares', -6)
              ctx.relation('athena', 4)
              ctx.morale(-3, 'Des arcs qui iront ailleurs', 7 * MIN)
              return [
                'Ils s’en vont vers l’est, là où l’on rassemble des hommes contre votre vallée.',
                'Athéna approuve la prudence du coffre ; les soldats, moins. (Arès −6, Athéna +4, ambiance −3)',
              ]
            },
          },
        ],
      }),
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
    cooldown: 10 * MIN,
    choices: [
      choix({
        label: 'Envoyer trois lances',
        requiert: (s) => armee(s) >= 3,
        requiertLabel: '3 soldats requis',
        issues: [
          {
            p: 5,
            murmure: '« Ils se battront bien et Troie paiera sa part. Compte quelques semaines. »',
            effet: (ctx) => {
              ctx.loseSoldiers(3)
              ctx.relation('ares', 12)
              ctx.relation('zeus', 6)
              ctx.schedule('butin-troie', 8 * MIN)
              return [
                'Trois des vôtres partent au pas de course derrière le char. Au loin, les trompes sonnent le rassemblement.',
                'Troie partagera le butin — plus tard. (−3 soldats, Arès +12, Zeus +6)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« La sortie sera glorieuse et courte. Le butin arrivera vite. »',
            effet: (ctx) => {
              ctx.loseSoldiers(3)
              ctx.relation('ares', 14)
              ctx.morale(6, 'Nos hommes avec Hector', 10 * MIN)
              ctx.schedule('butin-troie', 5 * MIN)
              return [
                'La sortie d’Hector brûle deux navires. Un héraut vient dire que vos hommes s’y sont distingués.',
                'Le village a le torse gonflé. (−3 soldats, Arès +14, ambiance +6)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« N’envoie personne. Aucun de ces trois ne reverra la porte. »',
            effet: (ctx) => {
              ctx.loseSoldiers(3)
              ctx.relation('ares', 8)
              ctx.morale(-9, 'Trois morts pour rien', 10 * MIN)
              return [
                'La sortie tourne au massacre sous les flèches de Teucros. Aucun de vos hommes ne revient, et aucun butin non plus.',
                'On récite leurs noms sur la place. (−3 soldats, Arès +8, ambiance −9)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Envoyer du grain plutôt que des hommes (−120 🌾)',
        cout: { grain: 120 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('zeus', 8)
              ctx.relation('ares', 2)
              ctx.morale(2, 'Alliés par le grain', 7 * MIN)
              return [
                'Six chariots d’orge prennent la route de Troie. L’émissaire remercie, un peu sèchement.',
                'On garde ses hommes. (Zeus +8, Arès +2)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('zeus', 6)
              ctx.relation('ares', -4)
              ctx.add('bronze', 40)
              return [
                '« Hector voulait des lances », grince l’émissaire — mais l’intendant de Priam renvoie du métal pour l’orge.',
                'Marché de marchands, pas de guerriers. (+40 🪙, Zeus +6, Arès −4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Garder ses forces',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('ares', -6)
              return ['L’émissaire repart sans un mot. On ne compte pas les absents dans les chants de victoire. (Arès −6)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('ares', -8)
              ctx.relation('zeus', -4)
              ctx.morale(-4, 'La gloire refusée', 8 * MIN)
              return [
                'Les jeunes du village avaient déjà graissé leurs lances. Ils vous regardent renvoyer le char de Priam.',
                'Il paraît que Troie tient des listes. (Arès −8, Zeus −4, ambiance −4)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'secours-village-voisin',
    emoji: '🔥',
    titre: 'Thymbra brûle',
    texte:
      'Une fumée noire monte derrière la colline. Un cavalier arrive, la cuisse ouverte : Thymbra est attaquée, ses murs n’ont pas tenu, et l’on demande secours au nom des serments échangés.',
    condition: (s) => armee(s) >= 4,
    weight: 6,
    cooldown: 11 * MIN,
    choices: [
      choix({
        label: 'Marcher au secours',
        requiert: (s) => armee(s) >= 4,
        requiertLabel: '4 soldats requis',
        issues: [
          {
            p: 5,
            murmure: '« Vous arriverez à temps. Ils vous le paieront en grain. »',
            effet: (ctx) => {
              const morts = ctx.loseSoldiers(2)
              ctx.morale(10, 'Le serment tenu', 11 * MIN)
              ctx.relation('zeus', 10)
              ctx.add('grain', 60)
              return [
                `Vos hommes prennent les pillards de flanc dans les vergers : ${morts} des vôtres tombe(nt), les autres rentrent en chantant.`,
                'Thymbra envoie son orge et sa gratitude. (+60 🌾, Zeus +10, ambiance +10)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Le combat sera dur, mais les survivants de Thymbra te suivront jusqu’ici. »',
            effet: (ctx) => {
              const morts = ctx.loseSoldiers(3)
              ctx.morale(6, 'Sauveurs de Thymbra', 10 * MIN)
              ctx.relation('zeus', 12)
              ctx.pop(3)
              return [
                `Le village est à demi brûlé quand vous arrivez : ${morts} soldat(s) perdu(s) dans les ruelles en flammes.`,
                'Trois familles sans toit vous suivent au retour. (+3 population, Zeus +12, ambiance +6)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Trop tard. Tu ne trouveras que des cendres et des chiens. »',
            effet: (ctx) => {
              const morts = ctx.loseSoldiers(1)
              ctx.morale(-6, 'Arrivés trop tard', 9 * MIN)
              ctx.relation('zeus', 6)
              return [
                `Il ne reste que des poutres fumantes et des corps. Une embuscade d’arrière-garde coûte ${morts || 'un'} homme.`,
                'Le serment est tenu, la ville est morte. (Zeus +6, ambiance −6)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Envoyer grain et bras pour les blessés (−80 🌾)',
        cout: { grain: 80 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('zeus', 8)
              ctx.morale(5, 'Secours aux blessés', 9 * MIN)
              ctx.pop(2)
              return [
                'Vos femmes soignent les brûlés sous les oliviers. Deux orphelins restent au village.',
                'On n’a pas versé de sang, on n’a pas menti au serment. (+2 population, Zeus +8, ambiance +5)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('zeus', 6)
              ctx.pop(1)
              ctx.revealAttack()
              ctx.morale(3, 'Secours aux blessés', 8 * MIN)
              return [
                'Un blessé de Thymbra, avant de mourir, décrit la bande, son chef et la vallée qu’elle visera ensuite : la vôtre.',
                'La prochaine attaque est révélée. (+1 population, Zeus +6, ambiance +3)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Fermer les portes et doubler la garde',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('zeus', -12)
              ctx.morale(-8, 'Le serment trahi', 10 * MIN)
              return [
                'Le cavalier meurt devant la porte fermée, en répétant le nom de votre village.',
                'Toute la vallée l’apprendra. (Zeus −12, ambiance −8)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('zeus', -10)
              ctx.morale(-5, 'Portes closes', 9 * MIN)
              ctx.add('grain', 30)
              return [
                'Les pillards, gorgés du butin de Thymbra, passent devant vos murs sans s’y arrêter.',
                'On récupère un chariot abandonné dans leur retraite. (+30 🌾, Zeus −10, ambiance −5)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'rancon-prisonnier',
    emoji: '🪙',
    titre: 'Le jeune noble achéen',
    texte:
      'Vos hommes ont ramassé, tombé de son char et à demi assommé, un garçon aux armes trop belles pour un simple soldat. Il donne le nom de son père et propose une rançon.',
    condition: (s) => armee(s) >= 2,
    weight: 6,
    cooldown: 11 * MIN,
    choices: [
      choix({
        label: 'Réclamer rançon à son père',
        issues: [
          {
            p: 5,
            murmure: '« Le père paiera, et vite. »',
            effet: (ctx) => {
              ctx.add('bronze', 90)
              ctx.add('grain', -20)
              ctx.relation('ares', 4)
              ctx.morale(4, 'La rançon du noble', 9 * MIN)
              return [
                'Un intendant apporte le métal au bout de six jours et repart avec le garçon, très digne.',
                'Il a fallu le nourrir comme un hôte pendant l’attente. (+90 🪙, −20 🌾, Arès +4, ambiance +4)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Tu obtiendras beaucoup — en le gardant enchaîné trop longtemps. Zeus compte les jours. »',
            effet: (ctx) => {
              ctx.add('bronze', 140)
              ctx.relation('zeus', -8)
              ctx.morale(2, 'Un otage de valeur', 8 * MIN)
              return [
                'Les négociations traînent trois semaines ; le garçon dort dans la fosse à grain, aux fers.',
                'Le prix est superbe, la manière ne l’est pas. (+140 🪙, Zeus −8)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Son père viendra avec cinquante hommes plutôt qu’avec du métal. »',
            effet: (ctx) => {
              const vol = ctx.stealPct(0.15)
              const morts = ctx.loseSoldiers(1)
              ctx.morale(-9, 'Le père est venu en armes', 10 * MIN)
              return [
                'Le père arrive avec cinquante lances et ne discute pas : il reprend son fils et se paie lui-même.',
                `Perdu : ${vol}${morts ? `, et ${morts} des vôtres` : ''}. (Ambiance −9)`,
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Le rendre sans rançon, comme Achille rendit Hector',
        issues: [
          {
            p: 6,
            murmure: '« Geste noble. Ton village comptera le bronze perdu. »',
            effet: (ctx) => {
              ctx.relation('zeus', 18)
              ctx.relation('athena', 6)
              ctx.morale(-4, 'La rançon dédaignée', 8 * MIN)
              return [
                'On lui rend ses armes, son char et un pain pour la route. Zeus Hikésios voit tout.',
                'Les soldats, qui l’avaient pris, comptent en silence ce qu’ils n’auront pas. (Zeus +18, Athéna +6, ambiance −4)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Rends-le : son père enverra un présent que tu n’auras pas exigé. »',
            effet: (ctx) => {
              ctx.relation('zeus', 20)
              ctx.add('bronze', 30)
              ctx.morale(2, 'Générosité récompensée', 8 * MIN)
              return [
                'Un mois plus tard, un chariot dépose devant l’agora un cratère de bronze et un mot de remerciement.',
                'On n’avait rien demandé. (+30 🪙, Zeus +20, ambiance +2)',
              ]
            },
          },
          {
            p: 1,
            murmure: '« Fais-le. Les dieux te le rendront au centuple. »',
            effet: (ctx) => {
              ctx.relation('zeus', 22)
              ctx.faveur(20)
              ctx.morale(6, 'Le geste des héros', 10 * MIN)
              return [
                'Le garçon, en partant, verse une libation sur votre seuil et jure de ne jamais porter les armes contre vous.',
                'Le prêtre dit que la fumée du soir a formé une couronne. (+20 ✨, Zeus +22, ambiance +6)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'L’égorger sur le bûcher des nôtres',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('ares', 14)
              ctx.relation('zeus', -16)
              ctx.relation('athena', -8)
              ctx.morale(6, 'Nos morts sont vengés', 9 * MIN)
              return [
                'Comme Achille sur le bûcher de Patrocle. Le sang coule sur les cendres et les hommes crient.',
                'Arès boit cela comme du vin. (Arès +14, Zeus −16, Athéna −8, ambiance +6)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('ares', 16)
              ctx.relation('zeus', -20)
              ctx.morale(-5, 'Le sang d’un suppliant', 9 * MIN)
              return [
                'Le garçon a serré vos genoux et invoqué Zeus des suppliants avant qu’on le tranche.',
                'Même les soldats se sont détournés. (Arès +16, Zeus −20, ambiance −5)',
              ]
            },
          },
        ],
      }),
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
    cooldown: 15 * MIN,
    choices: [
      choix({
        label: 'Le tirer dans l’enceinte',
        issues: [
          {
            p: 4,
            murmure: '« Ce bois sent le cèdre et l’or. Un trésor votif oublié — fais-le entrer. »',
            effet: (ctx) => {
              ctx.add('bois', 200)
              ctx.add('bronze', 60)
              ctx.morale(6, 'Le présent des dieux', 9 * MIN)
              return [
                'Le ventre du cheval regorge d’offrandes votives : bronze ciselé, bois précieux, une coupe d’or.',
                'Un ex-voto abandonné par une armée pressée. (+200 🪵, +60 🪙, ambiance +6)',
              ]
            },
          },
          {
            p: 5,
            murmure: '« J’entends des respirations derrière les planches. Brûle-le. BRÛLE-LE. »',
            effet: (ctx) => {
              const vol = ctx.stealPct(0.35)
              const morts = ctx.loseSoldiers(2)
              ctx.morale(-12, 'Trahison du cheval de bois', 11 * MIN)
              return [
                'À la nuit, une trappe s’ouvre sous le ventre de la bête. Des hommes en armes se glissent vers les entrepôts…',
                `Ils pillent et s’enfuient avant l’alerte. Perdu : ${vol}${morts ? `, ${morts} soldat(s) tombé(s)` : ''}. (Ambiance −12)`,
              ]
            },
          },
          {
            p: 1,
            murmure: '« Il n’y a rien dedans. Rien du tout. Tu auras du bois de charpente. »',
            effet: (ctx) => {
              ctx.add('bois', 120)
              ctx.morale(-2, 'Beaucoup de bruit', 5 * MIN)
              return [
                'Après deux jours de veille armée, on démonte la bête : le ventre est vide, et le bois est bon.',
                'Le vieillard qui hurlait passe pour un fou, et le chef pour un anxieux. (+120 🪵, ambiance −2)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Le brûler sur place',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.add('bois', 20)
              ctx.relation('athena', 10)
              ctx.morale(2, 'Prudence récompensée', 7 * MIN)
              return [
                'Le bûcher monte haut et clair. Dans les flammes, certains jurent entendre des cris…',
                'La prudence est la moitié de la sagesse. (+20 🪵, Athéna +10, ambiance +2)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('athena', 10)
              ctx.relation('ares', 6)
              ctx.add('bronze', 30)
              ctx.morale(8, 'Le piège retourné', 10 * MIN)
              return [
                'Les planches s’effondrent sur onze hommes en armes qui ne sortiront pas. On récupère leurs lames dans la cendre.',
                'Le village dort très bien cette nuit-là. (+30 🪙, Athéna +10, Arès +6, ambiance +8)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'L’ouvrir à la hache, lances prêtes',
        requiert: (s) => armee(s) >= 2,
        requiertLabel: '2 soldats requis',
        issues: [
          {
            p: 5,
            effet: (ctx) => {
              ctx.add('bois', 150)
              ctx.add('bronze', 40)
              ctx.relation('athena', 6)
              return [
                'On perce le flanc en gardant les lances hautes : rien qu’un ventre d’offrandes et de sciure.',
                'Le bois démonté fait de belles poutres. (+150 🪵, +40 🪙, Athéna +6)',
              ]
            },
          },
          {
            p: 3,
            effet: (ctx) => {
              const morts = ctx.loseSoldiers(1)
              ctx.add('bronze', 50)
              ctx.relation('ares', 6)
              ctx.morale(-4, 'Combat sous le ventre du cheval', 8 * MIN)
              return [
                'Sept hommes jaillissent par la trappe et se battent comme des rats acculés.',
                `On les tue tous, au prix de ${morts || 'un'} des nôtres. Leurs armes valent quelque chose. (+50 🪙, Arès +6)`,
              ]
            },
          },
          {
            p: 2,
            effet: (ctx) => {
              ctx.add('bois', 180)
              ctx.relation('athena', -14)
              ctx.morale(-3, 'Une offrande profanée', 7 * MIN)
              return [
                'Sous les planches, une inscription : le cheval était consacré à Athéna par une armée en partance.',
                'On l’a mis en pièces à la hache. (+180 🪵, Athéna −14, ambiance −3)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'tribut-acheen',
    emoji: '⚔️',
    titre: 'Le héraut d’Agamemnon',
    texte:
      'Un héraut achéen plante sa lance devant la porte et parle sans descendre de char : « Le tiers de vos greniers et du métal pour l’Atride, ou nous reviendrons compter nous-mêmes. »',
    condition: (s) => s.threat >= 40,
    weight: 7,
    cooldown: 12 * MIN,
    choices: [
      choix({
        label: 'Payer le tribut (−150 🌾, −40 🪙)',
        cout: { grain: 150, bronze: 40 },
        issues: [
          {
            p: 6,
            murmure: '« Paie, et le héraut bavard te dira quand la prochaine colonne passe. »',
            effet: (ctx) => {
              ctx.morale(-8, 'Le chef a plié', 10 * MIN)
              ctx.relation('athena', 6)
              ctx.revealAttack()
              return [
                'Les chariots partent sous les yeux du village. Le héraut, satisfait, laisse échapper la date du prochain passage.',
                'Survivre est une ruse comme une autre. (Athéna +6, ambiance −8 — attaque révélée)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Ils prendront ton tribut, et ils reviendront quand même. »',
            effet: (ctx) => {
              ctx.morale(-12, 'Tribut payé pour rien', 11 * MIN)
              const vol = ctx.stealPct(0.1, ['grain'])
              return [
                'Le tribut chargé, la troupe s’attarde et « complète » elle-même la mesure dans les fermes du bas.',
                `Perdu en plus : ${vol}. (Ambiance −12)`,
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Refuser et cracher devant le héraut',
        issues: [
          {
            p: 5,
            murmure: '« Ils brûleront les fermes du dehors en partant. »',
            effet: (ctx) => {
              ctx.morale(10, 'La fierté du village', 10 * MIN)
              ctx.relation('ares', 12)
              const vol = ctx.stealPct(0.12, ['grain', 'bois'])
              return [
                'Le crachat atteint la roue du char. Le héraut part sans un mot — et met le feu aux granges du dehors.',
                `Perdu : ${vol}. Le village, lui, marche la tête haute. (Arès +12, ambiance +10)`,
              ]
            },
          },
          {
            p: 3,
            murmure: '« Ils éprouveront ta porte en partant, du talon et du bélier. »',
            effet: (ctx) => {
              ctx.morale(12, 'On ne paie pas l’Atride', 11 * MIN)
              ctx.relation('ares', 14)
              ctx.relation('zeus', 4)
              ctx.damageWallPct(0.1)
              return [
                'Avant de tourner bride, l’escorte éprouve la porte à coups de poutre : les gonds tiennent, le linteau se fend.',
                '(Remparts −10 %, Arès +14, Zeus +4, ambiance +12)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Un des tiens paiera ce crachat de sa vie, sur le seuil. »',
            effet: (ctx) => {
              ctx.morale(8, 'Fierté et deuil', 10 * MIN)
              ctx.relation('ares', 10)
              const morts = ctx.loseSoldiers(1)
              return [
                `L’escorte du héraut tue la sentinelle de gauche en repartant : ${morts || 'un'} des vôtres au sol.`,
                'Le village est fier et en deuil. (Arès +10, ambiance +8)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Négocier un serment contre du métal (−80 🪙)',
        cout: { bronze: 80 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('zeus', 8)
              ctx.relation('athena', 6)
              ctx.morale(-3, 'Le prix de la paix', 7 * MIN)
              return [
                'On sacrifie un porc sur la limite, on coupe les poils, on jure : le village est épargné pour une saison.',
                'Le coffre est plus léger, la nuit plus calme. (Zeus +8, Athéna +6, ambiance −3)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('zeus', 10)
              const vol = ctx.stealPct(0.08)
              ctx.morale(-6, 'Serment bafoué', 9 * MIN)
              return [
                'Le serment est prêté, puis rompu dès la lune suivante par une bande qui prétend n’en rien savoir.',
                `Perdu : ${vol}. Zeus, gardien des serments, a bien vu qui a parjuré. (Zeus +10, ambiance −6)`,
              ]
            },
          },
        ],
      }),
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
    cooldown: 6 * MIN,
    priorite: true,
    choices: [
      choix({
        label: 'Ouvrir les greniers (−150 🌾)',
        cout: { grain: 150 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.morale(15, 'Les greniers ont parlé', 10 * MIN)
              return ['Le grain distribué éteint les torches une à une. On vous acclame — pour cette fois. (Ambiance +15)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.morale(18, 'Le grain du temple partagé', 10 * MIN)
              ctx.faveur(-12)
              return [
                'Il faut ouvrir jusqu’aux réserves du temple pour que le dernier meneur baisse sa faux.',
                'Le prêtre note ce qui a été pris à l’autel. (−12 ✨, ambiance +18)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Promettre des jours meilleurs',
        issues: [
          {
            p: 6,
            murmure: '« Ils te croient. Ils ne te croiront pas deux fois. »',
            effet: (ctx) => {
              ctx.morale(8, 'Promesses du chef', 5 * MIN)
              ctx.schedule('promesse-mutins', 5 * MIN)
              return [
                'Votre discours calme la foule… pour l’instant.',
                'Si l’ambiance ne s’améliore pas vite, ils reviendront — et pas pour parler.',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Tu jures sur l’autel. Si tu manques à ta parole, Zeus s’en mêlera. »',
            effet: (ctx) => {
              ctx.morale(11, 'Serment du chef', 4 * MIN)
              ctx.relation('zeus', -4)
              ctx.schedule('promesse-mutins', 4 * MIN)
              return [
                'Pour être cru, il faut jurer sur l’autel, la main sur les cendres. La foule se disperse en silence.',
                'Un serment de plus à tenir, et Zeus tient les comptes. (Zeus −4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Réprimer par la force',
        requiert: (s) => armee(s) >= 3,
        requiertLabel: '3 soldats requis',
        issues: [
          {
            p: 5,
            murmure: '« Deux bannis, et un village qui te craindra sans t’aimer. »',
            effet: (ctx) => {
              ctx.pop(-2)
              ctx.morale(-10, 'Répression sanglante', 10 * MIN)
              ctx.relation('ares', 6)
              ctx.relation('zeus', -8)
              return [
                'Les lances dispersent la foule. Deux meneurs sont bannis. L’ordre règne — un ordre de cendres.',
                '(Population −2, Arès +6, Zeus −8, ambiance −10)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« N’ordonne pas cela. Un de tes lanciers refusera, et tu perdras les deux. »',
            effet: (ctx) => {
              ctx.pop(-3)
              const morts = ctx.loseSoldiers(1)
              ctx.morale(-16, 'Nuit de sang', 11 * MIN)
              ctx.relation('ares', 10)
              ctx.relation('zeus', -12)
              return [
                'Un lancier refuse de frapper son cousin et tombe avec lui. La place est nettoyée à la lance.',
                `Trois villageois et ${morts || 'un'} soldat sont morts. Personne ne vous regarde en face. (Arès +10, Zeus −12, ambiance −16)`,
              ]
            },
          },
          {
            p: 2,
            murmure: '« Range tes lances en silence : la foule livrera son meneur d’elle-même. »',
            effet: (ctx) => {
              ctx.pop(-1)
              ctx.morale(-4, 'Meneurs livrés', 8 * MIN)
              ctx.relation('ares', 8)
              return [
                'Devant les lances rangées, la foule livre elle-même son meneur et rentre chez elle.',
                'Un banni, aucun mort : de la chance, pas du talent. (Population −1, Arès +8, ambiance −4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Livrer votre intendant à la foule',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.pop(-1)
              ctx.morale(12, 'Un coupable trouvé', 9 * MIN)
              ctx.relation('athena', -8)
              ctx.relation('zeus', -6)
              return [
                'On pousse dehors le préposé aux greniers. La foule s’en occupe et rentre satisfaite.',
                'Le compte est faux : ce n’était pas lui. (Population −1, Athéna −8, Zeus −6, ambiance +12)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.pop(-1)
              ctx.morale(6, 'Un coupable insuffisant', 6 * MIN)
              ctx.relation('athena', -10)
              ctx.schedule('promesse-mutins', 4 * MIN)
              return [
                'La foule prend l’intendant, puis réclame le suivant sur la liste — et regarde vers vous.',
                'Il faut promettre encore pour finir la nuit. (Population −1, Athéna −10, ambiance +6)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'grenier-vide',
    emoji: '🥣',
    titre: 'LES GRENIERS SONNENT CREUX',
    texte:
      'On a balayé le fond des jarres. Les enfants mâchent des racines amères, les vieux ne mangent plus pour laisser leur part. Il faut trouver du grain avant trois jours.',
    condition: (s) => s.resources.grain < 25 && s.pop >= 6,
    weight: 22,
    cooldown: 8 * MIN,
    priorite: true,
    choices: [
      choix({
        label: 'Abattre le troupeau de reproduction',
        issues: [
          {
            p: 6,
            murmure: '« Vous mangerez. Et les saisons prochaines s’en souviendront. »',
            effet: (ctx) => {
              ctx.add('grain', 90)
              ctx.morale(4, 'On mange enfin', 8 * MIN)
              ctx.droughtFor(4 * MIN)
              return [
                'On égorge les bêtes portantes et les jeunes béliers. Le village mange de la viande deux semaines.',
                'Sans troupeau, les champs manqueront de fumier : la récolte restera basse un long moment. (+90 🌾)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Les bêtes sont déjà maigres. Tu tueras beaucoup pour peu. »',
            effet: (ctx) => {
              ctx.add('grain', 55)
              ctx.morale(1, 'Maigre viande', 6 * MIN)
              ctx.droughtFor(5 * MIN)
              return [
                'Les bêtes, affamées elles aussi, ne donnent que des carcasses osseuses.',
                'On a saigné l’avenir pour une semaine de bouillon. (+55 🌾)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Rationner et renvoyer les bouches inutiles',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.pop(-2)
              ctx.add('grain', 25)
              ctx.morale(-8, 'Rationnement', 9 * MIN)
              return [
                'Deux journaliers sans famille reprennent la route avec une galette chacun.',
                'Le reste du village mange une fois par jour. (Population −2, +25 🌾, ambiance −8)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.pop(-1)
              ctx.morale(-12, 'Faim et rancune', 10 * MIN)
              return [
                'Le rationnement tient huit jours, puis on vole dans les jarres et l’on se bat pour du son.',
                'Un vieux meurt avant la fin du mois. (Population −1, ambiance −12)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Acheter du grain aux Phéniciens (−90 🪙)',
        cout: { bronze: 90 },
        requiert: (s) => s.buildings.port.level >= 1,
        requiertLabel: 'port requis',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.add('grain', 170)
              ctx.morale(6, 'Le grain de la mer', 9 * MIN)
              return ['Deux cales d’orge égyptien remontent du port sur des ânes. Le village respire. (+170 🌾, ambiance +6)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.add('grain', 110)
              ctx.morale(-3, 'Grain avarié', 7 * MIN)
              return [
                'Le fond des sacs est moisi et le marchand connaît votre urgence : il double son prix et sourit.',
                '(+110 🌾, ambiance −3)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Prendre les réserves du temple',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.add('grain', 70)
              ctx.faveur(-25)
              ctx.relation('zeus', -12)
              ctx.morale(6, 'Le grain sacré partagé', 8 * MIN)
              return [
                'On descelle la porte du magasin sacré. L’orge des dieux nourrit les vivants.',
                'Le prêtre se voile la tête et ne parle plus au chef. (+70 🌾, −25 ✨, Zeus −12, ambiance +6)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.add('grain', 45)
              ctx.faveur(-25)
              ctx.relation('zeus', -18)
              ctx.relation('athena', -8)
              ctx.morale(3, 'Sacrilège pour un repas', 7 * MIN)
              return [
                'Les jarres du temple étaient à demi vides — et l’on a brisé deux offrandes votives en forçant la porte.',
                'Beaucoup de sacrilège pour peu de galettes. (+45 🌾, −25 ✨, Zeus −18, Athéna −8)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'peste',
    emoji: '☠️',
    titre: 'LA FIÈVRE',
    texte:
      'Une fièvre venue du camp achéen entre au village : d’abord les chiens, puis les mulets, puis les hommes. Le prêtre dit qu’un dieu décoche ses flèches ; les mères ne disent plus rien.',
    condition: (s) => s.pop >= 12 && s.morale < 55,
    weight: 18,
    cooldown: 15 * MIN,
    priorite: true,
    choices: [
      choix({
        label: 'Isoler les malades hors des murs',
        issues: [
          {
            p: 5,
            murmure: '« Dur, et efficace. Deux mourront seuls, le reste vivra. »',
            effet: (ctx) => {
              ctx.pop(-2)
              ctx.morale(-6, 'Les malades hors des murs', 9 * MIN)
              return [
                'On dresse des abris de branches à trois cents pas. On y porte l’eau au bout d’une perche.',
                'Deux n’en reviennent pas, la fièvre n’entre pas. (Population −2, ambiance −6)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Trop tard : elle est déjà dans les maisons du bas. »',
            effet: (ctx) => {
              ctx.pop(-3)
              ctx.morale(-11, 'La fièvre a gagné', 10 * MIN)
              return [
                'On isole les premiers malades — mais la contagion couvait déjà dans les maisons du bas.',
                'Trois bûchers en huit jours. (Population −3, ambiance −11)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Ta mesure est la bonne, et le village finira par le reconnaître. »',
            effet: (ctx) => {
              ctx.pop(-1)
              ctx.morale(-3, 'Quarantaine tenue', 7 * MIN)
              ctx.relation('athena', 8)
              return [
                'La quarantaine est tenue durement, sans exception, même pour la belle-sœur du chef.',
                'Un seul mort. Athéna respecte les décisions froides. (Population −1, Athéna +8, ambiance −3)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Grande hécatombe au temple (−100 🌾, −30 🪙)',
        cout: { grain: 100, bronze: 30 },
        issues: [
          {
            p: 5,
            murmure: '« La fumée sera acceptée. Un seul bûcher, et la fièvre reflue. »',
            effet: (ctx) => {
              ctx.pop(-1)
              ctx.faveur(20)
              ctx.relation('zeus', 10)
              ctx.morale(6, 'Le dieu apaisé', 10 * MIN)
              return [
                'Cent bêtes, ou presque, sur l’autel ; la fumée couvre le village trois jours durant.',
                'La fièvre reflue. Un seul enterrement. (Population −1, +20 ✨, Zeus +10, ambiance +6)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Tu brûleras tout pour rien. Le dieu n’écoute pas aujourd’hui. »',
            effet: (ctx) => {
              ctx.pop(-3)
              ctx.relation('zeus', 4)
              ctx.morale(-9, 'Les dieux n’ont pas entendu', 10 * MIN)
              return [
                'On brûle tout ce qu’on a. La fièvre emporte trois personnes de plus, dont le prêtre qui sacrifiait.',
                'Le grain est parti en fumée avec eux. (Population −3, Zeus +4, ambiance −9)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Fais-le. La fièvre tombera avant que les cendres refroidissent. »',
            effet: (ctx) => {
              ctx.faveur(28)
              ctx.relation('zeus', 12)
              ctx.morale(12, 'Le miracle du soir', 12 * MIN)
              return [
                'La fièvre tombe le soir même de l’hécatombe, d’un coup, comme un vent qui cesse.',
                'On en parlera pendant deux générations. (+28 ✨, Zeus +12, ambiance +12)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Soigner tout le monde, quoi qu’il en coûte (−80 🌾)',
        cout: { grain: 80 },
        issues: [
          {
            p: 5,
            murmure: '« Veillez-les tous. Il n’y aura qu’un bûcher, et une fierté qui restera. »',
            effet: (ctx) => {
              ctx.pop(-1)
              ctx.morale(8, 'Personne n’a été abandonné', 11 * MIN)
              ctx.relation('zeus', 6)
              return [
                'Bouillons, linges changés, veilles à tour de rôle : le village se soigne lui-même, maison par maison.',
                'Un seul mort, et une fierté qui durera. (Population −1, Zeus +6, ambiance +8)',
              ]
            },
          },
          {
            p: 3,
            murmure: '« Ne fais pas cela : tes veilleurs tomberont avec les malades. Quatre bûchers. »',
            effet: (ctx) => {
              ctx.pop(-4)
              ctx.morale(-13, 'La contagion générale', 11 * MIN)
              return [
                'À force de veiller les malades, les veilleurs tombent à leur tour. Quatre bûchers, dont deux enfants.',
                'On aurait dû fermer des portes. (Population −4, ambiance −13)',
              ]
            },
          },
          {
            p: 2,
            murmure: '« Soigne-les tous : la fièvre passera sans prendre personne. »',
            effet: (ctx) => {
              ctx.morale(12, 'Aucun mort', 12 * MIN)
              ctx.relation('athena', 8)
              return [
                'La fièvre passe sur le village sans prendre personne — quinze jours de veille et pas un bûcher.',
                'Les vieux appellent cela le miracle des linges propres. (Athéna +8, ambiance +12)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'seisme-poseidon',
    emoji: '🌋',
    titre: 'L’ÉBRANLEUR FRAPPE',
    texte:
      'Les chiens hurlent, l’eau des puits tremble, et un grondement roule sous les pieds. Poséidon, mécontent, essaie les fondations du village de son trident.',
    condition: (s) => s.gods.poseidon.relation <= -15 && s.buildings.remparts.level >= 1,
    weight: 14,
    cooldown: 15 * MIN,
    priorite: true,
    choices: [
      choix({
        label: 'Taureau noir jeté à la mer (−60 🌾, −25 🪙)',
        cout: { grain: 60, bronze: 25 },
        issues: [
          {
            p: 6,
            murmure: '« Il acceptera. La terre se rendormira avant l’aube. »',
            effet: (ctx) => {
              ctx.relation('poseidon', 22)
              ctx.morale(3, 'La terre rendormie', 8 * MIN)
              return [
                'La bête est poussée du haut de la falaise, cornes dorées. Le grondement cesse dans la nuit.',
                '(Poséidon +22, ambiance +3)',
              ]
            },
          },
          {
            p: 4,
            murmure: '« Il prendra le taureau ET une secousse. Il est comme cela. »',
            effet: (ctx) => {
              ctx.relation('poseidon', 18)
              ctx.damageWallPct(0.15)
              ctx.morale(-4, 'Le mur lézardé', 8 * MIN)
              return [
                'Le taureau tombe, la mer l’avale — et la terre tremble une dernière fois, par principe.',
                'Les remparts se lézardent. (Remparts −15 %, Poséidon +18, ambiance −4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Évacuer les maisons et laisser trembler',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.damageWallPct(0.35)
              ctx.morale(-6, 'Séisme', 9 * MIN)
              ctx.relation('poseidon', 8)
              return [
                'Tout le monde dort dehors trois nuits. Le sol ondule comme une mer, les murs crient.',
                'Pas un mort, mais l’enceinte est en mauvais état. (Remparts −35 %, Poséidon +8, ambiance −6)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.damageWallPct(0.45)
              ctx.pop(-1)
              ctx.morale(-11, 'Séisme meurtrier', 10 * MIN)
              ctx.relation('poseidon', 10)
              return [
                'Un pan de mur emporte une maison où un vieillard avait refusé de sortir.',
                'La dette est payée — dans la pierre et dans le sang. (Remparts −45 %, population −1, Poséidon +10, ambiance −11)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'colere-zeus',
    emoji: '⛈️',
    titre: 'La colère de Zeus',
    texte:
      'Des nuages noirs comme la poix s’amoncellent au-dessus du village. Le tonnerre roule sans une goutte de pluie : le Tonnant réclame son dû.',
    condition: (s) => s.gods.zeus.relation <= -40,
    weight: 25,
    cooldown: 10 * MIN,
    priorite: true,
    choices: [
      choix({
        label: 'Grande offrande (−80 🌾, −25 🪙)',
        cout: { grain: 80, bronze: 25 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('zeus', 25)
              return ['La fumée du sacrifice monte droit : Zeus retient sa foudre et les nuages se dispersent. (Zeus +25)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('zeus', 32)
              ctx.faveur(10)
              ctx.morale(4, 'Signe d’agrément', 8 * MIN)
              return [
                'La foudre tombe sur un chêne mort à cent pas de l’autel, sans blesser personne : signe accepté.',
                'Le prêtre y voit un pardon en règle. (Zeus +32, +10 ✨, ambiance +4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Ériger un autel de pierre au Tonnant (−120 🪨)',
        cout: { pierre: 120 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('zeus', 18)
              ctx.faveur(8)
              ctx.morale(3, 'L’autel du Tonnant', 8 * MIN)
              return [
                'Un autel de dalles noires, au point le plus haut du village. L’orage tourne et s’en va.',
                'Ces pierres n’iront pas au rempart. (Zeus +18, +8 ✨, ambiance +3)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('zeus', 14)
              ctx.morale(-4, 'Des pierres mal employées', 8 * MIN)
              return [
                'L’autel est monté en hâte et de travers ; une dalle glisse et brise le pied d’un tailleur.',
                'Le ciel se dégage quand même, un peu. (Zeus +14, ambiance −4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Subir l’orage',
        issues: [
          {
            p: 5,
            murmure: '« La foudre prendra tes greniers et tes charpentes, et la dette sera soldée. »',
            effet: (ctx) => {
              const vol = ctx.stealPct(0.25, ['bois', 'grain'])
              ctx.morale(-8, 'L’orage de Zeus', 9 * MIN)
              ctx.relation('zeus', 10)
              return [`La foudre embrase greniers et charpentes. Perdu : ${vol}. La dette est payée — dans les flammes. (Zeus +10)`]
            },
          },
          {
            p: 3,
            murmure: '« Onze coups cette nuit, et une tour de guet en cendres. Paie plutôt. »',
            effet: (ctx) => {
              const vol = ctx.stealPct(0.3)
              ctx.damageWallPct(0.1)
              ctx.morale(-11, 'La nuit de la foudre', 10 * MIN)
              ctx.relation('zeus', 12)
              return [
                'Onze coups en une nuit. Une tour de guet flambe jusqu’aux fondations.',
                `Perdu : ${vol}, et l’enceinte est fendue. (Remparts −10 %, Zeus +12, ambiance −11)`,
              ]
            },
          },
          {
            p: 2,
            murmure: '« Garde ton grain : l’orage sera court et ne prendra qu’un toit de chaume. »',
            effet: (ctx) => {
              const vol = ctx.stealPct(0.12, ['grain'])
              ctx.morale(-4, 'Orage bref', 6 * MIN)
              ctx.relation('zeus', 8)
              return [
                'L’orage crève enfin, arrose tout, emporte un toit de chaume et s’en va vers la mer.',
                `Perdu : ${vol}. On s’attendait à pire. (Zeus +8, ambiance −4)`,
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'colere-poseidon',
    emoji: '🌊',
    titre: 'L’Ébranleur gronde',
    texte:
      'La mer se retire d’un jet de pierre puis revient en claquant. L’eau des puits a un goût de sel. Poséidon, qu’on a offensé, caresse les fondations du village.',
    condition: (s) => s.gods.poseidon.relation <= -40,
    weight: 25,
    cooldown: 10 * MIN,
    priorite: true,
    choices: [
      choix({
        label: 'Apaiser la mer (−60 🌾, −20 🪙)',
        cout: { grain: 60, bronze: 20 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('poseidon', 25)
              return ['Un taureau noir est offert aux flots au bout de la jetée. La terre se rendort. (Poséidon +25)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('poseidon', 20)
              ctx.faveur(12)
              ctx.morale(4, 'La mer rendue calme', 8 * MIN)
              return [
                'Le taureau à peine englouti, la mer se couche comme de l’huile et les puits redeviennent doux.',
                'Les pêcheurs rentrent lourds trois jours de suite. (Poséidon +20, +12 ✨, ambiance +4)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Renoncer à la mer une saison',
        requiert: (s) => s.buildings.port.level >= 1,
        requiertLabel: 'port requis',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('poseidon', 18)
              ctx.add('bronze', -40)
              ctx.morale(-4, 'Barques à sec', 8 * MIN)
              return [
                'Les barques restent tirées sur le sable, les filets pendus aux poutres. Le dieu apprécie l’aveu.',
                'Le commerce, lui, s’arrête. (−40 🪙, Poséidon +18, ambiance −4)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('poseidon', 14)
              ctx.add('bronze', -25)
              ctx.morale(-7, 'Les pêcheurs en colère', 9 * MIN)
              return [
                'Trois familles de pêcheurs sortent quand même, de nuit. On les ramène, et l’une manque un homme.',
                'Le dieu n’est qu’à demi satisfait, et le port gronde. (−25 🪙, Poséidon +14, ambiance −7)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Subir le séisme',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.damageWallPct(0.4)
              ctx.morale(-6, 'Séisme', 9 * MIN)
              ctx.relation('poseidon', 10)
              return ['Le sol ondule comme une mer : les remparts se lézardent. La dette est payée — dans la pierre. (Remparts −40 %, Poséidon +10)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.damageWallPct(0.25)
              const vol = ctx.stealPct(0.15, ['pierre', 'bois'])
              ctx.morale(-8, 'Séisme et éboulement', 10 * MIN)
              ctx.relation('poseidon', 12)
              return [
                'La secousse épargne le rempart mais éventre les hangars, et la carrière s’éboule sur ses réserves.',
                `Perdu : ${vol}. (Remparts −25 %, Poséidon +12, ambiance −8)`,
              ]
            },
          },
        ],
      }),
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
    cooldown: 10 * MIN,
    priorite: true,
    choices: [
      choix({
        label: 'Offrande d’armes ciselées (−40 🪙)',
        cout: { bronze: 40 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('athena', 25)
              return ['Un bouclier gravé de chouettes est suspendu au temple. La concorde revient au conseil. (Athéna +25)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('athena', 30)
              ctx.faveur(10)
              ctx.morale(3, 'Le conseil réconcilié', 8 * MIN)
              return [
                'Le travail est si beau que les deux familles en litige se disputent l’honneur de le porter au temple.',
                'Elles finissent par y aller ensemble. (Athéna +30, +10 ✨, ambiance +3)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Remettre le conseil aux anciens',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('athena', 12)
              ctx.faveur(-10)
              ctx.morale(-5, 'Un chef effacé', 8 * MIN)
              return [
                'Trois vieillards tranchent les litiges sous le figuier, lentement, sagement, interminablement.',
                'On ne décide plus rien vite, et le chef paraît petit. (Athéna +12, −10 ✨, ambiance −5)',
              ]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('athena', 16)
              ctx.morale(-8, 'Le conseil des vieillards', 9 * MIN)
              ctx.relation('ares', -6)
              return [
                'Les anciens jugent bien — et décident aussi de tout le reste, y compris de la garde du mur.',
                'La garnison n’obéit plus qu’à moitié. (Athéna +16, Arès −6, ambiance −8)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Laisser la discorde courir',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.morale(-15, 'Discorde dans le village', 10 * MIN)
              ctx.relation('athena', 10)
              return ['Les querelles empoisonnent chaque veillée ; on se parle par cris ou pas du tout. (Athéna +10, ambiance −15)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.morale(-10, 'Discorde et départs', 10 * MIN)
              ctx.pop(-1)
              ctx.relation('athena', 12)
              return [
                'Une famille, lasse des procès de bornage, charge sa mule et s’en va vers la côte.',
                'Le silence qu’elle laisse vaut mieux que ses cris. (Population −1, Athéna +12, ambiance −10)',
              ]
            },
          },
        ],
      }),
    ],
  },
  {
    id: 'colere-ares',
    emoji: '🐗',
    titre: 'Arès sème la zizanie',
    texte:
      'Dans la caserne, les rixes éclatent pour un regard. Le dieu de la guerre, vexé, souffle la violence au cœur de vos soldats — ou leur murmure d’aller vendre leur lance ailleurs.',
    condition: (s) => s.gods.ares.relation <= -40 && armee(s) >= 2,
    weight: 25,
    cooldown: 10 * MIN,
    priorite: true,
    choices: [
      choix({
        label: 'Solde d’honneur (−50 🪙)',
        cout: { bronze: 50 },
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              ctx.relation('ares', 25)
              return ['Le bronze sonnant calme les esprits — Arès aime qu’on paie le prix du sang. (Arès +25)']
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              ctx.relation('ares', 20)
              ctx.morale(-5, 'Une troupe qui se sait payée', 8 * MIN)
              return [
                'La solde distribuée, la garnison boit trois jours et casse deux portes.',
                'Elle vous obéit — et sait désormais ce qu’elle vaut. (Arès +20, ambiance −5)',
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Organiser un duel rituel devant l’autel',
        requiert: (s) => armee(s) >= 2,
        requiertLabel: '2 soldats requis',
        issues: [
          {
            p: 5,
            effet: (ctx) => {
              ctx.relation('ares', 18)
              ctx.morale(4, 'Le duel a purgé la caserne', 8 * MIN)
              return [
                'Deux meneurs de rixe s’affrontent à la lance mouchetée devant tout le village. Sang au bras, honneur sauf.',
                'La caserne se tait pour un mois. (Arès +18, ambiance +4)',
              ]
            },
          },
          {
            p: 5,
            effet: (ctx) => {
              ctx.relation('ares', 22)
              const morts = ctx.loseSoldiers(1)
              ctx.morale(-6, 'Un duel qui tue', 9 * MIN)
              return [
                'La lance dérape sous la garde : un homme meurt sur la place, devant l’autel du dieu.',
                `${morts || 'Un'} soldat de moins, et Arès parfaitement satisfait. (Arès +22, ambiance −6)`,
              ]
            },
          },
        ],
      }),
      choix({
        label: 'Laisser faire',
        issues: [
          {
            p: 6,
            effet: (ctx) => {
              const n = ctx.loseSoldiers(2)
              ctx.morale(-5, 'Désertions', 9 * MIN)
              ctx.relation('ares', 10)
              return [`${n} soldat(s) franchissent la porte de nuit, baluchon sur la lance. (Arès +10, ambiance −5)`]
            },
          },
          {
            p: 4,
            effet: (ctx) => {
              const n = ctx.loseSoldiers(1)
              ctx.morale(-9, 'Rixe mortelle', 10 * MIN)
              ctx.relation('ares', 14)
              return [
                'La rixe de la caserne finit au couteau : un mort, deux blessés, et personne pour dire qui a commencé.',
                `${n || 'Un'} soldat en moins. (Arès +14, ambiance −9)`,
              ]
            },
          },
        ],
      }),
    ],
  },
]

export const EVENTS_BY_ID: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]))
