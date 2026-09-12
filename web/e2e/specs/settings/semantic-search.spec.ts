/**
 * Semantic Search settings tests -- MEDIUM tier.
 *
 * Focuses on the model_size field, which is unused when a GenAI embeddings
 * provider is selected as the semantic search model. The resolved config always
 * reports model_size (it has a schema default of "small"), even when the YAML
 * file has no such key. Clearing model_size for a provider used to run
 * unconditionally, which falsely marked the section dirty on load and asked the
 * backend to delete a key that wasn't in the config file (KeyError: 'model_size').
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

const PROVIDER = "llama_cpp";
const SETTINGS_URL = "/settings?page=integrationSemanticSearch";
const NOT_APPLICABLE = "Not applicable for GenAI providers";
const UNSAVED = "You have unsaved changes";

type SemanticSearch = {
  enabled?: boolean;
  model?: string;
  model_size?: string;
};

async function installRoutes(page: Page, semanticSearch: SemanticSearch) {
  const config = configFactory({
    genai: { [PROVIDER]: { provider: PROVIDER, roles: ["embeddings"] } },
    semantic_search: semanticSearch,
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
  await page.route("**/api/config/set", async (route) => {
    lastSavedConfig = route.request().postDataJSON();
    await route.fulfill({ json: { success: true, require_restart: false } });
  });
  await page.route("**/api/config/raw_paths", (route) =>
    route.fulfill({ json: { semantic_search: semanticSearch } }),
  );

  return { capturedConfig: () => lastSavedConfig };
}

test.describe("semantic search model_size @medium", () => {
  test("a provider with a defaulted model_size is not dirty on load", async ({
    frigateApp,
  }) => {
    // model_size stays at its schema default ("small"), i.e. it is not present
    // in the YAML. This mirrors the reported bug: selecting a GenAI provider and
    // returning to the page.
    await installRoutes(frigateApp.page, {
      enabled: true,
      model: PROVIDER,
    });
    await frigateApp.goto(SETTINGS_URL);

    // The provider path is active: model_size shows "Not applicable".
    await expect(frigateApp.page.getByText(NOT_APPLICABLE)).toBeVisible();

    // Give any clearing effect time to fire, then confirm the section stayed
    // clean (no phantom unsaved-changes banner, Save disabled).
    await frigateApp.page.waitForTimeout(1000);
    await expect(frigateApp.page.getByText(UNSAVED)).toBeHidden();
    await expect(
      frigateApp.page.getByRole("button", { name: "Save", exact: true }),
    ).toBeDisabled();
  });

  test("switching from a configured non-default model_size clears it", async ({
    frigateApp,
  }) => {
    // A genuinely configured non-default model_size ("large") can only come from
    // the YAML, so switching to a provider must still remove it.
    const capture = await installRoutes(frigateApp.page, {
      enabled: true,
      model: "jinav2",
      model_size: "large",
    });
    await frigateApp.goto(SETTINGS_URL);

    // Starts clean on a Jina model.
    await expect(frigateApp.page.getByText(UNSAVED)).toBeHidden();

    // Switch the model to the GenAI provider.
    await frigateApp.page
      .getByRole("combobox", { name: /Semantic search model/ })
      .click();
    await frigateApp.page.getByRole("option", { name: PROVIDER }).click();

    // The change is now dirty and model_size is no longer applicable.
    await expect(frigateApp.page.getByText(NOT_APPLICABLE)).toBeVisible();
    await expect(frigateApp.page.getByText(UNSAVED)).toBeVisible();

    await frigateApp.page
      .getByRole("button", { name: "Save", exact: true })
      .click();

    // The saved payload removes model_size (empty string = "remove" key).
    await expect
      .poll(() => capture.capturedConfig(), { timeout: 5_000 })
      .toMatchObject({
        config_data: {
          semantic_search: { model: PROVIDER, model_size: "" },
        },
      });
  });
});
