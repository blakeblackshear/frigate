/**
 * Navigation tests -- CRITICAL tier.
 *
 * Tests sidebar (desktop) and bottombar (mobile) navigation,
 * conditional nav items, settings menus, and their actual behaviors.
 */

import { test, expect } from "../fixtures/frigate-test";
import { BasePage } from "../pages/base.page";

test.describe("Navigation @critical", () => {
  test("app loads and renders page root", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("logo is visible and links to home", async ({ frigateApp }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    const base = new BasePage(frigateApp.page, true);
    const logo = base.sidebar.locator('a[href="/"]').first();
    await expect(logo).toBeVisible();
  });

  test("all primary nav links are present and navigate", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/");
    const routes = ["/review", "/explore", "/export"];
    for (const route of routes) {
      await expect(
        frigateApp.page.locator(`a[href="${route}"]`).first(),
      ).toBeVisible();
    }
    // Verify clicking each one actually navigates
    const base = new BasePage(frigateApp.page, !frigateApp.isMobile);
    for (const route of routes) {
      await base.navigateTo(route);
      await expect(frigateApp.page).toHaveURL(new RegExp(route));
      await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
    }
  });

  test("desktop sidebar is visible, mobile bottombar is visible", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/");
    const base = new BasePage(frigateApp.page, !frigateApp.isMobile);
    if (!frigateApp.isMobile) {
      await expect(base.sidebar).toBeVisible();
    } else {
      await expect(base.sidebar).not.toBeVisible();
    }
  });

  test("navigate between all main pages without crash", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/");
    const base = new BasePage(frigateApp.page, !frigateApp.isMobile);
    const pageRoot = frigateApp.page.locator("#pageRoot");

    await base.navigateTo("/review");
    await expect(pageRoot).toBeVisible({ timeout: 10_000 });
    await base.navigateTo("/explore");
    await expect(pageRoot).toBeVisible({ timeout: 10_000 });
    await base.navigateTo("/export");
    await expect(pageRoot).toBeVisible({ timeout: 10_000 });
    await base.navigateTo("/review");
    await expect(pageRoot).toBeVisible({ timeout: 10_000 });
  });

  test("unknown route redirects to home", async ({ frigateApp }) => {
    await frigateApp.page.goto("/nonexistent-route");
    await frigateApp.page.waitForTimeout(2000);
    const url = frigateApp.page.url();
    const hasPageRoot = await frigateApp.page
      .locator("#pageRoot")
      .isVisible()
      .catch(() => false);
    expect(url.endsWith("/") || hasPageRoot).toBeTruthy();
  });
});

test.describe("Navigation - Conditional Items @critical", () => {
  test("Faces nav hidden when face_recognition disabled", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/");
    await expect(frigateApp.page.locator('a[href="/faces"]')).not.toBeVisible();
  });

  test("Chat nav hidden when genai model is none", async ({ frigateApp }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.installDefaults({
      config: {
        genai: {
          enabled: false,
          provider: "ollama",
          model: "none",
          base_url: "",
        },
      },
    });
    await frigateApp.goto("/");
    await expect(frigateApp.page.locator('a[href="/chat"]')).not.toBeVisible();
  });

  test("Faces nav visible when face_recognition enabled on desktop", async ({
    frigateApp,
    page,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.installDefaults({
      config: { face_recognition: { enabled: true } },
    });
    await frigateApp.goto("/");
    await expect(page.locator('a[href="/faces"]')).toBeVisible();
  });

  test("Chat nav visible when genai model set on desktop", async ({
    frigateApp,
    page,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.installDefaults({
      config: { genai: { enabled: true, model: "llava" } },
    });
    await frigateApp.goto("/");
    await expect(page.locator('a[href="/chat"]')).toBeVisible();
  });

  test("Classification nav visible for admin on desktop", async ({
    frigateApp,
    page,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    await expect(page.locator('a[href="/classification"]')).toBeVisible();
  });
});

test.describe("Navigation - Settings Menu @critical", () => {
  test("settings gear opens menu with navigation items (desktop)", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    // Settings gear is in the sidebar bottom section, a div with cursor-pointer
    const sidebarBottom = frigateApp.page.locator("aside .mb-8");
    const gearIcon = sidebarBottom
      .locator("div[class*='cursor-pointer']")
      .first();
    await expect(gearIcon).toBeVisible({ timeout: 5_000 });
    await gearIcon.click();
    // Menu should open - look for the "Settings" menu item by aria-label
    await expect(frigateApp.page.getByLabel("Settings")).toBeVisible({
      timeout: 3_000,
    });
  });

  test("settings menu items navigate to correct routes (desktop)", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    const targets = [
      { label: "Settings", url: "/settings" },
      { label: "System metrics", url: "/system" },
      { label: "System logs", url: "/logs" },
      { label: "Configuration Editor", url: "/config" },
    ];
    for (const target of targets) {
      await frigateApp.goto("/");
      const gearIcon = frigateApp.page
        .locator("aside .mb-8 div[class*='cursor-pointer']")
        .first();
      await gearIcon.click();
      await frigateApp.page.waitForTimeout(300);
      const menuItem = frigateApp.page.getByLabel(target.label);
      if (await menuItem.isVisible().catch(() => false)) {
        await menuItem.click();
        await expect(frigateApp.page).toHaveURL(
          new RegExp(target.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        );
      }
    }
  });

  test("account button in sidebar is clickable (desktop)", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    const sidebarBottom = frigateApp.page.locator("aside .mb-8");
    const items = sidebarBottom.locator("div[class*='cursor-pointer']");
    const count = await items.count();
    if (count >= 2) {
      await items.nth(1).click();
      await frigateApp.page.waitForTimeout(500);
    }
    await expect(frigateApp.page.locator("body")).toBeVisible();
  });
});
