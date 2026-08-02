import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { GardeFou } from './components/ui/Garde'
import { PreviewArt } from './PreviewArt'
import './styles.css'

// atelier d'aperçu graphique : /?apercu=temple (voir PreviewArt.tsx)
const apercu = new URLSearchParams(location.search).has('apercu')

/*
 * Le garde-fou enveloppe TOUT. Sans lui, la moindre faute de rendu vidait la
 * page : un rectangle noir, pas un mot, et aucun moyen d'emporter sa partie.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GardeFou>{apercu ? <PreviewArt /> : <App />}</GardeFou>
  </StrictMode>,
)
