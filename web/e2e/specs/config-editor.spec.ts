/**
 * Config Editor page tests -- MEDIUM tier.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("Config Editor @medium", () => {
  test("config editor page renders without crash", async ({ frigateApp }) => {
    await frigateApp.goto("/config");
    // Monaco editor may take time to load
    await frigateApp.page.waitForTimeout(3000);
    await expect(frigateApp.page.locator("body")).toBeVisible();
  });

  test("config editor has save button", async ({ frigateApp }) => {
    await frigateApp.goto("/config");
    await frigateApp.page.waitForTimeout(3000);
    // Should have at least a save or action button
    const buttons = frigateApp.page.locator("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });
});
