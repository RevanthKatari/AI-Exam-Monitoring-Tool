import { useEffect, useState } from 'react'
import apiClient from '../api/client'

export default function ApprovalsModal({ onClose, onChange }) {
  const [pending, setPending] = useState([])
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const res = await apiClient.get('/auth/pending')
      setPending(res.data)
    } catch {
      setError('Could not load pending accounts.')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const act = async (id, action) => {
    try {
      await apiClient.post(`/auth/${action}/${id}`)
      setPending((p) => p.filter((u) => u.id !== id))
      onChange?.()
    } catch {
      setError('Action failed. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[var(--text)]">Pending instructor approvals</h3>
          <button type="button" onClick={onClose} className="text-xs text-[var(--text-3)] hover:text-[var(--text)]">
            Close
          </button>
        </div>

        {error && <p className="text-xs text-[var(--danger-text)] mb-3">{error}</p>}

        {pending.length === 0 ? (
          <p className="text-xs text-[var(--text-3)]">No pending accounts.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-3 border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[var(--text)] truncate">{u.name}</div>
                  <div className="text-[11px] text-[var(--text-3)] truncate">{u.email}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => act(u.id, 'approve')}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-[var(--radius-sm)] bg-[#1d9e75] text-white hover:opacity-90"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => act(u.id, 'reject')}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--border-md)] text-[var(--text-2)] hover:bg-[var(--bg-3)]"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
