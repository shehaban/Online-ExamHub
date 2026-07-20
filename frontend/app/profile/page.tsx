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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  User,
  BookOpen,
  GraduationCap,
  Hash,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Mail,
  Camera,
  Image as ImageIcon,
  Save,
  Loader2,
} from 'lucide-react'

const PRESET_AVATARS = [
  { name: 'Felix', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
  { name: 'Aneka', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' },
  { name: 'Jack', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack' },
  { name: 'Luna', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna' },
  { name: 'Milo', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo' },
  { name: 'Oliver', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver' },
]

export default function ProfilePage() {
  const { user, isLoading, updateUser } = useAuth()
  const router = useRouter()

  // Form states
  const [nameInput, setNameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [avatarInput, setAvatarInput] = useState('')

  // Password states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // UI States
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
    }
    if (user) {
      setNameInput(user.name || '')
      setEmailInput(user.email || '')
      setAvatarInput(user.avatar || '')
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim()) return

    setIsSavingProfile(true)
    setSuccessMessage('')
    setErrorMessage('')

    const result = await updateUser({
      name: nameInput.trim(),
      email: emailInput.trim() || undefined,
      avatar: avatarInput.trim() || undefined,
    })

    setIsSavingProfile(false)
    if (result.success) {
      setSuccessMessage('Profile details updated successfully.')
      setTimeout(() => setSuccessMessage(''), 4000)
    } else {
      setErrorMessage(result.error || 'Failed to update profile.')
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordSuccess('')
    setPasswordError('')

    if (!newPassword) {
      setPasswordError('New password is required')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setIsSavingPassword(true)
    const result = await updateUser({
      password: newPassword,
    })
    setIsSavingPassword(false)

    if (result.success) {
      setPasswordSuccess('Password changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(''), 4000)
    } else {
      setPasswordError(result.error || 'Failed to change password.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />

      {/* Decorative top banner */}
      <div className="h-32 w-full bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/10" />

      <main className="container mx-auto px-4 pb-16 -mt-16 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: User Summary Card */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="overflow-hidden border-primary/10 shadow-lg bg-card/80 backdrop-blur-sm">
              <CardContent className="pt-8 pb-6 text-center">
                <div className="relative inline-block mx-auto mb-4 group">
                  <Avatar className="h-28 w-28 ring-4 ring-primary/20 transition-all duration-300 group-hover:ring-primary/40">
                    <AvatarImage src={avatarInput || user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>

                <h2 className="text-xl font-bold text-foreground truncate">{user.name}</h2>
                <p className="text-sm text-muted-foreground mb-4 truncate">
                  {user.email || 'No email configured'}
                </p>

                <div className="flex justify-center mb-6">
                  <Badge
                    variant={user.role === 'instructor' ? 'default' : 'secondary'}
                    className="px-3 py-1 text-xs gap-1.5"
                  >
                    {user.role === 'instructor' ? (
                      <>
                        <BookOpen className="w-3.5 h-3.5" />
                        Instructor
                      </>
                    ) : user.role === 'admin' ? (
                      <>
                        <User className="w-3.5 h-3.5" />
                        Admin
                      </>
                    ) : (
                      <>
                        <GraduationCap className="w-3.5 h-3.5" />
                        Student
                      </>
                    )}
                  </Badge>
                </div>

                <Separator className="my-4 bg-muted/60" />

                <div className="space-y-3.5 text-left text-sm text-muted-foreground px-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-primary/70" />
                      ID Number
                    </span>
                    <span className="font-mono font-medium text-foreground">{user.number}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary/70" />
                      Joined
                    </span>
                    <span className="text-foreground">{joinedDate}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Tabbed Edit Forms */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="edit-profile" className="space-y-6">
              <TabsList className="grid grid-cols-2 w-full max-w-[400px] bg-muted/60 p-1 rounded-lg">
                <TabsTrigger value="edit-profile" className="rounded-md py-2">
                  Edit Details
                </TabsTrigger>
                <TabsTrigger value="security" className="rounded-md py-2">
                  Security
                </TabsTrigger>
              </TabsList>

              <TabsContent value="edit-profile">
                <Card className="border-primary/10 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Account Settings
                    </CardTitle>
                    <CardDescription>
                      Update your personal information and profile picture.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveProfile} className="space-y-6">
                      {successMessage && (
                        <Alert className="border-green-500/50 bg-green-500/10">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-700 dark:text-green-400">
                            {successMessage}
                          </AlertDescription>
                        </Alert>
                      )}

                      {errorMessage && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                      )}

                      {/* Display Name */}
                      <div className="space-y-2">
                        <Label htmlFor="profileName" className="text-foreground font-medium">
                          Full Name
                        </Label>
                        <Input
                          id="profileName"
                          placeholder="Your Name"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          required
                          className="bg-background/50 focus-visible:ring-primary"
                        />
                      </div>

                      {/* Email Address */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="profileEmail"
                          className="text-foreground font-medium flex items-center gap-1.5"
                        >
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          Email Address
                        </Label>
                        <Input
                          id="profileEmail"
                          type="email"
                          placeholder="your.email@example.com"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="bg-background/50 focus-visible:ring-primary"
                        />
                      </div>

                      {/* Profile Avatar Selection */}
                      <div className="space-y-3">
                        <Label className="text-foreground font-medium flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          Choose Profile Avatar
                        </Label>

                        {/* Preset Avatars Grid */}
                        <div className="grid grid-cols-6 gap-3 p-3 bg-muted/40 rounded-lg">
                          {PRESET_AVATARS.map((avatar) => (
                            <button
                              key={avatar.name}
                              type="button"
                              onClick={() => setAvatarInput(avatar.url)}
                              className={`relative rounded-full overflow-hidden aspect-square border-2 transition-all p-0.5 hover:scale-105 duration-200 ${
                                avatarInput === avatar.url
                                  ? 'border-primary ring-2 ring-primary/20 scale-105'
                                  : 'border-transparent hover:border-muted-foreground/30'
                              }`}
                            >
                              <img
                                src={avatar.url}
                                alt={avatar.name}
                                className="w-full h-full object-cover rounded-full bg-background"
                              />
                            </button>
                          ))}
                        </div>

                        {/* Custom Avatar URL input */}
                        <div className="space-y-1.5 mt-2">
                          <span className="text-xs text-muted-foreground">
                            Or enter a custom image URL:
                          </span>
                          <Input
                            placeholder="https://example.com/avatar.jpg"
                            value={avatarInput}
                            onChange={(e) => setAvatarInput(e.target.value)}
                            className="bg-background/50 text-xs py-1 h-9"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button type="submit" disabled={isSavingProfile} className="gap-2">
                          {isSavingProfile ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security">
                <Card className="border-primary/10 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-primary" />
                      Security Settings
                    </CardTitle>
                    <CardDescription>Change your account password.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                      {passwordSuccess && (
                        <Alert className="border-green-500/50 bg-green-500/10">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-700 dark:text-green-400">
                            {passwordSuccess}
                          </AlertDescription>
                        </Alert>
                      )}

                      {passwordError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{passwordError}</AlertDescription>
                        </Alert>
                      )}

                      {/* New Password */}
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder="Minimum 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="bg-background/50 focus-visible:ring-primary"
                        />
                      </div>

                      {/* Confirm New Password */}
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Re-enter new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="bg-background/50 focus-visible:ring-primary"
                        />
                      </div>

                      <div className="pt-2">
                        <Button type="submit" disabled={isSavingPassword} className="gap-2">
                          {isSavingPassword ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <KeyRound className="w-4 h-4" />
                              Update Password
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}
