import { Events } from '../events';
import type Hls from '../hls';
import type { Fragment, MediaFragment, Part } from '../loader/fragment';
import type { SourceBufferName } from '../types/buffer';
import type { ComponentAPI } from '../types/component-api';
import type {
  BufferAppendedData,
  FragBufferedData,
  FragLoadedData,
} from '../types/events';
import type {
  FragmentBufferedRange,
  FragmentEntity,
  FragmentTimeRange,
} from '../types/fragment-tracker';
import type { PlaylistLevelType } from '../types/loader';

export const enum FragmentState {
  NOT_LOADED = 'NOT_LOADED',
  APPENDING = 'APPENDING',
  PARTIAL = 'PARTIAL',
  OK = 'OK',
}

export class FragmentTracker implements ComponentAPI {
  private activePartLists: { [key in PlaylistLevelType]?: Part[] } =
    Object.create(null);
  private endListFragments: { [key in PlaylistLevelType]?: FragmentEntity } =
    Object.create(null);
  private fragments: Partial<Record<string, FragmentEntity>> =
    Object.create(null);
  private timeRanges:
    | {
        [key in SourceBufferName]?: TimeRanges;
      }
    | null = Object.create(null);

  private bufferPadding: number = 0.2;
  private hls: Hls | null;
  private hasGaps: boolean = false;

  constructor(hls: Hls) {
    this.hls = hls;

    this._registerListeners();
  }

  private _registerListeners() {
    const { hls } = this;
    if (hls) {
      hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
      hls.on(Events.BUFFER_APPENDED, this.onBufferAppended, this);
      hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
      hls.on(Events.FRAG_LOADED, this.onFragLoaded, this);
    }
  }

  private _unregisterListeners() {
    const { hls } = this;
    if (hls) {
      hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
      hls.off(Events.BUFFER_APPENDED, this.onBufferAppended, this);
      hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
      hls.off(Events.FRAG_LOADED, this.onFragLoaded, this);
    }
  }

  public destroy() {
    this._unregisterListeners();
    // @ts-ignore
    this.hls =
      // @ts-ignore
      this.fragments =
      // @ts-ignore
      this.activePartLists =
      // @ts-ignore
      this.endListFragments =
      this.timeRanges =
        null;
  }

  /**
   * Return a Fragment or Part with an appended range that matches the position and levelType
   * Otherwise, return null
   */
  public getAppendedFrag(
    position: number,
    levelType: PlaylistLevelType,
  ): MediaFragment | Part | null {
    const activeParts = this.activePartLists[levelType];
    if (activeParts) {
      for (let i = activeParts.length; i--; ) {
        const activePart = activeParts[i];
        if (!activePart as any) {
          break;
        }
        if (
          activePart.start <= position &&
          position <= activePart.end &&
          activePart.loaded
        ) {
          return activePart;
        }
      }
    }
    return this.getBufferedFrag(position, levelType);
  }

  /**
   * Return a buffered Fragment that matches the position and levelType.
   * A buffered Fragment is one whose loading, parsing and appending is done (completed or "partial" meaning aborted).
   * If not found any Fragment, return null
   */
  public getBufferedFrag(
    position: number,
    levelType: PlaylistLevelType,
  ): MediaFragment | null {
    return this.getFragAtPos(position, levelType, true);
  }

  public getFragAtPos(
    position: number,
    levelType: PlaylistLevelType,
    buffered?: boolean,
  ): MediaFragment | null {
    const { fragments } = this;
    const keys = Object.keys(fragments);
    for (let i = keys.length; i--; ) {
      const fragmentEntity = fragments[keys[i]];
      if (
        fragmentEntity?.body.type === levelType &&
        (!buffered || fragmentEntity.buffered)
      ) {
        const frag = fragmentEntity.body;
        if (frag.start <= position && position <= frag.end) {
          return frag;
        }
      }
    }
    return null;
  }

