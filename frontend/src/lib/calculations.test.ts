import { describe, expect, it } from 'vitest'
import { budgetSummary } from './calculations'

describe('budgetSummary', () => {
  it('calculates allocated, actual, remaining, utilization and unallocated funds', () => {
    const result = budgetSummary(1000, [
      { category: 'Food', planned: 400, actual: 250, rationale: '' },
      { category: 'Space', planned: 350, actual: 200, rationale: '' },
    ])
    expect(result.allocated).toBe(750)
    expect(result.actual).toBe(450)
    expect(result.remaining).toBe(550)
    expect(result.utilization).toBe(45)
    expect(result.unallocated).toBe(250)
    expect(result.overallocated).toBe(0)
    expect(result.overspent).toBe(false)
  })

  it('makes overspend and over-allocation explicit without negative percentages', () => {
    const result = budgetSummary(100, [
      { category: 'Food', planned: 140, actual: 125, rationale: '' },
      { category: 'Space', planned: 20, actual: -5, rationale: '' },
    ])
    expect(result.overallocated).toBe(60)
    expect(result.actual).toBe(125)
    expect(result.remaining).toBe(-25)
    expect(result.utilization).toBe(100)
    expect(result.overspent).toBe(true)
  })

  it('handles zero budget safely', () => {
    expect(budgetSummary(0, []).utilization).toBe(0)
  })
})
