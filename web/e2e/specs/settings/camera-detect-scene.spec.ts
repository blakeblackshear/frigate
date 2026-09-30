/**
 * Camera detect scene tests -- MEDIUM tier.
 *
 * Scenes are free-form names declared by the configured models, so a camera
 * only needs to pick one when there is a choice to make. The choices are the
 * scenes of the configured models, plus a saved scene that no model uses.
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
  cameraScene?: string,
) {
  const config = configFactory({
    models,
    ...(cameraScene
      ? { cameras: { front_door: { detect: { scene: cameraScene } } } }
      : {}),
  } as never);

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

  test("a saved scene no model uses stays editable", async ({ frigateApp }) => {
    // the camera falls back to the default model, but its saved scene would
    // silently take effect if a model for it were added later
    await installRoutes(
      frigateApp.page,
      [{ scene: "default", devices: ["cpu"] }],
      "garage",
    );
    await frigateApp.goto(SETTINGS_URL);

    await expect(frigateApp.page.locator("#pageRoot")).toContainText(
      "Detect scene",
    );

    await frigateApp.page.locator("#root_scene").click();
    await expect(frigateApp.page.getByRole("option")).toHaveText([
      "Default",
      "garage",
    ]);
  });

  test("default is only offered when a default model exists", async ({
    frigateApp,
  }) => {
    await installRoutes(
      frigateApp.page,
      [
        { scene: "thermal", devices: ["cpu"] },
        { scene: "visible", devices: ["openvino:GPU.0"] },
      ],
      "thermal",
    );
    await frigateApp.goto(SETTINGS_URL);

    await frigateApp.page.locator("#root_scene").click();
    await expect(frigateApp.page.getByRole("option")).toHaveText([
      "thermal",
      "visible",
    ]);
  });

  test("one model every camera selects needs no choice", async ({
    frigateApp,
  }) => {
    await installRoutes(
      frigateApp.page,
      [{ scene: "thermal", devices: ["cpu"] }],
      "thermal",
    );
    await frigateApp.goto(SETTINGS_URL);

    const root = frigateApp.page.locator("#pageRoot");
    await expect(root).toContainText("Detect FPS");
    await expect(root).not.toContainText("Detect scene");
  });
});
