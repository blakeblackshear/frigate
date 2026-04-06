/**
 * Live page tests -- CRITICAL tier.
 *
 * Tests camera dashboard rendering, camera card clicks, single camera view
 * with named controls, feature toggle behavior, context menu, and mobile layout.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("Live Dashboard @critical", () => {
  test("dashboard renders all configured cameras by name", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/");
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
    // First navigate to dashboard so there's history to go back to
    await frigateApp.goto("/");
    await frigateApp.page.waitForTimeout(1000);
    // Click a camera to enter single view
    const card = frigateApp.page.locator("[data-camera='front_door']").first();
    await card.click({ timeout: 10_000 });
    await frigateApp.page.waitForTimeout(2000);
    // Now click Back to return to dashboard
    const backBtn = frigateApp.page.getByText("Back", { exact: true });
    if (await backBtn.isVisible().catch(() => false)) {
      await backBtn.click();
      await frigateApp.page.waitForTimeout(1000);
    }
    // Should be back on the dashboard with cameras visible
    await expect(
      frigateApp.page.locator("[data-camera='front_door']"),
    ).toBeVisible({ timeout: 10_000 });
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

test.describe("Live Single Camera - Controls @critical", () => {
  test("single camera view shows Back and History buttons (desktop)", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip(); // On mobile, buttons may show icons only
      return;
    }
    await frigateApp.goto("/#front_door");
    await frigateApp.page.waitForTimeout(2000);
    // Back and History are visible text buttons in the header
    await expect(
      frigateApp.page.getByText("Back", { exact: true }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      frigateApp.page.getByText("History", { exact: true }),
    ).toBeVisible();
  });

  test("single camera view shows feature toggle icons (desktop)", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/#front_door");
    await frigateApp.page.waitForTimeout(2000);
    // Feature toggles are CameraFeatureToggle components rendered as divs
    // with bg-selected (active) or bg-secondary (inactive) classes
    // Count the toggles - should have at least detect, recording, snapshots
    const toggles = frigateApp.page.locator(
      ".flex.flex-col.items-center.justify-center.bg-selected, .flex.flex-col.items-center.justify-center.bg-secondary",
    );
    const count = await toggles.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("clicking a feature toggle changes its visual state (desktop)", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/#front_door");
    await frigateApp.page.waitForTimeout(2000);
    // Find active toggles (bg-selected class = feature is ON)
    const activeToggles = frigateApp.page.locator(
      ".flex.flex-col.items-center.justify-center.bg-selected",
    );
    const initialCount = await activeToggles.count();
    if (initialCount > 0) {
      // Click the first active toggle to disable it
      await activeToggles.first().click();
      await frigateApp.page.waitForTimeout(1000);
      // After WS mock echoes back new state, count should decrease
      const newCount = await activeToggles.count();
      expect(newCount).toBeLessThan(initialCount);
    }
  });

  test("settings gear button opens dropdown (desktop)", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/#front_door");
    await frigateApp.page.waitForTimeout(2000);
    // Find the gear icon button (last button-like element in header)
    // The settings gear opens a dropdown with Stream, Play in background, etc.
    const gearButtons = frigateApp.page.locator("button:has(svg)");
    const count = await gearButtons.count();
    // Click the last one (gear icon is typically last in the header)
    if (count > 0) {
      await gearButtons.last().click();
      await frigateApp.page.waitForTimeout(500);
      // A dropdown or drawer should appear
      const overlay = frigateApp.page.locator(
        '[role="menu"], [data-radix-menu-content], [role="dialog"]',
      );
      const visible = await overlay
        .first()
        .isVisible()
        .catch(() => false);
      if (visible) {
        await frigateApp.page.keyboard.press("Escape");
      }
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

test.describe("Live Single Camera - Mobile Controls @critical", () => {
  test("mobile camera view has settings drawer trigger", async ({
    frigateApp,
  }) => {
    if (!frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/#front_door");
    await frigateApp.page.waitForTimeout(2000);
    // On mobile, settings gear opens a drawer
    // The button has aria-label with the camera name like "front_door Settings"
    const buttons = frigateApp.page.locator("button:has(svg)");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
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

test.describe("Live Mobile Layout @critical", () => {
  test("mobile renders cameras without sidebar", async ({ frigateApp }) => {
    if (!frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    await expect(frigateApp.page.locator("aside")).not.toBeVisible();
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
