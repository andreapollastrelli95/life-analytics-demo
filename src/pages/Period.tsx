export function PeriodPicker({ from, to, setFrom, setTo }: { from: string; to: string; setFrom: (s: string) => void; setTo: (s: string) => void }) {
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <input type="date" className="inp min-w-0" value={from} onChange={(e) => setFrom(e.target.value)} />
      al
      <input type="date" className="inp min-w-0" value={to} onChange={(e) => setTo(e.target.value)} />
    </span>
  )
}
