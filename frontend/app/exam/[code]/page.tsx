'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getExam, type Exam } from '@/lib/exam-store'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, CheckCircle2, FileQuestion, XCircle } from 'lucide-react'

export default function TakeExamPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()

  const [exam, setExam] = useState<Exam | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setExam(getExam(decodeURIComponent(code)))
    setLoaded(true)
  }, [code])

  const setAnswer = (questionId: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [questionId]: value }))

  const isCorrect = (q: Exam['questions'][number]): boolean => {
    const given = answers[q.id]
    if (given === undefined) return false
    if (q.type === 'true_false') return given === String(q.answerBool)
    return Number(given) === q.correctIndex
  }

  const score = exam ? exam.questions.filter(isCorrect).length : 0
  const total = exam?.questions.length ?? 0
  const allAnswered = exam ? exam.questions.every((q) => answers[q.id] !== undefined) : false

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="flex items-center justify-between gap-4 mb-8">
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
              <h1 className="text-2xl font-bold text-foreground">Exam</h1>
              <p className="text-sm text-muted-foreground">
                Code: <span className="font-medium">{exam?.code}</span> · {total} question
                {total === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          {submitted && (
            <Badge variant="secondary" className="text-sm">
              Score: {score}/{total}
            </Badge>
          )}
        </div>

        <div className="space-y-4">
          {exam?.questions.map((q, index) => {
            const correct = submitted && isCorrect(q)
            const wrong = submitted && !isCorrect(q)
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
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive shrink-0" />
                      ))}
                  </div>
                  <CardDescription>
                    {q.type === 'true_false' ? 'True / False' : 'Choose the correct answer'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {q.type === 'true_false' ? (
                    <RadioGroup
                      value={answers[q.id] ?? ''}
                      onValueChange={(v) => setAnswer(q.id, v)}
                      disabled={submitted}
                      className="flex gap-3"
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
                    <RadioGroup
                      value={answers[q.id] ?? ''}
                      onValueChange={(v) => setAnswer(q.id, v)}
                      disabled={submitted}
                      className="space-y-2"
                    >
                      {q.options?.map((opt, i) => (
                        <label
                          key={i}
                          htmlFor={`${q.id}-opt-${i}`}
                          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                        >
                          <RadioGroupItem value={String(i)} id={`${q.id}-opt-${i}`} />
                          <span className="text-sm">{opt}</span>
                          {submitted && q.correctIndex === i && (
                            <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />
                          )}
                        </label>
                      ))}
                    </RadioGroup>
                  )}
                  {wrong && (
                    <p className="text-xs text-destructive mt-3">Your answer was incorrect.</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Separator className="my-6" />

        {!submitted ? (
          <Button
            size="lg"
            className="w-full"
            disabled={!allAnswered}
            onClick={() => setSubmitted(true)}
          >
            {allAnswered ? 'Submit exam' : 'Answer all questions to submit'}
          </Button>
        ) : (
          <Card>
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
              <div>
                <p className="text-lg font-semibold text-foreground">
                  You scored {score} out of {total}
                </p>
                <p className="text-sm text-muted-foreground">
                  {total > 0 ? Math.round((score / total) * 100) : 0}% correct
                </p>
              </div>
              <Button variant="outline" onClick={() => router.push('/')}>
                Back to home
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
