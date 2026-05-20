import db from '../config/db.js'

export const getAllUsers = async () => {
  const [users] = await db.query('SELECT * FROM users')
  return users
}

export const getUserByNumber = async (userNumber) => {
  const [rows] = await db.query('SELECT * FROM users WHERE user_number = ?', [userNumber])
  return rows[0] || null
}

export const getUsersByName = async (username) => {
  const [rows] = await db.query('SELECT * FROM users WHERE name = ?', [username])
  return rows[0] || null
}

export const searchUsersByNamePartial = async (query) => {
  const [rows] = await db.query('SELECT * FROM users WHERE name LIKE ?', [`%${query}%`])
  return rows
}

export const createUser = async (user) => {
  const { user_number, name, password, rule } = user
  const [result] = await db.query(
    'INSERT INTO users (user_number, name, password, rule) VALUES (?, ?, ?, ?)',
    [user_number, name, password, rule]
  )
  return { id: result.insertId, ...user }
}
