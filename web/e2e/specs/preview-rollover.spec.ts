/**
 * Preview hour rollover -- MEDIUM tier.
 *
 * Tiles beside the main player must not collapse to "No Preview Found" when
 * the clock crosses an hour boundary with the page open: frames before, the
 * hour's mp4 after. The mp4 src resolves to the /clips/** mock, which serves
 * a PNG, so these assert the <source> is wired up, not that it decodes.
 */

import { test, expect } from "../fixtures/frigate-test";
import { PLACEHOLDER_PNG } from "../helpers/api-mocker";

const HOUR_START = Date.UTC(2026, 8, 1, 10, 0, 0) / 1000;
const HOUR_END = Date.UTC(2026, 8, 1, 11, 0, 0) / 1000;
const REVIEW_START = HOUR_START + 900; // 10:15, inside the slot under test

// close to the boundary so fastForward skips few unrelated app timers
const JUST_BEFORE_ROLLOVER = new Date(Date.UTC(2026, 8, 1, 10, 59, 50));

// the main camera's scrub preview plus one tile per other camera
const CAMERAS = ["front_door", "backyard", "garage"];

const review = {
  id: "review-rollover-001",
  camera: "front_door",
  start_time: REVIEW_START,
  end_time: REVIEW_START + 30,
  has_been_reviewed: false,
  severity: "alert",
  thumb_path: "/clips/front_door/review-rollover-001-thumb.jpg",
  data: {
    audio: [],
    detections: ["person-abc123"],
    objects: ["person"],
    sub_labels: [],
    significant_motion_areas: [],
    zones: [],
  },
};

function previewFor(camera: string) {
  return {
    camera,
    src: `/clips/previews/${camera}/${HOUR_START}-${HOUR_END}.mp4`,
    type: "video/mp4",
    start: HOUR_START,
    end: HOUR_END + 0.4,
  };
}

/** Opens RecordingView pre-boundary; returns a fn that rolls the hour over. */
async function openAtRollover(frigateApp: {
  page: import("@playwright/test").Page;
  installDefaults: (o?: { reviews?: unknown[] }) => Promise<void>;
  goto: (p: string) => Promise<void>;
}) {
  await frigateApp.page.clock.install({ time: JUST_BEFORE_ROLLOVER });
  await frigateApp.installDefaults({ reviews: [review] });

  let hourRolled = false;

  await frigateApp.page.route("**/api/review/review-rollover-001", (route) =>
    route.fulfill({ json: review }),
  );

  await frigateApp.page.route(/\/api\/preview\/.+\/start\//, (route) => {
    if (route.request().url().includes("/frames")) {
      return route.fulfill({
        json: hourRolled ? [] : [`preview_backyard-${REVIEW_START}.webp`],
      });
    }

    return route.fulfill({
      json: hourRolled ? CAMERAS.map(previewFor) : [],
    });
  });

  await frigateApp.page.route("**/thumbnail.webp", (route) =>
    route.fulfill({ contentType: "image/png", body: PLACEHOLDER_PNG }),
  );

  await frigateApp.goto("/review?id=review-rollover-001");

  return async () => {
    hourRolled = true;
    await frigateApp.page.clock.fastForward("00:40");
  };
}

test.describe("Preview hour rollover: desktop @medium", () => {
  // one alternation regex, not two entries: Playwright's isFixtureTuple reads a
  // two-element array as [value, options]
  test.use({
    expectedErrors: [/no supported source was found|MEDIA_ELEMENT_ERROR/i],
  });

  test("tile keeps a preview source when the hour rolls over", async ({
    frigateApp,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "preview tile row only renders on desktop",
    );

    const rollOver = await openAtRollover(frigateApp);

    // both handles are URLs only PreviewPlayer renders: the main camera's
    // scrub preview and one tile per other camera, all hit by the same bug
    const frameTiles = frigateApp.page.locator('img[src*="/thumbnail.webp"]');
    const mp4Tiles = frigateApp.page.locator(
      `video source[src*="${HOUR_START}-${HOUR_END}"]`,
    );
    const barePanel = frigateApp.page.getByText("No Preview Found", {
      exact: true,
    });

    await expect(frameTiles).toHaveCount(CAMERAS.length, { timeout: 15_000 });
    await expect(barePanel).toHaveCount(0);

    await rollOver();

    await expect(mp4Tiles).toHaveCount(CAMERAS.length, { timeout: 15_000 });
    await expect(barePanel).toHaveCount(0);
  });
});

test.describe("Preview hour rollover: mobile @medium @mobile", () => {
  test.use({
    expectedErrors: [/no supported source was found|MEDIA_ELEMENT_ERROR/i],
  });

  test("main camera scrub preview keeps its source when the hour rolls over", async ({
    frigateApp,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "desktop",
      "desktop case above covers the tile row as well",
    );

    const rollOver = await openAtRollover(frigateApp);

    // the tile row is desktop-only, but the main player's scrub preview is a
    // PreviewPlayer too, so mobile has exactly one and it hits the same bug
    const frameTiles = frigateApp.page.locator('img[src*="/thumbnail.webp"]');
    const mp4Tiles = frigateApp.page.locator(
      `video source[src*="${HOUR_START}-${HOUR_END}"]`,
    );
    const barePanel = frigateApp.page.getByText("No Preview Found", {
      exact: true,
    });

    await expect(frameTiles).toHaveCount(1, { timeout: 15_000 });
    await expect(barePanel).toHaveCount(0);

    await rollOver();

    await expect(mp4Tiles).toHaveCount(1, { timeout: 15_000 });
    await expect(barePanel).toHaveCount(0);
  });
});

/**
 * A review with no mp4 at all (aged out, camera offline, generation failed)
 * used to fade to black on hover, since playback hides the thumbnail.
 */
test.describe("Review card without a preview: desktop @medium", () => {
  test("hovering keeps the thumbnail instead of blanking the card", async ({
    frigateApp,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "hover is desktop only");

    // three hours old, so neither the current nor the previous hour
    const start = Math.floor(Date.now() / 1000) - 3 * 3600;
    const noPreviewReview = {
      ...review,
      id: "review-noprev-001",
      start_time: start,
      end_time: start + 30,
      thumb_path: "/clips/front_door/review-noprev-001-thumb.jpg",
    };

    await frigateApp.installDefaults({ reviews: [noPreviewReview] });
    await frigateApp.goto("/review");

    const thumbnail = frigateApp.page.locator(
      'img[src*="review-noprev-001-thumb"]',
    );
    await expect(thumbnail).toBeVisible({ timeout: 15_000 });

    await thumbnail.hover();
    // the card waits 500ms before entering playback
    await expect(thumbnail).toHaveCSS("opacity", "1", { timeout: 3_000 });
  });
});
