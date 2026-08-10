import { useEffect, useState } from 'react'
import { MAX_TROUPES } from '../../game/expeditions'
import {
  BUTIN_PAR_NEF,
  DESARME_RECUP,
  ESCORTE_MAX,
  NAVIRES,
  PLACES_PAR_NEF,
  TYPES_NAVIRE,
  calesMax,
  coquesDe,
  coquesMax,
  escortable,
  escorteMax,
  etatCoque,
  flotteVide,
  gainEscorte,
  motifPasEscortable,
  motifRefusChantier,
  nbLibres,
  nefsRequises,
  partPerte,
  placeAuPort,
  recuperationDesarmement,
  refusChantier,
  risqueEscorte,
  verdictTraversee,
  type EtatFlotte,
  type TypeNavire,
} from '../../game/flotte'
import { merFermee, peutPayer, useGame, type GameState } from '../../game/store'
import { Montant } from './Icones'
import { Astuce } from './Infobulle'
import { Modale } from './Modale'

/*
 * ═══════════════════════ LE CHANTIER NAVAL ═══════════════════════
 *
 * Un panneau de flotte doit apprendre trois choses, et dans cet ordre :
 *
 *  1. COMBIEN DE PLACES IL RESTE AU PORT. C'est la donnée qui décide de tout : le
 *     plafond est l'arbitrage du système, et il doit se lire avant les cartes des
 *     navires - sinon le joueur choisit un navire puis découvre qu'il n'y a pas de
 *     place, ce qui est l'ordre inverse de la décision.
 *  2. OÙ SONT LES COQUES. Une flotte de six coques dont quatre sont en mer n'est
 *     pas une flotte de six coques : `nbLibres` est le seul chiffre qui compte
 *     quand on veut escorter ou traverser, et la liste dit pour chacune ce qui la
 *     retient. Sans cela, « il vous manque une nef » est incompréhensible pour qui
 *     en possède trois.
 *  3. CE QU'ON PERDRA. Les pertes ne sont pas une punition cachée : elles sont
 *     écrites en tête du bloc, en pourcentage, avant qu'on ait payé une seule
 *     coque. Une flotte qui fond sans qu'on l'ait annoncé passe pour un bogue.
 *
 * AUCUN BOUTON NOUVEAU DANS LA BARRE DU HAUT. Elle en compte dix et la navigation
 * a déjà été jugée peu fluide : on entre ici par le PORT, qui rassemble désormais
 * ses trois usages - le quai (bronze), le comptoir (cours et caravanes), le
 * chantier (coques).
 *
 * La lecture du store est DÉFENSIVE : `flotte`, `batirNavire` et `desarmerNavire`
 * arrivent au câblage. Sans eux le panneau s'ouvre, informe, et ses boutons sont
 * simplement inertes - c'est le contrat qu'a suivi le panneau du comptoir.
 */

// ── Lecture défensive du store ───────────────────────────────────────────────

interface EtatNaval {
  flotte?: EtatFlotte
  batirNavire?: (type: TypeNavire) => void
  desarmerNavire?: (id: string) => void
}

function naval(s: GameState): EtatNaval {
  return s as unknown as GameState & EtatNaval
}

/** la flotte du règne, jamais `undefined` : une sauvegarde d'avant la flotte n'en a pas */
export function flotteDe(s: GameState): EtatFlotte {
  return naval(s).flotte ?? flotteVide()
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

/**
 * Une horloge locale, pour que les cales égrènent leurs secondes. Elle ne tourne
 * QUE s'il y a quelque chose à décompter : un `setInterval` permanent dans un
 * panneau fermé est exactement le genre de détail qui a déjà coûté vingt images
 * par seconde à ce jeu.
 */
function useMaintenant(actif: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!actif) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [actif])
  return now
}

// ── Le bloc qui se greffe dans le comptoir ───────────────────────────────────

