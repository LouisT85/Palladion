import { useState } from 'react'
import { BUILDINGS, BUILDING_IDS, PROD, RES, TAUX_PORT, UNITS, UNIT_IDS, WALL_HP } from '../../game/data'
import { fmtDuree, peutPayer, useGame } from '../../game/store'
import type { ResourceId } from '../../game/types'

function LigneCout({ cout, resources }: { cout: Partial<Record<ResourceId, number>>; resources: Record<ResourceId, number> }) {
  return (
    <div className="cout">
      {(Object.entries(cout) as [ResourceId, number][]).map(([r, n]) => (
        <span key={r} className={resources[r] >= n ? 'okk' : 'ko'}>
          {RES[r].emoji} {n}
        </span>
      ))}
    </div>
  )
}

function BlocProduction({ id, level }: { id: string; level: number }) {
  const lignes: Record<string, string> = {
    ferme: `🌾 +${PROD.ferme[level]}/min`,
    scierie: `🪵 +${PROD.scierie[level]}/min`,
    carriere: `🪨 +${PROD.carriere[level]}/min`,
    forge: `🥉 +${PROD.forge[level]}/min`,
    temple: `✨ +${PROD.temple[level]}/min`,
    port: `🥉 +${PROD.port[level]}/min (commerce)`,
  }
  if (!(id in lignes) || level === 0) return null
  return (
    <div className="bloc">
      <h3>Production</h3>
      <div>{lignes[id]}</div>
    </div>
  )
}

