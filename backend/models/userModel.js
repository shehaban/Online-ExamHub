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

// add a function to get user by email
export const getUserByEmail = async (email) => {
  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email])
  return rows[0] || null
}

export const searchUsersByNamePartial = async (query) => {
  const [rows] = await db.query('SELECT * FROM users WHERE name LIKE ?', [`%${query}%`])
  return rows
}

export const createUser = async (user) => {
  const { user_number, name, password, rule, email } = user
  const [result] = await db.query(
    'INSERT INTO users (user_number, name, password, rule, email) VALUES (?, ?, ?, ?, ?)',
    [user_number, name, password, rule, email]
  )
  return { id: result.insertId, ...user }
}
