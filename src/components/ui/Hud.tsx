import { useEffect, useState } from 'react'
import { DAY_MS, GODS, GOD_IDS, MODE_TEST, RES, SECTEURS } from '../../game/data'
import { descVague, tailleVague } from '../../game/combat'
import {
  VITESSES,
  armeeTotale,
  bonusHeros,
  coutBenediction,
  popCap,
  stockageMax,
  tauxParMinute,
  useGame,
} from '../../game/store'
import { METEOS, SAISONS } from '../../game/saisons'
import { nomPhase, phaseJour } from '../map/Terrain'
import { HerosRapides } from './Heros'
import { Icone } from './Icones'
import { PanneauPopulation } from './Population'
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

/** équerres d'angle : vers l'extérieur pour entrer, vers l'intérieur pour sortir.
 *  Tracé en SVG et non en ⛶ — le caractère manque à beaucoup de polices. */
function IconePleinEcran({ sortir }: { sortir: boolean }) {
  const d = sortir
    ? 'M7 2v5H2 M13 2v5h5 M13 18v-5h5 M7 18v-5H2'
    : 'M2 7V2h5 M13 2h5v5 M18 13v5h-5 M7 18H2v-5'
  return (
    <svg viewBox="0 0 20 20" width={14} height={14} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Bascule plein écran du navigateur. L'API manque sur certains mobiles et la
 * demande peut être refusée : on ne suppose rien et on n'attend aucune promesse.
 */
export function BoutonPleinEcran() {
  const [plein, setPlein] = useState(false)
  const [supporte] = useState(() => typeof document !== 'undefined' && !!document.documentElement.requestFullscreen)

  useEffect(() => {
    const maj = () => setPlein(document.fullscreenElement !== null)
    maj()
    document.addEventListener('fullscreenchange', maj)
    return () => document.removeEventListener('fullscreenchange', maj)
  }, [])

  if (!supporte) return null

  const basculer = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen()?.catch(() => {})
      else document.documentElement.requestFullscreen()?.catch(() => {})
    } catch {
      // refus du navigateur : le jeu reste jouable en fenêtre
    }
  }

  return (
    <button
      className={`bouton-icone${plein ? ' actif' : ''}`}
      onClick={basculer}
      title={plein ? 'Quitter le plein écran' : 'Jouer en plein écran'}
      aria-label={plein ? 'Quitter le plein écran' : 'Jouer en plein écran'}
    >
      <IconePleinEcran sortir={plein} />
    </button>
  )
}

/**
 * L'ambiance du village en UN mot — c'est ainsi qu'on la lit d'un coup d'œil,
 * et ce mot ne disparaît jamais, quelle que soit la largeur de l'écran.
 */
function labelMorale(m: number): { txt: string; c: string; quoi: string } {
  if (m >= 80) return { txt: 'Exaltée', c: '#5fae7d', quoi: 'On chante aux ateliers : tout rend au maximum.' }
  if (m >= 60) return { txt: 'Bonne', c: '#8fae5f', quoi: 'Le village travaille de bon cœur.' }
  if (m >= 40) return { txt: 'Correcte', c: '#d9b545', quoi: 'Ni révolte ni enthousiasme — on fait ce qu’on doit.' }
  if (m >= 25) return { txt: 'Morose', c: '#d98a4e', quoi: 'Les bras traînent, la production s’en ressent.' }
  return { txt: 'Révolte', c: '#d05a41', quoi: 'Sous 25, les soldats désertent et les meneurs s’agitent.' }
}

/** ce que chaque ressource sert à faire, pour l'infobulle du HUD */
const DESC_RES: Record<ResourceId, string> = {
  bois: 'Charpentes, palissades, navires et flèches. Vient de la scierie et de la cueillette.',
  pierre: 'Murailles, tours et grands bâtiments. Vient de la carrière — et des réparations qu’elle paie.',
  grain: 'Nourrit habitants et soldats. Un grenier vide, et c’est la famine puis la désertion.',
  bronze: 'Armes, armures et commerce. Vient de la forge et du port.',
}

