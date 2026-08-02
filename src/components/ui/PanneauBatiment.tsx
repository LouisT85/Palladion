import { useState } from 'react'
import { BUILDINGS, BUILDING_IDS, LOT_ECHANGE, MARGE_PORT, METIERS, PROD, RENDEMENT_HORS_METIER, RES, TOURS_MAX, TOUR_COUTS, TOUR_PORTEE, UNITS, UNIT_IDS, coutEchange } from '../../game/data'
import { candidatsPour, fmtDuree, metierDe, murMax, oisifs, peutPayer, popCap, postesPourvus, postesTotal, rendement, useGame } from '../../game/store'
import type { BuildingId, ResourceId } from '../../game/types'
import { Icone, Montant, type IconeId } from './Icones'
import { Astuce } from './Infobulle'
import { couleurRendement } from './Population'

function LigneCout({ cout, resources }: { cout: Partial<Record<ResourceId, number>>; resources: Record<ResourceId, number> }) {
  return (
    <div className="cout">
      {(Object.entries(cout) as [ResourceId, number][]).map(([r, n]) => {
        const manque = n - Math.floor(resources[r])
        return (
          <Astuce
            key={r}
            titre={`${RES[r].emoji} ${RES[r].nom}`}
            lignes={[
              { label: 'Demandé', valeur: n, fort: true },
              { label: 'En réserve', valeur: Math.floor(resources[r]), couleur: manque > 0 ? '#e0715a' : '#8fbf5a' },
            ]}
            note={manque > 0 ? `Il en manque ${manque}.` : undefined}
          >
            <span className={`montant ${resources[r] >= n ? 'okk' : 'ko'}`}>
              <Icone id={r} taille={15} /> {n}
            </span>
          </Astuce>
        )
      })}
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
            {postesPourvus(s, id)}/{total} postes tenus - {Math.round(r * 100)} % du rendement.
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
  // les candidats, le bon métier en tête - c'est lui qu'on proposera
  const candidats = candidatsPour(s, id)
  const duMetier = candidats.find((v) => v.metier === id)
  return (
    <div className="bloc">
      <h3>
        👷 Ouvriers - {pourvus}/{total}
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
            {BUILDINGS[v.metier].emoji} <b>{v.nom}</b>{' '}
            {v.metier === id ? (
              <span style={{ color: '#7fc79b' }}>· {metier} de métier</span>
            ) : (
              <span style={{ color: '#d98a4e' }}>
                · {metierDe(v)} déplacé ici - {Math.round(RENDEMENT_HORS_METIER * 100)} %
              </span>
            )}
          </span>
          <Astuce
            titre={`Retirer ${v.nom}`}
            resume="Il quitte ce poste et redevient disponible : à placer ailleurs, ou à enrôler à la caserne."
          >
            <button onClick={() => s.affecter(v.id, null)} style={{ padding: '2px 8px', fontSize: 12 }}>
              ✕
            </button>
          </Astuce>
        </div>
      ))}
      {pourvus === 0 && (
        <div style={{ fontSize: 12, color: '#d05a41', marginTop: 4 }}>
          Personne ici - l’atelier ne produit rien de plus que la cueillette.
        </div>
      )}
      {pourvus < total && (
        <>
          <div style={{ fontSize: 12, color: libres.length > 0 ? '#93a7b4' : '#d98a4e', marginTop: 5 }}>
            {libres.length > 0
              ? `${libres.length} villageois sans emploi au village${duMetier ? `, dont ${duMetier.nom} qui est ${metier.toLowerCase()} de son métier` : ' - mais aucun de ce métier'}.`
              : 'Aucun villageois sans emploi - libérez un artisan ailleurs.'}
          </div>
          {/* on propose le mieux placé, jamais le premier venu : le métier compte */}
          <button
            className="principal"
            style={{ width: '100%', marginTop: 6 }}
            disabled={candidats.length === 0}
            onClick={() => s.affecter(candidats[0].id, id)}
          >
            {candidats.length === 0
              ? 'Personne de disponible'
              : duMetier
                ? `Affecter ${duMetier.nom} (${metier.toLowerCase()})`
                : `Affecter ${candidats[0].nom} - hors métier, ${Math.round(RENDEMENT_HORS_METIER * 100)} %`}
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
      <h3>👥 Habitants - {s.pop}/{cap}</h3>
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
          ? `${libres.length} villageois sans emploi - à placer dans un atelier ou à enrôler à la caserne.`
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
          <span style={{ color: '#93a7b4' }}> - les artisans restent à leur poste.</span>
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
                  {(Object.entries(def.cost) as [ResourceId, number][]).map(([r, n]) => (
                    <Montant key={r} n={n} id={r} taille={13} />
                  ))}
                </div>
              </div>
              {debloque ? (
                <div className="actions">
                  <Astuce
                    titre={`${def.emoji} Lever un ${def.nom.toLowerCase()}`}
                    resume="Un habitant sans emploi prend les armes : le village perd un bras, la garnison gagne un homme."
                    note={dispo < 1 ? 'Aucun villageois sans emploi à enrôler.' : `${dispo} habitant(s) disponible(s).`}
                  >
                    <button onClick={() => s.recruter(u, 1)} disabled={!peutPayer(s.resources, def.cost) || dispo < 1}>
                      +1
                    </button>
                  </Astuce>
                  <Astuce
                    titre={`${def.emoji} En lever cinq d’un coup`}
                    resume="Cinq recrues à la file : elles se forment l’une après l’autre, dans l’ordre de la file."
                    note={
                      dispo < 5
                        ? `Il faut 5 villageois sans emploi (${dispo} disponible${dispo > 1 ? 's' : ''}).`
                        : undefined
                    }
                  >
                    <button
                      onClick={() => s.recruter(u, 5)}
                      disabled={
                        !peutPayer(
                          s.resources,
                          Object.fromEntries(Object.entries(def.cost).map(([r, n]) => [r, (n as number) * 5])),
                        ) || dispo < 5
                      }
                    >
                      +5
                    </button>
                  </Astuce>
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

/**
 * Le comptoir d'échange.
 *
 * Deux défauts corrigés d'un coup. Le premier était visuel : le bouton alignait
 * ses pictogrammes en flux de texte, et comme l'icône était un bloc, la ligne se
 * cassait - on lisait « −40 » puis « → +10 » sur trois lignes, les images
 * perdues dans l'or du bouton. Le second était de règle : le même taux
 * s'appliquait à tout, donc 40 de grain donnaient 10 de bronze. Le comptoir
 * échange maintenant à la VALEUR, et la marge du port se resserre à chaque
 * niveau - c'est ce qui rend le port franc désirable.
 */
/*
 * Le troc choisi survit à la fermeture du panneau. C'est un état d'INTERFACE, pas
 * de partie : il vit donc dans ce module et non dans le store, et il ne part pas
 * dans la sauvegarde. Mais un joueur qui échange dix fois du grain contre du
 * bronze ne veut pas reposer les deux jetons à chaque visite au port.
 */
let dernierTroc: { donner: ResourceId; recevoir: ResourceId } = { donner: 'bois', recevoir: 'bronze' }

function BlocPort() {
  const s = useGame()
  const [donner, setDonner] = useState<ResourceId>(dernierTroc.donner)
  const [recevoir, setRecevoir] = useState<ResourceId>(dernierTroc.recevoir)
  const poserDonner = (r: ResourceId) => {
    dernierTroc = { ...dernierTroc, donner: r }
    setDonner(r)
  }
  const poserRecevoir = (r: ResourceId) => {
    dernierTroc = { ...dernierTroc, recevoir: r }
    setRecevoir(r)
  }
  const niveau = s.buildings.port.level
  if (niveau === 0) return null
  const marge = MARGE_PORT[niveau]
  const coutDonne = coutEchange(niveau, donner, recevoir)
  const memeRes = donner === recevoir
  const assez = s.resources[donner] >= coutDonne
  const choix = (
    actuel: ResourceId,
    poser: (r: ResourceId) => void,
    interdit: ResourceId,
  ) => (
    <span className="troc-choix">
      {(Object.keys(RES) as ResourceId[]).map((r) => (
        <Astuce
          key={r}
          titre={`${RES[r].emoji} ${RES[r].nom}`}
          resume={r === interdit ? 'Déjà de l’autre côté du troc : on n’échange pas une denrée contre elle-même.' : undefined}
          lignes={[{ label: 'En réserve', valeur: Math.floor(s.resources[r]) }]}
        >
          <button
            className={`troc-jeton${actuel === r ? ' actif' : ''}`}
            disabled={r === interdit}
            onClick={() => poser(r)}
            aria-label={RES[r].nom}
          >
            <Icone id={r} taille={17} />
          </button>
        </Astuce>
      ))}
    </span>
  )

  return (
    <div className="bloc">
      <h3>⚓ Comptoir d’échange</h3>
      <div className="desc" style={{ fontSize: 12, color: '#93a7b4', marginBottom: 7 }}>
        Les marchands prélèvent <b style={{ color: '#d98a4e' }}>+{Math.round((marge - 1) * 100)} %</b> sur la valeur
        échangée. Le bronze vaut quatre charretées de bois, la pierre un peu plus qu’une : le comptoir compte en valeur,
        pas en tas.
      </div>
      <div className="troc-ligne">
        <span className="troc-label">Je donne</span>
        {choix(donner, poserDonner, recevoir)}
      </div>
      <div className="troc-ligne">
        <span className="troc-label">Je reçois</span>
        {choix(recevoir, poserRecevoir, donner)}
      </div>
      <div className="troc-bilan">
        <span className="troc-part perte">
          −{coutDonne} <Icone id={donner} taille={18} />
        </span>
        <span className="troc-fleche">→</span>
        <span className="troc-part gain">
          +{LOT_ECHANGE} <Icone id={recevoir} taille={18} />
        </span>
      </div>
      <button
        className="principal"
        style={{ width: '100%', marginTop: 8 }}
        disabled={memeRes || !assez}
        onClick={() => s.echanger(donner, recevoir)}
      >
        {memeRes ? 'Choisissez deux ressources' : assez ? 'Conclure le marché' : `Il manque ${Math.ceil(coutDonne - s.resources[donner])} ${RES[donner].nom.toLowerCase()}`}
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
          Réparer (<Montant n={-cout} id="pierre" taille={14} />)
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
        🏹 Tours d’archers - {s.tours}/{max}
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
          L’enceinte est garnie - rehaussez les remparts pour bâtir plus de tours.
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
  const id = s.selected
  if (!id) return null
  const def = BUILDINGS[id]
  const b = s.buildings[id]
  const cible = b.level + 1
  const enChantier = b.targetLevel !== undefined && b.busyUntil !== undefined
  const auMax = b.level >= 4
  const agoraOk = id === 'agora' || cible <= s.buildings.agora.level
  const chantiers = BUILDING_IDS.filter((x) => s.buildings[x].targetLevel !== undefined).length

  // le recensement vit dans le store : la leçon de Zeus et les missions doivent
  // pouvoir l'ouvrir et le refermer sans passer par ce panneau
  const voirHabitants = () => s.ouvrirRecensement(true)

  return (
    <aside className="panneau" data-tuto="panneau">
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
              🏗️ En chantier - fin dans {fmtDuree((b.busyUntil ?? 0) - s.lastSeen)}
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
      {auMax && <div className="bloc">🏆 Niveau maximal atteint - digne des grandes cités de l’Égée.</div>}
    </aside>
  )
}
