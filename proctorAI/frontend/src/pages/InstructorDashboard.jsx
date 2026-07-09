import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import apiClient, { getRole } from '../api/client'
import Topbar from '../components/Topbar'
import MetricStrip from '../components/MetricStrip'
import StudentSidebar from '../components/StudentSidebar'
import DetailPanel from '../components/DetailPanel'
import ApprovalsModal from '../components/ApprovalsModal'
import IdentityReviewModal from '../components/IdentityReviewModal'
import NotificationToasts from '../components/NotificationToasts'

const INTEGRITY_ALERT_THRESHOLD = 80
const TOAST_LIFETIME_MS = 8000

const DEFAULT_META = {
  title: 'COMP3430 — Data Structures Final',
  section: 'Section A',
  started: '09:00',
  duration: 90,
  enrolled: 26,
}

export default function InstructorDashboard({ sessionId: defaultSessionId = 'comp3430-a-2026' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session') || defaultSessionId
  const [students, setStudents] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [examMeta, setExamMeta] = useState(DEFAULT_META)
  const [secondsRemaining, setSecondsRemaining] = useState(90 * 60)
  const [fetchError, setFetchError] = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const [showApprovals, setShowApprovals] = useState(false)
  const [identityPendingCount, setIdentityPendingCount] = useState(0)
  const [showIdentityReview, setShowIdentityReview] = useState(false)
  const [toasts, setToasts] = useState([])
  const prevScoresRef = useRef({})

  const fetchPendingCount = async () => {
    try {
      const res = await apiClient.get('/auth/pending')
      setPendingCount(res.data.length)
    } catch {
      /* ignore — non-critical */
    }
  }

  const fetchIdentityPendingCount = async () => {
    try {
      const res = await apiClient.get(`/api/exams/${sessionId}/roster`)
      setIdentityPendingCount(res.data.filter((s) => s.identity_status === 'pending').length)
    } catch {
      /* ignore — non-critical */
    }
  }

  useEffect(() => {
    fetchPendingCount()
    const interval = setInterval(fetchPendingCount, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchIdentityPendingCount()
    const interval = setInterval(fetchIdentityPendingCount, 10000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  useEffect(() => {
    if (getRole() !== 'instructor') {
      navigate('/login')
    }
  }, [navigate])

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await apiClient.get(`/api/sessions/${sessionId}/students`)
        // Least-integrity-first, in real time: every poll re-sorts by current score
        // so the roster always surfaces whoever needs attention most at the top.
        const sorted = [...res.data].sort((a, b) => a.score - b.score)
        setStudents(sorted)
        setFetchError('')
        // Functional update so this effect never needs selectedId as a dependency —
        // depending on it caused the effect (and its setInterval) to tear down and
        // restart every time the initial auto-select fired, stacking up duplicate
        // overlapping polling loops instead of settling to a single 5s interval.
        if (sorted.length > 0) {
          setSelectedId((cur) => cur ?? sorted[0].id)
        }

        const crossed = []
        for (const s of sorted) {
          const prev = prevScoresRef.current[s.id]
          if (prev !== undefined && prev >= INTEGRITY_ALERT_THRESHOLD && s.score < INTEGRITY_ALERT_THRESHOLD) {
            crossed.push({ id: `${s.id}-${Date.now()}`, name: s.name, score: s.score })
          }
          prevScoresRef.current[s.id] = s.score
        }
        if (crossed.length > 0) {
          setToasts((t) => [...t, ...crossed])
          crossed.forEach((toast) => {
            setTimeout(() => {
              setToasts((t) => t.filter((x) => x.id !== toast.id))
            }, TOAST_LIFETIME_MS)
          })
        }
      } catch (err) {
        if (err.response?.status === 403) {
          setFetchError('Access denied — sign in as an instructor (prof@test.com) to view this dashboard.')
        } else {
          setFetchError('Could not load student data. Is the backend running?')
        }
      }
    }

    fetchStudents()
    const interval = setInterval(fetchStudents, 5000)
    return () => clearInterval(interval)
  }, [sessionId])

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await apiClient.get(`/api/exams/${sessionId}`)
        const exam = res.data
        setExamMeta({
          title: exam.title,
          section: exam.section,
          started: exam.started_at
            ? new Date(exam.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : exam.timer_mode === 'individual'
              ? 'per-student'
              : 'not started',
          duration: exam.duration_minutes,
          enrolled: exam.enrolled_students.length,
        })
        setSecondsRemaining(exam.duration_minutes * 60)
      } catch {
        /* use defaults */
      }
    }
    fetchExam()
  }, [sessionId])

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const selectedStudent = students.find((s) => s.id === selectedId) || null
  const elapsedMinutes = Math.round((examMeta.duration * 60 - secondsRemaining) / 60)

  return (
    <div className="flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
      <div className="no-print">
        <Topbar
          examMeta={examMeta}
          secondsRemaining={secondsRemaining}
          onExport={() => window.open(`/report/${sessionId}`, '_blank')}
          pendingCount={pendingCount}
          onOpenApprovals={() => setShowApprovals(true)}
          identityPendingCount={identityPendingCount}
          onOpenIdentityReview={() => setShowIdentityReview(true)}
        />
        {showApprovals && (
          <ApprovalsModal
            onClose={() => setShowApprovals(false)}
            onChange={fetchPendingCount}
          />
        )}
        {showIdentityReview && (
          <IdentityReviewModal
            sessionId={sessionId}
            onClose={() => setShowIdentityReview(false)}
            onChange={fetchIdentityPendingCount}
          />
        )}
        <MetricStrip students={students} enrolled={examMeta.enrolled} />
        {fetchError && (
          <div className="px-5 py-2 text-xs bg-[var(--danger-bg)] text-[var(--danger-text)] border-b border-[var(--border)]">
            {fetchError}
          </div>
        )}
      </div>
      <div className="grid grid-cols-[300px_1fr] flex-1 overflow-hidden max-md:grid-cols-1 print:block relative">
        <div className="no-print contents">
          <StudentSidebar
            students={students}
            selectedId={selectedId}
            onSelect={setSelectedId}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        </div>
        <NotificationToasts
          toasts={toasts}
          onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))}
        />
        <DetailPanel
          student={selectedStudent}
          elapsedMinutes={elapsedMinutes}
          durationMinutes={examMeta.duration}
          sessionId={sessionId}
        />
      </div>
    </div>
  )
}
