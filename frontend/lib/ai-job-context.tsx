'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './auth-context'
import { checkAiJobStatus, getActiveAiJobs, AiJobStatus, AiQuestion } from './ai-store'
import { Sparkles, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'

interface AiJobContextType {
  activeJob: AiJobStatus | null
  completedJobNotification: AiJobStatus | null
  trackJob: (jobId: string) => void
  clearActiveJob: () => void
  dismissNotification: () => void
}

const AiJobContext = createContext<AiJobContextType | undefined>(undefined)

export function AiJobProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()
  const [activeJob, setActiveJob] = useState<AiJobStatus | null>(null)
  const [completedJobNotification, setCompletedJobNotification] = useState<AiJobStatus | null>(null)

  // Track a specific job by ID
  const trackJob = useCallback((jobId: string) => {
    checkAiJobStatus(jobId)
      .then((job) => {
        if (job) {
          setActiveJob(job)
        }
      })
      .catch((err) => console.error('Error tracking AI job:', err))
  }, [])

  const clearActiveJob = useCallback(() => {
    setActiveJob(null)
  }, [])

  const dismissNotification = useCallback(() => {
    setCompletedJobNotification(null)
  }, [])

  // Check for active running jobs on mount or user login
  useEffect(() => {
    if (!user) {
      setActiveJob(null)
      return
    }

    getActiveAiJobs()
      .then((jobs) => {
        const runningJob = jobs.find((j) => j.status === 'generating' || j.status === 'pending')
        if (runningJob) {
          setActiveJob(runningJob)
        } else {
          setActiveJob(null)
        }
      })
      .catch(() => {})
  }, [user])

  // Polling loop when activeJob is generating
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed') {
      return
    }

    const interval = setInterval(async () => {
      try {
        const updated = await checkAiJobStatus(activeJob.jobId)
        if (updated) {
          setActiveJob(updated)
          if (updated.status === 'completed') {
            setCompletedJobNotification(updated)
          } else if (updated.status === 'failed') {
            setCompletedJobNotification(updated)
          }
        }
      } catch (err) {
        console.error('Failed polling job status:', err)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [activeJob])

  return (
    <AiJobContext.Provider
      value={{
        activeJob,
        completedJobNotification,
        trackJob,
        clearActiveJob,
        dismissNotification,
      }}
    >
      {children}

      {/* Floating Notification Toast when AI finishes while on another page */}
      {completedJobNotification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="rounded-xl border border-border bg-card shadow-2xl p-4 flex items-start gap-3">
            {completedJobNotification.status === 'completed' ? (
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                {completedJobNotification.status === 'completed'
                  ? 'AI Exam Ready!'
                  : 'AI Generation Failed'}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {completedJobNotification.title}
              </p>

              {completedJobNotification.status === 'completed' && (
                <button
                  onClick={() => {
                    const jobId = completedJobNotification.jobId
                    dismissNotification()
                    router.push(`/exam/generate?jobId=${jobId}`)
                  }}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  View & Edit Questions
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={dismissNotification}
              className="text-muted-foreground hover:text-foreground text-xs p-1"
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </AiJobContext.Provider>
  )
}

export function useAiJob() {
  const context = useContext(AiJobContext)
  if (!context) {
    throw new Error('useAiJob must be used within an AiJobProvider')
  }
  return context
}
