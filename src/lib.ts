import type { Entry } from './db'

export const pad = (n: number) => String(n).padStart(2, '0')
export const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => toStr(new Date())
export const addDays = (s: string, n: number) => {
  const [y, m, d] = s.split('-').map(Number)
  return toStr(new Date(y, m - 1, d + n))
}
export const inRange = (e: Entry, from: string, to: string) => e.date >= from && e.date <= to
export const avg = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN)
export const fmtN = (n: number) => (Number.isFinite(n) ? (Math.round(n * 10) / 10).toString() : '-')
export const prevRange = (from: string, to: string): [string, string] => {
  const len = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1
  return [addDays(from, -len), addDays(from, -1)]
}
export const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#0ea5e9', '#ef4444', '#8b5cf6']

// Obiettivo: 'min' = almeno il valore, 'max' = al massimo il valore.
export const goalMet = (value: number, target: number, dir: 'min' | 'max' = 'min') => (dir === 'max' ? value <= target : value >= target)
// Correlazione di Pearson su coppie di valori; NaN se meno di 3 coppie o varianza nulla.
export function pearson(pairs: [number, number][]) {
  const n = pairs.length
  if (n < 3) return NaN
  const mx = avg(pairs.map((p) => p[0])), my = avg(pairs.map((p) => p[1]))
  let sxy = 0, sxx = 0, syy = 0
  for (const [x, y] of pairs) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2 }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN
}
export const corrLabel = (r: number) => {
  if (!Number.isFinite(r)) return 'dati insufficienti'
  const a = Math.abs(r)
  return `${a >= 0.7 ? 'forte' : a >= 0.4 ? 'moderata' : a >= 0.2 ? 'debole' : 'quasi nulla'}${a >= 0.2 ? (r > 0 ? ' positiva' : ' negativa') : ''}`
}
export function download(name: string, text: string, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
