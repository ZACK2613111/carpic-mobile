// Central crash / error-reporting seam.
//
// Call sites (the route error boundary, swallowed-but-notable failures) go
// through captureException/captureMessage so we report from ONE place. Today the
// sink just logs in dev; wiring Sentry is implementing `setReporter(...)` once
// (install @sentry/react-native + init in _layout) — no call site changes. This
// mirrors the app's swappable-engine pattern and keeps the native SDK out of the
// build until it's actually validated on a device (Phase 2).

type Extra = Record<string, unknown>;

export type Reporter = {
  captureException: (error: unknown, extra?: Extra) => void;
  captureMessage: (message: string, extra?: Extra) => void;
};

const consoleReporter: Reporter = {
  captureException: (error) => {
    if (__DEV__) console.warn('[report] exception', error);
  },
  captureMessage: (message, extra) => {
    if (__DEV__) console.warn('[report]', message, extra ?? '');
  },
};

let reporter: Reporter = consoleReporter;

/** Swap in a real backend (e.g. a Sentry adapter) at startup. */
export function setReporter(next: Reporter): void {
  reporter = next;
}

export function captureException(error: unknown, extra?: Extra): void {
  reporter.captureException(error, extra);
}

export function captureMessage(message: string, extra?: Extra): void {
  reporter.captureMessage(message, extra);
}
