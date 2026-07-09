export default function Topbar({
  examMeta,
  secondsRemaining,
  onExport,
  pendingCount = 0,
  onOpenApprovals,
  identityPendingCount = 0,
  onOpenIdentityReview,
}) {
  const m = String(Math.floor(secondsRemaining / 60)).padStart(2, '0')
  const s = String(secondsRemaining % 60).padStart(2, '0')

  return (
    <header className="flex items-center justify-between px-5 h-[52px] bg-[var(--bg)] border-b border-[var(--border)] shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-[#1d9e75] rounded-[7px] flex items-center justify-center shrink-0">
          <svg className="w-[15px] h-[15px] stroke-white fill-none stroke-2 stroke-round" viewBox="0 0 16 16">
            <circle cx="8" cy="6" r="3" />
            <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
            <path d="M13 3l1.5-1.5M3 3L1.5 1.5M8 1V0" />
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-medium text-[var(--text)]">{examMeta.title}</div>
          <div className="text-[11px] text-[var(--text-3)] mt-px">
            {examMeta.section} · Started {examMeta.started} ·{' '}
            <span>{m}:{s}</span> remaining
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-[var(--danger-bg)] text-[var(--danger-text)] text-[11px] font-medium px-2.5 py-0.5 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--danger-dot)] live-dot" />
          Live
        </div>
        {identityPendingCount > 0 && (
          <button
            type="button"
            onClick={onOpenIdentityReview}
            className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-md)] bg-[var(--info-bg)] text-[var(--info-text)] hover:opacity-90 transition-colors"
          >
            <svg className="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4" />
              <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            {identityPendingCount} identity check{identityPendingCount > 1 ? 's' : ''}
          </button>
        )}
        {pendingCount > 0 && (
          <button
            type="button"
            onClick={onOpenApprovals}
            className="text-xs font-medium px-3.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-md)] bg-[var(--warning-bg)] text-[var(--warning-text)] hover:opacity-90 transition-colors"
          >
            {pendingCount} pending approval{pendingCount > 1 ? 's' : ''}
          </button>
        )}
        <button
          type="button"
          onClick={onExport}
          className="text-xs font-medium px-3.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-md)] bg-[var(--bg)] text-[var(--text)] hover:bg-[var(--bg-3)] transition-colors"
        >
          Export report
        </button>
      </div>
    </header>
  )
}