  /**
   * Partial fragments effected by coded frame eviction will be removed
   * The browser will unload parts of the buffer to free up memory for new buffer data
   * Fragments will need to be reloaded when the buffer is freed up, removing partial fragments will allow them to reload(since there might be parts that are still playable)
   */
  public detectEvictedFragments(
    elementaryStream: SourceBufferName,
    timeRange: TimeRanges,
    playlistType: PlaylistLevelType,
    appendedPart?: Part | null,
    removeAppending?: boolean,
  ) {
    if (this.timeRanges) {
      this.timeRanges[elementaryStream] = timeRange;
    }
    // Check if any flagged fragments have been unloaded
    // excluding anything newer than appendedPartSn
    const appendedPartSn = appendedPart?.fragment.sn || -1;
    Object.keys(this.fragments).forEach((key) => {
      const fragmentEntity = this.fragments[key];
      if (!fragmentEntity) {
        return;
      }
      if (appendedPartSn >= fragmentEntity.body.sn) {
        return;
      }
      if (
        !fragmentEntity.buffered &&
        (!fragmentEntity.loaded || removeAppending)
      ) {
        if (fragmentEntity.body.type === playlistType) {
          this.removeFragment(fragmentEntity.body);
        }
        return;
      }
      const esData = fragmentEntity.range[elementaryStream];
      if (!esData) {
        return;
      }
      if (esData.time.length === 0) {
        this.removeFragment(fragmentEntity.body);
        return;
      }
      esData.time.some((time: FragmentTimeRange) => {
        const isNotBuffered = !this.isTimeBuffered(
          time.startPTS,
          time.endPTS,
          timeRange,
        );
        if (isNotBuffered) {
          // Unregister partial fragment as it needs to load again to be reused
          this.removeFragment(fragmentEntity.body);
        }
        return isNotBuffered;
      });
    });
  }

  /**
   * Checks if the fragment passed in is loaded in the buffer properly
   * Partially loaded fragments will be registered as a partial fragment
   */
  public detectPartialFragments(data: FragBufferedData) {
    const timeRanges = this.timeRanges;
    if (!timeRanges || data.frag.sn === 'initSegment') {
      return;
    }

    const frag = data.frag as MediaFragment;
    const fragKey = getFragmentKey(frag);
    const fragmentEntity = this.fragments[fragKey];
    if (!fragmentEntity || (fragmentEntity.buffered && frag.gap)) {
      return;
    }
    const isFragHint = !frag.relurl;
    Object.keys(timeRanges).forEach((elementaryStream: SourceBufferName) => {
      const streamInfo = frag.elementaryStreams[elementaryStream];
      if (!streamInfo) {
        return;
      }
      const timeRange = timeRanges[elementaryStream] as TimeRanges;
      const partial = isFragHint || streamInfo.partial === true;
      fragmentEntity.range[elementaryStream] = this.getBufferedTimes(
        frag,
        data.part,
        partial,
        timeRange,
      );
    });
    fragmentEntity.loaded = null;
    if (Object.keys(fragmentEntity.range).length) {
      fragmentEntity.buffered = true;
      const endList = (fragmentEntity.body.endList =
        frag.endList || fragmentEntity.body.endList);
      if (endList) {
        this.endListFragments[fragmentEntity.body.type] = fragmentEntity;
      }
      if (!isPartial(fragmentEntity)) {
        // Remove older fragment parts from lookup after frag is tracked as buffered
        this.removeParts(frag.sn - 1, frag.type);
      }
    } else {
      // remove fragment if nothing was appended
      this.removeFragment(fragmentEntity.body);
    }
  }

  private removeParts(snToKeep: number, levelType: PlaylistLevelType) {
    const activeParts = this.activePartLists[levelType];
    if (!activeParts) {
      return;
    }
    this.activePartLists[levelType] = filterParts(
      activeParts,
      (part) => part.fragment.sn >= snToKeep,
    );
  }

  public fragBuffered(frag: MediaFragment, force?: true) {
    const fragKey = getFragmentKey(frag);
    let fragmentEntity = this.fragments[fragKey];
    if (!fragmentEntity && force) {
      fragmentEntity = this.fragments[fragKey] = {
        body: frag,
        appendedPTS: null,
        loaded: null,
        buffered: false,
        range: Object.create(null),
      };
      if (frag.gap) {
        this.hasGaps = true;
      }
    }
    if (fragmentEntity) {
      fragmentEntity.loaded = null;
      fragmentEntity.buffered = true;
    }
  }

