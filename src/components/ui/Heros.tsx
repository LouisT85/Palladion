import {
  HEROS,
  HERO_IDS,
  NIVEAU_MAX,
  attenteNoeud,
  forceNiveau,
  peutMonter,
  xpRequise,
  type HeroId,
} from '../../game/heros'
import { conditionsHeros, entretienHeros, fmtDuree, herosDisponible, peutPayer, useGame } from '../../game/store'
import type { Cost, ResourceId } from '../../game/types'
import { Montant } from './Icones'
import { Astuce, Infobulle } from './Infobulle'
import { Modale } from './Modale'

/*
 * Les héros ne sont pas une collection : ce sont des hôtes exigeants. Ce panneau
 * doit donc montrer, dans l'ordre, ce qu'ils APPORTENT, ce qu'ils COÛTENT, et où
 * ils en sont de leur histoire - y compris quand elle s'est mal terminée.
 */

/** coût en pictogrammes peints - jamais d'émoji dans une fiche de héros */
function Cout({ c, taille = 14 }: { c: Cost; taille?: number }) {
  return (
    <>
      {(Object.entries(c) as [ResourceId, number][]).map(([r, n]) => (
        <Montant key={r} n={n} id={r} taille={taille} />
      ))}
    </>
  )
}

/** ce qu'un héros coûte chaque minute : grain sur la table, honneurs à l'autel */
function Entretien({ h }: { h: HeroId }) {
  const e = HEROS[h].entretien
  if (!e.grain && !e.faveur) return <>aucun</>
  return (
    <>
      {e.grain ? (
        <>
          <Montant n={e.grain} id="grain" taille={13} />
          /min{' '}
        </>
      ) : null}
      {e.faveur ? (
        <>
          <Montant n={e.faveur} id="faveur" taille={13} />
          /min
        </>
      ) : null}
    </>
  )
}

/** cinq lauriers : pleins jusqu'au niveau atteint, barrés au-delà du plafond */
function Niveaux({ niveau, plafond }: { niveau: number; plafond: number }) {
  return (
    <Astuce
      titre={`⭐ Niveau ${niveau} sur ${NIVEAU_MAX}`}
      resume="Un héros monte en assistant aux assauts repoussés et en marchant en expédition. Chaque niveau renforce son passif, sa capacité et ce qu’il vaut au corps à corps."
      note={
        plafond < NIVEAU_MAX
          ? `Son arc l’a brisé : il ne dépassera plus le niveau ${plafond}. Les lauriers barrés sont ceux qu’il ne portera jamais.`
          : undefined
      }
    >
      <span className="heros-niveaux">
        {Array.from({ length: NIVEAU_MAX }, (_, i) => (
          <span key={i} className={i < niveau ? 'plein' : i < plafond ? 'vide' : 'barre'}>
            {i < plafond ? '★' : '·'}
          </span>
        ))}
      </span>
    </Astuce>
  )
}

/** boutons d'appel des héros pendant une bataille - à côté de ceux des dieux */
export function HerosRapides() {
  const heros = useGame((s) => s.heros)
  const faveur = useGame((s) => s.faveur)
  const now = useGame((s) => s.lastSeen)
  const capacite = useGame((s) => s.capaciteHeros)

  const dispo = HERO_IDS.filter((h) => heros[h]?.recrute && !heros[h].mort && HEROS[h].capacite.batailleUniquement)
  if (dispo.length === 0) return null

  return (
    <div className="dieux-rapides heros-rapides">
      {dispo.map((h) => {
        const def = HEROS[h]
        const e = heros[h]
        const cd = Math.max(0, e.cooldownUntil - now)
        const boude = e.boudeJusqua > now
        return (
          <Astuce
            key={h}
            titre={`${def.emoji} ${def.capacite.nom}`}
            resume={def.capacite.desc}
            lignes={[
              { label: 'Coût', valeur: `${def.capacite.cout} ✨`, fort: faveur >= def.capacite.cout },
              { label: 'Niveau', valeur: `${e.niveau} · puissance ×${forceNiveau(e.niveau).toFixed(1)}` },
              ...(cd > 0 ? [{ label: 'Prêt dans', valeur: `${Math.ceil(cd / 1000)} s` }] : []),
            ]}
            note={boude ? `${def.nom} boude sous sa tente : sa capacité est indisponible.` : undefined}
          >
            <button
              disabled={faveur < def.capacite.cout || cd > 0 || boude}
              onClick={() => capacite(h)}
              style={{ borderColor: `${def.couleur}88` }}
            >
              {def.emoji} {boude ? '😤' : cd > 0 ? `${Math.ceil(cd / 1000)}s` : `${def.capacite.cout}✨`}
            </button>
          </Astuce>
        )
      })}
    </div>
  )
}

