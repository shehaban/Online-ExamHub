import AppError from '../utils/AppError.js'
import { normalizeRole } from '../utils/userRoles.js'

const allowedTo = (...roles) => {
  return (req, res, next) => {
    const userRole = normalizeRole(req.currentUser.rule)
    const allowed = roles.map((r) => r.toUpperCase())
    if (!allowed.includes(userRole)) {
      return next(new AppError('this role is not authorized! ', 401))
    }
    next()
  }
}

export default allowedTo
