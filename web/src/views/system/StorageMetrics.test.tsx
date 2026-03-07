import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import StorageMetrics from "./StorageMetrics";
import { aggregateRecordingRoots } from "./storageMetricsUtil";

vi.mock("@/components/graph/CombinedStorageGraph", () => ({
  CombinedStorageGraph: () => <div>COMBINED_STORAGE_GRAPH</div>,
}));

vi.mock("@/components/graph/StorageGraph", () => ({
  StorageGraph: ({ used, total }: { used: number; total: number }) => (
    <div>{`STORAGE_GRAPH:${used}/${total}`}</div>
  ),
}));

vi.mock("@/components/storage/RecordingsRoots", () => ({
  RecordingsRoots: () => <div>RECORDING_ROOTS_SECTION</div>,
}));

vi.mock("@/hooks/use-date-utils", () => ({
  useTimezone: () => "utc",
  useFormattedTimestamp: () => "formatted-date",
}));

vi.mock("@/hooks/use-doc-domain", () => ({
  useDocDomain: () => ({ getLocaleDocUrl: () => "https://docs.local" }),
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === "storage.overview") return "Overview";
      if (key === "storage.recordings.roots") return "Recording Roots";
      if (key === "storage.cameraStorage.title") return "Camera Storage";
      if (key === "storage.recordings.title") return "Recordings";
      if (key === "storage.recordings.earliestRecording") {
        return "Earliest recording";
      }
      return key;
    },
  }),
}));

vi.mock("swr", () => ({
  default: (key: string | [string, Record<string, string>]) => {
    if (key === "recordings/storage") {
      return {
        data: {
          cameras: {
            front_door: { bandwidth: 1, usage: 120, usage_percent: 60 },
            back_yard: { bandwidth: 1, usage: 80, usage_percent: 40 },
          },
          recording_roots: [
            {
              path: "/media/frigate/recordings",
              total: 1000,
              used: 400,
              free: 600,
              usage_percent: 40,
              recordings_size: 200,
              cameras: ["front_door"],
              camera_usages: {},
              is_default: true,
              filesystem: "ext4 • /dev/sda1",
            },
            {
              path: "/mnt/recordings",
              total: 1000,
              used: 400,
              free: 600,
              usage_percent: 40,
              recordings_size: 0,
              cameras: ["back_yard"],
              camera_usages: {},
              is_default: false,
              filesystem: "ext4 • /dev/sda1",
            },
          ],
        },
      };
    }

    if (key === "stats") {
      return {
        data: {
          service: {
            storage: {
              "/media/frigate/recordings": { used: 500, total: 1000 },
              "/tmp/cache": { used: 5, total: 10 },
              "/dev/shm": { used: 1, total: 2, min_shm: 1 },
            },
          },
        },
      };
    }

    if (key === "config") {
      return { data: { ui: { time_format: "24hour" } } };
    }

    if (Array.isArray(key) && key[0] === "recordings/summary") {
      return { data: { "2024-01-01": true } };
    }

    return { data: undefined };
  },
}));

describe("aggregateRecordingRoots", () => {
  it("sums used/total and deduplicates by filesystem when present", () => {
    const result = aggregateRecordingRoots([
      {
        path: "/media/frigate/recordings",
        total: 1000,
        used: 500,
        free: 500,
        usage_percent: 50,
        recordings_size: 0,
        cameras: [],
        camera_usages: {},
        is_default: true,
        filesystem: "ext4 • /dev/sda1",
      },
      {
        path: "/mnt/recordings",
        total: 1000,
        used: 500,
        free: 500,
        usage_percent: 50,
        recordings_size: 0,
        cameras: [],
        camera_usages: {},
        is_default: false,
        filesystem: "ext4 • /dev/sda1",
      },
      {
        path: "/video2",
        total: 2000,
        used: 1000,
        free: 1000,
        usage_percent: 50,
        recordings_size: 0,
        cameras: [],
        camera_usages: {},
        is_default: false,
      },
    ]);

    expect(result).toEqual({ used: 1500, total: 3000 });
  });
});

describe("StorageMetrics", () => {
  it("renders sections in overview, recording roots, camera storage order and uses aggregated recordings totals", () => {
    const html = renderToStaticMarkup(
      <StorageMetrics setLastUpdated={vi.fn()} />,
    );

    expect(html.indexOf("Overview")).toBeLessThan(
      html.indexOf("Recording Roots"),
    );
    expect(html.indexOf("Recording Roots")).toBeLessThan(
      html.indexOf("Camera Storage"),
    );

    // Recordings graph should use deduped aggregate root totals (400/1000),
    // not camera usage sum (200) or default root stat values from stats.
    expect(html).toContain("STORAGE_GRAPH:400/1000");
  });
});
