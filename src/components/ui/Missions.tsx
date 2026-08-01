import { Fragment, useEffect, useRef, useState } from 'react'
import { MISSIONS, acteDe, missionsActives, rangMission, type CibleMission, type MissionDef } from '../../game/missions'
import { useGame } from '../../game/store'
import { BUILDINGS } from '../../game/data'
import type { ResourceId } from '../../game/types'
import { Montant } from './Icones'
import { Modale } from './Modale'

/*
 * LE FIL ROUGE.
 *
 * Le suivi flottant ne montre que les trois missions en cours — c'est un
 * rappel, pas un sommaire. Ce qui manquait, c'est le lien avec le jeu : on
 * lisait « affectez un villageois au temple » sans savoir où cliquer, et le
 * reste du fil (cinquante missions, cinq actes) restait invisible.
 *
 * D'où trois ajouts : chaque mission a un bouton « y aller » qui ouvre l'écran
 * concerné, le suivi mène au panneau complet, et une récompense réclamée laisse
 * une ligne au journal du village comme une bataille.
 */

/** récompense d'une mission, avec les pictogrammes peints et non des émojis */
function Recompense({ m }: { m: MissionDef }) {
  const res = Object.entries(m.recompense.res ?? {}) as [ResourceId, number][]
  return (
    <>
      {res.map(([r, n]) => (
        <Fragment key={r}>
          <Montant n={n} id={r} taille={13} signe />{' '}
        </Fragment>
      ))}
      {m.recompense.faveur ? (
        <>
          <Montant n={m.recompense.faveur} id="faveur" taille={13} signe />{' '}
        </>
      ) : null}
      {m.recompense.pop ? <span className="montant">+{m.recompense.pop} 👥</span> : null}
    </>
  )
}

/** ce que le bouton « y aller » va ouvrir, dit en clair */
function libelleCible(c: CibleMission): string {
  if (c.quoi === 'batiment') return `${BUILDINGS[c.id].emoji} ${BUILDINGS[c.id].nom}`
  if (c.quoi === 'habitants') return '👥 Recensement'
  if (c.id === 'expeditions') return '🗺️ Expéditions'
  if (c.id === 'pantheon') return '⚡ Panthéon'
  return '🛡️ Héros'
}

/** bouton d'accès direct — absent quand la mission ne s'accomplit sur aucun écran */
function BoutonYAller({ m, classe }: { m: MissionDef; classe?: string }) {
  const aller = useGame((s) => s.allerAMission)
  if (!m.cible) return null
  return (
    <button
      className={classe}
      onClick={() => aller(m.id)}
      title={`Ouvrir ${libelleCible(m.cible)}`}
    >
      {libelleCible(m.cible)} →
    </button>
  )
}

/** sur écran étroit, le tracker démarre replié : la carte reste dégagée */
function replieAuDepart(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 1100px)').matches
}

