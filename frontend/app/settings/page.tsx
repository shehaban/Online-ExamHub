'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiRequest } from '@/lib/api'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  User,
  Shield,
  Palette,
  Settings as SettingsIcon,
  Users,
  Search,
  Pencil,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'

const PRESET_AVATARS = [
  { name: 'Felix', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
  { name: 'Aneka', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' },
  { name: 'Jack', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack' },
  { name: 'Luna', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna' },
  { name: 'Milo', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo' },
  { name: 'Oliver', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver' },
]

export default function SettingsPage() {
  const { user, isLoading: authLoading, updateUser } = useAuth()
  const router = useRouter()

  // Tab State
  const [activeTab, setActiveTab] = useState('account')

  // User profile forms
  const [nameInput, setNameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [avatarInput, setAvatarInput] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  // Preferences
  const [theme, setTheme] = useState('light')
  const [notifyExamStart, setNotifyExamStart] = useState(true)
  const [notifyScoreReleased, setNotifyScoreReleased] = useState(true)

  // Admin: System Config States
  const [systemName, setSystemName] = useState('Online ExamHub')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [allowSignup, setAllowSignup] = useState(true)
  const [minPassScore, setMinPassScore] = useState(50)
  const [isSavingSystem, setIsSavingSystem] = useState(false)

  // Admin: User Administration States
  const [usersList, setUsersList] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [deletingUser, setDeletingUser] = useState<any>(null)

  // Edit User Modal Fields
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [isSavingUserEdit, setIsSavingUserEdit] = useState(false)

  // Load User Data & Admin settings
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }
    if (user) {
      setNameInput(user.name || '')
      setEmailInput(user.email || '')
      setAvatarInput(user.avatar || '')

      if (user.role === 'admin') {
        fetchSystemSettings()
        fetchUsers()
      }
    }
  }, [user, authLoading])

  const fetchSystemSettings = async () => {
    try {
      const res = await apiRequest('/users/settings')
      if (res.data?.settings) {
        const s = res.data.settings
        setSystemName(s.system_name || 'Online ExamHub')
        setMaintenanceMode(s.maintenance_mode === 'true')
        setAllowSignup(s.allow_signup === 'true')
        setMinPassScore(Number(s.min_pass_score) || 50)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load system settings')
    }
  }

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const res = await apiRequest('/users')
      if (res.data?.users) {
        setUsersList(res.data.users)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch user list')
    } finally {
      setLoadingUsers(false)
    }
  }

  // Handle Updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim()) return

    setIsSavingProfile(true)
    try {
      const result = await updateUser({
        name: nameInput.trim(),
        email: emailInput.trim() || undefined,
        avatar: avatarInput.trim() || undefined,
      })
      if (result.success) {
        toast.success('Account profile updated successfully')
      } else {
        toast.error(result.error || 'Failed to update profile')
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while updating profile')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword) return
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsSavingPassword(true)
    try {
      const result = await updateUser({ password: newPassword })
      if (result.success) {
        toast.success('Password changed successfully')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(result.error || 'Failed to change password')
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred')
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handleSaveSystemConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingSystem(true)
    try {
      await apiRequest('/users/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          system_name: systemName,
          maintenance_mode: String(maintenanceMode),
          allow_signup: String(allowSignup),
          min_pass_score: String(minPassScore),
        }),
      })
      toast.success('System configuration saved')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save system config')
    } finally {
      setIsSavingSystem(false)
    }
  }

  const handleOpenEditUser = (u: any) => {
    setEditingUser(u)
    setEditName(u.name || '')
    setEditEmail(u.email || '')
    setEditRole(u.role || u.rule || 'STUDENT')
    setEditPassword('')
  }

  const handleSaveUserEdit = async () => {
    if (!editingUser) return
    setIsSavingUserEdit(true)
    try {
      const payload: any = {
        name: editName,
        email: editEmail,
        rule: editRole,
      }
      if (editPassword) {
        payload.password = editPassword
      }

      await apiRequest(`/admin/update-user/${editingUser.user_number}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      toast.success(`User #${editingUser.user_number} updated successfully`)
      setEditingUser(null)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user')
    } finally {
      setIsSavingUserEdit(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deletingUser) return
    try {
      await apiRequest(`/admin/delete/${deletingUser.user_number}`, {
        method: 'DELETE',
      })
      toast.success(`User #${deletingUser.user_number} deleted successfully`)
      setDeletingUser(null)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user')
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  // Filter users based on search
  const filteredUsers = usersList.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.user_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-12">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings, preferences, and platform rules.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Tabs Menu */}
          <Card className="w-full md:w-64 border-border/60 shrink-0">
            <CardContent className="p-3 flex flex-row md:flex-col gap-1 overflow-x-auto">
              <Button
                variant={activeTab === 'account' ? 'secondary' : 'ghost'}
                className="justify-start gap-2 h-10 w-full"
                onClick={() => setActiveTab('account')}
              >
                <User className="w-4 h-4 text-pink-500" />
                Account Settings
              </Button>
              <Button
                variant={activeTab === 'security' ? 'secondary' : 'ghost'}
                className="justify-start gap-2 h-10 w-full"
                onClick={() => setActiveTab('security')}
              >
                <KeyRound className="w-4 h-4 text-purple-500" />
                Password & Security
              </Button>
              <Button
                variant={activeTab === 'preferences' ? 'secondary' : 'ghost'}
                className="justify-start gap-2 h-10 w-full"
                onClick={() => setActiveTab('preferences')}
              >
                <Palette className="w-4 h-4 text-cyan-500" />
                Preferences
              </Button>
              {user.role === 'admin' && (
                <>
                  <Separator className="my-2 hidden md:block" />
                  <Button
                    variant={activeTab === 'system' ? 'secondary' : 'ghost'}
                    className="justify-start gap-2 h-10 w-full"
                    onClick={() => setActiveTab('system')}
                  >
                    <SettingsIcon className="w-4 h-4 text-amber-500" />
                    Platform Config
                  </Button>
                  <Button
                    variant={activeTab === 'users' ? 'secondary' : 'ghost'}
                    className="justify-start gap-2 h-10 w-full"
                    onClick={() => setActiveTab('users')}
                  >
                    <Users className="w-4 h-4 text-emerald-500" />
                    User Administration
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tabs Content */}
          <div className="flex-1 w-full space-y-6">
            {/* Account Settings */}
            {activeTab === 'account' && (
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <User className="w-5 h-5 text-pink-500" /> Account Settings
                  </CardTitle>
                  <CardDescription>Update your personal info and avatar.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    {/* Avatar Display */}
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20 border shadow-sm ring-4 ring-pink-500/10">
                        <AvatarImage src={avatarInput || user.avatar} alt={user.name} />
                        <AvatarFallback className="bg-pink-100 text-pink-700 text-2xl font-bold">
                          {user.name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{user.name}</p>
                        <p className="text-xs text-muted-foreground">ID: #{user.number}</p>
                        <Badge className="capitalize mt-1" variant="outline">
                          {user.role}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    {/* Choose Preset Avatar */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Choose Profile Picture</Label>
                      <div className="grid grid-cols-6 gap-2 max-w-md">
                        {PRESET_AVATARS.map((av) => (
                          <button
                            key={av.name}
                            type="button"
                            onClick={() => setAvatarInput(av.url)}
                            className={`p-1 rounded-full border-2 transition-all ${
                              avatarInput === av.url
                                ? 'border-pink-500 scale-105'
                                : 'border-transparent hover:scale-105'
                            }`}
                          >
                            <img
                              src={av.url}
                              alt={av.name}
                              className="w-10 h-10 rounded-full bg-muted"
                            />
                          </button>
                        ))}
                      </div>
                      <div className="pt-2">
                        <Label htmlFor="avatar-url" className="text-xs text-muted-foreground">
                          Or enter a custom image URL:
                        </Label>
                        <Input
                          id="avatar-url"
                          type="text"
                          value={avatarInput}
                          onChange={(e) => setAvatarInput(e.target.value)}
                          placeholder="https://example.com/avatar.jpg"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="name">Display Name</Label>
                        <Input
                          id="name"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="Enter your email"
                        />
                      </div>
                    </div>

                    <Button type="submit" disabled={isSavingProfile} className="gap-2">
                      {isSavingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save Profile
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Password & Security */}
            {activeTab === 'security' && (
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-purple-500" /> Password & Security
                  </CardTitle>
                  <CardDescription>Secure your account with a strong password.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                    <div className="space-y-1.5 relative">
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    <Button type="submit" disabled={isSavingPassword} className="gap-2">
                      {isSavingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                      Change Password
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Preferences */}
            {activeTab === 'preferences' && (
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Palette className="w-5 h-5 text-cyan-500" /> System Preferences
                  </CardTitle>
                  <CardDescription>
                    Customize the application theme and system behaviors.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Theme Settings */}
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Theme Mode</Label>
                    <div className="grid grid-cols-3 gap-3 max-w-sm">
                      {['light', 'dark', 'system'].map((t) => (
                        <Button
                          key={t}
                          variant={theme === t ? 'default' : 'outline'}
                          className="capitalize"
                          onClick={() => {
                            setTheme(t)
                            toast.success(`Theme set to ${t} (Mocked value)`)
                          }}
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Notification settings */}
                  <div className="space-y-3">
                    <Label className="font-semibold text-sm">Email Alerts</Label>
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Exam Reminders</p>
                          <p className="text-xs text-muted-foreground">
                            Receive emails when upcoming scheduled exams are starting.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyExamStart}
                          onChange={(e) => setNotifyExamStart(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Grade Releases</p>
                          <p className="text-xs text-muted-foreground">
                            Receive an email notifications with score breakdown once exam results
                            are published.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyScoreReleased}
                          onChange={(e) => setNotifyScoreReleased(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Platform Configuration (Admin Only) */}
            {user.role === 'admin' && activeTab === 'system' && (
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-amber-500" /> Platform Configuration
                  </CardTitle>
                  <CardDescription>
                    Manage application wide configuration parameters in real-time.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveSystemConfig} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="sys-name">System Display Name</Label>
                        <Input
                          id="sys-name"
                          value={systemName}
                          onChange={(e) => setSystemName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="min-score">Default Min Passing Score (%)</Label>
                        <Input
                          id="min-score"
                          type="number"
                          min="0"
                          max="100"
                          value={minPassScore}
                          onChange={(e) => setMinPassScore(Number(e.target.value))}
                          required
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-3 border-border/30">
                        <div>
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            Maintenance Mode
                            {maintenanceMode && (
                              <Badge variant="destructive" className="animate-pulse">
                                Active
                              </Badge>
                            )}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Locks out normal users from starting new exams or rooms.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={maintenanceMode}
                          onChange={(e) => setMaintenanceMode(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-semibold">
                            Self-Registration (Signups)
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Allow new users to register via the signup page.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={allowSignup}
                          onChange={(e) => setAllowSignup(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <Button type="submit" disabled={isSavingSystem} className="gap-2">
                      {isSavingSystem && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save System Config
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* User Administration (Admin Only) */}
            {user.role === 'admin' && activeTab === 'users' && (
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-500" /> User Administration
                  </CardTitle>
                  <CardDescription>
                    Add, update, reset password, or delete user accounts on the platform.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users by name, email, or user number ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Users Table */}
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr className="border-b text-left">
                          <th className="py-3 px-4 font-semibold">User</th>
                          <th className="py-3 px-4 font-semibold">User ID / Num</th>
                          <th className="py-3 px-4 font-semibold">Role</th>
                          <th className="py-3 px-4 font-semibold">Email</th>
                          <th className="py-3 px-4 font-semibold text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingUsers ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-muted-foreground">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                              <span className="block mt-2 text-xs">Fetching users...</span>
                            </td>
                          </tr>
                        ) : filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-muted-foreground">
                              No users matching your search.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u, idx) => (
                            <tr
                              key={`${u.user_number}-${idx}`}
                              className="border-b hover:bg-muted/20 transition-colors"
                            >
                              <td className="py-3 px-4 font-medium flex items-center gap-2.5">
                                <Avatar className="w-7 h-7 border shadow-sm">
                                  <AvatarImage src={u.avatar || undefined} alt={u.name} />
                                  <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                    {u.name?.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{u.name}</span>
                              </td>
                              <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                                {u.user_number}
                              </td>
                              <td className="py-3 px-4">
                                <Badge
                                  variant={
                                    (u.role || u.rule) === 'ADMIN'
                                      ? 'default'
                                      : (u.role || u.rule) === 'TEACHER'
                                        ? 'secondary'
                                        : 'outline'
                                  }
                                  className="text-[10px] uppercase font-bold"
                                >
                                  {u.role || u.rule}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-xs text-muted-foreground">
                                {u.email || '—'}
                              </td>
                              <td className="py-3 px-4 text-center flex items-center justify-center gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEditUser(u)}
                                  className="h-8 w-8 hover:bg-indigo-50/50 hover:text-indigo-600"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingUser(u)}
                                  className="h-8 w-8 hover:bg-rose-50/50 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Edit User Modal Dialog */}
      <Dialog open={editingUser !== null} onOpenChange={(o) => !o && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Modify profile details, change the platform role, or override passwords for user ID:{' '}
              <strong>#{editingUser?.user_number}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Display Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Full Name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-role">System Role</Label>
              <select
                id="edit-role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="STUDENT">STUDENT</option>
                <option value="TEACHER">TEACHER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-password">Reset Password (leave empty to keep unchanged)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="New Password Override"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUserEdit} disabled={isSavingUserEdit}>
              {isSavingUserEdit && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal Dialog */}
      <Dialog open={deletingUser !== null} onOpenChange={(o) => !o && setDeletingUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" /> Danger Zone
            </DialogTitle>
            <DialogDescription>
              Are you absolutely sure you want to delete user <strong>{deletingUser?.name}</strong>{' '}
              (#{deletingUser?.user_number})? This action is permanent and deletes all associated
              records.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeletingUser(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
