import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { PreviewArt } from './PreviewArt'
import './styles.css'

// atelier d'aperçu graphique : /?apercu=temple (voir PreviewArt.tsx)
const apercu = new URLSearchParams(location.search).has('apercu')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{apercu ? <PreviewArt /> : <App />}</StrictMode>,
)
