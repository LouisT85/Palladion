import { GODS } from '../../game/data'
import {
  COUT_FAVEUR_HECATOMBE,
  COUT_HECATOMBE,
  RESTE_MINIMUM_MS,
  RITES_HECATOMBE,
  SAISON_MS,
  motifRefus,
  refusHecatombe,
  resteDeSaison,
  riteActif,
} from '../../game/hecatombe'
import { SAISONS } from '../../game/saisons'
import { peutPayer, relationEffective, useGame } from '../../game/store'
import type { GodId } from '../../game/types'
import { Montant } from './Icones'
import { Modale } from './Modale'

/*
 * ═══════════════════════ LE PANNEAU DE L'HÉCATOMBE ═══════════════════════
 *
 * Un panneau de rite doit apprendre trois choses, et dans cet ordre :
 *
 *  1. COMBIEN DE TEMPS IL RESTE. C'est la donnée qui décide, et elle est la seule
 *     que le joueur ne peut pas deviner : l'effet dure jusqu'au basculement, donc
 *     offrir tôt vaut deux fois offrir tard. La jauge est en tête, et elle passe
 *     en teinte d'alerte sous le dernier cinquième - là où le rite se refuse.
 *  2. CE QU'ON RENONCE À FAIRE. Quatre rites, un seul par saison : les quatre sont
 *     donc montrés ENSEMBLE, avec leurs effets chiffrés. Un panneau qui n'aurait
 *     affiché que le rite choisi aurait caché l'arbitrage, qui est tout le sujet.
 *  3. POURQUOI C'EST REFUSÉ. Chaque carte grisée dit son motif. Un bouton éteint
 *     sans raison affichée est la première cause d'abandon d'un panneau de ce jeu.
 *
 * AUCUN BOUTON NOUVEAU DANS LA BARRE DU HAUT. Elle en compte déjà dix, et la
 * navigation des encarts a déjà été jugée peu fluide : on entre ici par le
 * TEMPLE - qui rassemble ses quatre usages - et par le PANTHÉON, qui met les
 * trois leviers divins côte à côte (sacrifice à cinquante mesures, grâce payée en
 * relation, hécatombe payée en tout).
 */

/** la jauge de ce qu'il reste de saison : la donnée qui décide */
function BandeauSaison() {
  const saison = useGame((s) => s.saison)
  const createdAt = useGame((s) => s.createdAt)
  const now = Date.now()
  const reste = resteDeSaison(now, createdAt)
  const part = Math.max(0, Math.min(1, reste / SAISON_MS))
  const tard = reste < RESTE_MINIMUM_MS
  const min = Math.floor(reste / 60_000)
  const sec = Math.floor((reste % 60_000) / 1000)
  const def = SAISONS[saison]
  return (
    <div className={`hec-saison${tard ? ' tard' : ''}`}>
      <div className="hec-saison-tete">
        <span>
          {def.emoji} {def.nom}
        </span>
        <span className="hec-reste">
          {tard ? 'trop tard pour offrir' : `${min} min ${String(sec).padStart(2, '0')} s d’effet`}
        </span>
      </div>
      <div className="hec-jauge">
        <div className="hec-jauge-plein" style={{ width: `${Math.round(part * 100)}%` }} />
        {/* le seuil de refus, matérialisé : c'est lui qui apprend à offrir tôt */}
        <div className="hec-jauge-seuil" style={{ left: `${Math.round((RESTE_MINIMUM_MS / SAISON_MS) * 100)}%` }} />
      </div>
      <div className="hec-note">
        L’effet tient jusqu’au basculement de saison : offrir au matin d’une saison vaut deux fois offrir à son soir.
      </div>
    </div>
  )
}

/** le rite qui brûle : ce qu'on a payé, et ce qu'il reste à en tirer */
function RiteActif({ dieu }: { dieu: GodId }) {
  const rite = RITES_HECATOMBE[dieu]
  return (
    <div className="hec-actif">
      <div className="hec-actif-tete">
        <span className="hec-emoji">{rite.emoji}</span>
        <div>
          <div className="hec-nom">{rite.nom}</div>
          <div className="hec-dieu">
            La fumée monte vers {GODS[dieu].nom} — {GODS[dieu].titre}
          </div>
        </div>
      </div>
      <ul className="hec-effets">
        {rite.effets.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
      {rite.effet.romptSiGuerre && (
        <div className="hec-avertit">
          ⚡ Zeus Xenios juge les serments : lancer une expédition rompt cette trêve et vous coûtera sa relation.
        </div>
      )}
    </div>
  )
}

/** une carte de rite, offrable ou grisée AVEC SON MOTIF */
function CarteRite({ dieu, onOffrir }: { dieu: GodId; onOffrir: (d: GodId) => void }) {
  const s = useGame()
  const rite = RITES_HECATOMBE[dieu]
  const refus = refusHecatombe(
    {
      temple: s.buildings.temple.level,
      relation: relationEffective(s, dieu),
      faveur: s.faveur,
      hecatombe: s.hecatombe,
      now: Date.now(),
      createdAt: s.createdAt,
    },
    dieu,
  )
  const payable = peutPayer(s.resources, COUT_HECATOMBE)
  const bloque = refus !== null || !payable
  return (
    <div className={`hec-carte${bloque ? ' bloquee' : ''}`}>
      <div className="hec-carte-tete">
        <span className="hec-emoji">{rite.emoji}</span>
        <div>
          <div className="hec-nom">{rite.nom}</div>
          <div className="hec-dieu">{GODS[dieu].nom}</div>
        </div>
      </div>
      <div className="hec-desc">{rite.desc}</div>
      <div className="hec-promesse">{rite.promesse}</div>
      <ul className="hec-effets">
        {rite.effets.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
      <div className="hec-prix">
        <Montant n={-(COUT_HECATOMBE.grain ?? 0)} id="grain" taille={13} />
        <Montant n={-(COUT_HECATOMBE.bronze ?? 0)} id="bronze" taille={13} />
        <span className="hec-faveur">−{COUT_FAVEUR_HECATOMBE} ✨</span>
      </div>
      <button className="principal" style={{ width: '100%' }} disabled={bloque} onClick={() => onOffrir(dieu)}>
        Offrir cent bêtes
      </button>
      {refus !== null && <div className="hec-motif">{motifRefus(refus, dieu)}</div>}
      {refus === null && !payable && <div className="hec-motif">Vos greniers et vos coffres n’y suffisent pas.</div>}
    </div>
  )
}

const DIEUX: GodId[] = ['zeus', 'poseidon', 'athena', 'ares']

export function PanneauHecatombe({ onFermer }: { onFermer: () => void }) {
  const s = useGame()
  const actif = riteActif(s.hecatombe, Date.now(), s.createdAt)
  return (
    <Modale
      titre="🔥 L’hécatombe"
      onFermer={onFermer}
      sous="Cent bêtes sur l’autel, une fois par saison. Le rite engage la saison entière - et le troupeau saigné se paiera en grain."
    >
      <div className="hecatombe">
        <BandeauSaison />
        {actif ? (
          <>
            <RiteActif dieu={actif.dieu} />
            <div className="hec-note">
              On n’offre qu’une hécatombe par saison. Les trois autres rites attendront le basculement.
            </div>
          </>
        ) : (
          <div className="hec-cartes">
            {DIEUX.map((g) => (
              <CarteRite key={g} dieu={g} onOffrir={(d) => s.offrirHecatombe(d)} />
            ))}
          </div>
        )}
      </div>
    </Modale>
  )
}
