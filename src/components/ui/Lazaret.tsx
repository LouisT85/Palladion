import { BUILDINGS, METIERS, RES } from '../../game/data'
import { ageDe, motAge } from '../../game/lignees'
import {
  GRAIN_PAR_LIT,
  JOURS_FIEVRE,
  JOURS_MAX,
  LAZARET_MAX,
  REPIT_JOURS,
  RISQUE_ENTREE_MAX,
  SOUCHES,
  TEMPLE_LAZARET,
  coutLazaret,
  epidemieActive,
  estGueri,
  etatSanitaire,
  hygiene,
  joursDeFievre,
  litsLibres,
  litsOccupes,
  litsTotal,
  malades,
  motifAliter,
  pronostic,
  refusAliter,
  resumeEpidemie,
  soinDe,
  type Habitant,
  type SnapEpidemie,
} from '../../game/epidemies'
import { peutPayer, snapEpidemie, useGame } from '../../game/store'
import type { ResourceId } from '../../game/types'
import { Icone } from './Icones'
import { Modale } from './Modale'

/*
 * ═══════════════════════ LE LAZARET ═══════════════════════
 *
 * Trois choses, dans cet ordre, et l'ordre est le sujet du panneau.
 *
 *  1. L'ÉTAT SANITAIRE, MÊME QUAND PERSONNE N'EST MALADE. C'est la seule pièce
 *     qui transforme « subir un tirage » en « avoir été averti » : le joueur y
 *     lit son entassement, sa saison et ses greniers, avec les causes nommées et
 *     dans l'ordre où il peut y remédier. Un panneau qui ne s'ouvrirait qu'en
 *     temps d'épidémie n'aurait rien enseigné avant le premier bûcher.
 *  2. LES LITS, et ce qu'ils coûtent. Pas un compteur : un prix en grain par
 *     journée, affiché en clair, parce que c'est lui qui empêche d'aliter tout le
 *     monde le jour où l'on a enfin des lits.
 *  3. LE TRIAGE. Chaque malade avec son NOM, sa maison, son âge, son métier, sa
 *     journée de fièvre et son pronostic - puis un bouton qui dit ce qu'il
 *     COÛTE (« il ne rendra plus rien à la forge ») et non ce qu'il fait. Sans
 *     le métier sous les yeux, coucher quelqu'un serait un clic ; avec lui,
 *     c'est un arbitrage.
 *
 * AUCUN BOUTON NOUVEAU DANS LA BARRE DU HAUT : elle en compte déjà dix et la
 * navigation a été jugée peu fluide. On entre par le TEMPLE (les prêtres sont
 * les soignants, et c'est là qu'on ouvre le lazaret) et par le RECENSEMENT
 * (les malades SONT les habitants de cette liste).
 *
 * ⚠️ CHAQUE REFUS PORTE SON MOTIF (`refusAliter` / `motifAliter`). Un bouton
 * éteint sans raison affichée est la première cause d'abandon d'un panneau ici.
 */

// ── Petites pièces communes ──────────────────────────────────────────────────

function LigneRessources({ cout, resources }: { cout: Partial<Record<ResourceId, number>>; resources: Record<ResourceId, number> }) {
  return (
    <div className="laz-cout">
      {(Object.entries(cout) as [ResourceId, number][]).map(([r, n]) => (
        <span key={r} className={resources[r] >= n ? 'laz-ok' : 'laz-ko'}>
          <Icone id={r} taille={14} /> {n}
        </span>
      ))}
    </div>
  )
}

