import type { JSX } from 'react'

/*
 * Pictogrammes « figure noire » - le pendant monochrome des icônes peintes
 * d'Icones.tsx. Silhouettes pleines, comme sur un vase attique ou une monnaie :
 * la chouette d'Athéna, la labrys, le casque corinthien, l'amphore, la
 * couronne de laurier. Ils prennent la couleur du texte (`currentColor`) et sa
 * taille (1em) : posés dans un bouton doré, ils sont dorés.
 *
 * Ils remplacent les émojis, qui juraient avec le reste du jeu - même dessin
 * sur toutes les machines, même ton que l'interface, et plus rien qui sente le
 * clavier de téléphone.
 *
 * Les champs `emoji` des données (bâtiments, héros, missions, toasts, rapports
 * du journal…) restent des CLÉS : ils sont sauvegardés dans le localStorage et
 * vérifiés par les tests. On ne les affiche plus jamais tels quels - on les
 * passe à <Picto e={…} />, qui les traduit par PICTO_DE.
 */

export type PictoId =
  | 'epees' | 'epee' | 'bouclier' | 'arc' | 'casque'
  | 'temple' | 'mur' | 'tour' | 'porte' | 'maison' | 'tente'
  | 'epi' | 'hache' | 'rondin' | 'pic' | 'bloc' | 'lingot' | 'marteau' | 'enclume'
  | 'ancre' | 'navire' | 'vagues' | 'goutte' | 'roue'
  | 'foudre' | 'trident' | 'chouette' | 'autel' | 'trepied' | 'taureau'
  | 'laurier' | 'etoile' | 'amphore' | 'lampe' | 'parchemin' | 'tablette' | 'carte'
  | 'cheval' | 'flamme' | 'crane' | 'rameau' | 'etendard' | 'chaines' | 'anneau'
  | 'personne' | 'groupe' | 'coeur' | 'coeur-brise' | 'oeil' | 'sablier'
  | 'soleil' | 'lune' | 'flocon' | 'pluie' | 'brume'
  | 'cadenas' | 'coffre' | 'balance' | 'masque' | 'masque-tragique' | 'lyre' | 'lyre-muette'
  | 'asclepios' | 'ile' | 'arbre'
  | 'coche' | 'croix' | 'interdit' | 'alerte' | 'lecture' | 'accelere' | 'pause' | 'losange'

// ─────────── outils de tracé ───────────

