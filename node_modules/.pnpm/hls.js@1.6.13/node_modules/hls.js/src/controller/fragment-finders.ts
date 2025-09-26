import BinarySearch from '../utils/binary-search';
import type { Fragment, MediaFragment } from '../loader/fragment';
import type { LevelDetails } from '../loader/level-details';

/**
 * Returns first fragment whose endPdt value exceeds the given PDT, or null.
 * @param fragments - The array of candidate fragments
 * @param PDTValue - The PDT value which must be exceeded
 * @param maxFragLookUpTolerance - The amount of time that a fragment's start/end can be within in order to be considered contiguous
 */
export function findFragmentByPDT(
  fragments: MediaFragment[],
  PDTValue: number | null,
  maxFragLookUpTolerance: number,
): MediaFragment | null {
  if (
    PDTValue === null ||
    !Array.isArray(fragments) ||
    !fragments.length ||
    !Number.isFinite(PDTValue)
  ) {
    return null;
  }

  // if less than start
  const startPDT = fragments[0].programDateTime;
  if (PDTValue < (startPDT || 0)) {
    return null;
  }

  const endPDT = fragments[fragments.length - 1].endProgramDateTime;
  if (PDTValue >= (endPDT || 0)) {
    return null;
  }

  for (let seg = 0; seg < fragments.length; ++seg) {
    const frag = fragments[seg];
    if (pdtWithinToleranceTest(PDTValue, maxFragLookUpTolerance, frag)) {
      return frag;
    }
  }

  return null;
}

/**
 * Finds a fragment based on the SN of the previous fragment; or based on the needs of the current buffer.
 * This method compensates for small buffer gaps by applying a tolerance to the start of any candidate fragment, thus
 * breaking any traps which would cause the same fragment to be continuously selected within a small range.
 * @param fragPrevious - The last frag successfully appended
 * @param fragments - The array of candidate fragments
 * @param bufferEnd - The end of the contiguous buffered range the playhead is currently within
 * @param maxFragLookUpTolerance - The amount of time that a fragment's start/end can be within in order to be considered contiguous
 * @returns a matching fragment or null
 */
export function findFragmentByPTS(
  fragPrevious: MediaFragment | null,
  fragments: MediaFragment[],
  bufferEnd: number = 0,
  maxFragLookUpTolerance: number = 0,
  nextFragLookupTolerance: number = 0.005,
): MediaFragment | null {
  let fragNext: MediaFragment | null = null;
  if (fragPrevious) {
    fragNext = fragments[1 + fragPrevious.sn - fragments[0].sn] || null;
    // check for buffer-end rounding error
    const bufferEdgeError = (fragPrevious.endDTS as number) - bufferEnd;
    if (bufferEdgeError > 0 && bufferEdgeError < 0.0000015) {
      bufferEnd += 0.0000015;
    }
    if (
      fragNext &&
      fragPrevious.level !== fragNext.level &&
      fragNext.end <= fragPrevious.end
    ) {
      fragNext = fragments[2 + fragPrevious.sn - fragments[0].sn] || null;
    }
  } else if (bufferEnd === 0 && fragments[0].start === 0) {
    fragNext = fragments[0];
  }
  // Prefer the next fragment if it's within tolerance
  if (
    fragNext &&
    (((!fragPrevious || fragPrevious.level === fragNext.level) &&
      fragmentWithinToleranceTest(
        bufferEnd,
        maxFragLookUpTolerance,
        fragNext,
      ) === 0) ||
      fragmentWithinFastStartSwitch(
        fragNext,
        fragPrevious,
        Math.min(nextFragLookupTolerance, maxFragLookUpTolerance),
      ))
  ) {
    return fragNext;
  }
  // We might be seeking past the tolerance so find the best match
  const foundFragment = BinarySearch.search(
    fragments,
    fragmentWithinToleranceTest.bind(null, bufferEnd, maxFragLookUpTolerance),
  );
  if (foundFragment && (foundFragment !== fragPrevious || !fragNext)) {
    return foundFragment;
  }
  // If no match was found return the next fragment after fragPrevious, or null
  return fragNext;
}

function fragmentWithinFastStartSwitch(
  fragNext: Fragment,
  fragPrevious: Fragment | null,
  nextFragLookupTolerance: number,
): boolean {
  if (
    fragPrevious &&
    fragPrevious.start === 0 &&
    fragPrevious.level < fragNext.level &&
    (fragPrevious.endPTS || 0) > 0
  ) {
    const firstDuration = fragPrevious.tagList.reduce((duration, tag) => {
      if (tag[0] === 'INF') {
        duration += parseFloat(tag[1]);
      }
      return duration;
    }, nextFragLookupTolerance);
    return fragNext.start <= firstDuration;
  }
  return false;
}

