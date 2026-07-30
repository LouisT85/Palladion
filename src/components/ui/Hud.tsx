import { DAY_MS, GODS, GOD_IDS, MODE_TEST, RES } from '../../game/data'
import { descVague, tailleVague } from '../../game/combat'
import {
  VITESSES,
  armeeTotale,
  coutBenediction,
  popCap,
  stockageMax,
  tauxParMinute,
  useGame,
} from '../../game/store'
import { nomPhase, phaseJour } from '../map/Terrain'
import type { ResourceId } from '../../game/types'

/** contrôle de vitesse façon Sims — verrouillé à ×1 pendant les batailles */
export function ControleVitesse() {
  const vitesse = useGame((s) => s.vitesse)
  const setVitesse = useGame((s) => s.setVitesse)
  const enBataille = useGame((s) => s.battle !== null || (s.expedition !== null && s.expedition.result === null))
  return (
    <span
      className="vitesses"
      title={
        enBataille
          ? 'Vitesse ×1 pendant les batailles'
          : 'Vitesse du jeu (touches 1–4) : production, chantiers, recrues, cycle du jour… et compte à rebours des attaques !'
      }
    >
      <span className="ico">{enBataille ? '⏸' : '⏩'}</span>
      {VITESSES.map((v) => (
        <button
          key={v}
          className={vitesse === v && !enBataille ? 'active' : ''}
          disabled={enBataille}
          onClick={() => setVitesse(v)}
        >
          ×{v}
        </button>
      ))}
    </span>
  )
}

function labelMorale(m: number): { txt: string; c: string } {
  if (m >= 80) return { txt: 'Exaltée', c: '#5fae7d' }
  if (m >= 60) return { txt: 'Bonne', c: '#8fae5f' }
  if (m >= 40) return { txt: 'Correcte', c: '#d9b545' }
  if (m >= 25) return { txt: 'Morose', c: '#d98a4e' }
  return { txt: 'RÉVOLTE', c: '#d05a41' }
}

export function BarreRessources() {
  const s = useGame()
  const taux = tauxParMinute(s)
  const stock = stockageMax(s)
  const cap = popCap(s)
  const morale = labelMorale(s.morale)
  const jour = Math.floor((s.lastSeen - s.createdAt) / DAY_MS) + 1
  const phase = nomPhase(phaseJour(s.lastSeen, s.createdAt, DAY_MS))

  return (
    <>
      <div className="ressources">
        {(Object.keys(RES) as ResourceId[]).map((r) => {
          const t = taux[r]
          return (
            <div key={r} className={`res${r === 'grain' && s.resources.grain <= 0 ? ' alerte' : ''}`} title={`${RES[r].nom} — stock max ${stock}`}>
              <span>{RES[r].emoji}</span>
              <span className="val">{Math.floor(s.resources[r])}</span>
              <span className={`taux${t < 0 ? ' neg' : ''}`}>
                {MODE_TEST ? '∞' : `${t >= 0 ? '+' : ''}${t.toFixed(1)}/min`}
              </span>
            </div>
          )
        })}
        <div className="res" title="Faveur divine (temple, sacrifices, victoires)">
          <span>✨</span>
          <span className="val">{Math.floor(s.faveur)}</span>
          <span className="taux">/100</span>
        </div>
      </div>
      <div className="hud-droite">
        {MODE_TEST && (
          <span className="pastille test" title="Mode test : ressources illimitées, chantiers instantanés">
            🧪 TEST
          </span>
        )}
        {MODE_TEST && (
          <button onClick={() => s.attaqueTest()} title="Déclencher un assaut dans 3 secondes" style={{ padding: '3px 9px', fontSize: 12.5 }}>
            🧪 Attaque
          </button>
        )}
        <span className="pastille" title="Population / capacité des habitations">
          👥 <b>{s.pop}</b>/{cap}
        </span>
        <span className="pastille" title="Garnison">
          ⚔️ <b>{armeeTotale(s.army)}</b>
        </span>
        <span className="pastille" title={`Ambiance du village : ${Math.round(s.morale)}/100 — production ×${(0.5 + (s.morale / 100) * 0.75).toFixed(2)}`}>
          🎭 <b style={{ color: morale.c }}>{morale.txt}</b>
          <span className="jauge-morale">
            <div style={{ width: `${s.morale}%`, background: morale.c }} />
          </span>
        </span>
        <span className="pastille" title="Menace : attire des vagues d'assaut de plus en plus fortes">
          🔥 <b>{Math.round(s.threat)}</b>
        </span>
        <span className="pastille">
          ☀️ Jour <b>{jour}</b> — {phase}
        </span>
        <ControleVitesse />
      </div>
    </>
  )
}

