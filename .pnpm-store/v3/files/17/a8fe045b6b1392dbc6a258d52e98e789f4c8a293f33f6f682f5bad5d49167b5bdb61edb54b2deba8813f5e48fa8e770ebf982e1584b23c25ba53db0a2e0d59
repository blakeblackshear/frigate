/**
 * Provides methods dealing with playlist sliding and drift
 */

import { stringify } from './safe-json-stringify';
import { DateRange } from '../loader/date-range';
import { assignProgramDateTime, mapDateRanges } from '../loader/m3u8-parser';
import type { ILogger } from './logger';
import type { Fragment, MediaFragment, Part } from '../loader/fragment';
import type { LevelDetails } from '../loader/level-details';
import type { Level } from '../types/level';

type FragmentIntersection = (
  oldFrag: MediaFragment,
  newFrag: MediaFragment,
  newFragIndex: number,
  newFragments: MediaFragment[],
) => void;
type PartIntersection = (oldPart: Part, newPart: Part) => void;

export function updatePTS(
  fragments: MediaFragment[],
  fromIdx: number,
  toIdx: number,
): void {
  const fragFrom = fragments[fromIdx];
  const fragTo = fragments[toIdx];
  updateFromToPTS(fragFrom, fragTo);
}

function updateFromToPTS(fragFrom: MediaFragment, fragTo: MediaFragment) {
  const fragToPTS = fragTo.startPTS as number;
  // if we know startPTS[toIdx]
  if (Number.isFinite(fragToPTS)) {
    // update fragment duration.
    // it helps to fix drifts between playlist reported duration and fragment real duration
    let duration: number = 0;
    let frag: Fragment;
    if (fragTo.sn > fragFrom.sn) {
      duration = fragToPTS - fragFrom.start;
      frag = fragFrom;
    } else {
      duration = fragFrom.start - fragToPTS;
      frag = fragTo;
    }
    if (frag.duration !== duration) {
      frag.setDuration(duration);
    }
    // we dont know startPTS[toIdx]
  } else if (fragTo.sn > fragFrom.sn) {
    const contiguous = fragFrom.cc === fragTo.cc;
    // TODO: With part-loading end/durations we need to confirm the whole fragment is loaded before using (or setting) minEndPTS
    if (contiguous && fragFrom.minEndPTS) {
      fragTo.setStart(fragFrom.start + (fragFrom.minEndPTS - fragFrom.start));
    } else {
      fragTo.setStart(fragFrom.start + fragFrom.duration);
    }
  } else {
    fragTo.setStart(Math.max(fragFrom.start - fragTo.duration, 0));
  }
}

