#!/usr/bin/env python3
"""
PARCOURS 1 - LA PREMIÈRE PARTIE

Le chemin que suit tout nouveau joueur, et le seul qu'aucun test ne couvrait :
page neuve → écran de choix du mode → bac à sable → la leçon de Zeus démarre →
on bâtit la ferme comme il l'exige → la mission « Le pain d'abord » s'allume →
on réclame.

C'est le parcours le plus fragile du lot, parce qu'il traverse trois systèmes qui
se disputent l'écran : le choix du mode, le masque du tutoriel (qui AVALE tout
clic hors de ses cibles) et le fil rouge des missions. Une régression dans l'un
des trois se voit ici et nulle part ailleurs.

    python3 e2e/parcours_01_premiere_partie.py [--port 5199]
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from commun import Scene, exige, lancer, parcours, port_argv  # noqa: E402


def corps() -> None:
    # save=None : aucun emplacement, donc vraie première partie
    with parcours("01-premiere-partie", save=None, port=port_argv()) as sc:
        etape_choix_mode(sc)
        etape_lecon_de_zeus(sc)
        etape_batir_la_ferme(sc)
        etape_reclamer_la_mission(sc)


def etape_choix_mode(sc: Scene) -> None:
    sc.attendre_visible(".choix-mode")
    exige(sc.contient("Bac à sable"), "l’écran de choix ne propose pas le bac à sable")
    exige(sc.contient("La Chute"), "l’écran de choix ne propose pas la campagne")
    exige(sc.etat()["mode"] is None, "le mode est déjà fixé avant qu’on ait choisi")
    sc.capture("choix-mode")

    sc.clic_bouton("Bac à sable")
    sc.attendre(lambda: sc.etat()["mode"] == "bac-a-sable", "le mode n’est pas passé au bac à sable")
    exige(
        sc.page.locator(".choix-mode").count() == 0,
        "l’écran de choix du mode reste affiché après le choix",
    )


def etape_lecon_de_zeus(sc: Scene) -> None:
    """La leçon doit démarrer d'elle-même - et sur sa PREMIÈRE étape."""
    sc.attendre_visible(".tuto-carte")
    exige(sc.contient("Zeus descend de l’Olympe"), "la leçon ne commence pas par l’arrivée de Zeus")
    # le compteur est mis en capitales par le CSS : on lit le DOM, pas le rendu
    compteur = sc.texte_de(".tuto-compteur")
    exige("1 / " in compteur, f"la leçon ne démarre pas à l’étape 1 (compteur : « {compteur} »)")
    exige(sc.etat()["tutoriel"] == 0, "l’étape de tutoriel enregistrée n’est pas la première")
    sc.capture("zeus-arrive")

    # trois étapes de pure lecture avant le premier geste demandé
    for titre_attendu in ("Ce que la terre te donne", "L’humeur de tes gens", "Bâtis d’abord une ferme"):
        sc.clic_bouton("Poursuis")
        sc.attendre_texte(titre_attendu, f"la leçon n’atteint pas l’étape « {titre_attendu} »")


def etape_batir_la_ferme(sc: Scene) -> None:
    """
    Le premier geste exigé par la leçon. Deux cibles se succèdent - la carte,
    puis le panneau qui s'ouvre - et le masque du tutoriel n'autorise QUE
    celles-là : si le clic sur la carte ne sélectionne pas la ferme, rien
    n'avance et le parcours expire ici.
    """
    exige(
        "Cliquez la ferme sur la carte" in sc.texte(),
        "l’étape de construction n’affiche pas la consigne attendue",
    )
    sc.clic_batiment("ferme")
    sc.attendre_visible('[data-tuto="panneau"]')
    exige(sc.contient("Lancer la construction"), "le panneau de la ferme n’offre pas de lancer le chantier")
    sc.capture("panneau-ferme")

    sc.clic_bouton("Lancer la construction")
    # le chantier est ouvert : la leçon doit s'en apercevoir seule et avancer
    sc.attendre(
        lambda: sc.etat()["buildings"]["ferme"].get("targetLevel") == 1
        or sc.etat()["buildings"]["ferme"]["level"] >= 1,
        "le chantier de la ferme n’a pas démarré",
    )
    sc.attendre_texte("Le temps des bâtisseurs", "la leçon n’a pas validé la construction de la ferme")

    # la leçon a fait sa preuve ; le reste du parcours a besoin de ses mains
    sc.clic_bouton("Passer la leçon")
    sc.attendre(
        lambda: sc.page.locator(".tuto-carte").count() == 0,
        "la leçon de Zeus ne se laisse pas passer",
    )
    # en mode test le chantier dure 1,5 s - ailleurs, le temps qu'il faut
    sc.attendre(
        lambda: sc.etat()["buildings"]["ferme"]["level"] >= 1,
        "la ferme n’est jamais sortie de terre",
        delai=60,
    )
    sc.capture("ferme-batie")


def etape_reclamer_la_mission(sc: Scene) -> None:
    """
    « Le pain d'abord » n'a qu'une condition : la ferme au niveau 1. Elle doit
    donc être réclamable À L'INSTANT où le chantier s'achève, sans autre geste.
    """
    exige(
        "le-pain-d-abord" not in sc.etat()["missionsReclamees"],
        "la mission est déjà réclamée avant qu’on y touche",
    )
    sc.clic_bouton("🏅 Missions")
    sc.attendre_texte("Le fil rouge du village", "le panneau des missions ne s’ouvre pas")

    ligne = sc.page.locator(".mission-ligne-tout", has_text="Le pain d’abord").first
    sc.attendre(lambda: ligne.count() > 0, "« Le pain d’abord » ne figure pas dans le fil rouge")
    classes = ligne.get_attribute("class") or ""
    exige(
        "prete" in classes,
        f"« Le pain d’abord » n’est pas prête à être réclamée (classes : {classes})",
    )
    sc.capture("mission-prete")

    ligne.get_by_role("button", name="Réclamer").first.click()
    sc.attendre(
        lambda: "le-pain-d-abord" in sc.etat()["missionsReclamees"],
        "la récompense n’a pas été enregistrée",
    )
    sc.attendre(
        lambda: "reclamee" in (ligne.get_attribute("class") or ""),
        "la ligne de mission ne passe pas à l’état « reçue »",
    )
    sc.capture("mission-reclamee")


if __name__ == "__main__":
    lancer(corps)
