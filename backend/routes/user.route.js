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

export default router
