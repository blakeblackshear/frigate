/**
 * Live playback stream order and transcoded streams -- MEDIUM tier.
 *
 * The stream list order is the Auto ladder, so the form saves it with
 * replace_paths. Transcoded streams are generated from live.transcode and
 * appear in the list as soon as the switch flips.
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
  front_door_main: ["rtsp://user:pass@192.168.0.20:554/main"],
  front_door_sub: ["rtsp://user:pass@192.168.0.20:554/sub"],
};

const TRANSCODE = {
  enabled: false,
  qualities: [
    { height: 720, bitrate: 1200 },
    { height: 480, bitrate: 500 },
  ],
};

const SETTINGS_URL = "/settings?page=cameraLivePlayback&camera=front_door";

type RouteOptions = {
  go2rtcStreams?: Record<string, string[]>;
  streams?: Record<string, string>;
  bitrates?: Record<string, number>;
};

async function installRoutes(page: Page, options: RouteOptions = {}) {
  const go2rtcStreams = options.go2rtcStreams ?? GO2RTC_STREAMS;
  const streams = options.streams ?? {
    Sub: "front_door_sub",
    Main: "front_door_main",
  };
  const live = { streams, transcode: TRANSCODE };
  const config = configFactory({
    go2rtc: { streams: go2rtcStreams },
    cameras: { front_door: { live } },
  });
  // configFactory's deepMerge adds override keys onto the base fixture's
  // streams map instead of replacing it (they share no key names here), so
  // pin the streams map to exactly what this test wants.
  config.cameras.front_door.live.streams = streams;

  let lastSaved: Record<string, unknown> | null = null;

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
        go2rtc: { streams: go2rtcStreams },
        cameras: { front_door: { live } },
      },
    }),
  );
  await page.route("**/api/config/set", async (route) => {
    lastSaved = route.request().postDataJSON();
    await route.fulfill({ json: { success: true, go2rtc_synced: true } });
  });
  await page.route("**/api/go2rtc/streams/*/bitrate", (route) => {
    const name = decodeURIComponent(
      new URL(route.request().url()).pathname.split("/").slice(-2)[0],
    );
    const kbps = options.bitrates?.[name];
    return kbps === undefined
      ? route.fulfill({ status: 502, json: { success: false } })
      : route.fulfill({ json: { success: true, kbps } });
  });

  return { saved: () => lastSaved };
}

function streamNames(page: Page) {
  return page
    .getByRole("textbox", { name: "Stream name" })
    .evaluateAll((inputs) =>
      inputs.map((input) => (input as HTMLInputElement).value),
    );
}

async function dragRow(page: Page, from: number, to: number) {
  const handles = page.getByRole("button", { name: "Drag to reorder" });
  const start = await handles.nth(from).boundingBox();
  const end = await handles.nth(to).boundingBox();

  if (!start || !end) throw new Error("drag handle not visible");

  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    end.x + end.width / 2,
    end.y + end.height / 2 + (to > from ? 12 : -12),
    { steps: 15 },
  );
  await page.mouse.up();
}

test.describe("live stream order and transcoded streams @medium", () => {
  test.skip(({ frigateApp }) => frigateApp.isMobile, "desktop drag");

  test("dragging a stream saves the new order", async ({ frigateApp }) => {
    const capture = await installRoutes(frigateApp.page);
    await frigateApp.goto(SETTINGS_URL);

    await expect
      .poll(() => streamNames(frigateApp.page))
      .toEqual(["Sub", "Main"]);

    await dragRow(frigateApp.page, 1, 0);
    await expect
      .poll(() => streamNames(frigateApp.page))
      .toEqual(["Main", "Sub"]);

    await frigateApp.page.getByRole("button", { name: "Save" }).click();

    await expect.poll(() => capture.saved()).not.toBeNull();
    const saved = capture.saved() as {
      replace_paths: string[];
      config_data: {
        cameras: { front_door: { live: { streams: Record<string, string> } } };
      };
    };
    expect(saved.replace_paths).toEqual(["cameras.front_door.live.streams"]);
    expect(
      Object.keys(saved.config_data.cameras.front_door.live.streams),
    ).toEqual(["Main", "Sub"]);
  });

  test("enabling transcoding saves the shown source", async ({
    frigateApp,
  }) => {
    const capture = await installRoutes(frigateApp.page);
    await frigateApp.goto(SETTINGS_URL);

    await frigateApp.page
      .getByRole("switch", { name: "Enable transcoded streams" })
      .click();
    await frigateApp.page.getByRole("button", { name: "Save" }).click();

    await expect.poll(() => capture.saved()).not.toBeNull();
    const saved = capture.saved() as {
      config_data: {
        cameras: {
          front_door: { live: { transcode: Record<string, unknown> } };
        };
      };
    };
    // pinned, so dragging another stream to the top can't change it
    expect(saved.config_data.cameras.front_door.live.transcode).toMatchObject({
      enabled: true,
      source: "front_door_sub",
    });
  });

  test("the transcode switch adds and removes transcoded rows", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page);
    await frigateApp.goto(SETTINGS_URL);

    const toggle = frigateApp.page.getByRole("switch", {
      name: "Enable transcoded streams",
    });
    const save = frigateApp.page.getByRole("button", { name: "Save" });

    await toggle.click();
    await expect
      .poll(() => streamNames(frigateApp.page))
      .toEqual(["Sub", "Main", "720p", "480p"]);
    await expect(
      frigateApp.page.getByText("Transcoded", { exact: true }),
    ).toHaveCount(2);
    await expect(save).toBeEnabled();

    await toggle.click();
    await expect
      .poll(() => streamNames(frigateApp.page))
      .toEqual(["Sub", "Main"]);
    await expect(save).toBeDisabled();
  });

  test("auto order sorts measured and set bitrates", async ({ frigateApp }) => {
    await installRoutes(frigateApp.page, {
      bitrates: { front_door_main: 4000, front_door_sub: 800 },
    });
    await frigateApp.goto(SETTINGS_URL);

    await frigateApp.page
      .getByRole("switch", { name: "Enable transcoded streams" })
      .click();
    await frigateApp.page.getByRole("button", { name: "Auto order" }).click();

    await expect
      .poll(() => streamNames(frigateApp.page))
      .toEqual(["Main", "720p", "Sub", "480p"]);
    await expect(frigateApp.page.getByText("4000 kbps")).toBeVisible();
    await expect(frigateApp.page.getByText("1200 kbps (set)")).toBeVisible();
  });

  test("an unmeasurable stream sorts last", async ({ frigateApp }) => {
    await installRoutes(frigateApp.page, {
      bitrates: { front_door_main: 4000 },
    });
    await frigateApp.goto(SETTINGS_URL);

    await frigateApp.page.getByRole("button", { name: "Auto order" }).click();

    await expect
      .poll(() => streamNames(frigateApp.page))
      .toEqual(["Main", "Sub"]);
    await expect(frigateApp.page.getByText("Couldn't measure")).toBeVisible();
  });

  test("transcoding needs a go2rtc stream", async ({ frigateApp }) => {
    await installRoutes(frigateApp.page, {
      go2rtcStreams: {},
      streams: { front_door: "front_door" },
    });
    await frigateApp.goto(SETTINGS_URL);

    await expect(
      frigateApp.page.getByRole("switch", {
        name: "Enable transcoded streams",
      }),
    ).toBeDisabled();
    await expect(
      frigateApp.page.getByText(/need a go2rtc stream to read from/),
    ).toBeVisible();
  });
});
