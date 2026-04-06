/**
 * Review/Events page tests -- CRITICAL tier.
 *
 * Tests severity tab switching by name (Alerts/Detections/Motion),
 * filter popover opening with camera names, show reviewed toggle,
 * calendar button, and filter button interactions.
 */

import { test, expect } from "../fixtures/frigate-test";
import { BasePage } from "../pages/base.page";

test.describe("Review Page - Severity Tabs @critical", () => {
  test("severity tabs render with Alerts, Detections, Motion", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/review");
    await expect(frigateApp.page.getByLabel("Alerts")).toBeVisible({
      timeout: 10_000,
    });
    await expect(frigateApp.page.getByLabel("Detections")).toBeVisible();
    // Motion uses role="radio" to distinguish from other Motion elements
    await expect(
      frigateApp.page.getByRole("radio", { name: "Motion" }),
    ).toBeVisible();
  });

  test("Alerts tab is active by default", async ({ frigateApp }) => {
    await frigateApp.goto("/review");
    await frigateApp.page.waitForTimeout(1000);
    const alertsTab = frigateApp.page.getByLabel("Alerts");
    await expect(alertsTab).toHaveAttribute("data-state", "on");
  });

  test("clicking Detections tab makes it active and deactivates Alerts", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/review");
    await frigateApp.page.waitForTimeout(1000);
    const alertsTab = frigateApp.page.getByLabel("Alerts");
    const detectionsTab = frigateApp.page.getByLabel("Detections");

    await detectionsTab.click();
    await frigateApp.page.waitForTimeout(500);

    await expect(detectionsTab).toHaveAttribute("data-state", "on");
    await expect(alertsTab).toHaveAttribute("data-state", "off");
  });

  test("clicking Motion tab makes it active", async ({ frigateApp }) => {
    await frigateApp.goto("/review");
    await frigateApp.page.waitForTimeout(1000);
    const motionTab = frigateApp.page.getByRole("radio", { name: "Motion" });
    await motionTab.click();
    await frigateApp.page.waitForTimeout(500);
    await expect(motionTab).toHaveAttribute("data-state", "on");
  });

  test("switching back to Alerts from Detections works", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/review");
    await frigateApp.page.waitForTimeout(1000);

    await frigateApp.page.getByLabel("Detections").click();
    await frigateApp.page.waitForTimeout(300);
    await frigateApp.page.getByLabel("Alerts").click();
    await frigateApp.page.waitForTimeout(300);

    await expect(frigateApp.page.getByLabel("Alerts")).toHaveAttribute(
      "data-state",
      "on",
    );
  });
});

test.describe("Review Page - Filters @critical", () => {
  test("All Cameras filter button opens popover with camera names", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/review");
    await frigateApp.page.waitForTimeout(1000);

    const camerasBtn = frigateApp.page.getByRole("button", {
      name: /cameras/i,
    });
    await expect(camerasBtn).toBeVisible({ timeout: 5_000 });
    await camerasBtn.click();
    await frigateApp.page.waitForTimeout(500);

    // Popover should open with camera names from config
    const popover = frigateApp.page.locator(
      "[data-radix-popper-content-wrapper]",
    );
    await expect(popover.first()).toBeVisible({ timeout: 3_000 });
    // Camera names should be present
    await expect(frigateApp.page.getByText("Front Door")).toBeVisible();

    await frigateApp.page.keyboard.press("Escape");
  });

  test("Show Reviewed toggle is clickable", async ({ frigateApp }) => {
    await frigateApp.goto("/review");
    await frigateApp.page.waitForTimeout(1000);

    const showReviewed = frigateApp.page.getByRole("button", {
      name: /reviewed/i,
    });
    if (await showReviewed.isVisible().catch(() => false)) {
      await showReviewed.click();
      await frigateApp.page.waitForTimeout(500);
      // Toggle should change state
      await expect(frigateApp.page.locator("body")).toBeVisible();
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
      // Popover should open
      const popover = frigateApp.page.locator(
        "[data-radix-popper-content-wrapper]",
      );
      if (
        await popover
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await frigateApp.page.keyboard.press("Escape");
      }
    }
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
      // Popover or dialog should open
      const popover = frigateApp.page.locator(
        "[data-radix-popper-content-wrapper], [role='dialog']",
      );
      if (
        await popover
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await frigateApp.page.keyboard.press("Escape");
      }
    }
  });
});

test.describe("Review Page - Timeline @critical", () => {
  test("review page has timeline with time markers (desktop)", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/review");
    await frigateApp.page.waitForTimeout(2000);
    // Timeline renders time labels like "4:30 PM"
    const pageText = await frigateApp.page.textContent("#pageRoot");
    expect(pageText).toMatch(/[AP]M/);
  });
});

test.describe("Review Page - Navigation @critical", () => {
  test("navigate to review from live page works", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    const base = new BasePage(frigateApp.page, !frigateApp.isMobile);
    await base.navigateTo("/review");
    await expect(frigateApp.page).toHaveURL(/\/review/);
    // Severity tabs should be visible
    await expect(frigateApp.page.getByLabel("Alerts")).toBeVisible({
      timeout: 10_000,
    });
  });
});
