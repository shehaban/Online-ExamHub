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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
} from 'lucide-react'

type SearchType = 'users' | 'admins'

const USERS_KEY = 'exam_platform_users'

export default function AdminPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<SearchType>('users')
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [searchResults, setSearchResults] = useState<User[]>([])

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
    // Users = students + instructors (non-admin users)
    return allUsers.filter((u) => u.role === 'student' || u.role === 'instructor')
  }, [allUsers, searchType])

  // Search for users when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      // Show all users when search bar is empty
      setSearchResults(filteredUsers)
      return
    }

    const query = searchQuery.toLowerCase().trim()

    const found = filteredUsers.filter(
      (u) =>
        u.number.toLowerCase() === query ||
        u.number.toLowerCase().includes(query) ||
        u.name.toLowerCase().includes(query)
    )

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
            <CardDescription>
              Search for users or admins by their number or name
            </CardDescription>
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
              Searching in {filteredUsers.length}{' '}
              {searchType === 'admins' ? 'admin(s)' : 'user(s)'}
            </p>
          </CardContent>
        </Card>

        {/* Search Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {searchQuery.trim() ? 'Search Results' : `All ${searchType === 'admins' ? 'Admins' : 'Users'}`}
            </CardTitle>
            <CardDescription>
              {searchResults.length > 0
                ? `Found ${searchResults.length} ${searchType === 'admins' ? 'admin' : 'user'}${searchResults.length > 1 ? 's' : ''}${searchQuery.trim() ? ` matching "${searchQuery}"` : ''}`
                : `No ${searchType === 'admins' ? 'admins' : 'users'} found${searchQuery.trim() ? ` matching "${searchQuery}"` : ''}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map((result) => (
                  <Card key={result.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {/* User Header */}
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                          <Avatar className="h-16 w-16 shrink-0">
                            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                              {getInitials(result.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-center sm:text-left space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <h2 className="text-lg font-semibold text-foreground">
                                {result.name}
                              </h2>
                              <Badge
                                variant={result.role === 'admin' ? 'destructive' : result.role === 'instructor' ? 'default' : 'secondary'}
                                className="w-fit mx-auto sm:mx-0"
                              >
                                {result.role === 'admin' ? (
                                  <>
                                    <ShieldCheck className="w-3 h-3 mr-1" />
                                    Admin
                                  </>
                                ) : result.role === 'instructor' ? (
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
                          </div>
                        </div>

                        <Separator />

                        {/* User Details */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
                              <Hash className="w-3 h-3" />
                              {result.role === 'admin' ? 'Admin' : result.role === 'instructor' ? 'Instructor' : 'Student'} Number
                            </Label>
                            <p className="text-sm text-foreground py-1.5 px-2 rounded-md bg-muted font-mono">
                              {result.number}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
                              <CalendarDays className="w-3 h-3" />
                              Joined Date
                            </Label>
                            <p className="text-sm text-foreground py-1.5 px-2 rounded-md bg-muted">
                              {formatDate(result.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* Internal ID */}
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Internal User ID</Label>
                          <p className="text-xs text-muted-foreground py-1.5 px-2 rounded-md bg-muted font-mono break-all">
                            {result.id}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  No {searchType === 'admins' ? 'admins' : 'users'} found{searchQuery.trim() ? ` matching "${searchQuery}"` : ''}.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery.trim() ? 'Try searching with a different term.' : `No ${searchType === 'admins' ? 'admins' : 'users'} have been registered yet.`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
