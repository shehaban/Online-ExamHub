'use client'

import { useRef, useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { saveExam, examExists } from '@/lib/exam-store'
import { useAuth } from '@/lib/auth-context'
import { useAiJob } from '@/lib/ai-job-context'
import {
  startAiGenerateJob,
  startAiRefineJob,
  saveAiExamDraft,
  checkAiJobStatus,
  cancelAiJob,
  AiExamDraft,
} from '@/lib/ai-store'
import { Header } from '@/components/header'
import { SavedAiExamsModal } from '@/components/saved-ai-exams-modal'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  AlertCircle,
  Brain,
  Database,
  Wand2,
  Save,
  Square,
  OctagonX,
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

function GenerateExamContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { trackJob, activeJob, clearActiveJob } = useAiJob()

  const [currentJobId, setCurrentJobId] = useState<string | null>(null)

  const handleStopGeneration = async () => {
    const targetJobId = currentJobId || activeJob?.jobId || urlJobId
    if (targetJobId) {
      await cancelAiJob(targetJobId)
    }
    setIsGenerating(false)
    setIsRefining(false)
    setCurrentJobId(null)
    clearActiveJob()
    setGenerateError('AI generation stopped by user.')
  }
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [refinePrompt, setRefinePrompt] = useState('')
  const [generateError, setGenerateError] = useState('')
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [examTitle, setExamTitle] = useState('')
  const [examCode, setExamCode] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [endAtManuallyEdited, setEndAtManuallyEdited] = useState(false)
  const [published, setPublished] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [pendingCode, setPendingCode] = useState<string | null>(null)

  // AI Database State
  const [currentAiDbId, setCurrentAiDbId] = useState<number | null>(null)
  const [saveDbSuccess, setSaveDbSuccess] = useState('')
  const [isSavingDb, setIsSavingDb] = useState(false)

  // AI generation options
  const [numQuestions, setNumQuestions] = useState('5')
  const [questionTypePreference, setQuestionTypePreference] = useState('mixed')

  // Listen for jobId in URL or active job completions
  const urlJobId = searchParams.get('jobId')

  useEffect(() => {
    const targetId = currentJobId || urlJobId
    if (!targetId) return

    let cancelled = false
    const poll = async () => {
      try {
        const job = await checkAiJobStatus(targetId)
        if (cancelled) return

        if (job.status === 'generating' || job.status === 'pending') {
          if (job.type === 'refine') setIsRefining(true)
          else setIsGenerating(true)
        } else if (job.status === 'completed') {
          setIsGenerating(false)
          setIsRefining(false)
          if (job.questions && Array.isArray(job.questions)) {
            setQuestions(job.questions)
          }
          // Stop polling — job is done. This prevents overwriting manual edits.
          setCurrentJobId(null)
        } else if (job.status === 'failed') {
          setIsGenerating(false)
          setIsRefining(false)
          setGenerateError(job.error || 'AI processing failed.')
          // Stop polling — job is done.
          setCurrentJobId(null)
        }
      } catch (err) {
        console.error('Job check failed:', err)
      }
    }

    poll()
    const interval = setInterval(poll, 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [currentJobId, urlJobId])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setFileName(file.name)
    setUploadedFile(file)
    if (file.type === 'text/plain') {
      const content = await file.text()
      setText(content)
    }
  }

  // Handle starting AI background generation job
  const handleGenerate = async () => {
    setIsGenerating(true)
    setGenerateError('')
    setSaveDbSuccess('')
    clearActiveJob()
    setCurrentJobId(null)

    try {
      const formData = new FormData()
      if (uploadedFile) {
        formData.append('file', uploadedFile)
      }
      if (text.trim()) {
        formData.append('text', text)
      }
      formData.append('numQuestions', numQuestions)
      formData.append('questionType', questionTypePreference)
      formData.append(
        'title',
        examTitle || (fileName ? `Exam from ${fileName}` : `AI Exam (${numQuestions} Qs)`)
      )

      const result = await startAiGenerateJob(formData)
      if (result?.jobId) {
        setCurrentJobId(result.jobId)
        trackJob(result.jobId)
      } else {
        throw new Error('Failed to start AI generation job.')
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate questions.')
      setIsGenerating(false)
    }
  }

  // Handle targeted AI prompt refinement ("Edit current exam by prompt")
  const handleRefineQuestions = async () => {
    if (!refinePrompt.trim()) return
    if (questions.length === 0) {
      setGenerateError('No questions to refine. Generate or create questions first.')
      return
    }

    setIsRefining(true)
    setGenerateError('')
    setSaveDbSuccess('')
    clearActiveJob()
    setCurrentJobId(null)

    try {
      const result = await startAiRefineJob({
        existingQuestions: questions,
        prompt: refinePrompt,
        sourceText: text,
        title: examTitle || 'Refined Exam',
      })

      if (result?.jobId) {
        setCurrentJobId(result.jobId)
        trackJob(result.jobId)
        setRefinePrompt('')
      } else {
        throw new Error('Failed to start AI refinement.')
      }
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : 'Failed to refine questions with prompt.'
      )
      setIsRefining(false)
    }
  }

  // Handle saving AI Exam to Database
  const handleSaveToAiDb = async () => {
    if (questions.length === 0) {
      setGenerateError('Generate or create at least one question before saving to AI Database.')
      return
    }

    setIsSavingDb(true)
    setSaveDbSuccess('')
    setGenerateError('')

    try {
      const saved = await saveAiExamDraft({
        id: currentAiDbId || undefined,
        title: examTitle.trim() || 'Untitled AI Exam',
        sourceText: text,
        fileName: fileName || undefined,
        questions,
      })

      if (saved?.id) {
        setCurrentAiDbId(saved.id)
        setSaveDbSuccess('Exam successfully saved to AI Database library!')
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to save to AI Database.')
    } finally {
      setIsSavingDb(false)
    }
  }

  // Load saved AI exam from database modal
  const handleLoadAiExamFromDb = (draft: AiExamDraft) => {
    setCurrentAiDbId(draft.id)
    setExamTitle(draft.title || '')
    if (draft.sourceText) setText(draft.sourceText)
    if (draft.fileName) setFileName(draft.fileName)
    if (draft.questions && Array.isArray(draft.questions)) {
      setQuestions(draft.questions)
    }
    setSaveDbSuccess(`Loaded "${draft.title || 'Saved Exam'}" from AI Database library!`)
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
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
              <h1 className="text-2xl font-bold text-foreground">AI Exam Studio</h1>
              <p className="text-sm text-muted-foreground">
                Generate, refine with prompt instructions, and manage saved AI exams.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SavedAiExamsModal onLoadExam={handleLoadAiExamFromDb} />
            {questions.length > 0 && (
              <Button
                variant="outline"
                onClick={handleSaveToAiDb}
                disabled={isSavingDb}
                className="gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              >
                {isSavingDb ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Draft to AI DB
              </Button>
            )}
          </div>
        </div>

        {saveDbSuccess && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-600 dark:text-emerald-400 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveDbSuccess}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Source input */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Source material
              </CardTitle>
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

              {/* AI generation options */}
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="num-questions" className="text-xs text-muted-foreground">
                    Number of questions
                  </Label>
                  <Select value={numQuestions} onValueChange={setNumQuestions}>
                    <SelectTrigger id="num-questions" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 questions</SelectItem>
                      <SelectItem value="5">5 questions</SelectItem>
                      <SelectItem value="10">10 questions</SelectItem>
                      <SelectItem value="15">15 questions</SelectItem>
                      <SelectItem value="20">20 questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-type" className="text-xs text-muted-foreground">
                    Question type
                  </Label>
                  <Select value={questionTypePreference} onValueChange={setQuestionTypePreference}>
                    <SelectTrigger id="q-type" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mixed">Mixed</SelectItem>
                      <SelectItem value="true_false">True / False only</SelectItem>
                      <SelectItem value="multiple_choice">Multiple Choice only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                className="w-full gap-2 mt-4"
                onClick={handleGenerate}
                disabled={isGenerating || (!text.trim() && !uploadedFile)}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI is generating in background…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate with AI
                  </>
                )}
              </Button>

              {isGenerating && (
                <Button
                  variant="destructive"
                  className="w-full gap-2 mt-2"
                  onClick={handleStopGeneration}
                >
                  <OctagonX className="w-4 h-4" />
                  Stop AI Generation
                </Button>
              )}

              {generateError && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">{generateError}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generated panel */}
          <div className="space-y-6">
            {/* Targeted AI Prompt Refinement Section */}
            {questions.length > 0 && (
              <Card className="border-indigo-500/30 bg-gradient-to-b from-indigo-500/5 to-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Wand2 className="w-4 h-4" />
                    Refine Exam with AI Prompt
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Instruct AI to modify specific questions without re-generating everything.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    placeholder='e.g. "Make question 2 harder", "Add 2 true/false questions about caching", "Fix options in question 1"...'
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    className="min-h-[70px] resize-y text-xs"
                  />
                  <Button
                    size="sm"
                    className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={handleRefineQuestions}
                    disabled={isRefining || !refinePrompt.trim()}
                  >
                    {isRefining ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        AI is refining questions...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        Refine Questions
                      </>
                    )}
                  </Button>
                  {isRefining && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full gap-2 mt-2"
                      onClick={handleStopGeneration}
                    >
                      <OctagonX className="w-4 h-4" />
                      Stop AI Refinement
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="h-fit">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Generated questions</CardTitle>
                  <Badge variant="secondary">{questions.length}</Badge>
                </div>
                <CardDescription>Review and edit before using them.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isGenerating || isRefining ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                      </div>
                      <Loader2 className="w-14 h-14 text-primary/30 animate-spin absolute top-0 left-0" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {isRefining
                        ? 'AI is refining your questions…'
                        : 'AI is reading material and generating…'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                      You can navigate to another page anytime — progress will be saved!
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                      onClick={handleStopGeneration}
                    >
                      <OctagonX className="w-4 h-4" />
                      Stop AI Generation
                    </Button>
                  </div>
                ) : questions.length === 0 ? (
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
                    <div
                      key={q.id || index}
                      className="rounded-lg border border-border p-4 bg-card space-y-3"
                    >
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
          </div>

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

export default function GenerateExamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <GenerateExamContent />
    </Suspense>
  )
}
