import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Download,
  Flower2,
  Heart,
  Home,
  Lightbulb,
  ListChecks,
  MapPin,
  Menu,
  MoreHorizontal,
  Plus,
  Settings2,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react'
import {
  plannerFocusOptions,
  type BookingStatus,
  EventRecord,
  PlanTask,
  Priority,
  TaskStatus,
  VendorItem,
  WorkspaceTab,
} from '../types'
import { budgetSummary } from '../lib/calculations'
import { previewTaskDelay } from '../lib/task-shifts'
import { proposePriorityCuts, projectedCost, simulateAllocationChange } from '../lib/tradeoffs'
import { daysUntil, formatDate, formatMoney, initials, localDateString } from '../lib/format'

interface WorkspaceProps {
  event: EventRecord
  events: EventRecord[]
  isSaving: boolean
  onChange: (event: EventRecord, persist?: boolean) => void
  onEdit: () => void
  onNew: () => void
  onSelectEvent: (event: EventRecord) => void
  onHome: () => void
  onExport: (format: 'csv' | 'json') => Promise<void>
  onToast: (message: string) => void
}

const navigation: { label: WorkspaceTab | 'Settings'; icon: typeof Home }[] = [
  { label: 'Overview', icon: Home },
  { label: 'Budget', icon: Wallet },
  { label: 'Timeline', icon: ListChecks },
  { label: 'Vendors', icon: Flower2 },
  { label: 'Idea studio', icon: Lightbulb },
  { label: 'Settings', icon: Settings2 },
]

