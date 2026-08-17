import express from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import * as aiController from '../controller/aiController.js'
import verifyToken from '../middleware/verifyToken.js'
import allowedTo from '../middleware/allowedTo.js'
import { userRoles } from '../utils/userRoles.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configure multer for temporary file uploads (AI processing)
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads', 'ai-temp'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.txt', '.doc', '.docx']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedExts.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Only PDF, TXT, DOC, and DOCX files are allowed.'))
    }
  },
})

const router = express.Router()

// Synchronous legacy endpoint
router.post(
  '/generate',
  verifyToken,
  allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
  upload.single('file'),
  aiController.generateQuestions
)

// Background generation & refinement jobs (Persistent Cross-Page Status)
router.post(
  '/jobs/generate',
  verifyToken,
  allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
  upload.single('file'),
  aiController.startGenerateJob
)

router.post(
  '/jobs/refine',
  verifyToken,
  allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
  aiController.startRefineJob
)

router.get(
  '/jobs/active',
  verifyToken,
  allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
  aiController.getActiveJobs
)

router.get(
  '/jobs/status/:jobId',
  verifyToken,
  allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
  aiController.getJobStatus
)

router.post(
  '/jobs/cancel/:jobId',
  verifyToken,
  allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
  aiController.cancelJob
)

// Saved AI Database Endpoints
router.post(
  '/saved',
  verifyToken,
  allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
  aiController.saveAiExam
)

router.get(
  '/saved',
  verifyToken,
  allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
  aiController.getSavedAiExams
)

router.get(
  '/saved/:id',
  verifyToken,
  allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
  aiController.getSavedAiExamById
)

router.put(
  '/saved/:id',
  verifyToken,
  allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
  aiController.updateSavedAiExam
)

router.delete(
  '/saved/:id',
  verifyToken,
  allowedTo(userRoles.INSTRUCTOR, userRoles.ADMIN),
  aiController.deleteSavedAiExam
)

export default router
