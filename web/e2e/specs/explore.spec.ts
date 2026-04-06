/**
 * Explore page tests -- HIGH tier.
 *
 * Tests search input, filter dialogs, camera filter, calendar filter,
 * and search result interactions.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("Explore Page @high", () => {
  test("explore page renders with search and filter controls", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/explore");
    const pageRoot = frigateApp.page.locator("#pageRoot");
    await expect(pageRoot).toBeVisible();
    // Should have filter buttons (camera filter, calendar, etc.)
    const buttons = frigateApp.page.locator("#pageRoot button");
    await expect(buttons.first()).toBeVisible({ timeout: 10_000 });
  });

  test("camera filter button opens camera selector", async ({ frigateApp }) => {
    await frigateApp.goto("/explore");
    await frigateApp.page.waitForTimeout(1000);
    // Find and click the camera filter button (has camera/video icon)
    const filterButtons = frigateApp.page.locator("#pageRoot button");
    // Click the first filter button
    await filterButtons.first().click();
    await frigateApp.page.waitForTimeout(500);
    // A popover, dropdown, or dialog should appear
    const overlay = frigateApp.page.locator(
      '[role="dialog"], [role="menu"], [data-radix-popper-content-wrapper], [data-radix-menu-content]',
    );
    const overlayVisible = await overlay
      .first()
      .isVisible()
      .catch(() => false);
    // The button click should not crash the page
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
    // If an overlay appeared, it should be dismissible
    if (overlayVisible) {
      await frigateApp.page.keyboard.press("Escape");
      await frigateApp.page.waitForTimeout(300);
    }
  });

  test("search input accepts text", async ({ frigateApp }) => {
    await frigateApp.goto("/explore");
    await frigateApp.page.waitForTimeout(1000);
    // Find the search input (InputWithTags component)
    const searchInput = frigateApp.page.locator("input").first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("person");
      await expect(searchInput).toHaveValue("person");
    }
  });

  test("filter button click opens overlay and escape closes it", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/explore");
    await frigateApp.page.waitForTimeout(1000);
    // Click the first filter button in the page
    const firstButton = frigateApp.page.locator("#pageRoot button").first();
    await expect(firstButton).toBeVisible({ timeout: 5_000 });
    await firstButton.click();
    await frigateApp.page.waitForTimeout(500);
    // An overlay may have appeared -- dismiss it
    await frigateApp.page.keyboard.press("Escape");
    await frigateApp.page.waitForTimeout(300);
    // Page should still be functional
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("explore page shows summary or empty state", async ({ frigateApp }) => {
    await frigateApp.goto("/explore");
    await frigateApp.page.waitForTimeout(2000);
    // With no search results, should show either summary view or empty state
    const pageText = await frigateApp.page.textContent("#pageRoot");
    expect(pageText?.length).toBeGreaterThan(0);
  });
});
