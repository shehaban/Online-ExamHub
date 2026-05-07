import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

interface UserRow {
  user_id: number
  user_number: string
  name: string
  rule: string
}

export async function POST(request: Request) {
  try {
    const { number, password, name, role } = await request.json()

    if (!number || !password || !name || !role) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await query<UserRow>(
      `SELECT user_id FROM [User] WHERE user_number = @number`,
      { number }
    )

    if (existingUser.recordset.length > 0) {
      return NextResponse.json(
        { success: false, error: 'An account with this number already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Map frontend role to database rule
    const dbRule = role === 'instructor' ? 'teacher' : 'student'

    // Insert new user into database
    const insertResult = await query<UserRow>(
      `INSERT INTO [User] (user_number, name, password, rule)
       OUTPUT INSERTED.user_id, INSERTED.user_number, INSERTED.name, INSERTED.rule
       VALUES (@number, @name, @password, @rule)`,
      {
        number,
        name,
        password: hashedPassword,
        rule: dbRule,
      }
    )

    if (insertResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to create account' },
        { status: 500 }
      )
    }

    const newUser = insertResult.recordset[0]

    // Create JWT token
    const token = jwt.sign(
      {
        id: newUser.user_id.toString(),
        number: newUser.user_number,
        name: newUser.name,
        role: newUser.rule === 'teacher' ? 'instructor' : 'student',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Return user data and token
    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user_id.toString(),
        number: newUser.user_number,
        name: newUser.name,
        role: newUser.rule === 'teacher' ? 'instructor' : 'student',
        createdAt: new Date().toISOString(),
      },
      token,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred during registration' },
      { status: 500 }
    )
  }
}
