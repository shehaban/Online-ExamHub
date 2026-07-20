'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/lib/auth-context'
import { apiRequest } from '@/lib/api'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts'
import {
  BookOpen,
  Users,
  TrendingUp,
  Award,
  GraduationCap,
  BarChart3,
  Clock,
  Target,
  ShieldCheck,
  Loader2,
  FileText,
  Hash,
  DoorOpen,
  LayoutDashboard,
  Eye,
} from 'lucide-react'

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface StudentSubmission {
  exam_code: string
  title: string
  score: number
  total: number
  joined_at: string
  finished_at: string
}

interface InstructorExam {
  exam_id: number
  code: string
  title: string
  created_at: string
  participant_count: number
  avg_score: number
  max_score: number
}

interface AdminSubmission {
  exam_code: string
  title: string
  user_name: string
  user_number: string
  score: number
  total: number
  finished_at: string
}

interface AdminUser {
  id: number
  name: string
  user_number: string
  role: string
  email: string | null
  avatar: string | null
  created_at: string
  type: string
}

type DashboardData =
  | {
      role: 'student'
      studentName?: string
      studentNumber?: string
      stats: { totalExams: number; avgScore: number }
      submissions: StudentSubmission[]
    }
  | {
      role: 'instructor'
      stats: { totalExams: number; totalParticipants: number; avgScore: number }
      exams: InstructorExam[]
    }
  | {
      role: 'admin'
      stats: {
        studentCount: number
        teacherCount: number
        adminCount: number
        examCount: number
        roomCount: number
        submissionCount: number
        overallAvg: number
      }
      recentSubmissions: AdminSubmission[]
      users: AdminUser[]
    }

// ─── GRADIENT COLORS ────────────────────────────────────────────────────────

const PIE_COLORS = ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444']

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────

function DashboardContent() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = searchParams.get('studentId')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = async () => {
    setLoading(true)
    setError('')
    try {
      const url = studentId ? `/users/dashboard?studentId=${studentId}` : '/users/dashboard'
      const res = await apiRequest(url)
      setData(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }
    if (user) {
      fetchDashboard()
      // Auto-refresh every 5 seconds for live stats and avatar updates
      const interval = setInterval(() => {
        fetchDashboard()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [user, authLoading, studentId])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading dashboard…</span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-destructive">{error || 'Something went wrong'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      <main className="container mx-auto px-4 md:px-6 py-8 max-w-7xl">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              {data.role === 'student' && data.studentName ? 'Student Dashboard' : 'Dashboard'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {data.role === 'student' && data.studentName ? (
                <>
                  Viewing dashboard of student{' '}
                  <span className="font-semibold text-foreground">{data.studentName}</span> (ID:{' '}
                  <span className="font-mono text-xs font-semibold">{data.studentNumber}</span>)
                </>
              ) : (
                <>
                  Welcome back, <span className="font-semibold text-foreground">{user.name}</span>
                </>
              )}
            </p>
          </div>
          {studentId && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">Back to Admin Dashboard</Link>
            </Button>
          )}
        </div>

        {data.role === 'student' && <StudentDashboard data={data} isAdminViewing={!!studentId} />}
        {data.role === 'instructor' && <InstructorDashboard data={data} />}
        {data.role === 'admin' && <AdminDashboard data={data} />}
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <Header />
          <div className="flex items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-muted-foreground">Loading dashboard…</span>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}

// ─── STAT CARD ──────────────────────────────────────────────────────────────

const getIconColorClass = (grad: string) => {
  if (grad.includes('pink') || grad.includes('rose')) return 'text-pink-600 dark:text-pink-400'
  if (grad.includes('purple') || grad.includes('violet') || grad.includes('indigo'))
    return 'text-purple-600 dark:text-purple-400'
  if (grad.includes('cyan') || grad.includes('teal')) return 'text-cyan-600 dark:text-cyan-400'
  if (grad.includes('amber') || grad.includes('orange')) return 'text-amber-600 dark:text-amber-400'
  if (grad.includes('emerald') || grad.includes('green'))
    return 'text-emerald-600 dark:text-emerald-400'
  return 'text-primary'
}

