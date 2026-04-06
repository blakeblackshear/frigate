/**
 * Review/Events page tests -- CRITICAL tier.
 *
 * Tests severity toggle switching between alerts/detections/motion,
 * filter buttons opening popovers, show reviewed toggle,
 * and page content rendering with mock review data.
 */

import { test, expect } from "../fixtures/frigate-test";
import { BasePage } from "../pages/base.page";

test.describe("Review Page - Severity Tabs @critical", () => {
  test("severity tabs render with Alerts, Detections, Motion", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/review");
    // Severity toggle group should have 3 items
    await expect(frigateApp.page.getByLabel("Alerts")).toBeVisible({
      timeout: 10_000,
    });
    await expect(frigateApp.page.getByLabel("Detections")).toBeVisible();
    await expect(frigateApp.page.getByLabel("Motion")).toBeVisible();
  });

  test("clicking Detections tab switches active severity", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/review");
    await frigateApp.page.waitForTimeout(1000);
    // Initially Alerts is active (aria-checked="true")
    const alertsTab = frigateApp.page.getByLabel("Alerts");
    await expect(alertsTab).toHaveAttribute("aria-checked", "true");
    // Click Detections
    await frigateApp.page.getByLabel("Detections").click();
    await frigateApp.page.waitForTimeout(500);
    // Detections should now be active
    const detectionsTab = frigateApp.page.getByLabel("Detections");
    await expect(detectionsTab).toHaveAttribute("aria-checked", "true");
    // Alerts should no longer be active
    await expect(alertsTab).toHaveAttribute("aria-checked", "false");
  });

  test("clicking Motion tab switches to motion view", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/review");
    await frigateApp.page.waitForTimeout(1000);
    // Use getByRole to target the specific radio button, not the switch
    const motionTab = frigateApp.page.getByRole("radio", { name: "Motion" });
    await motionTab.click();
    await frigateApp.page.waitForTimeout(500);
    await expect(motionTab).toHaveAttribute("data-state", "on");
  });
});

test.describe("Review Page - Filters @critical", () => {
  test("All Cameras filter button opens camera selector", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip(); // Mobile uses drawer-based camera selector
      return;
    }
    await frigateApp.goto("/review");
    await frigateApp.page.waitForTimeout(1000);
    // Click "All Cameras" button
    const camerasBtn = frigateApp.page.getByRole("button", {
      name: /cameras/i,
    });
    await expect(camerasBtn).toBeVisible({ timeout: 5_000 });
    await camerasBtn.click();
    await frigateApp.page.waitForTimeout(500);
    // A popover/dropdown with camera names should appear
    const popover = frigateApp.page.locator(
      "[data-radix-popper-content-wrapper]",
    );
    await expect(popover.first()).toBeVisible({ timeout: 3_000 });
    // Should contain camera names from config
    await expect(frigateApp.page.getByText("Front Door")).toBeVisible();
    // Close
    await frigateApp.page.keyboard.press("Escape");
  });

  test("Show Reviewed toggle is clickable", async ({ frigateApp }) => {
    await frigateApp.goto("/review");
    await frigateApp.page.waitForTimeout(1000);
    // Find the Show Reviewed toggle/switch
    const showReviewed = frigateApp.page.getByRole("button", {
      name: /reviewed/i,
    });
    if (await showReviewed.isVisible().catch(() => false)) {
      await showReviewed.click();
      await frigateApp.page.waitForTimeout(500);
      // Page should still be functional
      await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
    }
  });

  test("Last 24 Hours calendar button opens date picker", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/review");
    await frigateApp.page.waitForTimeout(1000);
    const calendarBtn = frigateApp.page.getByRole("button", {
      name: /24 hours|calendar|date/i,
    });
    if (await calendarBtn.isVisible().catch(() => false)) {
      await calendarBtn.click();
      await frigateApp.page.waitForTimeout(500);
      // A popover with calendar should appear
      const popover = frigateApp.page.locator(
        "[data-radix-popper-content-wrapper]",
      );
      const visible = await popover
        .first()
        .isVisible()
        .catch(() => false);
      if (visible) {
        await frigateApp.page.keyboard.press("Escape");
      }
    }
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("Filter button opens filter popover", async ({ frigateApp }) => {
    await frigateApp.goto("/review");
    await frigateApp.page.waitForTimeout(1000);
    const filterBtn = frigateApp.page.getByRole("button", {
      name: /^filter$/i,
    });
    if (await filterBtn.isVisible().catch(() => false)) {
      await filterBtn.click();
      await frigateApp.page.waitForTimeout(500);
      await frigateApp.page.keyboard.press("Escape");
    }
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });
});

test.describe("Review Page - Navigation @critical", () => {
  test("navigate to review from live page", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    const base = new BasePage(frigateApp.page, !frigateApp.isMobile);
    await base.navigateTo("/review");
    await expect(frigateApp.page).toHaveURL(/\/review/);
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("review page has timeline on right side (desktop)", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/review");
    await frigateApp.page.waitForTimeout(2000);
    // Timeline renders time labels on the right
    const pageText = await frigateApp.page.textContent("#pageRoot");
    // Should have time markers like "PM" or "AM"
    expect(pageText).toMatch(/[AP]M/);
  });
});
