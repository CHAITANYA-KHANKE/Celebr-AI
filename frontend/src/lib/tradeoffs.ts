import type { Allocation, PlanningPriority } from '../types'

export interface AllocationChange {
  category: string
  from: number
  to: number
  delta: number
}

export interface PriorityCutScenario {
  projectedBefore: number
  projectedAfter: number
  targetBudget: number
  unfunded: number
  allocations: Allocation[]
  changes: AllocationChange[]
}

export interface AllocationScenario {
  allocations: Allocation[]
  changes: AllocationChange[]
  bufferUsed: number
  unfunded: number
  valid: boolean
}

export function projectedCost(allocations: Allocation[]): number {
  return allocations.reduce((total, item) => total + Math.max(item.planned, item.actual), 0)
}

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

function priorityRank(category: string, priorities: PlanningPriority[]): number {
  const matches = priorities
    .map((priority, index) => (categoryMatches(category, priority) ? index : -1))
    .filter((index) => index >= 0)
  return matches.length ? Math.min(...matches) : priorities.length
}

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

/** Build a preview that trims uncommitted, lower-priority allocations without touching actuals or must-haves. */
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

/** Simulate funding a category increase from unallocated buffer, then flexible uncommitted lines. */
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
