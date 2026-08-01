import { useRef, useState } from 'react'
import { GEO_EXPEDITION } from '../../game/combat'
import { MODE_TEST, UNITS, UNIT_IDS, WALL_HP } from '../../game/data'
import {
  MAX_TROUPES,
  RAID_COOLDOWN_MS,
  TRIBUT_MS,
  VILLAGES_CIBLES,
  VILLAGES_PAR_ID,
  assiegeants,
  garnisonEffective,
  puissanceAssiegeants,
  puissanceEffective,
  type Intention,
} from '../../game/expeditions'
import { fmtDuree, merFermee, totalEtoiles, useGame } from '../../game/store'
import type { ResourceId, UnitId } from '../../game/types'
import { Montant } from './Icones'
import { Modale } from './Modale'
import { BatailleLayer } from '../map/BatailleLayer'
import { useCamera, type VueScene } from '../map/camera'
import { DefsArt } from '../map/art'
import { DefsBatiments } from '../map/Batiments'
import { Meteo, VoileSaison } from '../map/Ciel'
import { Murailles } from '../map/Murailles'
import { CoeurVillage, DecorExpedition } from '../map/VillageEnnemi'
import { DieuxRapides } from './Hud'

function puissance(troupes: Record<UnitId, number>): number {
  return UNIT_IDS.reduce((a, u) => a + (troupes[u] ?? 0) * (UNITS[u].atk + UNITS[u].hp / 8), 0)
}

function Etoiles({ n, taille = 16 }: { n: number; taille?: number }) {
  return (
    <span className="etoiles" style={{ fontSize: taille }}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < n ? 'pleine' : 'vide'}>
          ★
        </span>
      ))}
    </span>
  )
}

