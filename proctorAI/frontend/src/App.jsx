import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import InstructorDashboard from './pages/InstructorDashboard'
import ExamManager from './pages/ExamManager'
import ExamEditor from './pages/ExamEditor'
import ExamPage from './pages/ExamPage'
import SessionReport from './pages/SessionReport'
import { getRole } from './api/client'

function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem('token')
  const role = getRole()
  if (!token) return <Navigate to="/login" replace />
  if (requiredRole && role !== requiredRole) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/exams"
          element={
            <ProtectedRoute requiredRole="instructor">
              <ExamManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exams/new"
          element={
            <ProtectedRoute requiredRole="instructor">
              <ExamEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exams/:sessionId/edit"
          element={
            <ProtectedRoute requiredRole="instructor">
              <ExamEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="instructor">
              <InstructorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report/:sessionId"
          element={
            <ProtectedRoute requiredRole="instructor">
              <SessionReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam"
          element={
            <ProtectedRoute requiredRole="student">
              <ExamPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
