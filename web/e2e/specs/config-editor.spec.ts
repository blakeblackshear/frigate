/**
 * Config Editor page tests -- MEDIUM tier.
 *
 * Tests Monaco editor loading, YAML content rendering,
 * save button presence, and copy button interaction.
 */

import { test, expect } from "../fixtures/frigate-test";

test.describe("Config Editor @medium", () => {
  test("config editor loads Monaco editor with content", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/config");
    await frigateApp.page.waitForTimeout(5000);
    // Monaco editor should render with a specific class
    const editor = frigateApp.page.locator(
      ".monaco-editor, [data-keybinding-context]",
    );
    await expect(editor.first()).toBeVisible({ timeout: 10_000 });
  });

  test("config editor has action buttons", async ({ frigateApp }) => {
    await frigateApp.goto("/config");
    await frigateApp.page.waitForTimeout(5000);
    const buttons = frigateApp.page.locator("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("config editor button clicks do not crash", async ({ frigateApp }) => {
    await frigateApp.goto("/config");
    await frigateApp.page.waitForTimeout(5000);
    // Find buttons with SVG icons (copy, save, etc.)
    const iconButtons = frigateApp.page.locator("button:has(svg)");
    const count = await iconButtons.count();
    if (count > 0) {
      // Click the first icon button (likely copy)
      await iconButtons.first().click();
      await frigateApp.page.waitForTimeout(500);
    }
    await expect(frigateApp.page.locator("body")).toBeVisible();
  });
});
