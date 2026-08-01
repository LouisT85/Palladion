# PALLADION — feuille de route

État au 1er août 2026. Chaque entrée porte une estimation d'**effort** (S/M/L/XL)
et d'**impact joueur** (★ à ★★★). Les lots livrés sont conservés pour mémoire.

---

## ✅ Livré

| Domaine | Contenu |
|---|---|
| Boucle de jeu | 10 bâtiments × 4 niveaux, production, moral, menace, stockage, jour/nuit, vitesses ×1–×8, hors-ligne |
| Défense | Remparts 4 niveaux, tours d'archers à portée, 3 unités, batailles animées, réparations |
| Offensive | 8 villages de la Troade, étoiles, butin dégressif, retraite |
| Dieux | 4 Olympiens, faveur, bénédictions, relations, sacrifices |
| Contenu | Dilemmes à issues cachées (murmure d'Athéna), missions en fil rouge |
| Graphismes | Refonte peinte réaliste (AoE/Zeus) : 11 domaines, lumière NW, ombres portées, matières |
| Confort | Reset de partie, étiquettes au survol, chantiers à 3 stades, garnison visible |

## ✅ Lot 2 — livré

| # | Chantier | Ce qui a été fait |
|---|---|---|
| 1 | **Visuels divins selon la ferveur** | Sept paliers pilotent la mise en scène : éclair pâle et avorté pour un dieu offensé, jaune en grâce, bleu-blanc quand il vous chérit, pourpre fendant le ciel pour son élu. Onde de Poséidon → raz-de-marée d'écume ; halo d'Athéna → égide à Gorgone tournoyante ; brume d'Arès → aura sanglante et corbeaux. Un aperçu figé s'affiche dans le panthéon. |
| 2 | **Saisons et météo** | Quatre saisons de quatre journées, météo tirée toutes les 4 min. Multiplicateurs de récolte par ressource, hiver qui ferme la mer (port au tiers, îles inaccessibles). En bataille : portée, allure et force des tirs modulées ; orage = foudre de Zeus renforcée. Carte : feuillages saisonniers, congères, feuilles mortes, brûlis, pluie/neige/brume/canicule/éclairs en SMIL. |
| 3 | **Héros récurrents à arcs narratifs** | Les huit héros, avec conditions d'apparition, entretien par minute, départ au bout de trois rappels impayés, niveaux 1→5 gagnés au combat, passifs cumulés, capacités actives résolues sur le champ de bataille, et arcs à embranchements dont certaines branches tuent ou plafonnent définitivement. |
| 4 | **Expéditions : piller ou secourir** | Deux intentions. Pillage : Zeus −5, menace +4, garnison renforcée de 25 % par pillage encaissé. Secours : appel à fenêtre limitée, aucun butin, Zeus +12 / Athéna +7, alliance (tribut toutes les 3 min + renforts qui tombent avant vos hommes). Trahir un allié est possible — et compté. |
| 5 | **Succès, hauts faits et prestige** | 45 hauts faits en cinq catégories, score de prestige détaillé ligne à ligne, titres de « Roi de pacotille » à « Égal des dieux », et abdication qui fige le bilan avant de refonder une cité. |
| 6 | **Sons et musique** | Tout synthétisé en Web Audio, zéro octet téléchargé : lyre en mode phrygien au village, cors à l'alerte, tambour de siège, fracas d'armes, craquement de brèche, tonnerre des bénédictions, chant d'aède à la victoire. Coupe-son et deux curseurs persistés ; aucun son avant le premier geste. |

## ✅ Lot 4 — livré

| Sujet | Ce qui a été fait |
|---|---|
| Tutoriel scénarisé | Zeus descend en personne : 15 étapes, portrait dessiné en SVG (aucune image chargée), focus verrouillé par masque à plusieurs trous + interception des clics en phase de capture. Les étapes clés exigent le **geste** (bâtir, affecter, ouvrir) et se valident seules ; « Passer la leçon » reste possible, et l'aide la rejoue. |
| Encarts au survol | Le `title` du navigateur remplacé par un vrai composant : titre, résumé, chiffres alignés (saison × météo × ambiance) et avertissement contextuel. |
| Musique du village | La paix était en mode phrygien — la seconde mineure met l'oreille en alerte. Remplacée par une pentatonique majeure à 0,95 s/temps, flûte + lyre en alternance, neuf silences sur vingt-quatre temps, bourdon grave. L'alerte garde le phrygien : là, c'est voulu. |
| Métiers et assignation manuelle | Chaque habitant naît d'un métier ; il rend 55 % ailleurs. L'affectation automatique en fin de chantier est supprimée, le bouton « tous au travail » aussi. Un écriteau sur la carte signale l'atelier à vide. |
| Héros incarnés | Ils arpentent la place du village à leurs couleurs, et descendent se battre au premier rang (stats liées au niveau). Tombés, ils sont **blessés** et non retirés de l'effectif — seul l'arc tue. La ligne de défense est passée d'un point unique à trois rangs, ce qui rend la mêlée lisible. |
| Pictogrammes | Les icônes peintes gagnent missions, agora, port, héros, panthéon ; la médaille de bronze 🥉 disparaît des 61 textes qui la traînaient encore. |

## ✅ Lot 6 — livré

| Sujet | Ce qui a été fait |
|---|---|
| **Campagne « La Chute »** | Cinq actes qui suivent l'Iliade — les mille nefs, la colère, sous les murs, le fleuve, le cheval. Chaque acte impose son état de départ (bâtiments debout, garnison, saison, ciel, relations, jusqu'à un pan de mur déjà à terre à l'acte IV), quatre à six objectifs dont deux au moins portent sur la MANIÈRE de tenir (« trois assauts sans qu'un pan cède », « un assaut sans perdre un homme »), une condition de défaite réelle, un prologue et un épilogue, et parfois un héros que le récit impose sans rançon — Hector à l'acte III, Achille au IV, Énée et Cassandre au V. Les compteurs d'acte sont des DIFFÉRENCES : un acte ne mesure que ce qui s'y passe. L'écran d'accueil demande désormais le mode ; le fil rouge du bac à sable se tait en campagne. |
| Tests automatisés | Vitest + jsdom, **165 tests** sur huit domaines : comptoir et métiers, moteur de bataille (invariants d'une bataille entière), production et postes, résolution hors-ligne et sauvegardes partielles, hauts faits et prestige, missions et actes, héros et arcs, saisons et météo. `npm test`. Trois vrais défauts de production sont documentés au passage (voir dette). |
| Découpage du bundle | Un seul morceau de 916 kB → **491 kB** de châssis + 355 kB d'art de bâtiments + 107 kB de récit, chargés à part. Le premier écran ne porte plus les 6 500 lignes de SVG des dix domaines. |
| Actes de missions verrouillés | Le fil rouge du bac à sable respire : trois missions ouvertes à la fois **jamais au-delà de l'acte en cours**, en-têtes d'acte permanents (achevé / en cours / scellé) avec leur avancement, et l'acte courant rappelé dans le suivi de carte. |
| Musique de la paix, troisième version | Elle sonnait « la sonnerie d'école » : cinq voix résonnaient en permanence et une attaque pincée toutes les six dixièmes de seconde. Le coupable n'était ni le mode ni le volume mais le NOMBRE D'ATTAQUES — 160 par minute. Une seule voix soufflée désormais (attaque d'une demi-seconde), une note toutes les deux secondes et demie, un bourdon continu, une figure de lyre par phrase : **24 attaques par minute**, mesurées au navigateur. |
| Bandeau du haut | Deux rangs assumés — « ce que je possède » (réserves, faveur, habitants, garnison), « ce qui m'arrive » (ambiance, menace, jour, ciel, vitesse) — séparés par un filet, avec des jetons plus aérés et des paliers de repli bien plus tardifs. Vérifié sans un chevauchement de 1920 à 980 px. |
| Vue de bataille nettoyée | Le liseré doré au pied du pan menacé et l'émoji explosion clignotant ont disparu : la jauge de secteur dit déjà lequel souffre, en toutes lettres. |
| Sortie de la leçon | L'encart de Zeus ne peut plus se poser sur la croix de fermeture d'un panneau : les barres de titre sont des « zones sacrées » qui pèsent quarante fois plus lourd dans le calcul de placement. Les trois étapes « ouvrez puis refermez » nomment la croix. |
| Départs de famine | Un grenier vide ne coûtait qu'un malus d'ambiance : on part maintenant, par foyers, jamais sous deux âmes. C'est ce qui donne du mordant aux défaites d'acte. |

