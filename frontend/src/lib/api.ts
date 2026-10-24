import type { EventBrief, EventRecord, Plan } from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers)
  if (options?.body != null) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null
    throw new Error(body?.detail || `Request failed (${response.status}).`)
  }
  return response.json() as Promise<T>
}

export const api = {
  listEvents: () => request<EventRecord[]>('/api/events?limit=50'),
  generate: async (event: EventBrief) =>
    (
      await request<{ plan: Plan }>('/api/plans/generate', {
        method: 'POST',
        body: JSON.stringify(event),
      })
    ).plan,
  createEvent: (event: EventBrief, plan: Plan) =>
    request<EventRecord>('/api/events', { method: 'POST', body: JSON.stringify({ ...event, plan }) }),
  updateEvent: (event: EventRecord) =>
    request<EventRecord>(`/api/events/${event.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: event.name,
        category: event.category,
        event_date: event.event_date,
        location: event.location,
        guest_count: event.guest_count,
        budget: event.budget,
        currency: event.currency,
        theme_preference: event.theme_preference,
        preferences: event.preferences,
        dietary_needs: event.dietary_needs,
        accessibility_needs: event.accessibility_needs,
        priority_order: event.priority_order,
        must_haves: event.must_haves,
        children_count: event.children_count,
        older_adult_count: event.older_adult_count,
        venue_constraints: event.venue_constraints,
        planner_focus: event.planner_focus,
        plan: event.plan,
      }),
    }),
  exportFile: async (id: string, format: 'csv' | 'json') => {
    const response = await fetch(`${API_BASE}/api/events/${id}/export?format=${format}`)
    if (!response.ok) throw new Error('Could not export this event right now.')
    return response.blob()
  },
}
