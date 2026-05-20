import { asyncWrapper } from '../middleware/asyncWrapper.js'
import {
  getAllUsers,
  createUser,
  getUsersByName,
  getUserByNumber,
  searchUsersByNamePartial,
} from '../models/userModel.js'
import {
  getAdminByName,
  getAdminByNumber,
  searchAdminsByNamePartial,
} from '../models/adminModel.js'
import AppError from '../utils/AppError.js'
import generateJWT from '../utils/generateJWT.js'
import httpStatusText from '../utils/httpStatusText.js'
import bcrypt from 'bcrypt'

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
  const { user_number, name, password, rule } = req.body
  const oldUser = await getUserByNumber(user_number)
  if (oldUser) {
    const error = new AppError('this user already exists', 400, httpStatusText.FAIL)
    return next(error)
  }
  const hashedPassword = await bcrypt.hash(password, 10)
  const newUser = await createUser({
    user_number,
    name,
    password: hashedPassword,
    rule: rule || 'STUDENT',
  })

  const token = await generateJWT({
    user_number: newUser.user_number,
    id: newUser.id,
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
      id: user.id,
      rule: role,
    })

    // Return user info along with token (excluding password)
    const { password: _, ...userInfo } = user
    return res.status(200).json({
      status: httpStatusText.SUCCESS,
      data: { token, user: { ...userInfo, rule: role } },
    })
  } else {
    const error = new AppError('Incorrect credentials', 401, httpStatusText.ERROR)
    return next(error)
  }
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
