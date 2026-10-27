import React, { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'
import SiteDataProvider from './components/SiteDataProvider.jsx'

const bootstrap = document.getElementById('site-data')
const initialData = bootstrap ? JSON.parse(bootstrap.textContent) : undefined
const app = (
  <StrictMode>
    <HelmetProvider>
      <SiteDataProvider initialData={initialData}>
        <BrowserRouter><App /></BrowserRouter>
      </SiteDataProvider>
    </HelmetProvider>
  </StrictMode>
)
const root = document.getElementById('root')
if (bootstrap) requestAnimationFrame(() => requestAnimationFrame(() => hydrateRoot(root, app)))
else createRoot(root).render(app)
