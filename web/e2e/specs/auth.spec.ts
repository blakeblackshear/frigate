/**
 * Auth and role tests -- HIGH tier.
 *
 * Admin access to /system, /config, /logs; viewer access denied
 * markers (via i18n heading, not a data-testid we don't own);
 * viewer nav restrictions; all-routes smoke.
 */

import { test, expect, type FrigateApp } from "../fixtures/frigate-test";
import { systemTab } from "../helpers/system-tabs";
import { adminProfile, viewerProfile } from "../fixtures/mock-data/profile";

test.describe("Auth — admin access @high", () => {
  test("admin /system renders general tab", async ({ frigateApp }) => {
    await frigateApp.goto("/system");
    await expect(systemTab(frigateApp, "general")).toBeVisible({
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
    await expect(systemTab(frigateApp, "frigate")).toBeVisible({
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

test.describe("Auth: login redirect @high", () => {
  // 401 on /profile is how the app learns that a login is required
  test.use({ expectedErrors: [/401/] });

  async function requireLogin(frigateApp: FrigateApp) {
    let loggedIn = false;
    await frigateApp.page.route("**/api/profile", (route) =>
      loggedIn
        ? route.fulfill({ json: adminProfile() })
        : route.fulfill({ status: 401, body: "" }),
    );
    await frigateApp.page.route("**/api/login", (route) => {
      loggedIn = true;
      return route.fulfill({ json: {} });
    });
    await frigateApp.page.route("**/api/auth/first_time_login", (route) =>
      route.fulfill({ json: { admin_first_time_login: false } }),
    );
  }

  async function logIn(frigateApp: FrigateApp) {
    await frigateApp.page.getByLabel("Username").fill("admin");
    await frigateApp.page.getByLabel("Password").fill("password");
    await frigateApp.page.getByRole("button", { name: "Login" }).click();
  }

  test("returns to the requested url after logging in", async ({
    frigateApp,
  }) => {
    await requireLogin(frigateApp);
    await frigateApp.page.goto("/explore?labels=person");
    await expect(frigateApp.page).toHaveURL(
      `/login?redirect=${encodeURIComponent("/explore?labels=person")}`,
    );

    await logIn(frigateApp);
    await expect(frigateApp.page).toHaveURL("/explore?labels=person");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("goes home after logging in from the home page", async ({
    frigateApp,
  }) => {
    await requireLogin(frigateApp);
    await frigateApp.page.goto("/");
    await expect(frigateApp.page).toHaveURL("/login");

    await logIn(frigateApp);
    await expect(frigateApp.page).toHaveURL("/");
  });

  for (const target of ["https://example.com/", "//example.com/"]) {
    test(`ignores a redirect to another site (${target})`, async ({
      frigateApp,
    }) => {
      await requireLogin(frigateApp);
      await frigateApp.page.goto(
        `/login?redirect=${encodeURIComponent(target)}`,
      );

      await logIn(frigateApp);
      await expect(frigateApp.page).toHaveURL("/");
    });
  }
});
