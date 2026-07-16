import { asyncWrapper } from '../middleware/asyncWrapper.js'
import {
  getAllUsers,
  createUser,
  getUsersByName,
  getUserByNumber,
  getUserByEmail,
  searchUsersByNamePartial,
  updateUserProfileByNumber,
} from '../models/userModel.js'
import {
  getAdminByName,
  getAdminByNumber,
  searchAdminsByNamePartial,
  updateAdminProfileByNumber,
} from '../models/adminModel.js'
import AppError from '../utils/AppError.js'
import generateJWT from '../utils/generateJWT.js'
import httpStatusText from '../utils/httpStatusText.js'
import bcrypt from 'bcrypt'
import db from '../config/db.js' // added db import here for reset password function

import sendEmail from '../utils/sendEmail.js' // for sending verification code email in forgot password function
import passwordResetTemplate from '../utils/passwordResetTemplate.js' // added a template for password reset email

import { createResetCode, getResetCode, deleteResetCode } from '../models/passwordResetModel.js'

export const fetchAllUsers = asyncWrapper(async (req, res) => {
  const users = await getAllUsers()
  return res.status(200).json({ status: httpStatusText.SUCCESS, data: { users } })
})

export const fetchUserByName = asyncWrapper(async (req, res, next) => {
  const { username } = req.params
  const user = await getUsersByName(username)
  if (!user) {
    const error = new AppError('not found user!', 404, httpStatusText.ERROR)
    return next(error)
  }
  return res.status(200).json({ status: httpStatusText.SUCCESS, data: { user } })
})

