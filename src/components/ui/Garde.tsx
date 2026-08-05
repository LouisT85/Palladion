import { Component, type ErrorInfo, type ReactNode } from 'react'
import { UNITS, UNIT_IDS } from '../../game/data'
import { cleEmplacement, emplacementActif, exporterTexte } from '../../game/sauvegardes'
import type { ResourceId, UnitId } from '../../game/types'
import { Belier, Bonhomme, Char, lookUnite } from '../map/BatailleLayer'
import { Montant } from './Icones'

/*
 * ═══════════════════ LE GARDE-FOU ═══════════════════
 *
 * Quand un rendu jetait, React vidait la page : le joueur se retrouvait devant
 * un rectangle noir, sans un mot, sans savoir si c'était son navigateur, sa
 * sauvegarde ou le jeu. Et sans moyen de sauver ce qu'il avait joué.
 *
 * Ce garde attrape la faute et rend trois choses :
 *
 *  · CE QUI S'EST PASSÉ, en clair, avec les premières lignes de la pile -
 *    de quoi le rapporter utilement ;
 *  · SA SAUVEGARDE, exportable en un clic AVANT toute réparation. On ne
 *    propose jamais d'effacer quoi que ce soit sans avoir offert de l'emporter ;
 *  · DEUX SORTIES : réessayer (une faute passagère se dissipe), ou repartir
 *    d'une partie neuve, ce qui est le dernier recours et le dit.
 */

interface Etat {
  erreur: Error | null
  pile: string
}

export class GardeFou extends Component<{ children: ReactNode }, Etat> {
  state: Etat = { erreur: null, pile: '' }

  static getDerivedStateFromError(erreur: Error): Partial<Etat> {
    return { erreur }
  }

  componentDidCatch(erreur: Error, info: ErrorInfo): void {
    // la pile des composants dit OÙ, la pile JS dit QUOI : on garde les deux
    this.setState({ pile: `${erreur.stack ?? ''}\n${info.componentStack ?? ''}`.trim() })
    console.error('PALLADION - le rendu a échoué :', erreur, info.componentStack)
  }

