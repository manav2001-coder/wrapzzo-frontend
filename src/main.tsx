import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import '@fontsource/jetbrains-mono/700.css'
import './index.css'

import App from './App.tsx'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/sonner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toaster />
    </Providers>
  </StrictMode>,
)