function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  subtitle,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  gradient: string
  subtitle?: string
}) {
  return (
    <Card className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {title}
            </p>
            <p
              className={`text-3xl font-black tracking-tight bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
            >
              {value}
            </p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="relative flex items-center justify-center rounded-xl overflow-hidden size-10">
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-15`} />
            <Icon className={`w-5 h-5 relative z-10 ${getIconColorClass(gradient)}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── STUDENT DASHBOARD ──────────────────────────────────────────────────────

function StudentDashboard({
  data,
  isAdminViewing = false,
}: {
  data: Extract<DashboardData, { role: 'student' }>
  isAdminViewing?: boolean
}) {
  const { stats, submissions } = data

  const chartData = submissions.map((s, i) => ({
    name: s.title.length > 15 ? s.title.slice(0, 15) + '…' : s.title,
    score: Math.round((s.score / s.total) * 100 * 10) / 10,
    index: i + 1,
  }))

  const scoreChartConfig: ChartConfig = {
    score: { label: 'Score %', color: 'hsl(280, 80%, 60%)' },
  }

  const bestScore = submissions.length
    ? Math.max(...submissions.map((s) => (s.score / s.total) * 100))
    : 0

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Exams Taken"
          value={stats.totalExams}
          icon={BookOpen}
          gradient="from-pink-500 to-rose-500"
        />
        <StatCard
          title="Average Score"
          value={`${stats.avgScore}%`}
          icon={Target}
          gradient="from-purple-500 to-indigo-500"
        />
        <StatCard
          title="Best Score"
          value={`${Math.round(bestScore * 10) / 10}%`}
          icon={Award}
          gradient="from-cyan-500 to-emerald-500"
        />
      </div>

      {/* Score Progress Chart */}
      {chartData.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              Score Progression
            </CardTitle>
            <CardDescription>Your exam performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={scoreChartConfig} className="h-[320px] w-full">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(280, 80%, 60%)"
                  strokeWidth={2.5}
                  fill="url(#scoreGradient)"
                  dot={{ fill: 'hsl(280, 80%, 60%)', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Exam Details Table */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-pink-500" />
            Exam History
          </CardTitle>
          <CardDescription>Detailed breakdown of all your attempts</CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              You have not completed any exams yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">#</th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">Exam</th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">Code</th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">Score</th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">Percentage</th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">Date</th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub, i) => {
                    const pct = Math.round((sub.score / sub.total) * 100)
                    return (
                      <tr
                        key={`${sub.exam_code}-${i}`}
                        className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-2.5 px-3 font-medium text-foreground">{sub.title}</td>
                        <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">
                          {sub.exam_code}
                        </td>
                        <td className="py-2.5 px-3">
                          {sub.score}/{sub.total}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={
                              pct >= 70 ? 'default' : pct >= 50 ? 'secondary' : 'destructive'
                            }
                            className="text-xs"
                          >
                            {pct}%
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-xs">
                          {new Date(sub.finished_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50"
                            asChild
                          >
                            <Link
                              href={
                                isAdminViewing
                                  ? `/exams/${sub.exam_code}/admin`
                                  : `/exam/${sub.exam_code}`
                              }
                            >
                              <Eye className="w-3.5 h-3.5" />{' '}
                              {isAdminViewing ? 'View in Admin' : 'View Result'}
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── INSTRUCTOR DASHBOARD ───────────────────────────────────────────────────

function InstructorDashboard({ data }: { data: Extract<DashboardData, { role: 'instructor' }> }) {
  const { stats, exams } = data

  const barChartData = exams
    .filter((e) => e.participant_count > 0)
    .map((e) => ({
      name: e.title.length > 12 ? e.title.slice(0, 12) + '…' : e.title,
      avg: e.avg_score,
      max: e.max_score,
      participants: e.participant_count,
    }))

  const barChartConfig: ChartConfig = {
    avg: { label: 'Avg Score %', color: 'hsl(260, 80%, 60%)' },
    max: { label: 'Max Score %', color: 'hsl(180, 70%, 50%)' },
  }

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Exams Created"
          value={stats.totalExams}
          icon={BookOpen}
          gradient="from-purple-500 to-indigo-500"
        />
        <StatCard
          title="Total Participants"
          value={stats.totalParticipants}
          icon={Users}
          gradient="from-pink-500 to-rose-500"
        />
        <StatCard
          title="Avg Score Across Exams"
          value={`${stats.avgScore}%`}
          icon={BarChart3}
          gradient="from-cyan-500 to-emerald-500"
        />
      </div>

      {/* Bar Chart */}
      {barChartData.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              Exam Performance Overview
            </CardTitle>
            <CardDescription>Average and maximum scores across your exams</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig} className="h-[350px] w-full">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="avg" fill="hsl(260, 80%, 60%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="max" fill="hsl(180, 70%, 50%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Exams Detail Table */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-pink-500" />
            Your Exams
          </CardTitle>
          <CardDescription>Detailed breakdown of each exam you created</CardDescription>
        </CardHeader>
        <CardContent>
          {exams.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              You have not created any exams yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">Title</th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">Code</th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">Students</th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">Avg %</th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">Max %</th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr
                      key={exam.code}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-medium text-foreground">{exam.title}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">
                        {exam.code}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Users className="w-3 h-3" />
                          {exam.participant_count}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            exam.avg_score >= 70
                              ? 'default'
                              : exam.avg_score >= 50
                                ? 'secondary'
                                : 'destructive'
                          }
                          className="text-xs"
                        >
                          {exam.avg_score}%
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-foreground font-medium">{exam.max_score}%</td>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs">
                        {new Date(exam.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── ADMIN DASHBOARD ────────────────────────────────────────────────────────

function AdminDashboard({ data }: { data: Extract<DashboardData, { role: 'admin' }> }) {
  const { stats, recentSubmissions, users } = data

  const pieData = [
    { name: 'Students', value: stats.studentCount, color: PIE_COLORS[0] },
    { name: 'Teachers', value: stats.teacherCount, color: PIE_COLORS[1] },
    { name: 'Admins', value: stats.adminCount, color: PIE_COLORS[2] },
  ].filter((d) => d.value > 0)

  const pieConfig: ChartConfig = {
    Students: { label: 'Students', color: PIE_COLORS[0] },
    Teachers: { label: 'Teachers', color: PIE_COLORS[1] },
    Admins: { label: 'Admins', color: PIE_COLORS[2] },
  }

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <StatCard
          title="Students"
          value={stats.studentCount}
          icon={GraduationCap}
          gradient="from-pink-500 to-rose-500"
        />
        <StatCard
          title="Teachers"
          value={stats.teacherCount}
          icon={BookOpen}
          gradient="from-purple-500 to-indigo-500"
        />
        <StatCard
          title="Total Exams"
          value={stats.examCount}
          icon={FileText}
          gradient="from-cyan-500 to-teal-500"
        />
        <StatCard
          title="Rooms"
          value={stats.roomCount}
          icon={DoorOpen}
          gradient="from-amber-500 to-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Admins"
          value={stats.adminCount}
          icon={ShieldCheck}
          gradient="from-emerald-500 to-green-500"
        />
        <StatCard
          title="Submissions"
          value={stats.submissionCount}
          icon={Target}
          gradient="from-violet-500 to-purple-500"
        />
        <StatCard
          title="Platform Avg Score"
          value={`${stats.overallAvg}%`}
          icon={TrendingUp}
          gradient="from-rose-500 to-pink-600"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-muted/60 p-1 rounded-lg">
          <TabsTrigger value="users" className="rounded-md">
            All Users
          </TabsTrigger>
          <TabsTrigger value="submissions" className="rounded-md">
            Recent Submissions
          </TabsTrigger>
          <TabsTrigger value="charts" className="rounded-md">
            Charts
          </TabsTrigger>
        </TabsList>

        {/* Users Table */}
        <TabsContent value="users">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                All Platform Users
              </CardTitle>
              <CardDescription>{users.length} total users registered</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border/60 text-left">
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">Name</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">ID</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">Role</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">Email</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">Joined</th>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr
                        key={`${u.user_number}-${i}`}
                        className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-medium text-foreground flex items-center gap-2.5">
                          <Avatar className="w-7 h-7 border shadow-sm">
                            <AvatarImage src={u.avatar || undefined} alt={u.name} />
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                              {u.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{u.name}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">
                          {u.user_number}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={
                              u.role === 'ADMIN'
                                ? 'default'
                                : u.role === 'TEACHER'
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className="text-xs capitalize"
                          >
                            {u.role.toLowerCase()}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-xs">
                          {u.email || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-xs">
                          {new Date(u.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {u.role.toLowerCase() === 'student' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50"
                              asChild
                            >
                              <Link href={`/dashboard?studentId=${u.id}`}>
                                <LayoutDashboard className="w-3.5 h-3.5" /> View Dashboard
                              </Link>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Submissions */}
        <TabsContent value="submissions">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-pink-500" />
                Recent Submissions
              </CardTitle>
              <CardDescription>Latest 10 exam submissions across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {recentSubmissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No submissions yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left">
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground">Student</th>
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground">ID</th>
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground">Exam</th>
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground">Score</th>
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground">%</th>
                        <th className="py-2.5 px-3 font-semibold text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSubmissions.map((sub, i) => {
                        const pct = Math.round((sub.score / sub.total) * 100)
                        return (
                          <tr
                            key={`${sub.exam_code}-${sub.user_number}-${i}`}
                            className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-2.5 px-3 font-medium text-foreground">
                              {sub.user_name}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">
                              {sub.user_number}
                            </td>
                            <td className="py-2.5 px-3 text-foreground">{sub.title}</td>
                            <td className="py-2.5 px-3">
                              {sub.score}/{sub.total}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant={
                                  pct >= 70 ? 'default' : pct >= 50 ? 'secondary' : 'destructive'
                                }
                                className="text-xs"
                              >
                                {pct}%
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground text-xs">
                              {new Date(sub.finished_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Distribution Pie Chart */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  User Distribution
                </CardTitle>
                <CardDescription>Breakdown of user types on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={pieConfig} className="h-[300px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="flex items-center justify-center gap-6 mt-4">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-bold text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Platform Summary Card */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Platform Summary
                </CardTitle>
                <CardDescription>Key metrics at a glance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-2">
                <div className="space-y-4">
                  {[
                    { label: 'Total Exams', value: stats.examCount, color: 'bg-cyan-500' },
                    { label: 'Total Rooms', value: stats.roomCount, color: 'bg-amber-500' },
                    {
                      label: 'Total Submissions',
                      value: stats.submissionCount,
                      color: 'bg-violet-500',
                    },
                    {
                      label: 'Platform Avg Score',
                      value: `${stats.overallAvg}%`,
                      color: 'bg-pink-500',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-2 border-b border-border/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${item.color}`} />
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
