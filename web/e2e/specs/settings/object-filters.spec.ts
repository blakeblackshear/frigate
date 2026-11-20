/**
 * Object filters settings tests -- MEDIUM tier.
 *
 * `objects.filters` is an additionalProperties map, so each label's filter is
 * an entry RJSF adds at runtime. RJSF has changed how a cleared field nested
 * inside such an entry is stored (`""` before 6.9, omitted after). These tests
 * pin what Frigate does with it: the save payload deletes only the cleared
 * key, and restoring the value leaves the section clean.
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

const SETTINGS_URL = "/settings?page=cameraObjects&camera=front_door";
const UNSAVED = "You have unsaved changes";

// A non-default value can only come from the YAML, so deleting it is safe
const MIN_AREA = 5000;

async function installRoutes(page: Page) {
  const config = configFactory({
    cameras: {
      front_door: {
        objects: {
          filters: {
            person: {
              min_area: MIN_AREA,
              max_area: 24000000,
              min_ratio: 0,
              max_ratio: 24000000,
              threshold: 0.7,
              min_score: 0.5,
            },
          },
        },
      },
    },
  });

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
  await page.route("**/api/config/raw_paths", (route) =>
    route.fulfill({ json: {} }),
  );
  await page.route("**/api/config/set", async (route) => {
    lastSavedConfig = route.request().postDataJSON();
    await route.fulfill({ json: { success: true, require_restart: false } });
  });

  return { capturedConfig: () => lastSavedConfig };
}

async function openPersonMinArea(page: Page) {
  await page.getByText("Object filters", { exact: true }).click();
  await page.locator('[aria-expanded="false"]', { hasText: /^Person/ }).click();

  const minArea = page.getByRole("textbox", { name: "Minimum object area" });
  await expect(minArea).toHaveValue(String(MIN_AREA));
  return minArea;
}

test.describe("object filters additionalProperties entries @medium", () => {
  test("clearing a nested filter field deletes only that key on save", async ({
    frigateApp,
  }) => {
    const capture = await installRoutes(frigateApp.page);
    await frigateApp.goto(SETTINGS_URL);

    const minArea = await openPersonMinArea(frigateApp.page);
    await minArea.fill("");

    await expect(frigateApp.page.getByText(UNSAVED)).toBeVisible();
    await frigateApp.page
      .getByRole("button", { name: "Save", exact: true })
      .click();

    // Empty string is the backend's remove sentinel. Sibling filter fields
    // must not appear, or the save would rewrite values the user didn't touch.
    await expect
      .poll(() => capture.capturedConfig(), { timeout: 5_000 })
      .toMatchObject({
        config_data: {
          cameras: {
            front_door: { objects: { filters: { person: { min_area: "" } } } },
          },
        },
      });
    const saved = capture.capturedConfig() as {
      config_data: {
        cameras: {
          front_door: { objects: { filters: { person: object } } };
        };
      };
    };
    expect(saved.config_data.cameras.front_door.objects.filters.person).toEqual(
      { min_area: "" },
    );
  });

  test("restoring a cleared nested filter field leaves the section clean", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page);
    await frigateApp.goto(SETTINGS_URL);

    const minArea = await openPersonMinArea(frigateApp.page);
    const save = frigateApp.page.getByRole("button", {
      name: "Save",
      exact: true,
    });

    await minArea.fill("");
    await expect(frigateApp.page.getByText(UNSAVED)).toBeVisible();
    await expect(save).toBeEnabled();

    await minArea.fill(String(MIN_AREA));
    await expect(frigateApp.page.getByText(UNSAVED)).toBeHidden();
    await expect(save).toBeDisabled();
  });
});
