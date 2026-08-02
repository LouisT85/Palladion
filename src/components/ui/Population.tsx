import { BUILDINGS, METIERS, RENDEMENT_HORS_METIER } from '../../game/data'
import { AGE_ADULTE, ageDe, motAge, pyramide, saisonDeVie } from '../../game/lignees'
import {
  BATIMENTS_A_POSTES,
  candidatsPour,
  efficaciteDe,
  jourDe,
  metierDe,
  oisifs,
  popCap,
  postesPourvus,
  postesTotal,
  rendement,
  useGame,
} from '../../game/store'
import type { BuildingId, Villageois } from '../../game/types'
import { Modale } from './Modale'

/**
 * Couleur d'une jauge de rendement : l'œil doit repérer d'un balayage
 * l'atelier qui tourne à vide (rouge) de celui qui est au complet (or).
 */
export function couleurRendement(r: number): string {
  if (r >= 1) return '#e8c04a'
  if (r >= 0.5) return '#5fae7d'
  if (r > 0) return '#d98a4e'
  return '#d05a41'
}

/** intitulé court d'un poste, tel qu'il apparaît dans les listes déroulantes */
function libellePoste(b: BuildingId): string {
  return METIERS[b] ?? BUILDINGS[b].nom
}

function LigneRecap({ b }: { b: BuildingId }) {
  const s = useGame()
  const total = postesTotal(s, b)
  const pourvus = postesPourvus(s, b)
  const r = rendement(s, b)
  // combien tiennent le poste sans en avoir le métier : c'est le gisement de progrès
  const malPlaces = s.villageois.filter((x) => x.poste === b && x.metier !== b).length
  const candidat = candidatsPour(s, b).find((x) => x.metier === b)
  return (
    <div className="ligne">
      <span style={{ minWidth: 138, fontSize: 13 }}>
        {BUILDINGS[b].emoji} {BUILDINGS[b].nom}
        {pourvus === 0 && total > 0 && <span title="Aucun ouvrier : cet atelier ne rend rien"> ⚠️</span>}
      </span>
      <div className="barre">
        <div style={{ width: `${r * 100}%`, background: couleurRendement(r) }} />
      </div>
      <span
        style={{
          width: 210,
          whiteSpace: 'nowrap',
          textAlign: 'right',
          fontSize: 12,
          color: '#cfc4a8',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {pourvus}/{total} · {Math.round(r * 100)} %
        {malPlaces > 0 && <span style={{ color: '#d98a4e' }}> · {malPlaces} hors métier</span>}
        {candidat && pourvus < total && (
          <button
            style={{ padding: '2px 7px', fontSize: 11.5, marginLeft: 6 }}
            onClick={() => s.affecter(candidat.id, b)}
            title={`${candidat.nom} est ${libellePoste(b).toLowerCase()} de son métier`}
          >
            + {candidat.nom}
          </button>
        )}
      </span>
    </div>
  )
}

function LigneVillageois({ v, jour, conjoint }: { v: Villageois; jour: number; conjoint?: Villageois }) {
  const s = useGame()
  const poste = v.poste
  const sansEmploi = poste === null
  const aSonMetier = poste === v.metier
  const age = ageDe(v, jour)
  const vie = saisonDeVie(age)
  const eff = efficaciteDe(v, jour)
  return (
    <div className={`hab${sansEmploi ? ' oisif' : aSonMetier ? ' juste' : ' mal-place'}`}>
      <span className="hab-ico">{BUILDINGS[v.metier].emoji}</span>
      <div className="hab-corps">
        <div className="hab-nom">
          {v.nom} <span className="hab-metier">{metierDe(v)}</span>
          {/* la maison et l'âge : ce qui fait d'un jeton un habitant */}
          {v.lignee && <span className="hab-lignee">des {v.lignee}</span>}
          <span className={`hab-age ${vie}`} title={motAge(age)}>
            {age} ans
          </span>
        </div>
        <div className="hab-etat">
          {sansEmploi ? (
            <span className="hab-oisif">
              {vie === 'enfant'
                ? `Encore un enfant - adulte dans ${Math.ceil((AGE_ADULTE - age) / 2)} journée(s)`
                : 'Sans emploi - enrôlable à la caserne'}
            </span>
          ) : aSonMetier ? (
            <span className="hab-juste">
              ✔ à son métier, à {BUILDINGS[poste].nom} - {Math.round(eff * 100)} %
              {vie !== 'adulte' && (vie === 'enfant' ? ' (un enfant aide, il ne remplace pas)' : ' (l’âge pèse)')}
            </span>
          ) : (
            <span className="hab-mal">
              ⚠ {BUILDINGS[poste].nom}, ce n’est pas son métier - il ne rend que {Math.round(eff * 100)} %
            </span>
          )}
        </div>
        <div className="hab-famille">
          {conjoint ? (
            <span title="Un foyer : c’est de là que viennent les enfants, et le métier qu’ils apprennent">
              💍 marié(e) à {conjoint.nom}
            </span>
          ) : vie === 'adulte' ? (
            <span className="hab-celib" title="Sans foyer, pas de naissance - le village dépend alors des arrivants">
              célibataire
            </span>
          ) : null}
          {v.parents && <span> · enfant de {v.parents.join(' et ')}</span>}
        </div>
      </div>
      <select
        className="hab-select"
        value={v.poste ?? ''}
        onChange={(e) => s.affecter(v.id, e.target.value === '' ? null : (e.target.value as BuildingId))}
        aria-label={`Poste de ${v.nom}`}
      >
        <option value="">Sans emploi</option>
        {BATIMENTS_A_POSTES.filter((b) => postesTotal(s, b) > 0).map((b) => {
          const total = postesTotal(s, b)
          const pourvus = postesPourvus(s, b)
          return (
            <option key={b} value={b} disabled={v.poste !== b && pourvus >= total}>
              {b === v.metier ? '★ ' : ''}
              {libellePoste(b)} ({pourvus}/{total})
            </option>
          )
        })}
      </select>
      {!sansEmploi && (
        <button
          onClick={() => s.affecter(v.id, null)}
          title={`Retirer ${v.nom} de son poste`}
          style={{ padding: '3px 8px', fontSize: 12 }}
        >
          ✕
        </button>
      )}
    </div>
  )
}

export function PanneauPopulation({ onFermer }: { onFermer: () => void }) {
  const s = useGame()
  const cap = popCap(s)
  const libres = oisifs(s)
  const ateliers = BATIMENTS_A_POSTES.filter((b) => postesTotal(s, b) > 0)
  const placesLibres = ateliers.reduce((a, b) => a + Math.max(0, postesTotal(s, b) - postesPourvus(s, b)), 0)
  // les bras disponibles en tête : c'est là que le joueur a quelque chose à décider
  const rang = (v: Villageois) => (v.poste === null ? -1 : BATIMENTS_A_POSTES.indexOf(v.poste))
  const habitants = [...s.villageois].sort((a, b) => rang(a) - rang(b) || a.nom.localeCompare(b.nom, 'fr'))
  const jour = jourDe(s)
  const ages = pyramide(s.villageois, jour)
  const parId = new Map(s.villageois.map((v) => [v.id, v]))
  const foyers = s.villageois.filter((v) => v.conjoint && v.id < v.conjoint).length
  const maisons = [...new Set(s.villageois.map((v) => v.lignee).filter(Boolean))].length

  return (
    <Modale
      titre="👥 Les habitants du village"
      dataTuto="recensement"
      onFermer={onFermer}
      sous={
        <>
          <b style={{ color: '#e8dcc0' }}>{s.pop}</b>/{cap} habitants ·{' '}
          <b style={{ color: libres.length > 0 ? '#d98a4e' : '#93a7b4' }}>{libres.length} sans emploi</b> ·{' '}
          {placesLibres} poste{placesLibres > 1 ? 's' : ''} à pourvoir
        </>
      }
    >
      <>
        <div style={{ fontSize: 12.5, color: '#cfc4a8', marginTop: 7, lineHeight: 1.45 }}>
          Un atelier ne produit qu’au prorata de ses postes tenus : une ferme de niveau 3 sans paysan ne rapporte rien de
          plus que la cueillette. <b style={{ color: '#e8dcc0' }}>Chaque habitant a un métier de naissance</b> : à son
          métier il rend pleinement, ailleurs seulement {Math.round(RENDEMENT_HORS_METIER * 100)} %. Personne ne prend son
          poste tout seul - c’est à vous de placer chacun. Les villageois{' '}
          <b style={{ color: '#d98a4e' }}>adultes sans emploi</b> sont aussi les seuls que la caserne peut enrôler.
          <div style={{ marginTop: 5 }}>
            Une journée de jeu vaut deux ans de vie. Les adultes libres <b style={{ color: '#e8dcc0' }}>font foyer</b>, et
            un enfant né dans un foyer <b style={{ color: '#e8dcc0' }}>apprend le métier d’un de ses parents</b> - marier
            son forgeron, c’est se donner des forgerons. Sans foyer, le village ne grandit que par les arrivants de la
            côte, dont on ne choisit pas le métier.
          </div>
        </div>

        <div className="bloc">
          <h3>Ateliers et postes</h3>
          {ateliers.length === 0 ? (
            <div style={{ fontSize: 12.5, color: '#d98a4e' }}>
              Aucun atelier bâti - construisez une ferme, un camp de bûcherons ou une carrière pour employer ces bras.
            </div>
          ) : (
            ateliers.map((b) => <LigneRecap key={b} b={b} />)
          )}
          {libres.length === 0 && placesLibres > 0 && (
            <div style={{ fontSize: 12, color: '#93a7b4', marginTop: 5 }}>
              Plus un bras de libre - attendez une naissance ou libérez un artisan.
            </div>
          )}
          {placesLibres === 0 && libres.length > 0 && ateliers.length > 0 && (
            <div style={{ fontSize: 12, color: '#93a7b4', marginTop: 5 }}>
              Tous les postes sont tenus : améliorez vos ateliers pour employer les bras qui restent.
            </div>
          )}
        </div>

        <div className="bloc">
          <h3>
            Recensement - {habitants.length} habitant{habitants.length > 1 ? 's' : ''}
          </h3>
          {/*
            La pyramide des âges, en trois cases. Elle dit d'un coup d'œil ce
            qu'aucun compteur de population ne disait : combien de bras vraiment
            disponibles, combien d'enfants à nourrir en attendant, et combien
            d'anciens dont le métier va s'éteindre.
          */}
          <div className="pyramide">
            <span className="p-enfant" title="Moins de 16 ans : ils aident sans remplacer, et ne portent pas les armes">
              👶 {ages.enfant} enfant{ages.enfant > 1 ? 's' : ''}
            </span>
            <span className="p-adulte" title="De 16 à 55 ans : rendement plein, et les seuls qu’on enrôle">
              🧑‍🌾 {ages.adulte} adulte{ages.adulte > 1 ? 's' : ''}
            </span>
            <span className="p-ancien" title="Au-delà de 56 ans : ils rendent moins, et l’âge finit par les emporter">
              🧓 {ages.ancien} ancien{ages.ancien > 1 ? 's' : ''}
            </span>
            <span className="p-foyers" title="Sans foyer, pas de naissance : le village ne grandit alors que par les arrivants">
              💍 {foyers} foyer{foyers > 1 ? 's' : ''}
            </span>
            <span className="p-maisons" title="Les lignées du village - un enfant hérite de la maison de son père">
              🏛️ {maisons} maison{maisons > 1 ? 's' : ''}
            </span>
          </div>
          {habitants.length === 0 && (
            <div style={{ fontSize: 12.5, color: '#93a7b4' }}>Le village est désert. Les maisons attendent.</div>
          )}
          {habitants.map((v) => (
            <LigneVillageois key={v.id} v={v} jour={jour} conjoint={v.conjoint ? parId.get(v.conjoint) : undefined} />
          ))}
        </div>
      </>
    </Modale>
  )
}
