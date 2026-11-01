/**
 * Camera live playback stream settings tests -- MEDIUM tier.
 *
 * The live streams field maps a display name to a go2rtc stream. Switching
 * cameras from the selector keeps the form mounted and only swaps its data, so
 * the stream name input has to follow the newly selected camera. It used to be
 * an uncontrolled input, which left the previous camera's stream name on screen
 * and renamed the wrong key if the stale text was ever committed.
 *
 * Renames are committed per keystroke so the section is marked as modified
 * right away, except while the typed name belongs to another stream, since
 * renaming onto an existing name merges the two entries.
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

const GO2RTC_STREAMS = {
  front_door_main: ["rtsp://user:pass@192.168.0.20:554/Stream1"],
  backyard_main: ["rtsp://user:pass@192.168.0.21:554/Stream1"],
};

const CAMERA_LIVE_STREAMS = {
  front_door: { front_door: "front_door_main" },
  backyard: { backyard: "backyard_main" },
};

const SETTINGS_URL = "/settings?page=cameraLivePlayback&camera=front_door";

async function installRoutes(
  page: Page,
  frontDoorStreams: Record<string, string> = CAMERA_LIVE_STREAMS.front_door,
) {
  const config = configFactory({
    go2rtc: { streams: GO2RTC_STREAMS },
    cameras: {
      front_door: { live: { streams: frontDoorStreams } },
      backyard: { live: { streams: CAMERA_LIVE_STREAMS.backyard } },
    },
  });

  let lastSavedConfig: unknown = null;

  await page.route("**/api/config/schema.json", (route) =>
    route.fulfill({ json: CONFIG_SCHEMA }),
  );
  await page.route("**/api/config", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: config });
    }
    return route.fulfill({ json: { success: true } });
  });
  await page.route("**/api/config/raw_paths", (route) =>
    route.fulfill({
      json: {
        go2rtc: { streams: GO2RTC_STREAMS },
        cameras: {
          front_door: { live: { streams: frontDoorStreams } },
          backyard: { live: { streams: CAMERA_LIVE_STREAMS.backyard } },
        },
      },
    }),
  );
  await page.route("**/api/config/set", async (route) => {
    lastSavedConfig = route.request().postDataJSON();
    await route.fulfill({ json: { success: true, require_restart: false } });
  });

  return { capturedConfig: () => lastSavedConfig };
}

async function selectCamera(page: Page, friendlyName: string) {
  await page.getByRole("button", { name: "Select a camera" }).click();
  await page.getByRole("switch", { name: friendlyName }).click();
}

function streamNameInputs(page: Page) {
  return page.getByRole("textbox", { name: "Stream name" });
}

function streamNames(page: Page) {
  return streamNameInputs(page).evaluateAll((inputs) =>
    inputs.map((input) => (input as HTMLInputElement).value),
  );
}

/** Rows render in config order, which is not the order they were declared in. */
async function streamNameRow(page: Page, name: string) {
  await expect.poll(() => streamNames(page)).toContain(name);
  const names = await streamNames(page);
  return streamNameInputs(page).nth(names.indexOf(name));
}

test.describe("camera live playback streams @medium", () => {
  test("switching cameras updates the stream name field", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page);
    await frigateApp.goto(SETTINGS_URL);

    const streamName = frigateApp.page.getByRole("textbox", {
      name: "Stream name",
    });
    await expect(streamName).toHaveValue("front_door");
    await expect(
      frigateApp.page.getByRole("combobox", { name: "go2rtc stream" }),
    ).toContainText("front_door_main");

    await selectCamera(frigateApp.page, "Backyard");

    await expect(streamName).toHaveValue("backyard");
    await expect(
      frigateApp.page.getByRole("combobox", { name: "go2rtc stream" }),
    ).toContainText("backyard_main");
  });

  test("typing a new name enables Save without leaving the field", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page);
    await frigateApp.goto(SETTINGS_URL);

    const save = frigateApp.page.getByRole("button", { name: "Save" });
    await expect(save).toBeDisabled();

    const streamName = await streamNameRow(frigateApp.page, "front_door");
    await streamName.click();
    await frigateApp.page.keyboard.press("End");
    await frigateApp.page.keyboard.type("_hd");

    // Still focused: the rename is committed per keystroke, not on blur.
    await expect(save).toBeEnabled();
    await expect(streamName).toBeFocused();
    await expect(streamName).toHaveValue("front_door_hd");
  });

  test("typing through another stream's name keeps both streams", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, {
      front: "front_door_main",
      front_door: "backyard_main",
    });
    await frigateApp.goto(SETTINGS_URL);

    const streamName = await streamNameRow(frigateApp.page, "front_door");
    await streamName.click();
    await frigateApp.page.keyboard.press("End");
    // "front_door" passes through "front", which the other row already uses.
    await frigateApp.page.keyboard.press("Backspace");
    await frigateApp.page.keyboard.press("Backspace");
    await frigateApp.page.keyboard.press("Backspace");
    await frigateApp.page.keyboard.press("Backspace");
    await frigateApp.page.keyboard.press("Backspace");
    await expect(streamName).toHaveValue("front");
    await frigateApp.page.keyboard.type("yard");
    await streamName.blur();

    expect(await streamNames(frigateApp.page)).toEqual(["frontyard", "front"]);
  });

  test("renaming a stream saves the new name for the selected camera", async ({
    frigateApp,
  }) => {
    const capture = await installRoutes(frigateApp.page);
    await frigateApp.goto(SETTINGS_URL);

    await selectCamera(frigateApp.page, "Backyard");

    const streamName = frigateApp.page.getByRole("textbox", {
      name: "Stream name",
    });
    await expect(streamName).toHaveValue("backyard");
    await streamName.fill("Backyard HD");
    // The rename is committed on blur, not on every keystroke.
    await streamName.blur();

    await frigateApp.page.getByRole("button", { name: "Save" }).click();

    await expect
      .poll(() => capture.capturedConfig(), { timeout: 5_000 })
      .toMatchObject({
        config_data: {
          cameras: {
            backyard: {
              live: { streams: { "Backyard HD": "backyard_main" } },
            },
          },
        },
      });
  });
});
