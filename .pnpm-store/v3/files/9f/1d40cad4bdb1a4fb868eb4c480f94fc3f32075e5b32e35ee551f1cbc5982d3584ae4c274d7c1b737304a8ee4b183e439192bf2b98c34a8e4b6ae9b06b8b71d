import { ErrorActionFlags, NetworkErrorAction } from './error-controller';
import {
  findFragmentByPDT,
  findFragmentByPTS,
  findNearestWithCC,
} from './fragment-finders';
import { FragmentState } from './fragment-tracker';
import Decrypter from '../crypt/decrypter';
import { ErrorDetails, ErrorTypes } from '../errors';
import { Events } from '../events';
import {
  type Fragment,
  isMediaFragment,
  type MediaFragment,
  type Part,
} from '../loader/fragment';
import FragmentLoader from '../loader/fragment-loader';
import TaskLoop from '../task-loop';
import { PlaylistLevelType } from '../types/loader';
import { ChunkMetadata } from '../types/transmuxer';
import { BufferHelper } from '../utils/buffer-helper';
import { alignStream } from '../utils/discontinuities';
import {
  getAesModeFromFullSegmentMethod,
  isFullSegmentEncryption,
} from '../utils/encryption-methods-util';
import {
  getRetryDelay,
  isUnusableKeyError,
  offlineHttpStatus,
} from '../utils/error-helper';
import {
  addEventListener,
  removeEventListener,
} from '../utils/event-listener-helper';
import {
  findPart,
  getFragmentWithSN,
  getPartWith,
  updateFragPTSDTS,
} from '../utils/level-helper';
import { appendUint8Array } from '../utils/mp4-tools';
import TimeRanges from '../utils/time-ranges';
import type { FragmentTracker } from './fragment-tracker';
import type { HlsConfig } from '../config';
import type TransmuxerInterface from '../demux/transmuxer-interface';
import type Hls from '../hls';
import type {
  FragmentLoadProgressCallback,
  LoadError,
} from '../loader/fragment-loader';
import type KeyLoader from '../loader/key-loader';
import type { LevelDetails } from '../loader/level-details';
import type { SourceBufferName } from '../types/buffer';
import type { NetworkComponentAPI } from '../types/component-api';
import type {
  BufferAppendingData,
  BufferFlushingData,
  ErrorData,
  FragLoadedData,
  KeyLoadedData,
  ManifestLoadedData,
  MediaAttachedData,
  MediaDetachingData,
  PartsLoadedData,
} from '../types/events';
import type { Level } from '../types/level';
import type { InitSegmentData, RemuxedTrack } from '../types/remuxer';
import type { Bufferable, BufferInfo } from '../utils/buffer-helper';
import type { TimestampOffset } from '../utils/timescale-conversion';

type ResolveFragLoaded = (FragLoadedEndData) => void;
type RejectFragLoaded = (LoadError) => void;

export const State = {
  STOPPED: 'STOPPED',
  IDLE: 'IDLE',
  KEY_LOADING: 'KEY_LOADING',
  FRAG_LOADING: 'FRAG_LOADING',
  FRAG_LOADING_WAITING_RETRY: 'FRAG_LOADING_WAITING_RETRY',
  WAITING_TRACK: 'WAITING_TRACK',
  PARSING: 'PARSING',
  PARSED: 'PARSED',
  ENDED: 'ENDED',
  ERROR: 'ERROR',
  WAITING_INIT_PTS: 'WAITING_INIT_PTS',
  WAITING_LEVEL: 'WAITING_LEVEL',
};

export type InFlightData = {
  frag: Fragment | null;
  state: (typeof State)[keyof typeof State];
};

