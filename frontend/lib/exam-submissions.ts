import { apiRequest } from './api'

export interface ExamParticipant {
  id: number
  exam_code: string
  user_id: number
  user_number: string
  user_name: string
  score: number
  total: number
  answers: Record<string, string[]>
  joined_at: string
  finished_at: string | null
}

export interface ExamSettings {
  exam_code: string
  capacity: number | null
  is_locked: number // 0 or 1
}

export interface CheatingAlert {
  id: number
  exam_code: string
  user_id: number
  user_number: string
  user_name: string
  warning_level: number
  reason: string
  created_at: string
}

/** Record that the current user joined/entered an exam */
export async function joinExam(code: string): Promise<void> {
  await apiRequest(`/exams/${encodeURIComponent(code)}/join`, { method: 'POST' })
}

/** Submit exam result for the current user */
export async function submitExamResult(
  code: string,
  score: number,
  total: number,
  answers: Record<string, string[]>
): Promise<void> {
  await apiRequest(`/exams/${encodeURIComponent(code)}/submit`, {
    method: 'POST',
    body: JSON.stringify({ score, total, answers }),
  })
}

/** Get all participants of an exam (instructor only) */
export async function getParticipants(code: string): Promise<ExamParticipant[]> {
  const res = await apiRequest(`/exams/${encodeURIComponent(code)}/participants`)
  return res.data.participants as ExamParticipant[]
}

export async function getMySubmission(code: string): Promise<ExamParticipant | null> {
  try {
    const response = await apiRequest(`/exams/${encodeURIComponent(code)}/my-submission`)
    return response.data.submission || null
  } catch (err) {
    return null
  }
}

/** Kick a participant from the exam (instructor only) */
export async function kickParticipant(code: string, userId: number): Promise<void> {
  await apiRequest(`/exams/${encodeURIComponent(code)}/participants/${userId}`, {
    method: 'DELETE',
  })
}

/** Get exam settings (public) */
export async function getExamSettings(code: string): Promise<ExamSettings> {
  const res = await apiRequest(`/exams/${encodeURIComponent(code)}/settings`)
  return res.data.settings as ExamSettings
}

/** Update exam settings (instructor only) */
export async function updateExamSettings(
  code: string,
  settings: { capacity?: number | null; is_locked?: boolean }
): Promise<ExamSettings> {
  const res = await apiRequest(`/exams/${encodeURIComponent(code)}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(settings),
  })
  return res.data.settings as ExamSettings
}

/** Log cheating alert warning/violation for student */
export async function reportCheatingAlert(
  code: string,
  warningLevel: number,
  reason?: string
): Promise<void> {
  await apiRequest(`/exams/${encodeURIComponent(code)}/cheating-alert`, {
    method: 'POST',
    body: JSON.stringify({ warningLevel, reason }),
  })
}

/** Get all cheating alerts for exam (instructor only) */
export async function getCheatingAlerts(code: string): Promise<CheatingAlert[]> {
  try {
    const res = await apiRequest(`/exams/${encodeURIComponent(code)}/cheating-alerts`)
    return res.data.alerts as CheatingAlert[]
  } catch (err) {
    return []
  }
}

/** Clear/Forgive cheating alerts for a student (instructor/admin only - gives last chance) */
export async function forgiveCheatingAlerts(code: string, userId: string | number): Promise<void> {
  await apiRequest(`/exams/${encodeURIComponent(code)}/cheating-alerts/${userId}`, {
    method: 'DELETE',
  })
}
