import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { makeDemoPlan } from './lib/demo'
import type { EventBrief, EventRecord } from './types'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})

function jsonResponse(data: unknown) {
  return { ok: true, status: 200, json: async () => data } as Response
}

describe('Celebrai primary planning flow', () => {
  it('creates a plan, tracks an overrun, completes a task, updates a vendor, and saves changes', async () => {
    const user = userEvent.setup()
    let idCounter = 0
    vi.stubGlobal('crypto', { randomUUID: () => `item-${++idCounter}` })
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/events?limit=50') return jsonResponse([])
      if (url === '/api/plans/generate') {
        const brief = JSON.parse(String(init?.body)) as EventBrief
        return jsonResponse({ plan: makeDemoPlan(brief) })
      }
      if (url === '/api/events' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as Omit<
          EventRecord,
          'id' | 'created_at' | 'updated_at'
        >
        return jsonResponse({
          ...body,
          id: 'event-123',
          created_at: '2026-10-23T00:00:00Z',
          updated_at: '2026-10-23T00:00:00Z',
        })
      }
      if (url === '/api/events/event-123' && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body))
        return jsonResponse({
          ...body,
          id: 'event-123',
          created_at: '2026-10-23T00:00:00Z',
          updated_at: new Date().toISOString(),
        })
      }
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    const { container } = render(<App />)

    await user.click(await screen.findByRole('button', { name: /plan a celebration/i }))
    await user.type(screen.getByLabelText(/event name/i), 'Garden birthday')
    await user.type(screen.getByLabelText(/where is it happening/i), 'Nagpur')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: 'Add Food & catering to priorities' }))
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('checkbox', { name: /Submit my brief to this AI planner/i }))
    await user.click(screen.getByRole('button', { name: /share brief & build plan/i }))

    expect(
      await screen.findByRole('heading', { name: 'The lovely little overview' }),
    ).toBeInTheDocument()
    expect(await screen.findByText(/Demo plan · not live AI/i)).toBeInTheDocument()
    expect(screen.getByText(/AI focus · All-round planner/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Budget' }))
    const actualInput = screen.getByLabelText('Actual expense for Food & drink')
    fireEvent.change(actualInput, { target: { value: '280000' } })
    fireEvent.blur(actualInput)
    expect(await screen.findByText(/Actual spend is over budget/i)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Review trade-offs before changing anything/i }),
    ).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Allocation to change'), '4')
    const whatIfInput = screen.getByLabelText('New planned amount')
    await user.clear(whatIfInput)
    await user.type(whatIfInput, '90000')
    await user.click(screen.getByRole('button', { name: /Preview reallocation/i }))
    expect(screen.getByText(/planned amount.*would change/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Confirm and apply this scenario/i }))

    await user.click(screen.getByRole('button', { name: /^Timeline/ }))
    const firstTaskRow = container.querySelector<HTMLElement>('.timeline-row')!
    await user.click(within(firstTaskRow).getByRole('button', { name: /Preview delay/i }))
    const delayDateInput = screen.getByLabelText('New due date')
    const nextDueDate = new Date(`${(delayDateInput as HTMLInputElement).value}T00:00:00Z`)
    nextDueDate.setUTCDate(nextDueDate.getUTCDate() + 1)
    fireEvent.change(delayDateInput, { target: { value: nextDueDate.toISOString().slice(0, 10) } })
    await user.click(screen.getByRole('button', { name: 'Calculate impact' }))
    expect(screen.getByText(/would shift by up to 1 day/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Confirm and apply date shifts/i }))

    const venueStatus = screen.getByLabelText(/Status for Shortlist a venue/i)
    expect(within(venueStatus).getByRole('option', { name: 'Done' })).toBeDisabled()
    await user.selectOptions(screen.getByLabelText(/Status for Set your planning priorities/i), 'Done')
    expect(within(venueStatus).getByRole('option', { name: 'Done' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Vendors' }))
    await user.selectOptions(screen.getAllByLabelText('Booking status')[0], 'Booked')
    const venueCard = Array.from(container.querySelectorAll<HTMLElement>('.vendor-card')).find((card) =>
      card.textContent?.includes('Ceremony & reception space'),
    )!
    await user.click(
      within(venueCard).getByRole('button', { name: /add another quote for this service/i }),
    )
    const venueQuoteCards = Array.from(container.querySelectorAll('.vendor-card')).filter((card) =>
      card.textContent?.includes('Ceremony & reception space'),
    )
    fireEvent.change(venueQuoteCards[0].querySelector('input[type="number"]')!, {
      target: { value: '76000' },
    })
    fireEvent.blur(venueQuoteCards[0].querySelector('input[type="number"]')!)
    fireEvent.change(venueQuoteCards[1].querySelector('input[type="number"]')!, {
      target: { value: '82000' },
    })
    fireEvent.blur(venueQuoteCards[1].querySelector('input[type="number"]')!)
    for (const [index, card] of venueQuoteCards.entries()) {
      fireEvent.change(within(card as HTMLElement).getByLabelText(/Guest count covered/i), {
        target: { value: String(index === 0 ? 180 : 150) },
      })
      fireEvent.blur(within(card as HTMLElement).getByLabelText(/Guest count covered/i))
      fireEvent.change(within(card as HTMLElement).getByLabelText(/Inclusions/i), {
        target: { value: 'Room, tables, setup' },
      })
      fireEvent.blur(within(card as HTMLElement).getByLabelText(/Inclusions/i))
      fireEvent.change(within(card as HTMLElement).getByLabelText(/Extra charges/i), {
        target: { value: 'Travel and overtime' },
      })
      fireEvent.blur(within(card as HTMLElement).getByLabelText(/Extra charges/i))
    }
    expect(await screen.findByText('Lowest entered')).toBeInTheDocument()
    expect(screen.getByText(/Covers: 180 guests/i)).toBeInTheDocument()
    await user.click(screen.getByText(/Negotiation questions for Ceremony & reception space/i))
    expect(screen.getByText(/same scope and guest count/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: 'Edit details' }))
    await user.click(screen.getByRole('button', { name: /continue/i }))
    const guestInput = screen.getByLabelText(/Expected guests/i)
    await user.clear(guestInput)
    await user.type(guestInput, '180')
    const budgetInput = screen.getAllByRole('spinbutton')[1]
    await user.clear(budgetInput)
    await user.type(budgetInput, '500000')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('checkbox', { name: /Submit my brief to this AI planner/i }))
    await user.click(screen.getByRole('button', { name: /share brief & refresh plan/i }))

    await user.click(screen.getByRole('button', { name: 'Budget' }))
    expect(screen.getByLabelText('Actual expense for Food & drink')).toHaveValue(280000)
    expect(screen.getAllByText(/₹5,00,000/).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: /^Timeline/ }))
    expect(screen.getByLabelText(/Status for Set your planning priorities/i)).toHaveValue('Done')
    await user.click(screen.getByRole('button', { name: 'Vendors' }))
    expect(screen.getByText('Lowest entered')).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.filter((call) => String(call[0]) === '/api/plans/generate'),
    ).toHaveLength(2)

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter((call) => String(call[0]) === '/api/events/event-123').length,
      ).toBeGreaterThanOrEqual(3),
    )
    expect(fetchMock).toHaveBeenCalledWith('/api/events', expect.objectContaining({ method: 'POST' }))
    expect(screen.getByText(/All changes saved/i)).toBeInTheDocument()
  })
})
