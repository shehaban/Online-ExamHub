'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { calculateQuestionScore, calculateQuestionMaxScore } from '@/lib/exam-scoring'
import type { Exam } from '@/lib/exam-store'

interface ExamPerformanceChartProps {
  exam: Exam
  answers: Record<string, string[]>
  title?: string
  description?: string
}

const chartConfig: ChartConfig = {
  percentage: { label: 'Performance %', color: 'hsl(280, 80%, 60%)' },
}

export function ExamPerformanceChart({
  exam,
  answers,
  title = 'Question Performance',
  description = 'Your score percentage for each question',
}: ExamPerformanceChartProps) {
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <Card className="border-border/60 shadow-sm overflow-hidden bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            {title}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">{description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 h-[220px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">
          Loading performance chart...
        </CardContent>
      </Card>
    )
  }

  if (!exam || !exam.questions || exam.questions.length === 0) return null

  const chartData = exam.questions.map((q, idx) => {
    const qScore = calculateQuestionScore(q, answers[q.id] || [])
    const qMax = calculateQuestionMaxScore(q)
    const percentage = qMax > 0 ? Math.round((qScore / qMax) * 100) : 0
    return {
      name: `Q${idx + 1}`,
      percentage,
      score: qScore,
      max: qMax,
      prompt: q.prompt.length > 40 ? q.prompt.slice(0, 40) + '...' : q.prompt,
    }
  })

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <TrendingUp className="w-4 h-4 text-purple-500" />
          {title}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <AreaChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="examScoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, props) => {
                    const payload = props.payload
                    return (
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="font-semibold text-foreground">{payload.prompt}</span>
                        <span className="text-muted-foreground text-[10px]">
                          Score: {payload.score} / {payload.max} ({value}%)
                        </span>
                      </div>
                    )
                  }}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="percentage"
              stroke="hsl(280, 80%, 60%)"
              strokeWidth={2}
              fill="url(#examScoreGradient)"
              dot={{ fill: 'hsl(280, 80%, 60%)', r: 3.5, strokeWidth: 1.5, stroke: '#fff' }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
