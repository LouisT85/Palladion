import { useState } from 'react'
import { EVENTS_BY_ID } from '../../game/events'
import { bonusHeros, peutPayer, useGame } from '../../game/store'
import { Modale } from './Modale'

export function ModaleEvenement() {
  const s = useGame()
  const ev = s.activeEvent
  if (!ev) return null
  const def = EVENTS_BY_ID[ev.defId]
  if (!def) return null
  // Athéna souffle la vérité à qui l'honore ; Cassandre la voit toute seule
  const sagesse = s.gods.athena.relation >= 25 || bonusHeros(s).revelerDilemmes

  return (
    <div className="voile">
      <div className="modale parchemin">
        <h2>
          {def.emoji} {def.titre}
        </h2>
        {s.eventOutcome ? (
          <div className="issue">
            {s.eventOutcome.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
            <button className="principal" style={{ width: '100%', marginTop: 12 }} onClick={() => s.fermerEvenement()}>
              Continuer
            </button>
          </div>
        ) : (
          <>
            <div className="recit">{def.texte}</div>
            <div className="choix">
              {def.choices.map((c, i) => {
                const coutOk = !c.cout || peutPayer(s.resources, c.cout)
                const reqOk = !c.requiert || c.requiert(s)
                const indice = sagesse && c.hint ? c.hint(ev.roll) : null
                return (
                  <div key={i}>
                    <button
                      style={{ width: '100%' }}
                      disabled={!coutOk || !reqOk}
                      onClick={() => s.choisirEvenement(i)}
                    >
                      {c.label}
                      {!reqOk && c.requiertLabel ? ` — ${c.requiertLabel}` : ''}
                    </button>
                    {indice && <div className="murmure">🦉 {indice}</div>}
                  </div>
                )
              })}
            </div>
            {!sagesse && def.choices.some((c) => c.hint) && (
              <div style={{ fontSize: 11.5, color: '#8c7a55', marginTop: 10, fontStyle: 'italic' }}>
                🦉 Avec la confiance d’Athéna (relation ≥ 25) — ou Cassandre à votre table — la vérité cachée de ce
                dilemme vous serait murmurée…
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TempsRelatif({ at, now }: { at: number; now: number }) {
  const min = Math.floor((now - at) / 60_000)
  return <span className="quand">{min < 1 ? 'à l’instant' : `il y a ${min} min`}</span>
}

export function ModaleJournal() {
  const s = useGame()
  return (
    <Modale
      titre="📜 Journal du village"
      onFermer={() => s.openPanel(null)}
      sous={`${s.stats.repousses} assaut(s) repoussé(s) · ${s.stats.perdus} pillage(s) subi(s) · ${s.stats.evenements} dilemme(s) tranché(s)`}
    >
      <>
        {s.reports.length === 0 && (
          <p style={{ color: '#93a7b4' }}>Rien à signaler pour l’instant. Les aèdes attendent vos exploits.</p>
        )}
        {s.reports.map((r) => (
          <div key={r.id} className="rapport">
            <TempsRelatif at={r.at} now={s.lastSeen} />
            <h4>
              {r.emoji} {r.titre}
            </h4>
            {r.lignes.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
        ))}
      </>
    </Modale>
  )
}

export function ModaleHorsLigne() {
  const s = useGame()
  if (!s.offlineSummary) return null
  return (
    <div className="voile">
      <div className="modale">
        <h2>🌙 Pendant votre absence…</h2>
        {s.offlineSummary.map((l, i) => (
          <p key={i} style={{ margin: '5px 0', color: i === 0 ? '#e8dcc0' : '#cfc4a8' }}>
            {l}
          </p>
        ))}
        <button className="principal" style={{ width: '100%', marginTop: 12 }} onClick={() => s.fermerOffline()}>
          Reprendre les rênes
        </button>
      </div>
    </div>
  )
}

export function ModaleRapportBataille() {
  const s = useGame()
  const r = s.battleReport
  if (!r) return null
  return (
    <div className="voile">
      <div className="modale">
        <h2>
          {r.emoji} {r.titre}
        </h2>
        {r.lignes.map((l, i) => (
          <p key={i} style={{ margin: '6px 0', color: '#cfc4a8', lineHeight: 1.5 }}>
            {l}
          </p>
        ))}
        <button className="principal" style={{ width: '100%', marginTop: 12 }} onClick={() => s.fermerBattleReport()}>
          {r.emoji === '🏆' ? 'Gloire au village !' : 'Panser les plaies'}
        </button>
      </div>
    </div>
  )
}

export function ModaleAide() {
  const s = useGame()
  const [confirmeReset, setConfirmeReset] = useState(false)
  return (
    <Modale
      titre="🏛️ PALLADION — survivre à l’ombre de Troie"
      onFermer={() => s.openPanel(null)}
      fermerTexte={null}
    >
      <>
        <div className="aide-section">
          <h3>Votre village</h3>
          <p>
            Le <i>Palladion</i> est la statue d’Athéna tombée du ciel : tant qu’elle se tient dans la cité, la cité ne
            peut pas tomber. Votre village est votre Palladion — la guerre fait rage sous les murs de Troie, et vous
            êtes sur la route des armées. Bâtissez, prospérez, survivez.{' '}
            <b>Chaque niveau de bâtiment change réellement son apparence</b> — regardez vos remparts passer de la
            palissade aux hautes murailles.
          </p>
        </div>
        <div className="aide-section">
          <h3>⚔️ Les assauts</h3>
          <p>
            Des bandes armées attaquent régulièrement — la richesse attire les convoitises (🔥 menace). Vos éclaireurs
            vous préviennent ~5 minutes avant, avec la <b>récompense</b> promise si vous tenez ; les impatients peuvent
            <b> lancer l’assaut immédiatement (+25 % de butin)</b>. Les archers tirent depuis les remparts ; si la
            muraille cède, la mêlée se joue dans le village. Dès les remparts de niveau 2, bâtissez des{' '}
            <b>tours d’archers</b> sur l’enceinte : elles tirent d’elles-mêmes sur tout ennemi à portée — mais leur
            silhouette attire des assauts plus fournis. Le jeu continue même onglet fermé.
          </p>
        </div>
        <div className="aide-section">
          <h3>🗺️ Piller ou secourir</h3>
          <p>
            Envoyez jusqu’à 20 soldats contre les 8 places fortes de la Troade. <b>Piller</b> rapporte gros — mais Zeus
            Xenios n’aime pas cela, la menace monte, et le village renforce sa garnison pour votre prochaine visite.
            Quand un village assiégé <b>appelle à l’aide</b>, vous avez quelques minutes pour trancher : aucun butin,
            mais la faveur des dieux et une <b>alliance</b> — tribut régulier et renforts sur vos remparts à chaque
            assaut. Moins de pertes = plus d’étoiles (★★★ sous 20 % de pertes).
          </p>
        </div>
        <div className="aide-section">
          <h3>🛡️ Les héros</h3>
          <p>
            Huit héros de la matière troyenne peuvent entrer à votre service — mais seulement si la cité en est digne :
            Hector veut des remparts de niveau 3, Ulysse un port et la confiance d’Athéna, Achille du sang déjà versé.
            Chacun apporte un <b>passif permanent</b> et une <b>capacité</b> à invoquer, gagne des niveaux en
            combattant, <b>mange chaque minute</b> — et s’en va si on l’ignore trois fois. Leur <b>arc narratif</b>
            pose des choix sans retour : certains y perdent la vie, d’autres n’en sortent plus jamais grandis.
          </p>
        </div>
        <div className="aide-section">
          <h3>🌱 Saisons et météo</h3>
          <p>
            Quatre journées de jeu par saison. Le printemps fait lever les blés, l’été durcit la terre et ouvre la mer,
            l’automne remplit les greniers, l’<b>hiver ferme la mer</b> (port au tiers, îles inaccessibles). Par-dessus,
            un ciel qui tourne : la <b>pluie</b> détend les cordes d’arc, la <b>brume</b> rogne la portée des tours et
            aveugle vos éclaireurs, l’<b>orage</b> rend la foudre de Zeus plus lourde, la <b>neige</b> ralentit les
            colonnes. Tout se voit sur la carte.
          </p>
        </div>
        <div className="aide-section">
          <h3>🏅 Hauts faits et prestige</h3>
          <p>
            Quarante-cinq hauts faits jalonnent le règne — « tenir un assaut sur trois fronts sans perdre un homme »,
            « élu des quatre Olympiens », « trois étoiles sur les huit places fortes ». Ils alimentent votre{' '}
            <b>prestige</b>, la seule note finale. Quand vous jugez le règne accompli, <b>abdiquez</b> : le score se
            fige, les aèdes vous donnent un titre — de « Roi de pacotille » à « Égal des dieux ».
          </p>
        </div>
        <div className="aide-section">
          <h3>⚡ Les dieux</h3>
          <p>
            Le temple génère la <b>faveur</b> (✨) qui alimente les bénédictions : foudre de Zeus, remparts de Poséidon,
            égide d’Athéna, fureur d’Arès. Vos choix dans les dilemmes forgent vos <b>relations</b> : Zeus punit qui
            viole l’hospitalité, Athéna souffle la vérité à qui l’honore, un dieu bafoué se venge.
          </p>
        </div>
        <div className="aide-section">
          <h3>🎭 L’ambiance</h3>
          <p>
            Fêtes, victoires et greniers pleins exaltent le village (production accrue). Famine, défaites et choix
            cruels le minent — sous 25, gare à la <b>mutinerie</b>.
          </p>
        </div>
        <div className="aide-section">
          <h3>⏩ La vitesse du temps</h3>
          <p>
            Comme dans les Sims : les boutons <b>×1 ×2 ×4 ×8</b> (ou les touches 1–4) accélèrent tout — production,
            chantiers, recrues, cycle du jour… et le compte à rebours des attaques. Le jeu repasse automatiquement en
            ×1 pendant les batailles.
          </p>
        </div>
        <div className="aide-section">
          <h3>🔎 Regarder de plus près</h3>
          <p>
            <b>Molette</b> pour zoomer là où pointe le curseur, <b>glisser</b> pour déplacer la carte,{' '}
            <b>double-clic</b> pour rendre la main à la caméra. Pendant un assaut, elle se rapproche seule du front le
            plus menacé — jusqu’à ce que vous y touchiez. Le bouton 🔊 règle la lyre, les cors et le tambour de siège.
            Tout menu se referme par sa <b>croix</b>, par <b>Échap</b>, ou d’un clic à côté.
          </p>
        </div>
        <div className="aide-section">
          <h3>🏅 Les missions</h3>
          <p>
            Le suivi en haut à gauche affiche les trois missions ouvertes ; le bouton <b>🏅 Missions</b> du bandeau
            déroule le fil entier — <b>cinquante-cinq objectifs en cinq actes</b>, du premier toit à la cité de légende.
            Chacun rapporte une <b>récompense</b> (ressources, faveur, villageois) et laisse une ligne au journal. Si
            vous ne savez pas où agir, le bouton de la mission (« 👥 Recensement », « 🏛️ Agora », « 🗺️ Expéditions »…){' '}
            <b>vous emmène directement à l’écran concerné</b>.
          </p>
        </div>
        <div className="aide-section">
          <h3>👷 Les métiers</h3>
          <p>
            Chaque habitant naît avec un métier — paysan, bûcheron, tailleur de pierre, forgeron, prêtre, docker — et
            les sept premiers en couvrent un de chaque. <b>Personne ne prend son poste tout seul</b> : c’est à vous
            d’ouvrir le recensement (👥) et de placer chacun. À son métier il rend pleinement, ailleurs seulement 55 %.
            Un atelier dont les postes ne sont pas tenus produit au prorata — un ⚠️ le signale.
          </p>
        </div>
        <div className="aide-section">
          <h3>⚓ Le comptoir du port</h3>
          <p>
            Le port échange <b>à la valeur</b>, pas au tas : le bronze vaut quatre charretées de bois, la pierre un peu
            plus qu’une. Les marchands prélèvent une marge — <b>+70 % au petit quai, +15 % au port franc</b> —, donc
            monter le port est le seul moyen de commercer sans se faire tondre.
          </p>
        </div>
        <div className="aide-section">
          <h3>Premiers pas</h3>
          <p>
            1. Cliquez un emplacement en pointillés pour construire. 2. Ferme, scierie et carrière d’abord. 3. Puis
            remparts et caserne — le premier assaut n’attendra pas. 4. L’Agora limite le niveau des autres bâtiments.
          </p>
        </div>
        <button className="principal" style={{ width: '100%', marginTop: 14 }} onClick={() => s.openPanel(null)}>
          Prendre la tête du village
        </button>
        <button
          style={{ width: '100%', marginTop: 8 }}
          onClick={() => {
            s.openPanel(null)
            s.demarrerTutoriel()
          }}
        >
          ⚡ Refaire la leçon de Zeus
        </button>
        {s.campagne && !s.campagne.fini ? (
          <button style={{ width: '100%', marginTop: 8 }} onClick={() => s.openPanel('campagne')}>
            🐴 Relire les cinq actes de « La Chute »
          </button>
        ) : null}
        <div className="aide-reset">
          {confirmeReset ? (
            <>
              <span>Abandonner la cité ? Cette partie sera perdue à jamais.</span>
              <button
                className="danger"
                onClick={() => {
                  setConfirmeReset(false)
                  s.reset()
                }}
              >
                Tout effacer
              </button>
              <button onClick={() => setConfirmeReset(false)}>Garder ma partie</button>
            </>
          ) : (
            <button className="danger" onClick={() => setConfirmeReset(true)}>
              🔥 Recommencer une nouvelle partie
            </button>
          )}
        </div>
      </>
    </Modale>
  )
}
