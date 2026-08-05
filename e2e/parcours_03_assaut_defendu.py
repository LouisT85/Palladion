#!/usr/bin/env python3
"""
PARCOURS 3 - UN ASSAUT DÉFENDU, DE BOUT EN BOUT

Le cœur du jeu, et la partie que rien ne vérifiait en entier : on force un
assaut, le bandeau paraît, chaque pan de l'enceinte affiche sa propre jauge de
structure, la bataille se joue seule, et elle se CONCLUT par un rapport.

Le parcours a besoin du mode test (port 5199) pour le bouton « 🧪 Attaque » :
sans lui il faudrait attendre le calendrier - onze minutes pour le premier
assaut d'une partie neuve.

Deux mots sur la MENACE, qui décide du nombre de fronts (`nbFronts` : deux
au-delà de 28). Elle ne se pose pas dans la sauvegarde - `calcThreat` la
recalcule à chaque battement - et deux choses la commandent :

  · la SOMME DES NIVEAUX de bâtiments. Vingt-deux niveaux cumulés donnent ici
    une menace d'environ 38, donc deux colonnes ;
  · la GRÂCE DES PREMIERS ASSAUTS. Tant que le village a vu moins de deux
    batailles, la menace est plafonnée à 6 quoi qu'on bâtisse - le jeu promet
    que les deux premières bandes tâtent le terrain. D'où `stats.repousses`
    posé à 3 : ce village a déjà de l'histoire, et la vague est celle d'un
    règne installé.

Un village plus modeste, ou une partie encore sous la grâce, ferait tomber le
parcours sur un front unique - le multi-front ne serait pas éprouvé.

    python3 e2e/parcours_03_assaut_defendu.py [--port 5199]
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from commun import Scene, armee, exige, habitants, lancer, niveaux, parcours, port_argv, sauvegarde  # noqa: E402

# Remparts de pierre (niveau 3 : 1250 points de structure) et une garnison qui
# doit tenir : le parcours éprouve la MÉCANIQUE de l'assaut, pas la difficulté.
SAVE = sauvegarde(
    buildings=niveaux(
        agora=3, maisons=1, ferme=3, scierie=2, carriere=2, caserne=2, remparts=3, temple=2, forge=2, port=2
    ),
    villageois=habitants("ferme", "scierie", "carriere", "forge", "temple", "port", "ferme"),
    army=armee(lancier=8, archer=10, hoplite=14),
    wallHp=1250,
    tours=1,
    pop=7,
    stats={"repousses": 3, "perdus": 0, "evenements": 0},
)


def corps() -> None:
    with parcours("03-assaut-defendu", save=SAVE, port=port_argv()) as sc:
        forcer_l_assaut(sc)
        lire_le_bandeau(sc)
        lire_les_jauges_par_secteur(sc)
        attendre_le_rapport(sc)


def forcer_l_assaut(sc: Scene) -> None:
    exige(
        "🧪 TEST" in sc.texte(),
        "ce parcours exige le serveur en mode test (npm run dev:test, port 5199)",
    )
    exige(sc.etat()["battle"] is None, "une bataille est déjà en cours au démarrage")
    sc.clic_bouton("🧪 Attaque")
    sc.attendre(lambda: sc.etat()["battle"] is not None, "l’assaut forcé ne se déclenche pas", delai=30)


def lire_le_bandeau(sc: Scene) -> None:
    sc.attendre_visible(".bandeau")
    bandeau = sc.texte_de(".bandeau")
    exige("ASSAUT EN COURS" in bandeau, f"le bandeau n’annonce pas l’assaut : « {bandeau[:90]} »")
    exige("assaillants" in bandeau, "le bandeau ne dit pas combien d’assaillants se présentent")
    # le moral de la troupe et la barre d'ordres font partie du bandeau d'assaut
    exige("rupture sous" in bandeau or "La ligne rompt" in bandeau, "le moral de la troupe n’est pas affiché")
    exige(
        sc.page.locator('[data-tuto="ordres"]').count() > 0,
        "la barre d’ordres de bataille n’est pas là - on ne pourrait que regarder",
    )
    sc.capture("bandeau-assaut")


def lire_les_jauges_par_secteur(sc: Scene) -> None:
    """
    Une jauge par pan assailli, posée à l'aplomb de son mur, portant son nom et
    ses points de structure (« 🧱 1250 / 1250 »). C'est la seule lecture qui dise
    quel pan souffre.
    """
    secteurs = sc.etat()["battle"]["secteurs"]
    exige(secteurs >= 2, f"la vague ne s’est pas répartie sur plusieurs fronts ({secteurs} secteur)")

    jauges = sc.page.locator("svg.carte text").filter(has_text="🧱")
    sc.attendre(
        lambda: jauges.count() >= secteurs,
        f"seules {jauges.count()} jauge(s) de structure pour {secteurs} secteurs assaillis",
    )
    noms = sc.page.locator("svg.carte text")
    exige(
        noms.filter(has_text="Porte de l’est").count() > 0,
        "aucune jauge ne nomme le pan qu’elle mesure",
    )
    sc.capture("jauges-secteurs")


def attendre_le_rapport(sc: Scene) -> None:
    """
    L'assaut doit se CONCLURE. C'est la promesse la plus facile à casser : une
    bataille qui ne se termine jamais laisse le joueur devant une carte figée.
    """
    sc.attendre(
        lambda: sc.etat()["battle"] is None,
        "l’assaut ne se conclut jamais",
        delai=180,
    )
    sc.attendre(
        lambda: sc.etat()["battleReport"] is not None,
        "l’assaut s’achève sans rapport de bataille",
        delai=30,
    )
    titre = sc.texte_de(".voile .modale h2")
    exige(titre.strip() != "", "le rapport de bataille n’a pas de titre")
    sc.capture("rapport-bataille")

    # le rapport se referme, et la vie reprend
    sc.clic_bouton("Gloire au village !") if "Gloire au village" in sc.texte() else sc.clic_bouton("Panser les plaies")
    sc.attendre(
        lambda: sc.etat()["battleReport"] is None,
        "le rapport de bataille ne se referme pas",
    )


if __name__ == "__main__":
    lancer(corps)
