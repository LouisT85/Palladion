# PALLADION — feuille de route

État au 2 août 2026.

**Comment lire ce document.** Il est organisé par **priorité** puis par **domaine**, et non par
ordre chronologique : ce qui est en haut est ce qu'il faut faire ensuite. Chaque entrée à venir
porte une estimation d'**effort** (S / M / L / XL) et d'**impact joueur** (★ à ★★★).
L'historique des lots livrés est relégué en fin de document, pour mémoire.

---

## 📍 Où en est le jeu, en un coup d'œil

| Domaine | État | Reste à faire |
|---|---|---|
| Boucle de gestion | ✅ complet | rien de bloquant |
| Défense et batailles | ✅ complet | rien de bloquant — ordres, moral, six unités, champions nommés |
| Offensive (8 places fortes) | ✅ complet | caravanes, espionnage |
| Dieux et ferveur | ✅ complet | oracles, colère graduée |
| Héros (8, arcs, entretien) | ✅ complet | rien de bloquant |
| Diplomatie | ✅ complet | rien de bloquant — relations, présents, pactes, mariages, trahisons |
| Village vivant | ✅ complet | âges, foyers, lignées, transmission des métiers |
| Contenu narratif | ✅ complet | 41 dilemmes, 55 missions, 51 hauts faits, campagne en 5 actes |
| Campagne « La Chute » | ✅ complet | cinq actes, chacun avec son sol et ses repères |
| Art | 🟡 très avancé | LOD au dézoom |
| Tests | 🟡 314 tests de règles | aucun test de rendu ni de parcours e2e |
| Modes de jeu | 🟡 deux (bac à sable, campagne) | siège sans fin, NG+, défi hebdomadaire |
| Accessibilité / mobile | ❌ non traité | tactile, contrastes, `prefers-reduced-motion` |
| Multijoueur / serveur | ❌ non traité | hors périmètre pour l'instant |

---

## 🎯 Priorité 1 — ce qui manque le plus au jeu

| # | Chantier | Effort | Impact | Pourquoi maintenant |
|---|---|---|---|---|
| 1 | **Siège sans fin** | M | ★★★ | Vagues de difficulté croissante, sans répit, score local. Réutilise tout le moteur de bataille — et désormais les ordres, le moral, les six unités et les champions nommés. Les hauts faits sont déjà là pour le noter. |
| 2 | **Tests de rendu (composants)** | M | ★★ | Les 314 tests couvrent les règles, pas l'écran. Le HUD, les panneaux et le placement de l'encart du tutoriel ne sont vérifiés qu'à l'œil et par des parcours Playwright joués à la main. |
| 3 | **Nouvelle Partie +** | M | ★★ | Rejouer en gardant le prestige : bonus de départ, héros déjà connus, Troade qui se souvient de vos trahisons, difficulté accrue. Tout l'état nécessaire existe déjà. |
| 4 | **LOD de la carte** | M | ★★ | Au dézoom, la carte dessine tous ses nœuds SVG. Un culling hors écran et une version simplifiée des bâtiments lointains rendraient le zoom arrière franc. |

## 🎯 Priorité 2 — ce qui donnerait de la profondeur

| Chantier | Effort | Impact | Domaine |
|---|---|---|---|
| **Commerce vivant** : caravanes, prix qui fluctuent, routes coupées par les hostiles | M | ★★★ | économie |
| **Espionnage** : un éclaireur pour voir la vague et le champion, au risque de le perdre | S | ★★ | militaire |
| **Oracles payants** : acheter une information vraie sur les 10 minutes à venir | S | ★★ | divin |
| **Colère divine graduée** : un dieu maudit envoie ses propres calamités | M | ★★ | divin |
| **Reliques** rapportées d'expédition, à placer au temple | M | ★★ | divin |
| **Merveilles** : un bâtiment unique par partie, à effet massif | M | ★★ | économie |
| **Technologies de l'âge du bronze** (arbre de recherche) | L | ★★ | économie |
| **Chars** : la quatrième unité qui manque, rapide et chère | M | ★★ | militaire |

## 🎯 Priorité 3 — bon à prendre

