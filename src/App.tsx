import { useEffect } from 'react'
import { TICK_MS } from './game/data'
import { HERO_IDS } from './game/heros'
import { herosDisponible, totalEtoiles, useGame } from './game/store'
import { VillageMap } from './components/map/VillageMap'
import { BandeauAlerte, BarreRessources, BoutonPleinEcran, Toasts } from './components/ui/Hud'
import { ModaleArcHeros, PanneauHeros } from './components/ui/Heros'
import { MissionsTracker } from './components/ui/Missions'
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
  // pastilles d'appel : un héros à recruter, un village qui crie au secours
  const herosARecruter = useGame((s) => HERO_IDS.filter((h) => herosDisponible(s, h)).length)
  const appel = useGame((s) => s.appelSecours !== null)
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
        {/* les libellés s'effacent sous 1400 px : les pictogrammes suffisent, le titre reste */}
        <div className="hud-actions">
          <button
            onClick={() => openPanel('expeditions')}
            title={
              appel
                ? 'Un village assiégé appelle à l’aide — la fenêtre se referme vite'
                : 'Piller ou secourir les villages de la Troade'
            }
            className={appel ? 'appelle' : undefined}
          >
            🗺️<span className="lbl"> Expéditions</span>
            {appel ? ' ⛑️' : etoiles > 0 ? ` ★${etoiles}` : ''}
          </button>
          <button onClick={() => openPanel('pantheon')} title="Les dieux de l'Olympe">
            ⚡<span className="lbl"> Panthéon</span>
          </button>
          <button
            onClick={() => openPanel('heros')}
            title="Les héros de la matière troyenne — les recruter, les faire monter, trancher leurs dilemmes"
            className={herosARecruter > 0 ? 'appelle' : undefined}
          >
            🛡️<span className="lbl"> Héros</span>
            {herosARecruter > 0 ? ` ${herosARecruter}` : ''}
          </button>
          <button onClick={() => openPanel('journal')} title="Rapports et chroniques">
            📜<span className="lbl"> Journal</span>
          </button>
          <button onClick={() => openPanel('aide')} title="Comment jouer">
            ❔
          </button>
          <BoutonPleinEcran />
        </div>
      </header>

      <main className="scene">
        <VillageMap />
        <BandeauAlerte />
        <MissionsTracker />
        <PanneauBatiment />
        <Toasts />
      </main>

      {panel === 'aide' && <ModaleAide />}
      {panel === 'pantheon' && <Pantheon />}
      {panel === 'heros' && <PanneauHeros />}
      {panel === 'journal' && <ModaleJournal />}
      {panel === 'expeditions' && !expedition && <PanneauExpeditions />}
      {expedition && <ExpeditionScene />}
      <ModaleHorsLigne />
      <ModaleEvenement />
      <ModaleArcHeros />
      <ModaleRapportBataille />
    </div>
  )
}