export function updateFragPTSDTS(
  details: LevelDetails | undefined,
  frag: MediaFragment,
  startPTS: number,
  endPTS: number,
  startDTS: number,
  endDTS: number,
  logger: ILogger,
): number {
  const parsedMediaDuration = endPTS - startPTS;
  if (parsedMediaDuration <= 0) {
    logger.warn('Fragment should have a positive duration', frag);
    endPTS = startPTS + frag.duration;
    endDTS = startDTS + frag.duration;
  }
  let maxStartPTS = startPTS;
  let minEndPTS = endPTS;
  const fragStartPts = frag.startPTS as number;
  const fragEndPts = frag.endPTS as number;
  if (Number.isFinite(fragStartPts)) {
    // delta PTS between audio and video
    const deltaPTS = Math.abs(fragStartPts - startPTS);
    if (details && deltaPTS > details.totalduration) {
      logger.warn(
        `media timestamps and playlist times differ by ${deltaPTS}s for level ${frag.level} ${details.url}`,
      );
    } else if (!Number.isFinite(frag.deltaPTS as number)) {
      frag.deltaPTS = deltaPTS;
    } else {
      frag.deltaPTS = Math.max(deltaPTS, frag.deltaPTS as number);
    }

    maxStartPTS = Math.max(startPTS, fragStartPts);
    startPTS = Math.min(startPTS, fragStartPts);
    startDTS =
      frag.startDTS !== undefined
        ? Math.min(startDTS, frag.startDTS)
        : startDTS;

    minEndPTS = Math.min(endPTS, fragEndPts);
    endPTS = Math.max(endPTS, fragEndPts);
    endDTS = frag.endDTS !== undefined ? Math.max(endDTS, frag.endDTS) : endDTS;
  }

  const drift = startPTS - frag.start;
  if (frag.start !== 0) {
    frag.setStart(startPTS);
  }
  frag.setDuration(endPTS - frag.start);
  frag.startPTS = startPTS;
  frag.maxStartPTS = maxStartPTS;
  frag.startDTS = startDTS;
  frag.endPTS = endPTS;
  frag.minEndPTS = minEndPTS;
  frag.endDTS = endDTS;

  const sn = frag.sn;
  // exit if sn out of range
  if (!details || sn < details.startSN || sn > details.endSN) {
    return 0;
  }
  let i: number;
  const fragIdx = sn - details.startSN;
  const fragments = details.fragments;
  // update frag reference in fragments array
  // rationale is that fragments array might not contain this frag object.
  // this will happen if playlist has been refreshed between frag loading and call to updateFragPTSDTS()
  // if we don't update frag, we won't be able to propagate PTS info on the playlist
  // resulting in invalid sliding computation
  fragments[fragIdx] = frag;
  // adjust fragment PTS/duration from seqnum-1 to frag 0
  for (i = fragIdx; i > 0; i--) {
    updateFromToPTS(fragments[i], fragments[i - 1]);
  }

  // adjust fragment PTS/duration from seqnum to last frag
  for (i = fragIdx; i < fragments.length - 1; i++) {
    updateFromToPTS(fragments[i], fragments[i + 1]);
  }
  if (details.fragmentHint) {
    updateFromToPTS(fragments[fragments.length - 1], details.fragmentHint);
  }

  details.PTSKnown = details.alignedSliding = true;
  return drift;
}

