import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { db, type Entry } from '../db'
import { addDays, corrLabel, fmtN, inRange, pearson, today } from '../lib'
import { PeriodPicker } from './Period'

// Coppie (x, y) dei giorni in cui entrambe le metriche hanno un valore.
function pairsOf(entries: Entry[], a: number, b: number, from: string, to: string) {
  const byDate = new Map<string, number>()
  for (const e of entries) if (e.metricId === a && inRange(e, from, to)) byDate.set(e.date, e.value)
  const out: { date: string; x: number; y: number }[] = []
  for (const e of entries) if (e.metricId === b && inRange(e, from, to) && byDate.has(e.date)) out.push({ date: e.date, x: byDate.get(e.date)!, y: e.value })
  return out
}
const cell = (r: number) => {
  if (!Number.isFinite(r)) return { background: '#f1f5f9', color: '#94a3b8' }
  const a = Math.min(1, Math.abs(r))
  return { background: r >= 0 ? `rgba(16,185,129,${0.12 + a * 0.6})` : `rgba(239,68,68,${0.12 + a * 0.6})`, color: '#0f172a' }
}

export default function Correlations() {
  const [from, setFrom] = useState(addDays(today(), -59))
  const [to, setTo] = useState(today())
  const metrics = useLiveQuery(() => db.metrics.toArray(), []) ?? []
  const entries = useLiveQuery(() => db.entries.toArray(), []) ?? []
  const [selA, setSelA] = useState(''), [selB, setSelB] = useState('')
  const A = metrics.find((m) => String(m.id) === selA) ?? metrics[0]
  const B = metrics.find((m) => String(m.id) === selB) ?? metrics[1]
  const data = A && B ? pairsOf(entries, A.id!, B.id!, from, to) : []
  const r = pearson(data.map((p) => [p.x, p.y]))

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Correlazioni</h2>
        <PeriodPicker from={from} to={to} setFrom={setFrom} setTo={setTo} />
      </div>
      {metrics.length < 2 ? <p className="text-slate-500">Servono almeno due metriche con dati negli stessi giorni.</p> : (
        <>
          <div className="card mb-4">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <select className="inp" value={String(A?.id)} onChange={(e) => setSelA(e.target.value)} aria-label="Metrica sull'asse orizzontale">
                {metrics.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <span>rispetto a</span>
              <select className="inp" value={String(B?.id)} onChange={(e) => setSelB(e.target.value)} aria-label="Metrica sull'asse verticale">
                {metrics.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <p className="mb-2 text-sm">
              Correlazione: <b>{Number.isFinite(r) ? r.toFixed(2) : '-'}</b> ({corrLabel(r)}) su {data.length} giorni in comune.
            </p>
            <div style={{ height: 300 }}>
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" dataKey="x" name={A?.name} tick={{ fontSize: 11 }} domain={['auto', 'auto']} label={{ value: `${A?.name} (${A?.unit})`, position: 'insideBottom', offset: -12, fontSize: 12 }} />
                  <YAxis type="number" dataKey="y" name={B?.name} tick={{ fontSize: 11 }} domain={['auto', 'auto']} label={{ value: `${B?.name} (${B?.unit})`, angle: -90, position: 'insideLeft', fontSize: 12 }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v) => fmtN(Number(v))} />
                  <Scatter data={data} fill={A?.color || '#6366f1'} isAnimationActive={false} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-slate-500">Ogni punto e' un giorno. Una correlazione non dimostra una causa: indica solo che le due metriche tendono a muoversi insieme (positiva) o in senso opposto (negativa).</p>
          </div>
          <div className="card overflow-x-auto">
            <h3 className="mb-2 text-sm font-semibold">Tutte le coppie</h3>
            <table className="w-full border-separate border-spacing-1 text-center text-sm">
              <thead><tr><th />{metrics.map((m) => <th key={m.id} className="px-2 font-medium text-slate-500">{m.name}</th>)}</tr></thead>
              <tbody>{metrics.map((ra) => (
                <tr key={ra.id}>
                  <th className="whitespace-nowrap px-2 text-left font-medium text-slate-500">{ra.name}</th>
                  {metrics.map((cb) => {
                    if (ra.id === cb.id) return <td key={cb.id} className="rounded bg-slate-100 text-slate-400">-</td>
                    const v = pearson(pairsOf(entries, ra.id!, cb.id!, from, to).map((p) => [p.x, p.y]))
                    return (
                      <td key={cb.id} className="rounded p-0" style={cell(v)}>
                        <button className="w-full px-2 py-2" title={corrLabel(v)} onClick={() => { setSelA(String(ra.id)); setSelB(String(cb.id)); document.querySelector('main')?.scrollTo(0, 0) }}>
                          {Number.isFinite(v) ? v.toFixed(2) : 'n/d'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}</tbody>
            </table>
            <p className="mt-2 text-xs text-slate-500">Verde = positiva, rosso = negativa, "n/d" = meno di 3 giorni in comune oppure valori sempre uguali. Tocca una cella per vedere il grafico.</p>
          </div>
        </>
      )}
    </div>
  )
}
