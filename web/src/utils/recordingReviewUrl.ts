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

  const [camera, timestamp] = value.split("|");

  if (!camera || !timestamp) {
    return undefined;
  }

  const parsedTimestamp = Number(timestamp);

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
): string {
  const url = new URL(globalThis.location.href);
  const normalizedPathname = pathname.startsWith("/")
    ? pathname
    : `/${pathname}`;
  const reviewLink = `${state.camera}|${Math.floor(state.timestamp)}`;

  return `${url.origin}${normalizedPathname}?${RECORDING_REVIEW_LINK_PARAM}=${reviewLink}`;
}
