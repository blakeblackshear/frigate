/**
 * Replay page tests -- LOW tier.
 *
 * Tests replay page rendering and basic interactivity.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("Replay Page @low", () => {
  test("replay page renders without crash", async ({ frigateApp }) => {
    await frigateApp.goto("/replay");
    await frigateApp.page.waitForTimeout(2000);
    await expect(frigateApp.page.locator("body")).toBeVisible();
  });

  test("replay page has interactive controls", async ({ frigateApp }) => {
    await frigateApp.goto("/replay");
    await frigateApp.page.waitForTimeout(2000);
    const buttons = frigateApp.page.locator("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });
});
