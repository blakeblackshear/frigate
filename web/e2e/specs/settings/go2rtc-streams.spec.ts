/**
 * go2rtc streams settings page tests -- MEDIUM tier.
 *
 * Regression coverage for the compat-mode (ffmpeg:) URL editor: unknown
 * fragments like #timeout=10 must remain visible and editable when the
 * stream is using compatibility mode.
 */

import { test, expect } from "../../fixtures/frigate-test";
import type { Page } from "@playwright/test";

const STREAM_NAME = "dome_sub";
const FFMPEG_URL_WITH_TIMEOUT =
  "ffmpeg:rtsp://user:pass@192.168.0.20:554/Stream1#video=copy#audio=copy#timeout=10";

async function installRawPathsRoute(page: Page, streamUrl: string) {
  let lastSavedConfig: unknown = null;
  await page.route("**/api/config/raw_paths", (route) =>
    route.fulfill({
      json: {
        cameras: {},
        go2rtc: { streams: { [STREAM_NAME]: [streamUrl] } },
      },
    }),
  );
  await page.route("**/api/config/set", async (route) => {
    lastSavedConfig = route.request().postDataJSON();
    await route.fulfill({ json: { success: true, require_restart: false } });
  });
  return {
    capturedConfig: () => lastSavedConfig,
  };
}

async function expandStream(page: Page, streamName: string) {
  // Each StreamCard renders the stream name as an h4 next to a rename
  // button, with the chevron toggle as the last button in the header row.
  // Scope to the header row (h4's grandparent) and click that last button.
  const headerRow = page
    .locator(`h4:text-is("${streamName}")`)
    .locator("xpath=../..");
  await headerRow.getByRole("button").last().click();
}

