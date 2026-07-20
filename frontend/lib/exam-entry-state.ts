export interface ExamEntryState {
  canEnter: boolean
  timeUntilStart: number | null
  hasEnded: boolean
}

export function getExamEntryState(
  startAt?: string | null,
  endAt?: string | null,
  now: number = Date.now()
): ExamEntryState {
  const endTime = endAt ? new Date(endAt).getTime() : null

  if (endTime !== null && now >= endTime) {
    return { canEnter: false, timeUntilStart: null, hasEnded: true }
  }

  if (!startAt) {
    return { canEnter: true, timeUntilStart: null, hasEnded: false }
  }

  const startTime = new Date(startAt).getTime()
  const diff = startTime - now

  if (diff <= 0) {
    return { canEnter: true, timeUntilStart: null, hasEnded: false }
  }

  return { canEnter: false, timeUntilStart: diff, hasEnded: false }
}
