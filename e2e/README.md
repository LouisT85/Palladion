# Les parcours de bout en bout

Les 344 tests `vitest` éprouvent le **moteur** : la production au prorata des
postes, la résolution d'une mêlée, l'arbre de faveur. Aucun ne clique. Rien ne
garantissait qu'un joueur puisse **aller** de l'écran d'accueil à sa première
récolte, ni qu'un assaut se **termine** par un rapport plutôt que par une carte
figée.

C'est ce que fait ce dossier : sept parcours, dans un vrai Chromium, sur le vrai
serveur vite, qui **affirment** des textes et des compteurs — pas seulement des
clics.

Playwright **en Python**, comme `scripts/apercu.py`. Aucune dépendance npm
ajoutée : ni `@playwright/test`, ni runner JS.

---

## Lancer

```bash
# le serveur doit tourner - le mode test est celui que les parcours attendent
npm run dev:test -- --port 5199 --strictPort

python3 scripts/e2e.py                    # les sept parcours
python3 scripts/e2e.py --port 5197        # sur le serveur normal (voir plus bas)
python3 scripts/e2e.py --parcours assaut  # ceux dont le nom contient « assaut »
python3 scripts/e2e.py --montre           # navigateur visible, pour regarder
```

Chaque parcours est aussi **exécutable seul**, imprime `OK (durée)` ou
`ÉCHEC: raison`, et rend un code de sortie :

```bash
python3 e2e/parcours_03_assaut_defendu.py --port 5199
```

Le lanceur rend `0` si tout passe, `1` si un parcours échoue, `3` si le serveur
n'est pas debout ou si le filtre ne trouve rien.

### Pourquoi le port 5199

Le serveur `--mode test` accorde trois choses sans lesquelles la suite serait
inutilisable : **ressources illimitées** (aucun parcours n'a à cultiver du grain
avant de bâtir), **chantiers de 1,5 s** au lieu de plusieurs minutes, et le
bouton **« 🧪 Attaque »** qui déclenche un assaut en trois secondes — au
calendrier, le premier assaut d'une partie neuve arrive au bout de onze minutes.

Deux parcours changent de comportement selon le mode et le disent eux-mêmes :

