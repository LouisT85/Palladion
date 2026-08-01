/*
 * ════════════════════════ LE SON DE LA TROADE ════════════════════════
 *
 * Tout est synthétisé à la volée (Web Audio) : aucun fichier à charger, aucun
 * octet de plus dans le bundle. La lyre égrène un mode phrygien au village
 * paisible ; les cors montent à l'alerte ; le tambour de siège prend le relais
 * quand la colonne touche les murs.
 *
 * Deux règles que le navigateur impose et que l'on respecte :
 *  · aucun son avant une interaction — le contexte n'est créé qu'au premier
 *    geste de l'utilisateur (`debloquerAudio`) ;
 *  · tout est enveloppé : un navigateur sans Web Audio joue simplement en muet.
 */

export type SonId =
  | 'cor'
  | 'tambour'
  | 'fracas'
  | 'breche'
  | 'tonnerre'
  | 'victoire'
  | 'defaite'
  | 'lyre-note'
  | 'piece'
  | 'chantier'

export type Ambiance = 'paix' | 'alerte' | 'siege' | 'muet'

export interface ReglagesAudio {
  muet: boolean
  /** 0…1 — volume général */
  volume: number
  /** 0…1 — volume de la musique de fond, relatif au général */
  musique: number
}

/*
 * v2 : les réglages d'origine sortaient beaucoup trop bas. La musique passait
 * par un bus à 0,275 et des notes à 0,075 — au bout de la chaîne, un vingtième
 * de la puissance des bruits de bataille. La chaîne a été refaite, d'où la clé
 * neuve : un 0,5 enregistré du temps de l'ancienne échelle ne veut plus rien
 * dire.
 *
 * Mais on ne jette pas pour autant ce que le joueur avait choisi : le coupe-son
 * se reporte tel quel (c'est une intention, pas un dosage), et un réglage
 * volontairement BAS reste bas — simplement remonté à l'échelle nouvelle. Seul
 * le cas « je n'y avais pas touché » repart des valeurs par défaut.
 */
const CLE = 'palladion-audio-v2'
const CLE_V1 = 'palladion-audio-v1'

const DEFAUT: ReglagesAudio = { muet: false, volume: 0.8, musique: 0.85 }
/** les valeurs par défaut de la v1 : y reconnaître « jamais touché » */
const DEFAUT_V1 = { volume: 0.6, musique: 0.5 }

function lireReglages(): ReglagesAudio {
  const borne = (x: number) => Math.max(0, Math.min(1, x))
  try {
    const brut = localStorage.getItem(CLE)
    if (brut) {
      const d = JSON.parse(brut) as Partial<ReglagesAudio>
      return {
        muet: !!d.muet,
        volume: borne(d.volume ?? DEFAUT.volume),
        musique: borne(d.musique ?? DEFAUT.musique),
      }
    }
    // pas de v2 : on reprend la v1 s'il y en a une
    const ancien = localStorage.getItem(CLE_V1)
    if (!ancien) return { ...DEFAUT }
    const d = JSON.parse(ancien) as Partial<ReglagesAudio>
    const v = d.volume ?? DEFAUT_V1.volume
    const m = d.musique ?? DEFAUT_V1.musique
    const repris = {
      muet: !!d.muet,
      // un curseur laissé au défaut de la v1 n'était pas un choix : on l'ignore.
      // Un curseur déplacé, si — reporté proportionnellement sur la nouvelle échelle.
      volume: borne(Math.abs(v - DEFAUT_V1.volume) < 0.02 ? DEFAUT.volume : v * (DEFAUT.volume / DEFAUT_V1.volume)),
      musique: borne(Math.abs(m - DEFAUT_V1.musique) < 0.02 ? DEFAUT.musique : m * (DEFAUT.musique / DEFAUT_V1.musique)),
    }
    localStorage.setItem(CLE, JSON.stringify(repris))
    localStorage.removeItem(CLE_V1)
    return repris
  } catch {
    return { ...DEFAUT }
  }
}

