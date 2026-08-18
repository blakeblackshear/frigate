/**
 * Detection models settings page tests -- HIGH tier.
 *
 * Covers picking hardware per model: exclusive units (Corals) are checkboxes
 * that can only be claimed by one model, unlimited hardware (a GPU) gets a
 * detector-count dropdown, and the whole models list saves in one PUT.
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

const PAGE = "/settings?page=systemDetectorsAndModel";

type Model = {
  scene: string;
  devices: string[];
  path?: string | null;
  input_tensor?: string;
  input_pixel_format?: string;
  input_dtype?: string;
  model_type?: string;
  labelmap?: Record<string, string>;
  attributes_map?: Record<string, string[]>;
  plus?: { id: string; name: string } | null;
  width?: number;
  height?: number;
};

const PLUS_MODEL = {
  id: "abc123",
  name: "yolov9-s",
  baseModel: "yolov9",
  trainDate: "2026-01-02T03:04:05Z",
  isBaseModel: true,
  supportedDetectors: ["openvino"],
  width: 320,
  height: 320,
};

type SavedConfig = { config_data?: { models?: Model[] } };

async function installRoutes(page: Page, models: Model[], plusEnabled = false) {
  const config = configFactory({
    models,
    plus: { enabled: plusEnabled },
  } as never);
  const saves: SavedConfig[] = [];

  await page.route("**/api/config/schema.json", (route) =>
    route.fulfill({ json: CONFIG_SCHEMA }),
  );
  await page.route("**/api/config", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: config })
      : route.fulfill({ json: { success: true } }),
  );
  await page.route("**/api/config/raw_paths", (route) =>
    route.fulfill({ json: { models } }),
  );
  await page.route("**/api/plus/models", (route) =>
    route.fulfill({ json: [PLUS_MODEL] }),
  );
  await page.route("**/api/config/set", async (route) => {
    saves.push(route.request().postDataJSON() as SavedConfig);
    await route.fulfill({ json: { success: true, require_restart: false } });
  });

  return saves;
}

const openPage = async (frigateApp: {
  goto: (url: string) => Promise<void>;
}) => {
  await frigateApp.goto(PAGE);
};

