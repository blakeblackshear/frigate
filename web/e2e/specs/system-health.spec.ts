/**
 * Health tab tests -- MEDIUM tier.
 *
 * Default tab, notice list rendering, dismiss, empty state, update notice.
 */

import { test, expect } from "../fixtures/frigate-test";

const NOW = Math.floor(Date.now() / 1000);

// the fixture detector runs at 75.5 ms, above the live warning threshold
const QUIET_STATS = { detectors: { cpu: { inference_speed: 10 } } };

const STATE_NOTICE = {
  id: "ffmpeg_crash_loop:front_door",
  kind: "ffmpeg_crash_loop",
  mode: "state",
  severity: "error",
  category: "camera",
  scope: "front_door",
  params: { restarts: 6 },
  first_seen: NOW - 600,
  last_seen: NOW,
  count: 1,
  dismissed_at: null,
};

const EVENT_NOTICE = {
  id: "detector_stuck",
  kind: "detector_stuck",
  mode: "event",
  severity: "warning",
  category: "detector",
  scope: null,
  params: { detector: "ov" },
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
      notices: [STATE_NOTICE, EVENT_NOTICE],
      noticeStats: [
        {
          kind: "ffmpeg_crash_loop",
          occurrences: 14,
          dismissals: 0,
          first_seen: NOW - 86400 * 20,
          last_seen: NOW,
        },
      ],
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
    await expect(rows.nth(0)).toContainText("ffmpeg has crashed 6 times");
    await expect(rows.nth(0)).toContainText("14 times since");
    await expect(
      rows.nth(0).getByRole("button", { name: "Dismiss" }),
    ).toHaveCount(0);
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
    await frigateApp.page.getByRole("button", { name: "Dismiss" }).click();
    await request;

    await expect(
      frigateApp.page.locator("[data-testid^='health-problem-']"),
    ).toHaveCount(0, { timeout: 5_000 });
    await expect(frigateApp.page.getByText("No notices")).toBeVisible();
  });

  test("empty state with no notices", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ stats: QUIET_STATS });
    await frigateApp.goto("/system#health");

    await expect(frigateApp.page.getByText("No notices")).toBeVisible({
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
          id: "update_available",
          kind: "update_available",
          mode: "state",
          severity: "info",
          category: "system",
          scope: null,
          params: { version: "0.19.0" },
          first_seen: NOW - 3600,
          last_seen: NOW,
          count: 1,
          dismissed_at: null,
        },
      ],
    });
    await frigateApp.goto("/system#health");

    const row = frigateApp.page.getByTestId(
      "health-problem-notice:update_available",
    );
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toHaveAttribute("data-severity", "info");
    await expect(row).toContainText("Frigate 0.19.0 is available");
    await expect(row.getByRole("link", { name: "Open link" })).toHaveAttribute(
      "href",
      "https://github.com/blakeblackshear/frigate/releases/tag/v0.19.0",
    );
    await expect(row.getByRole("button", { name: "Dismiss" })).toHaveCount(0);
  });
});

test.describe("System — Health tab mobile @medium @mobile", () => {
  test.skip(({ frigateApp }) => !frigateApp.isMobile, "Mobile-only");

  test("notices render at mobile viewport", async ({ frigateApp }) => {
    await frigateApp.installDefaults({
      stats: QUIET_STATS,
      notices: [STATE_NOTICE],
    });
    await frigateApp.goto("/system#health");

    await expect(
      frigateApp.page.getByTestId(
        "health-problem-notice:ffmpeg_crash_loop:front_door",
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

  test("face recognition row reflects the runtime device", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      config: { face_recognition: { enabled: true } },
      stats: {
        ...QUIET_STATS,
        embeddings: { devices: { face_recognition: "CPU" } },
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
  test("live offline camera and config checks render with links", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      config: {
        cameras: {
          garage: { detect: { width: 2560, height: 1440, fps: 10 } },
        },
      },
      stats: { ...QUIET_STATS, cameras: { front_door: { camera_fps: 0 } } },
    });
    await frigateApp.goto("/system#health");

    const rows = frigateApp.page.locator("[data-testid^='health-problem-']");
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
    await expect(rows.filter({ hasText: "Front Door is offline" })).toHaveCount(
      1,
    );
    await expect(
      frigateApp.page.getByText(
        "This detect resolution is higher than recommended",
      ),
    ).toBeVisible();
    await expect(
      rows
        .filter({ hasText: "Front Door is offline" })
        .getByRole("link", { name: "Open settings" }),
    ).toHaveAttribute("href", "/logs");
    const fpsRow = frigateApp.page.getByTestId(
      "health-problem-config:detect:fps-greater-than-five:garage",
    );
    await expect(fpsRow).toHaveAttribute("data-severity", "info");
    await expect(
      fpsRow.getByRole("link", { name: "Open settings" }),
    ).toHaveAttribute("href", "/settings?page=cameraDetect&camera=garage");
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
        "health-problem-config:detect:detect-resolution-high:garage",
      ),
    ).toBeVisible();
  });

  test("registry rows sort ahead of live rows and keep Dismiss", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      notices: [
        {
          id: "detector_stuck:cpu",
          kind: "detector_stuck",
          mode: "event",
          severity: "warning",
          category: "detector",
          scope: "cpu",
          params: { detector: "cpu" },
          first_seen: NOW - 60,
          last_seen: NOW - 60,
          count: 1,
          dismissed_at: null,
        },
      ],
      // the default fixture's slow cpu detector is the live warning here
    });
    await frigateApp.goto("/system#health");

    const rows = frigateApp.page.locator("[data-severity='warning']");
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
    await expect(rows.nth(0)).toContainText("Detector cpu was restarted");
    await expect(
      rows.nth(0).getByRole("button", { name: "Dismiss" }),
    ).toBeVisible();
    await expect(rows.nth(1)).toContainText("Cpu is slow");
  });

  test("empty state when stats, config, and registry are clean", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ stats: QUIET_STATS });
    await frigateApp.goto("/system#health");

    await expect(frigateApp.page.getByText("No notices")).toBeVisible({
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
});
