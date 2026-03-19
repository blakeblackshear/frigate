import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const RECORDING_REVIEW_START_PARAM = "start_time";
export const RECORDING_REVIEW_TIMEZONE_PARAM = "timezone";

export type RecordingReviewLinkState = {
  camera: string;
  timestamp: number;
};

function formatRecordingReviewTimestamp(
  timestamp: number,
  timezone: string | undefined,
): string {
  const date = new Date(Math.floor(timestamp) * 1000);

  if (timezone) {
    // when the UI timezone is configured, keep the URL readable by storing
    // local time plus a separate timezone query param
    return formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm:ss");
  }

  // without a configured UI timezone, fall back to UTC timestamp
  return formatInTimeZone(date, "UTC", "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

export function parseRecordingReviewLink(
  camera: string | null,
  start: string | null,
  timezone: string | null,
): RecordingReviewLinkState | undefined {
  if (!camera || !start) {
    return undefined;
  }

  const parsedDate = timezone
    ? fromZonedTime(start, timezone)
    : new Date(start);
  const parsedTimestamp = parsedDate.getTime() / 1000;

  if (!Number.isFinite(parsedTimestamp)) {
    return undefined;
  }

  return {
    camera,
    timestamp: Math.floor(parsedTimestamp),
  };
}

export function createRecordingReviewUrl(
  pathname: string,
  state: RecordingReviewLinkState,
  timezone?: string,
): string {
  const url = new URL(globalThis.location.href);
  const formattedTimestamp = formatRecordingReviewTimestamp(
    state.timestamp,
    timezone,
  );
  const normalizedPathname = pathname.startsWith("/")
    ? pathname
    : `/${pathname}`;
  const timezoneParam = timezone
    ? `&${RECORDING_REVIEW_TIMEZONE_PARAM}=${encodeURIComponent(timezone)}`
    : "";

  return `${url.origin}${normalizedPathname}?${RECORDING_REVIEW_START_PARAM}=${formattedTimestamp}${timezoneParam}#${encodeURIComponent(state.camera)}`;
}
