import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Metric } from '../db'
import { COLORS } from '../lib'

export default function Metrics() {
  const metrics = useLiveQuery(() => db.metrics.toArray(), []) ?? []
  const [form, setForm] = useState<Metric>({ name: '', unit: '', color: COLORS[0] })

  const save = async () => {
    if (!form.name.trim()) return
    const t = parseFloat(target.replace(',', '.'))
    const goal = Number.isFinite(t) ? { target: t, targetDir: dir } : { target: undefined, targetDir: undefined }
    if (form.id) await db.metrics.put({ ...form, name: form.name.trim(), ...goal })
    else await db.metrics.add({ name: form.name.trim(), unit: form.unit, color: form.color, ...goal })
    setTarget(''); setDir('min')
    setForm({ name: '', unit: '', color: COLORS[(metrics.length + 1) % COLORS.length] })
  }
  const [target, setTarget] = useState('')
  const [dir, setDir] = useState<'min' | 'max'>('min')
  const edit = (m: Metric) => { setForm(m); setTarget(m.target === undefined ? '' : String(m.target)); setDir(m.targetDir ?? 'min') }
  const cancel = () => { setForm({ name: '', unit: '', color: COLORS[0] }); setTarget(''); setDir('min') }
  const del = async (m: Metric) => {
    if (!confirm(`Eliminare "${m.name}" e tutti i suoi dati?`)) return
    await db.entries.where('metricId').equals(m.id!).delete()
    await db.metrics.delete(m.id!)
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Metriche</h2>
      <div className="card mb-4 flex flex-wrap items-center gap-2">
        <input className="inp" placeholder="Nome (es. Sonno)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="inp w-24" placeholder="Unita" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
        <select className="inp" value={dir} onChange={(e) => setDir(e.target.value as 'min' | 'max')} aria-label="Tipo di obiettivo">
          <option value="min">Obiettivo: almeno</option>
          <option value="max">Obiettivo: al massimo</option>
        </select>
        <input className="inp w-28" inputMode="decimal" placeholder="Obiettivo" value={target} onChange={(e) => setTarget(e.target.value)} />
        <button className="btn" onClick={save}>{form.id ? 'Aggiorna' : 'Aggiungi'}</button>
        {form.id && <button className="btn-ghost" onClick={cancel}>Annulla</button>}
        <p className="w-full text-xs text-slate-500">L'obiettivo e' facoltativo: e' il valore giornaliero da raggiungere (almeno) o da non superare (al massimo). Lascia vuoto per non averlo.</p>
      </div>
      <div className="card">
        {metrics.length === 0 && <p className="text-sm text-slate-500">Nessuna metrica: aggiungine una qui sopra.</p>}
        {metrics.map((m) => (
          <div key={m.id} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
            <span><span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: m.color }} />{m.name} <span className="text-slate-500">({m.unit})</span>
              {m.target !== undefined && <span className="ml-2 text-xs text-slate-500">obiettivo: {m.targetDir === 'max' ? 'al massimo' : 'almeno'} {m.target}</span>}</span>
            <span className="flex gap-2">
              <button className="btn-ghost" onClick={() => edit(m)}>Modifica</button>
              <button className="btn-ghost" onClick={() => del(m)}>Elimina</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
