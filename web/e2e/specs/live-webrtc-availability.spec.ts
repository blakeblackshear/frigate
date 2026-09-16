/**
 * WebRTC streaming-technology availability gating.
 *
 * The connectivity probe needs a live go2rtc, so this covers the
 * statically-determinable gate: with no webrtc candidates/ice_servers
 * configured, the WebRTC option must be disabled in the stream-technology
 * selector (label "Streaming Technology").
 */
import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/frigate-test";
import { LivePage } from "../pages/live.page";

// the mocked profile is admin, so useUserPersistence keys are namespaced
const STREAMING_KEY = "streaming-settings:admin";

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

test.describe("WebRTC availability gating @critical", () => {
  test("desktop: WebRTC option is disabled when no candidates or ice_servers", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "Desktop dropdown only");

    await frigateApp.installDefaults({
      config: {
        go2rtc: {
          streams: { front_door: ["rtsp://127.0.0.1:8554/front_door"] },
          webrtc: { candidates: [], ice_servers: [] },
        },
      },
    });

    // The single-camera view fetches go2rtc stream metadata once restreamed.
    // The default mock returns {} which lacks `producers` and crashes the
    // capability parser, so return a minimal valid metadata payload.
    await frigateApp.page.route("**/api/go2rtc/streams/front_door**", (route) =>
      route.fulfill({
        json: {
          producers: [{ medias: ["video, recvonly, H264"] }],
          consumers: [],
        },
      }),
    );

    await frigateApp.goto("/#front_door");

    const live = new LivePage(frigateApp.page, true);
    await expect(live.backButton).toBeVisible({ timeout: 10_000 });

    // Open the desktop camera-settings dropdown (the FaCog gear is the last
    // button-like trigger in the single-camera header).
    const gearButtons = frigateApp.page.locator("button:has(svg)");
    await gearButtons.last().click();

    const menu = frigateApp.page
      .locator('[role="menu"], [data-radix-menu-content]')
      .first();
    await expect(menu).toBeVisible({ timeout: 3_000 });

    // Open the "Streaming Technology" select. Anchor on its label, then click
    // the combobox trigger that follows it within the same field container.
    const technologyTrigger = menu
      .locator('div:has(> label[for="streaming-mode"]) [role="combobox"]')
      .first();
    await expect(technologyTrigger).toBeVisible({ timeout: 3_000 });
    await technologyTrigger.click();

    // The Radix select content is portaled to the document body; the WebRTC
    // option must be present and disabled (aria-disabled="true").
    const webrtcOption = frigateApp.page.getByRole("option", {
      name: /WebRTC/,
    });
    await expect(webrtcOption).toBeVisible({ timeout: 3_000 });
    await expect(webrtcOption).toHaveAttribute("aria-disabled", "true");

    // Sanity check: a non-gated option (MSE) is enabled, proving the locator
    // distinguishes enabled from disabled options.
    const mseOption = frigateApp.page.getByRole("option", { name: /MSE/ });
    await expect(mseOption).not.toHaveAttribute("aria-disabled", "true");
  });

  test("the unavailable reason is logged to the console once", async ({
    frigateApp,
  }) => {
    // Availability is consumed by several components at once, so the emitter
    // dedupes; the count asserts that dedupe, not just the message.
    const warnings: string[] = [];
    frigateApp.page.on("console", (msg) => {
      if (msg.type() === "warning" && msg.text().includes("WebRTC unavailable"))
        warnings.push(msg.text());
    });

    await frigateApp.installDefaults({
      config: {
        go2rtc: {
          streams: { front_door: ["rtsp://127.0.0.1:8554/front_door"] },
          webrtc: { candidates: [], ice_servers: [] },
        },
      },
    });

    await frigateApp.page.route("**/api/go2rtc/streams/front_door**", (route) =>
      route.fulfill({
        json: {
          producers: [{ medias: ["video, recvonly, H264"] }],
          consumers: [],
        },
      }),
    );

    await frigateApp.goto("/#front_door");

    await expect
      .poll(() => warnings.length, { timeout: 10_000 })
      .toBeGreaterThan(0);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("WebRTC unavailable 'not-configured'");
    expect(warnings[0]).toContain("go2rtc.webrtc");
    expect(warnings[0]).toContain("docs.frigate.video");
  });

  test("desktop: the WebRTC option reports the pending connectivity check", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "Desktop dropdown only");

    // Hold the signaling socket open so the probe stays pending. Left alone it
    // fails fast against the preview server and resolves to unreachable, which
    // is the state the first test already covers.
    await frigateApp.page.routeWebSocket("**/live/webrtc/api/ws**", () => {
      // never answer the offer
    });

    // Candidates configured, so the gate reaches the probe rather than
    // stopping at not-configured.
    await frigateApp.installDefaults({
      config: {
        go2rtc: {
          streams: { front_door: ["rtsp://127.0.0.1:8554/front_door"] },
          webrtc: { candidates: ["192.168.1.10:8555"], ice_servers: [] },
        },
      },
    });

    await frigateApp.page.route("**/api/go2rtc/streams/front_door**", (route) =>
      route.fulfill({
        json: {
          producers: [{ medias: ["video, recvonly, H264"] }],
          consumers: [],
        },
      }),
    );

    await frigateApp.goto("/#front_door");

    const live = new LivePage(frigateApp.page, true);
    await expect(live.backButton).toBeVisible({ timeout: 10_000 });

    const gearButtons = frigateApp.page.locator("button:has(svg)");
    await gearButtons.last().click();

    const menu = frigateApp.page
      .locator('[role="menu"], [data-radix-menu-content]')
      .first();
    await expect(menu).toBeVisible({ timeout: 3_000 });

    const technologyTrigger = menu
      .locator('div:has(> label[for="streaming-mode"]) [role="combobox"]')
      .first();
    await expect(technologyTrigger).toBeVisible({ timeout: 3_000 });
    await technologyTrigger.click();

    // Unselectable while the probe runs, but with the reason stated rather
    // than a bare greyed-out row.
    const webrtcOption = frigateApp.page.getByRole("option", {
      name: /WebRTC/,
    });
    await expect(webrtcOption).toBeVisible({ timeout: 3_000 });
    await expect(webrtcOption).toHaveAttribute("aria-disabled", "true");
    await expect(webrtcOption).toContainText(/Checking WebRTC availability/i);
  });

  test("desktop: JSMpeg is no longer offered in the technology selector", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "Desktop dropdown only");

    await frigateApp.installDefaults({
      config: {
        go2rtc: {
          streams: { front_door: ["rtsp://127.0.0.1:8554/front_door"] },
          webrtc: { candidates: [], ice_servers: [] },
        },
      },
    });

    await frigateApp.page.route("**/api/go2rtc/streams/front_door**", (route) =>
      route.fulfill({
        json: {
          producers: [{ medias: ["video, recvonly, H264"] }],
          consumers: [],
        },
      }),
    );

    await frigateApp.goto("/#front_door");

    const live = new LivePage(frigateApp.page, true);
    await expect(live.backButton).toBeVisible({ timeout: 10_000 });

    const gearButtons = frigateApp.page.locator("button:has(svg)");
    await gearButtons.last().click();

    const menu = frigateApp.page
      .locator('[role="menu"], [data-radix-menu-content]')
      .first();
    await expect(menu).toBeVisible({ timeout: 3_000 });

    // Technology selector offers MSE/WebRTC but NOT JSMpeg (replaced by the
    // "Force low-bandwidth mode" switch).
    const technologyTrigger = menu
      .locator('div:has(> label[for="streaming-mode"]) [role="combobox"]')
      .first();
    await expect(technologyTrigger).toBeVisible({ timeout: 3_000 });
    await technologyTrigger.click();
    await expect(
      frigateApp.page.getByRole("option", { name: /MSE/ }),
    ).toBeVisible({ timeout: 3_000 });
    await expect(
      frigateApp.page.getByRole("option", { name: /JSMpeg/ }),
    ).toHaveCount(0);
  });

  test("desktop: force low-bandwidth switch disables the technology and stream selectors", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "Desktop dropdown only");

    await frigateApp.installDefaults({
      config: {
        go2rtc: {
          streams: { front_door: ["rtsp://127.0.0.1:8554/front_door"] },
          webrtc: { candidates: [], ice_servers: [] },
        },
      },
    });

    await frigateApp.page.route("**/api/go2rtc/streams/front_door**", (route) =>
      route.fulfill({
        json: {
          producers: [{ medias: ["video, recvonly, H264"] }],
          consumers: [],
        },
      }),
    );

    await frigateApp.goto("/#front_door");

    const live = new LivePage(frigateApp.page, true);
    await expect(live.backButton).toBeVisible({ timeout: 10_000 });

    const gearButtons = frigateApp.page.locator("button:has(svg)");
    await gearButtons.last().click();

    const menu = frigateApp.page
      .locator('[role="menu"], [data-radix-menu-content]')
      .first();
    await expect(menu).toBeVisible({ timeout: 3_000 });

    // Both selectors are present and enabled to begin with (the switch is off).
    await expect(menu.locator('label[for="streaming-mode"]')).toHaveCount(1);
    const technologyTrigger = menu
      .locator('div:has(> label[for="streaming-mode"]) [role="combobox"]')
      .first();
    const streamTrigger = menu
      .locator('div:has(> label[for="streaming-method"]) [role="combobox"]')
      .first();
    await expect(technologyTrigger).toBeVisible({ timeout: 3_000 });
    await expect(technologyTrigger).toBeEnabled();
    await expect(streamTrigger).toBeVisible({ timeout: 3_000 });
    await expect(streamTrigger).toBeEnabled();

    // Enabling the switch keeps both selectors visible but disables them (the
    // low-bandwidth feed ignores the chosen stream and technology).
    const lowBandwidthSwitch = menu.getByRole("switch", {
      name: "Force low-bandwidth mode",
    });
    await expect(lowBandwidthSwitch).toBeVisible({ timeout: 3_000 });
    await lowBandwidthSwitch.click();

    await expect(menu.locator('label[for="streaming-mode"]')).toHaveCount(1);
    await expect(technologyTrigger).toBeDisabled();
    await expect(streamTrigger).toBeDisabled();

    // Toggling it back off re-enables both.
    await lowBandwidthSwitch.click();
    await expect(technologyTrigger).toBeEnabled();
    await expect(streamTrigger).toBeEnabled();
  });

  test("desktop: saving group streaming settings keeps an unavailable WebRTC choice", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "Desktop context menu only");

    await frigateApp.installDefaults({
      config: {
        go2rtc: {
          streams: { front_door: ["rtsp://127.0.0.1:8554/front_door"] },
          webrtc: { candidates: [], ice_servers: [] },
        },
      },
    });

    await frigateApp.page.route("**/api/go2rtc/streams/front_door**", (route) =>
      route.fulfill({
        json: {
          producers: [{ medias: ["video, recvonly, H264"] }],
          consumers: [],
        },
      }),
    );

    const saved = {
      streamName: "front_door",
      streamType: "smart",
      playerMode: "webrtc",
      compatibilityMode: false,
      playAudio: false,
      volume: 1,
    };

    await frigateApp.goto("/");
    await writeIdb(frigateApp.page, {
      [STREAMING_KEY]: { outdoor: { front_door: saved } },
    });
    await frigateApp.goto("/?group=outdoor");

    // With no candidates the dialog resolves WebRTC to MSE for display, but
    // saving must not persist that fallback over the user's choice.
    const live = new LivePage(frigateApp.page, true);
    const menu = await live.openContextMenuOn("front_door");
    await expect(menu).toBeVisible({ timeout: 5_000 });
    await menu.getByText("Streaming Settings").click();

    const dialog = frigateApp.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();

    await expect
      .poll(() => readIdb(frigateApp.page, STREAMING_KEY))
      .toMatchObject({ outdoor: { front_door: { playerMode: "webrtc" } } });
  });
});