  private exporter = (): void => {
    const texte = exporterTexte(emplacementActif())
    if (!texte) return
    const url = URL.createObjectURL(new Blob([texte], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `palladion-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  private repartir = (): void => {
    try {
      localStorage.removeItem(cleEmplacement(emplacementActif()))
    } catch {
      // stockage inaccessible : le rechargement fera au mieux
    }
    location.reload()
  }

  render(): ReactNode {
    const { erreur, pile } = this.state
    if (!erreur) return this.props.children
    return (
      <div className="garde-fou">
        <div className="gf-carte">
          <h1>🏛️ Le jeu s’est arrêté</h1>
          <p>
            Une faute a interrompu l’affichage. Votre partie est <b>intacte dans le navigateur</b> - rien n’a été
            effacé. Emportez-la avant toute chose : c’est le seul geste qui ne se rattrape pas.
          </p>
          <div className="gf-erreur">
            <b>{erreur.message || 'erreur inconnue'}</b>
            {pile && <pre>{pile.split('\n').slice(0, 8).join('\n')}</pre>}
          </div>
          <div className="gf-actions">
            <button className="principal" onClick={this.exporter}>
              💾 Exporter ma sauvegarde
            </button>
            <button onClick={() => location.reload()}>↻ Réessayer</button>
            <button className="danger" onClick={this.repartir}>
              🗑️ Repartir d’une partie neuve
            </button>
          </div>
          <p className="gf-note">
            « Réessayer » recharge la page : une faute passagère se dissipe souvent ainsi. « Repartir » efface
            l’emplacement en cours - à ne faire qu’après avoir exporté.
          </p>
        </div>
      </div>
    )
  }
}

/*
 * ═══════════════ QUI SERT À QUOI - LA GARNISON EN UN COUP D'ŒIL ═══════════════
 *
 * Trois unités sont arrivées après les autres, moins chères, et personne ne
 * savait ce qu'elles apportaient : la caserne affiche des chiffres (⚔ 5 ❤ 22),
 * or un chiffre ne dit pas un RÔLE. Un frondeur à 5 d'attaque n'est pas « un
 * mauvais lancier », c'est un tirailleur qu'on lève à neuf quand on n'a pas de
 * bronze - et cela, aucune statistique ne le raconte.
 *
 * Ce panneau donne à chaque unité trois choses, dans cet ordre de lecture :
 *
 *  · SA FIGURINE, celle-là même qu'on verra courir sur le champ de bataille
 *    (`lookUnite`) - l'icône enseigne la silhouette, pas l'inverse ;
 *  · SON RÔLE en deux mots, sur une étiquette de couleur ;
 *  · CE QU'ON REGARDE pour la reconnaître dans la mêlée - la fronde qui tourne,
 *    le croissant du peltê - parce que reconnaître, c'est jouer.
 */

interface RoleUnite {
  /** deux mots, jamais plus : c'est une étiquette, pas une phrase */
  role: string
  /** la couleur de l'étiquette - même famille pour les rôles voisins */
  ton: string
  /** ce qu'elle fait, et ce qu'elle ne fait pas */
  quoi: string
  /** à quoi on la reconnaît sur le champ de bataille */
  marque: string
}

const ROLES: Record<UnitId, RoleUnite> = {
  lancier: {
    role: 'Milice',
    ton: '#5f86b5',
    quoi: 'Le rang de base. Tient la ligne, se lève en nombre, ne décide rien seul.',
    marque: 'longue lance et bouclier rond, casque simple',
  },
  archer: {
    role: 'Tireur de rempart',
    ton: '#6f9a52',
    quoi: 'Tire du haut du mur, hors d’atteinte tant qu’il tient. Sans mur, il ne vaut presque rien.',
    marque: 'arc bandé devant lui, carquois dans le dos, aucun bouclier',
  },
  hoplite: {
    role: 'Mur de boucliers',
    ton: '#e0bc5c',
    quoi: 'L’élite. Le grand aspis couvre l’homme entier : il encaisse et il tient. Il coûte le bronze de six frondeurs.',
    marque: 'un bloc - grand bouclier, cimier de crin, cnémides de bronze',
  },
  frondeur: {
    role: 'Tirailleur',
    ton: '#9ab06a',
    quoi: 'Le moins cher, et pas un gramme de bronze : le soldat d’un village pauvre. Tire du rempart aux deux tiers d’un arc, et tombe vite.',
    marque: 'la fronde qui tourne au-dessus de sa tête, bonnet de feutre, besace de pierres',
  },
  peltaste: {
    role: 'Éclaireur',
    ton: '#d98a4e',
    quoi: 'Court deux fois plus vite qu’un hoplite et fond droit sur les tireurs adverses. La meilleure troupe hors des murs.',
    marque: 'le peltê échancré en croissant de lune, javelots en faisceau, jambes nues',
  },
  belier: {
    role: 'Machine',
    ton: '#c0563f',
    quoi: 'Abat les murailles à la place de vos hommes. Inutile en défense : on ne défend pas un village avec un bélier.',
    marque: 'ce n’est pas un homme - charpente sous peaux et tête de bronze',
  },
  char: {
    role: 'Attelage',
    ton: '#c9a441',
    quoi:
      'Le plus rapide de la Troade : il traverse la plaine et fond sur les tireurs et les machines avant qu’ils n’aient tiré deux fois. Cher, fragile sous les flèches, et sans effet sur une muraille.',
    marque: 'la seule silhouette couchée du champ - deux chevaux, une roue haute, la lance dressée',
  },
}

/**
 * La figurine de l'unité, telle quelle. Le cadrage diffère pour la machine :
 * un bélier est large et bas là où un homme est haut et étroit.
 */
function Vignette({ type }: { type: UnitId }) {
  const look = lookUnite(type)
  // bélier et char sont larges et bas là où un homme est haut et étroit
  const machine = look === 'belier' || look === 'char'
  return (
    <svg
      width={machine ? 74 : 54}
      height={machine ? 42 : 54}
      viewBox={machine ? '-22 -20 40 23' : '-13.5 -24 29 27'}
      role="img"
      aria-label={UNITS[type].nom}
      style={{ flex: '0 0 auto', overflow: 'visible' }}
    >
      <title>{UNITS[type].nom}</title>
      {look === 'belier' ? <Belier /> : look === 'char' ? <Char /> : <Bonhomme {...look} anim="idle" seed={0.42} />}
    </svg>
  )
}

/**
 * Le tableau des rôles. `army` est facultatif : le panneau sert aussi bien à
 * lire sa garnison qu'à choisir ce qu'on va lever.
 */
export function RolesGarnison({ army }: { army?: Record<UnitId, number> }): ReactNode {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {UNIT_IDS.map((u) => {
        const def = UNITS[u]
        const r = ROLES[u]
        return (
          <div
            key={u}
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              padding: '8px 10px',
              borderRadius: 8,
              background: '#16232f',
              border: '1px solid #2c3d4d',
              borderLeft: `3px solid ${r.ton}`,
            }}
          >
            <Vignette type={u} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <b style={{ color: '#f0e8d8', fontSize: 13 }}>{def.nom}</b>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: 0.3,
                    color: r.ton,
                    border: `1px solid ${r.ton}66`,
                    borderRadius: 999,
                    padding: '1px 7px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.role}
                </span>
                {army && (
                  <span style={{ fontSize: 11.5, color: '#93a7b4' }}>
                    ×{army[u]} sous les armes
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: '#cfc4a8', marginTop: 3, lineHeight: 1.35 }}>{r.quoi}</div>
              <div style={{ fontSize: 11, color: '#8fa3b0', marginTop: 3, lineHeight: 1.3 }}>
                <span style={{ color: r.ton }}>On la reconnaît à</span> {r.marque}.
              </div>
              <div style={{ fontSize: 11, color: '#93a7b4', marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span>
                  ⚔{def.atk} ❤{def.hp}
                  {def.wallDps >= 20 ? ' 🧱' + def.wallDps : ''}
                </span>
                <span style={{ display: 'inline-flex', gap: 6 }}>
                  {(Object.entries(def.cost) as [ResourceId, number][]).map(([res, n]) => (
                    <Montant key={res} n={n} id={res} taille={12} />
                  ))}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
