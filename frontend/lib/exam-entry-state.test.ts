import { describe, expect, it } from 'vitest'
import { getExamEntryState } from './exam-entry-state'

describe('getExamEntryState', () => {
  it('returns a countdown state before the scheduled start time', () => {
    const now = new Date('2026-06-28T10:00:00.000Z').getTime()
    const startAt = new Date('2026-06-28T10:05:00.000Z').toISOString()

    const state = getExamEntryState(startAt, null, now)

    expect(state.canEnter).toBe(false)
    expect(state.timeUntilStart).toBe(300000)
  })

  it('allows entry once the scheduled start time has passed', () => {
    const now = new Date('2026-06-28T10:05:00.000Z').getTime()
    const startAt = new Date('2026-06-28T10:00:00.000Z').toISOString()

    const state = getExamEntryState(startAt, null, now)

    expect(state.canEnter).toBe(true)
    expect(state.timeUntilStart).toBeNull()
    expect(state.hasEnded).toBe(false)
  })

  it('blocks entry once the exam end time has passed', () => {
    const now = new Date('2026-06-28T10:10:00.000Z').getTime()
    const startAt = new Date('2026-06-28T10:00:00.000Z').toISOString()
    const endAt = new Date('2026-06-28T10:05:00.000Z').toISOString()

    const state = getExamEntryState(startAt, endAt, now)

    expect(state.canEnter).toBe(false)
    expect(state.timeUntilStart).toBeNull()
    expect(state.hasEnded).toBe(true)
  })
})
