import { useState } from 'react'
import { BUILDINGS, BUILDING_IDS, METIERS, PROD, RES, TAUX_PORT, TOURS_MAX, TOUR_COUTS, TOUR_PORTEE, UNITS, UNIT_IDS } from '../../game/data'
import { fmtDuree, murMax, oisifs, peutPayer, popCap, postesPourvus, postesTotal, rendement, useGame } from '../../game/store'
import type { BuildingId, ResourceId } from '../../game/types'
import { Icone, type IconeId } from './Icones'
import { PanneauPopulation, couleurRendement } from './Population'

function LigneCout({ cout, resources }: { cout: Partial<Record<ResourceId, number>>; resources: Record<ResourceId, number> }) {
  return (
    <div className="cout">
      {(Object.entries(cout) as [ResourceId, number][]).map(([r, n]) => (
        <span
          key={r}
          className={`montant ${resources[r] >= n ? 'okk' : 'ko'}`}
          title={`${n} ${RES[r].nom.toLowerCase()} — vous en avez ${Math.floor(resources[r])}`}
        >
          <Icone id={r} taille={15} /> {n}
        </span>
      ))}
    </div>
  )
}

function BlocProduction({ id, level }: { id: BuildingId; level: number }) {
  const s = useGame()
  const produit: Partial<Record<BuildingId, IconeId>> = {
    ferme: 'grain',
    scierie: 'bois',
    carriere: 'pierre',
    forge: 'bronze',
    temple: 'faveur',
    port: 'bronze',
  }
  const quoi = produit[id]
  const brut = (PROD as Partial<Record<BuildingId, number[]>>)[id]?.[level]
  if (!quoi || brut === undefined || level === 0) return null
  // ce qui compte vraiment, c'est ce qui rentre : le brut n'est qu'un plafond
  const r = rendement(s, id)
  const total = postesTotal(s, id)
  const net = Math.round(brut * r * 10) / 10
  return (
    <div className="bloc">
      <h3>Production</h3>
      {total > 0 ? (
        <>
          <div style={{ fontSize: 15 }}>
            <b className="montant" style={{ color: couleurRendement(r) }}>
              <Icone id={quoi} taille={17} /> +{net}/min
            </b>
            <span style={{ color: '#93a7b4', fontSize: 12 }}>
              {' '}
              sur {brut} possibles{id === 'port' ? ' (commerce)' : ''}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#93a7b4' }}>
            {postesPourvus(s, id)}/{total} postes tenus — {Math.round(r * 100)} % du rendement.
          </div>
        </>
      ) : (
        <div className="montant">
          <Icone id={quoi} taille={16} /> +{brut}/min{id === 'port' ? ' (commerce)' : ''}
        </div>
      )}
    </div>
  )
}

/**
 * Postes de travail d'un atelier. Sans ouvrier, le bâtiment n'est qu'un décor :
 * ce bloc doit rendre ce lien évident et réparable en un clic.
 */
function BlocOuvriers({ id, onVoirHabitants }: { id: BuildingId; onVoirHabitants: () => void }) {
  const s = useGame()
  const total = postesTotal(s, id)
  if (total <= 0) return null
  const pourvus = postesPourvus(s, id)
  const r = rendement(s, id)
  const equipe = s.villageois.filter((v) => v.poste === id)
  const libres = oisifs(s)
  const metier = METIERS[id] ?? 'Ouvriers'
  return (
    <div className="bloc">
      <h3>
        👷 Ouvriers — {pourvus}/{total}
      </h3>
      <div className="ligne">
        <div className="barre">
          <div style={{ width: `${r * 100}%`, background: couleurRendement(r) }} />
        </div>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: couleurRendement(r), fontWeight: 700 }}>
          {Math.round(r * 100)} %
        </span>
      </div>
      <div className="desc" style={{ fontSize: 12, color: '#93a7b4' }}>
        La production suit les postes tenus : {pourvus} poste{pourvus > 1 ? 's' : ''} sur {total} →{' '}
        {Math.round(r * 100)} % de ce que ce niveau peut rendre.
      </div>
      {equipe.map((v) => (
        <div key={v.id} className="ligne" style={{ margin: '4px 0' }}>
          <span style={{ fontSize: 12.5 }}>
            {BUILDINGS[id].emoji} <b>{v.nom}</b> <span style={{ color: '#93a7b4' }}>· {metier}</span>
          </span>
          <button
            onClick={() => s.affecter(v.id, null)}
            title={`Retirer ${v.nom} de son poste`}
            style={{ padding: '2px 8px', fontSize: 12 }}
          >
            ✕
          </button>
        </div>
      ))}
      {pourvus === 0 && (
        <div style={{ fontSize: 12, color: '#d05a41', marginTop: 4 }}>
          Personne ici — l’atelier ne produit rien de plus que la cueillette.
        </div>
      )}
      {pourvus < total && (
        <>
          <div style={{ fontSize: 12, color: libres.length > 0 ? '#93a7b4' : '#d98a4e', marginTop: 5 }}>
            {libres.length > 0
              ? `${libres.length} villageois sans emploi au village.`
              : 'Aucun villageois sans emploi — libérez un artisan ailleurs.'}
          </div>
          <button
            className="principal"
            style={{ width: '100%', marginTop: 6 }}
            disabled={libres.length === 0}
            onClick={() => s.affecter(libres[0].id, id)}
          >
            Affecter un villageois
          </button>
        </>
      )}
      <button style={{ width: '100%', marginTop: 6 }} onClick={onVoirHabitants}>
        👥 Voir les habitants
      </button>
    </div>
  )
}

