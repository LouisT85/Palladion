import { useState } from 'react'
import {
  MERVEILLES,
  dureeMerveille,
  peutBatirMerveille,
  type MerveilleDef,
  type SnapMerveille,
} from '../../game/merveilles'
import {
  AGORA_RECHERCHE,
  arbreTechnos,
  coutPayable,
  coutTechno,
  debloquePar,
  dureeTechno,
  effetsTechnos,
  manquePourTechno,
  rechercheOuverte,
  resumeEffets,
  type SnapTechno,
  type TechnoDef,
} from '../../game/technologies'
import { BUILDINGS, RES } from '../../game/data'
import { fmtDuree, useGame, type GameState } from '../../game/store'
import { Astuce } from './Infobulle'
import { Modale } from './Modale'
import type { Cost, ResourceId } from '../../game/types'

/*
 * ═══════════════════ LES DEUX ÉCRANS DU PROGRÈS ═══════════════════
 *
 * Ils vont ensemble parce que les règles vont ensemble : les découvertes sont le
 * chemin, la merveille est le couronnement. Deux panneaux, deux contraintes à
 * rendre ÉVIDENTES avant le clic, jamais après :
 *
 *  · une seule recherche à la fois. Le compte à rebours est donc en haut, avant
 *    l'arbre, et toutes les autres tuiles se grisent pendant ce temps ;
 *  · une seule merveille par règne. L'avertissement est écrit en clair sous le
 *    titre, et le bouton demande une SECONDE confirmation : c'est le seul choix
 *    du jeu qu'on ne défait pas.
 *
 * L'état est lu DÉFENSIVEMENT : ces deux chantiers arrivent avant leur câblage
 * dans le store, et les panneaux doivent s'ouvrir sans rien casser tant que les
 * champs n'existent pas - on affiche alors l'arbre en lecture seule.
 */

// ── Lecture défensive du store ───────────────────────────────────────────────

/** l'état, vu comme il sera une fois les deux chantiers câblés */
interface EtatProgres {
  /** découvertes acquises */
  technos?: string[]
  /** la recherche en cours, une seule */
  recherche?: { id: string; finAt: number } | null
  /** la merveille du règne : en chantier, puis achevée */
  merveille?: { id: string; finAt?: number; faite: boolean } | null
  lancerRecherche?: (id: string) => void
  batirMerveille?: (id: string) => void
}

function progres(s: GameState): EtatProgres {
  return s as unknown as GameState & EtatProgres
}

const CADRE: React.CSSProperties = {
  background: '#0d1a26',
  border: '1px solid #1e3346',
  borderRadius: 9,
  padding: '9px 11px',
  marginBottom: 7,
}

const RANGS = ['Premier rang', 'Deuxième rang', 'Troisième rang', 'Quatrième rang', 'Cinquième rang']

/** le coût en jetons de ressources, avec ce qui manque en rouge */
function Cout({ cout, avoir }: { cout: Cost; avoir: Record<ResourceId, number> }) {
  const cles = (Object.keys(cout) as ResourceId[]).filter((r) => (cout[r] ?? 0) > 0)
  return (
    <span style={{ display: 'inline-flex', gap: 9, flexWrap: 'wrap' }}>
      {cles.map((r) => {
        const du = cout[r] ?? 0
        const assez = (avoir[r] ?? 0) >= du
        return (
          <span key={r} style={{ color: assez ? '#93a7b4' : '#d68b7a', fontSize: 12 }}>
            {RES[r].emoji} {du}
          </span>
        )
      })}
    </span>
  )
}

/** la jauge d'un chantier ou d'une recherche - part accomplie, de 0 à 1 */
function Jauge({ part, couleur }: { part: number; couleur: string }) {
  const p = Math.max(0, Math.min(1, part))
  return (
    <div style={{ height: 6, background: '#0a141d', borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ width: `${p * 100}%`, height: '100%', background: couleur, transition: 'width .3s' }} />
    </div>
  )
}

// ══════════════════ 1. L'arbre des découvertes ══════════════════