export function mergeDetails(
  oldDetails: LevelDetails,
  newDetails: LevelDetails,
  logger: ILogger,
) {
  if (oldDetails === newDetails) {
    return;
  }
  // Track the last initSegment processed. Initialize it to the last one on the timeline.
  let currentInitSegment: Fragment | null = null;
  const oldFragments = oldDetails.fragments;
  for (let i = oldFragments.length - 1; i >= 0; i--) {
    const oldInit = oldFragments[i].initSegment;
    if (oldInit) {
      currentInitSegment = oldInit;
      break;
    }
  }

  if (oldDetails.fragmentHint) {
    // prevent PTS and duration from being adjusted on the next hint
    delete oldDetails.fragmentHint.endPTS;
  }
  // check if old/new playlists have fragments in common
  // loop through overlapping SN and update startPTS, cc, and duration if any found
  let PTSFrag: MediaFragment | undefined;
  mapFragmentIntersection(
    oldDetails,
    newDetails,
    (oldFrag, newFrag, newFragIndex, newFragments) => {
      if (
        (!newDetails.startCC || newDetails.skippedSegments) &&
        newFrag.cc !== oldFrag.cc
      ) {
        const ccOffset = oldFrag.cc - newFrag.cc;
        for (let i = newFragIndex; i < newFragments.length; i++) {
          newFragments[i].cc += ccOffset;
        }
        newDetails.endCC = newFragments[newFragments.length - 1].cc;
      }
      if (
        Number.isFinite(oldFrag.startPTS) &&
        Number.isFinite(oldFrag.endPTS)
      ) {
        newFrag.setStart((newFrag.startPTS = oldFrag.startPTS!));
        newFrag.startDTS = oldFrag.startDTS;
        newFrag.maxStartPTS = oldFrag.maxStartPTS;

        newFrag.endPTS = oldFrag.endPTS;
        newFrag.endDTS = oldFrag.endDTS;
        newFrag.minEndPTS = oldFrag.minEndPTS;
        newFrag.setDuration(oldFrag.endPTS! - oldFrag.startPTS!);

        if (newFrag.duration) {
          PTSFrag = newFrag;
        }

        // PTS is known when any segment has startPTS and endPTS
        newDetails.PTSKnown = newDetails.alignedSliding = true;
      }

      if (oldFrag.hasStreams) {
        newFrag.elementaryStreams = oldFrag.elementaryStreams;
      }

      newFrag.loader = oldFrag.loader;

      if (oldFrag.hasStats) {
        newFrag.stats = oldFrag.stats;
      }

      if (oldFrag.initSegment) {
        newFrag.initSegment = oldFrag.initSegment;
        currentInitSegment = oldFrag.initSegment;
      }
    },
  );

  const newFragments = newDetails.fragments;
  const fragmentsToCheck = newDetails.fragmentHint
    ? newFragments.concat(newDetails.fragmentHint)
    : newFragments;
  if (currentInitSegment) {
    fragmentsToCheck.forEach((frag) => {
      if (
        (frag as any) &&
        (!frag.initSegment ||
          frag.initSegment.relurl === currentInitSegment?.relurl)
      ) {
        frag.initSegment = currentInitSegment;
      }
    });
  }

  if (newDetails.skippedSegments) {
    newDetails.deltaUpdateFailed = newFragments.some((frag) => !frag as any);
    if (newDetails.deltaUpdateFailed) {
      logger.warn(
        '[level-helper] Previous playlist missing segments skipped in delta playlist',
      );
      for (let i = newDetails.skippedSegments; i--; ) {
        newFragments.shift();
      }
      newDetails.startSN = newFragments[0].sn;
    } else {
      if (newDetails.canSkipDateRanges) {
        newDetails.dateRanges = mergeDateRanges(
          oldDetails.dateRanges,
          newDetails,
          logger,
        );
      }
      const programDateTimes = oldDetails.fragments.filter(
        (frag) => frag.rawProgramDateTime,
      );
      if (oldDetails.hasProgramDateTime && !newDetails.hasProgramDateTime) {
        for (let i = 1; i < fragmentsToCheck.length; i++) {
          if (fragmentsToCheck[i].programDateTime === null) {
            assignProgramDateTime(
              fragmentsToCheck[i],
              fragmentsToCheck[i - 1],
              programDateTimes,
            );
          }
        }
      }
      mapDateRanges(programDateTimes, newDetails);
    }
    newDetails.endCC = newFragments[newFragments.length - 1].cc;
  }
  if (!newDetails.startCC) {
    const fragPriorToNewStart = getFragmentWithSN(
      oldDetails,
      newDetails.startSN - 1,
    );
    newDetails.startCC = fragPriorToNewStart?.cc ?? newFragments[0].cc;
  }

  // Merge parts
  mapPartIntersection(
    oldDetails.partList,
    newDetails.partList,
    (oldPart: Part, newPart: Part) => {
      newPart.elementaryStreams = oldPart.elementaryStreams;
      newPart.stats = oldPart.stats;
    },
  );

  // if at least one fragment contains PTS info, recompute PTS information for all fragments
  if (PTSFrag) {
    updateFragPTSDTS(
      newDetails,
      PTSFrag,
      PTSFrag.startPTS as number,
      PTSFrag.endPTS as number,
      PTSFrag.startDTS as number,
      PTSFrag.endDTS as number,
      logger,
    );
  } else {
    // ensure that delta is within oldFragments range
    // also adjust sliding in case delta is 0 (we could have old=[50-60] and new=old=[50-61])
    // in that case we also need to adjust start offset of all fragments
    adjustSliding(oldDetails, newDetails);
  }

  if (newFragments.length) {
    newDetails.totalduration = newDetails.edge - newFragments[0].start;
  }

  newDetails.driftStartTime = oldDetails.driftStartTime;
  newDetails.driftStart = oldDetails.driftStart;
  const advancedDateTime = newDetails.advancedDateTime;
  if (newDetails.advanced && advancedDateTime) {
    const edge = newDetails.edge;
    if (!newDetails.driftStart) {
      newDetails.driftStartTime = advancedDateTime;
      newDetails.driftStart = edge;
    }
    newDetails.driftEndTime = advancedDateTime;
    newDetails.driftEnd = edge;
  } else {
    newDetails.driftEndTime = oldDetails.driftEndTime;
    newDetails.driftEnd = oldDetails.driftEnd;
    newDetails.advancedDateTime = oldDetails.advancedDateTime;
  }
  if (newDetails.requestScheduled === -1) {
    newDetails.requestScheduled = oldDetails.requestScheduled;
  }
}

