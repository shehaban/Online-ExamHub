import jwt from 'jsonwebtoken'
import AppError from '../utils/AppError.js'
import httpStatusText from '../utils/httpStatusText.js'

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['Authorization'] || req.headers['authorization']
  if (!authHeader) {
    const error = new AppError('token is required!', 401, httpStatusText.ERROR)
    return next(error)
  }
  const token = authHeader.split(' ')[1]
  try {
    const currentUser = jwt.verify(token, process.env.JWT_SECRET_KEY)
    req.currentUser = currentUser
    next()
  } catch (err) {
    const error = new AppError('expired token!', 401, httpStatusText.ERROR)
    return next(error)
  }
}

export default verifyToken
