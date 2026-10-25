import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, X } from 'lucide-react'
import {
  plannerFocusOptions,
  planningPriorityOptions,
  type EventBrief,
  type EventCategory,
  type EventRecord,
  type PlanningPriority,
} from '../types'
import { localDateString } from '../lib/format'

interface EventWizardProps {
  initial?: Partial<EventBrief>
  onClose: () => void
  onGenerate: (event: EventBrief) => Promise<void>
  onUpdate?: (event: EventBrief) => Promise<void>
  editing?: EventRecord
}

const categoryOptions: { value: EventCategory; title: string; sub: string; mark: string }[] = [
  { value: 'Wedding', title: 'Wedding', sub: 'A day to remember', mark: 'W' },
  { value: 'Birthday', title: 'Birthday', sub: 'One more trip around', mark: 'B' },
  { value: 'Community event', title: 'Community', sub: 'Better, together', mark: 'C' },
]

function defaultDate() {
  const date = new Date()
  date.setDate(date.getDate() + 60)
  return localDateString(date)
}

function blankEvent(): EventBrief {
  return {
    name: '',
    category: 'Wedding',
    event_date: defaultDate(),
    location: '',
    guest_count: 80,
    budget: 250000,
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
}

export function EventWizard({ initial, onClose, onGenerate, onUpdate, editing }: EventWizardProps) {
  const [form, setForm] = useState<EventBrief>({ ...blankEvent(), ...initial })
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [shareConsent, setShareConsent] = useState(false)
  const dialogRef = useRef<HTMLElement>(null)
  const previousFocus = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  )
  const minimumDate = localDateString(new Date())
  const maximum = new Date()
  maximum.setFullYear(maximum.getFullYear() + 10)
  const maximumDate = localDateString(maximum)
  useEffect(() => () => previousFocus.current?.focus(), [])
  const update = (key: keyof EventBrief, value: string | number) =>
    setForm((current) => ({ ...current, [key]: value }))
  const togglePriority = (priority: PlanningPriority) => {
    if (form.priority_order.includes(priority)) {
      setForm((current) => ({
        ...current,
        priority_order: current.priority_order.filter((item) => item !== priority),
      }))
      setError('')
      return
    }
    if (form.priority_order.length >= 3) {
      setError('Choose up to three ranked priorities. Remove one to change your list.')
      return
    }
    setForm((current) => ({ ...current, priority_order: [...current.priority_order, priority] }))
    setError('')
  }
  const toggleMustHave = (priority: PlanningPriority) => {
    setForm((current) => ({
      ...current,
      must_haves: current.must_haves.includes(priority)
        ? current.must_haves.filter((item) => item !== priority)
        : [...current.must_haves, priority],
    }))
  }

  const validateStep = () => {
    if (step === 0 && (!form.name.trim() || !form.location.trim() || !form.event_date))
      return 'Add an event name, date and location to continue.'
    if (step === 1 && form.priority_order.length === 0)
      return 'Choose at least one ranked priority so the budget plan can reflect what matters most.'
    if (
      step === 1 &&
      (!Number.isFinite(Number(form.guest_count)) ||
        Number(form.guest_count) < 1 ||
        Number(form.guest_count) > 100000 ||
        !Number.isFinite(Number(form.budget)) ||
        Number(form.budget) <= 0 ||
        Number(form.budget) > 1000000000)
    )
      return 'Guests must be 1–100,000 and budget must be greater than zero.'
    if (
      step === 2 &&
      (!Number.isInteger(form.children_count) ||
        !Number.isInteger(form.older_adult_count) ||
        form.children_count < 0 ||
        form.older_adult_count < 0 ||
        form.children_count + form.older_adult_count > form.guest_count)
    )
      return 'Children and older-adult counts cannot be negative or exceed the guest count.'
    if (step === 2 && !shareConsent)
      return 'Please confirm how your event brief is used before creating your personalized plan.'
    if (
      new Date(`${form.event_date}T00:00:00`).getTime() < new Date(`${minimumDate}T00:00:00`).getTime()
    )
      return 'Choose today or a future date.'
    if (form.event_date > maximumDate) return 'Choose an event date within the next 10 years.'
    return ''
  }

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && !busy) {
      onClose()
      return
    }
    if (event.key !== 'Tab' || !dialogRef.current) return
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]',
      ),
    )
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const validation = validateStep()
    if (validation) {
      setError(validation)
      return
    }
    setError('')
    if (step < 2) {
      setStep((current) => current + 1)
      return
    }
    setBusy(true)
    try {
      if (editing && onUpdate)
        await onUpdate({ ...form, guest_count: Number(form.guest_count), budget: Number(form.budget) })
      else
        await onGenerate({ ...form, guest_count: Number(form.guest_count), budget: Number(form.budget) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="wizard-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="wizard-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
        onKeyDown={handleDialogKeyDown}
      >
        <div className="wizard-aside">
          <button
            className="wizard-close"
            onClick={onClose}
            aria-label="Close event planner"
            disabled={busy}
          >
            <X size={18} />
          </button>
          <div className="wizard-aside-content">
            <span className="mini-brand">
              <span className="brand-mark">
                <CalendarDays size={16} />
              </span>{' '}
              <span className="brand-text">
                Celebr<span className="brand-ai">AI</span>
              </span>
            </span>
            <span className="eyebrow">A few thoughtful details</span>
            <h2>
              Start with what
              <br />
              <em>matters to you.</em>
            </h2>
            <p>We'll bring the moving pieces into focus. You stay in charge of every choice.</p>
            <div className="wizard-aside-note">
              <span className="note-check">
                <Check size={14} />
              </span>
              <span>
                Nothing gets locked in.
                <br />
                <strong>Your plan is yours to edit.</strong>
              </span>
            </div>
          </div>
          <span className="wizard-aside-foot">A GOOD DAY, WELL HELD.</span>
        </div>
        <div className="wizard-main">
          <div className="wizard-progress">
            <span>YOUR EVENT</span>
            <div
              className="step-track"
              role="progressbar"
              aria-label="Event setup progress"
              aria-valuemin={1}
              aria-valuemax={3}
              aria-valuenow={step + 1}
            >
              {[0, 1, 2].map((index) => (
                <i key={index} className={index <= step ? 'active' : ''} />
              ))}
            </div>
            <span>
              0{step + 1} <b>/ 03</b>
            </span>
          </div>
          <form onSubmit={submit} noValidate>
            {step === 0 && (
              <div className="wizard-step">
                <span className="eyebrow">The essentials</span>
                <h1 id="wizard-title">
                  What are we <em>celebrating?</em>
                </h1>
                <p className="step-intro">Start with the kind of gathering and a few basics.</p>
                <fieldset className="category-picker">
                  <legend>Choose your celebration</legend>
                  <div className="category-options">
                    {categoryOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`category-option ${form.category === option.value ? 'selected' : ''}`}
                        aria-pressed={form.category === option.value}
                        disabled={Boolean(editing)}
                        onClick={() => update('category', option.value)}
                      >
                        <span className="category-mark">{option.mark}</span>
                        <span>
                          <strong>{option.title}</strong>
                          <small>{option.sub}</small>
                        </span>
                        {form.category === option.value && (
                          <Check className="category-check" size={16} />
                        )}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {editing && (
                  <p className="wizard-edit-note">
                    Event type stays fixed so your saved budget and checklist remain intact. Start a new
                    plan to change the event category.
                  </p>
                )}
                <div className="field-grid">
                  <label htmlFor="wizard-name" className="field full">
                    <span>Event name</span>
                    <input
                      id="wizard-name"
                      aria-required="true"
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      maxLength={100}
                      placeholder="e.g. Ananya & Rohan's wedding"
                      autoFocus
                    />
                    <small>Something you'll recognize in your plans.</small>
                  </label>
                  <label htmlFor="wizard-date" className="field">
                    <span>Event date</span>
                    <input
                      id="wizard-date"
                      type="date"
                      aria-required="true"
                      value={form.event_date}
                      min={minimumDate}
                      max={maximumDate}
                      onChange={(e) => update('event_date', e.target.value)}
                    />
                  </label>
                  <label htmlFor="wizard-location" className="field">
                    <span>Where is it happening?</span>
                    <input
                      id="wizard-location"
                      aria-required="true"
                      value={form.location}
                      onChange={(e) => update('location', e.target.value)}
                      maxLength={120}
                      placeholder="City, region"
                    />
                  </label>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="wizard-step">
                <span className="eyebrow">Set the scale</span>
                <h1 id="wizard-title">
                  A little about your <em>people.</em>
                </h1>
                <p className="step-intro">
                  Choose a specialist, then share the details that help shape a plan around your event.
                </p>
                <section className="planner-focus-block" aria-labelledby="planner-focus-title">
                  <div className="priority-heading">
                    <div>
                      <span className="field-title" id="planner-focus-title">
                        Choose your AI planner
                      </span>
                      <p>Pick the planning focus you want to lead your recommendations.</p>
                    </div>
                    <span className="selection-count">Selected</span>
                  </div>
                  <div className="planner-focus-options" role="group" aria-label="AI planner focus">
                    {plannerFocusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`planner-focus-option ${form.planner_focus === option.value ? 'selected' : ''}`}
                        aria-pressed={form.planner_focus === option.value}
                        aria-label={`Select ${option.title}`}
                        onClick={() => update('planner_focus', option.value)}
                      >
                        <strong>{option.title}</strong>
                        <small>{option.description}</small>
                      </button>
                    ))}
                  </div>
                </section>
                <div className="field-grid">
                  <label htmlFor="wizard-guests" className="field">
                    <span>Expected guests</span>
                    <div className="input-with-unit">
                      <input
                        id="wizard-guests"
                        aria-required="true"
                        type="number"
                        min="1"
                        max="100000"
                        step="1"
                        value={form.guest_count}
                        onChange={(e) =>
                          update('guest_count', e.target.value === '' ? 0 : Number(e.target.value))
                        }
                      />
                      <span>people</span>
                    </div>
                    <small>Choose your best estimate for now.</small>
                  </label>
                  <label htmlFor="wizard-budget" className="field">
                    <span>Total budget</span>
                    <div className="budget-input">
                      <select
                        id="wizard-currency"
                        aria-label="Currency"
                        value={form.currency}
                        onChange={(e) => update('currency', e.target.value)}
                      >
                        <option value="INR">₹ INR</option>
                        <option value="USD">$ USD</option>
                        <option value="EUR">€ EUR</option>
                        <option value="GBP">£ GBP</option>
                        <option value="AED">د.إ AED</option>
                      </select>
                      <input
                        id="wizard-budget"
                        aria-required="true"
                        type="number"
                        min="1"
                        step="100"
                        value={form.budget}
                        onChange={(e) =>
                          update('budget', e.target.value === '' ? 0 : Number(e.target.value))
                        }
                      />
                    </div>
                    <small>We’ll keep estimates in this currency.</small>
                  </label>
                  <label htmlFor="wizard-theme" className="field full">
                    <span>
                      Theme or feeling <em>optional</em>
                    </span>
                    <input
                      id="wizard-theme"
                      value={form.theme_preference}
                      onChange={(e) => update('theme_preference', e.target.value)}
                      maxLength={120}
                      placeholder="e.g. intimate, garden, playful, a little old-world"
                    />
                    <small>Leave this blank to explore a few directions.</small>
                  </label>
                  <label htmlFor="wizard-preferences" className="field full">
                    <span>
                      What would make it feel like you? <em>optional</em>
                    </span>
                    <textarea
                      id="wizard-preferences"
                      rows={3}
                      value={form.preferences}
                      onChange={(e) => update('preferences', e.target.value)}
                      maxLength={1200}
                      placeholder="Local touches, traditions, favourite colours, atmosphere…"
                    />
                  </label>
                </div>
                <div className="priority-block">
                  <div className="priority-heading">
                    <div>
                      <span className="field-title">What matters most?</span>
                      <p>Choose up to three in order. The first choice is your highest priority.</p>
                    </div>
                    <span className="selection-count">{form.priority_order.length}/3 ranked</span>
                  </div>
                  <div className="priority-options" role="group" aria-label="Ranked planning priorities">
                    {planningPriorityOptions.map((priority) => {
                      const rank = form.priority_order.indexOf(priority)
                      return (
                        <button
                          key={priority}
                          type="button"
                          className={`priority-option ${rank >= 0 ? 'selected' : ''}`}
                          aria-pressed={rank >= 0}
                          aria-label={
                            rank >= 0
                              ? `Priority ${rank + 1}: ${priority}; remove`
                              : `Add ${priority} to priorities`
                          }
                          onClick={() => togglePriority(priority)}
                        >
                          <span className="priority-rank">{rank >= 0 ? rank + 1 : '+'}</span>
                          {priority}
                        </button>
                      )
                    })}
                  </div>
                  <div className="priority-heading must-have-heading">
                    <div>
                      <span className="field-title">
                        <span>🛡️</span> Non-negotiables (Protected elements)
                      </span>
                      <p>Optional. These elements are protected and locked when previewing budget trade-offs.</p>
                    </div>
                    {form.must_haves.length > 0 && (
                      <span className="selection-count">{form.must_haves.length} protected</span>
                    )}
                  </div>
                  <div
                    className="priority-options must-have-options"
                    role="group"
                    aria-label="Must-have event elements"
                  >
                    {planningPriorityOptions.map((priority) => (
                      <button
                        key={priority}
                        type="button"
                        className={`priority-option ${form.must_haves.includes(priority) ? 'selected must-have' : ''}`}
                        aria-pressed={form.must_haves.includes(priority)}
                        aria-label={
                          form.must_haves.includes(priority)
                            ? `Remove ${priority} from must-haves`
                            : `Add ${priority} as a must-have`
                        }
                        onClick={() => toggleMustHave(priority)}
                      >
                        {form.must_haves.includes(priority) ? (
                          <Check size={14} />
                        ) : (
                          <span className="priority-rank">+</span>
                        )}
                        {priority}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="wizard-step">
                <span className="eyebrow">Make room for everyone</span>
                <h1 id="wizard-title">
                  The thoughtful <em>details.</em>
                </h1>
                <p className="step-intro">
                  A few notes help us shape more inclusive, useful suggestions.
                </p>
                <div className="field-grid">
                  <label htmlFor="wizard-children" className="field">
                    <span>
                      Children expected <em>optional</em>
                    </span>
                    <input
                      id="wizard-children"
                      type="number"
                      min="0"
                      max={form.guest_count}
                      step="1"
                      value={form.children_count}
                      onChange={(e) =>
                        update('children_count', e.target.value === '' ? 0 : Number(e.target.value))
                      }
                    />
                    <small>Approximate count; used for comfort and activity planning.</small>
                  </label>
                  <label htmlFor="wizard-older-adults" className="field">
                    <span>
                      Older adults expected <em>optional</em>
                    </span>
                    <input
                      id="wizard-older-adults"
                      type="number"
                      min="0"
                      max={form.guest_count}
                      step="1"
                      value={form.older_adult_count}
                      onChange={(e) =>
                        update('older_adult_count', e.target.value === '' ? 0 : Number(e.target.value))
                      }
                    />
                    <small>Approximate count; not a guest list or demographic profile.</small>
                  </label>
                  <label htmlFor="wizard-venue" className="field full">
                    <span>
                      Venue constraints <em>optional</em>
                    </span>
                    <textarea
                      id="wizard-venue"
                      rows={2}
                      value={form.venue_constraints}
                      onChange={(e) => update('venue_constraints', e.target.value)}
                      maxLength={500}
                      placeholder="Capacity, noise curfew, outdoor/indoor limits, access, setup windows…"
                    />
                  </label>
                  <label htmlFor="wizard-dietary" className="field full">
                    <span>
                      Dietary needs <em>optional</em>
                    </span>
                    <textarea
                      id="wizard-dietary"
                      rows={3}
                      value={form.dietary_needs}
                      onChange={(e) => update('dietary_needs', e.target.value)}
                      maxLength={500}
                      placeholder="Allergies, vegetarian options, religious dietary preferences…"
                    />
                  </label>
                  <label htmlFor="wizard-accessibility" className="field full">
                    <span>
                      Accessibility or comfort needs <em>optional</em>
                    </span>
                    <textarea
                      id="wizard-accessibility"
                      rows={3}
                      value={form.accessibility_needs}
                      onChange={(e) => update('accessibility_needs', e.target.value)}
                      maxLength={500}
                      placeholder="Step-free access, quiet space, seating, sensory considerations…"
                    />
                  </label>
                </div>
                <div className="wizard-assumption">
                  <span className="assumption-spark" aria-hidden="true">✳</span>
                  <span>
                    <strong>Your selected planner:</strong>{' '}
                    {plannerFocusOptions.find((option) => option.value === form.planner_focus)?.title}.
                    The app receives this brief either way. With live Gemini enabled, the event name,
                    date, location, guest/budget details and notes you entered are also sent to Google
                    for planning; the API key stays server-side. Without it, the result is labeled demo
                    mode. Avoid guest names, contact details and unnecessary sensitive information.
                    Estimates are not quotes; providers are not verified.
                  </span>
                </div>
                <label htmlFor="wizard-consent" className="sharing-consent">
                  <input
                    id="wizard-consent"
                    type="checkbox"
                    checked={shareConsent}
                    onChange={(e) => setShareConsent(e.target.checked)}
                  />
                  <span>
                    <strong>Submit my brief to this AI planner and save my plan</strong>
                    <small>
                      I understand Celebrai receives the brief, and live Gemini sends it to Google to
                      generate recommendations. If live AI is not configured, I’ll get a clearly labeled
                      demo plan instead.
                    </small>
                  </span>
                </label>
              </div>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="wizard-actions">
              {step > 0 ? (
                <button
                  className="button button-quiet"
                  type="button"
                  onClick={() => {
                    setStep((current) => current - 1)
                    setError('')
                  }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
              ) : (
                <button className="button button-quiet" type="button" onClick={onClose}>
                  Cancel
                </button>
              )}
              {step < 2 ? (
                <button className="button button-dark" type="submit">
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button className="button button-coral" type="submit" disabled={busy}>
                  {busy ? (
                    <>
                      <span className="spinner" /> Shaping your plan…
                    </>
                  ) : editing ? (
                    <>
                      Share brief & refresh plan <Check size={16} />
                    </>
                  ) : (
                    <>
                      Share brief & build plan <SparklesMini />
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="wizard-backlink">
              <span>
                {step === 0
                  ? 'A few details, then the fun part.'
                  : step === 1
                    ? 'You can always adjust the numbers later.'
                    : 'Your plan will be ready in a moment.'}
              </span>
              <span>
                Celebrai <ChevronRight size={13} />
              </span>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

function SparklesMini() {
  return <span aria-hidden="true">✳</span>
}