test.describe("go2rtc streams settings — ffmpeg compat mode @medium", () => {
  test("preserves unknown fragments like #timeout= in the URL input", async ({
    frigateApp,
  }) => {
    await installRawPathsRoute(frigateApp.page, FFMPEG_URL_WITH_TIMEOUT);
    await frigateApp.goto("/settings?page=systemGo2rtcStreams");

    await expect(
      frigateApp.page.getByRole("heading", { name: STREAM_NAME }),
    ).toBeVisible();

    await expandStream(frigateApp.page, STREAM_NAME);

    const urlInput = frigateApp.page.getByPlaceholder(
      "e.g., rtsp://user:pass@192.168.1.100/stream",
    );
    await expect(urlInput).toBeVisible();

    // Focus the input so credential masking is bypassed and the raw value
    // is rendered — this matches how a user would inspect the URL before
    // editing it.
    await urlInput.focus();
    await expect(urlInput).toHaveValue(
      "rtsp://user:pass@192.168.0.20:554/Stream1#timeout=10",
    );
  });

  test("lets the user add an extra fragment in compat mode", async ({
    frigateApp,
  }) => {
    const capture = await installRawPathsRoute(
      frigateApp.page,
      FFMPEG_URL_WITH_TIMEOUT,
    );
    await frigateApp.goto("/settings?page=systemGo2rtcStreams");
    await expandStream(frigateApp.page, STREAM_NAME);

    const urlInput = frigateApp.page.getByPlaceholder(
      "e.g., rtsp://user:pass@192.168.1.100/stream",
    );
    await urlInput.focus();
    await urlInput.fill(
      "rtsp://user:pass@192.168.0.20:554/Stream1#timeout=10#backchannel=0",
    );
    await urlInput.blur();

    // Reopen and re-focus to assert the new value round-tripped through
    // parseFfmpegBaseAndExtras + buildFfmpegUrl back into the displayed text.
    await urlInput.focus();
    await expect(urlInput).toHaveValue(
      "rtsp://user:pass@192.168.0.20:554/Stream1#timeout=10#backchannel=0",
    );

    // Save and verify the persisted URL includes both extras after the
    // recognized video/audio directives.
    await frigateApp.page.getByRole("button", { name: "Save" }).click();
    await expect
      .poll(() => capture.capturedConfig(), { timeout: 5_000 })
      .toMatchObject({
        config_data: {
          go2rtc: {
            streams: {
              [STREAM_NAME]: [
                "ffmpeg:rtsp://user:pass@192.168.0.20:554/Stream1#video=copy#audio=copy#timeout=10#backchannel=0",
              ],
            },
          },
        },
      });
  });

  test("preserves repeatable #audio= fallback chain and lets the user add another codec", async ({
    frigateApp,
  }) => {
    const capture = await installRawPathsRoute(
      frigateApp.page,
      // Idiomatic go2rtc fallback: copy if source has the codec, else transcode
      "ffmpeg:rtsp://user:pass@192.168.0.20:554/Stream1#video=copy#audio=copy#audio=opus",
    );
    await frigateApp.goto("/settings?page=systemGo2rtcStreams");
    await expandStream(frigateApp.page, STREAM_NAME);

    // Two pre-populated audio rows — one per #audio= fragment.
    const audioLabel = frigateApp.page.locator(`label:text-is("Audio")`);
    const audioRowsContainer = audioLabel.locator("xpath=../..");
    await expect(audioRowsContainer.getByRole("combobox")).toHaveCount(2);
    await expect(audioRowsContainer.getByRole("combobox").first()).toHaveText(
      "Copy",
    );
    await expect(audioRowsContainer.getByRole("combobox").nth(1)).toHaveText(
      "Transcode to Opus",
    );

    // Add a third audio codec via the LuPlus next to the "Audio" label.
    await audioRowsContainer
      .getByRole("button", { name: "Add audio codec" })
      .click();
    await expect(audioRowsContainer.getByRole("combobox")).toHaveCount(3);

    // Change the newly-added entry to AAC.
    await audioRowsContainer.getByRole("combobox").nth(2).click();
    await frigateApp.page
      .getByRole("option", { name: "Transcode to AAC" })
      .click();

    await frigateApp.page.getByRole("button", { name: "Save" }).click();
    await expect
      .poll(() => capture.capturedConfig(), { timeout: 5_000 })
      .toMatchObject({
        config_data: {
          go2rtc: {
            streams: {
              [STREAM_NAME]: [
                "ffmpeg:rtsp://user:pass@192.168.0.20:554/Stream1#video=copy#audio=copy#audio=opus#audio=aac",
              ],
            },
          },
        },
      });
  });

  test("LuX is only shown on fallback rows and removes only that codec", async ({
    frigateApp,
  }) => {
    const capture = await installRawPathsRoute(
      frigateApp.page,
      "ffmpeg:rtsp://user:pass@192.168.0.20:554/Stream1#video=copy#audio=copy#audio=opus",
    );
    await frigateApp.goto("/settings?page=systemGo2rtcStreams");
    await expandStream(frigateApp.page, STREAM_NAME);

    const audioLabel = frigateApp.page.locator(`label:text-is("Audio")`);
    const audioRowsContainer = audioLabel.locator("xpath=../..");
    const removeButtons = audioRowsContainer.getByRole("button", {
      name: "Remove codec",
    });
    // Primary (audio=copy) row is permanent and has no X; only the audio=opus
    // fallback exposes a remove button.
    await expect(removeButtons).toHaveCount(1);

    await removeButtons.first().click();
    await expect(audioRowsContainer.getByRole("combobox")).toHaveCount(1);
    await expect(audioRowsContainer.getByRole("combobox")).toHaveText("Copy");

    await frigateApp.page.getByRole("button", { name: "Save" }).click();
    await expect
      .poll(() => capture.capturedConfig(), { timeout: 5_000 })
      .toMatchObject({
        config_data: {
          go2rtc: {
            streams: {
              [STREAM_NAME]: [
                "ffmpeg:rtsp://user:pass@192.168.0.20:554/Stream1#video=copy#audio=copy",
              ],
            },
          },
        },
      });
  });

  test("picking Exclude on the primary row drops the #video= fragment entirely", async ({
    frigateApp,
  }) => {
    const capture = await installRawPathsRoute(
      frigateApp.page,
      "ffmpeg:rtsp://user:pass@192.168.0.20:554/Stream1#video=copy#audio=copy",
    );
    await frigateApp.goto("/settings?page=systemGo2rtcStreams");
    await expandStream(frigateApp.page, STREAM_NAME);

    const videoLabel = frigateApp.page.locator(`label:text-is("Video")`);
    const videoRowsContainer = videoLabel.locator("xpath=../..");
    await videoRowsContainer.getByRole("combobox").first().click();
    await frigateApp.page.getByRole("option", { name: "Exclude" }).click();

    await frigateApp.page.getByRole("button", { name: "Save" }).click();
    await expect
      .poll(() => capture.capturedConfig(), { timeout: 5_000 })
      .toMatchObject({
        config_data: {
          go2rtc: {
            streams: {
              [STREAM_NAME]: [
                "ffmpeg:rtsp://user:pass@192.168.0.20:554/Stream1#audio=copy",
              ],
            },
          },
        },
      });
  });
});