export function PanneauHeros() {
  const s = useGame()
  const now = s.lastSeen
  const ent = entretienHeros(s)

  const vivants = HERO_IDS.filter((h) => s.heros[h]?.recrute && !s.heros[h].mort)
  const morts = HERO_IDS.filter((h) => s.heros[h]?.mort)
  const libres = HERO_IDS.filter((h) => !s.heros[h]?.recrute && !s.heros[h]?.mort)

  const carte = (h: HeroId) => {
    const def = HEROS[h]
    const e = s.heros[h]
    const dispo = herosDisponible(s, h)
    const conds = conditionsHeros(s, h)
    const cd = Math.max(0, e.cooldownUntil - now)
    const boude = e.boudeJusqua > now
    const seuil = xpRequise(def, e.niveau)
    const progresse = peutMonter(e)
    const etapes = def.arc.length
    const attente = e.recrute && !e.mort ? attenteNoeud(e, now) : 0

    return (
      <div key={h} className={`heros-carte${e.mort ? ' mort' : ''}${!e.recrute && !dispo ? ' verrouille' : ''}`}>
        <div className="heros-embleme" style={{ background: `${def.couleur}22`, borderColor: `${def.couleur}66` }}>
          <span>{def.emoji}</span>
          {e.recrute && !e.mort && <Niveaux niveau={e.niveau} plafond={e.plafond} />}
        </div>
        <div className="heros-corps">
          <div className="heros-titre">
            <h3 style={{ color: def.couleur }}>{def.nom}</h3>
            <span className="heros-sous">{def.titre}</span>
          </div>
          <p className="heros-desc">{def.desc}</p>

          {e.mort ? (
            <div className="heros-epitaphe">
              💀 Tombé au niveau {e.niveau}. Les aèdes le chantent encore ; il ne défendra plus rien.
            </div>
          ) : e.recrute ? (
            <>
              <div className="heros-ligne">
                <b>Passif</b> - {def.passif.desc}
              </div>
              <div className="heros-ligne">
                <b>
                  {def.capacite.emoji} {def.capacite.nom}
                </b>{' '}
                - {def.capacite.desc}
                <span className="heros-force"> (puissance ×{forceNiveau(e.niveau).toFixed(1)})</span>
              </div>
              {progresse ? (
                <Astuce
                  titre="⭐ Expérience"
                  resume="Un héros apprend en servant : chaque assaut repoussé et chaque expédition le rapprochent du niveau suivant."
                  lignes={[{ label: 'Vers le niveau ' + (e.niveau + 1), valeur: `${Math.floor(e.xp)} / ${seuil}`, fort: true }]}
                >
                  <div className="heros-xp">
                    <div style={{ width: `${Math.min(100, (e.xp / seuil) * 100)}%`, background: def.couleur }} />
                  </div>
                </Astuce>
              ) : (
                <div className="heros-ligne heros-plafond">
                  {e.plafond < NIVEAU_MAX
                    ? `⛔ Son arc l’a brisé : il ne dépassera pas le niveau ${e.plafond}.`
                    : '🏅 Au sommet de sa légende.'}
                </div>
              )}
              <div className="heros-pied">
                <Astuce
                  titre="🍖 Entretien"
                  resume="Prélevé en continu sur vos réserves, chaque minute qu’il passe à votre table. Greniers vides et autels muets : trois rappels sans réponse et il reprend la route."
                  note="La grâce « Entretien des braves » d’Arès en retranche les deux cinquièmes."
                >
                  <span className="heros-entretien">
                    🍖 <Entretien h={h} />
                  </span>
                </Astuce>
                {/* on dit QUAND vient le prochain dilemme : son histoire ne doit
                    plus se dérouler dans le dos du joueur */}
                <Infobulle
                  className="heros-arc"
                  titre={`📜 L’arc de ${def.nom}`}
                  resume={
                    attente > 0
                      ? `Son prochain dilemme s’ouvrira dans ${fmtDuree(attente)}. Un héros a le temps de servir avant que son histoire ne le rattrape.`
                      : e.arc >= etapes
                        ? 'Son histoire est écrite jusqu’au bout : plus rien ne l’attend.'
                        : 'Son prochain dilemme peut s’ouvrir à tout moment - dès qu’il aura le niveau requis.'
                  }
                >
                  📜 arc {Math.min(e.arc, etapes)}/{etapes}
                  {attente > 0 && <span className="heros-attente"> · {fmtDuree(attente)}</span>}
                </Infobulle>
                <Astuce
                  titre={`${def.capacite.emoji} ${def.capacite.nom}`}
                  resume={def.capacite.desc}
                  note={
                    boude
                      ? `${def.nom} boude : rien à en tirer avant ${fmtDuree(e.boudeJusqua - now)}.`
                      : def.capacite.batailleUniquement && !s.battle && !s.expedition
                        ? 'Ne s’invoque qu’en bataille.'
                        : s.faveur < def.capacite.cout
                          ? `Il vous manque ${Math.ceil(def.capacite.cout - s.faveur)} de faveur.`
                          : undefined
                  }
                >
                  <button
                    className="principal"
                    disabled={s.faveur < def.capacite.cout || cd > 0 || boude || (def.capacite.batailleUniquement && !s.battle && !s.expedition)}
                    onClick={() => s.capaciteHeros(h)}
                  >
                    {boude
                      ? `😤 boude ${fmtDuree(e.boudeJusqua - now)}`
                      : cd > 0
                        ? `⏳ ${fmtDuree(cd)}`
                        : `${def.capacite.emoji} Appeler (${def.capacite.cout} ✨)`}
                  </button>
                </Astuce>
              </div>
            </>
          ) : (
            <>
              <div className="heros-ligne">
                <b>Passif</b> - {def.passif.desc}
              </div>
              <div className="heros-ligne">
                <b>
                  {def.capacite.emoji} {def.capacite.nom}
                </b>{' '}
                - {def.capacite.desc}
              </div>
              <div className="heros-conds">
                {conds.map((c, i) => (
                  <span key={i} className={c.ok ? 'ok' : 'ko'}>
                    {c.ok ? '✔' : '✘'} {c.txt}
                  </span>
                ))}
              </div>
              <div className="heros-pied">
                <span className="heros-entretien">🎁 <Cout c={def.coutRecrutement} /></span>
                <span className="heros-entretien">🍖 <Entretien h={h} /></span>
                <button
                  className="principal"
                  disabled={!dispo || !peutPayer(s.resources, def.coutRecrutement)}
                  onClick={() => s.recruterHeros(h)}
                >
                  {dispo ? 'Le prendre à son service' : 'Il ne viendra pas encore'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <Modale
      titre="🛡️ Les héros de la matière troyenne"
      dataTuto="modale-heros"
      large
      onFermer={() => s.openPanel(null)}
      sous="Ils ne s’achètent pas : ils viennent quand la cité en est digne, exigent des honneurs chaque minute, gagnent des niveaux en combattant - et traversent une histoire dont certaines fins sont sans retour."
    >
      <>
        {(ent.grain > 0 || ent.faveur > 0) && (
          <div style={{ fontSize: 12.5, color: '#e0bc5c', marginTop: 6 }}>
            🍖 Entretien de la maisonnée : {ent.grain > 0 ? `${ent.grain.toFixed(1)} 🌾/min` : ''}
            {ent.grain > 0 && ent.faveur > 0 ? ' + ' : ''}
            {ent.faveur > 0 ? `${ent.faveur.toFixed(2)} ✨/min` : ''} - trois rappels sans réponse et ils s’en vont.
          </div>
        )}

        {vivants.length > 0 && <h3 className="heros-section">À votre service</h3>}
        {vivants.map(carte)}
        {libres.length > 0 && <h3 className="heros-section">Ceux qu’on pourrait convaincre</h3>}
        {libres.map(carte)}
        {morts.length > 0 && <h3 className="heros-section">Mémorial</h3>}
        {morts.map(carte)}
      </>
    </Modale>
  )
}

/** un héros attend votre parole : le nœud d'arc, joué comme un dilemme */
export function ModaleArcHeros() {
  const s = useGame()
  if (!s.arcHeros) return null
  const def = HEROS[s.arcHeros.heros]
  const noeud = def.arc.find((n) => n.id === s.arcHeros!.noeud)
  if (!noeud) return null

  return (
    <div className="voile">
      <div className="modale parchemin">
        <h2>
          {noeud.emoji} {noeud.titre}
        </h2>
        <div style={{ fontSize: 12.5, color: '#7a5f38', marginTop: -4, marginBottom: 8 }}>
          {def.emoji} {def.nom} - {def.titre} · niveau {s.heros[s.arcHeros.heros].niveau}
        </div>
        {s.arcIssue ? (
          <div className="issue">
            {s.arcIssue.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
            <button className="principal" style={{ width: '100%', marginTop: 12 }} onClick={() => s.fermerArc()}>
              Continuer
            </button>
          </div>
        ) : (
          <>
            <div className="recit">{noeud.texte}</div>
            <div className="choix">
              {noeud.options.map((o, i) => (
                <button
                  key={i}
                  style={{ width: '100%' }}
                  disabled={!!o.cout && !peutPayer(s.resources, o.cout)}
                  onClick={() => s.choisirArc(i)}
                >
                  {o.label}
                  {o.cout ? (
                    <>
                      {' - '}
                      <Cout c={o.cout} taille={13} />
                    </>
                  ) : null}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: '#8c7a55', marginTop: 10, fontStyle: 'italic' }}>
              Ce choix ferme une porte : l’arc d’un héros ne se rejoue pas.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
