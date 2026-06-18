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
  .then((connection) => {
    console.log('Successfully connected to MySQL database.')
    connection.release()
  })
  .catch((err) => {
    console.error('Failed to connect to MySQL database:', err.message)
  })

export default db
