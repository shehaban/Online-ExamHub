import * as examModel from '../models/examModel.js'
import AppError from '../utils/AppError.js'
import httpStatusText from '../utils/httpStatusText.js'
import asyncWrapper from '../middleware/asyncWrapper.js'
import { normalizeRole } from '../utils/userRoles.js'

export const getExams = asyncWrapper(async (req, res, next) => {
  const { creator } = req.query
  let exams
  if (creator) {
    exams = await examModel.getExamsByCreator(creator)
  } else {
    exams = await examModel.getAllExams()
  }
  res.json({ status: httpStatusText.SUCCESS, data: { exams } })
})

export const getSingleExam = asyncWrapper(async (req, res, next) => {
  const { code } = req.params
  const exam = await examModel.getExamByCode(code)
  if (!exam) {
    return next(new AppError('Exam not found', 404, httpStatusText.FAIL))
  }
  res.json({ status: httpStatusText.SUCCESS, data: { exam } })
})

export const createExam = asyncWrapper(async (req, res, next) => {
  const { code, title, questions, startAt, endAt } = req.body

  if (!code || !title || !questions) {
    return next(new AppError('code, title, and questions are required', 400, httpStatusText.FAIL))
  }

  const existing = await examModel.getExamByCode(code)
  if (existing) {
    return next(new AppError('Exam with this code already exists', 400, httpStatusText.FAIL))
  }

  const createdBy = req.currentUser?.user_number || 'unknown'

  const exam = await examModel.createExam({
    code,
    title,
    questions,
    created_by: createdBy,
    startAt,
    endAt,
  })

  res.status(201).json({ status: httpStatusText.SUCCESS, data: { exam } })
})

export const updateExam = asyncWrapper(async (req, res, next) => {
  const { code } = req.params
  const { title, questions, startAt, endAt } = req.body
  const { user_number: userNumber, rule } = req.currentUser

  const existing = await examModel.getExamByCode(code)
  if (!existing) {
    return next(new AppError('Exam not found', 404, httpStatusText.FAIL))
  }

  // Ownership check: only creator or admin may update
  const isOwner = String(existing.created_by) === String(userNumber)
  const isAdmin = normalizeRole(rule) === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return next(
      new AppError(
        'Only the exam creator or an admin can update this exam',
        403,
        httpStatusText.FAIL
      )
    )
  }

  const updated = await examModel.updateExam(code, {
    title: title || existing.title,
    questions: questions || existing.questions,
    startAt: startAt ?? existing.startAt ?? null,
    endAt: endAt ?? existing.endAt ?? null,
  })

  if (!updated) {
    return next(new AppError('Could not update exam', 500, httpStatusText.ERROR))
  }

  const newExam = await examModel.getExamByCode(code)
  res.json({ status: httpStatusText.SUCCESS, data: { exam: newExam } })
})

export const deleteExam = asyncWrapper(async (req, res, next) => {
  const { code } = req.params
  const { user_number: userNumber, rule } = req.currentUser

  const existing = await examModel.getExamByCode(code)
  if (!existing) {
    return next(new AppError('Exam not found', 404, httpStatusText.FAIL))
  }

  // Ownership check: only creator or admin may delete
  const isOwner = String(existing.created_by) === String(userNumber)
  const isAdmin = normalizeRole(rule) === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return next(
      new AppError(
        'Only the exam creator or an admin can delete this exam',
        403,
        httpStatusText.FAIL
      )
    )
  }

  await examModel.deleteExam(code)
  res.json({ status: httpStatusText.SUCCESS, data: null })
})

// ─── PARTICIPANTS / SUBMISSIONS ───────────────────────────────────────────────

/**
 * POST /api/exams/:code/join
 * Records a student joining an exam. Respects lock + capacity settings.
 */
export const joinExam = asyncWrapper(async (req, res, next) => {
  const { code } = req.params
  const { id: userId, user_number: userNumber, name: userName } = req.currentUser

  const exam = await examModel.getExamByCode(code)
  if (!exam) {
    return next(new AppError('Exam not found', 404, httpStatusText.FAIL))
  }

  // Check lock
  const settings = await examModel.getExamSettings(code)
  if (settings.is_locked) {
    return next(
      new AppError('This exam has been locked by the instructor', 403, httpStatusText.FAIL)
    )
  }

  // Check capacity
  if (settings.capacity) {
    const submissions = await examModel.getSubmissions(code)
    if (submissions.length >= settings.capacity) {
      return next(new AppError('This exam is full', 400, httpStatusText.FAIL))
    }
  }

  // Prevent rejoin if already submitted
  const existingSubmission = await examModel.getSubmissionByUser(code, userId)
  if (existingSubmission && existingSubmission.finished_at) {
    return next(new AppError('You have already completed this exam', 403, httpStatusText.FAIL))
  }

  await examModel.recordJoin(code, userId, userNumber, userName)
  res.json({ status: httpStatusText.SUCCESS, data: null })
})

