import express from 'express'
import multer from 'multer'
import path from 'path'
import * as roomController from '../controller/roomController.js'
import { userRoles } from '../utils/userRoles.js'
import verifyToken from '../middleware/verifyToken.js'
import allowedTo from '../middleware/allowedTo.js'

const router = express.Router()

// ─── Multer config for file uploads ─────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, `${uniqueSuffix}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
})

// ─── Room CRUD ──────────────────────────────────────────────────────────────

// Create a room (instructor only)
router.route('/').post(verifyToken, allowedTo(userRoles.INSTRUCTOR), roomController.createNewRoom)

// List rooms (any authenticated user)
router.route('/').get(verifyToken, roomController.listRooms)

// Instructor's own rooms
router.route('/my-rooms').get(verifyToken, allowedTo(userRoles.INSTRUCTOR), roomController.myRooms)

// Single room details & Update settings
router
  .route('/:roomId')
  .get(verifyToken, roomController.getRoom)
  .patch(
    verifyToken,
    allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
    roomController.updateRoomSettings
  )
  .delete(verifyToken, allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN), roomController.removeRoom)

// ─── Join / Leave / Member Management ───────────────────────────────────────

router
  .route('/:roomId/join')
  .post(verifyToken, allowedTo(userRoles.STUDENT), roomController.joinRoom)

router
  .route('/:roomId/leave')
  .post(verifyToken, allowedTo(userRoles.STUDENT), roomController.leaveRoom)

router
  .route('/:roomId/members/:studentId')
  .delete(
    verifyToken,
    allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
    roomController.removeRoomMember
  )

// ─── Messages ───────────────────────────────────────────────────────────────

router
  .route('/:roomId/messages')
  .get(verifyToken, roomController.fetchMessages)
  .post(verifyToken, allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN), roomController.sendMessage)

router
  .route('/:roomId/messages/:messageId')
  .delete(
    verifyToken,
    allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
    roomController.removeMessage
  )

// ─── Files ──────────────────────────────────────────────────────────────────

router
  .route('/:roomId/files')
  .get(verifyToken, roomController.fetchFiles)
  .post(
    verifyToken,
    allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
    upload.single('file'),
    roomController.uploadFile
  )

router
  .route('/:roomId/files/:fileId')
  .delete(verifyToken, allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN), roomController.removeFile)

export default router
