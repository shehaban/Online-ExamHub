'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getExam, updateExamQuestions, type ExamQuestion } from '@/lib/exam-store'

export default function EditExamPage() {
  const params = useParams()
  const router = useRouter()

  const [questions, setQuestions] = useState<ExamQuestion[]>([])

  useEffect(() => {
    const exam = getExam(params.code as string)

    if (exam) {
      setQuestions(exam.questions)
    }
  }, [params.code])

  const saveChanges = () => {
    updateExamQuestions(params.code as string, questions)

    router.push('/exams')
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Edit Exam {params.code}</h1>

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
