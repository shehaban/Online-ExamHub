'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { apiRequest } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()

  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleResetPassword = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match')

      setMessage('')

      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')

      setMessage('')

      return
    }

    try {
      const data = await apiRequest(
        '/users/reset-password',

        {
          method: 'POST',

          body: JSON.stringify({
            code,

            password,
          }),
        }
      )

      setMessage(data.message)

      setError('')

      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Something went wrong')
      }

      setMessage('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        <Card>
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>

            <CardTitle>Reset Password</CardTitle>

            <CardDescription>Enter the verification code and create a new password</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Verification Code</Label>

              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
            </div>

            <div className="space-y-2">
              <Label>New Password</Label>

              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Confirm Password</Label>

              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {message && <p className="text-sm text-green-600">{message}</p>}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button className="w-full" onClick={handleResetPassword}>
              Reset Password
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
