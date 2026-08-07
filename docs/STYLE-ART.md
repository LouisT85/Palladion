# Bible visuelle PALLADION - peint réaliste (Age of Empires / Zeus)

Objectif : du **relief, du volume, de la matière**. Le joueur doit sentir la
lumière méditerranéenne sur les murs. Référence de qualité : le Temple
(`src/components/map/batiments/Temple.tsx`) - s'aligner sur son niveau de
finition, ses valeurs et sa densité de détail.

## Règles absolues

1. **Lumière au NORD-OUEST** (haut-gauche).
   - Faces ouest + pans de toit **gauches** : éclairés.
   - Faces est + pans **droits** : dans l'ombre.
   - Façades sud (face au joueur) : demi-teinte.
2. **Ombres portées vers le SUD-EST** : `+x`, `+y×0.4`, floues, couleur
   `#241a08`, opacité 0.14-0.20. Utiliser `OmbreVolume` de `art.tsx`.
3. **Occlusion ambiante** à la base de tout volume (`AOBase`).
4. **Zéro contour noir.** Le modelé vient des valeurs. Liseré fin autorisé
   uniquement dans la teinte sombre du matériau (jamais `#000`, jamais
   `stroke` sombre systématique).
5. **Palette** : constantes `PAL` de `src/components/map/art.tsx`. Ne pas
   inventer de nouvelles dominantes ; nuancer autour de la palette.
6. **Jamais `Math.random()` dans un render** (la carte se re-rend 4×/s →
   scintillement). Utiliser `alea(seed)` de `art.tsx`.
7. **IDs de defs préfixés** par domaine (`t-` temple, `mur-` murailles,
   `ter-` terrain…). Les défs partagées `a-*` existent déjà (`DefsArt`).
8. **Budget** : ≤ ~400 nœuds SVG par bâtiment niveau 4 ; filtres SVG
   coûteux (feTurbulence) réservés au terrain (1 seul rect plein cadre).

## Contraintes d'intégration (NE PAS CASSER)

- **Ancre bâtiment** : `(0,0)` = centre du pied. Boîte max :
  `x ∈ [-135, 135]`, `y ∈ [-100, +32]` (le clip des chantiers en dépend).
- **API intacte** : chaque composant garde sa signature (`{ n }: { n: number }`
  pour les bâtiments, props existantes pour Murailles/Terrain/figurines).
- **Empreinte au sol et emplacements des accessoires ≈ conservés (±10 px)** :
  les artisans de `Ouvriers.tsx` sont positionnés en dur dans ces repères.
- **Niveaux 1→4 = progression spectaculaire** : 1 rustique (bois/torchis),
  2 consolidé, 3 pierre prospère, 4 monumental. Chaque niveau doit se
  reconnaître d'un coup d'œil.
- **Animations SMIL existantes conservées** (feux, fumées, figurines) -
  on améliore le dessin, pas le comportement.

## Recettes de matière (comment faire « peint »)

- **Mur** : dégradé vertical (2 stops suffisent) + **ombre du débord de
  toit** sur le haut de la façade (bande sombre floue) + soubassement
  pierre + arête d'angle : liseré clair côté lumière, sombre côté ombre.
- **Toit de tuiles** : pan en dégradé + rangées `strokeDasharray` dans la
  teinte sombre + **arêtes d'égout et faîtage clairs** (`PAL.toitArete`).
- **Pierre appareillée** : `MurPierre` (assises irrégulières générées).
- **Colonne** : `Colonne3D` (dégradé cylindrique `a-cyl`).
- **Sol autour du bâtiment** : aire en 2 tons superposés (usure), pas un
  aplat unique.
- **Végétation** : 3 valeurs par masse de feuillage (ombre propre en bas,
  demi-teinte, éclat en haut-gauche) + ombre portée au sol orientée SE.

## Processus OBLIGATOIRE (itération visuelle)

Un serveur vite doit tourner. **Ne présume pas du port** : `pgrep -af vite` d'abord,
et `curl -s -o /dev/null -w '%{http_code}' http://localhost:<port>/` pour confirmer.
`npm run dev` prend 5173, `npm run dev:test` (mode test) 5199, et l'on lance parfois
`--port 5197` à la main. Si DEUX serveurs répondent sur le MÊME port, tue-les tous et
n'en relance qu'un : deux vite sur un port donnent des « Invalid hook call » et des
`NaN` dans les tracés SVG qui n'ont rien à voir avec le code, et l'on perd une heure
à chercher un défaut qui n'existe pas.

Après CHAQUE passe de dessin :

```bash
python3 scripts/apercu.py <cible> <scratchpad>/<cible>-vN.png <port>
```

puis REGARDER l'image (outil Read), critiquer (valeurs plates ? lumière
incohérente ? échelle ? silhouette illisible ?) et corriger. **Minimum
3 cycles** modifier→capturer→critiquer avant de conclure. `npx tsc
--noEmit` doit passer à la fin. Comparer le dernier rendu au Temple de
référence : même niveau de finition exigé.
