import { useEffect, useState } from 'react'
import { RES } from '../../game/data'
import { VILLAGES_CIBLES } from '../../game/expeditions'
import {
  CIBLES,
  RAPPORTS_GARDES,
  avantagesEspion,
  missionsEspion,
  peutPayerEclaireur,
  resteMission,
  snapEspion,
  type CibleEspion,
  type MissionEspion,
  type SnapEspion,
} from '../../game/espionnage'
import { herosActifs, oisifs, useGame, type GameState } from '../../game/store'
import { Astuce } from './Infobulle'
import { Modale } from './Modale'

/*
 * ═══════════════════════ LE PANNEAU DES ÉCLAIREURS ═══════════════════════
 *
 * Envoyer un homme au-devant de la colonne est un PARI, et un panneau qui cache
 * la cote d'un pari est une escroquerie. Trois choses sont donc dites avant le
 * clic, jamais après : ce que la mission rapporte, combien de temps elle prend,
 * et le risque exact de ne pas revoir l'homme - avec le détail de ce qui le fait
 * monter ou descendre, pour qu'attendre la brume soit une manœuvre et pas un
 * hasard.
 *
 * L'état est lu DÉFENSIVEMENT (`s.espions`, `s.envoyerEspion`) : le champ et
 * l'action n'existent pas encore dans le store. Sans eux le panneau s'ouvre,
 * montre les missions et grise les boutons - il ne casse rien.
 */

interface EtatEspions {
  /** éclaireurs partis et rapports gardés en mémoire */
  espions?: MissionEspion[]
  /** reliques exposées au temple : le Mors de Xanthos couvre la retraite */
  reliquesExposees?: string[]
  envoyerEspion?: (mission: CibleEspion, villageois: string | null, villageId?: string) => void
}

function espionnage(s: GameState): EtatEspions {
  return s as unknown as GameState & EtatEspions
}

/** l'instantané que les règles attendent, monté depuis l'état vivant */
function snapDepuis(s: GameState, now: number): SnapEspion {
  const e = espionnage(s)
  return snapEspion({
    now,
    threat: s.threat,
    saison: s.saison,
    meteo: s.meteo,
    incomingWave: s.incomingWave,
    incomingFronts: s.incomingFronts,
    incomingChampion: s.incomingChampion,
    nextAttackAt: s.nextAttackAt,
    oisifs: oisifs(s).map((v) => ({ id: v.id, nom: v.nom })),
    herosActifs: herosActifs(s),
    graces: s.graces ?? [],
    reliques: e.reliquesExposees ?? [],
    expeditions: s.expeditions ?? {},
    relations: s.relations ?? {},
    alliances: (s.alliances ?? {}) as Record<string, unknown>,
    espions: e.espions ?? [],
    resources: s.resources,
  })
}

