import { describe, expect, it } from 'vitest'
import { proposePriorityCuts, projectedCost, simulateAllocationChange } from './tradeoffs'
import type { Allocation } from '../types'

const allocations: Allocation[] = [
  { category: 'Food & drink', planned: 300, actual: 100, rationale: '' },
  { category: 'Photo & memories', planned: 200, actual: 0, rationale: '' },
  { category: 'Decor & atmosphere', planned: 300, actual: 0, rationale: '' },
  { category: 'Flexible extras', planned: 200, actual: 0, rationale: '' },
]

describe('priority-aware budget scenarios', () => {
  it('calculates a projected total from each category’s higher estimate or actual', () => {
    expect(projectedCost(allocations)).toBe(1000)
    expect(projectedCost([{ category: 'Food', planned: 200, actual: 250, rationale: '' }])).toBe(250)
  })

  it('previews lower-priority uncommitted cuts while protecting the top priority and must-haves', () => {
    const result = proposePriorityCuts(
      allocations,
      900,
      ['Photography', 'Food & catering'],
      ['Food & catering'],
    )
    expect(result.changes).toEqual([{ category: 'Decor & atmosphere', from: 300, to: 200, delta: -100 }])
    expect(result.allocations[0].planned).toBe(300)
    expect(result.allocations[1].planned).toBe(200)
    expect(result.unfunded).toBe(0)
  })

  it('previews an increased photography allocation by using flexible funds before priorities', () => {
    const result = simulateAllocationChange(
      allocations,
      1000,
      1,
      300,
      ['Photography', 'Food & catering'],
      ['Food & catering'],
    )
    expect(result.valid).toBe(true)
    expect(result.allocations[1].planned).toBe(300)
    expect(result.allocations[0].planned).toBe(300)
    expect(result.allocations[2].planned).toBe(200)
    expect(result.allocations[3].planned).toBe(200)
  })

  it('shows the amount that cannot be funded without cutting a protected item or actual', () => {
    const result = simulateAllocationChange(
      allocations,
      1000,
      1,
      800,
      ['Photography', 'Food & catering'],
      ['Food & catering'],
    )
    expect(result.valid).toBe(false)
    expect(result.unfunded).toBe(100)
  })
})
