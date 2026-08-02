import { Component, type ErrorInfo, type ReactNode } from 'react'
import { cleEmplacement, emplacementActif, exporterTexte } from '../../game/sauvegardes'

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
