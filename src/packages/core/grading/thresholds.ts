import type { Grade } from './grade'

export interface GradeThresholds {
  excellent: number
  great: number
  good: number
  fair: number
}

export interface PercentileCuts {
  excellent: number
  great: number
  good: number
  fair: number
}

export const DEFAULT_PERCENTILES: PercentileCuts = {
  excellent: 0.9,
  great: 0.7,
  good: 0.45,
  fair: 0.2,
}

function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0
  if (sortedAsc.length === 1) return sortedAsc[0]
  const pos = (sortedAsc.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return sortedAsc[lo]
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (pos - lo)
}

export function computeGradeThresholds(
  discountRatios: number[],
  cuts: PercentileCuts = DEFAULT_PERCENTILES,
): GradeThresholds {
  const sorted = [...discountRatios].sort((a, b) => a - b)
  return {
    excellent: quantile(sorted, cuts.excellent),
    great: quantile(sorted, cuts.great),
    good: quantile(sorted, cuts.good),
    fair: quantile(sorted, cuts.fair),
  }
}

export function mapGradeFromDiscount(discountRatio: number, thresholds: GradeThresholds): Grade {
  if (discountRatio >= thresholds.excellent) return 'excellent'
  if (discountRatio >= thresholds.great) return 'great'
  if (discountRatio >= thresholds.good) return 'good'
  if (discountRatio >= thresholds.fair) return 'fair'
  return 'poor'
}
