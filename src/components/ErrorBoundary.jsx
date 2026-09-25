/**
 * ErrorBoundary — React error boundary with secure error display.
 *
 * Security notes:
 * - Internal stack traces are NEVER surfaced to the user — only a safe
 *   generic message is shown in production.
 * - Full error details are logged to the console for developer debugging.
 * - The "Try Again" button resets the boundary without a full page reload.
 */

import React, { Component } from 'react';

/** @returns {boolean} True when running in a development build. */
const isDev = () => typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    /** @type {{ hasError: boolean, errorId: string|null }} */
    this.state = { hasError: false, errorId: null };
  }

  /**
   * Updates state so the next render shows the fallback UI.
   * @param {Error} _error
   * @returns {{ hasError: boolean, errorId: string }}
   */
  static getDerivedStateFromError(_error) {
    // Generate a short correlation ID so developers can cross-reference the
    // console error with what the user sees — without exposing any stack details.
    const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`;
    return { hasError: true, errorId };
  }

  /**
   * Logs full error + component stack to the console for developer debugging.
   * Never propagates raw error details into the rendered output.
   * @param {Error} error
   * @param {React.ErrorInfo} info
   */
  componentDidCatch(error, info) {
    console.error('[LexiGuard ErrorBoundary]', {
      errorId: this.state.errorId,
      message: error?.message,
      stack: isDev() ? error?.stack : '[stack hidden in production]',
      componentStack: isDev() ? info?.componentStack : '[hidden in production]',
    });
  }

  render() {
    if (this.state.hasError) {
      // Determine a safe, user-friendly message — no internal details leaked.
      const userMessage = isDev()
        ? 'A component error occurred. Check the browser console for details.'
        : 'An unexpected error occurred. Please try again.';

      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2rem' }} aria-hidden="true">⚠️</div>
          <h3 style={{ color: 'var(--risk-amber, #f59e0b)', margin: 0 }}>
            Something went wrong
          </h3>
          <p
            style={{
              color: 'var(--text-muted, #9ca3af)',
              fontSize: '0.875rem',
              maxWidth: '400px',
              margin: 0,
            }}
          >
            {userMessage}
          </p>
          {this.state.errorId && (
            <p
              style={{
                color: 'var(--text-muted, #6b7280)',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                margin: 0,
              }}
            >
              Ref: {this.state.errorId}
            </p>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => this.setState({ hasError: false, errorId: null })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
