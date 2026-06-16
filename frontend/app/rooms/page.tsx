'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiRequest } from '@/lib/api'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Search,
  Users,
  Clock,
  LogIn,
  Lock,
  Globe,
  Trash2,
  Loader2,
  DoorOpen,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react'

interface Room {
  room_id: number
  name: string
  teacher_id: number
  visibility: 'public' | 'private'
  room_code: string | null
  capacity: number | null
  created_at: string
  teacher_name?: string
  teacher_number?: string
  member_count?: number
  is_member?: number | boolean
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function RoomsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // Data states
  const [allRooms, setAllRooms] = useState<Room[]>([])
  const [myRooms, setMyRooms] = useState<Room[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')

  // Search
  const [search, setSearch] = useState('')

  // Create room dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createVisibility, setCreateVisibility] = useState<'public' | 'private'>('public')
  const [createCode, setCreateCode] = useState('')
  const [createCapacity, setCreateCapacity] = useState('')
  const [creating, setCreating] = useState(false)

  // Join by code dialog
  const [joinDialogOpen, setJoinDialogOpen] = useState(false)
  const [joinRoomId, setJoinRoomId] = useState<number | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  // Copied code state
  const [copiedId, setCopiedId] = useState<number | null>(null)

  // Active tab
  const [activeTab, setActiveTab] = useState('all')

  const isTeacher = user?.role === 'instructor'
  const isAdmin = user?.role === 'admin'

  // ─── Fetch rooms ────────────────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    setDataLoading(true)
    setError('')
    try {
      const res = await apiRequest('/rooms')
      setAllRooms(res.data.rooms)

      if (isTeacher) {
        const myRes = await apiRequest('/rooms/my-rooms')
        setMyRooms(myRes.data.rooms)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms')
    } finally {
      setDataLoading(false)
    }
  }, [isTeacher])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
      return
    }
    if (user) {
      fetchRooms()
    }
  }, [user, isLoading, router, fetchRooms])

  // ─── Create room ───────────────────────────────────────────────────────
  const handleCreateRoom = async () => {
    if (!createName.trim()) return
    setCreating(true)
    setError('')
    try {
      await apiRequest('/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: createName.trim(),
          visibility: createVisibility,
          room_code: createVisibility === 'private' ? createCode || undefined : undefined,
          capacity: createCapacity ? parseInt(createCapacity) : undefined,
        }),
      })
      setCreateOpen(false)
      setCreateName('')
      setCreateVisibility('public')
      setCreateCode('')
      setCreateCapacity('')
      await fetchRooms()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
    } finally {
      setCreating(false)
    }
  }

  // ─── Delete room ──────────────────────────────────────────────────────
  const handleDeleteRoom = async (roomId: number) => {
    if (!confirm('Are you sure you want to delete this room? All messages and files will be lost.'))
      return
    try {
      await apiRequest(`/rooms/${roomId}`, { method: 'DELETE' })
      await fetchRooms()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete room')
    }
  }

  // ─── Join room ────────────────────────────────────────────────────────
  const handleJoinRoom = async (room: Room) => {
    if (room.visibility === 'private') {
      setJoinRoomId(room.room_id)
      setJoinCode('')
      setJoinError('')
      setJoinDialogOpen(true)
      return
    }

    setJoining(true)
    try {
      await apiRequest(`/rooms/${room.room_id}/join`, { method: 'POST', body: JSON.stringify({}) })
      router.push(`/rooms/${room.room_id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to join'
      if (msg.includes('already a member') || msg.includes('owner')) {
        router.push(`/rooms/${room.room_id}`)
      } else {
        setError(msg)
      }
    } finally {
      setJoining(false)
    }
  }

  const handleJoinPrivate = async () => {
    if (!joinRoomId) return
    setJoining(true)
    setJoinError('')
    try {
      await apiRequest(`/rooms/${joinRoomId}/join`, {
        method: 'POST',
        body: JSON.stringify({ room_code: joinCode }),
      })
      setJoinDialogOpen(false)
      router.push(`/rooms/${joinRoomId}`)
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Invalid room code')
    } finally {
      setJoining(false)
    }
  }

  // ─── Enter room (teacher) ────────────────────────────────────────────
  const handleEnterRoom = (roomId: number) => {
    router.push(`/rooms/${roomId}`)
  }

  // ─── Copy code ────────────────────────────────────────────────────────
  const handleCopyCode = (roomId: number, code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(roomId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ─── Filter ───────────────────────────────────────────────────────────
  const filterRooms = (rooms: Room[]) =>
    rooms.filter(
      (r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.room_code && r.room_code.toLowerCase().includes(search.toLowerCase())) ||
        (r.teacher_name && r.teacher_name.toLowerCase().includes(search.toLowerCase()))
    )

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  const filteredAll = filterRooms(allRooms)
  const filteredMy = filterRooms(myRooms)
  const joinedRooms = allRooms.filter((r) => r.is_member)
  const filteredJoined = filterRooms(joinedRooms)

  // ─── Room card renderer ───────────────────────────────────────────────
  const renderRoomCard = (room: Room, isOwnerView = false) => {
    const isCardOwner = room.teacher_id === Number(user?.id)
    const fill = room.capacity ? Math.round(((room.member_count || 0) / room.capacity) * 100) : null

    return (
      <Card
        key={room.room_id}
        className="group flex flex-col hover:shadow-lg transition-all duration-300 hover:border-primary/20"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                {room.visibility === 'private' ? (
                  <Badge
                    variant="secondary"
                    className="text-xs gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  >
                    <Lock className="w-3 h-3" />
                    Private
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="text-xs gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  >
                    <Globe className="w-3 h-3" />
                    Public
                  </Badge>
                )}
                {room.room_code && (isOwnerView || isAdmin || isCardOwner) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopyCode(room.room_id, room.room_code!)
                    }}
                    className="flex items-center gap-1 text-xs font-mono bg-muted px-2 py-0.5 rounded-md hover:bg-muted/80 transition-colors cursor-pointer"
                    title="Click to copy code"
                  >
                    {copiedId === room.room_id ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {room.room_code}
                  </button>
                )}
              </div>
              <CardTitle className="text-base leading-snug">{room.name}</CardTitle>
            </div>
            {(isOwnerView || isAdmin || isCardOwner) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteRoom(room.room_id)
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col flex-1 justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4 shrink-0" />
              <span>
                {room.member_count || 0}
                {room.capacity ? ` / ${room.capacity}` : ''} members
              </span>
            </div>
            {fill !== null && (
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(fill, 100)}%` }}
                />
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {!isOwnerView && room.teacher_name && <span>by {room.teacher_name}</span>}
              <span className="flex items-center gap-1 ml-auto">
                <Clock className="w-3 h-3" />
                {timeAgo(room.created_at)}
              </span>
            </div>
          </div>
          {isOwnerView || room.is_member || isCardOwner ? (
            <Button className="w-full gap-2" onClick={() => handleEnterRoom(room.room_id)}>
              <DoorOpen className="w-4 h-4" />
              Enter Room
            </Button>
          ) : (
            <Button
              className="w-full gap-2"
              variant={room.visibility === 'private' ? 'outline' : 'default'}
              onClick={() => handleJoinRoom(room)}
              disabled={joining}
            >
              <LogIn className="w-4 h-4" />
              {room.visibility === 'private' ? 'Join with Code' : 'Join Room'}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rooms</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isTeacher
                ? 'Manage your rooms or browse others'
                : 'Browse available rooms or join with a code'}
            </p>
          </div>
          {isTeacher && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 shrink-0">
                  <Plus className="w-4 h-4" />
                  Create Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a new room</DialogTitle>
                  <DialogDescription>
                    Set up a room for your students to receive messages and files.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="createRoomName">Room Name</Label>
                    <Input
                      id="createRoomName"
                      placeholder="e.g. Data Structures — Section A"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Visibility</Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={createVisibility === 'public' ? 'default' : 'outline'}
                        className="flex-1 gap-2"
                        onClick={() => setCreateVisibility('public')}
                      >
                        <Globe className="w-4 h-4" />
                        Public
                      </Button>
                      <Button
                        type="button"
                        variant={createVisibility === 'private' ? 'default' : 'outline'}
                        className="flex-1 gap-2"
                        onClick={() => setCreateVisibility('private')}
                      >
                        <Lock className="w-4 h-4" />
                        Private
                      </Button>
                    </div>
                  </div>
                  {createVisibility === 'private' && (
                    <div className="space-y-2">
                      <Label htmlFor="createRoomCode">
                        Room Code{' '}
                        <span className="text-muted-foreground font-normal">
                          (leave empty to auto-generate)
                        </span>
                      </Label>
                      <Input
                        id="createRoomCode"
                        placeholder="e.g. MY-SECRET"
                        value={createCode}
                        onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                        className="font-mono"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="createRoomCapacity">
                      Capacity <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="createRoomCapacity"
                      type="number"
                      placeholder="e.g. 50"
                      value={createCapacity}
                      onChange={(e) => setCreateCapacity(e.target.value)}
                      min={1}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateRoom} disabled={!createName.trim() || creating}>
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Room'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
            <button className="ml-2 underline hover:no-underline" onClick={() => setError('')}>
              Dismiss
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or teacher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        {dataLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : isTeacher ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Rooms</TabsTrigger>
              <TabsTrigger value="mine">
                My Rooms
                {myRooms.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {myRooms.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              {filteredAll.length === 0 ? (
                <EmptyState message="No rooms found" />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredAll.map((room) => renderRoomCard(room, false))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="mine">
              {filteredMy.length === 0 ? (
                <EmptyState message="You haven't created any rooms yet" />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredMy.map((room) => renderRoomCard(room, true))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : isAdmin ? (
          // Admin view — single list of all rooms
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-primary flex items-center justify-between gap-4">
              <span className="text-sm font-semibold">
                🛡️ You are viewing the dashboard as an Admin. You have bypass access to all rooms
                and passcode copy/delete privileges.
              </span>
            </div>
            {filteredAll.length === 0 ? (
              <EmptyState message="No rooms available" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredAll.map((room) => renderRoomCard(room, false))}
              </div>
            )}
          </div>
        ) : (
          // Student view — tabbed lists
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Rooms</TabsTrigger>
              <TabsTrigger value="joined">
                Joined Rooms
                {joinedRooms.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {joinedRooms.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              {filteredAll.length === 0 ? (
                <EmptyState message="No rooms available" />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredAll.map((room) => renderRoomCard(room, false))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="joined">
              {filteredJoined.length === 0 ? (
                <EmptyState message="You haven't joined any rooms yet" />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredJoined.map((room) => renderRoomCard(room, false))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Private room join dialog */}
        <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enter Room Code</DialogTitle>
              <DialogDescription>
                This is a private room. Enter the code provided by the teacher to join.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Input
                placeholder="Enter room code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinPrivate()}
                className="font-mono text-center text-lg tracking-widest"
                autoFocus
              />

              {joinError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex items-center gap-2 animate-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{joinError}</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleJoinPrivate} disabled={!joinCode.trim() || joining}>
                {joining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Joining...
                  </>
                ) : (
                  'Join Room'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <DoorOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p className="font-medium">{message}</p>
      <p className="text-sm mt-1">Try a different search or create a new room.</p>
    </div>
  )
}
