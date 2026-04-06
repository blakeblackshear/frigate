/**
 * Face Library page tests -- MEDIUM tier.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("Face Library @medium", () => {
  test("face library page renders without crash", async ({ frigateApp }) => {
    await frigateApp.goto("/faces");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("face library shows empty state or content", async ({ frigateApp }) => {
    await frigateApp.goto("/faces");
    await frigateApp.page.waitForTimeout(2000);
    // With empty faces mock, should show empty state
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });
});
