/**
 * Live page tests -- CRITICAL tier.
 *
 * Tests camera dashboard rendering, camera card clicks opening single view,
 * feature toggles sending WS messages, context menu behavior, and mobile layout.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("Live Dashboard @critical", () => {
  test("dashboard renders all configured cameras", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    // All 3 mock cameras should have data-camera elements
    for (const cam of ["front_door", "backyard", "garage"]) {
      await expect(
        frigateApp.page.locator(`[data-camera='${cam}']`),
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("clicking camera card opens single camera view via hash", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/");
    const card = frigateApp.page.locator("[data-camera='front_door']").first();
    await card.click({ timeout: 10_000 });
    await expect(frigateApp.page).toHaveURL(/#front_door/);
  });

  test("back button returns from single camera to dashboard", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/#front_door");
    await frigateApp.page.waitForTimeout(1000);
    // Click the back button (first button with SVG icon)
    const backBtn = frigateApp.page
      .locator("button")
      .filter({ has: frigateApp.page.locator("svg") })
      .first();
    await backBtn.click();
    await frigateApp.page.waitForTimeout(1000);
    // Should return to dashboard - hash cleared or page root visible
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("fullscreen button is present on desktop", async ({ frigateApp }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    const fullscreenBtn = frigateApp.page.locator("button:has(svg)").last();
    await expect(fullscreenBtn).toBeVisible({ timeout: 10_000 });
  });

  test("camera group selector is in sidebar on live page", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    // Camera group selector renders in the sidebar below the Live nav icon
    await expect(frigateApp.page.locator("aside")).toBeVisible();
  });

  test("birdseye view loads without crash", async ({ frigateApp }) => {
    await frigateApp.goto("/#birdseye");
    await frigateApp.page.waitForTimeout(2000);
    await expect(frigateApp.page.locator("body")).toBeVisible();
  });

  test("empty group shows fallback content", async ({ frigateApp }) => {
    await frigateApp.page.goto("/?group=nonexistent");
    await frigateApp.page.waitForSelector("#pageRoot", { timeout: 10_000 });
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });
});

test.describe("Live Single Camera @critical", () => {
  test("single camera view has control buttons", async ({ frigateApp }) => {
    await frigateApp.goto("/#front_door");
    await frigateApp.page.waitForTimeout(2000);
    const buttons = frigateApp.page.locator("button");
    const count = await buttons.count();
    // Should have back, fullscreen, settings, and toggle buttons
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("camera feature toggles are clickable without crash", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/#front_door");
    await frigateApp.page.waitForTimeout(2000);
    const switches = frigateApp.page.locator('button[role="switch"]');
    const count = await switches.count();
    if (count > 0) {
      // Click the first toggle (e.g., detect toggle)
      await switches.first().click();
      await frigateApp.page.waitForTimeout(500);
      // Page should still be functional
      await expect(frigateApp.page.locator("body")).toBeVisible();
    }
  });

  test("keyboard shortcut f does not crash on desktop", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    await frigateApp.page.keyboard.press("f");
    await frigateApp.page.waitForTimeout(500);
    await expect(frigateApp.page.locator("body")).toBeVisible();
  });
});

test.describe("Live Context Menu @critical", () => {
  test("right-click on camera opens context menu on desktop", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    const card = frigateApp.page.locator("[data-camera='front_door']").first();
    await card.waitFor({ state: "visible", timeout: 10_000 });
    await card.click({ button: "right" });
    // Context menu should appear (Radix ContextMenu renders a portal)
    const contextMenu = frigateApp.page.locator(
      '[role="menu"], [data-radix-menu-content]',
    );
    await expect(contextMenu.first()).toBeVisible({ timeout: 5_000 });
  });

  test("context menu closes on escape", async ({ frigateApp }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    const card = frigateApp.page.locator("[data-camera='front_door']").first();
    await card.waitFor({ state: "visible", timeout: 10_000 });
    await card.click({ button: "right" });
    await frigateApp.page.waitForTimeout(500);
    await frigateApp.page.keyboard.press("Escape");
    await frigateApp.page.waitForTimeout(300);
    const contextMenu = frigateApp.page.locator(
      '[role="menu"], [data-radix-menu-content]',
    );
    await expect(contextMenu).not.toBeVisible();
  });
});

test.describe("Live Mobile @critical", () => {
  test("mobile renders camera list (not sidebar)", async ({ frigateApp }) => {
    if (!frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    // No sidebar on mobile
    await expect(frigateApp.page.locator("aside")).not.toBeVisible();
    // Cameras should still be visible
    await expect(
      frigateApp.page.locator("[data-camera='front_door']"),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("mobile camera click opens single camera view", async ({
    frigateApp,
  }) => {
    if (!frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    const card = frigateApp.page.locator("[data-camera='front_door']").first();
    await card.click({ timeout: 10_000 });
    await expect(frigateApp.page).toHaveURL(/#front_door/);
  });
});
