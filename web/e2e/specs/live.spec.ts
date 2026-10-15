/**
 * Live page tests -- CRITICAL tier.
 *
 * Dashboard grid, single-camera controls, feature toggles (with WS
 * frame assertions), context menu, birdseye, and mobile layout.
 * Also absorbs the PTZ preset-dropdown regression tests from the
 * now-deleted ptz-overlay.spec.ts.
 */

import { test, expect, type FrigateApp } from "../fixtures/frigate-test";
import { viewerProfile } from "../fixtures/mock-data/profile";
import { LivePage } from "../pages/live.page";
import {
  installWsFrameCapture,
  readWsFrames,
  waitForWsFrame,
} from "../helpers/ws-frames";
import {
  expectBodyInteractive,
  waitForBodyInteractive,
} from "../helpers/overlay-interaction";

const PTZ_CAMERA = "front_door";
const PRESET_NAMES = ["home", "driveway", "front_porch"];

test.describe("Live Dashboard @critical", () => {
  test("every configured camera renders on the dashboard", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/");
    const live = new LivePage(frigateApp.page, !frigateApp.isMobile);
    for (const cam of ["front_door", "backyard", "garage"]) {
      await expect(live.cameraCard(cam)).toBeVisible({ timeout: 10_000 });
    }
  });

  test("clicking a camera card opens the single-camera view via hash", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/");
    const live = new LivePage(frigateApp.page, !frigateApp.isMobile);
    await live.cameraCard("front_door").first().click({ timeout: 10_000 });
    await expect(frigateApp.page).toHaveURL(/#front_door/);
  });

  test("birdseye route renders without crash", async ({ frigateApp }) => {
    await frigateApp.goto("/#birdseye");
    await expect(frigateApp.page.locator("body")).toBeVisible();
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("empty group shows fallback content", async ({ frigateApp }) => {
    await frigateApp.page.goto("/?group=nonexistent");
    await frigateApp.page.waitForSelector("#pageRoot", { timeout: 10_000 });
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });
});

test.describe("Live Single Camera — desktop controls @critical", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Desktop-only header controls",
  );

  test("single-camera view shows Back and History buttons", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/#front_door");
    const live = new LivePage(frigateApp.page, true);
    await expect(live.backButton).toBeVisible({ timeout: 5_000 });
    await expect(live.historyButton).toBeVisible();
  });

  test("feature toggles render (at least 3)", async ({ frigateApp }) => {
    await frigateApp.goto("/#front_door");
    const live = new LivePage(frigateApp.page, true);
    // Wait for the single-camera header to render before counting toggles.
    await expect(live.backButton).toBeVisible({ timeout: 5_000 });
    await expect(live.featureToggles.first()).toBeVisible({ timeout: 5_000 });
    const count = await live.featureToggles.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("clicking a feature toggle sends the matching WS frame", async ({
    frigateApp,
  }) => {
    await installWsFrameCapture(frigateApp.page);
    await frigateApp.goto("/#front_door");
    const live = new LivePage(frigateApp.page, true);
    // Wait for feature toggles to render (WS camera_activity must arrive first).
    await expect(live.activeFeatureToggles.first()).toBeVisible({
      timeout: 5_000,
    });
    const activeBefore = await live.activeFeatureToggles.count();
    expect(activeBefore).toBeGreaterThan(0);

    await live.activeFeatureToggles.first().click();

    // The toggle dispatches a frame on <camera>/<feature>/set — match on
    // front_door/ prefix + /set suffix (any feature).
    await waitForWsFrame(
      frigateApp.page,
      (frame) => frame.includes("front_door/") && frame.includes("/set"),
      {
        message:
          "feature toggle should dispatch a <camera>/<feature>/set frame",
      },
    );
  });

  test("keyboard shortcut f does not crash", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    await frigateApp.page.keyboard.press("f");
    await expect(frigateApp.page.locator("body")).toBeVisible();
    // Note: headless Chromium rejects fullscreen requests without a user
    // gesture, so document.fullscreenElement cannot be asserted reliably
    // in e2e. We assert the keypress doesn't crash the app; real
    // fullscreen behavior is covered by manual testing.
  });

  test("settings gear opens a dropdown with Stream/Play menu items", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/#front_door");
    // Wait for the single-camera view to render — use the Back button
    // as a deterministic marker.
    const live = new LivePage(frigateApp.page, true);
    await expect(live.backButton).toBeVisible({ timeout: 10_000 });

    // The gear icon button is the last button-like element in the
    // single-camera header. Clicking it opens a Radix dropdown.
    const gearButtons = frigateApp.page.locator("button:has(svg)");
    const count = await gearButtons.count();
    expect(count).toBeGreaterThan(0);
    await gearButtons.last().click();

    const menu = frigateApp.page
      .locator('[role="menu"], [data-radix-menu-content]')
      .first();
    await expect(menu).toBeVisible({ timeout: 3_000 });
    await frigateApp.page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible({ timeout: 3_000 });
  });
});

