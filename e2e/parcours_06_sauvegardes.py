#!/usr/bin/env python3
"""
PARCOURS 6 - LA PARTIE SURVIT À LA FERMETURE DE L'ONGLET

La promesse la plus discrète et la plus grave : ce qu'on a fait est encore là au
retour. On la vérifie de bout en bout, sans passer par le store :

  · le panneau « Vos parties » voit l'emplacement 1 occupé et les deux autres
    libres, avec le jour, la population et les niveaux bâtis ;
  · on change quelque chose (un habitant envoyé à la ferme) ;
  · on RECHARGE la page pour de vrai ;
  · l'affectation est revenue, et le panneau annonce le même règne.

Le drapeau de `sessionStorage` de `commun.py` est ce qui rend le parcours
honnête : sans lui, la situation de départ serait réinjectée au rechargement et
l'on ne prouverait rien du tout - on relirait sa propre fixture.

    python3 e2e/parcours_06_sauvegardes.py [--port 5199]
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from commun import Scene, armee, exige, habitants, lancer, niveaux, parcours, port_argv, sauvegarde  # noqa: E402

PAYSAN = "Danaé"

SAVE = sauvegarde(
    buildings=niveaux(agora=2, maisons=1, ferme=2, scierie=1, carriere=1, remparts=1),
    villageois=habitants("ferme", "scierie", "carriere", "forge", "temple", "port", "ferme"),
    army=armee(lancier=2),
    wallHp=250,
    pop=7,
)


def corps() -> None:
    with parcours("06-sauvegardes", save=SAVE, port=port_argv()) as sc:
        avant = lire_les_emplacements(sc)
        affecter_puis_recharger(sc)
        verifier_le_retour(sc, avant)


def ouvrir_le_panneau(sc: Scene) -> str:
    """« Vos parties » se trouve au bas de l'aide - c'est le seul chemin qui y mène."""
    sc.clic_bouton("❔")
    sc.attendre_texte("survivre à l’ombre de Troie", "l’aide ne s’ouvre pas")
    sc.clic_bouton("💾 Vos parties")
    sc.attendre_texte("Vos parties", "le panneau des sauvegardes ne s’ouvre pas")
    sc.attendre_visible(".emplacement")
    return sc.texte_de(".modale-chassis")


def lire_les_emplacements(sc: Scene) -> str:
    texte = ouvrir_le_panneau(sc)
    emplacements = sc.page.locator(".emplacement")
    exige(emplacements.count() == 3, f"il devrait y avoir trois emplacements, pas {emplacements.count()}")

    premier = emplacements.nth(0).text_content() or ""
    exige("Bac à sable" in premier, f"l’emplacement 1 n’annonce pas la partie en cours : « {premier} »")
    exige("en cours" in premier, "l’emplacement joué n’est pas marqué « en cours »")
    exige("habitants" in premier and "niveaux bâtis" in premier, f"le résumé du règne est incomplet : « {premier} »")
    for i in (1, 2):
        libre = emplacements.nth(i).text_content() or ""
        exige("Emplacement libre" in libre, f"l’emplacement {i + 1} devrait être libre : « {libre} »")
    sc.capture("emplacements")

    sc.echap()
    sc.attendre(
        lambda: sc.page.locator(".emplacement").count() == 0,
        "le panneau des sauvegardes ne se referme pas",
    )
    return premier


def affecter_puis_recharger(sc: Scene) -> None:
    """
    Une affectation écrit la partie sur-le-champ (`affecter` appelle `save`) : on
    n'a donc pas besoin de compter sur le `beforeunload` pour que le changement
    traverse le rechargement.
    """
    exige(
        all(v["poste"] is None for v in sc.etat()["villageois"]),
        "des habitants sont déjà à leur poste avant qu’on y touche",
    )
    sc.clic_bouton("Habitants")
    sc.attendre_texte("Les habitants du village", "le recensement ne s’ouvre pas")
    sc.page.locator(f'select[aria-label="Poste de {PAYSAN}"]').first.select_option("ferme")
    sc.attendre(
        lambda: any(v["nom"] == PAYSAN and v["poste"] == "ferme" for v in sc.etat()["villageois"]),
        f"{PAYSAN} n’a pas rejoint la ferme",
    )
    sc.echap()

    sc.page.reload(wait_until="domcontentloaded")
    sc.attendre(lambda: sc.page.locator("svg.carte").count() > 0, "la partie ne se rouvre pas après rechargement")
    if sc.contient("Pendant votre absence"):
        sc.clic_bouton("Reprendre le règne")
    sc.respirer()


def verifier_le_retour(sc: Scene, avant: str) -> None:
    etat = sc.etat()
    exige(
        etat["mode"] == "bac-a-sable",
        "le mode de jeu n’a pas survécu au rechargement - l’écran de choix se rouvrirait",
    )
    exige(
        any(v["nom"] == PAYSAN and v["poste"] == "ferme" for v in etat["villageois"]),
        f"{PAYSAN} a quitté son poste au rechargement : la partie n’a pas été enregistrée",
    )
    exige(
        etat["buildings"]["ferme"]["level"] == 2 and etat["buildings"]["remparts"]["level"] == 1,
        "les bâtiments ne sont pas revenus comme ils étaient",
    )
    # et le poste tenu se voit sur la carte : plus d'écriteau « sans paysan »
    exige(
        sc.page.locator("svg.carte text").filter(has_text="sans paysan").count() == 0,
        "la carte réaffiche « sans paysan » alors que le poste est tenu",
    )
    sc.capture("apres-rechargement")

    apres = ouvrir_le_panneau(sc)
    exige("Bac à sable" in apres, f"l’emplacement 1 a perdu sa partie : « {apres} »")
    exige(
        avant.split("·")[1].strip() == apres.split("·")[1].strip(),
        f"la population annoncée a changé au rechargement : « {avant} » → « {apres} »",
    )
    sc.capture("emplacements-apres")


if __name__ == "__main__":
    lancer(corps)
