/*
 * ═══════════════════════ LE VISAGE DE ZEUS ═══════════════════════
 *
 * Le maître de l'Olympe tel qu'on le reconnaît sans légende : front lourd,
 * sourcils barrés, barbe et chevelure épaisses et blanches, couronne de laurier,
 * et l'éclair à la main. C'est l'iconographie du Zeus d'Olympie et des vases
 * attiques - celle que tout le monde a déjà vue.
 *
 * Dessiné en SVG comme le reste du jeu : PALLADION ne charge aucune image, et
 * une photographie poserait de toute façon une question de droits. Même lumière
 * que la carte, au nord-ouest.
 */

/** teintes du portrait, du plus sombre au plus clair */
const P = {
  peauOmbre: '#b07f52',
  peauMi: '#d3a375',
  peauLit: '#eec9a0',
  cheveuxOmbre: '#8e9099',
  cheveuxMi: '#c3c7cf',
  cheveuxLit: '#eef1f5',
  laurierOmbre: '#4f7a3c',
  laurier: '#6f9a52',
  laurierLit: '#a6cd82',
  or: '#e8c04a',
  orLit: '#f6e39b',
  nuit: '#101d2a',
}

/**
 * Buste de Zeus. `humeur` change le regard : accueillant pour la bienvenue,
 * grave quand il annonce la guerre, satisfait à la fin du tutoriel.
 */
