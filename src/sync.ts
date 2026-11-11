import { db } from './db'

let version = 0
let importing = false
let timer: ReturnType<typeof setTimeout> | undefined
let online = true

async function pull(): Promise<boolean> {
  const r = await fetch('/api/data')
  const j = await r.json()
  version = j.version || 0
  if (!j.data) return false
  importing = true
  try {
    await db.transaction('rw', db.metrics, db.entries, async () => {
      await db.metrics.clear(); await db.entries.clear()
      await db.metrics.bulkAdd(j.data.metrics || [])
      await db.entries.bulkAdd(j.data.entries || [])
    })
  } finally { importing = false }
  return true
}

async function push() {
  const data = { metrics: await db.metrics.toArray(), entries: await db.entries.toArray() }
  const r = await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseVersion: version, data }) })
  const j = await r.json()
  if (r.status === 409) {
    alert('I dati sul server sono piu\' recenti (modificati da un altro dispositivo). Li ricarico.')
    await pull(); location.reload()
  } else if (r.ok) version = j.version
}

function schedule() {
  if (importing || !online) return
  clearTimeout(timer)
  timer = setTimeout(() => { push().catch(() => {}) }, 1500)
}

// Scarica i dati all'avvio; restituisce true se il server li aveva.
export async function startSync(): Promise<boolean> {
  let had = false
  try { had = await pull() } catch (e) { online = false; console.error('sync pull failed', e) }
  for (const t of [db.metrics, db.entries]) {
    t.hook('creating', () => { schedule() })
    t.hook('updating', () => { schedule() })
    t.hook('deleting', () => { schedule() })
  }
  return had
}

export function pushNow() { if (online) schedule() }