export const register = asyncWrapper(async (req, res, next) => {
  const { user_number, name, password, rule, email } = req.body // added email here
  const oldUser = await getUserByNumber(user_number)
  if (oldUser) {
    const error = new AppError('this user already exists', 400, httpStatusText.FAIL)
    return next(error)
  }

  // added check for existing email to prevent duplicate registrations with the same email address
  const existingEmail = await getUserByEmail(email)
  if (existingEmail) {
    return next(new AppError('This email is already registered', 400, httpStatusText.ERROR))
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const newUser = await createUser({
    user_number,
    name,
    password: hashedPassword,
    rule: rule || 'STUDENT',
    email, // added email here
  })

  const token = await generateJWT({
    user_number: newUser.user_number,
    name: newUser.name,
    id: newUser.id || newUser.user_id || newUser.admin_id,
    rule: newUser.rule,
  })
  newUser.token = token

  res.status(201).json({ status: httpStatusText.SUCCESS, data: { newUser } })
})

export const login = asyncWrapper(async (req, res, next) => {
  const { user_number, name, password } = req.body
  if (!password || (!user_number && !name)) {
    const error = new AppError(
      'Password and either user_number or name should be valid!',
      400,
      httpStatusText.ERROR
    )
    return next(error)
  }

  let user = null
  let role = null

  // 1. Check if it's an admin
  if (name || user_number) {
    const admin = name ? await getAdminByName(name) : await getAdminByNumber(user_number)
    if (admin) {
      const matchedPassword = await bcrypt.compare(password, admin.password)
      if (matchedPassword) {
        user = admin
        role = admin.rule || 'ADMIN'
      }
    }
  }

  // 2. If not an admin, check if it's a student or teacher (search by user_number)
  if (!user && user_number) {
    const dbUser = await getUserByNumber(user_number)
    if (dbUser) {
      const matchedPassword = await bcrypt.compare(password, dbUser.password)
      if (matchedPassword) {
        // If name is also provided, verify it matches (optional but safer)
        if (name && dbUser.name !== name) {
          const error = new AppError(
            'Name does not match the user number',
            401,
            httpStatusText.ERROR
          )
          return next(error)
        }
        user = dbUser
        role = dbUser.rule // STUDENT or TEACHER
      }
    }
  }

  if (user && role) {
    const token = await generateJWT({
      user_number: user.user_number,
      name: user.name,
      id: user.id || user.user_id || user.admin_id,
      rule: role,
    })

    // Return user info along with token (excluding password)
    const { password: _, ...userInfo } = user
    return res.status(200).json({
      status: httpStatusText.SUCCESS,
      data: {
        token,
        user: {
          ...userInfo,
          rule: role,
          id: user.id || user.user_id || user.admin_id,
        },
      },
    })
  } else {
    const error = new AppError('Incorrect credentials', 401, httpStatusText.ERROR)
    return next(error)
  }
})

// added forgot password and reset password functions for password reset functionality
export const forgotPassword = asyncWrapper(async (req, res, next) => {
  const { email } = req.body

  const user = await getUserByEmail(email)

  if (!user) {
    const error = new AppError('Email not found', 404, httpStatusText.ERROR)

    return next(error)
  }

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

  await createResetCode(user.user_id, verificationCode)

  await sendEmail(
    email,

    'ExamHub Password Reset',

    passwordResetTemplate(
      user.name,

      verificationCode
    )
  )

  return res.status(200).json({
    status: httpStatusText.SUCCESS,

    message: 'Verification code sent successfully',
  })
})

// added forgot password and reset password functions for password reset functionality here

export const resetPassword = asyncWrapper(async (req, res, next) => {
  const { code, password } = req.body

  const resetData = await getResetCode(code)

  if (!resetData) {
    const error = new AppError('Invalid verification code', 400, httpStatusText.ERROR)

    return next(error)
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  //const db = (await import('../config/db.js')).default

  await db.query('UPDATE users SET password = ? WHERE user_id = ?', [
    hashedPassword,
    resetData.user_id,
  ])

  await deleteResetCode(code)

  return res.status(200).json({
    status: httpStatusText.SUCCESS,

    message: 'Password updated successfully',
  })
})

export const unifiedSearch = asyncWrapper(async (req, res, next) => {
  const { query } = req.params
  const isNumeric = /^\d+$/.test(query)

  let results = []

  if (isNumeric) {
    // 1. Search by user_number in both tables
    const user = await getUserByNumber(query)
    const admin = await getAdminByNumber(query)

    if (user) results.push({ ...user, source: 'users' })
    if (admin) results.push({ ...admin, source: 'admins' })
  } else {
    // 2. Search by name (partial match) in both tables
    const users = await searchUsersByNamePartial(query)
    const admins = await searchAdminsByNamePartial(query)

    results = [
      ...users.map((u) => ({ ...u, source: 'users' })),
      ...admins.map((a) => ({ ...a, source: 'admins' })),
    ]
  }

  if (results.length === 0) {
    const error = new AppError(
      'No users or admins found matching your search!',
      404,
      httpStatusText.ERROR
    )
    return next(error)
  }

  // Remove passwords from results before sending
  const safeResults = results.map(({ password, ...rest }) => rest)

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { results: safeResults },
  })
})

export const updateProfile = asyncWrapper(async (req, res, next) => {
  const { user_number, rule } = req.currentUser
  const { name, email, avatar, password } = req.body

  const updateData = {}
  if (name !== undefined) updateData.name = name
  if (email !== undefined) {
    const trimmedEmail = email.trim()
    if (trimmedEmail !== '') {
      const existingUser = await getUserByEmail(trimmedEmail)
      if (existingUser && existingUser.user_number !== user_number) {
        return next(new AppError('This email is already registered', 400, httpStatusText.FAIL))
      }
    }
    updateData.email = trimmedEmail === '' ? null : trimmedEmail
  }
  if (avatar !== undefined) updateData.avatar = avatar
  if (password !== undefined && password !== '') {
    updateData.password = await bcrypt.hash(password, 10)
  }

  let success = false
  if (rule === 'ADMIN') {
    success = await updateAdminProfileByNumber(user_number, updateData)
  } else {
    success = await updateUserProfileByNumber(user_number, updateData)
  }

  if (!success) {
    return next(new AppError('Profile update failed', 400, httpStatusText.FAIL))
  }

  let updatedUser = null
  if (rule === 'ADMIN') {
    updatedUser = await getAdminByNumber(user_number)
  } else {
    updatedUser = await getUserByNumber(user_number)
  }

  if (!updatedUser) {
    return next(new AppError('User not found', 404, httpStatusText.FAIL))
  }

  const { password: _, ...userInfo } = updatedUser

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: {
      user: {
        ...userInfo,
        rule,
        id: updatedUser.id || updatedUser.user_id || updatedUser.admin_id,
      },
    },
  })
})

