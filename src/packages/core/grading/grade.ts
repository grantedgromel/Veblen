export type Grade = 'excellent' | 'great' | 'good' | 'fair' | 'poor'

export const gradeOrder: Grade[] = ['excellent', 'great', 'good', 'fair', 'poor']

export const gradeLabels: Record<Grade, string> = {
  excellent: 'Excellent',
  great: 'Great',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
}

export const gradeDescriptions: Record<Grade, string> = {
  excellent: 'Top tier',
  great: 'Recommended',
  good: 'Acceptable',
  fair: 'Caveats apply',
  poor: 'Avoid',
}

export const gradePriority: Record<Grade, number> = {
  excellent: 0,
  great: 1,
  good: 2,
  fair: 3,
  poor: 4,
}
