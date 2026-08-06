import { useMemo, useRef, useState } from 'react'
import { BUILDINGS, BUILDING_IDS, DAY_MS, MAP, REDOUTE_POS, TOUR_ANGLES, TOUR_PORTEE, pointMur } from '../../game/data'
import { HERO_IDS } from '../../game/heros'
import { ACTES_CAMPAGNE } from '../../game/campagne'
import { murMax, postesPourvus, postesTotal, useGame } from '../../game/store'
import type { BuildingId } from '../../game/types'
import { Astuce } from '../ui/Infobulle'
import { DefsArt } from './art'
import { DecorActe } from './CadreActe'
import { BatimentArt, Chantier, DefsBatiments } from './Batiments'
import { Batisseur, Ouvriers, Porteurs } from './Ouvriers'
import { BatailleLayer } from './BatailleLayer'
import {
  useCamera,
  vientDeGlisser,
  ZOOM_MAX,
  ZOOM_MIN,
  type CadreVisible,
  type PalierDetail,
  type VueScene,
} from './camera'
import { Meteo, VoileSaison } from './Ciel'
import { HerosVillage } from './HerosVillage'
import { Garnison } from './Garnison'
import { Murailles } from './Murailles'
import { Redoute } from './batiments/Redoute'
import { SanteBatiments } from './SanteBatiments'
import { Terrain, Vignette, VoileJourNuit, phaseJour } from './Terrain'
import { Villageois } from './Villageois'

/** stade d'un chantier : 0 = fondations, puis paliers à 25 / 50 / 75 % de la durée */
function stadeChantier(progress: number): number {
  return progress < 0.25 ? 0 : progress < 0.5 ? 1 : progress < 0.75 ? 2 : 3
}
/** hauteur bâtie à chaque stade (fraction de la hauteur finale) */
const STADES_H = [0, 0.4, 0.7, 1]

/** étiquette semi-transparente affichée au survol d'un bâtiment */
function Etiquette({ texte, y }: { texte: string; y: number }) {
  const w = texte.length * 6.6 + 22
  return (
    <g className="etq" transform={`translate(0,${y})`} pointerEvents="none">
      <rect x={-w / 2} y={-14} width={w} height={21} rx={9.5} fill="#0d1722" opacity={0.82} stroke="#e0bc5c" strokeOpacity={0.4} />
      <text x={0} y={1} textAnchor="middle" fontSize={11.5} fill="#f0e8d8" fontWeight={600}>
        {texte}
      </text>
    </g>
  )
}

/**
 * Le métier qu'un atelier réclame, en un mot. « Tailleur de pierre » ne tient pas
 * sur un écriteau planté au milieu d'une prairie : on garde le mot qui suffit à
 * savoir QUI aller chercher au recensement.
 */
const METIER_COURT: Partial<Record<BuildingId, string>> = {
  ferme: 'paysan',
  scierie: 'bûcheron',
  carriere: 'tailleur',
  forge: 'forgeron',
  temple: 'prêtre',
  port: 'docker',
}

/**
 * Écriteau « atelier sans bras ». Personne ne prend son poste tout seul : il faut
 * donc que le manque se voie SUR LA CARTE, sans ouvrir de panneau.
 *
 * Il disait « VIDE » et « −1 ». Deux énigmes : « vide » se lisait « désaffecté »
 * plutôt que « sans ouvrier », et « −1 » ne disait ni de quoi il manquait un, ni
 * qu'il fallait y faire quelque chose. L'écriteau nomme maintenant le MÉTIER
 * attendu - c'est-à-dire l'action à faire - et compte les postes en français.
 */
