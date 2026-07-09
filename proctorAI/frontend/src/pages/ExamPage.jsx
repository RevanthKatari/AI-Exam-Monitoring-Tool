import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import apiClient, { getRole, getStudentId } from '../api/client'
import ExamPortal from '../components/ExamPortal'
import ExamQuestionNav from '../components/ExamQuestionNav'
import ExamQuestionView from '../components/ExamQuestionView'
import IdentityCheck from './IdentityCheck'

export default function ExamPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session') || 'comp3430-a-2026'
  const studentId = searchParams.get('student') || getStudentId() || ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exam, setExam] = useState(null)
  const [attemptStatus, setAttemptStatus] = useState('not_started')
  const [studentStartedAt, setStudentStartedAt] = useState(null)
  const [idCapturePhoto, setIdCapturePhoto] = useState(null)
  const [referencePhoto, setReferencePhoto] = useState(null)
  const [identityStatus, setIdentityStatus] = useState('none')
  const [identityReason, setIdentityReason] = useState(null)
  const [answers, setAnswers] = useState({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [secondsRemaining, setSecondsRemaining] = useState(null)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const saveTimersRef = useRef({})

  useEffect(() => {
    if (getRole() !== 'student') navigate('/login')
  }, [navigate])

  const fetchAttempt = useCallback(async () => {
    if (!studentId) {
      setError('No student ID is associated with your account. Ask your instructor to add you to the roster and share your join link.')
      setLoading(false)
      return
    }
    try {
      const res = await apiClient.get(`/api/exams/${sessionId}/attempt`, { params: { student_id: studentId } })
      setExam(res.data.exam)
      setAttemptStatus(res.data.attempt_status)
      setStudentStartedAt(res.data.started_at)
      setIdCapturePhoto(res.data.id_capture_photo || null)
      setReferencePhoto(res.data.reference_photo || null)
      setIdentityStatus(res.data.identity_status || 'none')
      setIdentityReason(res.data.identity_reason || null)
      setAnswers(res.data.answers || {})
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load this exam. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [sessionId, studentId])

  useEffect(() => {
    fetchAttempt()
  }, [fetchAttempt])

  const handleStartAttempt = async () => {
    try {
      const res = await apiClient.post(`/api/exams/${sessionId}/attempt/start`, { student_id: studentId })
      setStudentStartedAt(res.data.started_at)
      setAttemptStatus('in_progress')
    } catch {
      // e.g. an instructor revoked identity approval in the moment between the
      // page loading and the student clicking "Start attempt" — re-fetch rather
      // than leaving the student stuck on a button that silently does nothing;
      // this naturally routes them to the correct waiting/denied screen instead.
      fetchAttempt()
    }
  }

  const handleAnswerChange = (questionId, text) => {
    setAnswers((a) => ({ ...a, [questionId]: text }))
    clearTimeout(saveTimersRef.current[questionId])
    saveTimersRef.current[questionId] = setTimeout(() => {
      apiClient.post(`/api/exams/${sessionId}/attempt/answers`, {
        student_id: studentId,
        question_id: questionId,
        text,
      }).catch((err) => {
        setSubmitError(err.response?.data?.detail || 'Could not save your last answer. Check your connection.')
      })
    }, 1200)
  }

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      await apiClient.post(`/api/exams/${sessionId}/attempt/submit`, { student_id: studentId })
      setAttemptStatus('submitted')
    } catch (err) {
      // Without this, a failed submit (e.g. a revoked identity approval, or a
      // dropped connection) silently reset the button with zero feedback — from
      // the student's perspective the "Submit exam" button just did nothing.
      setSubmitError(
        err.response?.data?.detail || 'Could not submit your exam. Check your connection and try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }, [sessionId, studentId])

  const handleManualSubmit = () => {
    if (window.confirm('Submit your exam now? You will not be able to change your answers afterward.')) {
      handleSubmit()
    }
  }

  // Must be stable: ExamPage re-renders every second (the countdown ticks), and an
  // inline arrow function here would get a new identity each time, causing
  // ExamPortal's camera-start effect (which depends on this callback) to tear down
  // and re-request the webcam stream every second — that was the actual cause of
  // the flickering video and the flood of false "face not visible" flags, since
  // frames captured mid-stream-restart are often blank.
  const handlePermissionDenied = useCallback(() => setShowPermissionModal(true), [])

  // Poll while waiting for the instructor to trigger a synchronized start.
  useEffect(() => {
    if (!exam || exam.timer_mode !== 'synchronized' || exam.started_at || attemptStatus === 'submitted') return undefined
    const interval = setInterval(fetchAttempt, 5000)
    return () => clearInterval(interval)
  }, [exam, attemptStatus, fetchAttempt])

  // Poll while waiting for the instructor to review a submitted identity photo —
  // this is the gate that sits between capturing the photo and being allowed to
  // start (or continue) the attempt at all.
  useEffect(() => {
    if (identityStatus !== 'pending' || attemptStatus === 'submitted') return undefined
    const interval = setInterval(fetchAttempt, 5000)
    return () => clearInterval(interval)
  }, [identityStatus, attemptStatus, fetchAttempt])

  const effectiveStart = exam?.timer_mode === 'individual' ? studentStartedAt : exam?.started_at

  // Countdown derived from the real elapsed time since effectiveStart, so a page
  // refresh mid-exam shows the correct remaining time instead of resetting.
  useEffect(() => {
    if (!exam || !effectiveStart) {
      setSecondsRemaining(null)
      return undefined
    }
    const compute = () => {
      const elapsed = (Date.now() - new Date(effectiveStart).getTime()) / 1000
      return Math.max(0, Math.round(exam.duration_minutes * 60 - elapsed))
    }
    setSecondsRemaining(compute())
    const timer = setInterval(() => setSecondsRemaining(compute()), 1000)
    return () => clearInterval(timer)
  }, [exam, effectiveStart])

  useEffect(() => {
    if (secondsRemaining === 0 && attemptStatus === 'in_progress' && !submitting) {
      handleSubmit()
    }
  }, [secondsRemaining, attemptStatus, submitting, handleSubmit])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--text-3)]">Loading exam…</div>
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--danger-text)] p-6 text-center">{error}</div>
  }

  const m = secondsRemaining != null ? String(Math.floor(secondsRemaining / 60)).padStart(2, '0') : '--'
  const s = secondsRemaining != null ? String(secondsRemaining % 60).padStart(2, '0') : '--'

  if (attemptStatus === 'submitted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-3)] p-6">
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--info-bg)] flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 stroke-[#1d9e75] fill-none stroke-2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-sm font-medium text-[var(--text)] mb-1">Exam submitted</h1>
          <p className="text-xs text-[var(--text-2)]">Your answers have been recorded. You may now close this window.</p>
        </div>
      </div>
    )
  }

  // Identity verification is a mandatory gate — nothing about starting the exam
  // (individual "Start attempt" or the synchronized waiting screen) is reachable
  // until the student has captured and confirmed a photo.
  if (!idCapturePhoto) {
    return (
      <IdentityCheck
        sessionId={sessionId}
        studentId={studentId}
        referencePhoto={referencePhoto}
        onVerified={(photo) => {
          setIdCapturePhoto(photo)
          // The server sets identity_status to "pending" the instant the photo is
          // saved — reflect that locally right away rather than waiting on the
          // next poll, so the waiting screen below appears immediately.
          setIdentityStatus('pending')
          setIdentityReason(null)
        }}
      />
    )
  }

  // A denied identity check is a hard stop — the student cannot retry on their own;
  // only the instructor reversing the decision (or the student re-capturing after
  // the instructor resets it) can unblock this.
  if (identityStatus === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-3)] p-6">
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--danger-bg)] flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 stroke-[var(--danger-dot)] fill-none stroke-2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M9 9l6 6M15 9l-6 6" />
            </svg>
          </div>
          <h1 className="text-sm font-medium text-[var(--danger-text)] mb-1">Identity verification denied</h1>
          <p className="text-xs text-[var(--text-2)]">
            Your identity photo could not be verified for this exam. Please contact your instructor or proctor.
          </p>
          {identityReason && (
            <p className="text-xs text-[var(--text-3)] mt-3 italic">Reason given: "{identityReason}"</p>
          )}
        </div>
      </div>
    )
  }

  // Approval is required before anything else — this covers both timer modes,
  // since synchronized mode never calls /attempt/start and would otherwise have
  // no client-side checkpoint at all between the photo capture and the exam view.
  if (identityStatus !== 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-3)] p-6">
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8 max-w-sm w-full text-center">
          <h1 className="text-sm font-medium text-[var(--text)] mb-1">Identity check submitted</h1>
          <p className="text-xs text-[var(--text-2)]">
            Your instructor needs to verify your identity photo before you can begin. This page checks
            automatically every few seconds.
          </p>
        </div>
      </div>
    )
  }

  if (exam.timer_mode === 'individual' && !studentStartedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-3)] p-6">
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8 max-w-md w-full">
          <h1 className="text-base font-medium text-[var(--text)] mb-1">{exam.title}</h1>
          <p className="text-xs text-[var(--text-3)] mb-4">{exam.section}</p>
          <ul className="text-xs text-[var(--text-2)] space-y-1.5 mb-5 list-disc pl-4">
            <li>Duration: {exam.duration_minutes} minutes — your timer starts the moment you click below.</li>
            <li>{exam.questions.length} question{exam.questions.length !== 1 ? 's' : ''} to answer.</li>
            <li>Camera and microphone access is required for proctoring.</li>
            <li>Once started, the timer cannot be paused.</li>
          </ul>
          <button
            type="button"
            onClick={handleStartAttempt}
            className="w-full py-2.5 text-sm font-medium bg-[#1d9e75] text-white rounded-[var(--radius-sm)] hover:opacity-90"
          >
            Start attempt
          </button>
        </div>
      </div>
    )
  }

  if (exam.timer_mode === 'synchronized' && !exam.started_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-3)] p-6">
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8 max-w-md w-full text-center">
          <h1 className="text-base font-medium text-[var(--text)] mb-1">{exam.title}</h1>
          <p className="text-xs text-[var(--text-3)] mb-4">{exam.section}</p>
          <p className="text-xs text-[var(--text-2)]">Waiting for your instructor to start the exam…</p>
          <p className="text-[10px] text-[var(--text-3)] mt-2">This page checks automatically every few seconds.</p>
        </div>
      </div>
    )
  }

  const question = exam.questions[currentIndex]

  return (
    <div className="min-h-screen bg-[var(--bg-3)]">
      <header className="flex items-center justify-between px-6 py-3 bg-[var(--bg)] border-b border-[var(--border)] gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-sm font-medium text-[var(--text)] truncate">{exam.title}</h1>
          <p className="text-[11px] text-[var(--text-3)]">{sessionId} · Student {studentId}</p>
        </div>
        <ExamPortal sessionId={sessionId} studentId={studentId} onPermissionDenied={handlePermissionDenied} />
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-lg font-medium text-[var(--text)] tabular-nums">{m}:{s}</div>
          <button
            type="button"
            onClick={handleManualSubmit}
            disabled={submitting}
            className="text-xs font-medium px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--danger-dot)] text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit exam'}
          </button>
        </div>
      </header>

      {submitError && (
        <div className="px-6 py-2 text-xs bg-[var(--danger-bg)] text-[var(--danger-text)] border-b border-[var(--border)]">
          {submitError}
        </div>
      )}

      <div className="max-w-4xl mx-auto p-6 flex gap-4 items-start flex-wrap">
        {exam.questions.length > 1 && (
          <ExamQuestionNav
            questions={exam.questions}
            currentIndex={currentIndex}
            onSelect={setCurrentIndex}
            answers={answers}
          />
        )}
        {question ? (
          <ExamQuestionView
            question={question}
            index={currentIndex}
            total={exam.questions.length}
            value={answers[question.id] || ''}
            onChange={(text) => handleAnswerChange(question.id, text)}
            onPrev={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            onNext={() => setCurrentIndex((i) => Math.min(exam.questions.length - 1, i + 1))}
          />
        ) : (
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 flex-1 text-sm text-[var(--text-2)]">
            This exam has no questions configured yet.
          </div>
        )}
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
