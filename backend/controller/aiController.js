import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import AppError from '../utils/AppError.js'
import httpStatusText from '../utils/httpStatusText.js'
import asyncWrapper from '../middleware/asyncWrapper.js'
import * as aiModel from '../models/aiModel.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * Extract text from an uploaded file (PDF or plain text).
 */
async function extractTextFromFile(file) {
  const ext = path.extname(file.originalname).toLowerCase()

  if (ext === '.txt') {
    return fs.readFileSync(file.path, 'utf-8')
  }

  if (ext === '.pdf') {
    const buffer = fs.readFileSync(file.path)
    const pdfModule = await import('pdf-parse')

    // 1. Standard pdf-parse v1 default function export
    const pdfFunc = pdfModule.default || pdfModule
    if (typeof pdfFunc === 'function' && !pdfFunc.prototype?.getText) {
      const data = await pdfFunc(buffer)
      return data.text || ''
    }

    // 2. pdf-parse v2 (PDFParse class export)
    const PDFParseClass = pdfModule.PDFParse || pdfModule.default?.PDFParse
    if (PDFParseClass) {
      const parser = new PDFParseClass({ data: buffer })
      const res = await parser.getText()
      return typeof res === 'string' ? res : res?.text || res?.content || ''
    }

    throw new Error('PDF parsing library structure unrecognized.')
  }

  if (ext === '.doc' || ext === '.docx') {
    const buffer = fs.readFileSync(file.path, 'utf-8')
    return buffer
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  throw new Error(`Unsupported file type: ${ext}`)
}

/**
 * Build prompt for initial exam generation.
 */
function buildPrompt(text, numQuestions, questionType) {
  const typeInstruction =
    questionType === 'true_false'
      ? 'Generate ONLY true/false questions.'
      : questionType === 'multiple_choice'
        ? 'Generate ONLY multiple choice questions (each with 4 options).'
        : 'Generate a mix of true/false and multiple choice questions.'

  return `You are an expert exam question generator. Based on the following study material, generate exactly ${numQuestions} exam questions.

${typeInstruction}

CRITICAL LANGUAGE RULE:
- Detect the language of the study material below.
- ALL questions, options, and statements MUST be written in the SAME language as the study material.
- If the material is in Arabic, write everything in Arabic. If in English, write in English. If in French, write in French. Etc.
- Do NOT translate the material. Generate questions in the original language.

IMPORTANT RULES:
- Read and understand the material deeply before generating questions.
- Questions MUST be based ONLY on the provided study material content. Do NOT invent questions from outside knowledge.
- Questions should test real understanding, not just surface-level facts.
- For true/false questions: create statements that are clearly true or false based on the material.
- For multiple choice questions: provide exactly 4 options with only one correct answer.
- Make sure all questions and answers are accurate based on the provided material.
- Vary the difficulty level.

You MUST respond with ONLY a valid JSON array, no markdown, no code blocks, no explanation. Each element must follow this exact schema:

For true/false:
{"type": "true_false", "prompt": "statement text", "answerBool": true or false}

For multiple choice:
{"type": "multiple_choice", "prompt": "question text?", "options": ["A", "B", "C", "D"], "correctIndex": 0}

Where correctIndex is the 0-based index of the correct option.

STUDY MATERIAL:
---
${text.slice(0, 30000)}
---

Generate exactly ${numQuestions} questions as a JSON array:`
}

/**
 * Build prompt for targeted prompt-based question refinement.
 */
function buildRefinePrompt(existingQuestions, refinementInstruction, sourceText = '') {
  return `You are an AI exam refinement assistant. You are given a list of existing exam questions and a specific instruction from the instructor on how to refine them.

CURRENT EXAM QUESTIONS (JSON):
---
${JSON.stringify(existingQuestions, null, 2)}
---

${sourceText ? `OPTIONAL CONTEXT/STUDY MATERIAL:\n---\n${sourceText.slice(0, 15000)}\n---\n` : ''}

INSTRUCTOR'S INSTRUCTION / REFINEMENT PROMPT:
"${refinementInstruction}"

CRITICAL LANGUAGE RULE:
- Detect the language of the existing questions.
- ALL output questions, options, and statements MUST be in the SAME language as the existing questions.
- If questions are in Arabic, respond in Arabic. If in English, respond in English. Etc.

RULES FOR REFINEMENT:
- Apply the instructor's requested edits strictly. (e.g. modify specific questions, rephrase questions, make questions harder/easier, add new questions, or replace questions as asked).
- Retain unchanged questions as they are, keeping their IDs intact if possible.
- Output ONLY a valid JSON array containing the complete final list of exam questions.
- For true/false questions: {"id": "...", "type": "true_false", "prompt": "...", "answerBool": true|false}
- For multiple choice questions: {"id": "...", "type": "multiple_choice", "prompt": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0}

Respond with ONLY the valid JSON array, no markdown formatting or code blocks:`
}

/**
 * Call OpenRouter API with fallback models.
 */
async function callOpenRouterAPI(prompt) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured on the server.')
  }

  const freeModels = [
    process.env.OPENROUTER_MODEL,
    'openrouter/free',
    'google/gemma-4-31b-it:free',
    'google/gemma-4-26b-a4b-it:free',
    'openai/gpt-oss-20b:free',
    'nvidia/nemotron-nano-9b-v2:free',
    'cohere/north-mini-code:free',
  ].filter(Boolean)

  let lastError = null

  for (const model of freeModels) {
    try {
      console.log(`Trying OpenRouter model: ${model}...`)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 90000) // 90 second timeout
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Online ExamHub',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert exam question generator. You MUST respond with ONLY a valid JSON array — no markdown, no code blocks, no explanation. CRITICAL: Detect the language of the study material and generate questions in that SAME language. If the material is Arabic, respond in Arabic. If English, respond in English.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 8192,
        }),
      })
      clearTimeout(timeout)

      if (!response.ok) {
        const errBody = await response.text()
        console.warn(`Model ${model} failed (${response.status}): ${errBody.slice(0, 150)}`)
        lastError = new Error(`OpenRouter (${model}) error: ${response.status}`)
        continue
      }

      const data = await response.json()
      const rawText = data?.choices?.[0]?.message?.content || ''

      if (!rawText) {
        console.warn(`Model ${model} returned empty response.`)
        continue
      }

      const cleaned = rawText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()

      let questions = JSON.parse(cleaned)
      if (Array.isArray(questions) && questions.length > 0) {
        console.log(`Successfully processed ${questions.length} questions using ${model}`)
        return questions.map((q) => ({
          id: q.id || Math.random().toString(36).slice(2, 10),
          type: q.type === 'multiple_choice' ? 'multiple_choice' : 'true_false',
          prompt: q.prompt || '',
          ...(q.type === 'true_false' ? { answerBool: Boolean(q.answerBool) } : {}),
          ...(q.type === 'multiple_choice'
            ? {
                options: Array.isArray(q.options) ? q.options : ['A', 'B', 'C', 'D'],
                correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
              }
            : {}),
        }))
      }
    } catch (err) {
      console.warn(`Model ${model} execution error:`, err.message)
      lastError = err
    }
  }

  throw lastError || new Error('All free OpenRouter models failed. Please try again in a moment.')
}

