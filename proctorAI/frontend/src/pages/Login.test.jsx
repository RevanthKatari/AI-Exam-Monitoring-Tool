import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient, { setAuthToken, setRole, setStudentId } from '../api/client'
import Login from './Login'

vi.mock('../api/client', () => ({
  default: { post: vi.fn() },
  setAuthToken: vi.fn(),
  setRole: vi.fn(),
  setStudentId: vi.fn(),
}))

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

function renderLogin() {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows sign-in fields by default, no name/role/student-id fields', () => {
    renderLogin()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Password')).toBeInTheDocument()
    expect(screen.queryByText('Name')).not.toBeInTheDocument()
    expect(screen.queryByText('Student ID')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('reveals name/role fields when switching to register mode', () => {
    renderLogin()
    fireEvent.click(screen.getByText('Need an account? Register'))
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Role')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument()
  })

  it('reveals the Student ID field only when role is student', () => {
    renderLogin()
    fireEvent.click(screen.getByText('Need an account? Register'))
    expect(screen.queryByText('Student ID')).not.toBeInTheDocument()
    fireEvent.change(screen.getByDisplayValue('Instructor'), { target: { value: 'student' } })
    expect(screen.getByText('Student ID')).toBeInTheDocument()
  })

  it('submits login credentials and stores the session on success', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: { access_token: 'tok', role: 'instructor', student_id: null },
    })
    renderLogin()
    fireEvent.change(document.querySelector('input[type="email"]'), { target: { value: 'prof@test.com' } })
    fireEvent.change(document.querySelector('input[type="password"]'), { target: { value: 'test123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'prof@test.com', password: 'test123',
    }))
    expect(setAuthToken).toHaveBeenCalledWith('tok')
    expect(setRole).toHaveBeenCalledWith('instructor')
    expect(setStudentId).toHaveBeenCalledWith(null)
    expect(navigateMock).toHaveBeenCalledWith('/exams')
  })

  it('routes a signed-in student to their exam page', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: { access_token: 'tok', role: 'student', student_id: '555000001' },
    })
    renderLogin()
    fireEvent.change(document.querySelector('input[type="email"]'), { target: { value: 'student@test.com' } })
    fireEvent.change(document.querySelector('input[type="password"]'), { target: { value: 'test123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(
      expect.stringContaining('/exam?session=comp3430-a-2026&student=555000001')
    ))
  })

  it('shows a pending notice instead of navigating when registration needs approval', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: { status: 'pending', message: 'Awaiting approval from an existing instructor.' },
    })
    renderLogin()
    fireEvent.click(screen.getByText('Need an account? Register'))
    fireEvent.change(document.querySelector('input[type="text"]'), { target: { value: 'New Prof' } })
    fireEvent.change(document.querySelector('input[type="email"]'), { target: { value: 'new@test.com' } })
    fireEvent.change(document.querySelector('input[type="password"]'), { target: { value: 'test123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() => expect(screen.getByText('Awaiting approval from an existing instructor.')).toBeInTheDocument())
    expect(navigateMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('shows an error message when authentication fails', async () => {
    apiClient.post.mockRejectedValueOnce({ response: { data: { detail: 'Invalid credentials' } } })
    renderLogin()
    fireEvent.change(document.querySelector('input[type="email"]'), { target: { value: 'x@test.com' } })
    fireEvent.change(document.querySelector('input[type="password"]'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeInTheDocument())
  })
})
