import { useEffect, useMemo, useRef, useState } from 'react'
import {
  classementLocal,
  defiDeLaSemaine,
  meilleurDefi,
  progressionObjectif,
  recordDefi,
  scoreDefi,
  type DefiSemaine,
} from '../../game/defi'
import { HAUTS_FAITS } from '../../game/hautsfaits'
import {
  CATEGORIES_DON,
  DONS_PAR_ID,
  apercuHeritage,
  appliquerHeritage,
  bilanDeFin,
  coutHeritage,
  ecrireArchive,
  lireArchive,
  optionsHeritage,
  pointsHeritage,
  poserHeritageEnAttente,
  reportRelations,
  type CategorieDon,
  type ChoixHeritage,
} from '../../game/ngplus'
import { prestigeCourant, useGame } from '../../game/store'
import { Modale } from './Modale'

/*
 * ═══════════════ RECOMMENCER : LE BILAN, L'HÉRITAGE, LE DÉFI ═══════════════
 *
 * Trois écrans pour la même idée - donner une raison de REFERMER une partie :
 *
 *  · le BILAN dit ce que le règne valait et, surtout, ce qu'il lègue. C'est là
 *    que se joue l'envie de recommencer, donc les points d'héritage gagnés sont
 *    en gros caractères, à côté du prestige ;
 *  · l'HÉRITAGE est un marché, et un marché ne se juge que si l'on voit les deux
 *    plateaux : chaque don coché fait monter, sous les yeux, la menace initiale
 *    et la cadence des vagues. Rien n'est caché derrière un « recommencer » ;
 *  · le DÉFI montre la semaine, ses contraintes, son objectif et les scores
 *    passés du joueur.
 *
 * Tout accès au store neuf est DÉFENSIF (`s as { champ?: T }`) : ces écrans
 * compilent et tournent avant que le lead n'ait câblé quoi que ce soit, et ils
 * n'auront pas à changer après.
 */

// ── Le bilan de fin de règne ──────────────────────────────────────────────────

/** ce que le store pose quand un règne s'achève - déjà présent : `s.finDePartie` */
interface FinDePartie {
  score: number
  titre: string
  desc: string
  lignes: string[]
}

/**
 * Le bilan. Il s'affiche dès que le store porte une fin de partie, archive le
 * règne une fois pour toutes, puis ouvre la porte du marché.
 *
 * L'archivage se fait ICI faute d'être encore dans le store : c'est un effet à
 * déclenchement unique par score, et le jour où `abdiquer()` l'écrira lui-même,
 * il suffira de retirer l'effet (voir la note de câblage).
 */
