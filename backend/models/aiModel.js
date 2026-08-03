import db from '../config/db.js'

export const ensureAiTables = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ai_exams (
        ai_exam_id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        source_text LONGTEXT NULL,
        file_name VARCHAR(255) NULL,
        questions JSON NOT NULL,
        created_by VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ai_exams_creator (created_by)
      )
    `)
  } catch (error) {
    console.error('Error ensuring ai_exams table:', error.message)
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ai_generation_jobs (
        job_id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        type ENUM('generate', 'refine') DEFAULT 'generate',
        status ENUM('pending', 'generating', 'completed', 'failed') DEFAULT 'pending',
        progress INT DEFAULT 0,
        title VARCHAR(255) DEFAULT '',
        questions JSON NULL,
        error TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ai_jobs_user (user_id)
      )
    `)
  } catch (error) {
    console.error('Error ensuring ai_generation_jobs table:', error.message)
  }
}

const normalizeAiExamRow = (row) => ({
  ...row,
  ai_exam_id: row.ai_exam_id,
  id: row.ai_exam_id,
  title: row.title,
  sourceText: row.source_text,
  fileName: row.file_name,
  questions: typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const normalizeJobRow = (row) => ({
  ...row,
  jobId: row.job_id,
  userId: row.user_id,
  type: row.type,
  status: row.status,
  progress: row.progress,
  title: row.title,
  questions: row.questions
    ? typeof row.questions === 'string'
      ? JSON.parse(row.questions)
      : row.questions
    : null,
  error: row.error,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

// ─── AI EXAMS (SAVED DRAFTS) ──────────────────────────────────────────────────

export const createAiExam = async ({ title, sourceText, fileName, questions, createdBy }) => {
  await ensureAiTables()
  const [result] = await db.query(
    'INSERT INTO ai_exams (title, source_text, file_name, questions, created_by) VALUES (?, ?, ?, ?, ?)',
    [
      title || 'Untitled AI Exam',
      sourceText || null,
      fileName || null,
      JSON.stringify(questions || []),
      createdBy,
    ]
  )
  return getAiExamById(result.insertId)
}

export const getAllAiExams = async () => {
  await ensureAiTables()
  const [rows] = await db.query('SELECT * FROM ai_exams ORDER BY updated_at DESC')
  return rows.map(normalizeAiExamRow)
}

export const getAiExamsByUser = async (createdBy) => {
  await ensureAiTables()
  const [rows] = await db.query(
    'SELECT * FROM ai_exams WHERE created_by = ? ORDER BY updated_at DESC',
    [createdBy]
  )
  return rows.map(normalizeAiExamRow)
}

export const getAiExamById = async (id) => {
  await ensureAiTables()
  const [rows] = await db.query('SELECT * FROM ai_exams WHERE ai_exam_id = ?', [id])
  if (!rows[0]) return null
  return normalizeAiExamRow(rows[0])
}

export const updateAiExam = async (
  id,
  { title, sourceText, fileName, questions, createdBy, isAdmin }
) => {
  await ensureAiTables()
  const existing = await getAiExamById(id)
  if (!existing) return null

  if (isAdmin) {
    await db.query(
      'UPDATE ai_exams SET title = ?, source_text = ?, file_name = ?, questions = ? WHERE ai_exam_id = ?',
      [
        title ?? existing.title,
        sourceText ?? existing.sourceText,
        fileName ?? existing.fileName,
        questions ? JSON.stringify(questions) : JSON.stringify(existing.questions),
        id,
      ]
    )
  } else {
    await db.query(
      'UPDATE ai_exams SET title = ?, source_text = ?, file_name = ?, questions = ? WHERE ai_exam_id = ? AND created_by = ?',
      [
        title ?? existing.title,
        sourceText ?? existing.sourceText,
        fileName ?? existing.fileName,
        questions ? JSON.stringify(questions) : JSON.stringify(existing.questions),
        id,
        createdBy,
      ]
    )
  }
  return getAiExamById(id)
}

export const deleteAiExam = async (id, createdBy, isAdmin) => {
  await ensureAiTables()
  let result
  if (isAdmin) {
    ;[result] = await db.query('DELETE FROM ai_exams WHERE ai_exam_id = ?', [id])
  } else {
    ;[result] = await db.query('DELETE FROM ai_exams WHERE ai_exam_id = ? AND created_by = ?', [
      id,
      createdBy,
    ])
  }
  return result.affectedRows > 0
}

// ─── AI JOBS (CROSS-PAGE PROGRESS TRACKING) ───────────────────────────────────

export const createAiJob = async ({ jobId, userId, type, title }) => {
  await ensureAiTables()
  await db.query(
    'INSERT INTO ai_generation_jobs (job_id, user_id, type, status, progress, title) VALUES (?, ?, ?, ?, ?, ?)',
    [jobId, userId, type || 'generate', 'generating', 10, title || 'Generating Exam']
  )
  return getAiJobById(jobId)
}

export const updateAiJobProgress = async (jobId, { status, progress, questions, error }) => {
  await ensureAiTables()
  const updates = []
  const params = []

  if (status !== undefined) {
    updates.push('status = ?')
    params.push(status)
  }
  if (progress !== undefined) {
    updates.push('progress = ?')
    params.push(progress)
  }
  if (questions !== undefined) {
    updates.push('questions = ?')
    params.push(questions ? JSON.stringify(questions) : null)
  }
  if (error !== undefined) {
    updates.push('error = ?')
    params.push(error)
  }

  if (updates.length === 0) return getAiJobById(jobId)

  params.push(jobId)
  await db.query(`UPDATE ai_generation_jobs SET ${updates.join(', ')} WHERE job_id = ?`, params)
  return getAiJobById(jobId)
}

export const getAiJobById = async (jobId) => {
  await ensureAiTables()
  const [rows] = await db.query('SELECT * FROM ai_generation_jobs WHERE job_id = ?', [jobId])
  if (!rows[0]) return null
  return normalizeJobRow(rows[0])
}

export const getActiveAiJobsByUser = async (userId) => {
  await ensureAiTables()
  const [rows] = await db.query(
    'SELECT * FROM ai_generation_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
    [userId]
  )
  return rows.map(normalizeJobRow)
}
