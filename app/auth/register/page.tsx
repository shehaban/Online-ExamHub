'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { GraduationCap, AlertCircle, User, BookOpen, ArrowLeft } from "lucide-react"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [number, setNumber] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<"student" | "instructor">("student")
  const [instructorCode, setInstructorCode] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

  const handleRoleChange = (value: "student" | "instructor") => {
    setRole(value)
    setNumber("")
    setInstructorCode("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (role === "instructor" && instructorCode !== "INSTRUCTOR2024") {
      setError("Invalid instructor access code")
      return
    }

    setIsSubmitting(true)

    try {
      const result = await register({ number, password, name, role })
      if (result.success) {
        router.push('/')
      } else {
        setError(result.error || 'Registration failed')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
        <Card className="w-full">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-semibold text-foreground">ExamHub</span>
              </Link>
            </div>
            <div>
              <CardTitle className="text-2xl">Create an account</CardTitle>
              <CardDescription className="mt-2">
                Join ExamHub to start taking or creating exams
              </CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Role selector first so the number field label updates immediately */}
              <div className="space-y-3">
                <Label>I am a...</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(value) => handleRoleChange(value as "student" | "instructor")}
                  className="grid grid-cols-2 gap-4"
                >
                  <Label
                    htmlFor="student"
                    className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                      role === "student"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="student" id="student" className="sr-only" />
                    <User className="w-6 h-6" />
                    <span className="font-medium">Student</span>
                  </Label>
                  <Label
                    htmlFor="instructor"
                    className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                      role === "instructor"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="instructor" id="instructor" className="sr-only" />
                    <BookOpen className="w-6 h-6" />
                    <span className="font-medium">Instructor</span>
                  </Label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="number">
                  {role === "instructor" ? "Instructor Number" : "Student Number"}
                </Label>
                <Input
                  id="number"
                  type="text"
                  placeholder={role === "instructor" ? "e.g. INS-00123" : "e.g. STU-00456"}
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              {role === "instructor" && (
                <div className="space-y-2">
                  <Label htmlFor="instructorCode">Instructor Access Code</Label>
                  <Input
                    id="instructorCode"
                    type="password"
                    placeholder="Enter instructor access code"
                    value={instructorCode}
                    onChange={(e) => setInstructorCode(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact your administrator to obtain the instructor access code.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