function ManqueOuvriers({ id, manque, vide }: { id: BuildingId; manque: number; vide: boolean }) {
  const c = vide ? '#e0715a' : '#e8a45e'
  const metier = METIER_COURT[id] ?? 'ouvrier'
  const texte = vide ? `sans ${metier}` : `${manque} poste${manque > 1 ? 's' : ''} libre${manque > 1 ? 's' : ''}`
  // la planche s'ajuste au mot : une pancarte trop courte tronquerait « bûcheron »
  const w = Math.max(58, 20 + texte.length * 5.1)
  return (
    <g transform="translate(30,-34)" pointerEvents="none">
      <g opacity={0.96}>
        <animateTransform attributeName="transform" type="translate" values="0,0;0,-2.4;0,0" dur="2.4s" repeatCount="indefinite" />
        {/* piquet planté en terre, et sa planche */}
        <path d="M0,22 L0,9" stroke="#6b4c2a" strokeWidth={2.4} />
        <path d="M-3,22 L3,22" stroke="#4f3820" strokeWidth={1.6} />
        <rect x={-w / 2} y={-9} width={w} height={18} rx={4.5} fill="#171009" opacity={0.8} />
        <rect x={-w / 2} y={-9} width={w} height={18} rx={4.5} fill="none" stroke={c} strokeWidth={1.5} />
        {/* le pictogramme reste : c'est lui qu'on repère du coin de l'œil */}
        <text x={-w / 2 + 10} y={3.6} textAnchor="middle" fontSize={11}>
          👷
        </text>
        <text x={-w / 2 + 19} y={3.4} fontSize={9.4} fill={c} fontWeight={700}>
          {texte}
        </text>
        {/* un point d'exclamation quand l'atelier ne rend RIEN : la nuance compte */}
        {vide && (
          <circle cx={w / 2 - 6} cy={-0.4} r={2.2} fill={c}>
            <animate attributeName="opacity" values="1;0.25;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
        )}
      </g>
    </g>
  )
}

/**
 * Un bâtiment est-il dans le cadre visible ? `null` = toute la carte tient à
 * l'écran, donc rien à retirer. On teste la boîte d'art entière (270 × 145 unités
 * autour du pied) et non le seul point d'ancrage : sans quoi une ferme dont seuls
 * les champs entrent dans le cadre disparaîtrait d'un coup.
 */
function dansLeCadre(id: BuildingId, cadre: CadreVisible | null): boolean {
  if (!cadre) return true
  const p = BUILDINGS[id].pos
  return p.x + 135 >= cadre.x0 && p.x - 135 <= cadre.x1 && p.y + 40 >= cadre.y0 && p.y - 105 <= cadre.y1
}

