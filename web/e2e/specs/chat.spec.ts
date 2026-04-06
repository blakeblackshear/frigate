/**
 * Chat page tests -- MEDIUM tier.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("Chat Page @medium", () => {
  test("chat page renders without crash", async ({ frigateApp }) => {
    await frigateApp.goto("/chat");
    await frigateApp.page.waitForTimeout(2000);
    await expect(frigateApp.page.locator("body")).toBeVisible();
  });

  test("chat page has interactive elements", async ({ frigateApp }) => {
    await frigateApp.goto("/chat");
    await frigateApp.page.waitForTimeout(2000);
    // Should have interactive elements (input, textarea, or buttons)
    const interactive = frigateApp.page.locator("input, textarea, button");
    const count = await interactive.count();
    expect(count).toBeGreaterThan(0);
  });
});
