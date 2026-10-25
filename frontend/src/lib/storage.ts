import type { EventRecord } from '../types'

const KEY = 'celebrai.events.v1'

/**
 * Validates and normalizes an untrusted raw JSON object into a conforming EventRecord structure.
 * Ensures all required collections (priority_order, must_haves, tasks, vendors) are instantiated.
 *
 * @param value - Untrusted raw object read from browser storage.
 * @returns A validated EventRecord instance, or null if essential fields are absent.
 */
function normalizeEvent(value: unknown): EventRecord | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Partial<EventRecord>
  if (!record.id || !record.plan || !record.name) return null
  return {
    ...record,
    priority_order: Array.isArray(record.priority_order) ? record.priority_order : [],
    must_haves: Array.isArray(record.must_haves) ? record.must_haves : [],
    children_count: Number.isFinite(record.children_count) ? record.children_count! : 0,
    older_adult_count: Number.isFinite(record.older_adult_count) ? record.older_adult_count! : 0,
    venue_constraints: record.venue_constraints ?? '',
    planner_focus: record.planner_focus ?? 'all_round',
    plan: {
      ...record.plan,
      tasks: (record.plan.tasks ?? []).map((task) => ({ ...task, depends_on: task.depends_on ?? [] })),
      vendors: (record.plan.vendors ?? []).map((vendor) => ({
        ...vendor,
        coverage_guests: vendor.coverage_guests ?? null,
        included_items: vendor.included_items ?? '',
        extra_charges: vendor.extra_charges ?? '',
      })),
    },
  } as EventRecord
}

/**
 * Retrieves persisted event dossiers from the browser's local storage.
 * Safely recovers from empty states, private browsing limitations, and corrupted JSON.
 *
 * @returns Array of validated EventRecord entities.
 */
export function readLocalEvents(): EventRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.map(normalizeEvent).filter((item): item is EventRecord => item !== null)
      : []
  } catch {
    return []
  }
}

/**
 * Persists an array of event dossiers to the browser's local storage.
 * Caps stored records to the most recent 50 entries to safeguard client storage quotas.
 *
 * @param events - Array of EventRecord entities to serialize and persist.
 */
export function writeLocalEvents(events: EventRecord[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(events.slice(0, 50)))
  } catch {
    // Private browsing or storage quota: the current session still remains usable.
  }
}
