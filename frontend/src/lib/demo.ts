import type { EventBrief, EventRecord, Plan, Recommendation, Risk } from '../types'
import { localDateString } from './format'

const budgetShares: Record<EventBrief['category'], [string, number, string][]> = {
  Wedding: [
    ['Food & drink', 28, 'Protect guest meals and dietary needs; compare like-for-like menus.'],
    ['Venue & setup', 23, 'Check capacity, access, inclusions and cancellation terms.'],
    ['Attire & ceremony', 12, 'Keep personal priorities; rent or reuse where it suits you.'],
    ['Decor & atmosphere', 10, 'Choose reusable, seasonal or DIY details before one-off decor.'],
    ['Photo & memories', 9, 'Choose coverage hours around the moments that matter most.'],
    ['Music & entertainment', 7, 'Match the format to the guest mix and venue constraints.'],
    ['Guest comfort & logistics', 5, 'Plan access, transport, water and clear wayfinding.'],
    ['Contingency reserve', 6, 'Hold this buffer for changes; it is not a vendor quote.'],
  ],
  Birthday: [
    ['Food, cake & drinks', 28, 'Protect food and dietary needs; keep the menu easy to serve.'],
    ['Venue & setup', 18, 'Check capacity, access, inclusions and cancellation terms.'],
    ['Activities & entertainment', 15, 'Choose one or two high-value activities over many extras.'],
    ['Decor & atmosphere', 12, 'Reuse a few theme details instead of buying a full set.'],
    ['Photo & memories', 7, 'Plan coverage around key moments rather than the full day.'],
    ['Guest comfort & logistics', 8, 'Include access, transport and practical setup needs.'],
    ['Contingency reserve', 12, 'Keep a flexible buffer for last-minute changes.'],
  ],
  'Community event': [
    ['Food & refreshments', 24, 'Plan portions transparently and label dietary options.'],
    ['Venue & permits', 18, 'Confirm capacity, access, permissions and terms directly.'],
    ['Program & sound', 14, 'Prioritize clear sound and the activities attendees value.'],
    ['Access & transport', 13, 'Make step-free access and travel information visible.'],
    ['Equipment & signage', 10, 'Borrow or share reusable equipment where possible.'],
    ['Volunteer coordination', 6, 'Keep roles and handoffs simple and clearly owned.'],
    ['Contingency reserve', 15, 'Retain a buffer for weather and operational changes.'],
  ],
}

const guestPressureAdjustments: Record<EventBrief['category'], Record<string, number>> = {
  Wedding: {
    'Food & drink': 6,
    'Venue & setup': 2,
    'Guest comfort & logistics': 2,
    'Attire & ceremony': -2,
    'Decor & atmosphere': -3,
    'Photo & memories': -2,
    'Music & entertainment': -1,
    'Contingency reserve': -2,
  },
  Birthday: {
    'Food, cake & drinks': 6,
    'Venue & setup': 3,
    'Guest comfort & logistics': 1,
    'Activities & entertainment': -3,
    'Decor & atmosphere': -3,
    'Photo & memories': -1,
    'Contingency reserve': -3,
  },
  'Community event': {
    'Food & refreshments': 5,
    'Venue & permits': 2,
    'Access & transport': 3,
    'Program & sound': -2,
    'Equipment & signage': -2,
    'Volunteer coordination': -2,
    'Contingency reserve': -4,
  },
}

function priorityMatch(category: string, priority: EventBrief['priority_order'][number]): boolean {
  const name = category.toLocaleLowerCase()
  if (priority === 'Food & catering') return name.startsWith('food') || name.startsWith('catering')
  if (priority === 'Venue') return name.startsWith('venue')
  if (priority === 'Photography') return name.includes('photo') || name.includes('memories')
  if (priority === 'Decor & styling') return name.includes('decor') || name.includes('styling')
  if (priority === 'Attire & ceremony') return name.includes('attire') || name.includes('ceremony')
  if (priority === 'Entertainment')
    return ['music', 'activity', 'program'].some((term) => name.includes(term))
  if (priority === 'Guest comfort & access')
    return ['guest', 'comfort', 'access'].some((term) => name.includes(term))
  if (priority === 'Logistics')
    return ['logistic', 'transport', 'access'].some((term) => name.includes(term))
  return name.startsWith('other')
}

