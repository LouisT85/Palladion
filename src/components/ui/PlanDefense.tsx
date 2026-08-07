import { SECTEURS, UNITS, nbFronts } from '../../game/data'
import { HEROS } from '../../game/heros'
import {
  PANS,
  UNITES_PLAN,
  herosAbsents,
  herosDormants,
  herosPlacables,
  pansSansHommes,
  planAvecHero,
  planAvecOrdre,
  planAvecPan,
  resumePlan,
} from '../../game/plandefense'
import { bonusFaveurs, bonusHeros, useGame } from '../../game/store'
import { Astuce } from './Infobulle'
import { Modale } from './Modale'
import { JetonsLigne, JetonsTir, SchemaEnceinte, court, usePlanDefense, useReglerPlan, type PanCarte } from './Ordres'

/*
 * ═══════════════════ LE PLAN DE DÉFENSE ═══════════════════
 *
 * « Pouvoir gérer l'emplacement des défenses avant les attaques. Actuellement, il
 * faut attendre que l'attaque commence pour pouvoir le faire. »
 *
 * C'était exact, et c'était le pire moment possible : la barre d'ordres ne
 * s'affichait qu'en bataille. Le joueur découvrait donc l'existence des pans -
 * porte de l'est, mur du sud, mur du nord - au moment où les béliers cognaient,
 * et devait refaire les mêmes cinq gestes à chaque assaut, en temps réel, sous le
 * délai de cinq secondes qui sépare deux ordres.
 *
 * Le plan est la même décision, prise à froid et GARDÉE. Trois choix de forme :
 *
 *  · IL VIT AUX REMPARTS. Le panneau des remparts porte déjà l'état de la
 *    muraille, les tours d'archers, la Redoute et les cinq ouvrages de
 *    l'intérieur : c'est là qu'on va quand on pense à sa défense. Le plan y est un
 *    bloc de plus, et le bandeau d'alerte y renvoie d'un jeton - le moment où l'on
 *    y pense vraiment, c'est quand on lit « attaque dans 2:30 ».
 *
 *  · IL MONTRE L'ENCEINTE, PAS UNE LISTE. Trois menus déroulants nommant des
 *    murs ne disent rien de l'EMPLACEMENT. Le schéma - l'ellipse aux proportions
 *    de la place, les trois pans à leur vraie position - le dit d'un coup d'œil,
 *    et c'est le même que celui de la barre d'ordres.
 *
 *  · IL SE TAIT PENDANT L'ASSAUT. Le plan est libre de tout délai en paix ; s'il
 *    restait modifiable pendant la bataille, il deviendrait la porte de service de
 *    `DELAI_ORDRE_MS`. Sous les flèches, on lit le plan, on ne le change pas : les
 *    ordres se donnent sur la barre, où le délai s'applique.
 *
 * ── ET LES HÉROS S'Y POSTENT COMME LES TROUPES ──
 *
 * C'est ici, et NULLE PART AILLEURS, qu'on place un héros. Deux raisons, et la
 * seconde est du moteur, pas du goût :
 *
 *  · le geste est le même que pour une troupe - désigner la pièce, désigner le
 *    pan - donc il se fait avec les mêmes jetons, dans les mêmes zones, sur le
 *    même schéma. Une seconde interface pour les héros aurait obligé le joueur à
 *    apprendre deux fois la même chose ;
 *  · en bataille, on ne peut pas. `posterHeros` TÉLÉPORTE le combattant à
 *    l'entrée du secteur - juste à l'ouverture (« en place avant le premier coup
 *    de bélier »), absurde en pleine mêlée. La barre d'ordres montre donc où
 *    chaque héros se tient, et n'offre pas de l'y déplacer.
 */

/** ouvre le panneau. `'plandefense'` est ajouté à l'union `panel` par store.ts. */
export function useOuvrirPlan(): () => void {
  const openPanel = useGame((s) => s.openPanel) as unknown as (p: string) => void
  return () => openPanel('plandefense')
}

/** la bataille où le joueur a des hommes : on lit le plan, on ne le règle plus */
function useEnBataille(): boolean {
  return useGame((s) => s.battle !== null || (s.expedition !== null && !s.expedition.result))
}

// ═══════════════════ Le bloc du panneau des remparts ═══════════════════

/**
 * Ce qui se voit aux remparts : le plan en une ligne, et la porte pour l'ouvrir.
 * Sans niveau de remparts il n'y a pas d'enceinte, donc pas de pan à tenir - le
 * bloc se tait, comme celui des tours.
 */
