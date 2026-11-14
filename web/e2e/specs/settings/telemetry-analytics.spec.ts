/**
 * Telemetry settings: the analytics preview shows the report Frigate would
 * send, fetched only when opened.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "../../fixtures/frigate-test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_SCHEMA = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../fixtures/mock-data/config-schema.json"),
    "utf-8",
  ),
);

const PREVIEW = {
  schema_version: 1,
  install_id: "0".repeat(32),
  install: { version: "0.19.0-test" },
};

test.describe("telemetry settings: analytics preview @medium", () => {
  test("shows the report on demand", async ({ frigateApp }) => {
    let requests = 0;
    const page = frigateApp.page;

    await page.route("**/api/config/schema.json", (route) =>
      route.fulfill({ json: CONFIG_SCHEMA }),
    );
    await page.route("**/api/config/raw_paths", (route) =>
      route.fulfill({ json: { telemetry: {} } }),
    );
    await page.route("**/api/analytics/preview", (route) => {
      requests += 1;
      return route.fulfill({ json: PREVIEW });
    });

    await frigateApp.goto("/settings?page=systemTelemetry");

    const button = page.getByRole("button", { name: "Preview the report" });
    await expect(button).toBeVisible();
    expect(requests).toBe(0);

    await button.click();

    await expect(page.getByTestId("analytics-preview")).toContainText(
      '"schema_version": 1',
    );
    expect(requests).toBe(1);
  });
});