## ✅ Lot 5 — livré

| Sujet | Ce qui a été fait |
|---|---|
| Une sortie dans chaque menu | Châssis commun (`Modale`) pour les huit panneaux : en-tête figé, **croix** qui ne défile jamais, **Échap**, clic à côté. Les modales de décision (dilemme, arc de héros, rapport, fin de règne) restent volontairement sans sortie. |
| Vitesse du temps | Le seul jeton du bandeau qui portait encore un `title` du navigateur a son encart chiffré comme ses voisins : vitesse courante, durée réelle d'une journée, verrou de bataille, et l'avertissement qui compte (accélérer rapproche l'ennemi). |
| Missions intégrées au jeu | Panneau du fil rouge complet (55 missions, cinq actes, ouverture sur la première jouable), bouton **🏅 Missions** à pastille dans le bandeau, et surtout un bouton **« y aller »** par mission qui ouvre l'écran concerné — recensement, bâtiment, carte des expéditions, panthéon. Une récompense réclamée laisse une ligne au journal. |
| Musique du village | Elle était juste — et inaudible : bus à 0,275, notes à 0,075, un temps par seconde et un silence sur trois. Volume porté au même plan que les cors (clé de réglages `v2` pour que tout le monde y passe), tempo à 0,58 s, deux phrases de seize temps qui alternent, basse pincée sur les temps forts, tierce complice sous la mélodie, bourdon renouvelé avant de s'éteindre. |
| Comptoir d'échange | Deux défauts d'un coup. Le bouton cassait sa ligne (une icône `display: block` posée en flux de texte) et se lisait sur trois niveaux ; corrigé pour toutes les icônes du jeu. Et le troc appliquait un taux unique — 40 de grain valaient 10 de bronze, ce qui rendait la forge inutile : il échange désormais **à la valeur**, avec une marge de +70 % au petit quai à +15 % au port franc, et refuse avant d'encaisser si l'entrepôt est plein. |
| Répartition des métiers | Les sept premiers habitants couvrent les six métiers (avec un second paysan) ; chaque naissance comble ensuite le métier le plus en retard au regard de ses poids. Le tirage aléatoire donnait couramment quatre paysans et aucun prêtre — donc aucune faveur possible. |

## ✅ Lot 3 — livré

| Sujet | Ce qui a été fait |
|---|---|
| Zoom et déplacement manuels | Molette (zoom au curseur), glisser pour déplacer, double-clic pour recentrer, boutons +/− ; la caméra de bataille rend la main dès qu'on y touche. Sur la carte comme sur la scène d'assaut. |
| Remparts endommagés hors combat | Les pans effondrés restent à terre jusqu'à réparation (ou jusqu'au trident de Poséidon), y compris après un assaut nocturne. |
| Icônes de ressources | Pictogrammes peints : grume écorcée, bloc de taille équarri, gerbe de blé, lingot « peau de bœuf ». Fini le caillou et la médaille de bronze. |
| Descriptions du HUD | Nom sous chaque jeton de ressource, infobulles complètes partout, et l'ambiance du village en un mot (Exaltée → Révolte) qui ne disparaît plus jamais au rétrécissement. |
| Animation de victoire | Couronne de laurier, rayons d'or tournants, paillettes ; trois secondes par-dessus la scène, sans jamais intercepter un clic. |
| Jauge de ferveur | Rail à sept bandes du rouge sang au vert franc, le palier atteint à pleine saturation. |
| Villages d'expédition | Les huit places fortes ont leur décor peint et leur cadre (plaine, colline, grève, île) : camp de tentes, hameau de chaume, comptoir à amphores, village dardanien, fort achéen, cité à colonnade, citadelle sur éperon, forteresse à donjon. |
| Zone de portée des tours | Le disque jaune plein devient un halo de bord et un liseré fin : on lit la limite, plus la tache. |

