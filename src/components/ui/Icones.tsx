import { useId } from 'react'
import { RES } from '../../game/data'
import type { GodId, ResourceId, UnitId } from '../../game/types'

/*
 * Pictogrammes peints v2 - même bible que la carte (docs/STYLE-ART.md) :
 * lumière au NORD-OUEST, ombre portée au SUD-EST (#241a08), zéro contour noir,
 * liserés seulement dans la teinte sombre du matériau. Le volume vient des
 * dégradés : bois de bout à cernes, bloc taillé à trois faces, épis grain à
 * grain, lingot poli à tranche, étoiles biseautées en facettes.
 *
 * Chaque dessin reçoit un préfixe `p` (useId) : plusieurs icônes sur la même
 * page ne se volent pas leurs dégradés.
 *
 * API inchangée : <Icone id taille titre />, <Montant n id taille signe />,
 * nomRessource(). Nouveaux ids : les 7 unités et les 4 Olympiens.
 */

export type IconeId = ResourceId | 'faveur' | 'prestige' | UnitId | GodId

type Dessin = (props: { p: string }) => JSX.Element

// ─────────── Ressources ───────────

const Bois: Dessin = ({ p }) => (
  <g>
      <defs>
      <linearGradient id={`${p}ec`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a98050" /><stop offset=".45" stopColor="#7c5a30" /><stop offset="1" stopColor="#4c3418" /></linearGradient>
      <radialGradient id={`${p}bt`} cx=".38" cy=".34" r=".72"><stop offset="0" stopColor="#ecd09c" /><stop offset=".6" stopColor="#cba66b" /><stop offset="1" stopColor="#9a7646" /></radialGradient>
      </defs>
      <ellipse cx="13.6" cy="20.5" rx="9.6" ry="1.5" fill="#241a08" opacity=".24" />
      <path d="M4,13.2 H19.6 Q21.3,16.4 19.6,19.6 H4 Z" fill={`url(#${p}ec)`}/>
      <path d="M6.4,13.8 H19" stroke="#c9a36e" strokeWidth=".7" opacity=".7" strokeLinecap="round" />
      <path d="M8,15.4 h4.6 M10.4,17.9 h6 M15,14.9 h3 M6.8,18.6 h2.4" stroke="#4c3418" strokeWidth=".55" opacity=".6" strokeLinecap="round" />
      <ellipse cx="4" cy="16.4" rx="2.5" ry="3.2" fill={`url(#${p}bt)`}/>
      <ellipse cx="4" cy="16.4" rx="2.5" ry="3.2" fill="none" stroke="#5f462d" strokeWidth=".55" />
      <ellipse cx="4" cy="16.5" rx="1.55" ry="2.05" fill="none" stroke="#a47f4c" strokeWidth=".45" />
      <ellipse cx="4" cy="16.6" rx=".75" ry="1" fill="none" stroke="#a47f4c" strokeWidth=".4" />
      <circle cx="4.05" cy="16.6" r=".35" fill="#7a5a30" />
      <ellipse cx="14.4" cy="13.2" rx="7.4" ry=".75" fill="#241a08" opacity=".4" />
      <path d="M7.5,6.6 H21 Q22.7,9.8 21,13 H7.5 Z" fill={`url(#${p}ec)`}/>
      <path d="M9.8,7.2 H20.4" stroke="#d2ad78" strokeWidth=".75" opacity=".75" strokeLinecap="round" />
      <path d="M11.4,8.9 h3.4 M13.6,11.4 h5.4 M18,9 h2" stroke="#4c3418" strokeWidth=".55" opacity=".6" strokeLinecap="round" />
      <ellipse cx="16.4" cy="10.2" rx=".95" ry=".62" fill="#4c3418" opacity=".85" />
      <ellipse cx="16.2" cy="10" rx=".4" ry=".25" fill="#a98050" />
      <ellipse cx="7.5" cy="9.8" rx="2.5" ry="3.2" fill={`url(#${p}bt)`}/>
      <ellipse cx="7.5" cy="9.8" rx="2.5" ry="3.2" fill="none" stroke="#5f462d" strokeWidth=".55" />
      <ellipse cx="7.5" cy="9.9" rx="1.55" ry="2.05" fill="none" stroke="#a47f4c" strokeWidth=".45" />
      <ellipse cx="7.5" cy="10" rx=".75" ry="1" fill="none" stroke="#a47f4c" strokeWidth=".4" />
      <circle cx="7.55" cy="10" r=".35" fill="#7a5a30" />
      <path d="M6.2,8 Q6.6,7.2 7.4,7" stroke="#f6e3bb" strokeWidth=".5" fill="none" strokeLinecap="round" opacity=".8" />
  </g>
)

const Pierre: Dessin = ({ p }) => (
  <g>
      <defs>
      <linearGradient id={`${p}d`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f5eedd" /><stop offset="1" stopColor="#d2c8af" /></linearGradient>
      <linearGradient id={`${p}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cbc1a8" /><stop offset="1" stopColor="#a49a80" /></linearGradient>
      <linearGradient id={`${p}o`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#928872" /><stop offset="1" stopColor="#6c6350" /></linearGradient>
      </defs>
      <path d="M12,19.8 L21,15.4 L23.4,17.1 L14.6,21.5 Z" fill="#241a08" opacity=".2" />
      <ellipse cx="11.6" cy="19.2" rx="9.4" ry="1.7" fill="#241a08" opacity=".14" />
      <path d="M3,8.6 L12,13 L12,19.8 L3,15.4 Z" fill={`url(#${p}g)`}/>
      <path d="M21,8.6 L12,13 L12,19.8 L21,15.4 Z" fill={`url(#${p}o)`}/>
      <path d="M3,8.6 L12,4.2 L21,8.6 L12,13 Z" fill={`url(#${p}d)`}/>
      <path d="M18.5,7.35 L21,8.6 L19.7,9.25 L18.9,8.3 Z" fill="#b5ab93" />
      <path d="M3,8.6 L12,4.2 L18.5,7.35" stroke="#fffaf0" strokeWidth=".8" fill="none" strokeLinecap="round" />
      <path d="M3.2,8.75 L12,13" stroke="#fff7e6" strokeWidth=".55" opacity=".7" />
      <path d="M12,13 L12,19.8" stroke="#5d5544" strokeWidth=".6" />
      <path d="M12,13 L19.7,9.25" stroke="#7d7461" strokeWidth=".45" opacity=".8" />
      <path d="M5,11.3 l1.2,.6 M7.6,12 l1.2,.6 M4.6,13.5 l1.2,.6 M8.4,14.4 l1.2,.6 M6.2,15.6 l1.2,.6 M9.4,16.7 l1.2,.6" stroke="#948a72" strokeWidth=".5" strokeLinecap="round" />
      <path d="M14.4,15 l1.3,-.6 M17.4,13 l1.3,-.6 M15.2,17.6 l1.3,-.6 M18.4,15.6 l1.3,-.6" stroke="#57503f" strokeWidth=".5" opacity=".75" strokeLinecap="round" />
      <path d="M8.4,7.6 l2.2,-1 M13.2,6.9 l2.4,1.1 M10.6,9.6 l2.6,1.2" stroke="#d9cfb7" strokeWidth=".45" strokeLinecap="round" />
      <path d="M1.4,19.5 L3.5,18.5 L5.4,19.3 L3.3,20.3 Z" fill="#d9cfb7" />
      <path d="M3.3,20.3 L5.4,19.3 L5.4,20.1 L3.3,21.1 Z" fill="#857b64" />
      <path d="M1.4,19.5 L3.3,20.3 L3.3,21.1 L1.4,20.3 Z" fill="#aca288" />
  </g>
)

const Grain: Dessin = (_) => (
  <g>
      <ellipse cx="13" cy="21.3" rx="6.6" ry="1.2" fill="#241a08" opacity=".22" />
      <path d="M7.4,21 L8.8,11.4 M9.8,21 L10.4,11.8 M12,21.2 L12,10.4" stroke="#d6b560" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M14.2,21 L13.6,11.8 M16.6,21 L15.2,11.4" stroke="#a2833a" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M8.4,20.9 L9.4,20.9 M13.4,20.9 L15.4,20.9" stroke="#8a6f30" strokeWidth=".6" strokeLinecap="round" />
      <g transform="rotate(-20 7.8 11)"><path d="M7.8,3.4 L7.8,11.6" stroke="#9c7d33" strokeWidth=".5" /><path d="M6.55,4.6 l-1.3,-2.3 M9.05,4.6 l1.3,-2.3" stroke="#ecd594" strokeWidth=".35" strokeLinecap="round" /><ellipse cx="8.75" cy="5.4" rx=".95" ry="1.35" transform="rotate(28 8.75 5.4)" fill="#c29d43" /><ellipse cx="6.85" cy="5.4" rx=".95" ry="1.35" transform="rotate(-28 6.85 5.4)" fill="#f2d77c" /><ellipse cx="6.6" cy="4.95" rx=".32" ry=".5" transform="rotate(-28 6.85 5.4)" fill="#fbecb4" /><path d="M6.55,6.1 l-1.3,-2.3 M9.05,6.1 l1.3,-2.3" stroke="#ecd594" strokeWidth=".35" strokeLinecap="round" /><ellipse cx="8.75" cy="6.9" rx=".95" ry="1.35" transform="rotate(28 8.75 6.9)" fill="#c29d43" /><ellipse cx="6.85" cy="6.9" rx=".95" ry="1.35" transform="rotate(-28 6.85 6.9)" fill="#f2d77c" /><ellipse cx="6.6" cy="6.45" rx=".32" ry=".5" transform="rotate(-28 6.85 6.9)" fill="#fbecb4" /><path d="M6.55,7.6 l-1.3,-2.3 M9.05,7.6 l1.3,-2.3" stroke="#ecd594" strokeWidth=".35" strokeLinecap="round" /><ellipse cx="8.75" cy="8.4" rx=".95" ry="1.35" transform="rotate(28 8.75 8.4)" fill="#c29d43" /><ellipse cx="6.85" cy="8.4" rx=".95" ry="1.35" transform="rotate(-28 6.85 8.4)" fill="#f2d77c" /><ellipse cx="6.6" cy="7.95" rx=".32" ry=".5" transform="rotate(-28 6.85 8.4)" fill="#fbecb4" /><ellipse cx="8.75" cy="9.9" rx=".95" ry="1.35" transform="rotate(28 8.75 9.9)" fill="#c29d43" /><ellipse cx="6.85" cy="9.9" rx=".95" ry="1.35" transform="rotate(-28 6.85 9.9)" fill="#f2d77c" /><ellipse cx="6.6" cy="9.45" rx=".32" ry=".5" transform="rotate(-28 6.85 9.9)" fill="#fbecb4" /><ellipse cx="7.8" cy="4.1" rx=".8" ry="1.2" fill="#f6e39b" /></g><g transform="rotate(20 16.2 11)"><path d="M16.2,3.4 L16.2,11.6" stroke="#9c7d33" strokeWidth=".5" /><path d="M14.95,4.6 l-1.3,-2.3 M17.45,4.6 l1.3,-2.3" stroke="#ecd594" strokeWidth=".35" strokeLinecap="round" /><ellipse cx="17.15" cy="5.4" rx=".95" ry="1.35" transform="rotate(28 17.15 5.4)" fill="#c29d43" /><ellipse cx="15.25" cy="5.4" rx=".95" ry="1.35" transform="rotate(-28 15.25 5.4)" fill="#f2d77c" /><ellipse cx="15" cy="4.95" rx=".32" ry=".5" transform="rotate(-28 15.25 5.4)" fill="#fbecb4" /><path d="M14.95,6.1 l-1.3,-2.3 M17.45,6.1 l1.3,-2.3" stroke="#ecd594" strokeWidth=".35" strokeLinecap="round" /><ellipse cx="17.15" cy="6.9" rx=".95" ry="1.35" transform="rotate(28 17.15 6.9)" fill="#c29d43" /><ellipse cx="15.25" cy="6.9" rx=".95" ry="1.35" transform="rotate(-28 15.25 6.9)" fill="#f2d77c" /><ellipse cx="15" cy="6.45" rx=".32" ry=".5" transform="rotate(-28 15.25 6.9)" fill="#fbecb4" /><path d="M14.95,7.6 l-1.3,-2.3 M17.45,7.6 l1.3,-2.3" stroke="#ecd594" strokeWidth=".35" strokeLinecap="round" /><ellipse cx="17.15" cy="8.4" rx=".95" ry="1.35" transform="rotate(28 17.15 8.4)" fill="#c29d43" /><ellipse cx="15.25" cy="8.4" rx=".95" ry="1.35" transform="rotate(-28 15.25 8.4)" fill="#f2d77c" /><ellipse cx="15" cy="7.95" rx=".32" ry=".5" transform="rotate(-28 15.25 8.4)" fill="#fbecb4" /><ellipse cx="17.15" cy="9.9" rx=".95" ry="1.35" transform="rotate(28 17.15 9.9)" fill="#c29d43" /><ellipse cx="15.25" cy="9.9" rx=".95" ry="1.35" transform="rotate(-28 15.25 9.9)" fill="#f2d77c" /><ellipse cx="15" cy="9.45" rx=".32" ry=".5" transform="rotate(-28 15.25 9.9)" fill="#fbecb4" /><ellipse cx="16.2" cy="4.1" rx=".8" ry="1.2" fill="#f6e39b" /></g><g transform="rotate(0 12 9)"><path d="M12,1.4 L12,9.6" stroke="#9c7d33" strokeWidth=".5" /><path d="M10.75,2.6 l-1.3,-2.3 M13.25,2.6 l1.3,-2.3" stroke="#ecd594" strokeWidth=".35" strokeLinecap="round" /><ellipse cx="12.95" cy="3.4" rx=".95" ry="1.35" transform="rotate(28 12.95 3.4)" fill="#c29d43" /><ellipse cx="11.05" cy="3.4" rx=".95" ry="1.35" transform="rotate(-28 11.05 3.4)" fill="#f2d77c" /><ellipse cx="10.8" cy="2.95" rx=".32" ry=".5" transform="rotate(-28 11.05 3.4)" fill="#fbecb4" /><path d="M10.75,4.1 l-1.3,-2.3 M13.25,4.1 l1.3,-2.3" stroke="#ecd594" strokeWidth=".35" strokeLinecap="round" /><ellipse cx="12.95" cy="4.9" rx=".95" ry="1.35" transform="rotate(28 12.95 4.9)" fill="#c29d43" /><ellipse cx="11.05" cy="4.9" rx=".95" ry="1.35" transform="rotate(-28 11.05 4.9)" fill="#f2d77c" /><ellipse cx="10.8" cy="4.45" rx=".32" ry=".5" transform="rotate(-28 11.05 4.9)" fill="#fbecb4" /><path d="M10.75,5.6 l-1.3,-2.3 M13.25,5.6 l1.3,-2.3" stroke="#ecd594" strokeWidth=".35" strokeLinecap="round" /><ellipse cx="12.95" cy="6.4" rx=".95" ry="1.35" transform="rotate(28 12.95 6.4)" fill="#c29d43" /><ellipse cx="11.05" cy="6.4" rx=".95" ry="1.35" transform="rotate(-28 11.05 6.4)" fill="#f2d77c" /><ellipse cx="10.8" cy="5.95" rx=".32" ry=".5" transform="rotate(-28 11.05 6.4)" fill="#fbecb4" /><ellipse cx="12.95" cy="7.9" rx=".95" ry="1.35" transform="rotate(28 12.95 7.9)" fill="#c29d43" /><ellipse cx="11.05" cy="7.9" rx=".95" ry="1.35" transform="rotate(-28 11.05 7.9)" fill="#f2d77c" /><ellipse cx="10.8" cy="7.45" rx=".32" ry=".5" transform="rotate(-28 11.05 7.9)" fill="#fbecb4" /><ellipse cx="12" cy="2.1" rx=".8" ry="1.2" fill="#f6e39b" /></g>
      <path d="M7.9,16 Q12,14.4 16.1,16 L16.1,17.5 Q12,15.9 7.9,17.5 Z" fill="#8e6f34" />
      <path d="M8,16 Q12,14.5 16,16" stroke="#dcbd70" strokeWidth=".6" fill="none" />
      <ellipse cx="12.6" cy="16.2" rx="1.05" ry=".85" fill="#a5854a" />
      <path d="M12.1,15.9 Q12.6,15.5 13.1,15.8" stroke="#e2c47e" strokeWidth=".4" fill="none" />
  </g>
)

const Bronze: Dessin = ({ p }) => (
  <g>
      <defs>
      <linearGradient id={`${p}m`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f3d488" /><stop offset=".32" stopColor="#d6a043" /><stop offset=".68" stopColor="#a8712a" /><stop offset="1" stopColor="#7a4f18" /></linearGradient>
      <linearGradient id={`${p}b`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fbe7ad" /><stop offset="1" stopColor="#d9a64a" stopOpacity="0" /></linearGradient>
      </defs>
      <ellipse cx="13" cy="20.8" rx="9" ry="1.5" fill="#241a08" opacity=".24" />
      <path transform="translate(.7 1.3)" d="M4.2,5 Q7.6,7.6 12,7.2 Q16.4,7.6 19.8,5 Q17.2,9.4 17.6,12.6 Q17.2,16.4 19.8,19.4 Q16.4,16.8 12,17.2 Q7.6,16.8 4.2,19.4 Q6.8,16.4 6.4,12.6 Q6.8,9.4 4.2,5 Z" fill="#5a3a10" />
      <path d="M4.2,5 Q7.6,7.6 12,7.2 Q16.4,7.6 19.8,5 Q17.2,9.4 17.6,12.6 Q17.2,16.4 19.8,19.4 Q16.4,16.8 12,17.2 Q7.6,16.8 4.2,19.4 Q6.8,16.4 6.4,12.6 Q6.8,9.4 4.2,5 Z" fill={`url(#${p}m)`}/>
      <path d="M6.2,7 Q8.6,8.9 12,8.7 Q15.2,8.9 17.4,7.4 Q15.8,10 16,12.6 Q15.8,15.4 17.4,17.4 Q15.2,15.9 12,16 Q8.6,15.9 6.6,17.4 Q8,15.2 7.9,12.6 Q8,10 6.2,7 Z" fill={`url(#${p}b)`} opacity=".75" />
      <path d="M5.4,6.1 Q7.8,8.2 10.8,8.2" stroke="#fff3cf" strokeWidth=".9" fill="none" strokeLinecap="round" />
      <path d="M6.5,9.4 Q7.2,11 7,12.4" stroke="#fbe2a0" strokeWidth=".6" fill="none" strokeLinecap="round" opacity=".8" />
      <path d="M18.9,6.4 Q17.3,9.6 17.6,12.6 Q17.3,16 18.9,18.6 Q16.2,16.6 12.4,16.8" stroke="#5a3a10" strokeWidth=".6" fill="none" opacity=".6" />
      <path d="M10.2,11.2 L13.8,14.2 M13.8,11.2 L10.2,14.2" stroke="#6e4614" strokeWidth=".75" strokeLinecap="round" opacity=".85" />
      <path d="M10.3,11 L13.9,14" stroke="#f0cd84" strokeWidth=".3" opacity=".7" />
      <ellipse cx="15.6" cy="15.4" rx="1.1" ry=".6" fill="#6f9e88" opacity=".5" />
      <ellipse cx="6.3" cy="16.6" rx=".6" ry=".4" fill="#6f9e88" opacity=".45" />
  </g>
)

const Faveur: Dessin = ({ p }) => (
  <g>
      <defs>
      <radialGradient id={`${p}h`}><stop offset="0" stopColor="#fff3c0" stopOpacity=".7" /><stop offset=".45" stopColor="#e8c04a" stopOpacity=".22" /><stop offset="1" stopColor="#e8c04a" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill={`url(#${p}h)`}/>
      <path d="M12,12 L15.96,8.04 L13.4,12 Z" fill="#f0cf6a" /><path d="M12,12 L13.4,12 L15.96,15.96 Z" fill="#c9982f" /><path d="M12,12 L15.96,15.96 L12,13.4 Z" fill="#c9982f" /><path d="M12,12 L12,13.4 L8.04,15.96 Z" fill="#f0cf6a" /><path d="M12,12 L8.04,15.96 L10.6,12 Z" fill="#f0cf6a" /><path d="M12,12 L10.6,12 L8.04,8.04 Z" fill="#fdf1c4" /><path d="M12,12 L8.04,8.04 L12,10.6 Z" fill="#fdf1c4" /><path d="M12,12 L12,10.6 L15.96,8.04 Z" fill="#f0cf6a" />
      <path d="M12,12 L12,2.4 L13.48,10.52 Z" fill="#fff6d6" /><path d="M12,12 L13.48,10.52 L21.6,12 Z" fill="#b8862a" /><path d="M12,12 L21.6,12 L13.48,13.48 Z" fill="#b8862a" /><path d="M12,12 L13.48,13.48 L12,21.6 Z" fill="#b8862a" /><path d="M12,12 L12,21.6 L10.52,13.48 Z" fill="#b8862a" /><path d="M12,12 L10.52,13.48 L2.4,12 Z" fill="#fff6d6" /><path d="M12,12 L2.4,12 L10.52,10.52 Z" fill="#fff6d6" /><path d="M12,12 L10.52,10.52 L12,2.4 Z" fill="#fff6d6" />
      <circle cx="12" cy="12" r="1.9" fill="#fffbea" />
      <circle cx="11.5" cy="11.5" r=".8" fill="#ffffff" />
      <circle cx="19.2" cy="4.6" r=".75" fill="#f6e39b" />
      <circle cx="4.6" cy="19.2" r=".55" fill="#f6e39b" opacity=".8" />
      <circle cx="19.6" cy="18.4" r=".4" fill="#f6e39b" opacity=".7" />
  </g>
)

const Prestige: Dessin = (_) => (
  <g>
      <ellipse cx="12.8" cy="21.8" rx="7.4" ry="1.1" fill="#241a08" opacity=".2" />
      <path d="M8.29,19.18 A7.9,7.9 0 0 1 7.14,5.97" stroke="#4f7a3c" strokeWidth=".7" fill="none" strokeLinecap="round" /><ellipse cx="7.72" cy="17.42" rx="1.65" ry=".72" transform="rotate(191.4 7.72 17.42)" fill="#93bb6c" /><ellipse cx="6.26" cy="19.19" rx="1.65" ry=".72" transform="rotate(247.4 6.26 19.19)" fill="#6f9a52" /><ellipse cx="6.03" cy="15.35" rx="1.65" ry=".72" transform="rotate(214.2 6.03 15.35)" fill="#93bb6c" /><ellipse cx="3.99" cy="16.42" rx="1.65" ry=".72" transform="rotate(270.2 3.99 16.42)" fill="#6f9a52" /><ellipse cx="5.28" cy="12.79" rx="1.65" ry=".72" transform="rotate(237 5.28 12.79)" fill="#93bb6c" /><ellipse cx="2.98" cy="12.99" rx="1.65" ry=".72" transform="rotate(293 2.98 12.99)" fill="#6f9a52" /><ellipse cx="5.57" cy="10.14" rx="1.65" ry=".72" transform="rotate(259.8 5.57 10.14)" fill="#93bb6c" /><ellipse cx="3.38" cy="9.43" rx="1.65" ry=".72" transform="rotate(315.8 3.38 9.43)" fill="#6f9a52" /><ellipse cx="6.87" cy="7.81" rx="1.65" ry=".72" transform="rotate(282.6 6.87 7.81)" fill="#93bb6c" /><ellipse cx="5.13" cy="6.31" rx="1.65" ry=".72" transform="rotate(338.6 5.13 6.31)" fill="#6f9a52" /><ellipse cx="7.01" cy="5.82" rx="1.3" ry=".62" transform="rotate(322 7.01 5.82)" fill="#93bb6c" />
      <path d="M15.71,19.18 A7.9,7.9 0 0 0 16.86,5.97" stroke="#3d5e2e" strokeWidth=".7" fill="none" strokeLinecap="round" /><ellipse cx="16.28" cy="17.42" rx="1.65" ry=".72" transform="rotate(168.6 16.28 17.42)" fill="#4e7439" /><ellipse cx="17.74" cy="19.19" rx="1.65" ry=".72" transform="rotate(112.6 17.74 19.19)" fill="#6a9150" /><ellipse cx="17.97" cy="15.35" rx="1.65" ry=".72" transform="rotate(145.8 17.97 15.35)" fill="#4e7439" /><ellipse cx="20.01" cy="16.42" rx="1.65" ry=".72" transform="rotate(89.8 20.01 16.42)" fill="#6a9150" /><ellipse cx="18.72" cy="12.79" rx="1.65" ry=".72" transform="rotate(123 18.72 12.79)" fill="#4e7439" /><ellipse cx="21.02" cy="12.99" rx="1.65" ry=".72" transform="rotate(67 21.02 12.99)" fill="#6a9150" /><ellipse cx="18.43" cy="10.14" rx="1.65" ry=".72" transform="rotate(100.2 18.43 10.14)" fill="#4e7439" /><ellipse cx="20.62" cy="9.43" rx="1.65" ry=".72" transform="rotate(44.2 20.62 9.43)" fill="#6a9150" /><ellipse cx="17.13" cy="7.81" rx="1.65" ry=".72" transform="rotate(77.4 17.13 7.81)" fill="#4e7439" /><ellipse cx="18.87" cy="6.31" rx="1.65" ry=".72" transform="rotate(21.4 18.87 6.31)" fill="#6a9150" /><ellipse cx="16.99" cy="5.82" rx="1.3" ry=".62" transform="rotate(38 16.99 5.82)" fill="#6a9150" />
      <path d="M11.3,19.6 L9.4,22.8 L10.7,22.4 L11.5,23.3 L12.4,19.9 Z" fill="#b0412e" />
      <path d="M12.7,19.6 L14.6,22.8 L13.3,22.4 L12.5,23.3 L11.6,19.9 Z" fill="#7e2a1d" />
      <ellipse cx="12" cy="19.6" rx="1.35" ry="1" fill="#c9553c" />
      <ellipse cx="11.7" cy="19.3" rx=".5" ry=".3" fill="#e88a6e" />
      <path d="M12,11.6 L12,5.6 L13.47,9.58 Z" fill="#fbecb0" /><path d="M12,11.6 L13.47,9.58 L17.71,9.75 Z" fill="#e8c04a" /><path d="M12,11.6 L17.71,9.75 L14.38,12.37 Z" fill="#a8802a" /><path d="M12,11.6 L14.38,12.37 L15.53,16.45 Z" fill="#a8802a" /><path d="M12,11.6 L15.53,16.45 L12,14.1 Z" fill="#a8802a" /><path d="M12,11.6 L12,14.1 L8.47,16.45 Z" fill="#e8c04a" /><path d="M12,11.6 L8.47,16.45 L9.62,12.37 Z" fill="#e8c04a" /><path d="M12,11.6 L9.62,12.37 L6.29,9.75 Z" fill="#fbecb0" /><path d="M12,11.6 L6.29,9.75 L10.53,9.58 Z" fill="#fbecb0" /><path d="M12,11.6 L10.53,9.58 L12,5.6 Z" fill="#fbecb0" />
      <circle cx="12" cy="11.6" r=".65" fill="#fff6d6" />
  </g>
)

// ─────────── Unités ───────────

const Lancier: Dessin = (_) => (
  <g>
      <path d="M6,21.2 L21.6,5.6" stroke="#241a08" strokeWidth="1.6" opacity=".14" strokeLinecap="round" />
      <g transform="rotate(45 12 12)">
      <path d="M11.35,10.4 H12.65 V20.4 H11.35 Z" fill="#8a6535" />
      <path d="M11.35,10.4 H11.85 V20.4 H11.35 Z" fill="#c09a68" />
      <path d="M12.3,10.4 H12.65 V20.4 H12.3 Z" fill="#5f462d" />
      <path d="M11.25,13.6 h1.5 M11.25,14.3 h1.5 M11.25,17.4 h1.5" stroke="#4a3520" strokeWidth=".35" />
      <path d="M11.4,20.3 L12.6,20.3 L12.25,23.2 L11.75,23.2 Z" fill="#a8702a" />
      <path d="M11.4,20.3 L12,20.3 L11.9,23.2 L11.75,23.2 Z" fill="#e0ad55" />
      <path d="M11.45,8.4 H12.55 V10.6 H11.45 Z" fill="#a8702a" />
      <path d="M11.45,8.4 H11.95 V10.6 H11.45 Z" fill="#e6b863" />
      <path d="M11.4,9.4 h1.2" stroke="#6e4614" strokeWidth=".35" />
      <path d="M12,0.9 Q9.8,4.2 10.1,6.4 Q10.6,8 12,8.8 Z" fill="#f2cd7c" />
      <path d="M12,0.9 Q14.2,4.2 13.9,6.4 Q13.4,8 12,8.8 Z" fill="#a8702a" />
      <path d="M12,1.6 L12,8.4" stroke="#7d5018" strokeWidth=".4" />
      <path d="M11.3,3.6 Q10.8,5.4 11.1,6.6" stroke="#fff0c4" strokeWidth=".35" fill="none" strokeLinecap="round" />
      </g>
  </g>
)

const Archer: Dessin = (_) => (
  <g>
      <ellipse cx="12" cy="22.4" rx="7.4" ry=".9" fill="#241a08" opacity=".16" />
      <path d="M11,2.7 L18,12 L11,21.3" stroke="#efe3c4" strokeWidth=".45" fill="none" />
      <path d="M11,2.4 Q9.4,3 9.2,4.4 Q6,12 9.2,19.6 Q9.4,21 11,21.6" stroke="#6a4b2a" strokeWidth="1.9" fill="none" strokeLinecap="round" />
      <path d="M10.6,2.6 Q9,3.2 8.8,4.5 Q5.8,12 8.8,19.5" stroke="#c49a64" strokeWidth=".6" fill="none" strokeLinecap="round" />
      <path d="M6.6,10.6 L8.1,10.6 L8.1,13.4 L6.6,13.4 Z" fill="#4a3520" />
      <path d="M6.6,11.3 h1.5 M6.6,12.1 h1.5 M6.6,12.9 h1.5" stroke="#8a6535" strokeWidth=".3" />
      <path d="M4.8,12 L18.3,12" stroke="#b58f60" strokeWidth=".85" />
      <path d="M4.8,11.7 L17,11.7" stroke="#dcc093" strokeWidth=".3" />
      <path d="M2.4,12 L5.6,10.5 L5.1,12 Z" fill="#f2cd7c" />
      <path d="M2.4,12 L5.6,13.5 L5.1,12 Z" fill="#a8702a" />
      <path d="M14.8,12 L16.6,10 L18.8,10 L17.4,12 Z" fill="#efe3c4" />
      <path d="M14.8,12 L16.6,14 L18.8,14 L17.4,12 Z" fill="#b8a67e" />
      <path d="M16.2,10.6 L17.6,10.6" stroke="#c9b893" strokeWidth=".3" />
      <path d="M18.2,11.3 L18.2,12.7" stroke="#5f462d" strokeWidth=".5" />
  </g>
)

const Hoplite: Dessin = ({ p }) => (
  <g>
      <defs>
      <linearGradient id={`${p}r`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6d98f" /><stop offset=".4" stopColor="#cf9540" /><stop offset="1" stopColor="#6e4614" /></linearGradient>
      <radialGradient id={`${p}f`} cx=".34" cy=".3" r=".8"><stop offset="0" stopColor="#d46a4a" /><stop offset=".55" stopColor="#9a3f2c" /><stop offset="1" stopColor="#5e2419" /></radialGradient>
      <radialGradient id={`${p}b`} cx=".35" cy=".3" r=".75"><stop offset="0" stopColor="#fbe7ad" /><stop offset=".5" stopColor="#d49a3c" /><stop offset="1" stopColor="#7a4f18" /></radialGradient>
      </defs>
      <ellipse cx="13.4" cy="21.9" rx="8.2" ry="1.3" fill="#241a08" opacity=".22" />
      <path d="M13.2,10.8 L20.6,3.4" stroke="#6a4b2a" strokeWidth="1.1" strokeLinecap="round" />
      <g transform="rotate(45 20.8 3.2)"><path d="M20.8,0.2 Q19.4,2.2 19.7,3.5 Q20.1,4.6 20.8,5 Z" fill="#f2cd7c" /><path d="M20.8,0.2 Q22.2,2.2 21.9,3.5 Q21.5,4.6 20.8,5 Z" fill="#a8702a" /></g>
      <ellipse cx="12.3" cy="13.4" rx="8.6" ry="8.9" fill="#4e3210" />
      <ellipse cx="11.6" cy="12.6" rx="8.6" ry="8.9" fill={`url(#${p}r)`}/>
      <ellipse cx="11.6" cy="12.6" rx="6.9" ry="7.2" fill="#5e2419" />
      <ellipse cx="11.75" cy="12.75" rx="6.7" ry="7" fill={`url(#${p}f)`}/>
      <path d="M7.6,15.6 L11.6,6.8 L15.6,15.6" stroke="#efe3c4" strokeWidth="1.3" fill="none" strokeLinejoin="round" opacity=".92" />
      <path d="M7.6,15.6 L11.6,6.8" stroke="#fffaf0" strokeWidth=".4" opacity=".8" />
      <path d="M4.3,9.4 Q5.6,5.6 9.4,4" stroke="#fff3cf" strokeWidth=".8" fill="none" strokeLinecap="round" opacity=".9" />
      <path d="M18.2,17.6 Q15.8,20.8 11.8,21.4" stroke="#4e3210" strokeWidth=".7" fill="none" strokeLinecap="round" opacity=".6" />
      <path d="M6.6,9.8 Q7.6,7.4 9.8,6.4" stroke="#e88a6e" strokeWidth=".5" fill="none" strokeLinecap="round" opacity=".6" />
  </g>
)

const Frondeur: Dessin = ({ p }) => (
  <g>
      <defs>
      <radialGradient id={`${p}c`} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#f2ecdc" /><stop offset=".6" stopColor="#bcb29b" /><stop offset="1" stopColor="#7e7460" /></radialGradient>
      <linearGradient id={`${p}p`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a87848" /><stop offset="1" stopColor="#5f3f22" /></linearGradient>
      </defs>
      <ellipse cx="13" cy="21" rx="8" ry="1.2" fill="#241a08" opacity=".2" />
      <path d="M7.6,15.2 Q4.6,10.2 7.2,4.8" stroke="#8f7650" strokeWidth=".95" fill="none" strokeLinecap="round" />
      <path d="M16.4,15.2 Q18.2,8 9.6,4" stroke="#6f5a3a" strokeWidth=".95" fill="none" strokeLinecap="round" />
      <path d="M7.6,15.2 Q4.6,10.2 7.2,4.8" stroke="#e2cc9c" strokeWidth=".45" fill="none" strokeDasharray=".8 .6" />
      <path d="M16.4,15.2 Q18.2,8 9.6,4" stroke="#c9ad7a" strokeWidth=".45" fill="none" strokeDasharray=".8 .6" />
      <ellipse cx="8.4" cy="3.8" rx="1.7" ry="1.15" fill="none" stroke="#8f7650" strokeWidth=".85" />
      <path d="M6.8,3.5 Q7.4,2.6 8.6,2.65" stroke="#e2cc9c" strokeWidth=".35" fill="none" />
      <ellipse cx="12" cy="14.2" rx="2.5" ry="2.1" fill={`url(#${p}c)`}/>
      <path d="M7.6,15.2 Q12,20.2 16.4,15.2 Q14.4,16.6 12,16.4 Q9.6,16.6 7.6,15.2 Z" fill={`url(#${p}p)`}/>
      <path d="M8.4,16 Q12,19.2 15.6,16" stroke="#c49a64" strokeWidth=".45" fill="none" opacity=".8" />
      <path d="M10.6,17.6 l.3,.6 M12,18.1 l0,.6 M13.4,17.6 l-.3,.6" stroke="#4a3018" strokeWidth=".35" />
      <ellipse cx="18.4" cy="20" rx="1.3" ry="1" fill={`url(#${p}c)`}/>
      <ellipse cx="20.8" cy="20.7" rx="1" ry=".8" fill={`url(#${p}c)`}/>
  </g>
)

const Peltaste: Dessin = ({ p }) => (
  <g>
      <defs>
      <linearGradient id={`${p}w`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#dcbd84" /><stop offset=".55" stopColor="#a8804e" /><stop offset="1" stopColor="#6a4b2a" /></linearGradient>
      </defs>
      <ellipse cx="12.6" cy="21.9" rx="8" ry="1.2" fill="#241a08" opacity=".2" />
      <path d="M4.6,21.4 L17,1.6" stroke="#7c5a30" strokeWidth=".9" strokeLinecap="round" />
      <path d="M19.4,21.4 L7,1.6" stroke="#6a4b2a" strokeWidth=".9" strokeLinecap="round" />
      <path d="M17.8,0.3 L16.4,2.8 L17.4,2.9 Z" fill="#f2cd7c" /><path d="M17.8,0.3 L17.4,2.9 L18.2,2.3 Z" fill="#a8702a" />
      <path d="M6.2,0.3 L6.6,2.9 L7.6,2.8 Z" fill="#f2cd7c" /><path d="M6.2,0.3 L5.8,2.3 L6.6,2.9 Z" fill="#a8702a" />
      <path transform="translate(.6 .9)" d="M4.2,6.4 A8.2,8.2 0 1 0 19.8,6.4 Q12,11.8 4.2,6.4 Z" fill="#3f2a14" />
      <path d="M4.2,6.4 A8.2,8.2 0 1 0 19.8,6.4 Q12,11.8 4.2,6.4 Z" fill={`url(#${p}w)`}/>
      <path d="M6.4,9.6 A6.3,6.3 0 1 0 17.6,9.6" stroke="#6a4b2a" strokeWidth=".5" fill="none" opacity=".6" />
      <path d="M8.4,11.6 A4.2,4.2 0 1 0 15.6,11.6" stroke="#6a4b2a" strokeWidth=".5" fill="none" opacity=".5" />
      <path d="M7.2,11 L5.6,12.4 M8,14.6 L6,15.6 M10,17.4 L9,19.2 M14,17.4 L15,19.2 M16,14.6 L18,15.6" stroke="#5f462d" strokeWidth=".45" opacity=".5" />
      <path d="M4.4,6.6 A8,8 0 0 0 7.4,17.8" stroke="#f3dca8" strokeWidth=".7" fill="none" strokeLinecap="round" />
      <path d="M4.4,6.5 Q12,11.6 19.6,6.5" stroke="#5f462d" strokeWidth=".55" fill="none" />
      <circle cx="12" cy="15" r="1.3" fill="#c9922f" /><circle cx="11.6" cy="14.6" r=".5" fill="#fbe2a0" />
  </g>
)

const Belier: Dessin = ({ p }) => (
  <g>
      <defs>
      <linearGradient id={`${p}l`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a98050" /><stop offset=".45" stopColor="#7c5a30" /><stop offset="1" stopColor="#4c3418" /></linearGradient>
      <linearGradient id={`${p}t`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f3d488" /><stop offset=".45" stopColor="#c98f3a" /><stop offset="1" stopColor="#6e4614" /></linearGradient>
      </defs>
      <ellipse cx="12.6" cy="21.6" rx="10" ry="1.2" fill="#241a08" opacity=".22" />
      <path d="M7.2,4.4 L4.4,21.4" stroke="#6a4b2a" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M7,4.6 L4.3,20.8" stroke="#b58f60" strokeWidth=".45" />
      <path d="M18.8,4.4 L21.6,21.4" stroke="#5a3f24" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M5.4,3.4 H20.6 V5.2 H5.4 Z" fill={`url(#${p}l)`}/>
      <path d="M5.4,3.5 H20.6" stroke="#d2ad78" strokeWidth=".5" />
      <path d="M10.2,5.2 L10.2,12.9 M16,5.2 L16,12.9" stroke="#c9ad7a" strokeWidth=".6" />
      <path d="M10.2,5.2 L10.2,12.9 M16,5.2 L16,12.9" stroke="#6f5a3a" strokeWidth=".6" strokeDasharray=".5 .7" />
      <ellipse cx="14" cy="17.9" rx="8" ry=".7" fill="#241a08" opacity=".3" />
      <path d="M6.4,12.8 H20.4 Q21.8,15.1 20.4,17.4 H6.4 Z" fill={`url(#${p}l)`}/>
      <path d="M7.6,13.4 H19.8" stroke="#d2ad78" strokeWidth=".55" opacity=".8" strokeLinecap="round" />
      <path d="M11,15.4 h3 M14.4,16.4 h4 M17,14.6 h2" stroke="#4c3418" strokeWidth=".5" opacity=".6" strokeLinecap="round" />
      <path d="M9.2,12.6 V17.6 M17.4,12.6 V17.6" stroke="#8a5a20" strokeWidth=".9" />
      <path d="M1.6,15.1 Q1.9,12.3 4.4,12 L7.2,12.2 L7.2,18 L4.4,18.2 Q1.9,17.9 1.6,15.1 Z" fill={`url(#${p}t)`}/>
      <path d="M2.2,14 Q2.8,12.6 4.4,12.5" stroke="#fff3cf" strokeWidth=".55" fill="none" strokeLinecap="round" />
      <circle cx="4.6" cy="14.6" r="1.35" fill="none" stroke="#6e4614" strokeWidth=".6" />
      <circle cx="4.6" cy="14.6" r=".55" fill="#6e4614" />
      <circle cx="6.4" cy="13" r=".3" fill="#fbe2a0" /><circle cx="6.4" cy="17.2" r=".3" fill="#8a5a20" />
  </g>
)

const Char: Dessin = ({ p }) => (
  <g>
      <defs>
      <linearGradient id={`${p}k`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d8b57c" /><stop offset="1" stopColor="#8a6535" /></linearGradient>
      </defs>
      <ellipse cx="11.6" cy="21.6" rx="9" ry="1.1" fill="#241a08" opacity=".22" />
      <path d="M13.4,12.2 Q18,11.8 22.6,8.4" stroke="#5f462d" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M13.4,11.8 Q18,11.4 22.4,8.1" stroke="#b58f60" strokeWidth=".35" fill="none" />
      <path d="M21.2,7.2 Q22.8,6.6 23.4,8 L22.4,9.4" stroke="#6a4b2a" strokeWidth=".8" fill="none" strokeLinecap="round" />
      <path d="M3.6,13 L3.6,10 Q3.6,9.2 4.4,9.2 L10.2,9.2 Q13.2,8.4 13.8,5.4 Q15,8.8 14.4,13 Z" fill={`url(#${p}k)`}/>
      <path d="M4.6,10.4 H12 M4.6,11.7 H13.4" stroke="#6a4b2a" strokeWidth=".4" opacity=".55" strokeDasharray="1 .5" />
      <path d="M3.6,9.4 Q3.8,9.1 4.4,9.1 L10.2,9.1 Q13,8.4 13.8,5.4" stroke="#f3dca8" strokeWidth=".6" fill="none" strokeLinecap="round" />
      <path d="M3.4,13 H14.6" stroke="#4a3520" strokeWidth=".9" />
      <circle cx="9" cy="16.2" r="5" fill="none" stroke="#4a3520" strokeWidth="1.5" />
      <path d="M4.4,14.4 A5,5 0 0 1 8.2,11.3" stroke="#b58f60" strokeWidth=".5" fill="none" strokeLinecap="round" />
      <path d="M9,11.6 V20.8 M4.4,16.2 H13.6" stroke="#7c5a30" strokeWidth=".85" />
      <path d="M8.75,11.6 V20.8 M4.4,15.95 H13.6" stroke="#b58f60" strokeWidth=".3" />
      <circle cx="9" cy="16.2" r="1.2" fill="#c9922f" /><circle cx="8.65" cy="15.85" r=".45" fill="#fbe2a0" />
  </g>
)

// ─────────── Olympiens ───────────

const Zeus: Dessin = ({ p }) => (
  <g>
      <defs>
      <radialGradient id={`${p}h`}><stop offset="0" stopColor="#fff3c0" stopOpacity=".55" /><stop offset=".5" stopColor="#b98be0" stopOpacity=".16" /><stop offset="1" stopColor="#b98be0" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill={`url(#${p}h)`}/>
      <path d="M15.4,1.2 L6.2,12.8 L11,12.9 L7.8,22.8 L18.2,9.6 L13.2,9.4 L17.8,1.2 Z" fill="#c9922f" />
      <path d="M15.4,1.2 L6.2,12.8 L8.6,12.85 L16.6,1.2 Z" fill="#fdf0b8" />
      <path d="M11,12.9 L7.8,22.8 L9.6,20.6 L12.5,12.95 Z" fill="#fbe39a" />
      <path d="M13.2,9.4 L18.2,9.6 L16.8,11.4 L12.6,11.1 Z" fill="#a8702a" />
      <path d="M16.6,1.2 L12.4,10.6" stroke="#fff8dc" strokeWidth=".45" opacity=".8" />
      <path d="M4.4,4.6 l1.6,1.2 M19.8,15.4 l1.8,.6 M3.6,17.8 l1.4,-.8 M20.6,5.8 l-1.4,1" stroke="#f6e39b" strokeWidth=".6" strokeLinecap="round" />
  </g>
)

const Poseidon: Dessin = ({ p }) => (
  <g>
      <defs>
      <linearGradient id={`${p}t`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f3d488" /><stop offset=".5" stopColor="#c98f3a" /><stop offset="1" stopColor="#7a4f18" /></linearGradient>
      </defs>
      <ellipse cx="13" cy="22.4" rx="8" ry=".9" fill="#241a08" opacity=".16" />
      <path d="M11.3,10 H12.7 V22.4 H11.3 Z" fill={`url(#${p}t)`}/>
      <path d="M11.3,13.6 h1.4 M11.3,14.3 h1.4" stroke="#6e4614" strokeWidth=".35" />
      <path d="M6.6,3.4 Q6.2,8.4 8.4,9.8 Q12,11.6 15.6,9.8 Q17.8,8.4 17.4,3.4" stroke="#a8702a" strokeWidth="1.35" fill="none" strokeLinecap="round" />
      <path d="M6.2,3.6 Q5.8,8.4 8,10" stroke="#fbe2a0" strokeWidth=".45" fill="none" />
      <path d="M12,1.6 L12,10.4" stroke="#c98f3a" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M11.6,2.2 L11.6,10" stroke="#fbe2a0" strokeWidth=".4" />
      <path d="M12,0.2 L10.6,2.8 L12,2.4 Z" fill="#fbe7ad" /><path d="M12,0.2 L13.4,2.8 L12,2.4 Z" fill="#a8702a" />
      <path d="M6.6,1.8 L5.3,4.4 L6.8,4 Z" fill="#fbe7ad" /><path d="M6.6,1.8 L7.9,4.2 L6.8,4 Z" fill="#a8702a" />
      <path d="M17.4,1.8 L16.1,4.2 L17.2,4 Z" fill="#e6b863" /><path d="M17.4,1.8 L18.7,4.4 L17.2,4 Z" fill="#7a4f18" />
      <path d="M2.2,20.2 Q5,17.8 7.8,19.8 Q10.4,21.6 12.6,19.4 Q15.2,17.2 18,19.6 Q20,21.2 22,19.6" stroke="#4f86a0" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M2.4,19.8 Q5,17.6 7.6,19.4 M12.8,19 Q15.2,17 17.8,19.2" stroke="#bfe0ea" strokeWidth=".55" fill="none" strokeLinecap="round" />
  </g>
)

const Athena: Dessin = ({ p }) => (
  <g>
      <defs>
      <linearGradient id={`${p}c`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d8c49a" /><stop offset=".55" stopColor="#9c8660" /><stop offset="1" stopColor="#5f4c32" /></linearGradient>
      </defs>
      <ellipse cx="13" cy="22" rx="8" ry="1" fill="#241a08" opacity=".2" />
      <path d="M3,20.8 Q12,19.6 21.6,21" stroke="#5f462d" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <ellipse cx="4.6" cy="19.4" rx="1.5" ry=".6" transform="rotate(-30 4.6 19.4)" fill="#6f9a52" />
      <ellipse cx="19.8" cy="19.6" rx="1.5" ry=".6" transform="rotate(25 19.8 19.6)" fill="#4f7a3c" />
      <ellipse cx="21.2" cy="21.8" rx="1.3" ry=".55" transform="rotate(-15 21.2 21.8)" fill="#587f42" />
      <path d="M6.8,8.2 L7.2,3.8 L10.2,7.2 Z" fill="#b39e76" />
      <path d="M17.2,8.2 L16.8,3.8 L13.8,7.2 Z" fill="#7c6848" />
      <ellipse cx="12" cy="13.2" rx="6.2" ry="7.6" fill={`url(#${p}c)`}/>
      <path d="M6.2,12 Q5.6,17.6 9.6,20.4" stroke="#6f5c3e" strokeWidth=".7" fill="none" opacity=".7" />
      <path d="M17.8,12 Q18.4,17.6 14.4,20.4" stroke="#4a3a24" strokeWidth=".7" fill="none" opacity=".8" />
      <path d="M10.2,15.6 l.9,.8 .9,-.8 M12.6,15.6 l.9,.8 .9,-.8 M9,17.6 l.9,.8 .9,-.8 M11.4,17.6 l.9,.8 .9,-.8 M13.8,17.6 l.9,.8 .9,-.8" stroke="#5f4c32" strokeWidth=".4" fill="none" />
      <circle cx="9.4" cy="10.4" r="2.9" fill="#f3e8cc" />
      <circle cx="14.6" cy="10.4" r="2.9" fill="#d6c6a0" />
      <circle cx="9.5" cy="10.5" r="1.65" fill="#e8c04a" /><circle cx="14.5" cy="10.5" r="1.65" fill="#d4a93a" />
      <circle cx="9.6" cy="10.6" r=".95" fill="#241a08" /><circle cx="14.4" cy="10.6" r=".95" fill="#241a08" />
      <circle cx="9.2" cy="10.2" r=".35" fill="#ffffff" /><circle cx="14" cy="10.2" r=".3" fill="#ffffff" />
      <path d="M12,11.9 L12.9,13 L12,14.7 L11.1,13 Z" fill="#b3902e" /><path d="M12,11.9 L11.1,13 L12,14.7 Z" fill="#e0bc58" />
      <path d="M9.8,20.4 v1 M11,20.6 v.9 M13,20.6 v.9 M14.2,20.4 v1" stroke="#b3902e" strokeWidth=".55" strokeLinecap="round" />
  </g>
)

const Ares: Dessin = ({ p }) => (
  <g>
      <defs>
      <linearGradient id={`${p}c`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8a5a20" /><stop offset=".3" stopColor="#f3d488" /><stop offset=".55" stopColor="#c98f3a" /><stop offset="1" stopColor="#5a3a10" /></linearGradient>
      <linearGradient id={`${p}r`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e2735a" /><stop offset=".5" stopColor="#b0412e" /><stop offset="1" stopColor="#6e2016" /></linearGradient>
      </defs>
      <ellipse cx="13" cy="22.2" rx="8" ry="1.1" fill="#241a08" opacity=".22" />
      <path d="M11.2,5.6 H12.8 V7.4 H11.2 Z" fill="#8a5a20" />
      <path d="M3.6,8.2 Q4.2,0.4 12,0.6 Q19.8,0.4 20.4,8.2 Q18.6,4.2 12,4 Q5.4,4.2 3.6,8.2 Z" fill={`url(#${p}r)`}/>
      <path d="M5,6 Q6.6,2 12,1.6 M7.4,4.4 Q9,2.6 12,2.4 M12,1.6 Q16.8,2 18.4,5.2" stroke="#f09a80" strokeWidth=".35" fill="none" opacity=".8" />
      <path d="M5.4,13 Q5,5.4 12,5 Q19,5.4 18.6,13 L18.4,19 Q16.8,20.8 14.6,20.4 L13.8,15 L10.2,15 L9.4,20.4 Q7.2,20.8 5.6,19 Z" fill={`url(#${p}c)`}/>
      <path d="M6.8,11.2 Q9,9.8 11.3,11 L11.1,13.6 Q8.6,13.6 6.8,11.2 Z" fill="#2a1d10" />
      <path d="M17.2,11.2 Q15,9.8 12.7,11 L12.9,13.6 Q15.4,13.6 17.2,11.2 Z" fill="#2a1d10" />
      <path d="M11.1,13.6 L10.2,15 L10.6,21 L13.4,21 L13.8,15 L12.9,13.6 Z" fill="#2a1d10" />
      <path d="M11.3,11 L11.1,13.6 L12.9,13.6 L12.7,11 Z" fill="#c98f3a" />
      <path d="M6,9.6 Q8.6,7.4 12,7.4 Q15.4,7.4 18,9.6" stroke="#6e4614" strokeWidth=".55" fill="none" />
      <path d="M6.2,9 Q8.6,6.8 12,6.8" stroke="#fff3cf" strokeWidth=".55" fill="none" strokeLinecap="round" />
      <path d="M6.4,12.4 Q6.2,16.4 7,19" stroke="#fbe2a0" strokeWidth=".5" fill="none" strokeLinecap="round" opacity=".8" />
  </g>
)

const DESSINS: Record<IconeId, Dessin> = {
  bois: Bois,
  pierre: Pierre,
  grain: Grain,
  bronze: Bronze,
  faveur: Faveur,
  prestige: Prestige,
  lancier: Lancier,
  archer: Archer,
  hoplite: Hoplite,
  frondeur: Frondeur,
  peltaste: Peltaste,
  belier: Belier,
  char: Char,
  zeus: Zeus,
  poseidon: Poseidon,
  athena: Athena,
  ares: Ares,
}

const NOMS: Record<IconeId, string> = {
  bois: 'Bois',
  pierre: 'Pierre',
  grain: 'Grain',
  bronze: 'Bronze',
  faveur: 'Faveur divine',
  prestige: 'Prestige',
  lancier: 'Lancier',
  archer: 'Archer',
  hoplite: 'Hoplite',
  frondeur: 'Frondeur',
  peltaste: 'Peltaste',
  belier: 'Bélier',
  char: 'Char',
  zeus: 'Zeus',
  poseidon: 'Poséidon',
  athena: 'Athéna',
  ares: 'Arès',
}

/** pictogramme peint - remplace l'émoji partout où il y a la place */
export function Icone({ id, taille = 18, titre }: { id: IconeId; taille?: number; titre?: string }) {
  const p = 'ic' + useId().replace(/:/g, '') + '-'
  const Dessin = DESSINS[id]
  const nom = titre ?? NOMS[id]
  return (
    <svg className="icone-res" width={taille} height={taille} viewBox="0 0 24 24" role="img" aria-label={nom}>
      <title>{nom}</title>
      <Dessin p={p} />
    </svg>
  )
}

/**
 * « 120 [bronze] » - un montant suivi de son pictogramme. `signe` force le
 * « + » devant les gains, comme dans les récompenses de mission.
 */
export function Montant({ n, id, taille = 15, signe }: { n: number; id: IconeId; taille?: number; signe?: boolean }) {
  return (
    <span className="montant">
      {signe && n > 0 ? '+' : ''}
      {n}
      <Icone id={id} taille={taille} />
    </span>
  )
}

/** nom lisible d'une ressource, pour les infobulles */
export function nomRessource(id: ResourceId): string {
  return RES[id].nom
}
