/**
 * Shared setup-wizard e2e helpers.
 *
 * The wizard shows when config has no cameras, so a first run is mocked by
 * serving a camera-less config until the returned callback is fired. Firing
 * it is only needed by tests that care what the rest of the app sees; the
 * wizard itself tracks added cameras from the camera dialog's own callback.
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

export async function gotoDetectorStep(page: Page) {
  await page.getByRole("button", { name: "Get Started" }).click();

  // the account step sits between welcome and camera whenever auth is on,
  // which the default mock config has it
  await expect(
    page.getByRole("heading", { name: "Secure your account" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();

  await expect(page.getByText("Add Your First Camera")).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();

  await expect(page.getByText("Object Detection")).toBeVisible();
}
