export type EventCategory = 'Wedding' | 'Birthday' | 'Community event'
export type Priority = 'High' | 'Medium' | 'Low'
export type TaskStatus = 'To do' | 'In progress' | 'Done'
export type BookingStatus = 'To source' | 'Contacted' | 'Quoted' | 'Booked' | 'Confirmed'
export type PlannerMode = 'ai' | 'demo'
export const planningPriorityOptions = [
  'Food & catering',
  'Venue',
  'Photography',
  'Decor & styling',
  'Attire & ceremony',
  'Entertainment',
  'Guest comfort & access',
  'Logistics',
  'Other',
] as const
export type PlanningPriority = (typeof planningPriorityOptions)[number]

export const plannerFocusOptions = [
  {
    value: 'all_round',
    title: 'All-round planner',
    description: 'A balanced plan across budget, guests and timeline.',
  },
  {
    value: 'budget',
    title: 'Budget coach',
    description: 'Priorities, allocations and cost trade-offs first.',
  },
  {
    value: 'experience',
    title: 'Theme & guest experience',
    description: 'Personal touches, atmosphere and guest comfort.',
  },
  {
    value: 'vendors',
    title: 'Vendor quote coach',
    description: 'Comparable scope, inclusions and questions to ask.',
  },
  {
    value: 'timeline',
    title: 'Timeline & logistics',
    description: 'Dependencies, access and practical sequencing.',
  },
] as const
export type PlannerFocus = (typeof plannerFocusOptions)[number]['value']

export interface EventBrief {
  name: string
  category: EventCategory
  event_date: string
  location: string
  guest_count: number
  budget: number
  currency: string
  theme_preference: string
  preferences: string
  dietary_needs: string
  accessibility_needs: string
  priority_order: PlanningPriority[]
  must_haves: PlanningPriority[]
  children_count: number
  older_adult_count: number
  venue_constraints: string
  planner_focus: PlannerFocus
}

export interface Allocation {
  category: string
  planned: number
  actual: number
  rationale: string
}

export interface PlanTask {
  id: string
  title: string
  description: string
  due_date: string
  priority: Priority
  status: TaskStatus
  depends_on: string[]
}

export interface VendorItem {
  id: string
  category: string
  service: string
  name: string
  contact: string
  estimate: number | null
  coverage_guests: number | null
  included_items: string
  extra_charges: string
  status: BookingStatus
  notes: string
}

export interface Recommendation {
  category: string
  title: string
  description: string
}

export interface Risk {
  title: string
  mitigation: string
}

export interface Plan {
  overview: string
  theme: string
  budget: { total: number; allocations: Allocation[] }
  tasks: PlanTask[]
  vendors: VendorItem[]
  recommendations: Recommendation[]
  risks: Risk[]
  assumptions: string[]
  mode: PlannerMode
  mode_note: string
}

export interface EventRecord extends EventBrief {
  id: string
  plan: Plan
  created_at: string
  updated_at: string
}

export type WorkspaceTab = 'Overview' | 'Budget' | 'Timeline' | 'Vendors' | 'Idea studio'
