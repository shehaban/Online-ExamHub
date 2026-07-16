'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { saveExam, examExists } from '@/lib/exam-store'
import { useAuth } from '@/lib/auth-context'
import { Header } from '@/components/header'
import { formatDateTimeLocal } from '@/lib/exam-schedule'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

type QuestionType = 'true_false' | 'multiple_choice'

interface GeneratedQuestion {
  id: string
  type: QuestionType
  prompt: string
  answerBool?: boolean
  options?: string[]
  correctIndex?: number
}

const uid = () => Math.random().toString(36).slice(2, 10)

// Lightweight mock generator so the panel is populated without a backend.
function mockGenerate(source: string): GeneratedQuestion[] {
  const sentences = source
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15)
    .slice(0, 5)

  if (sentences.length === 0) {
    return [
      {
        id: uid(),
        type: 'true_false',
        prompt: 'The provided material covers the main topic.',
        answerBool: true,
      },
    ]
  }

  return sentences.map((sentence, i) =>
    i % 2 === 0
      ? {
          id: uid(),
          type: 'true_false',
          prompt: sentence,
          answerBool: true,
        }
      : {
          id: uid(),
          type: 'multiple_choice',
          prompt: `Which statement best relates to: "${sentence.slice(0, 60)}..."?`,
          options: [sentence, 'None of the above', 'Both A and C', 'Not mentioned'],
          correctIndex: 0,
        }
  )
}

