/**
 * Health tab tests -- MEDIUM tier.
 *
 * Default tab, notice list rendering, dismiss, empty state, update notice.
 */

import { test, expect } from "../fixtures/frigate-test";
import { viewerProfile } from "../fixtures/mock-data/profile";

const NOW = Math.floor(Date.now() / 1000);

// the fixture detector runs at 75.5 ms, above the live warning threshold
const QUIET_STATS = { detectors: { cpu: { inference_speed: 10 } } };

const ERROR_NOTICE = {
  id: "model_download_failed:yolo/model.onnx",
  kind: "model_download_failed",
  severity: "error",
  category: "model",
  scope: "yolo/model.onnx",
  params: { file: "model.onnx", model: "yolo", error: "timeout" },
  link: null,
  first_seen: NOW - 600,
  last_seen: NOW,
  count: 2,
  dismissed_at: null,
};

const EVENT_NOTICE = {
  id: "detector_stuck",
  kind: "detector_stuck",
  severity: "warning",
  category: "detector",
  scope: null,
  params: { detector: "ov" },
  link: "/system#general",
  first_seen: NOW - 7200,
  last_seen: NOW - 60,
  count: 3,
  dismissed_at: null,
};

test.describe("System — Health tab @medium", () => {
  test("Health is the default tab and lists notices by severity", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      stats: QUIET_STATS,
      notices: [ERROR_NOTICE, EVENT_NOTICE],
    });
    await frigateApp.goto("/system");

    await expect(frigateApp.page.getByLabel("Select health")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 15_000 },
    );

    const rows = frigateApp.page.locator("[data-testid^='health-problem-']");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toHaveAttribute("data-severity", "error");
    await expect(rows.nth(0)).toContainText(
      "Downloading model.onnx for yolo failed: timeout",
    );
    await expect(rows.nth(0)).toContainText("2 times");
    await expect(
      rows.nth(0).getByRole("button", { name: "Dismiss" }),
    ).toBeVisible();
    await expect(rows.nth(1)).toContainText("Detector ov was restarted");
    await expect(rows.nth(1)).toContainText("3 times");
    await expect(
      rows.nth(1).getByRole("button", { name: "Dismiss" }),
    ).toBeVisible();
  });

  test("dismiss posts and removes the row", async ({ frigateApp }) => {
    await frigateApp.installDefaults({
      stats: QUIET_STATS,
      notices: [EVENT_NOTICE],
    });

    // the list shrinks after the dismiss so the refetch shows the row gone
    let dismissed = false;
    await frigateApp.page.route("**/api/notices", (route) =>
      route.fulfill({ json: dismissed ? [] : [EVENT_NOTICE] }),
    );
    await frigateApp.page.route(
      "**/api/notices/detector_stuck/dismiss",
      (route) => {
        dismissed = true;
        return route.fulfill({ json: { success: true } });
      },
    );

    await frigateApp.goto("/system#health");
    const request = frigateApp.page.waitForRequest(
      (req) =>
        req.url().includes("/api/notices/detector_stuck/dismiss") &&
        req.method() === "POST",
    );
    await frigateApp.page
      .getByTestId("health-problem-notice:detector_stuck")
      .getByRole("button", { name: "Dismiss" })
      .click();
    await request;

    await expect(
      frigateApp.page.locator("[data-testid^='health-problem-']"),
    ).toHaveCount(0, { timeout: 5_000 });
    await expect(
      frigateApp.page.getByText("Your Frigate installation is healthy"),
    ).toBeVisible();
  });

  test("empty state with no notices", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ stats: QUIET_STATS });
    await frigateApp.goto("/system#health");

    await expect(
      frigateApp.page.getByText("Your Frigate installation is healthy"),
    ).toBeVisible({
      timeout: 15_000,
    });
  });

  test("update notice renders as info with a release link", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      stats: QUIET_STATS,
      notices: [
        {
          id: "update_available:0.19.0",
          kind: "update_available",
          severity: "info",
          category: "system",
          scope: "0.19.0",
          params: { version: "0.19.0" },
          link: "https://github.com/blakeblackshear/frigate/releases/tag/v0.19.0",
          first_seen: NOW - 3600,
          last_seen: NOW,
          count: 1,
          dismissed_at: null,
        },
      ],
    });
    await frigateApp.goto("/system#health");

    const row = frigateApp.page.getByTestId(
      "health-problem-notice:update_available:0.19.0",
    );
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toHaveAttribute("data-severity", "info");
    await expect(row).toContainText("Frigate 0.19.0 is available");
    await expect(row.getByRole("link", { name: "Open link" })).toHaveAttribute(
      "href",
      "https://github.com/blakeblackshear/frigate/releases/tag/v0.19.0",
    );
    await expect(row.getByRole("button", { name: "Dismiss" })).toBeVisible();
  });

  test("the filter shows dismissed notices without a Dismiss button", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      stats: QUIET_STATS,
      notices: [EVENT_NOTICE],
    });
    await frigateApp.page.route(
      (url) =>
        url.pathname.endsWith("/api/notices") &&
        url.searchParams.get("include_dismissed") === "true",
      (route) =>
        route.fulfill({
          json: [EVENT_NOTICE, { ...ERROR_NOTICE, dismissed_at: NOW - 120 }],
        }),
    );
    await frigateApp.goto("/system#health");

    await frigateApp.page.getByRole("button", { name: "Filter" }).click();
    const showDismissed = frigateApp.page.getByRole("switch", {
      name: "Show dismissed",
    });
    await expect(showDismissed).toHaveAttribute("aria-checked", "false");
    await showDismissed.click();

    const row = frigateApp.page.getByTestId(
      "health-problem-notice:model_download_failed:yolo/model.onnx",
    );
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toContainText("Dismissed");
    await expect(row.getByRole("button", { name: "Dismiss" })).toHaveCount(0);

    await showDismissed.click();
    await expect(row).toHaveCount(0);
  });

  test("clear dismissed deletes the dismissed rows after confirming", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      stats: QUIET_STATS,
      notices: [EVENT_NOTICE],
    });

    // the history loses its dismissed row once the DELETE lands
    let cleared = false;
    await frigateApp.page.route(
      (url) =>
        url.pathname.endsWith("/api/notices") &&
        url.searchParams.get("include_dismissed") === "true",
      (route) =>
        route.fulfill({
          json: cleared
            ? [EVENT_NOTICE]
            : [EVENT_NOTICE, { ...ERROR_NOTICE, dismissed_at: NOW - 120 }],
        }),
    );
    await frigateApp.page.route("**/api/notices/dismissed", (route) => {
      cleared = true;
      return route.fulfill({ json: { success: true } });
    });
    await frigateApp.goto("/system#health");

    await frigateApp.page.getByRole("button", { name: "Filter" }).click();
    await frigateApp.page
      .getByRole("switch", { name: "Show dismissed" })
      .click();
    const row = frigateApp.page.getByTestId(
      "health-problem-notice:model_download_failed:yolo/model.onnx",
    );
    await expect(row).toBeVisible({ timeout: 15_000 });
    await frigateApp.page.keyboard.press("Escape");

    await frigateApp.page
      .getByRole("button", { name: "Clear dismissed" })
      .click();
    const request = frigateApp.page.waitForRequest(
      (req) =>
        req.url().endsWith("/api/notices/dismissed") &&
        req.method() === "DELETE",
    );
    await frigateApp.page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Clear dismissed" })
      .click();
    await request;

    await expect(row).toHaveCount(0);
    await expect(
      frigateApp.page.getByText("No dismissed notices"),
    ).toBeVisible();
  });

  test("severity switches hide notices of that severity", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      stats: QUIET_STATS,
      notices: [ERROR_NOTICE, EVENT_NOTICE],
    });
    await frigateApp.goto("/system#health");

    const rows = frigateApp.page.locator("[data-testid^='health-problem-']");
    await expect(rows).toHaveCount(2, { timeout: 15_000 });

    await frigateApp.page.getByRole("button", { name: "Filter" }).click();
    await frigateApp.page.getByRole("switch", { name: "Warning" }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toHaveAttribute("data-severity", "error");

    await frigateApp.page.getByRole("switch", { name: "Error" }).click();
    await expect(rows).toHaveCount(0);
    await expect(
      frigateApp.page.getByText("No notices match the filter"),
    ).toBeVisible();
  });

  test("failed login bursts are per user and show their attempt count", async ({
    frigateApp,
  }) => {
    const burst = (user: string, start: number, count: number) => ({
      id: `failed_login:${user}:${start}`,
      kind: "failed_login",
      severity: "warning",
      category: "system",
      scope: `${user}:${start}`,
      params: { user },
      link: "/logs",
      first_seen: start,
      last_seen: start + 60,
      count,
      dismissed_at: null,
    });
    await frigateApp.installDefaults({
      stats: QUIET_STATS,
      notices: [burst("admin", NOW - 60, 7), burst("ghost", NOW - 3600, 1)],
    });
    await frigateApp.goto("/system#health");

    const attack = frigateApp.page.getByTestId(
      `health-problem-notice:failed_login:admin:${NOW - 60}`,
    );
    await expect(attack).toBeVisible({ timeout: 15_000 });
    await expect(attack).toContainText("Failed login attempts for admin");
    await expect(attack).toContainText("7 times");
    await expect(attack).not.toContainText(String(NOW - 60));
    await expect(
      attack.getByRole("link", { name: "Open settings" }),
    ).toHaveAttribute("href", "/logs");
    await expect(
      frigateApp.page.getByTestId(
        `health-problem-notice:failed_login:ghost:${NOW - 3600}`,
      ),
    ).toContainText("Failed login attempt for ghost");
  });

  test("skipped detections notice links to camera stats", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      stats: QUIET_STATS,
      notices: [
        {
          id: "skipped_detections:front_door",
          kind: "skipped_detections",
          severity: "warning",
          category: "camera",
          scope: "front_door",
          params: { pct: 12.5 },
          link: "/system#cameras",
          first_seen: NOW - 600,
          last_seen: NOW - 600,
          count: 1,
          dismissed_at: null,
        },
      ],
    });
    await frigateApp.goto("/system#health");

    const row = frigateApp.page.getByTestId(
      "health-problem-notice:skipped_detections:front_door",
    );
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toContainText("skipped 12.5% of frames");
    await expect(
      row.getByRole("link", { name: "Open settings" }),
    ).toHaveAttribute("href", "/system#cameras");
  });

  test("shm notice links to storage metrics", async ({ frigateApp }) => {
    await frigateApp.installDefaults({
      stats: QUIET_STATS,
      notices: [
        {
          id: "shm_too_low",
          kind: "shm_too_low",
          severity: "warning",
          category: "system",
          scope: null,
          params: { total: 64, min: 180 },
          link: "/system#storage",
          first_seen: NOW - 600,
          last_seen: NOW - 600,
          count: 1,
          dismissed_at: null,
        },
      ],
    });
    await frigateApp.goto("/system#health");

    const row = frigateApp.page.getByTestId(
      "health-problem-notice:shm_too_low",
    );
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toContainText(
      "/dev/shm allocation (64 MB) should be increased to at least 180 MB",
    );
    await expect(
      row.getByRole("link", { name: "Open settings" }),
    ).toHaveAttribute("href", "/system#storage");
  });
});

