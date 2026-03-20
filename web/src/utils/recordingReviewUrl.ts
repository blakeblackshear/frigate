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

  if (!Number.isFinite(parsedTimestamp) || parsedTimestamp <= 0) {
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
  const reviewLink = `${state.camera}_${Math.floor(state.timestamp)}`;

  return `${url.origin}${normalizedPathname}?${RECORDING_REVIEW_LINK_PARAM}=${reviewLink}`;
}
