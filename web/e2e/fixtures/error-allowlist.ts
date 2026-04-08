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
 */

export const GLOBAL_ALLOWLIST: RegExp[] = [
  // No global entries yet. Add only after triaging which errors are
  // genuinely benign (e.g. dev-server pings) and which are real bugs.
];
