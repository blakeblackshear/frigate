/**
 * Runtime override tests -- MEDIUM tier.
 *
 * Live view, MQTT, and Home Assistant toggles change a camera's running config
 * without touching yaml, and the change persists across restarts. The settings
 * form edits yaml, so it keeps showing the saved value. Without a marker on the
 * field and runtime-aware wording on dependent warnings, the two read as a
 * contradiction: "audio detection is not enabled" next to a switch that is on.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "../../fixtures/frigate-test";
import type { Page } from "@playwright/test";
import { configFactory } from "../../fixtures/mock-data/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_SCHEMA = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../fixtures/mock-data/config-schema.json"),
    "utf-8",
  ),
);

const CAMERA = "front_door";
const TRANSCRIPTION_URL = `/settings?page=cameraAudioTranscription&camera=${CAMERA}`;
const AUDIO_URL = `/settings?page=cameraAudioEvents&camera=${CAMERA}`;

const CONFIG_DISABLED = /Audio detection is not enabled for this camera/;
const RUNTIME_DISABLED =
  /Audio detection is enabled in your config, but it is currently turned off/;

type AudioState = { enabled: boolean; enabled_in_config: boolean };

async function installRoutes(page: Page, audio: AudioState) {
  const config = configFactory({
    cameras: {
      [CAMERA]: {
        audio,
        // audio detection only runs on a stream carrying the audio role
        ffmpeg: {
          inputs: [
            {
              path: "rtsp://user:pass@host/front",
              roles: ["record", "detect", "audio"],
            },
          ],
        },
        audio_transcription: { enabled: true, enabled_in_config: true },
      },
    },
  });

  await page.route("**/api/config/raw_paths", (route) =>
    route.fulfill({
      json: { cameras: { [CAMERA]: { ffmpeg: { inputs: [] } } } },
    }),
  );
  await page.route("**/api/config/schema.json", (route) =>
    route.fulfill({ json: CONFIG_SCHEMA }),
  );
  await page.route("**/api/config", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: config });
    }
    return route.fulfill({ json: { success: true } });
  });
}

test.describe("runtime overrides @medium", () => {
  test("a runtime-only toggle gets its own wording and a field marker", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, {
      enabled: false,
      enabled_in_config: true,
    });

    await frigateApp.goto(TRANSCRIPTION_URL);
    await expect(frigateApp.page.getByText(RUNTIME_DISABLED)).toBeVisible();
    await expect(frigateApp.page.getByText(CONFIG_DISABLED)).toBeHidden();

    // The audio section still shows the saved value, so the switch stays on and
    // the marker carries the live state.
    await frigateApp.goto(AUDIO_URL);
    await expect(
      frigateApp.page.getByRole("switch", { name: "Enable audio detection" }),
    ).toHaveAttribute("data-state", "checked");
    // the boolean layout renders a mobile and a desktop label block, so only
    // one of the two badges is on screen
    await expect(
      frigateApp.page.getByText("Overridden (Live)").filter({ visible: true }),
    ).toHaveCount(1);
  });

  test("a config-disabled section keeps the original wording", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, {
      enabled: false,
      enabled_in_config: false,
    });

    await frigateApp.goto(TRANSCRIPTION_URL);
    await expect(frigateApp.page.getByText(CONFIG_DISABLED)).toBeVisible();
    await expect(frigateApp.page.getByText(RUNTIME_DISABLED)).toBeHidden();

    await frigateApp.goto(AUDIO_URL);
    await expect(
      frigateApp.page.getByRole("switch", { name: "Enable audio detection" }),
    ).toHaveAttribute("data-state", "unchecked");
    await expect(
      frigateApp.page.getByText("Overridden (Live)").filter({ visible: true }),
    ).toHaveCount(0);
  });
});
