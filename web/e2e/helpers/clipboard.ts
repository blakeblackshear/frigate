/**
 * Clipboard read helper for e2e tests.
 *
 * Clipboard API requires a browser permission in headless mode.
 * grantClipboardPermissions() must be called before any readClipboard()
 * attempt. Used by logs.spec.ts (Copy button) and config-editor.spec.ts
 * (Copy button).
 */

import type { BrowserContext, Page } from "@playwright/test";

/**
 * Grant clipboard-read + clipboard-write permissions on the context.
 * Call in beforeEach or at the top of a test before the Copy action.
 */
export async function grantClipboardPermissions(
  context: BrowserContext,
): Promise<void> {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
}

/** Read the current clipboard contents via the page's navigator.clipboard. */
export async function readClipboard(page: Page): Promise<string> {
  return page.evaluate(async () => await navigator.clipboard.readText());
}
