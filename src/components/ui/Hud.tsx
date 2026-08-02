import { useEffect, useState } from 'react'
import { BUILDING_IDS, DAY_MS, GODS, GOD_IDS, MODE_TEST, RES, SECTEURS, nbFronts } from '../../game/data'
import { CHAMPION_PAR_ID, ficheChampion } from '../../game/champions'
import { SEUIL_PANIQUE, SEUIL_PANIQUE_HEROS, descVague, tailleVague } from '../../game/combat'
import {
  BATIMENTS_A_POSTES,
  VITESSES,
  armeeTotale,
  bonusFaveurs,
  bonusHeros,
  coutBenediction,
  postesPourvus,
  postesTotal,
  popCap,
  stockageMax,
  tauxParMinute,
  useGame,
} from '../../game/store'
import { METEOS, SAISONS } from '../../game/saisons'
import { VILLAGES_PAR_ID } from '../../game/expeditions'
import { nomPhase, phaseJour } from '../map/Terrain'
import { HerosRapides } from './Heros'
import { Icone, Montant } from './Icones'
import { Infobulle } from './Infobulle'
import { BarreOrdres } from './Ordres'
import { PanneauPopulation } from './Population'
import type { ResourceId } from '../../game/types'

/**
 * Contrôle de vitesse façon Sims — verrouillé à ×1 pendant les batailles.
 *
 * Il portait un `title` du navigateur là où tous ses voisins du bandeau (météo,
 * saison, ambiance, menace) ont un encart mis en forme : c'était le seul jeton
 * du haut qui n'expliquait rien correctement.
 */
export function ControleVitesse() {
  const vitesse = useGame((s) => s.vitesse)
  const setVitesse = useGame((s) => s.setVitesse)
  const enBataille = useGame((s) => s.battle !== null || (s.expedition !== null && s.expedition.result === null))
  return (
    <Infobulle
      dataTuto="vitesses"
      className="vitesses"
      emoji={enBataille ? '⏸' : '⏩'}
      titre={enBataille ? 'Temps verrouillé — bataille en cours' : `Vitesse du temps — ×${vitesse}`}
      resume="Tout suit la même horloge : la production, les chantiers, la formation des recrues, le cycle du jour et des saisons… et le compte à rebours du prochain assaut."
      lignes={[
        { label: 'Vitesse actuelle', valeur: `×${enBataille ? 1 : vitesse}`, fort: true },
        { label: 'Au clavier', valeur: '1 · 2 · 3 · 4' },
        { label: 'Une journée', valeur: `${(8 / (enBataille ? 1 : vitesse)).toFixed(1)} min réelles` },
        {
          label: 'En bataille',
          valeur: enBataille ? 'verrouillé ×1' : 'retour forcé en ×1',
          couleur: enBataille ? '#d98a4e' : undefined,
        },
      ]}
      note={
        enBataille
          ? '⏸ On ne double pas la vitesse d’un assaut : les dieux et les héros s’invoquent en temps réel.'
          : '⚠️ Accélérer rapproche aussi l’ennemi. Bâtissez vite, mais regardez le compte à rebours.'
      }
    >
      <span className="ico">{enBataille ? '⏸' : '⏩'}</span>
      {VITESSES.map((v) => (
        <button
          key={v}
          className={vitesse === v && !enBataille ? 'active' : ''}
          disabled={enBataille}
          onClick={() => setVitesse(v)}
        >
          ×{v}
        </button>
      ))}
    </Infobulle>
  )
}

/** équerres d'angle : vers l'extérieur pour entrer, vers l'intérieur pour sortir.
 *  Tracé en SVG et non en ⛶ — le caractère manque à beaucoup de polices. */
