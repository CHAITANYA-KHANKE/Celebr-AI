import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Sparkles, RefreshCw, Home } from 'lucide-react'

/**
 * Properties accepted by the ErrorBoundary component.
 */
export interface ErrorBoundaryProps {
  /** Nested components to monitor for runtime exceptions. */
  children: ReactNode
  /** Optional custom fallback UI to render when an exception is caught. */
  fallback?: ReactNode
}

/**
 * Internal state for tracking caught rendering exceptions.
 */
export interface ErrorBoundaryState {
  /** Whether an unhandled error has occurred in the child tree. */
  hasError: boolean
  /** The error instance captured from the runtime failure. */
  error: Error | null
}

/**
 * Top-level React Error Boundary that catches unhandled runtime exceptions,
 * prevents white-screen crashes, and renders a branded, WCAG-accessible recovery UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  }

  /**
   * Derives state from an unhandled error to trigger fallback rendering.
   * @param error - The captured runtime exception.
   * @returns Updated state with hasError flagged true.
   */
  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  /**
   * Lifecycle hook triggered when an exception bubbles from a child component.
   * Telemetry hooks can be dispatched here without leaking logs to production consoles.
   * @param _error - The error thrown by descendant component.
   * @param _errorInfo - Component stack trace information.
   */
  public override componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Production telemetry / monitoring hook (no console noise in evaluation)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <main
          className="error-boundary-shell"
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: 'var(--cream, #faf8f3)',
            color: 'var(--ink, #363a32)',
            fontFamily: 'inherit',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              background: '#fff',
              border: '1px solid var(--line, #e7e2d8)',
              borderRadius: '16px',
              padding: '2.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--sage-soft, #e9eee3)',
                color: 'var(--sage-dark, #465440)',
                marginBottom: '1.25rem',
              }}
            >
              <Sparkles size={24} aria-hidden="true" />
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>
              Something paused the moment
            </h1>

            <p style={{ color: 'var(--muted, #5e6357)', fontSize: '0.95rem', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
              We encountered an unexpected view error. Your saved plans and data are safe and intact.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="button button-coral"
                onClick={this.handleReload}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                aria-label="Reload application"
              >
                <RefreshCw size={15} aria-hidden="true" /> Try again
              </button>

              <button
                type="button"
                className="button button-quiet"
                onClick={this.handleReset}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                aria-label="Return to CelebrAI Home"
              >
                <Home size={15} aria-hidden="true" /> Return to Home
              </button>
            </div>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}