export default class BaseStreamController
  extends TaskLoop
  implements NetworkComponentAPI
{
  protected hls: Hls;

  protected fragPrevious: MediaFragment | null = null;
  protected fragCurrent: Fragment | null = null;
  protected fragmentTracker: FragmentTracker;
  protected transmuxer: TransmuxerInterface | null = null;
  protected _state: (typeof State)[keyof typeof State] = State.STOPPED;
  protected playlistType: PlaylistLevelType;
  protected media: HTMLMediaElement | null = null;
  protected mediaBuffer: Bufferable | null = null;
  protected config: HlsConfig;
  protected bitrateTest: boolean = false;
  protected lastCurrentTime: number = 0;
  protected nextLoadPosition: number = 0;
  protected startPosition: number = 0;
  protected startTimeOffset: number | null = null;
  protected retryDate: number = 0;
  protected levels: Array<Level> | null = null;
  protected fragmentLoader: FragmentLoader;
  protected keyLoader: KeyLoader;
  protected levelLastLoaded: Level | null = null;
  protected startFragRequested: boolean = false;
  protected decrypter: Decrypter;
  protected initPTS: TimestampOffset[] = [];
  protected buffering: boolean = true;
  protected loadingParts: boolean = false;
  private loopSn?: string | number;

  constructor(
    hls: Hls,
    fragmentTracker: FragmentTracker,
    keyLoader: KeyLoader,
    logPrefix: string,
    playlistType: PlaylistLevelType,
  ) {
    super(logPrefix, hls.logger);
    this.playlistType = playlistType;
    this.hls = hls;
    this.fragmentLoader = new FragmentLoader(hls.config);
    this.keyLoader = keyLoader;
    this.fragmentTracker = fragmentTracker;
    this.config = hls.config;
    this.decrypter = new Decrypter(hls.config);
  }

  protected registerListeners() {
    const { hls } = this;
    hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
    hls.on(Events.ERROR, this.onError, this);
  }

  protected unregisterListeners() {
    const { hls } = this;
    hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
    hls.off(Events.ERROR, this.onError, this);
  }

  protected doTick() {
    this.onTickEnd();
  }

  protected onTickEnd() {}

  public startLoad(startPosition: number): void {}

  public stopLoad() {
    if (this.state === State.STOPPED) {
      return;
    }
    this.fragmentLoader.abort();
    this.keyLoader.abort(this.playlistType);
    const frag = this.fragCurrent;
    if (frag?.loader) {
      frag.abortRequests();
      this.fragmentTracker.removeFragment(frag);
    }
    this.resetTransmuxer();
    this.fragCurrent = null;
    this.fragPrevious = null;
    this.clearInterval();
    this.clearNextTick();
    this.state = State.STOPPED;
  }

  public get startPositionValue(): number {
    const { nextLoadPosition, startPosition } = this;
    if (startPosition === -1 && nextLoadPosition) {
      return nextLoadPosition;
    }
    return startPosition;
  }

  public get bufferingEnabled(): boolean {
    return this.buffering;
  }

  public pauseBuffering() {
    this.buffering = false;
  }

  public resumeBuffering() {
    this.buffering = true;
  }

  public get inFlightFrag(): InFlightData {
    return { frag: this.fragCurrent, state: this.state };
  }

  protected _streamEnded(
    bufferInfo: BufferInfo,
    levelDetails: LevelDetails,
  ): boolean {
    // Stream is never "ended" when playlist is live or media is detached
    if (levelDetails.live || !this.media) {
      return false;
    }
    // Stream is not "ended" when nothing is buffered past the start
    const bufferEnd = bufferInfo.end || 0;
    const timelineStart = this.config.timelineOffset || 0;
    if (bufferEnd <= timelineStart) {
      return false;
    }
    // Stream is not "ended" when there is a second buffered range starting before the end of the playlist
    const bufferedRanges = bufferInfo.buffered;
    if (
      this.config.maxBufferHole &&
      bufferedRanges &&
      bufferedRanges.length > 1
    ) {
      // make sure bufferInfo accounts for any gaps
      bufferInfo = BufferHelper.bufferedInfo(
        bufferedRanges,
        bufferInfo.start,
        0,
      );
    }
    const nextStart = bufferInfo.nextStart;
    const hasSecondBufferedRange =
      nextStart && nextStart > timelineStart && nextStart < levelDetails.edge;
    if (hasSecondBufferedRange) {
      return false;
    }
    // Playhead is in unbuffered region. Marking EoS now could result in Safari failing to dispatch "ended" event following seek on start.
    if (this.media.currentTime < bufferInfo.start) {
      return false;
    }
    const partList = levelDetails.partList;
    // Since the last part isn't guaranteed to correspond to the last playlist segment for Low-Latency HLS,
    // check instead if the last part is buffered.
    if (partList?.length) {
      const lastPart = partList[partList.length - 1];

      // Checking the midpoint of the part for potential margin of error and related issues.
      // NOTE: Technically I believe parts could yield content that is < the computed duration (including potential a duration of 0)
      // and still be spec-compliant, so there may still be edge cases here. Likewise, there could be issues in end of stream
      // part mismatches for independent audio and video playlists/segments.
      const lastPartBuffered = BufferHelper.isBuffered(
        this.media,
        lastPart.start + lastPart.duration / 2,
      );
      return lastPartBuffered;
    }

    const playlistType =
      levelDetails.fragments[levelDetails.fragments.length - 1].type;
    return this.fragmentTracker.isEndListAppended(playlistType);
  }

  public getLevelDetails(): LevelDetails | undefined {
    if (this.levels && this.levelLastLoaded !== null) {
      return this.levelLastLoaded.details;
    }
  }

  protected get timelineOffset(): number {
    const configuredTimelineOffset = this.config.timelineOffset;
    if (configuredTimelineOffset) {
      return (
        this.getLevelDetails()?.appliedTimelineOffset ||
        configuredTimelineOffset
      );
    }
    return 0;
  }

  protected onMediaAttached(
    event: Events.MEDIA_ATTACHED,
    data: MediaAttachedData,
  ) {
    const media = (this.media = this.mediaBuffer = data.media);
    addEventListener(media, 'seeking', this.onMediaSeeking);
    addEventListener(media, 'ended', this.onMediaEnded);
    const config = this.config;
    if (this.levels && config.autoStartLoad && this.state === State.STOPPED) {
      this.startLoad(config.startPosition);
    }
  }

  protected onMediaDetaching(
    event: Events.MEDIA_DETACHING,
    data: MediaDetachingData,
  ) {
    const transferringMedia = !!data.transferMedia;
    const media = this.media;
    if (media === null) {
      return;
    }
    if (media.ended) {
      this.log('MSE detaching and video ended, reset startPosition');
      this.startPosition = this.lastCurrentTime = 0;
    }

    // remove video listeners
    removeEventListener(media, 'seeking', this.onMediaSeeking);
    removeEventListener(media, 'ended', this.onMediaEnded);

    if (this.keyLoader && !transferringMedia) {
      this.keyLoader.detach();
    }
    this.media = this.mediaBuffer = null;
    this.loopSn = undefined;
    if (transferringMedia) {
      this.resetLoadingState();
      this.resetTransmuxer();
      return;
    }
    this.loadingParts = false;
    this.fragmentTracker.removeAllFragments();
    this.stopLoad();
  }

  protected onManifestLoading() {
    this.initPTS = [];
    this.levels = this.levelLastLoaded = this.fragCurrent = null;
    this.lastCurrentTime = this.startPosition = 0;
    this.startFragRequested = false;
  }

  protected onError(event: Events.ERROR, data: ErrorData) {}

  protected onMediaSeeking = () => {
    const { config, fragCurrent, media, mediaBuffer, state } = this;
    const currentTime: number = media ? media.currentTime : 0;
    const bufferInfo = BufferHelper.bufferInfo(
      mediaBuffer ? mediaBuffer : media,
      currentTime,
      config.maxBufferHole,
    );
    const noFowardBuffer = !bufferInfo.len;

    this.log(
      `Media seeking to ${
        Number.isFinite(currentTime) ? currentTime.toFixed(3) : currentTime
      }, state: ${state}, ${noFowardBuffer ? 'out of' : 'in'} buffer`,
    );

    if (this.state === State.ENDED) {
      this.resetLoadingState();
    } else if (fragCurrent) {
      // Seeking while frag load is in progress
      const tolerance = config.maxFragLookUpTolerance;
      const fragStartOffset = fragCurrent.start - tolerance;
      const fragEndOffset =
        fragCurrent.start + fragCurrent.duration + tolerance;
      // if seeking out of buffered range or into new one
      if (
        noFowardBuffer ||
        fragEndOffset < bufferInfo.start ||
        fragStartOffset > bufferInfo.end
      ) {
        const pastFragment = currentTime > fragEndOffset;
        // if the seek position is outside the current fragment range
        if (currentTime < fragStartOffset || pastFragment) {
          if (pastFragment && fragCurrent.loader) {
            this.log(
              `Cancelling fragment load for seek (sn: ${fragCurrent.sn})`,
            );
            fragCurrent.abortRequests();
            this.resetLoadingState();
          }
          this.fragPrevious = null;
        }
      }
    }

    if (media) {
      // Remove gap fragments
      this.fragmentTracker.removeFragmentsInRange(
        currentTime,
        Infinity,
        this.playlistType,
        true,
      );

      // Don't set lastCurrentTime with backward seeks (allows for frag selection with strict tolerances)
      const lastCurrentTime = this.lastCurrentTime;
      if (currentTime > lastCurrentTime) {
        this.lastCurrentTime = currentTime;
      }

      if (!this.loadingParts) {
        const bufferEnd = Math.max(bufferInfo.end, currentTime);
        const shouldLoadParts = this.shouldLoadParts(
          this.getLevelDetails(),
          bufferEnd,
        );
        if (shouldLoadParts) {
          this.log(
            `LL-Part loading ON after seeking to ${currentTime.toFixed(
              2,
            )} with buffer @${bufferEnd.toFixed(2)}`,
          );
          this.loadingParts = shouldLoadParts;
        }
      }
    }

    // in case seeking occurs although no media buffered, adjust startPosition and nextLoadPosition to seek target
    if (!this.hls.hasEnoughToStart) {
      this.log(
        `Setting ${noFowardBuffer ? 'startPosition' : 'nextLoadPosition'} to ${currentTime} for seek without enough to start`,
      );
      this.nextLoadPosition = currentTime;
      if (noFowardBuffer) {
        this.startPosition = currentTime;
      }
    }

    if (noFowardBuffer && this.state === State.IDLE) {
      // Async tick to speed up processing
      this.tickImmediate();
    }
  };

  protected onMediaEnded = () => {
    // reset startPosition and lastCurrentTime to restart playback @ stream beginning
    this.log(`setting startPosition to 0 because media ended`);
    this.startPosition = this.lastCurrentTime = 0;
  };

  protected onManifestLoaded(
    event: Events.MANIFEST_LOADED,
    data: ManifestLoadedData,
  ): void {
    this.startTimeOffset = data.startTimeOffset;
  }

  protected onHandlerDestroying() {
    this.stopLoad();
    if (this.transmuxer) {
      this.transmuxer.destroy();
      this.transmuxer = null;
    }
    super.onHandlerDestroying();
    // @ts-ignore
    this.hls = this.onMediaSeeking = this.onMediaEnded = null;
  }

  protected onHandlerDestroyed() {
    this.state = State.STOPPED;
    if (this.fragmentLoader) {
      this.fragmentLoader.destroy();
    }
    if (this.keyLoader) {
      this.keyLoader.destroy();
    }
    if (this.decrypter) {
      this.decrypter.destroy();
    }

    this.hls =
      this.log =
      this.warn =
      this.decrypter =
      this.keyLoader =
      this.fragmentLoader =
      this.fragmentTracker =
        null as any;
    super.onHandlerDestroyed();
  }

  protected loadFragment(
    frag: MediaFragment,
    level: Level,
    targetBufferTime: number,
  ) {
    this.startFragRequested = true;
    this._loadFragForPlayback(frag, level, targetBufferTime);
  }

  private _loadFragForPlayback(
    fragment: MediaFragment,
    level: Level,
    targetBufferTime: number,
  ) {
    const progressCallback: FragmentLoadProgressCallback = (
      data: FragLoadedData,
    ) => {
      const frag = data.frag;
      if (this.fragContextChanged(frag)) {
        this.warn(
          `${frag.type} sn: ${frag.sn}${
            data.part ? ' part: ' + data.part.index : ''
          } of ${this.fragInfo(frag, false, data.part)}) was dropped during download.`,
        );
        this.fragmentTracker.removeFragment(frag);
        return;
      }
      frag.stats.chunkCount++;
      this._handleFragmentLoadProgress(data);
    };

    this._doFragLoad(fragment, level, targetBufferTime, progressCallback)
      .then((data) => {
        if (!data) {
          // if we're here we probably needed to backtrack or are waiting for more parts
          return;
        }
        const state = this.state;
        const frag = data.frag;
        if (this.fragContextChanged(frag)) {
          if (
            state === State.FRAG_LOADING ||
            (!this.fragCurrent && state === State.PARSING)
          ) {
            this.fragmentTracker.removeFragment(frag);
            this.state = State.IDLE;
          }
          return;
        }

        if ('payload' in data) {
          this.log(
            `Loaded ${frag.type} sn: ${frag.sn} of ${this.playlistLabel()} ${frag.level}`,
          );
          this.hls.trigger(Events.FRAG_LOADED, data);
        }

        // Pass through the whole payload; controllers not implementing progressive loading receive data from this callback
        this._handleFragmentLoadComplete(data);
      })
      .catch((reason) => {
        if (this.state === State.STOPPED || this.state === State.ERROR) {
          return;
        }
        this.warn(`Frag error: ${reason?.message || reason}`);
        this.resetFragmentLoading(fragment);
      });
  }

  protected clearTrackerIfNeeded(frag: Fragment) {
    const { fragmentTracker } = this;
    const fragState = fragmentTracker.getState(frag);
    if (fragState === FragmentState.APPENDING) {
      // Lower the max buffer length and try again
      const playlistType = frag.type as PlaylistLevelType;
      const bufferedInfo = this.getFwdBufferInfo(
        this.mediaBuffer,
        playlistType,
      );
      const minForwardBufferLength = Math.max(
        frag.duration,
        bufferedInfo ? bufferedInfo.len : this.config.maxBufferLength,
      );
      // If backtracking, always remove from the tracker without reducing max buffer length
      const backtrackFragment = (this as any).backtrackFragment as
        | Fragment
        | undefined;
      const backtracked = backtrackFragment
        ? (frag.sn as number) - (backtrackFragment.sn as number)
        : 0;
      if (
        backtracked === 1 ||
        this.reduceMaxBufferLength(minForwardBufferLength, frag.duration)
      ) {
        fragmentTracker.removeFragment(frag);
      }
    } else if (this.mediaBuffer?.buffered.length === 0) {
      // Stop gap for bad tracker / buffer flush behavior
      fragmentTracker.removeAllFragments();
    } else if (fragmentTracker.hasParts(frag.type)) {
      // In low latency mode, remove fragments for which only some parts were buffered
      fragmentTracker.detectPartialFragments({
        frag,
        part: null,
        stats: frag.stats,
        id: frag.type,
      });
      if (fragmentTracker.getState(frag) === FragmentState.PARTIAL) {
        fragmentTracker.removeFragment(frag);
      }
    }
  }

  protected checkLiveUpdate(details: LevelDetails) {
    if (details.updated && !details.live) {
      // Live stream ended, update fragment tracker
      const lastFragment = details.fragments[details.fragments.length - 1];
      this.fragmentTracker.detectPartialFragments({
        frag: lastFragment,
        part: null,
        stats: lastFragment.stats,
        id: lastFragment.type,
      });
    }
    if (!details.fragments[0]) {
      details.deltaUpdateFailed = true;
    }
  }

  protected waitForLive(levelInfo: Level) {
    const details = levelInfo.details;
    return (
      details?.live &&
      details.type !== 'EVENT' &&
      (this.levelLastLoaded !== levelInfo || details.expired)
    );
  }

  protected flushMainBuffer(
    startOffset: number,
    endOffset: number,
    type: SourceBufferName | null = null,
  ) {
    if (!(startOffset - endOffset)) {
      return;
    }
    // When alternate audio is playing, the audio-stream-controller is responsible for the audio buffer. Otherwise,
    // passing a null type flushes both buffers
    const flushScope: BufferFlushingData = { startOffset, endOffset, type };
    this.hls.trigger(Events.BUFFER_FLUSHING, flushScope);
  }

  protected _loadInitSegment(fragment: Fragment, level: Level) {
    this._doFragLoad(fragment, level)
      .then((data) => {
        const frag = data?.frag;
        if (!frag || this.fragContextChanged(frag) || !this.levels) {
          throw new Error('init load aborted');
        }

        return data;
      })
      .then((data: FragLoadedData) => {
        const { hls } = this;
        const { frag, payload } = data;
        const decryptData = frag.decryptdata;

        // check to see if the payload needs to be decrypted
        if (
          payload &&
          payload.byteLength > 0 &&
          decryptData?.key &&
          decryptData.iv &&
          isFullSegmentEncryption(decryptData.method)
        ) {
          const startTime = self.performance.now();
          // decrypt init segment data
          return this.decrypter
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
              const endTime = self.performance.now();
              hls.trigger(Events.FRAG_DECRYPTED, {
                frag,
                payload: decryptedData,
                stats: {
                  tstart: startTime,
                  tdecrypt: endTime,
                },
              });
              data.payload = decryptedData;
              return this.completeInitSegmentLoad(data);
            });
        }
        return this.completeInitSegmentLoad(data);
      })
      .catch((reason) => {
        if (this.state === State.STOPPED || this.state === State.ERROR) {
          return;
        }
        this.warn(reason);
        this.resetFragmentLoading(fragment);
      });
  }

  private completeInitSegmentLoad(data: FragLoadedData) {
    const { levels } = this;
    if (!levels) {
      throw new Error('init load aborted, missing levels');
    }
    const stats = data.frag.stats;
    if (this.state !== State.STOPPED) {
      this.state = State.IDLE;
    }
    data.frag.data = new Uint8Array(data.payload);
    stats.parsing.start = stats.buffering.start = self.performance.now();
    stats.parsing.end = stats.buffering.end = self.performance.now();
    this.tick();
  }

  protected unhandledEncryptionError(
    initSegment: InitSegmentData,
    frag: Fragment,
  ): boolean {
    const tracks = initSegment.tracks;
    if (
      tracks &&
      !frag.encrypted &&
      (tracks.audio?.encrypted || tracks.video?.encrypted) &&
      (!this.config.emeEnabled || !this.keyLoader.emeController)
    ) {
      const media = this.media;
      const error = new Error(
        __USE_EME_DRM__
          ? `Encrypted track with no key in ${this.fragInfo(frag)} (media ${media ? 'attached mediaKeys: ' + media.mediaKeys : 'detached'})`
          : 'EME not supported (light build)',
      );
      this.warn(error.message);
      // Ignore if media is detached or mediaKeys are set
      if (!media || media.mediaKeys) {
        return false;
      }
      this.hls.trigger(Events.ERROR, {
        type: ErrorTypes.KEY_SYSTEM_ERROR,
        details: ErrorDetails.KEY_SYSTEM_NO_KEYS,
        fatal: !__USE_EME_DRM__,
        error,
        frag,
      });
      this.resetTransmuxer();
      return true;
    }
    return false;
  }

  protected fragContextChanged(frag: Fragment | null) {
    const { fragCurrent } = this;
    return (
      !frag ||
      !fragCurrent ||
      frag.sn !== fragCurrent.sn ||
      frag.level !== fragCurrent.level
    );
  }

  protected fragBufferedComplete(frag: Fragment, part: Part | null) {
    const media = this.mediaBuffer ? this.mediaBuffer : this.media;
    this.log(
      `Buffered ${frag.type} sn: ${frag.sn}${
        part ? ' part: ' + part.index : ''
      } of ${this.fragInfo(frag, false, part)} > buffer:${
        media
          ? TimeRanges.toString(BufferHelper.getBuffered(media))
          : '(detached)'
      })`,
    );
    if (isMediaFragment(frag)) {
      if (frag.type !== PlaylistLevelType.SUBTITLE) {
        const el = frag.elementaryStreams;
        if (!Object.keys(el).some((type) => !!el[type])) {
          // empty segment
          this.state = State.IDLE;
          return;
        }
      }
      const level = this.levels?.[frag.level];
      if (level?.fragmentError) {
        this.log(
          `Resetting level fragment error count of ${level.fragmentError} on frag buffered`,
        );
        level.fragmentError = 0;
      }
    }
    this.state = State.IDLE;
  }

  protected _handleFragmentLoadComplete(fragLoadedEndData: PartsLoadedData) {
    const { transmuxer } = this;
    if (!transmuxer) {
      return;
    }
    const { frag, part, partsLoaded } = fragLoadedEndData;
    // If we did not load parts, or loaded all parts, we have complete (not partial) fragment data
    const complete =
      !partsLoaded ||
      partsLoaded.length === 0 ||
      partsLoaded.some((fragLoaded) => !fragLoaded);
    const chunkMeta = new ChunkMetadata(
      frag.level,
      frag.sn as number,
      frag.stats.chunkCount + 1,
      0,
      part ? part.index : -1,
      !complete,
    );
    transmuxer.flush(chunkMeta);
  }

  protected _handleFragmentLoadProgress(
    frag: PartsLoadedData | FragLoadedData,
  ) {}

  protected _doFragLoad(
    frag: Fragment,
    level: Level,
    targetBufferTime: number | null = null,
    progressCallback?: FragmentLoadProgressCallback,
  ): Promise<PartsLoadedData | FragLoadedData | null> {
    this.fragCurrent = frag;
    const details = level.details;
    if (!this.levels || !details) {
      throw new Error(
        `frag load aborted, missing level${details ? '' : ' detail'}s`,
      );
    }

    let keyLoadingPromise: Promise<KeyLoadedData | void> | null = null;
    if (frag.encrypted && !frag.decryptdata?.key) {
      this.log(
        `Loading key for ${frag.sn} of [${details.startSN}-${details.endSN}], ${this.playlistLabel()} ${frag.level}`,
      );
      this.state = State.KEY_LOADING;
      this.fragCurrent = frag;
      keyLoadingPromise = this.keyLoader.load(frag).then((keyLoadedData) => {
        if (!this.fragContextChanged(keyLoadedData.frag)) {
          this.hls.trigger(Events.KEY_LOADED, keyLoadedData);
          if (this.state === State.KEY_LOADING) {
            this.state = State.IDLE;
          }
          return keyLoadedData;
        }
      });
      this.hls.trigger(Events.KEY_LOADING, { frag });
      if ((this.fragCurrent as Fragment | null) === null) {
        this.log(`context changed in KEY_LOADING`);
        return Promise.resolve(null);
      }
    } else if (!frag.encrypted) {
      keyLoadingPromise = this.keyLoader.loadClear(
        frag,
        details.encryptedFragments,
        this.startFragRequested,
      );
      if (keyLoadingPromise) {
        this.log(`[eme] blocking frag load until media-keys acquired`);
      }
    }

    const fragPrevious = this.fragPrevious;
    if (
      isMediaFragment(frag) &&
      (!fragPrevious || frag.sn !== fragPrevious.sn)
    ) {
      const shouldLoadParts = this.shouldLoadParts(level.details, frag.end);
      if (shouldLoadParts !== this.loadingParts) {
        this.log(
          `LL-Part loading ${
            shouldLoadParts ? 'ON' : 'OFF'
          } loading sn ${fragPrevious?.sn}->${frag.sn}`,
        );
        this.loadingParts = shouldLoadParts;
      }
    }
    targetBufferTime = Math.max(frag.start, targetBufferTime || 0);
    if (this.loadingParts && isMediaFragment(frag)) {
      const partList = details.partList;
      if (partList && progressCallback) {
        if (targetBufferTime > details.fragmentEnd && details.fragmentHint) {
          frag = details.fragmentHint;
        }
        const partIndex = this.getNextPart(partList, frag, targetBufferTime);
        if (partIndex > -1) {
          const part = partList[partIndex];
          frag = this.fragCurrent = part.fragment;
          this.log(
            `Loading ${frag.type} sn: ${frag.sn} part: ${part.index} (${partIndex}/${partList.length - 1}) of ${this.fragInfo(frag, false, part)}) cc: ${
              frag.cc
            } [${details.startSN}-${details.endSN}], target: ${parseFloat(
              targetBufferTime.toFixed(3),
            )}`,
          );
          this.nextLoadPosition = part.start + part.duration;
          this.state = State.FRAG_LOADING;
          let result: Promise<PartsLoadedData | FragLoadedData | null>;
          if (keyLoadingPromise) {
            result = keyLoadingPromise
              .then((keyLoadedData) => {
                if (
                  !keyLoadedData ||
                  this.fragContextChanged(keyLoadedData.frag)
                ) {
                  return null;
                }
                return this.doFragPartsLoad(
                  frag,
                  part,
                  level,
                  progressCallback,
                );
              })
              .catch((error) => this.handleFragLoadError(error));
          } else {
            result = this.doFragPartsLoad(
              frag,
              part,
              level,
              progressCallback,
            ).catch((error: LoadError) => this.handleFragLoadError(error));
          }
          this.hls.trigger(Events.FRAG_LOADING, {
            frag,
            part,
            targetBufferTime,
          });
          if (this.fragCurrent === null) {
            return Promise.reject(
              new Error(
                `frag load aborted, context changed in FRAG_LOADING parts`,
              ),
            );
          }
          return result;
        } else if (
          !frag.url ||
          this.loadedEndOfParts(partList, targetBufferTime)
        ) {
          // Fragment hint has no parts
          return Promise.resolve(null);
        }
      }
    }

    if (isMediaFragment(frag) && this.loadingParts) {
      this.log(
        `LL-Part loading OFF after next part miss @${targetBufferTime.toFixed(
          2,
        )} Check buffer at sn: ${frag.sn} loaded parts: ${details.partList?.filter((p) => p.loaded).map((p) => `[${p.start}-${p.end}]`)}`,
      );
      this.loadingParts = false;
    } else if (!frag.url) {
      // Selected fragment hint for part but not loading parts
      return Promise.resolve(null);
    }

    this.log(
      `Loading ${frag.type} sn: ${frag.sn} of ${this.fragInfo(frag, false)}) cc: ${frag.cc} ${
        '[' + details.startSN + '-' + details.endSN + ']'
      }, target: ${parseFloat(targetBufferTime.toFixed(3))}`,
    );
    // Don't update nextLoadPosition for fragments which are not buffered
    if (Number.isFinite(frag.sn as number) && !this.bitrateTest) {
      this.nextLoadPosition = frag.start + frag.duration;
    }
    this.state = State.FRAG_LOADING;

    // Load key before streaming fragment data
    const dataOnProgress = this.config.progressive;
    let result: Promise<PartsLoadedData | FragLoadedData | null>;
    if (dataOnProgress && keyLoadingPromise) {
      result = keyLoadingPromise
        .then((keyLoadedData) => {
          if (!keyLoadedData || this.fragContextChanged(keyLoadedData.frag)) {
            return null;
          }
          return this.fragmentLoader.load(frag, progressCallback);
        })
        .catch((error) => this.handleFragLoadError(error));
    } else {
      // load unencrypted fragment data with progress event,
      // or handle fragment result after key and fragment are finished loading
      result = Promise.all([
        this.fragmentLoader.load(
          frag,
          dataOnProgress ? progressCallback : undefined,
        ),
        keyLoadingPromise,
      ])
        .then(([fragLoadedData]) => {
          if (!dataOnProgress && progressCallback) {
            progressCallback(fragLoadedData);
          }
          return fragLoadedData;
        })
        .catch((error) => this.handleFragLoadError(error));
    }
    this.hls.trigger(Events.FRAG_LOADING, { frag, targetBufferTime });
    if (this.fragCurrent === null) {
      return Promise.reject(
        new Error(`frag load aborted, context changed in FRAG_LOADING`),
      );
    }
    return result;
  }

  private doFragPartsLoad(
    frag: Fragment,
    fromPart: Part,
    level: Level,
    progressCallback: FragmentLoadProgressCallback,
  ): Promise<PartsLoadedData | null> {
    return new Promise(
      (resolve: ResolveFragLoaded, reject: RejectFragLoaded) => {
        const partsLoaded: FragLoadedData[] = [];
        const initialPartList = level.details?.partList;
        const loadPart = (part: Part) => {
          this.fragmentLoader
            .loadPart(frag, part, progressCallback)
            .then((partLoadedData: FragLoadedData) => {
              partsLoaded[part.index] = partLoadedData;
              const loadedPart = partLoadedData.part as Part;
              this.hls.trigger(Events.FRAG_LOADED, partLoadedData);
              const nextPart =
                getPartWith(level.details, frag.sn as number, part.index + 1) ||
                findPart(initialPartList, frag.sn as number, part.index + 1);
              if (nextPart) {
                loadPart(nextPart);
              } else {
                return resolve({
                  frag,
                  part: loadedPart,
                  partsLoaded,
                });
              }
            })
            .catch(reject);
        };
        loadPart(fromPart);
      },
    );
  }

  private handleFragLoadError(
    error: LoadError | Error | (Error & { data: ErrorData }),
  ) {
    if ('data' in error) {
      const data = error.data;
      if (data.frag && data.details === ErrorDetails.INTERNAL_ABORTED) {
        this.handleFragLoadAborted(data.frag, data.part);
      } else if (data.frag && data.type === ErrorTypes.KEY_SYSTEM_ERROR) {
        data.frag.abortRequests();
        this.resetStartWhenNotLoaded();
        this.resetFragmentLoading(data.frag);
      } else {
        this.hls.trigger(Events.ERROR, data as ErrorData);
      }
    } else {
      this.hls.trigger(Events.ERROR, {
        type: ErrorTypes.OTHER_ERROR,
        details: ErrorDetails.INTERNAL_EXCEPTION,
        err: error,
        error,
        fatal: true,
      });
    }
    return null;
  }

  protected _handleTransmuxerFlush(chunkMeta: ChunkMetadata) {
    const context = this.getCurrentContext(chunkMeta);
    if (!context || this.state !== State.PARSING) {
      if (
        !this.fragCurrent &&
        this.state !== State.STOPPED &&
        this.state !== State.ERROR
      ) {
        this.state = State.IDLE;
      }
      return;
    }
    const { frag, part, level } = context;
    const now = self.performance.now();
    frag.stats.parsing.end = now;
    if (part) {
      part.stats.parsing.end = now;
    }
    // See if part loading should be disabled/enabled based on buffer and playback position.
    const levelDetails = this.getLevelDetails();
    const loadingPartsAtEdge = levelDetails && frag.sn > levelDetails.endSN;
    const shouldLoadParts =
      loadingPartsAtEdge || this.shouldLoadParts(levelDetails, frag.end);
    if (shouldLoadParts !== this.loadingParts) {
      this.log(
        `LL-Part loading ${
          shouldLoadParts ? 'ON' : 'OFF'
        } after parsing segment ending @${frag.end.toFixed(2)}`,
      );
      this.loadingParts = shouldLoadParts;
    }
    this.updateLevelTiming(frag, part, level, chunkMeta.partial);
  }

  private shouldLoadParts(
    details: LevelDetails | undefined,
    bufferEnd: number,
  ): boolean {
    if (this.config.lowLatencyMode) {
      if (!details) {
        return this.loadingParts;
      }
      if (details.partList) {
        // Buffer must be ahead of first part + duration of parts after last segment
        // and playback must be at or past segment adjacent to part list
        const firstPart = details.partList[0];
        // Loading of VTT subtitle parts is not implemented in subtitle-stream-controller (#7460)
        if (firstPart.fragment.type === PlaylistLevelType.SUBTITLE) {
          return false;
        }
        const safePartStart =
          firstPart.end + (details.fragmentHint?.duration || 0);
        if (bufferEnd >= safePartStart) {
          const playhead = this.hls.hasEnoughToStart
            ? this.media?.currentTime || this.lastCurrentTime
            : this.getLoadPosition();
          if (playhead > firstPart.start - firstPart.fragment.duration) {
            return true;
          }
        }
      }
    }
    return false;
  }

  protected getCurrentContext(
    chunkMeta: ChunkMetadata,
  ): { frag: MediaFragment; part: Part | null; level: Level } | null {
    const { levels, fragCurrent } = this;
    const { level: levelIndex, sn, part: partIndex } = chunkMeta;
    if (!levels?.[levelIndex]) {
      this.warn(
        `Levels object was unset while buffering fragment ${sn} of ${this.playlistLabel()} ${levelIndex}. The current chunk will not be buffered.`,
      );
      return null;
    }
    const level = levels[levelIndex];
    const levelDetails = level.details;

    const part =
      partIndex > -1 ? getPartWith(levelDetails, sn, partIndex) : null;
    const frag = part
      ? part.fragment
      : getFragmentWithSN(levelDetails, sn, fragCurrent);
    if (!frag) {
      return null;
    }
    if (fragCurrent && fragCurrent !== frag) {
      frag.stats = fragCurrent.stats;
    }
    return { frag, part, level };
  }

  protected bufferFragmentData(
    data: RemuxedTrack,
    frag: Fragment,
    part: Part | null,
    chunkMeta: ChunkMetadata,
    noBacktracking?: boolean,
  ) {
    if (this.state !== State.PARSING) {
      return;
    }

    const { data1, data2 } = data;
    let buffer = data1;
    if (data2) {
      // Combine the moof + mdat so that we buffer with a single append
      buffer = appendUint8Array(data1, data2);
    }

    if (!buffer.length) {
      return;
    }
    const offsetTimestamp = this.initPTS[frag.cc] as
      | TimestampOffset
      | undefined;
    const offset = offsetTimestamp
      ? -offsetTimestamp.baseTime / offsetTimestamp.timescale
      : undefined;
    const segment: BufferAppendingData = {
      type: data.type,
      frag,
      part,
      chunkMeta,
      offset,
      parent: frag.type,
      data: buffer,
    };
    this.hls.trigger(Events.BUFFER_APPENDING, segment);

    if (data.dropped && data.independent && !part) {
      if (noBacktracking) {
        return;
      }
      // Clear buffer so that we reload previous segments sequentially if required
      this.flushBufferGap(frag);
    }
  }

  protected flushBufferGap(frag: Fragment) {
    const media = this.media;
    if (!media) {
      return;
    }
    // If currentTime is not buffered, clear the back buffer so that we can backtrack as much as needed
    if (!BufferHelper.isBuffered(media, media.currentTime)) {
      this.flushMainBuffer(0, frag.start);
      return;
    }
    // Remove back-buffer without interrupting playback to allow back tracking
    const currentTime = media.currentTime;
    const bufferInfo = BufferHelper.bufferInfo(media, currentTime, 0);
    const fragDuration = frag.duration;
    const segmentFraction = Math.min(
      this.config.maxFragLookUpTolerance * 2,
      fragDuration * 0.25,
    );
    const start = Math.max(
      Math.min(frag.start - segmentFraction, bufferInfo.end - segmentFraction),
      currentTime + segmentFraction,
    );
    if (frag.start - start > segmentFraction) {
      this.flushMainBuffer(start, frag.start);
    }
  }

  protected getFwdBufferInfo(
    bufferable: Bufferable | null,
    type: PlaylistLevelType,
  ): BufferInfo | null {
    const pos = this.getLoadPosition();
    if (!Number.isFinite(pos)) {
      return null;
    }
    const backwardSeek = this.lastCurrentTime > pos;
    const maxBufferHole =
      backwardSeek || this.media?.paused ? 0 : this.config.maxBufferHole;
    return this.getFwdBufferInfoAtPos(bufferable, pos, type, maxBufferHole);
  }

  protected getFwdBufferInfoAtPos(
    bufferable: Bufferable | null,
    pos: number,
    type: PlaylistLevelType,
    maxBufferHole: number,
  ): BufferInfo | null {
    const bufferInfo = BufferHelper.bufferInfo(bufferable, pos, maxBufferHole);
    // Workaround flaw in getting forward buffer when maxBufferHole is smaller than gap at current pos
    if (bufferInfo.len === 0 && bufferInfo.nextStart !== undefined) {
      const bufferedFragAtPos = this.fragmentTracker.getBufferedFrag(pos, type);
      if (
        bufferedFragAtPos &&
        (bufferInfo.nextStart <= bufferedFragAtPos.end || bufferedFragAtPos.gap)
      ) {
        const gapDuration = Math.max(
          Math.min(bufferInfo.nextStart, bufferedFragAtPos.end) - pos,
          maxBufferHole,
        );
        return BufferHelper.bufferInfo(bufferable, pos, gapDuration);
      }
    }
    return bufferInfo;
  }

  protected getMaxBufferLength(levelBitrate?: number): number {
    const { config } = this;
    let maxBufLen: number;
    if (levelBitrate) {
      maxBufLen = Math.max(
        (8 * config.maxBufferSize) / levelBitrate,
        config.maxBufferLength,
      );
    } else {
      maxBufLen = config.maxBufferLength;
    }
    return Math.min(maxBufLen, config.maxMaxBufferLength);
  }

  protected reduceMaxBufferLength(threshold: number, fragDuration: number) {
    const config = this.config;
    const minLength = Math.max(
      Math.min(threshold - fragDuration, config.maxBufferLength),
      fragDuration,
    );
    const reducedLength = Math.max(
      threshold - fragDuration * 3,
      config.maxMaxBufferLength / 2,
      minLength,
    );
    if (reducedLength >= minLength) {
      // reduce max buffer length as it might be too high. we do this to avoid loop flushing ...
      config.maxMaxBufferLength = reducedLength;
      this.warn(`Reduce max buffer length to ${reducedLength}s`);
      return true;
    }
    return false;
  }

  protected getAppendedFrag(
    position: number,
    playlistType: PlaylistLevelType = PlaylistLevelType.MAIN,
  ): Fragment | null {
    const fragOrPart = (this.fragmentTracker as any)
      ? this.fragmentTracker.getAppendedFrag(position, playlistType)
      : null;
    if (fragOrPart && 'fragment' in fragOrPart) {
      return fragOrPart.fragment;
    }
    return fragOrPart;
  }

  protected getNextFragment(
    pos: number,
    levelDetails: LevelDetails,
  ): Fragment | null {
    const fragments = levelDetails.fragments;
    const fragLen = fragments.length;

    if (!fragLen) {
      return null;
    }

    // find fragment index, contiguous with end of buffer position
    const { config } = this;
    const start = fragments[0].start;
    const canLoadParts = config.lowLatencyMode && !!levelDetails.partList;
    let frag: MediaFragment | null = null;

    if (levelDetails.live) {
      const initialLiveManifestSize = config.initialLiveManifestSize;
      if (fragLen < initialLiveManifestSize) {
        this.warn(
          `Not enough fragments to start playback (have: ${fragLen}, need: ${initialLiveManifestSize})`,
        );
        return null;
      }
      // The real fragment start times for a live stream are only known after the PTS range for that level is known.
      // In order to discover the range, we load the best matching fragment for that level and demux it.
      // Do not load using live logic if the starting frag is requested - we want to use getFragmentAtPosition() so that
      // we get the fragment matching that start time
      if (
        (!levelDetails.PTSKnown &&
          !this.startFragRequested &&
          this.startPosition === -1) ||
        pos < start
      ) {
        if (canLoadParts && !this.loadingParts) {
          this.log(`LL-Part loading ON for initial live fragment`);
          this.loadingParts = true;
        }
        frag = this.getInitialLiveFragment(levelDetails);
        const mainStart = this.hls.startPosition;
        const liveSyncPosition = this.hls.liveSyncPosition;
        const startPosition = frag
          ? (mainStart !== -1 && mainStart >= start
              ? mainStart
              : liveSyncPosition) || frag.start
          : pos;
        this.log(
          `Setting startPosition to ${startPosition} to match start frag at live edge. mainStart: ${mainStart} liveSyncPosition: ${liveSyncPosition} frag.start: ${frag?.start}`,
        );
        this.startPosition = this.nextLoadPosition = startPosition;
      }
    } else if (pos <= start) {
      // VoD playlist: if loadPosition before start of playlist, load first fragment
      frag = fragments[0];
    }

    // If we haven't run into any special cases already, just load the fragment most closely matching the requested position
    if (!frag) {
      const end = this.loadingParts
        ? levelDetails.partEnd
        : levelDetails.fragmentEnd;
      frag = this.getFragmentAtPosition(pos, end, levelDetails);
    }
    let programFrag = this.filterReplacedPrimary(frag, levelDetails);
    if (!programFrag && frag) {
      const curSNIdx = frag.sn - levelDetails.startSN;
      programFrag = this.filterReplacedPrimary(
        fragments[curSNIdx + 1] || null,
        levelDetails,
      );
    }
    return this.mapToInitFragWhenRequired(programFrag);
  }

  protected isLoopLoading(frag: Fragment, targetBufferTime: number): boolean {
    const trackerState = this.fragmentTracker.getState(frag);
    return (
      (trackerState === FragmentState.OK ||
        (trackerState === FragmentState.PARTIAL && !!frag.gap)) &&
      this.nextLoadPosition > targetBufferTime
    );
  }

  protected getNextFragmentLoopLoading(
    frag: Fragment,
    levelDetails: LevelDetails,
    bufferInfo: BufferInfo,
    playlistType: PlaylistLevelType,
    maxBufLen: number,
  ): Fragment | null {
    let nextFragment: Fragment | null = null;
    if (frag.gap) {
      nextFragment = this.getNextFragment(this.nextLoadPosition, levelDetails);
      if (nextFragment && !nextFragment.gap && bufferInfo.nextStart) {
        // Media buffered after GAP tags should not make the next buffer timerange exceed forward buffer length
        const nextbufferInfo = this.getFwdBufferInfoAtPos(
          this.mediaBuffer ? this.mediaBuffer : this.media,
          bufferInfo.nextStart,
          playlistType,
          0,
        );
        if (
          nextbufferInfo !== null &&
          bufferInfo.len + nextbufferInfo.len >= maxBufLen
        ) {
          // Returning here might result in not finding an audio and video candiate to skip to
          const sn = nextFragment.sn;
          if (this.loopSn !== sn) {
            this.log(
              `buffer full after gaps in "${playlistType}" playlist starting at sn: ${sn}`,
            );
            this.loopSn = sn;
          }
          return null;
        }
      }
    }
    this.loopSn = undefined;
    return nextFragment;
  }

  protected get primaryPrefetch(): boolean {
    if (interstitialsEnabled(this.config)) {
      const playingInterstitial =
        this.hls.interstitialsManager?.playingItem?.event;
      if (playingInterstitial) {
        return true;
      }
    }
    return false;
  }

  protected filterReplacedPrimary(
    frag: MediaFragment | null,
    details: LevelDetails | undefined,
  ): MediaFragment | null {
    if (!frag) {
      return frag;
    }
    if (
      interstitialsEnabled(this.config) &&
      frag.type !== PlaylistLevelType.SUBTITLE
    ) {
      // Do not load fragments outside the buffering schedule segment
      const interstitials = this.hls.interstitialsManager;
      const bufferingItem = interstitials?.bufferingItem;
      if (bufferingItem) {
        const bufferingInterstitial = bufferingItem.event;
        if (bufferingInterstitial) {
          // Do not stream fragments while buffering Interstitial Events (except for overlap at the start)
          if (
            bufferingInterstitial.appendInPlace ||
            Math.abs(frag.start - bufferingItem.start) > 1 ||
            bufferingItem.start === 0
          ) {
            return null;
          }
        } else {
          // Limit fragment loading to media in schedule item
          if (frag.end <= bufferingItem.start && details?.live === false) {
            // fragment ends by schedule item start
            // this.fragmentTracker.fragBuffered(frag, true);
            return null;
          }
          if (frag.start > bufferingItem.end && bufferingItem.nextEvent) {
            // fragment is past schedule item end
            // allow some overflow when not appending in place to prevent stalls
            if (
              bufferingItem.nextEvent.appendInPlace ||
              frag.start - bufferingItem.end > 1
            ) {
              return null;
            }
          }
        }
      }
      // Skip loading of fragments that overlap completely with appendInPlace interstitials
      const playerQueue = interstitials?.playerQueue;
      if (playerQueue) {
        for (let i = playerQueue.length; i--; ) {
          const interstitial = playerQueue[i].interstitial;
          if (
            interstitial.appendInPlace &&
            frag.start >= interstitial.startTime &&
            frag.end <= interstitial.resumeTime
          ) {
            return null;
          }
        }
      }
    }
    return frag;
  }

  mapToInitFragWhenRequired(frag: Fragment | null): typeof frag {
    // If an initSegment is present, it must be buffered first
    if (frag?.initSegment && !frag.initSegment.data && !this.bitrateTest) {
      return frag.initSegment;
    }

    return frag;
  }

  getNextPart(
    partList: Part[],
    frag: Fragment,
    targetBufferTime: number,
  ): number {
    let nextPart = -1;
    let contiguous = false;
    let independentAttrOmitted = true;
    for (let i = 0, len = partList.length; i < len; i++) {
      const part = partList[i];
      independentAttrOmitted = independentAttrOmitted && !part.independent;
      if (nextPart > -1 && targetBufferTime < part.start) {
        break;
      }
      const loaded = part.loaded;
      if (loaded) {
        nextPart = -1;
      } else if (
        contiguous ||
        ((part.independent || independentAttrOmitted) && part.fragment === frag)
      ) {
        if (part.fragment !== frag) {
          this.warn(
            `Need buffer at ${targetBufferTime} but next unloaded part starts at ${part.start}`,
          );
        }
        nextPart = i;
      }
      contiguous = loaded;
    }
    return nextPart;
  }

  private loadedEndOfParts(
    partList: Part[],
    targetBufferTime: number,
  ): boolean {
    let part: Part;
    for (let i = partList.length; i--; ) {
      part = partList[i];
      if (!part.loaded) {
        return false;
      }
      if (targetBufferTime > part.start) {
        return true;
      }
    }
    return false;
  }

  /*
   This method is used find the best matching first fragment for a live playlist. This fragment is used to calculate the
   "sliding" of the playlist, which is its offset from the start of playback. After sliding we can compute the real
   start and end times for each fragment in the playlist (after which this method will not need to be called).
  */
  protected getInitialLiveFragment(
    levelDetails: LevelDetails,
  ): MediaFragment | null {
    const fragments = levelDetails.fragments;
    const fragPrevious = this.fragPrevious;
    let frag: MediaFragment | null = null;
    if (fragPrevious) {
      if (levelDetails.hasProgramDateTime) {
        // Prefer using PDT, because it can be accurate enough to choose the correct fragment without knowing the level sliding
        this.log(
          `Live playlist, switching playlist, load frag with same PDT: ${fragPrevious.programDateTime}`,
        );
        frag = findFragmentByPDT(
          fragments,
          fragPrevious.endProgramDateTime,
          this.config.maxFragLookUpTolerance,
        );
      }
      if (!frag) {
        // SN does not need to be accurate between renditions, but depending on the packaging it may be so.
        const targetSN = (fragPrevious.sn as number) + 1;
        if (
          targetSN >= levelDetails.startSN &&
          targetSN <= levelDetails.endSN
        ) {
          const fragNext = fragments[targetSN - levelDetails.startSN];
          // Ensure that we're staying within the continuity range, since PTS resets upon a new range
          if (fragPrevious.cc === fragNext.cc) {
            frag = fragNext;
            this.log(
              `Live playlist, switching playlist, load frag with next SN: ${
                frag!.sn
              }`,
            );
          }
        }
        // It's important to stay within the continuity range if available; otherwise the fragments in the playlist
        // will have the wrong start times
        if (!frag) {
          frag = findNearestWithCC(
            levelDetails,
            fragPrevious.cc,
            fragPrevious.end,
          );
          if (frag) {
            this.log(
              `Live playlist, switching playlist, load frag with same CC: ${frag.sn}`,
            );
          }
        }
      }
    } else {
      // Find a new start fragment when fragPrevious is null
      const liveStart = this.hls.liveSyncPosition;
      if (liveStart !== null) {
        frag = this.getFragmentAtPosition(
          liveStart,
          this.bitrateTest ? levelDetails.fragmentEnd : levelDetails.edge,
          levelDetails,
        );
      }
    }

    return frag;
  }

  /*
  This method finds the best matching fragment given the provided position.
   */
  protected getFragmentAtPosition(
    bufferEnd: number,
    end: number,
    levelDetails: LevelDetails,
  ): MediaFragment | null {
    const { config } = this;
    let { fragPrevious } = this;
    let { fragments, endSN } = levelDetails;
    const { fragmentHint } = levelDetails;
    const { maxFragLookUpTolerance } = config;
    const partList = levelDetails.partList;

    const loadingParts = !!(
      this.loadingParts &&
      partList?.length &&
      fragmentHint
    );
    if (
      loadingParts &&
      !this.bitrateTest &&
      partList[partList.length - 1].fragment.sn === fragmentHint.sn
    ) {
      // Include incomplete fragment with parts at end
      fragments = fragments.concat(fragmentHint);
      endSN = fragmentHint.sn;
    }

    let frag: MediaFragment | null;
    if (bufferEnd < end) {
      const backwardSeek = bufferEnd < this.lastCurrentTime;
      const lookupTolerance =
        backwardSeek ||
        bufferEnd > end - maxFragLookUpTolerance ||
        this.media?.paused ||
        !this.startFragRequested
          ? 0
          : maxFragLookUpTolerance;
      // Remove the tolerance if it would put the bufferEnd past the actual end of stream
      // Uses buffer and sequence number to calculate switch segment (required if using EXT-X-DISCONTINUITY-SEQUENCE)
      frag = findFragmentByPTS(
        fragPrevious,
        fragments,
        bufferEnd,
        lookupTolerance,
      );
    } else {
      // reach end of playlist
      frag = fragments[fragments.length - 1];
    }

    if (frag) {
      const curSNIdx = frag.sn - levelDetails.startSN;
      // Move fragPrevious forward to support forcing the next fragment to load
      // when the buffer catches up to a previously buffered range.
      const fragState = this.fragmentTracker.getState(frag);
      if (
        fragState === FragmentState.OK ||
        (fragState === FragmentState.PARTIAL && frag.gap)
      ) {
        fragPrevious = frag;
      }
      if (
        fragPrevious &&
        frag.sn === fragPrevious.sn &&
        (!loadingParts ||
          partList[0].fragment.sn > frag.sn ||
          !levelDetails.live)
      ) {
        // Force the next fragment to load if the previous one was already selected. This can occasionally happen with
        // non-uniform fragment durations
        const sameLevel = frag.level === fragPrevious.level;
        if (sameLevel) {
          const nextFrag = fragments[curSNIdx + 1];
          if (
            frag.sn < endSN &&
            this.fragmentTracker.getState(nextFrag) !== FragmentState.OK
          ) {
            frag = nextFrag;
          } else {
            frag = null;
          }
        }
      }
    }
    return frag;
  }

  protected alignPlaylists(
    details: LevelDetails,
    previousDetails: LevelDetails | undefined,
    switchDetails: LevelDetails | undefined,
  ): number {
    // TODO: If not for `shouldAlignOnDiscontinuities` requiring fragPrevious.cc,
    //  this could all go in level-helper mergeDetails()
    const length = details.fragments.length;
    if (!length) {
      this.warn(`No fragments in live playlist`);
      return 0;
    }
    const slidingStart = details.fragmentStart;
    const firstLevelLoad = !previousDetails;
    const aligned = details.alignedSliding && Number.isFinite(slidingStart);
    if (firstLevelLoad || (!aligned && !slidingStart)) {
      alignStream(switchDetails, details);
      const alignedSlidingStart = details.fragmentStart;
      this.log(
        `Live playlist sliding: ${alignedSlidingStart.toFixed(2)} start-sn: ${
          previousDetails ? previousDetails.startSN : 'na'
        }->${details.startSN} fragments: ${length}`,
      );
      return alignedSlidingStart;
    }
    return slidingStart;
  }

  protected waitForCdnTuneIn(details: LevelDetails) {
    // Wait for Low-Latency CDN Tune-in to get an updated playlist
    const advancePartLimit = 3;
    return (
      details.live &&
      details.canBlockReload &&
      details.partTarget &&
      details.tuneInGoal >
        Math.max(details.partHoldBack, details.partTarget * advancePartLimit)
    );
  }

  protected setStartPosition(details: LevelDetails, sliding: number) {
    // compute start position if set to -1. use it straight away if value is defined
    let startPosition = this.startPosition;
    if (startPosition < sliding) {
      startPosition = -1;
    }
    const timelineOffset = this.timelineOffset;
    if (startPosition === -1) {
      // Use Playlist EXT-X-START:TIME-OFFSET when set
      // Prioritize Multivariant Playlist offset so that main, audio, and subtitle stream-controller start times match
      const offsetInMultivariantPlaylist = this.startTimeOffset !== null;
      const startTimeOffset = offsetInMultivariantPlaylist
        ? this.startTimeOffset
        : details.startTimeOffset;
      if (startTimeOffset !== null && Number.isFinite(startTimeOffset)) {
        startPosition = sliding + startTimeOffset;
        if (startTimeOffset < 0) {
          startPosition += details.edge;
        }
        startPosition = Math.min(
          Math.max(sliding, startPosition),
          sliding + details.totalduration,
        );
        this.log(
          `Setting startPosition to ${startPosition} for start time offset ${startTimeOffset} found in ${
            offsetInMultivariantPlaylist ? 'multivariant' : 'media'
          } playlist`,
        );
        this.startPosition = startPosition;
      } else if (details.live) {
        // Leave this.startPosition at -1, so that we can use `getInitialLiveFragment` logic when startPosition has
        // not been specified via the config or an as an argument to startLoad (#3736).
        startPosition = this.hls.liveSyncPosition || sliding;
        this.log(
          `Setting startPosition to -1 to start at live edge ${startPosition}`,
        );
        this.startPosition = -1;
      } else {
        this.log(`setting startPosition to 0 by default`);
        this.startPosition = startPosition = 0;
      }
      this.lastCurrentTime = startPosition + timelineOffset;
    }
    this.nextLoadPosition = startPosition + timelineOffset;
  }

  protected getLoadPosition(): number {
    const { media } = this;
    // if we have not yet loaded any fragment, start loading from start position
    let pos = 0;
    if (this.hls?.hasEnoughToStart && media) {
      pos = media.currentTime;
    } else if (this.nextLoadPosition >= 0) {
      pos = this.nextLoadPosition;
    }

    return pos;
  }

  private handleFragLoadAborted(frag: Fragment, part: Part | null | undefined) {
    if (
      this.transmuxer &&
      frag.type === this.playlistType &&
      isMediaFragment(frag) &&
      frag.stats.aborted
    ) {
      this.log(
        `Fragment ${frag.sn}${part ? ' part ' + part.index : ''} of ${this.playlistLabel()} ${
          frag.level
        } was aborted`,
      );
      this.resetFragmentLoading(frag);
    }
  }

  protected resetFragmentLoading(frag: Fragment) {
    if (
      !this.fragCurrent ||
      (!this.fragContextChanged(frag) &&
        this.state !== State.FRAG_LOADING_WAITING_RETRY)
    ) {
      this.state = State.IDLE;
    }
  }

  protected onFragmentOrKeyLoadError(
    filterType: PlaylistLevelType,
    data: ErrorData,
  ) {
    if (data.chunkMeta && !data.frag) {
      const context = this.getCurrentContext(data.chunkMeta);
      if (context) {
        data.frag = context.frag;
      }
    }
    const frag = data.frag;
    // Handle frag error related to caller's filterType
    if (!frag || frag.type !== filterType || !this.levels) {
      return;
    }
    if (this.fragContextChanged(frag)) {
      this.warn(
        `Frag load error must match current frag to retry ${frag.url} > ${this.fragCurrent?.url}`,
      );
      return;
    }
    const gapTagEncountered = data.details === ErrorDetails.FRAG_GAP;
    if (gapTagEncountered) {
      this.fragmentTracker.fragBuffered(frag as MediaFragment, true);
    }
    // keep retrying until the limit will be reached
    const errorAction = data.errorAction;
    if (!errorAction) {
      this.state = State.ERROR;
      return;
    }
    const { action, flags, retryCount = 0, retryConfig } = errorAction;
    const couldRetry = !!retryConfig;
    const retry = couldRetry && action === NetworkErrorAction.RetryRequest;
    const noAlternate =
      couldRetry &&
      !errorAction.resolved &&
      flags === ErrorActionFlags.MoveAllAlternatesMatchingHost;
    const live = this.hls.latestLevelDetails?.live;
    if (
      !retry &&
      noAlternate &&
      isMediaFragment(frag) &&
      !frag.endList &&
      live &&
      !isUnusableKeyError(data)
    ) {
      this.resetFragmentErrors(filterType);
      this.treatAsGap(frag);
      errorAction.resolved = true;
    } else if ((retry || noAlternate) && retryCount < retryConfig.maxNumRetry) {
      const offlineStatus = offlineHttpStatus(data.response?.code);
      const delay = getRetryDelay(retryConfig, retryCount);
      this.resetStartWhenNotLoaded();
      this.retryDate = self.performance.now() + delay;
      this.state = State.FRAG_LOADING_WAITING_RETRY;
      errorAction.resolved = true;
      if (offlineStatus) {
        this.log(`Waiting for connection (offline)`);
        this.retryDate = Infinity;
        data.reason = 'offline';
        return;
      }
      this.warn(
        `Fragment ${frag.sn} of ${filterType} ${frag.level} errored with ${
          data.details
        }, retrying loading ${retryCount + 1}/${
          retryConfig.maxNumRetry
        } in ${delay}ms`,
      );
    } else if (retryConfig) {
      this.resetFragmentErrors(filterType);
      if (retryCount < retryConfig.maxNumRetry) {
        // Network retry is skipped when level switch is preferred
        if (
          !gapTagEncountered &&
          action !== NetworkErrorAction.RemoveAlternatePermanently
        ) {
          errorAction.resolved = true;
        }
      } else {
        this.warn(
          `${data.details} reached or exceeded max retry (${retryCount})`,
        );
        return;
      }
    } else if (action === NetworkErrorAction.SendAlternateToPenaltyBox) {
      this.state = State.WAITING_LEVEL;
    } else {
      this.state = State.ERROR;
    }
    // Perform next async tick sooner to speed up error action resolution
    this.tickImmediate();
  }

  protected checkRetryDate() {
    const now = self.performance.now();
    const retryDate = this.retryDate;
    // if current time is gt than retryDate, or if media seeking let's switch to IDLE state to retry loading
    const waitingForConnection = retryDate === Infinity;
    if (
      !retryDate ||
      now >= retryDate ||
      (waitingForConnection && !offlineHttpStatus(0))
    ) {
      if (waitingForConnection) {
        this.log(`Connection restored (online)`);
      }
      this.resetStartWhenNotLoaded();
      this.state = State.IDLE;
    }
  }

  protected reduceLengthAndFlushBuffer(data: ErrorData): boolean {
    // if in appending state
    if (this.state === State.PARSING || this.state === State.PARSED) {
      const frag = data.frag;
      const playlistType = data.parent as PlaylistLevelType;
      const bufferedInfo = this.getFwdBufferInfo(
        this.mediaBuffer,
        playlistType,
      );
      // 0.5 : tolerance needed as some browsers stalls playback before reaching buffered end
      // reduce max buf len if current position is buffered
      const buffered = bufferedInfo && bufferedInfo.len > 0.5;
      if (buffered) {
        this.reduceMaxBufferLength(bufferedInfo.len, frag?.duration || 10);
      }
      const flushBuffer = !buffered;
      if (flushBuffer) {
        // current position is not buffered, but browser is still complaining about buffer full error
        // this happens on IE/Edge, refer to https://github.com/video-dev/hls.js/pull/708
        // in that case flush the whole audio buffer to recover
        this.warn(
          `Buffer full error while media.currentTime (${this.getLoadPosition()}) is not buffered, flush ${playlistType} buffer`,
        );
      }
      if (frag) {
        this.fragmentTracker.removeFragment(frag);
        this.nextLoadPosition = frag.start;
      }
      this.resetLoadingState();
      return flushBuffer;
    }
    return false;
  }

  protected resetFragmentErrors(filterType: PlaylistLevelType) {
    if (filterType === PlaylistLevelType.AUDIO) {
      // Reset current fragment since audio track audio is essential and may not have a fail-over track
      this.fragCurrent = null;
    }
    // Fragment errors that result in a level switch or redundant fail-over
    // should reset the stream controller state to idle
    if (!this.hls.hasEnoughToStart) {
      this.startFragRequested = false;
    }
    if (this.state !== State.STOPPED) {
      this.state = State.IDLE;
    }
  }

  protected afterBufferFlushed(
    media: Bufferable,
    bufferType: SourceBufferName,
    playlistType: PlaylistLevelType,
  ) {
    if (!media) {
      return;
    }
    // After successful buffer flushing, filter flushed fragments from bufferedFrags use mediaBuffered instead of media
    // (so that we will check against video.buffered ranges in case of alt audio track)
    const bufferedTimeRanges = BufferHelper.getBuffered(media);
    this.fragmentTracker.detectEvictedFragments(
      bufferType,
      bufferedTimeRanges,
      playlistType,
    );
    if (this.state === State.ENDED) {
      this.resetLoadingState();
    }
  }

  protected resetLoadingState() {
    this.log('Reset loading state');
    this.fragCurrent = null;
    this.fragPrevious = null;
    if (this.state !== State.STOPPED) {
      this.state = State.IDLE;
    }
  }

  private resetStartWhenNotLoaded() {
    // if loadedmetadata is not set, it means that first frag request failed
    // in that case, reset startFragRequested flag
    if (!this.hls.hasEnoughToStart) {
      this.startFragRequested = false;
      const level = this.levelLastLoaded;
      const details = level ? level.details : null;
      if (details?.live) {
        // Update the start position and return to IDLE to recover live start
        this.log(`resetting startPosition for live start`);
        this.startPosition = -1;
        this.setStartPosition(details, details.fragmentStart);
        this.resetLoadingState();
      } else {
        this.nextLoadPosition = this.startPosition;
      }
    }
  }

  protected resetWhenMissingContext(chunkMeta: ChunkMetadata | Fragment) {
    this.log(
      `Loading context changed while buffering sn ${chunkMeta.sn} of ${this.playlistLabel()} ${chunkMeta.level === -1 ? '<removed>' : chunkMeta.level}. This chunk will not be buffered.`,
    );
    this.removeUnbufferedFrags();
    this.resetStartWhenNotLoaded();
    this.resetLoadingState();
  }

  protected removeUnbufferedFrags(start: number = 0) {
    this.fragmentTracker.removeFragmentsInRange(
      start,
      Infinity,
      this.playlistType,
      false,
      true,
    );
  }

  private updateLevelTiming(
    frag: MediaFragment,
    part: Part | null,
    level: Level,
    partial: boolean,
  ) {
    const details = level.details;
    if (!details) {
      this.warn('level.details undefined');
      return;
    }
    const parsed = Object.keys(frag.elementaryStreams).reduce(
      (result, type) => {
        const info = frag.elementaryStreams[type];
        if (info) {
          const parsedDuration = info.endPTS - info.startPTS;
          if (parsedDuration <= 0) {
            // Destroy the transmuxer after it's next time offset failed to advance because duration was <= 0.
            // The new transmuxer will be configured with a time offset matching the next fragment start,
            // preventing the timeline from shifting.
            this.warn(
              `Could not parse fragment ${frag.sn} ${type} duration reliably (${parsedDuration})`,
            );
            return result || false;
          }
          const drift = partial
            ? 0
            : updateFragPTSDTS(
                details,
                frag,
                info.startPTS,
                info.endPTS,
                info.startDTS,
                info.endDTS,
                this,
              );
          this.hls.trigger(Events.LEVEL_PTS_UPDATED, {
            details,
            level,
            drift,
            type,
            frag,
            start: info.startPTS,
            end: info.endPTS,
          });
          return true;
        }
        return result;
      },
      false,
    );
    if (!parsed) {
      if (level.fragmentError === 0) {
        // Mark and track the odd empty segment as a gap to avoid reloading
        this.treatAsGap(frag, level);
      }
      if (this.transmuxer?.error === null) {
        const error = new Error(
          `Found no media in fragment ${frag.sn} of ${this.playlistLabel()} ${frag.level} resetting transmuxer to fallback to playlist timing`,
        );
        this.warn(error.message);
        this.hls.trigger(Events.ERROR, {
          type: ErrorTypes.MEDIA_ERROR,
          details: ErrorDetails.FRAG_PARSING_ERROR,
          fatal: false,
          error,
          frag,
          reason: `Found no media in msn ${frag.sn} of ${this.playlistLabel()} "${level.url}"`,
        });
        if (!this.hls) {
          return;
        }
        this.resetTransmuxer();
      }
      // For this error fallthrough. Marking parsed will allow advancing to next fragment.
    }
    this.state = State.PARSED;
    this.log(
      `Parsed ${frag.type} sn: ${frag.sn}${
        part ? ' part: ' + part.index : ''
      } of ${this.fragInfo(frag, false, part)})`,
    );
    this.hls.trigger(Events.FRAG_PARSED, { frag, part });
  }

  private playlistLabel() {
    return this.playlistType === PlaylistLevelType.MAIN ? 'level' : 'track';
  }

  private fragInfo(
    frag: Fragment,
    pts: boolean = true,
    part?: Part | null,
  ): string {
    return `${this.playlistLabel()} ${frag.level} (${part ? 'part' : 'frag'}:[${((pts && !part ? frag.startPTS : (part || frag).start) ?? NaN).toFixed(3)}-${(
      (pts && !part ? frag.endPTS : (part || frag).end) ?? NaN
    ).toFixed(
      3,
    )}]${part && frag.type === 'main' ? 'INDEPENDENT=' + (part.independent ? 'YES' : 'NO') : ''}`;
  }

  private treatAsGap(frag: MediaFragment, level?: Level) {
    if (level) {
      level.fragmentError++;
    }
    frag.gap = true;
    this.fragmentTracker.removeFragment(frag);
    this.fragmentTracker.fragBuffered(frag, true);
  }

  protected resetTransmuxer() {
    this.transmuxer?.reset();
  }

  protected recoverWorkerError(data: ErrorData) {
    if (data.event === 'demuxerWorker') {
      this.fragmentTracker.removeAllFragments();
      if (this.transmuxer) {
        this.transmuxer.destroy();
        this.transmuxer = null;
      }
      this.resetStartWhenNotLoaded();
      this.resetLoadingState();
    }
  }

  set state(nextState: (typeof State)[keyof typeof State]) {
    const previousState = this._state;
    if (previousState !== nextState) {
      this._state = nextState;
      this.log(`${previousState}->${nextState}`);
    }
  }

  get state(): (typeof State)[keyof typeof State] {
    return this._state;
  }
}

function interstitialsEnabled(config: HlsConfig): boolean {
  return (
    __USE_INTERSTITIALS__ &&
    !!config.interstitialsController &&
    config.enableInterstitialPlayback !== false
  );
}
