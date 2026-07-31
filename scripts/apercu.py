#!/usr/bin/env python3
"""Capture d'un aperçu d'art : python3 scripts/apercu.py <cible> <sortie.png> [port] [params]
Exemple : python3 scripts/apercu.py temple /tmp/temple.png 5197 "z=2.6"
Le serveur vite doit tourner (npm run dev -- --port <port>)."""
import sys
from playwright.sync_api import sync_playwright

cible = sys.argv[1]
sortie = sys.argv[2]
port = sys.argv[3] if len(sys.argv) > 3 else "5197"
extra = ("&" + sys.argv[4]) if len(sys.argv) > 4 else ""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1600, "height": 900})
    err = []
    pg.on("pageerror", lambda e: err.append(str(e)))
    pg.goto(f"http://localhost:{port}/?apercu={cible}{extra}")
    pg.wait_for_timeout(1200)
    pg.screenshot(path=sortie)
    b.close()
    if err:
        print("ERREURS JS:", err)
        sys.exit(1)
    print(f"ok -> {sortie}")
