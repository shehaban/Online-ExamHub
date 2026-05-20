import express from 'express'
import * as adminController from '../controller/adminController.js'
import * as userController from '../controller/userController.js'
import { userRoles } from '../utils/userRoles.js'
import verifyToken from '../middleware/verifyToken.js'
import allowedTo from '../middleware/allowedTo.js'

const router = express.Router()

router.route('/').get(verifyToken, allowedTo(userRoles.ADMIN), adminController.fetchAllAdmins)
router
  .route('/create-admin')
  .post(verifyToken, allowedTo(userRoles.ADMIN), adminController.createAdmin)
router.route('/login').post(userController.login)
router
  .route('/search/:query')
  .get(verifyToken, allowedTo(userRoles.ADMIN), userController.unifiedSearch)
router
  .route('/update-user/:user_number')
  .patch(verifyToken, allowedTo(userRoles.ADMIN), adminController.editUser)
router
  .route('/delete/:user_number')
  .delete(verifyToken, allowedTo(userRoles.ADMIN), adminController.deleteUser)

export default router