| Chantier | Effort | Impact | Domaine |
|---|---|---|---|
| Défi de la semaine (graine fixe partagée, score comparable) | M | ★★ | mode |
| Mode Fer (sauvegarde unique, mort définitive) | S | ★★ | mode |
| Hécatombe : sacrifice majeur pour un effet de saison | S | ★ | divin |
| PWA installable et hors-ligne | S | ★★ | technique |
| Accessibilité : palette daltonisme, taille de texte, `prefers-reduced-motion` | M | ★★ | confort |
| Support tactile / mobile (la carte s'y prête, le HUD non) | L | ★★ | confort |
| Localisation EN | L | ★ | confort |
| Mode Historique (sans dieux, économie plus dure, textes documentaires) | M | ★ | mode |
| Comptes et sauvegarde serveur | L | ★ | technique |
| Multijoueur asynchrone (raider le village d'un autre joueur) | XL | ★★★ | technique |

---

## 🐞 Dette connue

Courte, et c'est voulu.

- **`MODE_TEST` est vrai sous Vitest** (`import.meta.env.MODE === 'test'`), ce qui remplit coffres
  et population à chaque tick : ni les départs de famine ni le paiement d'un présent ne sont
  mesurables par le tick dans les tests. Ils le sont par la résolution hors-ligne et par les tables
  de coûts, qui servent de portes d'entrée.
- **Le morceau principal du bundle pèse ~530 kB** (contre 916 kB avant découpage). L'art des
  bâtiments (344 kB) et le récit (143 kB) sont sortis ; le reste demanderait un découpage par route.
- **L'expérience va aux héros de la maisonnée, pas seulement à ceux qui marchent** : un héros qui
  boude gagne de l'xp pendant que la colonne se bat sans lui. Cohérent avec les passifs, discutable
  pour l'xp.
- **Le journal repart à zéro à chaque acte de campagne** : les rapports d'un acte ne suivent pas
  dans le suivant. C'est délibéré (chaque acte est un chapitre), mais on perd la chronique longue.
  Les annales, elles, traversent les actes.
- **Les habitants n'ont pas de genre.** Les noms mêlent masculins et féminins, les foyers se font
  entre adultes sans distinction, et le recensement dit « enfant de X et Y ». Simplification
  assumée : le genre ne changerait aucune règle, et il faudrait genrer les six métiers.
- **Aucun test de rendu** : voir priorité 1.

---

## 📚 Historique des lots livrés

Conservé pour mémoire. Le détail des choix de conception vit dans les commentaires du code — c'est
là qu'il reste juste.

### Lot 8 — la profondeur *(le plus récent)*

Le plus gros lot du projet : huit chantiers, tous sous test (`+133` tests, 314 au total).

| Sujet | Ce qui a été fait |
|---|---|
| Trois nouvelles unités | Le **frondeur** (aucun bronze, la moins chère, monte au rempart mais porte les deux tiers d'un arc), le **peltaste** (court plus vite que l'infanterie et va d'abord aux tireurs) et le **bélier** côté joueur (abat un mur bien plus vite qu'une colonne d'hommes, inutile en défense). Chacune fait ce qu'aucune autre ne fait. |
| Arbre de faveur | La relation à un dieu se **dépense** : douze grâces permanentes, trois par Olympien, prises dans l'ordre et jamais reprises. Récoltes de Zeus Xenios, mer ouverte en hiver de Poséidon, blessés relevés d'Athéna, entretien allégé d'Arès… Monter sa ferveur ou l'échanger contre un don définitif est le vrai arbitrage. |
| Ordres à la troupe | On regardait la bataille. Trois postures — **tenir**, **mur de boucliers** (−45 % de dégâts subis, on ne poursuit plus, la ligne ne rompt presque jamais), **charger** (+40 % de dégâts et l'on sort crever les béliers sous le mur) — deux façons de tirer (**tendu** / **en cloche**, moitié plus loin sur le plus gros tas), et un **pan assignable par type d'unité**. Un ordre se tient cinq secondes. |
| Champions achéens | Passé une certaine menace, un **nom** prend la tête de la colonne : Achille, Hector, Ajax, Agamemnon, Ulysse, Diomède, Énée, Cassandre — précisément ceux qu'on peut recruter, et c'est parce qu'ils ne sont *pas* à votre table qu'ils marchent sur vos murs. Manœuvre annoncée d'avance avec son décompte ; l'abattre l'éteint sur-le-champ. La nuit ne les efface pas. |
| Moral de troupe | Une ligne ne fond plus jusqu'au dernier homme : sous un seuil, les hommes **rompent** un par un, en commençant par les plus entamés. Un héros debout abaisse fortement ce seuil. Jauge et marqueur de seuil dans le bandeau, bouclier jeté au sol pour le fuyard. |
| Terrains des cinq actes | Chaque acte a désormais **sa terre**, pas seulement ses repères : le sable de Sigée qui remonte dans l'herbe, la boue et les ornières de dix ans de camp, la poussière du siège où plus rien ne pousse, la crue du Scamandre avec ses flaques et ses roseaux, la cendre d'Ilion avec ses braises et ses souches noircies. |
| Familles et lignées | Une journée de jeu vaut deux ans. Les habitants **vieillissent** (un enfant aide sans remplacer et ne porte pas les armes, un ancien rend moins et finit par mourir), **font foyer** entre maisons différentes, et un enfant né dans un foyer **apprend le métier d'un de ses parents**. Marier son forgeron, c'est se donner des forgerons. Pyramide des âges au recensement. |
| Diplomatie vivante | Chaque place forte tient sa **relation** (−100…+100) et la Troade est petite : ce qu'on fait à l'une, les sept autres l'apprennent. Un **présent** rachète une rancune, un **pacte** s'achète à qui vous voit bien, un **mariage** coûte un habitant pour toujours mais scelle une alliance que rien ne dénoue, au tribut doublé. Une alliance ordinaire se rompt si la relation retombe ; un village hostile grossit la menace. |
| Annales du règne | Un relevé chiffré toutes les trente secondes, borné à 260 : greniers, garnison, menace, ambiance, faveur, remparts, prestige. Quatre graphes dessinés en SVG comme le reste du jeu, avec la **pente par minute** de chaque série — c'est elle qui répond à « est-ce que ça monte ? ». |
| Notifications navigateur | Un assaut annoncé, un village qui implore : on prévient hors de l'onglet, jamais quand la page est visible, avec un débit d'une notification par sujet et par minute. Le nom du champion passe dans le titre. |

### Lot 7 — les dettes refermées

Décor des cinq actes (repères) · garde d'Ajax enfin transmise en expédition et sommée · orgueil
d'Agamemnon appliqué aux bénédictions · arc d'Achille débloqué jusqu'au bout · fronts comptés dans
la résolution nocturne · pertes civiles réelles · renforts alliés à leurs couleurs · réglages du son
respectés · dernier troc mémorisé.

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
