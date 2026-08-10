import { GODS, GOD_IDS, multRelation, nomFerveur, palierFerveur } from '../../game/data'
import { GRACES } from '../../game/faveurs'
import { coutBenediction, murMax, relationEffective, useGame } from '../../game/store'
import type { GodId } from '../../game/types'
import { ApercuDivin } from '../map/EffetsDivins'
import { Montant } from './Icones'
import { Astuce } from './Infobulle'
import { Modale } from './Modale'

/** ×1.60 → « 1.6 », ×1.00 → « 1 » : on ne montre que les décimales qui portent du sens */
function fmtMult(f: number): string {
  return f
    .toFixed(2)
    .replace(/0$/, '')
    .replace(/\.$/, '')
}

/**
 * Sept paliers, du rouge sang au vert franc, en passant par un neutre terne.
 * Chaque cran est plus SATURÉ que le précédent dans sa direction : on doit lire
 * la ferveur à la couleur seule, sans lire le mot ni le chiffre.
 */
const TEINTES_FERVEUR = [
  '#8e1410', // maudit - rouge presque noir
  '#c0392b', // offensé
  '#e07b39', // contrarié
  '#9aa3a8', // indifférent - gris terne, sans intention
  '#8fbf5a', // en grâce
  '#3fae6d', // chéri
  '#12c97c', // élu - vert éclatant
] as const

function couleurFerveur(relation: number): string {
  return TEINTES_FERVEUR[palierFerveur(relation)]
}

/**
 * Effet réel de la bénédiction à la ferveur courante. Les formules doublent
 * celles de `benir()` : le joueur doit lire le chiffre exact qu'il obtiendra,
 * pas la valeur théorique de la fiche du dieu.
 */
function effetChiffre(g: GodId, force: number, murMax: number): string {
  const s = (x: number) => Math.round(x)
  switch (g) {
    case 'zeus':
      return `≈${s(120 * force)} dégâts répartis sur les assaillants les plus massés`
    case 'poseidon': {
      const pct = 45 * force
      return murMax > 0
        ? `+${s(pct)} % de structure, soit ≈${s((murMax * pct) / 100)} points de remparts rendus`
        : `+${s(pct)} % des points de structure des remparts`
    }
    case 'athena': {
      // la réduction est plafonnée à 85 % : même l'élu ne devient pas invulnérable
      const reduction = Math.max(0.15, 1 - 0.6 * force)
      return `−${s((1 - reduction) * 100)} % de dégâts subis pendant ${s(25 * force)} s`
    }
    case 'ares':
      return `+${s(60 * force)} % d’attaque pendant ${s(25 * force)} s - hors bataille : recrues pressées pendant ${s(60 * force)} s`
  }
}

/** bornes des sept paliers, en points de relation - sert à découper le rail */
const BORNES = [-100, -70, -40, -15, 15, 40, 70, 100]

/**
 * Jauge de relation. Le rail lui-même est peint aux sept couleurs des paliers,
 * du rouge sang à gauche au vert franc à droite : la position du curseur suffit
 * à dire où l'on en est, la couleur confirme, le mot n'est plus qu'un rappel.
 */
