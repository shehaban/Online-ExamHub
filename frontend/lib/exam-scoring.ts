import type { ExamQuestion } from './exam-store'

function getCorrectIndexes(question: ExamQuestion): number[] {
  if (question.correctIndexes && question.correctIndexes.length > 0) {
    return question.correctIndexes
  }

  if (question.correctIndex !== undefined) {
    return [question.correctIndex]
  }

  return []
}

export function calculateQuestionMaxScore(question: ExamQuestion): number {
  if (question.type === 'multiple_choice') {
    const correctIndexes = getCorrectIndexes(question)
    if (correctIndexes.length > 0 && question.optionMarks) {
      return correctIndexes.reduce((sum, idx) => sum + (question.optionMarks?.[idx] ?? 1), 0)
    }

    return question.mark ?? 1
  }

  return question.mark ?? 1
}

export function calculateQuestionScore(question: ExamQuestion, given: string[] = []): number {
  if (question.type === 'true_false') {
    return given[0] === String(question.answerBool) ? (question.mark ?? 1) : 0
  }

  const correctIndexes = getCorrectIndexes(question)
  if (correctIndexes.length === 0) return 0

  const selectedIndexes = given
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value))

  if (selectedIndexes.length === 0) return 0

  if (selectedIndexes.length > correctIndexes.length) {
    return 0
  }

  if (question.optionMarks) {
    return selectedIndexes.reduce((sum, idx) => {
      if (!correctIndexes.includes(idx)) return sum
      return sum + (question.optionMarks?.[idx] ?? 1)
    }, 0)
  }

  const totalMark = question.mark ?? 1
  return (
    (totalMark * selectedIndexes.filter((idx) => correctIndexes.includes(idx)).length) /
    correctIndexes.length
  )
}

export function isQuestionCorrect(question: ExamQuestion, given: string[] = []): boolean {
  if (question.type === 'true_false') {
    return given[0] === String(question.answerBool)
  }

  const correctIndexes = getCorrectIndexes(question)
  const selectedIndexes = given
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value))

  if (correctIndexes.length === 0) return selectedIndexes.length === 0

  const selectedSet = new Set(selectedIndexes)
  const correctSet = new Set(correctIndexes)

  return (
    selectedSet.size === correctSet.size && [...selectedSet].every((idx) => correctSet.has(idx))
  )
}
