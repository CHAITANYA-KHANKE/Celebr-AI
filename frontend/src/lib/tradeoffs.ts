import type { Allocation, PlanningPriority } from '../types'

/**
 * Represents a simulated or applied monetary delta on a budget line item.
 */
export interface AllocationChange {
  /** Category name of the budget item. */
  category: string
  /** Previous planned allocation value. */
  from: number
  /** Updated planned allocation value. */
  to: number
  /** Net monetary shift (to - from). */
  delta: number
}

/**
 * Result scenario produced when calculating priority-based budget cuts.
 */
export interface PriorityCutScenario {
  /** Total projected cost prior to applying trade-offs. */
  projectedBefore: number
  /** Projected cost after trimming flexible categories. */
  projectedAfter: number
  /** Target budget ceiling. */
  targetBudget: number
  /** Remaining unfunded excess after all flexible lines have been trimmed. */
  unfunded: number
  /** Resulting rebalanced allocations. */
  allocations: Allocation[]
  /** Detailed breakdown of line-item changes. */
  changes: AllocationChange[]
}

/**
 * Simulation output when evaluating an increase to a specific budget line item.
 */
export interface AllocationScenario {
  /** Candidate allocations after simulation. */
  allocations: Allocation[]
  /** Detailed breakdown of line-item changes. */
  changes: AllocationChange[]
  /** Amount absorbed from unallocated reserve buffer. */
  bufferUsed: number
  /** Amount that could not be funded within existing budget boundaries. */
  unfunded: number
  /** Whether the requested increase is fully fundable without deficit. */
  valid: boolean
}

/**
 * Calculates the total projected event cost based on the higher of planned or actual spending per category.
 *
 * @param allocations - Array of category budget allocations.
 * @returns Total projected cost.
 */
export function projectedCost(allocations: Allocation[]): number {
  return allocations.reduce((total, item) => total + Math.max(item.planned, item.actual), 0)
}

/**
 * Determines whether a budget category string maps to a user planning priority.
 *
 * @param category - Category title string.
 * @param priority - User planning priority value.
 * @returns True if the category corresponds to the priority.
 */
function categoryMatches(category: string, priority: PlanningPriority): boolean {
  const name = category.toLocaleLowerCase()
  if (priority === 'Food & catering') return name.startsWith('food') || name.startsWith('catering')
  if (priority === 'Venue') return name.startsWith('venue')
  if (priority === 'Photography') return name.includes('photo') || name.includes('memories')
  if (priority === 'Decor & styling') return name.includes('decor') || name.includes('styling')
  if (priority === 'Attire & ceremony') return name.includes('attire') || name.includes('ceremony')
  if (priority === 'Entertainment')
    return ['music', 'activity', 'program'].some((word) => name.includes(word))
  if (priority === 'Guest comfort & access')
    return ['guest', 'comfort', 'access'].some((word) => name.includes(word))
  if (priority === 'Logistics')
    return ['logistic', 'transport', 'access'].some((word) => name.includes(word))
  return name.startsWith('other')
}

/**
 * Computes the relative ranking index of a budget category against prioritized interests.
 *
 * @param category - Category title string.
 * @param priorities - User-defined ranking of planning priorities.
 * @returns Index in priority order (0 being highest priority), or length if unranked.
 */
function priorityRank(category: string, priorities: PlanningPriority[]): number {
  const matches = priorities
    .map((priority, index) => (categoryMatches(category, priority) ? index : -1))
    .filter((index) => index >= 0)
  return matches.length ? Math.min(...matches) : priorities.length
}

/**
 * Generates an index sequence of allocations ordered from most flexible to least flexible.
 * Strictly shields must-haves and top priorities from reduction.
 *
 * @param allocations - Current allocation array.
 * @param priorities - Ordered priority list.
 * @param mustHaves - Protected must-have priorities.
 * @param excludeIndex - Optional index to exclude from reduction candidates.
 * @returns Array of allocation indices in trimming order.
 */
