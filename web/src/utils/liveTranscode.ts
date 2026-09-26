import type { FrigateConfig, LiveTranscodeConfig } from "@/types/frigateConfig";

// Mirrors frigate/util/live_streams.py and apply_live_transcode_streams.

export const TRANSCODE_HEIGHTS = [1080, 720, 480, 360, 240];

const DEFAULT_BITRATES: Record<number, number> = {
  1080: 2500,
  720: 1200,
  480: 500,
  360: 250,
  240: 150,
};

export function defaultTranscodeBitrate(height: number): number {
  return DEFAULT_BITRATES[height] ?? 500;
}

export function transcodeStreamName(camera: string, height: number): string {
  return `${camera}_transcode_${height}p`;
}

export function isTranscodeStreamName(camera: string, name: string): boolean {
  const prefix = `${camera}_transcode_`;
  return name.startsWith(prefix) && /^\d+p$/.test(name.slice(prefix.length));
}

/** A generated stream's configured bitrate, or undefined for other streams. */
export function transcodeBitrateFor(
  camera: string,
  name: string,
  transcode: LiveTranscodeConfig | undefined,
): number | undefined {
  if (!transcode?.enabled) {
    return undefined;
  }

  return transcode.qualities.find(
    (quality) => transcodeStreamName(camera, quality.height) === name,
  )?.bitrate;
}

/**
 * Drop transcoded entries that are no longer generated and append generated
 * streams that are missing. Placed entries keep their position and label.
 */
export function reconcileTranscodeStreams(
  camera: string,
  streams: Record<string, string>,
  transcode: LiveTranscodeConfig,
  go2rtcStreams: string[],
): Record<string, string> {
  const generated = transcode.enabled
    ? transcode.qualities.map((quality) => ({
        label: `${quality.height}p`,
        name: transcodeStreamName(camera, quality.height),
      }))
    : [];
  const generatedNames = new Set(generated.map(({ name }) => name));

  const kept = Object.entries(streams).filter(
    ([, name]) =>
      generatedNames.has(name) ||
      go2rtcStreams.includes(name) ||
      !isTranscodeStreamName(camera, name),
  );
  const placed = new Set(kept.map(([, name]) => name));
  const labels = new Set(kept.map(([label]) => label));

  generated.forEach(({ label, name }) => {
    // a taken label is left for the backend to reject on save
    if (!placed.has(name) && !labels.has(label)) {
      kept.push([label, name]);
    }
  });

  return Object.fromEntries(kept);
}

/**
 * Whether go2rtc serves a live stream. config.go2rtc.streams lists only the
 * yaml streams, so transcoded streams of enabled cameras count too.
 */
export function isRestreamedStream(
  config: FrigateConfig | undefined,
  name: string | undefined,
): boolean {
  if (!config || !name) {
    return false;
  }

  if (Object.keys(config.go2rtc.streams || {}).includes(name)) {
    return true;
  }

  return Object.values(config.cameras).some(
    (camera) =>
      camera.live.transcode?.enabled &&
      isTranscodeStreamName(camera.name, name),
  );
}
