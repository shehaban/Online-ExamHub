import fs from 'fs/promises'
import path from 'path'
import { asyncWrapper } from '../middleware/asyncWrapper.js'
import {
  createRoom,
  getRoomById,
  getPublicRooms,
  getAllRooms,
  getRoomsByTeacherId,
  getJoinedRooms,
  deleteRoom,
  addMember,
  removeMember,
  isMember,
  getRoomMembers,
  createMessage,
  getMessagesByRoom,
  createFileRecord,
  getFilesByRoom,
  updateRoom,
  getMessageById,
  deleteMessage,
  getFileById,
  deleteFileRecord,
} from '../models/roomModel.js'
import AppError from '../utils/AppError.js'
import httpStatusText from '../utils/httpStatusText.js'

// ─── ROOMS CRUD ─────────────────────────────────────────────────────────────

/**
 * POST /api/rooms
 * Teacher creates a new room.
 */
export const createNewRoom = asyncWrapper(async (req, res, next) => {
  const { name, visibility, room_code, capacity } = req.body
  const teacherId = req.currentUser.id

  if (!name || !name.trim()) {
    return next(new AppError('Room name is required', 400, httpStatusText.FAIL))
  }

  // Private rooms must have a code
  const vis = visibility || 'public'
  let code = room_code || null

  if (vis === 'private' && !code) {
    // Auto-generate a 6-character alphanumeric code
    code = Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const room = await createRoom({
    name: name.trim(),
    teacher_id: teacherId,
    visibility: vis,
    room_code: code,
    capacity: capacity || null,
  })

  return res.status(201).json({
    status: httpStatusText.SUCCESS,
    data: { room },
  })
})

/**
 * GET /api/rooms
 * List rooms visible to the current user.
 * Teachers see all rooms. Students see public + joined rooms.
 */
export const listRooms = asyncWrapper(async (req, res) => {
  const { id, rule } = req.currentUser
  let rooms = await getAllRooms(id)

  if (rule === 'ADMIN') {
    rooms = rooms.map((room) => ({
      ...room,
      is_member: 1,
    }))
  }

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { rooms },
  })
})

/**
 * GET /api/rooms/my-rooms
 * Teacher gets rooms they created.
 */
export const myRooms = asyncWrapper(async (req, res) => {
  const teacherId = req.currentUser.id
  const rooms = await getRoomsByTeacherId(teacherId)

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { rooms },
  })
})

/**
 * GET /api/rooms/:roomId
 * Get room details — only accessible to the owner or members.
 */
export const getRoom = asyncWrapper(async (req, res, next) => {
  const roomId = req.params.roomId
  const { id, rule } = req.currentUser

  const room = await getRoomById(roomId)
  if (!room) {
    return next(new AppError('Room not found', 404, httpStatusText.FAIL))
  }

  // Access check: owner OR member OR ADMIN
  const isOwner = room.teacher_id === id
  const memberCheck = await isMember(roomId, id)
  const isAdmin = rule === 'ADMIN'

  if (!isOwner && !memberCheck && !isAdmin) {
    return next(new AppError('You are not a member of this room', 403, httpStatusText.FAIL))
  }

  const members = await getRoomMembers(roomId)

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: {
      room: {
        ...room,
        member_count: members.length,
        is_owner: isOwner || isAdmin,
      },
      members,
    },
  })
})

/**
 * DELETE /api/rooms/:roomId
 * Teacher deletes a room they own.
 */
export const removeRoom = asyncWrapper(async (req, res, next) => {
  const roomId = req.params.roomId
  const { id, rule } = req.currentUser

  const room = await getRoomById(roomId)
  if (!room) {
    return next(new AppError('Room not found', 404, httpStatusText.FAIL))
  }

  const isOwner = room.teacher_id === id
  const isAdmin = rule === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return next(
      new AppError('Only the room owner or an admin can delete this room', 403, httpStatusText.FAIL)
    )
  }

  await deleteRoom(roomId)

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    message: 'Room deleted successfully',
  })
})

// ─── JOIN / LEAVE ───────────────────────────────────────────────────────────

/**
 * POST /api/rooms/:roomId/join
 * Student joins a room. Must provide room_code if private.
 */
export const joinRoom = asyncWrapper(async (req, res, next) => {
  const roomId = req.params.roomId
  const studentId = req.currentUser.id
  const { room_code } = req.body

  const room = await getRoomById(roomId)
  if (!room) {
    return next(new AppError('Room not found', 404, httpStatusText.FAIL))
  }

  // Cannot join your own room as teacher
  if (room.teacher_id === studentId) {
    return next(new AppError('You are the owner of this room', 400, httpStatusText.FAIL))
  }

  // Check if already a member
  const alreadyMember = await isMember(roomId, studentId)
  if (alreadyMember) {
    return next(new AppError('You are already a member of this room', 400, httpStatusText.FAIL))
  }

  // Private room code check
  if (room.visibility === 'private') {
    if (!room_code || room.room_code !== room_code) {
      return next(new AppError('Invalid room code', 401, httpStatusText.FAIL))
    }
  }

  // Capacity check
  if (room.capacity) {
    const members = await getRoomMembers(roomId)
    if (members.length >= room.capacity) {
      return next(new AppError('Room is full', 400, httpStatusText.FAIL))
    }
  }

  await addMember(roomId, studentId)

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    message: 'Joined room successfully',
  })
})

