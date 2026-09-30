import { Agora as AgoraOrigine } from './Agora'
import { Hermes as HermesPilier, Lumiere, PierreAssemblee } from './finition'
import { Arbre, Aire, Boite, Cypres, DefsIso, Flamme, MATS, OmbreSE, P, Volute, seg } from './iso'
import { Amphores, Baie, Batisse, Buisson, Caisse, Charrette, Etal, Fontaine, Oriflamme, Portique, Sacs, Sol, Tonneau, Velum } from './kit'

/*
 * ═══════════════════════════ L'AGORA (v2) ═══════════════════════════
 * Le cœur du village, qui gouverne tous les autres. Redessinée en volumes
 * projetés ; chaque niveau agrandit la place ET la dote d'un monument :
 *  1. LE LIEU D'ASSEMBLÉE - la maison du chef en bois et chaume, la pierre
 *     où l'on parle, un puits, un étal, l'olivier du conseil.
 *  2. LA PLACE - mégaron de moellons à porche et tuiles, fontaine, étals
 *     sous vélums, bordure de pierre.
 *  3. L'AGORA - dallage, portique à colonnes au nord, bouleutérion, hermès,
 *     marché qui s'étoffe.
 *  4. LA GRANDE AGORA - deux portiques en équerre, prytanée à fronton, autel
 *     des Douze Dieux au centre, fontaine monumentale, statues, platanes.
 *
 * Marchandes d'Ouvriers.tsx : (18,4) au niveau 1, puis (-30,-3) et (30,0) -
 * elles se tiennent devant leurs étals, sur la place dégagée.
 */

const f = (n: number) => (Math.round(n * 10) / 10).toString()

/** pierre de l'assemblée (bêma) : bloc à degrés d'où l'on parle */
function Bema({ x, z, m = MATS.pierre }: { x: number; z: number; m?: typeof MATS.pierre }) {
  return (
    <g>
      <OmbreSE x0={x} x1={x + 12} z0={z} z1={z + 9} h={8} o={0.18} />
      <Boite x0={x} x1={x + 12} z0={z} z1={z + 9} y0={0} y1={2} m={m} />
      <Boite x0={x + 1.6} x1={x + 10.4} z0={z + 2} z1={z + 9} y0={2} y1={4} m={m} />
      <Boite x0={x + 3.4} x1={x + 8.6} z0={z + 4} z1={z + 9} y0={4} y1={6} m={m} />
    </g>
  )
}

/** hermès : pilier à tête barbue, rameau votif */
function Hermes({ x, z }: { x: number; z: number }) {
  const [X, Y] = P(x + 1.5, 12, z + 1.5)
  return (
    <g>
      <OmbreSE x0={x} x1={x + 3} z0={z} z1={z + 3} h={16} o={0.14} />
      <Boite x0={x} x1={x + 3} z0={z} z1={z + 3} y0={0} y1={12} m={MATS.marbre} />
      <circle cx={X} cy={Y - 2.2} r={2.2} fill="#f4eee0" />
      <path d={`M${f(X - 2)},${f(Y - 1.6)} Q${f(X)},${f(Y + 1.6)} ${f(X + 2)},${f(Y - 1.6)}`} fill="#cfc5ac" />
      <path d={`M${f(X - 1.4)},${f(Y - 3.4)} a2,2 0 0 1 2.4,-0.6`} stroke="#fffcf3" strokeWidth={0.6} fill="none" />
    </g>
  )
}

/** statue de marbre sur socle : l'orateur drapé */
function Statue({ x, z, flip = false }: { x: number; z: number; flip?: boolean }) {
  const [X, Y] = P(x + 3.5, 9, z + 3.5)
  return (
    <g>
      <OmbreSE x0={x} x1={x + 7} z0={z} z1={z + 7} h={28} o={0.15} />
      <Boite x0={x} x1={x + 7} z0={z} z1={z + 7} y0={0} y1={9} m={MATS.marbre} />
      <g transform={`translate(${f(X)},${f(Y)})${flip ? ' scale(-1,1)' : ''}`}>
        <path d="M-2.8,0 L-2.2,-10 L-3,-15 L-1.6,-19 L1.6,-19 L2.8,-15 L2.4,-10 L2.8,0 Z" fill="#e2d9c2" />
        <path d="M-2.8,0 L-2.2,-10 L-3,-15 L-1.6,-19 L-0.2,-19 L-0.6,-12 L-0.8,0 Z" fill="#fffcf3" />
        <path d="M-2,-4 L2,-9 M-2.2,-8 L1.8,-13" stroke="#bdb298" strokeWidth={0.5} />
        <circle cx={0} cy={-21} r={2} fill="#f4eee0" />
        <path d="M2.4,-16 L5.4,-19" stroke="#e2d9c2" strokeWidth={1.3} strokeLinecap="round" />
      </g>
    </g>
  )
}

