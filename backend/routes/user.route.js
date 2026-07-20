import express from 'express'
import * as userController from '../controller/userController.js'
import { userRoles } from '../utils/userRoles.js'
import verifyToken from '../middleware/verifyToken.js'
import allowedTo from '../middleware/allowedTo.js'

const router = express.Router()

router.route('/').get(verifyToken, allowedTo(userRoles.ADMIN), userController.fetchAllUsers)

router.route('/register').post(userController.register)

router.route('/login').post(userController.login)

router.post('/forgot-password', userController.forgotPassword)

router.post('/reset-password', userController.resetPassword)

router.get('/public-stats', userController.getPublicStats)

router.patch('/profile', verifyToken, userController.updateProfile)

router.get('/dashboard', verifyToken, userController.getDashboardStats)

router.get('/settings', verifyToken, userController.getSystemSettings)
router.patch(
  '/settings',
  verifyToken,
  allowedTo(userRoles.ADMIN),
  userController.updateSystemSettings
)

export default router
