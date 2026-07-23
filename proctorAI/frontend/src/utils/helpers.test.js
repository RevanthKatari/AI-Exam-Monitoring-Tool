import { describe, expect, it } from 'vitest'
import { initials, riskLabel, scoreColor, typeColors } from './helpers'

describe('scoreColor', () => {
  it('returns green at and above 80', () => {
    expect(scoreColor(80)).toBe('#1d9e75')
    expect(scoreColor(100)).toBe('#1d9e75')
  })

  it('returns amber between 60 and 79', () => {
    expect(scoreColor(60)).toBe('#ba7517')
    expect(scoreColor(79)).toBe('#ba7517')
  })

  it('returns red below 60', () => {
    expect(scoreColor(59)).toBe('#e24b4a')
    expect(scoreColor(0)).toBe('#e24b4a')
  })
})

describe('typeColors', () => {
  it('returns the mapped palette for known types', () => {
    expect(typeColors('danger')).toEqual({
      bg: 'var(--danger-bg)', text: 'var(--danger-text)', dot: 'var(--danger-dot)',
    })
    expect(typeColors('warning').dot).toBe('var(--warning-dot)')
    expect(typeColors('info').text).toBe('var(--info-text)')
  })

  it('falls back to the "ok" palette for unknown types', () => {
    expect(typeColors('nonsense')).toEqual(typeColors('ok'))
  })
})

describe('initials', () => {
  it('takes the first letter of up to two words', () => {
    expect(initials('Jane Doe')).toBe('JD')
  })

  it('uppercases the result', () => {
    expect(initials('jane doe')).toBe('JD')
  })

  it('truncates to two characters for names with more than two words', () => {
    expect(initials('Jane Middle Doe')).toBe('JM')
  })

  it('handles a single-word name', () => {
    expect(initials('Cher')).toBe('C')
  })
})

describe('riskLabel', () => {
  it('labels scores at and above 80 as low risk', () => {
    expect(riskLabel(80)).toBe('Low risk')
  })

  it('labels scores between 60 and 79 as moderate risk', () => {
    expect(riskLabel(60)).toBe('Moderate risk — monitor closely')
    expect(riskLabel(79)).toBe('Moderate risk — monitor closely')
  })

  it('labels scores below 60 as high risk', () => {
    expect(riskLabel(59)).toBe('High risk — immediate review required')
  })
})
