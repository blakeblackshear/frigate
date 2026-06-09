/**
 * Add-camera wizard — PTZ controls pane.
 *
 * The pane lives on Step 3 (Stream Configuration) and only appears when the
 * ONVIF probe from Step 2 reported `ptz_supported`. These tests drive the
 * wizard to Step 3 with a mocked probe and assert the pane's contract:
 *   1. Visible + enabled when the probe reports PTZ, with the connection
 *      fields collapsed by default and pre-filled once expanded.
 *   2. Toggling the switch off hides the disclosure and its fields.
 *   3. Clearing the host shows the validation warning and blocks "Next".
 *   4. Absent entirely when the probe reports no PTZ support.
 *
 * The save path (writing the `onvif` section to config/set) runs through
 * Step 4's live-validation flow, which registers go2rtc streams and renders
 * MSE previews that are unreliable in headless Chromium. Consistent with
 * clone-camera.spec.ts, that assertion is deferred to manual QA; the logic is
 * covered by the Step 4 -> parent handleSave wiring.
 */

import { test, expect } from "../../fixtures/frigate-test";
import type { Page, Locator } from "@playwright/test";

const PTZ_PROBE = {
  success: true,
  host: "192.168.1.100",
  port: 80,
  manufacturer: "Acme",
  model: "PTZ-1",
  firmware_version: "1.0",
  profiles_count: 1,
  ptz_supported: true,
  presets_count: 2,
  autotrack_supported: false,
  rtsp_candidates: [
    {
      source: "GetStreamUri",
      profile_token: "profile_1",
      uri: "rtsp://admin:pw@192.168.1.100:554/stream1",
    },
  ],
};

async function mockProbe(page: Page, probe: object) {
  await page.route("**/api/onvif/probe**", (route) =>
    route.fulfill({ json: probe }),
  );
}

/** Open the wizard and drive Step 1 -> Step 2 -> Step 3. */
async function gotoStep3(page: Page, host = "192.168.1.100") {
  await page.getByRole("button", { name: /Add New Camera/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Step 1: name + host (probe mode is the default), then Continue.
  await dialog.getByPlaceholder(/front_door/i).fill("ptz_test_camera");
  await dialog.getByPlaceholder("192.168.1.100").fill(host);
  await dialog.getByRole("button", { name: /^Continue$/i }).click();

  // Step 2: the probe auto-runs on mount; once candidates exist, Next enables.
  const next = dialog.getByRole("button", { name: /^Next$/i });
  await expect(next).toBeEnabled({ timeout: 10_000 });
  await next.click();

  // Step 3 renders the stream-configuration description.
  await expect(dialog.getByText(/Configure stream roles/i)).toBeVisible();
  return dialog;
}

/** The PTZ enable switch (scoped to the PTZ card header row). */
function ptzSwitch(dialog: Locator) {
  return dialog
    .locator("div.justify-between", { hasText: "Enable PTZ Controls" })
    .getByRole("switch");
}

/** Expand the (collapsed-by-default) ONVIF connection-detail fields. */
async function expandOnvifDetails(dialog: Locator) {
  await dialog
    .getByRole("button", { name: /ONVIF connection details/i })
    .click();
}

test.describe("Camera wizard PTZ pane @medium @mobile", () => {
  test.beforeEach(async ({ frigateApp }) => {
    await frigateApp.goto("/settings?page=cameraManagement");
    await expect(
      frigateApp.page.getByRole("heading", { name: /Manage Cameras/i }),
    ).toBeVisible();
  });

  test("shows an enabled PTZ pane with collapsed, pre-filled fields", async ({
    frigateApp,
  }) => {
    await mockProbe(frigateApp.page, PTZ_PROBE);
    const dialog = await gotoStep3(frigateApp.page);

    // Card is present with the detected note and the switch defaults on.
    await expect(
      dialog.getByText("Enable PTZ Controls", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText(/PTZ support has been detected via ONVIF/i),
    ).toBeVisible();
    await expect(ptzSwitch(dialog)).toBeChecked();

    // Connection fields are collapsed by default.
    await expect(dialog.getByPlaceholder("192.168.1.100")).toHaveCount(0);

    // Expanding reveals the host pre-filled from the probe.
    await expandOnvifDetails(dialog);
    await expect(dialog.getByPlaceholder("192.168.1.100")).toHaveValue(
      "192.168.1.100",
    );
  });

  test("toggling the switch off hides the disclosure and fields", async ({
    frigateApp,
  }) => {
    await mockProbe(frigateApp.page, PTZ_PROBE);
    const dialog = await gotoStep3(frigateApp.page);

    await expandOnvifDetails(dialog);
    await expect(dialog.getByPlaceholder("192.168.1.100")).toBeVisible();

    await ptzSwitch(dialog).click();

    await expect(dialog.getByPlaceholder("192.168.1.100")).toHaveCount(0);
    await expect(
      dialog.getByRole("button", { name: /ONVIF connection details/i }),
    ).toHaveCount(0);
  });

  test("clearing the host shows the warning and blocks Next", async ({
    frigateApp,
  }) => {
    await mockProbe(frigateApp.page, PTZ_PROBE);
    const dialog = await gotoStep3(frigateApp.page);

    await expandOnvifDetails(dialog);
    await dialog.getByPlaceholder("192.168.1.100").fill("");

    await expect(
      dialog.getByText(/An ONVIF host and port are required/i),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /^Next$/i }),
    ).toBeDisabled();
  });

  test("shows the pane but leaves the switch off when no presets are found", async ({
    frigateApp,
  }) => {
    await mockProbe(frigateApp.page, { ...PTZ_PROBE, presets_count: 0 });
    const dialog = await gotoStep3(frigateApp.page);

    await expect(
      dialog.getByText("Enable PTZ Controls", { exact: true }),
    ).toBeVisible();
    await expect(ptzSwitch(dialog)).not.toBeChecked();
    // with the switch off, the connection fields are not shown
    await expect(dialog.getByPlaceholder("192.168.1.100")).toHaveCount(0);
  });

  test("hides the PTZ pane when the probe reports no PTZ support", async ({
    frigateApp,
  }) => {
    await mockProbe(frigateApp.page, { ...PTZ_PROBE, ptz_supported: false });
    const dialog = await gotoStep3(frigateApp.page);

    await expect(
      dialog.getByText("Enable PTZ Controls", { exact: true }),
    ).toHaveCount(0);
  });
});
