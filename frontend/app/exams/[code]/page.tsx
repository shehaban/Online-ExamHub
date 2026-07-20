'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import {
  getExam,
  updateExamQuestions,
  newQuestionId,
  type Exam,
  type ExamQuestion,
  type QuestionType,
} from '@/lib/exam-store'
import { toDatetimeLocalValue, toSqlDateTime, formatDateTimeLocal } from '@/lib/exam-schedule'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  CheckCircle2,
  ListChecks,
  Plus,
  Save,
  Trash2,
  FileQuestion,
  LayoutDashboard,
} from 'lucide-react'

export default function ExamEditorPage() {
  const params = useParams<{ code: string }>()
  const code = decodeURIComponent(params.code)
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [examTitle, setExamTitle] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [endAtManuallyEdited, setEndAtManuallyEdited] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadExam() {
      try {
        const found = await getExam(code)
        setExam(found)
        setQuestions(found ? structuredClone(found.questions) : [])
        setExamTitle(found?.title ?? '')
        setStartAt(toDatetimeLocalValue(found?.startAt))
        setEndAt(toDatetimeLocalValue(found?.endAt))
        if (found?.endAt) {
          setEndAtManuallyEdited(true)
        }
      } catch (err) {
        console.error('Failed to load exam:', err)
      } finally {
        setLoaded(true)
      }
    }
    loadExam()
  }, [code])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  const updateQuestion = (id: string, patch: Partial<ExamQuestion>) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)))

  const removeQuestion = (id: string) => setQuestions((prev) => prev.filter((q) => q.id !== id))

  const addQuestion = (type: QuestionType) => {
    const base: ExamQuestion =
      type === 'true_false'
        ? { id: newQuestionId(), type, prompt: '', answerBool: true }
        : {
            id: newQuestionId(),
            type,
            prompt: '',
            options: ['', '', '', ''],
            correctIndexes: [],
            mark: 0,
          }
    setQuestions((prev) => [...prev, base])
  }

  const updateOption = (id: string, index: number, value: string) =>
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id && q.options
          ? { ...q, options: q.options.map((o, i) => (i === index ? value : o)) }
          : q
      )
    )

  const updateOptionMark = (id: string, optionIndex: number, mark: number) =>
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q
        const optionMarks = { ...(q.optionMarks || {}), [optionIndex]: mark }
        const correct = q.correctIndexes || []
        const sum = correct.reduce((acc, idx) => acc + (optionMarks[idx] ?? 1), 0)
        return { ...q, optionMarks, mark: sum }
      })
    )

  const addOption = (id: string) =>
    setQuestions((prev) =>
      prev.map((q) => (q.id === id && q.options ? { ...q, options: [...q.options, ''] } : q))
    )

  const removeOption = (id: string, index: number) =>
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id || !q.options || q.options.length <= 2) return q
        const options = q.options.filter((_, i) => i !== index)
        const correctIndexes = (q.correctIndexes || [])
          .filter((i) => i !== index)
          .map((i) => (i > index ? i - 1 : i))

        const newOptionMarks: Record<number, number> = {}
        const currentOptionMarks = q.optionMarks || {}
        Object.keys(currentOptionMarks).forEach((keyStr) => {
          const k = Number(keyStr)
          if (k !== index) {
            const newK = k > index ? k - 1 : k
            newOptionMarks[newK] = currentOptionMarks[k]
          }
        })

        const sum = correctIndexes.reduce((acc, idx) => acc + (newOptionMarks[idx] ?? 1), 0)

        return {
          ...q,
          options,
          correctIndexes,
          optionMarks: newOptionMarks,
          mark: sum,
        }
      })
    )

  const handleSave = async () => {
    setError('')
    for (const [i, q] of questions.entries()) {
      if (!q.prompt.trim()) {
        setError(`Question ${i + 1} is missing its prompt.`)
        return
      }
      if (q.type === 'multiple_choice') {
        if (!q.options || q.options.some((o) => !o.trim())) {
          setError(`Question ${i + 1} has an empty answer option.`)
          return
        }
      }
    }
    try {
      const updated = await updateExamQuestions(
        code,
        questions,
        examTitle,
        toSqlDateTime(startAt),
        toSqlDateTime(endAt)
      )
      if (updated) {
        setExam(updated)
        setSavedAt(Date.now())
      } else {
        setError('Failed to update exam: Exam not found or update failed.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating exam')
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (loaded && !exam) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <FileQuestion className="w-6 h-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">Exam not found</h1>
          <p className="text-sm text-muted-foreground mb-6">
            No published exam exists for code{' '}
            <span className="font-mono font-semibold">{code}</span>.
          </p>
          <Button asChild>
            <Link href="/exams">Back to all exams</Link>
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-mono tracking-wide">
                {exam?.code}
              </h1>
              <p className="text-sm text-muted-foreground">
                {questions.length} question{questions.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild className="gap-2">
              <Link href={`/exams/${encodeURIComponent(code)}/admin`}>
                <LayoutDashboard className="w-4 h-4" />
                Admin Dashboard
              </Link>
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Save changes
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {savedAt && !error && (
          <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Changes saved.
          </div>
        )}

        <div className="rounded-lg border border-border p-4 space-y-4 mb-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="exam-title">Exam title</Label>
              <Input
                id="exam-title"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-start">Start date & time</Label>
              <Input
                id="exam-start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => {
                  const val = e.target.value
                  setStartAt(val)
                  if (val) {
                    const newStartDate = new Date(val)
                    if (!isNaN(newStartDate.getTime())) {
                      const currentEndDate = endAt ? new Date(endAt) : null
                      const needsUpdate =
                        !endAt ||
                        !endAtManuallyEdited ||
                        (currentEndDate && newStartDate >= currentEndDate)
                      if (needsUpdate) {
                        const twoHoursLater = new Date(newStartDate.getTime() + 2 * 60 * 60 * 1000)
                        setEndAt(formatDateTimeLocal(twoHoursLater))
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exam-end">End date & time (optional)</Label>
            <Input
              id="exam-end"
              type="datetime-local"
              value={endAt}
              onChange={(e) => {
                setEndAt(e.target.value)
                setEndAtManuallyEdited(true)
              }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((q, index) => (
            <Card key={q.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="text-muted-foreground">Q{index + 1}</span>
                    <Badge variant="secondary">
                      {q.type === 'true_false' ? 'True / False' : 'Multiple choice'}
                    </Badge>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeQuestion(q.id)}
                    title="Remove question"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-3 space-y-2">
                    <Label htmlFor={`prompt-${q.id}`}>Question</Label>
                    <Textarea
                      id={`prompt-${q.id}`}
                      placeholder="Enter the question text"
                      value={q.prompt}
                      onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`mark-${q.id}`}>Points</Label>
                    <Input
                      id={`mark-${q.id}`}
                      type="number"
                      value={q.mark ?? 0}
                      readOnly={q.type === 'multiple_choice'}
                      className={q.type === 'multiple_choice' ? 'bg-muted cursor-not-allowed' : ''}
                      onChange={(e) => {
                        if (q.type === 'multiple_choice') return
                        const value = parseInt(e.target.value, 10)
                        if (!isNaN(value) && value >= 0) {
                          updateQuestion(q.id, { mark: value })
                        }
                      }}
                    />
                  </div>
                </div>

                {q.type === 'true_false' ? (
                  <div className="space-y-2">
                    <Label>Correct answer</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={q.answerBool ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateQuestion(q.id, { answerBool: true })}
                      >
                        True
                      </Button>
                      <Button
                        type="button"
                        variant={!q.answerBool ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateQuestion(q.id, { answerBool: false })}
                      >
                        False
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Answers (select the correct one)</Label>
                    <div className="space-y-2">
                      {q.options?.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2 flex-wrap">
                          <input
                            type="checkbox"
                            checked={(q.correctIndexes || []).includes(i)}
                            onChange={(e) => {
                              const current = q.correctIndexes || []
                              const nextCorrect = e.target.checked
                                ? [...current, i]
                                : current.filter((x) => x !== i)

                              const optionMarks = { ...(q.optionMarks || {}) }
                              if (e.target.checked) {
                                optionMarks[i] = optionMarks[i] ?? 1
                              } else {
                                delete optionMarks[i]
                              }

                              const sum = nextCorrect.reduce(
                                (acc, idx) => acc + (optionMarks[idx] ?? 1),
                                0
                              )

                              updateQuestion(q.id, {
                                correctIndexes: nextCorrect,
                                optionMarks,
                                mark: sum,
                              })
                            }}
                          />
                          <Input
                            placeholder={`Answer ${i + 1}`}
                            value={opt}
                            onChange={(e) => updateOption(q.id, i, e.target.value)}
                            className="flex-1"
                          />
                          {(q.correctIndexes || []).includes(i) && (
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              placeholder="Points"
                              value={q.optionMarks?.[i] ?? 1}
                              onChange={(e) => {
                                const value = parseInt(e.target.value, 10)
                                if (!isNaN(value) && value >= 1) {
                                  updateOptionMark(q.id, i, value)
                                }
                              }}
                              className="w-20"
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeOption(q.id, i)}
                            disabled={(q.options?.length ?? 0) <= 2}
                            title="Remove answer"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => addOption(q.id)}
                    >
                      <Plus className="w-4 h-4" />
                      Add answer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {questions.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                This exam has no questions. Add one below.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add question */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Add a question</CardTitle>
            <CardDescription>Pick a type to append a new question.</CardDescription>
          </CardHeader>
          <CardContent>
            <AddQuestionControl onAdd={addQuestion} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function AddQuestionControl({ onAdd }: { onAdd: (type: QuestionType) => void }) {
  const [type, setType] = useState<QuestionType>('true_false')
  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-4">
      <div className="space-y-2 flex-1">
        <Label htmlFor="add-type">Question type</Label>
        <Select value={type} onValueChange={(v: QuestionType) => setType(v)}>
          <SelectTrigger id="add-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true_false">True / False</SelectItem>
            <SelectItem value="multiple_choice">Choose correct answer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button className="gap-2" onClick={() => onAdd(type)}>
        <Plus className="w-4 h-4" />
        Add question
      </Button>
    </div>
  )
}
