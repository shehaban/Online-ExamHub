'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, type User } from '@/lib/auth-context'
import { apiRequest } from '@/lib/api'
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
  Loader2,
} from 'lucide-react'

type SearchType = 'users' | 'admins'
type DialogMode = 'preview' | 'edit' | 'delete' | 'create' | null

interface ApiUser {
  user_number: string
  name: string
  rule: string
  created_at?: string
}

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<SearchType>('users')
  const [allUsers, setAllUsers] = useState<ApiUser[]>([])
  const [searchResults, setSearchResults] = useState<ApiUser[]>([])
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [error, setError] = useState('')

  // Dialog state
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editNumber, setEditNumber] = useState('')
  const [editRole, setEditRole] = useState<string>('STUDENT')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create admin form state
  const [createName, setCreateName] = useState('')
  const [createNumber, setCreateNumber] = useState('')
  const [createPassword, setCreatePassword] = useState('')

  // Load data from API
  const loadData = async () => {
    setIsDataLoading(true)
    setError('')
    try {
      if (searchType === 'admins') {
        const response = await apiRequest('/admin')
        const admins = response.data.admins || []
        setAllUsers(admins)
        setSearchResults(admins)
      } else {
        const response = await apiRequest('/users')
        const users = response.data.users || []
        setAllUsers(users)
        setSearchResults(users)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      setAllUsers([])
      setSearchResults([])
    } finally {
      setIsDataLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user && user.role === 'admin') {
      loadData()
    }
  }, [searchType, authLoading, user])

  // Search for users when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(allUsers)
      return
    }

    const query = searchQuery.toLowerCase().trim()

    const found = allUsers.filter((u) => {
      const number = String(u.user_number || '')
      const name = String(u.name || '').toLowerCase()

      return number.includes(query) || name.includes(query)
    })

    setSearchResults(found)
  }, [searchQuery, allUsers])

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

  const openCreate = () => {
    setDialogMode('create')
  }

  const closeDialog = () => {
    setDialogMode(null)
    setSelectedUser(null)
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

      // If role changed to admin while in users tab, switch to admins tab
      if (newRole === 'ADMIN' && searchType === 'users') {
        setSearchType('admins')
        // Data will reload via useEffect when searchType changes
      }
      // If role changed from admin while in admins tab, switch to users tab
      else if (newRole !== 'ADMIN' && searchType === 'admins') {
        setSearchType('users')
        // Data will reload via useEffect when searchType changes
      } else {
        // Just reload current tab
        await loadData()
      }
      closeDialog()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
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

      // If we're not already on the admins tab, switch to it
      if (searchType !== 'admins') {
        setSearchType('admins')
      } else {
        await loadData()
      }
      closeDialog()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin')
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <Badge variant="destructive" className="w-fit">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        )
      case 'TEACHER':
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
              Searching in {allUsers.length} {searchType === 'admins' ? 'admin(s)' : 'user(s)'}
            </p>
          </CardContent>
        </Card>

        {/* Search Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {searchQuery.trim()
                  ? 'Search Results'
                  : `All ${searchType === 'admins' ? 'Admins' : 'Users'}`}
              </CardTitle>
              {searchType === 'admins' && (
                <Button size="sm" onClick={openCreate} className="h-8">
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Add New Admin
                </Button>
              )}
            </div>
            <CardDescription>
              {searchResults.length > 0
                ? `Found ${searchResults.length} ${searchType === 'admins' ? 'admin' : 'user'}${searchResults.length > 1 ? 's' : ''}${searchQuery.trim() ? ` matching "${searchQuery}"` : ''}`
                : `No ${searchType === 'admins' ? 'admins' : 'users'} found${searchQuery.trim() ? ` matching "${searchQuery}"` : ''}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isDataLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <AlertCircle className="w-6 h-6 text-destructive mb-2" />
                <p className="text-destructive">{error}</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <div
                    key={result.user_number}
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
                        <p className="text-sm text-muted-foreground font-mono">
                          {result.user_number}
                        </p>
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
                  {getRoleBadge(selectedUser.rule)}
                </div>
              </div>

              <Separator />

              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Hash className="w-3 h-3" />
                    {selectedUser.rule?.toUpperCase() === 'ADMIN'
                      ? 'Admin'
                      : selectedUser.rule?.toUpperCase() === 'TEACHER'
                        ? 'Instructor'
                        : 'Student'}{' '}
                    Number
                  </Label>
                  <p className="text-sm py-1.5 px-2 rounded-md bg-muted font-mono">
                    {selectedUser.user_number}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <UserIcon className="w-3 h-3" />
                    Role
                  </Label>
                  <p className="text-sm py-1.5 px-2 rounded-md bg-muted capitalize">
                    {selectedUser.rule}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <CalendarDays className="w-3 h-3" />
                    Joined Date
                  </Label>
                  <p className="text-sm py-1.5 px-2 rounded-md bg-muted">
                    {formatDate(selectedUser.created_at)}
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
                    {editNumber || selectedUser.user_number}
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
                      <SelectItem value="TEACHER">
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

      {/* Delete Dialog */}
      <Dialog open={dialogMode === 'delete'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Delete {selectedUser?.rule?.toUpperCase() === 'ADMIN' ? 'Admin' : 'User'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this{' '}
              {selectedUser?.rule?.toUpperCase() === 'ADMIN' ? 'admin' : 'user'}? This action cannot
              be undone.
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
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedUser.user_number}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {selectedUser?.rule?.toUpperCase() === 'ADMIN' ? 'Delete Admin' : 'Yes, Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Admin Dialog */}
      <Dialog open={dialogMode === 'create'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
            <DialogDescription>Create a new administrator account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="createName">Full Name</Label>
              <Input
                id="createName"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Enter admin name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="createNumber">Admin Number</Label>
              <Input
                id="createNumber"
                value={createNumber}
                onChange={(e) => setCreateNumber(e.target.value)}
                placeholder="Enter admin number (e.g. 1001)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="createPassword">Password</Label>
              <Input
                id="createPassword"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Enter temporary password"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateAdmin} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
