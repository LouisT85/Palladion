import { useState } from 'react'
import { GEO_EXPEDITION } from '../../game/combat'
import { MODE_TEST, RES, UNITS, UNIT_IDS, WALL_HP } from '../../game/data'
import { MAX_TROUPES, RAID_COOLDOWN_MS, VILLAGES_CIBLES, VILLAGES_PAR_ID } from '../../game/expeditions'
import { fmtDuree, totalEtoiles, useGame } from '../../game/store'
import type { ResourceId, UnitId } from '../../game/types'
import { BatailleLayer } from '../map/BatailleLayer'
import { Murailles } from '../map/Murailles'
import { DieuxRapides } from './Hud'

function puissance(troupes: Record<UnitId, number>): number {
  return UNIT_IDS.reduce((a, u) => a + (troupes[u] ?? 0) * (UNITS[u].atk + UNITS[u].hp / 8), 0)
}

function Etoiles({ n, taille = 16 }: { n: number; taille?: number }) {
  return (
    <span className="etoiles" style={{ fontSize: taille }}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < n ? 'pleine' : 'vide'}>
          ★
        </span>
      ))}
    </span>
  )
}

// ── Panneau : liste des villages + sélection des troupes ─────────────────────
export function PanneauExpeditions() {
  const s = useGame()
  const [cibleId, setCibleId] = useState<string | null>(null)
  const [troupes, setTroupes] = useState<Record<UnitId, number>>({ lancier: 0, archer: 0, hoplite: 0 })
  const now = s.lastSeen
  const cooldown = RAID_COOLDOWN_MS / (MODE_TEST ? 10 : 1)

  const cible = cibleId ? VILLAGES_PAR_ID[cibleId] : null
  const total = UNIT_IDS.reduce((a, u) => a + troupes[u], 0)

  if (cible) {
    const maPuissance = puissance(troupes)
    return (
      <div className="voile" onClick={() => setCibleId(null)}>
        <div className="modale" onClick={(e) => e.stopPropagation()}>
          <h2>
            {cible.emoji} Marcher sur {cible.nom}
          </h2>
          <div className="desc-exp">{cible.desc}</div>
          <div className="bloc">
            <h3>Leur défense</h3>
            <div className="ligne-exp">
              🧱 Remparts niveau {cible.mur} ({WALL_HP[cible.mur]} pts) ·{' '}
              {UNIT_IDS.filter((u) => cible.garnison[u] > 0)
                .map((u) => `${cible.garnison[u]} ${UNITS[u].emoji}`)
                .join(' ')}
              {' '}· puissance ≈ <b>{cible.puissance}</b>
            </div>
          </div>
          <div className="bloc">
            <h3>
              Vos troupes ({total}/{MAX_TROUPES}) — puissance ≈ {Math.round(maPuissance)}
            </h3>
            {UNIT_IDS.map((u) => (
              <div key={u} className="unite">
                <span style={{ fontSize: 22 }}>{UNITS[u].emoji}</span>
                <div className="infos">
                  <div className="nom">{UNITS[u].nom}</div>
                  <div className="stats">
                    disponibles : {s.army[u]} · ⚔{UNITS[u].atk} ❤{UNITS[u].hp}
                    {u === 'archer' ? ' · peu efficace contre les murs' : ''}
                  </div>
                </div>
                <div className="actions">
                  <button onClick={() => setTroupes({ ...troupes, [u]: Math.max(0, troupes[u] - 1) })}>−</button>
                  <span className="compteur">{troupes[u]}</span>
                  <button
                    onClick={() => setTroupes({ ...troupes, [u]: Math.min(s.army[u], troupes[u] + 1) })}
                    disabled={total >= MAX_TROUPES || troupes[u] >= s.army[u]}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 12, color: maPuissance >= cible.puissance ? '#5fae7d' : '#d98a4e', marginTop: 6 }}>
              {maPuissance >= cible.puissance * 1.3
                ? '⚖️ Rapport de force très favorable.'
                : maPuissance >= cible.puissance
                  ? '⚖️ Rapport de force favorable — mais la guerre a ses caprices.'
                  : '⚠️ Rapport de force défavorable : vos troupes risquent d’y rester.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ flex: 1 }} onClick={() => setCibleId(null)}>
              Retour
            </button>
            <button
              className="principal"
              style={{ flex: 2 }}
              disabled={total === 0 || s.battle !== null || s.expedition !== null}
              onClick={() => s.lancerExpedition(cible.id, troupes)}
            >
              🏴‍☠️ Lancer l’assaut
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="voile" onClick={() => s.openPanel(null)}>
      <div className="modale large" onClick={(e) => e.stopPropagation()}>
        <h2>🗺️ Expéditions — la Troade à feu et à sang</h2>
        <div style={{ color: '#93a7b4', fontSize: 13, marginBottom: 4 }}>
          Envoyez vos troupes piller les places fortes de la région. Moins de pertes = plus d’étoiles.{' '}
          <b style={{ color: '#e8c04a' }}>{totalEtoiles(s.expeditions)}</b>/24 ★
        </div>
        {VILLAGES_CIBLES.map((v) => {
          const etat = s.expeditions[v.id]
          const resteCd = Math.max(0, (etat?.dernierRaid ?? 0) + cooldown - now)
          return (
            <div key={v.id} className="exp-village">
              <div className="embleme">{v.emoji}</div>
              <div className="corps">
                <div className="ligne-titre">
                  <h3>{v.nom}</h3>
                  <Etoiles n={etat?.etoiles ?? 0} />
                </div>
                <div className="desc-exp">{v.desc}</div>
                <div className="ligne-exp">
                  🛡️ Puissance ≈ <b>{v.puissance}</b> · 🧱 niv. {v.mur} ·{' '}
                  {UNIT_IDS.filter((u) => v.garnison[u] > 0)
                    .map((u) => `${v.garnison[u]}${UNITS[u].emoji}`)
                    .join(' ')}
                  {'  ·  '}🎁{' '}
                  {(Object.entries(v.butin) as [ResourceId, number][])
                    .map(([r, n]) => `${Math.round(n * (etat?.etoiles ? 0.4 : 1))} ${RES[r].emoji}`)
                    .join(' ')}
                  {etat?.etoiles ? ' (déjà pillé)' : ''}
                </div>
              </div>
              <div className="action-exp">
                {resteCd > 0 ? (
                  <span className="cd">⏳ {fmtDuree(resteCd)}</span>
                ) : (
                  <button
                    className="principal"
                    disabled={s.battle !== null || s.expedition !== null}
                    onClick={() => {
                      setTroupes({ lancier: 0, archer: 0, hoplite: 0 })
                      setCibleId(v.id)
                    }}
                  >
                    Attaquer
                  </button>
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

// ── Scène : l'assaut du village ennemi, joué en direct ───────────────────────
export function ExpeditionScene() {
  const s = useGame()
  const exp = s.expedition
  if (!exp) return null
  const v = VILLAGES_PAR_ID[exp.villageId]
  const geo = GEO_EXPEDITION
  const wallMax = WALL_HP[v.mur]
  const vivantsJoueur = exp.battle.fighters.filter((f) => f.camp === 'attaque' && f.etat !== 'mort' && f.etat !== 'fuite').length
  const vivantsEnnemis = exp.battle.fighters.filter((f) => f.camp === 'defense' && f.etat !== 'mort').length

  return (
    <div className="voile">
      <div className="modale scene-exp" onClick={(e) => e.stopPropagation()}>
        <h2>
          {v.emoji} Assaut sur {v.nom}
        </h2>
        <svg viewBox="0 0 900 560" className="carte-exp" role="img" aria-label={`Assaut sur ${v.nom}`}>
          <defs>
            <linearGradient id="ciel-exp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8fb4c4" />
              <stop offset="100%" stopColor="#d3e3de" />
            </linearGradient>
            <linearGradient id="sol-exp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b3aa74" />
              <stop offset="100%" stopColor="#9d9663" />
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={900} height={120} fill="url(#ciel-exp)" />
          <path d="M0,120 L120,64 L230,102 L360,52 L470,100 L600,66 L720,104 L830,72 L900,96 L900,120 Z" fill="#87988a" />
          <rect x={0} y={116} width={900} height={444} fill="url(#sol-exp)" />
          <ellipse cx={450} cy={330} rx={330} ry={130} fill="#c0b67d" opacity={0.35} />
          {/* route d'assaut depuis l'est */}
          <path d={`M900,380 C 800,360 740,335 ${geo.porte.x + 10},${geo.porte.y + 6}`} stroke="#c9b085" strokeWidth={16} fill="none" strokeLinecap="round" opacity={0.9} />

          <Murailles niveau={v.mur} hp={exp.wallHp} max={wallMax} breche={exp.battle.breche} layer="back" geo={geo} />

          {/* l'intérieur du village ennemi */}
          <g transform={`translate(${geo.place.x},${geo.place.y})`}>
            <ellipse cx={0} cy={6} rx={60} ry={20} fill="#c2b380" opacity={0.5} />
            <g transform="translate(-38,-12)">
              <rect x={-11} y={-11} width={22} height={12} fill="#b3906b" stroke="#8c6f4e" strokeWidth={0.8} />
              <path d="M-13,-11 L0,-20 L13,-11 Z" fill="#c8b26a" stroke="#a3904f" strokeWidth={0.8} />
            </g>
            <g transform="translate(26,4)">
              <rect x={-10} y={-10} width={20} height={11} fill="#bfa988" stroke="#8c6f4e" strokeWidth={0.8} />
              <path d="M-12,-10 L0,-18 L12,-10 Z" fill="#b3543f" stroke="#8a3f30" strokeWidth={0.8} />
            </g>
            {/* le butin convoité */}
            <g transform="translate(-2,-28)">
              <ellipse cx={0} cy={4} rx={12} ry={4} fill="#000" opacity={0.12} />
              <ellipse cx={-6} cy={0} rx={3} ry={4.5} fill="#a3673f" />
              <ellipse cx={1} cy={1} rx={3} ry={4.5} fill="#8c552f" />
              <rect x={5} y={-3} width={9} height={7} fill="#8c6b3f" stroke="#5d4a33" strokeWidth={0.8} />
            </g>
          </g>

          <Murailles niveau={v.mur} hp={exp.wallHp} max={wallMax} breche={exp.battle.breche} layer="front" geo={geo} />

          <BatailleLayer battle={exp.battle} now={s.lastSeen} wallHp={exp.wallHp} wallMax={wallMax} />
        </svg>

        {exp.result ? (
          <div className="resultat-exp">
            <div className="etoiles-resultat">
              {[0, 1, 2].map((i) => (
                <span key={i} className={i < exp.result!.etoiles ? 'pleine' : 'vide'}>
                  ★
                </span>
              ))}
            </div>
            {exp.result.lignes.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
            <button className="principal" style={{ width: '100%', marginTop: 10 }} onClick={() => s.fermerExpedition()}>
              Rentrer au village
            </button>
          </div>
        ) : (
          <>
            <div className="statut-exp">
              ⚔️ Vos troupes : <b>{vivantsJoueur}</b> · Défenseurs : <b>{vivantsEnnemis}</b>
              {v.mur > 0 && exp.battle.breche && ' · 💥 brèche ouverte !'}
            </div>
            <DieuxRapides />
            <button className="danger" style={{ width: '100%', marginTop: 8 }} onClick={() => s.retraiteExpedition()}>
              🏳️ Sonner la retraite
            </button>
          </>
        )}
      </div>
    </div>
  )
}
