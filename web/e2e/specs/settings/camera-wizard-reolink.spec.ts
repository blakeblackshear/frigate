/**
 * Add-camera wizard - Reolink stream selection with the brand template.
 *
 * The wizard asks the camera for its resolution, then probes http-flv first
 * above 5MP and falls back to RTSP. The Step 4 RTSP warning is only for
 * cameras that should be on http-flv.
 */

import { test, expect } from "../../fixtures/frigate-test";
import type { Page } from "@playwright/test";

const FLV_PATH = "channel0_main.bcs";
const RTSP_PATH = "Preview_01_main";
const RTSP_WARNING = "Reolink RTSP is not recommended";

const FFPROBE_OK = [
  {
    return_code: 0,
    stderr: [],
    stdout: {
      streams: [
        {
          codec_type: "video",
          codec_name: "hevc",
          width: 3840,
          height: 2160,
          avg_frame_rate: "15/1",
        },
        { codec_type: "audio", codec_name: "aac" },
      ],
    },
  },
];

const FFPROBE_FAILED = [
  { return_code: 1, stderr: ["probe failed"], stdout: "" },
];

/**
 * Mock the camera's answers and drive the wizard to Step 3. Returns the
 * dialog and the stream paths the wizard probed, in order.
 */
async function gotoStep3(
  page: Page,
  { protocol, flvProbes }: { protocol: string | null; flvProbes: boolean },
) {
  const probed: string[] = [];

  await page.route("**/api/reolink/detect**", (route) =>
    route.fulfill({ json: { success: protocol !== null, protocol } }),
  );
  await page.route("**/api/ffprobe**", (route) => {
    const paths = new URL(route.request().url()).searchParams.get("paths");
    const isFlv = !!paths?.includes(FLV_PATH);
    probed.push(isFlv ? FLV_PATH : RTSP_PATH);
    return route.fulfill({
      json: isFlv && !flvProbes ? FFPROBE_FAILED : FFPROBE_OK,
    });
  });
  await page.route("**/api/ffprobe/snapshot**", (route) =>
    route.fulfill({ status: 500 }),
  );

  await page.getByRole("button", { name: /Add New Camera/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByPlaceholder(/front_door/i).fill("reolink_test_camera");
  await dialog.getByPlaceholder("192.168.1.100").fill("192.168.1.100");
  await dialog.getByPlaceholder("Optional").first().fill("admin");
  await dialog.getByPlaceholder("Optional").last().fill("pw");
  await dialog.getByText("Manual selection").click();
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "Reolink" }).click();
  await dialog.getByRole("button", { name: /^Continue$/i }).click();

  // Step 2 tests the connection on its own, then offers Continue
  const next = dialog.getByRole("button", { name: /^Continue$/i });
  await expect(next).toBeEnabled({ timeout: 10_000 });
  await next.click();

  await expect(
    dialog.getByRole("button", { name: /Add Another Stream/i }),
  ).toBeVisible();
  return { dialog, probed };
}

test.describe("Camera wizard Reolink stream selection @medium @mobile", () => {
  test.beforeEach(async ({ frigateApp }) => {
    // not in the default mock; unmocked it 500s and trips the error collector
    await frigateApp.page.route("**/api/config/raw_paths", (route) =>
      route.fulfill({ json: {} }),
    );
    await frigateApp.goto("/settings?page=cameraManagement");
    await expect(
      frigateApp.page.getByRole("heading", { name: /Manage Cameras/i }),
    ).toBeVisible();
  });

  test("above 5MP keeps http-flv when it probes", async ({ frigateApp }) => {
    const { dialog, probed } = await gotoStep3(frigateApp.page, {
      protocol: "rtsp",
      flvProbes: true,
    });

    expect(probed).toEqual([FLV_PATH]);
    await expect(dialog.locator(`input[value*="${FLV_PATH}"]`)).toBeVisible();
  });

  test("above 5MP falls back to RTSP without a warning", async ({
    frigateApp,
  }) => {
    const { dialog, probed } = await gotoStep3(frigateApp.page, {
      protocol: "rtsp",
      flvProbes: false,
    });

    expect(probed).toEqual([FLV_PATH, RTSP_PATH]);
    await expect(dialog.locator(`input[value*="${RTSP_PATH}"]`)).toBeVisible();

    await dialog.getByRole("button", { name: /^Next$/i }).click();
    await expect(
      dialog.getByRole("button", { name: /Save New Camera/i }),
    ).toBeVisible();
    await expect(dialog.getByText(RTSP_WARNING)).toHaveCount(0);
  });

  test("failed detection uses RTSP and warns", async ({ frigateApp }) => {
    const { dialog, probed } = await gotoStep3(frigateApp.page, {
      protocol: null,
      flvProbes: true,
    });

    expect(probed).toEqual([RTSP_PATH]);

    await dialog.getByRole("button", { name: /^Next$/i }).click();
    await expect(dialog.getByText(RTSP_WARNING)).toBeVisible();
  });
});
