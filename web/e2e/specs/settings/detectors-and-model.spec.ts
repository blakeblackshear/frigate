/**
 * Detectors & Model settings page tests -- HIGH tier.
 *
 * Tests rendering of the merged page and navigation from the Frigate+ page.
 */

import { test, expect } from "../../fixtures/frigate-test";

test.describe("Detectors & Model Settings @high", () => {
  test("page renders with detector and model cards", async ({ frigateApp }) => {
    await frigateApp.goto("/settings?page=systemDetectorsAndModel");
    await frigateApp.page.waitForTimeout(2000);
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();

    const text = await frigateApp.page.textContent("#pageRoot");
    expect(text).toContain("Detectors & Model");
    expect(text?.toLowerCase()).toContain("detector hardware");
    expect(text?.toLowerCase()).toContain("detection model");
  });

  test("Frigate+ page links to the merged page", async ({ frigateApp }) => {
    await frigateApp.goto("/settings?page=frigateplus");
    await frigateApp.page.waitForTimeout(2000);

    const button = frigateApp.page.getByRole("button", {
      name: /Change in Detectors & Model/,
    });

    // Button only appears when Frigate+ is enabled in the test config; skip
    // the click assertion if it's not present.
    if ((await button.count()) > 0) {
      await button.first().click();
      await frigateApp.page.waitForURL(/page=systemDetectorsAndModel/);
      await expect(frigateApp.page.locator("#pageRoot")).toContainText(
        "Detectors & Model",
      );
    } else {
      test.skip(
        true,
        "Frigate+ not enabled in this test config; skipping link assertion",
      );
    }
  });

  test("old systemDetectionModel deep-link no longer routes here", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/settings?page=systemDetectionModel");
    await frigateApp.page.waitForTimeout(2000);
    // The old page key is no longer in allSettingsViews; the router
    // falls back to its default settings page (uiSettings).
    const text = await frigateApp.page.textContent("#pageRoot");
    expect(text).not.toContain("Detection model");
  });
});
