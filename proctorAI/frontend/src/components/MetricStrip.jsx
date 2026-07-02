import { scoreColor } from '../utils/helpers'

export default function MetricStrip({ students, enrolled }) {
  const active = students.length
  const flags = students.reduce((a, s) => a + s.flags.length, 0)
  const risk = students.filter((s) => s.score < 60).length
  const avg = students.length
    ? Math.round(students.reduce((a, s) => a + s.score, 0) / students.length)
    : 0

  return (
    <div className="grid grid-cols-4 gap-px bg-[var(--border)] border-b border-[var(--border)] shrink-0 max-md:grid-cols-2">
      <div className="bg-[var(--bg)] px-5 py-3">
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-1">Active students</div>
        <div className="text-2xl font-medium leading-none">{active}</div>
        <div className="text-[11px] text-[var(--text-3)] mt-0.5">of {enrolled} enrolled</div>
      </div>
      <div className="bg-[var(--bg)] px-5 py-3">
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-1">Flags raised</div>
        <div className="text-2xl font-medium leading-none text-[var(--warning-dot)]">{flags}</div>
        <div className="text-[11px] text-[var(--text-3)] mt-0.5">this session</div>
      </div>
      <div className="bg-[var(--bg)] px-5 py-3">
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-1">High-risk sessions</div>
        <div className="text-2xl font-medium leading-none text-[var(--danger-dot)]">{risk}</div>
        <div className="text-[11px] text-[var(--text-3)] mt-0.5">integrity score &lt; 60</div>
      </div>
      <div className="bg-[var(--bg)] px-5 py-3">
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-1">Avg integrity score</div>
        <div className="text-2xl font-medium leading-none" style={{ color: scoreColor(avg) }}>{avg}</div>
        <div className="text-[11px] text-[var(--text-3)] mt-0.5">across session</div>
      </div>
    </div>
  )
}
