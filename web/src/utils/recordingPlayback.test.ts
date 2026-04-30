import { describe, expect, it } from "vitest";

import { Recording } from "@/types/record";

import {
  buildVariantVodPath,
  chooseRecordingPlayback,
  getRecordingsForPlaybackVariant,
  getFallbackVariantForPreference,
} from "./recordingPlayback";

const apiHost = "http://frigate.test/api";
const vodPath = "/vod/front_door/start/10/end/20/index.m3u8";

const playbackCapabilities = {
  estimatedBandwidthBps: 8_000_000,
  saveData: false,
  supports: {
    h264: true,
    hevc: true,
  },
};

function makeRecording(
  variant: "main" | "sub",
  overrides: Partial<Recording> = {},
): Recording {
  return {
    id: `${variant}-recording`,
    camera: "front_door",
    start_time: 10,
    end_time: 20,
    path: `/media/frigate/recordings/front_door/${variant}.mp4`,
    variant,
    segment_size: 4,
    duration: 10,
    motion: 100,
    objects: 5,
    dBFS: 0,
    codec_name: "h264",
    ...overrides,
  };
}

describe("recordingPlayback", () => {
  it("builds variant vod paths for sub recordings", () => {
    expect(buildVariantVodPath(vodPath, "main")).toBe(vodPath);
    expect(buildVariantVodPath(vodPath, "sub")).toBe(
      "/vod/variant/sub/front_door/start/10/end/20/index.m3u8",
    );
  });

  it("uses the sub variant URL when sub is selected manually", () => {
    const decision = chooseRecordingPlayback({
      apiHost,
      recordings: [makeRecording("main"), makeRecording("sub")],
      preference: "sub",
      vodPath,
      capabilities: playbackCapabilities,
    });

    expect(decision.variant).toBe("sub");
    expect(decision.reason).toBe("manual-sub");
    expect(decision.url).toBe(
      "http://frigate.test/api/vod/variant/sub/front_door/start/10/end/20/index.m3u8",
    );
  });

  it("ignores legacy sub_h264 recordings for sub playback", () => {
    const decision = chooseRecordingPlayback({
      apiHost,
      recordings: [
        makeRecording("main"),
        makeRecording("sub", {
          id: "sub-h264-recording",
          variant: "sub_h264",
        }),
      ],
      preference: "sub",
      vodPath,
      capabilities: playbackCapabilities,
    });

    expect(decision.variant).toBe("main");
    expect(decision.reason).toBe("raw-main");
  });

  it("ignores legacy sub_h264 rows for sub seek timelines", () => {
    const subRecordings = getRecordingsForPlaybackVariant(
      [
        makeRecording("sub", { id: "native-sub", path: "/native-sub.mp4" }),
        makeRecording("sub", {
          id: "legacy-generated-sub",
          path: "/legacy-generated-sub.mp4",
          variant: "sub_h264",
        }),
      ],
      "sub",
    );

    expect(subRecordings).toHaveLength(1);
    expect(subRecordings[0].id).toBe("native-sub");
  });

  it("still prefers playable main in auto mode", () => {
    const decision = chooseRecordingPlayback({
      apiHost,
      recordings: [makeRecording("main"), makeRecording("sub")],
      preference: "auto",
      vodPath,
      capabilities: playbackCapabilities,
    });

    expect(decision.variant).toBe("main");
    expect(decision.reason).toBe("raw-main");
  });

  it("maps fallback variants from playback preferences", () => {
    expect(getFallbackVariantForPreference("main")).toBe("main");
    expect(getFallbackVariantForPreference("auto")).toBe("main");
    expect(getFallbackVariantForPreference("sub")).toBe("sub");
  });
});
