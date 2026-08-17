import express from 'express'
import * as examController from '../controller/examController.js'
import verifyToken from '../middleware/verifyToken.js'
import allowedTo from '../middleware/allowedTo.js'
import { userRoles } from '../utils/userRoles.js'

const router = express.Router()

router
  .route('/')
  .get(verifyToken, examController.getExams)
  .post(verifyToken, allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN), examController.createExam)

router
  .route('/:code')
  .get(verifyToken, examController.getSingleExam)
  .put(verifyToken, allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN), examController.updateExam)
  .delete(verifyToken, allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN), examController.deleteExam)

// Exam participation
router.post('/:code/join', verifyToken, examController.joinExam)
router.post('/:code/submit', verifyToken, examController.submitExamResult)
router.get('/:code/my-submission', verifyToken, examController.getMySubmission)
router.get('/:code/participants', verifyToken, examController.getParticipants)
router.delete('/:code/participants/:userId', verifyToken, examController.kickExamParticipant)

// Exam settings
router.get('/:code/settings', verifyToken, examController.getSettings)
router.patch(
  '/:code/settings',
  verifyToken,
  allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
  examController.updateSettings
)

// Anti-cheating endpoints
router.post('/:code/cheating-alert', verifyToken, examController.logCheatingAlert)
router.get(
  '/:code/cheating-alerts',
  verifyToken,
  allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
  examController.getCheatingAlerts
)
router.delete(
  '/:code/cheating-alerts/:userId',
  verifyToken,
  allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
  examController.clearCheatingAlerts
)

export default router
