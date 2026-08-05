#!/usr/bin/env python3
"""
PARCOURS 5 - LE PANTHÉON : INVOQUER, PAYER, ATTENDRE

Trois promesses tiennent le panthéon, et on les éprouve toutes les trois sur
Poséidon - le seul Olympien dont la bénédiction agisse HORS bataille, donc le
seul dont on puisse observer l'effet sans monter un assaut :

  · l'effet a lieu vraiment : « Rempart du Trident » rend des points de
    structure aux murailles, à la mesure de la ferveur ;
  · la bénédiction se PAIE en faveur ;
  · elle se referme sur un cooldown, affiché en secondes sur le bouton lui-même.

⚠️ La deuxième promesse n'est pas observable en mode test : le tick y remet la
faveur au maximum à chaque battement (voir `MODE_TEST` dans le tick du store), et
le chiffre est déjà remonté quand on le relit. L'assertion sur la faveur ne se
fait donc que sur un serveur normal (`--port 5197`) ; en mode test on s'en tient
à l'effet et au cooldown, et on le dit.

    python3 e2e/parcours_05_pantheon.py [--port 5199]
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from commun import Scene, armee, dieux, exige, habitants, lancer, niveaux, parcours, port_argv, sauvegarde  # noqa: E402

MUR_MAX = 1250  # remparts de niveau 3 (WALL_HP[3])
MUR_ENTAME = 300

SAVE = sauvegarde(
    buildings=niveaux(agora=2, maisons=1, ferme=2, scierie=1, carriere=1, temple=2, remparts=3),
    villageois=habitants("ferme", "scierie", "carriere", "forge", "temple", "port", "ferme"),
    army=armee(lancier=3),
    # des murs entamés : c'est là que le Trident se voit
    wallHp=MUR_ENTAME,
    faveur=100,
    gods=dieux(poseidon=0),
    pop=7,
)


def carte_poseidon(sc: Scene):
    return sc.page.locator(".dieu").filter(has_text="Poséidon").first


def corps() -> None:
    with parcours("05-pantheon", save=SAVE, port=port_argv()) as sc:
        mode_test = "🧪 TEST" in sc.texte()
        ouvrir_le_pantheon(sc)
        faveur_avant, mur_avant = invoquer_le_trident(sc)
        verifier_effet(sc, mur_avant)
        verifier_cooldown(sc)
        verifier_cout(sc, faveur_avant, mode_test)


def ouvrir_le_pantheon(sc: Scene) -> None:
    sc.clic_bouton("⚡ Panthéon")
    sc.attendre_visible('[data-tuto="modale-pantheon"]')
    carte = carte_poseidon(sc)
    sc.attendre(lambda: carte.count() > 0, "Poséidon ne figure pas au panthéon")
    fiche = carte.inner_text()
    exige("Rempart du Trident" in fiche, "la bénédiction de Poséidon n’est pas nommée")
    exige("Indifférent" in fiche, f"la ferveur de départ devrait être « Indifférent » : « {fiche[:120]} »")
    sc.capture("pantheon")


def invoquer_le_trident(sc: Scene) -> tuple[float, int]:
    carte = carte_poseidon(sc)
    invoquer = carte.get_by_role("button", name="Invoquer").first
    sc.attendre(lambda: invoquer.count() > 0, "le bouton d’invocation est absent")
    libelle = invoquer.inner_text()
    exige(
        re.match(r"Invoquer \(\d+ ✨\)", libelle.strip()),
        f"le bouton n’annonce pas son prix en faveur : « {libelle} »",
    )
    exige(invoquer.is_enabled(), "on ne peut pas invoquer Poséidon avec cent de faveur et un temple bâti")

    etat = sc.etat()
    exige(etat["wallHp"] == MUR_ENTAME, f"les murs ne sont pas au niveau attendu ({etat['wallHp']})")
    invoquer.click()
    return etat["faveur"], etat["wallHp"]


def verifier_effet(sc: Scene, mur_avant: int) -> None:
    """Le Trident rend 45 % de la structure à ferveur neutre : ≈ 562 points ici."""
    sc.attendre(
        lambda: sc.etat()["wallHp"] > mur_avant,
        "« Rempart du Trident » n’a rendu aucun point de structure",
    )
    apres = sc.etat()["wallHp"]
    exige(
        apres >= mur_avant + 300,
        f"la réparation est dérisoire pour une ferveur neutre : {mur_avant} → {apres}",
    )
    exige(apres <= MUR_MAX, f"les murs dépassent leur maximum : {apres} > {MUR_MAX}")
    sc.capture("trident-invoque")


def verifier_cooldown(sc: Scene) -> None:
    """Le bouton devient le décompte : c'est la seule façon de savoir qu'on attend."""
    carte = carte_poseidon(sc)
    bouton = carte.locator(".actions-dieu button").first
    sc.attendre(
        lambda: "⏳" in bouton.inner_text(),
        f"le bouton n’affiche pas le cooldown : « {bouton.inner_text()} »",
    )
    exige(not bouton.is_enabled(), "le dieu reste invocable alors que son cooldown court")
    secondes = re.search(r"(\d+)\s*s", bouton.inner_text())
    exige(secondes is not None, f"le cooldown ne s’exprime pas en secondes : « {bouton.inner_text()} »")
    exige(int(secondes.group(1)) > 0, "le cooldown affiché est déjà écoulé")

    etat = sc.etat()
    exige(
        etat["gods"]["poseidon"]["cooldownUntil"] > 0,
        "aucun cooldown n’est enregistré dans la partie",
    )
    sc.capture("cooldown")


def verifier_cout(sc: Scene, faveur_avant: float, mode_test: bool) -> None:
    if mode_test:
        # les coffres se remplissent à chaque battement : le débit est invisible
        exige(sc.etat()["faveur"] > 0, "la faveur devrait rester au maximum en mode test")
        return
    sc.attendre(
        lambda: sc.etat()["faveur"] < faveur_avant,
        f"la faveur n’a pas été dépensée (toujours {faveur_avant})",
    )


if __name__ == "__main__":
    lancer(corps)
