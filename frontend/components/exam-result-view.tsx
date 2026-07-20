'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trophy, Target, Award, BarChart3, ArrowRight, Eye, Home } from 'lucide-react'
import { ExamPerformanceChart } from '@/components/exam-performance-chart'
import type { Exam } from '@/lib/exam-store'

interface ExamResultViewProps {
  score: number
  total: number
  exam: Exam | null
  answers: Record<string, string[]>
  isCorrect: (q: Exam['questions'][number]) => boolean
  getQuestionScore: (q: Exam['questions'][number]) => number
  getQuestionMaxScore: (q: Exam['questions'][number]) => number
  onReview: () => void
  onDashboard: () => void
  onHome: () => void
}

export function ExamResultView({
  score,
  total,
  exam,
  answers,
  isCorrect,
  getQuestionScore,
  getQuestionMaxScore,
  onReview,
  onDashboard,
  onHome,
}: ExamResultViewProps) {
  if (!exam) return null

  const percentage = total > 0 ? Math.round((score / total) * 100) : 0
  const correctCount = exam.questions.filter((q) => isCorrect(q)).length
  const totalQuestions = exam.questions.length

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Celebration Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-2 animate-bounce">
          <Trophy className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Exam Completed!</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Congratulations on finishing{' '}
          <span className="font-semibold text-foreground">{exam.title}</span>. Below is your
          detailed performance dashboard for this attempt.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="overflow-hidden border-border/60 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Final Score
              </p>
              <p className="text-3xl font-black bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                {score} / {total}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/60 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Percentage
              </p>
              <p className="text-3xl font-black bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">
                {percentage}%
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
              <Target className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/60 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Accuracy
              </p>
              <p className="text-3xl font-black bg-gradient-to-r from-cyan-500 to-emerald-500 bg-clip-text text-transparent">
                {correctCount} / {totalQuestions}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-500">
              <BarChart3 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Graph */}
      <ExamPerformanceChart
        exam={exam}
        answers={answers}
        title="Question Performance Analysis"
        description="A question-by-question breakdown of your score percentage"
      />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        <Button onClick={onReview} variant="default" className="w-full sm:w-auto gap-2">
          <Eye className="w-4 h-4" />
          Review Questions & Answers
        </Button>
        <Button onClick={onDashboard} variant="outline" className="w-full sm:w-auto gap-2">
          <BarChart3 className="w-4 h-4" />
          Go to General Dashboard
        </Button>
        <Button onClick={onHome} variant="ghost" className="w-full sm:w-auto gap-2">
          <Home className="w-4 h-4" />
          Back to Home
        </Button>
      </div>
    </div>
  )
}
