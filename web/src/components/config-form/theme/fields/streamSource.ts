export type StreamSourceMode = "restream" | "manual";

// The literal go2rtc restream prefix matches what the camera wizard inlines
// when it builds a restreamed input path. Only this exact host:port is treated
// as a restream so manually typed URLs (including localhost) stay manual.
export const RESTREAM_PREFIX = "rtsp://127.0.0.1:8554/";
export const RESTREAM_PRESET = "preset-rtsp-restream";

/** Build the restream input path for a given go2rtc stream name. */
export function buildRestreamPath(streamName: string): string {
  return `${RESTREAM_PREFIX}${streamName}`;
}

/**
 * Extract the go2rtc stream name from a restream input path.
 *
 * Returns the stream name when the path is a well-formed restream URL with no
 * extra path segments or query, otherwise undefined.
 */
export function parseRestreamStreamName(
  path: string | undefined,
): string | undefined {
  if (typeof path !== "string" || !path.startsWith(RESTREAM_PREFIX)) {
    return undefined;
  }

  const name = path.slice(RESTREAM_PREFIX.length);
  if (name.length === 0 || /[/?#]/.test(name)) {
    return undefined;
  }

  return name;
}
