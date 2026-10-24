import { describe, expect, it } from 'vitest'
import { previewTaskDelay } from './task-shifts'
import type { PlanTask } from '../types'

const tasks: PlanTask[] = [
  {
    id: 'venue',
    title: 'Confirm venue',
    description: '',
    due_date: '2027-01-05',
    priority: 'High',
    status: 'In progress',
    depends_on: [],
  },
  {
    id: 'menu',
    title: 'Confirm menu',
    description: '',
    due_date: '2027-01-10',
    priority: 'High',
    status: 'To do',
    depends_on: ['venue'],
  },
  {
    id: 'final',
    title: 'Final guest check',
    description: '',
    due_date: '2027-01-15',
    priority: 'Medium',
    status: 'Done',
    depends_on: ['menu'],
  },
  {
    id: 'independent',
    title: 'Order invitations',
    description: '',
    due_date: '2027-01-08',
    priority: 'Low',
    status: 'To do',
    depends_on: [],
  },
]

describe('prerequisite delay preview', () => {
  it('shifts dependent dates by the delay, keeps unrelated dates and all task statuses', () => {
    const result = previewTaskDelay(tasks, 'venue', '2027-01-08', '2027-01-20')!
    expect(result.delayDays).toBe(3)
    expect(result.changes.map(({ id, from, to }) => [id, from, to])).toEqual([
      ['venue', '2027-01-05', '2027-01-08'],
      ['menu', '2027-01-10', '2027-01-13'],
      ['final', '2027-01-15', '2027-01-18'],
    ])
    expect(result.tasks.find((task) => task.id === 'independent')?.due_date).toBe('2027-01-08')
    expect(result.tasks.find((task) => task.id === 'final')?.status).toBe('Done')
  })

  it('flags descendants that would fall after the event date', () => {
    const result = previewTaskDelay(tasks, 'venue', '2027-01-10', '2027-01-17')!
    expect(result.overflow.map((change) => change.id)).toEqual(['final'])
  })

  it('does not produce a delay preview for an earlier or unchanged date', () => {
    expect(previewTaskDelay(tasks, 'venue', '2027-01-05', '2027-01-20')).toBeNull()
    expect(previewTaskDelay(tasks, 'venue', '2027-01-04', '2027-01-20')).toBeNull()
  })
})