function IconePleinEcran({ sortir }: { sortir: boolean }) {
  const d = sortir
    ? 'M7 2v5H2 M13 2v5h5 M13 18v-5h5 M7 18v-5H2'
    : 'M2 7V2h5 M13 2h5v5 M18 13v5h-5 M7 18H2v-5'
  return (
    <svg viewBox="0 0 20 20" width={14} height={14} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Bascule plein écran du navigateur. L'API manque sur certains mobiles et la
 * demande peut être refusée : on ne suppose rien et on n'attend aucune promesse.
 */
export function BoutonPleinEcran() {
  const [plein, setPlein] = useState(false)
  const [supporte] = useState(() => typeof document !== 'undefined' && !!document.documentElement.requestFullscreen)

  useEffect(() => {
    const maj = () => setPlein(document.fullscreenElement !== null)
    maj()
    document.addEventListener('fullscreenchange', maj)
    return () => document.removeEventListener('fullscreenchange', maj)
  }, [])

  if (!supporte) return null

  const basculer = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen()?.catch(() => {})
      else document.documentElement.requestFullscreen()?.catch(() => {})
    } catch {
      // refus du navigateur : le jeu reste jouable en fenêtre
    }
  }

  return (
    <button
      className={`bouton-icone${plein ? ' actif' : ''}`}
      onClick={basculer}
      title={plein ? 'Quitter le plein écran' : 'Jouer en plein écran'}
      aria-label={plein ? 'Quitter le plein écran' : 'Jouer en plein écran'}
    >
      <IconePleinEcran sortir={plein} />
    </button>
  )
}

/**
 * L'ambiance du village en UN mot — c'est ainsi qu'on la lit d'un coup d'œil,
 * et ce mot ne disparaît jamais, quelle que soit la largeur de l'écran.
 */
function labelMorale(m: number): { txt: string; c: string; quoi: string } {
  if (m >= 80) return { txt: 'Exaltée', c: '#5fae7d', quoi: 'On chante aux ateliers : tout rend au maximum.' }
  if (m >= 60) return { txt: 'Bonne', c: '#8fae5f', quoi: 'Le village travaille de bon cœur.' }
  if (m >= 40) return { txt: 'Correcte', c: '#d9b545', quoi: 'Ni révolte ni enthousiasme — on fait ce qu’on doit.' }
  if (m >= 25) return { txt: 'Morose', c: '#d98a4e', quoi: 'Les bras traînent, la production s’en ressent.' }
  return { txt: 'Révolte', c: '#d05a41', quoi: 'Sous 25, les soldats désertent et les meneurs s’agitent.' }
}

/** ce que chaque ressource sert à faire, pour l'infobulle du HUD */
const DESC_RES: Record<ResourceId, string> = {
  bois: 'Charpentes, palissades, navires et flèches. Vient de la scierie et de la cueillette.',
  pierre: 'Murailles, tours et grands bâtiments. Vient de la carrière — et des réparations qu’elle paie.',
  grain: 'Nourrit habitants et soldats. Un grenier vide, et c’est la famine puis la désertion.',
  bronze: 'Armes, armures et commerce. Vient de la forge et du port.',
}

/*
 * LE BANDEAU, EN DEUX RANGS.
 *
 * Tout tenait sur une seule ligne : cinq jetons de ressource, sept pastilles
 * d'état, le logo et les boutons. À 1600 px, chaque chose avait douze pixels de
 * marge et l'œil ne trouvait plus rien — on lisait une frise, pas un tableau de
 * bord.
 *
 * La coupure suit une VRAIE distinction, pas la place disponible :
 *   · rang du haut — CE QUE JE POSSÈDE : réserves, faveur, habitants, garnison ;
 *   · rang du bas  — CE QUI M'ARRIVE : ambiance, menace, jour, ciel, vitesse,
 *     à côté des boutons qui ouvrent les grands panneaux.
 * Chaque groupe est séparé par un filet vertical : on sait où s'arrête une idée.
 */
