# PALLADION - feuille de route

État au 5 août 2026.

**Comment lire ce document.** Il est organisé par **priorité** puis par **domaine**, et non par
ordre chronologique : ce qui est en haut est ce qu'il faut faire ensuite. Chaque entrée à venir
porte une estimation d'**effort** (S / M / L / XL) et d'**impact joueur** (★ à ★★★).
L'historique des lots livrés est relégué en fin de document, pour mémoire.

---

## 📍 Où en est le jeu, en un coup d'œil

| Domaine | État | Reste à faire |
|---|---|---|
| Boucle de gestion | ✅ complet | rien de bloquant |
| Défense et batailles | ✅ complet | ordres, moral, **sept unités**, champions nommés, structure des bâtiments, cinq ouvrages intérieurs, **la Redoute, onzième bâtiment, qui riposte**, et un plan de défense réglé en temps de paix - héros compris |
| Offensive (8 places fortes) | ✅ complet | rien de bloquant - pillage/secours, alliances, tribut, **caravanes**, **espionnage**, **ouvrages ennemis à abattre** |
| Économie | ✅ complet | rien de bloquant - **marché à cours flottants**, **arbre de vingt découvertes**, **six merveilles** |
| Dieux et ferveur | ✅ complet | rien de bloquant - arbre de faveur, **oracles**, **colère graduée**, **reliques** |
| Héros (8, arcs, entretien) | ✅ complet | rien de bloquant |
| Diplomatie | ✅ complet | rien de bloquant - relations, présents, pactes, mariages, trahisons |
| Village vivant | ✅ complet | âges, foyers, lignées, transmission des métiers |
| Contenu narratif | ✅ complet | 41 dilemmes, 55 missions, 51 hauts faits, campagne en 5 actes |
| Modes de jeu | ✅ **quatre** | bac à sable, campagne, **siège sans fin**, **défi hebdomadaire** - plus **Nouvelle Partie +** |
| Tests | ✅ **911 tests + 7 parcours e2e** | tests de règles, de rendu et de bout en bout |
| Art | ✅ complet | rien de bloquant - carte allégée, culling, palier de détail, temple refait, **remparts et tours redessinés par niveau** |
| Accessibilité / mobile | ❌ non traité | tactile, contrastes, `prefers-reduced-motion` |
| Multijoueur / serveur | ❌ non traité | hors périmètre pour l'instant |

---

## 🎯 Priorité 1 - ce qui manque le plus au jeu

Les priorités 1 et 2 précédentes ont été livrées en entier. Ce qui reste au sommet est
désormais d'un autre ordre : le jeu est complet, il lui manque du polish et de la portée.

| # | Chantier | Effort | Impact | Pourquoi maintenant |
|---|---|---|---|---|
| 1 | **Accessibilité** | M | ★★★ | Rien n'a été fait, et le jeu est désormais assez riche pour que ce soit gênant : palette daltonisme (les jauges de secteur et les tendances de cours reposent sur le vert/rouge), taille de texte, `prefers-reduced-motion` pour les animations SMIL, focus clavier sur les panneaux. |
| 2 | **Équilibrage d'ensemble** | M | ★★★ | Huit systèmes se sont ajoutés en peu de temps. Personne n'a encore joué une partie entière avec commerce **et** technos **et** merveille **et** reliques : les multiplicateurs se cumulent et il faut vérifier qu'une cité optimisée ne devient pas invulnérable. Un banc d'essai de simulation (jouer mille minutes sans écran) serait le bon outil. |
| 3 | **Support tactile / mobile** | L | ★★ | La carte s'y prête (pincer pour zoomer est déjà à moitié là dans la caméra), le HUD et les panneaux non. Le public potentiel est large. |

## 🎯 Priorité 2 - ce qui donnerait encore de la profondeur

