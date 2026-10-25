import type { PlanTask } from '../types'

/**
 * Describes a date adjustment applied to a specific milestone task.
 */
export interface TaskDateChange {
  /** Identifier of the shifted milestone task. */
  id: string
  /** Human-readable task title. */
  title: string
  /** Original due date in YYYY-MM-DD format. */
  from: string
  /** Adjusted due date in YYYY-MM-DD format. */
  to: string
  /** Milestone completion status. */
  status: PlanTask['status']
}

/**
 * Result structure produced when simulating a prerequisite timeline delay.
 */
export interface TaskDelayPreview {
  /** The full updated list of tasks with new cascaded due dates. */
  tasks: PlanTask[]
  /** Specific date changes applied across the dependency tree. */
  changes: TaskDateChange[]
  /** Any tasks that overflow past the hard celebration event date. */
  overflow: TaskDateChange[]
  /** Total number of calendar days by which the root task was delayed. */
  delayDays: number
}

/**
 * Converts a YYYY-MM-DD date string to its integer day index since epoch.
 * @param date - Date string in YYYY-MM-DD format.
 * @returns Integer day count.
 */
const dayNumber = (date: string): number => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000)

/**
 * Adds a specific number of calendar days to an ISO date string.
 * @param date - Date string in YYYY-MM-DD format.
 * @param days - Number of days to add.
 * @returns Resulting date string in YYYY-MM-DD format.
 */
const addDays = (date: string, days: number): string => {
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

/**
 * Previews the effect of delaying a prerequisite task and cascades the delay
 * through all downstream descendant tasks in the Directed Acyclic Graph (DAG).
 * Preserves task completion statuses and flags any tasks overflowing past the event date.
 *
 * @param tasks - The current milestone task list.
 * @param taskId - The identifier of the root task being delayed.
 * @param newDueDate - The new proposed due date (YYYY-MM-DD).
 * @param eventDate - The fixed celebration date boundary.
 * @returns A TaskDelayPreview containing shifted tasks and overflow warnings, or null if invalid.
 */
export function previewTaskDelay(
  tasks: PlanTask[],
  taskId: string,
  newDueDate: string,
  eventDate: string,
): TaskDelayPreview | null {
  const delayedTask = tasks.find((task) => task.id === taskId)
  if (
    !delayedTask ||
    delayedTask.status === 'Done' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(newDueDate) ||
    newDueDate > eventDate
  ) {
    return null
  }

  const targetDay = dayNumber(newDueDate)
  const originalDay = dayNumber(delayedTask.due_date)
  if (!Number.isFinite(targetDay) || !Number.isFinite(originalDay)) return null

  const delayDays = targetDay - originalDay
  if (delayDays <= 0) return null

  const offsets = new Map<string, number>([[taskId, delayDays]])
  let changed = true
  while (changed) {
    changed = false
    for (const task of tasks) {
      if (task.id === taskId) continue
      const parentDelay = Math.max(0, ...(task.depends_on ?? []).map((id) => offsets.get(id) ?? 0))
      if (parentDelay > (offsets.get(task.id) ?? 0)) {
        offsets.set(task.id, parentDelay)
        changed = true
      }
    }
  }

  const changes: TaskDateChange[] = []
  const shiftedTasks = tasks.map((task) => {
    const offset = offsets.get(task.id) ?? 0
    if (offset <= 0) return task
    const to = task.id === taskId ? newDueDate : addDays(task.due_date, offset)
    if (to === task.due_date) return task
    changes.push({ id: task.id, title: task.title, from: task.due_date, to, status: task.status })
    return { ...task, due_date: to }
  })

  changes.sort((a, b) => a.to.localeCompare(b.to))
  return {
    tasks: shiftedTasks,
    changes,
    overflow: changes.filter((change) => change.to > eventDate),
    delayDays,
  }
}
