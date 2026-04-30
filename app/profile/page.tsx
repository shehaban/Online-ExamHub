'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  User,
  BookOpen,
  GraduationCap,
  Hash,
  CalendarDays,
  CheckCircle2,
  Pencil,
  X,
} from 'lucide-react'

export default function ProfilePage() {
  const { user, isLoading, updateUser } = useAuth()
  const router = useRouter()

  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
    }
    if (user) {
      setNameInput(user.name)
    }
  }, [user, isLoading, router])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const handleSave = () => {
    if (!nameInput.trim()) return
    updateUser({ name: nameInput.trim() })
    setEditing(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  const handleCancel = () => {
    setNameInput(user.name)
    setEditing(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-8">My Profile</h1>

        {success && (
          <Alert className="mb-6 border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              Profile updated successfully.
            </AlertDescription>
          </Alert>
        )}

        {/* Avatar + identity card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="h-24 w-24 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
                  <Badge
                    variant={user.role === 'instructor' ? 'default' : 'secondary'}
                    className="w-fit mx-auto sm:mx-0"
                  >
                    {user.role === 'instructor' ? (
                      <>
                        <BookOpen className="w-3 h-3 mr-1" />
                        Instructor
                      </>
                    ) : (
                      <>
                        <GraduationCap className="w-3 h-3 mr-1" />
                        Student
                      </>
                    )}
                  </Badge>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center justify-center sm:justify-start gap-1.5">
                    <Hash className="w-4 h-4" />
                    {user.number}
                  </span>
                  <span className="flex items-center justify-center sm:justify-start gap-1.5">
                    <CalendarDays className="w-4 h-4" />
                    Joined {joinedDate}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit info card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Account Information</CardTitle>
                <CardDescription>Update your display name</CardDescription>
              </div>
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Full name */}
            <div className="space-y-2">
              <Label htmlFor="profileName">Full Name</Label>
              {editing ? (
                <Input
                  id="profileName"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  autoFocus
                />
              ) : (
                <p className="text-sm text-foreground py-2 px-3 rounded-md bg-muted">{user.name}</p>
              )}
            </div>

            <Separator />

            {/* Number — read only */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {user.role === 'instructor' ? 'Instructor Number' : 'Student Number'}
              </Label>
              <p className="text-sm text-foreground py-2 px-3 rounded-md bg-muted font-mono">
                {user.number}
              </p>
              <p className="text-xs text-muted-foreground">Your ID number cannot be changed.</p>
            </div>

            <Separator />

            {/* Role — read only */}
            <div className="space-y-2">
              <Label>Role</Label>
              <p className="text-sm text-foreground py-2 px-3 rounded-md bg-muted capitalize">
                {user.role}
              </p>
              <p className="text-xs text-muted-foreground">
                Your role is assigned at registration and cannot be changed.
              </p>
            </div>

            {editing && (
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={!nameInput.trim()}>
                  Save changes
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
