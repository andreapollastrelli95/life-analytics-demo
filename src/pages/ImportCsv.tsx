import { useState } from 'react'
import { db, upsertEntry } from '../db'
import { COLORS, download } from '../lib'

// Divide una riga CSV rispettando i campi tra virgolette.
function splitCsv(line: string, sep: string) {
  const out: string[] = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQ) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (c === '"') inQ = false; else cur += c }
    else if (c === '"') inQ = true
    else if (c === sep) { out.push(cur.trim()); cur = '' }
    else cur += c
  }
  out.push(cur.trim())
  return out
}

export default function ImportCsv() {
  const [text, setText] = useState('data,metrica,valore\n2026-11-01,Sonno,7.5\n2026-11-01,Umore,8')
  const [msg, setMsg] = useState('')

  const run = async () => {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    const sep = lines[0]?.includes(';') ? ';' : ','
    let ok = 0, bad = 0
    for (const line of lines.slice(1)) {
      const [date, name, raw, note] = splitCsv(line, sep)
      const v = parseFloat((raw ?? '').replace(',', '.'))
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || !name || !Number.isFinite(v)) { bad++; continue }
      let m = (await db.metrics.toArray()).find((x) => x.name.toLowerCase() === name.toLowerCase())
      if (!m) {
        const id = await db.metrics.add({ name, unit: '', color: COLORS[(await db.metrics.count()) % COLORS.length] })
        m = { id, name, unit: '', color: '' }
      }
      await upsertEntry(m.id!, date, v, note)
      ok++
    }
    setMsg(`Importate ${ok} righe, scartate ${bad}.`)
  }
  const [csvMsg, setCsvMsg] = useState('')
  const exportCsv = async () => {
    const metrics = await db.metrics.toArray()
    const name = new Map(metrics.map((m) => [m.id!, m.name]))
    const q = (s: string) => (/[";\n\r,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
    const rows = (await db.entries.toArray())
      .sort((a, b) => a.date.localeCompare(b.date) || (name.get(a.metricId) ?? '').localeCompare(name.get(b.metricId) ?? ''))
      .map((e) => [e.date, q(name.get(e.metricId) ?? '?'), String(e.value), q(e.note ?? '')].join(','))
    // BOM iniziale: cosi' Excel legge correttamente gli accenti.
    download(`life-analytics-${new Date().toISOString().slice(0, 10)}.csv`, '\uFEFF' + ['data,metrica,valore,nota', ...rows].join('\r\n'), 'text/csv;charset=utf-8')
    setCsvMsg(`Esportate ${rows.length} voci in CSV (stesso formato dell'importazione).`)
  }
  const [jsonMsg, setJsonMsg] = useState('')
  const exportJson = async () => {
    const data = { app: 'life-analytics', exportedAt: new Date().toISOString(), metrics: await db.metrics.toArray(), entries: await db.entries.toArray() }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }))
    a.download = `life-analytics-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setJsonMsg(`Esportati ${data.metrics.length} metriche e ${data.entries.length} voci.`)
  }
  const importJson = async (f?: File) => {
    if (!f) return
    try {
      const j = JSON.parse(await f.text())
      const okM = (m: any) => m && typeof m.id === 'number' && typeof m.name === 'string' && typeof m.unit === 'string' && typeof m.color === 'string'
      const okE = (e: any) => e && typeof e.metricId === 'number' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && typeof e.value === 'number' && Number.isFinite(e.value)
      if (j?.app !== 'life-analytics' || !Array.isArray(j.metrics) || !Array.isArray(j.entries) || !j.metrics.every(okM) || !j.entries.every(okE))
        return setJsonMsg('File non valido: non e\' un backup di Life Analytics. Nessuna modifica.')
      const ids = new Set(j.metrics.map((m: any) => m.id))
      if (!j.entries.every((e: any) => ids.has(e.metricId))) return setJsonMsg('File non valido: voci collegate a metriche inesistenti. Nessuna modifica.')
      if (!confirm(`Sostituire TUTTI i dati attuali con il backup (${j.metrics.length} metriche, ${j.entries.length} voci)? Una copia dei dati attuali resta nei backup giornalieri del server.`)) return
      await db.transaction('rw', db.metrics, db.entries, async () => {
        await db.metrics.clear(); await db.entries.clear()
        await db.metrics.bulkAdd(j.metrics); await db.entries.bulkAdd(j.entries.map(({ id, ...e }: any) => e))
      })
      setJsonMsg('Backup importato.')
    } catch { setJsonMsg('File non leggibile (JSON non valido). Nessuna modifica.') }
  }
  const onFile =(f?: File) => f && f.text().then(setText)

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Importa CSV</h2>
      <p className="mb-2 text-sm text-slate-500">Formato: data (AAAA-MM-GG), metrica, valore, nota (opzionale). Le metriche nuove vengono create.</p>
      <input type="file" accept=".csv,text/csv" className="mb-2 text-sm" onChange={(e) => onFile(e.target.files?.[0])} />
      <textarea className="inp h-56 w-full font-mono" value={text} onChange={(e) => setText(e.target.value)} />
      <button className="btn mt-2" onClick={run}>Importa</button>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
      <h2 className="mb-2 mt-8 text-xl font-semibold">Esporta CSV</h2>
      <div className="card flex flex-wrap items-center gap-2">
        <button className="btn" onClick={exportCsv}>Esporta CSV</button>
        <span className="text-sm text-slate-500">Tutte le voci, apribili in Excel o Fogli Google.</span>
        {csvMsg && <p className="w-full text-sm">{csvMsg}</p>}
      </div>
      <h2 className="mb-2 mt-8 text-xl font-semibold">Backup JSON</h2>
      <div className="card flex flex-wrap items-center gap-2">
        <button className="btn" onClick={exportJson}>Esporta JSON</button>
        <input type="file" accept=".json,application/json" className="text-sm" onChange={(e) => { importJson(e.target.files?.[0]); e.target.value = '' }} />
        {jsonMsg && <p className="w-full text-sm">{jsonMsg}</p>}
      </div>
    </div>
  )
}
