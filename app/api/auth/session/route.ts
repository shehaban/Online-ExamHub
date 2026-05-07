import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

interface UserRow {
  user_id: number
  user_number: string
  name: string
  rule: string
}

interface JWTPayload {
  id: string
  number: string
  name: string
  role: string
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload

    // Fetch fresh user data from database
    const result = await query<UserRow>(
      `SELECT user_id, user_number, name, rule 
       FROM [User] 
       WHERE user_id = @id`,
      { id: parseInt(decoded.id, 10) }
    )

    if (result.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const user = result.recordset[0]

    return NextResponse.json({
      success: true,
      user: {
        id: user.user_id.toString(),
        number: user.user_number,
        name: user.name,
        role: user.rule === 'teacher' ? 'instructor' : 'student',
        createdAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
    }
    console.error('Session error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching session' },
      { status: 500 }
    )
  }
}
