/**
 * Auth and role tests -- HIGH tier.
 *
 * Admin access to /system, /config, /logs; viewer access denied
 * markers (via i18n heading, not a data-testid we don't own);
 * viewer nav restrictions; all-routes smoke.
 */

import { test, expect } from "../fixtures/frigate-test";
import { viewerProfile } from "../fixtures/mock-data/profile";

test.describe("Auth — admin access @high", () => {
  test("admin /system renders general tab", async ({ frigateApp }) => {
    await frigateApp.goto("/system");
    await expect(frigateApp.page.getByLabel("Select general")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("admin /config renders Monaco editor", async ({ frigateApp }) => {
    await frigateApp.goto("/config");
    await expect(
      frigateApp.page
        .locator(".monaco-editor, [data-keybinding-context]")
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("admin /logs renders frigate tab", async ({ frigateApp }) => {
    await frigateApp.goto("/logs");
    await expect(frigateApp.page.getByLabel("Select frigate")).toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe("Auth — viewer restrictions @high", () => {
  for (const path of ["/system", "/config", "/logs"]) {
    test(`viewer on ${path} sees AccessDenied`, async ({ frigateApp }) => {
      await frigateApp.installDefaults({ profile: viewerProfile() });
      await frigateApp.page.goto(path);
      await frigateApp.page.waitForSelector("#pageRoot", { timeout: 10_000 });
      await expect(
        frigateApp.page.getByRole("heading", {
          level: 2,
          name: /access denied/i,
        }),
      ).toBeVisible({ timeout: 10_000 });
    });
  }

  test("viewer sees cameras on /", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ profile: viewerProfile() });
    await frigateApp.page.goto("/");
    await expect(
      frigateApp.page.locator("[data-camera='front_door']"),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("viewer sees severity tabs on /review", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ profile: viewerProfile() });
    await frigateApp.page.goto("/review");
    await expect(frigateApp.page.getByLabel("Alerts")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("viewer can access all non-admin routes without AccessDenied", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ profile: viewerProfile() });
    const routes = ["/", "/review", "/explore", "/export", "/settings"];
    for (const route of routes) {
      await frigateApp.page.goto(route);
      await frigateApp.page.waitForSelector("#pageRoot", { timeout: 10_000 });
      await expect(
        frigateApp.page.getByRole("heading", {
          level: 2,
          name: /access denied/i,
        }),
      ).toHaveCount(0);
    }
  });
});

test.describe("Auth — viewer nav restrictions (desktop) @high", () => {
  test.skip(({ frigateApp }) => frigateApp.isMobile, "Sidebar only on desktop");

  test("viewer sidebar hides admin routes", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ profile: viewerProfile() });
    await frigateApp.page.goto("/");
    await frigateApp.page.waitForSelector("#pageRoot", { timeout: 10_000 });
    for (const href of ["/system", "/config", "/logs"]) {
      await expect(
        frigateApp.page.locator(`aside a[href='${href}']`),
      ).toHaveCount(0);
    }
  });
});

test.describe("Auth — all routes smoke @high @mobile", () => {
  test("every common route renders #pageRoot", async ({ frigateApp }) => {
    for (const route of ["/", "/review", "/explore", "/export", "/settings"]) {
      await frigateApp.goto(route);
      await expect(frigateApp.page.locator("#pageRoot")).toBeVisible({
        timeout: 10_000,
      });
    }
  });
});
