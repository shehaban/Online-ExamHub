'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { getAllExams, deleteExam, type Exam } from '@/lib/exam-store'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  ClipboardList,
  CheckCircle2,
  ListChecks,
  Pencil,
  Trash2,
  FileQuestion,
  CalendarDays,
} from 'lucide-react'

export default function ExamsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [exams, setExams] = useState<Exam[]>([])
  const [loaded, setLoaded] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Exam | null>(null)

  const refresh = () => setExams(getAllExams())

  useEffect(() => {
    refresh()
    setLoaded(true)
  }, [])

  // Only signed-in users may view; redirect guests to login.
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteExam(pendingDelete.code)
    setPendingDelete(null)
    refresh()
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  const countByType = (exam: Exam) => {
    const tf = exam.questions.filter((q) => q.type === 'true_false').length
    const mc = exam.questions.filter((q) => q.type === 'multiple_choice').length
    return { tf, mc }
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">All Exams</h1>
            <p className="text-sm text-muted-foreground">Every published exam and its details</p>
          </div>
        </div>

        {!loaded ? null : exams.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileQuestion className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No exams have been published yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Published exams will appear here with all their details.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {exams.map((exam) => {
              const { tf, mc } = countByType(exam)
              return (
                <Card key={exam.code}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-mono tracking-wide">
                          {exam.code}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5" />
                          Published {formatDate(exam.createdAt)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/exams/${encodeURIComponent(exam.code)}`}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Manage
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setPendingDelete(exam)}
                          title="Delete exam"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <ListChecks className="w-3 h-3" />
                        {exam.questions.length} question
                        {exam.questions.length === 1 ? '' : 's'}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {tf} True/False
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <ListChecks className="w-3 h-3" />
                        {mc} Multiple choice
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Delete confirmation */}
      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete exam</DialogTitle>
            <DialogDescription>
              This permanently removes exam{' '}
              <span className="font-mono font-semibold">{pendingDelete?.code}</span> and all of its
              questions. Students will no longer be able to join with this code.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
