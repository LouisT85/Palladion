import { useEffect, useState } from 'react'
import { ficheChampion } from '../../game/champions'
import { tailleVague } from '../../game/combat'
import {
  RANGS_SIEGE,
  championSiege,
  prochainRang,
  rangSiege,
  vagueSiege,
  type EtatSiege,
} from '../../game/siege'
import { useGame } from '../../game/store'

/*
 * ═══════════════════════ L'AFFICHAGE DU SIÈGE ═══════════════════════
 *
 * Le mode ne pose qu'une question - combien de vagues ? - alors l'écran ne
 * répond qu'à celle-là : le numéro en gros, le compte à rebours du répit, les
 * points, le record. Rien d'autre ne mérite la place du bandeau.
 *
 * Les deux composants lisent `s.siege` DÉFENSIVEMENT : le champ n'existe pas
 * encore dans le store, et le jour où il existera ils n'auront pas à changer.
 * Sans siège en cours, ils ne rendent rien - donc on peut les monter tout de
 * suite dans le HUD sans rien casser des autres modes.
 */

function useSiege(): EtatSiege | null {
  return useGame((s) => (s as { siege?: EtatSiege | null }).siege ?? null)
}

/** une horloge locale : le bandeau doit égrener les secondes du répit */
function useMaintenant(actif: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!actif) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [actif])
  return now
}

function mmss(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Le bandeau du HUD. Pendant le répit il montre l'échéance et ce qui vient ;
 * pendant l'assaut il se contente du numéro de vague - la barre de bataille dit
 * déjà tout le reste.
 */
export function BandeauSiege() {
  const siege = useSiege()
  const enBataille = useGame((s) => !!s.battle)
  const now = useMaintenant(!!siege && !siege.fini)
  if (!siege || siege.fini) return null

  const restant = Number.isFinite(siege.prochaineAt) ? Math.max(0, siege.prochaineAt - now) : 0
  const prochaine = siege.vague + (enBataille ? 0 : 1)
  const v = vagueSiege(Math.max(1, prochaine))
  const champ = championSiege(Math.max(1, prochaine))
  // la jauge se vide : on doit sentir le répit fondre sans lire les chiffres
  const part = siege.repit > 0 ? Math.max(0, Math.min(1, restant / siege.repit)) : 0

  return (
    <div className="bandeau">
      <div className="gros">
        🏛️ VAGUE {Math.max(1, prochaine)}
        {!enBataille && (
          <>
            {' '}
            dans <span className="compte">{mmss(restant)}</span>
          </>
        )}
      </div>
      {!enBataille && (
        <>
          <div className="acte-jauge" style={{ margin: '6px 0' }}>
            <div style={{ width: `${Math.round(part * 100)}%` }} />
          </div>
          <div className="detail">
            {tailleVague(v.wave)} assaillants, {v.fronts === 1 ? 'un seul front' : v.fronts === 2 ? 'deux fronts' : 'trois fronts'} - relevez vos murs.
          </div>
        </>
      )}
      {enBataille && <div className="detail">Le siège ne s’interrompt pas : la vague suivante est déjà en marche.</div>}
      {champ && (
        <div className="detail champion-presage">
          <b style={{ color: '#ffb9a5' }}>
            {ficheChampion(champ.id).emoji} {champ.titre}
          </b>
          <div>
            {champ.capacite.emoji} {champ.capacite.nom} - {champ.capacite.desc}
          </div>
        </div>
      )}
      <div className="detail recompense">
        ⭐ <b>{siege.points}</b> points · {rangSiege(siege.points)} · vagues tenues <b>{siege.tenues}</b> · record{' '}
        <b>{siege.record}</b>
      </div>
    </div>
  )
}

/**
 * Le bilan, quand l'agora tombe. Il doit donner l'envie de recommencer : d'où le
 * rang obtenu, le rang manqué de peu, et un seul bouton bien large.
 */
export function ModaleFinSiege({ onFermer }: { onFermer: () => void }) {
  const siege = useSiege()
  if (!siege || !siege.fini) return null

  const titre = rangSiege(siege.points)
  const suivant = prochainRang(siege.points)
  const nouveauRecord = siege.tenues > siege.record
  const minutes = Math.max(1, Math.round((Date.now() - siege.debutAt) / 60_000))
  const palier = RANGS_SIEGE.findIndex((r) => r.titre === titre) + 1

  return (
    <div className="voile">
      <div className="modale fin-regne">
        <h2>🏛️ Le Palladion est tombé</h2>
        <div className="fin-score">{siege.tenues}</div>
        <div className="fin-titre">{siege.tenues === 1 ? 'vague tenue' : 'vagues tenues'}</div>
        <div className="fin-desc">
          {titre} - {palier}ᵉ des huit titres que donnent les aèdes.
        </div>
        <div className="fin-detail">
          <span>⭐ {siege.points} points</span>
          <span>💀 {siege.pertes} défenseurs tombés</span>
          <span>⏳ {minutes} min de siège</span>
          <span>
            🏅 record {nouveauRecord ? 'battu' : `à ${Math.max(siege.record, siege.tenues)}`}
          </span>
        </div>
        {suivant && (
          <div style={{ fontSize: 12.5, color: '#93a7b4', marginTop: 10, textAlign: 'center' }}>
            {suivant.manque} points de plus et les aèdes vous appelaient « {suivant.titre} ».
          </div>
        )}
        {nouveauRecord && (
          <div style={{ fontSize: 13, color: '#e8c04a', marginTop: 8, textAlign: 'center' }}>
            🏅 Nouveau record : jamais vos murs n’avaient tenu si longtemps.
          </div>
        )}
        {siege.tenues < siege.record && (
          <div style={{ fontSize: 12.5, color: '#93a7b4', marginTop: 8, textAlign: 'center' }}>
            Votre meilleur siège en avait tenu {siege.record}.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="principal" style={{ flex: 1 }} onClick={onFermer}>
            ⚔️ Recommencer le siège
          </button>
        </div>
      </div>
    </div>
  )
}