let reglages = lireReglages()
let ctx: AudioContext | null = null
let master: GainNode | null = null
let gainMusique: GainNode | null = null
let gainEffets: GainNode | null = null
/** bruit blanc réutilisé par tous les percussifs — un seul buffer suffit */
let bruit: AudioBuffer | null = null
let ambiance: Ambiance = 'muet'
let boucle: number | null = null
let prochaine = 0
/** avancement dans la phrase musicale en cours */
let pas = 0

export function reglagesAudio(): ReglagesAudio {
  return { ...reglages }
}

function sauverReglages(): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(reglages))
  } catch {
    // stockage indisponible : le réglage ne survivra pas à la session, tant pis
  }
}

function appliquerVolumes(): void {
  if (!master || !gainMusique || !gainEffets || !ctx) return
  const g = reglages.muet ? 0 : reglages.volume
  master.gain.setTargetAtTime(g, ctx.currentTime, 0.05)
  // la lyre doit s'entendre AU MÊME PLAN que les cors, pas derrière eux
  gainMusique.gain.setTargetAtTime(reglages.musique * 1.45, ctx.currentTime, 0.05)
  gainEffets.gain.setTargetAtTime(0.9, ctx.currentTime, 0.05)
}

export function setVolume(v: number): void {
  reglages = { ...reglages, volume: Math.max(0, Math.min(1, v)), muet: false }
  appliquerVolumes()
  sauverReglages()
}

export function setVolumeMusique(v: number): void {
  reglages = { ...reglages, musique: Math.max(0, Math.min(1, v)) }
  appliquerVolumes()
  sauverReglages()
}

export function setMuet(m: boolean): void {
  reglages = { ...reglages, muet: m }
  appliquerVolumes()
  sauverReglages()
}

/**
 * Crée le contexte audio. À n'appeler que depuis un vrai geste utilisateur :
 * les navigateurs refusent (à juste titre) tout son non sollicité.
 */
export function debloquerAudio(): void {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume()
    // le contexte survit au démontage de React (StrictMode) : la boucle, non
    lancerBoucle()
    return
  }
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    ctx = new Ctor()
    master = ctx.createGain()
    gainMusique = ctx.createGain()
    gainEffets = ctx.createGain()
    // une réverbération pauvre mais crédible : un filtre passe-bas doux en sortie
    const doux = ctx.createBiquadFilter()
    doux.type = 'lowpass'
    doux.frequency.value = 8200
    gainMusique.connect(master)
    gainEffets.connect(master)
    master.connect(doux)
    doux.connect(ctx.destination)

    const n = ctx.sampleRate * 1.6
    bruit = ctx.createBuffer(1, n, ctx.sampleRate)
    const data = bruit.getChannelData(0)
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1

    appliquerVolumes()
    lancerBoucle()
  } catch {
    ctx = null
  }
}

export function audioPret(): boolean {
  return ctx !== null
}

// ── Briques de synthèse ──────────────────────────────────────────────────────

/** note tenue : oscillateur + enveloppe ADSR minimale */
function note(
  freq: number,
  t: number,
  duree: number,
  opts: {
    type?: OscillatorType
    gain?: number
    attaque?: number
    sortie?: GainNode
    detune?: number
    filtre?: number
  } = {},
): void {
  if (!ctx) return
  const sortie = opts.sortie ?? gainEffets
  if (!sortie) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = opts.type ?? 'triangle'
  o.frequency.setValueAtTime(freq, t)
  if (opts.detune) o.detune.setValueAtTime(opts.detune, t)
  const pic = opts.gain ?? 0.2
  const att = opts.attaque ?? 0.008
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(pic, t + att)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree)
  if (opts.filtre) {
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(opts.filtre, t)
    o.connect(f)
    f.connect(g)
  } else {
    o.connect(g)
  }
  g.connect(sortie)
  o.start(t)
  o.stop(t + duree + 0.05)
}

