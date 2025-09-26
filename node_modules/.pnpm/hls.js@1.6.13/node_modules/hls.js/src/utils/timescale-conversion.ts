const MPEG_TS_CLOCK_FREQ_HZ = 90000;

export type RationalTimestamp = {
  baseTime: number; // ticks
  timescale: number; // ticks per second
};

export type TimestampOffset = RationalTimestamp & { trackId: number };

export function toTimescaleFromBase(
  baseTime: number,
  destScale: number,
  srcBase: number = 1,
  round: boolean = false,
): number {
  const result = baseTime * destScale * srcBase; // equivalent to `(value * scale) / (1 / base)`
  return round ? Math.round(result) : result;
}

export function toTimescaleFromScale(
  baseTime: number,
  destScale: number,
  srcScale: number = 1,
  round: boolean = false,
): number {
  return toTimescaleFromBase(baseTime, destScale, 1 / srcScale, round);
}

export function toMsFromMpegTsClock(
  baseTime: number,
  round: boolean = false,
): number {
  return toTimescaleFromBase(baseTime, 1000, 1 / MPEG_TS_CLOCK_FREQ_HZ, round);
}

export function toMpegTsClockFromTimescale(
  baseTime: number,
  srcScale: number = 1,
): number {
  return toTimescaleFromBase(baseTime, MPEG_TS_CLOCK_FREQ_HZ, 1 / srcScale);
}

export function timestampToString(timestamp: TimestampOffset): string {
  const { baseTime, timescale, trackId } = timestamp;
  return `${baseTime / timescale} (${baseTime}/${timescale}) trackId: ${trackId}`;
}
