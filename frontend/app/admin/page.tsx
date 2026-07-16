'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiRequest } from '@/lib/api'
import { getAllExams, deleteExam as deleteExamStore, type Exam } from '@/lib/exam-store'
import { Header } from '@/components/header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search,
  Users,
  ClipboardList,
  ShieldCheck,
  Hash,
  CalendarDays,
  User as UserIcon,
  BookOpen,
  GraduationCap,
  AlertCircle,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  LayoutDashboard,
  FileText,
  ExternalLink,
  PlusCircle,
  RefreshCw,
} from 'lucide-react'

type TabType = 'overview' | 'users' | 'admins' | 'exams'
type DialogMode = 'preview' | 'edit' | 'delete' | 'create' | 'delete_exam' | null

interface ApiUser {
  user_id?: number
  id?: number
  user_number: string
  name: string
  rule: string
  created_at?: string
  email?: string
}

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [allUsers, setAllUsers] = useState<ApiUser[]>([])
  const [allAdmins, setAllAdmins] = useState<ApiUser[]>([])
  const [allExams, setAllExams] = useState<Exam[]>([])
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [error, setError] = useState('')

  // Dialog states
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null)
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)

  // Edit user form state
  const [editName, setEditName] = useState('')
  const [editNumber, setEditNumber] = useState('')
  const [editRole, setEditRole] = useState<string>('STUDENT')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create admin form state
  const [createName, setCreateName] = useState('')
  const [createNumber, setCreateNumber] = useState('')
  const [createPassword, setCreatePassword] = useState('')

  // Fetch all users, admins, and exams
  const loadData = useCallback(async () => {
    setIsDataLoading(true)
    setError('')
    try {
      const [usersResponse, adminsResponse, examsData] = await Promise.all([
        apiRequest('/users').catch(() => ({ data: { users: [] } })),
        apiRequest('/admin').catch(() => ({ data: { admins: [] } })),
        getAllExams().catch(() => []),
      ])

      const fetchedUsers = usersResponse.data.users || []
      const fetchedAdmins = adminsResponse.data.admins || []

      setAllUsers(fetchedUsers)
      setAllAdmins(fetchedAdmins)
      setAllExams(examsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setIsDataLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user && user.role === 'admin') {
      loadData()
    }
  }, [authLoading, user, loadData])

  // Redirect if not logged in or not an admin
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
    if (!authLoading && user && user.role !== 'admin') {
      router.push('/')
    }
  }, [user, authLoading, router])

  const openPreview = (u: ApiUser) => {
    setSelectedUser(u)
    setDialogMode('preview')
  }

  const openEdit = (u: ApiUser) => {
    setSelectedUser(u)
    setEditName(u.name)
    setEditNumber(u.user_number)
    setEditRole(u.rule)
    setDialogMode('edit')
  }

  const openDelete = (u: ApiUser) => {
    setSelectedUser(u)
    setDialogMode('delete')
  }

  const openDeleteExam = (exam: Exam) => {
    setSelectedExam(exam)
    setDialogMode('delete_exam')
  }

  const openCreateAdmin = () => {
    setDialogMode('create')
  }

  const closeDialog = () => {
    setDialogMode(null)
    setSelectedUser(null)
    setSelectedExam(null)
    setEditName('')
    setEditNumber('')
    setEditRole('STUDENT')
    setCreateName('')
    setCreateNumber('')
    setCreatePassword('')
  }

  const handleSaveEdit = async () => {
    if (!selectedUser) return

    setIsSubmitting(true)
    setError('')
    try {
      const newRole = editRole.toUpperCase()
      await apiRequest(`/admin/update-user/${selectedUser.user_number}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName,
          user_number: editNumber,
          rule: newRole,
        }),
      })
      await loadData()
      closeDialog()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      await apiRequest(`/admin/delete/${selectedUser.user_number}`, {
        method: 'DELETE',
      })
      await loadData()
      closeDialog()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteExam = async () => {
    if (!selectedExam) return

    setIsSubmitting(true)
    try {
      await deleteExamStore(selectedExam.code)
      await loadData()
      closeDialog()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete exam')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateAdmin = async () => {
    if (!createName || !createNumber || !createPassword) {
      setError('Please fill in all fields')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      await apiRequest('/admin/create-admin', {
        method: 'POST',
        body: JSON.stringify({
          name: createName,
          user_number: createNumber,
          password: createPassword,
          rule: 'ADMIN',
        }),
      })
      await loadData()
      closeDialog()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  const formatDate = (dateString?: string) =>
    dateString
      ? new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'N/A'

  const getRoleBadge = (rule: string) => {
    switch (rule?.toUpperCase()) {
      case 'ADMIN':
        return (
          <Badge variant="destructive" className="gap-1 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin
          </Badge>
        )
      case 'TEACHER':
      case 'INSTRUCTOR':
        return (
          <Badge variant="default" className="gap-1 text-[11px] bg-indigo-600 hover:bg-indigo-700">
            <BookOpen className="w-3.5 h-3.5" />
            Instructor
          </Badge>
        )
      default:
        return (
          <Badge
            variant="secondary"
            className="gap-1 text-[11px] bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/10"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Student
          </Badge>
        )
    }
  }

  // Filtering calculations
  const totalStudentsCount = allUsers.filter((u) => u.rule?.toUpperCase() === 'STUDENT').length
  const totalInstructorsCount = allUsers.filter((u) =>
    ['TEACHER', 'INSTRUCTOR'].includes(u.rule?.toUpperCase())
  ).length
  const totalAdminsCount = allAdmins.length
  const totalExamsCount = allExams.length

  const filteredUsers = allUsers.filter((u) => {
    if (activeTab === 'users') {
      const matchQuery = searchQuery.trim().toLowerCase()
      if (!matchQuery) return true
      return u.name.toLowerCase().includes(matchQuery) || u.user_number.includes(matchQuery)
    }
    return false
  })

  const filteredAdmins = allAdmins.filter((a) => {
    const matchQuery = searchQuery.trim().toLowerCase()
    if (!matchQuery) return true
    return a.name.toLowerCase().includes(matchQuery) || a.user_number.includes(matchQuery)
  })

  const filteredExams = allExams.filter((e) => {
    const matchQuery = searchQuery.trim().toLowerCase()
    if (!matchQuery) return true
    return (
      e.title.toLowerCase().includes(matchQuery) ||
      e.code.toLowerCase().includes(matchQuery) ||
      e.createdBy?.toLowerCase().includes(matchQuery)
    )
  })

  if (authLoading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: LayoutDashboard },
    { id: 'users' as TabType, label: 'Users', icon: Users, count: allUsers.length },
    { id: 'admins' as TabType, label: 'Admins', icon: ShieldCheck, count: allAdmins.length },
    { id: 'exams' as TabType, label: 'Exams', icon: FileText, count: allExams.length },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin System Hub</h1>
              <p className="text-sm text-muted-foreground">
                Manage accounts, exams, and platform analytics
              </p>
            </div>
          </div>
          <Button
            onClick={loadData}
            disabled={isDataLoading}
            variant="outline"
            className="gap-2 self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Tab switchers */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6 w-full overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setSearchQuery('')
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <Badge
                    variant={activeTab === tab.id ? 'secondary' : 'outline'}
                    className="text-xs ml-1 font-semibold"
                  >
                    {tab.count}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>

        {/* ─── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Analytics Widgets */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">
                        Total Students
                      </p>
                      <p className="text-3xl font-extrabold text-foreground mt-1">
                        {totalStudentsCount}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Active student profiles</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">
                        Instructors
                      </p>
                      <p className="text-3xl font-extrabold text-foreground mt-1">
                        {totalInstructorsCount}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Exam creators & teachers</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">
                        Administrators
                      </p>
                      <p className="text-3xl font-extrabold text-foreground mt-1">
                        {totalAdminsCount}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-rose-600" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Full system access</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">
                        Total Exams
                      </p>
                      <p className="text-3xl font-extrabold text-foreground mt-1">
                        {totalExamsCount}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Created online exams</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">System Quick Actions</CardTitle>
                <CardDescription>Direct shortcuts to essential system workflows</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button onClick={openCreateAdmin} className="gap-2">
                  <ShieldCheck className="w-4 h-4" /> Add Admin Account
                </Button>
                <Button onClick={() => setActiveTab('users')} variant="outline" className="gap-2">
                  <Users className="w-4 h-4" /> Manage User Accounts
                </Button>
                <Button onClick={() => setActiveTab('exams')} variant="outline" className="gap-2">
                  <ClipboardList className="w-4 h-4" /> View All Exams
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <Link href="/rooms">
                    <BookOpen className="w-4 h-4" /> Study Rooms
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Items Preview Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Recent Users preview */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                      Recently Registered Users
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setActiveTab('users')}
                    >
                      View Users
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {allUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No users registered yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {allUsers.slice(0, 4).map((u) => (
                        <div
                          key={u.user_number}
                          className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                                {getInitials(u.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-semibold text-foreground">{u.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                #{u.user_number}
                              </p>
                            </div>
                          </div>
                          {getRoleBadge(u.rule)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Exams preview */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Exams Listing</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setActiveTab('exams')}
                    >
                      View Exams
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {allExams.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No exams published yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {allExams.slice(0, 4).map((e) => (
                        <div
                          key={e.code}
                          className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <p className="text-xs font-semibold truncate text-foreground">
                              {e.title || 'Untitled'}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              Code: {e.code}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] whitespace-nowrap shrink-0"
                          >
                            {e.questions?.length || 0} Questions
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ─── SEARCH & LIST FILTERS ────────────────────────────────────────── */}
        {activeTab !== 'overview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base capitalize">Manage {activeTab}</CardTitle>
                    <CardDescription>
                      Search, preview details, edit profiles, or delete listings.
                    </CardDescription>
                  </div>
                  {activeTab === 'admins' && (
                    <Button onClick={openCreateAdmin} className="gap-2 shrink-0">
                      <PlusCircle className="w-4 h-4" /> Add Admin
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={`Filter ${activeTab} by name, identifier, or keyword...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* LISTINGS CONTAINER */}
            <Card>
              <CardContent className="pt-6">
                {isDataLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* USERS LIST */}
                    {activeTab === 'users' && (
                      <div className="space-y-3">
                        {filteredUsers.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            No matching user accounts found.
                          </p>
                        ) : (
                          filteredUsers.map((u) => (
                            <div
                              key={u.user_number}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 shrink-0">
                                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                                    {getInitials(u.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-foreground text-sm">
                                      {u.name}
                                    </p>
                                    {getRoleBadge(u.rule)}
                                  </div>
                                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                    #{u.user_number}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 justify-end sm:justify-start">
                                {u.rule.toLowerCase() === 'student' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-1 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50"
                                    asChild
                                  >
                                    <Link href={`/dashboard?studentId=${u.user_id || u.id}`}>
                                      <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                                    </Link>
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => openPreview(u)}
                                >
                                  <Eye className="w-3.5 h-3.5" /> Details
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50"
                                  onClick={() => openEdit(u)}
                                >
                                  <Pencil className="w-3.5 h-3.5" /> Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => openDelete(u)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* ADMINS LIST */}
                    {activeTab === 'admins' && (
                      <div className="space-y-3">
                        {filteredAdmins.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            No matching administrators found.
                          </p>
                        ) : (
                          filteredAdmins.map((a) => (
                            <div
                              key={a.user_number}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 shrink-0">
                                  <AvatarFallback className="bg-destructive text-destructive-foreground text-sm font-bold">
                                    {getInitials(a.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-foreground text-sm">
                                      {a.name}
                                    </p>
                                    {getRoleBadge('ADMIN')}
                                  </div>
                                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                    #{a.user_number}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 justify-end sm:justify-start">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => openPreview(a)}
                                >
                                  <Eye className="w-3.5 h-3.5" /> Details
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50"
                                  onClick={() => openEdit(a)}
                                >
                                  <Pencil className="w-3.5 h-3.5" /> Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => openDelete(a)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* EXAMS LIST */}
                    {activeTab === 'exams' && (
                      <div className="space-y-3">
                        {filteredExams.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            No exams found matching your query.
                          </p>
                        ) : (
                          filteredExams.map((e) => (
                            <div
                              key={e.code}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-foreground text-sm truncate">
                                    {e.title || 'Untitled Exam'}
                                  </h4>
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-[10px] text-primary"
                                  >
                                    {e.code}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5 flex-wrap">
                                  <span>
                                    Questions:{' '}
                                    <span className="font-medium text-foreground">
                                      {e.questions?.length || 0}
                                    </span>
                                  </span>
                                  {e.createdBy && (
                                    <span>
                                      Created by:{' '}
                                      <span className="font-mono font-medium text-foreground">
                                        #{e.createdBy}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 justify-end sm:justify-start">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs gap-1"
                                  asChild
                                >
                                  <Link href={`/exams/${encodeURIComponent(e.code)}/admin`}>
                                    <ExternalLink className="w-3.5 h-3.5" /> Exam Dashboard
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50"
                                  asChild
                                >
                                  <Link href={`/exams/${encodeURIComponent(e.code)}`}>
                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => openDeleteExam(e)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* ─── DIALOGS ──────────────────────────────────────────────────────── */}

      {/* Preview User Details Dialog */}
      <Dialog open={dialogMode === 'preview'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Account Information Profile</DialogTitle>
            <DialogDescription>Full database details for this record</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-base font-bold">
                    {getInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground">{selectedUser.name}</h3>
                  {getRoleBadge(selectedUser.rule)}
                </div>
              </div>

              <Separator />

              <div className="grid gap-3.5 text-sm">
                <div className="grid grid-cols-3 py-1">
                  <span className="text-muted-foreground font-medium">User Number</span>
                  <span className="col-span-2 font-mono bg-muted px-2 py-0.5 rounded text-xs w-fit">
                    {selectedUser.user_number}
                  </span>
                </div>
                <div className="grid grid-cols-3 py-1">
                  <span className="text-muted-foreground font-medium">Email</span>
                  <span className="col-span-2 text-foreground font-medium">
                    {selectedUser.email || 'No email registered'}
                  </span>
                </div>
                <div className="grid grid-cols-3 py-1">
                  <span className="text-muted-foreground font-medium">Role Type</span>
                  <span className="col-span-2 text-foreground capitalize font-medium">
                    {selectedUser.rule.toLowerCase()}
                  </span>
                </div>
                <div className="grid grid-cols-3 py-1">
                  <span className="text-muted-foreground font-medium">Joined Date</span>
                  <span className="col-span-2 text-foreground font-medium">
                    {formatDate(selectedUser.created_at)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User/Admin Dialog */}
      <Dialog open={dialogMode === 'edit'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile Record</DialogTitle>
            <DialogDescription>Modify fields and database rules for this user</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-2">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="editName">Full Name</Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editNumber">Number (Unique ID)</Label>
                  <Input
                    id="editNumber"
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                    placeholder="Enter user number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editRole">System Access Level</Label>
                  <Select value={editRole} onValueChange={(value: string) => setEditRole(value)}>
                    <SelectTrigger id="editRole">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          <span>Student</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="INSTRUCTOR">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          <span>Instructor</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="ADMIN">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Admin</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User/Admin Confirmation Dialog */}
      <Dialog open={dialogMode === 'delete'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Delete Account Permanently
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this profile? All associated data, including exam
              statistics, submissions, and logs, will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="p-4 rounded-lg bg-muted border space-y-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                    {getInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm text-foreground">{selectedUser.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    #{selectedUser.user_number}
                  </p>
                </div>
              </div>
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground">
                Access level:{' '}
                <span className="font-semibold text-foreground uppercase">{selectedUser.rule}</span>
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Exam Confirmation Dialog */}
      <Dialog open={dialogMode === 'delete_exam'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Delete Published Exam
            </DialogTitle>
            <DialogDescription>
              This action will completely delete the exam and erase all student submissions and
              score histories from the database.
            </DialogDescription>
          </DialogHeader>
          {selectedExam && (
            <div className="p-4 rounded-lg bg-muted border space-y-2">
              <h4 className="font-bold text-sm text-foreground">{selectedExam.title}</h4>
              <p className="text-xs text-muted-foreground">
                Exam code:{' '}
                <span className="font-mono font-semibold text-primary">{selectedExam.code}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Questions count:{' '}
                <span className="font-semibold text-foreground">
                  {selectedExam.questions?.length || 0}
                </span>
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteExam} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Admin Account Dialog */}
      <Dialog open={dialogMode === 'create'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Register Admin Account
            </DialogTitle>
            <DialogDescription>Create a new full administrator account profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="createName">Full Name</Label>
              <Input
                id="createName"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="createNumber">Admin Number (Unique ID)</Label>
              <Input
                id="createNumber"
                value={createNumber}
                onChange={(e) => setCreateNumber(e.target.value)}
                placeholder="Enter unique ID (e.g. 1005)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="createPassword">Account Password</Label>
              <Input
                id="createPassword"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateAdmin} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Register Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