export function PortraitZeus({
  taille = 132,
  humeur = 'calme',
}: {
  taille?: number
  humeur?: 'calme' | 'grave' | 'content'
}) {
  const sourcil = humeur === 'grave' ? -3.5 : humeur === 'content' ? 1.5 : 0
  const bouche =
    humeur === 'content'
      ? 'M-8,20 Q0,25.5 8,20 Q0,22.5 -8,20 Z'
      : humeur === 'grave'
        ? 'M-7,21.5 Q0,19 7,21.5 Q0,20.5 -7,21.5 Z'
        : 'M-7,20.5 Q0,22.8 7,20.5 Q0,21.8 -7,20.5 Z'

  return (
    <svg
      width={taille}
      height={taille}
      viewBox="-60 -66 120 130"
      role="img"
      aria-label="Zeus, roi des dieux"
      className="zeus"
    >
      <defs>
        <radialGradient id="zeus-halo" cx="0.5" cy="0.42">
          <stop offset="0%" stopColor={P.orLit} stopOpacity={0.5} />
          <stop offset="58%" stopColor={P.or} stopOpacity={0.16} />
          <stop offset="100%" stopColor={P.or} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="zeus-peau" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor={P.peauLit} />
          <stop offset="52%" stopColor={P.peauMi} />
          <stop offset="100%" stopColor={P.peauOmbre} />
        </linearGradient>
        <linearGradient id="zeus-cheveux" x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0%" stopColor={P.cheveuxLit} />
          <stop offset="55%" stopColor={P.cheveuxMi} />
          <stop offset="100%" stopColor={P.cheveuxOmbre} />
        </linearGradient>
      </defs>

      {/* nimbe divin, qui palpite lentement */}
      <circle cx={0} cy={-6} r={58} fill="url(#zeus-halo)">
        <animate attributeName="r" values="55;60;55" dur="6s" repeatCount="indefinite" />
      </circle>

      {/* épaules drapées */}
      <path d="M-46,64 Q-40,32 -20,26 L20,26 Q40,32 46,64 Z" fill="#3d5a76" />
      <path d="M-46,64 Q-40,32 -20,26 L-6,26 Q-22,36 -28,64 Z" fill="#547ea3" />
      <path d="M20,26 Q40,32 46,64 L32,64 Q28,38 12,27 Z" fill="#2b4159" />
      {/* fibule d'or à l'épaule */}
      <circle cx={-21} cy={33} r={4.2} fill={P.or} />
      <circle cx={-22} cy={32} r={2} fill={P.orLit} />

      {/* chevelure : masse arrière, puis mèches */}
      <path
        d="M-34,-6 Q-38,-40 -16,-48 Q0,-54 16,-48 Q38,-40 34,-6 Q36,14 30,24 Q28,4 22,-8 L-22,-8 Q-28,4 -30,24 Q-36,14 -34,-6 Z"
        fill="url(#zeus-cheveux)"
      />
      {[
        'M-30,-16 Q-26,-34 -12,-42',
        'M-18,-24 Q-14,-38 -2,-44',
        'M18,-24 Q14,-38 2,-44',
        'M30,-16 Q26,-34 12,-42',
      ].map((d) => (
        <path key={d} d={d} stroke={P.cheveuxOmbre} strokeWidth={1.8} fill="none" opacity={0.55} strokeLinecap="round" />
      ))}
      <path d="M-27,-20 Q-23,-35 -11,-42" stroke={P.cheveuxLit} strokeWidth={1.6} fill="none" strokeLinecap="round" />

      {/* visage */}
      <path
        d="M-23,-14 Q-23,-33 0,-33 Q23,-33 23,-14 Q23,8 15,20 Q8,30 0,30 Q-8,30 -15,20 Q-23,8 -23,-14 Z"
        fill="url(#zeus-peau)"
      />
      {/* front lourd et tempes creusées */}
      <path d="M-19,-16 Q0,-24 19,-16" stroke={P.peauOmbre} strokeWidth={1.2} fill="none" opacity={0.4} />
      <path d="M-17,-9 Q0,-15 17,-9" stroke={P.peauOmbre} strokeWidth={1} fill="none" opacity={0.3} />

      {/*
       * LA BARBE, posée avant la bouche. Dessinée après, elle recouvrait le
       * visage jusqu'au nez et Zeus prenait des airs de grand-mère en bonnet.
       * Elle part maintenant du bas des joues et encadre la mâchoire.
       */}
      <path
        d="M-22,2 Q-25,26 -15,42 Q-7,53 0,53 Q7,53 15,42 Q25,26 22,2 Q19,18 15,22 Q8,30 0,30 Q-8,30 -15,22 Q-19,18 -22,2 Z"
        fill="url(#zeus-cheveux)"
      />
      {/* favoris qui remontent vers l'oreille : la barbe tient au visage */}
      <path d="M-22,2 Q-24,-8 -21,-15 L-17,-13 Q-19,-5 -18,4 Z" fill={P.cheveuxMi} />
      <path d="M22,2 Q24,-8 21,-15 L17,-13 Q19,-5 18,4 Z" fill={P.cheveuxOmbre} />
      {['M-15,14 Q-14,32 -7,44', 'M0,22 Q0,38 0,50', 'M15,14 Q14,32 7,44'].map((d) => (
        <path key={d} d={d} stroke={P.cheveuxOmbre} strokeWidth={1.6} fill="none" opacity={0.5} strokeLinecap="round" />
      ))}
      {[
        { cx: -11, cy: 45 },
        { cx: 0, cy: 51 },
        { cx: 11, cy: 45 },
      ].map((b) => (
        <g key={b.cx}>
          <circle cx={b.cx} cy={b.cy} r={4.8} fill={P.cheveuxMi} />
          <circle cx={b.cx - 1.4} cy={b.cy - 1.4} r={2.7} fill={P.cheveuxLit} />
        </g>
      ))}

      {/* sourcils barrés - c'est eux qui font l'autorité du visage */}
      <path
        d={`M-18,${-6 + sourcil} Q-10,${-11 + sourcil} -3,${-7 + sourcil}`}
        stroke={P.cheveuxOmbre}
        strokeWidth={3.4}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M18,${-6 + sourcil} Q10,${-11 + sourcil} 3,${-7 + sourcil}`}
        stroke={P.cheveuxOmbre}
        strokeWidth={3.4}
        fill="none"
        strokeLinecap="round"
      />

      {/* yeux : sclère, iris clair, pupille, éclat NW */}
      {[-9.5, 9.5].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={0} rx={5.2} ry={3.1} fill="#f6efe0" />
          <circle cx={x + 0.4} cy={0.2} r={2.5} fill="#7fa8c4" />
          <circle cx={x + 0.4} cy={0.2} r={1.2} fill="#1d2a33" />
          <circle cx={x - 0.5} cy={-0.7} r={0.75} fill="#ffffff" />
          <path
            d={`M${x - 5.2},-0.6 Q${x},-4.2 ${x + 5.2},-0.6`}
            stroke={P.peauOmbre}
            strokeWidth={1}
            fill="none"
            opacity={0.6}
          />
        </g>
      ))}

      {/* nez droit, à l'antique */}
      <path d="M0,-4 L-3,9 Q0,11 3,9 L0,-4" fill={P.peauMi} />
      <path d="M0,-4 L-3,9 Q-1.4,10 0,10 Z" fill={P.peauLit} opacity={0.7} />
      <path d="M-3.6,9.6 Q0,12.4 3.6,9.6" stroke={P.peauOmbre} strokeWidth={1} fill="none" opacity={0.7} />

      {/* bouche, puis la moustache par-dessus : c'est elle qui doit dominer */}
      <path d={bouche} fill="#8d5a4a" />
      <path d="M-13,15 Q-5,11.5 0,14.5 Q5,11.5 13,15 Q6,19.5 0,18.5 Q-6,19.5 -13,15 Z" fill={P.cheveuxLit} />
      <path d="M-13,15 Q-5,11.5 0,14.5 Q-4,16.5 -8,18.5 Z" fill="#ffffff" opacity={0.5} />
      <path d="M13,15 Q5,11.5 0,14.5 Q4,16.5 8,18.5 Z" fill={P.cheveuxOmbre} opacity={0.5} />

      {/* couronne de laurier */}
      <g>
        <path d="M-31,-24 Q0,-42 31,-24" stroke={P.laurierOmbre} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        {Array.from({ length: 11 }, (_, i) => {
          const t = i / 10
          const x = -31 + 62 * t
          const y = -24 - 18 * Math.sin(Math.PI * t)
          const rot = -60 + t * 120
          return (
            <g key={i} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(0)})`}>
              <ellipse rx={7} ry={2.8} fill={i % 2 ? P.laurierOmbre : P.laurier} />
              <ellipse cx={-1.4} cy={-0.7} rx={4.4} ry={1.5} fill={P.laurierLit} opacity={0.75} />
            </g>
          )
        })}
        {/* baies d'or */}
        {[-20, 0, 20].map((x) => (
          <circle key={x} cx={x} cy={-34 + Math.abs(x) * 0.22} r={2} fill={P.or} />
        ))}
      </g>

      {/* l'éclair, tenu bas à droite - la signature du personnage */}
      <g transform="translate(40,26) rotate(18)">
        <path d="M0,-26 L-7,-4 L-1,-4 L-6,18 L9,-6 L2,-6 L8,-26 Z" fill={P.or} />
        <path d="M0,-26 L-7,-4 L-3.4,-4 L1.6,-26 Z" fill={P.orLit} />
        <animate attributeName="opacity" values="1;0.68;1" dur="2.8s" repeatCount="indefinite" />
      </g>
    </svg>
  )
}
