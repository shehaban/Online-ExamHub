import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import userRoutes from './routes/user.route.js'
import adminRoutes from './routes/admin.route.js'
import httpStatusText from './utils/httpStatusText.js'

dotenv.config()

const app = express()

app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
  console.log('Server running 🚀')
})

app.use('/api/users', userRoutes)
app.use('/api/admin', adminRoutes)

app.use((req, res) => {
  return res
    .status(404)
    .json({ status: httpStatusText.ERROR, message: 'this resource is not available' })
})

app.use((error, req, res, next) => {
  return res
    .status(error.statusCode || 500)
    .json({ status: httpStatusText.ERROR, error: error.message })
})

app.listen(process.env.PORT, () => {
  console.log(`server running on port ${process.env.PORT}`)
})
