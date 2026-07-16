import { describe, expect, it } from 'vitest'
import {
  calculateQuestionMaxScore,
  calculateQuestionScore,
  isQuestionCorrect,
} from './exam-scoring'

describe('exam scoring helpers', () => {
  it('awards partial credit for partially correct multiple-choice answers', () => {
    const question = {
      id: 'q1',
      type: 'multiple_choice' as const,
      prompt: 'Select the correct options',
      mark: 3,
      correctIndexes: [0, 1, 2],
      options: ['A', 'B', 'C'],
    }

    expect(calculateQuestionScore(question, ['0', '1'])).toBe(2)
    expect(calculateQuestionMaxScore(question)).toBe(3)
    expect(isQuestionCorrect(question, ['0', '1'])).toBe(false)
  })

  it('uses per-option marks for multiple-choice scoring', () => {
    const question = {
      id: 'q2',
      type: 'multiple_choice' as const,
      prompt: 'Select the correct options',
      optionMarks: { 0: 2, 1: 1, 2: 1 },
      correctIndexes: [0, 1, 2],
      options: ['A', 'B', 'C'],
    }

    expect(calculateQuestionScore(question, ['0', '1'])).toBe(3)
    expect(calculateQuestionMaxScore(question)).toBe(4)
  })

  it('scores 0 if the number of selected options exceeds the number of correct options', () => {
    const question = {
      id: 'q3',
      type: 'multiple_choice' as const,
      prompt: 'Select the correct options',
      correctIndexes: [0, 1], // 2 correct options
      options: ['A', 'B', 'C', 'D'],
    }

    // Selecting 3 options when only 2 are correct should score 0
    expect(calculateQuestionScore(question, ['0', '1', '2'])).toBe(0)
  })
})