test.describe("Detection models settings @high", () => {
  test("renders a card per configured model", async ({ frigateApp }) => {
    await installRoutes(frigateApp.page, [
      { scene: "all", devices: ["cpu"] },
      { scene: "outdoor", devices: ["edgetpu:pci:0"] },
    ]);
    await openPage(frigateApp);

    const root = frigateApp.page.locator("#pageRoot");
    await expect(root).toContainText("All cameras");
    await expect(root).toContainText("Outdoor");
  });

  test("unlimited hardware offers a detector count", async ({ frigateApp }) => {
    await installRoutes(frigateApp.page, [
      { scene: "all", devices: ["openvino:GPU"] },
    ]);
    await openPage(frigateApp);

    await expect(
      frigateApp.page.getByText("Detectors", { exact: true }),
    ).toBeVisible();
    // three cameras in the mock config, so one detector is recommended and the
    // count already sitting on it is labelled as such
    await expect(
      frigateApp.page.getByText("1 (recommended for 3 cameras)").first(),
    ).toBeVisible();
  });

  test("a detector count above the recommendation is unlabelled", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, [
      { scene: "all", devices: ["openvino:GPU", "openvino:GPU"] },
    ]);
    await openPage(frigateApp);

    await expect(frigateApp.page.getByText("recommended for")).toHaveCount(0);
  });

  test("exclusive hardware offers one checkbox per unit", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, [
      { scene: "all", devices: ["edgetpu:pci:0"] },
    ]);
    await openPage(frigateApp);

    await expect(
      frigateApp.page.locator("#models-0-edgetpu\\:pci\\:0"),
    ).toBeChecked();
    await expect(
      frigateApp.page.locator("#models-0-edgetpu\\:pci\\:1"),
    ).not.toBeChecked();
  });

  test("a unit claimed by another model cannot be picked", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, [
      { scene: "all", devices: ["edgetpu:pci:0"] },
      { scene: "outdoor", devices: ["edgetpu:pci:1"] },
    ]);
    await openPage(frigateApp);

    // the first card's checkbox for the unit the second model holds
    await expect(
      frigateApp.page.locator("#models-0-edgetpu\\:pci\\:1").first(),
    ).toBeDisabled();
  });

  test("adding a model appends a card with an unused scene", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, [{ scene: "all", devices: ["cpu"] }]);
    await openPage(frigateApp);

    await frigateApp.page.getByRole("button", { name: "Add model" }).click();

    // "all" is taken, so the new card takes the next available scene
    await expect(frigateApp.page.locator("#pageRoot")).toContainText("Indoor");
  });

  test("hardware is summarized rather than listed device by device", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, [
      { scene: "all", devices: ["openvino:GPU", "openvino:GPU"] },
    ]);
    await openPage(frigateApp);

    await expect(frigateApp.page.locator("#pageRoot")).toContainText(
      "Intel GPU \u00d72",
    );
    await expect(frigateApp.page.locator("#pageRoot")).not.toContainText(
      "openvino:GPU, openvino:GPU",
    );
  });

  test("a saved Frigate+ model opens on the Frigate+ tab", async ({
    frigateApp,
  }) => {
    // the backend resolves plus:// to a cache path before serving the config
    // back, so the plus metadata is the only signal the model is a Plus one
    await installRoutes(
      frigateApp.page,
      [
        {
          scene: "all",
          devices: ["openvino:GPU"],
          path: "/config/model_cache/abc123",
          plus: PLUS_MODEL,
        },
      ],
      true,
    );
    await openPage(frigateApp);

    await expect(
      frigateApp.page.getByRole("tab", { name: "Frigate+" }),
    ).toHaveAttribute("data-state", "active");
    await expect(frigateApp.page.locator("#pageRoot")).toContainText(
      "yolov9-s",
    );
  });

  test("picking a Frigate+ model stays on the tab and saves a plus path", async ({
    frigateApp,
  }) => {
    const saves = await installRoutes(
      frigateApp.page,
      [
        {
          scene: "all",
          devices: ["openvino:GPU"],
          path: "/config/custom.onnx",
        },
      ],
      true,
    );
    await openPage(frigateApp);

    await frigateApp.page.getByRole("tab", { name: "Frigate+" }).click();
    await frigateApp.page.getByRole("combobox").last().click();
    await frigateApp.page.getByRole("option").first().click();

    await expect(
      frigateApp.page.getByRole("tab", { name: "Frigate+" }),
    ).toHaveAttribute("data-state", "active");

    await frigateApp.page.getByRole("button", { name: /^Save$/ }).click();
    await expect.poll(() => saves.length).toBeGreaterThan(0);

    expect(saves.at(-1)?.config_data?.models?.[0].path).toBe("plus://abc123");
  });

  test("a freshly opened page is not reported as modified", async ({
    frigateApp,
  }) => {
    // `/api/config` serializes with exclude_none, so a nullable field such as
    // labelmap_path is absent rather than null. The form materializes it, and
    // that must not read as an edit.
    await installRoutes(frigateApp.page, [
      {
        scene: "all",
        devices: ["openvino:GPU", "openvino:GPU"],
        path: "/config/model_cache/abc123",
        width: 320,
        height: 320,
        input_tensor: "nchw",
        input_pixel_format: "rgb",
        input_dtype: "float",
        model_type: "yolo-generic",
        labelmap: {},
        attributes_map: {},
      },
    ]);
    await openPage(frigateApp);

    await expect(
      frigateApp.page.getByRole("button", { name: /^Save$/ }),
    ).toBeVisible();
    await expect(frigateApp.page.getByText("Modified")).toHaveCount(0);
  });

  test("saving writes the whole models list in one request", async ({
    frigateApp,
  }) => {
    const saves = await installRoutes(frigateApp.page, [
      { scene: "all", devices: ["edgetpu:pci:0"] },
    ]);
    await openPage(frigateApp);

    await frigateApp.page.locator("#models-0-edgetpu\\:pci\\:1").click();
    await frigateApp.page.getByRole("button", { name: /^Save$/ }).click();

    await expect.poll(() => saves.length).toBeGreaterThan(0);

    const models = saves.at(-1)?.config_data?.models;
    expect(models).toHaveLength(1);
    expect(models?.[0].devices).toEqual(["edgetpu:pci:0", "edgetpu:pci:1"]);
  });
});
