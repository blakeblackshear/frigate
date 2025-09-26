import BaseStreamController, { State } from './base-stream-controller';
import { findFragmentByPTS } from './fragment-finders';
import { FragmentState } from './fragment-tracker';
import { MAX_START_GAP_JUMP } from './gap-controller';
import TransmuxerInterface from '../demux/transmuxer-interface';
import { ErrorDetails } from '../errors';
import { Events } from '../events';
import { changeTypeSupported } from '../is-supported';
import { ElementaryStreamTypes, isMediaFragment } from '../loader/fragment';
import { PlaylistContextType, PlaylistLevelType } from '../types/loader';
import { ChunkMetadata } from '../types/transmuxer';
import { BufferHelper } from '../utils/buffer-helper';
import { pickMostCompleteCodecName } from '../utils/codecs';
import {
  addEventListener,
  removeEventListener,
} from '../utils/event-listener-helper';
import { useAlternateAudio } from '../utils/rendition-helper';
import type { FragmentTracker } from './fragment-tracker';
import type Hls from '../hls';
import type { Fragment, MediaFragment } from '../loader/fragment';
import type KeyLoader from '../loader/key-loader';
import type { LevelDetails } from '../loader/level-details';
import type {
  BufferCreatedTrack,
  ExtendedSourceBuffer,
  SourceBufferName,
} from '../types/buffer';
import type { NetworkComponentAPI } from '../types/component-api';
import type {
  AudioTrackSwitchedData,
  AudioTrackSwitchingData,
  BufferCodecsData,
  BufferCreatedData,
  BufferEOSData,
  BufferFlushedData,
  ErrorData,
  FragBufferedData,
  FragLoadedData,
  FragParsingMetadataData,
  FragParsingUserdataData,
  LevelLoadedData,
  LevelLoadingData,
  LevelsUpdatedData,
  ManifestParsedData,
  MediaAttachedData,
  MediaDetachingData,
} from '../types/events';
import type { Level } from '../types/level';
import type { Track, TrackSet } from '../types/track';
import type { TransmuxerResult } from '../types/transmuxer';
import type { BufferInfo } from '../utils/buffer-helper';

const TICK_INTERVAL = 100; // how often to tick in ms

const enum AlternateAudio {
  DISABLED = 0,
  SWITCHING,
  SWITCHED,
}

