import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ExamQuestionNav from './ExamQuestionNav'

const questions = [
  { id: 'q1', prompt: 'First?' },
  { id: 'q2', prompt: 'Second?' },
  { id: 'q3', prompt: 'Third?' },
]

describe('ExamQuestionNav', () => {
  it('renders one entry per question', () => {
    render(<ExamQuestionNav questions={questions} currentIndex={0} onSelect={() => {}} answers={{}} />)
    expect(screen.getByText('Question 1')).toBeInTheDocument()
    expect(screen.getByText('Question 2')).toBeInTheDocument()
    expect(screen.getByText('Question 3')).toBeInTheDocument()
  })

  it('shows a checkmark only for answered questions', () => {
    render(
      <ExamQuestionNav
        questions={questions}
        currentIndex={0}
        onSelect={() => {}}
        answers={{ q1: 'an answer', q2: '   ' }}
      />
    )
    expect(screen.getByText('✓')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('calls onSelect with the clicked question index', () => {
    const onSelect = vi.fn()
    render(<ExamQuestionNav questions={questions} currentIndex={0} onSelect={onSelect} answers={{}} />)
    fireEvent.click(screen.getByText('Question 3'))
    expect(onSelect).toHaveBeenCalledWith(2)
  })
})
