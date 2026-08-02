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

/**
 * Place l'encart sous son ancre sans jamais le laisser sortir de l'écran. Quand
 * l'ancre ne produit pas de boîte (`display: contents`, cf. `Astuce`), on mesure
 * son premier enfant : c'est lui qu'on survole vraiment.
 */
function placerSous(
  ancre: HTMLElement | null,
  largeur: number,
  hauteur: number,
): { x: number; y: number } | null {
  const boite = ancre?.getBoundingClientRect()
  const a = boite && boite.width > 0 ? boite : (ancre?.firstElementChild as HTMLElement | null)?.getBoundingClientRect()
  if (!a) return null
  const x = Math.max(8, Math.min(window.innerWidth - largeur - 8, a.left + a.width / 2 - largeur / 2))
  // sous l'ancre, sauf s'il n'y a plus de place en bas : alors au-dessus
  const enBas = a.bottom + 8
  const y = enBas + hauteur > window.innerHeight - 8 ? Math.max(8, a.top - hauteur - 8) : enBas
  return { x, y }
}

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
      const p = placerSous(ancre.current, bulle.current?.offsetWidth ?? 288, bulle.current?.offsetHeight ?? 120)
      if (p) setPos(p)
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

/*
 * ═══════════════════ L'ASTUCE ═══════════════════
 *
 * La même chose, mais posable N'IMPORTE OÙ. `Infobulle` enveloppe son contenu
 * dans un `<span>` : parfait pour un jeton du bandeau, désastreux autour d'un
 * bouton dans une grille - la boîte du span s'intercale et la mise en page
 * saute. `Astuce` s'efface du flux (`display: contents`) : l'élément habillé
 * reste exactement là où il était, et c'est SA boîte qui sert d'ancre.
 *
 * C'est ce qui permet de retirer les `title` du navigateur partout - cette
 * chose blanche, en retard d'une seconde, illisible et impossible à mettre en
 * forme - sans réécrire une seule mise en page.
 */
export function Astuce({
  titre,
  emoji,
  resume,
  lignes,
  note,
  children,
  actif = true,
}: {
  titre: string
  emoji?: ReactNode
  resume?: ReactNode
  lignes?: LigneInfo[]
  note?: ReactNode
  children: ReactNode
  /** à false, l'astuce ne s'ouvre pas : pratique pour un cas sans rien à dire */
  actif?: boolean
}) {
  const [ouvert, setOuvert] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const ancre = useRef<HTMLSpanElement | null>(null)
  const bulle = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ouvert) return
    const placer = () => {
      const p = placerSous(ancre.current, bulle.current?.offsetWidth ?? 288, bulle.current?.offsetHeight ?? 120)
      if (p) setPos(p)
    }
    placer()
    window.addEventListener('scroll', placer, true)
    window.addEventListener('resize', placer)
    return () => {
      window.removeEventListener('scroll', placer, true)
      window.removeEventListener('resize', placer)
    }
  }, [ouvert])

  if (!actif) return <>{children}</>
  return (
    <span
      ref={ancre}
      style={{ display: 'contents' }}
      onPointerEnter={() => setOuvert(true)}
      onPointerLeave={() => setOuvert(false)}
      onPointerDown={() => setOuvert(false)}
      onFocus={() => setOuvert(true)}
      onBlur={() => setOuvert(false)}
    >
      {children}
      {ouvert && (
        <div ref={bulle} className="infobulle" role="tooltip" style={pos ? { left: pos.x, top: pos.y } : { opacity: 0 }}>
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
