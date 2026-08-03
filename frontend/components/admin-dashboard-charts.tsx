'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Users,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  FileText,
  PieChart as PieIcon,
  BarChart3,
  Award,
  AlertTriangle,
} from 'lucide-react'

export interface ExamStatItem {
  code: string
  title: string
  participant_count: number
  passed_count: number
  failed_count: number
  avg_score: number
}

export interface AdminChartsProps {
  stats: {
    studentCount: number
    teacherCount: number
    adminCount: number
    examCount: number
    submissionCount: number
    overallAvg: number
    passedCount?: number
    failedCount?: number
  }
  exams?: ExamStatItem[]
}

const USER_ROLE_COLORS = {
  Students: '#10b981', // emerald-500
  Teachers: '#6366f1', // indigo-500
  Admins: '#f43f5e', // rose-500
}

const EXAM_RESULT_COLORS = {
  Passed: '#10b981', // emerald-500
  Failed: '#ef4444', // red-500
}

export function AdminDashboardCharts({ stats, exams = [] }: AdminChartsProps) {
  const [activeExamFilter, setActiveExamFilter] = useState<'all' | 'with_attempts'>('all')

  // ───────────────────────────────────────────────────────────────────────────
  // PART 1: USERS BREAKDOWN CALCULATIONS (Student, Teacher, Admin)
  // ───────────────────────────────────────────────────────────────────────────
  const totalUsers = stats.studentCount + stats.teacherCount + stats.adminCount
  const studentPct = totalUsers > 0 ? Math.round((stats.studentCount / totalUsers) * 100) : 0
  const teacherPct = totalUsers > 0 ? Math.round((stats.teacherCount / totalUsers) * 100) : 0
  const adminPct = totalUsers > 0 ? Math.round((stats.adminCount / totalUsers) * 100) : 0

  const userPieData = [
    { name: 'Students', value: stats.studentCount, color: USER_ROLE_COLORS.Students },
    { name: 'Teachers', value: stats.teacherCount, color: USER_ROLE_COLORS.Teachers },
    { name: 'Admins', value: stats.adminCount, color: USER_ROLE_COLORS.Admins },
  ].filter((d) => d.value > 0)

  const userBarData = [
    {
      role: 'Students',
      count: stats.studentCount,
      fill: USER_ROLE_COLORS.Students,
      pct: studentPct,
    },
    {
      role: 'Teachers',
      count: stats.teacherCount,
      fill: USER_ROLE_COLORS.Teachers,
      pct: teacherPct,
    },
    { role: 'Admins', count: stats.adminCount, fill: USER_ROLE_COLORS.Admins, pct: adminPct },
  ]

  const userChartConfig: ChartConfig = {
    Students: { label: 'Students', color: USER_ROLE_COLORS.Students },
    Teachers: { label: 'Teachers', color: USER_ROLE_COLORS.Teachers },
    Admins: { label: 'Admins', color: USER_ROLE_COLORS.Admins },
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PART 2: EXAMS FAIL & SUCCESS BREAKDOWN CALCULATIONS
  // ───────────────────────────────────────────────────────────────────────────
  // Calculate total passed and failed submissions across all exams or stats
  const calculatedPassedFromExams = exams.reduce((acc, curr) => acc + (curr.passed_count || 0), 0)
  const calculatedFailedFromExams = exams.reduce((acc, curr) => acc + (curr.failed_count || 0), 0)

  const totalPassed = stats.passedCount ?? calculatedPassedFromExams
  const totalFailed = stats.failedCount ?? calculatedFailedFromExams
  const totalEvaluated = totalPassed + totalFailed

  const passRatePct =
    totalEvaluated > 0
      ? Math.round((totalPassed / totalEvaluated) * 100)
      : stats.overallAvg > 0
        ? stats.overallAvg
        : 0
  const failRatePct = totalEvaluated > 0 ? 100 - passRatePct : 0

  const examResultPieData = [
    { name: 'Passed', value: totalPassed, color: EXAM_RESULT_COLORS.Passed },
    { name: 'Failed', value: totalFailed, color: EXAM_RESULT_COLORS.Failed },
  ].filter((d) => d.value > 0)

  const examResultChartConfig: ChartConfig = {
    Passed: { label: 'Passed Students', color: EXAM_RESULT_COLORS.Passed },
    Failed: { label: 'Failed Students', color: EXAM_RESULT_COLORS.Failed },
  }

  // Per-Exam Passed vs Failed Bar Chart Data
  const displayedExams = exams.filter((e) =>
    activeExamFilter === 'with_attempts' ? e.participant_count > 0 : true
  )

  const examComparisonBarData = displayedExams.slice(0, 10).map((e) => ({
    name: e.title.length > 14 ? e.title.slice(0, 14) + '…' : e.title,
    fullTitle: e.title,
    code: e.code,
    Passed: e.passed_count || 0,
    Failed: e.failed_count || 0,
    avg: e.avg_score || 0,
    total: e.participant_count || 0,
  }))

  return (
    <div className="space-y-10">
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* PART 1: EXAM PERFORMANCE - FAIL & SUCCESS STUDENTS                    */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold">
                PART 1
              </Badge>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-500" />
                Exams Pass & Fail Student Analytics
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Comprehensive success vs failure rates, pass percentages, and exam outcome comparisons
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setActiveExamFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeExamFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              All Exams ({exams.length})
            </button>
            <button
              onClick={() => setActiveExamFilter('with_attempts')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeExamFilter === 'with_attempts'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              With Attempts ({exams.filter((e) => e.participant_count > 0).length})
            </button>
          </div>
        </div>

        {/* Top Summary Cards for Exam Results */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Overall Pass Rate
                  </p>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {passRatePct}%
                  </p>
                </div>
                <div className="w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-2 font-medium">
                {totalPassed} student submission{totalPassed === 1 ? '' : 's'} passed
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-500/20 bg-red-500/5 dark:bg-red-500/10 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
                    Overall Fail Rate
                  </p>
                  <p className="text-3xl font-black text-red-600 dark:text-red-400 mt-1">
                    {failRatePct}%
                  </p>
                </div>
                <div className="w-11 h-11 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-2 font-medium">
                {totalFailed} student submission{totalFailed === 1 ? '' : 's'} failed
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Total Exam Attempts
                  </p>
                  <p className="text-3xl font-black text-foreground mt-1">
                    {stats.submissionCount || totalEvaluated}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                Evaluated student submissions
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Avg Score Grade
                  </p>
                  <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {stats.overallAvg}%
                  </p>
                </div>
                <div className="w-11 h-11 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                Platform mean exam score
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Charts Grid for Exam Pass/Fail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Donut Chart: Fail vs Success Proportion */}
          <Card className="lg:col-span-5 shadow-sm border-border/60 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-500" />
                Student Pass vs. Fail Ratio
              </CardTitle>
              <CardDescription>
                Proportion of passed vs. failed student attempts across all exams
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-2">
              {examResultPieData.length > 0 ? (
                <>
                  <div className="relative h-[250px] w-full flex items-center justify-center">
                    <ChartContainer config={examResultChartConfig} className="h-full w-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Pie
                          data={examResultPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                          nameKey="name"
                          strokeWidth={2}
                          stroke="hsl(var(--background))"
                        >
                          {examResultPieData.map((entry, index) => (
                            <Cell key={`cell-exam-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    {/* Center Text Gauge */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black text-foreground">{passRatePct}%</span>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Pass Rate
                      </span>
                    </div>
                  </div>

                  {/* Legend & Details */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/60 text-center">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          Passed Students
                        </span>
                      </div>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        {totalPassed} ({passRatePct}%)
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center justify-center gap-1.5">
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                          Failed Students
                        </span>
                      </div>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-1">
                        {totalFailed} ({failRatePct}%)
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[250px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <AlertTriangle className="w-10 h-10 mb-2 opacity-40 text-amber-500" />
                  <p className="text-sm font-medium">No exam submissions recorded yet.</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Students need to complete exams to generate fail/success analytics.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bar Chart: Passed vs Failed Breakdown per Exam */}
          <Card className="lg:col-span-7 shadow-sm border-border/60 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                Per-Exam Success vs Fail Student Breakdown
              </CardTitle>
              <CardDescription>
                Number of passed vs failed students for top platform exams
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pt-2">
              {examComparisonBarData.length > 0 ? (
                <ChartContainer config={examResultChartConfig} className="h-[300px] w-full">
                  <BarChart
                    data={examComparisonBarData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      className="text-muted-foreground"
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name, item) => (
                            <div className="flex items-center justify-between gap-4 text-xs">
                              <span className="font-semibold">{name}:</span>
                              <span className="font-bold">{value} students</span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Bar
                      dataKey="Passed"
                      fill={EXAM_RESULT_COLORS.Passed}
                      radius={[4, 4, 0, 0]}
                      name="Passed Students"
                    />
                    <Bar
                      dataKey="Failed"
                      fill={EXAM_RESULT_COLORS.Failed}
                      radius={[4, 4, 0, 0]}
                      name="Failed Students"
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  No exam data available to plot breakdown chart.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* PART 2: USER ROLES ANALYTICS (Teacher, Student, Admin)                */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-5 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 px-2.5 py-0.5 text-xs font-bold">
                PART 2
              </Badge>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                User Accounts & Role Distribution
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Distribution and proportions of registered Students, Teachers (Instructors), and
              Admins
            </p>
          </div>
        </div>

        {/* User Role Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Students
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      {stats.studentCount}
                    </p>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-600 text-xs font-semibold"
                    >
                      {studentPct}%
                    </Badge>
                  </div>
                </div>
                <div className="w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-2 font-medium">
                Active registered student accounts
              </p>
            </CardContent>
          </Card>

          <Card className="border-indigo-500/30 bg-indigo-500/5 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                    Teachers / Instructors
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                      {stats.teacherCount}
                    </p>
                    <Badge
                      variant="outline"
                      className="border-indigo-500/30 text-indigo-600 text-xs font-semibold"
                    >
                      {teacherPct}%
                    </Badge>
                  </div>
                </div>
                <div className="w-11 h-11 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80 mt-2 font-medium">
                Course creators & instructors
              </p>
            </CardContent>
          </Card>

          <Card className="border-rose-500/30 bg-rose-500/5 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    Administrators
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-black text-rose-600 dark:text-rose-400">
                      {stats.adminCount}
                    </p>
                    <Badge
                      variant="outline"
                      className="border-rose-500/30 text-rose-600 text-xs font-semibold"
                    >
                      {adminPct}%
                    </Badge>
                  </div>
                </div>
                <div className="w-11 h-11 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-2 font-medium">
                System admin controllers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid for User Roles */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* User Distribution Donut Chart */}
          <Card className="lg:col-span-5 shadow-sm border-border/60 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-indigo-500" />
                User Role Share
              </CardTitle>
              <CardDescription>
                Percentage breakdown of user accounts across platform roles
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-2">
              <div className="relative h-[240px] w-full flex items-center justify-center">
                <ChartContainer config={userChartConfig} className="h-full w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={userPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {userPieData.map((entry, index) => (
                        <Cell key={`cell-user-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                {/* Center metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-foreground">{totalUsers}</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Total Users
                  </span>
                </div>
              </div>

              {/* Roles Breakdown Pills */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border/60 text-center">
                <div className="p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 block">
                    Student
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {stats.studentCount} ({studentPct}%)
                  </span>
                </div>
                <div className="p-2 rounded-md bg-indigo-500/10 border border-indigo-500/20">
                  <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 block">
                    Teacher
                  </span>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {stats.teacherCount} ({teacherPct}%)
                  </span>
                </div>
                <div className="p-2 rounded-md bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 block">
                    Admin
                  </span>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    {stats.adminCount} ({adminPct}%)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Count Comparison Bar Chart */}
          <Card className="lg:col-span-7 shadow-sm border-border/60 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                User Count Comparison by Role
              </CardTitle>
              <CardDescription>
                Direct numerical comparison of Students vs Teachers vs Admins
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pt-2">
              <ChartContainer config={userChartConfig} className="h-[280px] w-full">
                <BarChart data={userBarData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="role" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(val, name, props) => (
                          <div className="flex items-center justify-between gap-4 text-xs">
                            <span className="font-semibold">{props.payload.role}:</span>
                            <span className="font-bold">
                              {val} accounts ({props.payload.pct}%)
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Account Count">
                    {userBarData.map((entry, index) => (
                      <Cell key={`bar-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
