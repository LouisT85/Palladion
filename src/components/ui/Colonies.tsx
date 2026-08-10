import { useMemo, useState } from 'react'
import {
  COLONIES_MAX,
  COLONS_MAX,
  COLONS_MIN,
  COUT_FONDATION,
  EPREUVES,
  LOYAUTE_REORIENTATION,
  LOYAUTE_REVOLTE,
  VOCATIONS,
  VOCATION_IDS,
  anciennete,
  attenteConvoi,
  cargaison,
  colonsDe,
  comptesMetier,
  coutSecours,
  explicationLoyaute,
  garnisonRequise,
  garnisonSuffisante,
  motLoyaute,
  motifRefusColonie,
  phraseSaignee,
  refusFondation,
  resumeCargaison,
  saignee,
  siteDe,
  sitesLibres,
  soldatsDetachables,
  soldatsSecours,
  type Colonie,
  type SiteColonie,
  type VocationId,
} from '../../game/colonies'
import { METIERS } from '../../game/data'
import { AGE_ADULTE, ageDe } from '../../game/lignees'
import { jourDe, peutPayer, useGame } from '../../game/store'
import type { ResourceId } from '../../game/types'
import { Montant } from './Icones'
import { Modale } from './Modale'

/*
 * ═══════════════════════ LE PANNEAU DES COLONIES ═══════════════════════
 *
 * Deux écrans dans un seul cadre, et ce n'est pas une économie de place : ce sont
 * les deux moments d'une colonie, et ils ne se ressemblent pas.
 *
 *  · FONDER. Un acte unique et irréversible. L'écran doit donc être un CONTRAT :
 *    la côte qu'on choisit, ce à quoi on la consacre, les noms qui montent sur la
 *    nef, et - en tête, en grand - LE DÉCOMPTE DES MÉTIERS QUE LE VILLAGE PERD.
 *    C'est la seule information que le joueur ne peut pas reconstituer de tête, et
 *    c'est le cœur émotionnel de la décision : « vous embarquez vos deux seuls
 *    tailleurs de pierre » arrête la main là où « 6 colons » ne l'arrête jamais.
 *
 *  · TENIR. Une colonie vivante n'offre AUCUN geste ordinaire - pas de
 *    construction, pas d'affectation. Quatre arbitrages rares, et rien d'autre :
 *    changer sa vocation (payé en loyauté), renforcer sa garnison (payé en
 *    soldats), répondre à un appel (payé cher), l'abandonner. Le reste de la carte
 *    est de la LECTURE : le convoi qui vient, ce qu'il portera, et la jauge de
 *    loyauté AVEC LA RAISON de sa dérive - une jauge qui bouge sans motif affiché
 *    est un bogue aux yeux du joueur.
 *
 * AUCUN BOUTON NOUVEAU DANS LA BARRE DU HAUT. Elle en compte déjà dix et la
 * navigation a déjà été jugée peu fluide : on entre ici par le PORT, qui est déjà
 * la porte du comptoir et des caravanes - une colonie se fonde par la mer, se
 * ravitaille par la mer, et retient une nef tant qu'elle vit.
 */

/*
 * UNE NEF LIBRE.
 *
 * `src/game/flotte.ts` s'écrit en même temps que ce fichier et n'est PAS importé
 * ici : deux modules qui s'importent l'un l'autre pendant qu'on les écrit se
 * détruisent. Cette fonction est le SEUL endroit à recâbler - l'orchestrateur y
 * met la lecture de la flotte, et tant qu'elle n'existe pas la mer est ouverte.
 */
function nefLibre(): boolean {
  return true
}

/** l'unité d'un chiffre en journées, écrite comme le reste du jeu */
function journees(n: number): string {
  return `${n} journée${n > 1 ? 's' : ''}`
}

/**
 * L'ancienneté, dite comme on la dirait. « fondée il y a 0 journée » s'affichait le
 * jour même de la fondation - un chiffre nul dans une phrase de récit se lit comme
 * un bogue, et c'est justement le moment où le joueur regarde sa colonie neuve.
 */
function ancienneteDite(n: number): string {
  return n === 0 ? 'fondée aujourd’hui' : `fondée il y a ${journees(n)}`
}

