import { describe, expect, it } from 'vitest'
import { readLocalEvents } from './storage'

describe('local event migration', () => {
  it('backfills new context and quote fields for existing browser-saved events', () => {
    localStorage.setItem(
      'celebrai.events.v1',
      JSON.stringify([
        {
          id: 'local-old',
          name: 'Older event',
          plan: {
            tasks: [{ id: 'task-1', title: 'Old task' }],
            vendors: [{ id: 'vendor-1', service: 'Old service' }],
          },
        },
      ]),
    )
    const [record] = readLocalEvents()
    expect(record.priority_order).toEqual([])
    expect(record.must_haves).toEqual([])
    expect(record.children_count).toBe(0)
    expect(record.older_adult_count).toBe(0)
    expect(record.venue_constraints).toBe('')
    expect(record.planner_focus).toBe('all_round')
    expect(record.plan.tasks[0].depends_on).toEqual([])
    expect(record.plan.vendors[0]).toMatchObject({
      coverage_guests: null,
      included_items: '',
      extra_charges: '',
    })
  })
})
