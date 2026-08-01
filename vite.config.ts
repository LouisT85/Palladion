import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// base './' : les chemins relatifs fonctionnent sur GitHub Pages
// quel que soit le nom du repo (https://<user>.github.io/<repo>/)
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    /*
     * Le bundle était un seul morceau de 916 kB. L'art des bâtiments (≈ 6 500
     * lignes de SVG) et les décors d'expédition ne servent qu'une fois la carte
     * affichée, et le contenu narratif (dilemmes, campagne) qu'au moment où il
     * tombe : on les sort du chemin critique. Le premier écran ne charge plus
     * que le châssis, le store et le HUD.
     */
    rollupOptions: {
      output: {
        manualChunks: {
          art: [
            './src/components/map/batiments/Agora.tsx',
            './src/components/map/batiments/Caserne.tsx',
            './src/components/map/batiments/Carriere.tsx',
            './src/components/map/batiments/Ferme.tsx',
            './src/components/map/batiments/Forge.tsx',
            './src/components/map/batiments/Maisons.tsx',
            './src/components/map/batiments/Port.tsx',
            './src/components/map/batiments/Scierie.tsx',
            './src/components/map/batiments/Temple.tsx',
            './src/components/map/Murailles.tsx',
            './src/components/map/Terrain.tsx',
          ],
          // les dilemmes et les cinq actes de la campagne : du texte, beaucoup de
          // texte, dont rien n'est nécessaire pour afficher le premier écran
          recit: [
            './src/game/events.ts',
            './src/game/campagne/acte-i.ts',
            './src/game/campagne/acte-ii.ts',
            './src/game/campagne/acte-iii.ts',
            './src/game/campagne/acte-iv.ts',
            './src/game/campagne/acte-v.ts',
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    // le store écrit dans localStorage : jsdom en fournit un, et chaque fichier
    // de test part d'un environnement neuf
    restoreMocks: true,
  },
})
