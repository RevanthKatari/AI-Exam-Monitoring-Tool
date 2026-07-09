import { useState } from 'react'
import { scoreColor, initials } from '../utils/helpers'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'high-risk', label: 'High risk' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'clean', label: 'Clean' },
]

const ATTEMPT_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted: 'Submitted',
}

export default function StudentSidebar({ students, selectedId, onSelect, activeFilter, onFilterChange }) {
  const [search, setSearch] = useState('')

  const filtered = students.filter((s) => {
    if (activeFilter === 'high-risk' && s.status !== 'high-risk') return false
    if (activeFilter === 'flagged' && s.flags.length === 0) return false
    if (activeFilter === 'clean' && s.flags.length !== 0) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!s.name.toLowerCase().includes(q) && !s.id.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <aside className="bg-[var(--bg)] border-r border-[var(--border)] flex flex-col overflow-hidden max-md:hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
        <span className="text-xs font-medium text-[var(--text)]">Student sessions</span>
        <span className="text-[11px] text-[var(--text-3)]">
          {filtered.length} student{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="px-4 py-2.5 border-b border-[var(--border)] shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or ID…"
          className="w-full px-2.5 py-1.5 text-xs border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)]"
        />
      </div>
      <div className="flex gap-1.5 px-4 py-2.5 border-b border-[var(--border)] shrink-0 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onFilterChange(f.key)}
            className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all ${
              activeFilter === f.key
                ? 'bg-[var(--info-bg)] text-[var(--info-text)] border-[var(--info-dot)]'
                : 'border-[var(--border-md)] text-[var(--text-2)] hover:bg-[var(--bg-2)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="overflow-y-auto flex-1">
        {filtered.map((s) => {
          const col = scoreColor(s.score)
          const hasDanger = s.flags.some((f) => f.type === 'danger')
          const hasWarning = s.flags.some((f) => f.type === 'warning')
          const dotCol = hasDanger
            ? 'var(--danger-dot)'
            : hasWarning
              ? 'var(--warning-dot)'
              : s.flags.length
                ? 'var(--info-dot)'
                : 'var(--ok-dot)'
          const flagBg = hasDanger ? 'var(--danger-bg)' : hasWarning ? 'var(--warning-bg)' : 'var(--info-bg)'
          const flagTxt = hasDanger ? 'var(--danger-text)' : hasWarning ? 'var(--warning-text)' : 'var(--info-text)'
          const attemptStatus = s.attempt_status || 'not_started'

          return (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(s.id)}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(s.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 border-b border-[var(--border)] cursor-pointer transition-colors hover:bg-[var(--bg-2)] ${
                s.id === selectedId ? 'bg-[var(--bg-3)]' : ''
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotCol }} />
              <div
                className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
                style={{ background: `${col}22`, color: col }}
              >
                {initials(s.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[var(--text)] truncate">{s.name}</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[var(--text-3)]">{s.id}</span>
                  <span
                    className={`text-[9px] px-1 py-px rounded-full ${
                      attemptStatus === 'submitted'
                        ? 'bg-[var(--info-bg)] text-[var(--info-text)]'
                        : attemptStatus === 'in_progress'
                          ? 'bg-[var(--ok-dot)]/10 text-[var(--ok-dot)]'
                          : 'bg-[var(--bg-3)] text-[var(--text-3)]'
                    }`}
                  >
                    {ATTEMPT_LABELS[attemptStatus] || attemptStatus}
                  </span>
                </div>
              </div>
              <div className="text-xs font-medium shrink-0" style={{ color: col }}>{s.score}</div>
              {s.flags.length > 0 && (
                <div
                  className="text-[10px] px-1.5 py-px rounded-full shrink-0"
                  style={{ background: flagBg, color: flagTxt }}
                >
                  {s.flags.length}
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-[var(--text-3)] text-center py-6">No students match.</p>
        )}
      </div>
    </aside>
  )
}
