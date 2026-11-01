/**
 * Auto live stream selection in the single-camera view.
 *
 * go2rtc is mocked per stream. A failing stream answers MSE codec
 * negotiation with go2rtc's "codecs not matched" error, the one ladder
 * trigger Chromium reproduces without real media. A healthy stream
 * answers negotiation and then sends nothing, so it waits quietly.
 */
import type { Locator, Page } from "@playwright/test";
import { test, expect } from "../fixtures/frigate-test";
import { LivePage } from "../pages/live.page";

// the mocked profile is admin, so useUserPersistence keys are namespaced
const STREAM_KEY = "front_door-stream:admin";
const CODEC_ERROR = "mse: streams: codecs not matched: H265 => H264";

const CONFIG = {
  go2rtc: {
    streams: {
      front_door: ["rtsp://127.0.0.1:8554/front_door"],
      front_door_sub: ["rtsp://127.0.0.1:8554/front_door_sub"],
      backyard: ["rtsp://127.0.0.1:8554/backyard"],
    },
    webrtc: { candidates: [], ice_servers: [] },
  },
  cameras: {
    front_door: {
      live: { streams: { Sub: "front_door_sub" } },
    },
  },
};

test.use({ expectedErrors: [/MSE error 'mse-codec'/] });

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

// records the src of every MSE socket in open order
async function mockGo2rtc(page: Page, failing: string[] = []) {
  const opened: string[] = [];

  await page.routeWebSocket("**/live/mse/api/ws**", (ws) => {
    const src = new URL(ws.url()).searchParams.get("src") ?? "";
    opened.push(src);

    ws.onMessage((message) => {
      const msg = JSON.parse(message.toString());
      if (msg.type !== "mse") {
        return;
      }

      ws.send(
        JSON.stringify(
          failing.includes(src)
            ? { type: "error", value: CODEC_ERROR }
            : { type: "mse", value: 'video/mp4; codecs="avc1.640029"' },
        ),
      );
    });
  });

  await page.route("**/api/go2rtc/streams/**", (route) =>
    route.fulfill({
      json: {
        producers: [{ medias: ["video, recvonly, H264"] }],
        consumers: [],
      },
    }),
  );

  return opened;
}

async function openDesktopSettings(page: Page) {
  const live = new LivePage(page, true);
  await expect(live.backButton).toBeVisible({ timeout: 10_000 });
  await page.locator("button:has(svg)").last().click();
  const menu = page.locator('[role="menu"], [data-radix-menu-content]').first();
  await expect(menu).toBeVisible({ timeout: 3_000 });
  return menu;
}

function streamTrigger(menu: Locator) {
  return menu
    .locator('div:has(> label[for="streaming-method"]) [role="combobox"]')
    .first();
}

test.describe("Auto live stream @mobile", () => {
  test("a codec error on the main stream moves Auto to the sub stream", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ config: CONFIG });
    const opened = await mockGo2rtc(frigateApp.page, ["front_door"]);

    await frigateApp.goto("/#front_door");

    await expect
      .poll(() => opened, { timeout: 10_000 })
      .toContain("front_door_sub");
    expect(opened[0]).toBe("front_door");
  });
});

test.describe("Transcoded live stream @mobile", () => {
  test("a pinned transcoded stream plays over MSE", async ({ frigateApp }) => {
    // go2rtc.streams lists only yaml streams; transcoded ones are generated
    await frigateApp.installDefaults({
      config: {
        ...CONFIG,
        cameras: {
          front_door: {
            live: {
              streams: {
                Sub: "front_door_sub",
                "720p": "front_door_transcode_720p",
              },
              transcode: {
                enabled: true,
                source: "front_door",
                qualities: [{ height: 720, bitrate: 1200 }],
              },
            },
          },
        },
      },
    });
    const opened = await mockGo2rtc(frigateApp.page);

    await frigateApp.goto("/");
    await writeIdb(frigateApp.page, {
      [STREAM_KEY]: "front_door_transcode_720p",
    });
    await frigateApp.goto("/#front_door");

    await expect
      .poll(() => opened, { timeout: 10_000 })
      .toContain("front_door_transcode_720p");
  });
});

