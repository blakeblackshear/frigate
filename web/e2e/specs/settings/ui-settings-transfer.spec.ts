/**
 * UI settings import/export tests -- MEDIUM tier.
 *
 * Covers exporting browser-stored layouts, streaming settings, and UI
 * preferences to a file, and importing that file back.
 */

import { readFileSync } from "node:fs";
import { test, expect } from "../../fixtures/frigate-test";
import type { Page } from "@playwright/test";

// the mocked profile is admin, so useUserPersistence keys are namespaced
const OUTDOOR_LAYOUT_KEY = "outdoor-draggable-layout:admin";
const STREAMING_KEY = "streaming-settings:admin";

const OUTDOOR_LAYOUT = [
  { i: "front_door", x: 0, y: 0, w: 6, h: 4 },
  { i: "backyard", x: 6, y: 0, w: 6, h: 4 },
];

const STREAMING_SETTINGS = {
  outdoor: {
    front_door: {
      streamName: "front_door",
      streamType: "smart",
      compatibilityMode: false,
      playAudio: false,
      volume: 1,
    },
  },
};

async function writeIdb(page: Page, entries: Record<string, unknown>) {
  await page.evaluate(async (data) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("keyval-store", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("keyval");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const tx = request.result.transaction("keyval", "readwrite");
        const store = tx.objectStore("keyval");
        Object.entries(data).forEach(([key, value]) => store.put(value, key));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
    });
  }, entries);
}

async function readIdb(page: Page, key: string) {
  return page.evaluate(async (target) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("keyval-store", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("keyval");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const tx = request.result.transaction("keyval", "readonly");
        const get = tx.objectStore("keyval").get(target);
        get.onsuccess = () => resolve(get.result ?? null);
        get.onerror = () => reject(get.error);
      };
    });
  }, key);
}

function importPayload(overrides: Record<string, unknown> = {}) {
  return {
    type: "frigate-ui-settings",
    version: 1,
    exported_at: "2026-08-17T14:22:31.000Z",
    frigate_version: "0.15.0-test",
    sections: {
      layouts: { outdoor: OUTDOOR_LAYOUT, patio: OUTDOOR_LAYOUT },
      streaming: STREAMING_SETTINGS,
      preferences: { playbackRate: 2, weekStartsOn: 1 },
    },
    ...overrides,
  };
}

async function chooseImportText(page: Page, contents: string) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "frigate-ui-settings-2026-08-17.json",
    mimeType: "application/json",
    buffer: Buffer.from(contents),
  });
}

async function chooseImportFile(page: Page, payload: unknown) {
  await chooseImportText(page, JSON.stringify(payload));
}

async function confirmImport(page: Page) {
  // Import triggers a real window.location.reload(), not a client-side
  // route change, so #pageRoot is already present and waiting for it
  // alone can race the navigation. Wait for the "load" event first so
  // the evaluate() calls below run against the post-reload document.
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "Import" }).click(),
  ]);
  await page.waitForSelector("#pageRoot");
}

async function clearIdb(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("keyval-store", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("keyval");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const tx = request.result.transaction("keyval", "readwrite");
        tx.objectStore("keyval").clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
    });
  });
}

