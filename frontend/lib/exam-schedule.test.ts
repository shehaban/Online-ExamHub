import { describe, expect, it } from 'vitest'
import { toDatetimeLocalValue, toSqlDateTime, formatDateTimeLocal } from './exam-schedule'

describe('exam schedule helpers', () => {
  it('converts a datetime-local value to a SQL datetime', () => {
    expect(toSqlDateTime('2026-06-28T10:05')).toBe('2026-06-28 10:05:00')
  })

  it('converts a SQL datetime string back to a datetime-local value', () => {
    expect(toDatetimeLocalValue('2026-06-28 10:05:00')).toBe('2026-06-28T10:05')
  })

  it('formats a Date object to local datetime-local string format', () => {
    const date = new Date(2026, 5, 28, 10, 5) // June 28, 2026, 10:05
    expect(formatDateTimeLocal(date)).toBe('2026-06-28T10:05')
  })
})
