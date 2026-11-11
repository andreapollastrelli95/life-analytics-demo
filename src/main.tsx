import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { seedDemo } from './db'
import { startSync, pushNow } from './sync'
import './index.css'

startSync()
  .then(async (had) => { if (!had) { await seedDemo(); pushNow() } })
  .catch(() => {})
  .finally(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode><HashRouter><App /></HashRouter></React.StrictMode>,
    )
  })
