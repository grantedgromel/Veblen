import type { Grade } from '../grading/grade'

export interface BreakdownItem {
  label: string
  value: number
  kind: 'add' | 'subtract'
  note?: string
}

export interface Score {
  intrinsicValue: number
  askPrice: number
  discountRatio: number
  grade: Grade
  disqualificationReason?: DisqualificationReason
  breakdown: BreakdownItem[]
}

export type DisqualificationReason =
  | 'salvage_title'
  | 'platform_not_whitelisted'
  | 'accident_count_exceeded'
  | 'flagged_synthetic'

export interface ScoredListing<TListing> {
  listing: TListing
  score: Score
}
