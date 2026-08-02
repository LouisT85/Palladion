import { useState } from 'react'
import { ACTES_CAMPAGNE, NB_ACTES, type ActeCampagne } from '../../game/campagne'
import { etatActe, useGame } from '../../game/store'
import type { ResourceId } from '../../game/types'
import { HEROS } from '../../game/heros'
import { Montant } from './Icones'
import { Modale } from './Modale'
import { PortraitZeus } from './Zeus'

/*
 * ═══════════════════════ L'ÉCRAN DE LA CAMPAGNE ═══════════════════════
 *
 * Quatre moments, et un seul panneau permanent.
 *
 *  · le CHOIX DU MODE, au tout premier lancement - bac à sable ou La Chute ;
 *  · le PROLOGUE d'un acte, qu'on lit avant que le compte à rebours ne démarre ;
 *  · l'ÉPILOGUE, quand les objectifs obligatoires sont tous franchis ;
 *  · l'ÉCHEC, qui renvoie au premier matin de l'acte et non à la case départ.
 *
 * Le panneau des objectifs, lui, remplace le suivi des missions : en campagne, le
 * fil rouge du bac à sable n'a plus rien à dire - c'est l'acte qui commande.
 */

/** le récit se lit en gros, sur parchemin, comme les dilemmes */
function Recit({ paragraphes }: { paragraphes: string[] }) {
  return (
    <div className="acte-recit">
      {paragraphes.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  )
}

function Recompense({ acte }: { acte: ActeCampagne }) {
  const res = Object.entries(acte.recompense.res ?? {}) as [ResourceId, number][]
  return (
    <span>
      {res.map(([r, n]) => (
        <Montant key={r} n={n} id={r} taille={14} signe />
      ))}
      {acte.recompense.faveur ? <Montant n={acte.recompense.faveur} id="faveur" taille={14} signe /> : null}
      {acte.recompense.pop ? <span className="montant">+{acte.recompense.pop} 👥</span> : null}
    </span>
  )
}

/**
 * Premier lancement : deux façons de jouer, présentées honnêtement. Le bac à
 * sable ne finit jamais ; la campagne finit - et c'est tout l'intérêt.
 */
export function ModaleChoixMode() {
  const mode = useGame((s) => s.mode)
  const choisir = useGame((s) => s.choisirMode)
  if (mode !== null) return null
  return (
    <div className="voile">
      <div className="modale choix-mode">
        <div className="choix-zeus">
          <PortraitZeus taille={104} humeur="calme" />
        </div>
        <h2>🏛️ PALLADION</h2>
        <p className="choix-intro">
          Un village de la Troade, sur la route des armées. Deux façons d’y régner - et l’on peut changer d’avis plus
          tard, dans l’aide.
        </p>
        <div className="choix-cartes">
          <button className="choix-carte" onClick={() => choisir('bac-a-sable')}>
            <span className="cc-emoji">🌾</span>
            <b>Bac à sable</b>
            <span className="cc-desc">
              Bâtir sans fin, à votre rythme. Zeus descend d’abord faire la leçon, puis cinquante-cinq missions jalonnent
              le règne jusqu’à l’abdication. <i>Aucune fin imposée.</i>
            </span>
          </button>
          <button className="choix-carte principal" onClick={() => choisir('campagne')}>
            <span className="cc-emoji">🐴</span>
            <b>La Chute - campagne</b>
            <span className="cc-desc">
              Cinq actes qui suivent l’Iliade, du débarquement achéen à la nuit du cheval. Objectifs imposés, situation
              héritée d’un acte à l’autre, héros qui s’imposent à vous. <i>On peut y perdre.</i>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

/** le prologue : tant qu'il n'est pas lu, l'ennemi attend */
export function ModaleProlologue() {
  const campagne = useGame((s) => s.campagne)
  const commencer = useGame((s) => s.commencerActe)
  // ni pendant un épilogue ni sur un acte perdu : ces deux-là ont leur propre écran
  if (!campagne || campagne.prologueVu || campagne.fini || campagne.accompli || campagne.perdu) return null
  const acte = ACTES_CAMPAGNE[campagne.acte]
  if (!acte) return null
  return (
    <div className="voile">
      <div className="modale parchemin acte-modale">
        <div className="acte-bandeau">
          <span className="acte-emoji">{acte.emoji}</span>
          <div>
            <h2>{acte.titre}</h2>
            <div className="acte-lieu">{acte.lieu}</div>
          </div>
          <span className="acte-numero">
            {acte.numero} / {NB_ACTES}
          </span>
        </div>
        <Recit paragraphes={acte.prologue} />
        <div className="acte-objectifs-liste">
          <h3>Ce qu’on attend de vous</h3>
          {acte.objectifs.map((o) => (
            <div key={o.id} className={`acte-obj${o.facultatif ? ' facultatif' : ''}`}>
              <span className="ao-puce">{o.facultatif ? '◇' : '◆'}</span>
              <div>
                <b>{o.texte}</b>
                {o.facultatif && <span className="ao-fac"> - facultatif</span>}
                {o.pourquoi && <div className="ao-pourquoi">{o.pourquoi}</div>}
              </div>
            </div>
          ))}
        </div>
        {acte.herosScriptes.length > 0 && (
          <div className="acte-heros">
            🛡️ À votre service dès le premier matin :{' '}
            {acte.herosScriptes.map((h) => `${HEROS[h].emoji} ${HEROS[h].nom}`).join(', ')}.
          </div>
        )}
        {acte.defaite && <div className="acte-defaite">⚠️ {acte.defaite.texte}</div>}
        <button className="principal" style={{ width: '100%', marginTop: 14 }} onClick={commencer}>
          Prendre la tête du village
        </button>
      </div>
    </div>
  )
}

/** l'épilogue d'un acte accompli - ou de la campagne entière */
export function ModaleEpilogue() {
  const campagne = useGame((s) => s.campagne)
  const suivant = useGame((s) => s.acteSuivant)
  if (!campagne || (!campagne.accompli && !campagne.fini)) return null
  const acte = ACTES_CAMPAGNE[campagne.acte]
  if (!acte) return null
  const dernier = campagne.fini || campagne.acte + 1 >= NB_ACTES
  return (
    <div className="voile">
      <div className="modale parchemin acte-modale">
        <div className="acte-bandeau">
          <span className="acte-emoji">{campagne.fini ? '👑' : acte.emoji}</span>
          <div>
            <h2>{campagne.fini ? 'La Chute - fin de la campagne' : `${acte.titre} - accompli`}</h2>
            <div className="acte-lieu">{acte.lieu}</div>
          </div>
        </div>
        <Recit paragraphes={acte.epilogue} />
        {!campagne.fini && (
          <div className="acte-recompense">
            🎁 Butin de l’acte : <Recompense acte={acte} />
          </div>
        )}
        {campagne.fini ? (
          <div className="acte-defaite" style={{ borderColor: '#8c6f4e' }}>
            Troie n’est plus qu’une braise sur l’horizon. Votre village, lui, a passé la nuit - et c’est déjà plus que
            n’en ont dit les aèdes. Le bac à sable reste ouvert : la partie continue.
          </div>
        ) : null}
        <button className="principal" style={{ width: '100%', marginTop: 14 }} onClick={suivant}>
          {dernier ? 'Clore la campagne' : `Acte ${acte.numero + 1} - ${ACTES_CAMPAGNE[campagne.acte + 1].titre.split('- ')[1]}`}
        </button>
      </div>
    </div>
  )
}

/** l'acte est perdu : on le reprend, on ne perd pas la campagne */
export function ModaleEchecActe() {
  const campagne = useGame((s) => s.campagne)
  const rejouer = useGame((s) => s.rejouerActe)
  if (!campagne || !campagne.perdu) return null
  const acte = ACTES_CAMPAGNE[campagne.acte]
  if (!acte) return null
  return (
    <div className="voile">
      <div className="modale parchemin acte-modale">
        <h2>💀 {acte.titre} - le village est tombé</h2>
        <Recit paragraphes={acte.echec ?? ['Il ne reste rien à défendre.']} />
        <button className="principal" style={{ width: '100%', marginTop: 14 }} onClick={rejouer}>
          Reprendre l’acte au premier matin
        </button>
      </div>
    </div>
  )
}

/**
 * Le panneau des objectifs, à la place du suivi des missions. Il est repliable
 * comme lui - mais il ne disparaît jamais tout à fait : en campagne, c'est la
 * seule chose qui dit pourquoi on joue.
 */
export function SuiviActe() {
  const s = useGame()
  const [replie, setReplie] = useState(false)
  if (!s.campagne || s.campagne.fini) return null
  const acte = ACTES_CAMPAGNE[s.campagne.acte]
  if (!acte) return null
  const vue = etatActe(s)
  // un objectif verrouillé reste coché, même si l'assaut a défait ce qu'il comptait
  const verrouilles = s.campagne.objectifsFaits
  const obligatoires = acte.objectifs.filter((o) => !o.facultatif)
  const faits = obligatoires.filter((o) => verrouilles.includes(o.id)).length
  const total = obligatoires.length

  return (
    <div className={`missions suivi-acte${replie ? ' replie' : ''}`} data-tuto="objectifs">
      <button className="missions-titre" onClick={() => setReplie(!replie)} aria-expanded={!replie}>
        {acte.emoji} {acte.titre.replace('Acte ', 'Acte ')}
        <span className="compte-missions">
          {faits}/{total}
        </span>
        <span className="chevron">{replie ? '▸' : '▾'}</span>
      </button>
      {!replie && (
        <div className="missions-liste">
          <div className="acte-lieu-suivi">{acte.lieu}</div>
          {acte.objectifs.map((o) => {
            const p = o.progres(vue)
            const ok = verrouilles.includes(o.id) || p.cur >= p.max
            return (
              <div key={o.id} className={`mission${ok ? ' faite' : ''}${o.facultatif ? ' facultatif' : ''}`}>
                <div className="mission-ligne">
                  <span className="mission-emoji">{ok ? '✔' : o.facultatif ? '◇' : '◆'}</span>
                  <div className="mission-corps">
                    <div className="mission-nom">
                      {o.texte}
                      {p.max > 1 && (
                        <span className="mission-compteur">
                          {' '}
                          {p.cur}/{p.max}
                        </span>
                      )}
                    </div>
                    {o.pourquoi && <div className="mission-desc">{o.pourquoi}</div>}
                    {p.max > 1 && (
                      <div className="mission-progres">
                        <div style={{ width: `${(p.cur / p.max) * 100}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** le récit complet de la campagne, relisible à tout moment depuis l'aide */
export function PanneauCampagne() {
  const s = useGame()
  const iActe = s.campagne?.acte ?? -1
  return (
    <Modale
      titre="🐴 La Chute - les cinq actes"
      large
      onFermer={() => s.openPanel(null)}
      sous="Cinq actes qui suivent l’Iliade. Chacun impose une situation de départ, des objectifs et parfois un héros - et chacun peut se perdre."
    >
      <>
        {ACTES_CAMPAGNE.map((a, i) => {
          const etat = i < iActe ? 'acheve' : i === iActe ? 'courant' : 'scelle'
          return (
            <div key={a.id} className={`acte-fiche ${etat}`}>
              <div className="acte-bandeau">
                <span className="acte-emoji">{i > iActe ? '🔒' : a.emoji}</span>
                <div>
                  <b>{a.titre}</b>
                  <div className="acte-lieu">{a.lieu}</div>
                </div>
                <span className="acte-numero">
                  {a.numero}/{NB_ACTES}
                </span>
              </div>
              {i <= iActe && (
                <ul className="acte-liste-obj">
                  {a.objectifs.map((o) => (
                    <li key={o.id}>
                      {o.facultatif ? '◇' : '◆'} {o.texte}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </>
    </Modale>
  )
}