  private getBufferedTimes(
    fragment: Fragment,
    part: Part | null,
    partial: boolean,
    timeRange: TimeRanges,
  ): FragmentBufferedRange {
    const buffered: FragmentBufferedRange = {
      time: [],
      partial,
    };
    const startPTS = fragment.start;
    const endPTS = fragment.end;
    const minEndPTS = fragment.minEndPTS || endPTS;
    const maxStartPTS = fragment.maxStartPTS || startPTS;
    for (let i = 0; i < timeRange.length; i++) {
      const startTime = timeRange.start(i) - this.bufferPadding;
      const endTime = timeRange.end(i) + this.bufferPadding;
      if (maxStartPTS >= startTime && minEndPTS <= endTime) {
        // Fragment is entirely contained in buffer
        // No need to check the other timeRange times since it's completely playable
        buffered.time.push({
          startPTS: Math.max(startPTS, timeRange.start(i)),
          endPTS: Math.min(endPTS, timeRange.end(i)),
        });
        break;
      } else if (startPTS < endTime && endPTS > startTime) {
        const start = Math.max(startPTS, timeRange.start(i));
        const end = Math.min(endPTS, timeRange.end(i));
        if (end > start) {
          buffered.partial = true;
          // Check for intersection with buffer
          // Get playable sections of the fragment
          buffered.time.push({
            startPTS: start,
            endPTS: end,
          });
        }
      } else if (endPTS <= startTime) {
        // No need to check the rest of the timeRange as it is in order
        break;
      }
    }
    return buffered;
  }

  /**
   * Gets the partial fragment for a certain time
   */
  public getPartialFragment(time: number): MediaFragment | null {
    let bestFragment: Fragment | null = null;
    let timePadding: number;
    let startTime: number;
    let endTime: number;
    let bestOverlap: number = 0;
    const { bufferPadding, fragments } = this;
    Object.keys(fragments).forEach((key) => {
      const fragmentEntity = fragments[key];
      if (!fragmentEntity) {
        return;
      }
      if (isPartial(fragmentEntity)) {
        startTime = fragmentEntity.body.start - bufferPadding;
        endTime = fragmentEntity.body.end + bufferPadding;
        if (time >= startTime && time <= endTime) {
          // Use the fragment that has the most padding from start and end time
          timePadding = Math.min(time - startTime, endTime - time);
          if (bestOverlap <= timePadding) {
            bestFragment = fragmentEntity.body;
            bestOverlap = timePadding;
          }
        }
      }
    });
    return bestFragment;
  }

  public isEndListAppended(type: PlaylistLevelType): boolean {
    const lastFragmentEntity = this.endListFragments[type];
    return (
      lastFragmentEntity !== undefined &&
      (lastFragmentEntity.buffered || isPartial(lastFragmentEntity))
    );
  }

  public getState(fragment: Fragment): FragmentState {
    const fragKey = getFragmentKey(fragment);
    const fragmentEntity = this.fragments[fragKey];

    if (fragmentEntity) {
      if (!fragmentEntity.buffered) {
        return FragmentState.APPENDING;
      } else if (isPartial(fragmentEntity)) {
        return FragmentState.PARTIAL;
      } else {
        return FragmentState.OK;
      }
    }

    return FragmentState.NOT_LOADED;
  }

  private isTimeBuffered(
    startPTS: number,
    endPTS: number,
    timeRange: TimeRanges,
  ): boolean {
    let startTime;
    let endTime;
    for (let i = 0; i < timeRange.length; i++) {
      startTime = timeRange.start(i) - this.bufferPadding;
      endTime = timeRange.end(i) + this.bufferPadding;
      if (startPTS >= startTime && endPTS <= endTime) {
        return true;
      }

      if (endPTS <= startTime) {
        // No need to check the rest of the timeRange as it is in order
        return false;
      }
    }

    return false;
  }

  private onManifestLoading() {
    this.removeAllFragments();
  }

