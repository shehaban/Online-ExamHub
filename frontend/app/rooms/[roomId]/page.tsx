'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiRequest, apiUpload } from '@/lib/api'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Send,
  UploadCloud,
  File,
  Download,
  Trash2,
  Users,
  Lock,
  Globe,
  Clock,
  Copy,
  Check,
  Loader2,
  LogOut,
  RefreshCw,
  FileText,
  AlertCircle,
  FileSpreadsheet,
  Settings,
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
  is_owner?: boolean
}

interface Member {
  user_id: number
  user_number: string
  name: string
  joined_at: string
}

interface Message {
  message_id: number
  room_id: number
  sender_id: number
  content: string
  created_at: string
  sender_name: string
  sender_role: string
}

interface FileUpload {
  file_id: number
  room_id: number
  uploaded_by: number
  file_name: string
  file_url: string
  file_size: number
  uploaded_at: string
  uploader_name: string
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

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export default function RoomDetailPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const roomId = params.roomId as string

  // Data states
  const [room, setRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [files, setFiles] = useState<FileUpload[]>([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('messages')

  // Settings edit state
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editVisibility, setEditVisibility] = useState<'public' | 'private'>('public')
  const [editCode, setEditCode] = useState('')
  const [editCapacity, setEditCapacity] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  // Chat message state
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false)
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Scroll ref for chat
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const isTeacher = user?.role === 'instructor'

  const getBaseUrl = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
    return apiUrl.replace('/api', '')
  }

  // ─── Fetch All Room Data ───────────────────────────────────────────────
  const fetchRoomDetails = useCallback(async () => {
    try {
      const res = await apiRequest(`/rooms/${roomId}`)
      setRoom(res.data.room)
      setMembers(res.data.members)
      return res.data.room
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room details')
      setLoading(false)
      return null
    }
  }, [roomId])

