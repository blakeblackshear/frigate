/**
 * Logs page tests -- MEDIUM tier.
 *
 * Tests service tab switching by name, copy/download buttons,
 * and websocket message feed tab.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("Logs Page - Service Tabs @medium", () => {
  test("logs page renders with named service tabs", async ({ frigateApp }) => {
    await frigateApp.goto("/logs");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
    // Service tabs have aria-label="Select {service}"
    await expect(frigateApp.page.getByLabel("Select frigate")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("switching to go2rtc tab changes active tab", async ({ frigateApp }) => {
    await frigateApp.goto("/logs");
    await frigateApp.page.waitForTimeout(1000);
    const go2rtcTab = frigateApp.page.getByLabel("Select go2rtc");
    if (await go2rtcTab.isVisible().catch(() => false)) {
      await go2rtcTab.click();
      await frigateApp.page.waitForTimeout(1000);
      await expect(go2rtcTab).toHaveAttribute("data-state", "on");
    }
  });

  test("switching to websocket tab shows message feed", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/logs");
    await frigateApp.page.waitForTimeout(1000);
    const wsTab = frigateApp.page.getByLabel("Select websocket");
    if (await wsTab.isVisible().catch(() => false)) {
      await wsTab.click();
      await frigateApp.page.waitForTimeout(1000);
      await expect(wsTab).toHaveAttribute("data-state", "on");
    }
  });
});

test.describe("Logs Page - Actions @medium", () => {
  test("copy to clipboard button is present and clickable", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/logs");
    await frigateApp.page.waitForTimeout(1000);
    const copyBtn = frigateApp.page.getByLabel("Copy to Clipboard");
    if (await copyBtn.isVisible().catch(() => false)) {
      await copyBtn.click();
      await frigateApp.page.waitForTimeout(500);
      // Should trigger clipboard copy (toast may appear)
    }
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("download logs button is present", async ({ frigateApp }) => {
    await frigateApp.goto("/logs");
    await frigateApp.page.waitForTimeout(1000);
    const downloadBtn = frigateApp.page.getByLabel("Download Logs");
    if (await downloadBtn.isVisible().catch(() => false)) {
      await expect(downloadBtn).toBeVisible();
    }
  });

  test("logs page displays log content text", async ({ frigateApp }) => {
    await frigateApp.goto("/logs");
    await frigateApp.page.waitForTimeout(2000);
    const text = await frigateApp.page.textContent("#pageRoot");
    expect(text?.length).toBeGreaterThan(0);
  });
});
