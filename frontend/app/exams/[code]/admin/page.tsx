'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { getExam, type Exam } from '@/lib/exam-store'
import { toast } from 'sonner'
import {
  getParticipants,
  kickParticipant,
  getExamSettings,
  updateExamSettings,
  getCheatingAlerts,
  forgiveCheatingAlerts,
  type ExamParticipant,
  type ExamSettings,
  type CheatingAlert,
} from '@/lib/exam-submissions'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Users,
  Trophy,
  Settings,
  RefreshCw,
  UserX,
  Lock,
  Unlock,
  LayoutDashboard,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Crown,
  Medal,
  Award,
  Pencil,
  Trash2,
  FileText,
  CircleDot,
  Eye,
  Check,
  X,
  TrendingUp,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  Ban,
} from 'lucide-react'
import {
  calculateQuestionMaxScore,
  calculateQuestionScore,
  isQuestionCorrect,
} from '@/lib/exam-scoring'
import { ExamPerformanceChart } from '@/components/exam-performance-chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

type TabType = 'overview' | 'participants' | 'scoreboard' | 'settings'

export default function ExamAdminPage() {
  const params = useParams<{ code: string }>()
  const code = decodeURIComponent(params.code)
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [exam, setExam] = useState<Exam | null>(null)
  const [participants, setParticipants] = useState<ExamParticipant[]>([])
  const [settings, setSettings] = useState<ExamSettings | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [kickTarget, setKickTarget] = useState<ExamParticipant | null>(null)
  const [isKicking, setIsKicking] = useState(false)
  const [capacityInput, setCapacityInput] = useState('')
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [isTogglingLock, setIsTogglingLock] = useState(false)
  const [error, setError] = useState('')
  const [kickAllTarget, setKickAllTarget] = useState(false)
  const [isKickingAll, setIsKickingAll] = useState(false)
  const [selectedParticipantForDetails, setSelectedParticipantForDetails] =
    useState<ExamParticipant | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const [cheatingAlerts, setCheatingAlerts] = useState<CheatingAlert[]>([])
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<number>>(new Set())
  const seenAlertIdsRef = useRef<Set<number>>(new Set())

  const handleDismissAlert = (alertId: number, userId?: number | string) => {
    if (userId) {
      toast.dismiss(`cheat-user-${userId}`)
    }
    setDismissedAlertIds((prev) => {
      const next = new Set(prev)
      next.add(alertId)
      return next
    })
  }

  const handleDismissAllAlerts = () => {
    setDismissedAlertIds((prev) => {
      const next = new Set(prev)
      cheatingAlerts.forEach((a) => {
        next.add(a.id)
        toast.dismiss(`cheat-user-${a.user_id}`)
      })
      return next
    })
  }

  const visibleAlerts = cheatingAlerts.filter((a) => !dismissedAlertIds.has(a.id))

  const loadData = useCallback(async () => {
    try {
      const [foundExam, foundParticipants, foundSettings, foundAlerts] = await Promise.all([
        getExam(code),
        getParticipants(code).catch(() => []),
        getExamSettings(code).catch(() => null),
        getCheatingAlerts(code).catch(() => []),
      ])
      setExam(foundExam)
      setParticipants(foundParticipants)
      if (foundSettings) {
        setSettings(foundSettings)
        setCapacityInput(foundSettings.capacity ? String(foundSettings.capacity) : '')
      }
      setCheatingAlerts(foundAlerts)

      // Notify teacher of newly detected cheating incidents
      foundAlerts.forEach((alert) => {
        if (!seenAlertIdsRef.current.has(alert.id)) {
          seenAlertIdsRef.current.add(alert.id)
          const toastId = `cheat-user-${alert.user_id}`
          if (alert.warning_level === 1) {
            toast.warning(`⚠️ Warning 1: ${alert.user_name || 'Student'} (${alert.user_number})`, {
              id: toastId,
              description: `Student switched tab/application during exam (Warning 1/2)`,
              duration: 8000,
              action: {
                label: 'Give Last Chance',
                onClick: () => handleForgiveStudent(alert.user_id, alert.user_name),
              },
            })
          } else if (alert.warning_level >= 2) {
            toast.error(`🛑 Disqualified: ${alert.user_name || 'Student'} (${alert.user_number})`, {
              id: toastId,
              description: `Student switched tab AGAIN! Exam stopped automatically.`,
              duration: 10000,
              action: {
                label: 'Give Last Chance',
                onClick: () => handleForgiveStudent(alert.user_id, alert.user_name),
              },
            })
          }
        }
      })

      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    }
  }, [code])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!authLoading && user) {
      loadData().finally(() => setLoaded(true))
    }
  }, [user, authLoading, loadData])

  // Auto-refresh data every 3 seconds for live anti-cheat monitoring
  useEffect(() => {
    if (authLoading || !user) return
    const interval = setInterval(() => {
      loadData()
    }, 3000)
    return () => clearInterval(interval)
  }, [authLoading, user, loadData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
    setIsRefreshing(false)
  }

  const handleForgiveStudent = async (userId: string | number, studentName?: string) => {
    try {
      toast.dismiss(`cheat-user-${userId}`)
      await forgiveCheatingAlerts(code, userId)
      toast.success(`Granted last chance to ${studentName || 'student'}. Warning cleared.`)
      await loadData()
    } catch (err) {
      toast.error('Failed to clear cheating alert')
    }
  }

  const handleStopStudentExam = async (userId: string | number, studentName?: string) => {
    try {
      toast.dismiss(`cheat-user-${userId}`)
      await kickParticipant(code, Number(userId))
      toast.success(`Exam stopped for ${studentName || 'student'}. Student removed from exam.`)
      await loadData()
    } catch (err) {
      toast.error('Failed to stop student exam')
    }
  }

  const handleKick = async () => {
    if (!kickTarget) return
    setIsKicking(true)
    try {
      await kickParticipant(code, kickTarget.user_id)
      setParticipants((prev) => prev.filter((p) => p.user_id !== kickTarget.user_id))
      setKickTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to kick participant')
    }
    setIsKicking(false)
  }

  const handleKickAll = async () => {
    setIsKickingAll(true)
    try {
      for (const p of participants) {
        await kickParticipant(code, p.user_id)
      }
      setParticipants([])
      setKickAllTarget(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove all participants')
    }
    setIsKickingAll(false)
  }

  const handleSaveSettings = async () => {
    setIsSavingSettings(true)
    setSettingsSaved(false)
    try {
      const capacity = capacityInput ? parseInt(capacityInput) : null
      const updated = await updateExamSettings(code, {
        capacity,
        is_locked: settings?.is_locked === 1,
      })
      setSettings(updated)
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    }
    setIsSavingSettings(false)
  }

  const handleToggleLock = async () => {
    if (!settings) return
    setIsTogglingLock(true)
    try {
      const newLocked = settings.is_locked === 1 ? false : true
      const updated = await updateExamSettings(code, {
        capacity: settings.capacity,
        is_locked: newLocked,
      })
      setSettings(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle lock')
    }
    setIsTogglingLock(false)
  }

  // Computed stats
  const finishedParticipants = participants.filter((p) => p.finished_at !== null)
  const inProgressParticipants = participants.filter((p) => p.finished_at === null)
  const avgScore =
    finishedParticipants.length > 0
      ? finishedParticipants.reduce(
          (sum, p) => sum + (p.total > 0 ? (p.score / p.total) * 100 : 0),
          0
        ) / finishedParticipants.length
      : 0
  const passRate =
    finishedParticipants.length > 0
      ? (finishedParticipants.filter((p) => p.total > 0 && p.score / p.total >= 0.5).length /
          finishedParticipants.length) *
        100
      : 0

  const scoreboard = [...participants]
    .filter((p) => p.finished_at !== null)
    .sort((a, b) => {
      const scoreA = a.total > 0 ? a.score / a.total : 0
      const scoreB = b.total > 0 ? b.score / b.total : 0
      if (scoreB !== scoreA) return scoreB - scoreA
      return new Date(a.finished_at!).getTime() - new Date(b.finished_at!).getTime()
    })

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '—'
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatDate = (isoString: string | null) => {
    if (!isoString) return '—'
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getDuration = (joined: string, finished: string | null) => {
    if (!finished) return 'In Progress'
    const ms = new Date(finished).getTime() - new Date(joined).getTime()
    const mins = Math.floor(ms / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    return `${mins}m ${secs}s`
  }

  const getScoreColor = (score: number, total: number) => {
    if (total === 0) return 'text-muted-foreground'
    const pct = score / total
    if (pct >= 0.8) return 'text-emerald-500'
    if (pct >= 0.5) return 'text-amber-500'
    return 'text-rose-500'
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />
    return (
      <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">
        #{rank}
      </span>
    )
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: LayoutDashboard },
    {
      id: 'participants' as TabType,
      label: 'Participants',
      icon: Users,
      count: participants.length,
    },
    { id: 'scoreboard' as TabType, label: 'Scoreboard', icon: Trophy, count: scoreboard.length },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ]

  if (authLoading || !user || !loaded) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // Access check: only instructor who created it or admin
  const isOwner = exam && String(exam.createdBy) === String(user.number)
  const isAdmin = user.role === 'admin'

  if (exam && !isOwner && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">Access Denied</h1>
          <p className="text-sm text-muted-foreground mb-6">
            You are not the creator of this exam and cannot access its admin panel.
          </p>
          <Button asChild>
            <Link href="/exams">Back to exams</Link>
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/exams" aria-label="Back to exams">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">
                  {exam?.title || 'Exam Admin'}
                </h1>
                <Badge variant="outline" className="font-mono text-primary">
                  {code}
                </Badge>
                {settings?.is_locked === 1 && (
                  <Badge variant="destructive" className="gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Instructor Admin Panel · Last updated {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Anti-Cheat & Proctoring Notification Panel for Teacher */}
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15 p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  Anti-Cheat Proctoring Active & Live Notifications
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Monitoring tab switches, application changes, and student session integrity for
                  exam <span className="font-mono font-semibold text-primary">{code}</span>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {visibleAlerts.length > 0 && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <ShieldX className="w-3.5 h-3.5" /> {visibleAlerts.length} Cheat Incidents
                  Reported
                </Badge>
              )}
              <Badge
                variant="outline"
                className="gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-background/80 text-xs font-semibold py-1"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Tab Switch Detection ON
              </Badge>
            </div>
          </div>

          {/* Live Cheating Alerts List */}
          {visibleAlerts.length > 0 && (
            <div className="mt-2 space-y-2 border-t border-amber-500/20 pt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Recent Student Anti-Cheat
                  Alerts:
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 text-[10px] px-2 text-muted-foreground hover:text-foreground gap-1 hover:bg-amber-500/20"
                  onClick={handleDismissAllAlerts}
                  title="Dismiss all live notifications"
                >
                  <X className="w-3 h-3" /> Dismiss All
                </Button>
              </div>
              <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
                {visibleAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border text-xs ${
                      alert.warning_level >= 2
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {alert.warning_level >= 2 ? (
                        <Ban className="w-4 h-4 text-rose-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {alert.user_name || 'Student'}{' '}
                          <span className="font-mono text-muted-foreground font-normal">
                            ({alert.user_number})
                          </span>
                        </p>
                        <p className="text-[11px] opacity-90 truncate">{alert.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">
                        {new Date(alert.created_at).toLocaleTimeString()}
                      </span>
                      {alert.warning_level >= 2 ? (
                        <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                          Disqualified
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[10px] py-0 px-1.5 bg-amber-500/20 text-amber-700 dark:text-amber-300"
                        >
                          Warning #1
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/10 gap-1"
                        onClick={() => handleForgiveStudent(alert.user_id, alert.user_name)}
                        title="Clear warning & grant student a last chance"
                      >
                        <RefreshCw className="w-3 h-3" /> Give Last Chance
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-6 text-[10px] px-2 gap-1"
                        onClick={() => handleStopStudentExam(alert.user_id, alert.user_name)}
                        title="Stop student's exam immediately"
                      >
                        <UserX className="w-3 h-3" /> Stop Exam
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
                        onClick={() => handleDismissAlert(alert.id, alert.user_id)}
                        title="Dismiss notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6 w-full overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
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
                    className="text-xs ml-1"
                  >
                    {tab.count}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-medium tracking-wide">
                        Total Students
                      </p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {participants.length}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {inProgressParticipants.length} in progress · {finishedParticipants.length}{' '}
                    finished
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-medium tracking-wide">
                        Avg Score
                      </p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {avgScore.toFixed(1)}%
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Based on submitted results</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-medium tracking-wide">
                        Pass Rate
                      </p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {passRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-violet-500" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Threshold: 50%</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-medium tracking-wide">
                        Capacity
                      </p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {settings?.capacity ? `${participants.length}/${settings.capacity}` : '∞'}
                      </p>
                    </div>
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${settings?.is_locked ? 'bg-rose-500/10' : 'bg-amber-500/10'}`}
                    >
                      {settings?.is_locked ? (
                        <Lock className="w-5 h-5 text-rose-500" />
                      ) : (
                        <Unlock className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {settings?.is_locked ? 'Exam is locked' : 'Exam is open'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Class Performance Graph */}
            {finishedParticipants.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    Student Performance Chart
                  </CardTitle>
                  <CardDescription>
                    Comparing the score percentage of all students who completed this exam
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={finishedParticipants.map((p) => ({
                            name:
                              p.user_name.length > 12
                                ? p.user_name.slice(0, 10) + '..'
                                : p.user_name,
                            score: p.total > 0 ? Math.round((p.score / p.total) * 100) : 0,
                            fullName: p.user_name,
                          }))}
                          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                          <Tooltip
                            cursor={false}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                  <div className="bg-card border rounded-lg p-2.5 shadow-md text-xs">
                                    <p className="font-semibold text-foreground">{data.fullName}</p>
                                    <p className="text-muted-foreground mt-0.5">
                                      Score: {data.score}%
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                            {finishedParticipants.map((entry, index) => {
                              const scorePct = entry.total > 0 ? entry.score / entry.total : 0
                              const color =
                                scorePct >= 0.8
                                  ? '#10b981'
                                  : scorePct >= 0.5
                                    ? '#f59e0b'
                                    : '#ef4444'
                              return <Cell key={`cell-${index}`} fill={color} />
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                        Loading chart...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Exam details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exam Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Code</span>
                      <span className="font-mono font-semibold text-primary">{exam?.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Title</span>
                      <span className="font-medium">{exam?.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Questions</span>
                      <span className="font-medium">{exam?.questions.length}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Starts</span>
                      <span className="font-medium">
                        {exam?.startAt ? formatDate(exam.startAt) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ends</span>
                      <span className="font-medium">
                        {exam?.endAt ? formatDate(exam.endAt) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created by</span>
                      <span className="font-medium">{exam?.createdBy}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button
                  variant={settings?.is_locked ? 'default' : 'outline'}
                  className="gap-2"
                  onClick={handleToggleLock}
                  disabled={isTogglingLock}
                >
                  {settings?.is_locked ? (
                    <>
                      <Unlock className="w-4 h-4" /> Unlock Exam
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" /> Lock Exam
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setActiveTab('participants')}
                >
                  <Users className="w-4 h-4" /> View Participants
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setActiveTab('scoreboard')}
                >
                  <Trophy className="w-4 h-4" /> View Scoreboard
                </Button>
                <Button variant="outline" className="gap-2" asChild>
                  <Link href={`/exams/${encodeURIComponent(code)}`}>
                    <Pencil className="w-4 h-4" /> Edit Questions
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Participants */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                    <CardDescription>Latest students who joined or submitted</CardDescription>
                  </div>
                  {participants.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() => setActiveTab('participants')}
                    >
                      View all <ArrowLeft className="w-3 h-3 rotate-180" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No participants yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {[...participants]
                      .sort(
                        (a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()
                      )
                      .slice(0, 5)
                      .map((p) => {
                        const studentAlerts = cheatingAlerts.filter(
                          (a) =>
                            String(a.user_id) === String(p.user_id) ||
                            (p.user_number && String(a.user_number) === String(p.user_number))
                        )
                        const hasLevel2 = studentAlerts.some((a) => a.warning_level >= 2)

                        return (
                          <div
                            key={p.user_id}
                            onClick={() => p.finished_at && setSelectedParticipantForDetails(p)}
                            className={`flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors ${
                              p.finished_at ? 'cursor-pointer' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  hasLevel2
                                    ? 'bg-rose-500'
                                    : p.finished_at
                                      ? 'bg-emerald-500'
                                      : 'bg-amber-500 animate-pulse'
                                }`}
                              />
                              <div className="min-w-0">
                                <p className="font-medium text-foreground text-sm truncate">
                                  {p.user_name || 'Unknown'}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  #{p.user_number}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {hasLevel2 ? (
                                <Badge
                                  variant="destructive"
                                  className="gap-1 text-xs bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                >
                                  <Ban className="w-3 h-3 text-rose-500" /> Disqualified (Cheated) —
                                  0/{p.total}
                                </Badge>
                              ) : p.finished_at ? (
                                <Badge
                                  variant="secondary"
                                  className="gap-1 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                >
                                  <CheckCircle2 className="w-3 h-3" /> {p.score}/{p.total}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="gap-1 text-xs bg-amber-500/10 text-amber-600 border-amber-500/20"
                                >
                                  <Clock className="w-3 h-3" /> In Progress
                                </Badge>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Participants Tab */}
        {activeTab === 'participants' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Participants</h2>
                <p className="text-sm text-muted-foreground">
                  {participants.length} total · {inProgressParticipants.length} in progress ·{' '}
                  {finishedParticipants.length} finished
                </p>
              </div>
            </div>

            {participants.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No students have joined this exam yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Share the exam code{' '}
                    <span className="font-mono font-semibold text-primary">{code}</span> to get
                    started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          User #
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Joined
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Finished
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Duration
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Score
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">%</th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {participants.map((p, index) => {
                        const pct = p.total > 0 ? Math.round((p.score / p.total) * 100) : 0
                        const isFinished = p.finished_at !== null
                        const studentAlerts = cheatingAlerts.filter(
                          (a) =>
                            String(a.user_id) === String(p.user_id) ||
                            (p.user_number && String(a.user_number) === String(p.user_number))
                        )
                        return (
                          <tr key={p.user_id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                            <td className="px-4 py-3 font-medium text-foreground">
                              {p.user_name || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                                {p.user_number || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {formatTime(p.joined_at)}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {isFinished ? (
                                <span className="text-muted-foreground">
                                  {formatTime(p.finished_at)}
                                </span>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="gap-1 text-xs bg-amber-500/10 text-amber-600 border-amber-500/20"
                                >
                                  <CircleDot className="w-3 h-3 animate-pulse" /> Active
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {getDuration(p.joined_at, p.finished_at)}
                            </td>
                            <td
                              className={`px-4 py-3 font-semibold ${studentAlerts.some((a) => a.warning_level >= 2) ? 'text-rose-600 dark:text-rose-400' : getScoreColor(p.score, p.total)}`}
                            >
                              {isFinished
                                ? studentAlerts.some((a) => a.warning_level >= 2)
                                  ? `0/${p.total} (Cheated)`
                                  : `${p.score}/${p.total}`
                                : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {isFinished ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span
                                    className={`text-xs font-medium ${getScoreColor(p.score, p.total)}`}
                                  >
                                    {pct}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {(() => {
                                const hasLevel2 = studentAlerts.some((a) => a.warning_level >= 2)
                                const hasLevel1 = studentAlerts.some((a) => a.warning_level === 1)

                                if (hasLevel2) {
                                  return (
                                    <Badge
                                      variant="destructive"
                                      className="gap-1 text-xs bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                    >
                                      <Ban className="w-3 h-3 text-rose-500" /> Disqualified (Exam
                                      Stopped)
                                    </Badge>
                                  )
                                }
                                if (hasLevel1) {
                                  return (
                                    <Badge
                                      variant="secondary"
                                      className="gap-1 text-xs bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                    >
                                      <AlertTriangle className="w-3 h-3 text-amber-500" /> Warning
                                      #1 (Tab Switch)
                                    </Badge>
                                  )
                                }
                                if (isFinished) {
                                  return (
                                    <Badge
                                      variant="secondary"
                                      className="gap-1 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    >
                                      <CheckCircle2 className="w-3 h-3" /> Submitted
                                    </Badge>
                                  )
                                }
                                return (
                                  <Badge
                                    variant="secondary"
                                    className="gap-1 text-xs bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  >
                                    <CircleDot className="w-3 h-3 animate-pulse" /> Active
                                  </Badge>
                                )
                              })()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {studentAlerts.length > 0 && !isFinished && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/10 h-7 px-2 text-xs"
                                    onClick={() => handleForgiveStudent(p.user_id, p.user_name)}
                                    title="Clear warning & grant student a last chance"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Last Chance
                                  </Button>
                                )}
                                {!isFinished && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="gap-1 h-7 px-2 text-xs"
                                    onClick={() => handleStopStudentExam(p.user_id, p.user_name)}
                                    title="Stop student's exam immediately"
                                  >
                                    <UserX className="w-3.5 h-3.5" />
                                    Stop Exam
                                  </Button>
                                )}
                                {isFinished && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1 text-primary hover:text-primary hover:bg-primary/10 h-7 px-2"
                                    onClick={() => setSelectedParticipantForDetails(p)}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Details
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scoreboard Tab */}
        {activeTab === 'scoreboard' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Scoreboard</h2>
              <p className="text-sm text-muted-foreground">
                Ranked by score (descending) · Tie-broken by finish time
              </p>
            </div>

            {/* Exam Details Summary */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">
                      {exam?.title || 'Untitled Exam'}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">Code: {exam?.code}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg bg-background/60 px-3 py-2">
                    <p className="text-muted-foreground">Questions</p>
                    <p className="font-semibold text-foreground text-sm">
                      {exam?.questions.length || 0}
                    </p>
                  </div>
                  <div className="rounded-lg bg-background/60 px-3 py-2">
                    <p className="text-muted-foreground">Total Marks</p>
                    <p className="font-semibold text-foreground text-sm">
                      {exam?.questions.reduce((sum, q) => sum + (q.mark ?? 1), 0) || 0}
                    </p>
                  </div>
                  <div className="rounded-lg bg-background/60 px-3 py-2">
                    <p className="text-muted-foreground">Starts</p>
                    <p className="font-semibold text-foreground text-sm">
                      {exam?.startAt ? formatDate(exam.startAt) : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-background/60 px-3 py-2">
                    <p className="text-muted-foreground">Ends</p>
                    <p className="font-semibold text-foreground text-sm">
                      {exam?.endAt ? formatDate(exam.endAt) : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {scoreboard.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No submissions yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Results will appear here once students complete the exam.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {scoreboard.map((p, index) => {
                  const rank = index + 1
                  const pct = p.total > 0 ? Math.round((p.score / p.total) * 100) : 0
                  const isPodium = rank <= 3
                  const studentAlerts = cheatingAlerts.filter(
                    (a) =>
                      String(a.user_id) === String(p.user_id) ||
                      (p.user_number && String(a.user_number) === String(p.user_number))
                  )
                  const hasLevel2 = studentAlerts.some((a) => a.warning_level >= 2)

                  return (
                    <div
                      key={p.user_id}
                      onClick={() => setSelectedParticipantForDetails(p)}
                      className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all ${
                        hasLevel2
                          ? 'border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10'
                          : rank === 1
                            ? 'border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10'
                            : rank === 2
                              ? 'border-slate-400/30 bg-slate-400/5 hover:bg-slate-400/10'
                              : rank === 3
                                ? 'border-amber-600/30 bg-amber-600/5 hover:bg-amber-600/10'
                                : 'border-border bg-background hover:bg-muted/30'
                      }`}
                    >
                      <div className="w-8 flex-shrink-0 flex items-center justify-center">
                        {hasLevel2 ? <Ban className="w-5 h-5 text-rose-500" /> : getRankIcon(rank)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-semibold text-foreground ${isPodium ? 'text-base' : 'text-sm'}`}
                          >
                            {p.user_name || 'Unknown'}
                          </span>
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                            #{p.user_number}
                          </span>
                          {hasLevel2 && (
                            <Badge
                              variant="destructive"
                              className="gap-1 text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 py-0"
                            >
                              <Ban className="w-3 h-3 text-rose-500" /> Disqualified (Cheated)
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {getDuration(p.joined_at, p.finished_at)}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Finished {formatTime(p.finished_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="hidden sm:flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${hasLevel2 ? 'bg-rose-500' : pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${hasLevel2 ? 100 : pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-lg font-bold ${hasLevel2 ? 'text-rose-600 dark:text-rose-400' : getScoreColor(p.score, p.total)}`}
                          >
                            {hasLevel2 ? `0/${p.total}` : `${p.score}/${p.total}`}
                          </span>
                          <p
                            className={`text-xs ${hasLevel2 ? 'text-rose-500 font-semibold' : 'text-muted-foreground'}`}
                          >
                            {hasLevel2 ? 'Cheated (0 Score)' : `${pct}%`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Exam Settings</h2>
              <p className="text-sm text-muted-foreground">Manage student limits and exam access</p>
            </div>

            {/* Lock/Unlock */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {settings?.is_locked ? (
                    <Lock className="w-4 h-4 text-rose-500" />
                  ) : (
                    <Unlock className="w-4 h-4 text-emerald-500" />
                  )}
                  Exam Lock
                </CardTitle>
                <CardDescription>
                  When locked, no new students can enter the exam. Students already in the exam are
                  not affected.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {settings?.is_locked ? 'Exam is currently locked' : 'Exam is currently open'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {settings?.is_locked
                        ? 'Students cannot enter until you unlock it'
                        : 'Students can freely join the exam'}
                    </p>
                  </div>
                  <Button
                    variant={settings?.is_locked ? 'default' : 'outline'}
                    className="gap-2"
                    onClick={handleToggleLock}
                    disabled={isTogglingLock}
                  >
                    {isTogglingLock ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : settings?.is_locked ? (
                      <>
                        <Unlock className="w-4 h-4" /> Unlock
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" /> Lock
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Remove All Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-destructive" />
                  Remove All Students
                </CardTitle>
                <CardDescription>
                  Remove all students from this exam. Their submission data will be permanently
                  deleted.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {participants.length} student{participants.length !== 1 ? 's' : ''} currently
                      in exam
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      This action cannot be undone
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    disabled={participants.length === 0}
                    onClick={() => setKickAllTarget(true)}
                  >
                    <UserX className="w-4 h-4" />
                    Remove All
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Student Capacity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Student Limit
                </CardTitle>
                <CardDescription>
                  Set the maximum number of students allowed to join. Leave empty for unlimited.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Maximum students</Label>
                  <div className="flex gap-2">
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      value={capacityInput}
                      onChange={(e) => setCapacityInput(e.target.value)}
                      className="max-w-[160px]"
                    />
                    <Button
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className="gap-2"
                    >
                      {isSavingSettings ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : settingsSaved ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : null}
                      {settingsSaved ? 'Saved!' : 'Save'}
                    </Button>
                  </div>
                </div>
                {settings?.capacity && (
                  <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                    <span className="font-semibold text-foreground">{participants.length}</span> of{' '}
                    <span className="font-semibold text-foreground">{settings.capacity}</span> slots
                    used
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Kick Confirmation Dialog */}
      <Dialog open={!!kickTarget} onOpenChange={(open) => !open && setKickTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <ShieldX className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Disqualify & Kick Student</DialogTitle>
                <Badge variant="destructive" className="mt-0.5 text-[10px]">
                  Anti-Cheat Disqualification
                </Badge>
              </div>
            </div>
            <DialogDescription className="pt-2 text-xs text-foreground/80 leading-relaxed">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-foreground">{kickTarget?.user_name}</span> (#
              <span className="font-mono">{kickTarget?.user_number}</span>) from this exam session?
              Their submission will be invalidated and deleted for anti-cheat/instructor action.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setKickTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleKick}
              disabled={isKicking}
              className="gap-2 font-semibold"
            >
              {isKicking ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <UserX className="w-4 h-4" />
              )}
              Kick & Disqualify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kick All Confirmation Dialog */}
      <Dialog open={kickAllTarget} onOpenChange={(open) => !open && setKickAllTarget(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove all students</DialogTitle>
            <DialogDescription>
              This will remove{' '}
              <span className="font-semibold text-foreground">
                all {participants.length} students
              </span>{' '}
              from the exam. All submission data will be permanently deleted. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKickAllTarget(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleKickAll}
              disabled={isKickingAll}
              className="gap-2"
            >
              {isKickingAll && <RefreshCw className="w-4 h-4 animate-spin" />}
              <Trash2 className="w-4 h-4" />
              Remove all students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Submission Details Dialog */}
      <Dialog
        open={!!selectedParticipantForDetails}
        onOpenChange={(open) => !open && setSelectedParticipantForDetails(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center justify-between">
              <span>Exam Submission Details</span>
              <span className="text-sm font-normal text-muted-foreground mr-4">
                Code: <span className="font-mono text-primary font-bold">{code}</span>
              </span>
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of answers submitted by {selectedParticipantForDetails?.user_name}{' '}
              (#{selectedParticipantForDetails?.user_number}).
            </DialogDescription>
          </DialogHeader>

          {selectedParticipantForDetails && exam && (
            <div className="space-y-6 my-2">
              {cheatingAlerts.some(
                (a) =>
                  (String(a.user_id) === String(selectedParticipantForDetails.user_id) ||
                    (selectedParticipantForDetails.user_number &&
                      String(a.user_number) ===
                        String(selectedParticipantForDetails.user_number))) &&
                  a.warning_level >= 2
              ) && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  <Ban className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Disqualified Student (Anti-Cheat Violation)</p>
                    <p className="text-[11px] opacity-90 font-normal mt-0.5">
                      This student was stopped/disqualified for tab/app switching during the exam.
                      Final score recorded as 0 (Cheated).
                    </p>
                  </div>
                </div>
              )}
              {/* Summary card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 rounded-xl p-4 border text-center">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Score</p>
                  <p
                    className={`text-xl font-bold mt-1 ${getScoreColor(selectedParticipantForDetails.score, selectedParticipantForDetails.total)}`}
                  >
                    {selectedParticipantForDetails.score} / {selectedParticipantForDetails.total}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Percentage</p>
                  <p className="text-xl font-bold mt-1">
                    {selectedParticipantForDetails.total > 0
                      ? Math.round(
                          (selectedParticipantForDetails.score /
                            selectedParticipantForDetails.total) *
                            100
                        )
                      : 0}
                    %
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Duration</p>
                  <p className="text-xl font-bold mt-1">
                    {getDuration(
                      selectedParticipantForDetails.joined_at,
                      selectedParticipantForDetails.finished_at
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">
                    Submitted At
                  </p>
                  <p className="text-sm font-semibold mt-2.5">
                    {formatTime(selectedParticipantForDetails.finished_at)}
                  </p>
                </div>
              </div>

              {/* Performance Graph */}
              <ExamPerformanceChart
                exam={exam}
                answers={selectedParticipantForDetails.answers}
                title="Student Performance Graph"
                description="Visual representation of correct, partial, and incorrect answers across all questions"
              />

              {/* Questions review */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-foreground">Question Breakdown</h4>
                {exam.questions.map((q, idx) => {
                  const studentAnswers = selectedParticipantForDetails.answers?.[q.id] || []
                  const questionScore = calculateQuestionScore(q, studentAnswers)
                  const questionMax = calculateQuestionMaxScore(q)
                  const isCorrectVal = isQuestionCorrect(q, studentAnswers)
                  const isPartial = questionScore > 0 && !isCorrectVal

                  return (
                    <div
                      key={q.id}
                      className="border rounded-lg p-4 space-y-3 bg-card hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <h5 className="font-semibold text-sm leading-relaxed text-foreground">
                            <span className="text-muted-foreground mr-1.5">{idx + 1}.</span>
                            {q.prompt}
                          </h5>
                          <p className="text-[11px] text-muted-foreground font-medium">
                            {q.type === 'true_false' ? 'True / False' : 'Multiple Choice'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs font-semibold ${questionScore > 0 ? (isCorrectVal ? 'text-emerald-600' : 'text-amber-600') : 'text-rose-600'}`}
                          >
                            {questionScore} / {questionMax} pts
                          </span>
                          {isCorrectVal ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : questionScore > 0 ? (
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive shrink-0" />
                          )}
                        </div>
                      </div>

                      {/* Display options */}
                      <div className="text-xs space-y-1.5 pl-5">
                        {q.type === 'true_false' ? (
                          <div className="grid grid-cols-2 gap-2">
                            {['true', 'false'].map((val) => {
                              const isSelected = studentAnswers[0] === val
                              const isCorrectAnswer = String(q.answerBool) === val
                              return (
                                <div
                                  key={val}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${
                                    isSelected
                                      ? isCorrectAnswer
                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700'
                                        : 'border-rose-500 bg-rose-500/10 text-rose-700'
                                      : isCorrectAnswer
                                        ? 'border-emerald-200 bg-emerald-50/50 text-emerald-600'
                                        : 'border-border text-muted-foreground'
                                  }`}
                                >
                                  <span className="capitalize font-medium">{val}</span>
                                  {isSelected && (
                                    <span className="text-[9px] font-bold uppercase ml-auto">
                                      (Student's Answer)
                                    </span>
                                  )}
                                  {isCorrectAnswer && !isSelected && (
                                    <Check className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {q.options?.map((opt, optIdx) => {
                              const isSelected = studentAnswers.includes(String(optIdx))
                              const isCorrectAnswer = q.correctIndexes?.includes(optIdx)
                              return (
                                <div
                                  key={optIdx}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${
                                    isSelected
                                      ? isCorrectAnswer
                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700'
                                        : 'border-rose-500 bg-rose-500/10 text-rose-700'
                                      : isCorrectAnswer
                                        ? 'border-emerald-200 bg-emerald-50/50 text-emerald-600'
                                        : 'border-border text-muted-foreground'
                                  }`}
                                >
                                  <span>{opt}</span>
                                  {isSelected && (
                                    <span className="text-[9px] font-bold uppercase ml-auto">
                                      (Student's Answer)
                                    </span>
                                  )}
                                  {isCorrectAnswer && !isSelected && (
                                    <Check className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedParticipantForDetails(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
