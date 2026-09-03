/**
 * Health tab tests -- MEDIUM tier.
 *
 * Default tab, notice list rendering, dismiss, empty state, update notice.
 */

import { test, expect } from "../fixtures/frigate-test";

const NOW = Math.floor(Date.now() / 1000);

const STATE_NOTICE = {
  id: "ffmpeg_crash_loop:front_door",
  kind: "ffmpeg_crash_loop",
  mode: "state",
  severity: "error",
  category: "camera",
  scope: "front_door",
  params: { restarts: 6 },
  first_seen: NOW - 600,
  last_seen: NOW,
  count: 1,
  dismissed_at: null,
};

const EVENT_NOTICE = {
  id: "detector_stuck",
  kind: "detector_stuck",
  mode: "event",
  severity: "warning",
  category: "detector",
  scope: null,
  params: { detector: "ov" },
  first_seen: NOW - 7200,
  last_seen: NOW - 60,
  count: 3,
  dismissed_at: null,
};

test.describe("System — Health tab @medium", () => {
  test("Health is the default tab and lists notices by severity", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      notices: [STATE_NOTICE, EVENT_NOTICE],
      noticeStats: [
        {
          kind: "ffmpeg_crash_loop",
          occurrences: 14,
          dismissals: 0,
          first_seen: NOW - 86400 * 20,
          last_seen: NOW,
        },
      ],
    });
    await frigateApp.goto("/system");

    await expect(frigateApp.page.getByLabel("Select health")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 15_000 },
    );

    const rows = frigateApp.page.locator("[data-testid^='health-problem-']");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toHaveAttribute("data-severity", "error");
    await expect(rows.nth(0)).toContainText("ffmpeg has crashed 6 times");
    await expect(rows.nth(0)).toContainText("14 times since");
    // the default fixture's cpu detector is slow (75.5 ms); PR 2 merges live
    // problems into this list, PR 1 does not, so no extra row here
    await expect(
      rows.nth(0).getByRole("button", { name: "Dismiss" }),
    ).toHaveCount(0);
    await expect(rows.nth(1)).toContainText("Detector ov was restarted");
    await expect(rows.nth(1)).toContainText("3 times");
    await expect(
      rows.nth(1).getByRole("button", { name: "Dismiss" }),
    ).toBeVisible();
  });

  test("dismiss posts and removes the row", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ notices: [EVENT_NOTICE] });

    // the list shrinks after the dismiss so the refetch shows the row gone
    let dismissed = false;
    await frigateApp.page.route("**/api/notices", (route) =>
      route.fulfill({ json: dismissed ? [] : [EVENT_NOTICE] }),
    );
    await frigateApp.page.route(
      "**/api/notices/detector_stuck/dismiss",
      (route) => {
        dismissed = true;
        return route.fulfill({ json: { success: true } });
      },
    );

    await frigateApp.goto("/system#health");
    const request = frigateApp.page.waitForRequest(
      (req) =>
        req.url().includes("/api/notices/detector_stuck/dismiss") &&
        req.method() === "POST",
    );
    await frigateApp.page.getByRole("button", { name: "Dismiss" }).click();
    await request;

    await expect(
      frigateApp.page.locator("[data-testid^='health-problem-']"),
    ).toHaveCount(0, { timeout: 5_000 });
    await expect(frigateApp.page.getByText("No notices")).toBeVisible();
  });

  test("empty state with no notices", async ({ frigateApp }) => {
    await frigateApp.installDefaults();
    await frigateApp.goto("/system#health");

    await expect(frigateApp.page.getByText("No notices")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("update notice renders as info with a release link", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      notices: [
        {
          id: "update_available",
          kind: "update_available",
          mode: "state",
          severity: "info",
          category: "system",
          scope: null,
          params: { version: "0.19.0" },
          first_seen: NOW - 3600,
          last_seen: NOW,
          count: 1,
          dismissed_at: null,
        },
      ],
    });
    await frigateApp.goto("/system#health");

    const row = frigateApp.page.getByTestId(
      "health-problem-notice:update_available",
    );
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toHaveAttribute("data-severity", "info");
    await expect(row).toContainText("Frigate 0.19.0 is available");
    await expect(row.getByRole("link", { name: "Open link" })).toHaveAttribute(
      "href",
      "https://github.com/blakeblackshear/frigate/releases/tag/v0.19.0",
    );
    await expect(row.getByRole("button", { name: "Dismiss" })).toHaveCount(0);
  });
});

test.describe("System — Health tab mobile @medium @mobile", () => {
  test.skip(({ frigateApp }) => !frigateApp.isMobile, "Mobile-only");

  test("notices render at mobile viewport", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ notices: [STATE_NOTICE] });
    await frigateApp.goto("/system#health");

    await expect(
      frigateApp.page.getByTestId(
        "health-problem-notice:ffmpeg_crash_loop:front_door",
      ),
    ).toBeVisible({ timeout: 15_000 });
  });
});
