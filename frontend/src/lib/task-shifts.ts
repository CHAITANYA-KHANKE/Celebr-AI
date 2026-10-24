import type { PlanTask } from '../types'

export interface TaskDateChange {
  id: string
  title: string
  from: string
  to: string
  status: PlanTask['status']
}

export interface TaskDelayPreview {
  tasks: PlanTask[]
  changes: TaskDateChange[]
  overflow: TaskDateChange[]
  delayDays: number
}

const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000)
const addDays = (date: string, days: number) => {
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

/** Preview a prerequisite delay and shift every descendant by the maximum upstream delay; statuses stay unchanged. */
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
  )
    return null
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