  private onFragLoaded(event: Events.FRAG_LOADED, data: FragLoadedData) {
    // don't track initsegment (for which sn is not a number)
    // don't track frags used for bitrateTest, they're irrelevant.
    if (data.frag.sn === 'initSegment' || data.frag.bitrateTest) {
      return;
    }

    const frag = data.frag as MediaFragment;
    // Fragment entity `loaded` FragLoadedData is null when loading parts
    const loaded = data.part ? null : data;

    const fragKey = getFragmentKey(frag);
    this.fragments[fragKey] = {
      body: frag,
      appendedPTS: null,
      loaded,
      buffered: false,
      range: Object.create(null),
    };
  }

  private onBufferAppended(
    event: Events.BUFFER_APPENDED,
    data: BufferAppendedData,
  ) {
    const { frag, part, timeRanges, type } = data;
    if (frag.sn === 'initSegment') {
      return;
    }
    const playlistType = frag.type;
    if (part) {
      let activeParts = this.activePartLists[playlistType];
      if (!activeParts) {
        this.activePartLists[playlistType] = activeParts = [];
      }
      activeParts.push(part);
    }
    // Store the latest timeRanges loaded in the buffer
    this.timeRanges = timeRanges;
    const timeRange = timeRanges[type] as TimeRanges;
    this.detectEvictedFragments(type, timeRange, playlistType, part);
  }

  private onFragBuffered(event: Events.FRAG_BUFFERED, data: FragBufferedData) {
    this.detectPartialFragments(data);
  }

  private hasFragment(fragment: Fragment): boolean {
    const fragKey = getFragmentKey(fragment);
    return !!this.fragments[fragKey];
  }

  public hasFragments(type?: PlaylistLevelType): boolean {
    const { fragments } = this;
    const keys = Object.keys(fragments);
    if (!type) {
      return keys.length > 0;
    }
    for (let i = keys.length; i--; ) {
      const fragmentEntity = fragments[keys[i]];
      if (fragmentEntity?.body.type === type) {
        return true;
      }
    }
    return false;
  }

  public hasParts(type: PlaylistLevelType): boolean {
    return !!this.activePartLists[type]?.length;
  }

  public removeFragmentsInRange(
    start: number,
    end: number,
    playlistType: PlaylistLevelType,
    withGapOnly?: boolean,
    unbufferedOnly?: boolean,
  ) {
    if (withGapOnly && !this.hasGaps) {
      return;
    }
    Object.keys(this.fragments).forEach((key) => {
      const fragmentEntity = this.fragments[key];
      if (!fragmentEntity) {
        return;
      }
      const frag = fragmentEntity.body;
      if (frag.type !== playlistType || (withGapOnly && !frag.gap)) {
        return;
      }
      if (
        frag.start < end &&
        frag.end > start &&
        (fragmentEntity.buffered || unbufferedOnly)
      ) {
        this.removeFragment(frag);
      }
    });
  }

  public removeFragment(fragment: Fragment) {
    const fragKey = getFragmentKey(fragment);
    fragment.clearElementaryStreamInfo();
    const activeParts = this.activePartLists[fragment.type];
    if (activeParts) {
      const snToRemove = fragment.sn;
      this.activePartLists[fragment.type] = filterParts(
        activeParts,
        (part) => part.fragment.sn !== snToRemove,
      );
    }
    delete this.fragments[fragKey];
    if (fragment.endList) {
      delete this.endListFragments[fragment.type];
    }
  }

  public removeAllFragments() {
    this.fragments = Object.create(null);
    this.endListFragments = Object.create(null);
    this.activePartLists = Object.create(null);
    this.hasGaps = false;
    const partlist = this.hls?.latestLevelDetails?.partList;
    if (partlist) {
      partlist.forEach((part) => part.clearElementaryStreamInfo());
    }
  }
}

function isPartial(fragmentEntity: FragmentEntity): boolean {
  return (
    fragmentEntity.buffered &&
    !!(
      fragmentEntity.body.gap ||
      fragmentEntity.range.video?.partial ||
      fragmentEntity.range.audio?.partial ||
      fragmentEntity.range.audiovideo?.partial
    )
  );
}

function getFragmentKey(fragment: Fragment): string {
  return `${fragment.type}_${fragment.level}_${fragment.sn}`;
}

function filterParts(partList: Part[], predicate: (part: Part) => boolean) {
  return partList.filter((part) => {
    const keep = predicate(part);
    if (!keep) {
      part.clearElementaryStreamInfo();
    }
    return keep;
  });
}
