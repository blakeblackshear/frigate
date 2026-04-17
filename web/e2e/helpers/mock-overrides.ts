/**
 * Per-test mock overrides for driving empty / loading / error states.
 *
 * Playwright route handlers are LIFO: the most recently registered handler
 * matching a URL takes precedence. The frigateApp fixture installs default
 * mocks before the test body runs, so these helpers — called inside the
 * test body — register AFTER the defaults and therefore win.
 *
 * Always call these BEFORE the navigation that triggers the request.
 *
 * Example:
 *   await mockEmpty(page, "**\/api\/exports**");
 *   await frigateApp.goto("/export");
 *   // Page now renders the empty state
 */

import type { Page } from "@playwright/test";

/** Return an empty array for the matched endpoint. */
export async function mockEmpty(
  page: Page,
  urlPattern: string | RegExp,
): Promise<void> {
  await page.route(urlPattern, (route) => route.fulfill({ json: [] }));
}

/** Return an HTTP error for the matched endpoint. Default status 500. */
export async function mockError(
  page: Page,
  urlPattern: string | RegExp,
  status = 500,
): Promise<void> {
  await page.route(urlPattern, (route) =>
    route.fulfill({
      status,
      json: { success: false, message: "Mocked error" },
    }),
  );
}

/**
 * Delay the response by `ms` milliseconds before fulfilling with the
 * provided body. Use to assert loading-state UI is visible during the
 * delay window.
 */
export async function mockDelay(
  page: Page,
  urlPattern: string | RegExp,
  ms: number,
  body: unknown = [],
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.fulfill({ json: body });
  });
}