export function MissionsTracker() {
  const s = useGame()
  const [replie, setReplie] = useState(replieAuDepart)
  const actives = missionsActives(s.missionsReclamees)
  if (actives.length === 0) return null

  const aReclamer = actives.filter((m) => {
    const p = m.progres(s)
    return p.cur >= p.max
  }).length

  return (
    <div className={`missions${replie ? ' replie' : ''}`} data-tuto="missions">
      <div className="missions-tete">
        <button
          className="missions-titre"
          onClick={() => setReplie(!replie)}
          title={replie ? 'Dérouler le suivi des missions' : 'Replier le suivi des missions'}
          aria-expanded={!replie}
        >
          🏅 Missions{' '}
          <span className="compte-missions">
            {s.missionsReclamees.length}/{MISSIONS.length}
          </span>
          {/* replié, le tracker signale quand une récompense attend */}
          {replie && aReclamer > 0 && <span className="mission-compteur">🎁 {aReclamer}</span>}
          <span className="chevron">{replie ? '▸' : '▾'}</span>
        </button>
        {!replie && (
          <button className="missions-tout" onClick={() => s.openPanel('missions')} title="Tout le fil rouge, acte par acte">
            ⤢
          </button>
        )}
      </div>
      {!replie && (
        <div className="missions-liste">
          {actives.map((m) => {
            const p = m.progres(s)
            const fait = p.cur >= p.max
            return (
              <div key={m.id} className={`mission${fait ? ' faite' : ''}`}>
                <div className="mission-ligne">
                  <span className="mission-emoji">{m.emoji}</span>
                  <div className="mission-corps">
                    <div className="mission-nom">
                      {m.titre}
                      {p.max > 1 && (
                        <span className="mission-compteur">
                          {' '}
                          {p.cur}/{p.max}
                        </span>
                      )}
                    </div>
                    <div className="mission-desc">{m.desc}</div>
                    {p.max > 1 && (
                      <div className="mission-progres">
                        <div style={{ width: `${(p.cur / p.max) * 100}%` }} />
                      </div>
                    )}
                    <div className="mission-rec">
                      🎁 <Recompense m={m} />
                    </div>
                  </div>
                </div>
                {fait ? (
                  <button className="principal mission-reclamer" onClick={() => s.reclamerMission(m.id)}>
                    Réclamer la récompense
                  </button>
                ) : (
                  <BoutonYAller m={m} classe="mission-aller" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Le fil rouge en entier. Les missions réclamées restent visibles, barrées : on
 * doit pouvoir mesurer le chemin parcouru, pas seulement celui qui reste.
 */
export function PanneauMissions() {
  const s = useGame()
  const actives = missionsActives(s.missionsReclamees)
  const idsActives = new Set(actives.map((m) => m.id))
  const faites = s.missionsReclamees.length
  // on s'ouvre sur ce qui est jouable, pas sur trente lignes déjà réglées
  const premiereOuverte = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    premiereOuverte.current?.scrollIntoView({ block: 'center' })
  }, [])
  let acteAffiche = ''

  return (
    <Modale
      titre="🏅 Le fil rouge du village"
      large
      onFermer={() => s.openPanel(null)}
      sous={
        <>
          <b style={{ color: '#e8c04a' }}>
            {faites}/{MISSIONS.length}
          </b>{' '}
          missions accomplies. Elles se réclament dans l’ordre : les trois suivantes sont toujours ouvertes, et chacune
          mène à l’écran où elle se joue.
        </>
      }
    >
      <>
        <div className="mission-jauge-tout">
          <div style={{ width: `${(faites / MISSIONS.length) * 100}%` }} />
        </div>
        {MISSIONS.map((m) => {
          const reclamee = s.missionsReclamees.includes(m.id)
          const ouverte = idsActives.has(m.id)
          const p = m.progres(s)
          const fait = p.cur >= p.max
          const etat = reclamee ? 'reclamee' : ouverte ? (fait ? 'prete' : 'ouverte') : 'verrouillee'
          const rang = rangMission(m.id)
          const acte = acteDe(rang)
          const nouvelActe = acte !== acteAffiche
          if (nouvelActe) acteAffiche = acte
          return (
            <Fragment key={m.id}>
              {nouvelActe && <h3 className="heros-section">{acte}</h3>}
              <div
                className={`mission-ligne-tout ${etat}`}
                ref={ouverte && m.id === actives[0]?.id ? premiereOuverte : undefined}
              >
                <span className="mlt-rang">{rang}</span>
                <span className="mlt-emoji">{reclamee ? '✔' : ouverte ? m.emoji : '🔒'}</span>
                <div className="mlt-corps">
                  <div className="mlt-nom">{m.titre}</div>
                  {/* une mission verrouillée garde son intitulé mais tait sa consigne :
                      le fil rouge doit se lire d'avance sans se déflorer entièrement */}
                  {ouverte && <div className="mlt-desc">{m.desc}</div>}
                  {ouverte && p.max > 1 && (
                    <div className="mission-progres">
                      <div style={{ width: `${(p.cur / p.max) * 100}%` }} />
                    </div>
                  )}
                  <div className="mlt-rec">
                    🎁 <Recompense m={m} />
                    {ouverte && p.max > 1 && (
                      <span className="mission-compteur">
                        {' '}
                        · {p.cur}/{p.max}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mlt-actions">
                  {reclamee ? (
                    <span className="mlt-fait">reçue</span>
                  ) : fait && ouverte ? (
                    <button className="principal" onClick={() => s.reclamerMission(m.id)}>
                      🎁 Réclamer
                    </button>
                  ) : ouverte ? (
                    <BoutonYAller m={m} />
                  ) : (
                    <span className="mlt-attente">à venir</span>
                  )}
                </div>
              </div>
            </Fragment>
          )
        })}
      </>
    </Modale>
  )
}
