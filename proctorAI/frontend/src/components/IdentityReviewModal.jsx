import { useEffect, useMemo, useState } from 'react'
import apiClient from '../api/client'

const STATUS_LABEL = {
  none: 'Not captured',
  pending: 'Pending review',
  approved: 'Approved',
  denied: 'Denied',
}

const STATUS_COLOR = {
  pending: { bg: 'var(--warning-bg)', text: 'var(--warning-text)' },
  approved: { bg: 'var(--info-bg)', text: 'var(--info-text)' },
  denied: { bg: 'var(--danger-bg)', text: 'var(--danger-text)' },
  none: { bg: 'var(--bg-3)', text: 'var(--text-3)' },
}

function StatusPill({ status }) {
  const c = STATUS_COLOR[status] || STATUS_COLOR.none
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

export default function IdentityReviewModal({ sessionId, onClose, onChange }) {
  const [roster, setRoster] = useState([])
  const [error, setError] = useState('')
  const [tab, setTab] = useState('pending') // 'pending' | 'all'
  const [cursor, setCursor] = useState(0)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const res = await apiClient.get(`/api/exams/${sessionId}/roster`)
      setRoster(res.data)
    } catch {
      setError('Could not load the roster.')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const pending = useMemo(() => roster.filter((s) => s.identity_status === 'pending'), [roster])
  const reviewed = useMemo(
    () => roster.filter((s) => s.identity_status === 'approved' || s.identity_status === 'denied'),
    [roster]
  )

  const current = pending[Math.min(cursor, pending.length - 1)] || null

  const decide = async (studentId, status, decisionReason) => {
    setBusy(true)
    setError('')
    try {
      const res = await apiClient.post(`/api/exams/${sessionId}/roster/${studentId}/identity`, {
        status,
        reason: decisionReason || null,
      })
      setRoster((r) => r.map((s) => (s.student_id === studentId ? res.data : s)))
      setReason('')
      onChange?.()
    } catch {
      setError('Action failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleApprove = () => current && decide(current.student_id, 'approved')
  const handleDeny = () => current && decide(current.student_id, 'denied', reason.trim() || null)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[var(--text)]">Identity verification review</h3>
          <button type="button" onClick={onClose} className="text-xs text-[var(--text-3)] hover:text-[var(--text)]">
            Close
          </button>
        </div>

        <div className="flex gap-1.5 mb-5">
          <button
            type="button"
            onClick={() => setTab('pending')}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              tab === 'pending'
                ? 'bg-[var(--info-bg)] text-[var(--info-text)] border-[var(--info-dot)]'
                : 'border-[var(--border-md)] text-[var(--text-2)] hover:bg-[var(--bg-2)]'
            }`}
          >
            Pending ({pending.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              tab === 'all'
                ? 'bg-[var(--info-bg)] text-[var(--info-text)] border-[var(--info-dot)]'
                : 'border-[var(--border-md)] text-[var(--text-2)] hover:bg-[var(--bg-2)]'
            }`}
          >
            All / reviewed
          </button>
        </div>

        {error && <p className="text-xs text-[var(--danger-text)] mb-3">{error}</p>}

        {tab === 'pending' && (
          <>
            {!current ? (
              <p className="text-xs text-[var(--text-3)] py-6 text-center">
                No students awaiting identity review.
              </p>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-medium text-[var(--text)]">{current.name}</div>
                    <div className="text-[11px] text-[var(--text-3)]">{current.student_id} · {current.email}</div>
                  </div>
                  <div className="text-[11px] text-[var(--text-3)]">
                    {Math.min(cursor, pending.length - 1) + 1} of {pending.length}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-1.5">Captured at exam start</div>
                    {current.id_capture_photo ? (
                      <img
                        src={current.id_capture_photo}
                        alt="Captured"
                        className="w-full aspect-[4/3] rounded-[var(--radius-sm)] object-cover border border-[var(--border)]"
                      />
                    ) : (
                      <div className="w-full aspect-[4/3] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-3)] flex items-center justify-center text-[11px] text-[var(--text-3)]">
                        No photo captured
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] mb-1.5">Roster reference photo</div>
                    {current.reference_photo ? (
                      <img
                        src={current.reference_photo}
                        alt="Reference"
                        className="w-full aspect-[4/3] rounded-[var(--radius-sm)] object-cover border border-[var(--border)]"
                      />
                    ) : (
                      <div className="w-full aspect-[4/3] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-3)] flex items-center justify-center text-[11px] text-[var(--text-3)] text-center px-2">
                        No reference photo on file
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-[11px] text-[var(--text-2)] mb-1">
                    Reason for denial (optional — shown to the student)
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. photo doesn't match roster reference"
                    className="w-full px-2.5 py-1.5 text-xs border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={busy}
                    className="flex-1 py-2 text-xs font-medium bg-[#1d9e75] text-white rounded-[var(--radius-sm)] hover:opacity-90 disabled:opacity-60"
                  >
                    Approve — allow into exam
                  </button>
                  <button
                    type="button"
                    onClick={handleDeny}
                    disabled={busy}
                    className="flex-1 py-2 text-xs font-medium bg-[var(--danger-dot)] text-white rounded-[var(--radius-sm)] hover:opacity-90 disabled:opacity-60"
                  >
                    Deny — block from exam
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'all' && (
          <ul className="space-y-2">
            {roster.length === 0 && (
              <p className="text-xs text-[var(--text-3)] py-6 text-center">No students on this roster yet.</p>
            )}
            {roster.map((s) => (
              <li
                key={s.student_id}
                className="flex items-center justify-between gap-3 border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-[var(--text)] truncate">{s.name}</div>
                  <div className="text-[11px] text-[var(--text-3)] truncate">
                    {s.student_id} · {s.email}
                    {s.identity_status === 'denied' && s.identity_reason && ` · "${s.identity_reason}"`}
                  </div>
                </div>
                <StatusPill status={s.identity_status} />
                <div className="flex items-center gap-1.5 shrink-0">
                  {s.identity_status !== 'approved' && s.id_capture_photo && (
                    <button
                      type="button"
                      onClick={() => decide(s.student_id, 'approved')}
                      disabled={busy}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-[var(--radius-sm)] bg-[#1d9e75] text-white hover:opacity-90 disabled:opacity-60"
                    >
                      Approve
                    </button>
                  )}
                  {s.identity_status !== 'denied' && s.id_capture_photo && (
                    <button
                      type="button"
                      onClick={() => decide(s.student_id, 'denied')}
                      disabled={busy}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--border-md)] text-[var(--danger-text)] hover:bg-[var(--bg-3)] disabled:opacity-60"
                    >
                      Deny
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {reviewed.length > 0 && tab === 'pending' && (
          <p className="text-[10px] text-[var(--text-3)] mt-4">
            {reviewed.length} student{reviewed.length > 1 ? 's' : ''} already reviewed — see the "All / reviewed" tab to change a decision.
          </p>
        )}
      </div>
    </div>
  )
}
