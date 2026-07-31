# PALLADION — feuille de route

État au 31 juillet 2026. Chaque entrée porte une estimation d'**effort** (S/M/L/XL)
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

## 🔨 Lot 2 — en cours de spécification

Les six chantiers demandés, dans l'ordre où je les attaquerais.

| # | Chantier | Effort | Impact | Notes de conception |
|---|---|---|---|---|
| 1 | **Visuels divins selon la ferveur** | S | ★★★ | Zeus : éclair jaune (en grâce) → bleu-blanc (chéri) → rouge-pourpre fendant le ciel (élu). Poséidon : onde verte → turquoise → raz-de-marée d'écume. Athéna : halo gris-perle → or pâle → égide à tête de Gorgone tournoyante. Arès : brume rouge → braise → aura sanglante avec corbeaux. Un dieu **offensé** doit avoir un visuel *pâle et avorté* : la punition se voit. |
| 2 | **Saisons et météo** | M | ★★★ | Cycle de 4 saisons (≈ 4 journées de jeu chacune). Printemps +grain, été sécheresse/incendies, automne récolte, hiver production ↓ et pas d'expédition maritime. Météo par-dessus : pluie (arcs −30 %, boue = marche plus lente), brume (portée des tours ↓, éclaireurs aveugles), orage (Zeus plus généreux), canicule. Doit **changer la carte** visuellement : champs dorés, arbres nus, neige légère sur l'Ida. |
| 3 | **Héros récurrents à arcs narratifs** | XL | ★★★ | Le gros morceau — voir la section détaillée ci-dessous. |
| 4 | **Expéditions : piller ou secourir** | M | ★★ | Deux intentions par cible. *Pillage* : butin élevé, relation avec les dieux de l'hospitalité en baisse, menace en hausse, le village se souvient (garnison renforcée). *Secours* : un village assiégé appelle à l'aide (fenêtre de temps limitée), butin nul mais +relation Zeus/Athéna, alliance débloquée (tribut régulier, renforts en cas d'assaut), et la possibilité d'y perdre des hommes pour rien. Le choix doit être cornélien : richesse contre réseau. |
| 5 | **Succès, hauts faits et prestige** | M | ★★ | ~40 hauts faits (« tenir un assaut sur 3 fronts sans perdre un homme », « Élu des quatre Olympiens », « 3★ sur les 8 villages »). Écran de fin de partie avec score de prestige (bâtiments, dieux, hauts faits, survie) et titre (« Roi de pacotille » → « Égal des dieux »). Le prestige alimente la Nouvelle Partie + (voir modes de jeu). |
| 6 | **Sons et musique** | M | ★★ | Lyre en fond (village paisible), cors de guerre à l'alerte, tambour de siège, fracas d'armes, craquement de la brèche, chant d'aède aux fêtes, tonnerre des bénédictions. Web Audio API, sons de synthèse ou échantillons libres, **bouton coupe-son et volume persistés**, aucun son sans interaction préalable (politique navigateur). |

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

## Ordre conseillé

1. **Terminer le lot 2** en commençant par les visuels divins (rapide, très visible) et les saisons, avant les héros (le plus lourd).
2. **Siège sans fin** + **hauts faits** : peu de code, beaucoup de rejouabilité.
3. **Sauvegardes multiples** et **tests automatisés** : dette à payer avant que le jeu grossisse encore.
4. **Formations et unités** puis **héros ennemis** : le combat est déjà le point fort, on l'approfondit.
5. **Familles et lignées** : le prolongement le plus naturel des villageois nommés, et ce qui attacherait le plus le joueur à son village.
6. **Campagne narrative** en dernier : c'est un projet à part entière, à lancer quand tout le socle est stable.
