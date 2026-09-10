/**
 * Birdseye tracking mode settings tests -- MEDIUM tier.
 *
 * `mode` accepts either a single mode or a list of modes, which pydantic emits
 * as an `anyOf` schema. The form flattens that to the list branch and renders a
 * switch per mode, so these cover the two shapes a stored config can have:
 * a bare string from an existing config, and a list.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "../../fixtures/frigate-test";
import type { Page } from "@playwright/test";
import { configFactory } from "../../fixtures/mock-data/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_SCHEMA = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../fixtures/mock-data/config-schema.json"),
    "utf-8",
  ),
);

const SETTINGS_URL = "/settings?page=systemBirdseye";
const UNSAVED = "You have unsaved changes";

async function installRoutes(page: Page, mode: unknown) {
  const config = configFactory({ birdseye: { mode } } as never);
  let lastSavedConfig: unknown = null;

  await page.route("**/api/config/schema.json", (route) =>
    route.fulfill({ json: CONFIG_SCHEMA }),
  );
  await page.route("**/api/config", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: config });
    }
    return route.fulfill({ json: { success: true } });
  });
  await page.route("**/api/config/set", async (route) => {
    lastSavedConfig = route.request().postDataJSON();
    await route.fulfill({ json: { success: true, require_restart: false } });
  });
  await page.route("**/api/config/raw_paths", (route) =>
    route.fulfill({ json: { birdseye: { mode } } }),
  );

  return { capturedConfig: () => lastSavedConfig };
}

const modeSwitch = (page: Page, label: string) =>
  page.getByRole("switch").and(page.locator(`[id$="-${label}"]`));

test.describe("birdseye tracking mode @medium", () => {
  test("a single mode config loads as that one mode and is not dirty", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, "objects");
    await frigateApp.goto(SETTINGS_URL);

    await expect(modeSwitch(frigateApp.page, "objects")).toBeChecked();
    await expect(modeSwitch(frigateApp.page, "motion")).not.toBeChecked();
    await expect(modeSwitch(frigateApp.page, "continuous")).not.toBeChecked();

    // a bare string against a list schema must not read as a pending edit
    await expect(frigateApp.page.getByText(UNSAVED)).toBeHidden();
  });

  test("a mode list config loads with each of its modes selected", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, ["motion", "objects"]);
    await frigateApp.goto(SETTINGS_URL);

    await expect(modeSwitch(frigateApp.page, "motion")).toBeChecked();
    await expect(modeSwitch(frigateApp.page, "objects")).toBeChecked();
    await expect(modeSwitch(frigateApp.page, "continuous")).not.toBeChecked();

    await expect(frigateApp.page.getByText(UNSAVED)).toBeHidden();
  });

  test("adding a second mode saves both as a list", async ({ frigateApp }) => {
    const capture = await installRoutes(frigateApp.page, "objects");
    await frigateApp.goto(SETTINGS_URL);

    await modeSwitch(frigateApp.page, "motion").click();
    await frigateApp.page
      .getByRole("button", { name: "Save", exact: true })
      .click();

    await expect
      .poll(() => capture.capturedConfig(), { timeout: 5_000 })
      .toMatchObject({
        config_data: { birdseye: { mode: ["objects", "motion"] } },
      });
  });
});
