import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

interface UserRow {
  user_id: number
  user_number: string
  name: string
  password: string
  rule: string
}

export async function POST(request: Request) {
  try {
    const { number, password } = await request.json()

    if (!number || !password) {
      return NextResponse.json(
        { success: false, error: 'Number and password are required' },
        { status: 400 }
      )
    }

    // Query user from database
    const result = await query<UserRow>(
      `SELECT user_id, user_number, name, password, rule 
       FROM [User] 
       WHERE user_number = @number`,
      { number }
    )

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No account found with this number' },
        { status: 401 }
      )
    }

    const user = result.recordset[0]

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 })
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user.user_id.toString(),
        number: user.user_number,
        name: user.name,
        role: user.rule === 'teacher' ? 'instructor' : 'student',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Return user data and token
    return NextResponse.json({
      success: true,
      user: {
        id: user.user_id.toString(),
        number: user.user_number,
        name: user.name,
        role: user.rule === 'teacher' ? 'instructor' : 'student',
        createdAt: new Date().toISOString(),
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
