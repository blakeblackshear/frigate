/**
 * Self-tests for the mock override helpers. Verifies each helper
 * intercepts the matched URL and returns the expected payload/status.
 */

import { test, expect } from "../../fixtures/frigate-test";
import {
  mockEmpty,
  mockError,
  mockDelay,
} from "../../helpers/mock-overrides";

test.describe("Mock Overrides — empty @meta", () => {
  test("mockEmpty returns []", async ({ page, frigateApp }) => {
    await mockEmpty(page, "**/api/__meta_test__");
    await frigateApp.goto("/");
    const result = await page.evaluate(async () => {
      const r = await fetch("/api/__meta_test__");
      return { status: r.status, body: await r.json() };
    });
    expect(result.status).toBe(200);
    expect(result.body).toEqual([]);
  });
});

test.describe("Mock Overrides — error default @meta", () => {
  // Match both the collected request error and the browser's console echo.
  // Using a single alternation regex avoids Playwright's isFixtureTuple
  // collision with multi-element RegExp arrays.
  test.use({
    expectedErrors: [/500.*__meta_test__|Failed to load resource.*500/],
  });

  test("mockError returns 500 by default", async ({ page, frigateApp }) => {
    await mockError(page, "**/api/__meta_test__");
    await frigateApp.goto("/");
    const status = await page.evaluate(async () => {
      const r = await fetch("/api/__meta_test__");
      return r.status;
    });
    expect(status).toBe(500);
  });
});

test.describe("Mock Overrides — error custom status @meta", () => {
  // The browser emits a "Failed to load resource" console.error for 404s,
  // which the error collector catches even though 404 is not a 5xx.
  test.use({
    expectedErrors: [/Failed to load resource.*404|404.*__meta_test_404__/],
  });

  test("mockError accepts a custom status", async ({ page, frigateApp }) => {
    await mockError(page, "**/api/__meta_test_404__", 404);
    await frigateApp.goto("/");
    const status = await page.evaluate(async () => {
      const r = await fetch("/api/__meta_test_404__");
      return r.status;
    });
    expect(status).toBe(404);
  });
});

test.describe("Mock Overrides — delay @meta", () => {
  test("mockDelay delays response by the requested ms", async ({
    page,
    frigateApp,
  }) => {
    await mockDelay(page, "**/api/__meta_test_delay__", 300, ["delayed"]);
    await frigateApp.goto("/");
    const elapsed = await page.evaluate(async () => {
      const start = performance.now();
      await fetch("/api/__meta_test_delay__");
      return performance.now() - start;
    });
    expect(elapsed).toBeGreaterThanOrEqual(250);
  });
});
