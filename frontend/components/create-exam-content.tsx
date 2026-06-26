'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { saveExam, examExists } from '@/lib/exam-store'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  ListChecks,
  Pencil,
  Plus,
  Send,
  Sparkles,
  ToggleLeft,
  Trash2,
  X,
} from 'lucide-react'

type QuestionType = 'true_false' | 'multiple_choice'

interface SavedQuestion {
  id: string
  type: QuestionType
  prompt: string
  mark?: number
  // true/false
  answerBool?: boolean
  // multiple choice
  options?: string[]
  correctIndexes?: number[]
  /** Per-option marks for multiple choice questions (index -> mark) */
  optionMarks?: Record<number, number>
}

const uid = () => Math.random().toString(36).slice(2, 10)

export default function CreateExamContent({ showLogo = true }: { showLogo?: boolean } = {}) {
  const { user } = useAuth()
  const router = useRouter()

  const [questions, setQuestions] = useState<SavedQuestion[]>([])
  const [type, setType] = useState<QuestionType>('true_false')
  const [examCode, setExamCode] = useState('')
  const [published, setPublished] = useState(false)

  // current true/false draft
  const [tfPrompt, setTfPrompt] = useState('')
  const [tfAnswer, setTfAnswer] = useState<'true' | 'false'>('true')
  const [tfMark, setTfMark] = useState('1')

  // current multiple-choice draft
  const [mcPrompt, setMcPrompt] = useState('')
  const [mcOptions, setMcOptions] = useState<string[]>(['', '', '', ''])
  const [mcCorrect, setMcCorrect] = useState<number[]>([])
  const [mcMark, setMcMark] = useState('1')
  const [mcOptionMarks, setMcOptionMarks] = useState<Record<number, number>>({})

  const [error, setError] = useState('')

  // overwrite confirmation
  const [pendingCode, setPendingCode] = useState<string | null>(null)

  const resetDrafts = () => {
    setTfPrompt('')
    setTfAnswer('true')
    setTfMark('1')
    setMcPrompt('')
    setMcOptions(['', '', '', ''])
    setMcCorrect([])
    setMcMark('1')
    setMcOptionMarks({})
    setError('')
  }

  const parseMark = (v: string): number | undefined => {
    const n = parseInt(v, 10)
    return isNaN(n) || n < 1 ? undefined : n
  }

  const handleNext = () => {
    setError('')

    if (type === 'true_false') {
      if (!tfPrompt.trim()) {
        setError('Please write the true/false statement.')
        return
      }
      setQuestions((prev) => [
        ...prev,
        {
          id: uid(),
          type: 'true_false',
          prompt: tfPrompt.trim(),
          mark: parseMark(tfMark),
          answerBool: tfAnswer === 'true',
        },
      ])
    } else {
      const filled = mcOptions.map((o) => o.trim())
      if (!mcPrompt.trim()) {
        setError('Please write the question.')
        return
      }
      if (filled.filter(Boolean).length < 2) {
        setError('Please provide at least two answers.')
        return
      }
      if (mcCorrect.length === 0) {
        setError('Select at least one correct answer.')
        return
      }
      if (mcCorrect.some((i) => !filled[i])) {
        setError('A selected correct answer cannot be empty.')
        return
      }
      setQuestions((prev) => [
        ...prev,
        {
          id: uid(),
          type: 'multiple_choice',
          prompt: mcPrompt.trim(),
          mark: parseMark(mcMark),
          options: filled.filter(Boolean),
          correctIndexes: mcCorrect.map(
            (idx) => filled.slice(0, idx + 1).filter(Boolean).length - 1
          ),
          optionMarks: mcOptionMarks,
        },
      ])
    }

    resetDrafts()
  }

  const addOption = () => setMcOptions((prev) => [...prev, ''])

  const removeOption = (index: number) => {
    setMcOptions((prev) => prev.filter((_, i) => i !== index))
    setMcCorrect((prev) => prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)))
  }

  const updateOption = (index: number, value: string) =>
    setMcOptions((prev) => prev.map((o, i) => (i === index ? value : o)))

  const updateMcCorrect = (index: number, checked: boolean) => {
    setMcCorrect((prev) => (checked ? [...prev, index] : prev.filter((i) => i !== index)))
  }

  const removeQuestion = (id: string) => setQuestions((prev) => prev.filter((q) => q.id !== id))

  const handlePublish = () => {
    setError('')
    if (!examCode.trim()) {
      setError('Please enter an exam code before publishing.')
      return
    }
    if (questions.length === 0) {
      setError('Add at least one question before publishing.')
      return
    }
    if (examExists(examCode)) {
      setPendingCode(examCode.trim())
      return
    }
    doPublish()
  }

  const doPublish = () => {
    const saved = saveExam(examCode, questions, String(user?.number) || '')
    setExamCode(saved.code)
    setPublished(true)
    setPendingCode(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showLogo={showLogo} />
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Create exam</h1>
              <p className="text-sm text-muted-foreground">
                Build questions one at a time, then save your exam.
              </p>
            </div>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => router.push('/exam/generate')}>
            <Sparkles className="h-4 w-4" />
            Generate from text or PDF
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Builder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New question</CardTitle>
              <CardDescription>
                Choose a question type, fill it in, then click Next to add another.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 sm:max-w-xs">
                <Label htmlFor="qtype">Question type</Label>
                <Select
                  value={type}
                  onValueChange={(value: QuestionType) => {
                    setType(value)
                    setError('')
                  }}
                >
                  <SelectTrigger id="qtype" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true_false">
                      <div className="flex items-center gap-2">
                        <ToggleLeft className="w-4 h-4" />
                        <span>True / False</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="multiple_choice">
                      <div className="flex items-center gap-2">
                        <ListChecks className="w-4 h-4" />
                        <span>Choose correct answer</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {type === 'true_false' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tf-prompt">Statement</Label>
                    <Input
                      id="tf-prompt"
                      placeholder="e.g. The Earth orbits the Sun."
                      value={tfPrompt}
                      onChange={(e) => setTfPrompt(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Correct answer</Label>
                    <RadioGroup
                      value={tfAnswer}
                      onValueChange={(v) => setTfAnswer(v as 'true' | 'false')}
                      className="flex gap-3"
                    >
                      <label
                        htmlFor="tf-true"
                        className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors flex-1"
                      >
                        <RadioGroupItem value="true" id="tf-true" />
                        <span className="font-medium">True</span>
                      </label>
                      <label
                        htmlFor="tf-false"
                        className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors flex-1"
                      >
                        <RadioGroupItem value="false" id="tf-false" />
                        <span className="font-medium">False</span>
                      </label>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tf-mark">Mark</Label>
                    <Input
                      id="tf-mark"
                      type="number"
                      min={1}
                      placeholder="1"
                      value={tfMark}
                      onChange={(e) => setTfMark(e.target.value)}
                      className="w-24"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mc-prompt">Question</Label>
                    <Input
                      id="mc-prompt"
                      placeholder="e.g. What is the capital of France?"
                      value={mcPrompt}
                      onChange={(e) => setMcPrompt(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Answers</Label>
                    <p className="text-xs text-muted-foreground">
                      Select one or more correct answers.
                    </p>
                    <div className="space-y-2">
                      {mcOptions.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={mcCorrect.includes(index)}
                            onChange={(e) => updateMcCorrect(index, e.target.checked)}
                            id={`mc-${index}`}
                          />
                          <Input
                            placeholder={`Answer ${index + 1}`}
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            className="flex-1"
                          />
                          {mcCorrect.includes(index) && (
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              placeholder="Pts"
                              value={mcOptionMarks[index] || 1}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10)
                                if (!isNaN(val) && val >= 1) {
                                  setMcOptionMarks((prev) => ({ ...prev, [index]: val }))
                                }
                              }}
                              className="w-16"
                            />
                          )}
                          {mcOptions.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeOption(index)}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label={`Remove answer ${index + 1}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={addOption}
                    >
                      <Plus className="w-4 h-4" />
                      Add answer
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mc-mark">Mark</Label>
                    <Input
                      id="mc-mark"
                      type="number"
                      min={1}
                      placeholder="1"
                      value={mcMark}
                      onChange={(e) => setMcMark(e.target.value)}
                      className="w-24"
                    />
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end">
                <Button className="gap-2" onClick={handleNext}>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Added questions */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Added questions</CardTitle>
                <Badge variant="secondary">{questions.length}</Badge>
              </div>
              <CardDescription>Questions you have added to this exam.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {questions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                    <CircleHelp className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No questions yet.</p>
                </div>
              ) : (
                questions.map((q, index) => (
                  <div key={q.id} className="rounded-lg border border-border p-3 bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {index + 1}.
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {q.type === 'true_false' ? 'True / False' : 'Multiple choice'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground font-mono">
                          {q.mark ?? 1} pt
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeQuestion(q.id)}
                          className="text-muted-foreground hover:text-destructive -mr-1 -mt-1"
                          aria-label="Remove question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-foreground mt-2">{q.prompt}</p>
                    {q.type === 'true_false' ? (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-primary" />
                        Answer: {q.answerBool ? 'True' : 'False'}
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {q.options?.map((opt, i) => (
                          <li
                            key={i}
                            className={`text-xs flex items-center gap-1 ${
                              q.correctIndexes?.includes(i)
                                ? 'text-primary font-medium'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {q.correctIndexes?.includes(i) ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <span className="w-3 h-3 inline-block rounded-full border border-border" />
                            )}
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Publish */}
          <Card className="h-fit lg:col-start-2">
            <CardHeader>
              <CardTitle className="text-base">Publish exam</CardTitle>
              <CardDescription>
                Set an exam code students will use to join, then publish.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exam-code">Exam code</Label>
                <Input
                  id="exam-code"
                  placeholder="e.g. MATH-101"
                  value={examCode}
                  onChange={(e) => {
                    setExamCode(e.target.value)
                    setPublished(false)
                  }}
                />
              </div>
              <Button className="w-full gap-2" onClick={handlePublish}>
                <Send className="w-4 h-4" />
                Publish exam
              </Button>
              {published && (
                <div className="space-y-2">
                  <p className="text-sm text-primary flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Published! Students can join with code{' '}
                    <span className="font-semibold">{examCode.trim().toUpperCase()}</span>.
                  </p>
                  <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                    <Link href={`/exams/${encodeURIComponent(examCode.trim().toUpperCase())}`}>
                      <Pencil className="w-4 h-4" />
                      View & edit questions
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Overwrite confirmation dialog */}
      <AlertDialog open={!!pendingCode} onOpenChange={(open) => !open && setPendingCode(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Exam code already exists</AlertDialogTitle>
            <AlertDialogDescription>
              An exam with code{' '}
              <span className="font-mono font-semibold">{pendingCode?.toUpperCase()}</span> already
              exists. Publishing will replace all its questions with the current set. Do you want to
              continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingCode(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doPublish}>Replace exam</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