// ─── SYNCHRONOUS GENERATION (LEGACY SUPPORT) ──────────────────────────────────

export const generateQuestions = asyncWrapper(async (req, res, next) => {
  let sourceText = ''

  if (req.file) {
    try {
      sourceText = await extractTextFromFile(req.file)
    } catch (err) {
      if (req.file.path) fs.unlinkSync(req.file.path)
      return next(new AppError(`File processing error: ${err.message}`, 400, httpStatusText.FAIL))
    }
    if (req.file.path) fs.unlinkSync(req.file.path)
  }

  if (req.body.text) {
    sourceText = req.body.text
  }

  if (!sourceText || sourceText.trim().length < 20) {
    return next(
      new AppError(
        'Please provide more content (at least a few sentences) to generate questions from.',
        400,
        httpStatusText.FAIL
      )
    )
  }

  const numQuestions = Math.min(Math.max(parseInt(req.body.numQuestions) || 5, 1), 30)
  const questionType = req.body.questionType || 'mixed'

  try {
    const prompt = buildPrompt(sourceText, numQuestions, questionType)
    const questions = await callOpenRouterAPI(prompt)
    res.json({ status: httpStatusText.SUCCESS, data: { questions } })
  } catch (err) {
    return next(new AppError(err.message || 'AI generation failed', 500, httpStatusText.ERROR))
  }
})

// ─── BACKGROUND JOBS (PERSISTENT CROSS-PAGE GENERATION & REFINEMENT) ─────────

/**
 * POST /api/ai/jobs/generate
 * Starts background exam generation job.
 */
