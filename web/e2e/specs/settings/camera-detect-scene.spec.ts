/**
 * Camera detect scene tests -- MEDIUM tier.
 *
 * Scenes are free-form names declared by the configured models, so a camera
 * only needs to pick one when there is more than one model, and the choices
 * are the default scene plus the scenes of those models.
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

const SETTINGS_URL = "/settings?page=cameraDetect&camera=front_door";

async function installRoutes(
  page: Page,
  models: { scene: string; devices: string[] }[],
) {
  const config = configFactory({ models } as never);

  await page.route("**/api/config/schema.json", (route) =>
    route.fulfill({ json: CONFIG_SCHEMA }),
  );
  await page.route("**/api/config", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: config })
      : route.fulfill({ json: { success: true } }),
  );
  await page.route("**/api/config/raw_paths", (route) =>
    route.fulfill({ json: {} }),
  );
}

test.describe("camera detect scene @medium", () => {
  test("is hidden when there is only one model", async ({ frigateApp }) => {
    await installRoutes(frigateApp.page, [
      { scene: "default", devices: ["cpu"] },
    ]);
    await frigateApp.goto(SETTINGS_URL);

    const root = frigateApp.page.locator("#pageRoot");
    await expect(root).toContainText("Detect FPS");
    await expect(root).not.toContainText("Detect scene");
  });

  test("offers the default and configured model scenes", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, [
      { scene: "default", devices: ["cpu"] },
      { scene: "thermal", devices: ["openvino:GPU.0"] },
    ]);
    await frigateApp.goto(SETTINGS_URL);

    const root = frigateApp.page.locator("#pageRoot");
    await expect(root).toContainText("Detect scene");

    await frigateApp.page.locator("#root_scene").click();
    const options = frigateApp.page.getByRole("option");
    await expect(options).toHaveText(["Default", "thermal"]);
  });
});
