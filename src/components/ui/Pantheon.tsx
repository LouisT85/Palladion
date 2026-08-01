import { GODS, GOD_IDS, multRelation, nomFerveur, palierFerveur } from '../../game/data'
import { coutBenediction, murMax, relationEffective, useGame } from '../../game/store'
import type { GodId } from '../../game/types'
import { ApercuDivin } from '../map/EffetsDivins'
import { Montant } from './Icones'
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
  '#8e1410', // maudit — rouge presque noir
  '#c0392b', // offensé
  '#e07b39', // contrarié
  '#9aa3a8', // indifférent — gris terne, sans intention
  '#8fbf5a', // en grâce
  '#3fae6d', // chéri
  '#12c97c', // élu — vert éclatant
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
      return `+${s(60 * force)} % d’attaque pendant ${s(25 * force)} s — hors bataille : recrues pressées pendant ${s(60 * force)} s`
  }
}

/** bornes des sept paliers, en points de relation — sert à découper le rail */
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
    <div style={{ margin: '9px 0 3px' }} title={`Relation : ${Math.round(relation)}`}>
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
          Faveur : <b style={{ color: '#e8c04a' }}>{Math.floor(s.faveur)}</b>/100 — la faveur paie les bénédictions, la{' '}
          <b style={{ color: '#e8dcc0' }}>relation</b> en fixe la force.
        </>
      }
    >
      <>
        <div style={{ fontSize: 12.5, color: '#cfc4a8', marginTop: 7, lineHeight: 1.45 }}>
          Chaque dieu frappe à la mesure de votre ferveur : de <b style={{ color: '#b93a2c' }}>×0.4</b> pour un dieu
          maudit à <b style={{ color: '#e8c04a' }}>×1.6</b> pour son élu — la puissance <i>et</i> la durée. Un sacrifice
          vaut +8 de relation ; un dieu bafoué (≤ −40) frappe mou, puis finit par se venger.
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
                  <div className="apercu-divin" title={`Manifestation de ${dieu.nom} à votre ferveur actuelle`}>
                    <ApercuDivin dieu={g} palier={palierFerveur(etat.relation)} taille={74} />
                  </div>
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
                      <button disabled={s.resources.grain < 50} onClick={() => s.sacrifier(g)} title="+8 relation, +5 faveur">
                        Sacrifice (<Montant n={-50} id="grain" taille={13} />)
                      </button>
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
