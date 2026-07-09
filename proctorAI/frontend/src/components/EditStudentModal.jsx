import { useState } from 'react'
import apiClient from '../api/client'

export default function EditStudentModal({ sessionId, student, onClose, onSaved }) {
  const [name, setName] = useState(student.name)
  const [email, setEmail] = useState(student.email)
  const [photo, setPhoto] = useState(student.reference_photo || null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handlePhotoFile = async (file) => {
    if (!file) return
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    setPhoto(dataUrl)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const body = { name, email }
      if (photo !== (student.reference_photo || null)) {
        body.reference_photo = photo
      }
      const res = await apiClient.put(`/api/exams/${sessionId}/roster/${student.student_id}`, body)
      onSaved(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 max-w-sm w-full">
        <h3 className="text-sm font-medium text-[var(--text)] mb-4">Edit {student.student_id}</h3>

        <div className="flex flex-col items-center gap-2 mb-4">
          <label className="cursor-pointer">
            {photo ? (
              <img src={photo} alt="Reference" className="w-20 h-20 rounded-full object-cover border border-[var(--border)]" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[var(--bg-3)] flex items-center justify-center text-[11px] text-[var(--text-3)] text-center border border-[var(--border-md)]">
                Add photo
              </div>
            )}
            <input type="file" accept="image/*" onChange={(e) => handlePhotoFile(e.target.files?.[0])} className="hidden" />
          </label>
          {photo && (
            <button type="button" onClick={() => setPhoto(null)} className="text-[10px] text-[var(--danger-text)] hover:opacity-70">
              Remove photo
            </button>
          )}
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs text-[var(--text-2)] mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-2)] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)]"
            />
          </div>
        </div>

        {error && <p className="text-xs text-[var(--danger-text)] mb-3">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 text-xs font-medium bg-[#1d9e75] text-white rounded-[var(--radius-sm)] hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-xs font-medium bg-[var(--bg-3)] text-[var(--text)] rounded-[var(--radius-sm)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
