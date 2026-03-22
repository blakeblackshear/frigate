/**
 * Browser HEVC/H.265 codec support detection.
 */

let hevcResult: boolean | null = null;

/**
 * Detect whether the browser supports HEVC/H.265 playback
 * via Media Source Extensions or native video element.
 * Result is cached after the first call.
 */
export function isHevcSupported(): boolean {
  if (localStorage.getItem("forceTranscode") === "true") return false;
  if (hevcResult !== null) return hevcResult;

  const codecs = [
    'video/mp4; codecs="hvc1.1.6.L153.B0"',
    'video/mp4; codecs="hev1.1.6.L153.B0"',
  ];

  if (typeof MediaSource !== "undefined") {
    for (const codec of codecs) {
      if (MediaSource.isTypeSupported(codec)) {
        hevcResult = true;
        return true;
      }
    }
  }

  const video = document.createElement("video");
  for (const codec of codecs) {
    if (video.canPlayType(codec) === "probably") {
      hevcResult = true;
      return true;
    }
  }

  hevcResult = false;
  return false;
}
