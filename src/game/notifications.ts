/*
 * ═════════════════ LES AVERTISSEMENTS DU NAVIGATEUR ═════════════════
 *
 * Le jeu continue onglet fermé : les assauts se résolvent tout seuls et le joueur
 * découvre le pillage au retour. Une notification système change cela - elle
 * prévient à temps, même quand PALLADION n'est pas l'onglet regardé.
 *
 * Trois règles, et elles tiennent à la politesse :
 *
 *  · on ne DEMANDE l'autorisation qu'après un geste explicite du joueur (le
 *    bouton du panneau de son) - jamais au chargement, ce qui est le plus sûr
 *    moyen de se faire refuser une fois pour toutes ;
 *  · on ne notifie que ce qui a une échéance : un assaut annoncé, un appel au
 *    secours. Ni les récoltes, ni les hauts faits, ni les naissances ;
 *  · on ne notifie JAMAIS quand l'onglet est visible - le bandeau du jeu est là
 *    pour cela, et deux alertes pour un même événement, c'est du bruit.
 */

const CLE = 'palladion-notifs'

export type EtatNotifs = 'indisponible' | 'refuse' | 'eteint' | 'allume'

function supporte(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/** l'état courant, tel que l'affiche le panneau de réglages */
export function etatNotifs(): EtatNotifs {
  if (!supporte()) return 'indisponible'
  if (Notification.permission === 'denied') return 'refuse'
  if (Notification.permission !== 'granted') return 'eteint'
  try {
    return localStorage.getItem(CLE) === 'non' ? 'eteint' : 'allume'
  } catch {
    return 'allume'
  }
}

/**
 * Demande l'autorisation si besoin, puis allume ou éteint. À n'appeler que
 * depuis un vrai clic : les navigateurs refusent (à juste titre) une demande
 * qui ne vient pas d'un geste.
 */
export async function basculerNotifs(): Promise<EtatNotifs> {
  if (!supporte()) return 'indisponible'
  const etat = etatNotifs()
  if (etat === 'refuse') return 'refuse'
  if (etat === 'allume') {
    try {
      localStorage.setItem(CLE, 'non')
    } catch {
      // sans stockage, le réglage ne survivra pas à la session
    }
    return 'eteint'
  }
  if (Notification.permission !== 'granted') {
    try {
      const rep = await Notification.requestPermission()
      if (rep !== 'granted') return rep === 'denied' ? 'refuse' : 'eteint'
    } catch {
      return 'eteint'
    }
  }
  try {
    localStorage.setItem(CLE, 'oui')
  } catch {
    // idem : réglage volatile, notifications tout de même actives
  }
  return 'allume'
}

/** dernière notification envoyée, par sujet - pour ne pas répéter la même */
const derniere: Record<string, number> = {}

/**
 * Envoie un avertissement, si et seulement si tout est réuni. `sujet` sert de
 * garde-fou : deux appels rapprochés sur le même sujet ne donnent qu'une seule
 * notification, ce qui protège d'un tick trop bavard.
 */
export function avertir(sujet: string, titre: string, corps: string): void {
  if (etatNotifs() !== 'allume') return
  // l'onglet est sous les yeux du joueur : le bandeau du jeu suffit
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') return
  const now = Date.now()
  if (now - (derniere[sujet] ?? 0) < 60_000) return
  derniere[sujet] = now
  try {
    const n = new Notification(titre, {
      body: corps,
      tag: `palladion-${sujet}`,
      // pas de son : le joueur a déjà réglé le son du jeu, on ne le double pas
      silent: true,
    })
    // douze secondes suffisent à lire une ligne ; au-delà c'est du harcèlement
    setTimeout(() => n.close(), 12_000)
  } catch {
    // le navigateur a refusé au dernier moment : rien à faire, le jeu continue
  }
}