export function BarreRessources() {
  const s = useGame()
  // ouvert/fermé vit dans le store : le tutoriel doit pouvoir le refermer
  const popOuvert = s.popOuvert
  const taux = tauxParMinute(s)
  const stock = stockageMax(s)
  const cap = popCap(s)
  const sansEmploi = s.villageois.filter((v) => v.poste === null).length
  // postes ouverts par les ateliers mais que personne ne tient
  const postesVides = BATIMENTS_A_POSTES.reduce((a, b) => a + Math.max(0, postesTotal(s, b) - postesPourvus(s, b)), 0)

  return (
    <>
      <div className="ressources" data-tuto="ressources">
        {(Object.keys(RES) as ResourceId[]).map((r) => {
          const t = taux[r]
          const part = Math.min(1, s.resources[r] / Math.max(1, stock))
          return (
            <Infobulle
              key={r}
              className={`res${r === 'grain' && s.resources.grain <= 0 ? ' alerte' : ''}`}
              emoji={<Icone id={r} taille={20} />}
              titre={RES[r].nom}
              resume={DESC_RES[r]}
              lignes={[
                { label: 'En réserve', valeur: `${Math.floor(s.resources[r])} / ${stock}`, fort: true },
                {
                  label: 'Par minute',
                  valeur: MODE_TEST ? 'illimité' : `${t >= 0 ? '+' : ''}${t.toFixed(1)}`,
                  couleur: t < 0 ? '#d05a41' : '#7fc79b',
                },
                { label: 'Saison', valeur: `${SAISONS[s.saison].emoji} ×${(SAISONS[s.saison].prod[r] ?? 1).toFixed(2)}` },
                { label: 'Ciel', valeur: `${METEOS[s.meteo].emoji} ×${METEOS[s.meteo].prod.toFixed(2)}` },
                { label: 'Ambiance', valeur: `🎭 ×${(0.5 + (s.morale / 100) * 0.75).toFixed(2)}` },
              ]}
              note={
                part > 0.97
                  ? '⚠️ Entrepôt plein : ce qui rentre est perdu. Agrandissez l’Agora.'
                  : r === 'grain' && t < 0
                    ? '⚠️ Le grain baisse : à zéro, c’est la famine puis la désertion.'
                    : `Capacité fixée par l’Agora (niveau ${s.buildings.agora.level}).`
              }
            >
              <Icone id={r} taille={19} />
              <span className="chiffres">
                <span className="nom-res">{RES[r].nom}</span>
                <span className="val">
                  {Math.floor(s.resources[r])}
                  <span className={`taux${t < 0 ? ' neg' : ''}`}>
                    {MODE_TEST ? (
                      ' ∞'
                    ) : (
                      <>
                        {' '}
                        {t >= 0 ? '+' : ''}
                        {t.toFixed(1)}
                        <span className="par-min">/min</span>
                      </>
                    )}
                  </span>
                </span>
              </span>
            </Infobulle>
          )
        })}
        <Infobulle
          className="res"
          emoji={<Icone id="faveur" taille={20} />}
          titre="Faveur divine"
          resume="La monnaie des bénédictions : c’est elle qu’on dépense pour appeler un dieu ou un héros."
          lignes={[
            { label: 'Réserve', valeur: `${Math.floor(s.faveur)} / 100`, fort: true },
            { label: 'Temple', valeur: `niveau ${s.buildings.temple.level}` },
            {
              label: 'Prêtre au poste',
              valeur: postesPourvus(s, 'temple') > 0 ? 'oui' : 'non',
              couleur: postesPourvus(s, 'temple') > 0 ? '#7fc79b' : '#d05a41',
            },
          ]}
          note="Sans prêtre affecté au temple, les dieux n’entendent rien : la faveur cesse de monter."
        >
          <Icone id="faveur" taille={19} />
          <span className="chiffres">
            <span className="nom-res">Faveur</span>
            <span className="val">
              {Math.floor(s.faveur)}
              <span className="taux">/100</span>
            </span>
          </span>
        </Infobulle>
      </div>
      <div className="hud-groupe">
        {MODE_TEST && (
          <span className="pastille test" title="Mode test : ressources illimitées, chantiers instantanés">
            🧪 TEST
          </span>
        )}
        {MODE_TEST && (
          <button onClick={() => s.attaqueTest()} title="Déclencher un assaut dans 3 secondes" style={{ padding: '3px 9px', fontSize: 12.5 }}>
            🧪 Attaque
          </button>
        )}
        <Infobulle
          dataTuto="habitants"
          emoji="👥"
          titre="Les habitants"
          resume="Chaque villageois est un bras : à l’atelier il produit, à la caserne il devient soldat. Un habitant ne peut pas faire les deux."
          lignes={[
            { label: 'Population', valeur: `${s.pop} / ${cap}`, fort: true },
            { label: 'Habitations', valeur: `niveau ${s.buildings.maisons.level}` },
            {
              label: 'Sans emploi',
              valeur: sansEmploi,
              couleur: sansEmploi === 0 ? '#93a7b4' : '#e8c04a',
            },
            { label: 'Postes non tenus', valeur: postesVides, couleur: postesVides > 0 ? '#d98a4e' : '#7fc79b' },
          ]}
          note={
            postesVides > 0
              ? '⚠️ Un atelier sans ouvrier ne produit rien. Cliquez pour affecter vos villageois.'
              : 'Cliquez pour ouvrir le recensement du village.'
          }
        >
          <button className="pastille" onClick={() => s.ouvrirRecensement(true)}>
            👥<span className="opt">Habitants</span> <b>{s.pop}</b>/{cap}
            <span className={`oisifs${sansEmploi === 0 ? ' zero' : ''}`}>
              ({sansEmploi} oisif{sansEmploi > 1 ? 's' : ''})
            </span>
          </button>
        </Infobulle>
        <Infobulle
          className="pastille"
          emoji="⚔️"
          titre="La garnison"
          resume="Vos soldats tiennent les remparts et partent en expédition. Ils ne travaillent plus : ils mangent."
          lignes={[
            { label: 'Sous les armes', valeur: armeeTotale(s.army), fort: true },
            { label: 'Lanciers', valeur: s.army.lancier },
            { label: 'Archers', valeur: s.army.archer },
            { label: 'Hoplites', valeur: s.army.hoplite },
            { label: 'Consommation', valeur: `${(armeeTotale(s.army) * 0.5).toFixed(1)} grain/min`, couleur: '#d98a4e' },
          ]}
          note="Les archers ne tirent depuis un pan de mur que tant qu’il tient debout."
        >
          ⚔️<span className="opt">Garnison</span> <b>{armeeTotale(s.army)}</b>
        </Infobulle>
      </div>
      {popOuvert && <PanneauPopulation onFermer={() => s.ouvrirRecensement(false)} />}
    </>
  )
}

