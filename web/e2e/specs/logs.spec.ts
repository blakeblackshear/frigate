/**
 * Logs page tests -- MEDIUM tier.
 *
 * Service tabs (with real /logs/<service> JSON contract),
 * log content render, Copy (clipboard), Download (assert
 * ?download=true request fired), mobile tab selector.
 */

import { test, expect } from "../fixtures/frigate-test";
import {
  grantClipboardPermissions,
  readClipboard,
} from "../helpers/clipboard";

function logsJsonBody(lines: string[]) {
  return { lines, totalLines: lines.length };
}

test.describe("Logs — service tabs @medium", () => {
  test("frigate tab renders by default with mocked log lines", async ({
    frigateApp,
  }) => {
    await frigateApp.page.route(/\/api\/logs\/frigate(\?|$)/, (route) =>
      route.fulfill({
        json: logsJsonBody([
          "[2026-04-06 10:00:00] INFO: Frigate started",
          "[2026-04-06 10:00:01] INFO: Cameras loaded",
        ]),
      }),
    );
    // Silence the streaming fetch so it doesn't hang the test.
    await frigateApp.page.route(
      /\/api\/logs\/frigate\?stream=true/,
      (route) => route.fulfill({ status: 200, body: "" }),
    );
    await frigateApp.goto("/logs");
    await expect(frigateApp.page.getByLabel("Select frigate")).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      frigateApp.page.getByText(/Frigate started/),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("switching to go2rtc fires a GET to /logs/go2rtc", async ({
    frigateApp,
  }) => {
    let go2rtcCalled = false;
    await frigateApp.page.route(/\/api\/logs\/frigate(\?|$)/, (route) =>
      route.fulfill({ json: logsJsonBody(["frigate line"]) }),
    );
    await frigateApp.page.route(/\/api\/logs\/go2rtc(\?|$)/, (route) => {
      if (!route.request().url().includes("stream=true")) {
        go2rtcCalled = true;
      }
      return route.fulfill({ json: logsJsonBody(["go2rtc line"]) });
    });
    await frigateApp.page.route(/\/api\/logs\/.*\?stream=true/, (route) =>
      route.fulfill({ status: 200, body: "" }),
    );

    await frigateApp.goto("/logs");
    await expect(frigateApp.page.getByLabel("Select frigate")).toBeVisible({
      timeout: 5_000,
    });
    const go2rtcTab = frigateApp.page.getByLabel("Select go2rtc");
    await expect(go2rtcTab).toBeVisible();
    await go2rtcTab.click();
    await expect.poll(() => go2rtcCalled, { timeout: 5_000 }).toBe(true);
    await expect(go2rtcTab).toHaveAttribute("data-state", "on");
  });
});

test.describe("Logs — actions @medium", () => {
  test("Copy button writes current logs to clipboard", async ({
    frigateApp,
    context,
  }) => {
    await grantClipboardPermissions(context);
    await frigateApp.page.route(/\/api\/logs\/frigate(\?|$)/, (route) =>
      route.fulfill({
        json: logsJsonBody([
          "[2026-04-06 10:00:00] INFO: Frigate started",
          "[2026-04-06 10:00:01] INFO: Cameras loaded",
        ]),
      }),
    );
    await frigateApp.page.route(
      /\/api\/logs\/frigate\?stream=true/,
      (route) => route.fulfill({ status: 200, body: "" }),
    );
    await frigateApp.goto("/logs");
    await expect(
      frigateApp.page.getByText(/Frigate started/),
    ).toBeVisible({ timeout: 10_000 });

    const copyBtn = frigateApp.page.getByLabel("Copy to Clipboard");
    await expect(copyBtn).toBeVisible({ timeout: 5_000 });
    await copyBtn.click();
    await expect
      .poll(() => readClipboard(frigateApp.page), { timeout: 5_000 })
      .toContain("Frigate started");
  });

  test("Download button fires GET /logs/<service>?download=true", async ({
    frigateApp,
  }) => {
    let downloadCalled = false;
    await frigateApp.page.route(/\/api\/logs\/frigate(\?|$)/, (route) => {
      if (route.request().url().includes("download=true")) {
        downloadCalled = true;
      }
      return route.fulfill({ json: logsJsonBody(["frigate line"]) });
    });
    await frigateApp.page.route(
      /\/api\/logs\/frigate\?stream=true/,
      (route) => route.fulfill({ status: 200, body: "" }),
    );

    await frigateApp.goto("/logs");
    const downloadBtn = frigateApp.page.getByLabel("Download Logs");
    await expect(downloadBtn).toBeVisible({ timeout: 5_000 });
    await downloadBtn.click();
    await expect.poll(() => downloadCalled, { timeout: 5_000 }).toBe(true);
  });
});

test.describe("Logs — websocket tab @medium", () => {
  test("switching to websocket tab renders WsMessageFeed container", async ({
    frigateApp,
  }) => {
    await frigateApp.page.route(/\/api\/logs\/frigate(\?|$)/, (route) =>
      route.fulfill({ json: logsJsonBody(["frigate line"]) }),
    );
    await frigateApp.page.route(
      /\/api\/logs\/frigate\?stream=true/,
      (route) => route.fulfill({ status: 200, body: "" }),
    );
    await frigateApp.goto("/logs");
    const wsTab = frigateApp.page.getByLabel("Select websocket");
    await expect(wsTab).toBeVisible({ timeout: 5_000 });
    await wsTab.click();
    await expect(wsTab).toHaveAttribute("data-state", "on", { timeout: 5_000 });
  });
});

test.describe("Logs — streaming @medium", () => {
  test("streamed log lines appear in the viewport", async ({ frigateApp }) => {
    await frigateApp.page.route(/\/api\/logs\/frigate(\?|$)/, (route) => {
      if (route.request().url().includes("stream=true")) {
        // Intercepted below via addInitScript fetch override.
        return route.fallback();
      }
      return route.fulfill({
        json: logsJsonBody([
          "[2026-04-06 10:00:00] INFO: initial batch line",
        ]),
      });
    });

    // Override window.fetch so the /api/logs/frigate?stream=true request
    // resolves with a real ReadableStream that emits chunks over time.
    // This is the only way to validate streaming-append behavior through
    // Playwright — route.fulfill() cannot return a stream.
    // NOTE: The app calls fetch('api/logs/...') with a relative URL (no
    // leading slash), so we match both relative and absolute forms.
    await frigateApp.page.addInitScript(() => {
      const origFetch = window.fetch;
      window.fetch = async (input, init) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : (input as Request).url;
        if (url.includes("api/logs/frigate") && url.includes("stream=true")) {
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              await new Promise((r) => setTimeout(r, 30));
              controller.enqueue(
                encoder.encode("[2026-04-06 10:00:02] INFO: streamed line one\n"),
              );
              await new Promise((r) => setTimeout(r, 30));
              controller.enqueue(
                encoder.encode("[2026-04-06 10:00:03] INFO: streamed line two\n"),
              );
              controller.close();
            },
          });
          return new Response(stream, { status: 200 });
        }
        return origFetch.call(window, input as RequestInfo, init);
      };
    });

    await frigateApp.goto("/logs");
    // The initial batch line is parsed by LogLineData and its content is
    // rendered in a .log-content cell — assert against that element.
    await expect(
      frigateApp.page.getByText("initial batch line"),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      frigateApp.page.getByText(/streamed line one/),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      frigateApp.page.getByText(/streamed line two/),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Logs — mobile @medium @mobile", () => {
  test.skip(
    ({ frigateApp }) => !frigateApp.isMobile,
    "Mobile-only",
  );

  test("service tabs render at mobile viewport", async ({ frigateApp }) => {
    await frigateApp.page.route(/\/api\/logs\/frigate(\?|$)/, (route) =>
      route.fulfill({ json: logsJsonBody(["frigate line"]) }),
    );
    await frigateApp.page.route(
      /\/api\/logs\/frigate\?stream=true/,
      (route) => route.fulfill({ status: 200, body: "" }),
    );
    await frigateApp.goto("/logs");
    await expect(
      frigateApp.page.getByLabel("Select frigate"),
    ).toBeVisible({ timeout: 5_000 });
  });
});