function JaugeRelation({ relation }: { relation: number }) {
  const borne = Math.max(-100, Math.min(100, relation))
  const pos = ((borne + 100) / 200) * 100
  const couleur = couleurFerveur(borne)
  return (
    <Astuce
      titre={`${nomFerveur(borne)} · ${Math.round(relation) > 0 ? '+' : ''}${Math.round(relation)}`}
      resume="La relation ne paie rien : elle multiplie. De ×0.4 pour un dieu maudit à ×1.6 pour son élu - la puissance de la bénédiction ET sa durée."
      lignes={[
        { label: 'Puissance des bénédictions', valeur: `×${fmtMult(multRelation(borne))}`, fort: true },
      ]}
      note="Un sacrifice vaut +8. Les grâces, elles, se paient en points de relation : monter sa ferveur ou l’échanger, c’est là tout l’arbitrage."
    >
    <div style={{ margin: '9px 0 3px' }}>
      <div className="jauge-ferveur">
        {/* rail à sept bandes : chaque palier occupe exactement sa plage */}
        {TEINTES_FERVEUR.map((c, i) => {
          const g = ((BORNES[i] + 100) / 200) * 100
          const d = ((BORNES[i + 1] + 100) / 200) * 100
          return (
            <span
              key={c}
              className="jf-palier"
              style={{ left: `${g}%`, width: `${d - g}%`, background: c, opacity: i === palierFerveur(borne) ? 1 : 0.34 }}
            />
          )
        })}
        <span className="jf-zero" />
        <span
          className="jf-curseur"
          style={{ left: `${pos}%`, background: couleur, boxShadow: `0 0 8px ${couleur}` }}
        />
      </div>
      <div className="jf-legende">
        <span style={{ color: TEINTES_FERVEUR[0] }}>−100 maudit</span>
        <span>0</span>
        <span style={{ color: TEINTES_FERVEUR[6] }}>+100 élu</span>
      </div>
    </div>
    </Astuce>
  )
}

/**
 * Les trois grâces d'un dieu, dans l'ordre où il les accorde. Une seule est
 * jamais achetable : celle qui suit la dernière prise. Les suivantes restent
 * visibles mais en retrait - on doit pouvoir viser la troisième dès la première.
 */
function ArbreDuDieu({ dieu, relation }: { dieu: GodId; relation: number }) {
  const acquises = useGame((s) => s.graces)
  const acheter = useGame((s) => s.acquerirGrace)
  const liste = GRACES[dieu]
  const prochaine = liste.find((g) => !acquises.includes(g.id))
  return (
    <div className="graces">
      <div className="graces-titre">
        Arbre de faveur - {liste.filter((g) => acquises.includes(g.id)).length}/{liste.length} accordées
      </div>
      {liste.map((g) => {
        const prise = acquises.includes(g.id)
        const offerte = !prise && prochaine?.id === g.id
        const assez = relation >= g.cout
        return (
          <Astuce
            key={g.id}
            titre={`${g.emoji} ${g.nom}`}
            resume={g.desc}
            lignes={
              prise
                ? [{ label: 'Accordée', valeur: 'définitivement', fort: true, couleur: '#12c97c' }]
                : [
                    { label: 'Prix', valeur: `${g.cout} points de relation`, fort: assez },
                    { label: 'Votre relation', valeur: Math.round(relation), couleur: assez ? '#12c97c' : '#d98a4e' },
                  ]
            }
            note={
              prise
                ? 'Le prix a été versé : le don reste, même si le dieu se refroidit ensuite.'
                : offerte
                  ? 'Verser ces points les retire de votre relation - et donc de la puissance de ses bénédictions.'
                  : 'Ses grâces se prennent dans l’ordre : celle-ci attend que la précédente soit accordée.'
            }
          >
            <div className={`grace${prise ? ' acquise' : offerte ? ' offerte' : ' lointaine'}`}>
              <span className="cran" />
              <span className="grace-emoji">{g.emoji}</span>
              <div className="grace-corps">
                <div className="grace-nom">
                  {g.nom}
                  {prise && <span style={{ color: '#12c97c', fontWeight: 400 }}> - accordée</span>}
                </div>
                <div className="grace-desc">{g.desc}</div>
              </div>
              {prise ? (
                <span className="grace-prix" style={{ color: '#12c97c' }}>
                  ✓
                </span>
              ) : offerte ? (
                <button disabled={!assez} onClick={() => acheter(g.id)}>
                  {assez ? `Obtenir (−${g.cout})` : `${Math.round(relation)}/${g.cout}`}
                </button>
              ) : (
                <span className="grace-prix">−{g.cout}</span>
              )}
            </div>
          </Astuce>
        )
      })}
    </div>
  )
}

