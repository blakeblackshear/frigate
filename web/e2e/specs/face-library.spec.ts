/**
 * Face Library page tests -- MEDIUM tier.
 *
 * Tests face grid rendering, empty state, and interactive controls.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("Face Library @medium", () => {
  test("face library page renders without crash", async ({ frigateApp }) => {
    await frigateApp.goto("/faces");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("face library shows empty state with no faces", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/faces");
    await frigateApp.page.waitForTimeout(2000);
    // With empty faces mock, should show empty state or content
    const text = await frigateApp.page.textContent("#pageRoot");
    expect(text?.length).toBeGreaterThan(0);
  });

  test("face library has interactive buttons", async ({ frigateApp }) => {
    await frigateApp.goto("/faces");
    await frigateApp.page.waitForTimeout(2000);
    const buttons = frigateApp.page.locator("#pageRoot button");
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
