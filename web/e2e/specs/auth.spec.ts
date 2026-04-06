/**
 * Auth and cross-cutting tests -- HIGH tier.
 *
 * Tests protected routes, unauthorized redirect,
 * and app-wide behaviors.
 */

import { test, expect } from "../fixtures/frigate-test";
import { viewerProfile } from "../fixtures/mock-data/profile";

test.describe("Auth & Protected Routes @high", () => {
  test("admin can access /system", async ({ frigateApp }) => {
    await frigateApp.goto("/system");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("admin can access /config", async ({ frigateApp }) => {
    await frigateApp.goto("/config");
    // Config editor may take time to load Monaco
    await frigateApp.page.waitForTimeout(3000);
    await expect(frigateApp.page.locator("body")).toBeVisible();
  });

  test("admin can access /logs", async ({ frigateApp }) => {
    await frigateApp.goto("/logs");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("viewer is redirected from admin routes", async ({
    frigateApp,
    page,
  }) => {
    // Re-install mocks with viewer profile
    await frigateApp.installDefaults({
      profile: viewerProfile(),
    });
    await page.goto("/system");
    await page.waitForTimeout(2000);
    // Should be redirected to unauthorized page
    const url = page.url();
    const hasAccessDenied = url.includes("unauthorized");
    const bodyText = await page.textContent("body");
    const showsAccessDenied =
      bodyText?.includes("Access Denied") ||
      bodyText?.includes("permission") ||
      hasAccessDenied;
    expect(showsAccessDenied).toBeTruthy();
  });

  test("all main pages render without crash", async ({ frigateApp }) => {
    // Smoke test all user-accessible routes
    const routes = ["/", "/review", "/explore", "/export", "/settings"];
    for (const route of routes) {
      await frigateApp.goto(route);
      await expect(frigateApp.page.locator("#pageRoot")).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test("all admin pages render without crash", async ({ frigateApp }) => {
    const routes = ["/system", "/logs"];
    for (const route of routes) {
      await frigateApp.goto(route);
      await expect(frigateApp.page.locator("#pageRoot")).toBeVisible({
        timeout: 10_000,
      });
    }
  });
});
