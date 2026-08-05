import { HEROS } from '../../game/heros'
import type { BattleState, Fighter, HeroId, SecteurBataille, UnitId } from '../../game/types'
import { assaillantsParSecteur, indexSecteurChaud } from './camera'
import { EffetDivin, EffetHeros } from './EffetsDivins'
import { Anim, AnimM, AnimT } from './smil'
import { SilhouetteHeros } from './SilhouettesHeros'

/*
 * Figurines de bataille - animées en SMIL (aucun coût JS par frame) :
 *  - marche : jambes en ciseaux, balancement du corps, cape d'ombre qui suit
 *  - mêlée / siège : coup d'arme porté en boucle - jab de lance, taillade de
 *    dague, estoc d'épée - désynchronisé par figurine via `seed`
 *  - tir : l'archer bande son arc au rythme réel de sa cadence, et la fronde du
 *    frondeur prend son élan au-dessus de sa tête (giration accélérée au tir)
 *  - jet : le peltaste arme son javelot par-dessus l'épaule et le lâche
 *  - mort : la figurine bascule au sol puis se dissout dans la poussière
 * Les durées de cycle collent aux cadences de combat.ts pour que le geste
 * et le coup restent crédibles l'un envers l'autre.
 */

type Anim = 'idle' | 'marche' | 'combat' | 'tir'

/**
 * L'arme ne fait pas que trancher : elle emporte tout l'attirail de l'homme qui
 * la porte, et c'est l'attirail qui donne la SILHOUETTE. Une figurine fait
 * quatorze pixels de haut en jeu - à cette taille on ne lit ni un visage ni une
 * tunique, on lit une forme. Chaque valeur ci-dessous vaut donc une forme :
 *
 *  · `lance`          hampe longue + disque du bouclier rond (la milice)
 *  · `arc`            l'arc bandé en croissant devant lui, carquois au dos
 *  · `bouclier-lourd` le grand aspis qui mange l'homme + cimier + cnémides
 *  · `dague`          bras court, calot de cuir (les pillards)
 *  · `fronde`         RIEN dans les mains, mais une boucle qui tourne AU-DESSUS
 *                     de la tête, bonnet de feutre, besace de pierres
 *  · `javelots`       le peltê échancré en croissant de lune + faisceau de
 *                     javelots, bonnet thrace à rabats, jambes nues
 */
export type Arme = 'lance' | 'arc' | 'dague' | 'bouclier-lourd' | 'fronde' | 'javelots'

const PEAU = '#d9a97c'
/** ombre propre de la peau (flanc est du visage, bras au second plan) */
const PEAU_OMBRE = '#bd8a5c'

