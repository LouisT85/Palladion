import { useState } from 'react'
import {
  JOURS_DE_VIVRES_EXIGES,
  MIN_HOMMES,
  PART_MAX_DEHORS,
  RANCON_MIN,
  RATION_PAR_JOUR,
  SEUIL_OFFRE,
  SEUIL_SORTIE,
  TENUE_FAMINE,
  TENUE_MAX,
  TRAVAUX,
  TRAVAUX_IDS,
  VOLONTE_MAX,
  colonneDAssaut,
  coutTravail,
  forceDeLaLigne,
  hommesDeLaLigne,
  motTroupes,
  motifRefusBlocus,
  partEngagee,
  partRancon,
  rancon,
  refusBlocus,
  vueBlocus,
  type TravailId,
} from '../../game/blocus'
import { MODE_TEST, RES, UNITS, UNIT_IDS } from '../../game/data'
import {
  MAX_TROUPES,
  RAID_COOLDOWN_MS,
  VILLAGES_CIBLES,
  VILLAGES_PAR_ID,
  puissanceEffective,
} from '../../game/expeditions'
import { STATUTS } from '../../game/diplomatie'
import { fmtDuree, jourDe, merFermee, peutPayer, statutDe, useGame } from '../../game/store'
import type { ResourceId, UnitId } from '../../game/types'
import { Montant } from './Icones'
import { Modale } from './Modale'
import { Astuce } from './Infobulle'

/*
 * ═══════════════════════ LE PANNEAU DU BLOCUS ═══════════════════════
 *
 * Un panneau de DURÉE ne se lit pas comme un panneau d'assaut. Un assaut se juge
 * sur un rapport de force ; un blocus se juge sur trois chiffres qui courent l'un
 * contre l'autre, et le joueur ne peut en deviner aucun :
 *
 *  1. COMBIEN DE JOURNÉES AVANT QU'ILS NE PARLEMENTENT, et combien de journées la
 *     ligne peut encore tenir. Les deux sont côte à côte, en tête, parce que leur
 *     COMPARAISON est la décision : quand la seconde est plus petite, le blocus est
 *     perdu d'avance et il faut le savoir avant d'avoir mangé six cents mesures.
 *  2. CE QUE LA JOURNÉE COÛTE. La ration est le vrai prix du système - un débit, pas
 *     une somme - et un débit ne se sent que s'il est écrit.
 *  3. CE QUI RESTE AU VILLAGE. Les hommes postés manquent aux remparts : le panneau
 *     le dit en nombre ET en force, avant le départ comme pendant.
 *
 * ET LE RÉCIT DE LA DERNIÈRE JOURNÉE, en clair. C'est un système où il ne se passe
 * rien à l'écran : si la chronique de la nuit n'est pas là, sous les yeux, le joueur
 * ne voit qu'une jauge qui descend.
 *
 * AUCUN BOUTON NOUVEAU DANS LA BARRE DU HAUT - elle en compte dix et la navigation
 * a déjà été jugée peu fluide. On entre ici par le panneau des EXPÉDITIONS, où
 * chaque place forte porte désormais un troisième verbe à côté de « piller » et
 * « secourir », et par la CASERNE, qui est l'endroit où l'on compte ses hommes.
 */

/** une jauge nommée, avec son seuil marqué quand il en a un */
function Jauge({
  valeur,
  max,
  couleur,
  seuil,
}: {
  valeur: number
  max: number
  couleur: string
  seuil?: number
}) {
  const part = Math.max(0, Math.min(1, valeur / max))
  return (
    <div className="bl-jauge">
      <div className="bl-jauge-plein" style={{ width: `${Math.round(part * 100)}%`, background: couleur }} />
      {seuil !== undefined && (
        <div className="bl-jauge-seuil" style={{ left: `${Math.round((seuil / max) * 100)}%` }} />
      )}
    </div>
  )
}

/** un prix, écrit avec les icônes du jeu */
function Prix({ cout }: { cout: Partial<Record<ResourceId, number>> }) {
  const entrees = Object.entries(cout) as [ResourceId, number][]
  if (entrees.length === 0) return <span className="bl-gratuit">rien que des torches</span>
  return (
    <>
      {entrees.map(([r, n]) => (
        <Montant key={r} n={-n} id={r} taille={12} />
      ))}
    </>
  )
}

