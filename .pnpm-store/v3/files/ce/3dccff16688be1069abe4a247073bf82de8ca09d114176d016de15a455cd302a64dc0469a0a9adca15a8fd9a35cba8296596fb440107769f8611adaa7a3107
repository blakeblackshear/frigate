import BaseStreamController, { State } from './base-stream-controller';
import { findNearestWithCC } from './fragment-finders';
import { FragmentState } from './fragment-tracker';
import ChunkCache from '../demux/chunk-cache';
import TransmuxerInterface from '../demux/transmuxer-interface';
import { ErrorDetails } from '../errors';
import { Events } from '../events';
import { ElementaryStreamTypes, isMediaFragment } from '../loader/fragment';
import { Level } from '../types/level';
import { PlaylistContextType, PlaylistLevelType } from '../types/loader';
import { ChunkMetadata } from '../types/transmuxer';
import {
  alignDiscontinuities,
  alignMediaPlaylistByPDT,
} from '../utils/discontinuities';
import {
  audioMatchPredicate,
  matchesOption,
  useAlternateAudio,
} from '../utils/rendition-helper';
import type { FragmentTracker } from './fragment-tracker';
import type Hls from '../hls';
import type { Fragment, MediaFragment, Part } from '../loader/fragment';
import type KeyLoader from '../loader/key-loader';
import type { LevelDetails } from '../loader/level-details';
import type { NetworkComponentAPI } from '../types/component-api';
import type {
  AudioTracksUpdatedData,
  AudioTrackSwitchingData,
  BufferAppendingData,
  BufferCodecsData,
  BufferCreatedData,
  BufferFlushedData,
  BufferFlushingData,
  ErrorData,
  FragBufferedData,
  FragLoadedData,
  FragLoadingData,
  FragParsingMetadataData,
  FragParsingUserdataData,
  InitPTSFoundData,
  LevelLoadedData,
  MediaDetachingData,
  TrackLoadedData,
} from '../types/events';
import type { MediaPlaylist } from '../types/media-playlist';
import type { TrackSet } from '../types/track';
import type { TransmuxerResult } from '../types/transmuxer';

const TICK_INTERVAL = 100; // how often to tick in ms

type WaitingForPTSData = {
  frag: MediaFragment;
  part: Part | null;
  cache: ChunkCache;
  complete: boolean;
};