/**
 * LE CHOIX DE L'ESCORTE, À GREFFER DANS L'ÉCRAN DE CHARGEMENT DU COMPTOIR.
 *
 * Il vit ici et non dans le panneau du comptoir, pour une raison de règle et non
 * de rangement : `Caravane.risque` est FIGÉ AU DÉPART parce qu'on l'a montré au
 * joueur avant qu'il charge. L'escorte doit donc être décidée dans le même écran
 * que le chargement, et le nombre affiché doit être celui que le store figera -
 * d'où la même fonction (`risqueEscorte`) des deux côtés, et un seul endroit où
 * la lire.
 */
export function ChoixEscorte({
  villageId,
  galeres,
  onChanger,
  risqueNu,
}: {
  villageId: string
  galeres: number
  onChanger: (n: number) => void
  risqueNu: number
}) {
  const f = flotteDe(useGame())
  const max = escorteMax(f, villageId)
  const possible = escortable(villageId)
  const total = coquesDe(f, 'pentecontere').length

  if (!possible) {
    return (
      <div style={{ ...CADRE, color: '#7f97a8', fontSize: 12.5 }}>
        ⚔️ {motifPasEscortable(villageId)}
      </div>
    )
  }
  if (total === 0) {
    return (
      <div style={{ ...CADRE, color: '#7f97a8', fontSize: 12.5 }}>
        ⚔️ Cette route se longe par l’eau : une pentécontère y ferait tomber le risque d’un tiers. Vous n’en avez
        aucune - le chantier naval est au port.
      </div>
    )
  }
  return (
    <div style={{ ...CADRE, borderColor: galeres > 0 ? '#2f5b7b' : '#1e3346' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <b style={{ color: '#e8d9b5', fontSize: 12.5 }}>⚔️ Escorte</b>
        {Array.from({ length: ESCORTE_MAX + 1 }, (_, n) => n).map((n) => (
          <button
            key={n}
            className={n === galeres ? 'principal' : undefined}
            disabled={n > max}
            onClick={() => onChanger(n)}
          >
            {n === 0 ? 'aucune' : `${n} galère${n > 1 ? 's' : ''}`}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', color: '#93a7b4', fontSize: 12 }}>
          {max} au mouillage sur {total}
        </span>
      </div>
      <div style={{ marginTop: 6, fontSize: 12.5, color: '#93a7b4' }}>
        {galeres > 0 ? (
          <>
            Risque de la route : <b style={{ color: '#c0563f' }}>{pourcent(risqueNu)}</b> →{' '}
            <b style={{ color: '#7fb069' }}>{pourcent(risqueEscorte(risqueNu, galeres))}</b> (
            {pourcent(gainEscorte(risqueNu, galeres))} écartés). Les galères sont retenues jusqu’au retour du convoi, et
            coulent avec lui s’il est pris.
          </>
        ) : (
          <>Une galère vaut mieux qu’une amitié, deux galères valent une alliance - et l’alliance ne se bâtit pas en bois.</>
        )}
      </div>
    </div>
  )
}

/**
 * LA TRAVERSÉE, À GREFFER DANS L'ÉCRAN DE PRÉPARATION D'UNE EXPÉDITION.
 *
 * Elle ne s'affiche que pour une place d'outre-mer : ailleurs, la colonne marche
 * et il n'y a rien à dire. Elle dit trois choses que le joueur ne peut pas
 * deviner - combien de cales sa colonne demande, ce que les cales ajoutent au
 * butin, et ce que la mer risque de prendre au retour.
 */
export function BlocTraversee({ villageId, hommes }: { villageId: string; hommes: number }) {
  const s = useGame()
  const f = flotteDe(s)
  const t = verdictTraversee({ port: s.buildings.port.level, flotte: f, merFermee: merFermee(s), now: Date.now() }, villageId, hommes)
  if (t.passage === 'terre') return null

  const cadre =
    t.passage === 'manque'
      ? { ...CADRE, borderColor: '#4a2a24', background: '#170f10' }
      : { ...CADRE, borderColor: t.passage === 'flotte' ? '#2f5b7b' : '#1e3346' }

  return (
    <div style={cadre}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <b style={{ color: t.passage === 'manque' ? '#d8b6a8' : '#e8d9b5', fontSize: 12.5 }}>
          {t.passage === 'flotte' ? '🚢 Le détroit forcé' : t.passage === 'manque' ? '❄️ La mer est prise' : '🚢 La traversée'}
        </b>
        <span style={{ marginLeft: 'auto', color: '#93a7b4', fontSize: 12 }}>
          {nbLibres(f, 'nef')} cale{nbLibres(f, 'nef') > 1 ? 's' : ''} · {nbLibres(f, 'pentecontere')} galère
          {nbLibres(f, 'pentecontere') > 1 ? 's' : ''} au mouillage
        </span>
      </div>
      {t.motif ? (
        <div style={{ color: '#b58a7c', fontSize: 12.5, lineHeight: 1.45, marginTop: 4 }}>{t.motif}</div>
      ) : (
        <div style={{ color: '#93a7b4', fontSize: 12.5, lineHeight: 1.5, marginTop: 4 }}>
          {t.passage === 'flotte' ? (
            <>
              La saison a fermé la mer, et vous passez quand même : {t.nefs} cale{t.nefs > 1 ? 's' : ''} pour {hommes}{' '}
              homme{hommes > 1 ? 's' : ''}, une galère pour ouvrir la route.
            </>
          ) : t.nefs > 0 ? (
            <>
              {t.nefs} cale{t.nefs > 1 ? 's' : ''} suivent la colonne : ce qu’on prendra rentrera entier.
            </>
          ) : (
            <>
              La mer est ouverte : la colonne passe sans coque. Mais sans cale, la moitié du sac reste sur la grève -{' '}
              {t.requises} nef{t.requises > 1 ? 's' : ''} de charge y ajouterai{t.requises > 1 ? 'ent' : 't'}{' '}
              {pourcent(t.requises * BUTIN_PAR_NEF)} de butin.
            </>
          )}
        </div>
      )}
      {t.nefs + t.galeres > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 5, fontSize: 12 }}>
          <span style={{ color: '#c9a86a' }}>butin +{pourcent(t.butinPct)}</span>
          <span style={{ color: t.risque > 0.1 ? '#c0563f' : '#93a7b4' }}>
            {pourcent(t.risque)} de perdre chaque coque au retour
          </span>
          <span style={{ color: '#7f97a8' }}>
            {t.nefs + t.galeres} coque{t.nefs + t.galeres > 1 ? 's' : ''} retenue{t.nefs + t.galeres > 1 ? 's' : ''}{' '}
            jusqu’au retour
          </span>
        </div>
      )}
    </div>
  )
}

// ── Le panneau ───────────────────────────────────────────────────────────────

/** une quille en cale : ce qu'on monte, et dans combien de temps elle flotte */
function LigneChantier({ type, finAt, now }: { type: TypeNavire; finAt: number; now: number }) {
  const def = NAVIRES[type]
  const total = Math.max(1, def.chantierMs)
  const part = Math.max(0, Math.min(1, 1 - (finAt - now) / total))
  return (
    <div style={{ ...CADRE, borderColor: '#2f5b7b' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <b style={{ color: '#e8d9b5' }}>
          🪵 {def.emoji} {def.nom}
        </b>
        <span style={{ marginLeft: 'auto', color: '#c9a86a', fontSize: 12.5 }}>à l’eau dans {mmss(finAt - now)}</span>
      </div>
      <div style={{ height: 5, background: '#132434', borderRadius: 3, marginTop: 6 }}>
        <div style={{ width: `${Math.round(part * 100)}%`, height: '100%', background: '#4d86b5', borderRadius: 3 }} />
      </div>
    </div>
  )
}

/** une carte de navire, buildable ou grisée AVEC SON MOTIF */
function CarteNavire({ type }: { type: TypeNavire }) {
  const s = useGame()
  const c = naval(s)
  const f = flotteDe(s)
  const def = NAVIRES[type]
  const port = s.buildings.port.level
  const refus = refusChantier({ port, flotte: f, merFermee: merFermee(s), now: Date.now() })
  const payable = peutPayer(s.resources, def.cout)
  const bloque = refus !== null || !payable || !c.batirNavire

  return (
    <div style={{ ...CADRE, opacity: bloque ? 0.72 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <b style={{ color: '#e8d9b5' }}>
          {def.emoji} {def.nom}
        </b>
        <span style={{ marginLeft: 'auto', color: '#93a7b4', fontSize: 12 }}>
          {coquesDe(f, type).length} à votre flotte · chantier {mmss(def.chantierMs)}
        </span>
      </div>
      <div style={{ color: '#93a7b4', fontSize: 12.5, lineHeight: 1.5, margin: '5px 0' }}>{def.desc}</div>
      <div style={{ color: '#c9a86a', fontSize: 12.5, marginBottom: 5 }}>{def.role}</div>
      <ul style={{ margin: '0 0 7px 16px', padding: 0, color: '#8898a6', fontSize: 12, lineHeight: 1.6 }}>
        {def.effets.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
        <Montant n={-(def.cout.bois ?? 0)} id="bois" taille={13} />
        <Montant n={-(def.cout.bronze ?? 0)} id="bronze" taille={13} />
      </div>
      <button className="principal" style={{ width: '100%' }} disabled={bloque} onClick={() => c.batirNavire?.(type)}>
        Mettre la quille en cale
      </button>
      {refus !== null && (
        <div style={{ color: '#c9a86a', fontSize: 12.5, marginTop: 5, lineHeight: 1.45 }}>
          {motifRefusChantier(refus, port)}
        </div>
      )}
      {refus === null && !payable && (
        <div style={{ color: '#c9a86a', fontSize: 12.5, marginTop: 5 }}>
          Vos réserves de bois et de bronze n’y suffisent pas.
        </div>
      )}
    </div>
  )
}

export function PanneauFlotte({ onFermer }: { onFermer: () => void }) {
  const s = useGame()
  const c = naval(s)
  const f = flotteDe(s)
  const port = s.buildings.port.level
  const now = useMaintenant((f.chantiers?.length ?? 0) > 0)
  const places = placeAuPort(f, port)
  const cales = f.chantiers?.length ?? 0

  return (
    <Modale
      titre="🚢 Le chantier naval"
      onFermer={onFermer}
      large
      sous={
        port === 0
          ? 'Une coque se monte sur une cale, pas sur une plage. Bâtissez le port d’abord.'
          : 'Deux navires, deux métiers : la galère se bat et escorte, la nef porte les hommes et le butin. Le port dit combien de coques vous pouvez mouiller - c’est là tout l’arbitrage.'
      }
    >
      <>
        <div style={{ display: 'flex', gap: 14, color: '#93a7b4', fontSize: 12.5, marginBottom: 10, flexWrap: 'wrap' }}>
          <span>⚓ Port niveau {port}</span>
          <span>
            🚢 {coquesDe(f).length}/{coquesMax(port)} coques
            {places === 0 && coquesMax(port) > 0 && <span style={{ color: '#c9a86a' }}> - complet</span>}
          </span>
          <span>
            🪵 {cales}/{calesMax(port)} cale{calesMax(port) > 1 ? 's' : ''}
          </span>
          <span>
            ⚔️ {nbLibres(f, 'pentecontere')} galère{nbLibres(f, 'pentecontere') > 1 ? 's' : ''} · 📦{' '}
            {nbLibres(f, 'nef')} cale{nbLibres(f, 'nef') > 1 ? 's' : ''} au mouillage
          </span>
        </div>

        {cales > 0 && (
          <>
            <div style={TITRE_BLOC}>En cale</div>
            {(f.chantiers ?? []).map((ch) => (
              <LigneChantier key={ch.id} type={ch.type} finAt={ch.finAt} now={now} />
            ))}
          </>
        )}

        {coquesDe(f).length > 0 && (
          <>
            <div style={TITRE_BLOC}>Vos coques</div>
            {coquesDe(f).map((coque) => {
              const def = NAVIRES[coque.type]
              const recup = recuperationDesarmement(coque.type)
              return (
                <div key={coque.id} style={{ ...CADRE, display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 18 }}>{def.emoji}</span>
                  <div>
                    <div style={{ color: '#e8d9b5', fontSize: 12.5 }}>{def.nom}</div>
                    <div style={{ color: coque.retenue ? '#c9a86a' : '#7f97a8', fontSize: 12 }}>{etatCoque(coque)}</div>
                  </div>
                  <Astuce
                    titre={`🪓 Désarmer la ${def.nom.toLowerCase()}`}
                    resume={`On la dépèce sur la grève : ${recup.bois ?? 0} de bois se rescie, le bronze est reparti dans les armes depuis longtemps.`}
                    lignes={[
                      { label: 'Rendu', valeur: `${recup.bois ?? 0} bois (${Math.round(DESARME_RECUP * 100)} %)`, fort: true },
                      { label: 'Place libérée', valeur: '1 mouillage' },
                    ]}
                    note="Sans cela, trois nefs et aucune galère au petit quai seraient un cul-de-sac : le plafond doit être un arbitrage, pas une punition."
                  >
                    <button
                      style={{ marginLeft: 'auto' }}
                      disabled={!c.desarmerNavire || coque.retenue !== null}
                      onClick={() => c.desarmerNavire?.(coque.id)}
                    >
                      Désarmer
                    </button>
                  </Astuce>
                </div>
              )
            })}
          </>
        )}

        {port > 0 && (
          <>
            <div style={TITRE_BLOC}>Mettre une quille en cale</div>
            {TYPES_NAVIRE.map((t) => (
              <CarteNavire key={t} type={t} />
            ))}
          </>
        )}

        <div style={TITRE_BLOC}>Ce que la mer prend</div>
        <div style={{ ...CADRE, color: '#93a7b4', fontSize: 12.5, lineHeight: 1.6 }}>
          <div>
            🌊 <b style={{ color: '#e8d9b5' }}>{pourcent(partPerte({}))}</b> par coque à chaque retour d’expédition,
            même après un triomphe. La mer prend son dû.
          </div>
          <div>
            🏳️ <b style={{ color: '#e8d9b5' }}>{pourcent(partPerte({ echec: true }))}</b> si le raid échoue : on
            rembarque sous les traits et l’on abandonne des coques sur la grève.
          </div>
          <div>
            ❄️ <b style={{ color: '#e8d9b5' }}>{pourcent(partPerte({ echec: true, hiver: true }))}</b> pour un raid
            d’hiver manqué, le pire des cas : près d’une coque sur deux ne revient pas du détroit.
          </div>
          <div>
            ⚔️ Une galère d’escorte coule avec le convoi qu’elle n’a pas su sauver, une fois sur six environ.
          </div>
        </div>

        <p style={{ color: '#6f8494', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
          {/* MAX_TROUPES et non 20 : le jour où la colonne pleine changera de taille, cette
              phrase doit changer avec elle plutôt que de mentir en silence */}
          Une cale porte {PLACES_PAR_NEF} hommes : une colonne pleine en demande {nefsRequises(MAX_TROUPES)}, et forcer le
          détroit hors saison réclame en plus une galère pour ouvrir la route. Une coque retenue par un convoi ou partie
          avec la colonne n’est pas disponible pour autre chose - c’est le nombre de coques AU MOUILLAGE qui décide, pas
          celui de vos coques.
        </p>
      </>
    </Modale>
  )
}
