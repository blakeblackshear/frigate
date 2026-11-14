/**
 * App shell error boundaries.
 *
 * Both failures are forced through the mock layer rather than through test
 * hooks in the app. A non-array payload reaches a component that treats it as
 * a list and throws on the first render; aborting a page's asset request
 * reproduces what an open tab sees after Frigate is updated underneath it.
 */

import { test, expect, type FrigateApp } from "../fixtures/frigate-test";
import { grantClipboardPermissions, readClipboard } from "../helpers/clipboard";

/** Exports builds its list with `rawExports.filter(...)`. */
async function breakExportsPage(app: FrigateApp) {
  await app.page.route("**/api/exports**", (route) =>
    route.fulfill({ json: { unexpected: true } }),
  );
  await app.goto("/export");
  await expect(app.page.getByTestId("error-panel")).toBeVisible({
    timeout: 10_000,
  });
}

/**
 * `useStats` runs `Object.entries(stats.detectors)` and only the status bar
 * and bottom bar call it, so null detectors throw in one chrome component.
 */
async function breakStatusbar(app: FrigateApp) {
  await app.installDefaults({ stats: { detectors: null } });
  await app.goto("/");
}

/** GeneralSettings and the status bar both read profiles, so both throw. */
async function breakAllDesktopChrome(app: FrigateApp) {
  await app.page.route("**/api/profiles**", (route) =>
    route.fulfill({
      json: { profiles: { broken: true }, active_profile: "default" },
    }),
  );
  await app.goto("/");
}

test.describe("Error boundaries - page failure @high", () => {
  // React mirrors the caught error to console.error, and the panel shows the
  // TypeError message on purpose.
  test.use({
    expectedErrors: [
      /is not a function|An error occurred in the|The above error occurred/,
    ],
  });

  test("a thrown page renders a recovery panel, not a blank screen", async ({
    frigateApp,
  }) => {
    await breakExportsPage(frigateApp);

    const panel = frigateApp.page.getByTestId("error-panel");
    await expect(panel.getByText("This page stopped working")).toBeVisible();
    await expect(panel.getByRole("button", { name: "Reload" })).toBeVisible();
    await expect(panel.getByTestId("error-panel-message")).toContainText(
      "is not a function",
    );

    // Contained to the route: the panel sits in the page container and the
    // chrome boundary never trips, so navigation stays usable.
    await expect(
      frigateApp.page.locator("#pageRoot [data-testid='error-panel']"),
    ).toBeVisible();
    await expect(frigateApp.page.getByTestId("error-strip")).toHaveCount(0);
    await expect(frigateApp.page.locator('a[href="/"]').first()).toBeVisible();
  });

  test("Copy details puts a triageable report on the clipboard", async ({
    frigateApp,
    context,
  }) => {
    await grantClipboardPermissions(context);
    await breakExportsPage(frigateApp);

    await frigateApp.page
      .getByTestId("error-panel")
      .getByRole("button", { name: "Copy details" })
      .click();

    await expect
      .poll(() => readClipboard(frigateApp.page), { timeout: 5_000 })
      .toContain("Frigate UI crash report");

    const report = await readClipboard(frigateApp.page);
    expect(report).toContain("Version: 0.15.0-test");
    expect(report).toMatch(/^Page: http/m);
    expect(report).toContain("is not a function");
  });

  test("navigating away drops the panel", async ({ frigateApp }) => {
    await breakExportsPage(frigateApp);

    await frigateApp.page.locator('a[href="/"]').first().click();
    await expect(frigateApp.page).toHaveURL(/\/$/);
    await expect(frigateApp.page.getByTestId("error-panel")).toHaveCount(0);
    await expect(
      frigateApp.page.locator("[data-camera='front_door']"),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("@mobile the panel leaves the bottom bar reachable", async ({
    frigateApp,
  }) => {
    test.skip(!frigateApp.isMobile, "Mobile-only assertion");
    await breakExportsPage(frigateApp);

    await expect(
      frigateApp.page
        .getByTestId("error-panel")
        .getByRole("button", { name: "Reload" }),
    ).toBeVisible();
    await expect(
      frigateApp.page.locator('a[href="/review"]').first(),
    ).toBeVisible();
  });
});

test.describe("Error boundaries - chrome failure @high", () => {
  test.use({
    expectedErrors: [
      /is not a function|An error occurred in the|The above error occurred/,
    ],
  });

  test("a thrown status bar leaves the sidebar usable", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "The status bar is desktop chrome");
    await breakStatusbar(frigateApp);

    const strip = frigateApp.page.getByTestId("error-strip");
    await expect(strip).toBeVisible({ timeout: 10_000 });
    await expect(strip).toHaveCount(1);
    await expect(strip.getByRole("button", { name: "Reload" })).toBeVisible();

    // Each chrome component owns a boundary, so the sidebar outlives the
    // status bar and the user can still navigate out.
    await expect(frigateApp.page.locator("aside")).toBeVisible();
    await expect(
      frigateApp.page.locator('a[href="/review"]').first(),
    ).toBeVisible();
    await expect(frigateApp.page.getByTestId("error-panel")).toHaveCount(0);
  });

  test("chrome failures never reach the page content", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "Desktop chrome");
    await breakAllDesktopChrome(frigateApp);

    await expect(
      frigateApp.page.getByTestId("error-strip").first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(frigateApp.page.getByTestId("error-panel")).toHaveCount(0);
    await expect(
      frigateApp.page.locator("[data-camera='front_door']"),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Error boundaries - clipboard refused @high", () => {
  test.use({
    expectedErrors: [
      /is not a function|An error occurred in the|The above error occurred/,
    ],
  });

  test("a refused clipboard write reports the failure", async ({
    frigateApp,
  }) => {
    // copy-to-clipboard treats a false return from execCommand as a failure
    // and falls back to a prompt, which Playwright dismisses on its own.
    await frigateApp.page.addInitScript(() => {
      document.execCommand = () => false;
    });
    await breakExportsPage(frigateApp);

    await frigateApp.page
      .getByTestId("error-panel")
      .getByRole("button", { name: "Copy details" })
      .click();

    await expect(
      frigateApp.page.getByText("Could not copy details to clipboard"),
    ).toBeVisible();
  });
});

test.describe("Error boundaries - stale assets @high", () => {
  test.use({
    expectedErrors: [
      /Failed to fetch dynamically imported module|Importing a module script failed|net::ERR_FAILED|An error occurred in the|The above error occurred/,
    ],
  });

  test("a missing page chunk asks for a reload", async ({ frigateApp }) => {
    await frigateApp.page.route(
      /\/assets\/Exports-[^/]+\.js(\?.*)?$/,
      (route) => route.abort("failed"),
    );
    await frigateApp.goto("/");
    await frigateApp.page.locator('a[href="/export"]').first().click();

    const panel = frigateApp.page.getByTestId("error-panel");
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel.getByText("Reload required")).toBeVisible();
    await expect(panel.getByRole("button", { name: "Reload" })).toBeVisible();
  });
});