test.describe("System — Health tab mobile @medium @mobile", () => {
  test.skip(({ frigateApp }) => !frigateApp.isMobile, "Mobile-only");

  test("notices render at mobile viewport", async ({ frigateApp }) => {
    await frigateApp.installDefaults({
      stats: QUIET_STATS,
      notices: [ERROR_NOTICE],
    });
    await frigateApp.goto("/system#health");

    await expect(
      frigateApp.page.getByTestId(
        "health-problem-notice:model_download_failed:yolo/model.onnx",
      ),
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("System — Health hardware pane @medium", () => {
  test("detection row is ok with matching probe and fast inference", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      config: { models: [{ scene: "all", devices: ["openvino:GPU"] }] },
      stats: {
        ...QUIET_STATS,
        detectors: { "openvino:GPU": { inference_speed: 12.3 } },
      },
    });
    await frigateApp.goto("/system#health");

    const row = frigateApp.page.getByTestId("hardware-row-detection:0");
    await expect(row).toHaveAttribute("data-state", "ok", { timeout: 15_000 });
    await expect(row).toContainText("12.3 ms");
  });

  test("detection row errors when the device is not probed", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      config: { models: [{ scene: "all", devices: ["hailo8l"] }] },
      stats: QUIET_STATS,
    });
    await frigateApp.goto("/system#health");

    const row = frigateApp.page.getByTestId("hardware-row-detection:0");
    await expect(row).toHaveAttribute("data-state", "error", {
      timeout: 15_000,
    });
    await expect(row).toContainText("hailo8l was not found on this system");
  });

  test("a generic device the probe cannot enumerate is judged by its runtime", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      config: { models: [{ scene: "all", devices: ["openvino:AUTO"] }] },
      stats: {
        ...QUIET_STATS,
        detectors: { "openvino:AUTO": { inference_speed: 12 } },
      },
    });
    await frigateApp.goto("/system#health");

    const row = frigateApp.page.getByTestId("hardware-row-detection:0");
    await expect(row).toHaveAttribute("data-state", "ok", {
      timeout: 15_000,
    });
    await expect(row).toContainText("12 ms");
  });

  test("a bare onnx detector with no probed accelerator is not an error", async ({
    frigateApp,
  }) => {
    // the default image runs onnx on the CPU and the probe reports nothing
    await frigateApp.installDefaults({
      config: { models: [{ scene: "all", devices: ["onnx"] }] },
      stats: { ...QUIET_STATS, detectors: { onnx: { inference_speed: 40 } } },
    });
    await frigateApp.goto("/system#health");

    const row = frigateApp.page.getByTestId("hardware-row-detection:0");
    await expect(row).toHaveAttribute("data-state", "ok", {
      timeout: 15_000,
    });
  });

  test("detection row warns on slow inference", async ({ frigateApp }) => {
    await frigateApp.installDefaults({
      config: { models: [{ scene: "all", devices: ["openvino:GPU"] }] },
      stats: {
        ...QUIET_STATS,
        detectors: { "openvino:GPU": { inference_speed: 60 } },
      },
    });
    await frigateApp.goto("/system#health");

    const row = frigateApp.page.getByTestId("hardware-row-detection:0");
    await expect(row).toHaveAttribute("data-state", "warning", {
      timeout: 15_000,
    });
    await expect(row).toContainText("Inference is slow (60 ms)");
  });

  test("hwaccel row states", async ({ frigateApp }) => {
    await frigateApp.installDefaults({
      config: {
        cameras: {
          front_door: { ffmpeg: { hwaccel_args: "preset-vaapi" } },
          backyard: { ffmpeg: { hwaccel_args: "preset-nvidia" } },
          garage: { ffmpeg: { hwaccel_args: "" } },
        },
      },
      hwaccel: {
        recommended: "vaapi",
        available: [{ key: "vaapi", presets: { any: "preset-vaapi" } }],
      },
      stats: QUIET_STATS,
    });
    await frigateApp.goto("/system#health");

    await expect(
      frigateApp.page.getByTestId("hardware-row-hwaccel:preset-vaapi"),
    ).toHaveAttribute("data-state", "ok", { timeout: 15_000 });
    await expect(
      frigateApp.page.getByTestId("hardware-row-hwaccel:preset-nvidia"),
    ).toHaveAttribute("data-state", "warning");
    await expect(
      frigateApp.page.getByTestId("hardware-row-hwaccel:preset-nvidia"),
    ).toContainText("the hardware probe did not report it");
    await expect(
      frigateApp.page.getByTestId("hardware-row-hwaccel:"),
    ).toHaveAttribute("data-state", "warning");
  });

  test("slow face recognition on the CPU warns when an accelerator exists", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      config: { face_recognition: { enabled: true } },
      stats: {
        ...QUIET_STATS,
        embeddings: {
          face_recognition_speed: 800,
          devices: { face_recognition: "CPU" },
        },
      },
    });
    await frigateApp.goto("/system#health");

    const row = frigateApp.page.getByTestId(
      "hardware-row-enrichment:face_recognition",
    );
    await expect(row).toHaveAttribute("data-state", "warning", {
      timeout: 15_000,
    });
    await expect(row).toContainText(
      "Running on the CPU although an accelerator is available",
    );
  });

  test("fast face recognition on the CPU is ok", async ({ frigateApp }) => {
    await frigateApp.installDefaults({
      config: { face_recognition: { enabled: true } },
      stats: {
        ...QUIET_STATS,
        embeddings: {
          face_recognition_speed: 40,
          devices: { face_recognition: "CPU" },
        },
      },
    });
    await frigateApp.goto("/system#health");

    const row = frigateApp.page.getByTestId(
      "hardware-row-enrichment:face_recognition",
    );
    await expect(row).toHaveAttribute("data-state", "ok", { timeout: 15_000 });
    await expect(row).toContainText("CPU");
    await expect(row).not.toContainText("although an accelerator");
  });

  test("explicit GPU that loaded on CUDA is ok despite the probe", async ({
    frigateApp,
  }) => {
    // the fixture probes an Intel GPU only; ONNX Runtime still puts a GPU
    // request on CUDA when that image has it
    await frigateApp.installDefaults({
      config: { face_recognition: { enabled: true, device: "GPU" } },
      stats: {
        ...QUIET_STATS,
        embeddings: { devices: { face_recognition: "CUDA" } },
      },
    });
    await frigateApp.goto("/system#health");

    const row = frigateApp.page.getByTestId(
      "hardware-row-enrichment:face_recognition",
    );
    await expect(row).toHaveAttribute("data-state", "ok", { timeout: 15_000 });
    await expect(row).toContainText("CUDA");
  });

  test("explicit GPU falling back to CPU is an error", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      config: { face_recognition: { enabled: true, device: "GPU" } },
      stats: {
        ...QUIET_STATS,
        embeddings: { devices: { face_recognition: "CPU" } },
      },
    });
    await frigateApp.goto("/system#health");

    const row = frigateApp.page.getByTestId(
      "hardware-row-enrichment:face_recognition",
    );
    await expect(row).toHaveAttribute("data-state", "error", {
      timeout: 15_000,
    });
  });

  test("enrichment without a runtime device is unknown", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      config: { face_recognition: { enabled: true } },
      stats: QUIET_STATS,
    });
    await frigateApp.goto("/system#health");

    const row = frigateApp.page.getByTestId(
      "hardware-row-enrichment:face_recognition",
    );
    await expect(row).toHaveAttribute("data-state", "unknown", {
      timeout: 15_000,
    });
  });

  test("all-excellent camera connections show a green check", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ stats: QUIET_STATS });
    await frigateApp.goto("/system#health");

    const line = frigateApp.page.getByText(
      "All cameras have an excellent connection.",
    );
    await expect(line).toBeVisible({ timeout: 15_000 });
    await expect(line.locator("svg")).toHaveClass(/text-success/);
  });

  test("camera connections lists only non-excellent cameras", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      stats: {
        ...QUIET_STATS,
        cameras: {
          backyard: { connection_quality: "poor", camera_fps: 2.1 },
        },
      },
    });
    await frigateApp.goto("/system#health");

    await expect(
      frigateApp.page.getByTestId("camera-connection-backyard"),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      frigateApp.page.getByTestId("camera-connection-front_door"),
    ).toHaveCount(0);
  });
});

