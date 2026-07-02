import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ExamPortal from '../components/ExamPortal'
import { getRole, getStudentId } from '../api/client'

export default function ExamPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session') || 'comp3430-a-2026'
  const studentId = searchParams.get('student') || getStudentId() || '110195067'
  const durationMinutes = Number(searchParams.get('duration') || 90)

  const [secondsRemaining, setSecondsRemaining] = useState(durationMinutes * 60)
  const [showPermissionModal, setShowPermissionModal] = useState(false)

  useEffect(() => {
    if (getRole() !== 'student') {
      navigate('/login')
    }
  }, [navigate])

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const m = String(Math.floor(secondsRemaining / 60)).padStart(2, '0')
  const s = String(secondsRemaining % 60).padStart(2, '0')

  return (
    <div className="min-h-screen bg-[var(--bg-3)]">
      <header className="flex items-center justify-between px-6 py-4 bg-[var(--bg)] border-b border-[var(--border)]">
        <div>
          <h1 className="text-sm font-medium text-[var(--text)]">Exam Session</h1>
          <p className="text-[11px] text-[var(--text-3)]">{sessionId} · Student {studentId}</p>
        </div>
        <div className="text-lg font-medium text-[var(--text)] tabular-nums">
          {m}:{s}
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6">
        <ExamPortal
          sessionId={sessionId}
          studentId={studentId}
          durationMinutes={durationMinutes}
          onPermissionDenied={() => setShowPermissionModal(true)}
        />

        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 mt-4">
          <h2 className="text-sm font-medium text-[var(--text)] mb-3">Question 1</h2>
          <p className="text-sm text-[var(--text-2)] leading-relaxed mb-4">
            Explain the time complexity of inserting an element at the beginning of a dynamic array.
            Include amortized analysis in your answer.
          </p>
          <textarea
            rows={8}
            placeholder="Type your answer here..."
            className="w-full px-3 py-2 text-sm border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)] resize-y"
          />
        </div>
      </div>

      {showPermissionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 max-w-sm w-full">
            <h3 className="text-sm font-medium text-[var(--danger-text)] mb-2">Camera access required</h3>
            <p className="text-xs text-[var(--text-2)] mb-4">
              This exam requires webcam and microphone access for proctoring. Please allow permissions and refresh the page.
            </p>
            <button
              type="button"
              onClick={() => setShowPermissionModal(false)}
              className="w-full py-2 text-xs font-medium bg-[var(--bg-3)] rounded-[var(--radius-sm)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
