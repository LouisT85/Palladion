import { useRef, useState } from 'react'
import { ACTES_CAMPAGNE } from '../../game/campagne'
import {
  effacerEmplacement,
  emplacementActif,
  exporterTexte,
  importerTexte,
  lireResumes,
  nomFichier,
  type ResumeEmplacement,
} from '../../game/sauvegardes'
import { useGame } from '../../game/store'
import { Modale } from './Modale'

/*
 * LES TROIS EMPLACEMENTS.
 *
 * Une seule partie tenait dans le navigateur, et rien n'en sortait : dix heures
 * de règne dépendaient d'une case à cocher dans les préférences de Chrome. Ce
 * panneau donne trois cases, un fichier à emporter, et un fichier à relire.
 *
 * Deux précautions, parce qu'on manipule ici ce qui ne se rejoue pas :
 *  · on SAUVEGARDE avant toute bascule (c'est le store qui s'en charge) ;
 *  · effacer et importer par-dessus demandent une confirmation nommée.
 */

/** « il y a 3 min », « hier », « le 28/07 » - une date lisible sans réfléchir */
function quand(t: number | null): string {
  if (!t) return ''
  const min = Math.floor((Date.now() - t) / 60_000)
  if (min < 1) return 'à l’instant'
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = new Date(t)
  return `le ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function Fiche({
  r,
  actif,
  onJouer,
  onExporter,
  onImporter,
  onEffacer,
}: {
  r: ResumeEmplacement
  actif: boolean
  onJouer: () => void
  onExporter: () => void
  onImporter: () => void
  onEffacer: () => void
}) {
  const [confirme, setConfirme] = useState(false)
  const acte = r.acte !== null ? ACTES_CAMPAGNE[r.acte - 1] : null
  return (
    <div className={`emplacement${actif ? ' actif' : ''}${r.occupe ? '' : ' libre'}`}>
      <div className="emp-tete">
        <span className="emp-num">{r.index + 1}</span>
        <div className="emp-corps">
          {r.occupe ? (
            <>
              <b>
                {acte ? `${acte.emoji} ${acte.titre}` : '🌾 Bac à sable'}
                {actif && <span className="emp-actif">en cours</span>}
              </b>
              <div className="emp-detail">
                Jour {r.jour} · {r.pop} habitants · {r.niveaux} niveaux bâtis
                <span className="emp-quand">{quand(r.vuLe)}</span>
              </div>
            </>
          ) : (
            <>
              <b>Emplacement libre</b>
              <div className="emp-detail">Aucun village ici - une nouvelle cité peut s’y élever.</div>
            </>
          )}
        </div>
      </div>
      <div className="emp-actions">
        {!actif && (
          <button className="principal" onClick={onJouer}>
            {r.occupe ? '▶ Reprendre' : '＋ Nouvelle partie'}
          </button>
        )}
        {r.occupe && <button onClick={onExporter}>⬇ Exporter</button>}
        <button onClick={onImporter}>⬆ Importer</button>
        {r.occupe &&
          !actif &&
          (confirme ? (
            <>
              <button className="danger" onClick={onEffacer}>
                Effacer pour de bon
              </button>
              <button onClick={() => setConfirme(false)}>Garder</button>
            </>
          ) : (
            <button className="danger" onClick={() => setConfirme(true)}>
              🔥 Effacer
            </button>
          ))}
      </div>
    </div>
  )
}

export function PanneauSauvegardes() {
  const openPanel = useGame((s) => s.openPanel)
  const changer = useGame((s) => s.changerEmplacement)
  const sauver = useGame((s) => s.save)
  // la partie en cours doit être sur le disque avant qu'on ne la résume
  const [resumes, setResumes] = useState(() => {
    sauver()
    return lireResumes()
  })
  const [actif, setActif] = useState(emplacementActif)
  const [message, setMessage] = useState<{ txt: string; ok: boolean } | null>(null)
  const fichier = useRef<HTMLInputElement | null>(null)
  const cible = useRef(0)

  const rafraichir = () => {
    setResumes(lireResumes())
    setActif(emplacementActif())
  }

  const exporter = (i: number) => {
    const texte = exporterTexte(i)
    if (!texte) return setMessage({ txt: 'Cet emplacement est vide.', ok: false })
    /*
     * Téléchargement sans dépendance : un Blob, une URL éphémère, un clic
     * simulé. On révoque l'URL derrière soi - un objet oublié garde la
     * sauvegarde entière en mémoire jusqu'à la fermeture de l'onglet.
     */
    const url = URL.createObjectURL(new Blob([texte], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = nomFichier(resumes[i])
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ txt: `Emplacement ${i + 1} exporté.`, ok: true })
  }

  const demanderFichier = (i: number) => {
    cible.current = i
    fichier.current?.click()
  }

  const lireFichier = async (f: File | undefined) => {
    if (!f) return
    const texte = await f.text()
    const issue = importerTexte(texte, cible.current)
    if (!issue.ok) return setMessage({ txt: issue.raison, ok: false })
    rafraichir()
    setMessage({ txt: `Partie importée dans l’emplacement ${cible.current + 1}.`, ok: true })
  }

  return (
    <Modale
      titre="💾 Vos parties"
      onFermer={() => openPanel(null)}
      sous="Trois emplacements dans ce navigateur, et un fichier pour emporter une partie ailleurs. La partie en cours est rangée avant toute bascule."
    >
      <>
        {resumes.map((r) => (
          <Fiche
            key={r.index}
            r={r}
            actif={r.index === actif}
            onJouer={() => {
              changer(r.index)
              rafraichir()
              openPanel(null)
            }}
            onExporter={() => exporter(r.index)}
            onImporter={() => demanderFichier(r.index)}
            onEffacer={() => {
              effacerEmplacement(r.index)
              rafraichir()
              setMessage({ txt: `Emplacement ${r.index + 1} effacé.`, ok: true })
            }}
          />
        ))}
        {message && <div className={`emp-message${message.ok ? ' ok' : ' ko'}`}>{message.txt}</div>}
        <div className="emp-note">
          Un fichier exporté est du texte : on peut le garder, l’envoyer, le remettre plus tard. À l’import, il est
          contrôlé avant d’écrire quoi que ce soit - un fichier qui n’est pas une partie de PALLADION ne remplacera
          jamais la vôtre.
        </div>
        <input
          ref={fichier}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            void lireFichier(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </>
    </Modale>
  )
}