/** corde pincée : deux voix légèrement désaccordées, décroissance rapide */
function pincee(freq: number, t: number, duree = 1.6, gain = 0.16, sortie?: GainNode): void {
  note(freq, t, duree, { type: 'triangle', gain, sortie, filtre: 2600 })
  note(freq * 2.01, t, duree * 0.5, { type: 'sine', gain: gain * 0.35, sortie, filtre: 4200 })
}

/**
 * Flûte de berger : sinus fondamental, octave très discrète, attaque lente.
 * C'est le timbre le plus doux qu'on puisse fabriquer sans échantillon — celui
 * qu'on veut entendre au-dessus d'un village qui vaque à ses affaires.
 *
 * La partielle était une douzième légèrement désaccordée (×3,01) : ce battement
 * dans l'aigu sonnait le sifflet plutôt que le souffle. Une octave juste, elle,
 * ne fait qu'épaissir le son.
 */
function flute(freq: number, t: number, duree = 2.2, gain = 0.1, sortie?: GainNode, attaque = 0.14): void {
  note(freq, t, duree, { type: 'sine', gain, attaque, sortie, filtre: 1900 })
  note(freq * 2, t + 0.04, duree * 0.6, { type: 'sine', gain: gain * 0.12, attaque: attaque * 1.6, sortie, filtre: 2600 })
}

/** bourdon : deux graves tenus très bas, qui enveloppent sans occuper l'oreille */
function bourdon(freq: number, t: number, duree: number, gain: number, sortie?: GainNode): void {
  note(freq, t, duree, { type: 'sine', gain, attaque: duree * 0.3, sortie, filtre: 420 })
  note(freq * 1.5, t, duree * 0.9, { type: 'sine', gain: gain * 0.5, attaque: duree * 0.35, sortie, filtre: 520 })
}

/** souffle : bruit filtré, pour les percussions, le tonnerre et le fracas */
function souffle(
  t: number,
  duree: number,
  opts: { f0?: number; f1?: number; gain?: number; q?: number; type?: BiquadFilterType } = {},
): void {
  if (!ctx || !bruit || !gainEffets) return
  const src = ctx.createBufferSource()
  src.buffer = bruit
  const f = ctx.createBiquadFilter()
  f.type = opts.type ?? 'bandpass'
  f.frequency.setValueAtTime(opts.f0 ?? 900, t)
  f.frequency.exponentialRampToValueAtTime(Math.max(40, opts.f1 ?? opts.f0 ?? 900), t + duree)
  f.Q.value = opts.q ?? 1
  const g = ctx.createGain()
  const pic = opts.gain ?? 0.2
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(pic, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree)
  src.connect(f)
  f.connect(g)
  g.connect(gainEffets)
  src.start(t, Math.random() * 0.4)
  src.stop(t + duree + 0.05)
}

// ── Effets ───────────────────────────────────────────────────────────────────

