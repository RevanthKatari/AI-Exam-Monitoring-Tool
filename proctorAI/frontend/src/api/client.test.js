import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import apiClient, {
  getRole, getStudentId, logout, setAuthToken, setRole, setStudentId,
} from './client'

describe('token/role/studentId storage helpers', () => {
  beforeEach(() => localStorage.clear())

  it('setAuthToken stores and clears the token', () => {
    setAuthToken('abc123')
    expect(localStorage.getItem('token')).toBe('abc123')
    setAuthToken(null)
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('setRole/getRole round-trip and clear on null', () => {
    setRole('instructor')
    expect(getRole()).toBe('instructor')
    setRole(null)
    expect(getRole()).toBeNull()
  })

  it('setStudentId/getStudentId round-trip and clear on null', () => {
    setStudentId('555000001')
    expect(getStudentId()).toBe('555000001')
    setStudentId(null)
    expect(getStudentId()).toBeNull()
  })

  it('logout clears token, role, and student id', () => {
    setAuthToken('abc123')
    setRole('student')
    setStudentId('555000001')
    logout()
    expect(localStorage.getItem('token')).toBeNull()
    expect(getRole()).toBeNull()
    expect(getStudentId()).toBeNull()
  })
})

describe('request interceptor', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('attaches an Authorization header when a token is present', async () => {
    setAuthToken('my-jwt')
    let capturedConfig
    apiClient.defaults.adapter = (config) => {
      capturedConfig = config
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config })
    }
    await apiClient.get('/api/exams')
    expect(capturedConfig.headers.Authorization).toBe('Bearer my-jwt')
  })

  it('omits the Authorization header when no token is present', async () => {
    let capturedConfig
    apiClient.defaults.adapter = (config) => {
      capturedConfig = config
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config })
    }
    await apiClient.get('/api/exams')
    expect(capturedConfig.headers.Authorization).toBeUndefined()
  })
})
