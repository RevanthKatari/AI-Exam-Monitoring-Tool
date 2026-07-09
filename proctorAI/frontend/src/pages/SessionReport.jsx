import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import ScoreRing from '../components/ScoreRing'
import GazeChart from '../components/GazeChart'
import AudioChart from '../components/AudioChart'
import FlagLog from '../components/FlagLog'
import { riskLabel } from '../utils/helpers'

export default function SessionReport() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiClient
      .get(`/api/sessions/${sessionId}/report`)
      .then((res) => setReport(res.data))
      .catch(() => setError('Could not load the report. Is the backend running?'))
  }, [sessionId])

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--danger-text)]">{error}</div>
  }
  if (!report) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--text-3)]">Loading report…</div>
  }

  const { exam, students, generated_at } = report

  return (
    <div className="min-h-screen bg-[var(--bg-2)] print:bg-white">
      <header className="no-print flex items-center justify-between px-6 py-4 bg-[var(--bg)] border-b border-[var(--border)] sticky top-0 z-10">
        <button type="button" onClick={() => navigate(-1)} className="text-xs text-[var(--text-3)] hover:text-[var(--text)]">
          ← Back
        </button>
        <h1 className="text-sm font-medium text-[var(--text)]">Session report — {exam?.title}</h1>
        <button
          type="button"
          onClick={() => window.print()}
          className="text-xs font-medium px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[#1d9e75] text-white hover:opacity-90"
        >
          Print / Save PDF
        </button>
      </header>

      <div className="max-w-[860px] mx-auto p-6">
        <div className="mb-6 pb-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-medium text-[var(--text)]">{exam?.title}</h2>
          <p className="text-xs text-[var(--text-2)] mt-1">
            {exam?.section} · {exam?.duration_minutes} min · Timer: {exam?.timer_mode} · Session: {sessionId}
          </p>
          <p className="text-[10px] text-[var(--text-3)] mt-1">
            Report generated {generated_at ? new Date(generated_at).toLocaleString() : ''} · {students.length} students
          </p>
        </div>

        {students.map((student, idx) => {
          const dangerCount = student.flags.filter((f) => f.type === 'danger').length
          const warningCount = student.flags.filter((f) => f.type === 'warning').length
          return (
            <section
              key={student.id}
              className={`report-student mb-8 pb-8 ${idx > 0 ? 'border-t border-[var(--border)] pt-8 print:break-before-page' : ''}`}
            >
              <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                <div>
                  <div className="text-base font-medium text-[var(--text)]">{student.name}</div>
                  <div className="text-xs text-[var(--text-2)] mt-0.5">
                    {student.id} · {student.email} · attempt: {student.attempt_status.replace('_', ' ')}
                    {student.submitted_at && <> · submitted {new Date(student.submitted_at).toLocaleString()}</>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ScoreRing score={student.score} />
                  <div className="text-xs text-[var(--text-2)]">
                    {riskLabel(student.score)}
                    <br />
                    {dangerCount} critical · {warningCount} warning
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-2 font-medium">Gaze stability</div>
                <GazeChart data={student.gazeData} />
              </div>
              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-2 font-medium">Audio activity</div>
                <AudioChart data={student.audioData} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-2 font-medium">
                  Full flag log ({student.flags.length})
                </div>
                <FlagLog flags={student.flags} />
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
