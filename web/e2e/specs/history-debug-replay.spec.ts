/**
 * Debug Replay range selection from History -- HIGH tier.
 *
 * Covers the "Select from Timeline" flow that Debug Replay shares with
 * Export. The other half of the same report, a loading spinner latched
 * after Cancel, needs real media: the vod mock serves an empty playlist.
 */

import { test, expect, type FrigateApp } from "../fixtures/frigate-test";

// the selection is seeded around the playback position, so land near the
// live edge
const playbackTime = Math.floor(Date.now() / 1000) - 300;

async function openRecordingView(frigateApp: FrigateApp) {
  // The recording view pulls these while the timeline renders; the preview
  // server 500s on them, which the error collector would flag.
  await frigateApp.page.route("**/api/*/recordings**", (route) =>
    route.fulfill({ json: [] }),
  );
  await frigateApp.page.route("**/api/recordings/unavailable**", (route) =>
    route.fulfill({ json: [] }),
  );
  // inert here; the 0.19 recording view fetches coverage and needs an
  // object, so this has to follow the broad recordings route to win
  await frigateApp.page.route("**/api/*/recordings/coverage**", (route) =>
    route.fulfill({
      json: {
        spans: [
          {
            start_time: playbackTime - 3600,
            end_time: playbackTime + 600,
            streams: ["main"],
          },
        ],
        codecs_compatible: true,
        streams: {
          main: {
            video_codec: "h264",
            audio_rate: null,
            audio_codec: null,
            has_audio: false,
            bitrate: 2_000_000,
          },
        },
      },
    }),
  );

  await frigateApp.goto(`/review?timestamp=front_door_${playbackTime}`);
}

// desktop reaches Debug Replay through the Actions menu, mobile through
// the settings drawer; both render the same form
async function openDebugReplayForm(frigateApp: FrigateApp) {
  if (frigateApp.isMobile) {
    await frigateApp.page
      .getByRole("button", { name: /filters/i })
      .first()
      .click({ timeout: 15_000 });
    await frigateApp.page
      .getByRole("button", { name: /^debug replay$/i })
      .click();
  } else {
    await frigateApp.page
      .getByRole("button", { name: /actions/i })
      .click({ timeout: 15_000 });
    await frigateApp.page
      .getByRole("menuitem", { name: /debug replay/i })
      .click();
  }

  const form = frigateApp.page.getByRole("dialog");
  await expect(form).toBeVisible({ timeout: 5_000 });
  return form;
}

async function selectRangeFromTimeline(frigateApp: FrigateApp) {
  const form = await openDebugReplayForm(frigateApp);
  await form.getByText("From Timeline").click();
  await form.getByRole("button", { name: "Select", exact: true }).click();
  await expect(form).toBeHidden({ timeout: 5_000 });

  await expect(frigateApp.page.locator(".export-start")).toHaveText(
    /\d{1,2}:\d{2}/,
    { timeout: 5_000 },
  );
}

// moving the playhead between the two selections is what makes the second
// range differ from the first
async function reselectRange(frigateApp: FrigateApp) {
  await selectRangeFromTimeline(frigateApp);

  await frigateApp.page
    .getByRole("button", { name: /^cancel$/i })
    .click({ timeout: 5_000 });
  await expect(frigateApp.page.locator(".export-start")).toHaveCount(0);

  const segments = frigateApp.page.locator(".segment[data-segment-id]");
  const count = await segments.count();
  await segments.nth(Math.min(20, count - 1)).click({ force: true });

  await selectRangeFromTimeline(frigateApp);
}

// the loop flipped this label between the two ranges ~25 times a second
async function countHandleLabelChanges(frigateApp: FrigateApp) {
  return frigateApp.page.evaluate(async () => {
    const handle = document.querySelector(".export-start");
    if (!handle) {
      return -1;
    }

    let changes = 0;
    let last = handle.textContent;
    const observer = new MutationObserver(() => {
      if (handle.textContent !== last) {
        changes += 1;
        last = handle.textContent;
      }
    });
    observer.observe(handle, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    observer.disconnect();
    return changes;
  });
}

test.describe("Debug Replay from History @high", () => {
  test("a reselected range lands once and stays put", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }

    const pageErrors: string[] = [];
    frigateApp.page.on("pageerror", (err) => pageErrors.push(err.message));

    await frigateApp.installDefaults();
    await openRecordingView(frigateApp);
    await reselectRange(frigateApp);

    expect(await countHandleLabelChanges(frigateApp)).toBe(0);
    expect(
      pageErrors.filter((message) => /Maximum update depth/i.test(message)),
    ).toHaveLength(0);
  });

  test("dragging a handle after a reselect moves it", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }

    await frigateApp.installDefaults();
    await openRecordingView(frigateApp);
    await reselectRange(frigateApp);

    const start = frigateApp.page.locator(".export-start");
    const before = (await start.textContent()) ?? "";
    const box = await start.boundingBox();
    if (!box) {
      throw new Error("export start handle has no bounding box");
    }

    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await frigateApp.page.mouse.move(x, y);
    await frigateApp.page.mouse.down();
    await frigateApp.page.mouse.move(x, y - 90, { steps: 12 });
    await frigateApp.page.mouse.up();

    await expect(start).not.toHaveText(before, { timeout: 5_000 });
  });
});

test.describe("Debug Replay from History — mobile @high @mobile", () => {
  test("a reselected range lands once and stays put", async ({
    frigateApp,
  }) => {
    if (!frigateApp.isMobile) {
      test.skip();
      return;
    }

    const pageErrors: string[] = [];
    frigateApp.page.on("pageerror", (err) => pageErrors.push(err.message));

    await frigateApp.installDefaults();
    await openRecordingView(frigateApp);
    await reselectRange(frigateApp);

    expect(await countHandleLabelChanges(frigateApp)).toBe(0);
    expect(
      pageErrors.filter((message) => /Maximum update depth/i.test(message)),
    ).toHaveLength(0);
  });
});
