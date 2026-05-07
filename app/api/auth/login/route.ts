import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getConnection, sql } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { number, password } = body

    // Validate input
    if (!number || !password) {
      return NextResponse.json(
        { success: false, error: 'Number and password are required' },
        { status: 400 }
      )
    }

    const pool = await getConnection()

    // Find user by number
    const result = await pool
      .request()
      .input('user_number', sql.NVarChar, number)
      .query(
        'SELECT user_id, user_number, name, password, rule FROM [User] WHERE user_number = @user_number'
      )

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No account found with this number' },
        { status: 401 }
      )
    }

    const dbUser = result.recordset[0]

    // Verify password
    const isValidPassword = await bcrypt.compare(password, dbUser.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: dbUser.user_id,
        number: dbUser.user_number,
        name: dbUser.name,
        role: dbUser.rule === 'teacher' ? 'instructor' : 'student',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Create response with user data
    const user = {
      id: dbUser.user_id.toString(),
      number: dbUser.user_number,
      name: dbUser.name,
      role: dbUser.rule === 'teacher' ? 'instructor' : 'student',
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
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
