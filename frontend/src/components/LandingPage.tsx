import { ArrowDown, ArrowRight, CalendarDays, Check, Heart, Sparkles, WalletCards } from 'lucide-react'

/**
 * Properties for the LandingPage presentation component.
 */
export interface LandingPageProps {
  /** Handler invoked when user initiates new plan wizard */
  onCreate: () => void
  /** Handler invoked when user loads the pre-configured sample plan */
  onSample: () => void
  /** Handler invoked when user opens the saved plans manager */
  onBrowse: () => void
  /** Total count of persisted event plans */
  savedCount: number
}

const pillars = [
  {
    icon: WalletCards,
    title: 'A budget with a little breathing room',
    text: 'See your estimates, real spend and what is still yours to shape.',
  },
  {
    icon: CalendarDays,
    title: 'The right things, at the right time',
    text: 'A date-aware timeline turns the big day into small, doable steps.',
  },
  {
    icon: Heart,
    title: 'The details that make it yours',
    text: 'Ideas follow your people, place, preferences and kind of gathering.',
  },
]

/**
 * CelebrAI primary landing and marketing showcase component.
 * Features value pillars, interactive triggers, and WCAG AA accessible navigation.
 */
export function LandingPage({ onCreate, onSample, onBrowse, savedCount }: LandingPageProps) {
  return (
    <div className="landing-page">
      <a className="skip-link" href="#main-content" rel="noopener noreferrer">
        Skip to content
      </a>
      <header className="landing-nav">
        <a className="brand" href="#top" aria-label="CelebrAI home" rel="noopener noreferrer">
          <span className="brand-mark">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          <span className="brand-text">
            Celebr<span className="brand-ai">AI</span>
          </span>
        </a>
        <nav aria-label="Main navigation" className="landing-links">
          <a href="#how-it-works" rel="noopener noreferrer">How it works</a>
          <a href="#made-for" rel="noopener noreferrer">Made for every gathering</a>
        </nav>
        <div className="nav-actions">
          <button className="text-button saved-link" onClick={onBrowse} aria-label="View saved plans">
            {savedCount > 0 ? `Your plans · ${savedCount}` : 'Your plans'}
          </button>
          <button className="button button-dark button-small" onClick={onCreate} aria-label="Start planning">
            Start planning <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main id="main-content">
        <section className="hero-section" id="top">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" /> Wedding-first planning for regional Indian cities
            </div>
            <h1>
              Make room for
              <br />
              <em>the moment.</em>
            </h1>
            <p className="hero-description">
              Made for budget-conscious couples planning a wedding in regional Indian cities. Get a plan
              that adapts when your budget or guest list changes; birthdays and community gatherings are
              welcome too.
            </p>
            <div className="hero-actions">
              <button className="button button-coral" onClick={onCreate}>
                Plan a celebration <ArrowRight size={17} />
              </button>
              <button className="button button-quiet" onClick={onSample}>
                <span className="play-dot">
                  <Sparkles size={14} />
                </span>{' '}
                Explore a sample plan
              </button>
            </div>
            <div className="hero-assurance">
              <span className="avatar-stack">
                <i>A</i>
                <i>R</i>
                <i>✦</i>
              </span>
              <span>
                Thoughtful planning, <strong>without the overwhelm.</strong>
              </span>
            </div>
          </div>
          <div
            className="hero-art"
            role="img"
            aria-label="Warm, floral wedding table setting at golden hour"
          >
            <img
              src="/celebration-cover.jpg"
              alt="Warm, floral wedding table setting at golden hour"
              loading="lazy"
              className="hero-photo"
              style={{ objectFit: 'cover' }}
            />
            <div className="photo-caption">
              <span className="caption-kicker">A little inspiration</span>
              <span>
                Gathered in golden light <span aria-hidden="true">↗</span>
              </span>
            </div>
            <div className="floating-note">
              <span className="note-icon">
                <Check size={15} />
              </span>
              <span>
                <strong>One lovely thing at a time</strong>
                <small>Your plan is taking shape</small>
              </span>
              <span className="note-progress">
                <i />
              </span>
            </div>
            <span className="hero-stamp" aria-hidden="true">
              made
              <br />
              with care
            </span>
          </div>
        </section>

        <section className="trust-strip" aria-label="Celebrai capabilities">
          <span>FOR THE DAYS THAT MATTER</span>
          <i /> Weddings <i /> Birthdays <i /> Neighbourhood gatherings <i /> Everything worth
          celebrating
        </section>

        <section className="pillars-section" id="how-it-works">
          <div className="section-heading">
            <div>
              <span className="eyebrow">The whole picture, gently in hand</span>
              <h2>
                Big feelings. <em>Clear plans.</em>
              </h2>
            </div>
            <p>Less juggling tabs. More time thinking about what makes this one yours.</p>
          </div>
          <div className="pillar-grid">
            {pillars.map(({ icon: Icon, title, text }, index) => (
              <article className="pillar-card" key={title}>
                <div className="pillar-top">
                  <span className={`pillar-icon pillar-${index}`}>
                    <Icon size={20} />
                  </span>
                  <span className="pillar-number" aria-hidden="true">
                    0{index + 1}
                  </span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="how-section" id="made-for">
          <div className="how-art">
            <img
              src="/celebration-cover.jpg"
              alt="Thoughtfully planned celebration day"
              loading="lazy"
              className="how-image"
              style={{ objectFit: 'cover' }}
            />
            <div className="tiny-calendar">
              <span>YOUR DAY</span>
              <strong>
                Thoughtfully
                <br />
                planned.
              </strong>
              <div className="calendar-row">
                <b>MON</b>
                <b>TUE</b>
                <b>WED</b>
                <b>THU</b>
                <b>FRI</b>
              </div>
              <div className="calendar-dots">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
          <div className="how-copy">
            <span className="eyebrow">From first thought to final toast</span>
            <h2>
              A plan that holds
              <br />
              the <em>important bits.</em>
            </h2>
            <ul className="how-list">
              <li>
                <span>
                  <Check size={14} />
                </span>{' '}
                Budgets that add up—and tell you when they don't.
              </li>
              <li>
                <span>
                  <Check size={14} />
                </span>{' '}
                Milestones with dates, not vague good intentions.
              </li>
              <li>
                <span>
                  <Check size={14} />
                </span>{' '}
                A vendor checklist, ready for the people you choose.
              </li>
              <li>
                <span>
                  <Check size={14} />
                </span>{' '}
                Personal ideas grounded in your real preferences.
              </li>
            </ul>
            <button className="button button-dark" onClick={onCreate}>
              Build your plan <ArrowRight size={16} />
            </button>
          </div>
        </section>

        <section className="closing-cta">
          <div className="closing-spark">
            <Sparkles size={20} />
          </div>
          <span className="eyebrow">Your people. Your reason. Your day.</span>
          <h2>
            Let's make it <em>feel like you.</em>
          </h2>
          <button className="button button-coral" onClick={onCreate}>
            Start with the good part <ArrowRight size={16} />
          </button>
        </section>
      </main>
      <footer className="landing-footer">
        <a className="brand" href="#top" aria-label="CelebrAI home" rel="noopener noreferrer">
          <span className="brand-mark">
            <Sparkles size={16} aria-hidden="true" />
          </span>
          <span className="brand-text">
            Celebr<span className="brand-ai">AI</span>
          </span>
        </a>
        <span>Thoughtful plans for meaningful moments.</span>
        <a href="#top" className="back-top" rel="noopener noreferrer" aria-label="Back to top">
          Back to top <ArrowDown size={13} aria-hidden="true" />
        </a>
      </footer>
    </div>
  )
}
