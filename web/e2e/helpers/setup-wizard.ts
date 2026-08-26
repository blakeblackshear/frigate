/**
 * Shared setup-wizard e2e helpers.
 *
 * The wizard shows when config has no cameras, so a first run is mocked by
 * serving a camera-less config until the returned callback is fired.
 */

import type { Page } from "@playwright/test";
import { expect } from "../fixtures/frigate-test";
import { configFactory } from "../fixtures/mock-data/config";
import type { ApiMockOverrides } from "./api-mocker";

export async function installFirstRun(
  frigateApp: { installDefaults: (o?: ApiMockOverrides) => Promise<void> },
  page: Page,
  overrides?: ApiMockOverrides,
): Promise<() => void> {
  await frigateApp.installDefaults(overrides);

  const full = configFactory(overrides?.config);
  let cameras: unknown = {};

  await page.route("**/api/config", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: { ...full, cameras } });
    }
    return route.fulfill({ json: { success: true } });
  });

  return () => {
    cameras = full.cameras;
  };
}

export async function gotoDetectorStep(page: Page, addCamera: () => void) {
  await page.getByRole("button", { name: "Get Started" }).click();
  await expect(page.getByText("Add Your First Camera")).toBeVisible();

  // the camera step's Next only renders once its local addedCameras fills,
  // which SetupCamera does by refetching config when the dialog closes, so
  // opening and cancelling the dialog is what reveals Next
  await page.getByRole("button", { name: "Add Camera" }).click();
  addCamera();
  await page.getByRole("button", { name: "Cancel" }).click();

  await expect(page.getByRole("button", { name: "Next" })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Object Detection")).toBeVisible();
}
