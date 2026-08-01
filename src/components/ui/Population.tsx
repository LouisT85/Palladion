import { createPortal } from 'react-dom'
import { BUILDINGS, METIERS, RENDEMENT_HORS_METIER } from '../../game/data'
import {
  BATIMENTS_A_POSTES,
  candidatsPour,
  efficaciteDe,
  metierDe,
  oisifs,
  popCap,
  postesPourvus,
  postesTotal,
  rendement,
  useGame,
} from '../../game/store'
import type { BuildingId, Villageois } from '../../game/types'

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

function LigneVillageois({ v }: { v: Villageois }) {
  const s = useGame()
  const poste = v.poste
  const sansEmploi = poste === null
  const aSonMetier = poste === v.metier
  const eff = efficaciteDe(v)
  return (
    <div className={`hab${sansEmploi ? ' oisif' : aSonMetier ? ' juste' : ' mal-place'}`}>
      <span className="hab-ico">{BUILDINGS[v.metier].emoji}</span>
      <div className="hab-corps">
        <div className="hab-nom">
          {v.nom} <span className="hab-metier">{metierDe(v)}</span>
        </div>
        <div className="hab-etat">
          {sansEmploi ? (
            <span className="hab-oisif">Sans emploi — enrôlable à la caserne</span>
          ) : aSonMetier ? (
            <span className="hab-juste">✔ à son métier, à {BUILDINGS[poste].nom} — rendement plein</span>
          ) : (
            <span className="hab-mal">
              ⚠ {BUILDINGS[poste].nom}, ce n’est pas son métier — il ne rend que {Math.round(eff * 100)} %
            </span>
          )}
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

  // portail : le panneau bâtiment a un backdrop-filter, qui piégerait un
  // position:fixed dans ses 330 px. La modale doit couvrir tout l'écran.
  return createPortal(
    <div className="voile" onClick={onFermer}>
      <div className="modale" data-tuto="recensement" onClick={(e) => e.stopPropagation()}>
        <h2>👥 Les habitants du village</h2>
        <div style={{ color: '#93a7b4', fontSize: 13 }}>
          <b style={{ color: '#e8dcc0' }}>{s.pop}</b>/{cap} habitants ·{' '}
          <b style={{ color: libres.length > 0 ? '#d98a4e' : '#93a7b4' }}>
            {libres.length} sans emploi
          </b>{' '}
          · {placesLibres} poste{placesLibres > 1 ? 's' : ''} à pourvoir
        </div>
        <div style={{ fontSize: 12.5, color: '#cfc4a8', marginTop: 7, lineHeight: 1.45 }}>
          Un atelier ne produit qu’au prorata de ses postes tenus : une ferme de niveau 3 sans paysan ne rapporte rien de
          plus que la cueillette. <b style={{ color: '#e8dcc0' }}>Chaque habitant a un métier de naissance</b> : à son
          métier il rend pleinement, ailleurs seulement {Math.round(RENDEMENT_HORS_METIER * 100)} %. Personne ne prend son
          poste tout seul — c’est à vous de placer chacun. Les villageois{' '}
          <b style={{ color: '#d98a4e' }}>sans emploi</b> sont aussi les seuls que la caserne peut enrôler.
        </div>

        <div className="bloc">
          <h3>Ateliers et postes</h3>
          {ateliers.length === 0 ? (
            <div style={{ fontSize: 12.5, color: '#d98a4e' }}>
              Aucun atelier bâti — construisez une ferme, un camp de bûcherons ou une carrière pour employer ces bras.
            </div>
          ) : (
            ateliers.map((b) => <LigneRecap key={b} b={b} />)
          )}
          {libres.length === 0 && placesLibres > 0 && (
            <div style={{ fontSize: 12, color: '#93a7b4', marginTop: 5 }}>
              Plus un bras de libre — attendez une naissance ou libérez un artisan.
            </div>
          )}
          {placesLibres === 0 && libres.length > 0 && ateliers.length > 0 && (
            <div style={{ fontSize: 12, color: '#93a7b4', marginTop: 5 }}>
              Tous les postes sont tenus : améliorez vos ateliers pour employer les bras qui restent.
            </div>
          )}
        </div>

        <div className="bloc">
          <h3>Recensement — {habitants.length} habitant{habitants.length > 1 ? 's' : ''}</h3>
          {habitants.length === 0 && (
            <div style={{ fontSize: 12.5, color: '#93a7b4' }}>Le village est désert. Les maisons attendent.</div>
          )}
          {habitants.map((v) => (
            <LigneVillageois key={v.id} v={v} />
          ))}
        </div>

        <button style={{ width: '100%', marginTop: 14 }} onClick={onFermer}>
          Fermer
        </button>
      </div>
    </div>,
    document.body,
  )
}