export const startGenerateJob = asyncWrapper(async (req, res, next) => {
  let sourceText = ''
  let fileName = ''

  if (req.file) {
    fileName = req.file.originalname
    try {
      sourceText = await extractTextFromFile(req.file)
      console.log(
        `[AI Generate] Extracted ${sourceText.length} chars from file "${fileName}". Preview: "${sourceText.slice(0, 200)}..."`
      )
    } catch (err) {
      if (req.file.path) fs.unlinkSync(req.file.path)
      return next(new AppError(`File processing error: ${err.message}`, 400, httpStatusText.FAIL))
    }
    if (req.file.path) fs.unlinkSync(req.file.path)
  }

  if (req.body.text) {
    sourceText = req.body.text
  }

  if (!sourceText || sourceText.trim().length < 20) {
    console.warn(
      `[AI Generate] Insufficient text extracted (${sourceText?.length || 0} chars). File: "${fileName}"`
    )
    return next(
      new AppError(
        'Please provide sufficient study material (at least 20 characters).',
        400,
        httpStatusText.FAIL
      )
    )
  }

  const userId = req.currentUser?.user_number || req.currentUser?.user_id || 'anonymous'
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const numQuestions = Math.min(Math.max(parseInt(req.body.numQuestions) || 5, 1), 30)
  const questionType = req.body.questionType || 'mixed'
  const title =
    req.body.title ||
    (fileName ? `Exam from ${fileName}` : `AI Generated Exam (${numQuestions} Qs)`)

  // Create initial job record
  const job = await aiModel.createAiJob({
    jobId,
    userId,
    type: 'generate',
    title,
  })

  // Respond immediately with job ID
  res.json({
    status: httpStatusText.SUCCESS,
    data: { jobId, job },
  })

  // Process asynchronously in background
  ;(async () => {
    try {
      await aiModel.updateAiJobProgress(jobId, { progress: 30 })
      const prompt = buildPrompt(sourceText, numQuestions, questionType)
      await aiModel.updateAiJobProgress(jobId, { progress: 60 })
      const questions = await callOpenRouterAPI(prompt)
      await aiModel.updateAiJobProgress(jobId, {
        status: 'completed',
        progress: 100,
        questions,
      })
    } catch (err) {
      console.error(`AI Job ${jobId} failed:`, err.message)
      await aiModel.updateAiJobProgress(jobId, {
        status: 'failed',
        progress: 100,
        error: err.message || 'AI generation failed',
      })
    }
  })()
})

/**
 * POST /api/ai/jobs/refine
 * Starts background prompt refinement job to edit current questions.
 */
