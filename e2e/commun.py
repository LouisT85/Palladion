#!/usr/bin/env python3
"""
═══════════════════════ LE SOCLE DES PARCOURS E2E ═══════════════════════

Les tests vitest éprouvent le moteur ; personne n'éprouvait le CHEMIN - cliquer
un bâtiment, voir le panneau s'ouvrir, lancer un chantier, réclamer une mission.
C'est ce que font les parcours de ce dossier, dans un vrai Chromium, sur le vrai
serveur vite.

Quatre choses portent tout le reste :

 · LA SITUATION DE DÉPART s'injecte dans `localStorage` AVANT le script de
   l'app, jamais après : le store lit sa sauvegarde une seule fois, dans
   `init()`, et une écriture qui arrive après ce moment n'a plus aucun effet.
   Un drapeau de `sessionStorage` garantit qu'un rechargement de page (parcours
   des sauvegardes) ne réinjecte pas la situation initiale par-dessus ce que la
   partie vient d'écrire.

 · LA MOINDRE ERREUR JS FAIT ÉCHOUER LE PARCOURS. On écoute `pageerror` (les
   exceptions non rattrapées) ET la console de niveau `error` - un `undefined.x`
   dans un composant React vide la page sans lever quoi que ce soit d'observable
   autrement.

 · LES CLICS SUR LA CARTE passent par le repère du MONDE (le viewBox 1200×800).
   La carte se met à l'échelle de la fenêtre et la caméra la déplace : une
   coordonnée écran codée en dur ne vaudrait rien. On demande donc au navigateur
   la matrice du groupe « scène » et on l'applique au point voulu.

 · ON ATTEND DES CONDITIONS, pas des durées. Un `sleep` fixe est soit trop
   court sur une machine chargée, soit du temps perdu à chaque exécution.

Chaque parcours est un script autonome qui imprime `OK` ou `ÉCHEC: raison` et
rend un code de sortie. `scripts/e2e.py` les enchaîne.
"""

from __future__ import annotations

import json
import os
import sys
import time
import traceback
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Callable, Iterator

from playwright.sync_api import Page, sync_playwright

RACINE = Path(__file__).resolve().parent.parent
CAPTURES = RACINE / "e2e" / "captures"

PORT_DEFAUT = os.environ.get("PALLADION_PORT", "5199")
"""5199 est le serveur en `--mode test` : ressources illimitées, chantiers de
1,5 s, bouton « Attaque forcée ». Sans lui, un parcours d'assaut attendrait le
calendrier pendant vingt minutes."""

VUE = {"width": 1500, "height": 950}
"""Assez large pour que le HUD affiche ses libellés (ils s'effacent sous 1100 px)
et que les grands panneaux tiennent sans défilement."""

JOUR_MS = 8 * 60_000
"""Une journée de jeu en millisecondes réelles - doit suivre DAY_MS de data.ts."""

TICK_MS = 250
"""Le battement du store. Deux battements suffisent pour qu'une action se voie."""

DELAI = 20.0
"""Plafond d'attente par défaut, en secondes. Large exprès : une machine
chargée met plusieurs secondes à monter React et l'art SVG."""

# ─────────────────────────────────────────────────────────────────────────────
# Erreurs de console tolérées
#
# La consigne est stricte - toute erreur JS fait échouer -, mais deux familles de
# messages ne parlent pas du jeu : le bruit de l'outillage vite en développement,
# et l'AudioContext que Chromium refuse d'ouvrir sans geste utilisateur. Les
# laisser échouer rendrait la suite inutilisable sans rien apprendre.
# ─────────────────────────────────────────────────────────────────────────────
BRUIT_TOLERE = (
    "AudioContext",
    "play() failed",
    "[vite]",
    "Download the React DevTools",
    "favicon",
)


class Echec(Exception):
    """Un parcours qui n'a pas tenu ses promesses. Le message est la raison."""


def exige(condition: Any, raison: str) -> None:
    """Assertion des parcours : lisible dans le rapport, et rien de plus."""
    if not condition:
        raise Echec(raison)


