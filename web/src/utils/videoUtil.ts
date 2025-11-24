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

/**
 * Calculates the video player time (in seconds) for a given timestamp
 * by iterating through recording segments and summing their durations.
 * This accounts for the fact that the video is a concatenation of segments,
 * not a single continuous stream.
 *
 * @param timestamp - The target timestamp to seek to
 * @param recordings - Array of recording segments
 * @param inpointOffset - HLS inpoint offset to subtract from the result
 * @returns The calculated seek position in seconds, or undefined if timestamp is out of range
 */
export function calculateSeekPosition(
  timestamp: number,
  recordings: Recording[],
  inpointOffset: number = 0,
): number | undefined {
  if (!recordings || recordings.length === 0) {
    return undefined;
  }

  // Check if timestamp is within the recordings range
  if (
    timestamp < recordings[0].start_time ||
    timestamp > recordings[recordings.length - 1].end_time
  ) {
    return undefined;
  }

  let seekSeconds = 0;

  (recordings || []).every((segment) => {
    // if the next segment is past the desired time, stop calculating
    if (segment.start_time > timestamp) {
      return false;
    }

    if (segment.end_time < timestamp) {
      // Add the full duration of this segment
      seekSeconds += segment.end_time - segment.start_time;
      return true;
    }

    // We're in this segment - calculate position within it
    seekSeconds +=
      segment.end_time - segment.start_time - (segment.end_time - timestamp);
    return true;
  });

  // Adjust for HLS inpoint offset
  seekSeconds -= inpointOffset;

  return seekSeconds >= 0 ? seekSeconds : undefined;
}
