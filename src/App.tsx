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
import { Astuce } from './components/ui/Infobulle'
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
          <Astuce
            titre="🗺️ Expéditions"
            resume="Les huit places fortes de la Troade : les piller pour leur butin, ou les secourir pour en faire des alliés. Et ce que chacune pense de vous."
            note={appel ? 'Un village assiégé appelle à l’aide - la fenêtre se referme vite.' : undefined}
          >
            <button
              data-tuto="bouton-expeditions"
              onClick={() => openPanel('expeditions')}
              className={appel ? 'appelle' : undefined}
            >
              🗺️<span className="lbl"> Expéditions</span>
              {/* un émoji seul ne disait rien à qui ne le remarquait pas : on écrit le mot */}
              {appel ? <span className="badge-secours">🙏 SECOURS</span> : etoiles > 0 ? ` ★${etoiles}` : ''}
            </button>
          </Astuce>
          <Astuce
            titre="⚡ Le Panthéon"
            resume="Quatre Olympiens, leurs bénédictions, et l’arbre de faveur : la relation à un dieu se dépense en grâces permanentes."
          >
            <button data-tuto="bouton-pantheon" onClick={() => openPanel('pantheon')}>
              ⚡<span className="lbl"> Panthéon</span>
            </button>
          </Astuce>
          <Astuce
            titre="🛡️ Les héros"
            resume="Les huit noms de la matière troyenne : les recruter, les faire monter, trancher leurs dilemmes. Ce sont des hôtes exigeants, pas une collection."
            note={herosARecruter > 0 ? `${herosARecruter} héros accepteraient de vous servir dès maintenant.` : undefined}
          >
            <button
              data-tuto="bouton-heros"
              onClick={() => openPanel('heros')}
              className={herosARecruter > 0 ? 'appelle' : undefined}
            >
              🛡️<span className="lbl"> Héros</span>
              {herosARecruter > 0 ? ` ${herosARecruter}` : ''}
            </button>
          </Astuce>
          {!campagne && (
            <Astuce
              titre="🏅 Le fil rouge"
              resume="Cinquante-cinq missions à récompense, acte par acte : la main courante du bac à sable, qui vous montre ce qu’il reste à découvrir."
              note={missionsPretes > 0 ? `${missionsPretes} récompense(s) vous attendent.` : undefined}
            >
              <button
                data-tuto="bouton-missions"
                onClick={() => openPanel('missions')}
                className={missionsPretes > 0 ? 'appelle' : undefined}
              >
                🏅<span className="lbl"> Missions</span>
                {missionsPretes > 0 ? ` 🎁${missionsPretes}` : ''}
              </button>
            </Astuce>
          )}
          {/*
            « La Chute » se voit dans LES DEUX MODES. Auparavant ce bouton
            n'apparaissait qu'une fois la campagne commencée, et l'on n'y entrait
            que par le bas de l'aide : un joueur de bac à sable pouvait régner
            cent journées sans soupçonner qu'une campagne existe.
          */}
          <Astuce
            titre="🐴 « La Chute »"
            resume={
              campagne
                ? 'Les cinq actes qui suivent l’Iliade, du débarquement achéen à la nuit du cheval - et où vous en êtes.'
                : 'L’autre façon de régner : cinq chapitres écrits, des objectifs imposés, une situation héritée d’un acte à l’autre. On peut y perdre un acte - on le reprend, pas la campagne.'
            }
            note={campagne ? undefined : 'Vous jouez en bac à sable : entrer dans la campagne remplacera votre cité.'}
          >
            <button onClick={() => openPanel('campagne')} className={campagne ? undefined : 'campagne-decouverte'}>
              🐴<span className="lbl"> La Chute</span>
            </button>
          </Astuce>
          <Astuce
            titre="👑 Hauts faits et prestige"
            resume="Cinquante et un hauts faits, du premier mur à la légende. C’est aussi d’ici qu’on abdique pour voir le bilan de son règne."
          >
            <button onClick={() => openPanel('hauts-faits')}>
              👑<span className="lbl"> Hauts faits</span>
            </button>
          </Astuce>
          <Astuce
            titre="📜 Le journal"
            resume="Rapports de bataille, dilemmes tranchés, arrivées et départs : tout ce qui s’est passé, dans l’ordre où c’est arrivé."
          >
            <button onClick={() => openPanel('journal')}>
              📜<span className="lbl"> Journal</span>
            </button>
          </Astuce>
          <Astuce
            titre="📈 Les annales"
            resume="Les courbes du règne : greniers, menace, garnison, ambiance, prestige. Un relevé toutes les trente secondes - de quoi voir venir une pente avant qu’elle ne coûte cher."
          >
            <button onClick={() => openPanel('annales')}>
              📈<span className="lbl"> Annales</span>
            </button>
          </Astuce>
          <Astuce titre="❔ Comment jouer" resume="Toutes les règles, dans l’ordre où elles servent - et de quoi refaire la leçon de Zeus.">
            <button onClick={() => openPanel('aide')}>❔</button>
          </Astuce>
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
