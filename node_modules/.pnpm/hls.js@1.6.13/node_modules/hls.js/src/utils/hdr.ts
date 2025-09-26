import { type VideoRange, VideoRangeValues } from '../types/level';
import type { VideoSelectionOption } from '../types/media-playlist';

/**
 * @returns Whether we can detect and validate HDR capability within the window context
 */
export function isHdrSupported() {
  if (typeof matchMedia === 'function') {
    const mediaQueryList = matchMedia('(dynamic-range: high)');
    const badQuery = matchMedia('bad query');
    if (mediaQueryList.media !== badQuery.media) {
      return mediaQueryList.matches === true;
    }
  }
  return false;
}

/**
 * Sanitizes inputs to return the active video selection options for HDR/SDR.
 * When both inputs are null:
 *
 *    `{ preferHDR: false, allowedVideoRanges: [] }`
 *
 * When `currentVideoRange` non-null, maintain the active range:
 *
 *    `{ preferHDR: currentVideoRange !== 'SDR', allowedVideoRanges: [currentVideoRange] }`
 *
 * When VideoSelectionOption non-null:
 *
 *  - Allow all video ranges if `allowedVideoRanges` unspecified.
 *  - If `preferHDR` is non-null use the value to filter `allowedVideoRanges`.
 *  - Else check window for HDR support and set `preferHDR` to the result.
 *
 * @param currentVideoRange
 * @param videoPreference
 */
export function getVideoSelectionOptions(
  currentVideoRange: VideoRange | undefined,
  videoPreference: VideoSelectionOption | undefined,
) {
  let preferHDR = false;
  let allowedVideoRanges: Array<VideoRange> = [];

  if (currentVideoRange) {
    preferHDR = currentVideoRange !== 'SDR';
    allowedVideoRanges = [currentVideoRange];
  }

  if (videoPreference) {
    allowedVideoRanges =
      videoPreference.allowedVideoRanges || VideoRangeValues.slice(0);
    const allowAutoPreferHDR =
      allowedVideoRanges.join('') !== 'SDR' && !videoPreference.videoCodec;
    preferHDR =
      videoPreference.preferHDR !== undefined
        ? videoPreference.preferHDR
        : allowAutoPreferHDR && isHdrSupported();
    if (!preferHDR) {
      allowedVideoRanges = ['SDR'];
    }
  }

  return {
    preferHDR,
    allowedVideoRanges,
  };
}
