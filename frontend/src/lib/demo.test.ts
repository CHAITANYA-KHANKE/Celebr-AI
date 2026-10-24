import { describe, expect, it } from 'vitest'
import { makeDemoPlan } from './demo'
import type { EventBrief } from '../types'

const event: EventBrief = {
  name: 'Neighbours together',
  category: 'Community event',
  event_date: '2027-04-10',
  location: 'Nagpur',
  guest_count: 140,
  budget: 135000,
  currency: 'INR',
  theme_preference: 'A bright community picnic',
  preferences: 'Family friendly',
  dietary_needs: '',
  accessibility_needs: '',
  priority_order: ['Food & catering', 'Guest comfort & access'],
  must_haves: ['Food & catering'],
  children_count: 20,
  older_adult_count: 10,
  venue_constraints: 'Step-free access and a 10 pm end time.',
  planner_focus: 'budget',
}

describe('demo planner', () => {
  it('labels deterministic output and its estimates clearly', () => {
    const plan = makeDemoPlan(event)
    expect(plan.mode).toBe('demo')
    expect(plan.mode_note).toMatch(/not live AI/i)
    expect(plan.recommendations[0].category).toBe('Budget focus')
    expect(plan.budget.allocations.reduce((sum, item) => sum + item.planned, 0)).toBe(event.budget)
    expect(plan.assumptions[0]).toMatch(/not quotes/i)
    expect(
      plan.recommendations.find((idea) => idea.category === 'Personal touches')?.description,
    ).toContain('Family friendly')
    expect(plan.vendors.every((item) => item.name === '' && item.estimate === null)).toBe(true)
    expect(plan.overview).toContain(event.event_date)
  })
})
