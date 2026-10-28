import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { startResultSync } from './config'
import './styles/theme.css'
import './styles/main.css'

// Send any scores queued while the network was down
startResultSync()

// Cache the whole app so it keeps working (and reloads) with the network cut.
// Production only: in dev the service worker would serve stale files.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline caching is a bonus; the game works without it */
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
