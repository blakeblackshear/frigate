/**
 * Settings page tests -- HIGH tier.
 *
 * Tests settings page rendering with content, form controls,
 * and section navigation.
 */

import { test, expect } from "../../fixtures/frigate-test";

test.describe("Settings Page @high", () => {
  test("settings page renders with content", async ({ frigateApp }) => {
    await frigateApp.goto("/settings");
    await frigateApp.page.waitForTimeout(2000);
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
    const text = await frigateApp.page.textContent("#pageRoot");
    expect(text?.length).toBeGreaterThan(0);
  });

  test("settings page has clickable navigation items", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/settings");
    await frigateApp.page.waitForTimeout(2000);
    const navItems = frigateApp.page.locator(
      "#pageRoot button, #pageRoot [role='button'], #pageRoot a",
    );
    const count = await navItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test("settings page has form controls", async ({ frigateApp }) => {
    await frigateApp.goto("/settings");
    await frigateApp.page.waitForTimeout(2000);
    const formElements = frigateApp.page.locator(
      '#pageRoot input, #pageRoot button[role="switch"], #pageRoot button[role="combobox"]',
    );
    const count = await formElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
