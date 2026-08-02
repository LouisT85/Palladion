import { useEffect } from 'react'
import { TICK_MS } from './game/data'
import { HERO_IDS } from './game/heros'
import { missionsActives } from './game/missions'
import { herosDisponible, totalEtoiles, useGame } from './game/store'
import { VillageMap } from './components/map/VillageMap'
import { BandeauAlerte, BarreRessources, BoutonPleinEcran, JetonsEtat, Toasts } from './components/ui/Hud'
import { ModaleFinPartie, PanneauHautsFaits } from './components/ui/HautsFaits'
import { ModaleArcHeros, PanneauHeros } from './components/ui/Heros'
import { MissionsTracker, PanneauMissions } from './components/ui/Missions'
import { PanneauSauvegardes } from './components/ui/Sauvegardes'
import {
  ModaleChoixMode,
  ModaleEchecActe,
  ModaleEpilogue,
  ModaleProlologue,
  PanneauCampagne,
  SuiviActe,
} from './components/ui/Campagne'
import { ControleSon, useSons } from './components/ui/Son'
import { Tutoriel } from './components/ui/Tutoriel'
import { AnimationVictoire } from './components/ui/Victoire'
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
import { PanneauAnnales } from './components/ui/Annales'

export default function App() {
  const init = useGame((s) => s.init)
  const panel = useGame((s) => s.panel)
  const expedition = useGame((s) => s.expedition)
  const etoiles = useGame((s) => totalEtoiles(s.expeditions))
  // pastilles d'appel : un héros à recruter, un village qui crie au secours
  const herosARecruter = useGame((s) => HERO_IDS.filter((h) => herosDisponible(s, h)).length)
  const appel = useGame((s) => s.appelSecours !== null)
  // en campagne, le bandeau change de boutons : l'acte prime sur le fil rouge
  const campagne = useGame((s) => s.campagne !== null && !s.campagne.fini)
  // une récompense de mission qui attend est une pastille, comme un héros à recruter
  const missionsPretes = useGame((s) =>
    missionsActives(s.missionsReclamees).filter((m) => {
      const p = m.progres(s)
      return p.cur >= p.max
    }).length,
  )
  const openPanel = useGame((s) => s.openPanel)
  // la bande-son suit l'état du jeu : lyre, cors, tambour de siège
  useSons()

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
      {/*
        Deux rangs, deux idées : en haut ce que le village POSSÈDE, en bas ce qui
        lui ARRIVE - avec les boutons qui ouvrent les grands panneaux. Tout tenait
        sur une ligne, et rien ne s'y lisait plus.
      */}
      <header className="hud">
        <div className="hud-rang">
          <div className="logo">
            PALLADION
            <small>guerre de Troie</small>
          </div>
          <BarreRessources />
        </div>
        <div className="hud-rang">
        {/* les libellés s'effacent sur écran étroit : les pictogrammes suffisent */}
        <div className="hud-actions">
          <button
            data-tuto="bouton-expeditions"
            onClick={() => openPanel('expeditions')}
            title={
              appel
                ? 'Un village assiégé appelle à l’aide - la fenêtre se referme vite'
                : 'Piller ou secourir les villages de la Troade'
            }
            className={appel ? 'appelle' : undefined}
          >
            🗺️<span className="lbl"> Expéditions</span>
            {/* un émoji seul ne disait rien à qui ne le remarquait pas : on écrit le mot */}
            {appel ? <span className="badge-secours">🙏 SECOURS</span> : etoiles > 0 ? ` ★${etoiles}` : ''}
          </button>
          <button data-tuto="bouton-pantheon" onClick={() => openPanel('pantheon')} title="Les dieux de l'Olympe">
            ⚡<span className="lbl"> Panthéon</span>
          </button>
          <button
            data-tuto="bouton-heros"
            onClick={() => openPanel('heros')}
            title="Les héros de la matière troyenne - les recruter, les faire monter, trancher leurs dilemmes"
            className={herosARecruter > 0 ? 'appelle' : undefined}
          >
            🛡️<span className="lbl"> Héros</span>
            {herosARecruter > 0 ? ` ${herosARecruter}` : ''}
          </button>
          {campagne ? (
            <button onClick={() => openPanel('campagne')} title="Les cinq actes de « La Chute »">
              🐴<span className="lbl"> La Chute</span>
            </button>
          ) : (
            <button
              data-tuto="bouton-missions"
              onClick={() => openPanel('missions')}
              title="Le fil rouge : cinquante-cinq missions à récompense, acte par acte"
              className={missionsPretes > 0 ? 'appelle' : undefined}
            >
              🏅<span className="lbl"> Missions</span>
              {missionsPretes > 0 ? ` 🎁${missionsPretes}` : ''}
            </button>
          )}
          <button
            onClick={() => openPanel('hauts-faits')}
            title="Hauts faits, prestige et bilan du règne"
          >
            👑<span className="lbl"> Hauts faits</span>
          </button>
          <button onClick={() => openPanel('journal')} title="Rapports et chroniques">
            📜<span className="lbl"> Journal</span>
          </button>
          <button
            onClick={() => openPanel('annales')}
            title="Les courbes du règne : greniers, menace, garnison, ambiance, prestige"
          >
            📈<span className="lbl"> Annales</span>
          </button>
          <button onClick={() => openPanel('aide')} title="Comment jouer">
            ❔
          </button>
          <ControleSon />
          <BoutonPleinEcran />
          </div>
          <JetonsEtat />
        </div>
      </header>

      <main className="scene">
        <VillageMap />
        <BandeauAlerte />
        {/* en campagne, l'acte remplace le fil rouge : c'est lui qui dit pourquoi on joue */}
        {campagne ? <SuiviActe /> : <MissionsTracker />}
        <PanneauBatiment />
        <Toasts />
      </main>

      {panel === 'aide' && <ModaleAide />}
      {panel === 'campagne' && <PanneauCampagne />}
      {panel === 'sauvegardes' && <PanneauSauvegardes />}
      {panel === 'pantheon' && <Pantheon />}
      {panel === 'heros' && <PanneauHeros />}
      {panel === 'missions' && <PanneauMissions />}
      {panel === 'hauts-faits' && <PanneauHautsFaits />}
      {panel === 'journal' && <ModaleJournal />}
      {panel === 'annales' && <PanneauAnnales />}
      {panel === 'expeditions' && !expedition && <PanneauExpeditions />}
      {expedition && <ExpeditionScene />}
      <ModaleHorsLigne />
      <ModaleEvenement />
      <ModaleArcHeros />
      <ModaleRapportBataille />
      <ModaleFinPartie />
      <AnimationVictoire />
      {/* la campagne encadre la partie : choix du mode, prologue, épilogue, échec */}
      <ModaleChoixMode />
      <ModaleProlologue />
      <ModaleEpilogue />
      <ModaleEchecActe />
      {/* la leçon de Zeus passe au-dessus de tout : c'est elle qui mène la main */}
      <Tutoriel />
    </div>
  )
}