export const getDashboardStats = asyncWrapper(async (req, res, next) => {
  const { id: currentUserId, user_number, rule } = req.currentUser
  const { studentId } = req.query

  if (studentId && rule === 'ADMIN') {
    const [[user]] = await db.query(`SELECT name, user_number FROM users WHERE user_id = ?`, [
      studentId,
    ])
    if (!user) {
      return next(new AppError('Student not found', 404, httpStatusText.FAIL))
    }
    const [submissions] = await db.query(
      `SELECT es.exam_code, es.score, es.total, es.joined_at, es.finished_at, e.title
       FROM exam_submissions es
       JOIN exams e ON es.exam_code = e.code
       WHERE es.user_id = ? AND es.finished_at IS NOT NULL
       ORDER BY es.finished_at ASC`,
      [studentId]
    )

    const totalExams = submissions.length
    const avgScore =
      totalExams > 0
        ? submissions.reduce((acc, curr) => acc + (curr.score / curr.total) * 100, 0) / totalExams
        : 0

    return res.status(200).json({
      status: httpStatusText.SUCCESS,
      data: {
        role: 'student',
        studentName: user.name,
        studentNumber: user.user_number,
        stats: {
          totalExams,
          avgScore: Math.round(avgScore * 10) / 10,
        },
        submissions,
      },
    })
  }

  if (rule === 'STUDENT') {
    const [submissions] = await db.query(
      `SELECT es.exam_code, es.score, es.total, es.joined_at, es.finished_at, e.title
       FROM exam_submissions es
       JOIN exams e ON es.exam_code = e.code
       WHERE es.user_id = ? AND es.finished_at IS NOT NULL
       ORDER BY es.finished_at ASC`,
      [currentUserId]
    )

    const totalExams = submissions.length
    const avgScore =
      totalExams > 0
        ? submissions.reduce((acc, curr) => acc + (curr.score / curr.total) * 100, 0) / totalExams
        : 0

    return res.status(200).json({
      status: httpStatusText.SUCCESS,
      data: {
        role: 'student',
        stats: {
          totalExams,
          avgScore: Math.round(avgScore * 10) / 10,
        },
        submissions,
      },
    })
  }

  if (rule === 'TEACHER' || rule === 'INSTRUCTOR') {
    const [exams] = await db.query(
      `SELECT e.exam_id, e.code, e.title, e.created_at
       FROM exams e
       WHERE e.created_by = ?
       ORDER BY e.created_at DESC`,
      [user_number]
    )

    const examCodes = exams.map((e) => e.code)
    let submissions = []
    if (examCodes.length > 0) {
      const [rows] = await db.query(
        `SELECT exam_code, score, total, finished_at 
         FROM exam_submissions 
         WHERE exam_code IN (?) AND finished_at IS NOT NULL`,
        [examCodes]
      )
      submissions = rows
    }

    const examsWithStats = exams.map((exam) => {
      const examSubs = submissions.filter((s) => s.exam_code === exam.code)
      const count = examSubs.length
      const avg =
        count > 0
          ? examSubs.reduce((acc, curr) => acc + (curr.score / curr.total) * 100, 0) / count
          : 0
      const max = count > 0 ? Math.max(...examSubs.map((s) => (s.score / s.total) * 100)) : 0

      return {
        ...exam,
        participant_count: count,
        avg_score: Math.round(avg * 10) / 10,
        max_score: Math.round(max * 10) / 10,
      }
    })

    const totalCreated = exams.length
    const totalParticipants = submissions.length
    const overallAvg =
      totalParticipants > 0
        ? submissions.reduce((acc, curr) => acc + (curr.score / curr.total) * 100, 0) /
          totalParticipants
        : 0

    return res.status(200).json({
      status: httpStatusText.SUCCESS,
      data: {
        role: 'instructor',
        stats: {
          totalExams: totalCreated,
          totalParticipants,
          avgScore: Math.round(overallAvg * 10) / 10,
        },
        exams: examsWithStats,
      },
    })
  }

  if (rule === 'ADMIN') {
    const [[{ count: studentCount }]] = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE rule = 'STUDENT'"
    )
    const [[{ count: teacherCount }]] = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE rule = 'TEACHER'"
    )
    const [[{ count: adminCount }]] = await db.query('SELECT COUNT(*) as count FROM admins')
    const [[{ count: examCount }]] = await db.query('SELECT COUNT(*) as count FROM exams')
    const [[{ count: roomCount }]] = await db.query('SELECT COUNT(*) as count FROM rooms')
    const [[{ count: submissionCount }]] = await db.query(
      'SELECT COUNT(*) as count FROM exam_submissions WHERE finished_at IS NOT NULL'
    )
    const [[{ avg: overallAvg }]] = await db.query(
      'SELECT AVG(score / total * 100) as avg FROM exam_submissions WHERE finished_at IS NOT NULL'
    )

    const [recentSubmissions] = await db.query(
      `SELECT es.exam_code, es.user_name, es.user_number, es.score, es.total, es.finished_at, e.title
       FROM exam_submissions es
       JOIN exams e ON es.exam_code = e.code
       WHERE es.finished_at IS NOT NULL
       ORDER BY es.finished_at DESC
       LIMIT 10`
    )

    const [usersList] = await db.query(
      `SELECT user_id as id, name, user_number, rule as role, email, avatar, created_at, 'user' as type FROM users
       UNION ALL
       SELECT admin_id as id, name, user_number, 'ADMIN' as role, email, avatar, created_at, 'admin' as type FROM admins
       ORDER BY created_at DESC`
    )

    return res.status(200).json({
      status: httpStatusText.SUCCESS,
      data: {
        role: 'admin',
        stats: {
          studentCount,
          teacherCount,
          adminCount,
          examCount,
          roomCount,
          submissionCount,
          overallAvg: overallAvg ? Math.round(overallAvg * 10) / 10 : 0,
        },
        recentSubmissions,
        users: usersList,
      },
    })
  }

  return next(new AppError('Unauthorized role', 403, httpStatusText.FAIL))
})

