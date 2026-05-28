import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { DominoThemeProviderDecorator } from '@dominodatalab/extensions-tools'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DominoThemeProviderDecorator>
      <HashRouter>
        <App />
      </HashRouter>
    </DominoThemeProviderDecorator>
  </StrictMode>,
)