| Chantier | Effort | Impact | Domaine |
|---|---|---|---|
| **Mode Fer** : sauvegarde unique, mort définitive, aucun retour | S | ★★ | mode |
| **Hécatombe** : sacrifice majeur pour un effet de saison entière | S | ★★ | divin |
| **Flotte** : des navires à bâtir au port, pour escorter les caravanes et porter les expéditions maritimes | M | ★★ | militaire |
| **Sièges de places fortes** : assiéger au lieu de razzier - couper l'eau, attendre, négocier une reddition | M | ★★★ | militaire |
| **Successions** : à la mort du chef, un héritier choisi parmi les lignées, avec ses traits | M | ★★★ | village |
| **Épidémies et médecine** : la peste comme système et non comme dilemme | M | ★★ | village |
| **Colonies** : fonder un second village qu'on gère de loin | L | ★★★ | économie |
| **Mode Historique** : sans dieux, économie plus dure, textes documentaires | M | ★ | mode |
| **Localisation EN** | L | ★ | confort |

## 🎯 Priorité 3 - bon à prendre

| Chantier | Effort | Impact | Domaine |
|---|---|---|---|
| PWA installable et hors-ligne | S | ★★ | technique |
| Rejouer une bataille passée (les annales gardent déjà de quoi) | M | ★ | confort |
| Éditeur de défis à partager par lien | M | ★ | mode |
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
- **Les multiplicateurs se cumulent sans plafond commun.** Reliques, découvertes, merveille, grâces
  divines et passifs de héros s'additionnent chacun dans son coin. Aucun ne dépasse seul, mais leur
  somme n'a jamais été mesurée sur une partie entière : voir l'équilibrage en priorité 1.
- **Le mode défi pose un alea déterministe par un singleton de module** (`poserAlea` dans defi.ts).
  C'était la solution la moins invasive - le moteur appelle `Math.random()` en quarante endroits -
  mais c'est un état global : deux parties ouvertes dans deux onglets partageraient la graine.
- **Cent quinze flous `a-flou1` et soixante-quatre `a-flou2` restent dans l'art.** Ce sont les ombres
  peintes, sur des formes statiques : le navigateur les rastérise une fois et les garde. Ils ne
  coûtaient rien dans la mesure, mais ils sont le plafond au-delà duquel une carte deux fois plus
  peuplée redeviendrait chère.
- **Les cinq ouvrages intérieurs n'ont pas de représentation sur la carte.** On les achète dans le
  panneau des remparts et l'on constate leurs effets, mais on ne voit ni la muraille d'acropole ni
  le bastion de la porte. C'est le seul système du jeu qui reste invisible.

---

## 📚 Historique des lots livrés

Conservé pour mémoire. Le détail des choix de conception vit dans les commentaires du code - c'est
là qu'il reste juste.

### Lot 14 - ce qu'on croyait voir, et ce que la mesure disait *(le plus récent)*

Sept demandes, et **trois diagnostics retournés** : à chaque fois, le défaut n'était pas là où le
symptôme le désignait.

| Sujet | Ce qui a été fait |
|---|---|
| **Les héros en expédition** | Le reproche était juste, la cause non. Ils MARCHENT et frappent - relevé à graine égale sur la forteresse mysienne, deux héros font passer la même colonne de 0 à 179 dégâts portés et de 0 à 8 hommes debout. C'est l'ESTIMATION du panneau qui sommait les unités et rien d'autre : elle annonçait 226 dans les deux cas. Corriger la participation aurait doublé des bras déjà comptés. Un héros est désormais pesé dans la même métrique que le reste du panneau, appliquée à ses statistiques réelles - son poids tombe de ses points de vie, il n'est pas décrété. Et ils se postent nommément sur un pan, ce qu'`ordres.secteurs` ne pouvait pas faire sans emmener les trente hoplites avec Hector. |
| **La Redoute, onzième bâtiment** | Elle vivait comme un compteur greffé sur le panneau des remparts. La cascade redoutée était petite - tout itère `BUILDING_IDS` - mais un garde-fou a attrapé un mensonge que personne ne cherchait : deux hauts faits promettaient « les dix domaines du village ». Sa place a été choisie **sur capture après que la mesure a trompé** : 7 225 positions tiennent dans l'enceinte, aucune ne laisse la masse libre, et la « meilleure » au calcul posait une file d'arcs de scorpions - ajourée, donc gratuite au calcul - en travers de la forge. |
| **Les expéditions** | Une place entière valait 162 points de structure quand cinq hoplites en portent 45 par seconde : elle tombait en une seconde et demie. La structure suit maintenant la puissance ET le matériau, jamais le nombre d'hommes envoyés - une jauge est une propriété de la chose mesurée, et amener du monde doit payer. Et les ruines : un ouvrage abattu gardait son dessin intact sous trois disques de fumée pâle, ce que le joueur a décrit comme « transparent ». Le décor sait désormais ce qui est tombé et le remplace par sa ruine. |
| **La face interne des remparts** | L'appentis ne flottait ni par mauvaise cote ni du mauvais côté : par ABSENCE D'ÉPAISSEUR. Son seul indice de profondeur était un décalé en cosinus, qui tend vers zéro au nord de l'ellipse - exactement là où le joueur l'a photographié. Deux cotes partagées étaient fausses, donc le défaut existait aussi au niveau 4. Une cinquième règle rejoint l'en-tête du fichier : tout ouvrage du dedans a son pied 0,591 × sa profondeur plus bas à l'écran. |
| **Le panneau d'assaut** | Quatre cadres imbriqués dans 300 px, et un schéma d'enceinte qui défilait sous son étiquette. La barre d'ordres devient une section plutôt qu'une boîte, et le panneau s'ouvre à 62 % de la hauteur utile le temps du réglage - le dépliage est un geste délibéré. Replié il tient à 305 × 170, bord haut à 417 px quand l'arc du pan Nord s'arrête à 317 : rien n'est repris de ce que le lot 13 avait dégagé. |
| **Combats en ×1** | Traité au lot 13 pour la simulation ; ici c'est `setVitesse` qui n'était pas gardé - les raccourcis clavier ne passent pas par les boutons désactivés. |

