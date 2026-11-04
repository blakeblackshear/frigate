/**
 * Section reset button visibility -- MEDIUM tier.
 *
 * Reset deletes the section from config.yml, which fails when the key isn't
 * in the file. The button only shows when the section's values must have
 * come from the YAML.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect, type FrigateApp } from "../../fixtures/frigate-test";
import type { Page } from "@playwright/test";
import {
  configFactory,
  type DeepPartial,
} from "../../fixtures/mock-data/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_SCHEMA = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../fixtures/mock-data/config-schema.json"),
    "utf-8",
  ),
);

async function openSettings(
  app: FrigateApp,
  url: string,
  overrides: DeepPartial<ReturnType<typeof configFactory>> = {},
) {
  const { page } = app;
  const config = configFactory(overrides);

  await page.route("**/api/config/schema.json", (route) =>
    route.fulfill({ json: CONFIG_SCHEMA }),
  );
  await page.route("**/api/config", (route) => route.fulfill({ json: config }));
  await page.route("**/api/config/raw_paths", (route) =>
    route.fulfill({ json: { cameras: {}, go2rtc: { streams: {} } } }),
  );

  await app.goto(url);
}

const resetToDefault = (page: Page) =>
  page.getByRole("button", { name: "Reset to Default" });
const resetToGlobal = (page: Page) =>
  page.getByRole("button", { name: "Reset to Global" });

test.describe("section reset visibility @medium", () => {
  test("global section at its defaults hides reset", async ({ frigateApp }) => {
    await openSettings(frigateApp, "/settings?page=globalRecording");

    await expect(
      frigateApp.page.getByText("Retention", { exact: false }).first(),
    ).toBeVisible();
    await expect(resetToDefault(frigateApp.page)).toHaveCount(0);
  });

  test("global section with a changed value shows reset", async ({
    frigateApp,
  }) => {
    await openSettings(frigateApp, "/settings?page=globalRecording", {
      record: { expire_interval: 30 },
    });

    await expect(resetToDefault(frigateApp.page)).toBeVisible();
  });

  test("global ffmpeg with only resolved hwaccel args hides reset", async ({
    frigateApp,
  }) => {
    await openSettings(frigateApp, "/settings?page=globalFfmpeg");

    await expect(
      frigateApp.page
        .getByText("Hardware acceleration", { exact: false })
        .first(),
    ).toBeVisible();
    await expect(resetToDefault(frigateApp.page)).toHaveCount(0);
  });

  test("camera live with only backend streams hides reset", async ({
    frigateApp,
  }) => {
    await openSettings(
      frigateApp,
      "/settings?page=cameraLivePlayback&camera=front_door",
    );

    await expect(
      frigateApp.page.getByRole("switch", {
        name: "Enable transcoded streams",
      }),
    ).toBeVisible();
    await expect(resetToGlobal(frigateApp.page)).toHaveCount(0);
  });

  test("camera live with a quality override shows reset", async ({
    frigateApp,
  }) => {
    await openSettings(
      frigateApp,
      "/settings?page=cameraLivePlayback&camera=front_door",
      { cameras: { front_door: { live: { quality: 4 } } } },
    );

    await expect(resetToGlobal(frigateApp.page)).toBeVisible();
  });

  test("camera ffmpeg never shows reset", async ({ frigateApp }) => {
    await openSettings(
      frigateApp,
      "/settings?page=cameraFfmpeg&camera=front_door",
      { cameras: { front_door: { ffmpeg: { output_args: { record: "x" } } } } },
    );

    await expect(
      frigateApp.page
        .getByText("Hardware acceleration", { exact: false })
        .first(),
    ).toBeVisible();
    await expect(resetToGlobal(frigateApp.page)).toHaveCount(0);
  });
});