test.describe("Auto live stream selector", () => {
  test.beforeEach(({ frigateApp }) => {
    test.skip(frigateApp.isMobile, "Desktop dropdown only");
  });

  test("no saved stream opens Auto on the first stream", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ config: CONFIG });
    const opened = await mockGo2rtc(frigateApp.page);

    await frigateApp.goto("/#front_door");

    await expect.poll(() => opened[0], { timeout: 10_000 }).toBe("front_door");
    const menu = await openDesktopSettings(frigateApp.page);
    await expect(streamTrigger(menu)).toHaveText("Auto · front_door");
  });

  test("a codec error shows the codec reason", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ config: CONFIG });
    const opened = await mockGo2rtc(frigateApp.page, ["front_door"]);

    await frigateApp.goto("/#front_door");

    await expect
      .poll(() => opened, { timeout: 10_000 })
      .toContain("front_door_sub");
    const menu = await openDesktopSettings(frigateApp.page);
    await expect(streamTrigger(menu)).toHaveText("Auto · Sub");
    await expect(
      menu.getByText(/because this browser can't play a higher-quality stream/),
    ).toBeVisible();
  });

  test("trying the highest quality retries the top stream", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ config: CONFIG });
    const opened = await mockGo2rtc(frigateApp.page, ["front_door"]);

    await frigateApp.goto("/#front_door");

    await expect
      .poll(() => opened, { timeout: 10_000 })
      .toContain("front_door_sub");
    const menu = await openDesktopSettings(frigateApp.page);
    const beforeRetry = opened.length;
    await menu.getByRole("button", { name: "Try highest quality" }).click();

    await expect
      .poll(() => opened.slice(beforeRetry), { timeout: 10_000 })
      .toContain("front_door");
  });

  test("a pinned main takes the legacy fallback instead of stepping down", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ config: CONFIG });
    const opened = await mockGo2rtc(frigateApp.page, ["front_door"]);

    await frigateApp.goto("/");
    await writeIdb(frigateApp.page, { [STREAM_KEY]: "front_door" });
    await frigateApp.goto("/#front_door");

    const menu = await openDesktopSettings(frigateApp.page);
    await expect(
      menu.getByText(/Live view is in low-bandwidth mode/),
    ).toBeVisible({ timeout: 10_000 });
    expect(opened).not.toContain("front_door_sub");
  });

  test("selecting Auto clears the saved stream", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ config: CONFIG });
    await mockGo2rtc(frigateApp.page);

    await frigateApp.goto("/");
    await writeIdb(frigateApp.page, { [STREAM_KEY]: "front_door_sub" });
    await frigateApp.goto("/#front_door");

    const menu = await openDesktopSettings(frigateApp.page);
    await expect(streamTrigger(menu)).toHaveText("Sub");
    await streamTrigger(menu).click();
    await frigateApp.page.getByRole("option", { name: /^Auto/ }).click();

    await expect.poll(() => readIdb(frigateApp.page, STREAM_KEY)).toBeNull();
  });

  test("a stale pin falls back to Auto", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ config: CONFIG });
    const opened = await mockGo2rtc(frigateApp.page);

    await frigateApp.goto("/");
    await writeIdb(frigateApp.page, { [STREAM_KEY]: "removed_stream" });
    await frigateApp.goto("/#front_door");

    await expect.poll(() => readIdb(frigateApp.page, STREAM_KEY)).toBeNull();
    await expect.poll(() => opened[0], { timeout: 10_000 }).toBe("front_door");
  });

  test("a single-stream camera offers no Auto", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ config: CONFIG });
    await mockGo2rtc(frigateApp.page);

    await frigateApp.goto("/#backyard");

    const menu = await openDesktopSettings(frigateApp.page);
    await streamTrigger(menu).click();
    await expect(
      frigateApp.page.getByRole("option", { name: "backyard" }),
    ).toBeVisible();
    await expect(
      frigateApp.page.getByRole("option", { name: /^Auto/ }),
    ).toHaveCount(0);
  });

  test("Reset stream at the floor returns to the top stream", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ config: CONFIG });
    const opened = await mockGo2rtc(frigateApp.page, [
      "front_door",
      "front_door_sub",
    ]);

    await frigateApp.goto("/#front_door");

    await expect
      .poll(() => opened, { timeout: 10_000 })
      .toContain("front_door_sub");
    expect(opened[0]).toBe("front_door");

    const menu = await openDesktopSettings(frigateApp.page);
    await expect(streamTrigger(menu)).toHaveText("Auto · Low bandwidth");
    await expect(
      menu.getByText(/Playing the low-bandwidth feed/),
    ).toBeVisible();

    const beforeReset = opened.length;
    await menu.getByRole("button", { name: "Reset stream" }).click();

    // leaving the floor changes the stream and the mode in one render,
    // which must still open each stream exactly once
    await expect
      .poll(() => opened.slice(beforeReset), { timeout: 10_000 })
      .toEqual(["front_door", "front_door_sub"]);
  });
});