/**
 * The test function used by the findFragmentBySn's BinarySearch to look for the best match to the current buffer conditions.
 * @param candidate - The fragment to test
 * @param bufferEnd - The end of the current buffered range the playhead is currently within
 * @param maxFragLookUpTolerance - The amount of time that a fragment's start can be within in order to be considered contiguous
 * @returns 0 if it matches, 1 if too low, -1 if too high
 */
export function fragmentWithinToleranceTest(
  bufferEnd = 0,
  maxFragLookUpTolerance = 0,
  candidate: MediaFragment,
) {
  // eagerly accept an accurate match (no tolerance)
  if (
    candidate.start <= bufferEnd &&
    candidate.start + candidate.duration > bufferEnd
  ) {
    return 0;
  }
  // offset should be within fragment boundary - config.maxFragLookUpTolerance
  // this is to cope with situations like
  // bufferEnd = 9.991
  // frag[Ø] : [0,10]
  // frag[1] : [10,20]
  // bufferEnd is within frag[0] range ... although what we are expecting is to return frag[1] here
  //              frag start               frag start+duration
  //                  |-----------------------------|
  //              <--->                         <--->
  //  ...--------><-----------------------------><---------....
  // previous frag         matching fragment         next frag
  //  return -1             return 0                 return 1
  // logger.log(`level/sn/start/end/bufEnd:${level}/${candidate.sn}/${candidate.start}/${(candidate.start+candidate.duration)}/${bufferEnd}`);
  // Set the lookup tolerance to be small enough to detect the current segment - ensures we don't skip over very small segments
  const candidateLookupTolerance = Math.min(
    maxFragLookUpTolerance,
    candidate.duration + (candidate.deltaPTS ? candidate.deltaPTS : 0),
  );
  if (
    candidate.start + candidate.duration - candidateLookupTolerance <=
    bufferEnd
  ) {
    return 1;
  } else if (
    candidate.start - candidateLookupTolerance > bufferEnd &&
    candidate.start
  ) {
    // if maxFragLookUpTolerance will have negative value then don't return -1 for first element
    return -1;
  }

  return 0;
}

/**
 * The test function used by the findFragmentByPdt's BinarySearch to look for the best match to the current buffer conditions.
 * This function tests the candidate's program date time values, as represented in Unix time
 * @param candidate - The fragment to test
 * @param pdtBufferEnd - The Unix time representing the end of the current buffered range
 * @param maxFragLookUpTolerance - The amount of time that a fragment's start can be within in order to be considered contiguous
 * @returns true if contiguous, false otherwise
 */
export function pdtWithinToleranceTest(
  pdtBufferEnd: number,
  maxFragLookUpTolerance: number,
  candidate: MediaFragment,
): boolean {
  const candidateLookupTolerance =
    Math.min(
      maxFragLookUpTolerance,
      candidate.duration + (candidate.deltaPTS ? candidate.deltaPTS : 0),
    ) * 1000;

  // endProgramDateTime can be null, default to zero
  const endProgramDateTime = candidate.endProgramDateTime || 0;
  return endProgramDateTime - candidateLookupTolerance > pdtBufferEnd;
}

export function findFragWithCC(
  fragments: MediaFragment[],
  cc: number,
): MediaFragment | null {
  return BinarySearch.search(fragments, (candidate) => {
    if (candidate.cc < cc) {
      return 1;
    } else if (candidate.cc > cc) {
      return -1;
    } else {
      return 0;
    }
  });
}

export function findNearestWithCC(
  details: LevelDetails | undefined,
  cc: number,
  pos: number,
): MediaFragment | null {
  if (details) {
    if (details.startCC <= cc && details.endCC >= cc) {
      let fragments = details.fragments;
      const { fragmentHint } = details;
      if (fragmentHint) {
        fragments = fragments.concat(fragmentHint);
      }
      let closest: MediaFragment | undefined;
      BinarySearch.search(fragments, (candidate) => {
        if (candidate.cc < cc) {
          return 1;
        }
        if (candidate.cc > cc) {
          return -1;
        }
        closest = candidate;
        if (candidate.end <= pos) {
          return 1;
        }
        if (candidate.start > pos) {
          return -1;
        }
        return 0;
      });
      return closest || null;
    }
  }
  return null;
}
