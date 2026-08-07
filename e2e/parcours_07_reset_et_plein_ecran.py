#!/usr/bin/env python3
"""
PARCOURS 7 - ABANDONNER LA CITÉ, ET JOUER EN PLEIN ÉCRAN

Deux gestes courts qui touchent des endroits fragiles.

LE RESET. Abandonner sa cité doit ramener à l'écran de CHOIX DU MODE - et à lui
seul. Ce chemin s'est déjà cassé : `reset` posait autrefois `tutoriel = 0`, et
Zeus donnait sa leçon par-dessus l'écran qui demandait encore comment jouer. Le
parcours affirme donc les deux choses ensemble : l'écran de choix est là, la
leçon de Zeus n'y est pas.

LE PLEIN ÉCRAN. Un bouton, une API que le navigateur peut refuser. On vérifie
qu'il bascule vraiment, et qu'il sait revenir.

    python3 e2e/parcours_07_reset_et_plein_ecran.py [--port 5199]
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from commun import Scene, armee, exige, habitants, lancer, niveaux, parcours, port_argv, sauvegarde  # noqa: E402

SAVE = sauvegarde(
    buildings=niveaux(agora=2, maisons=1, ferme=2, scierie=1, remparts=1),
    villageois=habitants("ferme", "scierie", "carriere", "forge", "temple", "port", "ferme"),
    army=armee(lancier=2),
    wallHp=250,
    pop=7,
)


def corps() -> None:
    with parcours("07-reset-plein-ecran", save=SAVE, port=port_argv()) as sc:
        basculer_en_plein_ecran(sc)
        abandonner_la_cite(sc)


def basculer_en_plein_ecran(sc: Scene) -> None:
    exige(
        not sc.page.evaluate("() => document.fullscreenElement !== null"),
        "la page démarre déjà en plein écran",
    )
    sc.clic('button[aria-label="Jouer en plein écran"]')
    sc.attendre(
        lambda: sc.page.evaluate("() => document.fullscreenElement !== null"),
        "le bouton ne fait pas passer la page en plein écran",
    )
    sc.attendre_visible('button[aria-label="Quitter le plein écran"]')
    sc.capture("plein-ecran")

    sc.clic('button[aria-label="Quitter le plein écran"]')
    sc.attendre(
        lambda: sc.page.evaluate("() => document.fullscreenElement === null"),
        "on ne peut pas ressortir du plein écran",
    )


def abandonner_la_cite(sc: Scene) -> None:
    exige(sc.etat()["buildings"]["ferme"]["level"] == 2, "la cité de départ n’est pas celle attendue")

    sc.clic_bouton("❔")
    sc.attendre_texte("survivre à l’ombre de Troie", "l’aide ne s’ouvre pas")
    sc.clic_bouton("🔥 Recommencer une nouvelle partie")
    sc.attendre_texte("Cette partie sera perdue à jamais", "la demande de confirmation n’apparaît pas")
    sc.capture("confirmation-reset")
    sc.clic_bouton("Tout effacer")

    sc.attendre_visible(".choix-mode")
    etat = sc.etat()
    exige(etat["mode"] is None, "le mode n’est pas remis à zéro : l’écran de choix ne servirait à rien")
    exige(etat["buildings"]["ferme"]["level"] == 0, "la cité n’a pas été rasée")
    exige(
        sc.page.locator(".tuto-carte").count() == 0,
        "la leçon de Zeus s’affiche par-dessus l’écran de choix du mode (régression connue)",
    )
    """
    LA PROMESSE EST « L'ANCIENNE PARTIE N'EXISTE PLUS », pas « la clé est absente à
    cet instant précis ». `reset()` efface bien la clé, mais le jeu continue de
    battre et la moindre action - comme le `save()` que l'écran de choix déclenche -
    la réécrit aussitôt avec la cité NEUVE. Exiger l'absence de la clé, c'était donc
    courir contre l'horloge : le parcours passait seul et tombait une fois sur dix
    dans la suite complète. On vérifie maintenant ce qui compte vraiment - ou bien
    il n'y a plus rien, ou bien ce qui reste est un village vierge.
    """
    exige(
        sc.page.evaluate(
            "() => { const b = localStorage.getItem('palladion-save-v1');"
            "  if (b === null) return true;"
            "  try { const d = JSON.parse(b);"
            "    return Object.values(d.buildings ?? {}).every((x) => (x.level ?? 0) <= 1) && !d.mode }"
            "  catch { return false } }"
        ),
        "la partie effacée survit dans la sauvegarde de l’emplacement joué",
    )
    sc.capture("retour-au-choix")


if __name__ == "__main__":
    lancer(corps)