test.describe("System — Health notices sources @medium", () => {
  test("config checks render with links", async ({ frigateApp }) => {
    await frigateApp.installDefaults({
      config: {
        cameras: {
          garage: { detect: { width: 2560, height: 1440, fps: 10 } },
        },
      },
      stats: QUIET_STATS,
    });
    await frigateApp.goto("/system#health");

    await expect(
      frigateApp.page.getByText(
        "This detect resolution is higher than recommended",
      ),
    ).toBeVisible({ timeout: 15_000 });
    const fpsRow = frigateApp.page.getByTestId(
      "health-problem-config:detect:fps-greater-than-five:camera.garage",
    );
    await expect(fpsRow).toHaveAttribute("data-severity", "info");
    await expect(
      fpsRow.getByRole("link", { name: "Open settings" }),
    ).toHaveAttribute("href", "/settings?page=cameraDetect&camera=garage");
  });

  test("status bar problems stay out of the list", async ({ frigateApp }) => {
    test.skip(frigateApp.isMobile, "Status bar is desktop-only");
    await frigateApp.installDefaults({
      stats: {
        service: { retention_unmet: true },
        cameras: { front_door: { camera_fps: 0 } },
      },
    });
    await frigateApp.goto("/system#health");

    // the status bar shows a problem, so stats have loaded
    await expect(
      frigateApp.page.getByText("Front Door is offline"),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      frigateApp.page.locator("[data-testid^='health-problem-']"),
    ).toHaveCount(0);
    await expect(
      frigateApp.page.getByText("Your Frigate installation is healthy"),
    ).toBeVisible();
  });

  // the fixture's cameras all have a record role with recording off, so
  // dropping the role isolates the gate on record.enabled
  const NO_RECORD_ROLE = {
    ffmpeg: { inputs: [{ path: "rtsp://x", roles: ["detect"] }] },
  };

  test("record role warning is hidden while recording is off", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      config: {
        cameras: {
          front_door: { ...NO_RECORD_ROLE, record: { enabled: false } },
        },
      },
      stats: QUIET_STATS,
    });
    await frigateApp.goto("/system#health");
    await expect(frigateApp.page.getByLabel("Select health")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 15_000 },
    );
    await expect(
      frigateApp.page.getByText("No streams have the record role defined"),
    ).toHaveCount(0);
  });

  test("record role warning shows once recording is on", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      config: {
        cameras: {
          front_door: { ...NO_RECORD_ROLE, record: { enabled: true } },
        },
      },
      stats: QUIET_STATS,
    });
    await frigateApp.goto("/system#health");
    await expect(
      frigateApp.page.getByText("No streams have the record role defined"),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("a global config problem is not repeated per camera", async ({
    frigateApp,
  }) => {
    // every fixture camera inherits the global size, with resolved defaults
    // the global block leaves null, so only text equality can dedupe them
    const size = { width: 2560, height: 1440 };
    await frigateApp.installDefaults({
      config: {
        detect: size,
        cameras: {
          front_door: { detect: size },
          backyard: { detect: size },
          garage: { detect: size },
        },
      },
      stats: QUIET_STATS,
    });
    await frigateApp.goto("/system#health");

    const rows = frigateApp.page.locator(
      "[data-testid^='health-problem-config:detect:detect-resolution-high']",
    );
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toHaveAttribute(
      "data-testid",
      "health-problem-config:detect:detect-resolution-high:global",
    );
  });

  test("a camera that overrides the global value keeps its own row", async ({
    frigateApp,
  }) => {
    // two cameras inherit the global size and are folded into the global
    // row; the one that overrides it keeps a row with its own link
    const size = { width: 2560, height: 1440 };
    await frigateApp.installDefaults({
      config: {
        detect: size,
        cameras: {
          front_door: { detect: size },
          backyard: { detect: size },
          garage: { detect: { width: 3840, height: 2160 } },
        },
      },
      stats: QUIET_STATS,
    });
    await frigateApp.goto("/system#health");

    const rows = frigateApp.page.locator(
      "[data-testid^='health-problem-config:detect:detect-resolution-high']",
    );
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
    await expect(rows).toHaveCount(2);
    await expect(
      frigateApp.page.getByTestId(
        "health-problem-config:detect:detect-resolution-high:camera.garage",
      ),
    ).toBeVisible();
  });

  test("empty state when stats, config, and registry are clean", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ stats: QUIET_STATS });
    await frigateApp.goto("/system#health");

    await expect(
      frigateApp.page.getByText("Your Frigate installation is healthy"),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      frigateApp.page.locator("[data-testid^='health-problem-']"),
    ).toHaveCount(0);
  });

  test("stream checks probe every camera and flag non-AAC audio", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      // the default record preset transcodes to AAC, so the codec only
      // matters for a camera that copies audio through
      config: {
        cameras: {
          backyard: {
            ffmpeg: {
              output_args: { record: "preset-record-generic-audio-copy" },
            },
          },
        },
      },
      ffprobe: {
        backyard: [
          {
            return_code: 0,
            stderr: "",
            stdout: {
              streams: [
                {
                  codec_type: "video",
                  codec_name: "h264",
                  width: 1920,
                  height: 1080,
                },
                { codec_type: "audio", codec_name: "pcm_mulaw" },
              ],
            },
          },
        ],
        garage: [
          {
            return_code: 1,
            // the backend sends every line; the tab shows the last one
            stderr: [
              "[tcp @ 0x1] Connection to tcp://10.0.0.3:554 failed",
              "Connection refused",
            ],
            stdout: "",
          },
        ],
      },
      stats: QUIET_STATS,
    });
    await frigateApp.goto("/system#health");

    const requests: string[] = [];
    frigateApp.page.on("request", (req) => {
      if (req.url().includes("/api/ffprobe")) {
        requests.push(req.url());
      }
    });

    await frigateApp.page
      .getByRole("button", { name: "Run stream checks" })
      .click();

    await expect(
      frigateApp.page.getByText("Stream 1: The AAC audio codec is required"),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      frigateApp.page.getByText(
        "Stream 1 could not be probed: Connection refused",
      ),
    ).toBeVisible();
    const streams = frigateApp.page.getByTestId("camera-streams");
    await expect(streams).toContainText("3 cameras checked");
    await expect(streams).toContainText("2 with problems");
    await expect(frigateApp.page.getByText(/^Checked/)).toBeVisible();
    await expect(
      frigateApp.page.getByRole("button", { name: "Run again" }),
    ).toBeVisible();
    // axios leaves ":" unescaped in query strings
    expect(requests.filter((u) => u.includes("paths=camera:")).length).toBe(3);
  });

  test("non-AAC audio is fine when recordings transcode to AAC", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      ffprobe: {
        backyard: [
          {
            return_code: 0,
            stderr: "",
            stdout: {
              streams: [
                {
                  codec_type: "video",
                  codec_name: "h264",
                  width: 1920,
                  height: 1080,
                },
                { codec_type: "audio", codec_name: "pcm_mulaw" },
              ],
            },
          },
        ],
      },
      stats: QUIET_STATS,
    });
    await frigateApp.goto("/system#health");

    await frigateApp.page
      .getByRole("button", { name: "Run stream checks" })
      .click();

    await expect(frigateApp.page.getByText(/^Checked/)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      frigateApp.page.getByText("The AAC audio codec is required"),
    ).toHaveCount(0);
  });

  test("wizard-only Reolink advice stays off the tab", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      config: {
        cameras: {
          front_door: {
            ffmpeg: {
              inputs: [
                {
                  path: "rtsp://10.0.0.1:554/h264Preview_01_main",
                  roles: ["detect", "record"],
                },
              ],
            },
          },
        },
      },
      stats: QUIET_STATS,
    });
    await frigateApp.goto("/system#health");

    await frigateApp.page
      .getByRole("button", { name: "Run stream checks" })
      .click();

    await expect(frigateApp.page.getByText(/^Checked/)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      frigateApp.page.getByText("Reolink RTSP is not recommended"),
    ).toHaveCount(0);
  });

  test("re-check re-probes the hardware and dates the probe", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ stats: QUIET_STATS });
    await frigateApp.goto("/system#health");

    const probes: string[] = [];
    frigateApp.page.on("request", (req) => {
      if (req.url().includes("refresh=true")) {
        probes.push(req.url());
      }
    });

    const recheck = frigateApp.page.getByRole("button", {
      name: "Re-check hardware",
    });
    await expect(recheck).toBeVisible({ timeout: 15_000 });
    await expect(frigateApp.page.getByText(/^Probed/)).toHaveCount(0);
    await recheck.click();
    await expect(frigateApp.page.getByText(/^Probed/)).toBeVisible();
    await expect(recheck).toBeEnabled();
    expect(probes.length).toBe(1);
  });

  test("a camera notice link opens that camera's settings page", async ({
    frigateApp,
  }) => {
    // garage is not the camera Settings would pick on its own, so a wrong
    // selection here is visible rather than accidentally right
    await frigateApp.installDefaults({
      config: {
        lpr: { enabled: false },
        cameras: { garage: { lpr: { enabled: true } } },
      },
      stats: QUIET_STATS,
    });
    await frigateApp.goto("/system#health");

    const row = frigateApp.page.getByTestId(
      "health-problem-config:lpr:global-disabled:camera.garage",
    );
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(
      row.getByRole("link", { name: "Open settings" }),
    ).toHaveAttribute("href", "/settings?page=cameraLpr&camera=garage");

    await row.getByRole("link", { name: "Open settings" }).click();

    await expect(frigateApp.page.getByLabel("Select a camera")).toContainText(
      "Garage",
      { timeout: 15_000 },
    );
  });

  test("status bar healthy text links to the Health tab", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "Status bar is desktop-only");
    await frigateApp.installDefaults({ stats: QUIET_STATS });
    await frigateApp.goto("/");

    await frigateApp.page
      .getByRole("link", { name: "System is healthy" })
      .click();
    await expect(frigateApp.page).toHaveURL(/\/system#health/);
  });

  test("status bar counts undismissed notices next to the health text", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "Status bar is desktop-only");
    await frigateApp.installDefaults({
      stats: QUIET_STATS,
      notices: [EVENT_NOTICE],
    });
    await frigateApp.goto("/");

    const notices = frigateApp.page.getByRole("link", {
      name: "1 system notice",
    });
    await expect(notices).toBeVisible({ timeout: 15_000 });
    await expect(notices).toHaveAttribute("href", "/system#health");
    await expect(
      frigateApp.page.getByRole("link", { name: "System is healthy" }),
    ).toBeVisible();
  });

  test("status bar shows viewers no problems or health text", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "Status bar is desktop-only");
    await frigateApp.installDefaults({
      profile: viewerProfile(),
      stats: {
        cpu_usages: { "frigate.full_system": { cpu: "12.0" } },
        cameras: { front_door: { camera_fps: 0 } },
      },
    });
    await frigateApp.goto("/");

    // the CPU reading comes from the same stats as the offline problem
    await expect(frigateApp.page.getByText("CPU 12%")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      frigateApp.page.getByText("Front Door is offline"),
    ).toHaveCount(0);
    await expect(frigateApp.page.getByText("System is healthy")).toHaveCount(0);
  });

  test("a config row can be dismissed", async ({ frigateApp }) => {
    const id = "config:detect:fps-greater-than-five:camera.garage";
    await frigateApp.installDefaults({
      config: {
        cameras: {
          garage: { detect: { width: 2560, height: 1440, fps: 10 } },
        },
      },
      stats: QUIET_STATS,
    });

    // the list gains the dismissal after the POST so the refetch hides the row
    let dismissed = false;
    await frigateApp.page.route(`**/api/notices/${id}/dismiss`, (route) => {
      dismissed = true;
      return route.fulfill({ json: { success: true } });
    });
    await frigateApp.page.route("**/api/notices/dismissed_checks", (route) =>
      route.fulfill({ json: dismissed ? [{ id, dismissed_at: NOW }] : [] }),
    );
    await frigateApp.goto("/system#health");

    const row = frigateApp.page.getByTestId(`health-problem-${id}`);
    await expect(row).toBeVisible({ timeout: 15_000 });
    const request = frigateApp.page.waitForRequest(
      (req) =>
        req.url().includes(`/api/notices/${id}/dismiss`) &&
        req.method() === "POST",
    );
    await row.getByRole("button", { name: "Dismiss" }).click();
    await request;
    await expect(row).toHaveCount(0);
  });

  test("dismissed config rows move to the dismissed list", async ({
    frigateApp,
  }) => {
    const id = "config:detect:fps-greater-than-five:camera.garage";
    await frigateApp.installDefaults({
      config: {
        cameras: {
          garage: { detect: { width: 2560, height: 1440, fps: 10 } },
        },
      },
      stats: QUIET_STATS,
      dismissedChecks: [{ id, dismissed_at: NOW - 120 }],
    });
    await frigateApp.page.route(
      (url) =>
        url.pathname.endsWith("/api/notices") &&
        url.searchParams.get("include_dismissed") === "true",
      (route) => route.fulfill({ json: [] }),
    );
    await frigateApp.goto("/system#health");

    await expect(
      frigateApp.page.getByText(
        "This detect resolution is higher than recommended",
      ),
    ).toBeVisible({ timeout: 15_000 });
    const row = frigateApp.page.getByTestId(`health-problem-${id}`);
    await expect(row).toHaveCount(0);

    await frigateApp.page.getByRole("button", { name: "Filter" }).click();
    await frigateApp.page
      .getByRole("switch", { name: "Show dismissed" })
      .click();

    await expect(row).toBeVisible();
    await expect(row).toContainText("Dismissed");
    await expect(row.getByRole("button", { name: "Dismiss" })).toHaveCount(0);
  });
});
