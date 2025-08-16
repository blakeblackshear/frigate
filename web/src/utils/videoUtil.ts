import { Recording } from "@/types/record";

/** the HLS endpoint returns the vod segments with the first
 * segment of the hour trimmed, meaning it will start at
 * the beginning of the hour, cutting off any difference
 * that the segment has.
 */
export function calculateInpointOffset(
  timeRangeStart: number | undefined,
  firstRecordingSegment: Recording | undefined,
): number {
  if (!timeRangeStart || !firstRecordingSegment) {
    return 0;
  }

  // if the first recording segment does not cross over
  // the beginning of the time range then there is no offset
  if (
    firstRecordingSegment.start_time < timeRangeStart &&
    firstRecordingSegment.end_time > timeRangeStart
  ) {
    return timeRangeStart - firstRecordingSegment.start_time;
  }

  return 0;
}
