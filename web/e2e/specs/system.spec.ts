/**
 * System page tests -- MEDIUM tier.
 *
 * Tests system page rendering with tabs and tab switching.
 * Navigates to /system#general explicitly so useHashState resolves
 * the tab state deterministically.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("System Page @medium", () => {
  test("system page renders with tab buttons", async ({ frigateApp }) => {
    await frigateApp.goto("/system#general");
    await expect(frigateApp.page.getByLabel("Select general")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 15_000 },
    );
    await expect(frigateApp.page.getByLabel("Select storage")).toBeVisible();
    await expect(frigateApp.page.getByLabel("Select cameras")).toBeVisible();
  });

  test("general tab is active when navigated via hash", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/system#general");
    await expect(frigateApp.page.getByLabel("Select general")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 15_000 },
    );
  });

  test("clicking Storage tab activates it and deactivates General", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/system#general");
    await expect(frigateApp.page.getByLabel("Select general")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 15_000 },
    );

    await frigateApp.page.getByLabel("Select storage").click();
    await expect(frigateApp.page.getByLabel("Select storage")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 5_000 },
    );
    await expect(frigateApp.page.getByLabel("Select general")).toHaveAttribute(
      "data-state",
      "off",
    );
  });

  test("clicking Cameras tab activates it and deactivates General", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/system#general");
    await expect(frigateApp.page.getByLabel("Select general")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 15_000 },
    );

    await frigateApp.page.getByLabel("Select cameras").click();
    await expect(frigateApp.page.getByLabel("Select cameras")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 5_000 },
    );
    await expect(frigateApp.page.getByLabel("Select general")).toHaveAttribute(
      "data-state",
      "off",
    );
  });

  test("system page shows version and last refreshed", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/system#general");
    await expect(frigateApp.page.getByLabel("Select general")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 15_000 },
    );
    await expect(frigateApp.page.getByText("0.15.0-test")).toBeVisible();
    await expect(frigateApp.page.getByText(/Last refreshed/)).toBeVisible();
  });
});
