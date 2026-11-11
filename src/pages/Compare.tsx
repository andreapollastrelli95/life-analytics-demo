import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../db'
import { addDays, avg, fmtN, inRange, today } from '../lib'
import { PeriodPicker } from './Period'

export default function Compare() {
  const [aF, setAF] = useState(addDays(today(), -13)), [aT, setAT] = useState(today())
  const [bF, setBF] = useState(addDays(today(), -27)), [bT, setBT] = useState(addDays(today(), -14))
  const metrics = useLiveQuery(() => db.metrics.toArray(), []) ?? []
  const entries = useLiveQuery(() => db.entries.toArray(), []) ?? []

  const rows = metrics.map((m) => {
    const a = avg(entries.filter((e) => e.metricId === m.id && inRange(e, aF, aT)).map((e) => e.value))
    const b = avg(entries.filter((e) => e.metricId === m.id && inRange(e, bF, bT)).map((e) => e.value))
    return { name: m.name, A: Number.isFinite(a) ? +a.toFixed(1) : 0, B: Number.isFinite(b) ? +b.toFixed(1) : 0, a, b }
  })

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Confronto tra periodi</h2>
      <div className="card mb-4 flex flex-wrap gap-6">
        <div>Periodo A <PeriodPicker from={aF} to={aT} setFrom={setAF} setTo={setAT} /></div>
        <div>Periodo B <PeriodPicker from={bF} to={bT} setFrom={setBF} setTo={setBT} /></div>
      </div>
      <div className="card mb-4" style={{ height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" /><YAxis /><Tooltip /><Legend />
            <Bar dataKey="A" fill="#6366f1" isAnimationActive={false} />
            <Bar dataKey="B" fill="#f59e0b" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="card w-full text-sm">
        <thead><tr className="text-left text-slate-500"><th>Metrica</th><th>Media A</th><th>Media B</th><th>Delta (A-B)</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.name}><td>{r.name}</td><td>{fmtN(r.a)}</td><td>{fmtN(r.b)}</td><td>{fmtN(r.a - r.b)}</td></tr>
        ))}</tbody>
      </table>
    </div>
  )
}
