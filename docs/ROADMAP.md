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
| **Campagne — La Chute** | XL | ★★★ | 5 actes scénarisés suivant l'Iliade, du débarquement achéen à la ruse du cheval. Objectifs imposés, cartes différentes, héros scriptés. C'est ce qui transformerait le jeu en *jeu narratif* plutôt qu'en bac à sable. |
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

## Ordre conseillé (après les lots 2 et 3)

1. **Tests automatisés** : le jeu tient maintenant dans ~15 000 lignes et tout se vérifie encore à la main. Vitest sur l'économie, le combat, la résolution hors-ligne et les hauts faits — c'est le plus rentable désormais.
2. **Découpage du bundle** : 870 kB en un seul morceau. L'art des bâtiments et les décors d'expédition sont les premiers candidats à l'import dynamique.
3. **Siège sans fin** : peu de code, beaucoup de rejouabilité — et les hauts faits sont déjà là pour le noter.
4. **Nouvelle Partie +** : le prestige est calculé et figé à l'abdication ; il ne reste qu'à le reporter sur la partie suivante.
5. **Formations et unités** puis **héros ennemis** (Achille assiégeant *votre* village, avec ses capacités retournées contre vous — tout le socle existe).
6. **Familles et lignées** : le prolongement le plus naturel des villageois nommés.
7. **Campagne narrative** en dernier : un projet à part entière, à lancer quand tout le socle est stable.

## 🐞 Dette connue

- Le bundle dépasse 500 kB : aucun découpage dynamique pour l'instant.
- Aucun test automatisé : chaque lot est vérifié à la compilation et à la main.
- Les renforts alliés ne sont pas figurés distinctement sur le champ de bataille (ils portent les couleurs du joueur).
- La résolution hors-ligne ne connaît pas les secteurs : un assaut nocturne perdu marque forfaitairement la porte comme enfoncée.
