import { BatimentArt, DefsBatiments } from './components/map/Batiments'
import { DefsArt } from './components/map/art'
import { Murailles } from './components/map/Murailles'
import { Terrain } from './components/map/Terrain'
import { Belier, Char, Bonhomme, lookUnite } from './components/map/BatailleLayer'
import { Ouvriers } from './components/map/Ouvriers'
import { AttributPose, SilhouetteHeros } from './components/map/SilhouettesHeros'
import { HEROS, HERO_IDS } from './game/heros'
import { ApercuDivin } from './components/map/EffetsDivins'
import { GODS, GOD_IDS } from './game/data'
import { RolesGarnison } from './components/ui/Garde'
import type { BuildingId, UnitId } from './game/types'

/*
 * Atelier d'aperçu - hors jeu, pour travailler l'art en le REGARDANT.
 * URL : /?apercu=<cible>[&z=<zoom>]
 *   cible ∈ agora|temple|maisons|ferme|scierie|carriere|forge|caserne|port
 *         | murailles | terrain | figurines | heros | roles
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
    /*
     * Les six unités du joueur × les quatre animations, en grand pour juger le
     * dessin - puis les mêmes en colonne de droite à la TAILLE DU JEU (14 px) et
     * au double : c'est là qu'on tranche. Si deux silhouettes se confondent dans
     * la colonne « ×1 », le travail n'est pas fait, quel que soit le détail.
     */
    const unites: UnitId[] = ['lancier', 'archer', 'hoplite', 'frondeur', 'peltaste', 'belier', 'char']
    const anims = ['idle', 'marche', 'combat', 'tir'] as const
    const fig = (u: UnitId, a: (typeof anims)[number]) => {
      const look = lookUnite(u)
      return look === 'belier' ? (
        <Belier enMarche={a === 'marche'} />
      ) : look === 'char' ? (
        <Char enMarche={a === 'marche'} />
      ) : (
        <Bonhomme {...look} anim={a} seed={0.37} dur={a === 'tir' ? 2.6 : 2.1} />
      )
    }
    return (
      <svg viewBox="0 0 1600 880" style={{ width: '100vw', height: '100vh', background: SOL }}>
        <defs>
          <DefsArt />
          <DefsBatiments />
        </defs>
        {unites.map((u, i) => (
          <g key={u}>
            <text x={26} y={106 + i * 132} fontSize={16} fill="#3d3a30" fontWeight={700}>
              {u}
            </text>
            {anims.map((a, j) => (
              <g key={a} transform={`translate(${210 + j * 150},${110 + i * 132}) scale(4.4)`}>
                {fig(u, a)}
              </g>
            ))}
            {/* la même, à la taille où le joueur la verra vraiment */}
            {[1, 2, 3].map((s, k) => (
              <g key={s} transform={`translate(${860 + k * 62},${110 + i * 132}) scale(${s})`}>
                {fig(u, 'idle')}
              </g>
            ))}
            {[1, 2, 3].map((s, k) => (
              <g key={`m${s}`} transform={`translate(${1070 + k * 62},${110 + i * 132}) scale(${s})`}>
                {fig(u, 'marche')}
              </g>
            ))}
          </g>
        ))}
        {anims.map((a, j) => (
          <text key={a} x={210 + j * 150} y={36} textAnchor="middle" fontSize={15} fill="#3d3a30" fontWeight={700}>
            {a}
          </text>
        ))}
        <text x={920} y={36} textAnchor="middle" fontSize={15} fill="#3d3a30" fontWeight={700}>
          ×1 ×2 ×3 (repos)
        </text>
        <text x={1130} y={36} textAnchor="middle" fontSize={15} fill="#3d3a30" fontWeight={700}>
          ×1 ×2 ×3 (marche)
        </text>
        {/* villageois au travail, pour mémoire */}
        <g transform="translate(1420,200) scale(3.2)">
          <Ouvriers id="scierie" level={3} />
        </g>
        <g transform="translate(1420,600) scale(3.2)">
          <Ouvriers id="ferme" level={3} />
        </g>
      </svg>
    )
  }

  if (cible === 'roles') {
    // le panneau des rôles, hors jeu : on juge le texte et les vignettes
    return (
      <div style={{ background: '#101b27', minHeight: '100vh', padding: 22 }}>
        <RolesGarnison army={{ lancier: 12, archer: 6, hoplite: 3, frondeur: 9, peltaste: 4, belier: 1, char: 2 }} />
      </div>
    )
  }

  // ── agora niveaux 1-2 en gros plan (travail de détail) ──
  if (cible === 'agora12') {
    const zz = Number(q.get('z') ?? 5.4)
    return (
      <svg viewBox="0 0 1600 900" style={{ width: '100vw', height: '100vh', background: SOL }}>
        <defs>
          <DefsArt />
          <DefsBatiments />
        </defs>
        {[1, 2].map((n, i) => (
          <g key={n} transform={`translate(${400 + i * 800},560)`}>
            <ellipse cx={0} cy={20} rx={370} ry={130} fill="#b5ac74" opacity={0.6} />
            <g transform={`scale(${zz})`}>
              <BatimentArt id="agora" level={n} />
              <Ouvriers id="agora" level={n} />
            </g>
            <text x={0} y={200} textAnchor="middle" fontSize={20} fill="#3d3a30" fontWeight={700}>
              niveau {n}
            </text>
          </g>
        ))}
      </svg>
    )
  }

  if (cible === 'heros') {
    // les huit héros : en grand (on juge le dessin) puis à la taille de la
    // mêlée (on juge la SILHOUETTE - c'est là que l'attribut doit survivre)
    return (
      <svg viewBox="0 0 1600 900" style={{ width: '100vw', height: '100vh', background: SOL }}>
        <defs>
          <DefsArt />
          <DefsBatiments />
        </defs>
        {HERO_IDS.map((h, i) => (
          <g key={h}>
            <g transform={`translate(${105 + i * 188},400) scale(9)`}>
              <SilhouetteHeros h={h} detail anim={(q.get('anim') as 'idle') ?? 'idle'} seed={i * 0.19} />
            </g>
            <text x={105 + i * 188} y={440} textAnchor="middle" fontSize={17} fill="#3d3a30" fontWeight={700}>
              {HEROS[h].nom}
            </text>
            {/* taille réelle en bataille (≈14 px), puis la même en marche */}
            <g transform={`translate(${105 + i * 188},520) scale(1.55)`}>
              <SilhouetteHeros h={h} seed={i * 0.19} />
            </g>
            <g transform={`translate(${105 + i * 188},580) scale(1.55)`}>
              <SilhouetteHeros h={h} anim="marche" seed={i * 0.19} />
            </g>
            <g transform={`translate(${105 + i * 188},640) scale(1.55)`}>
              <SilhouetteHeros h={h} anim="combat" seed={i * 0.19} />
            </g>
            {/* trois fois plus gros : le compromis de lecture réel à l'écran */}
            <g transform={`translate(${105 + i * 188},790) scale(4.2)`}>
              <SilhouetteHeros h={h} seed={i * 0.19} />
            </g>
            {/* et blessé sur la carte, l'attribut posé près de lui */}
            <g transform={`translate(${105 + i * 188},860) scale(2.2)`}>
              <AttributPose h={h} />
            </g>
          </g>
        ))}
        {['grand (×9)', 'bataille ×1,55 : repos / marche / combat', 'lecture ×4,2', 'attribut posé'].map((l, k) => (
          <text key={l} x={16} y={[36, 505, 700, 830][k]} fontSize={15} fill="#3d3a30" fontWeight={700}>
            {l}
          </text>
        ))}
      </svg>
    )
  }

  /*
   * ── dieux : les 4 Olympiens × 4 paliers de ferveur, en vignette de panthéon ──
   * `&t=<secondes>` fige toutes les animations SMIL à cet instant du cycle
   * (2.6 s) : sans quoi la capture tombe à une phase quelconque.
   */
  if (cible === 'dieux') {
    const instant = Number(q.get('t') ?? 0.7)
    const paliers: { p: number; nom: string }[] = [
      { p: 1, nom: 'offensé' },
      { p: 4, nom: 'en grâce' },
      { p: 5, nom: 'chéri' },
      { p: 6, nom: 'élu' },
    ]
    const figer = (el: HTMLDivElement | null) => {
      if (!el) return
      setTimeout(() => {
        el.querySelectorAll('svg').forEach((s) => {
          s.setCurrentTime(instant)
          s.pauseAnimations()
        })
      }, 120)
    }
    return (
      <div
        ref={figer}
        style={{
          background: '#0d1722',
          minHeight: '100vh',
          padding: 8,
          font: '13px system-ui',
          color: '#cfc4a8',
        }}
      >
        <div style={{ display: 'flex', gap: 4, marginLeft: 78 }}>
          {GOD_IDS.map((g) => (
            <div key={g} style={{ width: 272, color: GODS[g].couleur, fontWeight: 700 }}>
              {GODS[g].emoji} {GODS[g].nom} - t={instant}s
            </div>
          ))}
        </div>
        {paliers.map((pal) => (
          <div key={pal.nom} style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 3 }}>
            <div style={{ width: 74, fontWeight: 700 }}>{pal.nom}</div>
            {GOD_IDS.map((g) => (
              <ApercuDivin key={g} dieu={g} palier={pal.p} largeur={272} hauteur={204} />
            ))}
          </div>
        ))}
      </div>
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