function mergeDateRanges(
  oldDateRanges: Record<string, DateRange | undefined>,
  newDetails: LevelDetails,
  logger: ILogger,
): Record<string, DateRange | undefined> {
  const { dateRanges: deltaDateRanges, recentlyRemovedDateranges } = newDetails;
  const dateRanges = Object.assign({}, oldDateRanges);
  if (recentlyRemovedDateranges) {
    recentlyRemovedDateranges.forEach((id) => {
      delete dateRanges[id];
    });
  }
  const mergeIds = Object.keys(dateRanges);
  const mergeCount = mergeIds.length;
  if (!mergeCount) {
    return deltaDateRanges;
  }
  Object.keys(deltaDateRanges).forEach((id) => {
    const mergedDateRange = dateRanges[id];
    const dateRange = new DateRange(deltaDateRanges[id]!.attr, mergedDateRange);
    if (dateRange.isValid) {
      dateRanges[id] = dateRange;
      if (!mergedDateRange) {
        dateRange.tagOrder += mergeCount;
      }
    } else {
      logger.warn(
        `Ignoring invalid Playlist Delta Update DATERANGE tag: "${stringify(
          deltaDateRanges[id]!.attr,
        )}"`,
      );
    }
  });
  return dateRanges;
}

export function mapPartIntersection(
  oldParts: Part[] | null,
  newParts: Part[] | null,
  intersectionFn: PartIntersection,
) {
  if (oldParts && newParts) {
    let delta = 0;
    for (let i = 0, len = oldParts.length; i <= len; i++) {
      const oldPart = oldParts[i];
      const newPart = newParts[i + delta];
      if (
        (oldPart as any) &&
        (newPart as any) &&
        oldPart.index === newPart.index &&
        oldPart.fragment.sn === newPart.fragment.sn
      ) {
        intersectionFn(oldPart, newPart);
      } else {
        delta--;
      }
    }
  }
}

export function mapFragmentIntersection(
  oldDetails: LevelDetails,
  newDetails: LevelDetails,
  intersectionFn: FragmentIntersection,
) {
  const skippedSegments = newDetails.skippedSegments;
  const start =
    Math.max(oldDetails.startSN, newDetails.startSN) - newDetails.startSN;
  const end =
    (oldDetails.fragmentHint ? 1 : 0) +
    (skippedSegments
      ? newDetails.endSN
      : Math.min(oldDetails.endSN, newDetails.endSN)) -
    newDetails.startSN;
  const delta = newDetails.startSN - oldDetails.startSN;
  const newFrags = newDetails.fragmentHint
    ? newDetails.fragments.concat(newDetails.fragmentHint)
    : newDetails.fragments;
  const oldFrags = oldDetails.fragmentHint
    ? oldDetails.fragments.concat(oldDetails.fragmentHint)
    : oldDetails.fragments;

  for (let i = start; i <= end; i++) {
    const oldFrag = oldFrags[delta + i];
    let newFrag = newFrags[i];
    if (skippedSegments && (!newFrag as any) && (oldFrag as any)) {
      // Fill in skipped segments in delta playlist
      newFrag = newDetails.fragments[i] = oldFrag;
    }
    if ((oldFrag as any) && (newFrag as any)) {
      intersectionFn(oldFrag, newFrag, i, newFrags);
      const uriBefore = oldFrag.relurl;
      const uriAfter = newFrag.relurl;
      if (uriBefore && notEqualAfterStrippingQueries(uriBefore, uriAfter)) {
        newDetails.playlistParsingError = getSequenceError(
          `media sequence mismatch ${newFrag.sn}:`,
          oldDetails,
          newDetails,
          oldFrag,
          newFrag,
        );
        return;
      } else if (oldFrag.cc !== newFrag.cc) {
        newDetails.playlistParsingError = getSequenceError(
          `discontinuity sequence mismatch (${oldFrag.cc}!=${newFrag.cc})`,
          oldDetails,
          newDetails,
          oldFrag,
          newFrag,
        );
        return;
      }
    }
  }
}

function getSequenceError(
  message: string,
  oldDetails: LevelDetails,
  newDetails: LevelDetails,
  oldFrag: MediaFragment,
  newFrag: MediaFragment,
): Error {
  return new Error(
    `${message} ${newFrag.url}
Playlist starting @${oldDetails.startSN}
${oldDetails.m3u8}

Playlist starting @${newDetails.startSN}
${newDetails.m3u8}`,
  );
}

