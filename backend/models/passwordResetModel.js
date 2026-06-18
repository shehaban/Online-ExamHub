import db from '../config/db.js'

export const createResetCode = async (user_id, verification_code) => {
  await db.query('INSERT INTO password_reset (user_id, verification_code) VALUES (?, ?)', [
    user_id,
    verification_code,
  ])
}

export const getResetCode = async (verification_code) => {
  const [rows] = await db.query('SELECT * FROM password_reset WHERE verification_code = ?', [
    verification_code,
  ])

  return rows[0] || null
}

export const deleteResetCode = async (verification_code) => {
  await db.query('DELETE FROM password_reset WHERE verification_code = ?', [verification_code])
}