function flexibleOrder(
  allocations: Allocation[],
  priorities: PlanningPriority[],
  mustHaves: PlanningPriority[],
  excludeIndex = -1,
): number[] {
  return allocations
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => index !== excludeIndex)
    .filter(({ item }) => !mustHaves.some((priority) => categoryMatches(item.category, priority)))
    .filter(({ item }) => !priorities[0] || !categoryMatches(item.category, priorities[0]))
    .sort((a, b) => {
      const rankDifference =
        priorityRank(b.item.category, priorities) - priorityRank(a.item.category, priorities)
      return rankDifference || a.index - b.index
    })
    .map(({ index }) => index)
}

/**
 * Generates a non-destructive trade-off proposal that brings projected spend within budget.
 * Trims uncommitted funds from lower-ranked categories while preserving all incurred actuals and must-haves.
 *
 * @param allocations - Current budget allocations.
 * @param budget - Total event budget ceiling.
 * @param priorities - User priority ranking.
 * @param mustHaves - Protected priority categories.
 * @returns A PriorityCutScenario detailing line-item adjustments and remaining balance.
 */
export function proposePriorityCuts(
  allocations: Allocation[],
  budget: number,
  priorities: PlanningPriority[],
  mustHaves: PlanningPriority[],
): PriorityCutScenario {
  const projectedBefore = projectedCost(allocations)
  let remaining = Math.max(0, projectedBefore - budget)
  const next = allocations.map((item) => ({ ...item }))
  const changes: AllocationChange[] = []
  for (const index of flexibleOrder(next, priorities, mustHaves)) {
    const item = next[index]
    const available = Math.max(0, item.planned - item.actual)
    const cut = Math.min(available, remaining)
    if (cut <= 0) continue
    const to = Math.max(item.actual, item.planned - cut)
    changes.push({ category: item.category, from: item.planned, to, delta: to - item.planned })
    item.planned = to
    remaining -= cut
    if (remaining <= 0.01) break
  }
  const projectedAfter = projectedCost(next)
  return {
    projectedBefore,
    projectedAfter,
    targetBudget: budget,
    unfunded: Math.max(0, projectedAfter - budget),
    allocations: next,
    changes,
  }
}

/**
 * Simulates funding an allocation increase by first consuming unallocated contingency buffer,
 * then trimming lower-ranked flexible categories if required.
 *
 * @param allocations - Current budget allocations.
 * @param budget - Total event budget ceiling.
 * @param categoryIndex - Target category index to increase.
 * @param requestedAmount - New target allocation amount.
 * @param priorities - User priority ranking.
 * @param mustHaves - Protected priority categories.
 * @returns An AllocationScenario containing adjusted allocations and validity status.
 */
export function simulateAllocationChange(
  allocations: Allocation[],
  budget: number,
  categoryIndex: number,
  requestedAmount: number,
  priorities: PlanningPriority[],
  mustHaves: PlanningPriority[],
): AllocationScenario {
  const target = allocations[categoryIndex]
  if (!target || !Number.isFinite(requestedAmount) || requestedAmount < target.actual) {
    return { allocations, changes: [], bufferUsed: 0, unfunded: 0, valid: false }
  }
  const next = allocations.map((item) => ({ ...item }))
  const oldAmount = next[categoryIndex].planned
  const desired = Math.max(requestedAmount, next[categoryIndex].actual)
  next[categoryIndex].planned = desired
  const increase = Math.max(0, desired - oldAmount)
  const totalPlanned = allocations.reduce((sum, item) => sum + item.planned, 0)
  const bufferUsed = Math.min(increase, Math.max(0, budget - totalPlanned))
  let remaining = increase - bufferUsed
  const changes: AllocationChange[] = []
  if (desired !== oldAmount) {
    changes.push({ category: target.category, from: oldAmount, to: desired, delta: desired - oldAmount })
  }
  for (const index of flexibleOrder(next, priorities, mustHaves, categoryIndex)) {
    const item = next[index]
    const cut = Math.min(Math.max(0, item.planned - item.actual), remaining)
    if (cut <= 0) continue
    const from = item.planned
    item.planned = Math.max(item.actual, from - cut)
    changes.push({ category: item.category, from, to: item.planned, delta: item.planned - from })
    remaining -= cut
    if (remaining <= 0.01) break
  }
  return {
    allocations: next,
    changes,
    bufferUsed,
    unfunded: Math.max(0, remaining),
    valid: remaining <= 0.01,
  }
}