function Emplacement({
  id,
  now,
  paisible,
  cadre,
  palier = 'ensemble',
}: {
  id: BuildingId
  now: number
  paisible?: boolean
  cadre?: CadreVisible | null
  palier?: PalierDetail
}) {
  const def = BUILDINGS[id]
  const b = useGame((s) => s.buildings[id])
  const selected = useGame((s) => s.selected)
  const select = useGame((s) => s.select)
  // postes ouverts mais non tenus : le joueur doit le voir sans rien ouvrir
  // le nombre d'artisans DESSINÉS suit l'affectation, pas le niveau du bâtiment
  const pourvus = useGame((s) => postesPourvus(s, id))
  const manque = useGame((s) => Math.max(0, postesTotal(s, id) - postesPourvus(s, id)))
  const vide = useGame((s) => postesTotal(s, id) > 0 && postesPourvus(s, id) === 0)
  const [hover, setHover] = useState(false)
  if (id === 'remparts') return null
  /*
   * CULLING. Passé le zoom de travail, la moitié de la carte est hors champ : un
   * édifice qu'on ne voit pas n'a aucune raison d'occuper cinq cents nœuds du DOM
   * ni de se faire rediffuser par React à chaque battement du jeu.
   */
  if (!dansLeCadre(id, cadre ?? null)) return null

  const enChantier = b.targetLevel !== undefined && b.busyUntil !== undefined
  let progress = 0
  if (enChantier && b.targetLevel !== undefined && b.busyUntil !== undefined) {
    const dur = def.times[b.targetLevel - 1] * 1000
    progress = Math.max(0, Math.min(1, 1 - (b.busyUntil - now) / dur))
  }
  /*
   * PALIER DE DÉTAIL - l'ombre portée des édifices.
   *
   * C'est un filtre SVG, et un filtre qui enveloppe du contenu ANIMÉ (les feux,
   * les fumées, les artisans au travail) se fait rastériser à neuf soixante fois
   * par seconde. À la vue d'ensemble le coût mesuré est nul et l'ombre se voit :
   * on la garde. Dès qu'on se rapproche, cette même ombre coûtait à elle seule
   * 43 % du fil principal - pour un halo d'un pixel et demi que les ombres
   * PEINTES de l'art (OmbreVolume, AOBase) rendent déjà. On la retire donc, et le
   * basculement se joue pendant le mouvement du zoom, là où l'œil ne le voit pas.
   */
  const ombre = palier === 'ensemble' ? 'url(#ombre-batiment)' : undefined

  const stade = stadeChantier(progress)
  const fracH = STADES_H[stade]

  const label = enChantier
    ? `${def.emoji} ${def.nom} - niv. ${b.targetLevel} en chantier (${Math.round(progress * 100)} %)`
    : b.level === 0
      ? `${def.emoji} ${def.nom} - à construire`
      : `${def.emoji} ${def.nom} - niveau ${b.level}/4`

  return (
    <g
      // cible du tutoriel : Zeus met en lumière l'emplacement qu'il fait bâtir
      data-tuto={`carte-${id}`}
      transform={`translate(${def.pos.x},${def.pos.y})`}
      onClick={(e) => {
        e.stopPropagation()
        // on vient de faire glisser la carte : ce n'est pas un clic sur le bâtiment
        if (vientDeGlisser()) return
        select(id)
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: 'pointer' }}
    >
      {selected === id && (
        <ellipse cx={0} cy={4} rx={46} ry={16} fill="none" stroke="#e8c04a" strokeWidth={2} strokeDasharray="6 5" opacity={0.9} />
      )}
      {b.level === 0 && !enChantier ? (
        <g opacity={0.7}>
          <ellipse cx={0} cy={2} rx={34} ry={12} fill="#00000018" stroke="#5f584a" strokeWidth={1.4} strokeDasharray="5 5" />
          <text x={0} y={2} textAnchor="middle" fontSize={19}>
            {def.emoji}
          </text>
          <text x={0} y={17} textAnchor="middle" fontSize={9.5} fill="#3d3a30" fontWeight={700} letterSpacing={0.5}>
            ＋ CONSTRUIRE
          </text>
        </g>
      ) : (
        <g>
          {b.level > 0 && (
            <g transform="scale(1.18)" filter={ombre}>
              <BatimentArt id={id} level={b.level} />
              {paisible && !enChantier && <Ouvriers id={id} level={b.level} ouvriers={pourvus} />}
            </g>
          )}
          {enChantier && (
            <g>
              {b.level === 0 && <ellipse cx={0} cy={2} rx={26} ry={9} fill="#c2a76f" opacity={0.8} />}
              {/* le bâtiment cible s'élève du sol par paliers (25 / 50 / 75 %) */}
              {fracH > 0 && b.targetLevel !== undefined && (
                <g transform="scale(1.18)" filter={ombre}>
                  <clipPath id={`chantier-${id}`}>
                    <rect x={-135} y={30 - 108 * fracH} width={270} height={108 * fracH + 4} />
                  </clipPath>
                  <g clipPath={`url(#chantier-${id})`}>
                    <BatimentArt id={id} level={b.targetLevel} />
                  </g>
                </g>
              )}
              <Chantier />
              {/* les ouvriers à l'œuvre - un second renfort dès que les murs sortent de terre */}
              <Batisseur x={-22} y={9} />
              {stade >= 1 && <Batisseur x={20} y={5} flip begin="0.7s" />}
              <g transform="translate(0,-42)">
                <rect x={-22} y={0} width={44} height={6} rx={3} fill="#1d1d1d" opacity={0.7} />
                <rect x={-21} y={1} width={Math.max(2, 42 * progress)} height={4} rx={2} fill="#e8c04a" />
              </g>
            </g>
          )}
        </g>
      )}
      {/* un atelier sans ouvrier ne rend rien : la pancarte le dit sur la carte */}
      {b.level > 0 && !enChantier && manque > 0 && <ManqueOuvriers id={id} manque={manque} vide={vide} />}
      {hover && <Etiquette texte={label} y={enChantier ? -60 : -52} />}
      {/* zone cliquable généreuse */}
      <ellipse cx={0} cy={-4} rx={44} ry={26} fill="transparent" />
    </g>
  )
}

