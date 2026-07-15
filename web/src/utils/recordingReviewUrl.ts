import { baseUrl } from "@/api/baseUrl.ts";

export const RECORDING_REVIEW_LINK_PARAM = "timestamp";

export type RecordingReviewLinkState = {
  camera: string;
  timestamp: number;
};

export function parseRecordingReviewLink(
  value: string | null,
): RecordingReviewLinkState | undefined {
  if (!value) {
    return undefined;
  }

  const separatorIndex = value.lastIndexOf("_");

  if (separatorIndex <= 0 || separatorIndex == value.length - 1) {
    return undefined;
  }

  const camera = value.slice(0, separatorIndex);
  const timestamp = value.slice(separatorIndex + 1);

  if (!camera || !timestamp) {
    return undefined;
  }

  const parsedTimestamp = Number(timestamp);
  const now = Math.floor(Date.now() / 1000);

  if (!Number.isFinite(parsedTimestamp) || parsedTimestamp <= 0) {
    return undefined;
  }

  return {
    camera,
    // clamp future timestamps to now
    timestamp: Math.min(Math.floor(parsedTimestamp), now),
  };
}

export function createRecordingReviewUrl(
  pathname: string,
  state: RecordingReviewLinkState,
): string {
  const url = new URL(baseUrl);
  url.pathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  url.searchParams.set(
    RECORDING_REVIEW_LINK_PARAM,
    `${state.camera}_${Math.floor(state.timestamp)}`,
  );

  return url.toString();
}
