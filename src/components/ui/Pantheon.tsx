import { GODS, GOD_IDS } from '../../game/data'
import { coutBenediction, useGame } from '../../game/store'

export function Pantheon() {
  const s = useGame()
  const templeLevel = s.buildings.temple.level
  const now = s.lastSeen

  return (
    <div className="voile" onClick={() => s.openPanel(null)}>
      <div className="modale" onClick={(e) => e.stopPropagation()}>
        <h2>⚡ Le Panthéon</h2>
        <div style={{ color: '#93a7b4', fontSize: 13 }}>
          Faveur : <b style={{ color: '#e8c04a' }}>{Math.floor(s.faveur)}</b>/100 — vos choix façonnent vos relations avec
          les Olympiens. Un dieu bafoué (relation ≤ −40) finit toujours par se venger.
        </div>
        {GOD_IDS.map((g) => {
          const dieu = GODS[g]
          const etat = s.gods[g]
          const verrouille = templeLevel < dieu.temple
          const cout = coutBenediction(s, g)
          const cd = Math.max(0, etat.cooldownUntil - now)
          const posRelation = ((etat.relation + 100) / 200) * 100
          return (
            <div key={g} className={`dieu${verrouille ? ' verrouille' : ''}`}>
              <div className="embleme">{dieu.emoji}</div>
              <div className="corps">
                <h3 style={{ color: dieu.couleur }}>{dieu.nom}</h3>
                <div className="titre-dieu">{dieu.titre}</div>
                <div style={{ fontSize: 12.5, color: '#cfc4a8' }}>{dieu.desc}</div>
                <div className="relation" title={`Relation : ${etat.relation}`}>
                  <div className="curseur" style={{ left: `${posRelation}%` }} />
                </div>
                {verrouille ? (
                  <div style={{ fontSize: 12, color: '#d98a4e' }}>🏛️ Temple niveau {dieu.temple} requis</div>
                ) : (
                  <>
                    <div style={{ fontSize: 12.5 }}>
                      <b>{dieu.benediction.nom}</b> <span style={{ color: '#93a7b4' }}>({cout} ✨{dieu.benediction.batailleUniquement ? ', en bataille' : ''})</span>
                      <div style={{ color: '#93a7b4' }}>{dieu.benediction.desc}</div>
                    </div>
                    <div className="actions-dieu">
                      <button
                        disabled={s.faveur < cout || cd > 0 || (dieu.benediction.batailleUniquement && !s.battle)}
                        onClick={() => s.benir(g)}
                      >
                        {cd > 0 ? `⏳ ${Math.ceil(cd / 1000)}s` : `Invoquer (${cout} ✨)`}
                      </button>
                      <button disabled={s.resources.grain < 50} onClick={() => s.sacrifier(g)} title="+8 relation, +5 faveur">
                        Sacrifice (−50 🌾)
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
        <button style={{ width: '100%', marginTop: 14 }} onClick={() => s.openPanel(null)}>
          Fermer
        </button>
      </div>
    </div>
  )
}