export default class StreamController
  extends BaseStreamController
  implements NetworkComponentAPI
{
  private audioCodecSwap: boolean = false;
  private level: number = -1;
  private _forceStartLoad: boolean = false;
  private _hasEnoughToStart: boolean = false;
  private altAudio: AlternateAudio = AlternateAudio.DISABLED;
  private audioOnly: boolean = false;
  private fragPlaying: Fragment | null = null;
  private fragLastKbps: number = 0;
  private couldBacktrack: boolean = false;
  private backtrackFragment: Fragment | null = null;
  private audioCodecSwitch: boolean = false;
  private videoBuffer: ExtendedSourceBuffer | null = null;

  constructor(
    hls: Hls,
    fragmentTracker: FragmentTracker,
    keyLoader: KeyLoader,
  ) {
    super(
      hls,
      fragmentTracker,
      keyLoader,
      'stream-controller',
      PlaylistLevelType.MAIN,
    );
    this.registerListeners();
  }

  protected registerListeners() {
    super.registerListeners();
    const { hls } = this;
    hls.on(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.on(Events.LEVEL_LOADING, this.onLevelLoading, this);
    hls.on(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.on(
      Events.FRAG_LOAD_EMERGENCY_ABORTED,
      this.onFragLoadEmergencyAborted,
      this,
    );
    hls.on(Events.AUDIO_TRACK_SWITCHING, this.onAudioTrackSwitching, this);
    hls.on(Events.AUDIO_TRACK_SWITCHED, this.onAudioTrackSwitched, this);
    hls.on(Events.BUFFER_CREATED, this.onBufferCreated, this);
    hls.on(Events.BUFFER_FLUSHED, this.onBufferFlushed, this);
    hls.on(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
    hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
  }

  protected unregisterListeners() {
    super.unregisterListeners();
    const { hls } = this;
    hls.off(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.off(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.off(
      Events.FRAG_LOAD_EMERGENCY_ABORTED,
      this.onFragLoadEmergencyAborted,
      this,
    );
    hls.off(Events.AUDIO_TRACK_SWITCHING, this.onAudioTrackSwitching, this);
    hls.off(Events.AUDIO_TRACK_SWITCHED, this.onAudioTrackSwitched, this);
    hls.off(Events.BUFFER_CREATED, this.onBufferCreated, this);
    hls.off(Events.BUFFER_FLUSHED, this.onBufferFlushed, this);
    hls.off(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
    hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
  }

  protected onHandlerDestroying() {
    // @ts-ignore
    this.onMediaPlaying = this.onMediaSeeked = null;
    this.unregisterListeners();
    super.onHandlerDestroying();
  }

  public startLoad(
    startPosition: number,
    skipSeekToStartPosition?: boolean,
  ): void {
    if (this.levels) {
      const { lastCurrentTime, hls } = this;
      this.stopLoad();
      this.setInterval(TICK_INTERVAL);
      this.level = -1;
      if (!this.startFragRequested) {
        // determine load level
        let startLevel = hls.startLevel;
        if (startLevel === -1) {
          if (hls.config.testBandwidth && this.levels.length > 1) {
            // -1 : guess start Level by doing a bitrate test by loading first fragment of lowest quality level
            startLevel = 0;
            this.bitrateTest = true;
          } else {
            startLevel = hls.firstAutoLevel;
          }
        }
        // set new level to playlist loader : this will trigger start level load
        // hls.nextLoadLevel remains until it is set to a new value or until a new frag is successfully loaded
        hls.nextLoadLevel = startLevel;
        this.level = hls.loadLevel;
        this._hasEnoughToStart = !!skipSeekToStartPosition;
      }
      // if startPosition undefined but lastCurrentTime set, set startPosition to last currentTime
      if (
        lastCurrentTime > 0 &&
        startPosition === -1 &&
        !skipSeekToStartPosition
      ) {
        this.log(
          `Override startPosition with lastCurrentTime @${lastCurrentTime.toFixed(
            3,
          )}`,
        );
        startPosition = lastCurrentTime;
      }
      this.state = State.IDLE;
      this.nextLoadPosition = this.lastCurrentTime =
        startPosition + this.timelineOffset;
      this.startPosition = skipSeekToStartPosition ? -1 : startPosition;
      this.tick();
    } else {
      this._forceStartLoad = true;
      this.state = State.STOPPED;
    }
  }

  public stopLoad() {
    this._forceStartLoad = false;
    super.stopLoad();
  }

  protected doTick() {
    switch (this.state) {
      case State.WAITING_LEVEL: {
        const { levels, level } = this;
        const currentLevel = levels?.[level];
        const details = currentLevel?.details;
        if (
          details &&
          (!details.live ||
            (this.levelLastLoaded === currentLevel &&
              !this.waitForLive(currentLevel)))
        ) {
          if (this.waitForCdnTuneIn(details)) {
            break;
          }
          this.state = State.IDLE;
          break;
        } else if (this.hls.nextLoadLevel !== this.level) {
          this.state = State.IDLE;
          break;
        }
        break;
      }
      case State.FRAG_LOADING_WAITING_RETRY:
        this.checkRetryDate();
        break;
      default:
        break;
    }
    if (this.state === State.IDLE) {
      this.doTickIdle();
    }
    this.onTickEnd();
  }

  protected onTickEnd() {
    super.onTickEnd();
    if (this.media?.readyState && this.media.seeking === false) {
      this.lastCurrentTime = this.media.currentTime;
    }
    this.checkFragmentChanged();
  }

  private doTickIdle() {
    const { hls, levelLastLoaded, levels, media } = this;

    // if start level not parsed yet OR
    // if video not attached AND start fragment already requested OR start frag prefetch not enabled
    // exit loop, as we either need more info (level not parsed) or we need media to be attached to load new fragment
    if (
      levelLastLoaded === null ||
      (!media &&
        !this.primaryPrefetch &&
        (this.startFragRequested || !hls.config.startFragPrefetch))
    ) {
      return;
    }

    // If the "main" level is audio-only but we are loading an alternate track in the same group, do not load anything
    if (this.altAudio && this.audioOnly) {
      return;
    }

    const level = this.buffering ? hls.nextLoadLevel : hls.loadLevel;
    if (!levels?.[level]) {
      return;
    }

    const levelInfo = levels[level];

    // if buffer length is less than maxBufLen try to load a new fragment

    const bufferInfo = this.getMainFwdBufferInfo();
    if (bufferInfo === null) {
      return;
    }

    const lastDetails = this.getLevelDetails();
    if (lastDetails && this._streamEnded(bufferInfo, lastDetails)) {
      const data: BufferEOSData = {};
      if (this.altAudio === AlternateAudio.SWITCHED) {
        data.type = 'video';
      }

      this.hls.trigger(Events.BUFFER_EOS, data);
      this.state = State.ENDED;
      return;
    }
    if (!this.buffering) {
      return;
    }

    // set next load level : this will trigger a playlist load if needed
    if (hls.loadLevel !== level && hls.manualLevel === -1) {
      this.log(`Adapting to level ${level} from level ${this.level}`);
    }
    this.level = hls.nextLoadLevel = level;

    const levelDetails = levelInfo.details;
    // if level info not retrieved yet, switch state and wait for level retrieval
    // if live playlist, ensure that new playlist has been refreshed to avoid loading/try to load
    // a useless and outdated fragment (that might even introduce load error if it is already out of the live playlist)
    if (
      !levelDetails ||
      this.state === State.WAITING_LEVEL ||
      this.waitForLive(levelInfo)
    ) {
      this.level = level;
      this.state = State.WAITING_LEVEL;
      this.startFragRequested = false;
      return;
    }

    const bufferLen = bufferInfo.len;

    // compute max Buffer Length that we could get from this load level, based on level bitrate. don't buffer more than 60 MB and more than 30s
    const maxBufLen = this.getMaxBufferLength(levelInfo.maxBitrate);

    // Stay idle if we are still with buffer margins
    if (bufferLen >= maxBufLen) {
      return;
    }

    if (
      this.backtrackFragment &&
      this.backtrackFragment.start > bufferInfo.end
    ) {
      this.backtrackFragment = null;
    }
    const targetBufferTime = this.backtrackFragment
      ? this.backtrackFragment.start
      : bufferInfo.end;
    let frag = this.getNextFragment(targetBufferTime, levelDetails);
    // Avoid backtracking by loading an earlier segment in streams with segments that do not start with a key frame (flagged by `couldBacktrack`)
    if (
      this.couldBacktrack &&
      !this.fragPrevious &&
      frag &&
      isMediaFragment(frag) &&
      this.fragmentTracker.getState(frag) !== FragmentState.OK
    ) {
      const backtrackSn = (this.backtrackFragment ?? frag).sn as number;
      const fragIdx = backtrackSn - levelDetails.startSN;
      const backtrackFrag = levelDetails.fragments[fragIdx - 1];
      if ((backtrackFrag as any) && frag.cc === backtrackFrag.cc) {
        frag = backtrackFrag;
        this.fragmentTracker.removeFragment(backtrackFrag);
      }
    } else if (this.backtrackFragment && bufferInfo.len) {
      this.backtrackFragment = null;
    }
    // Avoid loop loading by using nextLoadPosition set for backtracking and skipping consecutive GAP tags
    if (frag && this.isLoopLoading(frag, targetBufferTime)) {
      const gapStart = frag.gap;
      if (!gapStart) {
        // Cleanup the fragment tracker before trying to find the next unbuffered fragment
        const type =
          this.audioOnly && !this.altAudio
            ? ElementaryStreamTypes.AUDIO
            : ElementaryStreamTypes.VIDEO;
        const mediaBuffer =
          (type === ElementaryStreamTypes.VIDEO
            ? this.videoBuffer
            : this.mediaBuffer) || this.media;
        if (mediaBuffer) {
          this.afterBufferFlushed(mediaBuffer, type, PlaylistLevelType.MAIN);
        }
      }
      frag = this.getNextFragmentLoopLoading(
        frag,
        levelDetails,
        bufferInfo,
        PlaylistLevelType.MAIN,
        maxBufLen,
      );
    }
    if (!frag) {
      return;
    }
    if (frag.initSegment && !frag.initSegment.data && !this.bitrateTest) {
      frag = frag.initSegment;
    }

    this.loadFragment(frag, levelInfo, targetBufferTime);
  }

  protected loadFragment(
    frag: Fragment,
    level: Level,
    targetBufferTime: number,
  ) {
    // Check if fragment is not loaded
    const fragState = this.fragmentTracker.getState(frag);
    if (
      fragState === FragmentState.NOT_LOADED ||
      fragState === FragmentState.PARTIAL
    ) {
      if (!isMediaFragment(frag)) {
        this._loadInitSegment(frag, level);
      } else if (this.bitrateTest) {
        this.log(
          `Fragment ${frag.sn} of level ${frag.level} is being downloaded to test bitrate and will not be buffered`,
        );
        this._loadBitrateTestFrag(frag, level);
      } else {
        super.loadFragment(frag, level, targetBufferTime);
      }
    } else {
      this.clearTrackerIfNeeded(frag);
    }
  }

  private getBufferedFrag(position: number) {
    return this.fragmentTracker.getBufferedFrag(
      position,
      PlaylistLevelType.MAIN,
    );
  }

  private followingBufferedFrag(frag: Fragment | null) {
    if (frag) {
      // try to get range of next fragment (500ms after this range)
      return this.getBufferedFrag(frag.end + 0.5);
    }
    return null;
  }

  /*
    on immediate level switch :
     - pause playback if playing
     - cancel any pending load request
     - and trigger a buffer flush
  */
  public immediateLevelSwitch() {
    this.abortCurrentFrag();
    this.flushMainBuffer(0, Number.POSITIVE_INFINITY);
  }

  /**
   * try to switch ASAP without breaking video playback:
   * in order to ensure smooth but quick level switching,
   * we need to find the next flushable buffer range
   * we should take into account new segment fetch time
   */
  public nextLevelSwitch() {
    const { levels, media } = this;
    // ensure that media is defined and that metadata are available (to retrieve currentTime)
    if (media?.readyState) {
      let fetchdelay;
      const fragPlayingCurrent = this.getAppendedFrag(media.currentTime);
      if (fragPlayingCurrent && fragPlayingCurrent.start > 1) {
        // flush buffer preceding current fragment (flush until current fragment start offset)
        // minus 1s to avoid video freezing, that could happen if we flush keyframe of current video ...
        this.flushMainBuffer(0, fragPlayingCurrent.start - 1);
      }
      const levelDetails = this.getLevelDetails();
      if (levelDetails?.live) {
        const bufferInfo = this.getMainFwdBufferInfo();
        // Do not flush in live stream with low buffer
        if (!bufferInfo || bufferInfo.len < levelDetails.targetduration * 2) {
          return;
        }
      }
      if (!media.paused && levels) {
        // add a safety delay of 1s
        const nextLevelId = this.hls.nextLoadLevel;
        const nextLevel = levels[nextLevelId];
        const fragLastKbps = this.fragLastKbps;
        if (fragLastKbps && this.fragCurrent) {
          fetchdelay =
            (this.fragCurrent.duration * nextLevel.maxBitrate) /
              (1000 * fragLastKbps) +
            1;
        } else {
          fetchdelay = 0;
        }
      } else {
        fetchdelay = 0;
      }
      // this.log('fetchdelay:'+fetchdelay);
      // find buffer range that will be reached once new fragment will be fetched
      const bufferedFrag = this.getBufferedFrag(media.currentTime + fetchdelay);
      if (bufferedFrag) {
        // we can flush buffer range following this one without stalling playback
        const nextBufferedFrag = this.followingBufferedFrag(bufferedFrag);
        if (nextBufferedFrag) {
          // if we are here, we can also cancel any loading/demuxing in progress, as they are useless
          this.abortCurrentFrag();
          // start flush position is in next buffered frag. Leave some padding for non-independent segments and smoother playback.
          const maxStart = nextBufferedFrag.maxStartPTS
            ? nextBufferedFrag.maxStartPTS
            : nextBufferedFrag.start;
          const fragDuration = nextBufferedFrag.duration;
          const startPts = Math.max(
            bufferedFrag.end,
            maxStart +
              Math.min(
                Math.max(
                  fragDuration - this.config.maxFragLookUpTolerance,
                  fragDuration * (this.couldBacktrack ? 0.5 : 0.125),
                ),
                fragDuration * (this.couldBacktrack ? 0.75 : 0.25),
              ),
          );
          this.flushMainBuffer(startPts, Number.POSITIVE_INFINITY);
        }
      }
    }
  }

  private abortCurrentFrag() {
    const fragCurrent = this.fragCurrent;
    this.fragCurrent = null;
    this.backtrackFragment = null;
    if (fragCurrent) {
      fragCurrent.abortRequests();
      this.fragmentTracker.removeFragment(fragCurrent);
    }
    switch (this.state) {
      case State.KEY_LOADING:
      case State.FRAG_LOADING:
      case State.FRAG_LOADING_WAITING_RETRY:
      case State.PARSING:
      case State.PARSED:
        this.state = State.IDLE;
        break;
    }
    this.nextLoadPosition = this.getLoadPosition();
  }

  protected flushMainBuffer(startOffset: number, endOffset: number) {
    super.flushMainBuffer(
      startOffset,
      endOffset,
      this.altAudio === AlternateAudio.SWITCHED ? 'video' : null,
    );
  }

  protected onMediaAttached(
    event: Events.MEDIA_ATTACHED,
    data: MediaAttachedData,
  ) {
    super.onMediaAttached(event, data);
    const media = data.media;
    addEventListener(media, 'playing', this.onMediaPlaying);
    addEventListener(media, 'seeked', this.onMediaSeeked);
  }

  protected onMediaDetaching(
    event: Events.MEDIA_DETACHING,
    data: MediaDetachingData,
  ) {
    const { media } = this;
    if (media) {
      removeEventListener(media, 'playing', this.onMediaPlaying);
      removeEventListener(media, 'seeked', this.onMediaSeeked);
    }
    this.videoBuffer = null;
    this.fragPlaying = null;
    super.onMediaDetaching(event, data);
    const transferringMedia = !!data.transferMedia;
    if (transferringMedia) {
      return;
    }
    this._hasEnoughToStart = false;
  }

  private onMediaPlaying = () => {
    // tick to speed up FRAG_CHANGED triggering
    this.tick();
  };

  private onMediaSeeked = () => {
    const media = this.media;
    const currentTime = media ? media.currentTime : null;
    if (currentTime === null || !Number.isFinite(currentTime)) {
      return;
    }

    this.log(`Media seeked to ${currentTime.toFixed(3)}`);

    // If seeked was issued before buffer was appended do not tick immediately
    if (!this.getBufferedFrag(currentTime)) {
      return;
    }
    const bufferInfo = this.getFwdBufferInfoAtPos(
      media,
      currentTime,
      PlaylistLevelType.MAIN,
      0,
    );
    if (bufferInfo === null || bufferInfo.len === 0) {
      this.warn(
        `Main forward buffer length at ${currentTime} on "seeked" event ${
          bufferInfo ? bufferInfo.len : 'empty'
        })`,
      );
      return;
    }

    // tick to speed up FRAG_CHANGED triggering
    this.tick();
  };

  protected onManifestLoading() {
    super.onManifestLoading();
    // reset buffer on manifest loading
    this.log('Trigger BUFFER_RESET');
    this.hls.trigger(Events.BUFFER_RESET, undefined);
    this.couldBacktrack = false;
    this.fragLastKbps = 0;
    this.fragPlaying = this.backtrackFragment = null;
    this.altAudio = AlternateAudio.DISABLED;
    this.audioOnly = false;
  }

  private onManifestParsed(
    event: Events.MANIFEST_PARSED,
    data: ManifestParsedData,
  ) {
    // detect if we have different kind of audio codecs used amongst playlists
    let aac = false;
    let heaac = false;
    for (let i = 0; i < data.levels.length; i++) {
      const codec = data.levels[i].audioCodec;
      if (codec) {
        aac = aac || codec.indexOf('mp4a.40.2') !== -1;
        heaac = heaac || codec.indexOf('mp4a.40.5') !== -1;
      }
    }
    this.audioCodecSwitch = aac && heaac && !changeTypeSupported();
    if (this.audioCodecSwitch) {
      this.log(
        'Both AAC/HE-AAC audio found in levels; declaring level codec as HE-AAC',
      );
    }

    this.levels = data.levels;
    this.startFragRequested = false;
  }

  private onLevelLoading(event: Events.LEVEL_LOADING, data: LevelLoadingData) {
    const { levels } = this;
    if (!levels || this.state !== State.IDLE) {
      return;
    }
    const level = data.levelInfo;
    if (
      !level.details ||
      (level.details.live &&
        (this.levelLastLoaded !== level || level.details.expired)) ||
      this.waitForCdnTuneIn(level.details)
    ) {
      this.state = State.WAITING_LEVEL;
    }
  }

  private onLevelLoaded(event: Events.LEVEL_LOADED, data: LevelLoadedData) {
    const { levels, startFragRequested } = this;
    const newLevelId = data.level;
    const newDetails = data.details;
    const duration = newDetails.totalduration;

    if (!levels) {
      this.warn(`Levels were reset while loading level ${newLevelId}`);
      return;
    }
    this.log(
      `Level ${newLevelId} loaded [${newDetails.startSN},${newDetails.endSN}]${
        newDetails.lastPartSn
          ? `[part-${newDetails.lastPartSn}-${newDetails.lastPartIndex}]`
          : ''
      }, cc [${newDetails.startCC}, ${newDetails.endCC}] duration:${duration}`,
    );

    const curLevel = data.levelInfo;
    const fragCurrent = this.fragCurrent;
    if (
      fragCurrent &&
      (this.state === State.FRAG_LOADING ||
        this.state === State.FRAG_LOADING_WAITING_RETRY)
    ) {
      if (fragCurrent.level !== data.level && fragCurrent.loader) {
        this.abortCurrentFrag();
      }
    }

    let sliding = 0;
    if (newDetails.live || curLevel.details?.live) {
      this.checkLiveUpdate(newDetails);
      if (newDetails.deltaUpdateFailed) {
        return;
      }
      sliding = this.alignPlaylists(
        newDetails,
        curLevel.details,
        this.levelLastLoaded?.details,
      );
    }
    // override level info
    curLevel.details = newDetails;
    this.levelLastLoaded = curLevel;

    if (!startFragRequested) {
      this.setStartPosition(newDetails, sliding);
    }

    this.hls.trigger(Events.LEVEL_UPDATED, {
      details: newDetails,
      level: newLevelId,
    });

    // only switch back to IDLE state if we were waiting for level to start downloading a new fragment
    if (this.state === State.WAITING_LEVEL) {
      if (this.waitForCdnTuneIn(newDetails)) {
        // Wait for Low-Latency CDN Tune-in
        return;
      }
      this.state = State.IDLE;
    }

    if (startFragRequested && newDetails.live) {
      this.synchronizeToLiveEdge(newDetails);
    }

    // trigger handler right now
    this.tick();
  }

  private synchronizeToLiveEdge(levelDetails: LevelDetails) {
    const { config, media } = this;
    if (!media) {
      return;
    }
    const liveSyncPosition = this.hls.liveSyncPosition;
    const currentTime = this.getLoadPosition();
    const start = levelDetails.fragmentStart;
    const end = levelDetails.edge;
    const withinSlidingWindow =
      currentTime >= start - config.maxFragLookUpTolerance &&
      currentTime <= end;
    // Continue if we can seek forward to sync position or if current time is outside of sliding window
    if (
      liveSyncPosition !== null &&
      media.duration > liveSyncPosition &&
      (currentTime < liveSyncPosition || !withinSlidingWindow)
    ) {
      // Continue if buffer is starving or if current time is behind max latency
      const maxLatency =
        config.liveMaxLatencyDuration !== undefined
          ? config.liveMaxLatencyDuration
          : config.liveMaxLatencyDurationCount * levelDetails.targetduration;
      if (
        (!withinSlidingWindow && media.readyState < 4) ||
        currentTime < end - maxLatency
      ) {
        if (!this._hasEnoughToStart) {
          this.nextLoadPosition = liveSyncPosition;
        }
        // Only seek if ready and there is not a significant forward buffer available for playback
        if (media.readyState) {
          this.warn(
            `Playback: ${currentTime.toFixed(
              3,
            )} is located too far from the end of live sliding playlist: ${end}, reset currentTime to : ${liveSyncPosition.toFixed(
              3,
            )}`,
          );

          if (this.config.liveSyncMode === 'buffered') {
            const bufferInfo = BufferHelper.bufferInfo(
              media,
              liveSyncPosition,
              0,
            );

            if (!bufferInfo.buffered?.length) {
              media.currentTime = liveSyncPosition;
              return;
            }

            const isLiveSyncInBuffer = bufferInfo.start <= currentTime;

            if (isLiveSyncInBuffer) {
              media.currentTime = liveSyncPosition;
              return;
            }

            const { nextStart } = BufferHelper.bufferedInfo(
              bufferInfo.buffered,
              currentTime,
              0,
            );
            if (nextStart) {
              media.currentTime = nextStart;
            }
          } else {
            media.currentTime = liveSyncPosition;
          }
        }
      }
    }
  }

  protected _handleFragmentLoadProgress(data: FragLoadedData) {
    const frag = data.frag as MediaFragment;
    const { part, payload } = data;
    const { levels } = this;
    if (!levels) {
      this.warn(
        `Levels were reset while fragment load was in progress. Fragment ${frag.sn} of level ${frag.level} will not be buffered`,
      );
      return;
    }
    const currentLevel = levels[frag.level];
    if (!currentLevel as any) {
      this.warn(`Level ${frag.level} not found on progress`);
      return;
    }
    const details = currentLevel.details;
    if (!details) {
      this.warn(
        `Dropping fragment ${frag.sn} of level ${frag.level} after level details were reset`,
      );
      this.fragmentTracker.removeFragment(frag);
      return;
    }
    const videoCodec = currentLevel.videoCodec;

    // time Offset is accurate if level PTS is known, or if playlist is not sliding (not live)
    const accurateTimeOffset = details.PTSKnown || !details.live;
    const initSegmentData = frag.initSegment?.data;
    const audioCodec = this._getAudioCodec(currentLevel);

    // transmux the MPEG-TS data to ISO-BMFF segments
    // this.log(`Transmuxing ${frag.sn} of [${details.startSN} ,${details.endSN}],level ${frag.level}, cc ${frag.cc}`);
    const transmuxer = (this.transmuxer =
      this.transmuxer ||
      new TransmuxerInterface(
        this.hls,
        PlaylistLevelType.MAIN,
        this._handleTransmuxComplete.bind(this),
        this._handleTransmuxerFlush.bind(this),
      ));
    const partIndex = part ? part.index : -1;
    const partial = partIndex !== -1;
    const chunkMeta = new ChunkMetadata(
      frag.level,
      frag.sn,
      frag.stats.chunkCount,
      payload.byteLength,
      partIndex,
      partial,
    );
    const initPTS = this.initPTS[frag.cc];

    transmuxer.push(
      payload,
      initSegmentData,
      audioCodec,
      videoCodec,
      frag,
      part,
      details.totalduration,
      accurateTimeOffset,
      chunkMeta,
      initPTS,
    );
  }

  private onAudioTrackSwitching(
    event: Events.AUDIO_TRACK_SWITCHING,
    data: AudioTrackSwitchingData,
  ) {
    const hls = this.hls;
    // if any URL found on new audio track, it is an alternate audio track
    const fromAltAudio = this.altAudio === AlternateAudio.SWITCHED;
    const altAudio = useAlternateAudio(data.url, hls);
    // if we switch on main audio, ensure that main fragment scheduling is synced with media.buffered
    // don't do anything if we switch to alt audio: audio stream controller is handling it.
    // we will just have to change buffer scheduling on audioTrackSwitched
    if (!altAudio) {
      if (this.mediaBuffer !== this.media) {
        this.log(
          'Switching on main audio, use media.buffered to schedule main fragment loading',
        );
        this.mediaBuffer = this.media;
        const fragCurrent = this.fragCurrent;
        // we need to refill audio buffer from main: cancel any frag loading to speed up audio switch
        if (fragCurrent) {
          this.log('Switching to main audio track, cancel main fragment load');
          fragCurrent.abortRequests();
          this.fragmentTracker.removeFragment(fragCurrent);
        }
        // destroy transmuxer to force init segment generation (following audio switch)
        this.resetTransmuxer();
        // switch to IDLE state to load new fragment
        this.resetLoadingState();
      } else if (this.audioOnly) {
        // Reset audio transmuxer so when switching back to main audio we're not still appending where we left off
        this.resetTransmuxer();
      }
      // If switching from alt to main audio, flush all audio and trigger track switched
      if (fromAltAudio) {
        this.fragmentTracker.removeAllFragments();
        hls.once(Events.BUFFER_FLUSHED, () => {
          if (!this.hls as any) {
            return;
          }
          this.hls.trigger(Events.AUDIO_TRACK_SWITCHED, data);
        });
        hls.trigger(Events.BUFFER_FLUSHING, {
          startOffset: 0,
          endOffset: Number.POSITIVE_INFINITY,
          type: null,
        });
        return;
      }
      hls.trigger(Events.AUDIO_TRACK_SWITCHED, data);
    } else {
      this.altAudio = AlternateAudio.SWITCHING;
    }
  }

  private onAudioTrackSwitched(
    event: Events.AUDIO_TRACK_SWITCHED,
    data: AudioTrackSwitchedData,
  ) {
    const altAudio = useAlternateAudio(data.url, this.hls);
    if (altAudio) {
      const videoBuffer = this.videoBuffer;
      // if we switched on alternate audio, ensure that main fragment scheduling is synced with video sourcebuffer buffered
      if (videoBuffer && this.mediaBuffer !== videoBuffer) {
        this.log(
          'Switching on alternate audio, use video.buffered to schedule main fragment loading',
        );
        this.mediaBuffer = videoBuffer;
      }
    }
    this.altAudio = altAudio
      ? AlternateAudio.SWITCHED
      : AlternateAudio.DISABLED;
    this.tick();
  }

  private onBufferCreated(
    event: Events.BUFFER_CREATED,
    data: BufferCreatedData,
  ) {
    const tracks = data.tracks;
    let mediaTrack: BufferCreatedTrack | undefined;
    let name: string | undefined;
    let alternate = false;
    for (const type in tracks) {
      const track: BufferCreatedTrack = tracks[type];
      if (track.id === 'main') {
        name = type;
        mediaTrack = track;
        // keep video source buffer reference
        if (type === 'video') {
          const videoTrack = tracks[type];
          if (videoTrack) {
            this.videoBuffer = videoTrack.buffer;
          }
        }
      } else {
        alternate = true;
      }
    }
    if (alternate && mediaTrack) {
      this.log(
        `Alternate track found, use ${name}.buffered to schedule main fragment loading`,
      );
      this.mediaBuffer = mediaTrack.buffer;
    } else {
      this.mediaBuffer = this.media;
    }
  }

  private onFragBuffered(event: Events.FRAG_BUFFERED, data: FragBufferedData) {
    const { frag, part } = data;
    const bufferedMainFragment = frag.type === PlaylistLevelType.MAIN;
    if (bufferedMainFragment) {
      if (this.fragContextChanged(frag)) {
        // If a level switch was requested while a fragment was buffering, it will emit the FRAG_BUFFERED event upon completion
        // Avoid setting state back to IDLE, since that will interfere with a level switch
        this.warn(
          `Fragment ${frag.sn}${part ? ' p: ' + part.index : ''} of level ${
            frag.level
          } finished buffering, but was aborted. state: ${this.state}`,
        );
        if (this.state === State.PARSED) {
          this.state = State.IDLE;
        }
        return;
      }
      const stats = part ? part.stats : frag.stats;
      this.fragLastKbps = Math.round(
        (8 * stats.total) / (stats.buffering.end - stats.loading.first),
      );
      if (isMediaFragment(frag)) {
        this.fragPrevious = frag;
      }
      this.fragBufferedComplete(frag, part);
    }

    const media = this.media;
    if (!media) {
      return;
    }
    if (!this._hasEnoughToStart && BufferHelper.getBuffered(media).length) {
      this._hasEnoughToStart = true;
      this.seekToStartPos();
    }
    if (bufferedMainFragment) {
      this.tick();
    }
  }

  public get hasEnoughToStart(): boolean {
    return this._hasEnoughToStart;
  }

  protected onError(event: Events.ERROR, data: ErrorData) {
    if (data.fatal) {
      this.state = State.ERROR;
      return;
    }
    switch (data.details) {
      case ErrorDetails.FRAG_GAP:
      case ErrorDetails.FRAG_PARSING_ERROR:
      case ErrorDetails.FRAG_DECRYPT_ERROR:
      case ErrorDetails.FRAG_LOAD_ERROR:
      case ErrorDetails.FRAG_LOAD_TIMEOUT:
      case ErrorDetails.KEY_LOAD_ERROR:
      case ErrorDetails.KEY_LOAD_TIMEOUT:
        this.onFragmentOrKeyLoadError(PlaylistLevelType.MAIN, data);
        break;
      case ErrorDetails.LEVEL_LOAD_ERROR:
      case ErrorDetails.LEVEL_LOAD_TIMEOUT:
      case ErrorDetails.LEVEL_PARSING_ERROR:
        // in case of non fatal error while loading level, if level controller is not retrying to load level, switch back to IDLE
        if (
          !data.levelRetry &&
          this.state === State.WAITING_LEVEL &&
          data.context?.type === PlaylistContextType.LEVEL
        ) {
          this.state = State.IDLE;
        }
        break;
      case ErrorDetails.BUFFER_ADD_CODEC_ERROR:
      case ErrorDetails.BUFFER_APPEND_ERROR:
        if (data.parent !== 'main') {
          return;
        }
        if (this.reduceLengthAndFlushBuffer(data)) {
          this.resetLoadingState();
        }
        break;
      case ErrorDetails.BUFFER_FULL_ERROR:
        if (data.parent !== 'main') {
          return;
        }
        if (this.reduceLengthAndFlushBuffer(data)) {
          const isAssetPlayer =
            !this.config.interstitialsController && this.config.assetPlayerId;
          if (isAssetPlayer) {
            // Use currentTime in buffer estimate to prevent loading more until playback advances
            this._hasEnoughToStart = true;
          } else {
            this.flushMainBuffer(0, Number.POSITIVE_INFINITY);
          }
        }
        break;
      case ErrorDetails.INTERNAL_EXCEPTION:
        this.recoverWorkerError(data);
        break;
      default:
        break;
    }
  }

  private onFragLoadEmergencyAborted() {
    this.state = State.IDLE;
    // if loadedmetadata is not set, it means that we are emergency switch down on first frag
    // in that case, reset startFragRequested flag
    if (!this._hasEnoughToStart) {
      this.startFragRequested = false;
      this.nextLoadPosition = this.lastCurrentTime;
    }
    this.tickImmediate();
  }

  private onBufferFlushed(
    event: Events.BUFFER_FLUSHED,
    { type }: BufferFlushedData,
  ) {
    if (type !== ElementaryStreamTypes.AUDIO || !this.altAudio) {
      const mediaBuffer =
        (type === ElementaryStreamTypes.VIDEO
          ? this.videoBuffer
          : this.mediaBuffer) || this.media;
      if (mediaBuffer) {
        this.afterBufferFlushed(mediaBuffer, type, PlaylistLevelType.MAIN);
        this.tick();
      }
    }
  }

  private onLevelsUpdated(
    event: Events.LEVELS_UPDATED,
    data: LevelsUpdatedData,
  ) {
    if (this.level > -1 && this.fragCurrent) {
      this.level = this.fragCurrent.level;
      if (this.level === -1) {
        this.resetWhenMissingContext(this.fragCurrent);
      }
    }
    this.levels = data.levels;
  }

  public swapAudioCodec() {
    this.audioCodecSwap = !this.audioCodecSwap;
  }

  /**
   * Seeks to the set startPosition if not equal to the mediaElement's current time.
   */
  protected seekToStartPos() {
    const { media } = this;
    if (!media) {
      return;
    }
    const currentTime = media.currentTime;
    let startPosition = this.startPosition;
    // only adjust currentTime if different from startPosition or if startPosition not buffered
    // at that stage, there should be only one buffered range, as we reach that code after first fragment has been buffered
    if (startPosition >= 0 && currentTime < startPosition) {
      if (media.seeking) {
        this.log(
          `could not seek to ${startPosition}, already seeking at ${currentTime}`,
        );
        return;
      }

      // Offset start position by timeline offset
      const timelineOffset = this.timelineOffset;
      if (timelineOffset && startPosition) {
        startPosition += timelineOffset;
      }
      const details = this.getLevelDetails();
      const buffered = BufferHelper.getBuffered(media);
      const bufferStart = buffered.length ? buffered.start(0) : 0;
      const delta = bufferStart - startPosition;
      const skipTolerance = Math.max(
        this.config.maxBufferHole,
        this.config.maxFragLookUpTolerance,
      );
      if (
        this.config.startOnSegmentBoundary ||
        (delta > 0 &&
          (delta < skipTolerance ||
            (this.loadingParts && delta < 2 * (details?.partTarget || 0))))
      ) {
        this.log(`adjusting start position by ${delta} to match buffer start`);
        startPosition += delta;
        this.startPosition = startPosition;
      }
      if (currentTime < startPosition) {
        this.log(
          `seek to target start position ${startPosition} from current time ${currentTime} buffer start ${bufferStart}`,
        );
        media.currentTime = startPosition;
      }
    }
  }

  private _getAudioCodec(currentLevel) {
    let audioCodec = this.config.defaultAudioCodec || currentLevel.audioCodec;
    if (this.audioCodecSwap && audioCodec) {
      this.log('Swapping audio codec');
      if (audioCodec.indexOf('mp4a.40.5') !== -1) {
        audioCodec = 'mp4a.40.2';
      } else {
        audioCodec = 'mp4a.40.5';
      }
    }

    return audioCodec;
  }

  private _loadBitrateTestFrag(fragment: Fragment, level: Level) {
    fragment.bitrateTest = true;
    this._doFragLoad(fragment, level)
      .then((data) => {
        const { hls } = this;
        const frag = data?.frag;
        if (!frag || this.fragContextChanged(frag)) {
          return;
        }
        level.fragmentError = 0;
        this.state = State.IDLE;
        this.startFragRequested = false;
        this.bitrateTest = false;
        const stats = frag.stats;
        // Bitrate tests fragments are neither parsed nor buffered
        stats.parsing.start =
          stats.parsing.end =
          stats.buffering.start =
          stats.buffering.end =
            self.performance.now();
        hls.trigger(Events.FRAG_LOADED, data as FragLoadedData);
        frag.bitrateTest = false;
      })
      .catch((reason) => {
        if (this.state === State.STOPPED || this.state === State.ERROR) {
          return;
        }
        this.warn(reason);
        this.resetFragmentLoading(fragment);
      });
  }

  private _handleTransmuxComplete(transmuxResult: TransmuxerResult) {
    const id = this.playlistType;
    const { hls } = this;
    const { remuxResult, chunkMeta } = transmuxResult;

    const context = this.getCurrentContext(chunkMeta);
    if (!context) {
      this.resetWhenMissingContext(chunkMeta);
      return;
    }
    const { frag, part, level } = context;
    const { video, text, id3, initSegment } = remuxResult;
    const { details } = level;
    // The audio-stream-controller handles audio buffering if Hls.js is playing an alternate audio track
    const audio = this.altAudio ? undefined : remuxResult.audio;

    // Check if the current fragment has been aborted. We check this by first seeing if we're still playing the current level.
    // If we are, subsequently check if the currently loading fragment (fragCurrent) has changed.
    if (this.fragContextChanged(frag)) {
      this.fragmentTracker.removeFragment(frag);
      return;
    }

    this.state = State.PARSING;

    if (initSegment) {
      const tracks = initSegment.tracks;
      if (tracks) {
        const mapFragment = frag.initSegment || frag;
        if (this.unhandledEncryptionError(initSegment, frag)) {
          return;
        }
        this._bufferInitSegment(level, tracks, mapFragment, chunkMeta);
        hls.trigger(Events.FRAG_PARSING_INIT_SEGMENT, {
          frag: mapFragment,
          id,
          tracks,
        });
      }

      const baseTime = initSegment.initPTS as number;
      const timescale = initSegment.timescale as number;
      const initPTS = this.initPTS[frag.cc];
      if (
        Number.isFinite(baseTime) &&
        ((!initPTS as any) ||
          initPTS.baseTime !== baseTime ||
          initPTS.timescale !== timescale)
      ) {
        const trackId = initSegment.trackId as number;
        this.initPTS[frag.cc] = {
          baseTime,
          timescale,
          trackId,
        };
        hls.trigger(Events.INIT_PTS_FOUND, {
          frag,
          id,
          initPTS: baseTime,
          timescale,
          trackId,
        });
      }
    }

    // Avoid buffering if backtracking this fragment
    if (video && details) {
      if (audio && video.type === 'audiovideo') {
        this.logMuxedErr(frag);
      }
      const prevFrag = details.fragments[frag.sn - 1 - details.startSN];
      const isFirstFragment = frag.sn === details.startSN;
      const isFirstInDiscontinuity =
        (!prevFrag as any) || frag.cc > prevFrag.cc;
      if (remuxResult.independent !== false) {
        const { startPTS, endPTS, startDTS, endDTS } = video;
        if (part) {
          part.elementaryStreams[video.type] = {
            startPTS,
            endPTS,
            startDTS,
            endDTS,
          };
        } else {
          if (
            video.firstKeyFrame &&
            video.independent &&
            chunkMeta.id === 1 &&
            !isFirstInDiscontinuity
          ) {
            this.couldBacktrack = true;
          }
          if (video.dropped && video.independent) {
            // Backtrack if dropped frames create a gap after currentTime

            const bufferInfo = this.getMainFwdBufferInfo();
            const targetBufferTime =
              (bufferInfo ? bufferInfo.end : this.getLoadPosition()) +
              this.config.maxBufferHole;
            const startTime = video.firstKeyFramePTS
              ? video.firstKeyFramePTS
              : startPTS;
            if (
              !isFirstFragment &&
              targetBufferTime < startTime - this.config.maxBufferHole &&
              !isFirstInDiscontinuity
            ) {
              this.backtrack(frag);
              return;
            } else if (isFirstInDiscontinuity) {
              // Mark segment with a gap to avoid loop loading
              frag.gap = true;
            }
            // Set video stream start to fragment start so that truncated samples do not distort the timeline, and mark it partial
            frag.setElementaryStreamInfo(
              video.type as ElementaryStreamTypes,
              frag.start,
              endPTS,
              frag.start,
              endDTS,
              true,
            );
          } else if (
            isFirstFragment &&
            startPTS - (details.appliedTimelineOffset || 0) > MAX_START_GAP_JUMP
          ) {
            // Mark segment with a gap to skip large start gap
            frag.gap = true;
          }
        }
        frag.setElementaryStreamInfo(
          video.type as ElementaryStreamTypes,
          startPTS,
          endPTS,
          startDTS,
          endDTS,
        );
        if (this.backtrackFragment) {
          this.backtrackFragment = frag;
        }
        this.bufferFragmentData(
          video,
          frag,
          part,
          chunkMeta,
          isFirstFragment || isFirstInDiscontinuity,
        );
      } else if (isFirstFragment || isFirstInDiscontinuity) {
        // Mark segment with a gap to avoid loop loading
        frag.gap = true;
      } else {
        this.backtrack(frag);
        return;
      }
    }

    if (audio) {
      const { startPTS, endPTS, startDTS, endDTS } = audio;
      if (part) {
        part.elementaryStreams[ElementaryStreamTypes.AUDIO] = {
          startPTS,
          endPTS,
          startDTS,
          endDTS,
        };
      }
      frag.setElementaryStreamInfo(
        ElementaryStreamTypes.AUDIO,
        startPTS,
        endPTS,
        startDTS,
        endDTS,
      );
      this.bufferFragmentData(audio, frag, part, chunkMeta);
    }

    if (details && id3?.samples.length) {
      const emittedID3: FragParsingMetadataData = {
        id,
        frag,
        details,
        samples: id3.samples,
      };
      hls.trigger(Events.FRAG_PARSING_METADATA, emittedID3);
    }
    if (details && text) {
      const emittedText: FragParsingUserdataData = {
        id,
        frag,
        details,
        samples: text.samples,
      };
      hls.trigger(Events.FRAG_PARSING_USERDATA, emittedText);
    }
  }

  private logMuxedErr(frag: Fragment) {
    this.warn(
      `${isMediaFragment(frag) ? 'Media' : 'Init'} segment with muxed audiovideo where only video expected: ${frag.url}`,
    );
  }

  private _bufferInitSegment(
    currentLevel: Level,
    tracks: TrackSet,
    frag: Fragment,
    chunkMeta: ChunkMetadata,
  ) {
    if (this.state !== State.PARSING) {
      return;
    }

    this.audioOnly = !!tracks.audio && !tracks.video;

    // if audio track is expected to come from audio stream controller, discard any coming from main
    if (this.altAudio && !this.audioOnly) {
      delete tracks.audio;
      if (tracks.audiovideo) {
        this.logMuxedErr(frag);
      }
    }
    // include levelCodec in audio and video tracks
    const { audio, video, audiovideo } = tracks;
    if (audio) {
      const levelCodec = currentLevel.audioCodec;
      let audioCodec = pickMostCompleteCodecName(audio.codec, levelCodec);
      // Add level and profile to make up for remuxer not being able to parse full codec
      // (logger warning "Unhandled audio codec...")
      if (audioCodec === 'mp4a') {
        audioCodec = 'mp4a.40.5';
      }
      // Handle `audioCodecSwitch`
      const ua = navigator.userAgent.toLowerCase();
      if (this.audioCodecSwitch) {
        if (audioCodec) {
          if (audioCodec.indexOf('mp4a.40.5') !== -1) {
            audioCodec = 'mp4a.40.2';
          } else {
            audioCodec = 'mp4a.40.5';
          }
        }
        // In the case that AAC and HE-AAC audio codecs are signalled in manifest,
        // force HE-AAC, as it seems that most browsers prefers it.
        // don't force HE-AAC if mono stream, or in Firefox
        const audioMetadata = audio.metadata;
        if (
          audioMetadata &&
          'channelCount' in audioMetadata &&
          (audioMetadata.channelCount || 1) !== 1 &&
          ua.indexOf('firefox') === -1
        ) {
          audioCodec = 'mp4a.40.5';
        }
      }
      // HE-AAC is broken on Android, always signal audio codec as AAC even if variant manifest states otherwise
      if (
        audioCodec &&
        audioCodec.indexOf('mp4a.40.5') !== -1 &&
        ua.indexOf('android') !== -1 &&
        audio.container !== 'audio/mpeg'
      ) {
        // Exclude mpeg audio
        audioCodec = 'mp4a.40.2';
        this.log(`Android: force audio codec to ${audioCodec}`);
      }
      if (levelCodec && levelCodec !== audioCodec) {
        this.log(
          `Swapping manifest audio codec "${levelCodec}" for "${audioCodec}"`,
        );
      }
      audio.levelCodec = audioCodec;
      audio.id = PlaylistLevelType.MAIN;
      this.log(
        `Init audio buffer, container:${
          audio.container
        }, codecs[selected/level/parsed]=[${audioCodec || ''}/${
          levelCodec || ''
        }/${audio.codec}]`,
      );
      delete tracks.audiovideo;
    }
    if (video) {
      video.levelCodec = currentLevel.videoCodec;
      video.id = PlaylistLevelType.MAIN;
      const parsedVideoCodec = video.codec;
      if (parsedVideoCodec?.length === 4) {
        // Make up for passthrough-remuxer not being able to parse full codec
        // (logger warning "Unhandled video codec...")
        switch (parsedVideoCodec) {
          case 'hvc1':
          case 'hev1':
            video.codec = 'hvc1.1.6.L120.90';
            break;
          case 'av01':
            video.codec = 'av01.0.04M.08';
            break;
          case 'avc1':
            video.codec = 'avc1.42e01e';
            break;
        }
      }
      this.log(
        `Init video buffer, container:${
          video.container
        }, codecs[level/parsed]=[${currentLevel.videoCodec || ''}/${
          parsedVideoCodec
        }]${video.codec !== parsedVideoCodec ? ' parsed-corrected=' + video.codec : ''}${video.supplemental ? ' supplemental=' + video.supplemental : ''}`,
      );
      delete tracks.audiovideo;
    }
    if (audiovideo) {
      this.log(
        `Init audiovideo buffer, container:${audiovideo.container}, codecs[level/parsed]=[${currentLevel.codecs}/${audiovideo.codec}]`,
      );
      delete tracks.video;
      delete tracks.audio;
    }
    const trackTypes = Object.keys(tracks);
    if (trackTypes.length) {
      this.hls.trigger(Events.BUFFER_CODECS, tracks as BufferCodecsData);
      if (!this.hls as any) {
        // Exit after fatal tracks error
        return;
      }
      // loop through tracks that are going to be provided to bufferController
      trackTypes.forEach((trackName) => {
        const track = tracks[trackName] as Track;
        const initSegment = track.initSegment;
        if (initSegment?.byteLength) {
          this.hls.trigger(Events.BUFFER_APPENDING, {
            type: trackName as SourceBufferName,
            data: initSegment,
            frag,
            part: null,
            chunkMeta,
            parent: frag.type,
          });
        }
      });
    }
    // trigger handler right now
    this.tickImmediate();
  }

  public getMainFwdBufferInfo(): BufferInfo | null {
    // Observe video SourceBuffer (this.mediaBuffer) only when alt-audio is used, otherwise observe combined media buffer
    const bufferOutput =
      this.mediaBuffer && this.altAudio === AlternateAudio.SWITCHED
        ? this.mediaBuffer
        : this.media;
    return this.getFwdBufferInfo(bufferOutput, PlaylistLevelType.MAIN);
  }

  public get maxBufferLength(): number {
    const { levels, level } = this;
    const levelInfo = levels?.[level];
    if (!levelInfo) {
      return this.config.maxBufferLength;
    }
    return this.getMaxBufferLength(levelInfo.maxBitrate);
  }

  private backtrack(frag: Fragment) {
    this.couldBacktrack = true;
    // Causes findFragments to backtrack through fragments to find the keyframe
    this.backtrackFragment = frag;
    this.resetTransmuxer();
    this.flushBufferGap(frag);
    this.fragmentTracker.removeFragment(frag);
    this.fragPrevious = null;
    this.nextLoadPosition = frag.start;
    this.state = State.IDLE;
  }

  private checkFragmentChanged() {
    const video = this.media;
    let fragPlayingCurrent: Fragment | null = null;
    if (video && video.readyState > 1 && video.seeking === false) {
      const currentTime = video.currentTime;
      /* if video element is in seeked state, currentTime can only increase.
        (assuming that playback rate is positive ...)
        As sometimes currentTime jumps back to zero after a
        media decode error, check this, to avoid seeking back to
        wrong position after a media decode error
      */

      if (BufferHelper.isBuffered(video, currentTime)) {
        fragPlayingCurrent = this.getAppendedFrag(currentTime);
      } else if (BufferHelper.isBuffered(video, currentTime + 0.1)) {
        /* ensure that FRAG_CHANGED event is triggered at startup,
          when first video frame is displayed and playback is paused.
          add a tolerance of 100ms, in case current position is not buffered,
          check if current pos+100ms is buffered and use that buffer range
          for FRAG_CHANGED event reporting */
        fragPlayingCurrent = this.getAppendedFrag(currentTime + 0.1);
      }
      if (fragPlayingCurrent) {
        this.backtrackFragment = null;
        const fragPlaying = this.fragPlaying;
        const fragCurrentLevel = fragPlayingCurrent.level;
        if (
          !fragPlaying ||
          fragPlayingCurrent.sn !== fragPlaying.sn ||
          fragPlaying.level !== fragCurrentLevel
        ) {
          this.fragPlaying = fragPlayingCurrent;
          this.hls.trigger(Events.FRAG_CHANGED, { frag: fragPlayingCurrent });
          if (!fragPlaying || fragPlaying.level !== fragCurrentLevel) {
            this.hls.trigger(Events.LEVEL_SWITCHED, {
              level: fragCurrentLevel,
            });
          }
        }
      }
    }
  }

  get nextLevel(): number {
    const frag = this.nextBufferedFrag;
    if (frag) {
      return frag.level;
    }
    return -1;
  }

  get currentFrag(): Fragment | null {
    if (this.fragPlaying) {
      return this.fragPlaying;
    }
    const currentTime = this.media?.currentTime || this.lastCurrentTime;
    if (Number.isFinite(currentTime)) {
      return this.getAppendedFrag(currentTime);
    }
    return null;
  }

  get currentProgramDateTime(): Date | null {
    const currentTime = this.media?.currentTime || this.lastCurrentTime;
    if (Number.isFinite(currentTime)) {
      const details = this.getLevelDetails();
      const frag =
        this.currentFrag ||
        (details
          ? findFragmentByPTS(null, details.fragments, currentTime)
          : null);
      if (frag) {
        const programDateTime = frag.programDateTime;
        if (programDateTime !== null) {
          const epocMs = programDateTime + (currentTime - frag.start) * 1000;
          return new Date(epocMs);
        }
      }
    }
    return null;
  }

  get currentLevel(): number {
    const frag = this.currentFrag;
    if (frag) {
      return frag.level;
    }
    return -1;
  }

  get nextBufferedFrag() {
    const frag = this.currentFrag;
    if (frag) {
      return this.followingBufferedFrag(frag);
    }
    return null;
  }

  get forceStartLoad() {
    return this._forceStartLoad;
  }
}
