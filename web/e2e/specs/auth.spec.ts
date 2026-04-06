/**
 * Auth and cross-cutting tests -- HIGH tier.
 *
 * Tests protected route access for admin/viewer roles,
 * access denied page rendering, viewer nav restrictions,
 * and all routes smoke test.
 */

import { test, expect } from "../fixtures/frigate-test";
import { viewerProfile } from "../fixtures/mock-data/profile";

test.describe("Auth - Admin Access @high", () => {
  test("admin can access /system and sees system tabs", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/system");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
    await frigateApp.page.waitForTimeout(3000);
    // System page should have named tab buttons
    await expect(frigateApp.page.getByLabel("Select general")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("admin can access /config and Monaco editor loads", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/config");
    await frigateApp.page.waitForTimeout(5000);
    const editor = frigateApp.page.locator(
      ".monaco-editor, [data-keybinding-context]",
    );
    await expect(editor.first()).toBeVisible({ timeout: 10_000 });
  });

  test("admin can access /logs and sees service tabs", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/logs");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
    await expect(frigateApp.page.getByLabel("Select frigate")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("admin sees Classification nav on desktop", async ({ frigateApp }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");
    await expect(
      frigateApp.page.locator('a[href="/classification"]'),
    ).toBeVisible();
  });
});

test.describe("Auth - Viewer Restrictions @high", () => {
  test("viewer sees Access Denied on /system", async ({ frigateApp, page }) => {
    await frigateApp.installDefaults({ profile: viewerProfile() });
    await page.goto("/system");
    await page.waitForTimeout(2000);
    // Should show "Access Denied" text
    await expect(page.getByText("Access Denied")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("viewer sees Access Denied on /config", async ({ frigateApp, page }) => {
    await frigateApp.installDefaults({ profile: viewerProfile() });
    await page.goto("/config");
    await page.waitForTimeout(2000);
    await expect(page.getByText("Access Denied")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("viewer sees Access Denied on /logs", async ({ frigateApp, page }) => {
    await frigateApp.installDefaults({ profile: viewerProfile() });
    await page.goto("/logs");
    await page.waitForTimeout(2000);
    await expect(page.getByText("Access Denied")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("viewer can access Live page and sees cameras", async ({
    frigateApp,
    page,
  }) => {
    await frigateApp.installDefaults({ profile: viewerProfile() });
    await page.goto("/");
    await page.waitForSelector("#pageRoot", { timeout: 10_000 });
    await expect(page.locator("[data-camera='front_door']")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("viewer can access Review page and sees severity tabs", async ({
    frigateApp,
    page,
  }) => {
    await frigateApp.installDefaults({ profile: viewerProfile() });
    await page.goto("/review");
    await page.waitForSelector("#pageRoot", { timeout: 10_000 });
    await expect(page.getByLabel("Alerts")).toBeVisible({ timeout: 5_000 });
  });

  test("viewer can access all main user routes without crash", async ({
    frigateApp,
    page,
  }) => {
    await frigateApp.installDefaults({ profile: viewerProfile() });
    const routes = ["/", "/review", "/explore", "/export", "/settings"];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForSelector("#pageRoot", { timeout: 10_000 });
    }
  });
});

test.describe("Auth - All Routes Smoke @high", () => {
  test("all user routes render without crash", async ({ frigateApp }) => {
    const routes = ["/", "/review", "/explore", "/export", "/settings"];
    for (const route of routes) {
      await frigateApp.goto(route);
      await expect(frigateApp.page.locator("#pageRoot")).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test("admin routes render with specific content", async ({ frigateApp }) => {
    // System page should have tab controls
    await frigateApp.goto("/system");
    await frigateApp.page.waitForTimeout(3000);
    await expect(frigateApp.page.getByLabel("Select general")).toBeVisible({
      timeout: 5_000,
    });

    // Logs page should have service tabs
    await frigateApp.goto("/logs");
    await expect(frigateApp.page.getByLabel("Select frigate")).toBeVisible({
      timeout: 5_000,
    });
  });
});