test.describe("WebRTC availability gating @critical @mobile", () => {
  test("mobile: WebRTC option is disabled when no candidates or ice_servers", async ({
    frigateApp,
  }) => {
    test.skip(!frigateApp.isMobile, "Mobile drawer only");

    await frigateApp.installDefaults({
      config: {
        go2rtc: {
          streams: { front_door: ["rtsp://127.0.0.1:8554/front_door"] },
          webrtc: { candidates: [], ice_servers: [] },
        },
      },
    });

    await frigateApp.page.route("**/api/go2rtc/streams/front_door**", (route) =>
      route.fulfill({
        json: {
          producers: [{ medias: ["video, recvonly, H264"] }],
          consumers: [],
        },
      }),
    );

    await frigateApp.goto("/#front_door");

    // Open the mobile camera-settings drawer. The camera controls render a
    // second dialog-popup trigger (the FaCog settings toggle) after the global
    // header menu; wait for both to exist, then click the last one.
    const dialogTriggers = frigateApp.page.locator(
      'button[aria-haspopup="dialog"]',
    );
    await expect(dialogTriggers).toHaveCount(2, { timeout: 10_000 });
    const settingsTrigger = dialogTriggers.last();
    await settingsTrigger.scrollIntoViewIfNeeded();
    await settingsTrigger.click();

    // The drawer renders a "Streaming Technology" label above its select.
    // Anchor on that label, then open the combobox in the same field block.
    await expect(
      frigateApp.page.getByText("Streaming Technology", { exact: true }),
    ).toBeVisible({ timeout: 3_000 });
    const technologyTrigger = frigateApp.page
      .locator(
        'div:has(> div:text-is("Streaming Technology")) [role="combobox"]',
      )
      .first();
    await expect(technologyTrigger).toBeVisible({ timeout: 3_000 });
    await technologyTrigger.click();

    const webrtcOption = frigateApp.page.getByRole("option", {
      name: /WebRTC/,
    });
    await expect(webrtcOption).toBeVisible({ timeout: 3_000 });
    await expect(webrtcOption).toHaveAttribute("aria-disabled", "true");

    const mseOption = frigateApp.page.getByRole("option", { name: /MSE/ });
    await expect(mseOption).not.toHaveAttribute("aria-disabled", "true");
  });
});