export default function GenerateExamPage() {
  const { user } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [examTitle, setExamTitle] = useState('')
  const [examCode, setExamCode] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [endAtManuallyEdited, setEndAtManuallyEdited] = useState(false)
  const [published, setPublished] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [pendingCode, setPendingCode] = useState<string | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setFileName(file.name)
    // For plain text files, read the contents into the text area.
    if (file.type === 'text/plain') {
      const content = await file.text()
      setText(content)
    }
  }

  const handleGenerate = () => {
    setIsGenerating(true)
    // Simulate async generation.
    setTimeout(() => {
      setQuestions(mockGenerate(text || fileName))
      setIsGenerating(false)
    }, 800)
  }

  const updatePrompt = (id: string, prompt: string) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, prompt } : q)))

  const updateBool = (id: string, answerBool: boolean) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, answerBool } : q)))

  const updateOption = (id: string, index: number, value: string) =>
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, options: q.options?.map((o, i) => (i === index ? value : o)) } : q
      )
    )

  const updateCorrect = (id: string, index: number) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, correctIndex: index } : q)))

  const addOption = (id: string) =>
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, options: [...(q.options ?? []), ''] } : q))
    )

  const removeOption = (id: string, index: number) =>
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q
        const options = q.options?.filter((_, i) => i !== index) ?? []
        let correctIndex = q.correctIndex ?? 0
        if (index === correctIndex) correctIndex = 0
        else if (index < correctIndex) correctIndex -= 1
        return { ...q, options, correctIndex }
      })
    )

  const removeQuestion = (id: string) => setQuestions((prev) => prev.filter((q) => q.id !== id))

  const handlePublish = async () => {
    setPublishError('')
    if (!examCode.trim()) {
      setPublishError('Please enter an exam code before publishing.')
      return
    }
    if (!examTitle.trim()) {
      setPublishError('Please enter an exam title before publishing.')
      return
    }
    if (questions.length === 0) {
      setPublishError('Generate at least one question before publishing.')
      return
    }
    try {
      const exists = await examExists(examCode)
      if (exists) {
        setPendingCode(examCode.trim())
        return
      }
      await doPublish()
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Error checking exam existence')
    }
  }

  const toSqlDateTime = (value: string) => (value ? value.replace('T', ' ') : null)

  const doPublish = async () => {
    try {
      const saved = await saveExam(
        examCode,
        examTitle,
        questions,
        String(user?.number) || '',
        toSqlDateTime(startAt),
        toSqlDateTime(endAt)
      )
      setExamCode(saved.code)
      setPublished(true)
      setPendingCode(null)
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Error saving exam to database')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/exam/create')}
            aria-label="Back to create exam"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Generate questions</h1>
            <p className="text-sm text-muted-foreground">
              Add text or a PDF, then review and edit the generated questions.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Source input */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Source material</CardTitle>
              <CardDescription>Paste text or upload a file to generate from.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="text">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text" className="gap-2">
                    <FileText className="w-4 h-4" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="file" className="gap-2">
                    <Upload className="w-4 h-4" />
                    File / PDF
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-2 mt-4">
                  <Label htmlFor="source-text">Text</Label>
                  <Textarea
                    id="source-text"
                    placeholder="Paste your study material, notes, or article here..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="min-h-[220px] resize-y"
                  />
                </TabsContent>

                <TabsContent value="file" className="mt-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.doc,.docx"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/30 transition-colors p-8 flex flex-col items-center justify-center text-center"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground mb-3" />
                    <span className="text-sm font-medium text-foreground">
                      {fileName || 'Click to upload a file'}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      PDF, TXT, DOC up to 10MB
                    </span>
                  </button>
                </TabsContent>
              </Tabs>

              <Button
                className="w-full gap-2 mt-4"
                onClick={handleGenerate}
                disabled={isGenerating || (!text.trim() && !fileName)}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate questions
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated panel */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Generated questions</CardTitle>
                <Badge variant="secondary">{questions.length}</Badge>
              </div>
              <CardDescription>Review and edit before using them.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Generated questions will appear here.
                  </p>
                </div>
              ) : (
                questions.map((q, index) => (
                  <div key={q.id} className="rounded-lg border border-border p-4 bg-card space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {index + 1}.
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {q.type === 'true_false' ? 'True / False' : 'Multiple choice'}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeQuestion(q.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <Textarea
                      value={q.prompt}
                      onChange={(e) => updatePrompt(q.id, e.target.value)}
                      className="min-h-[60px] resize-y text-sm"
                    />

                    {q.type === 'true_false' ? (
                      <RadioGroup
                        value={q.answerBool ? 'true' : 'false'}
                        onValueChange={(v) => updateBool(q.id, v === 'true')}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                      >
                        <label
                          htmlFor={`${q.id}-true`}
                          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors flex-1"
                        >
                          <RadioGroupItem value="true" id={`${q.id}-true`} />
                          <span className="text-sm font-medium">True</span>
                        </label>
                        <label
                          htmlFor={`${q.id}-false`}
                          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors flex-1"
                        >
                          <RadioGroupItem value="false" id={`${q.id}-false`} />
                          <span className="text-sm font-medium">False</span>
                        </label>
                      </RadioGroup>
                    ) : (
                      <div className="space-y-2">
                        <RadioGroup
                          value={String(q.correctIndex ?? 0)}
                          onValueChange={(v) => updateCorrect(q.id, Number(v))}
                          className="space-y-2"
                        >
                          {q.options?.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <RadioGroupItem value={String(i)} id={`${q.id}-opt-${i}`} />
                              <Input
                                value={opt}
                                onChange={(e) => updateOption(q.id, i, e.target.value)}
                                className="flex-1 h-9 text-sm"
                                placeholder={`Answer ${i + 1}`}
                              />
                              {(q.options?.length ?? 0) > 2 && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => removeOption(q.id, i)}
                                  className="text-muted-foreground hover:text-destructive"
                                  aria-label={`Remove answer ${i + 1}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </RadioGroup>
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
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Publish */}
          <Card className="h-fit lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Publish exam</CardTitle>
              <CardDescription>
                Set an exam code students will use to join, then publish.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exam-title">Exam title</Label>
                  <Input
                    id="exam-title"
                    placeholder="e.g. Midterm Mathematics"
                    value={examTitle}
                    onChange={(e) => {
                      setExamTitle(e.target.value)
                      setPublished(false)
                    }}
                  />
                </div>
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
                <div className="space-y-2">
                  <Label htmlFor="exam-start">Start</Label>
                  <Input
                    id="exam-start"
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => {
                      const val = e.target.value
                      setStartAt(val)
                      setPublished(false)
                      if (val) {
                        const newStartDate = new Date(val)
                        if (!isNaN(newStartDate.getTime())) {
                          const currentEndDate = endAt ? new Date(endAt) : null
                          const needsUpdate =
                            !endAt ||
                            !endAtManuallyEdited ||
                            (currentEndDate && newStartDate >= currentEndDate)
                          if (needsUpdate) {
                            const twoHoursLater = new Date(
                              newStartDate.getTime() + 2 * 60 * 60 * 1000
                            )
                            setEndAt(formatDateTimeLocal(twoHoursLater))
                          }
                        }
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exam-end">End</Label>
                  <Input
                    id="exam-end"
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => {
                      setEndAt(e.target.value)
                      setEndAtManuallyEdited(true)
                      setPublished(false)
                    }}
                  />
                </div>
                <Button className="gap-2" onClick={handlePublish}>
                  <Send className="w-4 h-4" />
                  Publish exam
                </Button>
              </div>
              {publishError && <p className="text-sm text-destructive mt-3">{publishError}</p>}
              {published && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-primary flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Published! Students can join with code{' '}
                    <span className="font-semibold">{examCode.trim().toUpperCase()}</span>.
                  </p>
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <Link href={`/exams/${encodeURIComponent(examCode.trim().toUpperCase())}`}>
                      <Pencil className="w-4 h-4" />
                      View &amp; edit questions
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
