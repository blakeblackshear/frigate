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

// Frigate+ builds a Hailo model per device and names the detector by its
// pre-rename key; /api/plus/models adds the current one before serving it
const HAILO_PLUS_MODELS = [
  {
    ...PLUS_MODEL,
    id: "hailo8l1",
    supportedDetectors: ["hailo8l", "hailo"],
    hailoDevice: "hailo8l",
  },
  {
    ...PLUS_MODEL,
    id: "hailo8r1",
    supportedDetectors: ["hailo8l", "hailo"],
    hailoDevice: "hailo8r",
  },
];

const HAILO_HARDWARE = [
  {
    key: "hailo",
    detector: "hailo",
    name: "Hailo",
    units: [{ device: "hailo:PCIe", label: "hailo0" }],
    count: 1,
    unlimited: true,
  },
];

type SavedConfig = { config_data?: { models?: Model[] } };

async function installRoutes(
  page: Page,
  models: Model[],
  plusEnabled = false,
  plusModels: unknown[] = [PLUS_MODEL],
  hailoHardware = false,
) {
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
    route.fulfill({ json: plusModels }),
  );

  if (hailoHardware) {
    await page.route("**/api/hardware/probe**", (route) =>
      route.fulfill({ json: HAILO_HARDWARE }),
    );
  }
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
      { scene: "default", devices: ["cpu"] },
      { scene: "outdoor", devices: ["edgetpu:pci:0"] },
    ]);
    await openPage(frigateApp);

    const root = frigateApp.page.locator("#pageRoot");
    await expect(root).toContainText("Default");
    await expect(root).toContainText("outdoor");
  });

  test("unlimited hardware offers a detector count", async ({ frigateApp }) => {
    await installRoutes(frigateApp.page, [
      { scene: "default", devices: ["openvino:GPU.0"] },
    ]);
    await openPage(frigateApp);

    await expect(
      frigateApp.page.getByText("Detectors", { exact: true }),
    ).toBeVisible();

    // the trigger shows the bare count; the recommendation is a second line on
    // the matching option, so the dropdown has to be open to see it
    await expect(
      frigateApp.page.locator("#models-0-detector-count"),
    ).toHaveText("1");

    await frigateApp.page.locator("#models-0-detector-count").click();

    // three cameras in the mock config, so one detector is recommended
    await expect(
      frigateApp.page.getByRole("option", {
        name: /Recommended for 3 cameras/,
      }),
    ).toHaveText(/^1/);
  });

  test("a detector count above the recommendation is unlabelled", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, [
      { scene: "default", devices: ["openvino:GPU.0", "openvino:GPU.0"] },
    ]);
    await openPage(frigateApp);

    // two detectors are configured while one is recommended, so neither the
    // trigger nor the selected option carries a recommendation
    await expect(
      frigateApp.page.locator("#models-0-detector-count"),
    ).toHaveText("2");

    await frigateApp.page.locator("#models-0-detector-count").click();

    await expect(
      frigateApp.page.getByRole("option", { name: /^2/ }),
    ).not.toContainText("Recommended");
  });

  test("exclusive hardware offers one checkbox per unit", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, [
      { scene: "default", devices: ["edgetpu:pci:0"] },
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
      { scene: "default", devices: ["edgetpu:pci:0"] },
      { scene: "outdoor", devices: ["edgetpu:pci:1"] },
    ]);
    await openPage(frigateApp);

    // the first card's checkbox for the unit the second model holds
    await expect(
      frigateApp.page.locator("#models-0-edgetpu\\:pci\\:1").first(),
    ).toBeDisabled();
  });

  test("shareable hardware another model uses can still be picked", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, [
      { scene: "default", devices: ["openvino:GPU.0"] },
      { scene: "outdoor", devices: ["openvino:GPU.1"] },
    ]);
    await openPage(frigateApp);

    await expect(
      frigateApp.page.locator("#models-0-openvino\\:GPU\\.1").first(),
    ).toBeEnabled();
    await expect(frigateApp.page.locator("#pageRoot")).not.toContainText(
      "used by outdoor",
    );
  });

  test("adding a model appends a card with a scene to name", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, [
      { scene: "default", devices: ["cpu"] },
    ]);
    await openPage(frigateApp);

    await frigateApp.page.getByRole("button", { name: "Add model" }).click();

    // the new card's scene starts empty, and a scene is required to save
    const scene = frigateApp.page.locator("#models-1-scene");
    await expect(scene).toHaveValue("");
    await expect(
      frigateApp.page.getByRole("button", { name: /^Save$/ }),
    ).toBeDisabled();

    // the card keeps focus while its scene is typed
    await scene.fill("thermal");
    await expect(scene).toHaveValue("thermal");
    await expect(scene).toBeFocused();
  });

  test("two models cannot share a scene", async ({ frigateApp }) => {
    await installRoutes(frigateApp.page, [
      { scene: "default", devices: ["cpu"] },
      { scene: "thermal", devices: ["edgetpu:pci:0"] },
    ]);
    await openPage(frigateApp);

    await frigateApp.page.locator("#models-1-scene").fill("default");

    await expect(frigateApp.page.locator("#pageRoot")).toContainText(
      "Each model must use a different scene",
    );
    await expect(
      frigateApp.page.getByRole("button", { name: /^Save$/ }),
    ).toBeDisabled();
  });

  test("hardware is summarized rather than listed device by device", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, [
      { scene: "default", devices: ["openvino:GPU.0", "openvino:GPU.0"] },
    ]);
    await openPage(frigateApp);

    await expect(frigateApp.page.locator("#pageRoot")).toContainText(
      "Intel GPU (2) \u2022 3 cameras",
    );
    await expect(frigateApp.page.locator("#pageRoot")).not.toContainText(
      "openvino:GPU, openvino:GPU",
    );
  });

  test("a saved Frigate+ model opens on the Frigate+ tab", async ({
    frigateApp,
  }) => {
    await installRoutes(
      frigateApp.page,
      [
        {
          scene: "default",
          devices: ["openvino:GPU.0"],
          path: "plus://abc123",
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
          scene: "default",
          devices: ["openvino:GPU.0"],
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

  test("saving a Frigate+ model keeps its reference without the Frigate+ fields", async ({
    frigateApp,
  }) => {
    // the backend fills these in from the Frigate+ model info when it loads
    const saves = await installRoutes(
      frigateApp.page,
      [
        {
          scene: "default",
          devices: ["openvino:GPU.0"],
          path: "plus://abc123",
          plus: PLUS_MODEL,
          width: 320,
          height: 320,
          input_tensor: "nchw",
          input_dtype: "float",
          model_type: "yolo-generic",
        },
      ],
      true,
    );
    await openPage(frigateApp);

    await frigateApp.page.locator("#models-0-openvino\\:GPU\\.1").click();
    await frigateApp.page.getByRole("button", { name: /^Save$/ }).click();
    await expect.poll(() => saves.length).toBeGreaterThan(0);

    const model = saves.at(-1)?.config_data?.models?.[0];
    expect(model?.path).toBe("plus://abc123");
    expect(model?.devices).toEqual(["openvino:GPU.0", "openvino:GPU.1"]);
    expect(model).not.toHaveProperty("width");
    expect(model).not.toHaveProperty("input_tensor");
    expect(model).not.toHaveProperty("model_type");
    // a leftover dtype from a custom model must not override the int default
    expect(model).not.toHaveProperty("input_dtype");
  });

  test("a Frigate+ model only shows its path without a Frigate+ API key", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, [
      {
        scene: "default",
        devices: ["openvino:GPU.0"],
        path: "plus://abc123",
        width: 320,
        height: 320,
      },
    ]);
    await openPage(frigateApp);

    const root = frigateApp.page.locator("#pageRoot");
    await expect(root).toContainText("Custom object detector model path");
    await expect(root).not.toContainText("Object detection model input width");
    await expect(root).not.toContainText(
      "Label map for custom object detector",
    );
  });

  test("a Frigate+ Hailo model is listed by the device it was built for", async ({
    frigateApp,
  }) => {
    // every Hailo model supports the one hailo detector, so the detector name
    // says nothing; which device it was built for is what the user picks on
    await installRoutes(
      frigateApp.page,
      [
        {
          scene: "default",
          devices: ["hailo:PCIe"],
          path: "/config/custom.hef",
        },
      ],
      true,
      HAILO_PLUS_MODELS,
      true,
    );
    await openPage(frigateApp);

    await frigateApp.page.getByRole("tab", { name: "Frigate+" }).click();
    await frigateApp.page.getByRole("combobox").last().click();

    const options = frigateApp.page.getByRole("option");

    await expect(options).toHaveCount(2);
    await expect(options.first()).toContainText("hailo8l");
    await expect(options.last()).toContainText("hailo8r");

    // knowing which device is attached is left to the user, so neither is
    // ruled out here
    await expect(options.first()).not.toHaveAttribute("aria-disabled", "true");
    await expect(options.last()).not.toHaveAttribute("aria-disabled", "true");
  });

  test("a freshly opened page is not reported as modified", async ({
    frigateApp,
  }) => {
    // `/api/config` serializes with exclude_none, so a nullable field such as
    // labelmap_path is absent rather than null. The form materializes it, and
    // that must not read as an edit.
    await installRoutes(frigateApp.page, [
      {
        scene: "default",
        devices: ["openvino:GPU.0", "openvino:GPU.0"],
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

  test("the scene, hardware and detector count fields are described", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, [
      { scene: "default", devices: ["openvino:GPU.0"] },
    ]);
    await openPage(frigateApp);

    const root = frigateApp.page.locator("#pageRoot");
    await expect(root).toContainText(
      "A name for the cameras this model is for",
    );
    await expect(root).toContainText(
      "The hardware this model runs its detection on",
    );
    await expect(root).toContainText("How many detection processes to run");
  });

  test("per unit hardware explains why a claimed unit is unavailable", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, [
      { scene: "default", devices: ["edgetpu:pci:0"] },
    ]);
    await openPage(frigateApp);

    // the count dropdown is replaced by checkboxes, so it gets its own copy
    await expect(frigateApp.page.locator("#pageRoot")).toContainText(
      "Each unit runs its own detection process",
    );
  });

  test("removing the default model blocks saving", async ({ frigateApp }) => {
    // a camera that names no scene runs the default model, so deleting it would
    // leave those cameras with nothing to fall back to
    await installRoutes(frigateApp.page, [
      { scene: "default", devices: ["cpu"] },
      { scene: "outdoor", devices: ["edgetpu:pci:0"] },
    ]);
    await openPage(frigateApp);

    await frigateApp.page
      .getByRole("button", { name: "Delete" })
      .first()
      .click();

    await expect(frigateApp.page.locator("#pageRoot")).toContainText(
      "One model must use the default scene",
    );
    await expect(
      frigateApp.page.getByRole("button", { name: /^Save$/ }),
    ).toBeDisabled();
  });

  test("a second GPU can be assigned to a model", async ({ frigateApp }) => {
    // shareable hardware can report several addressable units; every one of
    // them must be reachable, not just the first
    const saves = await installRoutes(frigateApp.page, [
      { scene: "default", devices: ["openvino:GPU.0"] },
    ]);
    await openPage(frigateApp);

    await frigateApp.page.locator("#models-0-openvino\\:GPU\\.1").click();
    await frigateApp.page.getByRole("button", { name: /^Save$/ }).click();
    await expect.poll(() => saves.length).toBeGreaterThan(0);

    expect(saves.at(-1)?.config_data?.models?.[0].devices).toEqual([
      "openvino:GPU.0",
      "openvino:GPU.1",
    ]);
  });

  test("detectors are spread across every selected GPU", async ({
    frigateApp,
  }) => {
    const saves = await installRoutes(frigateApp.page, [
      { scene: "default", devices: ["openvino:GPU.0", "openvino:GPU.1"] },
    ]);
    await openPage(frigateApp);

    await frigateApp.page.locator("#models-0-detector-count").click();
    await frigateApp.page
      .getByRole("option", { name: "4", exact: true })
      .click();
    await frigateApp.page.getByRole("button", { name: /^Save$/ }).click();
    await expect.poll(() => saves.length).toBeGreaterThan(0);

    expect(saves.at(-1)?.config_data?.models?.[0].devices).toEqual([
      "openvino:GPU.0",
      "openvino:GPU.1",
      "openvino:GPU.0",
      "openvino:GPU.1",
    ]);
  });

  test("saving writes the whole models list in one request", async ({
    frigateApp,
  }) => {
    const saves = await installRoutes(frigateApp.page, [
      { scene: "default", devices: ["edgetpu:pci:0"] },
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
