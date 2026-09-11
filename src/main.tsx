import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
import App from './App'
import { PreviewApp } from './dev/PreviewApp'
import './index.css'
import './spatial.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

// Design preview: dev-only, opt-in via ?preview=<page>. Tree-shaken out of
// production builds because the condition is a compile-time constant there.
const preview =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('preview')

createRoot(rootElement).render(
  <StrictMode>{preview ? <PreviewApp /> : <App />}</StrictMode>,
)
