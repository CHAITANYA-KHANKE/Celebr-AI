import type { Allocation } from '../types'

export function budgetSummary(total: number, allocations: Allocation[]) {
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
