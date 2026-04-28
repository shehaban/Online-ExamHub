"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import Cookies from "js-cookie"

export interface User {
  id: string
  email: string
  name: string
  role: "student" | "instructor"
  createdAt: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

interface RegisterData {
  email: string
  password: string
  name: string
  role: "student" | "instructor"
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const USERS_KEY = "exam_platform_users"
const SESSION_KEY = "exam_platform_session"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const sessionId = Cookies.get(SESSION_KEY)
    if (sessionId) {
      const users = getStoredUsers()
      const foundUser = users.find((u) => u.id === sessionId)
      if (foundUser) {
        setUser(foundUser)
      }
    }
    setIsLoading(false)
  }, [])

  const getStoredUsers = (): User[] => {
    if (typeof window === "undefined") return []
    const stored = localStorage.getItem(USERS_KEY)
    return stored ? JSON.parse(stored) : []
  }

  const saveUsers = (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  }

  const getStoredPasswords = (): Record<string, string> => {
    if (typeof window === "undefined") return {}
    const stored = localStorage.getItem(`${USERS_KEY}_passwords`)
    return stored ? JSON.parse(stored) : {}
  }

  const savePasswords = (passwords: Record<string, string>) => {
    localStorage.setItem(`${USERS_KEY}_passwords`, JSON.stringify(passwords))
  }

  const login = useCallback(async (email: string, password: string) => {
    const users = getStoredUsers()
    const passwords = getStoredPasswords()
    
    const foundUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    
    if (!foundUser) {
      return { success: false, error: "No account found with this email" }
    }

    if (passwords[foundUser.id] !== password) {
      return { success: false, error: "Invalid password" }
    }

    setUser(foundUser)
    Cookies.set(SESSION_KEY, foundUser.id, { expires: 7 })
    
    return { success: true }
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    const users = getStoredUsers()
    const passwords = getStoredPasswords()
    
    if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { success: false, error: "An account with this email already exists" }
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      email: data.email,
      name: data.name,
      role: data.role,
      createdAt: new Date().toISOString(),
    }

    users.push(newUser)
    passwords[newUser.id] = data.password
    
    saveUsers(users)
    savePasswords(passwords)
    
    setUser(newUser)
    Cookies.set(SESSION_KEY, newUser.id, { expires: 7 })
    
    return { success: true }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    Cookies.remove(SESSION_KEY)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
