/**
 * PTZ overlay regression tests -- MEDIUM tier.
 *
 * Guards two things on the PTZ preset dropdown:
 *
 *   1. After selecting a preset, the "Presets" tooltip must not re-pop
 *      (focus-restore side-effect that originally prompted the
 *      `onCloseAutoFocus preventDefault` workaround).
 *   2. Keyboard shortcuts fired after the dropdown closes should not
 *      re-open the dropdown via Space/Enter/Arrow on the trigger
 *      (PR #12079 — "Prevent ptz keyboard shortcuts from reopening
 *      presets menu").
 *
 * Requires an onvif-configured camera and a mocked /ptz/info endpoint
 * exposing presets.
 *
 * TODO: migrate these tests into live.spec.ts when it comes out of
 * PENDING_REWRITE in e2e/scripts/lint-specs.mjs. They live in a dedicated
 * file today so they stay lint-compliant (no waitForTimeout, no
 * conditional isVisible) while live.spec.ts is still exempt.
 */

import { test, expect } from "../fixtures/frigate-test";
import {
  expectBodyInteractive,
  waitForBodyInteractive,
} from "../helpers/overlay-interaction";

const PTZ_CAMERA = "front_door";
const PRESET_NAMES = ["home", "driveway", "front_porch"];

test.describe("PTZ preset dropdown @medium", () => {
  test("selecting a preset closes menu cleanly and does not re-open on keyboard", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }

    // 1. Give front_door an onvif host so the PtzControlPanel renders.
    // 2. Mock the /ptz/info endpoint to expose features + presets.
    await frigateApp.api.install({
      config: {
        cameras: {
          [PTZ_CAMERA]: {
            onvif: {
              host: "10.0.0.50",
            },
          },
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

    // PTZ commands ride the WebSocket, not HTTP. The WsMocker intercepts
    // the /ws route, so Playwright's page-level `websocket` event never
    // fires — instead, patch the client WebSocket.prototype.send before
    // any app code runs and mirror sends into a window-level array the
    // test can read back.
    await frigateApp.page.addInitScript(() => {
      (window as unknown as { __sentWsFrames: string[] }).__sentWsFrames = [];
      const origSend = WebSocket.prototype.send;
      WebSocket.prototype.send = function (data) {
        try {
          (
            window as unknown as { __sentWsFrames: string[] }
          ).__sentWsFrames.push(typeof data === "string" ? data : "(binary)");
        } catch {
          // ignore — best-effort tracing
        }
        return origSend.call(this, data);
      };
    });

    await frigateApp.goto(`/#${PTZ_CAMERA}`);

    // Locate the preset trigger — a button whose accessible name includes
    // "presets" (set via aria-label={t("ptz.presets")}).
    const presetTrigger = frigateApp.page.getByRole("button", {
      name: /presets/i,
    });
    await expect(presetTrigger.first()).toBeVisible({ timeout: 5_000 });

    await presetTrigger.first().click();

    const menu = frigateApp.page
      .locator('[role="menu"], [data-radix-menu-content]')
      .first();
    await expect(menu).toBeVisible({ timeout: 3_000 });

    // Pick a preset.
    const firstPreset = menu
      .getByRole("menuitem", { name: PRESET_NAMES[0] })
      .first();
    await firstPreset.click();

    // Menu closes.
    await expect(menu).not.toBeVisible({ timeout: 3_000 });

    // Preset command was dispatched over the WS.
    await expect
      .poll(
        async () => {
          const sentFrames = await frigateApp.page.evaluate(
            () =>
              (window as unknown as { __sentWsFrames: string[] })
                .__sentWsFrames,
          );

          return sentFrames.some(
            (frame) =>
              frame.includes(`"${PTZ_CAMERA}/ptz"`) &&
              frame.includes(`preset_${PRESET_NAMES[0]}`),
          );
        },
        { timeout: 2_000 },
      )
      .toBe(true);

    // Body is interactive.
    await waitForBodyInteractive(frigateApp.page);
    await expectBodyInteractive(frigateApp.page);

    // Presets tooltip should NOT be visible.
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

    // Now press keyboard keys — none should reopen the menu.
    await frigateApp.page.keyboard.press("ArrowUp");
    await frigateApp.page.keyboard.press("Space");
    await frigateApp.page.keyboard.press("Enter");
    await expect
      .poll(() => menu.isVisible().catch(() => false), { timeout: 1_000 })
      .toBe(false);
  });
});

test.describe("Mobile live camera overlay @medium @mobile", () => {
  test("mobile single-camera view loads without freezing body", async ({
    frigateApp,
  }) => {
    if (!frigateApp.isMobile) {
      test.skip();
      return;
    }

    // Same config override as the desktop spec so the mobile page exercises
    // the onvif-enabled code path and its dismissable-layer consumers.
    await frigateApp.api.install({
      config: {
        cameras: {
          [PTZ_CAMERA]: {
            onvif: { host: "10.0.0.50" },
          },
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

    await frigateApp.goto(`/#${PTZ_CAMERA}`);

    // Body must be interactive after navigation — this is the mobile-side
    // smoke test for the dismissable-layer dedupe. A regression that
    // stuck pointer-events: none on <body> would make the rest of the UI
    // unclickable.
    await expectBodyInteractive(frigateApp.page);
    await expect(frigateApp.page.locator("body")).toBeVisible();
  });
});
