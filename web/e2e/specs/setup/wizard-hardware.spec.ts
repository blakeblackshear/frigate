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
    onboarding?: { setup_complete?: boolean };
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

async function gotoDetectorStep(page: Page) {
  // welcome -> camera -> detector
  await page.getByRole("button", { name: "Get Started" }).click();
  await expect(page.getByText("Add Your First Camera")).toBeVisible();

  // The camera step's Next button only renders once addedCameras is
  // non-empty, and that state is local to the step (it isn't seeded from
  // the cameras already in config). Opening and cancelling the add-camera
  // dialog is enough: its close handler force-refetches /api/config, which
  // picks up the cameras already present in the mocked config and reveals
  // Next -- see SetupCamera.tsx's handleClose.
  await page.getByRole("button", { name: "Add Camera" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();

  await expect(page.getByRole("button", { name: "Next" })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Object Detection")).toBeVisible();
}

test.describe("setup wizard hardware @high @mobile", () => {
  test("lists probed hardware and writes a models config", async ({
    frigateApp,
    page,
  }) => {
    await frigateApp.installDefaults({
      // the base config snapshot predates the onboarding key, hence the cast
      config: { onboarding: { setup_complete: false } } as never,
      hwaccel: { preset: "preset-vaapi" },
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

    // detector -> hwaccel
    await expect(page.getByText("Hardware Acceleration")).toBeVisible();

    const detectorSave = saves.find((save) => save.config_data?.models);
    expect(detectorSave?.config_data?.models).toEqual([
      { devices: ["edgetpu:pci:0"] },
    ]);
    expect(detectorSave?.config_data?.detect).toEqual({ enabled: true });

    // Auto shows the preset derived from the chosen hardware and writes it
    await expect(page.getByText("preset-vaapi")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();

    const hwaccelSave = saves.find((save) => save.config_data?.ffmpeg);
    expect(hwaccelSave?.config_data?.ffmpeg).toEqual({
      hwaccel_args: "preset-vaapi",
    });

    // hwaccel -> recording (skipped) -> complete, where the saved steps only
    // take effect after a restart and the primary action says so
    const restarts = await captureRestarts(page);
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.getByText("You're All Set!")).toBeVisible();

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
    await frigateApp.installDefaults({
      config: { onboarding: { setup_complete: false } } as never,
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

    // with nothing derived, Auto advances without writing; skipping recording
    // leaves no pending saves, so finishing needs no restart
    const restarts = await captureRestarts(page);
    await expect(page.getByText("No compatible GPU found")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.getByText("You're All Set!")).toBeVisible();

    await expect(
      page.getByText("Frigate needs to restart to apply your settings"),
    ).toBeHidden();
    await page.getByRole("button", { name: "Go to Live View" }).click();

    // hands off without restarting; the mocked config still reports
    // onboarding incomplete, so the reload lands back on the wizard
    await expect(page.getByText("Welcome to Frigate")).toBeVisible();
    expect(restarts).toHaveLength(0);
    const finishSave = saves.find((save) => save.config_data?.onboarding);
    expect(finishSave?.config_data?.onboarding).toEqual({
      setup_complete: true,
    });
  });

  test("None writes an explicit empty hwaccel list", async ({
    frigateApp,
    page,
  }) => {
    await frigateApp.installDefaults({
      config: { onboarding: { setup_complete: false } } as never,
    });
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
