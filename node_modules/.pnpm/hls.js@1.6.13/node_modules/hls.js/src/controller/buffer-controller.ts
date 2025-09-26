import BufferOperationQueue from './buffer-operation-queue';
import { createDoNothingErrorAction } from './error-controller';
import { ErrorDetails, ErrorTypes } from '../errors';
import { Events } from '../events';
import { ElementaryStreamTypes } from '../loader/fragment';
import { PlaylistLevelType } from '../types/loader';
import { BufferHelper } from '../utils/buffer-helper';
import {
  areCodecsMediaSourceSupported,
  getCodecCompatibleName,
  pickMostCompleteCodecName,
  replaceVideoCodec,
} from '../utils/codecs';
import { Logger } from '../utils/logger';
import {
  getMediaSource,
  isCompatibleTrackChange,
  isManagedMediaSource,
} from '../utils/mediasource-helper';
import { stringify } from '../utils/safe-json-stringify';
import type { FragmentTracker } from './fragment-tracker';
import type { HlsConfig } from '../config';
import type Hls from '../hls';
import type { MediaFragment, Part } from '../loader/fragment';
import type { LevelDetails } from '../loader/level-details';
import type {
  AttachMediaSourceData,
  BaseTrack,
  BaseTrackSet,
  BufferCreatedTrackSet,
  BufferOperation,
  EmptyTuple,
  ExtendedSourceBuffer,
  MediaOverrides,
  ParsedTrack,
  SourceBufferName,
  SourceBuffersTuple,
  SourceBufferTrack,
  SourceBufferTrackSet,
} from '../types/buffer';
import type { ComponentAPI } from '../types/component-api';
import type {
  BufferAppendingData,
  BufferCodecsData,
  BufferEOSData,
  BufferFlushingData,
  ErrorData,
  FragChangedData,
  FragParsedData,
  LevelUpdatedData,
  ManifestParsedData,
  MediaAttachingData,
  MediaDetachingData,
} from '../types/events';
import type { ChunkMetadata } from '../types/transmuxer';

interface BufferedChangeEvent extends Event {
  readonly addedRanges?: TimeRanges;
  readonly removedRanges?: TimeRanges;
}

const VIDEO_CODEC_PROFILE_REPLACE =
  /(avc[1234]|hvc1|hev1|dvh[1e]|vp09|av01)(?:\.[^.,]+)+/;

const TRACK_REMOVED_ERROR_NAME = 'HlsJsTrackRemovedError';

class HlsJsTrackRemovedError extends Error {
  constructor(message) {
    super(message);
    this.name = TRACK_REMOVED_ERROR_NAME;
  }
}

export default class BufferController extends Logger implements ComponentAPI {
  private hls: Hls;
  private fragmentTracker: FragmentTracker;
  // The level details used to determine duration, target-duration and live
  private details: LevelDetails | null = null;
  // cache the self generated object url to detect hijack of video tag
  private _objectUrl: string | null = null;
  // A queue of buffer operations which require the SourceBuffer to not be updating upon execution
  private operationQueue: BufferOperationQueue | null = null;

  // The total number track codecs expected before any sourceBuffers are created (2: audio and video or 1: audiovideo | audio | video)
  private bufferCodecEventsTotal: number = 0;

  // A reference to the attached media element
  private media: HTMLMediaElement | null = null;

  // A reference to the active media source
  private mediaSource: MediaSource | null = null;

  // Last MP3 audio chunk appended
  private lastMpegAudioChunk: ChunkMetadata | null = null;

  // Audio fragment blocked from appending until corresponding video appends or context changes
  private blockedAudioAppend: {
    op: BufferOperation;
    frag: MediaFragment | Part;
  } | null = null;
  // Keep track of video append position for unblocking audio
  private lastVideoAppendEnd: number = 0;
  // Whether or not to use ManagedMediaSource API and append source element to media element.
  private appendSource: boolean;
  // Transferred MediaSource information used to detmerine if duration end endstream may be appended
  private transferData?: MediaAttachingData;
  // Directives used to override default MediaSource handling
  private overrides?: MediaOverrides;
  // Error counters
  private appendErrors = {
    audio: 0,
    video: 0,
    audiovideo: 0,
  };
  // Record of required or created buffers by type. SourceBuffer is stored in Track.buffer once created.
  private tracks: SourceBufferTrackSet = {};
  // Array of SourceBuffer type and SourceBuffer (or null). One entry per TrackSet in this.tracks.
  private sourceBuffers: SourceBuffersTuple = [
    [null, null],
    [null, null],
  ];

  constructor(hls: Hls, fragmentTracker: FragmentTracker) {
    super('buffer-controller', hls.logger);
    this.hls = hls;
    this.fragmentTracker = fragmentTracker;
    this.appendSource = isManagedMediaSource(
      getMediaSource(hls.config.preferManagedMediaSource),
    );

    this.initTracks();
    this.registerListeners();
  }

  public hasSourceTypes(): boolean {
    return Object.keys(this.tracks).length > 0;
  }

  public destroy() {
    this.unregisterListeners();
    this.details = null;
    this.lastMpegAudioChunk = this.blockedAudioAppend = null;
    this.transferData = this.overrides = undefined;
    if (this.operationQueue) {
      this.operationQueue.destroy();
      this.operationQueue = null;
    }
    // @ts-ignore
    this.hls = this.fragmentTracker = null;
    // @ts-ignore
    this._onMediaSourceOpen = this._onMediaSourceClose = null;
    // @ts-ignore
    this._onMediaSourceEnded = null;
    // @ts-ignore
    this._onStartStreaming = this._onEndStreaming = null;
  }