  const fetchMessages = useCallback(
    async (silent = false) => {
      try {
        const res = await apiRequest(`/rooms/${roomId}/messages?limit=100`)
        setMessages(res.data.messages)
      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : 'Failed to load messages')
        }
      }
    },
    [roomId]
  )

  const fetchFiles = useCallback(
    async (silent = false) => {
      try {
        const res = await apiRequest(`/rooms/${roomId}/files`)
        setFiles(res.data.files)
      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : 'Failed to load files')
        }
      }
    },
    [roomId]
  )

  // Full Initial Fetch
  const loadAllData = useCallback(async () => {
    setLoading(true)
    setError('')
    const roomDetails = await fetchRoomDetails()
    if (roomDetails) {
      await Promise.all([fetchMessages(), fetchFiles()])
    }
    setLoading(false)
  }, [fetchRoomDetails, fetchMessages, fetchFiles])

  // Initial Load
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
      return
    }
    if (user && roomId) {
      loadAllData()
    }
  }, [user, isLoading, roomId, router, loadAllData])

  // Auto scroll to bottom of chat
  const scrollToBottom = useCallback((force = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: force ? 'auto' : 'smooth' })
    }
  }, [])

  // Auto-scroll on new messages if loaded
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true)
    }
  }, [messages.length, scrollToBottom])

  // Message Polling Setup (every 4 seconds)
  useEffect(() => {
    if (!user || !roomId) return

    const interval = setInterval(() => {
      fetchMessages(true)
    }, 4000)

    return () => clearInterval(interval)
  }, [user, roomId, fetchMessages])

  // ─── Actions ─────────────────────────────────────────────────────────────

  // Open Settings Dialog and populate values
  const openSettings = () => {
    if (!room) return
    setEditName(room.name)
    setEditVisibility(room.visibility)
    setEditCode(room.room_code || '')
    setEditCapacity(room.capacity ? String(room.capacity) : '')
    setSettingsOpen(true)
  }

  // Save updated room settings
  const handleSaveSettings = async () => {
    if (!editName.trim()) return
    setSavingSettings(true)
    setError('')
    try {
      const res = await apiRequest(`/rooms/${roomId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName.trim(),
          visibility: editVisibility,
          room_code: editVisibility === 'private' ? editCode || undefined : undefined,
          capacity: editCapacity ? parseInt(editCapacity) : null,
        }),
      })
      setRoom(res.data.room)
      setSettingsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings')
    } finally {
      setSavingSettings(false)
    }
  }

  // Remove room member
  const handleRemoveMember = async (studentId: number) => {
    if (!confirm('Are you sure you want to remove this member from the room?')) return
    setError('')
    try {
      await apiRequest(`/rooms/${roomId}/members/${studentId}`, { method: 'DELETE' })
      setMembers((prev) => prev.filter((m) => m.user_id !== studentId))
      setRoom((prev) =>
        prev ? { ...prev, member_count: Math.max((prev.member_count || 1) - 1, 1) } : null
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  // Delete message
  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    setError('')
    try {
      await apiRequest(`/rooms/${roomId}/messages/${messageId}`, { method: 'DELETE' })
      setMessages((prev) => prev.filter((m) => m.message_id !== messageId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete message')
    }
  }

  // Delete file
  const handleDeleteFile = async (fileId: number) => {
    if (!confirm('Are you sure you want to delete this file?')) return
    setError('')
    try {
      await apiRequest(`/rooms/${roomId}/files/${fileId}`, { method: 'DELETE' })
      setFiles((prev) => prev.filter((f) => f.file_id !== fileId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file')
    }
  }

  // Copy Room Code
  const handleCopyCode = () => {
    if (!room?.room_code) return
    navigator.clipboard.writeText(room.room_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Leave Room
  const handleLeaveRoom = async () => {
    if (
      !confirm(
        'Are you sure you want to leave this room? You will need the room code to join again if it is private.'
      )
    ) {
      return
    }
    try {
      await apiRequest(`/rooms/${roomId}/leave`, { method: 'POST', body: JSON.stringify({}) })
      router.push('/rooms')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave room')
    }
  }

  // Delete Room
  const handleDeleteRoom = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this room? This will permanently delete all messages and files uploaded to it.'
      )
    ) {
      return
    }
    try {
      await apiRequest(`/rooms/${roomId}`, { method: 'DELETE' })
      router.push('/rooms')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete room')
    }
  }

  // Send Message (Teacher Only)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || sendingMessage) return

    setSendingMessage(true)
    try {
      await apiRequest(`/rooms/${roomId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: messageText.trim() }),
      })
      setMessageText('')
      await fetchMessages(true)
      setTimeout(() => scrollToBottom(false), 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  // File Upload (Teacher Only)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // 50MB file size limit validation
    if (selectedFile.size > 50 * 1024 * 1024) {
      setFileError('File size exceeds the 50 MB limit.')
      return
    }

    setUploadingFile(true)
    setFileError('')
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      await apiUpload(`/rooms/${roomId}/files`, formData)
      await fetchFiles(true)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploadingFile(false)
    }
  }

  // Quick helper to determine icon based on file extension
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-rose-500 shrink-0 animate-pulse" />
      case 'doc':
      case 'docx':
        return <FileText className="w-8 h-8 text-blue-500 shrink-0" />
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="w-8 h-8 text-emerald-500 shrink-0" />
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
        return <FileText className="w-8 h-8 text-cyan-500 shrink-0" />
      default:
        return <File className="w-8 h-8 text-amber-500 shrink-0" />
    }
  }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="space-y-6">
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            <div className="h-24 bg-muted animate-pulse rounded-lg" />
            <div className="h-96 bg-muted animate-pulse rounded-lg" />
          </div>
        </main>
      </div>
    )
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-lg text-center">
          <div className="p-6 bg-card rounded-2xl border shadow-xl flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h2 className="text-xl font-bold text-foreground">Failed to enter room</h2>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
            <Button className="mt-6 gap-2" onClick={() => router.push('/rooms')}>
              <ArrowLeft className="w-4 h-4" />
              Back to Rooms
            </Button>
          </div>
        </main>
      </div>
    )
  }

  if (!room) return null

  const isOwner = room.is_owner || room.teacher_id === Number(user.id)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl flex flex-col gap-6">
        {/* Back and actions header */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/rooms')}
            className="gap-2 hover:bg-accent/40"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Rooms
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              title="Refresh"
              onClick={() => loadAllData()}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            {isOwner && (
              <Button variant="outline" className="gap-2" onClick={openSettings}>
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            )}

            {isOwner ? (
              <Button variant="destructive" className="gap-2" onClick={handleDeleteRoom}>
                <Trash2 className="w-4 h-4" />
                Delete Room
              </Button>
            ) : (
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 hover:border-destructive/30"
                onClick={handleLeaveRoom}
              >
                <LogOut className="w-4 h-4" />
                Leave Room
              </Button>
            )}
          </div>
        </div>

        {/* Room Header Info Card */}
        <Card className="overflow-hidden border-primary/10 bg-gradient-to-r from-card to-card/50 shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {room.visibility === 'private' ? (
                    <Badge
                      variant="secondary"
                      className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    >
                      <Lock className="w-3 h-3" />
                      Private
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    >
                      <Globe className="w-3 h-3" />
                      Public
                    </Badge>
                  )}
                  {room.room_code && isOwner && (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono gap-1.5 py-0.5 bg-muted text-foreground"
                      >
                        Passcode: {room.room_code}
                      </Badge>
                      <button
                        onClick={handleCopyCode}
                        className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                        title="Copy Room Code"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{room.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Created by{' '}
                  <span className="font-semibold text-foreground">
                    {room.teacher_name || 'Instructor'}
                  </span>{' '}
                  • Code: {room.teacher_number || 'N/A'}
                </p>
              </div>

              <div className="flex gap-6 shrink-0 md:border-l md:pl-6 border-border">
                <div className="text-center md:text-left">
                  <span className="text-xs text-muted-foreground block font-medium uppercase tracking-wider">
                    Members
                  </span>
                  <span className="text-2xl font-extrabold flex items-center gap-1.5 justify-center md:justify-start mt-0.5">
                    <Users className="w-5 h-5 text-primary" />
                    {room.member_count || 1}
                    {room.capacity ? (
                      <span className="text-sm font-normal text-muted-foreground">
                        /{room.capacity}
                      </span>
                    ) : (
                      ''
                    )}
                  </span>
                </div>
                <div className="text-center md:text-left">
                  <span className="text-xs text-muted-foreground block font-medium uppercase tracking-wider">
                    Files
                  </span>
                  <span className="text-2xl font-extrabold mt-0.5 block">{files.length}</span>
                </div>
                <div className="text-center md:text-left">
                  <span className="text-xs text-muted-foreground block font-medium uppercase tracking-wider">
                    Messages
                  </span>
                  <span className="text-2xl font-extrabold mt-0.5 block">{messages.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </span>
            <button
              className="text-xs font-semibold underline hover:no-underline hover:text-destructive/80"
              onClick={() => setError('')}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Tabbed Workspace */}
        <div className="flex-1 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-3 max-w-md mb-4 bg-muted/60 p-1 rounded-xl">
              <TabsTrigger value="messages" className="rounded-lg">
                Messages
              </TabsTrigger>
              <TabsTrigger value="files" className="rounded-lg">
                Files ({files.length})
              </TabsTrigger>
              <TabsTrigger value="members" className="rounded-lg">
                Members ({members.length + 1})
              </TabsTrigger>
            </TabsList>

            {/* MESSAGES TAB CONTENT */}
            <TabsContent
              value="messages"
              className="flex-1 flex flex-col focus-visible:outline-none min-h-[500px]"
            >
              <Card className="flex-1 flex flex-col overflow-hidden border-border bg-card/45 shadow-inner">
                {/* Chat window */}
                <div
                  className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-h-[500px]"
                  ref={scrollAreaRef}
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-20 text-muted-foreground">
                      <Clock className="w-12 h-12 mb-3 opacity-30 stroke-[1.5]" />
                      <p className="font-semibold text-lg">No messages yet</p>
                      <p className="text-sm max-w-xs mt-1">
                        {isOwner
                          ? 'Start the discussion by posting the first message below.'
                          : 'Wait for the instructor to post announcements and updates.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg, index) => {
                        const isPrevSenderSame =
                          index > 0 && messages[index - 1].sender_id === msg.sender_id
                        const formattedTime = new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })

                        return (
                          <div
                            key={msg.message_id}
                            className={`flex flex-col ${isPrevSenderSame ? 'mt-1' : 'mt-4 animate-in fade-in slide-in-from-bottom-1 duration-200'}`}
                          >
                            {!isPrevSenderSame && (
                              <div className="flex items-center gap-2 mb-1">
                                <Avatar className="w-6 h-6 border">
                                  <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                    {msg.sender_name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-semibold text-foreground">
                                  {msg.sender_name}
                                </span>
                                {msg.sender_role === 'ADMIN' ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold"
                                  >
                                    Admin
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] px-1 py-0 bg-primary/5 text-primary border-primary/10 font-bold"
                                  >
                                    Instructor
                                  </Badge>
                                )}
                                <span className="text-[10px] text-muted-foreground ml-auto">
                                  {timeAgo(msg.created_at)}
                                </span>
                              </div>
                            )}
                            <div className="pl-8 pr-4 flex items-center gap-2 group/msg">
                              <div className="inline-block bg-muted/65 hover:bg-muted text-foreground px-3.5 py-2 rounded-2xl rounded-tl-none border border-border/50 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap shadow-sm">
                                {msg.content}
                                <span className="block text-[9px] text-muted-foreground text-right mt-1 select-none font-medium">
                                  {formattedTime}
                                </span>
                              </div>
                              {isOwner && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover/msg:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                                  title="Delete message"
                                  onClick={() => handleDeleteMessage(msg.message_id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Message input at bottom */}
                <div className="p-4 border-t border-border bg-card/90">
                  {isOwner ? (
                    <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                      <Input
                        placeholder="Type an announcement or lecture update..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        disabled={sendingMessage}
                        className="flex-1 bg-background text-sm rounded-xl py-5"
                      />
                      <Button
                        type="submit"
                        disabled={!messageText.trim() || sendingMessage}
                        size="icon"
                        className="rounded-xl shrink-0 h-10 w-10"
                      >
                        {sendingMessage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </form>
                  ) : (
                    <div className="text-center py-2.5 text-xs text-muted-foreground bg-muted/40 rounded-lg flex items-center justify-center gap-2 border border-dashed">
                      <Lock className="w-3.5 h-3.5" />
                      Only the instructor can send announcements in this room.
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* FILES TAB CONTENT */}
            <TabsContent value="files" className="flex-1 focus-visible:outline-none min-h-[500px]">
              <Card className="border-border shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Resource Library</CardTitle>
                  <CardDescription>
                    {isOwner
                      ? 'Upload study materials, homework, and syllabus documents for your students.'
                      : 'Download reference files and documents uploaded by the instructor.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Upload Interface (Teacher Only) */}
                  {isOwner && (
                    <div className="space-y-3">
                      <div
                        onClick={() => !uploadingFile && fileInputRef.current?.click()}
                        className={`group border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-2 ${
                          uploadingFile
                            ? 'bg-muted border-primary/20 pointer-events-none'
                            : 'hover:bg-primary/5 border-border hover:border-primary/40'
                        }`}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={uploadingFile}
                        />

                        {uploadingFile ? (
                          <>
                            <Loader2 className="w-10 h-10 text-primary animate-spin mb-1" />
                            <p className="font-semibold text-sm">Uploading file to room...</p>
                            <p className="text-xs text-muted-foreground">
                              Please wait while the transfer completes
                            </p>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors group-hover:scale-105 duration-300" />
                            <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                              Click to browse and upload
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Accepts document, spreadsheet, PDF or image up to 50 MB
                            </p>
                          </>
                        )}
                      </div>

                      {fileError && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex items-center gap-2 animate-in slide-in-from-top-1">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {fileError}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Files List */}
                  <div className="space-y-3">
                    {files.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl bg-muted/10">
                        <UploadCloud className="w-12 h-12 mx-auto mb-3 opacity-30 stroke-[1.5]" />
                        <p className="font-semibold text-base">No files uploaded yet</p>
                        <p className="text-xs mt-1">
                          {isOwner
                            ? 'Upload a lecture slide or syllabus to share with the class.'
                            : 'Check back later for reference material from the instructor.'}
                        </p>
                      </div>
                    ) : (
                      files.map((file) => (
                        <div
                          key={file.file_id}
                          className="flex items-center justify-between p-3.5 bg-card hover:bg-accent/25 border rounded-xl transition-all duration-200 group shadow-sm hover:border-primary/10"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {getFileIcon(file.file_name)}
                            <div className="min-w-0">
                              <p className="font-semibold text-sm leading-tight text-foreground truncate max-w-[280px] sm:max-w-[400px]">
                                {file.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatBytes(file.file_size)} • by {file.uploader_name} •{' '}
                                {timeAgo(file.uploaded_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className="h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                            >
                              <a
                                href={`${getBaseUrl()}${file.file_url}`}
                                download={file.file_name}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="w-4.5 h-4.5" />
                              </a>
                            </Button>

                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Delete file"
                                onClick={() => handleDeleteFile(file.file_id)}
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* MEMBERS TAB CONTENT */}
            <TabsContent
              value="members"
              className="flex-1 focus-visible:outline-none min-h-[500px]"
            >
              <Card className="border-border shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Room Members</CardTitle>
                  <CardDescription>
                    List of all active instructors and students in this exam hub room.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Instructor Section */}
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                      Instructor
                    </h3>
                    <div className="flex items-center justify-between p-4 bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/20 rounded-xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-primary/30 shadow-sm">
                          <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                            {(room.teacher_name || 'Instructor').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-sm text-foreground">
                            {room.teacher_name || 'Room Creator'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ID: {room.teacher_number || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-primary text-primary-foreground hover:bg-primary border-none text-[10px] font-bold px-2 py-0.5">
                        Room Creator
                      </Badge>
                    </div>
                  </div>

                  {/* Joined Students Section */}
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                      Joined Students ({members.length})
                    </h3>

                    {members.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl bg-muted/10">
                        <Users className="w-10 h-10 mx-auto mb-3 opacity-30 stroke-[1.5]" />
                        <p className="font-semibold text-sm">No students joined yet</p>
                        <p className="text-xs mt-1">
                          Share the room {room.visibility === 'private' ? 'passcode' : 'link'} with
                          your students to join.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {members.map((member) => (
                          <div
                            key={member.user_id}
                            className="flex items-center justify-between p-3.5 bg-card border rounded-xl hover:bg-accent/25 transition-all duration-200 shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8 border">
                                <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
                                  {member.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-sm text-foreground">
                                  {member.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  ID: {member.user_number}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Joined {timeAgo(member.joined_at)}
                              </span>

                              {isOwner && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                                  title="Remove student from room"
                                  onClick={() => handleRemoveMember(member.user_id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Room Settings</DialogTitle>
              <DialogDescription>
                Modify your room's name, accessibility code, and capacity limits.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="editRoomName">Room Name</Label>
                <Input
                  id="editRoomName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Data Structures — Section A"
                />
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={editVisibility === 'public' ? 'default' : 'outline'}
                    className="flex-1 gap-2"
                    onClick={() => setEditVisibility('public')}
                  >
                    <Globe className="w-4 h-4" />
                    Public
                  </Button>
                  <Button
                    type="button"
                    variant={editVisibility === 'private' ? 'default' : 'outline'}
                    className="flex-1 gap-2"
                    onClick={() => setEditVisibility('private')}
                  >
                    <Lock className="w-4 h-4" />
                    Private
                  </Button>
                </div>
              </div>
              {editVisibility === 'private' && (
                <div className="space-y-2">
                  <Label htmlFor="editRoomCode">
                    Room Code / Passcode{' '}
                    <span className="text-muted-foreground font-normal">
                      (leave empty to auto-generate)
                    </span>
                  </Label>
                  <Input
                    id="editRoomCode"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                    className="font-mono text-center tracking-widest text-lg"
                    placeholder="e.g. PASSCODE"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="editRoomCapacity">
                  Capacity / Member Limit{' '}
                  <span className="text-muted-foreground font-normal">
                    (leave empty for unlimited)
                  </span>
                </Label>
                <Input
                  id="editRoomCapacity"
                  type="number"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value)}
                  placeholder="e.g. 50"
                  min={1}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSettings} disabled={!editName.trim() || savingSettings}>
                {savingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
