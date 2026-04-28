"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Keyboard, Plus, Video } from "lucide-react"

export function ExamJoinSection() {
  const [examCode, setExamCode] = useState("")
  const { user } = useAuth()
  const router = useRouter()

  const handleJoinExam = () => {
    if (!user) {
      router.push("/auth/login")
      return
    }
    if (examCode.trim()) {
      router.push(`/exam/${examCode.trim()}`)
    }
  }

  const handleCreateExam = () => {
    if (!user) {
      router.push("/auth/login")
      return
    }
    router.push("/exam/create")
  }

  return (
    <section className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 py-12 lg:py-20">
      <div className="flex-1 space-y-6 text-center lg:text-left max-w-xl">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance">
          Online exams for everyone
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground text-pretty">
          Create, take, and manage exams seamlessly. Instant grading, real-time results, and AI-powered exam generation.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
          {user?.role === "instructor" && (
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2"
              onClick={handleCreateExam}
            >
              <Plus className="h-5 w-5" />
              Create exam
            </Button>
          )}
          {!user && (
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2"
              onClick={handleCreateExam}
            >
              <Video className="h-5 w-5" />
              Start for free
            </Button>
          )}
          
          <div className="flex items-center w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter exam code"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value)}
                className="pl-10 h-11 w-full sm:w-64"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleJoinExam()
                }}
              />
            </div>
            <Button
              variant="ghost"
              size="lg"
              className="ml-2 text-primary hover:text-primary"
              onClick={handleJoinExam}
              disabled={!examCode.trim()}
            >
              Join
            </Button>
          </div>
        </div>
        
        {!user && (
          <p className="text-sm text-muted-foreground">
            You need to{" "}
            <a href="/auth/login" className="text-primary hover:underline">
              sign in
            </a>{" "}
            to join or create exams
          </p>
        )}
      </div>

      <div className="flex-1 max-w-lg w-full">
        <div className="relative aspect-square max-w-md mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl" />
          <div className="relative grid grid-cols-2 gap-4 p-6">
            <FeatureCard
              icon={<FileIcon />}
              title="AI Generation"
              description="Auto-generate exams from materials"
            />
            <FeatureCard
              icon={<CheckIcon />}
              title="Auto Grading"
              description="Instant results & feedback"
            />
            <FeatureCard
              icon={<ChartIcon />}
              title="Analytics"
              description="Track performance trends"
            />
            <FeatureCard
              icon={<MessageIcon />}
              title="Discussion"
              description="Collaborate with peers"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function FileIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function MessageIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}
