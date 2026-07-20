import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,

  ssl: {
    rejectUnauthorized: false,
  },
})

// Test connection on startup
db.getConnection()
  .then(async (connection) => {
    console.log('Successfully connected to MySQL database.')

    try {
      await connection.query('ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL')
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME' && e.errno !== 1060) {
        console.error('Error ensuring email on users:', e.message)
      }
    }
    try {
      await connection.query('ALTER TABLE users ADD COLUMN avatar VARCHAR(255) NULL')
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME' && e.errno !== 1060) {
        console.error('Error ensuring avatar on users:', e.message)
      }
    }
    try {
      await connection.query('ALTER TABLE admins ADD COLUMN email VARCHAR(255) NULL')
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME' && e.errno !== 1060) {
        console.error('Error ensuring email on admins:', e.message)
      }
    }
    try {
      await connection.query('ALTER TABLE admins ADD COLUMN avatar VARCHAR(255) NULL')
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME' && e.errno !== 1060) {
        console.error('Error ensuring avatar on admins:', e.message)
      }
    }
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          setting_key VARCHAR(255) PRIMARY KEY,
          setting_value VARCHAR(255) NOT NULL
        )
      `)
      // Insert default values if they don't exist
      await connection.query(`
        INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES 
        ('maintenance_mode', 'false'),
        ('allow_signup', 'true'),
        ('min_pass_score', '50'),
        ('system_name', 'Online ExamHub')
      `)
    } catch (e) {
      console.error('Error ensuring system_settings table:', e.message)
    }

    connection.release()
  })
  .catch((err) => {
    console.error('Failed to connect to MySQL database:', err.message)
  })

export default db
