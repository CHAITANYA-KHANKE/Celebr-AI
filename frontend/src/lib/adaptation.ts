import type { EventBrief, Plan, PlanTask, VendorItem } from '../types'

/**
 * Normalizes an arbitrary text string for insensitive case and whitespace matching.
 * @param value - Raw text string.
 * @returns Trimmed lowercase string.
 */
const normalize = (value: string): string => value.trim().toLocaleLowerCase()

/**
 * Resolves semantic category aliases between different event types and generations.
 *
 * @param category - Original category name.
 * @param event - Target event brief.
 * @returns Canonicalized category key.
 */
function allocationAlias(category: string, event: EventBrief): string {
  const key = normalize(category)
  if (key === 'music & activities') return 'music & entertainment'
  if (key === 'food & drink') {
    if (event.category === 'Birthday') return 'food, cake & drinks'
    if (event.category === 'Community event') return 'food & refreshments'
  }
  return key
}

/**
 * Rebalances budget allocations proportionally so their sum matches the target total exactly down to the cent.
 *
 * @param rows - Current budget allocation rows.
 * @param total - Target total budget figure.
 * @returns Rebalanced allocation rows.
 */
function rebalanceRows(rows: Plan['budget']['allocations'], total: number): Plan['budget']['allocations'] {
  const cents = Math.round(total * 100)
  const rawSum = rows.reduce((sum, row) => sum + row.planned, 0)
  let usedCents = 0
  return rows.map((row, index) => {
    const plannedCents =
      index === rows.length - 1
        ? cents - usedCents
        : rawSum > 0
          ? Math.round((row.planned / rawSum) * cents)
          : Math.floor(cents / rows.length)
    usedCents += plannedCents
    return { ...row, planned: plannedCents / 100 }
  })
}

/**
 * Merges prior user-entered actual spends with newly generated budget recommendations.
 * Preserves user custom budget rows while refreshing category planned ratios.
 *
 * @param current - Existing active plan.
 * @param generated - Newly generated candidate plan.
 * @param event - Updated event brief.
 * @returns Merged and rebalanced budget allocation array.
 */
function mergeAllocations(
  current: Plan,
  generated: Plan,
  event: EventBrief,
): Plan['budget']['allocations'] {
  const oldByCategory = new Map<string, Plan['budget']['allocations'][number]>()
  for (const row of current.budget.allocations) {
    const key = allocationAlias(row.category, event)
    if (!oldByCategory.has(key)) oldByCategory.set(key, row)
  }
  const matchedKeys = new Set<string>()
  const defaults = generated.budget.allocations.map((row) => {
    const key = normalize(row.category)
    const old = oldByCategory.get(key)
    if (old) matchedKeys.add(key)
    return old ? { ...row, actual: old.actual } : row
  })
  const customRows = current.budget.allocations.filter((row) => {
    const key = allocationAlias(row.category, event)
    return (
      !matchedKeys.has(key) &&
      !generated.budget.allocations.some((item) => normalize(item.category) === key)
    )
  })
  return rebalanceRows([...defaults, ...customRows], event.budget)
}

/**
 * Harmonizes milestone tasks when an event brief date or requirements shift.
 * Preserves completed milestone statuses, shifts custom dates proportionally,
 * and maintains dependency graph integrity.
 *
 * @param current - Existing active plan.
 * @param generated - Newly generated candidate plan.
 * @param previousEventDate - Old event date (YYYY-MM-DD).
 * @param nextEventDate - New event date (YYYY-MM-DD).
 * @returns Merged task array with updated due dates and preserved statuses.
 */
function mergeTasks(
  current: Plan,
  generated: Plan,
  previousEventDate: string,
  nextEventDate: string,
): PlanTask[] {
  const oldByTitle = new Map(current.tasks.map((task) => [normalize(task.title), task]))
  const oldIdToNewId = new Map<string, string>()
  const regenerated = generated.tasks.map((task) => {
    const old = oldByTitle.get(normalize(task.title))
    if (old) oldIdToNewId.set(old.id, task.id)
    return old ? { ...task, status: old.status } : task
  })
  const [oldYear, oldMonth, oldDay] = previousEventDate.split('-').map(Number)
  const [newYear, newMonth, newDay] = nextEventDate.split('-').map(Number)
  const dayDelta = Math.round(
    (Date.UTC(newYear, newMonth - 1, newDay) - Date.UTC(oldYear, oldMonth - 1, oldDay)) / 86_400_000,
  )
  const generatedTitles = new Set(generated.tasks.map((task) => normalize(task.title)))
  const custom = current.tasks
    .filter((task) => !generatedTitles.has(normalize(task.title)))
    .map((task) => {
      const [year, month, day] = task.due_date.split('-').map(Number)
      const shiftedDate = new Date(Date.UTC(year, month - 1, day + dayDelta)).toISOString().slice(0, 10)
      return {
        ...task,
        due_date: shiftedDate > nextEventDate ? nextEventDate : shiftedDate,
        depends_on: (task.depends_on ?? []).map((id) => oldIdToNewId.get(id) ?? id),
      }
    })
  // Keep custom task dependencies only when the referenced task also remains in the adapted plan.
  const validIds = new Set([...regenerated, ...custom].map((task) => task.id))
  return [...regenerated, ...custom].map((task) => ({
    ...task,
    depends_on: task.depends_on.filter((id) => validIds.has(id) && id !== task.id),
  }))
}

/**
 * Combines existing user vendor negotiations and quotes with new AI checklist suggestions.
 * Retains custom vendor quotes, vendor contact details, and comparison notes.
 *
 * @param current - Existing active plan.
 * @param generated - Newly generated candidate plan.
 * @returns Unified vendor list with user edits intact.
 */
function mergeVendors(current: Plan, generated: Plan): VendorItem[] {
  const previous = current.vendors.map((vendor) => ({ ...vendor, used: false }))
  const adapted = generated.vendors.map((vendor) => {
    const match = previous.find(
      (old) =>
        !old.used &&
        normalize(old.category) === normalize(vendor.category) &&
        normalize(old.service) === normalize(vendor.service),
    )
    if (!match) return vendor
    match.used = true
    return {
      ...vendor,
      id: match.id,
      name: match.name,
      contact: match.contact,
      estimate: match.estimate,
      coverage_guests: match.coverage_guests ?? null,
      included_items: match.included_items ?? '',
      extra_charges: match.extra_charges ?? '',
      status: match.status,
      notes: match.notes,
    }
  })
  const additionalQuotes = previous
    .filter((vendor) => !vendor.used)
    .map(({ used: _used, ...vendor }) => vendor)
  return [...adapted, ...additionalQuotes]
}

/**
 * Non-destructively adapts an existing plan when a user modifies their event parameters.
 * Rebalances budget allocations to match the new budget ceiling, shifts task timelines
 * by the date delta, and strictly protects all entered actuals and vendor contracts.
 *
 * @param current - The user's active celebration plan.
 * @param generated - A newly generated plan representing updated parameters.
 * @param event - The updated event brief.
 * @param previousEventDate - The original event date string (YYYY-MM-DD).
 * @returns A fully merged, non-destructive Plan.
 */
export function mergeAdaptedPlan(
  current: Plan,
  generated: Plan,
  event: EventBrief,
  previousEventDate = event.event_date,
): Plan {
  return {
    ...generated,
    budget: { total: event.budget, allocations: mergeAllocations(current, generated, event) },
    tasks: mergeTasks(current, generated, previousEventDate, event.event_date),
    vendors: mergeVendors(current, generated),
  }
}