export function PanneauTechnologies({ onFermer }: { onFermer: () => void }) {
  const s = useGame()
  const p = progres(s)
  const now = s.lastSeen
  const acquises = p.technos ?? []
  const recherche = p.recherche ?? null
  const snap: SnapTechno = { buildings: s.buildings, resources: s.resources, technos: acquises }
  const ouverte = rechercheOuverte(snap)
  const effets = effetsTechnos(acquises)
  const gains = resumeEffets(effets)

  return (
    <Modale
      titre="📜 Les découvertes"
      onFermer={onFermer}
      large
      sous={
        ouverte
          ? 'Une seule recherche à la fois : lancer celle-ci, c’est renoncer aux autres jusqu’à son terme.'
          : `Sans agora de niveau ${AGORA_RECHERCHE}, le conseil n’a ni scribes ni archives : rien ne se cherche encore.`
      }
    >
      <>
        <div style={{ display: 'flex', gap: 14, color: '#93a7b4', fontSize: 12.5, marginBottom: 10, flexWrap: 'wrap' }}>
          <span>🏛️ Agora niveau {s.buildings.agora.level}</span>
          <span>
            📜 {acquises.length} / {arbreTechnos().reduce((a, c) => a + c.length, 0)} découvertes
          </span>
        </div>

        {/* La recherche en cours passe AVANT l'arbre : c'est la seule chose
            qu'on ne peut pas changer, et donc la première à savoir. */}
        {recherche && <EnCours id={recherche.id} finAt={recherche.finAt} now={now} snap={snap} />}

        {gains.length > 0 && (
          <div style={{ ...CADRE, borderColor: '#2f5b7b' }}>
            <b style={{ color: '#e8d9b5', fontSize: 13 }}>Ce que le village sait déjà</b>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px', marginTop: 5 }}>
              {gains.map((g) => (
                <span key={g.label} style={{ color: '#93a7b4', fontSize: 12.5 }}>
                  {g.label} <b style={{ color: '#9ed4a0' }}>{g.valeur}</b>
                </span>
              ))}
            </div>
          </div>
        )}

        {arbreTechnos().map((colonne, rang) => (
          <div key={rang} style={{ marginBottom: 4 }}>
            <div
              style={{
                color: '#6f8494',
                fontSize: 11.5,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                margin: '10px 0 5px',
              }}
            >
              {RANGS[rang] ?? `Rang ${rang + 1}`}
            </div>
            {colonne.map((t) => (
              <Tuile
                key={t.id}
                def={t}
                acquise={acquises.includes(t.id)}
                enCours={recherche?.id === t.id}
                occupe={!!recherche}
                acquises={acquises}
                snap={snap}
                lancer={p.lancerRecherche}
              />
            ))}
          </div>
        ))}

        <p style={{ color: '#6f8494', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
          Aucune découverte ne remplace un niveau de bâtiment : chacune vaut quelques pour cent, et c’est leur somme -
          plus l’ordre dans lequel on les prend - qui dit quelle cité on a voulu. Les racines les moins rentables sont
          celles qui ouvrent le plus de branches.
        </p>
      </>
    </Modale>
  )
}

/** le bandeau de la recherche en cours, avec son compte à rebours */
function EnCours({ id, finAt, now, snap }: { id: string; finAt: number; now: number; snap: SnapTechno }) {
  const def = arbreTechnos()
    .flat()
    .find((t) => t.id === id)
  const total = dureeTechno(id, snap)
  const restant = Math.max(0, finAt - now)
  return (
    <div style={{ ...CADRE, borderColor: '#c9a86a', background: '#11202e' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <b style={{ color: '#e2d6bb' }}>
          {def?.emoji ?? '📜'} {def?.nom ?? id}
        </b>
        <span style={{ color: '#93a7b4', fontSize: 12.5, fontStyle: 'italic' }}>recherche en cours</span>
        <span style={{ marginLeft: 'auto', color: '#c9a86a', fontSize: 12.5 }}>
          {restant > 0 ? `encore ${fmtDuree(restant)}` : 'achevée'}
        </span>
      </div>
      <Jauge part={total > 0 ? 1 - restant / total : 1} couleur="#c9a86a" />
    </div>
  )
}

function Tuile({
  def,
  acquise,
  enCours,
  occupe,
  acquises,
  snap,
  lancer,
}: {
  def: TechnoDef
  acquise: boolean
  enCours: boolean
  occupe: boolean
  acquises: string[]
  snap: SnapTechno
  lancer?: (id: string) => void
}) {
  const manques = acquise ? [] : manquePourTechno(def.id, acquises, snap)
  const payable = coutPayable(def.id, snap)
  const ouvre = debloquePar(def.id)
  const dispo = manques.length === 0 && payable && !occupe
  return (
    <div
      style={{
        ...CADRE,
        opacity: acquise ? 0.75 : 1,
        borderColor: acquise ? '#3d6b45' : enCours ? '#c9a86a' : manques.length === 0 ? '#2f5b7b' : '#1e3346',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <b style={{ color: acquise ? '#9ed4a0' : '#e8d9b5' }}>
          {def.emoji} {def.nom}
        </b>
        {acquise && <span style={{ color: '#9ed4a0', fontSize: 12 }}>✓ acquise</span>}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 12, alignItems: 'baseline' }}>
          {!acquise && <Cout cout={coutTechno(def.id)} avoir={snap.resources} />}
          {!acquise && (
            <span style={{ color: '#93a7b4', fontSize: 12 }}>⏳ {fmtDuree(dureeTechno(def.id, snap))}</span>
          )}
        </span>
      </div>
      <div style={{ color: '#93a7b4', fontSize: 12.5, lineHeight: 1.45, margin: '5px 0 6px' }}>{def.desc}</div>
      <div style={{ color: '#c9a86a', fontSize: 12.5, marginBottom: 6 }}>{def.effet}</div>

      {!acquise && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Astuce
            titre={`${def.emoji} ${def.nom}`}
            resume={def.effet}
            lignes={
              ouvre.length > 0 ? [{ label: 'Ouvre', valeur: ouvre.map((t) => t.nom).join(', ') }] : undefined
            }
            note="Une seule recherche à la fois - elle ne s’interrompt pas."
          >
            <button disabled={!dispo || !lancer} onClick={() => lancer?.(def.id)}>
              Rechercher
            </button>
          </Astuce>
          {/* on annonce le refus AVANT le clic : personne ne doit cliquer pour
              apprendre qu'il lui manquait un temple */}
          {manques.length > 0 && (
            <span style={{ color: '#8898a6', fontSize: 12.5, fontStyle: 'italic' }}>Il manque : {manques.join(' · ')}</span>
          )}
          {manques.length === 0 && !payable && (
            <span style={{ color: '#d68b7a', fontSize: 12.5, fontStyle: 'italic' }}>Ressources insuffisantes.</span>
          )}
          {manques.length === 0 && payable && occupe && !enCours && (
            <span style={{ color: '#8898a6', fontSize: 12.5, fontStyle: 'italic' }}>
              Une recherche est déjà en cours.
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════ 2. Les six merveilles ══════════════════

export function PanneauMerveilles({ onFermer }: { onFermer: () => void }) {
  const s = useGame()
  const p = progres(s)
  const now = s.lastSeen
  const technos = p.technos ?? []
  const engagee = p.merveille ?? null
  const snap: SnapMerveille = { buildings: s.buildings, resources: s.resources, merveille: engagee }
  /** la merveille dont le bouton attend sa confirmation - le choix est définitif */
  const [confirmer, setConfirmer] = useState<string | null>(null)

  return (
    <Modale
      titre="🏛️ Les merveilles"
      onFermer={onFermer}
      large
      sous="Six projets, et l’on n’en bâtira QU’UN seul de tout le règne. Le choix ne se défait pas."
    >
      <>
        {engagee && (
          <ChantierMerveille
            id={engagee.id}
            faite={engagee.faite}
            finAt={engagee.finAt}
            now={now}
            technos={technos}
          />
        )}

        {!engagee && (
          <div style={{ ...CADRE, borderColor: '#7d5a2c', background: '#231a10' }}>
            <b style={{ color: '#e8c98b', fontSize: 13 }}>⚠️ Un règne, une merveille</b>
            <div style={{ color: '#c2a884', fontSize: 12.5, lineHeight: 1.5, marginTop: 4 }}>
              Dès que le premier bloc est posé, les cinq autres projets se ferment pour toute la partie - il n’y a ni
              démolition ni changement d’avis. Lisez les six avant d’en engager un.
            </div>
          </div>
        )}

        {MERVEILLES.map((m) => (
          <Fiche
            key={m.id}
            def={m}
            snap={snap}
            technos={technos}
            engagee={engagee}
            confirmer={confirmer === m.id}
            demanderConfirmation={() => setConfirmer(m.id)}
            batir={p.batirMerveille}
          />
        ))}

        <p style={{ color: '#6f8494', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
          Une merveille ne rend pas un peu de tout : elle retire une inquiétude du jeu. Les dieux ne se refroidissent
          plus, le mur ne reste plus percé, le peuple ne désespère plus. C’est pour cela qu’il n’en faut qu’une.
        </p>
      </>
    </Modale>
  )
}

function ChantierMerveille({
  id,
  faite,
  finAt,
  now,
  technos,
}: {
  id: string
  faite: boolean
  finAt?: number
  now: number
  technos: string[]
}) {
  const def = MERVEILLES.find((m) => m.id === id)
  const total = dureeMerveille(id, technos)
  const restant = Math.max(0, (finAt ?? now) - now)
  return (
    <div style={{ ...CADRE, borderColor: faite ? '#3d6b45' : '#c9a86a', background: '#11202e' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <b style={{ color: faite ? '#9ed4a0' : '#e2d6bb', fontSize: 14 }}>
          {def?.emoji ?? '🏛️'} {def?.nom ?? id}
        </b>
        <span style={{ marginLeft: 'auto', color: faite ? '#9ed4a0' : '#c9a86a', fontSize: 12.5 }}>
          {faite ? 'debout, et pour toujours' : restant > 0 ? `encore ${fmtDuree(restant)}` : 'les derniers blocs'}
        </span>
      </div>
      {def && <div style={{ color: '#c2a884', fontSize: 12.5, lineHeight: 1.5, marginTop: 4 }}>{def.promesse}</div>}
      {!faite && <Jauge part={total > 0 ? 1 - restant / total : 1} couleur="#c9a86a" />}
    </div>
  )
}

function Fiche({
  def,
  snap,
  technos,
  engagee,
  confirmer,
  demanderConfirmation,
  batir,
}: {
  def: MerveilleDef
  snap: SnapMerveille
  technos: string[]
  engagee: { id: string; faite: boolean } | null
  confirmer: boolean
  demanderConfirmation: () => void
  batir?: (id: string) => void
}) {
  const v = peutBatirMerveille(def.id, snap, technos)
  const sienne = engagee?.id === def.id
  const barree = !!engagee && !sienne
  return (
    <div
      style={{
        ...CADRE,
        opacity: barree ? 0.5 : 1,
        borderColor: sienne ? '#3d6b45' : v.ok ? '#c9a86a' : '#1e3346',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <b style={{ color: sienne ? '#9ed4a0' : '#e8d9b5', fontSize: 13.5 }}>
          {def.emoji} {def.nom}
        </b>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 12, alignItems: 'baseline' }}>
          <Cout cout={def.cout} avoir={snap.resources} />
          <span style={{ color: '#93a7b4', fontSize: 12 }}>⏳ {fmtDuree(dureeMerveille(def.id, technos))}</span>
        </span>
      </div>
      <div style={{ color: '#93a7b4', fontSize: 12.5, lineHeight: 1.45, margin: '5px 0 5px' }}>{def.desc}</div>
      <div style={{ color: '#c9a86a', fontSize: 12.5, lineHeight: 1.45, marginBottom: 5 }}>{def.promesse}</div>
      <ul style={{ margin: '0 0 7px 16px', padding: 0, color: '#9ed4a0', fontSize: 12.5, lineHeight: 1.5 }}>
        {def.effets.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>

      {!engagee && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Astuce
            titre={`${def.emoji} ${def.nom}`}
            resume={def.promesse}
            lignes={[
              {
                label: 'Bâtiments',
                valeur: def.batiments.map((b) => `${BUILDINGS[b.id].nom} ${b.niveau}`).join(', '),
              },
              { label: 'Chantier', valeur: fmtDuree(dureeMerveille(def.id, technos)) },
            ]}
            note="Une seule merveille par règne. Engagée, elle ferme les cinq autres."
          >
            <button
              disabled={!v.ok || !batir}
              onClick={() => (confirmer ? batir?.(def.id) : demanderConfirmation())}
              style={confirmer ? { borderColor: '#c9a86a', color: '#e8c98b' } : undefined}
            >
              {confirmer ? 'Confirmer : c’est la merveille du règne' : 'Bâtir'}
            </button>
          </Astuce>
          {!v.ok && (
            <span style={{ color: '#8898a6', fontSize: 12.5, fontStyle: 'italic' }}>
              Il manque : {v.manques.join(' · ')}
            </span>
          )}
        </div>
      )}
      {barree && (
        <div style={{ color: '#8898a6', fontSize: 12.5, fontStyle: 'italic' }}>
          Ce projet est clos : le règne a choisi sa merveille.
        </div>
      )}
    </div>
  )
}
