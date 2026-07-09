import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient, { logout } from '../api/client'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

export default function ExamManager() {
  const navigate = useNavigate()
  const [exams, setExams] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await apiClient.get('/api/exams')
      setExams(res.data)
      setError('')
    } catch {
      setError('Could not load exams. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleStart = async (sessionId) => {
    await apiClient.post(`/api/exams/${sessionId}/start`)
    load()
  }

  const handleDelete = async (sessionId, title) => {
    if (!window.confirm(`Delete "${title}"? This removes the exam, roster, and all flags permanently.`)) return
    await apiClient.delete(`/api/exams/${sessionId}`)
    load()
  }

  return (
    <div className="min-h-screen bg-[var(--bg-2)]">
      <header className="flex items-center justify-between px-6 py-4 bg-[var(--bg)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#1d9e75] rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 stroke-white fill-none stroke-2" viewBox="0 0 16 16">
              <circle cx="8" cy="6" r="3" />
              <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
            </svg>
          </div>
          <h1 className="text-lg font-medium text-[var(--text)]">My exams</h1>
        </div>
        <button
          type="button"
          onClick={() => { logout(); navigate('/login') }}
          className="text-xs font-medium px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-md)] text-[var(--text-2)] hover:bg-[var(--bg-3)]"
        >
          Sign out
        </button>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs text-[var(--text-3)]">
            Create and manage exam sessions, roster students, and open the live monitoring dashboard.
          </p>
          <button
            type="button"
            onClick={() => navigate('/exams/new')}
            className="text-xs font-medium px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[#1d9e75] text-white hover:opacity-90 shrink-0"
          >
            + Create exam
          </button>
        </div>

        {error && (
          <div className="px-4 py-2.5 mb-4 text-xs bg-[var(--danger-bg)] text-[var(--danger-text)] rounded-[var(--radius-sm)]">
            {error}
          </div>
        )}

        {!loading && !error && exams.length === 0 && (
          <div className="text-center py-16 text-[var(--text-3)]">
            <p className="text-sm mb-1">No exams yet.</p>
            <p className="text-xs">Click "Create exam" to set up your first session.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exams.map((exam) => (
            <div
              key={exam.session_id}
              className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 flex flex-col gap-3"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-sm font-medium text-[var(--text)]">{exam.title}</h2>
                  <span className="text-[10px] px-1.5 py-px rounded-full bg-[var(--info-bg)] text-[var(--info-text)]">
                    {exam.timer_mode === 'individual' ? 'Individual timer' : 'Synchronized timer'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-3)]">
                  {exam.section} · {exam.duration_minutes} min · {exam.enrolled_students.length} enrolled ·{' '}
                  {exam.questions?.length || 0} question{exam.questions?.length === 1 ? '' : 's'}
                </p>
                <p className="text-[10px] text-[var(--text-3)] mt-1">
                  Created {fmtDate(exam.created_at)}
                  {exam.timer_mode === 'synchronized' && (
                    <> · {exam.started_at ? `Started ${fmtDate(exam.started_at)}` : 'Not started yet'}</>
                  )}
                </p>
              </div>

              <div className="flex gap-2 flex-wrap mt-auto pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => navigate(`/exams/${exam.session_id}/edit`)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--border-md)] text-[var(--text-2)] hover:bg-[var(--bg-3)]"
                >
                  Manage
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard?session=${exam.session_id}`)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--border-md)] text-[var(--text-2)] hover:bg-[var(--bg-3)]"
                >
                  Monitor
                </button>
                {exam.timer_mode === 'synchronized' && !exam.started_at && (
                  <button
                    type="button"
                    onClick={() => handleStart(exam.session_id)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-[var(--radius-sm)] bg-[#1d9e75] text-white hover:opacity-90"
                  >
                    Start exam now
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(exam.session_id, exam.title)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--danger-dot)] text-[var(--danger-text)] hover:bg-[var(--danger-bg)] ml-auto"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
