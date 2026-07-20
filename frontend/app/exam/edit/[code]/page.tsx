'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getExam, updateExamQuestions, type ExamQuestion } from '@/lib/exam-store'
import { toDatetimeLocalValue, toSqlDateTime, formatDateTimeLocal } from '@/lib/exam-schedule'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function EditExamPage() {
  const params = useParams()
  const router = useRouter()

  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [examTitle, setExamTitle] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [endAtManuallyEdited, setEndAtManuallyEdited] = useState(false)

  useEffect(() => {
    async function loadExam() {
      try {
        const code = typeof params.code === 'string' ? params.code : ''
        const exam = await getExam(code)
        if (exam) {
          setQuestions(exam.questions)
          setExamTitle(exam.title)
          setStartAt(toDatetimeLocalValue(exam.startAt))
          setEndAt(toDatetimeLocalValue(exam.endAt))
          if (exam.endAt) {
            setEndAtManuallyEdited(true)
          }
        }
      } catch (err) {
        console.error('Failed to load exam:', err)
      }
    }
    loadExam()
  }, [params.code])

  const saveChanges = async () => {
    try {
      const code = typeof params.code === 'string' ? params.code : ''
      await updateExamQuestions(
        code,
        questions,
        examTitle,
        toSqlDateTime(startAt),
        toSqlDateTime(endAt)
      )
      router.push('/exams')
    } catch (err) {
      console.error('Failed to save changes:', err)
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Edit Exam {params.code}</h1>

      <div className="rounded-lg border border-border p-4 space-y-4 mb-6">
        <div className="space-y-2">
          <Label htmlFor="exam-title">Exam title</Label>
          <Input id="exam-title" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="exam-start">Start date & time</Label>
            <Input
              id="exam-start"
              type="datetime-local"
              value={startAt}
              onChange={(e) => {
                const val = e.target.value
                setStartAt(val)
                if (val) {
                  const newStartDate = new Date(val)
                  if (!isNaN(newStartDate.getTime())) {
                    const currentEndDate = endAt ? new Date(endAt) : null
                    const needsUpdate =
                      !endAt ||
                      !endAtManuallyEdited ||
                      (currentEndDate && newStartDate >= currentEndDate)
                    if (needsUpdate) {
                      const twoHoursLater = new Date(newStartDate.getTime() + 2 * 60 * 60 * 1000)
                      setEndAt(formatDateTimeLocal(twoHoursLater))
                    }
                  }
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exam-end">End date & time (optional)</Label>
            <Input
              id="exam-end"
              type="datetime-local"
              value={endAt}
              onChange={(e) => {
                setEndAt(e.target.value)
                setEndAtManuallyEdited(true)
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((q, qIndex) => (
          <div key={q.id} className="border rounded-lg p-4">
            <label className="font-medium block mb-2">Question {qIndex + 1}</label>

            <input
              className="w-full border rounded p-2 mb-4"
              value={q.prompt}
              onChange={(e) => {
                const updated = [...questions]
                updated[qIndex] = {
                  ...updated[qIndex],
                  prompt: e.target.value,
                }
                setQuestions(updated)
              }}
            />

            {q.type === 'multiple_choice' && (
              <div className="space-y-2">
                {q.options?.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center gap-2">
                    <input
                      className="border rounded p-2 flex-1"
                      value={option}
                      onChange={(e) => {
                        const updated = [...questions]

                        const options = [...(updated[qIndex].options || [])]

                        options[optionIndex] = e.target.value

                        updated[qIndex] = {
                          ...updated[qIndex],
                          options,
                        }

                        setQuestions(updated)
                      }}
                    />

                    <input
                      type="checkbox"
                      checked={q.correctIndexes?.includes(optionIndex) || false}
                      onChange={(e) => {
                        const updated = [...questions]

                        const correct = updated[qIndex].correctIndexes || []

                        updated[qIndex] = {
                          ...updated[qIndex],
                          correctIndexes: e.target.checked
                            ? [...correct, optionIndex]
                            : correct.filter((i) => i !== optionIndex),
                        }

                        setQuestions(updated)
                      }}
                    />

                    <span>Correct</span>
                  </div>
                ))}
              </div>
            )}

            {q.type === 'true_false' && (
              <div className="mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={q.answerBool || false}
                    onChange={(e) => {
                      const updated = [...questions]

                      updated[qIndex] = {
                        ...updated[qIndex],
                        answerBool: e.target.checked,
                      }

                      setQuestions(updated)
                    }}
                  />
                  True
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={saveChanges} className="mt-6 px-4 py-2 bg-black text-white rounded">
        Save Changes
      </button>
    </div>
  )
}
