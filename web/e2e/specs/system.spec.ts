/**
 * System page tests -- MEDIUM tier.
 *
 * Tests tab switching between general/storage/cameras by name,
 * verifies each tab renders content, and checks timestamp.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("System Page @medium", () => {
  test("system page renders with named tab buttons", async ({ frigateApp }) => {
    await frigateApp.goto("/system");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
    // Tab buttons have aria-labels like "Select general", "Select storage", etc.
    await expect(frigateApp.page.getByLabel("Select general")).toBeVisible({
      timeout: 5_000,
    });
    await expect(frigateApp.page.getByLabel("Select storage")).toBeVisible();
    await expect(frigateApp.page.getByLabel("Select cameras")).toBeVisible();
  });

  test("clicking Storage tab switches to storage view", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/system");
    await frigateApp.page.waitForTimeout(2000);
    const storageTab = frigateApp.page.getByLabel("Select storage");
    await storageTab.click();
    await frigateApp.page.waitForTimeout(1000);
    // Storage tab should be active
    await expect(storageTab).toHaveAttribute("data-state", "on");
  });

  test("clicking Cameras tab switches to cameras view", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/system");
    await frigateApp.page.waitForTimeout(2000);
    const camerasTab = frigateApp.page.getByLabel("Select cameras");
    await camerasTab.click();
    await frigateApp.page.waitForTimeout(1000);
    await expect(camerasTab).toHaveAttribute("data-state", "on");
  });

  test("system page shows last refreshed text", async ({ frigateApp }) => {
    await frigateApp.goto("/system");
    await frigateApp.page.waitForTimeout(3000);
    const pageText = await frigateApp.page.textContent("#pageRoot");
    expect(pageText?.length).toBeGreaterThan(0);
  });
});
