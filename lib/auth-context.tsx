'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export interface User {
  id: string
  number: string
  name: string
  role: 'student' | 'instructor'
  createdAt: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (number: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  updateUser: (data: Partial<Pick<User, 'name' | 'avatar'>>) => void
}

interface RegisterData {
  number: string
  password: string
  name: string
  role: 'student' | 'instructor'
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session')
        const data = await response.json()
        if (data.user) {
          setUser(data.user)
        }
      } catch (error) {
        console.error('Failed to check session:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [])

  const login = useCallback(async (number: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number, password }),
      })

      const data = await response.json()

      if (data.success && data.user) {
        setUser(data.user)
        return { success: true }
      }

      return { success: false, error: data.error || 'Login failed' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success && result.user) {
        setUser(result.user)
        return { success: true }
      }

      return { success: false, error: result.error || 'Registration failed' }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }, [])

  const updateUser = useCallback((data: Partial<Pick<User, 'name' | 'avatar'>>) => {
    setUser((prev) => {
      if (!prev) return null
      return { ...prev, ...data }
    })
    // TODO: Add API call to update user in database
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    }
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
