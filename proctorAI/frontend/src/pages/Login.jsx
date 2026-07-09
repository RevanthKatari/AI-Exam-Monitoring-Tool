import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient, { setAuthToken, setRole, setStudentId } from '../api/client'

const DEMO_SESSION = 'comp3430-a-2026'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [studentIdInput, setStudentIdInput] = useState('')
  const [role, setRoleState] = useState('instructor')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    try {
      const res = isRegister
        ? await apiClient.post('/auth/register', {
            name,
            email,
            password,
            role,
            student_id: role === 'student' ? studentIdInput.trim() || null : null,
          })
        : await apiClient.post('/auth/login', { email, password })

      if (res.data.status === 'pending') {
        setNotice(res.data.message || 'Registration submitted. Awaiting approval.')
        setIsRegister(false)
        return
      }

      setAuthToken(res.data.access_token)
      setRole(res.data.role)
      setStudentId(res.data.student_id)
      const userRole = res.data.role
      const studentId = res.data.student_id

      if (userRole === 'student') {
        navigate(`/exam?session=${DEMO_SESSION}&student=${studentId || ''}`)
      } else {
        navigate('/exams')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 bg-[#1d9e75] rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 stroke-white fill-none stroke-2" viewBox="0 0 16 16">
              <circle cx="8" cy="6" r="3" />
              <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
            </svg>
          </div>
          <h1 className="text-lg font-medium text-[var(--text)]">AI Exam Monitor</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-2)] mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRoleState(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)]"
                >
                  <option value="instructor">Instructor</option>
                  <option value="student">Student</option>
                </select>
                {role === 'instructor' && (
                  <p className="mt-1 text-[10px] text-[var(--text-3)]">
                    New instructor accounts require approval from an existing instructor before sign-in.
                  </p>
                )}
              </div>
              {role === 'student' && (
                <div>
                  <label className="block text-xs text-[var(--text-2)] mb-1">Student ID</label>
                  <input
                    type="text"
                    value={studentIdInput}
                    onChange={(e) => setStudentIdInput(e.target.value)}
                    placeholder="e.g. 110195067"
                    className="w-full px-3 py-2 text-sm border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)]"
                  />
                  <p className="mt-1 text-[10px] text-[var(--text-3)]">
                    Enter the student ID your instructor gave you — this is how you get matched to their exam roster.
                    Leave blank only if you don't have one yet.
                  </p>
                </div>
              )}
            </>
          )}
          <div>
            <label className="block text-xs text-[var(--text-2)] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-2)] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-[var(--border-md)] rounded-[var(--radius-sm)] bg-[var(--bg-2)] text-[var(--text)]"
            />
          </div>
          {notice && <p className="text-xs text-[var(--ok-dot)]">{notice}</p>}
          {error && <p className="text-xs text-[var(--danger-text)]">{error}</p>}
          <button
            type="submit"
            className="w-full py-2.5 text-sm font-medium bg-[#1d9e75] text-white rounded-[var(--radius-sm)] hover:opacity-90"
          >
            {isRegister ? 'Register' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          className="mt-4 text-xs text-[var(--text-2)] hover:text-[var(--text)] w-full text-center"
        >
          {isRegister ? 'Already have an account? Sign in' : 'Need an account? Register'}
        </button>

        <p className="mt-4 text-[10px] text-[var(--text-3)] text-center leading-relaxed">
          Demo: instructor <strong>prof@test.com</strong> · student <strong>student@test.com</strong> (password: test123).
          Use two browser windows — one for each role.
        </p>
      </div>
    </div>
  )
}