/** autel des Douze Dieux : enclos bas de marbre, autel au centre, feu perpétuel */
function AutelDouze({ x, z }: { x: number; z: number }) {
  const [cx, cy] = P(x + 9, 6.4, z + 7)
  return (
    <g>
      <OmbreSE x0={x} x1={x + 18} z0={z} z1={z + 14} h={10} o={0.16} />
      <Boite x0={x} x1={x + 18} z0={z + 12} z1={z + 14} y0={0} y1={3.4} m={MATS.marbre} />
      <Boite x0={x} x1={x + 1.6} z0={z} z1={z + 14} y0={0} y1={3.4} m={MATS.marbre} />
      <Boite x0={x + 5} x1={x + 13} z0={z + 4} z1={z + 10} y0={0} y1={5.2} m={MATS.marbre} />
      <Boite x0={x + 4.4} x1={x + 13.6} z0={z + 3.4} z1={z + 10.6} y0={5.2} y1={6.4} m={MATS.marbre} />
      <Boite x0={x + 16.4} x1={x + 18} z0={z} z1={z + 14} y0={0} y1={3.4} m={MATS.marbre} />
      <Boite x0={x} x1={x + 6} z0={z} z1={z + 1.6} y0={0} y1={3.4} m={MATS.marbre} />
      <Boite x0={x + 12} x1={x + 18} z0={z} z1={z + 1.6} y0={0} y1={3.4} m={MATS.marbre} />
      <Flamme x={cx} y={cy} k={0.9} />
      <Volute x={cx + 1} y={cy - 10} h={30} />
    </g>
  )
}

/** platane : grand arbre d'ombre des places */
function Platane({ x, z, s = 1, seed = 1 }: { x: number; z: number; s?: number; seed?: number }) {
  const [X, Y] = P(x, 0, z)
  return <Arbre x={X} y={Y} essence="chene" haut={52 * s} larg={54 * s} seed={seed} />
}

// ═══════════════════════════════ NIVEAUX ═══════════════════════════════════

function Place() {
  return (
    <g>
      <Sol cx={6} cy={-8} rx={96} ry={28} />
      <Aire x0={-62} x1={56} z0={-22} z1={22} fill="#c8b98f" />
      <path d={seg([-62, 0.1, -22], [56, 0.1, -22]) + seg([56, 0.1, -22], [56, 0.1, 22])} stroke="#e2d8bd" strokeWidth={1.6} />
      <Platane x={-74} z={44} seed={3} />
      <Batisse x0={-24} x1={20} z0={26} z1={58} h={20} m={MATS.moellon} faite="NS" g={13} porche={{ p: 7, cols: 4, mat: 'pierre' }} enfants={
        <>
          <Baie a={-2} plan={33} w={7} h={13} type="porte" lueur />
          <Baie face="E" a={46} plan={20} y0={9} w={4} h={4} volets />
        </>
      } />
      <Fontaine x={30} z={20} />
      <Velum x0={-44} x1={-26} z0={4} z1={12} h={12} c="#b0412e" />
      <Etal x={-44} z={6} w={16} sorte="fruits" />
      <Velum x0={20} x1={38} z0={-10} z1={-2} h={12} c="#2f4a63" />
      <Etal x={21} z={-8} w={16} sorte="poterie" />
      <Bema x={-64} z={-6} />
      <Sacs x={42} z={-14} n={3} s={0.85} />
      <Amphores x={-14} z={-16} n={3} s={0.8} />
      <Charrette x={66} z={34} charge="amphores" flip />
      <Buisson x={60} z={44} seed={6} fleurs="#e87aa0" />
    </g>
  )
}

function Agora3() {
  return (
    <g>
      <Sol cx={8} cy={-10} rx={112} ry={32} c1="#b7aa84" c2="#c9be96" />
      <Aire x0={-74} x1={64} z0={-26} z1={26} fill="#cfc4a4" dalles={{ dx: 11.5, dz: 8.6 }} joint="#a2957a" />
      <Platane x={-86} z={50} seed={3} />
      <Portique x0={-70} x1={10} z0={28} z1={46} h={20} n={9} mat="pierre" enfants={
        <>
          <Etal x={-60} z={38} w={14} sorte="etoffes" />
          <Amphores x={-34} z={40} n={4} s={0.8} />
          <Sacs x={-14} z={40} n={3} s={0.8} />
        </>
      } />
      {/* bouleutérion : salle du conseil, pierre et tuiles, porte à lueur */}
      <Batisse x0={18} x1={56} z0={30} z1={60} h={22} m={MATS.pierre} faite="NS" g={11} porche={{ p: 6, cols: 4, mat: 'pierre' }} enfants={
        <>
          <Baie a={37} plan={36} w={7} h={14} type="porte" lueur />
          <Baie face="E" a={48} plan={56} y0={10} w={4} h={5} type="arche" />
        </>
      } />
      <Fontaine x={40} z={12} w={16} d={9} />
      <Hermes x={-6} z={16} />
      <Hermes x={6} z={16} />
      <Velum x0={-46} x1={-28} z0={4} z1={12} h={12} c="#b0412e" />
      <Etal x={-46} z={6} w={16} sorte="fruits" />
      <Velum x0={18} x1={36} z0={-10} z1={-2} h={12} c="#2f4a63" />
      <Etal x={19} z={-8} w={16} sorte="poterie" />
      <Bema x={-70} z={-10} />
      <Caisse x={44} z={-16} />
      <Tonneau x={52} z={-14} />
      <Cypres x={P(74, 0, 40)[0]} y={P(74, 0, 40)[1]} h={40} />
    </g>
  )
}

