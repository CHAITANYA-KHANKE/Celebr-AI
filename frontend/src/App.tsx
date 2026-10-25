import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Sparkles, X } from 'lucide-react'
import { LandingPage } from './components/LandingPage'
import { EventWizard } from './components/EventWizard'
import { Workspace } from './components/Workspace'
import { api } from './lib/api'
import { makeDemoPlan, makeLocalRecord, sampleEvent } from './lib/demo'
import { readLocalEvents, writeLocalEvents } from './lib/storage'
import { mergeAdaptedPlan } from './lib/adaptation'
import type { EventBrief, EventRecord } from './types'

/**
 * Root application component orchestrating client view transitions, event management,
 * offline synchronization with localStorage, and seamless GenAI/deterministic plan generation.
 *
 * @returns Top-level application layout with error boundary and accessibility regions.
 */
export default function App() {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [current, setCurrent] = useState<EventRecord | null>(null)
  const [page, setPage] = useState<'landing' | 'workspace'>('landing')
  const [wizard, setWizard] = useState<'create' | 'edit' | null>(null)
  const [wizardInitial, setWizardInitial] = useState<Partial<EventBrief> | undefined>()
  const [isSaving, setIsSaving] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | undefined>(undefined)
  const persistSequence = useRef(0)

  const notify = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 3600)
  }, [])

  useEffect(() => {
    let mounted = true
    api
      .listEvents()
      .then((items) => {
        if (!mounted) return
        const localOnly = readLocalEvents().filter((item) => item.id.startsWith('local-'))
        const merged = [...items, ...localOnly].slice(0, 50)
        setEvents(merged)
        writeLocalEvents(merged)
        setIsOffline(false)
      })
      .catch(() => {
        if (!mounted) return
        const local = readLocalEvents()
        setEvents(local)
        setIsOffline(true)
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })
    return () => {
      mounted = false
      window.clearTimeout(toastTimer.current)
    }
  }, [])

  const replaceSaved = (next: EventRecord) => {
    setCurrent(next)
    setEvents((previous) => {
      const updated = [next, ...previous.filter((item) => item.id !== next.id)].slice(0, 50)
      writeLocalEvents(updated)
      return updated
    })
  }

  const saveChanges = async (next: EventRecord, persist = true) => {
    setCurrent(next)
    setEvents((previous) => {
      const updated = [next, ...previous.filter((item) => item.id !== next.id)].slice(0, 50)
      writeLocalEvents(updated)
      return updated
    })
    if (!persist) return
    if (isOffline || next.id.startsWith('local-')) {
      setIsOffline(true)
      return
    }
    const sequence = ++persistSequence.current
    setIsSaving(true)
    try {
      const saved = await api.updateEvent(next)
      if (sequence === persistSequence.current) replaceSaved(saved)
      setIsOffline(false)
    } catch {
      setIsOffline(true)
      notify('Saved on this device. The database is temporarily unavailable.')
    } finally {
      if (sequence === persistSequence.current) setIsSaving(false)
    }
  }

  const makePlan = async (brief: EventBrief, shouldOpen = true) => {
    let plan
    try {
      plan = await api.generate(brief)
    } catch {
      plan = makeDemoPlan(brief)
      notify('Using a clearly labeled demo plan because the planning service is unavailable.')
    }
    let record: EventRecord
    try {
      record = await api.createEvent(brief, plan)
      setIsOffline(false)
    } catch {
      record = makeLocalRecord(brief, plan)
      setIsOffline(true)
      notify('Plan saved on this device. Start the API to enable database persistence.')
    }
    replaceSaved(record)
    setWizard(null)
    setWizardInitial(undefined)
    if (shouldOpen) setPage('workspace')
  }

  const openNew = () => {
    setWizardInitial(undefined)
    setWizard('create')
  }

  const openEdit = () => {
    if (!current) return
    setWizardInitial(current)
    setWizard('edit')
  }

  const updateEventDetails = async (brief: EventBrief) => {
    if (!current) return
    let generatedPlan
    let usedFallback = false
    try {
      generatedPlan = await api.generate(brief)
    } catch {
      generatedPlan = makeDemoPlan(brief)
      usedFallback = true
    }
    const next: EventRecord = {
      ...current,
      ...brief,
      plan: mergeAdaptedPlan(current.plan, generatedPlan, brief, current.event_date),
      updated_at: new Date().toISOString(),
    }
    setWizard(null)
    await saveChanges(next)
    const demoMode = usedFallback || generatedPlan.mode === 'demo'
    notify(
      demoMode
        ? 'Plan adapted in labeled demo mode. Budget shares and milestones were refreshed; your actuals and vendor quotes were kept.'
        : 'AI-assisted plan adapted. Budget shares and milestones were refreshed; your actuals and vendor quotes were kept.',
    )
  }

  const localExport = (record: EventRecord, format: 'csv' | 'json') => {
    let content: string
    let mime: string
    let extension: string
    if (format === 'json') {
      content = JSON.stringify(record, null, 2)
      mime = 'application/json'
      extension = 'json'
    } else {
      const rows: string[][] = [
        ['section', 'category', 'title', 'date_or_status', 'planned_or_estimated', 'actual', 'notes'],
        [
          'Event',
          record.category,
          record.name,
          record.event_date,
          `${record.currency} ${record.budget}`,
          '',
          [
            record.location,
            `Planner focus: ${record.planner_focus.replace('_', ' ')}`,
            record.priority_order.length ? `Priorities: ${record.priority_order.join(', ')}` : '',
            record.must_haves.length ? `Must-haves: ${record.must_haves.join(', ')}` : '',
            `Children: ${record.children_count}; older adults: ${record.older_adult_count}`,
            record.venue_constraints ? `Venue constraints: ${record.venue_constraints}` : '',
          ]
            .filter(Boolean)
            .join(' · '),
        ],
      ]
      rows.push(['Plan', 'Theme', record.plan.theme, '', '', '', record.plan.overview])
      record.plan.recommendations.forEach((idea) =>
        rows.push(['Idea', idea.category, idea.title, '', '', '', idea.description]),
      )
      record.plan.risks.forEach((risk) =>
        rows.push(['Contingency', 'Risk', risk.title, '', '', '', risk.mitigation]),
      )
      record.plan.budget.allocations.forEach((item) =>
        rows.push([
          'Budget',
          item.category,
          '',
          '',
          String(item.planned),
          String(item.actual),
          item.rationale,
        ]),
      )
      record.plan.tasks.forEach((task) => {
        const prerequisites = (task.depends_on ?? [])
          .map((id) => record.plan.tasks.find((candidate) => candidate.id === id)?.title)
          .filter(Boolean)
          .join(', ')
        rows.push([
          'Timeline',
          'Task',
          task.title,
          `${task.due_date} · ${task.status}`,
          '',
          '',
          [task.description, prerequisites ? `Depends on: ${prerequisites}` : '']
            .filter(Boolean)
            .join(' · '),
        ])
      })
      record.plan.vendors.forEach((vendor) =>
        rows.push([
          'Vendor',
          vendor.category,
          vendor.name || vendor.service,
          vendor.status,
          String(vendor.estimate ?? ''),
          '',
          [
            vendor.contact,
            vendor.coverage_guests ? `Coverage: ${vendor.coverage_guests} guests` : '',
            vendor.included_items ? `Includes: ${vendor.included_items}` : '',
            vendor.extra_charges ? `Extra charges: ${vendor.extra_charges}` : '',
            vendor.notes,
          ]
            .filter(Boolean)
            .join(' · '),
        ]),
      )
      const escape = (value: string) => {
        const protectedValue = /^\s*[=+@-]/.test(value) ? `'${value}` : value
        return `"${protectedValue.replace(/\"/g, '\"\"')}"`
      }
      content = `\ufeff${rows.map((row) => row.map(escape).join(',')).join('\r\n')}`
      mime = 'text/csv;charset=utf-8'
      extension = 'csv'
    }
    const blob = new Blob([content], { type: mime })
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const filename =
      record.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'celebrai-event'
    anchor.href = href
    anchor.download = `${filename}.${extension}`
    anchor.click()
    URL.revokeObjectURL(href)
  }

  const exportEvent = async (format: 'csv' | 'json') => {
    if (!current) return
    try {
      if (!isOffline && !current.id.startsWith('local-')) {
        const blob = await api.exportFile(current.id, format)
        const href = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = href
        anchor.download = `${
          current.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 40) || 'celebrai-event'
        }.${format}`
        anchor.click()
        URL.revokeObjectURL(href)
      } else localExport(current, format)
      notify(`Your ${format.toUpperCase()} plan is ready to download.`)
    } catch {
      localExport(current, format)
      notify('Downloaded the latest saved plan from this device.')
    }
  }

  const createSample = () => {
    void makePlan(sampleEvent())
  }

  return (
    <>
      {page === 'landing' || !current ? (
        <LandingPage
          onCreate={openNew}
          onSample={createSample}
          savedCount={events.length}
          onBrowse={() => {
            if (events.length) {
              setCurrent(events[0])
              setPage('workspace')
            } else notify('Your first plan is just around the corner. Start with the good part.')
          }}
        />
      ) : (
        <Workspace
          event={current}
          events={events}
          isSaving={isSaving}
          onChange={(next, persist) => void saveChanges(next, persist)}
          onEdit={openEdit}
          onNew={openNew}
          onSelectEvent={(record) => {
            setCurrent(record)
            setPage('workspace')
          }}
          onHome={() => setPage('landing')}
          onExport={exportEvent}
          onToast={notify}
        />
      )}

      {isLoading && (
        <div className="loading-pill" role="status">
          <span className="spinner" /> Finding your saved plans…
        </div>
      )}
      {isOffline && !isLoading && (
        <div className="offline-pill" role="status">
          <span /> Local save mode <span className="offline-divider">·</span> database unavailable
        </div>
      )}
      {wizard && (
        <EventWizard
          initial={wizardInitial}
          editing={wizard === 'edit' ? (current ?? undefined) : undefined}
          onClose={() => {
            setWizard(null)
            setWizardInitial(undefined)
          }}
          onGenerate={async (brief) => makePlan(brief)}
          onUpdate={updateEventDetails}
        />
      )}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span className="toast-mark">
            <Sparkles size={15} />
          </span>
          {toast}
          <button onClick={() => setToast('')} aria-label="Dismiss message">
            <X size={15} />
          </button>
        </div>
      )}
      {page === 'workspace' && !current && (
        <div className="fatal-empty">
          <AlertCircle size={24} />
          <p>This event is no longer available.</p>
          <button className="button button-dark" onClick={() => setPage('landing')}>
            Return home
          </button>
        </div>
      )}
    </>
  )
}
