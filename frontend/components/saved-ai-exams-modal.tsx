'use client'

import { useState, useEffect } from 'react'
import { getSavedAiExams, deleteSavedAiExam, AiExamDraft } from '@/lib/ai-store'
import { useAuth } from '@/lib/auth-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Database,
  FileText,
  Trash2,
  ArrowRight,
  Loader2,
  Sparkles,
  Calendar,
  User,
  Download,
  Eye,
} from 'lucide-react'

interface SavedAiExamsModalProps {
  onLoadExam: (exam: AiExamDraft) => void
}

export function SavedAiExamsModal({ onLoadExam }: SavedAiExamsModalProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [open, setOpen] = useState(false)
  const [exams, setExams] = useState<AiExamDraft[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [selectedPrompt, setSelectedPrompt] = useState<{
    title: string
    text: string
    fileName?: string
  } | null>(null)

  const fetchExams = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getSavedAiExams()
      setExams(data)
    } catch (err) {
      setError('Failed to load saved AI exams')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchExams()
    }
  }, [open])

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await deleteSavedAiExam(id)
      setExams((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      console.error('Failed to delete draft', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownloadPrompt = (e: React.MouseEvent, exam: AiExamDraft) => {
    e.stopPropagation()
    const content = exam.sourceText || 'No source text or prompt recorded.'
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const safeTitle = (exam.title || 'exam_prompt').replace(/[^a-z0-9_-]/gi, '_')
    link.download = `${safeTitle}_prompt.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleViewPrompt = (e: React.MouseEvent, exam: AiExamDraft) => {
    e.stopPropagation()
    setSelectedPrompt({
      title: exam.title || 'Saved AI Exam',
      text: exam.sourceText || 'No prompt/source text provided.',
      fileName: exam.fileName || undefined,
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 border-indigo-500/30 hover:border-indigo-500/60"
          >
            <Database className="w-4 h-4 text-indigo-500" />
            Saved AI Exams Library
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              AI Exams Database Library
            </DialogTitle>
            <DialogDescription>
              {isAdmin
                ? 'Admin View: Browsing all saved AI exams across all instructors.'
                : 'Teacher View: Select any of your saved AI-generated exams to load or edit.'}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Loading saved AI exams...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          ) : exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Database className="w-6 h-6 text-muted-foreground" />
              </div>
              <h4 className="text-sm font-medium text-foreground">No saved AI exams yet</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Generate an exam with AI and click &quot;Save Draft to AI DB&quot; to save it here.
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1 max-h-[50vh] pr-3">
              <div className="space-y-3">
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    onClick={() => {
                      onLoadExam(exam)
                      setOpen(false)
                    }}
                    className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-accent/40 transition-all cursor-pointer group flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {exam.title || 'Untitled AI Exam'}
                        </h4>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {exam.questions?.length || 0} Questions
                        </Badge>
                        {isAdmin && exam.createdBy && (
                          <Badge
                            variant="outline"
                            className="text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400 gap-1"
                          >
                            <User className="w-3 h-3" />
                            {exam.createdBy}
                          </Badge>
                        )}
                      </div>

                      {exam.fileName ? (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-medium">
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{exam.fileName}</span>
                        </p>
                      ) : exam.sourceText ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                          <span className="truncate max-w-[240px] italic">
                            &quot;{exam.sourceText.slice(0, 50)}...&quot;
                          </span>
                        </p>
                      ) : null}

                      <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 shrink-0" />
                          {new Date(
                            exam.updatedAt || exam.createdAt || Date.now()
                          ).toLocaleDateString(undefined, {
                            dateStyle: 'medium',
                          })}
                        </span>

                        {exam.sourceText && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handleViewPrompt(e, exam)}
                              className="text-indigo-500 hover:underline flex items-center gap-1 font-medium"
                              title="View Text Prompt / Source Material"
                            >
                              <Eye className="w-3 h-3" /> View Prompt
                            </button>
                            <span>•</span>
                            <button
                              onClick={(e) => handleDownloadPrompt(e, exam)}
                              className="text-indigo-500 hover:underline flex items-center gap-1 font-medium"
                              title="Download Text Prompt / Source Material as .txt"
                            >
                              <Download className="w-3 h-3" /> Download Text
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => handleDelete(e, exam.id)}
                        disabled={deletingId === exam.id}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete draft"
                      >
                        {deletingId === exam.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>

                      <Button variant="ghost" size="icon-sm" className="group-hover:text-primary">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Prompt / Material Viewer Modal */}
      {selectedPrompt && (
        <Dialog open={Boolean(selectedPrompt)} onOpenChange={() => setSelectedPrompt(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                {selectedPrompt.fileName
                  ? `File: ${selectedPrompt.fileName}`
                  : 'Source Text / Prompt'}
              </DialogTitle>
              <DialogDescription className="text-xs">{selectedPrompt.title}</DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[300px] rounded-md border p-3 bg-muted/40 text-xs font-mono whitespace-pre-wrap">
              {selectedPrompt.text}
            </ScrollArea>

            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const blob = new Blob([selectedPrompt.text], { type: 'text/plain;charset=utf-8' })
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `${selectedPrompt.title.replace(/[^a-z0-9_-]/gi, '_')}_prompt.txt`
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                  URL.revokeObjectURL(url)
                }}
                className="gap-1.5 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download Prompt File
              </Button>
              <Button size="sm" onClick={() => setSelectedPrompt(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
