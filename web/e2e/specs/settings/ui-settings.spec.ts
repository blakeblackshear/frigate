/**
 * Settings page tests -- HIGH tier.
 *
 * Tests the Settings page renders without crash and
 * basic navigation between settings sections.
 */

import { test, expect } from "../../fixtures/frigate-test";

test.describe("Settings Page @high", () => {
  test("settings page renders without crash", async ({ frigateApp }) => {
    await frigateApp.goto("/settings");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("settings page has navigation sections", async ({ frigateApp }) => {
    await frigateApp.goto("/settings");
    await frigateApp.page.waitForTimeout(2000);
    // Should have sidebar navigation or section links
    const buttons = frigateApp.page.locator("button, a");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("settings page shows content", async ({ frigateApp }) => {
    await frigateApp.goto("/settings");
    await frigateApp.page.waitForTimeout(2000);
    // The page should have meaningful content
    const text = await frigateApp.page.textContent("#pageRoot");
    expect(text?.length).toBeGreaterThan(0);
  });
});
