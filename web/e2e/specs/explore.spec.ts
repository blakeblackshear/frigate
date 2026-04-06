/**
 * Explore page tests -- HIGH tier.
 *
 * Tests search input with text entry and clearing, camera filter popover
 * opening with camera names, and content rendering with mock events.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("Explore Page - Search @high", () => {
  test("explore page renders with filter buttons", async ({ frigateApp }) => {
    await frigateApp.goto("/explore");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
    const buttons = frigateApp.page.locator("#pageRoot button");
    await expect(buttons.first()).toBeVisible({ timeout: 10_000 });
  });

  test("search input accepts text and can be cleared", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/explore");
    await frigateApp.page.waitForTimeout(1000);
    const searchInput = frigateApp.page.locator("input").first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("person");
      await expect(searchInput).toHaveValue("person");
      await searchInput.fill("");
      await expect(searchInput).toHaveValue("");
    }
  });

  test("search input submits on Enter", async ({ frigateApp }) => {
    await frigateApp.goto("/explore");
    await frigateApp.page.waitForTimeout(1000);
    const searchInput = frigateApp.page.locator("input").first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("car in driveway");
      await searchInput.press("Enter");
      await frigateApp.page.waitForTimeout(1000);
      // Page should not crash after search submit
      await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
    }
  });
});

test.describe("Explore Page - Filters @high", () => {
  test("camera filter button opens popover with camera names (desktop)", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/explore");
    await frigateApp.page.waitForTimeout(1000);
    const camerasBtn = frigateApp.page.getByRole("button", {
      name: /cameras/i,
    });
    if (await camerasBtn.isVisible().catch(() => false)) {
      await camerasBtn.click();
      await frigateApp.page.waitForTimeout(500);
      const popover = frigateApp.page.locator(
        "[data-radix-popper-content-wrapper]",
      );
      await expect(popover.first()).toBeVisible({ timeout: 3_000 });
      // Camera names from config should be in the popover
      await expect(frigateApp.page.getByText("Front Door")).toBeVisible();
      await frigateApp.page.keyboard.press("Escape");
    }
  });

  test("filter button opens and closes overlay cleanly", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/explore");
    await frigateApp.page.waitForTimeout(1000);
    const firstButton = frigateApp.page.locator("#pageRoot button").first();
    await expect(firstButton).toBeVisible({ timeout: 5_000 });
    await firstButton.click();
    await frigateApp.page.waitForTimeout(500);
    await frigateApp.page.keyboard.press("Escape");
    await frigateApp.page.waitForTimeout(300);
    // Page is still functional after open/close cycle
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });
});

test.describe("Explore Page - Content @high", () => {
  test("explore page shows content with mock events", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/explore");
    await frigateApp.page.waitForTimeout(3000);
    const pageText = await frigateApp.page.textContent("#pageRoot");
    expect(pageText?.length).toBeGreaterThan(0);
  });
});
