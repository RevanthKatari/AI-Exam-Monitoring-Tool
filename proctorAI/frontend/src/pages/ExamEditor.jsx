import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import EditStudentModal from '../components/EditStudentModal'

let qCounter = 0
function newQuestionId() {
  qCounter += 1
  return `q_new_${Date.now()}_${qCounter}`
}

export default function ExamEditor() {
  const navigate = useNavigate()
  const { sessionId } = useParams()
  const isNew = !sessionId

  const [form, setForm] = useState({
    session_id: '',
    title: '',
    section: '',
    duration_minutes: 90,
    timer_mode: 'synchronized',
  })
  const [questions, setQuestions] = useState([])
  const [roster, setRoster] = useState([])
  const [rosterForm, setRosterForm] = useState({ student_id: '', name: '', email: '' })
  const [error, setError] = useState('')
  const [rosterError, setRosterError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvResult, setCsvResult] = useState(null)
  const [editingStudent, setEditingStudent] = useState(null)

  useEffect(() => {
    if (isNew) return
    const load = async () => {
      try {
        const [examRes, rosterRes] = await Promise.all([
          apiClient.get(`/api/exams/${sessionId}`),
          apiClient.get(`/api/exams/${sessionId}/roster`),
        ])
        setForm({
          session_id: examRes.data.session_id,
          title: examRes.data.title,
          section: examRes.data.section,
          duration_minutes: examRes.data.duration_minutes,
          timer_mode: examRes.data.timer_mode,
        })
        setQuestions(examRes.data.questions || [])
        setRoster(rosterRes.data)
      } catch {
        setError('Could not load this exam.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId, isNew])

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const addQuestion = () => {
    setQuestions((qs) => [...qs, { id: newQuestionId(), prompt: '' }])
  }
  const updateQuestion = (id, prompt) => {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, prompt } : q)))
  }
  const removeQuestion = (id) => {
    setQuestions((qs) => qs.filter((q) => q.id !== id))
  }
  const moveQuestion = (index, dir) => {
    setQuestions((qs) => {
      const next = [...qs]
      const target = index + dir
      if (target < 0 || target >= next.length) return qs
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        section: form.section,
        duration_minutes: Number(form.duration_minutes),
        timer_mode: form.timer_mode,
        questions: questions.map((q) => ({ id: q.id, prompt: q.prompt })),
      }
      if (isNew) {
        const res = await apiClient.post('/api/exams', {
          session_id: form.session_id,
          enrolled_students: [],
          ...payload,
        })
        navigate(`/exams/${res.data.session_id}/edit`, { replace: true })
        return
      }
      await apiClient.put(`/api/exams/${sessionId}`, payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save the exam.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddRosterStudent = async (e) => {
    e.preventDefault()
    setRosterError('')
    if (!rosterForm.student_id.trim()) return
    try {
      const res = await apiClient.post(`/api/exams/${sessionId}/roster`, {
        student_id: rosterForm.student_id.trim(),
        name: rosterForm.name.trim() || null,
        email: rosterForm.email.trim() || null,
      })
      setRoster((r) => [...r.filter((s) => s.student_id !== res.data.student_id), res.data])
      setRosterForm({ student_id: '', name: '', email: '' })
    } catch (err) {
      setRosterError(err.response?.data?.detail || 'Could not add student.')
    }
  }

  const handleRemoveRosterStudent = async (studentId) => {
    if (!window.confirm(`Remove student ${studentId} from the roster? Their flags will be deleted too.`)) return
    await apiClient.delete(`/api/exams/${sessionId}/roster/${studentId}`)
    setRoster((r) => r.filter((s) => s.student_id !== studentId))
  }

  const reloadRoster = async () => {
    const res = await apiClient.get(`/api/exams/${sessionId}/roster`)
    setRoster(res.data)
  }

  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCsvUploading(true)
    setCsvResult(null)
    setRosterError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const token = localStorage.getItem('token')
      const res = await fetch(`${apiClient.defaults.baseURL}/api/exams/${sessionId}/roster/csv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || 'CSV import failed')
      }
      const data = await res.json()
      setCsvResult(data)
      await reloadRoster()
    } catch (err) {
      setRosterError(err.message || 'Could not import CSV.')
    } finally {
      setCsvUploading(false)
    }
  }

  const handleStartExam = async () => {
    const res = await apiClient.post(`/api/exams/${sessionId}/start`)
    setForm((f) => ({ ...f }))
    window.alert(`Exam started at ${new Date(res.data.started_at).toLocaleTimeString()}`)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--text-3)]">Loading…</div>
  }

  return (
    <div className="min-h-screen bg-[var(--bg-2)]">
      <header className="flex items-center justify-between px-6 py-4 bg-[var(--bg)] border-b border-[var(--border)]">
        <div>
          <button type="button" onClick={() => navigate('/exams')} className="text-xs text-[var(--text-3)] hover:text-[var(--text)] mb-1">
            ← Back to my exams
          </button>
          <h1 className="text-sm font-medium text-[var(--text)]">{isNew ? 'Create exam' : `Edit: ${form.title}`}</h1>
        </div>
        {!isNew && (
          <button
            type="button"
            onClick={() => navigate(`/dashboard?session=${sessionId}`)}
            className="text-xs font-medium px-3.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-md)] text-[var(--text-2)] hover:bg-[var(--bg-3)]"
          >
            Open monitoring dashboard
          </button>
        )}
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-5">
        {/* Settings panel */}
        <form onSubmit={handleSave} className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--text-3)] mb-4">Exam settings</h2>

          <div className="space-y-4">
            {isNew && (
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1">Session ID (unique code, e.g. comp3430-b-2026)</label>
                <input
                  type="text"
                  required
                  value={form.session_id}
                  onChange={(e) => updateField('session_id', e.target.value.trim())}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)]"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1">Section</label>
                <input
                  type="text"
                  required
                  value={form.section}
                  onChange={(e) => updateField('section', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-2)] mb-1">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                required
                value={form.duration_minutes}
                onChange={(e) => updateField('duration_minutes', e.target.value)}
                className="w-32 px-3 py-2 text-sm border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)]"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-2)] mb-2">Timer mode</label>
              <div className="space-y-2">
                <label className="flex items-start gap-2 p-2.5 border border-[var(--border-md)] rounded-[var(--radius-sm)] cursor-pointer has-[:checked]:border-[#1d9e75] has-[:checked]:bg-[var(--info-bg)]">
                  <input
                    type="radio"
                    name="timer_mode"
                    checked={form.timer_mode === 'synchronized'}
                    onChange={() => updateField('timer_mode', 'synchronized')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-medium text-[var(--text)]">Synchronized start</div>
                    <div className="text-[11px] text-[var(--text-3)]">
                      All students' timers start together the moment you click "Start exam now".
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-2 p-2.5 border border-[var(--border-md)] rounded-[var(--radius-sm)] cursor-pointer has-[:checked]:border-[#1d9e75] has-[:checked]:bg-[var(--info-bg)]">
                  <input
                    type="radio"
                    name="timer_mode"
                    checked={form.timer_mode === 'individual'}
                    onChange={() => updateField('timer_mode', 'individual')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-medium text-[var(--text)]">Individual start</div>
                    <div className="text-[11px] text-[var(--text-3)]">
                      Each student's timer starts the moment they click "Start attempt", independent of everyone else.
                    </div>
                  </div>
                </label>
              </div>
              {!isNew && form.timer_mode === 'synchronized' && (
                <button
                  type="button"
                  onClick={handleStartExam}
                  className="mt-3 text-[11px] font-medium px-2.5 py-1 rounded-[var(--radius-sm)] bg-[#1d9e75] text-white hover:opacity-90"
                >
                  Start exam now (for all students)
                </button>
              )}
            </div>
          </div>

          <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--text-3)] mt-6 mb-3">Questions</h2>
          <div className="space-y-2.5">
            {questions.map((q, i) => (
              <div key={q.id} className="flex items-start gap-2 border border-[var(--border)] rounded-[var(--radius-sm)] p-2.5">
                <span className="text-[11px] text-[var(--text-3)] mt-2 shrink-0 w-4">{i + 1}.</span>
                <textarea
                  rows={2}
                  value={q.prompt}
                  onChange={(e) => updateQuestion(q.id, e.target.value)}
                  placeholder="Question prompt…"
                  className="flex-1 px-2.5 py-1.5 text-xs border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)] resize-y"
                />
                <div className="flex flex-col gap-1 shrink-0">
                  <button type="button" onClick={() => moveQuestion(i, -1)} disabled={i === 0} className="text-[10px] text-[var(--text-3)] hover:text-[var(--text)] disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => moveQuestion(i, 1)} disabled={i === questions.length - 1} className="text-[10px] text-[var(--text-3)] hover:text-[var(--text)] disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => removeQuestion(q.id)} className="text-[10px] text-[var(--danger-text)] hover:opacity-70">✕</button>
                </div>
              </div>
            ))}
            {questions.length === 0 && (
              <p className="text-[11px] text-[var(--text-3)]">No questions yet. Add at least one.</p>
            )}
            <button
              type="button"
              onClick={addQuestion}
              className="text-[11px] font-medium px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--border-md)] text-[var(--text-2)] hover:bg-[var(--bg-3)]"
            >
              + Add question
            </button>
          </div>

          {error && <p className="text-xs text-[var(--danger-text)] mt-4">{error}</p>}
          {saved && <p className="text-xs text-[var(--ok-dot)] mt-4">Saved.</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-5 w-full py-2.5 text-sm font-medium bg-[#1d9e75] text-white rounded-[var(--radius-sm)] hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : isNew ? 'Create exam' : 'Save settings'}
          </button>
        </form>

        {/* Roster panel */}
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--text-3)] mb-4">Participants</h2>
          {isNew ? (
            <p className="text-xs text-[var(--text-3)]">Save the exam first to start adding students to the roster.</p>
          ) : (
            <>
              <form onSubmit={handleAddRosterStudent} className="flex gap-2 mb-4 flex-wrap">
                <input
                  type="text"
                  required
                  placeholder="Student ID"
                  value={rosterForm.student_id}
                  onChange={(e) => setRosterForm((f) => ({ ...f, student_id: e.target.value }))}
                  className="flex-1 min-w-[100px] px-2.5 py-1.5 text-xs border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)]"
                />
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={rosterForm.name}
                  onChange={(e) => setRosterForm((f) => ({ ...f, name: e.target.value }))}
                  className="flex-1 min-w-[100px] px-2.5 py-1.5 text-xs border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)]"
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={rosterForm.email}
                  onChange={(e) => setRosterForm((f) => ({ ...f, email: e.target.value }))}
                  className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)]"
                />
                <button
                  type="submit"
                  className="text-[11px] font-medium px-3 py-1.5 rounded-[var(--radius-sm)] bg-[#1d9e75] text-white hover:opacity-90"
                >
                  + Add
                </button>
              </form>

              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[var(--border)]">
                <label className="text-[11px] font-medium px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-md)] text-[var(--text-2)] hover:bg-[var(--bg-3)] cursor-pointer">
                  {csvUploading ? 'Importing…' : '⬆ Import roster CSV'}
                  <input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} disabled={csvUploading} className="hidden" />
                </label>
                <span className="text-[10px] text-[var(--text-3)]">
                  Columns: student_id, name, email, photo_url (optional — header optional too)
                </span>
              </div>
              {csvResult && (
                <p className="text-xs text-[var(--ok-dot)] mb-3">
                  Imported {csvResult.count} student{csvResult.count === 1 ? '' : 's'}.
                  {csvResult.errors?.length > 0 && ` ${csvResult.errors.length} row(s) failed.`}
                </p>
              )}
              {rosterError && <p className="text-xs text-[var(--danger-text)] mb-3">{rosterError}</p>}

              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-3)] border-b border-[var(--border)]">
                    <th className="py-1.5 font-medium">Photo</th>
                    <th className="py-1.5 font-medium">Student ID</th>
                    <th className="py-1.5 font-medium">Name</th>
                    <th className="py-1.5 font-medium">Email</th>
                    <th className="py-1.5 font-medium">Status</th>
                    <th className="py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {roster.map((s) => (
                    <tr key={s.student_id} className="border-b border-[var(--border)] last:border-b-0">
                      <td className="py-1.5">
                        <button type="button" onClick={() => setEditingStudent(s)} className="block w-8 h-8">
                          {s.reference_photo ? (
                            <img src={s.reference_photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[var(--bg-3)] flex items-center justify-center text-[10px] text-[var(--text-3)]">
                              +
                            </div>
                          )}
                        </button>
                      </td>
                      <td className="py-1.5">{s.student_id}</td>
                      <td className="py-1.5">{s.name}</td>
                      <td className="py-1.5 text-[var(--text-3)]">{s.email}</td>
                      <td className="py-1.5">
                        <span className="text-[10px] px-1.5 py-px rounded-full bg-[var(--bg-3)] text-[var(--text-2)]">
                          {s.attempt_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-1.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setEditingStudent(s)}
                          className="text-[10px] text-[var(--text-2)] hover:text-[var(--text)] mr-3"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRosterStudent(s.student_id)}
                          className="text-[10px] text-[var(--danger-text)] hover:opacity-70"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {roster.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-3 text-center text-[var(--text-3)]">No students enrolled yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {editingStudent && (
        <EditStudentModal
          sessionId={sessionId}
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSaved={(updated) => {
            setRoster((r) => r.map((s) => (s.student_id === updated.student_id ? updated : s)))
            setEditingStudent(null)
          }}
        />
      )}
    </div>
  )
}
