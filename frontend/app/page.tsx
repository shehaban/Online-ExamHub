'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { ExamJoinSection } from '@/components/exam-join-section'
import { FeaturesSection } from '@/components/features-section'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { apiRequest } from '@/lib/api'
import {
  Users,
  CheckCircle2,
  BarChart,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export default function HomePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    studentCount: 0,
    teacherCount: 0,
    examCount: 0,
    submissionCount: 0,
  })

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await apiRequest('/users/public-stats')
        if (res?.data) {
          setStats(res.data)
        }
      } catch (err) {
        console.error('Failed to load stats:', err)
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Dynamic ultra-colorful glowing gradient backdrops */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/5 blur-[130px] pointer-events-none animate-pulse duration-5000" />
      <div className="absolute top-[30%] right-[-10%] w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-cyan-500/15 via-emerald-500/10 to-blue-500/5 blur-[160px] pointer-events-none animate-pulse duration-7000" />
      <div className="absolute bottom-[-10%] left-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-yellow-500/10 via-rose-500/10 to-violet-500/5 blur-[140px] pointer-events-none" />

      <Header />

      <main className="flex-1 z-10">
        {/* Main Hero & Join section */}
        <div className="container mx-auto px-4 md:px-6 relative">
          <ExamJoinSection />
        </div>

        {/* Premium Colorful Stats Banner Section */}
        <section className="border-y border-border/80 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 backdrop-blur-md py-14 relative">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px]" />
          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="space-y-2 group">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 bg-clip-text text-transparent tracking-tight transition-transform duration-300 group-hover:scale-105">
                  {stats.submissionCount || 0}
                </div>
                <div className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Exams Conducted
                </div>
              </div>
              <div className="space-y-2 group">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 bg-clip-text text-transparent tracking-tight transition-transform duration-300 group-hover:scale-105">
                  99.9%
                </div>
                <div className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Platform Uptime
                </div>
              </div>
              <div className="space-y-2 group">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 bg-clip-text text-transparent tracking-tight transition-transform duration-300 group-hover:scale-105">
                  {stats.studentCount || 0}
                </div>
                <div className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Active Students
                </div>
              </div>
              <div className="space-y-2 group">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent tracking-tight transition-transform duration-300 group-hover:scale-105">
                  {stats.teacherCount || 0}
                </div>
                <div className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Active Instructors
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <div className="container mx-auto px-4 md:px-6">
          <FeaturesSection />
        </div>

        {/* Interactive Colorful FAQ Section */}
        <section className="py-16 md:py-24 bg-muted/10 border-t border-border/50">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            <div className="text-center mb-12 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500/10 to-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-xs font-semibold dark:text-indigo-400">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                Common Questions
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Frequently Asked Questions
              </h2>
              <p className="text-base text-muted-foreground max-w-xl mx-auto">
                Got questions about Online-ExamHub? We have answers.
              </p>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem
                value="item-1"
                className="border border-border/60 bg-card hover:border-indigo-500/30 transition-colors duration-300 px-4 rounded-xl shadow-sm"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-4">
                  How does AI exam generation work?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 pt-1">
                  You can upload study guides, textbooks, or reference notes. Our embedded AI
                  analyzes the content structure and creates standard multiple-choice, true/false,
                  or descriptive questions aligned with specified cognitive levels.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-2"
                className="border border-border/60 bg-card hover:border-pink-500/30 transition-colors duration-300 px-4 rounded-xl shadow-sm"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-4">
                  Can I lock down the exam rooms to prevent cheating?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 pt-1">
                  Yes, instructors can lock rooms, randomise question options, enforce strict time
                  windows, and monitor participants' access status live.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-3"
                className="border border-border/60 bg-card hover:border-cyan-500/30 transition-colors duration-300 px-4 rounded-xl shadow-sm"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-4">
                  Is grading completely automated?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 pt-1">
                  Yes! All objective questions (Multiple Choice, True/False, Single Choice) are
                  graded instantly upon submission. Students receive detailed scoring feedback
                  immediately.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-4"
                className="border border-border/60 bg-card hover:border-amber-500/30 transition-colors duration-300 px-4 rounded-xl shadow-sm"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-4">
                  Is there any limit to the number of students per room?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 pt-1">
                  Instructors can configure custom capacities for each room and exam session
                  depending on their plan tier. By default, rooms support high concurrent user
                  capacity.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Glow CTA Section */}
        <section className="py-20 md:py-28 relative">
          <div className="container mx-auto px-4 md:px-6 max-w-5xl">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-700 text-primary-foreground p-8 md:p-16 shadow-2xl">
              {/* Background light circles */}
              <div className="absolute right-0 top-0 w-[400px] h-[400px] bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute left-10 bottom-0 w-72 h-72 bg-rose-400/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
                <div className="space-y-4 text-center md:text-left max-w-xl">
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    Ready to transform your assessment workflow?
                  </h2>
                  <p className="text-primary-foreground/90 text-base md:text-lg">
                    Sign up today to create secure exams, configure classrooms, and view instant
                    grading analytics.
                  </p>
                </div>
                <div className="shrink-0 flex flex-col sm:flex-row gap-4 w-full md:w-auto justify-center">
                  {!user ? (
                    <>
                      <Button
                        size="lg"
                        variant="secondary"
                        className="w-full sm:w-auto font-bold bg-white text-purple-700 hover:bg-white/95 hover:scale-105 transition-all shadow-lg gap-2"
                        onClick={() => router.push('/auth/register')}
                      >
                        Get Started Free
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full sm:w-auto border-white/40 hover:bg-white/10 text-white font-medium"
                        onClick={() => router.push('/auth/login')}
                      >
                        Sign In
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="lg"
                      variant="secondary"
                      className="w-full sm:w-auto font-bold bg-white text-purple-700 hover:bg-white/95 hover:scale-105 transition-all shadow-lg gap-2"
                      onClick={() => router.push(user.role === 'student' ? '/rooms' : '/exams')}
                    >
                      Go to Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
