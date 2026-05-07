'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import Cookies from 'js-cookie'

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

const TOKEN_KEY = 'exam_platform_token'
const USER_KEY = 'exam_platform_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session from token on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = Cookies.get(TOKEN_KEY)
      const storedUser = localStorage.getItem(USER_KEY)

      if (token && storedUser) {
        try {
          // Verify token with server
          const response = await fetch('/api/auth/session', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.user) {
              setUser(data.user)
            } else {
              // Token invalid, clear storage
              clearStorage()
            }
          } else {
            // Token invalid, clear storage
            clearStorage()
          }
        } catch {
          // Network error, try to use stored user data
          try {
            const parsedUser = JSON.parse(storedUser) as User
            setUser(parsedUser)
          } catch {
            clearStorage()
          }
        }
      }

      setIsLoading(false)
    }

    restoreSession()
  }, [])

  const clearStorage = () => {
    Cookies.remove(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

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

      if (data.success && data.user && data.token) {
        setUser(data.user)
        Cookies.set(TOKEN_KEY, data.token, { expires: 7 })
        localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        return { success: true }
      }

      return { success: false, error: data.error || 'Login failed' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'An error occurred during login' }
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

      if (result.success && result.user && result.token) {
        setUser(result.user)
        Cookies.set(TOKEN_KEY, result.token, { expires: 7 })
        localStorage.setItem(USER_KEY, JSON.stringify(result.user))
        return { success: true }
      }

      return { success: false, error: result.error || 'Registration failed' }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: 'An error occurred during registration' }
    }
  }, [])

  const updateUser = useCallback((data: Partial<Pick<User, 'name' | 'avatar'>>) => {
    setUser((prev) => {
      if (!prev) return null
      const updated = { ...prev, ...data }
      localStorage.setItem(USER_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    clearStorage()
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
