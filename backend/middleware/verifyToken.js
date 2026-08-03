import jwt from 'jsonwebtoken'
import AppError from '../utils/AppError.js'
import httpStatusText from '../utils/httpStatusText.js'

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['Authorization'] || req.headers['authorization']
  if (!authHeader) {
    const error = new AppError(
      'Authentication token is required. Please sign in.',
      401,
      httpStatusText.ERROR
    )
    return next(error)
  }
  const token = authHeader.split(' ')[1]
  if (!token) {
    const error = new AppError(
      'Authentication token is required. Please sign in.',
      401,
      httpStatusText.ERROR
    )
    return next(error)
  }
  try {
    const currentUser = jwt.verify(token, process.env.JWT_SECRET_KEY)
    req.currentUser = currentUser
    next()
  } catch (err) {
    const error = new AppError(
      'Your session has expired. Please sign in again.',
      401,
      httpStatusText.ERROR
    )
    return next(error)
  }
}

export default verifyToken
