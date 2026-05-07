import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getConnection, sql } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { number, password, name, role } = body

    // Validate input
    if (!number || !password || !name || !role) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const pool = await getConnection()

    // Check if user already exists
    const existingUser = await pool
      .request()
      .input('user_number', sql.NVarChar, number)
      .query('SELECT user_id FROM [User] WHERE user_number = @user_number')

    if (existingUser.recordset.length > 0) {
      return NextResponse.json(
        { success: false, error: 'An account with this number already exists' },
        { status: 400 }
      )
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Map role to database format (student/teacher)
    const dbRole = role === 'instructor' ? 'teacher' : 'student'

    // Insert new user
    const result = await pool
      .request()
      .input('user_number', sql.NVarChar, number)
      .input('name', sql.NVarChar, name)
      .input('password', sql.NVarChar, hashedPassword)
      .input('rule', sql.NVarChar, dbRole)
      .query(
        `INSERT INTO [User] (user_number, name, password, rule) 
         OUTPUT INSERTED.user_id, INSERTED.user_number, INSERTED.name, INSERTED.rule
         VALUES (@user_number, @name, @password, @rule)`
      )

    const newUser = result.recordset[0]

    // Create JWT token
    const token = jwt.sign(
      {
        id: newUser.user_id,
        number: newUser.user_number,
        name: newUser.name,
        role: newUser.rule === 'teacher' ? 'instructor' : 'student',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Create response with user data
    const user = {
      id: newUser.user_id.toString(),
      number: newUser.user_number,
      name: newUser.name,
      role: newUser.rule === 'teacher' ? 'instructor' : 'student',
      createdAt: new Date().toISOString(),
    }

    const response = NextResponse.json({ success: true, user })

    // Set HTTP-only cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}
