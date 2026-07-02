import { scoreColor } from '../utils/helpers'

export default function ScoreRing({ score }) {
  const col = scoreColor(score)
  const r = 28
  const circ = +(2 * Math.PI * r).toFixed(1)
  const dash = +((score / 100) * circ).toFixed(1)

  return (
    <div className="relative w-[72px] h-[72px] shrink-0">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--bg-3)" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={col}
          strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[19px] font-medium" style={{ color: col }}>
        {score}
      </div>
    </div>
  )
}
