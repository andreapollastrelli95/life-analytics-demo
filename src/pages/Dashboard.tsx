import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../db'
import { addDays, avg, fmtN, goalMet, inRange, prevRange, today } from '../lib'
import { PeriodPicker } from './Period'

export default function Dashboard() {
  const [from, setFrom] = useState(addDays(today(), -13))
  const [to, setTo] = useState(today())
  const metrics = useLiveQuery(() => db.metrics.toArray(), []) ?? []
  const entries = useLiveQuery(() => db.entries.toArray(), []) ?? []
  const [pf, pt] = prevRange(from, to)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <PeriodPicker from={from} to={to} setFrom={setFrom} setTo={setTo} />
      </div>
      {metrics.length === 0 && <p className="text-slate-500">Nessuna metrica. Creane una nella sezione Metriche.</p>}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {metrics.map((m) => {
          const cur = entries.filter((e) => e.metricId === m.id && inRange(e, from, to))
          const prev = entries.filter((e) => e.metricId === m.id && inRange(e, pf, pt))
          const a = avg(cur.map((e) => e.value)), p = avg(prev.map((e) => e.value))
          const d = a - p
          const hit = m.target !== undefined ? cur.filter((e) => goalMet(e.value, m.target!, m.targetDir)).length : 0
          const pct = cur.length ? Math.round((hit / cur.length) * 100) : 0
          return (
            <div key={m.id} className="card">
              <div className="text-sm text-slate-500">{m.name} (media)</div>
              <div className="text-2xl font-bold" style={{ color: m.color }}>{fmtN(a)} <span className="text-sm font-normal">{m.unit}</span></div>
              <div className="text-xs text-slate-500">{Number.isFinite(d) ? `${d >= 0 ? '+' : ''}${fmtN(d)} vs periodo prec.` : 'nessun confronto'}</div>
              {m.target !== undefined && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Obiettivo {m.targetDir === 'max' ? '≤' : '≥'} {m.target} {m.unit}</span>
                    <span>{cur.length ? `${hit}/${cur.length} giorni` : 'nessun dato'}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444' }} />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {Number.isFinite(a) ? (goalMet(a, m.target, m.targetDir) ? 'Media in linea con l\'obiettivo' : `Media fuori obiettivo di ${Math.abs(a - m.target) < 0.05 ? 'pochissimo' : `${fmtN(Math.abs(a - m.target))} ${m.unit}`}`) : ''}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {metrics.map((m) => {
          const data = entries.filter((e) => e.metricId === m.id && inRange(e, from, to)).sort((x, y) => x.date.localeCompare(y.date))
          return (
            <div key={m.id} className="card">
              <div className="mb-2 text-sm font-semibold">{m.name} ({m.unit})</div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(s: string) => s.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    {m.target !== undefined && <ReferenceLine y={m.target} stroke="#64748b" strokeDasharray="4 4" label={{ value: 'obiettivo', fontSize: 10, fill: '#64748b', position: 'insideTopRight' }} />}
                    <Line type="monotone" dataKey="value" stroke={m.color} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
