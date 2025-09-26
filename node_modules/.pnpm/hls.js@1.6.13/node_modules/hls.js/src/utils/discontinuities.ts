import { adjustSliding } from './level-helper';
import { logger } from './logger';
import type { Fragment } from '../loader/fragment';
import type { LevelDetails } from '../loader/level-details';

export function findFirstFragWithCC(
  fragments: Fragment[],
  cc: number,
): Fragment | null {
  for (let i = 0, len = fragments.length; i < len; i++) {
    if (fragments[i]?.cc === cc) {
      return fragments[i];
    }
  }
  return null;
}

export function shouldAlignOnDiscontinuities(
  refDetails: LevelDetails | undefined,
  details: LevelDetails,
): refDetails is LevelDetails & boolean {
  if (refDetails) {
    if (
      details.startCC < refDetails.endCC &&
      details.endCC > refDetails.startCC
    ) {
      return true;
    }
  }
  return false;
}

function adjustFragmentStart(frag: Fragment, sliding: number) {
  const start = frag.start + sliding;
  frag.startPTS = start;
  frag.setStart(start);
  frag.endPTS = start + frag.duration;
}

export function adjustSlidingStart(sliding: number, details: LevelDetails) {
  // Update segments
  const fragments = details.fragments;
  for (let i = 0, len = fragments.length; i < len; i++) {
    adjustFragmentStart(fragments[i], sliding);
  }
  // Update LL-HLS parts at the end of the playlist
  if (details.fragmentHint) {
    adjustFragmentStart(details.fragmentHint, sliding);
  }
  details.alignedSliding = true;
}

/**
 * Using the parameters of the last level, this function computes PTS' of the new fragments so that they form a
 * contiguous stream with the last fragments.
 * The PTS of a fragment lets Hls.js know where it fits into a stream - by knowing every PTS, we know which fragment to
 * download at any given time. PTS is normally computed when the fragment is demuxed, so taking this step saves us time
 * and an extra download.
 * @param lastLevel
 * @param details
 */
export function alignStream(
  switchDetails: LevelDetails | undefined,
  details: LevelDetails,
) {
  if (!switchDetails) {
    return;
  }
  alignDiscontinuities(details, switchDetails);
  if (!details.alignedSliding) {
    // If the PTS wasn't figured out via discontinuity sequence that means there was no CC increase within the level.
    // Aligning via Program Date Time should therefore be reliable, since PDT should be the same within the same
    // discontinuity sequence.
    alignMediaPlaylistByPDT(details, switchDetails);
  }
  if (!details.alignedSliding && !details.skippedSegments) {
    // Try to align on sn so that we pick a better start fragment.
    // Do not perform this on playlists with delta updates as this is only to align levels on switch
    // and adjustSliding only adjusts fragments after skippedSegments.
    adjustSliding(switchDetails, details, false);
  }
}

/**
 * Ajust the start of fragments in `details` by the difference in time between fragments of the latest
 * shared discontinuity sequence change.
 * @param lastLevel - The details of the last loaded level
 * @param details - The details of the new level
 */
export function alignDiscontinuities(
  details: LevelDetails,
  refDetails: LevelDetails | undefined,
) {
  if (!shouldAlignOnDiscontinuities(refDetails, details)) {
    return;
  }
  const targetCC = Math.min(refDetails.endCC, details.endCC);
  const refFrag = findFirstFragWithCC(refDetails.fragments, targetCC);
  const frag = findFirstFragWithCC(details.fragments, targetCC);
  if (!refFrag || !frag) {
    return;
  }
  logger.log(`Aligning playlist at start of dicontinuity sequence ${targetCC}`);
  const delta = refFrag.start - frag.start;
  adjustSlidingStart(delta, details);
}

/**
 * Ensures appropriate time-alignment between renditions based on PDT.
 * This function assumes the timelines represented in `refDetails` are accurate, including the PDTs
 * for the last discontinuity sequence number shared by both playlists when present,
 * and uses the "wallclock"/PDT timeline as a cross-reference to `details`, adjusting the presentation
 * times/timelines of `details` accordingly.
 * Given the asynchronous nature of fetches and initial loads of live `main` and audio/subtitle tracks,
 * the primary purpose of this function is to ensure the "local timelines" of audio/subtitle tracks
 * are aligned to the main/video timeline, using PDT as the cross-reference/"anchor" that should
 * be consistent across playlists, per the HLS spec.
 * @param details - The details of the rendition you'd like to time-align (e.g. an audio rendition).
 * @param refDetails - The details of the reference rendition with start and PDT times for alignment.
 */
export function alignMediaPlaylistByPDT(
  details: LevelDetails,
  refDetails: LevelDetails,
) {
  if (!details.hasProgramDateTime || !refDetails.hasProgramDateTime) {
    return;
  }

  const fragments = details.fragments;
  const refFragments = refDetails.fragments;
  if (!fragments.length || !refFragments.length) {
    return;
  }

  // Calculate a delta to apply to all fragments according to the delta in PDT times and start times
  // of a fragment in the reference details, and a fragment in the target details of the same discontinuity.
  // If a fragment of the same discontinuity was not found use the middle fragment of both.
  let refFrag: Fragment | null | undefined;
  let frag: Fragment | null | undefined;
  const targetCC = Math.min(refDetails.endCC, details.endCC);
  if (refDetails.startCC < targetCC && details.startCC < targetCC) {
    refFrag = findFirstFragWithCC(refFragments, targetCC);
    frag = findFirstFragWithCC(fragments, targetCC);
  }
  if (!refFrag || !frag) {
    refFrag = refFragments[Math.floor(refFragments.length / 2)];
    frag =
      findFirstFragWithCC(fragments, refFrag.cc) ||
      fragments[Math.floor(fragments.length / 2)];
  }
  const refPDT = refFrag.programDateTime;
  const targetPDT = frag.programDateTime;
  if (!refPDT || !targetPDT) {
    return;
  }

  const delta = (targetPDT - refPDT) / 1000 - (frag.start - refFrag.start);
  adjustSlidingStart(delta, details);
}
