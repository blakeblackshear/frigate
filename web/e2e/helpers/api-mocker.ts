/**
 * REST API mock using Playwright's page.route().
 *
 * Intercepts all /api/* requests and returns factory-generated responses.
 * Must be installed BEFORE page.goto() to prevent auth redirects.
 */

import type { Page } from "@playwright/test";
import {
  BASE_CONFIG,
  type DeepPartial,
  configFactory,
} from "../fixtures/mock-data/config";
import { adminProfile, type UserProfile } from "../fixtures/mock-data/profile";
import { BASE_STATS, statsFactory } from "../fixtures/mock-data/stats";

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
    await this.page.route("**/api/reviews**", (route) =>
      route.fulfill({ json: overrides?.reviews ?? [] }),
    );

    // Events / search
    await this.page.route("**/api/events**", (route) =>
      route.fulfill({ json: overrides?.events ?? [] }),
    );

    // Exports
    await this.page.route("**/api/export**", (route) =>
      route.fulfill({ json: overrides?.exports ?? [] }),
    );

    // Cases
    await this.page.route("**/api/cases", (route) =>
      route.fulfill({ json: overrides?.cases ?? [] }),
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
