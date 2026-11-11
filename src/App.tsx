import { NavLink, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Metrics from './pages/Metrics'
import Entries from './pages/Entries'
import ImportCsv from './pages/ImportCsv'
import Compare from './pages/Compare'
import Insights from './pages/Insights'
import Correlations from './pages/Correlations'

const links = [
  ['/', 'Dashboard'], ['/inserimento', 'Inserimento'], ['/metriche', 'Metriche'],
  ['/importa', 'Importa / Esporta'], ['/confronto', 'Confronto'], ['/correlazioni', 'Correlazioni'], ['/insight', 'Insight AI'],
]

export default function App() {
  return (
    <div className="flex h-screen flex-col md:flex-row">
      <nav className="shrink-0 border-b border-slate-200 bg-white p-3 md:w-52 md:border-b-0 md:border-r md:p-4">
        <h1 className="mb-2 text-lg font-bold text-indigo-600 md:mb-6">Life Analytics</h1>
        <div className="flex flex-wrap gap-1 md:block">
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `mb-1 block rounded-md px-3 py-2 text-sm ${isActive ? 'bg-indigo-50 font-semibold text-indigo-700' : 'hover:bg-slate-100'}`}>
            {label}
          </NavLink>
        ))}
        </div>
      </nav>
      <main className="min-w-0 flex-1 overflow-auto p-4 md:p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inserimento" element={<Entries />} />
          <Route path="/metriche" element={<Metrics />} />
          <Route path="/importa" element={<ImportCsv />} />
          <Route path="/confronto" element={<Compare />} />
          <Route path="/correlazioni" element={<Correlations />} />
          <Route path="/insight" element={<Insights />} />
        </Routes>
      </main>
    </div>
  )
}
