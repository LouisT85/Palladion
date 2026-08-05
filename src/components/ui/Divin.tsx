import { useState } from 'react'
import { GODS, GOD_IDS } from '../../game/data'
import {
  calamitesPossibles,
  descPalier,
  nomPalier,
  paliersColere,
} from '../../game/colere'
import { VILLAGES_CIBLES } from '../../game/expeditions'
import {
  ORACLES,
  ORACLE_IDS,
  RIEN_VU,
  consulterOracle,
  type OracleId,
  type SnapOracle,
} from '../../game/oracles'
import {
  NOM_RARETE,
  RELIQUES,
  RELIQUE_PAR_ID,
  effetsCumules,
  lieuDe,
  nichesTemple,
  type EffetsReliques,
  type ReliqueDef,
} from '../../game/reliques'
import { jourDe, totalEtoiles, useGame, type GameState } from '../../game/store'
import { Astuce } from './Infobulle'
import { Modale } from './Modale'

/*
 * ═══════════════════ LE DOMAINE DIVIN ═══════════════════
 *
 * Trois écrans qui se répondent, et qui tiennent tous les trois au même fil : ce
 * que les dieux savent, ce qu'ils reprennent, et ce qu'on leur montre.
 *
 *  · les ORACLES vendent une information vraie sur les dix minutes qui viennent ;
 *  · l'ALERTE dit lequel des quatre est en colère, à quel point, ce qu'il risque
 *    de faire, et comment l'arrêter - une menace qu'on ne comprend pas n'est
 *    qu'une brimade ;
 *  · les NICHES du temple obligent à choisir ce qu'on expose des reliques
 *    rapportées de Troade.
 *
 * Tout est lu DÉFENSIVEMENT : ces trois chantiers arrivent avant leur câblage
 * dans le store, et les panneaux doivent s'ouvrir sans rien casser tant que les
 * champs n'existent pas.
 */

// ── Lecture défensive du store ───────────────────────────────────────────────

/** l'état, vu comme il sera une fois les trois chantiers câblés */
interface EtatDivin {
  /** prochaine consultation autorisée, par question */
  oracles?: Record<string, number>
  /** la dernière réponse obtenue, à afficher dans le panneau */
  oracleReponse?: { question: OracleId; lignes: string[]; at: number } | null
  /** délai avant la prochaine calamité de chaque dieu */
  colere?: Partial<Record<string, number>>
  /** reliques rapportées de Troade */
  reliques?: string[]
  /** celles qui sont dans les niches du temple - les seules qui agissent */
  reliquesExposees?: string[]
  poserQuestion?: (q: OracleId, cible?: string | null) => void
  exposerRelique?: (id: string) => void
  retirerRelique?: (id: string) => void
}

function divin(s: GameState): EtatDivin {
  return s as unknown as GameState & EtatDivin
}

const CADRE: React.CSSProperties = {
  background: '#0d1a26',
  border: '1px solid #1e3346',
  borderRadius: 9,
  padding: '9px 11px',
  marginBottom: 7,
}