export function BlocPlanDefense() {
  const niveau = useGame((s) => s.buildings.remparts.level)
  const plan = usePlanDefense()
  const ouvrir = useOuvrirPlan()
  const menace = useGame((s) => s.threat)
  if (niveau === 0) return null
  const fronts = nbFronts(menace)
  return (
    <div className="bloc">
      <h3>🗺️ Plan de défense</h3>
      <div className="desc" style={{ fontSize: 12 }}>
        Quel pan chaque troupe tient, comment la ligne encaisse, comment les tireurs tirent. Décidé <b>maintenant</b>,
        adopté au premier choc : plus besoin d’attendre que les Achéens soient sous les murs pour poster ses hommes.
      </div>
      <div style={{ fontSize: 12, color: '#e8c04a', margin: '5px 0' }}>{resumePlan(plan)}</div>
      <div style={{ fontSize: 11.5, color: '#93a7b4' }}>
        À ce niveau de menace, l’ennemi vient sur {fronts} pan{fronts > 1 ? 's' : ''} - dont toujours la porte de l’est.
      </div>
      <button className="principal" style={{ width: '100%', marginTop: 7 }} onClick={ouvrir}>
        Ouvrir le plan de défense
      </button>
    </div>
  )
}

/** le même accès, en jeton, depuis le bandeau d'alerte - c'est là qu'on y pense */
export function JetonPlanDefense() {
  const ouvrir = useOuvrirPlan()
  const plan = usePlanDefense()
  return (
    <Astuce titre="🗺️ Plan de défense" resume={resumePlan(plan)} note="Réglez l’emplacement de vos troupes avant le choc.">
      <button className="plan-lien" onClick={ouvrir}>
        🗺️ Plan de défense
      </button>
    </Astuce>
  )
}

// ═══════════════════ Le panneau ═══════════════════