/**
 * Generates a deterministic, labeled fallback celebration plan for offline or unconfigured environments.
 * Uses verified mathematical category ratios adjusted for guest scale, user priorities, and protected must-haves.
 *
 * @param event - The input event brief and parameters.
 * @returns A fully populated Plan structure labeled with mode='demo'.
 */
export function makeDemoPlan(event: EventBrief): Plan {
  const budget = Number(event.budget)
  const pressure = Math.max(0, Math.min(1, (event.guest_count - 80) / 270))
  const rawShares = budgetShares[event.category].map(([category, baseShare, baseRationale]) => {
    let share = baseShare + (guestPressureAdjustments[event.category][category] ?? 0) * pressure
    let rationale = baseRationale
    const rank = event.priority_order.findIndex((priority) => priorityMatch(category, priority))
    if (rank >= 0) {
      share *= [1.18, 1.1, 1.04][rank] ?? 1.04
      rationale += ' Boosted for a stated priority.'
    }
    if (event.must_haves.some((priority) => priorityMatch(category, priority))) {
      share *= 1.24
      rationale += ' Protected as a must-have.'
    }
    return { category, share, rationale }
  })
  const weightTotal = rawShares.reduce((sum, item) => sum + item.share, 0)
  const shares = rawShares.map((item) => ({ ...item, share: (item.share * 100) / weightTotal }))
  let allocated = 0
  const allocations = shares.map(({ category, share, rationale }, index) => {
    const planned =
      index === shares.length - 1
        ? Number((budget - allocated).toFixed(2))
        : Number(((budget * share) / 100).toFixed(2))
    allocated += planned
    return { category, planned, actual: 0, rationale }
  })
  const date = (daysBefore: number) => {
    const [year, month, day] = event.event_date.split('-').map(Number)
    const due = new Date(year, month - 1, day)
    due.setDate(due.getDate() - daysBefore)
    const shifted = localDateString(due)
    const today = localDateString(new Date())
    return shifted < today ? today : shifted
  }
  const taskSeeds = [
    [
      'priorities',
      'Set your planning priorities',
      'Confirm the three details that matter most to your guests.',
      90,
      'High',
      [],
    ],
    [
      'venue',
      'Shortlist a venue',
      'Check capacity, access, weather plan and booking terms.',
      60,
      'High',
      ['priorities'],
    ],
    [
      'menu',
      'Shape the menu',
      'Collect dietary needs and request comparable estimates.',
      35,
      'High',
      ['venue'],
    ],
    [
      'look',
      'Confirm event look & feel',
      'Choose a focused palette and reusable decor direction.',
      28,
      'Medium',
      ['venue'],
    ],
    [
      'run_of_show',
      'Review the run of show',
      'Share arrival, setup and key moments with helpers.',
      14,
      'Medium',
      ['menu', 'look'],
    ],
    [
      'logistics',
      'Final guest and logistics check',
      'Reconfirm headcount, access and transport details.',
      7,
      'High',
      ['venue', 'menu'],
    ],
    [
      'essentials',
      'Pack the day-of essentials',
      'Bring contacts, confirmations and a small backup kit.',
      1,
      'Low',
      ['run_of_show', 'logistics'],
    ],
  ] as const
  const taskIds = new Map(taskSeeds.map(([key]) => [key, crypto.randomUUID()]))
  const tasks = taskSeeds
    .map(([key, title, description, offset, priority, dependencies]) => ({
      id: taskIds.get(key)!,
      title,
      description,
      due_date: date(offset),
      priority,
      status: 'To do' as const,
      depends_on: dependencies.map((dependency) => taskIds.get(dependency)!),
    }))
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
  const vendorSeeds: Record<EventBrief['category'], [string, string][]> = {
    Wedding: [
      ['Venue', 'Ceremony & reception space'],
      ['Catering', 'Food and beverage service'],
      ['Decoration', 'Flowers and event styling'],
      ['Photography', 'Photo and video coverage'],
      ['Music & entertainment', 'Sound, music or host'],
      ['Transportation', 'Guest mobility'],
    ],
    Birthday: [
      ['Venue', 'Party space'],
      ['Catering', 'Food, drinks and cake'],
      ['Decoration', 'Theme and table styling'],
      ['Photography', 'Photo coverage'],
      ['Music & entertainment', 'Music and activities'],
      ['Other', 'Invitations and party supplies'],
    ],
    'Community event': [
      ['Venue', 'Community space'],
      ['Catering', 'Food and refreshments'],
      ['Decoration', 'Wayfinding and shared spaces'],
      ['Music & entertainment', 'Program and sound'],
      ['Transportation', 'Access and transport'],
      ['Other', 'Permits, volunteers or equipment'],
    ],
  }
  const vendors = vendorSeeds[event.category].map(([category, service]) => ({
    id: crypto.randomUUID(),
    category,
    service,
    name: '',
    contact: '',
    estimate: null,
    coverage_guests: null,
    included_items: '',
    extra_charges: '',
    status: 'To source' as const,
    notes: 'Example checklist item — add your own provider details.',
  }))
  const perGuest = Math.round(budget / event.guest_count)
  const protectedItems = event.must_haves.length
    ? event.must_haves.slice(0, 2)
    : event.priority_order.slice(0, 1)
  const protectText = protectedItems.join(', ') || 'guest comfort and access'
  const flexibleItem = [...event.priority_order]
    .reverse()
    .find((item) => !event.must_haves.includes(item))
  const ageContext =
    event.children_count || event.older_adult_count
      ? `Plan seating and activities for ${event.children_count} children and ${event.older_adult_count} older guests. `
      : ''
  const venueContext = event.venue_constraints
    ? `Confirm venue limits: ${event.venue_constraints.slice(0, 70)}. `
    : ''
  const recommendations: Recommendation[] = [
    {
      category: 'Guest experience',
      title: 'A welcome with a local touch',
      description: `Set a welcome moment inspired by ${event.location} for ${event.guest_count.toLocaleString()} guests. ${ageContext}${venueContext}Check access and flow with the venue.`,
    },
    {
      category: 'Budget trade-off',
      title: 'Protect the essentials; flex the extras',
      description:
        `For ${event.guest_count.toLocaleString()} guests, ${event.currency} ${budget.toLocaleString()} is about ${event.currency} ${perGuest.toLocaleString()} per guest. Protect ${protectText}; if needed, review ${flexibleItem || 'optional styling or menu format'} first. ${ageContext}Planning guide, not a local quote.`.slice(
          0,
          320,
        ),
    },
    {
      category: 'Food & drink',
      title: 'Make every plate feel considered',
      description:
        'Ask caterers for clearly labelled dietary options and one shared menu tasting before confirming quantities.',
    },
    {
      category: 'Atmosphere',
      title: 'A light-touch colour story',
      description: `Build around ${event.theme_preference || 'warm neutrals and seasonal colour'} with a few repeatable details instead of buying one-off decorations.`,
    },
    {
      category: 'Personal touches',
      title: 'Carry one detail through the day',
      description: event.preferences
        ? `Let this preference guide one or two details: ${event.preferences.slice(0, 120)}. Keep the rest simple so the personal touch feels intentional.`
        : 'Choose one meaningful color, phrase or tradition and repeat it in a few thoughtful details.',
    },
  ]
  const focusedIdeas: Partial<Record<EventBrief['planner_focus'], Recommendation>> = {
    budget: {
      category: 'Budget focus',
      title: 'Start with what matters most',
      description:
        'Keep your first-ranked priority and must-haves visible. Compare written, like-for-like estimates before adjusting any category; this planner does not predict guaranteed savings.',
    },
    experience: {
      category: 'Theme & guest experience',
      title: 'Make the atmosphere feel personal',
      description: `Use ${event.theme_preference || 'one meaningful theme detail'} as a repeatable thread, and plan comfort for the guest mix and access needs you shared.`,
    },
    vendors: {
      category: 'Vendor quote focus',
      title: 'Ask every provider for the same scope',
      description: `Request itemized inclusions, extra charges and coverage for ${event.guest_count.toLocaleString()} guests. Compare only details you receive and verify directly; no providers or prices are supplied here.`,
    },
    timeline: {
      category: 'Timeline & logistics',
      title: 'Protect the critical path',
      description:
        'Confirm venue access, setup windows and provider lead times early. If a prerequisite slips, preview dependent-date changes before applying them.',
    },
  }
  const focusIdea = focusedIdeas[event.planner_focus]
  if (focusIdea) recommendations.unshift(focusIdea)
  if (event.accessibility_needs)
    recommendations.push({
      category: 'Accessibility',
      title: 'Comfort is part of the celebration',
      description: `Plan for the stated access needs: ${event.accessibility_needs.slice(0, 110)}. Confirm step-free routes, seating and clear signage directly with the venue.`,
    })
  if (event.dietary_needs)
    recommendations.push({
      category: 'Menu',
      title: 'Dietary needs, handled early',
      description: `Share these requirements with the food team during the first menu conversation: ${event.dietary_needs.slice(0, 110)}. Confirm allergen handling directly.`,
    })
  const risks: Risk[] = [
    {
      title: 'Weather or venue disruption',
      mitigation:
        'If any part is outdoors, identify an indoor or covered alternative and the decision deadline before booking.',
    },
    {
      title: 'Small costs adding up',
      mitigation:
        'Keep the contingency allocation untouched until a real quote is recorded; compare actuals with estimates weekly.',
    },
    {
      title: 'Guest comfort and access',
      mitigation:
        'Confirm access routes, seating, dietary handling and transport details with the venue and relevant providers in writing.',
    },
  ]
  const theme =
    event.theme_preference ||
    (
      {
        Wedding: 'Garden glow, gathered with intention',
        Birthday: 'A little more joy, a lot more you',
        'Community event': 'Neighbourhood, in full bloom',
      } as const
    )[event.category]
  return {
    overview: `A thoughtful ${event.category.toLowerCase()} for ${event.guest_count.toLocaleString()} guests in ${event.location}, planned for ${event.event_date}.`,
    theme,
    budget: { total: budget, allocations },
    tasks,
    vendors,
    recommendations,
    risks,
    assumptions: [
      'All cost allocations are planning estimates, not quotes or verified local prices.',
      'No vendor names, availability or contact details have been supplied or verified.',
      'The event date, budget, guest count and location remain exactly as entered.',
    ],
    mode: 'demo',
    mode_note: 'Demo plan · not live AI',
  }
}