function duree(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  if (s < 60) return `${s} s`
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`
}

// ── 1. Les oracles ───────────────────────────────────────────────────────────

/** l'instantané que les fonctions pures attendent, monté depuis l'état vivant */
function snapDepuis(s: GameState, cible: string | null): SnapOracle {
  return {
    now: Date.now(),
    jour: jourDe(s),
    incomingWave: s.incomingWave,
    incomingFronts: s.incomingFronts,
    incomingChampion: s.incomingChampion,
    nextAttackAt: s.nextAttackAt,
    activeEvent: s.activeEvent,
    saison: s.saison,
    meteo: s.meteo,
    meteoJusqua: s.meteoJusqua,
    expeditions: s.expeditions ?? {},
    heros: s.heros,
    buildings: s.buildings,
    army: s.army,
    morale: s.morale,
    gods: s.gods,
    stats: s.stats,
    etoilesTotal: totalEtoiles(s.expeditions ?? {}),
    cible,
  }
}

export function PanneauOracles({ onFermer }: { onFermer: () => void }) {
  const s = useGame()
  const d = divin(s)
  const [cible, setCible] = useState<string>(VILLAGES_CIBLES[0]?.id ?? '')
  const cooldowns = d.oracles ?? {}
  const temple = s.buildings.temple.level
  const snap = snapDepuis(s, cible)
  const reponse = d.oracleReponse ?? null

  return (
    <Modale
      titre="🔮 Les oracles"
      onFermer={onFermer}
      large
      sous={
        temple === 0
          ? 'Sans temple, aucun devin ne vous recevra. Bâtissez l’autel d’abord.'
          : 'On paie le devin en faveur et la bête du sacrifice en grain. Ce qu’il dit est vrai - et s’il ne voit rien, il ne prend rien.'
      }
    >
      <>
        <div style={{ display: 'flex', gap: 14, color: '#93a7b4', fontSize: 12.5, marginBottom: 10 }}>
          <span>🏛️ Temple niveau {temple}</span>
          <span>✨ {Math.floor(s.faveur)} faveur</span>
          <span>🌾 {Math.floor(s.resources.grain)} grain</span>
        </div>

        {ORACLE_IDS.map((q) => {
          const def = ORACLES[q]
          const c = consulterOracle(q, snap, {
            faveur: s.faveur,
            grain: s.resources.grain,
            cooldowns,
          })
          const lignes = reponse?.question === q ? reponse.lignes : null
          return (
            <div key={q} style={{ ...CADRE, borderColor: c.ok ? '#2f5b7b' : '#1e3346' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <b style={{ color: '#e8d9b5' }}>
                  {def.emoji} {def.nom}
                </b>
                <span style={{ color: '#7f97a8', fontSize: 12.5, fontStyle: 'italic' }}>« {def.question} »</span>
                <span style={{ marginLeft: 'auto', color: '#93a7b4', fontSize: 12 }}>
                  ✨ {def.coutFaveur} · 🌾 {def.coutGrain}
                </span>
              </div>
              <div style={{ color: '#93a7b4', fontSize: 12.5, lineHeight: 1.45, margin: '5px 0 7px' }}>{def.desc}</div>

              {q === 'garnison' && (
                <div style={{ marginBottom: 7 }}>
                  <select
                    value={cible}
                    onChange={(e) => setCible(e.target.value)}
                    style={{
                      background: '#132434',
                      color: '#dbe7ef',
                      border: '1px solid #24405a',
                      borderRadius: 6,
                      padding: '4px 6px',
                      fontSize: 12.5,
                    }}
                  >
                    {VILLAGES_CIBLES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.emoji} {v.nom}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Astuce
                  titre={`${def.emoji} ${def.nom}`}
                  resume={def.desc}
                  note={`Une question par ${duree(def.cooldown)}. Temple niveau ${def.temple} requis.`}
                >
                  <button
                    disabled={!c.ok || !d.poserQuestion}
                    onClick={() => d.poserQuestion?.(q, q === 'garnison' ? cible : null)}
                  >
                    Consulter
                  </button>
                </Astuce>
                {/* on annonce le refus AVANT le clic : personne ne doit découvrir
                    qu'il n'y avait rien à voir après avoir cliqué */}
                {!c.ok && (
                  <span
                    style={{
                      fontSize: 12.5,
                      color: c.motif === 'rien' ? '#c9a86a' : '#8898a6',
                      fontStyle: 'italic',
                    }}
                  >
                    {c.motif === 'rien' ? RIEN_VU[q] : c.lignes[0]}
                  </span>
                )}
              </div>

              {lignes && lignes.length > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '7px 10px',
                    background: '#11202e',
                    borderLeft: '3px solid #c9a86a',
                    borderRadius: '0 7px 7px 0',
                  }}
                >
                  {lignes.map((l, i) => (
                    <div key={i} style={{ color: '#e2d6bb', fontSize: 12.5, lineHeight: 1.5 }}>
                      {l}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        <p style={{ color: '#6f8494', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
          Le devin ne brode jamais : chaque réponse est lue dans ce qui est déjà décidé - la vague armée sur la plaine,
          le sort déjà tiré du dilemme ouvert, la garnison que la bataille opposera. Quand la chose n’existe pas encore,
          il le dit et ne prend rien.
        </p>
      </>
    </Modale>
  )
}

// ── 2. L'alerte de colère ────────────────────────────────────────────────────

/**
 * Le bandeau des dieux fâchés. Il ne se place pas lui-même : c'est un bloc du
 * flux, que l'écran monte où il veut sous la barre du haut. Il ne s'affiche
 * qu'en cas de colère réelle - une alerte permanente ne s'alerte plus.
 */
export function AlerteColere() {
  const s = useGame()
  const d = divin(s)
  const now = Date.now()
  const faches = GOD_IDS.map((g) => ({ g, relation: s.gods[g]?.relation ?? 0 }))
    .map((x) => ({ ...x, palier: paliersColere(x.relation) }))
    .filter((x) => x.palier > 0)
    .sort((a, b) => b.palier - a.palier)

  if (faches.length === 0) return null

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #3a1418ee, #26100de6)',
        border: '1px solid #7d3a2c',
        borderRadius: 10,
        padding: '7px 12px',
        boxShadow: '0 4px 18px #0008',
        maxWidth: 460,
      }}
    >
      {faches.map(({ g, relation, palier }) => {
        const dieu = GODS[g]
        const menaces = calamitesPossibles(g, palier).map((c) => c.menace)
        const prochaine = d.colere?.[g] ?? 0
        return (
          <Astuce
            key={g}
            titre={`${dieu.emoji} ${dieu.nom} - ${nomPalier(palier)}`}
            resume={descPalier(palier)}
            lignes={menaces.map((m) => ({ label: 'Il peut', valeur: m }))}
            note="Un sacrifice à son autel remonte la relation : le palier retombe aussitôt, et les calamités s’arrêtent."
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0', cursor: 'help' }}>
              <span style={{ fontSize: 15 }}>{dieu.emoji}</span>
              <b style={{ color: '#f0bda4', fontSize: 13 }}>
                {dieu.nom} · {nomPalier(palier)}
              </b>
              <span style={{ color: '#b58a7c', fontSize: 11.5 }}>({Math.round(relation)})</span>
              <span style={{ marginLeft: 'auto', color: '#c99a86', fontSize: 11.5 }}>
                {prochaine > now ? `frappe dans ${duree(prochaine - now)}` : menaces[0]}
              </span>
            </div>
          </Astuce>
        )
      })}
      <div style={{ color: '#a87d6e', fontSize: 11, marginTop: 3, fontStyle: 'italic' }}>
        Un sacrifice suffit à refermer un palier.
      </div>
    </div>
  )
}

// ── 3. Les reliques ──────────────────────────────────────────────────────────

const LIBELLE_EFFET: Record<keyof EffetsReliques, string> = {
  grainPct: 'grain',
  boisPct: 'bois',
  pierrePct: 'pierre',
  bronzePct: 'bronze',
  faveurPct: 'faveur',
  murPct: 'structure des remparts',
  structurePct: 'structure des bâtiments',
  porteePct: 'portée des tours',
  butinPct: 'butin',
  degatsPct: 'dégâts',
  recruesPct: 'formation plus courte',
  entretienPct: 'entretien des héros en moins',
}

function Fiche({
  def,
  etat,
  onCliquer,
  actif,
}: {
  def: ReliqueDef
  etat: 'exposee' | 'coffre' | 'inconnue'
  onCliquer?: () => void
  actif: boolean
}) {
  const couleurs = {
    exposee: { bord: '#8a6f2c', fond: '#1c1a10' },
    coffre: { bord: '#1e3346', fond: '#0d1a26' },
    inconnue: { bord: '#182634', fond: '#0a141d' },
  }[etat]
  return (
    <Astuce
      titre={`${def.emoji} ${def.nom}`}
      resume={def.desc}
      lignes={[
        { label: 'Effet', valeur: def.effet, fort: true },
        { label: 'Rareté', valeur: NOM_RARETE[def.rarete] },
        { label: 'Se trouve à', valeur: `${lieuDe(def.id)} (${def.etoiles} ★)` },
      ]}
    >
      <div
        onClick={actif ? onCliquer : undefined}
        style={{
          ...CADRE,
          background: couleurs.fond,
          borderColor: couleurs.bord,
          opacity: etat === 'inconnue' ? 0.5 : 1,
          cursor: actif ? 'pointer' : 'default',
          marginBottom: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15 }}>{def.emoji}</span>
          <b style={{ color: etat === 'exposee' ? '#e8cf94' : '#c8d6e0', fontSize: 13 }}>{def.nom}</b>
          <span style={{ color: '#7f97a8', fontSize: 11.5 }}>{NOM_RARETE[def.rarete]}</span>
          <span style={{ marginLeft: 'auto', color: '#8fb27f', fontSize: 12 }}>{def.effet}</span>
        </div>
        <div style={{ color: '#7f97a8', fontSize: 11.5, marginTop: 3 }}>
          {etat === 'inconnue' ? `À prendre : ${lieuDe(def.id)}, ${def.etoiles} ★` : null}
          {etat === 'coffre' ? (actif ? 'Cliquez pour l’exposer' : 'Toutes les niches sont prises') : null}
          {etat === 'exposee' ? 'Cliquez pour la remettre au coffre' : null}
        </div>
      </div>
    </Astuce>
  )
}

export function PanneauReliques({ onFermer }: { onFermer: () => void }) {
  const s = useGame()
  const d = divin(s)
  const temple = s.buildings.temple.level
  const niches = nichesTemple(temple)
  const possedees = (d.reliques ?? []).filter((id) => !!RELIQUE_PAR_ID[id])
  const exposees = (d.reliquesExposees ?? []).filter((id) => possedees.includes(id)).slice(0, niches)
  const coffre = possedees.filter((id) => !exposees.includes(id))
  const inconnues = RELIQUES.filter((r) => !possedees.includes(r.id))
  const effets = effetsCumules(exposees)
  const actifs = (Object.keys(effets) as (keyof EffetsReliques)[]).filter((k) => effets[k] > 0)
  const libre = niches - exposees.length

  return (
    <Modale
      titre="🏺 Les reliques du temple"
      onFermer={onFermer}
      large
      sous={
        temple === 0
          ? 'Il faut un temple pour exposer quoi que ce soit : une relique au fond d’un coffre ne fait rien.'
          : `${niches} niche${niches > 1 ? 's' : ''} au temple de niveau ${temple} - et douze reliques en Troade. Il faut choisir.`
      }
    >
      <>
        {/* la vitrine : ce qui agit, et les creux qui rappellent qu'on n'a pas tout */}
        <h3 style={{ color: '#e8d9b5', fontSize: 13, margin: '0 0 6px' }}>
          La vitrine · {exposees.length}/{niches}
        </h3>
        {niches === 0 ? (
          <p style={{ color: '#93a7b4', fontSize: 12.5, lineHeight: 1.5 }}>
            Aucune niche. Élevez le temple : deux niches au niveau 1, trois au 2, quatre au 3, six au 4.
          </p>
        ) : (
          <>
            {exposees.map((id) => (
              <Fiche
                key={id}
                def={RELIQUE_PAR_ID[id]}
                etat="exposee"
                actif={!!d.retirerRelique}
                onCliquer={() => d.retirerRelique?.(id)}
              />
            ))}
            {Array.from({ length: libre }).map((_, i) => (
              <div
                key={`vide-${i}`}
                style={{
                  ...CADRE,
                  borderStyle: 'dashed',
                  color: '#5d7383',
                  fontSize: 12.5,
                  textAlign: 'center',
                  marginBottom: 6,
                }}
              >
                niche vide
              </div>
            ))}
          </>
        )}

        {actifs.length > 0 && (
          <div style={{ ...CADRE, background: '#101f16', borderColor: '#2f5b3f' }}>
            <b style={{ color: '#9fd8ad', fontSize: 12.5 }}>Ce que la vitrine donne</b>
            <div style={{ color: '#b8cdbf', fontSize: 12.5, lineHeight: 1.6, marginTop: 3 }}>
              {actifs.map((k) => `+${Math.round(effets[k] * 100)} % ${LIBELLE_EFFET[k]}`).join(' · ')}
            </div>
          </div>
        )}

        <h3 style={{ color: '#e8d9b5', fontSize: 13, margin: '14px 0 6px' }}>Au coffre · {coffre.length}</h3>
        {coffre.length === 0 ? (
          <p style={{ color: '#93a7b4', fontSize: 12.5 }}>
            Rien en réserve. Les reliques se rapportent d’expédition, et les plus rares veulent trois étoiles.
          </p>
        ) : (
          coffre.map((id) => (
            <Fiche
              key={id}
              def={RELIQUE_PAR_ID[id]}
              etat="coffre"
              actif={libre > 0 && !!d.exposerRelique}
              onCliquer={() => d.exposerRelique?.(id)}
            />
          ))
        )}

        <h3 style={{ color: '#e8d9b5', fontSize: 13, margin: '14px 0 6px' }}>
          Encore en Troade · {inconnues.length}
        </h3>
        {inconnues.map((r) => (
          <Fiche key={r.id} def={r} etat="inconnue" actif={false} />
        ))}
      </>
    </Modale>
  )
}
