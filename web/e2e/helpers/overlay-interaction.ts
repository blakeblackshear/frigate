/**
 * Overlay interaction helpers for Radix-based UI tests.
 *
 * These helpers exist to guard the class of bugs fixed by de-duping
 * `@radix-ui/react-dismissable-layer` across the tree: body pointer-events
 * getting stuck, dropdown typeahead breaking, tooltips re-popping after a
 * dropdown closes, and related nested-overlay regressions.
 */

import { expect, type Page } from "@playwright/test";

/**
 * Assert that `<body>` is interactive (no stuck `pointer-events: none`).
 *
 * Call after closing any overlay. This is the fast secondary assertion —
 * test specs should also assert a user-visible behavior like "a button
 * responded to a click" so the test fails on meaningful breakage rather
 * than just a CSS invariant.
 */
export async function expectBodyInteractive(page: Page) {
  const stuck = await page.evaluate(
    () => document.body.style.pointerEvents === "none",
  );
  expect(stuck, "body.style.pointer-events stuck after overlay close").toBe(
    false,
  );
}

/**
 * Wait until the `<body>` is no longer marked with `pointer-events: none`.
 *
 * Useful right after closing an overlay when Radix's cleanup runs in the
 * next frame. Throws if the style does not clear within `timeoutMs`.
 */
export async function waitForBodyInteractive(page: Page, timeoutMs = 2000) {
  await page.waitForFunction(
    () => document.body.style.pointerEvents !== "none",
    null,
    { timeout: timeoutMs },
  );
}
