import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/lib/auth-context'

// Mock js-cookie
vi.mock('js-cookie', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Test component that uses the auth context
function TestComponent() {
  const { user, login, register, logout, isLoading } = useAuth()

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      {user ? (
        <>
          <div data-testid="user-name">{user.name}</div>
          <div data-testid="user-number">{user.number}</div>
          <div data-testid="user-role">{user.role}</div>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <>
          <div data-testid="no-user">No user logged in</div>
          <button
            onClick={() =>
              register({
                number: '1234',
                password: 'password123',
                name: 'Test User',
                role: 'student',
              })
            }
          >
            Register
          </button>
          <button onClick={() => login('test@test.com', 'password123')}>Login</button>
        </>
      )}
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should show no user when not logged in', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('no-user')).toBeTruthy()
  })

  it('should register a new user', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const registerButton = screen.getByText('Register')
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(screen.getByTestId('user-name').textContent).toBe('Test User')
      expect(screen.getByTestId('user-email').textContent).toBe('test@test.com')
      expect(screen.getByTestId('user-role').textContent).toBe('student')
    })
  })

  it('should login an existing user', async () => {
    // First register a user
    const users = [
      {
        id: 'test-id',
        email: 'test@test.com',
        name: 'Test User',
        role: 'student',
        createdAt: new Date().toISOString(),
      },
    ]
    const passwords = { 'test-id': 'password123' }
    localStorage.setItem('exam_platform_users', JSON.stringify(users))
    localStorage.setItem('exam_platform_users_passwords', JSON.stringify(passwords))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const loginButton = screen.getByText('Login')
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByTestId('user-name').textContent).toBe('Test User')
    })
  })

  it('should logout user', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // First register
    const registerButton = screen.getByText('Register')
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(screen.getByTestId('user-name')).toBeTruthy()
    })

    // Then logout
    const logoutButton = screen.getByText('Logout')
    fireEvent.click(logoutButton)

    await waitFor(() => {
      expect(screen.getByTestId('no-user')).toBeTruthy()
    })
  })
})