export function BarreRessources() {
  const s = useGame()
  // la liste des habitants n'appartient pas à la partie : simple état d'affichage
  const [popOuvert, setPopOuvert] = useState(false)
  const taux = tauxParMinute(s)
  const stock = stockageMax(s)
  const cap = popCap(s)
  const morale = labelMorale(s.morale)
  const jour = Math.floor((s.lastSeen - s.createdAt) / DAY_MS) + 1
  const phase = nomPhase(phaseJour(s.lastSeen, s.createdAt, DAY_MS))
  const sansEmploi = s.villageois.filter((v) => v.poste === null).length

  return (
    <>
      <div className="ressources">
        {(Object.keys(RES) as ResourceId[]).map((r) => {
          const t = taux[r]
          return (
            <div
              key={r}
              className={`res${r === 'grain' && s.resources.grain <= 0 ? ' alerte' : ''}`}
              title={`${RES[r].nom} — ${Math.floor(s.resources[r])} en réserve sur ${stock} de capacité (Agora niveau ${s.buildings.agora.level})\n${DESC_RES[r]}\n${t >= 0 ? '+' : ''}${t.toFixed(1)} par minute, saison et ambiance comprises.`}
            >
              <Icone id={r} taille={19} />
              <span className="chiffres">
                <span className="nom-res">{RES[r].nom}</span>
                <span className="val">
                  {Math.floor(s.resources[r])}
                  <span className={`taux${t < 0 ? ' neg' : ''}`}>
                    {MODE_TEST ? (
                      ' ∞'
                    ) : (
                      <>
                        {' '}
                        {t >= 0 ? '+' : ''}
                        {t.toFixed(1)}
                        <span className="par-min">/min</span>
                      </>
                    )}
                  </span>
                </span>
              </span>
            </div>
          )
        })}
        <div
          className="res"
          title={`Faveur divine — la monnaie des bénédictions.\nProduite par le temple (avec un prêtre à son poste), les sacrifices et les victoires.`}
        >
          <Icone id="faveur" taille={19} />
          <span className="chiffres">
            <span className="nom-res">Faveur</span>
            <span className="val">
              {Math.floor(s.faveur)}
              <span className="taux">/100</span>
            </span>
          </span>
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
        <button
          className="pastille"
          onClick={() => setPopOuvert(true)}
          title={`Habitants : ${s.pop} sur ${cap} places (Habitations niveau ${s.buildings.maisons.level}).\n${sansEmploi} sans emploi — cliquez pour les affecter aux ateliers ou les enrôler.`}
        >
          👥<span className="opt">Habitants</span> <b>{s.pop}</b>/{cap}
          <span className={`oisifs${sansEmploi === 0 ? ' zero' : ''}`}>
            ({sansEmploi} oisif{sansEmploi > 1 ? 's' : ''})
          </span>
        </button>
        <span
          className="pastille"
          title={`Garnison : ${armeeTotale(s.army)} soldats sous les armes.\nIls défendent les remparts et partent en expédition — et mangent ${(armeeTotale(s.army) * 0.5).toFixed(1)} 🌾/min.`}
        >
          ⚔️<span className="opt">Garnison</span> <b>{armeeTotale(s.army)}</b>
        </span>
        <span
          className="pastille"
          title={`Ambiance du village : ${morale.txt} (${Math.round(s.morale)}/100).\n${morale.quoi}\nProduction ×${(0.5 + (s.morale / 100) * 0.75).toFixed(2)}.`}
        >
          🎭
          <b className="ambiance-mot" style={{ color: morale.c }}>
            {morale.txt}
          </b>
          <span className="jauge-morale">
            <div style={{ width: `${s.morale}%`, background: morale.c }} />
          </span>
        </span>
        <span
          className="pastille"
          title={`Menace : ${Math.round(s.threat)}/100.\nElle monte avec vos bâtiments, vos tours, vos pillages et le temps qui passe — et grossit les vagues d’assaut.`}
        >
          🔥<span className="opt">Menace</span> <b>{Math.round(s.threat)}</b>
        </span>
        <span className="pastille" title={`Jour ${jour} — ${phase}`}>
          ☀️<span className="opt">Jour</span> <b>{jour}</b>
          <span className="opt2">— {phase}</span>
        </span>
        <span
          className="pastille"
          title={`${SAISONS[s.saison].nom} — ${SAISONS[s.saison].desc}\n${METEOS[s.meteo].emoji} ${METEOS[s.meteo].nom} : ${METEOS[s.meteo].desc}`}
        >
          {SAISONS[s.saison].emoji}
          <b>{SAISONS[s.saison].nom}</b>
          <span className="meteo-ico">{METEOS[s.meteo].emoji}</span>
        </span>
        <ControleVitesse />
      </div>
      {popOuvert && <PanneauPopulation onFermer={() => setPopOuvert(false)} />}
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
    <>
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
      {/* les héros ont leur propre rang de boutons, juste dessous */}
      <HerosRapides />
    </>
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
  const fronts = useGame((s) =>
    bonusHeros(s).revelerVague && s.incomingFronts
      ? s.incomingFronts.map((id) => SECTEURS.find((x) => x.id === id)?.nom ?? id)
      : null,
  )

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
        {/* Ulysse lit dans la poussière quels pans seront visés */}
        {fronts && (
          <div className="detail" style={{ color: '#cbd8e2' }}>
            🐎 Ulysse a fait parler un éclaireur : ils frapperont {fronts.join(' et ')}.
          </div>
        )}
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