### Héros — conception détaillée

**Recrutement conditionné.** Chaque héros a un prérequis qui raconte pourquoi il vient
à vous : Hector n'accepte que si vos remparts sont au niveau 3 et Zeus en grâce ;
Ulysse veut un port de niveau 2 et une relation Athéna ≥ 40 ; Agamemnon exige
une armée de 12 hommes et beaucoup d'or ; Ajax vient si le moral est haut ;
Cassandre apparaît au temple niveau 3 ; Énée arrive avec des réfugiés.

**Niveaux propres.** Chaque héros gagne de l'expérience en bataille et en expédition
(1 → 5). Monter de niveau demande un **entraînement** coûteux (grain + bronze + temps)
ou un exploit précis. Chaque palier renforce sa capacité et débloque une étape de son arc.

**Capacités liées à leur légende** (une active + une passive) :

| Héros | Passive | Active |
|---|---|---|
| Hector | +15 % PV des remparts, les défenseurs ne paniquent pas | *Rempart de Troie* : absorbe les dégâts d'un secteur pendant 20 s |
| Ulysse | Révèle la composition ET les fronts de la prochaine vague | *Ruse du cheval* : une expédition entre sans casser les murs (0 dégât de siège) |
| Achille | +40 % dégâts de mêlée, mais −20 % de moral s'il est inactif 2 assauts | *Fureur du Pélide* : massacre en ligne, invulnérable 8 s, puis épuisé |
| Ajax | Encaisse 50 % des dégâts destinés aux voisins | *Mur de boucliers* : bloque une brèche 25 s |
| Agamemnon | +20 % de butin, −10 % de relation avec tous les dieux | *Ordre du roi* : recrutement instantané de 3 lanciers |
| Cassandre | Prévient 2 min plus tôt, révèle l'issue vraie des dilemmes | *Prophétie* : annule une vague (une fois par saison) |
| Énée | +2 habitants par saison | *Fuite d'Ilion* : sauve 80 % des troupes d'une défaite |
| Diomède | +25 % dégâts en expédition | *Aristie* : cible et tue le chef ennemi |

