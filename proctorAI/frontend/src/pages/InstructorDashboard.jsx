import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import apiClient, { getRole } from '../api/client'
import Topbar from '../components/Topbar'
import MetricStrip from '../components/MetricStrip'
import StudentSidebar from '../components/StudentSidebar'
import DetailPanel from '../components/DetailPanel'
import ApprovalsModal from '../components/ApprovalsModal'

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

  const fetchPendingCount = async () => {
    try {
      const res = await apiClient.get('/auth/pending')
      setPendingCount(res.data.length)
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
    if (getRole() !== 'instructor') {
      navigate('/login')
    }
  }, [navigate])

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await apiClient.get(`/api/sessions/${sessionId}/students`)
        setStudents(res.data)
        setFetchError('')
        if (!selectedId && res.data.length > 0) {
          setSelectedId(res.data[0].id)
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
  }, [sessionId, selectedId])

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await apiClient.get(`/api/exams/${sessionId}`)
        const exam = res.data
        const started = new Date(exam.started_at)
        setExamMeta({
          title: exam.title,
          section: exam.section,
          started: started.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
    <div className="flex flex-col h-screen overflow-hidden">
      <Topbar
        examMeta={examMeta}
        secondsRemaining={secondsRemaining}
        onExport={() => alert('Report export will hook up to /api/report/{exam_id}')}
        pendingCount={pendingCount}
        onOpenApprovals={() => setShowApprovals(true)}
      />
      {showApprovals && (
        <ApprovalsModal
          onClose={() => setShowApprovals(false)}
          onChange={fetchPendingCount}
        />
      )}
      <MetricStrip students={students} enrolled={examMeta.enrolled} />
      {fetchError && (
        <div className="px-5 py-2 text-xs bg-[var(--danger-bg)] text-[var(--danger-text)] border-b border-[var(--border)]">
          {fetchError}
        </div>
      )}
      <div className="grid grid-cols-[300px_1fr] flex-1 overflow-hidden max-md:grid-cols-1">
        <StudentSidebar
          students={students}
          selectedId={selectedId}
          onSelect={setSelectedId}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
        <DetailPanel
          student={selectedStudent}
          elapsedMinutes={elapsedMinutes}
          durationMinutes={examMeta.duration}
        />
      </div>
    </div>
  )
}