// ── Tenir une colonie ────────────────────────────────────────────────────────

/** la jauge de loyauté, et POURQUOI elle va dans ce sens */
function Loyaute({ c }: { c: Colonie }) {
  const part = Math.max(0, Math.min(1, c.loyaute / 100))
  const alerte = c.loyaute < LOYAUTE_REVOLTE + 15
  return (
    <div className={`col-loyaute${alerte ? ' alerte' : ''}`}>
      <div className="col-loyaute-tete">
        <span>Loyauté — {motLoyaute(c.loyaute)}</span>
        <span className="col-chiffre">{Math.round(c.loyaute)}/100</span>
      </div>
      <div className="col-jauge">
        <div className="col-jauge-plein" style={{ width: `${Math.round(part * 100)}%` }} />
        {/* le seuil de sécession, matérialisé : on doit le voir approcher */}
        <div className="col-jauge-seuil" style={{ left: `${LOYAUTE_REVOLTE}%` }} />
      </div>
      <ul className="col-raisons">
        {explicationLoyaute(c).map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  )
}

/** l'appel qui attend une réponse - avec son prix et son sursis */
function Epreuve({ c }: { c: Colonie }) {
  const s = useGame()
  const e = c.epreuve
  if (!e) return null
  const def = EPREUVES[e.id]
  const cout = coutSecours(e.id)
  const soldats = soldatsSecours(c)
  /*
   * `soldatsDetachables` et non `armeeTotale` : cette dernière compte les BÉLIERS
   * et les CHARS, qui ne tiennent aucune palissade. Un règne à six béliers et zéro
   * fantassin voyait donc ce bouton allumé, et le secours partait sans qu'un homme
   * quitte le village - le raid était couvert gratuitement.
   */
  const payable = def.soldats ? soldatsDetachables(s.army) >= soldats : peutPayer(s.resources, cout)
  return (
    <div className="col-epreuve">
      <div className="col-epreuve-tete">
        <span className="col-emoji">{def.emoji}</span>
        <div>
          <div className="col-nom">{def.nom}</div>
          <div className="col-sursis">
            {e.sursis <= 1 ? 'Dernière journée' : `Encore ${journees(e.sursis)}`} — puis{' '}
            {def.fatale ? 'la colonie est perdue' : 'la palissade tombe'}
          </div>
        </div>
      </div>
      <div className="col-recit">{def.recit}</div>
      <div className="col-demande">{def.demande}</div>
      <div className="col-prix">
        {def.soldats ? (
          <span className="col-soldats">
            {soldats} soldat{soldats > 1 ? 's' : ''} détaché{soldats > 1 ? 's' : ''} — ils resteront là-bas
          </span>
        ) : (
          (Object.keys(cout) as ResourceId[]).map((r) => <Montant key={r} n={-(cout[r] ?? 0)} id={r} taille={13} />)
        )}
      </div>
      <button
        className="principal"
        style={{ width: '100%' }}
        disabled={!payable}
        onClick={() => s.secourirColonie(c.site)}
      >
        Secourir {siteDe(c)?.nom ?? 'la colonie'}
      </button>
      {!payable && (
        <div className="col-motif">
          {def.soldats
            ? `Il faut ${soldats} homme(s) sous les armes à détacher.`
            : 'Vos greniers et vos coffres n’y suffisent pas.'}
        </div>
      )}
    </div>
  )
}

/** les quatre arbitrages, et rien d'autre */
function Arbitrages({ c }: { c: Colonie }) {
  const s = useGame()
  const [ouvert, setOuvert] = useState<'vocation' | 'garnison' | null>(null)
  const manque = Math.max(0, garnisonRequise(c) - c.garnison)
  // les engins ne tiennent pas une palissade : le compte affiché doit être celui
  // que `detacherSoldats` prendra vraiment, sinon « 2 soldats sur 8 » en détache 0
  const dispo = soldatsDetachables(s.army)
  const [n, setN] = useState(1)
  /*
   * ABANDONNER SE CONFIRME EN DEUX TEMPS, comme la merveille du règne
   * (`Progres.tsx`) et comme la remise à zéro. C'est le geste le plus destructeur
   * du panneau : quatre à huit habitants NOMMÉS cessent d'exister, et rien ne les
   * rend. Un bouton simple, collé entre « Réorienter » et « Renforcer », effaçait
   * une colonie de trente journées sur un clic mal visé, sans un mot.
   */
  const [confirmeAbandon, setConfirmeAbandon] = useState(false)
  return (
    <div className="col-arbitrages">
      <div className="col-boutons">
        <button onClick={() => setOuvert(ouvert === 'vocation' ? null : 'vocation')}>🧭 Réorienter</button>
        <button onClick={() => setOuvert(ouvert === 'garnison' ? null : 'garnison')}>🛡️ Renforcer</button>
        <button
          className="danger"
          onClick={() => (confirmeAbandon ? s.abandonnerColonie(c.site) : setConfirmeAbandon(true))}
        >
          {confirmeAbandon ? `Confirmer : ${colonsDe(c)} colons restent là-bas` : '🏳️ Abandonner'}
        </button>
      </div>
      {confirmeAbandon && (
        <div className="col-avertit">
          La garnison — {c.garnison} homme(s) — rembarque et reprend sa place dans vos rangs. Les {colonsDe(c)} colons
          restent : ils ont brûlé leurs nefs en arrivant. La population du village ne remontera pas d’un seul point.
          <button style={{ width: '100%', marginTop: 6 }} onClick={() => setConfirmeAbandon(false)}>
            Non, elle reste à nous
          </button>
        </div>
      )}

      {ouvert === 'vocation' && (
        <div className="col-volet">
          <div className="col-avertit">
            Arracher un homme à son sillon se paie en rancune : −{LOYAUTE_REORIENTATION} de loyauté, et le convoi en
            préparation est perdu. On ne réoriente pas deux fois par saison.
          </div>
          {VOCATION_IDS.filter((v) => v !== c.vocation).map((v) => {
            const def = VOCATIONS[v]
            const projet: Colonie = { ...c, vocation: v }
            const apres = cargaison(projet)
            const avant = cargaison(c)
            return (
              <button key={v} style={{ width: '100%', marginTop: 5 }} onClick={() => s.reorienterColonie(c.site, v)}>
                {def.emoji} {def.nom} — {resumeCargaison(apres.res, apres.n)} par convoi
                {apres.res === avant.res && apres.n < avant.n ? ' (moins qu’aujourd’hui)' : ''}
              </button>
            )
          })}
        </div>
      )}

      {ouvert === 'garnison' && (
        <div className="col-volet">
          <div className="col-avertit">
            Les hommes qu’on laisse là-bas ne défendent plus vos murs. Il en faut {garnisonRequise(c)} pour que la
            palissade tienne seule ; il y en a {c.garnison}.
          </div>
          <div className="col-compteur">
            <button disabled={n <= 1} onClick={() => setN(n - 1)}>
              −
            </button>
            <span>
              {n} soldat{n > 1 ? 's' : ''} sur {dispo}
            </span>
            <button disabled={n >= dispo} onClick={() => setN(n + 1)}>
              +
            </button>
          </div>
          <button
            className="principal"
            style={{ width: '100%', marginTop: 5 }}
            disabled={dispo < 1}
            onClick={() => s.renforcerColonie(c.site, n)}
          >
            Les détacher pour de bon{manque > 0 ? ` (${manque} manquent)` : ''}
          </button>
        </div>
      )}
    </div>
  )
}

function CarteColonie({ c }: { c: Colonie }) {
  const jour = useGame((s) => jourDe(s))
  const site = siteDe(c)
  if (!site) return null
  const voc = VOCATIONS[c.vocation]
  const carg = cargaison(c)
  const attente = attenteConvoi(c, jour)
  /*
   * `saignee` de la colonie sur elle-même : on ne cherche pas ici ce qu'un village
   * perd, seulement le DÉCOMPTE PAR MÉTIER des colons (« 2× Paysan »). Chaque ligne
   * en ressort donc avec `dernier: true` - c'est exact (la colonie n'a pas d'autre
   * paysan ailleurs) mais on ne lit que `part` et `nom` : ne pas se mettre à teinter
   * ces pastilles sur `dernier`, elles le seraient toutes.
   */
  const lignes = saignee(c.metiers, c.metiers)
  return (
    <div className={`col-carte${c.epreuve ? ' en-peril' : ''}`}>
      <div className="col-carte-tete">
        <span className="col-emoji">{site.emoji}</span>
        <div>
          <div className="col-nom">{site.nom}</div>
          <div className="col-sous">
            {voc.emoji} {voc.nom} · {colonsDe(c)} colons · {ancienneteDite(anciennete(c, jour))}
          </div>
        </div>
      </div>

      <div className="col-convoi">
        <span>
          {attente === 0 ? 'Le convoi est au quai' : `Prochain convoi dans ${journees(attente)}`}
        </span>
        <span className="col-chiffre">{resumeCargaison(carg.res, carg.n)}</span>
      </div>

      <div className="col-metiers">
        {lignes.map((l) => (
          <span key={l.metier} className="col-metier">
            {l.part}× {l.nom}
          </span>
        ))}
      </div>

      <div className={`col-garnison${garnisonSuffisante(c) ? '' : ' insuffisante'}`}>
        🛡️ Garnison {c.garnison}/{garnisonRequise(c)}
        {garnisonSuffisante(c) ? ' — un raid sera repoussé sans vous' : ' — la palissade ne tiendra pas seule'}
      </div>

      <Loyaute c={c} />
      <Epreuve c={c} />
      <Arbitrages c={c} />
    </div>
  )
}

// ── Fonder ───────────────────────────────────────────────────────────────────

/**
 * L'ÉCRAN DE FONDATION. Trois choix dans un ordre qui n'est pas décoratif : la
 * côte d'abord (elle fixe l'affinité et le nombre d'hommes à laisser), la
 * vocation ensuite (elle dit quels métiers valent la place sur la nef), les noms
 * en dernier - quand on sait enfin qui l'on cherche.
 */
function Fondation({ sites }: { sites: SiteColonie[] }) {
  const s = useGame()
  const jour = jourDe(s)
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '')
  const [vocation, setVocation] = useState<VocationId>('grenier')
  const [choisis, setChoisis] = useState<string[]>([])
  const [garnison, setGarnison] = useState(0)

  const site = sites.find((x) => x.id === siteId) ?? sites[0]
  /*
   * Seuls les ADULTES embarquent. Ce n'est pas une pudeur : un enfant de huit ans
   * ne tient pas une rame et ne rend rien à la carrière, et le laisser cocher
   * aurait fabriqué des colonies à quatre colons dont deux inutiles.
   */
  const embarquables = useMemo(
    () => s.villageois.filter((v) => ageDe(v, jour) >= AGE_ADULTE),
    [s.villageois, jour],
  )
  const partants = embarquables.filter((v) => choisis.includes(v.id))
  const metiers = partants.map((v) => v.metier)
  const lignes = saignee(
    s.villageois.map((v) => v.metier),
    metiers,
  )
  const phrase = phraseSaignee(lignes)

  const refus = refusFondation(
    { port: s.buildings.port.level, colonies: s.colonies ?? [], pop: s.pop, nefLibre: nefLibre() },
    site?.id ?? '',
    metiers,
  )
  const payable = peutPayer(s.resources, COUT_FONDATION)
  // ni bélier ni char : ce compteur doit promettre ce que `detacherSoldats` prendra
  const dispo = soldatsDetachables(s.army)

  function basculer(id: string) {
    setChoisis((l) => (l.includes(id) ? l.filter((x) => x !== id) : l.length >= COLONS_MAX ? l : [...l, id]))
  }

  if (!site) return null
  const voc = VOCATIONS[vocation]
  return (
    <div className="col-fondation">
      <div className="col-etape">
        <h3>1. La côte</h3>
        <div className="col-sites">
          {sites.map((x) => (
            <button
              key={x.id}
              className={`col-site${x.id === site.id ? ' actif' : ''}`}
              onClick={() => setSiteId(x.id)}
            >
              <span className="col-emoji">{x.emoji}</span>
              <span className="col-nom">{x.nom}</span>
              <span className="col-sous">
                {journees(x.journees)} de mer · {x.menace} hommes à laisser
              </span>
            </button>
          ))}
        </div>
        <div className="col-desc">{site.desc}</div>
      </div>

      <div className="col-etape">
        <h3>2. Ce à quoi elle se consacre</h3>
        <div className="col-vocations">
          {VOCATION_IDS.map((v) => {
            const d = VOCATIONS[v]
            const aff = site.affinites[v]
            return (
              <button
                key={v}
                className={`col-vocation${v === vocation ? ' actif' : ''}`}
                onClick={() => setVocation(v)}
              >
                <span className="col-nom">
                  {d.emoji} {d.nom}
                </span>
                <span className="col-sous">
                  Terre {aff >= 1.2 ? 'idéale' : aff >= 1 ? 'bonne' : aff >= 0.85 ? 'médiocre' : 'ingrate'} (
                  {Math.round(aff * 100)} %) · métier : {d.metiers.map((m) => METIERS[m] ?? m).join(', ')}
                </span>
              </button>
            )
          })}
        </div>
        <div className="col-desc">{voc.desc}</div>
      </div>

      <div className="col-etape">
        <h3>
          3. Qui monte sur la nef ({partants.length}/{COLONS_MAX})
        </h3>
        <div className="col-consigne">
          Ils ne reviendront pas. Choisissez {COLONS_MIN} à {COLONS_MAX} adultes — un colon dont le métier est celui de
          la colonie rend deux fois plus qu’un autre.
        </div>
        <div className="col-habitants">
          {embarquables.map((v) => {
            const pris = choisis.includes(v.id)
            const utile = voc.metiers.includes(v.metier)
            return (
              <button
                key={v.id}
                className={`col-habitant${pris ? ' pris' : ''}${utile ? ' utile' : ''}`}
                onClick={() => basculer(v.id)}
              >
                <span className="col-nom">{v.nom}</span>
                <span className="col-sous">
                  {METIERS[v.metier] ?? v.metier} · {ageDe(v, jour)} ans
                  {v.poste ? ' · à son poste' : ' · sans emploi'}
                  {v.conjoint ? ' · marié' : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/*
        LE DÉCOMPTE. Il est en bas parce qu'il ne peut se remplir qu'après les
        trois choix - mais c'est LUI qu'on relit avant de cliquer, et c'est pour
        cela qu'il est encadré et non glissé dans une ligne de texte.
      */}
      <div className={`col-contrat${phrase ? ' saigne' : ''}`}>
        <h3>Ce que le village perd</h3>
        {lignes.length === 0 ? (
          <div className="col-desc">Personne n’est encore monté sur la nef.</div>
        ) : (
          <>
            <ul className="col-saignee">
              {lignes.map((l) => (
                <li key={l.metier} className={l.dernier ? 'dernier' : ''}>
                  {comptesMetier(l.nom, l.part)} sur {l.avant} — il en restera {l.reste}
                  {l.dernier ? ' : plus un seul au village' : ''}
                </li>
              ))}
            </ul>
            {phrase && <div className="col-phrase">{phrase}</div>}
          </>
        )}
        <div className="col-prix">
          {(Object.keys(COUT_FONDATION) as ResourceId[]).map((r) => (
            <Montant key={r} n={-(COUT_FONDATION[r] ?? 0)} id={r} taille={13} />
          ))}
        </div>
        <div className="col-compteur">
          <span>Garnison laissée sur place</span>
          <button disabled={garnison <= 0} onClick={() => setGarnison(garnison - 1)}>
            −
          </button>
          <span>
            {garnison}/{site.menace}
          </span>
          <button disabled={garnison >= dispo} onClick={() => setGarnison(garnison + 1)}>
            +
          </button>
        </div>
        {garnison < site.menace && (
          <div className="col-avertit">
            Sous {site.menace} hommes, un raid ne sera pas repoussé et la colonie se sentira abandonnée : sa loyauté
            baissera chaque journée.
          </div>
        )}
        <button
          className="principal"
          style={{ width: '100%' }}
          disabled={refus !== null || !payable}
          onClick={() => s.fonderColonie(site.id, vocation, choisis, garnison)}
        >
          Fonder {site.nom}
        </button>
        {refus !== null && <div className="col-motif">{motifRefusColonie(refus)}</div>}
        {refus === null && !payable && (
          <div className="col-motif">Il faut une nef, ses agrès et les vivres de la première saison.</div>
        )}
      </div>
    </div>
  )
}

// ── Le cadre ─────────────────────────────────────────────────────────────────

export function PanneauColonies({ onFermer }: { onFermer: () => void }) {
  const colonies = useGame((s) => s.colonies) ?? []
  const [ongletFonder, setOngletFonder] = useState(colonies.length === 0)
  /*
   * FONDER FAIT BASCULER SUR LA COLONIE FONDÉE. Sans cela, le clic le plus lourd du
   * jeu ne changeait RIEN de visible dans le panneau : on restait sur le formulaire,
   * la côte choisie disparaissait simplement de la liste, et il fallait deviner qu'un
   * onglet portait désormais la colonie. Le reproche « la navigation n'est pas
   * fluide » naît exactement là. On ajuste l'onglet pendant le rendu plutôt que dans
   * un effet : rien n'est peint entre les deux, donc le formulaire ne clignote pas.
   */
  const [compte, setCompte] = useState(colonies.length)
  if (colonies.length !== compte) {
    if (colonies.length > compte) setOngletFonder(false)
    setCompte(colonies.length)
  }
  const libres = sitesLibres(colonies)
  return (
    <Modale
      titre="🏝️ Les colonies"
      onFermer={onFermer}
      large
      sous="Un second foyer outre-mer. Des habitants qui partent pour de bon, une nef qui ne revient plus, et quatre décisions par règne - pas une de plus."
    >
      <div className="colonies">
        <div className="col-onglets">
          <button className={ongletFonder ? '' : 'actif'} onClick={() => setOngletFonder(false)}>
            Vos colonies ({colonies.length})
          </button>
          <button
            className={ongletFonder ? 'actif' : ''}
            disabled={libres.length === 0}
            onClick={() => setOngletFonder(true)}
          >
            Fonder ({libres.length} côte{libres.length > 1 ? 's' : ''} libre{libres.length > 1 ? 's' : ''})
          </button>
        </div>

        {ongletFonder ? (
          libres.length === 0 ? (
            <div className="col-desc">Toutes les côtes que vos pilotes connaissent portent déjà votre étendard.</div>
          ) : (
            <Fondation sites={libres} />
          )
        ) : colonies.length === 0 ? (
          <div className="col-desc">
            Le règne n’a pas d’outre-mer. Une colonie ne se gère pas comme un village : elle envoie, elle réclame, et
            elle peut être perdue.
          </div>
        ) : (
          <div className="col-cartes">
            {colonies.map((c) => (
              <CarteColonie key={c.site} c={c} />
            ))}
          </div>
        )}
      </div>
    </Modale>
  )
}

/**
 * Le bloc du PORT : la porte d'entrée. Il porte l'état le plus urgent - un appel
 * au secours - dans son libellé, sinon rien depuis la carte ne dirait qu'une
 * colonie est en train de mourir, et le joueur n'ouvrirait le panneau qu'après.
 */
export function BlocColonies() {
  const s = useGame()
  const colonies = s.colonies ?? []
  const enPeril = colonies.filter((c) => c.epreuve !== null).length
  return (
    <div className="bloc">
      <h3>🏝️ Outre-mer</h3>
      <div className="desc" style={{ fontSize: 12 }}>
        Fonder une colonie, c’est embarquer des habitants pour toujours. Elle envoie des convois, elle réclame des
        secours, et elle retient une nef tant qu’elle vit.
      </div>
      <button
        className={enPeril > 0 ? 'principal' : undefined}
        style={{ width: '100%', marginTop: 6 }}
        onClick={() => s.openPanel('colonies')}
      >
        {enPeril > 0
          ? `⚠️ ${enPeril} colonie${enPeril > 1 ? 's' : ''} appelle${enPeril > 1 ? 'nt' : ''} au secours`
          : `🏝️ Colonies (${colonies.length}/${COLONIES_MAX})`}
      </button>
    </div>
  )
}
