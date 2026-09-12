/**
 * Camera ffmpeg streams settings tests -- MEDIUM tier.
 *
 * Covers the input-path source toggle: each ffmpeg input can either point at a
 * go2rtc restream (picked from a dropdown, which writes the rtsp://127.0.0.1:8554
 * path plus the preset-rtsp-restream input_args) or use a manually typed path.
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
  dome_main: ["rtsp://user:pass@192.168.0.20:554/Stream1"],
  dome_sub: ["rtsp://user:pass@192.168.0.20:554/Stream2"],
};

type CameraInput = {
  path: string;
  roles: string[];
  input_args?: string;
};

async function installRoutes(page: Page, frontDoorInputs: CameraInput[]) {
  const config = configFactory({
    go2rtc: { streams: GO2RTC_STREAMS },
    cameras: {
      front_door: {
        ffmpeg: { inputs: frontDoorInputs },
      },
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
        cameras: { front_door: { ffmpeg: { inputs: frontDoorInputs } } },
        go2rtc: { streams: GO2RTC_STREAMS },
      },
    }),
  );
  await page.route("**/api/config/set", async (route) => {
    lastSavedConfig = route.request().postDataJSON();
    await route.fulfill({ json: { success: true, require_restart: false } });
  });
  await page.route("**/api/ffmpeg/presets", (route) =>
    route.fulfill({
      json: {
        hwaccel_args: [],
        input_args: ["preset-rtsp-restream", "preset-rtsp-generic"],
        output_args: { record: [], detect: [] },
      },
    }),
  );

  return { capturedConfig: () => lastSavedConfig };
}

const RESTREAM_RADIO = "Restream (go2rtc)";
const MANUAL_RADIO = "Manual input path";

test.describe("camera ffmpeg input source toggle @medium", () => {
  test("manual input defaults to the manual text field", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, [
      { path: "rtsp://10.0.0.1:554/video", roles: ["detect"] },
    ]);
    await frigateApp.goto("/settings?page=cameraFfmpeg&camera=front_door");

    await expect(
      frigateApp.page.getByRole("radio", { name: MANUAL_RADIO }),
    ).toBeChecked();
    await expect(
      frigateApp.page.getByRole("textbox", { name: "Input path" }),
    ).toHaveValue("rtsp://10.0.0.1:554/video");
  });

  test("an existing restream path auto-detects into restream mode", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, [
      {
        path: "rtsp://127.0.0.1:8554/dome_main",
        roles: ["detect"],
        input_args: "preset-rtsp-restream",
      },
    ]);
    await frigateApp.goto("/settings?page=cameraFfmpeg&camera=front_door");

    await expect(
      frigateApp.page.getByRole("radio", { name: RESTREAM_RADIO }),
    ).toBeChecked();
    // The dropdown is preselected to the matching go2rtc stream.
    await expect(
      frigateApp.page.getByRole("combobox", { name: /go2rtc stream/i }),
    ).toContainText("dome_main");
  });

  test("selecting a restream writes the path and preset", async ({
    frigateApp,
  }) => {
    const capture = await installRoutes(frigateApp.page, [
      { path: "rtsp://10.0.0.1:554/video", roles: ["detect"] },
    ]);
    await frigateApp.goto("/settings?page=cameraFfmpeg&camera=front_door");

    await frigateApp.page.getByRole("radio", { name: RESTREAM_RADIO }).click();
    await frigateApp.page
      .getByRole("combobox", { name: /go2rtc stream/i })
      .click();

    // The dropdown is searchable: typing narrows the list to matches only,
    // with no option to enter a custom stream name.
    await frigateApp.page.getByPlaceholder("Search streams...").fill("sub");
    await expect(
      frigateApp.page.getByRole("option", { name: "dome_main" }),
    ).toBeHidden();
    await frigateApp.page.getByRole("option", { name: "dome_sub" }).click();

    await frigateApp.page.getByRole("button", { name: "Save" }).click();

    await expect
      .poll(() => capture.capturedConfig(), { timeout: 5_000 })
      .toMatchObject({
        config_data: {
          cameras: {
            front_door: {
              ffmpeg: {
                inputs: [
                  {
                    path: "rtsp://127.0.0.1:8554/dome_sub",
                    input_args: "preset-rtsp-restream",
                  },
                ],
              },
            },
          },
        },
      });
  });

  test("switching a restream back to manual reverts the preset", async ({
    frigateApp,
  }) => {
    const capture = await installRoutes(frigateApp.page, [
      {
        path: "rtsp://127.0.0.1:8554/dome_main",
        roles: ["detect"],
        input_args: "preset-rtsp-restream",
      },
    ]);
    await frigateApp.goto("/settings?page=cameraFfmpeg&camera=front_door");

    await frigateApp.page.getByRole("radio", { name: MANUAL_RADIO }).click();

    // The restream path stays editable in the manual text field.
    await expect(
      frigateApp.page.getByRole("textbox", { name: "Input path" }),
    ).toHaveValue("rtsp://127.0.0.1:8554/dome_main");

    await frigateApp.page.getByRole("button", { name: "Save" }).click();

    await expect
      .poll(() => capture.capturedConfig(), { timeout: 5_000 })
      .not.toBeNull();

    const payload = capture.capturedConfig() as {
      config_data?: {
        cameras?: {
          front_door?: {
            ffmpeg?: { inputs?: Array<{ input_args?: unknown }> };
          };
        };
      };
    };
    const input =
      payload?.config_data?.cameras?.front_door?.ffmpeg?.inputs?.[0];
    expect(input?.input_args).not.toBe("preset-rtsp-restream");
  });
});