const r2 = (n: number) => Math.round(n * 100) / 100
const cercle = (cx: number, cy: number, r: number) =>
  `M${r2(cx - r)} ${cy} a${r} ${r} 0 1 0 ${r2(2 * r)} 0 a${r} ${r} 0 1 0 ${r2(-2 * r)} 0Z`
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${r2(cx - rx)} ${cy} a${rx} ${ry} 0 1 0 ${r2(2 * rx)} 0 a${rx} ${ry} 0 1 0 ${r2(-2 * rx)} 0Z`

/** trait : pour ce qui est fil, corde, hampe */
const T = (w = 1.8) =>
  ({ fill: 'none', stroke: 'currentColor', strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round' }) as const

/** une feuille en amande, centrée en (x, y), couchée selon l'angle a (degrés) */
const feuille = (x: number, y: number, a: number, l: number, e: number) => {
  const rad = (a * Math.PI) / 180
  const dx = Math.cos(rad) * l, dy = Math.sin(rad) * l
  const nx = -Math.sin(rad) * e, ny = Math.cos(rad) * e
  const x0 = r2(x - dx), y0 = r2(y - dy), x1 = r2(x + dx), y1 = r2(y + dy)
  return `M${x0} ${y0}Q${r2(x + nx)} ${r2(y + ny)} ${x1} ${y1}Q${r2(x - nx)} ${r2(y - ny)} ${x0} ${y0}Z`
}

/**
 * Une branche de la couronne de laurier (la gauche) : un arc qui monte du nœud,
 * en bas, vers le front. La droite est son miroir.
 */
const LAURIER = (() => {
  const d: string[] = []
  const R = 8.2
  for (let i = 0; i < 6; i++) {
    const th = ((104 + i * 25) * Math.PI) / 180 // 90° = en bas, 180° = à gauche, 270° = en haut
    const x = 12 + Math.cos(th) * R, y = 12.4 + Math.sin(th) * R
    const a = (Math.atan2(Math.cos(th), -Math.sin(th)) * 180) / Math.PI // sens de la montée
    for (const s of [1, -1]) {
      // la feuille part de la tige : son centre est à une demi-longueur, dans son axe
      const fa = a - s * 34, rad = (fa * Math.PI) / 180
      d.push(feuille(x + Math.cos(rad) * 2.2, y + Math.sin(rad) * 2.2, fa, 2.4, 1.45))
    }
  }
  return d.join('')
})()

/** rameau d'olivier : une tige courbe, feuilles alternées, deux olives */
const RAMEAU = (() => {
  const d: string[] = []
  const P = (t: number) => ({
    x: (1 - t) ** 2 * 4.5 + 2 * (1 - t) * t * 7 + t * t * 19,
    y: (1 - t) ** 2 * 21 + 2 * (1 - t) * t * 8 + t * t * 3.5,
  })
  for (let i = 0; i < 7; i++) {
    const t = 0.22 + i * 0.11
    const p = P(t), q = P(t + 0.01)
    const a = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI
    const s = i % 2 ? 1 : -1
    const fa = a + s * 40, rad = (fa * Math.PI) / 180
    d.push(feuille(p.x + Math.cos(rad) * 2.3, p.y + Math.sin(rad) * 2.3, fa, 2.3, 0.9))
  }
  const fin = P(1)
  d.push(feuille(fin.x + 1, fin.y - 0.6, -40, 2.2, 0.85))
  return d.join('')
})()

const ETOILE = (() => {
  const pts: string[] = []
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2
    const r = i % 2 ? 3.6 : 10
    pts.push(`${r2(12 + Math.cos(a) * r)} ${r2(12 + Math.sin(a) * r)}`)
  }
  return `M${pts.join('L')}Z`
})()

const SOLEIL = (() => {
  const d = [cercle(12, 12, 4.4)]
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    const p = (r: number, da: number) => `${r2(12 + Math.cos(a + da) * r)} ${r2(12 + Math.sin(a + da) * r)}`
    d.push(`M${p(6.2, -0.22)}L${p(10.6, 0)}L${p(6.2, 0.22)}Z`)
  }
  return d.join('')
})()

const FLOCON = (() => {
  const d: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 2
    const P = (r: number, da = 0) => `${r2(12 + Math.cos(a + da) * r)} ${r2(12 + Math.sin(a + da) * r)}`
    d.push(`M12 12L${P(9.6)}`, `M${P(6.4)}L${P(9, 0.3)}`, `M${P(6.4)}L${P(9, -0.3)}`)
  }
  return d.join('')
})()

const Lame = () => (
  <>
    <path d="M12 1.6L13.5 4.6L13.3 13.4H10.7L10.5 4.6Z" />
    <rect x="8.2" y="13.6" width="7.6" height="1.8" rx=".9" />
    <rect x="11.15" y="15.4" width="1.7" height="4.6" />
    <circle cx="12" cy="21.1" r="1.45" />
  </>
)

const Lyre = () => (
  <>
    <path {...T(1.9)} d="M7.4 19C3.6 14.6 4.2 8.2 7.6 4.6M16.6 19C20.4 14.6 19.8 8.2 16.4 4.6" />
    <path {...T(1.4)} d="M7.6 4.6Q6.6 2.8 4.8 3.4M16.4 4.6Q17.4 2.8 19.2 3.4" />
    <path {...T(1.6)} d="M5.5 7.6H18.5" />
    <path {...T(0.8)} d="M9.4 7.6V18M12 7.6V18M14.6 7.6V18" />
    <path d={ellipse(12, 19.3, 5.8, 2.8)} />
  </>
)

// ─────────── les dessins ───────────

const G: Record<PictoId, () => JSX.Element> = {
  epees: () => (
    <>
      <g transform="rotate(42 12 12)"><Lame /></g>
      <g transform="rotate(-42 12 12)"><Lame /></g>
    </>
  ),
  epee: () => <g transform="rotate(40 12 12)"><Lame /></g>,
  bouclier: () => (
    <path fillRule="evenodd" d={cercle(12, 12, 9.8) + cercle(12, 12, 8.2) + cercle(12, 12, 6.8) + 'M12 7.4L16.2 16.4H14.3L12 11.2L9.7 16.4H7.8Z'} />
  ),
  arc: () => (
    <>
      <path {...T(2)} d="M8 2.6Q19.4 12 8 21.4" />
      <path {...T(0.8)} d="M8 2.6V21.4" />
      <path {...T(1.4)} d="M2.6 12H18.4" />
      <path d="M22.2 12L17.4 9.4L18.6 12L17.4 14.6Z" />
      <path {...T(1)} d="M2.8 12L1.6 9.8M2.8 12L1.6 14.2M5 12L3.8 9.8M5 12L3.8 14.2" />
    </>
  ),
  casque: () => (
    <>
      <path d="M4.4 7.6Q4.8 1.6 12 1.4Q19.2 1.6 19.6 7.6Q16.9 4.2 12 4.1Q7.1 4.2 4.4 7.6Z" />
      <path
        fillRule="evenodd"
        d="M12 5.6C7 5.6 5 9 5 13V20Q5 21.6 6.8 21.6H10.2V16.6L11 13.8H13L13.8 16.6V21.6H17.2Q19 21.6 19 20V13C19 9 17 5.6 12 5.6ZM6.6 12.3Q8.7 10.9 11.1 12L11 13.4Q8.8 12.7 7 13.5ZM17.4 12.3Q15.3 10.9 12.9 12L13 13.4Q15.2 12.7 17 13.5Z"
      />
    </>
  ),
  temple: () => (
    <>
      <path d="M1.8 8L12 2.6L22.2 8Z" />
      <rect x="2.8" y="8.7" width="18.4" height="1.7" />
      <rect x="4.3" y="11.1" width="2.3" height="7.3" />
      <rect x="8.5" y="11.1" width="2.3" height="7.3" />
      <rect x="13.2" y="11.1" width="2.3" height="7.3" />
      <rect x="17.4" y="11.1" width="2.3" height="7.3" />
      <rect x="2.6" y="18.9" width="18.8" height="1.5" />
      <rect x="1.6" y="20.8" width="20.8" height="1.6" />
    </>
  ),
  mur: () => (
    <>
      {[2, 7.4, 12.8, 18].map((x) => <rect key={x} x={x} y="4.6" width="4" height="3.4" />)}
      {[2, 8.9, 15.8].map((x) => <rect key={'a' + x} x={x} y="8.7" width="6.2" height="3.6" />)}
      {[[2, 2.9], [5.6, 6.2], [12.5, 6.2], [19.4, 2.6]].map(([x, w]) => <rect key={'b' + x} x={x} y="13" width={w} height="3.6" />)}
      {[2, 8.9, 15.8].map((x) => <rect key={'c' + x} x={x} y="17.3" width="6.2" height="3.9" />)}
    </>
  ),
  tour: () => (
    <path
      fillRule="evenodd"
      d="M6.5 22.2V9.6H5.4V4.4H8.3V6.6H10.6V4.4H13.4V6.6H15.7V4.4H18.6V9.6H17.5V22.2ZM11.3 11H12.7V15H11.3ZM9.9 22.2V19.4A2.1 2.1 0 0 1 14.1 19.4V22.2Z"
    />
  ),
  porte: () => (
    <>
      <path d="M7.4 7.2L12 2.4L16.6 7.2Z" />
      <path d="M2.8 22V8H21.2V22H17.8V10.4H6.2V22Z" />
      <path d="M7 11.2H11.5V22H7ZM12.5 11.2H17V22H12.5Z" />
    </>
  ),
  maison: () => (
    <>
      <path d="M1.6 11.6L12 3.4L22.4 11.6L20.8 12.7L12 5.8L3.2 12.7Z" />
      <path fillRule="evenodd" d="M5.4 12.8L12 7.7L18.6 12.8V21.6H5.4ZM10.4 21.6V16.6H13.6V21.6ZM15 13.6H16.8V15.4H15Z" />
    </>
  ),
  tente: () => <path fillRule="evenodd" d="M1.8 21.2L11.1 4.4V2.4H12.9V4.4L22.2 21.2ZM12 11.4L15.9 21.2H8.1Z" />,
  epi: () => (
    <>
      <path {...T(1.3)} d="M12 22V7" />
      {[8.6, 11.7, 14.8].map((y) => (
        <g key={y}>
          <path d={feuille(10.2, y, 60, 2.6, 1.5)} />
          <path d={feuille(13.8, y, -60, 2.6, 1.5)} />
        </g>
      ))}
      <path d={feuille(12, 4.6, 90, 2.6, 1.4)} />
      <path d="M12 21.4Q6.6 20.4 5.2 15.6Q9.8 17 12 19.6Z" />
    </>
  ),
  hache: () => (
    <>
      <path {...T(1.7)} d="M12 3V22.2" />
      <circle cx="12" cy="2.6" r="1.1" />
      <path d="M12 7.2C9 5.2 6.3 4.2 3.6 4.6C4.8 7.5 4.8 10.9 3.6 13.8C6.3 14.2 9 13.2 12 11.2C15 13.2 17.7 14.2 20.4 13.8C19.2 10.9 19.2 7.5 20.4 4.6C17.7 4.2 15 5.2 12 7.2Z" />
    </>
  ),
  rondin: () => (
    <>
      <path fillRule="evenodd" d={ellipse(5.2, 13.5, 3.3, 5.2) + ellipse(5.2, 13.5, 2, 3.4) + ellipse(5.2, 13.5, 0.8, 1.4)} />
      <path d="M6.4 8.3H18.6Q22 13.5 18.6 18.7H6.4A3.3 5.2 0 0 0 6.4 8.3Z" />
    </>
  ),
  pic: () => (
    <>
      <path d="M2.4 9Q12 1.4 21.6 9L20.6 10.2Q12 4.6 3.4 10.2Z" />
      <path {...T(1.9)} d="M12 6V22" />
    </>
  ),
  bloc: () => (
    <>
      <path d="M5.6 7.8L12.4 4.4L19.8 7.5L12 11Z" />
      <path d="M4.9 9.3L11.5 12.4L20.3 8.9L21.6 15.1L16.1 20.2L7.4 20.6L2.9 16.4Z" />
    </>
  ),
  lingot: () => (
    <path fillRule="evenodd" d="M2.6 5.4Q7 7.8 12 6.9Q17 7.8 21.4 5.4Q19 12 21.4 18.6Q17 16.2 12 17.1Q7 16.2 2.6 18.6Q5 12 2.6 5.4ZM8 11.2H16V12.8H8Z" />
  ),
  marteau: () => (
    <g transform="rotate(-38 12 12)">
      <rect x="6" y="2.4" width="12" height="5.6" rx="1.2" />
      <rect x="11.1" y="8.6" width="1.8" height="13.6" rx=".9" />
    </g>
  ),
  enclume: () => (
    <>
      <path d="M2.4 8.4H17.4Q21.6 8.4 22 6.6Q22.6 11.6 17.8 12.3H16.2Q15.2 12.4 15.2 13.6V15.2Q15.2 16 16.6 16.6L18.6 17.4V19.6H5.4V17.4L7.4 16.6Q8.8 16 8.8 15.2V13.6Q8.8 12.4 7.8 12.3Q3.2 12 2.4 8.4Z" />
      <rect x="4" y="20.3" width="16" height="1.7" rx=".5" />
    </>
  ),
  ancre: () => (
    <>
      <path {...T(1.8)} d={cercle(12, 4.4, 2)} />
      <path {...T(1.9)} d="M12 6.4V20.6M7.6 9.6H16.4M4.2 13.8Q5 20.8 12 20.8Q19 20.8 19.8 13.8" />
      <path d="M2.2 15.6L4 11.6L6.2 15.2ZM21.8 15.6L20 11.6L17.8 15.2Z" />
    </>
  ),
  navire: () => (
    <>
      <path fillRule="evenodd" d={'M1.4 14.2Q2 13.6 3 14H19.4L22.8 12.4L21.2 15.8Q19.6 19 15.4 19H7Q3.2 19 1.4 14.2Z' + cercle(18.8, 15.5, 0.7)} />
      <path {...T(1.3)} d="M3 14Q1 11.4 2.6 9.4" />
      <path {...T(1.2)} d="M11.6 2.4V14" />
      <path d="M6 4Q11.6 3 17.2 4Q17.8 8.4 16.8 12.4Q11.6 11.4 6.4 12.4Q5.4 8.4 6 4Z" />
      <path {...T(0.9)} d="M7 19L5.6 21.8M10 19L8.6 21.8M13 19L11.6 21.8M16 19L14.6 21.8" />
    </>
  ),
  vagues: () => <path {...T(1.8)} d="M2 7.5Q4.5 4 7 7.5T12 7.5T17 7.5T22 7.5M2 12.5Q4.5 9 7 12.5T12 12.5T17 12.5T22 12.5M2 17.5Q4.5 14 7 17.5T12 17.5T17 17.5T22 17.5" />,
  goutte: () => (
    <path fillRule="evenodd" d="M12 2.4C12 2.4 5 10.6 5 15A7 7 0 0 0 19 15C19 10.6 12 2.4 12 2.4ZM8.4 14.6Q8.6 12 10.4 9.8Q9.6 12.4 10 15Z" />
  ),
  roue: () => (
    <>
      <path fillRule="evenodd" d={cercle(12, 12, 9.6) + cercle(12, 12, 7.6)} />
      <path {...T(1.6)} d="M12 4.6V19.4M4.6 12H19.4" />
      <circle cx="12" cy="12" r="2.4" />
    </>
  ),
  foudre: () => <path d="M14.2 1.6L5.2 13.6H11L9 22.4L18.8 9.6H13Z" />,
  trident: () => (
    <>
      <path {...T(1.8)} d="M12 4V22M6 4.2V7.6Q6 11.2 12 11.2Q18 11.2 18 7.6V4.2" />
      <path d="M12 1.2L13.6 4.6H10.4ZM6 1.6L7.6 5H4.4ZM18 1.6L19.6 5H16.4Z" />
    </>
  ),
  chouette: () => (
    <path
      fillRule="evenodd"
      d={'M5.6 3.6L8.6 6.6Q12 5.6 15.4 6.6L18.4 3.6L18.8 11Q19.2 18.4 12 21.8Q4.8 18.4 5.2 11Z' + cercle(9.3, 10.6, 2.3) + cercle(9.6, 10.8, 1) + cercle(14.7, 10.6, 2.3) + cercle(14.4, 10.8, 1) + 'M12 12.6L13 14.4L12 15.8L11 14.4Z'}
    />
  ),
  autel: () => (
    <>
      <path d="M12 1.8C12.6 4.2 15.6 5.2 15.6 8.2A3.6 3.6 0 0 1 8.4 8.2C8.4 6.2 9.8 5.6 10.3 3.8C10.9 5 11.4 5.4 11.8 5.6C12 4.4 11.7 3 12 1.8Z" />
      <rect x="3.8" y="12.4" width="16.4" height="2.2" rx=".4" />
      <path fillRule="evenodd" d="M5.6 15.2H18.4V20.4H5.6ZM8 16.4H9.2V19.2H8ZM11.4 16.4H12.6V19.2H11.4ZM14.8 16.4H16V19.2H14.8Z" />
      <rect x="3.8" y="21" width="16.4" height="1.6" rx=".4" />
    </>
  ),
  trepied: () => (
    <>
      {/* trépied d'Olympie : chaudron rond, grandes anses annulaires dressées */}
      <path {...T(1.4)} d={ellipse(8.2, 4.4, 1.6, 2.6) + ellipse(15.8, 4.4, 1.6, 2.6)} />
      <path d="M4.6 7.4H19.4A7.4 6.2 0 0 1 4.6 7.4Z" />
      <path {...T(1.3)} d="M7.4 12L5.6 22.2M12 13.6V22.2M16.6 12L18.4 22.2" />
    </>
  ),
  taureau: () => (
    <>
      <path d="M1.8 4.6Q3.2 10.4 9 10.2L9.4 8.4Q4.6 8.6 1.8 4.6ZM22.2 4.6Q20.8 10.4 15 10.2L14.6 8.4Q19.4 8.6 22.2 4.6Z" />
      <path
        fillRule="evenodd"
        d={'M8.2 8.4Q12 6.8 15.8 8.4Q17 12.4 14.8 18.4Q13.8 21 12 21Q10.2 21 9.2 18.4Q7 12.4 8.2 8.4Z' + cercle(10, 11.6, 0.8) + cercle(14, 11.6, 0.8) + cercle(10.9, 18.2, 0.6) + cercle(13.1, 18.2, 0.6)}
      />
    </>
  ),
  laurier: () => (
    <>
      <path {...T(1.5)} d="M10.6 20.4A8.2 8.2 0 0 1 7.3 5.7M13.4 20.4A8.2 8.2 0 0 0 16.7 5.7" />
      <path d={LAURIER} />
      <path d={LAURIER} transform="matrix(-1 0 0 1 24 0)" />
      <path {...T(1.1)} d="M10.4 21.2L12 19.8L13.6 21.2M12 19.8L10.8 22.6M12 19.8L13.2 22.6" />
    </>
  ),
  etoile: () => <path d={ETOILE} />,
  amphore: () => (
    <>
      <path fillRule="evenodd" d="M9.8 2.2H14.2V3.6H13.4V6Q19 7.8 18.6 13.6Q18.2 18.8 13 21V22.2H11V21Q5.8 18.8 5.4 13.6Q5 7.8 10.6 6V3.6H9.8ZM6.4 11.6H17.6V12.6H6.4Z" />
      <path {...T(1.3)} d="M10.6 4.6Q6.6 4.4 7.4 8.6M13.4 4.6Q17.4 4.4 16.6 8.6" />
    </>
  ),
  lampe: () => (
    <>
      <path d="M20.6 13.2Q18.4 9.8 20.7 5.6Q23.2 9.8 20.6 13.2Z" />
      <path fillRule="evenodd" d={'M3.6 15.6Q3.6 12 10.6 12H13.8L19.8 13.6Q21.6 14.4 19.8 15.4L13.8 17.4H9Q3.6 17.4 3.6 15.6Z' + cercle(10.4, 14.4, 1)} />
      <path {...T(1.3)} d="M4.2 14.6Q1.6 14.2 1.8 12.4Q2.2 10.8 4.6 11.6" />
      <rect x="7.4" y="18" width="5.6" height="1.6" rx=".5" />
    </>
  ),
  parchemin: () => (
    <>
      <path fillRule="evenodd" d="M6 4.6H18V19.4H6ZM8.2 8H15.8V9H8.2ZM8.2 11.2H15.8V12.2H8.2ZM8.2 14.4H13.4V15.4H8.2Z" />
      <rect x="3.8" y="2.4" width="16.4" height="3.2" rx="1.6" />
      <rect x="3.8" y="18.4" width="16.4" height="3.2" rx="1.6" />
    </>
  ),
  tablette: () => (
    <path
      fillRule="evenodd"
      d="M3.6 3.4H20.4Q21 3.4 21 4V20Q21 20.6 20.4 20.6H3.6Q3 20.6 3 20V4Q3 3.4 3.6 3.4ZM5.4 5.4V18.6H18.6V5.4ZM7.4 8.2H16.6V9.2H7.4ZM7.4 11.4H16.6V12.4H7.4ZM7.4 14.6H13V15.6H7.4Z"
    />
  ),
  carte: () => (
    <path
      fillRule="evenodd"
      d="M2 5.2L8 3L16 5.2L22 3V18.8L16 21L8 18.8L2 21ZM8.6 4.6V17.6L9.4 17.8V4.8ZM15.4 6.4V19.2L14.6 19V6.2ZM4.4 15.6L5.4 14.6L6 15.2L5 16.2ZM11 11.6L12 10.6L12.6 11.2L11.6 12.2ZM17.6 7.4L18.8 8.6M18.8 7.4L17.6 8.6"
    />
  ),
  cheval: () => (
    <path
      fillRule="evenodd"
      d={'M19.6 22.2C20 16 19.2 10 15.6 5.6L14.6 1.8L12.6 4.8C10.6 5.6 8.6 7.4 6.6 9.8L3.6 13.2C3 14.2 3.4 15.4 4.8 15.6H7.2C8.6 15.4 9.6 14.6 10.6 14.6C11.8 15.8 12.2 18.4 11.6 22.2Z' + cercle(10.2, 8.8, 0.8) + cercle(5.2, 13.6, 0.5)}
    />
  ),
  flamme: () => (
    <path
      fillRule="evenodd"
      d="M12 1.8C12.8 5.8 18.6 8.2 18.6 14.4A6.6 6.6 0 0 1 5.4 14.4C5.4 11 7.4 9.2 8.6 6.6C9.6 9 10.2 10 11.2 10.6C11.8 7.8 11.2 4.8 12 1.8ZM12 12C12.6 14 15.2 15 15.2 17.4A3.2 3.2 0 0 1 8.8 17.4C8.8 15.6 10 14.8 10.6 13.6C11 14.6 11.4 15 11.8 15.2C12 14 11.8 13 12 12Z"
    />
  ),
  crane: () => (
    <path
      fillRule="evenodd"
      d={'M12 2.6C7 2.6 4 6.2 4 10.8C4 13.8 5.4 15.4 7 16.2V19.6Q7 20.8 8.2 20.8H15.8Q17 20.8 17 19.6V16.2C18.6 15.4 20 13.8 20 10.8C20 6.2 17 2.6 12 2.6Z' + ellipse(8.9, 11, 2.2, 2.5) + ellipse(15.1, 11, 2.2, 2.5) + 'M12 13.4L13.1 15.6H10.9ZM10 17.6H10.8V20.8H10ZM13.2 17.6H14V20.8H13.2Z'}
    />
  ),
  rameau: () => (
    <>
      <path {...T(1.2)} d="M4.5 21Q7 8 19 3.5" />
      <path d={RAMEAU} />
      <circle cx="8.4" cy="17.4" r="1.2" />
      <circle cx="13.4" cy="8.4" r="1.2" />
    </>
  ),
  etendard: () => (
    <>
      <path {...T(1.6)} d="M6 3V22" />
      <path d="M6.8 3.8H20.4L16.8 8L20.4 12.2H6.8Z" />
    </>
  ),
  chaines: () => (
    <g {...T(1.8)}>
      <ellipse cx="6.6" cy="17.4" rx="3.6" ry="2.1" transform="rotate(-45 6.6 17.4)" />
      <ellipse cx="12" cy="12" rx="3.6" ry="2.1" transform="rotate(45 12 12)" />
      <ellipse cx="17.4" cy="6.6" rx="3.6" ry="2.1" transform="rotate(-45 17.4 6.6)" />
    </g>
  ),
  anneau: () => (
    <>
      <path {...T(2.2)} d={cercle(12, 14.4, 6)} />
      <path d="M12 2.6L14.8 5.8L12 8.8L9.2 5.8Z" />
    </>
  ),
  personne: () => (
    <>
      <circle cx="12" cy="6.2" r="3.4" />
      <path d="M5.2 22Q5.2 12.4 12 11.2Q18.8 12.4 18.8 22Z" />
    </>
  ),
  groupe: () => (
    <>
      <circle cx="16.6" cy="6" r="2.7" />
      <path d="M14.4 20.4Q14.6 12.2 16.8 10.6Q21.8 11.6 21.8 20.4Z" />
      <circle cx="8.4" cy="7.4" r="3.1" />
      <path d="M2.4 22Q2.4 13.2 8.4 12.2Q14.4 13.2 14.4 22Z" />
    </>
  ),
  coeur: () => <path d="M12 21C5 15.5 2.4 12 2.4 8.4A4.9 4.9 0 0 1 12 6.4A4.9 4.9 0 0 1 21.6 8.4C21.6 12 19 15.5 12 21Z" />,
  'coeur-brise': () => (
    <>
      <path d="M11.2 20.3C4.9 15.2 2.4 11.9 2.4 8.4A4.9 4.9 0 0 1 11.3 5.7L9.8 10.4L12 12.6L10.4 16.8Z" />
      <path d="M12.8 20.4L11.8 17L13.6 12.6L11.2 10.4L12.6 5.8A4.9 4.9 0 0 1 21.6 8.4C21.6 12 19 15.3 12.8 20.4Z" />
    </>
  ),
  oeil: () => <path fillRule="evenodd" d={'M1.8 12Q12 2.6 22.2 12Q12 21.4 1.8 12Z' + cercle(12, 12, 4.4) + cercle(12, 12, 2.2)} />,
  sablier: () => (
    <>
      <rect x="4.6" y="1.8" width="14.8" height="2.2" rx=".8" />
      <rect x="4.6" y="20" width="14.8" height="2.2" rx=".8" />
      <path {...T(1.4)} d="M7 4.2Q7 9.2 11.2 12Q7 14.8 7 19.8M17 4.2Q17 9.2 12.8 12Q17 14.8 17 19.8" />
      <path d="M8.8 7.4H15.2Q14.4 9.6 12 11.2Q9.6 9.6 8.8 7.4ZM12 14.4L15.6 19.6H8.4Z" />
    </>
  ),
  soleil: () => <path d={SOLEIL} />,
  lune: () => <path d="M14.6 2.6A9.6 9.6 0 1 0 21.4 16.4A7.6 7.6 0 1 1 14.6 2.6Z" />,
  flocon: () => <path {...T(1.6)} d={FLOCON} />,
  pluie: () => (
    <>
      <path d="M6.4 14.2A4 4 0 0 1 6 6.3A5.6 5.6 0 0 1 16.6 5.2A4.5 4.5 0 0 1 17.6 14.2Z" />
      <path {...T(1.4)} d="M7.6 16.6L6.4 20.4M12 16.6L10.8 20.4M16.4 16.6L15.2 20.4" />
    </>
  ),
  brume: () => <path {...T(1.9)} d="M3 7.5H15.5Q18 7.5 18.5 5.6M5.5 12H21M3 16.5H14M8 20.5H18" />,
  cadenas: () => (
    <>
      <path {...T(2)} d="M8 11V7.6A4 4 0 0 1 16 7.6V11" />
      <path fillRule="evenodd" d={'M6.6 10.4H17.4Q19 10.4 19 12V20.2Q19 21.8 17.4 21.8H6.6Q5 21.8 5 20.2V12Q5 10.4 6.6 10.4Z' + cercle(12, 15, 1.5) + 'M11.4 15H12.6V18.6H11.4Z'} />
    </>
  ),
  coffre: () => (
    <>
      <path d="M3 9.8V8Q3 4.4 7 4.4H17Q21 4.4 21 8V9.8Z" />
      <path fillRule="evenodd" d="M3 10.6H21V20.8Q21 21.6 20.2 21.6H3.8Q3 21.6 3 20.8ZM10.6 11.4H13.4V15H10.6ZM6.2 11.4H7.2V21H6.2ZM16.8 11.4H17.8V21H16.8Z" />
    </>
  ),
  balance: () => (
    <>
      <circle cx="12" cy="3.4" r="1.3" />
      <path {...T(1.6)} d="M12 4.6V20.4M3.8 6.4H20.2M7.4 21.2H16.6" />
      <path {...T(0.8)} d="M3.8 6.4L1.8 13M3.8 6.4L5.8 13M20.2 6.4L18.2 13M20.2 6.4L22.2 13" />
      <path d="M1.2 13H6.4Q6.4 16 3.8 16Q1.2 16 1.2 13ZM17.6 13H22.8Q22.8 16 20.2 16Q17.6 16 17.6 13Z" />
    </>
  ),
  masque: () => (
    <path
      fillRule="evenodd"
      d="M4 3.4Q12 0.8 20 3.4Q21 13 12 21.6Q3 13 4 3.4ZM6.6 8.8Q8.6 6.6 10.6 8.8Q8.6 10.2 6.6 8.8ZM13.4 8.8Q15.4 6.6 17.4 8.8Q15.4 10.2 13.4 8.8ZM7.8 13.6Q12 18.6 16.2 13.6Q12 15.8 7.8 13.6Z"
    />
  ),
  'masque-tragique': () => (
    <path
      fillRule="evenodd"
      d="M4 3.4Q12 0.8 20 3.4Q21 13 12 21.6Q3 13 4 3.4ZM6.6 8.4Q8.6 10.6 10.6 8.4Q8.6 7.4 6.6 8.4ZM13.4 8.4Q15.4 10.6 17.4 8.4Q15.4 7.4 13.4 8.4ZM8.2 17Q12 12.4 15.8 17Q12 15.4 8.2 17Z"
    />
  ),
  lyre: () => <Lyre />,
  'lyre-muette': () => (
    <>
      <g opacity=".55"><Lyre /></g>
      <path {...T(2)} d="M3.4 20.6L20.6 3.4" />
    </>
  ),
  asclepios: () => (
    <>
      <path {...T(1.7)} d="M12 2.6V22" />
      <path {...T(1.6)} d="M9.2 19.4C15.6 17.8 15.6 14.6 12 13.6C8.4 12.6 8.4 9.4 12 8.6C14.8 8 14.8 5.6 12.6 4.8" />
      <circle cx="11.6" cy="4.6" r="1.3" />
    </>
  ),
  ile: () => (
    <>
      <path d="M2 17.6Q7 11.4 12.6 12.4Q19 13 22 17.6Z" />
      <path {...T(1.3)} d="M13.2 13Q12.6 9 13.6 6.6" />
      <circle cx="11" cy="6.2" r="2.6" />
      <circle cx="15.2" cy="5.6" r="2.8" />
      <circle cx="13.2" cy="3.6" r="2.2" />
      <path {...T(1.2)} d="M2 20.6Q4 19 6 20.6T10 20.6T14 20.6T18 20.6T22 20.6" />
    </>
  ),
  arbre: () => (
    <>
      <path d="M12 1.6C14.9 5.8 16.2 11 15.5 16Q14.7 18.6 12 19Q9.3 18.6 8.5 16C7.8 11 9.1 5.8 12 1.6Z" />
      <rect x="11.3" y="18.4" width="1.4" height="3.4" />
      <path {...T(1.2)} d="M6 22H18" />
    </>
  ),
  coche: () => <path {...T(2.6)} d="M4 12.6L9.4 18L20 6" />,
  croix: () => <path {...T(2.6)} d="M5.6 5.6L18.4 18.4M18.4 5.6L5.6 18.4" />,
  interdit: () => <path {...T(2.2)} d={cercle(12, 12, 8.6) + 'M5.9 5.9L18.1 18.1'} />,
  alerte: () => <path fillRule="evenodd" d={'M12 2.6L22.4 20.8H1.6ZM11 8.8H13V15.2H11Z' + cercle(12, 17.6, 1.2)} />,
  lecture: () => <path d="M7 4.4L19.6 12L7 19.6Z" />,
  accelere: () => <path d="M2.6 5L11.6 12L2.6 19ZM12.4 5L21.4 12L12.4 19Z" />,
  pause: () => <path d="M6 4.6H10V19.4H6ZM14 4.6H18V19.4H14Z" />,
  losange: () => <path d="M12 6L18 12L12 18L6 12Z" />,
}

// ─────────── table de correspondance des anciennes clés ───────────

const TABLE: Array<[PictoId, string]> = [
  ['epees', '⚔✊🐺'],
  ['epee', '🗡'],
  ['bouclier', '🛡'],
  ['arc', '🏹🎯'],
  ['casque', '🪖⛑🐗'],
  ['temple', '🏛🏟📐🗿'],
  ['mur', '🧱'],
  ['tour', '🗼🏯🏰'],
  ['porte', '🚪🕳'],
  ['maison', '🏠🏘🏚'],
  ['tente', '⛺🏕🛖'],
  ['epi', '🌾🥖🚜🦗🧺'],
  ['hache', '🪓'],
  ['rondin', '🪵'],
  ['pic', '⛏'],
  ['bloc', '🪨🥏'],
  ['lingot', '🪙'],
  ['marteau', '🛠🔨🚧🏗👷⚙'],
  ['enclume', '⚒🏭'],
  ['ancre', '⚓'],
  ['navire', '🚢⛵🛶'],
  ['vagues', '🌊'],
  ['goutte', '💧🚰'],
  ['roue', '🛞🐫🐂☸'],
  ['foudre', '⚡🌩⛈🦅'],
  ['trident', '🔱🌍'],
  ['chouette', '🦉🧵'],
  ['autel', '🩸'],
  ['trepied', '🔮🌌🔭'],
  ['laurier', '👑🏅🏆🎖🥉'],
  ['etoile', '⭐🌟✨🌠💫'],
  ['amphore', '🏺🍶🍷🍯🍇🍖🥣🧂🐝'],
  ['lampe', '🕯⚱⚰'],
  ['parchemin', '📜📋📨✍'],
  ['tablette', '💾📈🗓'],
  ['carte', '🗺🧭🛤'],
  ['cheval', '🐴🐎🎠'],
  ['flamme', '🔥💥🌋'],
  ['crane', '💀☠🦴'],
  ['rameau', '🕊🏳🌿🌱🫒🙏🤝'],
  ['etendard', '🏴'],
  ['chaines', '⛓🪢'],
  ['anneau', '💍'],
  ['personne', '👶🧑🧓👴👨👩👧👦🚶🏃🧍🕵🧙🧣'],
  ['groupe', '👥👪🫂'],
  ['coeur', '❤🫀'],
  ['coeur-brise', '💔'],
  ['oeil', '👁🔍🔎🙈'],
  ['sablier', '⏳⏱🕰'],
  ['soleil', '☀🌤'],
  ['lune', '🌙🌘🌗😴'],
  ['flocon', '❄🌨'],
  ['pluie', '🌧'],
  ['brume', '🌫🌬🌪'],
  ['cadenas', '🔒'],
  ['coffre', '🎁📦💰'],
  ['balance', '⚖'],
  ['masque', '🎭'],
  ['masque-tragique', '😤😱🤐'],
  ['lyre', '🎵🎼🔊🔉🔔'],
  ['lyre-muette', '🔇🔕'],
  ['asclepios', '🧪🩺🩹🛏🐍'],
  ['ile', '🏝🏖'],
  ['arbre', '🌳🌲🍂🥀'],
  ['coche', '✔✅'],
  ['croix', '❌🗑'],
  ['interdit', '⛔🚫'],
  ['alerte', '⚠'],
  ['lecture', '▶👉'],
  ['accelere', '⏩'],
  ['pause', '⏸'],
  ['losange', '💠'],
]

/** clé émoji (héritée des données et des sauvegardes) → pictogramme */
export const PICTO_DE: Record<string, PictoId> = Object.fromEntries(
  TABLE.flatMap(([id, cles]) => [...cles.matchAll(/\p{Extended_Pictographic}/gu)].map((m) => [m[0], id])),
)

/**
 * Le pictogramme d'une clé émoji - séquences ZWJ (« 🧑‍🌾 ») et sélecteurs de
 * variante (« ⚔️ ») compris : seul le premier pictogramme compte. Une clé
 * inconnue donne le losange plutôt que rien, pour ne pas décaler une liste.
 */
export function pictoDe(e: string | undefined | null): PictoId {
  if (!e) return 'losange'
  if (e in G) return e as PictoId
  const m = e.match(/\p{Extended_Pictographic}/u)
  return (m && PICTO_DE[m[0]]) || 'losange'
}

/**
 * <Picto id="chouette" /> ou <Picto e={def.emoji} />. Prend la couleur et la
 * taille du texte qui l'entoure ; `taille` en pixels pour la forcer.
 *
 * Dans un dessin SVG (la carte), `centre={[x, y]}` pose le pictogramme centré
 * sur ce point, à la place d'un <text> qui portait un émoji - `taille` est
 * alors requise, et la couleur se donne par `couleur`.
 */
export function Picto({
  id,
  e,
  taille,
  titre,
  className,
  centre,
  couleur,
  opacite,
}: {
  id?: PictoId
  e?: string | null
  taille?: number
  titre?: string
  className?: string
  centre?: readonly [number, number]
  couleur?: string
  opacite?: number
}) {
  const Dessin = G[id ?? pictoDe(e)]
  const dim = taille ?? (centre ? 16 : '1em')
  const pos = centre && typeof dim === 'number' ? { x: centre[0] - dim / 2, y: centre[1] - dim / 2 } : {}
  return (
    <svg
      {...pos}
      color={couleur}
      opacity={opacite}
      className={className ? `picto ${className}` : 'picto'}
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      fill="currentColor"
      role={titre ? 'img' : undefined}
      aria-hidden={titre ? undefined : true}
      aria-label={titre}
    >
      {titre && <title>{titre}</title>}
      <Dessin />
    </svg>
  )
}

/** pour l'atelier d'aperçu : tous les dessins, par nom */
export const TOUS_LES_PICTOS = Object.keys(G) as PictoId[]