/** Rang du bas : ce qui arrive au village, et sur quoi il n'a qu'une prise indirecte. */
export function JetonsEtat() {
  const s = useGame()
  const morale = labelMorale(s.morale)
  const jour = Math.floor((s.lastSeen - s.createdAt) / DAY_MS) + 1
  const phase = nomPhase(phaseJour(s.lastSeen, s.createdAt, DAY_MS))

  return (
    <div className="hud-groupe hud-monde">
        <Infobulle
          dataTuto="ambiance"
          className="pastille"
          emoji="🎭"
          titre={`Ambiance : ${morale.txt}`}
          resume={morale.quoi}
          lignes={[
            { label: 'Moral', valeur: `${Math.round(s.morale)} / 100`, fort: true, couleur: morale.c },
            { label: 'Production', valeur: `×${(0.5 + (s.morale / 100) * 0.75).toFixed(2)}` },
            ...s.moraleMods
              .slice(-4)
              .map((m) => ({
                label: m.label,
                valeur: `${m.delta > 0 ? '+' : ''}${m.delta}`,
                couleur: m.delta > 0 ? '#7fc79b' : '#d98a4e',
              })),
          ]}
          note="Sous 25, les meneurs s’agitent ; à 0, les soldats désertent."
        >
          🎭
          <b className="ambiance-mot" style={{ color: morale.c }}>
            {morale.txt}
          </b>
          <span className="jauge-morale">
            <div style={{ width: `${s.morale}%`, background: morale.c }} />
          </span>
        </Infobulle>
        <Infobulle
          dataTuto="menace"
          className="pastille"
          emoji="🔥"
          titre="La menace"
          resume="Ce que la région convoite chez vous. Plus elle monte, plus les vagues d’assaut sont grosses — et nombreuses sur plusieurs fronts."
          lignes={[
            { label: 'Niveau', valeur: `${Math.round(s.threat)} / 100`, fort: true },
            { label: 'Fronts attendus', valeur: nbFronts(s.threat) },
            { label: 'Vos bâtiments', valeur: `+${Math.round(BUILDING_IDS.reduce((a, b) => a + s.buildings[b].level, 0) * 1.2)}` },
            { label: 'Vos tours', valeur: `+${s.tours * 4}` },
          ]}
          note="Une tour d’archers protège — et attire. Un pillage aussi."
        >
          🔥<span className="opt">Menace</span> <b>{Math.round(s.threat)}</b>
        </Infobulle>
        <Infobulle
          className="pastille"
          emoji="☀️"
          titre={`Jour ${jour} — ${phase}`}
          resume="Une journée dure huit minutes réelles. Le jeu continue onglet fermé : au retour, un rapport raconte la nuit."
          lignes={[
            { label: 'Moment', valeur: phase },
            { label: 'Année', valeur: Math.floor((jour - 1) / 16) + 1 },
            { label: 'Vitesse', valeur: `×${s.vitesse}` },
          ]}
          note="Touches 1 à 4 pour accélérer — retour forcé en ×1 pendant les batailles."
        >
          {/* « Jour 10 — Jour » se lisait deux fois : le moment de la journée
              passe en minuscules, à sa place de complément */}
          ☀️<span className="opt">Jour</span> <b>{jour}</b>
          <span className="opt2">· {phase.toLowerCase()}</span>
        </Infobulle>
        <Infobulle
          className="pastille"
          emoji={SAISONS[s.saison].emoji}
          titre={`${SAISONS[s.saison].nom} · ${METEOS[s.meteo].nom}`}
          resume={SAISONS[s.saison].desc}
          lignes={[
            ...(Object.keys(RES) as ResourceId[])
              .filter((r) => Math.abs((SAISONS[s.saison].prod[r] ?? 1) - 1) > 0.02)
              .map((r) => ({
                label: RES[r].nom,
                valeur: `×${(SAISONS[s.saison].prod[r] ?? 1).toFixed(2)}`,
                couleur: (SAISONS[s.saison].prod[r] ?? 1) > 1 ? '#7fc79b' : '#d98a4e',
              })),
            { label: 'Toute récolte', valeur: `×${METEOS[s.meteo].prod.toFixed(2)}` },
            { label: 'Portée des tours', valeur: `×${METEOS[s.meteo].portee.toFixed(2)}` },
            { label: 'Allure en bataille', valeur: `×${METEOS[s.meteo].vitesse.toFixed(2)}` },
            { label: 'Force des tirs', valeur: `×${METEOS[s.meteo].tir.toFixed(2)}` },
            { label: 'Alerte des éclaireurs', valeur: `×${METEOS[s.meteo].alerte.toFixed(2)}` },
          ]}
          note={
            <>
              {METEOS[s.meteo].emoji} <b>{METEOS[s.meteo].nom}</b> — {METEOS[s.meteo].desc}
              {SAISONS[s.saison].merFermee && <div>❄️ La mer est prise : port au tiers, îles hors d’atteinte.</div>}
            </>
          }
        >
          {SAISONS[s.saison].emoji}
          <b>{SAISONS[s.saison].nom}</b>
          <span className="meteo-ico">{METEOS[s.meteo].emoji}</span>
        </Infobulle>
        <ControleVitesse />
    </div>
  )
}

