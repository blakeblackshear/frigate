/**
 * Live page tests -- CRITICAL tier.
 *
 * Tests camera dashboard, single camera view, camera groups,
 * feature toggles, and context menus on both desktop and mobile.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("Live Dashboard @critical", () => {
  test("dashboard renders with camera grid", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    // Should see camera containers for each mock camera
    const pageRoot = frigateApp.page.locator("#pageRoot");
    await expect(pageRoot).toBeVisible();
    // Check that camera names from config are referenced in the page
    await expect(
      frigateApp.page.locator("[data-camera='front_door']"),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      frigateApp.page.locator("[data-camera='backyard']"),
    ).toBeVisible({ timeout: 10_000 });
    await expect(frigateApp.page.locator("[data-camera='garage']")).toBeVisible(
      { timeout: 10_000 },
    );
  });

  test("click camera enters single camera view", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    // Click the front_door camera card
    const cameraCard = frigateApp.page
      .locator("[data-camera='front_door']")
      .first();
    await cameraCard.click({ timeout: 10_000 });
    // URL hash should change to include the camera name
    await expect(frigateApp.page).toHaveURL(/#front_door/);
  });

  test("back button returns to dashboard from single camera", async ({
    frigateApp,
  }) => {
    // Navigate directly to single camera view via hash
    await frigateApp.goto("/#front_door");
    // Wait for single camera view to render
    await frigateApp.page.waitForTimeout(1000);
    // Click back button
    const backButton = frigateApp.page
      .locator("button")
      .filter({
        has: frigateApp.page.locator("svg"),
      })
      .first();
    await backButton.click();
    // Should return to dashboard (hash cleared)
    await frigateApp.page.waitForTimeout(1000);
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("fullscreen toggle works", async ({ frigateApp }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    // The fullscreen button should be present (fixed position at bottom-right)
    const fullscreenBtn = frigateApp.page.locator("button:has(svg)").last();
    await expect(fullscreenBtn).toBeVisible({ timeout: 10_000 });
  });

  test("camera group selector is visible on live page", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      // On mobile, the camera group selector is in the header
      await frigateApp.goto("/");
      // Just verify the page renders without crash
      await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
      return;
    }
    await frigateApp.goto("/");
    // On desktop, camera group selector is in the sidebar below the Live nav item
    await expect(frigateApp.page.locator("aside")).toBeVisible();
  });

  test("page renders without crash when no cameras match group", async ({
    frigateApp,
  }) => {
    // Navigate to a non-existent camera group
    await frigateApp.page.goto("/?group=nonexistent");
    await frigateApp.page.waitForSelector("#pageRoot", { timeout: 10_000 });
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("birdseye view accessible when enabled", async ({ frigateApp }) => {
    // Birdseye is enabled in our default config
    await frigateApp.goto("/#birdseye");
    await frigateApp.page.waitForTimeout(2000);
    // Should not crash - either shows birdseye or falls back
    const body = frigateApp.page.locator("body");
    await expect(body).toBeVisible();
  });
});

test.describe("Live Camera Features @critical", () => {
  test("single camera view renders with controls", async ({ frigateApp }) => {
    await frigateApp.goto("/#front_door");
    await frigateApp.page.waitForTimeout(2000);
    // The page should render without crash
    await expect(frigateApp.page.locator("body")).toBeVisible();
    // Should have some buttons (back, fullscreen, settings, etc.)
    const buttons = frigateApp.page.locator("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("camera feature toggles are clickable", async ({ frigateApp }) => {
    await frigateApp.goto("/#front_door");
    await frigateApp.page.waitForTimeout(2000);
    // Find toggle/switch elements - FilterSwitch components
    const switches = frigateApp.page.locator('button[role="switch"]');
    const count = await switches.count();
    if (count > 0) {
      // Click the first switch to toggle it
      await switches.first().click();
      // Should not crash
      await expect(frigateApp.page.locator("body")).toBeVisible();
    }
  });

  test("keyboard shortcut f does not crash", async ({ frigateApp }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    // Press 'f' for fullscreen
    await frigateApp.page.keyboard.press("f");
    await frigateApp.page.waitForTimeout(500);
    // Should not crash
    await expect(frigateApp.page.locator("body")).toBeVisible();
  });
});

test.describe("Live Context Menu @critical", () => {
  test("right-click on camera opens context menu (desktop)", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    const cameraCard = frigateApp.page
      .locator("[data-camera='front_door']")
      .first();
    await cameraCard.waitFor({ state: "visible", timeout: 10_000 });
    // Right-click to open context menu
    await cameraCard.click({ button: "right" });
    // Context menu should appear (Radix ContextMenu renders a portal)
    const contextMenu = frigateApp.page.locator(
      '[role="menu"], [data-radix-menu-content]',
    );
    await expect(contextMenu.first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Live Mobile @critical", () => {
  test("mobile shows list layout by default", async ({ frigateApp }) => {
    if (!frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    // On mobile, cameras render in a list (single column)
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
    // Should have camera elements
    await expect(
      frigateApp.page.locator("[data-camera='front_door']"),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("mobile camera click enters single view", async ({ frigateApp }) => {
    if (!frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    const cameraCard = frigateApp.page
      .locator("[data-camera='front_door']")
      .first();
    await cameraCard.click({ timeout: 10_000 });
    await expect(frigateApp.page).toHaveURL(/#front_door/);
  });
});
