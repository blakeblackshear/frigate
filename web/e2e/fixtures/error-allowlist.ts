/**
 * Global allowlist of regex patterns that the error collector ignores.
 *
 * Each entry MUST include a comment explaining what it silences and why.
 * The allowlist is filtered at collection time, so failure messages list
 * only unfiltered errors.
 *
 * Per-spec additions go through the `expectedErrors` test fixture parameter
 * (see error-collector.ts), not by editing this file. That keeps allowlist
 * drift visible per-PR rather than buried in shared infrastructure.
 *
 * NOTE ON CONSOLE vs REQUEST ERRORS:
 * When a network request returns a 5xx response, the browser emits two
 * events that the error collector captures:
 *   [request] "500 Internal Server Error <url>"  — from onResponse (URL included)
 *   [console] "Failed to load resource: ..."     — from onConsole (URL NOT included)
 *
 * The request-level message includes the URL, so those patterns are specific.
 * The console-level message text (from ConsoleMessage.text()) does NOT include
 * the URL — the URL is stored separately in e.url. Therefore the console
 * pattern for HTTP 500s cannot be URL-discriminated, and a single pattern
 * covers all such browser echoes. This is safe because every such console
 * error is already caught (and specifically matched) by its paired [request]
 * entry below.
 */

export const GLOBAL_ALLOWLIST: RegExp[] = [
  // -------------------------------------------------------------------------
  // Browser echo of HTTP 5xx responses (console mirror of [request] events).
  //
  // Whenever the browser receives a 5xx response it emits a console error:
  //   "Failed to load resource: the server responded with a status of 500
  //    (Internal Server Error)"
  // The URL is NOT part of ConsoleMessage.text() — it is stored separately.
  // Every console error of this form is therefore paired with a specific
  // [request] 500 entry below that names the exact endpoint. Allowlisting
  // this pattern here silences the browser echo; the request-level entries
  // enforce specificity.
  // -------------------------------------------------------------------------
  /Failed to load resource: the server responded with a status of 500/,

  // -------------------------------------------------------------------------
  // Mock infrastructure gaps — API endpoints not yet covered by ApiMocker.
  //
  // These produce 500s because Vite's preview server has no handler for them.
  // Each is a TODO(real-bug): the mock should be extended so these endpoints
  // return sensible fixture data in tests.
  //
  // Only [request] patterns are listed here; the paired [console] mirror is
  // covered by the "Failed to load resource" entry above.
  // -------------------------------------------------------------------------

  // TODO(real-bug): ApiMocker registers "**/api/reviews**" (plural) but the
  // app fetches /api/review (singular) for the review list and timeline.
  // Affects: review.spec.ts, navigation.spec.ts, live.spec.ts, auth.spec.ts.
  // Fix: add route handlers for /api/review and /api/review/** in api-mocker.ts.
  /500 Internal Server Error.*\/api\/review(\?|\/|$)/,

  // TODO(real-bug): /api/stats/history is not mocked; the system page fetches
  // it for the detector/process history charts.
  // Fix: add route handler for /api/stats/history in api-mocker.ts.
  /500 Internal Server Error.*\/api\/stats\/history/,

  // TODO(real-bug): /api/event_ids is not mocked; the explore/search page
  // fetches it to resolve event IDs for display.
  // Fix: add route handler for /api/event_ids in api-mocker.ts.
  /500 Internal Server Error.*\/api\/event_ids/,

  // TODO(real-bug): /api/sub_labels?split_joined=1 returns 500; the mock
  // registers "**/api/sub_labels" which may not match when a query string is
  // present, or route registration order causes the catch-all to win first.
  // Fix: change the mock route to "**/api/sub_labels**" in api-mocker.ts.
  /500 Internal Server Error.*\/api\/sub_labels/,

  // TODO(real-bug): MediaMocker handles /api/*/latest.jpg but the app also
  // requests /api/*/latest.webp (webp format) for camera snapshots.
  // Affects: live.spec.ts, review.spec.ts, auth.spec.ts, navigation.spec.ts.
  // Fix: add route handler for /api/*/latest.webp in MediaMocker.install().
  /500 Internal Server Error.*\/api\/[^/]+\/latest\.webp/,
  /failed: net::ERR_ABORTED.*\/api\/[^/]+\/latest\.webp/,

  // -------------------------------------------------------------------------
  // Mock infrastructure gap — WebSocket streams.
  //
  // Playwright's page.route() does not intercept WebSocket connections.
  // The jsmpeg live-stream WS connections to /live/jsmpeg/* always fail
  // with a 500 handshake error because the Vite preview server has no WS
  // handler. TODO(real-bug): add WsMocker support for jsmpeg WebSocket
  // connections, or suppress the connection attempt in the test environment.
  // Affects: live.spec.ts (single camera view), auth.spec.ts.
  // -------------------------------------------------------------------------
  /WebSocket connection to '.*\/live\/jsmpeg\/.*' failed/,

  // -------------------------------------------------------------------------
  // Benign — lazy-loaded chunk aborts during navigation.
  //
  // When a test navigates away from a page while the browser is still
  // fetching lazily-split JS/CSS asset chunks, the in-flight fetch is
  // cancelled (net::ERR_ABORTED). This is normal browser behaviour on
  // navigation and does not indicate a real error; the assets load fine
  // on a stable connection.
  // -------------------------------------------------------------------------
  /failed: net::ERR_ABORTED.*\/assets\//,

  // -------------------------------------------------------------------------
  // Real app bug — Radix UI DialogContent missing accessible title.
  //
  // TODO(real-bug): A dialog somewhere in the app renders <DialogContent>
  // without a <DialogTitle>, violating Radix UI's accessibility contract.
  // The warning originates from the bundled main-*.js. Investigate which
  // dialog component is missing the title and add a VisuallyHidden DialogTitle.
  // Likely candidate: face-library or search-detail dialog in explore page.
  // See: https://radix-ui.com/primitives/docs/components/dialog
  // -------------------------------------------------------------------------
  /`DialogContent` requires a `DialogTitle`/,
];
