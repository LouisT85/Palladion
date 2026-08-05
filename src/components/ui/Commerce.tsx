import { useEffect, useState } from 'react'
import { BUILDING_IDS, MARGE_PORT, RES } from '../../game/data'
import {
  COURS_MAX,
  COURS_MIN,
  LOTS_MAX,
  LOT_VENTE,
  RES_MARCHANDES,
  caravanesMax,
  caravanesPossibles,
  chargeCaravane,
  coursInitiaux,
  etapesVers,
  explicationCours,
  gainCaravane,
  motCours,
  positionCours,
  prixAchat,
  prixVente,
  raisonRouteFermee,
  routeOuverte,
  tendanceCours,
  type Caravane,
  type Cours,
  type SnapCommerce,
} from '../../game/commerce'
import { STATUTS, statutVillage } from '../../game/diplomatie'
import { VILLAGES_CIBLES, VILLAGES_PAR_ID } from '../../game/expeditions'
import { merFermee, useGame, type GameState } from '../../game/store'
import type { ResourceId } from '../../game/types'
import { Astuce } from './Infobulle'
import { Modale } from './Modale'

/*
 * ═══════════════════ LE COMPTOIR ET LES CARAVANES ═══════════════════
 *
 * Ce panneau doit rendre UNE phrase possible dans la bouche du joueur : « je
 * vends le grain maintenant parce qu'il est haut, et j'envoie une caravane chez
 * mon allié parce que c'est sûr. » Tout ce qu'on y montre sert cette phrase :
 *
 *  · le cours n'est jamais un multiplicateur nu. On donne le PRIX EN LINGOTS, la
 *    position dans la fourchette (une jauge), le mot français (« au plus haut »)
 *    et la flèche de ce qui vient - plus la RAISON, au survol ;
 *  · une caravane en route affiche son compte à rebours ET le risque qu'on a
 *    accepté, parce qu'on n'accepte pas un risque qu'on ne relit pas ;
 *  · les routes fermées restent VISIBLES avec leur motif. Une destination qui
 *    disparaît de la liste passe pour un bogue ; une destination barrée d'un
 *    « Ténédos vous est hostile » est une leçon de diplomatie.
 *
 * La lecture du store est DÉFENSIVE : les champs (`cours`, `caravanes`) et les
 * actions (`vendre`, `acheter`, `envoyerCaravane`) arrivent au câblage. Sans
 * eux, le panneau s'ouvre, informe, et ses boutons sont simplement inertes.
 */

// ── Lecture défensive du store ───────────────────────────────────────────────

interface EtatCommerce {
  cours?: Cours
  caravanes?: Caravane[]
  vendre?: (res: ResourceId, lots: number) => void
  acheter?: (res: ResourceId, lots: number) => void
  envoyerCaravane?: (villageId: string, res: ResourceId, lots: number) => void
}

function commerce(s: GameState): EtatCommerce {
  return s as unknown as GameState & EtatCommerce
}

const CADRE: React.CSSProperties = {
  background: '#0d1a26',
  border: '1px solid #1e3346',
  borderRadius: 9,
  padding: '9px 11px',
  marginBottom: 7,
}

const TITRE_BLOC: React.CSSProperties = {
  color: '#e8d9b5',
  fontSize: 13,
  fontWeight: 600,
  margin: '12px 0 6px',
}

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function pourcent(x: number): string {
  return `${Math.round(x * 100)} %`
}

/** une horloge locale : les caravanes doivent égrener leurs secondes */
function useMaintenant(actif: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!actif) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [actif])
  return now
}

/** l'instantané que les règles pures attendent, monté depuis l'état vivant */
export function snapCommerce(s: GameState, now: number): SnapCommerce {
  const ruines = BUILDING_IDS.filter((b) => s.buildings?.[b]?.ruine).length + (s.brechesMur?.length ?? 0)
  return {
    now,
    saison: s.saison,
    meteo: s.meteo,
    merFermee: merFermee(s),
    menace: s.threat ?? 0,
    secheresse: now < (s.droughtUntil ?? 0),
    ruines,
    port: s.buildings?.port?.level ?? 0,
    relations: s.relations ?? {},
    alliances: s.alliances ?? {},
    cours: commerce(s).cours ?? coursInitiaux(),
  }
}

