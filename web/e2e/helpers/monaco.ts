/**
 * Monaco editor DOM helpers for e2e tests.
 *
 * Monaco is imported as a module-local object in the app and is NOT
 * exposed on window; we drive + read through the rendered DOM and
 * keyboard instead. Used by config-editor.spec.ts only.
 */

import { expect, type Page } from "@playwright/test";

/**
 * Returns the current visible text of the first Monaco editor on the
 * page. Monaco virtualizes long files — this reads only the rendered
 * lines. For short configs (our mocks) that's the full content.
 */
export async function getMonacoVisibleText(page: Page): Promise<string> {
  return page.locator(".monaco-editor .view-lines").first().innerText();
}

/**
 * Focus the editor and replace its full content with `value` via
 * keyboard. Uses Ctrl+A (Cmd+A on macOS Playwright is equivalent)
 * + Delete + type. Works cross-platform because Playwright normalizes.
 */
export async function replaceMonacoValue(
  page: Page,
  value: string,
): Promise<void> {
  const editor = page.locator(".monaco-editor").first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  // Use `type` with zero delay — Monaco handles each key.
  await page.keyboard.type(value, { delay: 0 });
}

/**
 * Returns true when the editor shows at least one error-severity
 * marker. Monaco renders error underlines as `.squiggly-error` in
 * the `.view-overlays` layer.
 */
export async function hasErrorMarkers(page: Page): Promise<boolean> {
  const count = await page.locator(".monaco-editor .squiggly-error").count();
  return count > 0;
}

/**
 * Poll until an error marker appears. Monaco schedules marker updates
 * asynchronously after content changes (debounce + schema validation).
 */
export async function waitForErrorMarker(
  page: Page,
  timeoutMs: number = 10_000,
): Promise<void> {
  await expect
    .poll(() => hasErrorMarkers(page), { timeout: timeoutMs })
    .toBe(true);
}
