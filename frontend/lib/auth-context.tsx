'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import Cookies from 'js-cookie'
import { apiRequest } from './api'

export interface User {
  id: string
  number: string
  name: string
  role: 'student' | 'instructor' | 'admin'
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
  role: 'student' | 'instructor' | 'admin'
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const SESSION_KEY = 'exam_platform_session'
const TOKEN_KEY = 'exam_platform_token'
const USER_INFO_KEY = 'exam_platform_user_info'

/**
 * Maps the backend's uppercase `rule` field to the frontend's lowercase `role`.
 * Backend: STUDENT, TEACHER, ADMIN
 * Frontend: student, instructor, admin
 */
function mapBackendRole(rule: string): 'student' | 'instructor' | 'admin' {
  const normalized = rule?.toUpperCase() || 'STUDENT'
  switch (normalized) {
    case 'ADMIN':
      return 'admin'
    case 'TEACHER':
    case 'INSTRUCTOR':
      return 'instructor'
    default:
      return 'student'
  }
}

/**
 * Maps the frontend's lowercase `role` to the backend's uppercase `rule`.
 */
function mapFrontendRole(role: string): string {
  switch (role) {
    case 'admin':
      return 'ADMIN'
    case 'instructor':
      return 'TEACHER'
    default:
      return 'STUDENT'
  }
}

/**
 * Transforms the raw backend user object into the frontend User shape.
 */
function mapBackendUser(raw: Record<string, unknown>): User {
  return {
    id: String(raw.id ?? ''),
    number: String(raw.user_number ?? ''),
    name: String(raw.name ?? ''),
    role: mapBackendRole(String(raw.rule ?? raw.role ?? 'STUDENT')),
    createdAt: String(raw.created_at ?? raw.createdAt ?? new Date().toISOString()),
    avatar: raw.avatar ? String(raw.avatar) : undefined,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY)
      const storedUser = localStorage.getItem(USER_INFO_KEY)

      if (storedToken && storedUser) {
        const parsed = JSON.parse(storedUser) as User
        setUser(parsed)
        Cookies.set(SESSION_KEY, storedToken, { expires: 7 })
      }
    } catch {
      // Corrupted storage — clear everything
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_INFO_KEY)
      Cookies.remove(SESSION_KEY)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Persists the JWT token and mapped user info to localStorage + cookie.
   */
  const persistSession = useCallback((token: string, mappedUser: User) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(mappedUser))
    Cookies.set(SESSION_KEY, token, { expires: 7 })
  }, [])

  const login = useCallback(
    async (number: string, password: string) => {
      try {
        const response = await apiRequest('/users/login', {
          method: 'POST',
          body: JSON.stringify({ user_number: number, password }),
        })

        const { token, user: rawUser } = response.data
        const mappedUser = mapBackendUser(rawUser)

        persistSession(token, mappedUser)
        setUser(mappedUser)

        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed'
        return { success: false, error: message }
      }
    },
    [persistSession]
  )

  const register = useCallback(
    async (data: RegisterData) => {
      try {
        const response = await apiRequest('/users/register', {
          method: 'POST',
          body: JSON.stringify({
            user_number: data.number,
            name: data.name,
            password: data.password,
            rule: mapFrontendRole(data.role),
          }),
        })

        const { newUser } = response.data
        const token = newUser.token
        const mappedUser = mapBackendUser(newUser)

        persistSession(token, mappedUser)
        setUser(mappedUser)

        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed'
        return { success: false, error: message }
      }
    },
    [persistSession]
  )

  const updateUser = useCallback((data: Partial<Pick<User, 'name' | 'avatar'>>) => {
    setUser((prev) => {
      if (!prev) return null
      const updated = { ...prev, ...data }
      // Keep localStorage in sync
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_INFO_KEY)
    Cookies.remove(SESSION_KEY)
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
