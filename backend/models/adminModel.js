import db from '../config/db.js'
import bcrypt from 'bcrypt'

export const getAllAdmins = async () => {
  const [admins] = await db.query("SELECT *, 'ADMIN' as rule FROM admins")
  return admins
}

export const createAdmin = async (admin) => {
  const { name, password, user_number } = admin
  const [result] = await db.query(
    'INSERT INTO admins (name, password, user_number) VALUES (?, ?, ?)',
    [name, password, user_number]
  )
  return { id: result.insertId, ...admin }
}

export const getAdminByNumber = async (user_number) => {
  const [admins] = await db.query("SELECT *, 'ADMIN' as rule FROM admins WHERE user_number = ?", [
    user_number,
  ])
  return admins[0]
}

export const getAdminByName = async (name) => {
  const [admins] = await db.query("SELECT *, 'ADMIN' as rule FROM admins WHERE name = ?", [name])
  return admins[0]
}

export const searchAdminsByNamePartial = async (query) => {
  const [rows] = await db.query("SELECT *, 'ADMIN' as rule FROM admins WHERE name LIKE ?", [
    `%${query}%`,
  ])
  return rows
}

export const editUsers = async (updatedUser, originalNumber) => {
  const { name, password, user_number, rule } = updatedUser

  // 1. Check current status to see if role changed
  const [inUsers] = await db.query('SELECT * FROM users WHERE user_number = ?', [originalNumber])
  const [inAdmins] = await db.query('SELECT * FROM admins WHERE user_number = ?', [originalNumber])

  const wasInUsers = inUsers.length > 0
  const wasInAdmins = inAdmins.length > 0

  if (rule === 'ADMIN') {
    if (wasInUsers) {
      // Move from users to admins
      await db.query('DELETE FROM users WHERE user_number = ?', [originalNumber])
      await db.query('INSERT INTO admins (name, password, user_number) VALUES (?, ?, ?)', [
        name,
        password,
        user_number,
      ])
    } else if (wasInAdmins) {
      // Just update admins
      await db.query(
        'UPDATE admins SET name = ?, password = ?, user_number = ? WHERE user_number = ?',
        [name, password, user_number, originalNumber]
      )
    } else {
      // Safety: user didn't exist in either? (Shouldn't happen)
      await db.query('INSERT INTO admins (name, password, user_number) VALUES (?, ?, ?)', [
        name,
        password,
        user_number,
      ])
    }
  } else {
    // New rule is NOT admin (TEACHER or STUDENT)
    if (wasInAdmins) {
      // Move from admins to users
      await db.query('DELETE FROM admins WHERE user_number = ?', [originalNumber])
      await db.query('INSERT INTO users (user_number, name, password, rule) VALUES (?, ?, ?, ?)', [
        user_number,
        name,
        password,
        rule,
      ])
    } else if (wasInUsers) {
      // Just update users
      await db.query(
        'UPDATE users SET name = ?, password = ?, user_number = ?, rule = ? WHERE user_number = ?',
        [name, password, user_number, rule, originalNumber]
      )
    } else {
      // Safety: user didn't exist in either?
      await db.query('INSERT INTO users (user_number, name, password, rule) VALUES (?, ?, ?, ?)', [
        user_number,
        name,
        password,
        rule,
      ])
    }
  }

  return updatedUser
}

export const deleteUserByNumber = async (user_number) => {
  // 1. Try deleting from users
  const [result] = await db.query('DELETE FROM users WHERE user_number = ?', [user_number])

  if (result.affectedRows === 0) {
    const [adminResult] = await db.query('DELETE FROM admins WHERE user_number = ?', [user_number])
    return adminResult
  }

  return result
}
