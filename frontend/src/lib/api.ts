import type { EventBrief, EventRecord, Plan } from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

/**
 * Executes an HTTP fetch request against the CelebrAI backend API.
 * Ensures strict security checks, explicit error handling, and JSON parsing.
 *
 * @template T - The expected JSON response type.
 * @param path - The endpoint path relative to API_BASE.
 * @param options - Fetch options including HTTP method, headers, and payload.
 * @returns Promise resolving to the typed API response.
 * @throws {Error} If the server responds with a non-2xx status code or a network failure occurs.
 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    const headers = new Headers(options?.headers)
    if (options?.body != null) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { detail?: string } | null
      throw new Error(body?.detail || `Request failed with status ${response.status}`)
    }

    return (await response.json()) as T
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err
    }
    throw new Error(String(err) || 'A network error occurred while communicating with the server.')
  }
}

/**
 * CelebrAI REST client providing typed, guarded methods for interacting
 * with event plans, database persistence, and formatted file exports.
 */
export const api = {
  /**
   * Fetches the list of saved events from the backend database.
   * @returns Promise resolving to an array of EventRecord items.
   */
  listEvents: (): Promise<EventRecord[]> => request<EventRecord[]>('/api/events?limit=50'),

  /**
   * Dispatches an event brief to the Gemini 2.5 Flash planning engine.
   * @param event - The user-defined event brief and constraints.
   * @returns Promise resolving to the generated Plan structure.
   */
  generate: async (event: EventBrief): Promise<Plan> => {
    try {
      const response = await request<{ plan: Plan }>('/api/plans/generate', {
        method: 'POST',
        body: JSON.stringify(event),
      })
      return response.plan
    } catch (err: unknown) {
      if (err instanceof Error) throw err
      throw new Error('Failed to generate celebration plan.')
    }
  },

  /**
   * Persists a newly created celebration event and its generated plan to the database.
   * @param event - The initial event brief.
   * @param plan - The associated celebration plan.
   * @returns Promise resolving to the persisted EventRecord.
   */
  createEvent: (event: EventBrief, plan: Plan): Promise<EventRecord> =>
    request<EventRecord>('/api/events', {
      method: 'POST',
      body: JSON.stringify({ ...event, plan }),
    }),

  /**
   * Updates an existing event record with latest budget actuals, vendor quotes, or tasks.
   * @param event - The updated EventRecord instance.
   * @returns Promise resolving to the updated EventRecord.
   */
  updateEvent: (event: EventRecord): Promise<EventRecord> =>
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

  /**
   * Downloads a sanitized export file (CSV or JSON) for an event plan.
   * @param id - The UUID of the event record to export.
   * @param format - Export format ('csv' or 'json').
   * @returns Promise resolving to the exported Blob.
   * @throws {Error} If the server cannot generate the export.
   */
  exportFile: async (id: string, format: 'csv' | 'json'): Promise<Blob> => {
    try {
      const response = await fetch(`${API_BASE}/api/events/${id}/export?format=${format}`)
      if (!response.ok) {
        throw new Error(`Export failed (${response.status}): ${response.statusText}`)
      }
      return await response.blob()
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err
      }
      throw new Error('Could not export this event right now.')
    }
  },
}
