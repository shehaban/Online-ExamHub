import { asyncWrapper } from '../middleware/asyncWrapper.js'
import AppError from '../utils/AppError.js'
import httpStatusText from '../utils/httpStatusText.js'
import bcrypt from 'bcrypt'
import {
  getAllAdmins,
  createAdmin as createAdminModel,
  getAdminByNumber,
  editUsers,
  deleteUserByNumber,
} from '../models/adminModel.js'
import { getUserByNumber } from '../models/userModel.js'

export const fetchAllAdmins = asyncWrapper(async (req, res) => {
  const admins = await getAllAdmins()
  return res.status(200).json({ status: httpStatusText.SUCCESS, data: { admins } })
})

export const createAdmin = asyncWrapper(async (req, res) => {
  const { name, password, user_number, rule } = req.body
  const hashedPassword = await bcrypt.hash(password, 10)
  const newAdmin = await createAdminModel({
    name,
    password: hashedPassword,
    user_number,
    rule: rule || 'ADMIN',
  })
  return res.status(201).json({ status: httpStatusText.SUCCESS, data: { newAdmin } })
})

export const fetchAdminByNumber = asyncWrapper(async (req, res, next) => {
  const { admin_number } = req.params
  const admin = await getAdminByNumber(admin_number)
  if (!admin) {
    const error = new AppError('not found admin!', 404, httpStatusText.ERROR)
    return next(error)
  }
  return res.status(200).json({ status: httpStatusText.SUCCESS, data: { admin } })
})

export const editUser = asyncWrapper(async (req, res, next) => {
  const { user_number } = req.params

  let user = await getAdminByNumber(user_number)
  if (!user) {
    user = await getUserByNumber(user_number)
  }

  if (!user) {
    const error = new AppError('not found any user!', 404, httpStatusText.FAIL)
    return next(error)
  }

  const updatedData = { ...user, ...req.body }

  if (req.body.password) {
    updatedData.password = await bcrypt.hash(req.body.password, 10)
  } else {
    updatedData.password = user.password
  }

  const result = await editUsers(updatedData, user_number)

  return res.status(200).json({ status: httpStatusText.SUCCESS, data: { updatedUser: result } })
})

export const deleteUser = asyncWrapper(async (req, res, next) => {
  const { user_number } = req.params

  let user = await getUserByNumber(user_number)
  if (!user) {
    user = await getAdminByNumber(user_number)
    if (!user) {
      const error = new AppError('not found any user! ', 404, httpStatusText.ERROR)
      return next(error)
    }
  }
  const result = await deleteUserByNumber(user_number)
  return res
    .status(200)
    .json({ status: httpStatusText.SUCCESS, data: { result: result, deletedUser: user } })
})
