#!/usr/bin/env python3
"""
PARCOURS 4 - UNE EXPÉDITION, DU CHOIX DE LA CIBLE AU BUTIN

L'autre moitié de la guerre : porter le fer chez le voisin. On ouvre la carte de
la Troade, on choisit la place la plus faible, on compose une colonne, on lance
l'assaut, la scène se joue, et le raid rend son rapport - étoiles comprises.

La cible est le camp de pillards : aucun mur, deux lanciers. Cinq hoplites en
font une affaire réglée. Le parcours éprouve le CHEMIN, pas l'équilibrage - une
place forte disputée rendrait l'issue aléatoire et le test bavard.

    python3 e2e/parcours_04_expedition.py [--port 5199]
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from commun import Scene, armee, exige, habitants, lancer, niveaux, parcours, port_argv, sauvegarde  # noqa: E402

CIBLE = "Camp de pillards"
HOPLITES = 5

SAVE = sauvegarde(
    buildings=niveaux(agora=2, maisons=1, ferme=2, scierie=1, carriere=1, caserne=2, remparts=2),
    villageois=habitants("ferme", "scierie", "carriere", "forge", "temple", "port", "ferme"),
    army=armee(hoplite=8, lancier=4, archer=3),
    wallHp=600,
    pop=7,
)


def corps() -> None:
    with parcours("04-expedition", save=SAVE, port=port_argv()) as sc:
        ouvrir_la_troade(sc)
        composer_la_colonne(sc)
        jouer_la_scene(sc)
        lire_le_rapport_de_raid(sc)


def ouvrir_la_troade(sc: Scene) -> None:
    exige(
        sc.etat()["expeditions"].get("camp-pillards", {}).get("etoiles", 0) == 0,
        "le camp de pillards a déjà été pillé - la sauvegarde de départ est mauvaise",
    )
    sc.clic_bouton("🗺️ Expéditions")
    sc.attendre_texte("la Troade à feu et à sang", "la carte des expéditions ne s’ouvre pas")

    carte = sc.page.locator(".exp-village").filter(has_text=CIBLE).first
    sc.attendre(lambda: carte.count() > 0, f"« {CIBLE} » ne figure pas parmi les places fortes")
    sc.capture("troade")
    carte.get_by_role("button", name="Piller").first.click()
    sc.attendre_texte(f"Marcher sur {CIBLE}", "le panneau de préparation du raid ne s’ouvre pas")


def composer_la_colonne(sc: Scene) -> None:
    """
    On ne peut pas partir les mains vides : le bouton de lancement reste éteint
    tant qu'aucun homme n'est désigné. C'est la garde la plus utile du panneau.
    """
    lancer_bouton = sc.page.get_by_role("button", name="Lancer l’assaut")
    sc.attendre(lambda: lancer_bouton.count() > 0, "le bouton de lancement est absent")
    exige(
        not lancer_bouton.first.is_enabled(),
        "on peut lancer un raid sans un seul homme",
    )

    ligne = sc.page.locator(".unite").filter(has_text="Hoplite").first
    sc.attendre(lambda: ligne.count() > 0, "les hoplites ne figurent pas dans la composition")
    plus = ligne.locator(".actions button").last
    for _ in range(HOPLITES):
        plus.click()
    sc.attendre(
        lambda: ligne.locator(".compteur").inner_text().strip() == str(HOPLITES),
        f"le compteur d’hoplites n’atteint pas {HOPLITES}",
    )
    # l'en-tête est mis en capitales par le CSS : on lit le DOM
    entetes = [t for t in sc.page.locator(".modale-chassis h3").all_text_contents() if "Vos troupes" in t]
    exige(entetes, "le panneau n’affiche pas le total de la colonne")
    exige(
        f"({HOPLITES}/" in entetes[0],
        f"le total de la colonne ne suit pas les hoplites désignés : « {entetes[0]} »",
    )
    exige(
        "Rapport de force très favorable" in sc.texte(),
        "cinq hoplites devraient écraser un camp de pillards - l’estimation dit le contraire",
    )
    sc.capture("colonne")

    sc.attendre(lambda: lancer_bouton.first.is_enabled(), "le bouton de lancement reste éteint")
    lancer_bouton.first.click()


def jouer_la_scene(sc: Scene) -> None:
    sc.attendre(lambda: sc.etat()["expedition"] is not None, "l’expédition ne part pas")
    sc.attendre_visible(".scene-exp")
    exige(
        sc.page.locator("svg.carte-exp").count() > 0,
        "la scène de bataille de l’expédition ne s’affiche pas",
    )
    exige("Vos troupes" in sc.texte_de(".statut-exp"), "le statut de la mêlée n’est pas affiché")
    la_carte_reste_une_source_de_peinture(sc)
    sc.capture("scene-raid")


def la_carte_reste_une_source_de_peinture(sc: Scene) -> None:
    """
    LES « BÂTIMENTS TRANSPARENTS EN EXPÉDITION », ET POURQUOI CE CONTRAT A DEUX
    FACES.

    `DefsArt` est monté dans DEUX <svg> - la carte du village et la scène du raid -
    avec les MÊMES identifiants. Un `url(#a-bois-l)` se résout sur le PREMIER du
    document, celui de la carte. Éteindre cette carte par `display: none` pendant
    le raid supprimait donc le serveur de peinture : tout ce qui est peint d'un
    dégradé dans la scène d'expédition disparaissait - murs des maisons, fût de la
    tour de guet, occlusion des bases. Restaient les à-plats, d'où des bâtisses
    réduites à leurs chevrons et à leur porte, sur cinq décors des six. Le camp de
    pillards, tout en à-plats, était le seul intact : c'est ce qui a rendu le
    défaut si long à cerner, et c'est pourquoi ce parcours - qui joue le camp - ne
    peut PAS le voir au pixel. Il vérifie donc la cause, pas le symptôme.

    Les deux faces du contrat :
      · la carte ne doit PAS être peinte (4900 nœuds et deux cents flous gaussiens
        sous un voile opaque : 10,4 i/s contre 31,2) ;
      · elle doit RESTER dans le rendu, sans quoi ses dégradés ne se résolvent plus.
    `content-visibility: hidden` tient les deux. `display: none` n'en tient qu'une.
    """
    etat = sc.page.evaluate(
        "() => { const s = document.querySelector('main.scene.scene-derriere > svg.carte');"
        "  if (!s) return null;"
        "  const c = getComputedStyle(s);"
        "  return { display: c.display, cv: c.contentVisibility } }"
    )
    exige(etat is not None, "la carte du village n’est plus sous la scène pendant le raid")
    exige(
        etat["display"] != "none",
        "la carte du village est retirée du rendu par « display: none » : ses dégradés "
        "ne se résolvent plus et les bâtiments de l’expédition redeviennent transparents",
    )
    exige(
        etat["cv"] == "hidden",
        f"la carte du village est peinte pendant le raid (content-visibility : {etat['cv']}) - "
        "le jeu retombe à 10 images par seconde",
    )


def lire_le_rapport_de_raid(sc: Scene) -> None:
    sc.attendre(
        lambda: (sc.etat()["expedition"] or {}).get("fini") is True,
        "le raid ne se conclut jamais",
        delai=180,
    )
    sc.attendre_visible(".resultat-exp")
    exige(
        sc.page.locator(".etoiles-resultat .pleine").count() >= 1,
        "un raid gagné devrait rapporter au moins une étoile",
    )
    rapport = sc.texte_de(".resultat-exp")
    exige(len(rapport.strip()) > 20, f"le rapport de raid est vide : « {rapport} »")
    sc.capture("rapport-raid")

    sc.clic_bouton("Rentrer au village")
    sc.attendre(lambda: sc.etat()["expedition"] is None, "on ne peut pas rentrer au village")
    sc.attendre(
        lambda: sc.etat()["expeditions"].get("camp-pillards", {}).get("etoiles", 0) >= 1,
        "l’étoile du raid n’est pas enregistrée dans la partie",
    )


if __name__ == "__main__":
    lancer(corps)