**Arcs à embranchements.** 3 à 5 nœuds par héros, chacun avec un choix qui ferme une
porte. Exemple pour Achille : *la querelle* (le laisser bouder = moral ↓ mais Arès
content / céder = moral ↑ mais Achille −1 niveau) → *la mort de Patrocle* (venger =
+2 niveaux et Fureur permanente / retenir = il reste mais plafonne) → *le talon*
(un assaut peut le tuer définitivement / le mettre en réserve = il survit inutile).
**Les héros doivent pouvoir mourir** — c'est ce qui rend l'arc tendu.

**Coût d'entretien.** Un héros mange, exige des honneurs (faveur ou grain par minute)
et peut partir si on l'ignore. Ils sont une puissance, pas un cadeau.

---

## 🎮 Modes de jeu à envisager

| Mode | Effort | Impact | Description |
|---|---|---|---|
| ~~**Campagne — La Chute**~~ | ~~XL~~ | ★★★ | **Livré au lot 6** — voir ci-dessus. |
| **Siège sans fin** | M | ★★★ | Vagues de difficulté croissante, sans répit, score et classement local. Le meilleur rapport plaisir/effort : réutilise tout le moteur de bataille. |
| **Nouvelle Partie +** | M | ★★ | Rejouer en gardant le prestige : bonus de départ, héros déjà connus, difficulté accrue. Donne une raison de finir une partie. |
| **Défi de la semaine** | M | ★★ | Graine fixe partagée par tous (même carte, mêmes vagues, mêmes dilemmes), score comparable. Excellent pour le partage. |
| **Mode Fer** | S | ★★ | Sauvegarde unique, mort définitive du village, pas de reset. Public hardcore, coût de dev quasi nul. |
| **Bac à sable** | S | ★ | Ressources libres, éditeur de vagues, pour jouer avec les graphismes et tester. |
| **Mode Historique** | M | ★ | Sans dieux ni bénédictions, économie plus dure, textes documentaires. Public curieux d'histoire. |

## 🧩 Systèmes à approfondir

