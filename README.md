# 🏛️ PALLADION - Chroniques de la guerre de Troie

🇫🇷 Français | [🇬🇧 English](README.en.md)

> Le *Palladion* : la statue d'Athéna tombée du ciel - tant qu'elle se tient dans la cité,
> Troie ne peut pas tomber. Un talisman divin qui conditionne la survie de la ville :
> exactement le pari de ce jeu, où votre relation aux dieux décide de votre résistance
> aux assauts.

**Jeu de gestion de village à l'époque de la guerre de Troie.** Bâtissez, défendez, honorez
les dieux - et regardez votre village **changer réellement d'apparence** à chaque
amélioration, à chaque saison, à chaque brèche. Puis publiez votre cité en un code de cent
vingt caractères, et laissez un ami venir s'y casser les dents.

**100 % front-end** (React + TypeScript + SVG), sauvegarde locale, déployable en statique.
Zéro image, zéro son téléchargé : **tout est dessiné et synthétisé par le code**.

| Du hameau…                                             | …à la cité de légende                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------ |
| ![Village au premier printemps](docs/village-debut.jpg) | ![Cité complète, onze domaines au niveau 4](docs/village-max.jpg) |

## ✨ Ce qui rend PALLADION différent

### 🏺 Le duel : raider le village d'un autre joueur, sans serveur

Le jeu n'a **ni serveur, ni compte**. Le multijoueur prend donc la forme du **courrier** :
trois codes qui voyagent en texte, dans un message, un mail, ce que vous voulez.

Vous **scellez votre carte de défense** - une centaine de caractères, `PALL-D1-AQBOGE…` - et
vous la donnez. Elle publie une **cible** : vos murs et leur structure du moment, vos tours,
la Redoute, les ouvrages intérieurs, votre garnison, **votre plan de défense entier**, vos
héros, le tempérament de votre chef. Elle ne contient ni vos réserves, ni vos chantiers, ni
vos habitants - la lire ne donne aucun moyen de reprendre votre règne.

Votre ami colle ce code chez lui, **voit votre cité avant de s'engager**, compose sa colonne,
choisit par quels pans il entre, et se bat **contre votre plan**. Il vous renvoie un rapport ;
**votre client rejoue l'assaut** depuis la graine qu'il contient et compare. « La simulation
confirme » → cela s'applique. Sinon → refusé, avec son motif.

L'anti-triche est donc la **reproductibilité**, pas une signature. Le même rapport présenté
deux fois est refusé ; un seul caractère changé est refusé ; un rapport qui ne correspond à
aucune carte que vous avez émise est refusé. Et le butin est plafonné, calculé sur la carte
**émise** : publier n'est jamais signer un chèque en blanc.

C'est aussi la première fois que le **plan de défense** que vous réglez en temps de paix
affronte quelqu'un.

### 🐴 « La Chute » - une campagne en cinq actes

La campagne suit l'Iliade - les mille nefs, la colère d'Achille, sous les murs, le fleuve, le
cheval - mais d'un point de vue qui n'est pas celui de l'épopée : **vous n'êtes pas Troie**.
Vous tenez un village de la Troade sur la route des armées, et la grande guerre vous écrase
par accident.

Chaque acte **impose une situation héritée** plutôt qu'un départ à zéro : les bâtiments
debout, la garnison, la saison, le ciel, les relations divines - et jusqu'à un pan de mur déjà
à terre à l'acte IV, qui s'ouvre donc sur un siège en cours. Les objectifs ne demandent pas
des totaux mais **une manière de tenir** : « trois assauts sans qu'un seul pan cède », « un
assaut sans perdre un homme », « la quatrième tour avant la nuit du sac ». Chacun peut se
perdre, et l'on reprend l'acte, pas la campagne. Certains héros s'imposent sans rançon parce
que le récit les amène : Hector à l'acte III, Achille au IV, Énée et Cassandre dans les
cendres du V. Et chaque acte a **sa terre** : le sable de Sigée, la boue de dix ans de camp,
la poussière du siège, la crue du Scamandre, la cendre d'Ilion.

