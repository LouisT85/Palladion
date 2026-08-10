import {
  INTERREGNE_GRAIN_MAX,
  INTERREGNE_MORALE_MAX,
  TRAITS_PAR_ID,
  ageDuChef,
  candidats,
  coutInterregne,
  effetsChef,
} from '../../game/successions'
import { jourDe, useGame } from '../../game/store'

/*
 * ═══════════════════════ LE TRÔNE ═══════════════════════
 *
 * Deux états, deux blocs, et le second est un CHOIX qu'on ne doit pas pouvoir
 * faire à la légère.
 *
 * Le bloc vit dans le RECENSEMENT et non dans un panneau à lui, et ce n'est pas
 * une économie de place : le chef est un habitant devenu autre chose, ses
 * prétendants sont dans cette liste, et couronner l'un d'eux en retire un de la
 * liste. Mettre la succession ailleurs aurait séparé la décision de ce qu'elle
 * coûte. La barre du haut, elle, ne gagne aucun bouton - elle en compte déjà dix.
 *
 * CE QUE LA CARTE D'UN PRÉTENDANT DOIT MONTRER AVANT LE CLIC : son âge (un homme
 * de cinquante ans fera un règne court), son MÉTIER - car le village le perd -
 * et ses deux traits en clair. Sans les traits, « choisir un héritier » serait
 * tirer à l'aveugle ; sans le métier, on ne verrait pas le prix.
 */

/** ce que le chef en place change au règne, en une liste lisible */
function TraitsDuChef({ traits }: { traits: string[] }) {
  if (traits.length === 0) {
    return (
      <div className="trone-fondateur">
        Fondateur : il n’a hérité de personne, et son règne est la mesure de tous les autres. Le tempérament entrera
        dans la dynastie à la première succession.
      </div>
    )
  }
  return (
    <ul className="trone-traits">
      {traits.map((id) => {
        const t = TRAITS_PAR_ID[id]
        if (!t) return null
        return (
          <li key={id}>
            <span className="trone-trait-nom">
              {t.emoji} {t.nom}
            </span>
            <span className="trone-trait-effet">{t.effet}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function BlocTrone() {
  const s = useGame()
  const jour = jourDe(s)
  const chef = s.dynastie?.chef ?? null
  const vacance = s.dynastie?.vacanceDepuis ?? null

  if (chef) {
    const age = ageDuChef(chef, jour)
    const regne = Math.max(1, jour - chef.depuis)
    const passes = s.dynastie.passes ?? []
    return (
      <div className="bloc">
        <h3>Le sceptre</h3>
        <div className="trone-chef">
          <div className="trone-tete">
            <span className="trone-emoji">👑</span>
            <div>
              <div className="trone-nom">
                {chef.nom} des {chef.lignee}
              </div>
              <div className="trone-sous">
                {age} ans · règne depuis {regne} journée{regne > 1 ? 's' : ''}
                {passes.length > 0 && ` · ${passes.length + 1}ᵉ chef de la cité`}
              </div>
            </div>
          </div>
          <TraitsDuChef traits={chef.traits} />
          {age >= 60 && (
            <div className="trone-avertit">
              ⚱️ Il se fait vieux. Songez à qui, dans les maisons, pourrait prendre le sceptre - et à quel métier le
              village peut se passer.
            </div>
          )}
        </div>
        {passes.length > 0 && (
          <details className="trone-passes">
            <summary>Les règnes d’avant ({passes.length})</summary>
            <ul>
              {[...passes].reverse().map((p, i) => (
                <li key={i}>
                  {p.nom} des {p.lignee} — {p.jours} journée{p.jours > 1 ? 's' : ''}, mort à {p.mortA} ans
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    )
  }

  // ── le trône est vide ──
  const cout = coutInterregne(vacance, jour)
  const liste = candidats(s.villageois, jour, s.dynastie?.passes.at(-1)?.lignee ?? null)
  return (
    <div className="bloc trone-vacant">
      <h3>⚱️ Le trône est vide</h3>
      <div className="trone-interregne">
        Interrègne depuis {cout.jours} journée{cout.jours > 1 ? 's' : ''} : ambiance {cout.morale}, récoltes{' '}
        {Math.round(cout.grainPct * 100)} %.
        {cout.morale <= -INTERREGNE_MORALE_MAX && cout.grainPct <= -INTERREGNE_GRAIN_MAX ? (
          <> Le prix ne monte plus - un village sans chef s’étiole, il ne s’effondre pas.</>
        ) : (
          <> Le prix monte chaque journée, jusqu’à un plafond.</>
        )}
      </div>
      {liste.length === 0 ? (
        <div className="trone-personne">
          Aucun adulte des maisons ne peut prendre le sceptre. Il faut attendre qu’un enfant grandisse, ou qu’un
          arrivant de la côte se présente.
        </div>
      ) : (
        <>
          <div className="trone-consigne">
            Couronner un héritier le retire du village : vous perdez un bras, et son métier avec lui.
          </div>
          <div className="trone-candidats">
            {liste.map((c) => {
              const e = effetsChef(c.traits)
              return (
                <div key={c.id} className={`trone-candidat${c.duSang ? ' du-sang' : ''}`}>
                  <div className="trone-tete">
                    <div>
                      <div className="trone-nom">
                        {c.nom} des {c.lignee}
                      </div>
                      <div className="trone-sous">
                        {c.age} ans · {c.metierNom}
                        {c.duSang && <span className="trone-sang"> · du sang du défunt</span>}
                      </div>
                    </div>
                  </div>
                  <TraitsDuChef traits={c.traits} />
                  {e.morale !== 0 && (
                    <div className="trone-humeur">
                      Le village {e.morale > 0 ? 'l’aimera' : 'le craindra'} ({e.morale > 0 ? '+' : ''}
                      {e.morale} d’ambiance en permanence)
                    </div>
                  )}
                  <button className="principal" style={{ width: '100%' }} onClick={() => s.couronner(c.id)}>
                    Le couronner — le village perd son {c.metierNom.toLowerCase()}
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
