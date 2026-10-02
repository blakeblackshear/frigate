/**
 * Generative AI provider settings tests -- MEDIUM tier.
 *
 * A model name belongs to its provider, so switching provider clears the model
 * field. The roles widget strips a role only for a model or provider picked in
 * the form, never when capability data arrives for the saved entry, which would
 * dirty the section on load and silently drop the role on the next save.
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

const ENTRY = "audio";
const SETTINGS_URL = "/settings?page=integrationGenerativeAi";
const UNSAVED = "You have unsaved changes";
const MODEL_PLACEHOLDER = "Select or enter a model…";

type Entry = {
  provider: string;
  model: string;
  base_url?: string;
  roles: string[];
};

type ProviderInfo = {
  models: string[];
  supports_transcription: boolean;
  model_capabilities?: Record<string, { supports_transcription?: boolean }>;
};

async function installRoutes(page: Page, entry: Entry, info: ProviderInfo) {
  const config = configFactory({ genai: { [ENTRY]: entry } });

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
    route.fulfill({ json: { genai: { [ENTRY]: entry } } }),
  );
  await page.route("**/api/genai/models", (route) =>
    route.fulfill({
      json: {
        [ENTRY]: {
          roles: entry.roles,
          supports_toggleable_thinking: false,
          supports_embeddings: true,
          model_capabilities: {},
          ...info,
        },
      },
    }),
  );
}

function roleSwitch(page: Page, role: string) {
  return page.locator(`#root_${ENTRY}_roles-${role}`);
}

test.describe("genai provider settings @medium", () => {
  test("a saved role the provider cannot confirm stays and is not dirty", async ({
    frigateApp,
  }) => {
    // The server does not serve the saved model, so the backend reports every
    // capability as false for the entry.
    await installRoutes(
      frigateApp.page,
      {
        provider: "llamacpp",
        model: "stale-model",
        base_url: "http://llama:8080",
        roles: ["transcribe"],
      },
      { models: ["qwen3-asr"], supports_transcription: false },
    );
    await frigateApp.goto(SETTINGS_URL);

    await expect(roleSwitch(frigateApp.page, "transcribe")).toBeVisible();
    await expect(roleSwitch(frigateApp.page, "transcribe")).toBeChecked();

    // Give any stripping effect time to fire, then confirm the section stayed
    // clean.
    await frigateApp.page.waitForTimeout(1000);
    await expect(frigateApp.page.getByText(UNSAVED)).toBeHidden();
    await expect(roleSwitch(frigateApp.page, "transcribe")).toBeChecked();
  });

  test("switching provider clears the model", async ({ frigateApp }) => {
    await installRoutes(
      frigateApp.page,
      {
        provider: "openai",
        model: "gpt-4o",
        roles: ["descriptions"],
      },
      { models: ["gpt-4o"], supports_transcription: true },
    );
    await frigateApp.goto(SETTINGS_URL);

    const model = frigateApp.page.locator(`#root_${ENTRY}_model`);
    await expect(model).toHaveText("gpt-4o");

    await frigateApp.page.locator(`#root_${ENTRY}_provider`).click();
    await frigateApp.page.getByRole("option", { name: "llamacpp" }).click();

    await expect(model).toHaveText(MODEL_PLACEHOLDER);
    await expect(frigateApp.page.getByText(UNSAVED)).toBeVisible();
  });

  test("switching back to the saved provider drops the other provider's model", async ({
    frigateApp,
  }) => {
    await installRoutes(
      frigateApp.page,
      {
        provider: "openai",
        model: "gpt-4o",
        roles: ["descriptions"],
      },
      { models: ["gpt-4o", "qwen3"], supports_transcription: true },
    );
    await frigateApp.goto(SETTINGS_URL);

    const model = frigateApp.page.locator(`#root_${ENTRY}_model`);
    const provider = frigateApp.page.locator(`#root_${ENTRY}_provider`);
    await expect(model).toHaveText("gpt-4o");

    await provider.click();
    await frigateApp.page.getByRole("option", { name: "llamacpp" }).click();
    await model.click();
    await frigateApp.page.getByRole("option", { name: "qwen3" }).click();
    await expect(model).toHaveText("qwen3");

    // the model picked for llamacpp must not carry over to openai, and the
    // saved one isn't filled back in since the endpoint may have changed
    await provider.click();
    await frigateApp.page
      .getByRole("option", { name: "openai", exact: true })
      .click();

    await expect(model).toHaveText(MODEL_PLACEHOLDER);
  });

  test("undo after switching provider brings back the saved model", async ({
    frigateApp,
  }) => {
    await installRoutes(
      frigateApp.page,
      {
        provider: "openai",
        model: "gpt-4o",
        roles: ["descriptions"],
      },
      { models: ["gpt-4o"], supports_transcription: true },
    );
    await frigateApp.goto(SETTINGS_URL);

    const model = frigateApp.page.locator(`#root_${ENTRY}_model`);
    await frigateApp.page.locator(`#root_${ENTRY}_provider`).click();
    await frigateApp.page.getByRole("option", { name: "llamacpp" }).click();
    await expect(model).toHaveText(MODEL_PLACEHOLDER);

    await frigateApp.page.getByRole("button", { name: "Undo" }).click();

    await expect(model).toHaveText("gpt-4o");
    await expect(frigateApp.page.getByText(UNSAVED)).toBeHidden();
  });

  test("picking a model that cannot transcribe strips the role", async ({
    frigateApp,
  }) => {
    await installRoutes(
      frigateApp.page,
      {
        provider: "llamacpp",
        model: "qwen3-asr",
        base_url: "http://llama:8080",
        roles: ["transcribe"],
      },
      {
        models: ["qwen3-asr", "text-only"],
        supports_transcription: true,
        model_capabilities: {
          "qwen3-asr": { supports_transcription: true },
          "text-only": { supports_transcription: false },
        },
      },
    );
    await frigateApp.goto(SETTINGS_URL);

    await expect(roleSwitch(frigateApp.page, "transcribe")).toBeChecked();

    await frigateApp.page.locator(`#root_${ENTRY}_model`).click();
    await frigateApp.page.getByRole("option", { name: "text-only" }).click();

    await expect(roleSwitch(frigateApp.page, "transcribe")).toBeHidden();
    await expect(frigateApp.page.getByText(UNSAVED)).toBeVisible();
  });
});
