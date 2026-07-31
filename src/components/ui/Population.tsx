import { createPortal } from 'react-dom'
import { BUILDINGS, METIERS } from '../../game/data'
import {
  BATIMENTS_A_POSTES,
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
  return (
    <div className="ligne">
      <span style={{ minWidth: 138, fontSize: 13 }}>
        {BUILDINGS[b].emoji} {BUILDINGS[b].nom}
      </span>
      <div className="barre">
        <div style={{ width: `${r * 100}%`, background: couleurRendement(r) }} />
      </div>
      <span
        style={{
          width: 182,
          whiteSpace: 'nowrap',
          textAlign: 'right',
          fontSize: 12,
          color: '#cfc4a8',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {pourvus}/{total} postes — rendement {Math.round(r * 100)} %
      </span>
    </div>
  )
}

function LigneVillageois({ v }: { v: Villageois }) {
  const s = useGame()
  const poste = v.poste
  const sansEmploi = poste === null
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        marginTop: 5,
        borderRadius: 7,
        background: sansEmploi ? '#1b2c3d' : 'transparent',
        borderLeft: `3px solid ${sansEmploi ? '#d98a4e' : '#28405a'}`,
      }}
    >
      <span style={{ fontSize: 17, lineHeight: 1 }}>{poste === null ? '🧍' : BUILDINGS[poste].emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{v.nom}</div>
        <div style={{ fontSize: 11, color: sansEmploi ? '#d98a4e' : '#93a7b4' }}>
          {poste === null ? 'Sans emploi — enrôlable à la caserne' : `${metierDe(v)} · ${BUILDINGS[poste].nom}`}
        </div>
      </div>
      <select
        value={v.poste ?? ''}
        onChange={(e) => s.affecter(v.id, e.target.value === '' ? null : (e.target.value as BuildingId))}
        aria-label={`Poste de ${v.nom}`}
        style={{
          font: 'inherit',
          fontSize: 12,
          background: '#1d3348',
          color: '#e8dcc0',
          border: '1px solid #2c4258',
          borderRadius: 6,
          padding: '4px 5px',
          maxWidth: 168,
        }}
      >
        <option value="">Sans emploi</option>
        {BATIMENTS_A_POSTES.filter((b) => postesTotal(s, b) > 0).map((b) => {
          const total = postesTotal(s, b)
          const pourvus = postesPourvus(s, b)
          return (
            <option key={b} value={b} disabled={v.poste !== b && pourvus >= total}>
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
      <div className="modale" onClick={(e) => e.stopPropagation()}>
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
          plus que la cueillette. Les villageois <b style={{ color: '#d98a4e' }}>sans emploi</b> sont aussi les seuls que
          la caserne peut enrôler.
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
          <button
            className="principal"
            style={{ width: '100%', marginTop: 8 }}
            disabled={libres.length === 0 || placesLibres === 0}
            onClick={() => s.affecterAuto()}
          >
            👷 Tous au travail
          </button>
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
