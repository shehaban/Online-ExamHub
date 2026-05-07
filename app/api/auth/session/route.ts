import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getConnection, sql } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

interface JWTPayload {
  id: number
  number: string
  name: string
  role: string
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ user: null })
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload

    // Fetch fresh user data from database
    const pool = await getConnection()
    const result = await pool
      .request()
      .input('user_id', sql.Int, decoded.id)
      .query('SELECT user_id, user_number, name, rule FROM [User] WHERE user_id = @user_id')

    if (result.recordset.length === 0) {
      // User no longer exists, clear cookie
      const response = NextResponse.json({ user: null })
      response.cookies.set('auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })
      return response
    }

    const dbUser = result.recordset[0]

    const user = {
      id: dbUser.user_id.toString(),
      number: dbUser.user_number,
      name: dbUser.name,
      role: dbUser.rule === 'teacher' ? 'instructor' : 'student',
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Session verification error:', error)
    // Token is invalid, clear cookie
    const response = NextResponse.json({ user: null })
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    return response
  }
}