test.describe("Live Context Menu (desktop) @critical", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Right-click is desktop-only",
  );

  test("right-click opens the context menu", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    const live = new LivePage(frigateApp.page, true);
    const menu = await live.openContextMenuOn("front_door");
    await expect(menu).toBeVisible({ timeout: 5_000 });
  });

  test("context menu closes on Escape and leaves body interactive", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/");
    const live = new LivePage(frigateApp.page, true);
    const menu = await live.openContextMenuOn("front_door");
    await expect(menu).toBeVisible({ timeout: 5_000 });
    await frigateApp.page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();
    await waitForBodyInteractive(frigateApp.page);
    await expectBodyInteractive(frigateApp.page);
  });
});

test.describe("Live PTZ preset dropdown @critical", () => {
  // Migrated from ptz-overlay.spec.ts. Guards:
  //  1. After selecting a preset, the "Presets" tooltip must not re-pop.
  //  2. Keyboard shortcuts after close should not re-open the dropdown.

  test("selecting a preset closes menu cleanly and does not re-open on keyboard", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "PTZ preset dropdown is desktop-only");

    await frigateApp.api.install({
      config: {
        cameras: {
          [PTZ_CAMERA]: { onvif: { host: "10.0.0.50" } },
        },
      },
    });
    await frigateApp.page.route(`**/api/${PTZ_CAMERA}/ptz/info`, (route) =>
      route.fulfill({
        json: {
          name: PTZ_CAMERA,
          features: ["pt", "zoom"],
          presets: PRESET_NAMES,
          profiles: [],
        },
      }),
    );

    await installWsFrameCapture(frigateApp.page);
    await frigateApp.goto(`/#${PTZ_CAMERA}`);

    const presetTrigger = frigateApp.page.getByRole("button", {
      name: /presets/i,
    });
    await expect(presetTrigger.first()).toBeVisible({ timeout: 5_000 });
    await presetTrigger.first().click();

    const menu = frigateApp.page
      .locator('[role="menu"], [data-radix-menu-content]')
      .first();
    await expect(menu).toBeVisible({ timeout: 3_000 });

    await menu.getByRole("menuitem", { name: PRESET_NAMES[0] }).first().click();
    await expect(menu).not.toBeVisible({ timeout: 3_000 });

    await waitForWsFrame(
      frigateApp.page,
      (frame) =>
        frame.includes(`"${PTZ_CAMERA}/ptz"`) &&
        frame.includes(`preset_${PRESET_NAMES[0]}`),
    );

    await waitForBodyInteractive(frigateApp.page);
    await expectBodyInteractive(frigateApp.page);

    await expect
      .poll(
        async () =>
          frigateApp.page
            .locator('[role="tooltip"]')
            .filter({ hasText: /presets/i })
            .isVisible()
            .catch(() => false),
        { timeout: 1_000 },
      )
      .toBe(false);

    await frigateApp.page.keyboard.press("ArrowUp");
    await frigateApp.page.keyboard.press("Space");
    await frigateApp.page.keyboard.press("Enter");
    await expect
      .poll(() => menu.isVisible().catch(() => false), { timeout: 1_000 })
      .toBe(false);
  });
});

