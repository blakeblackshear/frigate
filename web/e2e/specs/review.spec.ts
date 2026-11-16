/**
 * Review/Events page tests -- CRITICAL tier.
 *
 * Severity tabs, filter popovers, calendar, show-reviewed toggle,
 * timeline, and the nested-overlay regression migrated from
 * radix-overlay-regressions.spec.ts.
 */

import { test, expect } from "../fixtures/frigate-test";
import { BasePage } from "../pages/base.page";
import { ReviewPage } from "../pages/review.page";
import {
  expectBodyInteractive,
  waitForBodyInteractive,
} from "../helpers/overlay-interaction";

test.describe("Review — severity tabs @critical", () => {
  test("tabs render with Alerts default-on", async ({ frigateApp }) => {
    await frigateApp.goto("/review");
    const review = new ReviewPage(frigateApp.page, !frigateApp.isMobile);
    await expect(review.alertsTab).toBeVisible({ timeout: 10_000 });
    await expect(review.detectionsTab).toBeVisible();
    await expect(review.motionTab).toBeVisible();
    await expect(review.alertsTab).toHaveAttribute("data-state", "on");
  });

  test("clicking Detections flips data-state", async ({ frigateApp }) => {
    await frigateApp.goto("/review");
    const review = new ReviewPage(frigateApp.page, !frigateApp.isMobile);
    await expect(review.alertsTab).toBeVisible({ timeout: 10_000 });
    await review.detectionsTab.click();
    await expect(review.detectionsTab).toHaveAttribute("data-state", "on");
    await expect(review.alertsTab).toHaveAttribute("data-state", "off");
  });

  test("clicking Motion flips data-state", async ({ frigateApp }) => {
    await frigateApp.goto("/review");
    const review = new ReviewPage(frigateApp.page, !frigateApp.isMobile);
    await expect(review.alertsTab).toBeVisible({ timeout: 10_000 });
    await review.motionTab.click();
    await expect(review.motionTab).toHaveAttribute("data-state", "on");
  });

  test("switching back to Alerts works", async ({ frigateApp }) => {
    await frigateApp.goto("/review");
    const review = new ReviewPage(frigateApp.page, !frigateApp.isMobile);
    await review.detectionsTab.click();
    await expect(review.detectionsTab).toHaveAttribute("data-state", "on");
    await review.alertsTab.click();
    await expect(review.alertsTab).toHaveAttribute("data-state", "on");
  });

  test("switching tabs updates active data-state (client-side filter)", async ({
    frigateApp,
  }) => {
    // The severity tabs filter the already-fetched review data client-side;
    // they do not trigger a new /api/review network request. This test
    // verifies the state-change assertion that the tab switch takes effect.
    await frigateApp.goto("/review");
    const review = new ReviewPage(frigateApp.page, !frigateApp.isMobile);
    await expect(review.alertsTab).toBeVisible({ timeout: 10_000 });
    await expect(review.alertsTab).toHaveAttribute("data-state", "on");
    await review.detectionsTab.click();
    await expect(review.detectionsTab).toHaveAttribute("data-state", "on");
    await expect(review.alertsTab).toHaveAttribute("data-state", "off");
  });
});