/** boutons d'invocation rapide pendant une bataille */
export function DieuxRapides() {
  const faveur = useGame((s) => s.faveur)
  const gods = useGame((s) => s.gods)
  const templeLevel = useGame((s) => s.buildings.temple.level)
  const buildings = useGame((s) => s.buildings)
  const benir = useGame((s) => s.benir)
  const now = useGame((s) => s.lastSeen)

  return (
    <div className="dieux-rapides">
      {GOD_IDS.map((g) => {
        const dieu = GODS[g]
        if (templeLevel < dieu.temple) return null
        const cout = coutBenediction({ buildings }, g)
        const cd = Math.max(0, gods[g].cooldownUntil - now)
        return (
          <button
            key={g}
            disabled={faveur < cout || cd > 0}
            onClick={() => benir(g)}
            title={`${dieu.benediction.nom} — ${dieu.benediction.desc}`}
          >
            {dieu.emoji} {cd > 0 ? `${Math.ceil(cd / 1000)}s` : `${cout}✨`}
          </button>
        )
      })}
      {templeLevel < 1 && <span className="detail">Bâtissez un temple pour invoquer les dieux…</span>}
    </div>
  )
}

export function BandeauAlerte() {
  const battle = useGame((s) => s.battle)
  const expedition = useGame((s) => s.expedition)
  const warned = useGame((s) => s.warned)
  const incomingWave = useGame((s) => s.incomingWave)
  const defRecompense = useGame((s) => s.defRecompense)
  const nextAttackAt = useGame((s) => s.nextAttackAt)
  const now = useGame((s) => s.lastSeen)
  const lancerMaintenant = useGame((s) => s.lancerMaintenant)

  if (battle) {
    const restants = battle.fighters.filter((f) => f.camp === 'attaque' && f.etat !== 'mort').length
    return (
      <div className="bandeau">
        <div className="gros">⚔️ ASSAUT EN COURS — {restants} assaillants</div>
        <div className="detail">{battle.breche ? '💥 Les remparts sont percés : mêlée dans le village !' : 'Vos remparts encaissent le choc.'}</div>
        <DieuxRapides />
      </div>
    )
  }

  if (warned && incomingWave) {
    const dans = Math.max(0, nextAttackAt - now)
    return (
      <div className="bandeau">
        <div className="gros">
          🐎 Attaque ennemie dans{' '}
          <span className="compte">
            {Math.floor(dans / 60000)}:{String(Math.floor((dans % 60000) / 1000)).padStart(2, '0')}
          </span>
        </div>
        <div className="detail">
          {tailleVague(incomingWave)} assaillants par la route de l’est : {descVague(incomingWave)}.
        </div>
        {defRecompense && (
          <div className="detail recompense">
            🎁 Récompense si repoussé : <b>+{defRecompense.bronze} 🥉</b> · <b>+{defRecompense.faveur} ✨</b> · ambiance +10
          </div>
        )}
        {expedition ? (
          <div className="detail">⏳ Vos troupes sont en expédition — l’ennemi attend leur retour…</div>
        ) : (
          <button className="danger lancer-now" onClick={() => lancerMaintenant()}>
            ⚔️ Lancer l’assaut maintenant (récompense +25 %)
          </button>
        )}
      </div>
    )
  }
  return null
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts)
  if (toasts.length === 0) return null
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.emoji} {t.msg}
        </div>
      ))}
    </div>
  )
}
