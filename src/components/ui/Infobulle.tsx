import { useEffect, useRef, useState, type ReactNode } from 'react'

/*
 * L'infobulle du bandeau du haut.
 *
 * L'attribut `title` du navigateur ne convenait pas : une seconde d'attente,
 * une seule ligne grise, aucune mise en forme, et il disparaît au moindre
 * mouvement. Or c'est là qu'on explique à quoi sert une jauge - donc là qu'il
 * faut de la place, des chiffres alignés et de la couleur.
 *
 * L'encart est rendu en position fixe sous le jeton, recalé pour ne jamais
 * sortir de l'écran, et il n'intercepte aucun clic.
 */

export interface LigneInfo {
  label: string
  valeur: ReactNode
  /** met la ligne en avant : c'est le chiffre qui compte */
  fort?: boolean
  couleur?: string
}

export function Infobulle({
  titre,
  emoji,
  resume,
  lignes,
  note,
  children,
  className,
  dataTuto,
}: {
  titre: string
  emoji?: ReactNode
  /** une phrase : à quoi ça sert, en français */
  resume?: ReactNode
  lignes?: LigneInfo[]
  /** l'avertissement ou le conseil, en bas de l'encart */
  note?: ReactNode
  children: ReactNode
  className?: string
  /** cible du tutoriel : c'est cet élément que Zeus met en lumière */
  dataTuto?: string
}) {
  const [ouvert, setOuvert] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const ancre = useRef<HTMLSpanElement | null>(null)
  const bulle = useRef<HTMLDivElement | null>(null)

  // recalage : l'encart suit son jeton mais ne déborde jamais de la fenêtre
  useEffect(() => {
    if (!ouvert || !ancre.current) return
    const placer = () => {
      const a = ancre.current?.getBoundingClientRect()
      if (!a) return
      const largeur = bulle.current?.offsetWidth ?? 280
      const x = Math.max(8, Math.min(window.innerWidth - largeur - 8, a.left + a.width / 2 - largeur / 2))
      setPos({ x, y: a.bottom + 8 })
    }
    placer()
    window.addEventListener('scroll', placer, true)
    window.addEventListener('resize', placer)
    return () => {
      window.removeEventListener('scroll', placer, true)
      window.removeEventListener('resize', placer)
    }
  }, [ouvert])

  return (
    <span
      ref={ancre}
      className={className}
      data-tuto={dataTuto}
      onPointerEnter={() => setOuvert(true)}
      onPointerLeave={() => setOuvert(false)}
      onFocus={() => setOuvert(true)}
      onBlur={() => setOuvert(false)}
    >
      {children}
      {ouvert && (
        <div
          ref={bulle}
          className="infobulle"
          role="tooltip"
          style={pos ? { left: pos.x, top: pos.y } : { opacity: 0 }}
        >
          <div className="ib-titre">
            {emoji && <span className="ib-emoji">{emoji}</span>}
            {titre}
          </div>
          {resume && <div className="ib-resume">{resume}</div>}
          {lignes && lignes.length > 0 && (
            <div className="ib-lignes">
              {lignes.map((l) => (
                <div key={l.label} className={`ib-ligne${l.fort ? ' fort' : ''}`}>
                  <span className="ib-label">{l.label}</span>
                  <span className="ib-valeur" style={l.couleur ? { color: l.couleur } : undefined}>
                    {l.valeur}
                  </span>
                </div>
              ))}
            </div>
          )}
          {note && <div className="ib-note">{note}</div>}
        </div>
      )}
    </span>
  )
}