export const startRefineJob = asyncWrapper(async (req, res, next) => {
  const { existingQuestions, prompt: refinementPrompt, sourceText, title } = req.body

  if (!Array.isArray(existingQuestions) || existingQuestions.length === 0) {
    return next(
      new AppError('Please provide existing questions to refine.', 400, httpStatusText.FAIL)
    )
  }
  if (!refinementPrompt || !refinementPrompt.trim()) {
    return next(
      new AppError('Please provide a refinement prompt instruction.', 400, httpStatusText.FAIL)
    )
  }

  const userId = req.currentUser?.user_number || req.currentUser?.user_id || 'anonymous'
  const jobId = `refine_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const job = await aiModel.createAiJob({
    jobId,
    userId,
    type: 'refine',
    title: title || `AI Prompt Refinement: "${refinementPrompt.slice(0, 30)}..."`,
  })

  res.json({
    status: httpStatusText.SUCCESS,
    data: { jobId, job },
  })

  // Process refinement asynchronously
  ;(async () => {
    try {
      await aiModel.updateAiJobProgress(jobId, { progress: 35 })
      const promptText = buildRefinePrompt(existingQuestions, refinementPrompt, sourceText || '')
      await aiModel.updateAiJobProgress(jobId, { progress: 70 })
      const refinedQuestions = await callOpenRouterAPI(promptText)
      await aiModel.updateAiJobProgress(jobId, {
        status: 'completed',
        progress: 100,
        questions: refinedQuestions,
      })
    } catch (err) {
      console.error(`AI Refine Job ${jobId} failed:`, err.message)
      await aiModel.updateAiJobProgress(jobId, {
        status: 'failed',
        progress: 100,
        error: err.message || 'AI prompt refinement failed',
      })
    }
  })()
})

/**
 * GET /api/ai/jobs/status/:jobId
 * Check current job status.
 */
export const getJobStatus = asyncWrapper(async (req, res, next) => {
  const { jobId } = req.params
  const job = await aiModel.getAiJobById(jobId)

  if (!job) {
    return next(new AppError('Job not found.', 404, httpStatusText.FAIL))
  }

  res.json({
    status: httpStatusText.SUCCESS,
    data: { job },
  })
})

/**
 * GET /api/ai/jobs/active
 * Get active/recent jobs for logged in user.
 */
export const getActiveJobs = asyncWrapper(async (req, res, next) => {
  const userId = req.currentUser?.user_number || req.currentUser?.user_id || 'anonymous'
  const jobs = await aiModel.getActiveAiJobsByUser(userId)

  res.json({
    status: httpStatusText.SUCCESS,
    data: { jobs },
  })
})

/**
 * POST /api/ai/jobs/cancel/:jobId
 * Cancel an active AI generation/refinement job.
 */
export const cancelJob = asyncWrapper(async (req, res, next) => {
  const { jobId } = req.params
  const job = await aiModel.updateAiJobProgress(jobId, {
    status: 'failed',
    progress: 100,
    error: 'Generation stopped by user.',
  })

  res.json({
    status: httpStatusText.SUCCESS,
    data: { job },
  })
})

// ─── SAVED AI EXAMS DATABASE ENDPOINTS ───────────────────────────────────────

/**
 * POST /api/ai/saved
 * Save or update AI exam draft in database.
 */
export const saveAiExam = asyncWrapper(async (req, res, next) => {
  const { id, title, sourceText, fileName, questions } = req.body
  const userRole = String(req.currentUser?.rule || req.currentUser?.role || '').toUpperCase()
  const createdBy =
    req.currentUser?.user_number ||
    String(req.currentUser?.user_id || req.currentUser?.id || '') ||
    'unknown'
  const isAdmin = userRole === 'ADMIN'

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return next(
      new AppError('Exam must contain at least one question to save.', 400, httpStatusText.FAIL)
    )
  }

  let exam
  if (id) {
    exam = await aiModel.updateAiExam(id, {
      title,
      sourceText,
      fileName,
      questions,
      createdBy,
      isAdmin,
    })
  } else {
    exam = await aiModel.createAiExam({ title, sourceText, fileName, questions, createdBy })
  }

  res.json({
    status: httpStatusText.SUCCESS,
    data: { exam },
  })
})

/**
 * GET /api/ai/saved
 * Get saved AI exams (Admin sees ALL, Teacher sees only their own).
 */
export const getSavedAiExams = asyncWrapper(async (req, res, next) => {
  const userRole = String(req.currentUser?.rule || req.currentUser?.role || '').toUpperCase()
  const createdBy = req.currentUser?.user_number || String(req.currentUser?.user_id) || 'unknown'

  let exams = []
  if (userRole === 'ADMIN') {
    exams = await aiModel.getAllAiExams()
  } else {
    exams = await aiModel.getAiExamsByUser(createdBy)
  }

  res.json({
    status: httpStatusText.SUCCESS,
    data: { exams },
  })
})

/**
 * GET /api/ai/saved/:id
 */
export const getSavedAiExamById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params
  const exam = await aiModel.getAiExamById(id)

  if (!exam) {
    return next(new AppError('Saved AI exam not found.', 404, httpStatusText.FAIL))
  }

  res.json({
    status: httpStatusText.SUCCESS,
    data: { exam },
  })
})

/**
 * PUT /api/ai/saved/:id
 */
export const updateSavedAiExam = asyncWrapper(async (req, res, next) => {
  const { id } = req.params
  const { title, sourceText, fileName, questions } = req.body
  const userRole = String(req.currentUser?.rule || req.currentUser?.role || '').toUpperCase()
  const createdBy = req.currentUser?.user_number || String(req.currentUser?.user_id) || 'unknown'
  const isAdmin = userRole === 'ADMIN'

  const exam = await aiModel.updateAiExam(id, {
    title,
    sourceText,
    fileName,
    questions,
    createdBy,
    isAdmin,
  })
  if (!exam) {
    return next(new AppError('Saved AI exam not found or unauthorized.', 404, httpStatusText.FAIL))
  }

  res.json({
    status: httpStatusText.SUCCESS,
    data: { exam },
  })
})

/**
 * DELETE /api/ai/saved/:id
 */
export const deleteSavedAiExam = asyncWrapper(async (req, res, next) => {
  const { id } = req.params
  const userRole = String(req.currentUser?.rule || req.currentUser?.role || '').toUpperCase()
  const createdBy = req.currentUser?.user_number || String(req.currentUser?.user_id) || 'unknown'
  const isAdmin = userRole === 'ADMIN'

  const deleted = await aiModel.deleteAiExam(id, createdBy, isAdmin)
  if (!deleted) {
    return next(new AppError('Saved AI exam not found or unauthorized.', 404, httpStatusText.FAIL))
  }

  res.json({
    status: httpStatusText.SUCCESS,
    message: 'Saved AI exam deleted successfully',
  })
})
