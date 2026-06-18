'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation' // added useRouter import here

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')

  const [message, setMessage] = useState('')

  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setMessage('')

    setError('')

    try {
      const response = await fetch(
        'http://localhost:4000/api/users/forgot-password',

        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            email,
          }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)

        setTimeout(() => {
          router.push('/auth/reset-password')
        }, 1000)
      } else {
        setError(data.error)
      }
    } catch {
      setError('Server error')
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

            <CardTitle>Forgot Password</CardTitle>

            <CardDescription>Enter your email to receive a verification code</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>

                <Input
                  id="email"
                  type="email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {message && <p className="text-sm text-green-600">{message}</p>}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" className="w-full">
                Send Code
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