![Le prologue de l'acte I](docs/campagne.jpg)

### ⚡ Zeus vous prend par la main

La première partie ne commence pas par un pavé d'aide : le maître de l'Olympe descend et fait
la leçon lui-même, en quinze étapes. À chaque fois, tout l'écran s'éteint **sauf ce qu'il faut
toucher** - et il ne suffit pas de cliquer « suivant » : les étapes qui comptent exigent le
geste. Bâtir la ferme, y placer un paysan, dresser l'enceinte, ouvrir le temple. On ne peut
ni se perdre, ni survoler.

![La leçon de Zeus](docs/tutoriel.jpg)

### 🧱 Une évolution **visuelle** des bâtiments

Chaque bâtiment est dessiné **en SVG par code**, en volumes texturés (tuiles, pierre, chaume,
sillons) avec une apparence distincte par niveau. Les remparts passent de la palissade de
pieux → au muret de pierre sèche → à la muraille crénelée → aux hautes murailles « bâties par
Poséidon », avec un dessin propre à chaque niveau **des deux côtés du mur** : appareil et
archères au-dehors, éperons, abouts de chaînage et volées d'escalier au-dedans. Idem pour les
dix autres domaines. Les dégâts se voient et **restent** : fissures, pans effondrés, vantaux
arrachés - mais après un assaut, les bâtiments abattus **se relèvent d'eux-mêmes** en cinq
secondes jusqu'à leur niveau d'avant. Et le village **vit** : villageois qui flânent, char à
bœufs, chèvres, moutons, fumées et braseros.

### 🌱 Quatre saisons et un ciel qui change tout

Quatre journées de jeu par saison. Le **printemps** fait lever les blés, l'**été** durcit la
terre et ouvre la mer, l'**automne** remplit les greniers, l'**hiver ferme la mer** - port au
tiers, places d'outre-mer hors d'atteinte, sauf si Poséidon vous a accordé sa grâce. Par-dessus,
une météo qui tourne : la **pluie** détend les cordes d'arc, la **brume** rogne la portée des
tours, l'**orage** rend la foudre plus lourde, la **neige** met les colonnes au pas. Rien de
tout cela n'est qu'un chiffre : le feuillage roussit puis tombe, les congères s'installent.

![L'hiver sur la Troade](docs/saisons.jpg)

### ⚔️ Des assauts joués sous vos yeux, et des ordres à donner

Des bandes armées attaquent régulièrement, et les éclaireurs annoncent **la composition de la
vague, la récompense promise, et parfois le nom du champion qui la mène** - l'un des huit héros
de la matière troyenne, précisément ceux qu'on peut recruter, avec sa manœuvre annoncée à
l'avance et son décompte. La vague se scinde entre **plusieurs fronts** : chaque pan a ses
propres points de structure et **peut céder seul**.

Et l'on ne regarde pas : on commande. Trois **postures de ligne** (tenir, mur de boucliers,
charger), deux **façons de tirer** (tendu, en cloche), un **pan assignable par type d'unité**
et **par héros nommément**. Le tout se règle **en temps de paix** dans un plan de défense
permanent, que chaque bataille adopte à son ouverture. Le **moral** compte : sous un seuil,
les hommes rompent un par un plutôt que de fondre jusqu'au dernier - et un héros debout
abaisse fortement ce seuil.

Une fois le mur percé, il reste de quoi se battre : cinq **ouvrages intérieurs** attestés dans
les citadelles de l'âge du bronze (muraille d'acropole, bastion de la porte, galeries de
Tirynthe, poterne, citerne taillée dans le roc) et **la Redoute** - une plateforme à scorpions
muette tant que l'enceinte tient, qui ouvre le feu à la brèche sur ce qui est *entré*.

![Un assaut sur trois fronts](docs/bataille.jpg)

### 👷 Chaque habitant a un nom, un métier, un âge - et une famille

Un villageois naît paysan, bûcheron, tailleur de pierre, forgeron, prêtre ou docker. **À son
métier il rend pleinement ; ailleurs, 55 %.** Personne ne prend son poste tout seul : c'est
votre décision à chaque chantier livré, et un atelier laissé vide plante un écriteau rouge sur
la carte.

Une journée de jeu vaut **deux ans de vie**. Les habitants vieillissent (un enfant aide sans
remplacer et ne porte pas les armes, un ancien rend moins et finit par mourir), **font foyer**
entre maisons différentes, et un enfant né dans un foyer **apprend le métier d'un de ses
parents**. Marier son forgeron, c'est se donner des forgerons ; le laisser mourir célibataire,
c'est perdre la forge avec lui.

