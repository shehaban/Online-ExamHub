'use client'

import { Header } from '@/components/header'
import { ExamJoinSection } from '@/components/exam-join-section'
import { FeaturesSection } from '@/components/features-section'
import { Footer } from '@/components/footer'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4">
          <ExamJoinSection />
          <FeaturesSection />
        </div>
      </main>
      <Footer />
    </div>
  )
}
