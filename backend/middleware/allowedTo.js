import AppError from '../utils/AppError.js'

const allowedTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.currentUser.rule)) {
      return next(new AppError('this role is not authorized! ', 401))
    }
    next()
  }
}

export default allowedTo
