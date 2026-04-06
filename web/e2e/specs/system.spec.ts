/**
 * System page tests -- MEDIUM tier.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("System Page @medium", () => {
  test("system page renders without crash", async ({ frigateApp }) => {
    await frigateApp.goto("/system");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("system page has interactive controls", async ({ frigateApp }) => {
    await frigateApp.goto("/system");
    await frigateApp.page.waitForTimeout(2000);
    // Should have buttons for tab switching or other controls
    const buttons = frigateApp.page.locator("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("system page shows metrics content", async ({ frigateApp }) => {
    await frigateApp.goto("/system");
    await frigateApp.page.waitForTimeout(2000);
    const text = await frigateApp.page.textContent("#pageRoot");
    expect(text?.length).toBeGreaterThan(0);
  });
});
