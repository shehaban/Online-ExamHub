import { apiRequest } from './api'

export type QuestionType = 'true_false' | 'multiple_choice'

export interface ExamQuestion {
  id: string
  type: QuestionType
  prompt: string
  /** Score awarded for a correct answer. Defaults to 1 if not set. */
  mark?: number
  // true/false
  answerBool?: boolean
  // multiple choice
  options?: string[]
  correctIndex?: number
  correctIndexes?: number[]
  /** Per-option marks for multiple choice questions (index -> mark) */
  optionMarks?: Record<number, number>
}

export interface Exam {
  exam_id?: number
  code: string
  title: string
  questions: ExamQuestion[]
  startAt?: string | null
  endAt?: string | null
  created_at?: string
  createdAt?: string // compatibility with existing frontend
  created_by?: string
  createdBy?: string // compatibility with existing frontend
}

/** Normalizes a code so lookups are case-insensitive and trimmed. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

/**
 * Publishes (or overwrites) an exam under the given code on the backend.
 * Returns the saved exam.
 */
export async function saveExam(
  code: string,
  title: string,
  questions: ExamQuestion[],
  createdBy?: string,
  startAt?: string | null,
  endAt?: string | null
): Promise<Exam> {
  const normalized = normalizeCode(code)
  // Ensure every question has a mark
  const finalQuestions = questions.map((q) => ({ ...q, mark: q.mark ?? 1 }))

  const response = await apiRequest('/exams', {
    method: 'POST',
    body: JSON.stringify({
      code: normalized,
      title,
      questions: finalQuestions,
      created_by: createdBy,
      startAt,
      endAt,
    }),
  })

  const exam = response.data.exam as Exam
  const normalizedExam = exam as Exam & { start_at?: string | null; end_at?: string | null }
  return {
    ...normalizedExam,
    startAt: normalizedExam.startAt ?? normalizedExam.start_at ?? null,
    endAt: normalizedExam.endAt ?? normalizedExam.end_at ?? null,
    createdAt: normalizedExam.created_at || normalizedExam.createdAt,
    createdBy: normalizedExam.created_by || normalizedExam.createdBy,
  }
}

/** Returns the published exam for a code, or null if none exists. */
export async function getExam(code: string): Promise<Exam | null> {
  try {
    const response = await apiRequest(`/exams/${encodeURIComponent(normalizeCode(code))}`)
    const exam = response.data.exam as Exam
    const normalizedExam = exam as Exam & { start_at?: string | null; end_at?: string | null }
    return {
      ...normalizedExam,
      startAt: normalizedExam.startAt ?? normalizedExam.start_at ?? null,
      endAt: normalizedExam.endAt ?? normalizedExam.end_at ?? null,
      createdAt: normalizedExam.created_at || normalizedExam.createdAt,
      createdBy: normalizedExam.created_by || normalizedExam.createdBy,
    }
  } catch (err) {
    return null
  }
}

/** Checks whether an exam exists for the given code. */
export async function examExists(code: string): Promise<boolean> {
  const exam = await getExam(code)
  return exam !== null
}

/** Returns all published exams, newest first. Optional creator filter. */
export async function getAllExams(creator?: string): Promise<Exam[]> {
  const endpoint = creator ? `/exams?creator=${encodeURIComponent(creator)}` : '/exams'
  const response = await apiRequest(endpoint)
  const exams = response.data.exams as Exam[]
  return exams.map((exam) => {
    const normalizedExam = exam as Exam & { start_at?: string | null; end_at?: string | null }
    return {
      ...normalizedExam,
      startAt: normalizedExam.startAt ?? normalizedExam.start_at ?? null,
      endAt: normalizedExam.endAt ?? normalizedExam.end_at ?? null,
      createdAt: normalizedExam.created_at || normalizedExam.createdAt,
      createdBy: normalizedExam.created_by || normalizedExam.createdBy,
    }
  })
}

/** Replaces the questions of an existing exam. Returns the updated exam or null. */
export async function updateExamQuestions(
  code: string,
  questions: ExamQuestion[],
  title?: string,
  startAt?: string | null,
  endAt?: string | null
): Promise<Exam | null> {
  const finalQuestions = questions.map((q) => ({ ...q, mark: q.mark ?? 1 }))
  const response = await apiRequest(`/exams/${encodeURIComponent(normalizeCode(code))}`, {
    method: 'PUT',
    body: JSON.stringify({
      title,
      questions: finalQuestions,
      startAt,
      endAt,
    }),
  })
  const exam = response.data.exam as Exam
  const normalizedExam = exam as Exam & { start_at?: string | null; end_at?: string | null }
  return {
    ...normalizedExam,
    startAt: normalizedExam.startAt ?? normalizedExam.start_at ?? null,
    endAt: normalizedExam.endAt ?? normalizedExam.end_at ?? null,
    createdAt: normalizedExam.created_at || normalizedExam.createdAt,
    createdBy: normalizedExam.created_by || normalizedExam.createdBy,
  }
}

/** Deletes an exam by code. Returns true if it existed. */
export async function deleteExam(code: string): Promise<boolean> {
  try {
    await apiRequest(`/exams/${encodeURIComponent(normalizeCode(code))}`, {
      method: 'DELETE',
    })
    return true
  } catch {
    return false
  }
}

/** Generates a stable-ish unique id for a new question. */
export function newQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
