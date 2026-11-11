import { useEffect, useState } from 'react'
import { db } from '../db'
import { addDays, avg, fmtN, inRange, prevRange, today } from '../lib'
import { PeriodPicker } from './Period'

export default function Insights() {
  const [from, setFrom] = useState(addDays(today(), -13))
  const [to, setTo] = useState(today())
  const [status, setStatus] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { setStatus('Gemini viene chiamato solo quando premi il pulsante.') }, [])

  const run = async () => {
    setError(''); setText('')
    setBusy(true)
    try {
      const metrics = await db.metrics.toArray()
      const entries = await db.entries.toArray()
      if (!entries.some((e) => e.date >= from && e.date <= to)) { setError('Nessun dato nel periodo selezionato: scegli un altro periodo.'); return }
      const [pf, pt] = prevRange(from, to)
      const lines = metrics.map((m) => {
        const cur = entries.filter((e) => e.metricId === m.id && inRange(e, from, to)).map((e) => e.value)
        const prev = entries.filter((e) => e.metricId === m.id && inRange(e, pf, pt)).map((e) => e.value)
        return `- ${m.name} (${m.unit}): n=${cur.length}, media=${fmtN(avg(cur))}, min=${fmtN(Math.min(...cur))}, max=${fmtN(Math.max(...cur))}, media periodo precedente=${fmtN(avg(prev))}`
      })
      const prompt = `Sei un analista di dati personali. Commenta in italiano, in modo conciso e pratico (max 200 parole), i dati di vita personale dal ${from} al ${to} (confronto con ${pf} / ${pt}). Evidenzia tendenze, possibili correlazioni e 2-3 suggerimenti.\n\n${lines.join('\n')}`
      const r = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
        .then((x) => x.json() as Promise<{ ok: boolean; text?: string; error?: string }>)
      if (r.ok) setText(r.text ?? ''); else setError(r.error ?? 'Errore sconosciuto.')
    } catch (e) {
      setError(`Errore: ${(e as Error).message}`)
    } finally { setBusy(false) }
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Insight AI (Gemini)</h2>
      <div className="card mb-4 flex flex-wrap items-center gap-3">
        <PeriodPicker from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <button className="btn" onClick={run} disabled={busy}>{busy ? 'Analisi in corso...' : 'Genera insight'}</button>
        <span className="text-xs text-slate-500">{status}</span>
      </div>
      {error && <div className="card border-red-300 bg-red-50 text-sm text-red-700">{error}</div>}
      {text && <div className="card whitespace-pre-wrap text-sm">{text}</div>}
    </div>
  )
}