test.describe("Live PTZ preset management @high", () => {
  // Presets are written to the camera through the REST API (admin only);
  // recalling a preset or home still goes over the ptz WS topic.

  const PRESETS = [
    { token: "tok 1", name: "Driveway" },
    { token: "2", name: "Gate" },
  ];

  async function installPtz(
    frigateApp: FrigateApp,
    {
      features = ["pt", "zoom", "home", "home-set"],
      profile,
    }: { features?: string[]; profile?: ReturnType<typeof viewerProfile> } = {},
  ) {
    await frigateApp.api.install({
      profile,
      config: {
        cameras: {
          [PTZ_CAMERA]: {
            onvif: {
              host: "10.0.0.50",
              autotracking: { return_preset: "driveway" },
            },
          },
        },
      },
    });
    await frigateApp.page.route(`**/api/${PTZ_CAMERA}/ptz/info`, (route) =>
      route.fulfill({
        json: {
          name: PTZ_CAMERA,
          features,
          presets: PRESETS.map((p) => p.name.toLowerCase()),
          preset_details: PRESETS,
          max_presets: 8,
          profiles: [],
        },
      }),
    );
  }

  async function openPresetMenu(frigateApp: FrigateApp) {
    const trigger = frigateApp.page.getByRole("button", {
      name: "PTZ camera presets",
    });
    await expect(trigger).toBeVisible({ timeout: 5_000 });
    await trigger.click();
    const menu = frigateApp.page.getByRole("menu");
    await expect(menu).toBeVisible({ timeout: 3_000 });
    return menu;
  }

  async function openPresetManager(frigateApp: FrigateApp) {
    const menu = await openPresetMenu(frigateApp);
    await menu.getByRole("menuitem", { name: "Manage presets" }).click();
    const manager = frigateApp.page.getByRole("dialog", {
      name: "PTZ presets",
    });
    await expect(manager).toBeVisible();
    return manager;
  }

  // saving a new preset is reached through the preset manager
  async function openCreateDialog(frigateApp: FrigateApp) {
    const manager = await openPresetManager(frigateApp);
    await manager.getByRole("button", { name: "Add preset" }).click();
    const dialog = frigateApp.page.getByRole("dialog", {
      name: "Save current position as preset",
    });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  test("admin saves the current position as a new preset", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "PTZ preset dropdown is desktop-only");
    await installPtz(frigateApp);

    let body: unknown;
    await frigateApp.page.route(`**/api/${PTZ_CAMERA}/ptz/presets`, (route) => {
      body = route.request().postDataJSON();
      return route.fulfill({
        json: { success: true, message: "Preset saved", token: "3" },
      });
    });

    await frigateApp.goto(`/#${PTZ_CAMERA}`);
    const dialog = await openCreateDialog(frigateApp);
    await dialog.getByRole("textbox").fill("Porch");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect.poll(() => body).toEqual({ name: "Porch" });
    await expect(
      frigateApp.page.getByText("Preset saved").first(),
    ).toBeVisible();
    await expect(dialog).not.toBeVisible();
  });

  test("a validation error from the API shows a toast instead of crashing", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "PTZ preset dropdown is desktop-only");
    await installPtz(frigateApp);
    // FastAPI 422 bodies carry a list of objects in detail
    await frigateApp.page.route(`**/api/${PTZ_CAMERA}/ptz/presets`, (route) =>
      route.fulfill({
        status: 422,
        json: {
          detail: [
            {
              type: "string_too_long",
              loc: ["body", "name"],
              msg: "String should have at most 64 characters",
              input: "x",
            },
          ],
        },
      }),
    );

    await frigateApp.goto(`/#${PTZ_CAMERA}`);
    const dialog = await openCreateDialog(frigateApp);
    await dialog.getByRole("textbox").fill("Porch");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(
      frigateApp.page.getByText("The camera rejected the request").first(),
    ).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  test("a rejected request shows the translated reason, not server text", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "PTZ preset dropdown is desktop-only");
    await installPtz(frigateApp);
    await frigateApp.page.route(`**/api/${PTZ_CAMERA}/ptz/presets`, (route) =>
      route.fulfill({
        status: 409,
        json: {
          success: false,
          message: "server text",
          reason: "duplicate_name",
        },
      }),
    );

    await frigateApp.goto(`/#${PTZ_CAMERA}`);
    const dialog = await openCreateDialog(frigateApp);
    // 63 letters and an emoji are 64 characters, the most the API accepts
    await dialog.getByRole("textbox").fill(`${"a".repeat(63)}🙂`);
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(
      frigateApp.page
        .getByText("A preset with this name already exists")
        .first(),
    ).toBeVisible();
    await expect(frigateApp.page.getByText("server text")).toHaveCount(0);
  });

  test("names outside 1-64 characters are rejected before any request", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "PTZ preset dropdown is desktop-only");
    await installPtz(frigateApp);
    let requests = 0;
    await frigateApp.page.route(`**/api/${PTZ_CAMERA}/ptz/presets`, (route) => {
      requests += 1;
      return route.fulfill({ json: { success: true, message: "ok" } });
    });

    await frigateApp.goto(`/#${PTZ_CAMERA}`);
    const dialog = await openCreateDialog(frigateApp);

    for (const name of ["x".repeat(65), "   "]) {
      await dialog.getByRole("textbox").fill(name);
      await dialog.getByRole("button", { name: "Save" }).click();
      await expect(
        dialog.getByText("Preset names must be 1 to 64 characters"),
      ).toBeVisible();
    }
    expect(requests).toBe(0);
  });

  test("typing a preset name with digits does not recall presets", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "PTZ preset dropdown is desktop-only");
    await installPtz(frigateApp);
    await installWsFrameCapture(frigateApp.page);

    await frigateApp.goto(`/#${PTZ_CAMERA}`);
    const dialog = await openCreateDialog(frigateApp);
    await dialog.getByRole("textbox").click();
    // "1" and "2" are the preset hotkeys for Driveway and Gate
    await frigateApp.page.keyboard.type("Cam 12");
    await frigateApp.page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    // the manager stays open underneath
    await frigateApp.page.keyboard.press("Escape");
    await expect(
      frigateApp.page.getByRole("dialog", { name: "PTZ presets" }),
    ).not.toBeVisible();

    // recall Gate from the menu; frames are sent in order, so any frame the
    // typing produced would already be captured once this one arrives
    const reopened = await openPresetMenu(frigateApp);
    await reopened.getByRole("menuitem", { name: "Gate" }).click();
    await waitForWsFrame(frigateApp.page, (frame) =>
      frame.includes("preset_Gate"),
    );
    const presetFrames = (await readWsFrames(frigateApp.page)).filter((frame) =>
      frame.includes("preset_"),
    );
    expect(presetFrames).toHaveLength(1);
  });

  test("the menu offers only the preset manager besides the presets", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "PTZ preset dropdown is desktop-only");
    await installPtz(frigateApp);

    await frigateApp.goto(`/#${PTZ_CAMERA}`);
    const menu = await openPresetMenu(frigateApp);
    await expect(menu.getByRole("menuitem")).toHaveText([
      "Driveway",
      "Gate",
      "Manage presets",
    ]);
  });

  test("opening the manager does not show a preset action tooltip", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "PTZ preset dropdown is desktop-only");
    await installPtz(frigateApp);

    await frigateApp.goto(`/#${PTZ_CAMERA}`);
    const manager = await openPresetManager(frigateApp);
    await expect(
      manager.getByRole("button", { name: "Move to preset" }).first(),
    ).not.toBeFocused();
    await expect(frigateApp.page.getByRole("tooltip")).toHaveCount(0);
  });

  test("manager overwrites with a new name and deletes by encoded token", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "PTZ preset dropdown is desktop-only");
    await installPtz(frigateApp);

    const requests: { method: string; url: string; body: unknown }[] = [];
    await frigateApp.page.route(
      `**/api/${PTZ_CAMERA}/ptz/presets/**`,
      (route) => {
        const request = route.request();
        requests.push({
          method: request.method(),
          url: request.url(),
          body: request.postDataJSON(),
        });
        return route.fulfill({ json: { success: true, message: "ok" } });
      },
    );

    await frigateApp.goto(`/#${PTZ_CAMERA}`);
    const manager = await openPresetManager(frigateApp);
    await expect(manager.getByText("2 of 8 presets")).toBeVisible();

    // overwrite Driveway (the autotracking return preset) under a new name
    await manager
      .getByRole("button", { name: "Overwrite with current position" })
      .first()
      .click();
    const overwrite = frigateApp.page.getByRole("dialog", {
      name: "Overwrite preset Driveway",
    });
    await expect(
      overwrite.getByText(/Autotracking uses this preset as its return preset/),
    ).toBeVisible();
    await overwrite.getByRole("textbox").fill("Drive");
    await overwrite.getByRole("button", { name: "Save" }).click();
    await expect
      .poll(() => requests.at(-1))
      .toEqual({
        method: "PUT",
        url: expect.stringMatching(/\/ptz\/presets\/tok%201$/),
        body: { name: "Drive" },
      });

    // delete Gate
    await manager.getByRole("button", { name: "Delete" }).nth(1).click();
    const confirm = frigateApp.page.getByRole("alertdialog");
    await expect(confirm).toContainText("Delete preset Gate?");
    await confirm.getByRole("button", { name: "Delete" }).click();
    await expect
      .poll(() => requests.at(-1)?.method + " " + requests.at(-1)?.url)
      .toMatch(/^DELETE .*\/ptz\/presets\/2$/);
  });

  test("home button recalls home over WS and set home posts", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "PTZ preset dropdown is desktop-only");
    await installPtz(frigateApp);
    await installWsFrameCapture(frigateApp.page);

    let setHomeCalls = 0;
    await frigateApp.page.route(`**/api/${PTZ_CAMERA}/ptz/home`, (route) => {
      setHomeCalls += 1;
      return route.fulfill({ json: { success: true, message: "ok" } });
    });

    await frigateApp.goto(`/#${PTZ_CAMERA}`);
    await frigateApp.page
      .getByRole("button", { name: "Move PTZ camera to its home position" })
      .click();
    await waitForWsFrame(
      frigateApp.page,
      (frame) =>
        frame.includes(`"${PTZ_CAMERA}/ptz"`) && frame.includes('"HOME"'),
    );

    const manager = await openPresetManager(frigateApp);
    await manager
      .getByRole("button", { name: "Set current position as home" })
      .click();
    await expect.poll(() => setHomeCalls).toBe(1);
    await expect(
      frigateApp.page.getByText("Home position saved").first(),
    ).toBeVisible();
  });

  test("fixed home position hides set home", async ({ frigateApp }) => {
    test.skip(frigateApp.isMobile, "PTZ preset dropdown is desktop-only");
    await installPtz(frigateApp, { features: ["pt", "zoom", "home"] });

    await frigateApp.goto(`/#${PTZ_CAMERA}`);
    const manager = await openPresetManager(frigateApp);
    await expect(
      manager.getByRole("button", { name: "Add preset" }),
    ).toBeVisible();
    await expect(
      manager.getByRole("button", { name: "Set current position as home" }),
    ).toHaveCount(0);
  });

  test("viewer can recall presets but not manage them", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "PTZ preset dropdown is desktop-only");
    await installPtz(frigateApp, { profile: viewerProfile() });

    await frigateApp.goto(`/#${PTZ_CAMERA}`);
    const menu = await openPresetMenu(frigateApp);
    await expect(menu.getByRole("menuitem", { name: "Gate" })).toBeVisible();
    await expect(
      menu.getByRole("menuitem", { name: "Manage presets" }),
    ).toHaveCount(0);
  });
});

