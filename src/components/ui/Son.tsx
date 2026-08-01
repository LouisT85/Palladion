import { useEffect, useState } from 'react'
import {
  ambianceCourante,
  arreterAudio,
  audioPret,
  debloquerAudio,
  jouer,
  reglagesAudio,
  setAmbiance,
  setMuet,
  setVolume,
  setVolumeMusique,
  type Ambiance,
} from '../../game/audio'
import { BUILDING_IDS } from '../../game/data'
import { useGame } from '../../game/store'

/*
 * Le pont entre l'état du jeu et le son. Aucune ligne de bruit dans le store :
 * on s'abonne aux transitions et on joue ce qu'elles racontent. Le contexte
 * audio n'est créé qu'au premier geste réel de l'utilisateur — politique des
 * navigateurs, et simple politesse.
 */

/** ce que la scène doit faire entendre en fond, à cet instant */
function ambianceDe(s: ReturnType<typeof useGame.getState>): Ambiance {
  if (s.battle) return 'siege'
  if (s.expedition && !s.expedition.result) return 'siege'
  return s.warned ? 'alerte' : 'paix'
}

export function useSons(): void {
  useEffect(() => {
    const geste = () => {
      debloquerAudio()
      setAmbiance(ambianceDe(useGame.getState()))
    }
    window.addEventListener('pointerdown', geste, { once: true })
    window.addEventListener('keydown', geste, { once: true })

    let prec = useGame.getState()
    let precNiveaux = BUILDING_IDS.reduce((a, b) => a + prec.buildings[b].level, 0)
    let precCooldowns = 0

    const desabonner = useGame.subscribe((s) => {
      if (!audioPret()) {
        prec = s
        return
      }
      // ── fond sonore ──
      const amb = ambianceDe(s)
      if (amb !== ambianceCourante()) setAmbiance(amb)

      // ── éclaireurs : les cors montent sur les murs ──
      if (s.warned && !prec.warned) jouer('cor')
      // ── l'assaut commence ──
      if (s.battle && !prec.battle) jouer('cor')
      // ── un pan de mur cède ──
      const brecheAvant = prec.battle?.secteurs.some((x) => x.breche) ?? false
      const brecheApres = s.battle?.secteurs.some((x) => x.breche) ?? false
      if (brecheApres && !brecheAvant) jouer('breche')
      const brecheExpAvant = prec.expedition?.battle.secteurs.some((x) => x.breche) ?? false
      const brecheExpApres = s.expedition?.battle.secteurs.some((x) => x.breche) ?? false
      if (brecheExpApres && !brecheExpAvant) jouer('breche')

      // ── issue d'une bataille ou d'un raid ──
      if (s.battleReport && !prec.battleReport) {
        jouer(s.battleReport.emoji === '🏆' ? 'victoire' : 'defaite')
      }
      if (s.expedition?.result && !prec.expedition?.result) {
        jouer(s.expedition.result.victoire ? 'victoire' : 'defaite')
      }

      // ── un dieu répond : le tonnerre roule ──
      const cds = Object.values(s.gods).reduce((a, g) => a + g.cooldownUntil, 0)
      if (precCooldowns > 0 && cds > precCooldowns + 1000) jouer('tonnerre')
      precCooldowns = cds

      // ── un chantier s'achève ──
      const niveaux = BUILDING_IDS.reduce((a, b) => a + s.buildings[b].level, 0)
      if (niveaux > precNiveaux) jouer('chantier')
      precNiveaux = niveaux

      // ── un haut fait tombe ──
      if ((s.hautsFaits?.length ?? 0) > (prec.hautsFaits?.length ?? 0)) jouer('piece')

      prec = s
    })

    // fracas d'armes : irrégulier, tant que la mêlée dure
    const armes = window.setInterval(() => {
      if (!audioPret()) return
      const s = useGame.getState()
      const b = s.battle ?? (s.expedition && !s.expedition.result ? s.expedition.battle : null)
      if (!b || b.phase === 'approche') return
      if (Math.random() < 0.6) jouer('fracas')
    }, 850)

    return () => {
      window.removeEventListener('pointerdown', geste)
      window.removeEventListener('keydown', geste)
      clearInterval(armes)
      desabonner()
      arreterAudio()
    }
  }, [])
}

/** haut-parleur du HUD : coupe-son et deux curseurs, persistés */
export function ControleSon() {
  const [reglages, setReglages] = useState(reglagesAudio)
  const [ouvert, setOuvert] = useState(false)

  const maj = (f: () => void) => {
    f()
    setReglages(reglagesAudio())
  }

  const icone = reglages.muet ? '🔇' : reglages.volume > 0.55 ? '🔊' : '🔉'

  return (
    <span className="son">
      <button
        className={`bouton-icone${reglages.muet ? '' : ' actif'}`}
        onClick={() => {
          debloquerAudio()
          setOuvert((o) => !o)
        }}
        title="Sons et musique"
        aria-label="Réglages du son"
      >
        {icone}
      </button>
      {ouvert && (
        <div className="son-panneau">
          {/* même sortie que les grands panneaux : une croix, pas un clic dans le vide */}
          <div className="son-tete">
            <span>🎵 Son et musique</span>
            <button className="son-croix" onClick={() => setOuvert(false)} aria-label="Fermer" title="Fermer">
              ✕
            </button>
          </div>
          <button
            className="son-muet"
            onClick={() => maj(() => setMuet(!reglages.muet))}
          >
            {reglages.muet ? '🔇 Son coupé — rétablir' : '🔊 Couper le son'}
          </button>
          <label>
            <span>Général</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(reglages.volume * 100)}
              onChange={(e) => maj(() => setVolume(Number(e.target.value) / 100))}
            />
          </label>
          <label>
            <span>Musique</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(reglages.musique * 100)}
              onChange={(e) => maj(() => setVolumeMusique(Number(e.target.value) / 100))}
            />
          </label>
          <div className="son-note">
            Lyre, flûte de berger et bourdon chaud au village ; cors à l’alerte, tambour au siège. Tout est synthétisé,
            rien n’est téléchargé.
          </div>
        </div>
      )}
    </span>
  )
}