**Militaire**
- Nouvelles unités : frondeur (bon marché, harcèle), peltaste (rapide, contre-archers), char de guerre (choc), machines de siège côté joueur (bélier, tour d'assaut, catapulte) — **M, ★★★**
- Formations et ordres en bataille : mur de boucliers, tir en cloche, tenir/charger, assigner une unité à un secteur — **M, ★★★** *(prolonge naturellement les fronts multiples)*
- Moral de troupe en bataille : panique, ralliement par un héros — **M, ★★**
- Héros ennemis nommés qui mènent les assauts (Achille assiégeant *votre* village) — **M, ★★★**
- Espionnage : envoyer un éclaireur voir la vague, risque de le perdre — **S, ★★**

**Économie et société**
- Familles et lignées : les villageois se marient, ont des enfants, vieillissent, meurent ; les métiers se transmettent — **L, ★★★** *(prolongement direct des villageois nommés)*
- Technologies de l'âge du bronze : arbre de recherche (charrue, poulie, alliage, écriture linéaire B) — **L, ★★**
- Commerce vivant : caravanes, prix qui fluctuent, embargos, routes coupées par la guerre — **M, ★★**
- Diplomatie : alliances, tributs, mariages politiques, trahisons avec les 8 villages — **L, ★★★**
- Merveilles : un bâtiment unique par partie (Palladion doré, phare, théâtre) à effet massif — **M, ★★**

**Divin**
- Arbre de faveur par dieu : dépenser la relation en bénédictions permanentes — **M, ★★★**
- Oracles payants : acheter une information vraie sur les 10 prochaines minutes — **S, ★★**
- Hécatombe : sacrifice majeur (100 grain + un taureau) pour un effet de saison — **S, ★**
- Colère divine graduée : un dieu maudit envoie ses propres calamités scriptées — **M, ★★**
- Reliques et artefacts rapportés d'expédition, à placer au temple — **M, ★★**

## 🛠️ Confort et qualité

| Sujet | Effort | Impact |
|---|---|---|
| Sauvegardes multiples + export/import fichier | S | ★★★ |
| Tutoriel interactif guidé (pas à pas, sur la carte) | M | ★★★ |
| Statistiques et courbes d'historique (production, pertes, menace) | M | ★★ |
| Notifications navigateur à l'approche d'un assaut | S | ★★ |
| Accessibilité : taille de texte, palette daltonisme, contrastes, `prefers-reduced-motion` | M | ★★ |
| Support tactile / mobile (la carte SVG s'y prête, le HUD non) | L | ★★ |
| Localisation EN (les textes sont nombreux et littéraires) | L | ★ |
| Raccourcis clavier étendus + infobulles d'aide contextuelle | S | ★ |

## ⚙️ Technique

- **Tests automatisés** : Vitest sur la logique (économie, combat, résolution hors-ligne) + Playwright e2e sur les parcours clés. Aujourd'hui tout est vérifié à la main — **M, ★★★** *(le plus rentable à long terme)*
- **Découpage du bundle** : 340 kB en un seul morceau ; séparer l'art des bâtiments en imports dynamiques — **S, ★★**
- **PWA installable et hors-ligne** — **S, ★★**
- **Perf carte** : culling des détails hors écran, réduction des nœuds SVG au dézoom (LOD) — **M, ★★**
- **Comptes et sauvegarde serveur** — **L, ★**
- **Multijoueur asynchrone** : raider le village d'un autre joueur, façon Clash of Clans — **XL, ★★★**

---

## Ordre conseillé (après les lots 2 à 6)

1. **Cartes propres à chaque acte** : la campagne change la saison, le ciel, l'état de départ et le récit, mais tous les actes se jouent sur la même plaine. C'est la dette la plus visible du lot 6 — cinq terrains (grève, plaine, murailles, fleuve, ruines) sont déjà nommés dans le type `CadreActe` et n'attendent que leur art.
2. **Siège sans fin** : peu de code, beaucoup de rejouabilité — et les hauts faits sont déjà là pour le noter.
3. **Nouvelle Partie +** : le prestige est calculé et figé à l'abdication ; il ne reste qu'à le reporter sur la partie suivante.
4. **Formations et unités** puis **héros ennemis** (Achille assiégeant *votre* village, avec ses capacités retournées contre vous — tout le socle existe).
5. **Familles et lignées** : le prolongement le plus naturel des villageois nommés.
6. **Tests de rendu** : les 165 tests couvrent les règles, pas les composants. Un test de rendu sur le HUD et les panneaux attraperait ce que seul l'œil voit aujourd'hui.

## 🐞 Dette connue

- **Les cinq cadres d'acte (`CadreActe`) ne sont pas peints** : la campagne joue sur la carte du
  village, avec la saison et le ciel de l'acte pour tout dépaysement. La grève de Sigée et les
  ruines d'Ilion méritent leur propre terrain.
- Trois défauts trouvés par les tests et **non corrigés** (ils demandent un arbitrage d'équilibrage) :
  `lancerExpedition` ne transmet pas `reducJoueur`, donc la garde d'Ajax ne protège personne en
  expédition ; `benir` calcule la puissance sur la relation BRUTE alors que le panthéon affiche la
  relation effective (l'orgueil d'Agamemnon est cosmétique sur les bénédictions) ; l'arc d'Achille a
  un cul-de-sac (plafond 3 contre un nœud qui exige le niveau 4).
- `pertesCiviles` ne compte que les départs de famine : un assaut perdu vole des réserves, il ne
  tue personne.
- Le réglage du son a changé de clé (`palladion-audio-v2`) pour imposer les nouveaux volumes :
  un joueur qui avait baissé la musique la retrouvera au réglage par défaut.
- Le comptoir d'échange n'a pas de mémoire : il propose toujours bois → bronze à l'ouverture.
- Les renforts alliés ne sont pas figurés distinctement sur le champ de bataille (ils portent les couleurs du joueur).
- La résolution hors-ligne ne connaît pas les secteurs : un assaut nocturne perdu marque forfaitairement la porte comme enfoncée.
