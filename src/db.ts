import Dexie, { type Table } from 'dexie'
import { addDays, today } from './lib'

export interface Metric { id?: number; name: string; unit: string; color: string; target?: number; targetDir?: 'min' | 'max' }
export interface Entry { id?: number; metricId: number; date: string; value: number; note?: string }

class LifeDB extends Dexie {
  metrics!: Table<Metric, number>
  entries!: Table<Entry, number>
  constructor() {
    super('life-analytics')
    this.version(1).stores({ metrics: '++id,name', entries: '++id,metricId,date,[metricId+date]' })
  }
}
export const db = new LifeDB()

export async function upsertEntry(metricId: number, date: string, value: number, note?: string) {
  const ex = await db.entries.where('[metricId+date]').equals([metricId, date]).first()
  if (ex) await db.entries.update(ex.id!, { value, note })
  else await db.entries.add({ metricId, date, value, note })
}

export async function seedDemo() {
  if ((await db.metrics.count()) > 0) return
  const defs: [string, string, string, (i: number) => number][] = [
    ['Sonno', 'h', '#6366f1', (i) => 6.5 + ((i * 7) % 5) / 2],
    ['Spese', 'EUR', '#f59e0b', (i) => 15 + ((i * 13) % 40)],
    ['Allenamento', 'min', '#10b981', (i) => (i % 3 === 0 ? 0 : 30 + ((i * 11) % 45))],
    ['Umore', '/10', '#ec4899', (i) => 5 + ((i * 5) % 5)],
  ]
  for (const [name, unit, color, f] of defs) {
    const id = await db.metrics.add({ name, unit, color })
    for (let i = 0; i < 28; i++) await db.entries.add({ metricId: id, date: addDays(today(), -i), value: Math.round(f(i) * 10) / 10 })
  }
}
