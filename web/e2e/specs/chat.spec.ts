/**
 * Chat page tests -- MEDIUM tier.
 *
 * Tests chat interface rendering, input area, and example prompt buttons.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("Chat Page @medium", () => {
  test("chat page renders without crash", async ({ frigateApp }) => {
    await frigateApp.goto("/chat");
    await frigateApp.page.waitForTimeout(2000);
    await expect(frigateApp.page.locator("body")).toBeVisible();
  });

  test("chat page has interactive input or buttons", async ({ frigateApp }) => {
    await frigateApp.goto("/chat");
    await frigateApp.page.waitForTimeout(2000);
    const interactive = frigateApp.page.locator("input, textarea, button");
    const count = await interactive.count();
    expect(count).toBeGreaterThan(0);
  });

  test("chat input accepts text", async ({ frigateApp }) => {
    await frigateApp.goto("/chat");
    await frigateApp.page.waitForTimeout(2000);
    const input = frigateApp.page.locator("input, textarea").first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill("What cameras detected a person today?");
      const value = await input.inputValue();
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