/**
 * Creates an in-memory or locally-persisted EventRecord wrapper with a unique local UUID and timestamps.
 *
 * @param event - The input event brief.
 * @param plan - The associated celebration plan.
 * @returns EventRecord instance ready for local storage or client state.
 */
export function makeLocalRecord(event: EventBrief, plan: Plan): EventRecord {
  const now = new Date().toISOString()
  return { ...event, plan, id: `local-${crypto.randomUUID()}`, created_at: now, updated_at: now }
}

/**
 * Returns a rich, culturally authentic sample event brief for an Indian wedding celebration in Nagpur.
 * Used for instant live preview and testing without manual form completion.
 *
 * @returns Fully populated sample EventBrief.
 */
export function sampleEvent(): EventBrief {
  const eventDate = new Date()
  eventDate.setDate(eventDate.getDate() + 120)
  return {
    name: 'Ananya & Rohan’s wedding',
    category: 'Wedding',
    event_date: localDateString(eventDate),
    location: 'Nagpur, Maharashtra',
    guest_count: 180,
    budget: 850000,
    currency: 'INR',
    theme_preference: 'A sunset garden celebration with marigold and ivory',
    preferences: 'Warm, relaxed, locally rooted, with a little modern detail.',
    dietary_needs: 'Vegetarian menu options; clear allergen labels.',
    accessibility_needs: 'Step-free access and a quiet seating area for older guests.',
    priority_order: ['Food & catering', 'Photography', 'Guest comfort & access'],
    must_haves: ['Food & catering', 'Guest comfort & access'],
    children_count: 12,
    older_adult_count: 24,
    venue_constraints: 'Outdoor garden, noise curfew at 10 pm, step-free route required.',
    planner_focus: 'all_round',
  }
}