  private registerListeners() {
    const { hls } = this;
    hls.on(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
    hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.on(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.on(Events.BUFFER_RESET, this.onBufferReset, this);
    hls.on(Events.BUFFER_APPENDING, this.onBufferAppending, this);
    hls.on(Events.BUFFER_CODECS, this.onBufferCodecs, this);
    hls.on(Events.BUFFER_EOS, this.onBufferEos, this);
    hls.on(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
    hls.on(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
    hls.on(Events.FRAG_PARSED, this.onFragParsed, this);
    hls.on(Events.FRAG_CHANGED, this.onFragChanged, this);
    hls.on(Events.ERROR, this.onError, this);
  }

  private unregisterListeners() {
    const { hls } = this;
    hls.off(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
    hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
    hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    hls.off(Events.MANIFEST_PARSED, this.onManifestParsed, this);
    hls.off(Events.BUFFER_RESET, this.onBufferReset, this);
    hls.off(Events.BUFFER_APPENDING, this.onBufferAppending, this);
    hls.off(Events.BUFFER_CODECS, this.onBufferCodecs, this);
    hls.off(Events.BUFFER_EOS, this.onBufferEos, this);
    hls.off(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
    hls.off(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
    hls.off(Events.FRAG_PARSED, this.onFragParsed, this);
    hls.off(Events.FRAG_CHANGED, this.onFragChanged, this);
    hls.off(Events.ERROR, this.onError, this);
  }

  public transferMedia(): AttachMediaSourceData | null {
    const { media, mediaSource } = this;
    if (!media) {
      return null;
    }
    const tracks = {};
    if (this.operationQueue) {
      const updating = this.isUpdating();
      if (!updating) {
        this.operationQueue.removeBlockers();
      }
      const queued = this.isQueued();
      if (updating || queued) {
        this.warn(
          `Transfering MediaSource with${queued ? ' operations in queue' : ''}${updating ? ' updating SourceBuffer(s)' : ''} ${this.operationQueue}`,
        );
      }
      this.operationQueue.destroy();
    }
    const transferData = this.transferData;
    if (
      !this.sourceBufferCount &&
      transferData &&
      transferData.mediaSource === mediaSource
    ) {
      Object.assign(tracks, transferData.tracks);
    } else {
      this.sourceBuffers.forEach((tuple) => {
        const [type] = tuple;
        if (type) {
          tracks[type] = Object.assign({}, this.tracks[type]);
          this.removeBuffer(type);
        }
        tuple[0] = tuple[1] = null;
      });
    }
    return {
      media,
      mediaSource,
      tracks,
    };
  }

  private initTracks() {
    const tracks = {};
    this.sourceBuffers = [
      [null, null],
      [null, null],
    ];
    this.tracks = tracks;
    this.resetQueue();
    this.resetAppendErrors();
    this.lastMpegAudioChunk = this.blockedAudioAppend = null;
    this.lastVideoAppendEnd = 0;
  }

  private onManifestLoading() {
    this.bufferCodecEventsTotal = 0;
    this.details = null;
  }

  private onManifestParsed(
    event: Events.MANIFEST_PARSED,
    data: ManifestParsedData,
  ) {
    // in case of alt audio 2 BUFFER_CODECS events will be triggered, one per stream controller
    // sourcebuffers will be created all at once when the expected nb of tracks will be reached
    // in case alt audio is not used, only one BUFFER_CODEC event will be fired from main stream controller
    // it will contain the expected nb of source buffers, no need to compute it
    let codecEvents: number = 2;
    if ((data.audio && !data.video) || !data.altAudio) {
      codecEvents = 1;
    }
    this.bufferCodecEventsTotal = codecEvents;
    this.log(`${codecEvents} bufferCodec event(s) expected.`);
    if (
      this.transferData?.mediaSource &&
      this.sourceBufferCount &&
      codecEvents
    ) {
      this.bufferCreated();
    }
  }

  private onMediaAttaching(
    event: Events.MEDIA_ATTACHING,
    data: MediaAttachingData,
  ) {
    const media = (this.media = data.media);
    this.transferData = this.overrides = undefined;
    const MediaSource = getMediaSource(this.appendSource);
    if (MediaSource) {
      const transferringMedia = !!data.mediaSource;
      if (transferringMedia || data.overrides) {
        this.transferData = data;
        this.overrides = data.overrides;
      }
      const ms = (this.mediaSource = data.mediaSource || new MediaSource());
      this.assignMediaSource(ms);
      if (transferringMedia) {
        this._objectUrl = media.src;
        this.attachTransferred();
      } else {
        // cache the locally generated object url
        const objectUrl = (this._objectUrl = self.URL.createObjectURL(ms));
        // link video and media Source
        if (this.appendSource) {
          try {
            media.removeAttribute('src');
            // ManagedMediaSource will not open without disableRemotePlayback set to false or source alternatives
            const MMS = (self as any).ManagedMediaSource;
            media.disableRemotePlayback =
              media.disableRemotePlayback || (MMS && ms instanceof MMS);
            removeSourceChildren(media);
            addSource(media, objectUrl);
            media.load();
          } catch (error) {
            media.src = objectUrl;
          }
        } else {
          media.src = objectUrl;
        }
      }
      media.addEventListener('emptied', this._onMediaEmptied);
    }
  }

  private assignMediaSource(ms: MediaSource) {
    this.log(
      `${this.transferData?.mediaSource === ms ? 'transferred' : 'created'} media source: ${(ms.constructor as any)?.name}`,
    );
    // MediaSource listeners are arrow functions with a lexical scope, and do not need to be bound
    ms.addEventListener('sourceopen', this._onMediaSourceOpen);
    ms.addEventListener('sourceended', this._onMediaSourceEnded);
    ms.addEventListener('sourceclose', this._onMediaSourceClose);
    if (this.appendSource) {
      ms.addEventListener('startstreaming', this._onStartStreaming);
      ms.addEventListener('endstreaming', this._onEndStreaming);
    }
  }

  private attachTransferred() {
    const media = this.media;
    const data = this.transferData;
    if (!data || !media) {
      return;
    }
    const requiredTracks = this.tracks;
    const transferredTracks = data.tracks;
    const trackNames = transferredTracks
      ? Object.keys(transferredTracks)
      : null;
    const trackCount = trackNames ? trackNames.length : 0;
    const mediaSourceOpenCallback = () => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      Promise.resolve().then(() => {
        if (this.media && this.mediaSourceOpenOrEnded) {
          this._onMediaSourceOpen();
        }
      });
    };
    if (transferredTracks && trackNames && trackCount) {
      if (!this.tracksReady) {
        // Wait for CODECS event(s)
        this.hls.config.startFragPrefetch = true;
        this.log(`attachTransferred: waiting for SourceBuffer track info`);
        return;
      }
      this
        .log(`attachTransferred: (bufferCodecEventsTotal ${this.bufferCodecEventsTotal})
required tracks: ${stringify(requiredTracks, (key, value) => (key === 'initSegment' ? undefined : value))};
transfer tracks: ${stringify(transferredTracks, (key, value) => (key === 'initSegment' ? undefined : value))}}`);
      if (!isCompatibleTrackChange(transferredTracks, requiredTracks)) {
        // destroy attaching media source
        data.mediaSource = null;
        data.tracks = undefined;

        const currentTime = media.currentTime;

        const details = this.details;
        const startTime = Math.max(
          currentTime,
          details?.fragments[0].start || 0,
        );
        if (startTime - currentTime > 1) {
          this.log(
            `attachTransferred: waiting for playback to reach new tracks start time ${currentTime} -> ${startTime}`,
          );
          return;
        }
        this.warn(
          `attachTransferred: resetting MediaSource for incompatible tracks ("${Object.keys(transferredTracks)}"->"${Object.keys(requiredTracks)}") start time: ${startTime} currentTime: ${currentTime}`,
        );
        this.onMediaDetaching(Events.MEDIA_DETACHING, {});
        this.onMediaAttaching(Events.MEDIA_ATTACHING, data);
        media.currentTime = startTime;
        return;
      }
      this.transferData = undefined;
      trackNames.forEach((trackName) => {
        const type = trackName as SourceBufferName;
        const track = transferredTracks[type];
        if (track) {
          const sb = track.buffer;
          if (sb) {
            // Purge fragment tracker of ejected segments for existing buffer
            const fragmentTracker = this.fragmentTracker;
            const playlistType = track.id as PlaylistLevelType;
            if (
              fragmentTracker.hasFragments(playlistType) ||
              fragmentTracker.hasParts(playlistType)
            ) {
              const bufferedTimeRanges = BufferHelper.getBuffered(sb);
              fragmentTracker.detectEvictedFragments(
                type,
                bufferedTimeRanges,
                playlistType,
                null,
                true,
              );
            }
            // Transfer SourceBuffer
            const sbIndex = sourceBufferNameToIndex(type);
            const sbTuple = [type, sb] as Exclude<
              SourceBuffersTuple[typeof sbIndex],
              EmptyTuple
            >;
            this.sourceBuffers[sbIndex] = sbTuple as any;
            if (sb.updating && this.operationQueue) {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              this.operationQueue.prependBlocker(type);
            }
            this.trackSourceBuffer(type, track);
          }
        }
      });
      mediaSourceOpenCallback();
      this.bufferCreated();
    } else {
      this.log(`attachTransferred: MediaSource w/o SourceBuffers`);
      mediaSourceOpenCallback();
    }
  }

  private get mediaSourceOpenOrEnded(): boolean {
    const readyState = this.mediaSource?.readyState;
    return readyState === 'open' || readyState === 'ended';
  }

  private _onEndStreaming = (event) => {
    if (!this.hls as any) {
      return;
    }
    if (this.mediaSource?.readyState !== 'open') {
      return;
    }
    this.hls.pauseBuffering();
  };

  private _onStartStreaming = (event) => {
    if (!this.hls as any) {
      return;
    }
    this.hls.resumeBuffering();
  };

  private onMediaDetaching(
    event: Events.MEDIA_DETACHING,
    data: MediaDetachingData,
  ) {
    const transferringMedia = !!data.transferMedia;
    this.transferData = this.overrides = undefined;
    const { media, mediaSource, _objectUrl } = this;
    if (mediaSource) {
      this.log(
        `media source ${transferringMedia ? 'transferring' : 'detaching'}`,
      );
      if (transferringMedia) {
        // Detach SourceBuffers without removing from MediaSource
        // and leave `tracks` (required SourceBuffers configuration)
        this.sourceBuffers.forEach(([type]) => {
          if (type) {
            this.removeBuffer(type);
          }
        });
        this.resetQueue();
      } else {
        if (this.mediaSourceOpenOrEnded) {
          const open = mediaSource.readyState === 'open';
          try {
            const sourceBuffers = mediaSource.sourceBuffers;
            for (let i = sourceBuffers.length; i--; ) {
              if (open) {
                sourceBuffers[i].abort();
              }
              mediaSource.removeSourceBuffer(sourceBuffers[i]);
            }
            if (open) {
              // endOfStream could trigger exception if any sourcebuffer is in updating state
              // we don't really care about checking sourcebuffer state here,
              // as we are anyway detaching the MediaSource
              // let's just avoid this exception to propagate
              mediaSource.endOfStream();
            }
          } catch (err) {
            this.warn(
              `onMediaDetaching: ${err.message} while calling endOfStream`,
            );
          }
        }
        // Clean up the SourceBuffers by invoking onBufferReset
        if (this.sourceBufferCount) {
          this.onBufferReset();
        }
      }
      mediaSource.removeEventListener('sourceopen', this._onMediaSourceOpen);
      mediaSource.removeEventListener('sourceended', this._onMediaSourceEnded);
      mediaSource.removeEventListener('sourceclose', this._onMediaSourceClose);
      if (this.appendSource) {
        mediaSource.removeEventListener(
          'startstreaming',
          this._onStartStreaming,
        );
        mediaSource.removeEventListener('endstreaming', this._onEndStreaming);
      }

      this.mediaSource = null;
      this._objectUrl = null;
    }

    // Detach properly the MediaSource from the HTMLMediaElement as
    // suggested in https://github.com/w3c/media-source/issues/53.
    if (media) {
      media.removeEventListener('emptied', this._onMediaEmptied);
      if (!transferringMedia) {
        if (_objectUrl) {
          self.URL.revokeObjectURL(_objectUrl);
        }

        // clean up video tag src only if it's our own url. some external libraries might
        // hijack the video tag and change its 'src' without destroying the Hls instance first
        if (this.mediaSrc === _objectUrl) {
          media.removeAttribute('src');
          if (this.appendSource) {
            removeSourceChildren(media);
          }
          media.load();
        } else {
          this.warn(
            'media|source.src was changed by a third party - skip cleanup',
          );
        }
      }
      this.media = null;
    }

    this.hls.trigger(Events.MEDIA_DETACHED, data);
  }

  private onBufferReset() {
    this.sourceBuffers.forEach(([type]) => {
      if (type) {
        this.resetBuffer(type);
      }
    });
    this.initTracks();
  }

  private resetBuffer(type: SourceBufferName) {
    const sb = this.tracks[type]?.buffer;
    this.removeBuffer(type);
    if (sb) {
      try {
        if (this.mediaSource?.sourceBuffers.length) {
          this.mediaSource.removeSourceBuffer(sb);
        }
      } catch (err) {
        this.warn(`onBufferReset ${type}`, err);
      }
    }
    delete this.tracks[type];
  }

  private removeBuffer(type: SourceBufferName) {
    this.removeBufferListeners(type);
    this.sourceBuffers[sourceBufferNameToIndex(type)] = [null, null];
    const track = this.tracks[type];
    if (track) {
      track.buffer = undefined;
    }
  }

  private resetQueue() {
    if (this.operationQueue) {
      this.operationQueue.destroy();
    }
    this.operationQueue = new BufferOperationQueue(this.tracks);
  }

  private onBufferCodecs(event: Events.BUFFER_CODECS, data: BufferCodecsData) {
    const tracks = this.tracks;
    const trackNames = Object.keys(data);
    this.log(
      `BUFFER_CODECS: "${trackNames}" (current SB count ${this.sourceBufferCount})`,
    );
    const unmuxedToMuxed =
      ('audiovideo' in data && (tracks.audio || tracks.video)) ||
      (tracks.audiovideo && ('audio' in data || 'video' in data));
    const muxedToUnmuxed =
      !unmuxedToMuxed &&
      this.sourceBufferCount &&
      this.media &&
      trackNames.some((sbName) => !tracks[sbName]);
    if (unmuxedToMuxed || muxedToUnmuxed) {
      this.warn(
        `Unsupported transition between "${Object.keys(tracks)}" and "${trackNames}" SourceBuffers`,
      );
      // Do not add incompatible track ('audiovideo' <-> 'video'/'audio').
      // Allow following onBufferAppending handle to trigger BUFFER_APPEND_ERROR.
      // This will either be resolved by level switch or could be handled with recoverMediaError().
      return;
    }
    trackNames.forEach((trackName: SourceBufferName) => {
      const parsedTrack = data[trackName] as ParsedTrack;
      const { id, codec, levelCodec, container, metadata, supplemental } =
        parsedTrack;
      let track = tracks[trackName];
      const transferredTrack = this.transferData?.tracks?.[trackName];
      const sbTrack = transferredTrack?.buffer ? transferredTrack : track;
      const sbCodec = sbTrack?.pendingCodec || sbTrack?.codec;
      const trackLevelCodec = sbTrack?.levelCodec;
      if (!track) {
        track = tracks[trackName] = {
          buffer: undefined,
          listeners: [],
          codec,
          supplemental,
          container,
          levelCodec,
          metadata,
          id,
        };
      }
      // check if SourceBuffer codec needs to change
      const currentCodecFull = pickMostCompleteCodecName(
        sbCodec,
        trackLevelCodec,
      );
      const currentCodec = currentCodecFull?.replace(
        VIDEO_CODEC_PROFILE_REPLACE,
        '$1',
      );
      let trackCodec = pickMostCompleteCodecName(codec, levelCodec);
      const nextCodec = trackCodec?.replace(VIDEO_CODEC_PROFILE_REPLACE, '$1');
      if (trackCodec && currentCodecFull && currentCodec !== nextCodec) {
        if (trackName.slice(0, 5) === 'audio') {
          trackCodec = getCodecCompatibleName(trackCodec, this.appendSource);
        }
        this.log(`switching codec ${sbCodec} to ${trackCodec}`);
        if (trackCodec !== (track.pendingCodec || track.codec)) {
          track.pendingCodec = trackCodec;
        }
        track.container = container;
        this.appendChangeType(trackName, container, trackCodec);
      }
    });

    if (this.tracksReady || this.sourceBufferCount) {
      data.tracks = this.sourceBufferTracks;
    }

    // if sourcebuffers already created, do nothing ...
    if (this.sourceBufferCount) {
      return;
    }

    if (
      this.bufferCodecEventsTotal > 1 &&
      !this.tracks.video &&
      !data.video &&
      data.audio?.id === 'main'
    ) {
      // MVP is missing CODECS and only audio was found in main segment (#7524)
      this.log(`Main audio-only`);
      this.bufferCodecEventsTotal = 1;
    }

    if (this.mediaSourceOpenOrEnded) {
      this.checkPendingTracks();
    }
  }

  public get sourceBufferTracks(): BaseTrackSet {
    return Object.keys(this.tracks).reduce((baseTracks: BaseTrackSet, type) => {
      const track = this.tracks[type] as SourceBufferTrack;
      baseTracks[type] = {
        id: track.id,
        container: track.container,
        codec: track.codec,
        levelCodec: track.levelCodec,
      };
      return baseTracks;
    }, {});
  }

  private appendChangeType(
    type: SourceBufferName,
    container: string,
    codec: string,
  ) {
    const mimeType = `${container};codecs=${codec}`;
    const operation: BufferOperation = {
      label: `change-type=${mimeType}`,
      execute: () => {
        const track = this.tracks[type];
        if (track) {
          const sb = track.buffer;
          if (sb?.changeType) {
            this.log(`changing ${type} sourceBuffer type to ${mimeType}`);
            sb.changeType(mimeType);
            track.codec = codec;
            track.container = container;
          }
        }
        this.shiftAndExecuteNext(type);
      },
      onStart: () => {},
      onComplete: () => {},
      onError: (error: Error) => {
        this.warn(`Failed to change ${type} SourceBuffer type`, error);
      },
    };
    this.append(operation, type, this.isPending(this.tracks[type]));
  }

  private blockAudio(partOrFrag: MediaFragment | Part) {
    const pStart = partOrFrag.start;
    const pTime = pStart + partOrFrag.duration * 0.05;
    const atGap =
      this.fragmentTracker.getAppendedFrag(pStart, PlaylistLevelType.MAIN)
        ?.gap === true;
    if (atGap) {
      return;
    }
    const op: BufferOperation = {
      label: 'block-audio',
      execute: () => {
        const videoTrack = this.tracks.video;
        if (
          this.lastVideoAppendEnd > pTime ||
          (videoTrack?.buffer &&
            BufferHelper.isBuffered(videoTrack.buffer, pTime)) ||
          this.fragmentTracker.getAppendedFrag(pTime, PlaylistLevelType.MAIN)
            ?.gap === true
        ) {
          this.blockedAudioAppend = null;
          this.shiftAndExecuteNext('audio');
        }
      },
      onStart: () => {},
      onComplete: () => {},
      onError: (error) => {
        this.warn('Error executing block-audio operation', error);
      },
    };
    this.blockedAudioAppend = { op, frag: partOrFrag };
    this.append(op, 'audio', true);
  }

  private unblockAudio() {
    const { blockedAudioAppend, operationQueue } = this;
    if (blockedAudioAppend && operationQueue) {
      this.blockedAudioAppend = null;
      operationQueue.unblockAudio(blockedAudioAppend.op);
    }
  }

  private onBufferAppending(
    event: Events.BUFFER_APPENDING,
    eventData: BufferAppendingData,
  ) {
    const { tracks } = this;
    const { data, type, parent, frag, part, chunkMeta, offset } = eventData;
    const chunkStats = chunkMeta.buffering[type];
    const { sn, cc } = frag;
    const bufferAppendingStart = self.performance.now();
    chunkStats.start = bufferAppendingStart;
    const fragBuffering = frag.stats.buffering;
    const partBuffering = part ? part.stats.buffering : null;
    if (fragBuffering.start === 0) {
      fragBuffering.start = bufferAppendingStart;
    }
    if (partBuffering && partBuffering.start === 0) {
      partBuffering.start = bufferAppendingStart;
    }

    // TODO: Only update timestampOffset when audio/mpeg fragment or part is not contiguous with previously appended
    // Adjusting `SourceBuffer.timestampOffset` (desired point in the timeline where the next frames should be appended)
    // in Chrome browser when we detect MPEG audio container and time delta between level PTS and `SourceBuffer.timestampOffset`
    // is greater than 100ms (this is enough to handle seek for VOD or level change for LIVE videos).
    // More info here: https://github.com/video-dev/hls.js/issues/332#issuecomment-257986486
    const audioTrack = tracks.audio;
    let checkTimestampOffset = false;
    if (type === 'audio' && audioTrack?.container === 'audio/mpeg') {
      checkTimestampOffset =
        !this.lastMpegAudioChunk ||
        chunkMeta.id === 1 ||
        this.lastMpegAudioChunk.sn !== chunkMeta.sn;
      this.lastMpegAudioChunk = chunkMeta;
    }

    // Block audio append until overlapping video append
    const videoTrack = tracks.video;
    const videoSb = videoTrack?.buffer;
    if (videoSb && sn !== 'initSegment') {
      const partOrFrag = part || (frag as MediaFragment);
      const blockedAudioAppend = this.blockedAudioAppend;
      if (
        type === 'audio' &&
        parent !== 'main' &&
        !this.blockedAudioAppend &&
        !(videoTrack.ending || videoTrack.ended)
      ) {
        const pStart = partOrFrag.start;
        const pTime = pStart + partOrFrag.duration * 0.05;
        const vbuffered = videoSb.buffered;
        const vappending = this.currentOp('video');
        if (!vbuffered.length && !vappending) {
          // wait for video before appending audio
          this.blockAudio(partOrFrag);
        } else if (
          !vappending &&
          !BufferHelper.isBuffered(videoSb, pTime) &&
          this.lastVideoAppendEnd < pTime
        ) {
          // audio is ahead of video
          this.blockAudio(partOrFrag);
        }
      } else if (type === 'video') {
        const videoAppendEnd = partOrFrag.end;
        if (blockedAudioAppend) {
          const audioStart = blockedAudioAppend.frag.start;
          if (
            videoAppendEnd > audioStart ||
            videoAppendEnd < this.lastVideoAppendEnd ||
            BufferHelper.isBuffered(videoSb, audioStart)
          ) {
            this.unblockAudio();
          }
        }
        this.lastVideoAppendEnd = videoAppendEnd;
      }
    }

    const fragStart = (part || frag).start;
    const operation: BufferOperation = {
      label: `append-${type}`,
      execute: () => {
        chunkStats.executeStart = self.performance.now();

        const sb = this.tracks[type]?.buffer;
        if (sb) {
          if (checkTimestampOffset) {
            this.updateTimestampOffset(sb, fragStart, 0.1, type, sn, cc);
          } else if (offset !== undefined && Number.isFinite(offset)) {
            this.updateTimestampOffset(sb, offset, 0.000001, type, sn, cc);
          }
        }
        this.appendExecutor(data, type);
      },
      onStart: () => {
        // logger.debug(`[buffer-controller]: ${type} SourceBuffer updatestart`);
      },
      onComplete: () => {
        // logger.debug(`[buffer-controller]: ${type} SourceBuffer updateend`);
        const end = self.performance.now();
        chunkStats.executeEnd = chunkStats.end = end;
        if (fragBuffering.first === 0) {
          fragBuffering.first = end;
        }
        if (partBuffering && partBuffering.first === 0) {
          partBuffering.first = end;
        }

        const timeRanges = {};
        this.sourceBuffers.forEach(([type, sb]) => {
          if (type) {
            timeRanges[type] = BufferHelper.getBuffered(sb);
          }
        });
        this.appendErrors[type] = 0;
        if (type === 'audio' || type === 'video') {
          this.appendErrors.audiovideo = 0;
        } else {
          this.appendErrors.audio = 0;
          this.appendErrors.video = 0;
        }
        this.hls.trigger(Events.BUFFER_APPENDED, {
          type,
          frag,
          part,
          chunkMeta,
          parent: frag.type,
          timeRanges,
        });
      },
      onError: (error: Error) => {
        // in case any error occured while appending, put back segment in segments table
        const event: ErrorData = {
          type: ErrorTypes.MEDIA_ERROR,
          parent: frag.type,
          details: ErrorDetails.BUFFER_APPEND_ERROR,
          sourceBufferName: type,
          frag,
          part,
          chunkMeta,
          error,
          err: error,
          fatal: false,
        };
        const mediaError = this.media?.error;
        if (
          (error as DOMException).code === DOMException.QUOTA_EXCEEDED_ERR ||
          error.name == 'QuotaExceededError' ||
          `quota` in error
        ) {
          // QuotaExceededError: http://www.w3.org/TR/html5/infrastructure.html#quotaexceedederror
          // let's stop appending any segments, and report BUFFER_FULL_ERROR error
          event.details = ErrorDetails.BUFFER_FULL_ERROR;
        } else if (
          (error as DOMException).code === DOMException.INVALID_STATE_ERR &&
          this.mediaSourceOpenOrEnded &&
          !mediaError
        ) {
          // Allow retry for "Failed to execute 'appendBuffer' on 'SourceBuffer': This SourceBuffer is still processing" errors
          event.errorAction = createDoNothingErrorAction(true);
        } else if (
          error.name === TRACK_REMOVED_ERROR_NAME &&
          this.sourceBufferCount === 0
        ) {
          // Do nothing if sourceBuffers were removed (media is detached and append was not aborted)
          event.errorAction = createDoNothingErrorAction(true);
        } else {
          const appendErrorCount = ++this.appendErrors[type];
          /* with UHD content, we could get loop of quota exceeded error until
            browser is able to evict some data from sourcebuffer. Retrying can help recover.
          */
          this.warn(
            `Failed ${appendErrorCount}/${this.hls.config.appendErrorMaxRetry} times to append segment in "${type}" sourceBuffer (${mediaError ? mediaError : 'no media error'})`,
          );
          if (
            appendErrorCount >= this.hls.config.appendErrorMaxRetry ||
            !!mediaError
          ) {
            event.fatal = true;
          }
        }
        this.hls.trigger(Events.ERROR, event);
      },
    };
    this.log(
      `queuing "${type}" append sn: ${sn}${part ? ' p: ' + part.index : ''} of ${frag.type === PlaylistLevelType.MAIN ? 'level' : 'track'} ${frag.level} cc: ${cc}`,
    );
    this.append(operation, type, this.isPending(this.tracks[type]));
  }

  private getFlushOp(
    type: SourceBufferName,
    start: number,
    end: number,
  ): BufferOperation {
    this.log(`queuing "${type}" remove ${start}-${end}`);
    return {
      label: 'remove',
      execute: () => {
        this.removeExecutor(type, start, end);
      },
      onStart: () => {
        // logger.debug(`[buffer-controller]: Started flushing ${data.startOffset} -> ${data.endOffset} for ${type} Source Buffer`);
      },
      onComplete: () => {
        // logger.debug(`[buffer-controller]: Finished flushing ${data.startOffset} -> ${data.endOffset} for ${type} Source Buffer`);
        this.hls.trigger(Events.BUFFER_FLUSHED, { type });
      },
      onError: (error: Error) => {
        this.warn(
          `Failed to remove ${start}-${end} from "${type}" SourceBuffer`,
          error,
        );
      },
    };
  }

  private onBufferFlushing(
    event: Events.BUFFER_FLUSHING,
    data: BufferFlushingData,
  ) {
    const { type, startOffset, endOffset } = data;
    if (type) {
      this.append(this.getFlushOp(type, startOffset, endOffset), type);
    } else {
      this.sourceBuffers.forEach(([type]) => {
        if (type) {
          this.append(this.getFlushOp(type, startOffset, endOffset), type);
        }
      });
    }
  }

  private onFragParsed(event: Events.FRAG_PARSED, data: FragParsedData) {
    const { frag, part } = data;
    const buffersAppendedTo: SourceBufferName[] = [];
    const elementaryStreams = part
      ? part.elementaryStreams
      : frag.elementaryStreams;
    if (elementaryStreams[ElementaryStreamTypes.AUDIOVIDEO]) {
      buffersAppendedTo.push('audiovideo');
    } else {
      if (elementaryStreams[ElementaryStreamTypes.AUDIO]) {
        buffersAppendedTo.push('audio');
      }
      if (elementaryStreams[ElementaryStreamTypes.VIDEO]) {
        buffersAppendedTo.push('video');
      }
    }

    const onUnblocked = () => {
      const now = self.performance.now();
      frag.stats.buffering.end = now;
      if (part) {
        part.stats.buffering.end = now;
      }
      const stats = part ? part.stats : frag.stats;
      this.hls.trigger(Events.FRAG_BUFFERED, {
        frag,
        part,
        stats,
        id: frag.type,
      });
    };

    if (buffersAppendedTo.length === 0) {
      this.warn(
        `Fragments must have at least one ElementaryStreamType set. type: ${frag.type} level: ${frag.level} sn: ${frag.sn}`,
      );
    }

    this.blockBuffers(onUnblocked, buffersAppendedTo).catch((error) => {
      this.warn(`Fragment buffered callback ${error}`);
      this.stepOperationQueue(this.sourceBufferTypes);
    });
  }

  private onFragChanged(event: Events.FRAG_CHANGED, data: FragChangedData) {
    this.trimBuffers();
  }

  public get bufferedToEnd(): boolean {
    return (
      this.sourceBufferCount > 0 &&
      !this.sourceBuffers.some(([type]) => {
        if (type) {
          const track = this.tracks[type];
          if (track) {
            return !track.ended || track.ending;
          }
        }
        return false;
      })
    );
  }

  // on BUFFER_EOS mark matching sourcebuffer(s) as "ending" and "ended" and queue endOfStream after remaining operations(s)
  // an undefined data.type will mark all buffers as EOS.
  private onBufferEos(event: Events.BUFFER_EOS, data: BufferEOSData) {
    this.sourceBuffers.forEach(([type]) => {
      if (type) {
        const track = this.tracks[type] as SourceBufferTrack;
        if (!data.type || data.type === type) {
          track.ending = true;
          if (!track.ended) {
            track.ended = true;
            this.log(`${type} buffer reached EOS`);
          }
        }
      }
    });

    const allowEndOfStream = this.overrides?.endOfStream !== false;
    const allTracksEnding =
      this.sourceBufferCount > 0 &&
      !this.sourceBuffers.some(([type]) => type && !this.tracks[type]?.ended);

    if (allTracksEnding) {
      if (allowEndOfStream) {
        this.log(`Queueing EOS`);
        this.blockUntilOpen(() => {
          this.tracksEnded();
          const { mediaSource } = this;
          if (!mediaSource || mediaSource.readyState !== 'open') {
            if (mediaSource) {
              this.log(
                `Could not call mediaSource.endOfStream(). mediaSource.readyState: ${mediaSource.readyState}`,
              );
            }
            return;
          }
          this.log(`Calling mediaSource.endOfStream()`);
          // Allow this to throw and be caught by the enqueueing function
          mediaSource.endOfStream();

          this.hls.trigger(Events.BUFFERED_TO_END, undefined);
        });
      } else {
        this.tracksEnded();
        this.hls.trigger(Events.BUFFERED_TO_END, undefined);
      }
    } else if (data.type === 'video') {
      // Make sure pending audio appends are unblocked when video reaches end
      this.unblockAudio();
    }
  }

  private tracksEnded() {
    this.sourceBuffers.forEach(([type]) => {
      if (type !== null) {
        const track = this.tracks[type];
        if (track) {
          track.ending = false;
        }
      }
    });
  }

  private onLevelUpdated(
    event: Events.LEVEL_UPDATED,
    { details }: LevelUpdatedData,
  ) {
    if (!details.fragments.length) {
      return;
    }
    this.details = details;
    this.updateDuration();
  }

  private updateDuration() {
    this.blockUntilOpen(() => {
      const durationAndRange = this.getDurationAndRange();
      if (!durationAndRange) {
        return;
      }
      this.updateMediaSource(durationAndRange);
    });
  }

  private onError(event: Events.ERROR, data: ErrorData) {
    if (data.details === ErrorDetails.BUFFER_APPEND_ERROR && data.frag) {
      const nextAutoLevel = data.errorAction?.nextAutoLevel;
      if (Number.isFinite(nextAutoLevel) && nextAutoLevel !== data.frag.level) {
        this.resetAppendErrors();
      }
    }
  }

  private resetAppendErrors() {
    this.appendErrors = {
      audio: 0,
      video: 0,
      audiovideo: 0,
    };
  }

  private trimBuffers() {
    const { hls, details, media } = this;
    if (!media || details === null) {
      return;
    }

    if (!this.sourceBufferCount) {
      return;
    }

    const config: Readonly<HlsConfig> = hls.config;
    const currentTime = media.currentTime;
    const targetDuration = details.levelTargetDuration;

    // Support for deprecated liveBackBufferLength
    const backBufferLength =
      details.live && config.liveBackBufferLength !== null
        ? config.liveBackBufferLength
        : config.backBufferLength;

    if (Number.isFinite(backBufferLength) && backBufferLength >= 0) {
      const maxBackBufferLength = Math.max(backBufferLength, targetDuration);
      const targetBackBufferPosition =
        Math.floor(currentTime / targetDuration) * targetDuration -
        maxBackBufferLength;

      this.flushBackBuffer(
        currentTime,
        targetDuration,
        targetBackBufferPosition,
      );
    }

    const frontBufferFlushThreshold = config.frontBufferFlushThreshold;
    if (
      Number.isFinite(frontBufferFlushThreshold) &&
      frontBufferFlushThreshold > 0
    ) {
      const frontBufferLength = Math.max(
        config.maxBufferLength,
        frontBufferFlushThreshold,
      );

      const maxFrontBufferLength = Math.max(frontBufferLength, targetDuration);
      const targetFrontBufferPosition =
        Math.floor(currentTime / targetDuration) * targetDuration +
        maxFrontBufferLength;

      this.flushFrontBuffer(
        currentTime,
        targetDuration,
        targetFrontBufferPosition,
      );
    }
  }

  private flushBackBuffer(
    currentTime: number,
    targetDuration: number,
    targetBackBufferPosition: number,
  ) {
    this.sourceBuffers.forEach(([type, sb]) => {
      if (sb) {
        const buffered = BufferHelper.getBuffered(sb);
        // when target buffer start exceeds actual buffer start
        if (
          buffered.length > 0 &&
          targetBackBufferPosition > buffered.start(0)
        ) {
          this.hls.trigger(Events.BACK_BUFFER_REACHED, {
            bufferEnd: targetBackBufferPosition,
          });

          // Support for deprecated event:
          const track = this.tracks[type];
          if (this.details?.live) {
            this.hls.trigger(Events.LIVE_BACK_BUFFER_REACHED, {
              bufferEnd: targetBackBufferPosition,
            });
          } else if (track?.ended) {
            this.log(
              `Cannot flush ${type} back buffer while SourceBuffer is in ended state`,
            );
            return;
          }

          this.hls.trigger(Events.BUFFER_FLUSHING, {
            startOffset: 0,
            endOffset: targetBackBufferPosition,
            type,
          });
        }
      }
    });
  }

  private flushFrontBuffer(
    currentTime: number,
    targetDuration: number,
    targetFrontBufferPosition: number,
  ) {
    this.sourceBuffers.forEach(([type, sb]) => {
      if (sb) {
        const buffered = BufferHelper.getBuffered(sb);
        const numBufferedRanges = buffered.length;
        // The buffer is either empty or contiguous
        if (numBufferedRanges < 2) {
          return;
        }
        const bufferStart = buffered.start(numBufferedRanges - 1);
        const bufferEnd = buffered.end(numBufferedRanges - 1);
        // No flush if we can tolerate the current buffer length or the current buffer range we would flush is contiguous with current position
        if (
          targetFrontBufferPosition > bufferStart ||
          (currentTime >= bufferStart && currentTime <= bufferEnd)
        ) {
          return;
        }

        this.hls.trigger(Events.BUFFER_FLUSHING, {
          startOffset: bufferStart,
          endOffset: Infinity,
          type,
        });
      }
    });
  }

  /**
   * Update Media Source duration to current level duration or override to Infinity if configuration parameter
   * 'liveDurationInfinity` is set to `true`
   * More details: https://github.com/video-dev/hls.js/issues/355
   */
  private getDurationAndRange(): {
    duration: number;
    start?: number;
    end?: number;
  } | null {
    const { details, mediaSource } = this;
    if (!details || !this.media || mediaSource?.readyState !== 'open') {
      return null;
    }
    const playlistEnd = details.edge;
    if (details.live && this.hls.config.liveDurationInfinity) {
      const len = details.fragments.length;
      if (len && !!(mediaSource as any).setLiveSeekableRange) {
        const start = Math.max(0, details.fragmentStart);
        const end = Math.max(start, playlistEnd);

        return { duration: Infinity, start, end };
      }
      return { duration: Infinity };
    }
    const overrideDuration = this.overrides?.duration;
    if (overrideDuration) {
      if (!Number.isFinite(overrideDuration)) {
        return null;
      }
      return { duration: overrideDuration };
    }
    const mediaDuration = this.media.duration;
    const msDuration = Number.isFinite(mediaSource.duration)
      ? mediaSource.duration
      : 0;
    if (
      (playlistEnd > msDuration && playlistEnd > mediaDuration) ||
      !Number.isFinite(mediaDuration)
    ) {
      return { duration: playlistEnd };
    }
    return null;
  }

  private updateMediaSource({
    duration,
    start,
    end,
  }: {
    duration: number;
    start?: number;
    end?: number;
  }) {
    const mediaSource = this.mediaSource;
    if (!this.media || !mediaSource || mediaSource.readyState !== 'open') {
      return;
    }
    if (mediaSource.duration !== duration) {
      if (Number.isFinite(duration)) {
        this.log(`Updating MediaSource duration to ${duration.toFixed(3)}`);
      }
      mediaSource.duration = duration;
    }
    if (start !== undefined && end !== undefined) {
      this.log(
        `MediaSource duration is set to ${mediaSource.duration}. Setting seekable range to ${start}-${end}.`,
      );
      mediaSource.setLiveSeekableRange(start, end);
    }
  }

  private get tracksReady(): boolean {
    const pendingTrackCount = this.pendingTrackCount;
    return (
      pendingTrackCount > 0 &&
      (pendingTrackCount >= this.bufferCodecEventsTotal ||
        this.isPending(this.tracks.audiovideo))
    );
  }

  private checkPendingTracks() {
    const { bufferCodecEventsTotal, pendingTrackCount, tracks } = this;
    this.log(
      `checkPendingTracks (pending: ${pendingTrackCount} codec events expected: ${bufferCodecEventsTotal}) ${stringify(tracks)}`,
    );
    // Check if we've received all of the expected bufferCodec events. When none remain, create all the sourceBuffers at once.
    // This is important because the MSE spec allows implementations to throw QuotaExceededErrors if creating new sourceBuffers after
    // data has been appended to existing ones.
    // 2 tracks is the max (one for audio, one for video). If we've reach this max go ahead and create the buffers.
    if (this.tracksReady) {
      const transferredTracks = this.transferData?.tracks;
      if (transferredTracks && Object.keys(transferredTracks).length) {
        this.attachTransferred();
      } else {
        // ok, let's create them now !
        this.createSourceBuffers();
      }
    }
  }

  private bufferCreated() {
    if (this.sourceBufferCount) {
      const tracks: BufferCreatedTrackSet = {};
      this.sourceBuffers.forEach(([type, buffer]) => {
        if (type) {
          const track = this.tracks[type] as SourceBufferTrack;
          tracks[type] = {
            buffer,
            container: track.container,
            codec: track.codec,
            supplemental: track.supplemental,
            levelCodec: track.levelCodec,
            id: track.id,
            metadata: track.metadata,
          };
        }
      });
      this.hls.trigger(Events.BUFFER_CREATED, {
        tracks,
      });
      this.log(`SourceBuffers created. Running queue: ${this.operationQueue}`);
      this.sourceBuffers.forEach(([type]) => {
        this.executeNext(type);
      });
    } else {
      const error = new Error(
        'could not create source buffer for media codec(s)',
      );
      this.hls.trigger(Events.ERROR, {
        type: ErrorTypes.MEDIA_ERROR,
        details: ErrorDetails.BUFFER_INCOMPATIBLE_CODECS_ERROR,
        fatal: true,
        error,
        reason: error.message,
      });
    }
  }

  private createSourceBuffers() {
    const { tracks, sourceBuffers, mediaSource } = this;
    if (!mediaSource) {
      throw new Error('createSourceBuffers called when mediaSource was null');
    }

    for (const trackName in tracks) {
      const type = trackName as SourceBufferName;
      const track = tracks[type];
      if (this.isPending(track)) {
        const codec = this.getTrackCodec(track, type);
        const mimeType = `${track.container};codecs=${codec}`;
        track.codec = codec;
        this.log(
          `creating sourceBuffer(${mimeType})${this.currentOp(type) ? ' Queued' : ''} ${stringify(track)}`,
        );
        try {
          const sb = mediaSource.addSourceBuffer(
            mimeType,
          ) as ExtendedSourceBuffer;
          const sbIndex = sourceBufferNameToIndex(type);
          const sbTuple = [type, sb] as Exclude<
            SourceBuffersTuple[typeof sbIndex],
            EmptyTuple
          >;
          sourceBuffers[sbIndex] = sbTuple as any;
          track.buffer = sb;
        } catch (error) {
          this.error(
            `error while trying to add sourceBuffer: ${error.message}`,
          );
          // remove init segment from queue and delete track info
          this.shiftAndExecuteNext(type);
          this.operationQueue?.removeBlockers();
          delete this.tracks[type];
          this.hls.trigger(Events.ERROR, {
            type: ErrorTypes.MEDIA_ERROR,
            details: ErrorDetails.BUFFER_ADD_CODEC_ERROR,
            fatal: false,
            error,
            sourceBufferName: type,
            mimeType: mimeType,
            parent: track.id as PlaylistLevelType,
          });
          return;
        }
        this.trackSourceBuffer(type, track);
      }
    }
    this.bufferCreated();
  }

  private getTrackCodec(track: BaseTrack, trackName: SourceBufferName): string {
    // Use supplemental video codec when supported when adding SourceBuffer (#5558)
    const supplementalCodec = track.supplemental;
    let trackCodec = track.codec;
    if (
      supplementalCodec &&
      (trackName === 'video' || trackName === 'audiovideo') &&
      areCodecsMediaSourceSupported(supplementalCodec, 'video')
    ) {
      trackCodec = replaceVideoCodec(trackCodec, supplementalCodec);
    }
    const codec = pickMostCompleteCodecName(trackCodec, track.levelCodec);
    if (codec) {
      if (trackName.slice(0, 5) === 'audio') {
        return getCodecCompatibleName(codec, this.appendSource);
      }
      return codec;
    }
    return '';
  }

  private trackSourceBuffer(type: SourceBufferName, track: SourceBufferTrack) {
    const buffer = track.buffer;
    if (!buffer) {
      return;
    }
    const codec = this.getTrackCodec(track, type);
    this.tracks[type] = {
      buffer,
      codec,
      container: track.container,
      levelCodec: track.levelCodec,
      supplemental: track.supplemental,
      metadata: track.metadata,
      id: track.id,
      listeners: [],
    };
    this.removeBufferListeners(type);
    this.addBufferListener(type, 'updatestart', this.onSBUpdateStart);
    this.addBufferListener(type, 'updateend', this.onSBUpdateEnd);
    this.addBufferListener(type, 'error', this.onSBUpdateError);
    // ManagedSourceBuffer bufferedchange event
    if (this.appendSource) {
      this.addBufferListener(
        type,
        'bufferedchange',
        (type: SourceBufferName, event: BufferedChangeEvent) => {
          // If media was ejected check for a change. Added ranges are redundant with changes on 'updateend' event.
          const removedRanges = event.removedRanges;
          if (removedRanges?.length) {
            this.hls.trigger(Events.BUFFER_FLUSHED, {
              type: type,
            });
          }
        },
      );
    }
  }

  // Keep as arrow functions so that we can directly reference these functions directly as event listeners
  private _onMediaSourceOpen = (e?: Event) => {
    const { media, mediaSource } = this;
    if (e) {
      this.log('Media source opened');
    }
    if (!media || !mediaSource) {
      return;
    }
    // once received, don't listen anymore to sourceopen event
    mediaSource.removeEventListener('sourceopen', this._onMediaSourceOpen);
    media.removeEventListener('emptied', this._onMediaEmptied);
    this.updateDuration();
    this.hls.trigger(Events.MEDIA_ATTACHED, {
      media,
      mediaSource: mediaSource as MediaSource,
    });

    if (this.mediaSource !== null) {
      this.checkPendingTracks();
    }
  };

  private _onMediaSourceClose = () => {
    this.log('Media source closed');
  };

  private _onMediaSourceEnded = () => {
    this.log('Media source ended');
  };

  private _onMediaEmptied = () => {
    const { mediaSrc, _objectUrl } = this;
    if (mediaSrc !== _objectUrl) {
      this.error(
        `Media element src was set while attaching MediaSource (${_objectUrl} > ${mediaSrc})`,
      );
    }
  };

  private get mediaSrc(): string | undefined {
    const media = (this.media?.querySelector as any)?.('source') || this.media;
    return media?.src;
  }

  private onSBUpdateStart(type: SourceBufferName) {
    const operation = this.currentOp(type);
    if (!operation) {
      return;
    }
    operation.onStart();
  }

  private onSBUpdateEnd(type: SourceBufferName) {
    if (this.mediaSource?.readyState === 'closed') {
      this.resetBuffer(type);
      return;
    }
    const operation = this.currentOp(type);
    if (!operation) {
      return;
    }
    operation.onComplete();
    this.shiftAndExecuteNext(type);
  }

  private onSBUpdateError(type: SourceBufferName, event: Event) {
    const error = new Error(
      `${type} SourceBuffer error. MediaSource readyState: ${this.mediaSource?.readyState}`,
    );
    this.error(`${error}`, event);
    // according to http://www.w3.org/TR/media-source/#sourcebuffer-append-error
    // SourceBuffer errors are not necessarily fatal; if so, the HTMLMediaElement will fire an error event
    this.hls.trigger(Events.ERROR, {
      type: ErrorTypes.MEDIA_ERROR,
      details: ErrorDetails.BUFFER_APPENDING_ERROR,
      sourceBufferName: type,
      error,
      fatal: false,
    });
    // updateend is always fired after error, so we'll allow that to shift the current operation off of the queue
    const operation = this.currentOp(type);
    if (operation) {
      operation.onError(error);
    }
  }

  private updateTimestampOffset(
    sb: ExtendedSourceBuffer,
    timestampOffset: number,
    tolerance: number,
    type: SourceBufferName,
    sn: number | 'initSegment',
    cc: number,
  ) {
    const delta = timestampOffset - sb.timestampOffset;
    if (Math.abs(delta) >= tolerance) {
      this.log(
        `Updating ${type} SourceBuffer timestampOffset to ${timestampOffset} (sn: ${sn} cc: ${cc})`,
      );
      sb.timestampOffset = timestampOffset;
    }
  }

  // This method must result in an updateend event; if remove is not called, onSBUpdateEnd must be called manually
  private removeExecutor(
    type: SourceBufferName,
    startOffset: number,
    endOffset: number,
  ) {
    const { media, mediaSource } = this;
    const track = this.tracks[type];
    const sb = track?.buffer;
    if (!media || !mediaSource || !sb) {
      this.warn(
        `Attempting to remove from the ${type} SourceBuffer, but it does not exist`,
      );
      this.shiftAndExecuteNext(type);
      return;
    }
    const mediaDuration = Number.isFinite(media.duration)
      ? media.duration
      : Infinity;
    const msDuration = Number.isFinite(mediaSource.duration)
      ? mediaSource.duration
      : Infinity;
    const removeStart = Math.max(0, startOffset);
    const removeEnd = Math.min(endOffset, mediaDuration, msDuration);
    if (removeEnd > removeStart && (!track.ending || track.ended)) {
      track.ended = false;
      this.log(
        `Removing [${removeStart},${removeEnd}] from the ${type} SourceBuffer`,
      );
      sb.remove(removeStart, removeEnd);
    } else {
      // Cycle the queue
      this.shiftAndExecuteNext(type);
    }
  }

  // This method must result in an updateend event; if append is not called, onSBUpdateEnd must be called manually
  private appendExecutor(
    data: Uint8Array<ArrayBuffer>,
    type: SourceBufferName,
  ) {
    const track = this.tracks[type];
    const sb = track?.buffer;
    if (!sb) {
      throw new HlsJsTrackRemovedError(
        `Attempting to append to the ${type} SourceBuffer, but it does not exist`,
      );
    }
    track.ending = false;
    track.ended = false;
    sb.appendBuffer(data);
  }

  private blockUntilOpen(callback: () => void) {
    if (this.isUpdating() || this.isQueued()) {
      this.blockBuffers(callback).catch((error) => {
        this.warn(`SourceBuffer blocked callback ${error}`);
        this.stepOperationQueue(this.sourceBufferTypes);
      });
    } else {
      try {
        callback();
      } catch (error) {
        this.warn(
          `Callback run without blocking ${this.operationQueue} ${error}`,
        );
      }
    }
  }

  private isUpdating(): boolean {
    return this.sourceBuffers.some(([type, sb]) => type && sb.updating);
  }

  private isQueued(): boolean {
    return this.sourceBuffers.some(([type]) => type && !!this.currentOp(type));
  }

  private isPending(
    track: SourceBufferTrack | undefined,
  ): track is SourceBufferTrack {
    return !!track && !track.buffer;
  }

  // Enqueues an operation to each SourceBuffer queue which, upon execution, resolves a promise. When all promises
  // resolve, the onUnblocked function is executed. Functions calling this method do not need to unblock the queue
  // upon completion, since we already do it here
  private blockBuffers(
    onUnblocked: () => void,
    bufferNames: SourceBufferName[] = this.sourceBufferTypes,
  ): Promise<void> {
    if (!bufferNames.length) {
      this.log('Blocking operation requested, but no SourceBuffers exist');
      return Promise.resolve().then(onUnblocked);
    }
    const { operationQueue } = this;

    // logger.debug(`[buffer-controller]: Blocking ${buffers} SourceBuffer`);
    const blockingOperations = bufferNames.map((type) =>
      this.appendBlocker(type),
    );
    const audioBlocked = bufferNames.length > 1 && !!this.blockedAudioAppend;
    if (audioBlocked) {
      this.unblockAudio();
    }
    return Promise.all(blockingOperations).then((result) => {
      if (operationQueue !== this.operationQueue) {
        return;
      }
      // logger.debug(`[buffer-controller]: Blocking operation resolved; unblocking ${buffers} SourceBuffer`);
      onUnblocked();
      this.stepOperationQueue(this.sourceBufferTypes);
    });
  }

  private stepOperationQueue(bufferNames: SourceBufferName[]) {
    bufferNames.forEach((type) => {
      const sb = this.tracks[type]?.buffer;
      // Only cycle the queue if the SB is not updating. There's a bug in Chrome which sets the SB updating flag to
      // true when changing the MediaSource duration (https://bugs.chromium.org/p/chromium/issues/detail?id=959359&can=2&q=mediasource%20duration)
      // While this is a workaround, it's probably useful to have around
      if (!sb || sb.updating) {
        return;
      }
      this.shiftAndExecuteNext(type);
    });
  }

  private append(
    operation: BufferOperation,
    type: SourceBufferName,
    pending?: boolean,
  ) {
    if (this.operationQueue) {
      this.operationQueue.append(operation, type, pending);
    }
  }

  private appendBlocker(type: SourceBufferName): Promise<void> | undefined {
    if (this.operationQueue) {
      return this.operationQueue.appendBlocker(type);
    }
  }

  private currentOp(type: SourceBufferName): BufferOperation | null {
    if (this.operationQueue) {
      return this.operationQueue.current(type);
    }
    return null;
  }

  private executeNext(type: SourceBufferName | null) {
    if (type && this.operationQueue) {
      this.operationQueue.executeNext(type);
    }
  }

  private shiftAndExecuteNext(type: SourceBufferName) {
    if (this.operationQueue) {
      this.operationQueue.shiftAndExecuteNext(type);
    }
  }

  private get pendingTrackCount(): number {
    return Object.keys(this.tracks).reduce(
      (acc, type) =>
        acc + (this.isPending(this.tracks[type as SourceBufferName]) ? 1 : 0),
      0,
    );
  }

  private get sourceBufferCount(): number {
    return this.sourceBuffers.reduce((acc, [type]) => acc + (type ? 1 : 0), 0);
  }

  private get sourceBufferTypes(): SourceBufferName[] {
    return this.sourceBuffers
      .map(([type]) => type)
      .filter((type) => !!type) as SourceBufferName[];
  }

  private addBufferListener(
    type: SourceBufferName,
    event: string,
    fn: <K extends keyof SourceBufferEventMap>(
      type: SourceBufferName,
      event: SourceBufferEventMap[K],
    ) => any,
  ) {
    const track = this.tracks[type];
    if (!track) {
      return;
    }
    const buffer = track.buffer;
    if (!buffer) {
      return;
    }
    const listener = fn.bind(this, type);
    track.listeners.push({ event, listener });
    buffer.addEventListener(event, listener);
  }

  private removeBufferListeners(type: SourceBufferName) {
    const track = this.tracks[type];
    if (!track) {
      return;
    }
    const buffer = track.buffer;
    if (!buffer) {
      return;
    }
    track.listeners.forEach((l) => {
      buffer.removeEventListener(l.event, l.listener);
    });
    track.listeners.length = 0;
  }
}

function removeSourceChildren(node: HTMLElement) {
  const sourceChildren = node.querySelectorAll('source');
  [].slice.call(sourceChildren).forEach((source) => {
    node.removeChild(source);
  });
}

function addSource(media: HTMLMediaElement, url: string) {
  const source = self.document.createElement('source');
  source.type = 'video/mp4';
  source.src = url;
  media.appendChild(source);
}

function sourceBufferNameToIndex(type: SourceBufferName) {
  return type === 'audio' ? 1 : 0;
}
