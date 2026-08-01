# PALLADION — feuille de route

État au 1<sup>er</sup> août 2026.

**Comment lire ce document.** Il est organisé par **priorité** puis par **domaine**, et non par
ordre chronologique : ce qui est en haut est ce qu'il faut faire ensuite. Chaque entrée à venir
porte une estimation d'**effort** (S / M / L / XL) et d'**impact joueur** (★ à ★★★).
L'historique des lots livrés est relégué en fin de document, pour mémoire.

---

## 📍 Où en est le jeu, en un coup d'œil

| Domaine | État | Reste à faire |
|---|---|---|
| Boucle de gestion | ✅ complet | rien de bloquant |
| Défense et batailles | ✅ complet | formations, moral de troupe, héros ennemis |
| Offensive (8 places fortes) | ✅ complet | diplomatie vivante, caravanes |
| Dieux et ferveur | ✅ complet | arbre de faveur, oracles |
| Héros (8, arcs, entretien) | ✅ complet | héros ennemis nommés |
| Contenu narratif | ✅ complet | 41 dilemmes, 55 missions, 45 hauts faits, campagne en 5 actes |
| Campagne « La Chute » | 🟡 jouable | terrains propres à chaque acte (les repères changent, pas le sol) |
| Art | 🟡 très avancé | LOD au dézoom, cinq terrains d'acte |
| Tests | 🟡 181 tests de règles | aucun test de rendu ni de parcours e2e |
| Modes de jeu | 🟡 deux (bac à sable, campagne) | siège sans fin, NG+, défi hebdomadaire |
| Accessibilité / mobile | ❌ non traité | tactile, contrastes, `prefers-reduced-motion` |
| Multijoueur / serveur | ❌ non traité | hors périmètre pour l'instant |

---

## 🎯 Priorité 1 — ce qui manque le plus au jeu

| # | Chantier | Effort | Impact | Pourquoi maintenant |
|---|---|---|---|---|
| 1 | **Terrains propres aux cinq actes** | L | ★★★ | La campagne plante ses repères (flotte échouée, camp achéen, Ilion, Scamandre, cheval) mais le SOL reste la même plaine dans les cinq actes. Peindre la grève de Sigée et les ruines d'hiver serait le plus grand saut visuel qui reste. |
| 2 | **Siège sans fin** | M | ★★★ | Vagues de difficulté croissante, sans répit, score local. Réutilise tout le moteur de bataille ; les hauts faits sont déjà là pour le noter. |
| 3 | **Formations et ordres en bataille** | M | ★★★ | Mur de boucliers, tir en cloche, tenir/charger, assigner une unité à un secteur. Prolongement direct des fronts multiples — aujourd'hui on regarde la bataille sans y toucher hors bénédictions. |
| 4 | **Sauvegardes multiples + export/import** | S | ★★★ | Une seule partie à la fois, et rien ne survit à un vidage du navigateur. Petit chantier, grosse tranquillité. |
| 5 | **Tests de rendu (composants)** | M | ★★ | Les 181 tests couvrent les règles, pas l'écran. Le HUD, les panneaux et le placement de l'encart du tutoriel ne sont vérifiés qu'à l'œil et par des parcours Playwright joués à la main. |

## 🎯 Priorité 2 — ce qui donnerait de la profondeur

| Chantier | Effort | Impact | Domaine |
|---|---|---|---|
| **Héros ennemis nommés** : Achille assiégeant *votre* village, ses capacités retournées contre vous | M | ★★★ | militaire |
| **Nouvelle Partie +** : rejouer en gardant le prestige (bonus de départ, héros connus, difficulté accrue) | M | ★★ | mode |
| **Familles et lignées** : les villageois se marient, vieillissent, transmettent leur métier | L | ★★★ | économie |
| **Arbre de faveur par dieu** : dépenser la relation en bénédictions permanentes | M | ★★★ | divin |
| **Diplomatie vivante** avec les 8 villages : tributs négociés, mariages, trahisons | L | ★★★ | économie |
| **Nouvelles unités** : frondeur, peltaste, char, machines de siège côté joueur | M | ★★★ | militaire |
| **Moral de troupe en bataille** : panique, ralliement par un héros | M | ★★ | militaire |
| **Statistiques et courbes** d'historique (production, pertes, menace) | M | ★★ | confort |
| **Notifications navigateur** à l'approche d'un assaut | S | ★★ | confort |