# ─────────────────────────────────────────────────────────────────────────────
# Fabriques de situations de départ
#
# `init()` FUSIONNE l'état initial avec ce que le fichier contient : il suffit
# donc de décrire ce qui doit changer. Tout le reste - villageois engendrés,
# tables de bâtiments complétées, désinfection des nombres - est fait par la
# migration du store, et c'est très bien : on éprouve aussi ce chemin-là.
# ─────────────────────────────────────────────────────────────────────────────

NOMS = ["Danaé", "Nestor", "Léto", "Damon", "Théano", "Phorbas", "Iphis", "Kréon", "Myrrha", "Glaukos"]


def ms() -> int:
    return int(time.time() * 1000)


def sauvegarde(**champs: Any) -> dict[str, Any]:
    """
    Une partie posée « au calme » : deux journées de règne, au matin, au
    printemps, sans rien qui s'invite à l'écran.

    Les échéances lointaines ne sont pas de la coquetterie. Un dilemme, un appel
    au secours ou une naissance qui tombe au milieu d'un parcours ouvre une
    modale par-dessus ce qu'on est en train d'affirmer, et le parcours échoue
    pour une raison qui n'a rien à voir avec ce qu'il éprouve.
    """
    now = ms()
    base: dict[str, Any] = {
        # jour 3, phase 0,3 : matinée franche, printemps, mer ouverte
        "createdAt": now - int(JOUR_MS * 2.3),
        "lastSeen": now,
        "mode": "bac-a-sable",
        # la leçon de Zeus est passée : sans cela le masque du tutoriel avale
        # tous les clics hors de ses cibles
        "tutoriel": None,
        "tutorialDone": True,
        # aucun dilemme avant soixante secondes de jeu (voir le tick)
        "lastEventAt": now,
        "eventCooldowns": {},
        "nextAttackAt": now + 30 * 60_000,
        "warned": False,
        "incomingWave": None,
        "nextPopAt": now + 30 * 60_000,
        "prochainAppelAt": now + 60 * 60_000,
        "rappelHerosAt": now + 60 * 60_000,
        "prochainReleveAt": now + 60_000,
        "saison": "printemps",
        "meteo": "clair",
        "meteoJusqua": now + 30 * 60_000,
        "morale": 60,
        "vitesse": 1,
    }
    base.update(champs)
    return base


def niveaux(**kw: int) -> dict[str, dict[str, int]]:
    """`niveaux(agora=1, ferme=1)` → la table de bâtiments correspondante."""
    return {b: {"level": n} for b, n in kw.items()}


def habitants(*metiers: str) -> list[dict[str, Any]]:
    """
    Une population NOMMÉE et déterministe. Sans cela, les villageois sont tirés
    au sort à la reprise : un parcours qui affecte « le paysan » tomberait un
    jour sur un village sans paysan.

    `neLe` est calé pour donner des adultes de trente ans au jour 3 (une journée
    de jeu vaut deux ans) : ni enfants inemployables, ni vieillards mortels.
    """
    return [
        {
            "id": f"v{i}",
            "nom": NOMS[i % len(NOMS)],
            "poste": None,
            "metier": m,
            "neLe": -12 - i,
            "lignee": f"Fils d’{NOMS[i % len(NOMS)]}",
        }
        for i, m in enumerate(metiers)
    ]


def armee(**kw: int) -> dict[str, int]:
    """Effectifs complets : une clé manquante ferait un NaN dans les sommes."""
    base = {"lancier": 0, "archer": 0, "hoplite": 0, "frondeur": 0, "peltaste": 0, "belier": 0}
    base.update(kw)
    return base


def dieux(**kw: int) -> dict[str, dict[str, int]]:
    """Relations aux quatre Olympiens, cooldowns à zéro."""
    return {
        g: {"relation": kw.get(g, 0), "cooldownUntil": 0}
        for g in ("zeus", "poseidon", "athena", "ares")
    }


# ─────────────────────────────────────────────────────────────────────────────
# La scène : une page, ses erreurs, et de quoi la piloter
# ─────────────────────────────────────────────────────────────────────────────


