import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' : les chemins relatifs fonctionnent sur GitHub Pages
// quel que soit le nom du repo (https://<user>.github.io/<repo>/)
export default defineConfig({
  plugins: [react()],
  base: './',
})
