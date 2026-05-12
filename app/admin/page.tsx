'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, type User } from '@/lib/auth-context'
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
} from 'lucide-react'

type SearchType = 'users' | 'admins'
type DialogMode = 'preview' | 'edit' | 'delete' | null

const USERS_KEY = 'exam_platform_users'
const PASSWORDS_KEY = 'exam_platform_users_passwords'

export default function AdminPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<SearchType>('users')
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [searchResults, setSearchResults] = useState<User[]>([])

  // Dialog state
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editNumber, setEditNumber] = useState('')
  const [editRole, setEditRole] = useState<User['role']>('student')

  // Delete confirmation state
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')

  // Load all users from localStorage
  useEffect(() => {
    const loadUsers = () => {
      if (typeof window === 'undefined') return
      const stored = localStorage.getItem(USERS_KEY)
      if (stored) {
        try {
          const users = JSON.parse(stored) as User[]
          setAllUsers(users)
        } catch {
          setAllUsers([])
        }
      }
    }
    loadUsers()
  }, [])

  // Filter users based on search type
  const filteredUsers = useMemo(() => {
    if (searchType === 'admins') {
      return allUsers.filter((u) => u.role === 'admin')
    }
    return allUsers.filter((u) => u.role === 'student' || u.role === 'instructor')
  }, [allUsers, searchType])

  // Search for users when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(filteredUsers)
      return
    }

    const query = searchQuery.toLowerCase().trim()

    const found = filteredUsers.filter((u) => {
      const number = String(u.number || '')
      const name = String(u.name || '').toLowerCase()

      return number.includes(query) || name.includes(query)
    })

    setSearchResults(found)
  }, [searchQuery, filteredUsers])

  // Redirect if not logged in or not an admin
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
    }
    if (!isLoading && user && user.role !== 'admin') {
      router.push('/')
    }
  }, [user, isLoading, router])

  const openPreview = (u: User) => {
    setSelectedUser(u)
    setDialogMode('preview')
  }

  const openEdit = (u: User) => {
    setSelectedUser(u)
    setEditName(u.name)
    setEditNumber(u.number)
    setEditRole(u.role)
    setDialogMode('edit')
  }

  const openDelete = (u: User) => {
    setSelectedUser(u)
    setDeletePassword('')
    setDeleteError('')
    setDialogMode('delete')
  }

  const closeDialog = () => {
    setDialogMode(null)
    setSelectedUser(null)
    setEditName('')
    setEditNumber('')
    setEditRole('student')
    setDeletePassword('')
    setDeleteError('')
  }

  const handleSaveEdit = () => {
    if (!selectedUser) return

    const users = [...allUsers]
    const idx = users.findIndex((u) => u.id === selectedUser.id)
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        name: editName,
        number: editNumber,
        role: editRole,
      }
      localStorage.setItem(USERS_KEY, JSON.stringify(users))
      setAllUsers(users)
    }
    closeDialog()
  }

  const handleDelete = () => {
    if (!selectedUser) return

    // For admins, verify password
    if (selectedUser.role === 'admin') {
      const passwords = JSON.parse(localStorage.getItem(PASSWORDS_KEY) || '{}')
      const adminPassword = passwords[user?.id || '']

      if (deletePassword !== adminPassword) {
        setDeleteError('Incorrect admin password')
        return
      }
    }

    // Delete the user
    const users = allUsers.filter((u) => u.id !== selectedUser.id)
    localStorage.setItem(USERS_KEY, JSON.stringify(users))

    // Also remove their password
    const passwords = JSON.parse(localStorage.getItem(PASSWORDS_KEY) || '{}')
    delete passwords[selectedUser.id]
    localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords))

    setAllUsers(users)
    closeDialog()
  }

  if (isLoading || !user || user.role !== 'admin') {
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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  const getRoleBadge = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return (
          <Badge variant="destructive" className="w-fit">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        )
      case 'instructor':
        return (
          <Badge variant="default" className="w-fit">
            <BookOpen className="w-3 h-3 mr-1" />
            Instructor
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="w-fit">
            <GraduationCap className="w-3 h-3 mr-1" />
            Student
          </Badge>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Search and manage users</p>
          </div>
        </div>

        {/* Search Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </CardTitle>
            <CardDescription>Search for users or admins by their number or name</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Type Dropdown */}
              <div className="space-y-2 sm:w-48">
                <Label htmlFor="searchType">Search For</Label>
                <Select
                  value={searchType}
                  onValueChange={(value: SearchType) => {
                    setSearchType(value)
                    setSearchQuery('')
                  }}
                >
                  <SelectTrigger id="searchType" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="users">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Users</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admins">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Admins</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search Input */}
              <div className="space-y-2 flex-1">
                <Label htmlFor="searchQuery">
                  {searchType === 'admins' ? 'Admin' : 'User'} Number or Name
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="searchQuery"
                    placeholder={`Enter ${searchType === 'admins' ? 'admin' : 'user'} number or name...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Searching in {filteredUsers.length} {searchType === 'admins' ? 'admin(s)' : 'user(s)'}
            </p>
          </CardContent>
        </Card>

        {/* Search Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {searchQuery.trim()
                ? 'Search Results'
                : `All ${searchType === 'admins' ? 'Admins' : 'Users'}`}
            </CardTitle>
            <CardDescription>
              {searchResults.length > 0
                ? `Found ${searchResults.length} ${searchType === 'admins' ? 'admin' : 'user'}${searchResults.length > 1 ? 's' : ''}${searchQuery.trim() ? ` matching "${searchQuery}"` : ''}`
                : `No ${searchType === 'admins' ? 'admins' : 'users'} found${searchQuery.trim() ? ` matching "${searchQuery}"` : ''}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                          {getInitials(result.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{result.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">{result.number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openPreview(result)}
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(result)}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openDelete(result)}
                        title="Delete"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  No {searchType === 'admins' ? 'admins' : 'users'} found
                  {searchQuery.trim() ? ` matching "${searchQuery}"` : ''}.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery.trim()
                    ? 'Try searching with a different term.'
                    : `No ${searchType === 'admins' ? 'admins' : 'users'} have been registered yet.`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Preview Dialog */}
      <Dialog open={dialogMode === 'preview'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Viewing information for this user</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                    {getInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                  {getRoleBadge(selectedUser.role)}
                </div>
              </div>

              <Separator />

              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Hash className="w-3 h-3" />
                    {selectedUser.role === 'admin'
                      ? 'Admin'
                      : selectedUser.role === 'instructor'
                        ? 'Instructor'
                        : 'Student'}{' '}
                    Number
                  </Label>
                  <p className="text-sm py-1.5 px-2 rounded-md bg-muted font-mono">
                    {selectedUser.number}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <UserIcon className="w-3 h-3" />
                    Role
                  </Label>
                  <p className="text-sm py-1.5 px-2 rounded-md bg-muted capitalize">
                    {selectedUser.role}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <CalendarDays className="w-3 h-3" />
                    Joined Date
                  </Label>
                  <p className="text-sm py-1.5 px-2 rounded-md bg-muted">
                    {formatDate(selectedUser.createdAt)}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Internal User ID</Label>
                  <p className="text-xs text-muted-foreground py-1.5 px-2 rounded-md bg-muted font-mono break-all">
                    {selectedUser.id}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={dialogMode === 'edit'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Make changes to user information</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                    {getInitials(editName || selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{editName || selectedUser.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {editNumber || selectedUser.number}
                  </p>
                </div>
              </div>

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
                  <Label htmlFor="editNumber">Number</Label>
                  <Input
                    id="editNumber"
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                    placeholder="Enter number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editRole">Role</Label>
                  <Select
                    value={editRole}
                    onValueChange={(value: User['role']) => setEditRole(value)}
                  >
                    <SelectTrigger id="editRole">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          <span>Student</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="instructor">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          <span>Instructor</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
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
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={dialogMode === 'delete'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Delete {selectedUser?.role === 'admin' ? 'Admin' : 'User'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.role === 'admin'
                ? 'Enter your admin password to confirm deletion of this admin account.'
                : 'Are you sure you want to delete this user? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                    {getInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedUser.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">{selectedUser.number}</p>
                </div>
              </div>

              {selectedUser.role === 'admin' && (
                <div className="space-y-2">
                  <Label htmlFor="deletePassword">Your Admin Password</Label>
                  <Input
                    id="deletePassword"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value)
                      setDeleteError('')
                    }}
                    placeholder="Enter your password to confirm"
                  />
                  {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {selectedUser?.role === 'admin' ? 'Delete Admin' : 'Yes, Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
