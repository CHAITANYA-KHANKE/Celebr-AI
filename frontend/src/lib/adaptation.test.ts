import { describe, expect, it } from 'vitest'
import { mergeAdaptedPlan } from './adaptation'
import { makeDemoPlan } from './demo'
import type { EventBrief } from '../types'

const brief: EventBrief = {
  name: 'Ananya and Rohan',
  category: 'Wedding',
  event_date: '2027-06-10',
  location: 'Nagpur, Maharashtra',
  guest_count: 120,
  budget: 300000,
  currency: 'INR',
  theme_preference: 'Garden at dusk',
  preferences: 'Warm, relaxed, locally rooted',
  dietary_needs: 'Vegetarian options',
  accessibility_needs: 'Step-free access',
  priority_order: ['Food & catering', 'Photography', 'Guest comfort & access'],
  must_haves: ['Food & catering'],
  children_count: 8,
  older_adult_count: 18,
  venue_constraints: 'Step-free indoor plan.',
  planner_focus: 'all_round',
}

describe('plan adaptation', () => {
  it('rebalances a changed brief while preserving real work and vendor options', () => {
    const oldPlan = makeDemoPlan(brief)
    oldPlan.budget.allocations[0].actual = 17500
    oldPlan.budget.allocations.push({
      category: 'Extra transport',
      planned: 12000,
      actual: 3500,
      rationale: 'User-added allowance',
    })
    oldPlan.tasks[0].status = 'Done'
    oldPlan.tasks.push({
      id: 'user-task',
      title: 'Confirm family pickup points',
      description: 'Share the travel plan with relatives.',
      due_date: '2027-06-08',
      priority: 'Medium',
      status: 'In progress',
      depends_on: [oldPlan.tasks[0].id],
    })
    oldPlan.vendors[0].name = 'Chosen venue'
    oldPlan.vendors[0].estimate = 75000
    oldPlan.vendors[0].coverage_guests = 180
    oldPlan.vendors[0].included_items = 'Room, setup, chairs'
    oldPlan.vendors[0].extra_charges = 'Overtime and transport'
    oldPlan.vendors.push({
      ...oldPlan.vendors[0],
      id: 'venue-quote-2',
      name: 'Second venue option',
      estimate: 82000,
      status: 'Quoted',
    })

    const changed = { ...brief, guest_count: 220, budget: 420000, event_date: '2027-07-10' }
    const adapted = mergeAdaptedPlan(oldPlan, makeDemoPlan(changed), changed, brief.event_date)

    expect(adapted.budget.total).toBe(420000)
    expect(adapted.budget.allocations.reduce((sum, row) => sum + row.planned, 0)).toBeCloseTo(420000, 2)
    expect(adapted.budget.allocations.find((row) => row.category === 'Food & drink')?.actual).toBe(17500)
    expect(adapted.budget.allocations.find((row) => row.category === 'Extra transport')).toMatchObject({
      planned: expect.any(Number),
      actual: 3500,
    })
    expect(adapted.tasks.find((task) => task.title === 'Set your planning priorities')?.status).toBe(
      'Done',
    )
    const venueTask = adapted.tasks.find((task) => task.title === 'Shortlist a venue')!
    const priorityTask = adapted.tasks.find((task) => task.title === 'Set your planning priorities')!
    expect(venueTask.depends_on).toContain(priorityTask.id)
    const customTask = adapted.tasks.find((task) => task.id === 'user-task')!
    expect(customTask.depends_on).toEqual([priorityTask.id])
    expect(customTask.due_date).toBe('2027-07-08')
    expect(
      adapted.tasks.find((task) => task.title === 'Final guest and logistics check')?.due_date,
    ).toBe('2027-07-03')
    expect(adapted.vendors.find((vendor) => vendor.name === 'Chosen venue')).toMatchObject({
      estimate: 75000,
      coverage_guests: 180,
      included_items: 'Room, setup, chairs',
      extra_charges: 'Overtime and transport',
    })
    expect(adapted.vendors.find((vendor) => vendor.name === 'Second venue option')?.estimate).toBe(82000)
  })

  it('weights per-guest categories more heavily as a wedding guest list grows', () => {
    const intimate = makeDemoPlan({ ...brief, guest_count: 80 })
    const large = makeDemoPlan({ ...brief, guest_count: 350 })
    const intimateFood = intimate.budget.allocations.find((row) => row.category === 'Food & drink')!
    const largeFood = large.budget.allocations.find((row) => row.category === 'Food & drink')!
    const intimateDecor = intimate.budget.allocations.find(
      (row) => row.category === 'Decor & atmosphere',
    )!
    const largeDecor = large.budget.allocations.find((row) => row.category === 'Decor & atmosphere')!
    expect(largeFood.planned / large.budget.total).toBeGreaterThan(
      intimateFood.planned / intimate.budget.total,
    )
    expect(largeDecor.planned / large.budget.total).toBeLessThan(
      intimateDecor.planned / intimate.budget.total,
    )
  })
})
