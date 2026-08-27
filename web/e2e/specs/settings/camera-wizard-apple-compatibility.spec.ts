/**
 * Add-camera wizard - Apple/HEVC compatibility switch on Step 3.
 *
 * It writes the camera-level `ffmpeg.apple_compatibility`, which tags both
 * record outputs, so it shows only when every recording stream is H.265 and
 * starts on for Apple browsers. That default is user-agent driven, so the
 * second describe pins an explicit Safari and Chrome UA instead of relying
 * on the project's own.
 *
 * The save tests drive Step 4, which registers go2rtc streams and renders MSE
 * previews; they mock those and assert only the captured config/set body.
 */

import { test, expect } from "../../fixtures/frigate-test";
import type { Page, Locator } from "@playwright/test";

const MAIN_URI = "rtsp://admin:pw@192.168.1.100:554/stream1";
const SUB_URI = "rtsp://admin:pw@192.168.1.100:554/stream2";

const SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const CHROME_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const APPLE_TITLE = "Improve playback on Apple devices";

const PROBE = {
  success: true,
  host: "192.168.1.100",
  port: 80,
  manufacturer: "Acme",
  model: "Cam-1",
  firmware_version: "1.0",
  profiles_count: 2,
  ptz_supported: false,
  pan_tilt_supported: false,
  presets_count: 0,
  autotrack_supported: false,
  rtsp_candidates: [
    { source: "GetStreamUri", profile_token: "profile_1", uri: MAIN_URI },
    { source: "GetStreamUri", profile_token: "profile_2", uri: SUB_URI },
  ],
};

function ffprobeJson(codec: string) {
  return [
    {
      return_code: 0,
      stderr: [],
      stdout: {
        streams: [
          {
            codec_type: "video",
            codec_name: codec,
            width: 1920,
            height: 1080,
            avg_frame_rate: "15/1",
          },
          { codec_type: "audio", codec_name: "aac" },
        ],
      },
    },
  ];
}

/** Mock ffprobe, choosing the reported video codec per stream URL. */
async function mockFfprobe(page: Page, codecByUri: Record<string, string>) {
  await page.route("**/api/ffprobe**", (route) => {
    const paths = new URL(route.request().url()).searchParams.get("paths");
    const match = Object.keys(codecByUri).find((uri) => paths?.includes(uri));
    return route.fulfill({ json: ffprobeJson(codecByUri[match ?? ""] ?? "") });
  });
}

