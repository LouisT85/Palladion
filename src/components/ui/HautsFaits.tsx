import { useState } from 'react'
import {
  CATEGORIES,
  HAUTS_FAITS,
  POINTS_TOTAUX,
  detailPrestige,
  titrePrestige,
  type CategorieHF,
} from '../../game/hautsfaits'
import { snapHautFait, useGame } from '../../game/store'
import { Astuce } from './Infobulle'
import { Modale } from './Modale'

/*
 * Le tableau d'honneur. Il doit répondre à deux questions en un coup d'œil :
 * « qu'est-ce que j'ai accompli ? » et « qu'est-ce que je vaux ? ». Le détail du
 * prestige est donc affiché ligne à ligne - un score opaque n'apprend rien.
 */

const ORDRE: CategorieHF[] = ['batisseur', 'guerre', 'divin', 'peuple', 'legende']

export function PanneauHautsFaits() {
  const s = useGame()
  const [confirme, setConfirme] = useState(false)
  const acquis = s.hautsFaits ?? []
  const detail = detailPrestige(snapHautFait(s), acquis)
  const score = detail.reduce((a, d) => a + d.points, 0)
  const t = titrePrestige(score)
  const gagnes = acquis.reduce((a, id) => a + (HAUTS_FAITS.find((h) => h.id === id)?.points ?? 0), 0)
  const enBataille = s.battle !== null || (s.expedition !== null && !s.expedition.result)

  return (
    <Modale titre="🏅 Hauts faits et prestige" large onFermer={() => s.openPanel(null)}>
      <>
        <div className="prestige-bloc">
          <div className="prestige-score">
            <span className="chiffre">{score}</span>
            <span className="unite">points de prestige</span>
          </div>
          <div className="prestige-titre">
            <b>{t.titre}</b>
            <span>{t.desc}</span>
          </div>
          <div className="prestige-detail">
            {detail
              .filter((d) => d.points !== 0)
              .map((d) => (
                <span key={d.label}>
                  {d.label} <b>{d.points}</b>
                </span>
              ))}
          </div>
        </div>

        <div style={{ color: '#93a7b4', fontSize: 13, marginTop: 12 }}>
          <b style={{ color: '#e8c04a' }}>
            {acquis.length}/{HAUTS_FAITS.length}
          </b>{' '}
          hauts faits - {gagnes}/{POINTS_TOTAUX} points. Un haut fait gagné l’est pour toujours, même si l’on perd
          ensuite ce qui l’a permis.
        </div>

        {ORDRE.map((cat) => {
          const liste = HAUTS_FAITS.filter((h) => h.cat === cat)
          const faits = liste.filter((h) => acquis.includes(h.id)).length
          return (
            <div key={cat}>
              <h3 className="heros-section">
                {CATEGORIES[cat].emoji} {CATEGORIES[cat].nom}
                <span style={{ color: '#93a7b4', fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                  {faits}/{liste.length}
                </span>
              </h3>
              <div className="hf-grille">
                {liste.map((h) => {
                  const ok = acquis.includes(h.id)
                  return (
                    <Astuce
                      key={h.id}
                      titre={`${ok ? h.emoji : '🔒'} ${h.titre}`}
                      resume={h.desc}
                      lignes={[{ label: 'Prestige', valeur: `+${h.points}`, fort: ok, couleur: ok ? '#12c97c' : undefined }]}
                      note={ok ? 'Acquis - un haut fait ne se reprend jamais.' : 'Pas encore accompli.'}
                    >
                      <div className={`hf${ok ? ' obtenu' : ''}`}>
                        <span className="hf-emoji">{ok ? h.emoji : '🔒'}</span>
                        <span className="hf-corps">
                          <b>{h.titre}</b>
                          <span className="hf-desc">{h.desc}</span>
                        </span>
                        <span className="hf-points">+{h.points}</span>
                      </div>
                    </Astuce>
                  )
                })}
              </div>
            </div>
          )
        })}

        <div className="hf-abdication">
          {confirme ? (
            <>
              <span>
                Abdiquer fige votre score, vous donne un titre - puis une nouvelle cité s’élève sur les ruines.
              </span>
              <button
                className="danger"
                onClick={() => {
                  setConfirme(false)
                  s.abdiquer()
                }}
              >
                👑 Achever ce règne
              </button>
              <button onClick={() => setConfirme(false)}>Régner encore</button>
            </>
          ) : (
            <Astuce
              titre="👑 Abdiquer"
              resume="Choisir la fin de son règne : le score se fige, les aèdes donnent un titre, puis la cité repart de zéro. Rien d’autre ne termine une partie - un village peut être pillé cent fois et se relever."
              note={enBataille ? 'On n’abdique pas au milieu d’un assaut.' : 'Geste sans retour.'}
            >
              <button disabled={enBataille} onClick={() => setConfirme(true)}>
                👑 Abdiquer et voir le bilan du règne
              </button>
            </Astuce>
          )}
        </div>
      </>
    </Modale>
  )
}

/** bilan de fin de règne : le score, le titre, et la porte de sortie */
export function ModaleFinPartie() {
  const s = useGame()
  const fin = s.finDePartie
  if (!fin) return null
  return (
    <div className="voile">
      <div className="modale fin-regne">
        <h2>👑 Fin du règne</h2>
        <div className="fin-score">{fin.score}</div>
        <div className="fin-titre">{fin.titre}</div>
        <div className="fin-desc">{fin.desc}</div>
        <div className="fin-detail">
          {fin.lignes.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: '#93a7b4', marginTop: 10, textAlign: 'center' }}>
          {s.hautsFaits.length}/{HAUTS_FAITS.length} hauts faits · {s.stats.repousses} assauts repoussés ·{' '}
          {s.stats.evenements} dilemmes tranchés
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button style={{ flex: 1 }} onClick={() => s.fermerFin()}>
            Contempler encore
          </button>
          <button
            className="principal"
            style={{ flex: 1 }}
            onClick={() => {
              s.fermerFin()
              s.reset()
            }}
          >
            🏛️ Fonder une nouvelle cité
          </button>
        </div>
      </div>
    </div>
  )
}