test.describe("Live mobile layout @critical @mobile", () => {
  test("mobile dashboard has no sidebar and renders cameras", async ({
    frigateApp,
  }) => {
    test.skip(!frigateApp.isMobile, "Mobile-only");
    await frigateApp.goto("/");
    await expect(frigateApp.page.locator("aside")).toHaveCount(0);
    const live = new LivePage(frigateApp.page, false);
    await expect(live.cameraCard("front_door")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("mobile camera tap opens single view", async ({ frigateApp }) => {
    test.skip(!frigateApp.isMobile, "Mobile-only");
    await frigateApp.goto("/");
    const live = new LivePage(frigateApp.page, false);
    await live.cameraCard("front_door").first().click({ timeout: 10_000 });
    await expect(frigateApp.page).toHaveURL(/#front_door/);
  });

  test("mobile onvif single-camera view loads without freezing body", async ({
    frigateApp,
  }) => {
    test.skip(!frigateApp.isMobile, "Mobile-only");
    // Migrated from ptz-overlay.spec.ts — dismissable-layer dedupe smoke test.
    await frigateApp.api.install({
      config: {
        cameras: { [PTZ_CAMERA]: { onvif: { host: "10.0.0.50" } } },
      },
    });
    await frigateApp.page.route(`**/api/${PTZ_CAMERA}/ptz/info`, (route) =>
      route.fulfill({
        json: {
          name: PTZ_CAMERA,
          features: ["pt", "zoom"],
          presets: PRESET_NAMES,
          profiles: [],
        },
      }),
    );
    await frigateApp.goto(`/#${PTZ_CAMERA}`);
    await expectBodyInteractive(frigateApp.page);
    await expect(frigateApp.page.locator("body")).toBeVisible();
  });
});

test.describe("Live camera groups @medium", () => {
  test("a group with an invalid icon renders a fallback icon", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      config: {
        camera_groups: {
          outdoor: { cameras: ["front_door"], icon: "generic" },
        },
      },
    });
    await frigateApp.goto("/");
    const group = frigateApp.page
      .locator('[aria-label="Camera Groups"]:not([inert] *)')
      .first();
    await expect(group.locator("svg")).toBeVisible({ timeout: 10_000 });
  });
});
