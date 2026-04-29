"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Plus,
  Search,
  Users,
  Clock,
  BookOpen,
  LogIn,
  Lock,
  Globe,
} from "lucide-react"

interface Room {
  id: string
  name: string
  code: string
  description: string
  host: string
  hostNumber: string
  capacity: number
  enrolled: number
  isPrivate: boolean
  subject: string
  createdAt: string
}

const DEMO_ROOMS: Room[] = [
  {
    id: "1",
    name: "Mathematics Final Exam",
    code: "MATH-2024",
    description: "End-of-semester final covering calculus, linear algebra and statistics.",
    host: "Dr. Sarah Ahmed",
    hostNumber: "INS-00101",
    capacity: 50,
    enrolled: 34,
    isPrivate: false,
    subject: "Mathematics",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "2",
    name: "Physics Midterm",
    code: "PHYS-MID1",
    description: "Covers mechanics, thermodynamics and wave optics.",
    host: "Prof. James Carter",
    hostNumber: "INS-00204",
    capacity: 40,
    enrolled: 28,
    isPrivate: false,
    subject: "Physics",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "3",
    name: "Computer Science Quiz",
    code: "CS-Q3",
    description: "Data structures & algorithms — week 3 quiz.",
    host: "Dr. Layla Hassan",
    hostNumber: "INS-00312",
    capacity: 60,
    enrolled: 55,
    isPrivate: true,
    subject: "Computer Science",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "4",
    name: "English Literature Essay",
    code: "ENG-ESSAY",
    description: "Timed essay exam on 19th century British novels.",
    host: "Ms. Nora Williams",
    hostNumber: "INS-00418",
    capacity: 30,
    enrolled: 22,
    isPrivate: false,
    subject: "English",
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
]

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function RoomsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [search, setSearch] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [createName, setCreateName] = useState("")
  const [createDesc, setCreateDesc] = useState("")
  const [createSubject, setCreateSubject] = useState("")
  const [createPrivate, setCreatePrivate] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [rooms, setRooms] = useState<Room[]>(DEMO_ROOMS)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login")
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

  const filtered = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.subject.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase()),
  )

  const handleJoinByCode = () => {
    if (!joinCode.trim()) return
    router.push(`/exam/${joinCode.trim()}`)
  }

  const handleJoinRoom = (room: Room) => {
    router.push(`/exam/${room.code}`)
  }

  const handleCreateRoom = () => {
    if (!createName.trim() || !createSubject.trim()) return
    const newRoom: Room = {
      id: crypto.randomUUID(),
      name: createName.trim(),
      code: `${createSubject.toUpperCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`,
      description: createDesc.trim() || "No description provided.",
      host: user.name,
      hostNumber: user.number,
      capacity: 50,
      enrolled: 0,
      isPrivate: createPrivate,
      subject: createSubject.trim(),
      createdAt: new Date().toISOString(),
    }
    setRooms((prev) => [newRoom, ...prev])
    setCreateName("")
    setCreateDesc("")
    setCreateSubject("")
    setCreatePrivate(false)
    setCreateOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exam Rooms</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse available rooms or join with a code
            </p>
          </div>
          {user.role === "instructor" && (
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
                    Set up an exam room for your students.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="roomName">Room Name</Label>
                    <Input
                      id="roomName"
                      placeholder="e.g. Calculus Final Exam"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roomSubject">Subject</Label>
                    <Input
                      id="roomSubject"
                      placeholder="e.g. Mathematics"
                      value={createSubject}
                      onChange={(e) => setCreateSubject(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roomDesc">Description (optional)</Label>
                    <Input
                      id="roomDesc"
                      placeholder="Brief description of this exam"
                      value={createDesc}
                      onChange={(e) => setCreateDesc(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="roomPrivate"
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={createPrivate}
                      onChange={(e) => setCreatePrivate(e.target.checked)}
                    />
                    <Label htmlFor="roomPrivate" className="cursor-pointer">
                      Private room (join by code only)
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateRoom} disabled={!createName.trim() || !createSubject.trim()}>
                    Create Room
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Join by code bar */}
        <Card className="mb-8">
          <CardContent className="pt-5 pb-5">
            <p className="text-sm font-medium text-foreground mb-3">Join with a room code</p>
            <div className="flex gap-3">
              <Input
                placeholder="Enter room code e.g. MATH-2024"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
                className="font-mono"
              />
              <Button onClick={handleJoinByCode} disabled={!joinCode.trim()} className="shrink-0">
                <LogIn className="w-4 h-4 mr-2" />
                Join
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, subject or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Rooms grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No rooms found</p>
            <p className="text-sm mt-1">Try a different search term or join with a code above.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((room) => {
              const fill = Math.round((room.enrolled / room.capacity) * 100)
              return (
                <Card key={room.id} className="flex flex-col hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className="text-xs font-mono shrink-0">
                            {room.code}
                          </Badge>
                          {room.isPrivate ? (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Lock className="w-3 h-3" />
                              Private
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Globe className="w-3 h-3" />
                              Open
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-base leading-snug">{room.name}</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2">{room.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 flex flex-col flex-1 justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="w-4 h-4 shrink-0" />
                        <span>{room.subject}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4 shrink-0" />
                        <span>{room.enrolled} / {room.capacity} enrolled</span>
                      </div>
                      {/* Capacity bar */}
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${fill}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          by {room.host} &middot; {room.hostNumber}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(room.createdAt)}
                        </span>
                      </div>
                    </div>
                    <Button
                      className="w-full gap-2"
                      variant={room.isPrivate ? "outline" : "default"}
                      onClick={() => handleJoinRoom(room)}
                    >
                      <LogIn className="w-4 h-4" />
                      {room.isPrivate ? "Join with Code" : "Join Room"}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
