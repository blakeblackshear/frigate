/**
 * Replay page tests -- LOW tier.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("Replay Page @low", () => {
  test("replay page renders without crash", async ({ frigateApp }) => {
    await frigateApp.goto("/replay");
    await frigateApp.page.waitForTimeout(2000);
    await expect(frigateApp.page.locator("body")).toBeVisible();
  });
});