**Une leçon de méthode, la même trois fois :** le symptôme désigne un coupable, la mesure en
désigne un autre. « Les héros ne comptent pas » → ils comptaient, c'est l'affichage qui mentait.
« Le mur a un souci » → le souci était aussi au niveau au-dessus. « La meilleure place au calcul »
→ la capture l'a réfutée.

### Lot 13 - deux boutons qui plafonnaient le jeu, et un mur qui ne pouvait pas coller

Sept demandes. Deux d'entre elles ont demandé de **réfuter le premier diagnostic** avant de
pouvoir être corrigées, et c'est là que le lot s'est joué.

**La navigation des encarts n'était pas un défaut des encarts.** Le premier relevé accusait la
carte du village, qui reste montée derrière les panneaux. Une passe adversariale l'a démenti :
il y avait DEUX invalidateurs de peinture, indépendants, **et ils se masquaient l'un l'autre**.
Couper les animations CSS seules ne donnait rien, parce que l'horloge SMIL de la carte saturait
déjà l'image - d'où la conclusion, fausse, qu'elles étaient innocentes. `box-shadow` n'est pas une
propriété que Chromium sait composer : deux boutons du HUD la faisaient battre **à l'infini**, et
tenaient le document entier dans un cycle peinture-à-chaque-image. **Tout le jeu tournait à 12
images par seconde, depuis toujours.**