/** Open the wizard and drive Step 1 -> Step 2 -> Step 3. */
async function gotoStep3(page: Page) {
  await page.route("**/api/onvif/probe**", (route) =>
    route.fulfill({ json: PROBE }),
  );

  await page.getByRole("button", { name: /Add New Camera/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByPlaceholder(/front_door/i).fill("hevc_test_camera");
  await dialog.getByPlaceholder("192.168.1.100").fill("192.168.1.100");
  await dialog.getByRole("button", { name: /^Continue$/i }).click();

  const next = dialog.getByRole("button", { name: /^Next$/i });
  await expect(next).toBeEnabled({ timeout: 10_000 });
  await next.click();

  await expect(
    dialog.getByRole("button", { name: /Add Another Stream/i }),
  ).toBeVisible();
  return dialog;
}

/** The role toggle for `role` on the nth stream card (0-based). */
function roleSwitch(dialog: Locator, role: string, streamIndex = 0) {
  return dialog
    .locator("span.capitalize", { hasText: new RegExp(`^${role}$`) })
    .nth(streamIndex)
    .locator("xpath=..")
    .getByRole("switch");
}

/** Run "Test Connection" on the nth stream card and wait for the result. */
async function testStream(dialog: Locator, streamIndex = 0) {
  await dialog
    .getByRole("button", { name: /Test Connection/i })
    .nth(streamIndex)
    .click();
  await expect(
    dialog.getByText("Connected", { exact: true }).nth(streamIndex),
  ).toBeVisible();
}

function appleSwitch(dialog: Locator) {
  return dialog
    .locator("div.items-start.justify-between", { hasText: APPLE_TITLE })
    .getByRole("switch");
}

async function openCameraManagement(frigateApp: {
  page: Page;
  goto: (path: string) => Promise<void>;
}) {
  // not in the default mock; unmocked it 500s and trips the error collector
  await frigateApp.page.route("**/api/config/raw_paths", (route) =>
    route.fulfill({ json: {} }),
  );
  await frigateApp.goto("/settings?page=cameraManagement");
  await expect(
    frigateApp.page.getByRole("heading", { name: /Manage Cameras/i }),
  ).toBeVisible();
}

test.describe("Camera wizard Apple compatibility @medium @mobile", () => {
  test.beforeEach(async ({ frigateApp }) => {
    await openCameraManagement(frigateApp);
  });

  test("appears only once the record stream is probed as H.265", async ({
    frigateApp,
  }) => {
    await mockFfprobe(frigateApp.page, { [MAIN_URI]: "hevc" });
    const dialog = await gotoStep3(frigateApp.page);

    // the probe leaves the stream untested, so the codec is unknown
    await roleSwitch(dialog, "record").click();
    await expect(dialog.getByText(APPLE_TITLE)).toHaveCount(0);

    await testStream(dialog);
    await expect(dialog.getByText(APPLE_TITLE)).toBeVisible();
  });

  test("stays hidden for an H.264 record stream", async ({ frigateApp }) => {
    await mockFfprobe(frigateApp.page, { [MAIN_URI]: "h264" });
    const dialog = await gotoStep3(frigateApp.page);

    await roleSwitch(dialog, "record").click();
    await testStream(dialog);

    await expect(dialog.getByText(APPLE_TITLE)).toHaveCount(0);
  });

  test("stays hidden for an H.265 stream with no recording role", async ({
    frigateApp,
  }) => {
    await mockFfprobe(frigateApp.page, { [MAIN_URI]: "hevc" });
    const dialog = await gotoStep3(frigateApp.page);

    // detect is assigned by default; no record or record_sub role
    await testStream(dialog);
    await expect(roleSwitch(dialog, "detect")).toBeChecked();

    await expect(dialog.getByText(APPLE_TITLE)).toHaveCount(0);
  });

  test("appears for an H.265 record_sub stream", async ({ frigateApp }) => {
    await mockFfprobe(frigateApp.page, { [MAIN_URI]: "hevc" });
    const dialog = await gotoStep3(frigateApp.page);

    await roleSwitch(dialog, "record_sub").click();
    await testStream(dialog);

    await expect(dialog.getByText(APPLE_TITLE)).toBeVisible();
  });

  test("hides when the two recording streams use different codecs", async ({
    frigateApp,
  }) => {
    await mockFfprobe(frigateApp.page, {
      [MAIN_URI]: "hevc",
      [SUB_URI]: "h264",
    });
    const dialog = await gotoStep3(frigateApp.page);

    await roleSwitch(dialog, "record").click();
    await testStream(dialog);

    await dialog.getByRole("button", { name: /Add Another Stream/i }).click();
    await roleSwitch(dialog, "record_sub", 1).click();
    await testStream(dialog, 1);

    // the one camera-level flag cannot be right for both outputs
    await expect(dialog.getByText(APPLE_TITLE)).toHaveCount(0);
  });
});

test.describe("Camera wizard Apple compatibility default @medium @mobile", () => {
  test.describe("on an Apple browser", () => {
    test.use({ userAgent: SAFARI_UA });

    test.beforeEach(async ({ frigateApp }) => {
      await openCameraManagement(frigateApp);
    });

    test("starts on for an H.265 record stream and is saved", async ({
      frigateApp,
    }) => {
      const ffmpeg = await saveHevcCamera(frigateApp.page, {
        startsOn: true,
        toggle: false,
      });
      expect(ffmpeg.apple_compatibility).toBe(true);
    });

    test("can still be turned off, which omits it from the save", async ({
      frigateApp,
    }) => {
      const ffmpeg = await saveHevcCamera(frigateApp.page, {
        startsOn: true,
        toggle: true,
      });
      expect(ffmpeg).not.toHaveProperty("apple_compatibility");
    });
  });

  test.describe("on a non-Apple browser", () => {
    test.use({ userAgent: CHROME_UA });

    test.beforeEach(async ({ frigateApp }) => {
      await openCameraManagement(frigateApp);
    });

    test("starts off and is omitted so the global applies", async ({
      frigateApp,
    }) => {
      const ffmpeg = await saveHevcCamera(frigateApp.page, {
        startsOn: false,
        toggle: false,
      });
      expect(ffmpeg).not.toHaveProperty("apple_compatibility");
    });

    test("can be turned on, which writes it at camera level", async ({
      frigateApp,
    }) => {
      const ffmpeg = await saveHevcCamera(frigateApp.page, {
        startsOn: false,
        toggle: true,
      });
      expect(ffmpeg.apple_compatibility).toBe(true);
    });
  });
});

/**
 * Drive the whole wizard for an H.265 record stream, asserting the switch's
 * starting state and optionally toggling it, then return the `ffmpeg` section
 * of the camera that config/set received.
 */
async function saveHevcCamera(
  page: Page,
  { startsOn, toggle }: { startsOn: boolean; toggle: boolean },
) {
  await mockFfprobe(page, { [MAIN_URI]: "hevc" });

  const saved: Record<string, unknown>[] = [];
  await page.route("**/api/config/set", (route) => {
    saved.push(route.request().postDataJSON());
    return route.fulfill({ json: { success: true, require_restart: false } });
  });

  const dialog = await gotoStep3(page);
  await roleSwitch(dialog, "record").click();
  await testStream(dialog);

  await expect(appleSwitch(dialog)).toBeChecked({ checked: startsOn });
  if (toggle) {
    await appleSwitch(dialog).click();
    await expect(appleSwitch(dialog)).toBeChecked({ checked: !startsOn });
  }

  await dialog.getByRole("button", { name: /^Next$/i }).click();
  const save = dialog.getByRole("button", { name: /Save New Camera/i });
  await expect(save).toBeEnabled({ timeout: 15_000 });
  await save.click();

  // the camera PUT is the one carrying update_topic; go2rtc follows without it
  await expect
    .poll(() => saved.some((body) => "update_topic" in body), {
      timeout: 15_000,
    })
    .toBe(true);

  const cameraSave = saved.find((body) => "update_topic" in body) as {
    update_topic: string;
    config_data: {
      cameras: Record<string, { ffmpeg: { apple_compatibility?: boolean } }>;
    };
  };
  expect(cameraSave.update_topic).toBe("config/cameras/hevc_test_camera/add");
  return cameraSave.config_data.cameras.hevc_test_camera.ffmpeg;
}