const COULEUR_TENDANCE: Record<string, string> = { hausse: '#7fb069', baisse: '#c0563f', stable: '#8898a6' }
const FLECHE: Record<string, string> = { hausse: '↗', baisse: '↘', stable: '→' }

// ── Le tableau des cours ─────────────────────────────────────────────────────

function LigneCours({ res, snap, marge }: { res: ResourceId; snap: SnapCommerce; marge: number }) {
  const s = useGame()
  const c = commerce(s)
  const stock = Math.floor(s.resources[res] ?? 0)
  const lingots = Math.floor(s.resources.bronze ?? 0)
  const vente = prixVente(res, snap.cours, marge)
  const achat = prixAchat(res, snap.cours, marge)
  const tend = tendanceCours(res, snap)
  const part = positionCours(res, snap.cours)
  const mot = motCours(res, snap.cours)

  return (
    <div style={CADRE}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <Astuce
          titre={`${RES[res].emoji} ${RES[res].nom}`}
          resume={`Le cours est ${mot}. Le comptoir en donne ${vente} lingots la charretée de ${LOT_VENTE}, et la revend ${achat}.`}
          lignes={explicationCours(res, snap).map((l) => ({ label: '·', valeur: l }))}
          note="Les cours dérivent lentement vers ce que le monde commande : on peut guetter un bon prix, ce n’est pas du hasard."
        >
          <b style={{ color: '#e8d9b5', cursor: 'help' }}>
            {RES[res].emoji} {RES[res].nom}
          </b>
        </Astuce>
        <span style={{ color: COULEUR_TENDANCE[tend], fontSize: 12.5 }}>
          {FLECHE[tend]} {mot}
        </span>
        <span style={{ marginLeft: 'auto', color: '#93a7b4', fontSize: 12 }}>en réserve : {stock}</span>
      </div>

      {/* la jauge : où se situe le cours entre son plus bas et son plus haut */}
      <div style={{ position: 'relative', height: 6, background: '#132434', borderRadius: 4, margin: '7px 0' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${Math.round(part * 100)}%`,
            background: part > 0.6 ? '#7fb069' : part < 0.35 ? '#c0563f' : '#c9a86a',
            borderRadius: 4,
          }}
        />
        {/* le pair, pour que « haut » et « bas » aient un repère */}
        <div
          style={{
            position: 'absolute',
            left: `${Math.round(((1 - COURS_MIN) / (COURS_MAX - COURS_MIN)) * 100)}%`,
            top: -2,
            bottom: -2,
            width: 1,
            background: '#4a6478',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button disabled={!c.vendre || stock < LOT_VENTE || vente <= 0} onClick={() => c.vendre?.(res, 1)}>
          Vendre {LOT_VENTE} → {vente} 🪙
        </button>
        <button disabled={!c.acheter || lingots < achat || achat <= 0} onClick={() => c.acheter?.(res, 1)}>
          Acheter {LOT_VENTE} ← {achat} 🪙
        </button>
      </div>
    </div>
  )
}

// ── Les caravanes en route ───────────────────────────────────────────────────

function LigneCaravane({ car, now, snap }: { car: Caravane; now: number; snap: SnapCommerce }) {
  const v = VILLAGES_PAR_ID[car.villageId]
  const total = Math.max(1, car.retourA - car.partieA)
  const part = Math.max(0, Math.min(1, (now - car.partieA) / total))
  const espere = gainCaravane(car.villageId, car.charge, snap.cours)
  const charge = RES_MARCHANDES.filter((r) => (car.charge?.[r] ?? 0) > 0)
    .map((r) => `${car.charge[r]} ${RES[r].emoji}`)
    .join(' ')

  return (
    <div style={{ ...CADRE, borderColor: '#2f5b7b' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <b style={{ color: '#e8d9b5' }}>
          🐫 {v?.emoji ?? '·'} {v?.nom ?? car.villageId}
        </b>
        <span style={{ color: '#93a7b4', fontSize: 12.5 }}>{charge}</span>
        <span style={{ marginLeft: 'auto', color: '#c9a86a', fontSize: 12.5 }}>
          rentre dans {mmss(car.retourA - now)}
        </span>
      </div>
      <div style={{ height: 5, background: '#132434', borderRadius: 3, margin: '6px 0 5px' }}>
        <div style={{ width: `${Math.round(part * 100)}%`, height: '100%', background: '#4d86b5', borderRadius: 3 }} />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: '#8898a6', fontSize: 12 }}>
        <span style={{ color: car.risque > 0.25 ? '#c0563f' : '#93a7b4' }}>
          risque de pillage : {pourcent(car.risque)}
        </span>
        <span>espéré : {espere} 🪙</span>
        {espere !== car.attendu && (
          <span style={{ color: espere > car.attendu ? '#7fb069' : '#c0563f' }}>
            (au départ : {car.attendu} 🪙)
          </span>
        )}
      </div>
    </div>
  )
}

// ── Le panneau ───────────────────────────────────────────────────────────────

export function PanneauCommerce({ onFermer }: { onFermer: () => void }) {
  const s = useGame()
  const c = commerce(s)
  const now = useMaintenant(true)
  const snap = snapCommerce(s, now)
  const [res, setRes] = useState<ResourceId>('grain')
  const [lots, setLots] = useState(2)

  const port = snap.port
  const marge = MARGE_PORT[port] ?? 0
  const caravanes = c.caravanes ?? []
  const maxCar = caravanesMax(port)
  const charge = chargeCaravane(res, lots)
  const aBord = charge[res] ?? 0
  const dePlus = Math.floor(s.resources[res] ?? 0) < aBord
  const complet = caravanes.length >= maxCar
  const destinations = caravanesPossibles(snap)
  const fermees = VILLAGES_CIBLES.filter((v) => !routeOuverte(v.id, snap))

  return (
    <Modale
      titre="⚖️ Le comptoir"
      onFermer={onFermer}
      large
      sous={
        port === 0
          ? 'Sans port, aucun marchand ne s’arrête chez vous. Bâtissez le quai d’abord.'
          : 'Les cours dérivent lentement avec les saisons, le ciel et la guerre. Vendre au quai est sûr ; charger une caravane paie mieux, et peut tout perdre.'
      }
    >
      <>
        <div style={{ display: 'flex', gap: 14, color: '#93a7b4', fontSize: 12.5, marginBottom: 10, flexWrap: 'wrap' }}>
          <span>⚓ Port niveau {port}</span>
          {marge > 0 && <span>Marge du comptoir : {Math.round((marge - 1) * 100)} %</span>}
          <span>🪙 {Math.floor(s.resources.bronze ?? 0)} lingots</span>
          <span>🐫 {caravanes.length}/{maxCar} caravanes</span>
        </div>

        <div style={TITRE_BLOC}>Les cours du jour</div>
        {RES_MARCHANDES.map((r) => (
          <LigneCours key={r} res={r} snap={snap} marge={marge} />
        ))}

        {caravanes.length > 0 && (
          <>
            <div style={TITRE_BLOC}>En route</div>
            {caravanes.map((car) => (
              <LigneCaravane key={car.id} car={car} now={now} snap={snap} />
            ))}
          </>
        )}

        {port > 0 && (
          <>
            <div style={TITRE_BLOC}>Charger une caravane</div>
            <div style={{ ...CADRE, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {RES_MARCHANDES.map((r) => (
                <button key={r} className={r === res ? 'principal' : undefined} onClick={() => setRes(r)}>
                  {RES[r].emoji} {RES[r].nom}
                </button>
              ))}
              <span style={{ color: '#7f97a8', fontSize: 12.5, marginLeft: 4 }}>charretées :</span>
              {Array.from({ length: LOTS_MAX }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={n === lots ? 'principal' : undefined}
                  disabled={Math.floor(s.resources[res] ?? 0) < n * LOT_VENTE}
                  onClick={() => setLots(n)}
                >
                  {n}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', color: '#93a7b4', fontSize: 12.5 }}>
                {aBord} {RES[res].emoji}
              </span>
            </div>

            {complet && (
              <div style={{ color: '#c9a86a', fontSize: 12.5, marginBottom: 7 }}>
                Vos {maxCar === 1 ? 'muletiers sont' : 'convois sont'} tous sur les routes. Un port plus grand en tient
                davantage.
              </div>
            )}
            {dePlus && (
              <div style={{ color: '#c9a86a', fontSize: 12.5, marginBottom: 7 }}>
                Il vous manque du {RES[res].nom.toLowerCase()} pour cette charge.
              </div>
            )}

            {destinations.length === 0 ? (
              <div style={{ color: '#8898a6', fontSize: 12.5, fontStyle: 'italic' }}>
                Aucune route n’est praticable en ce moment.
              </div>
            ) : (
              destinations.map((d) => {
                const gain = gainCaravane(d.village.id, charge, snap.cours)
                const fiche = STATUTS[d.statut]
                return (
                  <div key={d.village.id} style={CADRE}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <b style={{ color: '#e8d9b5' }}>
                        {d.village.emoji} {d.village.nom}
                      </b>
                      <span style={{ color: fiche.couleur, fontSize: 12 }}>
                        {fiche.emoji} {fiche.nom}
                      </span>
                      <span style={{ marginLeft: 'auto', color: '#93a7b4', fontSize: 12 }}>
                        {d.etapes} étape{d.etapes > 1 ? 's' : ''} · {mmss(d.duree)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ color: '#c9a86a', fontSize: 13 }}>≈ {gain} 🪙</span>
                      <span style={{ color: d.risque > 0.25 ? '#c0563f' : '#7fb069', fontSize: 12.5 }}>
                        risque {pourcent(d.risque)}
                      </span>
                      <span style={{ color: '#7f97a8', fontSize: 12 }}>prix majoré de {Math.round((d.prime - 1) * 100)} %</span>
                      <Astuce
                        titre={`🐫 Caravane vers ${d.village.nom}`}
                        resume={`${d.etapes} étapes de route. Le prix du bout est majoré de ${Math.round((d.prime - 1) * 100)} %, et se fait au cours du RETOUR.`}
                        lignes={[
                          { label: 'Charge', valeur: `${aBord} ${RES[res].nom.toLowerCase()}` },
                          { label: 'Gain estimé', valeur: `${gain} lingots`, fort: true },
                          { label: 'Risque de pillage', valeur: pourcent(d.risque) },
                          { label: 'Retour dans', valeur: mmss(d.duree) },
                        ]}
                        note="Le risque tient à la longueur de la route, à la menace du moment et à ce que ce village pense de vous. Un allié laisse passer."
                      >
                        <button
                          style={{ marginLeft: 'auto' }}
                          disabled={!c.envoyerCaravane || complet || dePlus}
                          onClick={() => c.envoyerCaravane?.(d.village.id, res, lots)}
                        >
                          Charger
                        </button>
                      </Astuce>
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}

        {fermees.length > 0 && (
          <>
            <div style={TITRE_BLOC}>Routes coupées</div>
            {fermees.map((v) => {
              const rel = snap.relations[v.id] ?? 0
              const a = snap.alliances[v.id]
              const fiche = STATUTS[statutVillage(rel, !!a, !!a?.mariage)]
              return (
                <div key={v.id} style={{ ...CADRE, borderColor: '#4a2a24', background: '#170f10' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ color: '#d8b6a8' }}>
                      ⛔ {v.emoji} {v.nom}
                    </b>
                    <span style={{ color: fiche.couleur, fontSize: 12 }}>
                      {fiche.emoji} {fiche.nom}
                    </span>
                    <span style={{ marginLeft: 'auto', color: '#8898a6', fontSize: 12 }}>
                      {etapesVers(v.id)} étape{etapesVers(v.id) > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ color: '#b58a7c', fontSize: 12.5, lineHeight: 1.45, marginTop: 4 }}>
                    {raisonRouteFermee(v.id, snap)}
                  </div>
                </div>
              )
            })}
            <div style={{ color: '#6f8494', fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>
              Une route coupée ne porte plus rien : ni vos caravanes, ni le tribut d’un allié qui se trouve derrière.
            </div>
          </>
        )}

        <p style={{ color: '#6f8494', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
          Le lingot de bronze est l’unité de compte : tous les prix se disent en lingots, et les charretées font{' '}
          {LOT_VENTE} unités. Le quai prélève sa marge - l’améliorer resserre la fourchette. Une caravane, elle, touche
          le prix plein majoré de la distance, mais on ne connaît le sien qu’au retour : les cours tournent pendant le
          voyage.
        </p>
      </>
    </Modale>
  )
}