export function Pantheon() {
  const s = useGame()
  const templeLevel = s.buildings.temple.level
  const now = s.lastSeen
  const mur = murMax(s)

  return (
    <Modale
      titre="⚡ Le Panthéon"
      dataTuto="modale-pantheon"
      onFermer={() => s.openPanel(null)}
      sous={
        <>
          Faveur : <b style={{ color: '#e8c04a' }}>{Math.floor(s.faveur)}</b>/100 - la faveur paie les bénédictions, la{' '}
          <b style={{ color: '#e8dcc0' }}>relation</b> en fixe la force.
        </>
      }
    >
      <>
        <div style={{ fontSize: 12.5, color: '#cfc4a8', marginTop: 7, lineHeight: 1.45 }}>
          Chaque dieu frappe à la mesure de votre ferveur : de <b style={{ color: '#b93a2c' }}>×0.4</b> pour un dieu
          maudit à <b style={{ color: '#e8c04a' }}>×1.6</b> pour son élu - la puissance <i>et</i> la durée. Un sacrifice
          vaut +8 de relation ; un dieu bafoué (≤ −40) frappe mou, puis finit par se venger.
          <div style={{ marginTop: 5 }}>
            La relation se <b style={{ color: '#e8dcc0' }}>dépense</b> aussi : chaque Olympien accorde trois{' '}
            <b style={{ color: '#12c97c' }}>grâces permanentes</b>, payées en points de relation et jamais reprises.
            Monter sa ferveur ou l’échanger contre un don définitif - c’est à vous.
          </div>
        </div>
        {GOD_IDS.map((g) => {
          const dieu = GODS[g]
          const etat = s.gods[g]
          const verrouille = templeLevel < dieu.temple
          const cout = coutBenediction(s, g)
          const cd = Math.max(0, etat.cooldownUntil - now)
          // c'est la relation EFFECTIVE qui compte : l'orgueil d'Agamemnon la rogne
          const rel = relationEffective(s, g)
          const force = multRelation(rel)
          const couleur = couleurFerveur(rel)
          return (
            <div key={g} className={`dieu${verrouille ? ' verrouille' : ''}`}>
              <div className="embleme">
                {dieu.emoji}
                {/* aperçu de la manifestation à la ferveur courante : le joueur
                    voit à quoi ressemble le bras du dieu avant de le payer */}
                {!verrouille && (
                  <Astuce
                    titre={`${dieu.emoji} Le bras de ${dieu.nom}`}
                    resume={`Voici à quoi ressemble sa manifestation à votre ferveur actuelle (${nomFerveur(rel)}). Elle enfle ou pâlit avec la relation - on voit ce qu’on paie avant de le payer.`}
                    note="La vignette joue la vraie manifestation en boucle, à l’échelle de la scène : un dieu offensé y avorte visiblement."
                  >
                    <div className="apercu-divin">
                      {/* c'est la ferveur EFFECTIVE qu'on montre : celle qui frappera */}
                      <ApercuDivin dieu={g} palier={palierFerveur(rel)} />
                    </div>
                  </Astuce>
                )}
              </div>
              <div className="corps">
                <h3 style={{ color: dieu.couleur }}>{dieu.nom}</h3>
                <div className="titre-dieu">{dieu.titre}</div>
                <div style={{ fontSize: 12.5, color: '#cfc4a8' }}>{dieu.desc}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginTop: 7 }}>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: couleur,
                      border: `1px solid ${couleur}66`,
                      background: '#0a141d',
                      borderRadius: 5,
                      padding: '1px 7px',
                    }}
                  >
                    {nomFerveur(rel)}
                  </span>
                  <span style={{ fontSize: 11.5, color: '#93a7b4', fontVariantNumeric: 'tabular-nums' }}>
                    relation {etat.relation > 0 ? '+' : etat.relation < 0 ? '−' : ''}
                    {Math.abs(Math.round(etat.relation))}
                    {Math.round(rel) !== Math.round(etat.relation) && (
                      <b style={{ color: '#d98a4e' }}> → {Math.round(rel)} (orgueil du roi)</b>
                    )}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: couleur, marginLeft: 'auto' }}>
                    bénédiction ×{fmtMult(force)}
                  </span>
                </div>
                <JaugeRelation relation={rel} />
                {verrouille ? (
                  <div style={{ fontSize: 12, color: '#d98a4e' }}>🏛️ Temple niveau {dieu.temple} requis</div>
                ) : (
                  <>
                    <div style={{ fontSize: 12.5, marginTop: 6 }}>
                      <b>{dieu.benediction.nom}</b>{' '}
                      <span style={{ color: '#93a7b4' }}>
                        (<Montant n={cout} id="faveur" taille={13} />{dieu.benediction.batailleUniquement ? ', en bataille' : ''})
                      </span>
                      <div style={{ color: couleur, fontWeight: 700, margin: '2px 0 1px' }}>
                        À votre ferveur : {effetChiffre(g, force, mur)}
                      </div>
                      <div style={{ color: '#7f939f', fontSize: 11.5, fontStyle: 'italic' }}>
                        {dieu.benediction.desc}
                      </div>
                    </div>
                    <div className="actions-dieu">
                      <button
                        disabled={s.faveur < cout || cd > 0 || (dieu.benediction.batailleUniquement && !s.battle)}
                        onClick={() => s.benir(g)}
                      >
                        {cd > 0 ? `⏳ ${Math.ceil(cd / 1000)}s` : `Invoquer (${cout} ✨)`}
                      </button>
                      <Astuce
                        titre={`🔥 Sacrifice à ${dieu.nom}`}
                        resume="Cinquante mesures de grain sur l’autel : +8 de relation et +5 de faveur. C’est le seul levier direct sur ce qu’un dieu pense de vous."
                        note="La relation gagnée sert deux fois : elle renforce ses bénédictions, et elle paie ses grâces."
                      >
                        <button disabled={s.resources.grain < 50} onClick={() => s.sacrifier(g)}>
                          Sacrifice (<Montant n={-50} id="grain" taille={13} />)
                        </button>
                      </Astuce>
                      {/*
                        LE TROISIÈME LEVIER. Le sacrifice se paie en grain, la grâce
                        en relation, l'hécatombe en tout - et c'est le seul des
                        trois qui engage une saison entière. Les mettre côte à côte
                        est ce qui rend la progression lisible : on sacrifie pour
                        être écouté, on est écouté pour pouvoir offrir.
                      */}
                      <Astuce
                        titre={`🔥 Hécatombe à ${dieu.nom}`}
                        resume="Cent bêtes, une fois par saison : l’effet tient jusqu’au basculement. Chaque Olympien a son rite, et ils ne se ressemblent pas."
                        note="Le troupeau saigné coûte un cinquième du grain tant que la fumée monte. Offrez au MATIN d’une saison : à son soir, le rite se refuse."
                      >
                        <button onClick={() => s.openPanel('hecatombe')}>Hécatombe…</button>
                      </Astuce>
                      {etat.relation < 0 && (
                        <span style={{ fontSize: 11.5, color: '#d98a4e', alignSelf: 'center' }}>
                          Son bras est mou tant qu’il vous garde rancune.
                        </span>
                      )}
                      {etat.relation >= 40 && (
                        <span style={{ fontSize: 11.5, color: '#dcc478', alignSelf: 'center' }}>
                          Il vous chérit : son bras est lourd.
                        </span>
                      )}
                    </div>
                    <ArbreDuDieu dieu={g} relation={rel} />
                  </>
                )}
              </div>
            </div>
          )
        })}
      </>
    </Modale>
  )
}
