/**
 * Classification page tests -- MEDIUM tier.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("Classification @medium", () => {
  test("classification page renders without crash", async ({ frigateApp }) => {
    await frigateApp.goto("/classification");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("classification page shows content", async ({ frigateApp }) => {
    await frigateApp.goto("/classification");
    await frigateApp.page.waitForTimeout(2000);
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });
});