/** mélange déterministe de deux hex - pour nuancer les tuniques autour de leur teinte */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const c = (sa: number, sb: number) => Math.round(sa + (sb - sa) * t)
  const r = c((pa >> 16) & 255, (pb >> 16) & 255)
  const g = c((pa >> 8) & 255, (pb >> 8) & 255)
  const bl = c(pa & 255, pb & 255)
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`
}
/** flanc éclairé (soleil NW) et creux des plis d'une étoffe */
const drapLit = (c: string) => mix(c, '#ffe9c2', 0.34)
const drapOmbre = (c: string) => mix(c, '#221408', 0.34)

/**
 * Contour du peltê : un disque d'osier de rayon 4,4 dans lequel on a mordu un
 * second cercle par le haut - il en reste un croissant de lune à deux cornes.
 * Le tracé est écrit une fois et réemployé rentré (rive, champ, éclat) : le
 * bombé se fait par copies concentriques, comme pour les boucliers ronds.
 */
const PELTE = 'M-7.77,-11.18 A3.5,3.5 0 1 0 -2.64,-11.18 A2.6,2.6 0 0 1 -7.77,-11.18 Z'

/** ombre au sol commune : trois ellipses terre superposées, bord fondu sans filtre */
function OmbreSol({ rx = 5, ry = 1.8 }: { rx?: number; ry?: number }) {
  return (
    <>
      <ellipse cx={rx * 0.16} cy={1.15} rx={rx * 1.22} ry={ry * 1.18} fill="#241a08" opacity={0.06} />
      <ellipse cx={rx * 0.1} cy={1.05} rx={rx * 0.92} ry={ry * 0.92} fill="#241a08" opacity={0.09} />
      <ellipse cx={rx * 0.06} cy={1} rx={rx * 0.6} ry={ry * 0.64} fill="#241a08" opacity={0.12} />
    </>
  )
}

/** casque de bronze : calotte modelée, reflet NW, couvre-nuque - la crête est à part */
function Casque() {
  return (
    <g>
      {/* couvre-nuque en deux lames (le dos est à gauche, la figurine regarde vers +x) */}
      <path d="M-2.6,-13.3 L-3.85,-10.9 L-2.1,-10.75 L-1.75,-12.8 Z" fill="#4e4423" />
      <path d="M-2.6,-13.3 L-3.25,-12.05 L-1.95,-11.9 L-1.75,-12.8 Z" fill="#7a6c3e" />
      {/* calotte : bronze chaud en demi-teinte, flanc est dans l'ombre */}
      <path d="M-2.8,-13.3 Q-2.8,-16.3 0,-16.3 Q2.8,-16.3 2.8,-13.3 L2.8,-12.6 L-2.8,-12.6 Z" fill="#8a7845" />
      <path d="M0.55,-16.25 Q2.8,-15.7 2.8,-13.3 L2.8,-12.6 L0.9,-12.6 Q1.9,-14.7 0.55,-16.25 Z" fill="#5c5231" />
      {/* reflet spéculaire NW court, doublé d'un demi-ton qui arrondit la calotte */}
      <path d="M-2.05,-14.5 Q-1.5,-15.6 -0.4,-15.8" stroke="#f2e6b0" strokeWidth={0.75} fill="none" strokeLinecap="round" />
      <path d="M-2.45,-13.4 Q-2.35,-14.3 -1.85,-14.9" stroke="#c9b878" strokeWidth={0.55} fill="none" strokeLinecap="round" opacity={0.9} />
      {/* bourrelet du bord : ombre dessous, filet clair dessus - assoit le casque */}
      <path d="M-2.8,-12.6 L2.8,-12.6" stroke="#4c431f" strokeWidth={0.85} />
      <path d="M-2.7,-13.05 L2.7,-13.05" stroke="#a08c50" strokeWidth={0.45} opacity={0.7} />
      {/* nasal court au front */}
      <path d="M2.2,-13.9 L2.8,-13.3 L2.8,-12.6 L1.8,-13.2 Z" fill="#6a5f3a" />
    </g>
  )
}

/** calot de cuir des pillards : coiffe basse, bandeau, nuque dégagée */
function CalotCuir() {
  return (
    <g>
      <path d="M-2.65,-13.1 Q-2.65,-15.7 0,-15.7 Q2.65,-15.7 2.65,-13.1 L2.65,-12.75 L-2.65,-12.75 Z" fill="#8a6a3e" />
      <path d="M0.5,-15.65 Q2.65,-15.2 2.65,-13.1 L2.65,-12.75 L0.8,-12.75 Q1.7,-14.4 0.5,-15.65 Z" fill="#634829" />
      <path d="M-1.95,-14.15 Q-1.4,-15.1 -0.35,-15.25" stroke="#c2985e" strokeWidth={0.65} fill="none" strokeLinecap="round" />
      {/* bandeau cousu, couture apparente */}
      <path d="M-2.65,-12.75 L2.65,-12.75" stroke="#4a3319" strokeWidth={0.75} />
      <path d="M-2.55,-13.15 L2.55,-13.15" stroke="#a8865a" strokeWidth={0.4} opacity={0.8} />
    </g>
  )
}

/**
 * Bonnet de feutre du berger (pilos) : un cône de laine foulée, sans un gramme
 * de métal. C'est la coiffe du frondeur - le seul soldat qui n'a rien coûté de
 * bronze, et cela doit se voir sur sa tête avant tout le reste.
 */
function BonnetFeutre() {
  return (
    <g>
      {/* cône de feutre, apex versé vers l'avant */}
      <path d="M-2.6,-14 Q-2.45,-17 0.45,-18.5 Q2.05,-16.6 2.6,-14 Z" fill="#b3a486" />
      <path d="M0.45,-18.5 Q2.05,-16.6 2.6,-14 L0.9,-14 Q1.2,-16.6 0.45,-18.5 Z" fill="#8a7c60" />
      {/* laine frappée par le soleil au NW, et le grain du feutre */}
      <path d="M-1.95,-15 Q-1.75,-16.9 -0.4,-17.9" stroke="#d8cbab" strokeWidth={0.65} fill="none" strokeLinecap="round" />
      <path d="M-1.45,-14.6 Q-1.15,-16.1 -0.15,-17" stroke="#c3b493" strokeWidth={0.38} fill="none" opacity={0.8} />
      {/* bord retroussé : ombre dessous, filet clair dessus - le bonnet se pose */}
      <path d="M-2.7,-13.95 L2.7,-13.95" stroke="#796c52" strokeWidth={0.8} />
      <path d="M-2.6,-14.35 L2.5,-14.35" stroke="#c6b899" strokeWidth={0.4} opacity={0.75} />
    </g>
  )
}

/**
 * Bonnet thrace du peltaste : calotte de peau de renard, pointe versée en avant
 * et deux longs rabats qui pendent sur la joue et la nuque. Aucun casque de
 * bronze - la vitesse se paie en protection.
 */
function BonnetThrace() {
  return (
    <g>
      {/* rabats : celui de nuque à l'ombre (à gauche), celui de joue en demi-teinte */}
      <path d="M-2.7,-13.6 L-3.35,-9.9 L-2.05,-9.75 L-1.85,-13.5 Z" fill="#5f452a" />
      <path d="M-2.7,-13.6 L-3.05,-11.7 L-1.95,-11.6 L-1.85,-13.5 Z" fill="#7c5c38" />
      <path d="M2.1,-13.6 L2.6,-10.7 L1.5,-10.55 L1.35,-13.5 Z" fill="#6d5030" />
      {/* calotte de fourrure, flanc est éteint */}
      <path d="M-2.7,-13.5 Q-2.7,-16.2 0,-16.2 Q2.7,-16.2 2.7,-13.5 Z" fill="#ad8353" />
      <path d="M0.6,-16.15 Q2.7,-15.65 2.7,-13.5 L0.9,-13.5 Q1.9,-14.85 0.6,-16.15 Z" fill="#7d5c37" />
      {/* la pointe versée en avant : c'est ELLE qu'on reconnaît de loin */}
      <path d="M1.15,-15.95 Q3.5,-16.85 4.35,-15 Q2.7,-14.8 1.65,-15.45 Z" fill="#bc9058" />
      <path d="M1.15,-15.95 Q3.5,-16.85 4.35,-15 Q3.1,-15.85 1.45,-15.8 Z" fill="#dcb279" />
      {/* poil au soleil, bourrelet du bord */}
      <path d="M-2.05,-14.5 Q-1.5,-15.6 -0.4,-15.85" stroke="#c99a62" strokeWidth={0.65} fill="none" strokeLinecap="round" />
      <path d="M-2.7,-13.5 L2.7,-13.5" stroke="#4f3823" strokeWidth={0.7} />
    </g>
  )
}

/** crête d'officier : brosse fournie, racine sombre, mèche avant au soleil */
function Crete() {
  return (
    <g>
      <path
        d="M-3.1,-14.7 L-2.4,-17.6 L-1.6,-16.9 L-0.9,-18.6 L-0.1,-17.2 L0.6,-18.9 L1.4,-17.1 L2.1,-18 L2.6,-16.5 L3,-15.1 Q0,-16.8 -3.1,-14.7 Z"
        fill="#a8483a"
      />
      {/* mèches avant frappées par le soleil */}
      <path d="M-0.9,-18.6 L-0.1,-17.2 L-1.35,-16.95 Z" fill="#cf6a4e" />
      <path d="M-2.4,-17.6 L-1.6,-16.9 L-2.5,-16.4 Z" fill="#c05f46" />
      {/* racine sombre qui assoit la brosse sur la calotte */}
      <path d="M-3.1,-14.7 Q0,-16.8 3,-15.1" stroke="#7c322a" strokeWidth={1.15} fill="none" />
      <path d="M-2.6,-15.15 Q0,-16.3 2.6,-15.4" stroke="#8f3c30" strokeWidth={0.6} fill="none" opacity={0.9} />
    </g>
  )
}

export function Bonhomme({
  tunique,
  arme,
  taille = 1,
  crete,
  anim = 'idle',
  seed = 0,
  dur = 2.1,
}: {
  tunique: string
  arme: Arme
  taille?: number
  crete?: boolean
  anim?: Anim
  seed?: number
  /** durée (s) du cycle d'attaque - alignée sur la cadence de frappe */
  dur?: number
}) {
  const marche = anim === 'marche'
  const combat = anim === 'combat'
  const tir = anim === 'tir'
  // désynchronise les boucles : pas d'armée de clones qui frappent en chœur
  const decal = `-${(seed * 3.1).toFixed(2)}s`
  const durS = `${dur}s`

  /*
   * Deux corps, pas un seul repeint. Le berger et le coureur ont la cuisse nue et
   * l'étoffe courte : leur jambe part plus haut, leur tunique s'arrête au-dessus
   * du genou. L'infanterie lourde, à l'inverse, marche dans des cnémides - sa
   * jambe est en bronze, pas en peau. Deux réglages, trois silhouettes.
   */
  const leger = arme === 'fronde' || arme === 'javelots'
  const lourd = arme === 'bouclier-lourd'
  const jHaut = leger ? -6 : -4
  const jambeLit = lourd ? '#8f7c48' : PEAU
  const jambeOmbre = lourd ? '#5f5432' : PEAU_OMBRE
  // le peltaste court : tout son corps est versé en avant, les pieds restent au sol
  const penche = arme === 'javelots' ? ' skewX(-5)' : ''

  return (
    <g transform={`scale(${taille})${penche}`}>
      <OmbreSol rx={5} ry={1.8} />

      {/* jambes - un petit pied tourné vers l'avant ancre la silhouette au sol */}
      {marche ? (
        <>
          <path d={`M-1.6,${jHaut} L-1.6,-0.5 L-0.55,-0.35`} stroke={jambeLit} strokeWidth={1.6} fill="none" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" values={`22 0 ${jHaut};-22 0 ${jHaut};22 0 ${jHaut}`} dur="0.6s" begin={decal} repeatCount="indefinite" />
          </path>
          <path d={`M1.6,${jHaut} L1.6,-0.5 L2.65,-0.35`} stroke={jambeOmbre} strokeWidth={1.6} fill="none" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" values={`-22 0 ${jHaut};22 0 ${jHaut};-22 0 ${jHaut}`} dur="0.6s" begin={decal} repeatCount="indefinite" />
          </path>
        </>
      ) : (
        <>
          <path d={`M-1.6,${jHaut} L-1.6,-0.5 L-0.55,-0.35`} stroke={jambeLit} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          <path d={`M1.6,${jHaut} L1.6,-0.5 L2.65,-0.35`} stroke={jambeOmbre} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        </>
      )}
      {/* cnémides : arête de bronze qui accroche la lumière sur le tibia ouest
          (à l'arrêt seulement : un reflet ne suit pas une jambe qui bat) */}
      {lourd && !marche && (
        <path d="M-2.1,-3.6 L-2.1,-1.2" stroke="#c9b878" strokeWidth={0.45} opacity={0.75} strokeLinecap="round" />
      )}

      {/* corps, tête et arme - le buste porte le geste */}
      <g>
        {marche && (
          <animateTransform attributeName="transform" type="translate" values="0,0;0,-1.2;0,0" dur="0.3s" begin={decal} repeatCount="indefinite" />
        )}
        {combat && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0;2.4,-0.6;0,0;0,0"
            keyTimes="0;0.1;0.22;1"
            dur={durS}
            begin={decal}
            repeatCount="indefinite"
          />
        )}

        {/* ptéruges de cuir sous la tunique de l'infanterie lourde */}
        {arme === 'bouclier-lourd' && (
          <g>
            <path d="M-2.2,-4.4 L-2,-2.6 L-1.2,-2.7 L-1.3,-4.3 Z" fill="#6b4c2a" />
            <path d="M-0.6,-4.3 L-0.5,-2.5 L0.4,-2.6 L0.4,-4.3 Z" fill="#83694a" />
            <path d="M1.1,-4.3 L1.3,-2.7 L2.1,-2.8 L2.2,-4.4 Z" fill="#5d4230" />
          </g>
        )}
        {leger ? (
          /*
           * Exomide : l'étoffe courte du berger et du coureur, prise dans une simple
           * ceinture de corde et fendue au-dessus du genou. Elle est plus étroite que
           * la tunique de la milice - c'est ce qui rend ces deux-là SVELTES à l'œil.
           */
          <>
            <path d="M-2.5,-5.5 L-2.05,-10.9 L2.05,-10.9 L2.5,-6.1 Z" fill={tunique} />
            <path d="M-2.5,-5.5 L-2.05,-10.9 L-0.75,-10.9 L-1,-5.7 Z" fill={mix(tunique, '#ffe9c2', 0.24)} />
            <path d="M2.05,-10.9 L2.5,-6.1 L1.6,-6.2 L1.5,-10.9 Z" fill={drapOmbre(tunique)} opacity={0.8} />
            {/* ourlet en biais : la fente qui découvre la cuisse */}
            <path d="M-2.45,-5.8 L2.45,-6.35" stroke={drapOmbre(tunique)} strokeWidth={0.6} opacity={0.7} />
            {/* ceinture de corde tressée */}
            <path d="M-2.35,-7.5 L2.35,-7.5" stroke="#6b563a" strokeWidth={0.8} />
            <path d="M-2.3,-7.75 L0.2,-7.75" stroke="#9a8158" strokeWidth={0.4} opacity={0.8} />
            <path d="M-2.15,-10.9 L0.4,-10.9" stroke={drapLit(tunique)} strokeWidth={0.85} opacity={0.8} />
          </>
        ) : (
          <>
            {/* tunique : flanc gauche au soleil, plis creusés dans la teinte sombre, ceinture */}
            <path d="M-3,-4 L-2.2,-11 L2.2,-11 L3,-4 Z" fill={tunique} />
            <path d="M-3,-4 L-2.2,-11 L-0.7,-11 L-1.1,-4 Z" fill={mix(tunique, '#ffe9c2', 0.22)} />
            <path d="M2.2,-11 L3,-4 L2,-4 L1.6,-11 Z" fill={drapOmbre(tunique)} opacity={0.8} />
            <path d="M0.7,-4.4 L0.5,-6.2" stroke={drapOmbre(tunique)} strokeWidth={0.8} opacity={0.85} />
            {/* ourlet assombri qui assoit l'étoffe */}
            <path d="M-2.9,-4.3 L2.9,-4.3" stroke={drapOmbre(tunique)} strokeWidth={0.7} opacity={0.7} />
            {/* baudrier de l'épée en travers du buste */}
            {lourd && <path d="M1.9,-10.8 L-2.2,-7.4" stroke="#4a3319" strokeWidth={0.7} opacity={0.85} />}
            <path d="M-2.68,-6.5 L2.68,-6.5 L2.76,-7.5 L-2.76,-7.5 Z" fill="#5d4230" />
            <path d="M-2.76,-7.5 L-0.3,-7.5 L-0.3,-6.5 L-2.68,-6.5 Z" fill="#7a5a3e" opacity={0.75} />
            {/* épaules : ourlet clair côté lumière */}
            <path d="M-2.2,-11 L0.4,-11" stroke={drapLit(tunique)} strokeWidth={0.9} opacity={0.8} />
          </>
        )}
        {/* creux d'ombre sous le menton - assoit la tête sur les épaules */}
        <path d="M-1.5,-10.9 Q0,-10.2 1.5,-10.9" stroke={drapOmbre(tunique)} strokeWidth={0.7} fill="none" opacity={0.5} />
        {/* tête : face au soleil, joue est dans l'ombre */}
        <circle cx={0} cy={-13} r={2.7} fill={PEAU} />
        <path d="M0.9,-15.55 A2.7,2.7 0 0 1 0.9,-10.45 A3.9,3.9 0 0 0 0.9,-15.55 Z" fill={PEAU_OMBRE} />
        {arme === 'dague' ? (
          <CalotCuir />
        ) : arme === 'fronde' ? (
          <BonnetFeutre />
        ) : arme === 'javelots' ? (
          <BonnetThrace />
        ) : (
          <Casque />
        )}
        {crete && <Crete />}

        {/* carquois en biais dans le dos des archers, deux flèches qui dépassent */}
        {arme === 'arc' && (
          <g>
            <line x1={-4.6} y1={-10.6} x2={-4} y2={-11.9} stroke="#5d4a33" strokeWidth={0.8} />
            <line x1={-3.8} y1={-10.9} x2={-3.3} y2={-12.2} stroke="#5d4a33" strokeWidth={0.8} />
            <path d="M-5.3,-10.3 L-3.9,-10.9 L-2.4,-7.4 L-3.8,-6.9 Z" fill="#7a5230" />
            <path d="M-5.3,-10.3 L-4.6,-10.6 L-3.1,-7.15 L-3.8,-6.9 Z" fill="#9a6f42" />
            {/* bretelle du carquois en travers du buste */}
            <path d="M-2.9,-9.4 L1.7,-7.2" stroke="#4a3319" strokeWidth={0.65} opacity={0.8} />
          </g>
        )}

        {/* ── armes ── */}
        {arme === 'lance' && (
          <g>
            {combat && (
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0;-1.6,0.4;3.4,-1;0,0;0,0"
                keyTimes="0;0.06;0.13;0.3;1"
                dur={durS}
                begin={decal}
                repeatCount="indefinite"
              />
            )}
            {/* bras qui porte la hampe, main refermée dessus */}
            <line x1={1.3} y1={-9.3} x2={5.1} y2={-8.5} stroke={PEAU} strokeWidth={1.3} />
            {/* hampe deux tons : bas en ombre, haut frappé par le soleil */}
            <line x1={4} y1={2} x2={7} y2={-18} stroke="#6b4c2a" strokeWidth={1.3} />
            <line x1={5.6} y1={-8.6} x2={7} y2={-18} stroke="#a8845d" strokeWidth={0.9} />
            <circle cx={5.5} cy={-8.5} r={0.85} fill={PEAU} />
            {/* fer à deux facettes : éclat NW, revers dans l'ombre */}
            <path d="M7,-18 L7.9,-21 L8.1,-18.2 Z" fill="#e4eaef" />
            <path d="M8.1,-18.2 L7.9,-21 L9.2,-18.4 Z" fill="#87909a" />
            <line x1={7} y1={-17.7} x2={8.6} y2={-18.1} stroke="#4f3a22" strokeWidth={0.8} />
          </g>
        )}

        {arme === 'dague' && (
          <g>
            {combat && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 2 -8;-55 2 -8;28 2 -8;0 2 -8;0 2 -8"
                keyTimes="0;0.08;0.15;0.32;1"
                dur={durS}
                begin={decal}
                repeatCount="indefinite"
              />
            )}
            <line x1={2} y1={-8} x2={4.5} y2={-8.8} stroke={PEAU} strokeWidth={1.3} />
            {/* lame : dos dans l'ombre, fil qui accroche la lumière, petite garde */}
            <line x1={4.5} y1={-8.8} x2={8} y2={-11.5} stroke="#8a929b" strokeWidth={1.4} />
            <line x1={4.9} y1={-9.35} x2={7.7} y2={-11.5} stroke="#e6ebf0" strokeWidth={0.8} />
            <line x1={4.35} y1={-9.6} x2={5.1} y2={-8.2} stroke="#8c6b3f" strokeWidth={0.9} />
            <circle cx={4.4} cy={-8.8} r={0.75} fill={PEAU} />
          </g>
        )}

        {arme === 'bouclier-lourd' && (
          <g>
            {combat && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 2 -9;-48 2 -9;22 2 -9;0 2 -9;0 2 -9"
                keyTimes="0;0.07;0.14;0.3;1"
                dur={durS}
                begin={decal}
                repeatCount="indefinite"
              />
            )}
            {/* épée courte (xiphos) : lame à deux facettes, garde de bronze, pommeau */}
            <line x1={2.6} y1={-9} x2={5} y2={-9.6} stroke={PEAU} strokeWidth={1.3} />
            <line x1={5} y1={-9.6} x2={9.2} y2={-12.6} stroke="#a9b0b8" strokeWidth={1.5} />
            <line x1={5.35} y1={-10.15} x2={8.9} y2={-12.65} stroke="#eef2f6" strokeWidth={0.8} />
            <line x1={5.4} y1={-10.8} x2={6.2} y2={-9.2} stroke="#8c6b3f" strokeWidth={1.1} />
            <circle cx={4.7} cy={-9.35} r={0.8} fill="#6b4c2a" />
            <circle cx={5.05} cy={-9.62} r={0.6} fill={PEAU} />
          </g>
        )}

        {arme === 'arc' && (
          <g>
            {tir && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 3 -9;-13 3 -9;-13 3 -9;4 3 -9;0 3 -9"
                keyTimes="0;0.3;0.52;0.6;1"
                dur={durS}
                begin={decal}
                repeatCount="indefinite"
              />
            )}
            {/* bras d'arc tendu vers la poignée */}
            <line x1={1.3} y1={-9.6} x2={6.1} y2={-9.5} stroke={PEAU} strokeWidth={1.2} />
            {/* arc deux tons : dos du bois dans l'ombre, ventre côté lumière, poignée gainée */}
            <path d="M4.5,-15 Q9,-9.5 4.5,-4" stroke="#6b4c2a" strokeWidth={1.4} fill="none" />
            <path d="M4.3,-15.2 Q8.7,-9.7 4.3,-4.4" stroke="#a8845d" strokeWidth={0.8} fill="none" />
            <line x1={6.35} y1={-10.4} x2={6.75} y2={-8.6} stroke="#4f3a22" strokeWidth={1.1} />
            <circle cx={6.5} cy={-9.5} r={0.8} fill={PEAU} />
            {tir ? (
              <>
                {/* corde tirée puis relâchée, flèche encochée qui disparaît au départ */}
                <path stroke="#e0d9c8" strokeWidth={0.5} fill="none" d="M4.5,-15 L4.5,-4">
                  <animate
                    attributeName="d"
                    values="M4.5,-15 L4.5,-4;M4.5,-15 L1.8,-9.5 L4.5,-4;M4.5,-15 L1.8,-9.5 L4.5,-4;M4.5,-15 L4.5,-4"
                    keyTimes="0;0.3;0.52;0.6"
                    dur={durS}
                    begin={decal}
                    repeatCount="indefinite"
                  />
                </path>
                <line x1={1.8} y1={-9.5} x2={8.4} y2={-9.5} stroke="#5d4a33" strokeWidth={0.9}>
                  <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.3;0.52;0.56;1" dur={durS} begin={decal} repeatCount="indefinite" />
                </line>
              </>
            ) : (
              <line x1={4.5} y1={-15} x2={4.5} y2={-4} stroke="#e0d9c8" strokeWidth={0.5} />
            )}
          </g>
        )}

        {/*
          ── FRONDE ──────────────────────────────────────────────────────────
          Le frondeur n'a rien dans les mains : il a une boucle qui TOURNE
          au-dessus de sa tête. C'est la seule silhouette du jeu qui dépasse sa
          propre coiffe, et on la reconnaît même à quatorze pixels. La giration
          s'accélère quand il tire, comme un homme qui prend son élan.
        */}
        {arme === 'fronde' && (
          <g>
            {/* besace de peau, ballante à la hanche, deux galets de rivière visibles */}
            <path d="M-4.7,-7.5 Q-2.4,-8 -2,-6.2 Q-2.2,-4.1 -3.5,-3.9 Q-4.9,-4.3 -4.9,-6.1 Z" fill="#6b563a" />
            <path d="M-4.7,-7.5 Q-3.3,-7.8 -3,-6.4 Q-3.1,-4.5 -3.6,-3.95 Q-4.8,-4.4 -4.85,-6.1 Z" fill="#987c52" />
            <circle cx={-3.5} cy={-6.5} r={0.72} fill="#b9b3a4" />
            <circle cx={-2.55} cy={-6.95} r={0.5} fill="#a29c8d" />
            {/* bandoulière de la besace en travers du buste */}
            <path d="M-2.5,-7.9 L1.1,-10.2" stroke="#4f3f28" strokeWidth={0.6} opacity={0.85} />
            {/* bras levé, la fronde au poing */}
            <line x1={1.5} y1={-10.1} x2={3.6} y2={-14.8} stroke={PEAU} strokeWidth={1.25} strokeLinecap="round" />
            <circle cx={3.6} cy={-15} r={0.82} fill={PEAU} />
            {/*
              La TRACE de la giration : sans elle, la fronde ne se lisait pas - un
              galet au bout d'un brin ressemblait à une massue. Cet arc pointillé
              au-dessus du crâne dit « ça tourne » d'un seul coup d'œil, et c'est
              lui qui survit à quatorze pixels de haut.
            */}
            <path
              d="M0.24,-17.35 A4.1,4.1 0 0 1 6.96,-17.35"
              stroke="#6b563a"
              strokeWidth={0.4}
              strokeDasharray="1.5 1.1"
              opacity={0.45}
              fill="none"
            />
            <g transform="translate(3.6,-15)">
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="0;360"
                  dur={tir ? '0.5s' : '1.15s'}
                  begin={decal}
                  repeatCount="indefinite"
                />
                {/* deux brins de cuir tressé, la poche, et le galet qui luit */}
                <line x1={-0.35} y1={-0.3} x2={-1.05} y2={-3.4} stroke="#6b563a" strokeWidth={0.42} />
                <line x1={0.35} y1={-0.3} x2={0.9} y2={-3.4} stroke="#8f7551" strokeWidth={0.38} />
                <path d="M-1.3,-3.35 L1.1,-3.35 L0.8,-4.6 L-1,-4.6 Z" fill="#7a5f3c" />
                <path d="M-1.3,-3.35 L-0.15,-3.35 L-0.3,-4.6 L-1,-4.6 Z" fill="#9a7c50" />
                <circle cx={-0.1} cy={-4.1} r={0.72} fill="#b0aa9a" />
                <circle cx={-0.32} cy={-4.32} r={0.38} fill="#dcd7c9" />
              </g>
            </g>
          </g>
        )}

        {/*
          ── JAVELOTS ────────────────────────────────────────────────────────
          Le peltaste porte trois hampes : deux en réserve, serrées au poing
          gauche derrière le peltê, une en main haute prête à partir. Le faisceau
          en éventail derrière l'épaule est sa deuxième marque, après le
          croissant du bouclier.
        */}
        {arme === 'javelots' && (
          <g>
            {/* faisceau de réserve : deux hampes dressées le long du dos, fers au ciel.
                Elles montent au-dessus du bouclier pour ne pas brouiller le croissant */}
            <line x1={-2.4} y1={-6.4} x2={-3.7} y2={-17.3} stroke="#6b4c2a" strokeWidth={0.85} />
            <line x1={-1.95} y1={-6.5} x2={-2.35} y2={-17.7} stroke="#8a6a45" strokeWidth={0.75} />
            <path d="M-3.7,-17.3 L-4.15,-19.2 L-3.15,-17.55 Z" fill="#d6dce2" />
            <path d="M-2.35,-17.7 L-2.6,-19.6 L-1.65,-17.9 Z" fill="#9aa2ab" />
            {/* poing gauche refermé sur le faisceau et sur la poignée du peltê */}
            <circle cx={-2.2} cy={-6.8} r={0.85} fill={PEAU_OMBRE} />
          </g>
        )}

        {/* bouclier (à gauche) - bombé : arcs concentriques décalés vers la lumière NW */}
        {arme === 'lance' && (
          <g>
            <circle cx={-4} cy={-8} r={3.5} fill="#4f3d22" />
            {/* liseré de rive accroché par le soleil au NW */}
            <path d="M-6.85,-9.4 A3.5,3.5 0 0 1 -5.15,-11.05" stroke="#c8a869" strokeWidth={0.7} fill="none" strokeLinecap="round" />
            <circle cx={-4} cy={-8} r={3} fill="#7c5f38" />
            {/* ombre du champ contre la rive, côté SE - creuse le bombé */}
            <path d="M-1.3,-6.9 A3,3 0 0 1 -3.2,-5.15" stroke="#3f301a" strokeWidth={0.75} fill="none" strokeLinecap="round" opacity={0.55} />
            <circle cx={-4.5} cy={-8.5} r={2.2} fill="#97744a" />
            <circle cx={-5} cy={-9} r={1.3} fill="#b3905f" />
            {/* umbo de bronze, éclat décalé vers la lumière */}
            <circle cx={-4} cy={-8} r={1.05} fill="#4f3d22" />
            <circle cx={-4.2} cy={-8.2} r={0.8} fill="#cbbd91" />
          </g>
        )}
        {arme === 'bouclier-lourd' && (
          <g>
            {/*
             * L'aspis : un mètre de bois cerclé de bronze, qui couvre l'homme du
             * menton au genou. C'est à cette MASSE qu'on reconnaît l'hoplite d'un
             * bout à l'autre du champ - il ne se lit pas comme un homme portant un
             * bouclier, il se lit comme un bloc qui avance.
             */}
            <circle cx={-3.9} cy={-8.2} r={5} fill="#6e5526" />
            <path d="M-8.88,-8.64 A5,5 0 0 1 -6.4,-12.53" stroke="#dcc36a" strokeWidth={0.85} fill="none" strokeLinecap="round" />
            <circle cx={-3.9} cy={-8.2} r={4.25} fill={drapOmbre(tunique)} />
            {/* ombre du champ contre la rive, côté SE */}
            <path d="M-0.05,-6.4 A4.25,4.25 0 0 1 -3.16,-4.01" stroke="#241408" strokeWidth={0.8} fill="none" strokeLinecap="round" opacity={0.4} />
            <circle cx={-4.6} cy={-8.9} r={3.4} fill={tunique} />
            <circle cx={-5.25} cy={-9.55} r={2.25} fill={drapLit(tunique)} />
            <circle cx={-3.9} cy={-8.2} r={1.4} fill="#8a6b2e" />
            <circle cx={-4.2} cy={-8.5} r={0.9} fill="#ecd88f" />
          </g>
        )}

        {/*
          ── LE PELTÊ ────────────────────────────────────────────────────────
          Un croissant de lune en osier tendu de peau, échancré jusqu'au moyeu.
          Aucun autre bouclier du jeu n'a de trou dans sa silhouette : c'est la
          signature du peltaste, lisible avant sa tunique et avant ses jambes.
        */}
        {arme === 'javelots' && (
          <g>
            {/*
             * Le bouclier est porté DÉBORDANT du corps, et son champ est en osier
             * clair : l'échancrure taillée dans le disque ne se lisait pas quand le
             * trou laissait voir une tunique de la même teinte. Contre le ciel, la
             * lune se voit. C'est le seul bouclier troué du jeu.
             */}
            <path d={PELTE} fill="#5a4223" />
            {/* rive accrochée par le soleil au NW */}
            <path d="M-8.7,-8.8 A3.5,3.5 0 0 1 -7.88,-11.05" stroke="#e2c48a" strokeWidth={0.6} fill="none" strokeLinecap="round" />
            {/* champ d'osier tressé, tendu de peau écrue */}
            <g transform="translate(-5.5,-9.1) scale(0.82) translate(5.2,8.8)">
              <path d={PELTE} fill="#c2a367" />
            </g>
            {/* le signe peint aux couleurs du camp, au creux du croissant */}
            <g transform="translate(-5.8,-9.4) scale(0.5) translate(5.2,8.8)">
              <path d={PELTE} fill={tunique} />
            </g>
            {/* claies d'osier, en travers du champ plein */}
            <path d="M-7.6,-7.6 L-2.7,-7.6 M-7,-6.4 L-3.4,-6.4" stroke="#8a6a3e" strokeWidth={0.35} opacity={0.6} />
            {/* ombre du champ contre la rive, côté SE - creuse le bombé */}
            <path d="M-2.03,-7.32 A3.5,3.5 0 0 1 -4.59,-5.35" stroke="#241408" strokeWidth={0.6} fill="none" strokeLinecap="round" opacity={0.4} />
            {/* les deux cornes du croissant : la pointe ouest au soleil, l'est éteinte */}
            <circle cx={-7.7} cy={-11.05} r={0.42} fill="#e2c48a" opacity={0.85} />
            <circle cx={-2.7} cy={-11.05} r={0.42} fill="#7a5c34" opacity={0.85} />
          </g>
        )}

        {/* javelot de la main droite - armé au-dessus de l'épaule, il PART au coup */}
        {arme === 'javelots' && (
          <g>
            {(combat || tir) && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 1.7 -10.1;-25 1.7 -10.1;36 1.7 -10.1;0 1.7 -10.1;0 1.7 -10.1"
                keyTimes="0;0.09;0.17;0.34;1"
                dur={durS}
                begin={decal}
                repeatCount="indefinite"
              />
            )}
            <line x1={1.7} y1={-10.1} x2={4.4} y2={-16.5} stroke={PEAU} strokeWidth={1.25} strokeLinecap="round" />
            {/* hampe : dessous dans l'ombre, dessus au soleil ; lanière de jet au poing */}
            <line x1={-1.4} y1={-18.5} x2={9.8} y2={-15.1} stroke="#6b4c2a" strokeWidth={1.05} />
            <line x1={0.8} y1={-18.05} x2={9.6} y2={-15.4} stroke="#a8845d" strokeWidth={0.6} />
            <path d="M4.2,-17.1 L5.1,-15.6" stroke="#4f3f28" strokeWidth={0.55} />
            <circle cx={4.45} cy={-16.6} r={0.8} fill={PEAU} />
            {/* fer à deux facettes : éclat NW, revers éteint */}
            <path d="M9.8,-15.1 L12.8,-14.7 L9.9,-14.2 Z" fill="#e4eaef" />
            <path d="M9.8,-15.1 L12.8,-14.7 L10,-15.4 Z" fill="#87909a" />
          </g>
        )}
      </g>
    </g>
  )
}

/** la machine de siège - elle n'est pas un homme : elle n'a ni tunique ni casque */
/**
 * Le char de guerre : deux chevaux, une caisse à roue haute, un cocher penché sur
 * les rênes et le combattant debout derrière lui.
 *
 * Ce n'est pas un fantassin agrandi : sa silhouette est HORIZONTALE là où toutes
 * les autres sont verticales, et c'est ce qui le rend reconnaissable au premier
 * coup d'œil dans une mêlée, même à quatorze pixels de haut.
 */
export function Char({ enMarche }: { enMarche?: boolean }) {
  return (
    <g>
      <OmbreSol rx={14} ry={3} />
      {/* les deux chevaux, le second décalé pour qu'on lise l'attelage */}
      {[
        { dx: 9, dy: -1, c: '#8a6a44', cc: '#6f5334' },
        { dx: 12.5, dy: -3.4, c: '#7a5c3a', cc: '#5f462a' },
      ].map((h, i) => (
        <g key={i} transform={`translate(${h.dx},${h.dy})`}>
          <ellipse cx={0} cy={-7} rx={6.2} ry={3.4} fill={h.c} />
          <path d={`M-5.4,-4 L-4.6,0 M-1,-4 L-0.4,0 M3,-4.2 L3.6,-0.2 M5.6,-4 L6.2,0`} stroke={h.cc} strokeWidth={1.3}>
            {enMarche && (
              <animateTransform attributeName="transform" type="rotate" values="12 0 -5;-12 0 -5;12 0 -5" dur="0.42s" begin={`${i * 0.13}s`} repeatCount="indefinite" />
            )}
          </path>
          {/* encolure, tête et crinière */}
          <path d="M4.4,-8.6 L7.6,-12.4 L9.6,-11.6 L6.4,-7.6 Z" fill={h.c} />
          <ellipse cx={9.4} cy={-12.6} rx={2.5} ry={1.7} fill={h.cc} />
          <path d="M5.2,-9.6 L7.4,-12.6" stroke="#4a3620" strokeWidth={1.5} />
          <path d="M-6,-8 L-8.4,-5.6" stroke={h.cc} strokeWidth={1.6} />
        </g>
      ))}
      {/* timon et joug */}
      <path d="M2,-6 L8.6,-8.6" stroke="#6b4c2a" strokeWidth={1.4} />
      {/* caisse du char : flanc éclairé à l'ouest, garde-corps cintré */}
      <path d="M-7,-4 L-7,-11 Q-7,-13 -4.6,-13 L1.6,-13 Q3,-13 3,-11 L3,-4 Z" fill="#9a7b4c" />
      <path d="M-7,-11 Q-7,-13 -4.6,-13 L-3.4,-13 L-3.4,-4 L-7,-4 Z" fill="#b39262" />
      <path d="M-7,-11.4 Q-2,-13.6 3,-11.4" stroke="#c9a441" strokeWidth={1.2} fill="none" />
      {/* la roue, haute et à rayons */}
      <g transform="translate(-3.4,-4)">
        <circle r={4.4} fill="none" stroke="#6b4c2a" strokeWidth={1.5} />
        <g stroke="#8a6a44" strokeWidth={0.9}>
          <path d="M-4.4,0 L4.4,0 M0,-4.4 L0,4.4 M-3.1,-3.1 L3.1,3.1 M-3.1,3.1 L3.1,-3.1" />
          {enMarche && <animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur="0.8s" repeatCount="indefinite" />}
        </g>
      </g>
      {/* cocher penché sur les rênes, puis le combattant debout */}
      <g transform="translate(0,-13)">
        <path d="M-1.6,0 L-1,-5.4 L1.6,-5.4 L2.2,0 Z" fill="#c9a06c" />
        <circle cx={0.6} cy={-7} r={1.9} fill="#d9a97c" />
        <path d="M2,-4.6 L6.4,-7.4" stroke="#5d4a33" strokeWidth={0.8} />
      </g>
      <g transform="translate(-4.6,-13)">
        <path d="M-1.8,0 L-1.2,-6.4 L1.8,-6.4 L2.4,0 Z" fill="#3e5a7a" />
        <circle cx={0.4} cy={-8.4} r={2.1} fill="#d9a97c" />
        <path d="M-1.7,-8.9 A2.1,2.1 0 0 1 2.5,-8.9" fill="#8a7845" />
        {/* la lance dressée : c'est elle qui signale l'attelage de loin */}
        <path d="M2,-6 L4.4,-19" stroke="#7a5a35" strokeWidth={1.1} />
        <path d="M4.4,-19 l0.8,-2.6 l1.2,2.3 Z" fill="#c9a441" />
      </g>
    </g>
  )
}

export function Belier({ enMarche }: { enMarche?: boolean }) {
  return (
    <g>
      <OmbreSol rx={16} ry={3.2} />
      {/* charpente : chevrons deux tons, arête ouest au soleil, ligatures de corde */}
      <line x1={-12} y1={0} x2={-9} y2={-14} stroke="#6b4c2a" strokeWidth={2.6} />
      <line x1={-12.5} y1={0} x2={-9.5} y2={-14} stroke="#a8845d" strokeWidth={0.9} />
      <line x1={12} y1={0} x2={9} y2={-14} stroke="#5f462d" strokeWidth={2.6} />
      <line x1={11.4} y1={0} x2={8.5} y2={-13.6} stroke="#83694a" strokeWidth={0.9} />
      <line x1={-9.9} y1={-12.2} x2={-8.5} y2={-12.6} stroke="#4f3a22" strokeWidth={1} />
      <line x1={9.9} y1={-12.2} x2={8.5} y2={-12.6} stroke="#4f3a22" strokeWidth={1} />
      {/* toit de peaux cousues : pan ouest éclairé, pan est ombré, ourlet qui pend */}
      <path d="M-13,-13 Q-10.8,-11.5 -8.6,-13 Q-6.4,-11.5 -4.2,-13 Q-2,-11.5 0.2,-13 Q2.4,-11.5 4.6,-13 Q6.8,-11.5 9,-13 Q11,-11.5 13,-13 L13,-13.4 L-13,-13.4 Z" fill="#77593a" />
      <path d="M-13,-13.2 L0,-18 L1,-13.2 Z" fill="#a9895f" />
      <path d="M1,-13.2 L0,-18 L13,-13.2 Z" fill="#77593a" />
      {/* pièces de peau dépareillées, rapiécées sur chaque pan */}
      <path d="M-9.6,-14.2 L-5.8,-15.7 L-4.9,-13.9 L-8.6,-13.5 Z" fill="#b4956b" opacity={0.85} />
      <path d="M-3.2,-16.4 L-1.2,-17 L-0.6,-14.6 L-2.4,-14.3 Z" fill="#9d7d53" opacity={0.9} />
      <path d="M3.4,-16 L6.2,-15.2 L6.8,-13.6 L4.2,-13.7 Z" fill="#6b4e32" opacity={0.9} />
      {/* coutures des peaux : surjets clairs côté soleil, sombres côté ombre */}
      <path d="M-8.3,-14.9 L-7,-13.3 M-3.6,-16.6 L-2.2,-13.4" stroke="#8a6a45" strokeWidth={0.8} opacity={0.8} />
      <path d="M4.4,-16.3 L5.6,-13.4 M8.6,-14.7 L9.4,-13.4" stroke="#5d4230" strokeWidth={0.8} opacity={0.8} />
      {/* arête faîtière frappée par le soleil, revers éteint */}
      <path d="M-13,-13.2 L0,-18" stroke="#c9a97a" strokeWidth={0.9} />
      <path d="M0,-18 L13,-13.2" stroke="#5d4230" strokeWidth={0.7} opacity={0.8} />
      {/* tronc suspendu - au repos pendant la marche, en plein élan au siège */}
      <g>
        {!enMarche && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0;3,0;-7,0;0,0"
            keyTimes="0;0.35;0.55;1"
            dur="1.7s"
            repeatCount="indefinite"
          />
        )}
        {/* suspentes de corde, accrochées sous l'auvent */}
        <line x1={-7} y1={-13.6} x2={-7} y2={-9.6} stroke="#5d4a33" strokeWidth={0.8} />
        <line x1={7} y1={-13.6} x2={7} y2={-9.6} stroke="#5d4a33" strokeWidth={0.8} />
        {/* fût : dessus au soleil, fibre du bois, cul du tronc en bois de bout */}
        <rect x={-15} y={-10} width={30} height={5} rx={2.5} fill="#7c5a30" />
        <rect x={-14.2} y={-9.7} width={28} height={1.7} rx={0.85} fill="#a8845d" />
        <path d="M-11,-6.4 L6,-6.4 M-6,-7.9 L10,-7.9" stroke="#5f462d" strokeWidth={0.8} opacity={0.7} />
        {/* ligatures de corde qui arriment le fût aux suspentes */}
        <path d="M-7.8,-10 L-7.4,-5.2 M-6.9,-10 L-6.5,-5.2" stroke="#5d4a33" strokeWidth={0.7} opacity={0.9} />
        <path d="M6.2,-10 L6.6,-5.2 M7.1,-10 L7.5,-5.2" stroke="#4f3e2a" strokeWidth={0.7} opacity={0.9} />
        <ellipse cx={14.6} cy={-7.5} rx={1.2} ry={2.3} fill="#5f462d" />
        <ellipse cx={14.5} cy={-7.9} rx={0.7} ry={1.2} fill="#8a6a45" />
        {/* tête de bélier en bronze : masque, corne enroulée, mufle projeté vers le mur */}
        <circle cx={-15.6} cy={-7.5} r={2.9} fill="#8a6b2e" />
        <path d="M-17.4,-9.7 A2.9,2.9 0 0 0 -18.5,-7.6 L-15.6,-7.5 Z" fill="#b08c35" />
        <path d="M-18.2,-8.3 L-20.6,-6.6 L-17.6,-5.3 Z" fill="#7a5c24" />
        <path d="M-18.2,-8.3 L-20.6,-6.6 L-18.9,-7.5 Z" fill="#c9a441" />
        {/* œil rivé et arcade éclairée du masque */}
        <circle cx={-16.7} cy={-7.9} r={0.45} fill="#3d3010" />
        <path d="M-17.5,-8.6 Q-16.9,-9 -16.2,-8.75" stroke="#c9a441" strokeWidth={0.45} fill="none" opacity={0.9} />
        <circle cx={-14.7} cy={-9.3} r={1.5} fill="#8a6b2e" />
        <circle cx={-14.7} cy={-9.3} r={1.5} fill="none" stroke="#c9a441" strokeWidth={0.9} />
        <circle cx={-14.7} cy={-9.3} r={0.8} fill="#5c471c" />
      </g>
      {/* porteurs sous la carapace */}
      {[-8, 0, 8].map((x) => (
        <g key={x}>
          {enMarche && (
            <animateTransform attributeName="transform" type="rotate" values={`10 ${x} 0;-10 ${x} 0;10 ${x} 0`} dur="0.7s" begin={`${x * 0.03}s`} repeatCount="indefinite" />
          )}
          <path d={`M${x - 1.4},0 L${x - 1},-3.4 L${x + 1},-3.4 L${x + 1.4},0 Z`} fill="#7d3b32" />
          <path d={`M${x - 1.4},0 L${x - 1},-3.4 L${x},-3.4 L${x - 0.2},0 Z`} fill="#9d5847" />
          <circle cx={x} cy={-4.3} r={1.15} fill={PEAU} />
        </g>
      ))}
    </g>
  )
}

export interface Look {
  tunique: string
  arme: Arme
  taille: number
  crete?: boolean
  /**
   * Silhouette propre à la figurine, quand `Bonhomme` ne suffit pas : les héros
   * ne sont pas des hoplites recolorés, chacun a la sienne (voir
   * SilhouettesHeros.tsx).
   */
  silhouette?: (p: { anim: Anim; seed: number; dur: number }) => React.ReactNode
}

/**
 * Un héros ne ressemble pas à un hoplite de plus. La couleur de maison et le nom
 * au-dessus de la tête ne suffisaient pas : les huit se ressemblaient tous. Chacun
 * porte désormais l'attribut par lequel sa légende le désigne - pilos et grand arc
 * pour Ulysse, bouclier de sept peaux pour Ajax, triple cimier pour Achille, son
 * père sur les épaules pour Énée - taillé pour rester lisible à 14 px de haut.
 * La tunique et l'arme restent renseignées : elles servent encore de repli
 * (dépouilles) et gardent la couleur de maison comme dominante.
 */
function lookHeros(h: HeroId): Look {
  const def = HEROS[h]
  const arme: Look['arme'] =
    h === 'hector' || h === 'ajax' || h === 'agamemnon' ? 'bouclier-lourd' : h === 'cassandre' ? 'dague' : 'lance'
  return {
    tunique: def.couleur,
    arme,
    taille: h === 'cassandre' ? 1.15 : 1.32,
    crete: h !== 'cassandre',
    silhouette: ({ anim, seed, dur }) => <SilhouetteHeros h={h} anim={anim} seed={seed} dur={dur} />,
  }
}

/** allure par type - la couleur de tunique dépend du camp du joueur */
/*
 * Les couleurs des renforts alliés. Ils portaient les vôtres - l'aide d'un allié
 * ne se lisait donc que dans le rapport d'après-bataille. Ils passent au vert
 * olive : franchement distinct du bleu du joueur comme du rouge de l'assaillant,
 * et cohérent avec le 🤝 des alliances.
 */
const TUNIQUE_ALLIEE: Record<'lancier' | 'archer' | 'hoplite', string> = {
  lancier: '#4d6b3a',
  archer: '#5c7245',
  hoplite: '#415c32',
}

function lookDe(f: Fighter, estJoueur: boolean): Look | 'belier' | 'char' {
  if (f.heros) return lookHeros(f.heros)
  return lookCombattant(f.type, estJoueur, f.allie)
}

/**
 * L'allure d'un type de combattant. Sortie de `lookDe` pour être réemployée hors
 * bataille - garnison au repos, vignettes de la caserne : l'icône d'un panneau
 * doit montrer EXACTEMENT l'homme qu'on verra courir, sinon elle n'apprend rien.
 */
export function lookCombattant(type: Fighter['type'], estJoueur: boolean, allie?: boolean): Look | 'belier' | 'char' {
  switch (type) {
    case 'belier':
      return 'belier'
    case 'pillard':
      return { tunique: '#7d5a44', arme: 'dague', taille: 0.95 }
    case 'guerrier':
      return { tunique: '#7d3b32', arme: 'lance', taille: 1.05 }
    case 'mercenaire':
      return { tunique: '#5a3140', arme: 'bouclier-lourd', taille: 1.2, crete: true }
    case 'lancier':
      return { tunique: allie ? TUNIQUE_ALLIEE.lancier : estJoueur ? '#3e5a7a' : '#8a4636', arme: 'lance', taille: 1 }
    case 'archer':
      return { tunique: allie ? TUNIQUE_ALLIEE.archer : estJoueur ? '#4a6a5a' : '#7d5a44', arme: 'arc', taille: 0.95 }
    case 'hoplite':
      return {
        tunique: allie ? TUNIQUE_ALLIEE.hoplite : estJoueur ? '#31506e' : '#6e3348',
        arme: 'bouclier-lourd',
        // l'élite est la plus grosse masse du champ : grand aspis, cimier, cnémides
        taille: 1.22,
        crete: true,
      }
    /*
     * Les trois recrues. Elles portaient la silhouette d'une autre, repeinte : le
     * frondeur tendait un arc, le peltaste levait une lance, et personne ne voyait
     * ce qu'il avait payé. Chacune a maintenant sa forme et rien qu'à elle -
     * la fronde qui tourne, le croissant du peltê, la machine.
     */
    case 'frondeur':
      // le plus petit, le plus léger : pas un gramme de bronze sur lui
      return { tunique: allie ? '#6b7f4a' : estJoueur ? '#7a7a54' : '#8a7550', arme: 'fronde', taille: 0.84 }
    case 'peltaste':
      // svelte et versé en avant - il court là où l'hoplite avance
      return { tunique: allie ? '#4d6b3a' : estJoueur ? '#8a6a2f' : '#8a5636', arme: 'javelots', taille: 1 }
    /*
     * Le char n'est pas un homme mais un attelage : il emprunte donc la voie de
     * la machine, comme le bélier, plutôt qu'une silhouette de fantassin qu'on
     * confondrait avec la milice.
     */
    case 'char':
      return 'char'
  }
}

/**
 * L'allure d'une unité du joueur, hors bataille. Les panneaux s'en servent pour
 * afficher la même figurine que la carte, à la même échelle relative.
 */
export function lookUnite(type: UnitId): Look | 'belier' | 'char' {
  return lookCombattant(type, true)
}

/** durée de dissolution d'une dépouille (ms) */
export const DUREE_DEPOUILLE = 5200

/** dépouille : la figurine bascule au sol, puis s'efface doucement */
function Depouille({ f, campJoueur, now }: { f: Fighter; campJoueur: 'attaque' | 'defense'; now: number }) {
  const t = (now - (f.mortAt ?? now)) / DUREE_DEPOUILLE
  const look = lookDe(f, f.camp === campJoueur)
  const contenu = look === 'belier' ? <Belier /> : look === 'char' ? <Char /> : <Bonhomme {...look} />
  const sens = f.camp === 'attaque' ? 82 : -82
  return (
    <g transform={`translate(${f.x},${f.y})`} opacity={Math.max(0, 0.75 * (1 - t))}>
      <g transform={`rotate(${sens})`}>
        {/* la chute : jouée une fois au montage, figée ensuite */}
        <AnimT
          attributeName="transform"
          type="rotate"
          values={`0;${sens}`}
          keyTimes="0;1"
          calcMode="spline"
          keySplines="0.55 0 0.9 0.6"
          dur="0.45s"
          fill="freeze"
        />
        {contenu}
      </g>
    </g>
  )
}

function FigurineCombattant({
  f,
  campJoueur,
  auContact,
}: {
  f: Fighter
  campJoueur: 'attaque' | 'defense'
  auContact: boolean
}) {
  const estJoueur = f.camp === campJoueur
  const look = lookDe(f, estJoueur)
  const dx = f.tx - f.x
  const dy = f.ty - f.y
  const bouge = Math.hypot(dx, dy) > 6

  // face à sa route, ou à défaut face au camp adverse
  const versLaGauche = Math.abs(dx) > 1 ? dx < 0 : f.camp === 'attaque'

  let anim: Anim = 'idle'
  if (f.etat === 'marche' || f.etat === 'fuite') anim = 'marche'
  // tout ce qui tire du rempart joue son cycle de tir : l'arc se bande, la fronde
  // prend son élan. Le frondeur n'avait droit qu'à la pose de l'archer.
  else if ((f.type === 'archer' || f.type === 'frondeur') && f.camp === 'defense') anim = bouge ? 'marche' : 'tir'
  else if (f.etat === 'siege') anim = 'combat' // on frappe la muraille
  else if (bouge) anim = 'marche'
  else if (auContact) anim = 'combat'

  // cadences réelles : mêlée 2,1 s ; tir 2,6 s ; sape des murs 1,7 s
  const dur = anim === 'tir' ? 2.6 : f.etat === 'siege' ? 1.7 : 2.1

  const contenu =
    look === 'belier' ? (
      <Belier enMarche={f.etat === 'marche'} />
    ) : look === 'char' ? (
      <Char enMarche={f.etat === 'marche'} />
    ) : look.silhouette ? (
      look.silhouette({ anim, seed: f.seed, dur })
    ) : (
      <Bonhomme {...look} anim={anim} seed={f.seed} dur={dur} />
    )
  const blesse = f.hp < f.maxHp && f.hp > 0

  return (
    <g style={{ transform: `translate(${f.x}px,${f.y}px)`, transition: 'transform 0.3s linear' }}>
      {/* un héros se distingue avant même qu'on lise son nom : cercle à ses
          couleurs sous ses pieds, et son nom gravé au-dessus de la mêlée.
          Un héros ENNEMI porte les mêmes couleurs de maison - c'est le même
          homme - mais son cercle bat en rouge sang et son nom est souligné d'une
          barre : on ne doit pas confondre une seconde Achille chez soi et
          Achille à sa porte. */}
      {f.heros && (
        <g pointerEvents="none">
          <ellipse cx={0} cy={1} rx={13} ry={4.6} fill={HEROS[f.heros].couleur} opacity={0.28} />
          <ellipse
            cx={0}
            cy={1}
            rx={13}
            ry={4.6}
            fill="none"
            stroke={estJoueur ? HEROS[f.heros].couleur : '#e0715a'}
            strokeWidth={estJoueur ? 1.2 : 1.8}
            opacity={0.85}
          >
            {!estJoueur && (
              <animate attributeName="opacity" values="0.45;1;0.45" dur="1.8s" repeatCount="indefinite" />
            )}
          </ellipse>
          <text
            x={0}
            y={-33}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill={estJoueur ? '#f4ecd8' : '#ffd9cf'}
            stroke="#0d1722"
            strokeWidth={2.4}
            style={{ paintOrder: 'stroke' }}
          >
            {estJoueur ? HEROS[f.heros].nom : `⚔ ${HEROS[f.heros].nom}`}
          </text>
        </g>
      )}
      {/* celui qui rompt jette son bouclier : on doit voir la ligne s'effriter,
          pas seulement la voir raccourcir */}
      {f.etat === 'fuite' && !f.heros && (
        <g pointerEvents="none" opacity={0.9}>
          <path d="M4,-16 L4,-25" stroke="#6b5a3c" strokeWidth={0.9} />
          <path d="M4.4,-24.6 L11,-23 L4.4,-21.4 Z" fill="#e8e2d0" />
        </g>
      )}
      {/* le fanion d'un allié : petit, planté derrière l'épaule, aux couleurs de
          sa cité. Assez pour compter les venus d'ailleurs sans lire un rapport */}
      {f.allie && !f.heros && (
        <g pointerEvents="none">
          <path d="M6.4,-15 L6.4,-24.5" stroke="#4a3a22" strokeWidth={0.9} />
          <path d="M6.8,-24.2 L12.4,-22.4 L6.8,-20.6 Z" fill="#6f9a52" />
          <path d="M6.8,-24.2 L12.4,-22.4 L9.6,-21.5 Z" fill="#86b565" />
        </g>
      )}
      <g transform={versLaGauche ? 'scale(-1,1)' : undefined}>{contenu}</g>
      {blesse && (
        <g transform="translate(0,-22)">
          <rect x={-7} y={0} width={14} height={2.4} rx={1.2} fill="#2b2b2b" opacity={0.7} />
          <rect
            x={-7}
            y={0}
            width={Math.max(1, 14 * (f.hp / f.maxHp))}
            height={2.4}
            rx={1.2}
            fill={estJoueur ? '#3f9d63' : '#c0563f'}
          />
        </g>
      )}
    </g>
  )
}

// ── Lecture du siège : une jauge par secteur ─────────────────────────────────

/** vert tant que le pan tient, orange quand il souffre, rouge quand il va céder */
function tonStructure(ratio: number): string {
  return ratio > 0.55 ? '#8f9d5a' : ratio > 0.28 ? '#d98a4e' : '#c0563f'
}

/*
 * Il y avait ici un liseré doré tracé au pied du pan le plus menacé. Retiré : un
 * trait épais en travers de la mêlée salissait la vue là où justement il faut
 * regarder, et la jauge du secteur dit déjà lequel souffre - en toutes lettres.
 */

/**
 * Jauge de structure d'un secteur, posée à l'aplomb de son pan de mur et
 * repoussée vers l'extérieur de l'enceinte pour ne pas masquer la mêlée.
 */
function JaugeSecteur({ s, chaud }: { s: SecteurBataille; chaud: boolean }) {
  const ratio = s.max > 0 ? Math.max(0, Math.min(1, s.hp / s.max)) : 0
  const dx = Math.cos(s.angle)
  const dy = Math.sin(s.angle)
  const x = s.x + dx * 30
  // la jauge se pose toujours du côté INTÉRIEUR de son pan : le cadre serré de
  // la bataille garde l'enceinte au centre, pas ses dehors
  const y = s.y + (dy < -0.4 ? 62 : dy > 0.4 ? -62 : -56)
  const w = 82
  return (
    <g transform={`translate(${x},${y})`} pointerEvents="none">
      <rect
        x={-w / 2}
        y={-16}
        width={w}
        height={34}
        rx={8}
        fill="#0d1722"
        opacity={chaud ? 0.88 : 0.72}
        stroke="#e0bc5c"
        strokeOpacity={chaud ? 0.8 : 0.26}
        strokeWidth={chaud ? 1.4 : 0.9}
      />
      <text x={0} y={-5} textAnchor="middle" fontSize={9.6} fill="#f0e8d8" fontWeight={700}>
        {s.nom}
      </text>
      <rect x={-w / 2 + 8} y={0} width={w - 16} height={6.6} rx={3.3} fill="#000" opacity={0.55} />
      <rect
        x={-w / 2 + 8}
        y={0}
        width={Math.max(1.5, (w - 16) * ratio)}
        height={6.6}
        rx={3.3}
        fill={tonStructure(ratio)}
      />
      {/* l'émoji explosion qui clignotait à gauche de la jauge est parti : les
          moellons à terre se voient sur le mur lui-même, le mot suffit ici */}
      <text x={0} y={14.8} textAnchor="middle" fontSize={8.8} fill={s.breche ? '#e8916f' : '#cfc4a8'} fontWeight={600}>
        {s.breche ? 'pan effondré' : `🧱 ${Math.round(Math.max(0, s.hp))} / ${Math.round(s.max)}`}
      </text>
    </g>
  )
}

// ── Couche bataille ──────────────────────────────────────────────────────────
export function BatailleLayer({
  battle,
  now,
  wallHp,
  wallMax,
}: {
  battle: BattleState
  now: number
  wallHp: number
  wallMax: number
}) {
  const vivants = battle.fighters.filter((f) => f.etat !== 'mort')
  const tries = [...vivants].sort((a, b) => a.y - b.y)
  const depouilles = battle.fighters.filter(
    (f) => f.etat === 'mort' && f.hp <= 0 && f.mortAt !== undefined && now - f.mortAt < DUREE_DEPOUILLE,
  )
  const porte = battle.geo.porte

  // « au contact » : un adversaire vivant à portée de coup - déclenche le geste d'attaque
  const contact = (f: Fighter): boolean =>
    vivants.some(
      (o) => o.camp !== f.camp && o.etat !== 'fuite' && Math.hypot(o.x - f.x, o.y - f.y) < 26,
    )

  // pan le plus menacé : sa jauge se met en avant (cadre doré, fond plus dense)
  const idxChaud = indexSecteurChaud(battle, assaillantsParSecteur(battle, vivants))

  return (
    <g>
      {depouilles.map((f) => (
        <Depouille key={f.id} f={f} campJoueur={battle.campJoueur} now={now} />
      ))}
      {tries.map((f) => (
        <FigurineCombattant key={f.id} f={f} campJoueur={battle.campJoueur} auContact={contact(f)} />
      ))}

      {/* flèches - tirées en cloche, la pointe suit la trajectoire */}
      {battle.projectiles.map((p) => {
        const d = Math.hypot(p.x1 - p.x0, p.y1 - p.y0)
        const mx = (p.x0 + p.x1) / 2
        const my = (p.y0 + p.y1) / 2 - Math.min(46, 14 + d * 0.16)
        return (
          <g key={p.id}>
            <g>
              <AnimM dur={`${p.dur}ms`} path={`M${p.x0},${p.y0} Q${mx},${my} ${p.x1},${p.y1}`} fill="freeze" rotate="auto" />
              <line x1={-4.5} y1={0} x2={4} y2={0} stroke="#5d4a33" strokeWidth={1.3} />
              <path d="M4.5,0 l-2.2,-1.3 l0,2.6 Z" fill="#9aa0a8" />
              <path d="M-4.5,0 l-1.8,-1.5 M-4.5,0 l-1.8,1.5 M-3.2,0 l-1.8,-1.5 M-3.2,0 l-1.8,1.5" stroke="#e0d9c8" strokeWidth={0.7} />
            </g>
          </g>
        )
      })}

      {/* effets divins et brèches */}
      {battle.effects.map((e) => {
        if (e.type === 'divin') return <EffetDivin key={e.id} e={e} now={now} />
        if (e.type === 'heros') return <EffetHeros key={e.id} e={e} now={now} />
        if (e.type === 'foudre') {
          return (
            <g key={e.id} opacity={Math.max(0, (e.until - now) / 900)}>
              <path
                d={`M${e.x + 4},${e.y - 120} L${e.x - 5},${e.y - 62} L${e.x + 3},${e.y - 58} L${e.x - 2},${e.y}`}
                stroke="#f5d06c"
                strokeWidth={3}
                fill="none"
              />
              <circle cx={e.x} cy={e.y} r={9} fill="#f5d06c" opacity={0.5} />
            </g>
          )
        }
        if (e.type === 'benediction') {
          return (
            <circle key={e.id} cx={e.x} cy={e.y} r={20} fill="none" stroke="#4fa3a5" strokeWidth={3} opacity={Math.max(0, (e.until - now) / 2000)}>
              <Anim attributeName="r" values="8;42" dur="2s" fill="freeze" />
            </circle>
          )
        }
        if (e.type === 'impact') {
          const t = Math.max(0, (e.until - now) / 320)
          return (
            <g key={e.id} transform={`translate(${e.x},${e.y})`} opacity={t}>
              <g transform={`scale(${1.5 - t * 0.6})`}>
                <path d="M0,-4.5 L1.1,-1.1 L4.5,0 L1.1,1.1 L0,4.5 L-1.1,1.1 L-4.5,0 L-1.1,-1.1 Z" fill="#ffe9a8" stroke="#e8913c" strokeWidth={0.6} />
              </g>
              <circle r={5.5 * (1.6 - t * 0.6)} fill="none" stroke="#ffe9a8" strokeWidth={0.8} opacity={t * 0.5} />
            </g>
          )
        }
        if (e.type === 'poussiere') {
          const t = Math.max(0, (e.until - now) / 700)
          return (
            <g key={e.id} opacity={t * 0.7} fill="#c9bfa4">
              <circle cx={e.x - 3} cy={e.y} r={4 + (1 - t) * 6} />
              <circle cx={e.x + 4} cy={e.y - 3} r={3 + (1 - t) * 5} opacity={0.8} />
              <circle cx={e.x + 1} cy={e.y - 7} r={2 + (1 - t) * 4} opacity={0.6} />
            </g>
          )
        }
        // brèche : le nuage de plâtre monte et se dilate en trois volutes
        return (
          <g key={e.id} opacity={Math.max(0, (e.until - now) / 4000)}>
            <g>
              <AnimT attributeName="transform" type="translate" values="0,0;0,-9" dur="4s" fill="freeze" />
              <circle cx={e.x - 9} cy={e.y - 4} r={8} fill="#c7bda4" opacity={0.55}>
                <Anim attributeName="r" values="6;16" dur="2.5s" fill="freeze" />
              </circle>
              <circle cx={e.x + 7} cy={e.y - 9} r={6} fill="#b5ab93" opacity={0.5}>
                <Anim attributeName="r" values="5;13" dur="2.5s" fill="freeze" />
              </circle>
              <circle cx={e.x - 1} cy={e.y - 15} r={4} fill="#d8d0b8" opacity={0.4}>
                <Anim attributeName="r" values="3;11" dur="2.8s" fill="freeze" />
              </circle>
            </g>
          </g>
        )
      })}

      {/* structure des remparts : une jauge par pan assailli, à son propre aplomb */}
      {battle.secteurs.some((s) => s.max > 0)
        ? battle.secteurs.map((s, i) => (
            <JaugeSecteur key={`${s.nom}-${i}`} s={s} chaud={i === idxChaud} />
          ))
        : wallMax > 0 && (
            // secours : bataille sans secteur déclaré (vieille sauvegarde en cours)
            <g transform={`translate(${porte.x - 30},${porte.y - 60})`}>
              <rect x={0} y={0} width={60} height={7} rx={3.5} fill="#1d1d1d" opacity={0.75} />
              <rect x={1} y={1} width={Math.max(2, 58 * (wallHp / wallMax))} height={5} rx={2.5} fill={tonStructure(wallHp / wallMax)} />
              <text x={30} y={-4} textAnchor="middle" fontSize={10} fill="#f0e8d8" fontWeight={700} style={{ paintOrder: 'stroke' }} stroke="#00000088" strokeWidth={2}>
                🧱 {Math.ceil(wallHp)}
              </text>
            </g>
          )}
    </g>
  )
}