/**
 * POST /api/rooms/:roomId/leave
 * Student leaves a room.
 */
export const leaveRoom = asyncWrapper(async (req, res, next) => {
  const roomId = req.params.roomId
  const studentId = req.currentUser.id

  await removeMember(roomId, studentId)

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    message: 'Left room successfully',
  })
})

// ─── MESSAGES ───────────────────────────────────────────────────────────────

/**
 * POST /api/rooms/:roomId/messages
 * Only the room's teacher can send messages.
 */
export const sendMessage = asyncWrapper(async (req, res, next) => {
  const roomId = req.params.roomId
  const { id, rule, name } = req.currentUser
  const { content } = req.body

  if (!content || !content.trim()) {
    return next(new AppError('Message content is required', 400, httpStatusText.FAIL))
  }

  const room = await getRoomById(roomId)
  if (!room) {
    return next(new AppError('Room not found', 404, httpStatusText.FAIL))
  }

  const isOwner = room.teacher_id === id
  const isAdmin = rule === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return next(
      new AppError(
        'Only the teacher of this room or an admin can send messages',
        403,
        httpStatusText.FAIL
      )
    )
  }

  // Use sender info directly from JWT to avoid table-collision between users/admins
  const senderName = name || (isAdmin ? 'Admin' : room.teacher_name)
  const senderRole = rule // 'ADMIN', 'TEACHER', etc.

  const message = await createMessage(roomId, id, senderName, senderRole, content.trim())

  return res.status(201).json({
    status: httpStatusText.SUCCESS,
    data: { message },
  })
})

/**
 * GET /api/rooms/:roomId/messages
 * Get message history — accessible to owner or members.
 */
export const fetchMessages = asyncWrapper(async (req, res, next) => {
  const roomId = req.params.roomId
  const { id, rule } = req.currentUser

  const room = await getRoomById(roomId)
  if (!room) {
    return next(new AppError('Room not found', 404, httpStatusText.FAIL))
  }

  const isOwner = room.teacher_id === id
  const memberCheck = await isMember(roomId, id)
  const isAdmin = rule === 'ADMIN'

  if (!isOwner && !memberCheck && !isAdmin) {
    return next(new AppError('You are not a member of this room', 403, httpStatusText.FAIL))
  }

  const limit = parseInt(req.query.limit) || 50
  const offset = parseInt(req.query.offset) || 0
  const messages = await getMessagesByRoom(roomId, limit, offset)

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { messages },
  })
})

// ─── FILE UPLOADS ───────────────────────────────────────────────────────────

/**
 * POST /api/rooms/:roomId/files
 * Only the room's teacher can upload files.
 * Expects multipart/form-data with a "file" field.
 */
export const uploadFile = asyncWrapper(async (req, res, next) => {
  const roomId = req.params.roomId
  const { id, rule } = req.currentUser

  const room = await getRoomById(roomId)
  if (!room) {
    return next(new AppError('Room not found', 404, httpStatusText.FAIL))
  }

  const isOwner = room.teacher_id === id
  const isAdmin = rule === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return next(
      new AppError(
        'Only the teacher of this room or an admin can upload files',
        403,
        httpStatusText.FAIL
      )
    )
  }

  if (!req.file) {
    return next(new AppError('No file uploaded', 400, httpStatusText.FAIL))
  }

  const fileRecord = await createFileRecord({
    room_id: roomId,
    uploaded_by: id,
    file_name: req.file.originalname,
    file_url: `/uploads/${req.file.filename}`,
    file_size: req.file.size,
  })

  return res.status(201).json({
    status: httpStatusText.SUCCESS,
    data: { file: fileRecord },
  })
})

/**
 * GET /api/rooms/:roomId/files
 * Get file list — accessible to owner or members.
 */
export const fetchFiles = asyncWrapper(async (req, res, next) => {
  const roomId = req.params.roomId
  const { id, rule } = req.currentUser

  const room = await getRoomById(roomId)
  if (!room) {
    return next(new AppError('Room not found', 404, httpStatusText.FAIL))
  }

  const isOwner = room.teacher_id === id
  const memberCheck = await isMember(roomId, id)
  const isAdmin = rule === 'ADMIN'

  if (!isOwner && !memberCheck && !isAdmin) {
    return next(new AppError('You are not a member of this room', 403, httpStatusText.FAIL))
  }

  const files = await getFilesByRoom(roomId)

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { files },
  })
})

/**
 * PATCH /api/rooms/:roomId
 * Teacher/owner or admin edits room settings.
 */
