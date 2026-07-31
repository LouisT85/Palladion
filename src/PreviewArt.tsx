import { BatimentArt, DefsBatiments } from './components/map/Batiments'
import { DefsArt } from './components/map/art'
import { Murailles } from './components/map/Murailles'
import { Terrain } from './components/map/Terrain'
import { Bonhomme } from './components/map/BatailleLayer'
import { Ouvriers } from './components/map/Ouvriers'
import type { BuildingId } from './game/types'

/*
 * Atelier d'aperçu — hors jeu, pour travailler l'art en le REGARDANT.
 * URL : /?apercu=<cible>[&z=<zoom>]
 *   cible ∈ agora|temple|maisons|ferme|scierie|carriere|forge|caserne|port
 *         | murailles | terrain | figurines
 * Bâtiments : les 4 niveaux côte à côte sur fond de plaine neutre.
 */

const SOL = '#aaa26c'

function CadreNiveau({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <g transform={`translate(${205 + i * 390},300)`}>
      <ellipse cx={0} cy={8} rx={175} ry={62} fill="#b5ac74" opacity={0.6} />
      {children}
      <text x={0} y={95} textAnchor="middle" fontSize={17} fill="#3d3a30" fontWeight={700}>
        niveau {i + 1}
      </text>
    </g>
  )
}

export function PreviewArt() {
  const q = new URLSearchParams(location.search)
  const cible = q.get('apercu') ?? 'temple'
  const z = Number(q.get('z') ?? 2.3)

  if (cible === 'terrain') {
    return (
      <svg viewBox="0 0 1200 800" style={{ width: '100vw', height: '100vh', background: '#0d1722' }}>
        <defs>
          <DefsArt />
          <DefsBatiments />
        </defs>
        <Terrain phase={Number(q.get('phase') ?? 0.3)} paisible />
      </svg>
    )
  }

  if (cible === 'murailles') {
    return (
      <svg viewBox="0 0 1600 900" style={{ width: '100vw', height: '100vh', background: SOL }}>
        <defs>
          <DefsArt />
          <DefsBatiments />
        </defs>
        {[1, 2, 3, 4].map((n) => {
          const geo = { cx: 400 + (n - 1 >= 2 ? 800 : 0) * ((n - 1) % 2 ? 1 : 0) + ((n - 1) % 2) * 800, cy: n <= 2 ? 240 : 660, rx: 300, ry: 140 }
          const g2 = { cx: (n - 1) % 2 === 0 ? 400 : 1200, cy: n <= 2 ? 240 : 680, rx: 310, ry: 150 }
          void geo
          return (
            <g key={n}>
              <Murailles niveau={n} hp={1} max={1} breche={false} layer="back" geo={g2} tours={n >= 2 ? Math.min(4, n) : 0} />
              <Murailles niveau={n} hp={1} max={1} breche={false} layer="front" geo={g2} tours={n >= 2 ? Math.min(4, n) : 0} />
              <text x={g2.cx} y={g2.cy + 4} textAnchor="middle" fontSize={20} fill="#3d3a30" fontWeight={700}>
                niveau {n}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  if (cible === 'figurines') {
    const looks = [
      { tunique: '#7d5a44', arme: 'dague' as const, taille: 0.95, nom: 'pillard' },
      { tunique: '#7d3b32', arme: 'lance' as const, taille: 1.05, nom: 'guerrier' },
      { tunique: '#5a3140', arme: 'bouclier-lourd' as const, taille: 1.2, crete: true, nom: 'mercenaire' },
      { tunique: '#3e5a7a', arme: 'lance' as const, taille: 1, nom: 'lancier' },
      { tunique: '#4a6a5a', arme: 'arc' as const, taille: 0.95, nom: 'archer' },
      { tunique: '#31506e', arme: 'bouclier-lourd' as const, taille: 1.15, crete: true, nom: 'hoplite' },
    ]
    const anims = ['idle', 'marche', 'combat', 'tir'] as const
    return (
      <svg viewBox="0 0 1300 760" style={{ width: '100vw', height: '100vh', background: SOL }}>
        <defs>
          <DefsArt />
          <DefsBatiments />
        </defs>
        {looks.map((l, i) => (
          <g key={l.nom}>
            <text x={70} y={90 + i * 115} fontSize={15} fill="#3d3a30" fontWeight={700}>
              {l.nom}
            </text>
            {anims.map((a, j) => (
              <g key={a} transform={`translate(${230 + j * 150},${100 + i * 115}) scale(4.4)`}>
                <Bonhomme tunique={l.tunique} arme={l.arme} taille={l.taille} crete={l.crete} anim={a} seed={0.37} />
              </g>
            ))}
          </g>
        ))}
        {anims.map((a, j) => (
          <text key={a} x={230 + j * 150} y={36} textAnchor="middle" fontSize={15} fill="#3d3a30" fontWeight={700}>
            {a}
          </text>
        ))}
        {/* villageois au travail, pour mémoire */}
        <g transform="translate(1050,140) scale(3.4)">
          <Ouvriers id="scierie" level={3} />
        </g>
        <g transform="translate(1050,420) scale(3.4)">
          <Ouvriers id="ferme" level={3} />
        </g>
      </svg>
    )
  }

  // ── bâtiment : 4 niveaux côte à côte ──
  const id = cible as BuildingId
  return (
    <svg viewBox="0 0 1600 460" style={{ width: '100vw', height: '100vh', background: SOL }}>
      <defs>
        <DefsArt />
        <DefsBatiments />
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <CadreNiveau key={i} i={i}>
          <g transform={`scale(${z})`}>
            <BatimentArt id={id} level={i + 1} />
          </g>
        </CadreNiveau>
      ))}
    </svg>
  )
}
