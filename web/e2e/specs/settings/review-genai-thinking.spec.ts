/**
 * Review GenAI thinking toggle tests -- MEDIUM tier.
 *
 * Thinking can only be switched per request by providers that expose a
 * toggle, so the option is shown only when one of those providers holds the
 * descriptions role.
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

const SETTINGS_URL = "/settings?page=globalReview";

async function installRoutes(
  page: Page,
  genai: Record<string, { provider: string; model: string; roles: string[] }>,
) {
  const config = configFactory({ genai } as never);

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

async function openGenAIConfig(page: Page) {
  await page.getByText("GenAI config", { exact: true }).click();
  await expect(page.locator("#pageRoot")).toContainText("Response style");
}

test.describe("review genai thinking @medium", () => {
  test("is shown when the descriptions provider has a thinking toggle", async ({
    frigateApp,
  }) => {
    await installRoutes(frigateApp.page, {
      local: { provider: "llamacpp", model: "m", roles: ["descriptions"] },
    });
    await frigateApp.goto(SETTINGS_URL);
    await openGenAIConfig(frigateApp.page);

    await expect(frigateApp.page.locator("#pageRoot")).toContainText(
      "Enable thinking",
    );
  });

  test("is hidden when the descriptions provider has no thinking toggle", async ({
    frigateApp,
  }) => {
    // the chat provider supports the toggle, but descriptions go elsewhere
    await installRoutes(frigateApp.page, {
      local: { provider: "ollama", model: "m", roles: ["chat"] },
      cloud: { provider: "gemini", model: "m", roles: ["descriptions"] },
    });
    await frigateApp.goto(SETTINGS_URL);
    await openGenAIConfig(frigateApp.page);

    await expect(frigateApp.page.locator("#pageRoot")).not.toContainText(
      "Enable thinking",
    );
  });

  test("is hidden when no provider is configured", async ({ frigateApp }) => {
    await installRoutes(frigateApp.page, {});
    await frigateApp.goto(SETTINGS_URL);
    await openGenAIConfig(frigateApp.page);

    await expect(frigateApp.page.locator("#pageRoot")).not.toContainText(
      "Enable thinking",
    );
  });
});
