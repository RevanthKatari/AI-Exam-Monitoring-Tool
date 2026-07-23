import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import StudentSidebar from './StudentSidebar'

const students = [
  { id: '1001', name: 'Alice Anderson', score: 95, status: 'clean', flags: [], attempt_status: 'submitted' },
  { id: '1002', name: 'Bob Brown', score: 55, status: 'high-risk', flags: [{ type: 'danger' }], attempt_status: 'in_progress' },
  { id: '1003', name: 'Carol Chu', score: 75, status: 'flagged', flags: [{ type: 'warning' }], attempt_status: 'not_started' },
]

function setup(overrides = {}) {
  const props = {
    students,
    selectedId: null,
    onSelect: vi.fn(),
    activeFilter: 'all',
    onFilterChange: vi.fn(),
    ...overrides,
  }
  render(<StudentSidebar {...props} />)
  return props
}

describe('StudentSidebar', () => {
  it('renders every student by default', () => {
    setup()
    expect(screen.getByText('Alice Anderson')).toBeInTheDocument()
    expect(screen.getByText('Bob Brown')).toBeInTheDocument()
    expect(screen.getByText('Carol Chu')).toBeInTheDocument()
    expect(screen.getByText('3 students')).toBeInTheDocument()
  })

  it('filters by search text on name or id', () => {
    setup()
    fireEvent.change(screen.getByPlaceholderText('Search by name or ID…'), { target: { value: 'bob' } })
    expect(screen.getByText('Bob Brown')).toBeInTheDocument()
    expect(screen.queryByText('Alice Anderson')).not.toBeInTheDocument()
  })

  it('shows the attempt-status label for each student', () => {
    setup()
    expect(screen.getByText('Submitted')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('Not started')).toBeInTheDocument()
  })

  it('only shows high-risk students when that filter is active', () => {
    setup({ activeFilter: 'high-risk' })
    expect(screen.getByText('Bob Brown')).toBeInTheDocument()
    expect(screen.queryByText('Alice Anderson')).not.toBeInTheDocument()
    expect(screen.queryByText('Carol Chu')).not.toBeInTheDocument()
  })

  it('calls onSelect with the clicked student id', () => {
    const onSelect = vi.fn()
    setup({ onSelect })
    fireEvent.click(screen.getByText('Alice Anderson'))
    expect(onSelect).toHaveBeenCalledWith('1001')
  })

  it('calls onFilterChange when a filter chip is clicked', () => {
    const onFilterChange = vi.fn()
    setup({ onFilterChange })
    fireEvent.click(screen.getByText('Flagged'))
    expect(onFilterChange).toHaveBeenCalledWith('flagged')
  })

  it('shows an empty state when no student matches', () => {
    setup()
    fireEvent.change(screen.getByPlaceholderText('Search by name or ID…'), { target: { value: 'zzz-nobody' } })
    expect(screen.getByText('No students match.')).toBeInTheDocument()
  })
})