export function PanneauPlanDefense({ onFermer }: { onFermer: () => void }) {
  const plan = usePlanDefense()
  const regler = useReglerPlan()
  const army = useGame((s) => s.army)
  const menace = useGame((s) => s.threat)
  const warned = useGame((s) => s.warned)
  const frontsIds = useGame((s) => s.incomingFronts)
  const niveauMur = useGame((s) => s.buildings.remparts.level)
  const enBataille = useEnBataille()
  /*
   * Les fronts visés sont un RENSEIGNEMENT : ils ne se lisent qu'avec Ulysse à
   * table ou « l'œil du ciel » de Zeus, exactement comme dans le bandeau
   * d'alerte. Le plan ne doit pas les offrir par la fenêtre.
   */
  const revelesParUlysse = useGame((s) => bonusHeros(s).revelerVague)
  const revelesParZeus = useGame((s) => bonusFaveurs(s).revelerFronts)
  const revele = revelesParUlysse || revelesParZeus
  const annonces = revele && warned && frontsIds ? frontsIds : null

  const tireurs = (army.archer ?? 0) + (army.frondeur ?? 0) > 0
  const sansHommes = pansSansHommes(plan, army)
  const postes = UNITES_PLAN.filter((u) => plan.pans[u])
  const fronts = nbFronts(menace)

  /*
   * Les héros. `herosPlacables` rend TOUJOURS les huit, absents compris : le plan
   * garde l'ordre donné à un héros qu'on n'a pas encore engagé, exactement comme
   * celui donné à des archers qu'on n'a pas levés. On ne cache pas la case, on
   * dit qu'elle est vide - et `herosAbsents` le redit en toutes lettres.
   */
  const etatsHeros = useGame((s) => s.heros)
  const now = useGame((s) => s.lastSeen)
  const cartesHeros = herosPlacables(plan, etatsHeros, now).filter((h) => h.present || h.pan !== null)
  const absents = herosAbsents(plan, etatsHeros, now)
  /*
   * « Postés sur un pan que personne n'assaillera » ne se sait que lorsque les
   * éclaireurs ont parlé : sans renseignement, les fronts sont tirés au sort et
   * l'avertissement serait un mensonge. On ne le calcule donc que sur `annonces`.
   */
  const dormantsHeros = annonces
    ? herosDormants(
        plan,
        SECTEURS.filter((s) => annonces.includes(s.id)),
      )
    : []
  const postesHeros = cartesHeros.filter((h) => h.pan !== null)

  const pans: PanCarte[] = PANS.map((p) => ({
    id: p.id,
    nom: p.nom,
    angle: p.angle,
    unites: UNITES_PLAN.filter((u) => plan.pans[u] === p.id),
    assailli: annonces ? annonces.includes(p.id) : undefined,
  }))
  const reserve = UNITES_PLAN.filter((u) => !plan.pans[u])

  return (
    <Modale
      titre="🗺️ Plan de défense"
      sous={resumePlan(plan)}
      onFermer={onFermer}
      classe="plan-modale"
      dataTuto="plan-defense"
    >
      <div className="desc" style={{ fontSize: 12.5 }}>
        Ce plan est <b>permanent</b>. Il se règle en temps de paix, autant de fois qu’on veut, et chaque bataille
        l’adopte à son ouverture - vos hommes sont en place avant le premier coup de bélier.
      </div>

      {enBataille && (
        <div className="bloc" style={{ borderColor: '#7a3f2c', background: '#1b0d08' }}>
          ⚔️ <b>L’assaut est engagé.</b> On ne réécrit pas un plan sous les flèches : les ordres se donnent maintenant
          sur la <b>barre d’ordres</b>, en bas de l’alerte, où un ordre se tient cinq secondes avant qu’on en change. Le
          plan reprendra la main à la prochaine bataille.
        </div>
      )}

      {niveauMur === 0 && (
        <div className="bloc" style={{ borderColor: '#7a3f2c' }}>
          🧱 Vous n’avez pas d’enceinte : il n’y a pas encore de pan à tenir. La posture et le tir, eux, valent déjà.
        </div>
      )}

      <div className="bloc">
        <h3>⚑ Comment la troupe se bat</h3>
        <div className="ordres" style={{ background: '#1b0d08a0' }}>
          <JetonsLigne
            valeur={plan.ligne}
            onChoisir={(id) => regler(planAvecOrdre(plan, 'ligne', id))}
            gele={enBataille}
            contexte="plan"
          />
          <JetonsTir
            valeur={plan.tir}
            onChoisir={(id) => regler(planAvecOrdre(plan, 'tir', id))}
            gele={enBataille}
            tireurs={tireurs}
            contexte="plan"
          />
        </div>
        <div style={{ fontSize: 11.5, color: '#93a7b4', marginTop: 6 }}>
          Ces deux-là valent AUSSI en expédition : ce sont les mêmes hommes, et « mur de boucliers » veut dire la même
          chose devant une place forte étrangère. Les pans, non - loin de chez soi, il n’y a pas de mur à tenir.
        </div>
      </div>

      <div className="bloc">
        <h3>⚔ Où chacun se poste</h3>
        {niveauMur > 0 && !enBataille && (
          <SchemaEnceinte
            pans={pans}
            reserve={reserve}
            effectifs={army}
            heros={cartesHeros}
            dormantsHeros={dormantsHeros}
            onDeposer={(u, pan) => regler(planAvecPan(plan, u, pan))}
            onDeposerHero={(h, pan) => regler(planAvecHero(plan, h, pan))}
            note={
              <>
                Cliquez une troupe <b>ou un héros</b>, puis le pan à tenir - ou glissez-le. « Au plus pressé » les
                laisse courir au pan enfoncé.
              </>
            }
          />
        )}
        {enBataille && (
          <div style={{ fontSize: 12, color: '#93a7b4' }}>
            L’emplacement se règle pendant l’assaut sur la barre d’ordres, jeton <b>⚔ Pans</b> - il y montre le même
            schéma, avec l’état réel de chaque mur.
          </div>
        )}

        {/*
          Ce que le joueur peut savoir de la nuit qui vient, et rien de plus. Quand
          les éclaireurs ont parlé, on dit CE QU'ILS ONT DIT et pas la règle
          générale : `nbFronts(menace)` et les fronts annoncés peuvent différer -
          la menace monte après l'alerte, les fronts sont tirés une fois pour
          toutes - et deux comptes qui se contredisent ne renseignent personne.
        */}
        {annonces ? (
          <div style={{ fontSize: 12, color: '#e8c04a', marginTop: 8 }}>
            🔍 Vos éclaireurs annoncent l’assaut sur{' '}
            <b>
              {annonces
                .map((id) => SECTEURS.find((s) => s.id === id)?.nom ?? id)
                .join(' et ')
                .toLowerCase()}
            </b>{' '}
            - {annonces.length} pan{annonces.length > 1 ? 's' : ''} sur trois.
          </div>
        ) : (
          <div style={{ fontSize: 11.5, color: '#93a7b4', marginTop: 8 }}>
            🐎 À une menace de {Math.round(menace)}, une vague se scinde en <b>{fronts}</b> colonne
            {fronts > 1 ? 's' : ''} : {fronts === 1 ? 'un seul pan sera assailli' : `${fronts} pans seront assaillis`},
            et la porte de l’est en est toujours.
          </div>
        )}
        <div style={{ fontSize: 11.5, color: '#93a7b4', marginTop: 4 }}>
          Un pan qui n’est pas assailli ce jour-là ne consomme personne : ces hommes reprennent la consigne ordinaire et
          courent au pan enfoncé.
        </div>
        {sansHommes.length > 0 && (
          <div style={{ fontSize: 12, color: '#d98a4e', marginTop: 5 }}>
            ⚠ Vous postez {sansHommes.map((u) => `${UNITS[u].emoji} ${UNITS[u].nom.toLowerCase()}s`).join(', ')} sans en
            avoir un seul. L’ordre est gardé - il commandera le jour où vous en lèverez - mais ce pan est nu.
          </div>
        )}
        {/* le pendant, pour les hommes qu'on désigne par leur nom */}
        {absents.length > 0 && (
          <div style={{ fontSize: 12, color: '#d98a4e', marginTop: 5 }}>
            ⚠ {absents.map((h) => `${HEROS[h].emoji} ${HEROS[h].nom}`).join(', ')}{' '}
            {absents.length > 1 ? 'sont postés mais ne descendront pas' : 'est posté mais ne descendra pas'} - pas
            encore engagé, tombé, ou sous sa tente. L’ordre est gardé pour son retour.
          </div>
        )}
        {dormantsHeros.length > 0 && (
          <div style={{ fontSize: 12, color: '#d98a4e', marginTop: 5 }}>
            ⚠ {dormantsHeros.map((h) => `${HEROS[h].emoji} ${HEROS[h].nom}`).join(', ')} garde
            {dormantsHeros.length > 1 ? 'nt' : ''} un pan que les éclaireurs n’annoncent pas : il
            {dormantsHeros.length > 1 ? 's iront' : ' ira'} au plus pressé.
          </div>
        )}
        {(postes.length > 0 || postesHeros.length > 0) && !enBataille && (
          <button style={{ width: '100%', marginTop: 8 }} onClick={() => regler({ ...plan, pans: {}, heros: {} })}>
            Tout rendre au plus pressé
          </button>
        )}
      </div>

      {/* la traduction du plan en ordres, pour que rien ne soit magique */}
      {niveauMur > 0 && (postes.length > 0 || postesHeros.length > 0) && (
        <div className="bloc" style={{ fontSize: 11.5, color: '#93a7b4' }}>
          <h3>📋 Ce que la prochaine bataille entendra</h3>
          {UNITES_PLAN.filter((u) => plan.pans[u]).map((u) => {
            const pan = PANS.find((p) => p.id === plan.pans[u])
            return (
              <div key={u}>
                {UNITS[u].emoji} {UNITS[u].nom} → {pan ? court(pan.nom) : '—'}
                {(army[u] ?? 0) <= 0 ? ' (personne pour l’instant)' : ` (${army[u]})`}
              </div>
            )
          })}
          {/* les héros à la suite, et nommément : « Hector → Nord », pas « 1 héros » */}
          {postesHeros.map((h) => {
            const pan = PANS.find((p) => p.id === h.pan)
            return (
              <div key={h.id} style={{ color: h.present ? '#c7b48f' : '#d98a4e' }}>
                {h.emoji} {h.nom} → {pan ? court(pan.nom) : '—'}
                {h.present ? ` (niveau ${h.niveau})` : ' (absent - l’ordre attend son retour)'}
              </div>
            )
          })}
          <div style={{ marginTop: 4 }}>
            Reste au plus pressé : {reserve.map((u) => UNITS[u].emoji).join(' ') || '—'}
            {cartesHeros.filter((h) => h.pan === null).length > 0 &&
              ` ${cartesHeros
                .filter((h) => h.pan === null)
                .map((h) => h.emoji)
                .join(' ')}`}
          </div>
        </div>
      )}

    </Modale>
  )
}
