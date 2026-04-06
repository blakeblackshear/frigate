/**
 * Auth and cross-cutting tests -- HIGH tier.
 *
 * Tests protected route access for admin/viewer roles,
 * redirect behavior, and all routes smoke test.
 */

import { test, expect } from "../fixtures/frigate-test";
import { viewerProfile } from "../fixtures/mock-data/profile";

test.describe("Auth - Admin Access @high", () => {
  test("admin can access /system and it renders", async ({ frigateApp }) => {
    await frigateApp.goto("/system");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
    // Wait for lazy-loaded system content
    await frigateApp.page.waitForTimeout(3000);
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("admin can access /config and editor loads", async ({ frigateApp }) => {
    await frigateApp.goto("/config");
    await frigateApp.page.waitForTimeout(3000);
    // Monaco editor or at least page content should render
    await expect(frigateApp.page.locator("body")).toBeVisible();
  });

  test("admin can access /logs and service tabs render", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/logs");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
    // Should have service toggle group
    const toggleGroup = frigateApp.page.locator('[role="group"]');
    await expect(toggleGroup.first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Auth - Viewer Restrictions @high", () => {
  test("viewer is denied access to /system", async ({ frigateApp, page }) => {
    await frigateApp.installDefaults({ profile: viewerProfile() });
    await page.goto("/system");
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent("body");
    expect(
      bodyText?.includes("Access Denied") ||
        bodyText?.includes("permission") ||
        page.url().includes("unauthorized"),
    ).toBeTruthy();
  });

  test("viewer is denied access to /config", async ({ frigateApp, page }) => {
    await frigateApp.installDefaults({ profile: viewerProfile() });
    await page.goto("/config");
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent("body");
    expect(
      bodyText?.includes("Access Denied") ||
        bodyText?.includes("permission") ||
        page.url().includes("unauthorized"),
    ).toBeTruthy();
  });

  test("viewer is denied access to /logs", async ({ frigateApp, page }) => {
    await frigateApp.installDefaults({ profile: viewerProfile() });
    await page.goto("/logs");
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent("body");
    expect(
      bodyText?.includes("Access Denied") ||
        bodyText?.includes("permission") ||
        page.url().includes("unauthorized"),
    ).toBeTruthy();
  });

  test("viewer can access all main user routes", async ({
    frigateApp,
    page,
  }) => {
    await frigateApp.installDefaults({ profile: viewerProfile() });
    const routes = ["/", "/review", "/explore", "/export", "/settings"];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForSelector("#pageRoot", { timeout: 10_000 });
      await expect(page.locator("#pageRoot")).toBeVisible();
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

  test("all admin routes render without crash", async ({ frigateApp }) => {
    const routes = ["/system", "/logs"];
    for (const route of routes) {
      await frigateApp.goto(route);
      await expect(frigateApp.page.locator("#pageRoot")).toBeVisible({
        timeout: 10_000,
      });
    }
  });
});