test.describe("UI settings import/export @medium", () => {
  test("exports stored layouts, streaming settings, and preferences", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/settings?page=uiSettings");

    await writeIdb(frigateApp.page, {
      [OUTDOOR_LAYOUT_KEY]: OUTDOOR_LAYOUT,
      [STREAMING_KEY]: STREAMING_SETTINGS,
      "playbackRate:admin": 2,
    });

    const downloadPromise = frigateApp.page.waitForEvent("download");
    await frigateApp.page
      .getByRole("button", { name: "Export Settings" })
      .click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(
      /^frigate-ui-settings-\d{4}-\d{2}-\d{2}\.json$/,
    );

    const path = await download.path();
    const payload = JSON.parse(readFileSync(path!, "utf-8"));

    expect(payload.type).toBe("frigate-ui-settings");
    expect(payload.version).toBe(1);
    expect(payload.frigate_version).toBe("0.15.0-test");
    expect(payload.sections.layouts.outdoor).toEqual(OUTDOOR_LAYOUT);
    expect(payload.sections.streaming).toEqual(STREAMING_SETTINGS);
    expect(payload.sections.preferences.playbackRate).toBe(2);
  });

  test("omits settings that were never stored", async ({ frigateApp }) => {
    await frigateApp.goto("/settings?page=uiSettings");

    const downloadPromise = frigateApp.page.waitForEvent("download");
    await frigateApp.page
      .getByRole("button", { name: "Export Settings" })
      .click();
    const download = await downloadPromise;

    const path = await download.path();
    const payload = JSON.parse(readFileSync(path!, "utf-8"));

    expect(payload.sections.layouts).toEqual({});
    expect(payload.sections.streaming).toEqual({});
    expect(payload.sections.preferences.playbackRate).toBeUndefined();
  });

  test("imports every section and reloads", async ({ frigateApp }) => {
    await frigateApp.goto("/settings?page=uiSettings");

    await chooseImportFile(frigateApp.page, importPayload());

    await expect(
      frigateApp.page.getByText("Camera group layouts (2 groups)"),
    ).toBeVisible();
    await expect(
      frigateApp.page.getByText("Streaming settings (1 camera)"),
    ).toBeVisible();
    await expect(
      frigateApp.page.getByText("UI preferences (2 settings)"),
    ).toBeVisible();
    await expect(frigateApp.page.getByText(/patio/)).toBeVisible();

    await confirmImport(frigateApp.page);

    expect(await readIdb(frigateApp.page, OUTDOOR_LAYOUT_KEY)).toEqual(
      OUTDOOR_LAYOUT,
    );
    expect(await readIdb(frigateApp.page, STREAMING_KEY)).toEqual(
      STREAMING_SETTINGS,
    );
    expect(await readIdb(frigateApp.page, "playbackRate:admin")).toBe(2);
  });

  test("hides the unknown-group warning when layouts are switched off", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/settings?page=uiSettings");

    // patio is a layout-only group absent from this server, so the warning
    // is meaningful only while the layouts section is being imported
    await chooseImportFile(frigateApp.page, importPayload());

    const warning = frigateApp.page.getByText(/patio/);
    await expect(warning).toBeVisible();

    await frigateApp.page.getByText("Camera group layouts (2 groups)").click();
    await expect(warning).toBeHidden();

    await frigateApp.page.getByText("Camera group layouts (2 groups)").click();
    await expect(warning).toBeVisible();
  });

  test("leaves a section untouched when its switch is off", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/settings?page=uiSettings");

    await writeIdb(frigateApp.page, { [STREAMING_KEY]: {} });
    await chooseImportFile(frigateApp.page, importPayload());

    await frigateApp.page.getByText("Streaming settings (1 camera)").click();
    await confirmImport(frigateApp.page);

    expect(await readIdb(frigateApp.page, STREAMING_KEY)).toEqual({});
    expect(await readIdb(frigateApp.page, OUTDOOR_LAYOUT_KEY)).toEqual(
      OUTDOOR_LAYOUT,
    );
  });

  test("rejects a file that is not a Frigate settings export", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/settings?page=uiSettings");

    await chooseImportFile(frigateApp.page, { type: "something-else" });

    await expect(
      frigateApp.page.getByText(
        "Failed to import settings: file is not a Frigate settings export",
      ),
    ).toBeVisible();
    expect(await readIdb(frigateApp.page, OUTDOOR_LAYOUT_KEY)).toBeNull();
  });

  test("ignores preference keys that are not in the registry", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/settings?page=uiSettings");

    await chooseImportFile(
      frigateApp.page,
      importPayload({
        sections: {
          layouts: {},
          streaming: {},
          preferences: { playbackRate: 2, notARealSetting: "malicious" },
        },
      }),
    );

    await expect(
      frigateApp.page.getByText("UI preferences (1 setting)"),
    ).toBeVisible();

    await confirmImport(frigateApp.page);

    expect(await readIdb(frigateApp.page, "notARealSetting")).toBeNull();
    expect(await readIdb(frigateApp.page, "notARealSetting:admin")).toBeNull();
    expect(await readIdb(frigateApp.page, "playbackRate:admin")).toBe(2);
  });

  test("round trips an export back through import", async ({ frigateApp }) => {
    await frigateApp.goto("/settings?page=uiSettings");

    await writeIdb(frigateApp.page, {
      [OUTDOOR_LAYOUT_KEY]: OUTDOOR_LAYOUT,
      [STREAMING_KEY]: STREAMING_SETTINGS,
      "playbackRate:admin": 2,
      "weekStartsOn:admin": 1,
    });

    const downloadPromise = frigateApp.page.waitForEvent("download");
    await frigateApp.page
      .getByRole("button", { name: "Export Settings" })
      .click();
    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    const path = await download.path();
    const bytes = readFileSync(path!);

    await clearIdb(frigateApp.page);
    // A plain page.reload() is not enough here: the settings view strips
    // the `page` query param from the URL (history.replaceState) shortly
    // after mount, and on mobile that param is what reopens the uiSettings
    // drawer. Re-navigate with the param present so the reload is a real
    // fresh load of the uiSettings pane rather than the settings list.
    await frigateApp.goto("/settings?page=uiSettings");

    // A no-op import would still pass every assertion below, so prove the
    // store is actually empty before feeding the export back in.
    expect(await readIdb(frigateApp.page, OUTDOOR_LAYOUT_KEY)).toBeNull();

    await frigateApp.page.locator('input[type="file"]').setInputFiles({
      name: filename,
      mimeType: "application/json",
      buffer: Buffer.from(bytes),
    });

    await expect(
      frigateApp.page.getByText("UI preferences (2 settings)"),
    ).toBeVisible();

    await confirmImport(frigateApp.page);

    expect(await readIdb(frigateApp.page, OUTDOOR_LAYOUT_KEY)).toEqual(
      OUTDOOR_LAYOUT,
    );
    expect(await readIdb(frigateApp.page, STREAMING_KEY)).toEqual(
      STREAMING_SETTINGS,
    );
    expect(await readIdb(frigateApp.page, "playbackRate:admin")).toBe(2);
    expect(await readIdb(frigateApp.page, "weekStartsOn:admin")).toBe(1);
  });

  test("merges imported streaming settings with existing groups", async ({
    frigateApp,
  }) => {
    const INDOOR_STREAMING = {
      indoor: {
        garage: {
          streamName: "garage",
          streamType: "continuous",
          compatibilityMode: true,
          playAudio: true,
          volume: 0.5,
        },
      },
    };

    await frigateApp.goto("/settings?page=uiSettings");

    await writeIdb(frigateApp.page, { [STREAMING_KEY]: INDOOR_STREAMING });
    await chooseImportFile(frigateApp.page, importPayload());

    await expect(
      frigateApp.page.getByText("Streaming settings (1 camera)"),
    ).toBeVisible();

    await confirmImport(frigateApp.page);

    expect(await readIdb(frigateApp.page, STREAMING_KEY)).toEqual({
      ...INDOOR_STREAMING,
      ...STREAMING_SETTINGS,
    });
  });
  test("rejects a file that is not valid JSON", async ({ frigateApp }) => {
    await frigateApp.goto("/settings?page=uiSettings");

    await chooseImportText(frigateApp.page, "this is not json");

    await expect(
      frigateApp.page.getByText(
        "Failed to import settings: file is not valid JSON",
      ),
    ).toBeVisible();
    expect(await readIdb(frigateApp.page, OUTDOOR_LAYOUT_KEY)).toBeNull();
  });

  test("rejects a file from a newer version of Frigate", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/settings?page=uiSettings");

    await chooseImportFile(frigateApp.page, importPayload({ version: 99 }));

    await expect(
      frigateApp.page.getByText(
        "Failed to import settings: file requires a newer version of Frigate",
      ),
    ).toBeVisible();
    expect(await readIdb(frigateApp.page, OUTDOOR_LAYOUT_KEY)).toBeNull();
  });

  test("rejects a file whose sections are malformed", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/settings?page=uiSettings");

    // correct type and version, so this only fails at schema validation
    await chooseImportFile(
      frigateApp.page,
      importPayload({
        sections: { layouts: "nope", streaming: {}, preferences: {} },
      }),
    );

    await expect(
      frigateApp.page.getByText("Failed to import settings: file is malformed"),
    ).toBeVisible();
    expect(await readIdb(frigateApp.page, OUTDOOR_LAYOUT_KEY)).toBeNull();
  });

  test("rejects a valid file that carries no settings", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/settings?page=uiSettings");

    await chooseImportFile(
      frigateApp.page,
      importPayload({
        sections: { layouts: {}, streaming: {}, preferences: {} },
      }),
    );

    await expect(
      frigateApp.page.getByText(
        "Failed to import settings: file contains no settings",
      ),
    ).toBeVisible();
    expect(await readIdb(frigateApp.page, OUTDOOR_LAYOUT_KEY)).toBeNull();
  });
});