/**
 * POST /api/exams/:code/submit
 * Records a student's exam submission with score.
 */
export const submitExamResult = asyncWrapper(async (req, res, next) => {
  const { code } = req.params
  const { id: userId, user_number: userNumber, name: userName } = req.currentUser
  const { score, total, answers } = req.body

  if (score === undefined || total === undefined) {
    return next(new AppError('score and total are required', 400, httpStatusText.FAIL))
  }

  try {
    await examModel.recordSubmission(
      code,
      userId,
      userNumber,
      userName,
      score,
      total,
      answers || {}
    )
    res.json({ status: httpStatusText.SUCCESS, data: null })
  } catch (err) {
    return next(new AppError(err.message, 400, httpStatusText.FAIL))
  }
})

/**
 * GET /api/exams/:code/my-submission
 * Returns the current user's submission for an exam.
 */
export const getMySubmission = asyncWrapper(async (req, res, next) => {
  const { code } = req.params
  const { id: userId } = req.currentUser

  const submission = await examModel.getSubmissionByUser(code, userId)
  res.json({ status: httpStatusText.SUCCESS, data: { submission } })
})

/**
 * GET /api/exams/:code/participants
 * Returns all participants. Instructor/admin only.
 */
export const getParticipants = asyncWrapper(async (req, res, next) => {
  const { code } = req.params
  const { user_number: userNumber, rule } = req.currentUser

  const exam = await examModel.getExamByCode(code)
  if (!exam) {
    return next(new AppError('Exam not found', 404, httpStatusText.FAIL))
  }

  const isOwner = String(exam.created_by) === String(userNumber)
  const isAdmin = normalizeRole(rule) === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return next(
      new AppError(
        'Only the exam creator or an admin can view participants',
        403,
        httpStatusText.FAIL
      )
    )
  }

  const participants = await examModel.getSubmissions(code)
  res.json({ status: httpStatusText.SUCCESS, data: { participants } })
})

/**
 * DELETE /api/exams/:code/participants/:userId
 * Kick a student from the exam. Instructor/admin only.
 */
export const kickExamParticipant = asyncWrapper(async (req, res, next) => {
  const { code, userId } = req.params
  const { user_number: userNumber, rule } = req.currentUser

  const exam = await examModel.getExamByCode(code)
  if (!exam) {
    return next(new AppError('Exam not found', 404, httpStatusText.FAIL))
  }

  const isOwner = String(exam.created_by) === String(userNumber)
  const isAdmin = normalizeRole(rule) === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return next(
      new AppError(
        'Only the exam creator or an admin can kick participants',
        403,
        httpStatusText.FAIL
      )
    )
  }

  await examModel.kickParticipant(code, userId)
  res.json({ status: httpStatusText.SUCCESS, message: 'Participant removed successfully' })
})

// ─── EXAM SETTINGS ────────────────────────────────────────────────────────────

/**
 * GET /api/exams/:code/settings
 * Returns exam settings (capacity, is_locked). Public so the exam taking page can check.
 */
export const getSettings = asyncWrapper(async (req, res, next) => {
  const { code } = req.params
  const settings = await examModel.getExamSettings(code)
  res.json({ status: httpStatusText.SUCCESS, data: { settings } })
})

/**
 * PATCH /api/exams/:code/settings
 * Update exam settings. Instructor/admin only.
 */
export const updateSettings = asyncWrapper(async (req, res, next) => {
  const { code } = req.params
  const { user_number: userNumber, rule } = req.currentUser
  const { capacity, is_locked } = req.body

  const exam = await examModel.getExamByCode(code)
  if (!exam) {
    return next(new AppError('Exam not found', 404, httpStatusText.FAIL))
  }

  const isOwner = String(exam.created_by) === String(userNumber)
  const isAdmin = normalizeRole(rule) === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return next(
      new AppError(
        'Only the exam creator or an admin can update settings',
        403,
        httpStatusText.FAIL
      )
    )
  }

  const updated = await examModel.updateExamSettings(code, {
    capacity: capacity !== undefined ? (capacity ? parseInt(capacity) : null) : undefined,
    is_locked: is_locked !== undefined ? (is_locked ? 1 : 0) : undefined,
  })

  res.json({ status: httpStatusText.SUCCESS, data: { settings: updated } })
})
