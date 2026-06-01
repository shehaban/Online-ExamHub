import db from '../config/db.js'

// ─── ROOMS ──────────────────────────────────────────────────────────────────

export const createRoom = async ({ name, teacher_id, visibility, room_code, capacity }) => {
  const [result] = await db.query(
    'INSERT INTO rooms (name, teacher_id, visibility, room_code, capacity) VALUES (?, ?, ?, ?, ?)',
    [name, teacher_id, visibility || 'public', room_code || null, capacity || null]
  )
  return { room_id: result.insertId, name, teacher_id, visibility, room_code, capacity }
}

export const getRoomById = async (roomId) => {
  const [rows] = await db.query(
    `SELECT r.*, u.name AS teacher_name, u.user_number AS teacher_number
     FROM rooms r
     JOIN users u ON r.teacher_id = u.user_id
     WHERE r.room_id = ?`,
    [roomId]
  )
  return rows[0] || null
}

export const getPublicRooms = async () => {
  const [rows] = await db.query(
    `SELECT r.*, u.name AS teacher_name, u.user_number AS teacher_number,
            (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.room_id) AS member_count
     FROM rooms r
     JOIN users u ON r.teacher_id = u.user_id
     WHERE r.visibility = 'public'
     ORDER BY r.created_at DESC`
  )
  return rows
}

export const getAllRooms = async (userId = null) => {
  const [rows] = await db.query(
    `SELECT r.*, u.name AS teacher_name, u.user_number AS teacher_number,
            (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.room_id) AS member_count,
            IF(r.teacher_id = ?, 1, EXISTS(SELECT 1 FROM room_members rm2 WHERE rm2.room_id = r.room_id AND rm2.student_id = ?)) AS is_member
     FROM rooms r
     JOIN users u ON r.teacher_id = u.user_id
     ORDER BY r.created_at DESC`,
    [userId, userId]
  )
  return rows
}

export const getRoomsByTeacherId = async (teacherId) => {
  const [rows] = await db.query(
    `SELECT r.*,
            (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.room_id) AS member_count
     FROM rooms r
     WHERE r.teacher_id = ?
     ORDER BY r.created_at DESC`,
    [teacherId]
  )
  return rows
}

export const getJoinedRooms = async (studentId) => {
  const [rows] = await db.query(
    `SELECT r.*, u.name AS teacher_name, u.user_number AS teacher_number,
            (SELECT COUNT(*) FROM room_members rm2 WHERE rm2.room_id = r.room_id) AS member_count
     FROM room_members rm
     JOIN rooms r ON rm.room_id = r.room_id
     JOIN users u ON r.teacher_id = u.user_id
     WHERE rm.student_id = ?
     ORDER BY rm.joined_at DESC`,
    [studentId]
  )
  return rows
}

export const deleteRoom = async (roomId) => {
  const [result] = await db.query('DELETE FROM rooms WHERE room_id = ?', [roomId])
  return result
}

// ─── MEMBERS ────────────────────────────────────────────────────────────────

export const addMember = async (roomId, studentId) => {
  const [result] = await db.query('INSERT INTO room_members (room_id, student_id) VALUES (?, ?)', [
    roomId,
    studentId,
  ])
  return result
}

export const removeMember = async (roomId, studentId) => {
  const [result] = await db.query('DELETE FROM room_members WHERE room_id = ? AND student_id = ?', [
    roomId,
    studentId,
  ])
  return result
}

export const isMember = async (roomId, studentId) => {
  const [rows] = await db.query('SELECT 1 FROM room_members WHERE room_id = ? AND student_id = ?', [
    roomId,
    studentId,
  ])
  return rows.length > 0
}

export const getRoomMembers = async (roomId) => {
  const [rows] = await db.query(
    `SELECT u.user_id, u.user_number, u.name, rm.joined_at
     FROM room_members rm
     JOIN users u ON rm.student_id = u.user_id
     WHERE rm.room_id = ?
     ORDER BY rm.joined_at DESC`,
    [roomId]
  )
  return rows
}

// ─── MESSAGES ───────────────────────────────────────────────────────────────

export const createMessage = async (roomId, senderId, senderName, senderRole, content) => {
  const [result] = await db.query(
    'INSERT INTO messages (room_id, sender_id, sender_name, sender_role, content) VALUES (?, ?, ?, ?, ?)',
    [roomId, senderId, senderName, senderRole, content]
  )
  return {
    message_id: result.insertId,
    room_id: roomId,
    sender_id: senderId,
    sender_name: senderName,
    sender_role: senderRole,
    content,
  }
}

export const getMessagesByRoom = async (roomId, limit = 50, offset = 0) => {
  const [rows] = await db.query(
    `SELECT m.*,
            COALESCE(m.sender_name, u.name) AS sender_name,
            COALESCE(m.sender_role, u.rule, 'TEACHER') AS sender_role
     FROM messages m
     LEFT JOIN users u ON m.sender_id = u.user_id AND m.sender_name IS NULL
     WHERE m.room_id = ?
     ORDER BY m.created_at ASC
     LIMIT ? OFFSET ?`,
    [roomId, limit, offset]
  )
  return rows
}

// ─── FILES ──────────────────────────────────────────────────────────────────

export const createFileRecord = async ({
  room_id,
  uploaded_by,
  file_name,
  file_url,
  file_size,
}) => {
  const [result] = await db.query(
    'INSERT INTO file_uploads (room_id, uploaded_by, file_name, file_url, file_size) VALUES (?, ?, ?, ?, ?)',
    [room_id, uploaded_by, file_name, file_url, file_size]
  )
  return { file_id: result.insertId, room_id, uploaded_by, file_name, file_url, file_size }
}

export const getFilesByRoom = async (roomId) => {
  const [rows] = await db.query(
    `SELECT f.*, u.name AS uploader_name
     FROM file_uploads f
     JOIN users u ON f.uploaded_by = u.user_id
     WHERE f.room_id = ?
     ORDER BY f.uploaded_at DESC`,
    [roomId]
  )
  return rows
}

export const updateRoom = async (roomId, { name, visibility, room_code, capacity }) => {
  const [result] = await db.query(
    `UPDATE rooms
     SET name = ?, visibility = ?, room_code = ?, capacity = ?
     WHERE room_id = ?`,
    [name, visibility, room_code, capacity, roomId]
  )
  return result
}

export const getMessageById = async (messageId) => {
  const [rows] = await db.query('SELECT * FROM messages WHERE message_id = ?', [messageId])
  return rows[0] || null
}

export const deleteMessage = async (messageId) => {
  const [result] = await db.query('DELETE FROM messages WHERE message_id = ?', [messageId])
  return result
}

export const getFileById = async (fileId) => {
  const [rows] = await db.query('SELECT * FROM file_uploads WHERE file_id = ?', [fileId])
  return rows[0] || null
}

export const deleteFileRecord = async (fileId) => {
  const [result] = await db.query('DELETE FROM file_uploads WHERE file_id = ?', [fileId])
  return result
}