function BlocHabitants({ onVoirHabitants }: { onVoirHabitants: () => void }) {
  const s = useGame()
  const cap = popCap(s)
  const libres = oisifs(s)
  return (
    <div className="bloc">
      <h3>👥 Habitants — {s.pop}/{cap}</h3>
      <div className="ligne">
        <div className="barre">
          <div style={{ width: `${Math.min(1, s.pop / cap) * 100}%` }} />
        </div>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {s.pop}/{cap}
        </span>
      </div>
      <div className="desc" style={{ fontSize: 12, color: '#93a7b4' }}>
        {libres.length > 0
          ? `${libres.length} villageois sans emploi — à placer dans un atelier ou à enrôler à la caserne.`
          : 'Tous les habitants ont un métier : aucun bras libre pour l’enrôlement.'}
      </div>
      <button style={{ width: '100%', marginTop: 7 }} onClick={onVoirHabitants}>
        👥 Voir les habitants
      </button>
    </div>
  )
}

function BlocCaserne({ onVoirHabitants }: { onVoirHabitants: () => void }) {
  const s = useGame()
  const now = s.lastSeen
  // une recrue est un bras retiré au village : seuls les oisifs partent (un artisan reste à son poste)
  const dispo = oisifs(s).length
  return (
    <>
      <div className="bloc">
        <h3>Recruter (1 villageois par recrue)</h3>
        <div className="desc" style={{ fontSize: 12, marginBottom: 6 }}>
          Villageois disponibles :{' '}
          <b style={{ color: dispo > 0 ? '#5fae7d' : '#d05a41' }}>{dispo} sans emploi</b>
          <span style={{ color: '#93a7b4' }}> — les artisans restent à leur poste.</span>
        </div>
        {dispo === 0 && (
          <div style={{ fontSize: 12, color: '#d98a4e', marginBottom: 6 }}>
            👥 Aucun bras libre : retirez un artisan de son atelier pour l’enrôler.
          </div>
        )}
        {UNIT_IDS.map((u) => {
          const def = UNITS[u]
          const debloque = s.buildings.caserne.level >= def.caserne
          return (
            <div key={u} className="unite">
              <span style={{ fontSize: 22 }}>{def.emoji}</span>
              <div className="infos">
                <div className="nom">
                  {def.nom} <span style={{ color: '#93a7b4', fontWeight: 400 }}>×{s.army[u]}</span>
                </div>
                <div className="stats">
                  ⚔{def.atk} ❤{def.hp} · {def.time}s ·{' '}
                  {(Object.entries(def.cost) as [ResourceId, number][])
                    .map(([r, n]) => `${n}${RES[r].emoji}`)
                    .join(' ')}
                </div>
              </div>
              {debloque ? (
                <div className="actions">
                  <button
                    onClick={() => s.recruter(u, 1)}
                    disabled={!peutPayer(s.resources, def.cost) || dispo < 1}
                    title={dispo < 1 ? 'Aucun villageois sans emploi' : undefined}
                  >
                    +1
                  </button>
                  <button
                    onClick={() => s.recruter(u, 5)}
                    disabled={
                      !peutPayer(
                        s.resources,
                        Object.fromEntries(Object.entries(def.cost).map(([r, n]) => [r, (n as number) * 5])),
                      ) || dispo < 5
                    }
                    title={dispo < 5 ? `Il faut 5 villageois sans emploi (${dispo} disponible${dispo > 1 ? 's' : ''})` : undefined}
                  >
                    +5
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: 11, color: '#93a7b4' }}>Caserne niv. {def.caserne}</span>
              )}
            </div>
          )
        })}
        <button style={{ width: '100%', marginTop: 8 }} onClick={onVoirHabitants}>
          👥 Voir les habitants
        </button>
      </div>
      {s.recruitQueue.length > 0 && (
        <div className="bloc">
          <h3>Formation en cours</h3>
          {s.recruitQueue.map((j, i) => (
            <div key={i} className="ligne">
              <span>
                {UNITS[j.unit].emoji} {UNITS[j.unit].nom} ×{j.restant}
              </span>
              {i === 0 && <span style={{ color: '#e8c04a' }}>{fmtDuree(j.finishAt - now)}</span>}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function BlocPort() {
  const s = useGame()
  const [donner, setDonner] = useState<ResourceId>('bois')
  const [recevoir, setRecevoir] = useState<ResourceId>('bronze')
  const niveau = s.buildings.port.level
  if (niveau === 0) return null
  const taux = TAUX_PORT[niveau]
  const coutDonne = Math.round(taux * 10)
  return (
    <div className="bloc">
      <h3>Comptoir d’échange ({taux}:1)</h3>
      <div className="ligne">
        <span>Donner :</span>
        <span>
          {(Object.keys(RES) as ResourceId[]).map((r) => (
            <button
              key={r}
              style={{ padding: '2px 7px', marginLeft: 3, borderColor: donner === r ? '#e8c04a' : undefined }}
              onClick={() => setDonner(r)}
            >
              {RES[r].emoji}
            </button>
          ))}
        </span>
      </div>
      <div className="ligne">
        <span>Recevoir :</span>
        <span>
          {(Object.keys(RES) as ResourceId[]).map((r) => (
            <button
              key={r}
              style={{ padding: '2px 7px', marginLeft: 3, borderColor: recevoir === r ? '#e8c04a' : undefined }}
              onClick={() => setRecevoir(r)}
            >
              {RES[r].emoji}
            </button>
          ))}
        </span>
      </div>
      <button
        className="principal"
        style={{ width: '100%', marginTop: 6 }}
        disabled={donner === recevoir || s.resources[donner] < coutDonne}
        onClick={() => s.echanger(donner, recevoir)}
      >
        −{coutDonne} {RES[donner].emoji} → +10 {RES[recevoir].emoji}
      </button>
    </div>
  )
}

function BlocRemparts() {
  const s = useGame()
  const niveau = s.buildings.remparts.level
  if (niveau === 0) return null
  // Hector épaissit l'enceinte de 15 % : le maximum affiché doit le refléter
  const max = murMax(s)
  const ratio = s.wallHp / max
  const manque = max - s.wallHp
  const cout = Math.ceil(manque / 8)
  return (
    <div className="bloc">
      <h3>État de la muraille</h3>
      <div className="ligne">
        <div className={`barre vie${ratio < 0.4 ? ' basse' : ''}`}>
          <div style={{ width: `${ratio * 100}%` }} />
        </div>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {Math.ceil(s.wallHp)}/{max}
        </span>
      </div>
      {manque > 1 && (
        <button
          className="principal"
          style={{ width: '100%', marginTop: 6 }}
          disabled={s.resources.pierre < cout || s.battle !== null}
          onClick={() => s.reparerRemparts()}
        >
          Réparer (−{cout} 🪨)
        </button>
      )}
    </div>
  )
}

function BlocTours() {
  const s = useGame()
  const niveau = s.buildings.remparts.level
  if (niveau === 0) return null
  const max = TOURS_MAX[niveau]
  const cout = s.tours < TOUR_COUTS.length ? TOUR_COUTS[s.tours] : null
  return (
    <div className="bloc">
      <h3>
        🏹 Tours d’archers — {s.tours}/{max}
      </h3>
      <div className="desc">
        Postées sur l’enceinte, elles arrosent de flèches tout assaillant à portée ({TOUR_PORTEE} pas) tant que la
        muraille tient. Mais leur silhouette se voit de loin : <b>chaque tour attire des assauts plus fournis</b>.
      </div>
      {max === 0 ? (
        <div style={{ fontSize: 12, color: '#d98a4e', marginTop: 5 }}>
          🧱 Des remparts de niveau 2 sont nécessaires pour asseoir une tour.
        </div>
      ) : s.tours >= max ? (
        <div style={{ fontSize: 12, color: '#93a7b4', marginTop: 5 }}>
          L’enceinte est garnie — rehaussez les remparts pour bâtir plus de tours.
        </div>
      ) : (
        cout && (
          <>
            <LigneCout cout={cout} resources={s.resources} />
            <button
              className="principal"
              style={{ width: '100%', marginTop: 6 }}
              disabled={!peutPayer(s.resources, cout) || s.battle !== null}
              onClick={() => s.construireTour()}
            >
              Bâtir une tour ({s.tours + 1}ᵉ)
            </button>
          </>
        )
      )}
    </div>
  )
}

export function PanneauBatiment() {
  const s = useGame()
  // le store ne connaît pas de panneau « population » : on l'ouvre en local
  const [habitantsOuverts, setHabitantsOuverts] = useState(false)
  const id = s.selected
  if (!id) return null
  const def = BUILDINGS[id]
  const b = s.buildings[id]
  const cible = b.level + 1
  const enChantier = b.targetLevel !== undefined && b.busyUntil !== undefined
  const auMax = b.level >= 4
  const agoraOk = id === 'agora' || cible <= s.buildings.agora.level
  const chantiers = BUILDING_IDS.filter((x) => s.buildings[x].targetLevel !== undefined).length

  const voirHabitants = () => setHabitantsOuverts(true)

  return (
    <aside className="panneau">
      {habitantsOuverts && <PanneauPopulation onFermer={() => setHabitantsOuverts(false)} />}
      <button className="fermer" onClick={() => s.select(null)} aria-label="Fermer">
        ✕
      </button>
      <h2>
        {def.emoji} {def.nom}
      </h2>
      <div className="sous">
        Niveau {b.level}/4 {!def.interieur && '· hors des murs'}
      </div>
      <div className="desc">{def.desc}</div>
      {b.level > 0 && (
        <div className="desc" style={{ marginTop: 6, fontStyle: 'italic', color: '#a8bac4' }}>
          « {def.niveaux[b.level - 1]} »
        </div>
      )}

      <BlocProduction id={id} level={b.level} />
      <BlocOuvriers id={id} onVoirHabitants={voirHabitants} />
      {id === 'maisons' && <BlocHabitants onVoirHabitants={voirHabitants} />}
      {id === 'remparts' && <BlocRemparts />}
      {id === 'remparts' && <BlocTours />}
      {id === 'caserne' && b.level > 0 && <BlocCaserne onVoirHabitants={voirHabitants} />}
      {id === 'port' && <BlocPort />}
      {id === 'temple' && b.level > 0 && (
        <div className="bloc">
          <h3>Culte</h3>
          <div className="desc">La faveur s’accumule ici. Honorez les Olympiens et invoquez leurs bénédictions.</div>
          <button className="principal" style={{ width: '100%', marginTop: 8 }} onClick={() => s.openPanel('pantheon')}>
            ⚡ Ouvrir le panthéon
          </button>
        </div>
      )}

      {!auMax && (
        <div className="bloc">
          <h3>
            {b.level === 0 ? 'Construire' : `Améliorer → niveau ${cible}`}
          </h3>
          <div className="desc" style={{ fontStyle: 'italic' }}>
            « {def.niveaux[cible - 1]} »
          </div>
          <LigneCout cout={def.costs[cible - 1]} resources={s.resources} />
          <div style={{ fontSize: 12, color: '#93a7b4' }}>⏱ {fmtDuree(def.times[cible - 1] * 1000)}</div>
          {enChantier ? (
            <div style={{ marginTop: 8, color: '#e8c04a' }}>
              🏗️ En chantier — fin dans {fmtDuree((b.busyUntil ?? 0) - s.lastSeen)}
            </div>
          ) : (
            <>
              <button
                className="principal"
                style={{ width: '100%', marginTop: 8 }}
                disabled={!agoraOk || chantiers >= 2 || !peutPayer(s.resources, def.costs[cible - 1])}
                onClick={() => s.upgrade(id)}
              >
                {b.level === 0 ? 'Lancer la construction' : 'Lancer l’amélioration'}
              </button>
              {!agoraOk && (
                <div style={{ fontSize: 12, color: '#d98a4e', marginTop: 5 }}>
                  🏛️ L’Agora doit d’abord atteindre le niveau {cible}.
                </div>
              )}
              {agoraOk && chantiers >= 2 && (
                <div style={{ fontSize: 12, color: '#d98a4e', marginTop: 5 }}>🏗️ Déjà 2 chantiers en cours.</div>
              )}
            </>
          )}
        </div>
      )}
      {auMax && <div className="bloc">🏆 Niveau maximal atteint — digne des grandes cités de l’Égée.</div>}
    </aside>
  )
}