Et le même arbitrage vaut pour l'armée : **un soldat est un villageois en moins** - il quitte
l'atelier, ne produit plus et mange le double.

### 👑 Un chef qui vieillit, qui meurt, et qu'on remplace

Vous n'êtes plus une abstraction. Votre chef porte un nom, une maison, un âge, et **deux traits
parmi douze** qui changent le jeu - bâtisseur, homme de guerre, fils de la terre, impie, aimé
du peuple, main dure, pillard, prodigue… Aucun n'est un cadeau : chacun donne d'un côté et
retire de l'autre.

Il vieillit sur la même horloge que ses sujets, et il meurt. Le trône devient alors **vacant** -
il n'intronise personne à votre place. On choisit un héritier parmi les adultes des maisons du
village, chacun avec ses propres traits, affichés avant le choix. Et couronner quelqu'un le
**retire du village** : vous perdez un bras, et son métier avec lui. C'est l'arbitrage.

Le fondateur, lui, n'a aucun trait : il est la mesure plate, et le tempérament entre dans la
dynastie à la première succession.

### 🛡️ Huit héros - qu'on nourrit, qu'on perd

Ils ne s'achètent pas : ils viennent quand la cité en est digne. Hector veut des remparts de
niveau 3 et Zeus en grâce ; Ulysse un port et la confiance d'Athéna ; Achille du sang déjà
versé. Chacun apporte un **passif permanent** et une **capacité** à invoquer en bataille, gagne
des niveaux en combattant - et **mange chaque minute**. Trois rappels d'entretien sans réponse,
et il reprend la route.

Ce sont de vrais habitants : on les voit **arpenter la place du village**, chacun à ses couleurs
et sous son nom, et ils **descendent se battre** au premier rang. Un héros mis à terre n'est pas
rayé de l'effectif - il est blessé, et sa capacité reste indisponible le temps qu'il se relève.
Seul son arc peut le tuer.

Surtout, chacun traverse un **arc à embranchements** dont certaines branches ne se rejouent pas :
Achille peut mourir sous la flèche de Pâris, ou survivre inutile ; Hector peut sortir affronter
son destin, ou obéir et ne plus jamais grandir. **Les héros doivent pouvoir mourir** - c'est ce
qui rend leur présence tendue plutôt que confortable.

| La maisonnée héroïque              | Un choix sans retour                  |
| ------------------------------------- | ------------------------------------- |
| ![Panneau des héros](docs/heros.png) | ![L'arc d'Hector](docs/heros-arc.png) |

### 🗺️ Piller, secourir… ou assiéger

Huit places fortes de la Troade, chacune avec son **décor peint** et ses **ouvrages à abattre** -
tente du chef, entrepôt, donjon, corps de garde - dont un **cœur** dont la chute décide du raid.
Trois façons d'y marcher :

- **Piller** - butin élevé, mais Zeus Xenios n'aime pas cela, la menace monte, et le village
  **s'en souvient** : sa garnison sera plus fournie à votre prochaine visite.
- **Secourir** - quand un village assiégé appelle à l'aide, vous avez quelques minutes pour
  trancher. Aucun butin, la possibilité d'y perdre des hommes pour rien - mais la faveur des
  dieux et une **alliance** : tribut régulier, et des renforts qui montent sur vos remparts et
  tombent avant vos hommes, reconnaissables à leur tunique vert olive.
- **Assiéger** - pas une bataille, une **durée**. On poste des hommes devant la place ; ils y
  restent, mangent votre grain chaque journée, s'usent. On coupe l'eau, on brûle les moissons,
  on mine le mur. La place s'affaiblit journée après journée et finit par **offrir sa
  reddition** - que l'on accepte, ou non. Et les hommes postés là ne défendent pas votre
  village : un assaut encaissé pendant ce temps se sent jusqu'au camp.

