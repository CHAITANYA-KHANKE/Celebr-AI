import { afterEach, describe, expect, it, vi } from 'vitest'
import axe from 'axe-core'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventWizard } from './EventWizard'
import type { EventBrief } from '../types'

afterEach(cleanup)

const sample: EventBrief = {
  name: 'Garden birthday',
  category: 'Birthday' as const,
  event_date: '2027-02-14',
  location: 'Nagpur',
  guest_count: 0,
  budget: 40000,
  currency: 'INR',
  theme_preference: '',
  preferences: '',
  dietary_needs: '',
  accessibility_needs: '',
  priority_order: [],
  must_haves: [],
  children_count: 0,
  older_adult_count: 0,
  venue_constraints: '',
  planner_focus: 'all_round',
}

describe('EventWizard', () => {
  it('validates event details and submits a complete event brief', async () => {
    const user = userEvent.setup()
    const onGenerate = vi.fn().mockResolvedValue(undefined)
    render(<EventWizard onClose={vi.fn()} onGenerate={onGenerate} initial={sample} />)

    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: 'Select Budget coach' }))
    await user.click(screen.getByRole('button', { name: 'Add Food & catering to priorities' }))
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByText(/guests must be/i)).toBeInTheDocument()

    await user.clear(screen.getByLabelText(/expected guests/i))
    await user.type(screen.getByLabelText(/expected guests/i), '45')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('checkbox', { name: /Submit my brief to this AI planner/i }))
    await user.click(screen.getByRole('button', { name: /share brief & build plan/i }))

    await waitFor(() => expect(onGenerate).toHaveBeenCalledTimes(1))
    expect(onGenerate.mock.calls[0][0]).toMatchObject({
      name: 'Garden birthday',
      category: 'Birthday',
      guest_count: 45,
      budget: 40000,
      location: 'Nagpur',
      planner_focus: 'budget',
    })
  })

  it('captures ranked priorities, must-haves, age mix and venue constraints', async () => {
    const user = userEvent.setup()
    const onGenerate = vi.fn().mockResolvedValue(undefined)
    render(
      <EventWizard onClose={vi.fn()} onGenerate={onGenerate} initial={{ ...sample, guest_count: 45 }} />,
    )
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: 'Add Food & catering to priorities' }))
    await user.click(screen.getByRole('button', { name: 'Add Photography to priorities' }))
    await user.click(screen.getByRole('button', { name: 'Add Venue to priorities' }))
    await user.click(screen.getByRole('button', { name: 'Add Decor & styling to priorities' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/up to three ranked priorities/i)
    await user.click(screen.getByRole('button', { name: 'Add Food & catering as a must-have' }))
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.clear(screen.getByLabelText(/Children expected/i))
    await user.type(screen.getByLabelText(/Children expected/i), '5')
    await user.clear(screen.getByLabelText(/Older adults expected/i))
    await user.type(screen.getByLabelText(/Older adults expected/i), '12')
    await user.type(screen.getByLabelText(/Venue constraints/i), 'Step-free hall; end by 10 pm')
    await user.click(screen.getByRole('checkbox', { name: /Submit my brief to this AI planner/i }))
    await user.click(screen.getByRole('button', { name: /share brief & build plan/i }))
    await waitFor(() => expect(onGenerate).toHaveBeenCalledTimes(1))
    expect(onGenerate.mock.calls[0][0]).toMatchObject({
      priority_order: ['Food & catering', 'Photography', 'Venue'],
      must_haves: ['Food & catering'],
      children_count: 5,
      older_adult_count: 12,
      venue_constraints: 'Step-free hall; end by 10 pm',
      planner_focus: 'all_round',
    })
  })

  it('requires explicit consent before submitting the event brief', async () => {
    const user = userEvent.setup()
    const onGenerate = vi.fn().mockResolvedValue(undefined)
    render(
      <EventWizard onClose={vi.fn()} onGenerate={onGenerate} initial={{ ...sample, guest_count: 45 }} />,
    )
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: 'Add Food & catering to priorities' }))
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /share brief & build plan/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/confirm how your event brief is used/i)
    expect(onGenerate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('checkbox', { name: /submit my brief to this AI planner/i }))
    await user.click(screen.getByRole('button', { name: /share brief & build plan/i }))
    await waitFor(() => expect(onGenerate).toHaveBeenCalledTimes(1))
  })

  it('lets the user pick a different supported event category', async () => {
    const user = userEvent.setup()
    render(
      <EventWizard onClose={vi.fn()} onGenerate={vi.fn()} initial={{ ...sample, guest_count: 45 }} />,
    )
    const community = screen.getByRole('button', { name: /community better, together/i })
    await user.click(community)
    expect(community).toHaveAttribute('aria-pressed', 'true')
  })

  it('has no axe-detected WCAG A/AA semantic violations on the priority step', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <EventWizard onClose={vi.fn()} onGenerate={vi.fn()} initial={{ ...sample, guest_count: 45 }} />,
    )
    await user.click(screen.getByRole('button', { name: /continue/i }))
    const results = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      rules: { 'color-contrast': { enabled: false } },
    })
    expect(results.violations).toEqual([])
  })

  it('has no axe-detected WCAG A/AA semantic violations on the first step', async () => {
    const { container } = render(
      <EventWizard onClose={vi.fn()} onGenerate={vi.fn()} initial={{ ...sample, guest_count: 45 }} />,
    )
    const results = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      rules: { 'color-contrast': { enabled: false } },
    })
    expect(results.violations).toEqual([])
  })
})