class Scene:
    def __init__(self, page: Page, nom: str) -> None:
        self.page = page
        self.nom = nom
        self.erreurs: list[str] = []
        self._captures = 0

    # ── erreurs JS ───────────────────────────────────────────────────────────

    def brancher_erreurs(self) -> None:
        def retenir(msg: str) -> None:
            if any(b in msg for b in BRUIT_TOLERE):
                return
            self.erreurs.append(msg.strip().replace("\n", " ")[:400])

        self.page.on("pageerror", lambda e: retenir(f"exception : {e}"))
        self.page.on(
            "console",
            lambda m: retenir(f"console.error : {m.text}") if m.type == "error" else None,
        )

    def verifier_erreurs(self) -> None:
        if self.erreurs:
            raise Echec(f"{len(self.erreurs)} erreur(s) JS - {self.erreurs[0]}")

    # ── attentes ─────────────────────────────────────────────────────────────

    def attendre(self, predicat: Callable[[], bool], raison: str, delai: float = DELAI) -> None:
        """
        Attend qu'une condition PYTHON soit vraie, en surveillant les erreurs JS
        au passage : un parcours ne doit pas expirer pendant vingt secondes alors
        que la page s'est vidée à la première seconde.
        """
        fin = time.time() + delai
        while time.time() < fin:
            self.verifier_erreurs()
            try:
                if predicat():
                    return
            except Echec:
                raise
            except Exception:
                # la page se réécrit sous nos pieds : on retente au tour suivant
                pass
            self.page.wait_for_timeout(120)
        self.verifier_erreurs()
        raise Echec(f"délai dépassé ({delai:.0f} s) - {raison}")

    def attendre_texte(self, texte: str, raison: str | None = None, delai: float = DELAI) -> None:
        self.attendre(
            lambda: texte in self.texte(),
            raison or f"le texte « {texte} » n’est jamais apparu",
            delai,
        )

    def attendre_visible(self, selecteur: str, delai: float = DELAI) -> None:
        self.attendre(
            lambda: self.page.locator(selecteur).count() > 0
            and self.page.locator(selecteur).first.is_visible(),
            f"« {selecteur} » n’est jamais devenu visible",
            delai,
        )

    def respirer(self, battements: int = 2) -> None:
        """Laisse passer quelques battements du store, puis contrôle les erreurs."""
        self.page.wait_for_timeout(TICK_MS * battements)
        self.verifier_erreurs()

    # ── lecture ──────────────────────────────────────────────────────────────

    def texte(self) -> str:
        """
        Tout le texte visible de la page, apostrophes typographiques incluses.

        ⚠️ `innerText` applique les `text-transform` de la feuille de style : le
        compteur du tutoriel porte « Zeus - 1 / 15 » dans le DOM et se lit ici
        « ZEUS - 1 / 15 ». Pour affirmer sur un libellé mis en capitales par le
        CSS, passer par `texte_de`.
        """
        return self.page.locator("body").inner_text()

    def contient(self, texte: str) -> bool:
        return texte in self.texte()

    def texte_de(self, selecteur: str) -> str:
        """Le `textContent` d'un élément : ce que le DOM porte, sans mise en forme."""
        cible = self.page.locator(selecteur).first
        exige(cible.count() > 0, f"« {selecteur} » est absent de la page")
        return cible.text_content() or ""

    def etat(self) -> dict[str, Any]:
        """
        L'état du store, en LECTURE seule. `window.__palladion` n'existe qu'en
        développement (voir la fin de store.ts) ; `scripts/captures.mjs` s'en
        sert déjà. On ne s'en sert JAMAIS pour agir - un parcours qui appellerait
        les actions du store n'éprouverait plus l'interface.
        """
        etat = self.page.evaluate(self._LIRE_ETAT)
        exige(etat is not None, "le store n’est pas exposé (window.__palladion) - serveur en production ?")
        return etat

    _LIRE_ETAT = """
    () => {
      const g = window.__palladion
      const s = g && g.getState()
      if (!s) return null
      return JSON.parse(JSON.stringify({
        mode: s.mode,
        tutoriel: s.tutoriel,
        panel: s.panel,
        pop: s.pop,
        faveur: s.faveur,
        wallHp: s.wallHp,
        threat: s.threat,
        vitesse: s.vitesse,
        resources: s.resources,
        buildings: s.buildings,
        army: s.army,
        gods: s.gods,
        missionsReclamees: s.missionsReclamees,
        battle: s.battle ? { breche: s.battle.breche, secteurs: s.battle.secteurs.length } : null,
        battleReport: s.battleReport ? { titre: s.battleReport.titre } : null,
        expedition: s.expedition ? { fini: !!s.expedition.result } : null,
        expeditions: s.expeditions,
        villageois: s.villageois.map((v) => ({ id: v.id, nom: v.nom, metier: v.metier, poste: v.poste })),
      }))
    }"""

    # ── carte : monde → écran ────────────────────────────────────────────────

    _CTM_SCENE = """
    ([x, y]) => {
      const svg = document.querySelector('svg.carte')
      if (!svg) return null
      // on remonte depuis un emplacement de bâtiment jusqu'au groupe « scène » :
      // c'est LUI qui porte la transformation de caméra, et son repère est le
      // repère du monde (les emplacements y sont posés en coordonnées 1200×800)
      let g = svg.querySelector('[data-tuto^="carte-"]')
      if (!g) return null
      while (g.parentNode && g.parentNode !== svg) g = g.parentNode
      const m = g.getScreenCTM()
      if (!m) return null
      const p = svg.createSVGPoint()
      p.x = x
      p.y = y
      const q = p.matrixTransform(m)
      return { x: q.x, y: q.y }
    }"""

    _CTM_ELEMENT = """
    ([sel, dx, dy]) => {
      const el = document.querySelector(sel)
      if (!el || !el.getScreenCTM) return null
      const m = el.getScreenCTM()
      if (!m) return null
      const p = el.ownerSVGElement.createSVGPoint()
      p.x = dx
      p.y = dy
      const q = p.matrixTransform(m)
      return { x: q.x, y: q.y }
    }"""

    def point_monde(self, x: float, y: float) -> dict[str, float]:
        """Convertit un point du viewBox 1200×800 en point écran."""
        pt = self.page.evaluate(self._CTM_SCENE, [x, y])
        exige(pt is not None, f"carte introuvable : impossible de viser ({x}, {y})")
        return pt

    def clic_monde(self, x: float, y: float) -> None:
        pt = self.point_monde(x, y)
        self.page.mouse.click(pt["x"], pt["y"])

    def clic_batiment(self, id_batiment: str) -> None:
        """
        Clique l'emplacement d'un bâtiment. On vise le point (0, −4) de son
        repère local - le centre de l'ellipse de préhension - et non le centre du
        cadre englobant : celui-ci enferme les étiquettes et les écriteaux, et
        tombe parfois dans un trou transparent où le clic ne touche rien.
        """
        pt = self.page.evaluate(self._CTM_ELEMENT, [f'[data-tuto="carte-{id_batiment}"]', 0, -4])
        exige(pt is not None, f"l’emplacement « {id_batiment} » n’est pas sur la carte")
        self.page.mouse.click(pt["x"], pt["y"])

    # ── clics ────────────────────────────────────────────────────────────────

    def clic(self, selecteur: str, delai: float = DELAI) -> None:
        self.attendre_visible(selecteur, delai)
        self.page.locator(selecteur).first.click()

    def clic_bouton(self, libelle: str, delai: float = DELAI, exact: bool = False) -> None:
        """
        Clique un bouton par son libellé. Les textes du jeu portent des
        apostrophes typographiques ’ : on les écrit telles quelles dans les
        parcours, jamais en ASCII.
        """
        bouton = self.page.get_by_role("button", name=libelle, exact=exact)
        self.attendre(
            lambda: bouton.count() > 0 and bouton.first.is_visible() and bouton.first.is_enabled(),
            f"bouton « {libelle} » indisponible",
            delai,
        )
        bouton.first.click()

    def echap(self) -> None:
        self.page.keyboard.press("Escape")

    # ── captures ─────────────────────────────────────────────────────────────

    def capture(self, nom: str) -> Path:
        """
        Une image dans `e2e/captures/`, préfixée par son rang : lues dans
        l'ordre alphabétique, les captures d'un parcours en racontent le film.
        """
        CAPTURES.mkdir(parents=True, exist_ok=True)
        self._captures += 1
        chemin = CAPTURES / f"{self.nom}-{self._captures:02d}-{nom}.png"
        self.page.screenshot(path=str(chemin))
        return chemin