/** boutons d'invocation rapide pendant une bataille */
export function DieuxRapides() {
  const faveur = useGame((s) => s.faveur)
  const gods = useGame((s) => s.gods)
  const templeLevel = useGame((s) => s.buildings.temple.level)
  const buildings = useGame((s) => s.buildings)
  // le prix affiché ici doit être celui qu'on paiera : les grâces le font baisser
  const graces = useGame((s) => s.graces)
  const benir = useGame((s) => s.benir)
  const now = useGame((s) => s.lastSeen)

  return (
    <>
      <div className="dieux-rapides">
        {GOD_IDS.map((g) => {
          const dieu = GODS[g]
          if (templeLevel < dieu.temple) return null
          const cout = coutBenediction({ buildings, graces }, g)
          const cd = Math.max(0, gods[g].cooldownUntil - now)
          return (
            <button
              key={g}
              disabled={faveur < cout || cd > 0}
              onClick={() => benir(g)}
              title={`${dieu.benediction.nom} — ${dieu.benediction.desc}`}
            >
              {dieu.emoji}{' '}
              {cd > 0 ? `${Math.ceil(cd / 1000)}s` : <Montant n={cout} id="faveur" taille={13} />}
            </button>
          )
        })}
        {templeLevel < 1 && <span className="detail">Bâtissez un temple pour invoquer les dieux…</span>}
      </div>
      {/* les héros ont leur propre rang de boutons, juste dessous */}
      <HerosRapides />
    </>
  )
}

/**
 * Un village de la Troade implore votre aide. C'était signalé par un seul émoji
 * accolé au bouton « Expéditions » : qui ne le remarquait pas ne pouvait pas
 * savoir qu'une fenêtre se refermait — et l'alliance passait sans un mot.
 *
 * Le voici en bandeau plein écran, avec son compte à rebours et les deux seules
 * réponses possibles. On ne peut plus le manquer, et on ne peut plus l'ignorer
 * sans le savoir.
 */
