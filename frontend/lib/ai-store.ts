import { apiRequest, apiUpload } from './api'

export interface AiQuestion {
  id: string
  type: 'true_false' | 'multiple_choice'
  prompt: string
  answerBool?: boolean
  options?: string[]
  correctIndex?: number
  mark?: number
}

export interface AiExamDraft {
  id: number
  ai_exam_id?: number
  title: string
  sourceText?: string | null
  fileName?: string | null
  questions: AiQuestion[]
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface AiJobStatus {
  jobId: string
  userId: string
  type: 'generate' | 'refine'
  status: 'pending' | 'generating' | 'completed' | 'failed'
  progress: number
  title: string
  questions?: AiQuestion[] | null
  error?: string | null
  createdAt?: string
  updatedAt?: string
}

/** Starts asynchronous background generation job */
export async function startAiGenerateJob(
  formData: FormData
): Promise<{ jobId: string; job: AiJobStatus }> {
  const response = await apiUpload('/ai/jobs/generate', formData)
  return response.data
}

/** Starts asynchronous background prompt refinement job */
export async function startAiRefineJob(data: {
  existingQuestions: AiQuestion[]
  prompt: string
  sourceText?: string
  title?: string
}): Promise<{ jobId: string; job: AiJobStatus }> {
  const response = await apiRequest('/ai/jobs/refine', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return response.data
}

/** Polls status of a single AI job */
export async function checkAiJobStatus(jobId: string): Promise<AiJobStatus> {
  const response = await apiRequest(`/ai/jobs/status/${encodeURIComponent(jobId)}`)
  return response.data.job
}

/** Cancels a running AI generation or refinement job */
export async function cancelAiJob(jobId: string): Promise<AiJobStatus | null> {
  try {
    const response = await apiRequest(`/ai/jobs/cancel/${encodeURIComponent(jobId)}`, {
      method: 'POST',
    })
    return response.data.job
  } catch (err) {
    console.error('Failed to cancel AI job:', err)
    return null
  }
}

/** Fetches active or recent background AI jobs for the user */
export async function getActiveAiJobs(): Promise<AiJobStatus[]> {
  try {
    const response = await apiRequest('/ai/jobs/active')
    return response.data.jobs || []
  } catch (err) {
    return []
  }
}

/** Saves an AI exam draft to the database */
export async function saveAiExamDraft(draft: {
  id?: number
  title: string
  sourceText?: string
  fileName?: string
  questions: AiQuestion[]
}): Promise<AiExamDraft> {
  const response = await apiRequest('/ai/saved', {
    method: 'POST',
    body: JSON.stringify(draft),
  })
  return response.data.exam
}

/** Fetches all saved AI exam drafts from the database */
export async function getSavedAiExams(): Promise<AiExamDraft[]> {
  const response = await apiRequest('/ai/saved')
  return response.data.exams || []
}

/** Deletes a saved AI exam draft */
export async function deleteSavedAiExam(id: number): Promise<boolean> {
  await apiRequest(`/ai/saved/${id}`, {
    method: 'DELETE',
  })
  return true
}
