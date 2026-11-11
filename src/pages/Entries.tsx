import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, upsertEntry } from '../db'
import { today } from '../lib'

export default function Entries() {
  const [date, setDate] = useState(today())
  const [vals, setVals] = useState<Record<number, string>>({})
  const metrics = useLiveQuery(() => db.metrics.toArray(), []) ?? []
  const dayEntries = useLiveQuery(() => db.entries.where('date').equals(date).toArray(), [date])
  const [filter, setFilter] = useState('')
  const [saved, setSaved] = useState('')
  const recent = (useLiveQuery(() => db.entries.orderBy('date').reverse().toArray(), []) ?? [])
    .filter((e) => !filter || String(e.metricId) === filter).slice(0, 60)

  useEffect(() => {
    const v: Record<number, string> = {}
    dayEntries?.forEach((e) => (v[e.metricId] = String(e.value)))
    setVals(v)
  }, [dayEntries])

  const save = async () => {
    let ok = 0
    const bad: string[] = []
    for (const m of metrics) {
      const raw = vals[m.id!]
      if (raw === undefined || raw === '') continue
      const n = parseFloat(raw.replace(',', '.'))
      if (Number.isFinite(n)) { await upsertEntry(m.id!, date, n); ok++ } else bad.push(m.name)
    }
    setSaved(bad.length ? `Valore non valido per: ${bad.join(', ')}` : ok ? `Salvato (${ok} valori).` : 'Niente da salvare: inserisci almeno un valore.')
  }
  const del = (id: number, label: string) => { if (confirm(`Eliminare ${label}?`)) db.entries.delete(id) }
  const name = (id: number) => metrics.find((m) => m.id === id)?.name ?? '?'

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Inserimento giornaliero</h2>
      <div className="card mb-4">
        <input type="date" className="inp mb-3" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {metrics.map((m) => (
            <label key={m.id} className="text-sm">{m.name} ({m.unit})
              <input className="inp mt-1 w-full" inputMode="decimal" value={vals[m.id!] ?? ''} onChange={(e) => setVals({ ...vals, [m.id!]: e.target.value })} />
            </label>
          ))}
        </div>
        {metrics.length === 0 && <p className="text-sm text-slate-500">Prima crea almeno una metrica nella sezione Metriche.</p>}
        <button className="btn mt-3" onClick={save} disabled={metrics.length === 0}>Salva</button>
        {saved && <span className="ml-3 text-sm text-slate-600">{saved}</span>}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">Voci recenti</h3>
        <select className="inp" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Tutte le metriche</option>
          {metrics.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className="card">
        {recent.length === 0 && <p className="text-sm text-slate-500">Nessuna voce{filter ? ' per questa metrica' : ''}.</p>}
        {recent.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-2 border-b border-slate-100 py-1 text-sm last:border-0">
            <span>{e.date} - {name(e.metricId)}: <b>{e.value}</b></span>
            <span className="flex shrink-0 gap-2">
              <button className="btn-ghost" onClick={() => { setDate(e.date); window.scrollTo(0, 0); document.querySelector('main')?.scrollTo(0, 0) }}>Modifica</button>
              <button className="btn-ghost" onClick={() => del(e.id!, `${name(e.metricId)} del ${e.date}`)}>Elimina</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
