import { DELAI_ORDRE_MS, EFFETS_LIGNE, EFFETS_TIR, ORDRES_NEUTRES, estTireur } from '../../game/combat'
import { UNITS } from '../../game/data'
import { useGame } from '../../game/store'
import type { BattleState, OrdreLigne, OrdreTir, UnitId } from '../../game/types'
import { Astuce } from './Infobulle'

/*
 * ═══════════════════ LA BARRE D'ORDRES ═══════════════════
 *
 * On regardait la bataille. Les bénédictions mises à part, rien de ce que
 * faisait le joueur pendant l'assaut ne changeait ce que faisaient ses hommes.
 *
 * Trois postures, deux façons de tirer, un pan de mur assignable par unité. La
 * difficulté n'est pas de les offrir : c'est de les offrir SANS manger l'écran.
 * Première version : trois rangées de boutons larges, une phrase d'explication
 * en permanence, une ligne par type d'unité. Le bandeau faisait trois cents
 * pixels de haut et couvrait la moitié de la plaine, au moment précis où l'on a
 * besoin de la voir.
 *
 * Ici tout tient en deux rangées :
 *
 *  · les ordres sont des JETONS courts (emoji + un mot), sur une seule ligne ;
 *  · ce que chacun coûte et rapporte vit dans son astuce, au survol - pas en
 *    permanence sous les yeux ;
 *  · l'assignation des pans se REPLIE : on ne l'ouvre que le jour où l'on a
 *    trois fronts et qu'on veut vraiment répartir sa garnison.
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
  const types = typesEngages(b)
  const tireurs = types.some((u) => estTireur(u))
  const parPan = b.secteurs.length > 1 && types.length > 0
  // un pan assigné se voit sans déplier : le compteur le dit
  const assignes = types.filter((u) => o.secteurs[u] !== undefined).length

  return (
    <div className="ordres" data-tuto="ordres">
      <div className="ordres-rangee">
        <span className="ordres-etiquette">⚑ Ligne</span>
        {(Object.keys(EFFETS_LIGNE) as OrdreLigne[]).map((id) => {
          const e = EFFETS_LIGNE[id]
          const actif = o.ligne === id
          return (
            <Astuce
              key={id}
              titre={`${e.emoji} ${e.nom}`}
              resume={e.desc}
              note={
                gele && !actif
                  ? `Un ordre se tient : ${Math.ceil(attente / 1000)} s avant d’en changer.`
                  : actif
                    ? 'Posture en cours.'
                    : undefined
              }
            >
              <button
                className={`ordre${actif ? ' actif' : ''}`}
                disabled={gele && !actif}
                onClick={() => donnerOrdre('ligne', id)}
              >
                {e.emoji} {e.nom.split(' ')[0]}
              </button>
            </Astuce>
          )
        })}
        {gele && (
          <span className="ordres-delai" style={{ ['--part' as string]: `${100 - (attente / DELAI_ORDRE_MS) * 100}%` }}>
            {Math.ceil(attente / 1000)} s
          </span>
        )}
      </div>

      <div className="ordres-rangee">
        <span className="ordres-etiquette">🏹 Tir</span>
        {(Object.keys(EFFETS_TIR) as OrdreTir[]).map((id) => {
          const e = EFFETS_TIR[id]
          const actif = o.tir === id
          return (
            <Astuce
              key={id}
              titre={`${e.emoji} ${e.nom}`}
              resume={e.desc}
              note={tireurs ? undefined : 'Aucun tireur en ligne : cet ordre ne commande personne pour l’instant.'}
            >
              <button
                className={`ordre${actif ? ' actif' : ''}${tireurs ? '' : ' muet'}`}
                disabled={gele && !actif}
                onClick={() => donnerOrdre('tir', id)}
              >
                {e.emoji} {id === 'tendu' ? 'Tendu' : 'Cloche'}
              </button>
            </Astuce>
          )
        })}

        {/*
          L'assignation par pan n'a de sens qu'à partir de deux fronts, et elle
          n'intéresse qu'un joueur qui veut vraiment répartir sa garnison. Elle
          se replie donc derrière un jeton, au lieu d'occuper cinq lignes.
        */}
        {parPan && (
          <Astuce
            titre="⚔ Tenir un pan"
            resume="Assignez un type d’unité à un secteur : ces hommes-là s’y postent et n’y frappent que ce qui l’assaille. C’est la seule réponse à un assaut sur trois fronts quand on n’a qu’une garnison."
          >
            <details className="ordres-pans">
              <summary>
                ⚔ Pans{assignes > 0 ? ` · ${assignes}` : ''}
              </summary>
              <div className="ordres-grille">
                {types.map((u) => (
                  <div key={u} className="ordres-ligne-unite">
                    <Astuce titre={`${UNITS[u].emoji} ${UNITS[u].nom}`} resume={UNITS[u].desc}>
                      <span className="ordres-unite">{UNITS[u].emoji}</span>
                    </Astuce>
                    <button
                      className={`pan${o.secteurs[u] === undefined ? ' actif' : ''}`}
                      onClick={() => assigner(u, null)}
                    >
                      Auto
                    </button>
                    {b.secteurs.map((sec, i) => (
                      <Astuce
                        key={sec.nom}
                        titre={sec.nom}
                        resume={
                          sec.breche
                            ? 'Ce pan est percé : l’ennemi entre par là.'
                            : `Structure : ${Math.round((sec.hp / Math.max(1, sec.max)) * 100)} %.`
                        }
                      >
                        <button
                          className={`pan${o.secteurs[u] === i ? ' actif' : ''}${sec.breche ? ' perce' : ''}`}
                          onClick={() => assigner(u, i)}
                        >
                          {court(sec.nom)}
                        </button>
                      </Astuce>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          </Astuce>
        )}
      </div>
    </div>
  )
}