![L'assaut de la cité de Lesbos](docs/expedition.jpg)

### ⚡ Les Olympiens, alliés et juges - et ça se voit

- **Zeus** - la foudre s'abat sur les assaillants ; sa loi de l'hospitalité (*xenia*) punit qui
  ferme sa porte aux suppliants.
- **Poséidon** - ressoude les pierres de vos remparts, y compris les pans déjà à terre.
- **Athéna** - égide en bataille ; si elle vous fait confiance (relation ≥ 25), **elle murmure
  la vérité cachée des dilemmes**.
- **Arès** - fureur au combat, recrues accélérées ; capricieux et vindicatif.

La **ferveur** (−100 à +100) ne change pas que les chiffres : elle change la **mise en scène**.
L'élu de Zeus voit un éclair pourpre fendre le ciel ; celui d'Athéna, une égide à tête de
Gorgone ; celui d'Arès, une aura sanglante et des corbeaux. Et un dieu **offensé** produit un
visuel **pâle et avorté** - l'éclair n'atteint même pas le sol. La punition se voit avant de se
compter.

Quatre leviers, et ils ne se valent pas. Le **sacrifice** (50 mesures de grain) achète de la
relation. La relation se **dépense** dans un arbre de **douze grâces** permanentes, prises dans
l'ordre et jamais reprises. Les **oracles** vendent une réponse vraie à prix croissant - ils ne
mentent jamais et ne facturent jamais du vide. Et l'**hécatombe** engage la saison entière :
cent bêtes, une seule fois par saison, et l'on choisit lequel des quatre rites - la trêve du
roi, les taureaux jetés à la mer, le péplos de la déesse, le sang sur l'autel. La question n'est
pas « est-ce que je sacrifie » mais **quelle saison je décide d'être**.

Un dieu bafoué, lui, envoie ses propres calamités, à un rythme qui se resserre avec l'offense -
la foudre et les serments rompus, le séisme et la mer fermée, l'adresse retirée aux artisans, la
panique soufflée dans les rangs. Toujours réparable dans le même battement par un sacrifice.

![Le panthéon](docs/pantheon.png)

### 🏺 Des dilemmes moraux à conséquences

Quarante-et-un dilemmes à **issues multiples**, tirées à l'ouverture : des réfugiés qui implorent
l'asile (sincères… ou pillards infiltrés), Zeus déguisé en mendiant, un cheval de bois abandonné
devant vos portes (*« Je crains les Grecs, même porteurs de présents ! »*), l'émissaire d'Hector
qui réclame des lances… Certaines issues sont **différées** : les traîtres frappent à la nuit
tombée. Le murmure d'Athéna lit l'issue **déjà tirée** : il ne peut structurellement pas mentir.

![Un dilemme](docs/evenement.png)

### 💰 Un comptoir vivant, des convois, et une flotte

Le port n'est plus un distributeur. Les **cours** des marchandises dérivent vers ce que le monde
impose - la sécheresse brûle les champs et le grain monte, l'hiver ferme la mer et renchérit
tout, un assaut encaissé fait réclamer de la pierre à toute la côte - **lentement et sans
tirage** : guetter un bon cours est une décision, et l'on peut se dire « je vends au prochain
relevé » et avoir raison.

Vendre au quai est sûr et médiocre. Charger une **caravane** pour une place forte, c'est le prix
plein majoré de la distance, contre du temps et un risque **calculé sur ce que ce village pense
de vous** - risque et gain figés au départ, parce qu'il serait déloyal de les recalculer au
retour. Les routes se ferment sur trois motifs nommés.

Et le port **bâtit des coques** : la pentécontère qui se bat, la nef de charge qui porte. Une
galère **escorte** un convoi et fait chuter son risque ; des cales permettent de **forcer le
détroit** en hiver et rapportent du butin. Le niveau du port plafonne la flotte, et la mer
**prend** des coques à chaque retour : ce n'est pas un achat unique.

### 📜 Découvertes, merveilles, éclaireurs

**Vingt-trois découvertes** de l'âge du bronze avec leurs prérequis - charrue à soc, corde
tressée, tour de potier, linéaire B, adduction d'eau - et **une seule recherche à la fois** :
lancer la charrue, c'est renoncer trois minutes au soufflet de forge. Les effets sont modestes et
permanents ; dix découvertes bien choisies disent quelle cité on a voulu.

Et **six merveilles**, dont **une seule se bâtira par partie** : c'est le choix qui définit un
règne, et il ne se reprend pas.

L'**espionnage** est le moyen payant et risqué d'en savoir plus sans Ulysse ni Cassandre : on
envoie un villageois - un bras de moins tant qu'il est dehors - ou l'on paie un homme de métier.
Le rapport est vrai ; s'il n'y a rien à voir, on ne facture rien.

### 🤝 Une Troade qui se souvient

Chaque place forte tient sa **relation** (−100 à +100), et la région est petite : ce qu'on fait à
l'une, les sept autres l'apprennent. Un **présent** rachète une rancune. Un **pacte** s'achète à
qui vous voit déjà d'un bon œil. Un **mariage** coûte un habitant pour toujours mais scelle une
alliance que rien ne dénoue, au tribut doublé. Une alliance ordinaire, elle, se rompt si la
relation retombe - et un village hostile grossit la menace qui pèse sur vous.

### 🌾 La fièvre, et le lazaret

La peste n'est pas un dilemme mais un **cycle**. Elle entre par une porte identifiable - un
convoi rentré de Troade, le charnier laissé devant la muraille après un assaut, le butin d'un
raid, l'entassement d'un village trop peuplé pour ses maisons - se propage selon des conditions
qu'on peut influencer, tue des habitants **nommés** (donc des métiers, donc des lignées), et
finit.

En face, le **lazaret** : des lits qu'on ouvre au temple, parce que les prêtres sont les
soignants. Un lit sauve un homme **et** retire un contagieux. Un fiévreux laissé debout ne rend
qu'un tiers à son poste et contamine ses voisins chaque journée : la maladie coûte donc avant de
tuer. Trois découvertes de médecine la ralentissent.

### 🏝️ Fonder une colonie

Un second foyer outre-mer, qui n'est **pas** un second village jouable - ce serait doubler le
jeu. Elle se gère par arbitrages rares : à quoi elle se consacre, ce qu'elle envoie, comment on
la défend quand elle est menacée sans qu'on puisse y être.

Fonder coûte cher et définitivement : quatre à huit habitants qui partent **pour de bon avec
leurs métiers** - le panneau nomme ce que le village perd -, une nef retenue tant que la colonie
vit, et des soldats laissés sur place. Quatre côtes, quatre vocations, et une colonie qu'on
néglige finit par ne plus être à vous.

### 🏅 Hauts faits, prestige et fin de règne

Cinquante-quatre hauts faits en cinq catégories - « tenir un assaut sur trois fronts sans perdre
un homme », « élu des quatre Olympiens », « traverser un hiver sans vider le grenier », « percer
les murs d'une cité tenue par un autre joueur ». Ils alimentent un **score de prestige** détaillé
ligne à ligne. Quand vous jugez le règne accompli, **abdiquez** : le score se fige et les aèdes
vous donnent un titre, de « Roi de pacotille » à « Égal des dieux ».

Et le prestige d'un règne achevé se convertit en **héritage** pour le suivant : murs debout,
découverte acquise, héros déjà connu qui vient sur un mot. La difficulté monte en regard, et **la
Troade se souvient** - un règne de pillard recommence entouré d'ennemis.

![Hauts faits et prestige](docs/hauts-faits.png)

### 🎖️ Cinquante-cinq missions comme fil rouge

Toujours un objectif à l'écran, toujours une récompense à la clé : des provisions du premier jour
jusqu'au Palladion lui-même. Chaque réclamation finance l'étape suivante : pas de temps mort.

Et elles ne sont pas une liste posée à côté du jeu : **chaque mission a un bouton qui ouvre
l'écran où elle se joue**, le bandeau du haut porte le fil complet acte par acte, et une
récompense réclamée laisse une ligne au journal comme une bataille. Trois missions ouvertes à la
fois, **jamais au-delà de l'acte en cours**.

| Le suivi, toujours à l'écran              | Le fil complet, cinq actes                     |
| ------------------------------------------- | ---------------------------------------------- |
| ![Le suivi des missions](docs/missions.jpg) | ![Le fil rouge complet](docs/missions-fil.png) |

### 📈 Les annales du règne

Un relevé chiffré toutes les trente secondes : greniers, garnison, menace, ambiance, faveur,
remparts, prestige. Quatre graphes dessinés en SVG comme le reste du jeu, avec la **pente par
minute** de chaque série - c'est elle qui répond à « est-ce que ça monte ? ». Les annales
traversent les actes, là où le journal repart à chaque chapitre.

### 🎭 L'ambiance du village

Fêtes, victoires et greniers pleins **exaltent** le village (production accrue). Famine, défaites
et choix cruels le rendent **morose**. Sous 25 : **mutinerie** - ouvrez les greniers, promettez
(et tenez parole !), ou réprimez dans le sang. À 0, vos soldats désertent.

### 🎵 Une bande-son entièrement synthétisée

Pas un octet d'audio téléchargé : tout est fabriqué à la volée en **Web Audio**. Au village, une
flûte de berger égrène une **pentatonique majeure** (aucun demi-ton : il est musicalement
impossible d'y sonner inquiétant) au-dessus d'un bourdon qui ne s'interrompt jamais. **Une note
toutes les deux secondes et demie, pas davantage** : le défaut d'une musique fatigante n'est ni
son mode ni son volume mais son nombre d'attaques, et celle-ci en compte vingt-quatre à la minute
là où la version précédente en comptait cent soixante. Les cors montent à l'alerte, le tambour de
siège prend le relais quand la colonne touche les murs, et le chant de l'aède salue la victoire.

### 🌙 Le temps continue sans vous - et vous menez la caméra

Cycle jour/nuit en temps réel. Onglet fermé, le village vit : production, constructions,
croissance… et assauts nocturnes, résolus automatiquement. Au retour, un rapport raconte tout.
Façon **Sims**, les boutons **×1 ×2 ×4 ×8** (touches 1-4) accélèrent tout, avec retour
automatique en ×1 pendant les batailles. Et la carte se manipule : **molette** pour zoomer là où
pointe le curseur, **glisser** pour se déplacer, **double-clic** pour rendre la main à la caméra
automatique.

Le bandeau du haut se lit en **deux rangs** : ce que le village *possède*, puis ce qui lui
*arrive*. Chaque jeton ouvre au survol un **encart chiffré** qui dit à quoi il sert, ce qu'il vaut
et ce qui le fait bouger. Et tout menu se referme de trois façons : sa **croix**, la touche
**Échap**, ou un clic à côté.

## 🎮 Systèmes de jeu, en un tableau

| Domaine | Ce qu'il contient |
| --- | --- |
| **Ressources** | bois, pierre, grain, bronze, faveur divine, population **nommée** |
| **Bâtiments** | **11** domaines × 4 niveaux, art SVG propre à chaque niveau ; l'Agora gouverne le niveau maximal des autres, 2 chantiers simultanés |
| **Défense** | 4 niveaux de remparts, jusqu'à 4 tours d'archers, **5 ouvrages intérieurs**, **la Redoute** qui riposte à la brèche, structure par pan et brèches indépendantes |
| **Armée** | **7 unités** (lancier, archer, hoplite, frondeur, peltaste, bélier, char), 3 postures, 2 façons de tirer, pans assignables, moral de troupe |
| **Plan de défense** | posture, tir et pan de chaque unité **et de chaque héros**, réglés en temps de paix, adoptés à chaque bataille |
| **Héros** | **8**, passif + capacité, niveaux 1→5, entretien, arc narratif **mortel**, visibles sur la carte et au premier rang |
| **Champions ennemis** | les huit mêmes noms, retournés contre vous, manœuvre annoncée avec son décompte |
| **Village vivant** | métiers de naissance, âges (2 ans par journée), foyers, naissances, transmission du métier, pyramide des âges |
| **Dynastie** | un chef nommé, **12 traits**, mort de vieillesse, héritier choisi parmi les lignées, interrègne qui coûte |
| **Dieux** | 4 Olympiens, ferveur à 7 paliers, **12 grâces** permanentes (trois par Olympien), **5 oracles** payants, colère graduée à 4 paliers, **12 reliques**, **4 rites d'hécatombe** |
| **Offensive** | **8 places fortes** à piller, secourir **ou assiéger**, ouvrages ennemis à abattre, étoiles, garnisons qui se renforcent |
| **Économie** | cours flottants sans tirage, caravanes à risque figé, **2 types de navire**, escorte, traversée forcée |
| **Progrès** | **23 découvertes** à prérequis, une recherche à la fois, **6 merveilles** dont une seule par partie |
| **Diplomatie** | relations par village, présents, pactes, mariages irréversibles, tributs, trahisons |
| **Santé** | **4 souches** de fièvre, lazaret, 3 découvertes de médecine, morts nommés |
| **Colonies** | 4 côtes, 4 vocations, 3 épreuves, colons qui partent pour de bon |
| **Multijoueur** | asynchrone **sans serveur** : carte de défense, rapport de raid, vérification par rejeu, honneur et 5 rangs, revanche |
| **Contenu** | **41 dilemmes**, **55 missions** en 5 actes verrouillés, **54 hauts faits**, campagne en 5 actes |
| **Modes** | bac à sable, **campagne « La Chute »**, **siège sans fin**, **défi hebdomadaire** à graine partagée, plus **Nouvelle Partie +** |
| **Temps** | saisons × 6 météos, cycle jour/nuit, vitesses ×1→×8, résolution hors-ligne jusqu'à 8 h |
| **Tests** | **1 525 tests** Vitest et **7 parcours** Playwright de bout en bout |
| **Sauvegarde** | `localStorage`, 3 emplacements, export/import en texte - aucun serveur, aucun compte |

## 🛠️ Stack

- [Vite](https://vitejs.dev) + [React 18](https://react.dev) + TypeScript (strict)
- [zustand](https://github.com/pmndrs/zustand) + immer pour l'état du jeu (battement à 4 Hz)
- Rendu 100 % **SVG dessiné par code** - zéro asset externe, zéro dépendance graphique
- Son 100 % **synthétisé en Web Audio** - zéro échantillon
- Aucun backend : jouable en statique, sauvegarde locale

Le style graphique (lumière au nord-ouest, ombres portées vers le sud-est, aucun contour noir,
tirages déterministes) est documenté dans [`docs/STYLE-ART.md`](docs/STYLE-ART.md). La feuille de
route et la dette connue vivent dans [`docs/ROADMAP.md`](docs/ROADMAP.md).

## 🚀 Développement

```bash
npm install
npm run dev       # http://localhost:5173
npm run dev:test  # 🧪 mode test : ressources illimitées, chantiers/recrues instantanés,
                  #    bouton « Attaque » pour déclencher un assaut à la demande
npm run build     # production dans dist/ (châssis, art et récit en trois morceaux)
npm run preview   # tester le build
npm test          # 1 525 tests Vitest sur les règles du jeu
```

Les sept parcours de bout en bout sont en Playwright **Python** - la technologie déjà présente au
dépôt plutôt qu'une dépendance de plus :

```bash
npm run dev:test -- --port 5199 --strictPort   # dans un terminal
python3 scripts/e2e.py                         # dans un autre
```

### 📸 Regénérer les captures du README

Les images de ce fichier sont **reproductibles** : chaque vignette pose un état de jeu précis
(saison, bâtiments, héros, panneau ouvert…) avant de photographier l'écran.

```bash
npm run dev -- --port 5199 --strictPort   # dans un terminal
npm run captures                          # dans un autre
```

Le script cherche un navigateur **déjà installé** avant d'en télécharger un : le Chrome ou l'Edge
du poste d'abord, puis le chromium du Playwright Python qui sert aux parcours e2e. Il échoue si la
moindre erreur JavaScript survient pendant les captures : c'est aussi le test de fumée du projet.

## 🗺️ Ce qui reste

Le détail vit dans [`docs/ROADMAP.md`](docs/ROADMAP.md). En résumé :

- **Accessibilité** - rien n'a été fait, et le jeu est désormais assez riche pour que ce soit
  gênant : palette daltonisme, taille de texte, `prefers-reduced-motion`, focus clavier
- **Équilibrage d'ensemble** - une vingtaine de systèmes se sont ajoutés en peu de temps, et leurs
  multiplicateurs se cumulent : il faut un banc d'essai qui joue mille minutes sans écran
- **Tactile et mobile** - la carte s'y prête déjà, le HUD et les panneaux non
- **Localisation EN** de l'interface (la structure des textes est déjà centralisée)

---

*Projet personnel - codé avec amour pour la mythologie grecque.* 🏺