export const getPublicStats = asyncWrapper(async (req, res, next) => {
  const [[{ count: studentCount }]] = await db.query(
    "SELECT COUNT(*) as count FROM users WHERE rule = 'STUDENT'"
  )
  const [[{ count: teacherCount }]] = await db.query(
    "SELECT COUNT(*) as count FROM users WHERE rule = 'TEACHER'"
  )
  const [[{ count: examCount }]] = await db.query('SELECT COUNT(*) as count FROM exams')
  const [[{ count: submissionCount }]] = await db.query(
    'SELECT COUNT(*) as count FROM exam_submissions WHERE finished_at IS NOT NULL'
  )

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: {
      studentCount: studentCount || 0,
      teacherCount: teacherCount || 0,
      examCount: examCount || 0,
      submissionCount: submissionCount || 0,
    },
  })
})

export const getSystemSettings = asyncWrapper(async (req, res, next) => {
  const [rows] = await db.query('SELECT setting_key, setting_value FROM system_settings')
  const settings = {}
  rows.forEach((r) => {
    settings[r.setting_key] = r.setting_value
  })
  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { settings },
  })
})

export const updateSystemSettings = asyncWrapper(async (req, res, next) => {
  const settings = req.body
  for (const [key, value] of Object.entries(settings)) {
    await db.query(
      'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      [key, String(value), String(value)]
    )
  }
  res.status(200).json({
    status: httpStatusText.SUCCESS,
    message: 'System settings updated successfully',
  })
})
