import { scoreColor, initials } from '../utils/helpers'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'high-risk', label: 'High risk' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'clean', label: 'Clean' },
]

export default function StudentSidebar({ students, selectedId, onSelect, activeFilter, onFilterChange }) {
  const filtered = students.filter((s) => {
    if (activeFilter === 'high-risk') return s.status === 'high-risk'
    if (activeFilter === 'flagged') return s.flags.length > 0
    if (activeFilter === 'clean') return s.flags.length === 0
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
                <div className="text-[10px] text-[var(--text-3)]">{s.id}</div>
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
      </div>
    </aside>
  )
}
