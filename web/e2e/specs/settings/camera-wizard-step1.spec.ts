/**
 * Add-camera wizard Step 1 validation -- MEDIUM tier.
 *
 * Continue validates every field, so an invalid ONVIF port or a non-RTSP
 * custom URL must show its translated message and keep the wizard on Step 1.
 */

import { test, expect } from "../../fixtures/frigate-test";
import type { Page } from "@playwright/test";

const PORT_ERROR = "ONVIF port must be a whole number from 1 to 65535";

async function openWizard(page: Page) {
  await page.getByRole("button", { name: /Add New Camera/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder(/front_door/i).fill("step1_camera");
  return dialog;
}

test.describe("Camera wizard step 1 validation @medium @mobile", () => {
  test.beforeEach(async ({ frigateApp }) => {
    // not in the default mock; unmocked it 500s and trips the error collector
    await frigateApp.page.route("**/api/config/raw_paths", (route) =>
      route.fulfill({ json: {} }),
    );
    await frigateApp.page.route("**/api/onvif/probe**", (route) =>
      route.fulfill({ json: { success: false } }),
    );
    await frigateApp.goto("/settings?page=cameraManagement");
    await expect(
      frigateApp.page.getByRole("heading", { name: /Manage Cameras/i }),
    ).toBeVisible();
  });

  test("an invalid ONVIF port blocks Continue with a translated message", async ({
    frigateApp,
  }) => {
    const dialog = await openWizard(frigateApp.page);
    await dialog.getByPlaceholder("192.168.1.100").fill("192.168.1.100");
    const port = dialog.getByPlaceholder("80", { exact: true });
    const next = dialog.getByRole("button", { name: /^Continue$/i });

    for (const value of ["abc", "0", "70000", "80.5"]) {
      await port.fill(value);
      await next.click();
      await expect(dialog.getByText(PORT_ERROR)).toBeVisible();
      await expect(port).toBeVisible();
    }

    await port.fill("8080");
    await next.click();
    await expect(port).toBeHidden();
    await expect(dialog.getByText(PORT_ERROR)).toBeHidden();
  });

  test("a custom URL must use RTSP", async ({ frigateApp }) => {
    const dialog = await openWizard(frigateApp.page);
    await dialog.getByText("Manual selection", { exact: true }).click();
    await dialog.getByRole("combobox").click();
    await frigateApp.page.getByRole("option", { name: "Other" }).click();
    const url = dialog.getByPlaceholder(
      "rtsp://username:password@host:port/path",
    );
    const next = dialog.getByRole("button", { name: /^Continue$/i });

    await url.fill("http://192.168.1.100/stream");
    await next.click();
    await expect(
      dialog.getByText(/Custom URLs must begin with "rtsp:\/\/"/),
    ).toBeVisible();

    await url.fill("rtsp://192.168.1.100/stream");
    await next.click();
    await expect(url).toBeHidden();
  });
});
