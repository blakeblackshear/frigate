/**
 * Setup wizard hardware tests -- HIGH tier.
 *
 * Covers the detector step's probed radio list and the models: payload it
 * writes, the model-required deferral for onnx hardware, the hwaccel step's
 * Auto option writing the preset derived from the chosen hardware, and the
 * completion screen only restarting when a saved step requires it.
 */

import { test, expect } from "../../fixtures/frigate-test";
import type { Page } from "@playwright/test";
import { gotoDetectorStep, installFirstRun } from "../../helpers/setup-wizard";

const NVIDIA_HARDWARE = [
  {
    key: "onnx:nvidia",
    detector: "onnx",
    name: "NVIDIA GeForce RTX 3060",
    units: [{ device: "onnx:0", label: "NVIDIA GeForce RTX 3060" }],
    count: 1,
    unlimited: true,
  },
  {
    key: "cpu",
    detector: "cpu",
    name: "CPU",
    units: [{ device: "cpu", label: "CPU" }],
    count: 1,
    unlimited: true,
  },
];

type SavedConfig = {
  config_data?: {
    models?: { devices: string[]; path?: string }[];
    detect?: { enabled?: boolean };
    ffmpeg?: { hwaccel_args?: string | string[] };
  };
};

async function captureSaves(page: Page): Promise<SavedConfig[]> {
  const saves: SavedConfig[] = [];
  await page.route("**/api/config/set**", (route) => {
    saves.push(route.request().postDataJSON() as SavedConfig);
    return route.fulfill({ json: { success: true, require_restart: true } });
  });
  return saves;
}

async function captureRestarts(page: Page): Promise<string[]> {
  const calls: string[] = [];
  await page.route("**/api/restart", (route) => {
    calls.push(route.request().url());
    return route.fulfill({ json: { success: true, message: "Restarting" } });
  });
  return calls;
}

