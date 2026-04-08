/**
 * FrigateStats factory for E2E tests.
 */

import type { DeepPartial } from "./config";

function cameraStats(_name: string) {
  return {
    audio_dBFPS: 0,
    audio_rms: 0,
    camera_fps: 5.0,
    capture_pid: 100,
    detection_enabled: 1,
    detection_fps: 5.0,
    ffmpeg_pid: 101,
    pid: 102,
    process_fps: 5.0,
    skipped_fps: 0,
    connection_quality: "excellent" as const,
    expected_fps: 5,
    reconnects_last_hour: 0,
    stalls_last_hour: 0,
  };
}

export const BASE_STATS = {
  cameras: {
    front_door: cameraStats("front_door"),
    backyard: cameraStats("backyard"),
    garage: cameraStats("garage"),
  },
  cpu_usages: {
    "1": { cmdline: "frigate.app", cpu: "5.0", cpu_average: "4.5", mem: "2.1" },
  },
  detectors: {
    cpu: {
      detection_start: 0,
      inference_speed: 75.5,
      pid: 200,
    },
  },
  gpu_usages: {},
  npu_usages: {},
  processes: {},
  service: {
    last_updated: Date.now() / 1000,
    storage: {
      "/media/frigate/recordings": {
        free: 50000000000,
        total: 100000000000,
        used: 50000000000,
        mount_type: "ext4",
      },
      "/tmp/cache": {
        free: 500000000,
        total: 1000000000,
        used: 500000000,
        mount_type: "tmpfs",
      },
    },
    uptime: 86400,
    latest_version: "0.15.0",
    version: "0.15.0-test",
  },
  camera_fps: 15.0,
  process_fps: 15.0,
  skipped_fps: 0,
  detection_fps: 15.0,
};

export function statsFactory(
  overrides?: DeepPartial<typeof BASE_STATS>,
): typeof BASE_STATS {
  if (!overrides) return BASE_STATS;
  return { ...BASE_STATS, ...overrides } as typeof BASE_STATS;
}
