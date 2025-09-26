import BaseStreamController, { State } from './base-stream-controller';
import { findFragmentByPTS } from './fragment-finders';
import { FragmentState } from './fragment-tracker';
import { ErrorDetails, ErrorTypes } from '../errors';
import { Events } from '../events';
import {
  type Fragment,
  isMediaFragment,
  type MediaFragment,
} from '../loader/fragment';
import { Level } from '../types/level';
import { PlaylistLevelType } from '../types/loader';
import { BufferHelper } from '../utils/buffer-helper';
import { alignMediaPlaylistByPDT } from '../utils/discontinuities';
import {
  getAesModeFromFullSegmentMethod,
  isFullSegmentEncryption,
} from '../utils/encryption-methods-util';
import { addSliding } from '../utils/level-helper';
import { subtitleOptionsIdentical } from '../utils/media-option-attributes';
import type { FragmentTracker } from './fragment-tracker';
import type Hls from '../hls';
import type KeyLoader from '../loader/key-loader';
import type { LevelDetails } from '../loader/level-details';
import type { NetworkComponentAPI } from '../types/component-api';
import type {
  BufferFlushingData,
  ErrorData,
  FragLoadedData,
  LevelLoadedData,
  MediaDetachingData,
  SubtitleFragProcessed,
  SubtitleTracksUpdatedData,
  TrackLoadedData,
  TrackSwitchedData,
} from '../types/events';
import type { Bufferable } from '../utils/buffer-helper';

const TICK_INTERVAL = 500; // how often to tick in ms

interface TimeRange {
  start: number;
  end: number;
}