function GrandeAgora() {
  return (
    <g>
      <Sol cx={8} cy={-12} rx={124} ry={34} c1="#b7aa84" c2="#c9be96" />
      <Aire x0={-84} x1={76} z0={-30} z1={28} fill="#ddd2b8" dalles={{ dx: 10, dz: 7.25 }} joint="#b3a78b" />
      <Aire x0={-10} x1={10} z0={-30} z1={0} fill="#ece4d0" dalles={{ dx: 10, dz: 6 }} joint="#cfc7b2" />
      {/* portique de l'ouest, puis celui du nord */}
      <Portique x0={-84} x1={-4} z0={30} z1={48} h={22} n={10} mat="marbre" enfants={
        <>
          <Etal x={-74} z={40} w={14} sorte="etoffes" />
          <Amphores x={-50} z={42} n={4} s={0.8} />
          <Etal x={-30} z={40} w={14} sorte="poterie" />
        </>
      } />
      {/* prytanée : fronton sculpté, porche à colonnes de marbre, foyer public */}
      <g>
        <Batisse x0={6} x1={60} z0={30} z1={66} h={26} m={MATS.marbre} faite="NS" g={12} porche={{ p: 8, cols: 6, mat: 'marbre' }} enfants={
          <>
            <Baie a={33} plan={38} w={8} h={16} type="porte" lueur />
            <Baie face="E" a={54} plan={60} y0={12} w={4} h={6} type="arche" />
          </>
        } />
        {(() => {
          const [X, Y] = P(33, 26, 28.2)
          return (
            <g>
              <path d={`M${f(X - 14)},${f(Y - 1.2)} L${f(X)},${f(Y - 9.6)} L${f(X + 14)},${f(Y - 1.2)} Z`} fill="#35536b" />
              {[-9, -4.6, 0, 4.6, 9].map((dx, i) => <g key={i}><path d={`M${f(X + dx - 1.2)},${f(Y - 1.4)} L${f(X + dx - 0.8)},${f(Y - 6.6 + Math.abs(dx) * 0.6)} L${f(X + dx + 0.8)},${f(Y - 6.6 + Math.abs(dx) * 0.6)} L${f(X + dx + 1.2)},${f(Y - 1.4)} Z`} fill={dx === 0 ? 'url(#iso-or)' : '#f4eee0'} /><circle cx={X + dx} cy={Y - 7.4 + Math.abs(dx) * 0.6} r={0.8} fill={dx === 0 ? '#e8c97e' : '#f4eee0'} /></g>)}
              <path d={`M${f(X)},${f(Y - 12)} q-2,-3 0,-5 q2,2 0,5`} fill="url(#iso-or)" />
            </g>
          )
        })()}
      </g>
      <AutelDouze x={-14} z={2} />
      <Fontaine x={52} z={12} w={18} d={10} m={MATS.marbre} />
      <Statue x={-56} z={10} />
      <Statue x={-2} z={-24} flip />
      <Hermes x={24} z={14} />
      <Velum x0={-48} x1={-30} z0={2} z1={10} h={12} c="#7c2f4e" c2="#efe3c4" />
      <Etal x={-48} z={4} w={16} sorte="etoffes" />
      <Velum x0={18} x1={36} z0={-10} z1={-2} h={12} c="#2f4a63" />
      <Etal x={19} z={-8} w={16} sorte="fruits" />
      <Velum x0={42} x1={58} z0={-24} z1={-16} h={11} c="#b0412e" />
      <Etal x={43} z={-22} w={14} sorte="poisson" />
      <Oriflamme x={-84} z={28} h={34} c="#7c2f4e" c2="#b45f80" />
      <Oriflamme x={76} z={28} h={34} c="#c9922f" c2="#f0cd84" d={0.7} />
      <Platane x={-96} z={54} seed={3} />
      <Cypres x={P(84, 0, 46)[0]} y={P(84, 0, 46)[1]} h={46} />
      <Buisson x={-80} z={-22} seed={4} fleurs="#e87aa0" />
      <Buisson x={70} z={-26} seed={8} fleurs="#f6f3ea" />
    </g>
  )
}

export function Agora({ n }: { n: number }) {
  // niveau 1 : le dessin d'origine, plus riche pour un lieu d'assemblée primitif
  if (n <= 1) {
    return (
      <g>
        <AgoraOrigine n={1} />
        {/* le lieu d'assemblée s'affirme : pierre d'où parlent les anciens, hermès de bornage */}
        <PierreAssemblee x={10} y={-12} />
        <HermesPilier x={-42} y={-1} />
        <Lumiere rx={50} h={40} />
      </g>
    )
  }
  return (
    <g>
      <defs>
        <DefsIso />
      </defs>
      {n === 2 ? <Place /> : n === 3 ? <Agora3 /> : <GrandeAgora />}
    </g>
  )
}