| Sujet | Ce qui a été fait |
|---|---|
| **Fluidité** | Les deux lueurs deviennent STATIQUES (trois pulsations ne suffisaient pas : une pulsation en cours tient encore l'image à 66,6 ms). Trois autres coupables mesurés puis retirés après A/B au pixel : le `backdrop-filter` du panneau de bâtiment (17 ms/image), les **trois** du suivi de missions - qui est à l'écran en permanence - (10,4 ms/image, 0,00 % de pixels écartés de plus de 1/20), et l'horloge de la carte, gelée tant qu'un encart occupe l'écran mais **jamais** pendant un combat. Relevé final : panthéon 54,6 → 17,2 ms (18,3 → 58,1 i/s), panneau de bâtiment 50,6 → 16,7 ms (19,8 → 59,9 i/s). |
| **Isolation des parties** | La campagne héritait des villages pillés, des alliances et des relations de la partie qu'on quittait. Le trajet par les emplacements était propre : c'est `choisirMode` qui posait le mode sur l'état COURANT sans remettre le monde à neuf. Le défi gardait même la cité entière - son score n'était pas comparable - et `poserAlea(null)` n'était appelé nulle part, si bien qu'une campagne lancée après un défi rejouait la graine de la semaine. L'héritage NG+ reste intact : un legs choisi traverse, l'état du monde jamais. |
| **Remparts et tours** | `TourArcher` ne recevait ni le niveau du mur ni la géométrie : un seul dessin pour les remparts 2, 3 et 4, dont le plancher culminait 23 à 28 px au-dessus du chemin de ronde. La tour n'a plus de cote propre - son plancher EST le chemin de ronde de son niveau - et elle chevauche la courtine au lieu d'être posée à côté. Trois défauts de fond réglés dans le mur : l'échantillonnage à pas d'angle qui empilait les créneaux à la verticale aux extrémités de l'ellipse, la face unique pour 360°, et la porte qui ne pouvait structurellement pas se raccorder aux deux bouts du mur. |
| **Plan de défense** | La barre d'ordres n'existait qu'en bataille : on ne pouvait préparer sa défense qu'en la subissant. Le plan est permanent, réglable en paix, adopté à l'ouverture de chaque bataille - et il MONTRE l'enceinte, pans nommés et réserve, plutôt que d'offrir des menus déroulants. Un pan se désigne par son NOM, jamais par son rang : `choisirFronts` mêle les flancs d'un soir à l'autre. |
| **Menu d'assaut** | Ce n'était pas sa taille mais sa PLACE : le zoom de la caméra de bataille est borné à 1,7, donc à trois fronts elle ne peut plus reculer et plaque le pan Nord juste sous le bandeau - 45 % de son arc masqué, 22 de ses 41 créneaux, mesuré. Il passe à gauche, à mi-hauteur, dans la bande libre entre les jauges nord et sud. Zéro pixel masqué, vérifié de 1100×800 à 1920×1080. |
| **Combats en ×1** | La simulation l'était déjà ; `setVitesse` ne l'était pas, et les raccourcis clavier ne passent pas par les boutons désactivés. On posait ×8 en pleine mêlée : rien n'accélérait sur l'instant, puis le règne bondissait de huit crans à la fin de l'assaut. |

**Reste ouvert, mesuré :** le village AU REPOS ne gagne rien (72,5 ms). Son horloge doit tourner
pour qu'il vive, et sa rastérisation - environ 180 flous gaussiens - est désormais le seul
invalidateur restant. C'est le chantier des ombres peintes au dégradé plutôt qu'au filtre, déjà
noté au lot 12 et toujours à faire.

### Lot 12 - l'horloge des dieux, la Redoute et le temple

Sept demandes, dont **deux régressions invisibles** que seule une mesure a pu nommer.

L'éclair de Zeus ne se voyait plus. La cause n'était ni le dessin ni le déclenchement :
**l'horloge SMIL est celle du DOCUMENT, pas celle de l'élément**. Un effet inséré trois minutes
après le chargement a son intervalle entièrement dans le passé - le navigateur le déclare fini et
gèle aussitôt la dernière image. Mesure faite sur Chromium : l'opacité d'un fondu « 1 → 0 » lue
200 ms après l'insertion vaut **zéro**. Le même défaut faisait apparaître les flèches directement
sur leur cible et couchait les morts avant leur chute : **79 animations gelées** sur une seule
image de bataille.

| Sujet | Ce qui a été fait |
|---|---|
| **Horloge des effets** | Trois enveloppes - `Anim`, `AnimT`, `AnimM` - posent `begin="indefinite"` puis arment l'animation quand le nœud entre dans le document. Après correction, le même fondu mesure 0,89 à 200 ms et 0 à 2,2 s. Un test de rendu l'exige désormais de toute animation « une passe » de la bataille : sans le correctif, il en dénonce 79. |
| **Fluidité mesurée** | Les combats saccadaient pour deux raisons distinctes. Les **deux cents flous gaussiens** de la carte étaient calculés en `linearRGB` par défaut, ce qui impose une conversion d'espace colorimétrique de toute la région à chaque rastérisation : `colorInterpolationFilters="sRGB"` fait tomber le blocage du fil principal de **2 840 ms à 500 ms** par tranche de dix secondes d'assaut. Et pendant une expédition, la carte du village gardait **4 900 nœuds animés** rastérisés sous un voile opaque, quand la scène du raid n'en compte que 714 : un `display:none` porte l'expédition de **9 à 24 images par seconde** (p95 : 168 → 61 ms). |
| **La Redoute** | Les cinq ouvrages intérieurs étaient tous PASSIFS - de la structure, des modificateurs, aucune arme. Une fois le mur passé, il ne restait que la mêlée. La Redoute est le pendant exact de la tour d'archers, à l'envers du temps : **muette tant que l'enceinte tient**, elle ouvre le feu à la brèche sur ce qui est ENTRÉ, et seulement sur lui. Trois scorpions, une structure propre - on peut la réduire au silence, sinon la brèche ne vaudrait plus rien. Le scorpion est de sept siècles postérieur à Troie : l'anachronisme est assumé et dit dans le panneau. |
| **Les ouvrages ennemis** | Les jauges de structure n'existaient qu'en défense : on lisait la santé de ses propres bâtiments en se faisant piller, jamais celle des bâtiments qu'on pillait. Chaque archétype de place forte a désormais ses ouvrages - tente du chef, entrepôt, donjon, corps de garde - aux positions exactes du décor peint, avec un CŒUR dont la chute décide du raid. Un ouvrage abattu se couvre de gravats et de fumée plutôt que de disparaître, et le sac complet vaut **+25 % de butin**. |
| **Le temple refait** | Écrit le premier comme référence, dépassé depuis par les neuf autres (246 lignes contre 900 à 1 200). Deux manques structurels : **pas de flanc** - un temple sans sa colonnade latérale qui fuit vers le fond n'a aucun volume en vue 3/4 - et **pas de sanctuaire** : il flottait seul au milieu de rien. Quatre âges désormais distincts : bois sacré, naïskos de brique crue, périptère de pierre, grand temple de marbre et d'or - avec péribole, autel des sacrifices, trépieds votifs, trésors et statue de culte devinée dans la pénombre. |
| **Agamemnon** | Ses deux conditions cochées en vert, le bouton éteint, le coût en gris neutre : la fiche disait « tout est réuni » sans dire ce qui bloquait. Rien n'était en panne - il manquait du bronze. Le coût se colore comme celui d'un chantier, et le bouton distingue « il ne viendra pas encore » de « les présents manquent ». |

**Reste connu et non traité** : les flous coûtent encore ~500 ms de blocage par dix secondes
d'assaut. Les retirer n'est pas gratuit - l'A/B au pixel montre le disque du soleil qui se cerne
d'anneaux durs. Il faudra peindre ces ombres au dégradé plutôt qu'au filtre, ouvrage par ouvrage.

### Lot 11 - la carte allégée

Un seul chantier, et un diagnostic qui a démenti l'énoncé. La feuille de route annonçait « une
trentaine de milliers de nœuds SVG au dézoom » et prescrivait un niveau de détail dégradé. **La
mesure en a compté 7 257** - le nombre n'était pas le problème. Ce qui l'était : **2 638 ms de
tâches longues sur 5 secondes**, soit plus de la moitié du fil principal, avec des blocages de
151 ms. Un observateur de mutations a tranché la question : **zéro nœud ajouté ou retiré** en
quatre secondes. Le DOM ne bougeait pas ; React rediffusait 7 257 éléments quatre fois par seconde
pour conclure chaque fois que rien n'avait changé.

| Sujet | Ce qui a été fait |
|---|---|
| **Mémoïsation de l'art** | `BatimentArt`, `Terrain`, `Murailles`, `Garnison` et `Ouvriers` ne dépendent que de props stables - un niveau, une saison, un effectif. Ils sont mémoïsés. La carte se re-rendait quatre fois par seconde uniquement parce que l'heure du jour avançait. |
| **Phase du jour quantifiée** | Le terrain est mémoïsé sur la phase, qui était un flottant continu : le mémo ne servait donc à rien. Arrondie au 1/240ᵉ de journée, l'astre avance toutes les deux secondes - imperceptible - et le terrain se reconstruit trente fois par journée de jeu au lieu de deux mille. |
| **Culling** | La caméra publie son cadre visible, **quantifié au pas de 120 unités** : sans cette quantification elle aurait re-rendu React soixante fois par seconde et le culling aurait coûté plus qu'il ne rapporte. Un édifice hors champ ne rentre plus dans le DOM : 7 257 → 5 588 nœuds au zoom 5. |
| **Palier de détail sur l'ombre portée** | Le vrai gouffre, trouvé en isolant les suspects un à un : les neuf filtres `feDropShadow` enveloppaient du contenu **animé** - feux, fumées, artisans au travail - et chaque image forçait la rastérisation du filtre entier. À la vue d'ensemble le coût mesuré est nul et l'ombre se voit : on la garde. Dès qu'on se rapproche, elle coûtait à elle seule 43 % du fil principal pour un halo d'un pixel et demi que les ombres peintes de l'art rendent déjà : on la retire, et le basculement se joue pendant le mouvement du zoom. |

**Résultat mesuré**, à nombre de nœuds inchangé et sans qu'un pixel bouge en vue d'ensemble :

| | avant | après |
|---|---|---|
| Vue d'ensemble, tâches longues / 5 s | 2 638 ms (25 blocages, pic 151 ms) | **56 ms** (1 blocage) |
| Zoom 5, tâches longues / 5 s | 1 716 ms | **0 ms** |
| Zoom 5, nœuds SVG | 7 257 | **5 588** |

### Lot 10 - la portée

Douze chantiers : les quatre priorités 1 restantes, les huit priorités 2 en entier. `+374` tests,
**758 au total**, plus sept parcours de bout en bout.

| Sujet | Ce qui a été fait |
|---|---|
| **Char de guerre** | La septième unité. Dans l'Iliade le char ne charge pas la ligne : il porte le champion, le dépose, l'attend. D'où sa conception - deux fois plus rapide que l'infanterie, il fond sur les tireurs **et les béliers** avant qu'ils aient servi trois fois, mais coûte plus cher que tout fantassin et ne fait rien à un mur. Sa silhouette est la seule **couchée** du champ : c'est ce qui le rend lisible en pleine mêlée. |
| **Tests de rendu** | 50 tests sur ce que le joueur VOIT, sept familles de composants, sans dépendance nouvelle (`react-dom/client` et l'`act` que React 18.3 expose). Deux pièges de l'environnement documentés à l'endroit où ils mordent : `MODE_TEST` rend `peutPayer()` toujours vrai, donc le refus se teste sur les marques visibles ; et jsdom n'a pas `matchMedia`, dont le suivi des missions se sert. |
| **Parcours e2e** | Sept parcours en Playwright Python - la technologie déjà au dépôt plutôt qu'une dépendance de plus. Chacun **affirme** au lieu de cliquer : la première partie mène du choix du mode à une mission réclamée, l'économie vérifie qu'affecter un paysan fait passer la ferme de 0 à 100 % et efface l'écriteau de la carte, la sauvegarde survit à un vrai rechargement. La moindre erreur JS fait échouer le parcours. |
| **Siège sans fin** | Le troisième mode, et le meilleur rapport plaisir/effort : il réemploie tout le moteur sans rien y ajouter. Vagues quadratiques douces, fronts de un à trois, un champion toutes les cinq vagues, répit qui se resserre sans jamais s'annuler. Production doublée car la reconstruction est la seule manœuvre qui reste ; ni dilemme ni expédition car on ne délibère pas et l'on ne sort pas. Le record vit à la racine de l'état et **survit au reset**. |
| **Oracles payants** | Six questions de prix croissant, le pendant honnête du murmure d'Athéna : ici on paie et l'on sait. Contrat verrouillé par les tests - l'oracle ne mentit jamais (sa réponse LIT l'état) et **ne facture jamais du vide**. |
| **Colère divine graduée** | Quatre paliers, et des calamités qui ressemblent à leur dieu : la foudre de Zeus et les serments rompus, le séisme de Poséidon et la mer fermée, Athéna qui retire l'adresse aux artisans, Arès qui souffle la panique. Toujours réparable dans le même battement par un sacrifice, et jamais deux fois d'affilée sur le même toit. |
| **Reliques** | Douze reliques rapportées d'expédition, qui ne font RIEN au magasin : le temple compte moins de niches (2/3/4/6) qu'on n'en ramène, donc il faut choisir. Un temple en ruine perd ses niches. |
| **Commerce vivant** | Le port n'est plus un distributeur. Les cours dérivent vers ce que le monde impose - rareté lue dans la table des saisons elle-même, ciel du jour, mer fermée, ruines à rebâtir - lentement et sans tirage : guetter un bon cours est une décision. Les caravanes touchent le prix plein majoré contre du temps et un risque calculé sur la relation ; risque et gain **figés au départ**. Les routes se ferment sur trois motifs nommés, et le tribut d'un allié voyage par la même route. |
| **Découvertes et merveilles** | Vingt technologies de l'âge du bronze avec leurs prérequis, une seule recherche à la fois. Et six merveilles dont **une seule** se bâtira par partie : chacune change la façon de jouer plutôt que d'ajouter cinq pour cent. |
| **Espionnage** | Le moyen payant et risqué d'en savoir plus sans Ulysse ni Cassandre. On envoie un villageois - un bras de moins tant qu'il est dehors - ou l'on paie un homme de métier. Le rapport est vrai ; s'il n'y a rien à voir, on ne facture rien. |
| **Nouvelle Partie +** | Le prestige d'un règne achevé se convertit en héritage : murs debout, découverte acquise, héros déjà connu qui vient sur un mot. La difficulté monte en regard, et **la Troade se souvient** - un règne de pillard recommence entouré d'ennemis. L'archive traverse les règnes, hors sauvegarde de partie. |
| **Défi de la semaine** | Une graine dérivée de la semaine ISO : même Troade, mêmes vagues, mêmes dilemmes pour tous, donc des scores comparables. Contraintes tirées de la graine, objectif, classement local. |

### Lot 8 - la profondeur

Le plus gros lot du projet : huit chantiers, tous sous test (`+133` tests, 314 au total).

| Sujet | Ce qui a été fait |
|---|---|
| Trois nouvelles unités | Le **frondeur** (aucun bronze, la moins chère, monte au rempart mais porte les deux tiers d'un arc), le **peltaste** (court plus vite que l'infanterie et va d'abord aux tireurs) et le **bélier** côté joueur (abat un mur bien plus vite qu'une colonne d'hommes, inutile en défense). Chacune fait ce qu'aucune autre ne fait. |
| Arbre de faveur | La relation à un dieu se **dépense** : douze grâces permanentes, trois par Olympien, prises dans l'ordre et jamais reprises. Récoltes de Zeus Xenios, mer ouverte en hiver de Poséidon, blessés relevés d'Athéna, entretien allégé d'Arès… Monter sa ferveur ou l'échanger contre un don définitif est le vrai arbitrage. |
| Ordres à la troupe | On regardait la bataille. Trois postures - **tenir**, **mur de boucliers** (−45 % de dégâts subis, on ne poursuit plus, la ligne ne rompt presque jamais), **charger** (+40 % de dégâts et l'on sort crever les béliers sous le mur) - deux façons de tirer (**tendu** / **en cloche**, moitié plus loin sur le plus gros tas), et un **pan assignable par type d'unité**. Un ordre se tient cinq secondes. |
| Champions achéens | Passé une certaine menace, un **nom** prend la tête de la colonne : Achille, Hector, Ajax, Agamemnon, Ulysse, Diomède, Énée, Cassandre - précisément ceux qu'on peut recruter, et c'est parce qu'ils ne sont *pas* à votre table qu'ils marchent sur vos murs. Manœuvre annoncée d'avance avec son décompte ; l'abattre l'éteint sur-le-champ. La nuit ne les efface pas. |
| Moral de troupe | Une ligne ne fond plus jusqu'au dernier homme : sous un seuil, les hommes **rompent** un par un, en commençant par les plus entamés. Un héros debout abaisse fortement ce seuil. Jauge et marqueur de seuil dans le bandeau, bouclier jeté au sol pour le fuyard. |
| Terrains des cinq actes | Chaque acte a désormais **sa terre**, pas seulement ses repères : le sable de Sigée qui remonte dans l'herbe, la boue et les ornières de dix ans de camp, la poussière du siège où plus rien ne pousse, la crue du Scamandre avec ses flaques et ses roseaux, la cendre d'Ilion avec ses braises et ses souches noircies. |
| Familles et lignées | Une journée de jeu vaut deux ans. Les habitants **vieillissent** (un enfant aide sans remplacer et ne porte pas les armes, un ancien rend moins et finit par mourir), **font foyer** entre maisons différentes, et un enfant né dans un foyer **apprend le métier d'un de ses parents**. Marier son forgeron, c'est se donner des forgerons. Pyramide des âges au recensement. |
| Diplomatie vivante | Chaque place forte tient sa **relation** (−100…+100) et la Troade est petite : ce qu'on fait à l'une, les sept autres l'apprennent. Un **présent** rachète une rancune, un **pacte** s'achète à qui vous voit bien, un **mariage** coûte un habitant pour toujours mais scelle une alliance que rien ne dénoue, au tribut doublé. Une alliance ordinaire se rompt si la relation retombe ; un village hostile grossit la menace. |
| Annales du règne | Un relevé chiffré toutes les trente secondes, borné à 260 : greniers, garnison, menace, ambiance, faveur, remparts, prestige. Quatre graphes dessinés en SVG comme le reste du jeu, avec la **pente par minute** de chaque série - c'est elle qui répond à « est-ce que ça monte ? ». |
| Notifications navigateur | Un assaut annoncé, un village qui implore : on prévient hors de l'onglet, jamais quand la page est visible, avec un débit d'une notification par sujet et par minute. Le nom du champion passe dans le titre. |

### Lot 7 - les dettes refermées

Décor des cinq actes (repères) · garde d'Ajax enfin transmise en expédition et sommée · orgueil
d'Agamemnon appliqué aux bénédictions · arc d'Achille débloqué jusqu'au bout · fronts comptés dans
la résolution nocturne · pertes civiles réelles · renforts alliés à leurs couleurs · réglages du son
respectés · dernier troc mémorisé.

### Lot 6 - campagne, tests et bundle

Campagne « La Chute » en cinq actes (situation héritée, objectifs sur la manière de tenir, défaite
réelle, héros imposés) · 165 tests Vitest sur huit domaines · bundle coupé en trois morceaux ·
actes de missions verrouillés · musique de la paix ramenée à 24 attaques/minute · bandeau du haut
en deux rangs · liseré doré et émoji explosion retirés de la mêlée · l'encart de Zeus ne masque
plus une croix de fermeture · départs de famine.

### Lot 5 - sorties, missions et comptoir

Une croix, Échap ou un clic à côté pour refermer chaque menu (châssis commun à en-tête figé) ·
encart chiffré pour la vitesse du temps · missions intégrées au jeu (panneau complet, pastille,
bouton « y aller », trace au journal) · musique enfin audible · comptoir d'échange qui compte en
valeur et non en tas · sept premiers habitants couvrant les six métiers.

### Lot 4 - Zeus, métiers et héros incarnés

Tutoriel scénarisé en 15 étapes à focus verrouillé, porté par un Zeus dessiné en SVG · encarts au
survol partout · métiers de naissance et affectation manuelle · héros visibles sur la carte et au
premier rang des lignes · pictogrammes peints à la place des émojis.

### Lot 3 - zoom, icônes et villages ennemis

Zoom molette et déplacement manuels · remparts endommagés visibles hors combat · pictogrammes de
ressources peints · descriptions du HUD · animation de victoire · jauge de ferveur à sept bandes ·
décor peint pour les huit places fortes · zone de portée des tours rendue discrète.

### Lot 2 - dieux, saisons, héros et campagne offensive

Visuels divins selon la ferveur (sept paliers) · quatre saisons et six météos qui pèsent sur la
récolte et la bataille · huit héros à arcs narratifs mortels · expéditions à deux intentions
(piller / secourir) avec alliances · 45 hauts faits et prestige · bande-son entièrement synthétisée.

### Socle initial

10 bâtiments × 4 niveaux, production, moral, menace, stockage, cycle jour/nuit, vitesses ×1-×8,
résolution hors-ligne · remparts à 4 niveaux, tours d'archers, 3 unités, batailles animées ·
8 places fortes de la Troade · 4 Olympiens · dilemmes à issues cachées · missions en fil rouge ·
refonte graphique peinte (lumière au nord-ouest, ombres portées, matières).