export class SubtitleStreamController
  extends BaseStreamController
  implements NetworkComponentAPI
{
  private currentTrackId: number = -1;
  private tracksBuffered: Array<TimeRange[]> = [];
  private mainDetails: LevelDetails | null = null;

  constructor(
    hls: Hls,
    fragmentTracker: FragmentTracker,
    keyLoader: KeyLoader,
  ) {
    super(
      hls,
      fragmentTracker,
      keyLoader,
      'subtitle-stream-controller',
      PlaylistLevelType.SUBTITLE,
    );
    this.registerListeners();
  }

  protected onHandlerDestroying() {
    this.unregisterListeners();
    super.onHandlerDestroying();
    this.mainDetails = null;
  }

  protected registerListeners() {
    super.registerListeners();
    const { hls } = this;
    hls.on(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.on(Events.SUBTITLE_TRACKS_UPDATED, this.onSubtitleTracksUpdated, this);
    hls.on(Events.SUBTITLE_TRACK_SWITCH, this.onSubtitleTrackSwitch, this);
    hls.on(Events.SUBTITLE_TRACK_LOADED, this.onSubtitleTrackLoaded, this);
    hls.on(Events.SUBTITLE_FRAG_PROCESSED, this.onSubtitleFragProcessed, this);
    hls.on(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
  }

  protected unregisterListeners() {
    super.unregisterListeners();
    const { hls } = this;
    hls.off(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.off(Events.SUBTITLE_TRACKS_UPDATED, this.onSubtitleTracksUpdated, this);
    hls.off(Events.SUBTITLE_TRACK_SWITCH, this.onSubtitleTrackSwitch, this);
    hls.off(Events.SUBTITLE_TRACK_LOADED, this.onSubtitleTrackLoaded, this);
    hls.off(Events.SUBTITLE_FRAG_PROCESSED, this.onSubtitleFragProcessed, this);
    hls.off(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
  }

  startLoad(startPosition: number, skipSeekToStartPosition?: boolean) {
    this.stopLoad();
    this.state = State.IDLE;

    this.setInterval(TICK_INTERVAL);

    this.nextLoadPosition = this.lastCurrentTime =
      startPosition + this.timelineOffset;
    this.startPosition = skipSeekToStartPosition ? -1 : startPosition;

    this.tick();
  }

  protected onManifestLoading() {
    super.onManifestLoading();
    this.mainDetails = null;
  }

  protected onMediaDetaching(
    event: Events.MEDIA_DETACHING,
    data: MediaDetachingData,
  ) {
    this.tracksBuffered = [];
    super.onMediaDetaching(event, data);
  }

  private onLevelLoaded(event: Events.LEVEL_LOADED, data: LevelLoadedData) {
    this.mainDetails = data.details;
  }

  private onSubtitleFragProcessed(
    event: Events.SUBTITLE_FRAG_PROCESSED,
    data: SubtitleFragProcessed,
  ) {
    const { frag, success } = data;
    if (!this.fragContextChanged(frag)) {
      if (isMediaFragment(frag)) {
        this.fragPrevious = frag;
      }
      this.state = State.IDLE;
    }
    if (!success) {
      return;
    }

    const buffered = this.tracksBuffered[this.currentTrackId];
    if (!buffered) {
      return;
    }

    // Create/update a buffered array matching the interface used by BufferHelper.bufferedInfo
    // so we can re-use the logic used to detect how much has been buffered
    let timeRange: TimeRange | undefined;
    const fragStart = frag.start;
    for (let i = 0; i < buffered.length; i++) {
      if (fragStart >= buffered[i].start && fragStart <= buffered[i].end) {
        timeRange = buffered[i];
        break;
      }
    }

    const fragEnd = frag.start + frag.duration;
    if (timeRange) {
      timeRange.end = fragEnd;
    } else {
      timeRange = {
        start: fragStart,
        end: fragEnd,
      };
      buffered.push(timeRange);
    }
    this.fragmentTracker.fragBuffered(frag as MediaFragment);
    this.fragBufferedComplete(frag, null);
    if (this.media) {
      this.tick();
    }
  }

  private onBufferFlushing(
    event: Events.BUFFER_FLUSHING,
    data: BufferFlushingData,
  ) {
    const { startOffset, endOffset } = data;
    if (startOffset === 0 && endOffset !== Number.POSITIVE_INFINITY) {
      const endOffsetSubtitles = endOffset - 1;
      if (endOffsetSubtitles <= 0) {
        return;
      }
      data.endOffsetSubtitles = Math.max(0, endOffsetSubtitles);
      this.tracksBuffered.forEach((buffered) => {
        for (let i = 0; i < buffered.length; ) {
          if (buffered[i].end <= endOffsetSubtitles) {
            buffered.shift();
            continue;
          } else if (buffered[i].start < endOffsetSubtitles) {
            buffered[i].start = endOffsetSubtitles;
          } else {
            break;
          }
          i++;
        }
      });
      this.fragmentTracker.removeFragmentsInRange(
        startOffset,
        endOffsetSubtitles,
        PlaylistLevelType.SUBTITLE,
      );
    }
  }

  // If something goes wrong, proceed to next frag, if we were processing one.
  protected onError(event: Events.ERROR, data: ErrorData) {
    const frag = data.frag;

    if (frag?.type === PlaylistLevelType.SUBTITLE) {
      if (data.details === ErrorDetails.FRAG_GAP) {
        this.fragmentTracker.fragBuffered(frag as MediaFragment, true);
      }
      if (this.fragCurrent) {
        this.fragCurrent.abortRequests();
      }
      if (this.state !== State.STOPPED) {
        this.state = State.IDLE;
      }
    }
  }

  // Got all new subtitle levels.
  private onSubtitleTracksUpdated(
    event: Events.SUBTITLE_TRACKS_UPDATED,
    { subtitleTracks }: SubtitleTracksUpdatedData,
  ) {
    if (this.levels && subtitleOptionsIdentical(this.levels, subtitleTracks)) {
      this.levels = subtitleTracks.map(
        (mediaPlaylist) => new Level(mediaPlaylist),
      );
      return;
    }
    this.tracksBuffered = [];
    this.levels = subtitleTracks.map((mediaPlaylist) => {
      const level = new Level(mediaPlaylist);
      this.tracksBuffered[level.id] = [];
      return level;
    });
    this.fragmentTracker.removeFragmentsInRange(
      0,
      Number.POSITIVE_INFINITY,
      PlaylistLevelType.SUBTITLE,
    );
    this.fragPrevious = null;
    this.mediaBuffer = null;
  }

  private onSubtitleTrackSwitch(
    event: Events.SUBTITLE_TRACK_SWITCH,
    data: TrackSwitchedData,
  ) {
    this.currentTrackId = data.id;

    if (!this.levels?.length || this.currentTrackId === -1) {
      this.clearInterval();
      return;
    }

    // Check if track has the necessary details to load fragments
    const currentTrack = this.levels[this.currentTrackId];
    if (currentTrack?.details) {
      this.mediaBuffer = this.mediaBufferTimeRanges;
    } else {
      this.mediaBuffer = null;
    }
    if (currentTrack && this.state !== State.STOPPED) {
      this.setInterval(TICK_INTERVAL);
    }
  }

  // Got a new set of subtitle fragments.
  private onSubtitleTrackLoaded(
    event: Events.SUBTITLE_TRACK_LOADED,
    data: TrackLoadedData,
  ) {
    const { currentTrackId, levels } = this;
    const { details: newDetails, id: trackId } = data;
    if (!levels) {
      this.warn(`Subtitle tracks were reset while loading level ${trackId}`);
      return;
    }
    const track: Level = levels[trackId];
    if (trackId >= levels.length || !track) {
      return;
    }
    this.log(
      `Subtitle track ${trackId} loaded [${newDetails.startSN},${
        newDetails.endSN
      }]${
        newDetails.lastPartSn
          ? `[part-${newDetails.lastPartSn}-${newDetails.lastPartIndex}]`
          : ''
      },duration:${newDetails.totalduration}`,
    );
    this.mediaBuffer = this.mediaBufferTimeRanges;
    let sliding = 0;
    if (newDetails.live || track.details?.live) {
      if (newDetails.deltaUpdateFailed) {
        return;
      }
      const mainDetails = this.mainDetails;
      if (!mainDetails) {
        this.startFragRequested = false;
        return;
      }
      const mainSlidingStartFragment = mainDetails.fragments[0];
      if (!track.details) {
        if (newDetails.hasProgramDateTime && mainDetails.hasProgramDateTime) {
          alignMediaPlaylistByPDT(newDetails, mainDetails);
          sliding = newDetails.fragmentStart;
        } else if (mainSlidingStartFragment) {
          // line up live playlist with main so that fragments in range are loaded
          sliding = mainSlidingStartFragment.start;
          addSliding(newDetails, sliding);
        }
      } else {
        sliding = this.alignPlaylists(
          newDetails,
          track.details,
          this.levelLastLoaded?.details,
        );
        if (sliding === 0 && mainSlidingStartFragment) {
          // realign with main when there is no overlap with last refresh
          sliding = mainSlidingStartFragment.start;
          addSliding(newDetails, sliding);
        }
      }
      // compute start position if we are aligned with the main playlist
      if (mainDetails && !this.startFragRequested) {
        this.setStartPosition(mainDetails, sliding);
      }
    }
    track.details = newDetails;
    this.levelLastLoaded = track;

    if (trackId !== currentTrackId) {
      return;
    }

    this.hls.trigger(Events.SUBTITLE_TRACK_UPDATED, {
      details: newDetails,
      id: trackId,
      groupId: data.groupId,
    });

    // trigger handler right now
    this.tick();

    // If playlist is misaligned because of bad PDT or drift, delete details to resync with main on reload
    if (
      newDetails.live &&
      !this.fragCurrent &&
      this.media &&
      this.state === State.IDLE
    ) {
      const foundFrag = findFragmentByPTS(
        null,
        newDetails.fragments,
        this.media.currentTime,
        0,
      );
      if (!foundFrag) {
        this.warn('Subtitle playlist not aligned with playback');
        track.details = undefined;
      }
    }
  }

  _handleFragmentLoadComplete(fragLoadedData: FragLoadedData) {
    const { frag, payload } = fragLoadedData;
    const decryptData = frag.decryptdata;
    const hls = this.hls;

    if (this.fragContextChanged(frag)) {
      return;
    }
    // check to see if the payload needs to be decrypted
    if (
      payload &&
      payload.byteLength > 0 &&
      decryptData?.key &&
      decryptData.iv &&
      isFullSegmentEncryption(decryptData.method)
    ) {
      const startTime = performance.now();
      // decrypt the subtitles
      this.decrypter
        .decrypt(
          new Uint8Array(payload),
          decryptData.key.buffer,
          decryptData.iv.buffer,
          getAesModeFromFullSegmentMethod(decryptData.method),
        )
        .catch((err) => {
          hls.trigger(Events.ERROR, {
            type: ErrorTypes.MEDIA_ERROR,
            details: ErrorDetails.FRAG_DECRYPT_ERROR,
            fatal: false,
            error: err,
            reason: err.message,
            frag,
          });
          throw err;
        })
        .then((decryptedData) => {
          const endTime = performance.now();
          hls.trigger(Events.FRAG_DECRYPTED, {
            frag,
            payload: decryptedData,
            stats: {
              tstart: startTime,
              tdecrypt: endTime,
            },
          });
        })
        .catch((err) => {
          this.warn(`${err.name}: ${err.message}`);
          this.state = State.IDLE;
        });
    }
  }

  doTick() {
    if (!this.media) {
      this.state = State.IDLE;
      return;
    }

    if (this.state === State.IDLE) {
      const { currentTrackId, levels } = this;
      const track = levels?.[currentTrackId];
      if (!track || !levels.length || !track.details) {
        return;
      }
      if (this.waitForLive(track)) {
        return;
      }
      const { config } = this;
      const currentTime = this.getLoadPosition();
      const bufferedInfo = BufferHelper.bufferedInfo(
        this.tracksBuffered[this.currentTrackId] || [],
        currentTime,
        config.maxBufferHole,
      );
      const { end: targetBufferTime, len: bufferLen } = bufferedInfo;
      const trackDetails = track.details as LevelDetails;
      const maxBufLen =
        this.hls.maxBufferLength + trackDetails.levelTargetDuration;

      if (bufferLen > maxBufLen) {
        return;
      }
      const fragments = trackDetails.fragments;
      const fragLen = fragments.length;
      const end = trackDetails.edge;

      let foundFrag: MediaFragment | null = null;
      const fragPrevious = this.fragPrevious;
      if (targetBufferTime < end) {
        const tolerance = config.maxFragLookUpTolerance;
        const lookupTolerance =
          targetBufferTime > end - tolerance ? 0 : tolerance;
        foundFrag = findFragmentByPTS(
          fragPrevious,
          fragments,
          Math.max(fragments[0].start, targetBufferTime),
          lookupTolerance,
        );
        if (
          !foundFrag &&
          fragPrevious &&
          fragPrevious.start < fragments[0].start
        ) {
          foundFrag = fragments[0];
        }
      } else {
        foundFrag = fragments[fragLen - 1];
      }
      foundFrag = this.filterReplacedPrimary(foundFrag, track.details);
      if (!foundFrag) {
        return;
      }
      // Load earlier fragment in same discontinuity to make up for misaligned playlists and cues that extend beyond end of segment
      const curSNIdx = foundFrag.sn - trackDetails.startSN;
      const prevFrag = fragments[curSNIdx - 1];
      if (
        prevFrag &&
        prevFrag.cc === foundFrag.cc &&
        this.fragmentTracker.getState(prevFrag) === FragmentState.NOT_LOADED
      ) {
        foundFrag = prevFrag;
      }
      if (
        this.fragmentTracker.getState(foundFrag) === FragmentState.NOT_LOADED
      ) {
        // only load if fragment is not loaded
        const fragToLoad = this.mapToInitFragWhenRequired(foundFrag);
        if (fragToLoad) {
          this.loadFragment(fragToLoad, track, targetBufferTime);
        }
      }
    }
  }

  protected loadFragment(
    frag: Fragment,
    level: Level,
    targetBufferTime: number,
  ) {
    if (!isMediaFragment(frag)) {
      this._loadInitSegment(frag, level);
    } else {
      super.loadFragment(frag, level, targetBufferTime);
    }
  }

  get mediaBufferTimeRanges(): Bufferable {
    return new BufferableInstance(
      this.tracksBuffered[this.currentTrackId] || [],
    );
  }
}

class BufferableInstance implements Bufferable {
  public readonly buffered: TimeRanges;

  constructor(timeranges: TimeRange[]) {
    const getRange = (
      name: 'start' | 'end',
      index: number,
      length: number,
    ): number => {
      index = index >>> 0;
      if (index > length - 1) {
        throw new DOMException(
          `Failed to execute '${name}' on 'TimeRanges': The index provided (${index}) is greater than the maximum bound (${length})`,
        );
      }
      return timeranges[index][name];
    };
    this.buffered = {
      get length() {
        return timeranges.length;
      },
      end(index: number): number {
        return getRange('end', index, timeranges.length);
      },
      start(index: number): number {
        return getRange('start', index, timeranges.length);
      },
    };
  }
}