test.describe("setup wizard hardware @high @mobile", () => {
  test("lists probed hardware and writes a models config", async ({
    frigateApp,
    page,
  }) => {
    await installFirstRun(frigateApp, page, {
      hwaccel: {
        recommended: "vaapi",
        available: [
          { key: "vaapi", presets: { any: "preset-vaapi" } },
          {
            key: "intel-qsv",
            presets: {
              h264: "preset-intel-qsv-h264",
              h265: "preset-intel-qsv-h265",
            },
          },
        ],
      },
    });
    const saves = await captureSaves(page);

    await frigateApp.gotoAndWait("/", "text=Welcome to Frigate");
    await gotoDetectorStep(page);

    // the default hardware mock reports two Corals, an Intel GPU, and the CPU
    await expect(
      page.getByRole("radio", { name: /Coral EdgeTPU \(PCIe\) \(2\)/ }),
    ).toBeChecked();
    await expect(page.getByText("Recommended")).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByText("Hardware Acceleration")).toBeVisible();

    const detectorSave = saves.find((save) => save.config_data?.models);
    expect(detectorSave?.config_data?.models).toEqual([
      { devices: ["edgetpu:pci:0"] },
    ]);
    expect(detectorSave?.config_data?.detect).toEqual({ enabled: true });

    // VAAPI decodes any codec, so one global value covers every camera
    await expect(page.getByText("Will use VAAPI (Intel/AMD)")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();

    const hwaccelSave = saves.find((save) => save.config_data?.ffmpeg);
    expect(hwaccelSave?.config_data?.ffmpeg).toEqual({
      hwaccel_args: "preset-vaapi",
    });

    // the saved steps only take effect after a restart
    const restarts = await captureRestarts(page);
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.getByText("You're done!")).toBeVisible();

    await expect(
      page.getByText("Frigate needs to restart to apply your settings"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Apply & Restart" }).click();

    await expect(page.getByText("Starting Frigate...")).toBeVisible();
    expect(restarts).toHaveLength(1);
  });

  test("defers model setup for onnx hardware without Frigate+", async ({
    frigateApp,
    page,
  }) => {
    await installFirstRun(frigateApp, page, {
      hardware: NVIDIA_HARDWARE,
    });
    const saves = await captureSaves(page);

    await frigateApp.gotoAndWait("/", "text=Welcome to Frigate");
    await gotoDetectorStep(page);

    await expect(
      page.getByRole("radio", { name: /NVIDIA GeForce RTX 3060/ }),
    ).toBeChecked();

    await page
      .getByRole("button", { name: "Continue without detection" })
      .click();

    // advances without touching the config
    await expect(page.getByText("Hardware Acceleration")).toBeVisible();
    expect(saves.filter((save) => save.config_data?.models)).toHaveLength(0);

    // nothing derived and nothing saved, so finishing needs no restart
    const restarts = await captureRestarts(page);
    await expect(page.getByText("No supported video card found")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.getByText("You're done!")).toBeVisible();

    await expect(
      page.getByText("Frigate needs to restart to apply your settings"),
    ).toBeHidden();
    await page.getByRole("button", { name: "Go to Live View" }).click();

    // hands off without restarting, and the wizard does not come back
    await expect(page.getByText("Welcome to Frigate")).toBeHidden();
    expect(restarts).toHaveLength(0);
  });

  test("offers only the presets the hardware supports", async ({
    frigateApp,
    page,
  }) => {
    await installFirstRun(frigateApp, page, {
      hardware: NVIDIA_HARDWARE,
      hwaccel: {
        recommended: "nvidia",
        available: [{ key: "nvidia", presets: { any: "preset-nvidia" } }],
      },
    });
    await captureSaves(page);

    await frigateApp.gotoAndWait("/", "text=Welcome to Frigate");
    await gotoDetectorStep(page);
    await page
      .getByRole("button", { name: "Continue without detection" })
      .click();
    await expect(page.getByText("Hardware Acceleration")).toBeVisible();

    // an NVIDIA box has no business being offered Rockchip or Pi decoding
    await expect(
      page.getByRole("radio", { name: "CUDA (NVIDIA)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("radio", { name: /Raspberry Pi/ }),
    ).toBeHidden();
    await expect(page.getByRole("radio", { name: /Rockchip/ })).toBeHidden();

    // Auto and None are always available
    await expect(page.getByRole("radio", { name: "Auto" })).toBeVisible();
    await expect(
      page.getByRole("radio", { name: "None (software decoding)" }),
    ).toBeVisible();
  });

  test("a codec specific family falls back to h264 with no cameras", async ({
    frigateApp,
    page,
  }) => {
    await installFirstRun(frigateApp, page, {
      hwaccel: {
        recommended: "jetson",
        available: [
          {
            key: "jetson",
            presets: {
              h264: "preset-jetson-h264",
              h265: "preset-jetson-h265",
            },
          },
        ],
      },
    });
    const saves = await captureSaves(page);

    await frigateApp.gotoAndWait("/", "text=Welcome to Frigate");
    await gotoDetectorStep(page);
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Hardware Acceleration")).toBeVisible();

    await expect(
      page.getByRole("radio", { name: "NVIDIA Jetson" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();

    // no camera was added, so there is no codec to match
    const hwaccelSave = saves.find((save) => save.config_data?.ffmpeg);
    expect(hwaccelSave?.config_data?.ffmpeg).toEqual({
      hwaccel_args: "preset-jetson-h264",
    });
  });

  test("None writes an explicit empty hwaccel list", async ({
    frigateApp,
    page,
  }) => {
    await installFirstRun(frigateApp, page);
    const saves = await captureSaves(page);

    await frigateApp.gotoAndWait("/", "text=Welcome to Frigate");
    await gotoDetectorStep(page);
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Hardware Acceleration")).toBeVisible();

    await page.getByRole("radio", { name: "None (software decoding)" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    const hwaccelSave = saves.find((save) => save.config_data?.ffmpeg);
    expect(hwaccelSave?.config_data?.ffmpeg).toEqual({ hwaccel_args: [] });
  });
});