/** la jauge du risque : elle DIT la probabilité réelle, elle ne décore pas */
function JaugeSanitaire({ snap }: { snap: SnapEpidemie }) {
  const etat = etatSanitaire(snap)
  // normalisée sur le risque maximal atteignable, sinon la jauge resterait plate
  const part = Math.max(0.02, Math.min(1, etat.risque / RISQUE_ENTREE_MAX))
  return (
    <div className={`laz-sanitaire ${etat.cle}`}>
      <div className="laz-sanitaire-tete">
        <span>🩺 État sanitaire — {etat.mot}</span>
        <span className="laz-sanitaire-chiffre">
          {etat.risque <= 0.0005 ? 'aucun foyer possible' : `${(etat.risque * 100).toFixed(1)} % par journée`}
        </span>
      </div>
      <div className="laz-jauge">
        <div className="laz-jauge-plein" style={{ width: `${Math.round(part * 100)}%` }} />
      </div>
      <ul className="laz-causes">
        {etat.causes.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
      <div className="laz-note">
        Une fièvre entre aussi par un convoi rentré de Troade, par une colonne revenue chargée de butin, ou par les
        morts laissés devant la muraille. L’hygiène du village pèse sur ces trois portes autant que sur celle-ci.
      </div>
    </div>
  )
}

/** le lazaret lui-même : niveau, lits, soin, prix du prochain cran */
function BlocMurs({ snap }: { snap: SnapEpidemie }) {
  const s = useGame()
  const niveau = s.lazaret ?? 0
  const cout = coutLazaret(niveau)
  const temple = s.buildings.temple.level
  const soin = soinDe(snap)
  return (
    <div className="laz-murs">
      <div className="laz-murs-tete">
        <span className="laz-emoji">⛺</span>
        <div>
          <div className="laz-nom">
            {niveau === 0 ? 'Aucun lazaret' : `Lazaret niveau ${niveau}`} — {litsTotal(niveau)} lit
            {litsTotal(niveau) > 1 ? 's' : ''}
          </div>
          <div className="laz-sous">
            Un enclos de branches à trois cents pas des murs, où l’on porte l’eau au bout d’une perche.
          </div>
        </div>
      </div>
      {niveau > 0 && (
        <ul className="laz-effets">
          <li>
            Soin dans un lit : <b>{Math.round(soin * 100)} %</b> de mortalité en moins (lazaret, {snap.soigneurs} prêtre
            {snap.soigneurs > 1 ? 's' : ''} de garde, découvertes du conseil)
          </li>
          <li>Contagion −{Math.round(hygiene(snap) * 100)} % dans tout le village : eau conduite, latrines à l’écart</li>
          <li>
            {GRAIN_PAR_LIT} 🌾 par lit occupé et par journée — bouillons, linges bouillis, feu entretenu
          </li>
        </ul>
      )}
      {snap.grain <= 0 && niveau > 0 && (
        <div className="laz-avertit">
          ⚠️ Les greniers sont vides : plus de bouillon, plus de linge bouilli. Les lits ne soignent plus personne.
        </div>
      )}
      {temple < TEMPLE_LAZARET ? (
        <div className="laz-motif">
          Il faut un temple de niveau {TEMPLE_LAZARET} : les purifications et les veilles sont l’affaire des prêtres.
        </div>
      ) : cout === null ? (
        <div className="laz-note">Le lazaret est achevé : dix lits, et de quoi veiller tout un quartier.</div>
      ) : (
        <>
          <LigneRessources cout={cout} resources={s.resources} />
          <button
            className="principal"
            style={{ width: '100%' }}
            disabled={!peutPayer(s.resources, cout) || s.battle !== null}
            onClick={() => s.batirLazaret()}
          >
            {niveau === 0 ? 'Ouvrir un lazaret' : `Agrandir → ${litsTotal(niveau + 1)} lits`}
          </button>
          {!peutPayer(s.resources, cout) && (
            <div className="laz-motif">
              Il y manque{' '}
              {(Object.entries(cout) as [ResourceId, number][])
                .filter(([r, n]) => s.resources[r] < n)
                .map(([r, n]) => `${Math.ceil(n - s.resources[r])} ${RES[r].nom.toLowerCase()}`)
                .join(', ')}
              .
            </div>
          )}
          {niveau === 0 && (
            <div className="laz-note">
              Le prix d’une tour d’archers. C’est bien contre elle que ce choix se fait : des murs, ou des lits.
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** une fiche de malade : tout ce qu'il faut savoir AVANT de disposer d'un lit */
function FicheMalade({ v, snap }: { v: Habitant; snap: SnapEpidemie }) {
  const s = useGame()
  const jours = joursDeFievre(v, snap.jour)
  const alite = v.malade!.alite
  const refus = alite ? null : refusAliter(snap, v.id)
  const metier = METIERS[v.metier] ?? BUILDINGS[v.metier].nom
  const poste = v.poste ? BUILDINGS[v.poste].nom : null
  return (
    <div className={`laz-fiche${alite ? ' couche' : ''}`}>
      <div className="laz-fiche-tete">
        <div>
          <div className="laz-nom">
            {v.nom} des {v.lignee ?? 'sans maison'}
          </div>
          <div className="laz-sous">
            {motAge(ageDe(v, snap.jour))} · {metier}
            {poste ? ` à ${poste.toLowerCase()}` : ' sans emploi'}
          </div>
        </div>
        <span className="laz-jours">
          {jours === 0 ? 'pris ce matin' : `${jours}ᵉ journée de fièvre / ${JOURS_FIEVRE}`}
        </span>
      </div>
      <div className={`laz-pronostic${alite ? ' soigne' : ''}`}>
        {alite ? '🛏️ Couché et veillé' : '🚶 Debout à son poste'} — {pronostic(v, snap)}
        {/*
          PRIS CE MATIN : il ne peut PAS mourir aujourd'hui, et il faut le dire.
          Sans cette incise, un pronostic « il peut ne pas voir demain » lu le
          jour même faisait croire que la décision était déjà perdue, et le joueur
          couchait au hasard le premier nom de la liste au lieu de choisir.
        */}
        {jours === 0 && ' — mais pas aujourd’hui : la fièvre incube, vous avez la journée pour décider'}
      </div>
      <div className="laz-effet">
        {alite
          ? `Il ne rend plus rien${poste ? ` à ${poste.toLowerCase()}` : ''}, et il ne contamine plus personne.`
          : `Il rend un tiers${poste ? ` à ${poste.toLowerCase()}` : ''} — et il donne la fièvre à d’autres chaque journée.`}
      </div>
      <button
        style={{ width: '100%' }}
        disabled={refus !== null}
        onClick={() => s.aliter(v.id, !alite)}
      >
        {alite
          ? `Le renvoyer au travail${poste ? ` (${poste.toLowerCase()})` : ''}`
          : `Le coucher au lazaret${poste ? ` — plus rien de ${poste.toLowerCase()}` : ''}`}
      </button>
      {refus !== null && <div className="laz-motif">{motifAliter(refus)}</div>}
    </div>
  )
}

/** ce que la fièvre en cours a déjà fait, et ce qu'il en reste à craindre */
function BlocFievreEnCours({ snap }: { snap: SnapEpidemie }) {
  const e = snap.epidemie!
  const def = SOUCHES[e.souche]
  const liste = malades(snap.villageois)
  const debout = liste.filter((v) => !v.malade!.alite).length
  const reste = Math.max(0, JOURS_MAX - (snap.jour - e.jourEntree))
  const releves = snap.villageois.filter(estGueri).length
  return (
    <div className="laz-fievre">
      <div className="laz-fievre-tete">
        <span className="laz-emoji">{def.emoji}</span>
        <div>
          <div className="laz-nom">{def.nom}</div>
          <div className="laz-sous">Entrée par {def.porte}.</div>
        </div>
      </div>
      <div className="laz-compteurs">
        <span>
          <b>{liste.length}</b> malade{liste.length > 1 ? 's' : ''}
        </span>
        <span className={debout > 0 ? 'laz-alerte' : ''}>
          <b>{debout}</b> debout — {debout > 0 ? 'ils la donnent encore' : 'plus un contagieux'}
        </span>
        <span>
          <b>
            {litsOccupes(snap.villageois)}/{litsTotal(snap.lazaret)}
          </b>{' '}
          lits ({litsLibres(snap)} libre{litsLibres(snap) > 1 ? 's' : ''})
        </span>
        <span>
          <b>{e.morts}</b> mort{e.morts > 1 ? 's' : ''} · <b>{releves}</b> relevé{releves > 1 ? 's' : ''}
        </span>
      </div>
      <div className="laz-note">
        Elle tombera d’elle-même dans {reste} journée{reste > 1 ? 's' : ''} au plus. Chaque malade se relève après{' '}
        {JOURS_FIEVRE} journées de fièvre — s’il les passe. Un relevé ne peut plus être repris.
        {litsOccupes(snap.villageois) > 0 && (
          <>
            {' '}
            Les lits occupés coûtent {litsOccupes(snap.villageois) * GRAIN_PAR_LIT} 🌾 par journée.
          </>
        )}
      </div>
      {liste.length === 0 ? (
        <div className="laz-note">Plus un malade : la fièvre s’éteint à la prochaine journée.</div>
      ) : (
        <div className="laz-fiches">
          {[...liste]
            // les plus menacés d'abord : c'est l'ordre dans lequel on décide
            .sort((a, b) => joursDeFievre(b, snap.jour) - joursDeFievre(a, snap.jour))
            .map((v) => (
              <FicheMalade key={v.id} v={v} snap={snap} />
            ))}
        </div>
      )}
    </div>
  )
}

/** la fièvre d'avant : ce qu'elle a pris, et pour combien de temps le village est tranquille */
function BlocMemoire({ snap }: { snap: SnapEpidemie }) {
  const e = snap.epidemie
  if (!e || e.finLe === undefined) return null
  const repit = Math.max(0, REPIT_JOURS - (snap.jour - e.finLe))
  return (
    <div className="laz-memoire">
      {resumeEpidemie(e, snap.jour).map((l, i) => (
        <div key={i}>{l}</div>
      ))}
      {repit > 0 && (
        <div className="laz-note">
          Les relevés gardent le mal en mémoire : aucune fièvre ne peut entrer avant {repit} journée
          {repit > 1 ? 's' : ''}.
        </div>
      )}
    </div>
  )
}

export function PanneauLazaret({ onFermer }: { onFermer: () => void }) {
  const s = useGame()
  const snap = snapEpidemie(s)
  const active = epidemieActive(s.epidemie)
  return (
    <Modale
      titre="⛺ Le lazaret"
      onFermer={onFermer}
      sous={
        active
          ? 'Il y a plus de malades que de lits : décidez qui l’on couche, et de quel métier le village se passe le temps de la fièvre.'
          : 'De quoi voir venir la fièvre, la ralentir, et coucher ceux qu’elle prendra. Un lit sauve un homme et retire un contagieux de la rue.'
      }
    >
      <div className="lazaret">
        {active ? <BlocFievreEnCours snap={snap} /> : <JaugeSanitaire snap={snap} />}
        <BlocMurs snap={snap} />
        {!active && <BlocMemoire snap={snap} />}
      </div>
    </Modale>
  )
}

/**
 * LE BLOC DU TEMPLE. Le libellé porte la fièvre en cours quand il y en a une :
 * sans cela, rien depuis la carte ne disait qu'il y avait des malades, et le
 * joueur découvrait l'épidémie en lisant l'avis de décès.
 */
export function BlocLazaret() {
  const s = useGame()
  const snap = snapEpidemie(s)
  const active = epidemieActive(s.epidemie)
  const nb = malades(snap.villageois).length
  const etat = etatSanitaire(snap)
  return (
    <div className="bloc">
      <h3>⛺ Santé du village</h3>
      <div className="desc" style={{ fontSize: 12 }}>
        Les prêtres tiennent les purifications, les veilles et les linges. C’est ici qu’on ouvre un lazaret — avant
        d’en avoir besoin, sinon il ne sert qu’à la fièvre suivante.
      </div>
      <div className="laz-resume">
        {active ? (
          <span className="laz-alerte">
            {SOUCHES[s.epidemie!.souche].emoji} {nb} malade{nb > 1 ? 's' : ''} · {litsOccupes(snap.villageois)}/
            {litsTotal(snap.lazaret)} lits
          </span>
        ) : (
          <span>
            🩺 État sanitaire : <b>{etat.mot}</b> · lazaret {s.lazaret ?? 0}/{LAZARET_MAX} ({litsTotal(s.lazaret ?? 0)}{' '}
            lits)
          </span>
        )}
      </div>
      <button
        className={active ? 'principal' : undefined}
        style={{ width: '100%', marginTop: 6 }}
        onClick={() => s.openPanel('lazaret')}
      >
        {active ? `${SOUCHES[s.epidemie!.souche].emoji} Trier les malades` : '⛺ Ouvrir le lazaret'}
      </button>
    </div>
  )
}

/**
 * LE BLOC DU RECENSEMENT. Les malades SONT les habitants de cette liste, et
 * c'est là que le joueur regarde quand il cherche qui tient quel poste : la
 * fièvre doit s'y voir, sans quoi elle se découvre trop tard.
 */
export function BlocFievre() {
  const s = useGame()
  if (!epidemieActive(s.epidemie)) return null
  const snap = snapEpidemie(s)
  const liste = malades(snap.villageois)
  const debout = liste.filter((v) => !v.malade!.alite)
  const def = SOUCHES[s.epidemie!.souche]
  return (
    <div className="bloc laz-recensement">
      <h3>
        {def.emoji} {def.nom} — {liste.length} malade{liste.length > 1 ? 's' : ''}
      </h3>
      <div className="laz-note" style={{ marginTop: 0 }}>
        Un fiévreux debout ne rend qu’un tiers à son poste et contamine ses voisins ; couché au lazaret il ne rend plus
        rien du tout, mais il vit plus souvent et ne donne plus la fièvre.
      </div>
      <ul className="laz-liste">
        {liste.map((v) => (
          <li key={v.id}>
            <span className={v.malade!.alite ? 'laz-couche' : 'laz-alerte'}>{v.malade!.alite ? '🛏️' : '🚶'}</span>{' '}
            {v.nom} — {v.poste ? BUILDINGS[v.poste].nom.toLowerCase() : 'sans emploi'} · {pronostic(v, snap)}
          </li>
        ))}
      </ul>
      <button
        className="principal"
        style={{ width: '100%', marginTop: 6 }}
        onClick={() => s.openPanel('lazaret')}
      >
        ⛺ Trier les malades ({debout.length} encore debout, {litsLibres(snap)} lit
        {litsLibres(snap) > 1 ? 's' : ''} libre{litsLibres(snap) > 1 ? 's' : ''})
      </button>
    </div>
  )
}