function duree(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  if (s < 60) return `${s} s`
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`
}

function pct(x: number): string {
  return `${Math.round(x * 100)} %`
}

/** au-delà d'un tiers, le pari devient mauvais : la couleur doit le crier */
function teinteRisque(r: number): string {
  if (r >= 0.35) return '#e0836a'
  if (r >= 0.18) return '#d9b262'
  return '#8fbf7a'
}

const CADRE: React.CSSProperties = {
  background: '#0d1a26',
  border: '1px solid #1e3346',
  borderRadius: 9,
  padding: '9px 11px',
  marginBottom: 7,
}

const SELECT: React.CSSProperties = {
  background: '#132434',
  color: '#dbe7ef',
  border: '1px solid #24405a',
  borderRadius: 6,
  padding: '4px 6px',
  fontSize: 12.5,
}

/** une horloge locale : les comptes à rebours doivent égrener les secondes */
function useMaintenant(actif: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!actif) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [actif])
  return now
}

function prixLisible(cout: Partial<Record<keyof typeof RES, number>>): string {
  return (Object.entries(cout) as [keyof typeof RES, number][])
    .map(([r, n]) => `${n} ${RES[r].emoji}`)
    .join(' · ')
}

export function PanneauEspions({ onFermer }: { onFermer: () => void }) {
  const s = useGame()
  const e = espionnage(s)
  const espions = e.espions ?? []
  const dehors = espions.filter((m) => m.rapport === undefined)
  const now = useMaintenant(dehors.length > 0)
  const snap = snapDepuis(s, now)
  const offres = missionsEspion(snap)
  const avantages = avantagesEspion(snap)
  const libres = snap.oisifs

  // qui part, et où : un choix par mission, pour ne pas mélanger les cibles
  const [qui, setQui] = useState<Record<string, string>>({})
  const [ou, setOu] = useState<string>(VILLAGES_CIBLES[0]?.id ?? '')

  const rapports = espions
    .filter((m) => m.rapport !== undefined)
    .slice(-RAPPORTS_GARDES)
    .reverse()

  return (
    <Modale
      titre="🕵️ Les éclaireurs"
      onFermer={onFermer}
      large
      sous="Un homme parti au-devant de la colonne rapporte du vrai - ou ne rapporte rien. On voit le risque avant de l’envoyer, et s’il n’y a rien à voir, on ne paie pas."
    >
      <>
        <div style={{ display: 'flex', gap: 14, color: '#93a7b4', fontSize: 12.5, marginBottom: 10, flexWrap: 'wrap' }}>
          <span>🧍 {libres.length} bras libre{libres.length === 1 ? '' : 's'}</span>
          <span>🪙 {Math.floor(s.resources.bronze)} bronze</span>
          <span>
            {snap.saison === 'hiver' ? '❄️' : '🌤️'} {snap.meteo === 'brume' ? 'brume' : snap.meteo} · menace {Math.round(snap.threat)}
          </span>
        </div>

        {/* ce qui protège nos hommes : le joueur doit savoir ce qu'il a gagné */}
        {avantages.length > 0 && (
          <div style={{ ...CADRE, borderColor: '#2f5b7b' }}>
            <b style={{ color: '#8fbf7a', fontSize: 12.5 }}>Ce qui les couvre</b>
            <div style={{ color: '#93a7b4', fontSize: 12.5, marginTop: 3 }}>
              {avantages.map((a) => `${a.nom} (−${Math.round((1 - a.mult) * 100)} % de risque)`).join(' · ')}
            </div>
          </div>
        )}

        {/* ── Ceux qui sont dehors ───────────────────────────────────────────── */}
        {dehors.length > 0 && (
          <>
            <h4 style={{ color: '#c9a86a', margin: '10px 0 6px', fontSize: 13 }}>En mission</h4>
            {dehors.map((m) => (
              <div key={m.id} style={{ ...CADRE, borderColor: '#4a3a22' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <b style={{ color: '#e8d9b5' }}>
                    {CIBLES[m.type].emoji} {m.nom}
                  </b>
                  <span style={{ color: '#7f97a8', fontSize: 12.5 }}>
                    {CIBLES[m.type].nom}
                    {m.villageId ? ` - ${VILLAGES_CIBLES.find((v) => v.id === m.villageId)?.nom ?? m.villageId}` : ''}
                  </span>
                  <span style={{ marginLeft: 'auto', color: '#c9a86a', fontSize: 12.5 }}>
                    de retour dans {duree(resteMission(m, now))}
                  </span>
                </div>
                <div style={{ color: teinteRisque(m.risque), fontSize: 12 }}>
                  {pct(m.risque)} de chances qu’il soit pris.
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Ce qu'on peut lancer ───────────────────────────────────────────── */}
        <h4 style={{ color: '#c9a86a', margin: '12px 0 6px', fontSize: 13 }}>Missions possibles</h4>
        {offres.map((o) => {
          const choix = qui[o.type] ?? ''
          const pro = choix === '' || !libres.some((v) => v.id === choix)
          const risque = pro ? o.risquePro : o.risque
          const payable = peutPayerEclaireur(o.type, snap)
          const bloque = !o.dispo || !e.envoyerEspion || (pro && !payable)
          return (
            <div key={o.type} style={{ ...CADRE, borderColor: o.dispo ? '#2f5b7b' : '#1e3346' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <b style={{ color: '#e8d9b5' }}>
                  {o.emoji} {o.nom}
                </b>
                <span style={{ marginLeft: 'auto', color: '#93a7b4', fontSize: 12 }}>
                  ⏳ {duree(o.duree)} · <span style={{ color: teinteRisque(risque) }}>{pct(risque)} de risque</span>
                </span>
              </div>
              <div style={{ color: '#93a7b4', fontSize: 12.5, lineHeight: 1.45, margin: '5px 0 7px' }}>{o.quoi}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <select value={choix} onChange={(ev) => setQui({ ...qui, [o.type]: ev.target.value })} style={SELECT}>
                  <option value="">Éclaireur de métier ({prixLisible(o.cout)})</option>
                  {libres.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nom} - il quitte le village
                    </option>
                  ))}
                </select>

                {o.type === 'place' && (
                  <select value={ou} onChange={(ev) => setOu(ev.target.value)} style={SELECT}>
                    {VILLAGES_CIBLES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.emoji} {v.nom}
                      </option>
                    ))}
                  </select>
                )}

                <Astuce
                  titre={`${o.emoji} ${o.nom}`}
                  resume={o.quoi}
                  note={`${duree(o.duree)} de marche. ${pct(risque)} de chances qu’il soit pris : on perd l’homme et l’ennemi apprend qu’on l’observe. Un éclaireur de métier risque un cinquième de moins et ne coûte pas un habitant.`}
                >
                  <button
                    disabled={bloque}
                    onClick={() => e.envoyerEspion?.(o.type, pro ? null : choix, o.type === 'place' ? ou : undefined)}
                  >
                    Envoyer
                  </button>
                </Astuce>

                {/* on dit le refus AVANT le clic : jamais après */}
                {!o.dispo && (
                  <span style={{ fontSize: 12.5, color: '#c9a86a', fontStyle: 'italic' }}>{o.pourquoiPas}</span>
                )}
                {o.dispo && pro && !payable && (
                  <span style={{ fontSize: 12.5, color: '#8898a6', fontStyle: 'italic' }}>
                    Pas de quoi payer un éclaireur de métier.
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {/* ── Ce qu'ils ont rapporté ─────────────────────────────────────────── */}
        <h4 style={{ color: '#c9a86a', margin: '12px 0 6px', fontSize: 13 }}>Rapports</h4>
        {rapports.length === 0 && (
          <div style={{ color: '#7f97a8', fontSize: 12.5, fontStyle: 'italic' }}>
            Aucun éclaireur n’est encore rentré. Ce qu’ils diront tiendra ici, du plus récent au plus ancien.
          </div>
        )}
        {rapports.map((m) => (
          <div
            key={m.id}
            style={{
              marginBottom: 7,
              padding: '7px 10px',
              background: '#11202e',
              borderLeft: `3px solid ${m.pris ? '#a0523c' : '#c9a86a'}`,
              borderRadius: '0 7px 7px 0',
            }}
          >
            <div style={{ color: m.pris ? '#e0836a' : '#e8d9b5', fontSize: 12.5, fontWeight: 600 }}>
              {CIBLES[m.type].emoji} {m.nom} - {CIBLES[m.type].nom}
              {m.villageId ? ` (${VILLAGES_CIBLES.find((v) => v.id === m.villageId)?.nom ?? m.villageId})` : ''}
            </div>
            {(m.rapport ?? []).map((l, i) => (
              <div key={i} style={{ color: '#e2d6bb', fontSize: 12.5, lineHeight: 1.5 }}>
                {l}
              </div>
            ))}
          </div>
        ))}
      </>
    </Modale>
  )
}
