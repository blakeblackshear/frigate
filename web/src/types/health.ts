import type { ReactNode } from "react";

export type HealthSeverity = "error" | "warning" | "info";

/**
 * One row in the Health tab's Notices list. Every source (registry notices
 * now, live stats, config checks, and stream checks in PR 2) maps into this
 * shape so the row component never needs to know where a problem came from.
 */
export type HealthProblem = {
  id: string;
  severity: HealthSeverity;
  /** camera name or other scope shown as a chip before the text */
  scope?: string;
  /** whether scope is a camera name, so the chip can use the friendly name */
  scopeIsCamera?: boolean;
  text: string;
  /** muted line under the text, for example when it was first seen */
  meta?: ReactNode;
  /** in-app route for a settings icon link */
  link?: string;
  /** docs path for an external link, rendered in PR 2 */
  docLink?: string;
  /** absolute URL rendered as an external link (the update notice's release page) */
  externalLink?: string;
  onDismiss?: () => void;
};