export const updateRoomSettings = asyncWrapper(async (req, res, next) => {
  const roomId = req.params.roomId
  const { id, rule } = req.currentUser
  const { name, visibility, room_code, capacity } = req.body

  const room = await getRoomById(roomId)
  if (!room) {
    return next(new AppError('Room not found', 404, httpStatusText.FAIL))
  }

  const isOwner = room.teacher_id === id
  const isAdmin = rule === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return next(
      new AppError('Only the room owner or an admin can edit settings', 403, httpStatusText.FAIL)
    )
  }

  // Build updated room values (partial updates)
  const updatedName = name !== undefined ? name.trim() : room.name
  if (name !== undefined && !updatedName) {
    return next(new AppError('Room name cannot be empty', 400, httpStatusText.FAIL))
  }

  const updatedVisibility = visibility || room.visibility
  let updatedCode = room_code !== undefined ? room_code : room.room_code
  const updatedCapacity =
    capacity !== undefined ? (capacity ? parseInt(capacity) : null) : room.capacity

  if (updatedVisibility === 'private' && !updatedCode) {
    // Auto-generate code if visibility switched to private but code is not set
    updatedCode = Math.random().toString(36).substring(2, 8).toUpperCase()
  } else if (updatedVisibility === 'public') {
    // Public rooms have null passcode
    updatedCode = null
  }

  await updateRoom(roomId, {
    name: updatedName,
    visibility: updatedVisibility,
    room_code: updatedCode,
    capacity: updatedCapacity,
  })

  const updatedRoomData = await getRoomById(roomId)

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { room: updatedRoomData },
  })
})

/**
 * DELETE /api/rooms/:roomId/members/:studentId
 * Teacher/owner or admin removes a member from the room.
 */
export const removeRoomMember = asyncWrapper(async (req, res, next) => {
  const { roomId, studentId } = req.params
  const { id, rule } = req.currentUser

  const room = await getRoomById(roomId)
  if (!room) {
    return next(new AppError('Room not found', 404, httpStatusText.FAIL))
  }

  const isOwner = room.teacher_id === id
  const isAdmin = rule === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return next(
      new AppError('Only the room owner or an admin can remove members', 403, httpStatusText.FAIL)
    )
  }

  const isUserMember = await isMember(roomId, studentId)
  if (!isUserMember) {
    return next(new AppError('User is not a member of this room', 400, httpStatusText.FAIL))
  }

  await removeMember(roomId, studentId)

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    message: 'Member removed successfully',
  })
})

/**
 * DELETE /api/rooms/:roomId/messages/:messageId
 * Teacher/owner or admin deletes a message.
 * Admin messages can only be deleted by another admin.
 */
export const removeMessage = asyncWrapper(async (req, res, next) => {
  const { roomId, messageId } = req.params
  const { id, rule } = req.currentUser

  const room = await getRoomById(roomId)
  if (!room) {
    return next(new AppError('Room not found', 404, httpStatusText.FAIL))
  }

  const message = await getMessageById(messageId)
  if (!message) {
    return next(new AppError('Message not found', 404, httpStatusText.FAIL))
  }

  if (Number(message.room_id) !== Number(roomId)) {
    return next(new AppError('Message does not belong to this room', 400, httpStatusText.FAIL))
  }

  const isOwner = room.teacher_id === id
  const isAdmin = rule === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return next(
      new AppError('Only the room owner or an admin can delete messages', 403, httpStatusText.FAIL)
    )
  }

  // Admin messages are protected — only another admin can delete them
  if (message.sender_role === 'ADMIN' && !isAdmin) {
    return next(
      new AppError('Admin messages can only be deleted by an admin', 403, httpStatusText.FAIL)
    )
  }

  await deleteMessage(messageId)

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    message: 'Message deleted successfully',
  })
})

/**
 * DELETE /api/rooms/:roomId/files/:fileId
 * Teacher/owner or admin deletes a file record and removes it from disk.
 */
export const removeFile = asyncWrapper(async (req, res, next) => {
  const { roomId, fileId } = req.params
  const { id, rule } = req.currentUser

  const room = await getRoomById(roomId)
  if (!room) {
    return next(new AppError('Room not found', 404, httpStatusText.FAIL))
  }

  const file = await getFileById(fileId)
  if (!file) {
    return next(new AppError('File not found', 404, httpStatusText.FAIL))
  }

  if (Number(file.room_id) !== Number(roomId)) {
    return next(new AppError('File does not belong to this room', 400, httpStatusText.FAIL))
  }

  const isOwner = room.teacher_id === id
  const isAdmin = rule === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return next(
      new AppError('Only the room owner or an admin can delete files', 403, httpStatusText.FAIL)
    )
  }

  // Delete physical file from filesystem first (so we have its path)
  try {
    const filename = path.basename(file.file_url)
    const filePath = path.join(process.cwd(), 'uploads', filename)
    await fs.unlink(filePath)
  } catch (err) {
    console.error('Failed to delete file from disk:', err)
  }

  // Delete file record from database
  await deleteFileRecord(fileId)

  return res.status(200).json({
    status: httpStatusText.SUCCESS,
    message: 'File deleted successfully',
  })
})
