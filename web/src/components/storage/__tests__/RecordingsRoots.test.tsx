import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { RecordingsRoots, type RecordingRootStorage } from "../RecordingsRoots";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      if (key === "storage.recordings.nonDefault") return "Non-default root";
      if (key === "storage.recordings.rootSummary") {
        return `Disk used: ${opts?.used} MiB • Free: ${opts?.free} MiB • Usage: ${opts?.usage_percent}%`;
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
  it("renders multiple roots and per-camera usage", () => {
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
        camera_usages: {
          back_yard: { bandwidth: 4, usage: 300, usage_percent: 37.5 },
          garage: { bandwidth: 6, usage: 500, usage_percent: 62.5 },
        },
      },
    ];

    const html = renderToStaticMarkup(<RecordingsRoots roots={roots} />);

    expect(html).toContain("/media/frigate/recordings");
    expect(html).toContain("/mnt/custom-recordings");
    expect(html).toContain("Non-default root");
    expect(html).toContain("Cameras: back yard, garage");
    expect(html).toContain("garage");
  });
});