export function jouer(son: SonId): void {
  if (!ctx || reglages.muet) return
  const t = ctx.currentTime + 0.01
  switch (son) {
    case 'cor': {
      // deux cors à la quinte, attaque lente, longue traîne
      note(146.8, t, 1.9, { type: 'sawtooth', gain: 0.16, attaque: 0.09, filtre: 1100 })
      note(220, t + 0.12, 1.8, { type: 'sawtooth', gain: 0.12, attaque: 0.1, filtre: 1300 })
      note(293.7, t + 0.55, 1.5, { type: 'sawtooth', gain: 0.09, attaque: 0.12, filtre: 1500 })
      break
    }
    case 'tambour': {
      note(62, t, 0.42, { type: 'sine', gain: 0.34, attaque: 0.004 })
      souffle(t, 0.16, { f0: 220, f1: 70, gain: 0.16, type: 'lowpass' })
      break
    }
    case 'fracas': {
      // bronze contre bronze : bruit court, plus deux harmoniques métalliques
      souffle(t, 0.13, { f0: 3400, f1: 1500, gain: 0.11, q: 0.8 })
      note(1860, t, 0.16, { type: 'square', gain: 0.035, filtre: 5200 })
      note(2410, t + 0.01, 0.11, { type: 'square', gain: 0.025, filtre: 6000 })
      break
    }
    case 'breche': {
      souffle(t, 1.5, { f0: 900, f1: 60, gain: 0.3, type: 'lowpass' })
      note(48, t, 1.4, { type: 'sine', gain: 0.3, attaque: 0.02 })
      note(71, t + 0.06, 1.1, { type: 'triangle', gain: 0.14, attaque: 0.02, filtre: 400 })
      break
    }
    case 'tonnerre': {
      souffle(t, 2.4, { f0: 420, f1: 45, gain: 0.32, type: 'lowpass' })
      souffle(t + 0.18, 1.7, { f0: 1600, f1: 200, gain: 0.13, q: 0.6 })
      note(41, t + 0.05, 2.2, { type: 'sine', gain: 0.26, attaque: 0.03 })
      break
    }
    case 'victoire': {
      // le chant de l'aède : arpège ascendant, puis une quinte tenue
      const arp = [220, 261.6, 329.6, 392, 523.3]
      arp.forEach((f, i) => pincee(f, t + i * 0.13, 1.5, 0.15))
      note(174.6, t + 0.62, 2.6, { type: 'triangle', gain: 0.08, attaque: 0.18, filtre: 1600 })
      note(261.6, t + 0.62, 2.6, { type: 'triangle', gain: 0.07, attaque: 0.2, filtre: 1600 })
      break
    }
    case 'defaite': {
      const desc = [261.6, 233.1, 196, 155.6]
      desc.forEach((f, i) => pincee(f, t + i * 0.22, 2, 0.13))
      note(87.3, t + 0.2, 2.8, { type: 'sine', gain: 0.12, attaque: 0.25 })
      break
    }
    case 'lyre-note':
      pincee(392, t, 1.2, 0.13)
      break
    case 'piece':
      note(1240, t, 0.12, { type: 'sine', gain: 0.07 })
      note(1860, t + 0.05, 0.1, { type: 'sine', gain: 0.05 })
      break
    case 'chantier':
      souffle(t, 0.18, { f0: 1800, f1: 700, gain: 0.09 })
      note(320, t, 0.2, { type: 'square', gain: 0.05, filtre: 1400 })
      break
  }
}

// ── Musique de fond ──────────────────────────────────────────────────────────

/*
 * DEUX COULEURS, DEUX INTENTIONS.
 *
 * · La PAIX est une pentatonique majeure sur fa (fa sol la do ré). Aucun
 *   demi-ton : il est musicalement impossible d'y sonner inquiétant. C'est le
 *   contraire du mode phrygien, dont la seconde mineure — la « couleur antique »
 *   qu'on entend partout — met en réalité l'oreille en alerte.
 *
 *   Deux versions ont échoué avant celle-ci, et pour des raisons opposées :
 *   trop timide d'abord (un robinet qui goutte à volume de fond sonore), puis
 *   trop DENSE — mélodie pincée toutes les six dixièmes de seconde, tierce
 *   complice, basse sur chaque temps fort, décroissances de deux secondes et
 *   demie : cinq voix résonnaient en permanence dans le même registre, et la
 *   régularité des attaques pincées faisait sonner l'ensemble comme une
 *   sonnerie d'école.
 *
 *   Le vrai coupable, ce n'était ni le mode ni le volume : c'était le NOMBRE
 *   D'ATTAQUES. Une pièce reposante en compte peu. Ici : une seule voix
 *   mélodique, soufflée (attaque d'une demi-seconde, aucune corde pincée), une
 *   note toutes les deux secondes et demie, un bourdon qui ne s'interrompt
 *   jamais, et une figure de lyre une fois par phrase — trente secondes. Le
 *   fond est CONTINU et les événements RARES : c'est cela, une safe place.
 *
 * · L'ALERTE, elle, garde le phrygien et ses cordes pincées : là, l'inquiétude
 *   est le but, et la densité aussi.
 */
const PENTA = [174.6, 196, 220, 261.6, 293.7, 349.2, 392, 440, 523.3]
const PHRYGIEN = [164.8, 174.6, 196, 220, 246.9, 261.6, 293.7, 329.6]

