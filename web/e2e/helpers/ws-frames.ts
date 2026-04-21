/**
 * WebSocket frame capture helper.
 *
 * The ws-mocker intercepts the /ws route, so Playwright's page-level
 * `websocket` event never fires. This helper patches client-side
 * WebSocket.prototype.send before any app code runs and mirrors every
 * sent frame into a window-level array the test can read back.
 *
 * Used by live.spec.ts (feature toggles, PTZ preset commands) and
 * config-editor.spec.ts (restart command via useRestart).
 */

import { expect, type Page } from "@playwright/test";

export type CapturedFrame = string;

declare global {
  interface Window {
    __sentWsFrames: CapturedFrame[];
  }
}

/**
 * Patch WebSocket.prototype.send to capture every outbound frame into
 * window.__sentWsFrames. Must be called BEFORE page.goto().
 */
export async function installWsFrameCapture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__sentWsFrames = [];
    const origSend = WebSocket.prototype.send;
    WebSocket.prototype.send = function (data) {
      try {
        window.__sentWsFrames.push(
          typeof data === "string" ? data : "(binary)",
        );
      } catch {
        // ignore — best-effort tracing
      }
      return origSend.call(this, data);
    };
  });
}

/** Read all captured frames at call time. */
export async function readWsFrames(page: Page): Promise<CapturedFrame[]> {
  return page.evaluate(() => window.__sentWsFrames ?? []);
}

/**
 * Poll until at least one captured frame matches the predicate.
 * Throws via expect if the frame never arrives within timeout.
 */
export async function waitForWsFrame(
  page: Page,
  matcher: (frame: CapturedFrame) => boolean,
  opts: { timeout?: number; message?: string } = {},
): Promise<void> {
  const { timeout = 2_000, message } = opts;
  await expect
    .poll(async () => (await readWsFrames(page)).some(matcher), {
      timeout,
      message,
    })
    .toBe(true);
}