## 🎯 Priorité 3 — bon à prendre

| Chantier | Effort | Impact | Domaine |
|---|---|---|---|
| Défi de la semaine (graine fixe partagée, score comparable) | M | ★★ | mode |
| Mode Fer (sauvegarde unique, mort définitive) | S | ★★ | mode |
| Espionnage : un éclaireur pour voir la vague, au risque de le perdre | S | ★★ | militaire |
| Commerce vivant : caravanes, prix qui fluctuent, routes coupées | M | ★★ | économie |
| Technologies de l'âge du bronze (arbre de recherche) | L | ★★ | économie |
| Merveilles : un bâtiment unique par partie, à effet massif | M | ★★ | économie |
| Oracles payants : acheter une information vraie sur les 10 minutes à venir | S | ★★ | divin |
| Colère divine graduée : un dieu maudit envoie ses propres calamités | M | ★★ | divin |
| Reliques rapportées d'expédition, à placer au temple | M | ★★ | divin |
| Hécatombe : sacrifice majeur pour un effet de saison | S | ★ | divin |
| PWA installable et hors-ligne | S | ★★ | technique |
| LOD de la carte : moins de nœuds SVG au dézoom, culling hors écran | M | ★★ | technique |
| Accessibilité : palette daltonisme, taille de texte, `prefers-reduced-motion` | M | ★★ | confort |
| Support tactile / mobile (la carte s'y prête, le HUD non) | L | ★★ | confort |
| Localisation EN | L | ★ | confort |
| Mode Historique (sans dieux, économie plus dure, textes documentaires) | M | ★ | mode |
| Comptes et sauvegarde serveur | L | ★ | technique |
| Multijoueur asynchrone (raider le village d'un autre joueur) | XL | ★★★ | technique |

---

## 🐞 Dette connue

Courte, et c'est voulu : les sept dettes du lot 6 ont été refermées au lot 7, chacune sous test
(`src/game/dettes.test.ts`).

- **Les cinq actes partagent le même sol.** Chaque acte a bien son repère peint (flotte, camp,
  Ilion, fleuve, cheval), sa saison et son ciel — mais la plaine, les collines et le rivage sont
  ceux du bac à sable. C'est la priorité 1 ci-dessus.
- **`MODE_TEST` est vrai sous Vitest** (`import.meta.env.MODE === 'test'`), ce qui remplit coffres
  et population à chaque tick : les départs de famine ne sont donc pas mesurables par le tick dans
  les tests. Ils le sont par la résolution hors-ligne, qui sert de porte d'entrée.
- **Le morceau principal du bundle pèse 478 kB** (contre 916 kB avant découpage). L'art des
  bâtiments (344 kB) et le récit (143 kB) sont sortis ; le reste demanderait un découpage par route.
- **L'expérience va aux héros de la maisonnée, pas seulement à ceux qui marchent** : un héros qui
  boude gagne de l'xp pendant que la colonne se bat sans lui. Cohérent avec les passifs, discutable
  pour l'xp.
- **Le journal repart à zéro à chaque acte de campagne** : les rapports d'un acte ne suivent pas
  dans le suivant. C'est délibéré (chaque acte est un chapitre), mais on perd la chronique longue.
- **Aucun test de rendu** : voir priorité 1.

---

## 📚 Historique des lots livrés

Conservé pour mémoire. Le détail des choix de conception vit dans les commentaires du code — c'est
là qu'il reste juste.

### Lot 7 — les dettes refermées *(le plus récent)*

| Sujet | Ce qui a été fait |
|---|---|
| Décor des cinq actes | Chaque acte plante son repère dans le paysage : les mille nefs noires tirées sur la grève, le camp achéen installé pour dix ans, Ilion sur son tertre, le Scamandre débordé qui coupe la plaine, la ville en flammes et la carcasse du cheval. Couches additives, dessinées au code, dans la lumière du nord-ouest. |
| Garde d'Ajax | Elle ne protégeait personne en expédition (`reducJoueur` non transmis) et sa valeur était divisée par deux entre la fiche et l'usage. Le champ porte désormais les 25 % annoncés, `cumulerPassifs` les SOMME (plafonnés à 80 %) au lieu de garder le maximum, et l'expédition les reçoit. |
| Orgueil d'Agamemnon | `benir` lisait la relation BRUTE : le panthéon annonçait ×1,24 et le joueur recevait ×1,30. Le seul passif du jeu qui soit un défaut coûte enfin quelque chose. |
| Arc d'Achille | « Le retenir de force » le plafonnait au niveau 3 quand « La flèche de Pâris » en exige 4 : son histoire s'arrêtait en silence. Plafond porté à 4 — il monte d'un rang, le dernier. |
| Fronts la nuit | La résolution hors-ligne marquait forfaitairement la porte comme enfoncée. Elle répartit maintenant la structure entre les pans assaillis, tient compte de l'épaisseur de la porte et de l'arc que couvre chaque tour, et nomme les pans tombés dans le rapport du réveil. |
| Pertes civiles | `pertesCiviles` ne comptait rien. Un sac emporte des habitants, un grenier vide en fait partir par foyers — jamais sous deux âmes. |
| Renforts alliés | Ils portaient vos couleurs : l'aide d'un allié ne se lisait que dans le rapport. Tunique vert olive et fanion de leur cité, en fin de ligne, comptés en figurines et non en hommes. |
| Réglages du son | Le passage à la nouvelle échelle jetait le choix du joueur. Un curseur volontairement déplacé est repris et remis à l'échelle, un coupe-son est respecté tel quel, et seul « je n'y avais pas touché » repart du défaut. |
| Comptoir d'échange | Il reproposait bois → bronze à chaque ouverture. Le dernier troc choisi survit à la fermeture du panneau. |

### Lot 6 — campagne, tests et bundle

Campagne « La Chute » en cinq actes (situation héritée, objectifs sur la manière de tenir, défaite
réelle, héros imposés) · 165 tests Vitest sur huit domaines · bundle coupé en trois morceaux ·
actes de missions verrouillés · musique de la paix ramenée à 24 attaques/minute · bandeau du haut
en deux rangs · liseré doré et émoji explosion retirés de la mêlée · l'encart de Zeus ne masque
plus une croix de fermeture · départs de famine.

### Lot 5 — sorties, missions et comptoir

Une croix, Échap ou un clic à côté pour refermer chaque menu (châssis commun à en-tête figé) ·
encart chiffré pour la vitesse du temps · missions intégrées au jeu (panneau complet, pastille,
bouton « y aller », trace au journal) · musique enfin audible · comptoir d'échange qui compte en
valeur et non en tas · sept premiers habitants couvrant les six métiers.

### Lot 4 — Zeus, métiers et héros incarnés

Tutoriel scénarisé en 15 étapes à focus verrouillé, porté par un Zeus dessiné en SVG · encarts au
survol partout · métiers de naissance et affectation manuelle · héros visibles sur la carte et au
premier rang des lignes · pictogrammes peints à la place des émojis.

### Lot 3 — zoom, icônes et villages ennemis

Zoom molette et déplacement manuels · remparts endommagés visibles hors combat · pictogrammes de
ressources peints · descriptions du HUD · animation de victoire · jauge de ferveur à sept bandes ·
décor peint pour les huit places fortes · zone de portée des tours rendue discrète.

### Lot 2 — dieux, saisons, héros et campagne offensive

Visuels divins selon la ferveur (sept paliers) · quatre saisons et six météos qui pèsent sur la
récolte et la bataille · huit héros à arcs narratifs mortels · expéditions à deux intentions
(piller / secourir) avec alliances · 45 hauts faits et prestige · bande-son entièrement synthétisée.

### Socle initial

10 bâtiments × 4 niveaux, production, moral, menace, stockage, cycle jour/nuit, vitesses ×1–×8,
résolution hors-ligne · remparts à 4 niveaux, tours d'archers, 3 unités, batailles animées ·
8 places fortes de la Troade · 4 Olympiens · dilemmes à issues cachées · missions en fil rouge ·
refonte graphique peinte (lumière au nord-ouest, ombres portées, matières).
