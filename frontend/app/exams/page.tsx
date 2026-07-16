'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CreateExamContent from '@/components/create-exam-content'
import MyExamsContent from '@/components/my-exams-content'
import { Header } from '@/components/header'

export default function ExamsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header showLogo={true} />
      <div className="flex-1">
        <Tabs defaultValue="create" className="w-full">
          <div className="container mx-auto px-4 pt-6 pb-0">
            <h1 className="text-3xl font-bold mb-6">Exams</h1>
            <TabsList>
              <TabsTrigger value="create">Create Exam</TabsTrigger>
              <TabsTrigger value="my-exams">Exams</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="create">
            <CreateExamContent showLogo={false} showHeader={false} />
          </TabsContent>

          <TabsContent value="my-exams">
            <MyExamsContent showLogo={false} showHeader={false} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
