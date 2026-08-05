#!/usr/bin/env python3
"""
LE LANCEUR DES PARCOURS DE BOUT EN BOUT

    python3 scripts/e2e.py                       # tous les parcours, port 5199
    python3 scripts/e2e.py --port 5197           # sur le serveur normal
    python3 scripts/e2e.py --parcours assaut     # celui dont le nom contient « assaut »
    python3 scripts/e2e.py --montre              # navigateur visible, pour regarder

Le serveur vite doit tourner. Le port 5199 est celui du MODE TEST
(`npm run dev:test -- --port 5199`) : ressources illimitées, chantiers de 1,5 s,
bouton « Attaque forcée ». Plusieurs parcours en dépendent - un assaut attendu au
calendrier prendrait onze minutes.

Chaque parcours est un processus à part. Ce n'est pas une coquetterie : un
Chromium qui s'effondre, une fuite de contexte ou un `sys.exit` n'emporte alors
que son propre parcours, et le tableau récapitulatif reste lisible.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
DOSSIER = RACINE / "e2e"

VERT = "\033[32m"
ROUGE = "\033[31m"
GRIS = "\033[90m"
FORT = "\033[1m"
FIN = "\033[0m"


def parcours_disponibles(filtre: str | None) -> list[Path]:
    fichiers = sorted(DOSSIER.glob("parcours_*.py"))
    if filtre:
        fichiers = [f for f in fichiers if filtre.lower() in f.stem.lower()]
    return fichiers


def nom_lisible(fichier: Path) -> str:
    """`parcours_03_assaut_defendu.py` → « 03 assaut defendu »."""
    return re.sub(r"^parcours_", "", fichier.stem).replace("_", " ")


def serveur_debout(port: str) -> bool:
    try:
        with urllib.request.urlopen(f"http://localhost:{port}/", timeout=4) as r:
            return r.status == 200
    except (urllib.error.URLError, OSError):
        return False


def executer(fichier: Path, port: str, montre: bool) -> tuple[int, float, str]:
    """
    Lance un parcours et rend (code, durée, dernière ligne utile). La sortie
    standard du parcours se termine par `OK (…)` ou `ÉCHEC: raison` : c'est cette
    ligne-là qui remplit le tableau.
    """
    argv = [sys.executable, str(fichier), "--port", port] + (["--montre"] if montre else [])
    debut = time.time()
    proc = subprocess.run(argv, capture_output=True, text=True, cwd=str(RACINE))
    duree = time.time() - debut
    lignes = [l.strip() for l in proc.stdout.splitlines() if l.strip()]
    verdict = lignes[-1] if lignes else (proc.stderr.strip().splitlines() or ["aucune sortie"])[-1]
    return proc.returncode, duree, verdict


def main() -> int:
    ap = argparse.ArgumentParser(description="Parcours de bout en bout de PALLADION.")
    ap.add_argument("--port", default="5199", help="port du serveur vite (défaut : 5199, le mode test)")
    ap.add_argument("--parcours", default=None, help="ne lancer que les parcours dont le nom contient ceci")
    ap.add_argument("--montre", action="store_true", help="navigateur visible")
    args = ap.parse_args()

    if not serveur_debout(args.port):
        print(f"{ROUGE}Aucun serveur sur le port {args.port}.{FIN}")
        print(f"  {GRIS}mode test  : npm run dev:test -- --port 5199 --strictPort{FIN}")
        print(f"  {GRIS}mode normal: npm run dev -- --port 5197 --strictPort{FIN}")
        return 3

    fichiers = parcours_disponibles(args.parcours)
    if not fichiers:
        print(f"{ROUGE}Aucun parcours ne correspond à « {args.parcours} ».{FIN}")
        return 3

    print(f"{FORT}PALLADION - {len(fichiers)} parcours sur le port {args.port}{FIN}\n")
    resultats: list[tuple[str, int, float, str]] = []
    for f in fichiers:
        nom = nom_lisible(f)
        print(f"{GRIS}▸ {nom}…{FIN}", flush=True)
        code, duree, verdict = executer(f, args.port, args.montre)
        resultats.append((nom, code, duree, verdict))
        marque = f"{VERT}OK{FIN}" if code == 0 else f"{ROUGE}ÉCHEC{FIN}"
        print(f"  {marque} {GRIS}{duree:.1f} s{FIN}")

    largeur = max(len(n) for n, _, _, _ in resultats)
    print(f"\n{FORT}{'PARCOURS'.ljust(largeur)}  ÉTAT   DURÉE   DÉTAIL{FIN}")
    print(GRIS + "─" * (largeur + 40) + FIN)
    for nom, code, duree, verdict in resultats:
        etat = f"{VERT}  OK {FIN}" if code == 0 else f"{ROUGE}ÉCHEC{FIN}"
        detail = verdict if code != 0 else ""
        print(f"{nom.ljust(largeur)}  {etat}  {duree:5.1f}s  {detail}")

    echecs = [n for n, c, _, _ in resultats if c != 0]
    print()
    if echecs:
        print(f"{ROUGE}{FORT}{len(echecs)} parcours en échec : {', '.join(echecs)}{FIN}")
        print(f"{GRIS}Captures d’écran : e2e/captures/ (une par étape, dans l’ordre){FIN}")
        return 1
    n = len(resultats)
    print(f"{VERT}{FORT}{'Le parcours passe.' if n == 1 else f'Les {n} parcours passent.'}{FIN}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
