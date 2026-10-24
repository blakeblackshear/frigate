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
import { getReviewPresetRange } from "../../src/utils/reviewDatePreset";
import type { ReviewSegment } from "../../src/types/review";
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

test.describe("Review calendar period boundaries", () => {
  const now = new Date("2026-10-24T17:00:00Z");
  const iso = (timestamp?: number) => new Date(timestamp! * 1000).toISOString();

  for (const [preset, after, before] of [
    ["currentWeek", "2026-10-18T22:00:00.000Z", "2026-10-24T17:00:00.000Z"],
    ["lastWeek", "2026-10-11T22:00:00.000Z", "2026-10-18T22:00:00.000Z"],
    ["currentMonth", "2026-09-30T22:00:00.000Z", "2026-10-24T17:00:00.000Z"],
    ["lastMonth", "2026-08-31T22:00:00.000Z", "2026-09-30T22:00:00.000Z"],
  ] as const) {
    test(`${preset} uses local calendar boundaries`, () => {
      const range = getReviewPresetRange(preset, now, "Europe/Berlin", 1);
      expect(iso(range.after)).toBe(after);
      expect(iso(range.before)).toBe(before);
    });
  }

  test("week boundaries follow the user's configured first day", () => {
    const sunday = getReviewPresetRange("currentWeek", now, "Europe/Berlin", 0);
    const monday = getReviewPresetRange("currentWeek", now, "Europe/Berlin", 1);
    expect(iso(sunday.after)).toBe("2026-10-17T22:00:00.000Z");
    expect(iso(monday.after)).toBe("2026-10-18T22:00:00.000Z");
  });

  test("uses the configured timezone when UTC is still Sunday", () => {
    const instant = new Date("2026-10-25T23:30:00Z");
    const berlin = getReviewPresetRange(
      "currentWeek",
      instant,
      "Europe/Berlin",
      1,
    );
    const newYork = getReviewPresetRange(
      "currentWeek",
      instant,
      "America/New_York",
      1,
    );
    expect(iso(berlin.after)).toBe("2026-10-25T23:00:00.000Z");
    expect(iso(newYork.after)).toBe("2026-10-19T04:00:00.000Z");
  });

  for (const [date, hours, after, before] of [
    [
      "2026-03-30T10:00:00Z",
      167,
      "2026-03-22T23:00:00.000Z",
      "2026-03-29T22:00:00.000Z",
    ],
    [
      "2026-10-26T10:00:00Z",
      169,
      "2026-10-18T22:00:00.000Z",
      "2026-10-25T23:00:00.000Z",
    ],
  ] as const) {
    test(`handles a ${hours}-hour week across daylight saving time`, () => {
      const range = getReviewPresetRange(
        "lastWeek",
        new Date(date),
        "Europe/Berlin",
        1,
      );
      expect(iso(range.after)).toBe(after);
      expect(iso(range.before)).toBe(before);
      expect((range.before! - range.after!) / 3600).toBe(hours);
    });
  }

  test("handles the previous year and leap February", () => {
    const december = getReviewPresetRange(
      "lastMonth",
      new Date("2026-01-06T12:00:00Z"),
      "Europe/Berlin",
    );
    expect(iso(december.after)).toBe("2025-11-30T23:00:00.000Z");
    expect(iso(december.before)).toBe("2025-12-31T23:00:00.000Z");
    const february = getReviewPresetRange(
      "lastMonth",
      new Date("2024-03-03T12:00:00Z"),
      "Europe/Berlin",
    );
    expect((february.before! - february.after!) / 86400).toBe(29);
  });

  test("reset restores the rolling 24-hour bounds", () => {
    expect(getReviewPresetRange(undefined, now)).toEqual({
      after: undefined,
      before: undefined,
    });
  });
});

test.describe("Review date presets @critical @mobile", () => {
  test("all presets send calendar bounds, retain filters, and count the full period", async ({
    frigateApp,
  }) => {
    const page = frigateApp.page;
    const now = new Date("2026-10-24T17:00:00Z");
    await page.clock.install({ time: now });
    await frigateApp.installDefaults({
      config: { ui: { timezone: "Europe/Berlin" } },
    });
    const reviews: ReviewSegment[] = [
      "2026-10-24T12:00:00Z",
      "2026-10-02T12:00:00Z",
      "2026-09-15T12:00:00Z",
    ].map((date, index) => ({
      id: `${Date.parse(date) / 1000}-${index}`,
      camera: "front_door",
      severity: "alert",
      start_time: Date.parse(date) / 1000,
      end_time: Date.parse(date) / 1000 + 30,
      thumb_path: `/clips/review/preset-${index}.webp`,
      has_been_reviewed: false,
      data: {
        audio: [],
        detections: [],
        objects: ["person"],
        significant_motion_areas: [],
        zones: [],
      },
    }));
    await page.route("**/api/review?*", (route) => {
      const params = new URL(route.request().url()).searchParams;
      const after = Number(params.get("after"));
      const before = Number(params.get("before"));
      return route.fulfill({
        json: reviews.filter(
          (item) => item.start_time < before && item.end_time! > after,
        ),
      });
    });
    await frigateApp.goto("/review?labels=person");
    const review = new ReviewPage(page, !frigateApp.isMobile);
    await expect(review.alertsTab).toBeVisible();
    await review.camerasFilterTrigger.click();
    await page.getByRole("switch", { name: "Front Door", exact: true }).check();
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    const openCalendar = async () => {
      if (frigateApp.isMobile) {
        await page
          .getByRole("button", { name: "Filters", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Calendar", exact: true })
          .click();
      } else {
        await review.calendarTrigger.click();
      }
    };
    const group = page.getByRole("group", { name: "Select time period" });
    const unix = (date: string) => Date.parse(date) / 1000;
    for (const [label, start, end, count] of [
      ["This Week", "2026-10-17T22:00:00Z", undefined, 1],
      ["Last Week", "2026-10-10T22:00:00Z", "2026-10-17T22:00:00Z", 0],
      ["This Month", "2026-09-30T22:00:00Z", undefined, 2],
      ["Last Month", "2026-08-31T22:00:00Z", "2026-09-30T22:00:00Z", 1],
    ] as const) {
      await openCalendar();
      const requestPromise = page.waitForRequest(
        (request) => new URL(request.url()).pathname === "/api/review",
      );
      await group.getByRole("button", { name: label, exact: true }).click();
      const params = new URL((await requestPromise).url()).searchParams;
      expect(params.get("cameras")).toBe("front_door");
      expect(params.get("labels")).toBe("person");
      expect(Number(params.get("after"))).toBe(unix(start));
      if (end) {
        expect(Number(params.get("before"))).toBe(unix(end));
      } else {
        expect(Number(params.get("before"))).toBeGreaterThanOrEqual(
          now.getTime() / 1000,
        );
        expect(Number(params.get("before"))).toBeLessThan(
          now.getTime() / 1000 + 60,
        );
      }
      await expect(group).not.toBeVisible();
      await expect(review.alertsTab).toContainText(`∙ ${count}`);
    }
    await openCalendar();
    await group
      .getByRole("button", { name: "Last 24 Hours", exact: true })
      .click();
    await expect(group).not.toBeVisible();
    await openCalendar();
    await expect(
      group.getByRole("button", { name: "Last 24 Hours", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