function BlocCaserne() {
  const s = useGame()
  const now = s.lastSeen
  return (
    <>
      <div className="bloc">
        <h3>Recruter (1 villageois par recrue)</h3>
        {UNIT_IDS.map((u) => {
          const def = UNITS[u]
          const debloque = s.buildings.caserne.level >= def.caserne
          return (
            <div key={u} className="unite">
              <span style={{ fontSize: 22 }}>{def.emoji}</span>
              <div className="infos">
                <div className="nom">
                  {def.nom} <span style={{ color: '#93a7b4', fontWeight: 400 }}>×{s.army[u]}</span>
                </div>
                <div className="stats">
                  ⚔{def.atk} ❤{def.hp} · {def.time}s ·{' '}
                  {(Object.entries(def.cost) as [ResourceId, number][])
                    .map(([r, n]) => `${n}${RES[r].emoji}`)
                    .join(' ')}
                </div>
              </div>
              {debloque ? (
                <div className="actions">
                  <button onClick={() => s.recruter(u, 1)} disabled={!peutPayer(s.resources, def.cost) || s.pop < 1}>
                    +1
                  </button>
                  <button
                    onClick={() => s.recruter(u, 5)}
                    disabled={
                      !peutPayer(
                        s.resources,
                        Object.fromEntries(Object.entries(def.cost).map(([r, n]) => [r, (n as number) * 5])),
                      ) || s.pop < 5
                    }
                  >
                    +5
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: 11, color: '#93a7b4' }}>Caserne niv. {def.caserne}</span>
              )}
            </div>
          )
        })}
      </div>
      {s.recruitQueue.length > 0 && (
        <div className="bloc">
          <h3>Formation en cours</h3>
          {s.recruitQueue.map((j, i) => (
            <div key={i} className="ligne">
              <span>
                {UNITS[j.unit].emoji} {UNITS[j.unit].nom} ×{j.restant}
              </span>
              {i === 0 && <span style={{ color: '#e8c04a' }}>{fmtDuree(j.finishAt - now)}</span>}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function BlocPort() {
  const s = useGame()
  const [donner, setDonner] = useState<ResourceId>('bois')
  const [recevoir, setRecevoir] = useState<ResourceId>('bronze')
  const niveau = s.buildings.port.level
  if (niveau === 0) return null
  const taux = TAUX_PORT[niveau]
  const coutDonne = Math.round(taux * 10)
  return (
    <div className="bloc">
      <h3>Comptoir d’échange ({taux}:1)</h3>
      <div className="ligne">
        <span>Donner :</span>
        <span>
          {(Object.keys(RES) as ResourceId[]).map((r) => (
            <button
              key={r}
              style={{ padding: '2px 7px', marginLeft: 3, borderColor: donner === r ? '#e8c04a' : undefined }}
              onClick={() => setDonner(r)}
            >
              {RES[r].emoji}
            </button>
          ))}
        </span>
      </div>
      <div className="ligne">
        <span>Recevoir :</span>
        <span>
          {(Object.keys(RES) as ResourceId[]).map((r) => (
            <button
              key={r}
              style={{ padding: '2px 7px', marginLeft: 3, borderColor: recevoir === r ? '#e8c04a' : undefined }}
              onClick={() => setRecevoir(r)}
            >
              {RES[r].emoji}
            </button>
          ))}
        </span>
      </div>
      <button
        className="principal"
        style={{ width: '100%', marginTop: 6 }}
        disabled={donner === recevoir || s.resources[donner] < coutDonne}
        onClick={() => s.echanger(donner, recevoir)}
      >
        −{coutDonne} {RES[donner].emoji} → +10 {RES[recevoir].emoji}
      </button>
    </div>
  )
}

function BlocRemparts() {
  const s = useGame()
  const niveau = s.buildings.remparts.level
  if (niveau === 0) return null
  const max = WALL_HP[niveau]
  const ratio = s.wallHp / max
  const manque = max - s.wallHp
  const cout = Math.ceil(manque / 8)
  return (
    <div className="bloc">
      <h3>État de la muraille</h3>
      <div className="ligne">
        <div className={`barre vie${ratio < 0.4 ? ' basse' : ''}`}>
          <div style={{ width: `${ratio * 100}%` }} />
        </div>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {Math.ceil(s.wallHp)}/{max}
        </span>
      </div>
      {manque > 1 && (
        <button
          className="principal"
          style={{ width: '100%', marginTop: 6 }}
          disabled={s.resources.pierre < cout || s.battle !== null}
          onClick={() => s.reparerRemparts()}
        >
          Réparer (−{cout} 🪨)
        </button>
      )}
    </div>
  )
}

export function PanneauBatiment() {
  const s = useGame()
  const id = s.selected
  if (!id) return null
  const def = BUILDINGS[id]
  const b = s.buildings[id]
  const cible = b.level + 1
  const enChantier = b.targetLevel !== undefined && b.busyUntil !== undefined
  const auMax = b.level >= 4
  const agoraOk = id === 'agora' || cible <= s.buildings.agora.level
  const chantiers = BUILDING_IDS.filter((x) => s.buildings[x].targetLevel !== undefined).length

  return (
    <aside className="panneau">
      <button className="fermer" onClick={() => s.select(null)} aria-label="Fermer">
        ✕
      </button>
      <h2>
        {def.emoji} {def.nom}
      </h2>
      <div className="sous">
        Niveau {b.level}/4 {!def.interieur && '· hors des murs'}
      </div>
      <div className="desc">{def.desc}</div>
      {b.level > 0 && (
        <div className="desc" style={{ marginTop: 6, fontStyle: 'italic', color: '#a8bac4' }}>
          « {def.niveaux[b.level - 1]} »
        </div>
      )}

      <BlocProduction id={id} level={b.level} />
      {id === 'remparts' && <BlocRemparts />}
      {id === 'caserne' && b.level > 0 && <BlocCaserne />}
      {id === 'port' && <BlocPort />}
      {id === 'temple' && b.level > 0 && (
        <div className="bloc">
          <h3>Culte</h3>
          <div className="desc">La faveur s’accumule ici. Honorez les Olympiens et invoquez leurs bénédictions.</div>
          <button className="principal" style={{ width: '100%', marginTop: 8 }} onClick={() => s.openPanel('pantheon')}>
            ⚡ Ouvrir le panthéon
          </button>
        </div>
      )}

      {!auMax && (
        <div className="bloc">
          <h3>
            {b.level === 0 ? 'Construire' : `Améliorer → niveau ${cible}`}
          </h3>
          <div className="desc" style={{ fontStyle: 'italic' }}>
            « {def.niveaux[cible - 1]} »
          </div>
          <LigneCout cout={def.costs[cible - 1]} resources={s.resources} />
          <div style={{ fontSize: 12, color: '#93a7b4' }}>⏱ {fmtDuree(def.times[cible - 1] * 1000)}</div>
          {enChantier ? (
            <div style={{ marginTop: 8, color: '#e8c04a' }}>
              🏗️ En chantier — fin dans {fmtDuree((b.busyUntil ?? 0) - s.lastSeen)}
            </div>
          ) : (
            <>
              <button
                className="principal"
                style={{ width: '100%', marginTop: 8 }}
                disabled={!agoraOk || chantiers >= 2 || !peutPayer(s.resources, def.costs[cible - 1])}
                onClick={() => s.upgrade(id)}
              >
                {b.level === 0 ? 'Lancer la construction' : 'Lancer l’amélioration'}
              </button>
              {!agoraOk && (
                <div style={{ fontSize: 12, color: '#d98a4e', marginTop: 5 }}>
                  🏛️ L’Agora doit d’abord atteindre le niveau {cible}.
                </div>
              )}
              {agoraOk && chantiers >= 2 && (
                <div style={{ fontSize: 12, color: '#d98a4e', marginTop: 5 }}>🏗️ Déjà 2 chantiers en cours.</div>
              )}
            </>
          )}
        </div>
      )}
      {auMax && <div className="bloc">🏆 Niveau maximal atteint — digne des grandes cités de l’Égée.</div>}
    </aside>
  )
}