# ─────────────────────────────────────────────────────────────────────────────
# Ouverture d'un parcours
# ─────────────────────────────────────────────────────────────────────────────


def _script_injection(save: dict[str, Any] | None) -> str:
    """
    Pose la situation de départ AVANT le script de l'app - `add_init_script`
    s'exécute sur chaque document, donc aussi après un rechargement. Le drapeau
    de `sessionStorage` fait que la sauvegarde n'est écrite QU'UNE FOIS : sans
    lui, le parcours des sauvegardes réécrirait la situation initiale par-dessus
    ce que la partie vient d'enregistrer, et ne prouverait plus rien.
    """
    if save is None:
        # partie neuve : on s'assure qu'aucun emplacement ne traîne
        return (
            "(() => { try { localStorage.removeItem('palladion-save-v1');"
            " localStorage.removeItem('palladion-save-v1-2');"
            " localStorage.removeItem('palladion-save-v1-3');"
            " localStorage.removeItem('palladion-emplacement') } catch {} })()"
        )
    return (
        "(() => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s','1');"
        f" localStorage.setItem('palladion-save-v1', JSON.stringify({json.dumps(save)}))"
        " } })()"
    )


@contextmanager
def parcours(
    nom: str,
    save: dict[str, Any] | None = None,
    port: str | None = None,
    montre: bool | None = None,
) -> Iterator[Scene]:
    """
    Ouvre un navigateur sur le jeu, situation de départ posée, modales d'accueil
    refermées, et rend la scène. À la sortie, la moindre erreur JS survenue en
    chemin fait échouer le parcours - même si toutes les assertions ont tenu.
    """
    port = port or port_argv()
    # `--montre` ouvre une fenêtre : c'est ainsi qu'on regarde un parcours échouer
    montre = ("--montre" in sys.argv) if montre is None else montre
    with sync_playwright() as p:
        navigateur = p.chromium.launch(headless=not montre)
        contexte = navigateur.new_context(viewport=VUE, locale="fr-FR")
        page = contexte.new_page()
        scene = Scene(page, nom)
        scene.brancher_erreurs()
        page.add_init_script(_script_injection(save))
        try:
            page.goto(f"http://localhost:{port}/", wait_until="domcontentloaded")
            _accueil(scene, neuve=save is None)
            yield scene
            scene.verifier_erreurs()
        finally:
            try:
                scene.capture("fin")
            except Exception:
                pass
            contexte.close()
            navigateur.close()


