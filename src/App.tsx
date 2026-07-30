import { useEffect } from 'react'
import { TICK_MS } from './game/data'
import { totalEtoiles, useGame } from './game/store'
import { VillageMap } from './components/map/VillageMap'
import { BandeauAlerte, BarreRessources, Toasts } from './components/ui/Hud'
import { PanneauBatiment } from './components/ui/PanneauBatiment'
import { Pantheon } from './components/ui/Pantheon'
import { ExpeditionScene, PanneauExpeditions } from './components/ui/Expeditions'
import {
  ModaleAide,
  ModaleEvenement,
  ModaleHorsLigne,
  ModaleJournal,
  ModaleRapportBataille,
} from './components/ui/Modales'

export default function App() {
  const init = useGame((s) => s.init)
  const panel = useGame((s) => s.panel)
  const expedition = useGame((s) => s.expedition)
  const etoiles = useGame((s) => totalEtoiles(s.expeditions))
  const openPanel = useGame((s) => s.openPanel)

  useEffect(() => {
    init()
    const boucle = setInterval(() => useGame.getState().tick(), TICK_MS)
    const onCache = () => {
      if (document.visibilityState === 'hidden') useGame.getState().save()
    }
    // vitesses façon Sims : touches 1 à 4
    const onTouche = (e: KeyboardEvent) => {
      const vitesses: Record<string, number> = { '1': 1, '2': 2, '3': 4, '4': 8 }
      if (e.key in vitesses) useGame.getState().setVitesse(vitesses[e.key])
    }
    window.addEventListener('visibilitychange', onCache)
    window.addEventListener('beforeunload', () => useGame.getState().save())
    window.addEventListener('keydown', onTouche)
    return () => {
      clearInterval(boucle)
      window.removeEventListener('visibilitychange', onCache)
      window.removeEventListener('keydown', onTouche)
    }
  }, [init])

  return (
    <div className="app">
      <header className="hud">
        <div className="logo">
          PALLADION
          <small>guerre de Troie</small>
        </div>
        <BarreRessources />
        <div className="hud-droite" style={{ marginLeft: 0 }}>
          <button onClick={() => openPanel('expeditions')} title="Attaquer les villages de la région">
            🗺️ Expéditions{etoiles > 0 ? ` ★${etoiles}` : ''}
          </button>
          <button onClick={() => openPanel('pantheon')} title="Les dieux de l'Olympe">
            ⚡ Panthéon
          </button>
          <button onClick={() => openPanel('journal')} title="Rapports et chroniques">
            📜 Journal
          </button>
          <button onClick={() => openPanel('aide')} title="Comment jouer">
            ❔
          </button>
        </div>
      </header>

      <main className="scene">
        <VillageMap />
        <BandeauAlerte />
        <PanneauBatiment />
        <Toasts />
      </main>

      {panel === 'aide' && <ModaleAide />}
      {panel === 'pantheon' && <Pantheon />}
      {panel === 'journal' && <ModaleJournal />}
      {panel === 'expeditions' && !expedition && <PanneauExpeditions />}
      {expedition && <ExpeditionScene />}
      <ModaleHorsLigne />
      <ModaleEvenement />
      <ModaleRapportBataille />
    </div>
  )
}
