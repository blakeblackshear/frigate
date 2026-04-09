/**
 * Self-tests for the error collector fixture itself.
 *
 * These guard against future regressions in the safety net. Each test
 * deliberately triggers (or avoids triggering) an error to verify the
 * collector behaves correctly. Tests that expect to fail use the
 * `expectedErrors` fixture parameter to allowlist their own errors.
 */

import { test, expect } from "../../fixtures/frigate-test";

// test.use applies to a whole describe block in Playwright, so each test
// that needs a custom allowlist gets its own describe.

test.describe("Error Collector — clean @meta", () => {
  test("clean page passes", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    // No errors triggered. The fixture teardown should not throw.
  });
});

test.describe("Error Collector — unallowlisted console error fails @meta", () => {
  test("console.error fails the test when not allowlisted", async ({
    page,
    frigateApp,
  }) => {
    test.skip(
      process.env.E2E_STRICT_ERRORS !== "1",
      "Requires E2E_STRICT_ERRORS=1 to assert failure",
    );
    test.fail(); // We expect the fixture teardown to throw
    await frigateApp.goto("/");
    await page.evaluate(() => {
      // eslint-disable-next-line no-console
      console.error("UNEXPECTED_DELIBERATE_TEST_ERROR_xyz123");
    });
  });
});

test.describe("Error Collector — allowlisted console error passes @meta", () => {
  test.use({ expectedErrors: [/ALLOWED_DELIBERATE_TEST_ERROR_xyz123/] });

  test("console.error is silenced when allowlisted via expectedErrors", async ({
    page,
    frigateApp,
  }) => {
    await frigateApp.goto("/");
    await page.evaluate(() => {
      // eslint-disable-next-line no-console
      console.error("ALLOWED_DELIBERATE_TEST_ERROR_xyz123");
    });
  });
});

test.describe("Error Collector — uncaught pageerror fails @meta", () => {
  test("uncaught pageerror fails the test", async ({ page, frigateApp }) => {
    test.skip(
      process.env.E2E_STRICT_ERRORS !== "1",
      "Requires E2E_STRICT_ERRORS=1 to assert failure",
    );
    test.fail();
    await frigateApp.goto("/");
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error("UNCAUGHT_DELIBERATE_TEST_ERROR_xyz789");
      }, 0);
    });
    // Wait a frame to let the throw propagate before fixture teardown.
    // The marker below silences the e2e:lint banned-pattern check on this line.
    await page.waitForTimeout(100); // e2e-lint-allow: deliberate; need to await async throw
  });
});

test.describe("Error Collector — 5xx fails @meta", () => {
  test("same-origin 5xx response fails the test", async ({
    page,
    frigateApp,
  }) => {
    test.skip(
      process.env.E2E_STRICT_ERRORS !== "1",
      "Requires E2E_STRICT_ERRORS=1 to assert failure",
    );
    test.fail();
    await page.route("**/api/version", (route) =>
      route.fulfill({ status: 500, body: "boom" }),
    );
    await frigateApp.goto("/");
    await page.evaluate(() => fetch("/api/version").catch(() => {}));
    // Give the response listener a microtask to fire
    await expect.poll(async () => true).toBe(true);
  });
});

test.describe("Error Collector — allowlisted 5xx passes @meta", () => {
  // Use a single alternation regex so test.use() receives a 1-element array.
  // Playwright's isFixtureTuple() treats any [value, object] pair as a fixture
  // tuple, so a 2-element array whose second item is a RegExp would be
  // misinterpreted as [defaultValue, options]. Both the request collector
  // error ("500 … /api/version") and the browser console error
  // ("Failed to load resource … 500") are matched by the alternation below.
  test.use({
    expectedErrors: [/500.*\/api\/version|Failed to load resource.*500/],
  });

  test("allowlisted 5xx passes", async ({ page, frigateApp }) => {
    await page.route("**/api/version", (route) =>
      route.fulfill({ status: 500, body: "boom" }),
    );
    await frigateApp.goto("/");
    await page.evaluate(() => fetch("/api/version").catch(() => {}));
  });
});