// ── Le blocus en cours ───────────────────────────────────────────────────────

function BlocusEnCours() {
  const s = useGame()
  const e = s.blocus
  if (!e) return null
  const v = VILLAGES_PAR_ID[e.villageId]
  if (!v) return null
  const pillages = s.expeditions[e.villageId]?.pillages ?? 0
  const vue = vueBlocus(e, v, pillages)
  const part = partEngagee(e.postes, s.army)
  const enBataille = s.battle !== null || s.expedition !== null
  // ce que la ligne pourrait envoyer dans la place, et ce qui resterait dehors
  const colonne = colonneDAssaut(e.postes)
  /*
   * LE COOLDOWN DE RAID VAUT AUSSI POUR L'ASSAUT D'UN BLOCUS, parce que l'assaut
   * EST une expédition et qu'il passe par le même moteur. Il fallait le dire ici :
   * c'est le seul refus de ce panneau qui ne se voit pas dans l'état du blocus, et
   * un bouton qui échoue sans motif affiché est proscrit dans ce dépôt.
   */
  const resteCd = Math.max(
    0,
    (s.expeditions[e.villageId]?.dernierRaid ?? 0) + RAID_COOLDOWN_MS / (MODE_TEST ? 10 : 1) - s.lastSeen,
  )

  return (
    <div className="blocus">
      {/* ── ce qui court contre quoi ── */}
      <div className={`bl-tete${vue.perdu ? ' perdu' : ''}`}>
        <div className="bl-tete-titre">
          <span className="bl-emoji">{v.emoji}</span>
          <div>
            <div className="bl-nom">
              Ligne devant {v.nom} — journée {e.jours}
            </div>
            <div className="bl-sous">
              Ouverte au jour {e.depuis} du règne · {motTroupes(e.postes)}
            </div>
          </div>
        </div>
        <div className="bl-comptes">
          <div className="bl-compte">
            <span className="bl-chiffre">{Number.isFinite(vue.jusquaOffre) ? vue.jusquaOffre : '∞'}</span>
            <span className="bl-label">{e.offre ? 'ils ont parlementé' : 'journées avant qu’ils ne cèdent'}</span>
          </div>
          <div className="bl-compte">
            <span className="bl-chiffre">{Number.isFinite(vue.tenables) ? vue.tenables : '∞'}</span>
            <span className="bl-label">journées que la ligne tient</span>
          </div>
          <div className="bl-compte">
            <span className="bl-chiffre">{vue.rationDuJour}</span>
            <span className="bl-label">🌾 par journée de jeu</span>
          </div>
        </div>
        {vue.cedeAvantEux && (
          <div className="bl-alerte">
            ⚠️ Votre ligne cédera avant qu’ils ne parlementent. Renforcez-la par l’assaut, ou levez-la avant d’avoir mangé
            {' '}{vue.rationDuJour * vue.tenables} mesures pour rien.
          </div>
        )}
        {vue.sortieFatale && (
          <div className="bl-alerte">
            ⚠️ Leur garnison sortira quand sa volonté tombera sous {SEUIL_SORTIE}, et votre ligne pèse {Math.round(vue.forceLigne)}{' '}
            contre les {Math.round(vue.puissancePlace)} de la place. Elle n’y survivrait pas.
          </div>
        )}
      </div>

      {/* ── les deux jauges ── */}
      <div className="bl-jauges">
        <div className="bl-jauge-bloc">
          <div className="bl-jauge-tete">
            <span>🏰 Volonté de la place</span>
            <b>{Math.round(e.volonte)}</b>
          </div>
          <Jauge valeur={e.volonte} max={VOLONTE_MAX} couleur="#c0563f" seuil={SEUIL_OFFRE} />
          <div className="bl-note">
            −{Math.round(vue.usure)} par journée. Sous {SEUIL_OFFRE}, ils envoient parlementer. Leur garnison désarme avec
            leur volonté : {motTroupes(vue.garnisonDesarmee)} en état de tenir la porte, sur {motTroupes(vue.garnison)}.
          </div>
        </div>
        <div className="bl-jauge-bloc">
          <div className="bl-jauge-tete">
            <span>🏕️ Tenue de la ligne</span>
            <b>{Math.round(e.tenue)}</b>
          </div>
          <Jauge valeur={e.tenue} max={TENUE_MAX} couleur="#7fb069" />
          <div className="bl-note">
            −{vue.usureTenue} par journée{e.offre ? ' - les hommes voient la fin, ils patientent' : ''}. À zéro, ils
            rentrent d’eux-mêmes. Une journée sans convoi de grain en coûte {TENUE_FAMINE}.
          </div>
        </div>
      </div>

      {/* ── ce qui manque aux remparts ── */}
      <Astuce
        titre="⚖️ Ce que le blocus coûte à vos murs"
        resume="Les hommes postés là-bas ne sont plus dans votre garnison : ils ne défendront pas le village."
        lignes={[
          { label: 'Hommes dehors', valeur: `${part.dehors} sur ${part.dehors + part.dedans}` },
          { label: 'Part de votre force engagée', valeur: `${Math.round(part.partForce * 100)} %`, fort: part.partForce > 0.5 },
          { label: 'Force restée au village', valeur: String(Math.round(part.forceDedans)) },
        ]}
        note="Un village pillé pendant que la ligne tient, et la ligne se défait : on ne garde pas la porte des autres quand la sienne brûle."
      >
        <div className={`bl-engage${part.partForce > 0.5 ? ' fort' : ''}`}>
          ⚖️ {part.dehors} homme{part.dehors > 1 ? 's' : ''} dehors sur {part.dehors + part.dedans} —{' '}
          <b>{Math.round(part.partForce * 100)} %</b> de votre force est devant {v.nom}
        </div>
      </Astuce>

      {/* ── la nuit dernière ── */}
      <div className="bl-recit">
        <div className="bl-recit-tete">🌙 La dernière journée</div>
        {e.dernier.map((l: string, i: number) => (
          <div key={i} className="bl-recit-ligne">
            {l}
          </div>
        ))}
      </div>

      {/* ── les travaux ── */}
      <div className="bl-travaux">
        <h3>Les travaux de siège</h3>
        <div className="bl-note">
          Chacun une seule fois, et son effet vaut jusqu’au bout du blocus. C’est ici qu’on achète des journées.
        </div>
        {TRAVAUX_IDS.map((id) => {
          const def = TRAVAUX[id]
          const cout = coutTravail(id, v)
          const fait = e.travaux.includes(id)
          const payable = peutPayer(s.resources, cout)
          return (
            <div key={id} className={`bl-travail${fait ? ' fait' : ''}`}>
              <span className="bl-emoji">{def.emoji}</span>
              <div className="bl-travail-corps">
                <div className="bl-travail-nom">{def.nom}</div>
                <div className="bl-travail-desc">{def.desc}</div>
                <div className="bl-travail-effet">{def.effet}</div>
              </div>
              <div className="bl-travail-actions">
                <div className="bl-prix">
                  <Prix cout={cout} />
                </div>
                <button disabled={fait || !payable} onClick={() => s.ordonnerTravail(id as TravailId)}>
                  {fait ? 'Fait' : 'Ordonner'}
                </button>
                {!fait && !payable && <div className="bl-motif">Vos réserves n’y suffisent pas.</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── les quatre décisions ── */}
      <div className="bl-decisions">
        {e.offre ? (
          <div className="bl-offre">
            <div className="bl-offre-tete">🕊️ {v.nom} offre sa reddition</div>
            <div className="bl-offre-texte">
              Ils ouvrent la porte et paient rançon — {Math.round(partRancon(e) * 100)} % de ce qu’un sac aurait rapporté,
              sans un mort de votre côté. Zeus Xenios approuve qu’on tienne une supplication ; Arès ne compte pas les
              victoires remportées sans lance.
            </div>
            <div className="bl-prix">
              {(Object.entries(rancon(e, v)) as [ResourceId, number][]).map(([r, n]) => (
                <Montant key={r} n={n} id={r} taille={13} signe />
              ))}
            </div>
            <div className="bl-note">
              Attendre encore grossit la rançon (jusqu’à 100 % à volonté nulle) et coûte {vue.rationDuJour} 🌾 par
              journée. Leur offre, elle, n’expire pas.
            </div>
            <button className="principal" style={{ width: '100%' }} onClick={() => s.accepterReddition()}>
              🕊️ Accepter la reddition
            </button>
          </div>
        ) : (
          <div className="bl-note">
            Rien à décider tant qu’ils tiennent : le blocus avance d’une journée de jeu toutes les huit minutes, et il
            avance aussi quand vous n’êtes pas là — d’une journée, jamais plus.
          </div>
        )}
        <div className="bl-boutons">
          <Astuce
            titre="⚔️ Donner l’assaut maintenant"
            resume="Vos hommes rentrent dans la place au lieu d’attendre qu’elle s’ouvre. C’est un vrai assaut, avec ses morts - mais contre une garnison désarmée."
            lignes={[
              { label: 'Garnison en face', valeur: motTroupes(vue.garnisonDesarmee) },
              { label: 'Enceinte', valeur: `${Math.round(vue.partMur * 100)} % de sa structure`, fort: vue.partMur < 1 },
              { label: 'Butin', valeur: 'celui d’un pillage - la place sera saccagée' },
              /*
                ⚠️ UNE COLONNE NE PASSE PAS VINGT HOMMES, ET UNE LIGNE, SI. C'est la
                seule règle du jeu que le blocus ne partage pas avec l'expédition, et
                elle doit se lire AVANT le clic : sans cette ligne, un joueur qui a
                posté vingt-huit hommes voyait huit d'entre eux rester au village sans
                comprendre pourquoi sa colonne était plus mince que sa ligne.
              */
              {
                label: 'Colonne',
                valeur:
                  colonne.trop > 0
                    ? `${MAX_TROUPES} hommes au plus - ${motTroupes(colonne.restent)} restent au village`
                    : `vos ${vue.hommes} hommes y vont tous`,
                fort: colonne.trop > 0,
              },
            ]}
            note="Le blocus s’achève dans l’assaut : Zeus Xenios comptera un village saccagé de plus, et la garnison se renforcera pour la prochaine fois."
          >
            <button style={{ flex: 1 }} disabled={enBataille || resteCd > 0} onClick={() => s.donnerAssautBlocus()}>
              ⚔️ Donner l’assaut
            </button>
          </Astuce>
          <Astuce
            titre="🏳️ Lever le siège"
            resume="Les hommes rentrent, et il n’y a rien dans leurs mains. Le grain mangé là-bas, personne ne le rendra."
            note="Ambiance en baisse, et Arès n’aime pas qu’on renonce."
          >
            <button className="danger" style={{ flex: 1 }} onClick={() => s.leverBlocus()}>
              🏳️ Lever le siège
            </button>
          </Astuce>
        </div>
        {resteCd > 0 && (
          <div className="bl-motif">
            ⏳ Vos hommes rentrent à peine de {v.nom} : l’assaut attendra {fmtDuree(resteCd)}. La ligne, elle, tient
            pendant ce temps - et c’est justement ce qu’elle sait faire.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Poser une ligne ──────────────────────────────────────────────────────────

function PoserLigne({ villageId, onRetour }: { villageId: string; onRetour: () => void }) {
  const s = useGame()
  const v = VILLAGES_PAR_ID[villageId]
  const [postes, setPostes] = useState<Partial<Record<UnitId, number>>>({})
  const hommes = hommesDeLaLigne(postes)
  const force = forceDeLaLigne(postes)
  const puissance = puissanceEffective(v, s.expeditions[villageId]?.pillages ?? 0)
  const snap = {
    place: v,
    army: s.army,
    postes,
    grain: s.resources.grain,
    blocus: s.blocus ?? null,
    enBataille: s.battle !== null,
    colonneDehors: s.expedition !== null,
    merFermee: merFermee(s),
    allie: !!s.alliances[villageId],
    assiege: s.mode === 'siege',
  }
  const refus = refusBlocus(snap)
  /*
   * ⚠️ `partEngagee` attend l'armée QUI RESTE, pas l'armée entière : c'est le
   * contrat du store, où les hommes postés sont retirés de `s.army` comme ceux
   * d'une colonne. Ici la ligne n'est pas encore partie et `s.army` les contient
   * toujours - on lui passe donc l'armée telle qu'elle SERAIT, sans quoi les mêmes
   * hommes seraient comptés deux fois et le panneau annoncerait qu'il reste au
   * village plus de monde qu'il n'y en a.
   */
  const restant = { ...s.army }
  for (const u of UNIT_IDS) restant[u] = Math.max(0, s.army[u] - (postes[u] ?? 0))
  const part = partEngagee(postes, restant)

  return (
    <>
      <div className="bl-place">
        <span className="bl-emoji">{v.emoji}</span>
        <div>
          <div className="bl-nom">{v.nom}</div>
          <div className="bl-sous">{v.desc}</div>
        </div>
      </div>
      <div className="bl-bloc">
        <h3>Ce qu’il y a derrière le mur</h3>
        <div className="bl-note">
          🧱 Remparts niveau {v.mur} · puissance ≈ <b>{puissance}</b>. Une ligne qui pèse à peu près autant les amène à
          parlementer en quatre à cinq journées de jeu — une saison. Une ligne deux fois plus légère n’y arrivera
          jamais : ils sortiront, et ils passeront.
        </div>
      </div>
      <div className="bl-bloc">
        <h3>
          La ligne ({hommes} homme{hommes > 1 ? 's' : ''}) — poids ≈ {Math.round(force)}
        </h3>
        {UNIT_IDS.map((u) => (
          <div key={u} className="unite">
            <span style={{ fontSize: 22 }}>{UNITS[u].emoji}</span>
            <div className="infos">
              <div className="nom">{UNITS[u].nom}</div>
              <div className="stats">
                disponibles : {s.army[u]} · ⚔{UNITS[u].atk} ❤{UNITS[u].hp}
              </div>
            </div>
            <div className="actions">
              <button onClick={() => setPostes({ ...postes, [u]: Math.max(0, (postes[u] ?? 0) - 1) })}>−</button>
              <span className="compteur">{postes[u] ?? 0}</span>
              <button
                onClick={() => setPostes({ ...postes, [u]: Math.min(s.army[u], (postes[u] ?? 0) + 1) })}
                disabled={(postes[u] ?? 0) >= s.army[u]}
              >
                +
              </button>
            </div>
          </div>
        ))}
        <div className={`bl-engage${part.partForce > 0.5 ? ' fort' : ''}`}>
          ⚖️ Il resterait <b>{part.dedans}</b> homme(s) au village, soit{' '}
          <b>{Math.round((1 - part.partForce) * 100)} %</b> de votre force sur les remparts. On ne poste jamais plus
          de {Math.round(PART_MAX_DEHORS * 100)} % : il faut du monde à la porte.
        </div>
        <div className="bl-note">
          🌾 {hommes * RATION_PAR_JOUR} mesures par journée de jeu, versées chaque journée tant que la ligne tient. On
          n’ouvre pas une ligne sans {JOURS_DE_VIVRES_EXIGES} journées de vivres en magasin, soit{' '}
          {hommes * RATION_PAR_JOUR * JOURS_DE_VIVRES_EXIGES} 🌾. Vous en avez {Math.floor(s.resources.grain)}.
        </div>
        {hommes > MAX_TROUPES && (
          <div className="bl-motif">
            ⚔️ Une ligne peut être plus grosse qu’une colonne, mais si vous finissez par donner l’assaut, {MAX_TROUPES}{' '}
            hommes seulement entreront dans la place - les {hommes - MAX_TROUPES} autres resteront au village.
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button style={{ flex: 1 }} onClick={onRetour}>
          Retour
        </button>
        <button
          className="principal"
          style={{ flex: 2 }}
          disabled={refus !== null}
          onClick={() => s.ouvrirBlocus(villageId, postes)}
        >
          ⛓️ Poster la ligne
        </button>
      </div>
      {refus !== null && <div className="bl-motif">{motifRefusBlocus(refus, snap)}</div>}
      {refus === null && (
        <div className="bl-note">
          Au moins {MIN_HOMMES} hommes, et ils y resteront des journées entières. Rien ne se décidera sans vous : la
          place offrira sa reddition et attendra votre parole.
        </div>
      )}
    </>
  )
}

// ── Le panneau ───────────────────────────────────────────────────────────────

export function PanneauBlocus({ onFermer }: { onFermer: () => void }) {
  const s = useGame()
  const [cible, setCible] = useState<string | null>(null)
  const enCours = s.blocus

  if (enCours) {
    return (
      <Modale
        titre="⛓️ Le blocus"
        large
        onFermer={onFermer}
        sous="On ne perce pas la muraille : on ferme la place et l’on attend. Cela se compte en journées, et cela se paie en grain."
      >
        <BlocusEnCours />
      </Modale>
    )
  }

  if (cible) {
    return (
      <Modale titre="⛓️ Poster une ligne" onFermer={onFermer} fermerTexte={null}>
        <PoserLigne villageId={cible} onRetour={() => setCible(null)} />
      </Modale>
    )
  }

  const jour = jourDe(s)
  return (
    <Modale
      titre="⛓️ Le blocus - assiéger au lieu de razzier"
      large
      onFermer={onFermer}
      sous="Poster des hommes devant une place, couper l’eau, brûler les moissons, et attendre qu’elle négocie. Aucune bataille - une durée."
    >
      <>
        <div className="bl-note">
          Un raid dure trois minutes et fâche Zeus. Un blocus dure une saison, mange votre grain, dégarnit vos remparts -
          et se termine par une porte qui s’ouvre. C’est la seule façon de s’enrichir sur une place forte sans que Zeus
          Xenios ne compte un village saccagé de plus. Jour {jour} du règne.
        </div>
        {VILLAGES_CIBLES.map((v) => {
          const pillages = s.expeditions[v.id]?.pillages ?? 0
          const statut = statutDe(s, v.id)
          const fiche = STATUTS[statut]
          const allie = !!s.alliances[v.id]
          const bloque = allie || (v.maritime && merFermee(s))
          return (
            <div key={v.id} className={`bl-choix${bloque ? ' bloquee' : ''}`}>
              <span className="bl-emoji">{v.emoji}</span>
              <div className="bl-choix-corps">
                <div className="bl-nom">
                  {v.nom}{' '}
                  <span className="badge-statut" style={{ color: fiche.couleur, borderColor: `${fiche.couleur}66` }}>
                    {fiche.emoji} {fiche.nom}
                  </span>
                </div>
                <div className="bl-sous">
                  Puissance ≈ {puissanceEffective(v, pillages)} · 🧱 niveau {v.mur}
                  {pillages > 0 && ` · ${pillages} pillage${pillages > 1 ? 's' : ''} encaissé${pillages > 1 ? 's' : ''} - garnison renforcée`}
                  {v.maritime && ' · outre-mer : il faut des coques libres'}
                </div>
                {/*
                  LA FOURCHETTE DE LA RANÇON, avec les icônes du jeu et non le nom
                  interne des ressources : « 434–620 bois » se lisait comme une
                  chaîne de débogage au milieu d'un panneau qui compte partout en
                  🌾 et 🪙, et le joueur ne rapproche pas de lui-même deux unités
                  écrites de deux façons.
                */}
                <div className="bl-sous">
                  Rançon d’une reddition :{' '}
                  {(Object.entries(v.butin) as [ResourceId, number][])
                    .map(([r, n]) => `${Math.round(n * RANCON_MIN)}–${n} ${RES[r].emoji}`)
                    .join(' · ')}
                </div>
              </div>
              <button disabled={bloque} onClick={() => setCible(v.id)}>
                ⛓️ Fermer la place
              </button>
              {allie && <div className="bl-motif">Votre allié. Rompez le pacte d’abord.</div>}
            </div>
          )
        })}
      </>
    </Modale>
  )
}