// ── Panneau : liste des villages + sélection des troupes ─────────────────────
export function PanneauExpeditions() {
  const s = useGame()
  const [cibleId, setCibleId] = useState<string | null>(null)
  const [intention, setIntention] = useState<Intention>('pillage')
  const [troupes, setTroupes] = useState<Record<UnitId, number>>({ lancier: 0, archer: 0, hoplite: 0 })
  const now = s.lastSeen
  const cooldown = RAID_COOLDOWN_MS / (MODE_TEST ? 10 : 1)

  const cible = cibleId ? VILLAGES_PAR_ID[cibleId] : null
  const total = UNIT_IDS.reduce((a, u) => a + troupes[u], 0)
  const appel = s.appelSecours ? VILLAGES_PAR_ID[s.appelSecours.villageId] : null

  const ouvrir = (id: string, quoi: Intention) => {
    setTroupes({ lancier: 0, archer: 0, hoplite: 0 })
    setIntention(quoi)
    setCibleId(id)
  }

  if (cible) {
    const maPuissance = puissance(troupes)
    const secours = intention === 'secours'
    const pillages = s.expeditions[cible.id]?.pillages ?? 0
    // en secours on affronte les assiégeants en rase campagne, pas la garnison
    const face = secours ? assiegeants(cible) : garnisonEffective(cible, pillages)
    const leurPuissance = secours ? puissanceAssiegeants(cible) : puissanceEffective(cible, pillages)
    return (
      <Modale
        titre={`${cible.emoji} ${secours ? `Délivrer ${cible.nom}` : `Marcher sur ${cible.nom}`}`}
        onFermer={() => setCibleId(null)}
        fermerTexte={null}
      >
        <>
          <div className="desc-exp">{cible.desc}</div>
          <div className={`intention ${intention}`}>
            {secours ? (
              <>
                <b>⛑️ Secourir</b> — aucun butin, mais Zeus et Athéna vous en sauront gré, et {cible.nom} deviendra un
                allié : tribut régulier et renforts à chaque assaut sur vos murs. Vous pouvez y perdre des hommes pour
                rien.
              </>
            ) : (
              <>
                <b>🏴‍☠️ Piller</b> — butin élevé, mais Zeus Xenios n’aime pas cela (−5), la menace monte, et le village
                s’en souviendra : sa garnison sera plus fournie la prochaine fois.
              </>
            )}
          </div>
          <div className="bloc">
            <h3>{secours ? 'Les assiégeants' : 'Leur défense'}</h3>
            <div className="ligne-exp">
              {secours ? '⚔️ Rase campagne — aucun mur à briser' : `🧱 Remparts niveau ${cible.mur} (${WALL_HP[cible.mur]} pts)`}{' '}
              ·{' '}
              {UNIT_IDS.filter((u) => face[u] > 0)
                .map((u) => `${face[u]} ${UNITS[u].emoji}`)
                .join(' ')}
              {' '}· puissance ≈ <b>{leurPuissance}</b>
              {!secours && pillages > 0 && (
                <span style={{ color: '#d98a4e' }}> (garnison renforcée : {pillages} pillage{pillages > 1 ? 's' : ''} encaissé{pillages > 1 ? 's' : ''})</span>
              )}
            </div>
          </div>
          <div className="bloc">
            <h3>
              Vos troupes ({total}/{MAX_TROUPES}) — puissance ≈ {Math.round(maPuissance)}
            </h3>
            {UNIT_IDS.map((u) => (
              <div key={u} className="unite">
                <span style={{ fontSize: 22 }}>{UNITS[u].emoji}</span>
                <div className="infos">
                  <div className="nom">{UNITS[u].nom}</div>
                  <div className="stats">
                    disponibles : {s.army[u]} · ⚔{UNITS[u].atk} ❤{UNITS[u].hp}
                    {u === 'archer' ? ' · peu efficace contre les murs' : ''}
                  </div>
                </div>
                <div className="actions">
                  <button onClick={() => setTroupes({ ...troupes, [u]: Math.max(0, troupes[u] - 1) })}>−</button>
                  <span className="compteur">{troupes[u]}</span>
                  <button
                    onClick={() => setTroupes({ ...troupes, [u]: Math.min(s.army[u], troupes[u] + 1) })}
                    disabled={total >= MAX_TROUPES || troupes[u] >= s.army[u]}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 12, color: maPuissance >= leurPuissance ? '#5fae7d' : '#d98a4e', marginTop: 6 }}>
              {maPuissance >= leurPuissance * 1.3
                ? '⚖️ Rapport de force très favorable.'
                : maPuissance >= leurPuissance
                  ? '⚖️ Rapport de force favorable — mais la guerre a ses caprices.'
                  : '⚠️ Rapport de force défavorable : vos troupes risquent d’y rester.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ flex: 1 }} onClick={() => setCibleId(null)}>
              Retour
            </button>
            <button
              className="principal"
              style={{ flex: 2 }}
              disabled={total === 0 || s.battle !== null || s.expedition !== null}
              onClick={() => s.lancerExpedition(cible.id, troupes, intention)}
            >
              {secours ? '⛑️ Courir à leur secours' : '🏴‍☠️ Lancer l’assaut'}
            </button>
          </div>
        </>
      </Modale>
    )
  }

  return (
    <Modale
      titre="🗺️ Expéditions — la Troade à feu et à sang"
      dataTuto="modale-expeditions"
      large
      onFermer={() => s.openPanel(null)}
      sous={
        <>
          Envoyez vos troupes piller les places fortes de la région — ou les sauver. Moins de pertes = plus d’étoiles.{' '}
          <b style={{ color: '#e8c04a' }}>{totalEtoiles(s.expeditions)}</b>/24 ★
        </>
      }
    >
      <>
        {/* un village assiégé appelle : richesse contre réseau, il faut trancher */}
        {appel && s.appelSecours && (
          <div className="appel-secours">
            <div className="appel-titre">
              ⛑️ {appel.nom} est assiégé et implore votre aide
              <span className="appel-compte">{fmtDuree(Math.max(0, s.appelSecours.expireAt - now))}</span>
            </div>
            <div className="appel-texte">
              Aucun butin à espérer. En échange : Zeus +12, Athéna +7, et une alliance — tribut toutes les{' '}
              {Math.round(TRIBUT_MS / 60_000)} min et des renforts sur vos remparts à chaque assaut.
            </div>
            <div className="appel-actions">
              <button
                className="principal"
                disabled={s.battle !== null || s.expedition !== null}
                onClick={() => ouvrir(appel.id, 'secours')}
              >
                ⛑️ Porter secours
              </button>
              <button className="danger" onClick={() => s.ignorerSecours()} title="Zeus Xenios protège les suppliants">
                🚪 Fermer la porte (Zeus −4)
              </button>
            </div>
          </div>
        )}
        {VILLAGES_CIBLES.map((v) => {
          const etat = s.expeditions[v.id]
          const resteCd = Math.max(0, (etat?.dernierRaid ?? 0) + cooldown - now)
          const pillages = etat?.pillages ?? 0
          const garnison = garnisonEffective(v, pillages)
          const allie = s.alliances[v.id]
          return (
            <div key={v.id} className={`exp-village${allie ? ' allie' : ''}`}>
              <div className="embleme">{v.emoji}</div>
              <div className="corps">
                <div className="ligne-titre">
                  <h3>{v.nom}</h3>
                  <Etoiles n={etat?.etoiles ?? 0} />
                  {allie && (
                    <span className="badge-allie" title={`Allié depuis ${fmtDuree(now - allie.depuis)} — tribut et renforts`}>
                      🤝 allié
                    </span>
                  )}
                </div>
                <div className="desc-exp">{v.desc}</div>
                <div className="ligne-exp">
                  🛡️ Puissance ≈ <b>{puissanceEffective(v, pillages)}</b> · 🧱 niv. {v.mur} ·{' '}
                  {UNIT_IDS.filter((u) => garnison[u] > 0)
                    .map((u) => `${garnison[u]}${UNITS[u].emoji}`)
                    .join(' ')}
                  {'  ·  '}🎁{' '}
                  {(Object.entries(v.butin) as [ResourceId, number][]).map(([r, n]) => (
                    <Montant key={r} n={Math.round(n * (etat?.etoiles ? 0.4 : 1))} id={r} />
                  ))}
                  {etat?.etoiles ? ' (déjà pillé)' : ''}
                  {pillages > 0 && <span style={{ color: '#d98a4e' }}> · garde renforcée ×{pillages}</span>}
                </div>
              </div>
              <div className="action-exp">
                {v.maritime && merFermee(s) ? (
                  <span className="cd" title="L’hiver ferme la mer : les places d’outre-mer sont hors d’atteinte.">
                    ❄️ mer prise
                  </span>
                ) : resteCd > 0 ? (
                  <span className="cd">⏳ {fmtDuree(resteCd)}</span>
                ) : (
                  <button
                    className="principal"
                    disabled={s.battle !== null || s.expedition !== null}
                    onClick={() => ouvrir(v.id, 'pillage')}
                    title={allie ? 'Piller un allié rompt l’alliance sur-le-champ' : undefined}
                  >
                    {allie ? 'Trahir' : 'Piller'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </>
    </Modale>
  )
}

// ── Scène : l'assaut du village ennemi, joué en direct ───────────────────────

/** la scène d'expédition est plus petite que la carte : on serre un peu moins fort */
const VUE_EXPEDITION: VueScene = { w: 900, h: 560, zMin: 1.6, zMax: 2.05 }
const lireBatailleExpedition = () => useGame.getState().expedition?.battle ?? null

export function ExpeditionScene() {
  const s = useGame()
  const exp = s.expedition
  const svgRef = useRef<SVGSVGElement | null>(null)
  const scene = useRef<SVGGElement | null>(null)
  // la scène d'assaut se manipule aussi : molette, glisser, double-clic
  const camera = useCamera(svgRef, scene, VUE_EXPEDITION, lireBatailleExpedition)
  if (!exp) return null
  const v = VILLAGES_PAR_ID[exp.villageId]
  const geo = GEO_EXPEDITION
  const wallMax = WALL_HP[v.mur]
  const vivantsJoueur = exp.battle.fighters.filter((f) => f.camp === 'attaque' && f.etat !== 'mort' && f.etat !== 'fuite').length
  const vivantsEnnemis = exp.battle.fighters.filter((f) => f.camp === 'defense' && f.etat !== 'mort').length

  return (
    <div className="voile">
      {/* la scène mérite de la place à l'écran : on desserre le gabarit des modales */}
      <div
        className="modale scene-exp"
        style={{ maxWidth: 'min(1080px, 94vw)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>
          {exp.intention === 'secours' ? `⛑️ Délivrance de ${v.nom}` : `${v.emoji} Assaut sur ${v.nom}`}
        </h2>
        {/* hauteur pilotée, largeur déduite du ratio 900×560 : aucune bande noire */}
        <svg
          ref={svgRef}
          viewBox="0 0 900 560"
          className="carte-exp"
          style={{ height: 'min(58vh, 56vw)', width: 'auto', maxWidth: '100%', margin: '0 auto' }}
          role="img"
          aria-label={`Assaut sur ${v.nom}`}
        >
          <defs>
            <DefsArt />
            <DefsBatiments />
          </defs>
          {/* la caméra se rapproche de la mêlée pendant l'assaut */}
          <g ref={scene}>
            {/* chaque place forte a son cadre : plaine, colline, grève ou île */}
            <DecorExpedition v={v} saison={s.saison} />

            <Murailles niveau={v.mur} hp={exp.wallHp} max={wallMax} breche={exp.battle.breche} layer="back" geo={geo} />

            {/* l'intérieur du village visé, peint selon son archétype */}
            <g transform={`translate(${geo.place.x},${geo.place.y})`}>
              <CoeurVillage decor={v.decor} />
            </g>

            <Murailles niveau={v.mur} hp={exp.wallHp} max={wallMax} breche={exp.battle.breche} layer="front" geo={geo} />

            <BatailleLayer battle={exp.battle} now={s.lastSeen} wallHp={exp.wallHp} wallMax={wallMax} />
          </g>
          {/* le ciel du jour vaut aussi loin de chez soi */}
          <Meteo meteo={s.meteo} w={900} h={560} />
          <VoileSaison saison={s.saison} w={900} h={560} />
        </svg>
        {camera.manuel && (
          <button className="exp-recentrer" onClick={camera.recentrer}>
            ⤢ recentrer la vue (×{camera.zoom.toFixed(1)})
          </button>
        )}

        {exp.result ? (
          <div className="resultat-exp">
            <div className="etoiles-resultat">
              {[0, 1, 2].map((i) => (
                <span key={i} className={i < exp.result!.etoiles ? 'pleine' : 'vide'}>
                  ★
                </span>
              ))}
            </div>
            {exp.result.lignes.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
            <button className="principal" style={{ width: '100%', marginTop: 10 }} onClick={() => s.fermerExpedition()}>
              Rentrer au village
            </button>
          </div>
        ) : (
          <>
            <div className="statut-exp">
              ⚔️ Vos troupes : <b>{vivantsJoueur}</b> · Défenseurs : <b>{vivantsEnnemis}</b>
              {v.mur > 0 && exp.battle.breche && ' · 💥 brèche ouverte !'}
            </div>
            <DieuxRapides />
            <button className="danger" style={{ width: '100%', marginTop: 8 }} onClick={() => s.retraiteExpedition()}>
              🏳️ Sonner la retraite
            </button>
          </>
        )}
      </div>
    </div>
  )
}