test.describe("Review — filters (desktop) @critical", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Filter bar differs on mobile",
  );

  test("Cameras popover lists configured camera names", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/review");
    const review = new ReviewPage(frigateApp.page, true);
    await expect(review.camerasFilterTrigger).toBeVisible({ timeout: 5_000 });
    await review.camerasFilterTrigger.click();
    await expect(review.filterOverlay).toBeVisible({ timeout: 3_000 });
    await expect(frigateApp.page.getByText("Front Door")).toBeVisible();
  });

  test("closing the Cameras popover with Escape leaves body interactive", async ({
    frigateApp,
  }) => {
    // Migrated from radix-overlay-regressions.spec.ts.
    await frigateApp.goto("/review");
    const review = new ReviewPage(frigateApp.page, true);
    await review.camerasFilterTrigger.click();
    await expect(review.filterOverlay).toBeVisible({ timeout: 3_000 });
    await frigateApp.page.keyboard.press("Escape");
    await expect(review.filterOverlay).not.toBeVisible({ timeout: 3_000 });
    await waitForBodyInteractive(frigateApp.page);
    await expectBodyInteractive(frigateApp.page);
  });

  test("Labels are shown inside the General Filter dialog", async ({
    frigateApp,
  }) => {
    // Labels are surfaced inside the "Filter" button's GeneralFilterContent
    // dialog, not as a standalone top-level button. We open that dialog and
    // confirm labels from the camera config are listed there.
    await frigateApp.goto("/review");
    const filterBtn = frigateApp.page
      .getByRole("button", { name: /^filter$/i })
      .first();
    await expect(filterBtn).toBeVisible({ timeout: 5_000 });
    await filterBtn.click();

    const overlay = frigateApp.page.locator(
      "[data-radix-popper-content-wrapper], [role='dialog']",
    );
    await expect(overlay.first()).toBeVisible({ timeout: 3_000 });
    // The default mock config for front_door tracks "person"
    await expect(overlay.first().getByText(/person/i)).toBeVisible();
    await frigateApp.page.keyboard.press("Escape");
  });

  test("Zones popover lists configured zones inside the General Filter dialog", async ({
    frigateApp,
  }) => {
    // Override config to guarantee a known zone on front_door.
    await frigateApp.installDefaults({
      config: {
        cameras: {
          front_door: {
            zones: {
              front_yard: { coordinates: "0.1,0.1,0.9,0.1,0.9,0.9,0.1,0.9" },
            },
          },
        },
      },
    });
    await frigateApp.goto("/review");
    const filterBtn = frigateApp.page
      .getByRole("button", { name: /^filter$/i })
      .first();
    await expect(filterBtn).toBeVisible({ timeout: 5_000 });
    await filterBtn.click();

    const overlay = frigateApp.page.locator(
      "[data-radix-popper-content-wrapper], [role='dialog']",
    );
    await expect(overlay.first()).toBeVisible({ timeout: 3_000 });
    await expect(overlay.first().getByText(/front.?yard/i)).toBeVisible();
    await frigateApp.page.keyboard.press("Escape");
  });

  test("Calendar trigger opens a date picker popover", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/review");
    const review = new ReviewPage(frigateApp.page, true);
    await expect(review.calendarTrigger).toBeVisible({ timeout: 5_000 });
    await review.calendarTrigger.click();

    // react-day-picker v9 renders a role="grid" calendar with day cells
    // as buttons inside gridcells (e.g. "Wednesday, April 1st, 2026").
    // The calendar is placed directly in the DOM (not always inside a
    // Radix popper wrapper), so scope by the grid role instead.
    const calendarGrid = frigateApp.page.locator('[role="grid"]').first();
    await expect(calendarGrid).toBeVisible({ timeout: 3_000 });
    const dayButton = calendarGrid.locator('[role="gridcell"] button').first();
    await expect(dayButton).toBeVisible({ timeout: 3_000 });
    await frigateApp.page.keyboard.press("Escape");
  });

  test("Show Reviewed switch flips its checked state", async ({
    frigateApp,
  }) => {
    // "Show Reviewed" is a Radix Switch (role=switch), not a button.
    // It filters review data client-side; it does not trigger a new
    // /api/review network request. Verify the switch state toggles.
    await frigateApp.goto("/review");
    const showReviewedSwitch = frigateApp.page.getByRole("switch", {
      name: /show reviewed/i,
    });
    await expect(showReviewedSwitch).toBeVisible({ timeout: 5_000 });

    // Record initial checked state and click to toggle
    const initialChecked =
      await showReviewedSwitch.getAttribute("aria-checked");
    await showReviewedSwitch.click();
    const flippedChecked = initialChecked === "true" ? "false" : "true";
    await expect(showReviewedSwitch).toHaveAttribute(
      "aria-checked",
      flippedChecked,
    );
  });
});

