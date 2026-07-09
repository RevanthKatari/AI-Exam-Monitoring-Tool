export default function NotificationToasts({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className="no-print fixed top-16 right-4 z-40 flex flex-col gap-2 w-72 max-w-[90vw]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-[var(--bg)] border border-[var(--danger-dot)] rounded-[var(--radius-md)] shadow-lg p-3 flex items-start gap-2.5 animate-[fadeIn_0.2s_ease-out]"
        >
          <div className="w-7 h-7 rounded-full bg-[var(--danger-bg)] flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 stroke-[var(--danger-text)] fill-none stroke-2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A2 2 0 0 0 3.82 21h16.36a2 2 0 0 0 1.71-2.96L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-[var(--text)]">Integrity threshold crossed</div>
            <div className="text-[11px] text-[var(--text-2)] mt-0.5">
              <span className="font-medium">{t.name}</span> dropped to <span className="font-medium text-[var(--danger-text)]">{t.score}</span> (below 80)
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="text-[var(--text-3)] hover:text-[var(--text)] text-xs shrink-0"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
