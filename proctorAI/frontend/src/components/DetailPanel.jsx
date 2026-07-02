import ScoreRing from './ScoreRing'
import GazeChart from './GazeChart'
import AudioChart from './AudioChart'
import FlagLog from './FlagLog'
import { scoreColor, typeColors, riskLabel } from '../utils/helpers'

export default function DetailPanel({ student, elapsedMinutes, durationMinutes }) {
  if (!student) {
    return (
      <main className="overflow-y-auto bg-[var(--bg-2)] flex-1">
        <div className="flex flex-col items-center justify-center h-full text-[var(--text-3)] gap-2.5 text-center p-8">
          <svg className="w-9 h-9 stroke-[var(--text-3)] fill-none opacity-50" viewBox="0 0 24 24" style={{ strokeWidth: 1.5 }}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
            <circle cx="11" cy="9" r="2" />
            <path d="M7 17c0-2.2 1.8-4 4-4s4 1.8 4 4" />
          </svg>
          <p className="text-[13px]">Select a student to view their full audit log</p>
        </div>
      </main>
    )
  }

  const col = scoreColor(student.score)
  const riskTxt = riskLabel(student.score)
  const riskBg = student.score >= 80 ? 'var(--info-bg)' : student.score >= 60 ? 'var(--warning-bg)' : 'var(--danger-bg)'
  const riskCol = student.score >= 80 ? 'var(--info-text)' : student.score >= 60 ? 'var(--warning-text)' : 'var(--danger-text)'
  const dangerCount = student.flags.filter((f) => f.type === 'danger').length
  const warningCount = student.flags.filter((f) => f.type === 'warning').length

  return (
    <main className="overflow-y-auto bg-[var(--bg-2)] flex-1">
      <div className="p-6 max-w-[860px]">
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="text-lg font-medium text-[var(--text)]">{student.name}</div>
            <div className="text-xs text-[var(--text-2)] mt-0.5">
              {student.id} · {student.email} · {student.flags.length} flag{student.flags.length !== 1 ? 's' : ''} recorded
            </div>
          </div>
          <div className="text-[11px] font-medium px-3 py-1 rounded-full" style={{ background: riskBg, color: riskCol }}>
            {riskTxt}
          </div>
        </div>

        <div className="grid grid-cols-[auto_1fr_1fr] gap-3 mb-5 items-stretch max-md:grid-cols-2">
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 px-5 flex items-center gap-4 max-md:col-span-2">
            <ScoreRing score={student.score} />
            <div>
              <div className="text-[13px] font-medium text-[var(--text)]">Integrity score</div>
              <div className="text-[11px] mt-0.5" style={{ color: col }}>{riskTxt}</div>
            </div>
          </div>
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 px-5">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-1.5">Total flags</div>
            <div className={`text-[22px] font-medium ${dangerCount ? 'text-[var(--danger-dot)]' : warningCount ? 'text-[var(--warning-dot)]' : 'text-[var(--ok-dot)]'}`}>
              {student.flags.length}
            </div>
            <div className="text-[11px] text-[var(--text-3)] mt-0.5">
              {dangerCount} critical · {warningCount} warning
            </div>
          </div>
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 px-5">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-1.5">Session progress</div>
            <div className="text-[22px] font-medium">
              {elapsedMinutes}
              <span className="text-sm font-normal text-[var(--text-3)]">min</span>
            </div>
            <div className="text-[11px] text-[var(--text-3)] mt-0.5">of {durationMinutes} min elapsed</div>
          </div>
        </div>

        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 px-5 mb-4">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-2.5 font-medium">Activity timeline</div>
          <div className="h-2 bg-[var(--bg-3)] rounded relative mb-1.5">
            {student.timeline.map((e, i) => {
              const c = typeColors(e.type)
              return (
                <div
                  key={i}
                  className="absolute top-0 h-full w-[5px] rounded-sm -translate-x-1/2"
                  style={{ left: `${(e.t * 100).toFixed(1)}%`, background: c.dot }}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-[10px] text-[var(--text-3)]">
            <span>09:00</span><span>09:22</span><span>09:45</span><span>10:07</span><span>10:30</span>
          </div>
        </div>

        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 px-5 mb-4">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-2.5 font-medium">Gaze stability over time</div>
          <GazeChart data={student.gazeData} />
        </div>

        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 px-5 mb-4">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-2.5 font-medium">Audio activity (dB level)</div>
          <AudioChart data={student.audioData} />
        </div>

        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 px-5 mb-4">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-2.5 font-medium">Behavioural flags — full log</div>
          <FlagLog flags={student.flags} />
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          <button type="button" onClick={() => window.print()} className="text-xs font-medium px-3.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-md)] bg-[var(--bg)] hover:bg-[var(--bg-3)]">
            Print audit log
          </button>
          <button type="button" className="text-xs font-medium px-3.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--danger-dot)] bg-[var(--danger-bg)] text-[var(--danger-text)] hover:opacity-90">
            Escalate to supervisor
          </button>
        </div>
      </div>
    </main>
  )
}
