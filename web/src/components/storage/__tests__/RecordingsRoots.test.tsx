import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { RecordingsRoots, type RecordingRootStorage } from "../RecordingsRoots";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string | number>) => {
      if (key === "storage.recordings.rootSummary") {
        return `Disk used: ${opts?.used} MiB • Free: ${opts?.free} MiB • Usage: ${opts?.usage_percent}%`;
      }
      if (key === "storage.recordings.recordingsTracked") {
        return `Frigate recordings tracked: ${opts?.recordings_size} MiB`;
      }
      if (key === "storage.recordings.rootCameras") {
        return `Cameras: ${opts?.cameras}`;
      }
      if (key === "none") return "None";
      return key;
    },
  }),
}));

describe("RecordingsRoots", () => {
  it("renders multiple roots, filesystem details, and per-camera usage", () => {
    const roots: RecordingRootStorage[] = [
      {
        path: "/media/frigate/recordings",
        total: 1000,
        used: 700,
        free: 300,
        usage_percent: 70,
        recordings_size: 600,
        cameras: ["front_door"],
        is_default: true,
        filesystem: "ext4 • /media/frigate",
        camera_usages: {
          front_door: { bandwidth: 5, usage: 600, usage_percent: 100 },
        },
      },
      {
        path: "/mnt/custom-recordings",
        total: 2000,
        used: 1400,
        free: 600,
        usage_percent: 70,
        recordings_size: 800,
        cameras: ["back_yard", "garage"],
        is_default: false,
        filesystem: "xfs • /mnt",
        camera_usages: {
          back_yard: { bandwidth: 4, usage: 300, usage_percent: 37.5 },
          garage: { bandwidth: 6, usage: 500, usage_percent: 62.5 },
        },
      },
    ];

    const html = renderToStaticMarkup(<RecordingsRoots roots={roots} />);

    expect(html).toContain("/media/frigate/recordings");
    expect(html).toContain("/mnt/custom-recordings");
    expect(html).toContain("ext4 • /media/frigate");
    expect(html).toContain("xfs • /mnt");
    expect(html).not.toContain("Non-default root");
    expect(html).toContain("Disk used: 700 MiB • Free: 300 MiB • Usage: 70.00%");
    expect(html).toContain("Frigate recordings tracked: 600 MiB");
    expect(html).toContain("Cameras: back yard, garage");
    expect(html).toContain("garage");
  });
});
