/**
 * REST API mock using Playwright's page.route().
 *
 * Intercepts all /api/* requests and returns factory-generated responses.
 * Must be installed BEFORE page.goto() to prevent auth redirects.
 */

import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASE_CONFIG,
  type DeepPartial,
  configFactory,
} from "../fixtures/mock-data/config";
import { adminProfile, type UserProfile } from "../fixtures/mock-data/profile";
import { BASE_STATS, statsFactory } from "../fixtures/mock-data/stats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_DATA_DIR = resolve(__dirname, "../fixtures/mock-data");

function loadMockJson(filename: string): unknown {
  return JSON.parse(readFileSync(resolve(MOCK_DATA_DIR, filename), "utf-8"));
}

// 1x1 transparent PNG
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

export interface ApiMockOverrides {
  config?: DeepPartial<typeof BASE_CONFIG>;
  profile?: UserProfile;
  stats?: DeepPartial<typeof BASE_STATS>;
  reviews?: unknown[];
  events?: unknown[];
  exports?: unknown[];
  cases?: unknown[];
  faces?: Record<string, unknown>;
  configRaw?: string;
  configSchema?: Record<string, unknown>;
}

export class ApiMocker {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async install(overrides?: ApiMockOverrides) {
    const config = configFactory(overrides?.config);
    const profile = overrides?.profile ?? adminProfile();
    const stats = statsFactory(overrides?.stats);
    const reviews =
      overrides?.reviews ?? (loadMockJson("reviews.json") as unknown[]);
    const events =
      overrides?.events ?? (loadMockJson("events.json") as unknown[]);
    const exports =
      overrides?.exports ?? (loadMockJson("exports.json") as unknown[]);
    const cases = overrides?.cases ?? (loadMockJson("cases.json") as unknown[]);
    const reviewSummary = loadMockJson("review-summary.json");

    // Config endpoint
    await this.page.route("**/api/config", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: config });
      }
      return route.fulfill({ json: { success: true } });
    });

    // Profile endpoint (AuthProvider fetches /profile directly via axios,
    // which resolves to /api/profile due to axios.defaults.baseURL)
    await this.page.route("**/profile", (route) =>
      route.fulfill({ json: profile }),
    );

    // Stats endpoint
    await this.page.route("**/api/stats", (route) =>
      route.fulfill({ json: stats }),
    );

    // Reviews
    await this.page.route("**/api/reviews**", (route) => {
      const url = route.request().url();
      if (url.includes("summary")) {
        return route.fulfill({ json: reviewSummary });
      }
      return route.fulfill({ json: reviews });
    });

    // Recordings summary
    await this.page.route("**/api/recordings/summary**", (route) =>
      route.fulfill({ json: {} }),
    );

    // Previews (needed for review page event cards)
    await this.page.route("**/api/preview/**", (route) =>
      route.fulfill({ json: [] }),
    );

    // Sub-labels and attributes (for explore filters)
    await this.page.route("**/api/sub_labels", (route) =>
      route.fulfill({ json: [] }),
    );
    await this.page.route("**/api/labels", (route) =>
      route.fulfill({ json: ["person", "car"] }),
    );
    await this.page.route("**/api/*/attributes", (route) =>
      route.fulfill({ json: [] }),
    );
    await this.page.route("**/api/recognized_license_plates", (route) =>
      route.fulfill({ json: [] }),
    );

    // Events / search
    await this.page.route("**/api/events**", (route) =>
      route.fulfill({ json: events }),
    );

    // Exports
    await this.page.route("**/api/export**", (route) =>
      route.fulfill({ json: exports }),
    );

    // Cases
    await this.page.route("**/api/cases", (route) =>
      route.fulfill({ json: cases }),
    );

    // Faces
    await this.page.route("**/api/faces", (route) =>
      route.fulfill({ json: overrides?.faces ?? {} }),
    );

    // Logs
    await this.page.route("**/api/logs/**", (route) =>
      route.fulfill({
        contentType: "text/plain",
        body: "[2026-04-06 10:00:00] INFO: Frigate started\n[2026-04-06 10:00:01] INFO: Cameras loaded\n",
      }),
    );

    // Config raw
    await this.page.route("**/api/config/raw", (route) =>
      route.fulfill({
        contentType: "text/plain",
        body:
          overrides?.configRaw ??
          "mqtt:\n  host: mqtt\ncameras:\n  front_door:\n    enabled: true\n",
      }),
    );

    // Config schema
    await this.page.route("**/api/config/schema.json", (route) =>
      route.fulfill({
        json: overrides?.configSchema ?? { type: "object", properties: {} },
      }),
    );

    // Config set (mutation)
    await this.page.route("**/api/config/set", (route) =>
      route.fulfill({ json: { success: true, require_restart: false } }),
    );

    // Go2RTC streams
    await this.page.route("**/api/go2rtc/streams**", (route) =>
      route.fulfill({ json: {} }),
    );

    // Profiles
    await this.page.route("**/api/profiles**", (route) =>
      route.fulfill({
        json: { profiles: [], active_profile: null, last_activated: {} },
      }),
    );

    // Motion search
    await this.page.route("**/api/motion_search**", (route) =>
      route.fulfill({ json: { job_id: "test-job" } }),
    );

    // Region grid
    await this.page.route("**/api/*/region_grid", (route) =>
      route.fulfill({ json: {} }),
    );

    // Debug replay
    await this.page.route("**/api/debug_replay/**", (route) =>
      route.fulfill({ json: {} }),
    );

    // Generic mutation catch-all for remaining endpoints.
    // Uses route.fallback() to defer to more specific routes registered above.
    // Playwright matches routes in reverse registration order (last wins),
    // so this catch-all must use fallback() to let specific routes take precedence.
    await this.page.route("**/api/**", (route) => {
      const method = route.request().method();
      if (
        method === "POST" ||
        method === "PUT" ||
        method === "PATCH" ||
        method === "DELETE"
      ) {
        return route.fulfill({ json: { success: true } });
      }
      // Fall through to more specific routes for GET requests
      return route.fallback();
    });
  }
}

export class MediaMocker {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async install() {
    // Camera snapshots
    await this.page.route("**/api/*/latest.jpg**", (route) =>
      route.fulfill({
        contentType: "image/png",
        body: PLACEHOLDER_PNG,
      }),
    );

    // Clips and thumbnails
    await this.page.route("**/clips/**", (route) =>
      route.fulfill({
        contentType: "image/png",
        body: PLACEHOLDER_PNG,
      }),
    );

    // Event thumbnails
    await this.page.route("**/api/events/*/thumbnail.jpg**", (route) =>
      route.fulfill({
        contentType: "image/png",
        body: PLACEHOLDER_PNG,
      }),
    );

    // Event snapshots
    await this.page.route("**/api/events/*/snapshot.jpg**", (route) =>
      route.fulfill({
        contentType: "image/png",
        body: PLACEHOLDER_PNG,
      }),
    );

    // VOD / recordings
    await this.page.route("**/vod/**", (route) =>
      route.fulfill({
        contentType: "application/vnd.apple.mpegurl",
        body: "#EXTM3U\n#EXT-X-ENDLIST\n",
      }),
    );

    // Live streams
    await this.page.route("**/live/**", (route) =>
      route.fulfill({
        contentType: "application/vnd.apple.mpegurl",
        body: "#EXTM3U\n#EXT-X-ENDLIST\n",
      }),
    );
  }
}
