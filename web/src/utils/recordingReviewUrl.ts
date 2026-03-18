export const RECORDING_REVIEW_START_PARAM = "start_time";

export type RecordingReviewLinkState = {
  camera: string;
  timestamp: number;
};

export function parseRecordingReviewLink(
  camera: string | null,
  start: string | null,
): RecordingReviewLinkState | undefined {
  if (!camera || !start) {
    return undefined;
  }

  const parsedTimestamp = Number(start);

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
  const url = new URL(window.location.href);
  url.pathname = pathname;
  url.hash = state.camera;
  url.search = "";
  url.searchParams.set(
    RECORDING_REVIEW_START_PARAM,
    `${Math.floor(state.timestamp)}`,
  );

  return url.toString();
}
