/**
 * Logs page tests -- MEDIUM tier.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("Logs Page @medium", () => {
  test("logs page renders without crash", async ({ frigateApp }) => {
    await frigateApp.goto("/logs");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("logs page has service toggle", async ({ frigateApp }) => {
    await frigateApp.goto("/logs");
    await frigateApp.page.waitForTimeout(2000);
    // Should have toggle buttons for frigate/go2rtc/nginx services
    const toggleGroup = frigateApp.page.locator('[role="group"]');
    const count = await toggleGroup.count();
    expect(count).toBeGreaterThan(0);
  });

  test("logs page shows log content", async ({ frigateApp }) => {
    await frigateApp.goto("/logs");
    await frigateApp.page.waitForTimeout(2000);
    // Should display some text content (our mock returns log lines)
    const text = await frigateApp.page.textContent("#pageRoot");
    expect(text?.length).toBeGreaterThan(0);
  });
});