def _accueil(scene: Scene, neuve: bool) -> None:
    """
    Ce qui se met en travers du chemin au démarrage.

    · l'écran de choix du mode - seulement sur une partie neuve, et c'est le
      parcours 1 qui l'éprouve : ici on ne le referme donc PAS ;
    · « pendant votre absence », que `lastSeen` au présent évite normalement,
      mais qu'une machine lente peut faire surgir tout de même.
    """
    scene.attendre(
        lambda: scene.page.locator(".app").count() > 0,
        "le châssis de l’application ne s’est jamais monté",
    )
    if neuve:
        return
    scene.attendre(
        lambda: scene.page.locator("svg.carte").count() > 0,
        "la carte du village ne s’est jamais affichée",
    )
    # la fenêtre hors-ligne, si elle s'est invitée
    if scene.contient("Pendant votre absence"):
        scene.clic_bouton("Reprendre le règne")
    scene.respirer()


# ─────────────────────────────────────────────────────────────────────────────
# Lanceur d'un parcours autonome
# ─────────────────────────────────────────────────────────────────────────────


def lancer(corps: Callable[[], None]) -> None:
    """
    Enveloppe le `main` d'un parcours : imprime `OK` ou `ÉCHEC: raison`, et rend
    un code de sortie que `scripts/e2e.py` sait lire.
    """
    debut = time.time()
    try:
        corps()
    except Echec as e:
        print(f"ÉCHEC: {e}")
        sys.exit(1)
    except Exception as e:  # noqa: BLE001 - un pépin d'outillage n'est pas un succès
        print(f"ÉCHEC: {type(e).__name__} - {e}")
        traceback.print_exc(file=sys.stderr)
        sys.exit(2)
    print(f"OK ({time.time() - debut:.1f} s)")
    sys.exit(0)


def port_argv() -> str:
    """`--port 5197` en ligne de commande, sinon la variable, sinon 5199."""
    argv = sys.argv
    if "--port" in argv:
        i = argv.index("--port")
        if i + 1 < len(argv):
            return argv[i + 1]
    return PORT_DEFAUT
