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

export const ensureProfileColumns = async () => {
  try {
    await db.query('ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL')
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME' && error.errno !== 1060) {
      console.error('Error adding email column:', error)
    }
  }
  try {
    await db.query('ALTER TABLE users ADD COLUMN avatar VARCHAR(255) NULL')
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME' && error.errno !== 1060) {
      console.error('Error adding avatar column:', error)
    }
  }
}

export const updateUserProfileByNumber = async (userNumber, { name, email, avatar, password }) => {
  await ensureProfileColumns()
  const fields = []
  const values = []

  if (name !== undefined) {
    fields.push('name = ?')
    values.push(name)
  }
  if (email !== undefined) {
    fields.push('email = ?')
    values.push(email)
  }
  if (avatar !== undefined) {
    fields.push('avatar = ?')
    values.push(avatar)
  }
  if (password !== undefined) {
    fields.push('password = ?')
    values.push(password)
  }

  if (fields.length === 0) return true

  values.push(userNumber)
  const [result] = await db.query(
    `UPDATE users SET ${fields.join(', ')} WHERE user_number = ?`,
    values
  )
  return result.affectedRows > 0
}

export const createUser = async (user) => {
  const { user_number, name, password, rule, email } = user
  await ensureProfileColumns()
  const [result] = await db.query(
    'INSERT INTO users (user_number, name, password, rule, email) VALUES (?, ?, ?, ?, ?)',
    [user_number, name, password, rule, email]
  )
  return { id: result.insertId, ...user }
}
