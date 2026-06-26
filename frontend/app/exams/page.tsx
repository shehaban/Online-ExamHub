'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CreateExamContent from '@/components/create-exam-content'
import MyExamsContent from '@/components/my-exams-content'
import { GraduationCap } from 'lucide-react'

export default function ExamsPage() {
  return (
    <Tabs defaultValue="create" className="w-full">
      <div className="container mx-auto px-4 pt-6 pb-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground">ExamHub</span>
        </div>
        <h1 className="text-3xl font-bold mb-6">Exams</h1>
        <TabsList>
          <TabsTrigger value="create">Create Exam</TabsTrigger>
          <TabsTrigger value="my-exams">Exams</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="create">
        <CreateExamContent showLogo={false} />
      </TabsContent>

      <TabsContent value="my-exams">
        <MyExamsContent showLogo={false} />
      </TabsContent>
    </Tabs>
  )
}