function BandeauSecours() {
  const appel = useGame((s) => s.appelSecours)
  const now = useGame((s) => s.lastSeen)
  const enCours = useGame((s) => s.battle !== null || s.expedition !== null)
  const openPanel = useGame((s) => s.openPanel)
  const ignorer = useGame((s) => s.ignorerSecours)
  if (!appel) return null
  const v = VILLAGES_PAR_ID[appel.villageId]
  const reste = Math.max(0, appel.expireAt - now)
  return (
    <div className="bandeau secours">
      <div className="gros">
        🙏 {v?.nom ?? 'Un village'} implore votre aide
        <span className="compte">
          {Math.floor(reste / 60000)}:{String(Math.floor((reste % 60000) / 1000)).padStart(2, '0')}
        </span>
      </div>
      <div className="detail">
        Des assiégeants sont sous leurs murs. <b>Aucun butin à espérer</b> — mais la faveur de Zeus et d’Athéna, et une{' '}
        <b>alliance</b> : tribut régulier et renforts sur vos remparts à chaque assaut.
      </div>
      <div className="secours-actions">
        <button className="principal" disabled={enCours} onClick={() => openPanel('expeditions')}>
          🤝 Voir et porter secours
        </button>
        <button className="danger" onClick={() => ignorer()} title="Zeus Xenios protège les suppliants">
          🚪 Fermer la porte (Zeus −4)
        </button>
      </div>
    </div>
  )
}