export function EcranFinDePartie({ onFermer }: { onFermer: () => void }) {
  const fin = useGame((s) => (s as { finDePartie?: FinDePartie | null }).finDePartie ?? null)
  const stats = useGame((s) => s.stats)
  const hautsFaits = useGame((s) => s.hautsFaits)
  const pop = useGame((s) => s.pop)
  const jour = useGame((s) => s.dernierJourVecu)
  const relations = useGame((s) => s.relations)
  const reset = useGame((s) => s.reset)
  const [heritageOuvert, setHeritageOuvert] = useState(false)
  const archiveLe = useRef<number | null>(null)
  // l'archive telle qu'elle était AVANT ce règne : c'est elle qui dit ce que le
  // règne a fait gagner. La relire après l'écriture donnerait toujours zéro.
  const [avant] = useState(lireArchive)
  const [archive, setArchive] = useState(avant)

  const score = fin?.score ?? 0
  useEffect(() => {
    if (!fin || archiveLe.current === score) return
    archiveLe.current = score
    setArchive(
      ecrireArchive(
        bilanDeFin(
          {
            prestige: score,
            jour,
            pop,
            repousses: stats.repousses,
            hautsFaits: hautsFaits.length,
            relations: relations ?? {},
          },
          Date.now(),
        ),
      ),
    )
  }, [fin, score, jour, pop, stats.repousses, hautsFaits.length, relations])

  if (!fin) return null
  if (heritageOuvert) return <PanneauHeritage onFermer={() => setHeritageOuvert(false)} />

  const vu = apercuHeritage(avant, score)
  const rancunes = Object.entries(reportRelations(relations ?? {})).filter(([, v]) => v < 0)

  return (
    <div className="voile">
      <div className="modale fin-regne">
        <h2>👑 Fin du règne</h2>
        <div className="fin-score">{score}</div>
        <div className="fin-titre">{fin.titre}</div>
        <div className="fin-desc">{fin.desc}</div>
        <div className="fin-detail">
          {fin.lignes.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: '#93a7b4', marginTop: 10 }}>
          {hautsFaits.length}/{HAUTS_FAITS.length} hauts faits · {stats.repousses} assauts repoussés · {pop} habitants ·
          jour {jour}
        </div>

        <div className="prestige-bloc" style={{ justifyContent: 'center' }}>
          <div className="prestige-score">
            <span className="chiffre">{vu.points}</span>
            <span className="unite">POINTS D’HÉRITAGE</span>
          </div>
          <div className="prestige-titre">
            <b>{vu.record ? '🏅 Votre plus beau règne' : `Règne n° ${Math.max(1, archive.regnes)}`}</b>
            <span>
              {vu.gagnes > 0
                ? `${vu.gagnes} points de plus qu’avant ce règne. À dépenser au départ du suivant.`
                : 'L’héritage se calcule sur votre plus beau règne : celui-ci ne vous a rien coûté.'}
            </span>
          </div>
        </div>

        {rancunes.length > 0 && (
          <div style={{ fontSize: 12.5, color: '#c0563f', marginTop: 10 }}>
            🗡️ La Troade se souvient : {rancunes.length} village{rancunes.length > 1 ? 's' : ''} vous
            {rancunes.length > 1 ? ' garderont' : ' gardera'} rancune dans la partie suivante.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button style={{ flex: 1 }} onClick={onFermer}>
            Contempler encore
          </button>
          <button
            className="principal"
            style={{ flex: 1 }}
            onClick={() => (vu.points > 0 ? setHeritageOuvert(true) : (onFermer(), reset()))}
          >
            {vu.points > 0 ? '🏛️ Léguer et refonder' : '🏛️ Fonder une nouvelle cité'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Le marché de l'héritage ───────────────────────────────────────────────────

const ORDRE_CAT: CategorieDon[] = ['reserves', 'peuple', 'pierre', 'olympe', 'legende']

function mmss(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`
}

/**
 * Dépenser son héritage. La colonne de droite - la difficulté - se met à jour à
 * chaque clic : c'est elle qui fait du panneau un arbitrage et non une liste de
 * cadeaux.
 */
export function PanneauHeritage({ onFermer }: { onFermer: () => void }) {
  const reset = useGame((s) => s.reset)
  const commencer = useGame(
    (s) => (s as { commencerHeritage?: (choix: ChoixHeritage) => void }).commencerHeritage,
  )
  const archive = useMemo(() => lireArchive(), [])
  const budget = pointsHeritage(archive)
  const dons = useMemo(() => optionsHeritage(), [])
  const [choix, setChoix] = useState<ChoixHeritage>({})

  const depense = coutHeritage(choix)
  const reste = budget - depense
  const m = appliquerHeritage(choix)

  const ajouter = (id: string, n: number) => {
    setChoix((av) => {
      const don = DONS_PAR_ID[id]
      const k = Math.max(0, Math.min(don.max, (av[id] ?? 0) + n))
      // on refuse ce qui dépasse le budget plutôt que d'accepter une dette
      if (n > 0 && coutHeritage({ ...av, [id]: k }) > budget) return av
      const suite = { ...av, [id]: k }
      if (k === 0) delete suite[id]
      return suite
    })
  }

  return (
    <Modale
      titre="🏛️ L’héritage du règne"
      sous={`${archive.regnes} règne${archive.regnes > 1 ? 's' : ''} achevé${archive.regnes > 1 ? 's' : ''} · ${archive.prestigeCumule} de prestige cumulé · meilleur règne ${archive.meilleur}`}
      large
      onFermer={onFermer}
      fermerTexte={null}
    >
      <>
        <div className="prestige-bloc">
          <div className="prestige-score">
            <span className="chiffre">{reste}</span>
            <span className="unite">POINTS À DÉPENSER</span>
          </div>
          <div className="prestige-titre">
            <b>Le marché est honnête</b>
            <span>
              Chaque point dépensé arme la plaine en face : {m.malus.threatMod > 0 ? `+${m.malus.threatMod}` : '+0'} de
              menace, premier assaut à {mmss(m.malus.premierAssautMs)}, vagues{' '}
              {Math.round(m.malus.vaguePlus * 100)} % plus rapprochées.
            </span>
          </div>
        </div>

        {budget === 0 && (
          <div style={{ color: '#93a7b4', fontSize: 13, marginTop: 12 }}>
            Aucun règne achevé ne vous a encore rien légué. Menez une partie à son terme - par l’abdication ou par la
            chute du Palladion - et son prestige se changera en points.
          </div>
        )}

        {ORDRE_CAT.map((cat) => {
          const liste = dons.filter((d) => d.cat === cat)
          if (liste.length === 0) return null
          return (
            <div key={cat} style={{ marginTop: 14 }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#e8c04a' }}>
                {CATEGORIES_DON[cat].emoji} {CATEGORIES_DON[cat].nom}
              </div>
              {liste.map((d) => {
                const pris = choix[d.id] ?? 0
                const abordable = pris < d.max && depense + d.cout <= budget
                return (
                  <div key={d.id} className={`heros-carte${!abordable && pris === 0 ? ' verrouille' : ''}`}>
                    <div
                      className="heros-embleme"
                      style={{ borderColor: pris > 0 ? '#e8c04a' : '#2b3f52', color: pris > 0 ? '#e8c04a' : '#cfd8de' }}
                    >
                      {d.emoji}
                      <span className="heros-niveaux">{d.cout} PT</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontFamily: 'Georgia, serif', fontSize: 14.5 }}>{d.nom}</b>
                      <div style={{ fontSize: 12, color: '#93a7b4', lineHeight: 1.45, marginTop: 2 }}>{d.desc}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                        <button onClick={() => ajouter(d.id, -1)} disabled={pris === 0} aria-label={`Retirer ${d.nom}`}>
                          −
                        </button>
                        <b style={{ minWidth: 42, textAlign: 'center', color: pris > 0 ? '#e8c04a' : '#93a7b4' }}>
                          {d.max > 1 ? `${pris} / ${d.max}` : pris > 0 ? 'pris' : '—'}
                        </b>
                        <button
                          className={pris > 0 ? '' : 'principal'}
                          onClick={() => ajouter(d.id, 1)}
                          disabled={!abordable}
                          aria-label={`Prendre ${d.nom}`}
                        >
                          ＋
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button style={{ flex: 1 }} onClick={onFermer}>
            Revenir au bilan
          </button>
          <button
            className="principal"
            style={{ flex: 2 }}
            onClick={() => {
              // le panier est déposé, la fondation du village le ramassera
              poserHeritageEnAttente(choix)
              if (commencer) commencer(choix)
              else reset()
            }}
          >
            🏛️ Fonder la cité{depense > 0 ? ` avec ${depense} point${depense > 1 ? 's' : ''} d’héritage` : ' sans héritage'}
          </button>
        </div>
      </>
    </Modale>
  )
}

// ── Le défi de la semaine ─────────────────────────────────────────────────────

/** l'état du défi en cours, tel que le store le portera dans `s.defi` */
interface EtatDefi {
  numero: number
  graine: number
  points?: number
}

/**
 * Le défi de la semaine : la même Troade pour tout le monde, du lundi au
 * dimanche. Le panneau montre les contraintes AVANT qu'on ne s'engage, parce que
 * découvrir « pas de port » au bout d'une heure ne serait pas un défi mais un
 * piège.
 */
export function PanneauDefi({ onFermer }: { onFermer: () => void }) {
  const choisirMode = useGame((s) => s.choisirMode)
  const mode = useGame((s) => s.mode)
  const enCours = useGame((s) => (s as { defi?: EtatDefi | null }).defi ?? null)
  const s = useGame()
  const defi: DefiSemaine = useMemo(() => defiDeLaSemaine(new Date()), [])
  const classement = useMemo(() => classementLocal(), [])
  const record = useMemo(() => recordDefi(), [])
  const fait = meilleurDefi(defi.numero)

  // le score courant n'a de sens qu'en partie de défi : ailleurs c'est un aperçu
  const snap = {
    prestige: prestigeCourant(s),
    repousses: s.stats.repousses,
    pop: s.pop,
    hautsFaits: (s.hautsFaits ?? []).length,
    jour: s.dernierJourVecu,
  }
  const score = scoreDefi(snap, defi)
  const part = progressionObjectif(snap, defi.objectif)
  const actif = mode === 'defi'

  return (
    <Modale
      titre={`🗓️ Défi de la semaine n° ${defi.numero}`}
      sous={`Semaine ${defi.semaine} de ${defi.annee} · graine ${defi.graine} · la même Troade pour tous, jusqu’à dimanche soir`}
      large
      onFermer={onFermer}
      fermerTexte={null}
    >
      <>
        <div className="prestige-bloc">
          <div className="prestige-score">
            <span className="chiffre">×{defi.mult.toFixed(2)}</span>
            <span className="unite">MULTIPLICATEUR</span>
          </div>
          <div className="prestige-titre">
            <b>🎯 {defi.objectif.label}</b>
            <span>{defi.objectif.desc}</span>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {defi.contraintes.map((c) => (
            <div key={c.id} className="heros-carte">
              <div className="heros-embleme" style={{ borderColor: '#c0563f', color: '#ffb9a5' }}>
                {c.emoji}
                <span className="heros-niveaux">{c.poids} PT</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontFamily: 'Georgia, serif', fontSize: 14.5 }}>{c.nom}</b>
                <div style={{ fontSize: 12, color: '#93a7b4', lineHeight: 1.45, marginTop: 2 }}>{c.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {actif && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12.5, color: '#93a7b4', display: 'flex', justifyContent: 'space-between' }}>
              <span>
                Objectif : {Math.round(part * 100)} %{score.objectifAtteint ? ' - tenu' : ''}
              </span>
              <span>
                ⭐ <b style={{ color: '#e8c04a' }}>{score.points}</b> points
                {enCours?.points ? ` (enregistré : ${enCours.points})` : ''}
              </span>
            </div>
            <div className="acte-jauge" style={{ margin: '6px 0' }}>
              <div style={{ width: `${Math.round(part * 100)}%` }} />
            </div>
            <div className="fin-detail" style={{ justifyContent: 'flex-start' }}>
              {score.detail.map((d) => (
                <span key={d.label}>
                  {d.label} <b>{d.points}</b>
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#e8c04a' }}>🏅 Vos semaines passées</div>
          {classement.length === 0 && (
            <div style={{ color: '#93a7b4', fontSize: 13, marginTop: 6 }}>
              Aucun défi terminé. Le score s’inscrit ici à la fin du règne, une ligne par semaine, et seule la meilleure
              tentative reste.
            </div>
          )}
          {classement.map((e) => (
            <div
              key={e.numero}
              className="rapport"
              style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}
            >
              <span>
                {e.numero === defi.numero ? '👉 ' : ''}Défi n° {e.numero} · semaine {e.semaine} de {e.annee}
              </span>
              <b style={{ color: e.objectifAtteint ? '#7fb069' : '#cfd8de' }}>
                {e.points} pts {e.objectifAtteint ? '· objectif tenu' : ''}
                {record && record.numero === e.numero ? ' · record' : ''}
              </b>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button style={{ flex: 1 }} onClick={onFermer}>
            Fermer
          </button>
          {!actif && (
            <button
              className="principal"
              style={{ flex: 2 }}
              onClick={() => {
                choisirMode('defi')
                onFermer()
              }}
            >
              🗓️ Relever le défi{fait ? ` (au mieux ${fait.points} pts)` : ''}
            </button>
          )}
        </div>
      </>
    </Modale>
  )
}

/** le bandeau du HUD en mode défi : la semaine, l'objectif, où l'on en est */
export function BandeauDefi() {
  const mode = useGame((s) => s.mode)
  const s = useGame()
  const defi = useMemo(() => defiDeLaSemaine(new Date()), [])
  if (mode !== 'defi') return null

  const snap = {
    prestige: prestigeCourant(s),
    repousses: s.stats.repousses,
    pop: s.pop,
    hautsFaits: (s.hautsFaits ?? []).length,
    jour: s.dernierJourVecu,
  }
  const part = progressionObjectif(snap, defi.objectif)
  const contraintes = defi.contraintes.map((c) => `${c.emoji} ${c.nom}`).join(' · ')

  return (
    <div className="bandeau">
      <div className="gros">
        🗓️ DÉFI n° {defi.numero} - {defi.objectif.label}
      </div>
      <div className="acte-jauge" style={{ margin: '6px 0' }}>
        <div style={{ width: `${Math.round(part * 100)}%` }} />
      </div>
      <div className="detail">{contraintes}</div>
      <div className="detail recompense">
        ⭐ <b>{scoreDefi(snap, defi).points}</b> points · multiplicateur ×{defi.mult.toFixed(2)}
      </div>
    </div>
  )
}