/**
 * La ligne de paix, un degré par temps FORT (soit un toutes les 2,5 s) ; −1 est
 * un vrai silence, où seul le bourdon reste. Douze notes : la phrase fait une
 * demi-minute et ne se laisse pas mémoriser, donc ne lasse pas.
 */
const CHANT_PAIX = [0, 2, 4, 3, -1, 2, 1, 0, 2, 4, 5, 3]
const PHRASE_ALERTE = [0, 3, 4, 0, 5, 4, 3, 0]

/** un temps mélodique de paix sur quatre : c'est l'espacement des attaques */
const TEMPS_PAR_NOTE = 4

/** durée d'un temps selon l'ambiance (s) */
function tempo(): number {
  return ambiance === 'alerte' ? 0.36 : ambiance === 'siege' ? 0.3 : 0.62
}

/** programme la suite de la musique quelques temps à l'avance */
function planifier(): void {
  if (!ctx || !gainMusique || ambiance === 'muet' || reglages.muet) return
  const horizon = ctx.currentTime + 0.9
  const dt = tempo()
  while (prochaine < horizon) {
    const t = Math.max(prochaine, ctx.currentTime + 0.02)
    if (ambiance === 'paix') {
      const cycle = CHANT_PAIX.length * TEMPS_PAR_NOTE
      const i = pas % cycle
      // la mélodie ne parle qu'un temps sur quatre : entre deux notes, le
      // bourdon tient seul le village. C'est le silence qui repose, pas la note.
      if (i % TEMPS_PAR_NOTE === 0) {
        const deg = CHANT_PAIX[i / TEMPS_PAR_NOTE]
        if (deg >= 0) flute(PENTA[deg], t, 4.2, 0.16, gainMusique, 0.45)
      }
      // bourdon renouvelé bien avant de s'éteindre : le fond ne se troue jamais
      if (i % 16 === 0) bourdon(PENTA[0] / 2, t, 12.4, 0.075, gainMusique)
      // une seule figure de lyre par phrase, très douce — le seul geste pincé
      if (i === cycle - 8) {
        pincee(PENTA[2], t, 2.6, 0.05, gainMusique)
        pincee(PENTA[4], t + dt * 1.4, 2.6, 0.045, gainMusique)
        pincee(PENTA[6], t + dt * 2.8, 3, 0.04, gainMusique)
      }
    } else if (ambiance === 'alerte') {
      const deg = PHRASE_ALERTE[pas % PHRASE_ALERTE.length]
      pincee(PHRYGIEN[deg], t, 1.1, 0.1, gainMusique)
      if (pas % 2 === 0) note(PHRYGIEN[0] / 2, t, 0.9, { type: 'sawtooth', gain: 0.05, attaque: 0.02, sortie: gainMusique, filtre: 500 })
    } else {
      // siège : le tambour mène, la lyre se tait
      if (pas % 2 === 0) {
        note(58, t, 0.36, { type: 'sine', gain: 0.24, attaque: 0.004, sortie: gainMusique })
        souffle(t, 0.13, { f0: 200, f1: 60, gain: 0.1, type: 'lowpass' })
      }
      if (pas % 8 === 5) note(87, t, 0.3, { type: 'sine', gain: 0.16, attaque: 0.004, sortie: gainMusique })
    }
    pas++
    prochaine = t + dt
  }
}

function lancerBoucle(): void {
  if (boucle !== null) return
  boucle = window.setInterval(planifier, 250)
}

/** change la couleur de fond : paix, alerte, siège — ou silence */
export function setAmbiance(a: Ambiance): void {
  if (a === ambiance) return
  ambiance = a
  pas = 0
  if (ctx) prochaine = ctx.currentTime + 0.05
}

export function ambianceCourante(): Ambiance {
  return ambiance
}

/** coupe tout et libère la boucle — utilisé au démontage de l'application */
export function arreterAudio(): void {
  if (boucle !== null) {
    clearInterval(boucle)
    boucle = null
  }
  ambiance = 'muet'
}
