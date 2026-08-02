import { GRAPHES, bornes, motPente, pente, type GrapheDef, type Releve } from '../../game/annales'
import { VILLAGES_CIBLES } from '../../game/expeditions'
import { prestigeCourant, totalEtoiles, useGame } from '../../game/store'
import { Astuce } from './Infobulle'
import { Modale } from './Modale'

/*
 * ═══════════════════ LES COURBES DU RÈGNE ═══════════════════
 *
 * Le journal racontait des faits ; il ne disait pas de quel côté penchait la
 * cité. On trace donc, à même le SVG comme tout le reste du jeu : quatre
 * graphes, une pente chiffrée par série, et une phrase qui dit ce que la courbe
 * apprend - un tracé qu'on ne sait pas lire ne vaut pas mieux qu'un ornement.
 */

const L = 520
const H = 120
const MARGE = { g: 34, d: 8, h: 8, b: 16 }

/** points d'une polyligne, en coordonnées du repère */
function chemin(valeurs: number[], bas: number, haut: number): string {
  if (valeurs.length === 0) return ''
  const w = L - MARGE.g - MARGE.d
  const h = H - MARGE.h - MARGE.b
  const pasX = valeurs.length > 1 ? w / (valeurs.length - 1) : 0
  const ech = haut > bas ? h / (haut - bas) : 0
  return valeurs
    .map((v, i) => {
      const x = MARGE.g + i * pasX
      const y = MARGE.h + h - (v - bas) * ech
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

/** un nombre court : 1240 → « 1,2 k » */
function bref(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')} k`
  return String(Math.round(n))
}

function Graphe({ def, annales }: { def: GrapheDef; annales: Releve[] }) {
  const { bas, haut } = bornes(annales, def.series, def.max)
  const w = L - MARGE.g - MARGE.d
  const h = H - MARGE.h - MARGE.b
  // quatre lignes d'horizon : assez pour situer une valeur, pas assez pour salir
  const paliers = [0, 0.25, 0.5, 0.75, 1]
  const premier = annales[0]
  const dernier = annales[annales.length - 1]
  return (
    <div className="graphe">
      <div className="graphe-tete">
        <h3>{def.titre}</h3>
        {premier && dernier && (
          <span className="graphe-periode">
            jour {premier.jour} → jour {dernier.jour}
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${L} ${H}`} className="graphe-svg" role="img" aria-label={def.titre}>
        {/* lignes d'horizon et graduations : la courbe doit se lire, pas se deviner */}
        {paliers.map((p) => {
          const y = MARGE.h + h - p * h
          return (
            <g key={p}>
              <line x1={MARGE.g} y1={y} x2={L - MARGE.d} y2={y} stroke="#243747" strokeWidth={p === 0 ? 1.2 : 0.7} />
              <text x={MARGE.g - 5} y={y + 3} textAnchor="end" fontSize={8.5} fill="#6f8494">
                {bref(bas + p * (haut - bas))}
              </text>
            </g>
          )
        })}
        {def.series.map((s) => {
          const vals = annales.map((r) => r[s.cle])
          return (
            <path
              key={s.cle}
              d={chemin(vals, bas, haut)}
              fill="none"
              stroke={s.couleur}
              strokeWidth={1.8}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )
        })}
        {/* le dernier point de chaque série, marqué : c'est là qu'on en est */}
        {def.series.map((s) => {
          const vals = annales.map((r) => r[s.cle])
          if (vals.length === 0) return null
          const x = MARGE.g + w
          const y = MARGE.h + h - ((vals[vals.length - 1] - bas) / Math.max(1e-6, haut - bas)) * h
          return <circle key={`p-${s.cle}`} cx={x} cy={y} r={2.6} fill={s.couleur} stroke="#0d1722" strokeWidth={1} />
        })}
      </svg>
      <div className="graphe-legende">
        {def.series.map((s) => {
          const p = pente(annales, s.cle)
          const val = dernier ? dernier[s.cle] : 0
          return (
            <span key={s.cle} className="legende-item">
              <i style={{ background: s.couleur }} />
              {s.nom} <b>{bref(val)}{s.unite ?? ''}</b>
              <em className={p > 0.05 ? 'monte' : p < -0.05 ? 'descend' : ''}>{motPente(p)}</em>
            </span>
          )
        })}
      </div>
      <div className="graphe-lecture">{def.lecture}</div>
    </div>
  )
}

/** un chiffre du règne, avec ce qu'il veut dire */
function Chiffre({ v, quoi, aide }: { v: string | number; quoi: string; aide?: string }) {
  return (
    <Astuce titre={`${v} ${quoi}`} resume={aide} actif={!!aide}>
      <div className="chiffre">
        <b>{v}</b>
        <span>{quoi}</span>
      </div>
    </Astuce>
  )
}

export function PanneauAnnales() {
  const s = useGame()
  const annales = s.annales ?? []
  const etoiles = totalEtoiles(s.expeditions)
  const allies = Object.keys(s.alliances ?? {}).length
  const pillages = Object.values(s.expeditions ?? {}).reduce((a, e) => a + (e.pillages ?? 0), 0)

  return (
    <Modale
      titre="📈 Annales du règne"
      onFermer={() => s.openPanel(null)}
      sous={
        annales.length < 2
          ? 'Les scribes viennent de prendre leur poste : un relevé toutes les trente secondes.'
          : `${annales.length} relevés - le règne se lit enfin en chiffres, pas seulement en récits.`
      }
    >
      <>
        <div className="chiffres-regne">
          <Chiffre v={prestigeCourant(s)} quoi="prestige" aide="La seule note finale : hauts faits + ce que la cité montre encore" />
          <Chiffre v={s.hautsFaits?.length ?? 0} quoi="hauts faits" />
          <Chiffre v={s.stats.repousses} quoi="assauts tenus" />
          <Chiffre v={s.stats.perdus} quoi="pillages subis" />
          <Chiffre v={s.stats.evenements} quoi="dilemmes tranchés" />
          <Chiffre v={`${etoiles}/${VILLAGES_CIBLES.length * 3}`} quoi="étoiles" aide="Trois par place forte de la Troade" />
          <Chiffre v={pillages} quoi="raids menés" />
          <Chiffre v={allies} quoi="alliés" />
          <Chiffre v={s.exploits?.championsAbattus ?? 0} quoi="champions abattus" aide="Les héros achéens tombés sous vos murs" />
          <Chiffre v={s.exploits?.benedictions ?? 0} quoi="bénédictions" />
          <Chiffre v={s.graces?.length ?? 0} quoi="grâces obtenues" aide="Sur douze - trois par Olympien" />
          <Chiffre v={s.exploits?.pertesCiviles ?? 0} quoi="habitants perdus" />
        </div>

        {annales.length < 2 ? (
          <p style={{ color: '#93a7b4', marginTop: 14, lineHeight: 1.5 }}>
            Rien à tracer encore. Laissez tourner le village une minute : les scribes relèvent greniers, garnison,
            menace et ambiance toutes les trente secondes, et les courbes apparaîtront ici.
          </p>
        ) : (
          GRAPHES.map((g) => <Graphe key={g.id} def={g} annales={annales} />)
        )}
      </>
    </Modale>
  )
}
