'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getExam, type Exam } from '@/lib/exam-store'
import { getExamEntryState } from '@/lib/exam-entry-state'
import {
  calculateQuestionMaxScore,
  calculateQuestionScore,
  isQuestionCorrect,
} from '@/lib/exam-scoring'
import {
  joinExam,
  submitExamResult,
  getExamSettings,
  getMySubmission,
  type ExamSettings,
} from '@/lib/exam-submissions'
import { useAuth } from '@/lib/auth-context'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  CheckCircle2,
  FileQuestion,
  XCircle,
  Check,
  X,
  AlertCircle,
  Lock,
  UserX,
  Trophy,
  Target,
  BarChart3,
  Eye,
  Home,
} from 'lucide-react'
import { ExamPerformanceChart } from '@/components/exam-performance-chart'
import { ExamResultView } from '@/components/exam-result-view'

export default function TakeExamPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const { user } = useAuth()

  const [exam, setExam] = useState<Exam | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [submitted, setSubmitted] = useState(false)
  const [viewMode, setViewMode] = useState<'exam' | 'result' | 'review'>('exam')
  const [examStarted, setExamStarted] = useState(true)
  const [examHasEnded, setExamHasEnded] = useState(false)
  const [hasEnteredExam, setHasEnteredExam] = useState(false)
  const [timeUntilStart, setTimeUntilStart] = useState<number | null>(null)
  const [settings, setSettings] = useState<ExamSettings | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [kickedOut, setKickedOut] = useState(false)
  const [pastScore, setPastScore] = useState<{ score: number; total: number } | null>(null)

  useEffect(() => {
    async function loadExam() {
      try {
        const found = await getExam(decodeURIComponent(code))
        setExam(found)
        if (found) {
          const s = await getExamSettings(found.code)
          setSettings(s)

          if (user) {
            const sub = await getMySubmission(found.code)
            if (sub && sub.finished_at) {
              setAnswers(sub.answers || {})
              setPastScore({ score: sub.score, total: sub.total })
              setSubmitted(true)
              setViewMode('result')
              setHasEnteredExam(true)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load exam:', err)
      } finally {
        setLoaded(true)
      }
    }
    if (user !== undefined) {
      loadExam()
    }
  }, [code, user])

  useEffect(() => {
    const updateStartState = () => {
      const state = getExamEntryState(exam?.startAt, exam?.endAt)
      setExamStarted(state.canEnter)
      setExamHasEnded(state.hasEnded)
      setTimeUntilStart(state.timeUntilStart)
    }

    updateStartState()
    const timer = window.setInterval(updateStartState, 1000)
    return () => window.clearInterval(timer)
  }, [exam?.startAt, exam?.endAt])

  // Polling to detect if kicked out
  useEffect(() => {
    if (!hasEnteredExam || submitted || !exam || !user) return

    const checkStatus = async () => {
      try {
        const sub = await getMySubmission(exam.code)
        // If we entered but the backend has no record, we were kicked
        if (!sub) {
          setKickedOut(true)
        }
      } catch (e) {}
    }

    const timer = setInterval(checkStatus, 5000)
    return () => clearInterval(timer)
  }, [hasEnteredExam, submitted, exam, user])

  const formatTimeLeft = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000))
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const parts = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0 || days > 0) parts.push(`${hours}h`)
    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`)
    parts.push(`${seconds}s`)
    return parts.join(' ')
  }

  const setAnswer = (questionId: string, value: string) =>
    setAnswers((prev) => {
      if (submitted || !examStarted || examHasEnded || !hasEnteredExam) return prev
      const cur = prev[questionId] || []
      return {
        ...prev,
        [questionId]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
      }
    })

  const getQuestionMaxScore = (q: Exam['questions'][number]): number => calculateQuestionMaxScore(q)
  const getQuestionScore = (q: Exam['questions'][number]): number =>
    calculateQuestionScore(q, answers[q.id] || [])
  const isCorrect = (q: Exam['questions'][number]): boolean =>
    isQuestionCorrect(q, answers[q.id] || [])

  const selectedAnswerLabel = (q: Exam['questions'][number]) => {
    const selected = answers[q.id] || []
    if (q.type === 'true_false') {
      return selected[0] === 'true'
        ? ['True']
        : selected[0] === 'false'
          ? ['False']
          : ['Not answered']
    }
    return selected.length > 0
      ? selected.map((value) => q.options?.[Number(value)] || '').filter(Boolean)
      : ['Not answered']
  }

  const correctAnswerLabel = (q: Exam['questions'][number]) => {
    if (q.type === 'true_false') {
      return [q.answerBool ? 'True' : 'False']
    }
    return (q.correctIndexes || []).map((idx) => q.options?.[idx] || '')
  }

  const score = pastScore
    ? pastScore.score
    : exam
      ? exam.questions.reduce((sum, q) => sum + getQuestionScore(q), 0)
      : 0
  const total = pastScore
    ? pastScore.total
    : exam
      ? exam.questions.reduce((sum, q) => sum + calculateQuestionMaxScore(q), 0)
      : 0
  const allAnswered = exam ? exam.questions.every((q) => (answers[q.id]?.length ?? 0) > 0) : false

  const handleEnterExam = async () => {
    setJoinError(null)
    if (user && exam) {
      setIsJoining(true)
      try {
        await joinExam(exam.code)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to join exam'
        setJoinError(message)
        setIsJoining(false)
        return
      }
      setIsJoining(false)
    }
    setHasEnteredExam(true)
  }

  const handleSubmit = async () => {
    setSubmitted(true)
    setViewMode('result')
    if (user && exam) {
      try {
        await submitExamResult(exam.code, score, total, answers)
      } catch (err) {
        console.error('Failed to record submission:', err)
      }
    }
  }

  if (loaded && !exam) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-lg">
          <Card>
            <CardContent className="flex flex-col items-center text-center py-12 gap-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <FileQuestion className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Exam not found</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  No published exam matches the code{' '}
                  <span className="font-medium">{decodeURIComponent(code).toUpperCase()}</span>.
                  Double-check the code with your instructor.
                </p>
              </div>
              <Button variant="outline" className="gap-2" onClick={() => router.push('/')}>
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  // Kicked out
  if (kickedOut) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-lg">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="flex flex-col items-center text-center py-12 gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <UserX className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">You were removed</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  The instructor has removed you from this exam. Your progress has been discarded.
                </p>
              </div>
              <Button variant="outline" className="gap-2" onClick={() => router.push('/')}>
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  // Locked exam
  if (loaded && exam && settings?.is_locked && !hasEnteredExam) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-10 max-w-lg">
          <Card>
            <CardContent className="flex flex-col items-center text-center py-12 gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Exam is locked</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  The instructor has locked this exam. Entry is not permitted at this time.
                </p>
              </div>
              <Button variant="outline" className="gap-2" onClick={() => router.push('/')}>
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{exam?.title || 'Exam'}</h1>
              <p className="text-sm text-muted-foreground">
                Code: <span className="font-medium">{exam?.code}</span> ·{' '}
                {exam?.questions.length ?? 0} question
                {exam?.questions.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          {submitted && (
            <Badge variant="secondary" className="text-sm">
              Score: {score}/{total}
            </Badge>
          )}
        </div>

        {viewMode === 'exam' && examHasEnded ? (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center rounded-full bg-muted p-3">
                <FileQuestion className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Exam has ended</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  The exam closed at{' '}
                  <span className="font-medium text-foreground">
                    {exam?.endAt ? new Date(exam.endAt).toLocaleString() : 'the scheduled end time'}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {viewMode === 'exam' && !examStarted && !examHasEnded ? (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
                <FileQuestion className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Exam starts soon</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This exam is scheduled to begin at{' '}
                  <span className="font-medium text-foreground">
                    {exam?.startAt ? new Date(exam.startAt).toLocaleString() : 'soon'}
                  </span>
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm font-medium text-foreground">
                Time remaining: {timeUntilStart !== null ? formatTimeLeft(timeUntilStart) : '0s'}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {viewMode === 'exam' && examStarted && !examHasEnded && !hasEnteredExam ? (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
                <FileQuestion className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">The exam is ready</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Press the button below to begin answering the questions.
                </p>
              </div>
              {joinError && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {joinError}
                </div>
              )}
              <Button
                size="lg"
                className="w-full sm:w-auto"
                disabled={isJoining}
                onClick={handleEnterExam}
              >
                {isJoining ? 'Joining...' : 'Enter exam'}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {viewMode === 'exam' && examStarted && !examHasEnded && hasEnteredExam ? (
          <div className="space-y-4">
            {exam?.questions.map((q, index) => {
              const questionScore = getQuestionScore(q)
              const questionMax = getQuestionMaxScore(q)
              const correct = submitted && isCorrect(q)
              const wrong = submitted && !isCorrect(q)
              const partial = submitted && questionScore > 0 && !correct
              return (
                <Card key={q.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base font-medium leading-relaxed">
                        <span className="text-muted-foreground mr-1">{index + 1}.</span>
                        {q.prompt}
                      </CardTitle>
                      {submitted &&
                        (correct ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : questionScore > 0 ? (
                          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive shrink-0" />
                        ))}
                    </div>
                    <CardDescription>
                      {q.type === 'true_false'
                        ? 'True / False'
                        : 'Choose one or more correct answers'}
                      {submitted && (
                        <span className="ml-2 text-xs">
                          ({questionMax} {questionMax === 1 ? 'point' : 'points'})
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {q.type === 'true_false' ? (
                      <RadioGroup
                        value={answers[q.id]?.[0] ?? ''}
                        onValueChange={(v) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: [v],
                          }))
                        }
                        disabled={submitted || !examStarted || examHasEnded}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                      >
                        {['true', 'false'].map((val) => (
                          <label
                            key={val}
                            htmlFor={`${q.id}-${val}`}
                            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors flex-1"
                          >
                            <RadioGroupItem value={val} id={`${q.id}-${val}`} />
                            <span className="font-medium capitalize">{val}</span>
                            {submitted && String(q.answerBool) === val && (
                              <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />
                            )}
                          </label>
                        ))}
                      </RadioGroup>
                    ) : (
                      <div className="space-y-2">
                        {q.options?.map((opt, i) => (
                          <label
                            key={i}
                            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={(answers[q.id] || []).includes(String(i))}
                              disabled={submitted || !examStarted || examHasEnded}
                              onChange={() => setAnswer(q.id, String(i))}
                            />
                            <span className="text-sm">{opt}</span>
                            {submitted && q.correctIndexes?.includes(i) && (
                              <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                    {partial && (
                      <p className="text-xs text-foreground/80 mt-3">
                        Partially correct. You scored {questionScore}/{questionMax} for this
                        question.
                      </p>
                    )}
                    {wrong && !partial && (
                      <p className="text-xs text-destructive mt-3">Your answer was incorrect.</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : null}

        <Separator className="my-6" />

        {viewMode === 'exam' ? (
          <Button
            size="lg"
            className="w-full"
            disabled={!allAnswered || !examStarted || examHasEnded || !hasEnteredExam}
            onClick={handleSubmit}
          >
            {examHasEnded
              ? 'Exam has ended'
              : examStarted && hasEnteredExam
                ? allAnswered
                  ? 'Submit exam'
                  : 'Answer all questions to submit'
                : 'Enter the exam to start'}
          </Button>
        ) : viewMode === 'result' ? (
          <ExamResultView
            score={score}
            total={total}
            exam={exam}
            answers={answers}
            isCorrect={isCorrect}
            getQuestionScore={getQuestionScore}
            getQuestionMaxScore={getQuestionMaxScore}
            onReview={() => setViewMode('review')}
            onDashboard={() => router.push('/dashboard')}
            onHome={() => router.push('/')}
          />
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Review your answers</CardTitle>
                <CardDescription>
                  See your answer, the correct answer, and the mark for each question.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {exam?.questions.map((q, index) => {
                  const questionScore = getQuestionScore(q)
                  const questionMax = getQuestionMaxScore(q)
                  const isTF = q.type === 'true_false'
                  const optionsList = isTF ? ['true', 'false'] : q.options || []

                  return (
                    <div
                      key={q.id}
                      className="rounded-lg border border-border p-4 space-y-4 bg-muted/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-foreground">
                            {index + 1}. {q.prompt}
                          </p>
                          <Badge variant="outline" className="text-xs font-normal">
                            Mark: {questionMax}
                          </Badge>
                        </div>
                        <Badge
                          variant={
                            questionScore === questionMax
                              ? 'default'
                              : questionScore > 0
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {questionScore}/{questionMax}
                        </Badge>
                      </div>

                      <div className="grid gap-2">
                        {optionsList.map((opt, optIndex) => {
                          const optVal = String(optIndex)
                          const isSelected = isTF
                            ? answers[q.id]?.[0] === (optIndex === 0 ? 'true' : 'false')
                            : (answers[q.id] || []).includes(optVal)

                          let isCorrectOpt = false
                          if (isTF) {
                            isCorrectOpt =
                              String(q.answerBool) === (optIndex === 0 ? 'true' : 'false')
                          } else {
                            const correctIdxs =
                              q.correctIndexes ||
                              (q.correctIndex !== undefined ? [q.correctIndex] : [])
                            isCorrectOpt = correctIdxs.includes(optIndex)
                          }

                          let containerClass =
                            'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors '
                          let icon = null

                          if (isCorrectOpt && isSelected) {
                            containerClass +=
                              'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-medium'
                            icon = <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          } else if (isCorrectOpt && !isSelected) {
                            containerClass +=
                              'bg-emerald-500/5 border-dashed border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            icon = <Check className="w-4 h-4 text-emerald-500/70 shrink-0" />
                          } else if (!isCorrectOpt && isSelected) {
                            containerClass +=
                              'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300 font-medium'
                            icon = <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          } else {
                            containerClass +=
                              'border-border/60 opacity-60 text-muted-foreground bg-background'
                            icon = (
                              <span className="w-4 h-4 rounded-full border border-border/80 inline-block shrink-0" />
                            )
                          }

                          return (
                            <div key={optIndex} className={containerClass}>
                              {icon}
                              <span className="flex-1">
                                {isTF ? (optIndex === 0 ? 'True' : 'False') : opt}
                                {!isTF &&
                                  isCorrectOpt &&
                                  q.optionMarks &&
                                  q.optionMarks[optIndex] !== undefined && (
                                    <span className="ml-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                      (+{q.optionMarks[optIndex]}{' '}
                                      {q.optionMarks[optIndex] === 1 ? 'pt' : 'pts'})
                                    </span>
                                  )}
                              </span>
                              {isSelected && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] uppercase tracking-wider scale-90 border-foreground/20 text-foreground/70"
                                >
                                  Your Choice
                                </Badge>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setViewMode('result')}>Back to result</Button>
              <Button variant="outline" onClick={() => router.push('/')}>
                Back to home
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