export function adjustSliding(
  oldDetails: LevelDetails,
  newDetails: LevelDetails,
  matchingStableVariantOrRendition: boolean = true,
): void {
  const delta =
    newDetails.startSN + newDetails.skippedSegments - oldDetails.startSN;
  const oldFragments = oldDetails.fragments;
  const advancedOrStable = delta >= 0;
  let sliding = 0;
  if (advancedOrStable && delta < oldFragments.length) {
    sliding = oldFragments[delta].start;
  } else if (advancedOrStable && newDetails.startSN === oldDetails.endSN + 1) {
    sliding = oldDetails.fragmentEnd;
  } else if (advancedOrStable && matchingStableVariantOrRendition) {
    // align with expected position (updated playlist start sequence is past end sequence of last update)
    sliding = oldDetails.fragmentStart + delta * newDetails.levelTargetDuration;
  } else if (!newDetails.skippedSegments && newDetails.fragmentStart === 0) {
    // align new start with old (playlist switch has a sequence with no overlap and should not be used for alignment)
    sliding = oldDetails.fragmentStart;
  } else {
    // new details already has a sliding offset or has skipped segments
    return;
  }
  addSliding(newDetails, sliding);
}

export function addSliding(details: LevelDetails, sliding: number) {
  if (sliding) {
    const fragments = details.fragments;
    for (let i = details.skippedSegments; i < fragments.length; i++) {
      fragments[i].addStart(sliding);
    }
    if (details.fragmentHint) {
      details.fragmentHint.addStart(sliding);
    }
  }
}

export function computeReloadInterval(
  newDetails: LevelDetails,
  distanceToLiveEdgeMs: number = Infinity,
): number {
  let reloadInterval = 1000 * newDetails.targetduration;

  if (newDetails.updated) {
    // Use last segment duration when shorter than target duration and near live edge
    const fragments = newDetails.fragments;
    const liveEdgeMaxTargetDurations = 4;
    if (
      fragments.length &&
      reloadInterval * liveEdgeMaxTargetDurations > distanceToLiveEdgeMs
    ) {
      const lastSegmentDuration =
        fragments[fragments.length - 1].duration * 1000;
      if (lastSegmentDuration < reloadInterval) {
        reloadInterval = lastSegmentDuration;
      }
    }
  } else {
    // estimate = 'miss half average';
    // follow HLS Spec, If the client reloads a Playlist file and finds that it has not
    // changed then it MUST wait for a period of one-half the target
    // duration before retrying.
    reloadInterval /= 2;
  }

  return Math.round(reloadInterval);
}

export function getFragmentWithSN(
  details: LevelDetails | undefined,
  sn: number,
  fragCurrent?: Fragment | null,
): MediaFragment | null {
  if (!details) {
    return null;
  }
  let fragment = details.fragments[sn - details.startSN] as
    | MediaFragment
    | undefined;
  if (fragment) {
    return fragment;
  }
  fragment = details.fragmentHint;
  if (fragment && fragment.sn === sn) {
    return fragment;
  }
  if (sn < details.startSN && fragCurrent && fragCurrent.sn === sn) {
    return fragCurrent as MediaFragment;
  }
  return null;
}

export function getPartWith(
  details: LevelDetails | undefined,
  sn: number,
  partIndex: number,
): Part | null {
  if (!details) {
    return null;
  }
  return findPart(details.partList, sn, partIndex);
}

export function findPart(
  partList: Part[] | null | undefined,
  sn: number,
  partIndex: number,
): Part | null {
  if (partList) {
    for (let i = partList.length; i--; ) {
      const part = partList[i];
      if (part.index === partIndex && part.fragment.sn === sn) {
        return part;
      }
    }
  }
  return null;
}

export function reassignFragmentLevelIndexes(levels: Level[]) {
  levels.forEach((level, index) => {
    level.details?.fragments.forEach((fragment) => {
      fragment.level = index;
      if (fragment.initSegment) {
        fragment.initSegment.level = index;
      }
    });
  });
}

function notEqualAfterStrippingQueries(
  uriBefore: string,
  uriAfter: string | undefined,
): boolean {
  if (uriBefore !== uriAfter && uriAfter) {
    return stripQuery(uriBefore) !== stripQuery(uriAfter);
  }
  return false;
}

function stripQuery(uri: string): string {
  return uri.replace(/\?[^?]*$/, '');
}
