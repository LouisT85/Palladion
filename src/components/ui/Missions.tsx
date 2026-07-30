import { useState } from 'react'
import { RES } from '../../game/data'
import { MISSIONS, missionsActives, type MissionDef } from '../../game/missions'
import { useGame } from '../../game/store'
import type { ResourceId } from '../../game/types'

function texteRecompense(m: MissionDef): string {
  const parts: string[] = []
  if (m.recompense.res) {
    for (const [r, n] of Object.entries(m.recompense.res) as [ResourceId, number][]) {
      parts.push(`+${n} ${RES[r].emoji}`)
    }
  }
  if (m.recompense.faveur) parts.push(`+${m.recompense.faveur} ✨`)
  if (m.recompense.pop) parts.push(`+${m.recompense.pop} 👥`)
  return parts.join(' · ')
}

export function MissionsTracker() {
  const s = useGame()
  const [replie, setReplie] = useState(false)
  const actives = missionsActives(s.missionsReclamees)
  if (actives.length === 0) return null

  return (
    <div className="missions">
      <button className="missions-titre" onClick={() => setReplie(!replie)}>
        🏅 Missions{' '}
        <span className="compte-missions">
          {s.missionsReclamees.length}/{MISSIONS.length}
        </span>
        <span className="chevron">{replie ? '▸' : '▾'}</span>
      </button>
      {!replie &&
        actives.map((m) => {
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
                  <div className="mission-rec">🎁 {texteRecompense(m)}</div>
                </div>
              </div>
              {fait && (
                <button className="principal mission-reclamer" onClick={() => s.reclamerMission(m.id)}>
                  Réclamer la récompense
                </button>
              )}
            </div>
          )
        })}
    </div>
  )
}
