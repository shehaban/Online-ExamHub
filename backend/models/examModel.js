import db from '../config/db.js'

const ensureScheduleColumns = async () => {
  try {
    await db.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS start_at DATETIME NULL')
    await db.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS end_at DATETIME NULL')
  } catch (error) {
    // Ignore schema errors for environments where the table is already aligned.
  }
}

const ensureExamSubmissionsTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS exam_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exam_code VARCHAR(50) NOT NULL,
        user_id INT NOT NULL,
        user_number VARCHAR(50),
        user_name VARCHAR(100),
        score FLOAT DEFAULT 0,
        total FLOAT DEFAULT 0,
        answers JSON,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME NULL,
        INDEX idx_exam_sub_code (exam_code),
        INDEX idx_exam_sub_user (user_id)
      )
    `)
  } catch (error) {
    // Table may already exist.
  }
}

const ensureExamSettingsTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS exam_settings (
        exam_code VARCHAR(50) PRIMARY KEY,
        capacity INT NULL,
        is_locked TINYINT DEFAULT 0
      )
    `)
  } catch (error) {
    // Table may already exist.
  }
}

const formatDbDateTime = (date) => {
  if (!date) return null
  if (typeof date === 'string') return date
  if (!(date instanceof Date)) return date
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const normalizeExamRow = (row) => ({
  ...row,
  questions: typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions,
  startAt: formatDbDateTime(row.start_at),
  endAt: formatDbDateTime(row.end_at),
})

export const createExam = async ({ code, title, questions, created_by, startAt, endAt }) => {
  await ensureScheduleColumns()
  const [result] = await db.query(
    'INSERT INTO exams (code, title, questions, created_by, start_at, end_at) VALUES (?, ?, ?, ?, ?, ?)',
    [
      code.trim().toUpperCase(),
      title,
      JSON.stringify(questions),
      created_by,
      startAt || null,
      endAt || null,
    ]
  )
  return {
    exam_id: result.insertId,
    code,
    title,
    questions,
    created_by,
    startAt: startAt || null,
    endAt: endAt || null,
  }
}

export const getExamByCode = async (code) => {
  await ensureScheduleColumns()
  const [rows] = await db.query('SELECT * FROM exams WHERE UPPER(TRIM(code)) = ?', [
    code.trim().toUpperCase(),
  ])
  if (!rows[0]) return null
  return normalizeExamRow(rows[0])
}

export const getAllExams = async () => {
  await ensureScheduleColumns()
  const [rows] = await db.query('SELECT * FROM exams ORDER BY created_at DESC')
  return rows.map(normalizeExamRow)
}

export const getExamsByCreator = async (createdBy) => {
  await ensureScheduleColumns()
  const [rows] = await db.query(
    'SELECT * FROM exams WHERE created_by = ? ORDER BY created_at DESC',
    [createdBy]
  )
  return rows.map(normalizeExamRow)
}

export const updateExam = async (code, { title, questions, startAt, endAt }) => {
  await ensureScheduleColumns()
  const existing = await getExamByCode(code)
  const [result] = await db.query(
    'UPDATE exams SET title = ?, questions = ?, start_at = ?, end_at = ? WHERE UPPER(TRIM(code)) = ?',
    [
      title,
      JSON.stringify(questions),
      startAt ?? existing?.startAt ?? null,
      endAt ?? existing?.endAt ?? null,
      code.trim().toUpperCase(),
    ]
  )
  return result.affectedRows > 0
}

export const deleteExam = async (code) => {
  const [result] = await db.query('DELETE FROM exams WHERE UPPER(TRIM(code)) = ?', [
    code.trim().toUpperCase(),
  ])
  return result.affectedRows > 0
}

// ─── EXAM SUBMISSIONS & PARTICIPANTS ────────────────────────────────────────

export const recordJoin = async (examCode, userId, userNumber, userName) => {
  await ensureExamSubmissionsTable()
  const code = examCode.trim().toUpperCase()
  // Upsert: if already joined, update the joined_at only if not already set
  const [rows] = await db.query(
    'SELECT id FROM exam_submissions WHERE exam_code = ? AND user_id = ?',
    [code, userId]
  )
  if (rows.length === 0) {
    let resolvedName = userName
    if (!resolvedName) {
      const [userRows] = await db.query('SELECT name FROM users WHERE user_number = ?', [
        userNumber,
      ])
      resolvedName = userRows[0]?.name || 'Unknown'
    }
    await db.query(
      'INSERT INTO exam_submissions (exam_code, user_id, user_number, user_name, joined_at) VALUES (?, ?, ?, ?, NOW())',
      [code, userId, userNumber, resolvedName]
    )
  }
  return true
}

export const recordSubmission = async (
  examCode,
  userId,
  userNumber,
  userName,
  score,
  total,
  answers
) => {
  await ensureExamSubmissionsTable()
  const code = examCode.trim().toUpperCase()
  const [rows] = await db.query(
    'SELECT id, finished_at FROM exam_submissions WHERE exam_code = ? AND user_id = ?',
    [code, userId]
  )
  let resolvedName = userName
  if (!resolvedName) {
    const [userRows] = await db.query('SELECT name FROM users WHERE user_number = ?', [userNumber])
    resolvedName = userRows[0]?.name || 'Unknown'
  }
  if (rows.length > 0) {
    if (rows[0].finished_at) {
      throw new Error('You have already submitted this exam')
    }
    await db.query(
      'UPDATE exam_submissions SET score = ?, total = ?, answers = ?, finished_at = NOW(), user_number = ?, user_name = ? WHERE exam_code = ? AND user_id = ?',
      [score, total, JSON.stringify(answers), userNumber, resolvedName, code, userId]
    )
  } else {
    await db.query(
      'INSERT INTO exam_submissions (exam_code, user_id, user_number, user_name, score, total, answers, joined_at, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [code, userId, userNumber, resolvedName, score, total, JSON.stringify(answers)]
    )
  }
  return true
}

export const getSubmissions = async (examCode) => {
  await ensureExamSubmissionsTable()
  const code = examCode.trim().toUpperCase()
  const [rows] = await db.query(
    'SELECT * FROM exam_submissions WHERE exam_code = ? ORDER BY score DESC, finished_at ASC',
    [code]
  )
  return rows.map((r) => ({
    ...r,
    answers: typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers,
  }))
}

export const getSubmissionByUser = async (examCode, userId) => {
  await ensureExamSubmissionsTable()
  const code = examCode.trim().toUpperCase()
  const [rows] = await db.query(
    'SELECT * FROM exam_submissions WHERE exam_code = ? AND user_id = ?',
    [code, userId]
  )
  if (rows.length === 0) return null
  return {
    ...rows[0],
    answers: typeof rows[0].answers === 'string' ? JSON.parse(rows[0].answers) : rows[0].answers,
  }
}

export const kickParticipant = async (examCode, userId) => {
  await ensureExamSubmissionsTable()
  const [result] = await db.query(
    'DELETE FROM exam_submissions WHERE exam_code = ? AND user_id = ?',
    [examCode.trim().toUpperCase(), userId]
  )
  return result.affectedRows > 0
}

// ─── EXAM SETTINGS ───────────────────────────────────────────────────────────

export const getExamSettings = async (examCode) => {
  await ensureExamSettingsTable()
  const code = examCode.trim().toUpperCase()
  const [rows] = await db.query('SELECT * FROM exam_settings WHERE exam_code = ?', [code])
  return rows[0] || { exam_code: code, capacity: null, is_locked: 0 }
}

export const updateExamSettings = async (examCode, { capacity, is_locked }) => {
  await ensureExamSettingsTable()
  const code = examCode.trim().toUpperCase()
  await db.query(
    `INSERT INTO exam_settings (exam_code, capacity, is_locked)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE capacity = VALUES(capacity), is_locked = VALUES(is_locked)`,
    [code, capacity !== undefined ? capacity : null, is_locked !== undefined ? is_locked : 0]
  )
  return getExamSettings(examCode)
}
