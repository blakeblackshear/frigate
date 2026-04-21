/**
 * Config Editor tests -- MEDIUM tier.
 *
 * Monaco load + value, Save (config/save?save_option=saveonly),
 * Save error path, Save and Restart (WS frame via useRestart),
 * Copy (clipboard), schema markers.
 */

import { test, expect } from "../fixtures/frigate-test";
import {
  installWsFrameCapture,
  waitForWsFrame,
} from "../helpers/ws-frames";
import {
  grantClipboardPermissions,
  readClipboard,
} from "../helpers/clipboard";
import {
  getMonacoVisibleText,
  replaceMonacoValue,
  waitForErrorMarker,
} from "../helpers/monaco";

const SAMPLE_CONFIG = "mqtt:\n  host: mqtt\ncameras:\n  front_door:\n    enabled: true\n";

async function installSaveRoute(
  app: { page: import("@playwright/test").Page },
  status: number,
  body: Record<string, unknown>,
): Promise<{ capturedUrl: () => string | null; capturedBody: () => string | null }> {
  let lastUrl: string | null = null;
  let lastBody: string | null = null;
  await app.page.route("**/api/config/save**", async (route) => {
    lastUrl = route.request().url();
    lastBody = route.request().postData();
    await route.fulfill({ status, json: body });
  });
  return {
    capturedUrl: () => lastUrl,
    capturedBody: () => lastBody,
  };
}

test.describe("Config Editor — Monaco @medium", () => {
  test("editor loads with mocked configRaw content", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    await frigateApp.goto("/config");
    await expect(
      frigateApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });
    // Assert via DOM-rendered visible text (Monaco virtualizes — works
    // for short configs which covers our mocked content).
    await expect
      .poll(() => getMonacoVisibleText(frigateApp.page), { timeout: 10_000 })
      .toContain("front_door");
  });
});

test.describe("Config Editor — Save @medium", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Save button copy is desktop-visible (hidden md:block)",
  );

  test("clicking Save Only POSTs config/save?save_option=saveonly", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    const capture = await installSaveRoute(frigateApp, 200, {
      message: "Config saved",
    });
    await frigateApp.goto("/config");
    await expect(
      frigateApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });
    await frigateApp.page.getByLabel("Save Only").click();
    await expect.poll(() => capture.capturedUrl(), { timeout: 5_000 }).toMatch(
      /config\/save\?save_option=saveonly/,
    );
    // Body is the raw YAML as text/plain
    await expect.poll(() => capture.capturedBody(), { timeout: 5_000 }).toContain(
      "front_door",
    );
  });

  test("Save error shows the server message in the error area", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    await installSaveRoute(frigateApp, 400, {
      message: "Invalid field `cameras.front_door`",
    });
    await frigateApp.goto("/config");
    await expect(
      frigateApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });
    await frigateApp.page.getByLabel("Save Only").click();
    await expect(
      frigateApp.page.getByText(/Invalid field/i),
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Config Editor — Save and Restart @medium", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Save and Restart button copy is desktop-visible",
  );

  test("Save and Restart opens dialog; confirm sends WS restart frame", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    await installSaveRoute(frigateApp, 200, { message: "Saved" });
    await installWsFrameCapture(frigateApp.page);

    await frigateApp.goto("/config");
    await expect(
      frigateApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });

    await frigateApp.page.getByLabel("Save & Restart").click();
    const dialog = frigateApp.page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await dialog.getByRole("button", { name: /restart/i }).click();
    await waitForWsFrame(
      frigateApp.page,
      (frame) => frame.includes('"restart"') || frame.includes("restart"),
      { message: "useRestart should send a WS frame on the restart topic" },
    );
  });

  test("cancelling the restart dialog leaves body interactive", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    await installSaveRoute(frigateApp, 200, { message: "Saved" });

    await frigateApp.goto("/config");
    await expect(
      frigateApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });

    await frigateApp.page.getByLabel("Save & Restart").click();
    const dialog = frigateApp.page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });
    await expect(
      frigateApp.page.locator(".monaco-editor").first(),
    ).toBeVisible();
  });
});

test.describe("Config Editor — Copy @medium", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Copy button copy is desktop-visible",
  );

  test("Copy places the editor value in the clipboard", async ({
    frigateApp,
    context,
  }) => {
    await grantClipboardPermissions(context);
    await frigateApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    await frigateApp.goto("/config");
    await expect(
      frigateApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });

    await frigateApp.page.getByLabel("Copy Config").click();
    await expect.poll(() => readClipboard(frigateApp.page), { timeout: 5_000 }).toContain(
      "front_door",
    );
  });
});

test.describe("Config Editor — schema markers @medium", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Schema validation assumes focused desktop editing",
  );

  test("invalid YAML renders at least one error marker in the DOM", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    await frigateApp.goto("/config");
    await expect(
      frigateApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });

    // Replace editor contents with clearly invalid YAML via keyboard.
    await replaceMonacoValue(
      frigateApp.page,
      "this is not: [yaml: and has {unbalanced",
    );
    // Monaco debounces marker evaluation; the .squiggly-error decoration
    // appears asynchronously in the .view-overlays layer.
    await waitForErrorMarker(frigateApp.page);
  });
});

test.describe("Config Editor — Cmd+S keyboard shortcut @medium", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Keyboard save shortcut is desktop-only",
  );

  test("Cmd/Ctrl+S fires the same config/save POST as the Save button", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    const capture = await installSaveRoute(frigateApp, 200, {
      message: "Saved",
    });
    await frigateApp.goto("/config");
    await expect(
      frigateApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });

    // Focus the editor so Monaco's keybinding receives the shortcut.
    await frigateApp.page.locator(".monaco-editor").first().click();
    await frigateApp.page.keyboard.press("ControlOrMeta+s");

    await expect.poll(() => capture.capturedUrl(), { timeout: 5_000 }).toMatch(
      /config\/save\?save_option=saveonly/,
    );
  });
});

test.describe("Config Editor — Safe Mode auto-validation @medium", () => {
  test("safe-mode config auto-posts on mount and shows the inline error", async ({
    frigateApp,
  }) => {
    // Thread safe_mode: true through the config override, then stub
    // config/save to return a validation error. The page's
    // initialValidationRef effect runs on mount and POSTs
    // config/save?save_option=saveonly with the raw config; the 400
    // surfaces through setError.
    // installDefaults must come first so our specific route wins (LIFO).
    await frigateApp.installDefaults({
      config: { safe_mode: true } as unknown as Record<string, unknown>,
      configRaw: "cameras:\n  front_door:\n    ffmpeg: {}\n",
    });
    let autoSaveCalled = false;
    await frigateApp.page.route("**/api/config/save**", async (route) => {
      autoSaveCalled = true;
      await route.fulfill({
        status: 400,
        json: { message: "safe-mode validation failure" },
      });
    });

    await frigateApp.goto("/config");
    await expect(
      frigateApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => autoSaveCalled, { timeout: 10_000 }).toBe(true);
    await expect(
      frigateApp.page.getByText(/safe-mode validation failure/i),
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Config Editor — mobile @medium @mobile", () => {
  test.skip(
    ({ frigateApp }) => !frigateApp.isMobile,
    "Mobile-only",
  );

  test("editor renders at narrow viewport", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    await frigateApp.goto("/config");
    await expect(
      frigateApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