const taskStatuses: TaskStatus[] = ['To do', 'In progress', 'Done']
const priorities: Priority[] = ['High', 'Medium', 'Low']
const bookingStatuses: BookingStatus[] = ['To source', 'Contacted', 'Quoted', 'Booked', 'Confirmed']
const vendorCategories = [
  'Catering',
  'Decoration',
  'Photography',
  'Venue',
  'Music & entertainment',
  'Transportation',
  'Other',
]
const today = localDateString(new Date())
const parseCoveredGuests = (value: string): number | null => {
  if (value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(100_000, Math.max(1, Math.round(parsed))) : null
}

export function Workspace({
  event,
  events,
  isSaving,
  onChange,
  onEdit,
  onNew,
  onSelectEvent,
  onHome,
  onExport,
  onToast,
}: WorkspaceProps) {
  const [tab, setTab] = useState<WorkspaceTab | 'Settings'>('Overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const summary = budgetSummary(event.budget, event.plan.budget.allocations)
  const doneCount = event.plan.tasks.filter((task) => task.status === 'Done').length
  const progress = event.plan.tasks.length ? Math.round((doneCount / event.plan.tasks.length) * 100) : 0
  const toSourceCount = event.plan.vendors.filter(
    (vendor) => vendor.status !== 'Booked' && vendor.status !== 'Confirmed',
  ).length

  const changePlan = (plan: EventRecord['plan'], persist = true) => onChange({ ...event, plan }, persist)

  const pageTitle: Record<string, string> = {
    Overview: 'The lovely little overview',
    Budget: 'Make every rupee feel considered',
    Timeline: 'One thing at a time',
    Vendors: 'Your people behind the scenes',
    'Idea studio': 'A little more you',
    Settings: 'The details, in your hands',
  }

  const exportClick = async (format: 'csv' | 'json') => {
    await onExport(format)
    setMenuOpen(false)
  }

  return (
    <div className="workspace-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <a
            className="brand"
            href="#workspace"
            onClick={(e) => {
              e.preventDefault()
              onHome()
            }}
          >
            <span className="brand-mark">
              <Sparkles size={17} />
            </span>
            <span className="brand-text">
              Celebr<span className="brand-ai">AI</span>
            </span>
          </a>
          <button
            className="mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="sidebar-label">YOUR WORKSPACE</div>
        <button
          className="event-switcher"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
        >
          <span className="switcher-mark">{initials(event.name)}</span>
          <span className="switcher-copy">
            <strong>{event.name}</strong>
            <small>{event.category}</small>
          </span>
          <ChevronDown size={15} />
        </button>
        {menuOpen && (
          <section className="event-menu" aria-label="Saved event plans">
            {events.map((saved) => (
              <button
                key={saved.id}
                onClick={() => {
                  onSelectEvent(saved)
                  setMenuOpen(false)
                  setMobileNav(false)
                }}
              >
                <span className="switcher-mark small-mark">{initials(saved.name)}</span>
                <span>
                  <strong>{saved.name}</strong>
                  <small>
                    {formatDate(saved.event_date, { day: 'numeric', month: 'short' })} · {saved.location}
                  </small>
                </span>
              </button>
            ))}
            {events.length === 0 && (
              <p className="event-menu-empty">Your saved plans will appear here.</p>
            )}
            <button
              className="menu-new"
              onClick={() => {
                setMenuOpen(false)
                onNew()
              }}
            >
              <Plus size={14} /> Start another plan
            </button>
          </section>
        )}
        <nav className="side-nav" aria-label="Event sections">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => {
                setTab(label)
                setMobileNav(false)
              }}
              className={`side-link ${tab === label ? 'active' : ''}`}
              aria-current={tab === label ? 'page' : undefined}
            >
              <Icon size={17} />
              <span>{label}</span>
              {label === 'Timeline' && (
                <small>{event.plan.tasks.filter((task) => task.status !== 'Done').length}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-flower" aria-hidden="true">
            ✳
          </div>
          <p>
            Thoughtful plans
            <br />
            for meaningful moments.
          </p>
          <button className="side-home" onClick={onHome}>
            <ArrowLeft size={14} /> Back to Celebrai
          </button>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobileNav(true)}
          >
            <Menu size={19} />
          </button>
          <div className="breadcrumbs">
            <button onClick={onHome}>Celebrai</button>
            <span>/</span>
            <strong>{event.category}</strong>
          </div>
          <div className="topbar-actions">
            <span className={`save-indicator ${isSaving ? 'saving' : ''}`}>
              <i />
              {isSaving ? 'Saving changes' : 'All changes saved'}
            </span>
            <button
              className="topbar-icon"
              aria-label="Help and planning notes"
              onClick={() =>
                onToast(
                  'Your plan is saved as you go. Estimates are planning guides, not vendor quotes.',
                )
              }
            >
              <CircleHelp size={18} />
            </button>
            <span className="user-avatar" aria-label="Local planning workspace">
              {initials(event.name)}
            </span>
          </div>
        </header>
        <main className="workspace-content" id="workspace-content">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">
                {formatDate(event.event_date, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                <i>·</i> {event.location}
              </span>
              <h1>{pageTitle[tab]}</h1>
            </div>
            <div className="heading-actions">
              <button className="button button-outline" onClick={onEdit}>
                Edit event
              </button>
              <div className="export-wrap">
                <button className="button button-coral" onClick={() => void exportClick('csv')}>
                  <Download size={15} /> Export plan
                </button>
                <button
                  className="export-chevron"
                  aria-label="Export options"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <ChevronDown size={15} />
                </button>
                {menuOpen && (
                  <div className="export-menu">
                    <button onClick={() => void exportClick('csv')}>Download CSV</button>
                    <button onClick={() => void exportClick('json')}>Download JSON</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {tab === 'Overview' && (
            <OverviewTab
              event={event}
              summary={summary}
              progress={progress}
              toSourceCount={toSourceCount}
              onGo={setTab}
            />
          )}
          {tab === 'Budget' && (
            <BudgetTab event={event} summary={summary} onChange={changePlan} onToast={onToast} />
          )}
          {tab === 'Timeline' && <TimelineTab event={event} onChange={changePlan} onToast={onToast} />}
          {tab === 'Vendors' && <VendorsTab event={event} onChange={changePlan} onToast={onToast} />}
          {tab === 'Idea studio' && <IdeasTab event={event} />}
          {tab === 'Settings' && (
            <SettingsTab event={event} onEdit={onEdit} onNew={onNew} onExport={exportClick} />
          )}
          <footer className="workspace-footer">
            <span>
              <Sparkles size={13} /> Made for the moments that matter
            </span>
            <span>
              {event.plan.mode === 'demo'
                ? 'Demo mode · not live AI'
                : 'AI-assisted · verify suggestions'}
            </span>
          </footer>
        </main>
      </div>
      {mobileNav && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
    </div>
  )
}

function OverviewTab({
  event,
  summary,
  progress,
  toSourceCount,
  onGo,
}: {
  event: EventRecord
  summary: ReturnType<typeof budgetSummary>
  progress: number
  toSourceCount: number
  onGo: (tab: WorkspaceTab | 'Settings') => void
}) {
  const nextTasks = [...event.plan.tasks]
    .filter((task) => task.status !== 'Done')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 3)
  const featureIdea = event.plan.recommendations[0]
  const days = daysUntil(event.event_date)
  const percent = Math.max(0, Math.min(100, summary.utilization))
  return (
    <div className="tab-content overview-content">
      <section className="event-hero-card">
        <div className="event-hero-image" />
        <div className="event-hero-tint" />
        <div className="event-hero-copy">
          <span className="hero-card-label">
            <i /> YOUR CELEBRATION, TAKING SHAPE
          </span>
          <h2>{event.name}</h2>
          <p>{event.plan.theme}</p>
          <span className="planner-focus-chip">
            <Sparkles size={12} />
            AI focus ·{' '}
            {plannerFocusOptions.find((option) => option.value === event.planner_focus)?.title ??
              'All-round planner'}
          </span>
          <div className="event-hero-meta">
            <span>
              <CalendarDays size={15} />{' '}
              {formatDate(event.event_date, { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span>
              <MapPin size={15} /> {event.location}
            </span>
            <span>
              <Heart size={15} /> {event.guest_count.toLocaleString()} guests
            </span>
          </div>
        </div>
        <div className="countdown-chip">
          <span>THE BIG DAY</span>
          <strong>{days}</strong>
          <small>{days === 1 ? 'day to go' : 'days to go'}</small>
        </div>
        <div className="hero-card-foot">
          <span>
            <Sparkles size={14} /> {event.plan.mode_note}
          </span>
          <span>Theme idea · always editable</span>
        </div>
      </section>
      <div className="stat-grid">
        <article className="stat-card">
          <div className="stat-card-top">
            <span>Budget remaining</span>
            <span className="stat-icon coral">
              <Wallet size={16} />
            </span>
          </div>
          <strong>{formatMoney(summary.remaining, event.currency)}</strong>
          <small>
            {summary.overspent
              ? 'Over budget · review actual spend'
              : `of ${formatMoney(event.budget, event.currency)} total budget`}
          </small>
          <div className="stat-progress">
            <i className={summary.overspent ? 'over' : ''} style={{ width: `${percent}%` }} />
          </div>
          <span className="stat-foot">{summary.utilization.toFixed(0)}% spent so far</span>
        </article>
        <article className="stat-card">
          <div className="stat-card-top">
            <span>Planning progress</span>
            <span className="stat-icon green">
              <Check size={16} />
            </span>
          </div>
          <strong>
            {progress}
            <small className="inline-percent">%</small>
          </strong>
          <small>
            {event.plan.tasks.filter((task) => task.status === 'Done').length} of{' '}
            {event.plan.tasks.length} little things done
          </small>
          <div className="stat-progress green-bar">
            <i style={{ width: `${progress}%` }} />
          </div>
          <span className="stat-foot">You're making lovely progress</span>
        </article>
        <article className="stat-card">
          <div className="stat-card-top">
            <span>Vendor checklist</span>
            <span className="stat-icon lavender">
              <Flower2 size={16} />
            </span>
          </div>
          <strong>
            {event.plan.vendors.length - toSourceCount}
            <small className="inline-of"> / {event.plan.vendors.length}</small>
          </strong>
          <small>booked or confirmed</small>
          <button className="stat-inline-link" onClick={() => onGo('Vendors')}>
            View checklist <ArrowRight size={13} />
          </button>
        </article>
        <article className="stat-card">
          <div className="stat-card-top">
            <span>Coming up</span>
            <span className="stat-icon blue">
              <Clock3 size={16} />
            </span>
          </div>
          <strong>
            {nextTasks.length
              ? formatDate(nextTasks[0].due_date, { day: 'numeric', month: 'short' })
              : '—'}
          </strong>
          <small>{nextTasks[0]?.title ?? 'Everything is up to date'}</small>
          <button className="stat-inline-link" onClick={() => onGo('Timeline')}>
            See timeline <ArrowRight size={13} />
          </button>
        </article>
      </div>

      <div className="overview-grid">
        <section className="surface-card next-up-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">YOUR NEXT LITTLE STEPS</span>
              <h3>On the horizon</h3>
            </div>
            <button
              className="round-arrow"
              aria-label="See full timeline"
              onClick={() => onGo('Timeline')}
            >
              <ArrowRight size={16} />
            </button>
          </div>
          {nextTasks.length ? (
            <div className="next-task-list">
              {nextTasks.map((task, i) => (
                <div className="next-task" key={task.id}>
                  <span className={`task-dot dot-${task.priority.toLowerCase()}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="next-task-copy">
                    <strong>{task.title}</strong>
                    <small>{task.description}</small>
                  </span>
                  <span className="next-task-date">
                    {formatDate(task.due_date, { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-note">Your checklist is clear. Add a task whenever you're ready.</p>
          )}
          <button className="text-link" onClick={() => onGo('Timeline')}>
            Open your timeline <ArrowRight size={14} />
          </button>
        </section>
        <section className="surface-card idea-preview">
          <div className="idea-preview-glow" />
          <div className="card-heading">
            <div>
              <span className="eyebrow">A NOTE FROM YOUR IDEA STUDIO</span>
              <h3>Make it feel like you</h3>
            </div>
            <span className="idea-spark">
              <Sparkles size={17} />
            </span>
          </div>
          {featureIdea ? (
            <>
              <span className="idea-category">{featureIdea.category}</span>
              <h4>{featureIdea.title}</h4>
              <p>{featureIdea.description}</p>
            </>
          ) : (
            <p>Your tailored ideas will be waiting here.</p>
          )}
          <button className="text-link" onClick={() => onGo('Idea studio')}>
            Explore all ideas <ArrowRight size={14} />
          </button>
        </section>
      </div>
      <div className="mode-footnote">
        <span className="mode-bullet">i</span>
        <p>
          <strong>
            {event.plan.mode === 'demo'
              ? 'Demo plan — not live AI.'
              : 'AI-assisted ideas — not verified facts.'}
          </strong>{' '}
          Budget allocations are estimates, not quotes. Add real vendor details only after you confirm
          them directly.
        </p>
        <button onClick={() => onGo('Settings')}>
          Plan details <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}

function BudgetTab({
  event,
  summary,
  onChange,
  onToast,
}: {
  event: EventRecord
  summary: ReturnType<typeof budgetSummary>
  onChange: (plan: EventRecord['plan'], persist?: boolean) => void
  onToast: (message: string) => void
}) {
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [scenarioAmount, setScenarioAmount] = useState<number | null>(null)
  const [allocationPreview, setAllocationPreview] = useState<ReturnType<
    typeof simulateAllocationChange
  > | null>(null)
  const allocations = event.plan.budget.allocations
  const scenarioTarget = allocations[scenarioIndex] ?? allocations[0]
  const previewAmount = scenarioAmount ?? scenarioTarget?.planned ?? 0
  const projected = projectedCost(allocations)
  const overrun = Math.max(0, projected - event.budget)
  const overrunPercent = event.budget > 0 ? (overrun / event.budget) * 100 : 0
  const cutScenario = proposePriorityCuts(
    allocations,
    event.budget,
    event.priority_order,
    event.must_haves,
  )
  const previewAllocation = () => {
    if (!scenarioTarget) return
    setAllocationPreview(
      simulateAllocationChange(
        allocations,
        event.budget,
        scenarioIndex,
        previewAmount,
        event.priority_order,
        event.must_haves,
      ),
    )
  }
  const applyAllocationPreview = () => {
    if (!allocationPreview?.valid) return
    onChange({
      ...event.plan,
      budget: { ...event.plan.budget, allocations: allocationPreview.allocations },
    })
    setAllocationPreview(null)
    setScenarioAmount(null)
    onToast('Your confirmed scenario was applied. Actual spend and must-haves were left unchanged.')
  }
  const applyCutScenario = () => {
    if (cutScenario.unfunded > 0.01 || !cutScenario.changes.length) return
    onChange({ ...event.plan, budget: { ...event.plan.budget, allocations: cutScenario.allocations } })
    onToast('Priority-aware estimate changes applied after your confirmation. No actuals were changed.')
  }
  const setAlloc = (index: number, field: 'planned' | 'actual', value: number, persist: boolean) => {
    const allocations = event.plan.budget.allocations.map((row, rowIndex) =>
      rowIndex === index ? { ...row, [field]: Math.max(0, Number.isFinite(value) ? value : 0) } : row,
    )
    onChange({ ...event.plan, budget: { ...event.plan.budget, allocations } }, persist)
  }
  const renameAllocation = (index: number, category: string, persist: boolean) => {
    const nextName = persist && !category.trim() ? 'Other category' : category
    if (persist && !category.trim())
      onToast('A budget category needs a name; it was set to “Other category”.')
    const allocations = event.plan.budget.allocations.map((row, rowIndex) =>
      rowIndex === index ? { ...row, category: nextName } : row,
    )
    onChange({ ...event.plan, budget: { ...event.plan.budget, allocations } }, persist)
  }
  const addCategory = () => {
    const plan = {
      ...event.plan,
      budget: {
        ...event.plan.budget,
        allocations: [
          ...event.plan.budget.allocations,
          {
            category: `Other ${event.plan.budget.allocations.length - 6}`,
            planned: 0,
            actual: 0,
            rationale: 'Add a brief note about this allocation.',
          },
        ],
      },
    }
    onChange(plan)
    onToast('A budget line was added. Set its estimate when you’re ready.')
  }
  const pct = Math.min(100, summary.utilization)
  return (
    <div className="tab-content budget-content">
      <div className="budget-summary-row">
        <section className="budget-total-card">
          <div>
            <span className="eyebrow">YOUR TOTAL BUDGET</span>
            <strong>{formatMoney(event.budget, event.currency)}</strong>
            <p>Estimates are editable planning guides—not verified vendor quotes.</p>
          </div>
          <div className="budget-ring" style={{ '--ring-value': `${pct}%` } as CSSProperties}>
            <div>
              <strong>{Math.round(pct)}%</strong>
              <small>used</small>
            </div>
          </div>
        </section>
        <section className={`balance-card ${summary.overspent ? 'balance-over' : ''}`}>
          <span className="eyebrow">{summary.overspent ? 'OVER YOUR TOTAL' : 'LEFT TO PLAN WITH'}</span>
          <strong>{formatMoney(summary.remaining, event.currency)}</strong>
          <p>
            {summary.overspent
              ? 'Your actual expenses have passed the total budget. Review or adjust your plans.'
              : 'Calculated from saved actual expenses—not the estimates.'}
          </p>
          <div className="balance-track">
            <i className={summary.overspent ? 'over' : ''} style={{ width: `${pct}%` }} />
          </div>
          <span className="balance-caption">
            {formatMoney(summary.actual, event.currency)} actual spend <b>·</b>{' '}
            {formatMoney(summary.allocated, event.currency)} allocated
          </span>
        </section>
      </div>
      {(summary.overallocated > 0.01 || summary.unallocated > 0.01 || summary.overspent) && (
        <div
          className={`budget-alert ${summary.overspent || summary.overallocated > 0.01 ? 'alert-warm' : ''}`}
          role="status"
        >
          <span>{summary.overspent || summary.overallocated > 0.01 ? '!' : '↗'}</span>
          <p>
            {summary.overspent ? (
              <>
                <strong>Actual spend is over budget.</strong> Remaining balance is negative and reflects
                your real expenses.
              </>
            ) : summary.overallocated > 0.01 ? (
              <>
                <strong>
                  Allocations exceed the total by {formatMoney(summary.overallocated, event.currency)}.
                </strong>{' '}
                Rebalance your planned amounts.
              </>
            ) : (
              <>
                <strong>{formatMoney(summary.unallocated, event.currency)} is unallocated.</strong> This
                is your flexible buffer; assign it when you're ready.
              </>
            )}
          </p>
        </div>
      )}
      {overrunPercent >= 20 && (
        <section className="priority-overrun" role="alert">
          <div className="overrun-heading">
            <span className="overrun-mark">!</span>
            <div>
              <span className="eyebrow">20%+ PROJECTED OVERRUN</span>
              <h3>Review trade-offs before changing anything</h3>
            </div>
          </div>
          <p>
            Current projection is {formatMoney(projected, event.currency)} — {overrunPercent.toFixed(0)}%
            over budget. This uses the higher of planned estimate or actual for each category; it is not
            a verified quote. Nothing below changes until you choose to apply it.
          </p>
          <div className="overrun-scenarios">
            <article>
              <span className="scenario-kicker">OPTION 1 · PROTECT #1 PRIORITY + MUST-HAVES</span>
              <h4>Preview flexible, uncommitted cuts</h4>
              {cutScenario.changes.length ? (
                <ul className="scenario-change-list">
                  {cutScenario.changes.map((change) => (
                    <li key={change.category}>
                      <span>{change.category}</span>
                      <strong>
                        {formatMoney(change.from, event.currency)} →{' '}
                        {formatMoney(change.to, event.currency)}
                      </strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No uncommitted, non-must-have allocations are available to reduce.</p>
              )}
              {cutScenario.unfunded > 0.01 ? (
                <p className="scenario-caveat">
                  The remaining gap is {formatMoney(cutScenario.unfunded, event.currency)}. The plan will
                  not cut must-haves or recorded actuals to hide it; consider guest-count, scope or
                  budget changes instead.
                </p>
              ) : (
                <p className="scenario-caveat">Must-haves and recorded actual spend stay protected.</p>
              )}
              <button
                className="button button-dark button-small"
                disabled={cutScenario.unfunded > 0.01 || cutScenario.changes.length === 0}
                onClick={applyCutScenario}
              >
                Apply these estimate changes
              </button>
            </article>
            <article>
              <span className="scenario-kicker">OTHER OPTIONS · NO AUTO-CHANGE</span>
              <h4>Revisit scale or budget</h4>
              <p>
                A rough per-guest scenario would mean about{' '}
                {Math.ceil(overrun / Math.max(1, projected / event.guest_count))} fewer guests to offset
                this gap. Fixed costs mean actual savings may differ; ask providers to re-quote.
              </p>
              <p>
                Alternatively, preserving the current plan requires a budget increase of about{' '}
                <strong>{formatMoney(overrun, event.currency)}</strong>. Neither option is applied
                automatically.
              </p>
            </article>
          </div>
        </section>
      )}
      <section className="allocation-simulator surface-card" aria-labelledby="scenario-title">
        <div className="card-heading">
          <div>
            <span className="eyebrow">TRY A WHAT-IF</span>
            <h3 id="scenario-title">Simulate a budget change</h3>
          </div>
          <span className="scenario-badge">Preview first</span>
        </div>
        <p className="simulator-intro">
          Raise one planned amount and preview how flexible allocations could adjust. The first-ranked
          priority and all must-haves are left intact; actual spend is never reduced by the simulator.
        </p>
        {scenarioTarget && (
          <div className="scenario-controls">
            <label className="field">
              <span>Allocation to change</span>
              <select
                value={scenarioIndex}
                onChange={(e) => {
                  setScenarioIndex(Number(e.target.value))
                  setScenarioAmount(null)
                  setAllocationPreview(null)
                }}
              >
                {allocations.map((allocation, index) => (
                  <option value={index} key={`${allocation.category}-${index}`}>
                    {allocation.category}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>New planned amount</span>
              <input
                type="number"
                min={scenarioTarget.actual}
                step="100"
                value={previewAmount}
                onChange={(e) => {
                  setScenarioAmount(e.target.value === '' ? 0 : Number(e.target.value))
                  setAllocationPreview(null)
                }}
              />
            </label>
            <button className="button button-soft" onClick={previewAllocation}>
              Preview reallocation <ArrowRight size={14} />
            </button>
          </div>
        )}
        {allocationPreview && (
          <div className="scenario-preview" aria-live="polite">
            <strong>
              {allocationPreview.changes.length
                ? `${allocationPreview.changes.length} planned amount${allocationPreview.changes.length === 1 ? '' : 's'} would change`
                : 'No allocation change required'}
            </strong>
            {allocationPreview.changes.length > 0 && (
              <ul className="scenario-change-list">
                {allocationPreview.changes.map((change) => (
                  <li key={change.category}>
                    <span>{change.category}</span>
                    <strong>
                      {formatMoney(change.from, event.currency)} →{' '}
                      {formatMoney(change.to, event.currency)}
                    </strong>
                  </li>
                ))}
              </ul>
            )}
            {allocationPreview.unfunded > 0.01 && (
              <p className="scenario-caveat">
                There is still {formatMoney(allocationPreview.unfunded, event.currency)} unfunded without
                touching must-haves or actuals. Lower the increase or rework the priorities.
              </p>
            )}
            {allocationPreview.valid && (
              <button className="button button-dark button-small" onClick={applyAllocationPreview}>
                Confirm and apply this scenario
              </button>
            )}
          </div>
        )}
      </section>
      <section className="surface-card budget-breakdown">
        <div className="card-heading">
          <div>
            <span className="eyebrow">A CLEAR-EYED BREAKDOWN</span>
            <h3>Where it could go</h3>
          </div>
          <button className="button button-soft button-small" onClick={addCategory}>
            <Plus size={14} /> Add category
          </button>
        </div>
        <div className="budget-table-head">
          <span>CATEGORY</span>
          <span>PLANNED ESTIMATE</span>
          <span>ACTUAL SPEND</span>
          <span>SHARE</span>
        </div>
        <div className="budget-lines">
          {event.plan.budget.allocations.map((row, index) => (
            <div className="budget-line" key={`${row.category}-${index}`}>
              <div className="allocation-name">
                <i className={`allocation-dot allocation-${index % 6}`} />
                <span>
                  <input
                    className="allocation-category-input"
                    aria-label={`Budget category ${index + 1}`}
                    value={row.category}
                    maxLength={80}
                    onChange={(e) => renameAllocation(index, e.target.value, false)}
                    onBlur={(e) => renameAllocation(index, e.target.value, true)}
                  />
                  <small>{row.rationale}</small>
                </span>
              </div>
              <label className="money-field">
                <span className="sr-only">Planned estimate for {row.category}</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={row.planned}
                  onChange={(e) => setAlloc(index, 'planned', Number(e.target.value), false)}
                  onBlur={(e) => setAlloc(index, 'planned', Number(e.target.value), true)}
                />
              </label>
              <label className="money-field actual-field">
                <span className="sr-only">Actual expense for {row.category}</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={row.actual}
                  onChange={(e) => setAlloc(index, 'actual', Number(e.target.value), false)}
                  onBlur={(e) => setAlloc(index, 'actual', Number(e.target.value), true)}
                />
              </label>
              <span className="allocation-share">
                {event.budget ? Math.round((row.planned / event.budget) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
        <div className="budget-table-total">
          <strong>Planned allocation</strong>
          <strong>{formatMoney(summary.allocated, event.currency)}</strong>
          <span>Actual spend</span>
          <strong>{formatMoney(summary.actual, event.currency)}</strong>
        </div>
        <div className="budget-table-note">
          <span>↗</span>
          <p>
            <strong>Keep a little aside.</strong> The contingency line is a suggestion—not a mandatory
            spend—and any unallocated budget stays visible.
          </p>
        </div>
      </section>
    </div>
  )
}

function TimelineTab({
  event,
  onChange,
  onToast,
}: {
  event: EventRecord
  onChange: (plan: EventRecord['plan'], persist?: boolean) => void
  onToast: (message: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    due_date: event.event_date,
    priority: 'Medium' as Priority,
    description: '',
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [delayTaskId, setDelayTaskId] = useState<string | null>(null)
  const [delayDate, setDelayDate] = useState('')
  const [delayPreview, setDelayPreview] = useState<ReturnType<typeof previewTaskDelay> | null>(null)
  const tasks = useMemo(
    () => [...event.plan.tasks].sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [event.plan.tasks],
  )
  const completed = tasks.filter((task) => task.status === 'Done').length
  const updateTask = (taskId: string, patch: Partial<PlanTask>, persist = true) => {
    const current = tasks.find((task) => task.id === taskId)
    if (
      patch.status !== undefined &&
      patch.status !== 'Done' &&
      current?.status === 'Done' &&
      tasks.some((task) => task.status === 'Done' && (task.depends_on ?? []).includes(taskId))
    ) {
      onToast('Reopen completed dependent tasks first, then change this prerequisite.')
      return
    }
    onChange(
      {
        ...event.plan,
        tasks: event.plan.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
      },
      persist,
    )
  }
  const calculateDelayImpact = (task: PlanTask) => {
    setDelayPreview(previewTaskDelay(tasks, task.id, delayDate, event.event_date))
  }
  const applyDelay = () => {
    if (!delayPreview || delayPreview.overflow.length) return
    onChange({ ...event.plan, tasks: delayPreview.tasks })
    onToast(
      `Confirmed: shifted ${delayPreview.changes.length} task date${delayPreview.changes.length === 1 ? '' : 's'} and kept all statuses.`,
    )
    setDelayTaskId(null)
    setDelayPreview(null)
    setDelayDate('')
  }
  const addTask = (e: FormEvent) => {
    e.preventDefault()
    if (!newTask.title.trim() || !newTask.due_date) return
    if (newTask.due_date > event.event_date) {
      onToast('A task deadline should be on or before the event date.')
      return
    }
    const task: PlanTask = {
      ...newTask,
      title: newTask.title.trim(),
      id: crypto.randomUUID(),
      status: 'To do',
      depends_on: [],
    }
    onChange({ ...event.plan, tasks: [...event.plan.tasks, task] })
    setNewTask({ title: '', due_date: event.event_date, priority: 'Medium', description: '' })
    setAdding(false)
    onToast('Task added to your timeline.')
  }
  return (
    <div className="tab-content timeline-content">
      <section className="timeline-progress-card">
        <div>
          <span className="eyebrow">YOUR PLAN, IN MOTION</span>
          <h3>
            {completed} of {tasks.length} steps complete
          </h3>
          <p>A steady little step is still a step.</p>
        </div>
        <div className="timeline-progress">
          <div className="timeline-progress-track">
            <i style={{ width: `${tasks.length ? (completed / tasks.length) * 100 : 0}%` }} />
          </div>
          <span>{tasks.length ? Math.round((completed / tasks.length) * 100) : 0}%</span>
        </div>
      </section>
      <div className="timeline-toolbar">
        <div>
          <span className="eyebrow">A DATE-LED CHECKLIST</span>
          <h3>Milestones & little steps</h3>
        </div>
        <button className="button button-dark button-small" onClick={() => setAdding((open) => !open)}>
          {adding ? <X size={14} /> : <Plus size={14} />} {adding ? 'Cancel' : 'Add a task'}
        </button>
      </div>
      {adding && (
        <form className="add-task-form" onSubmit={addTask}>
          <label className="field">
            <span>Task name</span>
            <input
              autoFocus
              required
              maxLength={120}
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="What needs doing?"
            />
          </label>
          <label className="field">
            <span>Due date</span>
            <input
              required
              type="date"
              max={event.event_date}
              value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Priority</span>
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Priority })}
            >
              {priorities.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>
              Note <em>optional</em>
            </span>
            <input
              maxLength={300}
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="A helpful detail"
            />
          </label>
          <button className="button button-coral" type="submit">
            Add to timeline <ArrowRight size={15} />
          </button>
        </form>
      )}
      <div className="timeline-list">
        {tasks.map((task, index) => {
          const overdue = task.due_date < today && task.status !== 'Done'
          const prerequisites = (task.depends_on ?? [])
            .map((id) => tasks.find((candidate) => candidate.id === id))
            .filter((candidate): candidate is PlanTask => Boolean(candidate))
          const blockedBy = prerequisites.filter((candidate) => candidate.status !== 'Done')
          return (
            <article
              className={`timeline-row ${task.status === 'Done' ? 'is-done' : ''} ${overdue ? 'is-overdue' : ''}`}
              key={task.id}
            >
              <div className="timeline-node-wrap">
                <span className={`timeline-node ${task.status === 'Done' ? 'node-done' : ''}`}>
                  {task.status === 'Done' ? <Check size={14} /> : String(index + 1).padStart(2, '0')}
                </span>
                <div className="timeline-spine" />
              </div>
              <div className="timeline-row-content">
                {editingId === task.id ? (
                  <div className="task-edit-form">
                    <label className="field">
                      <span>Edit task</span>
                      <input
                        value={task.title}
                        onChange={(e) => updateTask(task.id, { title: e.target.value }, false)}
                        maxLength={120}
                      />
                    </label>
                    <label className="field">
                      <span>Current deadline</span>
                      <input type="date" value={task.due_date} disabled />
                      <small>
                        Use “Preview delay” below to shift dependent tasks with your approval.
                      </small>
                    </label>
                    <label className="field">
                      <span>Priority</span>
                      <select
                        value={task.priority}
                        onChange={(e) =>
                          updateTask(task.id, { priority: e.target.value as Priority }, false)
                        }
                      >
                        {priorities.map((priority) => (
                          <option key={priority}>{priority}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="button button-soft button-small"
                      onClick={() => {
                        const edited = event.plan.tasks.find((item) => item.id === task.id)
                        if (
                          !edited?.title.trim() ||
                          !edited.due_date ||
                          edited.due_date > event.event_date
                        ) {
                          onToast('Add a task name and choose a deadline on or before the event date.')
                          return
                        }
                        setEditingId(null)
                        onChange(event.plan)
                        onToast('Task changes saved.')
                      }}
                    >
                      Done editing
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="task-main-line">
                      <div>
                        <h4>{task.title}</h4>
                        <p>{task.description || 'No extra notes yet.'}</p>
                        {prerequisites.length > 0 && (
                          <p className={`task-dependencies ${blockedBy.length ? 'is-blocked' : ''}`}>
                            {blockedBy.length ? 'Complete first: ' : 'Depends on: '}
                            {(blockedBy.length ? blockedBy : prerequisites)
                              .map((dependency) => dependency.title)
                              .join(', ')}
                          </p>
                        )}
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${task.title}`}
                        onClick={() => setEditingId(task.id)}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                    <div className="task-meta">
                      <label className="status-control">
                        <span className="sr-only">Status for {task.title}</span>
                        <select
                          value={task.status}
                          onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}
                        >
                          {taskStatuses.map((status) => (
                            <option
                              key={status}
                              disabled={
                                status === 'Done' && blockedBy.length > 0 && task.status !== 'Done'
                              }
                            >
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span className={`priority-pill priority-${task.priority.toLowerCase()}`}>
                        {task.priority} priority
                      </span>
                      <span className={`task-date ${overdue ? 'overdue-text' : ''}`}>
                        <CalendarDays size={13} />
                        {formatDate(task.due_date, { day: 'numeric', month: 'short' })}
                        {overdue && <b>Overdue</b>}
                      </span>
                      {task.status !== 'Done' && (
                        <button
                          className="task-delay-button"
                          onClick={() => {
                            setDelayTaskId(task.id)
                            setDelayDate(task.due_date)
                            setDelayPreview(null)
                          }}
                        >
                          <Clock3 size={13} /> Preview delay
                        </button>
                      )}
                    </div>
                    {delayTaskId === task.id && (
                      <div className="task-delay-panel">
                        <strong>Preview this task’s delay</strong>
                        <p>
                          Choose a later date to preview every dependent task before anything is saved;
                          completion statuses stay unchanged.
                        </p>
                        <div className="task-delay-controls">
                          <label className="field">
                            <span>New due date</span>
                            <input
                              type="date"
                              min={task.due_date}
                              max={event.event_date}
                              value={delayDate}
                              onChange={(e) => {
                                setDelayDate(e.target.value)
                                setDelayPreview(null)
                              }}
                            />
                          </label>
                          <button
                            className="button button-soft button-small"
                            disabled={!delayDate || delayDate <= task.due_date}
                            onClick={() => calculateDelayImpact(task)}
                          >
                            Calculate impact
                          </button>
                          <button
                            className="button button-quiet button-small"
                            onClick={() => {
                              setDelayTaskId(null)
                              setDelayPreview(null)
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                        {delayPreview && (
                          <div className="delay-impact" aria-live="polite">
                            <strong>
                              {delayPreview.changes.length} task date
                              {delayPreview.changes.length === 1 ? '' : 's'} would shift by up to{' '}
                              {delayPreview.delayDays} day{delayPreview.delayDays === 1 ? '' : 's'}.
                            </strong>
                            <ul className="scenario-change-list">
                              {delayPreview.changes.map((change) => (
                                <li key={change.id}>
                                  <span>
                                    {change.title}
                                    {change.status === 'Done' ? ' · complete' : ''}
                                  </span>
                                  <strong>
                                    {formatDate(change.from, {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}{' '}
                                    →{' '}
                                    {formatDate(change.to, {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </strong>
                                </li>
                              ))}
                            </ul>
                            {delayPreview.overflow.length > 0 && (
                              <p className="scenario-caveat">
                                {delayPreview.overflow.length} dependent task
                                {delayPreview.overflow.length === 1 ? '' : 's'} would fall after the
                                event date. Choose an earlier prerequisite date or adjust the plan
                                manually; these shifts cannot be applied.
                              </p>
                            )}
                            <button
                              className="button button-dark button-small"
                              disabled={
                                delayPreview.overflow.length > 0 || delayPreview.changes.length === 0
                              }
                              onClick={applyDelay}
                            >
                              Confirm and apply date shifts
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>
      {tasks.length === 0 && (
        <div className="empty-state">
          <ListChecks size={26} />
          <h3>Your timeline is clear.</h3>
          <p>Add a first task, and make the next step a small one.</p>
        </div>
      )}
    </div>
  )
}

function VendorsTab({
  event,
  onChange,
  onToast,
}: {
  event: EventRecord
  onChange: (plan: EventRecord['plan'], persist?: boolean) => void
  onToast: (message: string) => void
}) {
  const items = event.plan.vendors
  const quoteGroups = useMemo(() => {
    const grouped = new Map<string, VendorItem[]>()
    for (const vendor of items.filter((item) => item.estimate != null)) {
      const key = `${vendor.category.trim().toLowerCase()}::${vendor.service.trim().toLowerCase()}`
      grouped.set(key, [...(grouped.get(key) ?? []), vendor])
    }
    return Array.from(grouped.entries())
      .filter(([, quotes]) => quotes.length >= 2)
      .map(([key, quotes]) => ({ key, quotes }))
  }, [items])
  const booked = items.filter(
    (vendor) => vendor.status === 'Booked' || vendor.status === 'Confirmed',
  ).length
  const update = (id: string, patch: Partial<VendorItem>, persist = true) => {
    const safePatch = { ...patch }
    if (persist && patch.service !== undefined && !patch.service.trim()) {
      safePatch.service = 'Other service'
      onToast('A service needs a name; it was set to “Other service”.')
    }
    if (patch.estimate !== undefined && patch.estimate !== null && !Number.isFinite(patch.estimate))
      safePatch.estimate = null
    onChange(
      {
        ...event.plan,
        vendors: items.map((vendor) => (vendor.id === id ? { ...vendor, ...safePatch } : vendor)),
      },
      persist,
    )
  }
  const addVendor = () => {
    const vendor: VendorItem = {
      id: crypto.randomUUID(),
      category: 'Other',
      service: 'New service',
      name: '',
      contact: '',
      estimate: null,
      coverage_guests: null,
      included_items: '',
      extra_charges: '',
      status: 'To source',
      notes: '',
    }
    onChange({ ...event.plan, vendors: [...items, vendor] })
    onToast('Checklist item added. Add a service and the provider you choose.')
  }
  const addQuote = (source: VendorItem) => {
    const quote: VendorItem = {
      ...source,
      id: crypto.randomUUID(),
      name: '',
      contact: '',
      estimate: null,
      status: 'To source',
      notes: 'Compare the same service scope, inclusions, taxes and cancellation terms.',
    }
    onChange({ ...event.plan, vendors: [...items, quote] })
    onToast(
      `A second ${source.service.toLowerCase()} quote option was added. Add only details you verify.`,
    )
  }
  return (
    <div className="tab-content vendors-content">
      <section className="vendor-intro-card">
        <div className="vendor-intro-icon">
          <Flower2 size={22} />
        </div>
        <div>
          <span className="eyebrow">YOUR VENDOR CHECKLIST</span>
          <h3>Make space for the right people.</h3>
          <p>
            These are service categories—not recommendations for specific businesses. Add a provider only
            after you've verified their details yourself.
          </p>
        </div>
        <div className="vendor-booking-count">
          <strong>
            {booked}
            <small>/{items.length}</small>
          </strong>
          <span>booked or confirmed</span>
        </div>
      </section>
      <div className="vendor-toolbar">
        <div>
          <span className="eyebrow">A FEW SERVICES TO CONSIDER</span>
          <h3>
            {items.length} checklist {items.length === 1 ? 'item' : 'items'}
          </h3>
        </div>
        <button className="button button-dark button-small" onClick={addVendor}>
          <Plus size={14} /> Add a service
        </button>
      </div>
      <section className="quote-comparison" aria-labelledby="quote-comparison-title">
        <div className="quote-comparison-heading">
          <div>
            <span className="eyebrow">COMPARE ONLY WHAT YOU VERIFY</span>
            <h4 id="quote-comparison-title">Quote comparison</h4>
          </div>
          <CircleHelp size={17} aria-hidden="true" />
        </div>
        {quoteGroups.length ? (
          <div className="quote-comparison-grid">
            {quoteGroups.map(({ key, quotes }) => {
              const amounts = quotes.map((quote) => quote.estimate ?? 0)
              const lowest = Math.min(...amounts)
              const highest = Math.max(...amounts)
              return (
                <article className="quote-group" key={key}>
                  <div className="quote-group-head">
                    <div>
                      <strong>{quotes[0].service}</strong>
                      <span>
                        {quotes[0].category} · {quotes.length} entered estimates
                      </span>
                    </div>
                    <b>
                      {formatMoney(lowest, event.currency)} – {formatMoney(highest, event.currency)}
                    </b>
                  </div>
                  <ul>
                    {quotes.map((quote) => (
                      <li key={quote.id} className={quote.estimate === lowest ? 'quote-lowest' : ''}>
                        <span>
                          {quote.name.trim() || 'Provider name not added'} · {quote.status}
                        </span>
                        <strong>{formatMoney(quote.estimate ?? 0, event.currency)}</strong>
                        {quote.estimate === lowest && <em>Lowest entered</em>}
                        <small className="quote-scope">
                          Covers: {quote.coverage_guests ?? 'Not specified'} guests · Includes:{' '}
                          {quote.included_items?.trim() || 'Not specified'} · Extra charges:{' '}
                          {quote.extra_charges?.trim() || 'Not specified'}
                        </small>
                      </li>
                    ))}
                  </ul>
                  <details className="negotiation-prompts">
                    <summary>Negotiation questions for {quotes[0].service}</summary>
                    <ul>
                      <li>
                        Does this estimate cover {event.guest_count} guests and the same hours or service
                        scope as the other option?
                      </li>
                      <li>Which items, staff, setup, delivery, equipment and teardown are included?</li>
                      <li>
                        Are taxes, travel, overtime, extra guests or other charges additional? Ask for
                        them itemized.
                      </li>
                      <li>What deposit, cancellation, rescheduling and quote-expiry terms apply?</li>
                      <li>
                        Can the provider revise the estimate using the same scope and guest count for a
                        fair comparison?
                      </li>
                    </ul>
                  </details>
                  <p>
                    Compare the same scope, inclusions, guest coverage, extra charges and terms. Lowest
                    price is not a quality or value endorsement; these are user-entered estimates, not
                    verified quotes.
                  </p>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="quote-comparison-empty">
            Add a second provider option for the same service, then enter estimates to compare them side
            by side.
          </p>
        )}
      </section>
      {items.length ? (
        <div className="vendor-grid">
          {items.map((vendor, index) => (
            <article className="vendor-card" key={vendor.id}>
              <div className="vendor-card-head">
                <span className={`vendor-symbol vendor-symbol-${index % 5}`}>
                  <Flower2 size={17} />
                </span>
                <div>
                  <span className="vendor-category">{vendor.category}</span>
                  <strong>{vendor.service}</strong>
                </div>
                <span
                  className={`vendor-status-dot vendor-status-${vendor.status.toLowerCase().replace(/ /g, '-')}`}
                  title={vendor.status}
                />
              </div>
              <div className="vendor-card-fields vendor-identity-fields">
                <label className="field">
                  <span>Service category</span>
                  <select
                    value={vendor.category}
                    onChange={(e) => update(vendor.id, { category: e.target.value })}
                  >
                    {vendorCategories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Service</span>
                  <input
                    value={vendor.service}
                    maxLength={100}
                    onChange={(e) => update(vendor.id, { service: e.target.value }, false)}
                    onBlur={(e) => update(vendor.id, { service: e.target.value })}
                  />
                </label>
              </div>
              <label className="field vendor-field">
                <span>
                  Provider name <em>optional</em>
                </span>
                <input
                  value={vendor.name}
                  maxLength={100}
                  onChange={(e) => update(vendor.id, { name: e.target.value }, false)}
                  onBlur={() => onChange(event.plan)}
                  placeholder="Add a provider you choose"
                />
              </label>
              <div className="vendor-card-fields">
                <label className="field">
                  <span>
                    Contact <em>optional</em>
                  </span>
                  <input
                    value={vendor.contact}
                    maxLength={180}
                    onChange={(e) => update(vendor.id, { contact: e.target.value }, false)}
                    onBlur={() => onChange(event.plan)}
                    placeholder="Email or phone"
                  />
                </label>
                <label className="field">
                  <span>
                    Estimate <em>optional</em>
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={vendor.estimate ?? ''}
                    onChange={(e) =>
                      update(
                        vendor.id,
                        { estimate: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) },
                        false,
                      )
                    }
                    onBlur={() => onChange(event.plan)}
                    placeholder="—"
                  />
                </label>
              </div>
              <div className="vendor-card-fields">
                <label className="field">
                  <span>
                    Guest count covered <em>optional</em>
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    step="1"
                    value={vendor.coverage_guests ?? ''}
                    onChange={(e) =>
                      update(
                        vendor.id,
                        {
                          coverage_guests: parseCoveredGuests(e.target.value),
                        },
                        false,
                      )
                    }
                    onBlur={() => onChange(event.plan)}
                    placeholder="Not specified"
                  />
                </label>
                <label className="field">
                  <span>
                    Inclusions <em>optional</em>
                  </span>
                  <input
                    value={vendor.included_items ?? ''}
                    maxLength={500}
                    onChange={(e) => update(vendor.id, { included_items: e.target.value }, false)}
                    onBlur={() => onChange(event.plan)}
                    placeholder="Hours, staff, setup, equipment…"
                  />
                </label>
              </div>
              <label className="field vendor-notes-field">
                <span>
                  Extra charges <em>optional</em>
                </span>
                <input
                  value={vendor.extra_charges ?? ''}
                  maxLength={300}
                  onChange={(e) => update(vendor.id, { extra_charges: e.target.value }, false)}
                  onBlur={() => onChange(event.plan)}
                  placeholder="Taxes, overtime, travel, additional guests…"
                />
              </label>
              <label className="field vendor-status-field">
                <span>Booking status</span>
                <select
                  value={vendor.status}
                  onChange={(e) => update(vendor.id, { status: e.target.value as BookingStatus })}
                >
                  {bookingStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="field vendor-notes-field">
                <span>Notes</span>
                <input
                  value={vendor.notes}
                  maxLength={500}
                  onChange={(e) => update(vendor.id, { notes: e.target.value }, false)}
                  onBlur={() => onChange(event.plan)}
                  placeholder="Questions, details, reminders…"
                />
              </label>
              <span className="vendor-estimate-note">
                {vendor.estimate != null
                  ? `${formatMoney(vendor.estimate, event.currency)} · estimate only`
                  : 'No estimate added'}
              </span>
              <button
                className="button button-soft button-small vendor-quote-button"
                onClick={() => addQuote(vendor)}
              >
                <Plus size={13} /> Add another quote for this service
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Flower2 size={26} />
          <h3>No checklist items yet.</h3>
          <p>Add a service area to start your own list.</p>
        </div>
      )}
      <div className="vendor-trust-note">
        <span>i</span>
        <p>
          <strong>Always verify independently.</strong> Celebrai does not verify providers, contact
          details, availability, prices or quality.
        </p>
      </div>
    </div>
  )
}

function IdeasTab({ event }: { event: EventRecord }) {
  const categoryColors = ['idea-pink', 'idea-amber', 'idea-green', 'idea-blue', 'idea-lavender']
  return (
    <div className="tab-content ideas-content">
      <section className="ideas-intro">
        <div className="ideas-intro-spark">
          <Sparkles size={25} />
        </div>
        <div>
          <span className="eyebrow">MADE FOR {event.category.toUpperCase()}</span>
          <h3>{event.plan.theme}</h3>
          <p>{event.plan.overview}</p>
        </div>
        <span className={`mode-tag ${event.plan.mode === 'demo' ? 'tag-demo' : 'tag-ai'}`}>
          {event.plan.mode === 'demo' ? 'DEMO IDEAS' : 'AI-ASSISTED'}
        </span>
      </section>
      <div className="idea-cards-grid">
        {event.plan.recommendations.map((idea, index) => (
          <article
            className={`idea-card ${categoryColors[index % categoryColors.length]}`}
            key={`${idea.category}-${idea.title}`}
          >
            <div className="idea-card-top">
              <span>{idea.category}</span>
              <span className="idea-index">{String(index + 1).padStart(2, '0')}</span>
            </div>
            <div className="idea-card-flower" aria-hidden="true">
              {index % 2 === 0 ? '✳' : '✦'}
            </div>
            <h4>{idea.title}</h4>
            <p>{idea.description}</p>
            <span className="idea-card-foot">
              A starting point, not a rule <Heart size={13} />
            </span>
          </article>
        ))}
      </div>
      <div className="ideas-two-col">
        <section className="surface-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">A GENTLE PLAN B</span>
              <h3>Things to keep in mind</h3>
            </div>
            <span className="risk-icon">↗</span>
          </div>
          <div className="risk-list">
            {event.plan.risks.map((risk) => (
              <article className="risk-item" key={risk.title}>
                <span>!</span>
                <div>
                  <strong>{risk.title}</strong>
                  <p>{risk.mitigation}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="surface-card assumption-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">HOW TO READ THIS PLAN</span>
              <h3>Assumptions, out in the open</h3>
            </div>
            <span className="assumption-icon">i</span>
          </div>
          <ul>
            {event.plan.assumptions.map((assumption) => (
              <li key={assumption}>
                <Check size={14} />
                {assumption}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function SettingsTab({
  event,
  onEdit,
  onNew,
  onExport,
}: {
  event: EventRecord
  onEdit: () => void
  onNew: () => void
  onExport: (format: 'csv' | 'json') => Promise<void>
}) {
  return (
    <div className="tab-content settings-content">
      <section className="surface-card settings-event-card">
        <div className="settings-event-mark">
          <span>{initials(event.name)}</span>
        </div>
        <div className="settings-event-info">
          <span className="eyebrow">EVENT DETAILS</span>
          <h3>{event.name}</h3>
          <p>
            {event.category} <i>·</i> {formatDate(event.event_date)} <i>·</i> {event.location}
          </p>
          <span>
            {event.guest_count.toLocaleString()} guests <i>·</i>{' '}
            {formatMoney(event.budget, event.currency)} budget
          </span>
        </div>
        <button className="button button-outline" onClick={onEdit}>
          Edit details
        </button>
      </section>
      <section className="surface-card settings-block">
        <div>
          <span className="eyebrow">TAKE YOUR PLAN WITH YOU</span>
          <h3>Export your celebration</h3>
          <p>Your exported file reflects the event data saved in this workspace.</p>
        </div>
        <div className="settings-export-buttons">
          <button className="button button-soft" onClick={() => void onExport('csv')}>
            <Download size={15} /> Download CSV
          </button>
          <button className="button button-outline" onClick={() => void onExport('json')}>
            <ArrowDownToLine size={15} /> Download JSON
          </button>
        </div>
      </section>
      <section className="surface-card settings-block">
        <div>
          <span className="eyebrow">ANOTHER GOOD THING TO PLAN?</span>
          <h3>Start a new celebration</h3>
          <p>Your current event stays saved, ready whenever you are.</p>
        </div>
        <button className="button button-dark" onClick={onNew}>
          Create another plan <ArrowRight size={15} />
        </button>
      </section>
      <section className="settings-disclaimer">
        <span>i</span>
        <p>
          <strong>About this workspace.</strong> This prototype does not include sign-in. Plans are
          stored in the configured database or locally on this device when the API is unavailable. AI
          suggestions, where configured, should be checked before acting on them.
        </p>
      </section>
    </div>
  )
}