export function BandeauAlerte() {
  const battle = useGame((s) => s.battle)
  const expedition = useGame((s) => s.expedition)
  const warned = useGame((s) => s.warned)
  const incomingWave = useGame((s) => s.incomingWave)
  const defRecompense = useGame((s) => s.defRecompense)
  const nextAttackAt = useGame((s) => s.nextAttackAt)
  const now = useGame((s) => s.lastSeen)
  const lancerMaintenant = useGame((s) => s.lancerMaintenant)
  // un sélecteur doit rendre une référence STABLE : on lit le tableau du store
  // tel quel et on le met en forme au rendu, jamais dans le sélecteur
  const revele = useGame((s) => bonusHeros(s).revelerVague)
  // « L'œil du ciel » : Zeus dit la même chose qu'Ulysse, sans Ulysse
  const oeilDuCiel = useGame((s) => bonusFaveurs(s).revelerFronts)
  const frontsIds = useGame((s) => s.incomingFronts)
  const championId = useGame((s) => s.incomingChampion)
  const champAnnonce = championId ? CHAMPION_PAR_ID[championId] : null
  const fronts =
    (revele || oeilDuCiel) && frontsIds ? frontsIds.map((id) => SECTEURS.find((x) => x.id === id)?.nom ?? id) : null

  if (battle) {
    const restants = battle.fighters.filter((f) => f.camp === 'attaque' && f.etat !== 'mort').length
    /*
     * Le champion achéen. Tant qu'il est debout, on affiche son nom, sa vie et
     * la manœuvre qu'il prépare avec le décompte : c'est ce qui permet de choisir
     * entre le tuer d'abord et laisser tomber sa capacité.
     */
    const champ = battle.champion
    const def = champ ? CHAMPION_PAR_ID[champ.id] : null
    const porteur = champ ? battle.fighters.find((f) => f.id === champ.fighterId) : undefined
    const vieChamp = porteur && porteur.maxHp > 0 ? Math.max(0, porteur.hp / porteur.maxHp) : 0
    const avantManoeuvre = champ && !champ.lancee ? Math.max(0, champ.capaciteA - now) : 0
    /*
     * Le moral de la garnison. Sans ce chiffre, la panique se voyait sans se
     * comprendre : des hommes rompaient et le joueur n'avait aucun moyen de
     * savoir qu'il était à deux pertes de voir sa ligne céder — ni qu'un héros
     * appelé maintenant la retiendrait.
     */
    const moral = battle.moral?.defense ?? 1
    const heroTient = battle.fighters.some((f) => f.heros && f.camp === 'defense' && f.etat !== 'mort' && f.etat !== 'fuite')
    const seuil = heroTient ? SEUIL_PANIQUE_HEROS : SEUIL_PANIQUE
    const rompt = moral < seuil
    return (
      <div className="bandeau">
        <div className="gros">⚔️ ASSAUT EN COURS — {restants} assaillants</div>
        <div className="detail">{battle.breche ? '💥 Les remparts sont percés : mêlée dans le village !' : 'Vos remparts encaissent le choc.'}</div>
        <div className="detail moral-ligne">
          <span className={`moral-jauge${rompt ? ' rompt' : ''}`}>
            <div style={{ width: `${Math.round(moral * 100)}%` }} />
            {/* le seuil de rupture, tracé sur la jauge : on voit venir */}
            <span className="moral-seuil" style={{ left: `${Math.round(seuil * 100)}%` }} />
          </span>
          {rompt ? (
            <b style={{ color: '#e0715a' }}>La ligne rompt — vos hommes lâchent un par un</b>
          ) : (
            <span>
              Ligne tenue · rupture sous {Math.round(seuil * 100)} %
              {heroTient && <b style={{ color: '#f0d9a0' }}> — un héros rallie</b>}
            </span>
          )}
        </div>
        {champ && def && (
          <div className={`champion-ligne${champ.abattu ? ' abattu' : ''}`}>
            <span className="champion-nom">
              {champ.emoji} {champ.nom}
            </span>
            {champ.abattu ? (
              <span className="champion-mort">💀 abattu — sa manœuvre est morte avec lui</span>
            ) : (
              <>
                <span className="champion-vie" title={`${Math.round(vieChamp * 100)} % de ses forces`}>
                  <i style={{ width: `${Math.round(vieChamp * 100)}%` }} />
                </span>
                <span className="champion-manoeuvre" title={def.capacite.desc}>
                  {champ.lancee
                    ? `${def.capacite.emoji} ${def.capacite.nom} — en cours`
                    : `${def.capacite.emoji} ${def.capacite.nom} dans ${Math.ceil(avantManoeuvre / 1000)} s`}
                </span>
              </>
            )}
          </div>
        )}
        {/* ce que le joueur peut FAIRE de la bataille, et pas seulement regarder */}
        <BarreOrdres />
        <DieuxRapides />
      </div>
    )
  }

  if (warned && incomingWave) {
    const dans = Math.max(0, nextAttackAt - now)
    return (
      <div className="bandeau">
        <div className="gros">
          🐎 Attaque ennemie dans{' '}
          <span className="compte">
            {Math.floor(dans / 60000)}:{String(Math.floor((dans % 60000) / 1000)).padStart(2, '0')}
          </span>
        </div>
        <div className="detail">
          {tailleVague(incomingWave)} assaillants par la route de l’est : {descVague(incomingWave)}.
        </div>
        {/* Ulysse lit dans la poussière quels pans seront visés — ou Zeus les dit */}
        {fronts && (
          <div className="detail" style={{ color: '#cbd8e2' }}>
            {revele
              ? `🐎 Ulysse a fait parler un éclaireur : ils frapperont ${fronts.join(' et ')}.`
              : `👁️ Rien ne monte de la plaine sans que Zeus le voie : ils frapperont ${fronts.join(' et ')}.`}
          </div>
        )}
        {/* un nom en tête de colonne : on doit pouvoir s'y préparer, pas le
            découvrir à la première épée */}
        {champAnnonce && (
          <div className="detail champion-presage">
            <b style={{ color: '#ffb9a5' }}>
              {ficheChampion(champAnnonce.id).emoji} {champAnnonce.titre}
            </b>
            <div>{champAnnonce.presage}</div>
            <div style={{ color: '#e8c04a' }}>
              {champAnnonce.capacite.emoji} {champAnnonce.capacite.nom} — {champAnnonce.capacite.desc} Abattez-le et
              elle meurt avec lui.
            </div>
          </div>
        )}
        {defRecompense && (
          <div className="detail recompense">
            🎁 Récompense si repoussé : <b><Montant n={defRecompense.bronze} id="bronze" taille={14} signe /></b> ·{' '}
            <b><Montant n={defRecompense.faveur} id="faveur" taille={14} signe /></b> · ambiance +10
          </div>
        )}
        {expedition ? (
          <div className="detail">⏳ Vos troupes sont en expédition — l’ennemi attend leur retour…</div>
        ) : (
          <button className="danger lancer-now" onClick={() => lancerMaintenant()}>
            ⚔️ Lancer l’assaut maintenant (récompense +25 %)
          </button>
        )}
      </div>
    )
  }
  // aucun assaut en vue : c'est le moment où un appel au secours doit se voir
  return <BandeauSecours />
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts)
  if (toasts.length === 0) return null
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.emoji} {t.msg}
        </div>
      ))}
    </div>
  )
}
