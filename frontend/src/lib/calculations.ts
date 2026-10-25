import type { Allocation } from '../types'

export interface BudgetSummaryResult {
  allocated: number
  actual: number
  remaining: number
  utilization: number
  unallocated: number
  overallocated: number
  overspent: boolean
}

/**
 * Calculates deterministic budget balance, utilization percentage,
 * and overspend thresholds for an event plan.
 *
 * @param total Total entered budget for the event
 * @param allocations List of category allocations with planned and actual spend
 * @returns Structured budget summary with allocated, actual, remaining, and alert flags
 */
export function budgetSummary(total: number, allocations: Allocation[]): BudgetSummaryResult {
  const allocated = allocations.reduce((sum, item) => sum + Math.max(0, Number(item.planned) || 0), 0)
  const actual = allocations.reduce((sum, item) => sum + Math.max(0, Number(item.actual) || 0), 0)
  const remaining = total - actual
  return {
    allocated,
    actual,
    remaining,
    utilization: total > 0 ? Math.min(100, Math.max(0, (actual / total) * 100)) : 0,
    unallocated: Math.max(0, total - allocated),
    overallocated: Math.max(0, allocated - total),
    overspent: remaining < 0,
  }
}

