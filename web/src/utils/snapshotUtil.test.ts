import { describe, expect, it, vi } from "vitest";
import {
  downloadSnapshot,
  generateSnapshotFilename,
} from "@/utils/snapshotUtil";

describe("generateSnapshotFilename", () => {
  it("uses the provided playback timestamp in the filename", () => {
    expect(generateSnapshotFilename("driveway", 1712592245, "UTC")).toBe(
      "driveway_snapshot_2024-04-08T16-04-05.jpg",
    );
  });

  it("uses the provided timezone so filename matches timeline-local time", () => {
    expect(
      generateSnapshotFilename("driveway", 1712592245, "America/Los_Angeles"),
    ).toBe("driveway_snapshot_2024-04-08T09-04-05.jpg");
  });

  it("falls back to current time when no playback timestamp is provided", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-08-09T10:11:12Z"));

    expect(generateSnapshotFilename("front_yard", undefined, "UTC")).toBe(
      "front_yard_snapshot_2024-08-09T10-11-12.jpg",
    );

    vi.useRealTimers();
  });
});

describe("downloadSnapshot", () => {
  it("creates and clicks a temporary anchor for download", () => {
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const removeSpy = vi.spyOn(document.body, "removeChild");
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    downloadSnapshot("data:image/jpeg;base64,abc123", "snapshot.jpg");

    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);

    const link = appendSpy.mock.calls[0]?.[0] as HTMLAnchorElement;
    expect(link.download).toBe("snapshot.jpg");
    expect(link.href).toContain("data:image/jpeg;base64,abc123");
  });
});
