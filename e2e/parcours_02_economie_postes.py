#!/usr/bin/env python3
"""
PARCOURS 2 - ÉCONOMIE ET POSTES

La règle la plus mal comprise du jeu : un atelier ne rend qu'au prorata des
postes TENUS, et personne ne prend son poste tout seul. Trois choses doivent donc
se répondre, et c'est ce qu'on éprouve ici :

  · la carte plante un écriteau « sans paysan » devant l'atelier désert ;
  · le recensement compte les bras libres et les postes à pourvoir ;
  · affecter quelqu'un fait monter le rendement affiché ET retire l'écriteau.

Note sur le chiffre qu'on regarde. En mode test (port 5199), les coffres sont
remplis à chaque battement et le HUD affiche « ∞ » au lieu d'un débit : le taux
de production du bandeau n'y est donc pas observable. On affirme sur le RENDEMENT
de l'atelier - « 0/1 · 0 % » → « 1/1 · 100 % » -, qui est le taux de production
de ce bâtiment et ne dépend pas du mode.

    python3 e2e/parcours_02_economie_postes.py [--port 5199]
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from commun import Scene, armee, exige, habitants, lancer, niveaux, parcours, port_argv, sauvegarde  # noqa: E402

# Un village où tout est en place SAUF les bras : une ferme de niveau 1 (donc un
# seul poste, ce qui rend l'affectation lisible : 0 % ou 100 %) et sept habitants
# nommés, tous sans emploi. Le premier est paysan de son métier.
SAVE = sauvegarde(
    buildings=niveaux(agora=1, ferme=1, maisons=0),
    villageois=habitants("ferme", "scierie", "carriere", "forge", "temple", "port", "ferme"),
    army=armee(),
    pop=7,
)

PAYSAN = "Danaé"  # habitants()[0] : métier « ferme »


def pourcentage(texte: str) -> int:
    """Extrait le « 100 » de « 1/1 · 100 % »."""
    m = re.search(r"(\d+)\s*%", texte)
    exige(m is not None, f"aucun pourcentage lisible dans « {texte} »")
    return int(m.group(1))


def ligne_ferme(sc: Scene):
    """La ligne récapitulative de la ferme, dans le bloc « Ateliers et postes »."""
    return sc.page.locator(".modale-chassis .ligne").filter(has_text="Ferme").first


def corps() -> None:
    with parcours("02-economie-postes", save=SAVE, port=port_argv()) as sc:
        ecriteau = ecriteau_sans_paysan(sc)
        avant = ouvrir_recensement(sc)
        apres = affecter_le_paysan(sc, avant)
        exige(apres > avant, f"le rendement de la ferme n’a pas monté ({avant} % → {apres} %)")
        refermer_et_verifier_la_carte(sc, ecriteau)


def ecriteau_sans_paysan(sc: Scene):
    """L'atelier désert doit se voir SUR LA CARTE, sans ouvrir aucun panneau."""
    ecriteau = sc.page.locator("svg.carte text").filter(has_text="sans paysan")
    sc.attendre(
        lambda: ecriteau.count() > 0,
        "l’écriteau « sans paysan » ne se plante pas devant la ferme déserte",
    )
    sc.capture("ferme-deserte")
    return ecriteau


def ouvrir_recensement(sc: Scene) -> int:
    sc.clic_bouton("Habitants")
    sc.attendre_texte("Les habitants du village", "le recensement ne s’ouvre pas")

    entete = sc.texte_de(".modale-sous")
    exige("7 sans emploi" in entete, f"le recensement ne compte pas sept bras libres : « {entete} »")
    exige("1 poste à pourvoir" in entete, f"le recensement ne voit pas le poste vacant : « {entete} »")

    ligne = ligne_ferme(sc)
    sc.attendre(lambda: ligne.count() > 0, "la ferme ne figure pas dans les ateliers du recensement")
    avant = pourcentage(ligne.inner_text())
    exige(avant == 0, f"la ferme déserte devrait rendre 0 %, elle en affiche {avant}")
    exige("0/1" in ligne.inner_text(), "la ferme n’annonce pas « 0/1 » postes tenus")
    sc.capture("recensement-avant")
    return avant


def affecter_le_paysan(sc: Scene, avant: int) -> int:
    """
    On passe par la liste déroulante de l'habitant - le geste réel du joueur -
    et non par le raccourci « + Danaé » : c'est le chemin qui doit tenir même
    quand aucun candidat du bon métier n'est proposé.
    """
    select = sc.page.locator(f'select[aria-label="Poste de {PAYSAN}"]')
    sc.attendre(lambda: select.count() > 0, f"{PAYSAN} ne figure pas au recensement")
    select.first.select_option("ferme")

    sc.attendre(
        lambda: any(v["nom"] == PAYSAN and v["poste"] == "ferme" for v in sc.etat()["villageois"]),
        f"{PAYSAN} n’a pas rejoint la ferme",
    )
    ligne = ligne_ferme(sc)
    sc.attendre(
        lambda: "1/1" in ligne.inner_text(),
        "la ferme n’affiche pas son poste comme tenu",
    )
    apres = pourcentage(ligne.inner_text())

    entete = sc.texte_de(".modale-sous")
    exige("6 sans emploi" in entete, f"le compte de bras libres n’a pas baissé : « {entete} »")
    exige(
        "Tous les postes sont tenus" in sc.texte(),
        "le recensement ne signale pas que plus aucun poste n’est vacant",
    )
    sc.capture("recensement-apres")
    return apres


def refermer_et_verifier_la_carte(sc: Scene, ecriteau) -> None:
    sc.echap()
    sc.attendre(
        lambda: sc.page.locator(".modale-chassis").count() == 0,
        "le recensement ne se referme pas sur Échap",
    )
    sc.attendre(
        lambda: ecriteau.count() == 0,
        "l’écriteau « sans paysan » reste planté alors que le poste est tenu",
    )
    sc.capture("ferme-tenue")


if __name__ == "__main__":
    lancer(corps)
