import { DELAI_ORDRE_MS, EFFETS_LIGNE, EFFETS_TIR, ORDRES_NEUTRES, estTireur } from '../../game/combat'
import { UNITS } from '../../game/data'
import { useGame } from '../../game/store'
import type { BattleState, OrdreLigne, OrdreTir, UnitId } from '../../game/types'

/*
 * ═══════════════════ LA BARRE D'ORDRES ═══════════════════
 *
 * On regardait la bataille. Les bénédictions mises à part, rien de ce que
 * faisait le joueur pendant l'assaut ne changeait ce que faisaient ses hommes —
 * l'issue était décidée au moment où la vague se formait.
 *
 * Trois postures, deux façons de tirer, et un pan de mur assignable par type
 * d'unité. La barre montre en toutes lettres ce que chaque ordre coûte : un
 * bouton qui ne dirait que « Charger » ne serait qu'un bouton de plus.
 */

/** raccourci d'un nom de secteur : « Mur du nord » → « Nord » */
function court(nom: string): string {
  const m = nom.match(/(est|sud|nord|ouest)/i)
  return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() : nom.slice(0, 4)
}

/** les types d'unité du joueur réellement présents dans cette bataille */
function typesEngages(b: BattleState): UnitId[] {
  const vus = new Set<UnitId>()
  for (const f of b.fighters) {
    if (f.camp !== b.campJoueur || f.heros || f.etat === 'mort') continue
    if (f.type in UNITS) vus.add(f.type as UnitId)
  }
  return (Object.keys(UNITS) as UnitId[]).filter((u) => vus.has(u))
}

export function BarreOrdres() {
  // la bataille où le joueur a des hommes : défense du village ou expédition
  const b = useGame((s) => s.battle ?? (s.expedition && !s.expedition.result ? s.expedition.battle : null))
  const donnerOrdre = useGame((s) => s.donnerOrdre)
  const assigner = useGame((s) => s.assignerSecteur)
  const now = useGame((s) => s.lastSeen)
  if (!b || b.result) return null

  const o = b.ordres ?? ORDRES_NEUTRES
  const attente = Math.max(0, o.prochainAt - now)
  const gele = attente > 0
  // la barre du délai : on voit l'ordre « prendre » avant de pouvoir en changer
  const part = gele ? 1 - attente / DELAI_ORDRE_MS : 1

  const types = typesEngages(b)
  const parPan = b.secteurs.length > 1

  return (
    <div className="ordres" data-tuto="ordres">
      <div className="ordres-tete">
        <span>⚑ Ordres à la troupe</span>
        {gele ? (
          <span className="ordres-delai" title="Un ordre se tient : la troupe ne change pas d’avis à chaque coup porté">
            <i style={{ width: `${Math.round(part * 100)}%` }} />
            {Math.ceil(attente / 1000)} s
          </span>
        ) : (
          <span className="ordres-pret">à vos ordres</span>
        )}
      </div>

      <div className="ordres-rangee">
        {(Object.keys(EFFETS_LIGNE) as OrdreLigne[]).map((id) => {
          const e = EFFETS_LIGNE[id]
          const actif = o.ligne === id
          return (
            <button
              key={id}
              className={`ordre${actif ? ' actif' : ''}`}
              disabled={gele && !actif}
              onClick={() => donnerOrdre('ligne', id)}
              title={e.desc}
            >
              <b>{e.emoji}</b> {e.nom}
            </button>
          )
        })}
      </div>
      <div className="ordres-desc">{EFFETS_LIGNE[o.ligne].desc}</div>

      <div className="ordres-rangee">
        {(Object.keys(EFFETS_TIR) as OrdreTir[]).map((id) => {
          const e = EFFETS_TIR[id]
          const actif = o.tir === id
          return (
            <button
              key={id}
              className={`ordre${actif ? ' actif' : ''}`}
              disabled={gele && !actif}
              onClick={() => donnerOrdre('tir', id)}
              title={e.desc}
            >
              <b>{e.emoji}</b> {e.nom}
            </button>
          )
        })}
        {/* sans un homme sur le rempart, l'ordre de tir ne commande personne */}
        {!types.some((u) => estTireur(u)) && <span className="ordres-note">aucun tireur en ligne</span>}
      </div>

      {/*
       * Assignation par pan. Elle n'a de sens qu'à partir de deux fronts : sur un
       * assaut simple, tout le monde est déjà au même endroit.
       */}
      {parPan && types.length > 0 && (
        <div className="ordres-secteurs">
          <div className="ordres-titre">Tenir un pan — ces hommes n’en bougeront plus</div>
          <div className="ordres-grille">
            {types.map((u) => (
              <div key={u} className="ordres-ligne-unite">
                <span className="ordres-unite" title={UNITS[u].nom}>
                  {UNITS[u].emoji}
                </span>
                <button
                  className={`pan${o.secteurs[u] === undefined ? ' actif' : ''}`}
                  onClick={() => assigner(u, null)}
                  title="Au plus pressé : ils courent là où ça cède"
                >
                  Auto
                </button>
                {b.secteurs.map((sec, i) => (
                  <button
                    key={sec.nom}
                    className={`pan${o.secteurs[u] === i ? ' actif' : ''}${sec.breche ? ' perce' : ''}`}
                    onClick={() => assigner(u, i)}
                    title={`${sec.nom}${sec.breche ? ' — percé' : ` — ${Math.round((sec.hp / Math.max(1, sec.max)) * 100)} %`}`}
                  >
                    {court(sec.nom)}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
