import { typeColors } from '../utils/helpers'

function FlagIcon({ name }) {
  const props = { viewBox: '0 0 24 24', className: 'w-[15px] h-[15px] stroke-current fill-none', strokeWidth: 1.8, strokeLinecap: 'round' }
  switch (name) {
    case 'device-mobile':
      return <svg {...props}><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18" /></svg>
    case 'users':
      return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    case 'layout-2':
      return <svg {...props}><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>
    case 'volume':
      return <svg {...props}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
    case 'book':
      return <svg {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
    default:
      return <svg {...props}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
  }
}

export default function FlagLog({ flags }) {
  if (!flags.length) {
    return (
      <p className="text-xs text-[var(--text-3)] py-2">
        No behavioural flags recorded for this session.
      </p>
    )
  }

  return (
    <div>
      {flags.map((f, i) => {
        const c = typeColors(f.type)
        return (
          <div key={i} className="flex items-start gap-2.5 py-3 border-b border-[var(--border)] last:border-b-0">
            <div
              className="w-[30px] h-[30px] rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
              style={{ background: c.bg, color: c.text }}
            >
              <FlagIcon name={f.icon} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[var(--text)] mb-0.5">{f.title}</div>
              <div className="text-[11px] text-[var(--text-2)] leading-relaxed">{f.description}</div>
              <div className="flex gap-2.5 mt-1 flex-wrap">
                <span className="text-[10px] px-1.5 py-px rounded-full" style={{ background: c.bg, color: c.text }}>
                  {f.time}
                </span>
                {f.confidence != null && (
                  <span className="text-[10px] px-1.5 py-px rounded-full bg-[var(--bg-3)] text-[var(--text-2)]">
                    {f.confidence}% confidence
                  </span>
                )}
                {f.duration && (
                  <span className="text-[10px] px-1.5 py-px rounded-full bg-[var(--bg-3)] text-[var(--text-2)]">
                    Duration: {f.duration}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
