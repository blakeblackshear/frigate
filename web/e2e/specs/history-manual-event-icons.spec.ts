import type { Locator } from "@playwright/test";
import { test, expect, type FrigateApp } from "../fixtures/frigate-test";

async function iconPaths(header: Locator) {
  return header
    .locator(".rounded-full")
    .evaluateAll((chips) =>
      chips.map((chip) =>
        Array.from(chip.querySelectorAll("path"), (path) =>
          path.getAttribute("d"),
        ),
      ),
    );
}

async function openDetail(frigateApp: FrigateApp) {
  if (frigateApp.isMobile) {
    await frigateApp.page
      .getByRole("button", { name: "Select timeline or events list" })
      .click();
    await frigateApp.page
      .getByRole("dialog")
      .getByText("Detail", { exact: true })
      .click();
  } else {
    await frigateApp.page.getByRole("radio", { name: "Detail Stream" }).click();
  }
}

test.describe("Manual-event summary icons @high @mobile", () => {
  for (const label of ["person", "vehicle", "animal", "package"]) {
    test(`${label} icons stay the same when details collapse`, async ({
      frigateApp,
    }) => {
      const start = Math.floor(Date.now() / 1000) - 300;
      const events = [
        { label: "motion", sub_label: "Background activity" },
        { label, sub_label: "External sensor A" },
        { label, sub_label: "External sensor B" },
      ].map((event, index) => ({
        ...event,
        id: `${start + index}.000-event`,
        camera: "front_door",
        start_time: start + index,
        end_time: start + index + 10,
        false_positive: false,
        zones: [],
        thumbnail: "",
        has_clip: true,
        has_snapshot: true,
        retain_indefinitely: false,
        data: {
          type: "manual",
          score: 1,
          top_score: 1,
          region: [],
          box: [],
          area: 0,
          ratio: 0,
          path_data: [],
        },
      }));
      const review = {
        id: "manual-icons",
        camera: "front_door",
        start_time: start,
        end_time: start + 20,
        severity: "alert",
        has_been_reviewed: false,
        thumb_path: "/clips/front_door/manual-icons.webp",
        data: {
          detections: events.map((event) => event.id),
          // Different metadata for the same class must not create extra icons.
          // The summary and fetched events deliberately use different orders.
          objects: [
            `${label}: External sensor B`,
            "motion: Background activity",
            `${label}: External sensor A`,
          ],
          audio: [],
          sub_labels: [],
          significant_motion_areas: [],
          zones: [],
        },
      };

      await frigateApp.installDefaults({ reviews: [review], events });
      await frigateApp.page.route("**/api/*/recordings**", (route) =>
        route.fulfill({ json: [] }),
      );
      await frigateApp.page.route("**/api/recordings/unavailable**", (route) =>
        route.fulfill({ json: [] }),
      );
      await frigateApp.page.route("**/api/*/recordings/coverage**", (route) =>
        route.fulfill({
          json: {
            spans: [
              {
                start_time: start - 60,
                end_time: start + 60,
                streams: ["main"],
              },
            ],
            codecs_compatible: true,
            streams: {
              main: {
                video_codec: "h264",
                audio_codec: null,
                audio_rate: null,
                has_audio: false,
                bitrate: 2_000_000,
              },
            },
          },
        }),
      );
      await frigateApp.page.route("**/api/event_ids**", (route) =>
        route.fulfill({ json: events }),
      );
      await frigateApp.page.route("**/api/timeline**", (route) =>
        route.fulfill({ json: [] }),
      );
      await frigateApp.page.route("**/api/review/activity/motion**", (route) =>
        route.fulfill({ json: [] }),
      );

      await frigateApp.goto("/review");
      const preview = frigateApp.page.locator(".review-item").filter({
        has: frigateApp.page.locator('img[src*="manual-icons.webp"]'),
      });
      const chip = preview.locator(".bg-gray-500");
      await expect(chip).toBeVisible();
      const previewIcons = await chip
        .locator(":scope > *")
        .evaluateAll((icons) =>
          icons.map((icon) =>
            Array.from(icon.querySelectorAll("path"), (path) =>
              path.getAttribute("d"),
            ),
          ),
        );

      await frigateApp.goto(`/review?timestamp=front_door_${start}`);
      await openDetail(frigateApp);

      const card = frigateApp.page.locator(
        '[data-review-id="review-manual-icons"]',
      );
      const header = card.locator(":scope > div").first();
      const toggle = header.locator(".self-center");
      await expect(
        card.getByRole("button", { name: "External sensor A", exact: true }),
      ).toBeVisible();
      await expect(header.locator(".rounded-full")).toHaveCount(2);
      const expanded = await iconPaths(header);
      expect(
        [...new Set(previewIcons.map((icon) => JSON.stringify(icon)))].sort(),
      ).toEqual(expanded.map((icon) => JSON.stringify(icon)).sort());

      await toggle.click();
      await expect(
        card.getByRole("button", { name: "External sensor A", exact: true }),
      ).toHaveCount(0);
      await expect(header.locator(".rounded-full")).toHaveCount(2);
      expect(await iconPaths(header)).toEqual(expanded);

      await toggle.click();
      await expect(
        card.getByRole("button", { name: "External sensor A", exact: true }),
      ).toBeVisible();
      expect(await iconPaths(header)).toEqual(expanded);
    });
  }
});
