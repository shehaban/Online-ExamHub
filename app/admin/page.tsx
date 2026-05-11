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
  const [searchResult, setSearchResult] = useState<User | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

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

  // Search for user when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResult(null)
      setHasSearched(false)
      return
    }

    setHasSearched(true)
    const query = searchQuery.toLowerCase().trim()

    const found = filteredUsers.find(
      (u) =>
        u.number.toLowerCase() === query ||
        u.number.toLowerCase().includes(query) ||
        u.name.toLowerCase().includes(query)
    )

    setSearchResult(found || null)
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
                    setSearchResult(null)
                    setHasSearched(false)
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
        {hasSearched && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Search Results</CardTitle>
              <CardDescription>
                {searchResult
                  ? `Found ${searchType === 'admins' ? 'admin' : 'user'} matching your search`
                  : `No ${searchType === 'admins' ? 'admin' : 'user'} found matching "${searchQuery}"`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {searchResult ? (
                <div className="space-y-6">
                  {/* User Header */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <Avatar className="h-20 w-20 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                        {getInitials(searchResult.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <h2 className="text-xl font-semibold text-foreground">
                          {searchResult.name}
                        </h2>
                        <Badge
                          variant={searchResult.role === 'admin' ? 'destructive' : searchResult.role === 'instructor' ? 'default' : 'secondary'}
                          className="w-fit mx-auto sm:mx-0"
                        >
                          {searchResult.role === 'admin' ? (
                            <>
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Admin
                            </>
                          ) : searchResult.role === 'instructor' ? (
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-muted-foreground">
                        <UserIcon className="w-4 h-4" />
                        Full Name
                      </Label>
                      <p className="text-sm text-foreground py-2 px-3 rounded-md bg-muted">
                        {searchResult.name}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-muted-foreground">
                        <Hash className="w-4 h-4" />
                        {searchResult.role === 'admin' ? 'Admin' : searchResult.role === 'instructor' ? 'Instructor' : 'Student'} Number
                      </Label>
                      <p className="text-sm text-foreground py-2 px-3 rounded-md bg-muted font-mono">
                        {searchResult.number}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-muted-foreground">
                        <ShieldCheck className="w-4 h-4" />
                        Role
                      </Label>
                      <p className="text-sm text-foreground py-2 px-3 rounded-md bg-muted capitalize">
                        {searchResult.role}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-muted-foreground">
                        <CalendarDays className="w-4 h-4" />
                        Joined Date
                      </Label>
                      <p className="text-sm text-foreground py-2 px-3 rounded-md bg-muted">
                        {formatDate(searchResult.createdAt)}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Internal ID */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Internal User ID</Label>
                    <p className="text-xs text-muted-foreground py-2 px-3 rounded-md bg-muted font-mono break-all">
                      {searchResult.id}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    No {searchType === 'admins' ? 'admin' : 'user'} found with that number or name.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try searching with a different term.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!hasSearched && (
          <Card>
            <CardContent className="py-10">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Enter a {searchType === 'admins' ? 'instructor' : 'student'} number or name to
                  search
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Results will appear here
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