class AudioStreamController
  extends BaseStreamController
  implements NetworkComponentAPI
{
  private mainAnchor: MediaFragment | null = null;
  private mainFragLoading: FragLoadingData | null = null;
  private audioOnly: boolean = false;
  private bufferedTrack: MediaPlaylist | null = null;
  private switchingTrack: MediaPlaylist | null = null;
  private trackId: number = -1;
  private waitingData: WaitingForPTSData | null = null;
  private mainDetails: LevelDetails | null = null;
  private flushing: boolean = false;
  private bufferFlushed: boolean = false;
  private cachedTrackLoadedData: TrackLoadedData | null = null;

  constructor(
    hls: Hls,
    fragmentTracker: FragmentTracker,
    keyLoader: KeyLoader,
  ) {
    super(
      hls,
      fragmentTracker,
      keyLoader,
      'audio-stream-controller',
      PlaylistLevelType.AUDIO,
    );
    this.registerListeners();
  }

  protected onHandlerDestroying() {
    this.unregisterListeners();
    super.onHandlerDestroying();
    this.resetItem();
  }

  private resetItem() {
    this.mainDetails =
      this.mainAnchor =
      this.mainFragLoading =
      this.bufferedTrack =
      this.switchingTrack =
      this.waitingData =
      this.cachedTrackLoadedData =
        null;
  }

  protected registerListeners() {
    super.registerListeners();
    const { hls } = this;
    hls.on(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.on(Events.AUDIO_TRACKS_UPDATED, this.onAudioTracksUpdated, this);
    hls.on(Events.AUDIO_TRACK_SWITCHING, this.onAudioTrackSwitching, this);
    hls.on(Events.AUDIO_TRACK_LOADED, this.onAudioTrackLoaded, this);
    hls.on(Events.BUFFER_RESET, this.onBufferReset, this);
    hls.on(Events.BUFFER_CREATED, this.onBufferCreated, this);
    hls.on(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
    hls.on(Events.BUFFER_FLUSHED, this.onBufferFlushed, this);
    hls.on(Events.INIT_PTS_FOUND, this.onInitPtsFound, this);
    hls.on(Events.FRAG_LOADING, this.onFragLoading, this);
    hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
  }

  protected unregisterListeners() {
    const { hls } = this;
    if (!hls) {
      return;
    }
    super.unregisterListeners();
    hls.off(Events.LEVEL_LOADED, this.onLevelLoaded, this);
    hls.off(Events.AUDIO_TRACKS_UPDATED, this.onAudioTracksUpdated, this);
    hls.off(Events.AUDIO_TRACK_SWITCHING, this.onAudioTrackSwitching, this);
    hls.off(Events.AUDIO_TRACK_LOADED, this.onAudioTrackLoaded, this);
    hls.off(Events.BUFFER_RESET, this.onBufferReset, this);
    hls.off(Events.BUFFER_CREATED, this.onBufferCreated, this);
    hls.off(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
    hls.off(Events.BUFFER_FLUSHED, this.onBufferFlushed, this);
    hls.off(Events.INIT_PTS_FOUND, this.onInitPtsFound, this);
    hls.off(Events.FRAG_LOADING, this.onFragLoading, this);
    hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
  }

  // INIT_PTS_FOUND is triggered when the video track parsed in the stream-controller has a new PTS value
  onInitPtsFound(
    event: Events.INIT_PTS_FOUND,
    { frag, id, initPTS, timescale, trackId }: InitPTSFoundData,
  ) {
    // Always update the new INIT PTS
    // Can change due level switch
    if (id === PlaylistLevelType.MAIN) {
      const cc = frag.cc;
      const inFlightFrag = this.fragCurrent;
      this.initPTS[cc] = { baseTime: initPTS, timescale, trackId };
      this.log(
        `InitPTS for cc: ${cc} found from main: ${initPTS / timescale} (${initPTS}/${timescale}) trackId: ${trackId}`,
      );
      this.mainAnchor = frag;
      // If we are waiting, tick immediately to unblock audio fragment transmuxing
      if (this.state === State.WAITING_INIT_PTS) {
        const waitingData = this.waitingData;
        if (
          (!waitingData && !this.loadingParts) ||
          (waitingData && waitingData.frag.cc !== cc)
        ) {
          this.syncWithAnchor(frag, waitingData?.frag);
        }
      } else if (
        !this.hls.hasEnoughToStart &&
        inFlightFrag &&
        inFlightFrag.cc !== cc
      ) {
        inFlightFrag.abortRequests();
        this.syncWithAnchor(frag, inFlightFrag);
      } else if (this.state === State.IDLE) {
        this.tick();
      }
    }
  }

  protected getLoadPosition(): number {
    if (!this.startFragRequested && this.nextLoadPosition >= 0) {
      return this.nextLoadPosition;
    }
    return super.getLoadPosition();
  }

  private syncWithAnchor(
    mainAnchor: MediaFragment,
    waitingToAppend: Fragment | undefined,
  ) {
    // Drop waiting fragment if videoTrackCC has changed since waitingFragment was set and initPTS was not found
    const mainFragLoading = this.mainFragLoading?.frag || null;
    if (waitingToAppend) {
      if (mainFragLoading?.cc === waitingToAppend.cc) {
        // Wait for loading frag to complete and INIT_PTS_FOUND
        return;
      }
    }
    const targetDiscontinuity = (mainFragLoading || mainAnchor).cc;
    const trackDetails = this.getLevelDetails();
    const pos = this.getLoadPosition();
    const syncFrag = findNearestWithCC(trackDetails, targetDiscontinuity, pos);
    // Only stop waiting for audioFrag.cc if an audio segment of the same discontinuity domain (cc) is found
    if (syncFrag) {
      this.log(`Syncing with main frag at ${syncFrag.start} cc ${syncFrag.cc}`);
      this.startFragRequested = false;
      this.nextLoadPosition = syncFrag.start;
      this.resetLoadingState();
      if (this.state === State.IDLE) {
        this.doTickIdle();
      }
    }
  }

  startLoad(startPosition: number, skipSeekToStartPosition?: boolean) {
    if (!this.levels) {
      this.startPosition = startPosition;
      this.state = State.STOPPED;
      return;
    }
    const lastCurrentTime = this.lastCurrentTime;
    this.stopLoad();
    this.setInterval(TICK_INTERVAL);
    if (lastCurrentTime > 0 && startPosition === -1) {
      this.log(
        `Override startPosition with lastCurrentTime @${lastCurrentTime.toFixed(
          3,
        )}`,
      );
      startPosition = lastCurrentTime;
      this.state = State.IDLE;
    } else {
      this.state = State.WAITING_TRACK;
    }
    this.nextLoadPosition = this.lastCurrentTime =
      startPosition + this.timelineOffset;
    this.startPosition = skipSeekToStartPosition ? -1 : startPosition;
    this.tick();
  }

  doTick() {
    switch (this.state) {
      case State.IDLE:
        this.doTickIdle();
        break;
      case State.WAITING_TRACK: {
        const { levels, trackId } = this;
        const currenTrack = levels?.[trackId];
        const details = currenTrack?.details;
        if (details && !this.waitForLive(currenTrack)) {
          if (this.waitForCdnTuneIn(details)) {
            break;
          }
          this.state = State.WAITING_INIT_PTS;
        }
        break;
      }
      case State.FRAG_LOADING_WAITING_RETRY: {
        this.checkRetryDate();
        break;
      }
      case State.WAITING_INIT_PTS: {
        // Ensure we don't get stuck in the WAITING_INIT_PTS state if the waiting frag CC doesn't match any initPTS
        const waitingData = this.waitingData;
        if (waitingData) {
          const { frag, part, cache, complete } = waitingData;
          const mainAnchor = this.mainAnchor;
          if (this.initPTS[frag.cc] !== undefined) {
            this.waitingData = null;
            this.state = State.FRAG_LOADING;
            const payload = cache.flush().buffer;
            const data: FragLoadedData = {
              frag,
              part,
              payload,
              networkDetails: null,
            };
            this._handleFragmentLoadProgress(data);
            if (complete) {
              super._handleFragmentLoadComplete(data);
            }
          } else if (mainAnchor && mainAnchor.cc !== waitingData.frag.cc) {
            this.syncWithAnchor(mainAnchor, waitingData.frag);
          }
        } else {
          this.state = State.IDLE;
        }
      }
    }

    this.onTickEnd();
  }

  protected resetLoadingState() {
    const waitingData = this.waitingData;
    if (waitingData) {
      this.fragmentTracker.removeFragment(waitingData.frag);
      this.waitingData = null;
    }
    super.resetLoadingState();
  }

  protected onTickEnd() {
    const { media } = this;
    if (!media?.readyState) {
      // Exit early if we don't have media or if the media hasn't buffered anything yet (readyState 0)
      return;
    }

    this.lastCurrentTime = media.currentTime;
  }

  private doTickIdle() {
    const { hls, levels, media, trackId } = this;
    const config = hls.config;

    // 1. if buffering is suspended
    // 2. if video not attached AND
    //    start fragment already requested OR start frag prefetch not enabled
    // 3. if tracks or track not loaded and selected
    // then exit loop
    // => if media not attached but start frag prefetch is enabled and start frag not requested yet, we will not exit loop
    if (
      !this.buffering ||
      (!media &&
        !this.primaryPrefetch &&
        (this.startFragRequested || !config.startFragPrefetch)) ||
      !levels?.[trackId]
    ) {
      return;
    }

    const levelInfo = levels[trackId];

    const trackDetails = levelInfo.details;
    if (
      !trackDetails ||
      this.waitForLive(levelInfo) ||
      this.waitForCdnTuneIn(trackDetails)
    ) {
      this.state = State.WAITING_TRACK;
      this.startFragRequested = false;
      return;
    }

    const bufferable = this.mediaBuffer ? this.mediaBuffer : this.media;
    if (this.bufferFlushed && bufferable) {
      this.bufferFlushed = false;
      this.afterBufferFlushed(
        bufferable,
        ElementaryStreamTypes.AUDIO,
        PlaylistLevelType.AUDIO,
      );
    }

    const bufferInfo = this.getFwdBufferInfo(
      bufferable,
      PlaylistLevelType.AUDIO,
    );
    if (bufferInfo === null) {
      return;
    }

    if (!this.switchingTrack && this._streamEnded(bufferInfo, trackDetails)) {
      hls.trigger(Events.BUFFER_EOS, { type: 'audio' });
      this.state = State.ENDED;
      return;
    }

    const bufferLen = bufferInfo.len;
    const maxBufLen = hls.maxBufferLength;

    const fragments = trackDetails.fragments;
    const start = fragments[0].start;
    const loadPosition = this.getLoadPosition();
    const targetBufferTime = this.flushing ? loadPosition : bufferInfo.end;

    if (this.switchingTrack && media) {
      const pos = loadPosition;
      // if currentTime (pos) is less than alt audio playlist start time, it means that alt audio is ahead of currentTime
      if (trackDetails.PTSKnown && pos < start) {
        // if everything is buffered from pos to start or if audio buffer upfront, let's seek to start
        if (bufferInfo.end > start || bufferInfo.nextStart) {
          this.log(
            'Alt audio track ahead of main track, seek to start of alt audio track',
          );
          media.currentTime = start + 0.05;
        }
      }
    }

    // if buffer length is less than maxBufLen, or near the end, find a fragment to load
    if (
      bufferLen >= maxBufLen &&
      !this.switchingTrack &&
      targetBufferTime < fragments[fragments.length - 1].start
    ) {
      return;
    }

    let frag = this.getNextFragment(targetBufferTime, trackDetails);
    // Avoid loop loading by using nextLoadPosition set for backtracking and skipping consecutive GAP tags
    if (frag && this.isLoopLoading(frag, targetBufferTime)) {
      frag = this.getNextFragmentLoopLoading(
        frag,
        trackDetails,
        bufferInfo,
        PlaylistLevelType.MAIN,
        maxBufLen,
      );
    }
    if (!frag) {
      this.bufferFlushed = true;
      return;
    }

    // Request audio segments up to one fragment ahead of main stream-controller
    let mainFragLoading = this.mainFragLoading?.frag || null;
    if (
      !this.audioOnly &&
      this.startFragRequested &&
      mainFragLoading &&
      isMediaFragment(frag) &&
      !frag.endList &&
      (!trackDetails.live ||
        (!this.loadingParts && targetBufferTime < this.hls.liveSyncPosition!))
    ) {
      if (this.fragmentTracker.getState(mainFragLoading) === FragmentState.OK) {
        this.mainFragLoading = mainFragLoading = null;
      }
      if (mainFragLoading && isMediaFragment(mainFragLoading)) {
        if (frag.start > mainFragLoading.end) {
          // Get buffered frag at target position from tracker (loaded out of sequence)
          const mainFragAtPos = this.fragmentTracker.getFragAtPos(
            targetBufferTime,
            PlaylistLevelType.MAIN,
          );
          if (mainFragAtPos && mainFragAtPos.end > mainFragLoading.end) {
            mainFragLoading = mainFragAtPos;
            this.mainFragLoading = {
              frag: mainFragAtPos,
              targetBufferTime: null,
            };
          }
        }
        const atBufferSyncLimit = frag.start > mainFragLoading.end;
        if (atBufferSyncLimit) {
          return;
        }
      }
    }

    this.loadFragment(frag, levelInfo, targetBufferTime);
  }

  protected onMediaDetaching(
    event: Events.MEDIA_DETACHING,
    data: MediaDetachingData,
  ) {
    this.bufferFlushed = this.flushing = false;
    super.onMediaDetaching(event, data);
  }

  private onAudioTracksUpdated(
    event: Events.AUDIO_TRACKS_UPDATED,
    { audioTracks }: AudioTracksUpdatedData,
  ) {
    // Reset tranxmuxer is essential for large context switches (Content Steering)
    this.resetTransmuxer();
    this.levels = audioTracks.map((mediaPlaylist) => new Level(mediaPlaylist));
  }

  private onAudioTrackSwitching(
    event: Events.AUDIO_TRACK_SWITCHING,
    data: AudioTrackSwitchingData,
  ) {
    // if any URL found on new audio track, it is an alternate audio track
    const altAudio = !!data.url;
    this.trackId = data.id;
    const { fragCurrent } = this;

    if (fragCurrent) {
      fragCurrent.abortRequests();
      this.removeUnbufferedFrags(fragCurrent.start);
    }
    this.resetLoadingState();

    // should we switch tracks ?
    if (altAudio) {
      this.switchingTrack = data;
      // main audio track are handled by stream-controller, just do something if switching to alt audio track
      this.flushAudioIfNeeded(data);
      if (this.state !== State.STOPPED) {
        // switching to audio track, start timer if not already started
        this.setInterval(TICK_INTERVAL);
        this.state = State.IDLE;
        this.tick();
      }
    } else {
      // destroy useless transmuxer when switching audio to main
      this.resetTransmuxer();
      this.switchingTrack = null;
      this.bufferedTrack = data;
      this.clearInterval();
    }
  }

  protected onManifestLoading() {
    super.onManifestLoading();
    this.bufferFlushed = this.flushing = this.audioOnly = false;
    this.resetItem();
    this.trackId = -1;
  }

  private onLevelLoaded(event: Events.LEVEL_LOADED, data: LevelLoadedData) {
    this.mainDetails = data.details;
    const cachedTrackLoadedData = this.cachedTrackLoadedData;
    if (cachedTrackLoadedData) {
      this.cachedTrackLoadedData = null;
      this.onAudioTrackLoaded(Events.AUDIO_TRACK_LOADED, cachedTrackLoadedData);
    }
  }

  private onAudioTrackLoaded(
    event: Events.AUDIO_TRACK_LOADED,
    data: TrackLoadedData,
  ) {
    const { levels } = this;
    const { details: newDetails, id: trackId, groupId, track } = data;
    if (!levels) {
      this.warn(
        `Audio tracks reset while loading track ${trackId} "${track.name}" of "${groupId}"`,
      );
      return;
    }
    const mainDetails = this.mainDetails;
    if (
      !mainDetails ||
      newDetails.endCC > mainDetails.endCC ||
      mainDetails.expired
    ) {
      this.cachedTrackLoadedData = data;
      if (this.state !== State.STOPPED) {
        this.state = State.WAITING_TRACK;
      }
      return;
    }
    this.cachedTrackLoadedData = null;
    this.log(
      `Audio track ${trackId} "${track.name}" of "${groupId}" loaded [${newDetails.startSN},${
        newDetails.endSN
      }]${
        newDetails.lastPartSn
          ? `[part-${newDetails.lastPartSn}-${newDetails.lastPartIndex}]`
          : ''
      },duration:${newDetails.totalduration}`,
    );

    const trackLevel = levels[trackId];
    let sliding = 0;
    if (newDetails.live || trackLevel.details?.live) {
      this.checkLiveUpdate(newDetails);
      if (newDetails.deltaUpdateFailed) {
        return;
      }

      if (trackLevel.details) {
        sliding = this.alignPlaylists(
          newDetails,
          trackLevel.details,
          this.levelLastLoaded?.details,
        );
      }
      if (!newDetails.alignedSliding) {
        // Align audio rendition with the "main" playlist on discontinuity change
        // or program-date-time (PDT)
        alignDiscontinuities(newDetails, mainDetails);
        if (!newDetails.alignedSliding) {
          alignMediaPlaylistByPDT(newDetails, mainDetails);
        }
        sliding = newDetails.fragmentStart;
      }
    }
    trackLevel.details = newDetails;
    this.levelLastLoaded = trackLevel;

    // compute start position if we are aligned with the main playlist
    if (!this.startFragRequested) {
      this.setStartPosition(mainDetails, sliding);
    }

    this.hls.trigger(Events.AUDIO_TRACK_UPDATED, {
      details: newDetails,
      id: trackId,
      groupId: data.groupId,
    });

    // only switch back to IDLE state if we were waiting for track to start downloading a new fragment
    if (
      this.state === State.WAITING_TRACK &&
      !this.waitForCdnTuneIn(newDetails)
    ) {
      this.state = State.IDLE;
    }

    // trigger handler right now
    this.tick();
  }

  _handleFragmentLoadProgress(data: FragLoadedData) {
    const frag = data.frag as MediaFragment;
    const { part, payload } = data;
    const { config, trackId, levels } = this;
    if (!levels) {
      this.warn(
        `Audio tracks were reset while fragment load was in progress. Fragment ${frag.sn} of level ${frag.level} will not be buffered`,
      );
      return;
    }

    const track = levels[trackId] as Level;
    if (!track) {
      this.warn('Audio track is undefined on fragment load progress');
      return;
    }
    const details = track.details as LevelDetails;
    if (!details) {
      this.warn('Audio track details undefined on fragment load progress');
      this.removeUnbufferedFrags(frag.start);
      return;
    }
    const audioCodec =
      config.defaultAudioCodec || track.audioCodec || 'mp4a.40.2';

    let transmuxer = this.transmuxer;
    if (!transmuxer) {
      transmuxer = this.transmuxer = new TransmuxerInterface(
        this.hls,
        PlaylistLevelType.AUDIO,
        this._handleTransmuxComplete.bind(this),
        this._handleTransmuxerFlush.bind(this),
      );
    }

    // Check if we have video initPTS
    // If not we need to wait for it
    const initPTS = this.initPTS[frag.cc];
    const initSegmentData = frag.initSegment?.data;
    if (initPTS !== undefined) {
      // this.log(`Transmuxing ${sn} of [${details.startSN} ,${details.endSN}],track ${trackId}`);
      // time Offset is accurate if level PTS is known, or if playlist is not sliding (not live)
      const accurateTimeOffset = false; // details.PTSKnown || !details.live;
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
      transmuxer.push(
        payload,
        initSegmentData,
        audioCodec,
        '',
        frag,
        part,
        details.totalduration,
        accurateTimeOffset,
        chunkMeta,
        initPTS,
      );
    } else {
      this.log(
        `Unknown video PTS for cc ${frag.cc}, waiting for video PTS before demuxing audio frag ${frag.sn} of [${details.startSN} ,${details.endSN}],track ${trackId}`,
      );
      const { cache } = (this.waitingData = this.waitingData || {
        frag,
        part,
        cache: new ChunkCache(),
        complete: false,
      });
      cache.push(new Uint8Array(payload));
      if (this.state !== State.STOPPED) {
        this.state = State.WAITING_INIT_PTS;
      }
    }
  }

  protected _handleFragmentLoadComplete(fragLoadedData: FragLoadedData) {
    if (this.waitingData) {
      this.waitingData.complete = true;
      return;
    }
    super._handleFragmentLoadComplete(fragLoadedData);
  }

  private onBufferReset(/* event: Events.BUFFER_RESET */) {
    // reset reference to sourcebuffers
    this.mediaBuffer = null;
  }

  private onBufferCreated(
    event: Events.BUFFER_CREATED,
    data: BufferCreatedData,
  ) {
    this.bufferFlushed = this.flushing = false;
    const audioTrack = data.tracks.audio;
    if (audioTrack) {
      this.mediaBuffer = audioTrack.buffer || null;
    }
  }

  private onFragLoading(event: Events.FRAG_LOADING, data: FragLoadingData) {
    if (
      !this.audioOnly &&
      data.frag.type === PlaylistLevelType.MAIN &&
      isMediaFragment(data.frag)
    ) {
      this.mainFragLoading = data;
      if (this.state === State.IDLE) {
        this.tick();
      }
    }
  }

  private onFragBuffered(event: Events.FRAG_BUFFERED, data: FragBufferedData) {
    const { frag, part } = data;
    if (frag.type !== PlaylistLevelType.AUDIO) {
      if (
        !this.audioOnly &&
        frag.type === PlaylistLevelType.MAIN &&
        !frag.elementaryStreams.video &&
        !frag.elementaryStreams.audiovideo
      ) {
        this.audioOnly = true;
        this.mainFragLoading = null;
      }
      return;
    }
    if (this.fragContextChanged(frag)) {
      // If a level switch was requested while a fragment was buffering, it will emit the FRAG_BUFFERED event upon completion
      // Avoid setting state back to IDLE or concluding the audio switch; otherwise, the switched-to track will not buffer
      this.warn(
        `Fragment ${frag.sn}${part ? ' p: ' + part.index : ''} of level ${
          frag.level
        } finished buffering, but was aborted. state: ${
          this.state
        }, audioSwitch: ${
          this.switchingTrack ? this.switchingTrack.name : 'false'
        }`,
      );
      return;
    }
    if (isMediaFragment(frag)) {
      this.fragPrevious = frag;
      const track = this.switchingTrack;
      if (track) {
        this.bufferedTrack = track;
        this.switchingTrack = null;
        this.hls.trigger(Events.AUDIO_TRACK_SWITCHED, { ...track });
      }
    }
    this.fragBufferedComplete(frag, part);
    if (this.media) {
      this.tick();
    }
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
        this.onFragmentOrKeyLoadError(PlaylistLevelType.AUDIO, data);
        break;
      case ErrorDetails.AUDIO_TRACK_LOAD_ERROR:
      case ErrorDetails.AUDIO_TRACK_LOAD_TIMEOUT:
      case ErrorDetails.LEVEL_PARSING_ERROR:
        // in case of non fatal error while loading track, if not retrying to load track, switch back to IDLE
        if (
          !data.levelRetry &&
          this.state === State.WAITING_TRACK &&
          data.context?.type === PlaylistContextType.AUDIO_TRACK
        ) {
          this.state = State.IDLE;
        }
        break;
      case ErrorDetails.BUFFER_ADD_CODEC_ERROR:
      case ErrorDetails.BUFFER_APPEND_ERROR:
        if (data.parent !== 'audio') {
          return;
        }
        if (!this.reduceLengthAndFlushBuffer(data)) {
          this.resetLoadingState();
        }
        break;
      case ErrorDetails.BUFFER_FULL_ERROR:
        if (data.parent !== 'audio') {
          return;
        }
        if (this.reduceLengthAndFlushBuffer(data)) {
          this.bufferedTrack = null;
          super.flushMainBuffer(0, Number.POSITIVE_INFINITY, 'audio');
        }
        break;
      case ErrorDetails.INTERNAL_EXCEPTION:
        this.recoverWorkerError(data);
        break;
      default:
        break;
    }
  }

  private onBufferFlushing(
    event: Events.BUFFER_FLUSHING,
    { type }: BufferFlushingData,
  ) {
    if (type !== ElementaryStreamTypes.VIDEO) {
      this.flushing = true;
    }
  }

  private onBufferFlushed(
    event: Events.BUFFER_FLUSHED,
    { type }: BufferFlushedData,
  ) {
    if (type !== ElementaryStreamTypes.VIDEO) {
      this.flushing = false;
      this.bufferFlushed = true;
      if (this.state === State.ENDED) {
        this.state = State.IDLE;
      }
      const mediaBuffer = this.mediaBuffer || this.media;
      if (mediaBuffer) {
        this.afterBufferFlushed(mediaBuffer, type, PlaylistLevelType.AUDIO);
        this.tick();
      }
    }
  }

  private _handleTransmuxComplete(transmuxResult: TransmuxerResult) {
    const id = 'audio';
    const { hls } = this;
    const { remuxResult, chunkMeta } = transmuxResult;

    const context = this.getCurrentContext(chunkMeta);
    if (!context) {
      this.resetWhenMissingContext(chunkMeta);
      return;
    }
    const { frag, part, level } = context;
    const { details } = level;
    const { audio, text, id3, initSegment } = remuxResult;

    // Check if the current fragment has been aborted. We check this by first seeing if we're still playing the current level.
    // If we are, subsequently check if the currently loading fragment (fragCurrent) has changed.
    if (this.fragContextChanged(frag) || !details) {
      this.fragmentTracker.removeFragment(frag);
      return;
    }

    this.state = State.PARSING;
    if (this.switchingTrack && audio) {
      this.completeAudioSwitch(this.switchingTrack);
    }

    if (initSegment?.tracks) {
      const mapFragment = frag.initSegment || frag;
      if (this.unhandledEncryptionError(initSegment, frag)) {
        return;
      }
      this._bufferInitSegment(
        level,
        initSegment.tracks,
        mapFragment,
        chunkMeta,
      );
      hls.trigger(Events.FRAG_PARSING_INIT_SEGMENT, {
        frag: mapFragment,
        id,
        tracks: initSegment.tracks,
      });
      // Only flush audio from old audio tracks when PTS is known on new audio track
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

    if (id3?.samples?.length) {
      const emittedID3: FragParsingMetadataData = Object.assign(
        {
          id,
          frag,
          details,
        },
        id3,
      );
      hls.trigger(Events.FRAG_PARSING_METADATA, emittedID3);
    }
    if (text) {
      const emittedText: FragParsingUserdataData = Object.assign(
        {
          id,
          frag,
          details,
        },
        text,
      );
      hls.trigger(Events.FRAG_PARSING_USERDATA, emittedText);
    }
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
    // delete any video track found on audio transmuxer
    if (tracks.video) {
      delete tracks.video;
    }
    if (tracks.audiovideo) {
      delete tracks.audiovideo;
    }

    // include levelCodec in audio and video tracks
    if (!tracks.audio) {
      return;
    }
    const track = tracks.audio;

    track.id = PlaylistLevelType.AUDIO;

    const variantAudioCodecs = currentLevel.audioCodec;
    this.log(
      `Init audio buffer, container:${track.container}, codecs[level/parsed]=[${variantAudioCodecs}/${track.codec}]`,
    );
    // SourceBuffer will use track.levelCodec if defined
    if (variantAudioCodecs && variantAudioCodecs.split(',').length === 1) {
      track.levelCodec = variantAudioCodecs;
    }
    this.hls.trigger(Events.BUFFER_CODECS, tracks as BufferCodecsData);
    const initSegment = track.initSegment;
    if (initSegment?.byteLength) {
      const segment: BufferAppendingData = {
        type: 'audio',
        frag,
        part: null,
        chunkMeta,
        parent: frag.type,
        data: initSegment,
      };
      this.hls.trigger(Events.BUFFER_APPENDING, segment);
    }
    // trigger handler right now
    this.tickImmediate();
  }

  protected loadFragment(
    frag: Fragment,
    track: Level,
    targetBufferTime: number,
  ) {
    // only load if fragment is not loaded or if in audio switch
    const fragState = this.fragmentTracker.getState(frag);

    // we force a frag loading in audio switch as fragment tracker might not have evicted previous frags in case of quick audio switch
    if (
      this.switchingTrack ||
      fragState === FragmentState.NOT_LOADED ||
      fragState === FragmentState.PARTIAL
    ) {
      if (!isMediaFragment(frag)) {
        this._loadInitSegment(frag, track);
      } else if (track.details?.live && !this.initPTS[frag.cc]) {
        this.log(
          `Waiting for video PTS in continuity counter ${frag.cc} of live stream before loading audio fragment ${frag.sn} of level ${this.trackId}`,
        );
        this.state = State.WAITING_INIT_PTS;
        const mainDetails = this.mainDetails;
        if (
          mainDetails &&
          mainDetails.fragmentStart !== track.details.fragmentStart
        ) {
          alignMediaPlaylistByPDT(track.details, mainDetails);
        }
      } else {
        super.loadFragment(frag, track, targetBufferTime);
      }
    } else {
      this.clearTrackerIfNeeded(frag);
    }
  }

  private flushAudioIfNeeded(switchingTrack: MediaPlaylist) {
    if (this.media && this.bufferedTrack) {
      const { name, lang, assocLang, characteristics, audioCodec, channels } =
        this.bufferedTrack;
      if (
        !matchesOption(
          { name, lang, assocLang, characteristics, audioCodec, channels },
          switchingTrack,
          audioMatchPredicate,
        )
      ) {
        if (useAlternateAudio(switchingTrack.url, this.hls)) {
          this.log('Switching audio track : flushing all audio');
          super.flushMainBuffer(0, Number.POSITIVE_INFINITY, 'audio');
          this.bufferedTrack = null;
        } else {
          // Main is being buffered. Set bufferedTrack so that it is flushed when switching back to alt-audio
          this.bufferedTrack = switchingTrack;
        }
      }
    }
  }

  private completeAudioSwitch(switchingTrack: MediaPlaylist) {
    const { hls } = this;
    this.flushAudioIfNeeded(switchingTrack);
    this.bufferedTrack = switchingTrack;
    this.switchingTrack = null;
    hls.trigger(Events.AUDIO_TRACK_SWITCHED, { ...switchingTrack });
  }
}
export default AudioStreamController;