- **03 assaut défendu** exige le mode test (il refuse de tourner sans, plutôt que
  d'attendre onze minutes) ;
- **05 panthéon** n'affirme la **dépense de faveur** que hors mode test : le tick
  y remet les coffres au maximum à chaque battement, le débit est donc invisible.
  L'effet de la bénédiction et le cooldown, eux, sont vérifiés dans les deux
  modes.

---

## Les sept parcours

| # | Fichier | Ce qu'il prouve |
|---|---|---|
| 1 | `parcours_01_premiere_partie.py` | Page neuve → écran de choix du mode → bac à sable → la leçon de Zeus démarre à son étape 1 → la ferme se bâtit par la carte puis le panneau → la leçon valide seule le geste → « Le pain d'abord » devient réclamable → on réclame. |
| 2 | `parcours_02_economie_postes.py` | Un atelier désert plante son écriteau « sans paysan » sur la carte ; le recensement compte les bras libres et les postes vacants ; affecter un habitant fait passer le rendement de la ferme de 0 % à 100 % et **retire l'écriteau**. |
| 3 | `parcours_03_assaut_defendu.py` | Assaut forcé → le bandeau annonce l'assaut, le moral et la barre d'ordres → **une jauge de structure par pan assailli**, nommée et chiffrée → la bataille se conclut par un rapport, qui se referme. |
| 4 | `parcours_04_expedition.py` | Carte de la Troade → on ne part pas les mains vides (bouton éteint) → composition d'une colonne d'hoplites → la scène de bataille se joue → rapport de raid étoilé, et l'étoile est **enregistrée dans la partie**. |
| 5 | `parcours_05_pantheon.py` | « Rempart du Trident » rend vraiment des points de structure aux murailles, la faveur est dépensée (hors mode test), et le bouton devient un décompte en secondes. |
| 6 | `parcours_06_sauvegardes.py` | Les trois emplacements se lisent (jour, habitants, niveaux bâtis) ; une affectation est enregistrée ; un **vrai rechargement de page** la ramène, avec le mode de jeu et les bâtiments. |
| 7 | `parcours_07_reset_et_plein_ecran.py` | Le plein écran bascule et sait revenir. Abandonner la cité ramène à l'écran de choix du mode **sans que Zeus s'affiche par-dessus** (régression déjà survenue). |

Les captures d'écran d'un passage tombent dans `e2e/captures/`, préfixées par
leur rang : lues dans l'ordre alphabétique, elles racontent le film du parcours.
Elles ne sont pas versionnées.

---

## Ce que `commun.py` porte

### La situation de départ, injectée avant l'app

Le store lit sa sauvegarde **une seule fois**, dans `init()`. Une écriture dans
`localStorage` qui arrive après ce moment n'a plus aucun effet — d'où
`add_init_script`, qui s'exécute avant le script de la page.

Un drapeau de `sessionStorage` fait que la fixture n'est écrite **qu'une fois**.
C'est ce qui rend le parcours des sauvegardes honnête : sans lui, le
rechargement réinjecterait la situation de départ et l'on relirait sa propre
fixture au lieu de ce que la partie a enregistré.

`init()` **fusionne** l'état initial avec le fichier : une fixture n'a donc à
décrire que ce qui change. Tout le reste — villageois engendrés, tables de
bâtiments complétées, nombres désinfectés — est fait par la migration du store,
et c'est très bien : on éprouve ce chemin-là aussi.

Trois pièges que les fabriques de `commun.py` désamorcent, et qu'il faut
connaître avant d'écrire une nouvelle fixture :

- **les échéances lointaines** (`lastEventAt`, `prochainAppelAt`,
  `rappelHerosAt`, `nextPopAt`) ne sont pas de la coquetterie : un dilemme ou un
  appel au secours qui tombe en cours de parcours ouvre une modale par-dessus ce
  qu'on affirme, et le parcours échoue pour une raison qui n'a rien à voir ;
- **`tutoriel: None` + `tutorialDone: True`** : le masque de la leçon de Zeus
  avale, en phase de capture, tout clic hors de ses cibles. Seul le parcours 1
  joue avec la leçon ;
- **la menace ne se pose pas** : `calcThreat` la recalcule à chaque battement,
  depuis la somme des niveaux de bâtiments, et la plafonne à 6 tant que le
  village a vu moins de deux batailles (« grâce des premiers assauts »). Pour
  obtenir un assaut sur plusieurs fronts, il faut donc une **cité étoffée** et
  `stats.repousses` déjà crédité — voir le parcours 3.

### La moindre erreur JS fait échouer

On écoute `pageerror` (les exceptions non rattrapées) **et** la console de niveau
`error` : un `undefined.x` dans un composant React vide la page sans rien lever
d'observable autrement. Deux familles de messages sont tolérées parce qu'elles ne
parlent pas du jeu — le bruit de l'outillage vite, et l'`AudioContext` que
Chromium refuse d'ouvrir sans geste utilisateur (voir `BRUIT_TOLERE`).

Les attentes surveillent les erreurs **pendant** qu'elles attendent : un parcours
n'expire pas au bout de vingt secondes alors que la page s'est vidée à la
première.

### Cliquer sur la carte

Le SVG a un `viewBox` de 1200 × 800, se met à l'échelle de la fenêtre, et la
caméra le déplace : une coordonnée écran codée en dur ne vaudrait rien. On demande
donc au navigateur la matrice (`getScreenCTM`) du **groupe « scène »** — dont le
repère utilisateur *est* le repère du monde — et on l'applique au point visé.

```python
sc.clic_monde(905, 445)     # la porte de l'est, en coordonnées du monde
sc.clic_batiment("ferme")   # le point de préhension de l'emplacement
```

`clic_batiment` vise le point `(0, −4)` du repère local de l'emplacement —
le centre de son ellipse de préhension — et non le centre du cadre englobant :
celui-ci enferme étiquettes et écriteaux, et tombe parfois dans un trou
transparent où le clic ne touche rien.

### Lire

- `sc.texte()` — `innerText` de la page. ⚠️ Il applique les `text-transform` du
  CSS : le compteur du tutoriel porte « Zeus - 1 / 15 » dans le DOM et se lit
  « ZEUS - 1 / 15 ». Pour affirmer sur un libellé mis en capitales par la
  feuille de style, passer par `sc.texte_de(selecteur)`, qui rend le
  `textContent`.
- `sc.etat()` — l'état du store, **en lecture seule**. `window.__palladion`
  n'existe qu'en développement (fin de `store.ts`) ; `scripts/captures.mjs` s'en
  sert déjà. Les parcours ne s'en servent **jamais pour agir** : appeler les
  actions du store n'éprouverait plus l'interface, qui est tout le sujet.

### Attendre

`sc.attendre(predicat, raison)`, `sc.attendre_texte`, `sc.attendre_visible` — des
conditions, jamais un `sleep`. Un délai fixe est soit trop court sur une machine
chargée, soit du temps perdu à chaque exécution. `sc.respirer()` ne sert qu'à
laisser passer deux ou trois battements du store quand il n'y a rien de précis à
guetter.

---

## Écrire un huitième parcours

```python
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from commun import Scene, armee, exige, habitants, lancer, niveaux, parcours, port_argv, sauvegarde

SAVE = sauvegarde(
    buildings=niveaux(agora=2, ferme=1),
    villageois=habitants("ferme", "scierie", "carriere", "forge", "temple", "port", "ferme"),
    army=armee(lancier=2),
    pop=7,
)


def corps() -> None:
    with parcours("08-mon-parcours", save=SAVE, port=port_argv()) as sc:
        sc.clic_bouton("📈 Annales")
        sc.attendre_texte("Annales du règne", "les annales ne s’ouvrent pas")
        exige(sc.page.locator("svg").count() > 0, "aucune courbe tracée")
        sc.capture("annales")


if __name__ == "__main__":
    lancer(corps)
```

Le fichier doit s'appeler `parcours_<nn>_<sujet>.py` : `scripts/e2e.py` le
ramasse tout seul.

**La règle qui vaut plus que les autres** : chaque parcours doit *affirmer*.
Une suite de clics qui ne vérifie rien passe même quand le jeu est cassé, et
c'est pire que pas de test — elle donne confiance à tort.
