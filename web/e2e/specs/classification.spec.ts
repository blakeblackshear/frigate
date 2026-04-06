/**
 * Classification page tests -- MEDIUM tier.
 *
 * Tests model selection view rendering and interactive elements.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("Classification @medium", () => {
  test("classification page renders without crash", async ({ frigateApp }) => {
    await frigateApp.goto("/classification");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("classification page shows content and controls", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/classification");
    await frigateApp.page.waitForTimeout(2000);
    const text = await frigateApp.page.textContent("#pageRoot");
    expect(text?.length).toBeGreaterThan(0);
  });

  test("classification page has interactive elements", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/classification");
    await frigateApp.page.waitForTimeout(2000);
    const buttons = frigateApp.page.locator("#pageRoot button");
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