/** cadrage de la carte du village : on serre jusqu'à ×2.1 sur la mêlée */
const VUE_VILLAGE: VueScene = { w: MAP.w, h: MAP.h, zMin: 1.7, zMax: 2.1 }
/** lu à chaque image par la caméra - hors du rendu React, donc jamais périmé */
const lireBatailleVillage = () => useGame.getState().battle

export function VillageMap() {
  const battle = useGame((s) => s.battle)
  const warned = useGame((s) => s.warned)
  const wallLevel = useGame((s) => s.buildings.remparts.level)
  const remparts = useGame((s) => s.buildings.remparts)
  const tours = useGame((s) => s.tours)
  const redoute = useGame((s) => s.redoute ?? 0)
  const brechesMur = useGame((s) => s.brechesMur)
  const army = useGame((s) => s.army)
  const wallHp = useGame((s) => s.wallHp)
  const pop = useGame((s) => s.pop)
  const morale = useGame((s) => s.morale)
  const createdAt = useGame((s) => s.createdAt)
  const lastSeen = useGame((s) => s.lastSeen)
  const saison = useGame((s) => s.saison)
  const meteo = useGame((s) => s.meteo)
  // le cadre de l'acte en cours - null en bac à sable
  const cadreActe = useGame((s) =>
    s.campagne && !s.campagne.fini ? (ACTES_CAMPAGNE[s.campagne.acte]?.cadre ?? null) : null,
  )
  // structure maximale de l'enceinte - Hector l'épaissit tant qu'il est là
  const wallMax = useGame(murMax)
  // liste stable : on ne recrée pas de tableau dans le sélecteur (React 18)
  const heros = useGame((s) => s.heros)
  const herosPresents = useMemo(
    () =>
      HERO_IDS.filter((h) => heros[h]?.recrute && !heros[h].mort).map((h) => ({
        id: h,
        blesse: heros[h].boudeJusqua > Date.now(),
      })),
    [heros],
  )
  const select = useGame((s) => s.select)
  const selected = useGame((s) => s.selected)
  const [hoverMur, setHoverMur] = useState(false)
  const svg = useRef<SVGSVGElement | null>(null)
  const scene = useRef<SVGGElement | null>(null)
  // molette = zoom au curseur, glisser = déplacement, double-clic = recentrage
  const camera = useCamera(svg, scene, VUE_VILLAGE, lireBatailleVillage)

  const scierieLvl = useGame((s) => s.buildings.scierie.level)
  const fermeLvl = useGame((s) => s.buildings.ferme.level)
  const carriereLvl = useGame((s) => s.buildings.carriere.level)

  const now = lastSeen // rafraîchi par le tick
  const phase = phaseJour(now, createdAt, DAY_MS)
  const paisible = battle === null && !warned

  // chantier des remparts : l'enceinte cible se dresse arc par arc (25 / 50 / 75 %)
  const rempartsChantier = remparts.targetLevel !== undefined && remparts.busyUntil !== undefined
  let progMur = 0
  if (rempartsChantier && remparts.targetLevel !== undefined && remparts.busyUntil !== undefined) {
    const dur = BUILDINGS.remparts.times[remparts.targetLevel - 1] * 1000
    progMur = Math.max(0, Math.min(1, 1 - (remparts.busyUntil - now) / dur))
  }
  const spanMur = [0, 1 / 3, 2 / 3, 1][stadeChantier(progMur)]

  // chaque pan cède pour son compte : la porte ne s'arrache pas si c'est le nord
  // qui tombe. Hors bataille, les pans effondrés restent à terre jusqu'à réparation :
  // le village doit porter ses cicatrices, pas seulement pendant l'assaut.
  const secteurs = battle?.secteurs ?? []
  const brechesAngles = battle ? secteurs.filter((s) => s.breche).map((s) => s.angle) : brechesMur
  // la porte est à l'est (angle 0) : seul l'effondrement d'un pan de ce côté l'emporte
  const portePercee = brechesAngles.some((a) => Math.cos(a) > 0 && Math.abs(Math.sin(a)) < 0.35)

  const labelMur = rempartsChantier
    ? `🧱 Remparts - niv. ${remparts.targetLevel} en chantier (${Math.round(progMur * 100)} %)`
    : wallLevel === 0
      ? '🧱 Remparts - à construire'
      : `🧱 Remparts - niveau ${wallLevel}/4${tours > 0 ? ` · ${tours} tour${tours > 1 ? 's' : ''} 🏹` : ''}`

  // ordre du peintre : nord (hors les murs) → mur arrière → intérieur → mur avant → sud
  const dedans = BUILDING_IDS.filter((b) => b !== 'remparts' && BUILDINGS[b].interieur).sort(
    (a, b) => BUILDINGS[a].pos.y - BUILDINGS[b].pos.y,
  )

  return (
    <>
    <svg
      ref={svg}
      viewBox={`0 0 ${MAP.w} ${MAP.h}`}
      className="carte"
      // un glissement de caméra ne doit pas être pris pour un clic dans le vide
      onClick={() => {
        if (!camera.aGlisse()) select(null)
      }}
      role="img"
      aria-label="Carte du village"
    >
      <defs>
        <clipPath id="cadre-carte">
          <rect x={0} y={0} width={MAP.w} height={MAP.h} rx={16} />
        </clipPath>
        <filter id="ombre-batiment" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx={0} dy={1.6} stdDeviation={1.4} floodColor="#1d1508" floodOpacity={0.3} />
        </filter>
        {/* halo de portée : rien au centre, une lueur qui ne mord que sur le bord */}
        <radialGradient id="portee-halo">
          <stop offset="0%" stopColor="#e8c04a" stopOpacity={0} />
          <stop offset="78%" stopColor="#e8c04a" stopOpacity={0} />
          <stop offset="94%" stopColor="#e8c04a" stopOpacity={0.09} />
          <stop offset="100%" stopColor="#e8c04a" stopOpacity={0} />
        </radialGradient>
        <DefsArt />
        <DefsBatiments />
      </defs>

      <g clipPath="url(#cadre-carte)">
        {/* toute la scène vit dans ce groupe : la caméra s'en approche pendant l'assaut */}
        <g ref={scene}>
          <Terrain phase={phase} paisible={paisible} saison={saison} />
          {/* la campagne plante son repère dans le paysage : la flotte échouée,
              le camp achéen, Ilion sur son tertre, le Scamandre en crue, le cheval */}
          <DecorActe cadre={cadreActe} />

          <Porteurs scierie={scierieLvl > 0} ferme={fermeLvl > 0} carriere={carriereLvl > 0} actif={paisible} />

          <Emplacement id="carriere" now={now} paisible={paisible} cadre={camera.cadre} palier={camera.palier} />
          <Emplacement id="scierie" now={now} paisible={paisible} cadre={camera.cadre} palier={camera.palier} />

          <Murailles
            niveau={wallLevel}
            hp={wallHp}
            max={wallMax}
            breche={portePercee}
            layer="back"
            tours={tours}
            brechesAngles={brechesAngles}
          />
          {rempartsChantier && spanMur > 0 && remparts.targetLevel !== undefined && (
            <Murailles niveau={remparts.targetLevel} hp={1} max={1} breche={false} layer="back" span={spanMur} />
          )}

          {dedans.map((b) => (
            <Emplacement key={b} id={b} now={now} paisible={paisible} cadre={camera.cadre} palier={camera.palier} />
          ))}

          {/*
            La Redoute. Elle n'est pas un `BuildingId` - elle n'a ni niveaux de
            règne, ni postes, ni production - mais elle occupe bien une place dans
            l'enceinte, au sud de l'agora, et se peint donc ici, entre les
            édifices et les habitants.
          */}
          {redoute > 0 && (
            <g transform={`translate(${REDOUTE_POS.x},${REDOUTE_POS.y})`}>
              <Redoute n={redoute} />
            </g>
          )}

          <Villageois pop={pop} morale={morale} now={now} enBataille={battle !== null} />
          {/* les héros sont des habitants : ils arpentent la place comme les autres */}
          <HerosVillage presents={herosPresents} now={now} enBataille={battle !== null} />

          <Murailles
            niveau={wallLevel}
            hp={wallHp}
            max={wallMax}
            breche={portePercee}
            layer="front"
            tours={tours}
            brechesAngles={brechesAngles}
          />
          {rempartsChantier && spanMur > 0 && remparts.targetLevel !== undefined && (
            <Murailles niveau={remparts.targetLevel} hp={1} max={1} breche={false} layer="front" span={spanMur} />
          )}

          {/* la garnison monte la garde tant qu'aucune bataille ne fait rage */}
          <Garnison army={army} wallLevel={wallLevel} visible={battle === null} />

          {/* zone cliquable des remparts (sur la porte) */}
          <g
            data-tuto="carte-remparts"
            transform={`translate(${MAP.porte.x},${MAP.porte.y})`}
            onClick={(e) => {
              e.stopPropagation()
              if (vientDeGlisser()) return
              select('remparts')
            }}
            onMouseEnter={() => setHoverMur(true)}
            onMouseLeave={() => setHoverMur(false)}
            style={{ cursor: 'pointer' }}
          >
            {selected === 'remparts' && (
              <ellipse cx={0} cy={-6} rx={50} ry={30} fill="none" stroke="#e8c04a" strokeWidth={2} strokeDasharray="6 5" />
            )}
            {wallLevel === 0 && !rempartsChantier && !battle && (
              <g opacity={0.8}>
                <text x={0} y={-8} textAnchor="middle" fontSize={19}>
                  🧱
                </text>
                <text x={0} y={8} textAnchor="middle" fontSize={9.5} fill="#3d3a30" fontWeight={700}>
                  ＋ REMPARTS
                </text>
              </g>
            )}
            {rempartsChantier && !battle && (
              <g>
                <Batisseur x={-36} y={20} />
                <Batisseur x={28} y={26} flip begin="0.8s" />
                <g transform="translate(0,-56)">
                  <rect x={-22} y={0} width={44} height={6} rx={3} fill="#1d1d1d" opacity={0.7} />
                  <rect x={-21} y={1} width={Math.max(2, 42 * progMur)} height={4} rx={2} fill="#e8c04a" />
                </g>
              </g>
            )}
            {hoverMur && <Etiquette texte={labelMur} y={-68} />}
            <ellipse cx={0} cy={-6} rx={48} ry={30} fill="transparent" />
          </g>

          {/* Portée des tours, quand les remparts sont sélectionnés. Un disque
              jaune plein noyait la carte : on ne garde qu'un halo de bord et un
              liseré fin - on lit la limite, pas une tache. */}
          {selected === 'remparts' &&
            tours > 0 &&
            TOUR_ANGLES.slice(0, tours).map((a) => {
              const p = pointMur(a)
              return (
                <g key={a} pointerEvents="none">
                  <circle cx={p.x} cy={p.y - 32} r={TOUR_PORTEE} fill="url(#portee-halo)" />
                  <circle
                    cx={p.x}
                    cy={p.y - 32}
                    r={TOUR_PORTEE}
                    fill="none"
                    stroke="#f0dca0"
                    strokeWidth={1}
                    strokeDasharray="3 9"
                    opacity={0.4}
                  />
                </g>
              )
            })}

          <Emplacement id="ferme" now={now} paisible={paisible} cadre={camera.cadre} palier={camera.palier} />
          <Emplacement id="port" now={now} paisible={paisible} cadre={camera.cadre} palier={camera.palier} />

          {battle && <BatailleLayer battle={battle} now={now} wallHp={wallHp} wallMax={wallMax} />}
          {/* la structure des édifices : elle ne paraît qu'une fois la brèche ouverte */}
          <SanteBatiments />
        </g>

        {/* le ciel du jour : teinte de la saison, puis ce qui en tombe. Posé hors
            du groupe caméra - la pluie tombe sur l'écran, pas sur la carte. */}
        <VoileSaison saison={saison} w={MAP.w} h={MAP.h} />
        <Meteo meteo={meteo} w={MAP.w} h={MAP.h} />

        {/* voile et vignette restent solidaires de l'écran - et s'effacent à demi
            pendant un assaut, pour que la mêlée reste lisible même de nuit */}
        <g opacity={battle ? 0.45 : 1}>
          <Vignette />
          <VoileJourNuit phase={phase} />
        </g>
      </g>

      {/* cadre doré */}
      <rect x={2.5} y={2.5} width={MAP.w - 5} height={MAP.h - 5} rx={15} fill="none" stroke="#8c6f2e" strokeWidth={4} />
      <rect x={9} y={9} width={MAP.w - 18} height={MAP.h - 18} rx={10} fill="none" stroke="#e0bc5c" strokeWidth={1.4} opacity={0.65} />
      {[
        [16, 16],
        [MAP.w - 16, 16],
        [16, MAP.h - 16],
        [MAP.w - 16, MAP.h - 16],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <rect x={-5} y={-5} width={10} height={10} fill="none" stroke="#e0bc5c" strokeWidth={1.4} opacity={0.8} transform="rotate(45)" />
          <circle r={1.6} fill="#e0bc5c" opacity={0.8} />
        </g>
      ))}
    </svg>

      {/* commandes de vue - la molette et le glisser font la même chose,
          ces boutons ne sont là que pour ceux qui n'ont ni l'un ni l'autre */}
      <div className="zoom-controles">
        <Astuce titre="− Reculer" resume="Prendre du champ sur la plaine. La molette vers le bas fait la même chose.">
          <button
            onClick={() => camera.zoomer(1 / 1.35)}
            disabled={camera.manuel && camera.zoom <= ZOOM_MIN + 0.01}
            aria-label="Dézoomer"
          >
            −
          </button>
        </Astuce>
        <Astuce
          titre="🔍 La caméra"
          resume={
            camera.manuel
              ? 'Vous tenez la vue. Elle ne bougera plus d’elle-même tant que vous ne l’aurez pas recentrée.'
              : 'La caméra suit l’action d’elle-même : elle se penche sur l’assaut, puis revient au village.'
          }
          lignes={[
            { label: 'Molette', valeur: 'zoom' },
            { label: 'Glisser', valeur: 'déplacer' },
            { label: 'Double-clic', valeur: 'recentrer' },
          ]}
        >
          <span className="zoom-valeur">×{camera.manuel ? camera.zoom.toFixed(1) : '1'}</span>
        </Astuce>
        <Astuce titre="+ Approcher" resume="Entrer dans le détail des bâtiments. La molette vers le haut fait la même chose.">
          <button
            onClick={() => camera.zoomer(1.35)}
            disabled={camera.manuel && camera.zoom >= ZOOM_MAX - 0.01}
            aria-label="Zoomer"
          >
            +
          </button>
        </Astuce>
        {camera.manuel && (
          <Astuce
            titre="⤢ Rendre la main à la caméra"
            resume="Elle reprend son travail : cadrer le village, et se pencher d’elle-même sur les assauts."
          >
            <button className="zoom-recentrer" onClick={camera.recentrer}>
              ⤢ recentrer
            </button>
          </Astuce>
        )}
      </div>
    </>
  )
}
