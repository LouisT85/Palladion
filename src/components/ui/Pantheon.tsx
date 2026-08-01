import { GODS, GOD_IDS, WALL_HP, multRelation, nomFerveur, palierFerveur } from '../../game/data'
import { coutBenediction, useGame } from '../../game/store'
import type { GodId } from '../../game/types'
import { ApercuDivin } from '../map/EffetsDivins'

/** ×1.60 → « 1.6 », ×1.00 → « 1 » : on ne montre que les décimales qui portent du sens */
function fmtMult(f: number): string {
  return f
    .toFixed(2)
    .replace(/0$/, '')
    .replace(/\.$/, '')
}

/** couleur du palier de ferveur — du rouge sang au vieil or */
function couleurFerveur(relation: number): string {
  if (relation >= 70) return '#e8c04a'
  if (relation >= 40) return '#dcc478'
  if (relation >= 15) return '#5fae7d'
  if (relation > -15) return '#93a7b4'
  if (relation > -40) return '#d98a4e'
  if (relation > -70) return '#d05a41'
  return '#b93a2c'
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

/** Jauge de relation : graduations tous les 25 points, zéro marqué, curseur coloré. */
function JaugeRelation({ relation }: { relation: number }) {
  const borne = Math.max(-100, Math.min(100, relation))
  const pos = ((borne + 100) / 200) * 100
  const couleur = couleurFerveur(borne)
  const depuis = Math.min(50, pos)
  const largeur = Math.abs(pos - 50)
  return (
    <div style={{ margin: '9px 0 3px' }} title={`Relation : ${relation}`}>
      <div
        style={{
          position: 'relative',
          height: 12,
          borderRadius: 6,
          background: '#0a141d',
          border: '1px solid #2c4258',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 1,
            bottom: 1,
            left: `${depuis}%`,
            width: `${largeur}%`,
            background: couleur,
            borderRadius: 3,
            transition: 'left 0.3s, width 0.3s, background 0.3s',
          }}
        />
        {[12.5, 25, 37.5, 62.5, 75, 87.5].map((x) => (
          <div
            key={x}
            style={{ position: 'absolute', left: `${x}%`, top: 3, bottom: 3, width: 1, background: '#41586c' }}
          />
        ))}
        <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1.5, background: '#7a92a6' }} />
        <div
          style={{
            position: 'absolute',
            left: `${pos}%`,
            top: -4,
            width: 6,
            height: 18,
            background: couleur,
            border: '1px solid #0a141d',
            borderRadius: 3,
            transform: 'translateX(-50%)',
            boxShadow: '0 0 6px #000a',
            transition: 'left 0.3s, background 0.3s',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6f8494', marginTop: 2 }}>
        <span>−100 maudit</span>
        <span>0</span>
        <span>+100 élu</span>
      </div>
    </div>
  )
}

export function Pantheon() {
  const s = useGame()
  const templeLevel = s.buildings.temple.level
  const now = s.lastSeen
  const murMax = WALL_HP[s.buildings.remparts.level]

  return (
    <div className="voile" onClick={() => s.openPanel(null)}>
      <div className="modale" onClick={(e) => e.stopPropagation()}>
        <h2>⚡ Le Panthéon</h2>
        <div style={{ color: '#93a7b4', fontSize: 13 }}>
          Faveur : <b style={{ color: '#e8c04a' }}>{Math.floor(s.faveur)}</b>/100 — la faveur paie les bénédictions, la{' '}
          <b style={{ color: '#e8dcc0' }}>relation</b> en fixe la force.
        </div>
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
          const force = multRelation(etat.relation)
          const couleur = couleurFerveur(etat.relation)
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
                    {nomFerveur(etat.relation)}
                  </span>
                  <span style={{ fontSize: 11.5, color: '#93a7b4', fontVariantNumeric: 'tabular-nums' }}>
                    relation {etat.relation > 0 ? '+' : etat.relation < 0 ? '−' : ''}
                    {Math.abs(Math.round(etat.relation))}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: couleur, marginLeft: 'auto' }}>
                    bénédiction ×{fmtMult(force)}
                  </span>
                </div>
                <JaugeRelation relation={etat.relation} />
                {verrouille ? (
                  <div style={{ fontSize: 12, color: '#d98a4e' }}>🏛️ Temple niveau {dieu.temple} requis</div>
                ) : (
                  <>
                    <div style={{ fontSize: 12.5, marginTop: 6 }}>
                      <b>{dieu.benediction.nom}</b>{' '}
                      <span style={{ color: '#93a7b4' }}>
                        ({cout} ✨{dieu.benediction.batailleUniquement ? ', en bataille' : ''})
                      </span>
                      <div style={{ color: couleur, fontWeight: 700, margin: '2px 0 1px' }}>
                        À votre ferveur : {effetChiffre(g, force, murMax)}
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
                        Sacrifice (−50 🌾)
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
        <button style={{ width: '100%', marginTop: 14 }} onClick={() => s.openPanel(null)}>
          Fermer
        </button>
      </div>
    </div>
  )
}