test.describe("Review — timeline (desktop) @critical", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Timeline not shown on mobile",
  );

  test("timeline renders time markers", async ({ frigateApp }) => {
    await frigateApp.goto("/review");
    await expect
      .poll(
        async () => (await frigateApp.page.textContent("#pageRoot")) ?? "",
        { timeout: 10_000 },
      )
      .toMatch(/[AP]M|\d+:\d+/);
  });
});

test.describe("Review — mobile @critical @mobile", () => {
  test.skip(({ frigateApp }) => !frigateApp.isMobile, "Mobile-only");

  test("severity tabs render on mobile", async ({ frigateApp }) => {
    await frigateApp.goto("/review");
    const review = new ReviewPage(frigateApp.page, false);
    await expect(review.alertsTab).toBeVisible({ timeout: 10_000 });
    await expect(review.detectionsTab).toBeVisible();
  });

  test("back navigation returns to Live", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    const base = new BasePage(frigateApp.page, false);
    await base.navigateTo("/review");
    await expect(frigateApp.page).toHaveURL(/\/review/);
    await base.navigateTo("/");
    await expect(frigateApp.page).toHaveURL(/\/$/);
  });
});

test.describe("Review select all @high @mobile", () => {
  // Three unreviewed alerts so that selecting one item leaves more to select.
  const now = Date.now() / 1000;
  const selectAllReviews = Array.from({ length: 3 }, (_, i) => ({
    id: `select-all-review-${i}`,
    camera: "front_door",
    start_time: now - 600 - i * 300,
    end_time: now - 580 - i * 300,
    has_been_reviewed: false,
    severity: "alert",
    thumb_path: `/clips/front_door/select-all-review-${i}-thumb.jpg`,
    data: {
      audio: [],
      detections: [`person-${i}`],
      objects: ["person"],
      sub_labels: [],
      significant_motion_areas: [],
      zones: ["front_yard"],
    },
  }));

  test.beforeEach(async ({ frigateApp }) => {
    await frigateApp.page.route(/\/api\/review(\?|$)/, (route) =>
      route.fulfill({ json: selectAllReviews }),
    );
    await frigateApp.page.route(/\/api\/review\/summary/, (route) =>
      route.fulfill({
        json: {
          last24Hours: {
            reviewed_alert: 0,
            reviewed_detection: 0,
            total_alert: selectAllReviews.length,
            total_detection: 0,
          },
        },
      }),
    );
  });

  test("mobile action group selects every review item", async ({
    frigateApp,
  }) => {
    test.skip(!frigateApp.isMobile, "Mobile-only");

    await frigateApp.goto("/review");
    const review = new ReviewPage(frigateApp.page, false);
    const thumbnail = review.reviewItems.first().locator("img").first();
    await expect(thumbnail).toBeVisible({ timeout: 10_000 });

    // The mobile project uses an iOS user agent, where a long press
    // (touchstart held past the use-contextmenu delay) starts selection.
    await thumbnail.dispatchEvent("touchstart");
    await expect(frigateApp.page.getByText(/1.*selected/i)).toBeVisible({
      timeout: 5_000,
    });

    const selectAll = frigateApp.page.getByText("All", { exact: true });
    await expect(selectAll).toBeVisible();
    await selectAll.click();

    await expect(frigateApp.page.getByText(/3.*selected/i)).toBeVisible();
    // Nothing is left to select, so the control goes away.
    await expect(selectAll).toHaveCount(0);
  });

  test("desktop action group has no select all control", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "Desktop-only");

    await frigateApp.goto("/review");
    const review = new ReviewPage(frigateApp.page, true);
    await expect(review.reviewItems.first()).toBeVisible({ timeout: 10_000 });

    // PreviewThumbnailPlayer reads e.metaKey to start multi-select.
    await review.reviewItems.first().click({ modifiers: ["Meta"] });
    await expect(frigateApp.page.getByText(/1.*selected/i)).toBeVisible({
      timeout: 5_000,
    });

    await expect(frigateApp.page.getByText("All", { exact: true })).toHaveCount(
      0,
    );
  });
});
