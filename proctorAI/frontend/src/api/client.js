import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default apiClient

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('token', token)
  } else {
    localStorage.removeItem('token')
  }
}

export function getRole() {
  return localStorage.getItem('role')
}

export function setRole(role) {
  if (role) localStorage.setItem('role', role)
  else localStorage.removeItem('role')
}

export function setStudentId(id) {
  if (id) localStorage.setItem('student_id', id)
  else localStorage.removeItem('student_id')
}

export function getStudentId() {
  return localStorage.getItem('student_id')
}

export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  localStorage.removeItem('student_id')
}
